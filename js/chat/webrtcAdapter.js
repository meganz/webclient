// mozilla chrome compat layer -- very similar to adapter.js
// Based on code from ESTOS

(function(scope) {
"use strict";

function WebrtcApi() {
    var self = this;
    if (!window.RTCPeerConnection) {
        throw new Error('Browser is not WebRTC-capable - no RTCPeerConnection support');
    }

    if (navigator.mozGetUserMedia) {
        this.browser = 'firefox';
        this.isFirefox = true;
        if (!MediaStream.prototype.getVideoTracks || !MediaStream.prototype.getAudioTracks) {
            throw new Error('webRTC API missing MediaStream.getXXXTracks');
        }
    } else if (navigator.webkitGetUserMedia) {
        this.browser = window.opr ? 'opera' : 'chrome';
        this.isChrome = true;

        // enable dtls support for compat with Firefox - very old versions, now obsolete
        // this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
    } else if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser is not WebRTC-capable - no getUserMedia support');
    }
    else if (window.webkitAudioContext) { // Safari
        this.browser = 'safari';
        this.isSafari = true;
        if (!window.AudioContext) {
            window.AudioContext = window.webkitAudioContext;
        }
    }
/*  else if (navigator.userAgent.indexOf("Edge") > -1) {
        this.browser = 'edge';
        this.isEdge = true;
    }
*/
    else {
        throw new Error('Unknown browser with WebRTC support');
    }

    this.browserVersion = parseInt(ua.details.version);
    // Some browsers (i.e. older Safari) may support removing a track via replaceTrack(null), but can't re-add a track
    // later - the peer doesn't see it
    this.supportsReplaceTrack = !!(window.RTCRtpSender && RTCRtpSender.prototype.replaceTrack);
    this.supportsUnifiedPlan = window.RTCRtpTransceiver && RTCRtpTransceiver.prototype.hasOwnProperty("currentDirection");
    this.supportsRxTxGetStats = !!(window.RTCRtpSender && RTCRtpSender.prototype.getStats);
    this.supportsScreenCapture = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

    if (d) {
        var browserName = this.browser.charAt(0).toUpperCase() + this.browser.substr(1);
        console.log("========== webRTC support info ==========");
        console.log("This appears to be " + browserName);
        console.log("Supported webRTC APIs:");
        logFeatureSupported("replaceTrack()", this.supportsReplaceTrack);
        logFeatureSupported("Unified Plan", this.supportsUnifiedPlan);
        logFeatureSupported("Sender/Receiver-style stats", this.supportsRxTxGetStats);
        console.log("=========================================");
    }

    this.attachMediaStream = function(elem, stream) {
        if (elem.mozSrcObject) {
            elem.mozSrcObject = null;
            elem.mozSrcObject = stream;
        } else if (typeof elem.srcObject !== 'undefined') {
            elem.srcObject = null;
            elem.srcObject = stream;
        } else {
            elem.removeAttribute('src');
            elem.setAttribute('src', URL.createObjectURL(stream));
        }

        if (HTMLMediaElement.prototype.setSinkId) {
            elem.setSinkId('default')
            .then(function() {
                if (stream) {
                    elem.play();
                }
            });
        } else {
            if (stream) {
                // safari hack
                if (self.isSafari) {
                    elem.setAttribute('playsinline', "");
                    elem.setAttribute('autoplay', "");
                    elem.setAttribute("controls", true);
                    setTimeout(function() {
                        elem.removeAttribute("controls");
                    });
                }
                elem.play();
            }
        }
    };
    var mediaDevices = navigator.mediaDevices;
    if (mediaDevices && mediaDevices.getUserMedia) {
        this.getUserMedia = function (opts) {
            return mediaDevices.getUserMedia(opts);
        }
    } else {
        this.getUserMedia = function (opts) {
            return new Promise(function (resolve, reject) {
                navigator.getUserMedia(opts, resolve, reject);
            });
        };
    }
    if (this.supportsScreenCapture) {
        this.getDisplayMedia = function(opts) {
            return mediaDevices.getDisplayMedia(opts);
        };
    }
}

function logFeatureSupported(name, isSupported) {
    console.log("\t" + name + ": " + (isSupported ? "Yes" : "No"));
}

WebrtcApi.prototype.getBrowserId = function() {
    var ret = this.browser.charAt(0) + (navigator.userAgent.match(/(Android|iPhone)/i) ? 'm' : '');
    var ver = this.browserVersion;
    if (ver) {
        ret += ":" + ver;
    }
    return ret;
};

WebrtcApi.prototype.mediaConstraintsResolution = function (res) {
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (res) {
        case 'hd':
            return {
                width: { min: 1024, ideal: 1280, max: 1920 },
                height: { min: 576, ideal: 720, max: 1080 }
            };
        case 'low':
            return {
                width: { exact: 320 },
                height: { exact: 240 }
            };
        case 'vga':
            return {
                width:  { min: 640, max: 640 },
                height: { min: 480, max: 480 }
            };
    }
};

WebrtcApi.prototype.stopMediaStream = function (stream) {
    if (stream.getTracks) {
        var tracks = stream.getTracks();
        if (tracks.length === 0) {
            return;
        }

        if (tracks[0].stop) {
            // can't check for stop in MediaStreamTrack prototype - it is not
            // defined there, at least on Firefox. Have to check the track
            // instance itself for stop method
            for (var i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }
        } else {
            stream.stop();
        }
    } else {
        // no stream.getTracks() - old browser, probably will not have
        // track.stop() as well, so use the deprecated stream.stop()
        stream.stop();
    }
};

WebrtcApi.prototype.fixupIceServers = function (iceServers) {
    var len = iceServers.length;
    for (var i = 0; i < len; i++) {
        var server = iceServers[i];
        server.url = server.urls[0]; // support old browsers
    }
    return iceServers;
};
/**
 * @returns whether a peer connection has the necessary preconditions necessary to replace
 * its video track
 */
WebrtcApi.prototype.peerConnCanReplaceVideoTrack = function(peerConn) {
    return this.supportsReplaceTrack && peerConn.videoSender;
};

WebrtcApi.prototype.peerConnAddVideoTrack = function(peerConn, track, stream) {
    peerConn.videoSender = peerConn.addTrack(track, stream);
};

WebrtcApi.prototype.peerConnReplaceVideoTrack = function(peerConn, track) {
    assert(this.supportsReplaceTrack);
    assert(peerConn.videoSender);
    return peerConn.videoSender.replaceTrack(track);
};

WebrtcApi.prototype.peerConnRemoveVideoTrack = function(peerConn) {
    assert(this.supportsReplaceTrack);
    if (!peerConn.videoSender) {
        return null;
    }
    try {
        return peerConn.videoSender.replaceTrack(null);
    } catch (e) {
        return Promise.reject("replaceTrack(null) exception: " + e);
    }
};

WebrtcApi.prototype.peerConnAddTracksFromStream = function(peerConn, stream) {
    if (this.isEdge) {
        // Edge can't add one track to multiple peer connections, so we need to clone the stream
        stream = stream.clone();
    }
    var tracks = stream.getTracks();
    var len = tracks.length;
    for (var i = 0; i < len; i++) {
        var track = tracks[i];
        if (track.kind === 'video') {
            assert(!peerConn.videoSender);
            peerConn.videoSender = peerConn.addTrack(track, stream);
        } else {
            peerConn.addTrack(track, stream);
        }
    }
};

WebrtcApi.prototype.streamStopAndRemoveVideoTracks = function(stream) {
    var vts = stream.getVideoTracks();
    var len = vts.length;
    for (var i = 0; i < len; i++) {
        var track = vts[i];
        track.stop();
        stream.removeTrack(track);
    }
};

var RTC = null;

try {
    RTC = new WebrtcApi();
}
catch (e) {
    RTC = null;
    console.error("Error enabling webrtc support: " + e.stack);
}

scope.RTC = RTC;
})(window);
