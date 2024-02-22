/**
 * Functionality for the Export Link password protection feature
 *
 * The first implementation will use PBKDF2-HMAC-SHA512 with 100,000 rounds and a 256 bit random salt to derive a 512
 * bit key. For folder links the key is 128 bits in length and for file links the actual key is 256 bits in length. The
 * first 128 or 256 bits of the derived key will be used to encrypt the actual folder/file key using a simple XOR for
 * encryption. The last 256 bits of the derived key will be used as the MAC Key. Using the Encrypt then MAC principle,
 * the MAC will be calculated using HMAC-SHA256.
 *
 * In constructing the protected link, the format is as follows:
 * algorithm || file/folder || public handle || salt || encrypted key || MAC tag
 *
 * algorithm = 1 byte - A byte to identify which algorithm was used (for future upgradability), initially is set to 0
 * file/folder = 1 byte - A byte to identify if the link is a file or folder link (0 = folder, 1 = file)
 * public handle = 6 bytes - The public folder/file handle
 * salt = 32 bytes - A 256 bit randomly generated salt
 * encrypted key = 16 or 32 bytes - The encrypted actual folder or file key
 * MAC tag = 32 bytes - The MAC of all the previous data to ensure integrity of the link i.e. calculated as:
 *                      HMAC-SHA256(MAC key, (algorithm || file/folder || public handle || salt || encrypted key))
 *
 * The link data is then Base64 encoded and then URL encoded to remove incompatible characters e.g.:
 * https://mega.nz/#P!AAA5TWTcNMs7aYZgtalahVxCffAF0JeZTKxOZQ_s2d...
 *
 * In receiving a protected link, the program will decode the URL, get the first byte to check which algorithm was used
 * to encrypt the data (useful if algorithm changes are made in future). Then it will use the password to derive the
 * same key using the same algorithm, provided salt and password. Then a MAC of the data can be calculated, if it's a
 * match then the link has not been tampered with or corrupted and the real folder/file key can be decrypted and the
 * original link reconstructed. If it doesn't match then an error will be shown which could mean tampering or that the
 * user entered an incorrect password.
 */
var exportPassword = {

    // List of algorithms
    algorithms: [
        {
            // Algorithm (0) for unit testing with low rounds
            name: 'PBKDF2',                     // Name for the Web Crypto primary PBKDF algorithm
            hash: 'SHA-512',                    // Hash algorithm for the Web Crypto primary PBKDF algorithm
            failsafeName: 'PBKDF2_HMAC_SHA512', // Name for the asmCrypto failsafe PBKDF algorithm
            macName: 'HMAC_SHA256',             // Name for the asmCrypto MAC algorithm
            saltLength: 256,                    // Salt length in bits
            macKeyLength: 256,                  // MAC key length in bits
            macLength: 256,                     // MAC computed digest length in bits
            derivedKeyLength: 512,              // Desired derived key length in bits
            iterations: 1000                    // Number of iterations to run
        },
        {
            // Old algorithm (1) which used incorrect parameter order: HMAC(password, data)
            name: 'PBKDF2',
            hash: 'SHA-512',
            failsafeName: 'PBKDF2_HMAC_SHA512',
            macName: 'HMAC_SHA256',
            saltLength: 256,
            macKeyLength: 256,
            macLength: 256,
            derivedKeyLength: 512,
            iterations: 100000
        },
        {
            // Current algorithm (2)
            name: 'PBKDF2',
            hash: 'SHA-512',
            failsafeName: 'PBKDF2_HMAC_SHA512',
            macName: 'HMAC_SHA256',
            saltLength: 256,
            macKeyLength: 256,
            macLength: 256,
            derivedKeyLength: 512,
            iterations: 100000
        }
        // Future tweaks or changes in algorithms e.g. Argon2
    ],

    // The current algorithm in use for production
    currentAlgorithm: 2,    // 1 byte (0x02)

    /**
     * Constants for folder or file type
     */
    LINK_TYPE_FOLDER: 0,    // 1 byte (0x00)
    LINK_TYPE_FILE: 1,      // 1 byte (0x01)


    /**
     * Functions for the encryption
     */
    encrypt: {

        // The jQuery selector for the Export dialog
        $dialog: null,

        /**
         * Initialise function
         */
        init: function() {

            "use strict";

            // Cache dialog selector
            this.$dialog = $('.mega-dialog.export-links-dialog', 'body');

            // Update protected/not protected components UI and update links/keys values
            this.updatePasswordComponentsUI();
            this.updateLinkInputValues();

            // If they are a Pro user, enable set password feature
            if (u_attr.p) {
                this.initPasswordToggleButton();
                this.loadPasswordEstimatorLibrary();
                this.initPasswordStrengthCheck();
                this.initPasswordVisibilityHandler();
                this.initConfirmPasswordButton();
            }
        },

        /**
         * Update protected/not protected components UI
         */
        updatePasswordComponentsUI: function() {

            "use strict";

            const $items = $('.item', this.$dialog);
            const $protectedItems = $items.filter('.password-protect-link');
            const $setPasswordBtn = $('.js-confirm-password', this.$dialog);
            const $removePasswordBtn = $('.js-reset-password', this.$dialog);

            // If password protected links
            if ($protectedItems.length) {

                // Hide the Confirm password button
                $setPasswordBtn.addClass('hidden');

                // Show Remove password button
                $removePasswordBtn.removeClass('hidden');
            }
            else {
                // Show Confirm password button
                $setPasswordBtn.removeClass('hidden');

                // Hide Remove password button
                $removePasswordBtn.addClass('hidden');
            }
        },

        /**
         * Update links/keys values
         */
        updateLinkInputValues: function() {

            "use strict";

            var isSeparateKeys = $('.js-export-keys-switch', this.$dialog).hasClass('toggle-on');
            var $items = $('.item:not(.password-protect-link)', this.$dialog);

            // Update not password protected Link input values
            $items.get().forEach(function(e) {

                var $this = $(e);
                var $linkInput = $('.item-link.link input', $this);
                var $keyInput = $('.item-link.key input', $this);
                var linkWithoutKey = $linkInput.data('link');
                var key = $linkInput.data('key');

                // Set key without # or !
                $keyInput.val($keyInput.data('key'));

                // Set link
                if (isSeparateKeys) {
                    $linkInput.val(linkWithoutKey);
                }
                else {
                    $linkInput.val(linkWithoutKey + key);
                }
            });
        },

        /**
         * Setup the password toggle
         */
        initPasswordToggleButton: function() {

            "use strict";

            const $exportKeysSwitch = $('.js-export-keys-switch', this.$dialog);
            const $linkAccessText = $('.js-link-access-text', this.$dialog);
            const $passwordContainer = $('.password-container', this.$dialog);
            const $passwordInput = $('.js-password-input', this.$dialog);
            const $passwordInputWrapper = $passwordInput.parent();
            const $passwordToggleSwitch = $('.js-password-switch', this.$dialog);
            const $passwordToggleIcon = $('.mega-feature-switch', $passwordToggleSwitch);
            const $passwordVisibilityToggle = $('.js-toggle-password-visible', this.$dialog);
            const $passwordStrengthText = $('.js-strength-indicator', this.$dialog);
            const $updateSuccessBanner = $('.js-update-success-banner', this.$dialog);

            // Init toggle to show/hide password section
            $passwordToggleSwitch.rebind('click.changePasswordView', () => {

                const passwordToggleIsOn = $passwordToggleSwitch.hasClass('toggle-on');

                // If toggle is currently on, we will turn it off
                if (passwordToggleIsOn) {

                    // If no password has been entered, no need to recreate links,
                    // so just reset the password UI elements to default off state
                    if ($passwordInput.val() === '') {
                        exportPassword.encrypt.turnOffPasswordUI();
                        return;
                    }
                    loadingDialog.show();

                    // Remove the existing links and re-add them
                    exportPassword.removeLinksAndReAdd($.itemExport)
                        .then(() => {

                            const $items = $('.item', this.$dialog);
                            const linkCount = $.itemExport.length;

                            // If a password has actually been set
                            if ($items.first().hasClass('password-protect-link')) {

                                // Show success banner telling them to re-copy the links
                                $updateSuccessBanner.text(mega.icu.format(l.links_updated_copy_again, linkCount));
                                $updateSuccessBanner.removeClass('hidden');

                                // Hide again after 3 seconds
                                setTimeout(() => {
                                    $updateSuccessBanner.addClass('hidden');
                                }, 3000);
                            }

                            // Reset the password UI elements to default off state
                            return exportPassword.encrypt.turnOffPasswordUI();
                        })
                        .catch(tell)
                        .finally(() => {
                            loadingDialog.hide();
                        });
                }
                else {
                    // The toggle is currently off, so we will turn it on
                    // First, turn off the separate keys toggle if it's on
                    if ($exportKeysSwitch.hasClass('toggle-on')) {
                        $exportKeysSwitch.trigger('click');
                    }

                    // Disable the separate keys toggle
                    $exportKeysSwitch.addClass('disabled');

                    // Turn on toggle and show the password section
                    $passwordToggleSwitch.addClass('toggle-on').removeClass('toggle-off');
                    $passwordToggleIcon.addClass('icon-check-after').removeClass('icon-minimise-after');
                    $passwordContainer.removeClass('hidden');

                    // Focus the input so they can immediately enter the password
                    $passwordInput.focus();
                }
            });
        },

        /**
         * Turns off the password related UI, used in initialisation of the dialog to reset the password elements,
         * also in turning off the toggle switch. It was useful to be able to reset the UI elements to the off state
         * without triggering the toggle switch to off (which has a side effect of recreating the password links).
         * @returns {undefined}
         */
        turnOffPasswordUI: function() {

            'use strict';

            const $exportKeysSwitch = $('.js-export-keys-switch', this.$dialog);
            const $linkAccessText = $('.js-link-access-text', this.$dialog);
            const $passwordContainer = $('.password-container', this.$dialog);
            const $passwordInput = $('.js-password-input', this.$dialog);
            const $passwordInputWrapper = $passwordInput.parent();
            const $passwordToggleSwitch = $('.js-password-switch', this.$dialog);
            const $passwordToggleIcon = $('.mega-feature-switch', $passwordToggleSwitch);
            const $passwordVisibilityToggle = $('.js-toggle-password-visible', this.$dialog);
            const $passwordStrengthText = $('.js-strength-indicator', this.$dialog);
            const $items = $('.item', this.$dialog);
            const linkCount = $.itemExport.length;

            // Set links and keys into text boxes
            $items.removeClass('password-protect-link');

            // Update Password buttons and links UI
            exportPassword.encrypt.updatePasswordComponentsUI();

            // Update Link input values
            exportPassword.encrypt.updateLinkInputValues();

            // Turn off toggle and hide the password section
            $passwordToggleSwitch.addClass('toggle-off').removeClass('toggle-on');
            $passwordToggleIcon.addClass('icon-minimise-after').removeClass('icon-check-after');
            $passwordContainer.addClass('hidden');

            // Re-enable the separate link/key toggle
            $exportKeysSwitch.removeClass('disabled');

            // Reset password input to default state
            $passwordInput.val('');
            $passwordInput.prop('readonly', false);
            $passwordStrengthText.text('');
            $passwordInputWrapper.removeClass('good1 good2 good3 good4 good5');

            // Prepare MegaInput field and hide previous errors
            mega.ui.MegaInputs($passwordInput);
            $passwordInput.data('MegaInputs').hideError();

            // Revert to default state for the password visibility 'eye' icon
            if ($passwordVisibilityToggle.hasClass('icon-eye-hidden')) {
                $passwordVisibilityToggle.trigger('click');
            }

            // Change link access description back to 'Anyone with this link can view and download your data'
            $linkAccessText.text(mega.icu.format(l.link_access_explainer, linkCount));
        },

        /**
         * Setup Set remove password button
         */
        initResetPasswordButton: function() {

            "use strict";

            const $removePasswordBtn = $('.js-reset-password', this.$dialog);
            const $linkAccessText = $('.js-link-access-text', this.$dialog);
            const $passwordVisibilityToggle = $('.js-toggle-password-visible', this.$dialog);
            const $passwordInput = $('.js-password-input', this.$dialog);
            const $passwordInputWrapper = $passwordInput.parent();
            const $passwordStrengthText = $('.js-strength-indicator', this.$dialog);

            // On Remove password click
            $removePasswordBtn.rebind('click.removePass', () => {
                loadingDialog.show();

                // Remove the existing links and re-add them
                exportPassword.removeLinksAndReAdd($.itemExport)
                    .then(() => {
                        const $items = $('.item', this.$dialog);
                        const linkCount = $.itemExport.length;

                        // Set links and keys into text boxes
                        $items.removeClass('password-protect-link');

                        // Update Password buttons and links UI
                        exportPassword.encrypt.updatePasswordComponentsUI();

                        // Update Link input values
                        exportPassword.encrypt.updateLinkInputValues();

                        // Change link access description back to 'Anyone with this link can view your data'
                        $linkAccessText.text(mega.icu.format(l.link_access_explainer, linkCount));

                        // Reset password input to default state
                        $passwordInput.val('');
                        $passwordInput.focus();
                        $passwordInput.prop('readonly', false);
                        $passwordStrengthText.text('');
                        $passwordInputWrapper.removeClass('good1 good2 good3 good4 good5');

                        // Revert to default state for the password visibility 'eye' icon
                        if ($passwordVisibilityToggle.hasClass('icon-eye-hidden')) {
                            $passwordVisibilityToggle.trigger('click');
                        }
                    })
                    .catch(tell)
                    .finally(() => {
                        loadingDialog.hide();
                    });

                return false;
            });
        },

        /**
         * Initialise the Confirm password button to set the link/s password
         */
        initConfirmPasswordButton: function() {

            'use strict';

            // Add click handler to the confirm button
            $('.js-confirm-password', this.$dialog).rebind('click.setPass', () => {
                loadingDialog.show();

                // Remove the existing links and re-add them
                exportPassword.removeLinksAndReAdd($.itemExport)
                    .then(() => {
                        // @todo revamp to get back the crypto promise
                        return exportPassword.encrypt.startEncryption();
                    })
                    .catch(tell)
                    .finally(() => {
                        loadingDialog.hide();
                    });
            });
        },

        /**
         * Add click handler on the eye icon inside the password field to toggle the password as text/dots
         */
        initPasswordVisibilityHandler: function() {

            'use strict';

            const $passwordInput = $('.js-password-input', this.$dialog);
            const $togglePasswordVisibileIcon = $('.js-toggle-password-visible', this.$dialog);

            $togglePasswordVisibileIcon.rebind('click.showPass', () => {

                // If the eye icon is showing, reveal the password using text field
                if ($togglePasswordVisibileIcon.hasClass('icon-eye-reveal')) {
                    $togglePasswordVisibileIcon.removeClass('icon-eye-reveal').addClass('icon-eye-hidden');
                    $passwordInput[0].type = 'text';
                }
                else {
                    // Otherwise revert back to dots
                    $togglePasswordVisibileIcon.removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
                    $passwordInput[0].type = 'password';
                }
            });
        },

        /**
         * Load the ZXCVBN password strength estimator library
         */
        loadPasswordEstimatorLibrary: function() {

            "use strict";

            if (typeof zxcvbn === 'undefined') {

                // Show loading spinner
                const $loader = $('.estimator-loading-icon', this.$dialog).addClass('loading');

                // On completion of loading, hide the loading spinner
                M.require('zxcvbn_js')
                    .done(function() {
                        $loader.removeClass('loading');
                    });
            }
        },

        /**
         * Show what strength the currently entered password is on key up
         */
        initPasswordStrengthCheck: function() {

            "use strict";

            const $passwordStrengthField = $('.js-strength-indicator', this.$dialog);
            const $passwordInput = $('.js-password-input', this.$dialog);
            const $encryptButton = $('.js-confirm-password', this.$dialog);
            const $inputWrapper = $passwordInput.parent();

            // Add keyup event to the password text field
            $passwordInput.rebind('keyup', function(event) {

                // Don't attempt to do add any strength checker text if the field is disabled for typing
                if ($passwordInput.prop('readonly')) {
                    return false;
                }

                // Make sure the ZXCVBN password strength estimator library is loaded first
                if (typeof zxcvbn !== 'undefined') {

                    // Estimate the password strength
                    var password = $.trim($passwordInput.val());
                    var passwordScore = zxcvbn(password).score;
                    var passwordLength = password.length;

                    // Remove previous strength classes that were added
                    $inputWrapper.removeClass('good1 good2 good3 good4 good5');

                    // Add colour coding and text
                    if (password.length === 0) {
                        $passwordStrengthField.text('');   // No password entered, hide text
                    }
                    else if (passwordLength < 8) {
                        $inputWrapper.addClass('good1');
                        $passwordStrengthField.text(l[18700]);    // Too short
                    }
                    else if (passwordScore === 4) {
                        $inputWrapper.addClass('good5');
                        $passwordStrengthField.text(l[1128]);    // Strong
                    }
                    else if (passwordScore === 3) {
                        $inputWrapper.addClass('good4');
                        $passwordStrengthField.text(l[1127]);    // Good
                    }
                    else if (passwordScore === 2) {
                        $inputWrapper.addClass('good3');
                        $passwordStrengthField.text(l[1126]);    // Medium
                    }
                    else if (passwordScore === 1) {
                        $inputWrapper.addClass('good2');
                        $passwordStrengthField.text(l[1125]);    // Weak
                    }
                    else {
                        $inputWrapper.addClass('good1');
                        $passwordStrengthField.text(l[1124]);    // Very Weak
                    }
                }

                // If Enter key is pressed, trigger encryption button clicking
                if (event.keyCode === 13) {
                    $encryptButton.trigger('click');
                }
            });

            // Add keyup event to the password field
            $passwordInput.rebind('keyup.setPass', (event) => {

                // If Enter key is pressed, trigger encryption button clicking
                if (event.keyCode === 13) {
                    $encryptButton.trigger('click');
                }
            });
        },

        /**
         * Start key derivation of each link in the dialog
         */
        startEncryption: function() {

            "use strict";

            const $linkAccessText = $('.js-link-access-text', this.$dialog);
            const $passwordVisibilityToggle = $('.js-toggle-password-visible', this.$dialog);
            const $passwordInput = $('.js-password-input', this.$dialog);
            const $passwordInputWrapper = $passwordInput.parent();
            const $passwordStrengthText = $('.js-strength-indicator', this.$dialog);
            const $updateSuccessBanner = $('.js-update-success-banner', this.$dialog);

            // Prepare MegaInput field
            mega.ui.MegaInputs($passwordInput);

            // Hide previous errors
            $passwordInput.data('MegaInputs').hideError();

            // Get the password
            const password = $passwordInput.val();

            // Check if TextEncoder function is available for the stringToByteArray function
            if (!window.TextEncoder) {

                // This feature is not supported in your browser...
                $passwordInput.data('MegaInputs').showError(l[9065]);
                return false;
            }

            // Check zxcvbn library is loaded first or we can't check the strength of the password
            if (typeof zxcvbn === 'undefined') {

                // The password strength verifier is still initializing
                $passwordInput.data('MegaInputs').showError(l[1115]);
                return false;
            }

            // Check that the password length is sufficient and exclude very weak passwords
            if (password.length < security.minPasswordLength || $passwordInput.parent().hasClass('good1')) {

                // Please use a stronger password
                $passwordInput.data('MegaInputs').showError(l[9067]);
                return false;
            }

            // Get information for each selected link showing in the dialog and convert the password to bytes
            var links = exportPassword.encrypt.getLinkInfo();

            // An anonymous function to derive the key and on completion create the password protected link
            var processLinkInfo = function(linkInfo, algorithm, saltBytes, password) {
                exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {
                    exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes);
                });
            };

            // For each selected link
            for (let i = 0; i < links.length; i++) {

                // Get the link information and random salt
                const link = links[i];
                const linkCount = links.length;
                const saltBytes = link.saltBytes;
                const algorithm = exportPassword.currentAlgorithm;

                // Derive the key and create the password protected link
                processLinkInfo(link, algorithm, saltBytes, password);

                // If this is the last link
                if (i === linkCount - 1) {

                    // Show a success banner telling them to re-copy the links
                    $updateSuccessBanner.text(mega.icu.format(l.links_updated_copy_again, linkCount));
                    $updateSuccessBanner.removeClass('hidden');

                    // Hide again after 3 seconds
                    setTimeout(() => {
                        $updateSuccessBanner.addClass('hidden');
                    }, 3000);

                    // Change link access description to 'Only people with the password can open the link/s'
                    $linkAccessText.text(mega.icu.format(l.password_link_access_explainer, linkCount));

                    // Set password input to read only and hide the strength display
                    $passwordInput.prop('readonly', true);
                    $passwordStrengthText.text('');
                    $passwordInputWrapper.removeClass('good1 good2 good3 good4 good5');

                    // Revert to default state for the password visibility 'eye' icon
                    if ($passwordVisibilityToggle.hasClass('icon-eye-hidden')) {
                        $passwordVisibilityToggle.trigger('click');
                    }
                }
            }
        },

        /**
         * Encrypt the link's key and format the password protected link
         * @param {Object} linkInfo The information about the link
         * @param {Uint8Array} derivedKeyBytes The derived key in bytes
         */
        encryptAndMakeLink: function(linkInfo, derivedKeyBytes) {

            "use strict";

            var encKeyBytes = null;
            var algorithm = exportPassword.currentAlgorithm;
            var saltBytes = linkInfo.saltBytes;

            // If folder link, use the first 16 bytes (128 bits) of the derived key as the encryption key
            if (linkInfo.type === exportPassword.LINK_TYPE_FOLDER) {
                encKeyBytes = new Uint8Array(derivedKeyBytes.buffer, 0, 16);
            }
            else {
                // Otherwise if it's a file link use the first 32 bytes (256 bits) as the encryption key
                encKeyBytes = new Uint8Array(derivedKeyBytes.buffer, 0, 32);
            }

            // Use the last 32 bytes (256 bits) of the derived key as the MAC key
            var macKeyLengthBytes = exportPassword.algorithms[algorithm].macKeyLength / 8;
            var macKeyBytes = new Uint8Array(derivedKeyBytes.buffer, macKeyLengthBytes, macKeyLengthBytes);

            // Encrypt the file/folder link key
            var encryptedKey = exportPassword.xorByteArrays(encKeyBytes, linkInfo.keyBytes);

            // Convert the public handle to bytes
            var publicHandleBytes = asmCrypto.base64_to_bytes(linkInfo.publicHandle);

            // 1 byte for alg + 1 byte if folder/file + 6 bytes for handle + 32 bytes salt + 16 or 32 bytes for key
            var dataToAuthenticateLength = 2 + publicHandleBytes.length + saltBytes.length + encryptedKey.length;
            var dataToAuthenticateBytes = new Uint8Array(dataToAuthenticateLength);

            // Set the algorithm and set the flag for type of link
            dataToAuthenticateBytes[0] = algorithm;
            dataToAuthenticateBytes[1] = linkInfo.type;

            // Set the handle, salt and encrypted key into the array to be authenticated using different array offsets
            dataToAuthenticateBytes.set(publicHandleBytes, 2);
            dataToAuthenticateBytes.set(saltBytes, 8);
            dataToAuthenticateBytes.set(encryptedKey, 40);

            // Create the MAC of the data
            var macAlgorithm = exportPassword.algorithms[algorithm].macName;

            // If using the old algorithm (1), use parameter order: HMAC(password, data)
            if (algorithm === 1) {
                var macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToAuthenticateBytes);
            }
            else {
                // Otherwise for newer links (algorithm >= 2) use the correct parameter order: HMAC(data, password)
                var macBytes = asmCrypto[macAlgorithm].bytes(dataToAuthenticateBytes, macKeyBytes);
            }

            // Create buffer for the data to be converted to Base64
            var numOfBytes = dataToAuthenticateBytes.length + macBytes.length;
            var dataToConvert = new Uint8Array(numOfBytes);

            // Fill the array using the different offsets
            dataToConvert.set(dataToAuthenticateBytes, 0);
            dataToConvert.set(macBytes, dataToAuthenticateBytes.length);

            // Convert the data to Base64, then make it URL safe
            var dataBase64UrlEncoded = exportPassword.base64UrlEncode(dataToConvert);

            // Construct URL: #P! for password link + encoded(alg + folder/file + handle + salt + encrypted key + mac)
            var protectedUrl = getBaseUrl() + '/#P!' + dataBase64UrlEncoded;

            if (is_mobile) {
                mobile.linkManagement.pwdProtectedLink = protectedUrl;
            }
            else {
                // Get the HTML block for this link by using the node handle
                var $item = $('.item[data-node-handle="' + linkInfo.handle + '"]', this.$dialog);

                // Set the password into the text box and add a class for styling this block
                $('.item-link.link input', $item).val(protectedUrl);
                $('.item-link.key input', $item).val('');
                $item.addClass('password-protect-link');

                // Update Password buttons and links UI
                exportPassword.encrypt.updatePasswordComponentsUI();
                exportPassword.encrypt.initResetPasswordButton();
            }

            // Log to see if encryption feature is used much
            eventlog(99618, JSON.stringify([1, linkInfo.type === exportPassword.LINK_TYPE_FOLDER ? 1 : 0]));
        },

        /**
         * Get the information for each selected link
         * @returns {Array} Returns an array of objects containing properties 'handle', 'type', 'key', 'keyBytes'
         */
        getLinkInfo: function() {

            "use strict";

            var links = [];
            var $links = $('.item', this.$dialog);
            var $selectedLink =  $links.filter('.selected');
            var handles = [];

            // Create array of available links handles
            if ($selectedLink.length) {
                handles.push($selectedLink.data('node-handle'));
            }
            else {
                $links.get().forEach(function(e) {
                    handles.push($(e).data('node-handle'));
                });
            }

            // Iterate through the selected handles
            for (var i in handles) {
                if (handles.hasOwnProperty(i)) {

                    // Get the node information
                    var node = M.d[handles[i]];
                    var linkInfo = {};

                    // Only nodes with public handle
                    if (node && node.ph) {

                        // Folder
                        if (node.t) {
                            linkInfo.type = exportPassword.LINK_TYPE_FOLDER;    // 0 byte for folder link
                            linkInfo.key = u_sharekeys[node.h][0];              // 128 bit key as array of 32 bit int
                        }
                        else {
                            // File
                            linkInfo.type = exportPassword.LINK_TYPE_FILE;      // 1 byte for file link
                            linkInfo.key = node.k;                              // 256 bit key as array of 32 bit int
                        }

                        // Convert the key to a byte array (big endian), also add the link's handle and public handle
                        linkInfo.keyBytes = a32_to_ab(linkInfo.key);
                        linkInfo.handle = node.h;
                        linkInfo.publicHandle = node.ph;

                        // Generate a random salt for encrypting this link
                        var algorithm = exportPassword.currentAlgorithm;
                        var saltLengthBytes = exportPassword.algorithms[algorithm].saltLength / 8;
                        linkInfo.saltBytes = crypto.getRandomValues(new Uint8Array(saltLengthBytes));

                        // Add object to array
                        links.push(linkInfo);
                    }
                }
            }

            return links;
        }
    },  // Encrypt functions


    /**
     * Functions for the decryption
     */
    decrypt: {

        // The jQuery selector for the Export dialog
        $dialog: null,

        /**
         * Initialise function
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        init: function(page) {

            "use strict";

            // Cache dialog selector
            this.$dialog = $('.mega-dialog.password-dialog', 'body');

            this.$megaInput = new mega.ui.MegaInputs($('#password-decrypt-input',this.$dialog));

            // Show the dialog
            this.showDialog(page);
        },

        /**
         * Shows the dialog to let the user decrypt the link using a password
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        showDialog: function(page) {

            "use strict";
            var $megaInput = this.$megaInput;
            var $closeButton = $('button.js-close', this.$dialog);
            var $decryptButton = $('.decrypt-link-button', this.$dialog);
            var $decryptButtonText = $('.decrypt-text', $decryptButton);

            // Show a background overlay
            fm_showoverlay();

            // Show the dialog
            $.dialog = 'passwordlink-dialog';
            this.$dialog.removeClass('hidden');

            // Reset state of dialog for future password link decryptions
            $decryptButtonText.text(l[1027]);   // Decrypt

            // Add a click handler for the close button to return to the home page (or cloud drive if logged in)
            $closeButton.rebind('click', function() {
                loadSubPage('');
                return false;
            });

            // Add click handler for Decrypt button
            $decryptButton.rebind('click', function() {
                exportPassword.decrypt.decryptLink(page);
            });

            // Listen for Enter key to fire decryption
            $megaInput.$input.rebind('keyup', (ev) => {
                if (ev.keyCode === 13) {
                    exportPassword.decrypt.decryptLink(page);
                }
            });
        },

        /**
         * Decrypts the password protected link and redirects to the real folder/file link
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        decryptLink: function(page) {

            "use strict";
            var $megaInput = this.$megaInput;
            var $decryptButton = $('.decrypt-link-button', this.$dialog);
            var $decryptButtonText = $('.decrypt-text', $decryptButton);
            var $decryptButtonProgress = $('.decryption-in-progress', $decryptButton);
            var $password = $megaInput.$input;


            // Get the password and the encoded information in the URL
            var password = $password.val();
            var urlEncodedInfo = page.replace('P!', '');
            var decodedBytes = null;

            // If no password given...
            if (!password) {
                $megaInput.showError(l[970]); // Please enter a valid password...
                return false;
            }

            // Decode the request
            try {
                decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
            }
            catch (exception) {

                // Show error and abort
                $megaInput.showError(l[9068]);  // The link could not be decoded...
                return false;
            }

            // Get the algorithm used
            var algorithm = decodedBytes[0];

            // Check if valid array index or will throw an exception
            if (typeof exportPassword.algorithms[algorithm] === 'undefined') {

                // Show error and abort
                $megaInput.showError(l[9069]);  // The algorithm this link was encrypted with is not supported
                return false;
            }

            // Get the salt bytes, start offset at 8 (1 byte for alg + 1 byte for file/folder + 6 for handle)
            var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
            var saltStartOffset = 8;
            var saltEndOffset = saltStartOffset + saltLength;
            var saltBytes = decodedBytes.subarray(saltStartOffset, saltEndOffset);

            // Show encryption loading animation and change text to 'Decrypting'
            $decryptButtonProgress.removeClass('hidden');
            $decryptButtonText.text(l[8579]);

            // Compute the PBKDF
            exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {

                // Get the MAC from the decoded bytes
                var macLength = exportPassword.algorithms[algorithm].macLength / 8;
                var macStartOffset = decodedBytes.length - macLength;
                var macEndOffset = decodedBytes.length;
                var macToVerifyBytes = decodedBytes.subarray(macStartOffset, macEndOffset);

                // Get the data to verify
                var dataToVerify = decodedBytes.subarray(0, macStartOffset);

                // Get the MAC key
                var macKeyLength = exportPassword.algorithms[algorithm].macKeyLength / 8;
                var macKeyStartOffset = derivedKeyBytes.length - macKeyLength;
                var macKeyEndOffset = derivedKeyBytes.length;
                var macKeyBytes = derivedKeyBytes.subarray(macKeyStartOffset, macKeyEndOffset);

                // Compute the MAC over the data to verify
                var dataToVerifyBytes = decodedBytes.subarray(0, macStartOffset);
                var macAlgorithm = exportPassword.algorithms[algorithm].macName;

                // If the link was created with an old algorithm (1) which used parameter order: HMAC(password, data)
                if (algorithm === 1) {
                    var macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToVerifyBytes);
                }
                else {
                    // Otherwise for newer links (algorithm >= 2) use the correct parameter order: HMAC(data, password)
                    var macBytes = asmCrypto[macAlgorithm].bytes(dataToVerifyBytes, macKeyBytes);
                }

                // Convert the string to hex for simple string comparison
                var macString = asmCrypto.bytes_to_hex(macBytes);
                var macToVerifyString = asmCrypto.bytes_to_hex(macToVerifyBytes);

                // Compare the MAC in the URL to the computed MAC
                if (macString !== macToVerifyString) {

                    // Show error and abort
                    $megaInput.showError(l[9076]);  // The link could not be decrypted...
                    $decryptButtonProgress.addClass('hidden');
                    $decryptButtonText.text(l[1027]);
                    return false;
                }

                // Get the link type char code and set the default key length to 32 bytes
                var linkTypeByte = decodedBytes[1];
                var linkType = linkTypeByte;
                var keyLength = 32;

                // If folder link, set the key length to 16 bytes
                if (linkType === exportPassword.LINK_TYPE_FOLDER) {
                    keyLength = 16;
                }

                // Get the encryption key from the derived key
                var encKeyBytes = derivedKeyBytes.subarray(0, keyLength);

                // Get the encrypted key, start is (2 bytes for alg and type + 6 bytes for handle + salt)
                var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
                var startOffset = 2 + 6 + saltLength;
                var endOffset = startOffset + keyLength;
                var encryptedKeyBytes = dataToVerify.subarray(startOffset, endOffset);

                // Decrypt the file/folder link key
                var decryptedKey = exportPassword.xorByteArrays(encKeyBytes, encryptedKeyBytes);

                // Recreate the original file/folder link
                var handleBytes = dataToVerify.subarray(2, 8);
                var handleUrlEncoded = exportPassword.base64UrlEncode(handleBytes);
                var decryptedKeyUrlEncoded = exportPassword.base64UrlEncode(decryptedKey);
                var folderIdentifier = (linkType === exportPassword.LINK_TYPE_FOLDER) ? 'F' : '';
                var url = folderIdentifier + '!' + handleUrlEncoded + '!' + decryptedKeyUrlEncoded;


                if (mega.flags.nlfe) {
                    url = (folderIdentifier ? '/folder/' : '/file/') + handleUrlEncoded
                        + '#' + decryptedKeyUrlEncoded;
                }


                // Show completed briefly before redirecting
                $decryptButtonProgress.addClass('hidden');
                $decryptButtonText.text(l[9077]);   // Decrypted

                // Clear password field
                $password.val('');

                // Add a log to see if the feature is used often
                api_req({ a: 'log', e: 99633, m: 'Successfully decrypted password protected link on regular web' });

                // On success, redirect to actual file/folder link
                folderlink = false;
                loadSubPage(url);
            });
        }
    },  // Decrypt functions


    /**
     * Common functions for encryption and decryption
     */

    /**
     * Remove existing links and recreate them as a security measure. This is done when turning off the password
     * toggle, resetting the password and creating a new password. When we remove the existing links and recreate them
     * a new public handle is created. This makes the old links cease to work and only the new one will now work. NB:
     * when removing the links, the existing expiry dates will be removed and will need to be re-added so we keep a copy
     * of those before the operation.
     *
     * @param {Array} nodesToRecreate The node handles of the links to be removed and recreated
     * @param {Function} completeCallback The function to be called once done
     * @returns {Promise}
     */
    async removeLinksAndReAdd(nodesToRecreate) {
        'use strict';

        // Contains a backup of all the expiry dates for each node before we recreate links
        const nodeExpiryTimestamps =
            nodesToRecreate.map((h) => {
                // Get the node handle
                const node = M.d[h];
                const nodeHandle = node.h;
                const expiryTimestamp = M.getNodeShare(node).ets;

                // If it has an expiry time, add it to the array
                return expiryTimestamp && {nodeHandle, expiryTimestamp};
            }).filter(Boolean);

        // Disable sharing on links / perform the remove links operation
        const exportLink = new mega.Share.ExportLink({
            'updateUI': false,
            'nodesToProcess': nodesToRecreate
        });
        await exportLink.removeExportLink(true);

        // When all links are finished being recreated
        const res = await exportLink.getExportLink(true);

        if (nodeExpiryTimestamps.length) {
            // Update the link API side with the previous expiry timestamps for each node

            await Promise.all(
                nodeExpiryTimestamps.map(({nodeHandle, expiryTimestamp}) => {

                    return exportPassword.setExpiryOnNode(nodeHandle, expiryTimestamp);
                })
            );
        }

        // Go through each link handle
        for (let i = 0; i < nodesToRecreate.length; i++) {

            const nodeHandle = nodesToRecreate[i];
            const node = M.d[nodeHandle];
            const nodePubHandle = node.ph;
            const nodeType = node.t;

            // Create the links
            const newLink = getBaseUrl() + (nodeType ? '/folder/' : '/file/') + escapeHTML(nodePubHandle);

            // Update UI
            const $item = $(`.item[data-node-handle='${nodeHandle}']`, exportPassword.encrypt.$dialog);
            const $itemInputLink = $('.item-link.link input', $item);

            // Update data attribute - text input value is updated later
            $itemInputLink.data('link', newLink);
        }

        return res;
    },

    /**
     * Sets an expiry timestamp on a share link node
     * @param {String} n The node handle to set the expiry for
     * @param {Number} ets The expiry timestamp
     * @returns {Promise} The promise to be resolved/rejected once the API operation is complete
     */
    setExpiryOnNode(n, ets) {
        'use strict';
        return api.screq({a: 'l', n, ets});
    },

    /**
     * A wrapper function used for deriving a key from a password.
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {String} password The raw password as entered by the user e.g. in ASCII or UTF-8
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKey: function(algorithm, saltBytes, password, callback) {

        "use strict";

        // Trim the password and convert it from ASCII/UTF-8 to a byte array
        var passwordTrimmed = $.trim(password);
        var passwordBytes = this.stringToByteArray(passwordTrimmed);

        // If Web Crypto method supported, use that
        if (window.crypto && window.crypto.subtle) {
            this.deriveKeyWithWebCrypto(algorithm, saltBytes, passwordBytes, callback);
        }
        else {
            // Otherwise use asmCrypto which is the next fastest
            this.deriveKeyWithAsmCrypto(algorithm, saltBytes, passwordBytes, callback);
        }
    },

    /**
     * Derive the key using the Web Crypto API
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithWebCrypto: function(algorithm, saltBytes, passwordBytes, callback) {

        "use strict";

        // Get algorithm details
        var name = this.algorithms[algorithm]['name'];
        var hash = this.algorithms[algorithm]['hash'];
        var iterations = this.algorithms[algorithm]['iterations'];
        var derivedKeyLength = this.algorithms[algorithm]['derivedKeyLength'];

        // Import the password as the key
        crypto.subtle.importKey(
            'raw', passwordBytes, name, false, ['deriveBits']
        )
        .then(function(key) {

            // Required PBKDF2 parameters
            var params = {
                name: name,
                hash: hash,
                salt: saltBytes,
                iterations: iterations
            };

            // Derive bits using the algorithm
            return crypto.subtle.deriveBits(params, key, derivedKeyLength);
        })
        .then(function(derivedKeyArrayBuffer) {

            // Convert to a byte array
            var derivedKeyBytes = new Uint8Array(derivedKeyArrayBuffer);

            // Pass the derived key to the callback
            callback(derivedKeyBytes);
        });
    },

    /**
     * Derive the key using asmCrypto
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithAsmCrypto: function(algorithm, saltBytes, passwordBytes, callback) {

        "use strict";

        // Get algorithm details
        var name = this.algorithms[algorithm]['failsafeName'];
        var iterations = this.algorithms[algorithm]['iterations'];
        var keyLengthBits = this.algorithms[algorithm]['derivedKeyLength'];
        var keyLengthBytes = keyLengthBits / 8;

        // Give the UI some time to update on slower devices like iOS
        setTimeout(function() {

            // Derive the key
            var derivedKeyBytes = asmCrypto[name].bytes(passwordBytes, saltBytes, iterations, keyLengthBytes);

            // Pass the derived key to the callback
            callback(derivedKeyBytes);

        }, 500);
    },

    /**
     * This function encodes the data to Base64 then removes or replaces characters that will break
     * in the URL. It is similar to the base64urlencode function in crypto.js but works on a byte array.
     *
     * @param {Uint8Array} dataBytes The data as a byte array to be converted to Base64
     * @return {String} Returns a URL safe Base64 encoded string e.g. v9jVaZfyT_cuKEV-JviPAhvv
     */
    base64UrlEncode: function(dataBytes) {

        "use strict";

        // Convert the data to regular Base64
        var dataBase64 = asmCrypto.bytes_to_base64(dataBytes);

        // Remove plus signs, forward slashes and equals signs (padding)
        var dataBase64UrlEncoded = dataBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        return dataBase64UrlEncoded;
    },

    /**
     * This function decodes the data from a URL safe Base64 string back to regular Base64 then back to bytes.
     * It is similar to the base64urldecode function in crypto.js but converts the string back to a byte array.
     *
     * @param {String} dataText A URL safe Base64 encoded string e.g. v9jVaZfyT_cuKEV-JviPAhvv
     * @returns {Uint8Array} Returns the decoded data as a byte array
     */
    base64UrlDecode: function(dataText) {

        "use strict";

        // Restore the padding then replace the plus signs and forward slashes
        dataText += '=='.substr((2 - dataText.length * 3) & 3);
        dataText = dataText.replace(/\-/g, '+').replace(/_/g, '/');

        // Convert the data from regular Base 64 to bytes
        var dataBytes = asmCrypto.base64_to_bytes(dataText);

        return dataBytes;
    },

    /**
     * XOR two arrays of type Uint8Array together e.g. useful for encryption or decryption
     * @param {Uint8Array} array1 The first array e.g. the encryption key
     * @param {Uint8Array} array2 The second array e.g. the data to encrypt
     * @returns {Uint8Array}
     */
    xorByteArrays: function(array1, array2) {

        "use strict";

        var numOfBytes = array1.length;
        var result = new Uint8Array(numOfBytes);

        // XOR each byte in the array with the corresponding byte from the other
        for (var i = 0; i < numOfBytes; i++) {
            result[i] = array1[i] ^ array2[i];
        }

        return result;
    },

    /**
     * Converts a UTF-8 string to a byte array
     * @param {String} string A string of any character including UTF-8 chars e.g. password123
     * @returns {Uint8Array} Returns a byte array
     */
    stringToByteArray: function(string) {

        "use strict";

        var encoder = new TextEncoder('utf-8');

        return encoder.encode(string);
    }
};


/**
 * Functionality for the Export Link expiry feature
 */
var exportExpiry = {

    /**
     * The instantiated datepicker
     */
    datepicker: null,

    /**
     * Initialise function
     */
    init: function() {

        "use strict";

        this.$dialog = $('.mega-dialog.export-links-dialog');

        // If they are a pro user, load the datepicker library
        if (u_attr.p) {
            M.require('datepicker_js').done(() => {
                exportExpiry.initExpiryDatePicker();
                exportExpiry.initExpiryOptionToggle();
            });
        }
    },

    /**
     * Setup the datepicker
     */
    initExpiryDatePicker: function() {

        "use strict";

        const $setDateInput = $('.set-date', this.$dialog);
        const $setDateInputIcon = $('.js-datepicker-calendar-icon', this.$dialog);
        const $scroll = $('.links-scroll', this.$dialog);
        const minDate = new Date();
        const maxDate = new Date(2060, 11, 31);

        // Set Minimum date at least 1 day in the future
        minDate.setDate(minDate.getDate() + 1);

        // Initialise expiry date picker
        // Docs viewable at https://github.com/meganz/air-datepicker/tree/master/docs
        exportExpiry.datepicker = $setDateInput.datepicker({

            // Date format, @ - Unix timestamp
            dateFormat: '@',
            // Extra CSS class for datepicker
            classes: 'share-link-expiry-calendar',
            // Minimum date that can be selected
            minDate: minDate,
            // Maximum date that can be selected
            maxDate: maxDate,
            // Start date that should be displayed when datepicker is shown (we set this later)
            startDate: null,
            // Content of Previous button
            prevHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
            // Content of Next button
            nextHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
            // First day in the week. 0 - Sun
            firstDay: 0,
            // Auto close daticker is date is selected
            autoClose: true,
            // If true, then clicking on selected cell will remove selection
            toggleSelected: false,
            // Default position
            position: 'bottom left',
            // Cursom localization
            language: {
                // Sun - Sat
                daysMin: [l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]],
                months: [
                    l[408], l[409], l[410], l[411], l[412], l[413],     // January - June
                    l[414], l[415], l[416], l[417], l[418], l[419]      // July - December
                ],
                monthsShort: [
                    l[24035], l[24037], l[24036], l[24038], l[24047], l[24039],     // January - June
                    l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]      // July - December
                ]
            },

            // Change Month select box width on showing the calendar (clicking the text input triggers this)
            onShow: (inst) => {

                // Get any dates set previously (in updateDatepickerAndTextInput function)
                const newDate = inst.selectedDates[0];

                // Set default position of the datepicker to be below the text input
                const newOptions = {
                    'position': 'bottom left',
                    'offset': 12
                };

                // If short height screen, show on top
                if (screen.height <= 1080) {
                    newOptions.position = 'top left';
                    newOptions.offset = 40;
                }

                // Show previously selected date in the selectedDates
                if (newDate) {

                    // Set selected date in picker (red circle)
                    newOptions.date = newDate;

                    // Update the datepicker calendar view (before setting input text, or text appears as timestamp ms)
                    inst.update(newOptions);

                    // Update the text input
                    exportExpiry.updateInputText(newDate);
                }
                else {
                    // Update the datepicker calendar view
                    inst.update(newOptions);
                }

                // Change position on resize
                $(window).rebind('resize.setDatepickerPosition', function() {
                    inst.setPosition();
                });

                // Disable scrolling
                delay('disableExportScroll', function() {
                    Ps.disable($scroll[0]);
                }, 100);

                // Close export dropdown
                $('.dropdown.export', this.$dialog).addClass('hidden');
            },

            onSelect: (dateText, date, inst) => {

                const $inputClicked = inst.$el;

                // Select link item
                $('.item.selected', this.$dialog).removeClass('selected');
                $inputClicked.closest('.item').addClass('selected');
                $inputClicked.trigger('change.logDateChange');

                // Update the link API side with the new expiry timestamp
                exportExpiry.updateLinksOnApi(dateText / 1000 || undefined);

                // Update the text input
                exportExpiry.updateInputText(date);
            },

            onHide: () => {

                // Enable scroll
                Ps.enable($scroll[0]);

                // Unbind dialog positioning
                $(window).unbind('resize.setDatepickerPosition');
            }
        }).data('datepicker');

        // Press Enter key if datepicker dropdown is opened
        $setDateInput.rebind('keydown.date', function(event) {

            // If Enter key is pressed
            if (event.keyCode === 13) {
                $(this).blur();

                // Trigger click If date is selected in datepicker
                if ($('.ui-datepicker .ui-state-active', 'body').length) {
                    $('.ui-datepicker .ui-state-active', 'body').trigger('click');
                }
            }
        });

        // Trigger the datepicker to open when clicking the icon inside the text input
        $setDateInputIcon.rebind('click.calendariconclick', () => {
            $setDateInput.trigger('focus');
        });
    },

    /**
     * Update the datepicker input text field with the readable text date
     * @param {Date} date
     */
    updateInputText: function(date) {

        'use strict';

        // Make sure the date is set
        if (date) {
            const $setDateInput = $('.set-date', self.$dialog);

            // Convert to readable date e.g. 3 August 2023
            const dateTimestamp = Math.round(date.getTime() / 1000);
            const inputText = time2date(dateTimestamp, 2);

            $setDateInput.val(inputText);
        }
    },

    /**
     * If reloading the dialog, check the local state of M.d nodes to ge the current expiry
     * @returns {Array} Returns an array of timestamps
     */
    getExpiryDates: function() {

        "use strict";

        // Get the selected files/folders
        const handles = $.selected;
        const expiryTimestamps = [];

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var expiryTimestamp = M.getNodeShare(node).ets;

                // If it has an expiry time, increment the count
                if (expiryTimestamp) {
                    expiryTimestamps.push(expiryTimestamp);
                }
            }
        }

        return expiryTimestamps;
    },

    /**
     * Turn off the expiry toggle and hide the datepicker block
     */
    disableToggleAndHideExpiry: function() {

        'use strict';

        const $expiryOptionToggle = $('.js-expiry-switch', this.$dialog);
        const $expiryContainer = $('.expiry-container', this.$dialog);
        const $expiryOptionToggleIcon = $('.mega-feature-switch', $expiryOptionToggle);

        $expiryOptionToggle.addClass('toggle-off').removeClass('toggle-on');
        $expiryOptionToggleIcon.addClass('icon-minimise-after').removeClass('icon-check-after');
        $expiryContainer.addClass('hidden');
    },

    /**
     * Initialise the expiry option toggle switch
     */
    initExpiryOptionToggle: function() {

        'use strict';

        const $linksTab = $('section .content-block.links-content', this.$dialog);
        const $expiryOptionToggle = $('.js-expiry-switch', this.$dialog);
        const $setDateInput = $('input.set-date', this.$dialog);
        const $expiryContainer = $('.expiry-container', this.$dialog);
        const $expiryOptionToggleIcon = $('.mega-feature-switch', $expiryOptionToggle);

        // Init toggle to show/hide Expiry picker
        $expiryOptionToggle.rebind('click.changeExpiryView', () => {

            const isChecked = $expiryOptionToggle.hasClass('toggle-on');
            const $selectedLink = $('.item.selected', $linksTab);

            // If checked
            if (isChecked) {

                // Turn off the toggle and hide the expiry block
                exportExpiry.disableToggleAndHideExpiry();

                // Update the selected links API side and remove the expiry timestamps
                exportExpiry.updateLinksOnApi(null);

                // Remove selected date from all items
                exportExpiry.datepicker.clear();

                // Set text to 'Set an expiry date' (probably won't be seen as turning on the toggle sets to min date)
                $setDateInput.val(l[8953]);
            }
            else {
                // Otherwise if not checked, turn on toggle
                $expiryOptionToggle.addClass('toggle-on').removeClass('toggle-off');
                $expiryOptionToggleIcon.addClass('icon-check-after').removeClass('icon-minimise-after');
                $expiryContainer.removeClass('hidden');

                // Update the datepicker and input
                exportExpiry.updateDatepickerAndTextInput();

                // Show the date picker dropdown when toggle is on
                $setDateInput.trigger('focus');

                // Log to see if "Set an expiry date" is clicked much
                logExportEvt(2, $selectedLink);
            }
        });

        // Get the current expiry dates for the selected items from local state in M.d
        const expiryTimestamps = exportExpiry.getExpiryDates();

        // If there are expiry dates set on at least one selected item and the toggle is currently off,
        //  turn it on and this will also trigger the current expiry date to be shown in the datepicker
        if (expiryTimestamps.length && $expiryOptionToggle.hasClass('toggle-off')) {
            $expiryOptionToggle.trigger('click');
            $setDateInput.trigger('blur');
        }
    },

    /**
     * Update datepicker and text input (button to trigger the datepicker)
     */
    updateDatepickerAndTextInput: function() {

        "use strict";

        const $setDateInput = $('input.set-date', this.$dialog);

        // Get all the expiry timestamps from the selected nodes in an array
        const expiryTimestamps = exportExpiry.getExpiryDates();

        let inputText = '';

        // Clear active dates
        exportExpiry.datepicker.selectedDates = [];

        // If there is at least one expiry date set
        if (expiryTimestamps.length) {

            // Check if all dates are the same
            for (let i = 0; i < expiryTimestamps.length; i++) {

                const timestamp = expiryTimestamps[i];

                // If timestamps are different, use "Multiple dates set" as input text
                if (inputText && inputText !== timestamp) {
                    $setDateInput.val(l[23674]);
                    return false;
                }

                inputText = timestamp;
            }

            // If it is Unixtimestamp, convert it to necessary formats and set active date to the datepicker
            if (Number(inputText)) {

                // Set active date in datepicker component
                exportExpiry.datepicker.selectDate(new Date(inputText * 1000));

                // Change input text
                inputText = time2date(inputText, 2);
            }

            // Set expiry date to text input
            $setDateInput.val(inputText);
        }
        else {
            // Otherwise set minimum date at least 1 day in the future
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + 1);

            // Get minimum date timestamp
            const minDateTimestamp = Math.round(minDate.getTime() / 1000);

            // Set active date in datepicker component
            exportExpiry.datepicker.selectDate(minDate);

            // Save the result to API
            exportExpiry.updateLinksOnApi(minDateTimestamp);

            // Update input text
            exportExpiry.updateInputText(minDate);
        }
    },

    /**
     * Update selected links on the API with details about the expiry of the link
     * @param {Number} expiryTimestamp The expiry timestamp of the link. Set to null to remove the expiry time
     */
    updateLinksOnApi: function(expiryTimestamp) {

        "use strict";

        var $links = $('.item', this.$dialog);
        var $selectedLink =  $('.item.selected', this.$dialog);
        var handles = [];

        // Create array of available links handles
        if ($selectedLink.length) {
            handles.push($selectedLink.data('node-handle'));
        }
        else {
            $links.get().forEach(function(e) {
                handles.push($(e).data('node-handle'));
            });
        }

        // Iterate through the selected handles
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var handle = node.h;

                // Update the link with the new expiry timestamp
                api.screq({a: 'l', n: handle, ets: expiryTimestamp}).catch(dump);
            }
        }
    }
};


/**
 * Log public-link dialog events:
 * 1: "Export link decryption key separately" click
 * 2: "Set an expiry date" buttons click
 * 3: Select expiry date in the calendar
 * 4: "Set password" buttons click
 * 5: "Cog" icon click to show context menu
 * 6: "Remove link" button click
 * @param {Number} type 1-6
 * @param {Object} target Target elem selector
 * @returns {void}
 */
function logExportEvt(type, target) {

    'use strict';

    const h = $(target).closest('.item').data('node-handle');
    let folders = 0;
    let files = 0;

    if (h && M.d[h].t) {
        folders++;
    }
    else if (h) {
        files++;
    }
    else {
        folders = $.exportFolderLinks;
        files = $.exportFileLinks;
    }

    eventlog(99790, JSON.stringify([1, type, folders, files]));
}


/**
 * Functionality for the Export Link dialog
 */
(function($, scope) {

    /**
     * Public Link Dialog
     * @param opts {Object}
     * @constructor
     */
    var ExportLinkDialog = function(opts) {

        "use strict";

        var self = this;

        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        self.logger = MegaLogger.getLogger('ExportLinkDialog');
    };

    /**
     * Render public link dialog and handle events
     * @param {Boolean} close To close or to show public link dialog
     */
    ExportLinkDialog.prototype.linksDialog = function(close) {

        "use strict";

        if (M.isInvalidUserStatus()) {
            return;
        }

        /* jshint -W074 */
        var self = this;
        var $linksDialog = $('.mega-dialog.export-links-dialog');
        var $linksTab = $('section .content-block.links-content', $linksDialog);
        var $linksHeader = $('header .get-link', $linksDialog);
        var $linkContent = $('.links-content.links', $linksDialog);
        const $separateKeysBlock = $('.export-keys-separately-block', $linksDialog);
        const $separateKeysToggle = $('.js-export-keys-switch', $linksTab);
        const $removeLinkButton = $('.js-remove-link-button', $linksDialog);
        const $removeLinkButtonText = $('.remove-link-text', $removeLinkButton);
        const $linkAccessText = $('.js-link-access-text', $linksDialog);
        const $updateSuccessBanner = $('.js-update-success-banner', $linksDialog);
        const $linksContainer = $('.links-content.links', $linksDialog);
        const $expiryOptionToggle = $('.js-expiry-switch', $linksDialog);
        const $passwordToggleSwitch = $('.js-password-switch ', $linksDialog);
        const $passwordVisibilityToggle = $('.js-toggle-password-visible', $linksDialog);
        const $passwordInput = $('.js-password-input', $linksDialog);
        const $passwordInputWrapper = $passwordInput.parent();
        const $passwordStrengthText = $('.js-strength-indicator', $linksDialog);
        const $linksFooter = $('.links-footer', $linksDialog);
        const $copyAllLinksButton = $('button.copy.links', $linksFooter);
        const $copyAllKeysButton = $('button.copy.keys', $linksFooter);
        var $embedHeader  = $('header .embed-header', $linksDialog);
        var $embedTab = $('.embed-content', $linksDialog);
        var $embedFooter = $('footer .embed-footer', $linksDialog);
        var $options = $('.options', $linksTab);
        var $proOptions = $('.pro', $options);
        var $proOnlyLink = $('.pro-only-feature', $proOptions);
        var $setExpiryItem = $('.link-button.set-exp-date', $linksTab);
        var $removeItem = $('.link-button.remove-item', $linksTab);
        var $bottomBar = $('.links-footer', $linksDialog);
        var $datepickerInputs = $('.set-date', $linksDialog);
        var html = '';
        var $scroll = $('.links-scroll', $linksTab);
        var links;
        var toastTxt;
        var linksNum;

        // Close dialog
        if (close) {

            closeDialog();

            if (window.onCopyEventHandler) {
                document.removeEventListener('copy', window.onCopyEventHandler, false);
                delete window.onCopyEventHandler;
            }

            affiliateUI.registeredDialog.show();

            // Remove Datepicker dialogs
            for (var i = $datepickerInputs.length; i--;) {

                var $datepicker = $($datepickerInputs[i]).data('datepicker');

                if ($datepicker && $datepicker.inited) {
                    $datepicker.destroy();
                }
            }

            $('.datepicker.share-link-expiry-calendar', '.datepickers-container').remove();

            return true;
        }

        // Delete old Export links scrolling
        if ($scroll.is('.ps')) {
            Ps.destroy($scroll[0]);
        }

        // Generate content
        html = itemExportLink();

        // Fill with content
        if (!html.length) { // some how we dont have a link
            msgDialog('warninga', l[17564], l[17565]);
            return true;
        }
        $scroll.safeHTML(html);

        // Hide embed tab
        $('header h2', $linksDialog).removeClass('active');
        $('.preview-embed', $linksDialog).addClass('hidden');
        $embedHeader.addClass('hidden');
        $embedTab.addClass('hidden');
        $embedFooter.addClass('hidden');

        // Show Export links tab
        $linksTab.removeClass('hidden');
        $linkContent.removeClass('hidden');
        $('.dropdown.export', $linksTab).addClass('hidden');

        // Set Export links default states
        $setExpiryItem.addClass('hidden');
        $removeItem.addClass('hidden');
        $options.addClass('hidden');
        $proOptions.addClass('hidden disabled');
        $proOnlyLink.unbind('click.openpro');
        $updateSuccessBanner.addClass('hidden');
        $linksContainer.removeClass('multiple-links');
        $passwordInput.val('');
        $passwordInput.prop('readonly', false);
        $passwordStrengthText.text('');
        $passwordInputWrapper.removeClass('good1 good2 good3 good4 good5');

        // Prepare MegaInput field and hide previous errors
        mega.ui.MegaInputs($passwordInput);
        $passwordInput.data('MegaInputs').hideError();

        // Revert to off state for separate decryption key and link view
        if ($separateKeysToggle.hasClass('toggle-on')) {
            $separateKeysToggle.trigger('click');
        }

        // Revert to off state for expiry date
        if ($expiryOptionToggle.hasClass('toggle-on')) {
            exportExpiry.disableToggleAndHideExpiry();
        }

        // Revert to off state for password feature
        if ($passwordToggleSwitch.hasClass('toggle-on')) {
            exportPassword.encrypt.turnOffPasswordUI();
        }

        // Revert to default state for the password visibility 'eye' icon
        if ($passwordVisibilityToggle.hasClass('icon-eye-hidden')) {
            $passwordVisibilityToggle.trigger('click');
        }

        // Embed code handling
        var n = Object($.itemExport).length === 1 && M.d[$.itemExport[0]];

        if ($.itemExportEmbed || is_video(n) === 1 && !folderlink) {

            var link;
            var iframe = '<iframe width="%w" height="%h" frameborder="0" src="%s" allowfullscreen %a></iframe>\n';

            // Add special class to dialog
            $linksDialog.addClass('embed');

            if (mega.flags.nlfe) {
                link = getBaseUrl() + '/embed/' + n.ph + '#' + a32_to_base64(n.k);
            }
            else {
                link = getBaseUrl() + '/embed#!' + n.ph + '!' + a32_to_base64(n.k);
            }

            var setCode = function() {

                var time = 0;
                var width = 0;
                var height = 0;
                var autoplay = false;
                var muted = false;
                var optionAdded = false;
                var $time = $('.start-video-at .embed-setting', $embedTab);
                var $vres = $('.change-video-resolution .embed-setting', $embedTab);
                var $enauto = $('.enable-autoplay .checkdiv', $embedTab);
                var $muted = $('.mute-video .checkdiv', $embedTab);

                var getValue = function(s, c) {

                    var $input = $(s, c);
                    var value = String($input.val() || '').replace(/\.\d*$/g, '').replace(/\D/g, '');

                    value = parseInt(value || $input.attr('min') || '0') | 0;
                    $input.val(value);
                    return value;
                };

                time = getValue('input', $time) ? getValue('input', $time) : 0;
                const timeString = mega.icu.format(l.start_video_at_embed, time);
                const timeArray = timeString.split(/\[A]|\[\/A]/);

                $('#embed_start_at_txt_1', $embedTab).text(timeArray[0]);
                $('#embed_start_at_txt_2', $time).text(timeArray[2]);

                if (!$time.hasClass('disabled')) {
                    time = getValue('input', $time);
                    optionAdded = true;
                    const timeStringD = mega.icu.format(l.start_video_at_embed, time);
                    const timeArrayD = timeStringD.split(/\[A]|\[\/A]/);

                    $('#embed_start_at_txt_1', $embedTab).text(timeArrayD[0]);
                    $('#embed_start_at_txt_2', $time).text(timeArrayD[2]);
                }

                if (!$vres.hasClass('disabled')) {
                    width = getValue('.width-video input', $vres);
                    height = getValue('.height-video input', $vres);
                }

                if ($enauto.hasClass('checkboxOn')) {
                    autoplay = true;
                    optionAdded = true;
                }

                if ($muted.hasClass('checkboxOn')) {
                    muted = true;
                    optionAdded = true;
                }

                var code = iframe
                    .replace('%w', width > 0 && height > 0 ? width : 640)
                    .replace('%h', width > 0 && height > 0 ? height : 360)
                    .replace('%s', link + (optionAdded ? '!' : '') + (time > 0 ? time + 's' : '') +
                        (autoplay ? '1a' : '') + (muted ? '1m' : ''))
                    .replace('%a', autoplay ? 'allow="autoplay;"' : '');

                $('.code-field .code', $embedTab).text(code);
            };

            uiCheckboxes($('.settings-container', $linksDialog), function(enabled) {

                var $row = $(this).closest('.settings-row');
                var $setting = $('.embed-setting', $row);

                if (enabled) {
                    $setting.removeClass('disabled').find('input').prop('readonly', false).rebind('input', setCode);
                }
                else {
                    $setting.addClass('disabled').find('input').prop('readonly', true).off('input');
                }
                setCode();
            });

            // Reset all numeric inputs under Share Options
            $('.settings-container .embed-setting', $embedTab).addClass('disabled');
            $('.settings-container input[type=number]', $embedTab).get().forEach(function(e) {

                var $this = $(e);

                $this.val($this.attr('value'));
                $this.prop('readonly', true);
            });
            $embedHeader.removeClass('hidden');

            (function _() {

                $('header .embed-header, header .get-link', $linksDialog)
                    .removeClass('active').rebind('click.switchTab', _);

                if (this === window || $(this).is('.embed-header')) {
                    $embedHeader.addClass('active');
                    $embedTab.removeClass('hidden');
                    $embedFooter.removeClass('hidden');

                    // Hide regular Export Links footer etc
                    $linksTab.addClass('hidden');
                    $linksFooter.addClass('hidden');
                }
                else {
                    $embedTab.addClass('hidden');
                    $embedFooter.addClass('hidden');

                    // Show regular Export Links footer etc
                    $linksHeader.addClass('active');
                    $linksTab.removeClass('hidden');
                    $linksFooter.removeClass('hidden');
                }

            }).call($.itemExportEmbed ? window : {});

            $.itemExportEmbed = null;

            $('.video-filename span', $embedTab).text(n.name);
            $('.video-attributes .size', $embedTab).text(bytesToSize(n.s));
            $('.video-attributes .duration', $embedTab)
                .text(secondsToTimeShort(MediaAttribute(n).data.playtime));

            var $thumb = $('.video-thumbnail img', $embedTab).attr('src', noThumbURI);

            getImage(n, 1).then((uri) => $thumb.attr('src', uri)).catch(dump);

            $('.code-field .code', $embedTab).rebind('click.selectTxt', function() {
                selectText('embed-code-field');
                return false;
            });

            $('.preview-embed', $embedTab).rebind('click.embed', function() {

                if ($(this).text() !== l[1899]) {
                    $(this).text(l[148]);
                    $('.video-thumbnail-container', $embedTab).addClass('hidden');
                    $('.video-player-container', $embedTab).removeClass('hidden')
                        .safeHTML(iframe.replace('%s', link));
                }
                else {
                    $(this).text(l[1899]);
                    $('.video-thumbnail-container', $embedTab).removeClass('hidden');
                    $('.video-player-container', $embedTab).addClass('hidden').text('');
                }
            });

            // Let's hide it for now...
            $('.preview-embed', $embedTab).addClass('hidden');

            setCode();
        }
        else {
            // Remove special Embed class
            $linksDialog.removeClass('embed');
        }

        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }

        // Show export dialog
        M.safeShowDialog('links', function() {

            // Show dialog
            fm_showoverlay();
            $linksDialog.removeClass('hidden');

            // Init Scrolling
            Ps.initialize($scroll[0]);
            $scroll.scrollTop(0);

            return $linksDialog;
        });

        // Close dialog button
        $('button.js-close', $linksDialog).rebind('click.closeDialog', function() {
            self.linksDialog(1);
        });

        // Pluralise dialog text
        const linkCount = $.itemExport.length;
        const hasMultipleLinks = linkCount > 1;

        // Pluralise button text if applicable
        $linksHeader.text(mega.icu.format(l.share_link, linkCount));
        $removeLinkButtonText.text(hasMultipleLinks ? l[8735] : l[6821]);
        $linkAccessText.text(mega.icu.format(l.link_access_explainer, linkCount));

        // If there are multiple links showing
        if (hasMultipleLinks) {

            // Add an extra class to restyle the buttons
            $linksContainer.addClass('multiple-links');

            // Show just the Copy All button for now (until the toggle is switched on)
            $copyAllLinksButton.removeClass('hidden');
            $copyAllKeysButton.addClass('hidden');
        }
        else {
            // Otherwise hide both Copy All Links and Copy All Keys buttons
            $copyAllLinksButton.addClass('hidden');
            $copyAllKeysButton.addClass('hidden');
        }

        // Change links view: w/o keys
        $separateKeysToggle.rebind('click.changeView', function() {

            const isToggleOn = $(this).hasClass('toggle-on');
            const $separateKeysToggleIcon = $('.mega-feature-switch', $separateKeysToggle);

            // Disable toggle (e.g. for when password is showing)
            if ($separateKeysToggle.hasClass('disabled') || $passwordToggleSwitch.hasClass('toggle-on')) {
                return false;
            }

            // If there are multiple links, show the Copy All Links and Copy All Keys buttons
            if (hasMultipleLinks) {
                $copyAllLinksButton.removeClass('hidden');
                $copyAllKeysButton.removeClass('hidden');
            }
            else {
                // Otherwise keep hidden if there's only one link
                $copyAllLinksButton.addClass('hidden');
                $copyAllKeysButton.addClass('hidden');
            }

            // If toggle is already on
            if (isToggleOn) {

                // Turn the toggle off and show links as normal
                $separateKeysToggle.addClass('toggle-off').removeClass('toggle-on');
                $separateKeysToggleIcon.addClass('icon-minimise-after').removeClass('icon-check-after');
                $linkContent.removeClass('separately');

                // Hide the Copy All Keys button
                $copyAllKeysButton.addClass('hidden');

                // Log to see if "export link decryption key separately" is used much
                logExportEvt(1);
            }
            else {
                // Turn the toggle on and show the links and keys separately
                $separateKeysToggle.addClass('toggle-on').removeClass('toggle-off');
                $separateKeysToggleIcon.addClass('icon-check-after').removeClass('icon-minimise-after');
                $linkContent.addClass('separately');
            }

            // Update Link input values
            exportPassword.encrypt.updateLinkInputValues();
        });

        // Remove link/s button functionality
        $removeLinkButton.rebind('click.removeLink', (evt) => {
            if ($(evt.target).is('a')) {
                evt.preventDefault();
            }

            // Pluralise dialog text
            const msg = mega.icu.format(l.remove_link_question, linkCount);
            const cancelButtonText = l.dont_remove;
            const confirmButtonText = l['83'];

            let folderCount = 0;
            let fileCount = 0;

            // Determine number of files and folders so the dialog wording is correct
            $.itemExport.forEach((value) => {

                const node = M.d[value];

                if (node.t) {
                    folderCount++;
                }
                else {
                    fileCount++;
                }
            });

            // Use message about removal of 'items' for when both files and folders are selected
            let subMsg = l.remove_link_confirmation_mix_items;

            // Change message to folder/s or file/s depending on number of files and folders
            if (folderCount === 0) {
                subMsg = mega.icu.format(l.remove_link_confirmation_files_only, fileCount);
            }
            else if (fileCount === 0) {
                subMsg = mega.icu.format(l.remove_link_confirmation_folders_only, folderCount);
            }

            // The confirm remove link/s function
            const confirmFunction = () => {

                // Remove in "quiet" mode without overlay
                const exportLink = new mega.Share.ExportLink({ 'updateUI': true, 'nodesToProcess': $.itemExport });
                exportLink.removeExportLink(true);

                // Close the dialog as there are no more link items
                self.linksDialog(1);
            };

            // If they have already checked the Don't show this again checkbox, just remove the link/s
            if (mega.config.get('cslrem')) {
                confirmFunction();
                return false;
            }

            // Show confirmation dialog
            msgDialog(`*confirmation:!^${confirmButtonText}!${cancelButtonText}`, null, msg, subMsg, (res) => {
                if (res) {
                    confirmFunction();
                }
            }, 'cslrem');
        });

        // Copy all links/keys to clipboard
        $('button.copy', $linksDialog).rebind('click.copyToClipboard', function() {

            var $this = $(this);
            var $links = $('.item', $linksDialog);
            var $item = $this.hasClass('current') ? $this.closest('.item') : undefined;
            var pwProtectedNum = $links.filter('.password-protect-link').length;
            var mode = $this.hasClass('keys') ? 'keys' : undefined;
            var data;

            if ($this.is('.disabled')) {
                return false;
            }

            // If Copy  button locates in Embed tab
            if ($('.embed-header', $linksDialog).hasClass('active')) {
                toastTxt = l[371];
                data =  $('.code-field .code', $linksDialog).text();
            }
            else {
                // If the button copies Keys only
                if (mode) {
                    linksNum = $item ? 1 : $links.length - pwProtectedNum;
                    toastTxt = mega.icu.format(l.toast_copy_key, linksNum);
                }
                else {
                    linksNum = $item ? 1 : $links.length;
                    toastTxt = mega.icu.format(l.toast_copy_link, linksNum);
                }

                // Set toast notification and data to copy
                data = $.trim(getClipboardLinks($item, mode));
            }

            // Copy to clipboard
            copyToClipboard(data, toastTxt, null, 2000);

            return false;
        });

        // Init FREE export links events
        const initFreeEvents = () => {

            // Add click event to Remove link dropdown item
            $removeItem.rebind('click.removeLink', (e) => {

                const $bottomBar = $('footer', this.$dialog);
                const $selectedLink = $('.item.selected', $linksTab);
                const handle = $selectedLink.data('node-handle');
                let $items;
                let itemsLength;

                // Create Remove link function
                var removeLink = function() {

                    // New export link
                    var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': [handle]});

                    // Remove link in "quite" mode without overlay
                    exportLink.removeExportLink(true);

                    // Remove Link item from DOM
                    $selectedLink.remove();

                    if (M.d[handle].t) {
                        $.exportFolderLinks--;
                    }
                    else {
                        $.exportFileLinks--;
                    }

                    // Update Export links scrolling
                    if ($scroll.is('.ps')) {
                        Ps.update($scroll[0]);
                    }

                    // Get link items length
                    $items = $('.item', $linksTab);
                    itemsLength = $items.length;

                    // Close the dialog If there is no link items
                    if (itemsLength < 1) {
                        self.linksDialog(1);
                        return false;
                    }

                    // Update Password buttons and links UI
                    exportPassword.encrypt.updatePasswordComponentsUI();

                    // Update common Set Expiry Date button
                    exportExpiry.updateDatepickerAndTextInput();
                };

                // Show confirmartion dialog if handle is media
                if (is_video(M.d[handle]) === 1) {
                    msgDialog('confirmation', l[882], l[17824], 0, function(e) {
                        if (e) {
                            removeLink();
                        }
                    });
                }
                else {
                    removeLink();
                }

                // Log to see if Remove link is used much
                logExportEvt(6, e.currentTarget);
            });

            // Click anywhere in Export link dialog to hide dropdown
            $linksDialog.rebind('click.closeDropdown', function(e) {

                var $target = $(e.target);
                var $dropdown = $('.dropdown.export', $linksTab);

                if (!$target.is('.dropdown.export') && !$target.is('.cog')
                    && !$dropdown.is('.hidden')) {

                    // Enable scrolling
                    Ps.enable($scroll[0]);

                    // Close dropdown
                    $dropdown.addClass('hidden');
                }
            });

            // Set buttons default states, init events if available
            exportExpiry.init();
            exportPassword.encrypt.init();
        };

        // Init PRO events links events
        const initProEvents = () => {

            const $calendarInputs = $('.set-date', $linksDialog);

            // Log to see if "Set an expiry date" is clicked much
            $calendarInputs.rebind('mousedown.logClickEvt', (e) => logExportEvt(2, e.currentTarget));

            // Log to see if Expiry date is set much
            $calendarInputs.rebind('change.logDateChange', (e) => logExportEvt(3, e.currentTarget));

            // Log to see if "Set password" is clicked much
            $('button.password', $linksTab).rebind('click.logClickEvt', (e) => logExportEvt(4, e.currentTarget));
        };

        // Show and init options
        if (page === 'download') {

            // Show options/features
            $options.removeClass('hidden');

            // Hide certain blocks not applicable for download page
            $separateKeysBlock.addClass('hidden');
            $removeLinkButton.addClass('hidden');

            return false;
        }
        else if (folderlink) {

            // Show options/features
            $options.removeClass('hidden');

            // Hide certain blocks not applicable for download page
            $removeLinkButton.addClass('hidden');
        }
        // Init FREE options
        else if (!u_attr.p) {

            // Show options/features
            $options.removeClass('hidden');
            $proOptions.removeClass('hidden');
            $removeItem.removeClass('hidden');

            // On PRO options click, go to the Pro page
            $proOnlyLink.rebind('click.openpro', () => {
                open(getAppBaseUrl() + '#pro');
            });

            // Init FREE events
            initFreeEvents();
        }
        // Init PRO options
        else if (u_attr.p) {

            // Enable PRO options
            $options.removeClass('hidden');
            $proOptions.removeClass('hidden disabled');

            // Show PRO menu items
            $removeItem.removeClass('hidden');
            $setExpiryItem.removeClass('hidden');

            // Init FREE and PRO events
            initFreeEvents();
            initProEvents();
        }

        // If not on the embed dialog
        if (!$('.embed-header', $linksDialog).hasClass('active')) {

            // Set data and toast message 'Link/s created and copied to your clipboard'
            const $items = $('.item', $linksDialog);
            const data = $.trim(getClipboardLinks($items));
            const toastText = mega.icu.format(l.toast_link_created_and_copied, $items.length);

            // Copy to clipboard
            copyToClipboard(data, toastText, null, 2000);
        }
    };


    // ------------------------------------
    // ----- PRIVATE FUNCTIONS FOLLOW -----
    // ------------------------------------


    /**
     * getClipboardLinks
     *
     * Gether all available public links for selected items (files/folders).
     * @returns {String} links URLs or decryption keys for selected items separated with newline '\n'.
     * @param {Object} $items Links selector
     * @param {String} mode Contains View mode name: Show links w/o keys
     */
    function getClipboardLinks($items, mode) {

        "use strict";

        var links = [];
        var $dialog = $('.mega-dialog.export-links-dialog', 'body');

        if (!$items) {
            $items = $('.item', $dialog);
        }

        // Otherwise add all regular links
        $items.get().forEach(function(e) {

            var nodeUrlWithPublicHandle = $('.link input', e).val();
            var nodeDecryptionKey = $('.key input', e).val();

            // Check export/public link dialog drop down list selected option
            if (mode === 'keys' && !$(this).hasClass('password')) {
                if (nodeDecryptionKey) {
                    links.push(nodeDecryptionKey);
                }
            }
            else {
                links.push(nodeUrlWithPublicHandle);
            }
        });

        return links.join("\n");
    }

    /**
     * itemExportLinkHtml
     *
     * @param {Object} item
     * @returns {String}
     * @private
     */
    function itemExportLinkHtml(item) {
        "use strict";
        var key;
        var type;
        var fileSize;
        var html = '';
        var nodeHandle = item.h;
        var fileUrlKey;
        var fileUrlWithoutKey;
        var fileUrlNodeHandle = '';
        let hideSeparatorClass = '';
        let folderContents = '';

        if (folderlink) {
            if (item.foreign) {
                if (item.pfid) {
                    fileUrlWithoutKey = `${getBaseUrl()}/folder/${item.pfid}`;
                    fileUrlKey = `#${item.pfkey}`;
                    fileUrlNodeHandle = (item.t ? '/folder/' : '/file/') + item.h;
                }
                key = item.k;
            }
            else if (mega.flags.nlfe) {
                fileUrlWithoutKey = getBaseUrl() + '/folder/' + pfid;
                fileUrlKey = '#' + pfkey;
                fileUrlNodeHandle = (item.t ? '/folder/' : '/file/') + item.h;
            }
            else {
                fileUrlWithoutKey = getBaseUrl() + '/#F!' + pfid;
                fileUrlKey = '!' + pfkey;
                fileUrlNodeHandle = (item.t ? '!' : '?') + item.h;
            }
            fileSize = item.s && bytesToSize(item.s) || '';

            // Hide the | separator after the folder name
            hideSeparatorClass = ' hide-separator';
        }
        else if (item.t) {
            // Shared item type is folder
            key = u_sharekeys[item.h] && u_sharekeys[item.h][0];

            // folder key must exit, otherwise skip
            if (!key) {
                return '';
            }

            type = 'F';
            fileSize = '';

            const numFolders = M.d[nodeHandle].td;
            const numFiles = M.d[nodeHandle].tf;

            // If there are at least a file or subfolder
            if (numFolders > 0 || numFiles > 0) {
                const folderWording = mega.icu.format(l.folder_count, numFolders);
                const fileWording = mega.icu.format(l.file_count, numFiles);

                // Set wording to x folder/s . x file/s
                folderContents = folderWording + ' \u22C5 ' + fileWording;
            }
            else {
                // Hide the | separator after the folder name because there are no subfolders or files
                hideSeparatorClass = ' hide-separator';
            }
        }
        else {
            // Shared item type is file
            type = '';
            key = item.k;
            fileSize = bytesToSize(item.s);
        }

        if (!fileUrlWithoutKey) {
            if (mega.flags.nlfe) {
                fileUrlWithoutKey = (getBaseUrl() + (type ? '/folder/' : '/file/') + htmlentities(item.ph));
            }
            else {
                fileUrlWithoutKey = (getBaseUrl() + '/#' + type + '!' + htmlentities(item.ph));
            }
        }

        if (!fileUrlKey) {
            if (mega.flags.nlfe) {
                fileUrlKey = (key ? '#' + a32_to_base64(key) : '');
            }
            else {
                fileUrlKey = (key ? '!' + a32_to_base64(key) : '');
            }
        }

        html = '<div class="item" data-node-handle="' + nodeHandle + '">'
             +      '<div class="icons">'
             +          '<i class="sprite-fm-theme icon-settings cog"></i>'
             +          '<i class="sprite-fm-uni icon-lock lock hidden"></i>'
             +          '<i class="sprite-fm-uni icon-calendar calendar vo-hidden">'
             +              '<input type="text" data-node-handle="' + nodeHandle + '">'
             +          '</i>'
             +      '</div>'
             +      '<div class="transfer-filetype-icon ' + fileIcon(item) + '" ></div>'
             +      '<div class="item-title selectable-txt">' + htmlentities(item.name) + '</div>'
             +      '<div class="item-size' + hideSeparatorClass + '">'
             +          htmlentities(fileSize) + htmlentities(folderContents)
             +      '</div>'
             +      '<div class="clear"></div>'
             +      '<div class="item-link link">'
             +          '<div class="input-wrap">'
             +              '<i class="sprite-fm-mono icon-link chain"></i>'
             +              '<input type="text" data-link="' + fileUrlWithoutKey + '" data-key="'
             +                  fileUrlKey + fileUrlNodeHandle + '" '
             +                  'value="' + fileUrlWithoutKey + fileUrlKey + fileUrlNodeHandle + '" readonly>'
             +          '</div>'
             +          '<button class="mega-button positive copy current">'
             +              '<span>'
             +                  l[1394]
             +              '</span>'
             +          '</button>'
             +      '</div>'
             +      '<div class="item-link key">'
             +          '<div class="input-wrap">'
             +              '<i class="sprite-fm-mono icon-key key"></i>'
             +              '<input type="text" data-key="' + fileUrlKey.substring(1) + fileUrlNodeHandle + '" value="'
             +              fileUrlKey.substring(1) + fileUrlNodeHandle + '" readonly>'
             +          '</div>'
             +          '<button class="mega-button positive copy current keys">'
             +              '<span>'
             +                  l[17386]
             +              '</span>'
             +          '</button>'
             +      '</div>'
             +      '<div class="clear"></div>'
             +  '</div>';

        return html;
    }

    /**
     * generates file url for shared item
     *
     * @returns {String} html
     * @private
     */
    function itemExportLink() {

        "use strict";

        var html = '';

        $.exportFolderLinks = 0;
        $.exportFileLinks = 0;

        $.each($.itemExport, function(index, value) {

            var node = M.d[value];

            if (node && (folderlink || node.ph)) {
                html += itemExportLinkHtml(node);
            }

            if (node.t) {
                $.exportFolderLinks++;
            }
            else {
                $.exportFileLinks++;
            }
        });

        return html;
    }

    // export
    scope.mega = scope.mega || {};
    scope.mega.Dialog = scope.mega.Dialog || {};
    scope.mega.Dialog.ExportLink = ExportLinkDialog;

})(jQuery, window);


(function($, scope) {
    'use strict';

    const broadcast = (handle) => {
        console.assert($.getExportLinkInProgress === 'ongoing');

        if ($.getExportLinkOngoing
            && $.getExportLinkOngoing.length) {

            $.getExportLinkOngoing.pop().resolve(handle);
        }
        else {
            queueMicrotask(() => {
                mBroadcaster.sendMessage('export-link:completed', handle);
            });
            $.getExportLinkOngoing = false;
            $.getExportLinkInProgress = false;
        }
    };

    // hold concurrent/ongoing share-link operations.
    const ongoing = async() => {
        const {promise} = mega;

        assert($.getExportLinkInProgress);

        if ($.getExportLinkOngoing) {
            $.getExportLinkOngoing.push(promise);
        }
        else {
            $.getExportLinkOngoing = [promise];
        }

        return promise;
    };

    /**
     * ExportLink related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var ExportLink = function(opts) {

        var self = this;

        var defaultOptions = {
            'updateUI': false,
            'nodesToProcess': [],
            'showExportLinkDialog': false
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        // Number of nodes left to process
        self.nodesLeft = self.options.nodesToProcess.length;
        self.logger = MegaLogger.getLogger('ExportLink');
    };

    /**
     * Get public link for file or folder.
     */
    ExportLink.prototype.getExportLink = async function(quiet) {

        var nodes = this.options.nodesToProcess || false;

        if (!nodes.length) {
            return this.logger.warn('No nodes provided to export...', this);
        }

        // @todo FIXME those events must be fired when the operation actually succeed.
        const eventlog = quiet ? nop : SoonFc(888, (eid) => window.eventlog(eid));

        // Add some logging for usage comparisons
        if (page === 'download') {
            eventlog(99683); // Share public link on downloads page.
        }
        else if (folderlink) {
            eventlog(99715); // Share public link from folder-link.

            // Return nothing for mobile as the link overlay will be shown
            if (is_mobile) {
                return;
            }

            var exportLinkDialog = new mega.Dialog.ExportLink();
            return exportLinkDialog.linksDialog();
        }
        else if (is_mobile) {
            eventlog(99634); // Created public link on mobile webclient
        }
        else {
            eventlog(99635); // Created public link on regular webclient
        }

        if ($.getExportLinkInProgress) {
            if (d) {
                this.logger.warn('Ongoing link-export, holding...', nodes);
            }

            await ongoing();
        }

        if (d) {
            console.group('--- get export link', nodes);
        }

        console.assert(!$.getExportLinkInProgress || $.getExportLinkInProgress === 'ongoing');

        $.getExportLinkInProgress = nodes;

        const promises = [];
        for (var i = 0; i < nodes.length; i++) {
            var h = nodes[i];
            var n = M.d[h];

            if (n) {
                if (n.t) {
                    promises.push(this._getFolderExportLinkRequest(h));
                }
                else {
                    promises.push(this._getExportLinkRequest(h));
                }
            }
            else {
                this.logger.warn('Invalid node to export...', h);
            }
        }

        return Promise.all(promises)
            .finally(() => {

                return d && console.groupEnd();
            });
    };

    /**
     * Removes public link for file or folder.
     * @param {Boolean} [quiet] No loading overlay
     * @param {String} handle The node handle which to remove
     * @returns {MegaPromise}
     */
    ExportLink.prototype.removeExportLink = function(quiet, handle) {

        if (M.isInvalidUserStatus()) {
            return Promise.reject(EINTERNAL);
        }

        var self = this;
        var promises = [];
        var handles = self.options.nodesToProcess || handle || [];

        if (handles.length) {
            self.logger.debug('removeExportLink');

            for (let i = handles.length; i--;) {
                const h = handles[i];
                const n = M.d[h];

                if (n) {
                    if (n.t) {
                        promises.push(self._removeFolderExportLinkRequest(h, quiet));
                    }
                    else {
                        promises.push(self._removeFileExportLinkRequest(h, quiet));
                    }
                }
                else if (d) {
                    console.warn('removeExportLink: node not found.', h);
                }
            }
        }

        if (!promises.length) {
            return Promise.reject(EARGS);
        }

        return Promise.allSettled(promises);
    };

    /**
     * A 'Private' function, send folder public link delete request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getFolderExportLinkRequest = function(nodeId) {
        var share = M.getNodeShare(nodeId);

        // No need to perform an API call if this folder was already exported (Ie, we're updating)
        if (share.h === nodeId) {
            if (!M.d[nodeId].t || u_sharekeys[nodeId]) {
                return this._getExportLinkRequest(nodeId);
            }

            if (d) {
                console.warn('Missing sharekey for "%s" - relying on s2 to obtain it...', nodeId);
            }
        }

        // Get all child nodes of root folder with nodeId
        return api_setshare(nodeId, [{u: 'EXP', r: 0}])
            .then((result) => {
                if (!result.r || result.r[0] !== 0) {
                    throw result;
                }

                return this._getExportLinkRequest(nodeId);

            })
            .catch((ex) => {
                this.logger.warn(`Get folder link failed: ${ex}`, ex);
                throw ex;
            });
    };

    /**
     * A 'Private' function, send public get-link request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getExportLinkRequest = async function(nodeId) {

        const done = (handle) => {
            this.logger.warn('share-link progress...', this.nodesLeft, handle);

            if (!--this.nodesLeft) {
                if (this.options.showExportLinkDialog) {
                    var exportLinkDialog = new mega.Dialog.ExportLink();
                    exportLinkDialog.linksDialog();
                }

                console.assert($.getExportLinkInProgress);
                if ($.getExportLinkInProgress) {
                    $.getExportLinkInProgress = 'ongoing';

                    broadcast(handle);
                }
            }

            // A hook for the mobile web to show the link icon
            if (is_mobile) {
                mobile.cloud.updateLinkIcon(nodeId);
            }

            return handle;
        };
        var share = M.getNodeShare(nodeId);
        var request = { a: 'l', n: nodeId, i: requesti };

        if (d) {
            console.debug('_getExportLinkRequest', share.ph, Object(M.d[nodeId]).ph, share);
        }

        // No need to perform an API call if this file was already exported (Ie, we're updating)
        if (share.h === nodeId && Object(M.d[nodeId]).ph) {
            return done(nodeId);
        }

        // If the Expiry Timestamp (ets) is already set locally, resend in the request or it gets removed
        if (share.ets) {
            request.ets = share.ets;
        }

        return api.screq(request)
            .then(({handle}) => done(handle))
            .catch((ex) => {
                done(null);
                throw ex;
            });
    };

    /**
     * A 'Private' function, send folder delete public link request.
     * @param {String} nodeId The node ID.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFolderExportLinkRequest = function(nodeId, quiet) {

        return api.screq({a: 's2', n: nodeId, s: [{u: 'EXP', r: ''}], ha: ''})
            .then(({result}) => {
                if (!result.r || result.r[0] !== 0) {
                    if (d) {
                        this.logger.error('removeFolderExportLinkRequest failed for node %s', nodeId, result);
                    }
                    throw result;
                }
                console.assert(!M.su || !M.su.EXP || !M.su.EXP[nodeId], 'Invalid state..');
            });
    };

    /**
     * A 'Private' function, send file delete public link request.
     * @param {String} nodeId The node IDs.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFileExportLinkRequest = function(nodeId, quiet) {

        return api.screq({a: 'l', n: nodeId, d: 1})
            .then(({result}) => {
                if (result !== 0) {
                    if (d) {
                        this.logger.warn('removeFileExportLinkRequest failed for node %s', nodeId, result);
                    }
                    throw result;
                }
            });
    };

    /**
     * Returns true in case that any of checked items is taken down, otherwise false
     * @param {Array|String} [nodes] Array of nodes (handles/objects)
     * @returns {Boolean}
     */
    ExportLink.prototype.isTakenDown = function(nodes) {

        if (nodes) {
            if (!Array.isArray(nodes)) {
                nodes = [nodes];
            }
        }
        else {
            nodes = self.options.nodesToProcess;
        }

        for (var i = nodes.length; i--;) {
            var node = nodes[i];

            if (typeof node !== 'object') {
                node = M.getNodeByHandle(node);
            }

            if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {
                return true;
            }
        }

        return false;
    };

    /**
     * Shows the copyright warning dialog.
     *
     * @param {Array} nodesToProcess Array of strings, node ids
     * @param {*} [isEmbed] Whether we're opening the dialog with the embed-code tab focused.
     * @param {Function} [openFn] Custom callback to invoke instead of the default one
     */
    const initCopyrightsDialog = function(nodesToProcess, isEmbed, openFn) {

        if (M.isInvalidUserStatus()) {
            return;
        }

        $.itemExportEmbed = isEmbed;
        $.itemExport = nodesToProcess;

        const openGetLinkDialog = openFn || (() => {

            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': true,
                'updateUI': true,
                'nodesToProcess': nodesToProcess
            });

            exportLink.getExportLink();
        });

        // If they've already agreed to the copyright warning (cws = copyright warning shown)
        if (M.agreedToCopyrightWarning()) {
            // Go straight to Get Link dialog
            openGetLinkDialog();
            return false;
        }

        // Cache selector
        var $copyrightDialog = $('.copyrights-dialog');

        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }
        // Otherwise show the copyright warning dialog
        M.safeShowDialog('copyrights', function() {

            $.copyrightsDialog = 'copyrights';

            return $copyrightDialog;
        });

        // Init click handler for 'I disagree' button: User disagrees with copyright warning
        $('button.cancel', $copyrightDialog).rebind('click.disagreeAction', closeDialog);

        // Init click handler for 'I agree'
        $('button.accept', $copyrightDialog).rebind('click.agreeAction', function() {
            closeDialog();

            // User agrees, store flag so they don't see it again
            mega.config.set('cws', 1);

            // Go straight to Get Link dialog
            openGetLinkDialog();
        });

        // Init click handler for 'Close' button
        $('button.js-close', $copyrightDialog).rebind('click.closeDialog', closeDialog);
    };

    Object.defineProperty(ExportLink, 'pullShareLink', {
        value(handles, quiet, options) {

            if (typeof quiet === 'object') {
                options = quiet;
                quiet = false;
            }

            const exportLink = new ExportLink({
                nodesToProcess: Array.isArray(handles) ? handles : [handles],
                ...options
            });
            return exportLink.getExportLink(quiet);
        }
    });

    // export
    scope.mega = scope.mega || {};
    scope.mega.Share = scope.mega.Share || {};
    scope.mega.Share.ExportLink = ExportLink;
    scope.mega.Share.initCopyrightsDialog = initCopyrightsDialog;
})(jQuery, window);


(function($, scope) {
    /**
     * UI Public Link Icon related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var UiExportLink = function(opts) {

        "use strict";

        this.logger = MegaLogger.getLogger('UiExportLink');
    };

    /**
     * addExportLinkIcon
     *
     * Add public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addExportLinkIcon = function(nodeId) {

        "use strict";

        var self = this;
        var $nodeId = $('#' + nodeId);
        var $tree = $('#treea_' + nodeId).add('#treea_os_' + nodeId).add('#treea_pl_' + nodeId);

        // eslint-disable-next-line sonarjs/no-collapsible-if
        if ($nodeId.length === 0 && !String(M.currentdirid).includes('chat')) {

            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $nodeId = $(M.megaRender.getDOMNode(nodeId));
            }
        }

        if (!$nodeId.length && !$tree.length) {
            self.logger.warn('No DOM Node matching "%s"', nodeId);

            return false;
        }

        if (d) {
            this.logger.debug('addExportLinkIcon', nodeId);
        }

        $nodeId.addClass('linked');

        if ($tree.length) {

            // Add link-icon to left panel
            $tree.addClass('linked');
        }
    };

    /**
     * Remove public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeExportLinkIcon = function(nodeId) {

        "use strict";

        var $node = $('#' + nodeId);

        if ($node.length === 0) {
            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $node = $(M.megaRender.getDOMNode(nodeId));
            }
        }

        // Remove link icon from list view
        $node.removeClass('linked').find('.own-data').removeClass('linked');

        // Remove link icon from grid view
        $node.filter('.data-block-view').removeClass('linked');

        // Remove link icon from left panel
        $('#treeli_' + nodeId + ' > span').removeClass('linked');
    };

    /**
     * Updates grid and block (file) view, removes favorite icon if exists and adds .taken-down class.
     * @param {String} nodeId
     * @param {Boolean} isTakenDown
     */
    UiExportLink.prototype.updateTakenDownItem = function(nodeId, isTakenDown) {

        "use strict";

        var self = this;

        if (isTakenDown) {
            if (M.d[nodeId].fav === 1) {

                // Remove favourite (star)
                M.favourite(nodeId, 0);
            }
            self.addTakenDownIcon(nodeId);
        }
        else {
            self.removeTakenDownIcon(nodeId);
        }
    };

    /**
     * Add taken-down icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addTakenDownIcon = function(nodeId) {

        "use strict";

        var titleTooltip = '';
        var $element;

        // Add taken-down to list view
        $element = $('.grid-table.fm #' + nodeId).addClass('taken-down');
        $('.grid-status-icon', $element).removeClass('icon-dot icon-favourite-filled').addClass('icon-takedown');

        // Add taken-down to block view
        $element = $('#' + nodeId + '.data-block-view').addClass('taken-down');
        $('.file-status-icon', $element).removeClass('icon-favourite-filled').addClass('icon-takedown');

        if (M.megaRender && M.megaRender.nodeMap && M.megaRender.nodeMap[nodeId]) {
            $(M.megaRender.nodeMap[nodeId]).addClass('take-down');
        }
        // Add taken-down to left panel
        $element = $('#treea_' + nodeId).addClass('taken-down');
        $('.file-status-ico', $element).removeClass('icon-link-small').addClass('icon-takedown');

        // Add title, mouse popup
        if (M.d[nodeId].t === 1) {// Item is folder

            titleTooltip = l[7705];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + M.getUndecryptedLabel(M.d[nodeId]);
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.data-block-view').attr('title', titleTooltip);
        }
        else {// Item is file

            titleTooltip = l[7704];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + M.getUndecryptedLabel(M.d[nodeId]);
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.data-block-view').attr('title', titleTooltip);
        }
    };

    /**
     * Remove taken-down icon from file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeTakenDownIcon = function(nodeId) {

        "use strict";

        if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
            $(M.megaRender.getDOMNode(nodeId)).removeClass('take-down');
        }

        var $element;

        // Add taken-down to list view
        $element = $('.grid-table.fm #' + nodeId).removeClass('taken-down');
        $('.grid-status-icon', $element).removeClass('icon-takedown');

        // Add taken-down to block view
        $element = $('#' + nodeId + '.data-block-view').removeClass('taken-down');
        $('.file-status-icon', $element).removeClass('icon-takedown');

        // Add taken-down to left panel
        $element = $('#treea_' + nodeId).removeClass('taken-down');
        $('.file-status-ico', $element).removeClass('icon-takedown');

        // Remove title, mouse popup
        $('.grid-table.fm #' + nodeId).attr('title', '');
        $('#' + nodeId + '.data-block-view').attr('title', '');
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.UI = scope.mega.UI || {};
    scope.mega.UI.Share = scope.mega.UI.Share || {};
    scope.mega.UI.Share.ExportLink = UiExportLink;
})(jQuery, window);

/** Export Link as string **/
(function($, scope) {
    'use strict';

    scope.getPublicNodeExportLink = function(node) {

        var fileUrlWithoutKey;
        var type;

        if (folderlink) {
            fileUrlWithoutKey = getBaseUrl() + '/#F!' + pfid + (node.t ? '!' : '?') + node.h;
        }
        else if (node.t) {
            type = 'F';
        }
        else {
            // Shared item type is file
            type = '';
        }

        return fileUrlWithoutKey || (getBaseUrl() + '/#' + type + '!' + htmlentities(node.ph));
    };

})(jQuery, mega);
