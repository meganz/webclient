// mozilla chrome compat layer -- very similar to adapter.js
// Based on code from ESTOS

(function(scope) {
"use strict";

function WebrtcApi() {
    if (navigator.mozGetUserMedia) {
        this.browser = 'firefox';
        this.isFirefox = true;
        if (!MediaStream.prototype.getVideoTracks || !MediaStream.prototype.getAudioTracks) {
            throw new Error('webRTC API missing MediaStream.getXXXTracks');
        }

        if (d) {
            console.log('This appears to be Firefox');
        }

        this.pc_constraints = {};
        if (MediaStream.prototype.clone) {
            this.cloneMediaStream = function (src) {
                return src.clone();
            };
        }
        else {
            this.cloneMediaStream = function (src) {
                // no cloning, just returns original stream
                return src;
            };
        }

    } else if (navigator.webkitGetUserMedia) {
        this.browser = window.opr ? 'opera' : 'chrome';
        this.isChrome = true;
        if (d) {
            console.log('This appears to be Chrome');
        }

        // enable dtls support for compat with Firefox
        this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};

        this.cloneMediaStream = function (src, what) {
            var stream = new MediaStream();
            var ats = src.getAudioTracks();
            if (what.audio && ats.length > 0) {
                stream.addTrack(ats[0]);
            }
            var vts = src.getVideoTracks();
            if (what.video && vts.length > 0) {
                stream.addTrack(vts[0]);
            }
            return stream;
        };

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

    this.browserVersion = parseInt(ua.details.version);
    this.supportsReplaceTrack = !!(window.RTCRtpSender && RTCRtpSender.prototype.replaceTrack);
    this.supportsUnifiedPlan = !!(this.supportsReplaceTrack && window.RTCRtpTransceiver);
    this.supportsRxTxGetStats = !!(window.RTCRtpSender && RTCRtpSender.prototype.getStats);
    this.supportsScreenCapture = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    function processDevices(devices) {
        var hasAudio = false;
        var hasVideo = false;
        for (var i = 0; i < devices.length; i++) {
            var s = devices[i];
            if (s.kind === 'audio') {
                hasAudio = true;
            }
            else if (s.kind === 'video') {
                hasVideo = true;
            }
        }
        return {audio: hasAudio, video: hasVideo};
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
                elem.play();
            }
        }
    };

    this.getUserMedia = function (opts) {
        return new Promise(function (resolve, reject) {
            navigator.getUserMedia(opts, resolve, reject);
        });
    };
    if (this.supportsScreenCapture) {
        this.getDisplayMedia = function(opts) {
            return navigator.mediaDevices.getDisplayMedia(opts);
        };
    }
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        this.getMediaInputTypes = function () {
            return new Promise(function (resolve, reject) {
                navigator.mediaDevices.enumerateDevices()
                    .then(function (devices) {
                        resolve(processDevices(devices));
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            });
        };
    } else {
        this.getMediaInputTypes = function () {
            return new Promise(function (resolve) {
                MediaStreamTrack.getSources(function (sources) {
                    resolve(processDevices(sources));
                });
            });
        };
    }
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

WebrtcApi.prototype.getUserMediaWithConstraintsAndCallback = function (um) {
    return this.getUserMedia(this.createUserMediaConstraints(um));
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
        server.url = server.urls[0];
    }
    return iceServers;
};

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
    if (window.d && console.warn) {
        console.error("Error enabling webrtc support: " + e.stack);
    }
}

scope.RTC = RTC;
})(window);
