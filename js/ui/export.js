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

            // Cache dialog selector
            this.$dialog = $('.export-links-dialog');

            // If they are a Pro user, enable the toggle button
            if (u_attr.p) {
                this.initPasswordFeatureToggle();
            }

            // Initialise the hide button always
            this.initHideExtraOptionsButton();
        },

        /**
         * Setup the toggle button which shows the date picker
         */
        initPasswordFeatureToggle: function() {

            var $toggleBtn = this.$dialog.find('.fm-password-protect-dropdown .dialog-feature-toggle');
            var $proButton = this.$dialog.find('.get-pro');
            var $proOnlyText = this.$dialog.find('.pro-only-feature');

            // Show the toggle button and hide the PRO Only button and text
            $toggleBtn.removeClass('hidden');
            $proButton.addClass('hidden');
            $proOnlyText.addClass('hidden');

            // If dialog was previously open with the password feature enabled, reset state to disabled
            if ($toggleBtn.hasClass('toggle-on')) {
                this.disableToggle();
            }

            // On toggle button click
            $toggleBtn.rebind('click', function() {

                // If already on
                if ($toggleBtn.hasClass('toggle-on')) {

                    // Set to disabled state
                    exportPassword.encrypt.disableToggle();
                }
                else {
                    // Set to enabled state and initialise buttons
                    exportPassword.encrypt.enableToggle();
                    exportPassword.encrypt.loadPasswordEstimatorLibrary();
                    exportPassword.encrypt.initPasswordStrengthCheck();
                    exportPassword.encrypt.initEncryptPasswordButton();
                }
            });
        },

        /**
         * Set the toggle button to enabled state
         */
        enableToggle: function() {

            var $toggleBtn = this.$dialog.find('.fm-password-protect-dropdown .dialog-feature-toggle');
            var $passwordContainer = this.$dialog.find('.password-entry-container');
            var $linkWithKeyButton = this.$dialog.find('.link-handle-and-key');
            var $linkWithKey = this.$dialog.find('.file-link-info.url, .file-link-info.key');
            var $linkAndDecryptionKeyButtons = this.$dialog.find('.separate-link-and-key');
            var $passwordLinkText = this.$dialog.find('.password-protected-data');
            var $linkBlock = this.$dialog.find('.file-link-block');

            // Slide button to the right
            $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '17px' }, 150, 'swing', function() {

                // Add a green background on the toggle and show the password settings
                $toggleBtn.addClass('toggle-on');
                $passwordContainer.removeClass('hidden');

                // Pre-select the Link with key option as it is the most applicable
                $linkWithKeyButton.trigger('click');

                // Hide existing link and key text, show the password text field
                $linkWithKey.addClass('hidden');
                $passwordLinkText.removeClass('hidden');

                // Disable other buttons as they are not applicable until the toggle is disabled
                $linkAndDecryptionKeyButtons.addClass('disabled');

                // Add special styling for the link text
                $linkBlock.addClass('password-protect-link');

                // Reinit link body scrolling
                exportPassword.encrypt.reInitScrolling();

                // Reposition the dialog
                exportPassword.encrypt.repositionDialog();
            });
        },

        /**
         * Set the toggle button to disabled state and reset everything
         */
        disableToggle: function() {

            var $toggleBtn = this.$dialog.find('.fm-password-protect-dropdown .dialog-feature-toggle');
            var $passwordContainer = this.$dialog.find('.password-entry-container');
            var $linkWithKey = this.$dialog.find('.file-link-info.url, .file-link-info.key');
            var $linkAndDecryptionKeyButtons = this.$dialog.find('.separate-link-and-key');
            var $passwordLinkText = this.$dialog.find('.password-protected-data');
            var $linkBlock = this.$dialog.find('.file-link-block');
            var $passwordStrengthField = this.$dialog.find('.password-strength');
            var $passwordInput = this.$dialog.find('.password-protect-input');
            var $errorLabel = this.$dialog.find('.password-protect-error');
            var $encryptButtonText = this.$dialog.find('.encrypt-link-button .encrypt-text');

            // Slide the button to the left
            $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '2px' }, 150, 'swing', function() {

                // Remove the green background and hide the password settings
                $toggleBtn.removeClass('toggle-on');
                $passwordContainer.addClass('hidden');

                // Show link and key, hide and clear the password link
                $linkWithKey.removeClass('hidden');
                $passwordLinkText.addClass('hidden').text('');

                // Re-enable other buttons as they are not applicable until the toggle is disabled
                $linkAndDecryptionKeyButtons.removeClass('disabled');

                // Remove special styling for the link text
                $linkBlock.removeClass('password-protect-link');

                // Remove previous strength classes that were added and clear the text
                $passwordStrengthField.removeClass().addClass('password-strength').text('');

                // Clear previous input password in the text field and reset to type password
                $passwordInput.val('');
                $passwordInput.attr('type', 'password');

                // Hide previous errors
                $errorLabel.text('');

                // Reset encryption button state and text to 'Encrypt'
                $encryptButtonText.removeClass('encrypted').text(l[9061]);

                // Reinit link body scrolling
                exportPassword.encrypt.reInitScrolling();

                // Reposition the dialog
                exportPassword.encrypt.repositionDialog();
            });
        },

        /**
         * Re-centers the dialog. This is required if expanding/closing optional features
         * which can mean the screen real-estate is reduced when they are open
         */
        repositionDialog: function() {

            this.$dialog.css({
                'margin-left': -1 * (this.$dialog.outerWidth() / 2),
                'margin-top': -1 * (this.$dialog.outerHeight() / 2)
            });
        },

        /**
         * Re-initialise the scrolling so it scrolls all the way to the bottom when contents of the links
         * changes. This is useful because the password links are longer and take up more lines to display.
         */
        reInitScrolling: function() {
            var $scrollBlock = this.$dialog.find('.export-link-body');

            $scrollBlock.jScrollPane({
                showArrows: true,
                arrowSize: 5
            });
        },

        /**
         * Load the ZXCVBN password strength estimator library
         */
        loadPasswordEstimatorLibrary: function() {

            if (typeof zxcvbn === 'undefined') {

                // Show loading spinner
                var $loader = this.$dialog.find('.estimator-loading-icon').addClass('loading');

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

            var $passwordStrengthField = this.$dialog.find('.password-strength');
            var $encryptButtonText = this.$dialog.find('.encrypt-link-button .encrypt-text');
            var $passwordInput = this.$dialog.find('.password-protect-input');

            // Add keyup event to the password text field
            $passwordInput.rebind('keyup', function() {

                // Make sure the ZXCVBN password strength estimator library is loaded first
                if (typeof zxcvbn !== 'undefined') {

                    // Estimate the password strength
                    var password = $.trim($passwordInput.val());
                    var passwordScore = zxcvbn(password).score;
                    var passwordLength = password.length;

                    // Remove previous strength classes that were added
                    $passwordStrengthField.removeClass().addClass('password-strength');

                    // Add colour coding and text
                    if (password.length === 0) {
                        $passwordStrengthField.text('');   // No password entered, hide text
                    }
                    else if (passwordLength < 8) {
                        $passwordStrengthField.addClass('good1').text(l[18700]);    // Too short
                    }
                    else if (passwordScore === 4) {
                        $passwordStrengthField.addClass('good5').text(l[1128]);    // Strong
                    }
                    else if (passwordScore === 3) {
                        $passwordStrengthField.addClass('good4').text(l[1127]);    // Good
                    }
                    else if (passwordScore === 2) {
                        $passwordStrengthField.addClass('good3').text(l[1126]);    // Medium
                    }
                    else if (passwordScore === 1) {
                        $passwordStrengthField.addClass('good2').text(l[1125]);    // Weak
                    }
                    else {
                        $passwordStrengthField.addClass('good1').text(l[1124]);    // Very Weak
                    }

                    // If they have already encrypted the link and are changing the password, re-enable the button
                    if ($encryptButtonText.hasClass('encrypted')) {
                        $encryptButtonText.removeClass('encrypted').text(l[9061]);  // Encrypt
                    }
                }
            });
        },

        /**
         * Initialise the button to show and hide the password protect and link expiry options
         */
        initHideExtraOptionsButton: function() {

            var $extraOptionsToggle = this.$dialog.find('.reveal-feature-toggle');
            var $extraOptions = this.$dialog.find('.extra-options');
            var $expiryOption = this.$dialog.find('.fm-expiry-dropdown');
            var $passwordProtectOption = this.$dialog.find('.fm-password-protect-dropdown');
            var $proButton = this.$dialog.find('.get-pro');

            // If they do not have Pro
            if (!u_attr.p) {

                // Hide the options initially
                $extraOptions.addClass('hidden');
                $extraOptionsToggle.text(l[9062]);      // Show PRO options
                $proButton.addClass('hidden');

                // Grey out the Expiry and Password Protect options
                $expiryOption.addClass('disabled');
                $passwordProtectOption.addClass('disabled');

                // On button click, go to the Pro page
                $proButton.rebind('click', function() {
                    loadSubPage('pro');
                });
            }
            else {
                // If they do have Pro, show them
                $extraOptions.removeClass('hidden');
                $extraOptionsToggle.text(l[9064]);
            }

            // On toggle click
            $extraOptionsToggle.rebind('click', function() {

                // If the extra options are aready hidden, show them
                if ($extraOptions.hasClass('hidden')) {

                    // Show the extra options
                    $extraOptions.removeClass('hidden');
                    $extraOptionsToggle.text(l[9064]);   // Hide options

                    // If they are not a Pro user, show the Get Pro button
                    if (!u_attr.p) {
                        $proButton.removeClass('hidden');
                    }

                    // Reposition the dialog
                    exportPassword.encrypt.repositionDialog();
                }
                else {
                    // Otherwise hide them
                    $extraOptions.addClass('hidden');
                    $extraOptionsToggle.text(l[9062]);  // Show PRO options
                    $proButton.addClass('hidden');

                    // Reposition the dialog
                    exportPassword.encrypt.repositionDialog();
                }
            });
        },

        /**
         * Initialise the encryption button
         */
        initEncryptPasswordButton: function() {

            // Add click handler to the encrypt button
            this.$dialog.find('.encrypt-link-button').rebind('click', function() {
                exportPassword.encrypt.startEncryption();
            });
        },

        /**
         * Start key derivation of each link in the dialog
         */
        startEncryption: function() {

            var $passwordInput = this.$dialog.find('.password-protect-input.first');
            var $confirmPasswordInput = this.$dialog.find('.password-protect-input.second');
            var $encryptButton = this.$dialog.find('.encrypt-link-button');
            var $encryptButtonText = $encryptButton.find('.encrypt-text');
            var $encryptButtonProgress = $encryptButton.find('.encryption-in-progress');
            var $errorLabel = this.$dialog.find('.password-protect-error');
            var $strengthLabel = this.$dialog.find('.password-strength');

            // If they have already encrypted the link (and the password has not changed) then don't do anything
            if ($encryptButtonText.hasClass('encrypted')) {
                return false;
            }

            // Hide previous errors
            $errorLabel.text('');

            // Get the password
            var password = $passwordInput.val();
            var confirmPassword = $confirmPasswordInput.val();

            // Check if TextEncoder function is available for the stringToByteArray function
            if (!window.TextEncoder) {

                $errorLabel.text(l[9065]);  // This feature is not supported in your browser...
                return false;
            }

            // Check the passwords are the same with no typos
            if (password !== confirmPassword) {

                $errorLabel.text(l[9066]);  // The passwords are not the same...
                return false;
            }

            // Check zxcvbn library is loaded first or we can't check the strength of the password
            if (typeof zxcvbn === 'undefined') {

                $errorLabel.text(l[1115]);  // The password strength verifier is still initializing
                return false;
            }

            // Check that the password length is sufficient and exclude very weak passwords
            if ((password.length < 8) || $strengthLabel.hasClass('good1')) {

                $errorLabel.text(l[9067]);  // Please use a stronger password
                return false;
            }

            // Show encryption loading animation and change text to 'Encrypting'
            $encryptButtonProgress.removeClass('hidden');
            $encryptButtonText.text(l[9078]);

            // Get information for each selected link showing in the dialog and convert the password to bytes
            var links = exportPassword.encrypt.getLinkInfo();

            // An anonymous function to derive the key and on completion create the password protected link
            var processLinkInfo = function(linkInfo, algorithm, saltBytes, password) {
                exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {
                    exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes);
                });
            };

            // For each selected link
            for (var i = 0; i < links.length; i++) {

                // Get the link information and random salt
                var link = links[i];
                var saltBytes = link.saltBytes;
                var algorithm = exportPassword.currentAlgorithm;

                // Derive the key and create the password protected link
                processLinkInfo(link, algorithm, saltBytes, password);
            }
        },

        /**
         * Encrypt the link's key and format the password protected link
         * @param {Object} linkInfo The information about the link
         * @param {Uint8Array} derivedKeyBytes The derived key in bytes
         */
        encryptAndMakeLink: function(linkInfo, derivedKeyBytes) {

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
            var protectedUrl = 'https://mega.nz/#P!' + dataBase64UrlEncoded;

            // Get the HTML block for this link by using the node handle
            var $item = this.$dialog.find('.export-link-item[data-node-handle="' + linkInfo.handle + '"]');

            // Set the password into the text box and add a class for styling this block
            $item.find('.password-protected-data').text(protectedUrl);
            $item.find('.file-link-block').addClass('password-protect-link');

            // Hide encryption loading animation
            this.$dialog.find('.encryption-in-progress').addClass('hidden');
            this.$dialog.find('.encrypt-text').addClass('encrypted').text(l[9079]);

            // Re-initialise the scrolling so it scrolls all the way to the bottom
            exportPassword.encrypt.reInitScrolling();

            // Log to see if feature is used much
            api_req({ a: 'log', e: 99618, m: 'User created password protected link' });
        },

        /**
         * Get the information for each selected link
         * @returns {Array} Returns an array of objects containing properties 'handle', 'type', 'key', 'keyBytes'
         */
        getLinkInfo: function() {

            var links = [];
            var handles = $.selected;

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

            // Cache dialog selector
            this.$dialog = $('.fm-dialog.password-dialog');

            // Show the dialog
            this.showDialog(page);
        },

        /**
         * Shows the dialog to let the user decrypt the link using a password
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        showDialog: function(page) {

            var $closeButton = this.$dialog.find('.fm-dialog-close');
            var $decryptButton = this.$dialog.find('.decrypt-link-button');
            var $decryptButtonText = $decryptButton.find('.decrypt-text');
            var $decryptInput = this.$dialog.find('.password-decrypt-input');

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
            $decryptInput.rebind('keyup', function(ev) {
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

            var $decryptButton = this.$dialog.find('.decrypt-link-button');
            var $decryptButtonText = $decryptButton.find('.decrypt-text');
            var $decryptButtonProgress = $decryptButton.find('.decryption-in-progress');
            var $password = this.$dialog.find('.password-decrypt-input');
            var $errorLabel = this.$dialog.find('.password-link-decrypt-error');

            // Get the password and the encoded information in the URL
            var password = $password.val();
            var urlEncodedInfo = page.replace('P!', '');
            var decodedBytes = null;

            // If no password given...
            if (!password) {
                $errorLabel.text(l[970]);  // Please enter a valid password...
                return false;
            }

            // Hide previous errors
            $errorLabel.text('');

            // Decode the request
            try {
                decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
            }
            catch (exception) {

                // Show error and abort
                $errorLabel.text(l[9068]);  // The link could not be decoded...
                return false;
            }

            // Get the algorithm used
            var algorithm = decodedBytes[0];

            // Check if valid array index or will throw an exception
            if (typeof exportPassword.algorithms[algorithm] === 'undefined') {

                // Show error and abort
                $errorLabel.text(l[9069]);  // The algorithm this link was encrypted with is not supported
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
                    $errorLabel.text(l[9076]);  // The link could not be decrypted...
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
     * A wrapper function used for deriving a key from a password.
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {String} password The raw password as entered by the user e.g. in ASCII or UTF-8
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKey: function(algorithm, saltBytes, password, callback) {

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

        var encoder = new TextEncoder('utf-8');

        return encoder.encode(string);
    }
};

/**
 * Functionality for the Export Link expiry feature
 */
var exportExpiry = {

    /**
     * Initialise function
     */
    init: function() {

        // If they are a pro user, enable the expiry toggle button and date picker
        if (u_attr.p) {
            exportExpiry.initExpiryFeatureToggle();
            exportExpiry.initExpiryDatePicker();
            exportExpiry.prepopulateExpiryDates();
        }
    },

    /**
     * Setup the toggle button which shows the date picker
     */
    initExpiryFeatureToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.fm-expiry-dropdown .dialog-feature-toggle');
        var $proButton = $dialog.find('.get-pro');

        // Show the toggle button and hide the PRO Only button
        $toggleBtn.removeClass('hidden');
        $proButton.addClass('hidden');

        // Hide PRO Only warning
        $dialog.find('.pro-only-feature').addClass('hidden');

        // On toggle button click
        $toggleBtn.rebind('click', function() {

            // If already on
            if ($toggleBtn.hasClass('toggle-on')) {

                // Set to disabled state
                exportExpiry.disableToggle();

                // Update the selected links and remove the expiry timestamps
                exportExpiry.updateLinks();
            }
            else {
                // Set to enabled state
                exportExpiry.enableToggle();
            }
        });
    },

    /**
     * Set the toggle button to enabled state
     */
    enableToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.fm-expiry-dropdown .dialog-feature-toggle');
        var $expirySelect = $dialog.find('.expiry-date-select-container');

        // Slide button to the right
        $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '17px' }, 150, 'swing', function() {

            // Add a green background on the toggle and show the datepicker
            $toggleBtn.addClass('toggle-on');
            $expirySelect.removeClass('hidden');

            // Clear the date of any old entries
            $dialog.find('.expiry-date-select').datepicker('setDate', null);
        });
    },

    /**
     * Set the toggle button to disabled state
     */
    disableToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.fm-expiry-dropdown .dialog-feature-toggle');
        var $expirySelect = $dialog.find('.expiry-date-select-container');

        // Slide the button to the left
        $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '2px' }, 150, 'swing', function() {

            // Remove the green background and hide the datepicker
            $toggleBtn.removeClass('toggle-on');
            $expirySelect.addClass('hidden');

            // Clear the date of any old entries
            $dialog.find('.expiry-date-select').datepicker('setDate', null);

            // Reset text to 'Set an expiry date'
            $dialog.find('.set-expiry-text').text(l[8953]);
        });
    },

    /**
     * Setup the datepicker
     */
    initExpiryDatePicker: function() {

        var $dialog = $('.export-links-dialog');

        // Initialise expiry date picker
        $dialog.find('.expiry-date-select').datepicker({
            dateFormat: 'yy-mm-dd',     // 2016-05-25
            dayNamesMin: [
                l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]   // Sun - Sat
            ],
            minDate: '+1D',     // At least 1 day in the future
            monthNames: [
                l[408], l[409], l[410], l[411], l[412], l[413],     // January - June
                l[414], l[415], l[416], l[417], l[418], l[419]      // July - December
            ],
            showButtonPanel: true,          // Show for the close button
            closeText: '',                  // Use an icon instead of text
            onSelect: function(dateText) {

                // Get the year, month and day from the date picker
                var date = dateText.split('-');
                var year = date[0];
                var month = date[1] - 1;    // Date object uses a 0 base index
                var day = date[2];

                // Get the current time
                var time = new Date();
                var hours = time.getHours();
                var mins = time.getMinutes();
                var secs = time.getSeconds();

                // Set the expiry date to the selected date and the time to the current time
                var expiryDate = new Date(year, month, day, hours, mins, secs);
                var expiryTimestamp = Math.round(expiryDate.getTime() / 1000);

                // Update the link with the new expiry timestamp
                exportExpiry.updateLinks(expiryTimestamp);

                // Set the text to 'Set new expiry date'
                $dialog.find('.set-expiry-text').text(l[8736]);
            }
        });
    },

    /**
     * Update selected links with details about the expiry of the link
     * @param {Number} expiryTimestamp The expiry timestamp of the link. Set to null to remove the expiry time
     */
    updateLinks: function(expiryTimestamp) {

        // Get which files/folders are currently selected
        var handles = $.selected;

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var nodeHandle = node.h;

                // The data to send in the API request
                var request = {
                    a: 'l',             // Link
                    n: nodeHandle,
                    i: requesti
                };

                // If the expiry timestamp is set
                if (expiryTimestamp) {

                    // Add it to be sent in the request
                    request.ets = expiryTimestamp;
                }

                // Show the expiry time if applicable or remove it
                exportExpiry.showExpiryTime(expiryTimestamp, nodeHandle);

                // Update the link with the new expiry timestamp
                api_req(request);
            }
        }
    },

    /**
     * If reloading the dialog, check the local state and show the expiry time for each key block if applicable
     */
    prepopulateExpiryDates: function() {

        // Get the selected files/folders
        var handles = $.selected;

        // Keep a counter for how many nodes have expiry times
        var numOfNodesWithExpiryTime = 0;

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var nodeHandle = node.h;
                var expiryTimestamp = M.getNodeShare(node).ets;

                // If it has an expiry time, increment the count
                if (expiryTimestamp) {
                    numOfNodesWithExpiryTime++;
                }

                // If the expiry timestamp is set show it
                exportExpiry.showExpiryTime(expiryTimestamp, nodeHandle);
            }
        }

        // If there is at least one expiry time on the selected link/s
        if (numOfNodesWithExpiryTime > 0) {

            // Enable the toggle switch
            exportExpiry.enableToggle();

            // Set the text to 'Set new expiry date'
            $('.export-links-dialog .set-expiry-text').text(l[8736]);
        }
        else {
            // Otherwise disable the toggle switch
            exportExpiry.disableToggle();

            // Set the text to 'Set an expiry date'
            $('.export-links-dialog .set-expiry-text').text(l[8953]);
        }
    },

    /**
     * Shows the expiry time on the selected export key block
     * @param {Number} expiryTimestamp The UNIX timestamp when the link will expire, set to null to hide
     * @param {String} nodeHandle The node handle which references the key block to update
     */
    showExpiryTime: function(expiryTimestamp, nodeHandle) {

        // Find the right row
        var $linkItem = $('.export-links-dialog .export-link-item[data-node-handle="' + nodeHandle + '"]');
        var $linkExpiryContainer = $linkItem.find('.export-link-expiry-container');
        var $linkExpiry = $linkExpiryContainer.find('.export-link-expiry');
        var expiryString = '';

        // If the expiry timestamp is set
        if (expiryTimestamp) {

            // If the link has expired, show the text 'Expired'
            if (unixtime() >= expiryTimestamp) {
                expiryString = l[1664];
            }
            else {
                // Otherwise update to the date and time
                expiryString = time2date(expiryTimestamp);
            }

            // Show it
            $linkExpiryContainer.removeClass('hidden');
        }
        else {
            // Hide it
            $linkExpiryContainer.addClass('hidden');
        }

        // Set or clear the text
        $linkExpiry.text(expiryString);
    }
};


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

        /* jshint -W074 */
        var self = this;
        var $linksDialog = $('.fm-dialog.export-links-dialog');
        var $linkButtons = $linksDialog.find('.link-handle, .link-decryption-key, .link-handle-and-key');
        var $linkContent = $linksDialog.find('.export-content-block');
        var html = '';
        var scroll = '.export-link-body';
        var links;
        var $span = $('.copy-to-clipboard span');
        var toastTxt;
        var linksNum;
        var centerDialog = function() {
            $linksDialog.css('margin-top',
                $linksDialog.outerHeight() / 2 * -1 - ($('.export-links-warning:visible').outerHeight() | 0) / 2);
        };
        var getContentsToClip = function() {
            if ($('.fm-tab.tab-embed-link', $linksDialog).hasClass('active')) {
                toastTxt = l[371];
                return $('.code-field .code', $linksDialog).text();
            }
            return $.trim(getClipboardLinks());
        };

        deleteScrollPanel(scroll, 'jsp');

        if (close) {
            closeDialog();
            $('.export-links-warning').addClass('hidden');
            if (window.onCopyEventHandler) {
                document.removeEventListener('copy', window.onCopyEventHandler, false);
                delete window.onCopyEventHandler;
            }
            return true;
        }

        $linksDialog.addClass('file-keys-view');

        $('.fm-tab', $linksDialog).removeClass('active');
        $('.fm-dialog-title', $linksDialog).text(l[1031]);
        $('.preview-embed', $linksDialog).addClass('hidden');
        $('.fm-dialog-tab', $linksDialog).addClass('hidden');
        $('.embed-content-block', $linksDialog).addClass('hidden');
        $('.export-content-block', $linksDialog).removeClass('hidden');
        $('.export-link-body', $linksDialog).siblings().removeClass('hidden');

        // Generate content
        html = itemExportLink();

        // Fill with content
        if (!html.length) { // some how we dont have a link
            msgDialog('warninga', l[17564], l[17565]);
            return true;
        }
        $linksDialog.find('.export-link-body').safeHTML(html);

        // Embed code handling
        var n = Object($.itemExport).length === 1 && M.d[$.itemExport[0]];
        if ($.itemExportEmbed || is_video(n) === 1) {
            var link = getBaseUrl() + '/embed#!' + n.ph + '!' + a32_to_base64(n.k);
            var iframe = '<iframe width="%w" height="%h" frameborder="0" src="%s" allowfullscreen></iframe>\n';
            var setCode = function() {
                var time = 0;
                var width = 0;
                var height = 0;
                var $time = $('.start-video-at .embed-setting', $linksDialog);
                var $vres = $('.change-video-resolution .embed-setting', $linksDialog);
                var getValue = function(s, c) {
                    var $input = $(s, c);
                    var value = String($input.val() || '').replace(/\.\d*$/g, '').replace(/\D/g, '');
                    value = parseInt(value || $input.attr('min') || '0') | 0;
                    $input.val(value);
                    return value;
                };
                if (!$time.hasClass('disabled')) {
                    time = getValue('input', $time);
                }
                if (!$vres.hasClass('disabled')) {
                    width = getValue('.width-video input', $vres);
                    height = getValue('.height-video input', $vres);
                }
                var code = iframe
                    .replace('%w', width > 0 && height > 0 ? width : 640)
                    .replace('%h', width > 0 && height > 0 ? height : 360)
                    .replace('%s', link + (time > 0 ? '!' + time + 's' : ''));
                $('.code-field .code', $linksDialog).text(code);
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
            $('.fm-dialog-tab', $linksDialog).removeClass('hidden');

            (function _() {
                var $block = $('.fm-tab-wrapper', $linksDialog);
                $('.fm-tab', $block).removeClass('active').rebind('click', _);

                if (this === window || $(this).is('.tab-embed-link')) {
                    $('.fm-tab.tab-embed-link', $block).addClass('active');
                    // $('.preview-embed', $linksDialog).removeClass('hidden');
                    $('.embed-content-block', $linksDialog).removeClass('hidden');
                    $('.export-content-block', $linksDialog).addClass('hidden');
                    // $('.fm-dialog-title', $linksDialog).text(l[1344] + ' (' + l[17407] + ')');
                }
                else {
                    $('.fm-tab.tab-url-link', $block).addClass('active');
                    $('.preview-embed', $linksDialog).addClass('hidden');
                    $('.embed-content-block', $linksDialog).addClass('hidden');
                    $('.export-content-block', $linksDialog).removeClass('hidden');
                    // $('.fm-dialog-title', $linksDialog).text(page === 'download' ? l[5622] : l[1031]);
                    deleteScrollPanel(scroll, 'jsp');
                }
                centerDialog();
            }).call($.itemExportEmbed ? window : {});
            $.itemExportEmbed = null;

            $('.video-filename span', $linksDialog).text(n.name);
            $('.video-attributes .size', $linksDialog).text(bytesToSize(n.s));
            $('.video-attributes .duration', $linksDialog).text(secondsToTimeShort(MediaAttribute(n).data.playtime));

            var $thumb = $('.video-thumbnail img', $linksDialog).attr('src', noThumbURI);
            getImage(n, 1).then(function(uri) {
                $thumb.attr('src', uri);
            }).catch(console.debug.bind(console));

            $('.code-field .code', $linksDialog).rebind('click', function() {
                selectText('embed-code-field');
                return false;
            });

            $('.preview-embed', $linksDialog).rebind('click', function() {
                if ($(this).text() !== l[1899]) {
                    $(this).text(l[148]);
                    $('.video-thumbnail-container', $linksDialog).addClass('hidden');
                    $('.video-player-container', $linksDialog).removeClass('hidden')
                        .safeHTML(iframe.replace('%s', link));
                }
                else {
                    $(this).text(l[1899]);
                    $('.video-thumbnail-container', $linksDialog).removeClass('hidden');
                    $('.video-player-container', $linksDialog).addClass('hidden').text('');
                }
                $linksDialog.css('margin-top', $linksDialog.outerHeight() / 2 * -1);
            });

            // Let's hide it for now...
            $('.preview-embed', $linksDialog).addClass('hidden');

            setCode();
        }

        // Reset state from previous dialog opens and pre-select the 'Link with key' option by default
        $linkContent.removeClass('public-handle decryption-key full-link').addClass('full-link');
        $linkButtons.removeClass('selected');
        $linksDialog.find('.link-handle-and-key').addClass('selected');

        M.safeShowDialog('links', function() {
            fm_showoverlay();
            $linksDialog.removeClass('hidden');

            if (page === 'download') {
                $('.export-link-body', $linksDialog).siblings().addClass('hidden');
                $('.fm-dialog-title', $linksDialog).text('');
            }
            else if (folderlink) {
                $('.extra-options, .reveal-feature-toggle-container', $linksDialog).addClass('hidden');
            }
            else {
                $('.export-links-warning').removeClass('hidden');
            }

            $(scroll).jScrollPane({showArrows: true, arrowSize: 5});
            jScrollFade(scroll);

            setTimeout(function() {
                $('.file-link-info').rebind('click', function() {
                    $('.file-link-info').select();
                });
            }, 300);

            centerDialog();
            return $linksDialog;
        });

        // Setup toast notification
        linksNum = getContentsToClip().split('\n').length;
        toastTxt = linksNum > 1 ? l[7655].replace('%d', linksNum) : l[7654];

        // Setup the copy to clipboard buttons
        $span.text(l[1990]);

        // If a browser extension or the new HTML5 native copy/paste is available (Chrome & Firefox)
        if (is_extension || M.execCommandUsable()) {
            $('.copy-to-clipboard').rebind('click', function() {
                copyToClipboard(getContentsToClip(), toastTxt);
                return false;
            });
        }
        else if (flashIsEnabled()) {
            $('.copy-to-clipboard').safeHTML(
                '<span>' + htmlentities(l[1990]) + '</span>'
              + '<object data="OneClipboard.swf" id="clipboardswf1" type="application/x-shockwave-flash" '
              +     'width="100%" height="32" allowscriptaccess="always">'
              +     '<param name="wmode" value="transparent" />'
              +     '<param value="always" name="allowscriptaccess" />'
              +     '<param value="all" name="allowNetworkin" />'
              +     '<param name="FlashVars" value="buttonclick=1" />'
              + '</object>');

            $('.copy-to-clipboard').rebind('mouseover.copyToClipboard', function() {
                var e = $('#clipboardswf1')[0];
                if (e && e.setclipboardtext) {
                    e.setclipboardtext(getContentsToClip());
                }
            });
            $('.copy-to-clipboard').rebind('mousedown.copyToClipboard', function() {
                showToast('clipboard', toastTxt);
            });
        }
        else {
            var uad = browserdetails(ua);

            if (uad.icon === 'ie.png' && window.clipboardData) {
                $('.copy-to-clipboard').rebind('click', function() {
                    links = getContentsToClip();
                    var mode = links.indexOf("\n") !== -1 ? 'Text' : 'URL';
                    window.clipboardData.setData(mode, links);
                    showToast('clipboard', toastTxt);
                });
            }
            else {
                if (window.ClipboardEvent) {
                    $('.copy-to-clipboard').rebind('click', function() {

                        window.onCopyEventHandler = function onCopyEvent(ev) {
                            if (d) {
                                console.log('onCopyEvent', arguments);
                            }
                            links = getContentsToClip();
                            ev.clipboardData.setData('text/plain', links);
                            if (links[0] !== '<') {
                                ev.clipboardData.setData('text/html', links.split("\n").map(function(link) {
                                    return '<a href="' + link + '"></a>';
                                }).join("<br/>\n"));
                            }
                            ev.preventDefault();
                            showToast('clipboard', toastTxt); // Done
                        };
                        document.addEventListener('copy', window.onCopyEventHandler, false);
                        Soon(function() {
                            $span.text(l[7663] + ' ' + (uad.os === 'Apple' ? 'command' : 'ctrl') + ' + C');
                        });
                    });
                }
                else {
                    // Hide the clipboard buttons if not using the extension and Flash is disabled
                    $('.copy-to-clipboard').addClass('hidden');
                }
            }
        }

        // Click anywhere on export link dialog will hide export link dropdown
        $('.export-links-dialog').rebind('click', function() {
            $('.export-link-dropdown').fadeOut(200);
        });

        $('.export-links-dialog .fm-dialog-close').rebind('click', function() {
            self.linksDialog(1);
        });

        $('.export-links-warning-close').rebind('click', function() {
            $('.export-links-warning').addClass('hidden');
        });

        // Add click handler
        $linkButtons.rebind('click', function() {

            var keyOption = $(this).attr('data-keyoptions');
            var $this = $(this);

            // Add selected state to button
            $linkButtons.removeClass('selected');
            $this.addClass('selected');

            // we have to deal with the extra '!' since the applied logic relies on CSS !!!
            var $key = $('.file-link-info.key', $linksDialog);
            var keyPart = $.trim($key.text());
            if ($this.hasClass('link-handle-and-key')) {
                if (keyPart[0] !== '!') {
                    // Restore key part, containing sub file/folder handle(s), if any
                    $key.text($key.data('key'));
                }
            }
            else if (keyPart[0] === '!') {
                // Remove initial ! separator and subsequent file/folder handle, if any
                $key.text(keyPart.substr(1).split(/[?!]/)[0]);
            }

            // Show the relevant 'Link without key', 'Decryption key' or 'Link with key'
            $('.export-content-block').removeClass('public-handle decryption-key full-link').addClass(keyOption);
            $span.text(l[1990]);

            // If decryption key, grey out options for expiry date and password protect because it doesn't make sense
            if (keyOption === 'decryption-key') {
                $('.export-links-dialog .disabled-overlay').removeClass('hidden');
            }
            else {
                // Otherwise enable the options
                $('.export-links-dialog .disabled-overlay').addClass('hidden');
            }

            // Stop propagation
            return false;
        });

        if (page !== 'download' && !folderlink) {
            // Initialise the Export Link expiry and password protect features
            exportExpiry.init();
            exportPassword.encrypt.init();
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
     * @private
     */
    function getClipboardLinks() {
        var links = [];
        var $dialog = $('.export-links-dialog .export-content-block');
        var modeFull = $dialog.hasClass('full-link');
        var modePublic = $dialog.hasClass('public-handle');
        var modeDecKey = $dialog.hasClass('decryption-key');
        var $passwordProtectToggle = $dialog.find('.fm-password-protect-dropdown .dialog-feature-toggle');

        // If the password protect toggle is enabled
        if ($passwordProtectToggle.hasClass('toggle-on')) {

            // Add all the password protected links
            $dialog.find('.password-protected-data').each(function() {
                links.push($(this).text());
            });
        }
        else {
            // Otherwise add all regular links
            $('.file-link-info-wrapper', $dialog).each(function() {
                var nodeUrlWithPublicHandle = $('.file-link-info.url', this).text();
                var nodeDecryptionKey = $('.file-link-info.key', this).text();
                var subNodeHandle = $(".file-link-info.subhandle", this).text();

                // Check export/public link dialog drop down list selected option
                if (modeFull) {
                    links.push(nodeUrlWithPublicHandle + nodeDecryptionKey + subNodeHandle);
                }
                else if (modePublic) {
                    links.push(nodeUrlWithPublicHandle + subNodeHandle);
                }
                else if (modeDecKey) {
                    links.push(nodeDecryptionKey);
                }
            });
        }

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

        var key;
        var type;
        var fileSize;
        var folderClass = '';
        var html = '';
        var nodeHandle = item.h;
        var fileUrlKey;
        var fileUrlWithoutKey;
        var fileUrlNodeHandle = "";

        // Add a hover text for the icon
        var expiresTitleText = l[8698].replace('%1', '');   // Expires %1

        if (folderlink) {
            fileUrlWithoutKey = 'https://mega.nz/#F!' + pfid;
            fileUrlKey = '!' + pfkey;
            fileUrlNodeHandle = (item.t ? '!' : '?') + item.h;
            fileSize = item.s && htmlentities(bytesToSize(item.s)) || '';
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
            folderClass = ' folder-item';
        }
        else {
            // Shared item type is file
            type = '';
            key = item.k;
            fileSize = htmlentities(bytesToSize(item.s));
        }

        fileUrlWithoutKey = fileUrlWithoutKey || ('https://mega.nz/#' + type + '!' + htmlentities(item.ph));
        fileUrlKey = fileUrlKey || (key ? '!' + a32_to_base64(key) : '');

        html = '<div class="export-link-item' + folderClass + '" data-node-handle="' + nodeHandle + '">'
             +      '<div class="export-icon ' + fileIcon(item) + '" ></div>'
             +      '<div class="export-link-text-pad">'
             +          '<div class="export-link-txt">'
             +               '<span class="export-item-title">' + htmlentities(item.name) + '</span>'
             +               '<span class="export-link-gray-txt">' + fileSize + '</span>'
             +               '<span class="export-link-expiry-container hidden">'
             +                    '<span class="export-link-expiry-icon" title="' + expiresTitleText + '"></span>'
             +                    '<span class="export-link-expiry"></span>'
             +               '</span>'
             +          '</div>'
             +          '<div id="file-link-block" class="file-link-block">'
             +              '<span class="icon"></span>'
             +              '<span class="file-link-info-wrapper">'
             +                  '<span class="file-link-info url">' + fileUrlWithoutKey + '</span>'
             +                  '<span class="file-link-info key" data-key="' + fileUrlKey + '">' + fileUrlKey + '</span>'
             +                  '<span class="file-link-info subhandle">' + fileUrlNodeHandle + '</span>'
             +                  '<span class="file-link-info password-protected-data hidden"></span>'
             +              '</span>'
             +          '</div>'
             +      '</div>'
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

        var html = '';

        $.each($.itemExport, function(index, value) {
            var node = M.d[value];
            if (node && (folderlink || node.ph)) {
                html += itemExportLinkHtml(node);
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
    ExportLink.prototype.getExportLink = function() {
        var nodes = this.options.nodesToProcess || false;

        if (!nodes.length) {
            return this.logger.warn('No nodes provided to export...', this);
        }

        // Add some logging for usage comparisons
        if (page === 'download') {
            eventlog(99683); // Share public link on downloads page.
        }
        else if (folderlink) {
            eventlog(99715); // Share public link from folder-link.

            var exportLinkDialog = new mega.Dialog.ExportLink();
            return exportLinkDialog.linksDialog();
        }
        else if (is_mobile) {
            eventlog(99634); // Created public link on mobile webclient
        }
        else {
            eventlog(99635); // Created public link on regular webclient
        }

        loadingDialog.show();
        this.logger.debug('getExportLink');

        for (var i = 0; i < nodes.length; i++) {
            var h = nodes[i];
            var n = M.d[h];

            if (n) {
                if (n.t) {
                    this._getFolderExportLinkRequest(h);
                }
                else {
                    this._getExportLinkRequest(h);
                }
            }
            else {
                loadingDialog.hide();
                this.logger.warn('Invalid node to export...', h);
            }
        }
    };

    /**
     * Removes public link for file or folder.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype.removeExportLink = function(quiet) {
        var self = this;
        var promises = [];
        var handles = self.options.nodesToProcess || [];

        if (handles.length) {
            if (!quiet) {
                loadingDialog.show();
            }
            self.logger.debug('removeExportLink');

            $.each(handles, function(index, h) {
                var n = M.d[h];

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
            });
        }

        if (!promises.length) {
            return MegaPromise.reject(EARGS);
        }

        return MegaPromise.allDone(promises);
    };

    /**
     * A 'Private' function, send folder public link delete request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getFolderExportLinkRequest = function(nodeId) {

        var self = this;
        var share = M.getNodeShare(nodeId);

        // No need to perform an API call if this folder was already exported (Ie, we're updating)
        if (share.h === nodeId) {
            if (!M.d[nodeId].t || u_sharekeys[nodeId]) {
                return self._getExportLinkRequest(nodeId);
            }

            if (d) {
                console.warn('Missing sharekey for "%s" - relying on s2 to obtain it...', nodeId);
            }
        }
        // FIXME: check this

        // Get all child nodes of root folder with nodeId
        M.getNodes(nodeId, true)
            .always(function(childNodes) {

                var sharePromise = api_setshare(nodeId, [{u: 'EXP', r: 0}], childNodes);
                sharePromise.done(function _sharePromiseDone(result) {
                    if (result.r && result.r[0] === 0) {

                        self._getExportLinkRequest(nodeId);

                        if (!self.nodesLeft) {
                            loadingDialog.hide();
                        }
                    }
                    else {
                        self.logger.warn('_getFolderExportLinkRequest', nodeId, 'Error code: ', result);
                        loadingDialog.hide();
                    }
                });
                sharePromise.fail(function _sharePromiseFailed(result) {
                    self.logger.warn('Get folder link failed: ' + result);
                    // FIXME: this seem to lack some handling code for this condition
                });
            });
    };

    /**
     * A 'Private' function, send public get-link request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getExportLinkRequest = function(nodeId) {

        var self = this;
        var done = function(handle) {

            if (handle && self.options.updateUI) {
                var UiExportLink = new mega.UI.Share.ExportLink();
                UiExportLink.addExportLinkIcon(handle);
            }

            if (!--self.nodesLeft) {
                loadingDialog.hide();
                if (self.options.showExportLinkDialog) {
                    var exportLinkDialog = new mega.Dialog.ExportLink();
                    exportLinkDialog.linksDialog();
                }
            }

            // A hook for the mobile web to show the public link and the remove button
            if (is_mobile) {
                mobile.linkOverlay.showPublicLinkAndEnableButtons(nodeId);
            }
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

        api_req(request, {
            nodeId: nodeId,
            callback: function(result) {
                if (typeof result !== 'number') {
                    M.nodeShare(this.nodeId, { h: this.nodeId, r: 0, u: 'EXP', ts: unixtime(), ph: result });
                    var n = M.d[this.nodeId];
                    if (n) {
                        n.ph = result;
                        M.nodeUpdated(n);
                    }
                }
                else { // Error
                    self.logger.warn('_getExportLinkRequest:', this.nodeId, 'Error code: ', result);
                }

                done(typeof result !== 'number' && this.nodeId);
            }
        });
    };

    /**
     * A 'Private' function, send folder delete public link request.
     * @param {String} nodeId The node ID.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFolderExportLinkRequest = function(nodeId, quiet) {

        var self = this;
        var masterPromise = new MegaPromise();

        api_req({ a: 's2', n:  nodeId, s: [{ u: 'EXP', r: ''}], ha: '', i: requesti }, {
            nodeId: nodeId,
            callback: function(result) {
                if (result.r && (result.r[0] === 0)) {
                    M.delNodeShare(this.nodeId, 'EXP');

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }

                    // Hook for mobile web to show that removal completed successfully and then close the dialog
                    if (is_mobile) {
                        mobile.linkOverlay.completeLinkRemovalProcess(this.nodeId);
                    }

                    masterPromise.resolve();
                }
                else {
                    // Error
                    self.logger.warn('_removeFolerExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    masterPromise.reject(result);
                }

                if (!--self.nodesLeft && !quiet) {
                    loadingDialog.phide();
                }
            }
        });

        return masterPromise;
    };

    /**
     * A 'Private' function, send file delete public link request.
     * @param {String} nodeId The node IDs.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFileExportLinkRequest = function(nodeId, quiet) {

        var self = this;
        var promise = new MegaPromise();

        api_req({ a: 'l', n: nodeId, d: 1, i:requesti }, {
            nodeId: nodeId,
            callback: function(result) {
                if (result === 0) {
                    M.delNodeShare(this.nodeId, 'EXP');

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }

                    // Hook for mobile web to show that removal completed successfully and then close the dialog
                    if (is_mobile) {
                        mobile.linkOverlay.completeLinkRemovalProcess(this.nodeId);
                    }

                    promise.resolve();
                }
                else {
                    // Error
                    self.logger.warn('_removeFileExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    promise.reject(result);
                }

                if (!--self.nodesLeft && !quiet) {
                    loadingDialog.phide();
                }
            }
        });

        return promise;
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
     */
    var initCopyrightsDialog = function(nodesToProcess, isEmbed) {
        'use strict';

        $.itemExportEmbed = isEmbed;
        $.itemExport = nodesToProcess;

        var openGetLinkDialog = function() {
            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': true,
                'updateUI': true,
                'nodesToProcess': nodesToProcess
            });
            exportLink.getExportLink();
        };

        // If they've already agreed to the copyright warning (cws = copyright warning shown)
        if (fmconfig.cws || folderlink) {
            // Go straight to Get Link dialog
            openGetLinkDialog();
            return false;
        }

        // Cache selector
        var $copyrightDialog = $('.copyrights-dialog');

        // Otherwise show the copyright warning dialog
        M.safeShowDialog('copyrights', function() {
            $.copyrightsDialog = 'copyrights';
            return $copyrightDialog;
        });

        // Init click handler for 'I agree' / 'I disagree' buttons
        $copyrightDialog.find('.default-white-button').rebind('click', function() {
            closeDialog();

            // User disagrees with copyright warning
            if (!$(this).hasClass('cancel')) {
                // User agrees, store flag so they don't see it again
                mega.config.set('cws', 1);

                // Go straight to Get Link dialog
                openGetLinkDialog();
            }
        });

        // Init click handler for 'Close' button
        $copyrightDialog.find('.fm-dialog-close').rebind('click', closeDialog);
    };

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

        this.logger = MegaLogger.getLogger('UiExportLink');
    };

    /**
     * addExportLinkIcon
     *
     * Add public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addExportLinkIcon = function(nodeId) {

        var self = this;
        var $nodeId = $('#' + nodeId);
        var $tree = $('#treea_' + nodeId);

        if ($nodeId.length === 0 && M.currentdirid.indexOf('chat') === -1) {

            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $nodeId = $(M.megaRender.getDOMNode(nodeId, M.d[nodeId]));
            }
        }

        if (!$nodeId.length && !$tree.length) {
            self.logger.warn('No DOM Node matching "%s"', nodeId);

            return false;
        }

        self.logger.debug('addExportLinkIcon', nodeId);

        if ($nodeId.length) {

            // Add link-icon to list view
            $('.own-data', $nodeId).addClass('linked');

            // Add link-icon to grid view
            if ($nodeId.hasClass('data-block-view')) {
                $nodeId.addClass('linked');
            }
        }

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
        var $node = $('#' + nodeId);
        if ($node.length === 0) {
            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $node = $(M.megaRender.getDOMNode(nodeId, M.d[nodeId]));
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

        var titleTooltip = '';

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).addClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.data-block-view').addClass('taken-down');

        if (M.megaRender && M.megaRender.nodeMap && M.megaRender.nodeMap[nodeId]) {
            $(M.megaRender.nodeMap[nodeId]).addClass('take-down');
        }
        // Add taken-down to left panel
        $('#treea_' + nodeId).addClass('taken-down');

        // Add title, mouse popup
        if (M.d[nodeId].t === 1) {// Item is folder

            titleTooltip = l[7705];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8595];
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.data-block-view').attr('title', titleTooltip);
        }
        else {// Item is file

            titleTooltip = l[7704];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8602];
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
        if (M.megaRender.hasDOMNode(nodeId)) {
            $(M.megaRender.getDOMNode(nodeId, M.d[nodeId])).removeClass('take-down');
        }

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).removeClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.data-block-view').removeClass('taken-down');

        // Add taken-down to left panel
        $('#treea_' + nodeId).removeClass('taken-down');

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
