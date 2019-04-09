// jscs: disable validateIndentation
// jshint -W116
// jshint -W089
// jshint -W074
// jshint -W004

mBroadcaster.once('startMega', function() {
if (!window.RTC || !window.RTCPeerConnection || !RTCPeerConnection.prototype.getStats
    || (RTC.browser !== 'chrome' && RTC.browser !== 'opera' && RTC.browser !== 'firefox')) {
    return;
}

var STATFLAG_SEND_CPU_LIMITED_RESOLUTION = 4;
var STATFLAG_SEND_BANDWIDTH_LIMITED_RESOLUTION = 8;

function prettyNum(v) {
    if (v > 1048576) {
        return (v/1048576).toFixed(1)+'M';
    } else if (v > 1024) {
        return (v/1024).toFixed(1)+'K';
    } else {
        return (Math.floor(v));
    }
}

function mergeObjects(dest, src) {
    for(var k in src) {
        dest[k] = src[k];
    }
    return dest;
}
function createArrayWithValue(len) {
    if (len === 0) {
        return [];
    }
    var arr = new Array(len);
    for (var i = 0; i < len; i++) {
        arr[i] = -1;
    }
    return arr;
}

function appendEmptyValuesToArray(arr, len) {
    while (arr.length < len) {
        arr.push(-1);
    }
}

function addSampleToArrays(sample, arrs, len) {
    // s is a dictionary of values and subdictionaries of values, representing a single snapshot
    // This method does not do hasOwnProperty() checks, and assumes the objects are simple
    // non-native non-inherited js objects
    for (var k in sample) {
        if (k.charAt(0) === '_') {
            continue;
        }
        var val = sample[k];
        if (val instanceof Object) {
            var sub = arrs[k];
            if (!sub) {
                sub = arrs[k] = {};
            }
            addSampleToArrays(val, sub, len); //this points to the object owning the cloneObject() method
        } else { // val is a primitive value
            if (isNaN(val)) {
                val = -1;
            }
            var arr = arrs[k];
            if (arr == null) { // there is no array for this propery, create one
                arr = arrs[k] = createArrayWithValue(len);
            } else if (len > arr.length) {
                appendEmptyValuesToArray(arr, len);
            }
            arr.push(Math.round(val * 10) / 10);
        }
    }
}

function calcBwAverage(s, period, totBytes, prevSample) {
    s._totBytes = totBytes;
    var prevBytes;
    if (prevSample.isNull || ((prevBytes = prevSample._totBytes) == null)) {
        prevBytes = 0;
    }

	var perBytes = totBytes - prevBytes;
    var kbps = (perBytes / 128) / period; // from bytes/s to kbits/s
    if (isNaN(kbps)) {
        s.kbps = -1;
    } else {
        s.kbps = Math.round(kbps * 10) / 10;
    }
}

function statItemToString(s, name, nest) {
    if (typeof nest === 'undefined') {
        nest = 0;
    }

    var pad = nest ? Array(nest+1).join(' ') : '';
    var ret = name ? (pad+'=== '+name+' ===\n') : '';
    var objs = [];
    var hadValue = false;
    for (var k in s) {
        if (k[0] === '_') {
            continue;
        }
		var v = s[k];
        if (((typeof v) != 'object')) {
            hadValue = true;
			ret+=pad;
            ret+=k;
			ret+=': ';
            if (typeof v === 'number') {
                ret+=prettyNum(v);
            } else {
                ret+=v;
            }
			ret+='\n';
        } else {
            objs.push({k:k, v:v});
        }
	}
    if (hadValue) {
        ret+='\n';
    }
    for (var i=0; i<objs.length; i++) {
        var obj = objs[i];
        ret+=statItemToString(obj.v, obj.k, nest+1);
    }
	return ret;
}
function createStatSample() {
    return { a: { r: {}, s: {}}, v: { r: {}, s: {}}};
}

function Recorder(rtcConn, maxSamplePeriod, handler) {
    var self = this;
    self._rtcConn = rtcConn;
    // Create the sample arrays. We use the ts array length as reference, so it must always exist
    // The f[] array is also always appended, independent of the stats dictionary, so it always exists.
    self.sampleArrays = {ts: [], a: {r: {}, s: {}}, v: {r: {}, s: {}}};
    self._lastSampleTs = Date.now();
    // Create the structure for the current sample. It must have the basic structure because
    // some code (i.e. calcBwAverage()) tries to access previous values
    self._stats = createStatSample();
    // isNull is used to detect if there was actually a previous sample
    self._stats.isNull = true;
    self._commonStats = {};
    self._maxSamplePeriod = maxSamplePeriod * 1000;
    self._handler = handler;

    if (RTC.isFirefox) {
        var recvs = rtcConn.getReceivers();
        for (var i = 0; i < recvs.length; i++) {
            var rx = recvs[i];
            if (rx.track.kind === "audio") {
                self._audioRtpContribSrc = rx.getContributingSources()[0];
            }
        }
    }
}

Recorder.prototype.pollStats = function() {
    var self = this;
    if (self._waitingForStats) {
        // If pollStats is called before the stats from the previous call are ready,
        // ignore the second call
        return;
    }
    if (!self._tsStart) {
        self._tsStart = Date.now();
    }
    var pc = self._rtcConn;
    if (!pc || (pc.state === 'ended')) {
        return;
    }
    self._waitingForStats = true;
    if (RTC.isChrome) {
        pc.getStats(
            self.onStats.bind(self),
            pc.getRemoteStreams()
        );
    } else if (RTC.isFirefox) {
        if (RTC.supportsRxTxGetStats) {
            var statsMap = {};
            var promises = [];
            var senders = pc.getSenders();
            var len = senders.length;
            for(var i = 0; i < len; i++) {
                promises.push(senders[i].getStats().then(function(stats) {
                    for (var k in stats) {
                        statsMap[k] = stats.get(k);
                    }
                }));
            }
            var receivers = pc.getReceivers();
            len = receivers.length;
            for(var i = 0; i < len; i++) {
                promises.push(receivers[i].getStats().then(function(stats) {
                    for (var k in stats) {
                        statsMap[k] = stats.get(k);
                    }
                }));
            }
            Promise.all(promises).then(function() {
                self.onStats(statsMap);
            });
        } else {
            pc.getStats(null, self.onStats.bind(self));
        }
    } else {
        assert(false, "Unsupported browser for webrtc stats");
    }
}

function cloneObject(obj) {
// This metod does not do hasOwnProperty() checks, and assumes the objects are simple non-native non-inherited js objects
    var ret = {};
    for (var k in obj) {
        var p = obj[k];
        if (typeof p === 'object') {
            ret[k] = cloneObject(p); //this points to the object owning the cloneObject() method
        } else {
            ret[k] = p;
        }
    }
    return ret;
}

/** Adds the current statistics to the sample array */
Recorder.prototype.addStat = function() {
    var arrays = this.sampleArrays;
    this._lastAddedSampleTs = this._stats.ts;
    addSampleToArrays(this._stats, arrays, arrays.ts.length);
}

Recorder.prototype.boolStat = function(stat, name) {
    var val = stat.stat(name);
    if (typeof val === 'string') {
        return (val === 'true') ? 1 : 0;
    } else {
        return val ? 1 : 0;
    }
};

Recorder.prototype.onStats = function(rtcStats) {
  // console.log("stats:", rtcStats);
  try {
    var self = this;
    var now = Date.now();
    delete self._waitingForStats;
    var period = (now - self._lastSampleTs) / 1000;
    self._lastSampleTs = now;

    var prevSample = self._stats;
    var stats = self._stats = createStatSample();
    stats.ts = now - self._tsStart;
    stats.per = period;

    var localStream = self._rtcConn.getLocalStreams()[0]; // need it to determine what we send - audio and/or video
    //  Note that we may not have a local stream if usermedia access was denied
    //  or there is no cam and mic
    stats.f = Av.fromStream(localStream);

    if (RTC.isChrome) {
        rtcStats.result().forEach(function(item) {
            self.parseChromeStat(period, item, prevSample);
        });
    } else if (RTC.isFirefox) {
        var asrc = self._audioRtpContribSrc;
        if (asrc) {
            var level = asrc.audioLevel;
            if (level != null) {
                stats._peerAudioLevel = Math.round(level * 100);
            }
        }
        for (var k in rtcStats) {
            var s = rtcStats[k];
            self.parseFirefoxStat(period, rtcStats, s, prevSample);
        }
    }
    var astat = stats.a;
    var astatr = astat.r;
    // var astats = astat.s;
    var vstat = stats.v;
    var vstatr = vstat.r;
    var vstats = vstat.s;

    var addSample = false;
    if (prevSample.isNull) {
        addSample = true;
    } else {
        var shouldAddSample = function() {
            // prevSample.ts and prevSample.f are set independent of the stats dictionary,
            // so they are guaranteed to exist
            var pastat = prevSample.a;
            var pastatr = pastat.r;
            // var pastats = pastat.s;
            var pvstat = prevSample.v;
            var pvstatr = pvstat.r;
            var pvstats = pvstat.s;
            if (stats.ts - self._lastAddedSampleTs >= self._maxSamplePeriod) {
                return true;
            }
            if (stats.f !== prevSample.f) {
                return true;
            }
            if (vstatr.dly != null) {
                if (pvstatr.dly == null) {
                    return true;
                }
                if (Math.abs(vstatr.dly - pvstatr.dly) >= 100) {
                    return true;
                }
            }

            if (vstat.rtt != null) {
                if (pvstat.rtt == null) {
                    return true;
                }
                if (Math.abs(vstat.rtt - pvstat.rtt) >= 50) {
                    return true;
                }
            }

            if (astat.rtt != null) {
                if (pastat.rtt == null) {
                    return true;
                }
                if (Math.abs(astat.rtt - pastat.rtt) >= 50) {
                    return true;
                }
            }
            if (astatr.jtr != null) {
                if (pastatr.jtr == null) {
                    return true;
                }
                if (Math.abs(astatr.jtr - pastatr.jtr) >= 40) {
                    return true;
                }
            }
            if (astatr.pl != null) {
                if (pastatr.pl == null) {
                    return true;
                }
                if (astatr.pl - pastatr.pl) {
                    return true;
                }
            }

            if (vstatr.width != null) {
                if (pvstatr.width == null) {
                    return true;
                }
                if (vstatr.width !== pvstatr.width) {
                    return true;
                }
            }

            if (vstats.width != null) {
                if (pvstats.width == null) {
                    return true;
                }
                if (vstats.width !== pvstats.width) {
                    return true;
                }
            }
            return false;
        };
        addSample = shouldAddSample();
    }

    if (addSample) {
        if (!prevSample) {
            self._handler.onStatCommonInfo(self._commonStats);
        }
        stats.lq = self._handler.onStatSample(stats, true);
        astatr.pa = (stats._peerAudioLevel >= 10) ? 1 : 0;
        self.addStat();
    } else {
        self._handler.onStatSample(stats, false);
    }
//  console.log(stats);
  } catch(e) {
      console.error('exception in onStats:', e, e.stack);
  }
}

/* jshint -W004 */
Recorder.prototype.parseChromeStat = function(period, item, prevSample) {
    function stat(name) {
        var val = item.stat(name);
        if (typeof val === 'string') {
            return parseInt(val);
        } else {
            return null;
        }
    }
    var self = this;
    var stats = self._stats;
    var commonStats = self._commonStats;
    var vstat = stats.v;
    var astat = stats.a;
    if (item.type === 'ssrc') {
        var width;
        if ((width = stat('googFrameWidthReceived'))) {
            // Video RX
            var r = vstat.r;
            calcBwAverage(r, period, stat('bytesReceived'), prevSample.v.r);
            r.fps = stat('googFrameRateReceived');
            r.dly = stat('googCurrentDelayMs');
            r.jtr = stat('googJitterBufferMs');
            r.pl = stat('packetsLost');
            // vstat.fpsSent = item.stat('googFrameRateOutput'); -- this should be for screen output
            r.width = width;
            r.height = stat('googFrameHeightReceived');
            r.nacktx = stat('googNacksSent');
            r.plitx = stat('googPlisSent');
            r.firtx = stat('googFirsSent');
        } else if ((width = stat('googFrameWidthSent'))) {
            // Video TX
            var s = vstat.s;
            vstat.rtt = stat('googRtt');
            s.fps = stat('googFrameRateSent');
            s.cfps = stat('googFrameRateInput');
            s.width = width;
            s.height = stat('googFrameHeightSent');
            if (!commonStats.vcodec) {
                commonStats.vcodec = item.stat('googCodecName');
            }
         // s.et = stat('googAvgEncodeMs');
            s.el = stat('googEncodeUsagePercent'); // (s.et*s.fps)/10; // (encTime*fps/1000ms)*100%
            if (self.boolStat(item, 'googCpuLimitedResolution')) {
                stats.f |= STATFLAG_SEND_CPU_LIMITED_RESOLUTION;
            }
            if (self.boolStat(item, 'googBandwidthLimitedResolution')) {
                stats.f |= STATFLAG_SEND_BANDWIDTH_LIMITED_RESOLUTION;
            }
			calcBwAverage(s, period, stat('bytesSent'), prevSample.v.s);
        } else if (item.stat('audioInputLevel')) {
            // Audio TX
            astat.rtt = stat('googRtt');
            var s = astat.s;
            calcBwAverage(s, period, stat('bytesSent'), prevSample.a.s);
            // Firefox doesn't support local audio level, so we can't use it for the audio level API
            // s._ownAudioLevel = parseInt(item.stat('audioInputLevel'));
        } else if (item.stat('audioOutputLevel')) {
            // Audio RX
            var r = astat.r;
            calcBwAverage(r, period, stat('bytesReceived'), prevSample.a.r);
            stats._peerAudioLevel = Math.round(stat('audioOutputLevel') / 327.67);
            r.jtr = stat('googJitterReceived');
            r.pl = stat('packetsLost');
            r.dly = stat('googCurrentDelayMs');
        }
    } else if ((item.type === 'googCandidatePair') && (item.stat('googActiveConnection') === 'true')) {
        if (self._hadConnItem) { //happens if peer is Firefox
            return;
        }

        self._hadConnItem = true;
        if (commonStats.rly == null) {
            if (item.stat('googLocalCandidateType') === 'relay') {
                commonStats.rly = 1;
                commonStats.rlySvr = item.stat('googLocalAddress');
            } else {
                commonStats.rly = 0;
            }
        }
        if (commonStats.rrly == null) {
            if (item.stat('googRemoteCandidateType') == 'relay') {
                commonStats.rrly = 1;
                commonStats.rrlySvr = item.stat('googRemoteAddress');
            } else {
                commonStats.rrly = 0;
            }
        }
        if (!commonStats.proto) {
                commonStats.proto = item.stat('googTransportType');
        }
        /*
        var c = stats.c; // connection
        calcBwAverage(c.r, period, stat('bytesReceived'));
        calcBwAverage(c.s, period, stat('bytesSent'));
        */
    } else if (item.type == 'VideoBwe') {
        vstat.r.bwav = Math.round(stat('googAvailableReceiveBandwidth') / 1024);
        var s = vstat.s;
        s.bwav = Math.round(stat('googAvailableSendBandwidth') / 1024);
        // Chrome returns it in bits/s, should be near our calculated bps
        // s.gbps = Math.round((stat('googTransmitBitrate') / 1024) * 10) / 10;
    }
};
// jshint +W004
function setIfPresent(val, obj, key) {
    if (isNaN(val)) {
        return;
    }
    obj[key] = val;
}

Recorder.prototype.parseFirefoxStat = function(period, allStats, item, prevSample) {
    var self = this;
    var stats = self._stats;
    var commonStats = self._commonStats;
    var type = item.type;
    if (type === 'candidate-pair' && item.selected) {
        /*
        var c = stats.c; // total connection stats
        calcBwAverage(c.r, period, item.bytesReceived);
        calcBwAverage(c.s, period, item.bytesSent);
        */
        if (self._hadConnItem) {
            return;
        }
        self._hadConnItem = true;
        var cand = allStats.get ? allStats.get([item.localCandidateId]) : allStats[item.localCandidateId];
        assert(cand);
        assert(cand.type === 'local-candidate');
        commonStats.rly = (cand.candidateType === 'relay') ? 1 : 0;
        if (commonStats.rly) {
            commonStats.rlySvr = cand.address + ':' + cand.port;
            commonStats.rlyProto = cand.relayProtocol;
        }
        commonStats.proto = cand.protocol;
    } else {
        var isInbound = (type === "inbound-rtp");
        var isOutbound = (type === "outbound-rtp");
        var isRemote = item.isRemote;
        var kind = item.kind;
        var x, prevX, isAudio, isVideo;
        if (kind === "audio") {
            x = stats.a;
            prevX = prevSample.a;
            isAudio = true;
        } else if (kind === "video") {
            x = stats.v;
            prevX = prevSample.v;
            isVideo = true;
        } else {
            return;
        }
        if (isInbound) {
            if (isRemote) {
                var rtt = item.roundTripTime;
                if (isNaN(rtt)) {
                    rtt = -1;
                }
                x.rtt = rtt;
            } else { // local receive
                var xr = x.r;
                var jtr = item.jitter;
                if (!isNaN(jtr)) {
                    xr.jtr = Math.round(jtr * 1000);
                }
                setIfPresent(item.packetsLost, xr, 'pl');
                calcBwAverage(xr, period, item.bytesReceived, prevX.r);

                if (isVideo) { // local video receive
                    var fps = item.framerateMean;
                    if (!isNaN(fps)) {
                        xr.fps = Math.round(fps * 10) / 10;
                    }
                    setIfPresent(item.firCount, xr, 'firtx');
                    setIfPresent(item.nackCount, xr, 'nacktx');
                    setIfPresent(item.pliCount, xr, 'plitx');
                    setIfPresent(item.discardedPackets, xr, 'pd');
                }
            }
        } else if (isOutbound && !isRemote) { // nothing interesting in 'remote outbound' stats
            var xs = x.s;
            calcBwAverage(xs, period, item.bytesSent, prevX.s);
            if (isVideo) {
                setIfPresent(item.droppedFrames, xs, 'fd');
                var fps = item.framerateMean;
                if (!isNaN(fps)) {
                    xs.fps = Math.round(fps * 10) / 10;
                }
            }
        }
    }
};
/* jshint +W004 */

function alignSampleArrays(samples, len) {
    for (var k in samples) {
        var sub = samples[k];
        // sub can also be a number, in case the whole array was filled with the same numeric value
        if (sub instanceof Object) {
            alignSampleArrays(sub, len);
        } else if ((sub instanceof Array) && (sub.length < len)) {
            appendEmptyValuesToArray(sub, len);
        }
    }
}

compressArrayIfSameValue = function(obj, name) {
    var arr = obj[name];
    if (!arr || !(arr instanceof Array)) {
        return;
    }
    var len = arr.length;
    if (len < 2) {
        return;
    }
    var val = arr[0];
    for (var i = 1; i < len; i++) {
        if (arr[i] !== val) {
            return;
        }
    }
    obj[name] = val;
};

Recorder.prototype.stop = function() {
    // make sure all sample arrays have full length
    var samples = this.sampleArrays;
    var len = samples.ts.length;
    if (len) {
        // Compress some arrays that may be filled with only zeroes
        // First, check counters - if their last value is 0, the arrays are also all zeroes
        var vstatr = this._stats.v.r;
        var astatr = this._stats.a.r;
        if (vstatr.nacktx === 0) {
            samples.v.r.nacktx = 0;
        }
        if (vstatr.plitx === 0) {
            samples.v.r.plitx = 0;
        }
        if (vstatr.firtx === 0) {
            samples.v.r.firtx = 0;
        }
        if (astatr.pl === 0) { // packets lost
            samples.a.r.pl = 0;
        }
        if (vstatr.pl === 0) { // packets lost
            samples.v.r.pl = 0;
        }
        compressArrayIfSameValue(samples, "f"); // flags
        compressArrayIfSameValue(samples.a.r, "pa"); // peer audio level
        compressArrayIfSameValue(samples.v.r, "pd"); // packets dropped
        if (RTC.isChrome) {
            compressArrayIfSameValue(samples.v.s, "width");
            compressArrayIfSameValue(samples.v.s, "height");
            compressArrayIfSameValue(samples.v.r, "width");
            compressArrayIfSameValue(samples.v.r, "height");
        }
        alignSampleArrays(samples, len);
    }
};

Recorder.prototype.getStats = function(cid, sid) {
    this.stop();
    var stats = {
        cid: cid,
        sid: sid,
        ts: Math.round(this._tsStart/1000),
        dur: Math.ceil((Date.now()-this._tsStart)/1000),
        samples: this.sampleArrays,
        bws: RTC.getBrowserId()
    }
    var cmn = this._commonStats;
    for (var k in cmn)
        if (stats[k])
            console.error("Common stats property name overlaps with stats property name, not including");
          else
            stats[k] = cmn[k];

    return stats;
};

Recorder.prototype.getStartTime = function() {
    return this._tsStart;
};

Recorder.prototype.isRelay = function() {
    return this._commonStats.rly;
};

RTC.Stats = {
    Recorder: Recorder,
    statItemToString: statItemToString
};
});
