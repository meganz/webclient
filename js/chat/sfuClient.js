/** @file automatically generated, do not edit it. */
/* eslint-disable max-len, indent, dot-notation, no-extra-parens */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  S: () => (/* binding */ ConnState)
});

// UNUSED EXPORTS: CallJoinPermission, ScreenShareType, SfuClient

;// CONCATENATED MODULE: ../shared/termCodes.ts
var TermCode;
(function (TermCode) {
    // Normal conditions
    TermCode[TermCode["kFlagError"] = 128] = "kFlagError";
    TermCode[TermCode["kFlagDisconn"] = 64] = "kFlagDisconn";
    TermCode[TermCode["kUserHangup"] = 0] = "kUserHangup";
    TermCode[TermCode["kCallParticipantLimit"] = 1] = "kCallParticipantLimit";
    TermCode[TermCode["kLeavingRoom"] = 2] = "kLeavingRoom";
    TermCode[TermCode["kCallEndedByModerator"] = 3] = "kCallEndedByModerator";
    TermCode[TermCode["kCallEndedByApi"] = 4] = "kCallEndedByApi";
    TermCode[TermCode["kPeerJoinTimeout"] = 5] = "kPeerJoinTimeout";
    TermCode[TermCode["kPushedToWaitingRoom"] = 6] = "kPushedToWaitingRoom";
    TermCode[TermCode["kKickedFromWaitingRoom"] = 7] = "kKickedFromWaitingRoom";
    TermCode[TermCode["kCallUserClientLimit"] = 8] = "kCallUserClientLimit";
    TermCode[TermCode["kWaitingRoomAllowTimeout"] = 9] = "kWaitingRoomAllowTimeout";
    TermCode[TermCode["kCallDurLimit"] = 10] = "kCallDurLimit";
    TermCode[TermCode["kCallUserLimit"] = 11] = "kCallUserLimit";
    // Disconnects
    TermCode[TermCode["kRtcDisconn"] = 64] = "kRtcDisconn";
    TermCode[TermCode["kSigDisconn"] = 65] = "kSigDisconn";
    TermCode[TermCode["kSfuShuttingDown"] = 66] = "kSfuShuttingDown";
    TermCode[TermCode["kChatDisconn"] = 67] = "kChatDisconn";
    TermCode[TermCode["kNoMediaPath"] = 68] = "kNoMediaPath";
    // Errors (abnormal conditions)
    TermCode[TermCode["kErrSignaling"] = 128] = "kErrSignaling";
    TermCode[TermCode["kErrNoCall"] = 129] = "kErrNoCall";
    TermCode[TermCode["kErrAuth"] = 130] = "kErrAuth";
    TermCode[TermCode["kErrApiTimeout"] = 131] = "kErrApiTimeout";
    TermCode[TermCode["kErrSdp"] = 132] = "kErrSdp";
    TermCode[TermCode["kErrProtocolVersion"] = 133] = "kErrProtocolVersion";
    TermCode[TermCode["kErrCrypto"] = 134] = "kErrCrypto";
    TermCode[TermCode["kErrClientGeneral"] = 190] = "kErrClientGeneral";
    TermCode[TermCode["kErrSfuGeneral"] = 191] = "kErrSfuGeneral";
})(TermCode || (TermCode = {}));
;
/* harmony default export */ const termCodes = (TermCode);

;// CONCATENATED MODULE: ../shared/av.ts
class Av {
    static hasCamAndScreen(av) {
        return ((av & Av.Camera) && (av & Av.Screen));
    }
    static toString(av) {
        let result = (av & Av.onHold) ? "H" : "";
        if (av & Av.Audio) {
            result += "a";
        }
        if (av & Av.CameraHiRes) {
            result += "C";
        }
        if (av & Av.CameraLowRes) {
            result += "c";
        }
        if (av & Av.ScreenHiRes) {
            result += "S";
        }
        if (av & Av.ScreenLowRes) {
            result += "s";
        }
        if (av & Av.Recording) {
            result += "R";
        }
        return result;
    }
}
Av.Audio = 1;
Av.CameraLowRes = 2;
Av.CameraHiRes = 4;
Av.Camera = 6;
Av.ScreenLowRes = 8;
Av.ScreenHiRes = 16;
Av.Screen = 24;
Av.LowResVideo = 10;
Av.HiResVideo = 20;
Av.Video = 30;
Av.Recording = 64;
Av.onHold = 128;

;// CONCATENATED MODULE: ../shared/sdpCompress.ts
const endl = "\r\n";
class Ssrc {
    constructor(id) {
        this.id = id;
    }
}
class Track {
    constructor(type) {
        this.t = type;
    }
    static uncompress(track, template) {
        let sdp = template;
        if (track.sdp) {
            sdp += track.sdp + "\r\n";
        }
        sdp += "a=mid:" + track.mid + endl;
        sdp += "a=" + track.dir + endl;
        if (track.id) { // recvonly tracks don't have it
            sdp += "a=msid:" + track.sid + " " + track.id + endl;
        }
        if (track.ssrcs) {
            for (let ssrc of track.ssrcs) {
                let id = ssrc.id;
                sdp += "a=ssrc:" + id + " cname:" + (ssrc.cname ? ssrc.cname : track.sid) + endl;
                sdp += "a=ssrc:" + id + " msid:" + track.sid + " " + track.id + endl;
                // sdp += "a=ssrc:" + id + " mslabel:" + track.sid + endl;
                // sdp += "a=ssrc:" + id + " label:" + track.id + endl;
            }
            if (track.ssrcg) {
                for (let grp of track.ssrcg) {
                    sdp += "a=ssrc-group:" + grp + endl;
                }
            }
        }
        return sdp;
    }
}
class CompressedSdp {
    constructor(sdp) {
        if (sdp instanceof Object) {
            this.data = sdp;
            return;
        }
        let data = this.data = {
            cmn: "",
            atpl: "",
            vtpl: "",
            tracks: []
        };
        let lines = sdp.split(/\r\n/);
        let i = 0;
        for (; i < lines.length; i++) {
            let line = lines[i];
            if (line.substr(0, 2) === "m=") {
                break;
            }
            data.cmn += line + endl;
        }
        while (i < lines.length) {
            let line = lines[i];
            let type = line.substr(2, 5);
            if (type === "audio" && !data.atpl) {
                i = this._createTemplate("atpl", lines, i);
                if (data.vtpl) {
                    break;
                }
            }
            else if (type === "video" && !data.vtpl) {
                i = this._createTemplate("vtpl", lines, i);
                if (data.atpl) {
                    break;
                }
            }
            else {
                i = nextMline(lines, i + 1);
            }
        }
        for (i = nextMline(lines, 0); i < lines.length;) {
            i = this._addTrack(lines, i);
        }
    }
    _createTemplate(tname, lines, i) {
        let template = lines[i++] + endl;
        for (; i < lines.length; i++) {
            let line = lines[i];
            let ltype = line.charAt(0);
            if (ltype === 'm') {
                break;
            }
            if (ltype !== 'a') {
                template += line + endl;
                continue;
            }
            let name = nextWord(line, 2)[0];
            if (name === "recvonly") { // we don't want to make a template from a recvonly description
                // consume lines till next m-line
                return nextMline(lines, i);
            }
            switch (name) {
                case "sendrecv":
                case "sendonly":
                case "ssrc-group":
                case "ssrc":
                case "mid":
                case "msid":
                    continue;
                default:
                    template += line + endl;
            }
        }
        this.data[tname] = template;
        return i;
    }
    _addTrack(lines, i) {
        let type = lines[i++].substr(2, 5);
        if (type === "audio") {
            type = "a";
        }
        else if (type === "video") {
            type = "v";
        }
        ;
        let track = new Track(type);
        let ssrcIds = new Set;
        for (; i < lines.length; i++) {
            let line = lines[i];
            let ltype = line.charAt(0);
            if (ltype === 'm') {
                break;
            }
            if (ltype !== 'a') {
                continue;
            }
            let name = nextWord(line, 2)[0];
            switch (name) {
                case "sendrecv":
                case "recvonly":
                case "sendonly": {
                    track.dir = name;
                    break;
                }
                case "mid": {
                    track.mid = parseInt(line.substr(6));
                    break;
                }
                case "msid": {
                    let parts = line.substr(7).split(' ');
                    track.sid = parts[0];
                    track.id = parts[1];
                    break;
                }
                case "ssrc-group": {
                    if (!track.ssrcg) {
                        track.ssrcg = [];
                    }
                    track.ssrcg.push(line.substr(13));
                    break;
                }
                case "ssrc": {
                    let ret = nextWord(line, 7);
                    let id = parseInt(ret[0]);
                    if (ssrcIds.has(id)) {
                        break;
                    }
                    ssrcIds.add(id);
                    ret = nextWord(line, ret[1] + 1);
                    let cname = nextWord(line, ret[1] + 1)[0];
                    let ssrc = new Ssrc(id);
                    if (cname !== track.sid) {
                        ssrc.cname = cname;
                    }
                    if (!track.ssrcs) {
                        track.ssrcs = [ssrc];
                    }
                    else {
                        track.ssrcs.push(ssrc);
                    }
                    break;
                }
            }
        }
        this.data.tracks.push(track);
        return i;
    }
    uncompress() {
        let sdp = this.data.cmn;
        for (let track of this.data.tracks) {
            if (track.t === "a") {
                sdp += Track.uncompress(track, this.data.atpl);
            }
            else if (track.t === "v") {
                sdp += Track.uncompress(track, this.data.vtpl);
            }
        }
        return sdp;
    }
}
function nextWord(line, start) {
    let i;
    for (i = start; i < line.length; i++) {
        let ch = line.charCodeAt(i);
        if ((ch >= 97 && ch <= 122) || // a - z
            (ch >= 65 && ch <= 90) || // A - Z
            (ch >= 48 && ch <= 57) || // 0 - 9
            (ch === 45) || (ch === 43) || (ch === 47) || (ch === 95)) { // - + /
            continue;
        }
        break;
    }
    return [line.substr(start, i - start), i];
}
function nextMline(lines, i) {
    for (; i < lines.length; i++) {
        if (lines[i].charAt(0) === "m") {
            return i;
        }
    }
    return i;
}
function sdpCompress(sdp) {
    /*
    console.log("original:\n", sdp);
    let csdp = (new CompressedSdp(sdp)).uncompress();
    console.log("compressed:\n", csdp);
    */
    //  return sdp;
    return (new CompressedSdp(sdp)).data;
}
function sdpUncompress(sdp) {
    //  return sdp;
    return (new CompressedSdp(sdp)).uncompress();
}
function trackSummary(tracks) {
    let summary = "";
    if (tracks.tx) {
        summary += tracks.tx + " send";
    }
    else {
        summary += tracks.rx + " recv";
    }
    if (tracks.txrx) {
        summary += ", " + tracks.txrx + " sendrecv";
    }
    return summary;
}
function compressedSdpToString(sdp) {
    let video = { rx: 0, tx: 0, txrx: 0, svc: 0 };
    let audio = { rx: 0, tx: 0, txrx: 0 };
    for (let track of sdp.tracks) {
        let type = track.t;
        let dir = track.dir;
        let info;
        if (type === "v") {
            info = video;
            if (track.ssrcg) {
                for (let ssrcg of track.ssrcg) {
                    if (ssrcg.substr(0, 3) === "SIM") {
                        video.svc++;
                    }
                }
            }
        }
        else {
            info = audio;
        }
        if (dir === "recvonly") {
            info.rx++;
        }
        else if (dir === "sendrecv") {
            info.txrx++;
        }
        else if (dir === "sendonly") {
            info.tx++;
        }
    }
    let summary = "<vtracks: " + trackSummary(video);
    if (video.svc) {
        summary += ", " + video.svc + " SVC";
    }
    summary += "; atracks: " + trackSummary(audio) + ">";
    return summary;
}

;// CONCATENATED MODULE: ../shared/base64.ts
var b64 = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_="];
function base64encode(data, offs, len) {
    const end = offs + len;
    let str = "";
    do { // pack three octets into four hexets
        const o1 = data.getUint8(offs++);
        const o2 = offs < end ? data.getUint8(offs++) : 0;
        const o3 = offs < end ? data.getUint8(offs++) : 0;
        const bits = o1 << 16 | o2 << 8 | o3;
        str += b64[bits >> 18 & 0x3f] + b64[bits >> 12 & 0x3f] + b64[bits >> 6 & 0x3f] + b64[bits & 0x3f];
    } while (offs < end);
    const r = len % 3;
    return (r ? str.slice(0, r - 3) : str);
}
function base64ArrEncode(arr) {
    return base64encode(new DataView(arr.buffer || arr), 0, arr.byteLength);
}
const b64dectable = [
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 62, 255, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 255, 255, 255,
    255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 63,
    255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
];
class StringAppender {
    constructor() {
        this.value = "";
    }
    append(byte) {
        this.value += String.fromCharCode(byte);
    }
}
class ArrayAppender {
    constructor(size) {
        this.len = 0;
        this.value = new Uint8Array(size);
    }
    append(byte) {
        this.value[this.len++] = byte;
    }
}
function doBase64Decode(str, out) {
    const len = str.length;
    const mod = len % 4;
    if ((mod !== 0) && (mod < 2)) {
        throw new Error("Incorrect size of base64 string, size mod 4 must be at least 2");
    }
    for (let i = 0; i < len;) {
        const one = b64dectable[str.charCodeAt(i++)];
        if (one > 63) {
            throw new Error(`Invalid char ${str[i]} in base64 stream at offset ${i - 1}`);
        }
        const two = b64dectable[str.charCodeAt(i++)];
        if (two > 63) {
            throw new Error(`Invalid char ${str[i]} in base64 stream at offset ${i - 1}`);
        }
        out.append((one << 2) | (two >> 4));
        if (i >= len) {
            break;
        }
        const three = b64dectable[str.charCodeAt(i++)];
        if (three > 63) {
            throw new Error(`Invalid char ${str[i]} in base64 stream at offset ${i - 1}`);
        }
        out.append(((two << 4) & 0xff) | (three >> 2));
        if (i >= len) {
            break;
        }
        const four = b64dectable[str.charCodeAt(i++)];
        if (four > 63) {
            throw new Error(`Invalid char ${str[i]} in base64 stream at offset ${i - 1}`);
        }
        out.append(((three << 6) & 0xff) | four);
    }
}
function base64decode(str) {
    const out = new StringAppender;
    doBase64Decode(str, out);
    return out.value;
}
function base64DecodeToArr(str) {
    const out = new ArrayAppender(Math.floor(str.length * 6 / 8));
    doBase64Decode(str, out);
    if (out.value.length !== out.len) {
        throw new Error("Assertion failed");
    }
    return out.value;
}

;// CONCATENATED MODULE: ./adaptation.ts


const kLogTag = "sfuAdapt:";
class SvcDriver {
    constructor(client) {
        this.currRxQuality = SvcDriver.kDefaultRxQualityIndex;
        this.currTxQuality = SvcDriver.kDefaultTxQualityIndex;
        // rtt window
        this.lowestRttSeen = 10000; // force recalculation on first stat sample
        this.rxqSwitchSeqNo = 0;
        this.rxqUpSwitchHistory = new Array(SvcDriver.kMaxRxQualityIndex + 1);
        this.hasBadNetwork = false;
        this.isCpuOverloaded = false;
        this.client = client;
    }
    async onStats() {
        const stats = this.client.rtcStats;
        let { txpl: plost, rtt } = stats;
        if (isNaN(rtt)) {
            return;
        }
        if (plost < 0) {
            plost = stats.rxpl;
        }
        if (plost < 0) {
            plost = 0;
        }
        if (isNaN(this.maRtt)) {
            this.maRtt = rtt;
            this.smaPlost = this.fmaPlost = plost;
            return; // intentionally skip first sample for lower/upper range calculation
        }
        rtt = this.maRtt = (this.maRtt * 2 + rtt) / 3;
        if (rtt < this.lowestRttSeen) {
            this.setRttWindow(rtt);
        }
        this.updatePlostWindow(plost);
        plost = this.fmaPlost = (this.fmaPlost * 2 + plost) / 3;
        do {
            if (window.dSfuAdapt) {
                console.log(kLogTag, "rtt:", rtt.toFixed(1), "rttLower:", this.rttLower.toFixed(1), "rttUpper:", this.rttUpper.toFixed(1), "plost:", plost.toFixed(1), "fmaPlost:", this.fmaPlost.toFixed(1), "plostLower", this.plostLower.toFixed(1), "plostUpper:", this.plostUpper.toFixed(1));
            }
        } while (0);
        const tsNow = Date.now();
        if (!this.tsNoSwitchUntil) {
            this.tsNoSwitchUntil = tsNow;
            return;
        }
        let maTxKbps;
        const adaptScrnTx = stats._vtxIsHiRes && this.client.isSendingScreenHiRes();
        if (adaptScrnTx) { // calculate tx average kbps
            const txBwidth = (stats.txBwe > 0) ? stats.txBwe : stats._vtxkbps;
            maTxKbps = this.maTxKbps = isNaN(this.maTxKbps)
                ? txBwidth
                : (this.maTxKbps * 5 + txBwidth) / 6;
            do {
                if (window.dSfuAdapt) {
                    console.log(kLogTag, "scrshare: maTxKbps:", maTxKbps, "mom:", txBwidth);
                }
            } while (0);
        }
        if (tsNow < this.tsNoSwitchUntil) {
            return; // too early
        }
        if (plost > this.plostUpper) {
            do {
                if (window.d) {
                    console.log(kLogTag, "Decreasing rxQ due to PACKET LOSS of", plost.toFixed(1));
                }
            } while (0);
            this.decRxQuality(plost >= SvcDriver.kPlostCap);
        }
        else if (rtt > this.rttUpper) { // rtt or packet loss increased above thresholds
            this.decRxQualityDueToRtt(stats);
        }
        else if (rtt < this.rttLower && plost < this.plostLower) {
            this.incRxQuality();
        }
        const txQs = SvcDriver.TxQuality;
        if (adaptScrnTx) {
            const currTxQ = SvcDriver.TxQuality[this.currTxQuality];
            if (maTxKbps < currTxQ.minKbps) {
                let q = this.currTxQuality;
                while (maTxKbps < txQs[q].minKbps) {
                    q--;
                    if (q < 0) {
                        q = 0;
                        break;
                    }
                }
                const delta = q - this.currTxQuality;
                if (delta < 0) {
                    this.switchTxQuality(delta);
                }
            }
            else if (stats.vtxdly > 2500) {
                do {
                    if (window.d) {
                        console.log(kLogTag, `scrnshare: Tx delay ${stats.vtxdly} ms too large, decreasing quality...`);
                    }
                } while (0);
                this.switchTxQuality(-1);
            }
            else if (stats.vtxdly > 0 && stats.vtxdly < 1400) {
                let q = this.currTxQuality;
                while (maTxKbps > txQs[q].maxKbps) {
                    q++;
                    if (q >= txQs.length) {
                        q--;
                        break;
                    }
                }
                const delta = q - this.currTxQuality;
                if (delta > 0) {
                    this.switchTxQuality(delta);
                }
            }
        }
        // handle "bad network" notification
        let txBad = !isNaN(stats.vtxdly) && (stats.vtxdly > 1500);
        if (adaptScrnTx) {
            txBad = txBad || this.currTxQuality < 1;
        }
        else if (stats._vtxIsHiRes && stats.vtxh) {
            this.maVideoTxHeight = !isNaN(this.maVideoTxHeight) ? (this.maVideoTxHeight * 3 + stats.vtxh) / 4 : stats.vtxh;
            txBad = txBad || (this.maVideoTxHeight < 200);
        }
        const statFlags = stats.f;
        const rxBad = (rtt > 1500) || (plost > 30);
        const hasBadNet = (txBad || rxBad);
        if (hasBadNet !== this.hasBadNetwork) {
            this.hasBadNetwork = hasBadNet;
            this.client._fire("onBadNetwork", hasBadNet);
        }
        const isCpuOverloaded = (statFlags & 1 /* TxQualityLimit.kCpu */) !== 0;
        if (isCpuOverloaded !== this.isCpuOverloaded) {
            this.isCpuOverloaded = isCpuOverloaded;
            this.client._fire("onCpuOverload", isCpuOverloaded);
        }
    }
    setRttWindow(rtt) {
        this.lowestRttSeen = rtt;
        this.rttLower = rtt + SvcDriver.kRttLowerHeadroom;
        this.rttUpper = rtt + SvcDriver.kRttUpperHeadroom;
        do {
            if (window.d) {
                console.log(kLogTag, "Rtt floor set to", rtt.toFixed(2));
            }
        } while (0);
    }
    updatePlostWindow(plost) {
        plost = Math.min(plost, SvcDriver.kPlostCap);
        plost = this.smaPlost = (this.smaPlost * 29 + plost) / 30;
        this.plostLower = plost + SvcDriver.kPlostLowerHeadroom;
        this.plostUpper = plost + SvcDriver.kPlostUpperHeadroom;
    }
    decRxQuality(critical) {
        if (this.currRxQuality <= 0) {
            return false;
        }
        const newQ = this.currRxQuality - 1;
        const hist = this.rxqUpSwitchHistory[newQ];
        const now = Date.now();
        if (hist) {
            const timeMatch = now <= hist.tsMonitorTill;
            if ((hist.hiArea === this.rxTotalArea()) && (critical || timeMatch)) {
                let span = SvcDriver.kRxUpFailDur;
                if (hist.upFails) {
                    if (critical && timeMatch) {
                        span += SvcDriver.kRxUpFailMaxExtendPeriod; // critical decreases get maximum validity time
                    }
                    else {
                        // extend the validity based on how recent the last fail was and how many total fails occurred
                        let decay = hist.tsMonitorTill + SvcDriver.kRxUpFailMaxExtendPeriod - now;
                        if (decay > 0) {
                            decay = decay * hist.upFails * SvcDriver.kRxUpFailDurDecayMult;
                            if (decay > SvcDriver.kRxUpFailMaxExtendPeriod) {
                                decay = SvcDriver.kRxUpFailMaxExtendPeriod;
                            }
                        }
                        span += decay;
                    }
                }
                hist.upFails++;
                hist.tsValidTill = now + span;
                do {
                    if (window.d) {
                        console.log(kLogTag, `decRxQuality[${this.currRxQuality} -> ${newQ}]: Marking rx quality switch up attempt as failed: critcal: ${!!critical}, for period: ${span}`);
                    }
                } while (0);
            }
            else {
                do {
                    if (window.d) {
                        console.log(kLogTag, `decRxQuality[${this.currRxQuality} -> ${newQ}]: not marking as failed: areaMatch: ${hist.hiArea === this.rxTotalArea()}, timeMatch: ${Date.now() - hist.tsMonitorTill}`);
                    }
                } while (0);
            }
        }
        this.setRxQuality(newQ, SvcDriver.kQualityDecreaseSettleTime);
        return true;
    }
    incRxQuality() {
        delete this.rxRttDowngr;
        if (this.currRxQuality >= SvcDriver.kMaxRxQualityIndex) {
            return false;
        }
        const now = Date.now();
        const stats = this.client.rtcStats;
        let hist = this.rxqUpSwitchHistory[this.currRxQuality];
        let histMatch;
        if (hist) {
            // positive matching is the conservative stragegy - by matching we block the rx quality increase
            const kbpsMatch = stats.rx <= hist.kbps * 1.5;
            const rttMatch = this.maRtt > hist.rtt - 50;
            histMatch = hist.upFails && kbpsMatch && rttMatch && hist.lowArea <= this.rxTotalArea();
            if (histMatch && (hist.tsValidTill - now) >= 0) {
                do {
                    if (window.d) {
                        console.log(kLogTag, `incRxQuality[${this.currRxQuality} -> ${this.currRxQuality + 1}]: Not increasing rxQ, have failed recently`);
                    }
                } while (0);
                return;
            }
            else {
                do {
                    if (window.d) {
                        console.log(kLogTag, `incRxQuality[${this.currRxQuality} -> ${this.currRxQuality + 1}]: not failed(recently): upFails:${hist.upFails}, timeMatch: ${(hist.tsValidTill - now)}, kbpsMatch: ${kbpsMatch} (hist: ${hist.kbps}, curr: ${stats.rx}), rttMatch: ${rttMatch} (hist: ${hist.rtt.toFixed()}, curr: ${this.maRtt.toFixed()}), areaDiff: ${this.rxTotalArea() - hist.lowArea}`);
                    }
                } while (0);
            }
        }
        if (histMatch) {
            hist.tsMonitorTill = now + SvcDriver.kRxUpFailMonitorDur;
            hist.kbps = stats.rx;
            hist.rtt = stats.rtt;
            do {
                if (window.d) {
                    console.log(kLogTag, `incRxQuality[${this.currRxQuality} -> ${this.currRxQuality + 1}]: Same up-fail parameters, preserving fail descriptor`);
                }
            } while (0);
        }
        else {
            hist = this.rxqUpSwitchHistory[this.currRxQuality] = {
                upFails: 0, tsValidTill: 0,
                tsMonitorTill: now + SvcDriver.kRxUpFailMonitorDur,
                kbps: stats.rx, rtt: this.maRtt, lowArea: this.rxTotalArea()
            };
            do {
                if (window.d) {
                    console.log(kLogTag, `incRxQuality[${this.currRxQuality} -> ${this.currRxQuality + 1}]: Created new up-fail descriptor`);
                }
            } while (0);
        }
        // we can't know the area after quality increasing before the actual quality switch takes place, so we do it
        // with a delay
        this.setRxQuality(this.currRxQuality + 1, SvcDriver.kQualityIncreaseSettleTime);
        setTimeout(() => {
            if (this.client.connState === ConnState.kCallJoined) {
                hist.hiArea = this.rxTotalArea();
            }
        }, SvcDriver.kQualityIncreaseSettleTime - 1000);
        return true;
    }
    setRxQuality(newQ, deadTime) {
        const params = SvcDriver.RxQuality[newQ];
        assert(params);
        this.tsNoSwitchUntil = Date.now() + deadTime;
        this.rxqSwitchSeqNo++;
        do {
            if (window.d) {
                console.log(kLogTag, `Switching rx SVC quality from ${this.currRxQuality} to ${newQ}: ${JSON.stringify(params)}`);
            }
        } while (0);
        this.currRxQuality = newQ;
        this.client.requestSvcLayers(params[0], params[1], params[2]);
    }
    decRxQualityDueToRtt(stats) {
        if (!this.rxRttDowngr) {
            if (this.currRxQuality > 0) {
                do {
                    if (window.d) {
                        console.log(kLogTag, `Decreasing rxQ due to HIGH RTT of ${this.maRtt.toFixed()}, saving checkpoint`);
                    }
                } while (0);
                this.rxRttDowngr = { startQ: this.currRxQuality, lastRtt: stats.rtt, lastPlost: stats.pl };
                this.decRxQuality();
            }
            return;
        }
        // we have rxRttDowngr, see if the downgrade is affecting rtt
        const nSteps = this.rxRttDowngr.startQ - this.currRxQuality;
        if (nSteps > 0) {
            // we have stepped down at least once:
            // If rtt did not really decrease, is not too big (to be influenced by our q step down), and there is no extraordinary
            // packet loss, then assume the high rtt is not due to network congestion
            if ((this.fmaPlost <= this.plostLower) && (stats.rtt < 1000) && (Math.abs(stats.rtt - this.rxRttDowngr.lastRtt) < 16)) {
                // rtt did not change
                do {
                    if (window.d) {
                        console.log(kLogTag, `Decreased rxQ by ${nSteps} steps: rtt didnt change much (${stats.rtt - this.rxRttDowngr.lastRtt}), is not over 1000 and there is no extra packet loss. Updating rtt floor`);
                    }
                } while (0);
                this.setRttWindow(this.maRtt);
                // reset the checkpoint as well - otherwise we may ignore a future rtt decrease
                // on top of the current increase
                this.rxRttDowngr = { startQ: this.currRxQuality, lastRtt: stats.rtt, lastPlost: stats.pl };
                return; // dont decrease quality
            }
            else if (this.currRxQuality > 0) {
                // rtt changed - could be decreasing from the quality downgrade, or still rising
                // because of network conditions. Either way, we should further downgrade quality
                do {
                    if (window.d) {
                        console.log(kLogTag, `Decreased rxQ by ${nSteps} steps: rtt ${stats.rtt} changed by ${Math.round(stats.rtt - this.rxRttDowngr.lastRtt)}, plost: ${this.fmaPlost.toFixed(1)}. Keeping current rtt floor of ${this.lowestRttSeen.toFixed(2)}`);
                    }
                } while (0);
                this.rxRttDowngr = { startQ: this.currRxQuality, lastRtt: stats.rtt, lastPlost: stats.pl };
            }
        }
        this.decRxQuality();
    }
    switchTxQuality(delta) {
        let newQ = this.currTxQuality + delta;
        if (newQ < 0) {
            newQ = 0;
        }
        else if (newQ > SvcDriver.kMaxTxQualityIndex) {
            newQ = SvcDriver.kMaxTxQualityIndex;
        }
        if (newQ === this.currTxQuality) {
            return false;
        }
        return this.setTxQuality(newQ);
    }
    setTxQuality(newQ) {
        const track = this.client.outVSpeakerTrack.sentTrack;
        if (!track) {
            return false;
        }
        const info = SvcDriver.TxQuality[newQ];
        assert(info);
        this.tsNoSwitchUntil = Date.now() + SvcDriver.kQualityIncreaseSettleTime;
        const params = info.scr;
        let ar = this.client.screenAspectRatio;
        if (!ar) {
            const res = track.getSettings();
            if (res.width && res.height) {
                ar = this.client.screenAspectRatio = res.width / res.height;
                do {
                    if (window.d) {
                        console.log(kLogTag, `Screen capture res: ${res.width}x${res.height} (aspect ratio: ${Math.round(ar * 1000) / 1000})`);
                    }
                } while (0);
            }
            else {
                ar = 1.78;
                do {
                    if (window.d) {
                        console.log(kLogTag, "setTxQuality: Could not obtain screen track's resolution, assuming AR of", ar);
                    }
                } while (0);
            }
        }
        params.width = Math.round(params.height * ar);
        do {
            if (window.d) {
                console.log(kLogTag, `Switching TX quality from ${this.currTxQuality} to ${newQ}: ${JSON.stringify(params)} (AR: ${this.client.screenAspectRatio ? this.client.screenAspectRatio.toFixed(3) : "unknown"})`);
            }
        } while (0);
        this.currTxQuality = newQ;
        track.applyConstraints(params);
        return true;
    }
    rxTotalArea() {
        let area = 0;
        for (const peer of this.client.peers.values()) {
            if ((peer.av & Av.onHold)) {
                continue;
            }
            const slot = peer.hiResSlot;
            if (slot) {
                const props = slot.inTrack.getSettings();
                area += (props.width || 0) * (props.height || 0);
            }
        }
        return area;
    }
    initTx() {
        if (this.client.isSendingScreenHiRes()) {
            // need small delay to have the track started
            setTimeout(this.setTxQuality.bind(this, SvcDriver.kDefaultTxQualityIndex), 100);
        }
    }
}
SvcDriver.kRttLowerHeadroom = 20;
SvcDriver.kRttUpperHeadroom = 100;
SvcDriver.kPlostUpperHeadroom = 10; // plostUpper = smaPlost + this
SvcDriver.kPlostLowerHeadroom = 2; // plostLower = smaPlost + this
SvcDriver.kPlostCap = 40; // cap on adaptive continuous packet loss reference .smaPlost
SvcDriver.kQualityDecreaseSettleTime = 6000;
SvcDriver.kQualityIncreaseSettleTime = 4000;
SvcDriver.kRxUpFailMonitorDur = 40000;
SvcDriver.kRxUpFailDur = 40000;
SvcDriver.kRxUpFailMaxExtendPeriod = 140000;
SvcDriver.kRxUpFailDurDecayMult = 0.5;
// (427)x240 - sends only one spatial layer, i.e. receiver can't get lower resolution than 240
// (640)x360 - 2 spatial layers: receiver can get x180 or x360
// (852)x480 - 2 spatial layers: 240 and 480
// (960)x540 - 3 spatial layers: 136, 270 and 540. This is the camera capture resolution
// anything above x540 is only for screen sharing, where there are no spatial layers
// (1028)x578 - screen sharing
// Array(spatial, temporal, screen-temporal)
SvcDriver.RxQuality = [
    [0, 0, 0],
    [0, 1, 0],
    [0, 2, 0],
    [1, 1, 1],
    [1, 2, 1],
    [2, 1, 2],
    [2, 2, 2], //6
];
SvcDriver.kMaxRxQualityIndex = SvcDriver.RxQuality.length - 1;
SvcDriver.kDefaultRxQualityIndex = 4; // start at half resolution, full fps
// minKbps, maxKbps, scr: constraints for applyConstraints() on sent screen track
// avoid too high resolutions as packet loss can easily drop very large fragmented frames
SvcDriver.TxQuality = [
    { minKbps: 0, maxKbps: 50, scr: { height: 240, frameRate: 4 } },
    { minKbps: 40, maxKbps: 300, scr: { height: 540, frameRate: 4 } },
    { minKbps: 280, maxKbps: 700, scr: { height: 720, frameRate: 4 } },
    { minKbps: 680, maxKbps: 1100, scr: { height: 840, frameRate: 4 } },
    { minKbps: 1000, maxKbps: 1600, scr: { height: 1080, frameRate: 4 } },
    { minKbps: 1500, maxKbps: 2100, scr: { height: 1080, frameRate: 8 } },
    { minKbps: 2000, maxKbps: 4100, scr: { height: 1080, frameRate: 16 } },
    { minKbps: 4000, maxKbps: 9000, scr: { height: 1200, frameRate: 8 } } // 6
    //      { minKbps: 1700, maxKbps: 2000, scr: { height: 1200, frameRate: 8 }},  // 6
    //      { minKbps: 1900, maxKbps: 4000, scr: { height: 1440, frameRate: 8 }}   // 7
];
SvcDriver.kMaxTxQualityIndex = SvcDriver.TxQuality.length - 1;
SvcDriver.kDefaultTxQualityIndex = 3;
SvcDriver.kScreenCaptureHeight = SvcDriver.TxQuality[SvcDriver.kMaxTxQualityIndex].scr.height;

;// CONCATENATED MODULE: ./recordingLogo.ts
//export default const kLogoImageBlobUrl = "data:image/svg+xml,%3Csvg xml:space='preserve' width='362' height='361.39999' viewBox='0 0 362 361.39998' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23d9272e' d='M 180.7,0 C 80.9,0 0,80.9 0,180.7 c 0,99.8 80.9,180.7 180.7,180.7 99.8,0 180.7,-80.9 180.7,-180.7 C 361.4,80.9 280.5,0 180.7,0 Z m 93.8,244.6 c 0,3.1 -2.5,5.6 -5.6,5.6 h -23.6 c -3.1,0 -5.6,-2.5 -5.6,-5.6 v -72.7 c 0,-0.6 -0.7,-0.9 -1.2,-0.5 l -50,50 c -4.3,4.3 -11.4,4.3 -15.7,0 l -50,-50 c -0.4,-0.4 -1.2,-0.1 -1.2,0.5 v 72.7 c 0,3.1 -2.5,5.6 -5.6,5.6 H 92.4 c -3.1,0 -5.6,-2.5 -5.6,-5.6 V 116.8 c 0,-3.1 2.5,-5.6 5.6,-5.6 h 16.2 c 2.9,0 5.8,1.2 7.9,3.3 l 62.2,62.2 c 1.1,1.1 2.8,1.1 3.9,0 l 62.2,-62.2 c 2.1,-2.1 4.9,-3.3 7.9,-3.3 h 16.2 c 3.1,0 5.6,2.5 5.6,5.6 z' id='path2' /%3E%3C/svg%3E%0A";
const kLogoImageBlobUrl = "data:image/svg+xml,%3Csvg width='400' height='400' viewBox='0 0 105.83333 105.83333' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cellipse style='fill:%23d9272e;stroke:%23d9272e;stroke-width:0.3;image-rendering:optimizeQuality' cx='52.916664' cy='52.916668' rx='52.766827' ry='52.766823' /%3E%3Cpath fill='%232c2b2b' d='M 71.754659,33.510404 53.517721,51.730323 c -0.322518,0.322218 -0.820956,0.322218 -1.143473,0 L 34.10799,33.510404 c -0.615717,-0.615142 -1.436672,-0.966652 -2.316267,-0.966652 h -4.749814 c -0.908914,0 -1.641911,0.732313 -1.641911,1.640379 v 37.465075 c 0,0.908067 0.732997,1.640378 1.641911,1.640378 h 6.919481 c 0.908916,0 1.641911,-0.732311 1.641911,-1.640378 V 50.353577 c 0,-0.175755 0.205239,-0.263633 0.351838,-0.146462 l 14.659918,14.646237 c 1.260753,1.259576 3.342462,1.259576 4.603214,0 L 69.878189,50.207115 c 0.117279,-0.117171 0.351838,-0.02929 0.351838,0.146462 v 21.295629 c 0,0.908067 0.732996,1.640378 1.64191,1.640378 h 6.919482 c 0.908915,0 1.641911,-0.732311 1.641911,-1.640378 V 34.184131 c 0,-0.908066 -0.732996,-1.640379 -1.641911,-1.640379 h -4.749813 c -0.850276,0.02929 -1.671231,0.35151 -2.286947,0.966652 z' style='fill:%23ffffff;stroke-width:0.293061' /%3E%3C/svg%3E%0A";
/* harmony default export */ const recordingLogo = (kLogoImageBlobUrl);

;// CONCATENATED MODULE: ./recorder.ts


const recorder_kLogTag = "callRec:";
class RecorderFileSink {
    constructor() {
        this.file = null;
        this.output = null;
    }
    async init() {
        this.file = await window.showSaveFilePicker({
            suggestedName: "call-recording.webm",
            types: [{ description: "WEBM video", accept: { "video/webm": [".webm"] } }]
        });
        this.output = await this.file.createWritable({ keepExistingData: false });
    }
    onData(data) {
        if (!this.output) {
            do {
                if (window.d) {
                    console.warn(recorder_kLogTag, "RecorderFileSink.onData: Not initialized");
                }
            } while (0);
            return;
        }
        this.output.write(data);
    }
    close() {
        if (!this.output) {
            return;
        }
        this.output.close();
        this.output = this.file = null;
    }
}
class CallRecorder {
    constructor(sender, sink, videoHeight) {
        this.peerAudioInNodes = [];
        this.videoHeight = 720;
        this.recorder = null;
        this.localAv = -1;
        this.sender = sender;
        this.sink = sink;
        if (videoHeight) {
            this.videoHeight = videoHeight;
        }
    }
    async init(peerTracks) {
        this.initAudio(peerTracks);
        await this.initWebrtcConn();
        await this.initRecording();
    }
    initAudio(peerTracks) {
        this.audioCtx = new AudioContext();
        this.audioMixer = this.audioCtx.createChannelMerger(peerTracks.length + 1);
        this.audioDestNode = this.audioCtx.createMediaStreamDestination();
        this.audioMixer.connect(this.audioDestNode);
        this.updatePeerInputs(peerTracks);
    }
    updatePeerInputs(peerTracks) {
        if (this.peerAudioInNodes.length) {
            for (const node of this.peerAudioInNodes) {
                node.disconnect();
            }
            this.peerAudioInNodes = [];
        }
        for (const track of peerTracks) {
            const node = this.audioCtx.createMediaStreamSource(new MediaStream([track]));
            node.connect(this.audioMixer);
            this.peerAudioInNodes.push(node);
        }
    }
    async initWebrtcConn() {
        let resolve;
        const pms = new Promise((aResolve) => {
            resolve = aResolve;
        });
        const config = { sdpSemantics: 'unified-plan', optional: [{ "googCpuOveruseDetection": false }] };
        const pc1 = this.pc1 = new RTCPeerConnection(config);
        const pc2 = this.pc2 = new RTCPeerConnection(config);
        pc1.onicecandidate = (evt) => pc2.addIceCandidate(evt.candidate);
        pc2.onicecandidate = (evt) => pc1.addIceCandidate(evt.candidate);
        pc2.ontrack = (evt) => {
            resolve(evt.track);
        };
        pc1.addTransceiver("video", { direction: "sendonly" });
        const offer = await pc1.createOffer();
        await pc1.setLocalDescription(offer);
        await pc2.setRemoteDescription(pc1.localDescription);
        const answer = await pc2.createAnswer();
        await pc2.setLocalDescription(answer);
        await pc1.setRemoteDescription(pc2.localDescription);
        await pms;
        this.videoTx = pc1.getTransceivers()[0].sender;
        this.videoRx = pc2.getTransceivers()[0].receiver;
        const params = this.videoTx.getParameters();
        params.degradationPreference = "maintain-resolution";
        params.maxBitrate = 1024000000;
        await this.videoTx.setParameters(params);
    }
    async initRecording() {
        const recStream = new MediaStream([this.audioDestNode.stream.getAudioTracks()[0], this.videoRx.track]);
        const recorder = this.recorder = new MediaRecorder(recStream);
        recorder.onstop = () => {
            this.sink.close();
            this.recorder = null;
        };
        recorder.ondataavailable = (ev) => {
            // console.log("ondata");
            this.sink.onData(ev.data);
        };
    }
    recordLocalAudio() {
        const currLocalAudioTrack = this.sender.localAudioTrack();
        if (this.localAudioInNode && this.recordedLocalAudioTrack !== currLocalAudioTrack) {
            this.localAudioInNode.disconnect();
            delete this.localAudioInNode;
        }
        if (!this.localAudioInNode) {
            // the local audio track, once obtained, never changes, so we create the stream source node only once
            this.localAudioInNode = this.audioCtx.createMediaStreamSource(new MediaStream([currLocalAudioTrack]));
            this.recordedLocalAudioTrack = currLocalAudioTrack;
        }
        this.localAudioInNode.connect(this.audioMixer);
    }
    stopRecordingLocalAudio() {
        if (!this.localAudioInNode) {
            return;
        }
        this.localAudioInNode.disconnect();
        delete this.recordedLocalAudioTrack;
    }
    async _setVideoTrack(vTrack) {
        this.deinitStaticVideo();
        const cloned = vTrack.clone();
        try {
            await cloned.applyConstraints({
                resizeMode: "crop-and-scale",
                height: { exact: this.videoHeight }
                // width: this.videoHeight * 16 / 10
            });
            if (cloned.getSettings().height !== this.videoHeight) {
                throw new Error("applyConstraints to resize video had no effect");
            }
        }
        catch (ex) {
            do {
                if (window.d) {
                    console.warn(recorder_kLogTag, "Can't convert input video track to recording video resolution, video file may get broken:", ex.message);
                }
            } while (0);
        }
        if (this.isDestroyed()) { // destroyed meanwhile
            return;
        }
        return this.videoTx.replaceTrack(cloned);
    }
    switchToLocalVideo() {
        this._setVideoTrack((this.localAv & Av.Screen)
            ? this.sender.localScreenTrack()
            : this.sender.localCameraTrack());
    }
    setVideoInput(vTrack, releaseCb) {
        if (this.videoInput) {
            if (this.videoInput.releaseCb) {
                this.videoInput.releaseCb();
            }
            delete this.videoInput;
        }
        if (vTrack) {
            this.videoInput = { track: vTrack, releaseCb };
            this._setVideoTrack(vTrack);
        }
        else {
            this.switchToLocalOrStaticVideo();
        }
    }
    videoInputTrack() {
        return this.videoInput ? this.videoInput.track : null;
    }
    async switchToStaticVideo() {
        if (this.canvas) {
            do {
                if (window.d) {
                    console.log(recorder_kLogTag, "switchToStaticVideo: Already in static video mode");
                }
            } while (0);
            return;
        }
        const canv = this.canvas = window.document.createElement("canvas");
        canv.height = this.videoHeight;
        canv.width = this.videoHeight * 16 / 9;
        const logo = new Image;
        const pms = new Promise((resolve) => {
            logo.onload = resolve;
        });
        logo.src = recordingLogo;
        await pms;
        if (this.isDestroyed() || !this.canvas) {
            do {
                if (window.d) {
                    console.log(recorder_kLogTag, "switchToStaticVideo: destroyed or static video disabled while loading static image");
                }
            } while (0);
            return; // destroyed meanwhile, or stopped static video
        }
        const ctx = canv.getContext('2d');
        ctx.drawImage(logo, (canv.width - logo.width) / 2, (canv.height - logo.height) / 2);
        let tsPrev = Date.now();
        this.staticVideoRefreshTimer = setInterval(() => {
            this.canvas.getContext('2d').fillRect(0, 0, 1, 1);
            /*
            const now = Date.now();
            const period = now - tsPrev;
            tsPrev = now;
            if (period > 70) {
                LOGW("recorder: slow draw:", period);
            }
            */
        }, 60);
        const staticVtrack = this.canvas.captureStream(20).getVideoTracks()[0];
        do {
            if (window.d) {
                console.log(recorder_kLogTag, `static vtrack resolution: ${staticVtrack.getSettings().width}x${staticVtrack.getSettings().height}`);
            }
        } while (0);
        return this.videoTx.replaceTrack(staticVtrack);
    }
    deinitStaticVideo() {
        if (!this.canvas) {
            return;
        }
        clearInterval(this.staticVideoRefreshTimer);
        delete this.staticVideoRefreshTimer;
        delete this.canvas;
    }
    destroy() {
        if (!this.videoRx) {
            do {
                if (window.d) {
                    console.warn(recorder_kLogTag, "CallRecorder.destroy: already destroyed");
                }
            } while (0);
            return;
        }
        if (this.recorder) {
            this.recorder.stop();
        }
        this.pc1.close();
        this.pc2.close();
        delete this.pc1;
        delete this.pc2;
        this.deinitStaticVideo();
        if (this.localAudioInNode) {
            this.localAudioInNode.disconnect();
            delete this.localAudioInNode;
        }
        for (const node of this.peerAudioInNodes) {
            node.disconnect();
        }
        delete this.peerAudioInNodes;
        this.audioMixer.disconnect();
        delete this.audioMixer;
        delete this.audioDestNode;
        this.audioCtx.close();
        delete this.audioCtx;
        if (this.videoTx) {
            if (this.videoTx.track) {
                this.videoTx.track.stop();
            }
            delete this.videoTx;
        }
        if (this.videoRx) {
            if (this.videoRx.track) {
                this.videoRx.track.stop();
            }
            delete this.videoRx;
        }
    }
    isDestroyed() {
        return !this.videoRx;
    }
    onLocalMediaChange(updateAv) {
        const av = this.sender.availAv;
        let change = (this.localAv === -1) ? (Av.Audio | Av.Video) : this.localAv ^ av;
        this.localAv = av;
        if (updateAv) {
            change |= updateAv;
        }
        if (change & Av.Audio) {
            if (av & Av.Audio) {
                this.recordLocalAudio();
            }
            else {
                this.stopRecordingLocalAudio();
            }
        }
        if (!this.videoInput && (change & Av.Video)) {
            this.switchToLocalOrStaticVideo();
        }
    }
    switchToLocalOrStaticVideo() {
        if ((this.localAv & Av.Video) === 0) {
            this.switchToStaticVideo();
        }
        else {
            this.switchToLocalVideo();
        }
    }
    start() {
        this.onLocalMediaChange();
        this.recorder.start(2000);
    }
    pause() {
        this.recorder.pause();
    }
    resume() {
        this.recorder.resume();
    }
}

;// CONCATENATED MODULE: ../shared/commitId.ts
const COMMIT_ID = '40bfc52622';
/* harmony default export */ const commitId = (COMMIT_ID);

;// CONCATENATED MODULE: ./client.ts
/* Mega SFU Client library */







const client_kLogTag = "sfuClient:";
var ConnState;
(function (ConnState) {
    ConnState[ConnState["kDisconnected"] = 0] = "kDisconnected";
    ConnState[ConnState["kDisconnectedRetrying"] = 1] = "kDisconnectedRetrying";
    ConnState[ConnState["kConnecting"] = 2] = "kConnecting";
    ConnState[ConnState["kInWaitingRoom"] = 3] = "kInWaitingRoom";
    ConnState[ConnState["kCallJoining"] = 4] = "kCallJoining";
    ConnState[ConnState["kCallJoined"] = 5] = "kCallJoined";
})(ConnState || (ConnState = {}));
var ScreenShareType;
(function (ScreenShareType) {
    ScreenShareType[ScreenShareType["kInvalid"] = 0] = "kInvalid";
    ScreenShareType[ScreenShareType["kWholeScreen"] = 1] = "kWholeScreen";
    ScreenShareType[ScreenShareType["kWindow"] = 2] = "kWindow";
    ScreenShareType[ScreenShareType["kBrowserTab"] = 3] = "kBrowserTab";
})(ScreenShareType || (ScreenShareType = {}));
var CallJoinPermission;
(function (CallJoinPermission) {
    CallJoinPermission[CallJoinPermission["kUnknown"] = 0] = "kUnknown";
    CallJoinPermission[CallJoinPermission["kAllow"] = 1] = "kAllow";
    CallJoinPermission[CallJoinPermission["kDeny"] = 2] = "kDeny";
})(CallJoinPermission || (CallJoinPermission = {}));
var TxTrackIndex;
(function (TxTrackIndex) {
    TxTrackIndex[TxTrackIndex["kVthumb"] = 0] = "kVthumb";
    TxTrackIndex[TxTrackIndex["kHiRes"] = 1] = "kHiRes";
    TxTrackIndex[TxTrackIndex["kAudio"] = 2] = "kAudio";
})(TxTrackIndex || (TxTrackIndex = {}));
class SfuClient {
    constructor(userId, app, callKey, options) {
        this.peers = new Map();
        this._numRxHiRes = 0;
        this._numRxVthumb = 0;
        this._numRxAudio = 0;
        this._isSharingScreen = false;
        this._muteCamera = false;
        this._muteAudio = false;
        this._sendVthumb = false;
        this._sendHires = false;
        this._cameraTrack = null;
        this._screenTrack = null;
        this._audioTrack = null;
        this._availAv = 0;
        this._sentAv = 0;
        this._joinRetries = 0;
        this._forcedDisconnect = false;
        this._tsCallJoin = 0;
        this._tsCallStart = 0;
        this.joinToffs = 0;
        this.statCtx = {};
        this.hasConnStats = false;
        this.maxPeers = 0;
        this.micAudioLevel = 0;
        this.tsMicAudioLevel = 0;
        if (!SfuClient.platformHasSupport()) {
            throw new Error("This browser does not support insertable streams");
        }
        if (!window.nacl) {
            throw new Error("Nacl library not present in global namespace");
        }
        this.assert(options);
        this.userId = userId;
        this.app = app;
        this._reqBarrier = new RequestBarrier;
        this._connState = ConnState.kDisconnected;
        this.options = options;
        if (callKey) {
            this.setCallKey(callKey);
        }
        this.numInputVideoTracks = options.numVideoSlots || SfuClient.kMaxVideoSlotsDefault;
        this.cryptoWorker = new Worker(SfuClient.kWorkerUrl);
        this.cryptoWorker.addEventListener("message", this.onCryptoWorkerEvent.bind(this));
        this._svcDriver = new SvcDriver(this);
        this._speakerDetector = new SpeakerDetector(this);
        this._statsRecorder = new StatsRecorder(this);
        this.micMuteMonitor = new MicMuteMonitor(this);
    }
    get micInputSeen() {
        return this.micMuteMonitor.micInputSeen;
    }
    static platformHasSupport() {
        return window.RTCRtpSender &&
            !!RTCRtpSender.prototype.createEncodedStreams;
    }
    logError(...args) {
        console.error.apply(console, args);
        this.remoteLogError(args.join(' '));
    }
    remoteLogError(msg) {
        let url = `${SfuClient.kStatServerUrl}/msglog?userid=${this.userId}&t=e`;
        if (this.callId) {
            url += `&callid=${this.callId}`;
        }
        fetch(url, { method: "POST", body: msg });
    }
    assert(cond) {
        if (cond) {
            return;
        }
        const ex = new Error("Assertion failed");
        this.remoteLogError(ex.stack);
        throw ex;
    }
    onCryptoWorkerEvent(event) {
        let msg = event.data;
        do {
            if (window.d) {
                console.log(client_kLogTag, "Message from crypto worker:", msg);
            }
        } while (0);
        if ((msg.op === "keyset") && (this.keySetPromise && msg.keyId === this.keySetPromise.keyId)) {
            this.keySetPromise.resolve();
            delete this.keySetPromise;
        }
    }
    get isModerator() {
        return this.moderators ? this.moderators.has(this.userId) : true;
    }
    get isSpeaker() {
        return !this.speakApproval || this.isModerator || this.speakers.has(this.userId);
    }
    get hasSpeakRequest() {
        return this.speakRequests.has(this.userId);
    }
    get isJoining() {
        return this._connState < ConnState.kCallJoined;
    }
    get isLeavingCall() {
        return !isNaN(this.termCode);
    }
    get connState() {
        return this._connState;
    }
    get callJoinPermission() {
        return this._callJoinPermission;
    }
    get numRxHiRes() {
        return this._numRxHiRes;
    }
    get numRxVthumb() {
        return this._numRxVthumb;
    }
    get numRxAudio() {
        return this._numRxAudio;
    }
    get haveBadNetwork() {
        return this._svcDriver.hasBadNetwork;
    }
    willReconnect() {
        if (this._forcedDisconnect) {
            return false;
        }
        return SfuClient.isTermCodeRetriable(this.termCode);
    }
    static isTermCodeRetriable(termCode) {
        return termCode === termCodes.kRtcDisconn ||
            termCode === termCodes.kSigDisconn; // || termCode === TermCode.kSfuShuttingDown;
        // TODO: handle SFU shutdown gracefully and reconnect
    }
    onWsClose(event) {
        if (event && event.target !== this.conn) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "onWsClose: ignoring stale event for a previous websocket instance");
                }
            } while (0);
            return;
        }
        do {
            if (window.d) {
                console.warn(client_kLogTag, "Signaling connection closed");
            }
        } while (0);
        delete this.conn;
        const willReconnect = this.willReconnect(); // decides based on this.termCode
        if (willReconnect) {
            this.leaveCall(termCodes.kSigDisconn, ConnState.kDisconnectedRetrying);
            this.scheduleReconnect();
        }
        else {
            this.leaveCall(termCodes.kSigDisconn, ConnState.kDisconnected);
            if (this.callRecorder) {
                this.recordingStop();
            }
            this._stopLocalTracks();
        }
        this._fire("onDisconnect", this.termCode, willReconnect);
    }
    leaveCall(termCode, newState) {
        if (this.termCode == null) {
            this.termCode = termCode;
        }
        const oldState = this._connState;
        this._setConnState(newState);
        if (this.statTimer) {
            clearTimeout(this.statTimer);
        }
        this.disableStats();
        if (this.micMuteMonitor) {
            this.micMuteMonitor.stop();
        }
        if (oldState === ConnState.kCallJoined) {
            this._statsRecorder.submit(this.termCode);
        }
        this._closeMediaConnection();
        this._destroyAllPeers(this.termCode);
    }
    async scheduleReconnect() {
        let delay = this._joinRetries++ * 500;
        if (delay > 2000) {
            delay = 2000;
        }
        do {
            if (window.d) {
                console.warn(client_kLogTag, "Reconnecting in", delay, "ms....");
            }
        } while (0);
        await msDelay(delay);
        if (!this._forcedDisconnect) {
            this.reconnect();
        }
    }
    _closeMediaConnection() {
        if (this.rtcConn) {
            this.rtcConn.close();
            delete this.rtcConn;
        }
    }
    _destroyAllPeers(reason) {
        for (let peer of this.peers.values()) {
            peer.destroy(reason);
        }
        this.peers.clear();
    }
    _fire(evName, ...args) {
        let method = this.app[evName];
        if (!method) {
            do {
                if (window.d) {
                    console.log(client_kLogTag, `Unhandled event: ${evName}(${args.join(",")})`);
                }
            } while (0);
            return;
        }
        do {
            if (window.d) {
                console.log(client_kLogTag, `fire [${evName}](${args.join(',')})`);
            }
        } while (0);
        try {
            method.call(this.app, ...args);
        }
        catch (ex) {
            this.logError("Event handler for", evName, "threw exception:", ex.stack);
        }
    }
    async generateKey() {
        const tsStart = Date.now();
        const keyObj = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, ["encrypt", "decrypt"]);
        let key = await crypto.subtle.exportKey("raw", keyObj);
        do {
            if (window.d) {
                console.log(client_kLogTag, "Media key generated in", Date.now() - tsStart, "ms");
            }
        } while (0);
        this.xorWithCallKeyIfNeeded(key);
        let keyId = ++this._sendKeyIdGen;
        this._newestSendKey = {
            keyObj: keyObj,
            key: key,
            id: keyId
        };
        return this._newestSendKey;
    }
    /* If we set a key for the first time, we must wait for the operation to complete on the
    crypto thread. That's why we implement this method with feedback notification
    */
    async newKeyImmediate() {
        let key = this.currKey = await this.generateKey();
        this.assert(!this.keySetPromise); // previous calls must await for completion as well, which deletes the promise
        let pms = this.keySetPromise = createPromiseWithResolveMethods();
        pms.keyId = key.id;
        this.cryptoWorker.postMessage(['ek', key.id, key.keyObj, true]);
        return pms;
    }
    /** If we have a key and want to rotate it, some delay is introduced between broadcasting the key
    and using it. If multiple calls to this function overlap in time, we should not wait for
    the last to finish in order to set the key, as this may present a vulnerability to prevent
    actual key rotation with a flood of reconnects (or other rotation-triggering events)

    @returns Resolve as soon as key is generated
    */
    async rotateKey() {
        var self = this;
        if (!this.sentAv) {
            if (this.noSendKeyRotated) {
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, "rotateKey: Not rotating, already done once, and we are not sending media");
                    }
                } while (0);
                return;
            }
            else {
                this.noSendKeyRotated = true;
            }
        }
        do {
            if (window.d) {
                console.warn(client_kLogTag, "Rotate key");
            }
        } while (0);
        let key = await self.generateKey();
        self.encryptAndSendLastKeyToAllPeers()
            .then(async () => {
            await msDelay(SfuClient.kRotateKeyUseDelay);
            if (key.id > self.currKey.id) {
                self.currKey = key;
                self.cryptoWorker.postMessage(['ek', key.id, key.keyObj]);
            }
        });
    }
    setCallKey(key) {
        this.assert(key);
        var callKey = key instanceof ArrayBuffer ?
            new Uint32Array(key) :
            new Uint32Array(hexToBin(key).buffer);
        if (callKey.byteLength !== 16) {
            this.logError("Invalid format of call key: length is not 16 bytes");
            return;
        }
        this.assert(callKey.length === 4);
        this.callKey = callKey;
    }
    xorWithCallKeyIfNeeded(key) {
        if (!this.callKey) {
            return;
        }
        this.assert(key.byteLength === 16);
        let arr = new Uint32Array(key);
        let callKey = this.callKey;
        arr[0] ^= callKey[0];
        arr[1] ^= callKey[1];
        arr[2] ^= callKey[2];
        arr[3] ^= callKey[3];
    }
    async encryptAndSendLastKeyToAllPeers() {
        if (!this.peers.size) {
            return;
        }
        if (!this.sentAv) {
            return;
        }
        let key = this._newestSendKey;
        if (!key) {
            this.logError("No send key");
            return;
        }
        let keyData = key.key;
        let promises = [];
        for (let peer of this.peers.values()) {
            if (!peer.lastKeySent || peer.lastKeySent !== key) {
                promises.push(peer.encryptKey(keyData));
                peer.lastKeySent = key;
            }
        }
        if (promises.length === 0) {
            return;
        }
        let results = await Promise.all(promises);
        this.send({ a: "KEY", id: key.id & 0xff, data: results });
    }
    async msgKey(msg) {
        const peer = this.peers.get(msg.from);
        if (!peer) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "msgKey: Unknown peer cid", msg.from);
                }
            } while (0);
            return;
        }
        const keyId = msg.id;
        this.assert(!isNaN(keyId) && (keyId >= 0) && (keyId < 256));
        const key = await peer.decryptKey(msg.key);
        this.xorWithCallKeyIfNeeded(key);
        this.cryptoWorker.postMessage(['dk', msg.from, keyId, key]);
    }
    addVersionToUrl(url) {
        let and;
        if (url.endsWith("?")) {
            and = "";
        }
        else {
            let parsed = new URL(url);
            and = (parsed.search) ? "&" : "?";
        }
        return `${url}${and}v=${SfuClient.kProtocolVersion}`;
    }
    connect(url, callId, config) {
        url = this.url = this.addVersionToUrl(url);
        this.assert(callId);
        this.assert(config);
        this.callId = callId;
        this.callConfig = config;
        this._joinRetries = 0;
        this._forcedDisconnect = false;
        this.doConnect(this.url);
    }
    reconnect() {
        this.assert(!this._forcedDisconnect);
        this.assert(this.url);
        let url = this.url;
        if (!isNaN(this.cid)) {
            url += "&cid=" + this.cid;
        }
        this.doConnect(url);
    }
    doConnect(url) {
        this.reinit();
        this._setConnState(ConnState.kConnecting);
        this._fire("onConnecting");
        const ws = this.conn = new WebSocket(url, "svc");
        ws.onmessage = this.onPacket.bind(this);
        ws.onclose = this.onWsClose.bind(this);
    }
    /** (re-)initializes all call-related state, but doesn't touch the local streams,
     *  which may be kept running
     **/
    reinit() {
        if (this.cid) {
            this.prevCid = this.cid;
            delete this.cid;
        }
        delete this.rtcConn;
        this._sendKeyIdGen = -1;
        this.peers.clear();
        this._sendHires = this._sendVthumb = false;
        this._sentAv = 0;
        this.noSendKeyRotated = false;
        delete this._lastPeerJoinLeave;
        delete this.termCode;
        delete this.waitingRoomUsers;
        delete this.moderators;
        this.speakers = new Set(); // may be needed before ANSWER is received
        this.cryptoWorker.postMessage(['r']); // reset crypto
        this.statCtx = {};
        this._statsRecorder.reset();
        this.micMuteMonitor.reinit();
        delete this._callJoinPermission;
    }
    createPeerConn() {
        let pc = this.rtcConn = new RTCPeerConnection({
            encodedInsertableStreams: true,
            sdpSemantics: 'unified-plan'
        });
        this.createAllTransceivers();
        pc.ontrack = (e) => {
            let xponder = e.transceiver;
            let track = e.track;
            let slot = xponder.slot;
            do {
                if (window.d) {
                    console.log(client_kLogTag, `onTrack: mid: ${xponder.mid}, kind: ${track.kind}, dir: ${xponder.direction}, slot: ${slot ? "has" : "none-yet"}`);
                }
            } while (0);
            if (track.kind === "video") {
                if (!slot) {
                    this.assert(xponder.direction === "recvonly");
                    slot = new VideoSlot(this, xponder);
                    slot.createDecryptor();
                }
                // use slot.mid instead of xponder.mid because it's a numeric value, parsed from xponder.mid
                this.inVideoTracks.set(slot.mid, slot);
            }
            else {
                this.assert(track.kind === "audio");
                if (!slot) {
                    this.assert(xponder.direction === "recvonly");
                    slot = new Slot(this, xponder);
                    slot.createDecryptor();
                }
                this.inAudioTracks.set(slot.mid, slot);
            }
            if (this.callRecorder) {
                this.callRecorder.updatePeerInputs(this.getPeerInputTracks());
            }
        };
        pc.onaddstream = (event) => {
            do {
                if (window.d) {
                    console.log(client_kLogTag, "onAddStream");
                }
            } while (0);
            this.outVSpeakerTrack.createEncryptor();
            this.outVSpeakerTrack.createDecryptor();
            this.outASpeakerTrack.createEncryptor();
            this.outASpeakerTrack.createDecryptor();
            this.outVThumbTrack.createEncryptor();
            this.outVThumbTrack.createDecryptor();
        };
        pc.oniceconnectionstatechange = (ev) => {
            do {
                if (window.d) {
                    console.log(client_kLogTag, "onIceConnState:", pc.iceConnectionState);
                }
            } while (0);
        };
        pc.onconnectionstatechange = (ev) => {
            do {
                if (window.d) {
                    console.log(client_kLogTag, "onConnState:", pc.connectionState);
                }
            } while (0);
            if (pc.connectionState === "failed") {
                this.handleRtcDisconnect();
            }
        };
    }
    hasConnection() {
        return this.conn != null;
    }
    async handleRtcDisconnect() {
        let statsRec = this._statsRecorder;
        if (statsRec && statsRec.arrays.t.length === 0 && statsRec.tsStart && (Date.now() - statsRec.tsStart > 6000)) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "WebRTC connection failed, looks like no UDP connectivity");
                }
            } while (0);
            this.disconnect(termCodes.kNoMediaPath);
        }
        else {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "WebRTC connection failed, forcing full reconnect of client");
                }
            } while (0);
            this.disconnect(termCodes.kRtcDisconn, true);
        }
    }
    _stopLocalTracks() {
        this._stopAndDelLocalTrack("_audioTrack");
        this._stopAndDelLocalTrack("_cameraTrack");
        this._stopAndDelLocalTrack("_screenTrack");
    }
    /**
    * @param _supportRetry This is for internal use and must not be specified by the application
    * @returns false if we were already disconnected and no onDisconnect event was fired, true oherwise
    */
    disconnect(termCode, _supportRetry) {
        if (!_supportRetry) {
            this._forcedDisconnect = true;
        }
        if (this._connState === ConnState.kDisconnected) {
            return false;
        }
        termCode = this.termCode = (termCode != null) ? termCode : termCodes.kUserHangup;
        if (!this.conn) { // should be in kDisconnectedRetrying state - abort retrying
            this._stopLocalTracks();
            return false;
        }
        if (this.conn.readyState === WebSocket.OPEN) {
            try {
                this.send({ a: "BYE", rsn: termCode });
            }
            catch (ex) { }
        }
        // In some cases when there is no network but that is not detected by browser,
        // conn.close() doesn't fire onclose until all queued data (i.e. the BYE command)
        // has been sent (which would happen when we are back online), so we do it manually and synchronously
        this.conn.onclose = null;
        this.conn.close();
        this.onWsClose();
        return true;
    }
    async createAllTransceivers() {
        /* uplink track map:
        mid=0: uplink video thumbnail track
        mid=1: uplink video speaker track
        mid=2: uplink audio speaker track
        */
        this.inAudioTracks = new Map();
        this.inVideoTracks = new Map();
        let pc = this.rtcConn;
        this.outVThumbTrack = new VideoSlot(this, pc.addTransceiver("video", { direction: "sendrecv" }), true);
        this.outVSpeakerTrack = new VideoSlot(this, pc.addTransceiver("video", { direction: "sendrecv" }), true);
        this.outASpeakerTrack = new Slot(this, pc.addTransceiver("audio", { direction: "sendrecv" }), true);
        for (let i = 1; i < this.numInputAudioTracks; i++) {
            pc.addTransceiver("audio", { direction: "recvonly" });
        }
        for (let i = 2; i < this.numInputVideoTracks; i++) {
            pc.addTransceiver("video", { direction: "recvonly" });
        }
    }
    send(msg) {
        if (!this.conn) {
            return;
        }
        let strMsg = JSON.stringify(msg);
        this.conn.send(strMsg);
        do {
            if (window.d) {
                console.log(client_kLogTag, "tx:\n", JSON.stringify(msg, logReplacerFunc));
            }
        } while (0);
    }
    msgHello(msg) {
        this.assert(msg.cid);
        this.assert(msg.na);
        this.cid = msg.cid;
        this.numInputAudioTracks = msg.na;
        this.moderators = msg.mods ? new Set(msg.mods) : undefined;
        this.speakApproval = !!msg.sr;
        this._fire("onConnected");
        const wr = msg.wr;
        if (wr) {
            this._setConnState(ConnState.kInWaitingRoom);
            if (wr.allow) {
                this._callJoinPermission = CallJoinPermission.kAllow;
                this._fire("wrOnJoinAllowed");
            }
            else {
                this._callJoinPermission = CallJoinPermission.kDeny;
                this._fire("wrOnJoinNotAllowed");
            }
            if (wr.users) {
                this.msgWrDump(wr);
            }
        }
        else {
            this.joinCall();
        }
    }
    async joinCall() {
        this.createPeerConn();
        this._setConnState(ConnState.kCallJoining);
        // this._sendVthumb = true;
        const pc = this.rtcConn;
        const offer = await pc.createOffer();
        if (this._connState !== ConnState.kCallJoining) {
            // might have been disconnected while waiting for createOffer
            return;
        }
        let sdp = sdpCompress(offer.sdp);
        // hack to enable SVC
        this.mungeSdpForSvc(sdp.tracks[1]);
        //  sdp.tracks[0].sdp = "a=fmtp:98 x-google-max-bitrate=150";
        offer.sdp = sdpUncompress(sdp);
        const tsStart = Date.now();
        await pc.setLocalDescription(offer);
        do {
            if (window.d) {
                console.log(client_kLogTag, "setLocalDescription took", Date.now() - tsStart, "ms");
            }
        } while (0);
        if (this._connState !== ConnState.kCallJoining) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Call has ended meanwhile, aborting join");
                }
            } while (0);
            return;
        }
        this.keyEncryptIv = this.makeKeyEncryptIv();
        const ivs = this.strIvs = [
            binToHex(this.outVThumbTrack.iv.buffer),
            binToHex(this.outVSpeakerTrack.iv.buffer),
            binToHex(this.outASpeakerTrack.iv.buffer)
        ];
        const sessSignedPubKey = await this.generateSessionKeyPair();
        // Need this to get the availAv flags (without audio).
        // As we are not in kJoined state, no tracks are sent, only obtained. So, sentAv is 0, and
        // availAv's audio flag is always copied from sentAv, as we may cache the audio track
        // and still not want to advertise it as available (for quick unmuting, we don't want to obtain
        // it every time). Hence, we have availAv reflect all video media that we will actually send,
        // and audio flag is always zero.
        // At this point we are not sending anything: no key should be sent out
        await this._updateSentTracks(null, false);
        this.assert(this.sentAv === 0); // updateSentTracks() doesn't send any tracks if not in kJoined state
        this.assert(!(this.availAv & Av.Audio));
        if (this._connState !== ConnState.kCallJoining) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Call has ended meanwhile, aborting join");
                }
            } while (0);
            return;
        }
        let offerCmd = {
            a: "JOIN",
            sdp: sdp,
            ivs: ivs,
            av: this.availAv,
            pubk: sessSignedPubKey
        };
        if (this.prevCid) { // when reconnecting, tell the SFU the CID of the previous connection, so it can kill it instantly
            offerCmd.cid = this.prevCid;
        }
        if (this.options.speak) {
            offerCmd.spk = 1;
        }
        this.send(offerCmd);
    }
    makeKeyEncryptIv() {
        // The IV is 12 bytes. First 8 bytes are taken from the vthumb track IV,
        // the rest 4 bytes are the first from the hi-res video track IV
        const first = this.outVThumbTrack.iv;
        const second = this.outVSpeakerTrack.iv;
        this.assert(first.length === 8 && second.length === 8);
        const arr = new Uint8Array(12);
        arr.set(first);
        arr.set(second.subarray(0, 4), 8);
        return arr;
    }
    async generateSessionKeyPair() {
        this.assert(this.cid);
        const tsStart = Date.now();
        const keyPair = window.nacl.box.keyPair();
        this.privSessKey = keyPair.secretKey;
        const pubKeyStr = base64ArrEncode(keyPair.publicKey);
        const signature = await this.app.signString(`sesskey|${this.callId}|${this.cid}|${pubKeyStr}`);
        do {
            if (window.d) {
                console.log(client_kLogTag, "Sess keypair generated in", Date.now() - tsStart, "ms");
            }
        } while (0);
        return `${pubKeyStr}:${signature}`;
    }
    _stopAndDelLocalTrack(name) {
        let track = this[name];
        if (!track) {
            return;
        }
        this[name] = null; // first null it, because onended handler will try to re-request it
        track.stop();
    }
    async _doGetLocalTracks() {
        var self = this;
        // first, determine which tracks we need
        let screen = self._isSharingScreen;
        let camera = !self._muteCamera;
        // get audio track when active speaker, even if muted. This will speed up unmuting
        let audio = this.isSpeaker;
        if (this._muteAudio && audio && this._audioGetFailedOnce) {
            audio = false;
        }
        // then, check what we have and what needs to change
        var camChange = camera != (!!self._cameraTrack);
        var screenChange = screen != (!!self._screenTrack);
        var audioChange = audio != (!!self._audioTrack);
        if (!(camChange || audioChange || screenChange)) {
            do {
                if (window.d) {
                    console.log(client_kLogTag, "getLocalTracks: nothing to change");
                }
            } while (0);
            return false;
        }
        let errors = null;
        // delete the tracks we disable, and prepare options for getting the ones we enable
        let promises = [];
        if (audioChange && !audio) {
            self._stopAndDelLocalTrack("_audioTrack");
        }
        if (camChange) {
            if (camera) {
                if (self.fakeLocalVideoCanvas) {
                    self._cameraTrack = self.getFakeCamTrack();
                }
            }
            else { // !camera
                self._stopAndDelLocalTrack("_cameraTrack");
            }
        }
        if (screenChange && !screen) {
            self._stopAndDelLocalTrack("_screenTrack");
        }
        let gettingAudio = audioChange && audio;
        let gettingCam = camChange && camera && !self.fakeLocalVideoCanvas;
        let gettingScreen = screenChange && screen;
        const tsStart = Date.now();
        do {
            if (window.d) {
                console.log(client_kLogTag, "Getting local media...");
            }
        } while (0);
        if (gettingAudio) {
            const micId = localStorage.getItem("calls.micId");
            const constraints = micId
                ? Object.assign({ deviceId: micId }, SfuClient.kAudioCaptureOptions)
                : SfuClient.kAudioCaptureOptions;
            promises.push(navigator.mediaDevices.getUserMedia({ audio: constraints })
                .then(function (stream) {
                let atrack = self._audioTrack = stream.getAudioTracks()[0];
                if (!atrack) {
                    return Promise.reject("Local audio stream has no audio track");
                }
                delete self._audioGetFailedOnce;
                atrack.onended = () => {
                    if (self._audioTrack !== atrack) {
                        return;
                    }
                    self._audioTrack = null;
                    atrack.onended = null;
                    do {
                        if (window.d) {
                            console.warn(client_kLogTag, "Input audio track stopped (possibly device removed), re-requesting audio input...");
                        }
                    } while (0);
                    self._updateSentTracks(null, true);
                };
            })
                .catch(function (err) {
                self._audioGetFailedOnce = true; // avoid re-retying to get audio in advance
                // We may be requesting audio in advance, without being asked by the user
                // In that case, don't report the error
                if (!self._muteAudio) {
                    self._muteAudio = true;
                    errors = addNullObjProperty(errors, "mic", err);
                    self.logError("Error getting local mic:", err);
                    self._fire("onLocalMediaQueryError", "mic", err);
                    return Promise.reject(err);
                }
                else {
                    self.logError("Error getting local mic (in advance):", err);
                }
            }));
        }
        if (gettingCam) {
            const camId = localStorage.getItem("calls.camId");
            const constraints = camId
                ? Object.assign({ deviceId: camId }, SfuClient.kVideoCaptureOptions)
                : SfuClient.kVideoCaptureOptions;
            promises.push(navigator.mediaDevices.getUserMedia({ video: constraints })
                .then(function (stream) {
                let vtrack = self._cameraTrack = stream.getVideoTracks()[0];
                if (!vtrack) {
                    return Promise.reject("Local camera stream has no video track");
                }
            })
                .catch(function (err) {
                self._muteCamera = true;
                errors = addNullObjProperty(errors, "camera", err);
                self.logError("Error getting local camera:", err);
                self._fire("onLocalMediaQueryError", "camera", err);
                return Promise.reject(err);
            }));
        }
        if (gettingScreen) {
            promises.push(navigator.mediaDevices.getDisplayMedia({ video: SfuClient.kScreenCaptureOptions })
                .then(function (stream) {
                let strack = self._screenTrack = stream.getVideoTracks()[0];
                if (!strack) {
                    return Promise.reject("Local screen stream has no video track");
                }
                strack.onended = function () {
                    self.onScreenSharingStoppedByUser();
                };
            })
                .catch(function (err) {
                self._isSharingScreen = false;
                errors = addNullObjProperty(errors, "screen", err);
                self.logError("Error getting local screen video:", err);
                self._fire("onLocalMediaQueryError", "screen", err);
                return Promise.reject(err);
            }));
        }
        if (!promises.length) {
            do {
                if (window.d) {
                    console.log(client_kLogTag, "...nothing to get");
                }
            } while (0);
            return true;
        }
        await Promise.allSettled(promises);
        do {
            if (window.d) {
                console.log(client_kLogTag, "Get local media completed in", Date.now() - tsStart, "ms");
            }
        } while (0);
        if (errors) {
            self._fire("onLocalMediaError", errors);
        }
        return true;
    }
    _getLocalTracks() {
        return this._reqBarrier.callFunc(this, this._doGetLocalTracks);
    }
    _updateSentTracks(pre, dontSendAv) {
        if (pre) {
            return this._reqBarrier.callFunc(this, () => {
                pre.call(this);
                return this._doUpdateSentTracks(dontSendAv);
            });
        }
        else {
            return this._reqBarrier.callFunc(this, this._doUpdateSentTracks, dontSendAv);
        }
    }
    getFakeCamTrack() {
        return this.fakeLocalVideoCanvas.captureStream(15).getVideoTracks()[0];
    }
    /* Action is determined by:
    - SfuClient._muteAudio
    - SfuClient._muteCamera
    - SfuClient._isSharingScreen
    - SfuClient._sendHiRes and SfuClient._sendVthumb
    Sets SfuClient._localAudio/Video/ScreenTrack
    During the process sets SfuClient._isChangingLocalTracks
    */
    async _doUpdateSentTracks(dontSendAv) {
        var self = this;
        const oldAvailAv = this.availAv;
        const oldSentAv = this.sentAv;
        const wasSendingHiRes = this.outVSpeakerTrack.isSendingTrack();
        try {
            await self._doGetLocalTracks();
            if (!this.rtcConn || this.connState !== ConnState.kCallJoined) {
                return;
            }
            let promises = [];
            // first, determine which tracks we want to obtain, and null sender tracks that we want disabled
            if (self.isSpeaker) {
                if (!self._muteAudio && self._audioTrack) {
                    // do a check in advance here (unlike elsewhere) to avoid unneeded restarts of the micMuteMonitor
                    const already = self.outASpeakerTrack.sentTrack === self._audioTrack;
                    if (!already) {
                        promises.push(self.outASpeakerTrack.sendTrack(self._audioTrack));
                        this.micMuteMonitor.restart();
                    }
                }
                else {
                    promises.push(self.outASpeakerTrack.sendTrack(null));
                    this.micMuteMonitor.stop();
                }
            }
            else {
                promises.push(self.outASpeakerTrack.sendTrack(null));
            }
            let hiresTrack = null;
            let vthumbTrack = null;
            if (!self._cameraTrack) {
                if (self._isSharingScreen) { // if no camera and sharing screen - both tracks are screen
                    hiresTrack = vthumbTrack = this._screenTrack;
                }
                // otherwise no cam and no screen
            }
            else {
                if (self._isSharingScreen) { // both cam and screen: hires is screen, vthumb is camera
                    self._sendVthumb = true; // force sending vthumb - we must always send it when sending cam+screen
                    hiresTrack = self._screenTrack;
                    vthumbTrack = self._cameraTrack;
                }
                else { // only camera - both tracks are camera
                    hiresTrack = vthumbTrack = self._cameraTrack;
                }
            }
            promises.push(self.outVSpeakerTrack.sendTrack(this._sendHires ? hiresTrack : null));
            promises.push(self.outVThumbTrack.sendTrack(this._sendVthumb ? vthumbTrack : null));
            let tsStart = Date.now();
            await Promise.all(promises);
            do {
                if (window.d) {
                    console.log(client_kLogTag, "updateSentTracks took", Date.now() - tsStart, "ms");
                }
            } while (0);
            // hook the svc driver init here, so that it is always executed
            if (this.outVSpeakerTrack.isSendingTrack() && !wasSendingHiRes) {
                this._svcDriver.initTx();
            }
        }
        finally {
            self._updateAvailAndSentAv();
            self.handleStartStopSend(oldSentAv);
            let av = self.availAv;
            if (av !== oldAvailAv) {
                if (!dontSendAv) {
                    self._sendAvState();
                }
                self._fire("onLocalMediaChange", av ^ oldAvailAv);
                if (this.callRecorder) {
                    this.callRecorder.onLocalMediaChange();
                }
            }
        }
    }
    handleStartStopSend(oldSentAv) {
        if (!!oldSentAv === !!this.sentAv) {
            return;
        }
        if (this.sentAv) { // start send
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Starting to send media: broadcasting media key");
                }
            } while (0);
            this.encryptAndSendLastKeyToAllPeers();
        }
        else {
            this.noSendKeyRotated = false;
        }
    }
    /** Returns not what tracks are actually sent, but what are available for sending. This is because
    * sending a track may be disabled if nobody has requested it (reference counting)
    */
    _updateAvailAndSentAv() {
        if (this._onHold) {
            return;
        }
        let sentAv = this.outASpeakerTrack.sentTrack ? Av.Audio : 0;
        let availAv = sentAv;
        if (this._screenTrack) {
            if (this._cameraTrack) {
                availAv |= Av.ScreenHiRes | Av.CameraLowRes;
            }
            else {
                availAv |= Av.ScreenHiRes | Av.ScreenLowRes;
            }
        }
        else {
            if (this._cameraTrack) {
                availAv |= Av.Camera; // both high-res and low-res
            }
        }
        if (this.callRecorder) {
            availAv |= Av.Recording;
        }
        this._availAv = availAv;
        let track = this.outVThumbTrack.sentTrack;
        if (track) {
            sentAv |= ((track === this._cameraTrack) ? Av.CameraLowRes : Av.ScreenLowRes);
        }
        track = this.outVSpeakerTrack.sentTrack;
        if (track) {
            sentAv |= ((track === this._cameraTrack) ? Av.CameraHiRes : Av.ScreenHiRes);
        }
        this._sentAv = sentAv;
    }
    get availAv() {
        return this._availAv;
    }
    get sentAv() {
        return this._sentAv;
    }
    get rxQuality() {
        return this._svcDriver ? this._svcDriver.currRxQuality : -1;
    }
    get txQuality() {
        return this._svcDriver ? this._svcDriver.currTxQuality : -1;
    }
    getPeerInputTracks() {
        const peerTracks = [];
        for (const slot of this.inAudioTracks.values()) {
            peerTracks.push(slot.xponder.receiver.track);
        }
        return peerTracks;
    }
    async recordingStart(sink, videoHeight) {
        if (this.callRecorder) {
            throw new Error("Already recording call");
        }
        do {
            if (window.d) {
                console.log(client_kLogTag, "Starting call recording");
            }
        } while (0);
        if (!sink) {
            sink = new RecorderFileSink;
            await sink.init();
        }
        this.callRecorder = new CallRecorder(this, sink, videoHeight);
        await this.callRecorder.init(this.getPeerInputTracks());
        this.callRecorder.start();
        this._availAv |= Av.Recording;
        this._sendAvState();
    }
    throwIfNotRecording() {
        if (!this.callRecorder) {
            throw new Error("Not recording");
        }
    }
    recordingPause() {
        this.throwIfNotRecording();
        this.callRecorder.pause();
    }
    recordingResume() {
        this.throwIfNotRecording();
        this.callRecorder.resume();
    }
    recordingStop() {
        if (!this.callRecorder) {
            return;
        }
        do {
            if (window.d) {
                console.log(client_kLogTag, "Stopping call recording");
            }
        } while (0);
        this.callRecorder.destroy();
        delete this.callRecorder;
        this._availAv &= ~Av.Recording;
        this._sendAvState();
    }
    recordingForcePeerVideo(cid) {
        if (cid === this.recForcedPeerCid) {
            if (cid) {
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, `Already recording peer ${cid}`);
                    }
                } while (0);
            }
            return;
        }
        delete this.recForcedPeerCid;
        const rec = this.callRecorder;
        if (!cid) {
            if (rec) {
                rec.setVideoInput(null);
            }
            return true;
        }
        this.throwIfNotRecording();
        const peer = this.peers.get(cid);
        if (!peer) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `Unknown peer with cid ${cid}`);
                }
            } while (0);
            return false;
        }
        if (!(peer.av & Av.HiResVideo)) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `Peer ${cid} is not sending hi-res video to record`);
                }
            } while (0);
            rec.setVideoInput(null);
            return;
        }
        this.recForcedPeerCid = cid;
        peer._doStartRecording();
        return true;
    }
    _maybeResumeRecordingPeer(peer) {
        const recCid = this.recForcedPeerCid;
        if (!recCid || !this.callRecorder) {
            return false;
        }
        if (recCid === peer.prevCid) {
            this.recForcedPeerCid = peer.cid; // peer reconnected, update recording cid
        }
        else if (recCid !== peer.cid) {
            return false;
        }
        peer._doStartRecording();
        return true;
    }
    sentTracksString() {
        let result = "";
        if (this.outASpeakerTrack.sentTrack) {
            result += "A";
        }
        if (this.outVSpeakerTrack.sentTrack) {
            result += "H";
        }
        if (this.outVThumbTrack.sentTrack) {
            result += "L";
        }
        return result;
    }
    obtainedAv() {
        let av = this._audioTrack ? Av.Audio : 0;
        if (this._cameraTrack) {
            av |= Av.Camera;
        }
        if (this._screenTrack) {
            av |= Av.Screen;
        }
        return av;
    }
    mainSentVtrack() {
        return this._cameraTrack || this._screenTrack;
    }
    localCameraTrack() {
        return this._cameraTrack;
    }
    localScreenTrack() {
        return this._screenTrack;
    }
    localAudioTrack() {
        return this._audioTrack;
    }
    localAudioMuted() {
        if (!this.isSpeaker) {
            return true;
        }
        return this._onHold ? this._onHold.muteAudio : this._muteAudio;
    }
    localCameraMuted() {
        return this._onHold ? this._onHold.muteCamera : this._muteCamera;
    }
    _sendAvState() {
        if (this._connState !== ConnState.kCallJoined) {
            return;
        }
        this.send({ a: "AV", av: this.availAv });
    }
    muteCamera(mute) {
        if (this._onHold) {
            this._onHold.muteCamera = mute;
            return;
        }
        if (this._connState === ConnState.kDisconnected || this._connState === ConnState.kDisconnectedRetrying) {
            this._muteCamera = mute;
            return;
        }
        if (mute === this._muteCamera) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "muteCamera: No change");
                }
            } while (0);
            return Promise.resolve();
        }
        return this._updateSentTracks(() => { this._muteCamera = mute; });
    }
    _doMuteAudio(mute, dontSendAv) {
        if (!mute && !this.isSpeaker) {
            const msg = "Can't unmute audio: no speak permission";
            do {
                if (window.d) {
                    console.warn(client_kLogTag, msg);
                }
            } while (0);
            return Promise.reject(msg);
        }
        if (this._onHold) {
            this._onHold.muteAudio = mute;
            return Promise.resolve();
        }
        if (!this.rtcConn) {
            this._muteAudio = mute;
            return Promise.resolve();
        }
        if (mute === this._muteAudio) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "muteAudio: No change");
                }
            } while (0);
            return Promise.resolve();
        }
        return this._updateSentTracks(() => {
            this._muteAudio = mute;
        }, dontSendAv);
    }
    muteAudio(mute) {
        return this._doMuteAudio(mute, false);
    }
    _setInputDevice(lsKey, varName, deviceId, diffAv) {
        if (deviceId) {
            localStorage.setItem(lsKey, deviceId);
        }
        else {
            localStorage.removeItem(lsKey);
        }
        if (!this[varName]) {
            return;
        }
        return this._updateSentTracks(() => {
            this[varName] = null;
        }, true)
            .then(() => {
            this._fire("onLocalMediaChange", diffAv);
            if (this.callRecorder) {
                this.callRecorder.onLocalMediaChange(diffAv);
            }
        });
    }
    static enumMediaDevices() {
        return navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
            const audio = [];
            const video = [];
            for (const device of devices) {
                if (device.kind === "audioinput" && device.deviceId !== "default") {
                    audio.push(device);
                }
                else if (device.kind === "videoinput" && device.deviceId !== "default") {
                    video.push(device);
                }
            }
            return { audioIn: audio, videoIn: video };
        });
    }
    setMicDevice(deviceId) {
        return this._setInputDevice("calls.micId", "_audioTrack", deviceId, Av.Audio);
    }
    setCameraDevice(deviceId) {
        return this._setInputDevice("calls.camId", "_cameraTrack", deviceId, Av.Video);
    }
    async putOnHold() {
        await this._updateSentTracks(() => {
            if (this._onHold) {
                return;
            }
            this._availAv |= Av.onHold;
            this._sentAv = Av.onHold;
            this._onHold = {
                muteCamera: this._muteCamera,
                muteAudio: this._muteAudio,
                sendHires: this._sendHires,
                sendVthumb: this._sendVthumb,
                isSharingScreen: this._isSharingScreen
            };
            this._muteCamera = this._muteAudio = true;
            this._isSharingScreen = this._sendHires = this._sendVthumb = false;
        });
        // updateSentTracks() does not register avflags and local media change because it sees the on-hold availAv,
        // which is constant before and after the media change. So, we have to fire the event manually
        this._sendAvState();
        this._fire("onLocalMediaChange", Av.onHold);
    }
    async releaseHold() {
        await this._updateSentTracks(() => {
            if (!this._onHold) {
                return;
            }
            this.assert(this._availAv & Av.onHold);
            let oh = this._onHold;
            this._muteCamera = oh.muteCamera;
            this._muteAudio = oh.muteAudio;
            this._isSharingScreen = oh.isSharingScreen;
            this._sendHires = oh.sendHires;
            this._sendVthumb = oh.sendVthumb;
            delete this._onHold;
            // reflect the actual state of the sent tracks, so that the actual delta is seen correctly
            this._availAv = Av.onHold;
        });
    }
    isOnHold() {
        return this._onHold != null;
    }
    async enableScreenshare(enable) {
        if (this._onHold) {
            this._onHold.enableScreenshare = enable;
            return;
        }
        if (enable === this._isSharingScreen) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "enableScreenshare: No change");
                }
            } while (0);
            return Promise.resolve();
        }
        await this._updateSentTracks(() => { this._isSharingScreen = enable; });
        if (this._isSharingScreen !== enable) { // failed to enable/disable or something interfered
            return;
        }
        if (this._isSharingScreen) {
            this._fire("onScreenshare", true, this.screenShareType());
        }
        else {
            this._fire("onScreenshare", false);
        }
    }
    screenShareType() {
        let ssTrack = this._screenTrack;
        if (!ssTrack) {
            return ScreenShareType.kInvalid;
        }
        let label = ssTrack.label;
        if (label.startsWith("screen:")) {
            return ScreenShareType.kWholeScreen;
        }
        else if (label.startsWith("window:")) {
            return ScreenShareType.kWindow;
        }
        else if (label.startsWith("web-contents-media-stream")) {
            return ScreenShareType.kBrowserTab;
        }
        else {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Could not determine screensharing type from track label", label);
                }
            } while (0);
            return ScreenShareType.kInvalid;
        }
    }
    onScreenSharingStoppedByUser() {
        do {
            if (window.d) {
                console.warn(client_kLogTag, "Screen sharing stopped by user");
            }
        } while (0);
        // In theory this may be called immediately from within _getLocalTracks when the track onended
        // handle is attached. In that case, we need to go through the message loop to avoid recursion
        var self = this;
        setTimeout(function () {
            self._updateSentTracks(() => {
                self._isSharingScreen = false;
                self._fire("onScreenshare", false);
            });
        }, 0);
    }
    _setConnState(state) {
        this._connState = state;
    }
    async onPacket(event) {
        //Get protocol message
        const msg = JSON.parse(event.data);
        if (this.inputPacketQueue) {
            this.inputPacketQueue.push(msg);
        }
        else {
            this.processMessage(msg);
        }
    }
    processMessage(msg) {
        do {
            if (window.d) {
                console.log(client_kLogTag, "rx:\n", JSON.stringify(msg, logReplacerFunc));
            }
        } while (0);
        if (msg.err != null) {
            const strError = termCodes[msg.err];
            let logMsg = "Server closed connection with error ";
            logMsg += strError ? strError : `(${msg.err})`;
            if (msg.msg) {
                logMsg += ": " + msg.msg;
            }
            do {
                if (window.d) {
                    console.warn(client_kLogTag, logMsg);
                }
            } while (0);
            this.disconnect(msg.err, true); // may be retriable, i.e. kSvrShuttingDown
            return;
        }
        if (msg.warn != null) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "SFU server WARNING:", msg.warn);
                }
            } while (0);
            return;
        }
        if (msg.deny) {
            this.handleDeny(msg);
            return;
        }
        let handler = SfuClient.msgHandlerMap[msg.a];
        if (handler) {
            handler.call(this, msg);
        }
        else {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Ingoring unknown packet", msg.a || JSON.stringify(msg));
                }
            } while (0);
        }
    }
    processInputQueue() {
        this.assert(this.inputPacketQueue);
        for (;;) {
            let msg = this.inputPacketQueue.shift();
            if (!msg) {
                break;
            }
            this.processMessage(msg);
        }
        delete this.inputPacketQueue;
    }
    assignCid(cid) {
        this.cid = cid;
        this.cryptoWorker.postMessage(['cid', this.cid]);
    }
    _addPeer(peer) {
        this.peers.set(peer.cid, peer);
        if (this.maxPeers < this.peers.size) {
            this.maxPeers = this.peers.size;
        }
    }
    _removePeer(peer) {
        this.peers.delete(peer.cid);
        this.cryptoWorker.postMessage(['dpk', this.cid]);
    }
    async msgAnswer(msg) {
        this.inputPacketQueue = [];
        this.assert(this.cid);
        this.assignCid(this.cid);
        this._tsCallJoin = Date.now();
        this._tsCallStart = this._tsCallJoin - msg.t;
        this.joinToffs = msg.t;
        this._statsRecorder.start();
        await this.newKeyImmediate();
        if (this.connState !== ConnState.kCallJoining) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "msgAnswer: Disconnected while joining(generating new key), aborting");
                }
            } while (0);
            return;
        }
        let sdp;
        try {
            let tsStart = Date.now();
            sdp = sdpUncompress(msg.sdp);
            do {
                if (window.d) {
                    console.log(client_kLogTag, "Setting answer SDP...");
                }
            } while (0);
            this.assert(this.rtcConn);
            await this.rtcConn.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: sdp
            }));
            do {
                if (window.d) {
                    console.log(client_kLogTag, "setRemoteDescription took", Date.now() - tsStart, "ms");
                }
            } while (0);
        }
        catch (ex) {
            this.logError("setRemoteDescrition failed:", ex, "\nsdp:\n" + sdp);
            return;
        }
        // fire onJoined before any requests for tracks, otherwise - stream data is received BEFORE the client app even
        // knows that this user had joined
        this._joinRetries = 0;
        this._setConnState(ConnState.kCallJoined);
        this.enableStats();
        this.setThumbVtrackResScale();
        this.speakers = new Set(msg.speakers || undefined);
        this.speakRequests = new Set(msg.spkrqs || undefined);
        if (msg.peers) {
            for (const peerInfo of msg.peers) {
                new Peer(this, peerInfo, true);
            }
            this.encryptAndSendLastKeyToAllPeers();
        }
        this._fire("onJoined");
        if (this.isSpeaker) {
            this._updateSentTracks(null);
            this._fire("onCanSpeak");
        }
        setTimeout(() => this.processInputQueue(), 0);
    }
    setThumbVtrackResScale() {
        let height;
        if (this._isSharingScreen) {
            height = SfuClient.kScreenCaptureOptions.height.max;
        }
        else {
            if (!this._cameraTrack || !(height = this._cameraTrack.getSettings().height)) {
                height = SfuClient.kVideoCaptureOptions.height;
            }
        }
        this.assert(height);
        let scale = height / SfuClient.kVthumbHeight;
        this.outVThumbTrack.setEncoderParams((params) => {
            params.scaleResolutionDownBy = scale;
            params.maxBitrate = 100 * 1024;
        });
    }
    get tsCallStart() {
        return this._tsCallStart;
    }
    get tsCallJoin() {
        return this._tsCallJoin;
    }
    msgPeerJoin(msg) {
        if (!msg.cid || !msg.userId || msg.av == null) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "PEERJOIN packet missing required property");
                }
            } while (0);
            return;
        }
        let peer = new Peer(this, msg);
        // rotate only if peer is not the first one to see our most recent key
        if (!this._lastPeerJoinLeave || ((this._lastPeerJoinLeave.userId === msg.userId) &&
            (Date.now() - this._lastPeerJoinLeave.ts <= SfuClient.kPeerReconnNoKeyRotationPeriod))) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "This is the first peer, or they just reconnected, NOT rotating key");
                }
            } while (0);
            peer.encryptAndSendLastKey();
        }
        else {
            this.rotateKey();
        }
        this._lastPeerJoinLeave = { userId: msg.userId, ts: Date.now() };
    }
    async msgPeerLeft(msg) {
        let cid = msg.cid;
        let peer = this.peers.get(cid);
        if (!peer) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "PEERLEFT: Unknown peer cid", cid);
                }
            } while (0);
            return;
        }
        this._lastPeerJoinLeave = { userId: peer.userId, ts: Date.now() };
        // removes peer from peer list, destroys players, fires onPeerLeft
        peer.destroy(msg.rsn !== null ? msg.rsn : termCodes.kSigDisconn);
        this.rotateKey();
    }
    handleIncomingVideoTracks(tracks, isHiRes) {
        for (const desc of tracks) {
            const cid = desc[0];
            const peer = this.peers.get(cid);
            if (!peer) {
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, "Unknown peer cid", cid);
                    }
                } while (0);
                continue;
            }
            const mid = desc[1];
            const reused = !!desc[2];
            if (isHiRes) {
                peer.incomingHiResVideoTrack(mid, reused);
            }
            else {
                peer.incomingVthumbTrack(mid, reused);
            }
        }
    }
    msgVthumbTracks(msg) {
        this.handleIncomingVideoTracks(msg.tracks, false);
    }
    msgHiresTracks(msg) {
        this.handleIncomingVideoTracks(msg.tracks, true);
    }
    requestSvcLayers(spt, tmp, screenTmp) {
        this.send({
            a: "LAYER",
            spt: spt,
            tmp: tmp,
            stmp: screenTmp
        });
    }
    enableSpeakerDetector(enable) {
        this._speakerDetector.enable(enable);
    }
    isSharingScreen() {
        return this._onHold ? this._onHold.isSharingScreen : this._isSharingScreen;
    }
    isSendingScreenHiRes() {
        return this._screenTrack && this.outVSpeakerTrack.sentTrack === this._screenTrack;
    }
    mutePeer(cid) {
        if (!this.isModerator) {
            throw new Error("mutePeer: Not a moderator");
        }
        const msg = { a: "MUTE", av: Av.Audio };
        if (cid) {
            msg.cid = cid;
        }
        this.send(msg);
    }
    speakerDel(userId) {
        if (!this.isModerator) {
            throw new Error("speakerDel: Not a moderator");
        }
        this.send({ a: "SPEAKER_DEL", user: userId });
    }
    speakerAdd(userId) {
        if (!this.isModerator) {
            throw new Error("speakerAdd: Not a moderator");
        }
        this.send({ a: "SPEAKER_ADD", user: userId });
    }
    speakRequestDelete(userId) {
        if (userId && !this.isModerator) {
            throw new Error("speakRequestDelete: Not a moderator");
        }
        this.send({ a: "SPEAKRQ_DEL", ...(userId && { user: userId }) });
    }
    speakRequestSend() {
        this.send({ a: "SPEAKRQ" });
    }
    speakStop() {
        this.send({ a: "SPEAKER_DEL" });
    }
    msgSpeakReq(msg) {
        this.assert(msg.user);
        this.speakRequests.add(msg.user);
        this._fire("onSpeakReqAdd", msg.user);
    }
    msgSpeakReqDel(msg) {
        this.assert(msg.user);
        if (!this.speakRequests.delete(msg.user)) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "msgSpeakReqDel: Speak request was not in our list");
                }
            } while (0);
        }
        this._fire("onSpeakReqDel", msg.user);
    }
    async msgMuted(msg) {
        if ((msg.av & Av.Audio) === 0) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "MUTED received without audio flag");
                }
            } while (0);
            return;
        }
        const wasMuted = this.localAudioMuted();
        await this._doMuteAudio(true, true);
        const by = msg.by;
        if (!isNaN(by) && !wasMuted) {
            this._fire("onMutedBy", by);
        }
    }
    msgHiresStart(msg) {
        if (this._onHold) {
            this._onHold.sendHires = true;
            return;
        }
        this._updateSentTracks(() => { this._sendHires = true; });
    }
    msgHiresStop(msg) {
        if (this._onHold) {
            this._onHold.sendHires = false;
            return;
        }
        this._updateSentTracks(() => { this._sendHires = false; });
    }
    msgVthumbStart(msg) {
        if (this._onHold) {
            this._onHold.sendVthumb = true;
            return;
        }
        this._updateSentTracks(() => { this._sendVthumb = true; });
    }
    msgVthumbStop(msg) {
        if (this._onHold) {
            this._onHold.sendVthumb = false;
            return;
        }
        this._updateSentTracks(() => { this._sendVthumb = false; });
    }
    msgSpeakerAdd(msg) {
        let userId = msg.user;
        if (!userId) {
            userId = this.userId;
        }
        this.assert(!this.speakers.has(userId));
        this.speakers.add(userId);
        this.speakRequests.delete(userId);
        this._fire("onSpeakerAdd", userId);
        if ((userId === this.userId) && !this.isModerator) {
            this._updateSentTracks(null);
            this._fire("onCanSpeak");
        }
    }
    msgSpeakerDel(msg) {
        let userId = msg.user;
        if (!userId) {
            userId = this.userId;
        }
        this.speakers.delete(userId);
        if ((userId === this.userId) && !this.isModerator) {
            this._updateSentTracks(null, true);
            this._fire("onCanNotSpeak");
        }
        this._fire("onSpeakerDel", userId);
    }
    msgWillEnd(msg) {
        this._fire("onCallAboutToEnd", msg.in);
    }
    msgAv(msg) {
        let cid = msg.cid;
        this.assert(cid);
        if (cid === this.cid) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "msgAv: Received our own av flags");
                }
            } while (0);
            return;
        }
        let peer = this.peers.get(msg.cid);
        if (!peer) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "msgAv: Unknown peer with cid", msg.cid);
                }
            } while (0);
            return;
        }
        peer.onAvChange(msg);
    }
    msgModAdd(msg) {
        const userId = msg.user;
        this.assert(userId);
        if (!this.moderators) {
            this.logError("BUG: msgModAdd: moderators list does not exist, creating it");
            this.moderators = new Set();
        }
        this.moderators.add(userId);
        const wasSpeaker = this.speakers.delete(userId);
        this.speakRequests.delete(msg.user);
        // if a user with pending spk request became moderator, request is deleted
        this._fire("onModeratorAdd", msg.user);
        if (!wasSpeaker) {
            this._fire("onCanSpeak");
        }
    }
    msgModDel(msg) {
        this.assert(msg.user);
        if (!this.moderators) {
            this.logError("BUG: msgModDel: moderators list does not exist");
        }
        else {
            this.moderators.delete(msg.user);
        }
        // if we were speaking as moderator, stop speaking
        if ((msg.user === this.userId) && this.speakApproval) {
            // this.speakers.has(msg.user) must be false
            this._doMuteAudio(true, true);
            this._fire("onCanNotSpeak");
        }
        this._fire("onModeratorDel", msg.user);
    }
    // WaitingRoom list and permissions sync notifications, for moderators only
    msgWrDump(msg) {
        if (this.waitingRoomUsers) {
            this.waitingRoomUsers.clear();
        }
        else {
            this.waitingRoomUsers = new Map();
        }
        const users = msg.users;
        for (const userId in users) {
            this.waitingRoomUsers.set(userId, users[userId]);
        }
        this._fire("wrOnUserDump", users);
    }
    msgWrEnter(msg) {
        this.assert(msg.users);
        this.assert(this.waitingRoomUsers);
        const users = msg.users;
        for (let userId in users) {
            this.waitingRoomUsers.set(userId, users[userId]);
        }
        this._fire("wrOnUsersEntered", users);
    }
    msgWrLeave(msg) {
        this.assert(msg.user);
        this.assert(this.waitingRoomUsers);
        this.waitingRoomUsers.delete(msg.user);
        this._fire("wrOnUserLeft", msg.user);
    }
    wrSetUserPermissions(users, allow) {
        if (this.waitingRoomUsers) {
            // We don't have waitingRoomUsers only in open-invite mode, when we are not a moderator
            // In that case, we don't receive the WR dump, so it's not initialized, but we do receive WR_USERS_ALLOW
            // as an acknowledge for the permissions we have granted
            for (const userId of users) {
                this.waitingRoomUsers.set(userId, allow);
            }
        }
        this._fire(allow ? "wrOnUsersAllow" : "wrOnUsersDeny", users);
    }
    msgWrUsersAllow(msg) {
        this.wrSetUserPermissions(msg.users, true);
    }
    msgWrUsersDeny(msg) {
        this.wrSetUserPermissions(msg.users, false);
    }
    msgWrAllowReq(msg) {
        this._fire("wrOnAllowRequest", msg.user);
    }
    // Waiting room greeting - allow or deny call access
    msgWrAllow(msg) {
        this.assert(msg.cid);
        if (this._connState !== ConnState.kInWaitingRoom) {
            return;
        }
        this._callJoinPermission = CallJoinPermission.kAllow;
        this.cid = msg.cid;
        this._fire("wrOnJoinAllowed");
    }
    msgWrDeny(msg) {
        if (this._connState !== ConnState.kInWaitingRoom) {
            return;
        }
        this._callJoinPermission = CallJoinPermission.kDeny;
        this._fire("wrOnJoinNotAllowed");
    }
    // ====
    msgBye(msg) {
        if (msg.wr) { // pushed from call to waiting room
            this.assert(this._callJoinPermission || this._callJoinPermission === 0);
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Leaving call and entering waiting room");
                }
            } while (0);
            this.leaveCall(msg.rsn, ConnState.kInWaitingRoom);
            this.reinit();
            this._fire("wrOnPushedFromCall");
        }
        else { // completely disconnected
            this.disconnect(msg.rsn, false);
        }
    }
    handleDeny(msg) {
        switch (msg.deny) {
            case "JOIN": {
                if (this._connState !== ConnState.kCallJoining) {
                    return;
                }
                this.leaveCall(termCodes.kPushedToWaitingRoom, ConnState.kInWaitingRoom);
                break;
            }
            case "audio": {
                this._doMuteAudio(true, true);
                this._fire("onAudioSendDenied", msg.msg);
                break;
            }
            default:
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, `Operation "${msg.deny}" denied: ${msg.msg || "(no details)"}`);
                    }
                } while (0);
                break;
        }
    }
    wrAllowJoin(users) {
        this.send({ a: "WR_ALLOW", users: users });
    }
    wrPush(users) {
        this.send({ a: "WR_PUSH", users: users });
    }
    wrKickOut(users) {
        this.send({ a: "WR_KICK", users: users });
    }
    enableStats() {
        if (this.statTimer) {
            return;
        }
        this.statCtx = {};
        this.statTimer = setInterval(this.pollStats.bind(this), 1000);
    }
    disableStats() {
        if (!this.statTimer) {
            return;
        }
        clearInterval(this.statTimer);
        delete this.statTimer;
    }
    async pollTxVideoStats() {
        let txIsHiRes;
        let slot = this.outVSpeakerTrack;
        if (slot.isSendingTrack()) {
            txIsHiRes = this.rtcStats._vtxIsHiRes = true;
        }
        else {
            slot = this.outVThumbTrack;
        }
        const stats = slot.isSendingTrack() ? (await slot.pollTxStats()) : null;
        if (this.app.onVideoTxStat) {
            if (stats) {
                this.app.onVideoTxStat(!!txIsHiRes, this.rtcStats, stats);
            }
            else if (stats === null) {
                this.app.onVideoTxStat(null);
            }
        }
    }
    async pollMicAudioLevel() {
        let sender = this.outASpeakerTrack.xponder.sender;
        if (!sender.track) {
            return;
        }
        let stats = await sender.getStats();
        for (let item of stats.values()) {
            if (item.type === "media-source") {
                this.micMuteMonitor.onLevel(this.micAudioLevel = item.audioLevel);
                return;
            }
        }
    }
    async pollStats() {
        if (this._connState !== ConnState.kCallJoined) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "pollStats called while not in kCallJoined state");
                }
            } while (0);
            return;
        }
        const stats = this.rtcStats = { txpl: 0, _pktTxTotal: 0, rxpl: 0, _pktRxTotal: 0, jtr: 1000000 };
        this.hasConnStats = false;
        let promises = [this.pollTxVideoStats(), this.pollMicAudioLevel()];
        if (this.outASpeakerTrack.isSendingTrack()) {
            promises.push(this.outASpeakerTrack.pollTxStats());
        }
        for (const rxTrack of this.inAudioTracks.values()) {
            if (rxTrack.active) {
                promises.push(rxTrack.pollRxStats());
            }
        }
        // NOTE: before we used to first wait for all audio stats, because the stats display callbacks are connected
        // to the video stats, and they may want to display audio stats as well - audio stats should be
        // already available. In practice this was not used, and having the audio stats from the previous second
        // would not be a big problem
        for (const rxTrack of this.inVideoTracks.values()) {
            if (rxTrack.active) {
                promises.push(rxTrack.pollRxStats());
            }
        }
        if (promises.length) {
            await Promise.allSettled(promises);
        }
        if (!this.hasConnStats) {
            await this.getConnStatsFromPeerConn();
        }
        if (stats.rx == null && stats.tx == null) {
            return;
        }
        this.addNonRtcStats();
        if (stats.jtr === 1000000) {
            stats.jtr = -1;
        }
        stats.rxpl = SfuClient.calcPacketLossPct(stats.rxpl, stats._pktRxTotal);
        stats.txpl = SfuClient.calcPacketLossPct(stats.txpl, stats._pktTxTotal);
        this._statsRecorder.onStats(this.rtcStats);
        this._svcDriver.onStats();
        if (this.app.onConnStats) {
            this.app.onConnStats(this.rtcStats);
        }
    }
    static calcPacketLossPct(lost, total) {
        return (total || lost)
            ? Math.round(lost * 1000 / (total + lost)) / 10 // truncate to single decimal
            : -1;
    }
    addNonRtcStats() {
        let stats = this.rtcStats;
        stats.q = this._svcDriver.currRxQuality | (this._svcDriver.currTxQuality << 8);
        stats.av = this._sentAv;
        stats.nrxh = this._numRxHiRes;
        stats.nrxl = this._numRxVthumb;
        stats.nrxa = this._numRxAudio;
    }
    parseConnStats(stat) {
        let s = this.rtcStats;
        s.rtt = stat.currentRoundTripTime * 1000;
        let txBwe = stat.availableOutgoingBitrate;
        if (txBwe != null) {
            s.txBwe = Math.round(txBwe / 1024);
        }
        /* this is actually not available on Chrome
        let rxBwe = stat.availableIncomingBitrate;
        if (rxBwe) {
            s.rxBwe = Math.round(rxBwe / 1024);
        }
        */
        let ctx = this.statCtx;
        this.hasConnStats = true;
        if (!ctx.prev) {
            ctx.prev = stat;
            return;
        }
        const prev = ctx.prev;
        ctx.prev = stat;
        const per = (stat.timestamp - prev.timestamp) / 1000;
        s.rx = Math.round(((stat.bytesReceived - prev.bytesReceived) / 128) / per);
        s.tx = Math.round(((stat.bytesSent - prev.bytesSent) / 128) / per);
    }
    async getConnStatsFromPeerConn() {
        if (!this.rtcConn) {
            return;
        }
        let stats = await this.rtcConn.getStats();
        for (let stat of stats.values()) {
            if (stat.type === "candidate-pair" && stat.nominated === true) {
                this.parseConnStats(stat);
            }
        }
    }
    mungeSdpForSvc(media) {
        let ssrcs = media.ssrcs;
        let vidSsrc1 = ssrcs[0];
        let fidSsrc1 = ssrcs[1];
        let id = vidSsrc1.id;
        let vidSsrc2 = { id: ++id, cname: vidSsrc1.cname };
        let vidSsrc3 = { id: ++id, cname: vidSsrc1.cname };
        id = fidSsrc1.id;
        let fidSsrc2 = { id: ++id, cname: fidSsrc1.cname };
        let fidSsrc3 = { id: ++id, cname: fidSsrc1.cname };
        media.ssrcs = [vidSsrc1, vidSsrc2, vidSsrc3, fidSsrc1, fidSsrc2, fidSsrc3];
        media.ssrcg = [
            "SIM " + vidSsrc1.id + " " + vidSsrc2.id + " " + vidSsrc3.id,
            media.ssrcg[0],
            "FID " + vidSsrc2.id + " " + fidSsrc2.id,
            "FID " + vidSsrc3.id + " " + fidSsrc3.id
        ];
    }
}
SfuClient.kProtocolVersion = 3;
SfuClient.debugSdp = localStorage.debugSdp ? 1 : 0;
SfuClient.kMaxVideoSlotsDefault = 24;
SfuClient.kSpatialLayerCount = 3;
SfuClient.kAudioCaptureOptions = {
    echoCancellation: true, autoGainControl: true, noiseSuppression: true
};
SfuClient.kVideoCaptureOptions = { height: 720 };
SfuClient.kScreenCaptureOptions = { height: { max: SvcDriver.kScreenCaptureHeight } };
SfuClient.kVthumbHeight = 90;
SfuClient.kRotateKeyUseDelay = 100;
SfuClient.kPeerReconnNoKeyRotationPeriod = 1000;
SfuClient.kAudioMonTickPeriod = 200;
SfuClient.kSpeakerVolThreshold = 0.001;
SfuClient.kWorkerUrl = '/worker.sfuClient.bundle.js';
SfuClient.kStatServerUrl = "https://stats.sfu.mega.co.nz";
SfuClient.kSpeakerChangeMinInterval = 4000;
SfuClient.ConnState = ConnState;
SfuClient.TermCode = termCodes;
SfuClient.ScreenShareType = ScreenShareType;
SfuClient.Av = Av;
SfuClient.kZeroIv128 = new Uint8Array(16);
SfuClient.msgHandlerMap = {
    "HELLO": SfuClient.prototype.msgHello,
    "AV": SfuClient.prototype.msgAv,
    "ANSWER": SfuClient.prototype.msgAnswer,
    "PEERJOIN": SfuClient.prototype.msgPeerJoin,
    "PEERLEFT": SfuClient.prototype.msgPeerLeft,
    "VTHUMBS": SfuClient.prototype.msgVthumbTracks,
    "HIRES": SfuClient.prototype.msgHiresTracks,
    "HIRES_START": SfuClient.prototype.msgHiresStart,
    "HIRES_STOP": SfuClient.prototype.msgHiresStop,
    "VTHUMB_START": SfuClient.prototype.msgVthumbStart,
    "VTHUMB_STOP": SfuClient.prototype.msgVthumbStop,
    "SPEAKRQ": SfuClient.prototype.msgSpeakReq,
    "SPEAKRQ_DEL": SfuClient.prototype.msgSpeakReqDel,
    "SPEAKER_ADD": SfuClient.prototype.msgSpeakerAdd,
    "SPEAKER_DEL": SfuClient.prototype.msgSpeakerDel,
    "MOD_ADD": SfuClient.prototype.msgModAdd,
    "MOD_DEL": SfuClient.prototype.msgModDel,
    "MUTED": SfuClient.prototype.msgMuted,
    "KEY": SfuClient.prototype.msgKey,
    "BYE": SfuClient.prototype.msgBye,
    "WILL_END": SfuClient.prototype.msgWillEnd,
    "WR_ALLOW": SfuClient.prototype.msgWrAllow,
    "WR_DENY": SfuClient.prototype.msgWrDeny,
    "WR_DUMP": SfuClient.prototype.msgWrDump,
    "WR_ENTER": SfuClient.prototype.msgWrEnter,
    "WR_LEAVE": SfuClient.prototype.msgWrLeave,
    "WR_USERS_ALLOW": SfuClient.prototype.msgWrUsersAllow,
    "WR_USERS_DENY": SfuClient.prototype.msgWrUsersDeny,
    "WR_ALLOW_REQ": SfuClient.prototype.msgWrAllowReq
};
class Slot {
    constructor(client, xponder, generateIv) {
        this.active = false;
        this.statCtx = {};
        this.client = client;
        this.xponder = xponder;
        xponder.slot = this;
        this._sentTrack = null;
        if (generateIv) {
            this.iv = randomBuf(8);
        }
    }
    get mid() {
        if (this._mid != null) {
            return this._mid;
        }
        return this._mid = parseInt(this.xponder.mid);
    }
    createDecryptor() {
        let receiver = this.xponder.receiver;
        let rxStreams = receiver.createEncodedStreams();
        this.client.cryptoWorker.postMessage(['cd', rxStreams.readable, rxStreams.writable, this.mid], [rxStreams.readable, rxStreams.writable]);
    }
    createEncryptor() {
        let sender = this.xponder.sender;
        let txStreams = sender.createEncodedStreams();
        this.client.cryptoWorker.postMessage(['ce', txStreams.readable, txStreams.writable, this.mid,
            this.iv], [txStreams.readable, txStreams.writable]);
    }
    reassign(peer, iv) {
        this.peer = peer;
        // TODO: was parseInt(fromCid)
        this.client.cryptoWorker.postMessage(['dt', this.mid, peer.cid, hexToBin(iv)]);
        this.active = true;
    }
    sendTrack(track) {
        if (track === this._sentTrack) {
            return Promise.resolve();
        }
        this._sentTrack = track;
        return this.xponder.sender.replaceTrack(track)
            .then(() => this.tsStart = Date.now());
    }
    get sentTrack() {
        return this._sentTrack;
    }
    get inTrack() {
        return this.xponder.receiver.track;
    }
    isSendingTrack() {
        return !!this._sentTrack;
    }
    async pollRxStats() {
        const client = this.client;
        const commonStats = client.rtcStats;
        const ctx = this.statCtx;
        let rtpParsed;
        const stats = await this.xponder.receiver.getStats();
        let parseConnStats = !client.hasConnStats;
        for (let stat of stats.values()) {
            if (stat.type === "inbound-rtp") {
                rtpParsed = true;
                if (!ctx.rxPrev) {
                    ctx.rxPrev = stat;
                }
                else {
                    const prev = ctx.rxPrev;
                    ctx.rxPrev = stat;
                    const period = (stat.timestamp - prev.timestamp) / 1000;
                    const recvd = stat.packetsReceived - prev.packetsReceived;
                    commonStats._pktRxTotal += recvd;
                    const plost = (stat.packetsLost - prev.packetsLost);
                    commonStats.rxpl += plost;
                    if (!this.isVideo) {
                        if (stat.jitter != null) {
                            let jtr = Math.round(stat.jitter * 1000);
                            if (commonStats.jtr > jtr) {
                                commonStats.jtr = jtr;
                            }
                        }
                        this.peer.audioPktLoss = recvd ? (plost * 100 / (recvd + plost)) : 0;
                    }
                    else { // video stats
                        if (commonStats.mrxw == null || commonStats.mrxw < stat.frameWidth) {
                            commonStats.mrxw = stat.frameWidth;
                            commonStats.mrxfps = stat.framesPerSecond;
                        }
                        let cbs = this.rxStatsCallbacks;
                        if (cbs.size) {
                            // more detailed stats for app
                            let info = {
                                plost: recvd ? (plost * 100 / (recvd + plost)) : 0,
                                nacktx: (stat.nackCount - prev.nackCount) / period,
                                kbps: ((stat.bytesReceived - prev.bytesReceived) / 128) / period,
                                keyfps: (stat.keyFramesDecoded - prev.keyFramesDecoded) / period
                            };
                            for (let cb of cbs.values()) { // may get unassigned while getting stats
                                cb(this, info, stat);
                            }
                        }
                    }
                }
                if (!parseConnStats) {
                    return;
                }
            }
            else if (parseConnStats && stat.type === "candidate-pair" && stat.nominated) {
                this.client.parseConnStats(stat);
                parseConnStats = false;
                if (rtpParsed) {
                    return;
                }
            }
        }
    }
    async pollTxStats() {
        const client = this.client;
        const reports = await this.xponder.sender.getStats();
        let local, remote;
        let getConnTotals = !client.hasConnStats;
        for (const report of reports.values()) {
            const type = report.type;
            if (type === "outbound-rtp") {
                local = report;
                remote = reports.get(local.remoteId);
                if (!getConnTotals) {
                    break;
                }
            }
            else if (getConnTotals && (type === "candidate-pair") && report.nominated) {
                getConnTotals = false;
                client.parseConnStats(report);
            }
        }
        if (!local || !remote) {
            return null; // not sending
        }
        const ctx = this.statCtx;
        const stats = { local: local, remote: remote };
        const prev = ctx.txPrev;
        if (!prev) {
            ctx.txPrev = stats;
            return undefined; // no stats available yet
        }
        const prevLocal = prev.local;
        const prevRemote = prev.remote;
        ctx.txPrev = stats;
        const rtcStats = client.rtcStats;
        const period = (local.timestamp - prevLocal.timestamp) / 1000;
        const pktSent = local.packetsSent - prevLocal.packetsSent;
        const pktLost = remote.packetsLost - prevRemote.packetsLost;
        rtcStats.txpl += pktLost;
        rtcStats._pktTxTotal += pktSent;
        if (this.isVideo) {
            if (isNaN((rtcStats._vtxkbps = ((local.bytesSent - prevLocal.bytesSent) / 128) / period))) {
                rtcStats._vtxkbps = 0;
            }
            rtcStats.vtxfps = local.framesPerSecond;
            rtcStats.vtxw = local.frameWidth;
            rtcStats.vtxh = local.frameHeight;
            rtcStats._vtxkfps = (local.keyFramesEncoded - prevLocal.keyFramesEncoded) / period;
            rtcStats.vtxdly = pktSent
                ? Math.round((local.totalPacketSendDelay - prevLocal.totalPacketSendDelay) * 1000 / pktSent)
                : -1;
            let limitFlags;
            switch (local.qualityLimitationReason) {
                case "none":
                    limitFlags = 0;
                    break;
                case "cpu":
                    limitFlags = 1 /* TxQualityLimit.kCpu */;
                    break;
                case "bandwidth":
                    limitFlags = 2 /* TxQualityLimit.kBandwidth */;
                    break;
                default: // case "other":
                    limitFlags = 4 /* TxQualityLimit.kOther */;
                    break;
            }
            rtcStats.f = limitFlags;
            //  LOGI("tag:", tag, "nacks:", stat.nackCount, "pli:", stat.pliCount, "fir", stat.firCount, "vtxh:", rtcStats.vtxh);
            return local;
        }
    }
}
class VideoSlot extends Slot {
    constructor(client, xponder, generateIv) {
        super(client, xponder, generateIv);
        this.rxIsHiRes = false;
        this.sentLayers = SfuClient.kSpatialLayerCount;
        this.rxStatsCallbacks = new Map; // key is a VideoPlayer object that receives the stats
        this.isVideo = true;
    }
    reassignV(peer, iv, rxIsHiRes, trackReused, releaseCb) {
        this.release();
        this.rxIsHiRes = rxIsHiRes;
        this._releaseTrackCb = releaseCb;
        super.reassign(peer, iv);
        if (this.rxIsHiRes) {
            this.players = peer.hiResPlayers;
            this.client._numRxHiRes++;
        }
        else {
            this.players = peer.vThumbPlayers;
            this.client._numRxVthumb++;
        }
        for (const player of this.players) {
            player._attachToTrack(this);
        }
    }
    setEncoderParams(cb) {
        let sender = this.xponder.sender;
        let params = sender.getParameters(); // this may block for > 1000ms!
        var encodings = params.encodings;
        if (!encodings) {
            params.encodings = [{}]; // firefox kludge
        }
        else if (!encodings.length) {
            encodings.push({});
        }
        var enc0 = params.encodings[0];
        if (cb(enc0) === false) {
            return Promise.resolve();
        }
        return sender.setParameters(params);
    }
    /*
    setTxSvcLayerCount(count: number) {
        this.sentLayers = count;
        let sender = this.xponder.sender;
        if (!sender) {
            LOGW(`setTxSvcLayerCount: Currently not sending track, will only record value`);
            return Promise.resolve();
        }
        let params: any = sender.getParameters();
        let encs = params.encodings;
        if (!encs || encs.length < 2) {
            LOGW("setTxSvcLayerCount: There is no SVC enabled for this sender");
            return Promise.resolve();
        }
        for (let i = 0; i < encs.length; i++) {
            encs[i].active = i < count;
        }
        LOGW(`setTxSvcLayerCount: Enabling only first ${count} layers`);
        return sender.setParameters(params);
    }
    */
    /** Detaches all players and marks the slot as unused */
    release() {
        if (this.players) {
            for (const player of this.players) {
                player._onTrackGone(this);
            }
            // NOTE: We may already be destroyed via onTrackGone()
            if (this.players) {
                if (this.players.size) {
                    this.client.logError("Soft assert: not all players destroyed, remaining:", this.players.size);
                }
                delete this.players;
            }
        }
        this.active = false;
    }
    _onPlayerAttached(player) {
        if (this.rxIsHiRes) {
            this.peer.updateHiResDivider();
        }
        if (player.gui.onRxStats) {
            this.rxStatsCallbacks.set(player, player.gui.onRxStats.bind(player.gui));
        }
    }
    /** Called by video players when they are detached */
    _onPlayerDetached(player) {
        this.client.assert(this.players);
        this.rxStatsCallbacks.delete(player);
        // LOGW(`slot ${this.isHiRes ? "hires":"lores"} detach from player -> refcnt =`, this.players.size);
        if (!this.players.size) {
            this.active = false;
            this._releaseTrackCb();
            delete this.players;
            if (this.rxIsHiRes) {
                this.client._numRxHiRes--;
            }
            else {
                this.client._numRxVthumb--;
            }
        }
        else if (this.rxIsHiRes) {
            this.peer.updateHiResDivider();
        }
    }
}
/** Video players are created synchronously upon calling getHiResVideo/getVthumbVideo, added to the peer's
 * hiResPlayers/vThumbPlayers, and are temporarily left unattached to a track, because the track's mid is not yet known.
 * When the SFU responds with the mid, the peer's hiresPlayers/vThumbPlayers are attached to the track. This means that
 * the lifetime of players is independent of Slots. Each Peer has two sets of VideoPlayer-s. These sets are managed
 * here
 */
class VideoPlayer {
    constructor(peer, isHiRes, guiCreateCb, hiResDivider) {
        this.peer = peer;
        this._isHiRes = !!isHiRes;
        this._hiResDivider = hiResDivider;
        this.gui = guiCreateCb(this);
        if (isHiRes) {
            if (peer.hiResSlot) { // we already have the hi-res stream
                this._attachToTrack(peer.hiResSlot);
                this.peer.updateHiResDivider();
            }
            else { // we don't have the hi-res stream yet, queue player
                this.players = peer.hiResPlayers;
                this.players.add(this);
            }
        }
        else {
            if (peer.vThumbSlot) {
                this._attachToTrack(peer.vThumbSlot);
            }
            else {
                this.players = peer.vThumbPlayers;
                this.players.add(this);
            }
        }
    }
    get isHiRes() {
        return this._isHiRes;
    }
    get userId() {
        return this.peer.userId;
    }
    get track() {
        return this.slot ? this.slot.inTrack : null;
    }
    get hiResDivider() {
        return this._hiResDivider;
    }
    setHiResDivider(divider) {
        if (divider < 0 || divider > 2) {
            throw new Error(`Invalid res divider ${divider}`);
        }
        this._hiResDivider = divider;
        this.peer.updateHiResDivider();
    }
    _attachToTrack(slot) {
        const client = this.peer.client;
        client.assert(slot);
        client.assert(slot.players);
        if (this.players && this.players !== slot.players) {
            this.players.delete(this);
        }
        this.players = slot.players;
        this.players.add(this);
        // slot.players may have changed even if this.slot hasn't. That's why the check is at this late stage
        if (slot === this.slot) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "VideoPlayer._attachToTrack: Already attached to that slot");
                }
            } while (0);
            return;
        }
        if (this.slot) {
            const prevSlot = this.slot;
            this._detachFromCurrentTrack();
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `VideoPlayer: replacing slot ${prevSlot.mid} with ${slot.mid}`);
                }
            } while (0);
        }
        this.slot = slot;
        this.gui.attachToTrack(slot.inTrack);
        slot._onPlayerAttached(this);
    }
    _onTrackGone(slot) {
        this.peer.client.assert(slot === this.slot);
        this.destroy(); //TODO: Maybe not destroy even if track is gone
    }
    _detachFromCurrentTrack() {
        this.peer.client.assert(this.players);
        if (!this.players.delete(this)) {
            this.peer.client.logError("VideoPlayer._detachFromCurrentTrack: BUG: Was not in the players set");
        }
        const slot = this.slot;
        if (slot) {
            this.gui.detachFromTrack();
            slot._onPlayerDetached(this);
            delete this.slot;
        }
    }
    destroy() {
        if (this.isDestroyed) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "VideoPlayer.destroy: Already destroying/destroyed");
                }
            } while (0);
            return;
        }
        this.isDestroyed = true; // callbacks may try to destroy() us again
        this._detachFromCurrentTrack(); // manages refcounting and deletion from vThumbPlayers and hiResPlayers sets
        this.gui.onPlayerDestroy();
    }
}
class AudioPlayer {
    constructor(peer, slot) {
        this.slowAudioLevel = 0.0;
        this.peer = peer;
        this.slot = slot;
        peer.client._numRxAudio++;
        this.onAudioLevel = peer._onAudioLevel;
        // connect track to a player
        const rx = this.receiver = slot.xponder.receiver;
        const player = this.playerElem = document.createElement("audio");
        this.peer.client._speakerDetector.registerPeer(this);
        playerPlay(player, rx.track);
    }
    pollAudioLevel(trackSlow) {
        if (!this.receiver) {
            return 0.0;
        }
        const info = this.receiver.getSynchronizationSources()[0];
        if (!info) {
            return 0.0;
        }
        let currLevel = info.audioLevel;
        if (currLevel === undefined) {
            currLevel = 0.0;
        }
        if (this.onAudioLevel) {
            this.onAudioLevel(currLevel);
        }
        return trackSlow
            ? (this.slowAudioLevel = (this.slowAudioLevel * 9 + currLevel) / 10)
            : undefined;
    }
    destroy() {
        const client = this.peer.client;
        client._speakerDetector.unregisterPeer(this);
        playerStop(this.playerElem);
        client._numRxAudio--;
    }
}
function playerPlay(player, track, dontRestart) {
    if (dontRestart && !player.paused && player.srcObject &&
        player.srcObject.getTracks()[0] === track) {
        return;
    }
    player.srcObject = new MediaStream([track]);
    let ts = Date.now();
    player.play()
        .then(() => {
        do {
            if (window.d) {
                console.log(client_kLogTag, `play() returned after ${Date.now() - ts} ms`);
            }
        } while (0);
    })
        .catch(function (err) { });
}
function playerStop(player) {
    player.pause();
    try {
        player.srcObject = null;
    }
    catch (ex) { }
}
function logReplacerFunc(name, val) {
    if (name === "av") {
        return `${val}(${Av.toString(val)})`;
    }
    else if (name === "sdp") {
        return SfuClient.debugSdp ? val : compressedSdpToString(val);
    }
    else {
        return val;
    }
}
class Peer {
    constructor(client, info, isInitialDump) {
        this.data = {};
        this._audioLevel = 0;
        this._speakReq = false;
        this.vThumbPlayers = new Set();
        this.hiResPlayers = new Set();
        this.hiResDivider = 0;
        this.audioPktLoss = 0;
        client.assert(info.cid);
        client.assert(info.userId);
        client.assert(info.pubk);
        client.assert(!isNaN(info.av));
        this.client = client;
        this.handler = client.app;
        this.cid = info.cid;
        if (info.prevCid) {
            this.prevCid = info.prevCid;
        }
        this.userId = info.userId;
        this.version = info.v;
        this.av = info.av;
        this.strIvs = info.ivs;
        this.keyDecryptIv = hexToBin(this.strIvs[0] + this.strIvs[1].substring(0, 8));
        this.encryptKeyToUser = client.app.encryptKeyToUser.bind(client.app); // performance optimization
        client._addPeer(this);
        this.verifyAndDeriveSharedSessKey(info.pubk);
        if (info.amid) {
            this.onAudioStart(info.amid);
        }
        if (!isInitialDump) {
            this._fire("onPeerJoined");
        }
        client._maybeResumeRecordingPeer(this);
    }
    get isModerator() {
        let mods = this.client.moderators;
        return mods ? mods.has(this.userId) : true;
    }
    get isSpeaker() {
        const client = this.client;
        return !client.speakApproval || this.isModerator || client.speakers.has(this.userId);
    }
    get audioLevel() { return this._audioLevel; }
    get speakRequested() { return this._speakReq; }
    get isLeavingCall() { return this.isLeaving; }
    async verifyAndDeriveSharedSessKey(pubKey) {
        const pms = this.sessSharedKey = createPromiseWithResolveMethods();
        const items = pubKey.split(':');
        if (items.length !== 2) {
            throw new Error(`Bad pubkey format from peer ${this.userId}:${this.cid}`);
        }
        if (!(await this.client.app.verifySignature(`sesskey|${this.client.callId}|${this.cid}|${items[0]}`, items[1], this.userId))) {
            pms.reject(`Pubkey signature verification failed for peer ${this.userId}:${this.cid}`);
        }
        this.sessSharedKey = await this.deriveSharedKey(items[0]);
        pms.resolve(this.sessSharedKey);
    }
    async deriveSharedKey(strPeerPubKey) {
        const peerPubKey = base64DecodeToArr(strPeerPubKey);
        const dhSharedKey = window.nacl.scalarMult(this.client.privSessKey, peerPubKey);
        // HKDF transform
        const hkdfKey = await window.crypto.subtle.importKey("raw", dhSharedKey, "HKDF", false, ["deriveKey", "deriveBits"]);
        return crypto.subtle.deriveKey({
            name: "HKDF", hash: "SHA-256",
            salt: hexToBin([this.strIvs[1], this.strIvs[2], this.client.strIvs[1], this.client.strIvs[2]].sort().join('')),
            info: new Uint8Array([])
        }, hkdfKey, { name: this.version === 1 ? "AES-GCM" : "AES-CBC", length: 256 }, false, ["encrypt", "decrypt"]);
    }
    async encryptKey(key) {
        let encKey;
        let sharedKey = this.sessSharedKey;
        if (sharedKey) { // new clients, implementing ephemeral session key pair
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `Using ephemeral session key for client ${this.userId}:${this.cid}`);
                }
            } while (0);
            if (sharedKey.then) { // it's a promise, wait till key is decrypted and imported
                await sharedKey;
                sharedKey = this.sessSharedKey;
            }
            this.client.assert(sharedKey.usages);
            let encKeyBin;
            if (this.version === 1) {
                encKeyBin = await crypto.subtle.encrypt({ name: "AES-GCM", iv: this.client.keyEncryptIv, tagLength: 32 }, sharedKey, key);
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, "Encrypting key with AES-GCM for protocol v1 peer");
                    }
                } while (0);
            }
            else {
                encKeyBin = await crypto.subtle.encrypt({ name: "AES-CBC", iv: SfuClient.kZeroIv128 }, sharedKey, key);
                do {
                    if (window.d) {
                        console.warn(client_kLogTag, "Encrypting key with AES-CBC for protocol v2 peer");
                    }
                } while (0);
            }
            encKey = base64ArrEncode(encKeyBin);
        }
        else { // old clients, using chat keys
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `Using chat key (OLD crypto scheme) for client ${this.userId}:${this.cid}`);
                }
            } while (0);
            encKey = await this.encryptKeyToUser(key, this.userId);
        }
        return [this.cid, encKey];
    }
    encryptAndSendLastKey() {
        if (!this.client.sentAv) {
            return;
        }
        const key = this.client._newestSendKey;
        if (!key || key === this.lastKeySent) {
            return null;
        }
        this.lastKeySent = key;
        this.encryptKey(key.key)
            .then((info) => {
            this.client.send({ a: "KEY", id: key.id & 0xff, data: [info] });
        });
    }
    async decryptKey(key) {
        let sharedKey = this.sessSharedKey;
        if (sharedKey) { // new clients, implementing ephemeral session key pair
            if (sharedKey.then) { // it's a promise, wait till key is decrypted and imported
                await sharedKey;
                sharedKey = this.sessSharedKey;
            }
            this.client.assert(sharedKey.usages);
            return this.version === 1
                ? crypto.subtle.decrypt({ name: "AES-GCM", iv: this.keyDecryptIv, tagLength: 32 }, sharedKey, base64DecodeToArr(key).buffer)
                : crypto.subtle.decrypt({ name: "AES-CBC", iv: SfuClient.kZeroIv128 }, sharedKey, base64DecodeToArr(key).buffer);
        }
        else { // old clients, using chat keys
            return this.client.app.decryptKeyFromUser(key, this.userId);
        }
    }
    destroy(reason) {
        this.isLeaving = true;
        this.client._removePeer(this);
        if (this.audioPlayer) {
            this.audioPlayer.destroy();
            delete this.audioPlayer;
        }
        for (const player of this.hiResPlayers) {
            player.destroy();
        }
        this.client.assert(!this.hiResPlayers.size);
        for (const player of this.vThumbPlayers) {
            player.destroy();
        }
        this.client.assert(!this.vThumbPlayers.size);
        this._fire("onPeerLeft", reason);
    }
    get receivingThumbVideo() { return this.vThumbPlayers.size > 0; }
    get receivingHiResVideo() { return this.hiResPlayers.size > 0; }
    getThumbVideo(guiCreateCb, reuseHiRes) {
        if (!(this.av & Av.LowResVideo)) {
            throw new Error(`getThumbVideo: Peer ${this.cid} is not sending low-res video`);
        }
        const player = new VideoPlayer(this, false, guiCreateCb);
        if (this.vThumbPlayers.size === 1 || reuseHiRes) {
            // we had no vthumb track and players, or we had all vthumb players hooked to the hi-res track
            this.client.send({ a: "GET_VTHUMBS", cids: [this.cid], ...(reuseHiRes && { r: 1 }) });
        }
        return player;
    }
    stopThumbVideo() {
        for (const player of this.vThumbPlayers) {
            player.destroy();
        }
    }
    calcHiResDivider() {
        let divider = 2;
        for (const player of this.hiResPlayers) {
            const playerDiv = player.hiResDivider;
            if (playerDiv < divider) {
                divider = playerDiv;
            }
        }
        return divider;
    }
    updateHiResDivider() {
        const newDiv = this.calcHiResDivider();
        this._setHiResDivider(newDiv);
    }
    getHiResVideo(resDivider, guiCreateCb, reuseVthumb) {
        if (!(this.av & Av.HiResVideo)) {
            throw new Error(`getHiResVideo: Peer ${this.cid} is not sending hi-res video`);
        }
        if (resDivider < 0 || resDivider > 2) {
            throw new Error(`Invalid res divider ${resDivider}`);
        }
        const player = new VideoPlayer(this, true, guiCreateCb, resDivider);
        if (!this.receivingHiRes || reuseVthumb) {
            this.hiResDivider = resDivider;
            this.client.send({
                a: "GET_HIRES",
                cid: this.cid,
                lo: resDivider,
                ...(reuseVthumb && { r: 1 })
            });
            this.receivingHiRes = true;
        }
        return player;
    }
    _stopHiResVideo() {
        for (const player of this.hiResPlayers) {
            player.destroy();
        }
    }
    _sendDelVthumbs() {
        if (!this.isLeaving) {
            this.client.send({ a: "DEL_VTHUMBS", cids: [this.cid] });
        }
    }
    incomingVthumbTrack(mid, reused) {
        if (!this.vThumbPlayers.size) { // all players were deleted before the server responded
            this._sendDelVthumbs();
            return;
        }
        const slot = this.client.inVideoTracks.get(mid);
        if (!slot) {
            this.client.logError("Unknown vtrack mid", mid);
            return;
        }
        // if Peer.vThumbSlot/hiResSlot is set, the slot must have its .players property set as well
        this.vThumbSlot = slot;
        slot.reassignV(this, this.strIvs[TxTrackIndex.kVthumb], false, reused, () => {
            if (slot !== this.vThumbSlot) {
                return;
            }
            delete this.vThumbSlot;
            this._sendDelVthumbs();
        });
        // reassignV sets the .players property of the slot
    }
    _sendDelHires() {
        if (!this.isLeaving) {
            this.client.send({ a: "DEL_HIRES", cids: [this.cid] });
            delete this.receivingHiRes;
        }
    }
    incomingHiResVideoTrack(mid, reused) {
        if (!this.hiResPlayers.size) {
            this._sendDelHires();
            return;
        }
        const slot = this.client.inVideoTracks.get(mid);
        if (!slot) {
            this.client.logError("Unknown vtrack mid", mid);
            return;
        }
        this.hiResSlot = slot;
        if (this.vThumbSlot === slot) {
            this.client.assert(reused);
        }
        slot.reassignV(this, this.strIvs[TxTrackIndex.kHiRes], true, reused, () => {
            if (slot !== this.hiResSlot) {
                return;
            }
            delete this.hiResSlot;
            this._sendDelHires();
        });
    }
    _setHiResDivider(divider) {
        if (divider < 0 || divider > 2) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `setHiResDivider: invalid resolution divider value (spatial layer offset) ${divider}, must be 0, 1 or 2`);
                }
            } while (0);
            return;
        }
        if (divider === this.hiResDivider) {
            return;
        }
        this.hiResDivider = divider;
        if (this.hiResPlayers.size) {
            this.client.send({ a: "HIRES_SET_LO", cid: this.cid, lo: divider });
        }
    }
    onAvChange(msg) {
        const av = msg.av;
        if (av === this.av) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Peer.onAvChange: No actual change in av flags");
                }
            } while (0);
            return;
        }
        const oldAv = this.av;
        this.av = av;
        try {
            if ((oldAv ^ av) & Av.Audio) { // change in audio
                if (av & Av.Audio) { // peer starts sending audio
                    const mid = msg.amid;
                    if (isNaN(mid)) {
                        this.client.logError("Peer.onAvChange: No 'amid' specified when started sending audio");
                        return;
                    }
                    this.onAudioStart(mid);
                }
                else {
                    this.onAudioEnd();
                }
            }
        }
        finally {
            this._fire("onPeerAvChange", av, oldAv);
            // Must be last, so that the players have the updated state of the app as a result of onPeerAvChange
            // This is used by the recorder link player to know if we are still recording that peer
            this._notifyPlayers("onAvChange", av, oldAv);
        }
    }
    _notifyPlayers(event, ...args) {
        for (const player of this.vThumbPlayers) {
            const gui = player.gui;
            const handler = gui[event];
            if (handler) {
                handler.call(gui, ...args);
            }
        }
        for (const player of this.hiResPlayers) {
            const gui = player.gui;
            const handler = gui[event];
            if (handler) {
                handler.call(gui, ...args);
            }
        }
    }
    sendsCameraAndScreen() {
        return Av.hasCamAndScreen(this.av);
    }
    onAudioStart(mid) {
        // prepare track
        const slot = this.client.inAudioTracks.get(mid);
        if (!slot) {
            this.client.logError("onAudioStart: Unknown audio track mid", mid);
            return;
        }
        slot.reassign(this, this.strIvs[TxTrackIndex.kAudio]);
        this.audioPlayer = new AudioPlayer(this, slot);
    }
    onAudioEnd() {
        if (this.audioPlayer) {
            this.audioPlayer.destroy(); // audioPlayer must exist, but just in case
        }
        delete this.audioPlayer;
    }
    requestAudioLevel(cb) {
        this._onAudioLevel = cb; // need this saved in Peer, to survive between AudioPlayer instances
        if (this.audioPlayer) {
            this.audioPlayer.onAudioLevel = cb;
        }
    }
    _fire(evName, ...args) {
        let method = this.handler[evName];
        if (!method) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, `Peer: Unhandled event: ${evName}(${args.join(",")})`);
                }
            } while (0);
            return;
        }
        do {
            if (window.d) {
                console.log(client_kLogTag, `fire [${evName}](${args.join(',')})`);
            }
        } while (0);
        try {
            if (args) {
                method.call(this.handler, this, ...args);
            }
            else {
                method.call(this.handler, this);
            }
        }
        catch (ex) {
            this.client.logError("Event handler for", evName, "threw exception:", ex.stack);
        }
    }
    _doStartRecording() {
        this.getHiResVideo(0, (player) => {
            return new PeerRecorderLink(player, this.client.callRecorder);
        });
    }
}
function createPromiseWithResolveMethods() {
    let cbResolve;
    let cbReject;
    var pms = new Promise(function (resolve, reject) {
        cbResolve = resolve;
        cbReject = reject;
    });
    pms.resolve = function (val) {
        if (pms.done) {
            return;
        }
        pms.done = true;
        cbResolve(val);
    };
    pms.reject = function (err) {
        if (pms.done) {
            return;
        }
        pms.done = true;
        cbReject(err);
    };
    return pms;
}
function randomBuf(binLen) {
    var bin = new Uint8Array(binLen);
    crypto.getRandomValues(bin);
    return bin;
}
const hexDigits = "0123456789abcdef";
function binToHex(arr) {
    var result = "";
    arr = new DataView(arr.buffer || arr);
    for (let i = 0; i < arr.byteLength; i++) {
        let val = arr.getUint8(i);
        result += hexDigits.charAt(val >>> 4);
        result += hexDigits.charAt(val & 0x0f);
    }
    return result;
}
function hexDigitVal(chCode) {
    if (chCode <= 57) { // ascii code if '9'
        return chCode - 48; // ascii code of '0'
    }
    else if (chCode >= 97) { // 'a'
        return 10 + chCode - 97;
    }
    else {
        return 10 + chCode - 65; // 'A'
    }
}
function hexToBin(hexStr) {
    let bin = new Uint8Array(hexStr.length >>> 1);
    for (let pos = 0, binPos = 0; pos < hexStr.length; binPos++) {
        bin[binPos] = (hexDigitVal(hexStr.charCodeAt(pos++)) << 4) | hexDigitVal(hexStr.charCodeAt(pos++));
    }
    return bin;
}
class RequestBarrier {
    async callFunc(thisObj, func, ...args) {
        while (this._busy) {
            await this._busy;
        }
        this._busy = func.call(thisObj, ...args);
        let result = await this._busy;
        delete this._busy;
        return result;
    }
}
class MicMuteMonitor {
    constructor(client) {
        this.micLevelAvg = 0;
        this.client = client;
    }
    delTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            delete this.timer;
        }
    }
    reinit() {
        this.delTimer();
        delete this.micInputSeen;
    }
    stop() {
        this.delTimer();
    }
    restart() {
        this.micLevelAvg = 0.0;
        this.muteIndicatorActive = false;
        this.delTimer();
        this.timer = setTimeout(() => {
            delete this.timer;
            this.fireWarning();
        }, MicMuteMonitor.kWarningTimeoutMs);
        do {
            if (window.d) {
                console.log(client_kLogTag, "Started mic muted monitor");
            }
        } while (0);
    }
    fireWarning() {
        this.muteIndicatorActive = true;
        if (this.micInputSeen) {
            this.client._fire("onMicSignalDetected", false);
        }
        else {
            this.client._fire("onNoMicInput");
            this.client.logError("No mic signal detected");
        }
    }
    onLevel(level) {
        let avg = this.micLevelAvg = (level > this.micLevelAvg) ? level : (level + this.micLevelAvg) / 2;
        if (avg >= MicMuteMonitor.kMicMutedDetectThreshold) {
            this.micInputSeen = true;
            if (this.timer) {
                this.delTimer();
            }
            else if (this.muteIndicatorActive) {
                delete this.muteIndicatorActive;
                this.client._fire("onMicSignalDetected", true);
            }
        }
        else if (!this.muteIndicatorActive && !this.timer) { // avg is below threshold
            this.fireWarning();
        }
    }
}
MicMuteMonitor.kMicMutedDetectThreshold = 0.00001;
MicMuteMonitor.kWarningTimeoutMs = 16000;
class SpeakerDetector {
    constructor(client) {
        this.players = new Set();
        this.tsLastChange = 0;
        this.client = client;
        this.enable(false);
    }
    enable(enable) {
        this.enabled = enable;
        if (!this.players.size) {
            return;
        }
        this.deleteTimer();
        let cb = enable ? this._onTimerTick_active.bind(this) : this._onTimerTick_passive.bind(this);
        this.timer = setInterval(cb, SfuClient.kAudioMonTickPeriod);
    }
    deleteTimer() {
        if (!this.timer) {
            return;
        }
        clearInterval(this.timer);
        delete this.timer;
    }
    registerPeer(player) {
        this.players.add(player);
        if (!this.timer) {
            this.enable(this.enabled);
        }
    }
    unregisterPeer(player) {
        this.players.delete(player);
        if (this.currSpeaker === player) {
            delete this.currSpeaker;
        }
        if (!this.players.size) {
            this.deleteTimer();
        }
    }
    _onTimerTick_passive() {
        for (const player of this.players) {
            player.pollAudioLevel();
        }
    }
    _onTimerTick_active() {
        let maxLevel = SfuClient.kSpeakerVolThreshold;
        let maxPlayer = null;
        for (const player of this.players) {
            const level = player.pollAudioLevel(true);
            if (level > maxLevel) {
                maxLevel = level;
                maxPlayer = player;
            }
        }
        if (!maxPlayer) {
            return;
        }
        let now = Date.now();
        let client = this.client;
        let ourLevel = (now - client.tsMicAudioLevel < 1500) ? client.micAudioLevel : 0;
        if (ourLevel > maxLevel) {
            maxPlayer = null;
        }
        if (maxPlayer === this.currSpeaker) {
            return;
        }
        if (now - this.tsLastChange < SfuClient.kSpeakerChangeMinInterval) {
            return;
        }
        this.tsLastChange = now;
        const prev = this.currSpeaker ? this.currSpeaker.peer : null;
        this.currSpeaker = maxPlayer;
        if (maxPlayer) {
            const peer = maxPlayer.peer;
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Active speaker changed to", peer.userId);
                }
            } while (0);
            this.client.assert(this.client.peers.get(peer.cid));
            this.client.app.onActiveSpeakerChange(peer, prev);
        }
        else {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Active speaker changed to us");
                }
            } while (0);
            this.client.app.onActiveSpeakerChange(null, prev);
        }
    }
}
class StatsRecorder {
    constructor(client) {
        this.client = client;
    }
    reset() {
        this.arrays = {
            t: []
        };
        delete this.tsStart;
    }
    start() {
        this.tsStart = Date.now();
    }
    get started() {
        return this.tsStart != null;
    }
    onStats(sample) {
        if (!this.tsStart) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "statsRecoder: onStats called while we are not started");
                }
            } while (0);
            return;
        }
        let arrays = this.arrays;
        let tarr = arrays.t;
        let len = tarr.length;
        tarr.push(Date.now() - this.tsStart);
        for (let id in sample) {
            if (id.startsWith('_')) {
                continue;
            }
            let arr = arrays[id];
            if (!arr) {
                arr = arrays[id] = new Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = -1;
                }
            }
            arr.push(sample[id]);
        }
    }
    submit(termReason) {
        if (!this.tsStart) {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "StatsRecorder.submit: was not started (tsStart is not set)");
                }
            } while (0);
            return;
        }
        let arrs = this.arrays;
        let len = arrs.t.length;
        for (let id in arrs) {
            if (id === 't') {
                continue;
            }
            let arr = arrs[id];
            if (arr.length < len) {
                let oldLen = arr.length;
                for (let i = oldLen; i < len; i++) {
                    arr[i] = -1;
                }
            }
            arrs[id] = StatsRecorder.compressArray(arr);
        }
        let duration = Date.now() - this.tsStart;
        let client = this.client;
        let verMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9\.]+)\s/);
        let ua = (verMatch && verMatch.length >= 3) ? ("wc:" + verMatch[2]) : "w?:?";
        ua += `;${commitId}`;
        let data = {
            ua: ua,
            userid: client.userId,
            cid: client.cid,
            callid: client.callId,
            toffs: client.joinToffs,
            dur: duration,
            peers: client.maxPeers,
            samples: arrs,
            trsn: termReason,
            v: SfuClient.kProtocolVersion
        };
        if (!this.client.micInputSeen) {
            data.nomic = 1;
        }
        if (this.client.callConfig.isGroup) {
            data.grp = 1;
        }
        if (client.url) {
            data.sfu = new URL(client.url).host;
        }
        do {
            if (window.d) {
                console.log(client_kLogTag, `Posting stats to ${SfuClient.kStatServerUrl}/stats:\n`, data);
            }
        } while (0);
        fetch(SfuClient.kStatServerUrl + "/stats", {
            method: "POST",
            body: JSON.stringify(data)
        }).catch((ex) => {
            do {
                if (window.d) {
                    console.warn(client_kLogTag, "Failed to post stats:", ex.message);
                }
            } while (0);
        });
    }
    static compressArray(arr) {
        let len = arr.length;
        if (len < 1) {
            return arr;
        }
        let result = [];
        let lastVal = arr[0];
        let lastIdx = 0;
        for (let i = 1; i < len; i++) {
            let val = arr[i];
            if (val === lastVal) {
                continue;
            }
            let numRpt = i - lastIdx;
            result.push((numRpt < 2) ? lastVal : [lastVal, numRpt]);
            lastIdx = i;
            lastVal = val;
        }
        let numRpt = len - lastIdx;
        result.push((numRpt < 2) ? lastVal : [lastVal, numRpt]);
        return result;
    }
}
;
class PeerRecorderLink {
    constructor(player, recorder) {
        this.player = player;
        this.recorder = recorder;
    }
    attachToTrack(track) {
        this.track = track;
        this.recorder.setVideoInput(track, () => {
            delete this.track; // makes detachFromTrack() ignore us
            if (!this.player.isDestroyed) {
                this.player.destroy(); // we may be called from detachFromTrack, being called from Player.destroy()
            }
        });
    }
    detachFromTrack() {
        const track = this.track;
        if (!track) {
            return;
        }
        delete this.track;
        if (this.recorder.videoInputTrack() === track) {
            this.recorder.setVideoInput(null);
        }
    }
    onPlayerDestroy() { }
    onAvChange(av, oldAv) {
        const peer = this.player.peer;
        if (peer.client.recForcedPeerCid !== peer.cid) {
            return;
        }
        if (!(av & Av.HiResVideo)) {
            this.recorder.setVideoInput(null);
        }
    }
}
function msDelay(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => resolve(), ms);
    });
}
function addNullObjProperty(obj, name, val) {
    if (!obj) {
        return { [name]: val };
    }
    else {
        obj[name] = val;
        return obj;
    }
}
if (!SfuClient.platformHasSupport()) {
    console.error("This browser does not support insertable streams");
}
let ns = SfuClient;
ns.playerPlay = playerPlay;
ns.playerStop = playerStop;
ns.binToHex = binToHex;
ns.hexToBin = hexToBin;
ns.base64ArrEncode = base64ArrEncode;
ns.base64DecodeToArr = base64DecodeToArr;
window.SfuClient = SfuClient;
window.Av = Av;

/******/ })()
;