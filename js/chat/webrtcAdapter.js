// mozilla chrome compat layer -- very similar to adapter.js
// Based on code from ESTOS

(function(scope) {
"use strict";

function WebrtcApi() {
    if (navigator.mozGetUserMedia) {
        this.browser = 'firefox';
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

    this.attachMediaStream = function (elem, stream) {
        if (elem.mozSrcObject) {
            elem.mozSrcObject = stream;
        } else if (typeof elem.srcObject !== 'undefined') {
            elem.srcObject = stream;
        }
        else {
            if (!stream) {
                elem.removeAttribute('src');
            } else {
                elem.setAttribute('src', URL.createObjectURL(stream));
            }
        }

        if (stream) {
            elem.play();
        }
    };


    this.getUserMedia = function (opts) {
        return new Promise(function (resolve, reject) {
            navigator.getUserMedia(opts, resolve, reject);
        });
    };

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

WebrtcApi.prototype.getBrowserVersion = function getBrowserVersion() {
    var browser = RTC.browser.charAt(0)+(navigator.userAgent.match(/(Android|iPhone)/i)?'m':'');
    var ver = parseInt(ua.details.version);
    if (!isNaN(ver)) {
        browser += (':' + ver);
    }
    return browser;
};

WebrtcApi.prototype.createUserMediaConstraints = function (um) {
    var constraints = {audio: false, video: false};

    if (um.video) {
        constraints.video = {mandatory: {}};// same behaviour as true
    }

    if (um.audio) {
        constraints.audio = {};// same behaviour as true
    }

    if (um.screen) {
        constraints.video = {
            "mandatory": {
                "chromeMediaSource": "screen"
            }
        };
    }

    if (um.resolution && !constraints.video) {
        constraints.video = {mandatory: {}};// same behaviour as true
    }

    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (um.resolution) {
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
            if (navigator.userAgent.indexOf('Android') !== -1) {
                constraints.video.mandatory.minWidth = 320;
                constraints.video.mandatory.minHeight = 240;
                constraints.video.mandatory.maxFrameRate = 15;
            }
            break;
    }

    if (um.bandwidth) { // doesn't work currently, see webrtc issue 1846
        if (!constraints.video)  {
            // same behaviour as true
            constraints.video = {mandatory: {}};
        }
        constraints.video.optional = [{bandwidth: um.bandwidth}];
    }
    if (um.fps) { // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) {
            // same behaviour as tru;
            constraints.video = {mandatory: {}};
        }
        constraints.video.mandatory.minFrameRate = fps;
    }
    return constraints;
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

WebrtcApi.prototype._getBrowserVersion = function () {
    return parseInt(ua.details.version);
};

var RTC = null;

try {
    RTC = new WebrtcApi();
}
catch (e) {
    RTC = null;
    if (window.d && console.warn) {
        console.warn("Error enabling webrtc support: " + e);
    }
}

scope.RTC = RTC;
})(window);
