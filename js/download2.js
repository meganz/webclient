
var dlMethod;
var dl_maxSlots = readLocalStorage('dl_maxSlots', 'int', { min: 1, max: 6, def: 5 });

/* jshint -W003 */
var dlmanager = {
    // Keep in track real active downloads.
    // ETA (in seconds) to consider a download finished, used to speed up chunks.
    // Despite the fact that the DownloadQueue has a limitted size,
    // to speed up things for tiny downloads each download is able to
    // report to the scheduler that they are done when it may not be necessarily
    // true (but they are for instance close to their finish)
    dlDoneThreshold: 3,
    // How many queue IO we want before pausing the XHR fetching,
    // useful when we have internet faster than our IO
    ioThrottleLimit: 15,
    ioThrottlePaused: false,
    fetchingFile: false,
    dlLastQuotaWarning: 0,
    dlRetryInterval: 1000,
    dlMaxChunkSize: 16 * 1048576,
    isDownloading: false,
    logger: MegaLogger.getLogger('dlmanager'),

    newUrl: function DM_newUrl(dl, callback) {
        if (callback) {
            if (!this.nup) {
                this.nup = {};
            }

            if (this.nup[dl.dl_id]) {
                this.nup[dl.dl_id].push(callback);
                return;
            }
            this.nup[dl.dl_id] = [callback];
        }
        if (d) {
            dlmanager.logger.info("Retrieving New URLs for", dl.dl_id);
        }

        dlQueue.pause();
        dlmanager.dlGetUrl(dl, function(error, res, o) {
            if (error) {
                return Later(this.newUrl.bind(this, dl));
            }

            var changed = 0;
            for (var i = 0; i < dlQueue._queue.length; i++) {
                if (dlQueue._queue[i][0].dl === dl) {
                    dlQueue._queue[i][0].url = res.g + "/" +
                        dlQueue._queue[i][0].url.replace(/.+\//, '');
                    changed++;
                }
            }
            if (this.nup && this.nup[dl.dl_id]) {
                this.nup[dl.dl_id].forEach(function(callback) {
                    callback(res.g, res);
                });
                delete this.nup[dl.dl_id];
            }
            dlmanager.logger.info("got", changed, "new URL for", dl.dl_id, "resume everything");
            dlQueue.resume();
        }.bind(this));
    },

    cleanupUI: function DM_cleanupUI(gid) {
        if (typeof gid === 'object') {
            gid = this.getGID(gid);
        }

        var l = dl_queue.length;
        while (l--) {
            var dl = dl_queue[l];

            if (gid === this.getGID(dl)) {
                if (d) {
                    dlmanager.logger.info('cleanupUI', gid, dl.n, dl.zipname);
                }

                if (dl.io instanceof MemoryIO) {
                    dl.io.abort();
                }
                // oDestroy(dl.io);
                dl_queue[l] = Object.freeze({});
            }
        }
    },

    getGID: function DM_GetGID(dl) {
        return dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id;
    },

    abort: function DM_abort(gid, keepUI) {
        /* jshint -W074 */
        if (gid === null || Array.isArray(gid)) {
            this._multiAbort = 1;

            if (gid) {
                gid.forEach(function(dl) {
                    dlmanager.abort(dl, keepUI);
                });
            }
            else {
                dl_queue.filter(isQueueActive)
                    .forEach(function(dl) {
                        dlmanager.abort(dl, keepUI);
                    });
            }

            delete this._multiAbort;
            Soon(mega.utils.resetUploadDownload);
        }
        else {
            if (typeof gid === 'object') {
                gid = this.getGID(gid);
            }
            else if (gid[0] === 'u') {
                return;
            }

            var l = dl_queue.length;
            while (l--) {
                var dl = dl_queue[l];

                if (gid === this.getGID(dl)) {
                    if (!dl.cancelled) {
                        try {
                            /* jshint -W073 */
                            if (typeof dl.io.abort === "function") {
                                if (d) {
                                    dlmanager.logger.info('IO.abort', gid, dl);
                                }
                                dl.io.abort("User cancelled");
                            }
                        }
                        catch (e) {
                            dlmanager.logger.error(e);
                        }
                    }
                    dl.cancelled = true;
                    if (dl.zipid && Zips[dl.zipid]) {
                        Zips[dl.zipid].cancelled = true;
                    }
                    if (dl.io && typeof dl.io.begin === 'function') {
                        /* Canceled while Initializing? Let's free up stuff
                         * and notify the scheduler for the running task
                         */
                        dl.io.begin();
                    }
                }
            }
            if (!keepUI) {
                this.cleanupUI(gid);
            }

            /* We rely on `dl.cancelled` to let chunks destroy himself.
             * However, if the dl is paused we might end up with the
             + ClassFile.destroy uncalled, which will be leaking.
             */
            var foreach;
            if (dlQueue._qpaused[gid]) {
                foreach = function(task) {
                    task = task[0];
                    return task instanceof ClassChunk && task.isCancelled() || task.destroy();
                };
            }
            dlQueue.filter(gid, foreach);

            /* Active chunks might are stuck waiting reply,
             * which won't get destroyed itself right away.
             */
            if (GlobalProgress[gid]) {
                var chunk;
                var w = GlobalProgress[gid].working;
                while ((chunk = w.pop())) {
                    chunk.isCancelled();
                }
            }

            if (!this._multiAbort) {
                Soon(mega.utils.resetUploadDownload);
            }
        }
    },

    dlGetUrl: function DM_dlGetUrl(object, callback) {
        var req = {
            a: 'g',
            g: 1,
            ssl: use_ssl
        };

        if (object.ph) {
            req.p = object.ph;
        }
        else if (object.id) {
            req.n = object.id;
        }

        api_req(req, {
            object: object,
            next: callback,
            dl_key: object.key,
            callback: this.dlGetUrlDone.bind(this)
        }, n_h ? 1 : 0);
    },

    dlGetUrlDone: function DM_dlGetUrlDone(res, ctx) {
        /* jshint -W074 */
        if (typeof res === 'number') {
            dlmanager.dlReportStatus(ctx.object, res);
        }
        else if (typeof res === 'object') {
            if (res.d) {
                dlmanager.dlReportStatus(ctx.object, res.d ? 2 : 1);
            }
            else if (res.g) {
                var ab = base64_to_ab(res.at);
                var attr = dec_attr(ab, [ctx.dl_key[0] ^ ctx.dl_key[4], ctx.dl_key[1] ^ ctx.dl_key[5], ctx.dl_key[2]
                            ^ ctx.dl_key[6], ctx.dl_key[3] ^ ctx.dl_key[7]]);

                if (typeof attr === 'object' && typeof attr.n === 'string') {
                    if (have_ab
                            && res.s <= 48 * 1048576
                            && is_image(attr.n)
                            && (!res.fa
                                || res.fa.indexOf(':0*') < 0
                                || res.fa.indexOf(':1*') < 0 || ctx.object.preview === -1)) {
                        ctx.object.data = new ArrayBuffer(res.s);
                    }
                    return ctx.next(false, res, attr, ctx.object);
                }
                dlmanager.dlReportStatus(ctx.object, EAGAIN);
            }
            else {
                dlmanager.dlReportStatus(ctx.object, res.e);
            }
        }
        else {
            dlmanager.dlReportStatus(ctx.object, EAGAIN);
        }

        dlmanager.dlRetryInterval *= 1.2;
        ctx.next(new Error("failed"));
    },

    dlQueuePushBack: function DM_dlQueuePushBack(aTask) {
        ASSERT(aTask && aTask.onQueueDone, 'Invalid aTask.');
        dlQueue.pushFirst(aTask);
        if (dlmanager.ioThrottlePaused) {
            dlQueue.resume();
        }
    },

    dlReportStatus: function DM_reportstatus(dl, code) {
        if (dl) {
            dl.lasterror = code;
            dl.onDownloadError(dl, code);
        }

        if (code === EKEY) {
            // TODO: Check if other codes should raise abort()
            Later(function() {
                dlmanager.abort(dl, true);
            });
        }
    },

    dlClearActiveTransfer: function DM_dlClearActiveTransfer(dl_id) {
        var data = JSON.parse(localStorage.aTransfers || '{}');
        if (data[dl_id]) {
            delete data[dl_id];
            if (!$.len(data)) {
                delete localStorage.aTransfers;
            }
            else {
                localStorage.aTransfers = JSON.stringify(data);
            }
        }
    },

    dlSetActiveTransfer: function DM_dlSetActiveTransfer(dl_id) {
        var data = JSON.parse(localStorage.aTransfers || '{}');
        data[dl_id] = Date.now();
        localStorage.aTransfers = JSON.stringify(data);
    },

    isTrasferActive: function DM_isTrasferActive(dl_id) {
        var date = null;

        if (localStorage.aTransfers) {
            var data = JSON.parse(localStorage.aTransfers);

            date = data[dl_id];
        }

        return date;
    },

    failureFunction: function DM_failureFunction(task, args) {
        var code = args[1] || 0;
        var dl = task.task.download;

        if (d) {
            dlmanager.logger.error('Fai1ure',
                dl.zipname || dl.n, code, task.task.chunk_id, task.task.offset, task.onQueueDone.name);
        }

        if (code === 509) {
            var t = NOW();
            if (t - dlmanager.dlLastQuotaWarning > 60000) {
                dlmanager.dlLastQuotaWarning = t;
                dlmanager.dlReportStatus(dl, code === 509 ? EOVERQUOTA : ETOOMANYCONNECTIONS); // XXX
                dl.quota_t = setTimeout(function() {
                    dlmanager.dlQueuePushBack(task);
                }, 60000);
                return 1;
            }
        }

        /* update UI */
        dlmanager.dlReportStatus(dl, EAGAIN);

        if (code === 403 || code === 404) {
            dlmanager.newUrl(dl, function(rg) {
                if (!task.url) {
                    return;
                }
                task.url = rg + "/" + task.url.replace(/.+\//, '');
                dlmanager.dlQueuePushBack(task);
            });
        }
        else {
            /* check for network error  */
            dl.dl_failed = true;
            api_reportfailure(hostname(dl.url), ulmanager.networkErrorCheck);
            dlmanager.dlQueuePushBack(task);
        }

        return 2;
    },

    idToFile: function DM_IdToFile(id) {
        var dl = {};
        for (var i in dl_queue) {
            if (id === dl_queue[i].id) {
                dl = dl_queue[i];
                ASSERT(dl.pos === i, 'dl.pos !== i');
                break;
            }
        }
        // $.each(dl_queue, function(i, _dl) {
        // if (id === _dl.id) {
        // dl = _dl
        // dl.pos = i
        // return false;
        // }
        // });
        return dl;
    },

    throttleByIO: function DM_throttleByIO(writer) {
        writer.on('queue', function() {
            if (writer._queue.length >= dlmanager.ioThrottleLimit && !dlQueue.isPaused()) {
                writer.logger.info("IO_THROTTLE: pause XHR");
                dlQueue.pause();
                dlmanager.ioThrottlePaused = true;
            }
        });

        writer.on('working', function() {
            if (writer._queue.length < dlmanager.ioThrottleLimit && dlmanager.ioThrottlePaused) {
                writer.logger.info("IO_THROTTLE: resume XHR");
                dlQueue.resume();
                dlmanager.ioThrottlePaused = false;
            }
        });
    },

    checkLostChunks: function DM_checkLostChunks(file) {
        var dl_key = file.key;

        // var t = []
        // $.each(file.macs, function(i, mac) {
        // t.push(i);
        // });
        // t.sort(function(a, b) {
        // return parseInt(a) - parseInt(b);
        // });
        // $.each(t, function(i, v) {
        // t[i] = file.macs[v];
        // });

        var t = Object.keys(file.macs).map(Number)
            .sort(function(a, b) {
                return a - b;
            })
            .map(function(v) {
                return file.macs[v];
            });

        var mac = condenseMacs(t, [dl_key[0] ^ dl_key[4], dl_key[1]
            ^ dl_key[5], dl_key[2] ^ dl_key[6], dl_key[3] ^ dl_key[7]]);

        if (have_ab && (dl_key[6] !== (mac[0] ^ mac[1]) || dl_key[7] !== (mac[2] ^ mac[3]))) {
            return false;
        }

        if (file.data) {
            var options = {
                onPreviewRetry: file.preview === -1
            };
            if (!file.zipid) {
                options.raw = is_rawimage(file.n) || mThumbHandler.has(file.n);
            }
            createnodethumbnail(
                file.id,
                new sjcl.cipher.aes([dl_key[0] ^ dl_key[4], dl_key[1]
                    ^ dl_key[5], dl_key[2] ^ dl_key[6], dl_key[3] ^ dl_key[7]]),
                ++ulmanager.ulFaId,
                file.data,
                options
            );
            file.data = null;
        }

        return true;
    },

    dlWriter: function DM_dl_writer(dl, is_ready) {

        function finish_write(task, done) {
            done();

            if (typeof task.callback === "function") {
                task.callback();
            }
            if (dl.ready) {
                // tell the download scheduler we're done.
                dl.ready();
            }
            delete task.data;
        }

        dl.writer = new MegaQueue(function dlIOWriterStub(task, done) {
            if (!task.data.byteLength || dl.cancelled) {
                if (d) {
                    dl.writer.logger.error(dl.cancelled ? "download cancelled" : "writing empty chunk");
                }
                return finish_write(task, done);
            }

            // As of Firefox 37, this method will neuter the array buffer.
            var abLen = task.data.byteLength;
            var abDup = dl.data && (is_chrome_firefox & 4) && new Uint8Array(task.data);

            dl.io.write(task.data, task.offset, function() {
                dl.writer.pos += abLen;
                if (dl.data) {
                    new Uint8Array(
                        dl.data,
                        task.offset,
                        abLen
                    ).set(abDup || task.data);
                }

                return finish_write(task, done);
            });
        }, 1, 'download-writer');

        dlmanager.throttleByIO(dl.writer);

        dl.writer.pos = 0;

        dl.writer.validateTask = function(t) {
            var r = (!is_ready || is_ready()) && t.offset === dl.writer.pos;
            // if (d) this.logger.info('validateTask', r, t.offset, dl.writer.pos, t, dl, dl.writer);
            return r;
        };
    },

    mGetXR: function DM_getxr() {
        /* jshint -W074 */
        return {
            update: function(b) {
                var t;
                var ts = Date.now();
                if (b < 0) {
                    this.tb = {};
                    this.st = 0;
                    return 0;
                }
                if (b) {
                    this.tb[ts] = this.tb[ts] ? this.tb[ts] + b : b;
                }
                b = 0;
                for (t in this.tb) {
                    if (this.tb.hasOwnProperty(t)) {
                        t = parseInt(t);
                        if (t < ts - this.window) {
                            delete this.tb[t];
                        }
                        else {
                            b += this.tb[t];
                        }
                    }
                }
                if (!b) {
                    this.st = 0;
                    return 0;
                }
                else if (!this.st) {
                    this.st = ts;
                }

                if (!(ts -= this.st)) {
                    return 0;
                }

                if (ts > this.window) {
                    ts = this.window;
                }

                return b / ts;
            },

            tb: {},
            st: 0,
            window: 60000
        };
    }

    apiQuota: function DM_apiQuota(callback2) {
        // cache 'bq' for up to 60 seconds for each limitation
        if (typeof $.bq !== 'undefined' && $.lastlimit > new Date().getTime() - 60000) {
            callback2($.bq);
        }
        else {
            api_req({
                a: 'bq'
            }, {
                callback: function(res) {
                    $.bq = res;
                    callback2(res);
                }
            });
        }
    },
    /**
     * Shows the bandwidth dialog
     * @param {Boolean} close If true, closes the dialog, otherwise opens it
     */
    bandwidthDialog: function DM_bandwidthDialog(close) {

        var $bandwidthDialog = $('.fm-dialog.bandwidth-dialog');
        var $backgroundOverlay = $('.fm-dialog-overlay');

        // Close dialog
        if (close) {
            $backgroundOverlay.addClass('hidden');
            $bandwidthDialog.addClass('hidden');
        }
        else {
            // Don't show if not in filemanager or download page
            if (!is_fm() && page !== 'download') {
                return false;
            }

            // Send a log to the API the first time the over bandwidth quota dialog is triggered
            if (!localStorage.seenBandwidthDialog) {
                api_req({
                    a: 'log',
                    e: 99333,
                    m: 'bandwidthdialog'
                });
                localStorage.setItem('seenBandwidthDialog', true);
            }

            // On close button click, close the dialog
            $bandwidthDialog.find('.fm-dialog-close').rebind('click', function() {
                $backgroundOverlay.addClass('hidden');
                $bandwidthDialog.addClass('hidden');
            });

            // On Select button click
            $bandwidthDialog.find('.membership-button').rebind('click', function() {

                // Get the plan number and redirect to pro step 2
                var planId = $(this).closest('.reg-st3-membership-bl').attr('data-payment');
                document.location.hash = 'pro&planNum=' + planId;
            });

            // Show the dialog
            $backgroundOverlay.removeClass('hidden');
            $bandwidthDialog.removeClass('hidden');
        }
    },

    checkQuota: function DM_checkQuota(filesize, callback) {
        if (u_attr && u_attr.p) {
            if (callback) {
                callback({
                    sec: -1
                });
            }
            return false;
        }
        dlmanager.apiQuota(function(quotabytes) {
            if (localStorage.bq) {
                quotabytes = localStorage.bq;
            }
            var consumed = 0;
            var quota = {};
            if (localStorage.q) {
                quota = JSON.parse(localStorage.q);
            }
            var t = Math.floor(new Date().getTime() / 60000);
            var t2 = t - 360;
            var sec = 0;
            var available = 0;
            var newbw = 0;
            while (t2 <= t) {
                if (quota[t2]) {
                    consumed += quota[t2];
                }
                t2++;
            }
            if (quotabytes == 0) {
                sec = 0;
            }
            else if (quotabytes - filesize < 0) {
                sec = -1;
            }
            else if (quotabytes - consumed - filesize < 0) {
                var shortage = quotabytes - consumed - filesize;
                var t2 = t - 360;
                while (t2 <= t) {
                    if (quota[t2]) {
                        shortage += quota[t2];
                    }
                    if (shortage > 0) {
                        newbw = shortage - quotabytes - consumed - filesize;
                        sec = (t2 + 360 - t) * 60;
                        break;
                    }
                    t2++;
                }
                if (sec == 0 || sec > 21600) {
                    sec = 21600;
                    newbw = quotabytes;
                }
            }
            else {
                sec = 0;
            }
            if (callback) {
                callback({
                    used: consumed,
                    sec: sec,
                    filesize: filesize,
                    newbw: newbw
                });
            }

        });
    },

    hasQuota: function DM_hasQuota(filesize, next) {
        dlmanager.checkQuota(filesize, function(r) {
            if (r.sec == 0 || r.sec == -1) {
                dlmanager.bandwidthDialog(1);
                next(true);
            }
            else {
                sessionStorage.proref = 'bwlimit';

                if (!$.lastlimit) {
                    $.lastlimit = 0;
                }

                // Translate bottom right text block of bandwidth dialog
                var $bottomRightText = $('.bandwidth-dialog .bandwidth-text-bl.second');
                var text = $bottomRightText.html().replace('[A]',
                    '<span class="red">').replace('[/A]', '</span>');
                text = text.replace('%1',
                    '<strong class="bandwidth-used">' + bytesToSize(r.used) + '</strong>');
                $bottomRightText.html(text);

                var minutes = Math.ceil(r.sec / 60);
                var minutesText = l[5838];
                if (minutes != 1) {
                    minutesText = l[5837].replace('[X]', minutes);
                }

                // Translate header text of bandwidth dialog
                var $header = $('.bandwidth-dialog .bandwidth-header');
                var headerText = $header.html().replace('%1',
                    '<span class="bandwidth-minutes">' + minutesText + '</span>');
                $header.html(headerText);

                dlmanager.bandwidthDialog();

                if ($.lastlimit < new Date().getTime() - 60000) {
                    megaAnalytics.log("dl",
                        "limit", {
                            used: r.used,
                            filesize: r.filesize,
                            seconds: r.sec
                        });
                }

                $.lastlimit = new Date().getTime();
                next(false);
            }
        });
    },

    reportQuota: function DM_reportQuota(chunksize) {
        if (u_attr && u_attr.p) {
            return false;
        }
        var quota = {};
        var t = Math.floor(new Date().getTime() / 60000);
        if (localStorage.q) {
            quota = JSON.parse(localStorage.q);
        }
        for (var i in quota) {
            if (i < t - 360) {
                delete quota[i];
            }
        }
        if (!quota[t]) {
            quota[t] = 0;
        }
        quota[t] += chunksize;
        localStorage.q = JSON.stringify(quota);
    }
};

// TODO: move the next functions to fm.js when no possible conflicts
function fm_tfsorderupd() {
    M.t = {};
    $('.transfer-table tr[id]').each(function(pos, node) {
        if (d) {
            ASSERT(-1 !== ['ul', 'dl', 'zip'].indexOf(String(node.id).split('_').shift()),
                'Huh, unexpected node id: ' + node.id);
        }

        M.t[pos] = node.id;
        M.t[node.id] = pos;
    });
    if (d) {
        dlmanager.logger.info('M.t', M.t);
    }
}

function fm_tfspause(gid) {
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Ivalid GID to pause')) {
        if (gid[0] === 'u') {
            ulQueue.pause(gid);
        }
        else {
            dlQueue.pause(gid);
        }
    }
}

function fm_tfsresume(gid) {
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Invalid GID to resume')) {
        if (gid[0] === 'u') {
            ulQueue.resume(gid);
        }
        else {
            dlQueue.resume(gid);
        }
    }
}

function fm_tfsmove(gid, dir) { // -1:up, 1:down
    /* jshint -W074 */
    var tfs = $('#' + gid);
    var to;
    var act;
    var p1;
    var p2;
    var i;
    var x;
    var mng;
    gid = String(gid);
    mng = gid[0] === 'u' ? ulmanager : dlmanager;
    if (tfs.length !== 1) {
        mng.logger.warn('Invalid transfer node', gid, tfs);
        return;
    }

    if (!GlobalProgress[gid] || GlobalProgress[gid].working.length) {
        mng.logger.warn('Invalid transfer state', gid);
        return;
    }

    if (dir !== -1) {
        to = tfs.next();
        act = 'after';
    }
    else {
        to = tfs.prev();
        act = 'before';
    }

    var id = to && to.attr('id') || 'x';

    if (!GlobalProgress[id] || GlobalProgress[id].working.length) {
        if (id !== 'x') {
            mng.logger.warn('Invalid [to] transfer state', gid, id, to);
        }
        return;
    }

    if (id[0] === gid[0] || "zdz".indexOf(id[0] + gid[0]) !== -1) {
        to[act](tfs);
    }
    else {
        if (d) {
            dlmanager.logger.error('Unable to move ' + gid);
        }
        return;
    }

    fm_tfsorderupd();

    var m_prop;
    var m_queue;
    var mQueue = [];
    if (gid[0] === 'z' || id[0] === 'z') {
        var p = 0;
        var trick = Object.keys(M.t).map(Number).filter(function(n) {
                        return !isNaN(n) && M.t[n][0] !== 'u';
                    });
        for (i in trick) {
            if (trick.hasOwnProperty(i)) {
                ASSERT(i === trick[i] && M.t[i], 'Oops..');
                var mQ = dlQueue.slurp(M.t[i]);
                for (x in mQ) {
                    if (mQ.hasOwnProperty(x)) {
                        (dl_queue[p] = mQ[x][0].dl).pos = p;
                        ++p;
                    }
                }
                mQueue = mQueue.concat(mQ);
            }
        }
        // we should probably fix our Array inheritance
        for (var j = p, len = dl_queue.length; j < len; ++j) {
            delete dl_queue[j];
        }
        dl_queue.length = p;
        dlQueue._queue = mQueue;
        return;
    }

    if (gid[0] === 'u') {
        m_prop = 'ul';
        mQueue = ulQueue._queue;
        m_queue = ul_queue;
    }
    else {
        m_prop = 'dl';
        mQueue = dlQueue._queue;
        m_queue = dl_queue;
    }
    var t_queue = m_queue.filter(isQueueActive);
    if (t_queue.length !== m_queue.length) {
        var m = t_queue.length;
        i = 0;
        while (i < m) {
            (m_queue[i] = t_queue[i]).pos = i;
            ++i;
        }
        m_queue.length = i;
        while (m_queue[i]) {
            delete m_queue[i++];
        }
    }
    for (i in mQueue) {
        if (mQueue[i][0][gid]) {
            var tmp = mQueue[i];
            var m_q = tmp[0][m_prop];
            p1 = Number(i) + dir;
            p2 = m_q.pos;
            tmp[0][m_prop].pos = mQueue[p1][0][m_prop].pos;
            mQueue[p1][0][m_prop].pos = p2;
            mQueue[i] = mQueue[p1];
            mQueue[p1] = tmp;
            p1 = m_queue.indexOf(m_q);
            tmp = m_queue[p1];
            m_queue[p1] = m_queue[p1 + dir];
            m_queue[p1 + dir] = tmp;
            ASSERT(m_queue[p1].pos === mQueue[i][0][m_prop].pos, 'Huh, move sync error..');
            break;
        }
    }
}


var dlQueue = new TransferQueue(function _downloader(task, done) {
    if (!task.dl) {
        dlQueue.logger.info('Skipping frozen task ' + task);
        return done();
    }
    return task.run(done);
}, dl_maxSlots, 'downloader');

// chunk scheduler {{{
dlQueue.validateTask = function(pzTask) {
    var r = pzTask instanceof ClassChunk || pzTask instanceof ClassEmptyChunk;

    if (!r && pzTask instanceof ClassFile && !dlmanager.fetchingFile) {
        var j = this._queue.length;
        while (j--) {
            if (this._queue[j][0] instanceof ClassChunk) {
                break;
            }
        }

        if ((r = (j === -1)) && $.len(this._qpaused)) {
            fm_tfsorderupd();

            // About to start a new download, check if a previously paused dl was resumed.
            var p1 = M.t[pzTask.gid];
            for (var i = 0; i < p1; ++i) {
                var gid = M.t[i];
                if (this._qpaused[gid] && this.dispatch(gid)) {
                    return -0xBEEF;
                }
            }
        }
    }
    return r;
};
// }}}

/**
 *  DownloadQueue
 *
 *  Array extension to override push, so we can easily
 *  kick up the download (or queue it) without modifying the
 *  caller codes
 */
function DownloadQueue() {}
inherits(DownloadQueue, Array);

DownloadQueue.prototype.getUrls = function(dl_chunks, dl_chunksizes, url) {
    var dl_urls = [];
    $.each(dl_chunks, function(key, pos) {
        dl_urls.push({
            url: url + '/' + pos + '-' + (pos + dl_chunksizes[pos] - 1),
            size: dl_chunksizes[pos],
            offset: pos
        });
    });

    return dl_urls;
}

DownloadQueue.prototype.splitFile = function(dl_filesize) {
    var dl_chunks = [];
    var dl_chunksizes = {};

    var p = 0;
    var pp = 0;
    for (var i = 1; i <= 8 && p < dl_filesize - i * 131072; i++) {
        dl_chunksizes[p] = i * 131072;
        dl_chunks.push(p);
        pp = p;
        p += dl_chunksizes[p];
    }

    var chunksize = dl_filesize / dlQueue._limit / 2;
    if (chunksize > dlmanager.dlMaxChunkSize) {
        chunksize = dlmanager.dlMaxChunkSize;
    }
    else if (chunksize <= 1048576) {
        chunksize = 1048576;
    }
    else {
        chunksize = 1048576 * Math.floor(chunksize / 1048576);
    }

    var reserved = dl_filesize - (chunksize * (dlQueue._limit - 1));
    // var reserved = dl_filesize - chunksize;
    // var eofcs = Math.max(Math.floor(chunksize/3),1048576);
    while (p < dl_filesize) {
        dl_chunksizes[p] = p > reserved ? 1048576 : chunksize;
        // dl_chunksizes[p] = p > reserved ? eofcs : chunksize;
        dl_chunks.push(p);
        pp = p;
        p += dl_chunksizes[p];
    }

    if (!(dl_chunksizes[pp] = dl_filesize - pp)) {
        delete dl_chunksizes[pp];
        delete dl_chunks[dl_chunks.length - 1];
    }

    dl_chunks = {
            chunks: dl_chunks,
            offsets: dl_chunksizes
        };
    if (d) {
        dlmanager.logger.info('dl_chunks', chunksize, dl_chunks);
    }
    return dl_chunks;
}

DownloadQueue.prototype.push = function() {
    var pos = Array.prototype.push.apply(this, arguments);
    var id = pos - 1;
    var dl = this[id];
    var dl_id = dl.ph || dl.id;
    var dl_key = dl.key;
    var dlIO;
    var dl_keyNonce = JSON.stringify([dl_key[0] ^ dl_key[4], dl_key[1]
            ^ dl_key[5], dl_key[2] ^ dl_key[6], dl_key[3] ^ dl_key[7], dl_key[4], dl_key[5]]);

    if (dl.zipid) {
        if (!Zips[dl.zipid]) {
            Zips[dl.zipid] = new ZipWriter(dl.zipid, dl);
        }
        dlIO = Zips[dl.zipid].addEntryFile(dl);
    }
    else {
        if (dl.preview || (window.Incognito === 0xC120E && dl.size < 400 * 1024 * 1024)) {
            dlIO = new MemoryIO(dl_id, dl);
        }
        else {
            dlIO = new dlMethod(dl_id, dl);
        }
    }

    if (!use_workers) {
        dl.aes = new sjcl.cipher.aes([dl_key[0] ^ dl_key[4], dl_key[1]
            ^ dl_key[5], dl_key[2] ^ dl_key[6], dl_key[3] ^ dl_key[7]]);
    }

    /* In case it failed and it was manually cancelled and retried */
    // dlmanager.release("id:" + dl_id);

    dl.pos = id; // download position in the queue
    dl.dl_id = dl_id; // download id
    dl.io = dlIO;
    dl.nonce = dl_keyNonce;
    // Use IO object to keep in track of progress
    // and speed
    dl.io.progress = 0;
    dl.io.size = dl.size;
    dl.decrypter = 0;

    if (!dl.zipid) {
        dlmanager.dlWriter(dl);
    }
    else {
        dl.writer = dlIO;
    }

    dl.macs = {};
    dl.urls = [];

    dlQueue.push(new ClassFile(dl));

    return pos;
};

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

if (localStorage.dlMethod) {
    dlMethod = window[localStorage.dlMethod];
}
else if (is_chrome_firefox & 4) {
    dlMethod = FirefoxIO;
}
else if (window.requestFileSystem) {
    dlMethod = FileSystemAPI;
}
else if (MemoryIO.usable()) {
    dlMethod = MemoryIO;
}
else {
    dlMethod = FlashIO;
}

if (typeof dlMethod.init === 'function') {
    dlMethod.init();
}

var dl_queue = new DownloadQueue();
