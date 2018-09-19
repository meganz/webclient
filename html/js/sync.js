var syncurl;
var nautilusurl;
var syncsel = false;

function renderLinuxOptions(linuxsync) {
    var ostxt;
    syncurl = undefined;
    syncsel = false;
    ostxt = l[2032];
    if (l[1158].indexOf('Windows') > -1) {
        ostxt = l[1158].replace('Windows', 'Linux');
    }
    if (l[1158].indexOf('Mac') > -1) {
        ostxt = l[1158].replace('Mac', 'Linux');
    }
    $('.megaapp-button-info.os').safeHTML(l[12486]);
    $('.megaapp-button-info.linux-txt')
        .safeHTML('<span class="nautilus-lnk">' +
            'MEGA <a href="" class="red">Nautilus extension</a> (@@)</span>', l[2028])
        .addClass('disabled');
    $('.megaapp-linux').removeClass('hidden');
    $('.architecture-checkbox input').rebind('click', function() {
        $('.architecture-checkbox.radioOn').removeClass('radioOn').addClass('radioOff');
        $(this).parent().removeClass('radioOff').addClass('radioOn');
        $(this).prop('checked', true);
    });
    $('.megasync .download-megasync').addClass('disabled');
    $('.megasync .megaapp-linux-default').text(l[7086]);
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('i686') > -1
            || ua.indexOf('i386') > -1 || ua.indexOf('i586') > -1) {
        $('.megaapp-linux #rad1').click();
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

    $('.megasync .download-megasync').rebind('click', function(e) {
        if (!syncurl) {
            msgDialog('info', l[2029], l[2030]);
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

    $('.megaapp-button-info.os a').rebind('click', function(e) {
        if ($(this).hasClass('windows')) {
            sync_switchOS('windows');
        }
        else if ($(this).hasClass('mac')) {
            sync_switchOS('mac');
        }
        else if ($(this).hasClass('linux')) {
            sync_switchOS('linux');
        }
        return false;
    });
}

function init_sync() {
    var pf = navigator.platform.toUpperCase();

    if (page.substr(-5) === 'linux') {
        sync_switchOS('linux');
    }
    else if (pf.indexOf('MAC') >= 0) {
        sync_switchOS('mac');
    }
    else if (pf.indexOf('LINUX') >= 0) {
        sync_switchOS('linux');
    }
    else {
        sync_switchOS('windows');
    }

    $('.pages-nav.nav-button').removeClass('active');
    $('.pages-nav.nav-button.sync').addClass('active');


}

function sync_switchOS(os) {
    var ostxt;
    nautilusurl = false;

    $('.megasync .download-megasync')
        .removeAttr('href')
        .removeClass('disabled');
    $('.megaapp-linux').addClass('hidden');
    $('.bottom-page.megasync').removeClass('linux');
    syncurl = megasync.getMegaSyncUrl(os);
    if (os === 'windows') {
        $('.megaapp-button-info.os').safeHTML(l[12485]);
        $('.megasync .download-megasync').attr('href', syncurl);
        //$('.megasync .download-megasync').off('click');
    }
    else if (os === 'mac') {
        ostxt = l[2031];
        if (l[1158].indexOf('Windows') > -1) {
            ostxt = l[1158].replace('Windows', 'Mac');
        }
        if (l[1158].indexOf('Linux') > -1) {
            ostxt = l[1158].replace('Linux', 'Mac');
        }
        $('.megaapp-button-info.os').safeHTML(l[12487]);
        $('.megasync .download-megasync').attr('href', syncurl);
    }
    else if (os === 'linux') {
        $('.bottom-page.megasync').addClass('linux');
        loadingDialog.show();
        megasync.getLinuxReleases(renderLinuxOptions);
    }
    $('.megaapp-button-info.os a').rebind('click', function(e) {
        if ($(this).hasClass('windows')) {
            sync_switchOS('windows');
        }
        else if ($(this).hasClass('mac')) {
            sync_switchOS('mac');
        }
        else if ($(this).hasClass('linux')) {
            sync_switchOS('linux');
        }
        return false;
    });
}

function changeLinux(linuxsync, i) {
    if (linuxsync[i]) {
        if (linuxsync[i]['32']) {
            $('.linux32').parent().show();
            $('.radio-txt.32').show();
        }
        else {
            $('.linux32').parent().hide();
            $('.radio-txt.32').hide();
        }

        $('.megasync .megaapp-linux-default').text(linuxsync[i].name);
        $('.megasync .download-megasync').removeClass('disabled');
        $('.megaapp-button-info.linux-txt').removeClass('disabled');
        var platform = '64';
        var c = $('.linux32').parent().attr('class');
        if (c && c.indexOf('radioOn') > -1) {
            platform = '32';
        }
        syncurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform);
        nautilusurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform + "n");
        var filename = syncurl.split('/').pop();
        $('.megasync .download-megasync').attr('href', syncurl);
        $('.megaapp-button-info.linux-txt a').attr('href', nautilusurl);
        syncsel = i;
    }
    else {
        syncurl = false;
        nautilusurl = false;
        $('.megasync .download-megasync').addClass('disabled');
        $('.megaapp-button-info.linux-txt').addClass('disabled');
        $('.megaapp-button-info.linux-txt a').removeAttr('href');
        $('.megasync .megaapp-linux-default').text(l[7086]);
    }
}
