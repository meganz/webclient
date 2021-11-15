/**
 * Mobile webclient account email change page logic.
 */
(function(scope) {
    'use strict';

    scope.changeEmail = {
        $page: null,
        $step1: null,
        $step2: null,
        $error: null,
        $inputContainer: null,
        $newEmail: null,
        $changeButton: null,

        /**
         * Init the account email change page.
         *
         * @returns {void} void
         */
        init: function() {
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return;
            }

            this.$page = $('.my-account-change-email-page', '.mobile');
            this.$step1 = $('.email-change-step1', this.$page);
            this.$step2 = $('.email-change-step2', this.$page);
            this.$changeButton = $('.update-email-button', this.$page);
            this.$inputContainer = $('.email-input.email-new', this.$page);
            this.$newEmail = $('.email-new-input', this.$inputContainer);
            this.$error = $('.email-input-error', this.$page);

            this.prepareEmailInputs();
            mobile.initBackButton(this.$page, 'fm/account');

            topmenuUI();

            this.$page.removeClass('hidden');
            this.$newEmail.trigger('focus');
        },

        prepareEmailInputs: function() {
            $('.email-current-input', this.$page).attr('placeholder', u_attr.email);
            this.$newEmail.rebind('keyup.accemail', () => {
                if (this.$inputContainer.hasClass('error')) {
                    this.$inputContainer.removeClass('error');
                }
                if (this.$newEmail.val()) {
                    this.$changeButton.addClass('active');
                }
                else {
                    this.$changeButton.removeClass('active');
                }
            });
            this.$changeButton.rebind('click.accemail', () => {
                if (!this.$changeButton.hasClass('active')) {
                    return false;
                }
                const newEmail = this.$newEmail.val().trim().toLowerCase();

                // If not a valid email, show an error
                if (!isValidEmail(newEmail)) {
                    this.showError(l[1513]);
                    return false;
                }

                // If there is text in the email field and it doesn't match the existing one
                if (newEmail && u_attr.email !== newEmail) {
                    this.processChange(newEmail);
                }
                else {
                    this.showError(l.m_change_email_same);
                }
            });
        },

        showError: function(error) {
            this.$error.text(error);
            this.$inputContainer.addClass('error');
        },

        processChange: function(newEmail) {
            loadingDialog.show();
            mobile.twofactor.isEnabledForAccount((result) => {
                loadingDialog.hide();
                if (result) {
                    mobile.account.changeEmail.$page.addClass('hidden');
                    mobile.twofactor.verifyAction.init((twoFactorPin) => {
                        mobile.twofactor.verifyAction.$page.addClass('hidden');
                        mobile.account.changeEmail.$page.removeClass('hidden');
                        mobile.account.changeEmail.continueChangeEmail(newEmail, twoFactorPin);
                    });
                }
                else {
                    mobile.account.changeEmail.continueChangeEmail(newEmail, null);
                }
            });
        },

        /**
         * Initiate the change email request to the API
         * @param {String} newEmail The new email
         * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
         * @returns {void} void
         */
        continueChangeEmail: function(newEmail, twoFactorPin) {
            loadingDialog.show();
            const requestParams = {
                a: 'se',
                aa: 'a',
                e: newEmail,
                i: requesti
            };

            if (twoFactorPin !== null) {
                requestParams.mfa = twoFactorPin;
            }
            api_req(requestParams, {
                callback: function(result) {
                    loadingDialog.hide();
                    if (result === EFAILED || result === EEXPIRED) {
                        msgDialog('warninga', l[135], l[19216]);
                    }
                    else if (result === -12) {
                        return msgDialog('warninga', l[135], l[7717]);
                    }
                    else if (typeof result === 'number' && result === -11) {
                        return msgDialog('warninga', l[135], l[19562]);
                    }
                    else if (typeof result === 'number' && result < 0) {
                        msgDialog('warninga', l[135], l[47]);
                    }
                    else {
                        mobile.account.changeEmail._finishProcess();
                        localStorage.new_email = newEmail;
                    }
                }
            });
        },

        _finishProcess: function() {
            this.$step1.addClass('hidden');
            $('.fm-header', this.$page).addClass('hidden');
            $('button', this.$step2).rebind('click.accemail', () => {
                loadSubPage('fm/account');
            });
            this.$step2.removeClass('hidden');
        },
    };
})(mobile.account);
