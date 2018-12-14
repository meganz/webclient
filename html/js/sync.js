var syncurl;
var nautilusurl;
var syncsel = false;

function renderLinuxOptions(linuxsync) {
    var ostxt;
    var $content = $('.bottom-page.megasync');
    syncurl = undefined;
    syncsel = false;

    $content.find('.megaapp-button-info.linux-txt')
        .safeHTML('<span class="nautilus-lnk">' +
            'MEGA <a href="" class="red">Nautilus extension</a> (@@)</span>', l[2028])
        .addClass('disabled');
    $content.addClass('linux');
    $content.find('.megaapp-linux').removeClass('hidden');
    $content.find('.architecture-checkbox input').rebind('click', function() {
        $content.find('.architecture-checkbox.radioOn')
            .removeClass('radioOn').addClass('radioOff');
        $(this).parent().removeClass('radioOff').addClass('radioOn');
        $(this).prop('checked', true);
    });
    $content.find('.nav-buttons-bl a.linux')
        .removeClass('download').addClass('disabled').attr('data-link', syncurl);
    $content.find('.megasync .megaapp-linux-default').text(l[7086]);
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('i686') > -1
            || ua.indexOf('i386') > -1 || ua.indexOf('i586') > -1) {
        $content.find('.megaapp-linux #rad1').click();
    }

    loadingDialog.hide();

    megasync.UILinuxDropdown(function($element) {
        changeLinux(linuxsync, $element.data('client-id'));
    });

    $('.megaapp-button-info.linux-txt a').rebind('click', function(e) {
        if (!nautilusurl) {
            return false;
        }
    });

    $('.megaapp-linux input').rebind('change', function(e) {
        if (syncsel) {
            setTimeout(function() {
                changeLinux(linuxsync, syncsel);
            }, 1);
        }
    });
}

/**
 * Reset MEGAsync to default
 */
function resetMegasync() {

    'use strict';

    var $content = $('.bottom-page.megasync');
    var $linuxBlock = $content.find('.megaapp-linux');

    $content.removeClass('linux');
    $content.find('.nav-buttons-bl a.linux').removeClass('download disabled')
        .attr('data-link', '');
    $linuxBlock.addClass('hidden');
    $linuxBlock.find('.megaapp-linux-default').text(l[7086]);
    $linuxBlock.find('.radio-buttons label, .architecture-checkbox').removeClass('hidden');
}

/**
 * Init MEGAsync functions
 */
function initMegasync() {

    'use strict';

    var $content = $('.bottom-page.megasync');

    resetMegasync();

    // Preload linux options if on a linux client
    if (ua.indexOf('linux') >= 0) {
        megasync.getLinuxReleases(renderLinuxOptions);
    }

    $content.find('.nav-buttons-bl a').rebind('click', function() {
        var $this = $(this);
        var osData = $this.attr('data-os');

        if (osData === 'windows') {
            window.location = megasync.getMegaSyncUrl('windows');
            resetMegasync();
        }
        else if (osData === 'mac') {
            window.location = megasync.getMegaSyncUrl('mac');
            resetMegasync();
        }
        else if (osData === 'linux' && $this.attr('data-link')) {
            window.location = $this.attr('data-link');
        }
        else {
            loadingDialog.show();
            megasync.getLinuxReleases(renderLinuxOptions);
        }
    });

    $content.find('.tab-button').rebind('click', function() {
        var $this = $(this);
        var className = $this.attr('data-class');

        if (!$this.hasClass('active')) {
            $content.find('.tab-button, .tab-body, .dark-tab-img').removeClass('active');
            $this.addClass('active');
            $content.find('.' + className).addClass('active');
        }
    });

    $('.pages-nav.nav-button').removeClass('active');
    $('.pages-nav.nav-button.sync').addClass('active');
}

function changeLinux(linuxsync, i) {
    'use strict';

    var $content = $('.bottom-page.megasync');

    if (linuxsync[i]) {
        if (linuxsync[i]['32']) {
            $content.find('.linux32').parent().show();
            $content.find('.radio-txt.32').show();
        }
        else {
            $content.find('.linux32').parent().hide();
            $content.find('.radio-txt.32').hide();
        }

        $content.find('.megaapp-linux-default').text(linuxsync[i].name);
        $content.find('.nav-buttons-bl a.linux').removeClass('download disabled');
        var platform = '64';
        var c = $('.linux32').parent().attr('class');
        if (c && c.indexOf('radioOn') > -1) {
            platform = '32';
        }
        syncurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform);
        nautilusurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform + "n");
        var filename = syncurl.split('/').pop();
        $content.find('.nav-buttons-bl a.linux').addClass('download').attr('data-link', syncurl);
        mBroadcaster.sendMessage('megasync-linux-distro-selected', syncurl);

        var $nautiluslink = $content.find('.megaapp-button-info.linux-txt');
        if (nautilusurl === "https://mega.nz/MEGAsyncSetup.exe") {
            nautilusurl = null;
            $nautiluslink.addClass('disabled');
        } else {
            $nautiluslink.removeClass('disabled');
        }
        $content.find('.megaapp-button-info.linux-txt a').attr('href', nautilusurl);
        syncsel = i;
    }
    else {
        syncurl = false;
        nautilusurl = false;
        $content.find('.nav-buttons-bl a.linux').removeClass('download').addClass('disabled')
            .attr('data-link', '');
        $content.find('.megaapp-button-info.linux-txt').addClass('disabled');
        $content.find('.megaapp-button-info.linux-txt a').removeAttr('href');
        $content.find('.megaapp-linux-default').text(l[7086]);
    }
}
