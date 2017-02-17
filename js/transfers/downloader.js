/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2016 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

// Keep a record of active transfers.
var GlobalProgress = {};
var __ccXID = 0;

if (localStorage.aTransfers) {
    Soon(function() {
        var data = {};
        var now = NOW();
        try {
            data = JSON.parse(localStorage.aTransfers);
        }
        catch (e) {}
        for (var r in data) {
            // Let's assume there was a system/browser crash...
            if ((now - data[r]) > 86400000) {
                delete data[r];
            }
        }
        if (!$.len(data)) {
            delete localStorage.aTransfers;
        }
        else {
            localStorage.aTransfers = JSON.stringify(data);
        }
    });
}

function ClassChunk(task) {
    this.task = task;
    this.dl = task.download;
    this.url = task.url;
    this.size = task.size;
    this.io = task.download.io;
    this.done = false;
    this.avg = [0, 0];
    this.gid = task.file.gid;
    this.xid = this.gid + "_" + (++__ccXID);
    this.failed = false;
    this.altport = false;
    // this.backoff  = 1936+Math.floor(Math.random()*2e3);
    this.lastPing = NOW();
    this.lastUpdate = NOW();
    this.Progress = GlobalProgress[this.gid];
    this.Progress.dl_xr = this.Progress.dl_xr || dlmanager.mGetXR(); // global download progress
    this.Progress.speed = this.Progress.speed || 1;
    this.Progress.size = this.Progress.size || (this.dl.zipid ? Zips[this.dl.zipid].size : this.io.size);
    this.Progress.dl_lastprogress = this.Progress.dl_lastprogress || 0;
    this.Progress.dl_prevprogress = this.Progress.dl_prevprogress || 0;
    this.Progress.data[this.xid] = [0, task.size];
    this[this.gid] = !0;
}

ClassChunk.prototype.toString = function() {
    return "[ClassChunk " + this.xid + "]";
};

ClassChunk.prototype.abort = function() {
    if (this.oet) {
        clearTimeout(this.oet);
    }
    if (this.xhr) {
        this.xhr.abort(this.xhr.ABORT_CLEANUP);
    }
    if (this.Progress) {
        removeValue(this.Progress.working, this, 1);
    }
    delete this.xhr;
};

// destroy
ClassChunk.prototype.destroy = function() {
    if (d) {
        dlmanager.logger.info('Destroying ' + this);
    }
    this.abort();
    oDestroy(this);
};

// shouldIReportDone
ClassChunk.prototype.shouldIReportDone = function(report_done) {
    var pbx = this.Progress.data[this.xid];
    if (!pbx) {
        return;
    }

    if (!report_done) {
        report_done = !this.done && dlQueue.canExpand()
            && (pbx[1] - pbx[0]) / this.Progress.speed <= dlmanager.dlDoneThreshold;
    }

    if (report_done) {
        if (d) {
            dlmanager.logger.info(this + ' reporting done() earlier to start another download.');
        }
        this.done = true;
        dlQueue.expand();
    }

    return report_done;
};

// updateProgress
ClassChunk.prototype.updateProgress = function(force) {
    if (uldl_hold) {
        // do not update the UI
        return false;
    }

    // var r = this.shouldIReportDone(force === 2);
    var r = force !== 2 ? this.shouldIReportDone() : 0x7f;
    if (this.Progress.dl_lastprogress + 200 > NOW() && !force) {
        // too soon
        return false;
    }

    var _data = this.Progress.data;
    var _progress = this.Progress.done;
    for (var i in _data) {
        if (_data.hasOwnProperty(i)) {
            _progress += _data[i][0];
        }
    }

    this.dl.onDownloadProgress(
            this.dl.dl_id,
            Math.min(99, Math.floor(_progress / this.Progress.size * 100)),
            _progress, // global progress
            this.Progress.size, // total download size
            this.Progress.speed = this.Progress.dl_xr.update(_progress - this.Progress.dl_prevprogress), // speed
            this.dl.pos, // this download position
            force && force !== 2
        );

    this.Progress.dl_prevprogress = _progress;
    this.Progress.dl_lastprogress = NOW();

    return r;
};

// isCancelled
ClassChunk.prototype.isCancelled = function() {
    if (!this.dl) {
        return true;
    }
    var is_cancelled = this.dl.cancelled;
    if (!is_cancelled) {
        if (typeof (this.dl.pos) !== 'number') {
            this.dl.pos = dlmanager.getDownloadByHandle(this.dl.id).pos;
        }
        is_cancelled = !dl_queue[this.dl.pos] || !dl_queue[this.dl.pos].n;
    }
    if (is_cancelled) {
        if (d) {
            dlmanager.logger.info(this + " aborting itself because download was canceled.", this.task.chunk_id);
        }
        this.dl.cancelled = true;
        this.finish_download();
        this.task.file.destroy();
        this.destroy();
    }
    return is_cancelled;
};

// finish_download
ClassChunk.prototype.finish_download = function() {
    if (d) {
        ASSERT(this.xhr || !this.dl || this.dl.cancelled, "Don't call me twice!");
    }
    if (this.xhr) {
        this.abort();
        this.task_done.apply(this, arguments);
    }
};

ClassChunk.prototype.onXHRprogress = function(xhrEvent) {
    if (!this.Progress.data[this.xid] || this.isCancelled()) {
        return;
    }
    // if (args[0].loaded) this.Progress.data[this.xid][0] = args[0].loaded;
    // this.updateProgress(!!args[0].zSaaDc ? 0x9a : 0);
    this.Progress.data[this.xid][0] = xhrEvent.loaded;
    this.updateProgress();
};

ClassChunk.prototype.onXHRerror = function(args, xhr) {
    if (d) {
        dlmanager.logger.error('ClassChunk.onXHRerror', this.task && this.task.chunk_id, args, xhr, this);
    }
    if (this.isCancelled()) {
        ASSERT(0, 'This chunk should have been destroyed before reaching XHR.onerror..');
        return;
    }

    this.Progress.data[this.xid][0] = 0; /* reset progress */
    this.updateProgress(2);

    var chunk = this;
    var status = xhr.readyState > 1 && xhr.status;

    this.oet = setTimeout(function() {
        chunk.finish_download(false, {responseStatus: status});
        chunk = undefined;
    }, status === 509 || (3950 + Math.floor(Math.random() * 2e3)));
};

ClassChunk.prototype.onXHRready = function(xhrEvent) {
    var r;
    if (this.isCancelled()) {
        return;
    }
    var xhr = xhrEvent.target;
    try {
        r = xhr.response || {};
    }
    catch (e) {}
    if (r && r.byteLength === this.size) {
        this.Progress.done += r.byteLength;
        delete this.Progress.data[this.xid];
        this.updateProgress(true);
        if (navigator.appName !== 'Opera') {
            this.io.dl_bytesreceived += r.byteLength;
        }
        this.dl.decrypter++;
        Decrypter.push([
            [this.dl, this.task.offset],
            this.dl.nonce,
            this.task.offset / 16,
            new Uint8Array(r)
        ]);
        this.dl.retries = 0;
        this.finish_download();
        this.destroy();
    }
    else if (!this.dl.cancelled) {
        if (d) {
            dlmanager.logger.error("HTTP FAILED",
                this.dl.n, xhr.status, "am i done? " + this.done, r && r.bytesLength, this.size);
        }
        if (dlMethod === MemoryIO) {
            try {
                r = new Uint8Array(0x1000000);
            }
            catch (e) {
                // We're running out of memory..
                dlmanager.logger.error('Uh, oh...', e);
                dlFatalError(this.dl, e);
            }
        }
        return Object(this.xhr).ABORT_EINTERNAL;
    }
};

ClassChunk.prototype.run = function(task_done) {
    if (this.isCancelled()) {
        return;
    }

    if (this.size < 100 * 1024 && dlQueue.expand()) {
        /**
         *  It is an small chunk and we *should* finish soon if everything goes
         *  fine. We release our slot so another chunk can start now. It is useful
         *  to speed up tiny downloads on a ZIP file
         */
        this.done = true;
    }

    this.task_done = task_done;
    if (!this.io.dl_bytesreceived) {
        this.io.dl_bytesreceived = 0;
    }

    this.Progress.working.push(this);

    // HACK: In case of 509s, construct the url from the dl object which must be up-to-date
    this.url = this.dl.url +  "/" + this.url.replace(/.+\//, '');

    /* let the fun begin! */
    this.url = dlmanager.uChangePort(this.url, this.altport ? 8080 : 0);
    if (d) {
        dlmanager.logger.info(this + " Fetching ", this.url);
    }
    this.xhr = getTransferXHR(this);
    this.xhr._murl = this.url;

    this.xhr.open('POST', this.url, true);
    this.xhr.responseType = have_ab ? 'arraybuffer' : 'text';
    this.xhr.send();

    if (Object(this.xhr.constructor).name === 'HSBHttpRequest') {
        skipcheck = true;
    }
};

// ClassFile
function ClassEmptyChunk(dl) {
    this.task = {
        zipid: dl.zipid,
        id: dl.id
    };
    this.dl = dl;
}

ClassEmptyChunk.prototype.run = function(task_done) {
    if (this.dl.zipid) {
        this.dl.writer.push({
            data: new Uint8Array(0),
            offset: 0
        });
        Soon(task_done);
    }
    else {
        this.dl.io.write(new Uint8Array(0), 0, function() {
            task_done();
            this.dl.ready();
            oDestroy(this);
        }.bind(this));
    }
}

function ClassFile(dl) {
    this.task = dl;
    this.dl = dl;
    this.gid = dlmanager.getGID(dl);
    if (!dl.zipid || !GlobalProgress[this.gid]) {
        GlobalProgress[this.gid] = {
            data: {},
            done: 0,
            working: []
        };
        dlmanager.dlSetActiveTransfer(dl.zipid || dl.dl_id);
    }
    this[this.gid] = !0;
    this.dl.owner = this;
}

ClassFile.prototype.toString = function() {
    if (d && d > 1) {
        return "[ClassFile " + this.gid + "/" + (this.dl ? (this.dl.zipname || this.dl.n) : '') + "]";
    }
    return "[ClassFile " + this.gid + "]";
};

ClassFile.prototype.abortTimers = function() {
    if (this.dl) {
        if (this.dl.retry_t) {
            clearTimeout(this.dl.retry_t);
            delete this.dl.retry_t;
        }
    }
};

ClassFile.prototype.destroy = function() {
    if (d) {
        dlmanager.logger.info('Destroying ' + this,
            this.dl ? (this.dl.cancelled ? 'cancelled' : 'finished') : 'expunged');
    }
    if (!this.dl) {
        return;
    }

    this.abortTimers();

    if (this.dl.cancelled) {
        if (this.dl.zipid && Zips[this.dl.zipid]) {
            Zips[this.dl.zipid].destroy(0xbadf);
        }
    }
    else {
        if (!this.emptyFile && !dlmanager.checkLostChunks(this.dl)
                && (typeof skipcheck === 'undefined' || !skipcheck)) {
            dlmanager.dlReportStatus(this.dl, EKEY);

            if (this.dl.zipid) {
                Zips[this.dl.zipid].destroy(EKEY);
            }
        }
        else if (this.dl.zipid) {
            Zips[this.dl.zipid].done(this);
        }
        else {
            this.dl.onDownloadProgress(
                this.dl.dl_id, 100,
                this.dl.size,
                this.dl.size, 0,
                this.dl.pos
            );

            this.dl.onBeforeDownloadComplete(this.dl.pos);
            if (!this.dl.preview) {
                this.dl.io.download(this.dl.zipname || this.dl.n, this.dl.p || '');
            }
            this.dl.onDownloadComplete(this.dl);
            if (dlMethod !== FlashIO) {
                dlmanager.cleanupUI(this.dl, true);
            }
        }
    }

    if (!this.dl.zipid) {
        delete GlobalProgress[this.gid];
    }
    dlmanager.dlClearActiveTransfer(this.dl.zipid || this.dl.dl_id);

    this.dl.ready = function onDeadEnd() {
        if (d) {
            dlmanager.logger.warn('We reached a dead end..');
        }
    };

    this.dl.writer.destroy();
    oDestroy(this);
}

ClassFile.prototype.run = function(task_done) {
    var cancelled = oIsFrozen(this) || !this.dl || this.dl.cancelled;

    if (cancelled || !this.gid || !GlobalProgress[this.gid]) {
        if (dlmanager.fetchingFile) {
            dlmanager.fetchingFile = 0;
        }
        if (!cancelled) {
            dlmanager.logger.warn('Invalid %s state.', this, this);
        }
        return task_done();
    }

    dlmanager.fetchingFile = 1; /* Block the fetchingFile state */
    this.dl.retries = 0; /* set the retries flag */

    // dlmanager.logger.info("dl_key " + this.dl.key);
    if (!GlobalProgress[this.gid].started) {
        GlobalProgress[this.gid].started = true;
        this.dl.onDownloadStart(this.dl);
    }

    this.dl.ready = function() {
        if (d) {
            this.dl.writer.logger.info(this + ' readyState',
                this.chunkFinished, this.dl.writer.isEmpty(), this.dl.decrypter);
        }
        if (this.chunkFinished && this.dl.decrypter === 0 && this.dl.writer.isEmpty()) {
            this.destroy();
        }
    }.bind(this);

    this.dl.io.begin = function(newName) {
        /* jshint -W074 */
        var tasks = [];

        if (!this.dl || this.dl.cancelled) {
            if (d) {
                dlmanager.logger.info(this + ' cancelled while initializing.');
            }
        }
        else {
            if (d) {
                dlmanager.logger.info(this + ' Adding %d tasks...', (this.dl.urls || []).length);
            }

            if (newName) {
                if (this.dl.zipid) {
                    this.dl.zipname = newName;
                }
                else {
                    this.dl.n = newName;
                }

                $('#' + dlmanager.getGID(this.dl) + ' .tranfer-filetype-txt').text(newName);
            }

            if (this.dl.urls) {
                for (var key in this.dl.urls) {
                    if (this.dl.urls.hasOwnProperty(key)) {
                        var url = this.dl.urls[key];

                        tasks.push(new ClassChunk({
                            url: url.url,
                            size: url.size,
                            offset: url.offset,
                            download: this.dl,
                            chunk_id: key,
                            zipid: this.dl.zipid,
                            id: this.dl.id,
                            file: this
                        }));
                    }
                }
            }

            if ((this.emptyFile = (tasks.length === 0)) && this.dl.zipid) {
                tasks.push(new ClassEmptyChunk(this.dl));
            }

            if (tasks.length > 0) {
                dlQueue.pushAll(tasks,
                    function onChunkFinished() {
                        this.chunkFinished = true;
                    }.bind(this), dlmanager.failureFunction.bind(dlmanager));
            }
        }

        if (task_done) {
            dlmanager.fetchingFile = 0;
            task_done();

            if (this.dl) {
                delete this.dl.urls;
                delete this.dl.io.begin;
            }
            task_done = null;
        }

        if (tasks.length === 0) {
            // force file download
            this.destroy();
        }
    }.bind(this);

    dlmanager.dlGetUrl(this.dl, function(error, res, o) {
        var cancelOnInit = function(force) {
            if (!this.dl || this.dl.cancelled || force) {
                if (d) {
                    dlmanager.logger.error('Knock, knock..', this.dl);
                }
                if (this.dl) {
                    /* Remove leaked items from dlQueue & dl_queue */
                    dlmanager.abort(this.dl);
                    this.destroy(); // XXX: should be expunged already
                }
                return true;
            }
            return false;
        }.bind(this);

        if (cancelOnInit()) {
            error = true;
        }
        else if (error) {
            var fatal = (error === EBLOCKED);

            this.dlGetUrlErrors = (this.dlGetUrlErrors | 0) + 1;

            if (this.dl.zipid && (fatal || this.dlGetUrlErrors > 20)) {
                // Prevent stuck ZIP downloads if there are repetitive errors for some of the files
                // TODO: show notification to the user about empty files in the zip?
                console.error('Too many errors for "' + this.dl.n + '", saving as 0-bytes...');
                try {
                    this.dl.size = 0;
                    return this.dl.io.setCredentials("", 0, this.dl.n);
                }
                catch (e) {
                    setTransferStatus(this.dl, e, true);
                }
            }
            else if (fatal) {
                cancelOnInit(true);
            }
            else {
                var onGetUrlError = function onGetUrlError() {
                    if (!cancelOnInit()) {
                        dlmanager.logger.info(this + ' Retrying dlGetUrl for ' + this.dl.n);
                        dlmanager.dlQueuePushBack(this);
                    }
                }.bind(this);

                if (error === EOVERQUOTA) {
                    dlmanager.logger.warn(this + ' Got EOVERQUOTA, holding...');
                    dlmanager.showOverQuotaDialog(onGetUrlError);
                    this.dlGetUrlErrors = 0;
                }
                else {
                    dlmanager.dlRetryInterval *= 1.2;
                    if (dlmanager.dlRetryInterval > 600000) {
                        dlmanager.dlRetryInterval = 600000;
                    }
                    this.dl.retry_t = setTimeout(onGetUrlError, dlmanager.dlRetryInterval);
                    dlmanager.logger.warn(this + ' Retry to fetch url in %dms, error:%s',
                                            dlmanager.dlRetryInterval, error);
                }
            }
        }
        else {
            var info = dl_queue.splitFile(res.s);
            this.dl.url = res.g;
            this.dl.urls = dl_queue.getUrls(info.chunks, info.offsets, res.g);
            try {
                return this.dl.io.setCredentials(res.g, res.s, o.n, info.chunks, info.offsets);
            }
            catch (e) {
                setTransferStatus(this.dl, e, true);
            }
        }
        if (error && task_done) {
            dlmanager.fetchingFile = 0;
            Soon(task_done); /* release worker */
            task_done = null;
        }
    }.bind(this));
};

mBroadcaster.once('startMega', function _setupDecrypter() {
    var decrypter = CreateWorkers('decrypter.js', function(context, e, done) {
        var dl = context[0];
        var offset = context[1];

        if (typeof (e.data) === "string") {
            if (e.data[0] === '[') {
                var pos = offset;
                var t = JSON.parse(e.data);
                for (var i = 0; i < t.length; i += 4) {
                    dl.macs[pos] = [t[i], t[i + 1], t[i + 2], t[i + 3]];
                    pos += 1048576;
                }
            }
            if (d) {
                decrypter.logger.info("worker replied string", e.data, dl.macs);
            }
        }
        else {
            var plain = new Uint8Array(e.data.buffer || e.data);
            if (d) {
                decrypter.logger.info("Decrypt done", dl.cancelled);
            }
            dl.decrypter--;
            if (!dl.cancelled) {
                if (oIsFrozen(dl.writer)) {
                    if (d) {
                        decrypter.logger.warn('Writer is frozen.', dl);
                    }
                }
                else {
                    dl.writer.push({
                        data: plain,
                        offset: offset
                    });
                }
            }
            plain = null;
            done();
        }
    }, 4);

    dlmanager.logger.options.levelColors = {
        'ERROR': '#fe1111',
        'DEBUG': '#0000ff',
        'WARN':  '#C25700',
        'INFO':  '#189530',
        'LOG':   '#000044'
    };
    Object.defineProperty(window, 'Decrypter', { value: decrypter });
});
