// jscs:disable validateIndentation
(function(scope) {
    "use strict";

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
        loadCryptoForPeer: function(peerHandle) {
            var b64Handle = base64urlencode(peerHandle);
            return pubCu25519[b64Handle] ? Promise.resolve() :crypt.getPubCu25519(b64Handle);
            /** For simulating delay
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (pubCu25519[b64Handle]) {
                        resolve();
                    } else {
                        crypt.getPubCu25519(b64Handle)
                        .then(function() {
                            resolve();
                        })
                    }
                }, 2000);
            });
            */
        },
        preloadCryptoForPeer: function(peerHandle) {
            var b64Handle = base64urlencode(peerHandle);
            if (!pubCu25519[b64Handle]) {
                crypt.getPubCu25519(b64Handle);
            };
        },
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
     * @param {String} fromUser base64urldecoded user handle of the call initiator
     * @returns {RtcCallEventHandler}
     */
    RtcGlobalEventHandler.prototype.onCallIncoming = function (call, fromUser, replacedCall, avAutoAnswer) {
        var callManager = this.megaChat.plugins.callManager;
        var chatRoom = self.megaChat.getChatById(base64urlencode(call.chatid));
        if (!chatRoom) {
            if (d) {
                console.error("Can't find chat for incoming call: ", call);
                return false;
            }
        }

        var callManagerCall = callManager.registerCall(chatRoom, call, fromUser);
        callManagerCall.setState(CallManagerCall.STATE.WAITING_RESPONSE_INCOMING);

        if (avAutoAnswer != null) {
            return callManagerCall;
        }
        callManager.trigger('WaitingResponseIncoming', [callManagerCall]);
        return callManagerCall;
    };

    RtcGlobalEventHandler.prototype.isGroupChat = function(chatId) {
        var chatRoom = this.megaChat.getChatById(base64urlencode(chatId));
        assert(chatRoom, "RtcGlobalEventHandles.isGroupChat: chatroom with specified chatid not found,",
            "this should never happen");
        return (chatRoom.type === "group" || chatRoom.type === "public");
    };
    RtcGlobalEventHandler.prototype.get1on1RoomPeer = function(chatid) {
        chatid = base64urlencode(chatid);
        var room = megaChat.getChatById(chatid);
        if (!room) {
            throw new Exception('Chatroom with id', chatid, 'not found');
        }
        return base64urldecode(room.getParticipantsExceptMe()[0]);
    };

    RtcGlobalEventHandler.prototype.onClientJoinedCall = function(chatId, userid, clientid) {
        var self = this;
        var chatRoom = self.megaChat.getChatById(base64urlencode(chatId));
        if (chatRoom) {
            chatRoom.trigger('onClientJoinedCall', {userId: userid, clientId: clientid});
        }
    };

    RtcGlobalEventHandler.prototype.onClientLeftCall = function(chatId, userid, clientid) {
        var self = this;
        var chatRoom = self.megaChat.getChatById(base64urlencode(chatId));
        if (chatRoom) {
            chatRoom.trigger('onClientLeftCall', {userId: userid, clientId: clientid});
        }
    };
    RtcGlobalEventHandler.prototype.onClientAvChange = function() {};
    RtcGlobalEventHandler.prototype.onOwnNetworkQualityChange = function(quality) {
        if (this.megaChat.activeCallManagerCall) {
            this.megaChat.activeCallManagerCall.room.trackDataChange();
        }
    };

    /**
     * Called if there is no audio for > 10s after the call had started.
     */
    RtcGlobalEventHandler.prototype.onNoInputAudioDetected = function() {
        showToast("warning", l[23451]);
    };


    scope.RtcGlobalEventHandler = RtcGlobalEventHandler;
})(window);
