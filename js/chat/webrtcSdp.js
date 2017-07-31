(function() {
if (!RTC) {
    return;
}
RTC.sdpSetVideoQuality_chrome = function(desc, params) {
    var sdp = desc.sdp;
    var m = sdp.match(/a=rtpmap:(\d+)\sVP8\/.*/im);
    if (!m || (m.length < 2)) {
        console.warn("setVideoQuality: VP8 codec not found in local SDP");
        return false;
    }
    var vp8id = parseInt(m[1]);
    var line = '\r\na=fmtp:'+m[1];
    if (params.vidMaxBr) {
        assert(!isNaN(params.vidMaxBr));
        line+=' x-google-max-bitrate='+params.vidMaxBr+';';
    }
    if (params.vidQnt) {
        assert(!isNaN(params.vidQnt));
        line+=' x-google-max-quantization='+params.vidQnt+';';
    }
    if (params.vidLag) { //this one shuld be last as it adds a new line
        assert(!isNaN(params.vidLag));
        line+='\r\na=x-google-buffer-latency:'+params.vidLag;
    }
    if (line.length > 10) {
        line = line.substring(0, line.length-1); //remove last ';'
    }

    var idx = m.index+m[0].length;
    sdp = sdp.substr(0, idx) + line + sdp.substr(idx);
    desc.sdp = sdp;
    return true;
}
RTC.sdpSetVideoBw = function(desc, bw) {
    assert(!isNaN(bw) && bw > 0);
    var sdp = desc.sdp;
    var m = sdp.match(/m=video.*/im);
    if (!m || (m.length < 1)) {
        console.warn("setVideoQuality: m=video line not found in local SDP");
        return false;
    }
    assert(m.index);
    var line;
    if (RTC.browser === "firefox") {
        line = '\r\nb=TIAS:'+bw*1000;
    } else {
        line = '\r\nb=AS:'+bw;
    }

    var idx = m.index+m[0].length;
    sdp = sdp.substr(0, idx) + line + sdp.substr(idx);
    desc.sdp = sdp;
    return true;
}
}());
