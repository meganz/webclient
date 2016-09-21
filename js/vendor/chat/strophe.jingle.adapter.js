// mozilla chrome compat layer -- very similar to adapter.js
//Based on code from ESTOS

function WebrtcApi() {
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        if (!MediaStream.prototype.getVideoTracks || !MediaStream.prototype.getAudioTracks)
            throw new Error('webRTC API missing MediaStream.getXXXTracks');
        if (!mozRTCPeerConnection)
            throw new Error('Your version of Firefox is too old, at lest version 22 for Desktop and version 24 for Andorid is required');
        
        this.peerconnection = mozRTCPeerConnection;
        this.browser = 'firefox';
        this.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
        this.attachMediaStream = function (element, stream) {
            var elem = element[0];
            if (elem.mozSrcObject) {
                elem.mozSrcObject = stream;
            } else {
                elem.srcObject = stream;
            }
            elem.play();
        };
        this.pc_constraints = {};
		if (MediaStream.prototype.clone)
            this.cloneMediaStream = function(src, what) {return src.clone(); }
          else
            this.cloneMediaStream = function(src, what) {return src; } //no cloning, just returns original stream
        
        this.RTCSessionDescription = mozRTCSessionDescription;
        this.RTCIceCandidate = mozRTCIceCandidate;
        this.MediaStreamTrack = MediaStreamTrack;
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        this.peerconnection =  webkitRTCPeerConnection;
        this.browser =  window.opr?'opera':'chrome';
        this.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
        this.attachMediaStream = function (element, stream) {
            if (!stream) {
                element.removeAttr('src');
            } else {
                element.attr('src', URL.createObjectURL(stream));
            }
        };
        this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]}; // enable dtls support for compat with Firefox            
		this.cloneMediaStream = function(src, what) {
            var stream = new webkitMediaStream;
            var ats = src.getAudioTracks();
            if (what.audio && (ats.length > 0)) {
                stream.addTrack(ats[0]);
            }
            var vts = src.getVideoTracks();
            if (what.video && (vts.length > 0)) {
                stream.addTrack(vts[0]);
            }
			return stream;
		}
        this.RTCSessionDescription = RTCSessionDescription;
        this.RTCIceCandidate = RTCIceCandidate;
        this.MediaStreamTrack = MediaStreamTrack;
        if (!webkitMediaStream.prototype.getVideoTracks) {
            webkitMediaStream.prototype.getVideoTracks = function () {
                return this.videoTracks;
            };
        }
        if (!webkitMediaStream.prototype.getAudioTracks) {
            webkitMediaStream.prototype.getAudioTracks = function () {
                return this.audioTracks;
            };
        }
    } else {
        throw new Error('Browser does not appear to be WebRTC-capable');
    }
    var mst = this.MediaStreamTrack;
    if (mst && mst.getSources) {
        this.getMediaInputTypesFromScan = function(cb) {
            mst.getSources(function(sources) {
                var hasAudio = false;
                var hasVideo = false;
                for (var i=0; i<sources.length; i++) {
                    var s = sources[i];
                    if (s.kind === 'audio')
                        hasAudio = true;
                    else if (s.kind === 'video')
                        hasVideo = true;
                }
                cb({audio:hasAudio, video:hasVideo});
            });
        }
        this.getMediaInputTypes = this.getMediaInputTypesFromScan;
    } else {
        this.getMediaInputTypesFromStream = function(cb) {
            this.getUserMedia({audio:true, video:true},
                function(stream) {
                    var result = {audio: (stream.getAudioTracks().length > 0), video: (stream.getVideoTracks().length > 0)};
                    stream = null;
                    cb(result);
                },
                function() {
                    cb({error: true})
                }
            );
        }
        this.getMediaInputTypes = this.getMediaInputTypesFromStream;
    }
}

WebrtcApi.prototype.createUserMediaConstraints = function(um)
{
    var constraints = {audio: false, video: false};

    if (um.video)
        constraints.video = {mandatory: {}};// same behaviour as true
    
    if (um.audio)
        constraints.audio = {};// same behaviour as true
   
    if (um.screen)
        constraints.video = {
            "mandatory": {
                "chromeMediaSource": "screen"
            }
        };

    if (um.resolution && !constraints.video) 
        constraints.video = {mandatory: {}};// same behaviour as true
    
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (um.resolution) 
	{
    // 16:9 first
    case '1080':
    case 'fullhd':
        constraints.video.mandatory.minWidth = 1920;
        constraints.video.mandatory.minHeight = 1080;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '720':
    case 'hd':
        constraints.video.mandatory.minWidth = 1280;
        constraints.video.mandatory.minHeight = 720;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '360':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 360;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '180':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 180;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
        // 4:3
    case '960':
        constraints.video.mandatory.minWidth = 960;
        constraints.video.mandatory.minHeight = 720;
        break;
    case '640':
    case 'vga':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 480;
        break;
    case '320':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 240;
        break;
    default:
        if (navigator.userAgent.indexOf('Android') != -1) 
		{
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 240;
            constraints.video.mandatory.maxFrameRate = 15;
        }
        break;
    }

    if (um.bandwidth)
	{ // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}};//same behaviour as true
        constraints.video.optional = [{bandwidth: um.bandwidth}];
    }
    if (um.fps)
	{ // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}};// same behaviour as tru;
        constraints.video.mandatory.minFrameRate = fps;
    }
    if (localStorage.fakeVideoDevice === '1') {
        constraints.fake = true;
    }
	return constraints;
}

WebrtcApi.prototype.getUserMediaWithConstraintsAndCallback = function(um, self, okCallback, errCallback)
{
	try 
	{
		this.getUserMedia(this.createUserMediaConstraints(um),
			okCallback.bind(self), errCallback.bind(self));
	} catch(e) {
		errCallback.call(self, null, e);
    }
}		

WebrtcApi.prototype.stopMediaStream = function(stream) {
    if (!stream.stop) {
        var tracks = stream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].stop();
        }
    } else {
        stream.stop();
    }
}

WebrtcApi.prototype._getBrowserVersion = function() {
    var ua = navigator.userAgent;
    if ((this.browser === 'chrome') || (this.browser === 'opera')) {
        var m = ua.match(/Chrome\/(\d+)\./);
        if(m && (m.length >= 2))
            return m[1];
    } else if (b === "firefox") {
        var m = ua.match(/Firefox\/(\d+)\./);
        if (m && (m.length >= 2))
            return m[1];
    } else {
        return null;
    }
}

var RTC = null;

try {
    RTC = new WebrtcApi;
}
catch(e)
{
    RTC = null;
    console.warn("Error enabling webrtc support: "+e);
}
