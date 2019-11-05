/**
 * Functionality for the My Account page, Security section to change the user's email
 */
var accountChangeEmail = {

    /**
     * Initialise the change email functionality
     */
    init:function() {

        'use strict';

        this.resetForm();
        this.initEmailKeyupHandler();
        this.initChangeEmailButton();
    },

    /**
     * Reset the text inputs if coming back to the page
     */
    resetForm: function() {

        'use strict';

        // Reset change email fields after change
        $('#current-email').val(u_attr.email).blur();
        $('#account-email').val('');
        $('.fm-account-change-email').addClass('hidden');
    },

    /**
     * Initialise the handler to show an information message while typing the email
     */
    initEmailKeyupHandler: function() {

        'use strict';

        // Cache selectors
        var $newEmail = $('#account-email');
        var $emailInfoMessage = $('.fm-account-change-email');
        var $changeEmailButton = $('.account .change-email-button');

        // On text entry in the new email text field
        $newEmail.rebind('keyup', function() {

            if ($newEmail.val()) {
                // Show information message
                $emailInfoMessage.slideDown();
                $changeEmailButton.parent().removeClass('closed');
            }
            else {
                // Show information message
                $emailInfoMessage.slideUp();
                $changeEmailButton.parent().addClass('closed');
            }
        });
    },

    /**
     * Initalise the change email button to verify the email, get the 2FA code (if active) then change the email
     */
    initChangeEmailButton: function() {

        'use strict';

        // Cache selectors
        var $changeEmailButton = $('.account .change-email-button');
        var $newEmail = $('#account-email');

        // On Change Email button click
        $changeEmailButton.rebind('click', function() {
            
            if ($(this).hasClass('disabled')) {
                return false;
            }
            // Get the new email address
            var newEmailRaw = $newEmail.val();
            var newEmail = $.trim(newEmailRaw).toLowerCase();

            // If not a valid email, show an error
            if (!isValidEmail(newEmail)) {
                $newEmail.megaInputsShowError(l[1513]);
                return false;
            }

            // If there is text in the email field and it doesn't match the existing one
            if ((newEmail !== '') && (u_attr.email !== newEmail)) {

                loadingDialog.show();

                // Check if 2FA is enabled on their account
                twofactor.isEnabledForAccount(function(result) {

                    loadingDialog.hide();

                    // If 2FA is enabled
                    if (result) {

                        // Show the verify 2FA dialog to collect the user's PIN
                        twofactor.verifyActionDialog.init(function(twoFactorPin) {
                            accountChangeEmail.continueChangeEmail(newEmail, twoFactorPin);
                        });
                    }
                    else {
                        accountChangeEmail.continueChangeEmail(newEmail, null);
                    }
                });
            }
        });
    },

    /**
     * Initiate the change email request to the API
     * @param {String} newEmail The new email
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    continueChangeEmail: function(newEmail, twoFactorPin) {

        'use strict';

        loadingDialog.show();

        // Prepare the request
        var requestParams = {
            a: 'se',            // Set Email
            aa: 'a',
            e: newEmail,        // The new email address
            i: requesti         // Last request ID
        };

        // If the 2FA PIN was entered, send it with the request
        if (twoFactorPin !== null) {
            requestParams.mfa = twoFactorPin;
        }

        // Change of email request
        api_req(requestParams, {
            callback: function(result) {

                loadingDialog.hide();

                // If something went wrong with the 2FA PIN
                if (result === EFAILED || result === EEXPIRED) {
                    msgDialog('warninga', l[135], l[19216]);
                }

                // If they have already requested a confirmation link for that email address, show an error
                else if (result === -12) {
                    return msgDialog('warninga', l[135], l[7717]);
                }

                // EACCESS, the email address is already in use or current user is invalid. (less likely).
                else if (typeof result === 'number' && result === -11) {
                    return msgDialog('warninga', l[135], l[19562]);
                }

                // If something else went wrong, show an error
                else if (typeof result === 'number' && result < 0) {
                    msgDialog('warninga', l[135], l[47]);
                }

                else {
                    // Success
                    fm_showoverlay();
                    dialogPositioning('.awaiting-confirmation');

                    $('.awaiting-confirmation').removeClass('hidden');

                    localStorage.new_email = newEmail;
                }
            }
        });
    }
};
