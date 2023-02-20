(() => {
    "use strict";

class PlayerData {
    constructor(app, player) {
        this.app = app;
        this.player = player;
        this.appCall = app.callManagerCall;
        this.appPeer = this.appCall.peers[player.peer.cid];
        assert(this.appPeer);
        this.video = document.createElement("video");
    }

    attachToTrack(track) { // we wait for player to sync and start, so nothing to do here
        this.appCall.onTrackAllocated(this);
        this.video.onplaying = () => {
            // console.warn("source video: onPlaying");
            if (this.onPlay) {
                this.onPlay();
            }
        };
        this.video.onpause = tryCatch(() => {
            // console.warn("source video: onPause");
        });
        SfuClient.playerPlay(this.video, track);
    }

    detachFromTrack() {
        delete this.video.onpause;
        SfuClient.playerStop(this.video);
        this.appCall.onTrackReleased(this);
    }
    onDestroy() {
    }
}

    var SfuApp = function(room, callId) {
        this.room = room;
        room.sfuApp = this;
        this.callId = callId;
        this.callManagerCall = megaChat.plugins.callManager2.registerCall(this, room, callId);
        this.room.meetingsLoading = l.joining;
    };

    SfuApp.VIDEO_DEBUG_MODE = d;

    SfuApp.prototype.onServerError = function(errCode) {
        console.error('onServerError!!!', errCode);
    };

    SfuApp.prototype.onNewPlayer = function(sfuPlayer) {
        return new PlayerData(this, sfuPlayer);
    };

    SfuApp.prototype.onPeerJoined = function(peer) {
        this.callManagerCall.onPeerJoined(peer);
    };

    SfuApp.prototype.onPeerLeft = function(peer, reason) {
        this.callManagerCall.onPeerLeft(peer, reason);
    };
    SfuApp.prototype.onJoined = function() {
        for (const peer of this.sfuClient.peers.values()) {
            this.callManagerCall.onPeerJoined(peer, true);
        }
        this.callManagerCall.onJoined();
        this.room.meetingsLoading = false;

        this.room.unbind("onCallLeft.start");
        this.room.megaChat.trigger('sfuConnOpen');
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

    SfuApp.prototype.onDisconnect = function(termCode, willReconnect, removeActive) {
        if (willReconnect) {
            this.room.megaChat.trigger('sfuConnClose');
        }
        else if (!this.isDisconnecting) {
            this.handleDisconnect(termCode);
        }
    };
    SfuApp.prototype.handleDisconnect = function(termCode) {
        this.isDisconnecting = true;
        this.room.trigger('onCallLeft', {
            callId: this.callId,
            chatId: this.room.chatId,
            showCallFeedback: true
        });
        if (termCode === SfuClient.TermCode.kTooManyParticipants) {
            msgDialog('warningb', '', l[20200]);
        }
        this.room.sfuApp = null;
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
    SfuApp.prototype.signString = async function(str) {
        var detachedSignature = nacl.sign.detached(
            asmCrypto.string_to_bytes(str),
            asmCrypto.string_to_bytes(u_privEd25519 + u_pubEd25519));
        return SfuClient.base64ArrEncode(detachedSignature.buffer);
    };
    SfuApp.prototype.verifySignature = function(msg, signature, userId) {
        const userPubKey = pubEd25519[userId];
        if (!userPubKey) {
            throw new Error(`verifySignature: No pubEd25519 key found for user ${userId}`);
        }
        return backgroundNacl.sign.detached.verify(
            asmCrypto.string_to_bytes(msg), SfuClient.base64DecodeToArr(signature),
            asmCrypto.string_to_bytes(userPubKey));
    };
    SfuApp.prototype.encryptKeyToUser = async function(key, userId) {
        // console.error("encryptKeyTo", ab_to_str(key), userId);
        assert(key);
        assert(userId);

        await SfuApp.preloadCryptoForPeer(userId);
        var userSharedKey = SfuApp.webrtcCalculateSharedKey(userId);
        return base64urlencode(asmCrypto.bytes_to_string(
            asmCrypto.AES_ECB.encrypt(key, userSharedKey, false)));
    };
    SfuApp.prototype.decryptKeyFromUser = async function(key, userId) {
        // console.error("decryptKeyFrom", key, userId);
        assert(key);
        assert(userId);

        await SfuApp.preloadCryptoForPeer(userId);
        var userSharedKey = SfuApp.webrtcCalculateSharedKey(userId);

        return asmCrypto.AES_ECB.decrypt(base64urldecode(key), userSharedKey, false).buffer;
    };

    SfuApp.prototype.destroy = function(reason) {
        if (this.isDestroyed) {
            console.warn("SfuApp already destroyed");
            return;
        }
        this.isDestroyed = true;
        if (!this.isDisconnecting && !this.sfuClient.disconnect(reason)) {
            this.handleDisconnect(reason);
        }
        delete window.sfuClient;
    };

    // proxy SFUClient events to the call.
    [
        'onLocalMediaChange',
        'onLocalMediaError',
        'onAudioSendDenied',
        'onNoMicInput',
        'onMicSignalDetected',
        'onBadNetwork'
    ].forEach((k) => {
        SfuApp.prototype[k] = function() {
            return this.callManagerCall[k].apply(this.callManagerCall, arguments);
        };
    });



    [
        'onSfuStats',
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
        PlayerData.prototype[fnName] = function() {
            // if (fnName === "onRxStats") {
            //     return;
            // }
            // console.error('PlayerData', fnName, arguments);
        };
    });

    if (SfuApp.VIDEO_DEBUG_MODE) {
        PlayerData.prototype.onRxStats = function(track, info, raw) {
            if (!window.sfuClient) {
                return;
            }
            let text = `${track.peer.cid}: `;
            if (raw.frameWidth) {
                text += `${raw.frameWidth}x${raw.frameHeight} `;
            }
            text += `${raw.framesPerSecond || 0}fps ${Math.round(info.keyfps)}kfs ${Math.round(info.kbps)
                }kbps rtt: ${sfuClient.rtcStats.rtt}, apl: ${track.peer.audioPktLoss.toFixed(1)}%, vpl: ${info.plost.toFixed(1)}%, rxq: ${sfuClient.rxQuality}`;

            for (const cons of this.appPeer.consumers) {
                cons.displayStats(text);
            }
        };
        SfuApp.prototype.onVideoTxStat = function(isHiRes, stats, raw) {
            if (!window.sfuClient) {
                return;
            }
            let text = (isHiRes === null)
                ? "loc: <not sending>" // onVideoTxStat(null) is called when there is no output video track
                : `loc: ${stats.vtxw}x${stats.vtxh}:${sfuClient.sentTracksString()} ${Math.round(stats._vtxkbps)
                    }kbps\n${stats.vtxfps || 0}fps ${Math.round(stats._vtxkfps)}kfs rtt: ${stats.rtt} dly: ${stats.vtxdly}`;

            if (sfuClient.isSendingScreenHiRes()) {
                text += `\ntxq: ${sfuClient.txQuality}`;
            }
            for (const cons of this.callManagerCall.localPeerStream.consumers) {
                cons.displayStats(text);
            }
        };
    }

    SfuClient.kWorkerUrl = (is_extension ? '' : '/') + 'worker.sfuClient.bundle.js';

    // exports:
    window.SfuApp = SfuApp;
})();
