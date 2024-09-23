mobile.settings.account.verifyDelete = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (!page.startsWith('fm/account') && (this.code = page.split('/').pop().substr(6))) {
                return loadSubPage('/fm/account/delete/verify');
            }

            if (!this.code) {
                return msgDialog('warninga', l[6186], l[6187], '', () => {
                    loadSubPage('fm/account');
                });
            }

            if (this.domNode) {
                return this.render();
            }

            this.domNode = this.generatePage('settings-account-verify-delete');

            const contentDiv = mCreateElement('div', {
                'class': 'mobile-settings-content'
            }, this.domNode);

            this.prompt = mCreateElement('div', {
                'class': 'mobile-settings-prompt'
            }, contentDiv);

            this.info = mCreateElement('div', {
                'class': 'mobile-settings-info'
            }, contentDiv);

            this.form = mCreateElement('div', {
                'class': 'mobile-settings-form'
            }, contentDiv);

            const buttonsDiv = mCreateElement('div', {
                'class': 'mobile-settings-buttons'
            }, this.domNode);

            this.deleteButton = new MegaMobileButton({
                parentNode: buttonsDiv,
                componentClassname: 'mobile-settings-button block',
                text: l.account_continue_delete
            }).on('tap.deleteAccount', () => this.continue());

            this.noDeleteButton = new MegaMobileButton({
                parentNode: buttonsDiv,
                componentClassname: 'mobile-settings-button block secondary',
                text: l.account_no_delete
            }).on('tap.noDeleteAccount', () => loadSubPage('fm/account'));

            this.render();
        }
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-page', 'default-form');

            this.prompt.textContent = l.account_delete_sorry;
            this.info.textContent = l.account_delete_reason;
            this.form.textContent = '';
            this.renderSurvey(this.form);

            this.deleteButton.text = l.account_continue_delete;
            this.deleteButton.removeClass('destructive');
            this.deleteButton.on('tap.deleteAccount', () => this.continue());

            this.show();
        }
    },

    renderSurvey: {
        value: function(parentNode) {
            'use strict';

            this.reasonNumber = '';
            this.reasonString = '';

            const promptForm = mCreateElement('div', {
                'class': 'mobile-settings-prompt'
            }, parentNode);
            promptForm.textContent = l[6844];

            const radioOptions = document.createElement('div');
            radioOptions.className = 'mobile-settings-options';

            const options = [
                {
                    parentNode: radioOptions,
                    label: l[6229],
                    value: 1,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l[6845],
                    value: 2,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l[6226],
                    value: 3,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l[6227],
                    value: 4,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l[23422],
                    value: 5,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l[6847],
                    value: 6,
                    checked: false,
                    otherOption: false
                },
                {
                    parentNode: radioOptions,
                    label: l.cancel_sub_other_reason,
                    value: 7,
                    checked: false,
                    otherOption: true
                }
            ];

            this.optionGroup = new MegaMobileRadioGroup({
                name: 'reason',
                radios: options,
                align: 'left',
                onChange: (e) => {
                    this.reasonNumber = e.currentTarget.value;

                    const selectedRadioBtnOptions = options[this.reasonNumber - 1];

                    const otherOptionChosen = selectedRadioBtnOptions.otherOption;
                    this.reasonString = otherOptionChosen ? '' : selectedRadioBtnOptions.label;

                    this.otherReasonTextArea.$wrapper.toggleClass('hidden', !otherOptionChosen);
                    this.otherReasonTextArea.hideError();

                    if (otherOptionChosen) {
                        delay('textarea-focus', () => {
                            this.otherReasonTextArea.$input.trigger('focus');
                        }, 30);
                    }

                    if (this.inlineAlert.visible) {
                        this.inlineAlert.hide();
                    }
                }
            });

            parentNode.append(radioOptions);

            this.inlineAlert = mobile.inline.alert.create({
                parentNode: parentNode,
                componentClassname: 'select-reason error hidden',
                text: l.cancel_sub_no_opt_picked_mob,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                closeButton: false
            });

            mCreateElement('textarea', {
                'class': 'reason-field textArea clearButton lengthChecker no-title-top',
                'maxLength': 1000,
                'data-wrapper-class': 'box-style fixed-width mobile hidden'
            }, parentNode);

            this.otherReasonTextArea = new mega.ui.MegaInputs($('.reason-field', this.domNode));
        }
    },

    continue: {
        value: function() {
            'use strict';

            if (!this.reasonNumber) {
                this.inlineAlert.show();
                return;
            }

            if (this.reasonString) {
                this.reason = `${this.reasonNumber} - ${this.reasonString}`;
            }
            else {
                this.reason = this.otherReasonTextArea.$input.val();

                if (!this.reason.trim()) {
                    this.showError(this.otherReasonTextArea, l.cancel_sub_empty_textarea_error_msg);

                    // Override the margin bottom style set by showError
                    this.otherReasonTextArea.$wrapper.css('marginBottom', '24px');
                    return;
                }
            }

            this.renderVerify();
        }
    },

    renderVerify: {
        value: function() {
            'use strict';

            this.info.textContent = l.account_delete_confirm;
            this.form.textContent = '';

            mCreateElement('input', {
                'class': 'underlinedText verifyDelete',
                'title': l[909],
                'type': 'password',
                'data-wrapper-class': 'box-style fixed-width mobile',
            }, this.form);

            this.password = new mega.ui.MegaInputs($('.verifyDelete', this.form));

            this.password.$input.rebind('keydown.verifyDelete', (e) => {
                if (e.keyCode === 13) {
                    this.beginVerify();
                }
            });

            this.deleteButton.text = l[16115];
            this.deleteButton.addClass('destructive');
            this.deleteButton.rebind('tap.deleteAccount', () => this.beginVerify());
        },
    },

    showError: {
        value: function(MegaInput, error) {
            'use strict';

            MegaInput.$input.megaInputsShowError(
                '<i class="sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>' +
                `<span>${error}</span>`
            );
        }
    },

    beginVerify: {
        value: function() {
            'use strict';

            if (this.password.$input.hasClass('errored')) {
                return;
            }

            const password = this.password.$input.val();

            loadingDialog.show();
            security.verifyUserPassword(password)
                .then((derivedKey) => this.finishProcess(derivedKey))
                .catch((ex) => {
                    console.warn(ex);
                    this.finishProcess('');
                });
        }
    },

    finishProcess: {
        value: function(key) {
            'use strict';

            if (!checkMyPassword(key)) {
                loadingDialog.hide();
                return this.showError(this.password, l[17920]);
            }

            const feedbackJson = `{"lang": "${lang}", "feedbackText": "${this.reason}"}`;

            const args = {
                a: 'clog',
                t: 'accClosureUserFeedback',
                d: feedbackJson
            };

            api.req(args)
                .then(() => {
                    this.completeCancellationProcess();
                });
        }
    },

    /**
     * Completes the cancellation process
     */
    completeCancellationProcess: {
        value: function() {
            'use strict';

            // Park the current account, then create a new account with a random password
            security.resetUser(this.code, u_attr.email, Math.random().toString(), function(code) {

                loadingDialog.hide();

                // If account was successfully canceled, logout the user and force reload the page
                if (code === 0) {
                    msgDialog('info', l.account_deleted, l[6189], false, () => {
                        u_logout(true).then(() => location.reload());
                    });
                }
                // If the code has expired
                else if (code === EEXPIRED || code === ENOENT) {

                    this.code = null;

                    // Show message that the cancellation link has expired and to try again
                    msgDialog('warninga',
                              l.account_delete_invalid_confirmation_link, l.account_delete_link_expired, false, () => {
                                  loadSubPage('fm/account');
                              });
                }
            });
        }
    },

    /**
     * Clear passoword input value when leaving the page
     */
    hide: {
        value: function() {
            'use strict';

            if (this.password) {
                this.password.setValue('');
            }
            mobile.settingsHelper.hide.call(this);
        }
    }
});
