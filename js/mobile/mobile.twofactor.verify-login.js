/**
 * Functionality for the Two-Factor Authentication Verify Setup page
 */
mobile.twofactor.verifyLogin = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Check for the entered email, password and remember me checkbox setting, if it doesn't
        // exist then they may have refreshed the page, so go back to the Login page.
        if (security.login.email === null && security.login.password) {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        mobile.twofactor.verifyLogin.$page = $('.mobile.two-factor-page.verify-login-page');

        // Initialise functionality
        mobile.initHeaderMegaIcon();
        mobile.twofactor.verifyLogin.initKeyupFunctionality();
        mobile.twofactor.verifyLogin.initVerifyButton();
        mobile.twofactor.verifyLogin.initBackButton();
        mobile.twofactor.verifyLogin.initLostAuthenticatorButton();

        // Show the account page content
        mobile.twofactor.verifyLogin.$page.removeClass('hidden');
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = mobile.twofactor.verifyLogin.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifyLogin.$page.find('.two-factor-verify-btn');
        var $warningText = mobile.twofactor.verifyLogin.$page.find('.warning-text-field');

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
     */
    initVerifyButton: function() {

        'use strict';

        // Cache selectors
        var $pinCode = mobile.twofactor.verifyLogin.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifyLogin.$page.find('.two-factor-verify-btn');

        // On Verify button click/tap
        $verifyButton.off('tap').on('tap', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCode.val());

            // Get cached data that was already entered on the login form
            var email = security.login.email;
            var password = security.login.password;
            var rememberMe = security.login.rememberMe;

            // Show loading spinner on the buttons
            $verifyButton.addClass('loading');

            // Check if using old/new login method and log them in
            security.login.checkLoginMethod(email, password, pinCode, rememberMe,
                                            mobile.signin.old.startLogin,
                                            mobile.signin.new.startLogin);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the back arrow icon in the header to go back to the main My Account page
     */
    initBackButton: function() {

        'use strict';

        // On Back click/tap
        mobile.twofactor.verifyLogin.$page.find('.mobile.fm-icon.back').off('tap').on('tap', function() {

            // Render the Account page again
            loadSubPage('twofactor/setup');
            return false;
        });
    },

    /**
     * Shows a verification error on the 2FA login verification page when there was an incorrect PIN
     */
    showVerificationError: function() {

        'use strict';

        var $warningText = mobile.twofactor.verifyLogin.$page.find('.warning-text-field');
        var $pinCodeInput = mobile.twofactor.verifyLogin.$page.find('.two-factor-seed-input input');
        var $submitButton = mobile.twofactor.verifyLogin.$page.find('.two-factor-verify-btn');

        // Show a message that the PIN code was incorrect and clear the text field
        $submitButton.removeClass('loading');
        $warningText.removeClass('hidden');
        $pinCodeInput.val('');
    },

    /**
     * Initialise the button to go to the Recovery page if they lost their phone
     */
    initLostAuthenticatorButton: function() {

        'use strict';

        // On click/tap
        mobile.twofactor.verifyLogin.$page.find('.lost-authenticator-button').off('tap').on('tap', function() {

            // Render the Recovery page
            loadSubPage('recovery');
            return false;
        });
    }
};
