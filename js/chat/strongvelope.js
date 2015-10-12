/**
 * @fileOverview
 * Simplistic, group capable encryption module for chat messages.
 */

/**
 * @description
 * <p>Simplistic, group capable encryption module for chat messages.</p>
 *
 * <p>
 * Encrypts a chat message using AES with a symmetric key derived
 * using Curve25519. Messages are signed using Ed25519. Messages are encoded
 * in a binary TLV transport format,</p>
 */
var strongvelope = {};

(function () {
    "use strict";

    var ns = strongvelope;

    var logger = MegaLogger.getLogger('strongvelope', undefined, 'chat');
    strongvelope._logger = logger;

    var NONCE_SIZE = 12;
    strongvelope.NONCE_SIZE = NONCE_SIZE;
    var KEY_SIZE = 16;
    strongvelope.KEY_SIZE = KEY_SIZE;
    var IV_SIZE = 16;
    strongvelope.IV_SIZE = IV_SIZE;

    // Epoch time stamp granularity from Date.now().
    var _ONE_DAY = 1000 * 24 * 60 * 60;

    // Size in bytes of a key ID.
    var _KEY_ID_SIZE = 4;

    /** Version of the protocol implemented. */
    var PROTOCOL_VERSION = 0x00;
    strongvelope.PROTOCOL_VERSION = PROTOCOL_VERSION;

    /** After how many messages our symmetric sender key is rotated. */
    strongvelope.ROTATE_KEY_EVERY = 16;

    /** How many messages our handler should "see" before re-sending our sender key. */
    strongvelope.TOTAL_MESSAGES_BEFORE_SEND_KEY = 30;

    /** Size (in bytes) of the secret/symmetric encryption key. */
    var SECRET_KEY_SIZE = 16;
    strongvelope.SECRET_KEY_SIZE = SECRET_KEY_SIZE;


    /**
     * "Enumeration" of TLV types used for the chat message transport container.
     *
     * Note: The integer value of the TLV type also indicates the allowed order
     *       within a message encoding. Values must be monotonically increasing
     *       within, but single record types may be skipped. `RECIPIENT` and
     *       `KEYS` are the only types that may (concurrently) be repeated.
     *
     * @property _UNUSED_SEPARATOR_ {Number}
     *     NULL is used as a terminator for the record type. Don't use!
     * @property SIGNATURE {Number}
     *     Payload signature for all following bytes.
     * @property MESSAGE_TYPE {Number}
     *     Type of message sent.
     * @property NONCE {Number}
     *     "Base nonce" used for encryption (individual nonces are derived from
     *     it).
     * @property RECIPIENT {Number}
     *     Recipient of message. This record can be repeated for all recipients
     *     of message.
     * @property KEYS {Number}
     *     Message encryption keys, encrypted to a particular recipient. This
     *     may contain two (concatenated) keys. The second one (if present) is
     *     the previous sender key (key ID one less). Requires
     *     the sane number of records in the same order as `RECIPIENT`.
     * @property KEY_IDS {Number}
     *     Sender encryption key IDs used (or set) in this message.
     * @property PAYLOAD {Number}
     *     Encrypted payload of message.
     */
    var TLV_TYPES = {
        _UNUSED_SEPARATOR_: 0x00,
        SIGNATURE:          0x01,
        MESSAGE_TYPE:       0x02,
        NONCE:              0x03,
        RECIPIENT:          0x04,
        KEYS:               0x05,
        KEY_IDS:            0x06,
        PAYLOAD:            0x07,
    };
    strongvelope.TLV_TYPES = TLV_TYPES;


    // Mapping of TLV_TYPES to object attribute names (used in message parser.)
    // Note: These must be manually updated to reflect TLV_TYPES.
    var _TLV_MAPPING = {
        0x01: 'signature',
        0x02: 'type',
        0x03: 'nonce',
        0x04: 'recipients',
        0x05: 'keys',
        0x06: 'keyIds',
        0x07: 'payload',
    };


    /**
     * "Enumeration" of message types used for the chat message transport.
     *
     * @property GROUP_KEYED {Number}
     *     Data message containing a new sender key (initial or key rotation).
     * @property GROUP_CONTINUE {Number}
     *     Data message using an existing sender key for encryption.
     */
    var MESSAGE_TYPES = {
        GROUP_KEYED:        0x00,
        GROUP_FOLLOWUP:     0x01
    };
    strongvelope.MESSAGE_TYPES = MESSAGE_TYPES;


    /**
     * Determines a new 16-bit date stamp (based on Epoch time stamp).
     *
     * @return {Number}
     * @private
     */
    strongvelope._dateStampNow = function() {

        return Math.floor(Date.now() / _ONE_DAY);
    };


    /**
     * Splits the keyId into the date stamp and counter portion.
     *
     * @ param {String} keyId
     *     The key ID.
     * @return {Array.<Number>}
     *     Two elements in the array, the first being the date stamp, the
     *     second being the counter value.
     * @private
     */
    strongvelope._splitKeyId = function(keyId) {

        var keyIdNumber = str_to_a32(keyId)[0];
        var dateStamp = keyIdNumber >>> 16;
        var counter = keyIdNumber & 0xffff;

        return [dateStamp, counter];
    };


    /**
     * Encodes a numeric date stamp and counter component into a key ID.
     *
     * @return {Number}
     *     Date stamp value.
     * @return {Number}
     *     Counter value.
     * @return {String}
     *     The key ID.
     * @private
     */
    strongvelope._encodeKeyId = function(dateStamp, counter) {

        var keyIdNumber = (dateStamp << 16) | counter;
        return a32_to_str([keyIdNumber]);
    };


    /**
     * Encrypts a message symmetrically using AES-128-CTR. The object returned
     * contains the key and nonce used.
     *
     * Note: Nonces longer than the used NONCE_SIZE bytes are truncated.
     *
     * @param message {String}
     *     Plain text message. If `null` or `undefined` the ciphertext will be
     *     `null`.
     * @param key {String}
     *     Symmetric encryption key in a binary string. If omitted, a fresh
     *     key will be generated.
     * @param nonce {String}
     *     Nonce to encrypt a message with in a binary string. If omitted, a
     *     fresh nonce will be generated.
     * @returns {Object}
     *     Object containing the cipher text (in attribute `ciphertext`), the
     *     key (attribute `key`) and the nonce (attribute `nonce`) used.
     * @private
     */
    strongvelope._symmetricEncryptMessage = function(message, key, nonce) {

        var result = { ciphertext: null, key: null, nonce: null };
        var nonceBytes;
        var keyBytes;

        if (key) {
            keyBytes = asmCrypto.string_to_bytes(key);
        }
        else {
            keyBytes = new Uint8Array(KEY_SIZE);
            asmCrypto.getRandomValues(keyBytes);
        }

        if (nonce) {
            nonceBytes = asmCrypto.string_to_bytes(nonce.substring(0, NONCE_SIZE));
        }
        else {
            nonceBytes = new Uint8Array(NONCE_SIZE);
            asmCrypto.getRandomValues(nonceBytes);
        }

        if ((message !== null) && (typeof message !== 'undefined')) {
            var clearBytes = asmCrypto.string_to_bytes(unescape(encodeURIComponent(message)));
            var cipherBytes = asmCrypto.AES_CTR.encrypt(clearBytes, keyBytes, nonceBytes);
            result.ciphertext = asmCrypto.bytes_to_string(cipherBytes);
        }

        result.key = asmCrypto.bytes_to_string(keyBytes);
        result.nonce = asmCrypto.bytes_to_string(nonceBytes);

        return result;
    };


    /**
     * Decrypts a message symmetrically using AES-128-CTR.
     *
     * Note: Nonces longer than the used NONCE_SIZE bytes are truncated.
     *
     * @param cipher {String}
     *     Message in cipher text.
     * @param key {String}
     *     Symmetric encryption key in a binary string.
     * @param nonce {String}
     *     Nonce to decrypt a message with in a binary string.
     * @returns {String}
     *     Clear text of message content.
     * @private
     */
    strongvelope._symmetricDecryptMessage = function(cipher, key, nonce) {

        var keyBytes = asmCrypto.string_to_bytes(key);
        var nonceBytes = asmCrypto.string_to_bytes(nonce.substring(0, NONCE_SIZE));
        var cipherBytes = asmCrypto.string_to_bytes(cipher);
        var clearBytes = asmCrypto.AES_CTR.decrypt(cipherBytes, keyBytes, nonceBytes);
        var clearText = asmCrypto.bytes_to_string(clearBytes);

        try {
            clearText = decodeURIComponent(escape(clearText));
        }
        catch (e) {
            if (e instanceof URIError) {
                logger.error('Could not decrypt message, probably a wrong key/nonce.');

                return false;
            }
            else {
                throw e;
            }
        }

        return clearText;
    };


    /**
     * Signs a message using EdDSA with an Ed25519 key pair.
     *
     * @param message {String}
     *     Message to sign.
     * @param privKey {String}
     *     Ed25519 private key.
     * @param pubKey {String}
     *     Ed25519 public key.
     * @returns {String}
     *     Message signature.
     * @private
     */
    strongvelope._signMessage = function(message, privKey, pubKey) {

        var keyBytes = asmCrypto.string_to_bytes(privKey + pubKey);
        var messageBytes = asmCrypto.string_to_bytes(message);
        var signature = nacl.sign.detached(messageBytes, keyBytes);

        return asmCrypto.bytes_to_string(signature);
    };


    /**
     * Verifies a message using EdDSA with an Ed25519 key pair.
     *
     * @param message {String}
     *     Message to sign.
     * @param signature {String}
     *     Message signature.
     * @param pubKey {String}
     *     Ed25519 public key.
     * @returns {Boolean}
     *     Verification result.
     * @private
     */
    strongvelope._verifyMessage = function(message, signature, pubKey) {

        var messageBytes = asmCrypto.string_to_bytes(message);
        var signatureBytes = asmCrypto.string_to_bytes(signature);
        var keyBytes = asmCrypto.string_to_bytes(pubKey);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, keyBytes);
    };


    /**
     * Parses the binary content of a message into an object. Content will not
     * be decrypted or signatures verified.
     *
     * @param {String} binaryMessage
     *     Binary message as transported.
     * @returns {(Object|Boolean)}
     *     Contains all message content decoded from binary transport format.
     *     Returns `false` in case of errors.
     */
    strongvelope._parseMessageContent = function(binaryMessage) {

        var parsedContent = { recipients: [], keys: [], keyIds: [] };
        var currentTlvType = null;
        var part;
        var tlvType;
        var tlvVariable;
        var lastTlvType = -1;

        parsedContent.protocolVersion = binaryMessage.charCodeAt(0);
        var rest = binaryMessage.substring(1);

        while (rest.length > 0) {
            part = tlvstore.splitSingleTlvRecord(rest);
            tlvType = part.record[0].charCodeAt(0);
            tlvVariable = _TLV_MAPPING[tlvType];

            if (tlvType < lastTlvType) {
                logger.error('Received unexpected TLV type.');

                return false;
            }

            // Some records need different treatment. Let's go through cases.
            switch (tlvType) {
                case TLV_TYPES.SIGNATURE:
                    parsedContent[tlvVariable] = part.record[1];
                    parsedContent.signedContent = part.rest;
                    break;
                case TLV_TYPES.MESSAGE_TYPE:
                    parsedContent[tlvVariable] = part.record[1].charCodeAt(0);
                    break;
                case TLV_TYPES.RECIPIENT:
                    parsedContent[tlvVariable].push(base64urlencode(part.record[1]));
                    break;
                case TLV_TYPES.KEYS:
                    parsedContent[tlvVariable].push(part.record[1]);
                    break;
                case TLV_TYPES.KEY_IDS:
                    var keyIds = part.record[1];
                    while (keyIds.length > 0) {
                        parsedContent[tlvVariable].push(keyIds.substring(0, _KEY_ID_SIZE));
                        keyIds = keyIds.substring(_KEY_ID_SIZE);
                    }
                    break;
                default:
                    parsedContent[tlvVariable] = part.record[1];
            }

            rest = part.rest;
            lastTlvType = tlvType;
        }

        if ((parsedContent.recipients.length > 0)
                && (parsedContent.recipients.length !== parsedContent.keys.length)) {
            logger.error('Number of keys does not match number of recipients.');

            return false;
        }

        return parsedContent;
    };


    /**
     * An object containing a participant's secret key information. One of these
     * objects is used per participant. Each element within is indexed by the
     * participant's sender keyId, referencing a value of the symmetric sender
     * key.
     *
     * @typedef {Object} ParticipantKeys
     */


    /**
     * An object containing data of a successfully decrypted message..
     *
     * @typedef {Object} StrongvelopeMessage
     * @property {String} sender
     *     Sender user handle.
     * @property {Number} type
     *     Type of message.
     * @property {String} payload
     *     Message content/payload.
     * @property {String} toSend
     *     An optional element, containing a "blind" management message (no
     *     payload) to a recipient containing our current sender key. This
     *     message will contain the current sender key only (as it may leak a
     *     previous key to new group chat participants).
     */


    /**
     * An object containing a chat message as received from chatd.
     *
     * @typedef {Object} ChatdMessage
     * @property {String} chatId
     *     Unique ID of the chat. (Base64 URL encoded 64-bit value.)
     * @property {Number} id
     *     XXX What ID is this?
     * @property {String} messageId
     *     Unique ID of the individual message within the chat. (Base64 URL
     *     encoded 64-bit value.)
     * @property {String} userId
     *     User handle of the sender.
     * @property {Number} ts
     *     UNIX epoch time stamp as an integer in seconds.
     * @property {String} message
     *     Message payload (encrypted).
     */


    /**
     * Manages keys, encryption and message encoding.
     *
     * Note: A new ProtocolHandler instance needs to be initialised. This can
     *       either be done via seeding it with chat messages (calling #seed) of the same chat's
     *       history, or by calling #updateSenderKey method on newly created or
     *       fresh chats.
     *
     * @constructor
     * @param {String} [ownHandle]
     *     Our own user handle (default: u_handle).
     * @param {String} [privCu25519]
     *     Our private chat key (Curve25519, default: u_privCu25519).
     * @param {String} [privEd25519]
     *     Our private signing key (Ed25519, default: u_pubCu25519).
     * @param {String} [pubEd25519]
     *     Our public signing key (Ed25519, optional, can be derived upon
     *     instantiation from private key).
     *
     * @param {String} ownHandle
     *     Our own user handle (u_handle).
     * @param {String} privCu25519
     *     Our private chat key (Curve25519).
     * @param {String} privEd25519
     *     Our private signing key (Ed25519).
     * @param {String} pubEd25519
     *     Our public signing key (Ed25519).
     * @property {Number} rotateKeyEvery
     *     The number of messages our sender key is used for before rotating.
     * @property {Number} sendKeyEveryReceived
     *     The number of messages to receive before a keyed message is to be
     *     sent.
     * @property {String} keyId
     *     ID of our current sender key.
     * @property {String} previousKeyId
     *     ID of our previous sender key.
     * @property {Object.<handle, ParticipantKeys>} participantKeys
     *     Collection of participant specific key information (including our own,
     *     @see {@link ParticipantKey} for all (past and present) participants.
     */
    strongvelope.ProtocolHandler = function(ownHandle, privCu25519, privEd25519,
            pubEd25519) {

        this.ownHandle = ownHandle || u_handle;
        this.privCu25519 = privCu25519 || u_privCu25519;
        this.privEd25519 = privEd25519 || u_privEd25519;
        this.pubEd25519 = pubEd25519;
        if (!this.pubEd25519) {
            this.pubEd25519 = crypt.getPubKeyFromPrivKey(this.privEd25519, 'Ed25519');
        }
        this.rotateKeyEvery = strongvelope.ROTATE_KEY_EVERY;
        this.totalMessagesBeforeSendKey = strongvelope.TOTAL_MESSAGES_BEFORE_SEND_KEY;
        this._keyEncryptionCount = 0;
        this._totalMessagesWithoutSendKey = 0;
        this.keyId = null;
        this.previousKeyId = null;
        this._sentKeyId = null;
        this.participantKeys = {};
        this.participantKeys[this.ownHandle] = {};
    };


    /**
     * Extracts sender keys from a batch of messages into the cache of the
     * handler
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array of (most recent) batch of chat message history.
     * @return {Array.<Object>}
     *     An array of all the parsed messages' content.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._extractKeys = function(messages) {

        var message;
        var parsedMessage;
        var parsedMessages = [];
        var isOwnMessage;
        var otherHandle;
        var decryptedKeys;

        // Iterate over all messages to extract keys (if present).
        for (var i = 0; i < messages.length; i++) {
            message = messages[i];
            parsedMessage = ns._parseMessageContent(message);
            parsedMessages.push(parsedMessage);
            if (parsedMessage
                    && (parsedMessage.type === MESSAGE_TYPES.GROUP_KEYED)) {
                if (ns._verifyMessage(parsedMessage.signedContent,
                                      parsedMessage.signature,
                                      pubEd25519[message.userId])) {
                    isOwnMessage = (message.userId === this.ownHandle);
                    otherHandle = isOwnMessage
                                ? parsedMessage.recipients[0]
                                : message.userId;
                    // Decrypt message key(s).
                    decryptedKeys = this._decryptKeysFor(parsedMessage.keys[0],
                                                         parsedMessage.nonce,
                                                         otherHandle,
                                                         isOwnMessage);
                    if (!this.participantKeys[message.userId]) {
                        this.participantKeys[message.userId] = {};
                    }
                    for (var j = 0; j < parsedMessage.keyIds.length; j++) {
                        this.participantKeys[message.userId][parsedMessage.keyIds[j]] = decryptedKeys[j];
                    }
                }
                else {
                    logger.error('Signature invalid for message from '
                                 + message.userId + ' on ' + message.ts);
                }
            }
        }

        return parsedMessages;
    };


    /**
     * Seeds the handler with an array of historic messages to resume an
     * existing chat session.  The messages for seeding must be contiguous and
     * contain the most recent messages.  The order of the messages is not
     * important.  If this operatin fails to be successful (returns `false`),
     * grab another batch of earlier chat messages and pass them into this
     * method (does not need to include the already processed first batch, but
     * the batches must be directly adjoining).
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array of (most recent) batch of chat message history.
     * @return {Boolean}
     *     `true` on successful seeding, `false` on failure.
     */
    strongvelope.ProtocolHandler.prototype.seed = function(messages) {

        this._extractKeys(messages);

        // Find our own most recent (highest) sender key ID.
        var highestKeyId = '';
        var secondHighestKeyId = '';
        var ownKeys = this.participantKeys[this.ownHandle];
        for (var keyId in ownKeys) {
            if (ownKeys.hasOwnProperty(keyId) && (keyId > highestKeyId)) {
                secondHighestKeyId = highestKeyId;
                highestKeyId = keyId;
            }
        }

        if (highestKeyId === '') {
            return false;
        }

        this.keyId = highestKeyId;

        if (secondHighestKeyId) {
            this.previousKeyId = secondHighestKeyId;
        }

        return true;
    };


    /**
     * Checks whether messages passed in in an array are decryptable.
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array of (most recent) batch of chat message history.
     * @return {Object}
     *     An object containing a boolean array attribute `messages` flagging
     *     each element of the input array parameter as decryptable (`null`
     *     if it can't be parsed).  An attribute `participants` is an object
     *     giving for each sender of the batch (as key) the earliest time stamp
     *     of decryptability, `null` if not.
     */
    strongvelope.ProtocolHandler.prototype.areMessagesDecryptable = function(messages) {

        var parsedMessages = this._extractKeys(messages);

        var decryptable = [];
        var participants = {};

        // Iterate over all messages to extract keys (if present).
        var message;
        var keyId;
        var haveKey;
        for (var i = 0; i < parsedMessages.length; i++) {
            message = parsedMessages[i];
            if (message) {
                keyId = message.keyIds[0];
                haveKey = ((typeof this.participantKeys[message.userId] !== 'undefined')
                           && (typeof this.participantKeys[message.userId][keyId] !== 'undefined'));
                decryptable.push(haveKey);
                // Track for the smallest time stamp that we've got a key for on the sender.
                if (!participants[message.userId]) {
                    participants[message.userId] = null;
                }
                if (haveKey && (!participants[message.userId] || (participants[message.userId] > message.ts))) {
                    participants[message.userId] = message.ts;
                }
            }
            else {
                decryptable.push(null);
            }
        }

        return { messages: decryptable, participants: participants };
    };


    /**
     * Refreshes our own sender key. This method is also to be used to
     * initialise a new ProtocolHandler for a new chat session that is *not*
     * primed via historic messages.
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.updateSenderKey = function() {

        var dateStamp;
        var counter;

        if (this.keyId) {
            // Juggle the key IDs.
            this.previousKeyId = this.keyId;
            var keyIdComponents = ns._splitKeyId(this.keyId);
            dateStamp = keyIdComponents[0];
            counter = keyIdComponents[1];

            var newDateStamp = ns._dateStampNow();
            if (newDateStamp !== dateStamp) {
                dateStamp = newDateStamp;
                counter = 0;
            }
            else {
                if (counter >= 0xffff) {
                    throw new Error('This should hardly happen, but 2^16 keys were used for the day. Bailing out!');
                }
                counter = (counter + 1) & 0xffff;
            }
        }
        else {
            dateStamp  = ns._dateStampNow();
            counter = 0;
        }
        this.keyId = ns._encodeKeyId(dateStamp, counter);

        // Now the new sender key.
        var secretKey = new Uint8Array(SECRET_KEY_SIZE);
        asmCrypto.getRandomValues(secretKey);
        this.participantKeys[this.ownHandle][this.keyId] = asmCrypto.bytes_to_string(secretKey);

        this._keyEncryptionCount = 0;
        this._totalMessagesWithoutSendKey = 0;
    };


    /**
     * Derives a symmetric key for encrypting a message to a contact.  It is
     * derived using a Curve25519 key agreement.
     *
     * Note: The Curve25519 key cache must already contain the public key of
     *       the recipient.
     *
     * @method
     * @param userhandle {String}
     *     Mega user handle for user to send to or receive from.
     * @return {String}
     *     Binary string containing a 256 bit symmetric encryption key.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._computeSymmetricKey = function(userhandle) {
        var pubKey = pubCu25519[userhandle];
        if (!pubKey) {
            logger.error('No cached chat key for user: ' + userhandle);
            throw new Error('No cached chat key for user!');
        }
        var sharedSecret = nacl.scalarMult(
            asmCrypto.string_to_bytes(this.privCu25519),
            asmCrypto.string_to_bytes(pubKey));
        var key = asmCrypto.SHA256.bytes(sharedSecret);

        return asmCrypto.bytes_to_string(key);
    };


    /**
     * Encrypts symmetric encryption keys for a particular recipient.
     *
     * Note: This function requires the Cu25519 public key for the destination
     *       to be loaded already.
     *
     * @method
     * @param {Array.<String>} keys
     *     Keys to encrypt.
     * @param {String} nonce
     *     "Master nonce" used for encrypting the message. Will be used to
     *     derive an IV for the key encryption.
     * @param {String} destination
     *     User handle of the recipient.
     * @returns {String}
     */
    strongvelope.ProtocolHandler.prototype._encryptKeysFor = function(keys, nonce, destination) {

        assert(keys.length > 0, 'No keys to encrypt.');

        var clearText = '';
        for (var i = 0; i < keys.length; i++) {
            clearText += keys[i];
        }
        var clearBytes = asmCrypto.string_to_bytes(clearText);
        var ivBytes = asmCrypto.SHA256.bytes(base64urldecode(destination)
                                             + nonce).subarray(0, IV_SIZE);
        var keyBytes = asmCrypto.string_to_bytes(
            this._computeSymmetricKey(destination).substring(0, KEY_SIZE));
        var cipherBytes = asmCrypto.AES_CBC.encrypt(clearBytes, keyBytes,
                                                    false, ivBytes);

        return asmCrypto.bytes_to_string(cipherBytes);
    };


    /**
     * Decrypts symmetric encryption keys for a particular sender.
     *
     * Note: This function requires the Cu25519 public key for the destination
     *       to be loaded already.
     *
     * @method
     * @param {String} encryptedKeys
     *     Encrypted Key(s).
     * @param {String} nonce
     *     "Master nonce" used for encrypting the message. Will be used to
     *     derive an IV for the key decryption.
     * @param {String} otherParty
     *     User handle of the other party.
     * @param {Boolean} [iAmSender]
     *     If true, the message was sent by us (default: false).
     * @returns {Array.<String>}
     *     All symmetric keys in an array.
     */
    strongvelope.ProtocolHandler.prototype._decryptKeysFor = function(
            encryptedKeys, nonce, otherParty, iAmSender) {

        var receiver = iAmSender ? otherParty : this.ownHandle;
        var cipherBytes = asmCrypto.string_to_bytes(encryptedKeys);
        var ivBytes = asmCrypto.SHA256.bytes(base64urldecode(receiver)
                                             + nonce).subarray(0, IV_SIZE);
        var keyBytes = asmCrypto.string_to_bytes(
            this._computeSymmetricKey(otherParty).substring(0, KEY_SIZE));
        var clearBytes = asmCrypto.AES_CBC.decrypt(cipherBytes, keyBytes,
                                                   false, ivBytes);
        var clear = asmCrypto.bytes_to_string(clearBytes);

        assert(clear.length % KEY_SIZE === 0,
               'Length mismatch for decoding sender keys.');

        var result = [];
        while (clear.length > 0) {
            result.push(clear.substring(0, KEY_SIZE));
            clear = clear.substring(KEY_SIZE);
        }

        return result;
    };


    /**
     * Encrypts a message to (currently just a single) recipient.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {String} destination
     *     User handle of the recipient.
     * @returns {String}
     */
    strongvelope.ProtocolHandler.prototype.encryptTo = function(message, destination) {

        var content = '';
        var encryptedKeys;
        var messageType;

        // Check and rotate key if due.
        if (this._keyEncryptionCount >= this.rotateKeyEvery) {
            this.updateSenderKey();
        }

        var senderKey = this.participantKeys[this.ownHandle][this.keyId];
        var encryptedMessage = ns._symmetricEncryptMessage(message, senderKey);

        var keyIds = this.keyId;
        var repeatKey = (this._totalMessagesWithoutSendKey >= this.totalMessagesBeforeSendKey);
        if (repeatKey || (this._sentKeyId !== this.keyId)) {
            // Default: Keyed message.
            var keysIncluded = [senderKey];
            if (this.previousKeyId && !repeatKey) {
                // Include previous sender key on key rotation only.
                keysIncluded.push(this.participantKeys[this.ownHandle][this.previousKeyId]);
                keyIds += this.previousKeyId;
            }
            encryptedKeys = this._encryptKeysFor(keysIncluded, encryptedMessage.nonce,
                                                 destination);
            messageType = MESSAGE_TYPES.GROUP_KEYED;
            this._totalMessagesWithoutSendKey = 0;
        }
        else {
            // Use a (leaner) followup message and avoid re-sending key(s).
            messageType = MESSAGE_TYPES.GROUP_FOLLOWUP;
        }

        // Assemble message content.
        content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.MESSAGE_TYPE),
                                        String.fromCharCode(messageType));
        content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.NONCE),
                                        encryptedMessage.nonce);
        if (encryptedKeys) {
            // Include recipient(s) and sender key(s).
            content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.RECIPIENT),
                                            base64urldecode(destination));
            content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.KEYS),
                                            encryptedKeys);
            this._sentKeyId = this.keyId;
            content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.KEY_IDS),
                                            keyIds);

        }
        else {
            content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.KEY_IDS),
                                            this.keyId);
        }

        // Only include ciphertext if it's not empty (non-blind message).
        if (encryptedMessage.ciphertext !== null) {
            content += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.PAYLOAD),
                                            encryptedMessage.ciphertext);
            this._keyEncryptionCount++;
        }

        // Sign message.
        var signature = ns._signMessage(content,
                                        this.privEd25519, this.pubEd25519);
        content = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.SIGNATURE),
                                       signature)
                + content;

        // Update message counters.
        this._totalMessagesWithoutSendKey++;

        // Return assembled total message.
        return String.fromCharCode(PROTOCOL_VERSION) + content;
    };


    /**
     * Decrypts a message from a sender and (potentially) updates sender keys.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt.
     * @param {String} sender
     *     User handle of the message sender.
     * @param {Boolean} [historicMessage=false]
     *     Whether the message passed in for decryption is from the history.
     * @returns {(StrongvelopeMessage|Boolean)}
     *     The message content on success, `false` in case of errors.
     */
    strongvelope.ProtocolHandler.prototype.decryptFrom = function(message,
            sender, historicMessage) {

        var parsedMessage = ns._parseMessageContent(message);

        // Bail out on parse error.
        if (parsedMessage === false) {
            logger.error('Incoming message not usable.');

            return false;
        }

        // Verify protocol version.
        if (parsedMessage.protocolVersion !== PROTOCOL_VERSION) {
            logger.error('Message not compatible with current protocol version.');

            return false;
        }

        // Verify signature.
        if (!ns._verifyMessage(parsedMessage.signedContent,
                               parsedMessage.signature,
                               pubEd25519[sender])) {
            logger.error('Message signature invalid.');

            return false;
        }

        // Get sender key.
        var senderKey;
        var keyId = parsedMessage.keyIds[0];
        if (parsedMessage.keys.length > 0) {
            var isOwnMessage = (sender === this.ownHandle);
            var otherHandle = isOwnMessage ? parsedMessage.recipients[0] : sender;
            // Decrypt message key(s).
            var decryptedKeys = this._decryptKeysFor(parsedMessage.keys[0],
                                                     parsedMessage.nonce,
                                                     otherHandle,
                                                     isOwnMessage);
            parsedMessage.keys[0] = decryptedKeys;
            senderKey = decryptedKeys[0];

            // Update local sender key cache.
            if (!this.participantKeys[sender]) {
                this.participantKeys[sender] = {};
            }
            var previousSenderKey;
            var id;
            for (var i = 0; i < decryptedKeys.length; i++) {
                id = parsedMessage.keyIds[i];
                previousSenderKey = this.participantKeys[sender][id];
                if (previousSenderKey
                        && (previousSenderKey !== parsedMessage.keys[0][i])) {
                    // Bail out on inconsistent information.
                    logger.error("Mismatching statement on sender's previous key.");

                    return false;
                }
                this.participantKeys[sender][id] = parsedMessage.keys[0][i];
            }
            this.participantKeys[sender][keyId] = senderKey;
        }
        else {
            if (this.participantKeys[sender] && this.participantKeys[sender][keyId]) {
                senderKey = this.participantKeys[sender][keyId];
            }
            else {
                logger.error('Encryption key for message from ' + sender
                             + ' with ID ' + base64urlencode(keyId) + ' unavailable.');

                return false;
            }
        }

        // Decrypt message payload.
        var cleartext;
        if (typeof parsedMessage.payload !== 'undefined') {
            cleartext = ns._symmetricDecryptMessage(parsedMessage.payload,
                                                    senderKey,
                                                    parsedMessage.nonce);
        }
        else {
            cleartext = null;
        }

        // Bail out if decryption failed.
        if (cleartext === false) {
            return false;
        }

        var result = {
            sender: sender,
            type: parsedMessage.type,
            payload: cleartext
        };

        if (this._totalMessagesWithoutSendKey >= this.totalMessagesBeforeSendKey) {
            result.toSend = this.encryptTo(null, sender);
        }

        // Update counter.
        if (!historicMessage) {
            this._totalMessagesWithoutSendKey++;
        }

        return result;
    };


    /**
     * Checks whether messages passed in in an array are decryptable.
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array containing a batch of chat messages.
     * @param {Boolean} [historicMessages=true]
     *     Whether the messages passed in for decryption are from the history.
     * @returns {Array.<(StrongvelopeMessage|Boolean)>}
     *     Array of objects with message contents on success, `false` in case of
     *     errors.
     */
    strongvelope.ProtocolHandler.prototype.batchDecrypt = function(messages, historicMessages) {

        // First extract all keys.
        this._extractKeys(messages);

        // Now attempt to decrypt all messages.
        var decryptedMessages = [];
        historicMessages = (typeof historicMessages === 'undefined') || (historicMessages === true)
                         ? true : false;

        var message;
        for (var i = 0; i < messages.length; i++) {
            message = messages[i];
            decryptedMessages.push(this.decryptFrom(message.message,
                                                    message.userId,
                                                    historicMessages));
        }

        return decryptedMessages;
    };

}());
