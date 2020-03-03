/**
 * Recover Account From Email Link functionality after they have clicked the #recover link in their email. This code
 * will redirect the user to a page to let the user enter (or upload) their Recovery/Master key or park their account
 */
mobile.recovery.fromEmailLink = {

    /* The email address for the account being recovered */
    recoveryEmail: null,

    /** The recovery code sent to the user by email */
    recoveryCode: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the selectors
        var $screen = $('.reset-password-using-key');

        // Initialise functionality
        this.verifyRecoveryCode();

        // Show the screen
        $screen.removeClass('hidden');
    },

    /**
     * Verify the recovery code they submitted via email
     */
    verifyRecoveryCode: function() {

        'use strict';

        // Get the code from the URL
        this.recoveryCode = sessionStorage.recoveryCode = page.replace('recover', '');

        // Show loading spinner
        loadingDialog.show();

        // Send API Email Request Verify (ERV) request to validate the user's recovery code that they got in the email
        api_req({ a: 'erv', c: this.recoveryCode }, {
            callback: function(result) {

                loadingDialog.hide();

                // If an error was returned
                if (typeof result === 'number') {

                    // If the recovery link has expired, show an error
                    if (result === EEXPIRED) {
                        mobile.messageOverlay.show(l[1966], l[1967], function() {
                            loadSubPage('recovery');
                        });
                    }
                    else {
                        // Otherwise show a generic invalid link error
                        mobile.messageOverlay.show(l[1968], l[1969], function() {
                            loadSubPage('recovery');
                        });
                    }
                }
                else {
                    // If recovering with key
                    if (result[0] === 9) {

                        if (u_type || u_type === 0) {

                            msgDialog("warninga", '', l[22817], '', function() {
                                loadSubPage('fm');
                            });

                            return;
                        }
                        // Store the email from the request
                        mobile.recovery.fromEmailLink.recoveryEmail = sessionStorage.recoveryEmail = result[1];

                        // Load the page to enter or upload their Master/Recovery Key
                        loadSubPage('recoveryenterkey');
                    }

                    // Otherwise if they don't have the key and will park their account
                    else if (result[0] === 10) {

                        if (u_type || u_type === 0) {
                            debugger;

                            msgDialog("warninga", '', l[22818], '', function() {
                                loadSubPage('fm');
                            });

                            return;
                        }

                        // Store the email from the request
                        mobile.recovery.fromEmailLink.recoveryEmail = sessionStorage.recoveryEmail = result[1];

                        // Load the page to change their password and complete the parking process
                        loadSubPage('recoveryparkchangepass');
                    }
                }
            }
        });
    }
};
