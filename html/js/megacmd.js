/**
 * Switch OS 
 */
function cmd_switchOS(os) {
    var url;
    $('.download-megacmd').removeClass('disabled');
    $('.megacmd-linux:visible').addClass('hidden');

    if (os === 'windows') {
        $('.megacmd-button-info').safeHTML(l[12485]);
        // TODO: set url url = '/windows/...';
        url = 'windows';
    }
    else if (os === 'mac') {
        $('.megacmd-button-info').safeHTML(l[12487]);
        // TODO: set url url = '/mac/...';
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
    initMegacmdDownload();
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
    var linuxClients;
    /* TODO: create dropdown items and links */
        // ....
        //  $('<div/>').addClass('default-dropdown-item icon ' + icon)
        //     .text(client.name)
        //     .attr('link', '')
        //     .appendTo($select);
        // ....
        // inuxMegacmdDropdownResizeHandler();
    /* End */
        // Talk to the CMS server and get information
        // about the `sync` (expect a JSON)
        CMS.get('cmd', function(err, content) {
            linuxClients = content.object;
            var linux = 'https://mega.nz/linux/MEGAsync/';
            linuxClients.forEach(function(val) {

                ['32', '64'].forEach(function(platform) {
                    var icon = val.name.toLowerCase().match(/([a-z]+)/i)[1];
                    icon = (icon === 'red') ? 'redhat' : icon;
                    if (val[platform]) {
                        $('<div/>').addClass('default-dropdown-item icon ' + icon)
                        .text(val.name)
                        .attr('link', '')
                        .appendTo($select);

                        linuxMegacmdDropdownResizeHandler();
                    }
                });
            });
            next(linuxClients);
        });
    // Dropdown item click event
    $('.default-dropdown-item', $dropdown).rebind('click', function() {
        $dropdown.find('span').text($(this).text());
        initMegacmdDownload($(this).attr('link'));
        $button.removeClass('disabled');
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

initMegacmd();