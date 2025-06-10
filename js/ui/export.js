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
            this.$dialog = $('.mega-sheet.export-links-settings-dialog', 'body');

            // If they are a Pro user, enable set password feature
            if (u_attr.p) {
                this.loadPasswordEstimatorLibrary();
                this.initPasswordStrengthCheck();
            }
        },

        /**
         * Load the ZXCVBN password strength estimator library
         */
        loadPasswordEstimatorLibrary: function() {

            "use strict";

            if (typeof zxcvbn === 'undefined') {

                M.require('zxcvbn_js').done(nop);
            }
        },

        /**
         * Show what strength the currently entered password is on key up
         */
        initPasswordStrengthCheck: function() {

            "use strict";

            mega.ui.MegaInputs($('.enter-pass', this.$dialog));
        },

        showErrorToast(content) {
            'use strict';
            toaster.main.show({ icons: ['sprite-fm-mono icon-alert-triangle-thin-outline red'], content });
        },

        /**
         * Start key derivation of each link in the dialog
         */
        async startEncryption(password) {

            'use strict';

            const $passwordInput = $('input.enter-pass', this.$dialog);

            // Check if TextEncoder function is available for the stringToByteArray function
            if (!window.TextEncoder) {

                // This feature is not supported in your browser...
                this.showErrorToast(l[9065]);
                return false;
            }

            // Check zxcvbn library is loaded first or we can't check the strength of the password
            if (typeof zxcvbn === 'undefined') {

                // The password strength verifier is still initializing
                this.showErrorToast(l[1115]);
                return false;
            }

            // Check that the password length is sufficient and exclude very weak passwords
            if (
                password.length < security.minPasswordLength
                || $('.password-status', $passwordInput.parent()).hasClass('weak')
            ) {

                // Please use a stronger password
                this.showErrorToast(l[9067]);
                return false;
            }

            // Get information for each selected link showing in the dialog and convert the password to bytes
            const links = exportPassword.encrypt.getLinkInfo();
            const pwdLinks = [];

            // An anonymous function to derive the key and on completion create the password protected link
            const processLinkInfo = (linkInfo, algorithm, saltBytes, password) => new Promise((resolve) => {
                exportPassword.deriveKey(algorithm, saltBytes, password, (derivedKeyBytes) => {
                    resolve(exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes));
                });
            });

            // For each selected link
            for (let i = 0; i < links.length; i++) {

                // Get the link information and random salt
                const link = links[i];
                const saltBytes = link.saltBytes;
                const algorithm = exportPassword.currentAlgorithm;

                // Derive the key and create the password protected link
                pwdLinks.push(await processLinkInfo(link, algorithm, saltBytes, password).catch(tell));
            }

            return pwdLinks;
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
                return protectedUrl;
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

            const links = [];
            const handles = $.itemExport;

            // Iterate through the selected handles
            for (var i in handles) {
                if (handles.hasOwnProperty(i)) {

                    // Get the node information
                    const node = M.d[handles[i]];
                    const linkInfo = Object.create(null);

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
                        const algorithm = exportPassword.currentAlgorithm;
                        const saltLengthBytes = exportPassword.algorithms[algorithm].saltLength / 8;
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

                const url = `${folderIdentifier ? '/folder/' : '/file/'}${handleUrlEncoded}#${decryptedKeyUrlEncoded}`;

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
     * @returns {Promise<void>}
     */
    async removeLinksAndReAdd(nodesToRecreate) {
        'use strict';

        // Disable sharing on links / perform the remove links operation
        const exportLink = new mega.Share.ExportLink({
            'updateUI': false,
            'nodesToProcess': nodesToRecreate
        });
        await exportLink.removeExportLink(true);

        // When all links are finished being recreated
        await exportLink.getExportLink(true);
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
     * Control value to ignore autofocus event
     */
    presetValue: false,

    /**
     * Initialise function
     */
    init: function() {

        "use strict";

        this.$dialog = $('.mega-sheet.export-links-settings-dialog', 'body');

        // If they are a pro user, load the datepicker library
        if (u_attr.p) {
            M.require('datepicker_js').done(() => {
                exportExpiry.initExpiryDatePicker();
            });
        }
    },

    /**
     * Setup the datepicker
     */
    initExpiryDatePicker: function() {

        "use strict";

        const $setDateInput = $('.set-date', this.$dialog);
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
                // Checking if the date has been already preset
                if (!inst.selectedDates.length && this.presetValue) {
                    inst.selectedDates.push(new Date(this.presetValue * 1000));
                }

                // Checking if the date has been already preset
                if (!inst.selectedDates.length) {
                    const prevTs = parseInt($setDateInput.attr('data-ts'));

                    if (!Number.isNaN(prevTs)) {
                        inst.selectedDates.push(new Date(prevTs * 1000));
                    }
                }

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

                // Close export dropdown
                $('.dropdown.export', this.$dialog).addClass('hidden');
            },

            onSelect: (dateText, date, inst) => {
                this.presetValue = false;

                const $inputClicked = inst.$el;

                $inputClicked.closest('.item').addClass('selected');
                $inputClicked.trigger('change.logDateChange');

                // Update the text input
                exportExpiry.updateInputText(date);

                mega.Dialog.ExportLink.settings.updateExp(date ? date.getTime() / 1000 : 0);
            },

            onHide: () => {
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

        if (this.presetValue) {
            exportExpiry.updateInputText(new Date(this.presetValue * 1000));
        }
        else {
            $setDateInput.trigger('focus');
        }
    },

    /**
     * Update the datepicker input text field with the readable text date
     * @param {Date} date
     */
    updateInputText: function(date) {

        'use strict';

        // Make sure the date is set
        if (date) {
            const $setDateInput = $('input.set-date', self.$dialog);

            // Convert to readable date e.g. 3 August 2023
            const dateTimestamp = Math.round(date.getTime() / 1000);
            const inputText = time2date(dateTimestamp, 2);

            $setDateInput.val(inputText);
            $setDateInput.attr('data-ts', String(dateTimestamp));
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
     * Update selected links on the API with details about the expiry of the link
     * @param {Number} expiryTimestamp The expiry timestamp of the link. Set to null to remove the expiry time
     */
    updateLinksOnApi: function(expiryTimestamp) {

        "use strict";

        const $links = $('.item', this.$dialog);
        const $selectedLink =  $('.item.selected', this.$dialog);
        const handles = [];

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
 * Log public-link dialog events
 * @param {Number} evtId Stat event id
 * @param {any[]|Object.<String, any>} data Data to pass with the stat event
 * @returns {void}
 */
function logExportEvt(evtId, data) {
    'use strict';
    eventlog(evtId, JSON.stringify(data));
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
     * @param {Object.<String, any>} [options] Options to pass to the dialog
     */
    ExportLinkDialog.prototype.linksDialog = function(close, options) {
        'use strict';

        if (M.isInvalidUserStatus()) {
            return;
        }

        if (close) {
            scope.mega.Dialog.ExportLink.view.hide();
        }
        else {
            scope.mega.Dialog.ExportLink[($.itemExportEmbed) ? 'embed' : 'view'].show(options);
            scope.mega.Dialog.ExportLink.settings.resetValues();
        }
    };


    // ------------------------------------
    // ----- PRIVATE FUNCTIONS FOLLOW -----
    // ------------------------------------


    /**
     * getClipboardLinks
     * Gather all available public links for selected items (files/folders).
     * @returns {String} links URLs or decryption keys for selected items separated with newline '\n'.
     * @param {Boolean} keysOnly Whether to copy keys only
     */
    function getClipboardLinks(keysOnly) {
        'use strict';

        const values = [];
        const rows = mega.ui.sheet.contentNode
            .querySelectorAll(keysOnly ? '.decr-key-value > span' : '.link-value > span');

        if (rows) {
            for (let i = 0; i < rows.length; i++) {
                values.push(rows[i].textContent);
            }
        }

        return values.join('\n');
    }

    /**
     * itemExportLinkHtml
     *
     * @param {Object} item Node item to work with
     * @param {Boolean} keySeparated Whether the key should be rendered separately or not
     * @param {String} [protectedLink] Link protected with password
     * @returns {String}
     * @private
     */
    function itemExportLinkHtml(item, keySeparated, protectedLink) {
        'use strict';

        const nodeHandle = item.h;
        let key;
        let type;
        let fileUrlKey;
        let fileUrlWithoutKey;
        let fileUrlNodeHandle = '';

        if (folderlink) {
            if (item.foreign) {
                if (item.pfid) {
                    fileUrlWithoutKey = `${getBaseUrl()}/folder/${item.pfid}`;
                    fileUrlKey = `#${item.pfkey}`;
                    fileUrlNodeHandle = (item.t ? '/folder/' : '/file/') + item.h;
                }
                key = item.k;
            }
            else {
                fileUrlWithoutKey = getBaseUrl() + '/folder/' + pfid;
                fileUrlKey = '#' + pfkey;
                fileUrlNodeHandle = (item.t ? '/folder/' : '/file/') + item.h;
            }
        }
        else if (item.t) {
            // Shared item type is folder
            key = u_sharekeys[item.h] && u_sharekeys[item.h][0];

            // folder key must exit, otherwise skip
            if (!key) {
                return '';
            }

            type = 'F';
        }
        else {
            // Shared item type is file
            type = '';
            key = item.k;
        }

        if (!fileUrlWithoutKey) {
            fileUrlWithoutKey = getBaseUrl() + (type ? '/folder/' : '/file/') + htmlentities(item.ph);
        }

        if (!fileUrlKey) {
            fileUrlKey = key ? '#' + a32_to_base64(key) : '';
        }

        const composeBlock = () => {
            const addCopyRow = (text, parent, klass, simpletip, copiedMsg, copyEvtId) => {
                const row = mCreateElement(
                    'div',
                    { class: `flex flex-row items-center text-color-high ${klass || ''}` },
                    parent
                );
                mCreateElement('span', { class: 'flex-1 text-ellipsis select-text' }, row).textContent = text;

                MegaButton.factory({
                    parentNode: row,
                    icon: 'sprite-fm-mono icon-copy-thin-outline icon-size-20',
                    componentClassname: 'transparent-icon text-icon copy-field simpletip secondary',
                    type: 'icon',
                    dataset: { simpletip }
                }).on('click.copy', () => {
                    copyToClipboard(text);
                    mega.ui.toast.show(copiedMsg, 4);
                    logExportEvt(copyEvtId);
                });

                return row;
            };

            const header = mCreateElement('div', { class: 'flex flex-row items-center mt-4 mb-2 block-naming' }, [
                mCreateElement('i', {class: `item-type-icon icon-${fileIcon(item)}-24 icon-size-8`})
            ]);
            const nameRow = mCreateElement(
                'span',
                { class: 'text-ellipsis px-2 select-text' },
                header
            );

            nameRow.textContent = item.name;
            const numFolders = M.d[nodeHandle].td;
            const numFiles = M.d[nodeHandle].tf;

            if (item.t && (numFiles || numFolders)) {
                let wording = '';

                if (numFolders > 0) {
                    wording = mega.icu.format(l.folder_count, numFolders);
                }

                if (numFiles > 0) {
                    wording += (wording ? ' \u2E31 ' : '') + mega.icu.format(l.file_count, numFiles);
                }

                if (wording) {
                    mCreateElement(
                        'span',
                        { class: 'text-color-medium separator-before px-2 flex-1 whitespace-nowrap' },
                        header
                    ).textContent = wording;
                }
            }
            else {
                nameRow.classList.add('flex-1');
            }

            const block = mCreateElement(
                'div',
                { class: 'node-link-block font-body-1', 'data-node-handle': nodeHandle },
                [header]
            );
            const linkData = mCreateElement('div', { class: 'bg-surface-grey-1 rounded-xl p-3' }, block);

            if (protectedLink) {
                addCopyRow(protectedLink, linkData, 'link-value', l.copy_link, l[1642], 500759);
            }
            else {
                if (keySeparated) {
                    mCreateElement('span', { class: 'font-bold text-color-high' }, linkData).textContent = l.link;
                }

                addCopyRow(
                    fileUrlWithoutKey + (keySeparated ? '' : fileUrlKey + fileUrlNodeHandle),
                    linkData,
                    'link-value',
                    l.copy_link,
                    l[1642],
                    500759
                );

                if (keySeparated) {
                    mCreateElement('hr', { class: 'mb-4 border-b border-t-none border-x-none' }, linkData);
                    mCreateElement('span', { class: 'font-bold text-color-high' }, linkData).textContent = l[1028];
                    addCopyRow(
                        fileUrlKey.substring(1),
                        linkData,
                        'decr-key-value',
                        l[17386],
                        l.key_copied,
                        500762
                    );
                }
            }

            return block;
        };

        return composeBlock();
    }

    /**
     * generates file url for shared item
     * @param {Object.<String, Boolean|String[]>} opts Options to apply
     * @returns {HTMLDivElementp[]}
     * @private
     */
    function itemExportLink(opts) {

        'use strict';

        const { dec, pwdArr } = opts;
        const items = [];

        for (let i = 0; i < $.itemExport.length; i++) {
            const value = $.itemExport[i];
            const node = M.d[value];

            if (node && (folderlink || node.ph)) {
                items.push(itemExportLinkHtml(node, dec, (pwdArr || [])[i]));
            }
        }

        return items;
    }

    const hideDialog = (name) => {
        const { sheet } = mega.ui;

        sheet.removeClass(name);

        if (sheet.name === name) {
            sheet.hide();
            sheet.clear();
        }

        if ($.dialog === name) {
            delete $.dialog;
        }
    };

    const removeLink = (prevDialog) => {
        const { ExportLink } = scope.mega.Dialog;
        const doRemove = () => {
            // Remove in "quiet" mode without overlay
            const exportLink = new mega.Share.ExportLink({ 'updateUI': true, 'nodesToProcess': $.itemExport });
            exportLink.removeExportLink(true);
            ExportLink.settings.resetNewValues();
        };

        // If they have already checked the Don't show this again checkbox, just remove the link/s
        if (mega.config.get('nowarnpl')) {
            doRemove();
        }
        else {
            ExportLink.remove.show(null, null, doRemove, prevDialog);
        }

        const counts = [0, 0];
        let i = $.itemExport.length;

        while (--i >= 0) {
            counts[M.d[$.itemExport[i]].t]++;
        }

        logExportEvt(500767, counts);
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.Dialog = scope.mega.Dialog || {};
    scope.mega.Dialog.ExportLink = ExportLinkDialog;

    lazy(scope.mega.Dialog.ExportLink, 'view', () => {
        const { ExportLink } = scope.mega.Dialog;
        const name = 'export-links-dialog';
        const { sheet, toast } = mega.ui;

        const onKeyDown = (evt) => {
            const { key, ctrlKey, metaKey } = evt;

            if ((ctrlKey || metaKey) && key === 'a') {
                evt.preventDefault();

                const texts = sheet.contentNode.querySelectorAll('.select-text');

                const selection = window.getSelection();
                selection.removeAllRanges();

                const range = document.createRange();
                range.selectNodeContents(texts[0]);

                if (texts.length > 1) {
                    let i = 0;

                    while (++i < texts.length) {
                        range.setEndAfter(texts[i]);
                    }
                }

                selection.addRange(range);
            }
        };

        let itBanner = null;

        const removeItBanner = () => {
            if (itBanner) {
                itBanner.remove();
                itBanner = null;
            }
        };

        /**
         * @param {Object.<String, Boolean|String[]>} dialogOpts Whether to show the decryption key separately or not
         * @returns {void}
         */
        const show = (dialogOpts = Object.create(null)) => {
            const count = $.itemExport.length;

            const addSettingsBtn = (parentNode) => new MegaButton({
                parentNode,
                text: l.link_settings,
                componentClassname: 'text-icon font-600 underline-offset-4 whitespace-nowrap slim no-px',
                type: 'button',
            }).on('click.link-settings', () => {
                ExportLink.view.hide();
                ExportLink.settings.show();
                logExportEvt(500760);
            });

            const footerElements = [
                mCreateElement('div', { class: 'link-access-text mb-10 text-left' }),
                mCreateElement('div', { class: 'flex flex-row-reverse' })
            ];

            const explainer = (dialogOpts.pwd)
                ? (count === 1 ? l.password_link_access_explainer : l.password_link_access_explainer_multiple)
                : mega.icu.format(l.link_access_explainer, count);
            footerElements[0].textContent = explainer;

            const counts = [0, 0];
            let i = count;

            while (--i >= 0) {
                counts[M.d[$.itemExport[i]].t]++;
            }

            MegaButton.factory({
                parentNode: footerElements[1],
                text: (count === 1) ? l.copy_link : l[23625],
                componentClassname: 'slim',
                type: 'button'
            }).on('click.copyLinks', () => {
                copyToClipboard(getClipboardLinks());
                toast.show((count === 1) ? l[1642] : l.links_copied, 4);
                logExportEvt(500758, counts);
            });

            if (dialogOpts.dec && !dialogOpts.pwd) {
                MegaButton.factory({
                    parentNode: footerElements[1],
                    text: (count === 1) ? l[17386] : l[23624],
                    componentClassname: 'secondary mx-2 slim',
                    type: 'normal'
                }).on('click.copyKeys', () => {
                    copyToClipboard(getClipboardLinks(true));
                    toast.show((count === 1) ? l.key_copied : l.keys_copied, 4);
                    logExportEvt(500761, counts);
                });
            }

            if ($.isCtrlShift && counts[1] && !folderlink) {
                MegaButton.factory({
                    parentNode: footerElements[1],
                    text: l.repair,
                    componentClassname: 'secondary mx-2 slim simpletip',
                    type: 'normal',
                    dataset: { simpletip: l.repair_note }
                }).on('click.repairLink', () => {
                    const p = [];
                    let i = $.itemExport.length;

                    while (--i >= 0) {
                        const { t, h } = M.getNodeByHandle($.itemExport[i]);

                        if (t) {
                            p.push(api_setshare(h, [{u: 'EXP', r: 0, rsk: 1}]));
                        }
                    }

                    if (p.length) {
                        loadingDialog.show('rsk', l[1141]);
                        Promise.all(p).catch(tell).finally(() => loadingDialog.hide('rsk'));
                    }
                });

                delete $.isCtrlShift;
            }

            const options = {
                name,
                contents: [mCreateElement('div', { class: 'relative' }, itemExportLink(dialogOpts))],
                showClose: true,
                footer: {
                    slot: footerElements
                },
                header: mega.icu.format(l.share_link, count),
                onShow: () => {
                    const { createdCount, isUpdated } = dialogOpts;
                    const heading = mCreateElement('div');

                    if (isUpdated) {
                        const banner = mCreateElement(
                            'div',
                            { class: 'mb-4 overflow-y-hidden max-h-100 transition-max-h' },
                            heading
                        );

                        const bannerTxt = mCreateElement(
                            'div',
                            { class: 'p-3 bg-banner-success rounded-xl font-body-1' },
                            banner
                        );
                        bannerTxt.textContent = (count === 1) ? l.link_updated : l.links_updated;

                        sheet.contentNode.prepend(heading);

                        tSleep(3).then(() => {
                            banner.classList.remove('max-h-100');
                            banner.classList.add('max-h-0');
                        });
                    }


                    if (createdCount !== undefined) {
                        copyToClipboard(getClipboardLinks());
                        toast.show(
                            (createdCount > 0)
                                ? mega.icu.format(l.toast_link_created_and_copied, count)
                                : (count === 1 ? l[1642] : l.links_copied),
                            4
                        );
                    }

                    if (!folderlink && !dlid) {
                        addSettingsBtn(
                            ($.itemExport.length === 1)
                                ? sheet.contentNode.querySelector('.node-link-block .block-naming')
                                : sheet.headerTitleNode
                        );

                        if (mega.xferit && (fmconfig.noItBanner || 0) < Date.now()) {
                            const header = sheet.overlayNode.querySelector('.header');
                            const title = mCreateElement('div', { class: 'font-title-h3' });
                            const txt = mCreateElement('div', { class: 'font-body-1' });
                            itBanner = mCreateElement(
                                'div',
                                {
                                    class: 'it-banner absolute bg-it p-6 flex flex-row items-center w-full left-0'
                                        + ' text-color-white box-border rounded-3xl'
                                        + ' box-border opacity-0 transition-opacity'
                                },
                                [
                                    mCreateElement('i', { class: 'sprite-fm-mono icon-transfer-it icon-size-8' }),
                                    mCreateElement('div', { class: 'flex-1 px-4' }, [ title, txt ])
                                ]
                            );

                            title.textContent = l.it_banner_title;
                            txt.textContent = l.it_banner_txt;

                            header.prepend(itBanner);

                            MegaButton.factory({
                                parentNode: itBanner,
                                text: l.it_banner_btn,
                                componentClassname: 'primary whitespace-nowrap font-600 slim theme-dark-forced',
                                type: 'button'
                            }).on('click.pro', () => {
                                M.openTransferItOverlay($.selected).catch(tell);
                                sheet.trigger('close');
                            });

                            MegaButton.factory({
                                parentNode: itBanner,
                                icon: 'sprite-fm-mono icon-dialog-close icon-size-20',
                                componentClassname: 'theme-dark-forced text-icon close',
                                type: 'icon'
                            }).on('click.close', () => {
                                sheet.overlayNode.classList.remove('has-it-banner');
                                itBanner.classList.add('hidden');
                                // Show it again after a week
                                mega.config.set('noItBanner', Date.now() + 1000 * 60 * 60 * 24 * 7);
                            });

                            sheet.overlayNode.classList.add('has-it-banner');

                            tSleep(0.3).then(() => {
                                if (itBanner) {
                                    itBanner.classList.add('opacity-100');
                                }
                            });
                        }

                        document.addEventListener('keydown', onKeyDown, true);
                    }
                },
                onClose: () => {
                    document.removeEventListener('keydown', onKeyDown, true);
                    sheet.removeClass(name);
                    removeItBanner();
                }
            };

            sheet.show(options);
            sheet.addClass(options.name);
        };

        return {
            show,
            hide: () => {
                document.removeEventListener('keydown', onKeyDown, true);
                hideDialog(name);
                removeItBanner();
            }
        };
    });

    lazy(scope.mega.Dialog.ExportLink, 'settings', () => {
        const { ExportLink } = scope.mega.Dialog;
        const name = 'export-links-settings-dialog';

        let values;
        let newValues = Object.create(null);

        const resetNewValues = () => {
            newValues = Object.create(null);
        };

        const show = () => {
            const { sheet } = mega.ui;
            const timestamps = exportExpiry.getExpiryDates();

            const getExpTimestamp = () => {
                if (!timestamps.length) {
                    return 0;
                }

                if (timestamps.length !== $.itemExport.length) {
                    return '';
                }

                let i = timestamps.length - 1;
                let last = timestamps[i];

                while (--i >= 0) {
                    if (timestamps[i] !== last) {
                        return '';
                    }

                    last = timestamps[i];
                }

                return last;
            };

            if (!values) {
                values = Object.create(null);
                values.dec = false;
                values.pwd = '';
                values.pwdArr = [];
                values.exp = getExpTimestamp();
            }

            const onBack = (skipConfirm, isUpdated) => {
                ExportLink.settings.hide();

                const doLeave = () => {
                    resetNewValues();
                    ExportLink.settingsDiscard.hide();
                    ExportLink.view.show({ ...values, isUpdated });
                };

                if (Object.keys(newValues).length && !skipConfirm) {
                    ExportLink.settingsDiscard.show(
                        l.discard_changes,
                        l.discard_changes_msg,
                        doLeave
                    );
                }
                else {
                    doLeave();
                }
            };

            const createContents = () => {
                const createRow = (id, contentFn, checkFn, uncheckFn, options) => {
                    const action = mCreateElement('div');
                    const row = mCreateElement('div', { class: 'flex flex-row font-body-1 mt-4' }, [
                        mCreateElement('div', { class: 'flex-1' }),
                        action
                    ]);

                    const { checked, ignorePro } = options || {};

                    if (ignorePro || u_attr.p) {
                        MegaToggleButton.factory({
                            parentNode: action,
                            componentClassname: 'mega-toggle-button',
                            disabled: false,
                            value: id,
                            id,
                            checked: !!checked,
                            role: 'switch',
                            onChange() {
                                if (this.checked) {
                                    checkFn(row);
                                }
                                else {
                                    uncheckFn(row);
                                }
                            }
                        });
                    }
                    else {
                        MegaButton.factory({
                            parentNode: action,
                            text: l[8695],
                            componentClassname: 'pro-only outline link',
                            type: 'button'
                        }).on('click.pro', () => {
                            ExportLink.settings.hide();
                            loadSubPage('pro');
                        });
                    }

                    contentFn(row);

                    return row;
                };

                const decr = createRow(
                    'link-dec-toggle',
                    (row) => {
                        const decrTxt = row.querySelector('.flex-1');

                        mCreateElement('span', null, decrTxt).textContent = l.send_decryption_key_separately;
                        const link = mCreateElement('a', {
                            class: 'learn-more-text px-1',
                            href: `${l.mega_help_host}/security/data-protection/make-links-more-secure`,
                            target: '_blank',
                            rel: 'noopener noreferrer'
                        }, decrTxt);

                        link.textContent = l[8742];
                        link.addEventListener('click', logExportEvt.bind(null, 500764));
                    },
                    () => {
                        newValues.dec = true;

                        // Log to see if "export link decryption key separately" is used much
                        logExportEvt(500763, [1]);
                    },
                    () => {
                        newValues.dec = false;
                        logExportEvt(500763, [0]);
                    },
                    { ignorePro: true, checked: !!values.dec }
                );
                decr.classList.add('items-center');

                const exp = createRow(
                    'link-exp-toggle',
                    (row) => {
                        const parent = row.querySelector('.flex-1');
                        mCreateElement('p', { class: 'my-0' }, parent).textContent = l.expiry_date;
                        mCreateElement(
                            'p',
                            { class: 'text-color-medium font-body-2 my-0' },
                            parent
                        ).textContent = l.link_exp_txt;
                        mCreateElement(
                            'div',
                            { class: 'exp-input max-h-0 mt-2 transition-max-h overflow-y-hidden' },
                            parent
                        );
                    },
                    (row) => { // Checked
                        const expContainer = row.querySelector(':scope > .flex-1 > .exp-input');
                        expContainer.classList.remove('max-h-0');
                        expContainer.classList.add('max-h-100');

                        mCreateElement(
                            'input',
                            {
                                class: 'set-date border-1 rounded-xl font-body-2'
                                    + ' text-color-medium focus-border-strong',
                                type: 'text',
                                name: 'share-link-expiry-datepicker',
                                placeholder: l[8953],
                                readonly: '',
                                value: ''
                            },
                            expContainer
                        );

                        exportExpiry.init();

                        logExportEvt(500765, [1]);
                    },
                    (row) => { // Unchecked
                        const expContainer = row.querySelector(':scope > .flex-1 .exp-input');
                        expContainer.classList.remove('max-h-100');
                        expContainer.classList.add('max-h-0');

                        const input = expContainer.querySelector(':scope > input');

                        if (input) {
                            expContainer.removeChild(input);
                        }

                        exportExpiry.datepicker.clear();
                        newValues.exp = 0;

                        logExportEvt(500765, [0]);
                        exportExpiry.presetValue = false;
                    }
                );
                const pwd = createRow(
                    'link-pwd-toggle',
                    (row) => {
                        const parent = row.querySelector(':scope > .flex-1');
                        mCreateElement('p', { class: 'my-0' }, parent).textContent = l[17454];
                        mCreateElement(
                            'p',
                            { class: 'text-color-medium font-body-2 my-0' },
                            parent
                        ).textContent = l.link_pwd_txt;
                        mCreateElement(
                            'div',
                            { class: 'pwd-input max-h-0 mt-2 transition-max-h overflow-y-hidden w-full' },
                            parent
                        );
                    },
                    (row) => { // Checked
                        const pwdContainer = row.querySelector(':scope > .flex-1 > .pwd-input');
                        pwdContainer.classList.remove('max-h-0');
                        pwdContainer.classList.add('max-h-100');

                        const input = mCreateElement(
                            'input',
                            {
                                class: 'enter-pass no-title-top no-wrap-css'
                                    + ' pmText strengthChecker clearButton',
                                type: 'password',
                                placeholder: l.start_typing,
                                name: 'share-link-pwd',
                                value: ('pwd' in newValues)
                                    ? newValues.pwd
                                    : values.pwd || ''
                            },
                            pwdContainer
                        );

                        input.addEventListener('input', ({ target }) => {
                            newValues.pwd = String(target.value);
                        });

                        exportPassword.encrypt.init();
                        logExportEvt(500766, [1]);

                        const { component, classList } = decr.querySelector('.mega-toggle-button');
                        classList.add('opacity-50');
                        component.disabled = true;

                        if (!decr.nextSibling || decr.nextSibling.id !== 'decr-key-off') {
                            const keyOff = mCreateElement(
                                'div',
                                {
                                    id: 'decr-key-off',
                                    class: 'p-3 font-body-1 mb-4 mt-1 bg-banner-info rounded-xl'
                                }
                            );
                            keyOff.textContent = l.decr_key_off;

                            decr.insertAdjacentElement('afterend', keyOff);
                        }
                    },
                    (row) => { // Unchecked
                        const pwdContainer = row.querySelector(':scope > .flex-1 .pwd-input');
                        pwdContainer.classList.remove('max-h-100');
                        pwdContainer.classList.add('max-h-0');

                        const input = pwdContainer.querySelector(':scope > .mega-input');

                        if (input) {
                            pwdContainer.removeChild(input);
                        }

                        newValues.pwd = '';
                        logExportEvt(500766, [0]);

                        const { component, classList } = decr.querySelector('.mega-toggle-button');
                        const { nextSibling, parentNode } = decr;
                        classList.remove('opacity-50');
                        component.disabled = false;

                        if (nextSibling && nextSibling.id === 'decr-key-off') {
                            parentNode.removeChild(nextSibling);
                        }
                    }
                );

                const elements = [
                    decr,
                    mCreateElement('hr', { class: 'border-b border-t-none border-x-none' }),
                    exp,
                    pwd
                ];

                // 0 - no need, 1 - is_video, 2 - is_audio
                const needsEmbed = $.itemExport.length === 1 && M.d[$.itemExport[0]].fa
                    && is_video(M.d[$.itemExport[0]]) || 0;

                if (needsEmbed) {
                    const embedBtn = mCreateElement(
                        'div',
                        {
                            class: 'hoverable flex flex-row items-center py-3 px-4 transition-colors'
                                + ' rounded-xl cursor-pointer -mx-4'
                        },
                        [
                            mCreateElement('div', { class: 'flex-1' }, [
                                mCreateElement('p', { class: 'mt-0 mb-0 font-body-1' }),
                                mCreateElement('p', { class: 'font-body-2 text-color-medium my-0' })
                            ]),
                            mCreateElement(
                                'i',
                                { class: 'sprite-fm-mono icon-chevron-right-thin-outline icon-size-6 rtl-rot-180' }
                            )
                        ]
                    );

                    embedBtn.querySelector(':scope p:first-child').textContent = (needsEmbed === 1)
                        ? l.embed_video
                        : l.embed_audio;
                    embedBtn.querySelector(':scope p:nth-of-type(2)').textContent = (needsEmbed === 1)
                        ? l.embed_video_msg
                        : l.embed_audio_msg;

                    elements.push(
                        mCreateElement('hr', { class: 'border-b border-t-none border-x-none' }),
                        embedBtn
                    );

                    embedBtn.addEventListener('click', () => {
                        logExportEvt(needsEmbed === 1 ? 500771 : 500772);
                        ExportLink.settings.hide();
                        ExportLink.embed.show(needsEmbed);
                    });
                }

                return mCreateElement('div', null, elements);
            };

            const footer = mCreateElement('div', { class: 'flex flex-row' }, [
                mCreateElement('div', { class: 'flex-1' })
            ]);

            const removeBtn = new MegaButton({
                parentNode: footer.querySelector(':scope > .flex-1'),
                text: ($.itemExport.length === 1) ? l[6821] : l[8735],
                componentClassname: 'red text-icon underline-offset-4 font-600 slim no-px'
            }).on('click.remove', () => {
                ExportLink.settings.hide();
                removeLink('settings');
            });

            const backBtn = new MegaButton({
                parentNode: footer,
                text: l[822],
                componentClassname: 'mx-2 secondary slim',
                type: 'normal'
            }).on('click.settingsBack', () => {
                logExportEvt(500769);
                onBack();
            });

            const saveBtn = new MegaButton({
                parentNode: footer,
                text: l[19631],
                componentClassname: 'slim',
                type: 'button'
            }).on('click.save', async() => {
                let linkUpdated = false;

                if (Object.keys(newValues).length) {
                    const loadingClasses = [
                        'loading',
                        'sprite-fm-theme-after',
                        'icon-loader-throbber-light-outline-after',
                        'pointer-events-none',
                        'visible-txt'
                    ];

                    const stopLoading = () => {
                        removeBtn.disabled = false;
                        backBtn.disabled = false;
                        saveBtn.domNode.classList.remove(...loadingClasses);
                    };

                    if ('dec' in newValues) {
                        linkUpdated = true;
                        values.dec = newValues.dec;
                    }

                    removeBtn.disabled = true;
                    backBtn.disabled = true;
                    saveBtn.domNode.classList.add(...loadingClasses);

                    // Contains a backup of all the expiry dates for each node before we recreate links
                    let nodeExpiryTimestamps = [];
                    const { pwd } = newValues;
                    const hasNewPwd = typeof pwd === 'string';

                    if (hasNewPwd) {
                        nodeExpiryTimestamps = $.itemExport.map((h) => {
                            const node = M.d[h];
                            const { ets } = M.getNodeShare(node);

                            // If it has an expiry time, add it to the array
                            return ets && { n: node.h, ets };
                        }).filter(Boolean);

                        const pwdIsWeak = () => {
                            const { contentNode } = sheet;

                            if (!contentNode.querySelector('div#link-pwd-toggle').component.checked) {
                                return true;
                            }

                            const pwdStatus = contentNode.querySelector('.strengthChecker .password-status');
                            const { minPasswordLength } = security;

                            if (!pwdStatus) {
                                return false;
                            }
                            else if (pwd.length < minPasswordLength) {
                                pwdStatus.querySelector('.strength-text').textContent = l[9067];
                                pwdStatus.classList.add('weak', 'checked');
                                pwdStatus.querySelector('span.strength-icon')
                                    .classList.add('sprite-fm-mono', 'icon-alert-triangle-thin-outline');

                                return false;
                            }
                            else if (pwdStatus.classList.contains('weak')) {
                                pwdStatus.querySelector('.strength-text').textContent = l[9067];
                                return false;
                            }

                            return true;
                        };

                        if (!pwdIsWeak()) {
                            stopLoading();
                            return;
                        }

                        linkUpdated = true;

                        if (pwd !== values.pwd) {
                            // Security measure to drop the previous public access
                            await exportPassword.removeLinksAndReAdd($.itemExport);
                        }

                        if (pwd) {
                            const links = await exportPassword.encrypt.startEncryption(pwd);

                            if (!Array.isArray(links) || !links.length) {
                                return;
                            }

                            values.pwdArr = links;
                        }
                        else {
                            delete values.pwdArr;
                        }

                        values.pwd = pwd;
                    }

                    const hasNewExp = 'exp' in newValues;
                    if (hasNewExp || hasNewPwd) {
                        const promises = [];

                        if (hasNewExp) {
                            const ets = newValues.exp || null;
                            let i = $.itemExport.length;

                            while (--i >= 0) {
                                promises.push(api.screq({ a: 'l', n: $.itemExport[i], ets }));
                            }

                            values.exp = ets;
                        }
                        else if (hasNewPwd && nodeExpiryTimestamps.length) {
                            let i = nodeExpiryTimestamps.length;

                            while (--i >= 0) {
                                const { n, ets } = nodeExpiryTimestamps[i];
                                promises.push(api.screq({ a: 'l', n, ets }));
                            }
                        }

                        await Promise.all(promises);
                    }

                    stopLoading();

                    newValues = Object.create(null);
                }

                const counts = [0, 0];
                let i = $.itemExport.length;

                while (--i >= 0) {
                    counts[M.d[$.itemExport[i]].t]++;
                }

                logExportEvt(500768, counts);
                onBack(true, linkUpdated);
            });

            const options = {
                name,
                contents: [createContents()],
                showClose: true,
                header: l.link_settings,
                footer: {
                    slot: [footer]
                },
                onBack: () => {
                    logExportEvt(500770);
                    onBack();
                },
                onShow: () => {
                    if (
                        ('dec' in newValues && newValues.dec)
                        || (!('dec' in newValues) && values.dec)) {
                        sheet.contentNode.querySelector('#link-dec-toggle').component.setButtonState(true);
                    }

                    const exp = 'exp' in newValues && newValues.exp || !('exp' in newValues) && values.exp;
                    if (exp) {
                        exportExpiry.presetValue = exp;
                        sheet.contentNode.querySelector('#link-exp-toggle').component.setButtonState(true, true);
                    }
                    else if (timestamps.length) { // There are different expiration dates
                        sheet.contentNode.querySelector('#link-exp-toggle').component.setButtonState(true, true);
                    }

                    if ('pwd' in newValues && newValues.pwd || !('pwd' in newValues) && values.pwd) {
                        sheet.contentNode.querySelector('#link-pwd-toggle').component.setButtonState(true, true);
                    }
                },
                onClose: () => {
                    sheet.removeClass(name);
                    exportExpiry.presetValue = false;

                    if (Object.keys(newValues).length) {
                        ExportLink.settingsDiscard.show(
                            l.discard_and_exit,
                            l.discard_and_exit_msg,
                            () => {
                                ExportLink.settings.resetNewValues();
                                ExportLink.settingsDiscard.hide();
                            }
                        );
                    }
                }
            };

            sheet.show(options);
            sheet.addClass(options.name);
        };

        return {
            show,
            hide: () => {
                exportExpiry.presetValue = false;
                hideDialog(name);
            },
            updateExp: (ts) => { // Used in exportExpiry's onSelect
                newValues.exp = ts;
            },
            getNewValues: () => newValues,
            resetNewValues,
            resetValues: () => {
                values = null;
            }
        };
    });

    lazy(scope.mega.Dialog.ExportLink, 'remove', () => {
        const { ExportLink } = scope.mega.Dialog;
        const name = 'remove-link-dialog';

        const show = (handles, msg, removeFn, prevDialog) => {
            const { sheet } = mega.ui;
            handles = handles || $.itemExport;

            if (!Array.isArray(handles) || !handles.length) {
                return; // No nodes supplied to the dialog
            }

            let i = handles.length;

            const showPrevDialog = () => {
                if (prevDialog && ExportLink[prevDialog]) {
                    ExportLink[prevDialog].show();
                }

                sheet.removeClass(name);
            };

            // Use message about removal of 'items' for when both files and folders are selected
            let contents;

            if (msg) {
                contents = msg;
            }
            else {
                contents = l.remove_link_confirmation_mix_items;
                const counts = [0, 0]; // File count, Folder count

                // Determine number of files and folders so the dialog wording is correct
                while (--i >= 0) {
                    counts[M.d[handles[i]].t]++;
                }

                // Change message to folder/s or file/s depending on number of files and folders
                if (counts[0] === 0) {
                    contents = mega.icu.format(l.remove_link_confirmation_folders_only, counts[1]);
                }
                else if (counts[1] === 0) {
                    contents = mega.icu.format(l.remove_link_confirmation_files_only, counts[0]);
                }
            }

            const txt = mCreateElement('div');
            txt.className = 'text-left';
            txt.textContent = contents;

            const footerElements = [
                mCreateElement('div', { class: 'flex flex-row' }),
                mCreateElement('div', { class: 'flex flex-row-reverse' })
            ];

            const ch = new MegaCheckbox({
                parentNode: footerElements[0],
                componentClassname: 'mega-checkbox mb-4',
                checkboxName: 'nowarnpl-checkbox',
                labelTitle: l.do_not_show_again1,
                checked: false
            });

            ch.on('toggle', function() {
                mega.config.set('nowarnpl', !!this.checked | 0);
            });

            MegaButton.factory({
                parentNode: footerElements[1],
                type: 'normal',
                componentClassname: 'slim',
                text: l[83],
            }).on('click.removeLink', () => {
                ExportLink.remove.hide();
                removeFn();
            });

            MegaButton.factory({
                parentNode: footerElements[1],
                type: 'normal',
                text: l.dont_remove,
                componentClassname: 'secondary mx-2 slim'
            }).on('click.showSettings', () => {
                ExportLink.remove.hide();
                showPrevDialog();
            });

            const options = {
                name,
                contents: [txt],
                header: mega.icu.format(l.remove_link_question, handles.length),
                showClose: true,
                footer: {
                    slot: footerElements
                },
                onClose: () => {
                    sheet.removeClass(name);
                    showPrevDialog();
                }
            };

            sheet.show(options);
            sheet.addClass(options.name);
        };

        return { show, hide: hideDialog.bind(null, name) };
    });

    lazy(scope.mega.Dialog.ExportLink, 'settingsDiscard', () => {
        const { ExportLink } = scope.mega.Dialog;
        const name = 'link-settings-discard-dialog';

        const show = (header, contents, onProceed, onBack) => {
            const { sheet } = mega.ui;

            if (!onBack) {
                onBack = () => {
                    ExportLink.settingsDiscard.hide();
                    ExportLink.settings.show();
                };
            }

            const footer = mCreateElement('div', { class: 'flex flex-row-reverse' });

            MegaButton.factory({
                parentNode: footer,
                text: l.discard,
                componentClassname: 'slim',
                type: 'button'
            }).on('click.settingsDiscardProceed', onProceed);

            MegaButton.factory({
                parentNode: footer,
                text: l[82],
                componentClassname: 'mx-2 secondary slim',
                type: 'normal'
            }).on('click.settingsDiscardBack', onBack);

            const options = {
                name,
                contents,
                header,
                showClose: true,
                footer: {
                    slot: [footer]
                },
                onClose: () => {
                    sheet.removeClass(name);
                    onBack();
                }
            };

            sheet.show(options);
            sheet.addClass(options.name);
        };

        return { show, hide: hideDialog.bind(null, name) };
    });

    lazy(scope.mega.Dialog.ExportLink, 'embed', () => {
        const { ExportLink } = scope.mega.Dialog;
        const name = 'link-embed-dialog';

        const show = (mediaType) => {
            const { sheet, toast } = mega.ui;
            // 1 - Video, 2 - Audio
            const audio = typeof mediaType === 'number' ?
                mediaType === 2 :
                ($.itemExport.length === 1 && M.d[$.itemExport[0]].fa && is_video(M.d[$.itemExport[0]]) || 0) === 2;

            const setCode = () => {
                const n = M.d[$.itemExport[0]];
                const link = getBaseUrl() + '/embed/' + n.ph + '#' + a32_to_base64(n.k);

                const iframe = '<iframe width="%w" height="%h" frameborder="0" src="%s" allowfullscreen %a></iframe>\n';
                const { sheet } = mega.ui;
                const dialog = sheet.contentNode;

                let time = 0;
                let width = 0;
                let height = 0;
                let autoplay = false;
                let muted = false;
                let optionAdded = false;
                let copy = true;

                const getValue = (input) => {
                    var value = String(input.value || '').replace(/\.\d*$/g, '').replace(/\D/g, '');

                    return Math.min(Math.max(parseInt(value) || 0, input.getAttribute('min') | 0),
                                    parseInt(input.getAttribute('max')) || Number.MAX_SAFE_INTEGER) >>> 0;
                };

                if (audio) {
                    width = 711;
                    height = 144;
                    optionAdded = true;

                    const checkbox = dialog.querySelector('input#embed-allow-copy');
                    copy = !!checkbox && checkbox.checked;
                }
                else {
                    const startInput = dialog.querySelector('#embed-start-at input');

                    if (startInput) {
                        time = getValue(startInput);

                        if (time) {
                            optionAdded = true;
                        }

                        startInput.nextSibling.textContent = mega.icu.format(l.seconds_suffix, time);
                    }

                    const [w, h] = dialog.querySelectorAll('#embed-sizes input');

                    if (w && h) {
                        width = getValue(w);
                        height = getValue(h);
                    }

                    const autoplayCheckbox = dialog.querySelector('#embed-video-autoplay input');

                    if (autoplayCheckbox && autoplayCheckbox.checked) {
                        autoplay = true;
                        optionAdded = true;
                    }

                    const muteCheckbox = dialog.querySelector('#embed-video-mute input');

                    if (muteCheckbox && muteCheckbox.checked) {
                        muted = true;
                        optionAdded = true;
                    }
                }

                const composeCode = () => iframe
                    .replace('%w', width > 0 && height > 0 ? width : 640)
                    .replace('%h', width > 0 && height > 0 ? height : 360)
                    .replace('%s', link + (optionAdded ? '!' : '') + (time > 0 ? time + 's' : '') +
                        (autoplay ? '1a' : '') + (muted ? '1m' : '') + (audio ? '1v' : '') + (copy ? '' : '1c'))
                    .replace('%a', autoplay ? 'allow="autoplay;"' : '');

                sheet.contentNode.querySelector('textarea.embed-code').value = composeCode();
            };

            const onBack = () => {
                ExportLink.embed.hide();
                ExportLink.settings.show();
            };

            const createContents = () => {
                const node = M.d[$.itemExport[0]];
                const naming = mCreateElement(
                    'div',
                    { class: 'flex flex-row items-center font-body-1 mb-4' },
                    [
                        mCreateElement('i', { class: `item-type-icon icon-${fileIcon(node)}-24 icon-size-8` }),
                        mCreateElement('div', { class: 'flex-1 text-ellipsis px-2' })
                    ]
                );

                naming.querySelector(':scope > div.flex-1').textContent = node.name;

                const textBlock = mCreateElement(
                    'div',
                    { class: 'rounded-xl bg-surface-grey-1 relative' },
                    [
                        mCreateElement(
                            'textarea',
                            {
                                readonly: '',
                                class: 'embed-code box-border border-none bg-surface-grey-1 rounded-xl'
                                    + ' w-full py-2 pl-3 pr-8 font-body-1 h-28 text-color-high overflow-y-hidden'
                            }
                        )
                    ]
                );

                const componentClassname = 'transparent-icon text-icon copy-field secondary'
                    + ' absolute bottom-2 simpletip'
                    + (document.body.classList.contains('rtl') ? ' left-2' : ' right-2');

                MegaButton.factory({
                    parentNode: textBlock,
                    icon: 'sprite-fm-mono icon-copy-thin-outline icon-size-5',
                    componentClassname,
                    type: 'icon',
                    dataset: { simpletip: l[17408] }
                }).on('click.copyCode', () => {
                    copyToClipboard(textBlock.querySelector(':scope textarea').value);
                    toast.show(l.code_copied, 4);
                    logExportEvt(500773, [mediaType]);
                });

                const elements = [
                    naming,
                    textBlock,
                    mCreateElement('hr', { class: 'border-b border-t-none border-x-none my-4' })
                ];

                if (audio) {
                    const copyBlock = mCreateElement('div', { class: 'flex flex-row items-center' }, [
                        mCreateElement('div', { class: 'flex-1 font-body-1' }),
                        mCreateElement('div')
                    ]);

                    copyBlock.querySelector(':scope > div.flex-1').textContent = l.allow_copy_link;

                    MegaToggleButton.factory({
                        parentNode: copyBlock.querySelector(':scope > div:nth-of-type(2)'),
                        componentClassname: 'mega-toggle-button',
                        disabled: false,
                        value: 'embed-allow-copy',
                        id: 'embed-allow-copy',
                        checked: false,
                        role: 'switch',
                        onChange() {
                            setCode();
                            logExportEvt(500782, [this.checked & 1]);
                        }
                    });

                    elements.push(copyBlock);
                }
                else {
                    const { playtime } = MediaAttribute(node).data;
                    const startBlock = mCreateElement(
                        'div',
                        { class: 'flex flex-row items-center mb-4', id: 'embed-start-at' },
                        [
                            mCreateElement('div', { class: 'flex-1' }, [
                                mCreateElement('div', { class: 'font-body-1' }),
                                mCreateElement('div', { class: 'font-body-2 text-color-medium' })
                            ]),
                            mCreateElement(
                                'div',
                                {
                                    class: 'flex flex-row items-center border-1 rounded-xl p-2 w-40'
                                        + ' box-border focus-within-border-strong'
                                },
                                [
                                    mCreateElement(
                                        'input',
                                        {
                                            class: 'border-none rounded-xl w-12 font-body-2'
                                                + ' bg-inherit text-color-high flex-1',
                                            type: 'number',
                                            min: 0,
                                            max: playtime,
                                            value: 0
                                        }
                                    ),
                                    mCreateElement('span', { class: 'seconds-suffix font-body-2 text-color-medium' })
                                ]
                            )
                        ]
                    );

                    const input = startBlock.querySelector('input');
                    input.addEventListener('input', setCode.bind(null));
                    input.addEventListener('click', logExportEvt.bind(null, 500777));

                    startBlock.querySelector('span.seconds-suffix').textContent = mega.icu.format(l.seconds_suffix, 0);
                    startBlock.querySelector(':scope > .flex-1 > div:first-child').textContent = l[17822];
                    startBlock.querySelector(':scope > .flex-1 > div:nth-of-type(2)').textContent = l.total_vid_len
                        .replace('%1', secondsToTimeShort(playtime));

                    const min = 128;
                    const max = 9999;
                    const inputClass = 'border-1 rounded-xl p-2 flex-1 focus-border-strong'
                        + ' bg-inherit text-color-high';

                    const dimensionsBlock = mCreateElement(
                        'div',
                        { class: 'flex flex-row items-center mb-4', id: 'embed-sizes' },
                        [
                            mCreateElement('div', { class: 'flex-1 font-body-1' }),
                            mCreateElement(
                                'div',
                                { class: 'flex flex-row w-40 text-color-high font-body-2 items-center' },
                                [
                                    mCreateElement(
                                        'input',
                                        {
                                            class: inputClass,
                                            type: 'number',
                                            min,
                                            max,
                                            value: 640,
                                            'data-click-evt-id': 500778
                                        }
                                    ),
                                    mCreateElement('span', { class: 'x px-2' }),
                                    mCreateElement(
                                        'input',
                                        {
                                            class: inputClass,
                                            type: 'number',
                                            min,
                                            max,
                                            value: 360,
                                            'data-click-evt-id': 500779
                                        }
                                    )
                                ]
                            )
                        ]
                    );

                    dimensionsBlock.querySelectorAll('input').forEach((input) => {
                        input.addEventListener('input', setCode.bind(null));
                        input.addEventListener('click', logExportEvt.bind(null, parseInt(input.dataset.clickEvtId)));
                    });
                    dimensionsBlock.querySelector(':scope > div.flex-1').textContent = l[17823];
                    dimensionsBlock.querySelector(':scope span.x').textContent = String.fromCharCode(215);

                    const autoPlayBlock = mCreateElement('div', { class: 'flex flex-row items-center' }, [
                        mCreateElement('div', { class: 'font-body-1' }),
                        mCreateElement(
                            'i',
                            {
                                class: 'sprite-fm-mono icon-help-circle-thin-outline simpletip mx-1',
                                'data-simpletip': l[23718]
                            }
                        ),
                        mCreateElement('div', { class: 'flex-1' })
                    ]);

                    autoPlayBlock.querySelector(':scope > div:first-child').textContent = l[22188];

                    MegaToggleButton.factory({
                        parentNode: autoPlayBlock.querySelector(':scope > div.flex-1'),
                        componentClassname: 'mega-toggle-button',
                        disabled: false,
                        value: 'embed-video-autoplay',
                        id: 'embed-video-autoplay',
                        checked: false,
                        role: 'switch',
                        onChange() {
                            setCode();
                            logExportEvt(500780, [this.checked & 1]);
                        }
                    });

                    const muteBlock = mCreateElement('div', { class: 'flex flex-row items-center' }, [
                        mCreateElement('div', { class: 'flex-1 font-body-1' }),
                        mCreateElement('div')
                    ]);

                    muteBlock.querySelector(':scope > div.flex-1').textContent = l.embed_dlg_mute;

                    MegaToggleButton.factory({
                        parentNode: muteBlock.querySelector(':scope > div:nth-of-type(2)'),
                        componentClassname: 'mega-toggle-button',
                        disabled: false,
                        value: 'embed-video-mute',
                        id: 'embed-video-mute',
                        checked: false,
                        role: 'switch',
                        onChange() {
                            setCode();
                            logExportEvt(500781, [this.checked & 1]);
                        }
                    });

                    elements.push(
                        startBlock,
                        dimensionsBlock,
                        autoPlayBlock,
                        muteBlock
                    );
                }

                return mCreateElement('div', null, elements);
            };

            const footer = mCreateElement('div', { class: 'flex flex-row' }, [
                mCreateElement('div', { class: 'flex-1' })
            ]);

            MegaButton.factory({
                parentNode: footer.querySelector(':scope > .flex-1'),
                text: ($.itemExport.length === 1) ? l[6821] : l[8735],
                componentClassname: 'red text-icon underline-offset-4 font-600 slim no-px'
            }).on('click.remove', () => {
                ExportLink.embed.hide();
                removeLink('embed');
            });

            MegaButton.factory({
                parentNode: footer,
                text: l[822],
                componentClassname: 'mx-2 secondary slim',
                type: 'normal'
            }).on('click.settingsBack', () => {
                logExportEvt(500775);
                onBack();
            });

            MegaButton.factory({
                parentNode: footer,
                text: l[17408],
                componentClassname: 'slim',
                type: 'button'
            }).on('click.copy', () => {
                copyToClipboard(sheet.contentNode.querySelector('textarea.embed-code').value);
                toast.show(l.code_copied, 4);
                logExportEvt(500774, [mediaType]);
            });

            const options = {
                name,
                contents: [createContents()],
                header: (audio) ? l.embed_audio : l.embed_video,
                showClose: true,
                footer: {
                    slot: [footer],
                },
                onBack: () => {
                    logExportEvt(500776);
                    onBack();
                },
                onShow: setCode.bind(null),
                onClose: () => {
                    sheet.removeClass(name);

                    if (!Object.keys(ExportLink.settings.getNewValues()).length) {
                        return;
                    }

                    ExportLink.settingsDiscard.show(
                        l.discard_and_exit,
                        l.discard_and_exit_msg,
                        () => {
                            ExportLink.settings.resetNewValues();
                            ExportLink.settingsDiscard.hide();
                        },
                        () => {
                            ExportLink.settingsDiscard.hide();
                            ExportLink.embed.show(mediaType);
                        }
                    );
                }
            };

            sheet.show(options);
            sheet.addClass(options.name);
        };

        return { show, hide: hideDialog.bind(null, name) };
    });
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
        self.nodesNeedCopy = 0;
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
            return exportLinkDialog.linksDialog(false, { createdCount: 0 });
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

        this.nodesNeedCopy++;

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
            const n = M.getNodeByHandle(nodeId);

            this.logger.warn('share-link progress...', this.nodesLeft, handle);

            if (!n.ph) {
                if (self.d) {
                    this.logger.error(`public-node '${handle}' lost for ${nodeId} ?! restoring...`, mega.infinity, n);
                }
                if (n && handle) {
                    n.ph = handle;
                    M.nodeUpdated(n);
                }
            }

            if (!--this.nodesLeft) {
                if (this.options.showExportLinkDialog) {
                    var exportLinkDialog = new mega.Dialog.ExportLink();
                    exportLinkDialog.linksDialog(false, { createdCount: this.nodesNeedCopy });
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

        this.nodesNeedCopy++;

        // If the Expiry Timestamp (ets) is already set locally, resend in the request or it gets removed
        if (share.ets) {
            request.ets = share.ets;
        }

        return api.screq(request)
            .then(({handle, result}) => done(handle || result))
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

        const openGetLinkDialog = openFn || (async() => {
            if (($.itemExport.length > 1 || !M.getNodeShare($.itemExport[0]))
                && await mega.sensitives.passShareCheck($.itemExport).catch(echo) !== mega.sensitives.SAFE_TO_SHARE) {
                return;
            }

            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': true,
                'updateUI': true,
                'nodesToProcess': nodesToProcess
            });

            mLoadingSpinner.show(
                'get-link-loading-toast',
                nodesToProcess.length === 1 ? l.generating_link : l.generating_links
            );

            exportLink.getExportLink().finally(() => {
                mLoadingSpinner.hide('get-link-loading-toast');
            });
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
    scope.mega.ui = scope.mega.UI || {};
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

            if (M.getNodeByHandle(nodeId).sen) {
                mega.sensitives.toggleStatus(nodeId, false);
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

            $('#' + nodeId).attr('title', titleTooltip);
        }
        else {// Item is file

            titleTooltip = l[7704];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + M.getUndecryptedLabel(M.d[nodeId]);
            }

            $('#' + nodeId).attr('title', titleTooltip);
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

        // Update node component
        MegaNodeComponent.getNodeComponentByHandle(nodeId).update();
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.UI = scope.mega.UI || {};
    scope.mega.UI.Share = scope.mega.UI.Share || {};
    scope.mega.UI.Share.ExportLink = UiExportLink;
})(jQuery, window);

/** Export Link as string **/
lazy(mega, 'getPublicNodeExportLink', () => {
    'use strict';

    return (node) => {

        let fileUrlWithoutKey;
        let type;

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
});
