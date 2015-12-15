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

    strongvelope._logger = MegaLogger.getLogger('strongvelope', undefined, 'chat');
    var logger = strongvelope._logger;

    strongvelope.NONCE_SIZE = 12;
    var NONCE_SIZE = strongvelope.NONCE_SIZE;
    strongvelope.KEY_SIZE = 16;
    var KEY_SIZE = strongvelope.KEY_SIZE;
    strongvelope.IV_SIZE = 16;
    var IV_SIZE = strongvelope.IV_SIZE;

    // Epoch time stamp granularity from Date.now().
    var _ONE_DAY = 1000 * 24 * 60 * 60;

    // Size in bytes of a key ID.
    var _KEY_ID_SIZE = 4;

    // Size threshold for RSA encrypted sender keys (greater than ... bytes).
    // (1024 bit RSA key --> 128 byte + 2 byte cipher text).
    var _RSA_ENCRYPTION_THRESHOLD = 128;

    /** Version of the protocol implemented. */
    strongvelope.PROTOCOL_VERSION = 0x00;
    var PROTOCOL_VERSION = strongvelope.PROTOCOL_VERSION;

    /** After how many messages our symmetric sender key is rotated. */
    strongvelope.ROTATE_KEY_EVERY = 16;

    /** How many messages our handler should "see" before re-sending our sender key. */
    strongvelope.TOTAL_MESSAGES_BEFORE_SEND_KEY = 30;

    /** Size (in bytes) of the secret/symmetric encryption key. */
    strongvelope.SECRET_KEY_SIZE = 16;
    var SECRET_KEY_SIZE = strongvelope.SECRET_KEY_SIZE;


    /**
     * Helper function that will return an intersect Set of two sets given.
     *
     * @private
     * @param {Set} set1
     *     First set to intersect with.
     * @param {Set} set2
     *     Second set to intersect with.
     * @return {Set}
     *     Intersected result set.
     */
    var _setIntersection = function(set1, set2) {

        var result = new Set();
        set1.forEach(function _setIntersectionIterator(item) {
            if (set2.has(item)) {
                result.add(item);
            }
        });

        return result;
    };


    /**
     * Helper function that will return a joined Set of two sets given.
     *
     * @private
     * @param {Set} set1
     *     First set to join with.
     * @param {Set} set2
     *     Second set to join with.
     * @return {Set}
     *     Joined result set.
     */
    var _setJoin = function(set1, set2) {

        var result = new Set(set1);
        set2.forEach(function _setJoinIterator(item) {
            result.add(item);
        });

        return result;
    };



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
     *     Signature for all following bytes.
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
     *     the previous sender key. Requires the same number of records in the
     *     same order as `RECIPIENT`.
     * @property KEY_IDS {Number}
     *     Sender encryption key IDs used (or set) in this message.
     * @property PAYLOAD {Number}
     *     Encrypted payload of message.
     * @property INC_PARTICIPANT {Number}
     *     Participant to be included with this message.
     * @property EXC_PARTICIPANT {Number}
     *     Participant to be excluded with this message.
     * @property OWN_KEY {Number}
     *     Own message encryption (sender) key. This is usually not required,
     *     but will be used if legacy RSA encryption of sender keys is used for
     *     at least one recipient. This is required to access one's own sender
     *     key later when re-reading own chat messages later from history.
     */
    strongvelope.TLV_TYPES = {
        _UNUSED_SEPARATOR_: 0x00,
        SIGNATURE:          0x01,
        MESSAGE_TYPE:       0x02,
        NONCE:              0x03,
        RECIPIENT:          0x04,
        KEYS:               0x05,
        KEY_IDS:            0x06,
        PAYLOAD:            0x07,
        INC_PARTICIPANT:    0x08,
        EXC_PARTICIPANT:    0x09,
        OWN_KEY:            0x0a,
    };
    var TLV_TYPES = strongvelope.TLV_TYPES;


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
        0x08: 'includeParticipants',
        0x09: 'excludeParticipants',
        0x0a: 'ownKey',
    };


    /**
     * "Enumeration" of message types used for the chat message transport.
     *
     * @property GROUP_KEYED {Number}
     *     Message containing a sender key (initial, key rotation, key re-send).
     * @property GROUP_CONTINUE {Number}
     *     Message using an existing sender key for encryption.
     * @property ALTER_PARTICIPANTS {Number}
     *     Alters the list of participants for the group chat
     *     (inclusion and exclusion).
     */
    strongvelope.MESSAGE_TYPES = {
        GROUP_KEYED:        0x00,
        GROUP_FOLLOWUP:     0x01,
        ALTER_PARTICIPANTS: 0x02
    };
    var MESSAGE_TYPES = strongvelope.MESSAGE_TYPES;
    var _KEYED_MESSAGES = [MESSAGE_TYPES.GROUP_KEYED,
                           MESSAGE_TYPES.ALTER_PARTICIPANTS];

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
        var keyBytes;

        if (key) {
            keyBytes = asmCrypto.string_to_bytes(key);
        }
        else {
            keyBytes = new Uint8Array(KEY_SIZE);
            asmCrypto.getRandomValues(keyBytes);
        }

        if (!nonce) {
            nonce = new Uint8Array(NONCE_SIZE);
            asmCrypto.getRandomValues(nonce);
            nonce = asmCrypto.bytes_to_string(nonce);
        }

        var nonceBytes = asmCrypto.string_to_bytes(
            strongvelope.deriveNonceSecret(nonce).substring(0, NONCE_SIZE));

        if ((message !== null) && (typeof message !== 'undefined')) {
            var clearBytes = asmCrypto.string_to_bytes(to8(message));
            var cipherBytes = asmCrypto.AES_CTR.encrypt(clearBytes, keyBytes, nonceBytes);
            result.ciphertext = asmCrypto.bytes_to_string(cipherBytes);
        }

        result.key = asmCrypto.bytes_to_string(keyBytes);
        result.nonce = nonce;

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
     *     Clear text of message content, `null` if no cipher text is given.
     * @private
     */
    strongvelope._symmetricDecryptMessage = function(cipher, key, nonce) {

        if ((cipher === null) || (typeof cipher === 'undefined')) {
            return null;
        }

        var keyBytes = asmCrypto.string_to_bytes(key);
        var nonceBytes = asmCrypto.string_to_bytes(
            strongvelope.deriveNonceSecret(nonce).substring(0, NONCE_SIZE));
        var cipherBytes = asmCrypto.string_to_bytes(cipher);
        var clearBytes = asmCrypto.AES_CTR.decrypt(cipherBytes, keyBytes, nonceBytes);
        var clearText = asmCrypto.bytes_to_string(clearBytes);

        try {
            clearText = from8(clearText);
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
        var messageBytes = asmCrypto.string_to_bytes('strongvelopesig' + message);
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

        var messageBytes = asmCrypto.string_to_bytes('strongvelopesig' + message);
        var signatureBytes = asmCrypto.string_to_bytes(signature);
        var keyBytes = asmCrypto.string_to_bytes(pubKey);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, keyBytes);
    };


    /**
     * Derive the shared confidentiality key.
     *
     * The key is a 32-byte string, half of which is later used for
     * AES-128. It is derived from the Diffie-Hellman shared secret, a x25519
     * public value, using HKDF-SHA256.
     *
     * @param {String} sharedSecret
     *     Input IKM for the HKDF. In mpENC, this is the x25519 public key
     *     result of the group key agreement.
     * @param {String} [context]
     *     Info string for the HKDF. In strongvelope, this is set to the
     *     constant "strongvelope pairwise key".
     * @returns {String}
     *     Derived key as a binary string.
     */
    strongvelope.deriveSharedKey = function(sharedSecret, context) {

        // Equivalent to first block of HKDF, see RFC 5869.
        context = (typeof context === 'undefined')
                ? 'strongvelope pairwise key' : context;
        var hmac = asmCrypto.HMAC_SHA256.bytes;

        return asmCrypto.bytes_to_string(hmac(context + "\x01",
                                              hmac(sharedSecret, '')));
    };


    /**
     * Derive the nonce to use for an encryption for a particular recipient
     * or message payload encryption.
     *
     * The returned nonce is a 32-byte string, of which a suitable slice is
     * later used for encryption. It is derived from message's master nonce.
     *
     * @param {String} masterNonce
     *     Master nonce as transmitted in the message, used as a base to derive
     *     a nonce secret from.
     * @param {String} [recipient]
     *     Recipient's user handle. If not set, using the string "payload" for
     *     message payload encryption.
     * @returns {String}
     *     Derived nonce as a binary string.
     */
    strongvelope.deriveNonceSecret = function(masterNonce, recipient) {

        // Equivalent to first block of HKDF, see RFC 5869.
        recipient = (typeof recipient === 'undefined')
                  ? 'payload' : base64urldecode(recipient);

        return asmCrypto.bytes_to_string(asmCrypto.HMAC_SHA256.bytes(
            recipient, masterNonce));
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
    strongvelope._parseMessageContent = function(binaryMessage) { // jshint maxcomplexity: 13

        var parsedContent = {
            recipients: [], keys: [], keyIds: [],
            includeParticipants: [], excludeParticipants: []
        };
        var currentTlvType = null;
        var part;
        var tlvType;
        var tlvVariable;
        var lastTlvType = -1;
        var value;

        parsedContent.protocolVersion = binaryMessage.charCodeAt(0);
        var rest = binaryMessage.substring(1);

        while (rest.length > 0) {
            part = tlvstore.splitSingleTlvRecord(rest);
            tlvType = part.record[0].charCodeAt(0);
            tlvVariable = _TLV_MAPPING[tlvType];
            value = part.record[1];

            if (typeof tlvVariable === 'undefined') {
                logger.error('Received unexpected TLV type: ' + tlvType + '.');

                return false;
            }

            // Some records need different treatment. Let's go through cases.
            switch (tlvType) {
                case TLV_TYPES.SIGNATURE:
                    parsedContent[tlvVariable] = value;
                    parsedContent.signedContent = part.rest;
                    break;
                case TLV_TYPES.MESSAGE_TYPE:
                    parsedContent[tlvVariable] = value.charCodeAt(0);
                    break;
                case TLV_TYPES.RECIPIENT:
                case TLV_TYPES.INC_PARTICIPANT:
                case TLV_TYPES.EXC_PARTICIPANT:
                    parsedContent[tlvVariable].push(base64urlencode(value));
                    break;
                case TLV_TYPES.KEYS:
                    parsedContent[tlvVariable].push(value);
                    break;
                case TLV_TYPES.KEY_IDS:
                    var keyIds = value;
                    while (keyIds.length > 0) {
                        parsedContent[tlvVariable].push(keyIds.substring(0, _KEY_ID_SIZE));
                        keyIds = keyIds.substring(_KEY_ID_SIZE);
                    }
                    break;
                default:
                    // For all non-special cases, this will be used.
                    parsedContent[tlvVariable] = value;
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
     * @property {Array.<String>} includeParticipants
     *     Participants to include (as of now participants of group chat).
     *     Only contains elements if the message `type` is
     *     `strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS`.
     * @property {Array.<String>} excludeParticipants
     *     Participants to exclude (as of now not participants of group chat
     *     anymore). Only contains elements if the message `type` is
     *     `strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS`.
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
     * @param {String} [myPrivCu25519]
     *     Our private chat key (Curve25519, default: u_privCu25519).
     * @param {String} [myPrivEd25519]
     *     Our private signing key (Ed25519, default: u_pubCu25519).
     * @param {String} [myPubEd25519]
     *     Our public signing key (Ed25519, optional, can be derived upon
     *     instantiation from private key).
     *
     * @property {String} ownHandle
     *     Our own user handle (u_handle).
     * @property {String} myPrivCu25519
     *     Our private chat key (Curve25519).
     * @property {String} myPrivEd25519
     *     Our private signing key (Ed25519).
     * @property {String} myPubEd25519
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
     * @property {Array.<String>} otherParticipants
     *     An array of all the participants' user handles in the chat, but
     *     excluding one self.
     * @property {Array.<String>} includeParticipants
     *     An array of participants' user handles to include in the chat.
     * @property {Array.<String>} excludeParticipants
     *     An array of participants' user handles to exclude from the chat.
     */
    strongvelope.ProtocolHandler = function(ownHandle, myPrivCu25519,
            myPrivEd25519, myPubEd25519) {

        this.ownHandle = ownHandle || u_handle;
        this.myPrivCu25519 = myPrivCu25519 || u_privCu25519;
        this.myPrivEd25519 = myPrivEd25519 || u_privEd25519;
        this.myPubEd25519 = myPubEd25519;
        if (!this.myPubEd25519) {
            this.myPubEd25519 = crypt.getPubKeyFromPrivKey(this.myPrivEd25519, 'Ed25519');
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
        this.otherParticipants = new Set();
        this.includeParticipants = new Set();
        this.excludeParticipants = new Set();
    };


    /**
     * Parses a message and extracts the sender keys.
     *
     * @method
     * @param message {ChatdMessage}
     *     A message to extract keys from.
     * @return {{Object.<parsedMessage: Object, senderKeys: Object}|Boolean}
     *     An objects containing the parsed message and an object mapping a
     *     keyId to a key. `false` on signature verification error.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._parseAndExtractKeys = function(message) {

        var parsedMessage = ns._parseMessageContent(message.message);
        var result = { parsedMessage: parsedMessage, senderKeys: {}};

        if (parsedMessage && (_KEYED_MESSAGES.indexOf(parsedMessage.type) >= 0)) {
            if (ns._verifyMessage(parsedMessage.signedContent,
                                  parsedMessage.signature,
                                  pubEd25519[message.userId])) {
                var isOwnMessage = (message.userId === this.ownHandle);
                var myIndex = parsedMessage.recipients.indexOf(this.ownHandle);
                // If we sent the message, pick first recipient for getting the
                // sender key (e. g. for history loading).
                var keyIndex = isOwnMessage ? 0 : myIndex;
                var otherHandle = isOwnMessage
                                ? parsedMessage.recipients[0]
                                : message.userId;
                if (keyIndex >= 0) {
                    // Decrypt message key(s).
                    var decryptedKeys = this._decryptKeysFor(parsedMessage.keys[keyIndex],
                                                             parsedMessage.nonce,
                                                             otherHandle,
                                                             isOwnMessage);
                    // Update local sender key cache.
                    if (!this.participantKeys[message.userId]) {
                        this.participantKeys[message.userId] = {};
                    }
                    for (var i = 0; i < decryptedKeys.length; i++) {
                        result.senderKeys[parsedMessage.keyIds[i]] = decryptedKeys[i];
                    }
                }
            }
            else {
                logger.error('Signature invalid for message from '
                             + message.userId + ' on ' + message.ts);

                return false;
            }
        }

        return result;
    };


    /**
     * Parses a batch of messages and extracts sender keys into the cache of
     * the handler.
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array of (most recent) batch of chat message history.
     * @return {Array.<Object>}
     *     An array of all the parsed messages' content.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._batchParseAndExtractKeys = function(messages) {

        var extracted;
        var parsedMessages = [];
        var parsedMessage;
        var senderKeys;
        var storedKey;

        // Iterate over all messages to extract keys (if present).
        for (var i = 0; i < messages.length; i++) {
            extracted = this._parseAndExtractKeys(messages[i]);
            parsedMessage = extracted.parsedMessage;
            parsedMessages.push(parsedMessage);
            senderKeys = extracted.senderKeys;
            for (var keyId in senderKeys) {
                if (senderKeys.hasOwnProperty(keyId)) {
                    storedKey = this.participantKeys[messages[i].userId][keyId];
                    if (storedKey && (storedKey !== senderKeys[keyId])) {
                        // Bail out on inconsistent information.
                        logger.error("Mismatching statement on sender's previously sent key.");

                        return false;
                    }
                    this.participantKeys[messages[i].userId][keyId] = senderKeys[keyId];
                }
            }
        }

        return parsedMessages;
    };


    /**
     * Seeds the handler with an array of historic messages to resume an
     * existing chat session.  The messages for seeding must be contiguous and
     * contain the most recent messages.  The order of the messages is not
     * important.  If this operation fails to be successful (returns `false`),
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

        this._batchParseAndExtractKeys(messages);

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

        var parsedMessages = this._batchParseAndExtractKeys(messages);

        var decryptable = [];
        var participants = {};

        // Iterate over all messages to extract keys (if present).
        var message;
        var sender;
        var keyId;
        var haveKey;
        for (var i = 0; i < messages.length; i++) {
            message = messages[i];
            sender = messages[i].userId;
            if (message) {
                keyId = parsedMessages[i].keyIds[0];
                haveKey = ((typeof this.participantKeys[sender] !== 'undefined')
                           && (typeof this.participantKeys[sender][keyId] !== 'undefined'));
                decryptable.push(haveKey);
                // Track for the smallest time stamp that we've got a key for
                // on the sender.
                if (!participants[sender]) {
                    participants[sender] = null;
                }
                if (haveKey && (!participants[sender] || (participants[message.userId] > message.ts))) {
                    participants[sender] = message.ts;
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
            asmCrypto.string_to_bytes(this.myPrivCu25519),
            asmCrypto.string_to_bytes(pubKey));

        return strongvelope.deriveSharedKey(sharedSecret);
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
     *     Encrypted sender keys.
     */
    strongvelope.ProtocolHandler.prototype._encryptKeysFor = function(keys, nonce, destination) {

        assert(keys.length > 0, 'No keys to encrypt.');

        var clearText = '';
        for (var i = 0; i < keys.length; i++) {
            clearText += keys[i];
        }

        // Use RSA encryption if no chat key is available.
        if (!pubCu25519[destination]) {
            var pubKey = u_pubkeys[destination];
            if (!pubKey) {
                logger.warn('No public encryption key (RSA or x25519) available for '
                            + destination);

                return false;
            }
            logger.info('Encrypting sender keys for ' + destination + ' using RSA.');

            return crypt.rsaEncryptString(clearText, pubKey);
        }

        // Encrypt chat keys.
        var clearBytes = asmCrypto.string_to_bytes(clearText);
        var ivBytes = asmCrypto.string_to_bytes(
            strongvelope.deriveNonceSecret(nonce, destination).substring(0, IV_SIZE));
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

        var clear = '';

        // Check if sender key is encrypted using RSA.
        if (encryptedKeys.length < _RSA_ENCRYPTION_THRESHOLD) {
            // Using normal chat keys.
            var receiver = iAmSender ? otherParty : this.ownHandle;
            var cipherBytes = asmCrypto.string_to_bytes(encryptedKeys);
            var ivBytes = asmCrypto.string_to_bytes(
                strongvelope.deriveNonceSecret(nonce, receiver).substring(0, IV_SIZE));
            var keyBytes = asmCrypto.string_to_bytes(
                this._computeSymmetricKey(otherParty).substring(0, KEY_SIZE));
            var clearBytes = asmCrypto.AES_CBC.decrypt(cipherBytes, keyBytes,
                                                       false, ivBytes);
            clear = asmCrypto.bytes_to_string(clearBytes);
        }
        else {
            logger.info('Got RSA encrypted sender keys.');

            clear = crypt.rsaDecryptString(encryptedKeys, u_privk);
        }

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
     * An object containing the encrypted and TLV encoded recipient key IDs and
     * sender keys.
     *
     * @typedef {Object} EncryptedSenderKeys
     * @property {String} recipients
     *     TLV encoded recipients for keys.
     * @property {String} keys
     *     TLV encoded, encrypted sender key to recipients.
     * @property {String} keyIds
     *     TLV encoded key IDs.
     */


    /**
     * Encrypts the sender key to the recipients as needed.
     *
     * @method
     * @private
     * @param {String} nonce
     *     "Master nonce" used for encrypting the message. Will be used to
     *     derive an IV for the key encryption.
     * @returns {EncryptedSenderKeys}
     *     Encrypted sender key to participants or `false` if nothing is to send.
     */
    strongvelope.ProtocolHandler.prototype._encryptSenderKey = function(nonce) {

        var self = this;
        var needOwnKeyEncryption = false;

        if (self.otherParticipants.size === 0) {
            return false;
        }

        // Update participants list.
        self.otherParticipants = _setJoin(self.otherParticipants, self.includeParticipants);
        var index = -1;
        self.excludeParticipants.forEach(function _excludeParticipantsIterator(item) {
            self.otherParticipants.delete(item);
        });

        var recipients = '';
        var keys = '';
        var keyIds = '';

        var senderKey = self.participantKeys[self.ownHandle][self.keyId];

        // Assemble the key ID(s) to be sent.
        var keyIdContent = self.keyId;
        if (self.previousKeyId && (self._sentKeyId !== self.keyId)) {
            // Also add previous key ID on key rotation.
            keyIdContent += self.previousKeyId;
        }
        keyIds = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.KEY_IDS),
                                      keyIdContent);

        // Assemble the output for all recipients.
        var keysIncluded = [];
        var encryptedKeys = '';
        var isNewMember = false;
        self.otherParticipants.forEach(function _memberIterator(destination) {
            isNewMember = self.includeParticipants.has(destination);

            recipients += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.RECIPIENT),
                                               base64urldecode(destination));
            keysIncluded = [senderKey];
            if (self.previousKeyId
                    && (self._sentKeyId !== self.keyId)
                    && !isNewMember) {
                // Also add previous key on key rotation for existing members.
                keysIncluded.push(self.participantKeys[self.ownHandle][self.previousKeyId]);
            }
            encryptedKeys = self._encryptKeysFor(keysIncluded, nonce, destination);
            if (encryptedKeys.length > _RSA_ENCRYPTION_THRESHOLD) {
                needOwnKeyEncryption = true;
            }
            keys += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.KEYS),
                                         encryptedKeys);
        });

        var result = { recipients: recipients, keys: keys, keyIds: keyIds };

        // Add sender key encrypted to self if required.
        if (needOwnKeyEncryption) {
            keysIncluded = [senderKey];
            if (self.previousKeyId) {
                keysIncluded.push(self.participantKeys[self.ownHandle][self.previousKeyId]);
            }
            encryptedKeys = self._encryptKeysFor(keysIncluded, nonce, this.ownHandle);
            result.ownKey = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.OWN_KEY),
                                                 encryptedKeys);
        }

        // Reset include/exclude lists before leaving.
        self.includeParticipants.clear();
        self.excludeParticipants.clear();

        return result;
    };


    /**
     * Assembles the message body to the recipients of the (group) chat.
     * This function also rotates or re-sends the sender key if required.
     *
     * @method
     * @private
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @returns {{ keyed: Boolean, content: String, ownKey: String }}
     *     Outgoing message content encoded in TLV records, and a flag
     *     indicating whether the message is keyed.
     */
    strongvelope.ProtocolHandler.prototype._assembleBody = function(message) {

        // Check and rotate key if due.
        if (this._keyEncryptionCount >= this.rotateKeyEvery) {
            this.updateSenderKey();
        }

        var senderKey = this.participantKeys[this.ownHandle][this.keyId];
        var encryptedMessage = ns._symmetricEncryptMessage(message, senderKey);

        var repeatKey = (this._totalMessagesWithoutSendKey >= this.totalMessagesBeforeSendKey);
        var encryptedKeys = false;
        if (repeatKey || (this._sentKeyId !== this.keyId)) {
            encryptedKeys = this._encryptSenderKey(encryptedMessage.nonce);
        }

        var messageType = encryptedKeys
                        ? MESSAGE_TYPES.GROUP_KEYED
                        : MESSAGE_TYPES.GROUP_FOLLOWUP;

        // Assemble message content.
        var content = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.NONCE),
                                           encryptedMessage.nonce);
        if (encryptedKeys) {
            // Include recipient(s) and sender key(s).
            content += encryptedKeys.recipients;
            content += encryptedKeys.keys;
            content += encryptedKeys.keyIds;
            this._sentKeyId = this.keyId;
            this._totalMessagesWithoutSendKey = 0;
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

        // Add sender key encrypted to self if required (on RSA use).
        if (encryptedKeys && encryptedKeys.ownKey) {
            content += encryptedKeys.ownKey;
        }

        // Update message counters.
        this._totalMessagesWithoutSendKey++;

        return { keyed: (encryptedKeys !== false), content: content };
    };


    /**
     * Signs content for delivery in the (group) chat.
     *
     * @method
     * @private
     * @param {String} content
     *     Content to sign.
     * @returns {String}
     *     Content with signature TLV record prepended.
     */
    strongvelope.ProtocolHandler.prototype._signContent = function(content) {

        var signature = ns._signMessage(content,
                                        this.myPrivEd25519, this.myPubEd25519);
        var signatureRecord = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.SIGNATURE),
                                                   signature);

        return signatureRecord + content;
    };


    /**
     * Encrypts a message to the recipients of the (group) chat.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {String} [destination]
     *     User handle of the (new and only) recipient.
     * @returns {String|Boolean}
     *     Encrypted outgoing message or `false` if something fails.
     */
    strongvelope.ProtocolHandler.prototype.encryptTo = function(message, destination) {

        // Check we're in a chat with this destination, or a new chat.
        if (destination && !this.otherParticipants.has(destination)) {
            if (this.otherParticipants.size === 0) {
                this.otherParticipants.add(destination);
            }
            else {
                logger.warn('Destination not in current participants: ' + destination);

                return false;
            }
        }

        if (this.otherParticipants.size === 0) {
            logger.warn('No destinations or other participants to send to.');

            return false;
        }

        // Assemble main message body and rotate keys if required.
        var assembledMessage = this._assembleBody(message);
        var messageType = assembledMessage.keyed
                        ? MESSAGE_TYPES.GROUP_KEYED
                        : MESSAGE_TYPES.GROUP_FOLLOWUP;

        // Assemble rest of message.
        var content = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.MESSAGE_TYPE),
                                           String.fromCharCode(messageType))
                    + assembledMessage.content;

        // Sign message.
        content = this._signContent(content);

        // Return assembled total message.
        return String.fromCharCode(PROTOCOL_VERSION) + content;
    };


    /**
     * Update local sender key cache and get sender key.
     *
     * @method
     * @param {String} sender
     *     User handle of the message sender.
     * @param {Object} parsedMessage
     *     Mapping a keyId to a key.
     * @param {Object} senderKeys
     *     Mapping a keyId to a key.
     * @returns {String|Boolean}
     *     The sender key used, `false` in case of mismatches with existing
     *     cached entries.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._getSenderKeyAndUpdateCache = function(
                sender, parsedMessage, senderKeys) {

        var storedKey;
        for (var id in senderKeys) {
            if (!senderKeys.hasOwnProperty(id)) {
                continue;
            }

            if (!this.participantKeys[sender]) {
                this.participantKeys[sender] = {};
            }
            storedKey = this.participantKeys[sender][id];
            if (storedKey && (storedKey !== senderKeys[id])) {
                // Bail out on inconsistent information.
                logger.error("Mismatching statement on sender's previously sent key.");

                return false;
            }
            this.participantKeys[sender][id] = senderKeys[id];
        }

        // Get sender key.
        var senderKey;
        var keyId = parsedMessage.keyIds[0];
        if ((parsedMessage.keys.length > 0) && (parsedMessage.recipients.length > 0)) {
            senderKey = senderKeys[keyId];
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

        return senderKey;
    };


    /**
     * Update group participants on received message.
     *
     * @method
     * @param {String} sender
     *     User handle of the message sender.
     * @param {Object} parsedMessage
     *     User handle of the message sender.
     * @returns {Boolean}
     *     `false` in case I am not a participant (any more),
     *     `true` otherwise.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._updateGroupParticipants = function(
                sender, parsedMessage) {

        var isOwnMessage = (sender === this.ownHandle);
        var myIndex = parsedMessage.recipients.indexOf(this.ownHandle);
        if ((parsedMessage.recipients.length > 0) && !isOwnMessage) {
            if (myIndex === -1) {
                // I'm not in the list.
                if (parsedMessage.type === MESSAGE_TYPES.ALTER_PARTICIPANTS) {
                    this.keyId = null;
                    this.otherParticipants.clear();
                    this.includeParticipants.clear();
                    this.excludeParticipants.clear();
                    logger.info('I have been excluded from this chat, cannot read message.');
                }
                else {
                    logger.warn('Incoming chat message not intended for me (not part of chat).');
                }

                return false;
            }

            this.otherParticipants = new Set(parsedMessage.recipients);
            this.otherParticipants.add(sender);
            this.otherParticipants.delete(this.ownHandle);
        }

        return true;
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
            sender, historicMessage) { // jshint maxcomplexity: 11

        var self = this;

        // Check we're in a chat with this sender, or on a new chat.
        if (!this.otherParticipants.has(sender)
                && (sender !== this.ownHandle)
                && (this.otherParticipants.size > 0)) {
            logger.warn('Sender not in current participants: ' + sender);

            return false;
        }

        // Extract keys, and parse message in the same go.
        var extractedContent = this._parseAndExtractKeys({ userId: sender, message: message});
        if (extractedContent === false) {
            logger.error('Message signature invalid.');

            return false;
        }

        var parsedMessage = extractedContent.parsedMessage;
        var senderKeys = extractedContent.senderKeys;

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

        // TODO: Check legitimacy of operation (moderator set on alter participants).

        // Now puzzle out the group composition.
        if (this._updateGroupParticipants(sender, parsedMessage) === false) {
            return false;
        }

        // Get sender key.
        var senderKey = this._getSenderKeyAndUpdateCache(sender, parsedMessage,
                                                         senderKeys);

        if (senderKey === false) {
            return false;
        }

        // Decrypt message payload.
        var cleartext = ns._symmetricDecryptMessage(parsedMessage.payload,
                                                    senderKey,
                                                    parsedMessage.nonce);

        // Bail out if decryption failed.
        if (cleartext === false) {
            return false;
        }

        var result = {
            sender: sender,
            type: parsedMessage.type,
            payload: cleartext,
            includeParticipants: [],
            excludeParticipants: []
        };

        if ((this._totalMessagesWithoutSendKey >= this.totalMessagesBeforeSendKey)
                && (result.sender !== this.ownHandle)) {
            result.toSend = this.encryptTo(null, sender);
        }

        // Update counter.
        if (!historicMessage && (result.sender !== this.ownHandle)) {
            this._totalMessagesWithoutSendKey++;
        }

        // Take actions on participant changes.
        if ((sender !== this.ownHandle)
                && (parsedMessage.type === MESSAGE_TYPES.ALTER_PARTICIPANTS)) {
            // Update my sender key.
            logger.info('Particpant change received, updating sender key.');
            this.updateSenderKey();

            // Track included/excluded members.
            this.includeParticipants = _setJoin(this.includeParticipants,
                new Set(parsedMessage.includeParticipants));
            result.includeParticipants = parsedMessage.includeParticipants;
            this.excludeParticipants = _setJoin(this.excludeParticipants,
                new Set(parsedMessage.excludeParticipants));
            result.excludeParticipants = parsedMessage.excludeParticipants;

            // Update other participants list.
            this.otherParticipants = _setJoin(this.otherParticipants,
                this.includeParticipants);
            this.otherParticipants.delete(this.ownHandle);
            this.excludeParticipants.forEach(function _removeEcludeIterator(item) {
                self.otherParticipants.delete(item);
            });
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
    strongvelope.ProtocolHandler.prototype.batchDecrypt = function(messages,
            historicMessages) {

        historicMessages = (historicMessages === false) ? false : true;

        // First extract all keys.
        this._batchParseAndExtractKeys(messages);

        // Now attempt to decrypt all messages.
        var decryptedMessages = [];

        var message;
        for (var i = 0; i < messages.length; i++) {
            message = messages[i];
            decryptedMessages.push(this.decryptFrom(message.message,
                                                    message.userId,
                                                    historicMessages));
        }

        return decryptedMessages;
    };


    /**
     * Alters the participant list of the chat room.
     *
     * Note: There are no checks for overlaps in the include/eclude lists.
     *
     * TODO: Employ the usage of sets (via object attributes) over arrays for
     *       uniqueness of entries (implement in _encryptSenderKey).
     *
     * @method
     * @param {Array.<String>} includeParticipants
     *     Array of new participants' user handles to include to the chat room.
     * @param {Array.<String>} excludeParticipants
     *     Array of old participants' user handles to exclude from the chat room.
     * @param {String} [message]
     *     Data message to send directly with the member change. If `null`
     *     or `undefined`, no message payload will be encoded (i. e. it's a
     *     "blind" management message).
     * @returns {String|Boolean}
     *     Message to be sent to the room. `false` if no message is to be
     *     sent (e.g. on an error).
     */
    strongvelope.ProtocolHandler.prototype.alterParticipants = function(
            includeParticipants, excludeParticipants, message) { // jshint maxcomplexity: 12


        var errorOut = false;

        includeParticipants = includeParticipants || [];
        excludeParticipants = excludeParticipants || [];

        // General sanity check.
        if ((includeParticipants.length === 0)
                && (excludeParticipants.length === 0)) {
            logger.warn('No participants to include or exclude.');
            errorOut = true;
        }

        // Some sanity checking on new participants to include.
        for (var i = 0; i < includeParticipants.length; i++) {
            if (includeParticipants[i] === this.ownHandle) {
                logger.warn('Cannot include myself to a chat.');
                errorOut = true;
            }
            else if (this.otherParticipants.has(includeParticipants[i])) {
                logger.warn('User ' + includeParticipants[i] + ' already participating, cannot include.');
                errorOut = true;
            }
            else {
                this.includeParticipants.add(includeParticipants[i]);
            }
        }

        // Some sanity checking on existing participants to exclude.
        // jshint -W004
        for (var i = 0; i < excludeParticipants.length; i++) {
            if (excludeParticipants[i] === this.ownHandle) {
                logger.warn('Cannot exclude myself from a chat.');
                errorOut = true;
            }
            else if (!this.otherParticipants.has(excludeParticipants[i])) {
                logger.warn('User ' + excludeParticipants[i] + ' not participating, cannot exclude.');
                errorOut = true;
            }
            else {
                this.excludeParticipants.add(excludeParticipants[i]);
            }
        }
        // jshint +W004

        if (errorOut) {
            return false;
        }

        // Update our sender key.
        this.updateSenderKey();

        // Collect participants to be in- or excluded.
        var participantsInExcluded = '';
        this.includeParticipants.forEach(function _addIncludedParticipants(item) {
            participantsInExcluded += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.INC_PARTICIPANT),
                                                           base64urldecode(item));
        });
        this.excludeParticipants.forEach(function _addExcludedParticipants(item) {
            participantsInExcluded += tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.EXC_PARTICIPANT),
                                                           base64urldecode(item));
        });

        // Assemble main message body and rotate keys if required.
        var assembledMessage = this._assembleBody(message);

        // Add correct message type to front and put together final content.
        var content = tlvstore.toTlvRecord(String.fromCharCode(TLV_TYPES.MESSAGE_TYPE),
                                           String.fromCharCode(MESSAGE_TYPES.ALTER_PARTICIPANTS))
                    + assembledMessage.content + participantsInExcluded;

        // Sign message.
        content = this._signContent(content);

        // Return assembled total message.
        return String.fromCharCode(PROTOCOL_VERSION) + content;
    };

}());
