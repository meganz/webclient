
/* This code is based on strophe.jingle.js by ESTOS */

var JinglePlugin = {
    DISABLE_MIC: 1,
    DISABLE_CAM: 2,
    HAS_MIC: 4,
    HAS_CAM: 8,
    RtcOptions: {},
    init: function (conn) {
        if (!RTC) {
            throw new RtcSession.NotSupportedError("Bug: Attempting to initialize the JinglePlugin, but there is no webRTC support in this browser");
        }
        this.sessions = {};
        this.callRequests = {};
        this.ice_config = {iceServers: []};
        this.pc_constraints = {};
        if (RTC.browser === "firefox") {
            this.media_constraints = {
                'offerToReceiveAudio': true,
                'offerToReceiveVideo': true
            };
        } else {
            this.media_constraints = {
                mandatory: {
                    'OfferToReceiveAudio': true,
                    'OfferToReceiveVideo': true
                }
            };
        };
        // MozDontOfferDataChannel: true when this is firefox
        this.connection = conn;
// Timeout after which if an iq response is not received, an error is generated
        this.jingleTimeout = 50000;
        this.jingleAutoAcceptTimeout = 25000;
        this.apiTimeout = 20000;
        this.eventHandler = this;
        if (typeof(FileTransferManager) !== 'undefined') {
            this.ftManager = new FileTransferManager(this);
        }
// Callbacks called by the connection.jingle object
        this.onIncomingCallRequest = function(from, reqStillValid, ansFunc){};
        this.onCallCanceled = function(info) {};
        this.onCallRequestTimeout = function(from) {};
        this.onCallAnswered = function(info) {};
        this.onCallTerminated = function(sess, reason, text){};
        this.onCallIncoming = function(sess){return true;};
        this.onRinging = function(sess){};
        this.onMuted = function(sess, affected){};
        this.onUnmuted = function(sess, affected){};
        this.onInternalError = function(msg, info)  {
            if (!info)
                info = {};
            if (info.e) {
                var e = info.e;
                if (e.stack) {
                    if (RTC.browser === 'chrome' || RTC.browser === 'opera') {
                        info.e = e.stack.toString();
                    } else {
                        info.e = e.toString()+'\n'+e.stack.toString();
                    }
                } else {
                    info.e = e.toString();
                }
            }
            console.error("onInternalError:", msg, "\n"+(info.e||''));
            var hadCall = false;
            var sid = info.sid;
            if (sid) {
                var sess = this.sessions[sid];
                if (sess) {
                    hadCall = true;
                    this.terminate(sess, "internal-error", msg, false, info);
                } else {
                    hadCall = this.cancelAutoAnswerEntry(sid, "internal-error", msg, info)
                           || this.cancelCallRequest(sid, "internal-error", msg, info);
                    }
            }
            info.hadCall = hadCall;
            if ((this.eventHandler !== this) && this.eventHandler.onInternalError) {
                this.eventHandler.onInternalError(msg, info);
            }
        };
// Callbacks called by session objects
        this.onJingleAck = function(sess, ack){};
        this.onJingleError = function(sid, err, stanza, orig){};
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

        var o = JinglePlugin;
        var mediaFlags = localStorage.megaMediaInputFlags;
        if (mediaFlags === undefined)
            mediaFlags = (o.HAS_MIC | o.HAS_CAM);

        RTC.getMediaInputTypes()
        .then(function(types) {
                var hasAudio = (types.audio && !(mediaFlags & o.DISABLE_MIC));
                var hasVideo = (types.video && !(mediaFlags & o.DISABLE_CAM));
                if (hasAudio)
                    addAudioCaps();
                if (hasVideo)
                    addVideoCaps();
        });
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
     var sid = $(iq).find('jingle').attr('sid'); //we need this before the try block because we will use in the catch()
     try {
        var sess;
        if (sid) {
             sess = this.sessions[sid];
        }
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

        if ('session-initiate' !== action) {
            if (!sess) {
                if ('session-terminate' === action)
                    return true;
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
            var j = $(iq).find('>jingle');
            var peerjid = $(iq).attr('from');
            var barePeerJid = Strophe.getBareJidFromJid(peerjid);
            debugLog("received INITIATE from", peerjid);
            self.purgeOldAcceptCalls(); //they are purged by timers, but just in case
            var ans = self.acceptCallsFrom[sid];
            if (!ans)
                return true; //ignore silently - maybe there is no user on this client and some other client(resource) already accepted the call
            if (ans.from !== peerjid)
                throw new Error('Sid and peer-jid mismatch in session-initiate');
            delete self.acceptCallsFrom[sid];
// Verify SRTP fingerprint
            if (!ans.ownFprMacKey)
                throw new Error("No ans.ownFprMacKey present, there is a bug");

            if (!self.verifyMac(self.getFingerprintsFromJingle(j), ans.ownFprMacKey, j.attr('fprmac'))) {
                self.rtcSession.logMsg("w", "Fingerprint verification failed. Possible forge attempt, dropping call!");
                console.warn("Fingerprint verification failed. Possible forge attempt, dropping call!");
                try {
                    self.sendTerminateNoSession(sid, peerjid, "security", "Fingerprint verification failed");
                } catch(e) {
                    console.error(e);
                }
                try {
                  self.onCallTerminated.call(self.eventHandler, {
                    fake: true,
                    peerjid: peerjid,
                    isInitiator: false,
                    sid: sid,
                    peerAnonId: ans.peerAnonId,
                    localStream: ans.options.localStream,
                    callOptions: ans.options
                  }, "security", "Fingerprint verification failed");
                } catch(e) {
                    self.onInternalError("Error calling onCallTerminated handler", {e:e});
                }
                return true;
            }
//===
            if (!ans.fileTransferHandler)
                sess = self.createSession($(iq).attr('to'), peerjid,
                    sid, ans.options.localStream,
                    ans.options.muted, {
                        peerFprMacKey: ans.peerFprMacKey,
                        peerAnonId: ans.peerAnonId
                    }
                );
             else
                sess = self.createSession($(iq).attr('to'), peerjid,
                    sid, null, null, {
                        peerFprMacKey: ans.peerFprMacKey,
                        peerAnonId: ans.peerAnonId,
                        fileTransferHandler: ans.fileTransferHandler
                    }
                );
            sess.media_constraints = self.media_constraints;
            sess.pc_constraints = self.pc_constraints;
            sess.ice_config = self.ice_config;

            sess.inputQueue = [];
            var ret = self.onCallIncoming.call(self.eventHandler, {sess: sess, peerMedia: ans.peerMedia, files: ans.files});
            if (ret !== true) {
                self.terminate(sess, ret.reason, ret.text);
                delete sess.inputQueue;
                return true;
            }

            sess.initiate(false);

            // configure session
            sess.setRemoteDescription(j, 'offer',
             function() {
                sess.sendAnswer(function() {
                    sess.accept(function() {
                        if (!sess.fileTransferHandler)
                            sess.sendMutedState();
                        self.onCallAnswered.call(self.eventHandler, {peer: peerjid, isDataCall: !!sess.fileTransferHandler, sid: sess.sid});
//now handle all packets queued up while we were waiting for user's accept of the call
                        self.processAndDeleteInputQueue(sess);
                    });
                });
             },
             function(e) {
                delete sess.inputQueue; //onInternalError is already called by sess.setRemoteDecription()
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
                console.warn("Fingerprint verification failed. Possible forge attempt, dropping call!");
                self.rtcSession.logMsg("w", "Fingerprint verification failed. Possible forge attempt, dropping call!");
                self.terminate(sess, 'security', "Fingerprint verification failed");
                return true;
            }
// We are likely to start receiving ice candidates before setRemoteDescription()
// has completed, esp on Firefox, so we want to queue these and feed them only
// after setRemoteDescription() completes
            sess.inputQueue = [];
            sess.setRemoteDescription(j, 'answer',
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
                reason = 'peer-'+$(iq).find('>jingle>reason>:first')[0].tagName;
                text = $(iq).find('>jingle>reason>text').text();
            }
            this.terminate(sess, reason||'peer-hangup', text, true);
            break;
        case 'transport-info':
            debugLog("received ICE candidate from", sess.peerjid);
            sess.addIceCandidate($(iq).find('>jingle>content'));
            break;
        case 'session-info':
            debugLog("received INFO from", sess.peerjid);
            if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                this.onRinging.call(this.eventHandler, sess);
            } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                var affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                var flags = new MuteInfo(affected);
                sess.remoteMutedState.set(flags.audio, flags.video);
                this.onMuted.call(this.eventHandler, sess, flags);
            } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                var affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
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
        this.onInternalError('Exception in onJingle handler:', {sid: sid, e: e});
     }
     return true;
    },
    /* Incoming call request with a message stanza of type 'megaCall' */
    onIncomingCallMsg: function(callmsg) {
      var self = this;
      var handledElsewhere = false;
      var elsewhereHandler = null;
      var cancelHandler = null;
      var sid = $(callmsg).attr('sid'); //this will become the sid of the Jingle call once it is established

      try {
        var from = $(callmsg).attr('from');
        if (!sid)
            throw new Error("Incoming call message does not have a 'sid' attribute");
        var peerAnonId = $(callmsg).attr('anonid');
        if (!peerAnonId)
            throw new Error("Incoming call message does not have an 'anonId' attribute");
        var bareJid = Strophe.getBareJidFromJid(from);
        var strFiles = $(callmsg).attr('files');
        var files = strFiles?JSON.parse(strFiles):undefined;

        var tsReceived = Date.now();

    // Add a 'handled-elsewhere' handler that will invalidate the call request if a notification
    // is received that another resource answered/declined the call
        elsewhereHandler = self.connection.addHandler(function(msg) {
            if ($(msg).attr('sid') !== sid)
                return true;
            if (!cancelHandler)
                return;
            elsewhereHandler = null;
            self.connection.deleteHandler(cancelHandler);
            cancelHandler = null;

            var by = $(msg).attr('by');
            if (by !== self.connection.jid)
                self.onCallCanceled.call(self.eventHandler, {
                    peer: from,
                    reason: 'handled-elsewhere',
                    by: by,
                    accepted:($(msg).attr('accepted')==='1'),
                    isDataCall: !!files,
                    sid: sid
                });
        }, null, 'message', 'megaNotifyCallHandled', null, from, {matchBare:true});

    // Add a 'cancel' handler that will invalidate the call request if the caller sends a cancel message
        cancelHandler = self.connection.addHandler(function(msg) {
            var sidAttr = $(msg).attr('sid');
            if (sidAttr !== sid) {
                if (!sidAttr)
                    console.warn("Received megaCallCancel without a sid attribute, ignoring");
                return true;
            }
            if (!elsewhereHandler)
                return;
            cancelHandler = null;
            self.connection.deleteHandler(elsewhereHandler);
            elsewhereHandler = null;

            if (self.cancelAutoAnswerEntry(sid, 'peer-'+($(msg).attr('reason')||'canceled'),
                $(msg).attr('text'))) {//we may have already accepted the call
                return;
            }
            self.onCallCanceled.call(self.eventHandler, {
                peer: from,
                reason: 'peer-'+($(msg).attr('reason')||'canceled'),
                text: $(msg).attr('text'),
                isDataCall: !!files,
                sid: sid
            });
        }, null, 'message', 'megaCallCancel', null, from, {matchBare:true});

        setTimeout(function() {
            if (!cancelHandler) //cancel message was received and handler was removed
                return;
    // Call was not handled elsewhere, but may have been answered/rejected by us
            self.connection.deleteHandler(elsewhereHandler);
            elsewhereHandler = null;
            self.connection.deleteHandler(cancelHandler);
            cancelHandler = null;
            self.onCallCanceled.call(self.eventHandler, {
                  peer: from,
                  reason:'call-unanswered',
                  isDataCall:!!files,
                  sid: sid
            });
        }, self.callAnswerTimeout+10000);

//tsTillUser measures the time since the req was received till the user answers it
//After the timeout either the handlers will be removed (by the timer above) and the user
//will get onCallCanceled, or if the user answers at that moment, they will get
//a call-not-valid-anymore condition
        var tsTillUser = Date.now() + self.callAnswerTimeout+10000;
        var reqStillValid = function() {
            return ((tsTillUser > Date.now()) && (cancelHandler != null));
        };
        var strPeerMedia = $(callmsg).attr('media');
        if (!files && (typeof strPeerMedia !== 'string'))
            throw new Error("'media' attribute missing from call request stanza");
        var peerMedia = self.peerMediaToObj(strPeerMedia);

//initiate fetching crypto key from API, as early as possible (before user answers the call)
        var cryptoPms = jQuery.Deferred(function(deferred) {
            self.preloadCryptoKeyForJid(function() {
                deferred.resolve();
            }, bareJid);
        });

// Notify about incoming call
        self.onIncomingCallRequest.call(self.eventHandler, {
            peer:from,
            reqStillValid:reqStillValid,
            peerMedia: peerMedia,
            files: files,
            sid: sid
          },
          function(accept, obj) {
// If dialog was displayed for too long, the peer timed out waiting for response,
// or user was at another client and that other client answred.
// When the user returns at this client he may see the expired dialog asking to accept call,
// and will answer it, but we have to ignore it because it's no longer valid
            if (!reqStillValid()) // Call was cancelled, or request timed out and handler was removed
                return false;//the callback returning false signals to the calling user code that the call request is not valid anymore
            if (accept) {
                var ownFprMacKey = self.generateMacKey();
                var peerFprMacKey;
                try
                {
                    peerFprMacKey = self.decryptMessage($(callmsg).attr('fprmackey'));
                    if (!peerFprMacKey)
                        peerFprMacKey = self.generateMacKey();
                }
                catch(e) {
                    peerFprMacKey = self.generateMacKey();
                }

// tsTillJingle measures the time since we sent megaCallAnswer till we receive jingle-initiate
                var tsTillJingle = Date.now()+self.jingleAutoAcceptTimeout;
                var call = self.acceptCallsFrom[sid] = {
                    from: from,
                    tsReceived: tsReceived,
                    tsTill: tsTillJingle,
                    options: obj.options, //contains localStream
                    peerFprMacKey: peerFprMacKey,
                    ownFprMacKey: ownFprMacKey,
                    peerAnonId: peerAnonId,
                    peerMedia: files?undefined:peerMedia
                };
                if (files) {
                    call.files = files;
                    call.fileTransferHandler = self.ftManager.createDownloadHandler(sid, from, files);
                }
                function abortCall(reason, text) {
                    var call = self.acceptCallsFrom[sid];
                    if (!call || (call.tsTill !== tsTillJingle)) {
                        return; //entry was removed or updated by a new call request
                    }
                    //we dont care anymore about that call, so remove all handlers, as we have already signalled a timeout
                    if (cancelHandler) {
                        self.connection.deleteHandler(cancelHandler);
                        cancelHandler = null;
                    }
                    if (elsewhereHandler) {
                        self.connection.deleteHandler(elsewhereHandler);
                        elsewhereHandler = null;
                    }
                    self.cancelAutoAnswerEntry(sid, reason, text);
                };
//add the api timeout timer here and not immediately after initiating the api request because
//it is critical only after the user has answered the call, i.e. we can have some more 'uncounted'
//time before that
                setTimeout(function() {
                    if(cryptoPms.state !== 'pending')
                        return;
                    cryptoPms.reject('timeout');
                }, self.apiTimeout);

                cryptoPms.then(function() {
                    self.connection.send($msg({
                        sid: sid,
                        to: from,
                        type: 'megaCallAnswer',
                        fprmackey: self.encryptMessageForJid(ownFprMacKey, bareJid),
                        anonid: self.rtcSession.ownAnonId
                    }));
                    setTimeout(function() {
                        abortCall('initiate-timeout', 'Timed out waiting for caller to start call');
                    }, self.jingleAutoAcceptTimeout);
                })
                .fail(function(err) {
                    if (err === 'timeout') {
                        abortCall('api-timeout', 'Timed out waiting for API to return crypto key');
                    } else {
                        abortCall('api-error', 'API error fetching the crypto key');
                    }
                });
            } else { //accept == false
                var msg = $msg({sid: sid, to: from, type: 'megaCallDecline', reason: obj.reason?obj.reason:'unknown'});
                if (obj.text)
                    msg.c('body').t(obj.text);
                self.connection.send(msg);
            }
            return true;
        });
      } catch(e) {
            self.onInternalError('Exception in onIncomingCallRequest handler', {sid: sid, e: e});
      }
      return true;
    },
    cancelAutoAnswerEntry: function(aid, reason, text, errInfo) {
        var item = this.acceptCallsFrom[aid];
        if (!item)
            return false;
        if (item.fileTransferHandler) {
            item.fileTransferHandler.remove(reason, text);
            delete this.acceptCallsFrom[aid];
        } else {
            delete this.acceptCallsFrom[aid];
            this.onCallTerminated.call(this.eventHandler, {
                fake: true,
                sid: aid,
                peerjid: item.from,
                isInitiator: false,
                peerAnonId: item.peerAnonId,
                localStream: item.options.localStream,
                callOptions: item.options
            }, reason, text, errInfo);
        }
        return true;
    },
    cancelAllAutoAnswerEntries: function(reason, text, errInfo) {
        for (var aid in this.acceptCallsFrom)
            this.cancelAutoAnswerEntry(aid, reason, text, errInfo);
        this.acceptCallsFrom = {};
    },
    purgeOldAcceptCalls: function() {
        var self = this;
        var now = Date.now();
        for (var aid in self.acceptCallsFrom) {
            var call = self.acceptCallsFrom[aid];
            if (call.tsTill < now)
                this.cancelAutoAnswerEntry(aid, 'initiate-timeout', 'Timed out waiting for caller to start call');
        }
    },
    cancelCallRequest: function(sid, reason, msg, errInfo) {
        var req = this.callRequests[sid];
        if (!req) {
            return false;
        }
        req.cancel('call-ended', reason, msg, errInfo);
        return true;
    },
    processAndDeleteInputQueue: function(sess) {
        var queue = sess.inputQueue;
        delete sess.inputQueue;
        for (var i=0; i<queue.length; i++)
            this.onJingle(queue[i]);
    },
    initiate: function (sid, peerjid, myjid, sessStream, mutedState, sessProps) { // initiate a new jinglesession to peerjid
        delete this.callRequests[sid];
        var sess = this.createSession(myjid, peerjid, sid, sessStream, mutedState, sessProps);
        // configure session
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;

        sess.initiate(true);
        sess.sendOffer(function() {sess.sendMutedState()});
        return sess;
    },
    createSession: function(me, peerjid, sid, sessStream, mutedState, sessProps) {
        var sess = new JingleSession(me, peerjid, sid, this.connection, sessStream, mutedState);
        this.sessions[sess.sid] = sess;
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
        this.cancelAllAutoAnswerEntries(reason, text);
        for (sid in this.sessions)
            this.terminate(this.sessions[sid], reason, text, nosend);
    },
    terminateBySid: function(sid, reason, text, nosend)
    {
        return this.terminate(this.sessions[sid], reason, text, nosend);
    },
    terminate: function(sess, reason, text, nosend, errInfo)
    {
        if ((!sess) || (!this.sessions[sess.sid])) {
            console.warn("Unknown session:", sess.sid)
            return false;
        }
        if (sess.state != 'ended')
        {
            if (!nosend)
            {
                // Wait for ack before actually terminating, as we may end up
                // terminating webrtc before the peer has received the hangup
                // signalling, which would lead the peer client think it's
                // a network error
                var terminated = false;
                setTimeout(function() {
                   if (!terminated) {
                       sess.terminate();
                       terminated = true;
                   }
                }, 2000);
                sess.sendTerminate(reason||'term', text, function() {
                    if (terminated) {
                        return;
                    }
                    sess.terminate();
                    terminated = true;
                });
            }
        }
        delete this.sessions[sess.sid];
        if (sess.fileTransferHandler) {
            sess.fileTransferHandler.remove(reason, text);
        } else {
            try {
                this.onCallTerminated.call(this.eventHandler, sess, reason||'term', text, errInfo);
            } catch(e) {
                console.error('Jingle.onCallTerminated() threw an exception:', e.stack);
            }
        }
        return true;
    },
    sendTerminateNoSession: function(sid, to, reason, text) {
        var term = $iq({to: to, type: 'set'});
        term
          .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-terminate',
            sid: sid})
          .c('reason')
          .c(reason);
        if (text)
            term.up().c('text').t(text);
        this.connection.sendIQ(term);
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
    peerMediaToObj: function(peerMediaStr) {
        if ((peerMediaStr === null) || (peerMediaStr === undefined)) {
            return null;
        }
        var res = {};
        if (peerMediaStr.indexOf('a') > -1)
            res.audio = true;
        if (peerMediaStr.indexOf('v') > -1)
            res.video = true;
        return res;
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

if (RTC) {
    Strophe.addConnectionPlugin('jingle', JinglePlugin);
}
