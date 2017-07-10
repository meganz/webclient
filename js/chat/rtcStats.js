function statsGlobalInit(peerconn) {
//Firefox already has getStats() but is not compatible with our current code
if (!peerconn.getStats || ((RTC.browser !== 'chrome') && (RTC.browser !== 'opera'))) {
    RTC.Stats = false;
    return;
}
var Stats = RTC.Stats = {};

Stats.setVideoQuality = function(desc, params)
{
	var sdp = desc.sdp;
	var m = sdp.match(/a=rtpmap:(\d+)\sVP8\/*/im);
	if (!m || (m.length < 2))
	{
		console.warn("setVideoQuality: VP8 codec not found in local SDP");
		return false;
	}
	var vp8id = parseInt(m[1]);
	var line = '';
	var lastch = sdp[sdp.length-1];
    if ((lastch != '\n') && (lastch != '\r'))
		line+= '\r\n';
	line+= ('a=fmtp:'+m[1]);
	if (params.vidbr)
	{
		parseInt(params.vidbr);
		line+=' x-google-max-bitrate='+params.vidbr*1000+';';
	}
	if (params.vidqnt)
	{
		parseInt(params.vidqnt);
		line+=' x-google-max-quantization='+params.vidqnt+';';
	}
	if (params.vidlag) //this one shuld be last as it adds a new line
	{
		parseInt(params.vidlag);
		line+='\r\na=x-google-buffer-latency:'+params.vidlag;
	}
	line+='\r\n';
	sdp.sdp+=line;
    return true;
}

function prettyNum(v)
{
	if (v > 1048576)
		return (v/1048576).toFixed(1)+'M';
	else if (v > 1024)
		return (v/1024).toFixed(1)+'K';
	else
		return (v|0);
}

function mergeObjects(dest, src)
{
  for(var k in src)
	dest[k] = src[k];
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

function calcBwAverage(s, period, totBytes, totName, bpsName, avgBpsName)
{
	var perBytes = totBytes - s[totName];
    s[totName] = totBytes;
    var bps = s[bpsName] = (perBytes/128) / period; //from bytes/s to kbits/s
    s[avgBpsName] = (s[avgBpsName]*4+bps)/5;
}

function statItemToString(s, name, nest)
{
    if (nest === undefined)
        nest = 0;
        
    var pad = nest?Array(nest+1).join(' '):'';
	var ret = name?(pad+'=== '+name+' ===\n'):'';
    var objs = [];
    var hadValue = false;
	for (var k in s)
	{
        if (k[0] === '_')
            continue;
            
		var v = s[k];
		if (((typeof v) != 'object'))
		{
            hadValue = true;
			ret+=pad;
            ret+=k;
			ret+=': ';
            if (typeof v === 'number')
                ret+=prettyNum(v);
              else
                ret+=v;
			ret+='\n';
		}
		else
            objs.push({k:k, v:v});
	}
    if (hadValue)
        ret+='\n';
    for (var i=0; i<objs.length; i++)
    {
        var obj = objs[i];
        ret+=statItemToString(obj.v, obj.k, nest+1);
    }
	return ret;
}

Stats.statItemToString = statItemToString;

Stats.Recorder = function(sess, scanPeriod, maxSamplePeriod, onSample)
{
    this.samples = createStatItem(function() {return []});
    this.lastSampleIdx = -1;
    this._sess = sess;
    this._stats = createStatItem(function() {return 0;});
    this._commonStats = {};
    this._maxSamplePeriod = maxSamplePeriod*1000;
    this._scanPeriod = scanPeriod*1000;
    this._onSample = onSample;
}

var statRecProto = Stats.Recorder.prototype;

statRecProto.start = function() {
    var self = this;
    var sess = this._sess;
    this._startTs = Date.now();
    this._timer = setInterval(function() {
        var pc = sess.peerconnection;
        if (!pc || (pc.state === 'ended'))
            return;
    	pc.getStats(
          self.onStats.bind(self),
          pc.getRemoteStreams()
        );
     }, this._scanPeriod);
}

function cloneObject(obj) {
// This metod does not do hasOwnProperty() checks, and assumes the objects are simple non-native non-inherited js objects
    var ret = {};
    for (var k in obj) {
        var p = obj[k];
        if (typeof p === 'object')
            ret[k] = cloneObject(p); //this points to the object owning the cloneObject() method
          else
            ret[k] = p;
    }
    return ret;
}

/** Adds the current statistics to the sample array */
statRecProto.addStat = function() {
    addStatToArrays(this.samples, this._stats);
    this.lastSampleIdx++;
}

statRecProto.boolStat = function(stat, name) {
    var val = stat.stat(name);
    if (typeof val === 'string')
        return (val === 'true')?1:0;
      else
        return val?1:0;
}

statRecProto.onStats = function(rtcStats) {
	var results = rtcStats.result();
    var stats = this._stats;
    var commonStats = this._commonStats;
    var lastSampleIdx = this.lastSampleIdx;
    var samples = this.samples;
    
	var ts = Date.now() - this._startTs;
    var isFirstSample = lastSampleIdx < 0;
	var period = (ts-stats.ts)/1000;
    stats.per = (lastSampleIdx>=0)?(ts-samples.ts[lastSampleIdx])/1000:-1;//this is not appended to the arrays
	stats.ts = ts;
	var vstat = stats.v;
    var hadConnItem = false;
    var width = undefined;
    var self = this;
	results.forEach(function(res) {
        function stat(name, avg) {
            var val = res.stat(name);
            if (typeof val === 'string')
                val = parseInt(val);
            if (avg === undefined)
                return val;
             else
                return (avg+val)/2;
        }
		if (res.type === 'ssrc') {
          if (width = stat('googFrameWidthReceived')) {
            var s = vstat.r;
			calcBwAverage(s, period, stat('bytesReceived'), 'bt', 'bps', 'abps');
			s.fps = stat('googFrameRateReceived', s.fps);
            s.dly = stat('googCurrentDelayMs', s.dly);
            s.jtr = stat('googJitterBufferMs', s.jtr);
//          s['delay+rtt'] = s.dly+stats.c.rtt;
			s.pl = stat('packetsLost');
//			vstat.fpsSent = res.stat('googFrameRateOutput'); -- this should be for screen output
            s.width = width;
            s.height = stat('googFrameHeightReceived');
          
//			res.names().forEach(function(name)
//			{ console.log('name=', name, 'value=', res.stat(name)); });
		  }
          else if (width = stat('googFrameWidthSent'))
          {
            var s = vstat.s;
            s.rtt = stat('googRtt', s.rtt);
            s.fps = stat('googFrameRateSent', s.fps);
            s.cfps = stat('googFrameRateInput', s.cfps);
            s.cjtr = stat('googCaptureJitterMs', s.cjtr);
            s.width = width;
            s.height = stat('googFrameHeightSent');
            if (!commonStats.vcodec)
                commonStats.vcodec = res.stat('googCodecName');
//            s.et = stat('googAvgEncodeMs');
            s.el = stat('googEncodeUsagePercent', s.el); //(s.et*s.fps)/10; // (encTime*fps/1000ms)*100%
            s.lcpu = self.boolStat(res, 'googCpuLimitedResolution');
            s.lbw = self.boolStat(res, 'googBandwidthLimitedResolution');
			calcBwAverage(s, period, stat('bytesSent'), 'bt', 'bps', 'abps');
//			res.names().forEach(function(name)
//			{ console.log('name=', name, 'value=', res.stat(name)); });
          }
          else if (res.stat('audioInputLevel'))
          {
            var a = stats.a;
            a.rtt = stat('googRtt', a.rtt);
          }
          else if (res.stat('audioOutputLevel'))
          {
            var a = stats.a;
            a.jtr = stat('googJitterReceived', a.jtr);
            a.pl = stat('packetsLost');
          }
        }
        else if ((res.type === 'googCandidatePair') && (res.stat('googActiveConnection') === 'true'))
        {
            if (hadConnItem) //happens if peer is Firefox
                return;
            
            hadConnItem = true;
            var c = stats.c;
            if (commonStats.rly === undefined) {
                commonStats.rly = (res.stat('googLocalCandidateType') === 'relay')?1:0;
                if (commonStats.rly)
                    commonStats.rlySvr = res.stat('googLocalAddress');
            }
//            if (!commonStats.remoteConn)
//                commonStats.remoteConn = res.stat('googRemoteCandidateType');

            c.rtt = stat('googRtt', c.rtt);
            if (!commonStats.proto)
                commonStats.proto = res.stat('googTransportType');
			calcBwAverage(c.r, period, stat('bytesReceived'), 'bt', 'bps', 'abps');
			calcBwAverage(c.s, period, stat('bytesSent'), 'bt', 'bps', 'abps');
        }
		else if (res.type == 'VideoBwe')
        {
			vstat.r.bwav = Math.round(stat('googAvailableReceiveBandwidth')/1024);
            var s = vstat.s;
			s.bwav = Math.round(stat('googAvailableSendBandwidth')/1024);
            s.gbps = stat('googTransmitBitrate')/1024; //chrome returns it in bits/s, should be near our calculated bps
            s.gabps = (s.gabps*4+s.gbps)/5;
        }
	});
    var vs = samples.v;
    var as = samples.a;
    var audio = stats.a;
    var addSample = false;

    if (isFirstSample) {
        addSample = true;
    } else {
        var d = {};
        d.dly = (vs.r.dly[lastSampleIdx] - stats.v.r.dly);
        if (d.dly < 0)
            d.dly = -d.dly;
        d.vrtt = (vs.s.rtt[lastSampleIdx] - stats.v.s.rtt);
        if (d.vrtt < 0)
            d.vrtt = -d.vrtt;
        d.auRtt = as.rtt[lastSampleIdx] - audio.rtt;
        if (d.auRtt < 0)
            d.auRtt = -d.auRtt;
        d.auJtr = as.jtr[lastSampleIdx] - audio.jtr;
        if (d.auJtr < 0)
            d.auJtr = -d.auJtr;
        d.ts = ts-samples.ts[lastSampleIdx];
        d.apl = as.pl[lastSampleIdx] - audio.pl;

        addSample = ((d.ts >= this._maxSamplePeriod)
          || (vstat.r.width !== vs.r.width[lastSampleIdx]) || (vstat.s.width !== vs.s.width[lastSampleIdx])
          || (d.dly > 100) || (d.auRtt > 100) || (d.apl > 0) || (d.vrtt > 150) || (d.auJtr > 40));
    }
    if (addSample) {
        this.addStat();
        if (this._onSample) {
            if (isFirstSample)
                this._onSample(this._commonStats, 0);
            this._onSample(stats, 1);
        }
    }
}

statRecProto.terminate = function(cid) {
    if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
    }

    var stats = {
        cid: cid,
        ts: Math.round(this._startTs/1000),
        dur: Math.ceil((Date.now()-this._startTs)/1000),
        sper: this._scanPeriod,
        samples: this.samples,
        bws: stats_getBrowserVersion()
    }
    var cmn = this._commonStats;
    for (var k in cmn)
        if (stats[k])
            console.error("Common stats property name overlaps with stats property name, not including");
          else
            stats[k] = cmn[k];
   
    return stats;
}

statRecProto.isRelay = function() {
    return this._commonStats.rly;
}
};

function stats_getBrowserVersion() {
    var browser = RTC.browser.charAt(0)+(navigator.userAgent.match(/(Android|iPhone)/i)?'m':'');
    var b = RTC.browser;
    var ua = navigator.userAgent;
    var ver;
    var m;
    if ((b === 'chrome') || (b === 'opera')) {
        m = ua.match(/Chrome\/(\d+)\./);
        if (m && (m.length >= 2)) {
            ver = m[1];
        }
    } else if (b === "firefox") {
        m = ua.match(/Firefox\/(\d+)\./);
        if (m && (m.length >= 2)) {
            ver = m[1];
        }
    } else {
        ver = null;
    }
    if (ver) {
        browser += (':' + ver);
    }
    return browser;
}
