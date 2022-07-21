function accountUI() {

    "use strict";

    // Prevent ephemeral session to access account settings via url
    if (u_type === 0) {
        msgDialog('confirmation', l[998], l[17146]
            + ' ' + l[999], l[1000], function(e) {
            if (e) {
                loadSubPage('register');
                return false;
            }
            loadSubPage('fm');
        });

        return false;
    }

    var $fmContainer = $('.fm-main', '.fmholder');
    var $settingsMenu = $('.content-panel.account', $fmContainer);

    accountUI.$contentBlock = $('.fm-right-account-block', $fmContainer);

    $('.fm-account-notifications', accountUI.$contentBlock).removeClass('hidden');
    $('.settings-button', $settingsMenu).removeClass('active');
    $('.fm-account-sections', accountUI.$contentBlock).addClass('hidden');
    $('.fm-right-files-block, .section.conversations, .fm-right-block.dashboard',  $fmContainer)
        .addClass('hidden');
    $('.nw-fm-left-icon', $fmContainer).removeClass('active');
    $('.nw-fm-left-icon.settings', $fmContainer).addClass('active');
    $('.account.data-block.storage-data', accountUI.$contentBlock).removeClass('exceeded');
    $('.fm-account-save', accountUI.$contentBlock).removeClass('disabled');
    accountUI.$contentBlock.removeClass('hidden');

    if ($('.fmholder', 'body').hasClass('transfer-panel-opened')) {
        $.transferClose();
    }

    M.onSectionUIOpen('account');

    if (u_attr && u_attr.b && !u_attr.b.m) {
        $('.settings-button.slide-in-out.plan', $settingsMenu).addClass('hidden');
    }
    else {
        $('.settings-button.slide-in-out.plan', $settingsMenu).removeClass('hidden');
    }
    M.accountData((account) => {

        accountUI.renderAccountPage(account);

        // Init account content scrolling
        // Scrolling init/update became faster than promise based operations in "renderAccountPage"
        // instead or refactoring "accounts" page to return a promise in "rendering" a non noticeable
        // heuristic 300ms delay has been added. I believe this delay simulate the slowness which allowed
        // the previous logic to work.
        delay('settings:scrollbarinit', () => {
            if (accountUI.$contentBlock.is('.ps')) {
                Ps.update(accountUI.$contentBlock[0]);
            }
            else {
                Ps.initialize(accountUI.$contentBlock[0]);
            }
        }, 300);
    }, 1);


}

accountUI.renderAccountPage = function(account) {

    'use strict';

    if (d) {
        console.log('Rendering account pages');
    }

    var id = getSitePath();
    if (u_attr && u_attr.b && !u_attr.b.m && id.startsWith('/fm/account/plan')) {
        id = '/fm/account';
    }

    // Parse subSectionId and remove sub section part from id
    const accountRootUrl = '/fm/account';
    let subSectionId;

    if (id.length > accountRootUrl.length) {
        let urlPart0;
        let urlPart1;
        const sectionUrl = id.substr(accountRootUrl.length + 1, id.length);
        const sectionUrlParts = sectionUrl.split('/');

        if (sectionUrlParts.length === 1) {
            urlPart0 = sectionUrlParts[0];
        }
        else {
            urlPart0 = sectionUrlParts[0];
            urlPart1 = sectionUrlParts[1];
        }

        const $accountSubSectionElement = $(`.settings-button.account-s .sub-title[data-scrollto='${urlPart0}']`);
        if ($accountSubSectionElement.length > 0) {
            id = accountRootUrl;
            subSectionId = urlPart0;
        }
        else {
            id = `${accountRootUrl}/${urlPart0}`;
            subSectionId = urlPart1;
        }
    }

    var sectionClass;
    accountUI.general.init(account);
    accountUI.inputs.text.init();

    var showOrHideBanner = function(sectionName) {

        var $banner = $('.quota-banner', accountUI.$contentBlock);

        if (u_attr && u_attr.b) {
            $banner.addClass('hidden');
            return;
        }
        if (sectionName === '/fm/account' || sectionName === '/fm/account/plan'
            || sectionName === '/fm/account/transfers') {
            $banner.removeClass('hidden');
        }
        else {
            $banner.addClass('hidden');
        }
    };

    showOrHideBanner(id);

    // Always hide the add-phone banner if it was shown by the account profile sub page
    $('.add-phone-num-banner', accountUI.$contentBlock).addClass('hidden');

    switch (id) {

        case '/fm/account':
            $('.fm-account-profile').removeClass('hidden');
            sectionClass = 'account-s';
            accountUI.account.init(account);
            break;

        case '/fm/account/plan':
            if ($.openAchievemetsDialog) {
                delete $.openAchievemetsDialog;
                onIdle(function() {
                    $('.fm-account-plan .btn-achievements:visible', accountUI.$contentBlock).trigger('click');
                });
            }
            $('.fm-account-plan', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'plan';
            accountUI.plan.init(account);
            break;

        case '/fm/account/security':
            $('.fm-account-security', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'security';
            accountUI.security.init();
            if ($.scrollIntoSection && $($.scrollIntoSection, accountUI.$contentBlock).length) {
                $($.scrollIntoSection, accountUI.$contentBlock)[0].scrollIntoView();
            }
            break;

        case '/fm/account/file-management':
            $('.fm-account-file-management', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'file-management';

            accountUI.fileManagement.init(account);
            break;

        case '/fm/account/transfers':
            $('.fm-account-transfers', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'transfers';

            accountUI.transfers.init(account);
            break;

        case '/fm/account/contact-chats':
            $('.fm-account-contact-chats', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'contact-chats';

            accountUI.contactAndChat.init();
            break;

        case '/fm/account/reseller' /** && M.account.reseller **/:
            if (!account.reseller) {
                loadSubPage('fm/account');
                return false;
            }
            $('.fm-account-reseller', accountUI.$contentBlock).removeClass('hidden');
            sectionClass = 'reseller';

            accountUI.reseller.init(account);
            break;

        case '/fm/account/notifications':
            $('.fm-account-notifications').removeClass('hidden');
            $('.quota-banner', '.fm-account-main', accountUI.$contentBlock).addClass('hidden');
            sectionClass = 'notifications';

            accountUI.notifications.init(account);
            break;

        case '/fm/account/calls':
            $('.fm-account-calls').removeClass('hidden');
            sectionClass = 'calls';

            accountUI.calls.init(account);
            break;
        default:

            // This is the main entry point for users who just had upgraded their accounts
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render(true);
                break;
            }

            // If user trying to use wrong url within account page, redirect them to account page.
            loadSubPage('fm/account');
            break;
    }

    accountUI.leftPane.init(sectionClass);

    mBroadcaster.sendMessage('settingPageReady');
    fmLeftMenuUI();

    if (subSectionId) {
        $(`.settings-button.${sectionClass} .sub-title[data-scrollto='${subSectionId}']`).trigger('click');
    }

    loadingDialog.hide();
};

accountUI.general = {

    init: function(account) {

        'use strict';

        clickURLs();

        this.charts.init(account);
        this.userUIUpdate();
        this.bindEvents();
    },

    bindEvents: function() {

        'use strict';

        // Upgrade Account Button
        $('.upgrade-to-pro', accountUI.$contentBlock).rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
                loadSubPage('repay');
            }
            else {
                loadSubPage('pro');
            }
        });

        $('.download-sync', accountUI.$contentBlock).rebind('click', function() {

            var pf = navigator.platform.toUpperCase();

            // If this is Linux send them to desktop page to select linux type
            if (pf.indexOf('LINUX') > -1) {
                loadSubPage('desktop');
            }
            // else directly give link of the file.
            else {
                window.location = megasync.getMegaSyncUrl();
            }
        });
    },

    /**
     * Helper function to fill common charts into the dashboard and account sections
     * @param {Object}  account       User account data (I.e. same as M.account)
     */
    charts: {

        perc_c_s : 0,
        perc_c_b : 0,

        init: function(account) {

            'use strict';

            /* Settings and Dasboard ccontent blocks */
            this.$contentBlock = $('.fm-right-block.dashboard, .fm-right-account-block', '.fm-main');

            this.bandwidthChart(account);
            this.usedStorageChart(account);
            this.chartWarningNoti(account);
        },

        bandwidthChart: function(account) {

            'use strict';

            /* New Used Bandwidth chart */
            this.perc_c_b = account.tfsq.perc > 100 ? 100 : account.tfsq.perc;

            var $bandwidthChart = $('.fm-account-blocks.bandwidth', this.$contentBlock);
            var fullDeg = 360;
            var deg = fullDeg * this.perc_c_b / 100;

            // Used Bandwidth chart
            if (this.perc_c_b < 50) {
                $('.left-chart span', $bandwidthChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $bandwidthChart).css('transform', `rotate(${180 - deg}deg)`);
                $('.right-chart', $bandwidthChart).addClass('low-percent-clip');
                $('.left-chart', $bandwidthChart).addClass('low-percent-clip');
            }
            else {
                $('.left-chart span', $bandwidthChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $bandwidthChart).css('transform', `rotate(${(deg - 180) * -1}deg)`);
                $('.right-chart', $bandwidthChart).removeClass('low-percent-clip');
                $('.left-chart', $bandwidthChart).removeClass('low-percent-clip');
            }

            if (this.perc_c_b > 99 || dlmanager.isOverQuota) {
                $bandwidthChart.addClass('exceeded');
            }
            else if (this.perc_c_b > 80) {
                $bandwidthChart.addClass('going-out');
            }

            // Maximum bandwidth
            var b2 = bytesToSize(account.tfsq.max, 0).split(' ');
            var usedB = bytesToSize(account.tfsq.used);
            $('.chart.data .size-txt', $bandwidthChart).text(usedB);
            $('.chart.data .pecents-txt', $bandwidthChart).text(bytesToSize(account.tfsq.max, 0));
            $('.chart.data .of-txt', $bandwidthChart).text('/');
            $('.account.chart.data', $bandwidthChart).removeClass('hidden');
            if ((u_attr.p || account.tfsq.ach) && b2[0] > 0) {
                if (this.perc_c_b > 0) {
                    $bandwidthChart.removeClass('no-percs');
                    $('.chart .perc-txt', $bandwidthChart).text(formatPercentage(this.perc_c_b / 100));
                }
                else {
                    $bandwidthChart.addClass('no-percs');
                    $('.chart .perc-txt', $bandwidthChart).text('---');
                }
            }
            else {
                $bandwidthChart.addClass('no-percs');
                $('.chart .perc-txt', $bandwidthChart).text('---');
                $('.chart.data > span:not(.size-txt)', $bandwidthChart).text('');
                var usedW;
                if (usedB[0] === '1') {
                    usedW = l[17524].toLowerCase().replace('%tq1', '').trim();
                }
                else if (usedB[0] === '2') {
                    usedW = l[17525].toLowerCase().replace('%tq2', '').trim();
                }
                else {
                    usedW = l[17517].toLowerCase().replace('%tq', '').trim();
                }
                $('.chart.data .pecents-txt', $bandwidthChart).text(usedW);
            }

            if (!account.maf) {
                this.$contentBlock.removeClass('active-achievements');
            }
            else {
                this.$contentBlock.addClass('active-achievements');
            }

            /* End of New Used Bandwidth chart */
        },

        usedStorageChart: function(account) {

            'use strict';

            /* New Used Storage chart */
            var $storageChart = $('.fm-account-blocks.storage', this.$contentBlock);
            var usedPercentage = Math.floor(account.space_used / account.space * 100);
            this.perc_c_s = usedPercentage;
            if (this.perc_c_s > 100) {
                this.perc_c_s = 100;
            }
            $storageChart.removeClass('exceeded going-out');

            if (this.perc_c_s === 100) {
                $storageChart.addClass('exceeded');
            }
            else if (this.perc_c_s >= account.uslw / 100) {
                $storageChart.addClass('going-out');
            }

            var fullDeg = 360;
            var deg = fullDeg * this.perc_c_s / 100;

            // Used space chart
            if (this.perc_c_s < 50) {
                $('.left-chart span', $storageChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $storageChart).css('transform', `rotate(${180 - deg}deg)`);
                $('.right-chart', $storageChart).addClass('low-percent-clip');
                $('.left-chart', $storageChart).addClass('low-percent-clip');
            }
            else {
                $('.left-chart span', $storageChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $storageChart).css('transform', `rotate(${(deg - 180) * -1}deg)`);
                $('.right-chart', $storageChart).removeClass('low-percent-clip');
                $('.left-chart', $storageChart).removeClass('low-percent-clip');
            }

            // Maximum disk space
            $('.chart.data .pecents-txt', $storageChart).text(bytesToSize(account.space, 0));
            $('.chart .perc-txt', $storageChart).text(formatPercentage(usedPercentage / 100));
            $('.chart.data .size-txt', $storageChart).text(bytesToSize(account.space_used));
            $('.account.chart.data', $storageChart).removeClass('hidden');
            /** End New Used Storage chart */
        },

        // TODO: this need to be modified to using on dashboard
        chartWarningNoti: function(account) {

            'use strict';

            var b_exceeded = this.perc_c_t > 99 || dlmanager.isOverQuota;
            var s_exceeded = this.perc_c_s === 100;

            // Charts warning notifications
            var $chartsBlock = $('.account.quota-banner', this.$contentBlock);

            $('.chart-warning:not(.hidden)', $chartsBlock).addClass('hidden');

            if (b_exceeded && s_exceeded) {
                // Bandwidth and Storage quota exceeded
                $('.chart-warning.storage-and-bandwidth', $chartsBlock).removeClass('hidden');
            }
            else if (s_exceeded) {
                // Storage quota exceeded
                $('.chart-warning.storage', $chartsBlock).removeClass('hidden');
            }
            else if (b_exceeded) {
                // Bandwidth quota exceeded
                $('.chart-warning.bandwidth', $chartsBlock).removeClass('hidden');
            }
            else if (this.perc_c_s >= account.uslw / 100) {
                // Running out of cloud space
                $('.chart-warning.out-of-space', $chartsBlock).removeClass('hidden');
            }
            if (b_exceeded || s_exceeded || this.perc_c_s >= account.uslw / 100) {
                $('.chart-warning', $chartsBlock).rebind('click', function() {
                    loadSubPage('pro');
                });
            }
            /* End of Charts warning notifications */
        }
    },

    /**
     * Update user UI (pro plan, avatar, first/last name, email)
     */
    userUIUpdate: function() {
        'use strict';

        var $fmContent = $('.fm-main', '.fmholder');
        var $dashboardPane = $('.content-panel.dashboard', $fmContent);

        // Show Membership plan
        $('.account .plan-icon', $dashboardPane).removeClass('pro1 pro2 pro3 pro4 pro100 free');

        if (u_attr.p) {

            // LITE/PRO account
            var planNum = u_attr.p;
            var planText = pro.getProPlanName(planNum);

            $('.account.membership-plan', $dashboardPane).text(planText);
            $('.account .plan-icon', $dashboardPane).addClass('pro' + planNum);
        }
        else {
            $('.account .plan-icon', $dashboardPane).addClass('free');
            $('.account.membership-plan', $dashboardPane).text(l[1150]);
        }

        // update avatar
        $('.fm-account-avatar', $fmContent).safeHTML(useravatar.contact(u_handle, '', 'div', false));
        $('.fm-avatar', $fmContent).safeHTML(useravatar.contact(u_handle));
        $('.top-menu-popup .avatar-block .wrapper', $fmContent).safeHTML(useravatar.contact(u_handle));

        // Show first name or last name
        $('.membership-big-txt.name', $dashboardPane).text(u_attr.fullname);

        // Show email address
        if (u_attr.email) {
            $('.membership-big-txt.email', $dashboardPane).text(u_attr.email);
        }
        else {
            $('.membership-big-txt.email', $dashboardPane).addClass('hidden');
        }
    },
};

accountUI.controls = {

    disableElement: function(element) {

        'use strict';

        $(element).addClass('disabled').prop('disabled', true);
    },

    enableElement: function(element) {

        'use strict';

        $(element).removeClass('disabled').prop('disabled', false);
    },
};

accountUI.inputs = {

    text: {

        init: function() {

            'use strict';

            var $inputs = $('.underlinedText', '.fm-account-main, .fm-voucher-popup');
            var megaInputs = new mega.ui.MegaInputs($inputs);
        }
    },

    radio: {

        init: function(identifier, $container, currentValue, onChangeCb) {

            'use strict';

            var self = this;
            var $radio = $(identifier, $container);
            var $labels = $('.radio-txt', $container);

            if (String(currentValue)) {
                this.set(identifier, $container, currentValue);
            }

            $('input', $radio).rebind('click.radio', function() {

                var newVal = $(this).val();
                self.set(identifier, $container, newVal, onChangeCb);
            });

            $labels.rebind('click.radioLabel', function() {
                $(this).prev(identifier).find('input', $radio).trigger('click');
            });
        },

        set: function(identifier, $container, newVal, onChangeCb) {

            'use strict';

            var $input = $('input' + identifier + '[value="' + newVal + '"]', $container);

            if ($input.is('.disabled')) {
                return;
            }

            $(identifier + '.radioOn', $container).addClass('radioOff').removeClass('radioOn');
            $input.removeClass('radioOff').addClass('radioOn').prop('checked', true);
            $input.parent().addClass('radioOn').removeClass('radioOff');

            if (typeof onChangeCb === 'function') {
                onChangeCb(newVal);
            }
        },

        disable: function(value, $container) {

            'use strict';

            $('input.[value="' + value + '"]', $container).addClass('disabled').prop('disabled', true);
        },

        enable: function(value, $container) {

            'use strict';

            $('input.[value="' + value + '"]', $container).removeClass('disabled').prop('disabled', false);
        },
    },

    switch: {

        init: function(identifier, $container, currentValue, onChangeCb, onClickCb) {

            'use strict';

            var self = this;
            var $switch = $(identifier, $container);

            if ((currentValue && !$switch.hasClass('toggle-on'))
                || (!currentValue && $switch.hasClass('toggle-on'))) {
                this.toggle(identifier, $container);
            }

            Soon(function() {
                $('.no-trans-init', $switch).removeClass('no-trans-init');
            });

            $switch.rebind('click.switch', function() {

                var val = $switch.hasClass('toggle-on');

                if (typeof onClickCb === 'function') {
                    onClickCb(val).done(function() {
                        self.toggle(identifier, $container, onChangeCb);
                    });
                }
                else {
                    self.toggle(identifier, $container, onChangeCb);
                }
            });
        },

        toggle: function(identifier, $container, onChangeCb) {

            'use strict';

            var $switch = $(identifier, $container);
            var newVal;

            if ($switch.hasClass('toggle-on')) {
                $switch.removeClass('toggle-on');
                newVal = 0;
            }
            else {
                $switch.addClass('toggle-on');
                newVal = 1;
            }

            $switch.trigger('update.accessibility');

            if (typeof onChangeCb === 'function') {
                onChangeCb(newVal);
            }
        }
    }
};

accountUI.leftPane = {

    init: function(sectionClass) {

        'use strict';

        this.render(sectionClass);
        this.bindEvents();
    },

    render: function(sectionClass) {

        'use strict';

        var $settingsPane = $('.content-panel.account', '.fm-main');
        var $menuItems = $('.settings-button', $settingsPane);
        var $currentMenuItem = $menuItems.filter('.' + sectionClass);

        if (M.account.reseller) {
            // Show reseller button on naviation
            $menuItems.filter('.reseller').removeClass('hidden');
        }

        if (accountUI.plan.paymentCard.validateUser(M.account)) {
            $('.acc-setting-menu-card-info', $menuItems).removeClass('hidden');
        }
        else {
            $('.acc-setting-menu-card-info', $menuItems).addClass('hidden');
        }

        $menuItems.filter(':not(.' + sectionClass + ')').addClass('closed').removeClass('active');
        $currentMenuItem.addClass('active');

        setTimeout(function() {
            $currentMenuItem.removeClass('closed');
            initTreeScroll();
        }, 600);
    },

    getPageUrlBySection: function($section) {

        'use strict';

        switch (true) {
            case $section.hasClass('account-s'):
                return 'fm/account';
            case $section.hasClass('plan'):
                return 'fm/account/plan';
            case $section.hasClass('notifications'):
                return 'fm/account/notifications';
            case $section.hasClass('security'):
                return 'fm/account/security';
            case $section.hasClass('file-management'):
                return 'fm/account/file-management';
            case $section.hasClass('transfers'):
                return 'fm/account/transfers';
            case $section.hasClass('contact-chats'):
                return 'fm/account/contact-chats';
            case $section.hasClass('reseller'):
                return 'fm/account/reseller';
            case $section.hasClass('calls'):
                return 'fm/account/calls';
            default:
                return 'fm/account';
        }
    },

    bindEvents: function() {

        'use strict';

        var $settingsPane = $('.content-panel.account', '.fm-main');

        $('.settings-button', $settingsPane).rebind('click', function() {

            const $this = $(this);
            if (!$this.hasClass('active')) {
                accountUI.$contentBlock.scrollTop(0);
                loadSubPage(accountUI.leftPane.getPageUrlBySection($this));
            }
        });

        $('.settings-button i.expand', $settingsPane).rebind('click', function(e) {

            var $button = $(this).closest('.settings-button');

            e.stopPropagation();
            $button.toggleClass('closed');
        });

        $('.settings-button .sub-title', $settingsPane).rebind('click', function() {

            const $this = $(this);
            const $parentBtn = $this.closest('.settings-button');
            const dataScrollto = $this.attr('data-scrollto');
            const $target = $(`.data-block.${dataScrollto}`);
            const targetPosition = $target.position().top;
            const parentPage = accountUI.leftPane.getPageUrlBySection($parentBtn);
            const page = `${parentPage}/${dataScrollto}`;

            if ($parentBtn.hasClass('active')) {
                accountUI.$contentBlock.animate({scrollTop: targetPosition}, 500);
                pushHistoryState(page);
            }
            else {
                $parentBtn.trigger('click');
                mBroadcaster.once('settingPageReady', function () {
                    pushHistoryState(page);
                    accountUI.$contentBlock.animate({scrollTop: $target.position().top}, 500);
                });
            }
        });
    }
};

accountUI.account = {

    init: function(account) {

        'use strict';

        var $settingsPane = $('.content-panel.account', '.fm-main');
        var $profileContent = $('.settings-sub-section.profile', accountUI.$contentBlock);

        // Profile
        this.profiles.resetProfileForm();
        this.profiles.renderPhoneBanner();
        this.profiles.renderFirstName();
        this.profiles.renderLastName();
        this.profiles.renderBirth();
        this.profiles.renderPhoneDetails();

        // if this is a business user, we want to hide some parts in profile page :)
        var hideOrViewCancelSection = function(setToHidden) {

            if (setToHidden) {
                $('.cancel-account-block', accountUI.$contentBlock).addClass('hidden');
                $('.acc-setting-menu-cancel-acc', $settingsPane).addClass('hidden');
                $('#account-firstname', $profileContent).prop('disabled', true);
                $('#account-lastname', $profileContent).prop('disabled', true);
            }
            else {
                $('.cancel-account-block', accountUI.$contentBlock).removeClass('hidden');
                $('.acc-setting-menu-cancel-acc', $settingsPane).removeClass('hidden');
                $('#account-firstname', $profileContent).prop('disabled', false);
                $('#account-lastname', $profileContent).prop('disabled', false);
            }
        };

        if (u_attr && u_attr.b) {
            $('.acc-setting-country-sec', $profileContent).addClass('hidden');
            if (!u_attr.b.m) {
                hideOrViewCancelSection(true);
            }
            else {
                $('.cancel-account-block .content-txt.bus-acc', accountUI.$contentBlock).removeClass('hidden');
                hideOrViewCancelSection(false);
            }
        }
        else {

            // user can set country only in non-business accounts
            $('.acc-setting-country-sec', $profileContent).removeClass('hidden');

            this.profiles.renderCountry();

            // we allow cancel for only non-business account + master users.
            hideOrViewCancelSection(false);
        }

        this.profiles.bindEvents();

        // QR Code
        this.qrcode.render(account);
        this.qrcode.bindEvents();

        // Preference
        this.preference.render();

        // Cancel Account
        this.cancelAccount.bindEvents();
    },

    profiles: {

        /**
         * Render a banner at the top of the My Account section for enticing a user to add their phone number
         * so that they can get an achievement bonus and link up with their phone contacts that might be on MEGA
         */
        renderPhoneBanner: function() {

            'use strict';

            // Cache selectors
            var $addPhoneBanner = $('.add-phone-num-banner', accountUI.$contentBlock);
            var $usageBanner = $('.quota-banner', accountUI.$contentBlock);
            var $text = $('.add-phone-text', $addPhoneBanner);
            var $addPhoneButton = $('.js-add-phone-button', $addPhoneBanner);
            var $skipButton = $('.skip-button', $addPhoneBanner);
            // M.maf is cached in its getter, however, repeated gets will cause unnecessary checks.
            var ach = M.maf;

            // If SMS verification enable is not on level 2 (Opt-in and unblock SMS allowed) then do nothing. Or if
            // they already have already added a phone number then don't show this banner again. Or if they clicked the
            // skip button then don't show the banner.
            if (u_attr.flags.smsve !== 2 || typeof u_attr.smsv !== 'undefined' || fmconfig.skipsmsbanner
                || (ach && ach[9] && ach[9].rwd)) {

                // If not a business account
                if (typeof u_attr.b === 'undefined') {

                    // Show the standard storage/bandwidth usage banner instead of the phone banner
                    $usageBanner.removeClass('hidden');
                    $addPhoneBanner.addClass('hidden');
                }
                else {
                    // Otherwise for business account hide both banners
                    $usageBanner.addClass('hidden');
                    $addPhoneBanner.addClass('hidden');
                }

                return false;
            }

            // On click of the Add Number button load the add phone dialog
            $addPhoneButton.rebind('click', function() {

                sms.phoneInput.init();
            });

            // On click of the Skip button, hide the banner and don't show it again
            $skipButton.rebind('click', function() {

                // Hide the banner
                $addPhoneBanner.addClass('hidden');

                // Save in fmconfig so it is not shown again on reload or login on different machine
                mega.config.set('skipsmsbanner', 1);
            });

            sms.renderAddPhoneText($text);
            // Show the phone banner, hide the storage/bandwidth usage banner
            $usageBanner.addClass('hidden');
            $addPhoneBanner.removeClass('hidden');
        },

        renderFirstName: function() {

            'use strict';

            $('#account-firstname', accountUI.$contentBlock).val(u_attr.firstname).trigger('blur');
        },

        renderLastName: function() {

            'use strict';

            $('#account-lastname', accountUI.$contentBlock).val(u_attr.lastname).trigger('blur');
        },

        renderBirth: function () {

            'use strict';

            // If $.dateTimeFormat['stucture'] is not set, prepare it for birthday
            if (!$.dateTimeFormat.structure) {
                $.dateTimeFormat.structure = getDateStructure() || 'ymd';
            }

            // Display only date format that is correct with current locale.
            $('.mega-input.birth', accountUI.$contentBlock).addClass('hidden');
            $('.mega-input.birth.' + $.dateTimeFormat.structure, accountUI.$contentBlock)
                .removeClass('hidden');

            this.renderBirthYear();
            this.renderBirthMonth();
            this.renderBirthDay();
        },

        renderBirthYear: function() {

            'use strict';

            var i = new Date().getFullYear() - 16;
            var formatClass = '.' + $.dateTimeFormat.structure + ' .byear';
            var $input = $('.mega-input.birth' + formatClass, accountUI.$contentBlock)
                .attr('max', i);

            if (u_attr.birthyear) {
                $input.val(u_attr.birthyear).trigger('input');
            }
        },

        renderBirthMonth: function() {

            'use strict';

            if (u_attr.birthmonth) {
                var formatClass = '.' + $.dateTimeFormat.structure + ' .bmonth';
                var $input = $('.mega-input.title-ontop.birth' + formatClass, accountUI.$contentBlock);
                $input.val(u_attr.birthmonth).trigger('input');
                if ($input.length) {
                    this.zerofill($input[0]);
                }
            }
        },

        renderBirthDay: function() {

            'use strict';

            if (u_attr.birthday) {
                var formatClass = '.' + $.dateTimeFormat.structure + ' .bdate';
                var $input = $('.mega-input.title-ontop.birth' + formatClass, accountUI.$contentBlock);
                $input.val(u_attr.birthday).trigger('input');
                if ($input.length) {
                    this.zerofill($input[0]);
                }
            }
        },

        renderCountry: function() {

            'use strict';

            var html = '';
            var sel = '';
            var $country = $('#account-country', accountUI.$contentBlock);
            $('span', $country).text(l[996]);
            var countries = M.getCountries();
            for (var country in countries) {
                if (!countries.hasOwnProperty(country)) {
                    continue;
                }
                if (u_attr.country && country === u_attr.country) {
                    sel = 'active';
                    $('span', $country).text(countries[country]);
                }
                else {
                    sel = '';
                }
                html += '<div class="option" data-value="' + country
                    +   '" data-state="' + sel + '">' + countries[country]
                    +  '</div>';
            }
            $('.dropdown-scroll', $country).safeHTML(html);

            // Bind Dropdowns events
            bindDropdownEvents($country, 1);
        },

        /**
         * Show the phone number section if applicable
         */
        renderPhoneDetails: function() {

            'use strict';

            // If SMS Verification Enable is on level 1 (SMS suspended unlock allowed only) and they've verified
            // by phone already, show the section and number. Or if SMS Verification Enable is on level 2 (Opt-in SMS
            // allowed), then show the section (and number if added, or an Add button).
            if ((u_attr.flags.smsve === 1 && typeof u_attr.smsv !== 'undefined') || u_attr.flags.smsve === 2) {

                // Cache selectors
                var $content = $('.fm-account-main', accountUI.$contentBlock);
                var $phoneSettings = $('.phone-number-settings', $content);
                var $text = $('.add-phone-text', $phoneSettings);
                var $phoneNumber = $('.phone-number', $phoneSettings);
                var $addNumberButton = $('.add-number-button', $phoneSettings);
                var $buttonsContainer = $('.gsm-mod-rem-btns', $content);
                var $removeNumberButton = $('.rem-gsm', $buttonsContainer);
                var $modifyNumberButton = $('.modify-gsm', $buttonsContainer);

                // If the phone is already added, show that
                if (typeof u_attr.smsv !== 'undefined') {
                    $addNumberButton.addClass('hidden');
                    $text.addClass('hidden');
                    $buttonsContainer.removeClass('hidden');
                    $phoneNumber.removeClass('hidden').text(u_attr.smsv);

                    /**
                     * Send remove command to API, and update UI if needed
                     * @param {String} msg                  Message dialog's text to show for confirmation
                     * @param {String} desc                 Message dialog's description to show for confirmation
                     * @param {Boolean} showSuccessMsg      Show message dialog on success
                     */
                    var removeNumber = function(msg, desc, showSuccessMsg) {

                        msgDialog('confirmation', '', msg, desc, function(answer) {
                            if (answer) {
                                // lock UI
                                loadingDialog.show();

                                api_req(
                                    { a: 'smsr' },
                                    {
                                        callback: tryCatch(function(res) {
                                            // Unlock UI regardless of the result
                                            loadingDialog.hide();
                                            if (res === 0) {
                                                // success
                                                // no APs, we need to rely on this response.
                                                delete u_attr.smsv;

                                                // update only relevant sections in UI
                                                accountUI.account.profiles.renderPhoneBanner();
                                                accountUI.account.profiles.renderPhoneDetails();

                                                if (showSuccessMsg) {
                                                    msgDialog('info', '', l[23427]);
                                                }
                                                else {
                                                    sms.phoneInput.init();
                                                }
                                            }
                                            else {
                                                msgDialog('warningb', '', l[23428]);
                                            }
                                        }, function() {
                                            loadingDialog.hide();
                                            msgDialog('warningb', '', l[23428]);
                                        })
                                    }
                                );
                            }
                        });
                    };

                    $removeNumberButton.rebind('click.gsmremove', removeNumber.bind(null, l[23425], l[23426], true));
                    $modifyNumberButton.rebind('click.gsmmodify', removeNumber.bind(null, l[23429], l[23430], false));
                }
                else {
                    $addNumberButton.removeClass('hidden');
                    $text.removeClass('hidden');
                    $buttonsContainer.addClass('hidden');
                    $phoneNumber.addClass('hidden').text('');

                    // On click of the Add Number button load the add phone dialog
                    $addNumberButton.rebind('click', function() {

                        sms.phoneInput.init();
                    });
                }

                // Show the section
                $phoneSettings.removeClass('hidden');
            }
        },

        zerofill: function(elem) {

            'use strict';

            if (elem.value.length === 1) {
                elem.value = '0' + elem.value;
            }
        },

        resetProfileForm: function() {

            'use strict';

            var $personalInfoBlock = $('.profile-form', accountUI.$contentBlock);
            var $saveBlock = $('.fm-account-sections .save-block', accountUI.$contentBlock);

            $('input', $personalInfoBlock).val('');
            $('.error, .errored', $personalInfoBlock).removeClass('error errored');
            $saveBlock.addClass('closed');
        },

        bindEvents: function() {

            'use strict';

            // Cache selectors
            var self = this;
            var $personalInfoBlock = $('.profile-form', accountUI.$contentBlock);
            var $birthdayBlock = $('.mega-input.title-ontop.birth.' + $.dateTimeFormat.structure,
                $personalInfoBlock);
            var $firstNameField = $('#account-firstname', $personalInfoBlock);
            var $lastNameField = $('#account-lastname', $personalInfoBlock);
            var $countryDropdown = $('#account-country', $personalInfoBlock);
            var $saveBlock = $('.fm-account-sections .save-block', accountUI.$contentBlock);
            var $saveButton = $('.fm-account-save', $saveBlock);

            // Avatar
            $('.avatar-wrapper, .settings-sub-section.avatar .avatar', $personalInfoBlock)
                .rebind('click.showDialog', function() {
                    avatarDialog();
                });

            // All profile text inputs
            $firstNameField.add($lastNameField).add('.byear, .bmonth, .bdate', $birthdayBlock)
                .rebind('input.settingsGeneral change.settingsGeneral', function() {

                    var $this = $(this);
                    var $parent = $this.parent();
                    var errorMsg = l[20960];
                    var max = parseInt($this.attr('max'));
                    var min = parseInt($this.attr('min'));

                    if ($this.is('.byear, .bmonth, .bdate')) {
                        if (this.value > max || this.value < min) {

                            if ($this.is('.byear') && this.value > max && this.value === u_attr.birthyear) {
                                // To omit the case that users already set invalid year value
                                // before implied the restrictions
                                return true;
                            }

                            $this.addClass('errored');
                            $parent.addClass('error msg');
                            var $msg = $('.message-container', $parent).text(errorMsg);
                            $parent.css('margin-bottom', $msg.outerHeight() + 20 + 'px');
                            $saveBlock.addClass('closed');

                            return false;
                        }
                        else {
                            $this.removeClass('errored');
                            var $erroredInput = $parent.find('.errored');
                            if ($erroredInput.length){
                                $($erroredInput[0]).trigger('change');
                            }
                            else {
                                $parent.removeClass('error msg');
                                $parent.css('margin-bottom', '');
                            }
                        }
                    }

                    var enteredFirst = $firstNameField.val().trim();
                    var enteredLast = $lastNameField.val().trim();

                    if (enteredFirst.length > 0 && enteredLast.length > 0 &&
                        !$('.errored', $personalInfoBlock).length &&
                        (enteredFirst !== u_attr.firstname ||
                        enteredLast !== u_attr.lastname ||
                        ($('.bdate', $birthdayBlock).val() | 0) !== (u_attr.birthday | 0) ||
                        ($('.bmonth', $birthdayBlock).val() | 0) !== (u_attr.birthmonth | 0) ||
                        ($('.byear', $birthdayBlock).val() | 0)  !== (u_attr.birthyear | 0))) {
                        $saveBlock.removeClass('closed');
                    }
                    else {
                        $saveBlock.addClass('closed');
                    }
                });

            $('.byear, .bmonth, .bdate', $birthdayBlock).rebind('keydown.settingsGeneral', function(e) {

                var $this = $(this);
                var charCode = e.which || e.keyCode; // ff
                var $parent = $this.parent();
                var max = parseInt($this.attr('max'));
                var min = parseInt($this.attr('min'));

                if (!e.shiftkey &&
                    !((charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105)) &&
                    (charCode !== 8 && charCode !== 9 && charCode !== 37 && charCode !== 39)){
                    e.preventDefault();
                }

                if (charCode === 38) {
                    if (!this.value || parseInt(this.value) < parseInt(min)) {
                        this.value = min;
                    }
                    else if (parseInt(this.value) >= parseInt(max)) {
                        this.value = max;
                    }
                    else {
                        this.value++;
                    }
                    $parent.removeClass('error');
                    $this.removeClass('errored').trigger('change');
                    self.zerofill(this);
                }

                if (charCode === 40) {
                    if (parseInt(this.value) <= parseInt(min)) {
                        this.value = min;
                    }
                    else if (!this.value || parseInt(this.value) > parseInt(max)) {
                        this.value = max;
                    }
                    else {
                        this.value--;
                    }
                    $parent.removeClass('error');
                    $this.removeClass('errored').trigger('change');
                    self.zerofill(this);
                }
            });

            $('.bmonth, .bdate', $birthdayBlock).rebind('blur.settingsGeneral', function() {
                self.zerofill(this);
            });

            $('.birth-arrow', $personalInfoBlock).rebind('click', function() {

                var $this = $(this);
                var $target = $this.parent('.birth-arrow-container').prev('input');
                var e = $.Event('keydown.settingsGeneral');
                e.which = $this.hasClass('up-control') ? 38 : 40;
                $target.trigger(e);
            });

            $('.mega-input-dropdown .option', $countryDropdown).rebind('click.showSave', function() {

                if ($firstNameField.val() && $firstNameField.val().trim().length > 0
                    && !$personalInfoBlock.find('.errored').length) {
                    $saveBlock.removeClass('closed');
                }
                else {
                    $saveBlock.addClass('closed');
                }
            });

            $saveButton.rebind('click', function() {

                if ($(this).hasClass('disabled')) {
                    return false;
                }

                const $bd = $('.bdate', $birthdayBlock);
                const $bm = $('.bmonth', $birthdayBlock);
                const $by = $('.byear', $birthdayBlock);

                const bd = $bd.val();
                const bm = $bm.val();
                const by = $by.val();

                // Check whether the birthday info gets changed
                const bd_old = u_attr.birthday || '';
                const bm_old = u_attr.birthmonth || '';
                const by_old = u_attr.birthyear || '';
                const birthdayChanged = bd_old !== bd || bm_old !== bm || by_old !== by;

                if (birthdayChanged && M.validateDate(parseInt(bd), parseInt(bm), parseInt(by)) !== 0) {

                    const $parent = $bd.parent().addClass('error msg');
                    var $msg = $('.message-container', $parent).text(l[20960]);
                    $parent.css('margin-bottom', `${$msg.outerHeight() + 20}px`);
                    $saveBlock.addClass('closed');

                    return false;
                }

                if ($('.bdate', $birthdayBlock).val())

                $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', false));
                $('.fm-avatar').safeHTML(useravatar.contact(u_handle));

                var checklist = {
                    firstname: String($('#account-firstname', $personalInfoBlock).val() || '').trim(),
                    lastname: String($('#account-lastname', $personalInfoBlock).val() || '').trim(),
                    birthday: String(bd || ''),
                    birthmonth: String(bm || ''),
                    birthyear: String(by || ''),
                    country: String(
                        $('#account-country .option[data-state="active"]', $personalInfoBlock).attr('data-value') || ''
                    )
                };
                var userAttrRequest = { a: 'up' };

                var checkUpdated = function() {
                    var result = false;
                    for (var i in checklist) {
                        if (u_attr[i] === null || u_attr[i] !== checklist[i]) {
                            // we want also to catch the 'undefined' or null
                            // and replace with the empty string (or given string)
                            u_attr[i] = i === 'firstname' ? checklist[i] || 'Nobody' : checklist[i];
                            userAttrRequest[i] = base64urlencode(to8(u_attr[i]));
                            result = true;
                        }
                    }
                    return result;
                };

                if (checkUpdated()) {
                    api_req(userAttrRequest, {
                        callback: function (res) {
                            if (res === u_handle) {
                                $('.user-name').text(u_attr.name);
                                $('.name', '.account-dialog').text(u_attr.fullname)
                                    .attr('data-simpletip', u_attr.fullname);
                                $('.top-menu-logged .name', '.top-menu-popup').text(u_attr.name);
                                showToast('settings', l[7698]);
                                accountUI.account.profiles.bindEvents();
                                // update megadrop username for existing megadrop
                                mega.megadrop.updatePUPUserName(u_attr.fullname);
                            }
                        }
                    });
                }

                // Reset current Internationalization API usage upon save.
                onIdle(function() {
                    mega.intl.reset();
                });

                $saveBlock.addClass('closed');
                $saveButton.removeClass('disabled');
            });
        },
    },

    qrcode: {

        $QRSettings: null,

        render: function(account) {

            'use strict';

            this.$QRSettings =  $('.qr-settings', accountUI.$contentBlock);

            var QRoptions = {
                width: 106,
                height: 106,
                // high
                correctLevel: QRErrorCorrectLevel.H,
                background: '#f2f2f2',
                foreground: '#151412',
                text: getBaseUrl() + '/' + account.contactLink
            };

            var defaultValue = (account.contactLink && account.contactLink.length);

            $('.qr-http-link', this.$QRSettings).text(QRoptions.text);

            var $container = $('.enable-qr-container', this.$QRSettings);

            if (defaultValue) {
                // Render the QR code
                $('.account.qr-icon', this.$QRSettings).text('').qrcode(QRoptions);
                $('.mega-switch.enable-qr', this.$QRSettings).addClass('toggle-on').trigger('update.accessibility');
                $('.access-qr-container', this.$QRSettings).parent().removeClass('closed');
                $('.qr-block', this.$QRSettings).removeClass('hidden');
                $container.addClass('border');
            }
            else {
                $('.account.qr-icon').text('');
                $('.mega-switch.enable-qr', this.$QRSettings).removeClass('toggle-on').trigger('update.accessibility');
                $('.access-qr-container', this.$QRSettings).parent().addClass('closed');
                $('.qr-block', this.$QRSettings).addClass('hidden');
                $container.removeClass('border');
            }

            // Enable QR code
            accountUI.inputs.switch.init(
                '.enable-qr',
                $container,
                defaultValue,
                function(val) {

                    if (val) {
                        $('.access-qr-container', accountUI.account.qrcode.$QRSettings)
                            .add('.qr-block', accountUI.account.qrcode.$QRSettings)
                            .parent().removeClass('closed');

                        api_req({ a: 'clc' }, {
                            myAccount: account,
                            callback: function (res, ctx) {
                                ctx.myAccount.contactLink = typeof res === 'string' ? 'C!' + res : '';
                                accountUI.account.qrcode.render(M.account);
                            }
                        });
                    }
                    else {
                        $('.access-qr-container', accountUI.account.qrcode.$QRSettings)
                            .add('.qr-settings .qr-block').parent().addClass('closed');

                        api_req({
                            a: 'cld',
                            cl: account.contactLink.substring(2, account.contactLink.length)
                        }, {
                            myAccount: account,
                            callback: function (res, ctx) {

                                if (res === 0) { // success
                                    ctx.myAccount.contactLink = '';
                                }
                            }
                        });
                    }
                },
                function(val) {

                    var promise = new MegaPromise();

                    // If it is toggle off, warn user.
                    if (val) {
                        msgDialog('confirmation', l[19990], l[20128], l[18229], function (answer) {
                            if (answer) {
                                promise.resolve();
                            }
                            else {
                                promise.reject();
                            }
                        });
                    }
                    else {
                        // It is toggle on, just proceed;
                        promise.resolve();
                    }
                    return promise;
                });

            // Automatic accept section
            mega.attr.get(u_handle, 'clv', -2, 0).always(function(res) {

                accountUI.inputs.switch.init(
                    '.auto-qr',
                    $('.access-qr-container', accountUI.account.qrcode.$QRSettings),
                    parseInt(res),
                    function(val) {
                        mega.attr.set('clv', val, -2, 0);
                    });
            });
        },

        bindEvents: function() {

            'use strict';

            // Reset Section
            $('.reset-qr-label', this.$QRSettings).rebind('click', accountUI.account.qrcode.reset);

            // Copy link Section
            if (is_extension || M.execCommandUsable()) {
                $('.copy-qr-link', this.$QRSettings).removeClass('hidden');
                $('.qr-dlg-cpy-lnk', this.$QRSettings).rebind('click', function() {
                    var links = $.trim($(this).next('.qr-http-link').text());
                    var toastTxt = l[7654];
                    copyToClipboard(links, toastTxt);
                });
            }
            else {
                $('.copy-qr-link', this.$QRSettings).addClass('hidden');
            }
        },

        reset: function() {

            'use strict';

            msgDialog('confirmation', l[18227], l[18228], l[18229], function (regenQR) {

                if (regenQR) {
                    loadingDialog.show();
                    var delQR = {
                        a: 'cld',
                        cl: M.account.contactLink.substring(2, M.account.contactLink.length)
                    };
                    var reGenQR = { a: 'clc' };

                    api_req(delQR, {
                        callback: function (res) {
                            if (res === 0) { // success
                                api_req(reGenQR, {
                                    callback: function (res2) {
                                        if (typeof res2 !== 'string') {
                                            res2 = '';
                                        }
                                        else {
                                            res2 = 'C!' + res2;
                                        }
                                        M.account.contactLink = res2;
                                        accountUI.account.qrcode.render(M.account);
                                        loadingDialog.hide();
                                    }
                                });
                            }
                            else {
                                loadingDialog.hide();
                            }
                        }
                    });
                }
            });
        }
    },

    preference: {

        render: function() {

            'use strict';

            var self = this;

            // Date/time format setting
            accountUI.inputs.radio.init(
                '.uidateformat',
                $('.uidateformat', accountUI.$contentBlock).parent(),
                fmconfig.uidateformat || 0,
                function (val) {
                    mega.config.setn('uidateformat', parseInt(val), l[16168]);
                }
            );

            // Font size
            accountUI.inputs.radio.init(
                '.uifontsize',
                $('.uifontsize', accountUI.$contentBlock).parent(),
                fmconfig.font_size || 2,
                function (val) {
                    $('body').removeClass('fontsize1 fontsize2').addClass('fontsize' + val);
                    mega.config.setn('font_size', parseInt(val), l[16168]);
                }
            );

            // Theme
            accountUI.inputs.radio.init(
                '.uiTheme',
                $('.uiTheme', accountUI.$contentBlock).parent(),
                u_attr['^!webtheme'] || 0,
                function(val) {
                    mega.attr.set('webtheme', val, -2, 1);
                    mega.ui.theme.set(val);
                }
            );

            self.initHomePageDropdown();

        },

        /**
         * Render and bind events for the home page dropdown.
         * @returns {void}
         */
        initHomePageDropdown: function() {

            'use strict';

            var $hPageSelect = $('.settings-choose-homepage-dropdown', accountUI.$contentBlock);
            var $textField = $('span', $hPageSelect);

            // Mark active item.
            var $activeItem = $('.option[data-value="' + getLandingPage() + '"]', $hPageSelect);
            $activeItem.addClass('active');
            $textField.text($activeItem.text());

            // Bind Dropdowns events
            bindDropdownEvents($hPageSelect, 1);

            $('.option', $hPageSelect).rebind('click.saveChanges', function() {
                var $selectedOption = $('.option[data-state="active"]', $hPageSelect);
                var newValue = $selectedOption.attr('data-value') || 'fm';
                showToast('settings', l[16168]);
                setLandingPage(newValue);
            });
        },
    },

    cancelAccount: {

        bindEvents: function() {

            'use strict';

            // Cancel account button on main Account page
            $('.cancel-account').rebind('click', function() {

                // Please confirm that all your data will be deleted
                var confirmMessage = l[1974];

                if (u_attr.b && u_attr.b.m) {
                    confirmMessage = l.bus_acc_delete_confirm_msg;
                }

                // Search through their Pro plan purchase history
                for (var i = 0; i < M.account.purchases.length; i++) {
                    // Get payment method name
                    var paymentMethodId = M.account.purchases[i][4];
                    var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).name;

                    // If they have paid with iTunes or Google Play in the past
                    if (paymentMethod === 'apple' || paymentMethod === 'google') {
                        // Update confirmation message to remind them to cancel iTunes or Google Play
                        confirmMessage += ' ' + l[8854];
                        break;
                    }
                }

                /**
                 * Finalise the account cancellation process
                 * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
                 */
                var continueCancelAccount = function(twoFactorPin) {

                    // Prepare the request
                    var request = { a: 'erm', m: Object(M.u[u_handle]).m, t: 21 };

                    // If 2FA PIN is set, add it to the request
                    if (twoFactorPin !== null) {
                        request.mfa = twoFactorPin;
                    }

                    api_req(request, {
                        callback: function(res) {

                            loadingDialog.hide();

                            // Check for invalid 2FA code
                            if (res === EFAILED || res === EEXPIRED) {
                                msgDialog('warninga', l[135], l[19216]);
                            }

                            // Check for incorrect email
                            else if (res === ENOENT) {
                                msgDialog('warningb', l[1513], l[1946]);
                            }
                            else if (res === 0) {
                                handleResetSuccessDialogs('.reset-success', l[735], 'deleteaccount');
                            }
                            else {
                                msgDialog('warningb', l[135], l[200]);
                            }
                        }
                    });
                };

                // Ask for confirmation
                msgDialog('confirmation', l[6181], confirmMessage, false, function(event) {
                    if (event) {

                        loadingDialog.show();

                        // Check if 2FA is enabled on their account
                        twofactor.isEnabledForAccount(function(result) {

                            loadingDialog.hide();

                            // If 2FA is enabled on their account
                            if (result) {

                                // Show the verify 2FA dialog to collect the user's PIN
                                twofactor.verifyActionDialog.init(function(twoFactorPin) {
                                    continueCancelAccount(twoFactorPin);
                                });
                            }
                            else {
                                continueCancelAccount(null);
                            }
                        });
                    }
                });
            });
        }
    }
};

accountUI.plan = {

    init: function(account) {

        "use strict";

        const $planContent = $('.fm-account-plan.fm-account-sections', accountUI.$contentBlock);

        // Plan - Account type
        this.accountType.render(account);
        this.accountType.bindEvents();

        // Plan - Account Balance
        this.balance.render(account);
        this.balance.bindEvents();

        // Plan - History
        this.history.renderPurchase(account);
        this.history.renderTransaction(account);
        this.history.bindEvents(account);

        // Plan - Payment card
        this.paymentCard.init(account, $planContent);

        // check if business account
        if (u_attr && u_attr.b) {
            if (!u_attr.b.m || u_attr.b.s === -1) {
                $('.acc-storage-space', $planContent).addClass('hidden');
                $('.acc-bandwidth-vol', $planContent).addClass('hidden');
            }
            $('.btn-achievements', $planContent).addClass('hidden');
            $('.data-block.account-balance', $planContent).addClass('hidden');
            $('.acc-setting-menu-balance-acc', '.content-panel.account').addClass('hidden');
            if (!u_attr.b.m || u_attr.b.s !== -1) {
                $('.upgrade-to-pro', $planContent).addClass('hidden');
            }
        }
    },

    accountType: {

        render: function(account) {

            'use strict';

            var $planContent = $('.data-block.account-type', accountUI.$contentBlock);

            var renderSubscription = function _renderSubscription() {
                // Get the date their subscription will renew
                var timestamp = (account.srenew.length > 0) ? account.srenew[0] : 0; // Timestamp e.g. 1493337569
                var paymentType = (account.sgw.length > 0) ? account.sgw[0] : ''; // Credit Card etc
                var gatewayId = (account.sgwids.length > 0) ? account.sgwids[0] : null; // Gateway ID e.g. 15, etc

                if (paymentType.indexOf('Credit Card') === 0) {
                    paymentType = paymentType.replace('Credit Card', l[6952]);
                }

                // Display the date their subscription will renew if known
                if (timestamp > 0) {
                    var dateString = time2date(timestamp, 2);

                    // Use format: 14 March 2015 - Credit Card
                    paymentType = dateString + ' - ' + paymentType;

                    // Change placeholder 'Expires on' to 'Renews'
                    $('.subtitle-txt.expiry-txt', $planContent).text(l[6971]);
                    $('.account.plan-info.expiry', $planContent).text(paymentType);
                }
                else {
                    // Otherwise show nothing
                    $('.account.plan-info.expiry', $planContent).text('');
                    $('.subtitle-txt.expiry-txt', $planContent).text('');
                }

                var $subscriptionBlock = $('.sub-container.subscription', $planContent);
                var $cancelSubscriptionButton = $('.btn-cancel-sub', $subscriptionBlock);
                var $achievementsButton = $('.btn-achievements', $planContent);

                if (!M.maf){
                    $achievementsButton.addClass('hidden');
                }

                // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
                if ((gatewayId === 2) || (gatewayId === 3)) {

                    // Tell them they need to cancel their plan off-site and don't show the feedback dialog
                    $subscriptionBlock.removeClass('hidden');
                    $cancelSubscriptionButton.rebind('click', function() {
                        msgDialog('warninga', l[7179], l[16501]);
                    });
                }

                // Otherwise if ECP, Sabadell, or Stripe
                else if (gatewayId === 16 || gatewayId === 17 || gatewayId === 19) {

                    // Check if there are any active subscriptions
                    // ccqns = Credit Card Query Number of Subscriptions
                    api_req({ a: 'ccqns' }, {
                        callback: function(numOfSubscriptions) {

                            // If there is an active subscription
                            if (numOfSubscriptions > 0) {

                                // Show cancel button and show cancellation dialog
                                $subscriptionBlock.removeClass('hidden');
                                $cancelSubscriptionButton.rebind('click', function() {
                                    accountUI.plan.accountType.cancelSubscriptionDialog.init();
                                });
                            }
                        }
                    });
                }
            };

            if (u_attr.p) {

                // LITE/PRO account
                var planNum = u_attr.p;
                var planText = pro.getProPlanName(planNum);

                // if this is p=100 business
                if (planNum === 100) {
                    $('.account.plan-info.accounttype', $planContent).addClass('business');
                    $('.fm-account-plan .acc-renew-date-info', $planContent).removeClass('border');
                }
                else {
                    $('.account.plan-info.accounttype', $planContent).removeClass('business');
                    $('.fm-account-plan .acc-renew-date-info', $planContent).addClass('border');
                }

                // Account type
                $('.account.plan-info.accounttype span', $planContent).text(planText);
                $('.account .plan-icon', $planContent).addClass('pro' + planNum);

                // Subscription
                if (account.stype === 'S') {
                    renderSubscription();
                }
                else if (account.stype === 'O') {

                    var expiryTimestamp = account.nextplan ? account.nextplan.t : account.expiry;

                    // one-time or cancelled subscription
                    $('.subtitle-txt.expiry-txt', $planContent).text(l[987]);
                    $('.account.plan-info.expiry span', $planContent).text(time2date(expiryTimestamp, 2));
                    $('.sub-container.subscription', $planContent).addClass('hidden');
                }

                $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
            }
            else {
                // free account:
                $('.account.plan-info.accounttype span', $planContent).text(l[1150]);
                $('.account .plan-icon', $planContent).addClass('free');
                $('.account.plan-info.expiry', $planContent).text(l[436]);
                $('.sub-container.subscription', $planContent).addClass('hidden');
                if (account.mxfer) {
                    $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
                }
                else {
                    $('.account.plan-info.bandwidth', $planContent).parent().addClass('hidden');
                }
            }

            /* achievements */
            if (!account.maf || (u_attr.p === 100 && u_attr.b && u_attr.b.m)) {

                $('.btn-achievements', $planContent).addClass('hidden');
                if (u_attr.p === 100 && u_attr.b && u_attr.b.m) {

                    // Debug code ...
                    if (d && localStorage.debugNewPrice) {
                        M.account.space_bus_base = 3;
                        M.account.space_bus_ext = 2;
                        M.account.tfsq_bus_base = 3;
                        M.account.tfsq_bus_ext = 1;
                        M.account.tfsq_bus_used = 3848290697216; // 3.5 TB
                        M.account.space_bus_used = 4617948836659; // 4.2 TB
                    }
                    // END Debug code

                    const renderBars = (used, base, extra, $container, msg, $overall) => {
                        let spaceTxt = `${bytesToSize(used)}`;
                        let baseTxt = spaceTxt;
                        let storageConsume = used / 1048576; // MB
                        let storageQuota = (base || 3) * 1048576 + storageConsume; // MB
                        let extraTxt = l[5816].replace('[X]', base || 3);

                        if (base) {

                            spaceTxt += `/${l[5816]
                                .replace('[X]', base + (extra || 0))}`;

                            if (extra) {
                                storageConsume = base;
                                storageQuota = base + extra;
                                baseTxt = extraTxt;
                                extraTxt = msg.replace('%1', extra);
                            }
                        }

                        $('.settings-sub-bar', $container)
                            .css('width', `${100 - storageConsume * 100 / storageQuota}%`);
                        $('.base-quota-note span', $container).text(baseTxt);
                        $('.achieve-quota-note span', $container).text(extraTxt);
                        $overall.text(spaceTxt);
                    };

                    const $storageContent = $('.acc-storage-space', $planContent);
                    const $bandwidthContent = $('.acc-bandwidth-vol', $planContent);

                    renderBars(M.account.space_bus_used || M.account.space_used, M.account.space_bus_base,
                               M.account.space_bus_ext, $storageContent, l.additional_storage,
                               $('.plan-info.storage > span', $planContent));

                    renderBars(M.account.tfsq_bus_used || M.account.tfsq.used, M.account.tfsq_bus_base,
                               M.account.tfsq_bus_ext, $bandwidthContent, l.additional_transfer,
                               $('.plan-info.bandwidth > span', $planContent));

                    $('.bars-container', $planContent).removeClass('hidden');
                }
                else {
                    $('.plan-info.storage > span', $planContent).text(bytesToSize(M.account.space, 0));
                    $('.plan-info.bandwidth > span', $planContent).text(bytesToSize(M.account.tfsq.max, 0));
                    $('.bars-container', $planContent).addClass('hidden');
                }
            }
            else {
                mega.achievem.parseAccountAchievements();
            }
        },

        bindEvents: function() {

            "use strict";

            $('.btn-achievements', accountUI.$contentBlock).rebind('click', function() {
                mega.achievem.achievementsListDialog();
            });
        },

        /**
         * Dialog to cancel subscriptions
         */
        cancelSubscriptionDialog: {

            $backgroundOverlay: null,
            $dialog: null,
            $dialogSuccess: null,
            $accountPageCancelButton: null,
            $continueButton: null,
            $cancelReason: null,
            $expiryTextBlock: null,
            $expiryDateBlock: null,

            /**
             * Initialise the dialog
             */
            init: function() {

                'use strict';

                // Cache some selectors
                this.$dialog = $('.cancel-subscription-st1');
                this.$dialogSuccess = $('.cancel-subscription-st2');
                this.$accountPageCancelButton = $('.btn-cancel-sub');
                this.$continueButton = this.$dialog.find('.continue-cancel-subscription');
                this.$cancelReason = this.$dialog.find('.cancel-textarea textarea');
                this.$backgroundOverlay = $('.fm-dialog-overlay');
                this.$expiryTextBlock = $('.account.plan-info.expiry-txt');
                this.$expiryDateBlock = $('.account.plan-info.expiry');

                // Show the dialog
                this.$dialog.removeClass('hidden');
                this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

                // Init textarea scrolling
                initTextareaScrolling($('.cancel-textarea textarea'), 126);

                // Init functionality
                this.enableButtonWhenReasonEntered();
                this.initSendingReasonToApi();
                this.initCloseAndBackButtons();
            },

            /**
             * Close the dialog when either the close or back buttons are clicked
             */
            initCloseAndBackButtons: function() {

                'use strict';

                var self = this;

                // Close main dialog
                this.$dialog.find('button.cancel, button.js-close').rebind('click', function() {
                    self.$dialog.addClass('hidden');
                    self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                });

                // Prevent clicking on the background overlay which closes it unintentionally
                self.$backgroundOverlay.rebind('click', function(event) {
                    event.stopPropagation();
                });
            },

            /**
             * Close success dialog
             */
            initCloseButtonSuccessDialog: function() {

                'use strict';

                var self = this;

                this.$dialogSuccess.find('button.js-close').rebind('click', function() {
                    self.$dialogSuccess.addClass('hidden');
                    self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                });
            },

            /**
             * Make sure text has been entered before making the button available
             */
            enableButtonWhenReasonEntered: function() {

                'use strict';

                var self = this;

                this.$cancelReason.rebind('keyup', function() {

                    // Trim for spaces
                    var reason = $(this).val();
                    reason = $.trim(reason);

                    // Make sure at least 1 character
                    if (reason.length > 0) {
                        self.$continueButton.removeClass('disabled');
                    }
                    else {
                        self.$continueButton.addClass('disabled');
                    }
                });
            },

            /**
             * Send the cancellation reason
             */
            initSendingReasonToApi: function() {

                'use strict';

                var self = this;

                this.$continueButton.rebind('click', function() {

                    // Get the cancellation reason
                    var reason = self.$cancelReason.val();

                    // Hide the dialog and show loading spinner
                    self.$dialog.addClass('hidden');
                    self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                    loadingDialog.show();

                    // Cancel the subscription/s
                    // cccs = Credit Card Cancel Subscriptions, r = reason
                    api_req({a: 'cccs', r: reason}, {
                        callback: function() {

                            // Hide loading dialog and cancel subscription button on account page, set exiry date
                            loadingDialog.hide();
                            self.$accountPageCancelButton.addClass('hidden');
                            self.$expiryTextBlock.text(l[987]);
                            self.$expiryDateBlock
                                .safeHTML('<span class="red">@@</span>',
                                    time2date(account.expiry, 2));

                            // Show success dialog and refresh UI
                            self.$dialogSuccess.removeClass('hidden');
                            self.$backgroundOverlay.removeClass('hidden');
                            self.$backgroundOverlay.addClass('payment-dialog-overlay');
                            self.initCloseButtonSuccessDialog();

                            // Reset account cache so all account data will be refetched
                            // and re-render the account page UI
                            M.account.lastupdate = 0;
                            accountUI();
                        }
                    });
                });
            }
        }
    },

    paymentCard: {

        $paymentSection: null,

        validateCardResponse: function(res) {
            'use strict';
            return res && (res.gw === (addressDialog || {}).gatewayId_stripe || 19) && res.brand && res.last4
                && res.exp_month && res.exp_year;
        },

        validateUser: function(account) {
            'use strict';
            return (u_attr.p || u_attr.b) && account.stype === 'S'
                && ((Array.isArray(account.sgw) && account.sgw.includes('Stripe'))
                    || (Array.isArray(account.sgwids)
                        && account.sgwids.includes((addressDialog || {}).gatewayId_stripe || 19)));
        },

        init: function(account, $planSection) {
            'use strict';

            this.$paymentSection = $('.account.account-card-info', $planSection);

            const hideCardSection = () => {
                this.$paymentSection.addClass('hidden');

                $('.settings-button .acc-setting-menu-card-info', '.content-panel.account')
                    .addClass('hidden');
            };

            // check if we should show the section (uq response)
            if (this.validateUser(account)) {

                api_req({ a: 'cci' }, {
                    callback: (res) => {
                        if (typeof res === 'object' && this.validateCardResponse(res)) {
                            return this.render(res);
                        }

                        hideCardSection();
                    }
                });
            }
            else {
                hideCardSection();
            }
        },

        render: function(cardInfo) {
            'use strict';

            if (cardInfo && this.$paymentSection) {


                if (cardInfo.brand === 'visa') {

                    this.$paymentSection.addClass('visa').removeClass('mc');
                    $('.payment-card-icon i', this.$paymentSection)
                        .removeClass('sprite-fm-uni icon-mastercard-border');

                }
                else if (cardInfo.brand === 'mastercard') {

                    this.$paymentSection.addClass('mc').removeClass('visa');
                    $('.payment-card-icon i', this.$paymentSection).addClass('sprite-fm-uni icon-mastercard-border');

                }
                else {
                    this.$paymentSection.removeClass('visa mc');
                }

                $('.payment-card-nb .payment-card-digits', this.$paymentSection).text(cardInfo.last4);
                $('.payment-card-expiry .payment-card-expiry-val', this.$paymentSection)
                    .text(`${String(cardInfo.exp_month).padStart(2, '0')}/${String(cardInfo.exp_year).substr(-2)}`);

                $('.payment-card-bottom a.payment-card-edit', this.$paymentSection).rebind('click', () => {

                    loadingDialog.show();

                    api_req({ a: 'gw19_ccc' }, {
                        callback: (res) => {
                            loadingDialog.hide();

                            if ($.isNumeric(res)) {
                                msgDialog('warninga', '', l.edit_card_error.replace('%1', res), l.edit_card_error_des);
                            }
                            else if (typeof res === 'string') {
                                addressDialog.processUtcResult(
                                    {
                                        EUR: res,
                                        edit: true
                                    },
                                    true
                                );
                            }
                        }
                    });
                });

                this.$paymentSection.removeClass('hidden');
            }
        }

    },

    balance: {

        render: function(account) {

            "use strict";

            $('.account.plan-info.balance span', accountUI.$contentBlock).safeHTML(
                '&euro; @@',
                mega.intl.number.format(account.balance[0][0])
            );
        },

        bindEvents: function() {

            "use strict";

            var self = this;

            $('.redeem-voucher', accountUI.$contentBlock).rebind('click', function() {
                var $this = $(this);
                if ($this.attr('class').indexOf('active') === -1) {
                    $('.fm-account-overlay').fadeIn(100);
                    $this.addClass('active');
                    $('.fm-voucher-popup').removeClass('hidden');

                    $('.fm-account-overlay, .fm-purchase-voucher, .fm-voucher-button')
                        .add('.fm-voucher-popup button.js-close')
                        .rebind('click.closeDialog', function() {
                            $('.fm-account-overlay').fadeOut(100);
                            $('.redeem-voucher').removeClass('active');
                            $('.fm-voucher-popup').addClass('hidden');
                        });
                }
                else {
                    $('.fm-account-overlay').fadeOut(200);
                    $this.removeClass('active');
                    $('.fm-voucher-popup').addClass('hidden');
                }
            });

            $('.fm-voucher-button').rebind('click.voucherBtnClick', function() {
                var $input = $('.fm-voucher-body input');
                var code = $input.val();

                $input.val('');
                loadingDialog.show();
                $('.fm-voucher-popup').addClass('hidden');

                M.require('redeem_js')
                    .then(function() {
                        return redeem.redeemVoucher(code);
                    })
                    .then(function() {
                        Object(M.account).lastupdate = 0;
                        onIdle(accountUI);
                    })
                    .catch(function(ex) {
                        loadingDialog.hide();
                        if (ex) {
                            if (ex === ETOOMANY) {
                                ex = l.redeem_etoomany;
                            }
                            msgDialog('warninga', l[135], l[47], ex);
                        }
                    });
            });

            $('.fm-purchase-voucher, button.topup').rebind('click', function() {
                loadSubPage('resellers');
            });
        }
    },

    history: {

        renderPurchase: function(account) {

            'use strict';

            var $purchaseSelect = $('.dropdown-input.purchases', accountUI.$contentBlock);

            if (!$.purchaselimit) {
                $.purchaselimit = 10;
            }

            $('span', $purchaseSelect).text(mega.icu.format(l[469], $.purchaselimit));
            $('.purchase10-', $purchaseSelect).text(mega.icu.format(l[469], 10));
            $('.purchase100-', $purchaseSelect).text(mega.icu.format(l[469], 100));
            $('.purchase250-', $purchaseSelect).text(mega.icu.format(l[469], 250));

            M.account.purchases.sort(function(a, b) {
                if (a[1] < b[1]) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.data-table.purchases tr', accountUI.$contentBlock).remove();
            var html = '<tr><th>' + l[476] + '</th><th>' + l[475] +
                '</th><th>' + l[477] + '</th><th>' + l[478] + '</th></tr>';
            if (account.purchases.length) {

                // Render every purchase made into Purchase History on Account page
                $(account.purchases).each(function(index, purchaseTransaction) {

                    if (index === $.purchaselimit) {
                        return false;// Break the loop
                    }

                    // Set payment method
                    const paymentMethodId = purchaseTransaction[4];
                    const paymentMethod = pro.getPaymentGatewayName(paymentMethodId).displayName;

                    // Set Date/Time, Item (plan purchased), Amount, Payment Method
                    const dateTime = time2date(purchaseTransaction[1]);
                    const price = formatCurrency(purchaseTransaction[2], 'EUR', 'narrowSymbol');
                    const proNum = purchaseTransaction[5];
                    let planIcon;
                    const numOfMonths = purchaseTransaction[6];
                    const monthWording = numOfMonths === 1 ? l[931] : l[6788];
                    const item = `${pro.getProPlanName(proNum)} (${numOfMonths} ${monthWording})`;

                    if (proNum === 4) {
                        planIcon = 'lite';
                    }
                    else if (proNum === 100) {
                        planIcon = 'business';
                    }
                    else {
                        planIcon = 'pro-' + proNum;
                    }

                    // Render table row
                    html += '<tr>'
                        + '<td><div class="label-with-icon">'
                        + '<i class="sprite-fm-uni icon-crest-' + planIcon + '"></i>'
                        + '<span> ' + item + '</span>'
                        + '</div></td>'
                        + '<td><span>' + dateTime + '</span></td>'
                        + '<td><span>' + escapeHTML(price) + '</span></td>'
                        + '<td><span>' + paymentMethod + '</span></td>'
                        + '</tr>';
                });
            }
            else {
                html += '<tr><td colspan="4" class="data-table-empty"><span>' + l[20140] + '</span></td></tr>';
            }

            $('.data-table.purchases', accountUI.$contentBlock).safeHTML(html);
        },

        renderTransaction: function(account) {

            'use strict';

            var $transactionSelect = $('.dropdown-input.transactions', accountUI.$contentBlock);

            if (!$.transactionlimit) {
                $.transactionlimit = 10;
            }

            $('span', $transactionSelect).text(mega.icu.format(l[471], $.transactionlimit));
            $('.transaction10-', $transactionSelect).text(mega.icu.format(l[471], 10));
            $('.transaction100-', $transactionSelect).text(mega.icu.format(l[471], 100));
            $('.transaction250-', $transactionSelect).text(mega.icu.format(l[471], 250));

            M.account.transactions.sort(function(a, b) {
                if (a[1] < b[1]) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.data-table.transactions tr', accountUI.$contentBlock).remove();
            var html = '<tr><th>' + l[475] + '</th><th>' + l[484] +
                '</th><th>' + l[485] + '</th><th>' + l[486] + '</th></tr>';
            if (account.transactions.length) {
                var intl = mega.intl.number;
                $(account.transactions).each(function(i, el) {

                    if (i === $.transactionlimit) {
                        return false;
                    }

                    var credit = '';
                    var debit = '';

                    if (el[2] > 0) {
                        credit = '<span class="green-label">&euro;' + escapeHTML(intl.format(el[2])) + '</span>';
                    }
                    else {
                        debit = '<span class="red-label">&euro;' + escapeHTML(intl.format(el[2])) + '</span>';
                    }
                    html += '<tr><td>' + time2date(el[1]) + '</td><td>' + htmlentities(el[0]) + '</td><td>'
                        + credit + '</td><td>' + debit + '</td></tr>';
                });
            }
            else {
                html += '<tr><td colspan="4" class="data-table-empty">' + l[20140] + '</td></tr>';
            }

            $('.data-table.transactions', accountUI.$contentBlock).safeHTML(html);
        },

        bindEvents: function() {

            'use strict';

            var $planSection = $('.fm-account-plan', accountUI.$contentBlock);
            var $planSelects = $('.dropdown-input', $planSection);

            // Bind Dropdowns events
            bindDropdownEvents($planSelects);

            $('.mega-input-dropdown .option', $planSection).rebind('click.accountSection', function() {

                var c = $(this).attr('class') ? $(this).attr('class') : '';

                if (c.indexOf('purchase10-') > -1) {
                    $.purchaselimit = 10;
                }
                else if (c.indexOf('purchase100-') > -1) {
                    $.purchaselimit = 100;
                }
                else if (c.indexOf('purchase250-') > -1) {
                    $.purchaselimit = 250;
                }

                if (c.indexOf('transaction10-') > -1) {
                    $.transactionlimit = 10;
                }
                else if (c.indexOf('transaction100-') > -1) {
                    $.transactionlimit = 100;
                }
                else if (c.indexOf('transaction250-') > -1) {
                    $.transactionlimit = 250;
                }

                accountUI();
            });
        }
    }
};

accountUI.notifications = {

    init: function() {

        'use strict';

        this.render();
    },

    render: function() {

        'use strict';

        // Ensure the loading dialog stays open till enotif is finished.
        loadingDialog.show('enotif');

        // New setting need to force cloud and contacts notification available.
        if (!mega.notif.has('enabled', 'cloud')) {
            mega.notif.set('enabled', 'cloud');
        }

        if (!mega.notif.has('enabled', 'contacts')) {
            mega.notif.set('enabled', 'contacts');
        }

        // Handle account notification switches
        var $notifictionContent = $('.fm-account-notifications', accountUI.$contentBlock);
        var $NToggleAll = $('.account-notification .mega-switch.toggle-all', $notifictionContent);
        var $NToggle = $('.account-notification .switch-container .mega-switch', $notifictionContent);

        // Toggle Individual Notifications
        $NToggle.each(function() {
            var $this = $(this);
            var $section = $this.closest('.switch-container');
            var sectionName = accountUI.notifications.getSectionName($section);

            accountUI.inputs.switch.init(
                '#' + this.id,
                $section,
                mega.notif.has($this.attr('name'), sectionName),
                function(val) {

                    var notifChange = val ? mega.notif.set : mega.notif.unset;
                    notifChange($this.attr('name'), sectionName);

                    if (val) {
                        $NToggleAll.addClass('toggle-on');
                    } else {
                        ($NToggle.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                            .apply($NToggleAll, ['toggle-on']);
                    }
                    $NToggleAll.trigger('update.accessibility');
                });
        });

        // Toggle All Notifications
        accountUI.inputs.switch.init(
            '#' + $NToggleAll[0].id,
            $NToggleAll.parent(),
            $NToggle.hasClass('toggle-on'),
            function(val) {
                $NToggle.each(function() {
                    var $this = $(this);
                    var $section = $this.closest('.switch-container');
                    var sectionName = accountUI.notifications.getSectionName($section);
                    var notifChange = val ? mega.notif.set : mega.notif.unset;
                    notifChange($this.attr('name'), sectionName);

                    (val ? $.fn.addClass : $.fn.removeClass).apply($this, ['toggle-on']);
                    $this.trigger('update.accessibility');
                });
            }
        );

        // Hide achievements toggle if achievements not an option for this user.
        if (!M.account.maf) {
            $('#enotif-achievements').closest('.switch-container').remove();
        }

        // Handle email notification switches.
        var $EToggleAll = $('.email-notification .mega-switch.toggle-all', $notifictionContent);
        var $EToggle = $('.email-notification .switch-container .mega-switch', $notifictionContent);

        mega.enotif.all().then(function(enotifStates) {
            // Toggle Individual Emails
            $EToggle.each(function() {
                var $this = $(this);
                var $section = $this.closest('.switch-container');
                var emailId = $this.attr('name');

                accountUI.inputs.switch.init(
                    '#' + this.id,
                    $section,
                    !enotifStates[emailId],
                    function(val) {
                        mega.enotif.setState(emailId, !val);
                        (val || $EToggle.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                            .apply($EToggleAll, ['toggle-on']);
                        $EToggleAll.trigger('update.accessibility');
                    }
                );
            });

            // All Email Notifications Switch
            accountUI.inputs.switch.init(
                '#' + $EToggleAll[0].id,
                $EToggleAll.closest('.settings-sub-section'),
                $EToggle.hasClass('toggle-on'),
                function(val) {
                    mega.enotif.setAllState(!val);
                    (val ? $.fn.addClass : $.fn.removeClass).apply($EToggle, ['toggle-on']);
                    $EToggle.trigger('update.accessibility');
                }
            );

            if (accountUI.plan.paymentCard.validateUser(M.account)) {
                $('.switch-container.card-exp-switch', $notifictionContent).removeClass('hidden');
            }

            // Hide the loading screen.
            loadingDialog.hide('enotif');
        });
    },

    getSectionName: function($section) {

        'use strict';

        var section = String($section.attr('class')).split(" ").filter(function(c) {
            return ({
                'chat': 1,
                'contacts': 1,
                'cloud-drive': 1
            })[c];
        });
        return String(section).split('-').shift();

    }
};

accountUI.security = {

    init: function() {

        "use strict";

        // Change Password
        accountChangePassword.init();

        // Change Email
        if (!u_attr.b || u_attr.b.m) {
            $('.fm-account-security.fm-account-sections .data-block.change-email').removeClass('hidden');
            $('.content-panel.account .acc-setting-menu-change-em').removeClass('hidden');

            accountChangeEmail.init();
        }
        else {
            $('.fm-account-security.fm-account-sections .data-block.change-email').addClass('hidden');
            $('.content-panel.account .acc-setting-menu-change-em').addClass('hidden');
        }

        // Recovery Key
        this.recoveryKey.bindEvents();

        // Metadata
        this.metadata.render();

        // Session
        this.session.render();
        this.session.bindEvents();

        // 2fa
        twofactor.account.init();
    },

    recoveryKey: {

        bindEvents: function() {

            'use strict';

            // Button on main Account page to backup their master key
            $('.fm-account-security .backup-master-key').rebind('click', function() {
                M.showRecoveryKeyDialog(2);
            });
        }
    },

    metadata: {

        render: function() {

            'use strict';

            accountUI.inputs.switch.init(
                '.dbDropOnLogout',
                $('.personal-data-container'),
                fmconfig.dbDropOnLogout,
                function(val) {
                    mega.config.setn('dbDropOnLogout', val);
                });

            // Initialise the Download personal data button on the /fm/account/security page
            gdprDownload.initDownloadDataButton('personal-data-container');
        }
    },

    session: {

        /**
         * Rendering session history table.
         * With session data from M.account.sessions, render table for session history
         */
        render: function() {

            "use strict";

            var $securitySection = $('.fm-account-security', accountUI.$contentBlock);
            var $sessionSelect = $('.dropdown-input.sessions', $securitySection);

            if (d) {
                console.log('Render session history');
            }

            if (!$.sessionlimit) {
                $.sessionlimit = 10;
            }

            $('span', $sessionSelect).text(mega.icu.format(l[472], $.sessionlimit));
            $('.session10-', $sessionSelect).text(mega.icu.format(l[472], 10));
            $('.session100-', $sessionSelect).text(mega.icu.format(l[472], 100));
            $('.session250-', $sessionSelect).text(mega.icu.format(l[472], 250));

            M.account.sessions.sort(function(a, b) {
                if (a[7] !== b[7]) {
                    return a[7] > b[7] ? -1 : 1;
                }
                if (a[5] !== b[5]) {
                    return a[5] > b[5] ? -1 : 1;
                }
                return a[0] < b[0] ? 1 : -1;
            });

            $('#sessions-table-container', $securitySection).empty();
            var html =
                '<table width="100%" border="0" cellspacing="0" cellpadding="0" class="data-table sessions">' +
                '<tr><th>' + l[19303] + '</th><th>' + l[480] + '</th><th>' + l[481] + '</th><th>' + l[482] + '</th>' +
                '<th class="no-border session-status">' + l[7664] + '</th>' +
                '<th class="no-border logout-column">&nbsp;</th></tr>';
            var numActiveSessions = 0;

            for (i = 0; i < M.account.sessions.length; i++) {
                var session = M.account.sessions[i];

                var currentSession = session[5];
                var activeSession = session[7];

                // If the current session or active then increment count
                if (currentSession || activeSession) {
                    numActiveSessions++;
                }

                if (i >= $.sessionlimit) {
                    continue;
                }

                html += this.getHtml(session);
            }

            $('#sessions-table-container', $securitySection).safeHTML(html + '</table>');

            // Don't show button to close other sessions if there's only the current session
            if (numActiveSessions === 1) {
                $('.fm-close-all-sessions', $securitySection).addClass('hidden');
            }
            else {
                $('.fm-close-all-sessions', $securitySection).removeClass('hidden');
            }
        },

        bindEvents: function() {

            'use strict';

            var $securitySection = $('.fm-account-security', accountUI.$contentBlock);
            var $sessionSelect = $('.dropdown-input.sessions', $securitySection);

            // Bind Dropdowns events
            bindDropdownEvents($sessionSelect);

            $('.fm-close-all-sessions', $securitySection).rebind('click.accountSection', function() {
                msgDialog('confirmation', '', l[18513], false, function(e) {
                    if (e) {
                        loadingDialog.show();
                        var $activeSessionsRows = $('.active-session-txt', $securitySection).parents('tr');
                        // Expire all sessions but not the current one
                        api_req({a: 'usr', ko: 1}, {
                            callback: function() {
                                M.account = null;
                                /* clear account cache */
                                $('.settings-logout', $activeSessionsRows).remove();
                                $('.active-session-txt', $activeSessionsRows)
                                    .removeClass('active-session-txt').addClass('expired-session-txt').text(l[25016]);
                                $('.fm-close-all-sessions', $securitySection).addClass('hidden');
                                loadingDialog.hide();
                            }
                        });
                    }
                });
            });

            $('.settings-logout', $securitySection).rebind('click.accountSection', function() {

                var $this = $(this).parents('tr');
                var sessionId = $this.attr('class');

                if (sessionId === 'current') {
                    mLogout();
                }
                else {
                    loadingDialog.show();
                    /* usr - user session remove
                     * remove a session Id from the current user,
                     * usually other than the current session
                     */
                    api_req({a: 'usr', s: [sessionId]}, {
                        callback: function() {
                            M.account = null;
                            /* clear account cache */
                            $this.find('.settings-logout').remove();
                            $this.find('.active-session-txt').removeClass('active-session-txt')
                                .addClass('expired-session-txt').text(l[25016]);
                            loadingDialog.hide();
                        }
                    });
                }
            });

            $('.mega-input-dropdown .option', $securitySection).rebind('click.accountSection', function() {

                var c = $(this).attr('class') ? $(this).attr('class') : '';

                if (c.indexOf('session10-') > -1) {
                    $.sessionlimit = 10;
                }
                else if (c.indexOf('session100-') > -1) {
                    $.sessionlimit = 100;
                }
                else if (c.indexOf('session250-') > -1) {
                    $.sessionlimit = 250;
                }

                accountUI();
            });
        },

        /**
         * Get html of one session data for session history table.
         * @param {Object} el a session data from M.account.sessions
         * @return {String} html
         * When draw session hitory table make html for each session data
         */
        getHtml: function(el) {

            "use strict";

            var currentSession = el[5];
            var activeSession = el[7];
            var userAgent = el[2];
            var dateTime = htmlentities(time2date(el[0]));
            var browser = browserdetails(userAgent);
            var browserName = browser.nameTrans;
            var ipAddress = htmlentities(el[3]);
            var country = countrydetails(el[4]);
            var sessionId = el[6];
            var status = '<span class="status-label green">' + l[7665] + '</span>';    // Current

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            if (browser.isExtension) {
                browserName += ' (+' + l[7683] + ')';
            }

            // If not the current session
            if (!currentSession) {
                if (activeSession) {
                    status = '<span class="status-label blue">' + l[23754] + '</span>';     // Logged-in
                }
                else {
                    status = '<span class="status-label">' + l[25016] + '</span>';    // Expired
                }
            }

            // If unknown country code use question mark png
            if (!country.icon || country.icon === '??.png') {
                country.icon = 'ud.png';
            }

            // Generate row html
            var html = '<tr class="' + (currentSession ? "current" : sessionId) + '">'
                + '<td><div class="label-with-icon"><img title="'
                + escapeHTML(userAgent.replace(/\s*megext/i, ''))
                + '" src="' + staticpath + 'images/browser-icons/' + browser.icon
                + '" /><span title="' + htmlentities(browserName) + '">' + htmlentities(browserName)
                + '</span></div></td>'
                + '<td><span class="break-word" title="' + ipAddress + '">' + ipAddress + '</span></td>'
                + '<td><div class="label-with-icon"><img alt="" src="' + staticpath + 'images/flags/'
                + country.icon + '" title="' + htmlentities(country.name) + '" /><span>'
                + htmlentities(country.name) + '</span></div></td>'
                + '<td><span>' + dateTime + '</span></td>'
                + '<td>' + status + '</td>';

            // If the session is active show logout button
            if (activeSession) {
                html += '<td>'
                    + '<button class="mega-button small top-login-button settings-logout">'
                    + '<div><i class="sprite-fm-mono icon-logout"></i></div><span>' + l[967] + '</span>'
                    + '</button></td></tr>';
            }
            else {
                html += '<td>&nbsp;</td></tr>';
            }

            return html;
        },

        /**
         * Update Session History table html.
         * If there is any new session history found (or forced), re-render session history table.
         * @param {Boolean} force force update the table.
         */
        update: function(force) {

            "use strict";

            if (page === 'fm/account/security') {
                // if first item in sessions list is not match existing Dom list, it need update.
                if (d) {
                    console.log('Updating session history table');
                }

                M.refreshSessionList(function() {
                    var fSession = M.account.sessions[0];
                    var domList =  document.querySelectorAll('.data-table.sessions tr');

                    // update table when it has new active session or forced
                    if (fSession && (($(domList[1]).hasClass('current') && !fSession[5])
                        || !$(domList[1]).hasClass(fSession[6])) || force) {
                        if (d) {
                            console.log('Update session history table');
                        }
                        accountUI.security.session.render();
                        accountUI.security.session.bindEvents();
                    }
                });
            }
        }
    }
};

accountUI.fileManagement = {

    init: function(account) {

        'use strict';

        // File versioning
        this.versioning.render();
        this.versioning.bindEvents();

        // Rubbish cleaning schedule
        this.rubsched.render(account);
        this.rubsched.bindEvents(account);

        // User Interface
        this.userInterface.render();

        // Drag and Drop
        this.dragAndDrop.render();

        // Public Links
        this.publicLinks.render();
    },

    versioning: {

        render: function() {

            'use strict';

            // Update versioning info
            var setVersioningAttr = function(val) {
                showToast('settings', l[16168]);
                val = val === 1 ? 0 : 1;
                mega.attr.set('dv', val, -2, true).done(function() {
                    fileversioning.dvState = val;
                });
            };

            fileversioning.updateVersionInfo();

            accountUI.inputs.switch.init(
                '#versioning-status',
                $('#versioning-status', accountUI.$contentBlock).parent(),
                !fileversioning.dvState,
                setVersioningAttr,
                function(val) {

                    var promise = new MegaPromise();

                    if (val) {
                        msgDialog('confirmation', l[882], l[17595], false, function(e) {

                            if (e) {
                                promise.resolve();
                            }
                            else {
                                promise.reject();
                            }
                        });
                    }
                    else {
                        promise.resolve();
                    }
                    return promise;
                });
        },

        bindEvents: function() {

            'use strict';

            $('#delete-all-versions', accountUI.$contentBlock).rebind('click', function() {

                if (!$(this).hasClass('disabled')) {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    msgDialog('remove', l[1003], l[17581], l[1007], function(e) {

                        if (e) {
                            loadingDialog.show();
                            var req = {a: 'dv'};
                            api_req(req, {
                                callback: function(res) {
                                    if (res === 0) {
                                        M.accountData(function() {
                                            fileversioning.updateVersionInfo();
                                        }, false, true);
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }
    },

    rubsched: {

        render: function(account) {

            'use strict';

            if (d) {
                console.log('Render rubbish bin schedule');
            }

            var $rubschedParent = $('#rubsched', accountUI.$contentBlock).parent();
            var $rubschedGreenNoti = $('.rub-grn-noti', accountUI.$contentBlock);
            var $rubschedOptions = $('.rubsched-options', accountUI.$contentBlock);

            var initRubschedSwitch = function(defaultValue) {
                accountUI.inputs.switch.init(
                    '#rubsched',
                    $('#rubsched', accountUI.$contentBlock).parent(),
                    defaultValue,
                    function(val) {
                        if (val) {
                            $('#rubsched', accountUI.$contentBlock).closest('.slide-in-out').removeClass('closed');
                            $rubschedParent.addClass('border');

                            if (!fmconfig.rubsched) {
                                var defValue = u_attr.p ? 90 : 30;
                                var defOption = 14;
                                mega.config.setn('rubsched', defOption + ":" + defValue);
                                $('#rad' + defOption + '_opt', accountUI.$contentBlock).val(defValue);
                            }
                        }
                        else {
                            mega.config.setn('rubsched', 0);
                            $('#rubsched', accountUI.$contentBlock).closest('.slide-in-out').addClass('closed');
                            $rubschedParent.removeClass('border');
                        }
                    });
            };

            if (u_attr.flags.ssrs > 0) { // Server side scheduler - new
                $rubschedOptions.removeClass('hidden');
                $('.rubschedopt', accountUI.$contentBlock).addClass('hidden');
                $('.rubschedopt-none', accountUI.$contentBlock).addClass('hidden');

                var value = account.ssrs ? account.ssrs : (u_attr.p ? 90 : 30);

                var rad14_optString = mega.icu.format(l.clear_rub_bin_days, value);
                var rad14_optArray = rad14_optString.split(/\[A]|\[\/A]/);

                $('#rad14_opt', accountUI.$contentBlock).val(rad14_optArray[1]);
                $('#rad14_opt_txt_1', accountUI.$contentBlock).text(rad14_optArray[0]);
                $('#rad14_opt_txt_2', accountUI.$contentBlock).text(rad14_optArray[2]);

                if (!value) {
                    $rubschedOptions.addClass('hidden');
                }

                // show/hide on/off switches
                if (u_attr.p) {
                    $rubschedParent.removeClass('hidden');
                    $rubschedGreenNoti.addClass('hidden');
                    $('.rubbish-desc', accountUI.$contentBlock).text(l[18685]).removeClass('hidden');
                    $('.account.rubbish-cleaning .settings-right-block', accountUI.$contentBlock)
                        .addClass('slide-in-out');

                    if (account.ssrs) {
                        $rubschedParent.addClass('border').parent().removeClass('closed');
                    }
                    else {
                        $rubschedParent.removeClass('border').parent().addClass('closed');
                    }

                    initRubschedSwitch(account.ssrs);
                }
                else {
                    $rubschedParent.addClass('hidden');
                    $rubschedGreenNoti.removeClass('hidden');
                    $('.rubbish-desc', accountUI.$contentBlock).text(l[18686]).removeClass('hidden');
                    $('.account.rubbish-cleaning .settings-right-block', accountUI.$contentBlock)
                        .removeClass('slide-in-out');
                }
            }
            else { // Client side scheduler - old
                initRubschedSwitch(fmconfig.rubsched);

                if (u_attr.p) {
                    $rubschedGreenNoti.addClass('hidden');
                }
                else {
                    $rubschedGreenNoti.removeClass('hidden');
                }

                if (fmconfig.rubsched) {
                    $rubschedParent.addClass('border').parent().removeClass('closed');
                    $rubschedOptions.removeClass('hidden');
                    $('.rubschedopt', accountUI.$contentBlock).removeClass('hidden');

                    var opt = String(fmconfig.rubsched).split(':');
                    $('#rad' + opt[0] + '_opt', accountUI.$contentBlock).val(opt[1]);

                    accountUI.inputs.radio.init(
                        '.rubschedopt',
                        $('.rubschedopt', accountUI.$contentBlock).parent(),
                        opt[0],
                        function (val) {
                            mega.config.setn('rubsched', val + ":" + $('#rad' + val + '_opt').val());
                        }
                    );
                }
                else {
                    $rubschedParent.removeClass('border').parent().addClass('closed');
                }
            }
        },
        bindEvents: function() {

            'use strict';

            $('.rubsched_textopt', accountUI.$contentBlock).rebind('click.rs blur.rs keypress.rs', function(e) {

                // Do not save value until user leave input or click Enter button
                if (e.which && e.which !== 13) {
                    return;
                }

                var curVal = parseInt($(this).val()) | 0;
                var maxVal;

                if (this.id === 'rad14_opt') { // For days option
                    var minVal = 7;
                    maxVal = u_attr.p ? Math.pow(2, 53) : 30;
                    curVal = Math.min(Math.max(curVal, minVal), maxVal);
                    var rad14_optString = mega.icu.format(l.clear_rub_bin_days, curVal);
                    var rad14_optArray = rad14_optString.split(/\[A]|\[\/A]/);
                    curVal = rad14_optArray[1];
                    $('#rad14_opt_txt_1', accountUI.$contentBlock).text(rad14_optArray[0]);
                    $('#rad14_opt_txt_2', accountUI.$contentBlock).text(rad14_optArray[2]);
                }

                if (this.id === 'rad15_opt') { // For size option
                    // Max value cannot be over current account's total storage space.
                    maxVal = account.space / Math.pow(1024, 3);
                    curVal = Math.min(curVal, maxVal);
                }

                $(this).val(curVal);

                var id = String(this.id).split('_')[0];
                mega.config.setn('rubsched', id.substr(3) + ':' + curVal);
            });
        }
    },

    userInterface: {

        _initOption: function(name) {
            'use strict';
            var selector = '.' + name;

            accountUI.inputs.radio.init(selector, $(selector).parent(), fmconfig[name] | 0,
                function(val) {
                    mega.config.setn(name, parseInt(val) | 0, l[16168]);
                }
            );
        },

        render: function() {
            'use strict';

            this._initOption('uisorting');
            this._initOption('uiviewmode');
        }
    },

    dragAndDrop: {

        render: function() {
            'use strict';

            accountUI.inputs.switch.init(
                '#ulddd',
                $('#ulddd', accountUI.$contentBlock).parent(),
                !mega.config.get('ulddd'),
                function(val) {
                    mega.config.setn('ulddd', val ? undefined : 1);
                });
        }
    },

    publicLinks: {
        render: function() {
            'use strict';

            var warnplinkId = '#nowarnpl';

            accountUI.inputs.switch.init(
                warnplinkId,
                $(warnplinkId, accountUI.$contentBlock).parent(),
                mega.config.get('nowarnpl'),
                (val) => {
                    mega.config.setn('nowarnpl', val);
                });
        }
    },
};

accountUI.transfers = {

    init: function(account) {

        'use strict';

        this.$page = $('.fm-account-sections.fm-account-transfers', accountUI.$contentBlock);

        // Upload and Download - Bandwidth
        this.uploadAndDownload.bandwidth.render(account);

        // Upload and Download - Upload
        this.uploadAndDownload.upload.render();

        // Upload and Download - Download
        this.uploadAndDownload.download.render();

        // Transfer Tools - Megasync
        this.transferTools.megasync.render();

        // MEGAdrop folders table
        mega.megadrop.stngsDraw();

        // Download folder setting for PaleMoon ext
        this.addDownloadFolderSetting();
    },

    uploadAndDownload: {

        bandwidth: {

            render: function(account) {

                'use strict';

                // LITE/PRO account
                if (u_attr.p && !u_attr.b) {
                    var bandwidthLimit = Math.round(account.servbw_limit | 0);

                    var $slider = $('#bandwidth-slider').slider({
                        min: 0, max: 100, range: 'min', value: bandwidthLimit,
                        change: function(e, ui) {
                            if (M.currentdirid === 'account/transfers') {
                                bandwidthLimit = ui.value;

                                if (parseInt($.bandwidthLimit) !== bandwidthLimit) {

                                    var done = delay.bind(null, 'bandwidthLimit', function() {
                                        api_req({"a": "up", "srvratio": Math.round(bandwidthLimit)});
                                        if ($.bandwidthLimit !== undefined) {
                                            showToast('settings', l[16168]);
                                        }
                                        $.bandwidthLimit = bandwidthLimit;
                                    }, 700);

                                    if (bandwidthLimit > 99) {
                                        msgDialog('warningb:!' + l[776], l[882], l[12689], 0, function(e) {
                                            if (e) {
                                                done();
                                            }
                                            else {
                                                $('.slider-percentage span').text('0 %').removeClass('bold warn');
                                                $('#bandwidth-slider').slider('value', 0);
                                            }
                                        });
                                    }
                                    else {
                                        done();
                                    }
                                }
                            }
                        },
                        slide: function(e, ui) {
                            $('.slider-percentage span', accountUI.$contentBlock).text(ui.value + ' %');

                            if (ui.value > 90) {
                                $('.slider-percentage span', accountUI.$contentBlock).addClass('warn bold');
                            }
                            else {
                                $('.slider-percentage span', accountUI.$contentBlock).removeClass('bold warn');
                            }
                        }
                    });

                    $('.ui-slider-handle', $slider).addClass('sprite-fm-mono icon-arrow-left ' +
                        'sprite-fm-mono-after icon-arrow-right-after');

                    $('.slider-percentage span', accountUI.$contentBlock).text(bandwidthLimit + ' %');
                    $('.bandwith-settings', accountUI.$contentBlock).removeClass('disabled').addClass('border');
                    $('.slider-percentage-bl', accountUI.$contentBlock).removeClass('hidden');
                    $('.band-grn-noti', accountUI.$contentBlock).addClass('hidden');
                }
                // Business account
                else if (u_attr.b) {
                    $('.bandwith-settings', accountUI.$contentBlock).addClass('hidden');
                    $('.slider-percentage-bl', accountUI.$contentBlock).addClass('hidden');
                    $('.band-grn-noti', accountUI.$contentBlock).addClass('hidden');
                }
            }
        },

        upload: {

            render: function() {

                'use strict';

                var $uploadSettings = $('.upload-settings', accountUI.$contentBlock);

                // Parallel upload slider
                var $slider = $('#slider-range-max', $uploadSettings).slider({
                    min: 1, max: 6, range: "min", value: fmconfig.ul_maxSlots || 4,
                    change: function(e, ui) {
                        if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.ul_maxSlots) {
                            mega.config.setn('ul_maxSlots', ui.value);
                            ulQueue.setSize(fmconfig.ul_maxSlots);
                        }
                    },
                    slide: function(e, ui) {
                        $('.numbers.active', $uploadSettings).removeClass('active');
                        $('.numbers:nth-child(' + ui.value + ')', $uploadSettings)
                            .addClass('active');
                    }
                });

                $('.ui-slider-handle', $slider).addClass('sprite-fm-mono icon-arrow-left ' +
                    'sprite-fm-mono-after icon-arrow-right-after');

                $('.numbers.active', $uploadSettings).removeClass('active');
                $(' .numbers:nth-child(' + $slider.slider('value') + ')', $uploadSettings)
                    .addClass('active');
            },
        },

        download: {

            render: function() {

                'use strict';

                var $downloadSettings = $('.download-settings', accountUI.$contentBlock);

                // Parallel download slider
                var $slider = $('#slider-range-max2', $downloadSettings).slider({
                    min: 1, max: 6, range: "min", value: fmconfig.dl_maxSlots || 4,
                    change: function(e, ui) {
                        if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.dl_maxSlots) {
                            mega.config.setn('dl_maxSlots', ui.value);
                            dlQueue.setSize(fmconfig.dl_maxSlots);
                        }
                    },
                    slide: function(e, ui) {
                        $('.numbers.active', $downloadSettings).removeClass('active');
                        $('.numbers:nth-child(' + ui.value + ')', $downloadSettings)
                            .addClass('active');
                    }
                });

                $('.ui-slider-handle', $slider).addClass('sprite-fm-mono icon-arrow-left ' +
                    'sprite-fm-mono-after icon-arrow-right-after');

                $('.numbers.active', $downloadSettings).removeClass('active');
                $('.numbers:nth-child(' + $slider.slider('value') + ')', $downloadSettings)
                    .addClass('active');
            }
        }
    },

    transferTools: {

        megasync: {

            render : function() {

                'use strict';

                var $section = $('.transfer-tools', accountUI.transfers.$page);

                accountUI.inputs.switch.init(
                    '#dlThroughMEGAsync',
                    $('#dlThroughMEGAsync', accountUI.$contentBlock).parent(),
                    fmconfig.dlThroughMEGAsync,
                    function(val) {
                        mega.config.setn('dlThroughMEGAsync', val);
                        if (val) {
                            megasync.periodicCheck();
                        }
                        else {
                            window.useMegaSync = 4;
                        }
                    });

                megasync.isInstalled((err, is) => {

                    if (!err && is) {
                        $('.mega-banner', $section).addClass('hidden');
                    }
                    else {
                        $('.mega-banner', $section).removeClass('hidden');
                    }
                });
            }
        }
    },

    addDownloadFolderSetting: function() {

        'use strict';

        if (is_chrome_firefox && !$('#acc_dls_folder', accountUI.$contentBlock).length) {
            $('.fm-account-transfers').safeAppend(
                '<div class="account data-block">' +
                '<div class="settings-left-block">' +
                '<div id="acc_dls_folder">' +
                '<div class="fm-account-header">Downloads folder:</div></div></div>' +
                '<div class="settings-right-block"><div class="settings-sub-section">' +
                '<input type="button" value="Browse..." style="-moz-appearance:' +
                'button;margin-right:12px;cursor:pointer" />' +
                '</div></div></div>');
            var fld = mozGetDownloadsFolder();
            $('#acc_dls_folder', accountUI.$contentBlock).safeAppend($('<span/>').text(fld && fld.path));
            $('#acc_dls_folder input', accountUI.$contentBlock).click(function() {

                var fs = mozFilePicker(0, 2);
                if (fs) {
                    mozSetDownloadsFolder(fs);
                    $(this).next().text(fs.path);
                }
            });
        }
    }
};

accountUI.contactAndChat = {

    init: function(autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen) {
        'use strict';
        if (window.megaChatIsDisabled) {
            console.error('Mega Chat is disabled, cannot proceed to Contact and Chat settings');
            return;
        }

        var self = this;

        if (!megaChatIsReady) {
            // If chat is not ready waiting for chat_initialized broadcaster.
            loadingDialog.show();
            var args = toArray.apply(null, arguments);
            mBroadcaster.once('chat_initialized', function() {
                self.init.apply(self, args);
            });
            return true;
        }
        loadingDialog.hide();

        var presenceInt = megaChat.plugins.presencedIntegration;

        if (!presenceInt || !presenceInt.userPresence) {
            setTimeout(function() {
                throw new Error('presenceInt is not ready...');
            });
            return true;
        }

        presenceInt.rebind('settingsUIUpdated.settings', function() {
            self.init.apply(self, toArray.apply(null, arguments).slice(1));
        });

        // Only call this if the call of this function is the first one, made by fm.js -> accountUI
        if (autoaway === undefined) {
            presenceInt.userPresence.updateui();
            return true;
        }

        this.status.render(presenceInt, autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen);
        this.status.bindEvents(presenceInt, autoawaytimeout);
        this.richURL.render();
        this.dnd.render();
    },

    status: {

        render: function(presenceInt, autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen) {

            'use strict';

            // Chat
            var $sectionContainerChat = $('.fm-account-contact-chats', accountUI.$contentBlock);
            // Status appearance radio buttons
            accountUI.inputs.radio.init(
                '.chatstatus',
                $('.chatstatus').parent(),
                presenceInt.getPresence(u_handle),
                function(newVal) {
                    presenceInt.setPresence(parseInt(newVal));
                    showToast('settings', l[16168]);
                });

            // Last seen switch
            accountUI.inputs.switch.init(
                '#last-seen',
                $sectionContainerChat,
                lastSeen,
                function(val) {
                    presenceInt.userPresence.ui_enableLastSeen(Boolean(val));
                    showToast('settings', l[16168]);
                });

            if (autoawaytimeout !== false) {
                // Auto-away switch
                accountUI.inputs.switch.init(
                    '#auto-away-switch',
                    $sectionContainerChat,
                    autoaway,
                    function(val) {
                        presenceInt.userPresence.ui_setautoaway(Boolean(val));
                        showToast('settings', l[16168]);
                    });

                // Prevent changes to autoaway if autoawaylock is set
                if (autoawaylock === true) {
                    $('#auto-away-switch', $sectionContainerChat).addClass('diabled')
                        .parent().addClass('hidden');
                }
                else {
                    $('#auto-away-switch', $sectionContainerChat).removeClass('diabled')
                        .parent().removeClass('hidden');
                }

                // Auto-away input box
                var autoAwayString = mega.icu.format(l[20206], autoawaytimeout / 60);
                var autoAwayArray = autoAwayString.split(/\[A]|\[\/A]/);

                $('#autoaway_txt_1', $sectionContainerChat).text(autoAwayArray[0]);
                $('input#autoaway', $sectionContainerChat).val(autoAwayArray[1]);
                $('#autoaway_txt_2', $sectionContainerChat).text(autoAwayArray[2]);

                // Always editable for user comfort -
                accountUI.controls.enableElement($('input#autoaway', $sectionContainerChat));

                // Persist switch
                accountUI.inputs.switch.init(
                    '#persist-presence-switch',
                    $sectionContainerChat,
                    persist,
                    function(val) {
                        presenceInt.userPresence.ui_setpersist(Boolean(val));
                        showToast('settings', l[16168]);
                    });

                // Prevent changes to autoaway if autoawaylock is set
                if (persistlock === true) {
                    $('#persist-presence-switch', $sectionContainerChat).addClass('diabled')
                        .parent().addClass('hidden');
                }
                else {
                    $('#persist-presence-switch', $sectionContainerChat).removeClass('diabled')
                        .parent().removeClass('hidden');
                }
            }
        },

        bindEvents: function(presenceInt, autoawaytimeout) {

            'use strict';

            if (autoawaytimeout !== false) {
                var $sectionContainerChat = $('.fm-account-contact-chats', accountUI.$contentBlock);
                var lastValidNumber = Math.floor(autoawaytimeout / 60);

                // when value is changed, set checkmark
                $('input#autoaway', $sectionContainerChat).rebind('change.dashboard', function() {

                    var val = parseInt($(this).val());

                    if (val > 3505) {
                        val = 3505;
                    }
                    else if (val < 0) {
                        val = 5;
                    }

                    if (val > 0) {
                        presenceInt.userPresence.ui_setautoaway(true, val * 60);
                        lastValidNumber = val;
                    }
                }).rebind('blur.dashboard', function() {

                    // the goal of the following line is to reset the value of the field if the entered data is invalid
                    // after the user removes focus from it (and set the internally set value)
                    $(this).val(presenceInt.userPresence.autoawaytimeout / 60);
                }).val(lastValidNumber);
            }
        }
    },

    richURL: {

        render: function() {

            'use strict';

            if (typeof RichpreviewsFilter === 'undefined') {
                return;
            }

            // Auto-away switch
            const { previewGenerationConfirmation, confirmationDoConfirm, confirmationDoNever } = RichpreviewsFilter;
            accountUI.inputs.switch.init(
                '#richpreviews',
                $('#richpreviews').parent(),
                // previewGenerationConfirmation -> -1 (unset, default) || true || false
                previewGenerationConfirmation && previewGenerationConfirmation > 0,
                val => {
                    if (val){
                        confirmationDoConfirm();
                    }
                    else {
                        confirmationDoNever();
                    }
                    showToast('settings', l[16168]);
                }
            );
        }
    },

    dnd: {

        /**
         * Cached references for common DOM elements
         */

        DOM: {
            container: '.fm-account-main',
            toggle: '#push-settings-toggle',
            dialog: '.push-settings-dialog',
            status: '.push-settings-status',
        },

        /**
         * @see PushNotificationSettings.GROUPS
         */

        group: 'CHAT',

        /**
         * hasDnd
         * @description Get the current push notification setting
         * @returns {Boolean}
         */

        hasDnd: function() {
            'use strict';
            return (
                pushNotificationSettings &&
                pushNotificationSettings.getDnd(this.group) ||
                pushNotificationSettings.getDnd(this.group) === 0
            );
        },

        /**
         * getTimeString
         * @description Returns human readable and formatted string based on the
         * current push notification setting (timestamp)
         * @example `Notification will be silent until XX:XX`
         * @returns {String}
         */

        getTimeString: function() {
            'use strict';
            var dnd = pushNotificationSettings.getDnd(this.group);
            if (dnd) {
                return (
                    // `Notifications will be silent until %s`
                    l[23540].replace('%s', '<span>' + escapeHTML(unixtimeToTimeString(dnd)) + '</span>')
                );
            }
            return '&nbsp;';
        },

        /**
         * renderStatus
         * @param hasDnd Boolean the push notification setting status
         * @returns {*}
         */

        renderStatus: function(hasDnd) {
            'use strict';
            var $status = $(this.DOM.status, this.DOM.container);
            return hasDnd ? $status.safeHTML(this.getTimeString()).removeClass('hidden') : $status.addClass('hidden');
        },

        /**
         * setInitialState
         * @description Invoked immediately upon loading the module, sets the initial state -- conditionally
         * sets the toggle state, renders formatted timestamp
         */

        setInitialState: function() {
            'use strict';
            if (this.hasDnd()) {
                var dnd = pushNotificationSettings.getDnd(this.group);
                if (dnd && dnd < unixtime()) {
                    pushNotificationSettings.disableDnd(this.group);
                    return;
                }
                $(this.DOM.toggle, this.DOM.container).addClass('toggle-on').trigger('update.accessibility');
                this.renderStatus(true);
            }
        },

        /**
         * setMorningOption
         * @description Handles the `Until tomorrow morning, 08:00` / `Until this morning, 08:00` option.
         */

        setMorningOption: function() {
            'use strict';
            var container = '.radio-txt.morning-option';
            var $label = $('span', container);
            var $radio = $('input', container);

            // 00:01 ~ 07:59 -> `Until this morning, 08:00`
            // 08:00 ~ 00:00 -> `Until tomorrow morning, 08:00`
            var targetTomorrow = (new Date().getHours()) >= 8;

            var date = new Date();
            // Start of the day -> 08:00
            date.setHours(0, 1, 0, 0);
            date.setHours(date.getHours() + 8);
            if (targetTomorrow) {
                // +1 day if we target `tomorrow morning`
                date.setDate(date.getDate() + 1);
            }
            var difference = Math.abs(date - new Date());
            var minutesUntil = Math.floor(difference / 1000 / 60);

            $label.safeHTML(
                targetTomorrow ? l[23671] || 'Until tomorrow morning, 08:00' : l[23670] || 'Until this morning, 08:00'
            );
            $radio.val(minutesUntil);
        },

        /**
         * handleToggle
         * @description Handles the toggle switch -- conditionally adds or removes the toggle active state,
         * disables or sets the `Until I Turn It On Again` default setting
         * @param ev Object the event object
         */

        handleToggle: function(ev) {
            'use strict';

            var hasDnd = this.hasDnd();
            var group = this.group;

            if (hasDnd) {
                pushNotificationSettings.disableDnd(group);
                this.renderStatus(false);
                $(ev.currentTarget).removeClass('toggle-on').trigger('update.accessibility');
                showToast('settings', l[16168]);
            }
            else {
                this.handleDialogOpen();
            }
        },

        /**
         * handleDialogOpen
         * @description
         * Handles the dialog toggle, incl. attaches additional handler that sets the given setting if any is selected
         */

        handleDialogOpen: function() {
            'use strict';

            var self = this;
            var $dialog = $(this.DOM.dialog);
            var time = unixtime();

            this.setMorningOption();
            M.safeShowDialog('push-settings-dialog', $dialog);

            // Init radio button UI.
            accountUI.inputs.radio.init('.custom-radio', $dialog, '');

            // Bind the `Done` specific event handling
            $('.push-settings-done', $dialog).rebind('click.dndUpdate', function() {
                var $radio = $('input[type="radio"]:checked', $dialog);
                var value = parseInt($radio.val(), 10);

                pushNotificationSettings.setDnd(self.group, value === 0 ? 0 : time + value * 60);
                $(self.DOM.toggle, self.DOM.container).addClass('toggle-on').trigger('update.accessibility');
                closeDialog();
                self.renderStatus(true);
                showToast('settings', l[16168]);
            });
        },

        /**
         * bindEvents
         * @description
         * Bind the initial event handlers, excl. the `Done` found within the dialog
         */

        bindEvents: function() {
            'use strict';
            $(this.DOM.toggle, this.DOM.container).rebind('click.dndToggleSwitch', this.handleToggle.bind(this));
            $('button.js-close, .push-settings-close', this.DOM.dialog).rebind('click.dndDialogClose', closeDialog);
        },

        /**
         * render
         * @description
         * Initial render, invoked upon mounting the module
         */

        render: function() {
            'use strict';
            this.setInitialState();
            this.bindEvents();
        }
    },

    delayRender: function(presenceInt, autoaway) {

        'use strict';

        var self = this;

        if (!megaChatIsReady) {
            if (megaChatIsDisabled) {
                console.error('Mega Chat is disabled, cannot proceed to Contact and Chat settings');
            }
            else {
                // If chat is not ready waiting for chat_initialized broadcaster.
                loadingDialog.show();
                mBroadcaster.once('chat_initialized', self.delayRender.bind(self, presenceInt, autoaway));
            }
            return true;
        }
        loadingDialog.hide();

        if (!presenceInt || !presenceInt.userPresence) {
            setTimeout(function() {
                throw new Error('presenceInt is not ready...');
            });
            return true;
            // ^ FIXME too..!
        }

        // Only call this if the call of this function is the first one, made by fm.js -> accountUI
        if (autoaway === undefined) {
            presenceInt.rebind('settingsUIUpdated.settings', function(
                e,
                autoaway,
                autoawaylock,
                autoawaytimeout,
                persist,
                persistlock,
                lastSeen
            ) {
                self.init(autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen);
            });

            presenceInt.userPresence.updateui();
            return true;
        }

        if (typeof (megaChat) !== 'undefined' && typeof(presenceInt) !== 'undefined') {
            presenceInt.rebind('settingsUIUpdated.settings', function(
                e,
                autoaway,
                autoawaylock,
                autoawaytimeout,
                persist,
                persistlock,
                lastSeen
            ) {
                self.init(autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen);
            });
        }
    },
};

accountUI.reseller = {

    init: function(account) {

        'use strict';

        if (M.account.reseller) {
            this.voucher.render(account);
            this.voucher.bindEvents();
        }
    },

    voucher: {

        render: function(account) {

            'use strict';

            var $resellerSection = $('.fm-account-reseller', accountUI.$contentBlock);
            var $vouchersSelect = $('.dropdown-input.vouchers',  $resellerSection);

            if (!$.voucherlimit) {
                $.voucherlimit = 10;
            }

            var email = 'resellers@mega.nz';

            $('.resellerbuy').attr('href', 'mailto:' + email)
                .find('span').text(l[9106].replace('%1', email));

            // Use 'All' or 'Last 10/100/250' for the dropdown text
            const buttonText = $.voucherlimit === 'all' ? l[7557] : mega.icu.format(l[466], $.voucherlimit);

            $('span', $vouchersSelect).text(buttonText);
            $('.balance span', $resellerSection).safeHTML('@@ &euro; ', account.balance[0][0]);
            $('.voucher10-', $vouchersSelect).text(mega.icu.format(l[466], 10));
            $('.voucher100-', $vouchersSelect).text(mega.icu.format(l[466], 100));
            $('.voucher250-', $vouchersSelect).text(mega.icu.format(l[466], 250));

            // Sort vouchers by most recently created at the top
            M.account.vouchers.sort(function(a, b) {

                if (a['date'] < b['date']) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.data-table.vouchers tr', $resellerSection).remove();

            var html = '<tr><th>' + l[475] + '</th><th>' + l[7714] + '</th><th>' + l[477]
                + '</th><th>' + l[488] + '</th></tr>';

            $(account.vouchers).each(function(i, el) {

                // Only show the last 10, 100, 250 or if the limit is not set show all vouchers
                if (($.voucherlimit !== 'all') && (i >= $.voucherlimit)) {
                    return false;
                }

                var status = l[489];
                if (el.redeemed > 0 && el.cancelled === 0 && el.revoked === 0) {
                    status = l[490] + ' ' + time2date(el.redeemed);
                }
                else if (el.revoked > 0 && el.cancelled > 0) {
                    status = l[491] + ' ' + time2date(el.revoked);
                }
                else if (el.cancelled > 0) {
                    status = l[492] + ' ' + time2date(el.cancelled);
                }

                var voucherLink = 'https://mega.nz/#voucher' + htmlentities(el.code);

                html += '<tr><td><span>' + time2date(el.date) + '</span></td>'
                    + '<td class="selectable"><span class="break-word">' + voucherLink + '</span></td>'
                    + '<td><span>&euro; ' + htmlentities(el.amount) + '</span></td>'
                    + '<td><span>' + status + '</span></td></tr>';
            });

            $('.data-table.vouchers', $resellerSection).safeHTML(html);
            $('.vouchertype .dropdown-scroll', $resellerSection).text('');
            $('.vouchertype > span', $resellerSection).text(l[6875]);

            var prices = [];
            for (var i = 0; i < M.account.prices.length; i++) {
                if (M.account.prices[i]) {
                    prices.push(M.account.prices[i][0]);
                }
            }
            prices.sort(function(a, b) {
                return (a - b);
            });

            var voucheroptions = '';
            for (var j = 0; j < prices.length; j++) {
                voucheroptions += '<div class="option" data-value="'
                    + htmlentities(prices[j])
                    + '">&euro;' + htmlentities(prices[j]) + ' voucher</div>';
            }
            $('.vouchertype .dropdown-scroll', $resellerSection)
                .safeHTML(voucheroptions);
        },

        bindEvents: function() {

            'use strict';

            var $resellerSection = $('.fm-account-reseller', accountUI.$contentBlock);
            var $voucherSelect = $('.vouchers.dropdown-input', $resellerSection);
            var $voucherTypeSelect = $('.vouchertype.dropdown-input', $resellerSection);

            // Bind Dropdowns events
            bindDropdownEvents($voucherSelect);
            bindDropdownEvents($voucherTypeSelect);

            $('.vouchercreate', $resellerSection).rebind('click.voucherCreateClick', function() {
                var vouchertype = $('.option[data-state="active"]', $voucherTypeSelect)
                    .attr('data-value');
                var voucheramount = parseInt($('#account-voucheramount', $resellerSection).val());
                var proceed = false;

                for (var i in M.account.prices) {
                    if (M.account.prices[i][0] === vouchertype) {
                        proceed = true;
                    }
                }
                if (!proceed) {
                    msgDialog('warninga', l[135], 'Please select the voucher type.');
                    return false;
                }
                if (!voucheramount) {
                    msgDialog('warninga', l[135], 'Please enter a valid voucher amount.');
                    return false;
                }
                if (vouchertype === '19.99') {
                    vouchertype = '19.991';
                }
                loadingDialog.show();
                api_req({a: 'uavi', d: vouchertype, n: voucheramount, c: 'EUR'},
                    {
                        callback: function() {
                            M.account.lastupdate = 0;
                            accountUI();
                        }
                    });
            });

            $('.option', $voucherSelect).rebind('click.accountSection', function() {
                var $this = $(this);

                var c = $this.attr('class') ? $this.attr('class') : '';

                if (c.indexOf('voucher10-') > -1) {
                    $.voucherlimit = 10;
                }
                else if (c.indexOf('voucher100-') > -1) {
                    $.voucherlimit = 100;
                }
                else if (c.indexOf('voucher250-') > -1) {
                    $.voucherlimit = 250;
                }
                else if (c.indexOf('voucherAll-') > -1) {
                    $.voucherlimit = 'all';
                }

                accountUI();
            });
        }
    }
};

accountUI.calls = {
    init: function() {
        'use strict';
        this.emptyGroupCall.render();
    },
    emptyGroupCall: {
        render: function() {
            'use strict';
            const switchSelector = '#callemptytout';
            // undefined === 2min wait, 0 === 2min wait, 1 === 24hour wait
            const curr = mega.config.get('callemptytout');
            accountUI.inputs.switch.init(
                switchSelector,
                $(switchSelector).parent(),
                typeof curr === 'undefined' ? 1 : Math.abs(curr - 1),
                val => {
                    mega.config.setn('callemptytout', Math.abs(val - 1));
                }
            );
        }
    },
};
