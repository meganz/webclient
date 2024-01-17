/**
 * Functionality for the My Account page, Security section to change the user's password
 */
var accountChangePassword = {

    /**
     * Initialise the change password functionality
     */
    init:function() {

        'use strict';

        this.resetForm();
        this.initPasswordKeyupHandler();
        this.initChangePasswordButton();
    },

    /**
     * Reset the text inputs if coming back to the page
     */
    resetForm: function() {

        'use strict';

        $('#account-new-password').val('').trigger('blur').trigger('input');
        $('#account-confirm-password').val('').trigger('blur');
        $('.account-pass-lines').removeClass('good1 good2 good3 good4 good5');
    },

    /**
     * Initialise the handler to change the password strength indicator while typing the password
     */
    initPasswordKeyupHandler: function() {

        'use strict';

        var $newPasswordField = $('#account-new-password');
        var $changePasswordButton = $('.account.change-password .save-container');

        var bindStrengthChecker = function() {
            $newPasswordField.rebind('keyup.pwdchg input.pwdchg change.pwdchg', function() {

                // Estimate the password strength
                var password = $.trim($(this).val());
                var passwordLength = password.length;

                if (passwordLength === 0) {
                    $changePasswordButton.addClass('closed');
                }
                else {
                    $changePasswordButton.removeClass('closed');
                }
            });

            if ($newPasswordField.val().length) {
                // Reset strength after re-rendering.
                $newPasswordField.trigger('keyup.pwdchg');
            }
        };

        bindStrengthChecker();
    },



    /**
     * Initalise the change password button to verify the password (and 2FA if active) then change the password
     */
    initChangePasswordButton: function() {

        'use strict';

        // Cache selectors
        var $newPasswordField = $('#account-new-password');
        var $newPasswordConfirmField = $('#account-confirm-password');
        var $changePasswordButton = $('.account .change-password-button');
        var $passwordStrengthBar = $('.account-pass-lines');

        $changePasswordButton.rebind('click', function() {

            if ($(this).hasClass('disabled')) {
                return false;
            }

            var password = $newPasswordField.val();
            var confirmPassword = $newPasswordConfirmField.val();

            // Check if the entered passwords are valid or strong enough
            var passwordValidationResult = security.isValidPassword(password, confirmPassword);

            // If bad result
            if (passwordValidationResult !== true) {

                // Show error message
                msgDialog('warninga', l[135], passwordValidationResult, false, function() {
                    $newPasswordField.val('');
                    $newPasswordConfirmField.val('');
                    $newPasswordField.trigger('input').trigger('focus');
                    $newPasswordConfirmField.trigger('blur');
                });

                // Return early to prevent password change
                return false;
            }

            // Trigger save password on browser with correct email
            accountChangePassword.emulateFormSubmission(password);

            // Proceed to change the password
            accountChangePassword.changePassword(password)
                .then(() => {

                    // Success
                    showToast('settings', l[725]);
                })
                .catch((ex) => {

                    if (ex === EFAILED || ex === EEXPIRED) {
                        msgDialog('warninga', l[135], l[19192]);
                    }
                    else if (String(ex).includes(l[22126])) {
                        msgDialog('warninga', l[135], l[22126]);
                    }
                    else if (ex !== EBLOCKED) {
                        tell(ex);
                    }
                })
                .finally(() => {
                    // Clear password fields
                    accountChangePassword.resetForm();
                    $('#account-new-password').val('');
                    $('#account-confirm-password').val('');

                    // Update the account page
                    accountUI();
                });
        });
    },

    /**
     * Emulate form submission to trigger correctly behaved password manager update.
     * @param {String} password The new password
     */
    emulateFormSubmission: function(password) {

        'use strict';

        var form = document.createElement("form");
        form.className = 'hidden';

        var elem1 = document.createElement("input");
        var elem2 = document.createElement("input");
        var elemBtn = document.createElement("input");

        elem1.value = u_attr.email;
        elem1.type = 'email';
        form.appendChild(elem1);

        elem2.value = password;
        elem2.type = 'password';
        form.appendChild(elem2);

        elemBtn.type = 'submit';
        form.appendChild(elemBtn);

        document.body.appendChild(form);

        $(form).on('submit', function() {
            return false;
        });

        elemBtn.click();

        document.body.removeChild(form);
    },

    /**
     * Change the user's password
     * @param {String} newPassword The new password
     */
    async changePassword(newPassword) {
        'use strict';
        let twoFactorPin = null;

        // Check their current Account Authentication Version before proceeding
        const [
            hasTwoFactor,
            accountAuthVersion
        ] = await Promise.all([twofactor.isEnabledForAccount(), security.changePassword.checkAccountVersion()]);

        // Check if 2FA is enabled on their account
        if (hasTwoFactor) {

            // Show the verify 2FA dialog to collect the user's PIN
            twoFactorPin = await twofactor.verifyActionDialog.init();
        }

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
};
