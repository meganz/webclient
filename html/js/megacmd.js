var linuxClients;
var cmdsel = false;
var platformsel = '64';
var linuxnameindex = {};
var linuxurl = 'https://mega.nz/linux/MEGAsync/';
var windowsurl = 'https://mega.nz/MEGAcmdSetup.exe';
var osxurl = 'https://mega.nz/MEGAcmdSetup.dmg';
/**
 * Switch OS 
 */
function cmd_switchOS(os) {
    var url;
    $('.download-megacmd').removeClass('disabled');
    $('.megacmd-linux:visible').addClass('hidden');

    if (os === 'windows') {
        $('.megacmd-button-info').safeHTML(l[12485]);
        url = windowsurl;
    }
    else if (os === 'mac') {
        $('.megacmd-button-info').safeHTML(l[12487]);
        url = osxurl;
    }
    else if (os === 'linux') {
        $('.megacmd-button-info').safeHTML(l[12486]);
        $('.megacmd-linux').removeClass('hidden');
        linuxMegacmdDropdown();
    }

    $('.megacmd-button-info a').rebind('click', function(e) {
        if ($(this).hasClass('windows')) {
            cmd_switchOS('windows');
        }
        else if ($(this).hasClass('mac')) {
            cmd_switchOS('mac');
        }
        else if ($(this).hasClass('linux')) {
            cmd_switchOS('linux');
        }
        return false;
    });

    if (url) {
        initMegacmdDownload(url);
    }
    mainScroll();
}

/**
 * Init MEGAcmd functions
 */
function initMegacmd() {
    var pf = navigator.platform.toUpperCase();

    $('.download-megacmd').removeClass('disabled');

    if (pf.indexOf('MAC') >= 0) {
        cmd_switchOS('mac');
    }
    else if (pf.indexOf('LINUX') >= 0) {
        cmd_switchOS('linux');
    }
    else {
        cmd_switchOS('windows');
    }

    $('.megacmd-button-info a').rebind('click', function(e) {
        if ($(this).hasClass('windows')) {
            cmd_switchOS('windows');
        }
        else if ($(this).hasClass('mac')) {
            cmd_switchOS('mac');
        }
        else if ($(this).hasClass('linux')) {
            cmd_switchOS('linux');
        }
        return false;
    });
}

/**
 * Init MEGAcmd download button
 */
function initMegacmdDownload(url) {
    var $button = $('.download-megacmd');
    if (!$button.hasClass('disabled')) {
        if (url) {
            $button.rebind('click', function() {
                window.location = url;
            });
        }
        else {
            $button.rebind('click', function() {
                window.location = $button.attr('data-link');
            });
        }
    }
}

/**
 * Init Linux Dropdown
 */
function linuxMegacmdDropdown() {

    var $button = $('.download-megacmd');
    var $dropdown = $('.megacmd-dropdown'); 
    var $select = $dropdown.find('.megacmd-scr-pad');
    var $list = $dropdown.find('.megacmd-dropdown-list');
    $button.addClass('disabled');

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
            $button.removeClass('disabled');

            cmdsel = linuxnameindex[$(this).text()];
            changeLinux(linuxClients, cmdsel);
        });
    });

    $('.sync-radio-buttons input').rebind('change', function(e) {
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
    $('.main-pad-block').rebind('click.closecmddropdown', function(e) {
        if ($dropdown.hasClass('active')) {
            if ($(e.target).parent('.megacmd-dropdown').length === 0 && !$(e.target).hasClass('megacmd-dropdown')) {
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

    var $main = $('.megacmd-dropdown:visible');
    var $pane = $main.find('.megacmd-dropdown-scroll');
    var jsp   = $pane.data('jsp');
    var $list = $main.find('.megacmd-dropdown-list');
    var $arrow = $main.find('.mega-list-arrow');
    var overlayHeight = $('.megasync-overlay').outerHeight();
    var listHeight = $main.find('.megacmd-scr-pad').outerHeight() + 72;
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

/**
 * Turn on/off the 32/64bit radio button based on the selected linux distribution.
 */
function changeLinux(linuxdist, i) {
    if (linuxdist[i]) {
        if (linuxdist[i]['32']) {
            $('.linux32').parent().show();
            $('.radio-txt.32').show();
        }
        else {
            $('.linux32').parent().hide();
            $('.radio-txt.32').hide();
            $('#rad1').attr('checked', false).parent().switchClass('radioOn', 'radioOff');
            $('#rad2').attr('checked', true).parent().switchClass('radioOff', 'radioOn');
            platformsel = '64';
        }
        var link = linuxurl+linuxdist[i][platformsel];
        if (link) {
            initMegacmdDownload(link);
        }
    }
}

initMegacmd();