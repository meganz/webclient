accountUI.plan = {

    init(account) {
        'use strict';

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

        const $upgradeToProBtn = $('.upgrade-to-pro', $planContent);

        // check if business account
        if (u_attr && u_attr.b) {
            if (!u_attr.b.m || u_attr.b.s === -1) {
                $('.acc-storage-space', $planContent).addClass('hidden');
                $('.acc-bandwidth-vol', $planContent).addClass('hidden');
            }
            $('.btn-achievements', $planContent).addClass('hidden');
            $('.data-block.account-balance', $planContent).addClass('hidden');
            $('.acc-setting-menu-balance-acc', '.content-panel.account').addClass('hidden');
            $upgradeToProBtn.addClass('hidden');

            // If Business Master account and if Expired or in Grace Period, show the Reactive Account button
            if (u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_ENABLED) {
                $upgradeToProBtn.removeClass('hidden');
                $('span', $upgradeToProBtn).text(l.reactivate_account);
            }
        }

        // If Pro Flexi
        if (u_attr && u_attr.pf) {

            // Hide the Upgrade Account button and Account Balance section on the Plan page
            $upgradeToProBtn.addClass('hidden');
            $('.data-block.account-balance', $planContent).addClass('hidden');

            // Hide Storage space and Transfer quota blocks like Business (otherwise shows 4096 PB which is incorrect)
            if (u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED) {
                $('.acc-storage-space', $planContent).addClass('hidden');
                $('.acc-bandwidth-vol', $planContent).addClass('hidden');
            }

            // If Expired or in Grace Period, show the Reactive Account button
            if (u_attr.pf.s !== pro.ACCOUNT_STATUS_ENABLED) {
                $upgradeToProBtn.removeClass('hidden');
                $('span', $upgradeToProBtn).text(l.reactivate_account);
            }
        }

        const $btnBlock = $upgradeToProBtn.parent();
        $btnBlock.toggleClass('hidden', $btnBlock.children().filter('.hidden').length === $btnBlock.children().length);
    },

    accountType: {

        render(account) {

            'use strict';

            var $planContent = $('.data-block.account-type', accountUI.$contentBlock);

            this.renderAccountDetails($planContent, account);
            this.renderFeatureBlocks($planContent, account);

            /* achievements */
            if (!account.maf ||
                (u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS && u_attr.b && u_attr.b.m) ||
                (u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI && u_attr.pf)) {

                $('.btn-achievements', $planContent).addClass('hidden');

                // If active Business master account or active Pro Flexi account
                if ((u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS && u_attr.b && u_attr.b.m) ||
                    (u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI && u_attr.pf)) {

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
                        let storageQuota = (base || 3) * 1048576; // MB
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

        /**
         * @param {jQuery} $planContent The jQuery element to render the block into
         * @param {Object} account Account data to work with
         * @returns {void}
         */
        renderAccountDetails($planContent, account) {
            'use strict';

            if (u_attr.p) { // Pro/Lite/Business account
                var planNum = u_attr.p;
                var planText = pro.getProPlanName(planNum);

                // if this is p=100 business
                if (planNum === pro.ACCOUNT_LEVEL_BUSINESS) {
                    $('.account.plan-info.accounttype', $planContent).addClass('business');
                    $('.fm-account-plan .acc-renew-date-info', $planContent).removeClass('border');
                }
                else {
                    $('.account.plan-info.accounttype', $planContent).removeClass('business');
                    $('.fm-account-plan .acc-renew-date-info', $planContent).addClass('border');
                }

                // Account type
                $('.account.plan-info.accounttype span', $planContent).text(planText);
                $('.account .plan-icon', $planContent).addClass(`pro${planNum}`);

                // Subscription
                if (account.stype === 'S') {
                    const activeSubscription = Array.isArray(account.plans)
                        && account.plans[0].subid
                        && Array.isArray(account.subs)
                        && account.subs.find(({ id }) => id === account.plans[0].subid)
                        || null;

                    this.renderSubscription(activeSubscription, $planContent);
                }
                else if (account.stype === 'O') {

                    var expiryTimestamp = account.nextplan ? account.nextplan.t : account.expiry;

                    // one-time or cancelled subscription
                    $('.subtitle-txt.expiry-txt', $planContent).text(l[987]);
                    $('.account.plan-info.expiry span', $planContent).text(time2date(expiryTimestamp, 2));
                    $('.sub-container.subscription:not(.feature)', $planContent).addClass('hidden');
                }

                this.renderExtraSubscriptions(account, $planContent);

                $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
            }
            else { // Free account
                $('.account.plan-info.accounttype span', $planContent).text(l[1150]);
                $('.account .plan-icon', $planContent).addClass('free');
                $('.account.plan-info.expiry', $planContent).text(l[436]);
                $('.sub-container.subscription:not(.feature)', $planContent).addClass('hidden');
                if (account.mxfer) {
                    $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
                }
                else {
                    $('.account.plan-info.bandwidth', $planContent).parent().addClass('hidden');
                }
            }

            // If Business or Pro Flexi, override to show the name (even if expired i.e. when u_attr.p is undefined)
            if (u_attr.b || u_attr.pf) {
                $('.account.plan-info.accounttype', $planContent).addClass('business');
                $('.account.plan-info.accounttype span', $planContent).text(
                    pro.getProPlanName(u_attr.b ? pro.ACCOUNT_LEVEL_BUSINESS : pro.ACCOUNT_LEVEL_PRO_FLEXI)
                );
            }
        },

        /**
         * @param {Array<String|Number>} vpnPlan The plan details
         * @param {jQuery} $planContent The jQuery element to render the block into
         * @param {Object} account Account data to work with
         * @returns {void}
         */
        renderVpnPlanBlock(vpnPlan, $planContent, account) {
            'use strict';

            const activeSubscription = account.subs
                && account.subs.find(
                    ({ al, features }) => al === pro.ACCOUNT_LEVEL_FEATURE
                        && features.vpn
                        && Object.keys(features).length === 1
                );

            if (!activeSubscription && u_attr && u_attr.p) {
                return;
            }

            const $rightBlock = $('.settings-right-block', $planContent);
            let vpnBlock = $rightBlock.children('div.vpn-details')[0];

            if (vpnBlock) {
                $(vpnBlock).remove();
            }

            vpnBlock = document.createElement('div');
            vpnBlock.className = 'vpn-details';

            const sections = [
                {
                    label: l[16166],
                    value: l.pr_vpn_title
                }
            ];

            if (activeSubscription) {
                sections.push({
                    label: l[6971],
                    value: time2date(activeSubscription.next, 2)
                });
            }
            else {
                sections.push({
                    label: l[987],
                    value: time2date(vpnPlan[0], 2),
                    expires: true
                });
            }

            for (let i = 0; i < sections.length; i++) {
                const { label, value, expires } = sections[i];
                const section = this.renderSubSection(label, value, expires);
                vpnBlock.appendChild(section);
            }

            if (activeSubscription) {
                const section = this.renderSubBtnSection(() => {
                    if (activeSubscription.gwid === 2 || activeSubscription.gwid === 3) {
                        msgDialog('warninga', l[7179], l[16501]);
                        return;
                    }

                    const dialog = new MDialog({
                        dialogClasses: 'cancel-subscription-benefits',
                        titleClasses: 'pl-4',
                        ok: {
                            label: l.vpn_keep_plan,
                            callback: nop
                        },
                        cancel: {
                            label: l.cancel_pro_continue,
                            callback: (status) => {
                                if (status === false) {
                                    return;
                                }

                                delay('megaVpnCancel', () => {
                                    const { cancelSubscriptionDialog } = accountUI.plan.accountType;
                                    cancelSubscriptionDialog.init(activeSubscription, section);
                                    cancelSubscriptionDialog.$dialog.removeClass('hidden');
                                    cancelSubscriptionDialog.$benefitsCancelDialog.addClass('hidden');
                                });
                            }
                        },
                        setContent() {
                            const div = document.createElement('div');
                            div.className = 'cancel-subscription-benefits-content px-6';

                            const info = document.createElement('div');
                            info.className = 'cancel-subscription-info';
                            info.textContent = l.vpn_cancel_confirm_txt1;

                            const table = document.createElement('div');
                            const header = document.createElement('div');
                            const content = document.createElement('div');
                            table.className = 'features-table';
                            header.className = 'features-table-header';
                            content.className = 'features-table-content';

                            const th1 = document.createElement('div');
                            const th2 = document.createElement('div');
                            const th3 = document.createElement('div');
                            th1.className = 'features-table-header-content';
                            th2.className = 'features-table-header-content center';
                            th3.className = 'features-table-header-content center plan-name';
                            th1.textContent = l[23377];
                            th2.textContent = l.no_vpn;
                            th3.textContent = l.pr_vpn_title;

                            header.appendChild(th1);
                            header.appendChild(th2);
                            header.appendChild(th3);
                            table.appendChild(header);
                            table.appendChild(content);
                            div.appendChild(info);
                            div.appendChild(table);

                            const features = [
                                l.vpn_cancel_subfeature1,
                                l.vpn_cancel_subfeature2,
                                l.vpn_cancel_subfeature3,
                                l.vpn_cancel_subfeature4
                            ];

                            for (let i = 0; i < features.length; i++) {
                                if (i) {
                                    const separator = document.createElement('div');
                                    separator.className = 'features-table-seperator';
                                    content.appendChild(separator);
                                }

                                const td1 = document.createElement('div');
                                const td2 = document.createElement('div');
                                const td3 = document.createElement('div');
                                td1.className = 'features-table-item title';
                                td2.className = 'features-table-item center';
                                td3.className = 'features-table-item center';

                                td1.textContent = features[i];

                                const crossIcon = document.createElement('i');
                                const checkIcon = document.createElement('i');
                                crossIcon.className = 'tiny-icon red-cross';
                                checkIcon.className = 'small-icon icons-sprite bold-green-tick';

                                td2.appendChild(crossIcon);
                                td3.appendChild(checkIcon);

                                content.appendChild(td1);
                                content.appendChild(td2);
                                content.appendChild(td3);
                            }

                            this.slot = div;
                            this.title = l.vpn_cancel_confirm_title1;
                        }
                    });

                    dialog.show();
                });

                vpnBlock.appendChild(section);
            }

            $rightBlock[0].appendChild(vpnBlock);
        },

        /**
         * @param {jQuery} $planContent The jQuery element to render the block into
         * @param {object} account Account data to work with
         * @returns {void}
         */
        renderFeatureBlocks($planContent, account) {
            'use strict';

            if (!u_attr || u_attr.b) {
                $('.pro-extras').addClass('hidden');
                return;
            }

            const allowedPlans = new Set([...pro.filter.simple.proPlans, ...pro.filter.simple.miniPlans]);

            // Showing available features for a Pro account
            $('.pro-extras')
                .toggleClass('hidden', !allowedPlans.has(u_attr.p));

            const vpnPlan = pro.proplan2.getUserFeature('vpn');

            if (vpnPlan) {
                this.renderVpnPlanBlock(vpnPlan, $planContent, account);
            }
        },

        renderSubSection(label, value, expires, extraClasses) {
            'use strict';

            const section = document.createElement('div');
            section.className = 'settings-sub-section';

            if (extraClasses) {
                section.className += ` ${extraClasses}`;
            }

            const labelEl = document.createElement('div');
            labelEl.className = 'subtitle-txt';
            labelEl.textContent = label;

            const valueEl = document.createElement('div');
            valueEl.className = `account plan-info ${expires && ' expires' || ''}`;
            const valueSpan = document.createElement('span');
            valueSpan.className = (expires) ? 'red' : '';
            valueSpan.textContent = value;

            valueEl.appendChild(valueSpan);
            section.appendChild(labelEl);
            section.appendChild(valueEl);
            return section;
        },

        renderSubBtnSection(callback) {
            'use strict';

            const section = document.createElement('div');
            section.className = 'settings-sub-section sub-container feature'
                + ' subscription justify-end border btn-cancel-sub';

            const cancelBtn = new MButton(l[7165], null, callback, 'mega-button');
            section.appendChild(cancelBtn.el);

            return section;
        },

        renderExtraSubscriptions(account, $planContent) {
            'use strict';

            const $rightBlock = $('.settings-right-block', $planContent);

            if ($('.extra-sub', $rightBlock).length) {
                return; // Rendered already
            }

            const activeSubId = account.plans && account.plans[0].subid || null;
            const extraSubs = account.subs
                .filter(({ al, id }) => al !== pro.ACCOUNT_LEVEL_FEATURE && (activeSubId !== id));

            for (let i = 0; i < extraSubs.length; i++) {
                const { id, al, next, gwid } = extraSubs[i];
                const subBlock = document.createElement('div');
                subBlock.id = `extra-sub-${id}`;
                subBlock.className = 'extra-sub';

                const sections = [
                    { label: l[16166], value: pro.getProPlanName(al) },
                    { label: l[6971], value: time2date(next, 2), classes: 'acc-renew-date-info' }
                ];

                for (let j = 0; j < sections.length; j++) {
                    const { label, value, classes } = sections[j];
                    const section = this.renderSubSection(label, value, false, classes);
                    subBlock.appendChild(section);
                }

                const btnSection = this.renderSubBtnSection(() => {
                    if (gwid === 2 || gwid === 3) {
                        msgDialog('warninga', l[7179], l[16501]);
                        return;
                    }

                    accountUI.plan.accountType.cancelSubscriptionDialog.init(extraSubs[i], subBlock);
                });
                subBlock.appendChild(btnSection);

                $rightBlock[0].appendChild(subBlock);
            }
        },

        renderSubscription(sub, $planContent) {
            'use strict';

            // Get the date their subscription will renew
            var timestamp = sub && sub.next || 0; // Timestamp e.g. 1493337569
            var paymentType = sub && sub.gw || ''; // Credit Card etc
            var gatewayId = sub && sub.gwid || null; // Gateway ID e.g. 15, etc

            if (paymentType.indexOf('Credit Card') === 0) {
                paymentType = paymentType.replace('Credit Card', l[6952]);
            }

            // Display the date their subscription will renew if known
            if (timestamp > 0) {
                var dateString = time2date(timestamp, 2);

                // Use format: 14 March 2015 - Credit Card
                paymentType = `${dateString} - ${paymentType}`;

                // Change placeholder 'Expires on' to 'Renews'
                $('.subtitle-txt.expiry-txt', $planContent).text(l[6971]);
                $('.account.plan-info.expiry', $planContent).text(paymentType);
            }
            else {
                // Otherwise show nothing
                $('.account.plan-info.expiry', $planContent).text('');
                $('.subtitle-txt.expiry-txt', $planContent).text('');
            }

            var $subscriptionBlock = $('.sub-container.subscription:not(.feature)', $planContent);
            var $cancelSubscriptionButton = $('.btn-cancel-sub', $subscriptionBlock);
            var $achievementsButton = $('.btn-achievements', $planContent);

            if (!M.maf) {
                $achievementsButton.addClass('hidden');
            }

            // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
            if ((gatewayId === 2) || (gatewayId === 3)) {

                // Tell them they need to cancel their plan off-site and don't show the feedback dialog
                $subscriptionBlock.removeClass('hidden');
                $cancelSubscriptionButton.rebind('click', () => {
                    msgDialog('warninga', l[7179], l[16501]);
                });
            }

            // Otherwise if ECP, Sabadell, or Stripe
            else if (gatewayId === 16 || gatewayId === 17 || gatewayId === 19) {
                // Show cancel button and show cancellation dialog
                $cancelSubscriptionButton.rebind('click', () => {
                    accountUI.plan.accountType.cancelSubscriptionDialog.init(
                        sub,
                        document.querySelector('.accounttype .plan-details')
                    );
                    eventlog(500416);
                });
            }

            $subscriptionBlock.toggleClass('hidden', !sub || u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS);
        },

        bindEvents() {

            'use strict';

            $('.btn-achievements', accountUI.$contentBlock).rebind('click', () => {
                mega.achievem.achievementsListDialog();
                eventlog(500483);
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
            $options: null,
            $formContent: null,
            $selectReasonDialog: null,
            $selectCanContactError: null,
            $invalidDetailsDialog: null,
            $continueButton: null,
            $textareaAndErrorDialog: null,
            $textarea: null,
            $cancelReason: null,
            $expiryTextBlock: null,
            $expiryDateBlock: null,

            /**
             * Initialise the dialog
             * @param {Object} [subscription] Subscription to use for the cancellation request
             * @param {HTMLDivElement} expContainer The container containing the expiration information
             * @returns {void}
             */
            init(subscription, expContainer) {

                'use strict';

                // Cache some selectors
                this.$benefitsCancelDialog = $('.cancel-subscription-benefits');
                this.$dialog = $('.cancel-subscription-st1');
                this.$dialogSuccess = $('.cancel-subscription-st2');
                this.$accountPageCancelButton = $('.btn-cancel-sub', $(expContainer));
                this.$formContent = this.$dialog.find('section.content');
                this.$selectReasonDialog = this.$dialog.find('.error-banner.select-reason');
                this.$selectCanContactError = $('.error-banner.select-can-contact', this.$dialog);
                this.$invalidDetailsDialog = this.$dialog.find('.error-banner.invalid-details');
                this.$continueButton = this.$dialog.find('.cancel-subscription');
                this.$textareaAndErrorDialog = this.$dialog.find('.textarea-and-banner');
                this.$textarea = this.$dialog.find('textarea');
                this.$cancelReason = $('.cancel-textarea-bl', this.$textareaAndErrorDialog);
                this.$backgroundOverlay = $('.fm-dialog-overlay');
                this.$expiryTextBlock = $(expContainer.querySelector('.acc-renew-date-info .subtitle-txt'));
                this.$expiryDateBlock = $(expContainer.querySelector('.acc-renew-date-info .plan-info'));

                const options = {
                    temp_plan: 1,
                    too_expensive: 2,
                    too_much_storage_quota: 3,
                    lack_of_features: 4,
                    switching_provider: 5,
                    difficult_to_use: 6,
                    poor_support: 7,
                    cant_afford: 9,
                    no_sub: 10,
                };

                // Shuffle the options
                const optionArray = Object.keys(options);
                for (let i = optionArray.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionArray[i], optionArray[j]] = [optionArray[j], optionArray[i]];
                }

                const $template = $('.cancel-subscription-radio-template', this.$dialog);
                const $optionArea = $('.content-block form.cancel-options', this.$dialog);
                $optionArea.children('.built-option').remove();

                for (let i = 0; i < optionArray.length; i++) {
                    const $radio = $template.clone().removeClass('hidden cancel-subscription-radio-template');
                    $('#subcancel_div', $radio).removeAttr('id');
                    $('#subcancel', $radio).val(options[optionArray[i]]).removeAttr('id');
                    $('.radio-txt', $radio).text(l[`cancel_sub_${optionArray[i]}_reason`]);
                    $optionArea.safePrepend($radio.prop('outerHTML'));
                }

                this.$options = this.$dialog.find('.label-wrap');
                this.$allowContactOptions = $('.allow-contact-wrapper', this.$dialog);

                // Show benefits dialog before cancellation dialog if user does not have Pro Flex or Business
                if (pro.filter.simple.canSeeCancelBenefits.has(subscription && subscription.al || M.account.slevel)) {
                    this.displayBenefits();
                }
                else {
                    this.$dialog.removeClass('hidden');
                    this.initUpdateDialogScrolling(this.$formContent);
                }
                this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

                // Init textarea scrolling
                initTextareaScrolling($('.cancel-textarea textarea', this.$dialog));

                // Init functionality
                this.resetCancelSubscriptionForm();
                this.checkReasonEnteredIsValid();
                this.initClickReason();
                this.initClickContactConfirm();
                this.initCloseAndDontCancelButtons();

                this.$continueButton.rebind('click', () => {
                    this.sendSubCancelRequestToApi(subscription && subscription.id || null);
                    eventlog(500421);
                });
            },

            /**
             * Initialise or update the scrollbar for the cancellation survey form
             */
            initUpdateDialogScrolling: ($formContent) => {
                'use strict';

                if ($formContent.is('.ps')) {
                    $formContent.scrollTop(0);
                }
                else {
                    Ps.initialize($formContent[0]);
                }
            },

            /**
             * Reset the form incase the user changes their mind and closes it,
             * so they always see a blank form if they choose to cancel their subscription again
             * @returns {void}
             */
            resetCancelSubscriptionForm() {

                'use strict';

                this.$selectReasonDialog.addClass('hidden');
                this.$selectCanContactError.addClass('hidden');
                this.$invalidDetailsDialog.addClass('hidden');
                this.$textareaAndErrorDialog.addClass('hidden');
                this.$dialog.removeClass('textbox-open error-select-reason error-select-contact');
                this.$cancelReason.removeClass('error');
                this.$textarea.val('');
                $('.cancel-option', this.$options).addClass('radioOff').removeClass('radioOn');
                $('.contact-option', this.$allowContactOptions).addClass('radioOff').removeClass('radioOn');
            },

            async fillBenefits($keepPlanBtn) {

                'use strict';

                const callback = async(data) => {
                    let planDuration = data.scycle;
                    let subscription = data.slevel;
                    if (!planDuration || !subscription) {
                        await api.req({a: 'uq', pro: u_attr.p}).then(res => {
                            planDuration = res.result.scycle;
                            subscription = res.result.slevel;
                        });
                    }

                    // If plan duration is not an expected value, skip the benefits dialog
                    if (planDuration !== '1 M' && planDuration !== '1 Y') {
                        this.$dialog.removeClass('hidden');
                        return;
                    }

                    const $cancelDialog = this.$benefitsCancelDialog;

                    const duration = planDuration === '1 Y' ? 12 : 1;

                    const plan = pro.membershipPlans.find(plan =>
                        (plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === subscription)
                        && (plan[pro.UTQA_RES_INDEX_MONTHS] === duration));

                    this.proPlanName = pro.getProPlanName(subscription);
                    const freeStorage = bytesToSize(20 * 1024 * 1024 * 1024, 0);
                    const proStorage = bytesToSize(plan[pro.UTQA_RES_INDEX_STORAGE] * 1073741824, 0);
                    const freeTransfer = l['1149'];
                    const proTransfer = bytesToSize(plan[pro.UTQA_RES_INDEX_TRANSFER] * 1073741824, 0);
                    const rewindTxt = mega.icu.format(l.pr_up_to_days, pro.filter.simple.ninetyDayRewind
                        .has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]) ? 90 : 180);

                    $('.pro-storage', $cancelDialog).text(proStorage);
                    $('.free-storage', $cancelDialog).text(freeStorage);
                    $('.pro-transfer', $cancelDialog).text(proTransfer);
                    $('.free-transfer', $cancelDialog).text(freeTransfer);
                    $('.plan-name', $cancelDialog).text(this.proPlanName);
                    $('.rewind-pro', $cancelDialog).text(rewindTxt);
                    $('.rewind-free', $cancelDialog).text(mega.icu.format(l.days_chat_history_plural, 30));
                    $('.meet-participants', $cancelDialog).text(l.pr_meet_up_to_participants.replace('%1', 100));
                    $('.meet-duration', $cancelDialog).text(mega.icu.format(l.pr_meet_up_to_duration, 1));


                    $('span', $keepPlanBtn)
                        .text(l.cancel_pro_keep_current_plan.replace('%1', pro.getProPlanName(subscription)));

                    $cancelDialog.removeClass('hidden');
                };

                M.accountData(callback);
            },

            displayBenefits() {

                'use strict';

                const {$benefitsCancelDialog, $dialog, $backgroundOverlay, $formContent} = this;

                const $closeBtn = $('.js-close', $benefitsCancelDialog);
                const $continueBtn = $('.js-continue', $benefitsCancelDialog);
                const $keepPlanBtn = $('.js-keep-plan', $benefitsCancelDialog);

                const closeBenefits = (eventId, planNameInMsg) => {
                    $benefitsCancelDialog.addClass('hidden');
                    $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');

                    eventlog(eventId, planNameInMsg ? this.proPlanName : '');
                };

                $closeBtn.rebind('click.logEvent', () => closeBenefits(500419, false));
                $keepPlanBtn.rebind('click.logEvent', () => closeBenefits(500418, true));

                $continueBtn.rebind('click', () => {
                    $benefitsCancelDialog.addClass('hidden');
                    $dialog.removeClass('hidden');
                    this.initUpdateDialogScrolling($formContent);
                    eventlog(500417);
                });
                loadingDialog.show();
                pro.loadMembershipPlans(() => {
                    this.fillBenefits($keepPlanBtn).then(() => {
                        loadingDialog.hide();
                    });
                });
            },

            /**
             * Close the dialog when either the close or "Don't cancel" buttons are clicked
             * @returns {void}
             */
            initCloseAndDontCancelButtons() {
                'use strict';

                var self = this;

                const closeSurvey = (eventId) => {
                    self.$dialog.addClass('hidden');
                    self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                    eventlog(eventId);
                };

                // Close main dialog
                $('button.dont-cancel', self.$dialog).rebind('click.logEvent', () => closeSurvey(500420));
                $('button.js-close', self.$dialog).rebind('click.logEvent', () => closeSurvey(500422));
            },

            /**
             * Set the radio button classes when a radio button or its text are clicked
             * @returns {void}
             */
            initClickReason() {
                'use strict';

                this.$options.rebind('click', (e) => {
                    const $option = $(e.currentTarget);
                    const $cancelOption = $('.cancel-option', $option);
                    const value = $('input', $option).val();
                    const valueIsOtherOption = value === "8";

                    if (!$cancelOption.hasClass('radioOn')) {
                        eventlog(500423);
                    }

                    $('.cancel-option', this.$options).addClass('radioOff').removeClass('radioOn');
                    $cancelOption.addClass('radioOn').removeClass('radioOff');

                    this.$selectReasonDialog.addClass('hidden');
                    this.$dialog.removeClass('error-select-reason');
                    this.$textareaAndErrorDialog.toggleClass('hidden', !valueIsOtherOption);
                    this.$dialog.toggleClass('textbox-open', valueIsOtherOption);

                    if (valueIsOtherOption) {
                        this.$invalidDetailsDialog.toggleClass('hidden', !(this.$cancelReason.hasClass('error')));

                        this.$formContent.scrollTop(this.$formContent.height());
                        this.$textarea.trigger('focus');
                    }
                    else {
                        this.$invalidDetailsDialog.addClass('hidden');
                        this.$textarea.trigger('blur');
                    }
                });
            },

            initClickContactConfirm() {

                'use strict';

                this.$allowContactOptions.rebind('click', (e) => {

                    const $option = $(e.currentTarget);
                    const $contactOption = $('.contact-option', $option);

                    if (!$contactOption.hasClass('radioOn')) {
                        const eventId = $('input', $option).val() === '1' ? 500424 : 500425;
                        eventlog(eventId);
                    }

                    $('.contact-option', this.$allowContactOptions).addClass('radioOff').removeClass('radioOn');
                    $contactOption.addClass('radioOn').removeClass('radioOff');

                    this.$selectCanContactError.addClass('hidden');
                    this.$dialog.removeClass('error-select-contact');
                });
            },

            /**
             * Close success dialog
             * @returns {void}
             */
            initCloseButtonSuccessDialog() {
                'use strict';

                this.$dialogSuccess.find('button.js-close').rebind('click', () => {
                    this.$dialogSuccess.addClass('hidden');
                    this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                });
            },

            /**
             * Check the user has entered between 1 and 1000 characters into the text field
             * @returns {void}
             */
            checkReasonEnteredIsValid() {

                'use strict';

                this.$textarea.rebind('keyup', ({ currentTarget }) => {
                    // Trim for spaces
                    var reason = $(currentTarget).val();
                    reason = $.trim(reason);

                    const responseIsValid = reason.length > 0 && reason.length <= 1000;

                    // Make sure response is between 1 and 1000 characters
                    if (responseIsValid) {
                        this.$invalidDetailsDialog.addClass('hidden');
                        this.$cancelReason.removeClass('error');
                    }
                    else {
                        this.showTextareaError(!reason.length);
                    }
                });
            },

            /**
             * Show the user an error message below the text field if their input is
             * invalid, or too long
             * @param {Boolean} emptyReason Whether the reason is empty or not
             * @returns {void}
             */
            showTextareaError(emptyReason) {
                'use strict';

                this.$invalidDetailsDialog.removeClass('hidden');

                if (emptyReason) {
                    this.$invalidDetailsDialog.text(l.cancel_sub_empty_textarea_error_msg);
                }
                else {
                    this.$invalidDetailsDialog.text(l.cancel_sub_too_much_textarea_input_error_msg);
                }

                this.$cancelReason.addClass('error');
                this.$formContent.scrollTop(this.$formContent.height());
            },

            /**
             * Send the subscription cancellation request to the API
             * @param {String} [subscriptionId] Specific subscription ID to cancel
             * @returns {void}
             */
            sendSubCancelRequestToApi(subscriptionId) {
                'use strict';

                let reason;

                const $optionSelected = $('.cancel-option.radioOn', this.$options);
                const isReasonSelected = $optionSelected.length;

                const $selectedContactOption = $('.contact-option.radioOn', this.$allowContactOptions);
                const isContactOptionSelected = $selectedContactOption.length;

                if (!isReasonSelected || !isContactOptionSelected) {
                    if (!isReasonSelected) {
                        this.$selectReasonDialog.removeClass('hidden');
                        this.$dialog.addClass('error-select-reason');
                    }
                    if (!isContactOptionSelected) {
                        this.$selectCanContactError.removeClass('hidden');
                        this.$dialog.addClass('error-select-contact');
                    }
                    return;
                }

                const value = $('input', $optionSelected).val();
                const radioText = $('.radio-txt', $optionSelected.parent()).text().trim();
                const canContactUser = $('input', $selectedContactOption).val() | 0;

                // The cancellation reason (r) sent to the API is the radio button text, or
                // when the chosen option is "Other (please provide details)" it is
                // what the user enters in the text field
                if (value === "8") {
                    reason = this.$textarea.val().trim();

                    if (!reason.length || reason.length > 1000) {
                        this.showTextareaError(!reason.length);
                        return;
                    }
                }
                else {
                    reason = `${value} - ${radioText}`;
                }

                // Hide the dialog and show loading spinner
                this.$dialog.addClass('hidden');
                this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                loadingDialog.show();

                // Setup standard request to 'cccs' = Credit Card Cancel Subscriptions
                const ccReq = { a: 'cccs', r: reason, cc: canContactUser };
                const requests = [ccReq];

                if (subscriptionId) {
                    ccReq.sub = subscriptionId;
                }

                // If they were Pro Flexi, we need to also downgrade the user from Pro Flexi to Free
                if (u_attr && u_attr.pf) {
                    requests.push({ a: 'urpf' });
                }

                // Cancel the subscription/s
                api.req(requests).then(() => {
                    // Giving a chance to reveive an account update response from the API
                    delay('accountUI.cancelSubscriptionDialog', () => {
                        const sub = M.account.subs.find(({ id }) => id === subscriptionId);

                        // Hide loading dialog and cancel subscription button on
                        // account page, set expiry date
                        loadingDialog.hide();
                        this.$accountPageCancelButton.addClass('hidden');
                        this.$expiryTextBlock.text(l[987]);
                        this.$expiryDateBlock
                            .safeHTML('<span class="red">@@</span>', time2date(sub && sub.next || account.expiry, 2));

                        // Show success dialog
                        this.$dialogSuccess.removeClass('hidden');
                        this.$backgroundOverlay.removeClass('hidden');
                        this.$backgroundOverlay.addClass('payment-dialog-overlay');
                        this.initCloseButtonSuccessDialog();

                        // Reset account cache so all account data will be refetched
                        // and re-render the account page UI
                        M.account.lastupdate = 0;
                        accountUI();
                    }, 1e3);
                });
            }
        }
    },

    paymentCard: {

        $paymentSection: null,

        validateCardResponse(res) {
            'use strict';
            return res && (res.gw === (addressDialog || {}).gatewayId_stripe || 19) && res.brand && res.last4
                && res.exp_month && res.exp_year;
        },

        validateUser(account) {
            'use strict';
            return Array.isArray(account.subs) && account.subs.some(({ gwid }) => gwid === 19);
        },

        init(account, $planSection) {
            'use strict';

            this.$paymentSection = $('.account.account-card-info', $planSection);

            const hideCardSection = () => {
                this.$paymentSection.addClass('hidden');

                $('.settings-button .acc-setting-menu-card-info', '.content-panel.account')
                    .addClass('hidden');
            };

            // check if we should show the section (uq response)
            if (this.validateUser(account)) {
                api.req({ a: 'cci' }).then(({ result: res }) => {
                    if (typeof res === 'object' && this.validateCardResponse(res)) {
                        return this.render(res);
                    }

                    hideCardSection();
                });
            }
            else {
                hideCardSection();
            }
        },

        render(cardInfo) {
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

                    api.send('gw19_ccc')
                        .then((res) => {
                            assert(typeof res === 'string');
                            addressDialog.processUtcResult({EUR: res, edit: true}, true);
                        })
                        .catch((ex) => {
                            msgDialog('warninga', '', l.edit_card_error.replace('%1', ex), l.edit_card_error_des);
                        })
                        .finally(() => loadingDialog.hide());
                });

                this.$paymentSection.removeClass('hidden');
            }
        }

    },

    balance: {

        render(account) {

            'use strict';

            $('.account.plan-info.balance span', accountUI.$contentBlock).safeHTML(
                '&euro; @@',
                mega.intl.number.format(account.balance[0][0])
            );
        },

        bindEvents() {

            'use strict';

            $('.redeem-voucher', accountUI.$contentBlock).rebind('click', function() {
                var $this = $(this);
                if ($this.attr('class').indexOf('active') === -1) {
                    $('.fm-account-overlay').removeClass('hidden');
                    $this.addClass('active');
                    $('.fm-voucher-popup').removeClass('hidden');

                    eventlog(500486);

                    $('.fm-account-overlay, .fm-purchase-voucher, .fm-voucher-button')
                        .add('.fm-voucher-popup button.js-close')
                        .rebind('click.closeDialog', () => {
                            $('.fm-account-overlay').addClass('hidden');
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

            $('.fm-voucher-button').rebind('click.voucherBtnClick', () => {
                var $input = $('.fm-voucher-body input');
                var code = $input.val();

                $input.val('');
                loadingDialog.show();
                $('.fm-voucher-popup').addClass('hidden');

                M.require('redeem_js')
                    .then(() => redeem.redeemVoucher(code))
                    .then(() => {
                        Object(M.account).lastupdate = 0;
                        onIdle(accountUI);
                    })
                    .catch((ex) => {
                        loadingDialog.hide();
                        if (ex) {
                            let sub;
                            if (ex === ETOOMANY) {
                                ex = l.redeem_etoomany;
                            }
                            else if (ex === EACCESS) {
                                ex = l[714];
                            }
                            else if (ex < 0) {
                                ex = `${l[473]} (${ex})`;
                            }
                            else {
                                sub = ex;
                                ex = l[47];
                            }
                            msgDialog('warninga', l[135], ex, sub);
                        }
                    });
            });

            $('.fm-purchase-voucher, button.topup').rebind('click', () => {
                mega.redirect('mega.io', 'resellers', false, false, false);
                eventlog(500485);
            });
        }
    },

    history: {

        renderPurchase(account) {

            'use strict';

            var $purchaseSelect = $('.dropdown-input.purchases', accountUI.$contentBlock);

            if (!$.purchaselimit) {
                $.purchaselimit = 10;
            }

            $('span', $purchaseSelect).text(mega.icu.format(l[469], $.purchaselimit));
            $('.purchase10-', $purchaseSelect).text(mega.icu.format(l[469], 10));
            $('.purchase100-', $purchaseSelect).text(mega.icu.format(l[469], 100));
            $('.purchase250-', $purchaseSelect).text(mega.icu.format(l[469], 250));

            M.account.purchases.sort((a, b) => (a[1] < b[1]) ? 1 : -1);

            $('.data-table.purchases tr', accountUI.$contentBlock).remove();
            var html = `<tr><th>${l[476]}</th><th>${l[475]}</th><th>${l[477]}</th><th>${l[478]}</th></tr>`;
            if (account.purchases.length) {

                // Render every purchase made into Purchase History on Account page
                for (let index = 0; index < account.purchases.length; index++) {
                    const purchaseTransaction = account.purchases[index];

                    if (index === $.purchaselimit) {
                        break;
                    }

                    // Set payment method
                    const paymentMethodId = purchaseTransaction[4];
                    const paymentMethod = pro.getPaymentGatewayName(paymentMethodId).displayName;

                    let proNum = purchaseTransaction[5];

                    if (proNum === pro.ACCOUNT_LEVEL_FEATURE && purchaseTransaction[9]) {
                        proNum += Object.keys(purchaseTransaction[9])
                            .reduce((acc, v) => acc | pro.bfStandalone[v.toUpperCase()], 0);
                    }

                    // Set Date/Time, Item (plan purchased), Amount, Payment Method
                    const dateTime = time2date(purchaseTransaction[1]);
                    const price = formatCurrency(purchaseTransaction[2], 'EUR', 'narrowSymbol');
                    let planIcon;
                    const numOfMonths = purchaseTransaction[6];
                    const monthWording = numOfMonths === 1 ? l[931] : l[6788];
                    const item = `${pro.getProPlanName(proNum)} (${numOfMonths} ${monthWording})`;

                    if (proNum === pro.ACCOUNT_LEVEL_PRO_LITE) {
                        planIcon = 'icon-crest-lite';
                    }
                    else if (proNum === pro.ACCOUNT_LEVEL_BUSINESS) {
                        planIcon = 'icon-crest-business';
                    }
                    else if (proNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                        planIcon = 'icon-crest-pro-flexi';
                    }
                    else if (proNum === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                        planIcon = 'icon-crest-vpn';
                    }
                    else if (pro.filter.simple.hasIcon.has(proNum)) {
                        planIcon = `icon-crest-pro-${proNum}`;
                    }

                    // Render table row
                    html += '<tr>'
                        + '<td><div class="label-with-icon">'
                        + (planIcon ? `<i class="sprite-fm-uni ${planIcon}"></i>` : '')
                        + `<span> ${item}</span>`
                        + '</div></td>'
                        + `<td><span>${dateTime}</span></td>`
                        + `<td><span>${escapeHTML(price)}</span></td>`
                        + `<td><span>${paymentMethod}</span></td>`
                        + '</tr>';
                }
            }
            else {
                html += `<tr><td colspan="4" class="data-table-empty"><span>${l[20140]}</span></td></tr>`;
            }

            $('.data-table.purchases', accountUI.$contentBlock).safeHTML(html);
        },

        renderTransaction(account) {

            'use strict';

            var $transactionSelect = $('.dropdown-input.transactions', accountUI.$contentBlock);

            if (!$.transactionlimit) {
                $.transactionlimit = 10;
            }

            $('span', $transactionSelect).text(mega.icu.format(l[471], $.transactionlimit));
            $('.transaction10-', $transactionSelect).text(mega.icu.format(l[471], 10));
            $('.transaction100-', $transactionSelect).text(mega.icu.format(l[471], 100));
            $('.transaction250-', $transactionSelect).text(mega.icu.format(l[471], 250));

            M.account.transactions.sort((a, b) => {
                if (a[1] < b[1]) {
                    return 1;
                }

                return -1;
            });

            $('.data-table.transactions tr', accountUI.$contentBlock).remove();
            var html = `<tr><th>${l[475]}</th><th>${l[484]}</th><th>${l[485]}</th><th>${l[486]}</th></tr>`;
            if (account.transactions.length) {
                var intl = mega.intl.number;

                for (let i = 0; i < account.transactions.length; i++) {
                    const el = account.transactions[i];

                    if (i === $.transactionlimit) {
                        break;
                    }

                    var credit = '';
                    var debit = '';

                    if (el[2] > 0) {
                        credit = `<span class="green-label">&euro;${escapeHTML(intl.format(el[2]))}</span>`;
                    }
                    else {
                        debit = `<span class="red-label">&euro;${escapeHTML(intl.format(el[2]))}</span>`;
                    }
                    html += `<tr><td>${time2date(el[1])}</td><td>${htmlentities(el[0])}</td>`;
                    html += `<td>${credit}</td><td>${debit}</td></tr>`;
                }
            }
            else {
                html += `<tr><td colspan="4" class="data-table-empty">${l[20140]}</td></tr>`;
            }

            $('.data-table.transactions', accountUI.$contentBlock).safeHTML(html);
        },

        bindEvents() {

            'use strict';

            var $planSection = $('.fm-account-plan', accountUI.$contentBlock);
            var $planSelects = $('.dropdown-input', $planSection);

            // Bind Dropdowns events
            bindDropdownEvents($planSelects);

            $('.mega-input-dropdown .option', $planSection).rebind('click.accountSection', function() {

                var c = $(this).attr('class') || '';

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
