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
