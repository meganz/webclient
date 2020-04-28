/**
 * An overlay to let the user enter a password to decrypt the real folder/file link and access the contents
 */
mobile.decryptionPasswordOverlay = {

    /** Cached jQuery selector */
    $overlay: null,

    /**
     * Initialise and show the overlay
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1, or subuser invitation link
     */
    show: function(page) {

        'use strict';

        // Cache some selectors which are re-used later
        this.$overlay = $('#mobile-password-decryption-overlay');

        // Initialise the Decrypt button
        this.initDecryptButton(page);

        // Show the overlay
        this.$overlay.removeClass('hidden');
    },

    /**
     * Initialise the Decrypt button
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1...
     */
    initDecryptButton: function(page) {

        'use strict';

        // Add click/tap handler
        this.$overlay.find('.decrypt-button').off('tap').on('tap', function() {

            // is this a subuser invitation link
            if (page.substr(0, 14) === 'businesssignup') {
                mobile.decryptionPasswordOverlay.decryptBusinessSubuserInvitationLink(page);
            }
            else { // it's a password protected link (file/folder)
                // Decrypt the link
                mobile.decryptionPasswordOverlay.decryptLink(page);
            }
            return false;
        });
    },

    /**
     * Decrypts the invitation link and redirects if successful
     * @param {String} link sub-user invitation link
     */
    decryptBusinessSubuserInvitationLink: function (link) {
        'use strict';

        var mySelf = this;
        link = page.substring(14, link.length);
        var $errorMessage = this.$overlay.find('.error-message');
        var $password = this.$overlay.find('.decryption-password');
        var $decryptButton = this.$overlay.find('.decrypt-button');

        // View animation and change text
        $decryptButton.addClass('decrypting');

        // similar to decryptLink function below,
        if (is_ios) {
            $decryptButton.addClass('ios').text(l[8579] + '...');   // Decrypting
        }

        var enteredPassword = $password.val();
        if (!enteredPassword.length) {
            $errorMessage.addClass('bold').text(l[970]);  // Please enter a valid password...
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }
        else {
            M.require('businessAcc_js').done(function () {

                var business = new BusinessAccount();
                var failureAction = function (st, res, desc) {
                    mySelf.$overlay.addClass('hidden');
                    var msg = l[17920]; // not valid password
                    if (res) {
                        msg = l[19567]; // not valid link 19567
                        console.error(st, res, desc);
                    }
                    msgDialog('warninga', '', msg, '', function () {
                        loadSubPage('start');
                    });
                };

                var decryptedTokenBase64 = business.decryptSubAccountInvitationLink(link, enteredPassword);

                if (decryptedTokenBase64) {
                    var getInfoPromise = business.getSignupCodeInfo(decryptedTokenBase64);

                    getInfoPromise.fail(failureAction);

                    getInfoPromise.done(function signupCodeGettingSuccessHandler(status, res) {
                        mySelf.$overlay.addClass('hidden');
                        if (localStorage.d) {
                            console.log(res);
                        }
                        if (!res.e || !res.firstname || !res.bpubk || !res.bu) {
                            failureAction(1, res, 'uv2 not complete response');
                        }
                        else {
                            if (u_type === false) {
                                res.signupcode = decryptedTokenBase64;
                                localStorage.businessSubAc = JSON.stringify(res);
                                mobile.register.show(res);
                            }
                            else {
                                var msgTxt = l[18795];
                                // 'You are currently logged in. ' +
                                //  'Would you like to log out and proceed with business account registration ? ';
                                // closeDialog();
                                msgDialog('confirmation', l[968], msgTxt, '', function (e) {
                                    if (e) {
                                        mLogout();
                                    }
                                    else {
                                        loadSubPage('');
                                    }
                                });
                            }
                        }
                    });

                }
                else {
                    failureAction();
                }
            });
        }
    },

    /**
     * Decrypts the link into a regular folder/file link and redirects to that if successful
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1...
     */
    decryptLink: function(page) {

        'use strict';

        var $decryptButton = this.$overlay.find('.decrypt-button');
        var $password = this.$overlay.find('.decryption-password');
        var $errorMessage = this.$overlay.find('.error-message');

        // Show encryption loading animation and change text to 'Decrypting'
        $decryptButton.addClass('decrypting');

        // Add an extra class for iOS to just change to 'Decrypting...' text because it likely doesn't support the
        // native crypto API functions for PBKDF2 and needs to use asmCrypto which performs slower, blocking the UI
        if (is_ios) {
            $decryptButton.addClass('ios').text(l[8579] + '...');   // Decrypting
        }

        // Get the password and the encoded information in the URL
        var password = $password.val();
        var urlEncodedInfo = page.replace('P!', '');
        var decodedBytes = null;

        // If no password given show an error message
        if (!password) {
            $errorMessage.addClass('bold').text(l[970]);  // Please enter a valid password...
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Decode the request
        try {
            decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
        }
        catch (exception) {

            // Show error and abort
            $errorMessage.addClass('bold').text(l[9068]);  // The link could not be decoded...
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Get the algorithm used
        var algorithm = decodedBytes[0];

        // Check if valid array index or will throw an exception
        if (typeof exportPassword.algorithms[algorithm] === 'undefined') {

            // Show error and abort
            $errorMessage.addClass('bold').text(l[9069]);  // The algorithm ... is not supported
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Get the salt bytes, start offset at 8 (1 byte for alg + 1 byte for file/folder + 6 for handle)
        var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
        var saltStartOffset = 8;
        var saltEndOffset = saltStartOffset + saltLength;
        var saltBytes = decodedBytes.subarray(saltStartOffset, saltEndOffset);

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
            var macBytes = null;

            // If the link was created with an old algorithm (1) which used parameter order: HMAC(password, data)
            if (algorithm === 1) {
                macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToVerifyBytes);
            }
            else {
                // Otherwise for newer links (algorithm >= 2) use the correct parameter order: HMAC(data, password)
                macBytes = asmCrypto[macAlgorithm].bytes(dataToVerifyBytes, macKeyBytes);
            }

            // Convert the string to hex for simple string comparison
            var macString = asmCrypto.bytes_to_hex(macBytes);
            var macToVerifyString = asmCrypto.bytes_to_hex(macToVerifyBytes);

            // Compare the MAC in the URL to the computed MAC
            if (macString !== macToVerifyString) {

                // Show error and abort
                $errorMessage.addClass('bold').text(l[9076]);  // The link could not be decrypted...
                $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
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
            var folderIdentifier = linkType === exportPassword.LINK_TYPE_FOLDER ? 'F' : '';
            var url = folderIdentifier + '!' + handleUrlEncoded + '!' + decryptedKeyUrlEncoded;

            // Show completed briefly before redirecting
            $decryptButton.removeClass('decrypting ios').text(l[9077]); // Decrypted

            // Clear password field
            $password.val('');

            // Add a log to see if the feature is used often
            api_req({ a: 'log', e: 99633, m: 'Successfully decrypted password protected link on mobile web' });

            // On success, redirect to actual file/folder link
            loadSubPage(url);
        });
    }
};
