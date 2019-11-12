/**
 * My Account Change Password functionality
 */
mobile.account.changePassword = {

    /**
     * @param {Object} $page The jQuery selector object for the current page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache the selector for the page
        this.$page = $('.mobile.my-account-change-password-page');

        // Initialise page functionality
        this.initUpdateButton();

        // Load password strength estimator and initialise the back button to go back to the main My Account page
        mobile.initPasswordFieldsKeyupEvent(this.$page);
        mobile.initPasswordEstimatorLibrary(this.$page);
        mobile.initPasswordStrengthCheck(this.$page);
        mobile.initBackButton(this.$page, 'fm/account/');

        // Initialise the top menu
        topmenuUI();

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the Update button to update the user's password and re-encrypt their Master/Recovery Key
     */
    initUpdateButton: function() {

        'use strict';

        var $passwordField = this.$page.find('.password-input');
        var $confirmPasswordField = this.$page.find('.password-confirm-input');
        var $updateButton = this.$page.find('.update-password-button');

        // Add click/tap handler to button
        $updateButton.off('tap').on('tap', function() {

            // Get the current text field values
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (password.length < 1 || confirmPassword.length < 1) {
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $passwordField.add($confirmPasswordField).trigger('blur');

            // Check if the entered passwords are valid or strong enough
            var passwordValidationResult = security.isValidPassword(password, confirmPassword);

            // If bad result
            if (passwordValidationResult !== true) {

                // Add red border, red input text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show error dialog and return early
                mobile.messageOverlay.show(passwordValidationResult);
                return false;
            }

            // Pass the encrypted password to the API
            mobile.account.changePassword.updatePassword(password);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Updates the user's password, re-encrypts their Master Key, then sends to the server
     * @param {String} newPassword The user's new password
     */
    updatePassword: function(newPassword) {

        'use strict';

        loadingDialog.show();

        // Check if 2FA is enabled on their account
        mobile.twofactor.isEnabledForAccount(function(result) {

            loadingDialog.hide();

            // If 2FA is enabled on their account
            if (result) {

                // Hide the current page
                mobile.account.changePassword.$page.addClass('hidden');

                // Show the verify 2FA action page to collect the user's PIN
                mobile.twofactor.verifyAction.init(function(twoFactorPin) {
                    mobile.account.changePassword.continueChangePassword(newPassword, twoFactorPin);
                });
            }
            else {
                // Otherwise change the password without 2FA
                mobile.account.changePassword.continueChangePassword(newPassword, null);
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
        var $passwordField = this.$page.find('.password-input');
        var $confirmPasswordField = this.$page.find('.password-confirm-input');

        var failingAction = function(status) {
            $passwordField.val('');
            $confirmPasswordField.val('');
            self.$page.find('.password-strength').removeClass('good1 good2 good3 good4 good5');


            if (status === 1) {
                mobile.messageOverlay.show(l[22126]);
                $('#mobile-ui-error .text-button.cancel').addClass('hidden');
            }
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
                    security.changePassword.newMethod(
                        newPassword, twoFactorPin, mobile.account.changePassword.completeChangePassword
                    );
                }
                else {
                    security.changePassword.oldMethod(
                        newPassword, twoFactorPin, mobile.account.changePassword.completeChangePassword
                    );
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

        // Cache selector
        var $page = mobile.account.changePassword.$page;
        var $verifyActionPage = $('.mobile.two-factor-page.verify-action-page');

        // If something went wrong with the 2FA PIN
        if (result === EFAILED || result === EEXPIRED) {
            mobile.twofactor.verifyAction.showVerificationError();
        }

        // If something else went wrong, show an error
        else if (typeof result === 'number' && result < 0) {
            $page.removeClass('hidden');
            $verifyActionPage.addClass('hidden');
            mobile.messageOverlay.show(l[135]);
        }
        else {
            // Success
            $page.removeClass('hidden');
            $verifyActionPage.addClass('hidden');

            // Show 'Your password has been changed' message and load the account page on button click
            mobile.messageOverlay.show(l[725], null, function() {
                loadSubPage('fm/account');
            });
        }

        // Clear password fields
        $page.find('.password-input').val('');
        $page.find('.password-confirm-input').val('');
    }
};
