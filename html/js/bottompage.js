/* region mega.io */

class ExpandableComponent {
    constructor($expandableElement) {
        this.$expandable = $expandableElement;
    }

    isExpanded() {
        return this.$expandable.hasClass('expanded');
    }

    expand() {
        this.$expandable.addClass('expanded');
    }

    contract() {
        this.$expandable.removeClass('expanded');
    }

    toggle() {
        if (this.isExpanded()) {
            this.contract();
        }
        else {
            this.expand();
        }
    }
}

class AccordionComponent extends ExpandableComponent {
    constructor($accordionElement) {
        super($accordionElement);

        this.expandStartEvent = new MEvent();
        this.transitionOptions = {
            easing: 'swing',
            duration: 200,
            complete: () => {
                // Reset to automatic height for resize responsiveness
                this.$drawer.height('auto');
            },
        };

        this.$expandable.data('js-object', this);

        this.$drawer = $('.accordion-content', this.$expandable);
        this.$drawer.slideUp(0);

        $('.accordion-toggle', this.$expandable).rebind('click.accordion-toggle', () => {
            this.$expandable.siblings('.accordion').each((i, element) => {
                const accordion = $(element).data('js-object');
                if (accordion.isExpanded()) {
                    accordion.contract();
                }
            });

            this.toggle();
        });
    }

    setTransitionOptions(newOptions) {
        this.transitionOptions = Object.assign(this.transitionOptions, newOptions);
    }

    expand() {
        this.expandStartEvent.invoke();
        super.expand();
        this.$drawer.stop().animate({
            height: 'show',
            opacity: 'show',
        }, this.transitionOptions);
    }

    contract() {
        super.contract();
        this.$drawer.stop().animate({
            height: 'hide',
            opacity: 'hide',
        }, this.transitionOptions);
    }
}

/* endregion */

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
        bottompage.$footer = $('.bottom-page footer.bottom-menu', '.fmholder');

        // Unbind sliders events
        $(window).unbind('resize.sliderResize');

        // Init animations
        if ($content.hasClass('animated-page')) {
            bottompage.initAnimations($content);
        }

        // Insert variables with replaced browser names
        if (page === 'bird') {
            $('.top-bl .bottom-page.top-dark-button.rounded span.label', $content)
                .safeHTML(l[20923].replace('%1', 'Thunderbird'));
        }

        // Init Video resizing on security page
        if (page === 'security' && !is_mobile) {
            bottompage.videoResizing();

            $(window).rebind('resize.security', function (e) {
                bottompage.videoResizing();
            });
        }

        if (!is_mobile) {

            // Init floating top menu
            bottompage.initFloatingTop();

            bottompage.initNavButtons($content);
        }
        else {
            bottompage.initMobileNavButtons($content);
        }

        const $cs = $('.cookies-settings', $content).off('click.csp').addClass('hidden');
        if ('csp' in window) {
            $cs.removeClass('hidden').rebind('click.csp', function() {
                if (!this.classList.contains('top-menu-item')) {
                    csp.trigger().dump('csp.trigger');
                    return false;
                }
            });
        }
        else {
            // cookie-dialog not available, replace links with text nodes.
            document.querySelectorAll('a.cookies-settings').forEach(e => e.replaceWith(e.textContent));
        }

        // Init scroll button
        bottompage.initBackToScroll();
        bottompage.initScrollToContent();

        // Show/hide Referral Program and Pricing menu items for different account types
        bottompage.changeMenuItemsList($content);
        localeImages($content);

        bottompage.mobileAccordions = [];
        for (const element of $('.accordion', bottompage.$footer)) {
            bottompage.mobileAccordions.push(new AccordionComponent($(element)));
        }
    },

    /**
     * Show/hide necessary menu items for different acctount types
     */
    changeMenuItemsList: function($content) {
        "use strict";

        var $pagesMenu = $('.pages-menu.body', $content);

        // Show/Hide Affiliate program link in bottom menu
        if (mega.flags.refpr) {
            $('a.link.affiliate', bottompage.$footer).removeClass('hidden');
        }
        else {
            $('a.link.affiliate', bottompage.$footer).addClass('hidden');
        }

        // Hide Pricing link for current Business or Pro Flexi accounts
        if ((u_attr && u_attr.b && u_attr.b.s !== pro.ACCOUNT_STATUS_EXPIRED) ||
            (u_attr && u_attr.pf && u_attr.pf.s !== pro.ACCOUNT_STATUS_EXPIRED)) {
            $('a.link.pro', bottompage.$footer).addClass('hidden');
            $('.pages-menu.link.pro', $pagesMenu).addClass('hidden');
        }
        else {
            $('a.link.pro', bottompage.$footer).removeClass('hidden');
            $('.pages-menu.link.pro', $pagesMenu).removeClass('hidden');
        }

        if (u_type && (!mega.flags.ach || Object(window.u_attr).b)) {
            // Hide Achievements link for an non-achievement account and business account
            $('a.link.achievements', bottompage.$footer).addClass('hidden');
        }
        else {
            $('a.link.achievements', bottompage.$footer).removeClass('hidden');
        }
    },

    /**
     * Init Animated blocks
     * @param {Object} $content The jQuery selector for the current page
     * @returns {void}
     */
    initAnimations: function($content) {
        "use strict";

        var $scrollableBlock = is_mobile ? $('body.mobile .fmholder') : $('.fmholder', 'body');

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
            // add circular-spread here later
            var $blocks = $('.animated, .fadein, .circular-spread, .text-focus-contract', $content);

            for (var i = $blocks.length - 1; i >= 0; i--) {

                var $block = $($blocks[i]);

                if (isVisibleBlock($block)) {
                    if (!$block.hasClass('start-animation')) {
                        $block.addClass('start-animation');
                    }
                }
                else if ($block.hasClass('start-animation')) {
                    // dont reset circular spread animation
                    if ($block.hasClass('circular-spread') || $block.hasClass('text-focus-contract')) {
                        return;
                    }
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

    /**
     * Init Common scrollable sliders for mobile devices.
     * @param {Object} $sliderSection The jQuery selector for the current page or subsection
     * @param {Object} $scrollBlock The jQuery selector for the scrollable block
     * @param {Object} $slides The jQuery selector for the slides
     * @param {Boolean} passing TRUE if we need to show slides withhout scrolling animation
     * @returns {void}
     */
    initSliderEvents: function($sliderSection, $scrollBlock, $slides, passing) {

        'use strict';

        // The box which gets scroll and contains all the child content.
        const $scrollContent = $scrollBlock.children();
        const $controls = $('.default-controls', $sliderSection);
        const $specialControls = $('.sp-control', $sliderSection);
        const $dots = $('.nav', $controls).add($specialControls);
        let isRunningAnimation = false;

        // Scroll to first block
        $scrollBlock.scrollLeft(0);
        $dots.removeClass('active');
        $dots.filter('[data-slide="0"]').addClass('active');

        $slides.removeClass('active');
        $($slides[0]).addClass('active');

        // Scroll to necessary plan block
        const scrollToPlan = (slideNum) => {
            let $previousPlan = 0;
            let planPosition = 0;

            // Prevent scroll event
            isRunningAnimation = true;

            // Get plan position related to previous plan to include border-spacing
            $previousPlan = $($slides[slideNum - 1]);
            planPosition = $previousPlan.length ? $previousPlan.position().left
                + $scrollBlock.scrollLeft() + $previousPlan.outerWidth() : 0;

            // Set controls dot active state
            $dots.removeClass('active');
            $dots.filter(`[data-slide="${slideNum}"]`).addClass('active');

            $slides.removeClass('active');
            $($slides[slideNum]).addClass('active');

            // Scroll to plan block
            $scrollBlock.stop().animate({
                scrollLeft: planPosition
            }, passing ? 0 : 600, 'swing', () => {

                // Enable on scroll event after auto scrolling
                isRunningAnimation = false;
            });
        };

        // Init scroll event
        $scrollBlock.rebind('scroll.scrollToPlan', function() {
            const scrollVal = $(this).scrollLeft();
            const contentWidth = $scrollContent.outerWidth();
            const scrollAreaWidth = $scrollBlock.outerWidth();
            let closestIndex = 0;

            // Prevent on scroll event during auto scrolling or slider
            if (isRunningAnimation || contentWidth === scrollAreaWidth) {
                return false;
            }

            // If block is scrolled
            if (scrollVal > 0) {
                closestIndex = Math.round(scrollVal /
                    (contentWidth - scrollAreaWidth) * $slides.length);
            }

            // Get closest plan index
            closestIndex = closestIndex - 1 >= 0 ? closestIndex - 1 : 0;

            // Set controls dot active state
            $dots.removeClass('active');
            $dots.filter(`[data-slide="${closestIndex}"]`).addClass('active');

            $slides.removeClass('active');
            $($slides[closestIndex]).addClass('active');
        });

        // Init controls dot click
        $dots.rebind('click.scrollToPlan', function() {

            // Scroll to selected plan
            scrollToPlan($(this).data('slide'));
        });

        // Init Previous/Next controls click
        $('.nav-button', $controls).rebind('click.scrollToPlan', function() {
            const $this = $(this);
            let slideNum;

            // Get current plan index
            slideNum = $('.nav.active', $controls).data('slide');

            // Get prev/next plan index
            if ($this.is('.prev')) {
                slideNum = slideNum - 1 > 0 ? slideNum - 1 : 0;
            }
            else if (slideNum !== $slides.length - 1) {
                slideNum += 1;
            }

            // Scroll to selected plan
            scrollToPlan(slideNum);
        });

        $(window).rebind('resize.sliderResize', () => {
            this.initSliderEvents($sliderSection, $scrollBlock, $slides, passing);
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

    // Init floating  top bar, product pages menu or help center navigation bar
    initFloatingTop: function() {

        const $fmHolder = $('.fmholder', 'body.bottom-pages');
        const $topHeader = $('.bottom-page .top-head, .pages-menu-wrap .pages-menu.body', $fmHolder);
        const $productPagesMenu = $('.pages-menu.body', $fmHolder);

        // Resize top menu / produc pages menu or help center navigation bar
        // Required to avoid "jumpng" effect when we change "position" property
        const topResize = function() {

            if ($topHeader.hasClass('floating')) {
                if ($topHeader.parent().outerWidth() === 0 && $topHeader.parent().length > 1) {
                    $topHeader.outerWidth($($topHeader.parent()[1]).outerWidth());
                }
                else {
                    $topHeader.outerWidth($topHeader.parent().outerWidth());
                }
            }
            else {
                $topHeader.css('width',  '');
            }
        }

        if (!$topHeader.length) {

            return $(window).unbind('resize.topheader');
        }

        // Init menus resizing
        topResize();

        $(window).rebind('resize.topheader', function() {
            topResize();
        });

        // Select bottom pages scrolling block or window for mobile
        $fmHolder.rebind('scroll.topmenu', () => {

            const topPos = $fmHolder.scrollTop();

            if (topPos > 400) {

                // Make menus floating but not visible
                $topHeader.addClass('floating');
                $('.submenu.active, .submenu-item.active', $productPagesMenu).removeClass('active');

                // Show floating menus
                if (topPos > 600) {
                    $topHeader.addClass('activated');
                }
                else {

                    // Hide floating menus
                    $topHeader.removeClass('activated');

                    // Hide all popup as top bar not visisble for this part
                    notify.closePopup();
                    alarm.hideAllWarningPopups(true);
                }
            }
            else if (topPos <= 200) {

                // Return menus static positions
                $topHeader.removeClass('floating activated').css('width',  '');
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
