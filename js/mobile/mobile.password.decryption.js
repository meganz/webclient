/**
 * Let the user enter a password to decrypt the real folder/file link and access the contents
 */
mobile.passwordDecryption = {
    /**
     * Initialise and show the password decryption page
     */
    show() {
        'use strict';

        // neccessary when navigation between fm and folderlink happens
        this.reset();

        this.pwdDecryption = document.getElementById('mobile-decryption-password');

        if (!this.pwdDecryption) {
            this.pwdDecryption = document.createElement('div');
            this.pwdDecryption.id = 'mobile-decryption-password';
            this.pwdDecryption.className = 'file-folder-view';

            const title = document.createElement('h2');
            title.textContent = l[9070];

            const subNode = document.createElement('div');
            subNode.className = 'decryption-msg';
            subNode.textContent = `${l[9071]} ${l[9072]}`;

            const dKeyInput = document.createElement('input');
            dKeyInput.type = 'password';
            dKeyInput.id = 'decryption_pwd';
            dKeyInput.className = 'underlinedText clearButton with-icon mobile decryption-password';
            dKeyInput.title = l[909];

            this.pwdDecryption.append(title, subNode, dKeyInput);

            this.passwordInput = new mega.ui.MegaInputs($(dKeyInput));
            this.passwordInput.$wrapper.addClass('box-style fixed-width mobile');

            const dButton = new MegaMobileButton({
                type: 'normal',
                text: l[1027],
                parentNode: this.pwdDecryption,
                componentClassname: 'mobile decrypt-button',
                disabled: true
            });

            document.getElementById('startholder').append(this.pwdDecryption);

            // Initialise the Decrypt button
            this.initDecryptButton(dButton, dKeyInput);
        }
    },

    /**
     * Initialise the Decrypt button
     * @param {HTMLElement} dButton Button component to decrypt the key
     * @param {HTMLElement} dKeyInput Ipnut element to enter the decryption key
     */
    initDecryptButton(dButton, dKeyInput) {
        'use strict';

        const _action = () => {

            dKeyInput.blur();

            // is this a subuser invitation link
            if (page.startsWith('businesssignup')) {
                mobile.passwordDecryption.decryptBSubuserInvitationLink(page);
            }
            else { // it's a password protected link (file/folder)
                // Decrypt the link
                mobile.passwordDecryption.decryptLink(page);
            }

            return false;
        };

        dButton.on('tap.pwd', _action);

        this.passwordInput.$input.rebind('input keypress', e => {
            if (this.passwordInput.$input.val()) {
                dButton.disabled = false;
                if (e.keyCode === 13) {
                    _action();
                }
            }
            else {
                dButton.disabled = true;
            }
        });
    },

    /**
     * Decrypts the invitation link and redirects if successful
     * @param {String} link sub-user invitation link
     */
    decryptBSubuserInvitationLink(link) {
        'use strict';

        link = page.substring(14, link.length);
        var enteredPassword = this.passwordInput.$input.val();

        if (!enteredPassword.length) {
            return false;
        }
        else {
            M.require('businessAcc_js').done(() => {

                var business = new BusinessAccount();
                var failureAction = (st, res, desc) => {
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

                    getInfoPromise.done((status, res) => {
                        this.pwdDecryption.classList.add('hidden');
                        if (d) {
                            console.log(res);
                        }
                        if (!res.e || !res.firstname || !res.bpubk || !res.bu) {
                            failureAction(1, res, 'uv2 not complete response');
                        }
                        else {
                            mega.ui.header.hide();
                            if (u_type === false) {
                                parsepage(pages.mobile);

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
    decryptLink(page) {
        'use strict';

        // Get the password and the encoded information in the URL
        var password = this.passwordInput.$input.val();

        // If no password given show an error message
        if (!password) {
            return false;
        }

        var urlEncodedInfo = page.replace('P!', '');
        var decodedBytes = null;

        // Decode the request
        try {
            decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
        }
        catch (exception) {
            // Show error and abort
            this.showError(l[9068]); // The link could not be decoded...
            return false;
        }

        // Get the algorithm used
        var algorithm = decodedBytes[0];

        // Check if valid array index or will throw an exception
        if (typeof exportPassword.algorithms[algorithm] === 'undefined') {
            // Show error and abort
            this.showError(l[9069]); // The algorithm ... is not supported
            return false;
        }

        // Get the salt bytes, start offset at 8 (1 byte for alg + 1 byte for file/folder + 6 for handle)
        var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
        var saltStartOffset = 8;
        var saltEndOffset = saltStartOffset + saltLength;
        var saltBytes = decodedBytes.subarray(saltStartOffset, saltEndOffset);

        // Compute the PBKDF
        exportPassword.deriveKey(algorithm, saltBytes, password, (derivedKeyBytes) => {

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
                this.showError(l[9076]); // The link could not be decrypted...
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

            // Add a log to see if the feature is used often
            api_req({ a: 'log', e: 99633, m: 'Successfully decrypted password protected link on mobile web' });

            // On success, redirect to actual file/folder link
            loadSubPage(url);
        });
    },

    showError(errorText) {
        'use strict';

        this.passwordInput.showError(`<i class="alert sprite-mobile-fm-mono
            icon-alert-triangle-thin-outline"></i>${escapeHTML(errorText)}`);
    },

    reset() {
        'use strict';

        folderlink = 1; // Trigger FM load home.
        M.currentdirid = undefined;

        MegaMobileHeader.init(true);
    }
};
