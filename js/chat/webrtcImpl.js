(function(scope) {
    "use strict";


    var RtcSessionEventHandler = function (callEventHandler, rtcCallSession) {
        this.callEventHandler = callEventHandler;
        this.rtcCallSession = rtcCallSession;
        this.chatRoom = callEventHandler.chatRoom;
    };

    /**
     *
     * @param {SessionState} sessionState
     */
    RtcSessionEventHandler.prototype.onStateChange = function (sessionState) {
        // unused
    };

    RtcSessionEventHandler.prototype.onDestroy = function () {
        // unused
    };

    RtcSessionEventHandler.prototype.onRemoteStreamAdded = function (stream) {
        /* The peer will send a stream
         to us on that stream object. You can obtain the stream URL via
         window.URL.createObjectURL(stream) or you can attach the player via the
         attachToStream() polyfill function
         stream - the stream object to which a player should be attached
         */
        return this.chatRoom.megaChat.plugins.callManager.onRemoteStreamAdded(
            this.callEventHandler.call,
            this,
            stream
        );
    };

    RtcSessionEventHandler.prototype.onRemoteStreamRemoved = function () {
        //  The peer's stream is about to be removed.
        return this.chatRoom.megaChat.plugins.callManager.onRemoteStreamRemoved(this.callEventHandler.call, this);
    };

    RtcSessionEventHandler.prototype.onRemoteMute = function (stream) {
        return this.chatRoom.megaChat.plugins.callManager.onRemoteMute(this.callEventHandler.call, this, stream);
    };


    /**
     *
     * @param {AvFlags} av
     */
    RtcSessionEventHandler.prototype.onPeerMute = function (av) {
        // unused
    };


    /**
     *
     * @param {ChatRoom} chatRoom
     * @constructor
     */
    var RtcCallEventHandler = function (chatRoom) {
        this.chatRoom = chatRoom;
    };

    RtcCallEventHandler.prototype.onStateChange = function () {
        // unused
    };

    RtcCallEventHandler.prototype.onDestroy = function (terminationReasonCode, wasFromPeer) {
        this.chatRoom.megaChat.plugins.callManager.onDestroy(
            this.call,
            terminationReasonCode,
            wasFromPeer
        );
    };

    RtcCallEventHandler.prototype.onNewSession = function (rtcCallSession) {
        return new RtcSessionEventHandler(this, rtcCallSession);
    };

    RtcCallEventHandler.prototype.onCallStarted = function () {
        return this.chatRoom.megaChat.plugins.callManager.onCallStarted(this.call);
    };
    RtcCallEventHandler.prototype.onCallStarting = function () {
        return this.chatRoom.megaChat.plugins.callManager.onCallStarting(this.call);
    };

    var RtcGlobalEventHandler = function (megaChat) {
        var self = this;
        self.megaChat = megaChat;
    };


    var webrtcCalculateSharedKey = function webrtcCalculateSharedKey(peer) {
        var pubKey = pubCu25519[base64urlencode(peer)];
        if (!pubKey) {
            throw new Error("webrtcCalculateSharedKey: pubCu25519 key not loaded for user", base64urlencode(peer));
        }
        var sharedSecret = nacl.scalarMult(
            asmCrypto.string_to_bytes(u_privCu25519),
            asmCrypto.string_to_bytes(pubKey)
        );

        // Taken from strongvelope deriveSharedKey()
        // Equivalent to first block of HKDF, see RFC 5869.
        var hmac = asmCrypto.HMAC_SHA256.bytes;
        return asmCrypto.string_to_bytes(
            asmCrypto.bytes_to_string(
                hmac("webrtc pairwise key\x01", hmac(sharedSecret, ''))
            ).substring(0, 16));
    };

    RtcGlobalEventHandler.CRYPTO_HELPERS = {
        encryptNonceTo: function (peerHandle, nonce256) {
            assert(nonce256 && nonce256.length === 32, "encryptNonceTo: nonce length is not 256 bits");
            var key = webrtcCalculateSharedKey(peerHandle);
            var clearText = asmCrypto.string_to_bytes(nonce256);
            return asmCrypto.bytes_to_string(
                asmCrypto.AES_ECB.encrypt(clearText, key, false));
        },
        decryptNonceFrom: function (peerHandle, encNonce256) {
            assert(encNonce256 && encNonce256.length === 32, "decryptNonceFrom: encrypted nonce is not 256 bits");
            var key = webrtcCalculateSharedKey(peerHandle);
            var cipherData = asmCrypto.string_to_bytes(encNonce256);
            return asmCrypto.bytes_to_string(
                asmCrypto.AES_ECB.decrypt(cipherData, key, false));
        },
        mac: function (msg, key) {
            // use the SDK's base64 alphabet, it is also safer for using in URLs
            return asmCrypto.bytes_to_string(asmCrypto.HMAC_SHA256.bytes(msg, key));
        },
        random: function (count) {
            var array = new Uint8Array(count);
            var result = '';
            window.crypto.getRandomValues(array);
            for (var i = 0; i < count; i++) {
                result += String.fromCharCode(array[i]);
            }
            return result;
        },
        ownAnonId: function () {
            var H = asmCrypto.SHA256.bytes;
            return asmCrypto.bytes_to_string(H(u_handle + H(u_privk + "webrtc stats collection"))).substr(0, 8);
        }
    };

    /**
     * called when an incoming call request is received,
     *
     * @param {Call} call
     * @returns {RtcCallEventHandler}
     */
    RtcGlobalEventHandler.prototype.onCallIncoming = function (call) {
        var callManager = this.megaChat.plugins.callManager;
        var chatRoom = self.megaChat.getChatById(base64urlencode(call.chatid));
        if (!chatRoom) {
            if (d) {
                console.error("Can't find chat for incoming call: ", call);
                return false;
            }
        }

        var callHandler = new RtcCallEventHandler(chatRoom, call);
        callHandler.call = call;
        var callManagerCall = callManager.registerCall(chatRoom, call);
        callManagerCall.setState(CallManagerCall.STATE.WAITING_RESPONSE_INCOMING);
        callManager.trigger('WaitingResponseIncoming', [callManagerCall]);
        return callHandler;
    };

    RtcGlobalEventHandler.prototype.isGroupChat = function (chatId) {
        var chatRoom = this.megaChat.getChatById(base64urlencode(chatId));
        assert(chatRoom, "RtcGlobalEventHandles.isGroupChat: chatroom with specified chatid not found,",
            "this should never happen");
        return (chatRoom.type === "group");
    };
    RtcGlobalEventHandler.prototype.get1on1RoomPeer = function(chatid) {
        chatid = base64urlencode(chatid);
        var room = megaChat.getChatById(chatid);
        if (!room) {
            throw new Exception('Chatroom with id', chatid, 'not found');
        }
        return base64urldecode(room.getParticipantsExceptMe()[0]);
    };

    RtcGlobalEventHandler.prototype.onLocalMediaRequest = function () {
        $('.camera-access').removeClass('hidden');
    };
    RtcGlobalEventHandler.prototype.onLocalMediaObtained = function () {
        $('.camera-access').addClass('hidden');
    };
    RtcGlobalEventHandler.prototype.onLocalMediaFail = function () {
        $('.camera-access').addClass('hidden');
    };

    scope.RtcGlobalEventHandler = RtcGlobalEventHandler;
    scope.RtcCallEventHandler = RtcCallEventHandler;
})(window);
