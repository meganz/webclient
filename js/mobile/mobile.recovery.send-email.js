/**
 * This page will let the user enter their email address which will send a link to their email so they can either
 * recover their account with the Master/Recovery Key or park their account and start a new account with the same email
 *
 * Method A - Step 2 & Method B - Step 2 of recovery process
 */
mobile.recovery.sendEmail = {

    /**
     * @property {Number} RECOVERY_TYPE_KEY Recovering with the Master/Recovery Key
     */
    RECOVERY_TYPE_KEY: 9,

    /**
     * @property {Number} RECOVERY_TYPE_PARK Recovering by parking the user's account and reclaiming the email
     */
    RECOVERY_TYPE_PARK: 10,

    /**
     * Initialise the page
     * @param {Number} recoveryType The method used to recover the account i.e. with key (9) or via parking (10)
     */
    init: function(recoveryType) {

        'use strict';

        // Cache the selector for the recovery by key page
        var $screen = $('.have-recovery-key');

        // If parking the account, cache the selectors for the recovery by parking page
        if (recoveryType === this.RECOVERY_TYPE_PARK) {
            $screen = $('.no-recovery-key-page');
        }

        // Initialise functionality
        mobile.initBackButton($screen);
        mobile.recovery.sendEmail.initEmailKeyUpHandler($screen);
        mobile.recovery.sendEmail.initSendButton($screen, recoveryType);

        // Show the screen
        $screen.removeClass('hidden');
    },

    /**
     * Initialise the key up event handler for the email field to change the appearance of the Send button
     * @param {Object} $screen The jQuery selector for the current screen/page
     */
    initEmailKeyUpHandler: function($screen) {

        'use strict';

        // On keyup of the email field
        $screen.find('.recover-account-email').rebind('keyup', function() {

            var email = $screen.find('.recover-account-email').val();
            var $button = $screen.find('.recover-account-email-send-btn');

            // If the email is not valid, grey out the button
            if (email.length > 0 && !isValidEmail(email)) {
                $button.removeClass('active');
            }
            else {
                // Otherwise make it appear red
                $button.addClass('active');
            }
        });
    },

    /**
     * Initialise the Send button to send an email to the API to start the recovery process
     * @param {Object} $screen The jQuery selector for the current screen/page
     * @param {Number} recoveryType The type of recovery i.e. with key (9) or via parking (10)
     */
    initSendButton: function($screen, recoveryType) {

        'use strict';

        // On Send button click/tap
        $screen.find('.recover-account-email-send-btn').off('tap').on('tap', function() {

            // Get the email and trim the whitespace
            var email = $screen.find('.recover-account-email').val();
            var trimmedEmail = $.trim(email);

            // If the email is not valid, show an error and don't proceed
            if (!isValidEmail(trimmedEmail)) {
                mobile.messageOverlay.show(l[198]);
                return false;
            }

            loadingDialog.show();

            // Send API request
            api_req({ a: 'erm', m: trimmedEmail, t: recoveryType }, {
                callback: function(result) {

                    loadingDialog.hide();

                    // If the email is invalid, ask the user to check the e-mail address and try again
                    if (result === ENOENT) {
                        mobile.messageOverlay.show(l[1513], l[1946]);
                    }
                    else if (result === 0) {

                        // If the email exists, show a dialog saying they need to check their email
                        mobile.showEmailConfirmOverlay();
                    }
                    else {
                        // Otherwise show a generic "Oops, something went wrong" error
                        mobile.messageOverlay.show(l[135], l[200]);
                    }
                }
            });

            // Prevent double taps
            return false;
        });
    }
};
