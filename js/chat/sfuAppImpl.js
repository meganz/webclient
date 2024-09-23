(() => {
    "use strict";
    var Call = window.CallManager2.Call;

    Call.VIDEO_DEBUG_MODE = d;

    /* Used for v0 clients, to be removed soon */
    function loadPubCu25519ForPeer(peerHandle) {
        return crypt.getPubCu25519(peerHandle)
            .then(() => {
                const pubKey = pubCu25519[peerHandle];
                if (!pubKey) {
                    throw new Error(`loadPubCu25519ForPeer: Could not get pubCu25519 key for user ${peerHandle}`);
                }
                return pubKey;
            });
    }
    function loadPubEd25519ForPeer(peerHandle) {
        return crypt.getPubEd25519(peerHandle)
            .then(() => {
                const pubKey = pubEd25519[peerHandle];
                if (!pubKey) {
                    throw new Error(`loadPubEd25519ForPeer: Could not get pubEd25519 key for user ${peerHandle}`);
                }
                return pubKey;
            });
    }
    /* Used for v0 clients, to be removed soon */
    async function webrtcCalculateSharedKey(userId) {
        const pubKey = pubCu25519[userId] || await loadPubCu25519ForPeer(userId);
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
    Call.prototype.verifySignature = async function(msg, signature, userId) {
        const userPubKey = pubEd25519[userId] || await loadPubEd25519ForPeer(userId);
        return backgroundNacl.sign.detached.verify(
            asmCrypto.string_to_bytes(msg), SfuClient.base64DecodeToArr(signature),
            asmCrypto.string_to_bytes(userPubKey));
    };
    /* Used for v0 clients, to be removed soon */
    Call.prototype.encryptKeyToUser = async function(key, userId) {
        // console.error("encryptKeyTo", ab_to_str(key), userId);
        assert(key);
        assert(userId);
        var userSharedKey = await webrtcCalculateSharedKey(userId);
        return base64urlencode(asmCrypto.bytes_to_string(
            asmCrypto.AES_ECB.encrypt(key, userSharedKey, false)));
    };
    /* Used for v0 clients, to be removed soon */
    Call.prototype.decryptKeyFromUser = async function(key, userId) {
        // console.error("decryptKeyFrom", key, userId);
        assert(key);
        assert(userId);
        var userSharedKey = await webrtcCalculateSharedKey(userId);
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
                if (!cons.onRxStats) {
                    cons.displayStats(text);
                }
            }
        };
        Call.prototype.onVideoTxStat = function(isHiRes, stats, raw) {
            if (!window.sfuClient) {
                return;
            }
            let text;
            if (isHiRes === null) {
                text = "loc: <not sending>"; // onVideoTxStat(null) is called when there is no output video track
            }
            else {
                text = `loc: ${stats.vtxw}x${stats.vtxh}:${sfuClient.sentTracksString()} ${Math.round(stats._vtxkbps)
                    }kbps\n${stats.vtxfps || 0}fps ${Math.round(stats._vtxkfps)}kfs txpl: ${stats.txpl
                    } rtt: ${stats.rtt} dly: ${stats.vtxdly}`;
                if (isHiRes && sfuClient.isSendingScreenHiRes()) {
                    text += ` txq: ${sfuClient.txQuality}`;
                }
                text += ` bwe: ${stats.txBwe || '??'}`;
                const lim = stats.f & 0x03; // the 2 least significant bits
                if (lim) {
                    const type = (lim === 1) ? "cpu" : ((lim === 2) ? "net" : lim);
                    text += ` lim: ${type}`;
                }
            }
            for (const cons of this.localPeerStream.consumers) {
                cons.displayStats(text);
            }
        };
    }

    SfuClient.kWorkerUrl = (is_extension ? '' : '/') + 'worker.sfuClient.bundle.js';
})();
