/**
 * General common functionality for the new secure Registration and Login process including an
 * improved Password Processing Function (PPF) now with PBKDF2-HMAC-SHA512, a per user salt and 100,000 iterations.
 */
var security = {

    /** Minimum password length across the app for registration and password changes */
    minPasswordLength: 8,

    /** The number of iterations for the PPF (1-2 secs computation time) */
    numOfIterations: 100000,

    /** The length of the salt in bits */
    saltLengthInBits: 128,          // 16 Bytes

    /** The desired length of the derived key from the PPF in bits */
    derivedKeyLengthInBits: 256,    // 32 Bytes

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
     * @param {String} masterKeyArray32 The user's Master Key
     * @param {Function} completeCallback The function to be run after the keys are created which will pass the
     *                                    the clientRandomValueBytes, encryptedMasterKeyArray32 and
     *                                    hashedAuthenticationKeyBytes as the parameters
     */
    deriveKeysFromPassword: function(password, masterKeyArray32, completeCallback) {

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
        security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength, function(derivedKeyBytes) {

            // Get the first 16 bytes as the Encryption Key and the next 16 bytes as the Authentication Key
            var derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);
            var derivedAuthenticationKeyBytes = derivedKeyBytes.subarray(16, 32);

            // Get a hash of the Authentication Key which the API will use for authentication at login time
            var hashedAuthenticationKeyBytes = asmCrypto.SHA256.bytes(derivedAuthenticationKeyBytes);

            // Keep only the first 128 bits (16 bytes) of the Hashed Authentication Key
            hashedAuthenticationKeyBytes = hashedAuthenticationKeyBytes.subarray(0, 16);

            // Convert the Derived Encryption Key to a big endian array of 32 bytes, then encrypt the Master Key
            var derivedEncryptionKeyArray32 = base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));
            var cipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);
            var encryptedMasterKeyArray32 = encrypt_key(cipherObject, masterKeyArray32);

            // Pass the Client Random Value, Encrypted Master Key and Hashed Authentication Key to the calling function
            completeCallback(clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes);
        });
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

    /*
     * Checks if Two-Factor Authentication is enabled for the user's account
     * @param {String} email The user's email address
     * @param {Function} completeCallback The function to run if successful
     */
    checkIfTwoFactorAuthEnabled: function(email, completeCallback) {

        'use strict';

        // Make Multi-Factor Auth Get request
        api_req({ a: 'mfag', e: email }, {
            callback: function(result) {

                // If enabled, send back true
                if (result === 1) {
                    completeCallback(true);
                }
                else {
                    completeCallback(false);
                }
            }
        });
    },

    /**
     * Fetch the user's salt from the API
     * @param {String} email The user's email address
     * @param {Function} completeCallback The function to run if successful
     */
    fetchAccountVersionAndSalt: function(email, completeCallback) {

        'use strict';

        // Send the email to the API
        api_req({ a: 'us0', user: email }, {
            callback: function(result) {

                // If successful
                if (typeof result === 'object') {

                    // Get the version and salt (there is no salt for old version 1 accounts)
                    var version = result.v;
                    var salt = (version >= 2) ? result.s : null;

                    // Run the callback
                    completeCallback(version, salt);
                }
                else {
                    // Show an error dialog
                    if (is_mobile) {
                        mobile.messageOverlay.show(l[47], l[200]);
                    }
                    else {
                        // Desktop error dialog
                        msgDialog('warningb', l[47], l[200]);
                    }

                    console.error('Error fetching user salt!', result);
                }
            }
        });
    },

    /**
     * A wrapper function used for deriving a key from a password
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {String} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKey: function(saltBytes, passwordBytes, iterations, derivedKeyLength, callback) {

        'use strict';

        // If Web Crypto method supported, use that as it's nearly as fast as native
        if (window.crypto && window.crypto.subtle) {
            security.deriveKeyWithWebCrypto(saltBytes, passwordBytes, iterations, derivedKeyLength, callback);
        }
        else {
            // Otherwise use asmCrypto which is the next fastest
            security.deriveKeyWithAsmCrypto(saltBytes, passwordBytes, iterations, derivedKeyLength, callback);
        }
    },

    /**
     * Derive the key using the Web Crypto API
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithWebCrypto: function(saltBytes, passwordBytes, iterations, derivedKeyLength, callback) {

        'use strict';

        // Import the password as the key
        crypto.subtle.importKey(
            'raw', passwordBytes, 'PBKDF2', false, ['deriveBits']
        )
        .then(function(key) {

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
        .then(function(derivedKeyArrayBuffer) {

            // Convert to a byte array
            var derivedKeyBytes = new Uint8Array(derivedKeyArrayBuffer);

            // Pass the derived key to the callback
            callback(derivedKeyBytes);
        });
    },

    /**
     * Derive the key using asmCrypto
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Number} iterations The cost factor / number of iterations of the PPF to perform
     * @param {Number} derivedKeyLength The length of the derived key to create
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithAsmCrypto: function(saltBytes, passwordBytes, iterations, derivedKeyLength, callback) {

        'use strict';

        // Convert the desired derived key length to bytes and derive the key
        var keyLengthBytes = derivedKeyLength / 8;
        var derivedKeyBytes = asmCrypto.PBKDF2_HMAC_SHA512.bytes(passwordBytes, saltBytes, iterations, keyLengthBytes);

        // Pass the derived key to the callback
        callback(derivedKeyBytes);
    },

    /**
     * A helper function for the check password feature (used when changing email or checking if they can remember).
     * This function will only pass the Derived Encryption Key to the completion callback.
     * @param {String} password The password from the user
     * @param {String} completeCallback The callback to run when complete which will pass derivedEncryptionKeyArray32
     */
    getDerivedEncryptionKey: function(password, completeCallback) {

        'use strict';

        // Convert the salt and password to byte arrays
        var saltBase64 = u_attr.aas;                        // Account Authentication Salt
        var saltArrayBuffer = base64_to_ab(saltBase64);
        var saltBytes = new Uint8Array(saltArrayBuffer);
        var passwordBytes = security.stringToByteArray(password);

        // The number of iterations for the PPF and desired length in bits of the derived key
        var iterations = security.numOfIterations;
        var derivedKeyLength = security.derivedKeyLengthInBits;

        // Run the PPF
        security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength, function(derivedKeyBytes) {

            // Get the first 16 bytes as the Encryption Key
            var derivedEncryptionKeyBytes = derivedKeyBytes.subarray(0, 16);

            // Convert the Derived Encryption Key to a big endian array of 32 bit values for decrypting the Master Key
            var derivedEncryptionKeyArray32 = base64_to_a32(ab_to_base64(derivedEncryptionKeyBytes));

            // Pass only the Derived Encryption Key back to the callback
            completeCallback(derivedEncryptionKeyArray32);
        });
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
        security.fetchAccountVersionAndSalt(recoveryEmail, function(version) {

            // If using the new registration method (v2)
            if (version === 2) {

                // Create fresh Master Key
                api_create_u_k();

                // Derive keys from the new password
                security.deriveKeysFromPassword(newPassword, u_k,
                    function(clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes) {

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
     * @param {String} masterKeyArray32 The Master/Recovery Key entered by the user
     * @param {String} recoveryEmail The email address that is being recovered
     * @param {String|null} newPassword The new password for the account (optional)
     * @param {Function} completeCallback The function to run when the callback completes
     */
    resetKey: function(recoveryCode, masterKeyArray32, recoveryEmail, newPassword, completeCallback) {

        'use strict';

        // Fetch the user's account version
        security.fetchAccountVersionAndSalt(recoveryEmail, function(version) {

            // If using the new registration method (v2)
            if (version === 2) {

                // Check the recovery code
                api_req({
                    a: 'erx',
                    r: 'gk',
                    c: recoveryCode
                },
                {
                    callback: function(result) {

                        // If the private RSA key was returned
                        if (typeof result === 'string') {

                            // If the decryption of the RSA private key failed, pass error back to callback
                            if (!verifyPrivateRsaKeyDecryption(result, masterKeyArray32)) {
                                completeCallback(EKEY);
                            }

                            // Complete the reset of the user's password using the Master Key provided
                            else if (newPassword) {
                                security.completeResetKey(newPassword, recoveryCode, masterKeyArray32,
                                                          completeCallback);
                            }
                            else {
                                completeCallback(0);
                            }
                        }
                        else {
                            completeCallback(result);
                        }
                    }
                });
            }
            else {
                // Otherwise use the old reset password by recovery key method
                api_resetkeykey(
                    { result: completeCallback }, recoveryCode, masterKeyArray32, recoveryEmail, newPassword
                );
            }
        });
    },

    /**
     * Complete the reset of the user's password using the Master Key provided by the user
     * @param {String} newPassword The new password for the account
     * @param {String} recoveryCode The recovery code from the email
     * @param {String} masterKeyArray32 The Master/Recovery Key entered by the user
     * @param {Function} completeCallback The function to run when the callback completes
     */
    completeResetKey: function(newPassword, recoveryCode, masterKeyArray32, completeCallback) {

        'use strict';

        // Derive keys from the new password
        security.deriveKeysFromPassword(newPassword, masterKeyArray32,
            function(clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes) {

                // Convert Master Key, Hashed Authentication Key and Client Random Value to Base64
                var encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
                var hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);
                var clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);

                // Run API request to park the account and start a new one under the same email
                api_req({
                    a: 'erx',
                    r: 'sk',
                    c: recoveryCode,
                    x: encryptedMasterKeyBase64,
                    y: {
                        crv: clientRandomValueBase64,
                        hak: hashedAuthenticationKeyBase64
                    }
                },
                { callback: completeCallback });
            }
        );
    }
};


/**
 * Registration specific functionality for the new secure Registration process
 */
security.register = {

    /** Backup of the details to re-send the email if requested  */
    sendEmailRequestParams: {},

    /**
     * Checks if the new secure registration method is enabled
     * @returns {Boolean} Returns true if enabled, false if not
     */
    newRegistrationEnabled: function() {

        'use strict';

        // Check localStorage testing flag which takes priority
        if (localStorage.getItem('newRegistrationEnabled') !== null) {
            return localStorage.getItem('newRegistrationEnabled') === '1' ? true : false;
        }

        // Otherwise check API to see if 'New Secure Registration Enabled' flag is set
        else if (typeof mega.apiMiscFlags.nsre !== 'undefined') {
            return (mega.apiMiscFlags.nsre === 1) ? true : false;
        }

        // Default is not enabled until all clients have been updated, also it's been enabled and stable for 2 weeks
        return false;
    },

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

        // Show loading dialog
        loadingDialog.show();

        // First create an ephemeral account and the Master Key (to be removed at a later date)
        security.register.createEphemeralAccount(function() {

            // Derive the Client Random Value, Encrypted Master Key and Hashed Authentication Key
            security.deriveKeysFromPassword(password, u_k,
                function(clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes) {

                    // Encode parameters to Base64 before sending to the API
                    var sendEmailRequestParams = {
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
                        sendEmailRequestParams.p = 1;
                    }

                    // Send signup link email
                    security.register.sendSignupLink(sendEmailRequestParams, firstName, lastName, email,
                                                     completeCallback);
                }
            );
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
                checkloginresult: function(context, userType) {

                    // Set the user type
                    u_type = userType;

                    // Continue registering the account
                    callbackFunction();
                }
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

                // Run the callback requested by the calling function to show a check email dialog or show error
                completeCallback(result, firstName, lastName, email);
            }
        });
    },

    /**
     * Repeat the registration process and send a signup link to the user via the new email address they entered
     * @param {type} newEmail The user's corrected email
     * @param {type} completeCallback A function to run when the registration is complete
     */
    repeatSendSignupLink: function(newEmail, completeCallback) {

        'use strict';

        // Get the previous name used
        var firstName = security.register.sendEmailRequestParams.firstName;
        var lastName = security.register.sendEmailRequestParams.lastName;
        var name = firstName + ' ' + lastName;

        // Re-encode the parameters to Base64 before sending to the API
        var sendEmailRequestParams = {
            a: 'uc2',
            n: base64urlencode(to8(name)),   // Name (used just for the email)
            m: base64urlencode(newEmail)     // Email
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
                else if (is_mobile && result < 0) {
                    mobile.messageOverlay.show(l[47]);    // Oops, something went wrong. Sorry about that!
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

        // Send API request
        api_req(options);
    },

    /**
     * Verifies the email confirmation code after registering
     * @param {String} confirmCode The confirm code from the registration email
     * @param {Function} completeCallback The function to run when the email confirm code has been sent to the API
     */
    verifyEmailConfirmCode: function(confirmCode, completeCallback) {

        'use strict';

        // Send the confirmation code back to the API
        api_req({ a: 'ud2', c: confirmCode }, {
            callback: function(result) {

                // If successful
                if (typeof result === 'object') {

                    // Decode the result (array index 0 = email, 1 = name, 2 = Base64 encoded user handle)
                    var email = base64urldecode(result[0]);

                    // Pass the email back
                    completeCallback(result, email);
                }
                else {
                    // Pass the error code back
                    completeCallback(result);
                }
            }
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

        // Temporarily cache the email, password and remember me checkbox status
        // in case we need to resend after they have entered their two factor code
        security.login.email = email;
        security.login.password = password;
        security.login.rememberMe = rememberMe;

        // Fetch the user's salt from the API
        security.fetchAccountVersionAndSalt(email, function(version, salt) {

            // If using the new method pass through the salt as well
            if (version === 2) {
                newStartCallback(email, password, pinCode, rememberMe, salt);
            }

            // Otherwise using the old method
            else if (version === 1) {
                oldStartCallback(email, password, pinCode, rememberMe);
            }
        });
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
        security.deriveKey(saltBytes, passwordBytes, iterations, derivedKeyLength, function(derivedKeyBytes) {

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
                                                                 encryptedPrivateRsaKey);
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
     * @param {Array} masterKeyArray32 The raw unencrypted Master Key
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
     * @param {Array} masterKeyArray32 The raw unencrypted Master Key
     * @param {String} encryptedSessionIdBase64 The encrypted session ID as a Base64 string
     * @param {String} encryptedPrivateRsaKeyBase64 The private RSA key as a Base64 string
     */
    decryptRsaKeyAndSessionId: function(masterKeyArray32, encryptedSessionIdBase64, encryptedPrivateRsaKeyBase64) {

        'use strict';

        var keyAndSessionData = false;

        try {
            // Decrypt and decode the RSA Private Key
            var cipherObject = new sjcl.cipher.aes(masterKeyArray32);
            var encryptedPrivateRsaKeyArray32 = base64_to_a32(encryptedPrivateRsaKeyBase64);
            var decryptedPrivateRsaKey = decrypt_key(cipherObject, encryptedPrivateRsaKeyArray32);
            var decryptedPrivateRsaKeyBigEndianString = a32_to_str(decryptedPrivateRsaKey);
            var decodedPrivateRsaKey = crypto_decodeprivkey(decryptedPrivateRsaKeyBigEndianString);

            // Decrypt the Session ID using the RSA Private Key
            var encryptedSessionIdBytes = base64urldecode(encryptedSessionIdBase64);
            var decryptedSessionId = crypto_rsadecrypt(encryptedSessionIdBytes, decodedPrivateRsaKey);
            var decryptedSessionIdSubstring = decryptedSessionId.substr(0, 43);
            var decryptedSessionIdBase64 = base64urlencode(decryptedSessionIdSubstring);

            // Set the data
            keyAndSessionData = [masterKeyArray32, decryptedSessionIdBase64, decodedPrivateRsaKey];
        }
        catch (exception) {

            console.error('Error decoding private RSA key!', exception);

            // Show an error dialog
            Soon(function() {
                msgDialog('warninga', l[135], l[8853]);
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
     *        {Array} The raw unencrypted Master Key,
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

        // A little helper to pass only the final result of the User Get (ug) API request
        // i.e. the (user type or error code) back to the loginCompletionCallback function
        var ctx = {
            callback2: security.login.loginCompleteCallback,
            checkloginresult: function(ctx, result) {
                if (ctx.callback2) {
                    ctx.callback2(result);
                }
            }
        };

        // Cleanup temporary login variables
        security.login.email = null;
        security.login.password = null;
        security.login.rememberMe = false;

        // Continue to perform 'ug' request and afterwards run the loginComplete callback
        u_checklogin(ctx, false);

        // Logging to see how many people are signing in
        onIdle(function() {
            if (is_mobile) {
                api_req({a: 'log', e: 99629, m: 'Completed login on mobile webclient'});
            }
            else {
                api_req({a: 'log', e: 99630, m: 'Completed login on regular webclient'});
            }

            // Broadcast login event
            mBroadcaster.sendMessage('login', keyAndSessionData);
        });
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

        // Reset the 2FA dialog back to default UI
        twofactor.loginDialog.resetState();

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

        // Check for suspended account
        else if (result === EBLOCKED) {
            twofactor.loginDialog.closeDialog();
            msgDialog('warninga', l[6789], l[730]);
            return true;
        }

        // Check for too many login attempts
        else if (result === ETOOMANY) {
            twofactor.loginDialog.closeDialog();
            api_getsid.etoomany = Date.now();
            api_getsid.warning();
            return true;
        }

        // Check for incomplete registration
        else if (result === EINCOMPLETE) {
            if (is_mobile) {
                mobile.messageOverlay.show(l[882], l[9082]);
            }
            else {
                twofactor.loginDialog.closeDialog();
                msgDialog('warningb', l[882], l[9082]); // This account has not completed the registration
            }

            return true;
        }
        else {
            // Not applicable to this function
            return false;
        }
    }
};
