/* jshint -W117 */
// Jingle stuff
function JingleSession(me, peerjid, sid, connection, sessStream, mutedState) {
    this.me = me;
    this.sid = sid;
    this.connection = connection;
    this.jingle = connection.jingle;
    this.eventHandler = this.jingle.eventHandler;
    this.initiator = null;
    this.responder = null;
    this.isInitiator = null;
    this.peerjid = peerjid;
    this.state = null;
    this.peerconnection = null;
    this.mutedState = mutedState?mutedState:(new MutedState);
    this.remoteMutedState = new MutedState;
    this.localStream = sessStream;
    this.remoteStream = null;
    this.localSDP = null;
    this.remoteSDP = null;
    this.startTime = null;
    this.stopTime = null;
    this.media_constraints = null;
    this.pc_constraints = null;
    this.drip_container = [];
    this.responseTimeout = this.jingle.jingleTimeout;

    this.usetrickle = true;
    this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
    this.usedrip = false; // dripping is sending trickle candidates not one-by-one

    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.statsinterval = null;
    if (this.localStream)
        this.syncMutedState();
}

JingleSession.prototype = {

initiate: function(isInitiator) {
    var self = this;
    if (self.state !== null) {
        console.error('attempt to initiate on session ' + self.sid +
                  'in state ' + self.state);
        return;
    }
    self.isInitiator = isInitiator;
    self.state = 'pending';
    self.initiator = isInitiator ? self.me : self.peerjid;
    self.responder = !isInitiator ? self.me : self.peerjid;
    if (!self.jingle.iceServers) {
        console.warn("session.initiate(): No ice servers provided, and no ice servers preconfigured in jingle plugin")
    } else {
        self.iceServers = self.jingle.iceServers;
    }

    //console.log('create PeerConnection ' + JSON.stringify(self.ice_config));
    try {
        self.peerconnection = new RTC.peerconnection(
            { iceServers: RTC.fixupIceServers(self.iceServers) },
            self.pc_constraints
        );
        if ((RTC.Stats === undefined) && (typeof statsGlobalInit === 'function'))
            statsGlobalInit(self.peerconnection);
    } catch (e) {
        self.reportError('Failed to create PeerConnection', {e:e});
        return;
    }
    if (self.localStream)
        self.peerconnection.addStream(self.localStream);
    if (self.fileTransferHandler) {
        if (isInitiator)
            self.fileTransferHandler.bindToDataChannel(
            self.peerconnection.createDataChannel(null, {ordered:true, reliable:true}));
         else
            self.peerconnection.ondatachannel = function(event) {
                self.fileTransferHandler.bindToDataChannel(event.channel);
        }
    }

    self.hadstuncandidate = false;
    self.hadturncandidate = false;
    self.lasticecandidate = false;
    self.peerconnection.onicecandidate = function (event) {
        if(event.candidate &&
            event.candidate.candidate.indexOf("candidate") === 0
        ) { // Chrome, normalizing the event.candidate to start with a=
            event.candidate.candidate = "a=" + event.candidate.candidate;
        }
        self.sendIceCandidate(event.candidate);
    };

/*
    The track-by-track approach does not signal when the whole stream is assembled.
    It's very inconvenient when managing things at the stream/connection
    level (like here), and may get undeprecated. See
    https://lists.w3.org/Archives/Public/public-webrtc/2015Jun/0069.html

    if (window.RTCTrackEvent) { // New API
        self.peerconnection.ontrack = function(event) {
            self.remoteStream = event.streams[0];
            self.jingle.onRemoteStreamAdded(self, self.remoteStream);
        };
    } else { //Legacy API
*/
        self.peerconnection.onaddstream = function(event) {
            self.remoteStream = event.stream;
            self.jingle.onRemoteStreamAdded(self, self.remoteStream);
        };
//    }

    self.peerconnection.onremovestream = function (event) {
        self.remoteStream = null;
        self.jingle.onRemoteStreamRemoved(self, event);
    };
    self.peerconnection.onsignalingstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
            console.log('Signalling state change to', self.peerconnection.signalingState);
    };
    self.peerconnection.oniceconnectionstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
        console.log('ICE connstate changed to', self.peerconnection.iceConnectionState);
        var state = self.peerconnection.iceConnectionState;
        if (self.state != 'ended') { //use double equals because state might be some internal enum that converts to string?
            if (state == 'disconnected') {
                self.jingle.terminate(self, 'ice-disconnect');
            }
            else if (state == 'failed') {
                self.jingle.terminate(self, 'ice-fail');
            }
        }
        self.jingle.onIceConnStateChange(self, event); //does nothing
    };
},

accept: function (cb) {
    if (!this.peerconnection) //connection may have been closed meanwhile
        return;
    var self = this;
    self.state = 'active';

    var pranswer = self.peerconnection.localDescription;
    if (!pranswer) {
        throw new Error('BUG: sesson.accept() called, but no local description has been set');
    }
    if (pranswer.type != 'pranswer') {
        cb();
        return;
    }
    console.log('going from pranswer to answer');
    if (self.usetrickle) {
        // remove candidates already sent from session-accept
        var lines = SDPUtil.find_lines(pranswer.sdp, 'a=candidate:');
        for (var i = 0; i < lines.length; i++) {
            pranswer.sdp = pranswer.sdp.replace(lines[i] + '\r\n', '');
        }
    }
    while (SDPUtil.find_line(pranswer.sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        pranswer.sdp = pranswer.sdp.replace('a=inactive', 'a=sendrecv');
    }
    var prsdp = new SDP(pranswer.sdp);
    var accept = $iq({to: self.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-accept',
           initiator: self.initiator,
           responder: self.responder,
           sid: self.sid
          });
    prsdp.toJingle(accept, self.initiator === self.me ? 'initiator' : 'responder');
    self.addFingerprintMac(accept);

    var sdp = self.peerconnection.localDescription.sdp;
    while (SDPUtil.find_line(sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        sdp = sdp.replace('a=inactive', 'a=sendrecv');
    }
    self.peerconnection.setLocalDescription(new RTC.RTCSessionDescription({type: 'answer', sdp: sdp}),
        function () {
            self.sendIq(accept, 'answer', cb,
              function() {self.reportError('Error response to "answer" jingle iq stanza')});
        },
        function (e) {
            self.reportError("setLocalDescription returned error", {e:e});
        }
    );
},

terminate: function (reason) {
    this.state = 'ended';
    if (this.peerconnection) {
        if (this.peerconnection.signallingState !== 'closed') {
            this.peerconnection.close();
        }
        this.peerconnection = null;
    }
},

active: function () {
    return this.state === 'active';
},

sendIceCandidate: function (candidate) {
    if (!this.peerconnection) //peerconnection may have been closed already
        return;
    var self = this;
    if (candidate && !self.lasticecandidate) {
        var mid = candidate.sdpMid;
        if (!mid || (mid.length < 1)) {
            mid = SDPUtil.find_line(self.localSDP.media[candidate.sdpMLineIndex], 'a=mid:');
            if (mid) {
                candidate.sdpMid = mid.substr(6);
            }
        }

        var ice = SDPUtil.iceparams(self.localSDP.media[candidate.sdpMLineIndex], self.localSDP.session),
            jcand = SDPUtil.candidateToJingle(candidate.candidate);
        if (!(ice && jcand)) {
            self.reportError("Error extracting ice candidate or converting it to Jingle");
            return;
        }
        ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';

        if (jcand.type === 'srflx') {
            self.hadstuncandidate = true;
        } else if (jcand.type === 'relay') {
            self.hadturncandidate = true;
        }
//        console.log(event.candidate, jcand);

        if (self.usetrickle) {
            if (self.usedrip) {
                if (self.drip_container.length === 0) {
                    // start 10ms callout
                    window.setTimeout(function () {
                        if (self.drip_container.length === 0) return;
                        var allcands = self.drip_container;
                        self.drip_container = [];
                        var cand = $iq({to: self.peerjid, type: 'set'})
                            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                               action: 'transport-info',
                               initiator: self.initiator,
                               sid: self.sid});
                        for (var mid = 0; mid < self.localSDP.media.length; mid++) {
                            var cands = allcands.filter(function (el) { return el.sdpMLineIndex == mid; });
                            if (cands.length > 0) {
                                var ice = SDPUtil.iceparams(self.localSDP.media[mid], self.localSDP.session);
                                ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
                                cand.c('content', {creator: self.initiator == self.me ? 'initiator' : 'responder',
                                       name: cands[0].sdpMid
                                }).c('transport', ice);
                                for (var i = 0; i < cands.length; i++) {
                                    cand.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
                                }
                                // add fingerprint
                                if (SDPUtil.find_line(self.localSDP.media[mid], 'a=fingerprint:', self.localSDP.session)) {
                                    var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(self.localSDP.media[mid], 'a=fingerprint:', self.localSDP.session));
                                    tmp.required = true;
                                    cand.c('fingerprint').t(tmp.fingerprint);
                                    delete tmp.fingerprint;
                                    cand.attrs(tmp);
                                    cand.up();
                                }
                                cand.up(); // transport
                                cand.up(); // content
                            }
                        }
                        // might merge last-candidate notification into this, but it is called alot later. See webrtc issue #2340
                        //console.log('was this the last candidate', self.lasticecandidate);
                        self.sendIq(cand, 'transportinfo');
                        debugLog("sent ICE candidates to", self.peerjid);
                    }, 10);
                }
                self.drip_container.push(event.candidate);
                return;
            } //end if (useDrip)
            // map to transport-info
            var cand = $iq({to: self.peerjid, type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                        action: 'transport-info',
                        initiator: self.initiator,
                        sid: self.sid})
                .c('content', {creator: self.initiator == self.me ? 'initiator' : 'responder',
                        name: candidate.sdpMid
                        })
                .c('transport', ice)
                .c('candidate', jcand);
            cand.up();
            // add fingerprint
            if (SDPUtil.find_line(self.localSDP.media[candidate.sdpMLineIndex], 'a=fingerprint:', self.localSDP.session)) {
                var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(self.localSDP.media[candidate.sdpMLineIndex], 'a=fingerprint:', self.localSDP.session));
                tmp.required = true;
                cand.c('fingerprint').t(tmp.fingerprint);
                delete tmp.fingerprint;
                cand.attrs(tmp);
                cand.up();
            }
            self.sendIq(cand, 'transportinfo');
            debugLog("sent ICE candidates to", self.peerjid);
        } //end if (useTrickle)
    } else { //if (candidate && !self.lasticecandidate)
        //console.log('sendIceCandidate: last candidate.');
        if (!self.usetrickle) {
            console.log('should send full offer now...');
            var action = (self.peerconnection.localDescription.type == 'offer') ? 'session-initiate' : 'session-accept';
            var init = $iq({to: self.peerjid,
                       type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: action,
                   initiator: self.initiator,
                   sid: self.sid
                });

            self.localSDP = new SDP(self.peerconnection.localDescription.sdp);
            self.localSDP.toJingle(init, self.initiator == self.me ? 'initiator' : 'responder');
            self.addFingerprintMac(init);
            self.sendIq(init, 'offer', null, function() {
                self.state = 'error';
                self.peerconnection.close();
            });
            debugLog("sent SESSION", action, "to", self.peerjid);
        } //end if (!usetrickle)
        self.lasticecandidate = true;
        debugLog('Candidates generated -> srflx:', self.hadstuncandidate+ ', relay:', self.hadturncandidate);

        if (!(self.hadstuncandidate || self.hadturncandidate) && self.peerconnection.signalingState != 'closed') {
            self.jingle.onNoStunCandidates(self);
        }
    }
},

sendOffer: function (cb) {
    var self = this;
    self.peerconnection.createOffer(function (sdp) {
            try {
                self.createdOffer(sdp, cb);
            } catch(e) {
                self.reportError("createdOffer() returned error", {e:e});
            }
        },
        function (e) {
            self.reportError("peerconnection.createOffer() returned error", {e: e});
        },
        self.media_constraints
    );
},

createdOffer: function (sdp, cb) {
    var self = this;
    sdp.sdp = sdp.sdp.replace(/\r\na=extmap:\d+ urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n/mg, '\r\n');
    self.localSDP = new SDP(sdp.sdp);
    //self.localSDP.mangle();
    sdp.sdp = self.localSDP.raw;
    self.peerconnection.setLocalDescription(sdp, function () {
      //console.log('setLocalDescription success');
      if (self.usetrickle) {
        var init = $iq({to: self.peerjid, type: 'set'})
          .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-initiate',
            initiator: self.initiator,
            sid: self.sid
           });
        self.localSDP.toJingle(init, self.initiator == self.me ? 'initiator' : 'responder');
        self.addFingerprintMac(init);
        self.sendIq(init, 'offer', null, function() {
            self.state = 'error';
            self.jingle.terminate(self, 'initiate-error', 'Error or timeout initiating jingle session');
        }, self.jingle.jingleAutoAcceptTimeout);
        debugLog("created&sent OFFER to", self.peerjid);
      }
      if (cb)
        cb();
    },
    function (e) {
        self.reportError("setLocalDescription() returned error", {e:e});
    });

    var cands = SDPUtil.find_lines(self.localSDP.raw, 'a=candidate:');
    for (var i = 0; i < cands.length; i++) {
        var cand = SDPUtil.parse_icecandidate(cands[i]);
        if (cand.type == 'srflx') {
            self.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            self.hadturncandidate = true;
        }
    }
},

setRemoteDescription: function(elem, desctype, successCb, failCb)
{
    var self = this;
//    console.log('setting remote description... ', desctype);
    self.remoteSDP = new SDP('');
    self.remoteSDP.fromJingle(elem);
    if (self.peerconnection.remoteDescription !== null) {
        console.log('setRemoteDescription when remote description is not null, should be pranswer', self.peerconnection.remoteDescription);
        if (self.peerconnection.remoteDescription.type == 'pranswer') {
            var pranswer = new SDP(self.peerconnection.remoteDescription.sdp);
            for (var i = 0; i < pranswer.media.length; i++) {
                // make sure we have ice ufrag and pwd
                if (!SDPUtil.find_line(self.remoteSDP.media[i], 'a=ice-ufrag:', self.remoteSDP.session)) {
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                        self.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice ufrag?');
                    }
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                        self.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice pwd?');
                    }
                }
                // copy over candidates
                var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                for (var j = 0; j < lines.length; j++) {
                    self.remoteSDP.media[i] += lines[j] + '\r\n';
                }
            }
            self.remoteSDP.raw = self.remoteSDP.session + self.remoteSDP.media.join('');
        }
    }
    var remotedesc = new RTC.RTCSessionDescription({type: desctype, sdp: self.remoteSDP.raw});

    //console.log('setRemoteDescription for session', self.sid);
//setRemoteDescription() takes some time on Firefox, and meanwhile ICE candidated start
//being processed - the code thinks that ICE candidates start arriving before the answer,
//and tries to use pranswer
    self.peerconnection.setRemoteDescription(remotedesc,
        function()
        {
            successCb();
        },
        function(e)
        {
            self.reportError('setRemoteDescription returned error', {e:e});
            if (failCb)
                failCb();
        }
    );
},

addIceCandidate: function (elem) {
    var self = this;
    if (self.peerconnection.signalingState == 'closed') { //using '==' becauyse signallingState might not be a string (but some internal representation that may have toString() implemented)
        return;
    }
    if (!self.peerconnection.remoteDescription && self.peerconnection.signalingState == 'have-local-offer') {
        console.log('trickle ice candidate arriving before session accept...');
        // create a PRANSWER for setRemoteDescription
        if (!self.remoteSDP) {
            var cobbled = 'v=0\r\n' +
                'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                's=-\r\n' +
                't=0 0\r\n';
            // first, take some things from the local description
            for (var i = 0; i < self.localSDP.media.length; i++) {
                cobbled += SDPUtil.find_line(self.localSDP.media[i], 'm=') + '\r\n';
                cobbled += SDPUtil.find_lines(self.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                if (SDPUtil.find_line(self.localSDP.media[i], 'a=mid:')) {
                    cobbled += SDPUtil.find_line(self.localSDP.media[i], 'a=mid:') + '\r\n';
                }
                cobbled += 'a=inactive\r\n';
            }
            self.remoteSDP = new SDP(cobbled);
        }
        // then add things like ice and dtls from remote candidate
        elem.each(function () {
            for (var i = 0; i < self.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                        self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    if (!SDPUtil.find_line(self.remoteSDP.media[i], 'a=ice-ufrag:')) {
                        var tmp = $(this).find('transport');
                        self.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
                        self.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
                        tmp = $(this).find('transport>fingerprint');
                        if (tmp.length) {
                            self.remoteSDP.media[i] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                        } else {
                            console.log('no dtls fingerprint (webrtc issue #1718?)');
                            self.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                        }
                        break;
                    }
                }
            }
        });
        self.remoteSDP.raw = self.remoteSDP.session + self.remoteSDP.media.join('');

        // we need a complete SDP with ice-ufrag/ice-pwd in all parts
        // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
        // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
        var iscomplete = self.remoteSDP.media.filter(function (mediapart) {
            return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
        }).length === self.remoteSDP.media.length;

        if (iscomplete) {
            console.log('setting pranswer');
            try {
                self.peerconnection.setRemoteDescription(new RTC.RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }));
            } catch (e) {
                self.reportError('setRemoteDescription(pranswer) returned error', {e: e});
            }
        } else {
            console.log('not yet setting pranswer');
        }
    }
    // operate on each content element
    elem.each(function () {
        // would love to deactivate this, but firefox still requires it
        var idx = -1;
        var i;
        for (i = 0; i < self.remoteSDP.media.length; i++) {
            if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                idx = i;
                break;
            }
        }
        if (idx == -1) { // fall back to localdescription
            for (i = 0; i < self.localSDP.media.length; i++) {
                if (SDPUtil.find_line(self.localSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.localSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    idx = i;
                    break;
                }
            }
        }
        var name = $(this).attr('name');
        // TODO: check ice-pwd and ice-ufrag?
        $(this).find('transport>candidate').each(function () {
            var line, candidate;
            line = SDPUtil.candidateFromJingle(this);
            candidate = new RTC.RTCIceCandidate({sdpMLineIndex: idx,
                                            sdpMid: name,
                                            candidate: line});
            try {
                self.peerconnection.addIceCandidate(candidate);
            } catch (e) {
                self.reportError('addIceCandidate() returned error', {cand:line, e:e});
            }
        });
    });
},

sendAnswer: function (cb, provisional) {
    var self = this;
    self.peerconnection.createAnswer(
        function (sdp) {
            self.createdAnswer(sdp, cb, provisional);
        },
        function (e) {
            self.reportError('createAnswer() returned error', {e: e});
        },
        self.media_constraints //TODO: Firefox seems to not like when remote doesn't send anything and we set here OfferToReceiveXXX
    );
},

createdAnswer: function (sdp, cb, provisional) {
    var self = this;
    if (self.state === 'ended') {
        console.warn('Session ', self.sid, 'to', self.peerjid, ':createdAnswer: Session already closed, aborting');
//        return;
    }
    sdp.sdp = sdp.sdp.replace(/\r\na=extmap:\d+ urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n/mg, '\r\n');
    self.localSDP = new SDP(sdp.sdp);
    //self.localSDP.mangle();
    self.usepranswer = provisional === true;
    if (self.usetrickle) {
        if (!self.usepranswer) {
            var accept = $iq({to: self.peerjid,
                     type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: 'session-accept',
                   initiator: self.initiator,
                   responder: self.responder,
                   sid: self.sid
                });
            self.localSDP.toJingle(accept, self.initiator == self.me ? 'initiator' : 'responder');
            self.addFingerprintMac(accept);
            self.sendIq(accept, 'answer');
        } else {
            sdp.type = 'pranswer';
            for (var i = 0; i < self.localSDP.media.length; i++) {
                self.localSDP.media[i] = self.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
            }
            self.localSDP.raw = self.localSDP.session + '\r\n' + self.localSDP.media.join('');
        }
    }
    sdp.sdp = self.localSDP.raw;
    debugLog("created&sent ANSWER to", self.peerjid);
    self.peerconnection.setLocalDescription(sdp,
        function () {
            if (cb)
                cb();
        },
        function (e) {
            self.reportError('setLocalDescription() returned error', {e:e});
        }
    );
    var cands = SDPUtil.find_lines(self.localSDP.raw, 'a=candidate:');
    for (var j = 0; j < cands.length; j++) {
        var cand = SDPUtil.parse_icecandidate(cands[j]);
        if (cand.type == 'srflx') {
            self.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            self.hadturncandidate = true;
        }
    }
},

sendTerminate: function (reason, text, callback) {
    var self = this,
        term = $iq({to: self.peerjid,
               type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-terminate',
           initiator: self.initiator,
           sid: self.sid})
        .c('reason')
        .c(reason || 'success');

    if (text) {
        term.up().c('text').t(text);
    }

    self.sendIq(term, 'terminate', callback ? callback : function() {});
    self.jingle.connection.flush();
    debugLog("sent TERMINATE to", self.peerjid);
},

sendIq: function(iq, src, successCb, errorCb, timeout)
{
    var self = this;
    self.connection.sendIQ(iq,
        function () {
            if (successCb)
                successCb();
            var ack = {source: src};
            self.jingle.onJingleAck(self, ack);
        },
        function (stanza) {
            if (errorCb)
                errorCb();
            var error = {source: src};
            if (stanza) {
              if($(stanza).find('error').length) {
                error.code = $(stanza).find('error').attr('code');
                error.reason = $(stanza).find('error :first')[0].tagName;
              }
            } else { // !stanza
                error.isTimeout = true;
            }
            self.jingle.onJingleError(self, error, stanza, iq);
        },
        timeout||self.responseTimeout);
},

sendMute: function (muted, content) {
    var self = this;
    var info = $iq({to: self.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: self.initiator,
           sid: self.sid });
    info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    info.attrs({'creator': self.me === self.initiator ? 'creator' : 'responder'});
    if (content) {
        info.attrs({'name': content});
    }
    self.connection.sendIQ(info);
},

sendRinging: function () {
    var self = this;
    var info = $iq({to: self.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: self.initiator,
           sid: self.sid });
    info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    self.connection.sendIQ(info);
},

setLocalStream: function(sessStream)
{
    this.localStream = sessStream;
    this.syncMutedState();
},

syncMutedState: function()
{
    var s = this.localStream;
    if (!s)
        return;
    var at = s.getAudioTracks();
    for (var i=0; i<at.length; i++)
        at[i].enabled = !this.mutedState.audioMuted;
    var vt = s.getVideoTracks();
    for (var i=0; i<vt.length; i++)
        vt[i].enabled = !this.mutedState.videoMuted;
},

sendMutedState: function() {
    if (this.mutedState.audioMuted)
        this.sendMute(true, 'voice');
    if (this.mutedState.videoMuted)
        this.sendMute(true, 'video');
},

muteUnmute: function(state, what){
//First do the actual muting, and only then send the signalling
    if (what.audio)
        this.mutedState.audioMuted = state;
    if (what.video)
        this.mutedState.videoMuted = state;
    this.syncMutedState();
    if (what.audio)
        this.sendMute(state, 'voice');
    if (what.video)
        this.sendMute(state, 'video');
},

reportError: function(msg, info) {
    if (!info) {
         info = {sid: this.sid};
    } else {
        info.sid = this.sid;
    }
    this.jingle.onInternalError(msg, info);
},

addFingerprintMac: function(jiq) {
    var self = this;
    if (!self.peerFprMacKey)
        throw new Error("addFingerprintMac: No peer mac-key has been received");
    var j = $(jiq.tree()).find('>jingle');
    if (!j)
        throw new Error("addFingerprintMac: No jingle node present in packet");
    var fpnodes = j.find('content>transport>fingerprint');
    if (fpnodes.length < 1)
        throw new Error("Could not find any fingerprint nodes in generated jingle packet");
    var fps = [];
    fpnodes.each(function() {
        fps.push(this.getAttribute('hash')+' '+this.textContent);
    });
    fps.sort();
    var fprmac = self.jingle.generateMac(fps.join(';'), self.peerFprMacKey);
    j.attr('fprmac', fprmac);
//    console.log('local fingerprint is: "'+fpt+'", MAC:"'+self.fingerprintMac+'"');
}
} //end JingleSession class

function MutedState()
{}

MutedState.prototype.set = function(audio, video) {
    if ((audio !== undefined) && (audio !== null))
        this.audioMuted = audio;
    if ((video !== undefined) && (video !== null))
        this.videoMuted = video;
}

function debugLog() {
//    console.log.apply(console, arguments);
}
