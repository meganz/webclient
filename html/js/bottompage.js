/**
 * Bottom pages functionality
 */
var bottompage = {

    /**
     * Initialise the page
     */
    init: function() {

        "use strict";

        var $content = $('.bottom-page.scroll-block', '.fmholder');

        if (page.substr(0, 4) === 'help' || page.substr(0, 9) === 'corporate' || page.substr(0, 9) === 'corporate') {
            $('body').addClass('old');
            scrollMenu();
        }
        else {
            $('body').removeClass('old');
        }

        // Init animations
        if ($content.hasClass('animated-page')) {
            bottompage.initAnimations($content);
        }

        // Init Slider for business page
        if (page === 'business') {
            bottompage.initSlider();
        }
        if (u_attr && u_attr.b && u_attr.b.s !== -1) {
            $('.bottom-menu.body .resellerlink', $content).addClass('hidden');
            $('.bottom-menu.body .pro-link', $content).addClass('hidden');
        }
        else {
            $('.bottom-menu.body .resellerlink', $content).removeClass('hidden');
            $('.bottom-menu.body .pro-link', $content).removeClass('hidden');
        }

        // Insert variables with replaced browser names
        if (page === 'extensions' || page === 'bird') {
            bottompage.replaceSpecialVariables($content);
        }

        // Init Video resizing on security page
        if (page === 'security' && !is_mobile) {
            bottompage.videoResizing();

            $(window).rebind('resize.security', function (e) {
                bottompage.videoResizing();
            });
        }

        if (!is_mobile) {
            $('body').removeClass('mobile');
            bottompage.initNavButtons($content);
            bottompage.initFloatingTop();
        }
        else {
            $('body').addClass('mobile');
            bottompage.initMobileNavButtons($content);
        }

        // Init scroll button
        bottompage.initBackToScroll();
        bottompage.initScrollToContent();

        // Show/hide Referal Program and Pricing menu items for different acctount types
        bottompage.changeMenuItemsList($content);
    },

    /**
     * Show/hide necessary menu items for different acctount types
     */
    changeMenuItemsList: function($content) {
        "use strict";

        var $bottomMenu = $('.bottom-menu.body', $content);
        var $pagesMenu = $('.pages-menu.body', $content);

        // Show/Hide Affiliate program link in bottom menu
        if (mega.flags.refpr) {
            $('.bottom-menu.affiliate', $bottomMenu).removeClass('hidden');
        }
        else {
            $('.bottom-menu.affiliate', $bottomMenu).addClass('hidden');
        }

        // Show/Hide Pricing link for Business sub accounts and admin expired
        if (u_attr && u_attr.b && u_attr.b.s !== -1) {
            $('.bottom-menu.pro', $bottomMenu).addClass('hidden');
            $('.pages-menu.link.pro', $pagesMenu).addClass('hidden');
        }
        else {
            $('.bottom-menu.pro', $bottomMenu).removeClass('hidden');
            $('.pages-menu.link.pro', $pagesMenu).removeClass('hidden');
        }
    },

    /**
     * Init Animated blocks
     * @param {Object} $content The jQuery selector for the current page
     * @returns {void}
     */
    initAnimations: function($content) {
        "use strict";

        var $scrollableBlock = is_mobile ? $('html') : $('.fmholder', 'body');

        // Init top-block animations
        setTimeout(function() {
            $content.addClass('start-animation');
        }, 700);

        var isVisibleBlock = function($row) {
            if ($row.length === 0) {
                return false;
            }

            var $window = $(window);
            var elementTop = $row.offset().top;
            var elementBottom = elementTop + $row.outerHeight();
            var viewportTop = $window.scrollTop();
            var viewportBottom = viewportTop + $window.outerHeight();

            return elementBottom - 80 > viewportTop && elementTop < viewportBottom;
        };

        var showAnimated = function($content) {
            var $blocks = $('.animated, .fadein', $content);

            for (var i = $blocks.length - 1; i >= 0; i--) {

                var $block = $($blocks[i]);

                if (isVisibleBlock($block)) {
                    if (!$block.hasClass('start-animation')) {
                        $block.addClass('start-animation');
                    }
                }
                else if ($block.hasClass('start-animation')) {
                    $block.removeClass('start-animation');
                }
            }
        };

        showAnimated($content);

        $scrollableBlock.add(window).rebind('scroll.startpage', function() {
            var $scrollTop = $('.scroll-to-top', $content);
            showAnimated();

            if (isVisibleBlock($('.bottom-page.light-blue.top, .bottom-page.top-bl', $content))) {
                $scrollTop.removeClass('up');
            }
            else {
                $scrollTop.addClass('up');
            }
        });

        // Init Scroll to Top button event
        $('.scroll-to-top:visible', $content).rebind('click.scroll', function() {

            if ($(this).hasClass('up')) {
                $scrollableBlock.animate({
                    scrollTop: 0
                }, 1600);
            }
            else {
                $scrollableBlock.animate({
                    scrollTop: $('.bottom-page.content', $content).outerHeight()
                }, 1600);
            }
        });
    },

    /**
    * replaceSpecialVariable
    * Replaces custom locale variables in HTML
    * @param {Object} $content The jQuery selector for the current page
    * @returns {void}
    */
    replaceSpecialVariables: function($content) {
        "use strict";

        var $topBlock = $('.top-bl', $content);
        var $elems = $('.top-dark-button span, .top-copyrights em', $topBlock);

        for (var i = 0; i < $elems.length; i++) {
            var $this = $($elems[i]);
            var labelNum = $this.text().match(/\$([^)]+)]/);

            if (labelNum[1] && l[labelNum[1]]) {
                $this.safeHTML(l[labelNum[1]]);
            }
        }
    },

    initBackToScroll: function() {
        "use strict";

        var $body = $('body');

        $('#startholder').rebind('scroll.bottompage', function() {
            sessionStorage.setItem('scrpos' + MurmurHash3(page).toString(16), $(this).scrollTop() | 0);
            if (page === 'download') {
                $(window).unbind('resize.download-bar');
            }
        });

        window.onpopstate = function() {

            var sessionData = sessionStorage['scrpos' + MurmurHash3(page).toString(16)];

            if ($body.hasClass('bottom-pages') && sessionData) {

                // Scroll to saved position and reset previous focus
                $('#startholder', $body).scrollTop(sessionData).trigger('mouseover');

                if (page === 'download') {

                    $('.download.top-bar', $body).removeClass('expanded initial').css('height', '');
                    $(window).unbind('resize.download-bar');
                }
            }
        };
    },

    initScrollToContent: function() {
        "use strict";

        // Init Scroll to Content event
        $('.bottom-page.scroll-button', '.top-bl').rebind('click.scrolltocontent', function() {

            $('.fmholder, html, body').animate({
                scrollTop: $('.full-block', 'body').position().top
            }, 1600);
        });
    },

    initNavButtons: function($content) {
        "use strict";

        var $topMenu = $('.pages-menu.body', $content);

        // No  pages  menu in DOM
        if ($topMenu.length === 0) {
            return false;
        }

        // Close  submenu function
        function closePagesSubMenu() {
            $('.submenu.active, .submenu-item.active', $topMenu).removeClass('active');
            $(window).unbind('resize.pagesmenu');
            $content.unbind('mousedown.closepmenu');
        }

        // Close previously opened sub menu
        closePagesSubMenu();

        // Open submenu
        $('.submenu-item', $topMenu).rebind('click.openpmenu', function() {
            var $this = $(this);
            var $submenu = $this.next('.submenu');

            if ($this.is('.active')) {
                closePagesSubMenu();

                return false;
            }

            function subMenuPos() {
                var $this = $('.submenu-item.active', $topMenu);
                var $submenu = $this.next('.submenu');

                $submenu.position({
                    of: $this,
                    my: "center top",
                    at: "center bottom",
                    collision: "fit"
                });
            }

            closePagesSubMenu();
            $this.addClass('active');
            $submenu.addClass('active');
            subMenuPos();

            $(window).rebind('resize.pagesmenu', function() {
                subMenuPos();
            });

            // Close pages submenu by click outside of submenu
            $content.rebind('mousedown.closepmenu', function(e) {
                var $target = $(e.target);

                if (!$target.is('.submenu.active') && !$target.closest('.submenu-item.active').length
                    && !$target.closest('.submenu.active').length) {
                    closePagesSubMenu();
                }
            });
        });
    },

    initMobileNavButtons: function($content) {
        "use strict";

        var $overlay = $('.nav-overlay', 'body');
        var $header = $('.fm-header', $content);
        var $topMenu = $('.pages-menu.body', $content);
        var $menuDropdown;

        $overlay.addClass('hidden');

        // No  pages menu in DOM
        if ($topMenu.length === 0) {
            $header.unbind('click.closepmenu');

            return false;
        }

        $menuDropdown = $('.mobile.pages-menu-dropdown', $content);

        // Close pages menu function
        function closePagesMenu() {
            $overlay.addClass('hidden');
            $('html').removeClass('overlayed');
            $topMenu.removeClass('active');
            $menuDropdown.removeClass('active');
            $overlay.unbind('click.closepmenu');
            $header.unbind('click.closepmenu');
        }

        // Close previously opened menu
        closePagesMenu();

        // Open menu
        $menuDropdown.rebind('click.openpmenu', function() {
            var $this = $(this);

            if ($this.is('.active')) {
                closePagesMenu();

                return false;
            }

            $overlay.removeClass('hidden');
            $('html').addClass('overlayed');
            $this.addClass('active');
            $topMenu.addClass('active');

            // Close previously opened menu by click on overlay or menu icon
            $overlay.add($header).rebind('click.closepmenu', function(e) {
                if ($(e.target).closest('.pages-menu-dropdown').length === 0) {
                    closePagesMenu();
                }
            });
        });

        // Expand submenu
        $('.submenu-item', $topMenu).rebind('click.opensubmenu', function() {
            var $this = $(this);
            var $submenu = $this.next('.submenu');

            if ($this.is('.active')) {
                $this.removeClass('active');
                $submenu.removeClass('active');
            }
            else {
                $this.addClass('active');
                $submenu.addClass('active');
            }
        });
    },

    initSlider: function() {

        "use strict";

        var $slider = $('.bottom-page.slider-body');

        $('.slider-button, .slider-dot-button', $slider).rebind('click', function() {
            var $this = $(this);
            var $buttons;
            var activeSlide;
            var newSlide;

            if (!$this.hasClass('active')) {
                $buttons = $('.slider-button, .slider-dot-button', $slider);
                activeSlide = $('.slider-button.active', $slider).attr('data-num');
                newSlide = $this.attr('data-num');

                $buttons.removeClass('active');
                $buttons.filter('.slide' + newSlide).addClass('active');
                $slider.removeClass('slide' + activeSlide).addClass('slide' + newSlide);
            }
        });

        $('.slider-ctrl-button', $slider).rebind('click', function() {
            var $this = $(this);
            var $buttons = $('.slider-button, .slider-dot-button', $slider);
            var activeSlide = parseInt($('.slider-button.active', $slider).attr('data-num'));
            var slidesNum = $('.slider-button', $slider).length;
            var newSlide;

            if ($this.hasClass('prev') && activeSlide > 1) {
                newSlide = activeSlide - 1;
            }
            else if ($this.hasClass('next') && activeSlide < slidesNum) {
                newSlide = activeSlide + 1;
            }
            else {
                return false;
            }

            $buttons.removeClass('active');
            $buttons.filter('.slide' + newSlide).addClass('active');
            $slider.removeClass('slide' + activeSlide).addClass('slide' + newSlide);
        });
    },

    initTabs: function() {
        $('.bottom-page.tab').rebind('click', function() {
            var $this = $(this);
            var tabTitle = $this.attr('data-tab');

            if (!$this.hasClass('active')) {
                $('.bottom-page.tab').removeClass('active');
                $('.bottom-page.tab-content:visible').addClass('hidden');
                $('.bottom-page.tab-content.' + tabTitle).removeClass('hidden');
                $this.addClass('active');
            }
        });
    },

    initFloatingTop: function() {
        var topHeader;
        var $navBar = $('.pages-menu.body', 'body');

        if (page === 'download') {
            topHeader = '.download.top-bar';
        }
        else if (page.substr(0, 4) === 'help') {
            topHeader = '.bottom-page .top-head, .old .top-head, .support-section-header';
        }
        else {
            topHeader = '.bottom-page .top-head, .old .top-head';
        }

        function topResize() {
            var $topHeader = $(topHeader, 'body');

            if ($topHeader.hasClass('floating')) {
                $topHeader.outerWidth($topHeader.parent().outerWidth());

                if (page !== 'download') {
                    $navBar.outerWidth($topHeader.parent().outerWidth());
                }
            }
            else {
                $topHeader.css('width',  '');
                $navBar.removeAttr('style');
            }
        }

        $(window).rebind('resize.topheader', function() {
            topResize();
        });

        $('.bottom-pages .fmholder').rebind('scroll.topmenu', function() {
            var $topHeader = $(topHeader);
            var topPos = $(this).scrollTop();
            var navTopPos;

            if (topPos > 300) {
                $topHeader.addClass('floating');
                topResize();
                if (topPos > 600) {
                    $topHeader.addClass('activated');
                }
            }
            else if (topPos <= 300 && topPos >= 50) {
                $topHeader.removeClass('activated');

                // Hide all popup as top bar not visisble for this part
                notify.closePopup();
                alarm.hideAllWarningPopups(true);
            }
            else {
                $topHeader.removeClass('floating activated').css('width',  '');
            }

            // Download bar collapse/expand
            if (page === 'download') {

                var dlStarted = $topHeader.hasClass('downloading') || $topHeader.hasClass('download-complete');

                if ((topPos > 150 && $topHeader.is('.expanded')) || dlStarted) {
                    $topHeader.removeClass('expanded initial').addClass('auto');
                    $('.pages-menu .submenu, .pages-menu .submenu-item', $topHeader).removeClass('active');
                }
                else if (topPos < 50 && $topHeader.is('.auto')) {
                    expandDlBar();
                }
                return;
            }

            if ($navBar.length === 0) {
                return;
            }

            if (topPos > 300) {
                $navBar.addClass('floating');
                $(window).unbind('resize.pagesmenu');
                $('.submenu.active, .submenu-item.active', $navBar).removeClass('active');
                topResize();
                if (topPos > 600) {
                    $navBar.addClass('activated');
                }
            }
            else if (topPos <= 300 && topPos >= 50) {
                $navBar.removeClass('activated');
            }
            else {
                $navBar.removeClass('floating activated').removeAttr('style');
            }
        });
    },

    videoResizing: function() {
        "use strict";

        var $videoWrapper = $('.security-page-video-block');
        var videoWidth = $videoWrapper.outerWidth();

        if ($videoWrapper.length > 0 && videoWidth < 640) {
            $videoWrapper.height(Math.round(videoWidth * 0.54));
        }
        else {
            $videoWrapper.removeAttr('style');
        }
    }
};
