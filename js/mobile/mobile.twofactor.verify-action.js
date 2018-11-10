/**
 * Functionality for the Two-Factor Authentication Verify Action page. This is used when an account
 * action like changing email/password or canceling account which requires the 2FA pin to proceed.
 */
mobile.twofactor.verifyAction = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the page
     * @param {Function} completeCallback The callback to run after 2FA verify
     */
    init: function(completeCallback) {

        'use strict';

        // Cache selector
        this.$page = $('.mobile.two-factor-page.verify-action-page');

        // Initialise mega icon and back button functionality
        mobile.initHeaderMegaIcon();
        mobile.initBackButton(this.$page, 'twofactor/intro');

        // Init keyup and verify button functionality
        this.initKeyupFunctionality();
        this.initVerifyButton(completeCallback);

        // Show the account page content
        this.$page.removeClass('hidden');

        // Put the focus in the PIN input field after its visible
        this.$page.find('.two-factor-seed-input input').trigger('focus');
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = mobile.twofactor.verifyAction.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifyAction.$page.find('.two-factor-verify-btn');
        var $warningText = mobile.twofactor.verifyAction.$page.find('.warning-text-field');

        // On keyup or clicking out of the text field
        $pinCodeInput.off('keyup blur').on('keyup blur', function() {

            // Hide previous warnings for incorrect PIN codes
            $warningText.addClass('hidden');

            // Trim whitespace from the ends of the PIN entered
            var pinCode = $pinCodeInput.val();
            var trimmedPinCode = $.trim(pinCode);

            // If empty, grey out the button so it appears unclickable
            if (trimmedPinCode === '' || trimmedPinCode.length !== 6 || Number.isInteger(trimmedPinCode)) {
                $verifyButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $verifyButton.addClass('active');
            }
        });
    },

    /**
     * Initialise the Verify button
     * @param {Function} completeCallback The function to run after the PIN has been added
     */
    initVerifyButton: function(completeCallback) {

        'use strict';

        // Cache selectors
        var $pinCode = mobile.twofactor.verifyAction.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifyAction.$page.find('.two-factor-verify-btn');

        // On Verify button click/tap
        $verifyButton.off('tap').on('tap', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCode.val());

            // Send the PIN code to the callback
            completeCallback(pinCode);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Shows a verification error on the 2FA login verification page when there was an incorrect PIN
     */
    showVerificationError: function() {

        'use strict';

        var $warningText = mobile.twofactor.verifyAction.$page.find('.warning-text-field');
        var $pinCodeInput = mobile.twofactor.verifyAction.$page.find('.two-factor-seed-input input');

        // Show a message that the PIN code was incorrect and clear the text field
        $warningText.removeClass('hidden');
        $pinCodeInput.val('');

        // Put the focus in the PIN input field
        $pinCodeInput.trigger('focus');
    }
};
