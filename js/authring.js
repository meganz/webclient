/**
 * @fileOverview
 * Storage of authenticated contacts.
 */

var u_authring = undefined;

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
     * @property FINGERPRINT_COMPARISON {integer}
     *     Direct fingerprint comparison.
     */
    ns.AUTHENTICATION_METHOD = {
        FINGERPRINT_COMPARISON: 0x00,
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
               + String.fromCharCode((method << 4) | confidence);
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
        var method = (authAttributes >>> 4) & 0x0f;
        var confidence = authAttributes & 0x0f;
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
     * @param callback {function}
     *     Callback function to call upon completion of operation. The callback
     *     requires two parameters: `res` (the retrieved authentication ring)
     *     and `ctx` (the context).
     */
    ns.getContacts = function(callback) {
        var myCallback = function(res, ctx) {
            if (typeof res !== 'number') {
                // Authring is in the empty-name record.
                u_authring = ns.deserialise(res['']);
            } else {
                u_authring = {};
            }
            if (ctx.callback3 !== undefined) {
                ctx.callback3(u_authring, ctx);
            }
        };
        var myCtx = {
             callback3: callback,
         };
        getUserAttribute(u_handle, 'authring', false, myCallback, myCtx);
    };
    
    
    /**
     * Saves the ring for all authenticated contacts from `u_authring`.
     * 
     * @param callback {function}
     *     Callback function to call upon completion of operation. The callback
     *     requires two parameters: `res` (the retrieved authentication ring)
     *     and `ctx` (the context).
     */
    ns.setContacts = function(callback) {
        setUserAttribute('authring', {'': ns.serialise(u_authring)},
                         false, callback);
    };
    
    
    /**
     * Loads the ring for all authenticated contacts into `u_authring`.
     * 
     * @param userhandle {string}
     *     Mega user handle.
     * @return {object}
     *     An object describing the authenticated `fingerprint`, the
     *     authentication `method` and the key `confidence`. `false` in case
     *     of an unauthorised contact. 
     */
    ns.getContactAuthenticated = function(userhandle) {
        if (u_authring === undefined) {
            throw new Error('First initialise u_authring by calling authring.getContacts()');
        }
        if (u_authring.hasOwnProperty(userhandle)) {
            return u_authring[userhandle];
        } else {
            return false;
        }
    };
    
    
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
     */
    ns.setContactAuthenticated = function(userhandle, fingerprint, method, confidence) {
        if (u_authring === undefined) {
            throw new Error('First initialise u_authring by calling authring.getContacts()');
        }
        u_authring[userhandle] = {fingerprint: fingerprint,
                                  method: method,
                                  confidence: confidence};
    };
    
    
    return ns;
}());
