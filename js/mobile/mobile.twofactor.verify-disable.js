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

        // Clear setup steps
        mobile.twofactor.settings.setupStep = false;

        // Cache selector
        this.$page = $('.mobile.two-factor-page.verify-disable-page');

        // Initialise verify button functionality
        this.initVerifyButton();

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

        $pinCodeInput.val('');

        // On Verify button click/tap
        $verifyButton.rebind('tap.verify', () => {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCodeInput.val());

            loadingDialog.show();

            // Run Multi-Factor Auth Disable (mfad) request
            api_req({ a: 'mfad', mfa: pinCode }, {
                callback: function(response) {

                    loadingDialog.hide();

                    // The Two-Factor has already been disabled
                    if (response === ENOENT) {
                        mobile.messageOverlay.show(l[19217], l[19218]).then(() => {
                            loadSubPage('fm/account/security');
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
                        mobile.twofactor.verifyDisable.$page.addClass('hidden');

                        $pinCodeInput.trigger('blur');

                        mega.ui.toast.show(l[19211]);
                        loadSubPage('fm/account/security');
                    }
                }
            });

            // Prevent double taps
            return false;
        });
    }
};
