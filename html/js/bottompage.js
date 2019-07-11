/**
 * Bottom pages functionality
 */
var bottompage = {

    /**
     * Initialise the page
     */
    init: function() {
        "use strict";

        bottompage.initNavButtons();
        if (page.substr(0, 4) === 'help' || page === 'cpage' || page.substr(0, 9) === 'corporate') {
            $('body').addClass('old');
            scrollMenu();
        }
        else {
            $('body').removeClass('old');
        }

        // Init Slider for business page
        if (page === 'business') {
            bottompage.initSlider();
        }
        if (u_attr && u_attr.b && u_attr.b.s !== -1) {
            $('.bottom-menu.body .resellerlink').hide(); // hidden class is overwritten
            $('.bottom-menu.body .pro-link').hide(); // hidden class is overwritten
        }
        else {
            $('.bottom-menu.body .resellerlink').show();
            $('.bottom-menu.body .pro-link').show();
        }

        // Init Video resizing on security page
        if (page === 'security' && !is_mobile) {
            bottompage.videoResizing();

            $(window).rebind('resize.security', function (e) {
                bottompage.videoResizing();
            });
        }

        if (!is_mobile) {
            bottompage.initFloatingTop();
            $('body').removeClass('mobile');
            bottompage.initBackToScroll();
        }
        else {
            $('body').addClass('mobile');
            if (is_android) {
                bottompage.topBlockHeight();

                $(window).off('orientationchange').on('orientationchange', function() {
                    bottompage.topBlockHeight();
                });
            }
        }
    },

    initBackToScroll: function() {
        "use strict";

        $('#startholder').rebind('scroll.bottompage', function() {
            sessionStorage.setItem('scrollPosition_' + page, $(this).scrollTop());
            if (page === 'download') {
                $(window).unbind('resize.download-bar');
            }
        });

        window.onpopstate = function() {
            var sessionData = sessionStorage['scrollPosition_' + page];

            if ($('body').hasClass('bottom-pages') && sessionData) {
                $('#startholder').scrollTop(sessionData);
                if (page === 'download') {
                    $('.download.top-bar').removeClass('expanded').css('height', '');
                    $(window).unbind('resize.download-bar');
                }
            }
        };
    },

    initNavButtons: function() {
        $('.pages-nav.nav-button').removeClass('active');

        try {
            $('.pages-nav.nav-button.' + page).addClass('active');
        }
        catch (exception) { };

        hiddenNavDropdown();

        $('.nav-button.compound-lnk').rebind('click', function() {
            var $this = $(this);
            var $dropdown = $this.prev('.compound-items');

            $this.addClass('opened');
            $('.nav-overlay').removeClass('hidden');
            $('.pages-nav.nav-button.active').addClass('greyed-out');
            $dropdown.addClass('active');

            function navDropdownPos() {
                var $this = $('.nav-button.compound-lnk.opened');
                var $dropdown = $('.pages-nav.compound-items.active');
                var leftPos;
                var topPos;
                var thisLeftPos = $this.offset().left + $this.outerWidth()/2;
                var thisTopPos = $this.offset().top -
                    (window.scrollY || window.pageYOffset || document.body.scrollTop);
                var browserWidth = $('body').outerWidth();

                if (browserWidth >= 655) {
                    hiddenNavDropdown();
                    return false;
                }
                topPos = thisTopPos - $dropdown.outerHeight() + 4;
                if (thisTopPos - $dropdown.outerHeight() + 4 < 10) {
                    topPos = thisTopPos + $this.outerHeight() - 4;
                }

                if ($this.hasClass('mobile')) {
                    leftPos = thisLeftPos - $dropdown.outerWidth()/2;
                    if (leftPos < 10) {
                        leftPos = 10;
                    }
                }
                else {
                    leftPos = thisLeftPos - $dropdown.outerWidth()/2;
                    if (browserWidth < leftPos + $dropdown.outerWidth() + 10) {
                        leftPos = browserWidth - $dropdown.outerWidth() - 10;
                    }
                }

                $dropdown.css({
                    'left': leftPos > 0 ? leftPos : 0,
                    'top': topPos
                });
            }

            navDropdownPos();

            $('body, html').rebind('touchmove.bodyscroll', function () {
                hiddenNavDropdown();
            });

            $(window).rebind('resize.navdropdown', function (e) {
                navDropdownPos();
            });
        });

        function hiddenNavDropdown() {
            $('.nav-overlay').addClass('hidden');
            $('.nav-button.compound-lnk.opened').removeClass('opened');
            $('.pages-nav.nav-button.active.greyed-out').removeClass('greyed-out');
            $('.pages-nav.compound-items.active').removeClass('active').removeAttr('style');
            $('body, html').off('touchmove.bodyscroll');
            $(window).off('resize.navdropdown');
        }

        $('.nav-overlay').rebind('click', function() {
            hiddenNavDropdown();
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
        var navBar = '.pages-nav.content-block';

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
            var $topHeader = $(topHeader + ',' + navBar);
            var $navBar = $('.pages-nav.content-block');
            if ($topHeader.hasClass('floating')) {
                $topHeader.width($topHeader.parent().outerWidth());
                if (page !== 'download') {
                    $navBar.parent().width($navBar.outerWidth());
                }
            }
            else {
                $topHeader.css('width',  '');
                $navBar.parent().removeAttr('style');
            }
        }

        $(window).rebind('resize.topheader', function (e) {
            topResize();
        });

        $('.bottom-pages .fmholder').rebind('scroll.topmenu', function() {
            var $topHeader = $(topHeader);
            var $navBar = $(navBar);
            var topPos = $(this).scrollTop();
            var navTopPos;

            if (topPos > 150) {
                $topHeader.removeClass('expanded');
            }
            if (topPos > 300) {
                $topHeader.removeClass('expanded').addClass('floating');
                topResize();
                if (topPos > 600) {
                    $topHeader.addClass('activated');
                }
            }
            else if (topPos <= 300 && topPos >= 50) {
                $topHeader.removeClass('activated');
            }
            else {
                $topHeader.removeClass('floating activated').css('width',  '');
            }

            if ($navBar.length === 0 || page === 'download') {
                return;
            }

            navTopPos = $('.pages-nav-wrap').position().top;

            if (topPos > navTopPos + 300) {
                $navBar.addClass('floating');
                topResize();
                if (topPos > navTopPos + 600) {
                    $navBar.addClass('activated');
                }
            }
            else if (topPos <= navTopPos + 300 && topPos >= navTopPos + 50) {
                $navBar.removeClass('activated');
            }
            else {
                $navBar.removeClass('floating activated').removeAttr('style');
            }
        });
    },

    topBlockHeight: function() {
        "use strict";

        var $topBlock = $('.bottom-page.top-bl');
        var $productNav = $topBlock.parent().first('.pages-nav.content-block');
        var topBlockHeight = $topBlock.parent().length > -1 ? $topBlock.parent().outerHeight() : 0;
        var productNavHeight = $productNav.length > -1 ? $productNav.outerHeight() : 0;

        if (topBlockHeight - productNavHeight > 0) {
            $topBlock.height(topBlockHeight - productNavHeight);
        }
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
