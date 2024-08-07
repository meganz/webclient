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
        value: function() {
            'use strict';

            let subType = M.account.stype;
            let gatewayId = M.account.sgwids && M.account.sgwids.length > 0 ?
                M.account.sgwids[0] :
                null;

            if (typeof subType === 'undefined') {
                loadingDialog.pshow();

                M.accountData((account) => {
                    subType = account.stype;
                    gatewayId = account.sgwids.length > 0 ? account.sgwids[0] : null; // Gateway ID

                    loadingDialog.phide();

                    if (u_attr.p && subType === 'S' && !(gatewayId === 2 || gatewayId === 3)) {
                        this.init();
                    }
                    else {
                        loadSubPage('fm/account');
                    }
                });
            }
            else if (u_attr.p && subType === 'S' && !(gatewayId === 2 || gatewayId === 3)) {
                this.init();
            }
            else {
                loadSubPage('fm/account');
            }
        }
    },

    /**
     * Initiate and render the page
     *
     * @returns {undefined}
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                this.resetForm();
                this.show();

                return true;
            }

            this.domNode = this.generatePage('cancel-subscription-survey');

            this.reasonNumber = '';
            this.reasonString = '';
            this.canContactUser = '';

            this.addCancelSubInfo();
            this.createReasonRadioOptions();
            this.createConsentRadioOptions();

            this.createBottomButtons();

            this.show();
        }
    },

    /**
     * Reset the form if exiting it, then re-visiting it.
     *
     * @returns {undefined}
     */
    resetForm: {
        value: function() {
            'use strict';

            if (this.reasonNumber) {
                this.optionGroup.value = '';
                this.optionGroup.getChild([this.reasonNumber]).checked = false;
                this.reasonNumber = '';
                this.reasonString = '';
            }

            if (this.inlineReasonAlert.visible) {
                this.inlineReasonAlert.hide();
            }

            if (this.canContactUser.length) {
                this.consentOptionGroup.value = '';
                this.consentOptionGroup.getChild([this.canContactUser]).checked = false;
                this.canContactUser = '';
            }

            if (this.inlineConsentAlert.visible) {
                this.inlineConsentAlert.hide();
            }

            this.otherReasonTextArea.hideError();
            this.otherReasonTextArea.setValue('');
            this.otherReasonTextArea.$input.trigger('blur');
            this.otherReasonTextArea.$wrapper.addClass('hidden');
        }
    },

    /**
     * Add the information about what happens when the user's subscription is cancelled
     * to the page.
     *
     * @returns {undefined}
     */
    addCancelSubInfo: {
        value: function() {
            'use strict';

            const cancelSubWarnings = document.createElement('div');
            cancelSubWarnings.className = 'cancel-sub-warnings';

            const cancelSubResult = document.createElement('div');
            cancelSubResult.className = 'cancel-sub-result';
            cancelSubResult.textContent = l[6996];

            const cancelSubPrompt = document.createElement('div');
            cancelSubPrompt.className = 'cancel-sub-prompt';
            cancelSubPrompt.textContent = l[7005];

            cancelSubWarnings.append(cancelSubResult, cancelSubPrompt);

            this.domNode.append(cancelSubWarnings);
        }
    },

    /**
     * Create the cancellation reason options (radio buttons) for the page.
     *
     * @returns {undefined}
     */
    createReasonRadioOptions: {
        value: function() {
            'use strict';

            const radioOptions = document.createElement('div');
            radioOptions.className = 'cancel-sub-options';

            const options = [
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
            ];

            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

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

                    const otherOptionChosen = selectedRadioBtnOptions.otherOption;
                    this.reasonString = otherOptionChosen ? '' : selectedRadioBtnOptions.label;

                    this.otherReasonTextArea.$wrapper.toggleClass('hidden', !otherOptionChosen);
                    this.otherReasonTextArea.hideError();

                    if (otherOptionChosen) {
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
                parentNode: this.domNode,
                componentClassname: 'select-reason error hidden',
                text: l.cancel_sub_no_opt_picked_mob,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                closeButton: false
            });

            this.domNode.append(radioOptions);

            const textarea = document.createElement('textarea');
            textarea.maxLength = 1000;
            textarea.className = 'reason-field textArea clearButton lengthChecker no-title-top';
            this.domNode.appendChild(textarea);

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
            this.domNode.appendChild(cancelSubPrompt);

            this.inlineConsentAlert = mobile.inline.alert.create({
                parentNode: this.domNode,
                componentClassname: 'select-consent-ans error hidden',
                text: l.cancel_sub_err_make_selection,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                closeButton: false
            });

            this.domNode.append(radioOptions);
        }
    },

    /**
     * Create the bottom buttons ('Cancel subscription' and 'Don't cancel') for the page.
     *
     * @returns {undefined}
     */
    createBottomButtons: {
        value: function() {
            'use strict';

            const surveyButtons = document.createElement('div');
            surveyButtons.className = 'cancel-sub-buttons';

            const cancelSubBtn = new MegaMobileButton({
                parentNode: surveyButtons,
                text: l.cancel_sub_btn_label,
                componentClassname: 'block primary'
            });
            cancelSubBtn.on('tap', () => {
                const subscription = Array.isArray(account.plans)
                    && account.plans[0].subid
                    && Array.isArray(account.subs)
                    && account.subs.find(({ id }) => id === account.plans[0].subid)
                    || null;

                this.sendSubCancelRequestToApi(subscription && subscription.id || null);
            });

            const dontCancelBtn = new MegaMobileButton({
                parentNode: surveyButtons,
                text: l.dont_cancel_sub_btn_label,
                componentClassname: 'block secondary'
            });
            dontCancelBtn.on('tap', () => {
                loadSubPage('fm/account');
            });

            this.domNode.append(surveyButtons);
        }
    },

    /**
     * Send the subscription cancellation request to the API.
     *
     * The r request value is sent in the format '<reason-number> - <reason>' if the 'Other'
     * option isn't chosen. If it is, then r will be the textarea input.
     *
     * @param {String} [subscriptionId] The ID of the subscription to cancel
     * @returns {undefined}
     */
    sendSubCancelRequestToApi: {
        value(subscriptionId) {
            'use strict';

            let reason = this.otherReasonTextArea.$input.val();
            const reasonStringIsEmpty = !!this.reasonString;

            if (!this.reasonNumber || !this.canContactUser.length) {
                if (!this.reasonNumber) {
                    this.inlineReasonAlert.show();
                }
                if (!this.canContactUser.length) {
                    this.inlineConsentAlert.show();
                }

                return;
            }
            else if (reasonStringIsEmpty) {
                reason = `${this.reasonNumber} - ${this.reasonString}`;
            }
            else if (!reason.length) {
                const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                const errorMsg = l.cancel_sub_empty_textarea_error_msg;
                this.otherReasonTextArea.showError(`<i class='${alertIcon}'></i>${escapeHTML(errorMsg)}`);

                // Override the margin bottom style set by showError
                this.otherReasonTextArea.$wrapper.css('marginBottom', '24px');

                return;
            }

            // Setup standard request to 'cccs' = Credit Card Cancel Subscriptions
            const ccReq = { a: 'cccs', r: reason, cc: this.canContactUser };
            const requests = [ccReq];

            if (subscriptionId) {
                ccReq.sub = subscriptionId;
            }

            // If they were Pro Flexi, we need to also downgrade the user from Pro Flexi to Free
            if (u_attr && u_attr.pf) {
                requests.push({ a: 'urpf' });
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
            }).catch(tell);
        }
    }
});
