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
    isOverQuota : false,
    ioThrottlePaused: false,
    fetchingFile: false,
    dlLastQuotaWarning: 0,
    dlRetryInterval: 1000,
    dlMaxChunkSize: 16 * 1048576,
    fsExpiryThreshold: 172800,
    isDownloading: false,
    dlZipID: 0,
    gotHSTS: false,
    resumeInfoTag: 'dlmr!',
    resumeInfoCache: Object.create(null),
    logger: MegaLogger.getLogger('dlmanager'),

    /**
     * Set user flags for the limitation dialogs.
     * @alias dlmanager.lmtUserFlags
     */
    setUserFlags: function() {
        this.lmtUserFlags = 0;

        if (u_type) {
            this.lmtUserFlags |= this.LMT_ISREGISTERED;

            if (Object(u_attr).p) {
                this.lmtUserFlags |= this.LMT_ISPRO;
            }
        }

        if (mega.achievem) {
            mega.achievem.enabled()
                .done(function() {
                    dlmanager.lmtUserFlags |= dlmanager.LMT_HASACHIEVEMENTS;
                });
        }

        // dlmanager.lmtUserFlags |= dlmanager.LMT_HASACHIEVEMENTS;
    },

    getResumeInfo: function(dl, callback) {
        'use strict';

        if (!dl) {
            return MegaPromise.reject(EINCOMPLETE);
        }

        if (typeof dl === 'string') {
            dl = {ph: dl, hasResumeSupport: true};
        }
        var promise;
        var tag = this.getResumeInfoTag(dl);

        if (d) {
            this.logger.debug('getResumeInfo', tag, dl);
        }

        if (this.resumeInfoCache[tag]) {
            this.resumeInfoCache[tag].tag = tag;
            promise = MegaPromise.resolve(this.resumeInfoCache[tag]);
        }
        else if (!dl.hasResumeSupport) {
            promise = MegaPromise.resolve(false);
        }
        else {
            promise = M.getPersistentData(tag);
        }

        if (typeof callback === 'function') {
            promise.then(callback).catch(callback.bind(null, false));
        }

        return promise;
    },

    remResumeInfo: function(dl) {
        'use strict';

        if (!dl) {
            return MegaPromise.reject(EINCOMPLETE);
        }

        if (typeof dl === 'string') {
            dl = {ph: dl};
        }

        if (d) {
            this.logger.debug('remResumeInfo', this.getResumeInfoTag(dl), dl);
        }

        return M.delPersistentData(this.getResumeInfoTag(dl));
    },

    setResumeInfo: function(dl, byteOffset) {
        'use strict';

        if (!dl || !dl.resumeInfo || !dl.hasResumeSupport) {
            return MegaPromise.reject(EINCOMPLETE);
        }

        dl.resumeInfo.mac = dl.mac;
        dl.resumeInfo.byteOffset = byteOffset;

        if (d) {
            this.logger.debug('setResumeInfo', this.getResumeInfoTag(dl), dl.resumeInfo, dl);
        }

        return M.setPersistentData(this.getResumeInfoTag(dl), dl.resumeInfo);
    },

    // @private
    getResumeInfoTag: function(dl) {
        'use strict';

        return this.resumeInfoTag + (dl.ph ? dl.ph : u_handle + dl.id);
    },

    /**
     * Check whether a downloaded file can be viewed within the browser through a blob/data URI in mobile.
     * @param {Object|String} n An ufs-node or filename
     * @returns {Boolean}
     */
    openInBrowser: function(n) {
        'use strict';

        // These browsers do not support opening blob.
        if (ua.details.brand === 'FxiOS'
            || ua.details.browser === 'Opera'
            || ua.details.browser === 'SamsungBrowser') {

            return false;
        }

        var exts = ["pdf", "txt", "png", "gif", "jpg", "jpeg"];

        if (ua.details.engine === 'Gecko') {
            exts.push('mp4', 'm4a', 'mp3', 'webm', 'ogg');
        }

        if (is_ios) {
            exts.push("doc", "docx", "ods", "odt", "ppt", "pptx", "rtf", "xls", "xlsx");
        }

        return localStorage.openAllInBrowser || exts.indexOf(fileext(n.n || n.name || n)) !== -1;
    },

    /**
     * Check whether the browser does support saving downloaded data to disk
     * @param {Object|String} n An ufs-node or filename
     * @returns {Number} 1: yes, 0: no, -1: can be viewed in a blob:
     */
    canSaveToDisk: function(n) {
        'use strict';

        if (dlMethod === MemoryIO && !MemoryIO.canSaveToDisk) {
            // if cannot be saved to disk, check whether at least we can open it within the browser.
            return this.openInBrowser(n) ? -1 : 0;
        }

        return 1;
    },

    /**
     * For a resumable download, check the filesize on disk
     * @param {String} handle Node handle
     * @param {String} filename The filename..
     * @returns {MegaPromise}
     */
    getFileSizeOnDisk: promisify(function(resolve, reject, handle, filename) {
        'use strict';

        if (dlMethod === FileSystemAPI) {
            M.getFileEntryMetadata('mega/' + handle)
                .then(function(metadata) {
                    resolve(metadata.size);
                }).catch(reject);
        }
        else if (is_chrome_firefox && typeof OS !== 'undefined') {
            try {
                var root = mozGetDownloadsFolder();

                OS.File.stat(OS.Path.join(root.path, filename))
                    .then(function(info) {
                        resolve(info.size);
                    }, reject);
            }
            catch (ex) {
                reject(ex);
            }
        }
        else {
            reject(EACCESS);
        }
    }),

    /**
     * Initialize download
     * @param {ClassFile} file The class file instance
     * @param {Object} gres The API reply to the `g` request
     * @param {Object} resumeInfo Resumable info, if any
     * @returns {MegaPromise}
     */
    initDownload: function(file, gres, resumeInfo) {
        'use strict';

        if (!(file instanceof ClassFile)) {
            return MegaPromise.reject(EARGS);
        }
        if (!file.dl || !Object(file.dl.io).setCredentials) {
            return MegaPromise.reject(EACCESS);
        }
        if (!gres || typeof gres !== 'object' || file.dl.size !== gres.s) {
            return MegaPromise.reject(EFAILED);
        }
        var dl = file.dl;
        var promise = new MegaPromise();

        var dl_urls = [];
        var dl_chunks = [];
        var dl_chunksizes = {};
        var dl_filesize = dl.size;
        var byteOffset = resumeInfo.byteOffset || 0;

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

        /**
        var reserved = dl_filesize - (chunksize * (dlQueue._limit - 1));
        while (p < dl_filesize) {
            dl_chunksizes[p] = p > reserved ? 1048576 : chunksize;
            dl_chunks.push(p);
            pp = p;
            p += dl_chunksizes[p];
        }
        /**/
        while (p < dl_filesize) {
            var length = Math.floor((dl_filesize - p) / 1048576 + 1) * 1048576;
            if (length > chunksize) {
                length = chunksize;
            }
            dl_chunksizes[p] = length;
            dl_chunks.push(p);
            pp = p;
            p += length;
        }
        /**/

        if (!(dl_chunksizes[pp] = dl_filesize - pp)) {
            delete dl_chunksizes[pp];
            delete dl_chunks[dl_chunks.length - 1];
        }

        for (var j = dl_chunks.length; j--;) {
            if (dl_chunks[j] !== undefined) {
                var offset = dl_chunks[j];

                dl_urls.push({
                    url: gres.g + '/' + offset + '-' + (offset + dl_chunksizes[offset] - 1),
                    size: dl_chunksizes[offset],
                    offset: offset
                });
            }
        }

        if (resumeInfo && typeof resumeInfo !== 'object') {
            dlmanager.logger.warn('Invalid resumeInfo entry.', resumeInfo, file);
            resumeInfo = false;
        }

        dl.url = gres.g;
        dl.urls = dl_urls;
        dl.mac = resumeInfo.mac || [0, 0, 0, 0];
        dl.resumeInfo = resumeInfo || Object.create(null);
        dl.byteOffset = dl.resumeInfo.byteOffset = byteOffset;

        var result = {
            chunks: dl_chunks,
            offsets: dl_chunksizes
        };

        var startDownload = function() {
            try {
                dl.io.setCredentials(dl.url, dl.size, dl.n, dl_chunks, dl_chunksizes, resumeInfo);
                promise.resolve(result);
            }
            catch (ex) {
                setTransferStatus(dl, ex);
                promise.reject(ex);
            }
        };

        if (resumeInfo.entry) {
            delete dlmanager.resumeInfoCache[resumeInfo.tag];

            M.readFileEntry(resumeInfo.entry)
                .then(function(ab) {
                    if (ab instanceof ArrayBuffer && ab.byteLength === dl.byteOffset) {
                        dl.pzBufferStateChange = ab;
                    }
                    else {
                        console.warn('Invalid pzBufferStateChange...', ab, dl.byteOffset);
                    }
                })
                .always(function() {
                    onIdle(startDownload);
                    resumeInfo.entry.remove(function() {});
                    delete resumeInfo.entry;
                });
        }
        else {
            startDownload();
        }

        return promise;
    },

    /**
     * Browser query on maximum downloadable file size
     * @returns {MegaPromise}
     */
    getMaximumDownloadSize: function() {
        'use strict';

        var promise = new MegaPromise();

        var max = function() {
            promise.resolve(Math.pow(2, is_mobile ? 32 : 53));
        };

        if (dlMethod === FileSystemAPI) {
            var success = function(used, remaining) {
                if (remaining < 1) {
                    // either the user hasn't granted persistent quota or
                    // we're in Incognito..let FileSystemAPI deal with it
                    max();
                }
                else {
                    promise.resolve(Math.max(remaining, MemoryIO.fileSizeLimit));
                }
            };

            if (navigator.webkitPersistentStorage) {
                navigator.webkitPersistentStorage.queryUsageAndQuota(success, max);
            }
            else if (window.webkitStorageInfo) {
                window.webkitStorageInfo.queryUsageAndQuota(1, success, max);
            }
            else {
                // Hmm...
                promise.resolve(-1);
            }
        }
        else if (dlMethod === MemoryIO) {
            promise.resolve(MemoryIO.fileSizeLimit);
        }
        else {
            max();
        }

        return promise;
    },

    newUrl: function DM_newUrl(dl, callback) {
        var gid = dl.dl_id || dl.ph;

        if (callback) {
            if (!this._newUrlQueue) {
                this._newUrlQueue = {};
            }

            if (this._newUrlQueue.hasOwnProperty(gid)) {
                this._newUrlQueue[gid].push(callback);
                return;
            }
            this._newUrlQueue[gid] = [callback];
        }
        if (d) {
            dlmanager.logger.info("Retrieving New URLs for", gid);
        }

        dlQueue.pause();
        dlmanager.dlGetUrl(dl, function(error, res, o) {
            if (error) {
                return later(this.newUrl.bind(this, dl));
            }
            dl.url = res.g;

            var changed = 0;
            for (var i = 0; i < dlQueue._queue.length; i++) {
                if (dlQueue._queue[i][0].dl === dl) {
                    dlQueue._queue[i][0].url = res.g + "/" +
                        dlQueue._queue[i][0].url.replace(/.+\//, '');
                    changed++;
                }
            }
            if (Object(this._newUrlQueue).hasOwnProperty(gid)) {
                this._newUrlQueue[gid]
                    .forEach(function(callback) {
                        callback(res.g, res);
                    });
                delete this._newUrlQueue[gid];
            }
            dlmanager.logger.info("Resuming, got new URL for %s", gid, res.g, changed, res);
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
            Soon(M.resetUploadDownload);
        }
        else {
            if (typeof gid === 'object') {
                gid = this.getGID(gid);
            }
            else if (!gid || gid[0] === 'u') {
                return;
            }

            var found = 0;
            var l = dl_queue.length;
            while (l--) {
                var dl = dl_queue[l];

                if (gid === this.getGID(dl)) {
                    if (!dl.cancelled) {
                        if (dl.hasResumeSupport) {
                            dlmanager.remResumeInfo(dl).dump();
                        }

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
                Soon(M.resetUploadDownload);
            }
        }
    },

    dlGetUrl: function DM_dlGetUrl(dl, callback) {
        'use strict';

        if (dl.byteOffset && dl.byteOffset === dl.size) {
            // Completed download.
            return callback(false, {s: dl.size, g: 'https://localhost.save-file.mega.nz/dl/1234'});
        }

        var req = {
            a: 'g',
            g: 1,
            ssl: use_ssl
        };

        var ctx = {
            object: dl,
            next: callback,
            dl_key: dl.key,
            callback: this.dlGetUrlDone.bind(this)
        };

        // IF this is an anonymous chat OR a chat that I'm not a part of
        if (M.chat && megaChatIsReady) {
            megaChat.eventuallyAddDldTicketToReq(req);
        }

        if (d && String(apipath).indexOf('staging') > 0) {
            var s = sessionStorage;
            req.f = [s.dltfefq | 0, s.dltflimit | 0];
        }

        if (window.fetchStreamSupport) {
            // can handle CloudRAID downloads.
            req.v = 2;
        }

        if (dl.ph) {
            req.p = dl.ph;
        }
        else if (dl.id) {
            req.n = dl.id;
        }

        if (folderlink || !dl.nauth) {
            api_req(req, ctx, dl.nauth ? 1 : 0);
        }
        else {
            req.enp = dl.nauth;
            api_req(req, ctx);
        }
    },

    dlGetUrlDone: function DM_dlGetUrlDone(res, ctx) {
        var error = EAGAIN;
        var dl = ctx.object;

        if (typeof res === 'number') {
            error = res;
        }
        else if (typeof res === 'object') {
            if (res.efq) {
                dlmanager.efq = true;
            }
            else {
                delete dlmanager.efq;
            }
            if (res.g && typeof res.g === 'object') {
                // API may gives a fake array...
                res.g = Object.values(res.g);

                if (res.g[0] < 0) {
                    res.e = res.e || res.g[0];
                }
                else {
                    dlQueue.setSize(1);
                }
            }
            if (res.d) {
                error = (res.d ? 2 : 1); // XXX: ???
            }
            else if (res.e) {
                error = res.e;
            }
            else if (res.g) {
                var key = [
                    ctx.dl_key[0] ^ ctx.dl_key[4],
                    ctx.dl_key[1] ^ ctx.dl_key[5],
                    ctx.dl_key[2] ^ ctx.dl_key[6],
                    ctx.dl_key[3] ^ ctx.dl_key[7]
                ];
                var ab = base64_to_ab(res.at);
                var attr = dec_attr(ab, key);

                if (typeof attr === 'object' && typeof attr.n === 'string') {
                    if (have_ab && page !== 'download'
                            && res.s <= 48 * 1048576
                            && is_image(attr.n)
                            && (!res.fa
                                || res.fa.indexOf(':0*') < 0
                                || res.fa.indexOf(':1*') < 0 || ctx.object.preview === -1)) {
                        ctx.object.data = new ArrayBuffer(res.s);
                    }

                    // dlmanager.onNolongerOverquota();
                    return ctx.next(false, res, attr, ctx.object);
                }
            }
        }

        dlmanager.dlReportStatus(dl, error);

        ctx.next(error || new Error("failed"));
    },

    onNolongerOverquota: function() {
        'use strict';

        dlmanager.isOverQuota = false;
        dlmanager.isOverFreeQuota = false;
        $('.limited-bandwidth-dialog .fm-dialog-close').trigger('click');
    },

    dlQueuePushBack: function DM_dlQueuePushBack(aTask) {
        var isValidTask = aTask && (aTask.onQueueDone || aTask instanceof ClassFile);

        dlmanager.logger.debug('dlQueuePushBack', isValidTask, aTask);

        if (ASSERT(isValidTask, 'dlQueuePushBack: Invalid aTask...')) {
            dlQueue.pushFirst(aTask);

            if (dlmanager.ioThrottlePaused) {
                delay('dlQueuePushBack', dlQueue.resume.bind(dlQueue), 40);
            }
        }
    },

    dlReportStatus: function DM_reportstatus(dl, code) {
        this.logger.warn('dlReportStatus', code, this.getGID(dl), dl);

        if (dl) {
            dl.lasterror = code;
            dl.onDownloadError(dl, code);
        }

        var eekey = code === EKEY;
        if (eekey || code === EACCESS || code === ETOOMANY) {
            // TODO: Check if other codes should raise abort()
            later(function() {
                dlmanager.abort(dl, eekey);
            });
            if (M.chat) {
                $('.toast-notification').removeClass('visible');
                showToast('download', eekey ? l[24] : l[20228]);
            }
            else if (code === ETOOMANY) {

                // If `g` request return ETOOMANY, it means the user who originally owned the file is suspended.
                showToast('download', l[20822]);
            }
        }

        if (code === EBLOCKED) {
            showToast('download', l[20705]);
        }

        if (eekey) {
            if (dl && Array.isArray(dl.url)) {
                // Decryption error from native CloudRAID download

                var str = "";
                if (dl.cloudRaidSettings) {
                    str += "f:" + dl.cloudRaidSettings.onFails;
                    str += " t:" + dl.cloudRaidSettings.timeouts;
                    str += " sg:" + dl.cloudRaidSettings.startglitches;
                    str += " tmf:" + dl.cloudRaidSettings.toomanyfails;
                }

                eventlog(99720, JSON.stringify([2, dl && dl.id, str]));
            }
            else if (String(dl && dl.url).length > 256) {
                // Decryption error from proxied CloudRAID download
                eventlog(99706, JSON.stringify([1, dl && dl.id]));
            }
            else {
                eventlog(99711, JSON.stringify([1, dl && dl.id]));
            }
        }

        if (code === ETEMPUNAVAIL) {
            eventlog(99698, true);
        }
    },

    dlClearActiveTransfer: tryCatch(function DM_dlClearActiveTransfer(dl_id) {
        'use strict';

        if (is_mobile) {
            return;
        }
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
    }),

    dlSetActiveTransfer: tryCatch(function DM_dlSetActiveTransfer(dl_id) {
        'use strict';

        if (is_mobile) {
            return;
        }
        var data = JSON.parse(localStorage.aTransfers || '{}');
        data[dl_id] = Date.now();
        localStorage.aTransfers = JSON.stringify(data);
    }),

    isTrasferActive: function DM_isTrasferActive(dl_id) {
        var date = null;

        if (localStorage.aTransfers) {
            var data = JSON.parse(localStorage.aTransfers);

            date = data[dl_id];
        }

        if (typeof dlpage_ph === 'string' && dlpage_ph === dl_id) {
            date = Date.now();
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
            if (!dl.log509 && Object(u_attr).p) {
                dl.log509 = 1;
                api_req({ a: 'log', e: 99614, m: 'PRO user got 509' });
            }
            this.showOverQuotaDialog(task);
            dlmanager.dlReportStatus(dl, EOVERQUOTA);
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

                if (page === 'download') {
                    $('.download.status-txt').text(l[8579]);
                }
            }
        });

        writer.on('working', function() {
            if (writer._queue.length < dlmanager.ioThrottleLimit && dlmanager.ioThrottlePaused) {
                writer.logger.info("IO_THROTTLE: resume XHR");
                dlQueue.resume();
                dlmanager.ioThrottlePaused = false;

                if (page === 'download') {
                    $('.download.status-txt').text(l[258]);
                }
            }
        });
    },

    checkLostChunks: function DM_checkLostChunks(file) {
        'use strict';

        var mac;
        var dl_key = file.key;

        if (file.hasResumeSupport) {
            mac = file.mac;
        }
        else {
            var t = Object.keys(file.macs)
                .map(Number)
                .sort(function(a, b) {
                    return a - b;
                })
                .map(function(v) {
                    return file.macs[v];
                });

            mac = condenseMacs(t, [
                dl_key[0] ^ dl_key[4],
                dl_key[1] ^ dl_key[5],
                dl_key[2] ^ dl_key[6],
                dl_key[3] ^ dl_key[7]
            ], file.mac);
        }

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
        'use strict';

        function finish_write(task, done) {
            task.data = undefined;
            done();

            if (typeof task.callback === "function") {
                task.callback();
            }
            if (dl.ready) {
                // tell the download scheduler we're done.
                dl.ready();
            }
        }

        function safeWrite(data, offset, callback) {
            var abort = function swa(ex) {
                console.error(ex);
                dlFatalError(dl, ex);
            };

            try {
                dl.io.write(data, offset, tryCatch(callback, abort));
            }
            catch (ex) {
                abort(ex);
            }
        }

        dl.writer = new MegaQueue(function dlIOWriterStub(task, done) {
            if (!task.data.byteLength || dl.cancelled) {
                if (d) {
                    dl.writer.logger.error(dl.cancelled ? "download cancelled" : "writing empty chunk");
                }
                return finish_write(task, done);
            }
            var logger = dl.writer && dl.writer.logger || dlmanager.logger;

            // As of Firefox 37, this method will neuter the array buffer.
            var abLen = task.data.byteLength;
            var abDup = dl.data && (is_chrome_firefox & 4) && new Uint8Array(task.data);

            var ready = function _onWriterReady() {
                if (dl.cancelled || oIsFrozen(dl.writer)) {
                    if (d) {
                        logger.debug('Download canceled while writing to disk...', dl.cancelled, [dl]);
                    }
                    return;
                }
                dl.writer.pos += abLen;

                if (dl.data) {
                    new Uint8Array(
                        dl.data,
                        task.offset,
                        abLen
                    ).set(abDup || task.data);
                }

                if (dl.hasResumeSupport) {
                    if (d > 1) {
                        logger.debug('Condense MACs @ offset %s-%s', task.offset, dl.writer.pos, Object.keys(dl.macs));
                    }

                    for (var pos = task.offset; dl.macs[pos] && pos < dl.writer.pos; pos += 1048576) {
                        dl.mac[0] ^= dl.macs[pos][0];
                        dl.mac[1] ^= dl.macs[pos][1];
                        dl.mac[2] ^= dl.macs[pos][2];
                        dl.mac[3] ^= dl.macs[pos][3];
                        dl.mac = dl.aes.encrypt(dl.mac);
                        delete dl.macs[pos];
                    }
                }

                dlmanager.setResumeInfo(dl, dl.writer.pos)
                    .always(function() {
                        finish_write(task, done);
                    });
            };

            var writeTaskChunk = function() {
                safeWrite(task.data, task.offset, ready);
            };

            if (dl.pzBufferStateChange) {
                safeWrite(dl.pzBufferStateChange, 0, writeTaskChunk);
                delete dl.pzBufferStateChange;
            }
            else {
                writeTaskChunk();
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
        'use strict';

        return Object.assign(Object.create(null), {
            update: function(b) {
                var ts = Date.now();
                if (b < 0) {
                    this.tb = Object.create(null);
                    this.st = 0;
                    return 0;
                }
                if (b) {
                    this.tb[ts] = this.tb[ts] ? this.tb[ts] + b : b;
                }
                b = 0;
                for (var t in this.tb) {
                    if (t < ts - this.window) {
                        delete this.tb[t];
                    }
                    else {
                        b += this.tb[t];
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

            st: 0,
            window: 60000,
            tb: Object.create(null)
        });
    },

    _quotaPushBack: {},
    _dlQuotaListener: [],

    _onQuotaRetry: function DM_onQuotaRetry(getNewUrl, sid) {
        delay.cancel('overquota:retry');
        this.setUserFlags();

        var ids = dlmanager.getCurrentDownloads();
        // $('.limited-bandwidth-dialog .fm-dialog-close').trigger('click');

        if (d) {
            this.logger.debug('_onQuotaRetry', getNewUrl, ids, this._dlQuotaListener.length, this._dlQuotaListener);
        }

        if (this.onOverquotaWithAchievements) {
            closeDialog();
            topmenuUI();

            dlmanager._achievementsListDialog();
            delete this.onOverquotaWithAchievements;
            return;
        }

        if (this.isOverFreeQuota) {
            closeDialog();
            topmenuUI();

            if (sid) {
                this.isOverFreeQuota = sid;
            }
        }

        if (page === 'download') {
            var $dtb = $('.download.top-bar');
            $dtb.removeClass('stream-overquota overquota');
            $('.see-our-plans', $dtb).addClass('hidden').off('click');
            $('.create-account-button', $dtb).addClass('hidden').off('click');
            $('.get-more-bonuses', $dtb).addClass('hidden').off('click');
            $('.download.over-transfer-quota', $dtb).addClass('hidden');
            $(window).trigger('resize');
        }
        else if (ids.length) {
            resetOverQuotaTransfers(ids);
        }

        for (var i = 0; i < this._dlQuotaListener.length; ++i) {
            if (typeof this._dlQuotaListener[i] === "function") {
                this._dlQuotaListener[i]();
            }
        }
        this._dlQuotaListener = [];

        var tasks = [];

        for (var gid in this._quotaPushBack) {
            if (this._quotaPushBack.hasOwnProperty(gid)
                    && this._quotaPushBack[gid].onQueueDone) {

                tasks.push(this._quotaPushBack[gid]);
            }
        }
        this._quotaPushBack = {};

        this.logger.debug('_onQuotaRetry', tasks.length, tasks);

        if (getNewUrl && tasks.length) {
            var len = tasks.length;

            tasks.forEach(function(task) {
                var dl = task.task.download;

                dlmanager.newUrl(dl, function(rg) {
                    if (task.url) {
                        task.url = rg + "/" + task.url.replace(/.+\//, '');
                        dlmanager.dlQueuePushBack(task);
                    }

                    if (!--len) {
                        ids.forEach(fm_tfsresume);
                    }
                });
            });
        }
        else {
            tasks.forEach(this.dlQueuePushBack);
            ids.forEach(fm_tfsresume);
        }
    },

    _achievementsListDialog: function($dialog) {
        'use strict';

        if (d) {
            this.logger.info('_achievementsListDialog', this.onOverquotaWithAchievements, $dialog);
        }

        mega.achievem.achievementsListDialog(function() {
            dlmanager._onOverquotaDispatchRetry($dialog);
        });
    },

    _onOverquotaDispatchRetry: function($dialog) {
        'use strict';

        this.setUserFlags();

        if (d) {
            this.logger.info('_onOverquotaDispatchRetry', this.lmtUserFlags, $dialog);
        }

        if (this.onLimitedBandwidth) {
            // pre-warning dialog
            this.onLimitedBandwidth();
        }
        else {
            // from overquota dialog
            this._onQuotaRetry(true);
        }

        if ($dialog) {
            // update transfers buttons on the download page...
            this._overquotaClickListeners($dialog);
        }
    },

    _onOverQuotaAttemptRetry: function() {
        'use strict';

        if (!this.onOverquotaWithAchievements) {
            if (this.isOverQuota && !this.isOverFreeQuota) {
                this.uqFastTrack = !Object(u_attr).p;
                delay('overquota:uqft', this._overquotaInfo.bind(this), 900);
            }

            if (typeof this.onLimitedBandwidth === 'function') {
                this.onLimitedBandwidth();
            }
        }
    },

    _overquotaInfo: function() {
        'use strict'; /* jshint -W074 */

        var onQuotaInfo = function(res) {
                if (typeof res === "number") {
                    // Error, just keep retrying
                    Soon(this._overquotaInfo.bind(this));
                    return;
                }

                if (this.uqFastTrack || (this.onOverQuotaProClicked && u_type)) {
                    // The user loged/registered in another tab, poll the uq command every
                    // 30 seconds until we find a pro status and then retry with fresh download

                    var proStatus = res.mxfer;
                    this.logger.debug('overquota:proStatus', proStatus);

                    if (proStatus) {
                        // Got PRO, resume dl inmediately.
                        return this._onQuotaRetry(true);
                    }

                    delay('overquota:uqft', this._overquotaInfo.bind(this), 30000);
                }

                var timeLeft = 3600;

                if (Object(res.tah).length) {
                    var add = 1;
                    var size = 0;

                    timeLeft = 3600 - ((res.bt | 0) % 3600);

                    for (var i = 0 ; i < res.tah.length; i++) {
                        size += res.tah[i];

                        if (res.tah[i]) {
                            add = 0;
                        }
                        else if (add) {
                            timeLeft += 3600;
                        }
                    }
                }

                clearInterval(this._overQuotaTimeLeftTick);
                delay('overquota:retry', this._onQuotaRetry.bind(this), timeLeft * 1000);

                var $dialog = $('.fm-dialog.limited-bandwidth-dialog');
                var $dlPageCountdown = $('.download.transfer-overquota-txt').text(String(l[7100]).replace('%1', ''));
                if (!$dlPageCountdown.is(':visible')) {
                    $dlPageCountdown = null;
                }
                this._overquotaClickListeners($dialog);

                if ($dialog.is(':visible') || $dlPageCountdown) {
                    var $countdown = $dialog.find('.countdown').removeClass('hidden');
                    $countdown.safeHTML(secondsToTime(timeLeft, 1));

                    if ($dlPageCountdown) {
                        var html = '<span class="countdown">' + secondsToTime(timeLeft) + '</span>';
                        $dlPageCountdown.safeHTML(escapeHTML(l[7100]).replace('%1', html));
                    }

                    this._overQuotaTimeLeftTick =
                        setInterval(function() {
                            var time = secondsToTime(timeLeft--, 1);

                            if (time) {
                                $countdown.safeHTML(time);

                                if ($dlPageCountdown) {
                                    var html = '<span class="countdown">' + secondsToTime(timeLeft) + '</span>';
                                    $dlPageCountdown.safeHTML(escapeHTML(l[7100]).replace('%1', html));
                                }
                            }
                            else {
                                $countdown.text('');

                                if ($dlPageCountdown) {
                                    $dlPageCountdown.text(String(l[7100]).replace('%1', ''));
                                }
                                clearInterval(dlmanager._overQuotaTimeLeftTick);
                            }
                        }, 1000);
                }
            }.bind(this)

        M.req.poll(-10, {a: 'uq', xfer: 1}).then(function(res) {
            delay('overquotainfo:reply.success', function() {
                onQuotaInfo(res);
            });
        }).catch(function(ex) {
            if (d) {
                dlmanager.logger.warn('_overquotaInfo', ex);
            }

            delay('overquotainfo:reply.error', dlmanager._overquotaInfo.bind(dlmanager));
        });
    },

    _overquotaClickListeners: function($dialog, flags, preWarning) {
        'use strict';

        var self = this;
        var unbindEvents = function() {
            $(window).unbind('resize.overQuotaDialog');
            $('.fm-dialog-overlay', 'body').unbind('click.closeOverQuotaDialog');
        };
        var closeDialog = function() {
            if ($.dialog === 'download-pre-warning') {
                $.dialog = 'was-pre-warning';
            }
            unbindEvents();
            window.closeDialog();
        };
        var open = function(url) {
            if (is_mobile) {
                location.href = url;
                return false;
            }
            window.open.apply(window, arguments);
        };
        var onclick = function onProClicked() {
            if (preWarning) {
                api_req({a: 'log', e: 99643, m: 'on overquota pre-warning upgrade/pro-plans clicked'});
            }
            else {
                self.onOverQuotaProClicked = true;
                delay('overquota:uqft', self._overquotaInfo.bind(self), 30000);
                api_req({a: 'log', e: 99640, m: 'on overquota pro-plans clicked'});
            }

            if ($(this).hasClass('plan-button')) {
                open(getAppBaseUrl() + '#propay_' + $(this).closest('.plan').data('payment'));
            }
            else {
                open(getAppBaseUrl() + '#pro');
            }

            return false;
        };
        var getMoreBonusesListener = function() {
            closeDialog();

            if (flags & dlmanager.LMT_ISREGISTERED) {
                dlmanager._achievementsListDialog($dialog);

                api_req({a: 'log', e: 99641, m: 'on overquota get-more-bonuses clicked'});
            }
            else {
                api_req({a: 'log', e: 99642, m: 'on overquota register-for-bonuses clicked'});

                dlmanager.showRegisterDialog4ach($dialog, flags);
            }
        };

        flags = flags !== undefined ? flags : this.lmtUserFlags;

        if (preWarning) {
            localStorage.seenQuotaPreWarn = Date.now();

            $('.msg-overquota', $dialog).addClass('hidden');
            $('.msg-prewarning', $dialog).removeClass('hidden');

            $('.continue, .continue-download', $dialog)
                .removeAttr('style')
                .rebind('click', this.onLimitedBandwidth.bind(this));

            if (is_mobile) {
                // desktop has a 'continue' button, on mobile we do treat the close button as such
                $('.fm-dialog-close', $dialog).rebind('click', this.onLimitedBandwidth.bind(this));
            }
        }
        else {

            $('.msg-overquota', $dialog).removeClass('hidden');
            $('.msg-prewarning', $dialog).addClass('hidden');

            $('.continue', $dialog).attr('style', 'display:none');

            $('.video-theatre-mode:visible').addClass('paused');

            $('.fm-dialog-close', $dialog).add($('.fm-dialog-overlay'))
                .rebind('click.closeOverQuotaDialog', function() {

                    unbindEvents();
                });

            if (page === 'download') {
                var $dtb = $('.download.top-bar');

                $('.create-account-button', $dtb).addClass('hidden').off('click');
                $('.get-more-bonuses', $dtb).addClass('hidden').off('click');

                if (flags & this.LMT_HASACHIEVEMENTS) {
                    if (flags & this.LMT_ISREGISTERED) {
                        $('.get-more-bonuses', $dtb)
                            .removeClass('hidden')
                            .rebind('click', getMoreBonusesListener);
                    }
                    else {
                        $('.create-account-button', $dtb)
                            .removeClass('hidden')
                            .rebind('click', getMoreBonusesListener);
                    }
                }

                $('.see-our-plans', $dtb).removeClass('hidden').rebind('click', onclick);

                $('.download.over-transfer-quota', $dtb).removeClass('hidden');
                $dtb.addClass('stream-overquota');
                $(window).trigger('resize');
            }
        }

        $('.upgrade, .mobile.upgrade-to-pro, .plan-button', $dialog).rebind('click', onclick);

        $('.bottom-tips a', $dialog).rebind('click', function() {
            open(getAppBaseUrl() +
                '#help/client/webclient/cloud-drive/576ca738886688e7028b4599'
            );
        });

        if (flags & this.LMT_ISREGISTERED) {
            $dialog.addClass('registered');
        }
        else {
            var $oqbbl = $('.overquota-bott-bl', $dialog);

            var showOverQuotaRegisterDialog = function() {
                closeDialog();
                dlmanager.showOverQuotaRegisterDialog();
            };

            if (preWarning && !u_wasloggedin()) {
                api_req({a: 'log', e: 99646, m: 'on pre-warning not-logged-in'});
                $('.default-big-button.login', $oqbbl).addClass('hidden');
            }
            else {
                $('.default-big-button.login', $oqbbl).removeClass('hidden').rebind('click', function() {
                    api_req({a: 'log', e: 99644, m: 'on overquota login clicked'});
                    closeDialog();

                    mega.ui.showLoginRequiredDialog({
                            minUserType: 3,
                            skipInitialDialog: 1
                        })
                        .done(function() {
                            api_req({a: 'log', e: 99645, m: 'on overquota logged into account.'});
                            dlmanager._onQuotaRetry(true);
                        })
                        .fail(showOverQuotaRegisterDialog);
                });
            }

            $('.default-big-button.create-account', $oqbbl).rebind('click', showOverQuotaRegisterDialog);
        }

        $dialog.addClass('hidden-bottom');
        if (flags & this.LMT_HASACHIEVEMENTS || $dialog.hasClass('gotEFQb')) {
            $dialog.removeClass('hidden-bottom');
        }
        else if (!(flags & this.LMT_ISREGISTERED)) {
            var $pan = $('.not-logged.no-achievements', $dialog);

            if ($pan.length && !$pan.hasClass('flag-pcset')) {
                $pan.addClass('flag-pcset');

                M.req('efqb').done(function(val) {
                    if (val) {
                        $dialog.removeClass('hidden-bottom').addClass('gotEFQb');
                        $pan.text(String($pan.text()).replace('10%', val + '%'));
                    }
                });
            }
        }

        if (flags & this.LMT_HASACHIEVEMENTS) {
            $dialog.addClass('achievements');
            localStorage.gotOverquotaWithAchievements = 1;
            $('.get-more-bonuses', $dialog).rebind('click', getMoreBonusesListener);
        }
    },

    _setOverQuotaState: function DM_setOverQuotaState(dlTask) {
        this.isOverQuota = true;
        localStorage.seenOverQuotaDialog = Date.now();
        this.logger.debug('_setOverQuotaState', dlTask);

        if (typeof dlTask === "function") {
            this._dlQuotaListener.push(dlTask);
        }
        else if (dlTask) {
            this._quotaPushBack[dlTask.gid] = dlTask;
        }

        this.getCurrentDownloads()
            .forEach(function(gid) {
                fm_tfspause(gid, true);
            });
    },

    showOverQuotaRegisterDialog: function DM_freeQuotaDialog(dlTask) {

        this._setOverQuotaState(dlTask);

        // did we get a sid from another tab? (watchdog:setsid)
        if (typeof this.isOverFreeQuota === 'string') {
            // Yup, delay a retry...
            return delay('overfreequota:retry', this._onQuotaRetry.bind(this, true), 1200);
        }
        this.isOverFreeQuota = true;

        if (localStorage.awaitingConfirmationAccount) {
            var accountData = JSON.parse(localStorage.awaitingConfirmationAccount);
            this.logger.debug('showOverQuotaRegisterDialog: awaitingConfirmationAccount!');
            return mega.ui.sendSignupLinkDialog(accountData);
        }

        api_req({a: 'log', e: 99613, m: 'on overquota register dialog shown'});

        mega.ui.showRegisterDialog({
            title: l[17],
            body: '<p>' + l[8834] + '</p><p>' + l[8833] + '</p><h2>' + l[1095] + '</h2>',
            showLogin: true,

            onAccountCreated: function(gotLoggedIn, accountData) {
                if (gotLoggedIn) {
                    // dlmanager._onQuotaRetry(true);
                    dlmanager._onOverquotaDispatchRetry();

                    api_req({a: 'log', e: 99649, m: 'on overquota logged-in through register dialog.'});
                }
                else {
                    security.register.cacheRegistrationData(accountData);
                    mega.ui.sendSignupLinkDialog(accountData);

                    api_req({a: 'log', e: 99650, m: 'on overquota account created.'});
                }
            }
        });
    },

    /**
     * Wrapper around mega.ui.showRegisterDialog()
     * @param {jQuery} [$dialog]   The parent dialog
     * @param {Number} [flags]     Limitation flags
     */
    showRegisterDialog4ach: function DM_showRegisterDialog($dialog, flags) {
        'use strict';

        api_req({a: 'log', e: 99647, m: 'on overquota register-for-achievements dialog shown'});

        if (flags & this.LMT_HASACHIEVEMENTS) {
            this.onOverquotaWithAchievements = true;
        }

        mega.ui.showRegisterDialog({
            onAccountCreated: function(gotLoggedIn, accountData) {
                if (gotLoggedIn) {
                    dlmanager._onOverquotaDispatchRetry($dialog);
                }
                else {
                    security.register.cacheRegistrationData(accountData);
                    mega.ui.sendSignupLinkDialog(accountData);
                }
            },
            onDialogClosed: function() {
                if ($dialog) {
                    fm_showoverlay();
                    $dialog.removeClass('hidden')
                        .find('.fm-dialog-close')
                        .rebind('click.quota', closeDialog);
                }
                delete dlmanager.onOverquotaWithAchievements;
            }
        });
    },

    prepareLimitedBandwidthDialogPlans: function ($dialog) {
        var $pricingBoxes = $('.plan', $dialog);

        pro.proplan.initPlanPeriodControls($dialog);
        pro.proplan.updateEachPriceBlock("D", $pricingBoxes, $dialog, 1);
    },

    setPlanPrices: function($dialog) {
        'use strict';

        var $scrollBlock = $('.scrollable', $dialog);

        // Set scroll to top
        $scrollBlock.scrollTop(0);

        // Load the membership plans
        pro.loadMembershipPlans(function() {

            // Render the plan details
            dlmanager.prepareLimitedBandwidthDialogPlans($dialog);

            if (!is_mobile) {

                // Check if touch device
                var is_touch = function() {
                    return 'ontouchstart' in window || 'onmsgesturechange' in window;
                };

                // Change dialog height to fit browser height
                var updateDialogHeight = function() {

                    var dialogHeight;
                    var contentHeight;

                    $dialog.css('height', '');
                    dialogHeight = $dialog.outerHeight();
                    contentHeight = $('.fm-dialog-body', $dialog).outerHeight();

                    if (dialogHeight < contentHeight) {
                        $dialog.outerHeight(contentHeight);
                    }

                    if (!is_touch()) {

                        // Update previous scrolling
                        if ($scrollBlock.is('.ps-container')) {
                            Ps.update($scrollBlock[0]);
                        }
                        else {
                            // Initialize scrolling
                            Ps.initialize($scrollBlock[0]);
                        }
                    }
                };

                // Change dialog height to fit browser height
                Soon(updateDialogHeight);

                $(window).rebind('resize.overQuotaDialog', function() {

                    // Change dialog height to fit browser height
                    updateDialogHeight();

                    // Change dialog position
                    dialogPositioning($dialog);
                });
            }
        });
    },

    showLimitedBandwidthDialog: function(res, callback, flags) {
        'use strict';

        var $dialog = $('.limited-bandwidth-dialog');

        loadingDialog.hide();
        this.onLimitedBandwidth = function() {
            if (callback) {
                $dialog.removeClass('registered achievements exceeded pro slider uploads');
                $('.bottom-tips a', $dialog).off('click');
                $('.continue, .continue-download, .fm-dialog-close', $dialog).off('click');
                $('.upgrade, .pricing-page.plan, .mobile.upgrade-to-pro', $dialog).off('click');
                $('.get-more-bonuses', $dialog).off('click');
                if ($.dialog === 'download-pre-warning') {
                    $.dialog = false;
                }
                closeDialog();
                Soon(callback);
                callback = $dialog = undefined;
            }
            delete this.onLimitedBandwidth;
            return false;
        };

        flags = flags !== undefined ? flags : this.lmtUserFlags;

        if (d) {
            // as per ticket 6446
            // /* 01 */ flags = this.LMT_ISREGISTERED | this.LMT_HASACHIEVEMENTS;
            // /* 02 */ flags = this.LMT_HASACHIEVEMENTS;
            // /* 03 */ flags = 0;
            // /* 04 */ flags = this.LMT_ISREGISTERED;

            this.lmtUserFlags = flags;
        }

        M.safeShowDialog('download-pre-warning', function() {
            eventlog(99617);// overquota pre-warning shown.

            // Load the membership plans
            dlmanager.setPlanPrices($dialog);

            uiCheckboxes($dialog, 'ignoreLimitedBandwidth');
            dlmanager._overquotaClickListeners($dialog, flags, res || true);

            return $dialog.removeClass('exceeded registered achievements pro slider uploads');
        });
    },

    showOverQuotaDialog: function DM_quotaDialog(dlTask, flags) {
        'use strict';

        flags = flags !== undefined ? flags : this.lmtUserFlags;

        if (d) {
            // as per ticket 6446
            // /* 05 */ flags = this.LMT_ISREGISTERED | this.LMT_HASACHIEVEMENTS;
            // /* 06 */ flags = this.LMT_HASACHIEVEMENTS;
            // /* 07 */ flags = 0;
            // /* 08 */ flags = this.LMT_ISREGISTERED;
            // /* 09 */ flags = this.LMT_ISREGISTERED | this.LMT_ISPRO | this.LMT_HASACHIEVEMENTS;
            // /* 10 */ flags = this.LMT_ISREGISTERED | this.LMT_ISPRO;

            this.lmtUserFlags = flags;
        }

        if (this.efq && !(flags & this.LMT_ISREGISTERED)) {
            return this.showOverQuotaRegisterDialog(dlTask);
        }
        loadingDialog.hide();

        var asyncTaskID = false;
        var $dialog = $('.fm-dialog.limited-bandwidth-dialog');

        $(document).fullScreen(false);
        this._setOverQuotaState(dlTask);

        if ($dialog.is(':visible') && !$dialog.hasClass('uploads')) {
            this.logger.info('showOverQuotaDialog', 'visible already.');
            return;
        }

        if ($('.fm-dialog.achievements-list-dialog').is(':visible')) {
            this.logger.info('showOverQuotaDialog', 'Achievements dialog visible.');
            return;
        }

        M.safeShowDialog('download-overquota', function() {

            $dialog
                .removeClass('registered achievements exceeded pro slider uploads')
                .find('.transfer-overquota-txt')
                .safeHTML(l[7100].replace('%1', '<span class="hidden countdown"></span>'))
                .end();

            // restore contents in case they were changed for the uploads over storage quota dialog
            $('.p-after-icon.msg-overquota', $dialog).text(l[120]);
            $('.header-before-icon.exceeded', $dialog).text(l[17]);

            if (dlmanager.isStreaming) {
                $('.p-after-icon.msg-overquota', $dialog).text(l[19615]);
            }

            if (flags & dlmanager.LMT_ISPRO) {
                $dialog.addClass('pro');

                asyncTaskID = 'mOverQuota.' + makeUUID();

                if (dlmanager.isStreaming) {
                    $('.pro-exceeded-txt .msg-overquota', $dialog).text(l[19617]);
                }
                else {
                    $('.pro-exceeded-txt .msg-overquota', $dialog).text(l[17084]);
                }

                if (M.account) {
                    // Force data retrieval from API
                    M.account.lastupdate = 0;
                }
                M.accountData(function(account) {
                    var tfsQuotaLimit = bytesToSize(account.bw, 0).split(' ');
                    var tfsQuotaUsed = (account.downbw_used + account.servbw_used);
                    var perc = Math.min(100, Math.ceil(tfsQuotaUsed * 100 / account.bw));

                    $('.chart.data .size-txt', $dialog).text(bytesToSize(tfsQuotaUsed, 0));
                    $('.chart.data .pecents-txt', $dialog).text(tfsQuotaLimit[0]);
                    $('.chart.data .gb-txt', $dialog).text(tfsQuotaLimit[1]);
                    $('.fm-account-blocks.bandwidth', $dialog).removeClass('no-percs');
                    $('.chart.data .perc-txt', $dialog).text(perc + '%');

                    // if they granted quota to other users
                    if (account.servbw_limit > 0) {
                        $dialog.addClass('slider');

                        $('.bandwidth-slider', $dialog).slider({
                            min: 0, max: 100, range: 'min', value: account.servbw_limit,
                            change: function(e, ui) {
                                if (ui.value < account.servbw_limit) {
                                    // retry download if less quota was chosen...
                                    loadingDialog.show();
                                    M.req({a: 'up', srvratio: ui.value})
                                        .always(function() {
                                            loadingDialog.hide();
                                            dlmanager._onQuotaRetry(true);
                                        });
                                }
                            }
                        });
                    }

                    mBroadcaster.sendMessage(asyncTaskID);
                    asyncTaskID = null;
                });
            }

            var doCloseModal = function closeModal() {
                if (!$('.download.transfer-overquota-txt').is(':visible')) {
                    clearInterval(dlmanager._overQuotaTimeLeftTick);
                }
                $('.fm-dialog-overlay').off('click.dloverq');
                $dialog.off('dialog-closed').find('.fm-dialog-close').off('click.quota');
                closeDialog();
                return false;
            };
            dlmanager._overquotaInfo();
            dlmanager._overquotaClickListeners($dialog, flags);

            $('.fm-dialog-overlay').rebind('click.dloverq', doCloseModal);

            if (is_mobile) {
                $(window).trigger('orientationchange');
            }

            $dialog
                .addClass('exceeded')
                .removeClass('hidden')
                .rebind('dialog-closed', doCloseModal)
                .find('.fm-dialog-close')
                .rebind('click.quota', doCloseModal);

            // Load the membership plans
            dlmanager.setPlanPrices($dialog);

            api_req({a: 'log', e: 99648, m: 'on overquota dialog shown'});

            if (asyncTaskID) {
                loadingDialog.show();
                mBroadcaster.once(asyncTaskID, function() {
                    loadingDialog.hide();
                });
            }

            return $dialog;
        });
    },

    getCurrentDownloads: function() {
        return array.unique(dl_queue.filter(isQueueActive).map(dlmanager.getGID));
    },

    getCurrentDownloadsSize: function(sri) {
        var size = 0;

        if (typeof dl_queue === 'undefined') {
            return size;
        }

        dl_queue
            .filter(isQueueActive)
            .map(function(dl) {
                size += dl.size;

                if (sri) {
                    // Subtract resume info

                    if (dl.byteOffset) {
                        size -= dl.byteOffset;
                    }
                }
            });

        return size;
    },

    getQBQData: function() {
        'use strict';

        var q = {p: [], n: [], s: 0};

        dl_queue
            .filter(isQueueActive)
            .map(function(dl) {
                if (!dl.loaded || dl.size - dl.loaded) {
                    if (dl.ph) {
                        q.p.push(dl.ph);
                    }
                    else {
                        q.n.push(dl.id);
                    }

                    if (dl.loaded) {
                        q.s += dl.loaded;
                    }
                }
            });

        return q;
    },

    /**
     * Check whether MEGAsync is running.
     *
     * @param {String}  minVersion      The min MEGAsync version required.
     * @param {Boolean} getVersionInfo  Do not reject the promise if the min version is not
     *                                  meet, instead resolve it providing an ERANGE result.
     * @return {MegaPromise}
     */
    isMEGAsyncRunning: function(minVersion, getVersionInfo) {
        var timeout = 400;
        var logger = this.logger;
        var promise = new MegaPromise();

        var resolve = function() {
            if (promise) {
                loadingDialog.hide();
                logger.debug('isMEGAsyncRunning: YUP', arguments);

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
                    var verNotMeet = false;

                    // if a min version is required, check for it
                    if (minVersion) {
                        var runningVersion = M.vtol(is.v);

                        if (typeof minVersion !== 'number'
                                || parseInt(minVersion) !== minVersion) {

                            minVersion = M.vtol(minVersion);
                        }

                        if (runningVersion < minVersion) {
                            if (!getVersionInfo) {
                                return reject(ERANGE);
                            }

                            verNotMeet = ERANGE;
                        }
                    }

                    var syncData = clone(is);
                    syncData.verNotMeet = verNotMeet;

                    resolve(megasync, syncData);
                }
            });
        };

        loadingDialog.show();
        logger.debug('isMEGAsyncRunning: checking...');

        if (typeof megasync === 'undefined') {
            timeout = 4000;
            M.require('megasync_js').always(loader);
        }
        else {
            onIdle(loader);
        }

        setTimeout(reject, timeout);

        return promise;
    },

    setBrowserWarningClasses: function(selector, $container, message) {
        'use strict';

        var uad = ua.details || false;
        var $elm = $(selector, $container);

        if (message) {
            $elm.addClass('default-warning');
        }
        else if (String(uad.browser).startsWith('Edg')) {
            $elm.addClass('edge');
        }
        else if (window.safari) {
            $elm.addClass('safari');
        }
        else if (window.opr) {
            $elm.addClass('opera');
        }
        else if (mega.chrome) {
            $elm.addClass('chrome');
        }
        else if (uad.engine === 'Gecko') {
            $elm.addClass('ff');
        }
        else if (uad.engine === 'Trident') {
            $elm.addClass('ie');
        }

        var setText = function(locale, $elm) {
            var text = uad.browser ? String(locale).replace('%1', uad.browser) : l[16883];

            if (message) {
                text = l[1676] + ': ' + message + '<br/>' + l[16870] + ' %2';
            }

            if (mega.chrome) {
                if (window.Incognito) {
                    text = text.replace('%2', '(' + l[16869] + ')');
                }
                else if (message) {
                    text = text.replace('%2', '');
                }
                else if (is_extension) {
                    text = l[17792];
                }
                else {
                    text = l[17793];

                    onIdle(function() {
                        $('.freeupdiskspace').rebind('click', function() {
                            var $dialog = $('.megasync-overlay');
                            $('.megasync-close, .fm-dialog-close', $dialog).click();

                            msgDialog('warningb', l[882], l[7157], 0, function(yes) {
                                if (yes) {
                                    var logged = false;

                                    loadingDialog.show();
                                    M.req({a: 'log', e: 99682}).always(function() { logged = true; });

                                    M.clearFileSystemStorage()
                                        .always(function() {
                                            var reload = function() {
                                                location.reload(true);
                                            };

                                            if (logged) {
                                                reload();
                                            }
                                            else {
                                                setTimeout(reload, 3000);
                                            }
                                        });
                                }
                            });
                            return false;
                        });
                    });
                }
            }
            else {
                text = text.replace('%2', '(' + l[16868] + ')');
            }

            $elm.find('span.txt').safeHTML(text);
        };

        $elm.find('.default-white-button').rebind('click', function() {
            if (typeof megasync === 'undefined') {
                console.error('Failed to load megasync.js');
            }
            else {
                if (typeof dlpage_ph === 'string') {
                    megasync.download(dlpage_ph, dlpage_key);
                }
                else {
                    open(megasync.getMegaSyncUrl() || (getAppBaseUrl() + '#sync'));
                }
            }
            if ($('.download.top-bar').hasClass('video')) {
                $elm.removeClass('visible');
            }
        });

        $elm.find('.fm-dialog-close').rebind('click', function() {
            $elm.removeClass('visible');
        });

        if ($container && $elm) {
            setText(l[16866], $elm);
            $container.addClass('warning');
        }
        else {
            setText(l[16865], $elm.addClass('visible'));
        }
    },

    // MEGAsync dialog If filesize is too big for downloading through browser
    showMEGASyncOverlay: function(onSizeExceed, dlStateError) {
        'use strict';

        //M.require('megasync_js').dump();

        var $overlay = $('.megasync-overlay');
        var $body = $('body');

        var hideOverlay = function() {
            $body.off('keyup.msd');
            $overlay.addClass('hidden');
            $body.removeClass('overlayed');
            $overlay.hide();
            return false;
        };

        $overlay.addClass('msd-dialog').removeClass('hidden downloading');
        $body.addClass('overlayed');
        $overlay.show();

        var $slides = $overlay.find('.megasync-slide');
        var $currentSlide = $slides.filter('.megasync-slide:not(.hidden)').first();
        var $sliderControl = $overlay.find('.megasync-slider.button');
        var $sliderPrevButton = $sliderControl.filter('.prev');
        var $sliderNextButton = $sliderControl.filter('.next');

        $slides.removeClass('prev current next');
        $currentSlide.addClass('current');
        $currentSlide.prev().not('.hidden').addClass('prev');
        $currentSlide.next().not('.hidden').addClass('next');
        $sliderPrevButton.addClass('disabled');
        $sliderNextButton.removeClass('disabled');

        $sliderControl.rebind('click', function() {
            var $this = $(this);
            var $currentSlide = $overlay.find('.megasync-slide.current');
            var $prevSlide = $currentSlide.prev().not('.hidden');
            var $nextSlide = $currentSlide.next().not('.hidden');

            if ($this.hasClass('disabled')) {
                return false;
            }

            if ($this.hasClass('prev') && $prevSlide.length) {
                $slides.removeClass('prev current next');
                $prevSlide.addClass('current');
                $currentSlide.addClass('next');
                $sliderNextButton.removeClass('disabled');

                if ($prevSlide.prev().not('.hidden').length) {
                    $prevSlide.prev().addClass('prev');
                    $sliderPrevButton.removeClass('disabled');
                }
                else {
                    $sliderPrevButton.addClass('disabled');
                }
            }
            else if ($nextSlide.length) {
                $slides.removeClass('prev current next');
                $nextSlide.addClass('current');
                $currentSlide.addClass('prev');
                $sliderPrevButton.removeClass('disabled');

                if ($nextSlide.next().not('.hidden').length) {
                    $nextSlide.next().addClass('next');
                    $sliderNextButton.removeClass('disabled');
                }
                else {
                    $sliderNextButton.addClass('disabled');
                }
            }
        });

        if (onSizeExceed) {
            dlmanager.setBrowserWarningClasses('.megasync-bottom-warning', $overlay, dlStateError);
        }

        $('.big-button.download-megasync', $overlay).rebind('click', function() {
            if (typeof megasync === 'undefined') {
                console.error('Failed to load megasync.js');
            }
            else {
                if (typeof dlpage_ph === 'string') {
                    megasync.download(dlpage_ph, dlpage_key);
                }
                else {
                    open(megasync.getMegaSyncUrl() || (getAppBaseUrl() + '#sync'));
                }
            }

            return false;
        });

        $('.megasync-info-txt a', $overlay).rebind('click', function() {
            hideOverlay();
            loadSubPage('pro');
        });

        $('.megasync-close, .fm-dialog-close', $overlay).rebind('click', hideOverlay);

        $body.rebind('keyup.msd', function(e) {
            if (e.keyCode === 27) {
                hideOverlay();
            }
        });

        $('a.clickurl', $overlay).rebind('click', function() {
            open(this.href);
            return false;
        });
    }
};

/** @name dlmanager.LMT_ISPRO */
/** @name dlmanager.LMT_ISREGISTERED */
/** @name dlmanager.LMT_HASACHIEVEMENTS */
makeEnum(['ISREGISTERED', 'ISPRO', 'HASACHIEVEMENTS'], 'LMT_', dlmanager);

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

DownloadQueue.prototype.push = function() {
    var pos = Array.prototype.push.apply(this, arguments);
    var id = pos - 1;
    var dl = this[id];
    var dl_id = dl.ph || dl.id;
    var dl_key = dl.key;
    var dlIO;

    if (dl.zipid) {
        if (!Zips[dl.zipid]) {
            Zips[dl.zipid] = new ZipWriter(dl.zipid, dl);
        }
        dlIO = Zips[dl.zipid].addEntryFile(dl);
    }
    else {
        if (dl.preview || Math.min(MemoryIO.fileSizeLimit, 90 * 1048576) > dl.size) {
            dlIO = new MemoryIO(dl_id, dl);
        }
        else {
            dlIO = new dlMethod(dl_id, dl);
        }
    }

    dl.aes = new sjcl.cipher.aes([
        dl_key[0] ^ dl_key[4],
        dl_key[1] ^ dl_key[5],
        dl_key[2] ^ dl_key[6],
        dl_key[3] ^ dl_key[7]
    ]);
    dl.nonce = JSON.stringify([
        dl_key[0] ^ dl_key[4],
        dl_key[1] ^ dl_key[5],
        dl_key[2] ^ dl_key[6],
        dl_key[3] ^ dl_key[7], dl_key[4], dl_key[5]
    ]);

    dl.pos = id; // download position in the queue
    dl.dl_id = dl_id; // download id
    dl.io = dlIO;
    // Use IO object to keep in track of progress
    // and speed
    dl.io.progress = 0;
    dl.io.size = dl.size;
    dl.decrypter = 0;
    dl.n = M.getSafeName(dl.n);

    if (!dl.zipid) {
        dlmanager.dlWriter(dl);
    }
    else {
        dl.writer = dlIO;
    }
    Object.defineProperty(dl, 'hasResumeSupport', {value: dl.io.hasResumeSupport});

    dl.macs = Object.create(null);

    dlQueue.push(new ClassFile(dl));

    return pos;
};
