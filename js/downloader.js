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
        this.xhr.xhr_cleanup(0x9ffe);
    }
    if (this.Progress) {
        removeValue(this.Progress.working, this, 1);
    }
    delete this.xhr;
};

// destroy {{{
ClassChunk.prototype.destroy = function() {
    if (d) {
        dlmanager.logger.info('Destroying ' + this);
    }
    this.abort();
    oDestroy(this);
};
// }}}

// shouldIReportDone {{{
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
// }}}

// updateProgress {{{
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
// }}}

// isCancelled {{{
ClassChunk.prototype.isCancelled = function() {
    if (!this.dl) {
        return true;
    }
    var is_cancelled = this.dl.cancelled;
    if (!is_cancelled) {
        if (typeof (this.dl.pos) !== 'number') {
            this.dl.pos = dlmanager.idToFile(this.dl.id).pos;
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
// }}}

// finish_download {{{
ClassChunk.prototype.finish_download = function() {
    if (d) {
        ASSERT(this.xhr || !this.dl || this.dl.cancelled, "Don't call me twice!");
    }
    if (this.xhr) {
        this.abort();
        this.task_done.apply(this, arguments);
    }
};
// }}}

// XHR::on_progress {{{
ClassChunk.prototype.on_progress = function(args) {
    if (!this.Progress.data[this.xid] || this.isCancelled()) {
        return;
    }
    // if (args[0].loaded) this.Progress.data[this.xid][0] = args[0].loaded;
    // this.updateProgress(!!args[0].zSaaDc ? 0x9a : 0);
    this.Progress.data[this.xid][0] = args[0].loaded;
    this.updateProgress();
};
// }}}

// XHR::on_error {{{
ClassChunk.prototype.on_error = function(args, xhr) {
    if (d) {
        dlmanager.logger.error('ClassChunk.on_error', this.task && this.task.chunk_id, args, xhr, this);
    }
    if (this.isCancelled()) {
        ASSERT(0, 'This chunk should have been destroyed before reaching XHR.onerror..');
        return;
    }

    this.Progress.data[this.xid][0] = 0; /* reset progress */
    this.updateProgress(2);

    this.oet = setTimeout(this.finish_download.bind(this,
        false, xhr.readyState > 1 && xhr.status), 3950 + Math.floor(Math.random() * 2e3));
};
// }}}

// XHR::on_ready {{{
ClassChunk.prototype.on_ready = function(args, xhr) {
    var r;
    if (this.isCancelled()) {
        return;
    }
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
        dlmanager.reportQuota(this.size);
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
        return 0xDEAD;
    }
};
// }}}

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

    /* let the fun begin! */
    if (d) {
        dlmanager.logger.info(this + " Fetching " + this.url);
    }
    this.xhr = getXhr(this);
    this.xhr._murl = this.url;

    this.xhr.open('POST', this.url, true);
    this.xhr.responseType = have_ab ? 'arraybuffer' : 'text';
    this.xhr.send();
};
// }}}

// ClassFile {{{
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
}

ClassFile.prototype.toString = function() {
    if (d && d > 1) {
        return "[ClassFile " + this.gid + "/" + (this.dl ? (this.dl.zipname || this.dl.n) : '') + "]";
    }
    return "[ClassFile " + this.gid + "]";
};

ClassFile.prototype.destroy = function() {
    if (d) {
        dlmanager.logger.info('Destroying ' + this,
            this.dl ? (this.dl.cancelled ? 'cancelled' : 'finished') : 'expunged');
    }
    if (!this.dl) {
        return;
    }

    if (this.dl.quota_t) {
        clearTimeout(this.dl.quota_t);
        delete this.dl.quota_t;
    }
    if (this.dl.retry_t) {
        clearTimeout(this.dl.retry_t);
        delete this.dl.retry_t;
    }

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

ClassFile.prototype.checkQuota = function(task_done) {
    if (this.hasQuota) {
        return true;
    }

    var that = this;

    dlmanager.hasQuota(this.dl.size, function(hasQuota) {
        that.hasQuota = hasQuota;
        if (hasQuota) {
            return that.run(task_done);
        }
        setTimeout(function() {
            return that.run(task_done);
        }, 1000);
    });

    return false;
};

ClassFile.prototype.run = function(task_done) {

    ASSERT(this.gid
        && GlobalProgress[this.gid],
        'Invalid ClassFile state (' + Boolean(this.gid) + ', ' + (this.dl && this.dl.cancelled) + ')');

    if (!this.gid || !GlobalProgress[this.gid]) {
        return task_done(); // Hmm..
    }

    dlmanager.fetchingFile = 1; /* Block the fetchingFile state */
    this.dl.retries = 0; /* set the retries flag */

    if (!this.checkQuota(task_done)) {
        return;
    }

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

    this.dl.io.begin = function() {
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
        if (!this.dl || this.dl.cancelled) {
            if (d) {
                dlmanager.logger.error('Knock, knock..', this.dl);
            }
            if (this.dl) {
                /* Remove leaked items from dlQueue & dl_queue */
                dlmanager.abort(this.dl);
                this.destroy(); // XXX: should be expunged already
            }
            error = true;
        }
        else if (error) {
            /* failed */
            this.dl.retry_t = setTimeout(function onGetUrlError() { /* retry !*/
                dlmanager.logger.error('retrying ', this.dl.n);
                dlQueue.pushFirst(this);
                if (dlmanager.ioThrottlePaused) {
                    dlQueue.resume();
                }
            }.bind(this), dlmanager.dlRetryInterval);
            dlmanager.logger.info('retry to fetch url in ', dlmanager.dlRetryInterval, ' ms');
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
// }}}

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
            decrypter.logger.info("worker replied string", e.data, dl.macs);
        }
        else {
            var plain = new Uint8Array(e.data.buffer || e.data);
            decrypter.logger.info("Decrypt done", dl.cancelled);
            dl.decrypter--;
            if (!dl.cancelled) {
                dl.writer.push({
                    data: plain,
                    offset: offset
                });
            }
            plain = null;
            done();
        }
    }, 4);

    Object.defineProperty(window, 'Decrypter', { value: decrypter });
});
