/**
 * @fileOverview
 * Implementation of a string encryption/decryption.
 */

var stringcrypt = (function () {
    /**
     * @description
     * Implementation of a string encryption/decryption.</p>
     */
    var ns = {};

    "use strict";

    /**
     * Encrypts clear text data to an authenticated ciphertext, armoured with
     * encryption mode indicator and IV.
     *
     * @param plain {string}
     *     Plain data block as (unicode) string.
     * @param key {string}
     *     Encryption key as byte string.
     * @returns {string}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     */
    ns.stringEncrypter = function(plain, key) {
        var mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        var plainBytes = unescape(encodeURIComponent(plain));
        var cipher = tlvstore.blockEncrypt(plainBytes, key, mode);
        return cipher;
    };


    /**
     * Decrypts an authenticated cipher text armoured with a mode indicator and IV
     * to clear text data.
     *
     * @param cipher {string}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     * @param key {string}
     *     Encryption key as byte string.
     * @returns {string}
     *     Clear text as (unicode) string.
     */
    ns.stringDecrypter = function(cipher, key) {
        var plain = tlvstore.blockDecrypt(cipher, key);
        return decodeURIComponent(escape(plain));
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
