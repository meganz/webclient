/* jshint -W117 */
Strophe.addConnectionPlugin('jingle', {

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
            console.error("Internal error:", jsonStringifyOneLevel(info),
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
    },
    registerDiscoCaps:function() {
        if (!this.connection.disco)
            return;
        
        // http://xmpp.org/extensions/xep-0167.html#support
        // http://xmpp.org/extensions/xep-0176.html#support
        this.connection.disco.addNode('urn:xmpp:jingle:1', {});
        this.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:1', {});
        this.connection.disco.addNode('urn:xmpp:jingle:transports:ice-udp:1', {});
        this.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:audio', {});
        this.connection.disco.addNode('urn:xmpp:jingle:apps:rtp:video', {});

        // this is dealt with by SDP O/A so we don't need to annouce this
        //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtcp-fb:0'); // XEP-0293
        //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtp-hdrext:0'); // XEP-0294
        this.connection.disco.addNode('urn:ietf:rfc:5761', {}); // rtcp-mux
        //this.connection.disco.addNode('urn:ietf:rfc:5888', {}); // a=group, e.g. bundle
        //this.connection.disco.addNode('urn:ietf:rfc:5576', {}); // a=ssrc
    },
    statusChanged: function (status, condition) {
        if (status === Strophe.Status.CONNECTED) {
        this.registerDiscoCaps();
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
        if (sess && sess.answerWaitQueue) {
            sess.answerWaitQueue.push(iq);
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
        case 'session-initiate':
        {
            var peerjid = $(iq).attr('from');
            var barePeerJid = Strophe.getBareJidFromJid(peerjid);
            debugLog("received INITIATE from", peerjid);
            this.purgeOldAcceptCalls();
            var ans = this.acceptCallsFrom[barePeerJid];
            if (!ans)
                return true; //ignore silently - maybe there is no user on this client and some other client(resource) already accepted the call
            delete this.acceptCallsFrom[barePeerJid];
            var sess = this.createSession($(iq).attr('to'), peerjid, $(iq).find('jingle').attr('sid'), ans.options.localStream, ans.options.muted);
            
            sess.media_constraints = this.media_constraints;
            sess.pc_constraints = this.pc_constraints;
            sess.ice_config = this.ice_config;
            
            var self = this;
            sess.answerWaitQueue = [];
            var ret = this.onCallIncoming.call(this.eventHandler, sess);
            if (ret != true)
            {
                self.terminate(sess, ret.reason, ret.text);
                delete sess.answerWaitQueue;
                return true;
            }
                
            sess.initiate(peerjid, false);

            // configure session
            sess.setRemoteDescription($(iq).find('>jingle'), 'offer',
             function() {
                sess.sendAnswer(function() {
                    sess.accept();
                    sess.sendMutedState();
                    self.onCallAnswered.call(self.eventHandler, {peer: peerjid});
//now handle all packets queued up while we were waiting for user's accept of the call
                    var queue = sess.answerWaitQueue;
                    delete sess.answerWaitQueue;
                    for (var i=0; i<queue.length; i++)
                        self.onJingle(queue[i]);
                });
             }, 
             function(e) {
                    delete sess.answerWaitQueue;
                    self.terminate(sess, obj.reason, obj.text);
                    return true;
             }
            );
            break;
        }
        case 'session-accept':
            debugLog("received ACCEPT from", sess.peerjid);
            sess.setRemoteDescription($(iq).find('>jingle'), 'answer', 
             function(){sess.accept();});
            break;
        case 'session-terminate':
            console.log('terminating...');
            debugLog("received TERMINATE from", sess.peerjid);
            var reason = null, text = null;
            if ($(iq).find('>jingle>reason').length)
            {
                reason = $(iq).find('>jingle>reason>:first')[0].tagName;
                text = $(iq).find('>jingle>reason>text').text();
            }
            this.terminate(sess, reason, text);
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
    onIncomingCallMsg: function(msg) {
      var self = this;
      var handledElsewhere = false;
      var elsewhereHandler = null;
      var cancelHandler = null;

      try {
        self.purgeOldAcceptCalls();
        var from = receivedCallFrom = $(msg).attr('from');
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
        
        var tsTill = Date.now()+self.jingleTimeout+10000;
        var reqStillValid = function() {
            return ((tsTill > Date.now()) && (cancelHandler != null));
        };
        
        self.onIncomingCallRequest.call(self.eventHandler, from, reqStillValid, function(accept, obj) {
// If dialog was displayed for too long, the peer timed out waiting for response,
// or user was at another client and that other client answred.
// When the user returns at this client he may see the expired dialog asking to accept call,
// and will answer it, but we have to ignore it because it's no longer valid
            if (!cancelHandler) // Call was cancelled, or request timed out and handler was removed
                return false;//the callback returning false signals to the calling user code that the call request is not valid anymore
            if (accept) {
                self.acceptCallsFrom[bareJid] = {
                    tsReceived: tsReceived,
                    tsTill: tsTill,
                    options: obj.options
                };
                self.connection.send($msg({to: from, type: 'megaCallAnswer'}));
            }
            else {
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
    
    purgeOldAcceptCalls: function() {
        var self = this;
        var now = Date.now();
        for (var k in self.acceptCallsFrom) {
            if (self.acceptCallsFrom[k].tsTill < now)
                delete self.acceptCallsFrom[k];
        }
    },
    initiate: function (peerjid, myjid, sessStream, mutedState) { // initiate a new jinglesession to peerjid
        var sess = this.createSession(myjid, peerjid,
            Math.random().toString(36).substr(2, 12), // random string
            sessStream, mutedState);
        // configure session        
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(true);
        sess.sendOffer(function() {sess.sendMutedState()});
        return sess;
    },
    createSession: function(me, peerjid, sid, sessStream, mutedState)
    {
        var sess = new JingleSession(me, peerjid, sid, this.connection, sessStream, mutedState);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
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
                sess.sendTerminate(reason || (!sess.active()) ? 'cancel' : null, text);
            sess.terminate();
        }
        delete this.jid2session[sess.peerjid];
        delete this.sessions[sess.sid];
        this.onCallTerminated.call(this.eventHandler, sess, reason?reason:'term');
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
    }
});

function MuteInfo(affected) {
    if (affected.match(/voice/i))
        this.audio = true;
    if (affected.match(/video/i))
        this.video = true;
}

    
function jsonStringifyOneLevel(obj) {
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
