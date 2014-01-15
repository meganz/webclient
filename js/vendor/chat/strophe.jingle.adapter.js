/* jshint -W117 */
// mozilla chrome compat layer -- very similar to adapter.js
function setupRTC() {
    var RTC = null;
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version >= 22) {
            RTC = {
                peerconnection: mozRTCPeerConnection,
                browser: 'firefox',
                getUserMedia: navigator.mozGetUserMedia.bind(navigator),
                attachMediaStream: function (element, stream) {
                    element[0].mozSrcObject = stream;
                    element[0].play();
                },
                pc_constraints: {},
				cloneMediaStream: function(src, what)
				{
					return src;
				}
            };
            if (!MediaStream.prototype.getVideoTracks)
                MediaStream.prototype.getVideoTracks = function () { return []; };
            if (!MediaStream.prototype.getAudioTracks)
                MediaStream.prototype.getAudioTracks = function () { return []; };
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
        }
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        RTC = {
            peerconnection: webkitRTCPeerConnection,
            browser: 'chrome',
            getUserMedia: navigator.webkitGetUserMedia.bind(navigator),
            attachMediaStream: function (element, stream) {
                element.attr('src', webkitURL.createObjectURL(stream));
            },
//            pc_constraints: {} // FIVE-182
            pc_constraints: {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]}, // enable dtls support in canary
			cloneMediaStream: function(src, what)
			{
				var stream = new webkitMediaStream;
				if (what.audio)
					stream.addTrack(src.getAudioTracks()[0]);
				if (what.video)
					stream.addTrack(src.getVideoTracks()[0]);
				return stream;
			}
		};
        if (navigator.userAgent.indexOf('Android') != -1) {
            RTC.pc_constraints = {}; // disable DTLS on Android
        }
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
    }
    if (RTC === null) {
        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }
    }
    return RTC;
}

function createUserMediaConstraints(um)
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
	return constraints;
}

function getUserMediaWithConstraints(um)
{
    try 
	{
        RTC.getUserMedia(createGetUserMediaConstraints(um),
                function (stream) 
				{
                    console.log('onUserMediaSuccess');
                    $(document).trigger('mediaready.jingle', [stream]);
                },
                function (error) 
				{
                    console.warn('Failed to get access to local media. Error ', error);
                    $(document).trigger('mediafailure.jingle');
                });
    }
	catch (e) 
	{
        console.error('GUM failed: ', e);
        $(document).trigger('mediafailure.jingle');
    }
}

function getUserMediaWithConstraintsAndCallback(um, self, okCallback, errCallback)
{
	try 
	{
		RTC.getUserMedia(createUserMediaConstraints(um),
			okCallback.bind(self), errCallback.bind(self));
	} catch(e) 
	{
		errCallback.call(self, null, e);
    }
}		

