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

    // Size in bytes of a key ID.
    var _KEY_ID_SIZE_V0 = 4;
    var _KEY_ID_SIZE_V1 = 8;

    // Size threshold for RSA encrypted sender keys (greater than ... bytes).
    // (1024 bit RSA key --> 128 byte + 2 byte cipher text).
    strongvelope._RSA_ENCRYPTION_THRESHOLD = 128;

    /** Version of the protocol implemented. */
    strongvelope.PROTOCOL_VERSION_V1 = 0x01;
    var PROTOCOL_VERSION_V1 = strongvelope.PROTOCOL_VERSION_V1;

    /** Version of the protocol implemented. */
    strongvelope.PROTOCOL_VERSION_V2 = 0x02;
    var PROTOCOL_VERSION_V2 = strongvelope.PROTOCOL_VERSION_V2;

    /** Version of the protocol implemented. */
    strongvelope.PROTOCOL_VERSION = 0x03;
    var PROTOCOL_VERSION = strongvelope.PROTOCOL_VERSION;

    /** Size (in bytes) of the secret/symmetric encryption key. */
    strongvelope.SECRET_KEY_SIZE = 16;
    var SECRET_KEY_SIZE = strongvelope.SECRET_KEY_SIZE;

    /** Size (in bytes) of the message identity. */
    strongvelope.MESSAGE_IDENTITY_SIZE = 8;
    var MESSAGE_IDENTITY_SIZE = strongvelope.MESSAGE_IDENTITY_SIZE;

    /** Size (in bytes) of the message identity timestamp part. */
    strongvelope.MESSAGE_IDENTITY_TIMESTAMP_SIZE = 3;
    var MESSAGE_IDENTITY_TIMESTAMP_SIZE = strongvelope.MESSAGE_IDENTITY_TIMESTAMP_SIZE;

    /** Size (in bytes) of the message identity randomness part. */
    strongvelope.MESSAGE_IDENTITY_RANDOMNESS_SIZE = 5;
    var MESSAGE_IDENTITY_RANDOMNESS_SIZE = strongvelope.MESSAGE_IDENTITY_RANDOMNESS_SIZE;

    /** Size (in bytes) of the message reference identity size. */
    strongvelope.MESSAGE_REFERENCE_SIZE = 2;
    var MESSAGE_REFERENCE_SIZE = strongvelope.MESSAGE_REFERENCE_SIZE;

    /** User handle of chat API. */
    strongvelope.COMMANDER = 'gTxFhlOd_LQ';
    var COMMANDER = strongvelope.COMMANDER;

    /** Flag of temporary key ID. */
    strongvelope.TEMPKEYIDFLAG = 0xffff0000;
    var TEMPKEYIDFLAG = strongvelope.TEMPKEYIDFLAG;

    /** Size (in bytes) of the user handle. */
    strongvelope.USER_HANDLE_SIZE = 8;
    var USER_HANDLE_SIZE = strongvelope.USER_HANDLE_SIZE;

    /** Map of derived shared keys. */
    var DERIVED_SHARED_KEYS = {};
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
        INVITOR:            0x0b,
        PRIVILEGE:          0x0c,
        MESSAGE_IDENTITY:   0x0d,
        MESSAGE_REFERENCE:  0x0e,
        KEY_BLOB:           0x0f,
        OPENMODE:  0x10
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
        0x0b: 'invitor',
        0x0c: 'privilege',
        0x0d: 'identity',
        0x0e: 'reference',
        0x0f: 'keyBlob',
        0x10: 'openMode',
    };

    /**
     * "Enumeration" of chat mode.
     *
     */
    strongvelope.CHAT_MODE = {
        CLOSED:   0x00,
        PUBLIC:   0x01
    };
    var CHAT_MODE = strongvelope.CHAT_MODE;
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
        ALTER_PARTICIPANTS: 0x02,
        TRUNCATE:           0x03,
        PRIVILEGE_CHANGE:   0x04,
        TOPIC_CHANGE:       0x05,
        CALL_END:           0x06,
        CALL_STARTED:       0x07,
        PUBLIC_HANDLE_CREATE:    0x08,
        PUBLIC_HANDLE_DELETE:    0x09,
        OPEN_MODE_CLOSED:        0x0a
    };
    var MESSAGE_TYPES = strongvelope.MESSAGE_TYPES;
    var _KEYED_MESSAGES = [MESSAGE_TYPES.GROUP_KEYED,
                           MESSAGE_TYPES.ALTER_PARTICIPANTS];

    /**
     * Encodes a numeric date stamp and counter component into a key ID.
     *
     * @param {Number}
     *     Date stamp value.
     * @param {Number}
     *     Counter value.
     * @param {Number}
     *     Prefix value representing unique device id
     * @return {String}
     *     The key ID.
     * @private
     */
    strongvelope._encodeKeyId = function(counter) {

        var keyIdNumber =  TEMPKEYIDFLAG | counter;
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
            var cipherBytes = asmCrypto.AES_CTR.encrypt(message, keyBytes, nonceBytes);
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
     * @returns {String|Boolean}
     *     Clear text of message content, `false` if no cipher text or key is given.
     * @private
     */
    strongvelope._symmetricDecryptMessage = function(cipher, key, nonce) {

        if (!cipher || !key || !nonce) {
            return false;
        }

        var keyBytes = asmCrypto.string_to_bytes(key);
        var nonceBytes = asmCrypto.string_to_bytes(
            strongvelope.deriveNonceSecret(nonce).substring(0, NONCE_SIZE));
        var cipherBytes = asmCrypto.string_to_bytes(cipher);
        var clearBytes = asmCrypto.AES_CTR.decrypt(cipherBytes, keyBytes, nonceBytes);
        var clearText = asmCrypto.bytes_to_string(clearBytes);

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
    strongvelope._verifyMessage = function(message, signature, pubKey, chatId) {
        if ((signature === null) || (typeof signature === 'undefined')) {
            logger.critical('No signature.');
            return MegaPromise.resolve(false);
        }
        if ((pubKey === null) || (typeof pubKey === 'undefined')) {
            logger.critical('No pubKey.');
            return MegaPromise.resolve(false);
        }
        var messageBytes = asmCrypto.string_to_bytes('strongvelopesig' + message);
        var signatureBytes = asmCrypto.string_to_bytes(signature);
        var keyBytes = asmCrypto.string_to_bytes(pubKey);

        return backgroundNacl.sign.detached.verify(messageBytes, signatureBytes, keyBytes, 'svlp:' + chatId);
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
     * Get the key id length in bytes based on the protocol version
     *
     * @param {Number} protocolVersion
     *     The number of the strongvelope protocol version to get the length for
     * @returns {Number}
     *     The length of a key id for the given protocol version, in bytes
     */
    strongvelope._getKeyIdLength = function(protocolVersion) {

        return protocolVersion === PROTOCOL_VERSION_V1 ? _KEY_ID_SIZE_V1 : _KEY_ID_SIZE_V0;
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
        var part;
        var tlvType;
        var tlvVariable;
        var value;
        try {
            parsedContent.protocolVersion = binaryMessage.charCodeAt(0);
            var rest = binaryMessage.substring(1);
            if (parsedContent.protocolVersion > PROTOCOL_VERSION_V1) {
                rest = binaryMessage.substring(2);
                parsedContent[_TLV_MAPPING[TLV_TYPES.MESSAGE_TYPE]] = binaryMessage.charCodeAt(1);
            }
            while (rest.length > 0) {
                part = (parsedContent.protocolVersion > PROTOCOL_VERSION_V1) ?
                    tlvstore.splitSingleTlvElement(rest) : tlvstore.splitSingleTlvRecord(rest);
                if (part === false) {
                    logger.info(Chatd.dumpToHex(binaryMessage));
                    logger.critical('Could not parse the content, probably a broken binary.');
                    return false;
                }
                tlvType = part.record[0].charCodeAt(0);
                tlvVariable = _TLV_MAPPING[tlvType];
                value = part.record[1];

                if (typeof tlvVariable === 'undefined') {
                    logger.critical('Received unexpected TLV type: ' + tlvType + '.');

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

                        // The key length can change depending on the version
                        var keyIdLength = strongvelope._getKeyIdLength(parsedContent.protocolVersion);

                        while (keyIds.length > 0) {
                            parsedContent[tlvVariable].push(keyIds.substring(0, keyIdLength));
                            keyIds = keyIds.substring(keyIdLength);
                        }
                        break;
                    case TLV_TYPES.INVITOR:
                        parsedContent[tlvVariable] = base64urlencode(value);
                        break;
                    case TLV_TYPES.OPENMODE:
                        parsedContent[tlvVariable] = true;
                        break;
                    case TLV_TYPES.KEY_BLOB:
                        var pos = 0;
                        while (pos < value.length) {
                            var len =
                                    ns.unpack16le(value.substring(pos + USER_HANDLE_SIZE, pos + USER_HANDLE_SIZE + 2));
                            parsedContent[_TLV_MAPPING[TLV_TYPES.RECIPIENT]].push(
                                    base64urlencode(value.substring(pos, pos + USER_HANDLE_SIZE)));
                            parsedContent[_TLV_MAPPING[TLV_TYPES.KEYS]].push(
                                    value.substring(pos + USER_HANDLE_SIZE + 2, pos + USER_HANDLE_SIZE + 2 + len));
                            pos = pos + USER_HANDLE_SIZE + 2 + len;
                        }
                        break;
                    default:
                        // For all non-special cases, this will be used.
                        parsedContent[tlvVariable] = value;
                }

                rest = part.rest;
            }
        } catch (e) {
            logger.info(Chatd.dumpToHex(binaryMessage));
            logger.critical('Could not parse the content, probably a broken binary.');
            return false;
        }
        return parsedContent;
    };

    /**
     * Utility functions to pack a 16bit number in little endian.
     *
     * @method
     * @param x {Number}
     *     Number to pack
     * @returns {String}
     *     Byte array of the number packed in little endian.
     */
    strongvelope.pack16le = function(x) {
        var r = '';

        for (var i = 2; i--; ) {
            r += String.fromCharCode(x & 255);
            x >>>= 8;
        }

        return r;
    };

    /**
     * Utility functions to unpack a 16bit number in little endian.
     *
     * @method
     * @param x {String}
     *     Number to unpack
     * @returns {Number}
     *     16bit Number
     */
    strongvelope.unpack16le = function(x) {
        var r = 0;

        for (var i = 2; i--; ) {
            r = ((r << 8) >>> 0 )+x.charCodeAt(i);
        }

        return r;
    };

    /**
     * Utility functions to pack a 32bit number in little endian.
     *
     * @method
     * @param x {Number}
     *     Number to pack
     * @returns {String}
     *     Byte array of the number packed in little endian.
     */
    strongvelope.pack32le = function(x) {
        var r = '';

        for (var i = 4; i--;) {
            r += String.fromCharCode(x & 255);
            x >>>= 8;
        }

        return r;
    };

    /**
     * Utility functions to check the key id is a temporary key id.
     *
     * @method
     * @param x {Number}
     *     Number to pack
     * @returns {Boolen}
     *     true if the keyid is a temporary key id, false if it is not.
     */
    strongvelope.isTempKeyid = function(keyid) {

        return (((keyid & 0xffff0000) >>>0 ) === (0xffff0000 >>>0));
    };

    /**
     * Utility function to to generate a message id.
     *
     * @method
     * @returns {String}
     *     8 bytes of message id
     */
    strongvelope.generateMessageId = function() {

        var timestamp = Math.floor(new Date().getTime()/1000);
        var timestr = ns.pack32le(timestamp).substr(0, MESSAGE_IDENTITY_TIMESTAMP_SIZE);

        var randomnum = new Uint8Array(MESSAGE_IDENTITY_RANDOMNESS_SIZE);
        asmCrypto.getRandomValues(randomnum);

        return (timestr + asmCrypto.bytes_to_string(randomnum));
    };

    /**
     * Parse the decrypted payload.
     *
     * @method
     * @param {String} payload
     *     decrypted payload.
     * @param {String} version
     *     version number of the payload.
     * @returns {(Payload|Boolean)}
     *     The payload content on success, `false` in case of errors.
     */
    strongvelope._parsePayload = function(payload, version) {

        try {
            // Hopefully it will not need to change again.
            payload = (version <= PROTOCOL_VERSION_V2) ? from8(payload) : payload;
            if (payload.length < MESSAGE_IDENTITY_SIZE + MESSAGE_REFERENCE_SIZE) {
                return false;
            }

            var identity = payload.substr(0, MESSAGE_IDENTITY_SIZE);
            var refidlen = ns.unpack16le(payload.substr(MESSAGE_IDENTITY_SIZE, MESSAGE_REFERENCE_SIZE));
            var refidstr = payload.substr(MESSAGE_IDENTITY_SIZE + MESSAGE_REFERENCE_SIZE, refidlen);
            var refids = [];
            var pos = 0;
            while (pos < refidlen) {
                refids.push(refidstr.substr(pos, MESSAGE_IDENTITY_SIZE));
                pos += MESSAGE_IDENTITY_SIZE;
            }
            var plainmessage =  (version <= PROTOCOL_VERSION_V2)
                                ? payload.substr(MESSAGE_IDENTITY_SIZE + MESSAGE_REFERENCE_SIZE + refidlen)
                                : from8(payload.substr(MESSAGE_IDENTITY_SIZE + MESSAGE_REFERENCE_SIZE + refidlen));

            var result = {
                identity: identity,
                references: refids,
                plaintext: plainmessage
            };
            return result;
        }
        catch (e) {
            if (e instanceof URIError) {
                logger.critical('Could not decrypt message, probably a wrong key/nonce.');

                return false;
            }
            else {
                throw e;
            }
        }
    };

    /**
     * Unpack a key.
     * @method
     * @param packedKey {Binary}  encrypted key binary.
     *
     * @returns {Object}
     *        sender;
     *        key binary.
     */
    strongvelope.unpackKey = function(packedKey) {

        var sender = base64urlencode(packedKey.substring(0, USER_HANDLE_SIZE));
        var senderKey = packedKey.substring(USER_HANDLE_SIZE);

        var result =  {
            'sender' : sender,
            'senderKey' : senderKey
        };

        return result;
    };


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
     * @param {Number} [chatMode]
     * @param {bool|String} [chatUnifiedKey] pass true to generate a new key
     *
     * @property {String} ownHandle
     *     Our own user handle (u_handle).
     * @property {String} myPrivCu25519
     *     Our private chat key (Curve25519).
     * @property {String} myPrivEd25519
     *     Our private signing key (Ed25519).
     * @property {String} myPubEd25519
     *     Our public signing key (Ed25519).
     * @property {String} unifiedKey
     *     External encryption key.
     */
    strongvelope.ProtocolHandler = function(ownHandle, myPrivCu25519,
            myPrivEd25519, myPubEd25519, chatMode, chatUnifiedKey) {

        this.ownHandle = ownHandle || u_handle;
        this.myPrivCu25519 = myPrivCu25519 || u_privCu25519;
        this.myPrivEd25519 = myPrivEd25519 || u_privEd25519;
        this.myPubEd25519 = myPubEd25519;
        if (!this.myPubEd25519 && chatMode !== CHAT_MODE.PUBLIC) {
            this.myPubEd25519 = crypt.getPubKeyFromPrivKey(this.myPrivEd25519, 'Ed25519');
        }

        this.keyId = null;
        this.participantKeys = {};
        this.participantKeys[this.ownHandle] = {};
        this.otherParticipants = new Set();
        this.includeParticipants = new Set();
        this.excludeParticipants = new Set();
        this.participantChange = false;
        this.includeKey = false;
        this.counter = 0;

        if (chatMode === CHAT_MODE.PUBLIC) {
            this.keyRotation = false;
        }
        else {
            this.keyRotation = true;
        }

        this.unifiedKey = null;

        this.chatMode = CHAT_MODE.CLOSED;
        if (typeof chatMode !== 'undefined') {
            this.chatMode = chatMode;
        }

        if (this.chatMode === CHAT_MODE.PUBLIC && chatUnifiedKey === true) {
            this.updateSenderKey();
        }
        else if (chatUnifiedKey && chatUnifiedKey !== true) {
            var parsedKey = strongvelope.unpackKey(base64urldecode(chatUnifiedKey));
            if (parsedKey) {
                // at this point keys for the user sending the key should be preloaded by impl. code
                try {
                    var decryptedKeys = this._decryptKeysFrom(
                        parsedKey.senderKey,
                        parsedKey.sender
                    );


                    if (decryptedKeys) {
                        this.unifiedKey = decryptedKeys[0];
                    }
                    else {
                        logger.error("Could not get unified key. _decryptKeys.. returned nothing");
                    }
                } catch (e) {
                    logger.error("Could not get unified key: ", e);
                }
            }
            else {
                logger.error("Could not get unified key. unpackKey.. returned nothing");
            }
        }
    };


    /**
     * Parses a message and extracts the sender keys.
     *
     * @method
     * @param message {ChatdMessage}
     *     A message to extract keys from.
     * @return {MegaPromise}
     *     An MegaPromise that would be resolved with objects containing the parsed message and an object mapping a
     *     keyId to a key OR rejected with `false` on signature verification error.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._parseAndExtractKeys = function(message) {
        var self = this;

        var parsedMessage = ns._parseMessageContent(message.message);
        var result = { parsedMessage: parsedMessage, senderKeys: {}};

        if (this.chatMode === CHAT_MODE.PUBLIC) {
            return MegaPromise.resolve(result);
        }

        if (parsedMessage === false) {
            logger.error('Can not parse the message content.');
            return MegaPromise.reject(false);
        }
        else {
            if (
                parsedMessage.protocolVersion <= PROTOCOL_VERSION_V1 &&
                _KEYED_MESSAGES.indexOf(parsedMessage.type) >= 0
            ) {
                var verifyPromise = ns._verifyMessage(
                    parsedMessage.signedContent,
                    parsedMessage.signature,
                    pubEd25519[message.userId],
                    self.chatRoom.chatId
                );

                var proxyPromise = new MegaPromise();

                verifyPromise.always(function() {
                    var isOwnMessage = message.userId === self.ownHandle;
                    var myIndex = parsedMessage.recipients.indexOf(self.ownHandle);

                    // If we sent the message, pick first recipient for getting the
                    // sender key (e. g. for history loading).
                    var keyIndex = isOwnMessage ? 0 : myIndex;
                    var otherHandle =
                        (isOwnMessage && (parsedMessage.keys[keyIndex].length < strongvelope._RSA_ENCRYPTION_THRESHOLD))
                            ? parsedMessage.recipients[0]
                            : message.userId;

                    if (keyIndex >= 0) {
                        // Decrypt message key(s).
                        var encryptedKey =
                            (isOwnMessage &&
                            (parsedMessage.keys[keyIndex].length >= strongvelope._RSA_ENCRYPTION_THRESHOLD)) ?
                                parsedMessage.ownKey : parsedMessage.keys[keyIndex];


                        // For legacy RSA messages, we need the recipient's keys and since the integrating code is not
                        // parsing the actual strongvelope message's protocol, it can't know which keys are required,
                        // so we'd to directly call ChatdIntegration from here.
                        // Since RSA messages are kinda deprecated now, will leave this like this, but in the future
                        // we may want to remove this whole legacy decryption code.
                        // Note: For historical/debugging reasons, please use accounts and chats older then 2016.
                        crypt.getAllPubKeys(otherHandle).then(function() {
                            var decryptedKeys = self._legacyDecryptKeysFor(
                                encryptedKey,
                                parsedMessage.nonce,
                                otherHandle,
                                isOwnMessage
                            );

                            // Update local sender key cache.
                            if (!self.participantKeys[message.userId]) {
                                self.participantKeys[message.userId] = {};
                            }

                            for (var i = 0; i < decryptedKeys.length; i++) {
                                result.senderKeys[parsedMessage.keyIds[i]] = decryptedKeys[i];
                            }

                            proxyPromise.resolve(result);
                        }).catch(function(ex) {
                            console.error("_legacyDecryptKeysFor failed: ", ex);
                            proxyPromise.reject();
                        });
                    }
                })
                .fail(function(arg) {
                    if (arg !== 0xDEAD) {
                        logger.critical('Signature invalid for message from *** on ***');
                        logger.error('Signature invalid for message from '
                            + message.userId + ' on ' + message.ts);
                    }

                    // ignore marking this message as "unrerenderable"
                    // proxyPromise.reject(arg);
                });

                return proxyPromise;
            }

        }

        return MegaPromise.resolve(result);
    };


    /**
     * Parses a batch of messages and extracts sender keys into the cache of
     * the handler.
     *
     * @method
     * @param messages {Array.<ChatdMessage>}
     *     Array of (most recent) batch of chat message history.
     * @return {MegaPromise}
     *     Resolved with: An array of all the parsed messages' content.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._batchParseAndExtractKeys = function(messages) {
        var parsedMessages = [];

        var self = this;

        var proxyPromises = [];

        // Iterate over all messages to extract keys (if present).
        // TOGO: make sure the messages are ordered from latest to oldest.
        messages.forEach(function(message, i) {
            // if the message is from chat API.
            if (messages[i].userId !== COMMANDER) {
                var proxyPromise = new MegaPromise();

                self._parseAndExtractKeys(message)
                    .done(function(extracted) {
                        var senderKeys;
                        var storedKey;
                        var parsedMessage = extracted.parsedMessage;

                        senderKeys = extracted.senderKeys;
                        Object.keys(senderKeys).forEach(function(keyId) {
                            if (self.participantKeys[message.userId]) {
                                storedKey = self.participantKeys[message.userId][keyId];
                                if (storedKey && storedKey !== senderKeys[keyId]) {
                                    // Bail out on inconsistent information.
                                    logger.critical("Mismatching statement on sender's previously sent key.");

                                    proxyPromise.reject();
                                    return false;
                                }
                            }
                            else {
                                self.participantKeys[message.userId] = {};
                            }
                            self.participantKeys[message.userId][keyId] = senderKeys[keyId];
                        });

                        parsedMessages.push(parsedMessage);
                        proxyPromise.resolve(parsedMessage);
                    })
                    .fail(function() {
                        proxyPromise.reject();
                    });

                proxyPromises.push(proxyPromise);
            }
        });

        var returnedPromise = new MegaPromise();

        MegaPromise.allDone(proxyPromises)
            .always(function() {
                returnedPromise.resolve(parsedMessages);
            });


        return returnedPromise;
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
     * @return {MegaPromise}
     *     To be used for identifying when the .seed had finished.
     */
    strongvelope.ProtocolHandler.prototype.seed = function(messages) {
        // This is only needed for legacy messages.
        return this._batchParseAndExtractKeys(messages);
    };

    /**
     * Refreshes our own sender key. This method is also to be used to
     * initialise a new ProtocolHandler for a new chat session that is *not*
     * primed via historic messages.
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.updateSenderKey = function(force) {

        this.counter = (this.counter + 1) & 0xffff;
        // Now the new sender key.

        var secretKey = new Uint8Array(SECRET_KEY_SIZE);
        asmCrypto.getRandomValues(secretKey);
        var newKey = asmCrypto.bytes_to_string(secretKey);

        if (this.chatMode === CHAT_MODE.PUBLIC && !force) {
            if (!this.unifiedKey) {
                this.getUnifiedKey();
            }
            if (!this.unifiedKey) {
                this.unifiedKey = newKey;
            }
            else {
                newKey = this.unifiedKey;
            }
        }

        var result = {
            keyId: ns._encodeKeyId(this.counter),
            senderKey: newKey
        };
        return result;
    };

    /**
     * Derives a symmetric key for encrypting a message to a contact.  It is
     * derived using a Curve25519 key agreement.
     *
     * Note: The Curve25519 key cache must already contain the public key of
     *       the recipient.
     *
     * @method
     * @throws Error
     * @param userhandle {String}
     *     Mega user handle for user to send to or receive from.
     * @return {String}
     *     Binary string containing a 256 bit symmetric encryption key.
     * @private
     */
    strongvelope.ProtocolHandler.prototype._computeSymmetricKey = function(userhandle) {

        var pubKey = pubCu25519[userhandle];
        if (!pubKey) {
            logger.critical('No cached chat key for user!');
            logger.error('No cached chat key for user: ' + userhandle);
            throw new Error('No cached chat key for user!');
        }

        if (!DERIVED_SHARED_KEYS[userhandle]) {
            var sharedSecret = nacl.scalarMult(
                    asmCrypto.string_to_bytes(this.myPrivCu25519),
                    asmCrypto.string_to_bytes(pubKey)
                );
            DERIVED_SHARED_KEYS[userhandle] = strongvelope.deriveSharedKey(sharedSecret);
        }

        return DERIVED_SHARED_KEYS[userhandle];
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
     * @param {String} destination
     *     User handle of the recipient.
     * @returns {String}
     *     Encrypted sender keys.
     */
    strongvelope.ProtocolHandler.prototype._encryptKeysTo = function(keys, destination) {

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
        var keyBytes = asmCrypto.string_to_bytes(
            this._computeSymmetricKey(destination).substring(0, KEY_SIZE));
        var cipherBytes = asmCrypto.AES_ECB.encrypt(clearBytes, keyBytes,
                                                    false);

        var result = asmCrypto.bytes_to_string(cipherBytes);
        return result;
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
    strongvelope.ProtocolHandler.prototype._legacyDecryptKeysFor = function(
            encryptedKeys, nonce, otherParty, iAmSender) {

        var clear = '';

        // Check if sender key is encrypted using RSA.
        if (encryptedKeys.length < strongvelope._RSA_ENCRYPTION_THRESHOLD) {
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
     * Decrypts symmetric encryption keys for a particular sender.
     *
     * Note: This function requires the Cu25519 public key for the destination
     *       to be loaded already.
     *
     * @method
     * @throws Error
     * @param {String} encryptedKeys
     *     Encrypted Key(s).
     * @param {String} otherParty
     *     User handle of the other party.
     * @returns {Array.<String>}
     *     All symmetric keys in an array.
     */
    strongvelope.ProtocolHandler.prototype._decryptKeysFrom = function(
            encryptedKeys, otherParty) {

        var clear = '';

        // Check if sender key is encrypted using RSA.
        if (encryptedKeys.length < strongvelope._RSA_ENCRYPTION_THRESHOLD) {
            // Using normal chat keys.
            var cipherBytes = asmCrypto.string_to_bytes(encryptedKeys);
            var keyBytes = asmCrypto.string_to_bytes(
                this._computeSymmetricKey(otherParty).substring(0, KEY_SIZE));
            var clearBytes = asmCrypto.AES_ECB.decrypt(cipherBytes, keyBytes,
                                                       false);
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
     * Assembles the message body to the recipients of the (group) chat.
     * This function also rotates or re-sends the sender key if required.
     * IMPORTANT: If a sender key rotation or reminder is required, then
     * the body returned will NOT include the message payload, and this method
     * should be called a second time.
     *
     * @method
     * @private
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {MESSAGE_TYPES} type
     *     The type of the message.
     * @param {String} senderKey
     *     The encryption key of the message.
     * @param {Set} trackedParticipants
     *     The set of the recipients to receive the message.
     * @param {Array} refs
     *     Array of backward reference ids to guarantee the message order is not tempered.
     * @param {Binary} messageIdentity
     *     Identity of the message which is used to define a unique message.
     * @param {Boolean} [withKeyIncluded]
     *     An indication flag to include the keys into the cipher message body or not.
     *     If withKeyIncluded is true, it will include the keys into the cipher message body.
     * @param {Boolean} [withSelfIncluded]
     *     An indication flag to include the sender himself for the encryption.
     * @returns {{ keyed: Boolean, content: String, ownKey: String }}
     *     Outgoing message content encoded in TLV records, and a flag
     *     indicating whether the message is keyed.
     */
    strongvelope.ProtocolHandler.prototype._assembleBody = function(message,
                                                                    type,
                                                                    senderKey,
                                                                    trackedParticipants,
                                                                    refs,
                                                                    messageIdentity,
                                                                    withKeyIncluded,
                                                                    withSelfIncluded,
                                                                    openMode) {

        withKeyIncluded = (typeof withKeyIncluded === 'undefined') ? false : withKeyIncluded;
        withSelfIncluded = (typeof withSelfIncluded === 'undefined') ? false : withSelfIncluded;
        var content = "";
        var refids = "";

        for (var i = 0; i < refs.length;i++) {
            refids += refs[i];
        }

        var encryptedMessage = ns._symmetricEncryptMessage(
                               messageIdentity + ns.pack16le(refids.length) + refids + to8(message),
                               senderKey);
        // Assemble message content.
        if ((encryptedMessage.nonce !== null) && (encryptedMessage.nonce.length > 0)) {
            content += tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.NONCE),
                                               encryptedMessage.nonce);
        }
        // Only include ciphertext if it's not empty (non-blind message).
        if ((encryptedMessage.ciphertext !== null) && (encryptedMessage.ciphertext.length > 0)) {
            content += tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.PAYLOAD),
                                             encryptedMessage.ciphertext);
        }
        if (withKeyIncluded) {
            content += tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.KEY_BLOB),
                                             this.getKeyBlob(senderKey, trackedParticipants));
        }
        content += tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.INVITOR),
            base64urldecode(this.ownHandle));

        if (openMode) {
            content += tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.OPENMODE), "");
        }

        // Sign message.
        content = this._signContent(
            String.fromCharCode(PROTOCOL_VERSION) +
            String.fromCharCode(type) +
            senderKey +
            content) + content;

        // Return assembled total message.
        content = String.fromCharCode(PROTOCOL_VERSION) + String.fromCharCode(type) + content;
        return content;
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
        var signatureRecord = tlvstore.toTlvElement(String.fromCharCode(TLV_TYPES.SIGNATURE),
                                                   signature);

        return signatureRecord;
    };

    /**
     * Encrypts a message to the recipients of the (group) chat with keys embedded inside the encrypted message body.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {MESSAGE_TYPES} type
     *     The type of the message.
     * @param {Array} participants
     *     Array of participants to encrypt the message to.
     * @param {Boolean} forceUpdate
     *     Flag to indicate whether it needs to force a key update.
     * @returns {String|Boolean}
     *     Encrypted outgoing message or `false` if something fails.
     */
    strongvelope.ProtocolHandler.prototype.embeddedEncryptTo = function(
        message,
        type,
        participants,
        forceUpdate,
        openMode
    ) {
        // this is a fixed id.
        var newSenderKey = this.updateSenderKey(forceUpdate);

        var assembledMessage = null;
        var messageIdentity = ns.generateMessageId();
        assembledMessage = this._assembleBody(
            message,
            type,
            newSenderKey.senderKey,
            participants,
            [],
            messageIdentity,
            openMode ? false : true,
            openMode ? false : true,
            openMode
        );

        return assembledMessage;
    };

    /**
     * Generate a new encryption key.
     * @param {Array} refs
     *     Array of backward reference ids to guarantee the message order is not tempered.
     * @returns {Array|Boolean}
     *     Encrypted outgoing key message array or `false` if something fails.
     */
    strongvelope.ProtocolHandler.prototype.refreshKey = function(refs) {
        var encryptedMessages = new Array();
        // Assemble main message body.
        var trackedParticipants = new Set(this.otherParticipants);
        trackedParticipants.add(this.ownHandle);
        var newSenderKey = this.updateSenderKey();
        this.keyId = newSenderKey.keyId;
        this.participantKeys[this.ownHandle][this.keyId] = newSenderKey.senderKey;

        encryptedMessages.push({"type": MESSAGE_TYPES.GROUP_KEYED,
                                "message": this.getKeyBlob(
                                                          this.participantKeys[this.ownHandle][this.keyId],
                                                          trackedParticipants)
                              });
        return encryptedMessages;
    };

    /**
     * Encrypts a message to the recipients of the (group) chat.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {Array} refs
     *     Array of backward reference ids to guarantee the message order is not tempered.
     * @param {Boolean} [withKeyIncluded]
     *     An indication flag to include the keys into the cipher message body or not.
     *     If withKeyIncluded is true, it will include the keys into the cipher message body.
     * @returns {Array|Boolean}
     *     Encrypted outgoing message array or `false` if something fails.
     *     If we need to send out a keyed message, then two messages will be returned in the array.
     */
    strongvelope.ProtocolHandler.prototype.encryptTo = function(message, refs) {
        var encryptedMessages = new Array();
        // Assemble main message body.
        var trackedParticipants = new Set(this.otherParticipants);
        trackedParticipants.add(this.ownHandle);
        var senderKey;
        if (this.chatMode !== CHAT_MODE.PUBLIC) {
            // if the key is rotated , generate a new key and send it out.
            if ((this.keyId === null) ||
                (this.participantChange === true)) {

                var newSenderKey = this.updateSenderKey();
                this.keyId = newSenderKey.keyId;
                this.participantKeys[this.ownHandle][this.keyId] = newSenderKey.senderKey;

                encryptedMessages.push({
                    "type": MESSAGE_TYPES.GROUP_KEYED,
                    "message": this.getKeyBlob(
                        this.participantKeys[this.ownHandle][this.keyId],
                        trackedParticipants)
                });
                this.includeParticipants.clear();
                this.excludeParticipants.clear();
                this.participantChange = false;
            }
            // if the key is still pending, it is possible that the key did not deliver to chatd yet, so include the key.
            else if (this.includeKey && ns.isTempKeyid(this.getKeyId())) {
                encryptedMessages.push({
                    "type": MESSAGE_TYPES.GROUP_KEYED,
                    "message": this.getKeyBlob(
                        this.participantKeys[this.ownHandle][this.keyId],
                        trackedParticipants)
                });
                this.includeKey = false;
            }
            if (!this.participantKeys[this.ownHandle][this.keyId]) {
                throw new Error('No cached chat key for user!');
            }

            senderKey = this.participantKeys[this.ownHandle][this.keyId];
        }
        else {
            assert(this.unifiedKey, 'public chat with missing unified key found');

            senderKey = this.unifiedKey;
        }
        var assembledMessage = null;
        var messageIdentity = ns.generateMessageId();



        assembledMessage = this._assembleBody(message,
                                              MESSAGE_TYPES.GROUP_FOLLOWUP,
                                              senderKey,
                                              trackedParticipants,
                                              refs,
                                              messageIdentity);

        encryptedMessages.push(
            {"type": MESSAGE_TYPES.GROUP_FOLLOWUP, "message": assembledMessage, "identity": messageIdentity});

        return encryptedMessages;
    };

    /**
     * Encrypts a message with an old message's key to support message editing.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt. If `null` or `undefined`, no message payload
     *     will be encoded (i. e. it's a "blind" management message).
     * @param {Number} keyId
     *     keyId of the encryption key
     * @param {Array} references
     *     list of reference message identities.
     * @param {String} messageIdentity
     *     the identity of the original message.
     * @returns {String}
     *     Encrypted outgoing message.
     */
    strongvelope.ProtocolHandler.prototype.encryptWithKeyId = function(message, keyId, references, messageIdentity) {
        var senderKey;
        if (this.chatMode === CHAT_MODE.PUBLIC) {
            senderKey = this.unifiedKey;
        }
        else {
            var keyIdStr = a32_to_str([keyId]);
            if (!this.participantKeys[this.ownHandle][keyIdStr]) {
                throw new Error('No cached chat key for user!');
            }
            senderKey = this.participantKeys[this.ownHandle][keyIdStr];
        }

        var assembledMessage = null;
        // Assemble main message body.
        var trackedParticipants = new Set(this.otherParticipants);
        trackedParticipants.add(this.ownHandle);



        assembledMessage = this._assembleBody(message,
                                              MESSAGE_TYPES.GROUP_FOLLOWUP,
                                              senderKey,
                                              trackedParticipants,
                                              references,
                                              messageIdentity);

        return assembledMessage;
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
                logger.critical("Mismatching statement on sender's previously sent key.");

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
                logger.critical('Encryption key for message from *** with ID *** unavailable.');
                logger.error('Encryption key for message from ' + sender
                             + ' with ID ' + base64urlencode(keyId) + ' unavailable.');

                return false;
            }
        }

        return senderKey;
    };

    /**
     * handle the management message from chat API.
     *
     * @method
     * message {ChatdMessage}
     *     A management message from chat API.
     * @returns {MegaPromise}
     *     On success - (StrongvelopeMessage|Boolean), e.g. the message content, `false` in case of errors.
     */
    strongvelope.ProtocolHandler.prototype.handleManagementMessage = function(message, historicMessage) {
        historicMessage = (typeof historicMessage === 'undefined') ? false : historicMessage;
        var parsedMessage = ns._parseMessageContent(message.message);

        var self = this;
        var result = false;
        if (parsedMessage) {
            switch (parsedMessage.type) {
                case MESSAGE_TYPES.ALTER_PARTICIPANTS:
                case MESSAGE_TYPES.TRUNCATE:
                case MESSAGE_TYPES.PRIVILEGE_CHANGE:
                case MESSAGE_TYPES.PUBLIC_HANDLE_CREATE:
                case MESSAGE_TYPES.PUBLIC_HANDLE_DELETE:
                case MESSAGE_TYPES.OPEN_MODE_CLOSED:

                    // Sanity checks.
                    if (setutils.intersection(new Set(parsedMessage.includeParticipants),
                            new Set(parsedMessage.excludeParticipants)).size > 0) {
                        // There should be not intersection between includeParticipants and excludeParticipants.

                        return false;
                    }
                    result = {
                        sender: parsedMessage.invitor,
                        type: parsedMessage.type,
                        recipients: parsedMessage.recipients,
                        privilege: parsedMessage.privilege,
                        includeParticipants: parsedMessage.includeParticipants,
                        excludeParticipants: parsedMessage.excludeParticipants
                    };
                    if (historicMessage === true) {
                        return MegaPromise.resolve(result);
                    }
                    // Do group participant update.
                    parsedMessage.includeParticipants.forEach(function (item) {
                        self.addParticipant(item);
                    });
                    parsedMessage.excludeParticipants.forEach(function (item) {
                        self.removeParticipant(item);
                    });
                    return MegaPromise.resolve(result);

                case MESSAGE_TYPES.TOPIC_CHANGE:
                    var proxyPromise = new MegaPromise();
                    var decryptPromise = this.decryptMessage(parsedMessage, parsedMessage.invitor, null);
                    decryptPromise.fail(function (arg) {
                        proxyPromise.reject(arg);
                    });
                    decryptPromise.done(function (cleartext) {
                        if (cleartext === false) {
                            proxyPromise.reject(false);
                            return false;
                        }
                        var payload = cleartext.length > 0 ? ns._parsePayload(cleartext, parsedMessage.protocolVersion) : '';
                        // Bail out if payload can not be parsed.
                        if (payload === false) {
                            proxyPromise.reject(false);
                            return false;
                        }
                        result = {
                            sender: parsedMessage.invitor,
                            type: parsedMessage.type,
                            payload: payload.plaintext
                        };
                        proxyPromise.resolve(result);
                    });
                    return proxyPromise;
                case MESSAGE_TYPES.CALL_STARTED:
                    return MegaPromise.resolve({
                        sender: parsedMessage.invitor,
                        type: parsedMessage.type
                    });

                case MESSAGE_TYPES.CALL_END:
                    var proxyPromise = new MegaPromise();
                    var callId = base64urlencode(parsedMessage.payload.substr(0, 8));
                    var reason = parsedMessage.payload.substr(8, 1).charCodeAt(0);
                    var duration = Chatd.unpack32le(parsedMessage.payload.substr(9, 4));

                    var participants = parsedMessage.includeParticipants;

                    result = {
                        sender: parsedMessage.invitor,
                        type: parsedMessage.type,
                        callId: callId,
                        reason: reason,
                        duration: duration,
                        participants: participants
                    };


                    proxyPromise.resolve(result);
                    return proxyPromise;

                default:
                    logger.critical('Invalid management message.');
                    break;
            }
        }
        return MegaPromise.reject(false);
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
     * @returns {MegaPromise}
     *     The MegaPromise that would be resolved with (StrongvelopeMessage|Boolean), e.g. message content on success,
     *     and will fail with `false` in case of errors.
     */
    strongvelope.ProtocolHandler.prototype.legacyDecryptFrom = function(message,
            sender, historicMessage) { // jshint maxcomplexity: 11

        var self = this;

        // if the message is from chat API
        if (sender === COMMANDER) {
            return this.handleManagementMessage({ userId: sender, message: message}, historicMessage);
        }

        var proxyPromise = new MegaPromise();

        // Extract keys, and parse message in the same go.
        var extractContentPromise = this._parseAndExtractKeys({ userId: sender, message: message});
        extractContentPromise.fail(function() {
            logger.critical('Message signature invalid.');
        });

        extractContentPromise.done(function(extractedContent) {
            var parsedMessage = extractedContent.parsedMessage;
            var senderKeys = extractedContent.senderKeys;

            // Bail out on parse error.
            if (parsedMessage === false) {
                logger.critical('Incoming message not usable.');

                proxyPromise.reject(false);
                return false;
            }

            // Verify protocol version.
            if (parsedMessage.protocolVersion > PROTOCOL_VERSION) {
                logger.critical('Message not compatible with current protocol version.');

                proxyPromise.reject(false);
                return false;
            }

            // Get sender key.
            var senderKey = self._getSenderKeyAndUpdateCache(sender, parsedMessage,
                senderKeys);

            // Am I part of this chat?
            // TODO: In future it should update participants based on chatd server's
            // requests rather than incoming messages.
            if (parsedMessage.excludeParticipants.indexOf(self.ownHandle) >= 0) {
                logger.info('I have been excluded from this chat, cannot read message.');
                self.keyId = null;
                self.otherParticipants.clear();
                self.includeParticipants.clear();
                self.excludeParticipants.clear();
            }
            else if (
                parsedMessage.recipients.length > 0 &&
                parsedMessage.recipients.indexOf(self.ownHandle) === -1
            ) {
                logger.info('I am not participating in this chat, cannot read message.');
            }

            if (!senderKey && senderKey !== 0) {
                proxyPromise.reject(false);
                return false;
            }

            // Decrypt message payload.
            try {
                var cleartext = ns._symmetricDecryptMessage(parsedMessage.payload, senderKey, parsedMessage.nonce);

                // Bail out if decryption failed.
                if (cleartext === false) {
                    proxyPromise.reject(false);
                    return false;
                }
                cleartext = from8(cleartext);

                var result = {
                    version: parsedMessage.protocolVersion,
                    sender: sender,
                    type: parsedMessage.type,
                    payload: cleartext,
                    includeParticipants: [],
                    excludeParticipants: []
                };

                proxyPromise.resolve(result);
            }
            catch (e) {
                if (e instanceof URIError) {
                    logger.critical('Could not decrypt message, probably a wrong key/nonce.');
                    proxyPromise.reject(e);
                }
                else {
                    onIdle(function() {
                        throw e;
                    });
                    proxyPromise.reject(e);
                }
            }
        });

        return proxyPromise;
    };

    strongvelope.ProtocolHandler.prototype.decryptMessage = function(parsedMessage,
            sender, keyId) {
        var self = this;
        var senderKey = !keyId && !parsedMessage.keys && self.unifiedKey ? self.unifiedKey : null;

        // if the message includes keys.
        if (!senderKey && parsedMessage.openMode && this.unifiedKey) {
            senderKey = this.unifiedKey;
        }
        else if (!senderKey) {
            if (parsedMessage.keys.length > 0) {
                var isOwnKey = (sender === this.ownHandle);
                var myIndex = parsedMessage.recipients.indexOf(this.ownHandle);
                // If we sent the message, pick first recipient for getting the
                // sender key (e. g. for history loading).
                if (myIndex >= 0) {
                    if (parsedMessage.keys && parsedMessage.keys.length === parsedMessage.recipients.length) {
                        // Decrypt message key(s).
                        var encryptedKey = parsedMessage.keys[myIndex];

                        var decryptedKeys = this._decryptKeysFrom(encryptedKey,
                                                                  sender,
                                                                  isOwnKey);
                        if (decryptedKeys) {
                            senderKey = decryptedKeys[0];

                            if (self.chatMode === CHAT_MODE.PUBLIC) {
                                self.unifiedKey = senderKey;
                            }
                        }
                    }
                }
            }
            else {
                if (keyId === 0) {
                    senderKey = self.unifiedKey;
                }
                else {
                    var keyidStr = a32_to_str([keyId]);
                    if (!this.participantKeys[sender]) {
                        logger.critical('Message does not have a sender key for :' + sender);
                        return MegaPromise.reject(false);
                    }
                    senderKey = this.participantKeys[sender][keyidStr];
                }

                if (!senderKey) {
                    logger.critical('Message does not have a sender key for :' + sender + ' with key ID:' + keyId);
                    return MegaPromise.reject(false);
                }
            }
        }

        if (parsedMessage) {
            var proxyPromise = new MegaPromise();

            var verifyPromise = self.chatMode === CHAT_MODE.PUBLIC ? MegaPromise.resolve(true) : ns._verifyMessage(
                String.fromCharCode(parsedMessage.protocolVersion) +
                    String.fromCharCode(parsedMessage.type) + senderKey + parsedMessage.signedContent,
                parsedMessage.signature,
                pubEd25519[sender],
                this.chatRoom.chatId
            );

            verifyPromise.fail(function(arg) {
                if (arg !== 0xDEAD) {
                    logger.critical('Signature invalid for message from *** on ***');
                    logger.error('Signature invalid for message from ' + sender + ', chatId:' + self.chatRoom.chatId);
                }
            });

            verifyPromise.always(function(arg) {
                if (!arg) {
                    // signature verification failed.
                    logger.error('Signature invalid for message from ' + sender, 'chatId:', self.chatRoom.chatId);
                }

                try {
                    // Decrypt message payload.
                    var cleartext = ns._symmetricDecryptMessage(parsedMessage.payload, senderKey, parsedMessage.nonce);

                    // Bail out if decryption failed.
                    if (cleartext === false) {
                        throw new Error('Invalid parameters passed to symmetricDecryptMessage');
                    }
                    proxyPromise.resolve(cleartext);
                }
                catch (ex) {
                    logger.warn("Decryption failed [1]: ", sender, keyId, ex);
                    proxyPromise.reject(false);
                }
            });
            return proxyPromise;
        }
        else {
            logger.warn("Decryption failed [2]: ", sender, keyId);
            return MegaPromise.reject(false);
        }
    };

    /**
     * Decrypts a message from a sender and (potentially) updates sender keys.
     *
     * @method
     * @param {String} message
     *     Data message to encrypt.
     * @param {String} sender
     *     User handle of the message sender.
     * @param {String} keyId
     *     The encryption key id of the message, and if it is null, it will seed the keys from the message itself.
     * @param {Boolean} [historicMessage=false]
     *     Whether the message passed in for decryption is from the history.
     * @returns {MegaPromise}
     *     On success - The message content (StrongvelopeMessage|Boolean) or `false` in case of errors/failure.
     */
    strongvelope.ProtocolHandler.prototype.decryptFrom = function(message,
            sender, keyId, historicMessage) { // jshint maxcomplexity: 11
        var protocolVersion = message.charCodeAt(0);
        if (protocolVersion <= PROTOCOL_VERSION_V1) {
            return this.legacyDecryptFrom(message, sender, historicMessage);
        }

        var parsedMessage = ns._parseMessageContent(message);
        // Bail out on parse error.
        if (parsedMessage === false) {
            logger.critical('Incoming message not usable.');

            return MegaPromise.reject(false);
        }
        // Verify protocol version.
        if (parsedMessage.protocolVersion > PROTOCOL_VERSION) {
            logger.critical('Message not compatible with current protocol version.');

            return MegaPromise.reject(false);
        }
        sender = sender ? sender : parsedMessage.invitor;

        // if the message is from chat API
        if (sender === COMMANDER) {
            return this.handleManagementMessage({ userId: sender, message: message}, historicMessage);
        }

        var proxyPromise = new MegaPromise();

        var decryptPromise = this.decryptMessage(parsedMessage, sender, keyId);
        decryptPromise.fail(function(arg) {
            proxyPromise.reject(arg);
        });
        decryptPromise.done(function(cleartext) {
            if (cleartext === false) {
                proxyPromise.reject(false);
                return;
            }
            var payload = ns._parsePayload(cleartext, parsedMessage.protocolVersion);
            // Bail out if payload can not be parsed.
            if (payload === false) {
                proxyPromise.reject(false);
                return;
            }

            var result = {
                version: parsedMessage.protocolVersion,
                sender: sender,
                type: parsedMessage.type,
                identity: payload.identity,
                references: payload.references,
                payload: payload.plaintext,
                includeParticipants: [],
                excludeParticipants: []
            };
            proxyPromise.resolve(result);
        });

        return proxyPromise;
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

        var self = this;

        // Now attempt to decrypt all messages.
        var decryptedMessages = {};
        var waitingPromises = [];

        var message;
        messages.forEach(function(message, i) {
            message = messages[i];
            var decryptPromise =  self.decryptFrom(
                message.message,
                message.userId,
                message.keyid,
                historicMessages
            );

            decryptPromise.done(function(msg) {
                decryptedMessages[i] = msg;
            });
            waitingPromises.push(decryptPromise);
        });

        var proxyPromise = new MegaPromise();
        MegaPromise.allDone(waitingPromises)
            .always(function() {
                // ensure the order of the returned messages is the same as in `messages`
                var result = [];
                for (var i = 0; i < messages.length; i++) {
                    result.push(decryptedMessages[i]);
                }

                proxyPromise.resolve(result);
            });

        return proxyPromise;
    };

    /**
     * Add a participant to current group participants.
     *
     * @method
     * @param participant {String}
     *     participant's user handle.
     */
    strongvelope.ProtocolHandler.prototype.addParticipant = function(participant) {

        if (participant !== this.ownHandle) {
            if (!this.otherParticipants.has(participant)) {
                this.otherParticipants.add(participant);
                this.participantChange = true;
            }
        }
    };

    /**
     * Remove a participant from current group participants.
     *
     * @method
     * @param participant {String}
     *     participant's user handle.
     */
    strongvelope.ProtocolHandler.prototype.removeParticipant = function(participant) {

        // remove myself from the groupchat.
        if (participant === this.ownHandle) {
            // clean up
            this.keyId = null;
            this.otherParticipants.clear();
            this.includeParticipants.clear();
            this.excludeParticipants.clear();
        }
        else {
            if (this.otherParticipants.has(participant)) {
                this.otherParticipants.delete(participant);
                this.participantChange = true;
            }
        }
    };

    /**
     * Get the current keyId.
     *
     * @method
     * @returns {Number}
     *     Current key Id.
     */
    strongvelope.ProtocolHandler.prototype.getKeyId = function() {
        return str_to_a32(this.chatMode === CHAT_MODE.PUBLIC ? 0 : this.keyId)[0];
    };

    /**
     * Get the assembled key blob.
     *
     * @method
     * @returns {String}
     *     Byte array of the key blob.
     */
    strongvelope.ProtocolHandler.prototype.getKeyBlob = function(senderKey, trackedParticipants) {
        var self = this;

        if (!senderKey) {
            return false;
        }

        if (trackedParticipants === false) {
            // Sanity check, if the other participants had an inconsistency
            return false;
        }

        var keys = '';
        // Assemble the output for all recipients.
        var keysIncluded = [];
        var encryptedKeys = '';
        var keyEncryptionError = false;
        trackedParticipants.forEach(function _memberIterator(destination) {

            keysIncluded = [senderKey];

            encryptedKeys = self._encryptKeysTo(keysIncluded, destination);

            if (encryptedKeys === false) {
                // Something went wrong, and we can't encrypt to that destination.
                keyEncryptionError = true;
            }

            keys += (base64urldecode(destination) + ns.pack16le(encryptedKeys.length) + encryptedKeys);
        });
        if (keyEncryptionError === true) {
            return false;
        }
        return keys;
    };

    /**
     * Pack a key for a given user.
     * @method
     * @param senderKey {Binary}  encryption key to pack
     * @param destination {String}  user handle
     *
     * @returns {String}
     *        packed key binary.
     */
    strongvelope.ProtocolHandler.prototype.packKeyTo = function(senderKey, destination) {
        var self = this;
        var packedKey = '';
        var encryptedKey = self._encryptKeysTo([senderKey], destination);

        if (encryptedKey === false) {
            // Something went wrong, and we can't encrypt to that destination.
            return false;
        }

        packedKey += (base64urldecode(u_handle) + encryptedKey);
        return packedKey;
    };

    /**
     * Set participant change to be ture, so it will rotate the key next time it tries to send out a message.
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.setParticipantChange = function() {
        this.participantChange = true;
    };

    /**
     * Set key Id to be null, so it will rotate the key next time it tries to send out a message.
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.clearKeyId = function() {
        this.keyId = null;
    };

    /**
     * Set the assigned key Id from chatd based on the temporary key Id.
     *
     * @method
     * @param keyxId {Number}
     *     Temporary key Id.
     * @param keyId {Number}
     *     Assigned key Id by chatd.
     * Note: After it sets the new key Id, it still keeps the old key Id and its keys, the reason is that,
     *       there is a possibility that message edit happens after key is confirmed but before message is confirmed,
     *       then it will still need the old temporary key Ids.
     *       It should be fine as it can tolerate up to 2^16 temporary key Ids.
     */
    strongvelope.ProtocolHandler.prototype.setKeyID = function(keyxId, keyId) {
        var tempkeyid = a32_to_str([keyxId]);
        var newkeyid = a32_to_str([keyId]);

        if (!this.participantKeys[this.ownHandle][tempkeyid]) {
            throw new Error('No cached chat key for given key id!');
        }
        this.participantKeys[this.ownHandle][newkeyid] = this.participantKeys[this.ownHandle][tempkeyid];
        this.keyId = newkeyid;
    };

    /**
     * Seed the keys from chatd so it can be used for history message decryption.
     *
     * @method
     * @param keys {Array}
     *     Key arrary from chatd.
     * @returns {Boolean}
     *     Always True even if there was an error when seeding some/all of the keys
     */
    strongvelope.ProtocolHandler.prototype.seedKeys = function(keys) {
        for (var i = 0; i < keys.length; i++) {

            var keyidStr = a32_to_str([keys[i].keyid]);
            var key = keys[i].key;
            var isOwnKey = (keys[i].userId === this.ownHandle);

            tryCatch(function(key, i, isOwnKey, keyidStr) {
                var decryptedKeys = this._decryptKeysFrom(
                    key,
                    keys[i].userId,
                    isOwnKey
                );
                if (!this.participantKeys[keys[i].userId]) {
                    this.participantKeys[keys[i].userId] = {};
                }
                this.participantKeys[keys[i].userId][keyidStr] = decryptedKeys[0];

            }.bind(this), function(e) {
                console.error('_decryptKeysFrom thrown an error:', e);
            })(key, i, isOwnKey, keyidStr);
        }
        return true;
    };

    /**
     * Restore the keys from local cache.
     *
     * @method
     * @param keyxid {Number}
     *     Temp key id.
     * @param keys {Array}
     *     Key arrary from chatd.
     */
    strongvelope.ProtocolHandler.prototype.restoreKeys = function(keyxid, keys) {

        this.seedKeys(keys);
        var keyCount = keyxid & 0x00ff;
        if (keyCount > this.counter) {
            this.counter = keyCount;
        }
    };

    /**
     * Set the flag of include key
     *
     * @method
     * @param include {Boolen}
     *     flag to include the key.
     */
    strongvelope.ProtocolHandler.prototype.setIncludeKey = function(include) {

        this.includeKey = include;
    };

    /**
     * Return the unified key of the chat.
     *
     * @method
     * @return a base64 encoded string {String}
     */
    strongvelope.ProtocolHandler.prototype.getUnifiedKey = function() {
        var self = this;
        if (!self.unifiedKey) {
            var pKeys = Object.keys(self.participantKeys);
            if (pKeys.length === 0) {
                return null;
            }
            var keys = Object.keys(self.participantKeys[pKeys[0]]);
            if (keys.length === 0) {
                return null;
            }
            self.unifiedKey = self.participantKeys[pKeys[0]][keys[0]];
        }

        return self.unifiedKey ? base64urlencode(self.unifiedKey) : null;
    };
    /**
     * switch off open mode.
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.switchOffOpenMode = function() {
        var self = this;
        self.unifiedKey = null;
        self.chatMode = CHAT_MODE.CLOSED;
        self.keyRotation = true;
    };
    /**
     * Enable key rotation
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.enableKeyRotation = function() {

        this.keyRotation = true;
    };

    /**
     * Disable key rotation
     *
     * @method
     */
    strongvelope.ProtocolHandler.prototype.disableKeyRotation = function() {

        this.keyRotation = false;
    };

    /**
     * Get the tracked participants including its own handle.
     *
     * @method
     * @returns {Set}
     */
    strongvelope.ProtocolHandler.prototype.getTrackedParticipants = function() {

        var trackedParticipants = new Set(this.otherParticipants);
        trackedParticipants.add(this.ownHandle);
        return trackedParticipants;
    };
}());
