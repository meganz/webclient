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

            const $planDetails = $('.accounttype .plan-details', $planContent);

            // Find the first Pro/Business plan the user purchased
            const activeSubscription = account.subs.find(({ al, next }) =>
                next >= unixtime() && al !== pro.ACCOUNT_LEVEL_FEATURE
            );
            const activePlan = !activeSubscription && account.plans.find(({ al, expires }) =>
                expires >= unixtime() && al !== pro.ACCOUNT_LEVEL_FEATURE
            );
            const mainPlanDetails = activeSubscription || activePlan;

            if (mainPlanDetails) { // Pro/Lite/Business account
                var planNum = mainPlanDetails.al;
                var planText = pro.getProPlanName(planNum);

                // Add paid class for plan card priority (Non-feature plan > Feature plan > Free)
                $planDetails.addClass('paid').attr('subid', mainPlanDetails.id);

                // if this is p=100 business or p=101 flexi
                if (planNum === pro.ACCOUNT_LEVEL_BUSINESS || planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                    $('.account.plan-info.accounttype', $planContent).addClass('business');
                    if (planNum === pro.ACCOUNT_LEVEL_BUSINESS) {
                        $('.fm-account-plan .acc-renew-date-info', $planContent).removeClass('border');
                    }
                }
                else {
                    $('.account.plan-info.accounttype', $planContent).removeClass('business');
                    $('.fm-account-plan .acc-renew-date-info', $planContent).addClass('border');
                }

                // Account type
                $('.account.plan-info.accounttype span', $planContent).text(planText);
                $('.account .plan-icon', $planContent).addClass(`pro${planNum}`);

                // Subscription
                if (mainPlanDetails.next) {
                    this.renderSubscription(mainPlanDetails, $planContent);
                }
                // One-off or cancelled
                else if (mainPlanDetails.expires) {
                    const expiryTimestamp = M.account.expiry || mainPlanDetails.expires;

                    $('.subtitle-txt.expiry-txt', $planContent).text(l[987]);
                    $('.account.plan-info.expiry span', $planContent)
                        .addClass('red')
                        .text(time2date(expiryTimestamp, 2));
                    $('.sub-container.subscription:not(.feature)', $planContent).addClass('hidden');
                }

                this.renderExtraSubscriptions(account, $planContent);

                $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
            }
            else { // Free account
                $planDetails.removeClass('paid').attr('subid', '');
                $('.account.plan-info.accounttype span', $planContent).text(l[1150]);
                $('.account .plan-icon', $planContent).addClass('free');
                $('.account.plan-info.expiry span', $planContent).removeClass('red').text(l[436]);
                $('.sub-container.subscription:not(.feature)', $planContent).addClass('hidden');
                if (account.mxfer) {
                    $('.account.plan-info.bandwidth', $planContent).parent().removeClass('hidden');
                }
                else {
                    $('.account.plan-info.bandwidth', $planContent).parent().addClass('hidden');
                }
            }
        },

        /**
         * Render the feature plan block
         *
         * @param {jQuery} $planContent The jQuery element to render the block into
         * @param {Object} featurePlan The plan details
         * @returns {void}
         * @see pro.propay.purchasableFeaturePlans for features which can be rendered here
         */
        renderFeaturePlanBlock($planContent, featurePlan) {
            'use strict';

            const feature = Object.keys(featurePlan.features)[0];

            const $rightBlock = $('.settings-right-block', $planContent);
            const $featureBlock = $(`.feature-details.${feature}`, $rightBlock);

            // Do not display more than one plan card of the same feature (e.g. free trial
            // and standalone)
            if ($featureBlock.length) {
                return;
            }

            const featureBlock = document.createElement('div');
            featureBlock.className = `feature-details ${feature}`;

            const isTrial = featurePlan.is_trial;
            const surveyAl = pro[`ACCOUNT_LEVEL_FEATURE_${feature.toUpperCase()}`];
            const sections = [
                {
                    label: l[16166],
                    value: pro.getProPlanName(surveyAl),
                    isTrial
                },
                {
                    label: featurePlan.next ? isTrial ? l.sub_begins : l[6971] : l[987],
                    value: time2date(featurePlan.next || featurePlan.expires, 2),
                    expires: featurePlan.expires
                }
            ];

            for (let i = 0; i < sections.length; i++) {
                const { label, value, expires, isTrial } = sections[i];
                const section = this.renderSubSection(label, value, expires, null, isTrial);
                featureBlock.appendChild(section);
            }

            // If the subscription is active
            if (featurePlan.next) {
                const section = this.renderSubBtnSection(() => {
                    if (featurePlan.gwid === 2 || featurePlan.gwid === 3) {
                        msgDialog('warninga', l[7179], l.double_billing_sub_cancel);
                        return;
                    }

                    const dialog = new MDialog({
                        dialogClasses: 'cancel-subscription-benefits features',
                        titleClasses: 'pl-4',
                        ok: {
                            // Label keys:
                            // l.vpn_keep_plan
                            // l.pwm_keep_plan
                            label: l[`${feature}_keep_plan`],
                            callback: eventlog.bind(null, 500647, surveyAl)
                        },
                        cancel: {
                            label: l.cancel_pro_continue,
                            callback: (status) => {
                                if (status === false) {
                                    return;
                                }

                                eventlog(500648, surveyAl);

                                delay('megaFeatureCancel', () => {
                                    const { cancelSubscriptionDialog } = accountUI.plan.accountType;
                                    cancelSubscriptionDialog.init(featurePlan, section);
                                });
                            }
                        },
                        setContent() {
                            const div = document.createElement('div');
                            div.className = 'cancel-subscription-benefits-content mob-px-6';

                            // String keys:
                            // l.vpn_trial_cancel_confirm
                            // l.pwm_trial_cancel_confirm
                            // l.vpn_cancel_confirm_txt1
                            // l.pwm_cancel_confirm_txt1
                            const info = document.createElement('div');
                            info.className = 'cancel-subscription-info';
                            info.textContent = isTrial ?
                                l[`${feature}_trial_cancel_confirm`] :
                                l[`${feature}_cancel_confirm_txt1`];
                            div.appendChild(info);

                            const features = pro.propay.purchasableFeaturePlans()[feature];

                            if (features && features.cancelSubFeatures) {
                                const table = document.createElement('div');
                                const header = document.createElement('div');
                                const content = document.createElement('div');
                                table.className = 'features-table';
                                header.className = 'features-table-header';
                                content.className = 'features-table-content';

                                // String keys:
                                // l.no_vpn
                                // l.no_pwm
                                // l.mega_vpn
                                // l.mega_pwm
                                const th1 = document.createElement('div');
                                const th2 = document.createElement('div');
                                const th3 = document.createElement('div');
                                th1.className = 'features-table-header-content';
                                th2.className = 'features-table-header-content center';
                                th3.className = 'features-table-header-content center plan-name';
                                th1.textContent = l[23377];
                                th2.textContent = l[`no_${feature}`];
                                th3.textContent = l[`mega_${feature}`];

                                header.appendChild(th1);
                                header.appendChild(th2);
                                header.appendChild(th3);
                                table.appendChild(header);
                                table.appendChild(content);
                                div.appendChild(table);

                                const cancelSubFeatures = features.cancelSubFeatures;
                                for (let i = 0; i < cancelSubFeatures.length; i++) {
                                    const td1 = document.createElement('div');
                                    const td2 = document.createElement('div');
                                    const td3 = document.createElement('div');
                                    td1.className = 'features-table-item title';
                                    td2.className = 'features-table-item center';
                                    td3.className = 'features-table-item center';

                                    td1.textContent = cancelSubFeatures[i];

                                    const crossIcon = document.createElement('i');
                                    const checkIcon = document.createElement('i');
                                    crossIcon.className = 'tiny-icon red-cross';
                                    checkIcon.className = 'sprite-fm-mono icon-check-small-regular-outline';

                                    td2.appendChild(crossIcon);
                                    td3.appendChild(checkIcon);

                                    content.appendChild(td1);
                                    content.appendChild(td2);
                                    content.appendChild(td3);

                                    if (i < cancelSubFeatures.length - 1) {
                                        const separator = document.createElement('div');
                                        separator.className = 'features-table-seperator';
                                        content.appendChild(separator);
                                    }
                                }
                            }

                            this.slot = div;
                            this.title = isTrial ? l.cancel_trial_header : l.vpn_cancel_confirm_title1;
                        }
                    });

                    dialog.show();
                    eventlog(500416, surveyAl);
                }, isTrial);

                featureBlock.appendChild(section);
            }

            $rightBlock[0].appendChild(featureBlock);
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

            // Check if a user has purchased any feature plans.
            const purchasableFeaturePlans = Object.keys(pro.propay.purchasableFeaturePlans());
            const featureSubs = account.subs.filter(({ al, next }) =>
                next >= unixtime() && al === pro.ACCOUNT_LEVEL_FEATURE
            );
            const featurePlans = account.plans.filter(({ al, expires }) =>
                expires >= unixtime() && al === pro.ACCOUNT_LEVEL_FEATURE
            );

            // Combine the subs and plans arrays
            const subsAndPlans = featureSubs
                .concat(featurePlans.filter(plan => !featureSubs.some(sub => sub.id === plan.subid)))
                .sort((a, b) => {
                    // Show standalone plan cards first, then free trial ones.
                    if (!a.is_trial && b.is_trial) {
                        return -1;
                    }
                    if (!b.is_trial && a.is_trial) {
                        return 1;
                    }

                    // Show VPN plan cards above PWM ones
                    if (a.features.vpn && b.features.pwm) {
                        return -1;
                    }
                    if (b.features.vpn && a.features.pwm) {
                        return 1;
                    }

                    return 0;
                });

            // Remove any existing plan cards before rendering the feature plan blocks/cards
            $('.settings-right-block .feature-details', $planContent).remove();
            for (const purchase of subsAndPlans) {
                if (purchasableFeaturePlans.includes(Object.keys(purchase.features)[0])) {
                    this.renderFeaturePlanBlock($planContent, purchase);
                }
            }
        },

        renderSubSection(label, value, expires, extraClasses, isTrial) {
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

            if (isTrial) {
                const freeTrialSpan = document.createElement('span');
                freeTrialSpan.className = 'free-trial';
                freeTrialSpan.textContent = l.free_trial_caps;
                valueSpan.appendChild(freeTrialSpan);
            }

            section.appendChild(labelEl);
            section.appendChild(valueEl);
            return section;
        },

        renderSubBtnSection(callback, isTrial) {
            'use strict';

            const section = document.createElement('div');
            section.className = 'settings-sub-section sub-container feature'
                + ' subscription justify-end border btn-cancel-sub';

            const btnString = isTrial ? l.cancel_trial_btn : l[7165];

            const cancelBtn = new MButton(btnString, null, callback, 'mega-button');
            section.appendChild(cancelBtn.el);

            return section;
        },

        renderExtraSubscriptions(account, $planContent) {
            'use strict';

            const $rightBlock = $('.settings-right-block', $planContent);

            const mainSubId = $('.plan-details', $rightBlock).attr('subid') || null;
            const extraSubs = account.subs.filter(({ al, id, next }) =>
                al !== pro.ACCOUNT_LEVEL_FEATURE &&
                mainSubId !== id &&
                next >= unixtime()
            );

            // Remove any already rendered plan cards
            $('.extra-sub', $rightBlock).remove();

            for (let i = 0; i < extraSubs.length; i++) {
                const { id, al, next, gwid } = extraSubs[i];
                const subBlock = document.createElement('div');
                subBlock.id = `extra-sub-${id}`;
                subBlock.className = 'extra-sub';

                // Add paid class for plan card priority (Non-feature plan > Feature plan > Free)
                subBlock.classList.add('paid');

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
                        msgDialog('warninga', l[7179], l.double_billing_sub_cancel);
                        return;
                    }

                    accountUI.plan.accountType.cancelSubscriptionDialog.init(extraSubs[i], subBlock);
                }, false);
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
                $('.account.plan-info.expiry span', $planContent).text(paymentType);
            }
            else {
                // Otherwise show nothing
                $('.account.plan-info.expiry', $planContent).text('');
                $('.subtitle-txt.expiry-txt span', $planContent).text('');
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
                    msgDialog('warninga', l[7179], l.double_billing_sub_cancel);
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
                    eventlog(500416, sub.al);
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
            subOptions: null,
            subOptionSwitcher: null,

            /**
             * Initialise the dialog
             * @param {Object} [subscription] Subscription to use for the cancellation request
             * @param {HTMLDivElement} expContainer The container containing the expiration information
             * @returns {void}
             */
            init(subscription, expContainer) {

                'use strict';

                this.skipSurvey = true;

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

                const accountLevel = subscription && subscription.al || M.account.slevel;
                const surveyAl = accountLevel === pro.ACCOUNT_LEVEL_FEATURE
                    ? accountLevel + pro.getStandaloneBits(subscription.features)
                    : accountLevel;

                this.canAnswerSurvey = surveyAl === pro.ACCOUNT_LEVEL_FEATURE_VPN
                    || pro.filter.simple.canSeeCancelSubsSurvey.has(accountLevel);

                const options = this.getOptionsBySubscription(subscription);
                const optionArray = array.randomize(Object.keys(options));

                const $template = $('.cancel-subscription-radio-template', this.$dialog);
                const $optionArea = $('.content-block form.cancel-options', this.$dialog);
                $optionArea.children('.built-option, .radios-wrapper').remove();

                for (let i = optionArray.length - 1; i >= 0; i--) {
                    const $radio = $template.clone().removeClass('hidden cancel-subscription-radio-template');
                    $('#subcancel_div', $radio).removeAttr('id');
                    $('#subcancel', $radio).val(options[optionArray[i]]).removeAttr('id');
                    $('.radio-txt', $radio).text(l[`cancel_sub_${optionArray[i]}_reason`]);
                    if (this.subOptions[options[optionArray[i]]]) {
                        $optionArea.safePrepend('<div class="hidden cancel-option-'
                            + options[optionArray[i]] + ' radios-wrapper"></div>');
                    }
                    $optionArea.safePrepend($radio.prop('outerHTML'));
                    $optionArea.children()[0].getElementsByTagName('input')[0].dataset.pos = i + 1;
                }

                document.getElementById('subcancel8').dataset.pos = optionArray.length + 1;
                this.updateSurveyHeaders(surveyAl);

                this.$options = this.$dialog.find('.label-wrap');
                this.$allowContactOptions = $('.allow-contact-wrapper', this.$dialog);

                // Show benefits dialog before cancellation dialog if user does not have Pro Flex or Business
                if (pro.filter.simple.canSeeCancelBenefits.has(accountLevel)) {
                    this.displayBenefits();
                }
                // Otherwise, show the cancel subscription survey if the plan being cancelled has one
                else if (this.canAnswerSurvey) {
                    this.$dialog.removeClass('hidden');
                    this.initUpdateDialogScrolling(this.$formContent);
                }
                // Otherwise just cancel the plan directly
                else {
                    this.sendSubCancelRequestToApi(subscription && subscription.id || null);
                    return;
                }
                this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

                // Init textarea scrolling
                initTextareaScrolling($('.cancel-textarea textarea', this.$dialog));

                // Init functionality
                this.resetCancelSubscriptionForm();
                this.checkReasonEnteredIsValid();
                this.initClickReason();
                this.initClickContactConfirm();
                this.initCloseAndDontCancelButtons(surveyAl);
                this.initSecondaryOptions();

                this.$continueButton.rebind('click', () => {
                    this.sendSubCancelRequestToApi(subscription && subscription.id || null);
                    eventlog(this.canAnswerSurvey && this.skipSurvey ? 500649 : 500421, surveyAl);
                });
            },

            initSecondaryOptions() {
                'use strict';

                const elementParents = [];

                const switcherElements = {
                    onElementChange: () => {
                        for (const $parent of elementParents) {
                            const $children = $('.suboption-radio', $parent);
                            const hideElement = !!(!$children.length || $children.filter('.hidden').length);
                            $parent.toggleClass('hidden', hideElement);
                        }
                    },
                };

                for (const key in this.subOptions) {
                    switcherElements[key] = {
                        $element: mega.templates.getTemplate('cancel-suboption-wrapper-temp'),
                        $target: $('.cancel-option-' + key, this.$dialog),
                        onElementAppend: ($element, extras) => {
                            const $radioTemplate = $('.template', $element);
                            for (let i = 0; i < extras.length; i++) {
                                const $radio = $radioTemplate.clone().removeClass('hidden template');
                                $('input', $radio).val(extras[i].val);
                                $('.radio-txt', $radio).text(extras[i].text);
                                $element.safeAppend($radio.prop('outerHTML'));
                                $element.children('.label-wrap:not(.template)')[i]
                                    .getElementsByTagName('input')[0].dataset.pos = String.fromCharCode(97 + i);
                            }
                            $radioTemplate.remove();

                            $('.label-wrap', $element).rebind('click', (e) => {

                                $element.closest('.radios-wrapper').removeClass('error');

                                const $option = $(e.currentTarget);
                                $('.radioOn', $element).addClass('radioOff').removeClass('radioOn');
                                $('.suboption', $option).addClass('radioOn').removeClass('radioOff');
                            });
                        },
                        extras: this.subOptions[key],
                    };

                    elementParents.push(switcherElements[key].$target);
                }
                this.subOptionSwitcher = this.subOptionSwitcher && this.subOptionSwitcher.remove();
                this.subOptionSwitcher = mega.elementSwitcher(
                    switcherElements, undefined, 'cancel-suboptions-switcher', true);
            },

            /**
             * Updating headers based on account level
             * @param {Number} al Account level
             * @returns {void}
             */
            updateSurveyHeaders(al) {
                'use strict';

                let title = l[6822];
                let txt = l[6996];
                let subTxt = '';

                if (al === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                    title = l.vpn_cancel_survey_title;
                    txt = l.vpn_cancel_survey_txt;
                    subTxt = l.vpn_cancel_survey_subtxt;
                }

                $('#cancel-subscription-st1-title', this.$dialog).text(title);
                $('.fm-dialog-top-text', this.$dialog).text(txt);
                $('.cancel-option-info', this.$dialog).text(subTxt);
            },

            /**
             * Compose the cancellation reasons for the survey
             * @param {Object} subscription Subscription details
             * @returns {Object.<String, Number>}
             */
            getOptionsBySubscription(subscription) {
                'use strict';

                this.subOptions = {};
                const r = [];
                r[1] = 'temp_plan';
                r[2] = 'too_expensive';
                r[3] = 'too_much_storage_quota';
                r[4] = 'lack_of_features';
                r[5] = 'switching_provider';
                r[6] = 'difficult_to_use';
                r[7] = 'poor_support';
                r[9] = 'cant_afford';
                r[10] = 'no_sub';
                r[11] = 'vpn_conn';
                r[12] = 'vpn_speed';
                r[13] = 'vpn_tmp';
                r[14] = 'vpn_servers';
                r[15] = 'vpn_difficult';
                r[16] = 'vpn_security';

                const getReasons = (...args) => args.reduce((acc, i) => {
                    acc[r[i]] = i;
                    return acc;
                }, {});

                if (subscription && subscription.al === pro.ACCOUNT_LEVEL_FEATURE && subscription.features.vpn) {
                    return getReasons(11, 12, 13, 14, 15, 16);
                }

                this.subOptions = array.randomize({
                    1: [
                        {
                            text: l.c_s_o_donwload_files_only,
                            val: 'a',
                        },
                        {
                            text: l.c_s_o_store_files_temp,
                            val: 'b',
                        },
                        {
                            text: l.c_s_o_share_files_only,
                            val: 'c',
                        },
                    ],
                }, 2);

                return getReasons(1, 2, 3, 4, 5, 6, 7, 9, 10);
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

                this.skipSurvey = true;
                this.$continueButton.text(l.skip_and_cancel);
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
                    const freeStorage = bytesToSize(mega.bstrg, 0);
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
             * @param {Number} accountLevel The account level to assign the survey to
             * @returns {void}
             */
            initCloseAndDontCancelButtons(accountLevel) {
                'use strict';

                var self = this;

                const closeSurvey = (eventId) => {
                    self.$dialog.addClass('hidden');
                    self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                    eventlog(eventId, accountLevel);
                };

                // Close main dialog
                $('button.dont-cancel', self.$dialog).rebind('click.logEvent', () => closeSurvey(500420));
                $('button.js-close', self.$dialog).rebind('click.logEvent', () => closeSurvey(500422));
            },

            /**
             * Setting survey to mandatory in case it is needed
             * @returns {void}
             */
            setSurveyToMandatory() {
                'use strict';

                if (!this.skipSurvey) {
                    return;
                }

                this.skipSurvey = false;
                this.$continueButton.text(l.submit_and_cancel);
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

                    this.setSurveyToMandatory();

                    if (valueIsOtherOption) {
                        this.$invalidDetailsDialog.toggleClass('hidden', !(this.$cancelReason.hasClass('error')));

                        this.$formContent.scrollTop(this.$formContent.height());
                        this.$textarea.trigger('focus');
                    }
                    else {
                        this.$invalidDetailsDialog.addClass('hidden');
                        this.$textarea.trigger('blur');
                    }

                    if (this.subOptions[value] && this.subOptionSwitcher && !$option.hasClass('cancel-option')) {
                        this.subOptionSwitcher.showElement(value);
                    }
                    else {
                        this.subOptionSwitcher.hide();
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

                    this.setSurveyToMandatory();
                });
            },

            /**
             * Close success dialog
             * @returns {void}
             */
            initCloseButtonSuccessDialog() {
                'use strict';

                $('p', this.$dialogSuccess).toggleClass('hidden', !this.canAnswerSurvey);
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

                const reasons = [];
                let canContactUser;

                // Check the user has answered all the survey questions
                if (this.canAnswerSurvey && !this.skipSurvey) {
                    const $optionsSelected = $('div.cancel-option.radioOn', this.$options);
                    const $selectedContactOption = $('.contact-option.radioOn', this.$allowContactOptions);

                    if (!$selectedContactOption.length) {
                        this.$selectCanContactError.removeClass('hidden');
                        this.$dialog.addClass('error-select-contact');
                        return;
                    }

                    canContactUser = $('input', $selectedContactOption).val();

                    if ($optionsSelected.length) {
                        for (let i = 0; i < $optionsSelected.length; i++) {
                            const input = $('input', $optionsSelected[i])[0];
                            const r = input.value;
                            const p = input.dataset.pos;

                            if (this.subOptions[r]) {
                                const $subOptionArea = $(`.cancel-option-${r}`, this.$dialog);
                                const $chosenSubOption = $('input.radioOn', $subOptionArea);

                                if ($chosenSubOption.length === 1) {
                                    reasons.push({
                                        r: `${r}.${$chosenSubOption.val()}`,
                                        p: `${p}.${$chosenSubOption.data('pos')}`
                                    });
                                }
                                else {
                                    $subOptionArea.addClass('error');
                                    return;
                                }
                            }
                            else if (r === '8') {
                                const t = this.$textarea.val().trim();

                                if (!t.length || t.length > 1000) {
                                    this.showTextareaError(!t.length);
                                    return;
                                }
                                reasons.push({ r, p, t });
                            }
                            else {
                                reasons.push({ r, p });
                            }
                        }
                    }
                    else {
                        this.$selectReasonDialog.removeClass('hidden');
                        this.$dialog.addClass('error-select-reason');
                        return;
                    }
                }

                // Hide the dialog and show loading spinner
                this.$dialog.addClass('hidden');
                this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                loadingDialog.show();

                // Setup standard request to 'cccs' = Credit Card Cancel Subscriptions
                const ccReq = { a: 'cccs', m: '0' }; // m stands for mobile
                const requests = [ccReq];

                if (!this.skipSurvey) {
                    if (reasons) {
                        ccReq.r = reasons;
                    }

                    if (canContactUser !== undefined) {
                        ccReq.cc = canContactUser;
                    }
                }

                if (subscriptionId) {
                    ccReq.sub = subscriptionId;
                }

                // If they were Pro Flexi, we need to also downgrade the user from Pro Flexi to Free
                if (u_attr && u_attr.pf) {
                    requests.push({ a: 'urpf' });
                }

                // Cancel the subscription/s
                api.req(requests).then(() => {
                    // Giving a chance to receive an account update response from the API
                    delay('accountUI.cancelSubscriptionDialog', () => {
                        // Hide loading dialog
                        loadingDialog.hide();

                        // Show success dialog
                        this.$dialogSuccess.removeClass('hidden');
                        this.$backgroundOverlay.removeClass('hidden');
                        this.$backgroundOverlay.addClass('payment-dialog-overlay');
                        this.initCloseButtonSuccessDialog();

                        // Reset account cache so all account data will be refetched
                        // and re-render the account page UI
                        M.account.lastupdate = 0;
                        accountUI();

                        // Notify any other open tabs of the cancelled subscription
                        mBroadcaster.crossTab.notify('cancelSub', 1);
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
                api.req({ a: 'cci', v: 2 }).then(({ result: res }) => {
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

                    $('.fm-account-overlay, .fm-voucher-button')
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
