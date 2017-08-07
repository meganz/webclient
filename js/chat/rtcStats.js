mBroadcaster.once('startMega', function() {
if (!window.RTC || !window.RTCPeerConnection || !RTCPeerConnection.prototype.getStats
        || (RTC.browser !== 'chrome' && RTC.browser !== 'opera')) {
    return;
}

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
    // This metod does not do hasOwnProperty() checks, and assumes the objects are simple non-native non-inherited js objects
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
        c: {
            rtt: v(),
            s: {
                abps: v(),
                bt: v(),
                bps: v()
            },
            r: {
                abps: v(),
                bt: v(),
                bps: v()
            }
        },
        v: {
            s: {
                abps: v(),
                gabps: v(),
                bps: v(),
                bt: v(),
                rtt: v(),
                fps: v(),
                cfps: v(),
                cjtr: v(),
                width: v(),
                height: v(),
  //            et: v(),
                el: v(),
                lcpu: v(),
                lbw: v(),
                bwav: v(),
                gbps: v()
            },
            r: {
                abps: v(),
                bps: v(),
                pl: v(),
                bt: v(),
                fps: v(),
                dly: v(),
                jtr: v(),
                width: v(),
                height: v()
            },
        },
        a: {
            rtt: v(),
            pl: v(),
            jtr: v()
        }
    }
}

function calcBwAverage(s, period, totBytes, totName, bpsName, avgBpsName) {
	var perBytes = totBytes - s[totName];
    s[totName] = totBytes;
    var bps = s[bpsName] = (perBytes/128) / period; //from bytes/s to kbits/s
    s[avgBpsName] = (s[avgBpsName]*4+bps)/5;
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

function Recorder(rtcConn, scanPeriod, maxSamplePeriod, handler) {
    this._rtcConn = rtcConn;
    this.samples = createStatItem(function() {return []});
    this.lastSampleIdx = -1;
    this._stats = createStatItem(function() {return 0;});
    this._commonStats = {};
    this._maxSamplePeriod = maxSamplePeriod*1000;
    this._scanPeriod = scanPeriod*1000;
    this._handler = handler;
}

Recorder.prototype.start = function() {
    var self = this;
    self._timer = setInterval(function() {
        var pc = self._rtcConn;
        if (!pc || (pc.state === 'ended'))
            return;
    	pc.getStats(
          self.onStats.bind(self),
          pc.getRemoteStreams()
        );
     }, self._scanPeriod);
    //we artificially create the first sample with zero values, and assume its
    //time is right now. The first real sample will be taken after one timer
    //interval, so the period for the first real sample will be one scanPeriod
    self._lastSampleTs = Date.now();
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
}

Recorder.prototype.onStats = function(rtcStats) {
  try {
    var self = this;
	var results = rtcStats.result();
    var now = Date.now();
    var stats = self._stats;
    stats._hadConnItem = false;
    var samples = self.samples;
    var period = (now - self._lastSampleTs) / 1000;
    self._lastSampleTs = now;

    results.forEach(self.parseStat.bind(self, period));
    if (!self._tsStart) { //not started recording yet - there was no activity
        if (stats.c.r || stats.c.s) {
            self._tsStart = now;
        } else {
            return; //no stream yet
        }
    }
    stats.ts = now - self._tsStart;
    var lastSampleIdx = self.lastSampleIdx;
    var isFirstSample = lastSampleIdx < 0;
    stats.per = period;

    var vs = samples.v;
    var as = samples.a;
    var astat = stats.a;
    var vstat = stats.v;
    var addSample = false;

    if (isFirstSample) {
        addSample = true;
    } else {
        var d = {};
        d.dly = (vs.r.dly[lastSampleIdx] - vstat.r.dly);
        if (d.dly < 0)
            d.dly = -d.dly;
        d.vrtt = (vs.s.rtt[lastSampleIdx] - vstat.s.rtt);
        if (d.vrtt < 0)
            d.vrtt = -d.vrtt;
        d.auRtt = as.rtt[lastSampleIdx] - astat.rtt;
        if (d.auRtt < 0)
            d.auRtt = -d.auRtt;
        d.auJtr = as.jtr[lastSampleIdx] - astat.jtr;
        if (d.auJtr < 0)
            d.auJtr = -d.auJtr;
        d.ts = stats.ts-samples.ts[lastSampleIdx];
        d.apl = as.pl[lastSampleIdx] - astat.pl;

        addSample = ((d.ts >= self._maxSamplePeriod)
          || (vstat.r.width !== vs.r.width[lastSampleIdx]) || (vstat.s.width !== vs.s.width[lastSampleIdx])
          || (d.dly > 100) || (d.auRtt > 100) || (d.apl > 0) || (d.vrtt > 150) || (d.auJtr > 40));
    }
    if (addSample) {
        self.addStat();
        if (self._handler) {
            if (isFirstSample)
                self._handler.onCommonInfo(self._commonStats);
            self._handler.onSample(stats);
        }
    }
  } catch(e) {
      console.error('exception in onStats:', e, e.stack);
  }
}

Recorder.prototype.parseStat = function(period, res) {
    function stat(name, avg) {
        var val = res.stat(name);
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
    if (res.type === 'ssrc') {
        var width;
        if ((width = stat('googFrameWidthReceived'))) {
            var r = vstat.r;
            calcBwAverage(r, period, stat('bytesReceived'), 'bt', 'bps', 'abps');
            r.fps = stat('googFrameRateReceived', r.fps);
            r.dly = stat('googCurrentDelayMs', r.dly);
            r.jtr = stat('googJitterBufferMs', r.jtr);
//          s['delay+rtt'] = s.dly+stats.c.rtt;
            r.pl = stat('packetsLost');
//			vstat.fpsSent = res.stat('googFrameRateOutput'); -- this should be for screen output
            r.width = width;
            r.height = stat('googFrameHeightReceived');

//			res.names().forEach(function(name)
//			{ console.log('name=', name, 'value=', res.stat(name)); });
        } else if ((width = stat('googFrameWidthSent'))) {
            var s = vstat.s;
            s.rtt = stat('googRtt', s.rtt);
            s.fps = stat('googFrameRateSent', s.fps);
            s.cfps = stat('googFrameRateInput', s.cfps);
            s.cjtr = stat('googCaptureJitterMs', s.cjtr);
            s.width = width;
            s.height = stat('googFrameHeightSent');
            if (!commonStats.vcodec) {
                commonStats.vcodec = res.stat('googCodecName');
            }
//            s.et = stat('googAvgEncodeMs');
            s.el = stat('googEncodeUsagePercent', s.el); //(s.et*s.fps)/10; // (encTime*fps/1000ms)*100%
            s.lcpu = self.boolStat(res, 'googCpuLimitedResolution');
            s.lbw = self.boolStat(res, 'googBandwidthLimitedResolution');
			calcBwAverage(s, period, stat('bytesSent'), 'bt', 'bps', 'abps');
//			res.names().forEach(function(name)
//			{ console.log('name=', name, 'value=', res.stat(name)); });
        } else if (res.stat('audioInputLevel')) {
            var a = stats.a;
            a.rtt = stat('googRtt', a.rtt);
        } else if (res.stat('audioOutputLevel')) {
            var a = stats.a;
            a.jtr = stat('googJitterReceived', a.jtr);
            a.pl = stat('packetsLost');
        }
    } else if ((res.type === 'googCandidatePair') && (res.stat('googActiveConnection') === 'true')) {
        if (stats._hadConnItem) { //happens if peer is Firefox
                return;
        }

        stats._hadConnItem = true;
        if (commonStats.rly === undefined) {
            commonStats.rly = (res.stat('googLocalCandidateType') === 'relay')?1:0;
            if (commonStats.rly) {
                commonStats.rlySvr = res.stat('googLocalAddress');
            }
        }
//      if (!commonStats.remoteConn)
//          commonStats.remoteConn = res.stat('googRemoteCandidateType');
        var c = stats.c;
        c.rtt = stat('googRtt', c.rtt);
        if (!commonStats.proto) {
                commonStats.proto = res.stat('googTransportType');
        }
        calcBwAverage(c.r, period, stat('bytesReceived'), 'bt', 'bps', 'abps');
        calcBwAverage(c.s, period, stat('bytesSent'), 'bt', 'bps', 'abps');
    } else if (res.type == 'VideoBwe') {
        vstat.r.bwav = Math.round(stat('googAvailableReceiveBandwidth')/1024);
        var s = vstat.s;
        s.bwav = Math.round(stat('googAvailableSendBandwidth')/1024);
        s.gbps = stat('googTransmitBitrate')/1024; //chrome returns it in bits/s, should be near our calculated bps
        s.gabps = (s.gabps*4+s.gbps)/5;
    }
};

Recorder.prototype.stop = function() {
    if (!this._timer) {
        return;
    }
    clearInterval(this._timer);
    delete this._timer;
}

Recorder.prototype.getStats = function(cid) {
    this.stop();
    var stats = {
        cid: cid,
        ts: Math.round(this._tsStart/1000),
        dur: Math.ceil((Date.now()-this._tsStart)/1000),
        sper: this._scanPeriod,
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
}

Recorder.prototype.isRelay = function() {
    return this._commonStats.rly;
};

RTC.Stats = {
    Recorder: Recorder,
    statItemToString: statItemToString
};
});
