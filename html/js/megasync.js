var megasync = (function() {

    var ns = {};


    var megasyncUrl = '';
    var httpMegasyncUrl = "http://127.0.0.1:6341/";
    var ShttpMegasyncUrl = "https://localhost.megasyncloopback.mega.nz:6342/";
    var enabled = false;
    var version = 0;
    var lastDownload;
    var queuedCounter = 0; // a counter to count how many times we got [queued] status from MEGAsync
    var unknownCounter = 0; // a counter to count how many times we got [res=0] status from MEGAsync
    var canceledCounter = 0; // a counter to count how many times we got [res=7] status from MEGAsync
    var currStatus = l[17794]; // 'Initializing'; // download status from MEGAsync
    var lastCheckTime;
    var lastCheckStatus;
    var defaultStatusThreshold = 15 * 60000; // 15 minutes
    var statusThresholdWhenDifferentUsr = 30000; // 0.5 minutes
    var defaultStatusThresholdForFailed = 15000; // 15 sec
    var currBid = -1;
    function getNewBid() {
        currBid = Math.random().toString().substr(2);
        return currBid;
    }
    var retryTimer;
    var clients = {
        windows: 'https://mega.nz/MEGAsyncSetup64.exe',
        windows_x32: 'https://mega.nz/MEGAsyncSetup32.exe',
        mac: 'https://mega.nz/MEGAsyncSetup.dmg',
        mac_silicon: 'https://mega.nz/MEGAsyncSetupArm64.dmg',
        linux: "https://mega.io/desktop"
    };
    var usemsync = localStorage.usemsync;

    let userOS;

    /** a function to switch the url to communicate with MEGASync */
    function switchMegasyncUrlToHttpWhenPossible() {

        if (!ua || !ua.details || !ua.details.browser || !ua.details.version) {
            return ShttpMegasyncUrl;
        }

        if (ua.details.browser === 'Internet Explorer'
            || ua.details.browser === 'Safari'
            || ua.details.browser === 'Edge') {
            return ShttpMegasyncUrl;
        }
        else if (ua.details.browser === 'Chrome') {
            if (parseInt(ua.details.version) >= 30) {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else if (ua.details.browser === 'Firefox') {
            if (parseInt(ua.details.version) >= 55) {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else if (ua.details.browser === 'Opera') {
            if (parseInt(ua.details.version) >= 28) {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else if (ua.details.browser === 'Edgium') {
            return httpMegasyncUrl;
        }
        else {
            return httpMegasyncUrl;
        }

    }

    /**
     * The user attempted to download the current file using
     * MEGASync *but* they don't have it running (and most likely not installed)
     * show we show them a dialog for and we attempt to download the client.
     *
     * If the user has Linux we close the dialog and open a new window at https://mega.io/desktop.
     *
     * @return {void}
     */
    function showDownloadDialog() {

        if (!lastDownload){
            // An error happened but did not try to download
            // so we can discard this error
            return;
        }
        var $overlay = $('.megasync-overlay');
        var url = ns.getMegaSyncUrl();
        if ($overlay.hasClass('downloading')) {
            return true;
        }
        const os = userOS || ns.getUserOS();
        if (os === 'linux') {
            window.open(ns.getMegaSyncUrl(os), '_blank', 'noopener,noreferrer');
            return;
        }

        retryTimer = setInterval(function() {

            // The user closed our modal, so we stop checking if the
            // user has MEGASync running
            if ($('.megasync-overlay:visible').length === 0) {
                lastDownload = null;
                return clearInterval(retryTimer);
            }
            SyncAPI({a: "v"});
        }, 1000);

        $overlay.removeClass('hidden').addClass('downloading');
        $('body').addClass('overlayed');

        $('.megasync-close, .megasync-close-txt', $overlay).rebind('click', function(e) {
            $overlay.addClass('hidden').removeClass('downloading');
            $('body').removeClass('overlayed');
            $('body').off('keyup.msd');
            lastDownload = null;
            return clearInterval(retryTimer);
        });

        $('body').rebind('keyup.sdd', function(e) {
            if (e.keyCode === 27) {
                $overlay.addClass('hidden');
                $('body').removeClass('overlayed');
                lastDownload = null;
                return clearInterval(retryTimer);
            }
        });

        window.location = url;
    }

    // API Related things {{{
    var handler = {
        v: function(version) {

            enabled = true;
            version = version;
            if (lastDownload) {
                ns.download(lastDownload[0], lastDownload[1]);
                lastDownload = null;
            }
        },
        error: function(next, ev, closeFlag) {
            enabled = false;
            next = (typeof next === "function") ? next : function() {};
            if (closeFlag) {
                megaSyncIsNotResponding(next.bind(this, ev || new Error("Internal error")));
            }
            else {
                next(ev || new Error("Internal error"));
                megaSyncIsNotResponding();
            }
        }
    };

    function megaSyncIsNotResponding(nextIfYes) {
        if (lastCheckStatus && lastCheckTime) {
            api_req({ a: 'log', e: 99800, m: 'MEGASync is not responding' });
            msgDialog(
                'confirmation',
                'MEGA Desktop App is not responding',
                l[17795],
                l[17796],
                function(disableMsync) {
                    if (disableMsync) {
                        lastCheckStatus = null;
                        lastCheckTime = null;
                        ns.periodicCheck();
                        if (nextIfYes && typeof nextIfYes === 'function') {
                            nextIfYes();
                        }
                    }
                    else if (page === "download") {
                        setTransferStatus(0, l[17795]);
                    }
                }
            );
        }
        else {
            showDownloadDialog();
        }
    }

    /**
     * Perform an http request to the running MEGAsync instance.
     *
     * @param {Object}   args    parameters to send.
     * @param {Function} resolve on promise's resolve (Optional)
     * @param {Function} reject  on promise's reject (Optional)
     * @return {MegaPromise}
     */
    function megaSyncRequest(args, resolve, reject) {
        // var timeout = (args.a === 'v') ? 250 : 0;
        var timeout = 0;
        try {
            args = JSON.stringify(args);
        }
        catch (ex) {
            if (typeof reject === 'function') {
                reject(ex);
            }
            return MegaPromise.reject(ex);
        }

        if (!megasyncUrl) {
            megasyncUrl = switchMegasyncUrlToHttpWhenPossible();
        }

        if (megasyncUrl === ShttpMegasyncUrl) {
            // not supported any more.
            const errMsg = 'Browser doesn\'t support Mega Desktop integration';
            if (typeof reject === 'function') {
                reject(errMsg);
            }
            return MegaPromise.reject(errMsg);
        }

        var promise = M.xhr({
            url: megasyncUrl,
            data: args,
            type: 'json'  ,
            timeout: timeout // fasten the no-response cases
        });

        if (typeof resolve === 'function') {
            promise.done(function() {
                try {
                    resolve.apply(null, arguments);
                }
                catch (ex) {
                    if (typeof reject === 'function') {
                        reject(ex);
                    }
                    else {
                        throw ex;
                    }
                }
            });
        }

        if (typeof reject === 'function') {
            promise.fail(reject);
        }

        return promise;
    }

    function SyncAPI(args, next, closeFlag) {

        megaSyncRequest(args, function(ev, response) {
            api_handle(next, response, args);
        }, function(ev) {
            if (args && args.a === 'v') {
                lastCheckStatus = 0;
                lastCheckTime = Date.now();
            }
            handler.error(next, ev, closeFlag);
        });
    }

    function api_handle(next, response, requestArgs) {
        "use strict";
        var $topBar;
        next = (typeof next === "function") ? next : function () { };
        var _uploadTick = function _upTick() {
            if (currBid === requestArgs.bid) {
                megasync.uploadStatus(requestArgs.bid);
            }
        };
        var _statusTick = function _stTick() {
            megasync.downloadStatus(requestArgs.h);
        };

        if (response === 0) {
            if (requestArgs.a === "l" ) {
                if (page === "download") {
                    // Download added to MEGAsync
                    showToast('megasync-transfer', l[8635], l[865], null, ns.transferManager);
                    currStatus = l[17794]; // 'Initializing';
                    queuedCounter = 0;
                    unknownCounter = 0;
                    canceledCounter = 0;
                    return megasync.downloadStatus(requestArgs.h);
                }
                else {
                    showToast('megasync-transfer upload',
                        // 'Download sent to MEGASync',
                        l[17797],
                        l[865], l[823], ns.transferManager,
                        function () { loadSubPage('fm/account/transfers'); }); // Download added to MEGAsync
                }
            }
            else if (requestArgs.a === "ufi" || requestArgs.a === "ufo") { // is upload file MEGAsync request
                return _uploadTick();
            }
            else if (requestArgs.a === "sp") {
                return next(null, response);
            }
            else if (requestArgs.a === "s") {
                return next(null, response);
            }
        }
        else if (requestArgs.a === "sp" && $.isNumeric(response)) {
            return next(null, response);
        }
        else if (typeof response !== "object") {
            lastDownload = null;
            return handler.error(next);
        }
        else {
            if (requestArgs.a === "t") { // is get status request

                if (d > 1) {
                    console.info("status: " + response.s + " progress: " + response.p + "  total: " + response.t
                        + "  speed: " + response.v);
                }

                if (response.s && response.s == 2) { // allow implied convert
                    // this means we are in status [STATE_ACTIVE = 2] which is not final
                    // then send a new update status request after a 1 sec
                    var prec = (response.p * 100) / response.t;
                    dlprogress(requestArgs.h, prec.toPrecision(3), response.p, response.t, response.v);
                    if (currStatus !== l[17592]) { // 'Downloading with MEGAsync .'
                        currStatus = l[17592]; // 'Downloading with MEGAsync .'
                        $topBar = $('.download.download-page').removeClass('paused');
                        $('.download.eta-block .light-txt', $topBar).text(currStatus);
                    }
                    setTimeout(_statusTick, 1000);
                }
                else if (response.s && response.s == 1) { // allow implied convert
                    // STATE_QUEUED = 1
                    // we will wait for 2 sec x 2 times.
                    // then if we found that this is queued down in a list in megaSync then we update UI
                    // and stop fetching status.
                    if (queuedCounter++ < 2) {
                        setTimeout(_statusTick, 2000);
                    }
                    else if (currStatus !== l[17593]) {
                        $('.download.progress-bar').width('100%');
                        $('.download.download-page').removeClass('downloading').addClass('download-complete');
                        currStatus = l[17593];
                        $topBar = $('.download.download-page');
                        $('.download.eta-block .light-txt', $topBar).text(currStatus);
                    }
                }
                else if (response.s && response.s == 0) { // allow implied convert
                    // unknow STATE
                    // we will wait for 5 sec x 10 times.
                    // then if we kept getting this Res, we update UI and stop fetching status.
                    if (unknownCounter++ < 10) {
                        setTimeout(_statusTick, 5000);
                    }
                    else {
                        setTransferStatus(0, l[17591]);
                    }
                }
                else if (response.s && response.s == 6) { // allow implied convert
                    // STATE_COMPLETED = 6
                    dlprogress(-0xbadf, 100, response.t, response.t);
                    $('.download.download-page').removeClass('paused');
                    $('.download.progress-bar').width('100%');
                    $('.download.download-page').removeClass('downloading').addClass('download-complete');
                    var $pageScrollBlock = $('.bottom-page.scroll-block');
                    $pageScrollBlock.addClass('resumable');
                    if (window.dlpage_ph) {
                        $('.open-in-folder').removeClass('hidden').rebind('click', function() {
                            ns.megaSyncRequest({a: 'sf', h: dlpage_ph}).dump();
                            return false;
                        });
                    }
                }
                else if (response.s && response.s == 7) {
                    setTransferStatus(0, l[17586]);
                    // give it one more try, since if user opened the a file link to download and this file
                    // is already getting downloaded, then the first response is 7 then it's OK
                    // because MEGAsync means that the new download is canceled.
                    if (canceledCounter++ < 1) {
                        setTimeout(_statusTick, 1000);
                    }
                }
                else if (response.s && response.s == 3) { // allow implied convert
                    // this means we are in status [STATE_PAUSED = 3] which is not final (PAUSED)
                    // then send a new update status request after longer timeout 3 sec
                    if (currStatus !== l[17594]) {
                        currStatus = l[17594];
                        $topBar = $('.download.download-page').addClass('paused');
                        $('.download.eta-block .light-txt', $topBar).text(currStatus);
                    }
                    setTimeout(_statusTick, 3000);
                }
                else if (response.s && response.s == 4) { // allow implied convert
                    // this means we are in status [STATE_RETRYING = 4] which is not final (retry)
                    // then send a new update status request after longer timeout 3 sec
                    if (currStatus !== l[17603]) {
                        currStatus = l[17603];
                        $topBar = $('.download.download-page').addClass('paused');
                        $('.download.eta-block .light-txt', $topBar).text(currStatus);
                    }
                    setTimeout(_statusTick, 3000);
                }
                else if (response.s && response.s == 5) { // allow implied convert
                    // this means we are in status [STATE_COMPLETING = 5] which is not final
                    // then send a new update status request
                    if (currStatus !== l[17604]) {
                        currStatus = l[17604];
                        $topBar = $('.download.download-page').addClass('paused');
                        $('.download.eta-block .light-txt', $topBar).text(currStatus);
                    }
                    setTimeout(_statusTick, 1000);
                }
                else if (response.s && response.s == 8) { // allow implied convert
                    // this means we are in status [STATE_FAILED = 8] which is final
                    // then stop
                    setTransferStatus(0, l[17605]);
                }
                else {
                    // no response !! ,or value out of range [0,8]
                    // we will wait for 5 sec x 10 times.
                    // then if we kept getting this Res, we update UI and stop fetching status.
                    if (unknownCounter++ < 10) {
                        setTimeout(_statusTick, 5000);
                    }
                    else {
                        setTransferStatus(0, l[17606]);
                    }
                }
            }
            else if (requestArgs.a === "v") { // is get version MEGAsync request
                 if (response.u) {
                    ns.currUser = response.u;
                }
                 lastCheckStatus = response;
                 lastCheckTime = Date.now();
            }
            else if (requestArgs.a === "uss") { // is get upload status MEGAsync request
                var response = (response.length) ? response[0] : response;
                if (response.s && response.s == 1) { // selection done
                    var toastTxt = '';
                    var folderP = 0;
                    if (response.fo) {
                        toastTxt = `${mega.icu.format(l.folder_trans_manager, response.fo)}
                         \u00A0${l.total_files_trans_manager.replace('%1', response.fi)}`;
                        }
                        else {
                        toastTxt = mega.icu.format(l[17883], response.fi);
                    }

                    showToast('megasync-transfer upload', toastTxt, l[865], l[823],
                        ns.transferManager,
                        function () { loadSubPage('fm/account/transfers'); }); // Upload added toMEGAsync
                }
                else if (response.s == 0) { // selection not done yet
                    setTimeout(_uploadTick, 2000);
                }
            }

        }
        return next(null, response);
    }

    ns.getUserOS = () => {
        const pf = navigator.platform.toUpperCase();
        if (pf.includes('MAC')) {
            os = "mac";
        }
        else if (pf.includes('LINUX')) {
            os = 'linux';
        }
        else {
            os = "windows";
        }
        userOS = os;
        return os;
    };

    /**
     * Return the most likely Sync Client URL
     * for the current client. This method check the user's
     * Operating System and return the candidates URL.
     *
     * @return {Array}
     */
    ns.getMegaSyncUrl = function(os) {
        os = userOS || ns.getUserOS();
        return clients[os] ||  clients['windows'];
    };

    /**
     * Talk to MEGASync client and tell it to download
     * the following file
     *
     * @param {String} pubKey      Public Key (of the file)
     * @param {String} privKey     Private Key of the file
     *
     * @return {Boolean} Always return true
     */
    ns.download = function(pubKey, privKey, next, closeFlag) {
        lastDownload = [pubKey, privKey];
        SyncAPI({a: "l", h: pubKey, k: privKey}, next, closeFlag);
        return true;
    };

    ns.isInstalled = function (next) {
        if ((!fmconfig.dlThroughMEGAsync && page !== "download" && page !== 'fm/account/transfers' && !folderlink)
            || (!is_livesite && !usemsync)) {
            next(true, false, true); // next with error=true and isworking=false, off=true
        }
        else if (!lastCheckStatus || !lastCheckTime) {
            if (lastCheckTime) {
                var tDif = Date.now() - lastCheckTime;
                if (tDif >= defaultStatusThresholdForFailed) {
                    SyncAPI({ a: "v" }, next);
                }
                else {
                    next(true, lastCheckStatus);
                }
            }
            else {
                SyncAPI({ a: "v" }, next);
            }
        }
        else {
            var myNow = Date.now();
            var diff = myNow - lastCheckTime;
            if (diff >= defaultStatusThreshold) {
                SyncAPI({ a: "v" }, next);
            }
            else {
                // we found before that MEGAsync is working but with a different logged-in users.

                if (lastCheckStatus && (!ns.currUser || ns.currUser !== u_handle)
                    && diff >= statusThresholdWhenDifferentUsr) {
                    SyncAPI({ a: "v" }, next);
                }
                else if (typeof next === "function") {
                    next(null, lastCheckStatus);
                }
            }

        }
    };

    ns.uploadFile = function (handle, next) {
        SyncAPI({ a: "ufi", h: handle, bid: getNewBid() }, next);
    };

	ns.uploadFolder = function(handle,next) {
        SyncAPI({ a: "ufo", h: handle, bid: getNewBid() }, next);
    };

	ns.syncFolder = function(handle,next) {
        SyncAPI({a: "s",h:handle}, next);
    };
    ns.syncPossible = function (handle, next) {
        SyncAPI({ a: "sp", h: handle }, next);
    };
    ns.syncPossibleA = function(handle) {
        return new Promise((resolve) => {
            SyncAPI({ a: "sp", h: handle }, (error, response) => resolve({error, response}));
        });
    };

	ns.downloadStatus = function(handle,next) {
        SyncAPI({"a":"t","h":handle}, next);
    };
    ns.uploadStatus = function (bid, next) {
        SyncAPI({ a: "uss", bid: bid }, next);
    };
    ns.transferManager = function (next) {
        SyncAPI({ a: "tm", t: 0 }, next);
    };

    ns.megaSyncRequest = megaSyncRequest;
    ns.megaSyncIsNotResponding = megaSyncIsNotResponding;

    var periodicCheckTimeout;

    ns.periodicCheck = function() {
        if (periodicCheckTimeout) {
            clearTimeout(periodicCheckTimeout);
        }
        ns.isInstalled(function(err, is, off) {
            if (!err || is) {
                if (megasync.currUser === u_handle) {
                    window.useMegaSync = 2;
                    periodicCheckTimeout = setTimeout(ns.periodicCheck, defaultStatusThreshold);
                }
                else {
                    window.useMegaSync = 3;
                    periodicCheckTimeout = setTimeout(ns.periodicCheck, statusThresholdWhenDifferentUsr);
                }
            }
            else {
                window.useMegaSync = 4;
                if (off) {
                    return;
                }
                periodicCheckTimeout = setTimeout(ns.periodicCheck, statusThresholdWhenDifferentUsr);
            }
        });
    };
    if ((is_livesite && !is_mobile) || usemsync) {
        mBroadcaster.once('fm:initialized', ns.periodicCheck);
    }
    else {
        ns.periodicCheck = function() { };
    }

    return ns;
})();
