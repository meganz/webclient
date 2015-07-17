
function MegaSync()
{
    this._url = "https://localhost.megasyncloopback.mega.nz:6342/";
    this._enabled = false;
    this._version = 0;
    this._lastDownload = null;
    this._retryTimer = null;
    this._prepareDownloadUrls();
}

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
    this._linuxsync =  [{
        'name':'CentOS 7.0',
        '64':'CentOS_7/x86_64/megasync-CentOS_7.x86_64.rpm',
        '64n':'CentOS_7/x86_64/nautilus-megasync-CentOS_7.x86_64.rpm',
        'c':'sudo yum localinstall'
    },
    {
        'name':'Debian 7.0',
        '32':'Debian_7.0/i386/megasync-Debian_7.0_i386.deb',
        '32n':'Debian_7.0/i386/nautilus-megasync-Debian_7.0_i386.deb',
        '64':'Debian_7.0/amd64/megasync-Debian_7.0_amd64.deb',
        '64n':'Debian_7.0/amd64/nautilus-megasync-Debian_7.0_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Debian 8.0',
        '32':'Debian_8.0/i386/megasync-Debian_8.0_i386.deb',
        '32n':'Debian_8.0/i386/nautilus-megasync-Debian_8.0_i386.deb',
        '64':'Debian_8.0/amd64/megasync-Debian_8.0_amd64.deb',
        '64n':'Debian_8.0/amd64/nautilus-megasync-Debian_8.0_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'elementary OS Freya',
        '32':'xUbuntu_14.04/i386/megasync-xUbuntu_14.04_i386.deb',
        '32n':'xUbuntu_14.04/i386/nautilus-megasync-xUbuntu_14.04_i386.deb',
        '64':'xUbuntu_14.04/amd64/megasync-xUbuntu_14.04_amd64.deb',
        '64n':'xUbuntu_14.04/amd64/nautilus-megasync-xUbuntu_14.04_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Fedora 19',
        '32':'Fedora_19/i686/megasync-Fedora_19.i686.rpm',
        '32n':'Fedora_19/i686/nautilus-megasync-Fedora_19.i686.rpm',
        '64':'Fedora_19/x86_64/megasync-Fedora_19.x86_64.rpm',
        '64n':'Fedora_19/x86_64/nautilus-megasync-Fedora_19.x86_64.rpm',
        'c':'sudo yum localinstall'
    },
    {
        'name':'Fedora 20',
        '32':'Fedora_20/i686/megasync-Fedora_20.i686.rpm',
        '32n':'Fedora_20/i686/nautilus-megasync-Fedora_20.i686.rpm',
        '64':'Fedora_20/x86_64/megasync-Fedora_20.x86_64.rpm',
        '64n':'Fedora_20/x86_64/nautilus-megasync-Fedora_20.x86_64.rpm',
        'c':'sudo yum localinstall'
    },
    {
        'name':'Fedora 21',
        '32':'Fedora_21/i686/megasync-Fedora_21.i686.rpm',
        '32n':'Fedora_21/i686/nautilus-megasync-Fedora_21.i686.rpm',
        '64':'Fedora_21/x86_64/megasync-Fedora_21.x86_64.rpm',
        '64n':'Fedora_21/x86_64/nautilus-megasync-Fedora_21.x86_64.rpm',
        'c':'sudo yum localinstall'
    },
    {
        'name':'Fedora 22',
        '32':'Fedora_22/i686/megasync-Fedora_22.i686.rpm',
        '32n':'Fedora_22/i686/nautilus-megasync-Fedora_22.i686.rpm',
        '64':'Fedora_22/x86_64/megasync-Fedora_22.x86_64.rpm',
        '64n':'Fedora_22/x86_64/nautilus-megasync-Fedora_22.x86_64.rpm',
        'c':'sudo dnf install'
    },
    {
        'name':'Mint 17',
        '32':'xUbuntu_14.04/i386/megasync-xUbuntu_14.04_i386.deb',
        '32n':'xUbuntu_14.04/i386/nautilus-megasync-xUbuntu_14.04_i386.deb',
        '64':'xUbuntu_14.04/amd64/megasync-xUbuntu_14.04_amd64.deb',
        '64n':'xUbuntu_14.04/amd64/nautilus-megasync-xUbuntu_14.04_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'openSUSE 12.2',
        '32':'openSUSE_12.2/i586/megasync-openSUSE_12.2.i586.rpm',
        '32n':'openSUSE_12.2/i586/nautilus-megasync-openSUSE_12.2.i586.rpm',
        '64':'openSUSE_12.2/x86_64/megasync-openSUSE_12.2.x86_64.rpm',
        '64n':'openSUSE_12.2/x86_64/nautilus-megasync-openSUSE_12.2.x86_64.rpm',
        'c':'sudo zypper in'
    },
    {
        'name':'openSUSE 12.3',
        '32':'openSUSE_12.3/i586/megasync-openSUSE_12.3.i586.rpm',
        '32n':'openSUSE_12.3/i586/nautilus-megasync-openSUSE_12.3.i586.rpm',
        '64':'openSUSE_12.3/x86_64/megasync-openSUSE_12.3.x86_64.rpm',
        '64n':'openSUSE_12.3/x86_64/nautilus-megasync-openSUSE_12.3.x86_64.rpm',
        'c':'sudo zypper in'
    },
    {
        'name':'openSUSE 13.1',
        '32':'openSUSE_13.1/i586/megasync-openSUSE_13.1.i586.rpm',
        '32n':'openSUSE_13.1/i586/nautilus-megasync-openSUSE_13.1.i586.rpm',
        '64':'openSUSE_13.1/x86_64/megasync-openSUSE_13.1.x86_64.rpm',
        '64n':'openSUSE_13.1/x86_64/nautilus-megasync-openSUSE_13.1.x86_64.rpm',
        'c':'sudo zypper in'
    },
    {
        'name':'openSUSE 13.2',
        '32':'openSUSE_13.2/i586/megasync-openSUSE_13.2.i586.rpm',
        '32n':'openSUSE_13.2/i586/nautilus-megasync-openSUSE_13.2.i586.rpm',
        '64':'openSUSE_13.2/x86_64/megasync-openSUSE_13.2.x86_64.rpm',
        '64n':'openSUSE_13.2/x86_64/nautilus-megasync-openSUSE_13.2.x86_64.rpm',
        'c':'sudo zypper in'
    },
    {
        'name':'Red Hat 7',
        '64':'RHEL_7/x86_64/megasync-RHEL_7.x86_64.rpm',
        '64n':'RHEL_7/x86_64/nautilus-megasync-RHEL_7.x86_64.rpm',
        'c':'sudo yum localinstall'
    },
    {
        'name':'Ubuntu 12.04',
        '32':'xUbuntu_12.04/i386/megasync-xUbuntu_12.04_i386.deb',
        '32n':'xUbuntu_12.04/i386/nautilus-megasync-xUbuntu_12.04_i386.deb',
        '64':'xUbuntu_12.04/amd64/megasync-xUbuntu_12.04_amd64.deb',
        '64n':'xUbuntu_12.04/amd64/nautilus-megasync-xUbuntu_12.04_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Ubuntu 12.10',
        '32':'xUbuntu_12.10/i386/megasync-xUbuntu_12.10_i386.deb',
        '32n':'xUbuntu_12.10/i386/nautilus-megasync-xUbuntu_12.10_i386.deb',
        '64':'xUbuntu_12.10/amd64/megasync-xUbuntu_12.10_amd64.deb',
        '64n':'xUbuntu_12.10/amd64/nautilus-megasync-xUbuntu_12.10_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Ubuntu 13.10',
        '32':'xUbuntu_13.10/i386/megasync-xUbuntu_13.10_i386.deb',
        '32n':'xUbuntu_13.10/i386/nautilus-megasync-xUbuntu_13.10_i386.deb',
        '64':'xUbuntu_13.10/amd64/megasync-xUbuntu_13.10_amd64.deb',
        '64n':'xUbuntu_13.10/amd64/nautilus-megasync-xUbuntu_13.10_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Ubuntu 14.04',
        '32':'xUbuntu_14.04/i386/megasync-xUbuntu_14.04_i386.deb',
        '32n':'xUbuntu_14.04/i386/nautilus-megasync-xUbuntu_14.04_i386.deb',
        '64':'xUbuntu_14.04/amd64/megasync-xUbuntu_14.04_amd64.deb',
        '64n':'xUbuntu_14.04/amd64/nautilus-megasync-xUbuntu_14.04_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Ubuntu 14.10',
        '32':'xUbuntu_14.10/i386/megasync-xUbuntu_14.10_i386.deb',
        '32n':'xUbuntu_14.10/i386/nautilus-megasync-xUbuntu_14.10_i386.deb',
        '64':'xUbuntu_14.10/amd64/megasync-xUbuntu_14.10_amd64.deb',
        '64n':'xUbuntu_14.10/amd64/nautilus-megasync-xUbuntu_14.10_amd64.deb',
        'c':'sudo gdebi'
    },
    {
        'name':'Ubuntu 15.04',
        '32':'xUbuntu_15.04/i386/megasync-xUbuntu_15.04_i386.deb',
        '32n':'xUbuntu_15.04/i386/nautilus-megasync-xUbuntu_15.04_i386.deb',
        '64':'xUbuntu_15.04/amd64/megasync-xUbuntu_15.04_amd64.deb',
        '64n':'xUbuntu_15.04/amd64/nautilus-megasync-xUbuntu_15.04_amd64.deb',
        'c':'sudo gdebi'
    }];

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
    }
};

MegaSync.prototype.download = function(pubkey, privkey) {
    this._lastDownload = [pubkey, privkey];
    this._api({a: "l", h: pubkey, k: privkey});
    return true;
};

MegaSync.prototype._onError = function() {
    this._enabled = false;
    return this.downloadClient();
};

MegaSync.prototype.handle = function(response) {
    if (response === 0) {
        // alright!
        clearInterval(this._retryTimer);
        $('body').unbind('keyup');
        return $('.megasync-overlay').hide().removeClass('downloading');
    }

    if (typeof response !== "object") {
        return this._onError();
    }

    for (var i in response) {
        this['handle_' + i](response[i]);
    }
};

MegaSync.prototype._api = function(args) {
    $.post(this._url, JSON.stringify(args), this.handle.bind(this), "json")
        .fail(this._onError.bind(this));
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
    }).bind(this), 500);
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
