(() => {
    "use strict";

    const hexDigits = "0123456789abcdef";
    if (!window.binToHex) {
        window.binToHex = (arr) => {
            var result = "";
            if (!arr.getUint8) {
                arr = new DataView(arr);
            }
            for (let i = 0; i < arr.byteLength; i++) {
                const val = arr.getUint8(i);
                result += hexDigits.charAt(val >> 4);
                result += hexDigits.charAt(val & 0x0f);
            }
            return result;
        };
    }

    if (!window.hexDigitVal) {
        window.hexDigitVal = function(chCode) {
            if (chCode <= 57) { // ascii code if '9'
                return chCode - 48; // ascii code of '0'
            }
            else if (chCode >= 97) { // 'a'
                return 10 + chCode - 97;
            }
            return 10 + chCode - 65; // 'A'
        };
    }

    if (!window.hexToBin) {
        window.hexToBin = function(hexStr) {
            const bin = new Uint8Array(hexStr.length >> 1);
            for (let pos = 0, binPos = 0; pos < hexStr.length; binPos++) {
                bin[binPos] = (hexDigitVal(hexStr.charCodeAt(pos++)) << 4) | hexDigitVal(hexStr.charCodeAt(pos++));
            }
            return bin;
        };
    }

    var SfuGui = function(app, player) {
        this.app = app;
        this.player = player;
        // this.peer = this.app.callManagerCall.registerPlayer(player);
    };

    SfuGui.prototype.onAttachedToTrack = function() {
        this.peer = this.app.callManagerCall.registerPlayer(this.player);
    };


    SfuGui.prototype.onDestroy = function() {
        this.app.callManagerCall.deregisterPlayer(this.player);
    };



    var SfuApp = function(room, callId) {
        this.room = room;
        room.sfuApp = this;
        this.callId = callId;
        this.callManagerCall = megaChat.plugins.callManager2.registerCall(this, room, callId);
        this.room.meetingsLoading = l.joining;
    };

    SfuApp.VIDEO_DEBUG_MODE = !!(d && typeof localStorage.videoDebugMode !== 'undefined');


    SfuApp.prototype.onServerError = function(errCode) {
        console.error('onServerError!!!', errCode);
    };

    SfuApp.prototype.onNewPlayer = function(playerObj) {
        return new SfuGui(this, playerObj);
    };

    SfuApp.prototype.onPeerJoined = function(peer) {
        this.callManagerCall.onPeerJoined(peer);
    };

    SfuApp.prototype.onPeerLeft = function(peer) {
        this.callManagerCall.onPeerLeft(peer);
    };

    SfuApp.prototype.onJoined = function() {
        for (const peer of this.sfuClient.peers.values()) {
            this.callManagerCall.onPeerJoined(peer, true);
        }
        this.callManagerCall.onJoined();
        this.room.meetingsLoading = false;

        this.room.unbind("onCallEnd.start");
    };

    SfuApp.prototype.enableSpeakerDetector = function() {
        this.sfuClient.enableSpeakerDetector(true);
    };

    SfuApp.prototype.disableSpeakerDetector = function() {
        this.sfuClient.enableSpeakerDetector(false);
    };

    SfuApp.prototype.onActiveSpeakerChange = function(newPeer/*, prevPeer*/) {
        var call = this.callManagerCall;
        if (newPeer) {
            var peer = call.peers[newPeer.cid];
            assert(peer);
            call.setActiveStream(newPeer.cid);
        }
        else {
            call.setActiveStream(null);
        }
    };
    SfuApp.prototype.onPeerAvChange = function(peer, av) {
        const call = this.callManagerCall;
        const callManagerPeer = call.peers[peer.cid];
        assert(callManagerPeer);
        callManagerPeer.onAvChange(av);
    };

    SfuApp.prototype.onDisconnect = function(termCode, willReconnect) {
        if (!willReconnect) {
            this.room.trigger('onCallEnd', { callId: this.callId, chatId: this.room.chatId, showCallFeedback: true });
            if (termCode === SfuClient.TermCode.kTooManyParticipants) {
                msgDialog('warningb', '', l[20200]);
            }
            this.room.sfuApp = null;
        }
    };

    SfuApp.preloadCryptoForPeer = async function(peerHandle) {
        return pubCu25519[peerHandle] ? Promise.resolve() : crypt.getPubCu25519(peerHandle);
    };

    SfuApp.webrtcCalculateSharedKey = function webrtcCalculateSharedKey(userId) {
        var pubKey = pubCu25519[userId];
        if (!pubKey) {
            throw new Error("webrtcCalculateSharedKey: pubCu25519 key not loaded for user", userId);
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

    SfuApp.prototype.encryptKeyTo = async function(key, userId) {
        // console.error("encryptKeyTo", ab_to_str(key), userId);
        assert(key);
        assert(userId);

        await SfuApp.preloadCryptoForPeer(userId);
        var userSharedKey = SfuApp.webrtcCalculateSharedKey(userId);
        return base64urlencode(asmCrypto.bytes_to_string(
            asmCrypto.AES_ECB.encrypt(key, userSharedKey, false)));
    };
    SfuApp.prototype.decryptKeyFrom = async function(key, userId) {
        // console.error("decryptKeyFrom", key, userId);
        assert(key);
        assert(userId);

        await SfuApp.preloadCryptoForPeer(userId);
        var userSharedKey = SfuApp.webrtcCalculateSharedKey(userId);

        return asmCrypto.AES_ECB.decrypt(base64urldecode(key), userSharedKey, false).buffer;
    };

    SfuApp.prototype.destroy = function(reason) {
        this.isDestroyed = true;
        this.sfuClient.disconnect(reason);
        delete window.sfuClient;
    };

    // proxy SFUClient events to the call.
    [
        'onLocalMediaChange',
        'onLocalMediaError',
        'onNoMicInput',
        'onMicSignalDetected'
    ].forEach((k) => {
        SfuApp.prototype[k] = function() {
            return this.callManagerCall[k].apply(this.callManagerCall, arguments);
        };
    });



    [
        'onSfuStats',
        'onScreenshare',
        'onConnecting',
        'onConnected',
        'onSpeak',
        'onSpeakReq',
        'onOwnSpeakRequest',
        'onOwnSpeakRequestDel',
        'onSpeakReqDel',
        'displayCallInfo',
        'onModerator',
        'onTxStat'
    ]
        .forEach((fnName) => {
            SfuApp.prototype[fnName] = function() {
                // if (fnName === "onTxStat" || fnName === "onSfuStats") {
                //     return;
                // }
                // console.error('SfuApp', fnName, arguments);
            };
        });

    [
        'append',
        'prepend',
        'onDetach',
        'onPinUnpin',
        'onVthumbAttach',
        'onVthumbDetach',
        'updateAvIndicators',
        'onAudioLevel',
        'onRxStats',
    ].forEach((fnName) => {
        SfuGui.prototype[fnName] = function() {
            // if (fnName === "onRxStats") {
            //     return;
            // }
            // console.error('SfuGui', fnName, arguments);
        };
    });

    if (SfuApp.VIDEO_DEBUG_MODE) {
        SfuGui.prototype.onRxStats = function(track, info, raw) {
            const app = track.client.app;
            app.rxStats = app.rxStats || {};
            if (info.keyfps) {
                info.keyfps = Math.round(info.keyfps * 100) / 100;
            }
            if (info.kbps) {
                info.kbps = Math.round(info.kbps * 100) / 100;
            }
            info.per = Math.round(info.per * 1000) / 1000;
            let text = track.cid + ": ";
            text += raw.frameWidth
                ? (raw.frameWidth + "x" + (this.player.isHiRes ? raw.frameHeight : "") + " ")
                : "";
            text += "kfs:" + info.keyfps + ", fps:" + (raw.framesPerSecond || 0) + ", kbps:" + Math.round(info.kbps);
            info.text = text;

            app.rxStats[track.cid] = info;

            const elem = document.getElementById("video-debug-mode-" + track.cid);
            if (elem) {
                elem.innerText = text;
            }
        };
    }

    SfuClient.kWorkerUrl = (is_extension ? '' : '/') + 'worker.sfuClient.bundle.js';

    // exports:
    window.SfuApp = SfuApp;
})();
