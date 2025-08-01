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

/* eslint-disable no-use-before-define */
var uldl_hold = false;

var ulmanager = {
    ulFaId: 0,
    ulSize: 0,
    ulXferPut: null,
    ulDefConcurrency: 8,
    ulIDToNode: Object.create(null),
    ulEventData: Object.create(null),
    isUploading: false,
    ulSetupQueue: false,
    ulStartingPhase: false,
    ulCompletingPhase: Object.create(null),
    ulOverStorageQuota: false,
    ulOverStorageQueue: [],
    ulFinalizeQueue: [],
    ulBlockSize: 131072,
    ulBlockExtraSize: 1048576,
    ulMaxFastTrackSize: 1048576 * 3,
    ulMaxConcurrentSize: 1048576 * 10,
    logger: MegaLogger.getLogger('ulmanager'),

    // Errors megad might return while uploading
    ulErrorMap: Object.freeze({
        "EAGAIN":    -3,
        "EFAILED":   -4,
        "ENOTFOUND": -5,
        "ETOOMANY":  -6,
        "ERANGE":    -7,
        "EEXPIRED":  -8,
        "EKEY":     -14
    }),

    ulStrError: function UM_ulStrError(code) {
        code = parseInt(code);
        var keys = Object.keys(this.ulErrorMap);
        var values = obj_values(this.ulErrorMap);
        return keys[values.indexOf(code)] || code;
    },

    ulHideOverStorageQuotaDialog: function() {
        'use strict';

        $(window).unbind('resize.overQuotaDialog');
        $('.fm-dialog-overlay', 'body').unbind('click.closeOverQuotaDialog');
        window.closeDialog();
    },

    ulShowOverStorageQuotaDialog: function(aFileUpload) {
        'use strict';

        var $dialog = $('.limited-bandwidth-dialog');

        ulQueue.pause();
        this.ulOverStorageQuota = true;

        // clear completed uploads and set over quota for the rest.
        if ($.removeTransferItems) {
            $.removeTransferItems();
        }
        for (var kk = 0; kk < ul_queue.length; kk++) {
            onUploadError(ul_queue[kk], l[1010], l[1010], null, true);
        }

        // Store the entry whose upload ticket failed to resume it later
        if (aFileUpload) {
            this.ulOverStorageQueue.push(aFileUpload);
        }

        // Inform user that upload file request is not available anymore
        if (is_megadrop) {
            mBroadcaster.sendMessage('FileRequest:overquota');
            return; // Disable quota dialog
        }

        if (is_mobile) {
            mobile.overStorageQuota.show();
            return;
        }

        M.safeShowDialog('upload-overquota', () => {
            // Hide loading dialog as from new text file
            loadingDialog.phide();

            $dialog.removeClass('achievements pro3 pro pro-mini no-cards').addClass('uploads exceeded');
            $('.header-before-icon.exceeded', $dialog).text(l[19135]);
            $('.pricing-page.plan .plan-button', $dialog).rebind('click', function() {
                eventlog(99700, true);
                sessionStorage.fromOverquotaPeriod = $(this).parent().data('period');
                open(getAppBaseUrl() + '#propay_' + $(this).closest('.plan').data('payment'));
                return false;
            });

            $('button.js-close, .fm-dialog-close', $dialog).add($('.fm-dialog-overlay'))
                .rebind('click.closeOverQuotaDialog', () => {

                    ulmanager.ulHideOverStorageQuotaDialog();
                });

            // Load the membership plans
            dlmanager.setPlanPrices($dialog);

            eventlog(99699, true);
            return $dialog;
        });
    },

    ulShowBusAdminVerifyDialog(upload) {
        'use strict';
        if (is_mobile) {
            onIdle(() => msgDialog('error', '', api_strerror(ESUBUSERKEYMISSING), l.err_sub_user_key_miss_txt));
        }
        else {
            M.require('businessAcc_js', 'businessAccUI_js').done(() => {
                const businessUI = new BusinessAccountUI();
                businessUI.showVerifyDialog();
            });
        }
        if (upload) {
            onUploadError(upload, api_strerror(ESUBUSERKEYMISSING));
        }
    },

    ulResumeOverStorageQuotaState: function() {
        'use strict';

        if ($('.mega-dialog.limited-bandwidth-dialog').is(':visible')) {

            ulmanager.ulHideOverStorageQuotaDialog();
        }

        ulQueue.resume();
        this.ulOverStorageQuota = false;

        if (!this.ulOverStorageQueue.length) {
            if (d) {
                ulmanager.logger.info('ulResumeOverStorageQuotaState: Nothing to resume.');
            }
        }
        else {
            // clear completed uploads and remove over quota state for the rest.
            if ($.removeTransferItems) {
                $.removeTransferItems();
            }
            $("tr[id^='ul_']").removeClass('transfer-error').find('.transfer-status').text(l[7227]);

            this.ulOverStorageQueue.forEach(function(aFileUpload) {
                var ul = aFileUpload.ul;

                if (d) {
                    ulmanager.logger.info('Attempting to resume ' + aFileUpload, [ul], aFileUpload);
                }

                if (ul) {
                    ul.uReqFired = null;
                    ulmanager.ulStart(aFileUpload);
                }
                else if (oIsFrozen(aFileUpload)) {
                    console.warn('Frozen upload while resuming...', aFileUpload);
                }
                else {
                    // re-fire the putnodes api request for which we got the -17
                    console.assert(Object(aFileUpload[0]).a === 'p', 'check this...');
                    ulmanager.ulComplete(...aFileUpload);
                }
            });
        }

        this.ulOverStorageQueue = [];
    },

    getGID: function UM_GetGID(ul) {
        return 'ul_' + (ul && ul.id);
    },

    getEventDataByHandle: function(h) {
        'use strict';

        for (var id in this.ulEventData) {
            if (this.ulEventData[id].h === h) {
                return this.ulEventData[id];
            }
        }

        return false;
    },

    getUploadByID: function(id) {
        'use strict';

        var queue = ul_queue.filter(isQueueActive);
        for (var i = queue.length; i--;) {
            var q = queue[i];

            if (q.id === id || this.getGID(q) === id) {
                return q;
            }
        }

        return false;
    },

    isUploadActive: function(id) {
        'use strict';
        var gid = typeof id === 'object' ? this.getGID(id) : id;
        return document.getElementById(gid) || this.getUploadByID(gid).starttime > 0;
    },

    /**
     * Wait for an upload to finish.
     * @param {Number} aUploadID The unique upload identifier.
     * @return {MegaPromise}
     */
    onUploadFinished: function(aUploadID) {
        'use strict';
        return new Promise((resolve, reject) => {
            var _ev1;
            var _ev2;
            var _ev3;
            if (typeof aUploadID !== 'number' || aUploadID < 8001) {
                return reject(EARGS);
            }
            var queue = ul_queue.filter(isQueueActive);
            var i = queue.length;

            while (i--) {
                if (queue[i].id === aUploadID) {
                    break;
                }
            }

            if (i < 0) {
                // there is no such upload in the queue
                return reject(ENOENT);
            }

            var done = function(id, result) {
                if (id === aUploadID) {
                    mBroadcaster.removeListener(_ev1);
                    mBroadcaster.removeListener(_ev2);
                    mBroadcaster.removeListener(_ev3);

                    // result will be either the node handle for the new uploaded file or an error
                    resolve(result);
                }
            };

            _ev1 = mBroadcaster.addListener('upload:error', done);
            _ev2 = mBroadcaster.addListener('upload:abort', done);
            _ev3 = mBroadcaster.addListener('upload:completion', done);
        });
    },

    /**
     * Hold up an upload until another have finished, i.e. because we have to upload it as a version
     * @param {File} aFile The upload file instance
     * @param {Number} aUploadID The upload ID to wait to finish.
     * @param {Boolean} [aVersion] Whether we're actually creating a version.
     */
    holdUntilUploadFinished: function(aFile, aUploadID, aVersion) {
        'use strict';
        var promise = new MegaPromise();
        var logger = d && new MegaLogger('ulhold[' + aUploadID + '>' + aFile.id + ']', null, this.logger);

        if (d) {
            logger.debug('Waiting for upload %d to finish...', aUploadID, [aFile]);
        }

        this.onUploadFinished(aUploadID).always((h) => {
            if (d) {
                logger.debug('Upload %s finished...', aUploadID, h);
            }

            if (aVersion) {
                if (typeof h !== 'string' || !M.d[h]) {
                    var n = fileconflict.getNodeByName(aFile.target, aFile.name);
                    h = n && n.h;

                    if (d) {
                        logger.debug('Seek node gave %s', h, M.getNodeByHandle(h));
                    }
                }

                if (h) {
                    aFile._replaces = h;
                }
            }

            if (d) {
                logger.debug('Starting upload %s...', aFile.id, aFile._replaces, [aFile]);
            }
            ul_queue.push(aFile);
            promise.resolve(aFile, h);
        });

        return promise;
    },

    abortAll: function() {
        'use strict';
        const ulQueue = window.ulQueue;
        const fileUploadInstances = [];

        const destroy = function(task) {
            if ((task = task && task[0] || task || !1).destroy) {
                task.destroy(-0xbeef);
            }
        };

        const abort = (ul, gid, idx) => {
            if (d) {
                ulmanager.logger.info('Aborting ' + gid, ul.name);
            }
            ul.abort = true;
            fileUploadInstances.push([ul.owner, idx]);

            const gp = GlobalProgress[gid];
            if (gp && !gp.paused) {
                gp.paused = true;

                let chunk;
                while ((chunk = gp.working.pop())) {
                    chunk.abort();
                    if (array.remove(ulQueue._pending, chunk, 1)) {
                        console.assert(--ulQueue._running > -1, 'Queue inconsistency on pause[abort]');
                    }
                }
            }
        };

        ulQueue.pause();

        for (let i = ul_queue.length; i--;) {
            const ul = ul_queue[i];
            if (ul.id) {
                const gid = 'ul_' + ul.id;

                if (ulmanager.ulCompletingPhase[gid]) {
                    if (d) {
                        ulmanager.logger.debug('Not aborting %s, it is completing...', gid, ul);
                    }
                }
                else {
                    abort(ul, gid, i);
                }
            }
        }

        ulQueue._queue.forEach(destroy);
        Object.values(ulQueue._qpaused).forEach(destroy);

        for (let i = fileUploadInstances.length; i--;) {
            const [ul, idx] = fileUploadInstances[i];

            if (ul) {
                if (ul.file) {
                    mBroadcaster.sendMessage('upload:abort', ul.file.id, -0xDEADBEEF);
                }
                ul.destroy(-0xbeef);
            }
            ul_queue[idx] = Object.freeze({});
        }

        ulQueue._queue = [];
        ulQueue._qpaused = {};
        ulQueue.resume();
    },

    abort: function UM_abort(gid) {
        'use strict';

        if (gid === null || Array.isArray(gid)) {
            this._multiAbort = 1;

            if (gid) {
                gid.forEach(this.abort.bind(this));
            }
            else {
                this.ulSetupQueue = false;
                M.tfsdomqueue = Object.create(null);
                this.abortAll();
            }

            delete this._multiAbort;
            Soon(M.resetUploadDownload);
        }
        else {
            if (typeof gid === 'object') {
                gid = this.getGID(gid);
            }
            else if (gid[0] !== 'u') {
                return;
            }

            var l = ul_queue.length;
            var FUs = [];
            while (l--) {
                var ul = ul_queue[l];

                if (gid === this.getGID(ul)) {
                    if (ulmanager.ulCompletingPhase[gid]) {
                        if (d) {
                            ulmanager.logger.debug('Not aborting %s, it is completing...', gid, ul);
                        }
                        continue;
                    }
                    if (d) {
                        ulmanager.logger.info('Aborting ' + gid, ul.name);
                    }

                    ul.abort = true;
                    FUs.push([ul.owner, l]);
                }
            }

            ulQueue.pause(gid);
            ulQueue.filter(gid);
            FUs.map(function(o) {
                var ul = o[0];
                var idx = o[1];

                if (ul) {
                    if (ul.file) {
                        mBroadcaster.sendMessage('upload:abort', ul.file.id, -0xDEADBEEF);
                    }
                    ul.destroy();
                }
                ul_queue[idx] = Object.freeze({});
            });
            if (!this._multiAbort) {
                Soon(M.resetUploadDownload);
            }
        }
    },

    restart: function UM_restart(file, reason, xhr) {
        // Upload failed - restarting...
        onUploadError(file, l[20917], reason, xhr);

        // reschedule
        ulQueue.poke(file);
    },

    retry: function UM_retry(file, chunk, reason, xhr) {
        var start = chunk.start;
        var end = chunk.end;
        var cid = String(chunk);
        var altport = !chunk.altport;
        var suffix = chunk.suffix;
        var bytes = suffix && chunk.bytes;

        file.ul_failed = true;
        api_reportfailure(hostname(file.posturl), ulmanager.networkErrorCheck);

        // reschedule

        ulQueue.pause(); // Hmm..
        if (!file.__umRetries) {
            file.__umRetries = 1;
        }
        if (!file.__umRetryTimer) {
            file.__umRetryTimer = {};
        }
        var tid = ++file.__umRetries;
        file.__umRetryTimer[tid] = setTimeout(function() {
            // Could become frozen {} after this timeout.
            if (!file.id) {
                return;
            }

            var q = file.__umRetryTimer || {};
            delete q[tid];

            if (reason.indexOf('IO failed') === -1) {
                tid = --file.__umRetries;
            }

            if (tid < 34) {
                var newTask = new ChunkUpload(file, start, end, altport);
                if (suffix) {
                    newTask.suffix = suffix;
                    newTask.bytes = bytes;
                }
                ulQueue.pushFirst(newTask);
            }
            else {
                if (d) {
                    ulmanager.logger.error('Too many retries for ' + cid);
                }
                var fileName = htmlentities(file.name);
                var errorstr = reason.match(/"([^"]+)"/);

                if (errorstr) {
                    errorstr = errorstr.pop();
                }
                else {
                    errorstr = reason.substr(0, 50) + '...';
                }
                if (!file.ulSilent) {
                    $('#ul_' + file.id + ' .transfer-status').text(errorstr);
                }
                msgDialog('warninga', l[1309], l[1498] + ': ' + fileName, reason);
                ulmanager.abort(file);
            }
            if (!$.len(q)) {
                delete file.__umRetryTimer;
                ulQueue.resume();
            }
        }, 950 + Math.floor(Math.random() * 2e3));

        // "Upload failed - retrying"
        onUploadError(file, l[20918],
            reason.substr(0, 2) === 'IO' ? 'IO Failed' : reason,
            xhr);

        chunk.done(); /* release worker */
    },

    isReady: function UM_isReady(Task) /* unused */ {
        return !Task.file.paused || Task.__retry;
    },

    /**
     *  Check if the network is up!
     *
     *  This function is called when an error happen at the upload
     *  stage *and* it is anything *but* network issue.
     */
    networkErrorCheck: function UM_network_error_check() {
        var i = 0;
        var ul = {
            error: 0,
            retries: 0
        };
        var dl = {
            error: 0,
            retries: 0
        }

        for (i = 0; i < dl_queue.length; i++) {
            if (dl_queue[i] && dl_queue[i].dl_failed) {
                if (d) {
                    dlmanager.logger.info('Failed download:',
                        dl_queue[i].zipname || dl_queue[i].n,
                        'Retries: ' + dl_queue[i].retries, dl_queue[i].zipid);
                }
                dl.retries += dl_queue[i].retries;
                if (dl_queue[i].retries++ === 5) {
                    /**
                     *  The user has internet yet the download keeps failing
                     *  we request the server a new download url but unlike in upload
                     *  this is fine because we resume the download
                     */
                    dlmanager.newUrl(dl_queue[i]);
                    dl.retries = 0;
                }
                dl.error++;
            }
        }

        for (i = 0; i < ul_queue.length; i++) {
            if (ul_queue[i] && ul_queue[i].ul_failed) {
                ul.retries += ul_queue[i].retries;
                if (ul_queue[i].retries++ === 10) {
                    /**
                     *  Worst case ever. The client has internet *but*
                     *  this upload keeps failing in the last 10 minutes.
                     *
                     *  We request a new upload URL to the server, and the upload
                     *  starts from scratch
                     */
                    if (d) {
                        ulmanager.logger.error("restarting because it failed", ul_queue[i].retries, 'times', ul);
                    }
                    ulmanager.restart(ul_queue[i], 'peer-err');
                    ul_queue[i].retries = 0;
                }
                ul.error++;
            }
        }

        /**
         *  Check for error on upload and downloads
         *
         *  If we have many errors (average of 3 errors)
         *  we try to shrink the number of connections to the
         *  server to see if that fixes the problem
         */
        $([ul, dl]).each(function(i, k) {
                var ratio = k.retries / k.error;
                if (ratio > 0 && ratio % 8 === 0) {
                    // if we're failing in average for the 3rd time,
                    // lets shrink our upload queue size
                    if (d) {
                        var mng = (k === ul ? ulmanager : dlmanager);
                        mng.logger.warn(' --- SHRINKING --- ');
                    }
                    var queue = (k === ul ? ulQueue : dlQueue);
                    queue.shrink();
                }
            });
    },

    ulFinalize: function UM_ul_finalize(file, target) {
        if (d) {
            ulmanager.logger.info(file.name, "ul_finalize", file.target, target);
        }
        if (file.repair) {
            file.target = target = M.RubbishID;
        }
        target = target || file.target || M.RootID;

        ASSERT(file.filekey, "*** filekey is missing ***");

        var n = {
            name: file.name,
            hash: file.hash,
            k: file.filekey
        };

        if (d) {
            // if it's set but undefined, the file-conflict dialog failed to properly locate a file/node...
            console.assert(file._replaces || !("_replaces" in file), 'Unexpected file versioning state...');
        }

        if (file._replaces) {
            const r = M.getNodeByHandle(file._replaces);

            if (r.fav) {
                n.fav = r.fav;
            }
            if (r.sen) {
                n.sen = r.sen;
            }
            if (r.lbl) {
                n.lbl = r.lbl;
            }
            if (r.des) {
                n.des = r.des;
            }
            if (r.tags) {
                n.tags = r.tags;
            }
        }

        var req_type = 'p';
        var dir = target;

        // Put to public upload folder
        if (is_megadrop) {
            req_type = 'pp';
            target = mega.fileRequestUpload.getUploadPageOwnerHandle();
            dir = mega.fileRequestUpload.getUploadPagePuHandle();
        }
        else if (file.xput) {
            req_type = 'xp';
        }

        var req = {
            v: 3,
            a: req_type,
            t: dir,
            n: [{
                t: 0,
                h: file.response,
                a: ab_to_base64(crypto_makeattr(n)),
                k: req_type === 'xp' ? a32_to_base64(file.filekey) : target.length === 11
                    ? base64urlencode(encryptto(target, a32_to_str(file.filekey)))
                    : a32_to_base64(encrypt_key(u_k_aes, file.filekey))
            }],
            i: requesti
        };

        var ctx = {
            file: file,
            target: target,
            size: file.size,
            faid: file.faid,
            ul_queue_num: file.pos,
        };

        if (file._replaces) {
            req.n[0].ov = file._replaces;
        }
        if (file.faid) {
            req.n[0].fa = api_getfa(file.faid);
        }
        if (file.ddfa) {
            // fa from deduplication
            req.n[0].fa = file.ddfa;
        }

        if (req.t === M.InboxID && self.vw) {
            req.vw = 1;
        }

        queueMicrotask(() => {
            for (var k in M.tfsdomqueue) {
                if (k[0] === 'u') {
                    addToTransferTable(k, M.tfsdomqueue[k], 1);
                    delete M.tfsdomqueue[k];
                    break;
                }
            }
        });

        if (d) {
            ulmanager.logger.info("Completing upload for %s, into %s", file.name, target, req);
            console.assert(file.owner && file.owner.gid, 'No assoc owner..');
        }

        if (file.owner) {
            this.ulCompletingPhase[file.owner.gid] = Date.now();
        }

        if (this.ulFinalizeQueue.push([n, req, ctx]) > ulQueue.maxActiveTransfers || ulQueue.isFinalising()) {
            this.ulCompletePending();
        }
        else {
            delay('ul.finalize:dsp', () => this.ulCompletePending(), 4e3);
        }
    },

    ulGetPostURL: function UM_ul_get_posturl(File) {
        'use strict';
        return function(res, ctx) {

            // If cancelled
            if (!File.ul) {
                return;
            }

            if (!ul_queue[ctx.reqindex] || Object.isFrozen(ul_queue[ctx.reqindex])) {
                ulmanager.logger.warn(`Upload at ${ctx.reqindex} seems cancelled, but 'ul' did exist.`, res, ctx, File);
                return;
            }

            // If the response is that the user is over quota
            if (res === EOVERQUOTA || res === EGOINGOVERQUOTA) {

                // Show a warning popup
                ulmanager.ulShowOverStorageQuotaDialog(File, res);

                // Return early so it does not retry automatically and spam the API server with requests
                return false;
            }

            // If the response is that the business account is suspended
            if (res === EBUSINESSPASTDUE && page.substr(0, 11) === 'filerequest') {
                mBroadcaster.sendMessage('upload:error', File.ul.id, res);
                return false;
            }

            if (res === ESUBUSERKEYMISSING) {
                M.ulerror(ul_queue[ctx.reqindex], res);
                return false;
            }

            // Reset in case of a retry
            delete ul_queue[ctx.reqindex].posturl;

            if (typeof res === 'object') {
                if (typeof res.p === "string" && res.p.length > 0) {
                    ul_queue[ctx.reqindex].posturl = res.p;

                    if (ul_queue[ctx.reqindex].readyToStart) {
                        if (ctx.reqindex !== File.ul.pos) {
                            ulmanager.ulUpload(ul_queue[ctx.reqindex].readyToStart);
                        }
                        delete ul_queue[ctx.reqindex].readyToStart;
                    }
                }
            }

            if (ctx.reqindex === File.ul.pos) {
                if (ul_queue[ctx.reqindex].posturl) {
                    ulmanager.ulUpload(File);
                }
                else {
                    // Retry
                    ulmanager.ulStart(File);
                }
            }
        };
    },

    ulStart: function UM_ul_start(File) {
        'use strict';

        if (!File.file) {
            return false;
        }
        if (File.file.posturl) {
            return ulmanager.ulUpload(File);
        }
        var maxpf = 128 * 1048576;
        var next = ulmanager.ulGetPostURL(File);
        var total = 0;
        var len = ul_queue.length;
        var max = File.file.pos + Math.max(21, ulQueue.maxActiveTransfers >> 1);

        const ms = fmconfig.ul_maxSpeed | 0;
        const fire = (reqindex, payload) => {
            // @todo proper revamp..
            api.req(payload, {dedup: false})
                .always((res) => next(res.result || res, {reqindex}))
                .catch(reportError);
        };

        for (var i = File.file.pos; i < len && i < max && maxpf > 0; i++) {
            var cfile = ul_queue[i];
            if (!isQueueActive(cfile)) {
                continue;
            }
            if (cfile.uReqFired) {
                if (i === File.file.pos) {
                    cfile.readyToStart = File;
                }
                continue;
            }
            cfile.uReqFired = Date.now();
            var req = {
                a: 'u',
                v: 2,
                ssl: use_ssl,
                ms,
                s: cfile.size,
                r: cfile.retries,
                e: cfile.ul_lastreason,
            };
            if (File.file.ownerId) {
                req.t = File.file.ownerId;
            }
            fire(i, req);
            maxpf -= cfile.size;
            total++;
        }
        if (d) {
            ulmanager.logger.info('request urls for ', total, ' files');
        }
    },

    ulUpload: function UM_ul_upload(File) {
        var i;
        var file = File.file;

        if (file.repair) {
            var ul_key = file.repair;

            file.ul_key = [
                ul_key[0] ^ ul_key[4],
                ul_key[1] ^ ul_key[5],
                ul_key[2] ^ ul_key[6],
                ul_key[3] ^ ul_key[7],
                ul_key[4],
                ul_key[5]
            ];
        }
        else if (!file.ul_key) {
            file.ul_key = Array(6);
            // generate ul_key and nonce
            for (i = 6; i--;) {
                file.ul_key[i] = rand(0x100000000);
            }
        }

        file.ul_offsets = [];
        file.ul_lastProgressUpdate = 0;
        file.ul_macs = Object.create(null);
        file.ul_keyNonce = JSON.stringify(file.ul_key);
        file.ul_aes = new sjcl.cipher.aes([
            file.ul_key[0], file.ul_key[1], file.ul_key[2], file.ul_key[3]
        ]);

        if (file.size) {
            var pp;
            var p = 0;
            var tasks = Object.create(null);
            var ulBlockExtraSize = ulmanager.ulBlockExtraSize;
            //var boost = !mega.chrome || parseInt(ua.details.version) < 68;
			var boost = false;

            if (file.size > 0x1880000 && boost) {
                tasks[p] = new ChunkUpload(file, p, 0x480000);
                p += 0x480000;

                for (i = 2; i < 4; i++) {
                    tasks[p] = new ChunkUpload(file, p, i * 0x400000);
                    pp = p;
                    p += i * 0x400000;
                }

                ulBlockExtraSize = 16 * 1048576;
            }
            else {
                for (i = 1; i <= 8 && p < file.size - i * ulmanager.ulBlockSize; i++) {
                    tasks[p] = new ChunkUpload(file, p, i * ulmanager.ulBlockSize);
                    pp = p;
                    p += i * ulmanager.ulBlockSize;
                }
            }

            while (p < file.size) {
                tasks[p] = new ChunkUpload(file, p, ulBlockExtraSize);
                pp = p;
                p += ulBlockExtraSize;
            }

            if (file.size - pp > 0) {
                tasks[pp] = new ChunkUpload(file, pp, file.size - pp);
            }

            // if (d) ulmanager.logger.info('ulTasks', tasks);
            Object.keys(tasks).reverse().forEach(function(k) {
                file.ul_offsets.push({
                    byteOffset: parseInt(k),
                    byteLength: tasks[k].end
                });
                ulQueue.pushFirst(tasks[k]);
            });
        }
        else {
            ulQueue.pushFirst(new ChunkUpload(file, 0, 0));
        }

        if (!file.faid && !window.omitthumb) {
            var img = is_image(file.name);
            var vid = is_video(file.name);

            if (img || vid) {
                file.faid = ++ulmanager.ulFaId;

                createthumbnail(
                    file,
                    file.ul_aes,
                    file.faid,
                    null, null,
                    {raw: img !== 1 && img, isVideo: vid}
                ).catch(nop);

                var uled = ulmanager.ulEventData[file.id];
                if (uled) {
                    if (vid) {
                        if (d) {
                            console.debug('Increasing expected file attributes for the chat to be aware...');
                            console.assert(uled.efa === 1, 'Check this...');
                        }
                        uled.efa += 2;
                    }
                    uled.faid = file.faid;
                }
            }
        }

        if (!file.ulSilent) {
            M.ulstart(file);
        }
        if (file.done_starting) {
            file.done_starting();
        }
    },

    ulComplete(payload, ctx) {
        'use strict';
        api.screq(payload)
            .catch(echo)
            .then((res) => {
                const result = Number(res.result || res) | 0;
                if (result < 0) {
                    res = freeze({...res, payload, result});
                }

                ulmanager.ulCompletePending2(res, ctx);
            })
            .catch(reportError);
    },

    ulCompletePending: function() {
        'use strict';
        const self = this;
        delay.cancel('ul.finalize:dsp');

        // Ensure no -3s atm..
        api.req({a: 'ping'}).always(function dsp() {
            // @todo per target folder rather!
            if ($.getExportLinkInProgress) {
                if (d) {
                    self.logger.debug('Holding upload(s) until link-export completed...');
                }
                mBroadcaster.once('export-link:completed', () => onIdle(dsp));
                return;
            }

            const q = self.ulFinalizeQueue;
            self.ulFinalizeQueue = [];

            for (let i = q.length; i--;) {
                const [n, req, ctx] = q[i];

                if (req.a === 'xp') {
                    if (!ulmanager.ulXferPut) {
                        ulmanager.ulXferPut = Object.create(null);
                    }
                    if (!ulmanager.ulXferPut[req.t]) {
                        ulmanager.ulXferPut[req.t] = [[], []];
                    }
                    ulmanager.ulXferPut[req.t][0].push(ctx);
                    ulmanager.ulXferPut[req.t][1].push(...req.n);
                    continue;
                }

                const sn = M.getShareNodesSync(req.t, null, true);
                if (sn.length) {
                    req.cr = crypto_makecr([n], sn, false);
                    req.cr[1][0] = req.n[0].h;
                }

                ulmanager.ulComplete(req, ctx);
            }

            if (ulmanager.ulXferPut) {
                const options = {channel: 7, apipath: 'https://bt7.api.mega.co.nz/'};

                api.yield(options.channel)
                    .then(() => {
                        const payload = [];
                        const {ulXferPut} = ulmanager;

                        for (const t in ulXferPut) {
                            payload.push({a: 'xp', v: 3, t, n: [...ulXferPut[t][1]]});
                        }
                        ulmanager.ulXferPut = null;

                        return api.req(payload, options)
                            .then(({responses}) => {
                                let idx = 0;
                                console.assert(payload.length === responses.length, `Invalid xp-response(s)`);
                                for (const t in ulXferPut) {
                                    const {f} = responses[idx++];
                                    const ctx = ulXferPut[t][0];

                                    console.assert(f.length === ctx.length, 'xp-ctx mismatch.');
                                    for (let i = f.length; i--;) {
                                        const n = f[i];
                                        if (window.is_transferit) {
                                            T.core.populate([n], ctx[i].file.xput);
                                        }
                                        ulmanager.ulCompletePending2({st: -1, result: 1, handle: n.h}, ctx[i]);
                                    }
                                }

                                // @todo improve error handling..
                            });
                    })
                    .catch(tell);
            }
        });
    },

    ulCompletePending2: function UM_ul_completepending2(res, ctx) {
        'use strict';

        if (d) {
            ulmanager.logger.info("ul_completepending2", res, ctx);
        }

        if (typeof res === 'object' && 'st' in res) {
            const h = res.handle;

            console.assert(res.result !== 0 || String(ctx.target).length === 11, 'unexpected upload completion reply.');

            if (ctx.faid && h) {
                // @todo should we fire 'pp' in v2 mode for this to work?..
                api_attachfileattr(h, ctx.faid);
            }

            if (ul_queue[ctx.ul_queue_num]) {
                ulmanager.ulIDToNode[ulmanager.getGID(ul_queue[ctx.ul_queue_num])] = h || ctx.target;
                M.ulcomplete(ul_queue[ctx.ul_queue_num], h || false, ctx.faid);
            }

            if (MediaInfoLib.isFileSupported(h)) {
                var n = M.d[h] || false;
                var file = ctx.file;
                var done = function() {
                    // get thumb/prev created if it wasn't already, eg. an mp4 renamed as avi/mov/etc
                    if (is_video(n) === 1 && String(n.fa).indexOf(':0*') < 0 && !Object(file).__getVTNPid) {
                        var aes = new sjcl.cipher.aes([
                            n.k[0] ^ n.k[4], n.k[1] ^ n.k[5], n.k[2] ^ n.k[6], n.k[3] ^ n.k[7]
                        ]);
                        createnodethumbnail(n.h, aes, n.h, null, {isVideo: true}, null, file);
                    }
                };

                if (String(n.fa).indexOf(':8*') < 0 && file.size > 16) {
                    MediaAttribute(n).parse(file).then(done).catch(function(ex) {
                        if (d) {
                            console.warn('MediaAttribute', ex);
                        }
                        mBroadcaster.sendMessage('fa:error', h, ex, 0, 1);
                    });
                }
                else {
                    done();
                }
            }

            if (ctx.file.owner) {
                ctx.file.ul_failed = false;
                ctx.file.retries = 0;
            }
        }
        else {
            let inShareOQ = false;
            const {payload, result} = res;

            res = result;
            if (res === EOVERQUOTA && payload.a === 'p') {
                if (sharer(ctx.target)) {
                    inShareOQ = true;
                }
                else {
                    return ulmanager.ulShowOverStorageQuotaDialog([payload, ctx]);
                }
            }
            var ul = ul_queue[ctx.ul_queue_num];

            if (!ul && res === EACCESS) {
                ulmanager.logger.warn('This upload was already aborted, resorting to context...', ctx.file);
                ul = ctx.file;
            }

            M.ulerror(ul, inShareOQ ? ESHAREROVERQUOTA : res);

            if (res !== EOVERQUOTA && res !== EGOINGOVERQUOTA) {
                console.warn(`Unexpected upload completion server response (${res} @ ${hostname(ctx.file.posturl)})`);
            }
        }
        delete ulmanager.ulCompletingPhase['ul_' + ctx.file.id];

        if (ctx.file.owner) {
            ctx.file.owner.destroy();
        }
        else if (!oIsFrozen(ctx.file)) {
            oDestroy(ctx.file);
        }
    },

    ulDeDuplicate: function UM_ul_deduplicate(File, identical, mNode) {
        var n;
        var uq = File.ul;

        const skipIdentical = (fmconfig.ul_skipIdentical | 0) || File.file.chatid;
        if (identical && skipIdentical) {
            // If attaching to chat apply apps behaviour and use the existing node.
            n = identical;
        }
        else if ((!M.h[uq.hash] || !M.h[uq.hash].size) && !identical) {
            return ulmanager.ulStart(File);
        }
        else if (M.h[uq.hash]) {
            if (!(n = mNode)) {
                const [h] = M.h[uq.hash];
                n = M.d[h];
            }

            if (!identical && n && uq.size !== n.s) {
                if (d) {
                    ulmanager.logger.warn('fingerprint clash!', n.h, [n], File);
                }
                eventlog(99749, JSON.stringify([1, parseInt(uq.size), parseInt(n.s)]));
                return ulmanager.ulStart(File);
            }
            if (skipIdentical) {
                identical = n;
            }
        }
        if (!n) {
            return ulmanager.ulStart(File);
        }
        if (d) {
            ulmanager.logger.info('[%s] deduplicating file %s', n.h, File.file.name, n);
        }
        api_req({
            a: 'g',
            g: 1,
            ssl: use_ssl,
            n: n.h
        }, {
            uq: uq,
            n: n,
            skipfile: skipIdentical && identical,
            callback: function(res, ctx) {
                if (d) {
                    ulmanager.logger.info('[%s] deduplication result:', ctx.n.h, res.e, res, ctx.skipfile);
                }
                if (oIsFrozen(File)) {
                    ulmanager.logger.warn('Upload aborted on deduplication...', File);
                }
                else if (res.e === ETEMPUNAVAIL && ctx.skipfile) {
                    ctx.uq.repair = ctx.n.k;
                    ulmanager.ulStart(File);
                }
                else if (typeof res === 'number' || res.e) {
                    ulmanager.ulStart(File);
                }
                else if (ctx.skipfile) {
                    if (!(uq.skipfile = !File.file.chatid)) {
                        const eventData = ulmanager.ulEventData[File.file.id];
                        if (eventData) {
                            if (d) {
                                ulmanager.logger.info('[%s] Cleaning efa on deduplication ' +
                                    'for the chat to be aware...', ctx.n.h, eventData.efa);
                            }
                            eventData.efa = 0;
                        }
                    }
                    ulmanager.ulIDToNode[ulmanager.getGID(uq)] = ctx.n.h;
                    M.ulcomplete(uq, ctx.n.h);
                    File.file.ul_failed = false;
                    File.file.retries = 0;
                    File.file.done_starting();
                }
                else {
                    File.file.filekey = ctx.n.k;
                    File.file.response = ctx.n.h;
                    File.file.ddfa = ctx.n.fa;
                    File.file.path = ctx.uq.path;
                    File.file.name = ctx.uq.name;

                    var eventData = ulmanager.ulEventData[File.file.id];
                    if (eventData) {
                        var efa = ctx.n.fa ? String(ctx.n.fa).split('/').length : 0;

                        if (eventData.efa !== efa) {
                            if (d) {
                                ulmanager.logger.info('[%s] Fixing up efa on deduplication ' +
                                    'for the chat to be aware... (%s != %s)', ctx.n.h, eventData.efa, efa);
                            }
                            eventData.efa = efa;
                        }
                    }

                    // File.file.done_starting();
                    ulmanager.ulFinalize(File.file);
                }
            }
        });
    },

    ulIdentical: function UM_ul_Identical(file) {
        var nodes = M.c[file.target];
        if (nodes) {
            for (var node in nodes) {
                node = M.d[node];

                if (node
                        && file.size === node.s
                        && file.name === node.name
                        && file.hash === node.hash) {
                    return node;
                }
            }
        }
        return false;
    },

    /**
     * Initialize upload on fingerprint creation.
     *
     * @param {Object}  aFileUpload  FileUpload instance
     * @param {Object}  aFile        File API interface instance
     * @param {Boolean} [aForce]     Ignore locking queue.
     */
    ulSetup: function ulSetup(aFileUpload, aFile, aForce) {
        'use strict';

        var dequeue = function ulSetupDQ() {
            if (ulmanager.ulSetupQueue.length) {
                var upload = ulmanager.ulSetupQueue.shift();
                onIdle(ulmanager.ulSetup.bind(ulmanager, upload, upload.file, true));
            }
            else {
                ulmanager.ulSetupQueue = false;
            }
        };

        if (!aFileUpload || !aFile || aFileUpload.file !== aFile || !aFile.hash) {
            if (d) {
                console.warn('Invalid upload instance, cancelled?', oIsFrozen(aFileUpload), aFileUpload, aFile);
            }
            return onIdle(dequeue);
        }

        if (!aForce) {
            if (this.ulSetupQueue) {
                return this.ulSetupQueue.push(aFileUpload);
            }
            this.ulSetupQueue = [];
        }

        var hashNode;
        var startUpload = function _startUpload() {
            onIdle(dequeue);

            var identical = ulmanager.ulIdentical(aFile);
            ulmanager.logger.info(aFile.name, "fingerprint", aFile.hash, M.h[aFile.hash], identical);

            if (M.h[aFile.hash] && M.h[aFile.hash].size || identical) {
                ulmanager.ulDeDuplicate(aFileUpload, identical, hashNode);
            }
            else {
                ulmanager.ulStart(aFileUpload);
            }
        };

        if (is_megadrop || self.is_transferit) {
            return startUpload();
        }

        var promises = [];

        if (!M.c[aFile.target]) {
            promises.push(dbfetch.get(aFile.target));
        }

        const [h] = M.h[aFile.hash] || [];
        if (!M.d[h]) {
            promises.push(dbfetch.hash(aFile.hash).then(node => (hashNode = node)));
        }

        if (promises.length) {
            Promise.allSettled(promises).then(startUpload);
        }
        else {
            startUpload();
        }
    },

    /**
     * Abort and Clear items in upload list those are targeting a deleted folder.
     * This is triggered by `d` action packet.
     *
     * @param {String|Array} handles  handle(s) of deleted node(s)
     */
    ulClearTargetDeleted: function(handles) {
        'use strict';

        if (!ul_queue.length) {
            return false;
        }
        if (!Array.isArray(handles)) {
            handles = [handles];
        }

        var toAbort = [];
        for (var i = ul_queue.length; i--;) {
            var ul = isQueueActive(ul_queue[i]) && ul_queue[i] || false;

            if (ul && handles.indexOf(ul.target) !== -1) {
                var gid = ulmanager.getGID(ul);
                toAbort.push(gid);
                $('.transfer-status', $('#' + gid).addClass('transfer-error')).text(l[20634]);
                tfsheadupdate({e: gid});
                mega.tpw.errorDownloadUpload(mega.tpw.UPLOAD, ul, l[20634]);
            }
        }

        if (toAbort.length) {
            eventlog(99726);
            ulmanager.abort(toAbort);
        }
    }
};


class UploadQueue extends Array {
    push(...args) {
        if (!self.u_k_aes && !self.is_transferit) {
            if (!self.mkwarn) {
                self.mkwarn = 1;
                tell(l[8853]);
            }
            return;
        }
        const pos = super.push(...args) - 1;
        const file = this[pos];

        file.pos = pos;
        ulQueue.poke(file);

        return pos + 1;
    }
}


function ChunkUpload(file, start, end, altport) {
    this.file = file;
    this.ul = file;
    this.start = start;
    this.end = end;
    this.gid = file.owner.gid;
    this.xid = this.gid + '_' + start + '-' + end;
    this.jid = (Math.random() * Date.now()).toString(36);
    this.altport = altport;
    this.logger = new MegaLogger(String(this), {}, ulmanager.logger);
    this[this.gid] = !0;
    // if (d) ulmanager.logger.info('Creating ' + this);
}

ChunkUpload.prototype.toString = function() {
    return "[ChunkUpload " + this.xid + "$" + this.jid + "]";
};

ChunkUpload.prototype.destroy = function() {
    // if (d) ulmanager.logger.info('Destroying ' + this);
    this.abort();
    oDestroy(this);
};

ChunkUpload.prototype.updateprogress = function() {
    if (this.file.paused || this.file.complete || uldl_hold) {
        return;
    }

    var p = this.file.progress;
    var tp = this.file.sent || 0;
    for (var i in p) {
        tp += p[i];
    }

    // only start measuring progress once the TCP buffers are filled
    // (assumes a modern TCP stack with a large intial window)
    if (!this.file.speedometer && this.file.progressevents > 5) {
        this.file.speedometer = Speedometer(tp);
    }
    this.file.progressevents = (this.file.progressevents || 0) + 1;
    p = GlobalProgress[this.gid].speed = this.file.speedometer ? this.file.speedometer.progress(tp) : 0;

    if (!this.file.ulSilent) {
        M.ulprogress(this.file, Math.floor(tp / this.file.size * 100), tp, this.file.size, p);
    }

    if (tp === this.file.size) {
        this.file.complete = true;
    }
};

ChunkUpload.prototype.abort = function() {
    if (d > 1 && this.logger) {
        this.logger.info('Aborting', this.oet, Boolean(this.xhr));
    }

    if (this.oet) {
        clearTimeout(this.oet);
    }
    if (this.xhr) {
        this.xhr.abort(this.xhr.ABORT_CLEANUP);
    }
    if (GlobalProgress[this.gid]) {
        array.remove(GlobalProgress[this.gid].working, this, 1);
    }
    else if (d && this.logger) {
        this.logger.error('This should not be reached twice or after FileUpload destroy...', this);
    }
    delete this.xhr;
};

ChunkUpload.prototype.onXHRprogress = function(xhrEvent) {
    if (!this.file || !this.file.progress || this.file.abort) {
        return this.done && this.done();
    }
    var now = Date.now();
    if ((now - this.file.ul_lastProgressUpdate) > 200) {
        this.file.ul_lastProgressUpdate = now;
        this.file.progress[this.start] = xhrEvent.loaded;
        this.updateprogress();
    }
};

ChunkUpload.prototype.onXHRerror = function(args, xhr, reason) {
    if (this.file && !this.file.abort && this.file.progress) {
        this.file.progress[this.start] = 0;
        this.updateprogress();

        if (!xhr) {
            xhr = this.xhr;
        }
        if (args === "$FATAL") {
            ulmanager.restart(this.file, reason, xhr);
        }
        else {
            ulmanager.retry(this.file, this, "xhr failed: " + reason, xhr);
        }
    }
    this.done();
}

ChunkUpload.prototype.onXHRready = function(xhrEvent) {
    if (!this.file || !this.file.progress) {
        if (d) {
            this.logger.error('Upload aborted...', this);
        }
        return Soon(this.done.bind(this));
    }
    var self = this;
    var xhr = xhrEvent.target;
    var response = xhr.response;
    var isValidType = (response instanceof ArrayBuffer);
    xhrEvent = undefined;

    if (isValidType && xhr.status === 200 && xhr.statusText === 'OK') {

        if (!response.byteLength || response.byteLength === 36) {
            this.file.sent += this.bytes.buffer.length || this.bytes.length;
            delete this.file.progress[this.start];
            this.updateprogress();

            if (response.byteLength === 36) {
                var ul_key = this.file.ul_key;
                var t = Object.keys(this.file.ul_macs).map(Number);
                t.sort(function(a, b) {
                    return a - b;
                });
                for (var i = 0; i < t.length; i++) {
                    t[i] = this.file.ul_macs[t[i]];
                }
                var mac = condenseMacs(t, this.file.ul_key);

                var filekey = [
                    ul_key[0] ^ ul_key[4],
                    ul_key[1] ^ ul_key[5],
                    ul_key[2] ^ mac[0] ^ mac[1],
                    ul_key[3] ^ mac[2] ^ mac[3],
                    ul_key[4],
                    ul_key[5],
                    mac[0] ^ mac[1],
                    mac[2] ^ mac[3]
                ];

                if (this.gid && (window.u_k_aes || this.file.xput) && !ulmanager.ulCompletingPhase[this.gid]) {
                    var u8 = new Uint8Array(response);

                    this.file.filekey = filekey;
                    this.file.response = (u8[35] === 1)
                        ? ab_to_base64(response)
                        : ab_to_str(response);
                    ulmanager.ulFinalize(this.file);
                    u8 = undefined;
                }
                else {
                    const cl = this.logger ? this : ulmanager;
                    const cmpl = ulmanager.ulCompletingPhase[this.gid];
                    const m = cmpl
                        ? 'Unexpected upload completion flow on %s!'
                        : 'Unrecoverable upload error for %s';
                    cl.logger.warn(m, this.gid, this.xid, cmpl, [this]);

                    if (!cmpl) {
                        cl.logger.error('starting over...', [this]);
                        return this.onXHRerror("$FATAL", null, l[16]);
                    }
                }
            }

            this.bytes = null;

            this.file.retries = 0; /* reset error flag */

            return this.done();
        }
        else {
            var resp = ab_to_str(response);
            var estr = ulmanager.ulStrError(resp);
            this.logger.error("Invalid upload response: ", resp, estr);
            if (estr !== "EKEY") {
                return this.onXHRerror("$FATAL", null,
                    (estr ? (estr + " error")
                    : "IUR[" + String(resp).trim().substr(0, 5) + "]"));
            }
        }
    }

    this.srverr = xhr.status + 1;

    var errstr = 'BRFS [l:Unk]';
    if (isValidType) {
        if (response.byteLength && response.byteLength < 5) {
            errstr = 'BRFS [s:' + ab_to_str(response) + ']';
        }
        else if (xhr.status >= 400) {
            errstr = 'BRFS [-]';
        }
        else {
            errstr = 'BRFS [l:' + response.byteLength + ']';
        }
    }

    this.oet = setTimeout(function() {
        if (!oIsFrozen(self)) {
            self.onXHRerror(null, xhr, errstr);
        }
        self = undefined;
    }, 1950 + Math.floor(Math.random() * 2e3));

    if (d) {
        this.logger.warn("Bad response from server, status(%s:%s)",
            xhr.status,
            xhr.statusText,
            isValidType,
            this.file.name
        );
    }

    response = undefined;
}

ChunkUpload.prototype.upload = function() {
    'use strict';

    var url, xhr;
    var self = this;
    var logger = self.logger || ulmanager.logger;

    if (!this.file) {
        if (d) {
            logger.error('This upload was cancelled while the Encrypter was working,'
                + ' prevent this aborting it beforehand');
        }
        return;
    }

    if (!GlobalProgress[this.gid]) {
        return this.logger.error('No upload associated with gid ' + this.gid);
    }
    if (GlobalProgress[this.gid].paused) {
        return this.logger.info('Encrypter finished, but the upload was paused meanwhile.');
    }

    if (!this.file.posturl) {
        onUploadError(this.file, 'Internal error (0xBADF001)');
        if (!this.file.abort) {
            ASSERT(0, 'No PostURL! ' + (typeof this.file.posturl));
        }
        return;
    }

    xhr = getTransferXHR(this);
    url = dlmanager.uChangePort(this.file.posturl + this.suffix, this.altport ? 8080 : 0);
    xhr._murl = url;

    if (d > 1) {
        this.logger.info("pushing", url);
    }

    tryCatch(function() {
        xhr.open('POST', url);
        xhr.responseType = 'arraybuffer';
        xhr.send(self.bytes.buffer);
        self.xhr = xhr;
    }, function(ex) {
        if (self.file) {
            logger.warn('fatal upload error, attempting to restart...', String(ex.message || ex), [self, ex]);
            ulmanager.restart(self.file, ex.message || ex);
        }
        else {
            logger.debug('fatal upload error, holding while restarting...', String(ex.message || ex), [self, ex]);
        }
    })();
};

ChunkUpload.prototype.io_ready = function(res) {
    'use strict';

    if (res < 0 || !this.file || !this.file.ul_keyNonce) {
        if (this.file && !oIsFrozen(this.file)) {
            if (d) {
                this.logger.error('UL IO Error', res);
            }

            if (this.file.done_starting) {
                this.file.done_starting();
            }
            ulmanager.retry(this.file, this, "IO failed: " + res);
        }
        else {
            if (d && this.logger) {
                this.logger.error('The FileReader finished, but this upload was cancelled...');
            }
        }
    }
    else {
        this.bytes = res.bytes;
        this.suffix = res.suffix;
        Object.assign(this.file.ul_macs, res.file.ul_macs);
        this.upload();
    }
};

ChunkUpload.prototype.done = function(ee) {
    if (d > 1 && this.logger) {
        this.logger.info('.done');
    }

    if (this._done) {
        /* release worker */
        this._done();

        /* clean up references */
        this.destroy();
    }
};

ChunkUpload.prototype.run = function(done) {
    this._done = done;
    if (this.bytes && this.suffix) {
        this.logger.info('.run', 'Reusing previously encrypted data.');
        this.upload();
    }
    else if (this.file.size === 0) {
        this.logger.info('.run', 'Uploading 0-bytes file...');
        this.bytes = new Uint8Array(0);
        this.suffix = '/0?c=AAAAAAAAAAAAAAAA';
        this.upload();
    }
    else if (!this.start && localStorage.ulFailTest) {
        this.logger.warn('Intentionally blocking the first chunk.');
    }
    else {
        if (d > 1) {
            this.logger.info('.run');
        }
        if (!this.file.ul_reader) {
            this.file.ul_reader = new FileUploadReader(this.file);

            if (d > 1) {
                if (!window.ul_reader) {
                    window.ul_reader = [];
                }
                window.ul_reader.push(this.file.ul_reader);
            }
        }
        var self = this;
        this.file.ul_reader.getChunk(this.start, function(res) {
            self.io_ready(res);
        });
    }
    array.remove(GlobalProgress[this.gid].working, this, 1);
    GlobalProgress[this.gid].working.push(this);
};

function FileUpload(file) {
    this.file = file;
    this.ul = file;
    this.gid = 'ul_' + this.ul.id;
    this[this.gid] = !0;
    GlobalProgress[this.gid] = {
        working: []
    };
}

FileUpload.prototype.toString = function() {
    return "[FileUpload " + this.gid + "]";
};

FileUpload.prototype.destroy = function(mul) {
    'use strict';
    if (d) {
        ulmanager.logger.info('Destroying ' + this);
    }
    if (!this.file) {
        return;
    }
    if (Object(GlobalProgress[this.gid]).started) {
        ulmanager.ulSize -= this.file.size;
    }

    // Hmm, looks like there are more ChunkUploads than what we really upload (!?)
    if (d) {
        ASSERT(GlobalProgress[this.gid].working.length === 0, 'Huh, there are working upload chunks?..');
    }
    ASSERT(this.file.owner === this, 'Invalid FileUpload Owner...');
    window.ulQueue.poke(this.file, mul === -0xbeef ? mul : 0xdead);
    if (this.file.done_starting) {
        this.file.done_starting();
    }
    delete GlobalProgress[this.gid];
    oDestroy(this.file);
    oDestroy(this);
};

FileUpload.prototype.run = function(done) {
    var file = this.file;
    var self = this;

    file.abort = false; /* fix in case it restarts from scratch */
    file.ul_failed = false;
    file.retries = 0;
    file.xr = dlmanager.mGetXR();
    file.ul_lastreason = file.ul_lastreason || 0;

    if (!(file.ulSilent || file.xput)) {
        const domNode = document.getElementById(`ul_${file.id}`);

        if (ulmanager.ulStartingPhase || !domNode) {
            done();
            ASSERT(0, "This shouldn't happen");
            return ulQueue.pushFirst(this);
        }
        domNode.classList.add('transfer-initiliazing');

        const transferStatus = domNode.querySelector('.transfer-status');
        if (transferStatus) {
            transferStatus.textContent = l[1042];
        }
    }

    if (!GlobalProgress[this.gid].started) {
        GlobalProgress[this.gid].started = true;
    }

    if (d) {
        ulmanager.logger.info(file.name, "starting upload", file.id);
    }

    ulmanager.ulSize += file.size;
    // ulmanager.ulStartingPhase = true;

    var started = false;
    file.done_starting = function() {
        if (started) {
            return;
        }
        started = true;
        ulmanager.ulStartingPhase = false;
        delete file.done_starting;

        if (ulmanager.ulSize < ulmanager.ulMaxConcurrentSize) {

            if (file.size < ulmanager.ulMaxFastTrackSize) {
                var size = ulQueue.getSize();
                var max  = ulQueue.maxActiveTransfers;

                if (size < max && ulQueue.canExpand(max)) {
                    ulQueue.setSize(size + 1);
                }
            }
        }
        else {
            ulQueue.setSize((fmconfig.ul_maxSlots | 0) || ulmanager.ulDefConcurrency || 4);
        }

        file = self = false;
        done();
    };

    getFingerprint(file).then(function(result) {
        if (!(file && self.file)) {
            ulmanager.logger.info('Fingerprint generation finished, but the upload was canceled meanwhile...');
        }
        else if (file.hash === result.hash) {
            // Retrying.
            setTimeout(ulmanager.ulStart.bind(ulmanager, self), 950 + Math.floor(Math.random() * 4e3));
        }
        else {
            file.ts = result.ts;
            file.hash = result.hash;
            ulmanager.ulSetup(self, file);
        }
    }).catch(function(ex) {
        // TODO: Improve further what error message we do show to the user.
        var error = ex.name !== 'Error' && ex.name || ex;

        eventlog(99727, JSON.stringify([1, String(error)]));

        if (error === 0x8052000e) {
            // File is locked
            error = l[7399];
        }
        else if (error === 'SecurityError') {
            // "Access denied"
            error = l[1667];
        }
        else {
            // "Read error"
            error = l[1677];
        }

        if (d) {
            ulmanager.logger.error('FINGERPRINT ERROR ("%s")', error, file.name, file.size, ex.message, [ex]);
        }

        if (file && self.file) {
            onUploadError(file, error);

            if (page.substr(0, 11) === 'filerequest') {
                mBroadcaster.sendMessage('upload:error', file.id, error);
                return;
            }

            var that = self;
            ulmanager.abort(file);
            that.destroy();
        }
    });
};

function isQueueActive(q) {
    return typeof q.id !== 'undefined';
}

var ulQueue = new TransferQueue(function _workerUploader(task, done) {
    if (d && d > 1) {
        ulQueue.logger.info('worker_uploader', task, done);
    }
    task.run(done);
}, self.is_ios && isMediaSourceSupported() ? 1 : ulmanager.ulDefConcurrency, 'uploader');

ulQueue.poke = function(file, meth) {
    'use strict';
    let quick = false;
    if (meth === -0xbeef) {
        quick = true;
        meth = 0xdead;
    }
    if (file.owner) {
        var gid = ulmanager.getGID(file);

        file.retries = 0;
        file.sent = 0;
        file.progress = Object.create(null);
        file.posturl = "";
        file.uReqFired = null;
        file.abort = true;

        if (!quick) {
            ulQueue.pause(gid);
            ulQueue.filter(gid);
        }

        if (file.__umRetryTimer) {
            var t = file.__umRetryTimer;
            for (var i in t) {
                if (t.hasOwnProperty(i)) {
                    clearTimeout(t[i]);
                }
            }

            if (!quick) {
                ulQueue.resume();
            }
        }
        if (file.ul_reader) {
            file.ul_reader.destroy();
            file.ul_reader = null;
        }
        if (!meth) {
            meth = 'pushFirst';
        }

        delete file.__umRetries;
        delete file.__umRetryTimer;
    }

    if (meth !== 0xdead) {
        if (!meth && file.ulSilent && file.size === 0) {
            meth = 'pushFirst';
        }

        file.sent = 0;
        file.progress = Object.create(null);
        file.owner = new FileUpload(file);
        ulQueue[meth || 'push'](file.owner);
    }
};

ulQueue.validateTask = function(pzTask) {
    // XXX: pzTask.file *must* be valid, it doesn't sometimes which indicates
    // a problem somewhere with the entry not getting removed from ulQueue._queue
    if (pzTask instanceof ChunkUpload && pzTask.file && (!pzTask.file.paused || pzTask.__retry)) {
        return true;
    }

    if (pzTask instanceof FileUpload
        && !ulmanager.ulStartingPhase
        && (pzTask.file.xput || pzTask.file.ulSilent || document.getElementById(`ul_${pzTask.file.id}`))) {

        return true;
    }

    return false;
};

ulQueue.canExpand = function(max) {
    max = max || this.maxActiveTransfers;
    return !is_mobile && this._running < max;
};

// If on mobile, there's only 1 upload at a time and the desktop calculation below fails
Object.defineProperty(ulQueue, 'maxActiveTransfers', {
    // eslint-disable-next-line strict
    get: self.is_mobile ? () => 1 : self.is_transferit ? () => ulmanager.ulDefConcurrency << 2
        : function() {
            return Math.min(Math.floor(M.getTransferTableLengths().size / 1.6), 36);
        }
});

mBroadcaster.once('startMega', function _setupEncrypter() {
    'use strict';
    var encrypter = CreateWorkers('encrypter.js', function(context, e, done) {
        var file = context.file;
        if (!file || !file.ul_macs) {
            // TODO: This upload was cancelled, we should terminate the worker rather than waiting
            if (d) {
                encrypter.logger.error('This upload was cancelled, should terminate the worker rather than waiting');
            }
            return typeof e.data === 'string' || done();
        }

        // target byteOffset as defined at CreateWorkers()
        var offset = e.target.byteOffset;// || context.start;

        if (typeof e.data === 'string') {
            if (e.data[0] === '[') {
                file.ul_macs[offset] = JSON.parse(e.data);
            }
            else {
                encrypter.logger.info('WORKER:', e.data);
            }
        }
        else {
            if (context.appendMode) {
                context.bytes.set(new Uint8Array(e.data.buffer || e.data), offset);
            }
            else {
                context.bytes = new Uint8Array(e.data.buffer || e.data);
            }
            context.suffix = '/' + context.start + '?c=' + base64urlencode(chksum(context.bytes.buffer));
            done();
        }
    });

    ulmanager.logger.options.levelColors = {
        'ERROR': '#fe1111',
        'DEBUG': '#0000ff',
        'WARN':  '#C25700',
        'INFO':  '#44829D',
        'LOG':   '#000044'
    };
    Object.defineProperty(window, 'Encrypter', { value: encrypter });
});

var ul_queue = new UploadQueue();
