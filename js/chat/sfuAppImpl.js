(() => {
    "use strict";
    var Call = window.CallManager2.Call;

    Call.VIDEO_DEBUG_MODE = d;

    async function preloadCryptoForPeer(peerHandle) {
        return pubCu25519[peerHandle] ? Promise.resolve() : crypt.getPubCu25519(peerHandle);
    };

    function webrtcCalculateSharedKey(userId) {
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
    Call.prototype.signString = async function(str) {
        var detachedSignature = nacl.sign.detached(
            asmCrypto.string_to_bytes(str),
            asmCrypto.string_to_bytes(u_privEd25519 + u_pubEd25519));
        return SfuClient.base64ArrEncode(detachedSignature.buffer);
    };
    Call.prototype.verifySignature = function(msg, signature, userId) {
        const userPubKey = pubEd25519[userId];
        if (!userPubKey) {
            throw new Error(`verifySignature: No pubEd25519 key found for user ${userId}`);
        }
        return backgroundNacl.sign.detached.verify(
            asmCrypto.string_to_bytes(msg), SfuClient.base64DecodeToArr(signature),
            asmCrypto.string_to_bytes(userPubKey));
    };
    Call.prototype.encryptKeyToUser = async function(key, userId) {
        // console.error("encryptKeyTo", ab_to_str(key), userId);
        assert(key);
        assert(userId);

        await preloadCryptoForPeer(userId);
        var userSharedKey = webrtcCalculateSharedKey(userId);
        return base64urlencode(asmCrypto.bytes_to_string(
            asmCrypto.AES_ECB.encrypt(key, userSharedKey, false)));
    };
    Call.prototype.decryptKeyFromUser = async function(key, userId) {
        // console.error("decryptKeyFrom", key, userId);
        assert(key);
        assert(userId);

        await preloadCryptoForPeer(userId);
        var userSharedKey = webrtcCalculateSharedKey(userId);

        return asmCrypto.AES_ECB.decrypt(base64urldecode(key), userSharedKey, false).buffer;
    };

    Call.rxStatsToText = function(track, info, raw) {
        if (!window.sfuClient) {
            return;
        }
        let text = `${track.peer.cid}: `;
        if (raw.frameWidth) {
            text += `${raw.frameWidth}x${raw.frameHeight} `;
        }
        text += `${raw.framesPerSecond || 0}fps ${Math.round(info.keyfps)}kfs ${Math.round(info.kbps)
            }kbps rtt: ${sfuClient.rtcStats.rtt}, pl: ${Math.round(info.plost)}, rxq: ${sfuClient.rxQuality}`;
        return text;
    };
    if (Call.VIDEO_DEBUG_MODE) {
        Call.PlayerCtx.prototype.onRxStats = function(track, info, raw) {
            const text = Call.rxStatsToText(track, info, raw);
            for (const cons of this.appPeer.consumers) {
                cons.displayStats(text);
            }
        };
        Call.prototype.onVideoTxStat = function(isHiRes, stats, raw) {
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
            for (const cons of this.localPeerStream.consumers) {
                cons.displayStats(text);
            }
        };
    }

    SfuClient.kWorkerUrl = (is_extension ? '' : '/') + 'worker.sfuClient.bundle.js';
})();
