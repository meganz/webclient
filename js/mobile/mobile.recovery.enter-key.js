/**
 * Recover Account By Key page functionality which will let the user enter or upload their Recovery/Master key.
 *
 * Method A - Step 4 of recovery process
 */
mobile.recovery.enterKey = {

    /**
     * @property {Array} recoveryKeyArray The recovery key converted from Base64 to 32 Byte signed array
     */
    recoveryKeyArray: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the selectors
        var $screen = $('.reset-password-using-key');

        // Initialise functionality
        mobile.recovery.enterKey.initVerifyKeyButton($screen);
        mobile.recovery.enterKey.initVerifyKeyByFileUpload($screen);

        // Show the screen
        $screen.removeClass('hidden');
    },

    /**
     * Initialise the button to verify the user's key that they entered in the text field
     * @param {Object} $screen The jQuery selector for the current screen/page
     */
    initVerifyKeyButton: function($screen) {

        'use strict';

        // On Verify button click/tap
        $screen.find('.verify-recovery-key-btn').off('tap').on('tap', function() {

            // Get the recovery key
            var recoveryKey = $screen.find('.recovery-key-input').val();

            // Verify the key
            mobile.recovery.enterKey.verifyKey(recoveryKey);

            // Prevent double tap
            return false;
        });
    },

    /**
     * Initialise the change handler when a text file is picked to verify the Recovery Key in the file
     * @param {Object} $screen The jQuery selector for the current screen/page
     */
    initVerifyKeyByFileUpload: function($screen) {

        'use strict';

        // On selection of the Recovery Key file
        $screen.find('#mobile-recovery-key-upload').rebind('change', function(event) {

            if (event && event.target && event.target.files) {

                var file = event.target.files[0];

                // If the file is too big, show an error
                if (file && file.size > 100) {
                    mobile.messageOverlay.show(l[1972], l[1973]);
                }
                else if (file) {
                    var fileReader = new FileReader();

                    fileReader.onload = function(evt) {

                        // Get the Recovery Key from the text file
                        var fileContents = evt.target.result;

                        // Verify the key
                        mobile.recovery.enterKey.verifyKey(fileContents);
                    };

                    fileReader.readAsText(file);
                }
            }
        });
    },

    /**
     * Verifies the recovery code from the email link by sending it to the API. The API will then send back the user's
     * encrypted private RSA key. If they decrypt that successfully they will be allowed to change their password.
     * @param {String} recoveryKey The 128 bit Recovery Key
     */
    verifyKey: function(recoveryKey) {

        'use strict';

        // Trim whitespace, new lines etc from the key then convert it to a 32 bit signed array
        var recoveryKeyTrimmed = $.trim(recoveryKey);
        var recoveryKeyArray = base64_to_a32(recoveryKeyTrimmed);
        var recoveryCode = mobile.recovery.fromEmailLink.recoveryCode;
        var recoveryEmail = mobile.recovery.fromEmailLink.recoveryEmail;

        // Show loading spinner
        loadingDialog.show();

        // Send the recovery code back to the API for verification (ERX / email request validate and execute)
        security.resetKey(recoveryCode, recoveryKeyArray, recoveryEmail, null, function(result) {

            loadingDialog.hide();

            // If success
            if (result === 0) {

                // Store for use by the next page
                mobile.recovery.enterKey.recoveryKeyArray = recoveryKeyArray;

                // Load the change password screen
                loadSubPage('recoverykeychangepass');
            }

            // If invalid master key, show error
            else if (result === EKEY) {
                mobile.messageOverlay.show(l[1977], l[1978]);
            }

            // If the account they are trying to reset is blocked, show an error
            else if (result === EBLOCKED) {
                mobile.messageOverlay.show(l[1979], l[1980]);
            }

            // If an invalid/expired/already used code, show an error
            else if (result === EEXPIRED || result === ENOENT) {
                mobile.messageOverlay.show(l[1966], l[1967], function() {
                    loadSubPage('login');
                });
            }
        });
    }
};
