/**
 * Implementation of a string encryption/decryption.
 */
var stringcrypt = (function() {
    "use strict";

    /**
     * @description
     * Implementation of a string encryption/decryption.
     */
    var ns = {};

    /**
     * Encrypts clear text data to an authenticated ciphertext, armoured with
     * encryption mode indicator and IV.
     *
     * @param plain {String}
     *     Plain data block as (unicode) string.
     * @param key {String}
     *     Encryption key as byte string.
     * @param [raw] {Boolean}
     *     Do not convert plain text to UTF-8 (default: false).
     * @returns {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     */
    ns.stringEncrypter = function(plain, key, raw) {
        var mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        var plainBytes = raw ? plain : to8(plain);
        var cipher = tlvstore.blockEncrypt(plainBytes, key, mode, false);

        return cipher;
    };

    /**
     * Decrypts an authenticated cipher text armoured with a mode indicator and IV
     * to clear text data.
     *
     * @param cipher {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     * @param key {String}
     *     Encryption key as byte string.
     * @param [raw] {Boolean}
     *     Do not convert plain text from UTF-8 (default: false).
     * @returns {String}
     *     Clear text as (unicode) string.
     */
    ns.stringDecrypter = function(cipher, key, raw) {

        var plain = tlvstore.blockDecrypt(cipher, key, false);

        return raw ? plain : from8(plain);
    };

    /**
     * Generates a new AES-128 key.
     *
     * @returns {string}
     *     Symmetric key as byte string.
     */
    ns.newKey = function() {

        var keyBytes = new Uint8Array(16);
        asmCrypto.getRandomValues(keyBytes);

        return asmCrypto.bytes_to_string(keyBytes);
    };

    return ns;
})();
