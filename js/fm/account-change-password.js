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
        var $changePasswordButton = $('.account.change-password .button-container');

        var bindStrengthChecker = function() {
            $newPasswordField.rebind('keyup.pwdchg input.pwdchg change.pwdchg', function() {

                // Estimate the password strength
                var password = $.trim($(this).val());
                var passwordLength = password.length;

                $changePasswordButton.removeClass('closed');

                if (passwordLength === 0) {
                    $changePasswordButton.addClass('closed');
                    return false;
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
            // Trim the whitespace from the passwords
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
            accountChangePassword.changePassword(password);
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
    changePassword: function(newPassword) {

        'use strict';

        loadingDialog.show();

        // Check if 2FA is enabled on their account
        twofactor.isEnabledForAccount(function(result) {

            loadingDialog.hide();

            // If 2FA is enabled on their account
            if (result) {

                // Show the verify 2FA dialog to collect the user's PIN
                twofactor.verifyActionDialog.init(function(twoFactorPin) {
                    accountChangePassword.continueChangePassword(newPassword, twoFactorPin);
                });
            }
            else {
                // Otherwise change the password without 2FA
                accountChangePassword.continueChangePassword(newPassword, null);
            }
        });
    },

    /**
     * Continue to change the user's password (e.g. immediately or after they've entered their 2FA PIN
     * @param {String} newPassword The new password
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    continueChangePassword: function(newPassword, twoFactorPin) {
        'use strict';
        var self = this;

        var failingAction = function(status) {
            if (status === 1) {
                msgDialog('info', '', l[22126]);
            }
            self.resetForm();
        };

        var registerationMethod = 1;

        if (u_attr && u_attr.aav === 2) {
            registerationMethod = 2;
        }

        var checkPassPromise = security.changePassword.isPasswordTheSame($.trim(newPassword),
            registerationMethod);

        checkPassPromise.fail(failingAction);

        checkPassPromise.done(
            function() {
                if (registerationMethod === 2) {
                    security.changePassword.newMethod
                        (newPassword, twoFactorPin, accountChangePassword.completeChangePassword);
                }
                else {
                    security.changePassword.oldMethod(newPassword, twoFactorPin,
                        accountChangePassword.completeChangePassword);
                }
            });
    },

    /**
     * Update the UI after attempting to change the password and let the user know if it failed or was successful
     * @param {Number} result The result from the change password API request
     */
    completeChangePassword: function(result) {

        'use strict';

        loadingDialog.hide();

        // If something went wrong with the 2FA PIN
        if (result === EFAILED || result === EEXPIRED) {
            msgDialog('warninga', l[135], l[19216]);
        }

        // If something else went wrong, show an error
        else if (typeof result === 'number' && result < 0) {
            msgDialog('warninga', l[135], l[47]);
        }
        else {
            // Success
            showToast('settings', l[725]);
        }

        // Clear password fields
        $('#account-new-password').val('');
        $('#account-confirm-password').val('');

        // Update the account page
        accountUI();
    }
};
