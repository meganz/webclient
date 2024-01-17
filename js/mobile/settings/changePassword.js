mobile.settings.account.changePassword = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('settings-account-change-password');

            mCreateElement('input', {
                'class': 'underlinedText newPassword strengthChecker',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'name': 'newPassword',
                'title': l[717],
                'type': 'password'
            }, this.domNode);

            mCreateElement('input', {
                'class': 'underlinedText confirmNewPassword',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'name': 'confirmNewPassword',
                'title': l[718],
                'type': 'password'
            }, this.domNode);

            new MegaMobileButton({
                parentNode: this.domNode,
                componentClassname: 'form-button block',
                text: l[706]
            }).on('tap.changePassword', () => this.changePassword());

            this.render();
        }
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');

            this.newPasswordInput = new mega.ui.MegaInputs($('.newPassword', this.domNode));
            this.newPasswordInput.setValue('');

            this.confirmNewPasswordInput = new mega.ui.MegaInputs($('.confirmNewPassword', this.domNode));
            this.confirmNewPasswordInput.setValue('');

            this.show();
        }
    },

    showError: {
        value: function(error) {
            'use strict';

            (error === l[9066] ? this.confirmNewPasswordInput : this.newPasswordInput).showError(
                '<i class="sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>' +
                `<span>${error}</span>`
            );
        }
    },

    changePassword: {
        value: function() {
            'use strict';

            const newPassword = this.newPasswordInput.$input.val();
            const confirmNewPassword = this.confirmNewPasswordInput.$input.val();

            // If the fields are not completed, the button should not do anything
            if (newPassword.length < 1 || confirmNewPassword.length < 1) {
                return false;
            }

            // Check if the entered passwords are valid or strong enough
            const passwordValidationResult = security.isValidPassword(newPassword, confirmNewPassword);

            // If not a valid password, show an error
            if (passwordValidationResult !== true) {
                return this.showError(passwordValidationResult);
            }

            // Pass the encrypted password to the API
            this.processChange(newPassword).catch(tell);
        }
    },

    /**
     * Check 2FA and run the proccess
     * @param {String} newPassword The new password
     * @param {Number} error API exception value to display an error message in 2FA, optional
     * @returns {void} void
     */
    processChange: {
        value: async function(newPassword, error) {
            'use strict';

            const hasTwoFactor = await twofactor.isEnabledForAccount();
            let twoFactorPin = null;

            if (hasTwoFactor &&
                !(twoFactorPin = await mobile.settings.account.twofactorVerifyAction.init(false, error))) {
                return false;
            }

            this.continueChangePassword(newPassword, twoFactorPin)
                .then(() => this.completeChangePassword())
                .catch((ex) => {

                    // If something went wrong with the 2FA PIN
                    if (ex === EFAILED || ex === EEXPIRED) {
                        this.processChange(newPassword, ex).catch(tell);
                        return false;
                    }

                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // If it is the same password as the current one
                    if (String(ex).includes(l[22126])) {
                        msgDialog('warninga', l[135], l[22126]);
                    }
                    else {
                        tell(ex);
                    }
                })
                .finally(() => {
                    loadingDialog.hide();
                });
        }
    },

    continueChangePassword: {
        value: async function(newPassword, twoFactorPin) {
            'use strict';

            loadingDialog.show();

            // Check their current Account Authentication Version before proceeding
            const accountAuthVersion = await security.changePassword.checkAccountVersion();

            const same = await security.changePassword.isPasswordTheSame($.trim(newPassword), accountAuthVersion);

            // You have entered your current password, please enter a new password.
            if (same) {
                throw l[22126];
            }

            if (accountAuthVersion === 2) {
                return security.changePassword.newMethod(newPassword, twoFactorPin);
            }

            return security.changePassword.oldMethod(newPassword, twoFactorPin);
        }
    },

    completeChangePassword: {
        value: function() {
            'use strict';

            // Hide 2FA overlay
            mega.ui.overlay.hide();

            // Load the account page
            loadSubPage('fm/account');

            const moreInfo = document.createElement('p');
            moreInfo.append(parseHTML(l.password_changed_more_info));

            // Show 'Your password has been changed' message
            mega.ui.sheet.show({
                name: 'change-password',
                type: 'modal',
                showClose: true,
                icon: 'key',
                title: l.password_changed_title,
                contents: [l.password_changed_info, moreInfo],
                actions: [
                    {
                        type: 'normal',
                        text: l.recovery_key_export_save,
                        className: 'primary',
                        onClick: () => {
                            mega.ui.sheet.hide();
                            loadSubPage('fm/account/security/backup-key');
                        }
                    }
                ]
            });
        }
    }
});
