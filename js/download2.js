var dlMethod;

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
    ioThrottleLimit: 6,
    ioThrottlePaused: false,
    fetchingFile: false,
    dlLastQuotaWarning: 0,
    dlRetryInterval: 1000,
    dlMaxChunkSize: 16 * 1048576,
    isDownloading: false,
    dlZipID: 0,
    gotHSTS: false,
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

    uChangePort: function DM_uChangePort(url, port) {
        if (!this.gotHSTS && String(url).substr(0,5) === 'http:') {
            var uri = document.createElement('a');
            uri.href = url;

            if (port) {
                url = url.replace(uri.host, uri.hostname + ':' + port);
            }
            else if (uri.host !== uri.hostname) {
                url = url.replace(uri.host, uri.hostname);
            }
        }

        return url;
    },

    checkHSTS: function(xhr) {
        if (!use_ssl && !this.gotHSTS) {
            try {
                if (String(xhr.responseURL).substr(0, 6) === 'https:') {
                    this.gotHSTS = true;
                }
            }
            catch (ex) {
                if (d) {
                    this.logger.error(ex);
                }
            }
        }
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
        return dl.zipid ? 'zip_' + dl.zipid : 'dl_' + (dl.dl_id || dl.ph);
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

            var found = 0;
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
                    found++;
                }
            }

            if (!found) {
                this.logger.warn('Download %s was not found in dl_queue', gid);
            }
            else if (found > 1 && gid[0] !== 'z') {
                this.logger.error('Too many matches looking for %s in dl_queue (!?)', gid);
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
                    var result = chunk.isCancelled();
                    if (!result) {
                        this.logger.error('Download chunk %s(%s) should have been cancelled itself.', gid, chunk);
                        if (d) debugger;
                    }
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
        }, object.nauth ? 1 : 0);
    },

    dlGetUrlDone: function DM_dlGetUrlDone(res, ctx) {
        /* jshint -W074 */
        if (typeof res === 'number') {
            dlmanager.dlReportStatus(ctx.object, res);
        }
        else if (typeof res === 'object') {
            if (res.d) {
                dlmanager.dlReportStatus(ctx.object, res.d ? 2 : 1);
            } else if (res.e == EOVERQUOTA) {
                return this.showOverQuotaDialog(function() {
                    dlmanager.dlRetryInterval *= 1.2;
                    ctx.next(new Error("failed"));
                });
            } else if (res.g) {
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

        dlmanager.isOverQuota = false;
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
        var code = args[1].responseStatus || 0;
        var dl = task.task.download;

        if (d) {
            dlmanager.logger.error('Fai1ure',
                dl.zipname || dl.n, code, task.task.chunk_id, task.task.offset, task.onQueueDone.name);
        }

        if (code === 509) {
            this.showOverQuotaDialog(task);
            dlmanager.dlReportStatus(dl, EOVERQUOTA); // XXX
            return 1;
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
            task.altport = !task.altport;
            api_reportfailure(hostname(dl.url), ulmanager.networkErrorCheck);
            dlmanager.dlQueuePushBack(task);
        }

        return 2;
    },

    getDownloadByHandle: function DM_IdToFile(handle) {
        var dl = null;
        if (handle) {
            for (var i in dl_queue) {
                if (dl_queue.hasOwnProperty(i)) {
                    var dlh = dl_queue[i].ph || dl_queue[i].id;
                    if (dlh === handle) {
                        dl = dl_queue[i];
                        break;
                    }
                }
            }
        }
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

            var ready = function _onWriterReady() {
                dl.writer.pos += abLen;
                if (dl.data) {
                    new Uint8Array(
                        dl.data,
                        task.offset,
                        abLen
                    ).set(abDup || task.data);
                }

                return finish_write(task, done);
            };

            try {
                dl.io.write(task.data, task.offset, ready);
            }
            catch (ex) {
                var logger = dl.writer && dl.writer.logger || dlmanager.logger;
                logger.error(ex);
                dlFatalError(dl, ex);
            }

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
    },

    _quotaPushBack: {},
    _dlQuotaListener: [],

    _onQuotaRetry: function DM_onQuotaRetry() {
        delay.cancel('overquota:retry');

        var ids = dlmanager.getCurrentDownloads();
        $('.fm-dialog.bandwidth-dialog .fm-dialog-close').trigger('click');
        $('.download.info-block, #' + ids.join(',#')).removeClass('overquota');

        for (var i = 0; i < this._dlQuotaListener.length; ++i) {
            if (typeof this._dlQuotaListener[i] === "function") {
                this._dlQuotaListener[i]();
            }
        }
        this._dlQuotaListener = [];

        for (var gid in this._quotaPushBack) {
            if (this._quotaPushBack.hasOwnProperty(gid) && this._quotaPushBack[gid].onQueueDone) {
                this.dlQueuePushBack(this._quotaPushBack[gid]);
            }
        }

        this._quotaPushBack = {};

        ids.forEach(fm_tfsresume);
    },

    _overquotaInfo: function() {

        api_req({a: 'uq', xfer: 1}, {
            callback: function(res) {
                if (typeof res === "number") {
                    // Error, just keep retrying
                    Soon(this._overquotaInfo.bind(this));
                    return;
                }

                if (this.uqFastTrack) {
                    // The user loged/registered in another tab, poll the uq command every
                    // 30 seconds until we find a pro status and then retry with fresh download

                    var proStatus = res.mxfer;
                    if (d) {
                        console.debug('overquota:proStatus', proStatus);
                    }

                    if (proStatus) {
                        // Got PRO, resume dl inmediately.
                        return this._onQuotaRetry();
                    }

                    delay('overquota:uqft', this._overquotaInfo.bind(this), 30000);
                }

                var timeLeft = 3600;

                if (Object(res.tah).length) {
                    timeLeft = 3600 - ((res.bt | 0) % 3600);

                    var size = 0;
                    for (var i = 0 ; i < res.tah.length; i++) {
                        size += res.tah[i];
                    }
                    var limit = bytesToSize(size);
                    var hours = res.tah.length;
                    this._overquotaShowVariables(limit, hours);
                }

                clearInterval(this._overQuotaTimeLeftTick);
                delay('overquota:retry', this._onQuotaRetry.bind(this), timeLeft * 1000);

                var $dialog = $('.fm-dialog.bandwidth-dialog.overquota');

                if ($dialog.is(':visible')) {
                    var $countdown = $dialog.find('.countdown').removeClass('hidden');
                    $countdown.text(secondsToTimeShort(timeLeft));

                    this._overQuotaTimeLeftTick =
                        setInterval(function() {
                            $countdown.text(secondsToTimeShort(timeLeft--));
                        }, 1000);
                }
            }.bind(this)
        });
    },

    _overquotaShowVariables: function(dlQuotaLimit, dlQuotaHours) {
        $('.fm-dialog.bandwidth-dialog.overquota .bandwidth-text-bl.second').removeClass('hidden')
            .safeHTML(
                l[7099]
                    .replace("6", dlQuotaHours)
                    .replace('%1', dlQuotaLimit)
                    .replace("[A]", '<a href="#pro" class="red">').replace('[/A]', '</a>')
            );

    },

    showOverQuotaDialog: function DM_quotaDialog(dlTask) {

        var $dialog = $('.fm-dialog.bandwidth-dialog.overquota');
        var $button = $dialog.find('.fm-dialog-close');
        var $overlay = $('.fm-dialog-overlay');
        this.isOverQuota = true;

        if ($dialog.is(':visible')) {
            return;
        }

        if (typeof dlTask === "function") {
            this._dlQuotaListener.push(dlTask);
        }
        else if (dlTask) {
            this._quotaPushBack[dlTask.gid] = dlTask;
        }

        dlmanager.getCurrentDownloads()
            .forEach(function(gid) {
                fm_tfspause(gid, true);
            });

        fm_showoverlay();
        $dialog.removeClass('hidden')
            .find('.bandwidth-header')
            .safeHTML(l[7100].replace('%1', '<span class="hidden countdown"></span>'))
            .end();


        $dialog.find('.bandwidth-text-bl.second').addClass('hidden');
        this._overquotaInfo();

        var doCloseModal = function closeModal() {

            clearInterval(this._overQuotaTimeLeftTick);
            $dialog.addClass('hidden');
            $button.unbind('click.quota');
            $overlay.unbind('click.quota');
            fm_hideoverlay();
            return false;
        }.bind(this);

        $button.rebind('click.quota', doCloseModal);
        $overlay.rebind('click.quota', doCloseModal);
        $dialog.find('.membership-button').rebind('click', function() {

            // doCloseModal();
            open(getAppBaseUrl() + '#pro_' + $(this).parents('.reg-st3-membership-bl').data('payment'));
        });
    },

    getCurrentDownloads: function() {
        return array_unique(dl_queue.map(dlmanager.getGID));
    },

    isMEGAsyncRunning: function(minVersion) {
        var timeout = 200;
        var logger = this.logger;
        var promise = new MegaPromise();

        var resolve = function() {
            if (promise) {
                loadingDialog.hide();
                logger.debug('isMEGAsyncRunning: YUP');

                promise.resolve.apply(promise, arguments);
                promise = undefined;
            }
        };
        var reject = function(e) {
            if (promise) {
                loadingDialog.hide();
                logger.debug('isMEGAsyncRunning: NOPE', e);

                promise.reject.apply(promise, arguments);
                promise = undefined;
            }
        };
        var loader = function() {
            if (typeof megasync === 'undefined') {
                return reject(EACCESS);
            }
            megasync.isInstalled(function(err, is) {
                if (err || !is) {
                    reject(err || ENOENT);
                }
                else {
                    // if a min version is required, check for it
                    if (minVersion) {
                        var runningVersion = mega.utils.vtol(is.v);

                        if (typeof minVersion !== 'number'
                                || parseInt(minVersion) !== minVersion) {

                            minVersion = mega.utils.vtol(minVersion);
                        }

                        if (runningVersion < minVersion) {
                            return reject(ERANGE);
                        }
                    }

                    resolve(megasync);
                }
            });
        };

        loadingDialog.show();
        logger.debug('isMEGAsyncRunning: checking...');

        if (typeof megasync === 'undefined') {
            timeout = 4000;
            mega.utils.require('megasync_js').always(loader);
        }
        else {
            loader();
        }

        setTimeout(reject, timeout);

        return promise;
    }
};

// TODO: move the next functions to fm.js when no possible conflicts
function fm_tfsorderupd() {
    M.t = {};
    $('.transfer-table tr[id]:visible').each(function(pos, node) {
        var t = String(node.id).split('_').shift();
        if (['ul', 'dl', 'zip', 'LOCKed'].indexOf(t) === -1) {
            dlmanager.logger.error('fm_tfsorderupd', 'Unexpected node id: ' + node.id);
        }

        // if (t !== 'LOCKed') {
            M.t[pos] = node.id;
            M.t[node.id] = pos;
        // }
    });
    if (d) {
        dlmanager.logger.info('M.t', M.t);
    }
    return M.t;
}

function fm_tfspause(gid, overquota) {
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Ivalid GID to pause')) {
        if (gid[0] === 'u') {
            ulQueue.pause(gid);
        }
        else {
            dlQueue.pause(gid);
        }

        if (page === 'download') {
            if (overquota === true) {
                $('.download.info-block').addClass('overquota');
                $('.download.status-txt, .download-info .text').safeHTML(l[1673]).removeClass('blue');
            }
            else {
                $('.download.status-txt, .download-info .text').safeHTML(l[1651]).addClass('blue');
            }
        }
        else {
            var $tr = $('.transfer-table tr#' + gid);
            $tr.addClass('paused');
            $tr.find('span.transfer-type').addClass('paused');

            if (overquota === true) {
                $tr.find('td:eq(5)').safeHTML('<span class="transfer-status error overquota">@@</span>', l[1673]);
            }
            else {
                $tr.find('td:eq(5)').safeHTML('<span class="transfer-status queued">@@</span>', l[7227]);
            }
        }
        return true;
    }
    return false;
}

function fm_tfsresume(gid) {
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Invalid GID to resume')) {
        var $tr = $('.transfer-table tr#' + gid);

        if (gid[0] === 'u') {
            ulQueue.resume(gid);
        }
        else {
            if (page === 'download'
                    && $('.download.info-block').hasClass('overquota')
                    || $tr.is('.overquota')) {

                return dlmanager.showOverQuotaDialog();
            }
            dlQueue.resume(gid);
        }

        if (page === 'download') {
            $('.download.status-txt, .download-info .text').text('').removeClass('blue');
        }
        else {
            $tr.removeClass('paused');
            $tr.find('span.transfer-type').removeClass('paused overquota');

            if (!$('.transfer-table .progress-block, .transfer-table .transfer-status.initiliazing').length) {
                $tr.find('td:eq(5)').safeHTML('<span class="transfer-status initiliazing">@@</span>', l[1042]);
            }
        }
        return true;
    }
    return false;
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

function fm_tfsupdate() {
    var i = 0;
    var u = 0;

    // Move completed transfers to the bottom
    var $completed = $('.transfer-table tr.completed');
    var completedLen = $completed.length;
    $completed.remove()
        .insertBefore($('.transfer-table tr.clone-of-header'));

    // Remove completed transfers filling the whole table
    if ($('.transfer-table tr:first').hasClass('completed')) {
        var trLen = M.getTransferTableLengths().size;
        if (completedLen >= trLen) {
            if (completedLen > 50) {
                $('.transfer-table tr.completed')
                    .slice(0, trLen)
                    .fadeOut(function() {
                        $(this).remove();
                    });
            }
            $('.transfer-scrolling-table').trigger('jsp-scroll-y.tfsdynlist', [0, 0, 1]);
        }
    }
    if ($.transferHeader) {
        $.transferHeader();
    }

    /*$('.transfer-table span.row-number').each(function() {
        var $this = $(this);
        $this.text(++i);
        if ($this.closest('tr').find('.transfer-type.upload').length) {
            ++u;
        }
    });*/
    var $trs = $('.transfer-table tr').not('.completed');
    u = $trs.find('.transfer-type.upload').length;
    i = $trs.length - u - (1 /* tr.clone-of-header */);
    for (var k in M.tfsdomqueue) {
        if (k[0] === 'u') {
            ++u;
        }
        else {
            ++i;
        }
    }
    var t;
    var sep = "\u202F";
    var $tpt = $('.transfer-panel-title');
    var l = $.trim($tpt.text()).split(sep)[0];
    if (i && u) {
        t = '\u2191 ' + i + ' \u2193 ' + u;
    }
    else if (i) {
        t = i;
    }
    else if (u) {
        t = u;
    }
    else {
        t = '';
    }
    if (t) {
        t = sep + ' ' + t;
    }
    $tpt.text(l + t);
}


var dlQueue = new TransferQueue(function _downloader(task, done) {
    if (!task.dl) {
        dlQueue.logger.info('Skipping frozen task ' + task);
        return done();
    }
    return task.run(done);
}, 4, 'downloader');

// chunk scheduler
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
