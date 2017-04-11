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
    $('.sync-button-txt.small').text(ostxt);
    $('.sync-bottom-txt.button-txt').safeHTML(l[12486]);
    $('.sync-bottom-txt.linux-txt')
        .safeHTML('<span class="nautilus-lnk">' +
            'MEGA <a href="" class="red">Nautilus extension</a> (@@)</span>', l[2028]);
    $('.sync-button').removeClass('mac linux').addClass('linux');
    $('.sync-button-block.linux').removeClass('hidden');
    $('.architecture-checkbox input').bind('click', function() {
        $('.architecture-checkbox.radioOn').removeClass('radioOn').addClass('radioOff');
        $(this).parent().removeClass('radioOff').addClass('radioOn');
        $(this).attr('checked', true);
    });
    $('.sync-button.linux').addClass('disabled');
    $('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
    $('.version-select-txt').text(l[2029]);
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('i686') > -1
            || ua.indexOf('i386') > -1 || ua.indexOf('i586') > -1) {
        $('.sync-radio-buttons #rad1').click();
    }
    loadingDialog.hide();

    megasync.UILinuxDropdown(function($element) {
        changeLinux(linuxsync, $element.data('client-id'));
    });

    $('.sync-bottom-txt.linux-txt a').rebind('click', function(e) {
            if (!nautilusurl) {
                return false;
            }
        });

    $('.sync-button').rebind('click', function(e) {
            if (!syncurl) {
                msgDialog('info', l[2029], l[2030]);
                return false;
            }
        });

    $('.sync-radio-buttons input').rebind('change', function(e) {
            if (syncsel) {
                setTimeout(function() {
                    changeLinux(linuxsync, syncsel);
                }, 1);
            }
        });

    $('.sync-bottom-txt.button-txt a').rebind('click', function(e) {
        if ($(this).hasClass('windows')) {
            sync_switchOS('windows');
        }
        else if ($(this).hasClass('mac')) {
            sync_switchOS('mac');
        }
        else if ($(this).hasClass('linux')) {
            sync_switchOS('linux');
        }
        mainScroll();
        return false;
    });
}

function init_sync() {
    $('.st-apps-icon.mobile').rebind('click', function() {
        loadSubPage('mobile');
    });

    $('.st-apps-icon.browser').rebind('click', function() {
        loadSubPage('plugin');
    });

    $('.sync-help-center').rebind('click', function(e) {
        loadSubPage('help/client/megasync');
    });
    setTimeout(function() {
        $('#syncanim').rebind('click', function(e) {
            if (syncurl) {
                loadSubPage(syncurl);
            }
        });
    }, 1000);
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
}

function sync_switchOS(os) {
    var ostxt;
    $('.linuxhint').hide();
    $('.sync-button').attr('href', '');
    $('.sync-button-block.linux').addClass('hidden');
    syncurl = megasync.getMegaSyncUrl(os);
    if (os === 'windows') {
        $('.sync-button-txt.small').text(l[1158]);
        $('.sync-bottom-txt.button-txt').safeHTML(l[12485]);
        $('.sync-button').removeClass('mac linux');
        $('.sync-button').attr('href', syncurl);
        $('.sync-button').unbind('click');
    }
    else if (os === 'mac') {
        ostxt = l[2031];
        if (l[1158].indexOf('Windows') > -1) {
            ostxt = l[1158].replace('Windows', 'Mac');
        }
        if (l[1158].indexOf('Linux') > -1) {
            ostxt = l[1158].replace('Linux', 'Mac');
        }
        $('.sync-button-txt.small').text(ostxt);
        $('.sync-bottom-txt.button-txt').safeHTML(l[12487]);
        $('.sync-button').removeClass('windows linux').addClass('mac');
        $('.sync-button').attr('href', syncurl);
        $('.sync-button').unbind('click');
    }
    else if (os === 'linux') {
        loadingDialog.show();
        megasync.getLinuxReleases(renderLinuxOptions);
    }
    $('.sync-bottom-txt.button-txt a').rebind('click', function(e) {
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

        $('.version-select-txt').text(linuxsync[i].name);
        $('.sync-button.linux').removeClass('disabled');
        $('.sync-bottom-txt.linux-txt').css('opacity', '1');
        var platform = '64';
        var c = $('.linux32').parent().attr('class');
        if (c && c.indexOf('radioOn') > -1) {
            platform = '32';
        }
        syncurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform);
        nautilusurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform + "n");
        var filename = syncurl.split('/').pop();
        $('.sync-button').attr('href', syncurl);
        $('.sync-bottom-txt.linux-txt a').attr('href', nautilusurl);
        $('.linuxhint').safeHTML('*@@: <font style="font-family:courier;">@@ @@</font>',
                                 l[1909], linuxsync[i].c, filename);
        $('.linuxhint').show();
        syncsel = i;
        mainScroll();
    }
    else {
        syncurl = false;
        nautilusurl = false;
        $('.linuxhint').hide();
        $('.sync-button.linux').addClass('disabled');
        $('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
        $('.version-select-txt').text(l[2029]);
        mainScroll();
    }
}
