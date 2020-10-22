function MegaUtils() {
    this.logger = new MegaLogger('MegaUtils');
    this.fscache = Object.create(null);

    if (typeof Intl !== 'undefined' && Intl.Collator) {
        this.collator = new Intl.Collator('co', {numeric: true});
    }
}

function MegaApi() {
    this.logger = new MegaLogger('MegaApi');
}

MegaApi.prototype = new FileManager();
MegaApi.prototype.constructor = MegaApi;

MegaUtils.prototype = new MegaApi();
MegaUtils.prototype.constructor = MegaUtils;

// TODO: refactor api_req-related functions here.
MegaApi.prototype.setDomain = function(aDomain, aSave) {
    apipath = 'https://' + aDomain + '/';

    if (aSave) {
        localStorage.apipath = apipath;
    }
};

MegaApi.prototype.staging = function(aSave) {
    this.setDomain('staging.api.mega.co.nz', aSave);
};

MegaApi.prototype.prod = function(aSave) {
    this.setDomain('eu.api.mega.co.nz', aSave);
};

MegaApi.prototype._apiReqInflight = Object.create(null);
MegaApi.prototype._apiReqPollCache = Object.create(null);

MegaApi.prototype._apiReqReplyCache = Object.create(null);
MegaApi.prototype._apiReqCacheIndex = {
    g: function(req) {
        'use strict';

        if (req.g) {
            // cache for four seconds.
            return -4;
        }

        // cache for the session lifetime
        return true;
    }
};

/**
 * Perform an API request, with capability of de-duplicating pending requests.
 * @param {Object|String} params The request parameters as an object.
 *                               If an string is provided, assumes a plain request with no additional parameters.
 * @param {Number} [ch] The channel to fire the request on.
 * @returns {MegaPromise} The promise is rejected if API gives a negative number.
 */
MegaApi.prototype.req = function(params, ch) {
    'use strict';

    if (typeof params === 'string') {
        params = {a: params};
    }

    var key = JSON.stringify(params);

    if (this._apiReqInflight[key]) {
        if (d) {
            console.info('Reusing pending api request...', params);
        }
        return this._apiReqInflight[key];
    }

    var self = this;
    var promise = new MegaPromise();

    if (this._apiReqReplyCache[key]) {
        var entry = this._apiReqReplyCache[key];

        if (Date.now() > entry[1]) {
            delete this._apiReqReplyCache[key];
        }
        else {
            onIdle(function() {
                if (d) {
                    console.info('Returning cached api request...', params, entry);
                }
                promise.resolve(entry[0]);
            });
            return promise;
        }
    }
    this._apiReqInflight[key] = promise;

    promise.always(function() {
        delete M._apiReqInflight[key];
    });

    api_req(params, {
        callback: tryCatch(function(res) {
            delete this.callback;

            if (typeof res === 'number' && res < 0) {
                promise.reject.apply(promise, arguments);
            }
            else {
                var cIdx = self._apiReqCacheIndex[params.a];

                if (cIdx) {
                    if (typeof cIdx === 'function') {
                        cIdx = cIdx(params);
                    }

                    self._apiReqReplyCache[key] = [clone(res), cIdx < 0 ? Date.now() + -cIdx * 1e3 : Infinity];
                }
                promise.resolve.apply(promise, arguments);
            }
        }, promise.reject.bind(promise, EFAILED))
    }, ch | 0);

    return promise;
};

/**
 * Wrapper around MegaApi.req with polling capabilities.
 * @param {Number} seconds The number of seconds to wait between requests, returning a cached result until exhausted.
 * @param {Object|String} params see MegaApi.req
 * @returns {MegaPromise}
 * @see MegaApi.req
 */
MegaApi.prototype.req.poll = function(seconds, params) {
    'use strict';

    var cache = M._apiReqPollCache;
    var key = JSON.stringify(params);
    var logger = d && MegaLogger.getLogger('req:poll');

    return new Promise(function _reqPollPromise(resolve, reject) {
        var feedback = function(entry) {
            if (entry.e) {
                reject(entry.r);
            }
            else {
                resolve(entry.r);
            }

            cache = params = resolve = reject = undefined;
        };

        var fill = function(error, res) {
            var entry = cache[key];
            if (!entry) {
                if (d) {
                    logger.debug('Storing cache entry...', key);
                }
                entry = cache[key] = Object.create(null);
            }

            entry.r = res;
            entry.e = error;

            if (entry.t) {
                clearTimeout(entry.t);
            }
            entry.t = setTimeout(function() {
                if (d) {
                    logger.debug('Expiring cache entry...', key);
                }
                var c = M._apiReqPollCache[key];
                delete M._apiReqPollCache[key];

                if (c && c.f) {
                    for (var i = c.f.length; i--;) {
                        if (d) {
                            logger.debug('Dispatching awaiting function call...', key, c);
                        }
                        c.f[i]();
                    }
                }
            }, Math.abs(seconds) * 1e3);

            feedback(entry);
        };

        if (cache[key]) {
            if (d) {
                logger.warn('Preventing API request from being re-fired.', params, cache[key]);
            }

            if (seconds < 0) {
                if (d) {
                    logger.debug('Awaiting to re-fire request...', params);
                }

                var c = cache[key];
                var f = _reqPollPromise.bind(this, resolve, reject);

                if (c.f) {
                    c.f.push(f);
                }
                else {
                    c.f = [f];
                }
            }
            else {
                feedback(cache[key]);
            }
        }
        else {
            M.req(params).tryCatch(fill.bind(null, false), fill.bind(null, true));
        }
    });
};

/**
 * A wrapper around MegaApi.req
 * @param {Array} params An array of parameters to pass through MegaApi.req
 * @returns {MegaPromise} The promise is *always* resolved with an Array of results for each API request.
 * @see MegaApi.req
 */
MegaApi.prototype.reqA = function(params) {
    'use strict';

    var self = this;
    var promise = new MegaPromise();
    var mapfn = function(v) {
        return self.req(v);
    };

    MegaPromise.allDone(params.map(mapfn)).unpack(promise.resolve.bind(promise));

    return promise;
};

/**
 * execCommandUsable
 *
 * Native browser 'copy' command using execCommand('copy').
 * Supported by Chrome42+, FF41+, IE9+, Opera29+
 * @returns {Boolean}
 */
MegaUtils.prototype.execCommandUsable = function() {
    var result;

    try {
        return document.queryCommandSupported("copy");
    }
    catch (ex) {
        try {
            result = document.execCommand('copy');
        }
        catch (ex) {
        }
    }

    return result === false;
};

/**
 * Utility that will return a sorting function (can compare numbers OR strings, depending on the data stored in the
 * obj), that can sort an array of objects.
 * @param key {String|Function} the name of the property that will be used for the sorting OR a func that will return a
 * dynamic value for the object
 * @param [order] {Number} 1 for asc, -1 for desc sorting
 * @param [alternativeFn] {Function} Optional function to be used for comparison of A and B if both are equal or
 *      undefined
 * @returns {Function}
 */
MegaUtils.prototype.sortObjFn = function(key, order, alternativeFn) {
    'use strict';

    if (!order) {
        order = 1;
    }

    if (typeof key !== 'function') {
        var k = key;
        key = function(o) {
            return o[k];
        };
    }

    return function(a, b, tmpOrder) {
        var currentOrder = tmpOrder ? tmpOrder : order;

        var aVal = key(a);
        var bVal = key(b);

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal, locale) * currentOrder;
        }
        else if (typeof aVal === 'string' && typeof bVal === 'undefined') {
            return 1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'string') {
            return -1 * currentOrder;
        }
        else if (typeof aVal === 'number' && typeof bVal === 'undefined') {
            return 1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'number') {
            return -1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'undefined') {
            if (alternativeFn) {
                return alternativeFn(a, b, currentOrder);
            }
            else {
                return -1 * currentOrder;
            }
        }
        else if (typeof aVal === 'number' && typeof bVal === 'number') {
            var _a = aVal || 0;
            var _b = bVal || 0;
            if (_a > _b) {
                return 1 * currentOrder;
            }
            if (_a < _b) {
                return -1 * currentOrder;
            }
            else {
                if (alternativeFn) {
                    return alternativeFn(a, b, currentOrder);
                }
                else {
                    return 0;
                }
            }
        }
        else {
            return 0;
        }
    };
};


/**
 * This is an utility function that would simply do a localCompare OR use Intl.Collator for comparing 2 strings.
 *
 * @param stringA {String} String A
 * @param stringB {String} String B
 * @param direction {Number} -1 or 1, for inversing the direction for sorting (which is most of the cases)
 * @returns {Number}
 */
MegaUtils.prototype.compareStrings = function megaUtilsCompareStrings(stringA, stringB, direction) {

    if (this.collator) {
        return this.collator.compare(stringA || '', stringB || '') * direction;
    }

    return (stringA || '').localeCompare(stringB || '') * direction;
};

/**
 * Promise-based XHR request
 * @param {Object|String} aURLOrOptions   URL or options
 * @param {Object|String} [aData]         Data to send, optional
 * @returns {MegaPromise}
 */
MegaUtils.prototype.xhr = megaUtilsXHR;

/**
 *  Retrieve a call stack
 *  @return {String}
 */
MegaUtils.prototype.getStack = function megaUtilsGetStack() {
    var stack;

    if (is_chrome_firefox) {
        stack = Components.stack.formattedStack;
    }

    if (!stack) {
        stack = (new Error()).stack;

        if (!stack) {
            try {
                throw new Error();
            }
            catch (e) {
                stack = e.stack;
            }
        }
    }

    return stack;
};

/**
 * Get function caller.
 * @returns {String} caller
 */
MegaUtils.prototype.getCaller = function megaUtilsGetCaller() {
    'use strict';
    var stackIdx = 2;
    var stack = M.getStack().split('\n');

    for (var i = stack.length; i--;) {
        if (stack[i].indexOf('getCaller') > 0) {
            stackIdx = i;
            break;
        }
    }

    stack = String(stack.splice(++stackIdx + (stack[0] === 'Error')));

    var m = stack.match(/at\s(\S+)/);
    if (m) {
        return String(m[1]).split(/[\s:]/)[0];
    }

    return '<unknown>';
};

/**
 *  Check whether there are pending transfers.
 *
 *  @return {Boolean}
 */
MegaUtils.prototype.hasPendingTransfers = function megaUtilsHasPendingTransfers() {
    'use strict';

    return (
        (fminitialized && ulmanager.isUploading) || dlmanager.isDownloading
            || typeof dlmanager.isStreaming === 'object'
    );
};

/**
 * On transfers completion cleanup
 */
MegaUtils.prototype.resetUploadDownload = function megaUtilsResetUploadDownload() {
    if (!ul_queue.some(isQueueActive)) {
        ul_queue = new UploadQueue();
        ulmanager.isUploading = false;
        ASSERT(ulQueue._running === 0, 'ulQueue._running inconsistency on completion');
        ulQueue._pending = [];
        ulQueue.setSize((fmconfig.ul_maxSlots | 0) || 4);

        if (page !== 'download') {

            if (mega.megadrop.isInit()) {
                mega.megadrop.onCompletion();
            }
        }
    }

    if (!dl_queue.some(isQueueActive)) {
        dl_queue = new DownloadQueue();
        dlmanager.isDownloading = false;
        dlQueue.setSize((fmconfig.dl_maxSlots | 0) || 4);
        dlQueue.resume();

        delay.cancel('overquota:retry');
        delay.cancel('overquota:uqft');

        dlmanager._quotaPushBack = {};
        dlmanager._dlQuotaListener = [];


        $.totalDL = false;
    }

    if (!dlmanager.isDownloading && !ulmanager.isUploading) {
        /* destroy all xhr */
        clearTransferXHRs();

        $('.transfer-pause-icon').addClass('disabled');
        $('.transfer-clear-all-icon').addClass('disabled');
        $('.nw-fm-left-icon.transfers').removeClass('transfering');
        $('.transfers .nw-fm-percentage li p').css('transform', 'rotate(0deg)');
        M.tfsdomqueue = Object.create(null);
        GlobalProgress = Object.create(null);
        delete $.transferprogress;
        if ($.mTransferAnalysis) {
            clearInterval($.mTransferAnalysis);
            delete $.mTransferAnalysis;
        }
        $('.transfer-panel-title span').text('');
        dlmanager.dlRetryInterval = 3000;
        percent_megatitle();

        if (dlmanager.onDownloadFatalError) {
            dlmanager.showMEGASyncOverlay(true, dlmanager.onDownloadFatalError);
            delete dlmanager.onDownloadFatalError;
        }
    }

    if (d) {
        dlmanager.logger.info("resetUploadDownload", ul_queue.length, dl_queue.length);
    }

    if (page === 'download') {
        delay('percent_megatitle', percent_megatitle);
    }
    else {
        fm_tfsupdate();
    }
};

/**
 *  Abort all pending transfers.
 *  @param force {boolean} Force to abort transfers or not
 *
 *  @return {MegaPromise}
 *          Resolved: Transfers were aborted
 *          Rejected: User canceled confirmation dialog
 *
 *  @details This needs to be used when an operation requires that
 *           there are no pending transfers, such as a logout.
 */
MegaUtils.prototype.abortTransfers = function megaUtilsAbortTransfers(force) {
    "use strict";
    var promise = new MegaPromise();
    force = force || false;

    var abort = function () {
        if (dlmanager.isDownloading) {
            dlmanager.abort(null);
        }
        if (ulmanager.isUploading) {
            ulmanager.abort(null);
        }
        if (typeof dlmanager.isStreaming === 'object') {
            dlmanager.isStreaming.abort();
        }
        dlmanager.isStreaming = false;

        M.resetUploadDownload();
        loadingDialog.show();
        var timer = setInterval(function() {
            if (!M.hasPendingTransfers()) {
                clearInterval(timer);
                promise.resolve();
            }
        }, 350);
    };

    if (!M.hasPendingTransfers()) {
        promise.resolve();
    } else {
        if (force) {
            abort();
        } else {
            msgDialog('confirmation', l[967], l[377] + ' ' + l[507] + '?', false, function(doIt) {
                if (doIt) {
                    abort();
                }
                else {
                    promise.reject();
                }
            });
        }
    }

    return promise;
};

/**
 *  Reload the site cleaning databases & session/localStorage.
 *
 *  Under non-activated/registered accounts this
 *  will perform a former normal cloud reload.
 */
MegaUtils.prototype.reload = function megaUtilsReload() {
    function _reload() {
        var u_sid = u_storage.sid;
        var u_key = u_storage.k;
        var privk = u_storage.privk;
        var jj = localStorage.jj;
        var debug = localStorage.d;
        var lang = localStorage.lang;
        var mcd = localStorage.testChatDisabled;
        var apipath = debug && localStorage.apipath;
        var cdlogger = debug && localStorage.chatdLogger;


        localStorage.clear();
        sessionStorage.clear();

        if (u_sid) {
            u_storage.sid = u_sid;
            u_storage.privk = privk;
            u_storage.k = u_key;
            localStorage.wasloggedin = true;
        }

        if (debug) {
            localStorage.d = 1;
            localStorage.minLogLevel = 0;

            if (location.host !== 'mega.nz') {
                localStorage.dd = true;
                if (!is_extension && jj) {
                    localStorage.jj = jj;
                }
            }
            if (apipath) {
                // restore api path across reloads, only for debugging purposes...
                localStorage.apipath = apipath;
            }

            if (cdlogger) {
                localStorage.chatdLogger = 1;
            }
        }

        if (mcd) {
            localStorage.testChatDisabled = 1;
        }
        if (lang) {
            localStorage.lang = lang;
        }
        if (hashLogic) {
            localStorage.hashLogic = 1;
        }

        localStorage.force = true;
        location.reload(true);
    }

    if (u_type !== 3 && page !== 'download') {
        stopsc();
        stopapi();
        loadfm(true);
    }
    else {
        // Show message that this operation will destroy the browser cache and reload the data stored by MEGA
        msgDialog('confirmation', l[761], l[7713], l[6994], function(doIt) {
            if (doIt) {
                M.abortTransfers().then(function() {
                    loadingDialog.show();
                    stopsc();
                    stopapi();

                    var waitingPromises = [
                        M.clearFileSystemStorage()
                    ];

                    if (window.megaChatIsReady) {
                        waitingPromises.push(megaChat.dropAllDatabases());
                    }

                    MegaPromise.allDone(waitingPromises).then(function(r) {
                        console.debug('megaUtilsReload', r);

                        if (fmdb) {
                            fmdb.invalidate(_reload);
                        }
                        else {
                            _reload();
                        }
                    });
                });
            }
        });
    }
};

/**
 * Clear the data on FileSystem storage.
 *
 * M.clearFileSystemStorage().always(console.debug.bind(console));
 */
MegaUtils.prototype.clearFileSystemStorage = function megaUtilsClearFileSystemStorage() {
    'use strict';

    var timer;
    var _done = function _done(status) {
        clearTimeout(timer);

        if (promise) {
            if (d) {
                console.timeEnd('fscleaning');
                console.log('FileSystem cleaning finished.', status);
            }

            if (status !== 0x7ffe) {
                promise.reject(status);
            }
            else {
                promise.resolve();
            }
            promise = undefined;
        }
    };

    if (is_chrome_firefox || !window.requestFileSystem) {
        return MegaPromise.resolve();
    }

    if (d) {
        console.time('fscleaning');
    }

    timer = setTimeout(function() {
        if (d) {
            console.warn('FileSystem cleaning timedout...');
        }
        _done();
    }, 4000);

    var promise = new MegaPromise();

    (function _clear(storagetype) {
        if (d) {
            console.log('Cleaning FileSystem storage...', storagetype);
        }

        function onInitFs(fs) {
            var dirReader = fs.root.createReader();
            (function _readEntries(e) {
                dirReader.readEntries(function(entries) {
                    if (!entries.length) {
                        _next(e || 0x7ffe);
                    }
                    else {
                        (function _iterate(e) {
                            var entry = entries.pop();

                            if (!entry) {
                                _readEntries(e);
                            }
                            else {
                                if (d > 1) {
                                    console.debug('Got FileEntry %s', entry.name, entry);
                                }

                                if (String(entry.name).endsWith('mega')) {
                                    var fn = entry.isDirectory ? 'removeRecursively' : 'remove';

                                    console.debug('Cleaning FileEntry %s...', entry.name, entry);

                                    entry[fn](_iterate, function(e) {
                                        console.warn('Failed to remove FileEntry %s', entry.name, entry, e);
                                        _iterate(e);
                                    });
                                }
                                else {
                                    _iterate();
                                }
                            }
                        })();
                    }
                });
            })();
        }

        function _next(status) {
            if (storagetype === 0) {
                _clear(1);
            }
            else {
                _done(status);
            }
        }

        window.requestFileSystem(storagetype, 1024, onInitFs, _next);
    })(0);

    return promise;
};

/**
 * Resources loader through our secureboot mechanism
 * @param {...*} var_args  Resources to load, either plain filenames or jsl2 members
 * @return {MegaPromise}
 */
MegaUtils.prototype.require = function megaUtilsRequire() {
    var files = [];
    var args = [];
    var logger = d && MegaLogger.getLogger('require', 0, this.logger);

    toArray.apply(null, arguments).forEach(function(rsc) {
        // check if a group of resources was provided
        if (jsl3[rsc]) {
            var group = Object.keys(jsl3[rsc]);

            args = args.concat(group);

            // inject them into jsl2
            for (var i = group.length; i--;) {
                if (!jsl2[group[i]]) {
                    (jsl2[group[i]] = jsl3[rsc][group[i]]).n = group[i];
                }
            }
        }
        else {
            args.push(rsc);
        }
    });

    args.forEach(function(file) {

        // If a plain filename, inject it into jsl2
        // XXX: Likely this will have a conflict with our current build script
        if (!jsl2[file]) {
            var filename = file.replace(/^.*\//, '');
            var extension = filename.split('.').pop().toLowerCase();
            var name = filename.replace(/\./g, '_');
            var type;

            if (extension === 'html') {
                type = 0;
            }
            else if (extension === 'js') {
                type = 1;
            }
            else if (extension === 'css') {
                type = 2;
            }

            jsl2[name] = {f: file, n: name, j: type};
            file = name;
        }

        if (!jsl_loaded[jsl2[file].n]) {
            files.push(jsl2[file]);
        }
    });

    if (files.length === 0) {
        // Everything is already loaded
        if (logger) {
            logger.debug('Nothing to load.', args);
        }
        return MegaPromise.resolve();
    }

    if (megaUtilsRequire.loading === undefined) {
        megaUtilsRequire.pending = [];
        megaUtilsRequire.loading = Object.create(null);
    }

    var promise = new MegaPromise();
    var rl = megaUtilsRequire.loading;
    var rp = megaUtilsRequire.pending;
    var loading = Object.keys(rl).length;

    // Check which files are already being loaded
    for (var i = files.length; i--;) {
        var f = files[i];

        if (rl[f.n]) {
            // loading, remove it.
            files.splice(i, 1);
        }
        else {
            // not loading, track it.
            rl[f.n] = M.getStack();
        }
    }

    // hold up if other files are loading
    if (loading) {
        rp.push([files, promise]);

        if (logger) {
            logger.debug('Queueing %d files...', files.length, args);
        }
    }
    else {

        (function _load(files, promise) {
            var onload = function() {
                // all files have been loaded, remove them from the tracking queue
                for (var i = files.length; i--;) {
                    delete rl[files[i].n];
                }

                if (logger) {
                    logger.debug('Finished loading %d files...', files.length, files);
                }

                // resolve promise, in a try/catch to ensure the caller doesn't mess us..
                try {
                    promise.resolve();
                }
                catch (ex) {
                    (logger || console).error(ex);
                }

                // check if there is anything pending, and fire it.
                var pending = rp.shift();

                if (pending) {
                    _load.apply(null, pending);
                }
            };

            if (logger) {
                logger.debug('Loading %d files...', files.length, files);
            }

            if (!files.length) {
                // nothing to load
                onload();
            }
            else {
                Array.prototype.push.apply(jsl, files);
                silent_loading = onload;
                jsl_start();
            }
        })(files, promise);
    }
    return promise;
};

/**
 *  Check single tab or multiple tabs and there are any active transfers.
 *  Show a proper message in the warning dialog before logging out.
 */
MegaUtils.prototype.logoutAbortTransfers = function megaUtilsLogoutAbortTransfers() {
    "use strict";
    var promise = new MegaPromise();
    var singleTab = true;


    var logoutAbort = function (htCase) {
        if (!M.hasPendingTransfers() && singleTab) {
            promise.resolve();
        }
        else {
            var hasTransferMsg = "";
            if (M.hasPendingTransfers() && singleTab) {
                hasTransferMsg = l[19931];
            }
            switch (htCase) {
                case "this":
                    hasTransferMsg = l[19931];
                    break;
                case "other":
                    hasTransferMsg = l[19932];
                    break;
                case "others":
                    hasTransferMsg = l[19933];
                    break;
                case "this+other":
                    hasTransferMsg = l[19934];
                    break;
                case "this+others":
                    hasTransferMsg = l[19935];
                    break;
            }

            msgDialog('confirmation', l[967], hasTransferMsg + ' ' + l[507] + '?', false, function(doIt) {
                if (doIt) {
                    watchdog.notify("abort_trans");
                    var targetPromise = M.abortTransfers(true);
                    promise.linkDoneAndFailTo(targetPromise);
                }
                else {
                    promise.reject();
                }
            });
        }
    };

    if (u_type === 0) {
        // if it's in ephemeral session
        watchdog.notify("abort_trans");
        var targetPromise = M.abortTransfers(true);
        promise.linkDoneAndFailTo(targetPromise);
    } else {
        watchdog.query("transing").always(function (res) {
            if (!res.length) {
                // if it's in normal session with a single tab
                logoutAbort();
            } else {
                // if it's in normal session with multiple tabs
                singleTab = false;

                // Watch all tabs and check hasPendingTransfers in each tab
                var hasTransferTabNum = 0;
                res.forEach(function (i) {
                    if (i) {
                        hasTransferTabNum++;
                    }
                });

                if ((hasTransferTabNum > 0) || M.hasPendingTransfers()) {
                    if (M.hasPendingTransfers()) {
                        if (hasTransferTabNum === 0) {
                            logoutAbort("this");
                        } else if (hasTransferTabNum === 1) {
                            logoutAbort("this+other");
                        } else {
                            logoutAbort("this+others");
                        }
                    } else {
                        if (hasTransferTabNum === 1) {
                            logoutAbort("other");
                        } else {
                            logoutAbort("others");
                        }
                    }
                } else {
                    promise.resolve();
                }
            }
        });
    }

    return promise;
};

/**
 *  Kill session and Logout
 */
MegaUtils.prototype.logout = function megaUtilsLogout() {
    "use strict";
    M.logoutAbortTransfers().then(function() {
        var step = 2;
        var finishLogout = function() {
            if (--step === 0) {
                u_logout(true);
                if (is_extension) {
                    location.reload();
                }
                else if (is_mobile) {
                    // Always go back to the Login page on logout on mobile
                    loadSubPage('login');
                    return location.reload();
                }

                var sitePath = getSitePath();
                if (sitePath.indexOf('fm/search/') > -1 || sitePath.indexOf('/chat') > -1) {
                    location.replace(getBaseUrl());
                }
                else if (location.href.indexOf('fm/user-management/invdet') > -1) {
                    var myHost = getBaseUrl() + '/fm/user-management/invoices';
                    location.replace(myHost);
                }
                else {
                    location.reload();
                }
            }
        };

        loadingDialog.show();
        mega.config.flush().always(finishLogout);
        var promises = [];

        if (fmdb && fmconfig.dbDropOnLogout) {
            promises.push(fmdb.drop());
        }

        if (window.megaChatIsReady) {
            if (megaChat.userPresence) {
                megaChat.userPresence.disconnect();
            }

            if (fmconfig.dbDropOnLogout) {
                promises.push(megaChat.dropAllDatabases());
            }
        }

        if (window.is_eplusplus) {
            promises.push(M.delPersistentData('e++ck'));
        }

        if (promises.length) {
            ++step;
            Promise.allSettled(promises).always(finishLogout);
        }

        if (u_privk && !loadfm.loading) {
            // Use the 'Session Management Logout' API call to kill the current session
            api_req({'a': 'sml'}, {callback: finishLogout});
        }
        else {
            finishLogout();
        }
    });
};

/**
 * Convert a version string (eg, 2.1.1) to an integer, for easier comparison
 * @param {String}  version The version string
 * @param {Boolean} hex     Whether give an hex result
 * @return {Number|String}
 */
MegaUtils.prototype.vtol = function megaUtilsVTOL(version, hex) {
    version = String(version).split('.');

    while (version.length < 4) {
        version.push(0);
    }

    version = ((version[0] | 0) & 0xff) << 24 |
        ((version[1] | 0) & 0xff) << 16 |
        ((version[2] | 0) & 0xff) << 8 |
        ((version[3] | 0) & 0xff);

    version >>>= 0;

    if (hex) {
        return version.toString(16);
    }

    return version;
};

/**
 * Retrieve data from storage servers.
 * @param {String|Object} aData           ufs-node's handle or public link
 * @param {Number}        [aStartOffset]  offset to start retrieveing data from
 * @param {Number}        [aEndOffset]    retrieve data until this offset
 * @param {Function}      [aProgress]     callback function which is called with the percent complete
 * @returns {MegaPromise}
 */
MegaUtils.prototype.gfsfetch = megaUtilsGFSFetch;

/**
 * Returns the currently running site version depending on if in development, on the live site or if in an extension
 * @returns {String} Returns the string 'dev' if in development or the currently running version e.g. 3.7.0
 */
MegaUtils.prototype.getSiteVersion = function() {

    // Use 'dev' as the default version if in development
    var version = 'dev';

    // If this is a production version the timestamp will be set
    if (buildVersion.timestamp !== '') {

        // Use the website build version by default
        version = buildVersion.website;

        // If an extension use the version of that (because sometimes there are independent deployments of extensions)
        if (is_extension) {
            version = (mega.chrome) ? buildVersion.chrome + ' ' +
                (ua.details.browser === 'Edgium' ? l[23326] : l[957]) :
                buildVersion.firefox + ' ' + l[959];
        }
    }

    return version;
};

/**
 * Fire "find duplicates"
 */
MegaUtils.prototype.findDupes = function() {
    loadingDialog.show();
    onIdle(function() {
        M.overrideModes = 1;
        loadSubPage('fm/search/~findupes');
    });
};

/**
 * Search for nodes
 * @param {String} searchTerm The search term to look for.
 * @returns {Promise}
 */
MegaUtils.prototype.fmSearchNodes = function(searchTerm) {
    'use strict';

    // Add log to see how often they use the search
    eventlog(99603, JSON.stringify([1, pfid ? 1 : 0, Object(M.d[M.RootID]).tf, searchTerm.length]), pfid);

    return new Promise(function(resolve, reject) {
        var promise = MegaPromise.resolve();
        var fill = function(nodes) {
            var r = 0;

            for (var i = nodes.length; i--;) {
                var n = nodes[i];
                if (M.nn[n.h]) {
                    r = 1;
                }
                else if (!n.fv) {
                    M.nn[n.h] = n.name;
                }
            }

            return r;
        };

        if (d) {
            console.time('fm-search-nodes');
        }

        if (!M.nn) {
            M.nn = Object.create(null);

            if (fmdb) {
                loadingDialog.show();
                promise = new Promise(function(resolve, reject) {
                    var ts = 0;
                    var max = 96;
                    var options = {
                        sortBy: 't',
                        limit: 16384,

                        query: function(db) {
                            return db.where('t').aboveOrEqual(ts);
                        },
                        include: function() {
                            return true;
                        }
                    };
                    var add = function(r) {
                        return r[r.length - 1].ts + fill(r);
                    };

                    onIdle(function _() {
                        var done = function(r) {
                            if (!Array.isArray(r)) {
                                return reject(r);
                            }

                            if (r.length) {
                                ts = add(r);

                                if (--max && r.length >= options.limit) {
                                    return onIdle(_);
                                }
                            }

                            if (ts >= 0) {
                                ts = -1;
                                max = 48;
                                r = null;
                                options.query = function(db) {
                                    return db.where('t').belowOrEqual(ts);
                                };
                                add = function(r) {
                                    return 1262304e3 - r[0].ts + -fill(r);
                                };
                                return onIdle(_);
                            }

                            resolve();
                        };
                        fmdb.getbykey('f', options).then(done).catch(done);
                    });
                });
            }
            else {
                fill(Object.values(M.d));
            }
        }

        promise.then(function() {
            var h;
            var filter = M.getFilterBySearchFn(searchTerm);

            if (folderlink) {
                M.v = [];
                for (h in M.nn) {
                    if (filter({name: M.nn[h]}) && h !== M.currentrootid) {
                        M.v.push(M.d[h]);
                    }
                }
                M.currentdirid = 'search/' + searchTerm;
                M.renderMain();
                M.onSectionUIOpen('cloud-drive');
                onIdle(resolve);
                // mBroadcaster.sendMessage('!sitesearch', searchTerm, 'folder-link', M.v.length);
            }
            else {
                var handles = [];

                for (h in M.nn) {
                    if (!M.d[h] && filter({name: M.nn[h]}) && handles.push(h) > 4e3) {
                        break;
                    }
                }

                loadingDialog.show();
                dbfetch.geta(handles).always(function() {
                    loadSubPage('fm/search/' + searchTerm);
                    loadingDialog.hide();
                    onIdle(resolve);
                });
            }

            if (d) {
                console.timeEnd('fm-search-nodes');
            }
        }).catch(function(ex) {
            loadingDialog.hide();
            msgDialog('warninga', l[135], l[47], ex);
            reject(ex);
        });
    });
};


/** check if the current M.v has any names duplicates.
 * @param {String}      id              Handle of the current view's parent
 * @returns {Object}    duplicates     if none was found it returns null
 * */
MegaUtils.prototype.checkForDuplication = function(id) {
    'use strict';
    if (M.currentrootid === M.RubbishID
        || id === 'shares'
        || String(id).indexOf('search/') > -1
        || M.getNodeRights(id) < 2) {
        return;
    }

    // at this point we have V prepared.

    var names = Object.create(null);

    // count duplications O(n)
    for (var k = 0; k < M.v.length; k++) {
        if (!names[M.v[k].name]) {
            names[M.v[k].name] = Object.create(null);
            names[M.v[k].name][M.v[k].t] = Object.create(null);
            names[M.v[k].name][M.v[k].t].total = 1;
            names[M.v[k].name][M.v[k].t].list = [M.v[k].h];
        }
        else {
            if (!names[M.v[k].name][M.v[k].t]) {
                names[M.v[k].name][M.v[k].t] = Object.create(null);
                names[M.v[k].name][M.v[k].t].total = 1;
                names[M.v[k].name][M.v[k].t].list = [M.v[k].h];
            }
            else {
                names[M.v[k].name][M.v[k].t].total++;
                names[M.v[k].name][M.v[k].t].list.push(M.v[k].h);
            }
        }
    }

    // extract duplication O(n), if we have any
    // O(1) if we dont have any
    var dups = Object.create(null);
    var dupsFolders = Object.create(null);

    if (M.v.length > Object.keys(names).length) {

        var found = false;

        for (var nodeName in names) {
            found = false;

            if (names[nodeName][0] && names[nodeName][0].total > 1) {
                dups[nodeName] = names[nodeName][0].list;
                found = true;
            }
            if (names[nodeName][1] && names[nodeName][1].total > 1) {
                dupsFolders[nodeName] = names[nodeName][1].list;
                found = true;
            }

            if (!found) {
                names[nodeName] = null;
            }
        }

        if (!Object.keys(dups).length && !Object.keys(dupsFolders).length) {
            if (d) {
                console.warn("No Duplications were found in the time when"
                    + "we have a mismatch in lengths "
                    + id + '. We have names intersected between files and folders');
            }
            return;
        }

        var resultObject = Object.create(null);
        resultObject.files = dups;
        resultObject.folders = dupsFolders;

        return resultObject;
    }
};

mBroadcaster.addListener('mega:openfolder', SoonFc(300, function(id) {
    'use strict';

    var dups = M.checkForDuplication(id);
    if (dups && (dups.files || dups.folders)) {
        var $bar = $('.duplicated-items-found').removeClass('hidden');

        $('.files-grid-view.fm').addClass('duplication-found');
        $('.fm-blocks-view.fm').addClass('duplication-found');
        $('.fix-me-btn', $bar).rebind('click.df', function() {
            fileconflict.resolveExistedDuplication(dups, id);
        });
        $('.fix-me-close', $bar).rebind('click.df', function() {
            $('.files-grid-view.fm').removeClass('duplication-found');
            $('.fm-blocks-view.fm').removeClass('duplication-found');
            $('.duplicated-items-found').addClass('hidden');
        });
    }
}));


/**
 * Handle a redirect from the mega.co.nz/#pro page to mega.nz/#pro page
 * and keep the user logged in at the same time
 *
 * @param {String} [data] optional data to decode
 * @returns {Boolean}
 */
MegaUtils.prototype.transferFromMegaCoNz = function(data) {
    'use strict';

    // Get site transfer data from after the hash in the URL
    var urlParts = /sitetransfer!(.*)/.exec(data || window.location);

    if (urlParts) {

        try {
            // Decode from Base64 and JSON
            urlParts = JSON.parse(atob(urlParts[1]));
        }
        catch (ex) {
            console.error(ex);
            loadSubPage('login');
            return false;
        }

        if (urlParts) {

            api_req({a: 'log', e: 99804, m: 'User tries to transfer a session from mega.co.nz.'});

            var toPage = String(urlParts[2] || 'fm').replace('#', '');
            // If the user is already logged in here with the same account
            // we can avoid a lot and just take them to the correct page
            if (JSON.stringify(u_k) === JSON.stringify(urlParts[0])) {
                loadSubPage(toPage);
                return false;
            }

            // If the user is already logged in but with a different account just load that account instead. The
            // hash they came from e.g. a folder link may not be valid for this account so just load the file manager.
            else if (u_k && (JSON.stringify(u_k) !== JSON.stringify(urlParts[0]))) {
                // if user click MEGAsync pro upgrade button and logged in as different account on webclient.
                msgDialog(
                    'warninga',
                    l[882],
                    l[19341],
                    '',
                    function() {
                        if (!urlParts[2] || String(urlParts[2]).match(/^fm/)) {
                            loadSubPage('fm');
                            return false;
                        }
                        loadSubPage(toPage);
                        return false;
                    }
                );

                return false;
            }

            // Likely that they have never logged in here before so we must set this
            localStorage.wasloggedin = true;
            u_logout();

            // Set master key, session ID and RSA private key
            u_storage = init_storage(sessionStorage);
            u_k = urlParts[0];
            u_sid = urlParts[1];
            if (u_k) {
                u_storage.k = JSON.stringify(u_k);
            }

            loadingDialog.show();

            var _goToPage = function() {
                loadingDialog.hide();
                loadSubPage(toPage);
            };

            var _rawXHR = function(url, data, callback) {
                M.xhr(url, JSON.stringify([data]))
                    .always(function(ev, data) {
                        var resp = data | 0;
                        if (typeof data === 'string' && data[0] === '[') {
                            try {
                                resp = JSON.parse(data)[0];
                            }
                            catch (ex) {
                            }
                        }
                        callback(resp);
                    });
            };

            // Performs a regular login as part of the transfer from mega.co.nz
            _rawXHR(apipath + 'cs?id=0&sid=' + u_sid, {'a': 'ug'}, function(data) {
                var ctx = {
                    checkloginresult: function(ctx, result) {
                        u_type = result;
                        if (toPage.substr(0, 1) === '!' && toPage.length > 7) {
                            _rawXHR(apipath + 'cs?id=0&domain=meganz',
                                {'a': 'g', 'p': toPage.substr(1, 8)},
                                function(data) {
                                    if (data) {
                                        dl_res = data;
                                    }
                                    _goToPage();
                                });
                        }
                        else {
                            _goToPage();
                        }
                    }
                };
                api_setsid(u_sid);
                u_storage.sid = u_sid;
                u_checklogin3a(data, ctx);
            });
            return false;
        }
    }
};

/**
 * Sanitise filename so that saving to local disk won't cause any issue...
 * @param {String} name The filename
 * @returns {String}
 */
MegaUtils.prototype.getSafeName = function(name) {
    // http://msdn.microsoft.com/en-us/library/aa365247(VS.85)
    name = ('' + name).replace(/["*/:<>?\\|]+/g, '.');

    if (name.length > 250) {
        name = name.substr(0, 250) + '.' + name.split('.').pop();
    }
    name = name.replace(/[\t\n\r\f\v]+/g, ' ');
    name = name.replace(/\u202E|\u200E|\u200F/g, '');

    var end = name.lastIndexOf('.');
    end = ~end && end || name.length;
    if (/^(?:CON|PRN|AUX|NUL|COM\d|LPT\d)$/i.test(name.substr(0, end))) {
        name = '!' + name;
    }
    return name;
};
/**
 * checking if name (file|folder)is satisfaying all OSs [Win + linux + Mac + Android + iOs] rules,
 * so syncing to local disks won't cause any issue...
 * we cant yet control cases in which :
 *     I sync a file named [x] from OS [A],
 *     to another device running another OS [B]
 *     And the name [x] breaks OS [B] rules.
 *
 * this method will be called to control, renamings from webclient UI.
 * @param {String} name The filename
 * @param {Boolean} [allowPathSep] whether to allow ether / or \ as a mean for nested folder creation requirements.
 * @returns {Boolean}
 */
MegaUtils.prototype.isSafeName = function(name, allowPathSep) {
    'use strict';
    // below are mainly denied in windows or android.
    // we can enhance this as much as we can as
    // denied chars set D = W + L + M + A + I
    // where W: denied chars on Winfows, L: on linux, M: on MAC, A: on Android, I: on iOS
    // minimized to NTFS only
    if (name.trim().length <= 0) {
        return false;
    }
    return !(name.search(allowPathSep ? /["*:<>?|]/ : /["*/:<>?\\|]/) >= 0 || name.length > 250);
};

/**
 * Sanitise path components so that saving to local disk won't cause any issue...
 * @param {String} path   The full path to sanitise
 * @param {String} [file] Optional filename to append
 * @returns {Array} Each sanitised path component as array members
 */
MegaUtils.prototype.getSafePath = function(path, file) {
    var res = ('' + (path || '')).split(/[\\\/]+/).map(this.getSafeName).filter(String);
    if (file) {
        res.push(this.getSafeName(file));
    }
    return res;
};

/**
 * Get the state of the storage
 * @param {Number|Boolean} [force] Do not use the cached u_attr value
 * @return {MegaPromise} 0: Green, 1: Orange (almost full), 2: Red (full)
 */
MegaUtils.prototype.getStorageState = function(force) {
    'use strict';
    var promise = new MegaPromise();

    if (!force && Object(u_attr).hasOwnProperty('^!usl')) {
        return promise.resolve(u_attr['^!usl'] | 0);
    }

    // XXX: Not using mega.attr.get since we don't want the result indexedDB-cached.
    M.req({'a': 'uga', 'u': u_handle, 'ua': '^!usl', 'v': 1}).then(function(res) {
        if (d) {
            console.debug('getStorageState', res);
            console.assert(res.av, 'Unexpected response...');
        }
        var value = base64urldecode(res.av || '');

        if (typeof u_attr === 'object') {
            u_attr['^!usl'] = value;
        }
        promise.resolve(value | 0);
    }).catch(function(ex) {
        if (d) {
            console.warn(ex);
        }
        promise.reject(ex);
    });

    return promise;
};

/**
 * Retrieve storage quota details, i.e. by firing an uq request.
 */
MegaUtils.prototype.getStorageQuota = function() {
    'use strict';
    var promise = new MegaPromise();

    M.req({a: 'uq', strg: 1, qc: 1})
        .then(function(res) {
            if (res.uslw === undefined) {
                res.uslw = 9000;
            }
            var data = Object.assign(Object.create(null), res, {
                max: res.mstrg,
                used: res.cstrg,
                isFull: res.cstrg / res.mstrg >= 1,
                percent: Math.floor(res.cstrg / res.mstrg * 100),
                isAlmostFull: res.cstrg / res.mstrg >= res.uslw / 10000
            });
            promise.resolve(data);
        })
        .catch(function(ex) {
            if (d) {
                console.warn(ex);
            }
            promise.reject(ex);
        });

    return promise;
};

/**
 * Check Storage quota.
 * @param {Number} timeout in milliseconds, defaults to 30 seconds
 */
MegaUtils.prototype.checkStorageQuota = function checkStorageQuota(timeout) {
    delay('checkStorageQuota', function _csq() {
        M.getStorageQuota().done(function(data) {
            if (data.percent < 100) {
                if (ulmanager.ulOverStorageQuota) {
                    onIdle(function() {
                        ulmanager.ulResumeOverStorageQuotaState();
                    });
                }
                if (is_mobile) {
                    mobile.overStorageQuotaOverlay.close();
                }
                if (u_attr) {
                    delete u_attr.uspw;
                }
            }
            M.showOverStorageQuota(data);
        });
    }, timeout || 30000);
};

/**
 * Check whether an operation could take the user over their storage quota
 * @param {Number} opSize The size needed by the operation
 * @returns {MegaPromise}
 */
MegaUtils.prototype.checkGoingOverStorageQuota = function(opSize) {
    'use strict';

    var promise = new MegaPromise();
    loadingDialog.pshow();

    M.getStorageQuota()
        .always(function() {
            loadingDialog.phide();
        })
        .fail(promise.reject.bind(promise))
        .done(function(data) {

            if (opSize === -1) {
                opSize = data.mstrg;
            }

            if (opSize > data.mstrg - data.cstrg) {
                var options = {custom: 1, title: l[882], body: l[16927]};

                M.showOverStorageQuota(data, options)
                    .always(function() {
                        promise.reject();
                    });
            }
            else {
                promise.resolve();
            }
        });

    return promise;
};

/**
 * Check whether the provided object is a TypedArray
 * @param {Object} obj The object to check
 * @returns {Boolean}
 */
MegaUtils.prototype.isTypedArray = function(obj) {
    'use strict';

    obj = Object(obj).constructor;
    return obj && obj.BYTES_PER_ELEMENT > 0;
};

/** @property MegaUtils.mTextEncoder */
lazy(MegaUtils.prototype, 'mTextEncoder', function() {
    'use strict';
    return new TextEncoder();
});

/**
 * Convert data to ArrayBuffer
 * @param {*} data the data to convert
 * @returns {Promise}
 */
MegaUtils.prototype.toArrayBuffer = promisify(function(resolve, reject, data) {
    'use strict';

    if (typeof data === 'string' && data.substr(0, 5) === 'data:') {
        data = dataURLToAB(data);
    }

    if (data instanceof Blob) {
        this.readBlob(data).then(resolve).catch(reject);
    }
    else if (typeof data === 'string' && data.substr(0, 5) === 'blob:') {
        M.xhr({url: data, type: 'arraybuffer'})
            .then(function(ev, data) {
                resolve(data);
            })
            .catch(function(ex, detail) {
                reject(detail || ex);
            });
    }
    else if (this.isTypedArray(data)) {
        if (data.byteLength !== data.buffer.byteLength) {
            resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
        }
        else {
            resolve(data.buffer);
        }
    }
    else if (data instanceof ArrayBuffer) {
        resolve(data);
    }
    else {
        if (typeof data !== 'string') {
            try {
                data = JSON.stringify(data);
            }
            catch (_) {
            }
        }

        resolve(this.mTextEncoder.encode('' + data).buffer);
    }
});

/**
 * Save files locally
 * @param {*} data The data to save to disk
 * @param {String} [filename] The file name
 * @returns {MegaPromise}
 */
MegaUtils.prototype.saveAs = function(data, filename) {
    'use strict';

    var promise = new MegaPromise();

    if (!filename) {
        filename = new Date().toISOString().replace(/\W/g, '') + '.txt';
    }

    var saveToDisk = function(data) {
        var dl = {awaitingPromise: promise};
        var io = new MemoryIO(Math.random().toString(36), dl);
        io.begin = function() {
            io.write(data, 0, function() {
                io.download(filename, false);
                promise.resolve();
            });
        };
        try {
            io.setCredentials(false, data.byteLength, filename);
        }
        catch (e) {
            promise.reject(e);
        }
    };

    if (this.isTypedArray(data)) {
        saveToDisk(data);
    }
    else {
        this.toArrayBuffer(data)
            .then(function(ab) {
                saveToDisk(new Uint8Array(ab));
            })
            .catch(function() {
                promise.reject.apply(promise, arguments);
            });
    }

    return promise;
};

/**
 * Read a Blob
 * @param {Blob|File} blob The blob to read
 * @param {String} [meth] The FileReader method to use, defaults to readAsArrayBuffer
 * @returns {Promise}
 */
MegaUtils.prototype.readBlob = function(blob, meth) {
    'use strict';
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(this.result);
        };
        reader.onerror = reject;
        reader[meth || 'readAsArrayBuffer'](blob);
    });
};

/**
 * Read a FileSystem's FileEntry
 * @param {FileEntry} entry the.file.entry
 * @param {String} [meth] The FileReader method to use, defaults to readAsArrayBuffer
 * @returns {Promise}
 */
MegaUtils.prototype.readFileEntry = function(entry, meth) {
    'use strict';
    return new Promise(function(resolve, reject) {
        if (String(entry) === '[object FileEntry]') {
            entry.file(function(file) {
                M.readBlob(file, meth).then(resolve).catch(reject);
            }, reject);
        }
        else {
            reject(EARGS);
        }
    });
};

/**
 * Helper function to quickly perform an IndexedDB (Dexie) operation
 * @param {String} name The database name
 * @param {Object} schema The database schema, Dexie-style
 * @returns {Promise}
 */
MegaUtils.prototype.onDexieDB = promisify(function(resolve, reject, name, schema) {
    'use strict';

    var db = new Dexie(name);
    db.version(1).stores(schema);
    db.open().then(resolve.bind(null, db)).catch(function(ex) {
        onIdle(db.close.bind(db));

        if (ex && ex.name === 'InvalidStateError') {
            // Firefox in PBM?
            return resolve(null);
        }

        reject(ex);
    });
});

/**
 * Wrapper around M.onDexieDB() for the persistent storage functions.
 * @param {String} [action] Pre-defined action to perform.
 * @param {String} [key] action key.
 * @param {String} [value] action key value.
 * @returns {Promise}
 */
MegaUtils.prototype.onPersistentDB = promisify(function(resolve, reject, action, key, value) {
    'use strict';

    this.onDexieDB('$ps', {kv: '&k'}).then(function(db) {
        if (!action) {
            // No pre-defined action given, the caller is responsible of db.close()'ing
            resolve(db);
        }
        else if (db) {
            var c = db.kv;
            var r = action === 'get' ? c.get(key) : action === 'set' ? c.put({k: key, v: value}) : c.delete(key);

            r.then(function(result) {
                onIdle(db.close.bind(db));
                resolve(action === 'get' ? result.v : null);
            }).catch(reject);
        }
        else {
            M.onPersistentDB.fallback.call(null, action, key, value).then(resolve, reject);
        }
    }, reject);
});

/**
 * indexedDB persistence fallback.
 * @param {String} action The fallback action being performed
 * @param {String} key The storage key identifier
 * @param {*} [value] The storage key value
 * @returns {Promise}
 */
MegaUtils.prototype.onPersistentDB.fallback = promisify(function(resolve, reject, action, key, value) {
    'use strict';
    var pfx = '$ps!';
    key = pfx + (key || '');

    var getValue = function(key) {
        var value = localStorage[key];
        if (value) {
            value = tryCatch(JSON.parse.bind(JSON))(value) || value;
        }
        return value;
    };

    if (action === 'set') {
        value = tryCatch(JSON.stringify.bind(JSON))(value) || value;
        if (d && String(value).length > 4096) {
            console.warn('Storing more than 4KB...', key, [value]);
        }
        localStorage[key] = value;
    }
    else if (action === 'get') {
        value = getValue(key);
    }
    else if (action === 'rem') {
        value = localStorage[key];
        delete localStorage[key];
    }
    else if (action === 'enum') {
        var entries = Object.keys(localStorage)
            .filter(function(k) {
                return k.startsWith(key);
            })
            .map(function(k) {
                return k.substr(pfx.length);
            });
        var result = entries;

        if (value) {
            // Read contents
            result = Object.create(null);

            for (var i = entries.length; i--;) {
                result[entries[i]] = getValue(pfx + entries[i]);
            }
        }

        value = result;
    }

    resolve(value);
});

// Get FileSystem storage ignoring polyfills.
lazy(MegaUtils.prototype, 'requestFileSystem', function() {
        'use strict';

        if (!is_chrome_firefox) {
            var requestFileSystem = window.webkitRequestFileSystem || window.requestFileSystem;

            if (typeof requestFileSystem === 'function') {
                return requestFileSystem.bind(window);
            }
        }
});

/**
 * Get access to persistent FileSystem storage
 * @param {Boolean} [writeMode] Whether we want write access
 * @param {String|Number} [token] A token to store reusable fs instances
 * @returns {Promise}
 */
MegaUtils.prototype.getFileSystemAccess = promisify(function(resolve, reject, writeMode, token) {
    'use strict';

    var self = this;

    if (Object(this.fscache[token]).ts + 7e6 > Date.now()) {
        resolve(this.fscache[token].fs);
    }
    else if (navigator.webkitPersistentStorage && M.requestFileSystem) {
        var success = function(fs) {
            if (token) {
                self.fscache[token] = {ts: Date.now(), fs: fs};
            }
            resolve(fs);
        };
        var request = function(quota) {
            M.requestFileSystem(1, quota, success, reject);
        };

        delete this.fscache[token];
        navigator.webkitPersistentStorage.queryUsageAndQuota(function(used, remaining) {
            if (remaining) {
                request(remaining);
            }
            else if (writeMode) {
                navigator.webkitPersistentStorage.requestQuota(1e10, request, reject);
            }
            else {
                reject(EBLOCKED);
            }
        }, reject);
    }
    else {
        reject(ENOENT);
    }
});

/**
 * Get access to an entry in persistent FileSystem storage
 * @param {String} filename The filename under data will be stored
 * @param {Boolean} [create] Whether the file(s) should be created
 * @returns {Promise}
 */
MegaUtils.prototype.getFileSystemEntry = promisify(function(resolve, reject, filename, create) {
    'use strict';

    create = create || false;

    this.getFileSystemAccess(create, seqno)
        .then(function(fs) {
            if (String(filename).indexOf('/') < 0) {
                filename += '.mega';
            }
            fs.root.getFile(filename, {create: create}, resolve, reject);
        }, reject);
});

/**
 * Retrieve metadata for a filesystem entry
 * @param {FileEntry|String} entry A FileEntry instance or filename
 * @returns {Promise}
 */
MegaUtils.prototype.getFileEntryMetadata = promisify(function(resolve, reject, entry) {
    'use strict';

    var getMetadata = function(entry) {
        entry.getMetadata(resolve, reject);
    };

    if (String(entry) === '[object FileEntry]') {
        getMetadata(entry);
    }
    else {
        this.getFileSystemEntry(entry).then(getMetadata).catch(reject);
    }
});

/**
 * Retrieve all *root* entries in the FileSystem storage.
 * @param {String} [aPrefix] Returns entries matching with this prefix
 * @param {Boolean} [aMetaData] Whether metadata should be retrieved as well, default to true
 * @returns {Promise}
 */
MegaUtils.prototype.getFileSystemEntries = promisify(function(resolve, reject, aPrefix, aMetaData) {
    'use strict';

    this.getFileSystemAccess(false, seqno)
        .then(function(fs) {
            var entries = [];
            var reader = fs.root.createReader();

            var success = function() {
                var mega = Object.create(null);

                for (var i = entries.length; i--;) {
                    var name = String(entries[i].name);

                    if (entries[i].isFile && name.substr(-5) === '.mega') {
                        mega[name.substr(0, name.length - 5)] = entries[i];
                    }
                }
                resolve(mega);
            };

            var getMetadata = function(idx) {
                var next = function() {
                    onIdle(getMetadata.bind(this, ++idx));
                };

                if (idx === entries.length) {
                    success();
                }
                else if (entries[idx].isFile) {
                    entries[idx].getMetadata(function(metadata) {
                        entries[idx].date = metadata.modificationTime;
                        entries[idx].size = metadata.size;
                        next();
                    }, next);
                }
                else {
                    next();
                }
            };

            (function _readEntries() {
                reader.readEntries(function(result) {
                    if (result.length) {
                        if (aPrefix) {
                            for (var i = result.length; i--;) {
                                if (String(result[i].name).startsWith(aPrefix)) {
                                    entries.push(result[i]);
                                }
                            }
                        }
                        else {
                            entries = entries.concat(result);
                        }
                        _readEntries();
                    }
                    else if (aMetaData !== false) {
                        getMetadata(0);
                    }
                    else {
                        success();
                    }
                }, reject);
            })();
        }).catch(reject);
});

/**
 * Retrieve data saved into persistent storage
 * @param {String} k The key identifying the data
 * @returns {Promise}
 */
MegaUtils.prototype.getPersistentData = promisify(function(resolve, reject, k) {
    'use strict';

    var self = this;
    var fallback = function() {
        self.onPersistentDB('get', k).then(resolve, reject);
    };

    if (M.requestFileSystem) {
        var tmpPromise = this.getFileSystemEntry(k);

        tmpPromise.then(function(entry) {
            return self.readFileEntry(entry, 'readAsText');
        }).then(function(data) {
            resolve(JSON.parse(data));
        }).catch(function(ex) {
            if (ex && ex.name === 'SecurityError') {
                // Running on Incognito mode?
                return fallback();
            }
            reject(ex);
        });
    }
    else {
        fallback();
    }
});

/**
 * Save data into persistent storage
 * @param {String} k The key identifying the data to store
 * @param {*} v The value/data to store
 * @returns {Promise}
 */
MegaUtils.prototype.setPersistentData = promisify(function(resolve, reject, k, v) {
    'use strict';

    var self = this;
    var fallback = function() {
        self.onPersistentDB('set', k, v).then(resolve, reject);
    };

    if (M.requestFileSystem) {
        var tmpPromise = this.getFileSystemEntry(k, true);

        tmpPromise.then(function(entry) {
            entry.createWriter(function(writer) {

                writer.onwriteend = function() {
                    if (writer.readyState !== writer.DONE) {
                        return reject(EACCESS);
                    }

                    writer.onwriteend = function() {
                        resolve();
                    };

                    writer.write(new Blob([tryCatch(JSON.stringify.bind(JSON))(v) || '{}']));
                };

                writer.onerror = function(e) {
                    reject(e);
                };

                writer.truncate(0);

            }, reject);
        }).catch(function(ex) {
            if (Object(ex).name === 'SecurityError') {
                // Running on Incognito mode?
                return fallback();
            }
            reject(ex);
        });
    }
    else {
        fallback();
    }
});

/**
 * Remove previously stored persistent data
 * @param {String} k The key identifying the data
 * @returns {Promise}
 */
MegaUtils.prototype.delPersistentData = promisify(function(resolve, reject, k) {
    'use strict';

    var self = this;
    var fallback = function() {
        self.onPersistentDB('rem', k).then(resolve, reject);
    };

    if (M.requestFileSystem) {
        var tmpPromise = this.getFileSystemEntry(k);

        tmpPromise.then(function(entry) {
            entry.remove(resolve, reject);
        }).catch(function(ex) {
            if (ex && ex.name === "SecurityError") {
                // Running on Incognito mode?
                return fallback();
            }
            reject(ex);
        });
    }
    else {
        fallback();
    }
});

/**
 * Enumerates all persistent data entries
 * @param {String} [aPrefix] Returns entries matching with this prefix
 * @param {Boolean} [aReadContents] Whether the contents must be read as well
 * @returns {MegaPromise}
 */
MegaUtils.prototype.getPersistentDataEntries = promisify(function(resolve, reject, aPrefix, aReadContents) {
    'use strict';

    var self = this;
    var fallback = function() {
        self.onPersistentDB().then(function(db) {
            if (db) {
                var dbc = db.kv;

                if (aPrefix) {
                    dbc = dbc.where('k').startsWith(aPrefix);
                }
                else {
                    dbc = dbc.toCollection();
                }

                dbc[aReadContents ? 'toArray' : 'keys']()
                    .then(function(entries) {
                        onIdle(db.close.bind(db));

                        if (!aReadContents) {
                            return resolve(entries);
                        }

                        var result = Object.create(null);
                        for (var i = entries.length; i--;) {
                            result[entries[i].k] = entries[i].v;
                        }
                        resolve(result);
                    });
            }
            else {
                self.onPersistentDB.fallback('enum', aPrefix, aReadContents).then(resolve, reject);
            }
        }, reject);
    };

    if (M.requestFileSystem) {
        this.getFileSystemEntries(aPrefix, false)
            .then(function(result) {
                var entries = Object.keys(result);

                if (!aReadContents) {
                    return resolve(entries);
                }

                var promises = [];
                for (var i = 0; i < entries.length; ++i) {
                    promises.push(M.readFileEntry(result[entries[i]], 'readAsText'));
                }

                Promise.allSettled(promises)
                    .then(function(r) {
                        var parse = tryCatch(JSON.parse.bind(JSON), false);

                        for (var i = 0; i < r.length; ++i) {
                            if (r[i].status === 'fulfilled') {
                                result[entries[i]] = parse(r[i].value);
                            }
                            else {
                                console.warn('Failed to read filesystem entry...', entries[i], r[i].reason);
                                result[entries[i]] = false;
                            }
                        }
                        resolve(result);
                    })
                    .catch(reject);
            }).catch(function(ex) {
                if (Object(ex).name === "SecurityError") {
                    // Running on Incognito mode?
                    return fallback();
                }
                reject(ex);
            });
    }
    else {
        fallback();
    }
});

/**
 * Returns the name of a country given a country code in the users current language.
 * Will return Null if the requested countrycode does not exist.
 * @param {String} countryCode The countrycode of the country to get the name of
 * @returns {Null|String}.
 */
MegaUtils.prototype.getCountryName = function(countryCode) {
    'use strict';

    if (!this._countries) {
        this.getCountries();
    }

    // Get the stringid for the country code specified.
    if (this._countries.hasOwnProperty(countryCode)) {
        return this._countries[countryCode];
    } else {
        return null;
    }
};

/**
 * Returns an object with all countryCodes:countryNames in the user set language.
 * @returns Object
 */
MegaUtils.prototype.getCountries = function() {
    'use strict';

    if (!this._countries) {
        this._countries = (new RegionsCollection()).countries;
    }
    return this._countries;
};

/**
 * Returns an object with all the stateCodes:stateNames.
 * @returns Object
 */
MegaUtils.prototype.getStates = function() {
    'use strict';

    if (!this._states) {
        this._states = (new RegionsCollection()).states;
    }
    return this._states;
};

/**
 * Return a country call code for a given country
 * @param {String} isoCountryCode A two letter ISO country code e.g. NZ, AU
 * @returns {String} Returns the country international call code e.g. 64, 61
 */
MegaUtils.prototype.getCountryCallCode = function(isoCountryCode) {
    'use strict';

    if (!this._countryCallCodes) {
        this._countryCallCodes = (new RegionsCollection()).countryCallCodes;
    }
    return this._countryCallCodes[isoCountryCode];
};

/**
 * Check user trying to upload folder by drag and drop.
 * @param {Event} event
 * @returns {Boolean}
 */
MegaUtils.prototype.checkFolderDrop = function(event) {

    'use strict';

    /**
     * Check user trying to upload folder.
     */
    if (d) {
        console.log('Checking user uploading folder.');
    }

    var checkWebkitItems = function _checkWebkitItems() {
        var items = event.dataTransfer.items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].webkitGetAsEntry) {
                var item = items[i].webkitGetAsEntry();
                if (item && item.isDirectory) {
                    return true;
                }
            }
        }
    };

    var checkMozItems = function _checkMozItems() {
        try {
            var m = event.dataTransfer.mozItemCount;
            for (var j = 0; j < m; ++j) {
                file = event.dataTransfer.mozGetDataAt("application/x-moz-file", j);
                if (file instanceof Ci.nsIFile) {
                    filedrag_u = [];
                    if (j === m - 1) {
                        $.dostart = true;
                    }
                    var mozitem = new mozDirtyGetAsEntry(file); /*,e.dataTransfer*/
                    if (mozitem.isDirectory) {
                        return true;
                    }
                }
                else {
                    if (d) {
                        console.log('FileSelectHandler: Not a nsIFile', file);
                    }
                }
            }
        }
        catch (e) {
            alert(e);
            Cu.reportError(e);
        }
    };

    if (event.dataTransfer
        && event.dataTransfer.items
        && event.dataTransfer.items.length > 0 && event.dataTransfer.items[0].webkitGetAsEntry) {
        return checkWebkitItems();
    }
    else if (is_chrome_firefox && event.dataTransfer) {
        return checkMozItems();
    }
    // else {
    // ie does not support DataTransfer.items property.
    // Therefore cannot recognise what user upload is folder or not.
    // }

    return false;
};
