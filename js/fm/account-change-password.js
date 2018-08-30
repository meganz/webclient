/**
 * Functionality for the My Account page, Security section to change the user's password
 */
var accountChangePassword = {

    /**
     * Initialise the change password functionality
     */
    init:function() {

        'use strict';

        this.resetForm();
        this.initPasswordKeyupHandler();
        this.initChangePasswordButton();
    },

    /**
     * Reset the text inputs if coming back to the page
     */
    resetForm: function() {

        'use strict';

        $('#account-new-password').val('');
        $('#account-confirm-password').val('');
    },

    /**
     * Initialise the handler to change the password strength indicator while typing the password
     */
    initPasswordKeyupHandler: function() {

        'use strict';

        var $passwordStrengthBar = $('.account-pass-lines');
        var $newPasswordField = $('#account-new-password');

        // On keyup of the password field
        $newPasswordField.rebind('keyup.pwdchg', function() {

            // Estimate the password strength
            var password = $.trim($(this).val());
            var passwordScore = zxcvbn(password).score;
            var passwordLength = password.length;

            // Remove previous strength classes that were added
            $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

            // Add colour coding
            if (passwordLength === 0) {
                return false;
            }
            else if (passwordLength < security.minPasswordLength) {
                $passwordStrengthBar.addClass('good1');    // Too short
            }
            else if (passwordScore === 4) {
                $passwordStrengthBar.addClass('good5');    // Strong
            }
            else if (passwordScore === 3) {
                $passwordStrengthBar.addClass('good4');    // Good
            }
            else if (passwordScore === 2) {
                $passwordStrengthBar.addClass('good3');    // Medium
            }
            else if (passwordScore === 1) {
                $passwordStrengthBar.addClass('good2');    // Weak
            }
            else {
                $passwordStrengthBar.addClass('good1');    // Very Weak
            }
        });
    },

    /**
     * Initalise the change password button to verify the password (and 2FA if active) then change the password
     */
    initChangePasswordButton: function() {

        'use strict';

        // Cache selectors
        var $newPasswordField = $('#account-new-password');
        var $newPasswordConfirmField = $('#account-confirm-password');
        var $passwordFields = $newPasswordField.add($newPasswordConfirmField);
        var $changePasswordButton = $('.account .change-password-button');
        var $passwordStrengthBar = $('.account-pass-lines');

        $changePasswordButton.rebind('click', function() {

            // Trim the whitespace from the passwords
            var newPassword = $.trim($newPasswordField.val());
            var newPasswordConfirm = $.trim($newPasswordConfirmField.val());
            var passwordLength = newPassword.length;

            // Initialise password strength checker library
            var passwordScore = zxcvbn(newPassword).score;

            // If the minimum length of the password is not reached, show an error
            if (newPassword !== '' && passwordLength < security.minPasswordLength) {
                msgDialog('warninga', l[135], l[18701], false, function() {
                    $newPasswordField.focus();
                });
            }

            // If passwords do not match, show an error
            else if (newPassword !== newPasswordConfirm) {
                msgDialog('warninga', l[135], l[715], false, function() {
                    $newPasswordField.val('');
                    $newPasswordConfirmField.val('');
                    $newPasswordField.focus();
                    $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');
                });
            }

            // If the password is considered to weak to proceed, show an error
            else if (passwordLength >= security.minPasswordLength && passwordScore === 0) {
                msgDialog('warninga', l[135], l[1129], false, function() {
                    $newPasswordField.val('');
                    $newPasswordConfirmField.val('');
                    $newPasswordField.focus();
                    $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');
                });
            }

            // If all the conditions are met, proceed
            else if (newPassword !== '' && newPassword === newPasswordConfirm
                    && passwordLength >= security.minPasswordLength && passwordScore > 0) {

                // Proceed to change the password
                accountChangePassword.changePassword(newPassword, $passwordFields);
            }
        });
    },

    /**
     * Change the user's password
     * @param {String} newPassword The new password
     * @param {Object} $passwords The jQuery selectors for the password fields
     */
    changePassword: function(newPassword, $passwords) {

        'use strict';

        loadingDialog.show();

        // Check if 2FA is enabled on their account
        twofactor.isEnabledForAccount(function(result) {

            loadingDialog.hide();

            // If 2FA is enabled on their account
            if (result) {

                // Show the verify 2FA dialog to collect the user's PIN
                twofactor.verifyActionDialog.init(function(twoFactorPin) {
                    accountChangePassword.continueChangePassword(newPassword, $passwords, twoFactorPin);
                });
            }
            else {
                // Otherwise change the password without 2FA
                accountChangePassword.continueChangePassword(newPassword, $passwords, null);
            }
        });
    },

    /**
     * Continue to change the user's password (e.g. immediately or after they've entered their 2FA PIN
     * @param {String} newPassword The new password
     * @param {Object} $passwords The jQuery selectors for the password fields
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    continueChangePassword: function(newPassword, $passwords, twoFactorPin) {

        'use strict';

        // If the account is registered with the new process (version 2), change password using the new method
        if (u_attr.aav === 2) {
            accountChangePassword.changePasswordNewMethod(newPassword, $passwords, twoFactorPin);
        }
        else {
            accountChangePassword.changePasswordOldMethod(newPassword, $passwords, twoFactorPin);
        }
    },

    /**
     * Change the user's password using the old method
     * @param {String} newPassword The new password
     * @param {Object} $passwords The jQuery selectors for the password fields
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    changePasswordOldMethod: function(newPassword, $passwords, twoFactorPin) {

        'use strict';

        // Otherwise change the password using the old method
        var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newPassword));
        var encryptedMasterKeyBase64 = a32_to_base64(encrypt_key(pw_aes, u_k));
        var userHash = stringhash(u_attr.email.toLowerCase(), pw_aes);

        // Prepare the request
        var requestParams = {
            a: 'up',
            k: encryptedMasterKeyBase64,
            uh: userHash
        };

        // If the 2FA PIN was entered, send it with the request
        if (twoFactorPin !== null) {
            requestParams.mfa = twoFactorPin;
        }

        // Make API request to change the password
        api_req(requestParams, {
            callback: function(result) {

                loadingDialog.hide();

                // If something went wrong with the 2FA PIN
                if (result === EFAILED || result === EEXPIRED) {
                    msgDialog('warninga', l[135], l[19216]);
                }

                // If something else went wrong, show an error
                else if (typeof result === 'number' && result < 0) {
                    msgDialog('warninga', l[135], l[47]);
                }
                else {
                    // Success
                    showToast('settings', l[725]);

                    // Update u_attr.k property with the Encrypted Master Key
                    u_attr.k = encryptedMasterKeyBase64;
                }

                // Clear password fields
                $passwords.val('');

                // Update the account page
                accountUI();
            }
        });
    },

    /**
     * Change the user's password using the new method
     * @param {String} newPassword The new password
     * @param {Object} $passwords The jQuery selectors for the password fields
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    changePasswordNewMethod: function(newPassword, $passwords, twoFactorPin) {

        'use strict';

        // Create the Client Random Value, Encrypted Master Key and Hashed Authentication Key
        security.deriveKeysFromPassword(newPassword, u_k,
            function(clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes) {

                // Convert to Base64
                var encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
                var hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);
                var clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);
                var saltBase64 = ab_to_base64(security.createSalt(clientRandomValueBytes));

                // Prepare the request
                var requestParams = {
                    a: 'up',
                    k: encryptedMasterKeyBase64,
                    uh: hashedAuthenticationKeyBase64,
                    crv: clientRandomValueBase64
                };

                // If the 2FA PIN was entered, send it with the request
                if (twoFactorPin !== null) {
                    requestParams.mfa = twoFactorPin;
                }

                // Send API request to change password
                api_req(requestParams, {
                    callback: function(result) {

                        loadingDialog.hide();

                        // If something went wrong with the 2FA PIN
                        if (result === EFAILED || result === EEXPIRED) {
                            msgDialog('warninga', l[135], l[19216]);
                        }

                        // If something else went wrong, show an error
                        else if (typeof result === 'number' && result < 0) {
                            msgDialog('warninga', l[135], l[47]);
                        }
                        else {
                            // Show message: Your password has been changed
                            showToast('settings', l[725]);

                            // Update global properties as the 'ug' request is not re-done
                            u_attr.k = encryptedMasterKeyBase64;
                            u_attr.aas = saltBase64;
                        }

                        // Clear password fields
                        $passwords.val('');

                        // Update the account page
                        accountUI();
                    }
                });
            }
        );
    }
};
