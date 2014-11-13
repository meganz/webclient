/**
 * @fileOverview
 * Storage of authenticated contacts.
 */

var u_authring = {'Ed25519': undefined,
                  'RSA': undefined};

var authring = (function () {
    /**
     * @description
     * <p>Storage of authenticated contacts.</p>
     *
     * <p>
     * A container (key ring) that keeps information of the authentication state
     * for all authenticated contacts. Each record is indicated by the contact's
     * userhandle as an attribute. The associated value is an object containing
     * the authenticated `fingerprint` of the Ed25519 public key, the authentication
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
     * Load contacts' authentication info  with `authring.getContacts()` and save
     * with `authring.setContacts()`.</p>
     */
    var ns = {};

    /**
     * "Enumeration" of authentication methods. The values in here must fit
     * into 4 bits of a byte.
     *
     * @property SEEN {integer}
     *     To record a "seen" fingerprint, to be able to check for future changes.
     * @property FINGERPRINT_COMPARISON {integer}
     *     Direct/full fingerprint comparison.
     */
    ns.AUTHENTICATION_METHOD = {
        SEEN: 0x00,
        FINGERPRINT_COMPARISON: 0x01,
    };


    /**
     * "Enumeration" of confidence in contact's key. The values in here must fit
     * into 4 bits of a byte.
     *
     * @property FINGERPRINT_COMPARISON {integer}
     *     Direct fingerprint comparison.
     */
    ns.KEY_CONFIDENCE = {
        UNSURE: 0x00,
    };

    // User property names used for different key types.
    ns._properties = {'Ed25519': 'authring',
                      'RSA': 'authRSA'};

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
     * @param container {object}
     *     Object containing (non-nested) authentication records for Mega user
     *     handles (as keys) and `fingerprint`, `method` and `confidence` as
     *     attributes of the `value` object.
     * @returns {string}
     *     Single binary encoded serialisation of authentication ring.
     */
    ns.serialise = function(container) {
        var result = '';
        for (var userhandle in container) {
            result += this._serialiseRecord(userhandle,
                                            container[userhandle].fingerprint,
                                            container[userhandle].method,
                                            container[userhandle].confidence);
        }
        return result;
    };


    /**
     * Splits and decodes an authentication record off of a binary keyring
     * serialisation and returns the record and the rest.
     *
     * @param serialisedRing {string}
     *     Single binary encoded container of authentication records.
     * @returns {object}
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
        return {userhandle: userhandle,
                value: {fingerprint: fingerprint,
                        method: method,
                        confidence: confidence},
                rest: rest};
    };


    /**
     * Decodes a binary encoded serialisation to an authentication ring object.
     *
     * @param serialisedRing {string}
     *     Single binary encoded serialisation of authentication records.
     * @returns {object}
     *     Object containing (non-nested) authentication records for Mega user
     *     handles (as keys) and `fingerprint`, `method` and `confidence` as
     *     attributes of the `value` object.
     */
    ns.deserialise = function(serialisedRing) {
        var rest = serialisedRing;
        var container = {};
        while (rest.length > 0) {
            var result = ns._deserialiseRecord(rest);
            container[result.userhandle] = result.value;
            rest = result.rest;
        }
        return container;
    };


    /**
     * Loads the ring for all authenticated contacts into `u_authring`.
     *
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @param callback {function}
     *     Callback function to call upon completion of operation. The callback
     *     requires two parameters: `res` (the retrieved authentication ring)
     *     and `ctx` (the context).
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.getContacts = function(keyType, callback) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte authentication key type: ' + keyType);
        }
        var myCallback = function(res, ctx) {
            if (typeof res !== 'number') {
                // Authring is in the empty-name record.
                u_authring[keyType] = ns.deserialise(res['']);
            } else {
                u_authring[keyType] = {};
            }
            if (ctx.callback3 !== undefined) {
                ctx.callback3(u_authring[keyType], ctx);
            }
        };
        var myCtx = {
            callback3: callback,
        };
        getUserAttribute(u_handle, ns._properties[keyType], false,
                         myCallback, myCtx);
    };


    /**
     * Saves the ring for all authenticated contacts from `u_authring`.
     *
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @param callback {function}
     *     Callback function to call upon completion of operation. The callback
     *     requires two parameters: `res` (the retrieved authentication ring)
     *     and `ctx` (the context).
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.setContacts = function(keyType, callback) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte authentication key type: ' + keyType);
        }
        setUserAttribute(ns._properties[keyType],
                         {'': ns.serialise(u_authring[keyType])},
                         false, callback);
    };


    /**
     * Gets the authentication state of a certain contact for a particular key type.
     *
     * @param userhandle {string}
     *     Mega user handle.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @return {object}
     *     An object describing the authenticated `fingerprint`, the
     *     authentication `method` and the key `confidence`. `false` in case
     *     of an unauthorised contact.
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.getContactAuthenticated = function(userhandle, keyType) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte key type: ' + keyType);
        }
        if (u_authring[keyType] === undefined) {
            throw new Error('First initialise u_authring by calling authring.getContacts()');
        }
        if (u_authring[keyType].hasOwnProperty(userhandle)) {
            return u_authring[keyType][userhandle];
        } else {
            return false;
        }
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
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.setContactAuthenticated = function(userhandle, fingerprint, keyType,
                                          method, confidence) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte key type: ' + keyType);
        }
        if (u_authring[keyType] === undefined) {
            throw new Error('First initialise u_authring by calling authring.getContacts()');
        }
        if (userhandle === u_handle) {
            // We don't want to track ourself. Let's get out of here.
            return;
        }
        u_authring[keyType][userhandle] = {fingerprint: fingerprint,
                                           method: method,
                                           confidence: confidence};
        ns.setContacts(keyType);
    };


    /**
     * Computes the given public key's cryptographic fingerprint.
     *
     * @param key {string}
     *     Byte string of key.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @param format {string}
     *     Format in which to return the fingerprint. Valid values: "string"
     *     and "hex" (default: "hex").
     * @return {string}
     *     Fingerprint value in the requested format.
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.computeFingerprint = function(key, keyType, format) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte key type: ' + keyType);
        }
        format = format || "hex";
        var value = key;
        if (keyType === 'RSA') {
            value = key[0] + key[1];
        }
        if (format === "string") {
            return asmCrypto.bytes_to_string(asmCrypto.SHA256.bytes(value)).substring(0, 20);
        } else if (format === "hex") {
            return asmCrypto.SHA256.hex(value).substring(0, 40);
        }
    };


    /**
     * Signs the given public key using our own Ed25519 key.
     *
     * @param pubKey {array}
     *     Array format of public key. Index 0 is the modulo, index 1 is the
     *     exponent, both in byte string format.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @return {string}
     *     EdDSA signature of the key as a byte string.
     * @throws
     *     An error if an unsupported key type is requested.
     */
    ns.signKey = function(pubKey, keyType) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte key type: ' + keyType);
        }
        var timeStamp = ns._longToByteString(Math.round(Date.now() / 1000));
        var value = pubKey;
        if (keyType === 'RSA') {
            value = pubKey[0] + pubKey[1];
        }
        var keyString = 'keyauth' + timeStamp + value;
        return timeStamp + jodid25519.eddsa.sign(keyString, u_privEd25519, u_pubEd25519);
    };


    /**
     * Verifies the signature of the given public key's against the
     * contact's Ed25519 key.
     *
     * @param signature {string}
     *     EdDSA signature in byte string format.
     * @param pubKey {array}
     *     Array format of public key. Index 0 is the modulo, index 1 is the
     *     exponent, both in byte string format.
     * @param keyType {string}
     *     Type of key for authentication records. Values are 'Ed25519' or 'RSA'.
     * @param signPubKey {string}
     *     Contact's Ed25519 public key to verify the signature.
     * @return {bool}
     *     True on a good signature verification, false otherwise.
     * @throws
     *     An error if the signed key's time stamp is in the future, or if an
     *     unsupported key type is requested.
     */
    ns.verifyKey = function(signature, pubKey, keyType, signPubKey) {
        if (ns._properties[keyType] === undefined) {
            throw new Error('Unsupporte key type: ' + keyType);
        }
        var timestamp = signature.substring(0, 8);
        var timestampValue = ns._byteStringToLong(timestamp);
        if (timestampValue > Math.round(Date.now() / 1000)) {
            throw new Error('Bad timestamp: In the future!');
        }
        var value = pubKey;
        if (keyType === 'RSA') {
            value = pubKey[0] + pubKey[1];
        }
        var keyString = 'keyauth' + timestamp + value;
        var signatureValue = signature.substring(8);
        try {
            return jodid25519.eddsa.verify(signatureValue, keyString, signPubKey);
        } catch(e){
            if (e === "Point is not on curve") {
                return false;
            } else {
                throw e;
            }
        }
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
     * @throws
     *     An error if the value is too large for JavaScript to encode it.
     */
    ns._longToByteString = function(value) {
        if (value > 9007199254740991) {
            // Check for value > Number.MAX_SAFE_INTEGER (not available in all JS).
            throw new Error('Integer not suitable for lossless conversion in JavaScript.');
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
     * @throws
     *     An error if the value is too large for JavaScript to encode it.
     */
    ns._byteStringToLong = function(sequence) {
        var value = 0;
        for (var i = 0; i < 8; i++) {
            value = (value * 256) + sequence.charCodeAt(i);
        }
        if (value > 9007199254740991) {
         // Check for value > Number.MAX_SAFE_INTEGER (not available in all JS).
            throw new Error('Integer not suitable for lossless conversion in JavaScript.');
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
        u_authring.RSA = {};
        ns.setContacts('RSA');
        pubEd25519 = {};
    };


    /**
     * Purges/regenerated Ed25519 key pair and RSA pub key signature.
     *
     * @return
     *     void
     */
    ns.scrubEd25519KeyPair = function() {
        u_privEd25519 = jodid25519.eddsa.generateKeySeed();
        u_keyring = {prEd255 : u_privEd25519};
        u_pubEd25519 = jodid25519.eddsa.publicKey(u_privEd25519);
        setUserAttribute('keyring', u_keyring, false);
        setUserAttribute('puEd255', base64urlencode(u_pubEd25519), true);
        var sigPubk = authring.signKey(crypto_decodepubkey(base64urldecode(u_attr.pubk)),
                                       'RSA');
        setUserAttribute('sigPubk', base64urlencode(sigPubk), true);
    };


    return ns;
}());
