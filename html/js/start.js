var achieve_data = false;

function init_start() {
    "use strict";

    var carouselInterval;
    var sliderInterval;
    var swipeInterval = 5000;
    var intl = mega.intl.number;
    var dropboxPrice = 4.9;
    var megaPrice = 1.56;
    var gdrivePrice = 4.9;
    var $page = $('.bottom-page.scroll-block.startpage', '.fmholder');

    if (u_type > 0) {
        $('.startpage.register:not(.business-reg)', $page).text(l[164]);
        $('.mid-green-link.register-lnk.fm, .startpage.register', $page).attr('href', '/fm');
        $('.mid-green-link.register-lnk.chat', $page).attr('href', '/fm/chat');

        if (is_mobile) {
            $('.startpage.account', $page).attr('href', '/fm/account');
        }
        else {
            $('.startpage.account', $page).attr('href', '/fm/dashboard');
        }
        if (u_type === 3) {
            $('.business-reg', $page).addClass('hidden').attr('href', '');
        }
    }
    else {
        $('.mid-green-link.register-lnk, .startpage.register', $page).attr('href', '/register');
        $('.business-reg', $page).removeClass('hidden').attr('href', '/registerb');
    }

    $('.bottom-menu.body .logo', '.fmholder').rebind('click.clickurl', function(e) {
        var $scrollableBlock;

        e.preventDefault();

        if (page === 'start') {
            $scrollableBlock = is_mobile ? $(window) : $('.fmholder', 'body');
            $scrollableBlock.animate({ scrollTop: 0 }, 1600);
        }
        else {
            loadSubPage('start');
        }
    });

    if (mega.flags.refpr) {
        var slidingTimer;

        var doSlide = function() {
            // eslint-disable-next-line no-unused-expressions
            slidingTimer && clearTimeout(slidingTimer);
            var $banners = $('.bottom-page.top-banner', $page);

            if ($banners.filter('.active').hasClass('banner1')) {
                $banners.removeClass('active');
                $banners.filter('.banner2').addClass('active');
                $page.addClass('white-pages-menu');
            }
            else {
                $banners.removeClass('active');
                $banners.filter('.banner1').addClass('active');
                $page.removeClass('white-pages-menu');
            }
            slidingTimer = setTimeout(doSlide, 10000);
        };
        slidingTimer = setTimeout(doSlide, 10000);
        // Top banner controls init
        $('.bottom-page.banner-control', $page).removeClass('hidden').rebind('click.top-banner', doSlide);
        $('.mid-green-link.refer', $page).removeClass('hidden');
    }

    $('.dropbox span', $page).text(intl.format(dropboxPrice));

    $('.mega span', $page).text(intl.format(megaPrice));

    $('.gdrive span', $page).text(intl.format(gdrivePrice));

    /**
     * detectSwipe
     *
     * @param {Object} $el DOM swipable area.
     * @param {Object} $slides DOM slides selector.
     * @param {Function} func Function which will be called after swipe is detected
     */
    function detectSwipe($el, $slides, func) {
        var swipeStartX = 0;
        var swipeEndX = 0;
        var swipeStartY = 0;
        var swipeEndY = 0;
        var minX = 50;
        var direc = '';

        $el.on('touchstart', function(e) {
            var t = e.touches[0];

            swipeStartX = t.screenX;
            swipeStartY = t.screenY;
        });

        $el.on('touchmove', function(e) {

            var t = e.touches[0];
            swipeEndX = t.screenX;
            swipeEndY = t.screenY;
        });

        $el.on('touchend', function(e) {
            if ((swipeEndX + minX < swipeStartX && swipeEndX !== 0)) {
                direc = 'next';
            }
            else if (swipeEndX - minX > swipeStartX) {
                direc = 'prev';
            }

            if (direc !== '' && typeof func === 'function') {
                func($slides, direc);
            }

            direc = '';
            swipeStartX = 0;
            swipeEndX = 0;
        });
    }

    /**
     * carouselSwitch
     *
     * @param {Object} $slides DOM slides selector.
     * @param {String} direction Sets what Reviews Carousel slide should be shown. Expected values: 'next' or 'prev'.
     */
    function carouselSwitch($slides, direction) {
        var $currentSlide = $slides.filter('.current');
        var currentSlide;
        var slideNum;
        var nextSlide;
        var prevSlide;

        $currentSlide = $currentSlide.length ? $currentSlide : $currentSlide.last();
        currentSlide = parseInt($currentSlide.attr('data-sl'));
        slideNum = $slides.length;

        if (direction === 'next') {
            currentSlide = currentSlide + 1 <= slideNum ? currentSlide + 1 : 1;
        }
        else {
            currentSlide = currentSlide - 1 >= 1 ? currentSlide - 1 : slideNum;
        }

        nextSlide = currentSlide + 1 <= slideNum ? currentSlide + 1 : 1;
        prevSlide = currentSlide - 1 >= 1 ? currentSlide - 1 : slideNum;

        $slides.removeClass('current next prev');
        $slides.filter('.slide' + currentSlide).addClass('current');
        $slides.filter('.slide' + prevSlide).addClass('prev');
        $slides.filter('.slide' + nextSlide).addClass('next');
    }

    // Reviews carousel. Controls init
    $('.startpage.carousel-control').rebind('click', function () {
        if ($(this).hasClass('next')) {
            carouselSwitch($('.startpage.carousel-slide', $page), 'next');
        }
        else {
            carouselSwitch($('.startpage.carousel-slide', $page), 'prev');
        }
    });

    /**
     * showSlide
     *
     * @param {Object} $slides DOM slides selector.
     * @param {String} slide Number of next slider slide which should be shown. Can also be "next" or "prev".
     * @param {Boolean} autoSlide Inits auto sliding. Optional.
     */
    function showSlide($slides, slide, autoSlide) {
        var $slidesNavDots = $slides.filter('.nav');
        var slidesNum = $slidesNavDots.length;
        var currentSlide = parseInt($slidesNavDots.filter('.active').data('slide'));

        // Init auto slide
        clearInterval(sliderInterval);

        // Init auto slide
        if (autoSlide) {
            sliderInterval = setInterval(function() {
                showSlide($slides, 'next', true);
            }, swipeInterval);
        }

        if (slide === 'next') {
            slide = currentSlide + 1 <= slidesNum ? currentSlide + 1 : 1;
        }
        else if (slide === 'prev') {
            slide = currentSlide - 1 >= 1 ? currentSlide - 1 : slidesNum;
        }

        $slides.removeClass('active').parent('.software-content').removeClass('expanded');
        $slides.filter('[data-slide="' + slide + '"]')
            .addClass('active').parent('.software-content').addClass('expanded');
    }

    /**
     * initSlider
     *
     * Wrapper should have "slidername-wrap" class  (e.g ".slider-wrap").
     * Navigation bar should have "slidername-nav" class  (e.g ".slider-nav").
     *
     * @param {String} sliderClass Slider Classname with dot (e.g ".slider"). All slides should have this class.
     * @param {Boolean} autoSlide Enables/disables auto sliding. Optional.
     * @param {String} buttonsClass Addition navigtion buttons Classname with dot (e.g ".slider-buttons"). Optional.
     */
    function initSlider(sliderClass, autoSlide, buttonsClass) {
        var $slider = $(sliderClass + '-wrap', $page);
        var $slides  = $(sliderClass,  $slider);
        var $slidesNav = $(sliderClass  + '-nav');
        var $slidesNavDots = $('.nav', $slidesNav);
        var $buttons = $(buttonsClass);

        // Show first slide
        showSlide($slides, 1, autoSlide);

        // Slider controls click even
        $slidesNavDots.add($buttons).rebind('click.slider', function() {
            var $this = $(this);
            var slideNum = $this.data('slide');

            if (!$this.hasClass('active')) {
                showSlide($slides, slideNum, autoSlide);
            }

            // Init subslider for desktop (with autosliding)
            if ($this.data('subslide') && !is_mobile) {
                initSlider('.' + $this.data('subslide'), true);
            }
        });

        // Slider Prev/Next buttons
        $('.nav-button', $slidesNav).rebind('click.slider', function() {
            var $this = $(this);

            if ($this.hasClass('next')) {
                showSlide($slides, 'next', autoSlide);
            }
            else {
                showSlide($slides, 'prev', autoSlide);
            }
        });
    }

    carouselSwitch($('.startpage.carousel-slide', $page), 'next');

    // Init Software block Slider
    initSlider('.soft-slide', false, '.software-header');

    // Init Mobile events
    if (is_mobile) {
        detectSwipe($('.startpage.carousel', $page), $('.startpage.carousel-slide', $page), carouselSwitch);
        detectSwipe($('.soft-slide-wrap', $page), $('.soft-slide', $page), showSlide);
    }

    if (!is_mobile && page === 'start') {
        InitFileDrag();
    }
    else if (is_mobile && page === 'start') {
        if (!mega.ui.contactLinkCardDialog) {
            var contactLinkCardHtml = $('#mobile-ui-contact-card');
            if (contactLinkCardHtml && contactLinkCardHtml.length) {
                contactLinkCardHtml = contactLinkCardHtml[0].outerHTML;
                mega.ui.contactLinkCardDialog = contactLinkCardHtml;
            }
        }
        mobile.initMobileAppButton();
    }
    else if (page === 'download') {
        $('.widget-block').hide();
    }
    startCountRenderData = {
        'users': '',
        'files': ''
    };

    if (is_mobile) {
        $(window).add('#startholder').rebind('scroll.counter', function () {
            if (page === 'start') {
                $.lastScrollTime = Date.now();
                start_counts();
            }
        });
    }
    else {
        $(window).rebind('resize.counter', function () {
            $.lastScrollTime = Date.now();
        });
        $('#startholder').rebind('scroll.counter', function () {
            if (page === 'start' || page === 'download') {
                $.lastScrollTime = Date.now();
                start_counts();
            }
        });
    }

    if (getCleanSitePath() === 'mobile') {
        setTimeout(function () {
            var offset = $(".bottom-page.bott-pad.mobile").offset();

            if (offset) {
                $('#startholder').animate({
                    scrollTop: offset.top
                }, 800);
            }
        }, 1000);
    }
    mBroadcaster.sendMessage('HomeStartPageRendered:mobile');
}

var start_countLimit = 0;

var start_countdata = false;

function start_counts() {
    "use strict";

    if (start_countdata) {
        return;
    }
    else {
        $('.bottom-page.white-block.counter').addClass('hidden');
    }
    start_countdata = true;
    start_APIcount();
}

start_APIcount_inflight = false;
var start_APIcountdata;
var start_countInterval;

function start_APIcount() {
    "use strict";

    if (start_APIcount_inflight) {
        return;
    }
    start_APIcount_inflight = true;
    api_req({
        "a": "dailystats"
    }, {
        callback: function (res) {
            $('.bottom-page.white-block.counter').removeClass('hidden');
            start_APIcountdata = res;
            start_APIcountdata.timestamp = Date.now();
            start_APIcount_inflight = false;
            if (!start_countUpdate_inflight && (page === 'start' || page === 'download')) {
                start_countInterval = setInterval(start_countUpdate, 30);
            }
        }
    });
}

start_countUpdate_inflight = false;
startCountRenderData = {};

var RandomFactorTimestamp = 0;
var start_Lcd = {};
var countUpdateInterval = 30;

function start_countUpdate() {
    "use strict";

    if (!start_countUpdate_inflight) {
        startCountRenderData = {
            'users': '',
            'files': '',
            'users_blocks': {},
            'files_blocks': {},
        };
    }
    start_countUpdate_inflight = true;
    if (page !== 'start' && page !== 'download') {
        start_countdata = false;
        start_countUpdate_inflight = false;
        clearInterval(start_countInterval);
        return false;
    }
    if (!start_Lcd.users) {
        start_Lcd.users = start_APIcountdata.confirmedusers.total;
    }
    if (!start_Lcd.files) {
        start_Lcd.files = start_APIcountdata.files.total;
    }
    if (!start_Lcd.ts) {
        start_Lcd.ts = start_APIcountdata.timestamp;
    }
    if (!start_Lcd.timestamp) {
        start_Lcd.timestamp = start_APIcountdata.timestamp;
    }
    var filesFactor = 1;
    var usersFactor = 1;
    if (start_Lcd.timestamp + 10 < Date.now()) {
        var rate = (Date.now() - start_Lcd.timestamp) / 86400000;
        if (start_APIcountdata.timestamp > start_Lcd.ts + 30000 && start_APIcountdata.timestamp + 30000 > Date.now()) {
            if (start_Lcd.users > start_APIcountdata.confirmedusers.total) {
                usersFactor = 0.3;
            }
            else if (start_Lcd.users < start_APIcountdata.confirmedusers.total) {
                usersFactor = 2;
            }
            if (start_Lcd.files > start_APIcountdata.files.total) {
                filesFactor = 0.3;
            }
            else if (start_Lcd.files < start_APIcountdata.files.total) {
                filesFactor = 2;
            }
        }
        else {
            filesFactor = 1;
            usersFactor = 1;
        }

        if (RandomFactorTimestamp + 500 < Date.now()) {
            filesFactor *= Math.random() * 0.1 - 0.05;
            RandomFactorTimestamp = Date.now();
        }

        start_Lcd.users += rate * usersFactor * start_APIcountdata.confirmedusers.dailydelta;
        start_Lcd.files += rate * filesFactor * start_APIcountdata.files.dailydelta;
        start_Lcd.timestamp = Date.now();
    }

    function renderCounts(total, type) {
        if (total.length === startCountRenderData[type].length) {
            for (var i = 0, len = total.length; i < len; i++) {
                if (startCountRenderData[type][i] !== total[i]) {
                    var elm = startCountRenderData[type + '_blocks'][i];
                    if (elm) {
                        elm.textContent = total[i];
                    }
                }
            }
        }
        else {
            var html = '';
            var $wrapper = $('.startpage.flip-wrapper.' + type);
            for (var k = 0, ln = total.length; k < ln; k++) {
                html += '<div class="flip-block"><div class="flip-bg" id="'
                    + type + '_number_' + k + '">' + total[k] + '</div></div>';
            }
            $wrapper.safeHTML(html);
            startCountRenderData[type + '_blocks'] = $('.flip-bg', $wrapper);
        }
        startCountRenderData[type] = total;
    }

    // do not render the counter while scrolling or resizing, as some browsers have real difficulty with it
    // only render the counter every 2000ms if invisible
    // only perform the visibility check shortly ater scrolling or resizing, as it's CPU intensive

    if ($.lastScrollTime + 100 < Date.now()) {
        if ($.lastScrollTime < Date.now() + 200) {
            $.counterVisible = $('.startpage.flip-wrapper.users').visible()
                || $('.startpage.flip-wrapper.files').visible()
                || $('.bottom-page.big-icon.registered-users').visible();
        }
        if ($.counterVisible || !$.lastCounterRender || $.lastCounterRender + 2000 < Date.now()) {
            renderCounts(String(Math.round(start_Lcd.users)), 'users');
            renderCounts(String(Math.round(start_Lcd.files)), 'files');
            $.lastCounterRender = Date.now();
        }
    }

    if (start_APIcountdata.timestamp + 30000 < Date.now()) {
        start_APIcount();
    }
}
