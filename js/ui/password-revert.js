/**
 * Functionality for the password revert page. This is reached when a user changes their password
 * and clicks a link in their email to revert the password back to their previous one.
 */
var passwordRevert = {

    /** The code that will be sent to the API to prove that they clicked the email link */
    revertPasswordCode: null,

    /**
     * Initialise the password revert page's functionality
     * @param {String} currentPage The current page e.g. #pwrevertmup1iayJmjRAHCxaKnBAmRaL
     */
    init: function(currentPage) {

        'use strict';

        // Cache the code
        this.revertPasswordCode = currentPage.replace('pwrevert', '');

        // Init functionality
        this.checkPasswordRevertCode();
    },

    /**
     * Validate the email code
     */
    checkPasswordRevertCode: function() {

        'use strict';

        loadingDialog.show();

        var self = this;

        // Make Revert Validation request
        api_req({ a: 'erv', c: this.revertPasswordCode }, {
            callback: function(result) {

                loadingDialog.hide();

                // The API can't inform us if the code is expired as it deletes used codes after use. So this does a
                // check to see if the code length is right, if it is then the code is expired, otherwise it's invalid
                if (result === ENOENT || result === EEXPIRED) {
                    var failureMessage = l[20857] + ' ' + l[20858];    // Your link is invalid. Please contact support

                    if (self.revertPasswordCode.length === 24) {
                        failureMessage = l[20856] + ' ' + l[20858];    // Your link has expired. Please contact support
                    }

                    msgDialog('warningb', l[135], failureMessage, '', self.cancelRevertPassword);
                }
                else if (result < 0) {

                    // Oops, something went wrong. Please contact support@mega.nz for assistance.
                    msgDialog('warningb', l[200], l[200] + ' ' + l[20858], '', self.cancelRevertPassword);
                }
                else {
                    // If the code is valid, get the email for the account to be reset
                    var email = result[1];
                    var successMessage = l[20859].replace('%1', email);

                    // Ask if they really want to revert the password
                    msgDialog('confirmation', l[870], successMessage, '', function(userConfirmed) {

                        // If the user clicks to confirm
                        if (userConfirmed) {
                            self.proceedRevertingPassword();
                        }
                        else {
                            self.cancelRevertPassword();
                        }
                    });
                }
            }
        });
    },

    /**
     * A callback function to return to the start/cloud drive page if there was an error or the user cancelled
     */
    cancelRevertPassword: function() {

        'use strict';

        loadSubPage(u_attr ? 'fm' : 'start');
    },

    /**
     * Proceed to revert the password to the previous one by sending the final API request
     */
    proceedRevertingPassword: function() {

        'use strict';

        loadingDialog.show();

        // Make Revert Password request
        api_req({ a: 'erx', c: this.revertPasswordCode }, {
            callback: function(result) {

                loadingDialog.hide();

                // Show generic error
                if (result < 0) {
                    msgDialog('warningb', l[200], l[200] + ' ' + l[20858], '', passwordRevert.cancelRevertPassword);
                }
                else {
                    // If it successfully reverted, show a success message and go back to the login page
                    msgDialog('info', l[18280], l[20860], '', function() {

                        // If already logged in, log out
                        if (u_attr) {
                            u_logout(true);
                        }

                        loadSubPage('login');
                    });
                }
            }
        });
    }
};
