var linuxClients;
var cmdsel = false;
var platformsel = '64';
var linuxnameindex = {};
var linuxurl = 'https://mega.nz/linux/repo/';
var windowsurl = {
    window_x64: 'https://mega.nz/MEGAcmdSetup64.exe',
    window_x32: 'https://mega.nz/MEGAcmdSetup32.exe'
};
var osxurl = 'https://mega.nz/MEGAcmdSetup.dmg';

/**
 * Reset MEGAcmd to default
 */
function resetMegacmd() {
    var $content = $('.bottom-page.megacmd', '.fmholder');
    var $linuxBlock = $content.find('.megaapp-linux');

    $content.removeClass('linux');
    $linuxBlock.addClass('hidden');
    $('.nav-buttons-bl a.linux', $content).removeClass('download active');
    $('.dropdown-input > span', $linuxBlock).text(l[7086]);
    $('.radio-buttons label, .architecture-checkbox', $linuxBlock).removeClass('hidden');
    $('.linux-bit-radio', $linuxBlock).addClass('hidden');
    $('.megacmd-linux-download', $linuxBlock).addClass('disabled');
}

/**
 * Init MEGAcmd functions
 */
function initMegacmd() {
    var pf = navigator.platform.toUpperCase();
    var $content = $('.bottom-page.megacmd', '.fmholder');

    resetMegacmd();

    // Hide windows options as default
    $('.megaapp-windows', $content).addClass('hidden');

    if (pf.indexOf('LINUX') >= 0) {
        $('.nav-buttons-bl a.linux').addClass('active');
        linuxMegacmdDropdown();
    }

    $('.nav-buttons-bl a', $content).rebind('click', function() {
        var $tab = $(this);
        var osData = $tab.attr('data-os');

        if (!$tab.attr('class')) {
            return false;
        }

        // Hide windows options as default
        $('.megaapp-windows', $content).addClass('hidden');

        if (osData === 'windows') {
            if (ua.details.is64bit && !ua.details.isARM) {
                // Download app for Windows 64bit
                window.location = windowsurl.window_x64;
                $('.megaapp-windows-info.64bit', $content).addClass('hidden');
            }
            else {
                // Download app for Windows 32bit
                window.location = windowsurl.window_x32;
                $('.megaapp-windows-info.32bit', $content).addClass('hidden');
            }

            $('.megaapp-windows', $content).removeClass('hidden');
            resetMegacmd();
        }
        else if (osData === 'mac') {
            window.location = osxurl;
            resetMegacmd();
        }
        else if (osData === 'linux' && $tab.hasClass('active')) {
            resetMegacmd();
        }
        else {
            $tab.addClass('active');
            linuxMegacmdDropdown();
        }
        return false;
    });

    $('.megaapp-windows-info.32bit a', $content).rebind('click.megacmdWin32', function() {
        window.location = windowsurl.window_x32;
        return false;
    });

    $('.megaapp-windows-info.64bit a', $content).rebind('click.megacmdWin64', function() {
        window.location = windowsurl.window_x64;
        return false;
    });

    $('.copy-install-guide-icon', $content)
        .rebind('click', function() {
            var $this = $(this);
            if (copyToClipboard($('.install-guide', $this.closest('.install-guide-text')).text())) {
                $this.removeClass('active');
                var $icon = $('.copy-line-icon', $this);
                if (!$icon.hasClass('active')) {
                    $icon.addClass('active');
                }
                var $copiedMsg = $('.install-guide-copy-msg', $this.closest('.copy-line'));
                $copiedMsg.removeClass('hidden');
                setTimeout(function() {
                    $icon.removeClass('active');
                    $copiedMsg.addClass('hidden');
                }, 2000);
            }
        });

    $('.tab-button', $content).rebind('click', function() {
        var $this = $(this);
        var className = $this.attr('data-class');

        if (!$this.hasClass('active')) {
            $content.find('.tab-button, .tab-body, .dark-tab-img').removeClass('active');
            $this.addClass('active');
            $content.find('.' + className).addClass('active');
        }
    });

    registerLinuxDownloadButton($('.megacmd-linux-download', $content));
}

/**
 * Update UI with new linux selection.
 */
function changeLinuxCMD(linuxClients, i) {
    'use strict';

    var $page = $('.bottom-page.megacmd', '.fmholder');

    if (linuxClients[i]) {
        const $linux32 = $('.linux32', $page);
        const $linux64 = $('.linux64', $page);
        const $parent32 = $linux32.parent();
        const $parent64 = $linux64.parent();

        const is64 = !!linuxClients[i][64];
        const is32 = !!linuxClients[i][32];
        const hidden32 = $parent32.hasClass('hidden');
        const hidden64 = $parent64.hasClass('hidden');

        // If we need to change which radio buttons are visible/selected
        if (
            !(is32 && !hidden32 && is64 && !hidden64)    // The 32bit + 64bit options are not both shown
            && !(is32 && !hidden32 && !is64 && hidden64) // The 32bit option is not shown alone
            && !(!is32 && hidden32 && is64 && !hidden64) // The 64bit option is not shown alone
        ) {
            $parent32.addClass('hidden');
            $parent64.addClass('hidden');
            $('.radio-txt.32, .radio-txt.64', $page).addClass('hidden');

            if (is32) {
                $parent32.removeClass('hidden');
            }
            if (is64) {
                $parent64.removeClass('hidden');
            }
            if (is32 && is64) {
                $linux64.prop('checked', true);
                $parent64.removeClass('radioOff').addClass('radioOn');
                $linux32.prop('checked', false);
                $parent32.removeClass('radioOn').addClass('radioOff');
                $('.radio-txt.32, .radio-txt.64', $page).removeClass('hidden');
            }
            else if (!is32 && is64) {
                $linux64.prop('checked', true);
                $parent64.removeClass('radioOff').addClass('radioOn');
                $linux32.prop('checked', false);
                $parent32.removeClass('radioOn').addClass('radioOff');
                $('.radio-txt.64', $page).removeClass('hidden');
            }
            else {
                $linux32.prop('checked', true);
                $parent32.removeClass('radioOff').addClass('radioOn');
                $linux64.prop('checked', false);
                $parent64.removeClass('radioOn').addClass('radioOff');
                $('.radio-txt.32', $page).removeClass('hidden');
            }
        }
        // Handle setting the link correctly

        $('.linux-bit-radio', $page).removeClass('hidden');

        var link = linuxurl + linuxClients[i][platformsel];

        if (link) {
            $('.megacmd-linux-download', $page).addClass('download')
                .removeClass('disabled').attr('data-link', link);
        }
        $('.install-guide-text .install-guide', $page).text(linuxClients[i].help_text);
    }
}

/**
 * Init Linux Dropdown
 */
function linuxMegacmdDropdown() {
    var $content = $('.bottom-page.megacmd', '.fmholder');
    var $button = $('.pages-nav.nav-button.linux', $content);
    var $dropdown = $('.megaapp-dropdown', $content);
    var $list = $('.dropdown-scroll', $dropdown);

    $button.addClass('active');
    $('.megaapp-linux', $content).removeClass('hidden');
    $content.addClass('linux');

    CMS.scope = 'cmd';

    CMS.get('cmd', function(err, content) {
        linuxnameindex = {};
        linuxClients = content.object;

        for (var i = 0;i < linuxClients.length;i++) {
            var val = linuxClients[i];

            linuxnameindex[val.name] = i;

            ['32', '64'].forEach(function(platform) {

                var icon = val.name.toLowerCase().match(/([a-z]+)/i)[1];
                var itemNode;

                icon = (icon === 'red') ? 'redhat' : icon;

                if (val[platform] &&
                    $('div.option[data-client="' + val.name + '"]', $list).length === 0) {
                    itemNode = mCreateElement('div', {
                        'class': 'option',
                        'data-client': val.name,
                        'data-link': linuxurl + val[platform]
                    }, $list[0]);
                    mCreateElement('i', {'class': 'icon linux download-sprite ' + icon}, itemNode);
                    mCreateElement('span', undefined, itemNode).textContent = val.name;
                }
            });
        }

        // Dropdown item click event
        $('.option', $dropdown).rebind('click.selectapp', function() {
            cmdsel = linuxnameindex[$(this).text()];
            platformsel = linuxClients[cmdsel][64] ? '64' : '32';
            changeLinuxCMD(linuxClients, cmdsel);
        });

        bindDropdownEvents($dropdown, false, '.fmholder');

        var $linuxBitRadios = $('.architecture-checkbox input', $content);

        $linuxBitRadios.rebind('click', function() {
            platformsel = $(this).val();
            $linuxBitRadios.each(function() {
                var $other = $(this);
                if ($other.val() !== platformsel) {
                    $other.parent().removeClass('radioOn').addClass('radioOff');
                    $other.prop('checked', false);
                } else {
                    $other.parent().removeClass('radioOff').addClass('radioOn');
                    $other.prop('checked', true);
                }
            });

            if (cmdsel) {
                setTimeout(function() {
                    changeLinuxCMD(linuxClients, cmdsel);
                }, 1);
            }

            return false;
        });
    });
}

initMegacmd();
