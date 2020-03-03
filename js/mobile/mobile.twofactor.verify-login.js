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
        this.$page = $('.mobile.two-factor-page.verify-login-page');

        // Initialise icon and back button
        mobile.initHeaderMegaIcon();
        mobile.initBackButton(this.$page, 'twofactor/setup');

        // Initialise functionality
        this.initVerifyButton();
        this.initLostAuthenticatorButton();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Put the focus in the PIN input field after its visible
        this.$page.find('.two-factor-seed-input input').trigger('focus');

        // Initialise max length on input
        mobile.initNumberMaxlength(this.$page);
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
            var email = security.login.email.trim();
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

        // Put the focus in the PIN input field
        $pinCodeInput.trigger('focus');
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
