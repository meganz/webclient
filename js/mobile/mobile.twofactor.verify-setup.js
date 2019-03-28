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
        this.$page = $('.mobile.two-factor-page.verify-setup-page');

        // Initialise verify button functionality
        this.initVerifyButton();

        // Initialise back button to go back to the 2FA setup page
        mobile.initBackButton(this.$page, 'twofactor/setup');

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

                        // Put the focus in the PIN input field
                        $pinCode.trigger('focus');
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
    }
};
