/**
 * @fileOverview
 * Encryption of a customer's payment details.
 */

var paycrypt = (function () {
    "use strict";

    /**
     * @description
     * <p>Encryption of a customer's payment details.</p>
     *
     * <p>
     * Encrypts the payment details using AES-128 (CBC) with PKCS#7 padding.
     * For this a unique session key and IV are generated. The cipher text
     * is authenticated using HMAC-SHA256.</p>
     *
     * <p>
     * The session key for the cipher text is RSA encrypted for the intended
     * server's key.</p>
     */
    var ns = {};

    var _ENC_KEY_BYTES = 16;
    var _IV_BYTES = 16;
    var _MAC_KEY_BYTES = 32;


    // Generate keys: Encryption, HMAC and IV.
    ns._generateKeys = function() {
        var keysLength = _ENC_KEY_BYTES + _MAC_KEY_BYTES;
        var keys = new Uint8Array(keysLength);
        asmCrypto.getRandomValues(keys);
        var encKey = keys.subarray(0, _ENC_KEY_BYTES);
        var hmacKey = keys.subarray(_ENC_KEY_BYTES);

        var iv = new Uint8Array(_IV_BYTES);
        asmCrypto.getRandomValues(iv);

        return { length: keysLength,
                 keys: asmCrypto.bytes_to_string(keys),
                 encryption: asmCrypto.bytes_to_string(encKey),
                 hmac: asmCrypto.bytes_to_string(hmacKey),
                 iv: asmCrypto.bytes_to_string(iv) };
    };


    // Encrypt clear text to a binary payload including authentication and IV.
    ns._encryptPayload = function(cleartext, keys) {
        var cipherBytes = asmCrypto.AES_CBC.encrypt(cleartext,
                                                    asmCrypto.string_to_bytes(keys.encryption),
                                                    true,
                                                    asmCrypto.string_to_bytes(keys.iv));
        var ciphertext = asmCrypto.bytes_to_string(cipherBytes);
        var toAuthenticate = keys.iv + ciphertext;
        var hmac = atob(asmCrypto.HMAC_SHA256.base64(toAuthenticate, keys.hmac));

        return hmac + keys.iv + ciphertext;
    };


    // RSA encrypt keys (encryption and HMAC).
    ns._rsaEncryptKeys = function(cleartext, pubKey) {
        var keysString = String.fromCharCode(cleartext.length >>> 8)
                       + String.fromCharCode(cleartext.length % 0x100)
                       + cleartext;
        // Random padding up to pubkey's byte length minus 2.
        var paddingBytes = pubKey[0].length - 2 - keysString.length;
        for (var i = 0; i < paddingBytes; i++) {
            keysString += String.fromCharCode(rand(256));
        }
        var ciphertext = asmCrypto.RSA_RAW.encrypt(keysString, pubKey);
        var cipherLength = ciphertext.length;
        var result = String.fromCharCode(cipherLength >>> 8)
                   + String.fromCharCode(cipherLength % 0x100)
                   + asmCrypto.bytes_to_string(ciphertext);
        return result;
    };


    /**
     * Encrypts clear text data to an authenticated ciphertext, authenticated
     * with an HMAC.
     *
     * @param cleartext {string}
     *     Clear text as byte string.
     * @param pubKey {string}
     *     Clear text as byte string.
     * @returns {string}
     *     Encrypted data block as byte string.
     */
    ns.hybridEncrypt = function(cleartext, pubKey) {
        var keys = ns._generateKeys();
        var payloadString = ns._encryptPayload(cleartext, keys);
        var rsaKeyCipher = ns._rsaEncryptKeys(keys.keys, pubKey);

        return rsaKeyCipher + payloadString;
    };


    return ns;
}());
