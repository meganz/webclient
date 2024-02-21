function MegaUtils() {
    'use strict';
    this.fscache = Object.create(null);

    if (typeof Intl !== 'undefined' && Intl.Collator) {
        this.collator = new Intl.Collator('co', {numeric: true});
    }
}

MegaUtils.prototype = new FileManager();
MegaUtils.prototype.constructor = MegaUtils;

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
    'use strict';
    return String(new Error('trace').stack);
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

        if (is_megadrop) {
            mega.fileRequestUpload.onUploadCompletion();
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
 * Save new UI language.
 * @param {String} The new lang
 * @returns {Promise}
 */
MegaUtils.prototype.uiSaveLang = promisify(function(resolve, reject, aNewLang) {
    'use strict';
    assert(aNewLang !== window.lang);

    const ack = async() => {
        let storage = localStorage;

        loadingDialog.hide();

        /**
        if ('csp' in window) {
            await csp.init();

            if (!csp.has('pref')) {
                storage = sessionStorage;
            }
        }
        /**/

        // Store the new language in localStorage to be used upon reload
        storage.lang = aNewLang;

        // If there are transfers, ask the user to cancel them to reload...
        M.abortTransfers().then(resolve).catch(function(ex) {
            console.debug('Not reloading upon language change...', ex);
            reject(ex);
        });
    };
    loadingDialog.show();

    // Set a language user attribute on the API (This is a private but unencrypted user
    // attribute so that the API can read it and send emails in the correct language)
    if (window.u_handle) {
        mega.attr.set(
            'lang',
            aNewLang,      // E.g. en, es, pt
            -2,            // Set to private private not encrypted
            true           // Set to non-historic, this won't retain previous values on API server
        ).then(function() {
            setTimeout(ack, 2e3);
        }).catch(ack);
    }
    else {
        ack();
    }
});

/**
 *  Reload the site cleaning databases & session/localStorage.
 *
 *  Under non-activated/registered accounts this
 *  will perform a former normal cloud reload.
 */
MegaUtils.prototype.reload = function megaUtilsReload(force) {
    'use strict';
    const _reload = () => {
        var u_sid = u_storage.sid;
        var u_key = u_storage.k;
        var privk = u_storage.privk;
        var jj = localStorage.jj;
        var debug = localStorage.d;
        var lang = localStorage.lang;
        var mcd = localStorage.testChatDisabled;
        var apipath = debug && localStorage.apipath;
        var cdlogger = debug && localStorage.chatdLogger;
        const rad = sessionStorage.rad;
        const {
            mInfinity,
            megaLiteMode,
            allownullkeys,
            testLargeNodes
        } = localStorage;

        force = force || sessionStorage.fmAetherReload;

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

        if (rad) {
            sessionStorage.rad = 1;
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
        if (allownullkeys) {
            localStorage.allownullkeys = 1;
        }
        if (mInfinity) {
            localStorage.mInfinity = 1;
        }
        if (megaLiteMode) {
            localStorage.megaLiteMode = 1;
        }
        if (testLargeNodes) {
            localStorage.testLargeNodes = 1;
        }

        if (force) {
            localStorage.force = true;
        }
        else {
            sessionStorage.fmAetherReload = 1;
        }
        location.reload(true);
        loadingDialog.hide();
    };

    if (u_type !== 3 && page !== 'download') {
        api.stop();
        waitsc.stop();
        loadfm(true);
        return;
    }

    // Show message that this operation will destroy the browser cache and reload the data stored by MEGA
    msgDialog('confirmation', l[761], l[7713], l[6994], (doIt) => {
        if (!doIt) {
            return;
        }

        let shouldAbortTransfers = true;
        if (!ulmanager.isUploading) {
            const queue = dl_queue.filter(isQueueActive);
            let i = queue.length;
            while (i--) {
                if (!queue[i].hasResumeSupport) {
                    break;
                }
            }
            shouldAbortTransfers = i >= 0;
        }

        const promise = shouldAbortTransfers ? M.abortTransfers() : Promise.resolve();

        promise.then(() => {
            const waitingPromises = [];

            loadingDialog.show();
            waitsc.stop();
            api.stop();

            if (window.delay) {
                delay.abort();
            }

            if (force === -0x7e080f) {
                if (mega.infinity) {
                    delete localStorage.mInfinity;
                }
                else {
                    localStorage.mInfinity = 1;
                }
                delete localStorage.megaLiteMode;
            }

            if (window.fmdb) {
                waitingPromises.push(fmdb.invalidate());
            }

            if (shouldAbortTransfers) {
                waitingPromises.push(M.clearFileSystemStorage());
            }
            else {
                // Trick our onbeforeunlaod() handler.
                dlmanager.isDownloading = false;
            }

            if (window.megaChatIsReady) {
                waitingPromises.push(megaChat.dropAllDatabases());
            }

            Promise.allSettled(waitingPromises).then(dump).finally(_reload);
        });
    });
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
            else if (jsl.length) {
                if (logger) {
                    logger.debug('File(s) externally being loaded, holding up...');
                }
                mBroadcaster.once('startMega', SoonFc(90, _load.bind(this, files, promise)));
            }
            else {
                Array.prototype.push.apply(jsl, files);
                console.assert(!silent_loading, 'There is another silent loader... ' + silent_loading);
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
            const afterLogout = () => {
                if (is_extension) {
                    location.reload();
                }

                var sitePath = getSitePath();
                if (sitePath.includes('fm/search/')
                    || sitePath.includes('/chat')
                    || sitePath.includes('keybackup')) {

                    location.replace(getBaseUrl());
                }
                else if (location.href.indexOf('fm/user-management/invdet') > -1) {
                    var myHost = getBaseUrl() + '/fm/user-management/invoices';
                    location.replace(myHost);
                }
                else {
                    location.reload();
                }
            };

            if (--step === 0) {
                u_logout(true).then(() => afterLogout());
            }
        };

        loadingDialog.show();
        window.onerror = null;
        window.isLoggingOut = true;
        const promises = [mega.config.flush()];

        if ('rad' in mega) {
            mega.rad.log('\ud83d\udd1a', 'Logging out...');
            promises.push(tSleep(4 / 10).then(() => mega.rad.flush()));
        }

        if (fmdb && fmconfig.dbDropOnLogout) {
            promises.push(fmdb.drop());
        }

        if (window.megaChatIsReady) {
            megaChat.isLoggingOut = true;

            if (megaChat.userPresence) {
                megaChat.userPresence.disconnect();
            }

            if (fmconfig.dbDropOnLogout) {
                promises.push(megaChat.dropAllDatabases());
            }

            megaChat.destroy(true);
        }

        if (window.is_eplusplus) {
            promises.push(M.delPersistentData('e++ck'));
        }

        Promise.allSettled(promises)
            .then((res) => {
                if (self.d) {
                    console.debug('logging out...', tryCatch(() => JSON.stringify(res), false)() || res);
                }
                waitsc.stop();
                // XXX: using a batched-command for sml to forcefully flush any pending
                //      API request, otherwise they could fail with a -15 (ESID) error.
                return u_type !== false && api.req([{a: 'sml'}]);
            })
            .catch(dump)
            .finally(() => {
                step = 1;
                finishLogout();
            });
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

    if (String(searchTerm).startsWith('--')) {
        if (pfid) {
            onIdle(() => M.filterBySearch(searchTerm));
        }
        return Promise.resolve();
    }

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
                $('.fm-right-header .fm-breadcrumbs-wrapper').addClass('hidden');
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
                    loadingDialog.hide();
                    resolve();
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
        || !M.d[id]
        || M.getNodeRights(id) < 2) {
        return;
    }

    if (d) {
        console.time('checkForDuplication');
    }

    // at this point we have V prepared.

    var names = Object.create(null);

    // count duplications O(n)
    for (let i = M.v.length; i--;) {
        const n = M.v[i] || false;

        if (!n.name || missingkeys[n.h] || n.p !== id) {
            if (d) {
                console.debug('name-less node', missingkeys[n.h], [n]);
            }
            continue;
        }

        let target = names[n.name];
        if (!target) {
            names[n.name] = target = Object.create(null);
        }

        target = target[n.t];
        if (!target) {
            names[n.name][n.t] = target = Object.create(null);
            target.total = 0;
            target.list = [];
        }

        target.total++;
        target.list.push(n.h);
    }

    if (d) {
        console.timeEnd('checkForDuplication');
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
        var $bar = $('.fm-notification-block.duplicated-items-found').addClass('visible');

        $('.fix-me-btn', $bar).rebind('click.df', function() {
            fileconflict.resolveExistedDuplication(dups, id);
        });
        $('.fix-me-close', $bar).rebind('click.df', function() {
            $bar.removeClass('visible');
        });
        reselect(1);
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
                // If the user is transferred from MEGAsync and is logged in as different account on webclient.
                msgDialog(
                    'warninga',
                    l[882],
                    l.megasync_transferred_different_user,
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
                        u_type = typeof result !== 'number' || result < 0 ? false : result;

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
 * Retrieve transfer quota details, i.e. by firing an uq request.
 */
MegaUtils.prototype.getTransferQuota = async function() {
    'use strict';
    const {result} = await api.req({a: 'uq', xfer: 1, qc: 1});

    return freeze({
        ...result,
        max: result.mxfer,
        base: result.pxfer
    });
};


/**
 * Get the state of the storage
 * @param {Number|Boolean} [force] Do not use the cached u_attr value
 * @return {MegaPromise} 0: Green, 1: Orange (almost full), 2: Red (full)
 */
MegaUtils.prototype.getStorageState = async function(force) {
    'use strict';

    if (!force && Object(u_attr).hasOwnProperty('^!usl')) {
        return u_attr['^!usl'] | 0;
    }

    // XXX: Not using mega.attr.get since we don't want the result indexedDB-cached.
    const result = await api.send({'a': 'uga', 'u': u_handle, 'ua': '^!usl', 'v': 1});
    if (d) {
        console.debug('getStorageState', result);
        console.assert(result === ENOENT || result.av, `getStorageState: Unexpected response... ${result}`);
    }
    const value = base64urldecode(result.av || '');

    if (typeof u_attr === 'object') {
        u_attr['^!usl'] = value;
    }

    return value | 0;
};

/**
 * Retrieve storage quota details, i.e. by firing an uq request.
 */
MegaUtils.prototype.getStorageQuota = async function() {
    'use strict';
    const {result} = await api.req({a: 'uq', strg: 1, qc: 1}, {cache: -4});

    if (result.uslw === undefined) {
        result.uslw = 9000;
    }

    return freeze({
        ...result,
        max: result.mstrg,
        used: result.cstrg,
        isFull: result.cstrg / result.mstrg >= 1,
        percent: Math.floor(result.cstrg / result.mstrg * 100),
        isAlmostFull: result.cstrg / result.mstrg >= result.uslw / 10000
    });
};

/**
 * Check Storage quota.
 * @param {Number} timeout in milliseconds, defaults to 30 seconds
 */
MegaUtils.prototype.checkStorageQuota = function checkStorageQuota(timeout) {
    'use strict';
    delay('checkStorageQuota', function _csq() {
        M.getStorageQuota().then((data) => {
            if (data.percent < 100) {
                if (ulmanager.ulOverStorageQuota) {
                    onIdle(function() {
                        ulmanager.ulResumeOverStorageQuotaState();
                    });
                }
                if (is_mobile && mega.ui.sheet.name === 'over-storage') {
                    mega.ui.sheet.hide();
                }
                if (u_attr) {
                    delete u_attr.uspw;
                }
            }
            return M.showOverStorageQuota(data);
        }).catch(dump);
    }, timeout || 30000);
};

/**
 * Check whether an operation could take the user over their storage quota
 * @param {Number} opSize The size needed by the operation
 * @returns {Promise}
 */
MegaUtils.prototype.checkGoingOverStorageQuota = function(opSize) {
    'use strict';

    return M.getStorageQuota()
        .then((data) => {

            if (opSize === -1) {
                opSize = data.mstrg;
            }

            if (opSize > data.mstrg - data.cstrg) {
                var options = {custom: 1, title: l[882], body: l[16927]};

                return M.showOverStorageQuota(data, options)
                    .always(() => {
                        throw EGOINGOVERQUOTA;
                    });
            }
        });
};

/**
 * Fill LHP storage block caption.
 * @param {HTMLElement} container storage block element
 * @param {Number|String} storageQuota available storage quota
 * @returns {Promise} fulfilled on completion.
 */
MegaUtils.prototype.createLeftStorageBlockCaption = async function(container, storageQuota) {
    'use strict';

    let checked = false;
    const $storageBlock = $(container);
    const $popup = $('.js-lp-storage-information-popup', $storageBlock.parent()).removeClass('hidden');

    $storageBlock.rebind('mouseenter.storage-usage', () => {
        if (!checked) {
            checked = true;

            Promise.resolve(!u_attr.p || u_attr.tq || this.getTransferQuota())
                .then((res) => {
                    if (typeof res === 'object') {
                        // base transfer quota from getTransferQuota()
                        res = res.base;
                    }
                    if (typeof res === 'number') {
                        res = bytesToSize(res, 0);
                    }

                    if (u_attr.p) {
                        u_attr.tq = res;
                        $popup.text(l.storage_usage_caption_pro.replace('%1', storageQuota).replace('%2', u_attr.tq));
                    }
                    else {
                        $popup.text(l.storage_usage_caption_free.replace('%1', storageQuota));
                    }
                });
        }

        delay('storage-information-popup', () => $popup.addClass('hovered'), 1e3);
    });

    $storageBlock.rebind('mouseleave.storage-usage', () => {
        delay.cancel('storage-information-popup');
        $popup.removeClass('hovered');
    });
};

/**
 * Fill left-pane element with storage quota footprint.
 * @param {Object} [data] already-retrieved storage-quota
 * @returns {Promise} fulfilled on completion.
 */
MegaUtils.prototype.checkLeftStorageBlock = async function(data) {
    'use strict';
    const storageBlock = document.querySelector('.js-lp-storage-usage-block');

    if (!u_type || !fminitialized || this.storageQuotaCache) {

        if (u_type === 0) {
            storageBlock.classList.add('hidden');
        }

        return false;
    }

    storageBlock.classList.remove('hidden');

    const loaderSpinner = storageBlock.querySelector('.loader');

    // minimize DOM ops when not needed by only triggering the loader if really needed
    if (loaderSpinner) {
        loaderSpinner.classList.add('loading');
    }

    this.storageQuotaCache = data || await this.getStorageQuota();

    let storageHtml;
    const {percent, max, used, isAlmostFull, isFull} = this.storageQuotaCache;
    const space = bytesToSize(max, 0);
    const space_used = bytesToSize(used);

    storageBlock.classList.remove('over');
    storageBlock.classList.remove('warning');

    if (isFull && !storageBlock.classList.contains("over")) {
        storageBlock.classList.add('over');
    }
    else if (isAlmostFull && !storageBlock.classList.contains("warning")) {
        storageBlock.classList.add('warning');
    }

    // If Business or Pro Flexi always show the plan name (even if expired, which is when u_attr.p is undefined)
    if (u_attr.b || u_attr.pf) {
        storageBlock.querySelector('.plan').textContent = pro.getProPlanName(
            u_attr.b ? pro.ACCOUNT_LEVEL_BUSINESS : pro.ACCOUNT_LEVEL_PRO_FLEXI
        );
    }
    else if (u_attr.p) {
        storageBlock.querySelector('.plan').textContent = pro.getProPlanName(u_attr.p);
    }
    else {
        storageBlock.querySelector('.plan').textContent = l[1150]; // Free
    }

    // Show only space_used for Business and Pro Flexi accounts
    if (u_attr && (u_attr.b || u_attr.pf)) {
        storageHtml = `<span class="lp-sq-used">${space_used}</span>`;
        storageBlock.querySelector('.js-storagegraph').classList.add('hidden');
        storageBlock.querySelector('.js-lpbtn[data-link="upgrade"]').classList.add('hidden');
    }
    else {
        storageHtml = l[1607].replace('%1', `<span class="lp-sq-used">${space_used}</span>`)
            .replace('%2', `<span class="lp-sq-max">${space}</span>`);
    }

    $('.storage-txt', storageBlock).safeHTML(storageHtml);
    $('.js-storagegraph span', storageBlock).outerWidth(`${percent}%`);

    if (loaderSpinner) {
        loaderSpinner.remove();
    }

    if (!u_attr.pf && !u_attr.b && (!u_attr.tq || !storageBlock.classList.contains('caption-running'))) {
        storageBlock.classList.add('caption-running');
        return this.createLeftStorageBlockCaption(storageBlock, space);
    }
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
        ('arrayBuffer' in data ? data.arrayBuffer() : this.readBlob(data)).then(resolve).catch(reject);
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
    else if (data instanceof ReadableStream) {
        data.arrayBuffer().then(resolve).catch(reject);
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
 * Retrieves or creates a readable stream for the provided input data
 * @param {*} data some arbitrary data
 * @returns {Promise<ReadableStream<Uint8Array>|ReadableStream<any>>}
 */
MegaUtils.prototype.getReadableStream = async function(data) {
    'use strict';

    if (data instanceof Blob) {
        return data.stream();
    }

    return new Response(data).body;
};

/**
 * Compress data using the Compression Streams API
 * The Compression Streams API provides a JavaScript API for compressing
 * and decompressing streams of data using the gzip or deflate formats.
 * @param {ArrayBuffer|Blob} data some arbitrary data
 * @param {String} [format] optional, default to gzip
 * @returns {Promise<ArrayBuffer>}
 */
MegaUtils.prototype.compress = async function(data, format) {
    'use strict';
    const cs = new CompressionStream(format || 'gzip');
    const stream = (await this.getReadableStream(data)).pipeThrough(cs);
    return new Response(stream).arrayBuffer();
};

/**
 * Decompress data using the Compression Streams API
 * The Compression Streams API provides a JavaScript API for compressing
 * and decompressing streams of data using the gzip or deflate formats.
 * @param {ArrayBuffer|Blob} data some arbitrary data
 * @param {String} [format] optional, default to gzip
 * @returns {Promise<ArrayBuffer>}
 */
MegaUtils.prototype.decompress = async function(data, format) {
    'use strict';
    const ds = new DecompressionStream(format || 'gzip');
    const stream = (await this.getReadableStream(data)).pipeThrough(ds);
    return new Response(stream).arrayBuffer();
};

/**
 * Save to disk the current's account tree (fetch-nodes response)
 * @param {Number} [ca] set to 1 to not clear the tree-cache
 * @returns {Promise<*>}
 */
MegaUtils.prototype.saveFTree = async function(ca) {
    'use strict';
    const ts = new Date().toISOString().replace(/\W/g, '');
    return M.saveAs(await api.send({a: 'f', c: 1, r: 1, ca}), `tree-${ts}.json`);
};

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

    this.onDexieDB('$ps', {kv: '&k'}).then((db) => {
        const ack = (value) => {
            if (!value && action === 'get') {
                return reject(ENOENT);
            }
            resolve(value);
        };

        if (!action) {
            // No pre-defined action given, the caller is responsible of db.close()'ing
            resolve(db);
        }
        else if (db) {
            var c = db.kv;
            var r = action === 'get' ? c.get(key) : action === 'set' ? c.put({k: key, v: value}) : c.delete(key);

            r.then((result) => {
                onIdle(db.close.bind(db));
                ack(action === 'get' && result && result.v || null);
            }).catch(reject);
        }
        else {
            this.onPersistentDB.fallback.call(null, action, key, value).then(ack).catch(reject);
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
MegaUtils.prototype.onPersistentDB.fallback = async function(action, key, value) {
    'use strict';
    const pfx = '$ps!';
    const parse = tryCatch(JSON.parse.bind(JSON));
    const storage = localStorage;
    key = pfx + (key || '');

    var getValue = function(key) {
        var value = storage[key];
        if (value) {
            value = parse(value) || value;
        }
        return value;
    };

    if (action === 'set') {
        value = tryCatch(JSON.stringify.bind(JSON))(value) || value;
        if (d && String(value).length > 4096) {
            console.warn('Storing more than 4KB...', key, [value]);
        }
        storage[key] = value;
    }
    else if (action === 'get') {
        value = getValue(key);
    }
    else if (action === 'rem') {
        value = storage[key];
        delete storage[key];
    }
    else if (action === 'enum') {
        const entries = Object.keys(storage)
            .filter((k) => k.startsWith(key))
            .map((k) => k.substr(pfx.length));
        let result = entries;

        if (value) {
            // Read contents
            result = Object.create(null);

            for (var i = entries.length; i--;) {
                result[entries[i]] = getValue(pfx + entries[i]);
            }
        }

        value = result;
    }

    return value;
};

// Get FileSystem storage ignoring polyfills.
lazy(MegaUtils.prototype, 'requestFileSystem', function() {
    'use strict';
    const requestFileSystem = window.webkitRequestFileSystem || window.requestFileSystem;
    if (typeof requestFileSystem === 'function') {
        return requestFileSystem.bind(window);
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
        let type = 1;
        var request = function(quota) {
            M.requestFileSystem(type, quota, success, reject);
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
                type = 0;
                navigator.webkitTemporaryStorage.requestQuota(1e10, request, (err) => {
                    console.error(err);
                    reject(EBLOCKED);
                });
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
MegaUtils.prototype.getPersistentData = async function(k) {
    'use strict';
    return this.onPersistentDB('get', k);
};

/**
 * Save data into persistent storage
 * @param {String} k The key identifying the data to store
 * @param {*} v The value/data to store
 * @returns {Promise}
 */
MegaUtils.prototype.setPersistentData = async function(k, v) {
    'use strict';
    return this.onPersistentDB('set', k, v);
};

/**
 * Remove previously stored persistent data
 * @param {String} k The key identifying the data
 * @returns {Promise}
 */
MegaUtils.prototype.delPersistentData = function(k) {
    'use strict';

    return Promise.allSettled([
        this.onPersistentDB('rem', k),
        this.onPersistentDB.fallback('rem', k)
    ]);
};

/**
 * Enumerates all persistent data entries
 * @param {String} [aPrefix] Returns entries matching with this prefix
 * @param {Boolean} [aReadContents] Whether the contents must be read as well
 * @returns {MegaPromise}
 */
MegaUtils.prototype.getPersistentDataEntries = promisify(async function(resolve, reject, aPrefix, aReadContents) {
    'use strict';

    let result = null;
    const append = (data) => {
        if (Array.isArray(data)) {
            result = result || [];
            assert(Array.isArray(result));
            result = result.concat(data);
        }
        else {
            assert(typeof result === 'object' && !Array.isArray(result));
            result = Object.assign(Object.create(null), result, data);
        }
    };
    const finish = (data) => {
        if (data) {
            append(data);
        }
        if (result) {
            return resolve(result);
        }
        reject(ENOENT);
    };
    const fail = (ex) => {
        if (d > 1) {
            console.warn(ex);
        }
        finish();
    };
    const fallback = () => {
        this.onPersistentDB().then((db) => {
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
                            return finish(entries);
                        }

                        var result = Object.create(null);
                        for (var i = entries.length; i--;) {
                            result[entries[i].k] = entries[i].v;
                        }
                        finish(result);
                    })
                    .catch(fail);
            }
            else {
                this.onPersistentDB.fallback('enum', aPrefix, aReadContents, true).then(finish).catch(fail);
            }
        }, fail);
    };

    // why the closure? check out git blame, some logic was removed here and no need to refactor everything, yet.
    fallback();
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
        if (d) {
            console.error('Error - getCountryName: unrecognizable country code: ' + countryCode);
        }
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
 * Gets the trunk (national dialling) code from the given number and country code.
 * If the country doesn't have trunk codes or wasn't included in the number, returns an empty string.
 *
 * @param {string} countryCallCode Country intl. calling code
 * @param {string} phoneNumber Phone number in question
 * @returns {string} Trunk code or empty string if not found
 */
MegaUtils.prototype.getNumberTrunkCode = function(countryCallCode, phoneNumber) {
    'use strict';

    if (!this._countryTrunkCodes) {
        this._countryTrunkCodes = new RegionsCollection().countryTrunkCodes;
    }

    let trunkCodes;
    if (this._countryTrunkCodes.hasOwnProperty(countryCallCode)) {
        trunkCodes = this._countryTrunkCodes[countryCallCode];
        if (typeof trunkCodes === 'function') {
            trunkCodes = trunkCodes(phoneNumber);
        }
    }

    for (let trunkCode in trunkCodes) {
        trunkCode = trunkCodes[trunkCode];
        if (trunkCode && phoneNumber.startsWith(trunkCode)) {
            return trunkCode;
        }
    }

    return ''; // No trunk code is common
};

/**
 * Formats the given phone number to make it suitable to prepend a country call code.
 * Strips hyphens and whitespace, removes the trunk code.
 * e.g. NZ 021-1234567 => 2112345567
 *
 * @param {string} countryCallCode Country int. calling code
 * @param {string} phoneNumber Phone number to format
 * @returns {string} Formatted phone number
 */
MegaUtils.prototype.stripPhoneNumber = function(countryCallCode, phoneNumber) {
    'use strict';

    // Strip hyphens, whitespace
    phoneNumber = phoneNumber.replace(/-|\s/g, '');

    // Remove the trunk code (prefix for dialling nationally) from the given phone number.
    const trunkCode = M.getNumberTrunkCode(countryCallCode, phoneNumber);
    if (trunkCode && phoneNumber.startsWith(trunkCode)) {
        phoneNumber = phoneNumber.substr(trunkCode.length);
    }

    return phoneNumber;
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

    if (event.dataTransfer
        && event.dataTransfer.items
        && event.dataTransfer.items.length > 0 && event.dataTransfer.items[0].webkitGetAsEntry) {
        return checkWebkitItems();
    }

    return false;
};

/**
 * Check the date entered, as day, month and year, is valid
 * @param {Number} day Day value of the date to validate
 * @param {Number} month Month value of the date to validate
 * @param {Number} year Year value of the date to validate
 * @returns {Number} 0 on success, else the number represent why date is not valid.
 */
MegaUtils.prototype.validateDate = function(day, month, year) {

    'use strict';

    // Check value is null or empty or 0
    if (!day || !month || !year) {
        return 1;
    }

    // Check value over common range limits
    if (day > 31 || month > 12) {
        return 2;
    }

    const tDate = new Date();

    tDate.setFullYear(year, month - 1, day);

    // If entered day is not exact as processed date, day value is not exist on entered month of the year,
    // i.e. not exist on Calandar
    if (tDate.getDate() !== day || tDate.getMonth() + 1 !== month || tDate.getFullYear() !== year) {
        return 3;
    }

    // it is valid
    return 0;
};

/**
 * Validate raw phone number
 *
 * @param {string} phoneNumber Phone number
 * @param {string} countryCode Country calling code
 * @returns {string|Boolean} returns the cleaned phone number otherwise false
 */
MegaUtils.prototype.validatePhoneNumber = function(phoneNumber, countryCode) {
    'use strict';

    if (typeof phoneNumber !== 'string') {
        return false;
    }

    let length = 4;

    if (typeof countryCode === 'string') {
        countryCode = countryCode.trim();
        phoneNumber = `${countryCode}${phoneNumber}`;
        length = countryCode.length + 4;
    }

    phoneNumber = phoneNumber.trim().replace(/[^\w+]/g, '');

    var simplePhoneNumberPattern = new RegExp(`^\\+?\\d{${length},}$`);

    if (!simplePhoneNumberPattern.test(phoneNumber)) {
        return false;
    }

    return phoneNumber;
};

/**
 * Tells whether the used does have to agree to the copyright warning before proceeding.
 * @returns {Boolean} value.
 */
MegaUtils.prototype.agreedToCopyrightWarning = function() {
    'use strict';

    if (pfid) {
        // No need under folder-links, copyright agents are retrieving links there
        return true;
    }

    if (mega.config.get('cws') | 0) {
        // They did.
        return true;
    }

    if (Object.keys((this.su || !1).EXP || {}).length > 0) {
        // rely on the presence of public-links.
        mega.config.set('cws', 1);
        return true;
    }

    return false;
};

MegaUtils.prototype.noSleep = async function(stop, title) {
    'use strict';
    // Based on https://github.com/richtr/NoSleep.js

    const store = this.noSleep;

    if (store.canUseWakeLock === undefined) {
        store.canUseWakeLock = 'wakeLock' in window.navigator;
        store.tick = 0;
    }

    if (store.canUseWakeLock) {
        const {wakeLock} = store;

        if (stop) {

            if (wakeLock && (--store.tick < 1 || stop > 1)) {
                store.tick = 0;
                store.wakeLock = null;
                return (await wakeLock).release();
            }
        }
        else {
            store.tick++;

            if (wakeLock) {
                return wakeLock;
            }
            store.wakeLock = new Promise((resolve, reject) => {

                navigator.wakeLock.request('screen')
                    .then((res) => {
                        if (store.tick > 0) {
                            store.wakeLock = res;
                        }
                        return res;
                    })
                    .catch((ex) => {
                        if (d) {
                            console.error(ex);
                        }
                        delete store.wakeLock;
                        store.canUseWakeLock = false;

                        if (store.tick > 0) {
                            return this.noSleep(false, title);
                        }
                    })
                    .then(resolve)
                    .catch(reject);
            });
        }

        return store.wakeLock;
    }

    const vNode = store.node = store.node || document.createElement("video");
    assert(vNode, 'Cannot apply no-sleep measures...');

    if (!store.srcNode) {
        vNode.setAttribute('playsinline', '');
        vNode.setAttribute('title', title || 'MEGA');
        vNode.addEventListener("timeupdate", () => {
            if (vNode.currentTime > 0.5) {
                vNode.currentTime = Math.random();
            }
        });

        const sNode = store.srcNode = document.createElement("source");
        sNode.src = `${staticpath}images/mega/no-sleep.mp4`;
        sNode.type = "video/mp4";
        vNode.appendChild(sNode);
    }

    if (stop) {

        if (--store.tick < 1 || stop > 1) {
            store.awake = false;
            vNode.pause();
        }
    }
    else {
        store.awake = true;
        return vNode.play();
    }
};

MegaUtils.prototype.updatePaymentCardState = () => {
    'use strict';
    return api.req({a: 'cci'}).then((res) => {
        const date = new Date();
        const cardM = res.result.exp_month;
        const cardY = res.result.exp_year;
        const currentM = date.getMonth() + 1;
        const currentY = date.getFullYear();
        const currentD = date.getDate();
        let state;
        // Expired
        if (currentY > cardY || ((currentM > cardM) && (currentY <= cardY))) {
            state = 'exp';
        }
        // Expires this month
        else if ((currentM === cardM) && (currentY === cardY)) {
            state = 'expThisM';
        }
        // Expires next month (only show on/after the 15th of the current month)
        else if ((((currentM + 1) === cardM) && (currentD >= 15)) && (currentY === cardY)) {
            state = 'expNextM';
        }
        M.showPaymentCardBanner(state);
        if (M.account && state) {
            M.account.cce = state;
        }
    });
};


Object.freeze(MegaUtils.prototype);
