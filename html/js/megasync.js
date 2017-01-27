var megasync = (function() {

    var ns = {};
    var megasyncUrl = "https://localhost.megasyncloopback.mega.nz:6342/";
    var enabled = false;
    var version = 0;
    var lastDownload;
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
        var $dropdown = $('.megasync-dropdown'); 
        var $select = $dropdown.find('.megasync-scr-pad').empty();
        var $list   = $dropdown.find('.megasync-dropdown-list');
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

        $('.main-pad-block').rebind('click.closesyncdropdown', function(e) {
            if ($dropdown.hasClass('active')) {
                if ($(e.target).parent('.megasync-dropdown').length === 0 &&
                        !$(e.target).hasClass('megasync-dropdown')) {
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

        var $main = $('.megasync-dropdown:visible');
        var $pane = $main.find('.megasync-dropdown-scroll');
        var jsp   = $pane.data('jsp');
        var $list = $main.find('.megasync-dropdown-list');
        var $arrow = $main.find('.mega-list-arrow');
        var overlayHeight = $('.megasync-overlay').outerHeight();
        var listHeight = $main.find('.megasync-scr-pad').outerHeight() + 72;
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

        $('.megasync-close', $overlay).rebind('click', function(e) {
            $overlay.addClass('hidden');
        });

        $('body').bind('keyup.sdd', function(e) {
            if (e.keyCode === 27) {
                $('.megasync-overlay').addClass('hidden');
                $overlay.addClass('hidden');
            }
        });

        if (url === '' || localStorage.isLinux) {
            // It's linux!
            var $modal = $('.megasync-overlay').addClass('hidden');
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
        error: function(next, ev) {

            enabled = false;
            next = (typeof next === "function") ? next : function() {};
            next(ev || new Error("Internal error"));
            return showDownloadDialog();
        }
    };

    /**
     * Perform an http request to the running MEGAsync instance.
     *
     * @param {Object}   args    parameters to send.
     * @param {Function} resolve on promise's resolve (Optional)
     * @param {Function} reject  on promise's reject (Optional)
     * @return {MegaPromise}
     */
    function megaSyncRequest(args, resolve, reject) {

        try {
            args = JSON.stringify(args);
        }
        catch (ex) {
            if (typeof reject === 'function') {
                reject(ex);
            }
            return MegaPromise.reject(ex);
        }

        var promise = mega.utils.xhr({
            url: megasyncUrl,
            data: args,
            type: 'json'
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
            api_handle(next, response);
        }, function(ev) {
            handler.error(next, ev);
        });
    }

    function api_handle(next, response) {

        next = (typeof next === "function") ? next : function() {};
        if (response === 0) {
            // It means "OK". Most likely a "download" API call
            // was successfully handled.
            clearInterval(retryTimer);
            $('body').unbind('keyup.ssd');
            showToast('megasync', 'Download added to MEGAsync', 'Open');
            $('.button.with-megasync .big-txt').safeHTML(l[258]);
            $('.button.with-megasync').addClass('downloading');
            return $('.megasync-overlay').addClass('hidden').removeClass('downloading');
        }

        if (typeof response !== "object") {
            return handler.error(next);
        }

        for (var property in response) {
            if (response.hasOwnProperty(property) && handler[property]) {
                handler[property](response[property]);
            }
        }

        return next(null, response);
    }
    // }}}

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

    ns.isInstalled = function(next) {
        SyncAPI({a: "v"}, next);
    };

    ns.megaSyncRequest = megaSyncRequest;

    return ns;
})();
