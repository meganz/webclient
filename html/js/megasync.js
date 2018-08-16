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
    var currBid = -1;
    function getNewBid() {
        currBid = Math.random().toString().substr(2);
        return currBid;
    }
    var retryTimer;
    var clients = {
        windows: 'https://mega.nz/MEGAsyncSetup.exe',
        mac: 'https://mega.nz/MEGAsyncSetup.dmg'
    };

    var linuxClients;
    var listeners = [];
    var pending;

    ns.UILinuxDropdown = function(selected) {

        linuxDropdown(selected);
    };
    mBroadcaster.once('fm:initialized', function () {
        if (typeof fmconfig.dlThroughMEGAsync === 'undefined') {
            mega.config.set('dlThroughMEGAsync', 1);
        }
    });
    

    /** a function to switch the url to communicate with MEGASync */
    function switchMegasyncUrlToHttpWhenPossible() {

        if (ua.details.browser === 'Internet Explorer'
            || ua.details.browser === 'Safari'
            || ua.details.browser === 'Edge') {
            return ShttpMegasyncUrl;
        }
        else if (ua.details.browser === 'Chrome') {
            if (ua.details.version.substr(0, 2) >= '30') {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else if (ua.details.browser === 'Firefox') {
            if (ua.details.version.substr(0, 2) >= '55') {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else if (ua.details.browser === 'Opera') {
            if (ua.details.version.substr(0, 2) >= '28') {
                return httpMegasyncUrl;
            }
            else {
                return ShttpMegasyncUrl;
            }
        }
        else {
            return ShttpMegasyncUrl;
        }

    };

    // Linux stuff {{{
    /**
     * Prepare Linux Dropdown with the list of distro.
     *
     * The are many Linux distributions, this function
     * creates an HTML dropdown with the list of distros we support.
     *
     */
    function linuxDropdown(selected) {

        var is64    = browserdetails().is64bit;
        var $dropdown = $('.megasync .megaapp-dropdown'); 
        var $select = $dropdown.find('.megaapp-scr-pad').empty();
        var $list   = $dropdown.find('.megaapp-dropdown-list');
        $('.megasync-overlay').addClass('linux');

        if (typeof selected !== "function") {
            /**
             * Default click handler 
             * @param {jquery} $element     Element that has been clicked.
             */
            selected = function followLink($element) {
                window.location = $element.attr('link');
            }
        }

        linuxClients.forEach(function(client, id) {

            var icon = client.name.toLowerCase().match(/([a-z]+)/i)[1];
            icon = (icon === 'red') ? 'redhat' : icon;

            $('<div/>').addClass('default-dropdown-item icon ' + icon)
                .text(client.name)
                .data('client', client.name)
                .data('client-id', id)
                .attr('link', ns.getMegaSyncUrl(client.name + " " + (is64 ? "64" : "32")))
                .appendTo($select);
        });

        $('.default-dropdown-item', $dropdown).rebind('click', function() {
            $dropdown.find('span').text($(this).text());
            selected($(this));
        });

        $('.bottom-page.scroll-block.megasync').rebind('click.closesyncdropdown', function(e) {
            if ($dropdown.hasClass('active')) {
                if ($(e.target).parent('.megaapp-dropdown').length === 0 &&
                        !$(e.target).hasClass('megaapp-dropdown')) {
                    $dropdown.removeClass('active');
                    $list.addClass('hidden');
                }
            }
        });

        $dropdown.rebind('click', function() {
            var $this = $(this);
            if ($this.hasClass('active')) {
                $this.removeClass('active');
                $list.addClass('hidden');
            } else {
                $this.addClass('active');
                $list.removeClass('hidden');
                linuxDropdownResizeHandler();
            }
        });

        $(window).rebind('resize.linuxDropdown', function() {
            linuxDropdownResizeHandler();
        });
    }

    /**
     * Handle window-resize events on the Linux Dropdown
     */
    function linuxDropdownResizeHandler() {

        var $main = $('.megaapp-dropdown:visible');
        var $pane = $main.find('.megaapp-dropdown-scroll');
        var jsp   = $pane.data('jsp');
        var $list = $main.find('.megaapp-dropdown-list');
        var $arrow = $main.find('.mega-list-arrow');
        var overlayHeight = $('.megasync-overlay').outerHeight();
        var listHeight = $main.find('.megaapp-scr-pad').outerHeight() + 72;
        var listPosition;

        if ($list.length) {
            listPosition = $list.offset().top;
        }

        if (overlayHeight < (listHeight + listPosition)) {
            $arrow.removeClass('hidden inactive');
            $pane.height(overlayHeight - listPosition - 72);
            $pane.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});


            $pane.bind('jsp-arrow-change', function(event, isAtTop, isAtBottom, isAtLeft, isAtRight) {

                if (isAtBottom) {
                    $arrow.addClass('inactive');
                } else {
                    $arrow.removeClass('inactive');
                }
            });

        } else {
            if (jsp) {
                jsp.destroy();
            }
            $pane.unbind('jsp-arrow-change');
            $arrow.removeAttr('style');
            $arrow.addClass('hidden');
        }
    }
    // }}}

    /**
     * The user attempted to download the current file using
     * MEGASync *but* they don't have it running (and most likely not installed)
     * show we show them a dialog for and we attempt to download the client.
     *
     * If the user has Linux we shown them a dropbox with their distros.
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

        $('.megasync-close', $overlay).rebind('click', function(e) {
            $overlay.addClass('hidden');
            $('body').removeClass('overlayed');
        });

        $('body').bind('keyup.sdd', function(e) {
            if (e.keyCode === 27) {
                $overlay.addClass('hidden');
                $('body').removeClass('overlayed');
            }
        });

        if (url === '' || localStorage.isLinux) {
            // It's linux!
            var $modal = $overlay.addClass('hidden');
            $('body').removeClass('overlayed');
            loadingDialog.show();
            ns.getLinuxReleases(function() {
                loadingDialog.hide();
                $modal.show();
                linuxDropdown();
            });
        } else {
            window.location = url;
        }
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
        error: function (next, ev) {
            enabled = false;
            next = (typeof next === "function") ? next : function() {};
            next(ev || new Error("Internal error"));
            megaSyncIsNotResponding();
        }
    };

    function megaSyncIsNotResponding(nextIfYes) {
        if (lastCheckStatus && lastCheckTime) {
            msgDialog('confirmation', 'MEGASync is not responding',
                l[17795],
                // 'MEGASync stopped responding, it could be closed or too busy',
                l[17796],
                // 'Do you want to re-initialize connection with MEGASync, ' +
                // 'and turn it off if MEGASync did not respond?',
                function (disableMsync) {
                    if (disableMsync) {
                        lastCheckStatus = null;
                        lastCheckTime = null;
                        if (nextIfYes && typeof nextIfYes === 'function') {
                            nextIfYes();
                        }
                    }

                });
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
        var timeout = (args.a === 'v') ? 250 : 0;
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

    function SyncAPI(args, next) {

        megaSyncRequest(args, function(ev, response) {
            api_handle(next, response, args);
        }, function(ev) {
            handler.error(next, ev);
        });
    }

    function api_handle(next, response, requestArgs) {
        "use strict";
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
                // Below commented Toast was showing a toast that the sync is Done.
                // it's commented due to Bram request.

                // showToast('megasync-transfer sync',
                //    'Sync operation is sent to MEGAsync', 'Open', 'Settings',
                //    ns.transferManager, function () { loadSubPage('fm/account/transfers'); });
                // Sync done with MEGAsync
                return next(null, response);
            }
        }
        // else if ($.isNumeric(response)){
        //    // error handling, i dont know what to do with, since we dont have API Specification for failed ops
        //    // in case of non-object response (.e.g 0: means OK, -1: may mean something else)
        //    return handler.error(next);
        // }
        else if (requestArgs.a === "sp" && $.isNumeric(response)) {
            return next(null, response);
        }
        else if (typeof response !== "object") {
            lastDownload = null;
            return handler.error(next);
        }
        else {
            if (requestArgs.a === "t") { // is get status request

                if (localStorage.jj && localStorage.d) {
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
                        var infoContainer = $('.download.main-transfer-info');
                        $('.download.speed-block .light-txt', infoContainer).text(currStatus);
                        $('.download.scroll-block').removeClass('paused'); // in case any
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
                    else {
                        if (currStatus !== l[17593]) { // 'Download is queued in MEGAsync .'
                            $('.download.progress-bar').width('100%');
                            $('.download.scroll-block').removeClass('downloading').addClass('download-complete');
                            currStatus = l[17593]; // 'Download is queued in MEGAsync .'
                            var infoContainer = $('.download.main-transfer-info');
                            $('.download.complete-block .dark-numbers', infoContainer).text(currStatus);
                        }
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
                        setTransferStatus(0, l[17591]);// 'Can not get downloading status from MEGAsync '
                    }
                }
                else if (response.s && response.s == 6) { // allow implied convert
                    // STATE_COMPLETED = 6
                    dlprogress(-0xbadf, 100, response.t, response.t);
                    $('.download.scroll-block').removeClass('paused');
                    $('.download.progress-bar').width('100%');
                    $('.download.scroll-block').removeClass('downloading').addClass('download-complete');
                    var $pageScrollBlock = $('.bottom-page.scroll-block');
                    $pageScrollBlock.addClass('resumable');
                }
                else if (response.s && response.s == 7) {
                    setTransferStatus(0, l[17586]);// 'Downloading canceled in MEGAsync'
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
                    if (currStatus !== l[17594]) { // 'Download-Paused in MEGAsync !'
                        currStatus = l[17594]; // 'Download-Paused in MEGAsync !'
                        var infoContainer = $('.download.main-transfer-info');
                        $('.download.scroll-block').addClass('paused');
                        $('.download.speed-block .light-txt', infoContainer).text(currStatus);
                    }
                    setTimeout(_statusTick, 3000);
                }
                else if (response.s && response.s == 4) { // allow implied convert
                    // this means we are in status [STATE_RETRYING = 4] which is not final (retry)
                    // then send a new update status request after longer timeout 3 sec
                    if (currStatus !== l[17603]) { // 'Download retrying in MEGAsync !'
                        currStatus = l[17603]; // 'Download retrying in MEGAsync !'
                        var infoContainer = $('.download.main-transfer-info');
                        $('.download.scroll-block').addClass('paused');
                        $('.download.speed-block .light-txt', infoContainer).text(currStatus);
                    }
                    setTimeout(_statusTick, 3000);
                }
                else if (response.s && response.s == 5) { // allow implied convert
                    // this means we are in status [STATE_COMPLETING = 5] which is not final
                    // then send a new update status request
                    if (currStatus !== l[17604]) { // 'Download completing in MEGAsync .'
                        currStatus = l[17604]; // 'Download completing in MEGAsync .'
                        var infoContainer = $('.download.main-transfer-info');
                        $('.download.scroll-block').addClass('paused');
                        $('.download.speed-block .light-txt', infoContainer).text(currStatus);
                    }
                    setTimeout(_statusTick, 1000);
                }
                else if (response.s && response.s == 8) { // allow implied convert
                    // this means we are in status [STATE_FAILED = 8] which is final
                    // then stop
                    setTransferStatus(0, l[17605]);// 'Downloading failed in MEGAsync'
                }
                else {
                    // no response !! ,or value out of range [0,8]
                    // we will wait for 5 sec x 10 times.
                    // then if we kept getting this Res, we update UI and stop fetching status.
                    if (unknownCounter++ < 10) {
                        setTimeout(_statusTick, 5000);
                    }
                    else {
                        setTransferStatus(0, l[17606]);// 'No response from MEGAsync'
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
                        if (response.fo > 1) {
                            folderP = 2;
                        }
                        else {
                            folderP = 1;
                        }
                    }
                    if (response.fi > 1) {
                        if (folderP === 2) {
                            toastTxt = l[17879];
                            toastTxt = toastTxt.replace('%nbFo', response.fo);
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
                        else if (folderP === 1) {
                            toastTxt = l[17880];
                            toastTxt = toastTxt.replace('%nbFo', 1);
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
                        else {
                            toastTxt = l[17883];
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
                    }
                    else {
                        if (folderP === 2) {
                            toastTxt = l[17881];
                            toastTxt = toastTxt.replace('%nbFo', response.fo);
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
                        else if (folderP === 1) {
                            toastTxt = l[17882];
                            toastTxt = toastTxt.replace('%nbFo', 1);
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
                        else {
                            toastTxt = l[17884];
                            toastTxt = toastTxt.replace('%nbFi', response.fi);
                        }
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

    ns.getLinuxReleases = function(next) {
        if (linuxClients) next(linuxClients);

        // Talk to the CMS server and get information
        // about the `sync` (expect a JSON)
        CMS.get('sync', function(err, content) {
            linuxClients = content.object;
            var linux = 'https://mega.nz/linux/MEGAsync/';
            linuxClients.forEach(function(val) {

                ['32', '32n', '64', '64n'].forEach(function(platform) {

                    if (val[platform]) {
                        clients[val.name + " " + platform] = linux + val[platform];
                    }
                });
            });
            next(linuxClients);
        });
    };

    /**
     * Return the most likely Sync Client URL
     * for the current client. This method check the user's
     * Operating System and return the candidates URL.
     *
     * @return {Array}
     */
    ns.getMegaSyncUrl = function(os) {

        if (!os) {
            var pf = navigator.platform.toUpperCase();
            if (pf.indexOf('MAC') >= 0) {
                os = "mac";
            } else if (pf.indexOf('LINUX') >= 0) {
                return '';
            } else {
                os = "windows";
            }
        }
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
    ns.download = function(pubKey, privKey) {
        lastDownload = [pubKey, privKey];
        SyncAPI({a: "l", h: pubKey, k: privKey});
        return true;
    };

    ns.isInstalled = function (next) {
        if (!fmconfig.dlThroughMEGAsync && page !== "download") {
            next(true, false); // next with error=true and isworking=false
        }
        else if (!lastCheckStatus || !lastCheckTime) {
            SyncAPI({ a: "v" }, next);
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
    

    return ns;
})();
