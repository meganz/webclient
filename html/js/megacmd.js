var linuxClients;
var cmdsel = false;
var platformsel = '64';
var linuxnameindex = {};
var linuxurl = 'https://mega.nz/linux/MEGAsync/';
var windowsurl = 'https://mega.nz/MEGAcmdSetup.exe';
var osxurl = 'https://mega.nz/MEGAcmdSetup.dmg';

/**
 * Reset MEGAcmd to default
 */
function resetMegacmd() {
    var $content = $('.bottom-page.megacmd');
    var $linuxBlock = $content.find('.megaapp-linux');

    $content.removeClass('linux');
    $content.find('.nav-buttons-bl a.linux').removeClass('download active');
    $linuxBlock.addClass('hidden');
    $linuxBlock.find('.megaapp-linux-default').text(l[7086]);
    $linuxBlock.find('.radio-buttons label, .architecture-checkbox').removeClass('hidden');
    $linuxBlock.find('.linux-bit-radio').addClass('hidden');
    $linuxBlock.find('.megacmd-linux-download').addClass('disabled');
}

/**
 * Init MEGAcmd functions
 */
function initMegacmd() {
    var pf = navigator.platform.toUpperCase();
    var $content = $('.bottom-page.megacmd');

    resetMegacmd();

    if (pf.indexOf('LINUX') >= 0) {
        $('.nav-buttons-bl a.linux').addClass('active');
        linuxMegacmdDropdown();
    }

    $content.find('.nav-buttons-bl a').rebind('click', function() {
        var $tab = $(this);
        var osData = $tab.attr('data-os');

        if (osData === 'windows') {
            window.location = windowsurl;
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

    $content.find('.tab-button').rebind('click', function() {
        var $this = $(this);
        var className = $this.attr('data-class');

        if (!$this.hasClass('active')) {
            $content.find('.tab-button, .tab-body, .dark-tab-img').removeClass('active');
            $this.addClass('active');
            $content.find('.' + className).addClass('active');
        }
    });

    registerLinuxDownloadButton($content.find('.megacmd-linux-download'));

    $('.bottom-page.scroll-block').rebind('click.closeMegaCmdLinux', function(e) {
        var $dropdown = $('.bottom-page.megacmd').find('.megaapp-dropdown');
        if ($dropdown.hasClass('active')) {
            $dropdown.removeClass('active');
            $dropdown.find('.megaapp-dropdown-list').addClass('hidden');
        } else {
            var $target = $(e.target);
            if (pf.indexOf('LINUX') < 0 && $target.closest('.megaapp-linux').length < 1) {
                resetMegacmd();
            }
        }
    });

}

/**
 * Update UI with new linux selection.
 */
function changeLinuxCMD(linuxClients, i) {
    'use strict';
    var $page = $('.bottom-page.megacmd');
    if (linuxClients[i]) {
        var $linux32 = $page.find('.linux32');
        var $linux64 = $page.find('.linux64');

        if (linuxClients[i]['32']) {
            $linux32.parent().removeClass('hidden');
            $page.find('.radio-txt.32').removeClass('hidden');
        }
        else {
            $linux32.parent().addClass('hidden');
            $page.find('.radio-txt.32').addClass('hidden');
            $linux32.prop('checked', false).parent().switchClass('radioOn', 'radioOff');
            $linux64.prop('checked', true).parent().switchClass('radioOff', 'radioOn');

            if (platformsel === '32') {
                platformsel = '64';
                $linux64.trigger('click');
            }
        }
        $page.find('.linux-bit-radio').removeClass('hidden');

        var link = linuxurl + linuxClients[i][platformsel];
        if (link) {
            $page.find('.megacmd-linux-download').addClass('download').removeClass('disabled').attr('data-link', link);
        }
    }
}

/**
 * Init Linux Dropdown
 */
function linuxMegacmdDropdown() {
    var $content = $('.bottom-page.megacmd');
    var $button = $content.find('.pages-nav.nav-button.linux');
    var $dropdown = $content.find('.megaapp-dropdown');
    var $select = $dropdown.find('.megaapp-scr-pad').empty();
    var $list = $dropdown.find('.megaapp-dropdown-list');
    $button.addClass('active');
    $content.find('.megaapp-linux').removeClass('hidden');
    $content.addClass('linux');

    CMS.get('cmd', function(err, content) {
        linuxnameindex = {};
        linuxClients = content.object;
        for (var i = 0;i<linuxClients.length;i++) {
            var val = linuxClients[i];
            linuxnameindex[val.name] = i;
            ['32', '64'].forEach(function(platform) {
                var icon = val.name.toLowerCase().match(/([a-z]+)/i)[1];
                icon = (icon === 'red') ? 'redhat' : icon;
                if (val[platform] && platform === platformsel) {
                    $('<div/>').addClass('default-dropdown-item icon ' + icon)
                    .text(val.name)
                    .attr('link', linuxurl+val[platform])
                    .appendTo($select);

                    linuxMegacmdDropdownResizeHandler();
                }
            });
        };
        // Dropdown item click event
        $('.default-dropdown-item', $dropdown).rebind('click', function() {
            $dropdown.find('span').text($(this).text());

            cmdsel = linuxnameindex[$(this).text()];
            changeLinuxCMD(linuxClients, cmdsel);
        });

        var $linuxBitRadios = $content.find('.architecture-checkbox input');
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

    // Close Dropdown if another element was clicked
    $('.bottom-page.scroll-block').rebind('click.closecmddropdown', function(e) {
        if ($dropdown.hasClass('active')) {
            if ($(e.target).parent('.megaapp-dropdown').length === 0 && !$(e.target).hasClass('megaapp-dropdown')) {
                $dropdown.removeClass('active');
                $list.addClass('hidden');
            }
            return false;
        }
    });

    // Open/Close Dropdown event
    $dropdown.rebind('click', function() {
        var $this = $(this);
        if ($this.hasClass('active')) {
            $this.removeClass('active');
            $list.addClass('hidden');
        } else {
            $this.addClass('active');
            $list.removeClass('hidden');
            linuxMegacmdDropdownResizeHandler();
        }
        return false;
    });

    // Window resize handler
    $(window).rebind('resize.linuxMegacmdDropdown', function() {
        linuxMegacmdDropdownResizeHandler();
    });
}

/**
 * Handle window-resize events on the Linux Dropdown
 */
function linuxMegacmdDropdownResizeHandler() {

    var $main = $('.megaapp-dropdown:visible');
    var $pane = $main.find('.megaapp-dropdown-scroll');
    var jsp   = $pane.data('jsp');
    var $list = $main.find('.megaapp-dropdown-list');
    var $arrow = $list.find('.mega-list-arrow');
    var $upArrow = $list.find('.mega-list-arrow.up');
    var $downArrow = $list.find('.mega-list-arrow.down');
    var overlayHeight = $('.megasync-overlay').outerHeight();
    var listHeight = $main.find('.megaapp-scr-pad').outerHeight() + 72;
    var listPosition;

    if ($list.length) {
        listPosition = $list.offset().top;
    }

    if (overlayHeight < (listHeight + listPosition)) {
        $arrow.removeClass('hidden');
        $downArrow.removeClass('inactive');
        $pane.height(overlayHeight - listPosition - 72);
        $pane.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});
        var jspAPI = $pane.data('jsp');

        $pane.rebind('jsp-arrow-change', function(event, isAtTop, isAtBottom) {
            if (isAtBottom) {
                $downArrow.addClass('inactive');
            }
            else if (isAtTop) {
                $upArrow.addClass('inactive');
            }
            else {
                $arrow.removeClass('inactive');
            }
        });

        $arrow.rebind('click', function() {
            jspAPI.scrollByY($(this).hasClass('up') ? -200 : 200, true);
            return false;
        });
    }
    else {
        if (jsp) {
            jsp.destroy();
        }
        $pane.off('jsp-arrow-change');
        $arrow.removeAttr('style');
        $arrow.addClass('hidden');
        $arrow.off('click');
    }
}

initMegacmd();
