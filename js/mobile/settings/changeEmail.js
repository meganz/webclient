mobile.settings.account.changeEmail = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                return this.render();
            }

            this.domNode = this.generatePage('settings-account-change-email');

            mCreateElement('input', {
                'class': 'underlinedText currentEmail',
                'data-wrapper-class': 'box-style fixed-width mobile readonly',
                'name': 'currentEmail',
                'title': l[7744],
                'type': 'text',
                'value': u_attr.email
            }, this.domNode);

            mCreateElement('input', {
                'autocomplete': 'disabled',
                'class': 'underlinedText newEmail',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'title': l[7745],
                'type': 'text'
            }, this.domNode);

            new MegaMobileButton({
                parentNode: this.domNode,
                componentClassname: 'form-button block',
                text: l[7743]
            }).on('tap.changeEmail', () => this.changeEmail());

            this.render();
        },
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');
            this.buttonLabel = this.domNode.querySelector('.form-button span');
            this.buttonLabel.textContent = l[7743];

            this.currentEmailInput = new mega.ui.MegaInputs($('.currentEmail', this.domNode));
            this.currentEmailInput.$input.val(u_attr.email).attr('readonly', true);

            this.newEmailInput = new mega.ui.MegaInputs($('.newEmail', this.domNode));

            this.newEmailInput.$input.rebind('keydown.changeEmail', (e) => {
                if (e.keyCode === 13) {
                    this.changeEmail();
                }
            });
            this.newEmailInput.$input.rebind('input.changeButtonLabel', (e) => {
                if (!localStorage.new_email) {
                    return false;
                }
                this.buttonLabel.textContent =
                    e.target.value === localStorage.new_email ? l.resend_email : l[7743];
            }).val('').megaInputsHideError();

            this.show();
        }
    },

    showError: {
        value: function(error) {
            'use strict';

            this.newEmailInput.$input.megaInputsShowError(
                '<i class="sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>' +
                `<span>${error}</span>`
            );
        }
    },

    changeEmail: {
        value: function() {
            'use strict';

            const newEmail = this.newEmailInput.$input.val().trim().toLowerCase();

            // If not a valid email, show an error
            if (!isValidEmail(newEmail)) {
                return this.showError(l[1513]);
            }

            // If there is text in the email field and it doesn't match the existing one
            if (newEmail && u_attr.email !== newEmail) {
                this.processChange(newEmail).catch(tell);
            }
            else {
                this.showError(l.m_change_email_same);
            }
        }
    },

    /**
     * Check 2FA and run the proccess
     * @param {String} newEmail The new email
     * @param {Number} error API exception value to display an error message in 2FA, optional
     * @returns {void} void
     */
    processChange: {
        value: async function(newEmail, error) {
            'use strict';

            const hasTwoFactor = await twofactor.isEnabledForAccount();
            let twoFactorPin = null;

            if (hasTwoFactor &&
                !(twoFactorPin = await mobile.settings.account.twofactorVerifyAction.init(false, error))) {
                return false;
            }
            this.continueChangeEmail(newEmail, twoFactorPin);
        }
    },

    /**
     * Initiate the change email request to the API
     * @param {String} newEmail The new email
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     * @returns {void} void
     */
    continueChangeEmail: {
        value: function(newEmail, twoFactorPin) {
            'use strict';

            loadingDialog.show();

            // Prepare the request
            const requestParams = {
                a: 'se',            // Set Email
                aa: 'a',
                e: newEmail,        // The new email address
                i: requesti         // Last request ID
            };

            // If the 2FA PIN was entered, send it with the request
            if (twoFactorPin !== null) {
                requestParams.mfa = twoFactorPin;
            }

            // Change of email request
            api.req(requestParams)
                .then(() => {
                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    this.buttonLabel.textContent = l.resend_email;
                    mobile.showToast(l.email_confirmation_sent.replace('%1', newEmail));
                    localStorage.new_email = newEmail;
                })
                .catch((ex) => {

                    // If something went wrong with the 2FA PIN
                    if (ex === EFAILED || ex === EEXPIRED) {
                        this.processChange(newEmail, ex).catch(tell);
                        return false;
                    }

                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // If they have already requested a confirmation link for that email address, show an error
                    if (ex === -12) {
                        msgDialog('warninga', l.resend_email_error,  mega.icu.format(l.resend_email_error_info, 2));
                    }

                    // If they have already requested the confirmation links twice in one hour, show an error
                    else if (ex === -6) {
                        msgDialog(
                            'warninga', l.change_email_error,
                            mega.icu.format(l.change_email_error_info, u_attr.b ? 10 : 2)
                        );
                    }

                    // EACCESS, the email address is already in use or current user is invalid. (less likely).
                    else if (typeof ex === 'number' && ex === -11) {
                        msgDialog('warninga', l[135], l[19562]);
                    }

                    // If something else went wrong, show an error
                    else if (typeof ex === 'number' && ex < 0) {
                        msgDialog('warninga', l[135], l[47]);
                    }
                })
                .finally(() => loadingDialog.hide());
        }
    }
});

