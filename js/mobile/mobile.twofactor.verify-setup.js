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

        $pinCode.val('');

        // On Verify button click/tap
        $verifyButton.off('tap').on('tap', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCode.val());

            loadingDialog.show();

            // Run Multi-Factor Auth Setup (mfas) request
            api.send({a: 'mfas', mfa: pinCode})
                .then(() => {

                    // Hide this page
                    mobile.twofactor.verifySetup.$page.addClass('hidden');

                    $pinCode.trigger('blur');

                    mega.ui.toast.show(l[19206]);
                    loadSubPage('fm/account/security');
                })
                .catch((ex) => {

                    // The Two-Factor has already been setup
                    if (ex === EEXIST) {
                        mobile.messageOverlay.show(l[19219], l['2fa_already_enabled_mob'], () => {
                            loadSubPage('fm/account/');
                        });
                    }
                    else {
                        console.error(ex);

                        // If there was an error, show a message that the code was incorrect and clear the text field
                        $warningText.removeClass('hidden');
                        $pinCode.val('');

                        // Put the focus in the PIN input field
                        $pinCode.trigger('focus');
                    }
                })
                .finally(() => {
                    loadingDialog.hide();
                });

            // Prevent double taps
            return false;
        });
    }
};
