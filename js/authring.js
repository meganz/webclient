/**
 * @fileOverview
 * Storage of authenticated contacts.
 */

var u_authring = { 'Ed25519': undefined,
                   'Cu25519': undefined,
                   'RSA': undefined };

var authring = (function () {
    "use strict";

    /**
     * @description
     * <p>Storage of authenticated contacts.</p>
     *
     * <p>
     * A container (key ring) that keeps information of the authentication state
     * for all authenticated contacts. Each record is indicated by the contact's
     * userhandle as an attribute. The associated value is an object containing
     * the authenticated `fingerprint` of the public key, the authentication
     * `method` (e. g. `authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON`)
     * and the key `confidence` (e. g. `authring.KEY_CONFIDENCE.UNSURE`).</p>
     *
     * <p>
     * The records are stored in a concatenated fashion, with each user handle
     * represented in its compact 8 byte form followed by a the fingerprint as a
     * byte string and a "trust indicator" byte containing the authentication and
     * confidence information. Therefore each authenticated user "consumes"
     * 29 bytes of storage.</p>
     *
     * <p>
     * Load contacts' authentication info with `authring.getContacts()` and save
     * with `authring.setContacts()`.</p>
     */
    var ns = {};
    var logger = MegaLogger.getLogger('authring');
    ns._logger = logger;

    ns._initialisingPromise = false;

    /**
     * "Enumeration" of authentication methods. The values in here must fit
     * into 4 bits of a byte.
     *
     * @property SEEN {integer}
     *     To record a "seen" fingerprint, to be able to check for future changes.
     * @property FINGERPRINT_COMPARISON {integer}
     *     Direct/full fingerprint comparison.
     * @property SIGNATURE_VERIFIED {integer}
     *     Verified key's signature.
     */
    ns.AUTHENTICATION_METHOD = {
        SEEN: 0x00,
        FINGERPRINT_COMPARISON: 0x01,
        SIGNATURE_VERIFIED: 0x02
    };
    var _ALLOWED_AUTHENTICATION_METHODS = [0x00, 0x01, 0x02];


    /**
     * "Enumeration" of confidence in contact's key. The values in here must fit
     * into 4 bits of a byte.
     *
     * @property UNSURE {integer}
     *     Direct fingerprint comparison.
     */
    ns.KEY_CONFIDENCE = {
        UNSURE: 0x00
    };
    var _ALLOWED_KEY_CONFIDENCES = [0x00];

    // User property names used for different key types.
    ns._PROPERTIES = { 'Ed25519': 'authring',
                       'Cu25519': 'authCu255',
                       'RSA': 'authRSA' };

    /**
     * Serialises a single authentication record.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param fingerprint {string}
     *     Fingerprint to authenticate as a byte or hex string.
     * @param method {byte}
     *     Indicator used for authentication method. One of
     *     authring.AUTHENTICATION_METHOD (e. g. FINGERPRINT_COMPARISON).
     * @param confidence {byte}
     *     Indicator used for confidence. One of authring.KEY_CONFIDENCE
     *     (e. g. UNSURE).
     * @returns {string}
     *     Single binary encoded authentication record.
     * @private
     */
    ns._serialiseRecord = function(userhandle, fingerprint, method, confidence) {
        var fingerprintString = fingerprint;
        if (fingerprint.length !== 20) {
            // Assuming a hex fingerprint has been passed.
            fingerprintString = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(fingerprint));
        }
        return base64urldecode(userhandle)
               + fingerprintString
               + String.fromCharCode((confidence << 4) | method);
    };


    /**
     * Generates a binary encoded serialisation of an authentication ring
     * object.
     *
     * @param authring {Object}
     *     Object containing (non-nested) authentication records for Mega user
     *     handles (as keys) and `fingerprint`, `method` and `confidence` as
     *     attributes of the `value` object.
     * @returns {String}
     *     Single binary encoded serialisation of authentication ring.
     */
    ns.serialise = function(authring) {

        var result = '';
        var record;
        for (var userhandle in authring) {
            if (!authring.hasOwnProperty(userhandle)) {
                continue;
            }
            record = authring[userhandle];

            // Skip obviously faulty records.
            if ((record.fingerprint.length % 20 !== 0)
                    || _ALLOWED_AUTHENTICATION_METHODS.indexOf(record.method) === -1
                    || _ALLOWED_KEY_CONFIDENCES.indexOf(record.confidence) === -1) {
                continue;
            }

            result += this._serialiseRecord(userhandle, record.fingerprint,
                                            record.method, record.confidence);
        }

        return result;
    };


    /**
     * Splits and decodes an authentication record off of a binary keyring
     * serialisation and returns the record and the rest.
     *
     * @param serialisedRing {String}
     *     Single binary encoded container of authentication records.
     * @returns {Object}
     *     Object containing three elements: `userhandle` contains the Mega
     *     user handle, `value` contains an object (with the `fingerprint` in a
     *     byte string, authentication `method` and key `confidence`) and `rest`
     *     containing the remainder of the serialisedRing still to decode.
     * @private
     */
    ns._deserialiseRecord = function(serialisedRing) {

        var userhandle = base64urlencode(serialisedRing.substring(0, 8));
        var fingerprint =  serialisedRing.substring(8, 28);
        var authAttributes = serialisedRing.charCodeAt(28);
        var rest = serialisedRing.substring(29);
        var confidence = (authAttributes >>> 4) & 0x0f;
        var method = authAttributes & 0x0f;

        return { userhandle: userhandle,
                 value: { fingerprint: fingerprint,
                          method: method,
                          confidence: confidence },
                 rest: rest };
    };


    /**
     * Decodes a binary encoded serialisation to an authentication ring object.
     *
     * @param serialisedRing {String}
     *     Single binary encoded serialisation of authentication records.
     * @returns {Object}
     *     Object containing (non-nested) authentication records for Mega user
     *     handles (as keys) and `fingerprint`, `method` and `confidence` as
     *     attributes of the `value` object.
     */
    ns.deserialise = function(serialisedRing) {

        var rest = serialisedRing;
        var container = {};

        while (rest.length > 0) {
            var result = ns._deserialiseRecord(rest);
            rest = result.rest;

            // Skip obviously faulty records.
            if ((result.value.fingerprint.length % 20 !== 0)
                    || _ALLOWED_AUTHENTICATION_METHODS.indexOf(result.value.method) === -1
                    || _ALLOWED_KEY_CONFIDENCES.indexOf(result.value.confidence) === -1) {
                continue;
            }

            container[result.userhandle] = result.value;
        }

        return container;
    };


    /**
     * Loads the ring for all authenticated contacts into `u_authring`.
     *
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519'  or 'RSA'.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.getContacts = function(keyType) {
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported authentication key type: ' + keyType);

            return MegaPromise.reject(EARGS);
        }

        // This promise will be the one which is going to be returned.
        var masterPromise = new MegaPromise();

        var attributePromise = mega.attr.get(u_handle, ns._PROPERTIES[keyType],
                                                false, true);

        attributePromise.done(function _attributePromiseResolve(result) {
            if (typeof result !== 'number') {
                // Authring is in the empty-name record.
                u_authring[keyType] = ns.deserialise(result['']);
                logger.debug('Got authentication ring for key type '
                             + keyType + '.');
                masterPromise.resolve(u_authring[keyType]);
            }
            else if (result === ENOENT) {
                // This authring is missing. Let's make it.
                logger.debug('No authentication ring for key type '
                             + keyType + ', making one.');
                u_authring[keyType] = {};
                ns.setContacts(keyType);
                masterPromise.resolve(u_authring[keyType]);
            }
            else {
                logger.error('Error retrieving authentication ring for key type '
                             + keyType + ': ' + result);
                masterPromise.reject(result);
            }
        });

        attributePromise.fail(function _attributePromiseReject(result) {
            if (result === ENOENT) {
                // This authring is missing. Let's make it.
                logger.debug('No authentication ring for key type '
                             + keyType + ', making one.');
                u_authring[keyType] = {};
                ns.setContacts(keyType);
                masterPromise.resolve(u_authring[keyType]);
            }
            else {
                logger.error('Error retrieving authentication ring for key type '
                             + keyType + ': ' + result);
                masterPromise.reject(result);
            }
        });

        return masterPromise;
    };


    /**
     * Saves the ring for all authenticated contacts from `u_authring`.
     *
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519' or 'RSA'.
     * @param [preCleanedUpVals] pass an authring-like hash to set the keyType's authring, remotely to
     * `preCleanedUpVals`
     *
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.setContacts = function(keyType, preCleanedUpVals) {
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported authentication key type: ' + keyType);
            return MegaPromise.reject(EARGS);
        }

        var promise = new MegaPromise();

        this.onAuthringReady('setContacts')
            .fail(function() {
                promise.reject.apply(promise, arguments);
            })
            .done(function() {
                var val;
                if (!preCleanedUpVals) {
                    val = ns._getCleanedUpAuthring(keyType);
                }
                else {
                    val = preCleanedUpVals;
                }

                var attrPromise = mega.attr.set(ns._PROPERTIES[keyType],
                    {'': ns.serialise(val)}, false, true);

                promise.linkDoneAndFailTo(attrPromise);
            });

        return promise;
    };


    /**
     * Gets the authentication state of a certain contact for a particular key type.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519' or 'RSA'.
     * @return {object}
     *     An object describing the authenticated `fingerprint`, the
     *     authentication `method` and the key `confidence`. `false` in case
     *     of an unauthorised contact.
     */
    ns.getContactAuthenticated = function(userhandle, keyType) {
        assertUserHandle(userhandle);
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported key type: ' + keyType);

            return false;
        }

        if (u_authring[keyType] === undefined) {
            logger.error('First initialise u_authring by calling authring.getContacts()');

            return false;
        }

        if (u_authring[keyType].hasOwnProperty(userhandle)) {
            return u_authring[keyType][userhandle];
        }

        return false;
    };


    /**
     * Stores a contact authentication for a particular key type.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param fingerprint {string}
     *     Fingerprint to authenticate as a byte or hex string.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @param method {byte}
     *     Indicator used for authentication method. One of
     *     authring.AUTHENTICATION_METHOD (e. g. FINGERPRINT_COMPARISON).
     * @param confidence {byte}
     *     Indicator used for confidence. One of authring.KEY_CONFIDENCE
     *     (e. g. UNSURE).
     */
    ns.setContactAuthenticated = function(userhandle, fingerprint, keyType,
                                          method, confidence) {

        assertUserHandle(userhandle);

        if (!M.u[userhandle] || typeof M.u[userhandle].c === 'undefined') {
            // we don't want to track non-contacts, but allow ex-contacts to be added/set in the authring.
            return;
        }
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported key type: ' + keyType);

            return;
        }
        if (typeof u_authring[keyType] === 'undefined') {
            logger.error('First initialise u_authring by calling authring.getContacts()');

            return;
        }
        if (userhandle === u_handle) {
            // We don't want to track ourself. Let's get out of here.
            return;
        }

        var oldRecord = u_authring[keyType][userhandle];
        if (!oldRecord
                || !ns.equalFingerprints(oldRecord.fingerprint, fingerprint)
                || (oldRecord.method !== method)
                || (oldRecord.confidence !== confidence)) {
            // Need to update the record.
            u_authring[keyType][userhandle] = { fingerprint: fingerprint,
                                                method: method,
                                                confidence: confidence };
            return ns.setContacts(keyType);
        }
    };


    /**
     * Computes the given public key's cryptographic fingerprint. On RSA keys,
     * the modulo (index 0 of key array) and exponent (index 1) are first
     * concatenated.
     *
     * @param key {(String|Array)}
     *     Public key in the form of a byte string or array (RSA keys).
     * @param keyType {String}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519' or 'RSA'.
     * @param format {String}
     *     Format in which to return the fingerprint. Valid values: "string"
     *     and "hex" (default: "hex").
     * @return {String}
     *     Fingerprint value in the requested format.
     */
    ns.computeFingerprint = function(key, keyType, format) {
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported key type: ' + keyType);

            return '';
        }
        if (!key) {
            logger.error('Invalid key for: ' + keyType);

            return '';
        }
        format = format || 'hex';
        keyType = keyType || 'Ed25519';

        var value = key;
        if (keyType === 'Ed25519' || keyType === 'Cu25519') {
            if (key.length !== 32) {
                logger.error('Unexpected key length for type ' + keyType
                             + ': ' + key.length);

                return '';
            }
        }
        else if (keyType === 'RSA') {
            value = key[0] + key[1];
        }
        else {
            logger.error('Unexpected key type for fingerprinting: ' + keyType);

            return '';
        }

        if (format === "string") {
            return asmCrypto.bytes_to_string(asmCrypto.SHA256.bytes(value)).substring(0, 20);
        }
        else if (format === "hex") {
            return asmCrypto.SHA256.hex(value).substring(0, 40);
        }
    };


    /**
     * Signs the given public key using our own Ed25519 key. On RSA pub keys,
     * the modulo (index 0 of key array) and exponent (index 1) are first
     * concatenated before signing.
     *
     * @param pubKey {array}
     *     The public key to sign.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519' or 'RSA'.
     * @return {string}
     *     EdDSA signature of the key as a byte string.
     */
    ns.signKey = function(pubKey, keyType) {
        if (!pubKey) {
            logger.error('No key to sign.');

            return;
        }
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported key type: ' + keyType);

            return;
        }
        var timeStamp = ns._longToByteString(Math.round(Date.now() / 1000));
        var value = pubKey;
        if (keyType === 'RSA') {
            value = pubKey[0] + pubKey[1];
        }
        var keyString = 'keyauth' + timeStamp + value;
        var detachedSignature = nacl.sign.detached(asmCrypto.string_to_bytes(keyString),
                                                   asmCrypto.string_to_bytes(u_privEd25519 + u_pubEd25519));
        return timeStamp + asmCrypto.bytes_to_string(detachedSignature);
    };


    /**
     * Verifies the signature of the given public key's against the
     * contact's Ed25519 key.
     *
     * @param signature {string}
     *     EdDSA signature in byte string format.
     * @param pubKey {array}
     *     The public key to verify.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519',
     *     'Cu25519' or 'RSA'.
     * @param signPubKey {string}
     *     Contact's Ed25519 public key to verify the signature.
     * @return {MegaPromise}
     *     True on a good signature verification, false otherwise.
     */
    ns.verifyKey = function(signature, pubKey, keyType, signPubKey) {
        // Bail out if nothing to do.
        if (ns._PROPERTIES[keyType] === undefined) {
            logger.error('Unsupported key type: ' + keyType);

            return MegaPromise.resolve(null);
        }
        if (!signature) {
            logger.warn('Cannot verify an empty signature.');

            return MegaPromise.resolve(null);
        }

        var signatureValue = signature.substring(8);
        var timestamp = signature.substring(0, 8);
        var timestampValue = ns._byteStringToLong(timestamp);
        if (timestampValue > Math.round(Date.now() / 1000)) {
            logger.error('Bad timestamp: In the future!');

            return MegaPromise.resolve(null);
        }
        var value = pubKey;
        if (keyType === 'RSA') {
            value = pubKey[0] + pubKey[1];
        }
        var keyString = 'keyauth' + timestamp + value;
        return backgroundNacl.sign.detached.verify(asmCrypto.string_to_bytes(keyString),
                                         asmCrypto.string_to_bytes(signatureValue),
                                         asmCrypto.string_to_bytes(signPubKey));
    };


    /**
     * Compare two fingerprints.
     *
     * @param fp1 {string}
     *     First fingerprint in byte or hex string format.
     * @param fp2 {string}
     *     Second fingerprint. in byte or hex string format
     * @return {bool}
     *     True on equality, `undefined` if one fingerprint is undefined,
     *     false otherwise.
     */
    ns.equalFingerprints = function(fp1, fp2) {
        if (fp1 === undefined || fp2 === undefined) {
            return undefined;
        }
        if (fp1.length !== 20) {
            fp1 = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(fp1));
        }
        if (fp2.length !== 20) {
            fp2 = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(fp2));
        }
        return fp1 === fp2;
    };


    /**
     * Convert a long integer (> 32-bit) to an 8-byte bit-endian string.
     *
     * @param value {integer}
     *     Integer input.
     * @return {string}
     *     Big-endian byte string representation.
     */
    ns._longToByteString = function(value) {
        if (value > 9007199254740991) {
            // Check for value > Number.MAX_SAFE_INTEGER (not available in all JS).
            logger.error('Integer not suitable for lossless conversion in JavaScript.');

            return '';
        }
        var result = '';

        for (var i = 0; i < 8; i++ ) {
            result = String.fromCharCode(value & 0xff) + result;
            value = Math.floor(value / 0x100);
        }

        return result;
    };


    /**
     * Convert an 8-byte bit-endian string to a long integer (> 32-bit).
     *
     * @param sequence {string}
     *     Big-endian byte string representation.
     * @return {intenger}
     *     Integer representation.
     */
    ns._byteStringToLong = function(sequence) {
        var value = 0;
        for (var i = 0; i < 8; i++) {
            value = (value * 256) + sequence.charCodeAt(i);
        }
        // Check for value > Number.MAX_SAFE_INTEGER (not available in all JS).
        if (value > 9007199254740991) {
            logger.error('Integer not suitable for lossless conversion in JavaScript.');

            return;
        }

        return value;
    };


    /**
     * Purges all fingerprints from the authentication rings.
     *
     * @return
     *     void
     */
    ns.scrubAuthRing = function() {
        u_authring.Ed25519 = {};
        ns.setContacts('Ed25519');
        u_authring.Cu25519 = {};
        ns.setContacts('Cu25519');
        u_authring.RSA = {};
        ns.setContacts('RSA');
    };


    /**
     * Resets the seen or verified fingerprints for a particular user.
     * @param {string} userHandle The user handle e.g. EWh7LzU3Zf0
     */
    ns.resetFingerprintsForUser = function(userHandle) {
        assertUserHandle(userHandle);
        delete u_authring.Ed25519[userHandle];
        delete u_authring.Cu25519[userHandle];
        delete u_authring.RSA[userHandle];

        ns.setContacts('Ed25519');
        ns.setContacts('Cu25519');
        ns.setContacts('RSA');
    };


    /**
     * Checks if the authring was initialised (initialised = true, not initialised OR initialising = false)
     *
     * @returns {boolean}
     */
    ns.hadInitialised = function() {
        return ns._initialisingPromise === true;
    };

    /**
     * Invoke authring-operation once initialization has succeed.
     *
     * @returns {MegaPromise}
     */
    ns.onAuthringReady = function(debugTag) {
        var promise = new MegaPromise();

        if (d > 1) {
            logger.log('authring.onAuthringReady', debugTag);
        }

        if (this.hadInitialised() === false) {
            logger.debug('Will wait for authring to initialize...', debugTag);
            promise.linkDoneAndFailTo(this.initAuthenticationSystem());
        }
        else {
            // Always resolve asynchronously
            // TODO: upgrade to jQuery v3 ...
            Soon(function() {
                if (u_authring.Ed25519) {
                    return promise.resolve();
                }

                logger.error('Unexpected authring failure...', debugTag);
                promise.reject(EINTERNAL);
            });
        }

        return promise;
    };

    /**
     * Initialises the authentication system.
     *
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.initAuthenticationSystem = function() {

        if (pfid) {
            console.error('Do not initialize the authentication system on folder-links.');
            return MegaPromise.reject(EACCESS);
        }

        // Make sure we're initialising only once.
        if (ns._initialisingPromise !== false) {
            if (ns._initialisingPromise === true) {
                // Already initialised.
                return MegaPromise.resolve();
            }
            else if (ns._initialisingPromise instanceof MegaPromise) {
                // Initialisation is in progress.
                // (Don't initialise more than once, return the master promise.)
                return ns._initialisingPromise;
            }
            else {
                logger.error(
                    "Failed to initAuthSystem because of invalid _initialisingPromise state of: ",
                    ns._initialisingPromise
                );

                return MegaPromise.reject();
            }
        }

        if (d) {
            console.time('authring.initAuthenticationSystem');
        }

        // The promise to return.
        var masterPromise = ns._initialisingPromise = new MegaPromise();

        // Initialise basic authentication system with Ed25519 keys first.
        var keyringPromise = ns._initKeyringAndEd25519();

        keyringPromise.done(function __baseAuthSystemDone() {
            var rsaPromise = ns._initKeyPair('RSA');
            var cu25519Promise = ns._initKeyPair('Cu25519');

            var prefilledRsaKeysPromise = new MegaPromise();
            rsaPromise.done(function() {
                prefilledRsaKeysPromise.linkDoneAndFailTo(
                    ns._initAndPreloadRSAKeys()
                );
            });

            var comboPromise = MegaPromise.all([rsaPromise, cu25519Promise]);

            masterPromise.linkDoneAndFailTo(comboPromise);
        });
        keyringPromise.fail(function __baseAuthSystemFail() {
            masterPromise.reject();
        });

        masterPromise
            .done(function() {
                ns.initialSetup();
                ns._initialisingPromise = true;
            })
            .fail(function() {
                ns._initialisingPromise = false;
            })
            .always(function() {
                if (d) {
                    console.timeEnd('authring.initAuthenticationSystem');
                }
            });

        return masterPromise;
    };


    /**
     * Preloads and fills the cache/data structures with all contacts' RSA keys.
     *
     * @returns {MegaPromise} promise that will be resolved after all keys are loaded/fetched.
     * @private
     */
    ns._initAndPreloadRSAKeys = function() {
        var loadingPromises = [];
        // prefill keys required for a/v calls
        Object.keys(M.u).forEach(function(h) {
            var contact = M.u[h];
            if (contact && contact.u && contact.c === 1) {
                loadingPromises.push(
                    crypt.getPubRSA(contact.u)
                );
            }
        });
        return MegaPromise.allDone(loadingPromises);
    };


    ns._getCleanedUpAuthring = function(keyType) {
        var val = {};
        var store = (u_authring[keyType] || {});
        var keys = Object.keys(store);
        for (var i = 0; i < keys.length; i++) {
            var h = keys[i];
            if (M.u[h] && typeof M.u[h].c !== 'undefined' && M.u[h].c !== 2) {
                val[h] = u_authring[keyType][h];
            }
        }
        return val;
    };

    ns.initialSetup = function() {
        // initial re-setup so that .setContacts would clean any non-contacts stucked in authring.
        var keyTypes = Object.keys(ns._PROPERTIES);
        for (var i = 0; i < keyTypes.length; i++) {
            var keyType = keyTypes[i];

            var authringVals = Object.keys(u_authring[keyType] || {});
            authringVals.sort();

            var authringCleanedKeys = ns._getCleanedUpAuthring(keyType);
            var authringCleanedVals = Object.keys(authringCleanedKeys);
            authringCleanedVals.sort();

            // after sorting those 2, IF they are not the same (e.g. one have contact, that the other one doesn't),
            // that simply means the `_getCleanedUpAuthring` removed non-contact fingerprint (that were never contacts
            // or have shares).
            if (authringVals.join(',') !== authringCleanedVals.join(',')) {
                ns.setContacts(keyType, authringCleanedKeys);
            }
        }
    };

    /**
     * Initialises the key ring for private keys and the authentication key
     * (Ed25519).
     *
     * @private
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns._initKeyringAndEd25519 = function() {
        // The promise to return.
        var masterPromise = new MegaPromise();

        // XXX: u_attr.u is read-only, BUT this is a weak protection unless we make the whole object
        // read-only as well..tricky, however we may want to still allow this for testing purposes..
        if (!is_karma && (typeof u_attr !== 'object' || u_attr.u !== window.u_handle || u_attr.keyring)) {
            logger.error('Doh! Tampering attempt...', u_handle, [u_attr]);

            if (location.host === 'mega.nz' || is_extension) {
                return masterPromise.reject(EACCESS);
            }

            // eslint-disable-next-line no-alert
            if (!confirm('You are about to overwrite your own account keys - is this intended?')) {
                location.reload(true);
                return masterPromise;
            }

            logger.warn('Good luck!..');
        }

        // Load private keys.
        var attributePromise = mega.attr.get(u_handle, 'keyring', false, false);
        attributePromise.done(function __attributePromiseResolve(result) {
            // Set local values.
            u_keyring = result;
            u_attr.keyring = u_keyring;

            // Ed25519 signing/authentication key.
            u_privEd25519 = u_keyring.prEd255;
            u_attr.prEd255 = u_privEd25519;
            u_pubEd25519 = asmCrypto.bytes_to_string(nacl.sign.keyPair.fromSeed(
                asmCrypto.string_to_bytes(u_privEd25519)).publicKey);
            u_attr.puEd255 = u_pubEd25519;
            pubEd25519[u_handle] = u_pubEd25519;

            // Run on the side a sanity check on the stored pub key.
            ns._checkPubKey(u_pubEd25519, 'Ed25519');
            crypt.setPubKey(u_pubEd25519, 'Ed25519');

            // Load authring and we're done.
            var authringPromise = authring.getContacts('Ed25519');
            masterPromise.linkDoneAndFailTo(authringPromise);
        });
        attributePromise.fail(function __attributePromiseReject(result) {
            if (result === ENOENT) {
                // We don't have it set up, yet. Let's do so now.
                logger.warn('Authentication system seems non-existent. Setting up ...');

                // Make a new key pair.
                var keyPair = nacl.sign.keyPair();
                u_privEd25519 = asmCrypto.bytes_to_string(keyPair.secretKey.subarray(0, 32));
                u_attr.prEd255 = u_privEd25519;
                u_pubEd25519 = asmCrypto.bytes_to_string(keyPair.publicKey);
                u_attr.puEd255 = u_pubEd25519;
                u_keyring = {
                    prEd255: u_privEd25519
                };
                u_attr.keyring = u_keyring;
                pubEd25519[u_handle] = u_pubEd25519;

                // Store private keyring and public key.
                var keyringPromise = mega.attr.set('keyring', u_keyring,
                                                      false, false);
                var pubkeyPromise = mega.attr.set('puEd255',
                                                     base64urlencode(u_pubEd25519),
                                                     true, false);
                var authringPromise = authring.getContacts('Ed25519');

                var comboPromise = MegaPromise.all([keyringPromise,
                                                    pubkeyPromise,
                                                    authringPromise]);
                masterPromise.linkDoneAndFailTo(comboPromise);
            }
            else {
                var message = 'Error retrieving key ring: ' + result;
                logger.error(message);
                // Let's pass a rejection upstream.
                masterPromise.reject(result);
            }
        });

        return masterPromise;
    };


    /**
     * Generates a key pair and sets up all required data structures for
     * insuring its authenticity.
     *
     * @private
     * @param keyType {string}
     *     Key type. Allowed values: 'Cu25519'.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns._setupKeyPair = function(keyType) {
        var keyPair;
        var privKey;
        var pubKey;

        if (keyType === 'Cu25519') {
            keyPair = nacl.box.keyPair();
            privKey = asmCrypto.bytes_to_string(keyPair.secretKey);
            pubKey = asmCrypto.bytes_to_string(keyPair.publicKey);
        }
        else {
            logger.error('Unsupported key type for key generation: ' + keyType);
            return MegaPromise.reject(EARGS);
        }

        window[crypt.PRIVKEY_VARIABLE_MAPPING[keyType]] = privKey;
        window[crypt.PUBKEY_VARIABLE_MAPPING[keyType]] = pubKey;
        u_keyring[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
        u_attr.keyring[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
        u_attr[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
        u_attr[crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType]] = pubKey;
        crypt.getPubKeyCacheMapping(keyType)[u_handle] = pubKey;
        var pubKeySignature = ns.signKey(pubKey, keyType);
        var keyringPromise = mega.attr.set('keyring', u_keyring, false, false);
        var pubkeyPromise = mega.attr.set(crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType],
                                             base64urlencode(pubKey),
                                             true, false);
        var signaturePromise = mega.attr.set(crypt.PUBKEY_SIGNATURE_MAPPING[keyType],
                                                base64urlencode(pubKeySignature),
                                                true, false);
        var authringPromise = authring.getContacts(keyType);

        return MegaPromise.all([keyringPromise, pubkeyPromise,
                                authringPromise, signaturePromise]);
    };


    /**
     * Initialises a key pair for use in the client.
     *
     * Note: It is expected that the Ed25519 private and public keys are loaded
     *       already.
     *
     * @private
     * @param keyType {string}
     *     Key type to set. Allowed values: 'Cu25519', 'RSA'.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns._initKeyPair = function(keyType) {
        // The promise to return.
        var masterPromise = new MegaPromise();

        if (keyType !== 'RSA' && keyType !== 'Cu25519') {
            logger.error('Unsupported key type for initialisation: ' + keyType);

            return MegaPromise.reject(EARGS);
        }

        var privKey = (keyType === 'RSA')
                    ? u_privk
                    : u_keyring[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]];

        if (privKey) {
            // Fire off various API calls we need downstream.
            var authringPromise = ns.getContacts(keyType);
            var signaturePromise = mega.attr.get(u_handle,
                                                    crypt.PUBKEY_SIGNATURE_MAPPING[keyType],
                                                    true, false);

            // Get the public key to the private key.
            var pubKey;
            var pubkeyPromise;
            if (keyType === 'RSA') {
                pubkeyPromise = crypt.getPubKeyAttribute(u_handle, 'RSA');
            }
            else {
                pubKey = crypt.getPubKeyFromPrivKey(privKey, keyType);
                pubkeyPromise = new MegaPromise();
                pubkeyPromise.resolve(pubKey);
            }

            pubkeyPromise.done(function __pubkeyResolve(result) {
                if (keyType === 'RSA') {
                    // Still need to fetch the RSA pub key.
                    pubKey = result;
                }
            });
            masterPromise.linkFailTo(pubkeyPromise);

            // Make sure we've got a signature.
            var gotSignaturePromise = new MegaPromise();
            signaturePromise.done(function __signatureResolve(result) {
                gotSignaturePromise.resolve(base64urldecode(result));
            });
            signaturePromise.fail(function __signatureReject(result) {
                if (result === ENOENT) {
                    // Signature undefined, let's pass to make one in the next step.
                    gotSignaturePromise.resolve(null);
                }
                else {
                    gotSignaturePromise.reject(result);
                }
            });

            // Check the signature, make one if we don't ahve one or it's inconsistent.
            var sigKeyComboPromise = MegaPromise.all([gotSignaturePromise,
                                                      pubkeyPromise]);
            sigKeyComboPromise.done(function __signatureComboResolve(result) {
                var signature = result[0];
                if (signature) {
                    // Now check the key's signature.
                    ns.verifyKey(signature, pubKey, keyType, u_pubEd25519)
                        .done(function(isVerified) {
                            if (isVerified) {
                                masterPromise.resolve();
                            }
                            else {
                                // Signature fails, make a good one and save it.
                                var pubKeySignature = authring.signKey(pubKey, keyType);
                                var setSignaturePromise = mega.attr.set(crypt.PUBKEY_SIGNATURE_MAPPING[keyType],
                                    base64urlencode(pubKeySignature),
                                    true, false);
                                var comboPromise = MegaPromise.all([authringPromise,
                                    setSignaturePromise]);
                                masterPromise.linkDoneAndFailTo(comboPromise);
                            }
                        });
                }
                else {
                    // Signature undefined.
                    signature = authring.signKey(pubKey, keyType);
                    mega.attr.set(crypt.PUBKEY_SIGNATURE_MAPPING[keyType],
                                     base64urlencode(signature),
                                     true, false);
                    masterPromise.resolve();
                }

                if (keyType === 'RSA') {
                    // We don't need the rest for RSA keys.
                    return;
                }

                // We're handling RSA keys in a legacy way, but all others like this.
                window[crypt.PRIVKEY_VARIABLE_MAPPING[keyType]] = privKey;
                window[crypt.PUBKEY_VARIABLE_MAPPING[keyType]] = pubKey;
                u_keyring[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
                u_attr[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
                u_attr[crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType]] = pubKey;
                u_attr.keyring[crypt.PRIVKEY_ATTRIBUTE_MAPPING[keyType]] = privKey;
                crypt.getPubKeyCacheMapping(keyType)[u_handle] = pubKey;

                // Run on the side a sanity check on the stored pub key.
                ns._checkPubKey(pubKey, keyType);
                crypt.setPubKey(pubKey, keyType);
            });
            masterPromise.linkFailTo(sigKeyComboPromise);
        }
        else {
            // Set up what's needed for the key type.
            // This should never be hit for an RSA key pair!
            masterPromise.linkDoneAndFailTo(ns._setupKeyPair(keyType));
        }

        return masterPromise;
    };


    /**
     * This is a check to run on one's *own* pub key against the private key.
     *
     * @private
     * @param pubKey {string}
     *     Public key to check.
     * @param keyType {string}
     *     Key type to check. Allowed values: 'Ed25519', Cu25519'.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns._checkPubKey = function(pubKey, keyType) {
        // The promise to return.
        var masterPromise = new MegaPromise();

        if (keyType !== 'Ed25519' && keyType !== 'Cu25519') {
            logger.error('Unsupported key type for pub key check: ' + keyType);

            return MegaPromise.reject(EARGS);
        }

        var attributePromise = mega.attr.get(u_handle,
                                                crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType],
                                                true, false);

        attributePromise.done(function(result) {
            var storedPubKey = base64urldecode(result);
            if (storedPubKey === pubKey) {
                masterPromise.resolve(true);
            }
            else {
                logger.info('Need to update ' + keyType + ' pub key.');
                masterPromise.linkDoneAndFailTo(
                    mega.attr.set(crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType],
                                     base64urlencode(pubKey),
                                     true, false));
            }
        });
        attributePromise.fail(function(result) {
            logger.warn('Could not get my ' + keyType + ' pub key, setting it now.');
            masterPromise.linkDoneAndFailTo(
                mega.attr.set(crypt.PUBKEY_ATTRIBUTE_MAPPING[keyType],
                                 base64urlencode(pubKey),
                                 true, false));
        });

        return masterPromise;
    };

    /**
     * Helper method to check whether a contact fingerprint is verified.
     * @param {String} aUserHandle The user's 11-chars long handle.
     * @returns {Promise} fulfilled with a Boolean indicating whether it's verified.
     */
    ns.isUserVerified = promisify(function(resolve, reject, aUserHandle) {
        ns.onAuthringReady('usr-v').then(function() {
            var ed25519 = u_authring.Ed25519;
            var verifyState = ed25519 && ed25519[aUserHandle] || false;

            resolve(verifyState.method >= ns.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);
        }).catch(reject);
    });

    /**
     * Helper method to invoke whenever we do want to show crypto-specific warnings about mismatching keys etc
     * @param {String} aDialogType The dialog type we do want to show.
     * @param {String} aUserHandle The user's 11-chars long handle.
     * @param {String} aKeyType Type of the public key the signature failed for. e.g 'Cu25519' or 'RSA'
     * @param {*} optional arguments for the dialog constructor
     * @type {Promise} fulfilled on completion with whatever happened...
     */
    ns.showCryptoWarningDialog = promisify(function(resolve, reject, aDialogType, aUserHandle /* , ... */) {
        var args = toArray.apply(null, arguments).slice(3);

        if (localStorage.hideCryptoWarningDialogs) {
            logger.warn('Showing crypto warning dialogs is blocked...', aDialogType, args);
            return resolve(EBLOCKED);
        }

        var seenCryptoWarningDialog = JSON.parse(sessionStorage.scwd || '{}');
        var seenStoreKey = MurmurHash3(aDialogType + ':' + args, 0x7ff).toString(16);

        if (seenCryptoWarningDialog[seenStoreKey]) {
            logger.info('Crypto warning dialog already seen...', aDialogType, args);
            return resolve(EEXIST);
        }

        // Store a seen flag straight away, to prevent concurrent invocations..
        seenCryptoWarningDialog[seenStoreKey] = 1;
        sessionStorage.scwd = JSON.stringify(seenCryptoWarningDialog);

        var dialogConstructor;

        if (aDialogType === 'credentials') {
            eventlog(99606, JSON.stringify([1, aDialogType[0]].concat(args.slice(0,2))));
            dialogConstructor = mega.ui.CredentialsWarningDialog;
        }
        else if (aDialogType === 'signature') {
            eventlog(99607, JSON.stringify([1, aDialogType[0]].concat(args.slice(0,2))));
            dialogConstructor = mega.ui.KeySignatureWarningDialog;
        }
        else {
            logger.error('Invalid crypto warning dialog type...', aDialogType, args);
            return reject(EARGS);
        }

        // Only show this type of warning dialog if the user's fingerprint is verified.
        ns.isUserVerified(aUserHandle)
            .then(function(isVerified) {
                if (isVerified !== true) {
                    logger.debug('Not showing crypto dialog for unverified user...', aDialogType, args);
                    return resolve(EAGAIN);
                }

                M.onFileManagerReady(tryCatch(function() {
                    dialogConstructor.singleton.apply(dialogConstructor, args);
                    resolve(true);
                }, reject));
            })
            .catch(reject);
    });

    return ns;
}());
