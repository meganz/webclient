/**
 * Functionality for the Two-Factor Authentication Verify Setup page
 */
mobile.twofactor.verifyDisable = {

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
        this.$page = $('.mobile.two-factor-page.verify-disable-page');

        // Initialise verify button functionality
        this.initVerifyButton();

        // Initialise back button to go back to the My Account page
        mobile.initBackButton(this.$page, 'fm/account');

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
        var $pinCodeInput = mobile.twofactor.verifyDisable.$page.find('.two-factor-seed-input input');
        var $verifyButton = mobile.twofactor.verifyDisable.$page.find('.two-factor-verify-btn');
        var $warningText = mobile.twofactor.verifyDisable.$page.find('.warning-text-field');

        // On Verify button click/tap
        $verifyButton.off('tap').on('tap', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCodeInput.val());

            loadingDialog.show();

            // Run Multi-Factor Auth Disable (mfad) request
            api_req({ a: 'mfad', mfa: pinCode }, {
                callback: function(response) {

                    loadingDialog.hide();

                    // The Two-Factor has already been disabled
                    if (response === ENOENT) {
                        mobile.messageOverlay.show(l[19217], l[19218], function() {
                            loadSubPage('fm/account/');
                        });
                    }
                    else if (response < 0) {

                        // If there was an error, show a message that the code was incorrect and clear the text field
                        $warningText.removeClass('hidden');
                        $pinCodeInput.val('');

                        // Put the focus in the PIN input field
                        $pinCodeInput.trigger('focus');
                    }
                    else {
                        // Render the Disabled page
                        loadSubPage('twofactor/disabled');
                    }
                }
            });

            // Prevent double taps
            return false;
        });
    }
};
