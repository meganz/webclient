/**
 * Recover Account Change Password functionality. After they have entered their recovery key and verified it is
 * correct (or they have chosen to park their account), this page will let the user change their password.
 *
 * Method A - Step 5 & Method B - Step 4 of recovery process
 */
mobile.recovery.changePassword = {

    /**
     * @param {Object} $screen The jQuery selector object for the current page/screen
     */
    $screen: null,

    /**
     * Initialise the page
     * @param {String} type The password change method ('park' for Park Account, or 'key' for the Recovery Key method)
     */
    init: function(type) {

        'use strict';
        this.type = type;

        // Cache the selector for the change password process after entering the key
        this.$screen = $('.reset-password-after-entering-key');

        // If following the Park Account process, show that page
        if (type === 'park') {
            this.$screen = $('.park-account-change-password');
        }

        // Initialise page functionality
        this.initDataLossCheckbox(type);
        this.initUpdateButton(type);

        // Load password strength estimator
        this.initPasswordFieldsChangeEvent();
        mobile.initPasswordEstimatorLibrary(this.$screen);
        mobile.initPasswordStrengthCheck(this.$screen);

        // Show the screen
        this.$screen.removeClass('hidden');
    },

    /**
     * Attach event listener to password fields to enable the button when conditions are met.
     */
    initPasswordFieldsChangeEvent: function() {
        'use strict';

        var $passwordField = this.$screen.find('.password-input');
        var $confirmPasswordField = this.$screen.find('.password-confirm-input');
        var $allFields = $passwordField.add($confirmPasswordField);

        // Add keyup event to the input fields
        var self = this;
        $allFields.rebind('keyup.buttonenable', function() {
            self.updateButtonState();
        });
    },

    /**
     * Helper function to update the button state, call whenever the active state of the button should be quuestioned.
     */
    updateButtonState: function() {
        'use strict';

        var $passwordField = this.$screen.find('.password-input');
        var $confirmPasswordField = this.$screen.find('.password-confirm-input');
        var $button = this.$screen.find('.update-password-button');

        var password = $passwordField.val();
        var confirmPassword = $confirmPasswordField.val();
        var checkResult = this.type === "key" ? true : this.$confirmDataLossCheck.is(':checked');

        // Change the button to red to enable it if they have entered something in all the fields
        if (password.length > 0 && confirmPassword.length > 0 && checkResult) {

            // Activate the button
            $button.addClass('active');

            // If the Enter key is pressed try updating
            if (event.which === 13) {
                $button.trigger('tap');
            }
        }
        else {
            // Grey it out if they have not completed one of the fields
            $button.removeClass('active');
        }
    },

    /**
     * Init event handlers for data loss confirmation checkbox.
     * @param type
     */
    initDataLossCheckbox: function(type) {
        'use strict';
        if (type !== "key") {
            var self = this;
            this.$confirmDataLossBlock = this.$screen.find('.mobile.park-account.confirm-data-loss');
            this.$confirmDataLossCheck = this.$confirmDataLossBlock.find('input');
            var $checkboxWrapper = this.$confirmDataLossBlock.find('.checkdiv');

            this.$confirmDataLossBlock.off('tap').on('tap', function() {
                // If checked already, uncheck it
                if (self.$confirmDataLossCheck.is(':checked')) {
                    $checkboxWrapper.addClass('checkboxOff').removeClass('checkboxOn');
                    self.$confirmDataLossCheck.prop('checked', false);
                    self.updateButtonState();
                }
                else {
                    // Otherwise check it
                    $checkboxWrapper.removeClass('checkboxOff').addClass('checkboxOn');
                    self.$confirmDataLossCheck.prop('checked', true);
                    self.updateButtonState();
                }
                return false;
            });
        }
    },

    /**
     * Initialise the Update button to update the user's password and re-encrypt their Master/Recovery Key
     * @param {String} type The password change method ('park' for Park Account, or 'key' for the Recovery Key method)
     */
    initUpdateButton: function(type) {

        'use strict';

        var $passwordField = this.$screen.find('.recovery-password-input');
        var $confirmPasswordField = this.$screen.find('.recovery-password-confirm-input');
        var $updateButton = this.$screen.find('.update-password-button');

        // Add click/tap handler to button
        $updateButton.off('tap').on('tap', function() {
            if (!$updateButton.hasClass('active')) {
                return false;
            }

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

            // If recovery initiated via Recovery Key, pass the encrypted password to the API
            if (type === 'key') {
                mobile.recovery.changePassword.updatePassword(password);
            }
            else {
                // Otherwise they're following the Park Account process so create a new Master/Recovery Key and account
                mobile.recovery.changePassword.createNewAccount(password);
            }

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

        // Get details from previous steps in the process
        var recoveryEmail = mobile.recovery.fromEmailLink.recoveryEmail;
        var recoveryCode = mobile.recovery.fromEmailLink.recoveryCode;
        var recoveryKeyArray = mobile.recovery.enterKey.recoveryKeyArray;

        loadingDialog.show();

        // Change the password, re-encrypt the Master Key and send the encrypted key to the server
        security.resetKey(recoveryCode, recoveryKeyArray, recoveryEmail, newPassword, function(responseCode) {

            loadingDialog.hide();

            // If successful
            if (responseCode === 0) {

                // Show message that the password has been reset successfully
                mobile.messageOverlay.show(l[1955], l[1981], function() {

                    // Pre-fill the email on the login page
                    mobile.signin.previousEmailUsed = recoveryEmail;

                    // Load the login page
                    loadSubPage('login');
                });
            }

            // Show error that the Recovery Key you supplied does not match this account
            else if (responseCode === EKEY) {
                mobile.messageOverlay.show(l[1977], l[1978]);
            }

            // The account they're trying to reset is blocked
            else if (responseCode === EBLOCKED) {
                mobile.messageOverlay.show(l[1979], l[1980]);
            }

            // This recovery link has expired
            else if (responseCode === EEXPIRED || responseCode === ENOENT) {
                mobile.messageOverlay.show(l[1966], l[1967], function() {
                    loadSubPage('login');
                });
            }
        });
    },

    /**
     * Updates the user's password, creates a new Master Key, encrypts their Master Key and sends it to the server
     * @param {String} newPassword The user's new password
     */
    createNewAccount: function(newPassword) {

        'use strict';

        // Get details from previous steps in the process
        var recoveryEmail = mobile.recovery.fromEmailLink.recoveryEmail || sessionStorage.recoveryEmail;
        var recoveryCode = mobile.recovery.fromEmailLink.recoveryCode || sessionStorage.recoveryCode;

        loadingDialog.show();

        // Finish the Park Account process
        security.resetUser(recoveryCode, recoveryEmail, newPassword, function(responseCode) {

            loadingDialog.hide();

            // If successful
            if (responseCode === 0) {

                // Show message that the account has been parked successfully
                mobile.messageOverlay.show(l[1975], l[1976], function() {

                    // Pre-fill the email on the login page
                    mobile.signin.previousEmailUsed = recoveryEmail;

                    // Clear session storage variables.
                    sessionStorage.removeItem('recoveryEmail');
                    sessionStorage.removeItem('recoveryCode');

                    // Load the login page
                    loadSubPage('login');
                });
            }

            // Show error that the Recovery Key you supplied does not match this account
            else if (responseCode === EKEY) {
                mobile.messageOverlay.show(l[1977], l[1978]);
            }

            // The account they're trying to park is blocked
            else if (responseCode === EBLOCKED) {
                mobile.messageOverlay.show(l[1979], l[1980]);
            }

            // This recovery link has expired
            else if (responseCode === EEXPIRED || responseCode === ENOENT) {
                mobile.messageOverlay.show(l[1966], l[1967], function() {
                    loadSubPage('login');
                });
            }
        });
    }
};
