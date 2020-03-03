var achieve_data = false;

function init_start() {
    "use strict";

    var carouselInterval;
    var darkSliderInterval;
    var swipeInterval = 10000;
    var $page = $('.bottom-page.scroll-block', '.fmholder');

    // Set prices for personal and business plans
    if (l[20624] && l[20624]) {
        $('.startpage.plan-price.personal', $page)
            .safeHTML(l[20624]
                .replace('%1', '<span class="price"><span class="big">4.</span>99 &euro;</span>'));

        $('.startpage.plan-price.business', $page)
            .safeHTML(l[20625]
                .replace('%1', '<span class="price"><span class="big">10.</span>00 &euro;</span>'));
    }

    // Load the membership plans
    pro.loadMembershipPlans(function () {

        // Render the plan details
        pro.proplan.populateMembershipPlans();

        // Check which plans are applicable or grey them out if not
        pro.proplan.checkApplicablePlans();
    });

    if (u_type > 0) {
        $('.startpage.register:not(.business-reg)', $page).text(l[164]);
        $('.mid-green-link.register-lnk, .startpage.register', $page).attr('href', '/fm');

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

    // Top banner controls init
    $('.bottom-page.banner-control', $page).rebind('click.top-banner', function() {
        var $banners = $('.bottom-page.top-banner', $page);

        if ($banners.filter('.active').hasClass('banner1')) {
            $banners.removeClass('active');
            $banners.filter('.banner2').addClass('active');
        }
        else {
            $banners.removeClass('active');
            $banners.filter('.banner1').addClass('active');
        }
    });

    /**
     * detectSwipe
     *
     * {Object} $textarea. DOM swipable area.
     * {Function} func. Function which will be called after swipe direction is detected
     */
    function detectSwipe($el, func) {
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
                func(direc);
            }

            direc = '';
            swipeStartX = 0;
            swipeEndX = 0;
        });
    }

    /**
     * carouselSwitch
     *
     * {String} direction. Sets what Reviews Carousel slide should be shown. Expected values: 'next' or 'prev'.
     */
    function carouselSwitch(direction) {
        var $currentSlide;
        var currentSlide;
        var slideNum;
        var nextSlide;
        var prevSlide;
        /*
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
        */
        $currentSlide = $('.startpage.carousel-slide.current').length ?
            $('.startpage.carousel-slide.current') : $('.startpage.carousel-slide').last();
        currentSlide = parseInt($currentSlide.attr('data-sl'));
        slideNum = $('.startpage.carousel-slide').length;

        if (direction === 'next') {
            currentSlide = currentSlide + 1 <= slideNum ? currentSlide + 1 : 1;
        }
        else {
            currentSlide = currentSlide - 1 >= 1 ? currentSlide - 1 : slideNum;
        }

        nextSlide = currentSlide + 1 <= slideNum ? currentSlide + 1 : 1;
        prevSlide = currentSlide - 1 >= 1 ? currentSlide - 1 : slideNum;

        $('.startpage.carousel-slide').removeClass('current next prev');
        $('.startpage.carousel-slide.slide' + currentSlide).addClass('current');
        $('.startpage.carousel-slide.slide' + prevSlide).addClass('prev');
        $('.startpage.carousel-slide.slide' + nextSlide).addClass('next');
        /*
        carouselInterval = setInterval(function() {
            carouselSwitch('next');
        },  swipeInterval);
        */
    }

    // Reviews carousel. Controls init
    $('.startpage.carousel-control').rebind('click', function () {
        if ($(this).hasClass('next')) {
            carouselSwitch('next');
        }
        else {
            carouselSwitch('prev');
        }
    });

    /**
     * darkSliderSwitch
     *
     * {String} direction. Sets what DarkSlider slide should be shown. Expected values: 'next' or 'prev'.
     */
    function darkSliderSwitch(direction) {
        var $slider = $('.dark-slider-wrap');
        var currentSlide = parseInt($slider.find('.slide.active').attr('data-sl'));
        var slideNum = $slider.find('.slide').length;

        if (direction === 'next') {
            currentSlide = currentSlide + 1 <= slideNum ? currentSlide + 1 : 1;
        }
        else {
            currentSlide = currentSlide - 1 >= 1 ? currentSlide - 1 : slideNum;
        }

        showDarkSlide(currentSlide);
    }

    /**
     * showDarkSlide
     *
     * {Num} slideNum. Number of next DarkSlider slide which should be shown.
     */
    function showDarkSlide(slideNum) {
        var $slider;
        /**
        if (darkSliderInterval) {
            clearInterval(darkSliderInterval);
        }
        **/
        $slider = $('.dark-slider-wrap');
        $slider.find('.dark-slider-info').removeClass('active');
        $slider.find('.dark-slider-info.sl' + slideNum).addClass('active');
        $slider.find('.dark-slider-nav span').removeClass('active');
        $slider.find('.dark-slider-nav span.sl' + slideNum).addClass('active');
        $slider.find('.dark-slider .slide').removeClass('active');
        $slider.find('.dark-slider .dark-slide' + slideNum).addClass('active');
        $slider.find('.square-nav-button').removeClass('active');
        $slider.find('.square-nav-button.sl' + slideNum).addClass('active');
        /*
        darkSliderInterval = setInterval(function() {
            darkSliderSwitch('next');
        },  swipeInterval);
        */
    }

    // DarkSlider. Controls init
    $('.bottom-page.square-nav-button, .startpage.dark-slider-nav span').rebind('click', function () {
        var $this = $(this);
        var slideNum = $this.attr('data-sl');

        if (!$this.hasClass('active')) {
            showDarkSlide(slideNum);
        }
    });

    showDarkSlide(3);
    carouselSwitch('next');

    // Init swipes for Mobile
    if (is_mobile) {
        detectSwipe($('.startpage.carousel'), carouselSwitch);
        detectSwipe($('.dark-slider-wrap'), darkSliderSwitch);

        // Show text info is Icons block was clicked (Why Use MEGA section and similar)
        $('.startpage.square-block').rebind('click', function () {
            if (!$(this).hasClass('active')) {
                $('.startpage.square-block.active').removeClass('active');
                $(this).addClass('active');
            }
            else {
                $(this).removeClass('active');
            }
        });
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
