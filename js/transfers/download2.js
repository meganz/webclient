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
    dlResumeThreshold: 0x200000,
    fsExpiryThreshold: 172800,
    isDownloading: false,
    dlZipID: 0,
    gotHSTS: false,
    resumeInfoTag: 'dlrv2!',
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
            promise = M.getPersistentData(tag, true);
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

        dl.resumeInfo.macs = dl.macs;
        dl.resumeInfo.byteOffset = byteOffset;

        if (d) {
            this.logger.debug('setResumeInfo', this.getResumeInfoTag(dl), dl.resumeInfo, dl);
        }

        return M.setPersistentData(this.getResumeInfoTag(dl), dl.resumeInfo, true);
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
            || ua.details.brand === 'CriOS'
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
        else {
            reject(EACCESS);
        }
    }),

    /**
     * Initialize download
     * @param {ClassFile} file The class file instance
     * @param {Object} gres The API reply to the `g` request
     * @param {Object} resumeInfo Resumable info, if any
     * @returns {Promise}
     */
    initDownload: function(file, gres, resumeInfo) {
        'use strict';

        if (!(file instanceof ClassFile)) {
            return Promise.reject(EARGS);
        }
        if (!file.dl || !Object(file.dl.io).setCredentials) {
            return Promise.reject(EACCESS);
        }
        if (!gres || typeof gres !== 'object' || file.dl.size !== gres.s) {
            return Promise.reject(EFAILED);
        }
        if (file.dl.cancelled) {
            return Promise.reject(EEXPIRED);
        }
        const {dl} = file;
        const {promise} = mega;

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
        dl.macs = resumeInfo.macs || dl.macs || Object.create(null);
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
        const {dlQueue} = window;

        dlQueue.pause();
        delete dl.dlTicketData;
        dlmanager.dlGetUrl(dl, function(error, res, o) {
            if (error) {
                return later(this.newUrl.bind(this, dl));
            }
            dl.url = res.g;

            var changed = 0;
            for (var i = 0; i < dlQueue._queue.length; i++) {
                const e = dlQueue._queue[i][0];

                if (e.dl === dl) {
                    e.url = `${res.g}/${String(e.url).replace(/.+\//, '')}`;
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

    dlGetUrl: function DM_dlGetUrl(dl, callback) {
        'use strict';

        if (dl.byteOffset && dl.byteOffset === dl.size) {
            // Completed download.
            return callback(false, {s: dl.size, g: dl.url || 'https://localhost.save-file.mega.nz/dl/1234'});
        }

        const ctx = {
            object: dl,
            next: callback,
            dl_key: dl.key
        };

        if (typeof dl.dlTicketData === 'object') {

            return this.dlGetUrlDone(dl.dlTicketData, ctx);
        }
        this.preFetchDownloadTickets(dl.pos);

        return megaUtilsGFSFetch.getTicketData(dl)
            .then((res) => {

                this.dlGetUrlDone(res, ctx);

                return res;
            })
            .catch((ex) => {
                this.logger.error('Failed to retrieve download ticket.', ex, [dl]);
                callback(ex);
            });
    },

    preFetchDownloadTickets(index, limit, queue, space, ridge) {
        'use strict';

        index = index || 0;
        limit = limit || 7;
        queue = queue || dl_queue;
        space = space || 96 * 1024;
        ridge = ridge || limit << 3;

        if (d) {
            this.logger.info('prefetching download tickets...', index, limit, ridge, space, [queue]);
        }

        let c = 0;
        for (let i = index; queue[i]; ++i) {
            const dl = queue[i].dl || queue[i];

            if (!('dlTicketData' in dl) && dl.byteOffset !== dl.size) {

                ++c;
                megaUtilsGFSFetch.getTicketData(dl).catch(dump);

                if (!--ridge || dl.size > space && !--limit) {
                    break;
                }
            }
        }

        if (d) {
            this.logger.info('...queued %d download tickets.', c);
        }
    },

    _clearGp: function() {
        'use strict';
        for (const k in GlobalProgress) {
            if (k[0] !== 'u') {
                let chunk;
                const w = GlobalProgress[k].working;
                while ((chunk = w.pop())) {
                    let result = chunk.isCancelled();
                    if (!result) {
                        this.logger.error('Download chunk %s(%s) should have been cancelled itself.', k, chunk);
                    }
                }
            }
        }
    },

    abortAll: function DM_abort_all() {
        'use strict';
        const dlQueue = window.dlQueue;
        const abort = tryCatch(dl => {
            if (typeof dl.io.abort === "function") {
                if (d) {
                    dlmanager.logger.info('IO.abort', dl);
                }
                dl.io.abort("User cancelled");
            }
        }, ex => {
            dlmanager.logger.error(ex);
        });

        const destroy = function(task) {
            task = task[0];
            if (task instanceof ClassChunk && !task.isCancelled() && task.destroy) {
                task.destroy();
            }
        };

        for (let k = dl_queue.length; k--;) {
            const dl = dl_queue[k];
            if (dl.id) {
                if (!dl.cancelled) {
                    if (dl.hasResumeSupport) {
                        dlmanager.remResumeInfo(dl).dump();
                    }
                    abort(dl);
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
                if (dl.io instanceof MemoryIO) {
                    dl.io.abort();
                }
                dl_queue[k] = Object.freeze({});
            }
        }

        dlQueue._queue.forEach(destroy);
        Object.values(dlQueue._qpaused).forEach(destroy);

        this._clearGp();
        dlQueue._qpaused = {};
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
                dlmanager.abortAll();
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
                    this.logger.assert(result, 'Download chunk %s(%s) should have been cancelled itself.', gid, chunk);
                }
            }

            if (!this._multiAbort) {
                Soon(M.resetUploadDownload);
            }
        }
    },

    dlGetUrlDone: function DM_dlGetUrlDone(res, ctx) {
        'use strict';
        let error = res.e;
        const dl = ctx.object;

        if (!res.e) {
            const key = [
                ctx.dl_key[0] ^ ctx.dl_key[4],
                ctx.dl_key[1] ^ ctx.dl_key[5],
                ctx.dl_key[2] ^ ctx.dl_key[6],
                ctx.dl_key[3] ^ ctx.dl_key[7]
            ];
            const attr = dec_attr(base64_to_ab(res.at), key);

            if (typeof attr === 'object' && typeof attr.n === 'string') {
                const minSize = 1e3;

                if (d) {
                    console.assert(res.s > minSize || !ctx.object.preview, 'What are we previewing?');
                }

                if (page !== 'download'
                    && (
                        !res.fa
                        || !String(res.fa).includes(':0*')
                        || !String(res.fa).includes(':1*')
                        || ctx.object.preview === -1
                    )
                    && res.s > minSize
                    && !sessionStorage.gOOMtrap) {

                    const image = is_image(attr.n);
                    const audio = !image && is_audio(attr.n);
                    const video = !audio && is_video(attr.n);
                    const limit = 96 * 1048576;

                    if (res.s < limit && (image || audio) || video) {
                        if (d) {
                            this.logger.warn(
                                '[%s] Missing thumb/prev, will try to generate...', attr.n, [res], [attr]
                            );
                        }

                        tryCatch(() => {
                            Object.defineProperty(ctx.object, 'misThumbData', {
                                writable: true,
                                value: new ArrayBuffer(Math.min(res.s, limit))
                            });
                        }, () => {
                            sessionStorage.gOOMtrap = 1;
                        })();
                    }
                }

                // dlmanager.onNolongerOverquota();
                return ctx.next(false, res, attr, ctx.object);
            }
        }
        error = error < 0 && parseInt(error) || EKEY;

        dlmanager.dlReportStatus(dl, error);

        ctx.next(error || new Error("failed"));
    },

    onNolongerOverquota: function() {
        'use strict';

        dlmanager.isOverQuota = false;
        dlmanager.isOverFreeQuota = false;
        $('.limited-bandwidth-dialog button.js-close, .limited-bandwidth-dialog .fm-dialog-close').trigger('click');
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

    logDecryptionError: function(dl, skipped) {
        'use strict';

        if (dl && Array.isArray(dl.url)) {
            // Decryption error from direct CloudRAID download

            var str = "";
            if (dl.cloudRaidSettings) {
                str += "f:" + dl.cloudRaidSettings.onFails;
                str += " t:" + dl.cloudRaidSettings.timeouts;
                str += " sg:" + dl.cloudRaidSettings.startglitches;
                str += " tmf:" + dl.cloudRaidSettings.toomanyfails;
            }

            eventlog(99720, JSON.stringify([3, dl && dl.id, str, skipped ? 1 : 0]));
        }
        else if (String(dl && dl.url).length > 256) {
            // Decryption error from proxied CloudRAID download

            eventlog(99706, JSON.stringify([2, dl && dl.id, skipped ? 1 : 0]));
        }
        else {
            eventlog(99711, JSON.stringify([2, dl && dl.id, skipped ? 1 : 0]));
        }
    },

    dlReportStatus: function DM_reportstatus(dl, code) {
        this.logger.warn('dlReportStatus', code, this.getGID(dl), dl);

        if (dl) {
            dl.lasterror = code;
            dl.onDownloadError(dl, code);
        }

        var eekey = code === EKEY;
        if (eekey || code === EACCESS || code === ETOOMANY || code === ENOENT) {
            // TODO: Check if other codes should raise abort()

            later(() => {
                dlmanager.abort(dl, eekey);
            });

            if (M.chat) {
                window.toaster.main.hideAll().then(() => {
                    showToast('download', eekey ? l[24] : l[20228]);
                });
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
            this.logDecryptionError(dl);
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
        var dl_key = file.key;

        if (!this.verifyIntegrity(file)) {
            return false;
        }

        if (file.misThumbData) {
            var options = {
                onPreviewRetry: file.preview === -1
            };
            if (!file.zipid) {
                options.raw = is_rawimage(file.n) || mThumbHandler.has(file.n);
            }
            createnodethumbnail(
                file.id,
                new sjcl.cipher.aes([
                    dl_key[0] ^ dl_key[4],
                    dl_key[1] ^ dl_key[5],
                    dl_key[2] ^ dl_key[6],
                    dl_key[3] ^ dl_key[7]
                ]),
                ++ulmanager.ulFaId,
                file.misThumbData,
                options
            );
            file.misThumbData = false;
        }

        return true;
    },

    /** compute final MAC from block MACs, allow for EOF chunk race gaps */
    verifyIntegrity: function(dl) {
        'use strict';
        const match = (mac) => dl.key[6] === (mac[0] ^ mac[1]) && dl.key[7] === (mac[2] ^ mac[3]);
        const macs = Object.keys(dl.macs).map(Number).sort((a, b) => a - b).map(v => dl.macs[v]);
        const aes = new sjcl.cipher.aes([
            dl.key[0] ^ dl.key[4], dl.key[1] ^ dl.key[5], dl.key[2] ^ dl.key[6], dl.key[3] ^ dl.key[7]
        ]);

        let mac = condenseMacs(macs, aes);

        // normal case, correct file, correct mac
        if (match(mac)) {
            return true;
        }

        // up to two connections lost the race, up to 32MB (ie chunks) each
        const end = macs.length;
        const max = Math.min(32 * 2, end);
        const gap = (macs, gapStart, gapEnd) => {
            let mac = [0, 0, 0, 0];

            for (let i = 0; i < macs.length; ++i) {
                if (i < gapStart || i >= gapEnd) {
                    let mblk = macs[i];

                    for (let j = 0; j < mblk.length; j += 4) {
                        mac[0] ^= mblk[j];
                        mac[1] ^= mblk[j + 1];
                        mac[2] ^= mblk[j + 2];
                        mac[3] ^= mblk[j + 3];

                        mac = aes.encrypt(mac);
                    }
                }
            }
            return mac;
        };

        // most likely - a single connection gap (possibly two combined)
        for (let countBack = 1; countBack <= max; ++countBack) {
            const start1 = end - countBack;

            for (let len1 = 1; len1 <= 64 && start1 + len1 <= end; ++len1) {
                mac = gap(macs, start1, start1 + len1);

                if (match(mac)) {
                    if (d) {
                        this.logger.warn(dl.owner + ' Resolved MAC Gap %d-%d/%d', start1, start1 + len1, end);
                    }
                    eventlog(99739);
                    return true;
                }
            }
        }

        return false;
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

            var abLen = task.data.byteLength;
            var ready = function _onWriterReady() {
                if (dl.cancelled || oIsFrozen(dl.writer)) {
                    if (d) {
                        logger.debug('Download canceled while writing to disk...', dl.cancelled, [dl]);
                    }
                    return;
                }
                dl.writer.pos += abLen;

                if (dl.misThumbData && task.offset + abLen <= dl.misThumbData.byteLength) {
                    new Uint8Array(
                        dl.misThumbData,
                        task.offset,
                        abLen
                    ).set(task.data);
                }

                if (dlmanager.dlResumeThreshold > dl.size) {

                    return finish_write(task, done);
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
        // $('.limited-bandwidth-dialog button.js-close').trigger('click');

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
            var $dtb = $('.download.download-page');
            $dtb.removeClass('stream-overquota overquota');
            $('.download.over-transfer-quota', $dtb).addClass('hidden');
            $(window).trigger('resize');
        }
        else if (ids.length) {
            if (is_mobile) {
                mega.ui.sheet.hide();
                mobile.downloadOverlay.downloadTransfer.resetTransfer();
            }
            else {
                resetOverQuotaTransfers(ids);
            }
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

    _onOverQuotaAttemptRetry: function(sid) {
        'use strict';

        if (!this.onOverquotaWithAchievements) {
            if (this.isOverQuota) {
                delay.cancel('overquota:uqft');

                if (this.isOverFreeQuota) {
                    this._onQuotaRetry(true, sid);
                }
                else {
                    this.uqFastTrack = !Object(u_attr).p;
                    delay('overquota:uqft', this._overquotaInfo.bind(this), 900);
                }
            }

            if (typeof this.onLimitedBandwidth === 'function') {
                this.onLimitedBandwidth();
            }
        }
    },

    _overquotaInfo: function() {
        'use strict';

        const onQuotaInfo = (res) => {
            const $dialog = $('.limited-bandwidth-dialog', 'body');

            let timeLeft = 3600;
            if (u_type > 2 && u_attr.p) {
                timeLeft = (M.account.expiry || 0) - unixtime();
                timeLeft = timeLeft > 0 ? timeLeft : 0;
            }
            else if (Object(res.tah).length) {

                let add = 1;
                // let size = 0;

                timeLeft = 3600 - ((res.bt | 0) % 3600);

                for (let i = 0; i < res.tah.length; i++) {
                    // size += res.tah[i];

                    if (res.tah[i]) {
                        add = 0;
                    }
                    else if (add) {
                        timeLeft += 3600;
                    }
                }
            }

            clearInterval(this._overQuotaTimeLeftTick);
            if (timeLeft < 3600 * 24) {
                delay('overquota:retry', () => this._onQuotaRetry(), timeLeft * 1000);
            }

            let $dlPageCountdown = $('.download.transfer-overquota-txt', 'body')
                .text(String(l[7100]).replace('%1', ''));

            if (!$dlPageCountdown.is(':visible')) {
                $dlPageCountdown = null;
            }

            this._overquotaClickListeners($dialog);
            let lastCheck = Date.now();

            if ($dialog.is(':visible') || $dlPageCountdown) {
                const $countdown = $('.countdown', $dialog).removeClass('hidden');
                const tick = () => {
                    const curTime = Date.now();
                    if (lastCheck + 1000 < curTime) {
                        // Convert ms to s and remove difference from remaining
                        timeLeft -= Math.floor((curTime - lastCheck) / 1000);
                        if (timeLeft < 3600 * 24) {
                            delay('overquota:retry', () => this._onQuotaRetry(), timeLeft * 1000);
                        }
                    }
                    lastCheck = curTime;
                    const time = secondsToTimeLong(timeLeft--);

                    if (time) {
                        $countdown.safeHTML(time);
                        $countdown.removeClass('hidden');

                        if ($dlPageCountdown) {
                            const html = `<span class="countdown">${secondsToTimeLong(timeLeft)}</span>`;
                            $dlPageCountdown.safeHTML(escapeHTML(l[7100]).replace('%1', html));
                        }
                    }
                    else {
                        $countdown.text('');
                        $countdown.addClass('hidden');

                        if ($dlPageCountdown) {
                            $dlPageCountdown.text(String(l[7100]).replace('%1', ''));
                        }
                        clearInterval(dlmanager._overQuotaTimeLeftTick);
                    }
                };

                tick();
                this._overQuotaTimeLeftTick = setInterval(tick, 1000);
            }
        };

        api.req({a: 'uq', xfer: 1}, {cache: -10}).then(({result: res}) => {
            delay('overquotainfo:reply.success', () => {
                if (typeof res === "number") {
                    // Error, just keep retrying
                    onIdle(() => this._overquotaInfo());
                    return;
                }

                // XXX: replaced uqFastTrack usage by directly checking for pro flag ...
                if (this.onOverQuotaProClicked && u_type) {
                    // The user loged/registered in another tab, poll the uq command every
                    // 30 seconds until we find a pro status and then retry with fresh download

                    const proStatus = res.mxfer;
                    this.logger.debug('overquota:proStatus', proStatus);

                    delay('overquota:uqft', () => this._overquotaInfo(), 30000);
                }

                onQuotaInfo(res);
            });
        }).catch((ex) => {
            if (d) {
                dlmanager.logger.warn('_overquotaInfo', ex);
            }

            delay('overquotainfo:reply.error', () => this._overquotaInfo(), 2e3);
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
        }
        else {

            $('.msg-overquota', $dialog).removeClass('hidden');
            $('.msg-prewarning', $dialog).addClass('hidden');

            $('.continue', $dialog).attr('style', 'display:none');

            $('.video-theatre-mode:visible').addClass('paused');

            $('button.js-close, .fm-dialog-close', $dialog).add($('.fm-dialog-overlay'))
                .rebind('click.closeOverQuotaDialog', function() {

                    unbindEvents();
                });

            if (page === 'download') {
                var $dtb = $('.download.download-page');

                $('.see-our-plans', $dtb).rebind('click', onclick);

                $('.download.over-transfer-quota', $dtb).removeClass('hidden');
                $('.resume-download', $dtb).removeClass('hidden');
                $dtb.addClass('stream-overquota');
                $(window).trigger('resize');
            }
        }

        $('.upgrade, .mobile.upgrade-to-pro, .plan-button', $dialog).rebind('click', onclick);

        $('.bottom-tips a', $dialog).rebind('click', function() {
            open(l.mega_help_host + '/plans-storage/space-storage/transfer-quota', '_blank', 'noopener,noreferrer');
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
                $('button.login', $oqbbl).addClass('hidden');
            }
            else {
                $('button.login', $oqbbl).removeClass('hidden').rebind('click', function() {
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

            $('button.create-account', $oqbbl).rebind('click', showOverQuotaRegisterDialog);
        }

        $dialog.addClass('hidden-bottom');
        if (flags & this.LMT_HASACHIEVEMENTS || $dialog.hasClass('gotEFQb')) {
            $dialog.removeClass('hidden-bottom');
        }
        else if (!(flags & this.LMT_ISREGISTERED)) {
            var $pan = $('.not-logged.no-achievements', $dialog);

            if ($pan.length && !$pan.hasClass('flag-pcset')) {
                $pan.addClass('flag-pcset');

                api.req({a: 'efqb'}).then(({result: val}) => {
                    if (val) {
                        $dialog.removeClass('hidden-bottom').addClass('gotEFQb');
                        $pan.text(String($pan.text()).replace('10%', `${val | 0}%`));
                    }
                });
            }
        }

        if (flags & this.LMT_HASACHIEVEMENTS) {
            $dialog.addClass('achievements');
            localStorage.gotOverquotaWithAchievements = 1;
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
                        .find('button.js-close, .fm-dialog-close')
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

                // Initialise scrolling
                if (!is_touch()) {
                    if ($scrollBlock.is('.ps')) {
                        Ps.update($scrollBlock[0]);
                    }
                    else {
                        Ps.initialize($scrollBlock[0]);
                    }
                }
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
                $('.continue, .continue-download, button.js-close, .fm-dialog-close', $dialog).off('click');
                $('.upgrade, .pricing-page.plan, .mobile.upgrade-to-pro', $dialog).off('click');

                if ($.dialog === 'download-pre-warning') {
                    $.dialog = false;
                }
                closeDialog();
                Soon(callback);
                callback = $dialog = undefined;

                if (is_mobile) {
                    tryCatch(() => mobile.overBandwidthQuota.closeSheet())();
                }
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

        if (is_mobile) {
            mobile.overBandwidthQuota.show(false);
            return;
        }

        M.safeShowDialog('download-pre-warning', () => {
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
        var $dialog = $('.limited-bandwidth-dialog');

        $(document).fullScreen(false);
        this._setOverQuotaState(dlTask);

        if (is_mobile) {
            mobile.overBandwidthQuota.show(true);
            return;
        }

        if ($dialog.is(':visible') && !$dialog.hasClass('uploads')) {
            this.logger.info('showOverQuotaDialog', 'visible already.');
            return;
        }

        if ($('.achievements-list-dialog').is(':visible')) {
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
                    var tfsQuotaLimit = bytesToSize(account.bw, 0).split('\u00A0');
                    var tfsQuotaUsed = (account.downbw_used + account.servbw_used);
                    var perc = Math.min(100, Math.ceil(tfsQuotaUsed * 100 / account.bw));

                    $('.chart.data .size-txt', $dialog).text(bytesToSize(tfsQuotaUsed, 0));
                    $('.chart.data .pecents-txt', $dialog).text(tfsQuotaLimit[0]);
                    $('.chart.data .gb-txt', $dialog).text(tfsQuotaLimit[1]);
                    $('.chart.data .used', $dialog).text(bytesToSize(tfsQuotaUsed, 0));
                    $('.chart.data .total', $dialog).text(`${tfsQuotaLimit[0]} ${tfsQuotaLimit[1]}`);
                    $('.fm-account-blocks.bandwidth', $dialog).removeClass('no-percs');
                    $('.chart .perc-txt', $dialog).text(perc + '%');
                    $('.chart.body .progressbars', $dialog).addClass('exceeded');
                    $('.left-chart span', $dialog).css('transform', 'rotate(180deg)');
                    $('.right-chart span', $dialog).css('transform', 'rotate(180deg)');

                    // if they granted quota to other users
                    if (account.servbw_limit > 0) {
                        $dialog.addClass('slider');

                        var $slider = $('.bandwidth-slider', $dialog).slider({
                            min: 0, max: 100, range: 'min', value: account.servbw_limit,
                            change: function(e, ui) {
                                if (ui.value < account.servbw_limit) {
                                    // retry download if less quota was chosen...
                                    loadingDialog.show();
                                    api.req({a: 'up', srvratio: ui.value})
                                        .catch(dump)
                                        .finally(() => {
                                            loadingDialog.hide();
                                            dlmanager._onQuotaRetry(true);
                                        });
                                }
                            }
                        });
                        $('.ui-slider-handle', $slider).addClass('sprite-fm-mono icon-arrow-left ' +
                            'sprite-fm-mono-after icon-arrow-right-after');
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
                $dialog.off('dialog-closed');
                $('button.js-close, .fm-dialog-close', $dialog).off('click.quota');
                closeDialog();
                return false;
            };
            dlmanager._overquotaInfo();
            dlmanager._overquotaClickListeners($dialog, flags);

            $('.fm-dialog-overlay').rebind('click.dloverq', doCloseModal);

            $dialog
                .addClass('exceeded')
                .removeClass('hidden')
                .rebind('dialog-closed', doCloseModal)
                .find('button.js-close, .fm-dialog-close')
                .rebind('click.quota', doCloseModal);

            // Load the membership plans
            dlmanager.setPlanPrices($dialog);

            if (window.pfcol) {
                eventlog(99956);
            }
            eventlog(99648);

            if (asyncTaskID) {
                loadingDialog.show();
                mBroadcaster.once(asyncTaskID, function() {
                    loadingDialog.hide();
                });
            }

            return $dialog;
        });
    },

    showNothingToDownloadDialog: function DM_noDownloadDialog(callback) {
        'use strict';

        loadingDialog.hide();
        msgDialog('warningb', '', l.empty_download_dlg_title, l.empty_download_dlg_text, callback);
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
                            $('.megasync-close, button.js-close, .fm-dialog-close', $dialog).click();

                            msgDialog('warningb', l[882], l[7157], 0, async(yes) => {
                                if (yes) {
                                    loadingDialog.show();
                                    await Promise.allSettled([eventlog(99682), M.clearFileSystemStorage()]);
                                    location.reload(true);
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

        $('.mega-button', $elm).rebind('click', function() {
            if (typeof megasync === 'undefined') {
                console.error('Failed to load megasync.js');
            }
            else {
                if (typeof dlpage_ph === 'string') {
                    megasync.download(dlpage_ph, dlpage_key);
                }
                else {
                    window.open(
                        megasync.getMegaSyncUrl() || 'https://mega.io/desktop',
                        '_blank',
                        'noopener,noreferrer'
                    );
                }
            }
            if ($('.download.download-page').hasClass('video')) {
                $elm.removeClass('visible');
            }
        });

        $('button.js-close, .fm-dialog-close', $elm).rebind('click', function() {
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
        var $sliderControl = $('button.megasync-slider', $overlay);
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

        $('button.download-megasync', $overlay).rebind('click', function() {
            if (typeof megasync === 'undefined') {
                console.error('Failed to load megasync.js');
            }
            else if (typeof dlpage_ph === 'string' && megasync.getUserOS() !== 'linux') {
                megasync.download(dlpage_ph, dlpage_key);
            }
            else {
                window.open(
                    megasync.getMegaSyncUrl() || 'https://mega.io/desktop',
                    '_blank',
                    'noopener,noreferrer'
                );
                hideOverlay();
            }

            return false;
        });

        $('.megasync-info-txt a', $overlay).rebind('click', function() {
            hideOverlay();
            loadSubPage('pro');
        });

        $('.megasync-close, button.js-close, .fm-dialog-close', $overlay).rebind('click', hideOverlay);

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
            // fm_tfsorderupd(); check commit history if we ever want to bring this back (with a good revamp in place)

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

mBroadcaster.once('startMega', () => {
    'use strict';

    api.observe('setsid', (sid) => {
        delay('overquota:retry', () => dlmanager._onOverQuotaAttemptRetry(sid));
    });
});
