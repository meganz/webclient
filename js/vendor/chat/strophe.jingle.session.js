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
    this.remoteStreams = [];
    this.startTime = null;
    this.stopTime = null;
    this.media_constraints = null;
    this.pc_constraints = null;
    this.ice_config = {},
    this.drip_container = [];
    this.responseTimeout = this.jingle.jingleTimeout;
    
    this.usetrickle = true;
    this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
    this.usedrip = false; // dripping is sending trickle candidates not one-by-one

    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;
    
    this.statsinterval = null;
    this.syncMutedState();
}

JingleSession.prototype.initiate = function(isInitiator) 
{
    var obj = this;
    if (this.state !== null) {
        console.error('attempt to initiate on session ' + this.sid +
                  'in state ' + this.state);
        return;
    }
    this.isInitiator = isInitiator;
    this.state = 'pending';
    this.initiator = isInitiator ? this.me : this.peerjid;
    this.responder = !isInitiator ? this.me : this.peerjid;
    
    //console.log('create PeerConnection ' + JSON.stringify(this.ice_config));
    try {
        this.peerconnection = new RTC.peerconnection(this.ice_config, this.pc_constraints);
        //console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.error('Failed to create PeerConnection, exception: ', e.stack);
        return;
    }
    this.peerconnection.addStream(this.localStream);
    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;
    this.peerconnection.onicecandidate = function (event) {
        obj.sendIceCandidate(event.candidate);
    };
    this.peerconnection.onaddstream = function (event) {
        obj.remoteStream = event.stream;
        obj.remoteStreams.push(event.stream);
        obj.jingle.onRemoteStreamAdded.call(obj.eventHandler, obj, event);
    };
    this.peerconnection.onremovestream = function (event) {
        obj.remoteStream = null;
        // FIXME: remove from this.remoteStreams
        obj.jingle.onRemoteStreamRemoved.call(obj.eventHandler, obj, event);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        if (!(obj && obj.peerconnection)) return;
//        console.log('signallingstate ', obj.peerconnection.signalingState, event);
    };
    this.peerconnection.oniceconnectionstatechange = function (event) {
        if (!(obj && obj.peerconnection)) return;
 //       console.log('iceconnectionstatechange', obj.peerconnection.iceConnectionState, event);
        switch (obj.peerconnection.iceConnectionState) {
        case 'connected':
            this.startTime = new Date();
            break;
        case 'disconnected':
            this.stopTime = new Date();
            break;
        }
        obj.jingle.onIceConnStateChange.call(obj.eventHandler, obj, event);
    };
};

JingleSession.prototype.accept = function (cb) {
    var ob = this;
    this.state = 'active';

    var pranswer = this.peerconnection.localDescription;
    if (!pranswer || pranswer.type != 'pranswer') {
        return;
    }
    console.log('going from pranswer to answer');
    if (this.usetrickle) {
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
    var accept = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-accept',
           initiator: this.initiator,
           responder: this.responder,
           sid: this.sid });
    prsdp.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');

    var sdp = this.peerconnection.localDescription.sdp;
    while (SDPUtil.find_line(sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        sdp = sdp.replace('a=inactive', 'a=sendrecv');
    }
    this.peerconnection.setLocalDescription(new RTC.RTCSessionDescription({type: 'answer', sdp: sdp}),
        function () {
            this.sendIq(accept, 'answer', cb,
              function() {this.reportError({type:'jingle', op:'sendIq session-accept'})});
        },
        function (e) {
            this.reportError({type: 'jingle', op:'setLocalDescription'}, e);
        }
    );
};

JingleSession.prototype.terminate = function (reason) {
    this.state = 'ended';
    if (this.peerconnection)
    {
        this.peerconnection.close();
        this.peerconnection = null;
    }
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.active = function () {
    return this.state == 'active';
};

JingleSession.prototype.sendIceCandidate = function (candidate) {
    var ob = this;
    if (candidate && !this.lasticecandidate) {
        var ice = SDPUtil.iceparams(this.localSDP.media[candidate.sdpMLineIndex], this.localSDP.session),
            jcand = SDPUtil.candidateToJingle(candidate.candidate);
        if (!(ice && jcand)) {
            this.reportError({type:'jingle', op:'get ice && jcand'}, e);
            return;
        }
        ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';

        if (jcand.type === 'srflx') {
            this.hadstuncandidate = true;
        } else if (jcand.type === 'relay') {
            this.hadturncandidate = true;
        }
//        console.log(event.candidate, jcand);

        if (this.usetrickle) {
            if (this.usedrip) {
                if (this.drip_container.length === 0) {
                    // start 10ms callout
                    window.setTimeout(function () {
                        if (ob.drip_container.length === 0) return;
                        var allcands = ob.drip_container;
                        ob.drip_container = [];
                        var cand = $iq({to: ob.peerjid, type: 'set'})
                            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                               action: 'transport-info',
                               initiator: ob.initiator,
                               sid: ob.sid});
                        for (var mid = 0; mid < ob.localSDP.media.length; mid++) {
                            var cands = allcands.filter(function (el) { return el.sdpMLineIndex == mid; });
                            if (cands.length > 0) {
                                var ice = SDPUtil.iceparams(ob.localSDP.media[mid], ob.localSDP.session);
                                ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
                                cand.c('content', {creator: ob.initiator == ob.me ? 'initiator' : 'responder',
                                       name: cands[0].sdpMid
                                }).c('transport', ice);
                                for (var i = 0; i < cands.length; i++) {
                                    cand.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
                                }
                                // add fingerprint
                                if (SDPUtil.find_line(ob.localSDP.media[mid], 'a=fingerprint:', ob.localSDP.session)) {
                                    var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(ob.localSDP.media[mid], 'a=fingerprint:', ob.localSDP.session));
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
                        //console.log('was this the last candidate', ob.lasticecandidate);
                        ob.sendIq(cand, 'transportinfo');
                        debugLog("sent ICE candidates to", this.peerjid);
                    }, 10);
                }
                this.drip_container.push(event.candidate);
                return;
            } //end if (useDrip)
            // map to transport-info
            var cand = $iq({to: this.peerjid, type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                        action: 'transport-info',
                        initiator: this.initiator,
                        sid: this.sid})
                .c('content', {creator: this.initiator == this.me ? 'initiator' : 'responder',
                        name: candidate.sdpMid
                        })
                .c('transport', ice)
                .c('candidate', jcand);
            cand.up();
            // add fingerprint
            if (SDPUtil.find_line(this.localSDP.media[candidate.sdpMLineIndex], 'a=fingerprint:', this.localSDP.session)) {
                var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(this.localSDP.media[candidate.sdpMLineIndex], 'a=fingerprint:', this.localSDP.session));
                tmp.required = true;
                cand.c('fingerprint').t(tmp.fingerprint);
                delete tmp.fingerprint;
                cand.attrs(tmp);
                cand.up();
            }
            this.sendIq(cand, 'transportinfo');
            debugLog("sent ICE candidates to", this.peerjid);
        } //end if (useTrickle)
    } else { //if (candidate && !this.lasticecandidate)
        //console.log('sendIceCandidate: last candidate.');
        if (!this.usetrickle) {
            console.log('should send full offer now...');
            var action = (this.peerconnection.localDescription.type == 'offer') ? 'session-initiate' : 'session-accept';
            var init = $iq({to: this.peerjid,
                       type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: action,
                   initiator: this.initiator,
                   sid: this.sid});

            this.localSDP = new SDP(this.peerconnection.localDescription.sdp);
            this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder');
            this.sendIq(init, 'offer', null, function() {
                ob.state = 'error';
                ob.peerconnection.close();
            });
            debugLog("sent SESSION", action, "to", this.peerjid);
        } //end if (!usetrickle)
        this.lasticecandidate = true;
        debugLog('Candidates generated -> srflx:', this.hadstuncandidate+ ', relay:', this.hadturncandidate);
        
        if (!(this.hadstuncandidate || this.hadturncandidate) && this.peerconnection.signalingState != 'closed') {
            ob.jingle.onNoStunCandidates.call(ob.eventHandler, ob);
        }
    }
};

JingleSession.prototype.sendOffer = function (cb) {
    //console.log('sendOffer...');
    var ob = this;
    this.peerconnection.createOffer(function (sdp) {
            ob.createdOffer(sdp, cb);
        },
        function (e) {
            this.reportError({type:'webrtc', op:'createOffer'}, e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdOffer = function (sdp, cb) {
    //console.log('createdOffer', sdp);
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp, function () {
      //console.log('setLocalDescription success');
      if (self.usetrickle) {
        var init = $iq({to: self.peerjid, type: 'set'})
          .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-initiate',
            initiator: self.initiator,
            sid: self.sid});
        self.localSDP.toJingle(init, self.initiator == self.me ? 'initiator' : 'responder');
        self.sendIq(init, 'offer', null, function() {
            self.state = 'error';
            if (self.peerconnection.state != 'ended')
                self.peerconnection.close();
        });
        debugLog("created&sent OFFER to", self.peerjid);    
      }
      if (cb)
        cb();
    },
    function (e) {
        self.reportError({type:'webrtc', op:'setLocalDescription'}, e);
    });
     
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var i = 0; i < cands.length; i++) {
        var cand = SDPUtil.parse_icecandidate(cands[i]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.setRemoteDescription = function (elem, desctype, successCb, failCb)
{
//    console.log('setting remote description... ', desctype);
    this.remoteSDP = new SDP('');
    this.remoteSDP.fromJingle(elem);
    if (this.peerconnection.remoteDescription !== null) {
        console.log('setRemoteDescription when remote description is not null, should be pranswer', this.peerconnection.remoteDescription);
        if (this.peerconnection.remoteDescription.type == 'pranswer') {
            var pranswer = new SDP(this.peerconnection.remoteDescription.sdp);
            for (var i = 0; i < pranswer.media.length; i++) {
                // make sure we have ice ufrag and pwd
                if (!SDPUtil.find_line(this.remoteSDP.media[i], 'a=ice-ufrag:', this.remoteSDP.session)) {
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice ufrag?');
                    }
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice pwd?');
                    }
                }
                // copy over candidates
                var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                for (var j = 0; j < lines.length; j++) {
                    this.remoteSDP.media[i] += lines[j] + '\r\n';
                }
            }
            this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');
        }
    }
    var remotedesc = new RTC.RTCSessionDescription({type: desctype, sdp: this.remoteSDP.raw});
     
    //console.log('setRemoteDescription for session', this.sid);
//setRemoteDescription() takes some time on Firefox, and meanwhile ICE candidated start
//being processed - the code thinks that ICE candidates start arriving before the answer,
//and tries to use pranswer
    this.peerconnection.setRemoteDescription(remotedesc,
        function ()
        {
            successCb();
        },
        function (e) 
        {
            this.reportError({type:'webrtc', op:'setRemoteDescription'}, e);
            if (failCb)
                failCb();
        }
    );
};

JingleSession.prototype.addIceCandidate = function (elem) {
    var obj = this;
    if (this.peerconnection.signalingState == 'closed')
        return;
    
    if (!this.peerconnection.remoteDescription && this.peerconnection.signalingState == 'have-local-offer') {
        console.log('trickle ice candidate arriving before session accept...');
        // create a PRANSWER for setRemoteDescription
        if (!this.remoteSDP) {
            var cobbled = 'v=0\r\n' +
                'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                's=-\r\n' +
                't=0 0\r\n';
            // first, take some things from the local description
            for (var i = 0; i < this.localSDP.media.length; i++) {
                cobbled += SDPUtil.find_line(this.localSDP.media[i], 'm=') + '\r\n';
                cobbled += SDPUtil.find_lines(this.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                if (SDPUtil.find_line(this.localSDP.media[i], 'a=mid:')) {
                    cobbled += SDPUtil.find_line(this.localSDP.media[i], 'a=mid:') + '\r\n';
                }
                cobbled += 'a=inactive\r\n';
            }
            this.remoteSDP = new SDP(cobbled);
        }
        // then add things like ice and dtls from remote candidate
        elem.each(function () {
            for (var i = 0; i < obj.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(obj.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                        obj.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    if (!SDPUtil.find_line(obj.remoteSDP.media[i], 'a=ice-ufrag:')) {
                        var tmp = $(this).find('transport');
                        obj.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
                        obj.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
                        tmp = $(this).find('transport>fingerprint');
                        if (tmp.length) {
                            obj.remoteSDP.media[i] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                        } else {
                            console.log('no dtls fingerprint (webrtc issue #1718?)');
                            obj.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                        }
                        break;
                    }
                }
            }
        });
        this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');

        // we need a complete SDP with ice-ufrag/ice-pwd in all parts
        // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
        // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
        var iscomplete = this.remoteSDP.media.filter(function (mediapart) {
            return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
        }).length == this.remoteSDP.media.length;

        if (iscomplete) {
            console.log('setting pranswer');
            try {
                this.peerconnection.setRemoteDescription(new RTC.RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }));
            } catch (e) {
                this.reportError({type:'webrtc', op:'setRemoteDescription:pranswer'}, e);
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
        for (i = 0; i < obj.remoteSDP.media.length; i++) {
            if (SDPUtil.find_line(obj.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                obj.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                idx = i;
                break;
            }
        }
        if (idx == -1) { // fall back to localdescription
            for (i = 0; i < obj.localSDP.media.length; i++) {
                if (SDPUtil.find_line(obj.localSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    obj.localSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
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
                obj.peerconnection.addIceCandidate(candidate);
            } catch (e) {
                this.reportError({type:'webrtc', op:'addIceCandidate', line:line}, e);
            }
        });
    });
};

JingleSession.prototype.sendAnswer = function (cb, provisional) {
    var ob = this;
    this.peerconnection.createAnswer(
        function (sdp) {
            ob.createdAnswer(sdp, cb, provisional);
        },
        function (e) {
            this.reportError({type:'webrtc', op:'createAnswer'}, e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdAnswer = function (sdp, cb, provisional) {
    if (this.state === 'ended')
    {
        console.warn('Session ', this.sid, 'to', this.peerjid, ':createdAnswer: Session already closed, aborting');
//      return;
    }
    
    var ob = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    this.usepranswer = provisional === true;
    if (this.usetrickle) {
        if (!this.usepranswer) {
            var accept = $iq({to: this.peerjid,
                     type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: 'session-accept',
                   initiator: this.initiator,
                   responder: this.responder,
                   sid: this.sid });
            this.localSDP.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');
            this.sendIq(accept, 'answer');
        } else {
            sdp.type = 'pranswer';
            for (var i = 0; i < this.localSDP.media.length; i++) {
                this.localSDP.media[i] = this.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
            }
            this.localSDP.raw = this.localSDP.session + '\r\n' + this.localSDP.media.join('');
        }
    }
    sdp.sdp = this.localSDP.raw;
    debugLog("created&sent ANSWER to", this.peerjid);
    this.peerconnection.setLocalDescription(sdp,
        function () {
            if (cb)
                cb();
        },
        function (e) {
            this.reportError({type:'webrtc', op:'setLocalDescription'}, e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var j = 0; j < cands.length; j++) {
        var cand = SDPUtil.parse_icecandidate(cands[j]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.sendTerminate = function (reason, text) {
    var obj = this,
        term = $iq({to: this.peerjid,
               type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-terminate',
           initiator: this.initiator,
           sid: this.sid})
        .c('reason')
        .c(reason || 'success');
        
    if (text) {
        term.up().c('text').t(text);
    }

    this.sendIq(term, 'terminate', function() {});
    obj.terminate();    
    debugLog("sent TERMINATE to", this.peerjid);
}

JingleSession.prototype.sendIq = function(iq, src, successCb, errorCb)
{
    var self = this;
    this.connection.sendIQ(iq,
        function () {
            if (successCb)
                successCb();
            var ack = {source: src};
            self.jingle.onJingleAck.call(self.eventHandler, self, ack);
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
            self.jingle.onJingleError.call(self.eventHandler, self, error, stanza, iq);
        },
        this.responseTimeout);
};

JingleSession.prototype.sendMute = function (muted, content) {
    var info = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: this.initiator,
           sid: this.sid });
    info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    info.attrs({'creator': this.me == this.initiator ? 'creator' : 'responder'});
    if (content) {
        info.attrs({'name': content});
    }
    this.connection.sendIQ(info);
};

JingleSession.prototype.sendRinging = function () {
    var info = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: this.initiator,
           sid: this.sid });
    info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    this.connection.sendIQ(info);
};

JingleSession.prototype.getStats = function (interval) {
    var ob = this;
    var recv = {audio: 0, video: 0};
    var lost = {audio: 0, video: 0};
    var lastrecv = {audio: 0, video: 0};
    var lastlost = {audio: 0, video: 0};
    var loss = {audio: 0, video: 0};
    var delta = {audio: 0, video: 0};
    this.statsinterval = window.setInterval(function () {
        if (ob && ob.peerconnection && ob.peerconnection.getStats) {
            ob.peerconnection.getStats(function (stats) {
                var results = stats.result();
                // TODO: there are so much statistics you can get from this..
                for (var i = 0; i < results.length; ++i) {
                    if (results[i].type == 'ssrc') {
                        var packetsrecv = results[i].stat('packetsReceived');
                        var packetslost = results[i].stat('packetsLost');
                        if (packetsrecv && packetslost) {
                            packetsrecv = parseInt(packetsrecv, 10);
                            packetslost = parseInt(packetslost, 10);
                            
                            if (results[i].stat('googFrameRateReceived')) {
                                lastlost.video = lost.video;
                                lastrecv.video = recv.video;
                                recv.video = packetsrecv;
                                lost.video = packetslost;
                            } else {
                                lastlost.audio = lost.audio;
                                lastrecv.audio = recv.audio;
                                recv.audio = packetsrecv;
                                lost.audio = packetslost;
                            }
                        }
                    }
                }
                delta.audio = recv.audio - lastrecv.audio;
                delta.video = recv.video - lastrecv.video;
                loss.audio = (delta.audio > 0) ? Math.ceil(100 * (lost.audio - lastlost.audio) / delta.audio) : 0;
                loss.video = (delta.video > 0) ? Math.ceil(100 * (lost.video - lastlost.video) / delta.video) : 0;
                ob.jingle.onPacketLoss.call(ob.eventHandler, ob, loss);
            });
        }
    }, interval || 3000);
    return this.statsinterval;
};

JingleSession.prototype.setLocalStream = function(sessStream)
{
    this.localStream = sessStream;
    this.syncMutedState();
}

JingleSession.prototype.syncMutedState = function()
{
    var s = this.localStream;
    if (!s)
        return;
    for (var i=0; i<s.getAudioTracks().length; i++)
        s.getAudioTracks()[i].enabled = !this.mutedState.audioMuted;
    for (var i=0; i<s.getVideoTracks().length; i++)
        s.getVideoTracks()[i].enabled = !this.mutedState.videoMuted;
}

JingleSession.prototype.sendMutedState = function() {
    if (this.mutedState.audioMuted)
        this.sendMute(true, 'voice');
    if (this.mutedState.videoMuted)
        this.sendMute(true, 'video');
}


JingleSession.prototype.muteUnmute = function(state, what)
{
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
}

JingleSession.prototype.reportError = function(info, e) {
    this.jingle.onInternalError.call(this.jingle.eventHandler, info, e);
}

function MutedState()
{}

MutedState.prototype.set = function(audio, video) {
    if ((audio != undefined) && (audio != null))
        this.audioMuted = audio;
    if ((video != undefined) && (video != null))
        this.videoMuted = video;
}

function debugLog() {
//    console.log.apply(console, arguments);
}