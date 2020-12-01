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

var crypt = (function() {
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
    ns.PUBKEY_VARIABLE_MAPPING = {
        Ed25519: 'u_pubEd25519',
        Cu25519: 'u_pubCu25519',
        RSA: null
    };

    /** Maps the storage variable for a private key type. */
    ns.PRIVKEY_VARIABLE_MAPPING = {
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
     * @param [userData] {string}
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
            var __settleFunction = function(res, ctx, xhr, tResult, fromCache) {
                if (typeof res === 'object') {

                    var debugUserHandle = userhandle;
                    if (userhandle !== res.u) {
                        debugUserHandle += ' (' + res.u + ')';
                    }

                    var pubKey = crypto_decodepubkey(base64urldecode(res.pubk));

                    // cache it, the legacy way.
                    u_pubkeys[userhandle] = u_pubkeys[res.u] = pubKey;

                    if (d > 1 || is_karma) {
                        logger.debug('Got ' + keyType + ' pub key of user ' + debugUserHandle);
                    }

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
                    if (d > 1 || is_karma) {
                        logger.warn(keyType + ' pub key for ' + userhandle + ' could not be retrieved: ' + res);
                    }
                    masterPromise.reject(res, [res, userData]);
                }
            };

            // Assemble context for this async API request.
            myCtx.u = userhandle;
            myCtx.callback = __settleFunction;

            var __retrieveRsaKeyFunc = function() {
                // Fire it off.
                api_req({a: 'uk', u: userhandle}, myCtx);
            };

            if (attribCache) {
                attribCache.getItem(cacheKey)
                    .done(function(r) {
                        if (r && r.length !== 0) {
                            __settleFunction(JSON.parse(r), undefined, undefined, undefined, true);
                        }
                        else {
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
            var pubKeyPromise = userData && userData.chatHandle ?
                    mega.attr.get(userhandle, ns.PUBKEY_ATTRIBUTE_MAPPING[keyType], true, false,
                        undefined, undefined, userData.chatHandle) :
                    mega.attr.get(userhandle, ns.PUBKEY_ATTRIBUTE_MAPPING[keyType], true, false);

            pubKeyPromise.done(function(result) {
                result = base64urldecode(result);
                ns.getPubKeyCacheMapping(keyType)[userhandle] = result;
                if (d > 1) {
                    logger.debug('Got ' + keyType + ' pub key of user ' + userhandle + '.');
                }
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
        if (recorded === false) {
            return null;
        }

        var fingerprint = authring.computeFingerprint(pubKey, keyType, 'string');
        if (recorded && authring.equalFingerprints(recorded.fingerprint, fingerprint) === false) {

            logger.warn('Error verifying authenticity of ' + keyType + ' pub key: '
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

    ns.getPubKeyViaChatHandle = function(userhandle, keyType, chathandle, callback) {
        // This promise will be the one which is going to be returned.
        var masterPromise = new MegaPromise();
        // Some things we need to progress.
        var pubKeyCache = ns.getPubKeyCacheMapping(keyType);
        var authMethod;
        var newAuthMethod;

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
        // Get out quickly if the key is cached.
        if (pubKeyCache[userhandle]) {
            masterPromise.resolve(pubKeyCache[userhandle]);
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        }

        // And now for non-cached keys.

        /** Persist potential changes in authentication, call callback and exit. */
        var __finish = function(pubKey, authMethod, newAuthMethod) {
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        };

        // Get the pub key and update local variable and the cache.
        var getPubKeyPromise = ns.getPubKeyAttribute(userhandle, keyType, {'chatHandle': chathandle});

        getPubKeyPromise.done(function __resolvePubKey(result) {
            var pubKey = result;
            pubKeyCache[userhandle] = pubKey;
            masterPromise.resolve(pubKey);

                // Finish off.
                __finish(pubKey, authMethod, newAuthMethod);
        });
        masterPromise.linkFailTo(getPubKeyPromise);
        return masterPromise;
    };
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

        if (!anonymouschat && (authring.hadInitialised() === false || typeof u_authring === 'undefined')) {
            // Need to initialise the authentication system (authring).
            if (d > 1) {
                logger.debug('Waiting for authring to initialise first.', 'Tried to access: ', userhandle, keyType);
            }

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
                    newAuthMethod, authring.KEY_CONFIDENCE.UNSURE);
            }
            __callbackAttachAfterDone(masterPromise);

            return masterPromise;
        };

        // Get the pub key and update local variable and the cache.
        var getPubKeyPromise = ns.getPubKeyAttribute(userhandle, keyType);

        // 2020-03-31: nowadays there is no point on verifying non-contacts...
        var isNonContact = !is_karma && M.getUserByHandle(userhandle).c !== 1;
        if (isNonContact) {
            if (d) {
                logger[d > 1 ? 'warn' : 'info']('Skipping %s verification for non-contact "%s"', keyType, userhandle);
            }

            getPubKeyPromise.done(function(pubKey) {
                pubKeyCache[userhandle] = pubKey;
                masterPromise.resolve(pubKey);
                __callbackAttachAfterDone(masterPromise);
            });
            masterPromise.linkFailTo(getPubKeyPromise);
            return masterPromise;
        }

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
            var signaturePromise = mega.attr.get(userhandle, ns.PUBKEY_SIGNATURE_MAPPING[keyType], true, false);

            // Signing key and signature required for verification.
            var signatureVerificationPromise = MegaPromise.all([
                getPubKeyPromise,
                pubEd25519KeyPromise,
                signaturePromise
            ]);

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
     * Cached Ed25519 public key retrieval utility via chat handle.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param chathandle {string}
     *     Mega chat handle.
     * @param [callback] {function}
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
    ns.getPubEd25519ViaChatHandle = function(userhandle, chathandle, callback) {
        assertUserHandle(userhandle);
        return ns.getPubKeyViaChatHandle(userhandle, 'Ed25519', chathandle, callback);
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
     * Cached Curve25519 public key retrieval utility. If the key is cached, no API
     * request will be performed. The key's authenticity is validated through
     * the tracking in the authring and signature verification.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param chathandle {string}
     *     Mega chat handle.
     * @param [callback] {function}
     *     (Optional) Callback function to call upon completion of operation. The callback
     *     requires one parameter: the actual public Cu25519 key. The user handle is
     *     passed as a second parameter, and may be obtained that way if the call
     *     back supports it.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     The promise returns the Curve25519 public key.
     */
    ns.getPubCu25519ViaChatHandle = function(userhandle, chathandle, callback) {
        assertUserHandle(userhandle);
        return ns.getPubKeyViaChatHandle(userhandle, 'Cu25519', chathandle, callback);
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
     * Retrieve and cache all public keys for the given user/handle
     * @param {String} userHandle 11-chars-long user-handle
     * @returns {MegaPromise} fulfilled on completion
     */
    ns.getAllPubKeys = function(userHandle) {
        return new MegaPromise(function(resolve, reject) {
            var promises = [];
            assertUserHandle(userHandle);

            if (!pubCu25519[userHandle]) {
                promises.push(crypt.getPubCu25519(userHandle));
            }

            if (!pubEd25519[userHandle]) {
                promises.push(crypt.getPubEd25519(userHandle));
            }

            if (!u_pubkeys[userHandle]) {
                promises.push(crypt.getPubRSA(userHandle));
            }

            MegaPromise.allDone(promises).then(resolve).catch(reject);
        });
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

        // Keep format consistent
        prevFingerprint = (prevFingerprint.length === 40) ? prevFingerprint : ns.stringToHex(prevFingerprint);
        newFingerprint = (newFingerprint.length === 40) ? newFingerprint : ns.stringToHex(newFingerprint);

        // Show warning dialog if it hasn't been locally overriden (as needed by poor user Fiup who added 600
        // contacts during the 3 week broken period and none of them are signing back in to heal their stuff).
        authring.showCryptoWarningDialog('credentials', userHandle, keyType, prevFingerprint, newFingerprint)
            .dump('cred-fail');

        // Remove the cached key, so the key will be fetched and checked against
        // the stored fingerprint again next time.
        delete ns.getPubKeyCacheMapping(keyType)[userHandle];

        logger.warn(keyType + ' fingerprint does not match the previously authenticated one!\n'
            + 'Previous fingerprint: ' + prevFingerprint + '.\nNew fingerprint: ' + newFingerprint + '.');
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

        // Show warning dialog if it hasn't been locally overriden (as need by poor user Fiup who added 600
        // contacts during the 3 week broken period and none of them are signing back in to heal their stuff).
        authring.showCryptoWarningDialog('signature', userHandle, keyType).dump('sign-fail');

        logger.error(keyType + ' signature does not verify for user ' + userHandle + '!');
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
        var lengthString = String.fromCharCode(cleartext.length >> 8) + String.fromCharCode(cleartext.length & 0xff);

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
        if (cleartext === false) {
            return false;
        }

        var length = (cleartext.charCodeAt(0) << 8) | cleartext.charCodeAt(1);
        cleartext = cleartext.substring(2, length + 2);

        return utf8convert ? from8(cleartext) : cleartext;
    };


    return ns;
}());
