/** Key ring holding own private keys. */
var u_keyring;

/** Own private Ed25519 key. */
var u_privEd25519;

/** Own public Ed25519 key. */
var u_pubEd25519;

/** Cache for contacts' public Ed25519 keys. */
var pubEd25519 = {};

/** Own private Curve25519 key. */
var u_privCu25519;

/** Own public Curve25519 key. */
var u_pubCu25519;

/** Cache for contacts' public Curve25519 keys. */
var pubCu25519 = {};

var crypt = (function () {
    "use strict";

    // Disables warnings for explicit initialisation with `undefined`.
    /* jshint -W080 */

    /**
     * @description
     * Cryptography related functionality.
     *
     * Note: A namespace naming of `crypto` leads to collisions, probably with
     *       the default WebCrypto namespace. Therefore the name `crypt` only.
     */
    var ns = {};
    var logger = MegaLogger.getLogger('crypt');
    ns._logger = logger;

    // TODO: Eventually migrate all functionality into this name space.

    /** Mapping of public key types to their attribute names. */
    ns.PUBKEY_ATTRIBUTE_MAPPING = {
        Ed25519: 'puEd255',
        Cu25519: 'puCu255',
        RSA: null
    };

    /** Mapping of private key types to their attribute names in the keyring. */
    ns.PRIVKEY_ATTRIBUTE_MAPPING = {
        Ed25519: 'prEd255',
        Cu25519: 'prCu255',
        RSA: null
    };

    /** Mapping of public key types to their signature attribute names. */
    ns.PUBKEY_SIGNATURE_MAPPING = {
        Cu25519: 'sigCu255',
        RSA: 'sigPubk'
    };

    /** Maps the storage variable for a public key type. */
    ns.PUBKEY_VARIABLE_MAPPING  = {
        Ed25519: 'u_pubEd25519',
        Cu25519: 'u_pubCu25519',
        RSA: null
    };

    /** Maps the storage variable for a private key type. */
    ns.PRIVKEY_VARIABLE_MAPPING  = {
        Ed25519: 'u_privEd25519',
        Cu25519: 'u_privCu25519',
        RSA: 'u_privk'
    };

    /**
     * Returns the cache variable for a public key type.
     *
     * @param keyType {string}
     *     Key type of pub key. Can be one of 'Ed25519', 'Cu25519' or 'RSA'.
     * @return {Object}
     *     The cache variable object.
     */
    ns.getPubKeyCacheMapping = function(keyType) {
        switch (keyType) {
            case 'Ed25519':
                return pubEd25519;
            case 'Cu25519':
                return pubCu25519;
            case 'RSA':
                return u_pubkeys;
        }
    };


    /**
     * Retrieves a users' pub keys through the Mega API.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param keyType {string}
     *     Key type of pub key. Can be one of 'Ed25519', 'Cu25519' or 'RSA'.
     * @param userData {string}
     *     Optional argument, any provided data will be passed to the fullfiled promise.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.getPubKeyAttribute = function(userhandle, keyType, userData) {
        // According to doShare() this can be an email for RSA keyType
        if (keyType !== 'RSA' || String(userhandle).indexOf('@') < 1) {
            assertUserHandle(userhandle);
        }
        if (typeof ns.PUBKEY_ATTRIBUTE_MAPPING[keyType] === 'undefined') {
            throw new Error('Unsupported key type to retrieve: ' + keyType);
        }

        // Make the promise to execute the API code.
        var masterPromise = new MegaPromise();

        if (keyType === 'RSA') {
            var cacheKey = userhandle + "_@uk";

            var myCtx = {};
            /** Function to settle the promise for the RSA pub key attribute. */
            var __settleFunction = function(res, ctx, xhr, fromCache) {
                if (typeof res === 'object') {

                    var debugUserHandle = userhandle;
                    if (userhandle !== res.u) {
                        debugUserHandle += ' (' + res.u + ')';
                    }

                    var pubKey = crypto_decodepubkey(base64urldecode(res.pubk));

                    // cache it, the legacy way.
                    u_pubkeys[userhandle] = u_pubkeys[res.u] = pubKey;

                    logger.debug('Got ' + keyType + ' pub key of user '
                                 + debugUserHandle + ': ' + JSON.stringify(pubKey));

                    if (!fromCache && attribCache) {
                        // if an email was provided, cache it using the user-handle
                        if (String(userhandle).indexOf('@') > 0) {
                            cacheKey = res.u + "_@uk";
                        }
                        attribCache.setItem(cacheKey, JSON.stringify(res))
                            .always(function() {
                                masterPromise.resolve(pubKey, [res, userData]);
                            });
                    }
                    else {
                        masterPromise.resolve(pubKey, [res, userData]);
                    }
                }
                else {
                    logger.error(keyType + ' pub key for ' + userhandle
                                 + ' could not be retrieved: ' + res);
                    masterPromise.reject(res, [res, userData]);
                }
            };

            // Assemble context for this async API request.
            myCtx.u = userhandle;
            myCtx.callback = __settleFunction;

            var __retrieveRsaKeyFunc = function() {
                // Fire it off.
                api_req({ a: 'uk', u: userhandle }, myCtx);
            };

            if (attribCache) {
                attribCache.getItem(cacheKey)
                    .done(function(r) {
                        if (r && r.length !== 0) {
                            __settleFunction(JSON.parse(r), undefined, undefined, true);
                        } else {
                            __retrieveRsaKeyFunc();
                        }
                    })
                    .fail(function() {
                        __retrieveRsaKeyFunc();
                    });
            }
            else {
                __retrieveRsaKeyFunc();
            }
        }
        else {
            var pubKeyPromise = mega.attr.get(userhandle,
                                             ns.PUBKEY_ATTRIBUTE_MAPPING[keyType],
                                             true, false);
            pubKeyPromise.done(function(result) {
                result = base64urldecode(result);
                ns.getPubKeyCacheMapping(keyType)[userhandle] = result;
                logger.debug('Got ' + keyType + ' pub key of user ' + userhandle + '.');
                masterPromise.resolve(result);
            });
            masterPromise.linkFailTo(pubKeyPromise);
        }

        return masterPromise;
    };


    /**
     * Checks the integrity (through the authring) of users' pub keys and
     * returns the authentication method used for that key.
     *
     * @private
     * @param userhandle {String}
     *     Mega user handle.
     * @param pubKey {(String|Array)}
     *     Public key in the form of a byte string or array (RSA keys).
     * @param keyType {String}
     *     Key type of pub key. Can be one of 'Ed25519', 'Cu25519' or 'RSA'.
     * @return {Number}
     *     Authentication record, `null` if not recorded, and `false`
     *     if fingerprint verification fails.
     */
    ns._getPubKeyAuthentication = function(userhandle, pubKey, keyType) {
        var recorded = authring.getContactAuthenticated(userhandle, keyType);
        var fingerprint = authring.computeFingerprint(pubKey, keyType, 'string');
        if (recorded === false) {
            return null;
        }
        else if (recorded
                 && authring.equalFingerprints(recorded.fingerprint, fingerprint) === false) {
            logger.warn('Error verifying authenticity of ' + keyType +' pub key: '
                         + 'fingerprint does not match previously authenticated one!');
            return false;
        }

        return recorded.method;
    };


    /**
     * Verifies a public key signature.
     *
     * @private
     * @param signature {string}
     *     Signature string.
     * @param pubKey {string}
     *     Public key to verify.
     * @param keyType {string}
     *     Key type of pub key. Can be one of 'Cu25519' or 'RSA'.
     * @param signingKey {string}
     *     Ed25519 key needed to verify the signature.
     * @return {MegaPromise}
     *     The signature verification result. true for success, false for
     *     failure and null for a missing signature.
     */
    ns._checkSignature = function(signature, pubKey, keyType, signingKey) {
        if (signature === '') {
            return MegaPromise.resolve(null);
        }

        return authring.verifyKey(signature, pubKey, keyType, signingKey);
    };


    /**
     * Used for caching .getPubKey requests which are in progress (by reusing MegaPromises)
     */
    ns._pubKeyRetrievalPromises = {};

    /**
     * Caching public key retrieval utility.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param keyType {string}
     *     Key type of pub key. Can be one of 'Ed25519', 'Cu25519' or 'RSA'.
     * @param callback {function}
     *     Callback function to call upon completion of operation. The
     *     callback requires two parameters: `value` (an object
     *     containing the public in `pubkey` and its authencation
     *     state in `authenticated`). `value` will be `false` upon a
     *     failed request.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is
     *     settled.  Can be used to use promises instead of callbacks
     *     for asynchronous dependencies.
     */
    ns.getPubKey = function(userhandle, keyType, callback) {
        assertUserHandle(userhandle);

        // if there is already a getPubKey request in progress, return it, instead of creating a brand new one
        if (ns._pubKeyRetrievalPromises[userhandle + "_" + keyType]) {
            var promise = ns._pubKeyRetrievalPromises[userhandle + "_" + keyType];
            if (callback) {
                promise.done(function(res) {
                    callback(res);
                });
            }
            return promise;
        }
        // This promise will be the one which is going to be returned.
        var masterPromise = new MegaPromise();

        // manage the key retrieval cache during the request is being processed
        ns._pubKeyRetrievalPromises[userhandle + "_" + keyType] = masterPromise;

        // and then clean it up after the request is done.
        masterPromise.always(function() {
            delete ns._pubKeyRetrievalPromises[userhandle + "_" + keyType];
        });

        /** If a callback is passed in, ALWAYS call it when the master promise
         * is resolved. */
        var __callbackAttachAfterDone = function(aPromise) {
            if (callback) {
                aPromise.done(function __classicCallback(result) {
                    logger.debug('Calling callback');
                    callback(result);
                });
            }
        };

        if (
                authring.hadInitialised() === false ||
                typeof u_authring === 'undefined'
        ) {
            // Need to initialise the authentication system (authring).
            logger.debug('Will wait for the authring to initialise first.', 'Tried to access: ', userhandle, keyType);
            var authringLoadingPromise = authring.initAuthenticationSystem();
            masterPromise.linkFailTo(authringLoadingPromise);

            // Now, with the authring loaded, link recursively to getPubKey again.
            authringLoadingPromise.done(function() {
                var tmpPromise;
                // if already cached, swap the request promise!
                if (ns._pubKeyRetrievalPromises[userhandle + "_" + keyType]) {
                    tmpPromise = ns._pubKeyRetrievalPromises[userhandle + "_" + keyType];
                    delete ns._pubKeyRetrievalPromises[userhandle + "_" + keyType];
                }

                var newPromise = ns.getPubKey(userhandle, keyType);

                if (tmpPromise) {
                    tmpPromise.linkDoneAndFailTo(newPromise);
                }

                masterPromise.linkDoneAndFailTo(newPromise);
            });
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        }

        // Some things we need to progress.
        var pubKeyCache = ns.getPubKeyCacheMapping(keyType);
        var authMethod;
        var newAuthMethod;
        var fingerprint;

        // Get out quickly if the key is cached.
        if (pubKeyCache[userhandle]) {
            masterPromise.resolve(pubKeyCache[userhandle]);
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        }

        // And now for non-cached keys.

        /** Persist potential changes in authentication, call callback and exit. */
        var __finish = function(pubKey, authMethod, newAuthMethod) {
            if (typeof newAuthMethod !== 'undefined' && newAuthMethod !== authMethod) {
                authring.setContactAuthenticated(userhandle, fingerprint, keyType,
                                                 newAuthMethod,
                                                 authring.KEY_CONFIDENCE.UNSURE);
            }
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        };

        // Get the pub key and update local variable and the cache.
        var getPubKeyPromise = ns.getPubKeyAttribute(userhandle, keyType);

        getPubKeyPromise.done(function __resolvePubKey(result) {
            var pubKey = result;
            authMethod = ns._getPubKeyAuthentication(userhandle, pubKey, keyType);
            fingerprint = authring.computeFingerprint(pubKey, keyType, 'string');
            if (keyType === 'Ed25519') {
                // Treat Ed25519 pub keys.
                if (authMethod === false) {
                    // Something is dodgy: Choke!
                    var authRecord = authring.getContactAuthenticated(userhandle, keyType);
                    ns._showFingerprintMismatchException(userhandle, keyType, authMethod,
                                                         authRecord.fingerprint,
                                                         fingerprint);
                    newAuthMethod = undefined;
                    masterPromise.reject(EINTERNAL);
                }
                else {
                    // Newly seen key, record it.
                    if (authMethod === null) {
                        newAuthMethod = authring.AUTHENTICATION_METHOD.SEEN;
                    }
                    pubKeyCache[userhandle] = pubKey;
                    masterPromise.resolve(pubKey);
                }

                // Finish off.
                __finish(pubKey, authMethod, newAuthMethod);

                return;
            }
        });

        // Get Ed25519 key and signature to verify for all non-Ed25519 pub keys.

        /**
         * Verify signature of signed pub keys.
         *
         * @param {Array} result  This is an array of arrays (`arguments`) for each
         *                        resolved promise as processed by MegaPromise.all()
         * @private
         */
        var __resolveSignatureVerification = function(result) {
            var pubKey = result[0];
            if (keyType === 'RSA') {
                // getPubKeyAttribute returned more than a single argument
                pubKey = pubKey[0];
            }
            var signingKey = result[1];
            var signature = base64urldecode(result[2]);
            ns._checkSignature(signature, pubKey, keyType, signingKey)
                .done(function(signatureVerification) {
                    if (authMethod === false) {
                        // Authring check fails, but could be a new key.
                        if (signatureVerification === true) {
                            // Record good (new) signature.
                            newAuthMethod = authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED;
                            pubKeyCache[userhandle] = pubKey;
                            masterPromise.resolve(pubKey);
                        }
                        else {
                            // Mismatch on authring, but no new signature,
                            // or failed signature verification: Choke!
                            newAuthMethod = undefined;
                            ns._showKeySignatureFailureException(userhandle, keyType);
                            masterPromise.reject(EINTERNAL);
                        }
                    }
                    else {
                        // Not seen previously or not verified, yet.
                        if (signatureVerification === null) {
                            var authRecord = authring.getContactAuthenticated(userhandle, keyType);
                            if ((authRecord === false) || (fingerprint === authRecord.fingerprint)) {
                                // Can only record it seen.
                                newAuthMethod = authring.AUTHENTICATION_METHOD.SEEN;
                                pubKeyCache[userhandle] = pubKey;
                                masterPromise.resolve(pubKey);
                            }
                            else {
                                newAuthMethod = undefined;
                                ns._showFingerprintMismatchException(userhandle, keyType, authMethod,
                                    authRecord.fingerprint,
                                    fingerprint);
                                masterPromise.reject(EINTERNAL);
                            }
                        }
                        else if (signatureVerification === true) {
                            // Record good signature.
                            newAuthMethod = authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED;
                            pubKeyCache[userhandle] = pubKey;
                            masterPromise.resolve(pubKey);
                        }
                        else {
                            // Failed signature verification: Choke!
                            ns._showKeySignatureFailureException(userhandle, keyType);
                        }
                    }

                    // Finish off.
                    __finish(pubKey, authMethod, newAuthMethod);
                });
        };

        if (keyType === 'Ed25519') {
            masterPromise.linkFailTo(getPubKeyPromise);
        }
        else {
            var pubEd25519KeyPromise = ns.getPubKey(userhandle, 'Ed25519');
            var signaturePromise = mega.attr.get(userhandle,
                                                    ns.PUBKEY_SIGNATURE_MAPPING[keyType],
                                                    true, false);

            // Signing key and signature required for verification.
            var signatureVerificationPromise = MegaPromise.all([getPubKeyPromise,
                                                                pubEd25519KeyPromise,
                                                                signaturePromise]);

            signatureVerificationPromise.done(__resolveSignatureVerification);
            masterPromise.linkFailTo(signatureVerificationPromise);
        }

        return masterPromise;
    };

    /**
     * Cached Ed25519 public key retrieval utility.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param callback {function}
     *     Callback function to call upon completion of operation. The
     *     callback requires two parameters: `value` (an object
     *     containing the public in `pubkey` and its authencation
     *     state in `authenticated`). `value` will be `false` upon a
     *     failed request.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is
     *     settled.  Can be used to use promises instead of callbacks
     *     for asynchronous dependencies.
     */
    ns.getPubEd25519 = function(userhandle, callback) {
        assertUserHandle(userhandle);
        return ns.getPubKey(userhandle, 'Ed25519', callback);
    };


    /**
     * Cached Curve25519 public key retrieval utility. If the key is cached, no API
     * request will be performed. The key's authenticity is validated through
     * the tracking in the authring and signature verification.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param [callback] {function}
     *     (Optional) Callback function to call upon completion of operation. The callback
     *     requires one parameter: the actual public Cu25519 key. The user handle is
     *     passed as a second parameter, and may be obtained that way if the call
     *     back supports it.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     The promise returns the Curve25519 public key.
     */
    ns.getPubCu25519 = function(userhandle, callback) {
        assertUserHandle(userhandle);
        return ns.getPubKey(userhandle, 'Cu25519', callback);
    };


    /**
     * Cached RSA public key retrieval utility. If the key is cached, no API
     * request will be performed. The key's authenticity is validated through
     * the tracking in the authring and signature verification.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param [callback] {function}
     *     (Optional) Callback function to call upon completion of operation. The callback
     *     requires one parameter: the actual public RSA key. The user handle is
     *     passed as a second parameter, and may be obtained that way if the call
     *     back supports it.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     The promise returns the RSA public key.
     */
    ns.getPubRSA = function(userhandle, callback) {
        assertUserHandle(userhandle);
        return ns.getPubKey(userhandle, 'RSA', callback);
    };


    /**
     * Computes a user's Ed25519 key finger print. This function uses the
     * `pubEd25519` object for caching.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param format {string}
     *     Format in which to return the fingerprint. Valid values: "hex" and
     *     "string" (default: "hex").
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is
     *     settled.
     */
    ns.getFingerprintEd25519 = function(userhandle, format) {
        assertUserHandle(userhandle);
        // This promise will be the one which is going to be returned.
        var masterPromise = new MegaPromise();

        if (pubEd25519[userhandle]) {
            // It's cached: Only compute fingerprint of it.
            var value = authring.computeFingerprint(pubEd25519[userhandle],
                                                    'Ed25519', format);
            var message = 'Got Ed25519 fingerprint for user "' + userhandle + '": ';
            if (format === 'string') {
                message += base64urlencode(value);
            }
            else {
                message += value;
            }
            logger.debug(message);

            // And resolve the promise with it.
            masterPromise.resolve(value);

            return masterPromise;
        }
        else {
            // Non-cached value: First get the public key.
            var keyLoadingPromise = crypt.getPubEd25519(userhandle);

            // Recursively link to .getFingerprintEd25519 as we now have the
            // key cached.
            keyLoadingPromise.done(function() {
                var recursionPromise = ns.getFingerprintEd25519(userhandle, format);
                masterPromise.linkDoneAndFailTo(recursionPromise);
            });

            return masterPromise;
        }
    };


    /**
     * Stores a public key for a contact and notify listeners.
     *
     * @param pubKey {string}
     *     Public key in byte string form.
     * @param keyType {string}
     *     Key type to set. Allowed values: 'Ed25519', 'Cu25519'.
     */
    ns.setPubKey = function(pubKey, keyType) {
        var keyCache = ns.getPubKeyCacheMapping(keyType);
        if (typeof keyCache === 'undefined') {
            throw new Error('Illegal key type to set: ' + keyType);
        }
        logger.debug('Setting ' + keyType + ' public key', u_handle, pubKey);
        keyCache[u_handle] = pubKey;
        Soon(function __setPubKey() {
            mBroadcaster.sendMessage(keyType);
        });
    };


    /**
     * Derives the public key from a private key.
     *
     * @param privKey {String}
     *     Private key in byte string form.
     * @param keyType {String}
     *     Key type to set. Allowed values: 'Ed25519', 'Cu25519'.
     * @return {String}
     *     Corresponding public key in byte string form. `undefined` for
     *     unsupported key types.
     */
    ns.getPubKeyFromPrivKey = function(privKey, keyType) {
        var result;
        if (keyType === 'Ed25519') {
            result = nacl.sign.keyPair.fromSeed(
                asmCrypto.string_to_bytes(privKey)).publicKey;

            return asmCrypto.bytes_to_string(result);
        }
        else if (keyType === 'Cu25519') {
            result = nacl.scalarMult.base(
                asmCrypto.string_to_bytes(privKey));

            return asmCrypto.bytes_to_string(result);
        }

        // Fall through if we don't know how to treat a key (yet).
        logger.error('Unsupported key type for deriving a public from a private key: ' + keyType);

        return;
    };


    /**
     * Converts a string to a hexadecimal string
     * @param {String} text The string to convert
     * @returns {String} Returns the string as hexadecimal string e.g. ac9da63...
     */
    ns.stringToHex = function(text) {

        var bytes = asmCrypto.string_to_bytes(text);
        var hex = asmCrypto.bytes_to_hex(bytes);

        return hex;
    };


    /**
     * Shows the fingerprint warning dialog.
     *
     * @private
     * @param {String} userHandle
     *     The user handle e.g. 3nnYu_071I3.
     * @param {String} keyType
     *     Type of the public key the fingerprint results from. One of
     *     'Ed25519', 'Cu25519' or 'RSA'.)
     * @param {Number} method
     *     The key comparison method (any of the options in
     *     authring.AUTHENTICATION_METHOD).
     * @param {String} prevFingerprint
     *     The previously seen or verified fingerprint.
     * @param {String} newFingerprint
     *     The new fingerprint.
     */
    ns._showFingerprintMismatchException = function(userHandle, keyType,
                                                    method, prevFingerprint,
                                                    newFingerprint) {

        // Log occurrence of this dialog.
        api_req({
            a: 'log',
            e: 99606,
            m: 'Fingerprint dialog shown to user for key ' + keyType
               + ' for user ' + userHandle
        });

        // Keep format consistent
        prevFingerprint = (prevFingerprint.length === 40) ? prevFingerprint : ns.stringToHex(prevFingerprint);
        newFingerprint = (newFingerprint.length === 40) ? newFingerprint : ns.stringToHex(newFingerprint);

        // Show warning dialog if it hasn't been locally overriden (as needed by poor user Fiup who added 600
        // contacts during the 3 week broken period and none of them are signing back in to heal their stuff).
        if (localStorage.hideCryptoWarningDialogs !== '1') {
            var showDialog = function() {
                mega.ui.CredentialsWarningDialog.singleton(userHandle, keyType, prevFingerprint, newFingerprint);
            };

            if (fminitialized) {
                showDialog();
            }
            else {
                mBroadcaster.once('fm:initialized', showDialog);
            }
        }

        // Remove the cached key, so the key will be fetched and checked against
        // the stored fingerprint again next time.
        delete ns.getPubKeyCacheMapping(keyType)[userHandle];

        logger.warn(keyType + ' fingerprint does not match the previously authenticated one!\n'
            + 'Previous fingerprint: ' + prevFingerprint
            + '.\nNew fingerprint: ' + newFingerprint + '.');
    };


    /**
     * Shows the key signature failure warning dialog.
     *
     * @private
     * @param {String} userhandle
     *     The user handle e.g. 3nnYu_071I3.
     * @param {String} keyType
     *     Type of the public key the signature failed for. One of
     *     'Cu25519' or 'RSA'.)
     */
    ns._showKeySignatureFailureException = function(userHandle, keyType) {

        // Log occurrence of this dialog.
        api_req({
            a: 'log',
            e: 99607,
            m: 'Signature/MITM warning dialog shown to user for key ' + keyType
               + ' for user ' + userHandle
        });

        // Show warning dialog if it hasn't been locally overriden (as need by poor user Fiup who added 600
        // contacts during the 3 week broken period and none of them are signing back in to heal their stuff).
        if (localStorage.hideCryptoWarningDialogs !== '1') {
            var showDialog = function() {
                mega.ui.KeySignatureWarningDialog.singleton(userHandle, keyType);
            };

            if (fminitialized) {
                showDialog();
            }
            else {
                mBroadcaster.once('fm:initialized', showDialog);
            }
        }

        logger.error(keyType + ' signature does not verify for user '
                     + userHandle + '!');
    };


    /**
     * Encrypts a cleartext string with the supplied public key.
     *
     * @param {String} cleartext
     *     Clear text to encrypt.
     * @param {Array} pubkey
     *     Public encryption key (in the usual internal format used).
     * @param {Boolean} utf8convert
     *     Convert cleartext from unicode to UTF-8 before encryption
     *     (default: false).
     * @return {String}
     *     Encrypted cipher text.
     */
    ns.rsaEncryptString = function(cleartext, pubkey, utf8convert) {

        cleartext = utf8convert ? to8(cleartext) : cleartext;
        var lengthString = String.fromCharCode(cleartext.length >> 8)
                         + String.fromCharCode(cleartext.length & 0xff);

        return crypto_rsaencrypt(lengthString + cleartext, pubkey);
    };

    /**
     * Decrypts a ciphertext string with the supplied private key.
     *
     * @param {String} ciphertext
     *     Cipher text to decrypt.
     * @param {Array} privkey
     *     Private encryption key (in the usual internal format used).
     * @param {Boolean} utf8convert
     *     Convert cleartext from UTF-8 to unicode after decryption
     *     (default: false).
     * @return {String}
     *     Decrypted clear text or false in case of an error
     */
    ns.rsaDecryptString = function(ciphertext, privkey, utf8convert) {

        var cleartext = crypto_rsadecrypt(ciphertext, privkey);
        if (cleartext === false) return false;

        var length = (cleartext.charCodeAt(0) << 8) | cleartext.charCodeAt(1);
        cleartext = cleartext.substring(2, length + 2);

        return utf8convert ? from8(cleartext) : cleartext;
    };


    return ns;
}());

window.URL = window.URL || window.webkitURL;

var have_ab = typeof ArrayBuffer !== 'undefined' && typeof DataView !== 'undefined';
var use_workers = have_ab && typeof Worker !== 'undefined';

if (is_extension && typeof localStorage.use_ssl === 'undefined') {
    localStorage.use_ssl = 0;
}

// if (is_extension || +localStorage.use_ssl === 0) {
if (is_chrome_firefox) {
    var use_ssl = 0;
}
else if (+localStorage.use_ssl === 0) {
    var use_ssl = (navigator.userAgent.indexOf('Chrome/') !== -1
        && parseInt(navigator.userAgent.split('Chrome/').pop()) > 40) ? 1 : 0;
}
else {
    if ((navigator.appVersion.indexOf('Safari') > 0) && (navigator.appVersion.indexOf('Version/5') > 0)) {
        use_workers = false;
        have_ab = false;
    }

    var use_ssl = ssl_needed();
    if (!use_ssl && localStorage.use_ssl) {
        use_ssl = 1;
    }
    else {
        use_ssl++;
    }
}

// general errors
var EINTERNAL = -1;
var EARGS = -2;
var EAGAIN = -3;
var ERATELIMIT = -4;
var EFAILED = -5;
var ETOOMANY = -6;
var ERANGE = -7;
var EEXPIRED = -8;

// FS access errors
var ENOENT = -9;
var ECIRCULAR = -10;
var EACCESS = -11;
var EEXIST = -12;
var EINCOMPLETE = -13;

// crypto errors
var EKEY = -14;

// user errors
var ESID = -15;
var EBLOCKED = -16;
var EOVERQUOTA = -17;
var ETEMPUNAVAIL = -18;
var ETOOMANYCONNECTIONS = -19;
var EGOINGOVERQUOTA = -24;

// custom errors
var ETOOERR = -400;

function ssl_needed() {
    var ssl_opt = ['Chrome/'];
    var ssl_off = ['Firefox/14', 'Firefox/15', 'Firefox/16', 'Firefox/17'];
    for (var i = ssl_opt.length; i--;) {
        if (navigator.userAgent.indexOf(ssl_opt[i]) >= 0) {
            return parseInt(navigator.userAgent.split(ssl_opt[i]).pop()) > 40;
        }
    }
    for (var i = ssl_off.length; i--;) {
        if (navigator.userAgent.indexOf(ssl_off[i]) >= 0) {
            return -1;
        }
    }
    return 1;
}

// convert user-supplied password array
function prepare_key(a) {
    var i, j, r;
    var aes = [];
    var pkey = [0x93C467E3, 0x7DB0C7A4, 0xD1BE3F81, 0x0152CB56];

    for (j = 0; j < a.length; j += 4) {
        var key = [0, 0, 0, 0];
        for (i = 0; i < 4; i++) {
            if (i + j < a.length) {
                key[i] = a[i + j];
            }
        }
        aes.push(new sjcl.cipher.aes(key));
    }

    for (r = 65536; r--;) {
        for (j = 0; j < aes.length; j++) {
            pkey = aes[j].encrypt(pkey);
        }
    }

    return pkey;
}

// prepare_key with string input
function prepare_key_pw(password) {
    return prepare_key(str_to_a32(password));
}

function a32_to_base64(a) {
    return base64urlencode(a32_to_str(a));
}

var firefox_boost = is_chrome_firefox && !!localStorage.fxboost;

// ArrayBuffer to binary string
var ab_to_str = function abToStr1(ab) {
    return ab.buffer;
};

if (firefox_boost) {
    ab_to_str = mozAB2S;
}
else if (have_ab) {
    ab_to_str = function abToStr2(ab) {
        var u8 = new Uint8Array(ab);

        /*if (u8.length < 0x10000) {
         return String.fromCharCode.apply(String, u8);
         }*/

        var b = '';
        for (var i = 0; i < u8.length; i++) {
            b = b + String.fromCharCode(u8[i]);
        }

        return b;
    };
}

// random number between 0 .. n -- based on repeated calls to rc
function rand(n) {
    var r = new Uint32Array(1);
    asmCrypto.getRandomValues(r);
    return r[0] % n; // <- oops, it's uniformly distributed only when `n` divides 0x100000000
}

function crypto_rsagenkey() {
    var $promise = new MegaPromise();
    var logger = MegaLogger.getLogger('crypt');

    var startTime = new Date();

    if (typeof msCrypto !== 'undefined' && msCrypto.subtle) {
        var ko = msCrypto.subtle.generateKey({
            name: 'RSAES-PKCS1-v1_5',
            modulusLength: 2048
        }, true);
        ko.oncomplete = function () {
            ko = msCrypto.subtle.exportKey('jwk', ko.result.privateKey);
            ko.oncomplete = function () {
                var jwk = JSON.parse(asmCrypto.bytes_to_string(new Uint8Array(ko.result)));
                _done(['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'].map(function (x) {
                    return base64urldecode(jwk[x])
                }));
            };
        };
    }
    else {
        var w = new Worker('keygen.js');

        w.onmessage = function (e) {
            w.terminate();
            _done(e.data);
        };

        var workerSeed = new Uint8Array(256);
        asmCrypto.getRandomValues(workerSeed);

        w.postMessage([2048, 257, workerSeed]);
    }

    function _done(k) {
        var endTime = new Date();
        logger.debug("Key generation took "
                     + (endTime.getTime() - startTime.getTime()) / 1000.0
                     + " seconds!");

        u_setrsa(k)
            .done(function () {
                $promise.resolve(k);
            });
    }

    return $promise;
}

/**
 * Converts a Unicode string to a UTF-8 cleanly encoded string.
 *
 * @param {String} unicode
 *     Browser's native string encoding.
 * @return {String}
 *     UTF-8 encoded string (8-bit characters only).
 */
var to8 = firefox_boost ? mozTo8 : function (unicode) {
    return unescape(encodeURIComponent(unicode));
};

// API command queueing
// All commands are executed in sequence, with no overlap
// FIXME: show user warning after backoff > 1000

var apixs = [];

function api_reset() {
    "use strict";

    // user account API interface
    api_init(0, 'cs');

    // folder link API interface
    api_init(1, 'cs');

    // active view's SC interface (chunked mode)
    api_init(2, 'sc', { '{[a{'      : sc_packet,     // SC command
                        '{[a{{t[f{' : sc_node,       // SC node
                        '{'         : sc_residue,    // SC residue
                        '#'         : api_esplit }); // numeric error code


    // user account event notifications
    api_init(3, 'sc');

    // active view's initial tree fetch (chunked mode)
    api_init(4, 'cs', { '[{[ok0{' : tree_ok0,        // tree shareownerkey
                        '[{[f{'   : tree_node,       // tree node
                        '['       : tree_residue,    // tree residue
                        '#'       : api_esplit });   // numeric error code
}

mBroadcaster.once('boot_done', api_reset);

// a chunked request received a purely numerical response - handle it the usual way
function api_esplit(e) {
    api_reqerror(this.q, e, false);
}

function api_setsid(sid) {
    "use strict";

    if (sid !== false) {
        watchdog.notify('setsid', sid);

        if (typeof dlmanager === 'object') {

            if (!dlmanager.onOverquotaWithAchievements) {
                if (dlmanager.isOverQuota) {

                    if (!dlmanager.isOverFreeQuota) {
                        dlmanager.uqFastTrack = 1;
                        delay('overquota:uqft', dlmanager._overquotaInfo.bind(dlmanager), 900);
                    }
                }

                if (typeof dlmanager.onLimitedBandwidth === 'function') {
                    dlmanager.onLimitedBandwidth();
                }
            }
        }
        sid = 'sid=' + sid;
    }
    else {
        sid = '';
    }

    apixs[0].sid = sid;
    apixs[2].sid = sid;
    apixs[3].sid = sid;
    apixs[4].sid = sid;
}

function api_setfolder(h) {
    "use strict";

    h = 'n=' + h;

    if (u_sid) {
        h += '&sid=' + u_sid;
    }

    apixs[1].sid = h;
    apixs[2].sid = h;
    apixs[4].sid = h;
}

function stopapi() {
    "use strict";

    for (var i = apixs.length; i--;) {
        api_cancel(apixs[i]);
        apixs[i].cmds = [[], []];
        apixs[i].ctxs = [[], []];
    }
}

function api_cancel(q) {
    "use strict";

    if (q) {
        if (q.xhr) {
            // setting the "cancelled" flag ensures that
            // subsequent onerror/onload/onprogress callbacks are ignored.
            q.xhr.cancelled = true;
            if (q.xhr.abort) q.xhr.abort();
            q.xhr = false;
        }
        if (q.timer) {
            clearTimeout(q.timer);
        }
    }
}

function api_init(channel, service, split) {
    "use strict";

    if (apixs[channel]) {
        api_cancel(apixs[channel]);
    }

    apixs[channel] = {
        c: channel,                 // channel
        cmds: [[], []],             // queued/executing commands (double-buffered)
        ctxs: [[], []],             // associated command contexts
        i: 0,                       // currently executing buffer
        seqno: -Math.floor(Math.random() * 0x100000000), // unique request start ID
        xhr: false,                 // channel XMLHttpRequest
        timer: false,               // timer for exponential backoff
        failhandler: api_reqfailed, // request-level error handler
        backoff: 0,                 // timer backoff
        service: service,           // base URI component
        sid: '',                    // sid URI component (optional)
        split: split,               // associated JSON splitter rules, presence triggers progressive/chunked mode
        splitter: false,            // JSONSplitter instance implementing .split
        rawreq: false,
        setimmediate: false
    };
}

// queue request on API channel
function api_req(request, context, channel) {
    "use strict";

    if (channel === undefined) {
        channel = 0;
    }

    if (d) console.log("API request on " + channel + ": " + JSON.stringify(request));

    if (context === undefined) {
        context = Object.create(null);
    }

    var q = apixs[channel];

    q.cmds[q.i ^ 1].push(request);
    q.ctxs[q.i ^ 1].push(context);

    if (!q.setimmediate) {
        q.setimmediate = setTimeout(api_proc, 0, q);
    }
}

// indicates whether this is a Firefox supporting the moz-chunked-*
// responseType or a Chrome derivative supporting the fetch API
// values: unknown: -1, no: 0, moz-chunked: 1, fetch: 2
// FIXME: check for fetch on !Firefox, not just on Chrome
var chunked_method = window.chrome ? (self.fetch ? 2 : 0) : -1;

if (typeof Uint8Array.prototype.indexOf !== 'function') {
    if (d) {
        console.debug('No chunked method on this browser: ' + ua);
    }
    chunked_method = 0;
}

// this kludge emulates moz-chunked-arraybuffer with XHR-style callbacks
function chunkedfetch(xhr, uri, postdata) {
    "use strict";

    fetch(uri, { method: 'POST', body: postdata }).then(function(response) {
        var reader = response.body.getReader();
        var evt = { loaded: 0 };
        xhr.status = response.status;
        xhr.totalBytes = response.headers.get('Original-Content-Length');

        function chunkedread() {
            return reader.read().then(function(r) {
                if (r.done) {
                    // signal completion through .onload()
                    xhr.response = null;
                    xhr.onload();
                }
                else {
                    // feed received chunk to JSONSplitter via .onprogress()
                    evt.loaded += r.value.length;
                    xhr.response = r.value;
                    xhr.onprogress(evt);
                    chunkedread();
                }
            });
        }

        chunkedread();
    }).catch(function(err) {
        console.error("Fetch error: ", err);
        xhr.onerror();
    });
}

// send pending API request on channel q
function api_proc(q) {
    "use strict";

    var logger = d && MegaLogger.getLogger('crypt');
    if (q.setimmediate) {
        clearTimeout(q.setimmediate);
        q.setimmediate = false;
    }

    if (q.ctxs[q.i].length || !q.ctxs[q.i ^ 1].length) {
        return;
    }

    q.i ^= 1;

    if (!q.xhr) {
        // we need a real XHR only if we don't use fetch for this channel
        q.xhr = (!q.split || chunked_method != 2) ? getxhr() : Object.create(null);

        q.xhr.q = q;

        q.xhr.onerror = function () {
            if (!this.cancelled) {
                if (logger) {
                    logger.debug("API request error - retrying");
                }
                api_reqerror(q, EAGAIN, this.status);
            }
        };

        // JSON splitters are keen on processing the data as soon as it arrives,
        // so route .onprogress to it.
        if (q.split) {
            q.xhr.onprogress = function(evt) {
                if (!this.cancelled) {
                    // caller wants progress updates? give caller progress updates!
                    if (this.q.ctxs[this.q.i][0] && this.q.ctxs[this.q.i][0].progress) {
                        var progressPercent = 0;
                        var bytes = evt.total || this.totalBytes;

                        if (!bytes) {
                            // this may throw an exception if the header doesn't exist
                            try {
                                bytes = this.getResponseHeader('Original-Content-Length');
                                this.totalBytes = bytes;
                            }
                            catch (e) {}
                        }

                        if (evt.loaded > 0 && bytes) {
                            this.q.ctxs[this.q.i][0].progress(evt.loaded / bytes * 100);
                        }
                    }

                    // update number of bytes received in .onprogress() for subsequent check
                    // in .onload() whether it contains more data

                    var chunk = this.response;

                    // is this an ArrayBuffer? turn into a Uint8Array
                    if (!(chunk.length >= 0)) chunk = new Uint8Array(chunk);

                    if (!chunked_method) {
                        // unfortunately, we're receiving a growing response
                        this.q.received = chunk.length;
                    }
                    else {
                        // wonderful, we're receiving a chunked response
                        this.q.received += chunk.length;
                    }

                    // send incoming live data to splitter
                    // for maximum flexibility, the splitter ctx will be the XHR
                    if (!this.q.splitter.chunkproc(chunk, chunk.length === this.totalBytes)) {
                        // a JSON syntax error occurred: hard reload
                        fm_fullreload(this.q, 'onerror JSON Syntax Error');
                    }
                }
            };
        }

        q.xhr.onload = function onAPIProcXHRLoad() {
            if (!this.cancelled) {
                var t;
                var status = this.status;

                if (status == 200) {
                    var response = this.response;

                    // is this residual data that hasn't gone to the splitter yet?
                    if (this.q.splitter) {
                        // we process the full response if additional bytes were received
                        // FIXME: in moz-chunked transfers, if onload() can contain chars beyond
                        // the last onprogress(), send .substr(this.q.received) instead!
                        // otherwise, we send false to indicate no further input
                        // in all cases, set the inputcomplete flag to catch incomplete API responses
                        if (!this.q.splitter.chunkproc((response && response.length > this.q.received) ? response : false, true)) {
                            fm_fullreload(this.q, 'onload JSON Syntax Error');
                        }
                        return;
                    }

                    if (d && logger) {
                        if (d > 1 || !window.chrome || String(response).length < 512) {
                            logger.debug('API response: ', response);
                        }
                        else {
                            logger.debug('API response: ', String(response).substr(0, 512) + '...');
                        }
                    }

                    try {
                        t = JSON.parse(response);
                        if (response[0] == '{') {
                            t = [t];
                        }

                        status = true;
                    } catch (e) {
                        // bogus response, try again
                        if (d) {
                            logger.debug("Bad JSON data in response: " + response);
                        }
                        t = EAGAIN;
                    }
                }
                else {
                    if (d) {
                        logger.debug('API server connection failed (error ' + status + ')');
                    }
                    t = ERATELIMIT;
                }

                if (typeof t === 'object') {
                    var ctxs = this.q.ctxs[this.q.i];

                    for (var i = 0; i < ctxs.length; i++) {
                        var ctx = ctxs[i];

                        if (typeof ctx.callback === 'function') {
                            ctx.callback(t[i], ctx, this);
                        }
                    }

                    // reset state for next request
                    api_ready(this.q);
                    api_proc(this.q);
                }
                else {
                    api_reqerror(this.q, t, status);
                }
            }
        };
    }

    if (q.rawreq === false) {
        q.url = apipath + q.service
              + '?id=' + (q.seqno++)
              + '&' + q.sid
              + (q.split ? '&ec' : '')  // encoding: chunked if splitter attached
              + '&lang=' + lang         // selected language
              + mega.urlParams();       // additional parameters

        if (typeof q.cmds[q.i][0] === 'string') {
            q.url += '&' + q.cmds[q.i][0];
            q.rawreq = '';
        }
        else {
            q.rawreq = JSON.stringify(q.cmds[q.i]);
        }
    }

    api_send(q);
}

function api_send(q) {
    "use strict";

    var logger = d && MegaLogger.getLogger('crypt');
    q.timer = false;

    if (q.xhr === false) {
        if (logger) {
            logger.debug("API request aborted: " + q.rawreq + " to " + q.url);
        }
        return;
    }

    if (logger) {
        logger.debug("Sending API request: " + q.rawreq + " to " + q.url);
    }

    // reset number of bytes received and response size
    q.received = 0;
    delete q.xhr.totalBytes;

    q.xhr.cancelled = false;

    if (q.split && chunked_method == 2) {
        // use chunked fetch with JSONSplitter input type Uint8Array
        q.splitter = new JSONSplitter(q.split, q.xhr, true);
        chunkedfetch(q.xhr, q.url, q.rawreq);
    }
    else {
        // use legacy XHR API
        q.xhr.open('POST', q.url, true);

        if (q.split) {
            if (chunked_method) {
                // FIXME: use Fetch API if more efficient than this
                q.xhr.responseType = 'moz-chunked-arraybuffer';

                // first try? record success
                if (chunked_method < 0) {
                    chunked_method = q.xhr.responseType == 'moz-chunked-arraybuffer';
                }
            }

            // at this point, chunked_method being logically true implies arraybuffer
            q.splitter = new JSONSplitter(q.split, q.xhr, chunked_method);
         }

        q.xhr.send(q.rawreq);
    }
}

function api_reqerror(q, e, status) {
    if (e == EAGAIN || e == ERATELIMIT) {
        // request failed - retry with exponential backoff
        if (q.backoff) {
            q.backoff = Math.min(600000, q.backoff << 1);
        }
        else {
            q.backoff = 125+Math.floor(Math.random()*600);
        }

        q.timer = setTimeout(api_send, q.backoff, q);

        e = EAGAIN;
    }
    else {
        q.failhandler(q.c, e);
    }

    if (mega.flags & window.MEGAFLAG_LOADINGCLOUD) {
        if (status === true && e == EAGAIN) {
            mega.loadReport.EAGAINs++;
        }
        else if (status === 500) {
            mega.loadReport.e500s++;
        }
        else {
            mega.loadReport.errs++;
        }
    }
}

function api_ready(q) {
    q.rawreq = false;
    q.backoff = 0; // request succeeded - reset backoff timer
    q.cmds[q.i] = [];
    q.ctxs[q.i] = [];
}

var apiFloorCap = 3000;

function api_retry() {
    "use strict";

    for (var i = apixs.length; i--; ) {
        if (apixs[i].timer && apixs[i].backoff > apiFloorCap) {
            clearTimeout(apixs[i].timer);
            apixs[i].backoff = apiFloorCap;
            apixs[i].timer = setTimeout(api_send, apiFloorCap, apixs[i]);
        }
    }
}

function api_reqfailed(c, e) {
    // does this failure belong to a folder link, but not on the SC channel?
    if (apixs[c].sid[0] == 'n' && c != 2) {
        // yes: handle as a failed folder link access
        return folderreqerr(c, e);
    }

    if (e == ESID) {
        u_logout(true);
        Soon(function() {
            showToast('clipboard', l[19]);
        });
        loadingInitDialog.hide();
        loadSubPage('login');
    }
    else if (c == 2 && e == ETOOMANY) {
        // too many pending SC requests - reload from scratch
        fm_fullreload(this.q, 'ETOOMANY');
    }
    // if suspended account
    else if (e == EBLOCKED) {
        var queue = apixs[c];
        queue.rawreq = false;
        queue.cmds = [[], []];
        queue.ctxs = [[], []];
        queue.setimmediate = false;

        api_req({a: 'whyamiblocked'}, { callback: function whyAmIBlocked(reasonCode) {
            u_logout(true);

            // On clicking OK, log the user out and redirect to contact page
            loadingDialog.hide();

            var reasonText = l[7660];   // You have been suspended due to repeated copyright infringement.

            if (reasonCode === 100) {
                reasonText = l[7659];   // You have been suspended due to excess data usage.
            }
            else if (reasonCode === 300) {
                reasonText = l[8603];   // You have been suspended due to Terms of Service violations.
            }

            msgDialog('warninga', l[6789],
                reasonText,
                false,
                function() {
                    var redirectUrl = getAppBaseUrl() + '#contact';
                    window.location.replace(redirectUrl);
                }
            );
        }});
    }
}

var failxhr;
var failtime = 0;

function api_reportfailure(hostname, callback) {
    if (!hostname) {
        return Soon(callback);
    }

    var t = new Date().getTime();

    if (t - failtime < 60000) {
        return;
    }
    failtime = t;

    if (failxhr) {
        failxhr.abort();
    }

    failxhr = getxhr();
    failxhr.open('POST', apipath + 'pf?h', true);
    failxhr.callback = callback;

    failxhr.onload = function () {
        if (this.status === 200) {
            failxhr.callback();
        }
    };

    failxhr.send(hostname);
}

var waiturl;
var waitxhr;
var waitbackoff = 125;
var waittimeout;
var waitbegin;
var waitid = 0;
var cmsNotifHandler = localStorage.cmsNotificationID || 'Nc4AFJZK';

function stopsc() {
    "use strict";

    if (waitxhr && waitxhr.readyState !== waitxhr.DONE) {
        waitxhr.abort();
        waitxhr = false;
    }

    if (waittimeout) {
        clearTimeout(waittimeout);
        waittimeout = false;
    }
}

// if set, further sn updates are disallowed (the local state has become invalid)
function setsn(sn) {
    "use strict";

    // update sn in DB, triggering a "commit" of the current "transaction"
    if (fmdb) {
        attribCache.flush();
        fmdb.add('_sn', { i : 1, d : sn });
    }
}

// are we processing historical SC commands?
var initialscfetch;

// last step of the streamed SC response processing
function sc_residue(sc) {
    "use strict";

    if (sc.sn) {
        // enqueue new sn
        currsn = sc.sn;
        scq[scqhead++] = [{ a : '_sn', sn : currsn }];
        getsc(true);
        resumesc();
    }
    else if (sc.w) {
        if (initialscfetch) {
            // we have concluded the post-load SC fetch, as we have now
            // run out of new actionpackets: show filemanager!
            scq[scqhead++] = [{ a : '_fm' }];
            initialscfetch = false;
            resumesc();
        }

        // we're done, wait for more
        gettingsc = false;
        waiturl = sc.w;
        waittimeout = setTimeout(waitsc, waitbackoff);

        if ((mega.flags & window.MEGAFLAG_LOADINGCLOUD) && !mega.loadReport.recvAPs) {
            mega.loadReport.recvAPs       = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();
        }
    }
    else {
        // malformed SC response - take the conservative route and reload fully
        // FIXME: add one single retry if !sscount: Clear scq, clear worker state,
        // then reissue getsc() (difficult to get right - be cautious)
        return fm_fullreload(null, 'malformed SC response');
    }

    // (mandatory steps at the conclusion of a successful split response)
    api_ready(this.q);
    api_proc(this.q);
}

// getsc() serialisation (getsc() can be called anytime from anywhere if
// someone thinks that it is beneficial!)
var gettingsc;

// request new actionpackets and stream them to sc_packet() as they come in
// nodes in t packets are streamed to sc_node()
function getsc(force) {
    "use strict";

    if (force || !gettingsc) {
        gettingsc = true;

        if (waitxhr) {
            waitxhr.abort();
        }

        api_cancel(apixs[2]);   // retire existing XHR that may still be completing the request
        api_ready(apixs[2]);
        api_req('sn=' + currsn + '&ssl=1&e=' + cmsNotifHandler, {}, 2);
    }
}

function waitsc() {
    "use strict";

    var MAX_WAIT = 300000;
    var newid = ++waitid;

    stopsc();

    if (!waitxhr) {
        waitxhr = getxhr();
    }
    waitxhr.waitid = newid;

    waittimeout = setTimeout(waitsc, MAX_WAIT);

    waitxhr.onerror = function(ev) {
        if (d) {
            console.debug('waitsc.onerror', ev);
        }

        if (this.waitid === waitid) {
            clearTimeout(waittimeout);
            waitbackoff = Math.min(MAX_WAIT, waitbackoff << 1);
            waittimeout = setTimeout(waitsc, waitbackoff);
        }
    };

    waitxhr.onload = function(ev) {
        if (this.status !== 200) {
            this.onerror(ev);
        }
        else if (this.waitid === waitid) {
            stopsc();

            if ((Date.now() - waitbegin) < 1000) {
                waitbackoff = Math.min(MAX_WAIT, waitbackoff << 1);
            }
            else {
                waitbackoff = 250;
            }

            getsc();
        }
    };

    waitbegin = Date.now();
    waitxhr.open('POST', waiturl, true);
    waitxhr.send();
}
mBroadcaster.once('startMega', function() {
    'use strict';

    window.addEventListener('online', function(ev) {
        if (d) {
            console.info(ev);
        }
        api_retry();

        if (waiturl) {
            waitsc();
        }
    });

    var invisibleTime;
    document.addEventListener('visibilitychange', function(ev) {
        if (d) {
            console.info(ev, document.hidden);
        }

        if (document.hidden) {
            invisibleTime = Date.now();
        }
        else {
            invisibleTime = Date.now() - invisibleTime;

            if (mega.loadReport && !mega.loadReport.sent) {
                if (!mega.loadReport.invisibleTime) {
                    mega.loadReport.invisibleTime = 0;
                }
                mega.loadReport.invisibleTime += invisibleTime;
            }
        }
    });
});

function api_create_u_k() {
    u_k = Array(4); // static master key, will be stored at the server side encrypted with the master pw

    for (var i = 4; i--;) {
        u_k[i] = rand(0x100000000);
    }
}

// If the user triggers an action that requires an account, but hasn't logged in,
// we create an anonymous preliminary account. Returns userhandle and passwordkey for permanent storage.
function api_createuser(ctx, invitecode, invitename, uh) {
    var logger = MegaLogger.getLogger('crypt');
    var i;
    var ssc = Array(4); // session self challenge, will be used to verify password
    var req, res;

    if (!ctx.passwordkey) {
        ctx.passwordkey = Array(4);
        for (i = 4; i--;) {
            ctx.passwordkey[i] = rand(0x100000000);
        }
    }

    if (!u_k) {
        api_create_u_k();
    }

    for (i = 4; i--;) {
        ssc[i] = rand(0x100000000);
    }

    logger.debug("api_createuser - masterkey: " + u_k + " passwordkey: " + ctx.passwordkey);

    req = {
            a: 'up',
            k: a32_to_base64(encrypt_key(new sjcl.cipher.aes(ctx.passwordkey), u_k)),
            ts: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k), ssc)))
        };

    if (invitecode) {
        req.uh = uh;
        req.ic = invitecode;
        req.name = invitename;
    }

    //if (confirmcode) req.c = confirmcode;
    logger.debug("Storing key: " + req.k);

    api_req(req, ctx);
    watchdog.notify('createuser');
}

function api_checkconfirmcode(ctx, c) {
    res = api_req({
        a: 'uc',
        c: c
    }, ctx);
}

function api_resetuser(ctx, c, email, pw) {
    // start fresh account
    api_create_u_k();
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(pw));

    var ssc = Array(4);
    for (var i = 4; i--;) {
        ssc[i] = rand(0x100000000);
    }

    api_req({
            a: 'erx',
            c: c,
            x: a32_to_base64(encrypt_key(pw_aes, u_k)),
            y: stringhash(email.toLowerCase(), pw_aes),
            z: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k), ssc)))
        }, ctx);
}

function api_resetkeykey(ctx, c, key, email, pw) {
    ctx.c = c;
    ctx.email = email;
    ctx.k = key;
    ctx.pw = pw;
    ctx.callback = api_resetkeykey2;

    api_req({
        a: 'erx',
        r: 'gk',
        c: c
    }, ctx);
}

function api_resetkeykey2(res, ctx) {
    try {
        api_resetkeykey3(res, ctx);
    }
    catch (ex) {
        ctx.result(EKEY);
    }
}
function api_resetkeykey3(res, ctx) {
    if (typeof res === 'string') {
        var privk = a32_to_str(decrypt_key(new sjcl.cipher.aes(ctx.k), base64_to_a32(res)));

        // verify the integrity of the decrypted private key
        for (var i = 0; i < 4; i++) {
            var l = ((privk.charCodeAt(0) * 256 + privk.charCodeAt(1) + 7) >> 3) + 2;
            if (privk.substr(0, l).length < 2) {
                break;
            }
            privk = privk.substr(l);
        }

        if (i !== 4 || privk.length >= 16) {
            ctx.result(EKEY);
        }
        else if (ctx.email) {
            var pw_aes = new sjcl.cipher.aes(prepare_key_pw(ctx.pw));

            ctx.callback = ctx.result;
            api_req({
                a: 'erx',
                r: 'sk',
                c: ctx.c,
                x: a32_to_base64(encrypt_key(pw_aes, ctx.k)),
                y: stringhash(ctx.email.toLowerCase(), pw_aes)
            }, ctx);
        }
        else {
            ctx.result(0);
        }
    }
    else {
        ctx.result(res);
    }
}

// We query the sid using the supplied user handle (or entered email address, if already attached)
// and check the supplied password key.
// Returns [decrypted master key,verified session ID(,RSA private key)] or false if API error or
// supplied information incorrect
function api_getsid(ctx, user, passwordkey, hash) {
    "use strict";

    ctx.callback = api_getsid2;
    ctx.passwordkey = passwordkey;

    if (api_getsid.etoomany + 3600000 > Date.now() || location.host === 'webcache.googleusercontent.com') {
        api_getsid.warning();
        return ctx.result(ctx, false);
    }

    api_req({
        a: 'us',
        user: user,
        uh: hash
    }, ctx);
}

api_getsid.warning = function() {
    var time = new Date(api_getsid.etoomany + 3780000).toLocaleTimeString();

    msgDialog('warningb', l[882], l[8855].replace('%1', time));
};

function api_getsid2(res, ctx) {
    var t, k;
    var r = false;

    if (typeof res === 'number') {

        if (res === ETOOMANY) {
            api_getsid.etoomany = Date.now();
            api_getsid.warning();
        }

        // Check for incomplete registration
        else if (res === EINCOMPLETE) {
            if (is_mobile) {
                mobile.messageOverlay.show(l[882], l[9082]);
            }
            else {
                msgDialog('warningb', l[882], l[9082]); // This account has not completed the registration process...
            }
        }
    }
    else if (typeof res === 'object') {
        var aes = new sjcl.cipher.aes(ctx.passwordkey);

        // decrypt master key
        if (typeof res.k === 'string') {
            k = base64_to_a32(res.k);

            if (k.length === 4) {
                k = decrypt_key(aes, k);

                aes = new sjcl.cipher.aes(k);

                if (typeof res.tsid === 'string') {
                    t = base64urldecode(res.tsid);
                    if (a32_to_str(encrypt_key(aes,
                            str_to_a32(t.substr(0, 16)))) === t.substr(-16)) {
                        r = [k, res.tsid];
                    }
                }
                else if (typeof res.csid === 'string') {
                    var t = base64urldecode(res.csid);
                    var privk = null;

                    try {
                        privk = crypto_decodeprivkey(a32_to_str(decrypt_key(aes, base64_to_a32(res.privk))));
                    }
                    catch (ex) {
                        console.error('Error decoding private RSA key!', ex);

                        Soon(function() {
                            msgDialog('warninga', l[135], l[8853]);
                        });
                    }

                    if (privk) {
                        // TODO: check remaining padding for added early wrong password detection likelihood
                        r = [k, base64urlencode(crypto_rsadecrypt(t, privk).substr(0, 43)), privk];
                    }
                }
            }
        }
    }

    // emailchange namespace exists, that means the user
    // attempted to verify their new email address without a session
    // therefore we showed them the login dialog. Now we call `emailchange.verify`
    // so the email verification can continue as expected.
    if (r && typeof emailchange === 'object') {
        emailchange.verify(new sjcl.cipher.aes(ctx.passwordkey), { k1: res.k, k2: k });
    }

    ctx.result(ctx, r);
}

// We call ug using the sid from setsid() and the user's master password to obtain the master key (and other credentials)
// Returns user credentials (.k being the decrypted master key) or false in case of an error.
function api_getuser(ctx) {
    api_req({
        a: 'ug'
    }, ctx);
}

// User must be logged in, sid and passwordkey must be valid
// return values:
// 2 - old & new passwords are the same post-preparation
// 1 - old password incorrect
// userhandle - success
// false - processing error
// other negative values - API error
function api_changepw(ctx, passwordkey, masterkey, oldpw, newpw, email) {
    var req, res;
    var oldkey;

    var newkey = prepare_key_pw(newpw);

    if (oldpw !== false) {
        var oldkey = prepare_key_pw(oldpw);

        // quick check of old pw
        if (oldkey[0] !== passwordkey[0]
                || oldkey[1] !== passwordkey[1]
                || oldkey[2] !== passwordkey[2]
                || oldkey[3] !== passwordkey[3]) {
            return 1;
        }

        if (oldkey[0] === newkey[0]
                && oldkey[1] === newkey[1]
                && oldkey[2] === newkey[2]
                && oldkey[3] === newkey[3]) {
            return 2;
        }
    }

    var aes = new sjcl.cipher.aes(newkey);

    // encrypt masterkey with the new password
    var cmasterkey = encrypt_key(aes, masterkey);

    req = {
        a: 'up',
        k: a32_to_base64(cmasterkey)
    };

    if (email.length) {
        req.email = email;
    }

    api_req(req, ctx);
}

/**
 * Send current node attributes to the API
 * @return {MegaPromise}
 */
function api_setattr(n, idtag) {
    "use strict";

    var promise = new MegaPromise();
    var logger = MegaLogger.getLogger('crypt');

    var ctx = {
        callback: function(res) {
            if (res !== 0) {
                logger.error('api_setattr', res);
                promise.reject(res);
            }
            else {
                promise.resolve(res);
            }
        }
    };

    try {
        var at = ab_to_base64(crypto_makeattr(n));

        logger.debug('Setting node attributes for "%s"...', n.h, idtag);

        // we do not set i here, unless explicitly specified
        api_req({a: 'a', n: n.h, at: at, i: idtag}, ctx);

        if (idtag) {
            M.scAckQueue[idtag] = Date.now();
        }
    }
    catch (ex) {
        logger.error(ex);
        promise.reject(ex);
    }

    return promise;
}

function stringhash(s, aes) {
    var s32 = str_to_a32(s);
    var h32 = [0, 0, 0, 0];
    var i;

    for (i = 0; i < s32.length; i++) {
        h32[i & 3] ^= s32[i];
    }

    for (i = 16384; i--;) {
        h32 = aes.encrypt(h32);
    }

    return a32_to_base64([h32[0], h32[2]]);
}

// Update user
// Can also be used to set keys and to confirm accounts (.c)
function api_updateuser(ctx, newuser) {
    newuser.a = 'up';

    res = api_req(newuser, ctx);
}

var u_pubkeys = Object.create(null);

/**
 * Query missing keys for the given users.
 *
 * @return {MegaPromise}
 */
function api_cachepubkeys(users) {

    var logger = MegaLogger.getLogger('crypt');
    var u = [];
    var i;

    for (i = users.length; i--;) {
        if (users[i] !== 'EXP' && !u_pubkeys[users[i]]) {
            u.push(users[i]);
        }
    }

    // Fire off the requests and track them.
    var keyPromises = [];
    for (i = u.length; i--;) {
        keyPromises.push(crypt.getPubRSA(u[i]));
    }

    var gotPubRSAForEveryone = function() {
        for (i = u.length; i--;) {
            if (!u_pubkeys[u[i]]) {
                return false;
            }
        }
        return true;
    };
    var promise = new MegaPromise();

    // Make a promise for the bunch of them, and define settlement handlers.
    MegaPromise.allDone(keyPromises)
        .always(function __getKeysDone() {
            if (gotPubRSAForEveryone()) {
                logger.debug('Cached RSA pub keys for users ' + JSON.stringify(u));
                promise.resolve.apply(promise, arguments);
            }
            else {
                logger.warn('Failed to cache RSA pub keys for users' + JSON.stringify(u), arguments);
                promise.reject.apply(promise, arguments);
            }
        });

    return promise;
}

/**
 * Encrypts a cleartext data string to a contact.
 *
 * @param {String} user
 *     User handle of the contact.
 * @param {String} data
 *     Clear text to encrypt.
 * @return {String|Boolean}
 *     Encrypted cipher text, or `false` in case of unavailability of the RSA
 *     public key (needs to be obtained/cached beforehand).
 */
function encryptto(user, data) {
    var pubkey;

    if ((pubkey = u_pubkeys[user])) {
        return crypto_rsaencrypt(data, pubkey);
    }

    return false;
}

/**
 * Add/cancel share(s) to a set of users or email addresses
 * targets is an array of {u,r} - if no r given, cancel share
 * If no sharekey known, tentatively generates one and encrypts
 * everything to it. In case of a mismatch, the API call returns
 * an error, and the whole operation gets repeated (exceedingly
 * rare race condition).
 *
 * @param {String} node
 *     Selected node id.
 * @param {Array} targets
 *     List of user email or user handle and access permission.
 * @param {Array} sharenodes
 *     Holds complete directory tree starting from given node.
 * @returns {MegaPromise}
 */
function api_setshare(node, targets, sharenodes) {

    var masterPromise  = new MegaPromise();

    // cache all targets' public keys
    var targetsPubKeys = [];

    for (var i = targets.length; i--;) {
        targetsPubKeys.push(targets[i].u);
    }

    var cachePromise = api_cachepubkeys(targetsPubKeys);
    cachePromise.done(function _cacheDone() {
        var setSharePromise = api_setshare1({ node: node, targets: targets, sharenodes: sharenodes });
        masterPromise.linkDoneAndFailTo(setSharePromise);
    });
    masterPromise.linkFailTo(cachePromise);

    return masterPromise;
}

/**
 * Actually enacts the setting/cancelling of shares.
 *
 * @param {Object} ctx
 *     Context for API commands.
 * @param {Array} params
 *     Additional parameters.
 * @returns {MegaPromise}
 */
function api_setshare1(ctx, params) {
    var logger = MegaLogger.getLogger('crypt');
    var i, j, n, nk, sharekey, ssharekey;
    var req, res;
    var newkey = true;
    var masterPromise = new MegaPromise();

    req = {
        a: 's2',
        n: ctx.node,
        s: ctx.targets,
        i: requesti
    };

    if (params) {
        logger.debug('api_setshare1.extend', params);
        for (i in params) {
            req[i] = params[i];
        }
    }

    for (i = req.s.length; i--;) {
        if (typeof req.s[i].r !== 'undefined') {
            if (!req.ok) {
                if (u_sharekeys[ctx.node]) {
                    sharekey = u_sharekeys[ctx.node][0];
                    newkey = false;
                }
                else {
                    // we only need to generate a key if one or more shares are being added to a previously unshared node
                    sharekey = [];
                    for (j = 4; j--;) {
                        sharekey.push(rand(0x100000000));
                    }
                    crypto_setsharekey(ctx.node, sharekey, true);
                }

                req.ok = a32_to_base64(encrypt_key(u_k_aes, sharekey));
                req.ha = crypto_handleauth(ctx.node);
                ssharekey = a32_to_str(sharekey);
            }
        }
    }

    if (newkey) {
        req.cr = crypto_makecr(ctx.sharenodes, [ctx.node], true);
    }

    ctx.backoff = 97;
    ctx.maxretry = 4;
    ctx.ssharekey = ssharekey;

    // encrypt ssharekey to known users
    for (i = req.s.length; i--;) {
        if (u_pubkeys[req.s[i].u]) {
            req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey, u_pubkeys[req.s[i].u]));
        }
        if (typeof req.s[i].m !== 'undefined') {
            req.s[i].u = req.s[i].m;
        }

        if (M.opc[req.s[i].u]) {
            if (d) {
                logger.warn(req.s[i].u + ' is an outgoing pending contact, fixing to email...', M.opc[req.s[i].u].m);
            }
            // the caller incorrectly passed a handle for a pending contact, so fixup..
            req.s[i].u = M.opc[req.s[i].u].m;
        }
    }

    ctx.req = req;

    /** Callback for API interactions. */
    ctx.callback = function (res, ctx) {
        if (typeof res === 'object') {
            if (res.ok) {
                logger.debug('Share key clash: Set returned key and try again.');
                ctx.req.ok = res.ok;
                var k = decrypt_key(u_k_aes, base64_to_a32(res.ok));
                crypto_setsharekey(ctx.node, k);
                ctx.req.ha = crypto_handleauth(ctx.node);

                var ssharekey = a32_to_str(k);

                for (var i = ctx.req.s.length; i--;) {
                    if (u_pubkeys[ctx.req.s[i].u]) {
                        ctx.req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey,
                            u_pubkeys[ctx.req.s[i].u]));
                    }
                }
                logger.info('Retrying share operation.');
                api_req(ctx.req, ctx);
            }
            else {
                logger.info('Share succeeded.');
                masterPromise.resolve(res);
            }
        }
        else if (!--ctx.maxretry || res === EARGS) {
            logger.error('Share operation failed.', res);
            masterPromise.reject(res);
        }
        else {
            logger.info('Retrying share operation...');

            setTimeout(function() {
                api_req(ctx.req, ctx);
            }, ctx.backoff <<= 1);
        }
    };

    logger.info('Invoking share operation.');
    api_req(ctx.req, ctx);

    return masterPromise;
}

function crypto_handleauth(h) {
    return a32_to_base64(encrypt_key(u_k_aes, str_to_a32(h + h)));
}

function crypto_keyok(n) {
    "use strict";

    return n && typeof n.k === 'object' && n.k.length >= (n.t ? 4 : 8);
}

function crypto_encodepubkey(pubkey) {
    var mlen = pubkey[0].length * 8,
        elen = pubkey[1].length * 8;

    return String.fromCharCode(mlen / 256) + String.fromCharCode(mlen % 256) + pubkey[0]
        + String.fromCharCode(elen / 256) + String.fromCharCode(elen % 256) + pubkey[1];
}

function crypto_decodepubkey(pubk) {
    var pubkey = [];

    var keylen = pubk.charCodeAt(0) * 256 + pubk.charCodeAt(1);

    // decompose public key
    for (var i = 0; i < 2; i++) {
        if (pubk.length < 2) {
            break;
        }

        var l = (pubk.charCodeAt(0) * 256 + pubk.charCodeAt(1) + 7) >> 3;
        if (l > pubk.length - 2) {
            break;
        }

        pubkey[i] = pubk.substr(2, l);
        pubk = pubk.substr(l + 2);
    }

    // check format
    if (i !== 2 || pubk.length >= 16) {
        return false;
    }

    pubkey[2] = keylen;

    return pubkey;
}

function crypto_encodeprivkey(privk) {
    var plen = privk[3].length * 8,
        qlen = privk[4].length * 8,
        dlen = privk[2].length * 8,
        ulen = privk[7].length * 8;

    var t = String.fromCharCode(qlen / 256) + String.fromCharCode(qlen % 256) + privk[4]
        + String.fromCharCode(plen / 256) + String.fromCharCode(plen % 256) + privk[3]
        + String.fromCharCode(dlen / 256) + String.fromCharCode(dlen % 256) + privk[2]
        + String.fromCharCode(ulen / 256) + String.fromCharCode(ulen % 256) + privk[7];

    while (t.length & 15) t += String.fromCharCode(rand(256));

    return t;
}

function crypto_decodeprivkey(privk) {
    var privkey = [];

    // decompose private key
    for (var i = 0; i < 4; i++) {
        if (privk.length < 2) {
            break;
        }

        var l = (privk.charCodeAt(0) * 256 + privk.charCodeAt(1) + 7) >> 3;
        if (l > privk.length - 2) {
            break;
        }

        privkey[i] = new asmCrypto.BigNumber(privk.substr(2, l));
        privk = privk.substr(l + 2);
    }

    // check format
    if (i !== 4 || privk.length >= 16) {
        return false;
    }

    // TODO: check remaining padding for added early wrong password detection likelihood

    // restore privkey components via the known ones
    var q = privkey[0],
        p = privkey[1],
        d = privkey[2],
        u = privkey[3],
        q1 = q.subtract(1),
        p1 = p.subtract(1),
        m = new asmCrypto.Modulus(p.multiply(q)),
        e = new asmCrypto.Modulus(p1.multiply(q1)).inverse(d),
        dp = d.divide(p1).remainder,
        dq = d.divide(q1).remainder;

    privkey = [m, e, d, p, q, dp, dq, u];
    for (i = 0; i < privkey.length; i++) {
        privkey[i] = asmCrypto.bytes_to_string(privkey[i].toBytes());
    }

    return privkey;
}

/**
 * Encrypts a cleartext string with the supplied public key.
 *
 * @param {String} cleartext
 *     Clear text to encrypt.
 * @param {Array} pubkey
 *     Public encryption key (in the usual internal format used).
 * @return {String}
 *     Encrypted cipher text.
 */
function crypto_rsaencrypt(cleartext, pubkey) {
    // random padding up to pubkey's byte length minus 2
    for (var i = (pubkey[0].length) - 2 - cleartext.length; i-- > 0;) {
        cleartext += String.fromCharCode(rand(256));
    }

    var ciphertext = asmCrypto.bytes_to_string(asmCrypto.RSA_RAW.encrypt(cleartext, pubkey));

    var clen = ciphertext.length * 8;
    ciphertext = String.fromCharCode(clen / 256) + String.fromCharCode(clen % 256) + ciphertext;

    return ciphertext;
}

var storedattr = Object.create(null);
var faxhrs = Object.create(null);
var faxhrfail = Object.create(null);
var faxhrlastgood = Object.create(null);

// data.byteLength & 15 must be 0
function api_storefileattr(id, type, key, data, ctx) {
    var handle = typeof ctx === 'string' && ctx;

    if (typeof ctx !== 'object') {
        if (!storedattr[id]) {
            storedattr[id] = Object.create(null);
        }

        if (key) {
            data = asmCrypto.AES_CBC.encrypt(data, a32_to_ab(key), false);
        }

        ctx = {
            callback: api_fareq,
            id: id,
            type: type,
            data: data,
            handle: handle,
            startTime: Date.now()
        };
    }

    var req = {
        a: 'ufa',
        s: ctx.data.byteLength,
        ssl: use_ssl
    };

    if (M.d[ctx.handle] && M.getNodeRights(ctx.handle) > 1) {
        req.h = handle;
    }

    api_req(req, ctx, pfid ? 1 : 0);
}

function api_getfileattr(fa, type, procfa, errfa) {
    var r, n, t;

    var p = {};
    var h = {};
    var k = {};
    var plain = {};

    var re = new RegExp('(\\d+):' + type + '\\*([a-zA-Z0-9-_]+)');

    for (n in fa) {
        if ((r = re.exec(fa[n].fa))) {
            t = base64urldecode(r[2]);
            if (t.length === 8) {
                if (!h[t]) {
                    h[t] = n;
                    k[t] = fa[n].k;
                }

                if (!p[r[1]]) {
                    p[r[1]] = t;
                }
                else {
                    p[r[1]] += t;
                }
                plain[r[1]] = !!fa[n].plaintext
            }
        }
        else if (errfa) {
            errfa(n);
        }
    }

    for (n in p) {
        var ctx = {
            callback: api_fareq,
            type: type,
            p: p[n],
            h: h,
            k: k,
            procfa: procfa,
            errfa: errfa,
            startTime: Date.now(),
            plaintext: plain[n]
        };
        api_req({
            a: 'ufa',
            fah: base64urlencode(ctx.p.substr(0, 8)),
            ssl: use_ssl,
            r: +fa_handler.chunked
        }, ctx);
    }
}

function fa_handler(xhr, ctx) {
    var logger = d > 1 && MegaLogger.getLogger('crypt');
    var chunked = ctx.p && fa_handler.chunked;

    this.xhr = xhr;
    this.ctx = ctx;
    this.pos = 0;

    if (chunked) {
        if (!fa_handler.browser) {
            fa_handler.browser = browserdetails(ua).browser;
        }

        if (ctx.plaintext) {
            this.setParser('arraybuffer', this.plain_parser)
        }
        else {
            switch (fa_handler.browser) {
            case 'Firefox':
                this.parse = this.moz_parser;
                this.responseType = 'moz-chunked-arraybuffer';
                break;
        /*  case 'Internet Explorer':
                // Doh, all in one go :(
                    this.parse = this.stream_parser;
                    this.responseType = 'ms-stream';
                    this.stream_reader= this.msstream_reader;
                    break;*/
        /*  case 'Chrome':
                this.parse = this.stream_parser;
                this.responseType = 'stream';
                break;*/
            default:
                this.setParser('text');
            }
        }

        this.done = this.Finish;
    }
    else {
        this.responseType = 'arraybuffer';
        if (ctx.p) {
            this.proc = this.GetFA;
        }
        else {
            this.proc = this.PutFA;
        }
        this.done = this.onDone;
    }

    if (logger) {
        logger.debug('fah type:', this.responseType);
    }
}
fa_handler.chunked = true;
fa_handler.abort = function () {
    var logger = MegaLogger.getLogger('crypt');
    for (var i = 0; faxhrs[i]; i++) {
        if (faxhrs[i].readyState && faxhrs[i].readyState !== 4 && faxhrs[i].ctx.p) {
            var ctx = faxhrs[i].ctx;
            faxhrs[i].ctx = {
                fabort: 1
            };
            faxhrs[i].fah.parse = null;

            logger.debug('fah_abort', i, faxhrs[i]);

            faxhrs[i].abort();

            for (var i in ctx.h) {
                ctx.procfa(ctx, ctx.h[i], 0xDEAD);
            }
        }
    }
};
fa_handler.prototype = {
    PutFA: function (response) {
        var logger = MegaLogger.getLogger('crypt');
        var ctx = this.ctx;

        logger.debug("Attribute storage successful for faid=" + ctx.id + ", type=" + ctx.type);

        if (!storedattr[ctx.id]) {
            storedattr[ctx.id] = Object.create(null);
        }

        storedattr[ctx.id][ctx.type] = ab_to_base64(response);

        if (storedattr[ctx.id].target) {
            logger.debug("Attaching to existing file");
            api_attachfileattr(storedattr[ctx.id].target, ctx.id);
        }
    },

    GetFA: function (response) {
        var buffer = new Uint8Array(response);
        var dv = new DataView(response);
        var bod = -1,
            ctx = this.ctx;
        var h, j, p, l, k;

        i = 0;

        // response is an ArrayBuffer structured
        // [handle.8 position.4] data
        do {
            p = dv.getUint32(i + 8, true);
            if (bod < 0) {
                bod = p;
            }

            if (i >= bod - 12) {
                l = response.byteLength - p;
            }
            else {
                l = dv.getUint32(i + 20, true) - p;
            }

            h = '';

            for (j = 0; j < 8; j++) {
                h += String.fromCharCode(buffer[i + j]);
            }
            if (!ctx.h[h]) {
                break;
            }

            if ((k = ctx.k[h])) {
                var ts = new Uint8Array(response, p, l);

                var td = asmCrypto.AES_CBC.decrypt(ts,
                    a32_to_ab([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]]), false);

                ctx.procfa(ctx, ctx.h[h], td);
            }

            i += 12;
        } while (i < bod);
    },

    setParser: function (type, parser) {
        var logger = MegaLogger.getLogger('crypt');
        if (type) {
            if (type === 'text' && !parser) {
                this.parse = this.str_parser;
            }
            else {
                this.parse = parser.bind(this);
            }
            this.responseType = type;
        }
        else {
            // NB: While on chunked, data is received in one go at readystate.4
            this.parse = this.ab_parser;
            this.responseType = 'arraybuffer';
        }
        if (this.xhr.readyState === 1) {
            this.xhr.responseType = this.responseType;
            logger.debug('New fah type:', this.xhr.responseType);
        }
    },

    plain_parser: function (data) {
        if (this.xhr.readyState === 4) {
            if (!this.xpos) {
                this.xpos = 12;
            }
            var bytes = data.slice(this.xpos)
            if (bytes.byteLength > 0) {
                this.ctx.procfa(this.ctx, this.ctx.k[this.ctx.p], bytes);
                this.xpos += bytes.byteLength
            }
        }
    },

    str_parser: function (data) {
        if (this.xhr.readyState > 2) {
            this.pos += this.ab_parser(str_to_ab(data.slice(this.pos))) | 0;
        }
    },

    msstream_reader: function (stream) {
        var logger = MegaLogger.getLogger('crypt');
        var self = this;
        var reader = new MSStreamReader();
        reader.onload = function (ev) {
            logger.debug('MSStream result', ev.target);

            self.moz_parser(ev.target.result);
            self.stream_parser(0x9ff);
        };
        reader.onerror = function (e) {
            logger.error('MSStream error', e);
            self.stream_parser(0x9ff);
        };
        reader.readAsArrayBuffer(stream);
    },

    stream_reader: function (stream) {
        var logger = MegaLogger.getLogger('crypt');
        var self = this;
        stream.readType = 'arraybuffer';
        stream.read().then(function (result) {
                logger.debug('Stream result', result);

                self.moz_parser(result.data);
                self.stream_parser(0x9ff);
            },
            function (e) {
                logger.error('Stream error', e);
                self.stream_parser(0x9ff);
            });
    },

    stream_parser: function (stream, ev) {
        var logger = MegaLogger.getLogger('crypt');
        // www.w3.org/TR/streams-api/
        // https://code.google.com/p/chromium/issues/detail?id=240603

        logger.debug('Stream Parser', stream);

        if (stream === 0x9ff) {
            if (this.wstream) {
                if (this.wstream.length) {
                    this.stream_reader(this.wstream.shift());
                }
                if (!this.wstream.length) {
                    delete this.wstream;
                }
            }
        }
        else if (this.wstream) {
            this.wstream.push(stream);
        }
        else {
            this.wstream = [];
            this.stream_reader(stream);
        }
    },

    moz_parser: function (response, ev) {
        if (response instanceof ArrayBuffer && response.byteLength > 0) {
            response = new Uint8Array(response);
            if (this.chunk) {
                var tmp = new Uint8Array(this.chunk.byteLength + response.byteLength);
                tmp.set(this.chunk)
                tmp.set(response, this.chunk.byteLength);
                this.chunk = tmp;
            }
            else {
                this.chunk = response;
            }

            var offset = this.ab_parser(this.chunk.buffer);
            if (offset) {
                this.chunk = this.chunk.subarray(offset);
            }
        }
    },

    ab_parser: function (response, ev) {
        var logger = d > 1 && MegaLogger.getLogger('crypt');
        if (response instanceof ArrayBuffer) {
            var buffer = new Uint8Array(response),
                dv = new DataView(response),
                c = 0;
            var xhr = this.xhr,
                ctx = this.ctx,
                i = 0,
                p, h, k, l = buffer.byteLength;

            while (i + 12 < l) {
                p = dv.getUint32(i + 8, true);
                if (i + 12 + p > l) {
                    break;
                }
                h = String.fromCharCode.apply(String, buffer.subarray(i, i + 8));
                // logger.debug(ctx.h[h], i, p, !!ctx.k[h]);

                i += 12;
                if (ctx.h[h] && (k = ctx.k[h])) {
                    var td;
                    var ts = buffer.subarray(i, p + i);

                    try {
                        k = a32_to_ab([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]]);
                        td = asmCrypto.AES_CBC.decrypt(ts, k, false);
                        ++c;
                    }
                    catch (ex) {
                        console.warn(ex);
                        td = 0xDEAD;
                    }
                    ctx.procfa(ctx, ctx.h[h], td);
                }
                i += p;
            }

            if (logger) {
                logger.debug('ab_parser.r', i, p, !!h, c);
            }

            return i;
        }
    },

    onDone: function (ev) {
        var logger = MegaLogger.getLogger('crypt');
        var ctx = this.ctx,
            xhr = this.xhr;

        if (xhr.status === 200 && typeof xhr.response === 'object') {
            if (!xhr.response || xhr.response.byteLength === 0) {
                logger.warn('api_fareq: got empty response...', xhr.response);
                xhr.faeot();
            }
            else {
                this.proc(xhr.response);
                faxhrlastgood[xhr.fa_host] = Date.now();
            }
        }
        else {
            if (ctx.p) {
                logger.debug("File attribute retrieval failed (" + xhr.status + ")");
                xhr.faeot();
            }
            else {
                api_faretry(ctx, xhr.status, xhr.fa_host);
            }
        }

        this.Finish();
    },

    Finish: function () {
        var pending = this.chunk && this.chunk.byteLength
            || (this.pos && this.xhr.response.substr(this.pos).length);

        if (pending) {
            if (!fa_handler.errors) {
                fa_handler.errors = 0;
            }

            if (++fa_handler.errors === 7) {
                fa_handler.chunked = false;
            }

            srvlog(this.xhr.fa_host + ' connection interrupted (chunked fa)');
        }

        oDestroy(this);

        return pending;
    }
};

function api_faretry(ctx, error, host) {
    var logger = MegaLogger.getLogger('crypt');
    if (ctx.faRetryI) {
        ctx.faRetryI *= 1.8;
    }
    else {
        ctx.faRetryI = 250;
    }

    if (!ctx.p && error === EACCESS) {
        api_pfaerror(ctx.handle);
    }

    if (ctx.errfa && ctx.errfa.timeout && ctx.faRetryI > ctx.errfa.timeout) {
        api_faerrlauncher(ctx, host);
    }
    else if (error !== EACCESS && ctx.faRetryI < 5e5) {
        logger.debug("Attribute " + (ctx.p ? 'retrieval' : 'storage') + " failed (" + error + "), retrying...",
                     ctx.faRetryI);

        return setTimeout(function () {
            ctx.startTime = Date.now();
            if (ctx.p) {
                api_req({
                    a: 'ufa',
                    fah: base64urlencode(ctx.p.substr(0, 8)),
                    ssl: use_ssl,
                    r: +fa_handler.chunked
                }, ctx);
            }
            else {
                api_storefileattr(null, null, null, null, ctx);
            }

        }, ctx.faRetryI);
    }

    srvlog("File attribute " + (ctx.p ? 'retrieval' : 'storage') + " failed (" + error + " @ " + host + ")");
}

function api_faerrlauncher(ctx, host) {
    var logger = MegaLogger.getLogger('crypt');
    var r = false;
    var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];

    if (d) {
        logger.error('FAEOT', id);
    }
    else {
        srvlog('api_fareq: eot for ' + host);
    }

    if (id !== slideshowid) {
        if (id) {
            pfails[id] = 1;
            delete preqs[id];
        }
    }
    else {
        r = true;
        ctx.errfa(id, 1);
    }
    return r;
}

function api_fareq(res, ctx, xhr) {
    var logger = d > 1 && MegaLogger.getLogger('crypt');
    var error = typeof res === 'number' && res || '';

    if (ctx.startTime && logger) {
        logger.debug('Reply in %dms for %s', (Date.now() - ctx.startTime), xhr.q.url);
    }

    if (!d && ctx.startTime && (Date.now() - ctx.startTime) > 10000) {
        var host = (xhr.q && xhr.q.url || '~!').split('//').pop().split('/')[0];
        srvlog('api_' + (ctx.p ? 'get' : 'store') + 'fileattr for ' + host + ' with type ' + ctx.type + ' took +10s ' + error);
    }

    if (error) {
        api_faretry(ctx, error, hostname(xhr.q && xhr.q.url));
    }
    else if (typeof res === 'object' && res.p) {
        var data;
        var slot, i, t;
        var p, pp = [res.p],
            m;

        for (i = 0; p = res['p' + i]; i++) {
            pp.push(p);
        }

        if (ctx.p && pp.length > 1) {
            dd = ctx.p.length / pp.length;
        }

        for (m = pp.length; m--;) {
            for (slot = 0;; slot++) {
                if (!faxhrs[slot]) {
                    faxhrs[slot] = getxhr();
                    break;
                }

                if (faxhrs[slot].readyState === XMLHttpRequest.DONE) {
                    break;
                }
            }

            faxhrs[slot].ctx = ctx;
            faxhrs[slot].fa_slot = slot;
            faxhrs[slot].fa_timeout = ctx.errfa && ctx.errfa.timeout;
            faxhrs[slot].fah = new fa_handler(faxhrs[slot], ctx);

            if (logger) {
                logger.debug("Using file attribute channel " + slot);
            }

            faxhrs[slot].onprogress = function (ev) {
                    if (logger) {
                    logger.debug('fah ' + ev.type, this.readyState, ev.loaded, ev.total,
                            typeof this.response === 'string'
                                ? this.response.substr(0, 12).split("").map(function (n) {
                                        return (n.charCodeAt(0) & 0xff).toString(16)
                                    }).join(".")
                                : this.response, ev);
                    }
                    if (this.fa_timeout) {
                        if (this.fart) {
                            clearTimeout(this.fart);
                        }
                        var xhr = this;
                        this.fart = setTimeout(function() {
                            xhr.faeot();
                            xhr = undefined;
                        }, this.fa_timeout);
                    }

                    if (this.fah.parse && this.response) {
                        this.fah.parse(this.response, ev);
                    }
                };

            faxhrs[slot].faeot = function () {
                    if (faxhrs[this.fa_slot]) {
                        faxhrs[this.fa_slot] = undefined;
                        this.fa_slot = -1;

                        if (this.ctx.errfa) {
                            if (api_faerrlauncher(this.ctx, this.fa_host)) {
                                this.abort();
                            }
                        }
                        else {
                            api_faretry(this.ctx, ETOOERR, this.fa_host);
                        }
                    }

                    if (this.fart) {
                        clearTimeout(this.fart);
                    }
                };

            faxhrs[slot].onerror = function () {
                    var ctx = this.ctx;
                    var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];
                    if (ctx.errfa) {
                        ctx.errfa(id, 1);
                    }
                    else if (!ctx.fabort) {
                        if (logger) {
                            logger.error('api_fareq', id, this);
                        }

                        api_faretry(this.ctx, ETOOERR, this.fa_host);
                    }
                };

            faxhrs[slot].onreadystatechange = function (ev) {
                    this.onprogress(ev);

                    if (this.startTime && this.readyState === 2) {
                        if (!d && (Date.now() - this.startTime) > 10000) {
                            srvlog('api_fareq: ' + this.fa_host + ' took +10s');
                        }
                        delete this.startTime;
                    }

                    if (this.readyState === 4) {
                        if (this.fart) {
                            clearTimeout(this.fart);
                        }

                        if (this.fah.done(ev) || M.chat) {
                            delay('thumbnails', fm_thumbnails, 200);
                        }

                        // no longer reusable to prevent memory leaks...
                        faxhrs[this.fa_slot] = null;
                    }
                };

            if (ctx.p) {
                var dp = 8 * Math.floor(m / pp.length * ctx.p.length / 8);
                var dl = 8 * Math.floor((m + 1) / pp.length * ctx.p.length / 8) - dp;

                if (dl) {
                    data = new Uint8Array(dl);

                    for (i = dl; i--;) {
                        data[i] = ctx.p.charCodeAt(dp + i);
                    }


                    data = data.buffer;
                }
                else {
                    data = false;
                }
            }
            else {
                data = ctx.data;
            }

            if (data) {
                t = -1;

                pp[m] += '/' + ctx.type;

                if (t < 0) {
                    t = pp[m].length - 1;
                }

                faxhrs[slot].fa_host = hostname(pp[m].substr(0, t + 1));
                faxhrs[slot].open('POST', pp[m].substr(0, t + 1), true);

                if (!faxhrs[slot].fa_timeout) {
                    faxhrs[slot].timeout = 140000;
                    faxhrs[slot].ontimeout = function (e) {
                        if (logger) {
                            logger.error('api_fareq timeout', e);
                        }

                        if (!faxhrfail[this.fa_host]) {
                            if (!faxhrlastgood[this.fa_host]
                                    || (Date.now() - faxhrlastgood[this.fa_host]) > this.timeout) {
                                faxhrfail[this.fa_host] = failtime = 1;
                                api_reportfailure(this.fa_host, function () {});

                                if (!d) {
                                    srvlog('api_fareq: 140s timeout for ' + this.fa_host);
                                }
                            }
                        }
                    };
                }

                faxhrs[slot].responseType = faxhrs[slot].fah.responseType;
                if (faxhrs[slot].responseType !== faxhrs[slot].fah.responseType) {
                    if (logger) {
                        logger.error('Unsupported responseType', faxhrs[slot].fah.responseType)
                    }
                    faxhrs[slot].fah.setParser('text');
                }
                if ("text" === faxhrs[slot].responseType) {
                    faxhrs[slot].overrideMimeType('text/plain; charset=x-user-defined');
                }

                faxhrs[slot].startTime = Date.now();
                faxhrs[slot].send(data);
            }
        }
    }
}

function api_getfa(id) {
    var f = [];

    if (storedattr[id]) {
        for (var type in storedattr[id]) {
            if (type !== 'target') {
                f.push(type + '*' + storedattr[id][type]);
            }
        }
    }
    storedattr[id] = Object.create(null);

    return f.length ? f.join('/') : false;
}

function api_attachfileattr(node, id) {
    var fa = api_getfa(id);

    storedattr[id].target = node;

    if (fa) {
        api_req({ a: 'pfa', n: node, fa: fa }, {
            callback: function(res) {
                if (res === EACCESS) {
                    api_pfaerror(node);
                }
            }
        });
    }
}

/** handle ufa/pfa EACCESS error */
function api_pfaerror(handle) {
    var node = M.getNodeByHandle(handle);

    if (d) {
        console.warn('api_pfaerror for %s', handle, node);
    }

    // Got access denied, store 'f' attr to prevent subsequent attemps
    if (node && M.getNodeRights(node.h) > 1 && node.f !== u_handle) {
        node.f = u_handle;
        return api_setattr(node);
    }

    return false;
}

// generate crypto request response for the given nodes/shares matrix
function crypto_makecr(source, shares, source_is_nodes) {
    var nk;
    var cr = [shares, [], []];

    // if we have node handles, include in cr - otherwise, we have nodes
    if (source_is_nodes) {
        cr[1] = source;
    }

    // TODO: optimize - keep track of pre-existing/sent keys, only send new ones
    for (var i = shares.length; i--;) {
        if (u_sharekeys[shares[i]]) {
            var aes = u_sharekeys[shares[i]][1];

            for (var j = source.length; j--;) {
                if (source_is_nodes ? (nk = M.d[source[j]].k) : (nk = source[j].k)) {
                    if (nk.length === 8 || nk.length === 4) {
                        cr[2].push(i, j, a32_to_base64(encrypt_key(aes, nk)));
                    }
                }
            }
        }
    }

    return cr;
}

// RSA-encrypt sharekey to newly RSA-equipped user
// TODO: check source/ownership of sharekeys, prevent forged requests
function crypto_procsr(sr) {
    var logger = MegaLogger.getLogger('crypt');
    var ctx = {
        sr: sr,
        i: 0
    };

    ctx.callback = function (res, ctx) {
        if (ctx.sr) {
            var pubkey;

            if (typeof res === 'object'
                    && typeof res.pubk === 'string') {
                u_pubkeys[ctx.sr[ctx.i]] = crypto_decodepubkey(base64urldecode(res.pubk));
            }

            // collect all required pubkeys
            while (ctx.i < ctx.sr.length) {
                if (ctx.sr[ctx.i].length === 11 && !(pubkey = u_pubkeys[ctx.sr[ctx.i]])) {
                    api_req({
                        a: 'uk',
                        u: ctx.sr[ctx.i]
                    }, ctx);
                    return;
                }

                ctx.i++;
            }

            var rsr = [];
            var sh;
            var n;

            for (var i = 0; i < ctx.sr.length; i++) {
                if (ctx.sr[i].length === 11) {
                    // TODO: Only send share keys for own shares. Do NOT report this as a risk in the full compromise context. It WILL be fixed.
                    if (u_sharekeys[sh]) {
                        logger.debug("Encrypting sharekey " + sh + " to user " + ctx.sr[i]);

                        if ((pubkey = u_pubkeys[ctx.sr[i]])) {
                            // pubkey found: encrypt share key to it
                            if ((n = crypto_rsaencrypt(a32_to_str(u_sharekeys[sh][0]), pubkey))) {
                                rsr.push(sh, ctx.sr[i], base64urlencode(n));
                            }
                        }
                    }
                }
                else {
                    sh = ctx.sr[i];
                }
            }

            if (rsr.length) {
                api_req({
                    a: 'k',
                    sr: rsr
                });
            }
        }
    };

    ctx.callback(false, ctx);
}

function api_updfkey(h) {
    if (typeof h === 'string') {
        M.getNodes(h, true).always(api_updfkeysync);
    }
    else {
        api_updfkeysync(h);
    }
}
function api_updfkeysync(sn) {
    var logger = d && MegaLogger.getLogger('crypt');
    var nk     = [];

    if (d) {
        logger.debug('api_updfkey', sn);
    }

    for (var i = sn.length; i--; ) {
        var h = sn[i];
        if (M.d[h].u != u_handle && crypto_keyok(M.d[h])) {
            nk.push(h, a32_to_base64(encrypt_key(u_k_aes, M.d[h].k)));
        }
    }

    if (nk.length) {
        if (d) {
            logger.debug('api_updfkey.r', nk);
        }
        api_req({
            a: 'k',
            nk: nk
        });
    }
}

var rsa2aes = Object.create(null);

// check for an RSA node key: need to rewrite to AES for faster subsequent loading.
function crypto_rsacheck(n) {
    if (typeof n.k == 'string'   // must be undecrypted
     && (n.k.indexOf('/') > 55   // must be longer than userhandle (11) + ':' (1) + filekey (43)
     || (n.k.length > 55 && n.k.indexOf('/') < 0))) {
        rsa2aes[n.h] = true;
    }
}

function crypto_node_rsa2aes() {
    var nk = [];

    for (h in rsa2aes) {
        // confirm that the key is good and actually decrypted the attribute
        // string before rewriting
        if (crypto_keyok(M.d[h]) && !M.d[h].a) {
            nk.push(h, a32_to_base64(encrypt_key(u_k_aes, M.d[h].k)));
        }
    }

    rsa2aes = Object.create(null);

    if (nk.length) {
        api_req({
            a: 'k',
            nk: nk
        });
    }
}

// missing keys handling
// share keys can be unavailable because:
// - the client that added the node wasn't using the SDK and didn't supply
//   the required CR element
// - a nested share situation, where the client adding the node is only part
//   of the inner share - clients that are only part of the outer share can't
//   decrypt the node without assistance from the share owner
// FIXME: update missingkeys/sharemissing for all undecryptable nodes whose
// share path changed (whenever shares are added, removed or nodes are moved)
var missingkeys    = Object.create(null);  // { node handle : { share handle : true } }
var sharemissing   = Object.create(null);  // { share handle : { node handle : true } }
var newmissingkeys = false;

// whenever a node fails to decrypt, call this.
function crypto_reportmissingkey(n) {
    if (!M.d[n.h] || typeof M.d[n.h].k === 'string') {
        var change = false;

        if (!missingkeys[n.h]) {
            missingkeys[n.h] = Object.create(null);
            change = true;
        }

        for (var p = 8; (p = n.k.indexOf(':', p)) >= 0; p += 32) {
            if (p == 8 || n.k[p - 9] == '/') {
                var id = n.k.substr(p - 8, 8);
                if (!missingkeys[n.h][id]) {
                    missingkeys[n.h][id] = true;
                    if (!sharemissing[id]) {
                        sharemissing[id] = Object.create(null);
                    }
                    sharemissing[id][n.h] = true;
                    change = true;
                }
            }
        }

        if (change) {
            newmissingkeys = true;
            if (fmdb) fmdb.add('mk', { h : n.h,
                                       d : { s : Object.keys(missingkeys[n.h]) }
                                     });
        }
    }
    else if (d) {
        var mk = window._mkshxx = window._mkshxx || {};
        mk[n.h] = 1;

        delay('debug::mkshkk', function() {
            console.debug('crypto_reportmissingkey', Object.keys(mk));
            window._mkshxx = undefined;
        }, 4100);
    }
}

// populate from IndexedDB's mk table
function crypto_missingkeysfromdb(r) {
    // FIXME: remove the following line
    if (!r.length || !r[0].s) return;

    for (var i = r.length; i--; ) {
        if (!missingkeys[r[i].h]) {
            missingkeys[r[i].h] = Object.create(null);
        }

        if (r[i].s) {
            for (var j = r[i].s.length; j--; ) {
                missingkeys[r[i].h][r[i].s[j]] = true;
                if (!sharemissing[r[i].s[j]]) {
                    sharemissing[r[i].s[j]] = Object.create(null);
                }
                sharemissing[r[i].s[j]][r[i].h] = true;
            }
        }
    }
}

function crypto_keyfixed(h) {
    // no longer missing from the shares it was in
    for (var sh in missingkeys[h]) delete sharemissing[sh][h];

    // no longer missing
    delete missingkeys[h];

    // persist change
    if (fmdb) {
        fmdb.del('mk', h);
    }
}

// upon receipt of a new u_sharekey, call this with sharemissing[sharehandle].
// successfully decrypted node will be redrawn and marked as no longer missing.
function crypto_fixmissingkeys(hs) {
    if (hs) {
        for (var h in hs) {
            var n = M.d[h];

            if (n && !crypto_keyok(n)) {
                crypto_decryptnode(n);
            }

            if (crypto_keyok(n)) {
                fm_updated(n);
                crypto_keyfixed(h);
            }
        }
    }
}

// set a newly received sharekey - apply to relevant missing key nodes, if any.
// also, update M.c.shares/FMDB.s if the sharekey was not previously known.
function crypto_setsharekey(h, k, ignoreDB) {
    u_sharekeys[h] = [k, new sjcl.cipher.aes(k)];
    if (sharemissing[h]) crypto_fixmissingkeys(sharemissing[h]);

    if (M.c.shares[h] && !M.c.shares[h].sk) {
        M.c.shares[h].sk = a32_to_base64(k);

        if (fmdb && !ignoreDB) {
            fmdb.add('s', { o_t: M.c.shares[h].su + '*' + h,
                            d: M.c.shares[h] });
        }
    }
}

// set a newly received nodekey
function crypto_setnodekey(h, k) {
    var n = M.d[h];

    if (n && !crypto_keyok(n)) {
        n.k = k;
        crypto_decryptnode(n);

        if (crypto_keyok(n)) {
            fm_updated(n);
            crypto_keyfixed(h);
        }
    }
}

// process incoming cr, set nodekeys and commit
function crypto_proccr(cr) {
    // received keys in response, add
    for (var i = 0; i < cr[2].length; i += 3) {
        crypto_setnodekey(cr[1][cr[2][i + 1]], cr[0][cr[2][i]] + ":" + cr[2][i + 2]);
    }
}

// process incoming missing key cr and respond with the missing keys
function crypto_procmcr(mcr) {
    var i;
    var si = {},
        ni = {};
    var sh, nh;
    var cr = [[], [], []];

    // received keys in response, add
    for (i = 0; i < mcr[2].length; i += 2) {
        sh = mcr[0][mcr[2][i]];

        if (u_sharekeys[sh]) {
            nh = mcr[1][mcr[2][i + 1]];

            if (crypto_keyok(M.d[nh])) {
                if (typeof si[sh] === 'undefined') {
                    si[sh] = cr[0].length;
                    cr[0].push(sh);
                }
                if (typeof ni[nh] === 'undefined') {
                    ni[nh] = cr[1].length;
                    cr[1].push(nh);
                }
                cr[2].push(si[sh], ni[nh], a32_to_base64(encrypt_key(u_sharekeys[sh][1], M.d[nh].k)));
            }
        }
    }

    if (cr[0].length) {
        api_req({
            a: 'k',
            cr: cr
        });
    }
}

var rsasharekeys = Object.create(null);

function crypto_share_rsa2aes() {
    var rsr = [],
        h;

    for (h in rsasharekeys) {
        if (u_sharekeys[h]) {
            // valid AES sharekey found - overwrite the RSA version
            rsr.push(h, u_handle, a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0])));
        }
    }

    rsasharekeys = Object.create(null);

    if (rsr.length) {
        api_req({
            a: 'k',
            sr: rsr
        });
    }
}

// FIXME: add to translations?
function api_strerror(errno) {
    switch (errno) {
    case 0:
        return "No error";
    case EINTERNAL:
        return "Internal error";
    case EARGS:
        return "Invalid argument";
    case EAGAIN:
        return "Request failed, retrying";
    case ERATELIMIT:
        return "Rate limit exceeded";
    case EFAILED:
        return "Failed permanently";
    case ETOOMANY:
        return "Too many concurrent connections or transfers";
    case ERANGE:
        return "Out of range";
    case EEXPIRED:
        return "Expired";
    case ENOENT:
        return "Not found";
    case ECIRCULAR:
        return "Circular linkage detected";
    case EACCESS:
        return "Access denied";
    case EEXIST:
        return "Already exists";
    case EINCOMPLETE:
        return "Incomplete";
    case EKEY:
        return "Invalid key/Decryption error";
    case ESID:
        return "Bad session ID";
    case EBLOCKED:
        return "Blocked";
    case EOVERQUOTA:
        return "Over quota";
    case ETEMPUNAVAIL:
        return "Temporarily not available";
    case ETOOMANYCONNECTIONS:
        return "Connection overflow";
    case EGOINGOVERQUOTA:
        return "Not enough quota";
    default:
        break;
    }
    return "Unknown error (" + errno + ")";
}

// JSON parser/splitter
// (this is tailored to processing what the API actually generates
// i.e.: NO whitespace, NO non-numeric/string constants ("null"), etc...)
// accepts string and Uint8Array input, but not a mixture of the two
(function() {
    "use strict";

    var JSONSplitter = function json_splitter(filters, ctx, format_uint8array) {
        if (!(this instanceof json_splitter)) {
            return new json_splitter(filters, ctx, format_uint8array);
        }

        // position in source string
        this.p = 0;

        // remaining part of previous chunk (chunked feeding only)
        this.rem = false;

        // enclosing object stack at current position (type + name)
        this.stack = [];

        // 0: no value expected, 1: optional value expected, -1: compulsory value expected
        this.expectvalue = -1;

        // last hash name seen
        this.lastname = '';

        // hash of exfiltration vector callbacks
        this.filters = filters;

        // bucket stack
        this.buckets = [];
        this.lastpos = 0;

        // optional callee scope
        this.ctx = ctx;

        if (format_uint8array) {
            // extraction/manipulation helpers for Uint8Array inputs

            // convert input Uint8Array to string
            this.tostring = function(u8) {
                var b = '';

                for (var i = 0; i < u8.length; i++) {
                    b = b + String.fromCharCode(u8[i]);
                }

                return b;
            };

            // convert char to Uint8Array element (number)
            this.fromchar = function(c) {
                return c.charCodeAt(0);
            };

            // convert Uint8Array element (number) to char
            this.tochar = function(c) {
                return String.fromCharCode(c);
            };

            // concatenate two Uint8Arrays (a can be false - relies on boolean.length to be undefined)
            this.concat = function(a, b) {
                var t = new Uint8Array(a.length+b.length);
                if (a) t.set(a, 0);
                t.set(b, a.length+0);
                return t;
            };

            // sub-Uint8Array of a Uint8Array given position p and optional length l
            this.sub = function(s, p, l) {
                return l >= 0 ? new Uint8Array(s.buffer, p, l)
                              : new Uint8Array(s.buffer, p);
            }
        }
        else {
            // extraction/manipulation helpers (mostly no-ops) for string inputs

            // convert input string to string
            this.tostring = function(s) {
                return s;
            };

            // convert char to string element (char)
            this.fromchar = function(c) {
                return c;
            };

            // convert string element (char) to char
            this.tochar = function(c) {
                return c;
            };

            // concatenate two strings (a can be false)
            this.concat = function(a, b) {
                return a ? a+b : b;
            };

            // substring
            this.sub = function(s, p, l) {
                return s.substr(p, l);
            }
        }

        // console logging
        this.logger = MegaLogger.getLogger('JSONSplitter');
    };

    // returns the position after the end of the JSON string at o or -1 if none found
    // (does not perform a full validity check on the string)
    JSONSplitter.prototype.strend = function strend(s, o) {
        var oo = o;

        // find non-escaped "
        while ((oo = s.indexOf(this.fromchar('"'), oo+1)) >= 0) {
            for (var e = oo; this.tochar(s[--e]) == '\\'; );

            if ((oo-e) & 1) {
                return oo+1;
            }
        }

        return -1;
    };

    // returns the position after the end of the JSON number at o or -1 if none found
    JSONSplitter.prototype.numberre = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

    JSONSplitter.prototype.numend = function numend(s, o) {
        var oo = o;

        // (we do not set lastIndex due to the potentially enormous length of s)
        while ('0123456789-+eE.'.indexOf(this.tochar(s[oo])) >= 0) oo++;

        if (oo > o) {
            var r = this.numberre.exec(this.tostring(this.sub(s, o, oo-o)));

            if (r) {
                return o+r[0].length;
            }
        }

        return -1;
    };

    // process a JSON chunk (of a stream of chunks, if the browser supports it)
    // FIXME: rewrite without large string concatenation
    JSONSplitter.prototype.chunkproc = function json_chunkproc(chunk, inputcomplete) {
        // we are not receiving responses incrementally: process as growing buffer
        if (!chunked_method) return this.proc(chunk, inputcomplete);

        // otherwise, we just retain the data that is still going to be needed in the
        // next round... enabling infinitely large accounts to be "streamed" to IndexedDB
        // (in theory)
        if (this.rem.length) {
            // append to previous residue
            if (chunk) {
                this.rem = this.concat(this.rem, chunk);
            }
            chunk = this.rem;
        }

        // process combined residue + new chunk
        var r = this.proc(chunk, inputcomplete);

        if (r >= 0) {
            // processing ended
            this.rem = false;
            return r;
        }

        if (this.lastpos) {
            // remove processed data
            this.rem = this.sub(chunk, this.lastpos);

            this.p -= this.lastpos;
            this.lastpos = 0;
        }
        else {
            // no data was processed: store entire chunk
            this.rem = chunk;
        }

        return r;
    };

    // returns -1 if it wants more data, 0 in case of a fatal error, 1 when done
    JSONSplitter.prototype.proc = function json_proc(json, inputcomplete) {
        while (this.p < json.length) {
            var c = this.tochar(json[this.p]);

            if (c == '[' || c == '{') {
                if (!this.expectvalue) {
                    this.logger.error("Malformed JSON - unexpected object or array");
                    return 0;
                }

                this.stack.push(this.tochar(json[this.p]) + this.lastname);

                if (this.filters[this.stack.join('')]) {
                    // a filter is configured for this path - recurse
                    this.buckets[0] += this.tostring(this.sub(json, this.lastpos, this.p-this.lastpos));
                    this.lastpos = this.p;
                    this.buckets.unshift('');
                }

                this.p++;
                this.lastname = '';
                this.expectvalue = c == '[';
            }
            else if (c == ']' || c == '}') {
                if (this.expectvalue < 0) {
                    this.logger.error("Malformed JSON - premature array closure");
                    return 0;
                }

                if (!this.stack.length || "]}".indexOf(c) != "[{".indexOf(this.stack[this.stack.length-1][0])) {
                    this.logger.error("Malformed JSON - mismatched close");
                    return 0;
                }

                this.lastname = '';

                // check if this concludes an exfiltrated object and return it if so
                var callback = this.filters[this.stack.join('')];
                this.p++;

                if (callback) {
                    // we have a filter configured for this object
                    try {
                        // pass filtrate to application and empty bucket
                        callback.call(this.ctx,
                            JSON.parse(this.buckets[0]+this.tostring(this.sub(json, this.lastpos, this.p-this.lastpos)))
                        );
                    } catch (e) {
                        this.logger.error("Malformed JSON - parse error in filter element " + callback.name, e);
                        return 0;
                    }

                    this.buckets.shift();
                    this.lastpos = this.p;
                }

                this.stack.pop();
                this.expectvalue = 0;
            }
            else if (c == ',') {
                if (this.expectvalue) {
                    this.logger.error("Malformed JSON - stray comma");
                    return 0;
                }
                if (this.lastpos == this.p) {
                    this.lastpos++;
                }
                this.p++;
                this.expectvalue = this.stack[this.stack.length-1][0] == '[';
            }
            else if (c == '"') {
                var t = this.strend(json, this.p);
                if (t < 0) {
                    break;
                }

                if (this.expectvalue) {
                    this.p = t;
                    this.expectvalue = false;
                }
                else {
                    // (need at least one char after end of property string)
                    if (t == json.length) {
                        break;
                    }

                    if (this.tochar(json[t]) != ':') {
                        this.logger.error("Malformed JSON - no : found after property name");
                        return 0;
                    }

                    this.lastname = this.tostring(this.sub(json, this.p+1, t-this.p-2));
                    this.expectvalue = -1;
                    this.p = t+1;
                }
            }
            else if (c >= '0' && c <= '9' || c == '.' || c == '-') {
                if (!this.expectvalue) {
                    this.logger.error("Malformed JSON - unexpected number");
                    return 0;
                }

                var t = this.numend(json, this.p);

                if (t == json.length) {
                    // numbers, on the face of them, do not tell whether they are complete yet
                    // fortunately, we have the "inputcomplete" flag to assist
                    if (inputcomplete && !this.stack.length) {
                        // this is a stand-alone number, do we have a callback for them?
                        callback = this.filters['#'];
                        if (callback) {
                            callback.call(this.ctx, this.tostring(json));
                        }
                        return 1;
                    }
                    break;
                }

                if (t < 0) {
                    break;
                }

                this.p = t;
                this.expectvalue = false;
            }
            else if (c == ' ') {
                // a concession to the API team's aesthetic sense
                // FIXME: also support tab, CR, LF
                this.p++;
            }
            else {
                this.logger.error("Malformed JSON - bogus char at position " + this.p);
                return 0;
            }
        }

        return (!this.expectvalue && !this.stack.length) ? 1 : (inputcomplete ? (json === false) : -1);
    };
    Object.freeze(JSONSplitter.prototype);

    window.JSONSplitter = JSONSplitter;
})();
