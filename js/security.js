/**
 * General common functionality for the new secure Registration and Login process including an
 * improved Password Processing Function (PPF) now with PBKDF2-HMAC-SHA512, a per user salt and 100,000 iterations.
 */
var security = {

    /** Minimum password length across the app for registration and password changes */
    minPasswordLength: 8,

    /**
     * Minimum password score across the app for registration and password changes. The score is calculated
     * using the score from the ZXCVBN library and the range is from 0 - 4 (very weak, weak, medium, good, strong)
     */
    minPasswordScore: 1,

    /** The number of iterations for the PPF (1-2 secs computation time) */
    numOfIterations: 100000,

    /** The length of the salt in bits */
    saltLengthInBits: 128,          // 16 Bytes

    /** The desired length of the derived key from the PPF in bits */
    derivedKeyLengthInBits: 256,    // 32 Bytes

    /**
     * Checks if the password is valid and meets minimum strength requirements
     * @param {String} password The user's password
     * @param {String} confirmPassword The second password the user typed again as a confirmation to avoid typos
     * @returns {true|String} Returns true if the password is valid, or the error message if not valid
     */
    isValidPassword: function(password, confirmPassword) {

        'use strict';
        // Check for a password
        if (!password) {
            return l.err_no_pass;   // Enter a password
        }
        // Check if the passwords are not the same
        if (password !== confirmPassword) {
            return l[9066];         // Passwords don't match. Check and try again.
        }

        // Check if there is whitespace at the start or end of the password
        if (password !== password.trim()) {
            return l[19855];        // Whitespace at the start or end of the password is not permitted.
        }

        // Check for minimum password length
        if (password.length < security.minPasswordLength) {
            return l[18701];        // Your password needs to be at least x characters long.
        }

        // Check that the estimator library is initialised
        if (typeof zxcvbn === 'undefined') {
            return l[1115] + ' ' + l[1116];     // The password strength verifier is still initializing.
        }                                       // Please try again in a few seconds.

        // Check for minimum password strength score from ZXCVBN library
        if ((zxcvbn(password).score < security.minPasswordScore)) {
            // Your password needs to be stronger.
            // Make it longer, add special characters or use uppercase and lowercase letters.
            return l[1104];
        }

        return true;
    },

    /**
     * Converts a UTF-8 string to a byte array
     * @param {String} string A string of any character including UTF-8 chars e.g. password123
     * @returns {Uint8Array} Returns a byte array
     */
    stringToByteArray: function(string) {

        'use strict';

        return new TextEncoder('utf-8').encode(string);
    },

    /**
     * A wrapper function to create the Client Random Value, Encrypted Master Key and Hashed Authentication Key.
     * These values are needed for when registering, changing the user's password, recovering with Master Key and
     * for parking the user's account.
     * @param {String} password The password from the user
     * @param {Array} masterKeyArray32 The unencrypted Master Key
     * @returns {Promise<Object>} will pass
     *                                    the clientRandomValueBytes, encryptedMasterKeyArray32,
     *                                    hashedAuthenticationKeyBytes
     *                                    and derivedAuthenticationKeyBytes as the parameters
     */
    deriveKeysFromPassword: async function(password, masterKeyArray32) {
        'use strict';

        // Create the 128 bit (16 byte) Client Random Value and Salt
        var saltLengthInBytes = security.saltLengthInBits / 8;
        var clientRandomValueBytes = crypto.getRandomValues(new Uint8Array(saltLengthInBytes));
        var saltBytes = security.createSalt(clientRandomValueBytes);

        // Trim the password and convert it from ASCII/UTF-8 to a byte array
        var passwordTrimmed = $.trim(password);
        var passwordBytes = security.stringToByteArray(passwordTrimmed);

        // The number of iterations for the PPF and desired length in bits of the derived key
        var iterations = security.numOfIterations;
        var derivedKeyLength = security.derivedKeyLengthInBits;

        // Run the PPF
        const derivedKeyBytes = await security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength);

        // Get the first 16 bytes as the Encryption Key and the next 16 bytes as the Authentication Key
        const derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);
        const derivedAuthenticationKeyBytes = derivedKeyBytes.subarray(16, 32);

        // Get a hash of the Authentication Key which the API will use for authentication at login time
        let hashedAuthenticationKeyBytes = asmCrypto.SHA256.bytes(derivedAuthenticationKeyBytes);

        // Keep only the first 128 bits (16 bytes) of the Hashed Authentication Key
        hashedAuthenticationKeyBytes = hashedAuthenticationKeyBytes.subarray(0, 16);

        // Convert the Derived Encryption Key to a big endian array of 32 bytes, then encrypt the Master Key
        const derivedEncryptionKeyArray32 = base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));
        const cipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);
        const encryptedMasterKeyArray32 = encrypt_key(cipherObject, masterKeyArray32);

        // Pass the Client Random Value, Encrypted Master Key and Hashed Authentication Key to the calling function
        return {
            clientRandomValueBytes,
            encryptedMasterKeyArray32,
            hashedAuthenticationKeyBytes,
            derivedAuthenticationKeyBytes
        };
    },

    /**
     * Creates a 128 bit Client Random Value and then derives the Salt from that.
     * The salt is created from SHA-256('mega.nz' || 'Padding' || Client Random Value)
     * @param {Uint8Array} clientRandomValueBytes The Client Random Value from which the salt will be constructed
     * @returns {Uint8Array} Returns the 256 bit (32 bytes) salt as a byte array
     */
    createSalt: function(clientRandomValueBytes) {

        'use strict';

        var saltString = 'mega.nz';
        var saltStringMaxLength = 200;  // 200 chars for 'mega.nz' + padding
        var saltHashInputLength = saltStringMaxLength + clientRandomValueBytes.length;  // 216 bytes

        // Pad the salt string to 200 chars with the letter P
        for (var i = saltString.length; i < saltStringMaxLength; i++) {
            saltString += 'P';
        }

        // Cronvert the salt to a byte array
        var saltStringBytes = security.stringToByteArray(saltString);

        // Concatenate the Client Random Value bytes to the end of the salt string bytes
        var saltInputBytesConcatenated = new Uint8Array(saltHashInputLength);
        saltInputBytesConcatenated.set(saltStringBytes);
        saltInputBytesConcatenated.set(clientRandomValueBytes, saltStringMaxLength);

        // Hash the bytes to create the salt
        var saltBytes = asmCrypto.SHA256.bytes(saltInputBytesConcatenated);

        // Return the salt which is needed for the PPF
        return saltBytes;
    },

    /**
     * Fetch the user's salt from the API
     * @param {String} email The user's email address
     */
    fetchAccountVersionAndSalt: async function(email) {
        'use strict';
        const {result: {s, v}} = await api.req({a: 'us0', user: email});

        return {version: v, salt: v > 1 ? s : null};
    },

    /**
     * A wrapper function used for deriving a key from a password
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     */
    deriveKey: async function(saltBytes, passwordBytes, iterations, derivedKeyLength) {
        'use strict';

        // If Web Crypto method supported, use that as it's nearly as fast as native
        if (window.crypto && window.crypto.subtle && !is_microsoft) {
            return security.deriveKeyWithWebCrypto(saltBytes, passwordBytes, iterations, derivedKeyLength);
        }

        // Otherwise, use asmCrypto which is the next fastest
        return security.deriveKeyWithAsmCrypto(saltBytes, passwordBytes, iterations, derivedKeyLength);
    },

    /**
     * Derive the key using the Web Crypto API
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     */
    deriveKeyWithWebCrypto: async function(saltBytes, passwordBytes, iterations, derivedKeyLength) {
        'use strict';

        // Import the password as the key
        return crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits'])
            .then((key) => {

                // Required PBKDF2 parameters
                var params = {
                    name: 'PBKDF2',
                    hash: 'SHA-512',
                    salt: saltBytes,
                    iterations: iterations
                };

                // Derive bits using the algorithm
                return crypto.subtle.deriveBits(params, key, derivedKeyLength);
            })
            .then((derivedKeyArrayBuffer) => {

                // Convert to a byte array
                // Pass the derived key to the callback
                return new Uint8Array(derivedKeyArrayBuffer);
            });
    },

    /**
     * Derive the key using asmCrypto
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     */
    deriveKeyWithAsmCrypto: async function(saltBytes, passwordBytes, iterations, derivedKeyLength) {
        'use strict';

        // Convert the desired derived key length to bytes and derive the key
        var keyLengthBytes = derivedKeyLength / 8;

        // Pass the derived key to the callback
        return asmCrypto.PBKDF2_HMAC_SHA512.bytes(passwordBytes, saltBytes, iterations, keyLengthBytes);
    },

    /**
     * A helper function for the check password feature (used when changing email or checking if they can remember).
     * This function will only pass the Derived Encryption Key to the completion callback.
     * @param {String} password The password from the user
     * @param {String} [saltBase64] Account Authentication Salt, if applicable
     * @returns {Promise} derivedEncryptionKeyArray32
     */
    getDerivedEncryptionKey: async function(password, saltBase64) {
        'use strict';

        saltBase64 = saltBase64 === undefined ? u_attr && u_attr.aas || '' : saltBase64;
        if (!saltBase64) {
            return prepare_key_pw(password);
        }

        // Convert the salt and password to byte arrays
        var saltArrayBuffer = base64_to_ab(saltBase64);
        var saltBytes = new Uint8Array(saltArrayBuffer);
        var passwordBytes = security.stringToByteArray(password);

        // The number of iterations for the PPF and desired length in bits of the derived key
        var iterations = security.numOfIterations;
        var derivedKeyLength = security.derivedKeyLengthInBits;

        // Run the PPF
        const derivedKeyBytes = await security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength);

        // Get the first 16 bytes as the Encryption Key
        const derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);

        // Convert the Derived Encryption Key to a big endian array of 32 bit values for decrypting the Master Key
        // Pass only the Derived Encryption Key back to the callback
        return base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));
    },

    /**
     * Complete the Park Account process
     * @param {String} recoveryCode The recovery code from the email
     * @param {String} recoveryEmail The email address that is being recovered
     * @param {String} newPassword The new password for the account
     * @param {Function} completeCallback The function to run when the callback completes
     */
    resetUser: function(recoveryCode, recoveryEmail, newPassword, completeCallback) {

        'use strict';

        // Fetch the user's account version
        security.fetchAccountVersionAndSalt(recoveryEmail).then(({version}) => {

            // If using the new registration method (v2)
            if (version === 2) {

                // Create fresh Master Key
                api_create_u_k();

                // Derive keys from the new password
                security.deriveKeysFromPassword(newPassword, u_k)
                    .then(({clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes}) => {

                        // Convert Master Key, Hashed Authentication Key and Client Random Value to Base64
                        var encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
                        var hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);
                        var clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);

                        // Create some random bytes to send to the API. This is not actually needed for the new v2 Park
                        // Account process. It was only used for old style registrations at confirmation time, which
                        // checked the password was correct locally by decrypting a known value and checking that
                        // value. ToDo: API team to remove need for the 'z' property in the 'erx' API request.
                        var ssc = Array(8);
                        for (var i = 8; i--;) {
                            ssc[i] = rand(0x100000000);
                        }
                        var sscString = a32_to_str(ssc);
                        var base64data = base64urlencode(sscString);

                        // Run API request to park the account and start a new one under the same email
                        api_req({
                            a: 'erx',
                            c: recoveryCode,
                            x: encryptedMasterKeyBase64,
                            y: {
                                crv: clientRandomValueBase64,
                                hak: hashedAuthenticationKeyBase64
                            },
                            z: base64data
                        },
                        { callback: completeCallback });
                    }
                );
            }
            else {
                // Otherwise use the old reset/park method
                api_resetuser({ callback: completeCallback }, recoveryCode, recoveryEmail, newPassword);
            }
        });
    },

    /**
     * Perform the Master Key re-encryption with a new password. If the password is passed to the function as null,
     * then the function will just check the validity of the recovery code. The next step in the flow is for the user
     * to change their password which will then call this function again with all the parameters.
     *
     * @param {String} recoveryCode The recovery code from the email
     * @param {Array} masterKeyArray32 The Master/Recovery Key entered by the user
     * @param {String} recoveryEmail The email address that is being recovered
     * @param {String} [newPassword] The new password for the account (optional)
     */
    async resetKey(recoveryCode, masterKeyArray32, recoveryEmail, newPassword) {
        'use strict';
        const messages = freeze({
            [EKEY]: l[1978],
            [ENOENT]: l[1967],
            [EBLOCKED]: l[1980],
            [EEXPIRED]: l[1967],
        });

        loadingDialog.show();

        // Complete the reset of the user's password using the Master Key provided
        return this.performKeyReset(recoveryCode, masterKeyArray32, recoveryEmail, newPassword)
            .then((res) => {
                assert(res === 0);
                return res;
            })
            .catch((ex) => {
                console.warn(ex);
                if (String(ex).includes('invalid aes key size')) {
                    ex = EKEY;
                }
                const msg = String(messages[ex] || (ex < 0 ? api_strerror(ex) : ex));

                if (newPassword && msg.includes(l[1978])) {
                    $('.recover-block.error').removeClass('hidden');
                }

                throw msg;
            })
            .finally(() => {
                loadingDialog.hide();
            });
    },

    /**
     * Complete the reset of the user's password using the Master Key provided by the user
     * @param {String} recoveryCode The recovery code from the email
     * @param {Array} masterKeyArray32 The Master/Recovery Key entered by the user
     * @param {String} recoveryEmail The email address that is being recovered
     * @param {String} [newPassword] The new password for the account (optional)
     */
    async performKeyReset(recoveryCode, masterKeyArray32, recoveryEmail, newPassword) {
        'use strict';

        // Fetch the user's account version
        const [result, {version}] = await Promise.all([
            api.send({a: 'erx', r: 'gk', c: recoveryCode}),
            security.fetchAccountVersionAndSalt(recoveryEmail)
        ]);

        // If the private RSA key was returned
        assert(typeof result === 'string' && version > 0);

        // Decrypt the private RSA key.
        const privateRsaKeyArray32 = base64_to_a32(result);
        const cipher = new sjcl.cipher.aes(masterKeyArray32);

        let privateRsaKeyStr = a32_to_str(decrypt_key(cipher, privateRsaKeyArray32));
        let i = 0;

        // Verify the integrity of the decrypted private key
        while (i++ < 4) {
            const l = (privateRsaKeyStr.charCodeAt(0) * 256 + privateRsaKeyStr.charCodeAt(1) + 7 >> 3) + 2;

            if (privateRsaKeyStr.substr(0, l).length < 2) {
                break;
            }
            privateRsaKeyStr = privateRsaKeyStr.substr(l);
        }

        // If invalid, EKEY error.
        assert(i === 5 && privateRsaKeyStr.length < 16, l[1978]);

        if (newPassword) {
            const payload = {a: 'erx', r: 'sk', c: recoveryCode};

            if (version > 1) {
                // Derive keys from the new password
                const {
                    clientRandomValueBytes,
                    encryptedMasterKeyArray32,
                    hashedAuthenticationKeyBytes
                } = await security.deriveKeysFromPassword(newPassword, masterKeyArray32);

                // Convert Master Key, Hashed Authentication Key and Client Random Value to Base64
                const clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);
                const encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
                const hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);

                payload.x = encryptedMasterKeyBase64;
                payload.y = {
                    crv: clientRandomValueBase64,
                    hak: hashedAuthenticationKeyBase64
                };
            }
            else {
                const aes = new sjcl.cipher.aes(prepare_key_pw(newPassword));

                payload.y = stringhash(recoveryEmail.toLowerCase(), aes);
                payload.x = a32_to_base64(encrypt_key(aes, masterKeyArray32));
            }

            // Run API request to park the account and start a new one under the same email
            return api.send(payload);
        }

        return 0;
    },

    /**
     * Verify if a given password is the user's password.
     * e.g., If everything is correct, we attempt to verify the email.
     * @param {String} pwd user-entered password
     * @returns {Promise<Boolean>}
     */
    async verifyUserPassword(pwd) {
        'use strict';
        const {u = false} = await M.getAccountDetails();

        assert(u.length === 11 && window.u_attr && u_attr.u === u, l[19]);

        return security.getDerivedEncryptionKey(pwd);
    },

    /**
     * Check whether the provided password is valid to decrypt a key.
     * @param {String|*} aPassword The password to test against.
     * @param {String|*} aMasterKey The encrypted master key.
     * @param {String|*} aPrivateKey The encrypted private key.
     * @param {String|*} [aSalt] Account authentication salt, if applicable.
     * @returns {Boolean|*} whether it succeed.
     */
    verifyPassword: promisify(function(resolve, reject, aPassword, aMasterKey, aPrivateKey, aSalt) {
        'use strict';

        if (typeof aPrivateKey === 'string') {
            aPrivateKey = base64_to_a32(aPrivateKey);
        }

        if (typeof aMasterKey === 'string') {
            aMasterKey = [[aMasterKey, aSalt]];
        }
        var keys = aMasterKey.concat();

        (function _next() {
            var pair = keys.pop();
            if (!pair) {
                return reject(ENOENT);
            }

            var mk = pair[0];
            var salt = pair[1];

            security.getDerivedEncryptionKey(aPassword, salt || false)
                .then(function(derivedKey) {
                    if (typeof mk === 'string') {
                        mk = base64_to_a32(mk);
                    }

                    var decryptedMasterKey = decrypt_key(new sjcl.cipher.aes(derivedKey), mk);
                    var decryptedPrivateKey = decrypt_key(new sjcl.cipher.aes(decryptedMasterKey), aPrivateKey);

                    if (crypto_decodeprivkey(a32_to_str(decryptedPrivateKey))) {
                        return resolve({k: decryptedMasterKey, s: salt});
                    }

                    onIdle(_next);
                })
                .catch(function(ex) {
                    console.warn(mk, salt, ex);
                    onIdle(_next);
                });
        })();
    }),

    /**
     * Complete the email verification process
     * @param {String} pwd The new password for the account.
     * @param {String} code The code from the email notification.
     * @returns {Promise}
     */
    completeVerifyEmail: promisify(function(resolve, reject, pwd, code) {
        'use strict';

        var req = {a: 'erx', c: code, r: 'v1'};
        var xhr = function(key, uh) {
            req.y = uh;
            req.x = a32_to_base64(key);
            api.req(req).then(resolve).catch(reject);
        };

        // If using the new registration method (v2)
        if (u_attr.aav > 1) {
            req.r = 'v2';

            security.deriveKeysFromPassword(pwd, u_k)
                .then(({clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes}) => {
                    req.z = ab_to_base64(clientRandomValueBytes);
                    xhr(encryptedMasterKeyArray32, ab_to_base64(hashedAuthenticationKeyBytes));
                })
                .catch(reject);
        }
        else {
            var aes = new sjcl.cipher.aes(prepare_key_pw(pwd));
            xhr(encrypt_key(aes, u_k), stringhash(u_attr.email.toLowerCase(), aes));
        }
    }),

    /**
     * Ask the user for email verification on account suspension.
     * @param {String} [aStep] What step of the email verification should be triggered.
     * @returns {undefined}
     */
    showVerifyEmailDialog: function(aStep) {
        'use strict';
        var name = 'verify-email' + (aStep ? '-' + aStep : '');

        if ($.hideTopMenu) {
            $.hideTopMenu();
        }

        // abort any ongoing dialog operation that may would get stuck by receiving an whyamiblocked=700
        M.safeShowDialog.abort();

        M.safeShowDialog(name, function() {
            parsepage(pages.placeholder);
            watchdog.registerOverrider('logout');

            var $dialog = $('.mega-dialog.' + name);
            if (!$dialog.length) {
                $('#loading').addClass('hidden');
                parsepage(pages['dialogs-common']);
                $dialog = $('.mega-dialog.' + name);
            }
            var showLoading = function() {
                loadingDialog.show();
                $('.mega-dialog-container.common-container').addClass('arrange-to-back');
            };
            var hideLoading = function() {
                loadingDialog.hide();
                if (!$.msgDialog) {
                    $('.mega-dialog-container.common-container').removeClass('arrange-to-back');
                }
            };
            var reset = function(step) {
                hideLoading();
                closeDialog();

                if (step === true) {
                    loadSubPage('login');
                }
                else {
                    security.showVerifyEmailDialog(step && step.to);
                }
            };

            hideLoading();
            $('.mega-dialog:visible').addClass('hidden');

            if (aStep === 'login-to-account') {
                var code = String(page).substr(11);

                showLoading();
                console.assert(String(page).startsWith('emailverify'));

                api.req({a: 'erv', v: 2, c: code})
                    .then(({result: res}) => {
                        hideLoading();
                        console.debug('erv', [res]);

                        if (!Array.isArray(res) || !res[6]) {
                            return msgDialog('warninga', l[135], l[47], res < 0 ? api_strerror(res) : l[253], reset);
                        }

                        u_logout(true);

                        u_handle = res[4];
                        u_attr = {u: u_handle, email: res[1], privk: res[6].privk, evc: code, evk: res[6].k};

                        if (is_mobile) {
                            $('button.js-close', $dialog).addClass('hidden');
                            $('.cancel-email-verify', $dialog).removeClass('hidden').rebind('click.cancel', function() {
                                loadSubPage("start");
                            });
                        }
                        else {
                            $('button.js-close', $dialog).removeClass('hidden').rebind('click.cancel', function() {
                                loadSubPage("start");
                            });
                            $('.cancel-email-verify', $dialog).addClass('hidden');
                        }

                        $('.mail', $dialog).val(u_attr.email);
                        $('button.next', $dialog).rebind('click.ve', function() {
                            var $input = $('.pass', $dialog);
                            var pwd = $input.val();

                            showLoading();
                            security.verifyPassword(pwd, u_attr.evk, u_attr.privk)
                                .then(function(res) {
                                    u_k = res.k;
                                    u_attr.aav = 1 + !!res.s;
                                    reset({to: 'set-new-pass'});
                                })
                                .catch(function(ex) {
                                    hideLoading();
                                    console.debug(ex);
                                    $input.megaInputsShowError(l[1102]).val('').focus();
                                });

                            return false;
                        });
                    })
                    .catch((ex) => {
                        if (ex === EEXPIRED || ex === ENOENT) {
                            return msgDialog('warninga', l[135], ex === EEXPIRED ? l[7719] : l[22128], false, reset);
                        }
                        tell(ex);
                    })
                    .finally(() => loadingDialog.hide());
            }
            else if (aStep === 'set-new-pass') {
                console.assert(u_attr && u_attr.evc, 'Invalid procedure...');

                $('button.finish', $dialog).rebind('click.ve', function() {
                    var pw1 = $('input.pw1', $dialog).val();
                    var pw2 = $('input.pw2', $dialog).val();

                    var error = function(msg) {
                        hideLoading();
                        $('input', $dialog)
                            .val('').trigger('blur')
                            .first().trigger('input').megaInputsShowError(msg).trigger('focus');
                        return false;
                    };

                    var pwres = security.isValidPassword(pw1, pw2);
                    if (pwres !== true) {
                        return error(pwres);
                    }

                    showLoading();
                    security.verifyPassword(pw1, u_attr.evk, u_attr.privk)
                        .then(function() {
                            // Do not allow to use a old known password
                            error(l[22675]);
                        })
                        .catch(function(ex) {
                            if (ex !== ENOENT) {
                                console.error(ex);
                                return error(l[8982]);
                            }

                            security.completeVerifyEmail(pw1, u_attr.evc)
                                .then(function() {
                                    login_email = u_attr.email;
                                    watchdog.unregisterOverrider('logout');

                                    u_logout(true);
                                    eventlog(99728);
                                    loadSubPage('login');
                                })
                                .catch(function(ex) {
                                    hideLoading();
                                    msgDialog('warninga',
                                              l[135],
                                              l[47],
                                              ex < 0 ? api_strerror(ex) : ex,
                                              reset.bind(null, false));
                                });
                        });

                    return false;
                });
            }
            else {
                $('.send-email', $dialog).rebind('click.ve', function() {
                    $(this).unbind('click.ve').addClass('disabled');
                    api.req({a: 'era'}).then(({result}) => {
                        assert(result === 0);
                        $('aside.status', $dialog).removeClass('hidden');
                    }).catch((ex) => {
                        const contactPage = () => {
                            mega.redirect('mega.io', 'contact', false, false, false);
                        };
                        $('aside.status', $dialog).addClass('hidden');

                        if (ex === ETEMPUNAVAIL) {
                            msgDialog('warninga', l[135], l[23628], l[23629], contactPage);
                        }
                        else {
                            msgDialog('warninga', l[135], l[47], api_strerror(ex), contactPage);
                        }
                    });
                    return false;
                });
            }

            var $inputs = $('input', $dialog);
            $inputs.rebind('keypress.ve', function(ev) {
                var key = ev.code || ev.key;

                if (key === 'Enter') {
                    if ($inputs.get(0) === this) {
                        $inputs.trigger('blur');
                        $($inputs.get(1)).trigger('focus');
                    }
                    else {
                        $('button.next, button.finish, button.send-email', $dialog).trigger('click');
                    }
                }
            });

            mega.ui.MegaInputs($inputs);
            return $dialog;
        });
    }
};


/**
 * Registration specific functionality for the new secure Registration process
 */
security.register = {

    /** Backup of the details to re-send the email if requested  */
    sendEmailRequestParams: false,

    /**
     * Create new account registration
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} fromProPage Whether the registration started on the Pro page or not
     * @param {Function} completeCallback A function to run when the registration is complete
     */
    startRegistration: function(firstName, lastName, email, password, fromProPage, completeCallback) {
        'use strict';

        if (this.sendEmailRequestParams) {
            console.error('startRegistration blocked, ongoing.');
            return;
        }
        this.sendEmailRequestParams = true;

        // Show loading dialog
        loadingDialog.show();

        // First create an ephemeral account and the Master Key (to be removed at a later date)
        security.register.createEphemeralAccount(function() {

            // Derive the Client Random Value, Encrypted Master Key and Hashed Authentication Key
            security.deriveKeysFromPassword(password, u_k)
                .then(({clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes}) => {

                    // Encode parameters to Base64 before sending to the API
                    const req = {
                        a: 'uc2',
                        n: base64urlencode(to8(firstName + ' ' + lastName)),         // Name (used just for the email)
                        m: base64urlencode(email),                                   // Email
                        crv: ab_to_base64(clientRandomValueBytes),                   // Client Random Value
                        k: a32_to_base64(encryptedMasterKeyArray32),                 // Encrypted Master Key
                        hak: ab_to_base64(hashedAuthenticationKeyBytes),             // Hashed Authentication Key
                        v: 2                                                         // Version of this protocol
                    };

                    // If this was a registration from the Pro page
                    if (fromProPage === true) {
                        req.p = 1;
                    }

                    // Send signup link email
                    security.register.sendSignupLink(req, firstName, lastName, email, completeCallback);
                });
        });
    },

    /**
     * Create an ephemeral account
     * @param {Function} callbackFunction The callback function to run once the ephemeral account is created
     */
    createEphemeralAccount: function(callbackFunction) {

        'use strict';

        // Set a flag to check at the end of the registration process
        if (is_mobile) {
            localStorage.signUpStartedInMobileWeb = '1';
        }

        // If there is no ephemeral account already
        if (u_type === false) {

            // Initialise local storage
            u_storage = init_storage(localStorage);

            // Create anonymous ephemeral account
            u_checklogin({
                checkloginresult: tryCatch((context, userType) => {
                    const {u_k_aes} = window;

                    // Set the user type
                    u_type = userType;

                    // Ensure all went ok..
                    assert(u_type !== false && u_k_aes, `Invalid state (${u_type}:${!!u_k_aes})`);

                    // Continue registering the account
                    callbackFunction();
                }, (ex) => {
                    window.onerror = null;
                    msgDialog('warninga', l[135], `${l[47]} ${l.edit_card_error_des}`, String(ex));
                })
            }, true);
        }

        // If they already have an ephemeral account
        else if (u_type === 0) {

            // Continue registering the account
            callbackFunction();
        }
    },

    /**
     * Start the registration process and send a signup link to the user
     * @param {Object} sendEmailRequestParams An object containing the data to send to the API.
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email
     * @param {Function} completeCallback A function to run when the registration is complete
     */
    sendSignupLink: function(sendEmailRequestParams, firstName, lastName, email, completeCallback) {

        'use strict';

        // Save the input variables so they can be re-used to resend the details with a different email
        security.register.sendEmailRequestParams = {
            firstName: firstName,
            lastName: lastName
        };

        // Run the API request
        api_req(sendEmailRequestParams, {
            callback: function(result) {

                // Hide the loading spinner
                loadingDialog.hide();

                // If successful result, send additional information to the API for the name
                if (result === 0) {
                    security.register.sendAdditionalInformation(firstName, lastName);
                }
                security.register.sendEmailRequestParams = false;

                // Run the callback requested by the calling function to show a check email dialog or show error
                completeCallback(result, firstName, lastName, email);
            }
        });
    },

    /**
     * Cache registration data like name, email etc in case they refresh the page and need to resend the email
     * @param {Object} registerData An object containing keys 'first', 'last', 'name', 'email' and optional 'password'
     *                              for old style registrations.
     */
    cacheRegistrationData: function(registerData) {

        'use strict';

        // Remove password from the object so it doesn't get saved to
        // localStorage for the resend process.

        delete registerData.password;

        localStorage.awaitingConfirmationAccount = JSON.stringify(registerData);

        if (localStorage.voucher) {
            const data = [localStorage.voucher, localStorage[localStorage.voucher] || -1];
            mega.attr.set('promocode', JSON.stringify(data), -2, true).dump();
        }
    },

    /**
     * Repeat the registration process and send a signup link to the user via the new email address they entered
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} newEmail The user's corrected email
     * @param {Function} completeCallback A function to run when the registration is complete
     */
    repeatSendSignupLink: function(firstName, lastName, newEmail, completeCallback) {

        'use strict';

        // Re-encode the parameters to Base64 before sending to the API
        var sendEmailRequestParams = {
            a: 'uc2',
            n: base64urlencode(to8(firstName + ' ' + lastName)),  // Name (used just for the email)
            m: base64urlencode(newEmail)                          // Email
        };

        // Run the API request
        api_req(sendEmailRequestParams, {
            callback: function(result) {

                // Hide the loading spinner
                loadingDialog.hide();

                // If successful result, show a dialog success
                if (is_mobile && result === 0) {
                    mobile.messageOverlay.show(l[16351]);    // The email was sent successfully.
                }

                // Run the callback requested by the calling function to show a check email dialog or whatever
                completeCallback(result, firstName, lastName, newEmail);
            }
        });
    },

    /**
     * Sends additional information e.g. first name and last name to the API
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     */
    sendAdditionalInformation: function(firstName, lastName) {

        'use strict';

        // Set API request options
        var options = {
            a: 'up',
            terms: 'Mq',
            firstname: base64urlencode(to8(firstName)),
            lastname: base64urlencode(to8(lastName)),
            name2: base64urlencode(to8(firstName + ' ' + lastName))
        };

        if (mega.affid) {
            options.aff = mega.affid;
        }

        // Send API request
        api_req(options);
    },

    /**
     * Verifies the email confirmation code after registering
     * @param {String} confirmCode The confirm code from the registration email
     * @return {Promise<void>} {email, result}
     */
    async verifyEmailConfirmCode(confirmCode) {
        'use strict';

        const cc = String(typeof confirmCode === 'string' && base64urldecode(confirmCode));

        // Check if they registered using the new registration process (version 2)
        assert(cc.startsWith('ConfirmCodeV2'), l[703]);

        // Ask them to log out and click on the confirmation link again
        if (u_type === 3) {

            msgDialog('warningb', l[2480], l[12440], false, () => loadSubPage('fm'));
            throw EROLLEDBACK;
        }

        // Send the confirmation code back to the API
        return api.req({a: 'ud2', c: confirmCode})
            .then(({result}) => {
                const [email, name, uh] = result[1];

                if (window.u_handle && u_handle === uh) {
                    // same account still in active session, let's end.
                    if ('csp' in window) {
                        const storage = localStorage;
                        const value = storage[`csp.${u_handle}`];

                        if (value) {
                            storage.csp = value;
                        }
                    }
                    u_logout(1);
                }

                return {
                    name: base64urldecode(name),
                    email: base64urldecode(email),
                    result
                };
            });
    }
};


/**
 * Login specific functionality for the new secure Login process
 */
security.login = {

    /** Cache of the login email in case we need to resend after they have entered their two factor code */
    email: null,

    /** Cache of the login password in case we need to resend after they have entered their two factor code */
    password: null,

    /** Cache of the flag to remember that the user wants to remain logged in after they close the browser */
    rememberMe: false,

    /** Callback to run after login is complete */
    loginCompleteCallback: null,


    /**
     * Check which login method the user is using (either the old process or the new process)
     * ToDo: Add check to the email field on the login page if it is prefilled or they finish typing to fetch the salt
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if not applicable
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     * @param {Function} oldStartCallback A callback for starting the old login process
     * @param {Function} newStartCallback A callback for starting the new login process
     */
    checkLoginMethod: function(email, password, pinCode, rememberMe, oldStartCallback, newStartCallback) {
        'use strict';

        console.assert(!!password, 'checkLoginMethod: blocked, pwd missing.');
        console.assert(pinCode || !security.login.email, 'checkLoginMethod: blocked, ongoing.');
        if ((!pinCode && security.login.email) || !password) {
            return;
        }

        // Temporarily cache the email, password and remember me checkbox status
        // in case we need to resend after they have entered their two factor code
        security.login.email = email;
        security.login.password = password;
        security.login.rememberMe = rememberMe;

        // Fetch the user's salt from the API
        security.fetchAccountVersionAndSalt(email).then(({version, salt}) => {

            // If using the new method pass through the salt as well
            if (version === 2) {
                newStartCallback(email, password, pinCode, rememberMe, salt);
            }

            // Otherwise using the old method
            else if (version === 1) {
                oldStartCallback(email, password, pinCode, rememberMe);
            }
        }).catch(tell);
    },

    /**
     * Start the login using the new process
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if not applicable
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     * @param {String} salt The user's salt as a Base64 URL encoded string
     * @param {Function} loginCompleteCallback The final callback once the login is complete
     */
    startLogin: function(email, password, pinCode, rememberMe, salt, loginCompleteCallback) {

        'use strict';

        // Convert the salt and password to byte arrays
        var saltArrayBuffer = base64_to_ab(salt);
        var saltBytes = new Uint8Array(saltArrayBuffer);
        var passwordBytes = security.stringToByteArray(password);

        // The number of iterations for the PPF and desired length in bits of the derived key
        var iterations = security.numOfIterations;
        var derivedKeyLength = security.derivedKeyLengthInBits;

        // Set the callback to run after login is complete
        security.login.loginCompleteCallback = loginCompleteCallback;

        // Run the PPF
        security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength).then((derivedKeyBytes) => {

            // Get the first 16 bytes as the Encryption Key and the next 16 bytes as the Authentication Key
            var derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);
            var derivedAuthenticationKeyBytes = derivedKeyBytes.subarray(16, 32);
            var authenticationKeyBase64 = ab_to_base64(derivedAuthenticationKeyBytes);

            // Convert the Derived Encryption Key to a big endian array of 32 bit values for decrypting the Master Key
            var derivedEncryptionKeyArray32 = base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));

            // Authenticate with the API
            security.login.sendAuthenticationKey(email, pinCode, authenticationKeyBase64, derivedEncryptionKeyArray32);
        });
    },

    /**
     * Authenticate with the API by sending the Authentication Key
     * @param {String} email The user's email address
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if not applicable
     * @param {String} authenticationKeyBase64 The 128 bit Authentication Key encdoded as URL encoded Base64
     * @param {Array} derivedEncryptionKeyArray32 A 128 bit key encoded as a big endian array of 32 bit values which
     *                                            was used to encrypt the Master Key
     */
    sendAuthenticationKey: function(email, pinCode, authenticationKeyBase64, derivedEncryptionKeyArray32) {

        'use strict';

        // Check for too many login attempts
        if (api_getsid.etoomany + 3600000 > Date.now() || location.host === 'webcache.googleusercontent.com') {
            security.login.loginCompleteCallback(ETOOMANY);
            return false;
        }

        // Setup the login request
        var requestVars = { a: 'us', user: email, uh: authenticationKeyBase64 };

        // If the two-factor authentication code was entered by the user, add it to the request as well
        if (pinCode !== null) {
            requestVars.mfa = pinCode;
        }

        // Send the Email and Authentication Key to the API
        api_req(requestVars, {
            callback: function(result) {

                // If successful
                if (typeof result === 'object') {

                    // Get values from Object
                    var temporarySessionIdBase64 = result.tsid;
                    var encryptedSessionIdBase64 = result.csid;
                    var encryptedMasterKeyBase64 = result.k;
                    var encryptedPrivateRsaKey = result.privk;
                    var userHandle = result.u;

                    // Decrypt the Master Key
                    var encryptedMasterKeyArray32 = base64_to_a32(encryptedMasterKeyBase64);
                    var cipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);
                    var decryptedMasterKeyArray32 = decrypt_key(cipherObject, encryptedMasterKeyArray32);

                    // If the temporary session ID is set then we need to generate RSA keys
                    if (typeof temporarySessionIdBase64 !== 'undefined') {
                        security.login.skipToGenerateRsaKeys(decryptedMasterKeyArray32, temporarySessionIdBase64);
                    }
                    else {
                        // Otherwise continue a regular login
                        security.login.decryptRsaKeyAndSessionId(decryptedMasterKeyArray32, encryptedSessionIdBase64,
                                                                 encryptedPrivateRsaKey, userHandle);
                    }
                }
                else {
                    // Return failure
                    security.login.loginCompleteCallback(result);
                }
            }
        });
    },

    /**
     * Sets some session variables and skips to the RSA Key Generation page and process
     * @param {Array} masterKeyArray32 The unencrypted Master Key
     * @param {String} temporarySessionIdBase64 The temporary session ID send from the API
     */
    skipToGenerateRsaKeys: function(masterKeyArray32, temporarySessionIdBase64) {

        'use strict';

        // Set global values which are used everywhere
        u_k = masterKeyArray32;
        u_sid = temporarySessionIdBase64;
        u_k_aes = new sjcl.cipher.aes(masterKeyArray32);

        // Set the Session ID for future API requests
        api_setsid(temporarySessionIdBase64);

        // Set to localStorage as well
        u_storage.k = JSON.stringify(masterKeyArray32);
        u_storage.sid = temporarySessionIdBase64;

        // Redirect to key generation page
        loadSubPage('key');
    },

    /**
     * Decrypts the RSA private key and the RSA encrypted session ID
     * @param {Array} masterKeyArray32 The unencrypted Master Key
     * @param {String} encryptedSessionIdBase64 The encrypted session ID as a Base64 string
     * @param {String} encryptedPrivateRsaKeyBase64 The private RSA key as a Base64 string
     * @param {String} userHandle The encrypted user handle from the 'us' response
     */
    decryptRsaKeyAndSessionId: function(masterKeyArray32, encryptedSessionIdBase64,
                                        encryptedPrivateRsaKeyBase64, userHandle) {

        'use strict';

        const errobj = {};
        var keyAndSessionData = false;

        try {

            if (typeof userHandle !== 'string' || userHandle.length !== 11) {
                eventlog(99752, JSON.stringify([1, 11, userHandle]));

                console.error("Incorrect user handle in the 'us' response", userHandle);

                Soon(() => {
                    msgDialog('warninga', l[135], l[8853], userHandle);
                });

                return false;
            }

            // Decrypt and decode the RSA Private Key
            var cipherObject = new sjcl.cipher.aes(masterKeyArray32);
            var encryptedPrivateRsaKeyArray32 = base64_to_a32(encryptedPrivateRsaKeyBase64);
            var decryptedPrivateRsaKey = decrypt_key(cipherObject, encryptedPrivateRsaKeyArray32);
            var decryptedPrivateRsaKeyBigEndianString = a32_to_str(decryptedPrivateRsaKey);

            const decodedPrivateRsaKey = crypto_decodeprivkey(decryptedPrivateRsaKeyBigEndianString, errobj);
            if (!decodedPrivateRsaKey) {
                console.error('RSA key decoding failed (%o)..', errobj);

                eventlog(99752, JSON.stringify([1, 10, errobj]));

                Soon(() => {
                    msgDialog('warninga', l[135], l[8853], JSON.stringify(errobj));
                });

                return false;
            }

            // Decrypt the Session ID using the RSA Private Key
            var encryptedSessionIdBytes = base64urldecode(encryptedSessionIdBase64);
            var decryptedSessionId = crypto_rsadecrypt(encryptedSessionIdBytes, decodedPrivateRsaKey);
            var decryptedSessionIdSubstring = decryptedSessionId.substr(0, 43);
            var decryptedSessionIdBase64 = base64urlencode(decryptedSessionIdSubstring);

            // Get the user handle from the decrypted Session ID (11 bytes starting at offset 16 bytes)
            const sessionIdUserHandle = decryptedSessionId.substring(16, 27);

            // Add a check that the decrypted sid and res.u aren't shorter than usual before making the comparison.
            // Otherwise, we could construct an oracle based on shortened csids with single-byte user handles.
            if (decryptedSessionId.length !== 255) {
                eventlog(99752, JSON.stringify([1, 13, userHandle, decryptedSessionId.length]));

                throw new Error(`Incorrect length of Session ID ${decryptedSessionId.length}`);
            }

            // Check that the user handle included in the Session ID matches the one sent in the 'us' response
            if (sessionIdUserHandle !== userHandle) {
                eventlog(99752, JSON.stringify([1, 14, userHandle]));

                throw new Error(`User handle mismatch! us-req:"${userHandle}" != session:"${sessionIdUserHandle}"`);
            }

            // Set the data
            keyAndSessionData = [masterKeyArray32, decryptedSessionIdBase64, decodedPrivateRsaKey];
        }
        catch (ex) {
            if (!eventlog.sent['99752']) {
                eventlog(99752, JSON.stringify([1, 12, userHandle, errobj, String(ex).split('\n')[0]]));
            }

            console.error('Error decrypting or decoding the private RSA key or Session ID!', ex);

            // Show an error dialog
            Soon(() => {
                msgDialog('warninga', l[135], l[8853], `${ex}`);
            });

            return false;
        }

        // Continue with the flow
        security.login.setSessionVariables(keyAndSessionData);
    },

    /**
     * Set the session variables and complete the login
     * @param {Array} keyAndSessionData A basic array consisting of:
     *     [
     *        {Array} The unencrypted Master Key,
     *        {String} The decrypted Session ID as a Base64 string,
     *        {Array} The decoded RSA Private Key as an array of parts
     *     ]
     */
    setSessionVariables: function(keyAndSessionData) {
        'use strict';

        // Check if the Private Key and Session ID were decrypted successfully
        if (keyAndSessionData === false) {
            security.login.loginCompleteCallback(false);
            return false;
        }

        // Set variables
        var masterKeyArray32 = keyAndSessionData[0];
        var decryptedSessionIdBase64 = keyAndSessionData[1];
        var decodedPrivateRsaKey = keyAndSessionData[2];

        // Set flag
        localStorage.wasloggedin = true;

        // Remove all previous login data
        u_logout();

        // Use localStorage if the user checked the Remember Me checkbox, otherwise use temporary sessionStorage
        u_storage = init_storage(security.login.rememberMe ? localStorage : sessionStorage);

        // Store the Master Key and Session ID
        u_storage.k = JSON.stringify(masterKeyArray32);
        u_storage.sid = decryptedSessionIdBase64;

        // Notify other tabs of login
        watchdog.notify('login', [!security.login.rememberMe && masterKeyArray32, decryptedSessionIdBase64]);

        // Store the RSA private key
        if (decodedPrivateRsaKey) {
            u_storage.privk = base64urlencode(crypto_encodeprivkey(decodedPrivateRsaKey));
        }

        // Cleanup temporary login variables
        security.login.email = null;
        security.login.password = null;
        security.login.rememberMe = false;

        // Continue to perform 'ug' request and afterwards run the loginComplete callback
        u_checklogin4(u_storage.sid)
            .then((res) => {
                security.login.loginCompleteCallback(res);

                // Logging to see how many people are signing in
                eventlog(is_mobile ? 99629 : 99630);

                // Broadcast login event
                mBroadcaster.sendMessage('login', keyAndSessionData);

                return res;
            })
            .dump('sec.login');
    },

    /**
     * Handles common errors like Two-Factor PIN issues, suspended accounts,
     * too many login attempts and incomplete registration
     * @param {Number} result A negative number if there was an error, or positive if login was successful
     * @param {type} oldStartLoginCallback
     * @param {type} newStartLoginCallback
     * @returns {Boolean} Returns true if the error was handled by this function, otherwise false and it will continue
     */
    checkForCommonErrors: function(result, oldStartLoginCallback, newStartLoginCallback) {
        'use strict';

        loadingDialog.hide();

        // If the Two-Factor Auth PIN is required
        if (result === EMFAREQUIRED) {

            // Request the 2FA PIN by showing the dialog, then after that it will re-run this function
            twofactor.loginDialog.init(oldStartLoginCallback, newStartLoginCallback);
            return true;
        }

        // If there was a 2FA error, show a message that the PIN code was incorrect and clear the text field
        else if (result === EFAILED) {
            twofactor.loginDialog.showVerificationError();
            return true;
        }

        // Cleanup temporary login variables
        security.login.email = null;
        security.login.password = null;
        security.login.rememberMe = false;

        // close two-factor dialog if it was opened
        twofactor.loginDialog.closeDialog();

        // Check for suspended account
        if (result === EBLOCKED) {
            msgDialog('warninga', l[6789], l[730]);
            return true;
        }

        // Check for too many login attempts
        else if (result === ETOOMANY) {
            api_getsid.etoomany = Date.now();
            api_getsid.warning();
            return true;
        }

        // Check for incomplete registration
        else if (result === EINCOMPLETE) {
            msgDialog('warningb', l[882], l[9082]); // This account has not completed the registration

            return true;
        }

        // Not applicable to this function
        return false;
    },

    /**
     * Silently upgrades a user's account from version 1 to the improved version 2 format (which has a per user salt)
     * and using the user's existing password. This is a general security improvement to upgrade all legacy users to
     * the latest account format when they log in.
     * @param {Number} loginResult The result from the v1 postLogin function which returns from u_checklogin3a
     * @param {Array} masterKey The unencrypted Master Key as an array of Int32 values
     * @param {String} password The current password from the user entered at login
     * @returns {Promise<*>} avu result
     */
    async checkToUpgradeAccountVersion(loginResult, masterKey, password) {
        'use strict';

        // Double check that: 1) not currently in registration signup, 2) account version is v1 and 3) login succeeded
        if (!confirmok && typeof u_attr === 'object' && u_attr.aav === 1 && loginResult !== false && loginResult >= 0) {

            // Show a console message in case it will take a while
            if (d) {
                console.info('Attempting to perform account version upgrade to v2...');
            }

            // Create the Client Random Value, re-encrypt the Master Key and create the Hashed Authentication Key
            const {
                clientRandomValueBytes,
                encryptedMasterKeyArray32,
                hashedAuthenticationKeyBytes
            } = await security.deriveKeysFromPassword(password, masterKey);

            // Convert to Base64
            const encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
            const hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);
            const clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);
            const saltBase64 = ab_to_base64(security.createSalt(clientRandomValueBytes));

            // Prepare the Account Version Upgrade (avu) request
            const requestParams = {
                a: 'avu',
                emk: encryptedMasterKeyBase64,
                hak: hashedAuthenticationKeyBase64,
                crv: clientRandomValueBase64
            };

            // Send API request to change password
            const {result} = await api.req(requestParams).catch(dump);

            // If successful
            if (result === 0) {

                // Update global user attributes (key, salt and version) because the
                // 'ug' request is not re-done, nor are action packets sent for this
                u_attr.k = encryptedMasterKeyBase64;
                u_attr.aas = saltBase64;
                u_attr.aav = 2;

                // Log to console
                if (d) {
                    console.info('Account version upgrade to v2 successful.');
                }

                // Log to Stats (to know how many are successfully upgraded)
                eventlog(99770, true);
            }
            else {
                // Log failures as well (to alert us of bugs)
                eventlog(99771, true);
            }

            // If not successful, it will attempt again on next login, continue to update UI
            return result;
        }
    }
};


/**
 * Common functionality for desktop/mobile webclient for changing the password using the old and new processes
 */
security.changePassword = {

    /**
     * Change the user's password using the old method
     * @param {String} newPassword The new password
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    async oldMethod(newPassword, twoFactorPin) {

        'use strict';

        // Otherwise change the password using the old method
        const newPasswordTrimmed = $.trim(newPassword);
        const pw_aes = new sjcl.cipher.aes(prepare_key_pw(newPasswordTrimmed));
        const encryptedMasterKeyBase64 = a32_to_base64(encrypt_key(pw_aes, u_k));
        const userHash = stringhash(u_attr.email.toLowerCase(), pw_aes);

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
        return api.screq(requestParams)
            .then(({result}) => {

                // If successful, update user attribute key property with the Encrypted Master Key
                if (result) {
                    u_attr.k = encryptedMasterKeyBase64;
                }

                return result;
            });
    },

    /**
     * Change the user's password using the new method
     * @param {String} newPassword The new password
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    async newMethod(newPassword, twoFactorPin) {

        'use strict';

        // Create the Client Random Value, Encrypted Master Key and Hashed Authentication Key
        return security.deriveKeysFromPassword(newPassword, u_k)
            .then(({clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes}) => {

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
                return api.screq(requestParams).then(({result}) => {

                    // If successful, update global user attributes key and salt as the 'ug' request is not re-done
                    if (result) {
                        u_attr.k = encryptedMasterKeyBase64;
                        u_attr.aas = saltBase64;
                    }

                    // Update UI
                    return result;
                });
            });
    },

    /**
     * Checks for the user's current Account Authentication Version (e.g. v1 or v2)
     * @returns {Promise<Number>} Account version.
     */
    async checkAccountVersion() {
        'use strict';

        // If the Account Authentication Version is already v2 we don't need to check the version again via the API
        if (u_attr && u_attr.aav === 2) {
            return u_attr.aav;
        }

        // If we are currently a v1 account, we must check here for the current account version (in case it changed
        // recently in another app/browser) because we don't want the other app/browser to have logged in and
        // updated to v2 and then the current account which is still logged in here as v1 to overwrite that with
        // the old format data when they change password. If that happened the user would not be able to log into
        // their account anymore.
        return (await M.getAccountDetails()).aav;
    },

    async isPasswordTheSame(newPassword, method) {
        "use strict";
        let encryptedMasterKeyBase64;
        assert(window.u_attr && u_attr.k && window.u_k, l[23324]);

        // registration v2
        if (method === 2) {
            assert(typeof u_attr.aas !== "undefined", l[23324]);

            const saltBytes = base64_to_ab(u_attr.aas);
            const passwordBytes = security.stringToByteArray($.trim(newPassword));

            const {numOfIterations: iter, derivedKeyLengthInBits: len} = security;
            const derivedKeyBytes = await security.deriveKey(saltBytes, passwordBytes, iter, len);

            const derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);
            const derivedEncryptionKeyArray32 = base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));
            const cipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);
            const encryptedMasterKeyArray32 = encrypt_key(cipherObject, u_k);

            encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
        }
        else {
            // registration v1
            const pw_aes = new sjcl.cipher.aes(prepare_key_pw(newPassword));

            encryptedMasterKeyBase64 = a32_to_base64(encrypt_key(pw_aes, u_k));
        }

        return u_attr.k === encryptedMasterKeyBase64;
    }
};
