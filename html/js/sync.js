var syncurl;
var nautilusurl;
var syncsel = false;

function renderLinuxOptions(linuxsync) {
    var ostxt;
    var $content = $('.bottom-page.megasync');
    syncurl = undefined;
    syncsel = false;

    $content.addClass('linux');
    $content.find('.megaapp-linux').removeClass('hidden');
    $content.find('.architecture-checkbox input').rebind('click', function() {
        var val = $(this).val();
        $content.find('.architecture-checkbox input').each(function() {
            var $other = $(this);
            if ($other.val() !== val) {
                $other.parent().removeClass('radioOn').addClass('radioOff');
                $other.prop('checked', false);
            } else {
                $other.parent().removeClass('radioOff').addClass('radioOn');
                $other.prop('checked', true);
            }
        });

        if (syncsel) {
            setTimeout(function() {
                changeLinux(linuxsync, syncsel);
            }, 1);
        }

        return false;
    });
    $content.find('.nav-buttons-bl a.linux').addClass('active');
    $content.find('.megasync .megaapp-linux-default').text(l[7086]);
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('i686') > -1 || ua.indexOf('i386') > -1 || ua.indexOf('i586') > -1) {
        $content.find('.megaapp-linux .linux32').click();
    }

    loadingDialog.hide();

    megasync.UILinuxDropdown(function($element) {
        changeLinux(linuxsync, $element.data('client-id'));
        return false;
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
    $content.find('.nav-buttons-bl a.linux').removeClass('active');
    $linuxBlock.addClass('hidden');
    $linuxBlock.find('.megaapp-linux-default').text(l[7086]);
    $linuxBlock.find('.radio-buttons label, .architecture-checkbox').removeClass('hidden');
    $linuxBlock.find('.linux-bit-radio').addClass('hidden');
    $linuxBlock.find('.megaext-dropdown').addClass('disabled');
    $linuxBlock.find('.megaext-header').addClass('disabled');
    $linuxBlock.find('.megaext-info-hover').addClass('disabled');
    $linuxBlock.find('.megaapp-linux-download, .megaext-linux-download').addClass('disabled');
    $linuxBlock.find('.megaext-linux-default').text(l[7086]);
}

/**
 * Init MEGAsync functions
 */
function initMegasync() {

    'use strict';

    var $content = $('.bottom-page.megasync');
    var pf = navigator.platform.toUpperCase();

    resetMegasync();

    // Hide windows options as default
    $('.megaapp-windows', $content).addClass('hidden');

    // Preload linux options if on a linux client
    if (pf.indexOf('LINUX') >= 0) {
        $('.nav-buttons-bl a.linux').addClass('active');
        megasync.getLinuxReleases(renderLinuxOptions);
    }

    $content.find('.nav-buttons-bl a').rebind('click', function() {
        var $this = $(this);
        var osData = $this.attr('data-os');

        // Hide windows options as default
        $('.megaapp-windows', $content).addClass('hidden');

        if (osData === 'windows') {
            if (ua.details.is64bit && !ua.details.isARM) {
                // Download app for Windows 64bit
                window.location = megasync.getMegaSyncUrl('windows');
                $('.megaapp-windows-info.64bit', $content).addClass('hidden');
            }
            else {
                // Download app for Windows 32bit
                window.location = megasync.getMegaSyncUrl('windows_x32');
                $('.megaapp-windows-info.32bit', $content).addClass('hidden');
            }

            $('.megaapp-windows', $content).removeClass('hidden');
            resetMegasync();
        }
        else if (osData === 'mac') {
            window.location = megasync.getMegaSyncUrl('mac');
            resetMegasync();
        }
        else if (osData === 'linux' && $this.hasClass('active')) {
            resetMegasync();
        }
        else {
            loadingDialog.show();
            megasync.getLinuxReleases(renderLinuxOptions);
        }

        return false;
    });

    $('.megaapp-windows-info.32bit a', $content).rebind('click.megasyncWin32', function() {
        window.location = megasync.getMegaSyncUrl('windows_x32');
        return false;
    });

    $('.megaapp-windows-info.64bit a', $content).rebind('click.megasyncWin64', function() {
        window.location = megasync.getMegaSyncUrl('windows');
        return false;
    });

    registerLinuxDownloadButton($content.find('.megaapp-linux-download, .megaext-linux-download'));

    $content.find('.tab-button').rebind('click', function() {
        var $this = $(this);
        var className = $this.attr('data-class');

        if (!$this.hasClass('active')) {
            $content.find('.tab-button, .tab-body, .dark-tab-img').removeClass('active');
            $this.addClass('active');
            $content.find('.' + className).addClass('active');
        }
        return false;
    });

    $content.rebind('click.resetMegaSync', function(e) {
        var $target = $(e.target);
        if (!(megasync.UICloseLinuxDropdown() || megasync.UICloseExtensionsDropdown())) {
            if (pf.indexOf('LINUX') < 0 && $target.closest('.megaapp-linux').length < 1) {
                resetMegasync();
            }
        }
    });

    $('.pages-nav.nav-button').removeClass('active');
    $('.pages-nav.nav-button.sync').addClass('active');
}

function changeLinux(linuxsync, i) {
    'use strict';

    var $content = $('.bottom-page.megasync');

    if (linuxsync[i]) {
        $content.find('.linux-bit-radio').removeClass('hidden');

        var platform = '64';
        if ($('.linux32', $content).parent().hasClass('radioOn')) {
            platform = '32';
        }

        if (linuxsync[i]['32']) {
            $content.find('.linux32').parent().show();
            $content.find('.radio-txt.32').show();
        }
        else {
            $content.find('.linux32').parent().hide();
            $content.find('.radio-txt.32').hide();

            if (platform === '32') {
                platform = '64';
                $('.architecture-checkbox input.linux64', $content).trigger('click');
            }
        }

        $content.find('.megaapp-linux-default').text(linuxsync[i].name);

        populateExtensions(i, platform);

        syncurl = megasync.getMegaSyncUrl(linuxsync[i]['name'] + " " + platform);
        $content.find('.megaapp-linux-download')
            .addClass('download')
            .removeClass('disabled')
            .attr('data-link', syncurl);

        mBroadcaster.sendMessage('megasync-linux-distro-selected', syncurl);
        syncsel = i;
    }
    else {
        syncurl = false;
        nautilusurl = false;
        $content.find('.nav-buttons-bl a.linux').addClass('active');
        $content.find('.megaapp-linux-default').text(l[7086]);
    }
}

function populateExtensions(distroIndex, platform) {
    'use strict';

    var $content = $('.bottom-page.megasync');

    $content.find('.megaext-linux-download')
        .removeClass('download').addClass('disabled')
        .attr('data-link', null);

    megasync.UIExtensionsDropdown(distroIndex, platform, function(extension) {
        $content.find('.megaext-linux-download')
            .removeClass('disabled').addClass('download')
            .attr('data-link', extension.url);
        return false;
    });
}
