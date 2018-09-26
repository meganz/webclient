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
    $content.find('.nav-buttons-bl a.linux').removeClass('download disabled')
        .attr('data-link','');
    $linuxBlock.addClass('hidden');
    $linuxBlock.find('.megaapp-linux-default').text(l[7086]);
    $linuxBlock.find('.radio-buttons label, .architecture-checkbox').removeClass('hidden');
}

/**
 * Init MEGAcmd functions
 */
function initMegacmd() {
    var url;
    var pf = navigator.platform.toUpperCase();
    var $content = $('.bottom-page.megacmd');

    resetMegacmd();

    if (pf.indexOf('LINUX') >= 0) {
        linuxMegacmdDropdown();
    }

    $content.find('.nav-buttons-bl a').rebind('click', function() {
        var $this = $(this);
        var osData = $this.attr('data-os');

        if (osData === 'windows') {
            window.location = windowsurl;
            resetMegacmd();
        }
        else if (osData === 'mac') {
            window.location = osxurl;
            resetMegacmd();
        }
        else if (osData === 'linux' && $this.attr('data-link')) {
            window.location = $this.attr('data-link');
        }
        else {
            linuxMegacmdDropdown();
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

    $content.find('.bottom-page.scroll-button').rebind('click', function() {
        $('html, body').animate({
            scrollTop: $('.bottom-page.full-block').offset().top
        }, 1000);
    });
}

/**
 * Init Linux Dropdown
 */
function linuxMegacmdDropdown() {
    var $content = $('.bottom-page.megacmd');
    var $button = $content.find('.pages-nav.nav-button.linux');
    var $dropdown = $content.find('.megaapp-dropdown');
    var $select = $dropdown.find('.megaapp-scr-pad');
    var $list = $dropdown.find('.megaapp-dropdown-list');
    $button.addClass('disabled').attr('data-link','');
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
            changeLinux(linuxClients, cmdsel);
        });
    });

    $('.bottom-page.radio-buttons input').rebind('change', function(e) {
        var $radio1 = $('#rad1');
        var $radio2 = $('#rad2');
        if ($radio1.parent().hasClass('radioOff')) {
            $radio1.parent().addClass('radioOn');
            $radio1.parent().removeClass('radioOff');
            $radio2.parent().addClass('radioOff');
            $radio2.parent().removeClass('radioOn');
            platformsel = '32';
        }
        else {
            $radio1.parent().addClass('radioOff');
            $radio1.parent().removeClass('radioOn');
            $radio2.parent().addClass('radioOn');
            $radio2.parent().removeClass('radioOff');
            platformsel = '64';
        }

        changeLinux(linuxClients, cmdsel);
    });

    // Close Dropdown if another element was clicked
    $('.bottom-page.scroll-block').rebind('click.closecmddropdown', function(e) {
        if ($dropdown.hasClass('active')) {
            if ($(e.target).parent('.megaapp-dropdown').length === 0 && !$(e.target).hasClass('megaapp-dropdown')) {
                $dropdown.removeClass('active');
                $list.addClass('hidden');
            }
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

        $pane.rebind('jsp-arrow-change', function(event, isAtTop, isAtBottom) {
            if (isAtBottom) {
                $arrow.addClass('inactive');
            }
            else {
                $arrow.removeClass('inactive');
            }
        });
    }
    else {
        if (jsp) {
            jsp.destroy();
        }
        $pane.off('jsp-arrow-change');
        $arrow.removeAttr('style');
        $arrow.addClass('hidden');
    }
}

/**
 * Turn on/off the 32/64bit radio button based on the selected linux distribution.
 */
function changeLinux(linuxdist, i) {
    var $content = $('.bottom-page.megacmd');
    var $button = $content.find('.pages-nav.nav-button.linux');

    if (linuxdist[i]) {
        if (linuxdist[i]['32']) {
            $content.find('.linux32').parent().removeClass('hidden');
            $content.find('.radio-txt.32').removeClass('hidden');
        }
        else {
            $content.find('.linux32').parent().addClass('hidden');
            $content.find('.radio-txt.32').addClass('hidden');
            $content.find('#rad1').prop('checked', false).parent().switchClass('radioOn', 'radioOff');
            $content.find('#rad2').prop('checked', true).parent().switchClass('radioOff', 'radioOn');
            platformsel = '64';
        }
        var link = linuxurl+linuxdist[i][platformsel];
        if (link) {
            $button.removeClass('disabled').addClass('download').attr('data-link', link);
        }
    }
}

initMegacmd();
