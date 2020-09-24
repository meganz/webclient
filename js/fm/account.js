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

    $('.fm-account-notifications').removeClass('hidden');
    $('.fm-account-button').removeClass('active');
    $('.fm-account-sections').addClass('hidden');
    $('.fm-right-files-block, .section.conversations, .fm-right-block.dashboard').addClass('hidden');
    $('.fm-right-account-block').removeClass('hidden');
    $('.nw-fm-left-icon').removeClass('active');
    $('.nw-fm-left-icon.settings').addClass('active');
    $('.account.data-block.storage-data').removeClass('exceeded');
    $('.fm-account-save-block').addClass('hidden');
    $('.fm-account-save').removeClass('disabled');

    if ($('.fmholder').hasClass('transfer-panel-opened')) {
        $.transferClose();
    }

    // Destroy jScrollings in select dropdowns
    $('.fm-account-main .default-select-scroll').each(function(i, e) {
        $(e).parent().fadeOut(200).parent().removeClass('active');
        deleteScrollPanel(e, 'jsp');
    });

    M.onSectionUIOpen('account');

    if (u_attr && u_attr.b && !u_attr.b.m) {
        $('.content-panel.account .fm-account-button.slide-in-out.plan').addClass('hidden');
    }
    else {
        $('.content-panel.account .fm-account-button.slide-in-out.plan').removeClass('hidden');
    }
    M.accountData(accountUI.renderAccountPage, 1);
}

accountUI.renderAccountPage = function(account) {

    'use strict';

    if (d) {
        console.log('Rendering account pages');
    }

    var id = getSitePath();
    if (u_attr && u_attr.b && !u_attr.b.m && id === '/fm/account/plan') {
        id = '/fm/account';
    }

    var sectionClass;
    accountUI.general.init(account);
    accountUI.inputs.text.init();

    var showOrHideBanner = function(sectionName) {
        if (u_attr && u_attr.b) {
            $('.settings-banner').addClass('hidden');
            return;
        }
        if (sectionName === '/fm/account' || sectionName === '/fm/account/plan'
            || sectionName === '/fm/account/transfers') {
            $('.settings-banner').removeClass('hidden');
        }
        else {
            $('.settings-banner').addClass('hidden');
        }
    };

    showOrHideBanner(id);

    // Always hide the add-phone banner if it was shown by the account profile sub page
    $('.add-phone-num-banner').addClass('hidden');

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
                    $('.fm-account-plan.fm-account-sections .btn-achievements:visible').trigger('click');
                });
            }
            $('.fm-account-plan').removeClass('hidden');
            sectionClass = 'plan';
            accountUI.plan.init(account);
            break;

        case '/fm/account/security':
            $('.fm-account-security').removeClass('hidden');
            sectionClass = 'security';
            accountUI.security.init();
            break;

        case '/fm/account/file-management':
            $('.fm-account-file-management').removeClass('hidden');
            sectionClass = 'file-management';

            accountUI.fileManagement.init(account);
            break;

        case '/fm/account/transfers':
            $('.fm-account-transfers').removeClass('hidden');
            sectionClass = 'transfers';

            accountUI.transfers.init(account);
            break;

        case '/fm/account/contact-chats':
            $('.fm-account-contact-chats').removeClass('hidden');
            sectionClass = 'contact-chats';

            accountUI.contactAndChat.init();
            break;

        case '/fm/account/reseller' /** && M.account.reseller **/:
            if (!account.reseller) {
                loadSubPage('fm/account');
                return false;
            }
            $('.fm-account-reseller').removeClass('hidden');
            sectionClass = 'reseller';

            accountUI.reseller.init(account);
            break;

        case '/fm/account/notifications':
            $('.fm-account-notifications').removeClass('hidden');
            $('.settings-banner').addClass('hidden');
            sectionClass = 'notifications';

            accountUI.notifications.init(account);
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

    // Reinitialize Scroll bar
    initAccountScroll();
    mBroadcaster.sendMessage('settingPageReady');
    fmLeftMenuUI();

    loadingDialog.hide();
};

accountUI.general = {

    init: function(account) {

        'use strict';

        $.tresizer();
        clickURLs();

        this.charts.init(account);
        this.userUIUpdate();
        this.bindEvents();
    },

    bindEvents: function() {

        'use strict';

        // Upgrade Account Button
        $('.upgrade-to-pro').rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
                loadSubPage('repay');
            }
            else {
                loadSubPage('pro');
            }
        });

        $('.download-sync').rebind('click', function() {

            var pf = navigator.platform.toUpperCase();

            // If this is Linux let them goes to sync page to select linux type
            if (pf.indexOf('LINUX') > -1) {
                loadSubPage('sync');
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
     * @param {Boolean} [onDashboard] Whether invoked from the dashboard
     */
    charts: {

        perc_c_s : 0,
        perc_c_b : 0,

        init: function(account, onDashboard) {

            'use strict';

            this.bandwidthChart(account);
            this.usedStorageChart(account);
            this.chartWarningNoti(onDashboard);
        },

        bandwidthChart: function(account) {

            'use strict';

            /* New Used Bandwidth chart */
            this.perc_c_b = account.tfsq.perc > 100 ? 100 : account.tfsq.perc;

            var $bandwidthChart = $('.fm-account-blocks.bandwidth');
            var deg = 230 * this.perc_c_b / 100;

            // Used Bandwidth chart
            if (deg <= 180) {
                $bandwidthChart.find('.left-chart span').css('transform', 'rotate(' + deg + 'deg)');
                $bandwidthChart.find('.right-chart span').removeAttr('style');
            }
            else {
                $bandwidthChart.find('.left-chart span').css('transform', 'rotate(180deg)');
                $bandwidthChart.find('.right-chart span').css('transform', 'rotate(' + (deg - 180) + 'deg)');
            }

            if (this.perc_c_b > 99 || dlmanager.isOverQuota) {
                $bandwidthChart.addClass('exceeded');
            }

            // Maximum bandwidth
            var b2 = bytesToSize(account.tfsq.max, 0).split(' ');
            var usedB = bytesToSize(account.tfsq.used);
            $bandwidthChart.find('.chart.data .size-txt').text(usedB);
            $('.chart.data .pecents-txt', $bandwidthChart).text(b2[0]);
            $('.chart.data .gb-txt', $bandwidthChart).text(b2[1]);
            $bandwidthChart.find('.chart.data .content-txt').text('/');
            if ((u_attr.p || account.tfsq.ach) && b2[0] > 0) {
                if (this.perc_c_b > 0) {
                    $bandwidthChart.removeClass('no-percs');
                    $bandwidthChart.find('.chart.data .perc-txt').text(this.perc_c_b + '%');
                }
                else {
                    $bandwidthChart.addClass('no-percs');
                }
            }
            else {
                $bandwidthChart.addClass('no-percs');
                $bandwidthChart.find('.chart.data > span:not(.size-txt)').text('');
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
                $bandwidthChart.find('.chart.data .pecents-txt').text(usedW);
            }

            if (!account.maf) {
                $('.fm-right-account-block').removeClass('active-achievements');
            }
            else {
                $('.fm-right-account-block').addClass('active-achievements');
            }

            /* End of New Used Bandwidth chart */
        },

        usedStorageChart: function(account) {

            'use strict';

            /* New Used Storage chart */
            var $storageChart = $('.fm-account-blocks.storage');
            var usedPercentage = Math.round(account.space_used / account.space * 100);
            this.perc_c_s = usedPercentage;
            if (this.perc_c_s > 100) {
                this.perc_c_s = 100;
            }
            $storageChart.removeClass('exceeded going-out');

            if (this.perc_c_s === 100) {
                $storageChart.addClass('exceeded');
            }
            else if (this.perc_c_s > 80) {
                $storageChart.addClass('going-out');
            }

            var deg = 230 * this.perc_c_s / 100;

            // Used space chart
            if (deg <= 180) {
                $storageChart.find('.left-chart span').css('transform', 'rotate(' + deg + 'deg)');
                $storageChart.find('.right-chart span').removeAttr('style');
            }
            else {
                $storageChart.find('.left-chart span').css('transform', 'rotate(180deg)');
                $storageChart.find('.right-chart span').css('transform', 'rotate(' + (deg - 180) + 'deg)');
            }

            // Maximum disk space
            var b2 = bytesToSize(account.space, 0).split(' ');
            $('.chart.data .pecents-txt', $storageChart).text(b2[0]);
            $('.chart.data .gb-txt', $storageChart).text(b2[1]);
            $('.chart.data .perc-txt', $storageChart).text(usedPercentage + '%');
            $('.chart.data .size-txt', $storageChart).text(bytesToSize(account.space_used));
            $('.fm-right-block.dashboard .fm-account-blocks.storage .chart-indicator').css(
                'left',
                usedPercentage > 100 ?
                    180 + (Math.floor(Math.log(usedPercentage) * Math.LOG10E) - 2) * 15 + 'px'
                    : ''
            );
            $('.dashboard-container .fm-account-blocks.storage .chart-indicator').css(
                'left',
                usedPercentage > 100 ?
                    150 + (Math.floor(Math.log(usedPercentage) * Math.LOG10E) - 2) * 15 + 'px'
                    : ''
            );
            /** End New Used Storage chart */
        },

        chartWarningNoti: function(onDashboard) {

            'use strict';

            var b_exceeded = (this.perc_c_t > 99 || dlmanager.isOverQuota) ? true : false;
            var s_exceeded = this.perc_c_s === 100 ? true : false;

            // Charts warning notifications
            var $chartsBlock = $('.account' + (onDashboard ? '.widget.content' : '.data-block.charts'));
            $chartsBlock.find('.chart-warning:not(.hidden)').addClass('hidden');
            if (b_exceeded && s_exceeded) {
                // Bandwidth and Storage quota exceeded
                $chartsBlock.find('.chart-warning.storage-and-bandwidth').removeClass('hidden');
            }
            else if (s_exceeded) {
                // Storage quota exceeded
                $chartsBlock.find('.chart-warning.storage').removeClass('hidden');
            }
            else if (b_exceeded) {
                // Bandwidth quota exceeded
                $chartsBlock.find('.chart-warning.bandwidth').removeClass('hidden');
            }
            else if (this.perc_c_s > 80) {
                // Running out of cloud space
                $chartsBlock.find('.chart-warning.out-of-space').removeClass('hidden');
            }
            if (b_exceeded || s_exceeded || this.perc_c_s > 80) {
                $chartsBlock.find('.chart-warning').rebind('click', function() {
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

        // Show Membership plan
        $('.small-icon.membership').removeClass('pro1 pro2 pro3 pro4');

        if (u_attr.p) {

            // LITE/PRO account
            var planNum = u_attr.p;
            var planText = pro.getProPlanName(planNum);

            $('.account.membership-plan').text(planText);
            $('.small-icon.membership').addClass('pro' + planNum);
        }
        else {
            $('.account.membership-plan').text(l[1150]);
        }

        // update avatar
        $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', false));
        $('.fm-avatar').safeHTML(useravatar.contact(u_handle));
        $('.avatar-block', '.top-menu-popup').safeHTML(useravatar.contact(u_handle));

        // Show first name or last name
        $('.membership-big-txt.name').text(u_attr.fullname);

        // Show email address
        if (u_attr.email) {
            $('.membership-big-txt.email').text(u_attr.email);
        }
        else {
            $('.membership-big-txt.email').hide();
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

            var $inputs = $('.fm-account-main input').add('.fm-voucher-popup input');
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

        $.each($('.fm-account-button'), function() {

            var $this = $(this);

            if ($this.hasClass(sectionClass)) {
                $this.addClass('active');
                setTimeout(function() {
                    $this.removeClass('closed');
                }, 600);
            }
            else {
                $this.addClass('closed');
            }

            if (!$this.is(':has(.sub-title)')) {
                $this.find('.settings-menu-arrow').remove();
            }

            initTreeScroll();
        });

        if (M.account.reseller) {
            // Show reseller button on naviation
            $('.fm-account-button.reseller').removeClass('hidden');
        }
    },

    bindEvents: function() {

        'use strict';

        $('.fm-account-button').rebind('click', function() {

            if ($(this).attr('class').indexOf('active') === -1) {
                $('.fm-account-main').data('jsp').scrollToY(0, false);

                switch (true) {
                    case $(this).hasClass('account-s'):
                        loadSubPage('fm/account');
                        break;
                    case $(this).hasClass('plan'):
                        loadSubPage('fm/account/plan');
                        break;
                    case $(this).hasClass('notifications'):
                        loadSubPage('fm/account/notifications');
                        break;
                    case $(this).hasClass('security'):
                        loadSubPage('fm/account/security');
                        break;
                    case $(this).hasClass('file-management'):
                        loadSubPage('fm/account/file-management');
                        break;
                    case $(this).hasClass('transfers'):
                        loadSubPage('fm/account/transfers');
                        break;
                    case $(this).hasClass('contact-chats'):
                        loadSubPage('fm/account/contact-chats');
                        break;
                    case $(this).hasClass('reseller'):
                        loadSubPage('fm/account/reseller');
                        break;
                }
            }
        });

        $('.fm-account-button .settings-menu-arrow').rebind('click', function(e) {

            var $button = $(this).parents('.fm-account-button');

            if ($button.hasClass('active')) {
                return false;
            }

            e.stopPropagation();
            $button.toggleClass('closed');
            setTimeout(initTreeScroll, 600);
        });

        $('.fm-account-button .sub-title').rebind('click', function() {

            var $parentBtn = $(this).parents('.fm-account-button');
            var $target = $('.data-block.' + $(this).data('scrollto'));

            if ($parentBtn.hasClass('active')) {
                $('.fm-account-main').data('jsp').scrollToElement($target, true);
            }
            else {
                $parentBtn.trigger('click');
                mBroadcaster.once('settingPageReady', function () {
                    $('.fm-account-main').data('jsp').scrollToElement($target, true, false);
                });
            }
        });
    }
};

accountUI.account = {

    init: function(account) {

        'use strict';

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
                $('.fm-account-main .fm-account-sections .cancel-account-block').addClass('hidden');
                $('.content-panel.account .acc-setting-menu-cancel-acc').addClass('hidden');
                $('.settings-sub-section.profile #account-firstname').prop('disabled', true);
                $('.settings-sub-section.profile #account-lastname').prop('disabled', true);
            }
            else {
                $('.fm-account-main .fm-account-sections .cancel-account-block').removeClass('hidden');
                $('.content-panel.account .acc-setting-menu-cancel-acc').removeClass('hidden');
                $('.settings-sub-section.profile #account-firstname').prop('disabled', false);
                $('.settings-sub-section.profile #account-lastname').prop('disabled', false);
            }
        };

        if (u_attr && u_attr.b) {
            $('.fm-account-main .settings-sub-section.profile .acc-setting-country-sec').addClass('hidden');
            if (!u_attr.b.m) {
                hideOrViewCancelSection(true);

            }
            else {
                hideOrViewCancelSection(false);
            }
        }
        else {

            // user can set country only in non-business accounts
            $('.fm-account-main .settings-sub-section.profile .acc-setting-country-sec').removeClass('hidden');

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
            var $addPhoneBanner = $('.add-phone-num-banner');
            var $usageBanner = $('.settings-banner');
            var $text = $addPhoneBanner.find('.add-phone-text');
            var $addPhoneButton = $addPhoneBanner.find('.js-add-phone-button');
            var $skipButton = $addPhoneBanner.find('.skip-button');
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
                mega.config.set('skipsmsbanner', true);
            });

            // Set the text for x GB storage and quota
            sms.renderAddPhoneText($text);

            // Show the phone banner, hide the storage/bandwidth usage banner
            $usageBanner.addClass('hidden');
            $addPhoneBanner.removeClass('hidden');
        },

        renderFirstName: function() {

            'use strict';

            $('#account-firstname').val(u_attr.firstname).trigger('blur');
        },

        renderLastName: function() {

            'use strict';

            $('#account-lastname').val(u_attr.lastname).trigger('blur');
        },

        renderBirth: function () {

            'use strict';

            // If $.dateTimeFormat['stucture'] is not set, prepare it for birthday
            if (!$.dateTimeFormat['structure']) {
                $.dateTimeFormat['structure'] = getDateStructure() || 'ymd';
            }

            // Display only date format that is correct with current locale.
            $('.mega-input-title-ontop.birth').addClass('hidden');
            $('.mega-input-title-ontop.birth.' + $.dateTimeFormat['structure']).removeClass('hidden');

            this.renderBirthYear();
            this.renderBirthMonth();
            this.renderBirthDay();
        },

        renderBirthYear: function() {

            'use strict';

            var i = new Date().getFullYear() - 16;
            var $input = $('.mega-input-title-ontop.birth.' + $.dateTimeFormat['structure'] + ' .byear')
                .attr('max', i);

            if (u_attr.birthyear) {
                $input.val(u_attr.birthyear).trigger('input');
            }
        },

        renderBirthMonth: function() {

            'use strict';

            if (u_attr.birthmonth) {
                var $input = $('.mega-input-title-ontop.birth.' + $.dateTimeFormat['structure'] + ' .bmonth');
                $input.val(u_attr.birthmonth).trigger('input');
                this.zerofill($input[0]);
            }
        },

        renderBirthDay: function() {

            'use strict';

            if (u_attr.birthday) {
                var $input = $('.mega-input-title-ontop.birth.' + $.dateTimeFormat['structure'] + ' .bdate');
                $input.val(u_attr.birthday).trigger('input');
                this.zerofill($input[0]);
            }
        },

        renderCountry: function() {

            'use strict';

            var html = '';
            var sel = '';
            var $country = $('.fm-account-main .default-select.country');
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
                html += '<div class="default-dropdown-item ' + sel + '" data-value="' + country + '">'
                     +      countries[country]
                     +  '</div>';
            }
            $('.default-select-scroll', $country).safeHTML(html);

            // Initialize scrolling. This is to prevent scroll losing bug with action packet.
            initSelectScrolling('#account-country .default-select-scroll');

            // Bind Dropdowns events
            bindDropdownEvents($country, 1, '.fm-account-main');
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
                var $phoneSettings = $('.fm-account-main .phone-number-settings');
                var $text = $phoneSettings.find('.add-phone-text');
                var $phoneNumber = $phoneSettings.find('.phone-number');
                var $addNumberButton = $phoneSettings.find('.add-number-button');
                var $removeNumberButton = $('.rem-gsm', $phoneSettings);
                var $modifyNumberButton = $('.modify-gsm', $phoneSettings);

                // If the phone is already added, show that
                if (typeof u_attr.smsv !== 'undefined') {
                    $phoneSettings.addClass('verified');
                    $phoneNumber.text(u_attr.smsv);

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
                    $phoneSettings.removeClass('verified');
                    // Otherwise set the text for x GB storage and quota
                    sms.renderAddPhoneText($text);

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

            var $personalInfoBlock = $('.profile-form');
            var $saveBlock = $('.fm-account-sections .save-block');

            $('input', $personalInfoBlock).val('');
            $('.error, .errored', $personalInfoBlock).removeClass('error errored');
            $saveBlock.addClass('closed');
        },

        bindEvents: function() {

            'use strict';

            // Cache selectors
            var self = this;
            var $personalInfoBlock = $('.profile-form');
            var $birthdayBlock = $('.mega-input-title-ontop.birth.' + $.dateTimeFormat['structure'],
                $personalInfoBlock);
            var $firstNameField = $('#account-firstname', $personalInfoBlock);
            var $lastNameField = $('#account-lastname', $personalInfoBlock);
            var $saveBlock = $('.fm-account-sections .save-block');
            var $saveButton = $('.fm-account-save', $saveBlock);

            // Avatar
            $('.fm-account-avatar, .settings-sub-section.avatar .avatar', $personalInfoBlock)
                .rebind('click', function() {
                    avatarDialog();
                });

            // All profile text inputs
            $firstNameField.add($lastNameField).add('.byear, .bmonth, .bdate', $birthdayBlock)
                .rebind('input.settingsGeneral, change.settingsGeneral', function() {

                    var $this = $(this);
                    var $parent = $this.parent();
                    var errorMsg = l[20960];
                    var max = parseInt($this.attr('max'));
                    var min = parseInt($this.attr('min'));

                    if ($this.is('.byear, .bmonth, .bdate')) {
                        if (this.value > max) {
                            $this.addClass('errored');
                            $parent.addClass('error msg').find('.message-container').text(errorMsg);
                            $saveBlock.addClass('closed');
                            return false;
                        }
                        else if (this.value < min) {
                            $this.addClass('errored');
                            $parent.addClass('error msg').find('.message-container').text(errorMsg);
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
                    $this.removeClass('errored').trigger('change');
                    $parent.removeClass('error');
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
                    $this.removeClass('errored').trigger('change');
                    $parent.removeClass('error');
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

            $('#account-country .default-dropdown-item', $personalInfoBlock).rebind('click.showSave', function() {

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

                $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', false));
                $('.fm-avatar').safeHTML(useravatar.contact(u_handle));

                var checklist = {
                    firstname: String($('#account-firstname').val() || '').trim(),
                    lastname: String($('#account-lastname').val() || '').trim(),
                    birthday: String($('.bdate', $birthdayBlock).val() || ''),
                    birthmonth: String($('.bmonth', $birthdayBlock).val() || ''),
                    birthyear: String($('.byear', $birthdayBlock).val() || ''),
                    country: String($('#account-country .default-dropdown-item.active').attr('data-value') || '')
                };
                var userAttrRequest = { a: 'up' };

                var checkUpdated = function() {
                    var result = false;
                    for (var i in checklist) {
                        if (u_attr[i] === null || u_attr[i] !== checklist[i]) {
                            // we want also to catch the 'undefined' or null
                            // and replace with the empty string (or given string)
                            u_attr[i] = i === 'firstName' ? checklist[i] || 'Nobody' : checklist[i];
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

            this.$QRSettings =  $('.qr-settings');

            var QRoptions = {
                width: 106,
                height: 106,
                correctLevel: QRErrorCorrectLevel.H,    // high
                foreground: '#dc0000',
                text: getBaseUrl() + '/' + account.contactLink
            };

            var defaultValue = (account.contactLink && account.contactLink.length);

            $('.qr-http-link', this.$QRSettings).text(QRoptions.text);

            var $container = $('.enable-qr-container');

            if (defaultValue) {
                // Render the QR code
                $('.account.qr-icon').text('').qrcode(QRoptions);
                $('.dialog-feature-toggle.enable-qr', this.$QRSettings).addClass('toggle-on');
                $('.access-qr-container').parent().removeClass('closed');
                $('.qr-block', this.$QRSettings).removeClass('hidden');
                $('.settings-sub-section.enable-qr-container').addClass('border');
            }
            else {
                $('.account.qr-icon').text('');
                $('.dialog-feature-toggle.enable-qr', this.$QRSettings).removeClass('toggle-on');
                $('.access-qr-container').parent().addClass('closed');
                $('.qr-block', this.$QRSettings).addClass('hidden');
                $('.settings-sub-section.enable-qr-container').removeClass('border');
            }

            // Enable QR code
            accountUI.inputs.switch.init(
                '.enable-qr',
                $container,
                defaultValue,
                function(val) {

                    if (val) {
                        $('.access-qr-container').add('.qr-block', self.$QRSettings).parent().removeClass('closed');
                        $container.addClass('border');
                        setTimeout(initAccountScroll, 301);

                        api_req({ a: 'clc' }, {
                            myAccount: account,
                            callback: function (res, ctx) {
                                ctx.myAccount.contactLink = typeof res === 'string' ? 'C!' + res : '';
                                accountUI.account.qrcode.render(M.account);
                            }
                        });
                    }
                    else {
                        $('.access-qr-container').add('.qr-settings .qr-block').parent().addClass('closed');
                        $container.removeClass('border');
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
                    $('.access-qr-container'),
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
                $('.qr-dlg-cpy-lnk', this.$QRSettings).rebind('click', function () {
                    var links = $.trim($(this).prev('.qr-http-link').text());
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
                $('.uidateformat').parent(),
                fmconfig.uidateformat || 0,
                function (val) {
                    showToast('settings', l[16168]);
                    mega.config.setn('uidateformat', parseInt(val));
                }
            );

            // Font size
            accountUI.inputs.radio.init(
                '.uifontsize',
                $('.uifontsize').parent(),
                fmconfig.font_size || 2,
                function (val) {
                    showToast('settings', l[16168]);
                    $('body').removeClass('fontsize1 fontsize2').addClass('fontsize' + val);
                    mega.config.setn('font_size', parseInt(val));
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

            var $hPageSelect = $('.fm-account-main .default-select.settings-choose-homepage-dropdown');
            var $textField = $('span', $hPageSelect);

            // Mark active item.
            var $activeItem = $('.default-dropdown-item[data-value="' + getLandingPage() + '"]', $hPageSelect);
            $activeItem.addClass('active');
            $textField.text($activeItem.text());

            // Initialize scrolling. This is to prevent scroll losing bug with action packet.
            initSelectScrolling('#account-hpage .default-select-scroll');

            // Bind Dropdowns events
            bindDropdownEvents($hPageSelect, 1, '.fm-account-main');

            $('.default-dropdown-item', $hPageSelect).rebind('click.saveChanges', function() {
                var $selectedOption = $('.default-dropdown-item.active', $hPageSelect);
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

                // Search through their Pro plan purchase history
                $(account.purchases).each(function(index, purchaseTransaction) {

                    // Get payment method name
                    var paymentMethodId = purchaseTransaction[4];
                    var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).name;

                    // If they have paid with iTunes or Google Play in the past
                    if ((paymentMethod === 'apple') || (paymentMethod === 'google')) {

                        // Update confirmation message to remind them to cancel iTunes or Google Play
                        confirmMessage += ' ' + l[8854];
                        return false;
                    }
                });

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

        // check if business account
        if (u_attr && u_attr.b) {
            $('.fm-account-plan.fm-account-sections .acc-storage-space').addClass('hidden');
            $('.fm-account-plan.fm-account-sections .acc-bandwidth-vol').addClass('hidden');
            $('.fm-account-plan.fm-account-sections .btn-achievements').addClass('hidden');
            $('.fm-account-plan.fm-account-sections .data-block.account-balance').addClass('hidden');
            $('.content-panel.account .acc-setting-menu-balance-acc').addClass('hidden');
            if (!u_attr.b.m || u_attr.b.s !== -1) {
                $('.fm-account-plan.fm-account-sections .upgrade-to-pro').addClass('hidden');
            }
        }
    },

    accountType: {

        render: function(account) {

            'use strict';

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
                    $('.account.plan-info.expiry-txt').text(l[6971]);
                    $('.account.plan-info.expiry').text(paymentType);
                }
                else {
                    // Otherwise show nothing
                    $('.account.plan-info.expiry').text('');
                    $('.account.plan-info.expiry-txt').text('');
                }

                var $buttons = $('.account.account-type');
                var $cancelSubscriptionButton = $buttons.find('.btn-cancel-sub');
                var $achievementsButton = $buttons.find('.btn-achievements');

                if (!M.maf){
                    $achievementsButton.addClass('hidden');
                }

                // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
                if ((gatewayId === 2) || (gatewayId === 3)) {

                    // Tell them they need to cancel their plan off-site and don't show the feedback dialog
                    $cancelSubscriptionButton.removeClass('hidden').rebind('click', function() {
                        msgDialog('warninga', l[7179], l[16501]);
                    });
                }

                // Otherwise if ECP or Sabadell
                else if ((gatewayId === 16) || (gatewayId === 17)) {

                    // Check if there are any active subscriptions
                    // ccqns = Credit Card Query Number of Subscriptions
                    api_req({a: 'ccqns'}, {
                        callback: function(numOfSubscriptions) {

                            // If there is an active subscription
                            if (numOfSubscriptions > 0) {

                                // Show cancel button and show cancellation dialog
                                $cancelSubscriptionButton.removeClass('hidden')
                                    .rebind('click', function() {
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
                    $('.account.plan-info.accounttype').addClass('business');
                    $('.fm-account-plan .acc-renew-date-info').removeClass('border');
                }
                else {
                    $('.account.plan-info.accounttype').removeClass('business');
                    $('.fm-account-plan .acc-renew-date-info').addClass('border');
                }

                // Account type
                $('.account.plan-info.accounttype span').text(planText);
                $('.small-icon.membership').addClass('pro' + planNum);

                // Subscription
                if (account.stype === 'S') {
                    renderSubscription();
                }
                else if (account.stype === 'O') {

                    var expiryTimestamp = account.nextplan ? account.nextplan.t : account.expiry;

                    // one-time or cancelled subscription
                    $('.account.plan-info.expiry-txt').text(l[987]);
                    $('.account.plan-info.expiry span').text(time2date(expiryTimestamp, 2));
                    $('.account.data-block .btn-cancel-sub').addClass('hidden');
                }

                $('.account.plan-info.bandwidth').parent().removeClass('hidden');
            }
            else {
                // free account:
                $('.account.plan-info.accounttype span').text(l[1150]);
                $('.account.plan-info.expiry').text(l[436]);
                $('.btn-cancel-sub').addClass('hidden');
                if (account.mxfer) {
                    $('.account.plan-info.bandwidth').parent().removeClass('hidden');
                }
                else {
                    $('.account.plan-info.bandwidth').parent().addClass('hidden');
                }
            }

            /* achievements */
            if (!account.maf) {
                $('.account.plan-info.storage > span').text(bytesToSize(M.account.space, 0));
                $('.account.plan-info.bandwidth > span').text(bytesToSize(M.account.tfsq.max, 0));
                $('.account.plan-info .quota-note-container, .account.plan-info .settings-bar, .btn-achievements')
                    .addClass('hidden');
            }
            else {
                mega.achievem.parseAccountAchievements();
            }
        },

        bindEvents: function() {

            "use strict";

            $('.btn-achievements').rebind('click', function() {
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
                this.$dialog.find('.default-white-button.cancel, .fm-dialog-close').rebind('click', function() {
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

                this.$dialogSuccess.find('.fm-dialog-close').rebind('click', function() {
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

    balance: {

        render: function(account) {

            "use strict";

            $('.account.plan-info.balance span').safeHTML(
                '&euro; @@',
                mega.intl.number.format(account.balance[0][0])
            );
        },

        bindEvents: function() {

            "use strict";

            var self = this;

            $('.redeem-voucher').rebind('click', function() {
                var $this = $(this);
                if ($this.attr('class').indexOf('active') === -1) {
                    $('.fm-account-overlay').fadeIn(100);
                    $this.addClass('active');
                    $('.fm-voucher-popup').removeClass('hidden');
                    self.voucherCentering($this);
                    $(window).rebind('resize.voucher', function() {
                        self.voucherCentering($this);
                    });

                    $('.fm-account-overlay, .fm-purchase-voucher, .fm-voucher-button')
                        .add('.fm-voucher-popup .fm-dialog-close')
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
                    $(window).off('resize.voucher');
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
                        loadingDialog.hide();
                        Object(M.account).lastupdate = 0;
                        onIdle(accountUI);
                    })
                    .catch(function(ex) {
                        loadingDialog.hide();
                        if (ex) {
                            msgDialog('warninga', l[135], l[47], ex);
                        }
                    });
            });

            $('.fm-purchase-voucher,.default-white-button.topup').rebind('click', function() {
                loadSubPage('resellers');
            });
        },

        voucherCentering: function voucherCentering($button) {
            'use strict';

            var $popupBlock = $('.fm-voucher-popup');
            var popupHeight = $popupBlock.outerHeight();

            $popupBlock.css({
                'top': $button.offset().top - popupHeight - 10,
                'right': $('body').outerWidth() - $button.outerWidth() - $button.offset().left
            });

            if ($button.offset().top + 10 > popupHeight) {
                $popupBlock.css('top', $button.offset().top - popupHeight - 10);
            }
            else {
                $popupBlock.css('top', $button.offset().top + $button.outerHeight() + 10);
            }
        }
    },

    history: {

        renderPurchase: function(account) {

            'use strict';

            if (!$.purchaselimit) {
                $.purchaselimit = 10;
            }

            $('.account-history-dropdown-button.purchases').text(l[469].replace('[X]', $.purchaselimit));
            $('.account-history-drop-items.purchase10-').text(l[469].replace('[X]', 10));
            $('.account-history-drop-items.purchase100-').text(l[469].replace('[X]', 100));
            $('.account-history-drop-items.purchase250-').text(l[469].replace('[X]', 250));

            M.account.purchases.sort(function(a, b) {
                if (a[1] < b[1]) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.grid-table.purchases tr').remove();
            var html = '<tr><th>' + l[475] + '</th><th>' + l[476] +
                '</th><th>' + l[477] + '</th><th>' + l[478] + '</th></tr>';
            if (account.purchases.length) {
                var intl = mega.intl.number;
                // Render every purchase made into Purchase History on Account page
                $(account.purchases).each(function(index, purchaseTransaction) {

                    if (index === $.purchaselimit) {
                        return false;// Break the loop
                    }

                    // Set payment method
                    var paymentMethodId = purchaseTransaction[4];
                    var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).displayName;

                    // Set Date/Time, Item (plan purchased), Amount, Payment Method
                    var dateTime = time2date(purchaseTransaction[1]);
                    var price = purchaseTransaction[2];
                    var proNum = purchaseTransaction[5];
                    var numOfMonths = purchaseTransaction[6];
                    var monthWording = (numOfMonths === 1) ? l[931] : 'months';  // Todo: l[6788] when generated
                    var item = pro.getProPlanName(proNum) + ' (' + numOfMonths + ' ' + monthWording + ')';

                    // Render table row
                    html += '<tr>'
                        + '<td>' + dateTime + '</td>'
                        + '<td>'
                        + '<span class="fm-member-icon">'
                        + '<i class="small-icon membership pro' + proNum + '"></i>'
                        + '</span>'
                        + '<span class="fm-member-icon-txt"> ' + item + '</span>'
                        + '</td>'
                        + '<td>&euro;' + escapeHTML(intl.format(price)) + '</td>'
                        + '<td>' + paymentMethod + '</td>'
                        + '</tr>';
                });
            }
            else {
                html += '<tr><td colspan="4" class="grid-table-empty">' + l[20140] + '</td></tr>';
            }

            $('.grid-table.purchases').safeHTML(html);
        },

        renderTransaction: function(account) {

            'use strict';

            if (!$.transactionlimit) {
                $.transactionlimit = 10;
            }

            $('.account-history-dropdown-button.transactions').text(l[471].replace('[X]', $.transactionlimit));
            $('.account-history-drop-items.transaction10-').text(l[471].replace('[X]', 10));
            $('.account-history-drop-items.transaction100-').text(l[471].replace('[X]', 100));
            $('.account-history-drop-items.transaction250-').text(l[471].replace('[X]', 250));

            M.account.transactions.sort(function(a, b) {
                if (a[1] < b[1]) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.grid-table.transactions tr').remove();
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
                        credit = '<span class="green">&euro;' + escapeHTML(intl.format(el[2])) + '</span>';
                    }
                    else {
                        debit = '<span class="red">&euro;' + escapeHTML(intl.format(el[2])) + '</span>';
                    }
                    html += '<tr><td>' + time2date(el[1]) + '</td><td>' + htmlentities(el[0]) + '</td><td>'
                        + credit + '</td><td>' + debit + '</td></tr>';
                });
            }
            else {
                html += '<tr><td colspan="4" class="grid-table-empty">' + l[20140] + '</td></tr>';
            }

            $('.grid-table.transactions').safeHTML(html);
        },

        bindEvents: function() {

            'use strict';

            $('.fm-account-plan .account-history-dropdown-button').rebind('click', function() {

                $(this).addClass('active');
                $('.account-history-dropdown').addClass('hidden');
                $(this).next().removeClass('hidden');
            });

            $('.fm-account-plan .account-history-drop-items').rebind('click', function() {

                var $parent = $(this).parent();
                $parent.find('.account-history-drop-items').removeClass('active');
                $parent.prev('.account-history-dropdown-button').text($(this).text()).removeClass('active');

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

                $(this).addClass('active');
                $(this).closest('.account-history-dropdown').addClass('hidden');
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
        var $NToggleAll = $('.fm-account-notifications .account-notification .dialog-feature-toggle.toggle-all');
        var $NToggle = $('.fm-account-notifications .account-notification .switch-container .dialog-feature-toggle');

        // Toggle Individual Notifications
        $NToggle.each(function() {
            var $this = $(this);
            var $section = $this.parents('.switch-container');
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
                    var $section = $this.parents('.switch-container');
                    var sectionName = accountUI.notifications.getSectionName($section);
                    var notifChange = val ? mega.notif.set : mega.notif.unset;
                    notifChange($this.attr('name'), sectionName);

                    (val ? $.fn.addClass : $.fn.removeClass).apply($NToggle, ['toggle-on']);
                });
            }
        );

        // Hide achievements toggle if achievements not an option for this user.
        if (!M.account.maf) {
            $('#enotif-achievements').closest('.switch-container').remove();
        }

        // Handle email notification switches.
        var $EToggleAll = $('.fm-account-notifications .email-notification .dialog-feature-toggle.toggle-all');
        var $EToggle = $('.fm-account-notifications .email-notification .switch-container .dialog-feature-toggle');

        mega.enotif.all().then(function(enotifStates) {
            // Toggle Individual Emails
            $EToggle.each(function() {
                var $this = $(this);
                var $section = $this.parents('.switch-container');
                var emailId = $this.attr('name');

                accountUI.inputs.switch.init(
                    '#' + this.id,
                    $section,
                    !enotifStates[emailId],
                    function(val) {
                        mega.enotif.setState(emailId, !val);
                        (val || $EToggle.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                            .apply($EToggleAll, ['toggle-on']);
                    }
                );
            });

            // All Email Notifications Switch
            accountUI.inputs.switch.init(
                '#' + $EToggleAll[0].id,
                $EToggleAll.parents('.settings-sub-section'),
                $EToggle.hasClass('toggle-on'),
                function(val) {
                    mega.enotif.setAllState(!val);
                    (val ? $.fn.addClass : $.fn.removeClass).apply($EToggle, ['toggle-on']);
                }
            );

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

            if (d) {
                console.log('Render session history');
            }

            if (!$.sessionlimit) {
                $.sessionlimit = 10;
            }

            $('.account-history-dropdown-button.sessions').text(l[472].replace('[X]', $.sessionlimit));
            $('.account-history-drop-items.session10-').text(l[472].replace('[X]', 10));
            $('.account-history-drop-items.session100-').text(l[472].replace('[X]', 100));
            $('.account-history-drop-items.session250-').text(l[472].replace('[X]', 250));

            M.account.sessions.sort(function(a, b) {
                if (a[7] !== b[7]) {
                    return a[7] > b[7] ? -1 : 1;
                }
                if (a[5] !== b[5]) {
                    return a[5] > b[5] ? -1 : 1;
                }
                return a[0] < b[0] ? 1 : -1;
            });

            $('#sessions-table-container').empty();
            var html =
                '<table width="100%" border="0" cellspacing="0" cellpadding="0" class="grid-table sessions">' +
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

            $('#sessions-table-container').safeHTML(html + '</table>');

            // Don't show button to close other sessions if there's only the current session
            if (numActiveSessions === 1) {
                $('.fm-close-all-sessions').hide();
            }
            else {
                $('.fm-close-all-sessions').show();
            }
        },

        bindEvents: function() {

            'use strict';

            $('.fm-close-all-sessions').rebind('click', function() {
                msgDialog('confirmation', '', l[18513], false, function(e) {
                    if (e) {
                        loadingDialog.show();
                        var $activeSessionsRows = $('.active-session-txt').parents('tr');
                        // Expire all sessions but not the current one
                        api_req({a: 'usr', ko: 1}, {
                            callback: function() {
                                M.account = null;
                                /* clear account cache */
                                $activeSessionsRows.find('.settings-logout').remove();
                                $activeSessionsRows.find('.active-session-txt')
                                    .removeClass('active-session-txt').addClass('expired-session-txt').text(l[1664]);
                                $('.fm-close-all-sessions').hide();
                                loadingDialog.hide();
                            }
                        });
                    }
                });
            });

            $('.settings-logout').rebind('click', function() {

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
                                .addClass('expired-session-txt').text(l[1664]);
                            loadingDialog.hide();
                        }
                    });
                }
            });

            $('.fm-account-security .account-history-dropdown-button').rebind('click', function() {

                $(this).addClass('active');
                $('.account-history-dropdown').addClass('hidden');
                $(this).next().removeClass('hidden');
            });

            $('.fm-account-security .account-history-drop-items').rebind('click', function() {

                $(this).parent().prev().removeClass('active');
                $(this).parent().find('.account-history-drop-items').removeClass('active');
                $(this).parent().parent().find('.account-history-dropdown-button').text($(this).text());

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

                $(this).addClass('active');
                $(this).closest('.account-history-dropdown').addClass('hidden');
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
            var status = '<span class="current-session-txt">' + l[7665] + '</span>';    // Current

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            if (browser.isExtension) {
                browserName += ' (+' + l[7683] + ')';
            }

            // If not the current session
            if (!currentSession) {
                if (activeSession) {
                    status = '<span class="active-session-txt">' + l[23754] + '</span>';     // Logged-in
                }
                else {
                    status = '<span class="expired-session-txt">' + l[1664] + '</span>';    // Expired
                }
            }

            // If unknown country code use question mark png
            if (!country.icon || country.icon === '??.png') {
                country.icon = 'ud.png';
            }

            // Generate row html
            var html = '<tr class="' + (currentSession ? "current" : sessionId) + '">'
                + '<td class="browser-os"><span class="fm-browsers-icon"><img title="'
                + escapeHTML(userAgent.replace(/\s*megext/i, ''))
                + '" src="' + staticpath + 'images/browser-icons/' + browser.icon
                + '" /></span><span class="fm-browsers-txt">' + htmlentities(browserName)
                + '</span></td>'
                + '<td class="ip-addr">' + ipAddress + '</td>'
                + '<td><span class="fm-flags-icon"><img alt="" src="' + staticpath + 'images/flags/'
                + country.icon + '" style="margin-left: 0px;" /></span><span class="fm-flags-txt">'
                + htmlentities(country.name) + '</span></td>'
                + '<td class="date-time">' + dateTime + '</td>'
                + '<td>' + status + '</td>';

            // If the session is active show logout button
            if (activeSession) {
                html += '<td>' + '<span class="settings-logout">' + l[967] + '</span>' + '</td></tr>';
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
                    var DomList =  $('.grid-table.sessions').find('tr');
                    // update table when it has new active session or forced
                    if (fSession && (($(DomList[1]).hasClass('current') && !fSession[5])
                        || !$(DomList[1]).hasClass(fSession[6])) || force) {
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
                $('#versioning-status').parent(),
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

            $('#delete-all-versions').rebind('click', function() {

                if (!$(this).hasClass('disabled')) {
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

            var $rubschedParent = $('#rubsched').parent();
            var $rubschedGreenNoti = $('.rub-grn-noti');
            var $rubschedOptions = $('.rubsched-options');

            var initRubschedSwitch = function(defaultValue) {
                accountUI.inputs.switch.init(
                    '#rubsched',
                    $('#rubsched').parent(),
                    defaultValue,
                    function(val) {
                        if (val) {
                            $('#rubsched').parents('.slide-in-out').removeClass('closed');
                            $rubschedParent.addClass('border');
                            setTimeout(initAccountScroll, 301);

                            if (!fmconfig.rubsched) {
                                var defValue = u_attr.p ? 90 : 30;
                                var defOption = 14;
                                mega.config.setn('rubsched', defOption + ":" + defValue);
                                $('#rad' + defOption + '_opt').val(defValue);
                            }
                        }
                        else {
                            mega.config.setn('rubsched', 0);
                            $('#rubsched').parents('.slide-in-out').addClass('closed');
                            $rubschedParent.removeClass('border');
                        }
                    });
            };

            if (u_attr.flags.ssrs > 0) { // Server side scheduler - new
                $rubschedOptions.removeClass('hidden');
                $('.rubschedopt').addClass('hidden');
                $('.rubschedopt-none').addClass('hidden');

                var value = account.ssrs ? account.ssrs : (u_attr.p ? 90 : 30);

                $('#rad14_opt').val(value);

                if (!value) {
                    $rubschedOptions.addClass('hidden');
                }

                // show/hide on/off switches
                if (u_attr.p) {
                    $rubschedParent.removeClass('hidden');
                    $rubschedGreenNoti.addClass('hidden');
                    $('.rubbish-desc').text(l[18685]).removeClass('hidden');
                    $('.account.rubbish-cleaning .settings-right-block').addClass('slide-in-out');

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
                    $('.rubbish-desc').text(l[18686]).removeClass('hidden');
                    $('.account.rubbish-cleaning .settings-right-block').removeClass('slide-in-out');
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
                    $('.rubschedopt').removeClass('hidden');

                    var opt = String(fmconfig.rubsched).split(':');
                    $('#rad' + opt[0] + '_opt').val(opt[1]);

                    accountUI.inputs.radio.init(
                        '.rubschedopt',
                        $('.rubschedopt').parent(),
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

            $('.rubsched_textopt').rebind('click.rs blur.rs keypress.rs', function(e) {

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

            var initVal = fmconfig.ulddd === undefined ? 1 : 0;

            accountUI.inputs.switch.init(
                '#ulddd',
                $('#ulddd').parent(),
                initVal,
                function(val) {
                    val = val === 1 ? undefined : val;
                    mega.config.setn('ulddd', val);
                });
        }
    }
};

accountUI.transfers = {

    init: function(account) {

        'use strict';

        this.$page = $('.fm-account-sections.fm-account-transfers');

        // Upload and Download - Bandwidth
        this.uploadAndDownload.bandwidth.render(account);

        // Upload and Download - Upload
        this.uploadAndDownload.upload.render();
        this.uploadAndDownload.upload.bindEvents();

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

                    $('#bandwidth-slider').slider({
                        min: 0, max: 100, range: 'min', value: bandwidthLimit,
                        change: function(e, ui) {
                            if (M.currentdirid === 'account/transfers') {
                                bandwidthLimit = ui.value;

                                if (parseInt(localStorage.bandwidthLimit) !== bandwidthLimit) {

                                    var done = delay.bind(null, 'bandwidthLimit', function() {
                                        api_req({"a": "up", "srvratio": Math.round(bandwidthLimit)});
                                        if (localStorage.bandwidthLimit !== undefined) {
                                            showToast('settings', l[16168]);
                                        }
                                        localStorage.bandwidthLimit = bandwidthLimit;
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
                            $('.slider-percentage span').text(ui.value + ' %');

                            if (ui.value > 90) {
                                $('.slider-percentage span').addClass('warn bold');
                            }
                            else {
                                $('.slider-percentage span').removeClass('bold warn');
                            }
                        }
                    });
                    $('.slider-percentage span').text(bandwidthLimit + ' %');
                    $('.bandwith-settings').removeClass('disabled').addClass('border');
                    $('.slider-percentage-bl').removeClass('hidden');
                    $('.band-grn-noti').addClass('hidden');
                }
                // Business account
                else if (u_attr.b) {
                    $('.bandwith-settings').addClass('hidden');
                    $('.slider-percentage-bl').addClass('hidden');
                    $('.band-grn-noti').addClass('hidden');
                }
            }
        },

        upload: {

            render: function() {

                'use strict';

                // Parallel upload slider
                $('#slider-range-max').slider({
                    min: 1, max: 6, range: "min", value: fmconfig.ul_maxSlots || 4,
                    change: function(e, ui) {
                        if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.ul_maxSlots) {
                            mega.config.setn('ul_maxSlots', ui.value);
                            ulQueue.setSize(fmconfig.ul_maxSlots);
                        }
                    },
                    slide: function(e, ui) {
                        $('.download-settings .numbers.active').removeClass('active');
                        $('.download-settings .numbers.val' + ui.value).addClass('active');
                    }
                });

                $('.upload-settings .numbers.active').removeClass('active');
                $('.upload-settings .numbers.val' + $('#slider-range-max').slider('value')).addClass('active');

                // Speed limit
                fmconfig.ul_maxSpeed = fmconfig.ul_maxSpeed || 0;
                var currentVal = parseInt(fmconfig.ul_maxSpeed) < 1 ? fmconfig.ul_maxSpeed : 1;

                if (currentVal === 1) {
                    $('#ulspeedvalue').val(fmconfig.ul_maxSpeed / 1024);
                }
                else if (!$('#ulspeedvalue').val()){
                    $('#ulspeedvalue').val(100);
                }

                accountUI.inputs.radio.init(
                    '.ulspeedradio',
                    $('.ulspeedradio').parent(),
                    currentVal,
                    function (val) {
                        val = parseInt(val);
                        var ul_maxSpeed = val;

                        if (val === 1) {
                            if (parseInt($('#ulspeedvalue').val()) > 0) {
                                ul_maxSpeed = parseInt($('#ulspeedvalue').val()) * 1024;
                            }
                            else {
                                ul_maxSpeed = 100 * 1024;
                            }
                        }

                        showToast('settings', l[16168]);
                        mega.config.setn('ul_maxSpeed', ul_maxSpeed);
                    }
                );
            },

            bindEvents: function() {

                'use strict';

                $('#ulspeedvalue').rebind('click.speedValueClick keyup.speedValueKeyup', function() {

                    $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
                    $('#rad3,#rad3_div').addClass('radioOn').removeClass('radioOff');
                    $('#rad3').trigger('click');
                });
            }
        },

        download: {

            render: function() {

                'use strict';

                // Parallel download slider
                $('#slider-range-max2').slider({
                    min: 1, max: 6, range: "min", value: fmconfig.dl_maxSlots || 4,
                    change: function(e, ui) {
                        if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.dl_maxSlots) {
                            mega.config.setn('dl_maxSlots', ui.value);
                            dlQueue.setSize(fmconfig.dl_maxSlots);
                        }
                    },
                    slide: function(e, ui) {
                        $('.upload-settings .numbers.active').removeClass('active');
                        $('.upload-settings .numbers.val' + ui.value).addClass('active');
                    }
                });

                $('.download-settings .numbers.active').removeClass('active');
                $('.download-settings .numbers.val' + $('#slider-range-max2').slider('value')).addClass('active');
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
                    $('#dlThroughMEGAsync').parent(),
                    fmconfig.dlThroughMEGAsync,
                    function(val) {
                        mega.config.setn('dlThroughMEGAsync', val);
                    });

                megasync.isInstalled(function(err, is) {

                    if (!err && is) {
                        $('.green-notification', $section).addClass('hidden');
                    }
                    else {
                        $('.green-notification', $section).removeClass('hidden');
                    }
                });
            }
        }
    },

    addDownloadFolderSetting: function() {

        'use strict';

        if (is_chrome_firefox && !$('#acc_dls_folder').length) {
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
            $('#acc_dls_folder').append($('<span/>').text(fld && fld.path));
            $('#acc_dls_folder input').click(function() {

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
        $.tresizer();

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
    },

    status: {

        render: function(presenceInt, autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen) {

            'use strict';

            // Chat
            var $sectionContainerChat = $('.fm-account-contact-chats');
            // Status appearance radio buttons
            accountUI.inputs.radio.init(
                '.chatstatus',
                $('.chatstatus').parent(),
                presenceInt.getPresence(u_handle),
                function(newVal) {
                    presenceInt.setPresence(parseInt(newVal));
                });

            // Last seen switch
            accountUI.inputs.switch.init(
                '#last-seen',
                $sectionContainerChat,
                lastSeen,
                function(val) {
                    presenceInt.userPresence.ui_enableLastSeen(Boolean(val));
                });

            if (autoawaytimeout !== false) {
                // Auto-away switch
                accountUI.inputs.switch.init(
                    '#auto-away-switch',
                    $sectionContainerChat,
                    autoaway,
                    function(val) {
                        presenceInt.userPresence.ui_setautoaway(Boolean(val));
                    });

                // Prevent changes to autoaway if autoawaylock is set
                if (autoawaylock === true) {
                    $('#auto-away-switch').addClass('diabled').parent().addClass('hidden');
                }
                else {
                    $('#auto-away-switch').removeClass('diabled').parent().removeClass('hidden');
                }

                // Auto-away input box
                $('input#autoaway').val(autoawaytimeout / 60);

                // Always editable for user comfort -
                accountUI.controls.enableElement($('input#autoaway', $sectionContainerChat));

                // Persist switch
                accountUI.inputs.switch.init(
                    '#persist-presence-switch',
                    $sectionContainerChat,
                    persist,
                    function(val) {
                        presenceInt.userPresence.ui_setpersist(Boolean(val));
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
                var $sectionContainerChat = $('.fm-account-contact-chats');
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
            accountUI.inputs.switch.init(
                '#richpreviews',
                $('#richpreviews').parent(),
                RichpreviewsFilter.previewGenerationConfirmation,
                function(val) {
                    if (val) {
                        RichpreviewsFilter.confirmationDoConfirm();
                    }
                    else {
                        RichpreviewsFilter.confirmationDoNever();
                    }
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

            if (!$.voucherlimit) {
                $.voucherlimit = 10;
            }

            var email = 'resellers@mega.nz';

            $('.resellerbuy').attr('href', 'mailto:' + email)
                .find('span').text(l[9106].replace('%1', email));

            // Use 'All' or 'Last 10/100/250' for the dropdown text
            var buttonText = ($.voucherlimit === 'all') ? l[7557] : l['466a'].replace('[X]', $.voucherlimit);

            $('.account-history-dropdown-button.vouchers').text(buttonText);
            $('.fm-account-reseller .balance span').safeHTML('@@ &euro; ', account.balance[0][0]);
            $('.account-history-drop-items.voucher10-').text(l['466a'].replace('[X]', 10));
            $('.account-history-drop-items.voucher100-').text(l['466a'].replace('[X]', 100));
            $('.account-history-drop-items.voucher250-').text(l['466a'].replace('[X]', 250));

            // Sort vouchers by most recently created at the top
            M.account.vouchers.sort(function(a, b) {

                if (a['date'] < b['date']) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.grid-table.vouchers tr').remove();

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

                html += '<tr><td>' + time2date(el.date) + '</td><td class="selectable">' + voucherLink
                    + '</td><td>&euro; ' + htmlentities(el.amount) + '</td><td>' + status + '</td></tr>';
            });

            $('.grid-table.vouchers').safeHTML(html);
            $('.default-select.vouchertype .default-select-scroll').text('');
            $('.default-select.vouchertype span').text(l[6875]);

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
            for (i = 0; i < prices.length; i++) {
                voucheroptions += '<div class="default-dropdown-item" data-value="' + htmlentities(prices[i])
                    + '">&euro;' + htmlentities(prices[i]) + ' voucher</div>';
            }
            $('.default-select.vouchertype .default-select-scroll').safeHTML(voucheroptions);
        },

        bindEvents: function() {

            'use strict';

            $('.vouchercreate').rebind('click..voucherCreateClick', function() {
                var vouchertype = $('.default-select.vouchertype .default-dropdown-item.active').attr('data-value');
                var voucheramount = parseInt($('#account-voucheramount').val());
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

            $('.fm-account-reseller .account-history-dropdown-button').rebind('click', function() {

                $(this).addClass('active');
                $('.account-history-dropdown').addClass('hidden');
                $(this).next().removeClass('hidden');
            });

            $('.fm-account-reseller .account-history-drop-items').rebind('click', function() {

                var $parent = $(this).parent();
                $parent.find('.account-history-drop-items').removeClass('active');
                $parent.prev('.default-select.vouchers').text($(this).text()).removeClass('active');

                var c = $(this).attr('class') ? $(this).attr('class') : '';

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

                $(this).addClass('active');
                $(this).closest('.account-history-dropdown').addClass('hidden');
                accountUI();
            });

            bindDropdownEvents($('.default-select.vouchertype'), 0, '.fm-account-reseller');
        }
    }
};
