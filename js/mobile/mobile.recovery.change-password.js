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

        // Cache the selector for the change password process after entering the key
        this.$screen = $('.reset-password-after-entering-key');

        // If following the Park Account process, show that page
        if (type === 'park') {
            this.$screen = $('.park-account-change-password');
        }

        // Initialise functionality
        this.loadPasswordEstimatorLibrary();
        this.initKeyupEvents();
        this.initPasswordStrengthCheck();
        this.initUpdateButton(type);

        // Show the screen
        this.$screen.removeClass('hidden');
    },


    /**
     * Load the ZXCVBN password strength estimator library
     */
    loadPasswordEstimatorLibrary: function() {

        'use strict';

        // Make sure the library is loaded
        if (typeof zxcvbn === 'undefined') {

            // Show loading spinner
            var $loader = this.$screen.find('.estimator-loading-icon').addClass('loading');

            // On completion of loading, hide the loading spinner
            M.require('zxcvbn_js')
                .done(function() {
                    $loader.removeClass('loading');
                });
        }
    },

    /**
     * Show what strength the currently entered password is on key up
     */
    initPasswordStrengthCheck: function() {

        'use strict';

        var $passwordStrengthBar = this.$screen.find('.password-strength');
        var $passwordInput = this.$screen.find('.recovery-password-input');

        // Add keyup event to the password text field
        $passwordInput.rebind('keyup', function() {

            // Make sure the ZXCVBN password strength estimator library is loaded first
            if (typeof zxcvbn !== 'undefined') {

                // Estimate the password strength
                var password = $.trim($passwordInput.val());
                var passwordScore = zxcvbn(password).score;
                var passwordLength = password.length;

                // Remove previous strength classes that were added
                $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

                // Add colour coding
                if (passwordLength === 0) {
                    return false;
                }
                else if (passwordLength < 8) {
                    $passwordStrengthBar.addClass('good1');    // Too short
                }
                else if (passwordScore === 4) {
                    $passwordStrengthBar.addClass('good5');    // Strong
                }
                else if (passwordScore === 3) {
                    $passwordStrengthBar.addClass('good4');    // Good
                }
                else if (passwordScore === 2) {
                    $passwordStrengthBar.addClass('good3');    // Medium
                }
                else if (passwordScore === 1) {
                    $passwordStrengthBar.addClass('good2');    // Weak
                }
                else {
                    $passwordStrengthBar.addClass('good1');    // Very Weak
                }
            }
        });
    },

    /**
     * Enable the Update button if the fields are complete and correct
     */
    initKeyupEvents: function() {

        'use strict';

        var $passwordField = this.$screen.find('.recovery-password-input');
        var $confirmPasswordField = this.$screen.find('.recovery-password-confirm-input');
        var $updateButton = this.$screen.find('.update-password-button');
        var $allFields = $passwordField.add($confirmPasswordField);

        // Add keyup event to the input fields
        $allFields.rebind('keyup', function(event) {

            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // Change the button to red to enable it if they have entered something in all the fields
            if (password.length > 0 && confirmPassword.length > 0) {

                // Activate the register button
                $updateButton.addClass('active');

                // If the Enter key is pressed try updating
                if (event.which === 13) {
                    $updateButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $updateButton.removeClass('active');
            }
        });
    },

    /**
     * Initialise the Update button to update the user's password and re-encrypt their Master/Recovery Key
     * @param {String} type The password change method ('park' for Park Account, or 'key' for the Recovery Key method)
     */
    initUpdateButton: function(type) {

        'use strict';

        var $passwordField = this.$screen.find('.recovery-password-input');
        var $confirmPasswordField = this.$screen.find('.recovery-password-confirm-input');
        var $passwordStrengthBar = this.$screen.find('.password-strength');
        var $updateButton = this.$screen.find('.update-password-button');

        // Add click/tap handler to button
        $updateButton.off('tap').on('tap', function() {

            // Get the current text field values
            var password = $.trim($passwordField.val());
            var confirmPassword = $.trim($confirmPasswordField.val());

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (password.length < 1 || confirmPassword.length < 1) {
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $passwordField.add($confirmPasswordField).trigger("blur");

            // If the passwords are not the same
            if (password !== confirmPassword) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show an error and don't proceed
                mobile.messageOverlay.show(l[9066]);        // The passwords are not the same...
                return false;
            }

            // Check for minimum password length
            if (password.length < 8) {

                // Then show an error and don't proceed
                mobile.messageOverlay.show(l[18701]);
                return false;
            }

            // If the password has the 'Very weak' class i.e. it's not strong enough
            if ($passwordStrengthBar.hasClass('good1')) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');

                // Then show an error and don't proceed
                mobile.messageOverlay.show(l[1104]);        // Please strengthen your password
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
        var recoveryEmail = mobile.recovery.fromEmailLink.recoveryEmail;
        var recoveryCode = mobile.recovery.fromEmailLink.recoveryCode;

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
