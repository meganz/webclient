
var ul_maxSpeed = 0;
var uldl_hold = false;
var ul_skipIdentical = 0;
var ul_maxSlots = readLocalStorage('ul_maxSlots', 'int', { min:1, max:6, def:4 });

if (localStorage.ul_maxSpeed) {
    ul_maxSpeed = parseInt(localStorage.ul_maxSpeed);
}

if (localStorage.ul_skipIdentical) {
    ul_skipIdentical = parseInt(localStorage.ul_skipIdentical);
}

/* jshint -W003 */
var ulmanager = {
    ulFaId: 0,
    isUploading: false,
    ulStartingPhase: false,
    ulCompletingPhase: false,
    ulPendingCompletion: [],
    ulBlockSize: 131072,
    ulBlockExtraSize: 1048576,
    logger: MegaLogger.getLogger('ulmanager'),

    getGID: function UM_GetGID(ul) {
        return 'ul_' + ul.id;
    },

    abort: function UM_abort(gid) {
        if (gid === null || Array.isArray(gid)) {
            this._multiAbort = 1;

            if (gid) {
                gid.forEach(this.abort.bind(this));
            }
            else {
                ul_queue.filter(isQueueActive).forEach(this.abort.bind(this));
            }

            delete this._multiAbort;
            Soon(mega.utils.resetUploadDownload);
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
                    ul.destroy();
                }
                ul_queue[idx] = Object.freeze({});
            });
            if (!this._multiAbort) {
                Soon(mega.utils.resetUploadDownload);
            }
        }
    },

    restart: function UM_restart(file, reason, xhr) {
        onUploadError(file, "Upload failed - restarting...", reason, xhr);

        // reschedule
        ulQueue.poke(file);
    },

    retry: function UM_retry(file, chunk, reason, xhr) {
        var start = chunk.start;
        var end = chunk.end;
        var cid = String(chunk);

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
            var q = file.__umRetryTimer || {};
            delete q[tid];

            if (reason.indexOf('IO failed') === -1) {
                tid = --file.__umRetries;
            }

            if (tid < 34) {
                var newTask = new ChunkUpload(file, start, end);
                ulQueue.pushFirst(newTask);
            }
            else {
                if (d) {
                    ulmanager.logger.error('Too many retries for ' + cid);
                }
                msgDialog('warninga', l[1309], l[1498] + ': ' + file.name, reason);
                ulmanager.abort(file);
            }
            if (!$.len(q)) {
                delete file.__umRetryTimer;
                ulQueue.resume();
            }
        }, 950 + Math.floor(Math.random() * 2e3));

        onUploadError(file, "Upload failed - retrying",
            reason.substr(0, 2) === 'IO' ? 'IO Failed' : reason,
            xhr);

        chunk.done(); /* release worker */
    },

    warning: function UM_warning(success) {
        var lsProp = 'umQWarning';
        if (localStorage[lsProp]) {
            return false;
        }

        mega.ui.Dialog.generic({
            'title': 'Upload Warning',
            'notAgainTag': lsProp,
            'success': success
        }, function($content, $title, dialog) {
            dialog.$dialog.css('height', '560px');
            var path = staticpath + 'images/products/';
            var retina = /*(window.devicePixelRatio > 1) ? '-2x' :*/ '';
            var msg = 'We strongly suggest using our sync client for vastly improved performance uploading hundred of files.';
            var os_class = browserdetails(ua).os;
            if (os_class === 'Apple') {
                os_class = 'Mac';
            }
            var os_file = 'https://mega.co.nz/MEGAsyncSetup.exe';
            if (os_class === 'Mac') {
                os_file = 'https://mega.co.nz/MEGAsyncSetup.dmg';
            }
            else if (os_class === 'Linux') {
                os_file = '/#sync';
            }
            var inlineStyle =
                'background:#D9D8D8;padding:8px 14px;text-align:center;border-radius:4px;max-width:300px';
            var syncButton =
                '<div><a href="' + os_file + '" class="sync-button button0 ' + os_class.toLowerCase() + '">' +
                    '<span class="sync-button-txt">' + l[1157] + '</span>' +
                    '<span class="sync-button-txt small">' + l[1158].replace('Windows', os_class) + '</span>' +
                '</a></div>';

            $content.html(
                '<div style="' + inlineStyle + '">' +
                    '<div><b>' + msg + '</b></div>' +
                    '<div><img src="' + path + 'sync-client' + retina + '.gif"/><br/>' + syncButton + '</div>' +
                    '<hr/>' +
                    '<div>Would you like to continue anyway?</div>' +
                '</div>');
        });

        return true;
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
                    ulmanager.logger.info('Failed download:',
                        dl_queue[i].zipname
                        || dl_queue[i].n, 'Retries: ' + dl_queue[i].retries, dl_queue[i].zipid);
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
                    ulmanager.restart(ul_queue[i], 'network_error_check');
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
                        ulmanager.logger.error('shrinking: ' + (k === ul ? 'ul' : 'dl'));
                    }
                    var queue = (k === ul ? ulQueue : dlQueue);
                    queue.shrink();
                }
            });
    },

    ulFileReader: function UM_ul_filereader(fs, file) {
        var handler;
        if (is_chrome_firefox && "u8" in file) {
            if (d) {
                ulmanager.logger.info('Using Firefox ulReader');
            }

            handler = function ulReader(task, done) {
                var error = null;

                try {
                    task.bytes = file.u8(task.start, task.end);
                }
                catch (e) {
                    error = e;
                }
                Soon(function() {
                    done(error);
                });
            };
        }
        if (!handler) {
            handler = function(task, done) {
                var end = task.start + task.end;
                var blob;

                fs.pos = task.start;
                fs.onerror = function(evt) {
                    done(new Error(evt));
                    done = null;
                };
                fs.onloadend = function(evt) {
                    if (done) {
                        var target = evt.target;
                        var error = true;
                        if (target.readyState === FileReader.DONE) {
                            if (target.result instanceof ArrayBuffer) {
                                try {
                                    task.bytes = new Uint8Array(target.result);
                                    error = null;
                                }
                                catch (e) {
                                    handler.logger.error(e);
                                    error = e;
                                }
                            }
                        }
                        done(error);
                    }
                    blob = undefined;
                };
                try {
                    if (file.slice || file.mozSlice) {
                        if (file.slice) {
                            blob = file.slice(task.start, end);
                        }
                        else {
                            blob = file.mozSlice(task.start, end);
                        }
                        xhr_supports_typed_arrays = true;
                    }
                    else {
                        blob = file.webkitSlice(task.start, end);
                    }
                    fs.readAsArrayBuffer(blob);
                }
                catch (e) {
                    handler.logger.error(e);
                    done(e);
                    done = null;
                }
            };
        }
        handler = new MegaQueue(handler, 1, 'ul-filereader');
        return handler;
    },

    ulFinalize: function UM_ul_finalize(file, target) {
        var p;

        if (d) {
            ulmanager.logger.info(file.name, "ul_finalize", file.target, target);
        }

        if (is_chrome_firefox && file._close) {
            file._close();
        }
        if (file.repair) {
            file.target = M.RubbishID;
        }
        else if (!target && String(file.target).substr(0, 4) === 'chat') {
            return fm_requestfolderid(null, 'My chat files', {
                callback: SoonFc(function(meh, h) {
                    ulmanager.ulFinalize(file, h);
                })
            });
        }

        var dirs = fm_safepath(file.path);

        ASSERT(file.filekey, "*** filekey is missing ***");

        Cascade(dirs, Mkdir, function(dir) {
            var body = {
                n: file.name
            };
            if (file.hash) {
                body.c = file.hash;
            }
            var ea = enc_attr(body, file.filekey);
            var faid = file.faid ? api_getfa(file.faid) : false;
            var req = {
                a: 'p',
                t: dir,
                n: [{
                    h: file.response,
                    t: 0,
                    a: ab_to_base64(ea[0]),
                    k: a32_to_base64(encrypt_key(u_k_aes, file.filekey))
                }],
                i: requesti
            };
            if (faid) {
                req.n[0].fa = faid;
            }
            if (dir) {
                var sn = fm_getsharenodes(dir);
                if (sn.length) {
                    req.cr = crypto_makecr([file.filekey], sn, false);
                    req.cr[1][0] = file.response;
                }
            }

            if (d) {
                ulmanager.logger.info(file.name, "save to dir", dir, req);
            }

            api_req(req, {
                target: dir,
                ul_queue_num: file.pos,
                size: file.size,
                faid: file.faid,
                file: file,
                callback: ulmanager.ulCompletePending2
            });
        }, target || file.target || M.RootID);
    },

    ulGetPostURL: function UM_ul_get_posturl(File) {
        return function(res, ctx) {

            // If cancelled
            if (!File.ul) {
                return;
            }

            // If the response is that the user is over quota
            if (res === EOVERQUOTA) {

                // Show a warning dialog
                showOverQuotaDialog();

                // Return early so it does not retry automatically and spam the API server with requests
                return false;
            }

            // Reset in case of a retry
            delete ul_queue[ctx.reqindex].posturl;

            if (typeof res === 'object') {
                if (typeof res.p === "string" && res.p.length > 0) {
                    ul_queue[ctx.reqindex].posturl = res.p;
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
        var max = File.file.pos + 8;

        for (var i = File.file.pos; i < len && i < max && maxpf > 0; i++) {
            var cfile = ul_queue[i];
            if (!isQueueActive(cfile)) {
                continue;
            }
            api_req({
                a: 'u',
                ssl: use_ssl,
                ms: ul_maxSpeed,
                s: cfile.size,
                r: cfile.retries,
                e: cfile.ul_lastreason
            }, {
                reqindex: i,
                callback: next
            });
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
            file.ul_key = [ul_key[0] ^ ul_key[4], ul_key[1] ^ ul_key[5], ul_key[2]
                ^ ul_key[6], ul_key[3] ^ ul_key[7], ul_key[4], ul_key[5]];
        }
        else if (!file.ul_key) {
            file.ul_key = Array(6);
            // generate ul_key and nonce
            for (i = 6; i--;) {
                file.ul_key[i] = rand(0x100000000);
            }
        }

        file.ul_keyNonce = JSON.stringify(file.ul_key);
        file.ul_macs = [];
        file.totalbytessent = 0;
        file.ul_readq = [];
        file.ul_plainq = {};
        file.ul_intransit = 0;
        file.ul_inflight = {};
        file.ul_sendchunks = {};
        file.ul_aes = new sjcl.cipher.aes([
            file.ul_key[0], file.ul_key[1], file.ul_key[2], file.ul_key[3]
        ]);

        if (file.size) {
            var pp;
            var p = 0;
            var tasks = {};
            for (i = 1; i <= 8 && p < file.size - i * ulmanager.ulBlockSize; i++) {
                tasks[p] = new ChunkUpload(file, p, i * ulmanager.ulBlockSize);
                pp = p;
                p += i * ulmanager.ulBlockSize;
            }

            while (p < file.size) {
                tasks[p] = new ChunkUpload(file, p, ulmanager.ulBlockExtraSize);
                pp = p;
                p += ulmanager.ulBlockExtraSize;
            }

            if (file.size - pp > 0) {
                tasks[pp] = new ChunkUpload(file, pp, file.size - pp);
            }

            // if (d) ulmanager.logger.info('ulTasks', tasks);
            Object.keys(tasks).reverse().forEach(function(s) {
                    ulQueue.pushFirst(tasks[s]);
                });

        }
        else {
            ulQueue.pushFirst(new ChunkUpload(file, 0, 0));
        }

        var isi = have_ab && !file.faid && is_image(file.name);
        if (isi) {
            file.faid = ++ulmanager.ulFaId;
            createthumbnail(file, file.ul_aes, ulmanager.ulFaId, null, null, {
                raw: isi !== 1 && isi
            });
        }

        onUploadStart(file);
        file.done_starting();
    },

    ulCompletePending: function UM_ul_completepending(target) {
        if (ulmanager.ulPendingCompletion.length) {
            ulmanager.logger.error("I'm weak, debug me.");
            var ul = ulmanager.ulPendingCompletion.shift();
            // var ctx = {
            // target : target,
            // ul_queue_num : ul[3],
            // size: ul_queue[ul[3]].size,
            // callback : ul_completepending2,
            // faid : ul[1].faid,
            // file : ul[1]
            // };
            // api_completeupload(ul[0],ul[1],ul[2],ctx);

            var file = ul[1];
            file.response = ul[0];
            file.filekey = ul[2];
            ulmanager.ulFinalize(file);
        }
        else {
            ulmanager.ulCompletingPhase = false;
        }
    },

    ulCompletePending2: function UM_ul_completepending2(res, ctx) {
        if (d) {
            ulmanager.logger.info("ul_completepending2", res, ctx);
        }
        ASSERT(typeof res === 'object' && res.f, 'Unexpected UL Server Response.', res);
        if (typeof res === 'object' && res.f) {
            var n = res.f[0];

            if (ctx.faid) {
                storedattr[ctx.faid].target = res.f[0].h;
            }

            newnodes = [];
            process_f(res.f);
            renderNew();
            if (M.viewmode) {
                fm_thumbnails();
            }
            if (ctx.faid) {
                api_attachfileattr(n.h, ctx.faid);
            }
            onUploadSuccess(ul_queue[ctx.ul_queue_num], n.h, ctx.faid);
            ctx.file.ul_failed = false;
            ctx.file.retries = 0;
            ulmanager.ulCompletePending(ctx.target);
        }
        else {
            var fileName = ctx.file.name;
            Later(mega.utils.resetUploadDownload);
            Soon(function() {

                // If over quota show a special warning dialog
                if (res === EOVERQUOTA) {
                    showOverQuotaDialog();
                }
                else {
                    // Otherwise show 'Upload failed - Error uploading asset [filename]'
                    msgDialog('warninga', l[1309], l[5760] + ' ' + fileName);
                }
            });
        }
        if (ctx.file.owner) {
            ctx.file.owner.destroy();
        }
        else {
            oDestroy(ctx.file);
        }
    },

    ulDeDuplicate: function UM_ul_deduplicate(File, identical) {
        var n;
        var uq = File.ul;
        if (identical && ul_skipIdentical) {
            n = identical;
        }
        else if (!M.h[uq.hash] && !identical) {
            return ulmanager.ulStart(File);
        }
        else if (M.h[uq.hash]) {
            n = M.d[M.h[uq.hash][0]];
            identical = n;
        }
        if (!n) {
            return ulmanager.ulStart(File);
        }
        if (d) {
            ulmanager.logger.info(File.file.name, "ul_deduplicate", n);
        }
        api_req({
            a: 'g',
            g: 1,
            ssl: use_ssl,
            n: n.h
        }, {
            uq: uq,
            n: n,
            skipfile: (ul_skipIdentical && identical),
            callback: function(res, ctx) {
                if (res.e === ETEMPUNAVAIL && ctx.skipfile) {
                    ctx.uq.repair = ctx.n.key;
                    ulmanager.ulStart(File);
                }
                else if (typeof res === 'number' || res.e) {
                    ulmanager.ulStart(File);
                }
                else if (ctx.skipfile) {
                    onUploadSuccess(uq);
                    File.file.ul_failed = false;
                    File.file.retries = 0;
                    File.file.done_starting();
                }
                else {
                    File.file.filekey = ctx.n.key;
                    File.file.response = ctx.n.h;
                    File.file.faid = ctx.n.fa;
                    File.file.path = ctx.uq.path;
                    File.file.name = ctx.uq.name;
                    // File.file.done_starting();
                    ulmanager.ulFinalize(File.file);
                }
            }
        });
    },

    ulIdentical: function UM_ul_Identical(target, path, hash, size) {
        /* jshint -W074 */
        var n = M.d[target];
        if (!target || !path || !n) {
            return false;
        }
        var p = path.split('/');
        for (var i in p) {
            if (p.hasOwnProperty(i)) {
                if (!n) {
                    return false;
                }
                var foldername = p[i];
                var h = n.h;
                n = false;
                for (var j in M.c[h]) {
                    if (M.d[j] && M.d[j].name === foldername) {
                        if (M.d[j].t) {
                            n = M.d[j];
                        }
                        else if (p.length === parseInt(i) + 1
                                && (hash === M.d[j].hash || size === M.d[j].s)) {
                            return M.d[j];
                        }
                    }
                }
            }
        }
        return false;
    }
};


function UploadQueue() {}
inherits(UploadQueue, Array);

UploadQueue.prototype.push = function() {
    var pos = Array.prototype.push.apply(this, arguments) - 1;
    var file = this[pos];

    file.pos = pos;
    ulQueue.poke(file);

    return pos + 1;
};


function ChunkUpload(file, start, end) {
    this.file = file;
    this.ul = file;
    this.start = start;
    this.end = end;
    this.gid = file.owner.gid;
    this.xid = this.gid + '_' + start + '-' + end;
    this.jid = (Math.random() * Date.now()).toString(36);
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
        if (p.hasOwnProperty(i)) {
            tp += p[i];
        }
    }

    // only start measuring progress once the TCP buffers are filled
    // (assumes a modern TCP stack with a large intial window)
    if (!this.file.speedometer && this.file.progressevents > 5) {
        this.file.speedometer = bucketspeedometer(tp);
    }
    this.file.progressevents = (this.file.progressevents || 0) + 1;

    onUploadProgress(
            this.file,
            Math.floor(tp / this.file.size * 100),
            tp,
            this.file.size,
            GlobalProgress[this.gid].speed = (this.file.speedometer ? this.file.speedometer.progress(tp) : 0) // speed
        );

    if (tp === this.file.size) {
        this.file.complete = true;
    }
};

ChunkUpload.prototype.abort = function() {
    if (this.oet) {
        clearTimeout(this.oet);
    }
    if (this.xhr) {
        this.xhr.xhr_cleanup(0x9ffe);
    }
    if (GlobalProgress[this.gid]) {
        removeValue(GlobalProgress[this.gid].working, this, 1);
    }
    else if (d) {
        ulmanager.logger.error('This should not be reached twice or after FileUpload destroy...');
    }
    delete this.xhr;
};

ChunkUpload.prototype.on_upload_progress = function(args, xhr) {
    if (!this.file || !this.file.progress || this.file.abort) {
        return this.done && this.done();
    }
    this.file.progress[this.start] = args[0].loaded;
    this.updateprogress();
};

ChunkUpload.prototype.on_error = function(args, xhr, reason) {
    if (this.file && !this.file.abort && this.file.progress) {
        this.file.progress[this.start] = 0;
        this.updateprogress();

        if (!xhr) {
            xhr = this.xhr;
        }
        if (args === EKEY) {
            ulmanager.restart(this.file, reason, xhr);
        }
        else {
            ulmanager.retry(this.file, this, "xhr failed: " + reason, xhr);
        }
    }
    this.done();
}

ChunkUpload.prototype.on_ready = function(args, xhr) {
    if (!this.file || !this.file.progress) {
        if (d) {
            ulmanager.logger.error('Upload aborted... ' + this, this);
        }
        return Soon(this.done.bind(this));
    }
    if (xhr.status === 200 && typeof xhr.response === 'string' && xhr.statusText === 'OK') {
        var response = xhr.response;
        if (response.length > 27) {
            response = base64urldecode(response);
        }

        if (!response.length || response === 'OK' || response.length === 27) {
            this.file.sent += this.bytes.buffer.length || this.bytes.length;
            delete this.file.progress[this.start];
            this.updateprogress();

            if (response.length === 27) {
                var ul_key = this.file.ul_key;
                var t = Object.keys(this.file.ul_macs);
                t.sort(function(a, b) {
                        return parseInt(a) - parseInt(b);
                    });
                for (var i = 0; i < t.length; i++) {
                    t[i] = this.file.ul_macs[t[i]];
                }
                var mac = condenseMacs(t, this.file.ul_key);

                var filekey = [ul_key[0] ^ ul_key[4], ul_key[1] ^ ul_key[5], ul_key[2]
                        ^ mac[0] ^ mac[1], ul_key[3] ^ mac[2]
                        ^ mac[3], ul_key[4], ul_key[5], mac[0] ^ mac[1], mac[2] ^ mac[3]];

                if (u_k_aes && !this.file.ulCompletingPhase) {
                    // var ctx = {
                    // file: this.file,
                    // size: this.file.size,
                    // ul_queue_num : this.file.pos,
                    // callback : ul_completepending2,
                    // faid : this.file.faid
                    // };
                    // api_completeupload(response, ul_queue[file.id], filekey,ctx);
                    this.file.ulCompletingPhase = true;
                    this.file.filekey = filekey;
                    this.file.response = base64urlencode(response);
                    ulmanager.ulFinalize(this.file);
                }
                else {
                    ASSERT(0, 'BUG: Assigning to file.completion which is unused.');
                    this.file.completion.push([response.url, this.file, filekey, this.file.id]);
                }
            }

            this.bytes = null;

            this.file.retries = 0; /* reset error flag */

            return this.done();

        }
        else {
            ASSERT(0, "Invalid upload response: " + response);
            if (response !== EKEY) {
                return this.on_error(EKEY, null, "EKEY error");
            }
        }
    }

    this.srverr = xhr.status + 1;

    if (d) {
        ulmanager.logger.info(this + " bad response from server",
            xhr.status,
            this.file.name,
            typeof xhr.response === 'string',
            xhr.statusText
        );
    }

    this.oet = setTimeout(this.on_error.bind(this, null, xhr,
        "BRFS [l:" + (xhr.response ? xhr.response.length : 'Unk') + "]"), 1950 + Math.floor(Math.random() * 2e3));
}

ChunkUpload.prototype.upload = function() {

    if (!this.file) {
        if (d) {
            ulmanager.logger.error('This upload was cancelled while the Encrypter was working,'
                + ' prevent this aborting it beforehand');
        }
        return;
    }

    if (!this.file.posturl) {
        onUploadError(this.file, 'Internal error (0xBADF001)');
        if (!this.file.abort) {
            ASSERT(0, 'No PostURL! ' + (typeof this.file.posturl));
        }
        return;
    }

    var xhr = getXhr(this);
    xhr._murl = this.file.posturl;

    if (d) {
        ulmanager.logger.info("pushing", this.file.posturl + this.suffix);
    }


    xhr.open('POST', this.file.posturl + this.suffix);
    xhr.send(this.bytes.buffer);

    this.xhr = xhr;
};

ChunkUpload.prototype.io_ready = function(task, args) {
    if (args[0] || !this.file || !this.file.ul_keyNonce) {
        if (this.file) {
            if (d) {
                ulmanager.logger.error('UL IO Error', args[0]);
            }

            if (this.file.done_starting) {
                this.file.done_starting();
            }
            ulmanager.retry(this.file, this, "IO failed: " + args[0]);
        }
        else {
            if (d) {
                ulmanager.logger.error('The FileReader finished, but this upload was cancelled...');
            }
        }
    }
    else {
        task = [this, this.file.ul_keyNonce, this.start / 16, this.bytes];
        // TODO: Modify CreateWorkers() and use this gid to terminate over cancelled uploads
        task[this.gid] = 1;
        Encrypter.push(task, this.upload, this);
    }
    this.bytes = null;
};

ChunkUpload.prototype.done = function(ee) {
    if (d) {
        ulmanager.logger.info(this + '.done');
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
    this.file.ul_reader.push(this, this.io_ready, this);
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

FileUpload.prototype.destroy = function() {
    if (d) {
        ulmanager.logger.info('Destroying ' + this);
    }
    if (!this.file) {
        return;
    }
    // Hmm, looks like there are more ChunkUploads than what we really upload (!?)
    if (d) {
        ASSERT(GlobalProgress[this.gid].working.length === 0, 'Huh, there are working upload chunks?..');
    }
    if (is_chrome_firefox && this.file._close) {
        this.file._close();
    }
    ASSERT(this.file.owner === this, 'Invalid FileUpload Owner...');
    ulQueue.poke(this.file, 0xdead);
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

    if (ulmanager.ulStartingPhase || $('#ul_' + file.id).length === 0) {
        done();
        ASSERT(0, "This shouldn't happen");
        return ulQueue.pushFirst(this);
    }

    if (!GlobalProgress[this.gid].started) {
        GlobalProgress[this.gid].started = true;
    }

    if (d) {
        ulmanager.logger.info(file.name, "starting upload", file.id);
    }

    ulmanager.ulStartingPhase = true;

    var started = false;
    file.done_starting = function() {
        if (started) {
            return;
        }
        started = true;
        ulmanager.ulStartingPhase = false;
        delete file.done_starting;
        file = self = undefined;
        done();
    };

    try {
        if (file.hash && file.ts) {
            throw "The fingerprint exists already.";
        }
        if (!is_extension && file.gecko && !file.size && -1 === ua.indexOf('windows')) {
            throw new Error('!ZeroByte');
        }

        fingerprint(file, function(hash, ts) {
            if (!(file && self.file)) {
                if (d) {
                    ulmanager.logger.info('fingerprint', hash, 'UPLOAD CANCELED');
                }
                return;
            }
            file.hash = hash;
            file.ts = ts;
            var identical = ulmanager.ulIdentical(file.target,
                file.path || file.name, file.hash, file.size);
            if (d) {
                ulmanager.logger.info(file.name, "fingerprint", M.h[hash] || identical);
            }
            if (M.h[hash] || identical) {
                ulmanager.ulDeDuplicate(self, identical);
            }
            else {
                ulmanager.ulStart(self);
            }
        });
    }
    catch (e) {
        if (d) {
            ulmanager.logger.error('FINGERPRINT ERROR', file.name, file.size, e.message || e);
        }

        if (!is_extension && e.result === 0x80520015 /* NS_ERROR_FILE_ACCESS_DENIED */ || e.message === '!ZeroByte') {
            var msg =
                "Sorry, upload failed. " +
                "If you were trying to upload a folder, " +
                "please note you will need to use our extension for this to work.";

            if (!window['!ZeroByte']) {
                window['!ZeroByte'] = true;
                Later(firefoxDialog);
                msgDialog('warninga',
                    str_mtrunc(file.name, 40), msg, l[1677] + ': ' + (e.message || e.name || e));
            }
            ulmanager.abort(file);
            this.destroy();
        }
        else {
            ulmanager.ulStart(this);
        }
    }
};


/**
 *  Wrap fm_requestfolderid to make it parallel friendly
 */
var Mkdir = Parallel(function(args, next) {
    fm_requestfolderid(args[0], args[1], {
        callback: function(ctx, h) {
            next(h);
        }
    });
});

function isQueueActive(q) {
    return typeof q.id !== 'undefined';
}

var ulQueue = new TransferQueue(function _workerUploader(task, done) {
    if (d && d > 1) {
        ulQueue.logger.info('worker_uploader', task, done);
    }
    task.run(done);
}, ul_maxSlots, 'uploader');

ulQueue.poke = function(file, meth) {
    if (file.owner) {
        var gid = ulmanager.getGID(file);

        file.retries = 0;
        file.sent = 0;
        file.progress = {};
        file.posturl = "";
        file.completion = [];
        file.abort = true;

        ulQueue.pause(gid);
        ulQueue.filter(gid);

        if (file.__umRetryTimer) {
            var t = file.__umRetryTimer;
            for (var i in t) {
                if (t.hasOwnProperty(i)) {
                    clearTimeout(t[i]);
                }
            }
            ulQueue.resume();
        }
        if (file.ul_reader) {
            file.ul_reader.filter(gid);
            file.ul_reader.destroy();
        }
        if (!meth) {
            meth = 'pushFirst';
        }

        delete file.__umRetries;
        delete file.__umRetryTimer;
    }

    if (meth !== 0xdead) {
        file.sent = 0;
        file.progress = {};
        file.completion = [];
        file.owner = new FileUpload(file);
        file.ul_reader = ulmanager.ulFileReader(new FileReader(), file);
        ulQueue[meth || 'push'](file.owner);
    }
};

ulQueue.stuck = function() {
    // Check certain conditions to make sure the workaround isn't worse than the problem...
    if (ulQueue._running === 1
            && ulQueue._limit > 1 && ulQueue._queue.length && ulQueue._queue[0][0] instanceof FileUpload) {
        if (ASSERT(ulQueue._pending.length === 1, 'Invalid ulQueue pending state')) {
            var chunk = ulQueue._pending[0];
            if (ASSERT(chunk instanceof ChunkUpload, 'Invalid pending chunk')) {
                var id = ulmanager.getGID(chunk.ul);
                $('.transfer-table #' + id + ' td:eq(0)').text('Internal Error (0x7f023)');
                $('.transfer-table #' + id).attr('id', 'STUCKed_' + id);
                srvlog('Upload automatically aborted on stuck detection');
                ulmanager.abort(id);
            }
        }
    }
};

ulQueue.validateTask = function(pzTask) {
    // XXX: pzTask.file *must* be valid, it doesn't sometimes which indicates
    // a problem somewhere with the entry not getting removed from ulQueue._queue
    if (pzTask instanceof ChunkUpload && pzTask.file && (!pzTask.file.paused || pzTask.__retry)) {
        return true;
    }

    if (pzTask instanceof FileUpload && !ulmanager.ulStartingPhase && $('#ul_' + pzTask.file.id).length !== 0) {
        return true;
    }

    return false;
};


mBroadcaster.once('startMega', function _setupEncrypter() {
    var encrypter = CreateWorkers('encrypter.js', function(context, e, done) {
        var file = context.file;
        if (!file || !file.ul_macs) {
            // TODO: This upload was cancelled, we should terminate the worker rather than waiting
            if (d) {
                encrypter.logger.error('This upload was cancelled, we should terminate the worker rather than waiting');
            }
            return typeof e.data === 'string' || done();
        }

        if (typeof e.data === 'string') {
            if (e.data[0] === '[') {
                file.ul_macs[context.start] = JSON.parse(e.data);
            }
            else {
                encrypter.logger.info('WORKER:', e.data);
            }
        }
        else {
            context.bytes = new Uint8Array(e.data.buffer || e.data);
            context.suffix = '/' + context.start + '?c=' + base64urlencode(chksum(context.bytes.buffer));
            done();
        }
    }, 4);

    Object.defineProperty(window, 'Encrypter', { value: encrypter });
});

var ul_queue = new UploadQueue();
