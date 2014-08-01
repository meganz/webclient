/**
 * @fileOverview
 * Storage of key/value pairs in a "container".
 * 
 * @description
 * <p>Storage of key/value pairs in a "container".</p>
 *
 * <p>
 * Stores a set of key/value pairs in a binary container format suitable for
 * encrypted storage of private attributes</p>
 *
 * <p>
 * TLV records start with the key as a "tag" (ASCII string), terminated by a
 * NULL character (\u0000). The length of the payload is encoded as a 16-bit
 * unsigned integer in big endian format (2 bytes), followed by the payload
 * (as a byte string). The payload *must* contain 8-bit values for each
 * character only!</p>
 */


/**
 * TLV store name space to encapsulate internal functions.
 * @private
 */
_TlvStore = {};

/**
 * Generates a binary encoded TLV record from a key-value pair.
 *
 * @param key {string}
 *     ASCII string label of record's key.
 * @param value {string}
 *     Byte string payload of record.
 * @returns {string}
 *     Single binary encoded TLV record.
 * @private
 */
_TlvStore._toTlvRecord = function(key, value) {
    var length = String.fromCharCode(value.length >>> 8)
               + String.fromCharCode(value.length & 0xff);
    return key + '\u0000' + length + value;
};


/**
 * Generates a binary encoded TLV record container from an object containing
 * key-value pairs.
 *
 * @param container {object}
 *     Object containing (non-nested) key-value pairs. The keys have to be ASCII
 *     strings, the values byte strings.
 * @returns {string}
 *     Single binary encoded container of TLV records.
 */
function containerToTlvRecords(container) {
    var result = '';
    for (var key in container) {
        result += _TlvStore._toTlvRecord(key, container[key]);
    }
    return result;
}


/**
 * Splits and decodes a TLV record off of a container into a key-value pair and
 * returns the record and the rest.
 *
 * @param tlvContainer {string}
 *     Single binary encoded container of TLV records.
 * @returns {object}
 *     Object containing two elements: `record` contains an array of two
 *     elements (key and value of the decoded TLV record) and `rest` containing
 *     the remainder of the tlvContainer still to decode.
 * @private
 */
_TlvStore._splitSingleTlvRecord = function(tlvContainer) {
    var keyLength = tlvContainer.indexOf('\u0000');
    var key = tlvContainer.substring(0, keyLength);
    var valueLength = (tlvContainer.charCodeAt(keyLength + 1)) << 8
                    | tlvContainer.charCodeAt(keyLength + 2);
    var value = tlvContainer.substring(keyLength + 3, keyLength + valueLength + 3);
    var rest = tlvContainer.substring(keyLength + valueLength + 3)
    return {'record': [key, value], 'rest': rest};
};


/**
 * Decodes a binary encoded container of TLV records into an object
 * representation.
 *
 * @param tlvContainer {string}
 *     Single binary encoded container of TLV records.
 * @returns {object}
 *     Object containing (non-nested) key-value pairs.
 */
function tlvRecordsToContainer(tlvContainer) {
    var rest = tlvContainer;
    var container = {};
    while (rest.length > 0) {
        var result = _TlvStore._splitSingleTlvRecord(rest);
        container[result.record[0]] = result.record[1];
        rest = result.rest;
    }
    return container;
}


/**
 * "Enumeration" of block cipher encryption schemes for private attribute
 * containers.
 *
 * @property AES_CCM_12_16 {integer}
 *     AES in CCM mode, 12 byte IV/nonce and 16 byte MAC.
 * @property AES_CCM_10_16 {integer}
 *     AES in CCM mode, 10 byte IV/nonce and 16 byte MAC.
 * @property AES_CCM_10_08 {integer}
 *     AES in CCM mode, 10 byte IV/nonce and 8 byte MAC.
 * @property AES_GCM_12_16 {integer}
 *     AES in CCM mode, 12 byte IV/nonce and 16 byte MAC.
 * @property AES_GCM_10_08 {integer}
 *     AES in CCM mode, 10 byte IV/nonce and 8 byte MAC.
 */
var BLOCK_ENCRYPTION_SCHEME = {
    AES_CCM_12_16: 0x00,
    AES_CCM_10_16: 0x01,
    AES_CCM_10_08: 0x02,
    AES_GCM_12_16: 0x03,
    AES_GCM_10_08: 0x04,
};


/**
 * Parameters for supported block cipher encryption schemes.
 */
_TlvStore.BLOCK_ENCRYPTION_PARAMETERS = {
    0x00: {nonceSize: 12, macSize: 16}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16
    0x01: {nonceSize: 10, macSize: 16}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16
    0x02: {nonceSize: 10, macSize:  8}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08
    0x03: {nonceSize: 12, macSize: 16}, // BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16
    0x04: {nonceSize: 10, macSize:  8}, // BLOCK_ENCRYPTION_SCHEME.AES_GCM_10_08
};


/**
 * Encrypts clear text data to an authenticated ciphertext, armoured with
 * encryption mode indicator and IV.
 *
 * @param clear {string}
 *     Clear text as byte string.
 * @param key {string}
 *     Encryption key as byte string.
 * @param mode {integer}
 *     Encryption mode. One of BLOCK_ENCRYPTION_SCHEME (currently GCM is not
 *     supported by asmCrypto, so they won't work).
 * @returns {string}
 *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
 */
function blockEncrypt(clear, key, mode) {
    var nonceSize = _TlvStore.BLOCK_ENCRYPTION_PARAMETERS[mode].nonceSize;
    var tagSize = _TlvStore.BLOCK_ENCRYPTION_PARAMETERS[mode].macSize;
    var nonceBytes = new Uint8Array(nonceSize);
    asmCrypto.getRandomValues(nonceBytes);
    if (key instanceof Array || Object.prototype.toString.call(key) === '[object Array]') {
        // Key is in the form of an array of four 32-bit words.
        key = a32_to_str(key);
    }
    var keyBytes = asmCrypto.string_to_bytes(key);
    var clearBytes = asmCrypto.string_to_bytes(unescape(encodeURIComponent(clear)));
    var cipherBytes = asmCrypto.AES_CCM.encrypt(clearBytes, keyBytes, nonceBytes,
                                                undefined, tagSize);
    return String.fromCharCode(mode) + asmCrypto.bytes_to_string(nonceBytes)
           + asmCrypto.bytes_to_string(cipherBytes);
}


/**
 * Decrypts an authenticated cipher text armoured with a mode indicator and IV
 * to clear text data.
 *
 * @param cipher {string}
 *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
 * @param key {string}
 *     Encryption key as byte string.
 * @returns {string}
 *     Clear text as byte string.
 */
function blockDecrypt(cipher, key) {
    var mode = cipher.charCodeAt(0);
    var nonceSize = _TlvStore.BLOCK_ENCRYPTION_PARAMETERS[mode].nonceSize;
    var nonceBytes = asmCrypto.string_to_bytes(cipher.substring(1, nonceSize + 1));
    var cipherBytes = asmCrypto.string_to_bytes(cipher.substring(nonceSize + 1));
    var tagSize = _TlvStore.BLOCK_ENCRYPTION_PARAMETERS[mode].macSize;
    if (key instanceof Array || Object.prototype.toString.call(key) === '[object Array]') {
        // Key is in the form of an array of four 32-bit words.
        key = a32_to_str(key);
    }
    var keyBytes = asmCrypto.string_to_bytes(key);
    var clearBytes = asmCrypto.AES_CCM.decrypt(cipherBytes, keyBytes, nonceBytes,
                                               undefined, tagSize);
    return decodeURIComponent(escape(asmCrypto.bytes_to_string(clearBytes)));
}
