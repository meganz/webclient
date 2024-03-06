/** @file automatically generated, do not edit it. */
/* eslint-disable max-len, indent, dot-notation, no-extra-parens */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

const kLogTag = "sfuWorker:";
var gDebug = false;
var gOwnCid;
var gEncryptKey;
var gSenderCidAndKeyId;
var gEncryptors;
var gDecryptors;
var gPeerKeys;
function newCryptoModeDesc(iv) {
    return { name: 'AES-GCM', tagLength: 32, iv: iv };
}
/**
 * Packet layout:
 * fromCID.3 keyID.1 packetNo.4 data
 */
class Encryptor extends TransformStream {
    constructor(mid, iv, func) {
        super({ start() { }, flush() { }, transform: func });
        this.iv = new Uint8Array(12);
        this.ivView = new DataView(this.iv.buffer);
        this.ctr = 0;
        this.cryptoMode = newCryptoModeDesc(this.iv);
        this.mid = mid;
        this.iv.set(iv, 4);
        // LOGD_CWORKER(`Created encryptor for mid ${mid} iv=${binToHex(iv.buffer)}`);
    }
}
class Decryptor extends TransformStream {
    constructor(mid, func) {
        super({ start() { }, flush() { }, transform: func });
        this.iv = new Uint8Array(12);
        this.ivView = new DataView(this.iv.buffer);
        this.cryptoMode = newCryptoModeDesc(this.iv);
        this.mid = mid;
        // LOGD_CWORKER("Created decryptor for mid", mid);
    }
    assign(fromCid, iv) {
        this.senderCid = fromCid;
        this.iv.set(iv, 4);
        this.noPacketYet = true;
        do {
            if (gDebug) {
                console.log(kLogTag, `Assigned track with mid ${this.mid} to peer cid ${fromCid} with iv: ${binToHex(iv.buffer)}`);
            }
        } while (0);
    }
}
function resetCrypto() {
    gPeerKeys = new Map;
    gEncryptors = {};
    gDecryptors = {};
    gEncryptKey = undefined;
    gSenderCidAndKeyId = undefined;
}
function assert(cond) {
    if (!cond) {
        throw new Error("Assertion failed");
    }
}
function createEncryptor(inputStream, outputStream, mid, iv) {
    assert(iv.byteLength === 8);
    let enc = gEncryptors[mid] = new Encryptor(mid, iv, async (encodedFrame, controller) => {
        if (!gEncryptKey) { // may happend during reconnect
            return;
        }
        enc.ivView.setUint32(0, ++enc.ctr, true);
        // LOGD_CWORKER("encrypt[" + ctx.mid + "]: encrypting frame", ctx.ctr, "iv:", binToHex(ctx.ivView.buffer));
        let packet = new Uint8Array(encodedFrame.data.byteLength + 12);
        let header = new DataView(packet.buffer, 0, 8);
        header.setUint32(0, gSenderCidAndKeyId, true);
        header.setUint32(4, enc.ctr, true);
        enc.cryptoMode.additionalData = header;
        let encrypted = await crypto.subtle.encrypt(enc.cryptoMode, gEncryptKey, encodedFrame.data);
        packet.set(new Uint8Array(encrypted), 8);
        encodedFrame.data = packet.buffer;
        // Send it to the output stream.
        controller.enqueue(encodedFrame);
    });
    inputStream.pipeThrough(enc).pipeTo(outputStream);
}
function setEncryptKey(keyId, key, notify) {
    gEncryptKey = key;
    gSenderCidAndKeyId = (((gOwnCid << 8) >>> 0) | (keyId & 0xff)) >>> 0;
    if (notify) {
        self.postMessage({ op: "keyset", keyId: keyId });
    }
    else {
        do {
            if (gDebug) {
                console.log(kLogTag, "updated send key -> id:", keyId);
            }
        } while (0);
    }
}
function createDecryptor(inputStream, outputStream, mid) {
    var dec = gDecryptors[mid] = new Decryptor(mid, async (encodedFrame, controller) => {
        // Reconstruct the original frame.
        let header = new DataView(encodedFrame.data, 0, 8);
        let fromCidAndKeyId = header.getUint32(0, true);
        let fromCid = fromCidAndKeyId >>> 8;
        if (fromCid !== dec.senderCid) {
            console.warn(kLogTag, `decrypt[${dec.mid}]: Skipping packet from unexpected sender cid ${fromCid}`);
            return;
        }
        let key = gPeerKeys.get(fromCidAndKeyId);
        if (!key) {
            console.warn(kLogTag, `decrypt[${dec.mid}]: Can't decrypt packet from cid ${fromCid} with unknown key ${fromCidAndKeyId & 0xff}`);
            return;
        }
        let frameCtr = header.getUint32(4, true);
        dec.ivView.setUint32(0, frameCtr, true);
        let encData = new DataView(encodedFrame.data, 8);
        dec.cryptoMode.additionalData = header;
        try {
            // LOG_CWORKER("decrypt[" + ctx.mid + "]: decrypting frame", frameCtr, "from peer", fromCid, "iv:", binToHex(ctx.ivView.buffer));
            let plaintext = await crypto.subtle.decrypt(dec.cryptoMode, key, encData);
            encodedFrame.data = plaintext;
            controller.enqueue(encodedFrame);
        }
        catch (err) {
            if (err.message) {
                console.warn(kLogTag, `Error decrypting track with mid ${mid}: ${err.message}`);
            }
            else {
                console.warn(kLogTag, `General error decrypting track with mid ${mid} from peer ${fromCid}`);
            }
        }
        if (dec.noPacketYet) {
            delete dec.noPacketYet;
            const msg = { op: "rx-first", mid: mid };
            if (encodedFrame.type) {
                msg.type = encodedFrame.type;
            }
            self.postMessage(msg);
        }
        // LOG_CWORKER("frame size[" + mid +"]: ", encodedFrame.data.byteLength);
    });
    inputStream.pipeThrough(dec).pipeTo(outputStream);
}
;
function decryptorAssignTrack(mid, fromCid, iv) {
    assert(iv.byteLength === 8);
    let dec = gDecryptors[mid];
    assert(dec);
    dec.assign(fromCid, iv);
}
async function addDecryptKey(cid, keyId, key) {
    let fullKeyId = (((cid << 8) >>> 0) | keyId) >>> 0;
    gPeerKeys.set(fullKeyId, await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]));
}
function delKeysOfPeer(cid) {
    let num = 0;
    for (let id of gPeerKeys.keys()) {
        if ((id >>> 8) === cid) {
            gPeerKeys.delete(id);
            num++;
        }
    }
    if (num) {
        do {
            if (gDebug) {
                console.log(kLogTag, `Deleted ${num} keys of peer`, cid);
            }
        } while (0);
    }
}
onmessage = function (event) {
    let data = event.data;
    let cmd = data[0];
    switch (cmd) {
        case 'ek':
            setEncryptKey(data[1], data[2], data[3]);
            return;
        case 'dk':
            addDecryptKey(data[1], data[2], data[3]);
            return;
        case 'dt':
            decryptorAssignTrack(data[1], data[2], data[3]);
            return;
        case 'ce':
            createEncryptor(data[1], data[2], data[3], data[4]);
            return;
        case 'cd':
            createDecryptor(data[1], data[2], data[3]);
            return;
        case 'cid':
            gOwnCid = data[1];
            return;
        case 'dpk':
            delKeysOfPeer(data[1]);
            return;
        case 'r':
            resetCrypto();
            return;
        case 'dbg':
            gDebug = data[1];
            return;
        default:
            console.warn(kLogTag, `Unknown command '${cmd}'`);
            return;
    }
};
const hexDigits = "0123456789abcdef";
function binToHex(arr) {
    var result = "";
    arr = new DataView(arr.buffer || arr);
    for (let i = 0; i < arr.byteLength; i++) {
        let val = arr.getUint8(i);
        result += hexDigits.charAt(val >> 4);
        result += hexDigits.charAt(val & 0x0f);
    }
    return result;
}

/******/ })()
;