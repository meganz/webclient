
/* This code is based on strophe.jingle.js by ESTOS */

var JinglePlugin = {
    DISABLE_MIC: 1,
    DISABLE_CAM: 2,
    HAS_MIC: 4,
    HAS_CAM: 8,
    RtcOptions: {},
    init: function (conn) {
        this.sessions = {};
        this.jid2session = {};
        this.ice_config = {iceServers: []};
        this.pc_constraints = {};
        this.media_constraints = {
          mandatory: {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
          }
        };
        // MozDontOfferDataChannel: true when this is firefox
        this.connection = conn;
// Timeout after which if an iq response is not received, an error is generated
        this.jingleTimeout = 50000;
        this.jingleAutoAcceptTimeout = 15000;
        this.eventHandler = this;
// Callbacks called by the connection.jingle object
        this.onIncomingCallRequest = function(from, reqStillValid, ansFunc){};
        this.onCallCanceled = function(from, info) {};
        this.onCallRequestTimeout = function(from) {};
        this.onCallAnswered = function(info) {};
        this.onCallTerminated = function(sess, reason, text){};
        this.onCallIncoming = function(sess){return true;};
        this.onRinging = function(sess){};
        this.onMuted = function(sess, affected){};
        this.onUnmuted = function(sess, affected){};
        this.onInternalError = function(info, e)  {
            console.error("Internal error:", JinglePlugin.jsonStringifyOneLevel(info),
            ((e instanceof Error)?e.stack:e.toString()));
        };
// Callbacks called by session objects
        this.onJingleAck = function(sess, ack){};
        this.onJingleError = function(sess, err, stanza, orig){};
        this.onJingleTimeout = function(sess, err, orig){};
        this.onRemoteStreamAdded = function(sess, event){};
        this.onRemoteStreamRemoved = function(sess, event){};
        this.onIceConnStateChange = function(sess, event){};
        this.onNoStunCandidates = function(sess, event){};
        this.onPacketLoss = function(sess, loss){};

        this.acceptCallsFrom = {};
// The period, during which an accepted call request will be valid
// and the actual call answered. The period starts at the time the
// request is received from the network
        this.callAnswerTimeout = 50000;
        this.rtcSetup();
        if (RTC)
            this.registerDiscoCaps();
    },
    registerDiscoCaps:function() {
        if (!this.connection.disco)
            return;
        var self = this;
        // http://xmpp.org/extensions/xep-0167.html#support
        // http://xmpp.org/extensions/xep-0176.html#support
        this.connection.disco.addNode('urn:xmpp:jingle:1', {});
        this.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:1', {});
        this.connection.disco.addNode('urn:xmpp:jingle:transports:ice-udp:1', {});

        this.connection.disco.addNode('urn:ietf:rfc:5761', {}); // rtcp-mux
        //this.connection.disco.addNode('urn:ietf:rfc:5888', {}); // a=group, e.g. bundle
        //this.connection.disco.addNode('urn:ietf:rfc:5576', {}); // a=ssrc
        function addAudioCaps() {
            self.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:audio', {});
        }
        function addVideoCaps() {
            self.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:video', {});
        }
//        if (localStorage.megaDisableMediaInputs === undefined)
//            RTC.queryMediaInputPermissions();
        var o = JinglePlugin;
        var mediaFlags = localStorage.megaMediaInputFlags;
        if (mediaFlags === undefined)
            mediaFlags = (o.HAS_MIC | o.HAS_CAM);

        if (RTC.getMediaInputTypesFromScan) {
            RTC.getMediaInputTypesFromScan(function(types) {
                var hasAudio = (types.audio && !(mediaFlags & o.DISABLE_MIC));
                var hasVideo = (types.video && !(mediaFlags & o.DISABLE_CAM));
                if (hasAudio)
                    addAudioCaps();
                if (hasVideo)
                    addVideoCaps();
            });
        } else { //if we can't detect, we assume we have both
            if ((mediaFlags & o.HAS_MIC) && !(mediaFlags & o.DISABLE_MIC))
                addAudioCaps();
            if ((mediaFlags & o.HAS_CAM) && !(mediaFlags & o.DISABLE_CAM))
                addVideoCaps();
        }
    },
    /*
        Globally configures the webRTC abstraction layer
    */
    rtcSetup: function() {
        if (this.RtcOptions && this.RtcOptions.NO_DTLS)
        {
            RTC.pc_constraints.optional.forEach(function(opt)
            {
                if (opt.DtlsSrtpKeyAgreement)
                    delete opt.DtlsSrtpKeyAgreement;
            });
        }
    },
    statusChanged: function (status, condition) {
        if (status === Strophe.Status.CONNECTED) {
            this.connection.addHandler(this.onJingle.bind(this), 'urn:xmpp:jingle:1', 'iq', 'set', null, null);
            this.connection.addHandler(this.onIncomingCallMsg.bind(this), null, 'message', 'megaCall', null, null);
        }
        if (this.onConnectionEvent)
            this.onConnectionEvent(status, condition);
    },

    onJingle: function (iq) {
     try {
        var sid = $(iq).find('jingle').attr('sid');
        var sess = this.sessions[sid];
        if (sess && sess.inputQueue) {
            sess.inputQueue.push(iq);
            return true;
        }
        var action = $(iq).find('jingle').attr('action');
        // send ack first
        var ack = $iq({type: 'result',
              to: iq.getAttribute('from'),
              id: iq.getAttribute('id')
        });
        console.log('on jingle', action, 'from', $(iq).attr('from'));

        if ('session-initiate' != action) {
            if (!sess) {
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
            // compare from to sess.peerjid (bare jid comparison for later compat with message-mode)
            // local jid is not checked
            if (Strophe.getBareJidFromJid(iq.getAttribute('from')) != Strophe.getBareJidFromJid(sess.peerjid)) {
                console.warn('jid mismatch for session id', sid, iq.getAttribute('from'), sess.peerjid);
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
        } else if (sess !== undefined) {
            // existing session with same session id
            // this might be out-of-order if the sess.peerjid is the same as from
            ack.type = 'error';
            ack.c('error', {type: 'cancel'})
               .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
            console.warn('duplicate session id', sid);
            return true;
        }
        this.connection.send(ack);
        // see http://xmpp.org/extensions/xep-0166.html#concepts-session
        switch (action) {
        case 'session-initiate': {
            var self = this;
            var peerjid = $(iq).attr('from');
            var barePeerJid = Strophe.getBareJidFromJid(peerjid);
            debugLog("received INITIATE from", peerjid);
            self.purgeOldAcceptCalls(); //they are purged by timers, but just in case
            var ans = self.acceptCallsFrom[peerjid];
            if (!ans)
                return true; //ignore silently - maybe there is no user on this client and some other client(resource) already accepted the call
            delete self.acceptCallsFrom[peerjid];
// Verify SRTP fingerprint
            if (!ans.ownFprMacKey)
                throw new Error("No ans.ownFprMacKey present, there is a bug");
            var j = $(iq).find('>jingle');
            if (!self.verifyMac(self.getFingerprintsFromJingle(j), ans.ownFprMacKey, j.attr('fprmac'))) {
                console.warn('Fingerprint verification failed, possible forge attempt, dropping call!');
                try {
                  self.onCallTerminated.call(self.eventHandler, {
                    fake: true, peerjid: peerjid, isInitiator: false,
                    sid: $(iq).find('jingle').attr('sid')
                  }, "security", "fingerprint verification failed");
                } catch(e){}
                return true;
            }
//===
            var sess = self.createSession($(iq).attr('to'), peerjid,
                    $(iq).find('jingle').attr('sid'), ans.options.localStream,
                    ans.options.muted, {peerFprMacKey: ans.peerFprMacKey});

            sess.media_constraints = self.media_constraints;
            sess.pc_constraints = self.pc_constraints;
            sess.ice_config = self.ice_config;

            sess.inputQueue = [];
            var ret = self.onCallIncoming.call(self.eventHandler, sess);
            if (ret != true) {
                self.terminate(sess, ret.reason, ret.text);
                delete sess.inputQueue;
                return true;
            }

            sess.initiate(false);

            // configure session
            sess.setRemoteDescription($(iq).find('>jingle'), 'offer',
             function() {
                sess.sendAnswer(function() {
                    sess.accept(function() {
                        sess.sendMutedState();
                        self.onCallAnswered.call(self.eventHandler, {peer: peerjid});
//now handle all packets queued up while we were waiting for user's accept of the call
                        self.processAndDeleteInputQueue(sess);
                    });
                });
             },
             function(e) {
                    delete sess.inputQueue;
                    self.terminate(sess, obj.reason, obj.text);
                    return true;
             }
            );
            break;
        }
        case 'session-accept': {
            debugLog("received ACCEPT from", sess.peerjid);
            var self = this;
// Verify SRTP fingerprint
            if (!sess.ownFprMacKey)
                throw new Error("No session.ownFprMacKey present, there is a bug");
            var j = $(iq).find('>jingle');
            if (!self.verifyMac(self.getFingerprintsFromJingle(j), sess.ownFprMacKey, j.attr('fprmac'))) {
                console.warn('Fingerprint verification failed, possible forge attempt, dropping call!');
                self.terminateBySid(sess.sid, 'security', 'fingerprint verification failed');
                return true;
            }
// We are likely to start receiving ice candidates before setRemoteDescription()
// has completed, esp on Firefox, so we want to queue these and feed them only
// after setRemoteDescription() completes
            sess.inputQueue = [];
            sess.setRemoteDescription($(iq).find('>jingle'), 'answer',
              function(){sess.accept(
                function() {
                    if (sess.inputQueue)
                        self.processAndDeleteInputQueue(sess);
                })
              });
            break;
        }
        case 'session-terminate':
            console.log('terminating...');
            debugLog("received TERMINATE from", sess.peerjid);
            var reason = null, text = null;
            if ($(iq).find('>jingle>reason').length)
            {
                reason = $(iq).find('>jingle>reason>:first')[0].tagName;
                if (reason === 'hangup')
                    reason = 'peer-hangup';
                text = $(iq).find('>jingle>reason>text').text();
            }
            this.terminate(sess, reason||'peer-hangup', text);
            break;
        case 'transport-info':
            debugLog("received ICE candidate from", sess.peerjid);
            sess.addIceCandidate($(iq).find('>jingle>content'));
            break;
        case 'session-info':
            debugLog("received INFO from", sess.peerjid);
            var affected;
            if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                this.onRinging.call(this.eventHandler, sess);
            } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                var flags = new MuteInfo(affected);
                sess.remoteMutedState.set(flags.audio, flags.video);
                this.onMuted.call(this.eventHandler, sess, flags);
            } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                var flags = new MuteInfo(affected);
                sess.remoteMutedState.set(flags.audio?false:null, flags.video?false:null);
                this.onUnmuted.call(this.eventHandler, sess, flags);
            }
            break;
        default:
            console.warn('Jingle action "'+ action+'" not implemented');
            break;
        } //end switch
     } catch(e) {
        console.error('Exception in onJingle handler:', e);
        this.onInternalError.call(this.eventHandler, {sess:sess, type: 'jingle'}, e);
     }
     return true;
    },
    /* Incoming call request with a message stanza of type 'megaCall' */
    onIncomingCallMsg: function(callmsg) {
      var self = this;
      var handledElsewhere = false;
      var elsewhereHandler = null;
      var cancelHandler = null;

      try {
        var from = $(callmsg).attr('from');
        var bareJid = Strophe.getBareJidFromJid(from);
        var tsReceived = Date.now();

    // Add a 'handled-elsewhere' handler that will invalidate the call request if a notification
    // is received that another resource answered/declined the call
        elsewhereHandler = self.connection.addHandler(function(msg) {
            if (!cancelHandler)
                return;
            elsewhereHandler = null;
            self.connection.deleteHandler(cancelHandler);
            cancelHandler = null;

            var by = $(msg).attr('by');
            if (by != self.connection.jid)
                self.onCallCanceled.call(self.eventHandler, $(msg).attr('from'),
                 {event: 'handled-elsewhere', by: by, accepted:($(msg).attr('accepted')==='1')});
        }, null, 'message', 'megaNotifyCallHandled', null, from, {matchBare:true});

    // Add a 'cancel' handler that will ivalidate the call request if the caller sends a cancel message
        cancelHandler = self.connection.addHandler(function(msg) {
            if (!elsewhereHandler)
                return;
            cancelHandler = null;
            self.connection.deleteHandler(elsewhereHandler);
            elsewhereHandler = null;

            self.onCallCanceled.call(self.eventHandler, $(msg).attr('from'), {event: 'canceled'});
        }, null, 'message', 'megaCallCancel', null, from, {matchBare:true});

        setTimeout(function() {
            if (!cancelHandler) //cancel message was received and handler was removed
                return;
    // Call was not handled elsewhere, but may have been answered/rejected by us
            self.connection.deleteHandler(elsewhereHandler);
            elsewhereHandler = null;
            self.connection.deleteHandler(cancelHandler);
            cancelHandler = null;

            self.onCallCanceled.call(self.eventHandler, from, {event:'timeout'});
        }, self.callAnswerTimeout+10000);

//tsTillUser measures the time since the req was received till the user answers it
//After the timeout either the handlers will be removed (by the timer above) and the user
//will get onCallCanceled, or if the user answers at that moment, they will get
//a call-not-valid-anymore condition
        var tsTillUser = Date.now() + self.callAnswerTimeout+10000;
        var reqStillValid = function() {
            return ((tsTillUser > Date.now()) && (cancelHandler != null));
        };
// Notify about incoming call
        self.onIncomingCallRequest.call(self.eventHandler, from, reqStillValid,
          function(accept, obj) {
// If dialog was displayed for too long, the peer timed out waiting for response,
// or user was at another client and that other client answred.
// When the user returns at this client he may see the expired dialog asking to accept call,
// and will answer it, but we have to ignore it because it's no longer valid
            if (!reqStillValid()) // Call was cancelled, or request timed out and handler was removed
                return false;//the callback returning false signals to the calling user code that the call request is not valid anymore
            if (accept) {
                var ownFprMacKey = self.generateMacKey();
                var peerFprMacKey = self.decryptMessage($(callmsg).attr('fprmackey'));
                if (!peerFprMacKey)
                    throw new Error("Encrypted mac-key missing from call request");
// tsTillJingle measures the time since we sent megaCallAnswer till we receive jingle-initiate
                var tsTillJingle = Date.now()+self.jingleAutoAcceptTimeout;
                self.acceptCallsFrom[from] = {
                    tsReceived: tsReceived,
                    tsTill: tsTillJingle,
                    options: obj.options,
                    peerFprMacKey: peerFprMacKey,
                    ownFprMacKey: ownFprMacKey
                };
// This timer is for the period from the megaCallAnswer to the jingle-initiate stanza
                setTimeout(function() { //invalidate auto-answer after a timeout
                    var call = self.acceptCallsFrom[from];
                    if (!call || (call.tsTill != tsTillJingle))
                        return; //entry was removed or updated by a new call request
                    self.cancelAutoAnswerEntry(from, 'initiate-timeout', 'timed out waiting for caller to start call');
                }, self.jingleAutoAcceptTimeout);

                self.prepareToSendMessage(function() {
                    self.connection.send($msg({
                        to: from,
                        type: 'megaCallAnswer',
                        fprmackey: self.encryptMessageForJid(ownFprMacKey, bareJid)
                    }));
                }, bareJid);
            }
            else {
// We don't want to answer calls from that user, and this includes a potential previous
// request - we want to cancel that too
                delete self.acceptCallsFrom[bareJid];
                var msg = $msg({to: from, type: 'megaCallDecline', reason: obj.reason?obj.reason:'unknown'});
                if (obj.text)
                    msg.c('body').t(obj.text);
                self.connection.send(msg);
            }
            return true;
        });
      } catch(e) {
            console.error('Exception in onIncomingCallRequest handler:', e);
            self.onInternalError.call(self.eventHandler, {type:'jingle'} , e);
      }
      return true;
    },
    cancelAutoAnswerEntry: function(from, reason, text) {
        delete this.acceptCallsFrom[from];
        this.onCallTerminated.call(this.eventHandler, {fake: true, peerjid: from, isInitiator: false},
            reason, text);
    },
    cancelAllAutoAnswerEntries: function(reason, text) {
        var save = this.acceptCallsFrom;
        this.acceptCallsFrom = {};
        for (var k in save)
            this.onCallTerminated.call(this.eventHandler, {fake: true, peerjid: k, isInitiator: false},
                reason, text);
    },
    purgeOldAcceptCalls: function() {
        var self = this;
        var now = Date.now();
        for (var k in self.acceptCallsFrom) {
            var call = self.acceptCallsFrom[k];
            if (call.tsTill < now)
                this.cancelAutoAnswerEntry(k, 'initiate-timeout', 'timed out waiting for caller to start call');
        }
    },
    processAndDeleteInputQueue: function(sess) {
        var queue = sess.inputQueue;
        delete sess.inputQueue;
        for (var i=0; i<queue.length; i++)
            this.onJingle(queue[i]);
    },
    initiate: function (peerjid, myjid, sessStream, mutedState, sessProps) { // initiate a new jinglesession to peerjid
        var sess = this.createSession(myjid, peerjid,
            Math.random().toString(36).substr(2, 12), // random string
            sessStream, mutedState, sessProps);
        // configure session
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(true);
        sess.sendOffer(function() {sess.sendMutedState()});
        return sess;
    },
    createSession: function(me, peerjid, sid, sessStream, mutedState, sessProps) {
        var sess = new JingleSession(me, peerjid, sid, this.connection, sessStream, mutedState);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
        if (sessProps) {
            for (var k in sessProps)
                if (sessProps.hasOwnProperty(k)) {
                    if (sess[k] === undefined)
                        sess[k] = sessProps[k];
                      else
                        console.warn('Jingle.initiate: a property in sessProps overlaps with an existing property of the create session object - not setting');
                }
        }

        return sess;
    },
    terminateAll: function(reason, text, nosend)
    {
    //terminate all existing sessions
        for (sid in this.sessions)
            this.terminate(this.sessions[sid], reason, text, nosend);
    },
    terminateBySid: function(sid, reason, text, nosend)
    {
        return this.terminate(this.sessions[sid], reason, text, nosend);
    },
    terminate: function(sess, reason, text, nosend)
    {
        if ((!sess) || (!this.sessions[sess.sid]))
            return false; //throw new Error("Unknown session: " + sid);
        if (sess.state != 'ended')
        {
            if (!nosend)
                sess.sendTerminate(reason||'term', text);
            sess.terminate();
        }
        delete this.jid2session[sess.peerjid];
        delete this.sessions[sess.sid];
        try {
            this.onCallTerminated.call(this.eventHandler, sess, reason||'term', text);
        } catch(e) {
            console.error('Jingle.onCallTerminated() threw an exception:', e.stack);
        }

        return true;
    },
    terminateByJid: function (jid)
    {
        var sess = this.jid2session[jid];
        if (!sess)
            return false;
        return this.terminate(sess, null, null);
    },
    sessionIsValid: function(sess)
    {
        return (this.sessions[sess.sid] != undefined);
    },
    getFingerprintsFromJingle: function(j) {
        var fpNodes = j.find('>content>transport>fingerprint');
        if (fpNodes.length < 1)
            throw new Error("Could not extract SRTP fingerprint from jingle packet");
        var fps = [];
        for (var i=0; i<fpNodes.length; i++) {
            var node = fpNodes[i];
            fps.push(node.getAttribute('hash')+' '+node.textContent);
        }
        fps.sort();
        return fps.join(';');
    },
    getStunAndTurnCredentials: function () {
        // get stun and turn configuration from server via xep-0215
        // uses time-limited credentials as described in
        // http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00
        //
        // see https://code.google.com/p/prosody-modules/source/browse/mod_turncredentials/mod_turncredentials.lua
        // for a prosody module which implements this
        //
        // currently, this doesn't work with updateIce and therefore credentials with a long
        // validity have to be fetched before creating the peerconnection
        // TODO: implement refresh via updateIce as described in
        //      https://code.google.com/p/webrtc/issues/detail?id=1650
        this.connection.send(
            $iq({type: 'get', to: this.connection.domain})
                .c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + this.connection.domain}),
            function (res) {
                var iceservers = [];
                $(res).find('>services>service').each(function (idx, el) {
                    el = $(el);
                    var dict = {};
                    switch (el.attr('type')) {
                    case 'stun':
                        dict.url = 'stun:' + el.attr('host');
                        if (el.attr('port')) {
                            dict.url += ':' + el.attr('port');
                        }
                        iceservers.push(dict);
                        break;
                    case 'turn':
                        dict.url = 'turn:';
                        if (el.attr('username')) { // https://code.google.com/p/webrtc/issues/detail?id=1508
                            if (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) < 28) {
                                dict.url += el.attr('username') + '@';
                            } else {
                                dict.username = el.attr('username'); // only works in M28
                            }
                        }
                        dict.url += el.attr('host');
                        if (el.attr('port') && el.attr('port') != '3478') {
                            dict.url += ':' + el.attr('port');
                        }
                        if (el.attr('transport') && el.attr('transport') != 'udp') {
                            dict.url += '?transport=' + el.attr('transport');
                        }
                        if (el.attr('password')) {
                            dict.credential = el.attr('password');
                        }
                        iceservers.push(dict);
                        break;
                    }
                });
                this.ice_config.iceServers = iceservers;
            },
            function (err) {
                console.warn('getting turn credentials failed', err);
                console.warn('is mod_turncredentials or similar installed?');
            }
        );
        // implement push?
 },
 jsonStringifyOneLevel: function(obj) {
    var str = '{';
    for (var k in obj) {
        if (!obj.hasOwnProperty(k))
            continue;
        str+=(k+':');
        var prop = obj[k];
        switch(typeof prop) {
          case 'string': str+=('"'+prop+'"'); break;
          case 'number': str+=prop; break;
          case 'function': str+='(func)'; break;
          case 'object':
            if (prop instanceof Array)
                str+='(array)';
            else
                str+='(object)';
            break;
          default: str+='(unk)'; break;
        }
        str+=', ';
    }
    if (str.length > 1)
        str = str.substr(0, str.length-2)+'}';
    return str;
 }
};

function MuteInfo(affected) {
    if (affected.match(/voice/i))
        this.audio = true;
    if (affected.match(/video/i))
        this.video = true;
}

Strophe.addConnectionPlugin('jingle', JinglePlugin);
