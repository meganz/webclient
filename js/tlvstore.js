/**
 * @fileOverview
 * Storage of key/value pairs in a "container".
 */

/** @property window.tlvstore */
lazy(self, 'tlvstore', () => {
    "use strict";

    /**
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
    const ns = {
        _logger: MegaLogger.getLogger('tlvstore')
    };
    const hasOwn = {}.hasOwnProperty;
    const SYMBOL = Symbol('~~TLV~~');

    const getKey = (key) => {
        if (Array.isArray(key)) {
            // Key is in the form of an array of four 32-bit words.
            key = new Uint32Array(key);
            const u8 = new Uint8Array(key.byteLength);
            const dv = new DataView(u8.buffer);

            for (let i = 0; i < key.length; ++i) {
                dv.setUint32(i * 4, key[i], false);
            }
            key = u8;
        }
        else if (typeof key === 'string') {
            key = Uint8Array.from(key, ch => ch.charCodeAt(0));
        }

        return key;
    };

    const te = new TextEncoder();
    const td = new TextDecoder();

    /**
     * Generates a binary encoded TLV record from a key-value pair.
     *
     * @param key {string}
     *     ASCII string label of record's key.
     * @param value {string}
     *     Byte string payload of record.
     * @param {Boolean} utf8 Require UTF-8 conversion.
     * @returns {string}
     *     Single binary encoded TLV record.
     * @private
     */
    ns.toTlvRecord = function(key, value, utf8) {
        if (utf8) {
            value = asmCrypto.bytes_to_string(te.encode(value));
        }
        if (value.length > 65535) {
            if (typeof eventlog === 'function') {
                eventlog(99772, JSON.stringify([1, 1, key.length, value.length, utf8 | 0]), true);
            }
            this._logger.warn(`TLV-record ${key} did overflow.`, utf8);
        }
        const length = Math.min(65535, value.length);
        return `${key}\u0000${String.fromCharCode(length >>> 8)}${String.fromCharCode(length & 0xff)}${value}`;
    };

    /**
     * Generates a binary encoded TLV element from a key-value pair.
     * There is no separator in between and the length is fixted 2 bytes.
     * If the length of the value is bigger than 0xffff, then it will use 0xffff
     * as the length, and append the value after.
     *
     * @param key {string}
     *     ASCII string label of record's key.
     * @param value {string}
     *     Byte string payload of record.
     * @returns {string}
     *     Single binary encoded TLV record.
     * @private
     */
    ns.toTlvElement = function(key, value) {
        var length = String.fromCharCode(value.length >>> 8)
                   + String.fromCharCode(value.length & 0xff);
        if (value.length > 0xffff) {
            length = String.fromCharCode(0xff)
                   + String.fromCharCode(0xff);
        }
        return key + length + value;
    };

    /**
     * Generates a binary encoded TLV record container from an object containing
     * key-value pairs.
     *
     * @param container {object}
     *     Object containing (non-nested) key-value pairs. The keys have to be ASCII
     *     strings, the values byte strings.
     * @param {Boolean} [utf8] Require UTF-8 conversion.
     * @returns {string}
     *     Single binary encoded container of TLV records.
     */
    ns.containerToTlvRecords = function(container, utf8) {
        var result = '';
        let safe = true;
        for (var key in container) {
            if (hasOwn.call(container, key)) {
                const type = typeof container[key];

                if (type !== 'string') {
                    this._logger.error(`Invalid type for element '${key}'. Expected string but got ${type}.`);
                    return false;
                }
                if (safe !== true) {
                    if (typeof eventlog === 'function') {
                        eventlog(99772, JSON.stringify([1, 3, result.length]));
                    }
                    this._logger.error(`Cannot store ${key}, previous element did overflow.`);
                    return false;
                }
                const record = ns.toTlvRecord(key, container[key], utf8);

                result += record;
                safe = record.length < 65538 + key.length;
            }
        }
        return result;
    };


    /**
     * Splits and decodes a TLV record off of a container into a key-value pair and
     * returns the record and the rest.
     *
     * @param tlvContainer {String}
     *     Single binary encoded container of TLV records.
     * @returns {Object|Boolean}
     *     Object containing two elements: `record` contains an array of two
     *     elements (key and value of the decoded TLV record) and `rest` containing
     *     the remainder of the tlvContainer still to decode. In case of decoding
     *     errors, `false` is returned.
     */
    ns.splitSingleTlvRecord = function(tlvContainer) {
        var keyLength = tlvContainer.indexOf('\u0000');
        var key = tlvContainer.substring(0, keyLength);
        var valueLength = (tlvContainer.charCodeAt(keyLength + 1)) << 8
                        | tlvContainer.charCodeAt(keyLength + 2);
        var value = tlvContainer.substring(keyLength + 3, keyLength + valueLength + 3);

        // @todo what if the value did not overflow but was exactly 65535 bytes (?)..
        if (valueLength === 0xffff) {
            value = tlvContainer.substring(keyLength + 3);
            valueLength = value.length;
        }
        var rest = tlvContainer.substring(keyLength + valueLength + 3);

        // Consistency checks.
        if ((valueLength !== value.length)
                || (rest.length !== tlvContainer.length - (keyLength + valueLength + 3))) {
            ns._logger.info('Inconsistent TLV decoding. Maybe content UTF-8 encoded?');

            return false;
        }

        return { 'record': [key, value], 'rest': rest };
    };

    /**
     * Splits and decodes a TLV element off of a container into a key-value pair and
     * returns the element and the rest.
     * Note: if the length is 0xffff, which means the appended value is longer than 0xffff,
     * it means the rest is the value.
     *
     * @param tlvContainer {String}
     *     Single binary encoded container of TLV elements.
     * @returns {Object|Boolean}
     *     Object containing two parts: `element` contains an array of two
     *      (key and value of the decoded TLV element) and `rest` containing
     *     the remainder of the tlvContainer still to decode. In case of decoding
     *     errors, `false` is returned.
     */
    ns.splitSingleTlvElement = function(tlvContainer) {
        var keyLength = 1;
        var key = tlvContainer.substring(0, keyLength);
        var valueLength = (tlvContainer.charCodeAt(keyLength)) << 8
                        | tlvContainer.charCodeAt(keyLength + 1);
        var value = tlvContainer.substring(keyLength + 2, keyLength + valueLength + 2);

        if (valueLength === 0xffff) {
            value = tlvContainer.substring(keyLength + 2);
            valueLength = value.length;
        }
        var rest = tlvContainer.substring(keyLength + valueLength + 2);
        // Consistency checks.
        if ((valueLength !== value.length)
                || (rest.length !== tlvContainer.length - (keyLength + valueLength + 2))) {
            ns._logger.info('Inconsistent TLV decoding. Maybe content UTF-8 encoded?');

            return false;
        }

        return { 'record': [key, value], 'rest': rest };
    };

    /**
     * Decodes a binary encoded container of TLV records into an object
     * representation.
     *
     * @param tlvContainer {String}
     *     Single binary encoded container of TLV records.
     * @param [utf8LegacySafe] {Boolean}
     *     Single binary encoded container of TLV records.
     * @returns {Object|Boolean}
     *     Object containing (non-nested) key-value pairs. `false` in case of
     *     failing TLV decoding.
     */
    ns.tlvRecordsToContainer = function(tlvContainer, utf8LegacySafe) {
        let rest = tlvContainer;
        let container = Object.create(null);

        if (!rest.charCodeAt(0) && rest.length > 65538) {
            this._logger.warn('tlv-record overflow fix-up.', [rest]);

            if (typeof eventlog === 'function') {
                eventlog(99772, JSON.stringify([1, 7, rest.length]), true);
            }

            return {'': rest.substr(3)};
        }

        while (rest.length > 0) {
            var result = ns.splitSingleTlvRecord(rest);
            if (result === false) {
                container = false;
                break;
            }
            container[result.record[0]] = result.record[1];
            rest = result.rest;
        }

        if (utf8LegacySafe && (container === false)) {
            // Treat the legacy case and first UTF-8 decode the container content.
            ns._logger.info('Retrying to decode TLV container legacy style ...');

            return ns.tlvRecordsToContainer(from8(tlvContainer), false);
        }

        return container;
    };


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
    ns.BLOCK_ENCRYPTION_SCHEME = {
        AES_CCM_12_16: 0x00,
        AES_CCM_10_16: 0x01,
        AES_CCM_10_08: 0x02,
        AES_GCM_12_16_BROKEN: 0x03, // Same as 0x00 (not GCM, due to a legacy bug).
        AES_GCM_10_08_BROKEN: 0x04, // Same as 0x02 (not GCM, due to a legacy bug).
        AES_GCM_12_16: 0x10,
        AES_GCM_10_08: 0x11
    };


    /**
     * Parameters for supported block cipher encryption schemes.
     */
    ns.BLOCK_ENCRYPTION_PARAMETERS = {
        0x00: {nonceSize: 12, macSize: 16, cipher: 'AES_CCM'}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16
        0x01: {nonceSize: 10, macSize: 16, cipher: 'AES_CCM'}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16
        0x02: {nonceSize: 10, macSize:  8, cipher: 'AES_CCM'}, // BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08
        0x03: {nonceSize: 12, macSize: 16, cipher: 'AES_CCM'}, // Same as 0x00 (due to a legacy bug).
        0x04: {nonceSize: 10, macSize:  8, cipher: 'AES_CCM'}, // Same as 0x02 (due to a legacy bug).
        0x10: {nonceSize: 12, macSize: 16, cipher: 'AES_GCM'}, // BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16
        0x11: {nonceSize: 10, macSize:  8, cipher: 'AES_GCM'}  // BLOCK_ENCRYPTION_SCHEME.AES_GCM_10_08
    };


    /**
     * Encrypts clear text data to an authenticated ciphertext, armoured with
     * encryption mode indicator and IV.
     *
     * @param clearText {String}
     *     Clear text as byte string.
     * @param {String|Array|ArrayBufferLike} key
     *     Encryption key as byte string.
     * @param mode {Number}
     *     Encryption mode as an integer. One of tlvstore.BLOCK_ENCRYPTION_SCHEME.
     * @param [utf8Convert] {Boolean}
     *     Perform UTF-8 conversion of clear text before encryption (default: false).
     * @returns {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     */
    ns.blockEncrypt = function(clearText, key, mode, utf8Convert) {

        const {nonceSize, macSize, cipher} = this.BLOCK_ENCRYPTION_PARAMETERS[mode];
        const nonce = mega.getRandomValues(nonceSize);

        const clearBytes = asmCrypto.string_to_bytes(clearText, utf8Convert);
        const cipherBytes = asmCrypto[cipher].encrypt(clearBytes, getKey(key), nonce, undefined, macSize);

        return String.fromCharCode(mode) + asmCrypto.bytes_to_string(nonce) + asmCrypto.bytes_to_string(cipherBytes);
    };


    /**
     * Decrypts an authenticated cipher text armoured with a mode indicator and IV
     * to clear text data.
     *
     * @param cipherText {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     * @param key {String}
     *     Encryption key as byte string.
     * @param [utf8Convert] {Boolean}
     *     Perform UTF-8 conversion of clear text after decryption (default: false).
     * @returns {String}
     *     Clear text as byte string.
     */
    ns.blockDecrypt = function(cipherText, key, utf8Convert) {

        var mode = cipherText.charCodeAt(0);
        var nonceSize = ns.BLOCK_ENCRYPTION_PARAMETERS[mode].nonceSize;
        var nonceBytes = asmCrypto.string_to_bytes(cipherText.substring(1, nonceSize + 1));
        var cipherBytes = asmCrypto.string_to_bytes(cipherText.substring(nonceSize + 1));
        var tagSize = ns.BLOCK_ENCRYPTION_PARAMETERS[mode].macSize;
        var cipher = asmCrypto[ns.BLOCK_ENCRYPTION_PARAMETERS[mode].cipher];

        const clearBytes = cipher.decrypt(cipherBytes, getKey(key), nonceBytes, undefined, tagSize);
        return asmCrypto.bytes_to_string(clearBytes, utf8Convert);
    };

    /**
     * Encrypts data to an authenticated ciphertext, armoured with encryption mode indicator and IV.
     *
     * @param {String|Object} payload plain string or key/value pairs to encrypt
     * @param {Boolean} [utf8] Whether to take UTF-8 into account (default: true)
     * @param {Array|String|Uint8Array|*} [key] Encryption key.
     * @param {Number} [mode] Encryption scheme, AES GCM 12/16 by default.
     * @returns {String} encrypted payload.
     * @memberOf tlvstore
     */
    ns.encrypt = function(payload, utf8, key, mode) {
        utf8 = utf8 !== false;

        if (typeof payload !== 'object') {
            payload = {'': String(payload)};
        }
        payload = this.containerToTlvRecords(payload, utf8);

        if (key !== SYMBOL) {
            if (mode === undefined) {
                mode = this.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
            }
            payload = this.blockEncrypt(payload, getKey(key || self.u_k), mode);
        }

        return base64urlencode(payload);
    };

    /**
     * Decrypts an authenticated cipher text armoured with a mode indicator and IV.
     *
     * @param {String} payload Encrypted cipher text payload
     * @param {Boolean} [utf8] Whether to take UTF-8 into account (default: true)
     * @param {Array|String|Uint8Array} [key] Encryption key.
     * @returns {String|Object} decrypted payload as initially provided, string or key/value pairs
     * @memberOf tlvstore
     */
    ns.decrypt = function(payload, utf8, key) {
        const obj = Object.create(null);

        utf8 = utf8 !== false;
        payload = base64urldecode(payload);

        if (key !== SYMBOL) {
            payload = this.blockDecrypt(payload, getKey(key || self.u_k));
        }

        while (payload.length > 0) {
            const res = ns.splitSingleTlvRecord(payload);
            if (!res) {
                return false;
            }
            let [key, value] = res.record;

            if (utf8) {
                value = td.decode(Uint8Array.from(value, ch => ch.charCodeAt(0)));
            }
            obj[key] = value;

            payload = res.rest;
        }

        return obj[''] || obj;
    };

    /**
     * Generates an encoded TLV record container from an object containing key-value pairs.
     * @param {String|Object} payload plain string or key/value pairs to encode.
     * @param {Boolean} [utf8] Whether to take UTF-8 into account (default: true)
     * @returns {String} Single binary encoded container of TLV records.
     * @memberOf tlvstore
     */
    ns.encode = function(payload, utf8) {
        return this.encrypt(payload, utf8, SYMBOL);
    };

    /**
     * Decodes a binary encoded container of TLV records into an object representation.
     * @param {String} payload Single binary encoded container of TLV records.
     * @param {Boolean} [utf8] Whether to take UTF-8 into account (default: true)
     * @return {Object|String} original plain string or key/value pairs encoded.
     * @memberOf tlvstore
     */
    ns.decode = function(payload, utf8) {
        return this.decrypt(payload, utf8, SYMBOL);
    };


    if (!window.is_karma) {
        Object.setPrototypeOf(ns, null);
        return Object.freeze(ns);
    }

    return ns;
});
