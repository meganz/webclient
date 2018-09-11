var achieve_data = false;

function init_start() {
    "use strict";

    // Load the membership plans
    pro.loadMembershipPlans(function () {

        // Render the plan details
        pro.proplan.populateMembershipPlans();

        // Check which plans are applicable or grey them out if not
        pro.proplan.checkApplicablePlans();
    });

    if (u_type > 0) {
        $('.startpage.register').text(l[164]);
        $('.startpage.register').rebind('click', function () {
            loadSubPage('fm');
        });

        $('.startpage.try-mega').text(l[187]);
        $('.startpage.try-mega').rebind('click', function () {
            loadSubPage('fm/dashboard');
        });
    }
    else {
        $('.button-48-height.register').rebind('click', function () {
            if ($(this).hasClass('business-reg')) {
                loadSubPage('registerb');
            }
            else {
                loadSubPage('register');
            }
        });
        $('.startpage.try-mega').text(l[16535]);

        

        $('.startpage.try-mega').rebind('click', function () {
            if (u_type === false) {
                // open file manager with ephemeral account
                u_storage = init_storage(localStorage);
                loadingDialog.show();
                u_checklogin({
                    checkloginresult: function (u_ctx, r) {
                        u_type = r;
                        u_checked = true;
                        loadingDialog.hide();
                        loadSubPage('fm');
                    }
                }, true);
            }
            else {
                loadSubPage('fm');
            }
        });
    }

    // If Pro plan clicked, go to step 2
    $('.reg-st3-membership-bl').rebind('click', function () {

        // Get the Pro number from the box they clicked on
        var proNum = $(this).attr('data-payment');

        // If logged in, load the Pro payment page directly with the plan selected
        if (u_attr) {
            loadSubPage('propay_' + proNum);
        }
        else {
            // Otherwise load the Pro plan selection page (Step 1)
            loadSubPage('pro');

            // Select the Pro plan on the Step 1 page
            var $proBoxes = $('.membership-step1 .reg-st3-membership-bl');
            $proBoxes.removeClass('selected');
            $proBoxes.filter('.pro' + proNum).addClass('selected');

            // Trigger the Register/Login dialog, after completion they will be
            // directed to the Pro payment page with the plan already selected
            showSignupPromptDialog();
        }
    });

    if (!is_mobile && page === 'start') {
        InitFileDrag();
    } else if (is_mobile && page === 'start') {
        if (!mega.ui.contactLinkCardDialog) {
            var contactLinkCardHtml = $('#mobile-ui-contact-card');
            if (contactLinkCardHtml && contactLinkCardHtml.length) {
                contactLinkCardHtml = contactLinkCardHtml[0].outerHTML;
                mega.ui.contactLinkCardDialog = contactLinkCardHtml;
            }
        }
        mobile.initMobileAppButton();
    } else if (page === 'download') {
        $('.widget-block').hide();
    }
    startCountRenderData = {
        'users': '',
        'files': ''
    };
    if (is_mobile) {
        $(window).rebind('scroll.counter', function () {
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
    $('.bottom-page.top-header').text($('.bottom-page.top-header').text().replace('[A]', '').replace('[/A]', ''));
    if (achieve_data) {
        start_achievements(achieve_data);
    }
    else {
        $('.bottom-page.white-block.top-pad.achievements').addClass('hidden');
        api_req({
            "a": "mafu"
        }, {
            callback: function (res) {
                achieve_data = res;
                start_achievements(res);
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

function start_achievements(res) {
    "use strict";

    if (res < 0) {
        $('.bottom-page.white-block.top-pad.achievements').addClass('hidden');
    }
    else if (res && res.u && res.u[4] && res.u[5] && res.u[3]) {
        // enable achievements:
        $('.bottom-page.white-block.top-pad.achievements').removeClass('hidden');
        var gbt = 'GB';
        if (lang === 'fr') {
            gbt = 'Go';
        }
        $('.achievements .megasync').html(escapeHTML(l[16632]).replace('[X]',
            '<span class="txt-pad"><span class="big">' + Math.round(res.u[4][0] / 1024 / 1024 / 1024)
            + '</span> ' + gbt + '</span>') + '*');
        $('.achievements .invite').html(escapeHTML(l[16633]).replace('[X]',
            '<span class="txt-pad"><span class="big">' + Math.round(res.u[3][0] / 1024 / 1024 / 1024)
            + '</span> ' + gbt + '</span>') + '*');
        $('.achievements .mobile').html(escapeHTML(l[16632]).replace('[X]',
            '<span class="txt-pad"><span class="big">' + Math.round(res.u[5][0] / 1024 / 1024 / 1024)
            + '</span> ' + gbt + '</span>') + '*');
        $('.achievements .expiry').html('*' + escapeHTML(l[16631]).replace('[X]', parseInt(res.u[5][2].replace('d',
            ''))));
        $('.bottom-page.top-header').html(escapeHTML(l[16536]).replace('[A]', '').replace('[/A]', '*'));
        $('.bottom-page.asterisktext').removeClass('hidden');
    }
}


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
            if (!start_countUpdate_inflight && page === 'start' || page === 'download') {
                start_countUpdate();
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
            'files': ''
        };
    }
    start_countUpdate_inflight = true;
    if (page !== 'start' && page !== 'download') {
        start_countdata = false;
        start_countUpdate_inflight = false;
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
                    document.getElementById(type + '_number_' + i).innerHTML = total[i];
                }
            }
        }
        else {
            var html = '';
            for (var k = 0, ln = total.length; k < ln; k++) {
                html += '<div class="flip-block"><div class="flip-bg" id="'
                    + type + '_number_' + k + '">' + total[k] + '</div></div>';
            }
            $('.startpage.flip-wrapper.' + type).html(html);
        }
        startCountRenderData[type] = total;
    }

    // do not render the counter while scrolling or resizing, as some browsers have real difficulty with it
    // only render the counter every 2000ms if invisible
    // only perform the visibility check shortly ater scrolling or resizing, as it's CPU intensive

    if ($.lastScrollTime + 100 < Date.now()) {
        if ($.lastScrollTime < Date.now() + 200) {
            if ($('.startpage.flip-wrapper.users').visible()
                || $('.startpage.flip-wrapper.files').visible()
                || $('.bottom-page.big-icon.registered-users').visible()) {
                $.counterVisible = true;
            }
            else {
                $.counterVisible = false;
            }
        }
        if ($.counterVisible || !$.lastCounterRender || $.lastCounterRender + 2000 < Date.now()) {
            renderCounts(String(Math.round(start_Lcd.users)), 'users');
            renderCounts(String(Math.round(start_Lcd.files)), 'files');
            $.lastCounterRender = Date.now();
        }
    }
    setTimeout(start_countUpdate, 30);
    if (start_APIcountdata.timestamp + 30000 < Date.now()) {
        start_APIcount();
    }
}
