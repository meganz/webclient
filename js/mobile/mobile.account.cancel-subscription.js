/**
 * Functionality for the mobile cancel subscription page (fm/account/cancel)
 */
mobile.settings.account.cancelSubscription = Object.create(mobile.settingsHelper, {

    /**
     * Check the user's subscription status before rendering the page
     *
     * @returns {undefined}
     */
    checkSubStatus: {
        value() {
            'use strict';

            loadingDialog.pshow();

            M.accountData(() => {
                loadingDialog.phide();

                this.cancelFeatureSub = '';
                this.feature = '';
                this.subIdToCancel = '';

                this.subscriptions = !u_attr.b && M.account.subs;

                this.purchasableFeaturePlans = Object.keys(pro.propay.purchasableFeaturePlans());

                let canInit = this.subscriptions.length >= 1;

                if (this.subscriptions.length === 1) {
                    // Check the subscription is not an Apple or Google one
                    const gatewayId = this.subscriptions[0].gwid;
                    canInit = !(gatewayId === 2 || gatewayId === 3);

                    // If it is not, set some flags & variables before initing the page
                    if (canInit) {
                        const subscription = this.subscriptions[0];
                        const featureKeys = Object.keys(subscription.features);

                        this.cancelFeatureSub = subscription.al === pro.ACCOUNT_LEVEL_FEATURE
                            && featureKeys.some(item => this.purchasableFeaturePlans.includes(item))
                            && subscription;
                        this.feature = this.cancelFeatureSub && Object.keys(subscription.features)[0];

                        this.subIdToCancel = subscription.id;
                    }
                }

                if (canInit) {
                    this.init();
                }
                else {
                    loadSubPage('fm/account');
                }
            });
        }
    },

    /**
     * Initiate and render the page
     *
     * @returns {undefined}
     */
    init: {
        value() {
            'use strict';

            if (this.domNode) {
                // Reset the page contents
                this.domNode.textContent = '';
            }
            else {
                this.domNode = this.generatePage('cancel-subscription-page');
            }

            if (this.subscriptions.length >= 2) {
                this.initPlanPicker();
            }
            else {
                this.initCancelSection();
            }

            this.show();
        }
    },

    /**
     * Step 0 - initialise the plan picker (only if the user has multiple plans they can cancel via
     * mobile web).
     *
     * @returns {undefined}
     */
    initPlanPicker: {
        value() {
            'use strict';

            this.subSelectionArea = document.createElement('div');
            this.subSelectionArea.className = 'subscription-selection-area';
            this.domNode.append(this.subSelectionArea);

            const selectSubscription = document.createElement('div');
            selectSubscription.className = 'select-subscription';
            selectSubscription.textContent = l.pick_sub_to_cancel;

            const subscriptionsContainer = document.createElement('div');
            subscriptionsContainer.className = 'subscriptions';

            this.subSelectionArea.append(selectSubscription, subscriptionsContainer);

            const subscriptionRadios = [];

            for (const sub of this.subscriptions) {
                const { al: subLevel, id: subId, features, is_trial, next, gwid: gatewayId } = sub;

                let proNum = subLevel;
                if (proNum === pro.ACCOUNT_LEVEL_FEATURE) {
                    const upperCaseFeature = Object.keys(features)[0].toUpperCase();
                    proNum = pro[`ACCOUNT_LEVEL_FEATURE_${upperCaseFeature}`];
                }
                let label = pro.getProPlanName(proNum);

                const subLabelText = is_trial ? l.sub_begins_btn : l.sub_renews_btn;
                if (is_trial) {
                    label += ` ${l.free_trial_parentheses}`;
                }

                const radioBtnOptions = {
                    parentNode: subscriptionsContainer,
                    label,
                    subLabel: subLabelText.replace('%1', time2date(next, 1)),
                    value: subId,
                    checked: false,
                    disabled: gatewayId === 2 || gatewayId === 3, // Apple or Google payment
                };
                if (radioBtnOptions.disabled) {
                    // String keys: l.cancel_apple_sub, l.cancel_google_sub
                    const gateway = gatewayId === 2 ? 'apple' : 'google';
                    radioBtnOptions.disabledReason = l[`cancel_${gateway}_sub`];
                }

                subscriptionRadios.push(radioBtnOptions);
            }

            /* eslint-disable no-new */
            new MegaMobileRadioGroup({
                name: 'user-subscriptions',
                radios: subscriptionRadios,
                align: 'left',
                onChange: (e) => {
                    this.secondBtn.disabled = false;
                    this.subIdToCancel = e.currentTarget.value;

                    this.cancelFeatureSub = this.subscriptions.find(
                        ({ al, features, id }) => al === pro.ACCOUNT_LEVEL_FEATURE
                            && Object.keys(features).some(item => this.purchasableFeaturePlans.includes(item))
                            && id === this.subIdToCancel
                    );
                    this.feature = this.cancelFeatureSub && Object.keys(this.cancelFeatureSub.features)[0];
                }
            });

            this.renderBottomButtons(true);
        }
    },

    /**
     * Step 1 - initialise the cancel subscription section
     *
     * @returns {undefined}
     */
    initCancelSection: {
        value() {
            'use strict';

            this.cancelPlanSection = document.createElement('div');
            this.cancelPlanSection.className = 'cancel-plan-section';
            this.domNode.append(this.cancelPlanSection);

            this.addCancelSubInfo();

            if (this.cancelFeatureSub) {
                this.showFeaturesTable();
            }
            else {
                this.reasonNumber = '';
                this.reasonString = '';
                this.canContactUser = '';

                this.createReasonRadioOptions();
                this.createConsentRadioOptions();
            }

            this.renderBottomButtons(false);
        }
    },

    /**
     * Show a features table outlining what the user will miss out on if they cancel their subscription.
     * Only for standalone feature plans for now.
     *
     * @returns {undefined}
     */
    showFeaturesTable: {
        value() {
            'use strict';

            const features = pro.propay.purchasableFeaturePlans()[this.feature];

            if (!features || !features.cancelSubFeatures) {
                return;
            }

            const featuresTable = document.createElement('div');
            featuresTable.className = 'features-table';
            this.cancelPlanSection.append(featuresTable);

            const featuresTableHeader = document.createElement('div');
            featuresTableHeader.className = 'ft-header';

            const ftHeaderCol1 = document.createElement('div');
            ftHeaderCol1.className = 'feature';
            ftHeaderCol1.textContent = l[23377];

            // String keys:
            // l.no_vpn
            // l.no_pwm
            const ftHeaderCol2 = document.createElement('div');
            ftHeaderCol2.className = 'no-plan';
            ftHeaderCol2.textContent = l[`no_${this.feature}`];

            // String keys:
            // l.mega_vpn
            // l.mega_pwm
            const ftHeaderCol3 = document.createElement('div');
            ftHeaderCol3.className = 'plan';
            ftHeaderCol3.textContent = l[`mega_${this.feature}`];

            const featuresTableContents = document.createElement('div');
            featuresTableContents.className = 'ft-rows';
            featuresTableContents.textContent = '';

            const cancelSubFeatures = features.cancelSubFeatures;
            for (let i = 0; i < cancelSubFeatures.length; i++) {
                const ftRowCol1 = document.createElement('div');
                ftRowCol1.className = 'row-item feature';
                ftRowCol1.textContent = cancelSubFeatures[i];

                const ftRowCol2 = document.createElement('div');
                ftRowCol2.className = 'row-item center no-plan';

                const crossIcon = document.createElement('i');
                crossIcon.className = 'tiny-icon red-cross';
                ftRowCol2.append(crossIcon);

                const ftRowCol3 = document.createElement('div');
                ftRowCol3.className = 'row-item center plan';

                featuresTableContents.append(ftRowCol1, ftRowCol2, ftRowCol3);

                /* eslint-disable no-new */
                new MegaButton({
                    parentNode: ftRowCol3,
                    type: 'icon',
                    icon: 'sprite-fm-mono icon-check-small-regular-outline',
                    iconSize: 24,
                    componentClassname: 'text-icon'
                });

                if (i < cancelSubFeatures.length - 1) {
                    const ftRowSeparator = document.createElement('div');
                    ftRowSeparator.className = 'ft-row-separator';
                    featuresTableContents.append(ftRowSeparator);
                }
            }

            featuresTable.append(featuresTableHeader, featuresTableContents);
            featuresTableHeader.append(ftHeaderCol1, ftHeaderCol2, ftHeaderCol3);
        }
    },

    /**
     * Add the information about what happens when the user's subscription is cancelled
     * to the page.
     *
     * @returns {undefined}
     */
    addCancelSubInfo: {
        value() {
            'use strict';

            const cancelSubWarnings = document.createElement('div');
            cancelSubWarnings.className = 'cancel-sub-warnings';

            const cancelSubResult = document.createElement('div');
            cancelSubResult.className = 'cancel-sub-result';

            const cancelSubPrompt = document.createElement('div');
            cancelSubPrompt.className = 'cancel-sub-prompt';

            const { cancelFeatureSub, cancelPlanSection, feature } = this;

            let resultText = l[6996];
            let promptText = l[7005];

            if (cancelFeatureSub) {
                // String keys:
                // l.vpn_trial_cancel_confirm
                // l.pwm_trial_cancel_confirm
                // l.vpn_cancel_confirm_txt1
                // l.pwm_cancel_confirm_txt1
                resultText = cancelFeatureSub.is_trial ?
                    l[`${feature}_trial_cancel_confirm`] : l[`${feature}_cancel_confirm_txt1`];
                promptText = cancelFeatureSub.is_trial ? l.cancel_trial_header : l.vpn_cancel_confirm_title1;
            }

            cancelSubResult.textContent = resultText;
            cancelSubPrompt.textContent = promptText;

            if (cancelFeatureSub) {
                cancelSubPrompt.classList.add('top');
            }

            cancelSubWarnings.append(cancelSubResult, cancelSubPrompt);
            cancelPlanSection.append(cancelSubWarnings);
        }
    },

    /**
     * Create the cancellation reason options (radio buttons) for the page.
     *
     * @returns {undefined}
     */
    createReasonRadioOptions: {
        value() {
            'use strict';

            const radioOptions = document.createElement('div');
            radioOptions.className = 'cancel-sub-options';

            const options = array.randomize([
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_temp_plan_reason,
                    value: 1,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_too_expensive_reason,
                    value: 2,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_too_much_storage_quota_reason,
                    value: 3,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_lack_of_features_reason,
                    value: 4,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_switching_provider_reason,
                    value: 5,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_difficult_to_use_reason,
                    value: 6,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_poor_support_reason,
                    value: 7,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_cant_afford_reason,
                    value: 9,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_no_sub_reason,
                    value: 10,
                    checked: false,
                    otherOption: false
                },
            ]);

            options.push({
                parentNode: radioOptions,
                label: l.cancel_sub_other_reason,
                value: 8,
                checked: false,
                otherOption: true
            });

            this.optionGroup = new MegaMobileRadioGroup({
                name: 'reason',
                radios: options,
                align: 'left',
                onChange: (e) => {
                    this.reasonNumber = e.currentTarget.value;

                    const selectedRadioBtnOptions = options.filter((option) => {
                        return option.value === parseInt(this.reasonNumber);
                    })[0];

                    this.otherOptionChosen = selectedRadioBtnOptions.otherOption;
                    this.reasonString = this.otherOptionChosen ? '' : selectedRadioBtnOptions.label;

                    this.otherReasonTextArea.$wrapper.toggleClass('hidden', !this.otherOptionChosen);
                    this.otherReasonTextArea.hideError();

                    if (this.otherOptionChosen) {
                        delay('textarea-focus', () => {
                            this.otherReasonTextArea.$input.trigger('focus');
                        }, 30);
                    }

                    if (this.inlineReasonAlert.visible) {
                        this.inlineReasonAlert.hide();
                    }
                }
            });

            this.inlineReasonAlert = mobile.inline.alert.create({
                parentNode: this.cancelPlanSection,
                componentClassname: 'select-reason error hidden',
                text: l.cancel_sub_no_opt_picked_mob,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                closeButton: false
            });

            const textarea = document.createElement('textarea');
            textarea.maxLength = 1000;
            textarea.className = 'reason-field textArea clearButton lengthChecker no-title-top';

            this.cancelPlanSection.append(radioOptions, textarea);

            this.otherReasonTextArea = new mega.ui.MegaInputs($(textarea));
            this.otherReasonTextArea.$wrapper.addClass('box-style fixed-width mobile hidden');
        }
    },

    /**
     * Create the email consent options (radio buttons) for the page.
     *
     * @returns {undefined}
     */
    createConsentRadioOptions: {
        value() {
            'use strict';

            const radioOptions = document.createElement('div');
            radioOptions.className = 'consent-options';

            const options = [
                {
                    parentNode: radioOptions,
                    label: l[78],
                    value: 1,
                    checked: false,
                },
                {
                    parentNode: radioOptions,
                    label: l[79],
                    value: 0,
                    checked: false,
                },
            ];

            this.consentOptionGroup = new MegaMobileRadioGroup({
                name: 'email-consent',
                radios: options,
                align: 'left',
                onChange: (e) => {
                    this.canContactUser = e.currentTarget.value;

                    if (this.inlineConsentAlert.visible) {
                        this.inlineConsentAlert.hide();
                    }
                }
            });

            const cancelSubPrompt = document.createElement('div');
            cancelSubPrompt.className = 'email-consent-prompt';
            cancelSubPrompt.textContent = l.cancel_sub_can_contact;
            this.cancelPlanSection.append(cancelSubPrompt);

            this.inlineConsentAlert = mobile.inline.alert.create({
                parentNode: this.cancelPlanSection,
                componentClassname: 'select-consent-ans error hidden',
                text: l.cancel_sub_err_make_selection,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                closeButton: false
            });

            this.cancelPlanSection.append(radioOptions);
        }
    },

    /**
     * Render the bottom buttons.
     *
     * @param {Boolean} isShowingPlanPicker if we are showing the plan picker
     * @returns {undefined}
     */
    renderBottomButtons: {
        value(isShowingPlanPicker) {
            'use strict';

            const surveyButtons = document.createElement('div');
            surveyButtons.className = 'buttons-container';

            const { cancelFeatureSub, subSelectionArea, cancelPlanSection, feature } = this;

            const canContinueCancellation = isShowingPlanPicker || cancelFeatureSub;

            let primaryBtnText;
            if (isShowingPlanPicker) {
                primaryBtnText = l.dont_cancel_sub_btn_label;
            }
            else {
                // Label keys:
                // l.vpn_keep_plan
                // l.pwm_keep_plan
                primaryBtnText = cancelFeatureSub ? l[`${feature}_keep_plan`] : l.cancel_sub_btn_label;
            }

            /* eslint-disable no-new */
            new MegaButton({
                parentNode: surveyButtons,
                text: primaryBtnText,
                componentClassname: 'block primary'
            }).on('tap', () => {
                if (canContinueCancellation) {
                    loadSubPage('fm/account');
                }
                else {
                    this.sendSubCancelRequestToApi();
                }
            });

            this.secondBtn = new MegaButton({
                parentNode: surveyButtons,
                text: canContinueCancellation ? l.cancel_pro_continue : l.dont_cancel_sub_btn_label,
                componentClassname: canContinueCancellation ? 'text-only' : 'block secondary',
                disabled: isShowingPlanPicker
            }).on('tap', () => {
                if (isShowingPlanPicker) {
                    subSelectionArea.textContent = '';
                    this.initCancelSection();
                }
                else if (cancelFeatureSub) {
                    this.sendSubCancelRequestToApi();
                }
                else {
                    loadSubPage('fm/account');
                }
            });

            const parentNode = isShowingPlanPicker ? subSelectionArea : cancelPlanSection;
            parentNode.append(surveyButtons);
        }
    },

    /**
     * Send the subscription cancellation request to the API.
     *
     * The r request value is sent in the format '<reason-number> - <reason>' if the 'Other'
     * option isn't chosen. If it is, then r will be the textarea input.
     *
     * @returns {undefined}
     */
    sendSubCancelRequestToApi: {
        value() {
            'use strict';

            // Setup standard request to 'cccs' = Credit Card Cancel Subscriptions
            const ccReq = { a: 'cccs', sub: this.subIdToCancel };
            const requests = [ccReq];

            if (!this.cancelFeatureSub) {
                const reason = this.otherOptionChosen ?
                    this.otherReasonTextArea.$input.val() :
                    this.reasonNumber ? `${this.reasonNumber} - ${this.reasonString}` : '';

                if (!this.reasonNumber || !this.canContactUser.length || !reason.length) {
                    if (!this.reasonNumber) {
                        this.inlineReasonAlert.show();
                    }
                    if (!this.canContactUser.length) {
                        this.inlineConsentAlert.show();
                    }
                    if (this.otherOptionChosen && !reason.length) {
                        const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                        const errorMsg = l.cancel_sub_empty_textarea_error_msg;
                        this.otherReasonTextArea.showError(`<i class='${alertIcon}'></i>${escapeHTML(errorMsg)}`);

                        // Override the margin bottom style set by showError
                        this.otherReasonTextArea.$wrapper.css('marginBottom', '24px');
                    }

                    return;
                }

                ccReq.r = reason;
                ccReq.cc = this.canContactUser;

                // If they were Pro Flexi, we need to also downgrade the user from Pro Flexi to Free
                if (u_attr && u_attr.pf) {
                    requests.push({ a: 'urpf' });
                }
            }

            // Show a loading dialog while sending request to API
            loadingDialog.show();

            // Cancel the subscription
            api.req(requests).then(() => {
                // Hide the loading dialog after request completes
                loadingDialog.hide();
                M.account.lastupdate = 0;
                loadSubPage('fm/account');
                mobile.showToast(l[6999], 4);

                // Notify any other open tabs of the cancelled subscription
                watchdog.notify('refresh-account-ui');
            }).catch(tell);
        }
    }
});
