
function MegaSync()
{
    this._url = "https://localhost.megasyncloopback.mega.nz:6342/";
    this._enabled = false;
    this._version = 0;
    this._lastDownload = null;
    this._retryTimer = null;
    this._listeners = [];
    this._prepareDownloadUrls();
}

MegaSync.prototype.ready = function(callback) {
    if (this._listeners instanceof Array) {
        this._listeners.push(callback);
    } else {
        setTimeout(callback);
    }
    return this;
};

MegaSync.prototype.getLinuxReleases = function() {
    return this._linuxsync;
};

function linuxDropdownScroll() {
    var $pane = $('.megasync-dropdown-scroll'),
        api = $pane.data('jsp'),
        $list = $('.megasync-dropdown-list'),
        overlayHeight = $('.megasync-overlay').outerHeight(),
        listHeight = $('.megasync-scr-pad').outerHeight() + 72,
        listPosition = $list.offset().top;

    if (overlayHeight < (listHeight + listPosition)) {
        $('.megasync-list-arrow').removeClass('hidden inactive');
        $pane.height(overlayHeight - listPosition - 72);
        $pane.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});


        $pane.bind('jsp-arrow-change', function(event, isAtTop, isAtBottom, isAtLeft, isAtRight) {
            if (isAtBottom) {
                $('.megasync-list-arrow').addClass('inactive');
            } else {
                $('.megasync-list-arrow').removeClass('inactive');
            }
        });

    } else {
        if (api) {
            api.destroy();
        }
        $pane.unbind('jsp-arrow-change');
        $('.megasync-dropdown-scroll').removeAttr('style');
        $('.megasync-list-arrow').addClass('hidden');
    }
}

MegaSync.prototype._linuxView = function() {
    $('.megasync-overlay').addClass('linux');
    var is64   = browserdetails().is64bit;
    var select = $('.megasync-scr-pad').empty();
    this.getLinuxReleases().forEach(function(client) {
        var icon = client.name.toLowerCase().replace(/[^a-z]/g, '');
        $('<div/>').addClass('megasync-dropdown-link ' + icon)
            .text(client.name)
            .attr('link', this.getMegaSyncUrl(client.name + " " + (is64 ? "64" : "32")))
            .appendTo(select);
    }.bind(this));
    $('.megasync-dropdown-link').rebind('click', function() {
        $('.megasync-dropdown span').removeClass('active').text($(this).text());
        $('.megasync-dropdown-list').addClass('hidden');
        window.location = $(this).attr('link');
    });
    $('.megasync-dropdown span').rebind('click', function() {
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $('.megasync-dropdown-list').addClass('hidden');
        } else {
            $(this).addClass('active');
            $('.megasync-dropdown-list').removeClass('hidden');
            linuxDropdownScroll();
        }
    });
    $(window).rebind('resize.linuxDropdown', function() {
        linuxDropdownScroll();
    });

};

/**
 *  Prepare all the URLs for the different OS/distros
 *  that megasync supports.
 *  Moved this logic from HTML/js/sync.js to here to keep
 *  this in a single file
 */
MegaSync.prototype._prepareDownloadUrls = function() {
    CMS.get('sync', function(err, content) {
        this._linuxsync = content.object;
        
        var clients = {
            windows: 'https://mega.nz/MEGAsyncSetup.exe',
            mac: 'https://mega.nz/MEGAsyncSetup.dmg'
        };

        var linux = 'https://mega.nz/linux/MEGAsync/';
        this._linuxsync.forEach(function(val) {
            ['32', '32n', '64', '64n'].forEach(function(platform) {
                if (val[platform]) {
                    clients[val.name + " " + platform] = linux + val[platform];
                }
            });
        });

        this._clients = clients;

        for (var i = 0; i < this._listeners.length++; ++i) {
            setTimeout(this._listeners[i]);
        }
        this._listeners = null;
    }.bind(this));
};

MegaSync.prototype.getMegaSyncUrl = function(os) {
    if (!os) {
        var pf = navigator.platform.toUpperCase();
        if (pf.indexOf('MAC') >= 0) {
            os = "mac";
        } else if (pf.indexOf('LINUX') >= 0) {
            return '';
        } else  {
            os = "windows";
        }
    }
    return this._clients[os] ||  this._clients['windows'];
};

MegaSync.prototype.handle_v = function(version) {
    this._enabled = true;
    this._version = version;
    if (this._lastDownload) {
        this.download(this._lastDownload[0], this._lastDownload[1]);
        this._lastDownload = null;
    }

};

MegaSync.prototype.download = function(pubkey, privkey) {
    this._lastDownload = [pubkey, privkey];
    this._api({a: "l", h: pubkey, k: privkey});
    return true;
};

MegaSync.prototype._onError = function(next, e) {
    this._enabled = false;
    next = (typeof next === "function") ? next : function() {};
    next(e || new Error("Internal error"));
    return this.downloadClient();
};

MegaSync.prototype.handle = function(next, response) {
    next = (typeof next === "function") ? next : function() {};
    if (response === 0) {
        // alright!
        clearInterval(this._retryTimer);
        $('body').unbind('keyup');
        return $('.megasync-overlay').hide().removeClass('downloading');
    }

    if (typeof response !== "object") {
        next(new Error("Internal error"));
        return this._onError();
    }

    for (var i in response) {
        var fn = 'handle_' + i;
        if (typeof this[fn] === 'function') {
            this[fn](response[i]);
            next(null, response[i]); // XXX: <- this should be called once and not in a loop i guess
        }
    }
};

MegaSync.prototype._api = function(args, next) {
    var self = this;
    if (this._pending) {
        return;
    }
    // this._pending = true;
    mega.utils.xhr({
        url: this._url,
        data: JSON.stringify(args),
        type: 'json'
    }).done(function(ev, response) {
        self.handle(next, response);
    }).fail(function(ev) {
        self._onError(next, ev);
    }).always(function() {
        self._pending = false;
        self = undefined;
    });
};

MegaSync.prototype.isInstalled = function(next) {
    this._api({a: "v"}, next);
};

MegaSync.prototype.downloadClient = function() {
    if (!this._lastDownload){
        // An error happened but did not try to download
        // so we can discard this error
        return;
    }
    var overlay = $('.megasync-overlay');
    var url = this.getMegaSyncUrl();
    if (overlay.hasClass('downloading')) {
        return true;
    }

    this._retryTimer = setInterval((function() {
        if ($('.megasync-overlay:visible').length === 0) {
            this._lastDownload = null;
            return clearInterval(this._retryTimer);
        }
        this._api({a: "v"});
    }).bind(this), 1000);
    overlay.show().addClass('downloading');

    $('.megasync-close').rebind('click', function(e) {
        $('.megasync-overlay').hide();
    });

    $('body').bind('keyup', function(e) {
        if (e.keyCode == 27) {
            $('.megasync-overlay').hide();
        }
    });

    if (url === '') {
        // It's linux!
        this._linuxView();
    } else {
        window.location = url;
    }
};


var megasync = new MegaSync;
