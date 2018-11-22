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

function addStatToArrays(arrs, s) {
    // This method does not do hasOwnProperty() checks, and assumes the objects are simple
    // non-native non-inherited js objects
    for (var k in arrs) {
        var p = arrs[k];
        var v = s[k];
        if (v === undefined) //sample doesnt have a propery that is in the structure
            throw new Error("Sample is missing property '"+k+"'");
        if (p instanceof Array)
            p.push(Math.round(v*10)/10);
        else if (typeof p ==='object')
            addStatToArrays(arrs[k], s[k]); //this points to the object owning the cloneObject() method
        else
            throw new Error("Sample pool has an unexpected type of property '"+k+"'");
    }
}

function createStatItem(v) {
    return {
        ts: v(),
        lq: v(),
        f: v(),
        v: {
            rtt: v(),
            s: {
                abps: v(),
                bps: v(),
                bt: v(),
                fps: v(),
                cfps: v(),
                width: v(),
                height: v(),
  //            et: v(),
                el: v(),
                bwav: v(),
                gbps: v()
            },
            r: {
                abps: v(),
                bps: v(),
                bt: v(),
                pl: v(),
                jtr: v(),
                fps: v(),
                dly: v(),
                width: v(),
                height: v(),
                firtx: v(),
                plitx: v(),
                nacktx: v()
            },
        },
        a: {
            rtt: v(),
            s: {
                abps: v(),
                bt: v(),
                bps: v()
            },
            r: {
                abps: v(),
                bt: v(),
                bps: v(),
                pl: v(),
                jtr: v(),
                dly: v(),
                al: v()
            }
        }
    }
}

function calcBwAverage(s, period, totBytes) {
	var perBytes = totBytes - s.bt;
    s.bt = totBytes;
    var kbps = (perBytes / 128) / period; // from bytes/s to kbits/s
    if (isNaN(kbps)) {
        kbps = 0;
    }
    s.bps = Math.round(kbps * 10) / 10;
    var akbps = s.abps;
    if (isNaN(akbps)) {
        akbps = 0;
    }
    s.abps = Math.round(((akbps * 4 + kbps) / 5) * 10) / 10;
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

function Recorder(rtcConn, maxSamplePeriod, handler) {
    var self = this;
    self._rtcConn = rtcConn;
    self._localStream = rtcConn.getLocalStreams()[0]; // need it to determine what we send - audio and/or video
    //  Note that we may not have a local stream if usermedia access was denied
    //  or there is no cam and mic
    self.samples = createStatItem(function() { return []; });
    self.lastSampleIdx = -1;
    self._lastSampleTs = Date.now();
    self._stats = createStatItem(function() {return 0;});
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
        pc.getStats(null, self.onStats.bind(self));
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
    addStatToArrays(this.samples, this._stats);
    this.lastSampleIdx++;
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
    var stats = self._stats;
    stats._hadConnItem = false;
    var samples = self.samples;
    var period = (now - self._lastSampleTs) / 1000;
    self._lastSampleTs = now;
    var astat = stats.a;
    var astatr = astat.r;
    var vstat = stats.v;
    var vstatr = vstat.r;
    stats.f = Av.fromStream(self._localStream);

    if (RTC.isChrome) {
        rtcStats.result().forEach(self.parseChromeStat.bind(self, period));
    } else if (RTC.isFirefox) {
        var asrc = self._audioRtpContribSrc;
        if (asrc) {
            var level = asrc.audioLevel;
            if (level != null) {
                stats.peerAudioLevel = Math.round(level * 100);
            }
        }
        for (var k in rtcStats) {
            var s = rtcStats[k];
            self.parseFirefoxStat(period, rtcStats, s);
        }
    }
    stats.ts = now - self._tsStart;
    var lastSampleIdx = self.lastSampleIdx;
    var isFirstSample = lastSampleIdx < 0;
    stats.per = period;

    var vs = samples.v;
    var as = samples.a;
    var addSample = false;

    if (isFirstSample) {
        addSample = true;
    } else {
        var shouldAddSample = function() {
            if (stats.ts - samples.ts[lastSampleIdx] >= self._maxSamplePeriod) {
                return true;
            }
            var mask = Av.Mask;
            if ((stats.f & mask) !== (samples.f[lastSampleIdx] & mask)) {
                return true;
            }
            if (vstatr.dly != null) {
                var ddly = Math.abs(vstatr.dly - vs.r.dly[lastSampleIdx]);
                if (ddly >= 100) {
                    return true;
                }
            }

            if (vstat.rtt != null) {
                var dvrtt = Math.abs(vstat.rtt - vs.rtt[lastSampleIdx]);
                if (dvrtt >= 50) {
                    return true;
                }
            }

            if (astat.rtt != null) {
                var dartt = Math.abs(astat.rtt - as.rtt[lastSampleIdx]);
                if (dartt >= 50) {
                    return true;
                }
            }
            if (astatr.jtr != null) {
                var dajtr = Math.abs(astatr.jtr - as.r.jtr[lastSampleIdx]);
                if (dajtr >= 40) {
                    return true;
                }
            }
            if (astatr.pl != null) {
                var pl = stats.d_apl = astatr.pl - as.r.pl[lastSampleIdx];
                if (pl) {
                    return true;
                }
            }

            if ((vstatr.width != null) && (vstatr.width !== vs.r.width[lastSampleIdx])) {
                return true;
            }

            if ((vstat.s.width != null) && (vstat.s.width !== vs.s.width[lastSampleIdx])) {
                return true;
            }
            return false;
        };
        addSample = shouldAddSample();
    }

    if (addSample) {
        if (isFirstSample) {
            self._handler.onStatCommonInfo(self._commonStats);
        }
        stats.lq = self._handler.onStatSample(stats, true);
        astatr.al = (stats.peerAudioLevel >= 10) ? 1 : 0;
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
Recorder.prototype.parseChromeStat = function(period, item) {
    function stat(name, avg) {
        var val = item.stat(name);
        if (typeof val === 'string')
            val = parseInt(val);
        if (avg === undefined)
            return val;
        else
            return (avg+val)/2;
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
            calcBwAverage(r, period, stat('bytesReceived'));
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
			calcBwAverage(s, period, stat('bytesSent'));
        } else if (item.stat('audioInputLevel')) {
            // Audio TX
            var s = astat.s;
            astat.rtt = stat('googRtt');
            calcBwAverage(s, period, stat('bytesSent'));
            // Firefox doesn't support local audio level, so we can't use it for the audio level API
            s.al = parseInt(item.stat('audioInputLevel'));
        } else if (item.stat('audioOutputLevel')) {
            // Audio RX
            var r = astat.r;
            calcBwAverage(r, period, stat('bytesReceived'));
            stats.peerAudioLevel = Math.round(stat('audioOutputLevel') / 327.67);
            r.jtr = stat('googJitterReceived');
            r.pl = stat('packetsLost');
            r.dly = stat('googCurrentDelayMs');
        }
    } else if ((item.type === 'googCandidatePair') && (item.stat('googActiveConnection') === 'true')) {
        if (stats._hadConnItem) { //happens if peer is Firefox
            return;
        }

        stats._hadConnItem = true;
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
        var c = stats.c;
        calcBwAverage(c.r, period, stat('bytesReceived'));
        calcBwAverage(c.s, period, stat('bytesSent'));
        */
    } else if (item.type == 'VideoBwe') {
        vstat.r.bwav = Math.round(stat('googAvailableReceiveBandwidth') / 1024);
        var s = vstat.s;
        s.bwav = Math.round(stat('googAvailableSendBandwidth') / 1024);
        // Chrome returns it in bits/s, should be near our calculated bps
        s.gbps = Math.round((stat('googTransmitBitrate') / 1024) * 10) / 10;
    }
};
// jshint +W004

Recorder.prototype.parseFirefoxStat = function(period, allStats, item) {
    var self = this;
    var stats = self._stats;
    var commonStats = self._commonStats;
    if (item.type === 'candidatepair' && item.selected) {
        /*
        var c = stats.c;
        calcBwAverage(c.r, period, item.bytesReceived);
        calcBwAverage(c.s, period, item.bytesSent);
        */
        if (stats._hadConnItem) {
            return;
        }
        stats._hadConnItem = true;
        var cand = allStats.get([item.localCandidateId]);
        assert(cand);
        commonStats.rly = (cand.candidateType === 'relayed') ? 1 : 0;
        if (commonStats.rly) {
            commonStats.rlySvr = cand.ipAddress + ':' + cand.portNumber;
        }
        commonStats.proto = cand.transport;

    } else if (item.ssrc) {
        if (item.mediaType === 'audio') {
            var a = stats.a;
            if (!item.isRemote) {
                if (item.type === 'outboundrtp') {
                    calcBwAverage(a.s, period, item.bytesSent);
                } else if (item.type === 'inboundrtp') {
                    calcBwAverage(a.r, period, item.bytesReceived);
                    a.r.jtr = Math.round(item.jitter * 1000);
                    a.r.pl = item.packetsLost;
                }
            } else { // remote stat
                if (item.roundTripTime != null) {
                    if (item.type !== 'inboundrtp') {
                        return;
                    }
                    a.rtt = item.roundTripTime;
                }
            }
        } else if (item.mediaType === 'video') {
            var v = stats.v;
            if (!item.isRemote) {
                var x;
                var bt;
                if (item.type === 'outboundrtp') {
                    x = v.s;
                    bt = item.bytesSent;
                } else {
                    if (item.type !== 'inboundrtp') {
                        return;
                    }
                    x = v.r;
                    bt = item.bytesReceived;
                    x.jtr = Math.round(item.jitter * 1000);
                    x.firtx = item.firCount;
                    x.nacktx = item.nackCount;
                    x.plitx = item.pliCount;
                }
                calcBwAverage(x, period, bt);
                x.fps = Math.round(item.framerateMean * 10) / 10;
            } else { // remote stat
                var rtt = item.roundTripTime;
                if (rtt != null) {
                    assert(item.type === 'inboundrtp');
                    v.rtt = rtt;
                }
            }
        } else {
            // console.debug("Unexpected ssrc stat media type" + item.mediaType);
            return;
        }
    }
};
/* jshint +W004 */

Recorder.prototype.stop = function() {
    if (!this._timer) {
        return;
    }
    clearInterval(this._timer);
    delete this._timer;
};

Recorder.prototype.getStats = function(cid, sid) {
    this.stop();
    var stats = {
        cid: cid,
        sid: sid,
        ts: Math.round(this._tsStart/1000),
        dur: Math.ceil((Date.now()-this._tsStart)/1000),
        samples: this.samples,
        bws: RTC.getBrowserVersion()
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
