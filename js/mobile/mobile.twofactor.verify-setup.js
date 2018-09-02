/**
 * Functionality for the Two-Factor Authentication Verify Setup page
 */
mobile.twofactor.verifySetup = {

    /**
     * jQuery selector for this page
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

        // Cache selector
        mobile.twofactor.verifySetup.$page = $('.mobile.two-factor-page.verify-setup-page');

        // Initialise functionality
        mobile.twofactor.verifySetup.initKeyupFunctionality();
        mobile.twofactor.verifySetup.initVerifyButton();
        mobile.twofactor.verifySetup.initBackButton();

        // Show the account page content
        mobile.twofactor.verifySetup.$page.removeClass('hidden');
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = mobile.twofactor.verifySetup.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifySetup.$page.find('.two-factor-verify-btn');
        var $warningText = mobile.twofactor.verifySetup.$page.find('.warning-text-field');

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
        var $pinCode = mobile.twofactor.verifySetup.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifySetup.$page.find('.two-factor-verify-btn');
        var $warningText = mobile.twofactor.verifySetup.$page.find('.warning-text-field');

        // On Verify button click/tap
        $verifyButton.off('tap').on('tap', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCode.val());

            loadingDialog.show();

            // Run Multi-Factor Auth Setup (mfas) request
            api_req({ a: 'mfas', mfa: pinCode }, {
                callback: function(response) {

                    loadingDialog.hide();

                    // The Two-Factor has already been setup
                    if (response === EEXIST) {
                        mobile.messageOverlay.show(l[19219], l[19220], function() {
                            loadSubPage('fm/account/');
                        });
                    }
                    else if (response < 0) {

                        // If there was an error, show a message that the code was incorrect and clear the text field
                        $warningText.removeClass('hidden');
                        $pinCode.val('');
                    }
                    else {
                        // Render the Enabled page
                        loadSubPage('twofactor/enabled');
                    }
                }
            });

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
        mobile.twofactor.verifySetup.$page.find('.mobile.fm-icon.back').off('tap').on('tap', function() {

            // Render the Account page again
            loadSubPage('twofactor/setup');
            return false;
        });
    }
};
