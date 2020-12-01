(function(scope) {
"use strict";
// jscs:disable disallowImplicitTypeConversion
// jscs:disable validateIndentation
// jscs:disable disallowEmptyBlocks

// jshint -W116
// We often enumerate our own objects, created by 'obj = {}', so no inherited properties
// jshint -W089
// jshint -W004
// jshint -W098
// jshint -W074
// jshint -W073
/* eslint no-eq-null: "off" */

var CallDataType = Object.freeze({
    kNotRinging: 0,
    kRinging: 1,
    kTerminated: 2,
    kSession: 3,
    kMute: 4,
    kSessionKeepRinging: 5,
    kCallReconnect: 6
});

// Client capability flags, exchanged via JOIN and SESSION
var Caps = Object.freeze({
    kSupportsStreamReneg: 0x4
});

// Bits in the flags field of CALLDATA
// (the field was previously used only for av flags, but now contains other bitflags as well)
var CallDataFlag = Object.freeze({
    // bit 0 and 1 are av flags
    kRinging: 4
});

function RtcModule(chatd, crypto, handler, allIceServers, iceServers) {
    if (!RTC) {
        throw new RtcModule.NotSupportedError(
            "Attempted to create RtcModule, but there is no webRTC support in this browser"
        );
    }
    if (!RtcModule.cfg) {
        RtcModule.setupCfg();
    }
    var self = this;
    self.setupLogger();
    self.chatd = chatd;
    self.crypto = crypto;
    self.ownAnonId = base64urldecode(u_handle); // crypto.ownAnonId();
    self.handler = handler;
    self.calls = {};
    self._rejectedCallIds = {};
    self.allIceServers = allIceServers;
    self.iceServers = iceServers ? iceServers : allIceServers;
    self.pcConstraints = {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true
    };
    self.callRecoveries = {};
    self._ownNetworkQuality = null;
    chatd.on('onClose', function(event, data) {
        self.onDisconnect(data.shard);
    });
 // chatd.on('onMembersUpdated', function(e, data) {});
    chatd.setRtcHandler(self);
}

RtcModule.NotSupportedError = function(message) {
    this.message = message;
    // Use V8's native method if available, otherwise fallback
    if ("captureStackTrace" in Error) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        this.stack = (new Error()).stack;
    }
};
RtcModule.NotSupportedError.prototype = Object.create(Error.prototype);
RtcModule.NotSupportedError.prototype.name = "NotSupportedError";
RtcModule.NotSupportedError.prototype.constructor = RtcModule.NotSupportedError;

// timeouts
RtcModule.kApiTimeout = 20000;
RtcModule.kCallAnswerTimeout = 40000;
RtcModule.kRingOutTimeout = 30000;
RtcModule.kIncallPingInterval = 4000;
RtcModule.kMediaGetTimeout = 20000000;
RtcModule.kSessSetupTimeout = 25000;
RtcModule.kCallSetupTimeout = 35000;
RtcModule.kJoinTimeout = 25000;
RtcModule.kCallRecoveryTimeout = 30000;
RtcModule.kStreamRenegTimeout = 10000;
// If sess setup times out and the time elapsed since the SDP handshake completed
// till the timeout is more than this, then fail the session with kErrIceTimeout
RtcModule.kIceTimeout = 18000;
RtcModule.kMediaConnRecoveryTimeout = 15000;

RtcModule.kMaxCallReceivers = 20;
RtcModule.kMaxCallAudioSenders = RtcModule.kMaxCallReceivers;
RtcModule.kMaxCallVideoSenders = 6;
RtcModule.kMicInputDetectTimeout = 10000;
RtcModule.kSessTermAckTimeout = 1000;
RtcModule.kSessRetryDelay = 0;

// Local storage settings cache
RtcModule.setupCfg = function() {
    var keys = ["forceRelay", "maxBr", "maxGroupBr", "showStats", "tearSessOnMediaDisconn"];
    var cache = {};
    var cfg = RtcModule.cfg = {};
    keys.forEach(function(k) {
        Object.defineProperty(cfg, k, {
            get: function() {
                if (!cache.hasOwnProperty(k)) {
                    cache[k] = localStorage["rtc:" + k]; // cache first if available
                }
                return cache[k];
            },
            set: function(val) {
                if (val == null) {
                    delete cache[k];
                    localStorage.removeItem("rtc:" + k);
                    console.warn("Deleted config value '" + k + "' from localStorage");
                }
                else {
                    cache[k] = val;
                    localStorage["rtc:" + k] = val;
                    console.warn("Saved config value '" + k + "' to localStorage");
                }
            },
            configurable: false
        });
    });
};

RtcModule.prototype.logToServer = function(type, data) {
    if (typeof data !== 'object') {
        data = { data: data };
    }
    data.client = RTC.browser;
    data = JSON.stringify(data);

    var wait = 1000;
    var retryNo = 0;
    var self = this;
    var url = "https://stats.karere.mega.nz:1380/msglog?aid=" + base64urlencode(self.ownAnonId) + "&t=" + type;

    (function req() {
        M.xhr(url, data).catch(function() {
            if (++retryNo < 4) {
                setTimeout(req, wait *= 2);
            }
        });
    })();
};

RtcModule.prototype.setupLogger = function() {
    var self = this;
    self._loggerOpts = {
        minLogLevel: function() {
            return MegaLogger.LEVELS.DEBUG;
        },
        transport: function(level, args) {
            if (level === MegaLogger.LEVELS.ERROR || level === MegaLogger.LEVELS.CRITICAL) {
                console.error.apply(console, args);
                self.logToServer('e', args.join(' '));
                return;
            }
            var fn;
            if (level === MegaLogger.LEVELS.DEBUG) {
                fn = "debug";
            }
            else if (level === MegaLogger.LEVELS.LOG) {
                fn = "log";
            }
            else if (level === MegaLogger.LEVELS.INFO) {
                fn = "info";
            }
            else if (level === MegaLogger.LEVELS.WARN) {
                fn = "warn";
            } else {
                fn = "log";
            }
            console[fn].apply(console, args);
        }
    };
    self.logger = new MegaLogger('webrtc', self._loggerOpts);
};

RtcModule.prototype.onDisconnect = function(shard) {
    // notify all relevant calls
    var chats = this.chatd.chatIdMessages;
    for (var chatid in shard.chatIds) {
        var call = this.calls[chatid];
        if (call && call.state < CallState.kTerminating) {
            call._destroy(Term.kErrNetSignalling, false);
        }
        // we went offline - notify all as if all others left the call
        var chat = chats[chatid];
        assert(chat);
        assert(chat.callInfo.participantCount() === 0);
        this._fire('onClientLeftCall', chatid, null, null);
    }
};

RtcModule.prototype.updateIceServers = function(arrIceServers) {
    this.iceServers = arrIceServers;
};

RtcModule.prototype.handleMessage = function(shard, msg, len) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (type.1 data.(len-1))
    //              ^                                          ^
    //          header.hdrlen                             payload.len
    var self = this;
    try {
        var strLen = msg.length;
        if (len < 24 || strLen < len) {
            this.logger.error("Short rtMessage packet, ignoring");
            return;
        }
        var type = msg.charCodeAt(23);
        var op = msg.charCodeAt(0);
        var chatid = msg.substr(1, 8);
        var chat = this.chatd.chatIdMessages[chatid];
        if (!chat) {
            this.logger.error(
                "Received " + constStateToText(RTCMD, type) + " for unknown chatid " + chatid + ". Ignoring"
            );
            return;
        }
        // get userid and clientid
        var userid = msg.substr(9, 8);
        var clientid = msg.substr(17, 4);
        // leave only the payload, we don't need the headers anymore
        var packet = {
            type: type,
            chatid: chatid,
            fromUser: userid,
            fromClient: clientid,
            shard: shard,
            data: msg.substr(24, len - 24) // actual length of msg string may be more than len,
        };                               // if there are other commands appended

        var call = this.calls[chatid];
        if (!call) {
            this.logger.log("Ignoring a " + constStateToText(RTCMD, type) + " for a call we don't participate in");
            return;
        }
        call.handleMsg(packet);
    }
    catch (e) {
        this.logger.error("rtMsgHandler: exception:", e);
    }
};

RtcModule.prototype.handleCallData = function(shard, msg, payloadLen) {
    // (Chatd.OPCODE.CALLDATA chatid.8 userid.8 clientid.4 len.2) (payload.len)
    // payloadLen is the length of the 'user' data of the CALLDATA
    var self = this;
    try {
        if (payloadLen < 10) {
            self.logger.error("Ignoring short kRinging CALLDATA packet");
            return;
        }

        var chatid = msg.substr(1, 8);
        var chat = self.chatd.chatIdMessages[chatid];
        if (!chat) {
            self.logger.warn("Received CALLDATA for unknown chatid " + base64urlencode(chatid) + ". Ignoring");
            return;
        }
        // If there is an active call in a chatroom when we connect to the shard but have not JOIN-ed the chatroom yet,
        // chatd sends CALLDATAs and INCALLs out of the blue in order to allow for a call quick answer.
        // However, we don't support this, so we have to check for that condition and ignore the CALLDATAs
        if (chat.loginState() < Chatd.LoginState.JOIN_RECEIVED) { // login not started
            self.logger.log("Ingoring prelimiary CALLDATA received on chat " + base64urlencode(chatid) +
                " before we have joined it");
            return;
        }

        // get userid and clientid
        var userid = msg.substr(9, 8);
        var clientid = msg.substr(17, 4);
        if (userid === self.chatd.userId && clientid === shard.clientId) {
            self.logger.error("Ignoring CALLDATA sent back to sender"); // this should not happen, but just in case
            return;
        }
        // Actual length of msg string may be more than len, if there are other commands appended
        var data = msg.substr(23, payloadLen);
        var type = msg.charCodeAt(31);
        var flags = data.charCodeAt(9);
        var ringing = !!(flags & CallDataFlag.kRinging);

        // compatibility
        if (type === CallDataType.kRinging || type === CallDataType.kSessionKeepRinging) {
            ringing = true;
        }
        // ====
        var parsedCallData = {
            chatid: chatid,
            fromUser: userid,
            fromClient: clientid,
            shard: shard,
            callid: data.substr(0, 8),
            type: type,
            av: flags & Av.Mask,
            ringing: ringing,
            data: data
        };

        this.crypto.preloadCryptoForPeer(userid);

        var call = self.calls[parsedCallData.chatid];
        if (call) {
            if (parsedCallData.callid !== call.id) {
                if ((call.state === CallState.kCallingOut || call.state === CallState.kReqSent) && ringing) {
                    // Incoming while outgoing call request
                    self._updatePeerAvState(parsedCallData);
                    self.handleCallRequest(parsedCallData); // decides which call to honor
                }
                else if ((call.state === CallState.kRingIn) && (userid === self.chatd.userId) && ringing) {
                    self.logger.warn("Our user sent a call request while we already have an incoming one." +
                        "Possibly buggy client sent call request without checking if there is already a call." +
                        "Nevertheless, destroying the previous incoming call");
                    call._destroy(Term.kCallRejected);
                }
                else {
                    self.logger.error("Ignoring CALLDATA because its callid is different " +
                        "than the call that we have in that chatroom");
                }
                return;
            } else { // callid-s are equal
                parsedCallData.call = call;
            }
        }

        self._updatePeerAvState(parsedCallData);

        switch (type) {
            case CallDataType.kTerminated:
                // we don't need to handle that, it's mostly for the server
                return;
            case CallDataType.kSession:
            case CallDataType.kSessionKeepRinging:
                if (chat.tsCallStart == null) {
                    // Received in realtime. If it was during a CALLDATA dump, CALLTIME
                    // is always received before any CALLDATA
                    chat.tsCallStart = Date.now();
                }
                break;
        }

        if (call) {
            var ci = call.callerInfo;
            if (call.state === CallState.kRingIn && !ringing &&
                ci.fromUser === parsedCallData.fromUser &&
                ci.fromClient === parsedCallData.fromClient) { // sender is the caller, stop ringing
                    if (!call.isGroup) {
                        self.logger.error(
                            "Received not-terminate CALLDATA with ringing flag off, " +
                            "for a 1on1 call in kRingIn state. The call should have " +
                            "already been taken out of this state by a RTMSG"
                        );
                    }
                    call._destroy(Term.kAnswerTimeout, false);
                    return;
            }
        } else { // no call
            if (ringing) {
                if (self._rejectedCallIds[parsedCallData.callid]) {
                    self.logger.log("Ignoring ring flag in received CALLDATA since we have already rejected that call");
                    return;
                }
                self.handleCallRequest(parsedCallData);
                return;
            }
        }
    } catch(e) {
        self.logger.error("handleCallData: Exception:", e);
    }
};

RtcModule.prototype.onKickedFromChatroom = function(chat) {
    var chatid = chat.chatId;
    this.logger.warn("We have been removed from chatroom " + base64urlencode(chatid));
    assert(chat.callInfo.participantCount() === 0);
    var call = this.calls[chatid];
    if (call) {
        call.hangup(Term.kErrKickedFromChat);
    }
    this._fire('onClientLeftCall', chatid, null, null);
};

RtcModule.prototype.putAllActiveCallsOnHold = function() {
    var calls =  this.calls;
    for (var chatid in calls) {
        var call = calls[chatid];
        if (call.isActive()) {
            call.putOnHold();
        }
    }
};

// There can only be one actve call at any moment
RtcModule.prototype.hasActiveCall = function() {
    var calls = this.calls;
    for (var chatid in calls) {
        if (calls[chatid].isActive()) {
            return true;
        }
    }
    return false;
};

RtcModule.prototype._updatePeerAvState = function(parsedCallData, peerIsUs) {
    var chatid = parsedCallData.chatid;
    var call = parsedCallData.call;
    var chat;
    if (call) {
        chat = call.chat;
     } else {
         chat = this.chatd.chatIdMessages[chatid];
         if (!chat) {
             this.logger.error("Received CALLDATA for unknown chatid");
             return;
         }
    }

    var roomCallInfo = chat.callInfo;
    if (!roomCallInfo.callId) { // no call info
        if (parsedCallData.type === CallDataType.kTerminated) {
            // no call and someone is leaving, ignore. This happens when we get disconnected and subsequently
            // destroy the call. At that point, roomCallInfo is cleared, and we send a Terminated CALLDATA
            // In that situation, we don't want to re-create the call and register our leaving status
            return;
        }
        roomCallInfo.callId = parsedCallData.callid;
    }

    var userid = parsedCallData.fromUser;
    var clientid = parsedCallData.fromClient;
    assert(clientid);
    var av = parsedCallData.av;
    var peerid = userid + clientid;
    var peerAvs = roomCallInfo.participants;
    var oldAv = peerAvs[peerid];
    if (av !== oldAv) {
        peerAvs[peerid] = av;
        this._fire('onClientAvChange', chatid, userid, clientid, av); // fired even when we are not in the call
    }
    if (call && !peerIsUs) {
        call._onRemoteMuteUnmute(userid, clientid, av); // fired only when we are in the call
    }
};

Call.prototype._onRemoteMuteUnmute = function(userid, clientid, av) {
    var sessions = this.sessions;
    for (var sid in sessions) {
        var sess = sessions[sid];
        if (sess.peer === userid && sess.peerClient === clientid) {
            sess._onRemoteMuteUnmute(av);
        }
    }
};

Call.prototype.localStream = function() {
    return this.gLocalStream;
};

Call.prototype.hasFreeSenderSlots = function() {
    return this.chat.callInfo.hasFreeSenderSlots();
};

RtcModule.prototype.handleCallRequest = function(parsedCallData) {
    var self = this;
    parsedCallData.callid = parsedCallData.data.substr(0, 8);
    assert(parsedCallData.callid);
    var chatid = parsedCallData.chatid;

    var thisUser = self.chatd.userId;
    if (parsedCallData.fromUser === thisUser) {
        self.logger.log("Ignoring call request from another client of our user");
        return;
    }
    var chat = self.chatd.chatIdMessages[parsedCallData.chatid];
    if (!chat) {
        self.logger.error("Call request for an unknown chatid");
        return;
    }
    var clientid = parsedCallData.shard.clientId;
    var parts = chat.callInfo.participants;
    for (var k in parts) {
        if (k.substr(0, 8) === thisUser) {
            if (k.substr(8) !== clientid) {
                self.logger.log("Ignoring call request: We are already in the call from another client");
                return;
            } else {
                // We appear to already be in the call from our own client. This can happen only
                // if we are simultaneously calling each other with a peer. In this case, we must
                // have an existing outgoing call
                var call = self.calls[parsedCallData.chatid];
                assert(call && call.isCallerOrJoiner);
            }
        }
    }
    function createNewCall(replacesCall) {
        var call = new Call(self, parsedCallData, self.handler.isGroupChat(chatid), CallRole.kAnswerer);
        assert(call.callerInfo);
        assert(call.state === CallState.kRingIn);
        self.calls[chatid] = call;
        if (replacesCall) {
            call.handler = self._fire("onCallIncoming", call, parsedCallData.fromUser,
                replacesCall, replacesCall._startOrJoinAv);
            assert(call.handler);
            call.answer(replacesCall._startOrJoinAv);
        }
        else {
            call.handler = self._fire("onCallIncoming", call, parsedCallData.fromUser);
            assert(call.handler);
        }
        return call;
    }
    function sendBusy(sendErrAlready) {
        // Broadcast instead of send only to requestor, so that all other our clients know we rejected the call
        self.cmdBroadcast(RTCMD.CALL_REQ_DECLINE, parsedCallData.chatid,
            parsedCallData.callid + String.fromCharCode(sendErrAlready ? Term.kErrAlready : Term.kBusy));
    }

    // Check if we have an existing call.
    // If it is an outgoing call request in the same 1on1 chatroom, then both parties are calling
    // each other at the same time - take care to establish the call
    // Otherwise - if the existing call is in the same chatroom - send kErrAlready, otherwise send kBusy
    var existingCall = self.calls[chatid];
    if (existingCall) {
        // Both calls are in same chatroom
        if (existingCall.isGroup) {
            self.logger.log("Incoming call while having a call in same group chat room, sending kErrAlready");
            sendBusy(true);
            return;
        }
        // Both calls are in same 1on1 chatroom
        if (existingCall.state >= CallState.kJoining) {
            // call in progress
            self.logger.warn("Incoming call request in 1on1 chatroom with user with whom we have " +
                "a call in progress, sending busy");
            sendBusy(true);
            return;
        }
        // call req/response stage
        // Concurrent call requests to each other?
        if (!existingCall.isCallerOrJoiner) {
            // No, just two incoming calls from different clients in same 1on1 room
            self.logger.warn("Another incoming call during an incoming call, sending kErrAlready");
            sendBusy(true);
            return;
        }
        // existingCall is outgoing
        // Concurrent call requests to each other in a 1on1 room
        // If our user handle is greater than the calldata sender's, our outgoing call
        // survives, and their call request is declined. Otherwise, our existing outgoing
        // call is hung up, and theirs is answered
        if (self.chatd.userId < self.handler.get1on1RoomPeer(chatid)) {
            self.logger.warn("Simultaneously calling each other with peer - we don't have priority.",
                "Hanging up our outgoing call and answering the incoming");
            // answer() of the newly created call destroys all other calls in the .calls map,
            // but in this case we are overwriting the existingCall with the new call (same chatid),
            // so we must take care ourselves of the previous call
            // If we don't delete existingCall.incallPingTimer, existingCall._destroy() will send an ENDCALL,
            // server will reply with an ENDCALL, which will terminate the other (surviving) call
            clearInterval(existingCall._inCallPingTimer);
            delete existingCall._inCallPingTimer;
            existingCall._destroy(Term.kCancelOutAnswerIn, false)
            .then(function() {
                // Create an incoming call from the packet, and auto answer it
                createNewCall(existingCall);
            });
        }
        else {
            self.logger.warn("Simultaneously calling each other with peer - we have priority.",
                "Ignoring incoming call request, peer should abort it and answer ours");
        }
        return;
    }
    // Create incoming call
    var call = createNewCall();
// For privacy, we don't want the caller to know we are online
//  self.cmdEndpoint(RTCMD.CALL_RINGING, parsedCallData, parsedCallData.callid);
    setTimeout(function() {
        if (call.state !== CallState.kRingIn) {
            return;
        }
        call._destroy(Term.kAnswerTimeout, false);
    }, RtcModule.kCallAnswerTimeout+4000); // local timeout a bit longer that the caller
};

RtcModule.prototype.cmdEndpoint = function(type, info, payload) {
    assert(info.chatid);
    assert(info.fromUser);
    assert(info.fromClient);

    if (!info.shard.rtcmd(info.chatid, info.fromUser, info.fromClient, type, payload)) {
        throw new Error("cmdEndpoint: Send error trying to send command " + constStateToText(RTCMD, type));
    }
};

RtcModule.prototype.cmdBroadcast = function(op, chatid, payload) {
    assert(chatid);
    var shard = this.chatd.chatIdShard[chatid];
    if (!shard) {
        self.logger.error("cmdBroadcast: No shard for chatid", base64urlencode(chatid));
        return false;
    }
    if (!shard.rtcmd(chatid, null, null, op, payload)) {
        throw new Error("cmdEndpoint: Error broadcasting command " + constStateToText(RTCMD, op));
    }
    return true;
};

RtcModule.prototype._removeCall = function(call) {
    var chatid = call.chatid;
    var existing = this.calls[chatid];
    if (!existing) {
        this.logger.log("removeCall: Call already removed");
        return;
    }
    if (existing.id !== call.id || call !== existing) {
        this.logger.log("removeCall: Call has been replaced, not removing");
        return;
    }
    delete this.calls[chatid];
    if (Object.keys(this.calls).length === 0) {
        if (this._statsTimer) {
            clearInterval(this._statsTimer);
            delete this._statsTimer;
        }
    }
};

Call.prototype.onNoInputAudioDetected = function() {
    this.manager._fire("onNoInputAudioDetected");
};

Call.prototype._initialGetLocalStream = function(av) {
    var self = this;
    assert(!self._obtainingLocalStream);
    assert(!self.gLocalStream);

    var needVideo = !!(av & Av.Video);
    var needAudio = !!(av & Av.Audio);
    assert(needAudio || needVideo);

    self._obtainingLocalStream = true;
    var resolved = false; // track whether the promise was resolved for the timeout reject
    var notified = false;
    // If it takes too long, display in browser a hint that we are requesting permissions for camera/mic
    setTimeout(function() {
        if (!resolved) {
            self._fire('onLocalMediaRequest');
            notified = true;
        }
    }, 2000);

    var pms;
    var gumErrorDevices = 0;
    function addGumError(msg, what) {
        gumErrorDevices |= what;
        self.logger.warn(msg);
    }
    // We always get audio, and then mute it if we don't need it
    if (needVideo) {
        if (av & Av.Screen) {
            self._isCapturingScreen = true;
            // for screen sharing, we can't obtain audio & video at the same time, they come
            // from different APIs
            var pmsAudio = RTC.getUserMedia({audio: true})
            .catch(function(err) {
                addGumError("Error getting audio: " + err, Av.Audio);
                return null;
            });
            var pmsScreen = RTC.getDisplayMedia({
                video: {
                    cursor: 'never',
                    displaySurface: 'monitor'
                }
            })
            .catch(function(err) {
                addGumError("Error getting screen: " + err, Av.Screen);
                return null;
            });
            pms = Promise.all([pmsAudio, pmsScreen])
            .then(function(streams) {
                var audioStream = streams[0];
                var screenStream = streams[1];
                if (!audioStream) {
                    return screenStream;
                } else if (!screenStream) {
                    return audioStream;
                } else {
                    var audioTrack = audioStream.getAudioTracks()[0];
                    if (audioTrack) {
                        screenStream.addTrack(audioTrack);
                    }
                    var videoTrack = screenStream.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.onended = function() {
                            var call = self.manager.calls[self.chatid];
                            if (!call || call.id !== self.id) {
                                self.manager.logger.warn("Screen sharing track stop event: " +
                                    "There is a new call in the chatroom, but the old screen stream is still active");
                                return;
                            }
                            call._onScreenCaptureEndedByFloatButton();
                        };
                    }
                    return Promise.resolve(screenStream);
                }
            });
        } else {
            var vidOpts = (self.isGroup && !RTC.isFirefox) ? RTC.mediaConstraintsResolution("low") : true;
            var bothFailed = false;
            pms = RTC.getUserMedia({audio: true, video: vidOpts})
            .catch(function(error) {
                bothFailed = true;
                addGumError("Failed to get audio+video, trying audio-only...", Av.Audio | Av.Video);
                return RTC.getUserMedia({audio: true, video: false});
            })
            .catch(function(error) {
                addGumError("Failed to get audio-only, trying video-only...", Av.Audio);
                return RTC.getUserMedia({audio: false, video: vidOpts});
            })
            .catch(function(error) {
                addGumError("Failed to get video-only", Av.Video);
                return Promise.reject(error);
            })
            .then(function(stream) {
                if (bothFailed) {
                    var succeededAv = Av.fromStream(stream);
                    if (succeededAv) {
                        gumErrorDevices &= ~succeededAv;
                    }
                }
                return stream;
            });
        }
    } else { // need only audio
        pms = RTC.getUserMedia({audio: true, video: false})
        .catch(function(err) {
            addGumError("Failed to get audio-only", Av.Audio);
            return Promise.reject(err);
        });
    }

    return new Promise(function(resolve, reject) {
        pms.then(function(stream) {
            if (resolved) {
                RTC.stopMediaStream(stream);
                return;
            }
            resolved = true;
            if (self.state >= CallState.kTerminating) {
                RTC.stopMediaStream(stream);
                self.logger.log("_initialGetLocalStream: Call killed while getting local video");
                return;
            }
            if (!needAudio) {
                Av.enableAudio(stream, false);
            }
            if (gumErrorDevices) {
                self._fire("onLocalMediaFail", gumErrorDevices);
            }
            assert(!self.gLocalStream); // assure nobody set it meanwhile
            self.gLocalStream = stream;
            self._fire('onLocalMediaObtained', stream);
            delete self._obtainingLocalStream;
            resolve(stream);
        })
        .catch(function(err) { // silence DOMException logging
        });

        pms.catch(function(err) {
            resolved = true;
            reject(err);
        });
        setTimeout(function() {
            if (!resolved) {
                resolved = true;
                reject("timeout");
            }
        }, RtcModule.kMediaGetTimeout);
    })
    .catch(function(err) {
        self._fire('onLocalMediaFail', gumErrorDevices, err);
        delete self._obtainingLocalStream;
        return Promise.reject(err);
    });
};

Call.prototype._checkStartMicMonitor = function() {
    var self = this;
    if (self.manager.audioInputDetected) {
        return;
    }
    if (!self._audioMutedChecker) {
        self._audioMutedChecker = new AudioMutedChecker(self, RtcModule.kMicInputDetectTimeout);
    }
    if (self.localAv() & Av.Audio) {
        self._audioMutedChecker.start(self.gLocalStream);
    } // otherwise it should be started when user unmutes audio
};

Call.prototype._getLocalVideo = function(screenCapture) {
    var self = this;
    assert(!self.gLocalStream || !Av.streamHasVideo(self.gLocalStream));
    var resolved = false; // track whether the promise was resolved for the timeout reject
    var notified = false;
    // If it takes too long, display in browser a hint that we are requesting permissions for camera/mic
    setTimeout(function() {
        if (!resolved) {
            self._fire('onLocalMediaRequest');
            notified = true;
        }
    }, 2000);

    return new Promise(function(resolve, reject) {
        var pms;
        if (screenCapture) {
            pms = RTC.getDisplayMedia({
                video: {
                    cursor: 'never',
                    displaySurface: 'monitor'
                }
            });
        } else {
            var vidOpts = (self.isGroup && !RTC.isFirefox) ? RTC.mediaConstraintsResolution("low") : true;
            pms = RTC.getUserMedia({audio: false, video: vidOpts});
        }
        pms.then(function(stream) {
            if (resolved || self.state >= CallState.kTerminating) {
                RTC.stopMediaStream(stream);
                return;
            }
            resolved = true;
            var track = stream.getVideoTracks()[0];
            if (!track) {
                RTC.stopMediaStream(stream);
                return Promise.reject("Stream has no video track");
            }

            if (self.gLocalStream) {
                self.gLocalStream.addTrack(track);
            } else {
                self.gLocalStream = stream;
            }
            self._fire('onLocalMediaObtained');
            resolve(self.gLocalStream);
        })
        .catch(function(err) {
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });
        setTimeout(function() {
            if (!resolved) {
                resolved = true;
                reject("timeout");
            }
        }, RtcModule.kMediaGetTimeout);
    })
    .catch(function(err) {
        self._fire('onLocalMediaFail', Av.Video, err);
        return Promise.reject(err);
    });
};

RtcModule.prototype._startOrJoinCall = function(chatid, av, handler, isJoin, recovery) {
    var self = this;
    var isGroup = self.handler.isGroupChat(chatid);
    var shard = self.chatd.chatIdShard[chatid];
    if (!shard) {
        self.logger.error("startOrJoinCall: Unknown chatid " + base64urlencode(chatid));
        return null;
    }
    if (!shard.isOnline()) {
        self.logger.warn("startOrJoinCall: Chat shard is offline");
        return null;
    }
    if (!shard.clientId) {
        self.logger.warn("Refusing to start or join call: clientid not yet assigned by shard", shard.shard);
        return null;
    }
    var existing = self.calls[chatid];
    if (existing) {
        assert(!recovery);
        if (isGroup) {
            // Allow join on an incoming call besides the usual answer
            if (existing.state === CallState.kRingIn) {
                existing.answer(av);
                return existing;
            }
        } else {
            if (existing.state <= CallState.kCallInProgress) {
                self.logger.warn("There is already a call in this chatroom, not starting a new one");
                return null;
            }
        }
    } else {
        self.putAllActiveCallsOnHold();
    }
    var callid;
    var chat = self.chatd.chatIdMessages[chatid];
    assert(chat);
    var roomCallState = chat.callInfo;
    if (isJoin) {
        if (recovery) {
            callid = recovery.id;
        } else {
            if (roomCallState.callId) {
                callid = roomCallState.callId;
            } else {
                self.logger.error("Attempted to join a call, but there is no call in the rooom, aborting join");
                return null;
            }
        }
    } else { // starting new call
        assert(!recovery);
        if (roomCallState.callId) {
            self.logger.warn("Refusing to start a new call in a room where there is already a call " +
                "(in which we don't participate)");
            return null;
        }
        callid = self.crypto.random(8);
    }
    var call = new Call(
        self, {
            chatid: chatid,
            callid: callid,
            shard: shard
        }, isGroup, isJoin ? CallRole.kJoiner : CallRole.kCaller, handler);
    if (recovery) {
        call._configFromRecovery(recovery);
    }
    self.calls[chatid] = call;
    call._startOrJoin(av)
    .catch(function(err) {
        self.logger.log("Error starting/joining call:", err);
    });
    return call;
};

RtcModule.prototype.joinCall = function(chatid, av, handler) {
    var chat = this.chatd.chatIdMessages[chatid];
    assert(chat);
    var partCount = chat.callInfo.participantCount();
    if (partCount > RtcModule.kMaxCallReceivers) {
        this.logger.warn("Can't join call in room", base64urlencode(chatid),
            " - maximum number of video receivers already reached");
        return null;
    }
    // No need for audio receiver count check - the video receivers limit is stricter

    return this._startOrJoinCall(chatid, av, handler, true);
};

RtcModule.prototype.startCall = function(chatid, av, handler) {
    return this._startOrJoinCall(chatid, av, handler, false);
};

RtcModule.prototype.onClientLeftCall = function(chat, userid, clientid) {
    if (this._loggedOut) {
        return;
    }
    var chatid = chat.chatId;
    this._fire('onClientAvChange', chatid, userid, clientid, 0);
    if (chat.callInfo.participantCount() === 0) {
        this.logger.log("Notifying about last client leaving call");
    }
    this._fire('onClientLeftCall', chatid, userid, clientid);
    var call = this.calls[chatid];
    if (call) {
        call._onClientLeftCall(userid, clientid);
    }
};

RtcModule.prototype.onClientJoinedCall = function(chat, userid, clientid) {
    var chatid = chat.chatId;
    var call = this.calls[chatid];
    this._fire('onClientJoinedCall', chat.chatId, userid, clientid);
};

RtcModule.prototype.onShutdown = function() {
    this.logger.warn("Shutting down....");
    this.abortAllCallRecoveries(); // cancel all pending call recoveries, if any
    var calls = this.calls;
    for (var chatid in calls) {
        var call = calls[chatid];
        if (call.state === CallState.kRingIn) {
            assert(call.hasNoSessions());
        }
        // In kRingIn state, we should destroy passively, i.e. not reject the call
        // This happens by itself since the calls has no sessions, so we don't send out anything,
        // but just in case, we set the weTerminate param to false in this case
        call._destroy(Term.kAppTerminating, call.state !== CallState.kRingIn);
    }
    this.logger.warn("Shutdown complete");
};

RtcModule.prototype.onChatOnline = function(chat) {
    var chatid = chat.chatId;
    var recovery = this.callRecoveries[chatid];
    if (!recovery) {
        return;
    }
    // we have a call to recover on this chatid. Just in case, normally should not happen as we just went online
    if (this.calls[chatid]) {
        this.logger.log("We reconnected, but there is already another call, aborting recovery...");
        recovery.abort(Term.kErrAlready);
        return;
    }
    this.logger.warn("Recovering call " + base64urlencode(recovery.callid) + " on chat " + base64urlencode(chatid) +
        "(" + chat.callInfo.participantCount() + " peers in the call)");
    this._startOrJoinCall(chatid, recovery.av, recovery.callHandler, true, recovery);
};

RtcModule.prototype._startStatsTimer = function() {
    var self = this;
    if (self._statsTimer) {
        return;
    }
    self._statsTimer = setInterval(function() {
        for (var cid in self.calls) {
            var call = self.calls[cid];
            for (var sid in call.sessions) {
                var sess = call.sessions[sid];
                if (sess.statRecorder) {
                    sess.statRecorder.pollStats();
                }
            }
        }
    }, 1000);
};

RtcModule.prototype._scanSessionsUpdateOwnNetworkQuality = function() {
    var self = this;
    var qMax = -1;
    for (var cid in self.calls) {
        var call = self.calls[cid];
        for (var sid in call.sessions) {
            var sess = call.sessions[sid];
            var q = sess._networkQuality;
            if (q > qMax) {
                qMax = q;
            }
        }
    }
    if (qMax === self._ownNetworkQuality) {
        return;
    }
    self._updateOwnNetworkQuality(qMax);
};

RtcModule.prototype._updateOwnNetworkQuality = function(q) {
    var self = this;
    assert(self._ownNetworkQuality !== q);
    self._ownNetworkQuality = q;
    self._fire('onOwnNetworkQualityChange', q);
};

RtcModule.prototype.ownNetworkQuality = function() {
    return this._ownNetworkQuality;
};

RtcModule.prototype._notifySessionNetQualityChange = function(q) {
    if (q > this._ownNetworkQuality) {
        this._updateOwnNetworkQuality(q);
    } else {
        this._scanSessionsUpdateOwnNetworkQuality();
    }
};

RtcModule.prototype._fire = function(evName) {
    return fireEvent(this.handler, this.logger, arguments);
};

RtcModule.prototype.logout = function() {
    this._loggedOut = true;
};

RtcModule.prototype.callLocalStream = function(chatid) {
    var call = this.calls[chatid];
    if (call) {
        return call.gLocalStream;
    } else {
        var recovery = this.callRecoveries[chatid];
        return recovery ? recovery.localStream : null;
    }
};

RtcModule.gumErrorToString = function(error) {
    if (typeof error === 'string') {
        return error;
    } else if (error.name) {
        return error.name;
    } else if (error.code) {
        return error.code;
    } else {
        return error;
    }
};

function Call(rtcModule, info, isGroup, role, handler) {
    this.manager = rtcModule;
    this.chatid = info.chatid;
    this.chat = rtcModule.chatd.chatIdMessages[this.chatid];
    assert(this.chat);
    this.id = info.callid;
    this.shard = info.shard;
    this.isGroup = isGroup;
    this.logger = MegaLogger.getLogger("call[" + base64urlencode(this.id) + "]",
        rtcModule._loggerOpts, rtcModule.logger);
    this.role = role;
    // An answerer is a joiner
    this.isJoiner = (role === CallRole.kJoiner || role === CallRole.kAnswerer);
    this.sessions = {};
    this.sessRetries = {};
    this._sentSessions = {};
    this.iceFails = {};
    if (role === CallRole.kAnswerer) {
        this.state = CallState.kRingIn;
        this.callerInfo = info; // callerInfo is actually CALLDATA, needed for answering
    } else {
        this.isCallerOrJoiner = true;
        this.state = (role === CallRole.kJoiner) ? CallState.kJoining : CallState.kCallingOut;
    }
    this.handler = (handler instanceof Function) ? handler(this) : handler;
    this.manager._startStatsTimer();
}

Call.prototype.handleMsg = function(packet) {
    var self = this;
    var type = packet.type;
    switch (type)
    {
        case RTCMD.SESSION:
            self.msgSession(packet);
            return;
        case RTCMD.JOIN:
            self.msgJoin(packet);
            return;
        case RTCMD.SDP_OFFER:
            self.msgSdpOffer(packet);
            return;
        case RTCMD.CALL_RINGING:
            self.msgRinging(packet);
            return;
        case RTCMD.CALL_REQ_DECLINE:
            self.msgCallReqDecline(packet);
            return;
        case RTCMD.CALL_REQ_CANCEL:
            self.msgCallReqCancel(packet);
            return;
        case RTCMD.CALL_TERMINATE: // ignore legacy command
            self.logger.log("Ignoring legacy RTCMD.CALL_TERMINATE");
            return;
    }
    var data = packet.data;
    assert(data.length >= 8); // must start with sid.8
    var sid = data.substr(0, 8);
    var sess = self.sessions[sid];
    if (sess) {
        sess.handleMsg(packet);
    } else {
        if (type === RTCMD.SESS_TERMINATE) {
            var reason = data.charCodeAt(8);
            if (reason === Term.kErrPeerOffline) {
                // kErrPeerOffline is generated only internally, prevent a malicious peer
                // from messing up our logic
                self.logger.warn("Peer sent SESS_TERMINATE with invalid reason kPeerOffline, " +
                    "setting reason to kAppTerminating");
                reason = Term.kAppTerminating;
            }
            if (!isTermRetriable(reason)) {
                if (self._deleteRetry(packet.fromUser + packet.fromClient, reason)) {
                    // Peer terminates on purpose, but we have scheduled a retry.
                    // Cancel the retry and maybe terminate the call
                    self.logger.log("Peer terminates session willingfully,",
                        "but we have scheduled a retry because of error. Aborted the retry");
                }
            }
        } else {
            self.logger.warn("Received " + constStateToText(RTCMD, type) +
                " for an existing call but non-existing session",
                base64urlencode(sid), "(" + Chatd.dumpToHex(sid) + ")");
            // this.logger.warn("sessions:", Chatd.dumpToHex(Object.keys(this.sessions)[0]));
        }
        return;
    }
};

Call.prototype._setState = function(newState) {
    var oldState = this.state;

    if (oldState === newState) {
        return false;
    }

    assertStateChange(
        oldState,
        newState,
        CallStateAllowedStateTransitions,
        CallState
    );

    this.state = newState;

    if (d) { /* performance, save some loops/closures creation CPU/memory */
        this.logger.log(
            "State changed: ",
            constStateToText(CallState, oldState),
            ' -> ',
            constStateToText(CallState, newState)
        );
    }
    this._fire('onStateChange', this.state);
};

Call.prototype.msgCallReqDecline = function(packet) {
    // callid.8 termcode.1
    var self = this;
    assert(packet.data.length >= 9);
    var callid = packet.data.substr(0, 8);
    if (callid !== self.id) {
        self.logger.warn("Ignoring CALL_REQ_DECLINE for unknown call id");
        return;
    }
    var code = packet.data.charCodeAt(8);
    if (code === Term.kErrNotSupported) {
        self._hadNotSupportedAnswer = true;
        self.logger.warn("Received a notification from", base64urlencode(packet.fromUser),
            "that a client does not support webrtc calls");
        return;
    }
    if (code !== Term.kCallRejected && code !== Term.kBusy && code !== Term.kErrAlready) {
        self.logger.warn("CALL_REQ_DECLINE with unexpected reason code", constStateToText(code));
    }

    if (packet.fromUser === self.manager.chatd.userId) {
        // Some other client of our user declined the call
        if (self.state !== CallState.kRingIn) {
            self.logger.warn("Ignoring CALL_REQ_DECLINE from another client of our user -",
                "the call is not in kRingIn state, but in ", constStateToText(CallState, self.state));
            return;
        }
        self.logger.log("Destroying call in state kRingIn that was rejected by another client of ours, with reason",
            constStateToText(Term, code));
        // TODO: Maybe verify the reason is not other than kCallRejected or kBusy
        self._destroy(code, false);
        return;
    }
    if (self.isGroup) { // group call requests can't be rejected
        return;
    }

    if (self.state !== CallState.kReqSent) {
        this.logger.warn("Ignoring unexpected CALL_REQ_DECLINE while in state", constStateToText(this.state));
        return;
    }
    this.hangup(code | Term.kPeer);
};

Call.prototype.msgCallReqCancel = function(packet) {
    var callid = packet.data.substr(0, 8);
    if (callid !== this.id) {
        this.logger.warn("Ignoring CALL_REQ_CANCEL for another (possibly previous) call in the same chatroom");
        return;
    }
    var cinfo = this.callerInfo;
    if (!cinfo) {
        this.logger.warn("Ignoring CALL_REQ_CANCEL for a call that is not incoming");
        return;
    }
    if (this.state >= CallState.kCallInProgress) {
        if (this.state === CallState.kCallInProgress) {
            this.logger.warn("Ignoring unexpected CALL_REQ_CANCEL while call in progress");
        } else {
            this.logger.log("Ignoring CALL_REQ_CANCEL for an ended call in state ",
                constStateToText(CallState, this.state));
        }
        return;
    }
    // CALL_REQ_CANCEL callid.8 reason.1
    if (cinfo.fromUser !== packet.fromUser || cinfo.fromClient !== packet.fromClient) {
        this.logger.warn("Ignoring CALL_REQ_CANCEL from a client that did not send the call request");
        return;
    }
    assert(packet.data.length >= 9);
    var callid = packet.data.substr(0, 8);
    if (callid !== this.id) {
        this.logger.warn("Ignoring CALL_REQ_CANCEL for an unknown request id");
        return;
    }
    var term = packet.data.charCodeAt(8);
    this._destroy(term | Term.kPeer, false);
};


Call.prototype.msgRinging = function(packet) {
    var self = this;
    if (self.state !== CallState.kReqSent && self.state !== CallState.kCallInProgress) {
        self.logger.warn("Ignoring unexpected RINGING");
        return;
    }
    if (self._hadRingAck) {
        return;
    }
    self._hadRingAck = true;
    this._fire("onRingOut", packet.fromUser);
};

Call.prototype._clearCallOutTimer = function() {
    if (!this._callOutTimer) {
        return;
    }
    clearTimeout(this._callOutTimer);
    delete this._callOutTimer;
};

Call.prototype._bcastCallData = function(type, uiTermCode) {
    var self = this;
    if (type == null) { // null means last sent type - only update the flags
        type = self._lastSentCallDataType;
        // Doesn't make sense to update the CALLDATA once in kTerminated state,
        // and also in this case we need the last uiTermCode
        assert(type != null);
        assert(type !== CallDataType.kTerminated,
            "Ignoring call to _bcastCallData(null), because the last sent CALLDATA type is kTerminated");
    }
    var state;
    if (type === CallDataType.kTerminated) {
        state = 0;
    }
    else {
        // While on hold, we broadcast CALLDATA with the original a/v flags, to reserve the bandwidth
        // slot
        state = (self._onHoldRestoreAv != null)
            ? (self._onHoldRestoreAv | Av.OnHold)
            : self.localAv(); // this includes the Av.OnHold flag, but returns the current gLocalStream av

        if (self.isRingingOut) {
            state |= CallDataFlag.kRinging;
        }
    }
    var payload = self.id
        + String.fromCharCode(type)
        + String.fromCharCode(state);
    self._lastSentCallDataType = type;
    if (type === CallDataType.kTerminated) {
        assert(uiTermCode != null);
        payload += String.fromCharCode(uiTermCode);
    }
    var cmd = self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0'
        + Chatd.pack16le(payload.length)
        + payload;

    self._updateOwnPeerAvState(type);
    // We don't get our CALLDATA echoed back from chatd, same as with RTCMD broadcast
    var ok = self.shard.cmd(Chatd.Opcode.CALLDATA, cmd);
    if (!ok && (self.state < CallState.kTerminating)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
        return false;
    }
    return true;
};

Call.prototype._updateOwnPeerAvState = function(callDataType) {
    this.manager._updatePeerAvState({
        chatid: this.chatid,
        shard: this.shard,
        fromUser: this.manager.chatd.userId,
        fromClient: this.shard.clientId,
        av: (this._onHoldRestoreAv != null) ? (this._onHoldRestoreAv | Av.OnHold) : this.localAv(),
        callid: this.id,
        call: this,
        type: callDataType
    }, true);
};

Call.prototype.msgSession = function(packet) {
    // SESSION callid.8 sid.8 anonId.8 encHashKey.32 actualCallId.8 flags.1
    var self = this;
    var callid = packet.data.substr(0, 8);
    if (callid !== self.id) {
        this.logger.log("Ignoring SESSION for another callid");
        return;
    }

    var peerId = packet.fromUser + packet.fromClient;
    var haveSentSession = self._sentSessions[peerId];
    if (haveSentSession) {
        // We are joining each other simultaneously,
        // we have already sent RTCMD.SESSION to that client
        var ourId = self.manager.chatd.userId + packet.shard.clientId;
        assert(peerId !== ourId);
        if (ourId > peerId) {
            self.logger.warn("Detected simultaneous join with " + base64urlencode(packet.fromUser) +
             " - received RTCMD.SESSION after having already sent one. " +
             "Our peerId is greater, ignoring received SESSION");
            return;
        } else {
            self.logger.warn("Detected simultaneous join with " + base64urlencode(packet.fromUser) +
             " - received RTCMD.SESSION after having already sent one. " +
             "Our peerId is smaller, processing received SESSION");
        }
    }
    if (!self._inCallPingTimer) {
        // in blind recovery, we start the INCALL ping as soon as someone replies to our JOIN
        self._startIncallPingTimer();
    }

    if (self.state === CallState.kJoining) {
        self._setCallInProgress();
    } else if (self.state !== CallState.kCallInProgress) {
        this.logger.warn("Ignoring unexpected SESSION while in call state "+constStateToText(CallState, self.state));
        return;
    }

    self._addNewSession(packet) // handles errors on its own
    .then(function(sess) {
        sess._startAsJoiner();
    });
};

Session.prototype._startAsJoiner = function() {
    var self = this;
    assert(self.isJoiner); // the joiner sends the SDP offer
    try {
        self._processInputQueue();
    }
    catch(e) {
        return;
    }
    if (self.state === SessState.kWaitSdpAnswer) {
        self.sendOffer()
        .catch(function(err) {
            // should not happen, errors should already be handled
            if (sess.state < SessState.kTerminating) {
                sess.terminateAndDestroy(Term.kErrInternal);
            }
        });
    }
};

Call.prototype._notifyNewSession = function(sess) {
    try {
        sess.handler = this.handler.onNewSession(sess);
    } catch (e) {
        sess.handler = null;
        throw e;
    }
    if (!this._callStartSignalled) {
        this._callStartSignalled = true;
        if (!this.recovery) {
            this._fire('onCallStarting');
        }
    }
};

// Timeout from kInProgress till first session reaches connected state
Call.prototype._monitorCallSetupTimeout = function() {
    var self = this;
    self._setupTimer = setTimeout(function() {
        if (self.state === CallState.kCallInProgress && !self.hasConnectedSession) {
            self.hangup(Term.kErrCallSetupTimeout);
        }
    }, RtcModule.kCallSetupTimeout);
};

Call.prototype.msgJoin = function(packet) {
    // JOIN: callid.8 anonId.8 flags.1
    var self = this;
    if (self.state === CallState.kRingIn && packet.fromUser === self.manager.chatd.userId) {
        self.logger.log("Incoming call answered on another device, destroying");
        self._destroy(Term.kAnsElsewhere, false);
    } else if (self.state === CallState.kJoining || self.state === CallState.kCallInProgress ||
        self.state === CallState.kReqSent) {
        packet.callid = packet.data.substr(0, 8);
        assert(packet.callid);
        // If the last peer that dropped out of the call reconnects, clear the timer that would hold our call open
        // in case everyone leaves
        if (self._lastErrPeerOffline && (self._lastErrPeerOffline.peerId === packet.fromUser + packet.fromClient)) {
            self._clearCallRecoveryTimer();
            delete self._lastErrPeerOffline;
        }
        for (var sid in self.sessions) {
            var s = self.sessions[sid];
            if (s.peer === packet.fromUser && s.peerClient === packet.fromClient) {
                // we have a session to that peer
                self.logger.warn("Received JOIN from", base64urlencode(packet.fromUser),
                    "(0x" + Chatd.dumpToHex(packet.fromClient, 0, 4, true) +
                    ") to whom we already have a session in state " + constStateToText(SessState, s.state) +
                    " Destroying existing session and accepting the JOIN");
                if (s.state >= SessState.kTerminating) {
                    // session is terminating, force its removal and handle the join
                    s._destroy(s._terminateReason);
                } else {
                    // probably peer lost connectivity and is re-joining call, but we haven't detected that yet
                    // By destroying the existing session we are not messing up with the simultaneous JOIN protection
                    // because: if the existing session is a result of our JOIN, then peer must have replied with
                    // SESSION first, and only after that sent the JOIN, which doesn't make sense in the context of
                    // simultaneous JOIN.
                    s._destroy(Term.kErrPeerOffline);
                }
                assert(!self.sessions[sid]);
            }
        }
        if (self.state === CallState.kReqSent) {
            self._setCallInProgress();
            if (!self.isGroup) {
                delete self.isRingingOut;
                if (!self._bcastCallData(CallDataType.kNotRinging)) {
                    return;
                }
            }
        } else if (self.state === CallState.kJoining && self.recovery) {
            // Call recovery - peers send joins to each other
            self._setCallInProgress();
            if (!self._inCallPingTimer) {
                // during blind recovery, we start INCALL pings only after someone replies to our JOIN
                self._startIncallPingTimer();
            }
        }

        var newSid = self.manager.crypto.random(8);
        var peerId = packet.fromUser + packet.fromClient;
        delete self._sentSessions[peerId];
        var ownHashKey = self.manager.crypto.random(32);

        self.manager.crypto.loadCryptoForPeer(packet.fromUser)
        .then(function() {
            // SESSION callid.8 sid.8 anonId.8 encHashKey.32 actualCallId.8 flags.1
            // flags contains a flag whether we support stream renegotiation
            self.manager.cmdEndpoint(RTCMD.SESSION, packet,
                packet.callid +
                newSid +
                self.manager.ownAnonId +
                self.manager.crypto.encryptNonceTo(packet.fromUser, ownHashKey) +
                self.id +
                String.fromCharCode(RtcModule.kEnableStreamReneg ? Caps.kSupportsStreamReneg : 0)
            );
            var supportsReneg = ((packet.data.charCodeAt(16) & Caps.kSupportsStreamReneg) !== 0);
            self._sentSessions[peerId] = { sid: newSid, ownHashKey: ownHashKey, peerSupportsReneg: supportsReneg };
        });
    } else {
        self.logger.log("Ignoring JOIN while in state", constStateToText(CallState, self.state));
        return;
    }
};

Call.prototype._setCallInProgress = function() {
    this._setState(CallState.kCallInProgress);
    this._monitorCallSetupTimeout();
};

Call.prototype._gracefullyTerminateAllSessions = function(code) {
    var self = this;
    if (Object.keys(self.sessions).length === 0) {
        return Promise.resolve();
    }
    var promises = [];
    for (var sid in self.sessions) {
        var sess = self.sessions[sid];
        promises.push(sess.terminateAndDestroy(code));
    }
    return Promise.all(promises)
    .catch(function() {
        assert(false); // terminateAndDestroy() should never fail
    });
};

Call.prototype._waitAllSessionsTerminated = function(code) {
    var self = this;
    var sessions = self.sessions;
    var promises = [];
    // if the peer initiated the call termination, we must wait for
    // all sessions to go away and remove the call
    for (var sid in sessions) {
        promises.push(sessions[sid]._terminatePromise);
    }
    var pms = createPromiseWithResolveMethods();
    Promise.all(promises)
    .then(function() {
        pms.resolve();
    });
    setTimeout(function() {
        if (pms.done) {
            return;
        }
        self.logger.warn("Timed out waiting for all sessions to terminate, force closing them");
        for (var sid in sessions) {
            sessions[sid]._destroy(code);
        }
        pms.resolve();
    }, 1400);
    return pms;
};

Call.prototype._destroy = function(code, weTerminate, msg) {
    assert(!isNaN(code));
    var self = this;

    var reasonNoPeer = code & ~Term.kPeer;
    if (reasonNoPeer === Term.kAnswerTimeout && self._hadNotSupportedAnswer) {
        reasonNoPeer = Term.kErrNotSupported;
        code = reasonNoPeer | Term.kPeer;
    }

    if (self.state === CallState.kDestroyed) {
        return Promise.resolve(null);
    } else if (self.state === CallState.kTerminating) {
        assert(self._destroyPromise);
        return self._destroyPromise;
    }
    if (msg) {
        self.logger.log("Destroying call due to: ", msg);
    }
    self.predestroyState = self.state;
    self._setState(CallState.kTerminating);
    delete self.chat.tsCallStart;
    self._clearCallOutTimer();

    var pmsGracefulTerm;
    if (weTerminate) {
        // if we initiate the call termination, we must initiate the
        // session termination handshake
        pmsGracefulTerm = self._gracefullyTerminateAllSessions(code);
    } else {
        pmsGracefulTerm = self._waitAllSessionsTerminated(code);
    }

    var destroyCall = function(recovery) {
        if (self.state >= CallState.kDestroyed) {
            return;
        }
        var logMsg =  "Terminating call in state " + constStateToText(CallState, self.predestroyState) +
            " with reason " + constStateToText(Term, reasonNoPeer);
        if (code !== reasonNoPeer) {
            logMsg += " by peer";
        }
        self.logger.log(logMsg);

        if (self.gLocalStream) {
            RTC.stopMediaStream(self.gLocalStream);
            delete self.gLocalStream;
            delete self.localMediaPromise;
        }
        if (self._audioMutedChecker) {
            self._audioMutedChecker.stop();
            self._audioMutedChecker.destroy();
            delete self._audioMutedChecker;
        }

        // reasonNoPeer can be kBusy even in a group call if we are the callee, and another client of ours
        // is already in a call. In that case, our other client will broadcast a decline with kBusy,
        // and we will see it and abort the incoming call request

        if (reasonNoPeer === Term.kAnsElsewhere || reasonNoPeer === Term.kErrAlready
         || reasonNoPeer === Term.kAnswerTimeout) {
            self.logger.log("Not sending terminate CALLDATA because destroy reason is", constStateToText(Term, reasonNoPeer));
        } else if (self.predestroyState === CallState.kRingIn) {
            self.logger.log("Not sending terminate CALLDATA because we were passively ringing");
        } else if (self.predestroyState === CallState.kCallingOut) {
            self.logger.log("Not sending terminate CALLDATA because we haven't yet sent the call request");
        } else if (!self._inCallPingTimer) {
            self.logger.log("Not sending terminate CALLDATA because INCALL pings were not started");
        } else {
            self._bcastCallData(CallDataType.kTerminated, self.termCodeToHistCallEndedCode(code));
        }
        // if we have recovery, then the chatd connection is either broken or we have received ENDCALL
        // in both cases we don't need to send ENDCALL, especially in the latter - that would cause that
        // ENDCALL to echo back to us during the immediate re-join attempt
        self._stopIncallPingTimer(recovery != null);
        self._clearCallRecoveryTimer();
        self._setState(CallState.kDestroyed);
        self._fire('onDestroy', reasonNoPeer, (code & Term.kPeer) !== 0, msg, recovery);
        self.manager._removeCall(self);
    };
    var wasJoiningOrInProgress = (self.predestroyState === CallState.kCallInProgress) ||
        (self.predestroyState === CallState.kJoining);
    if (code === Term.kAppTerminating) {
        self.logger.warn("Destroying call immediately due to kAppTerminating");
        destroyCall();
        self._destroyPromise = Promise.resolve();
    } else if (code === Term.kErrNetSignalling && wasJoiningOrInProgress) {
        self.logger.warn("Destroying call immediately due to kErrNetSignalling and setting up a recovery attempt");
        // must ._setupCallRecovery() before destroyCall() because it gets the localAv() from the existing call
        destroyCall(self.manager._setupCallRecovery(self));
        self._destroyPromise = Promise.resolve();
    } else if (code === Term.kErrNetSiglTimeout && wasJoiningOrInProgress) {
        self.logger.warn("Destroying call gracefully due to INCALL ping timeout and setting up a recovery attempt");
        // must ._setupCallRecovery() before destroyCall() because it gets the localAv() from the existing call
        self._destroyPromise = pmsGracefulTerm.then(function() {
            assert(self.hasNoSessions());
            destroyCall(self.manager._setupCallRecovery(self));
        });
    } else { // normal destroy, first wait for all sessions to terminate
        self._destroyPromise = pmsGracefulTerm.then(function() {
            assert(self.hasNoSessions());
            destroyCall();
        });
    }
    return self._destroyPromise;
};

function CallInfo() {
    /* callInfo structure when there is a call:
        callInfo = {
            callId: binstring,
            participants: {
                <peerid1>: av1,
                <peerid2>: av2
            }
        }
    */
    this.participants = {};
};

CallInfo.prototype.participantCount = function() {
    return Object.keys(this.participants).length;
};

CallInfo.prototype.audioVideoSenderCount = function() {
    if (!this.callId) {
        return { audio: 0, video: 0 };
    }
    var audioSenders = 0;
    var videoSenders = 0;
    var roomAv = this.participants;
    assert(roomAv);
    for (var k in roomAv) {
        var flags = roomAv[k];
        if (flags === true) { // we received INCALL for this peer, but no CALLDATA (yet)
            continue;
        }
        if (flags & Av.Audio) {
            audioSenders++;
        }
        if (flags & Av.Video) {
            videoSenders++;
        }
    }
    return { audio: audioSenders, video: videoSenders };
};

CallInfo.prototype.hasFreeSenderSlots = function() {
    var result = {};
    /*
    var partCount = Object.keys(chat.callInfo.participants).length;
    if (partCount >= RtcModule.kMaxCallReceivers) {
        return null;
    }
    */
    var senders = this.audioVideoSenderCount();
    if (senders.video < RtcModule.kMaxCallVideoSenders) {
        result.video = true;
    }
    if (senders.audio < RtcModule.kMaxCallAudioSenders) {
        result.audio = true;
    }
    return result;
};

Call.prototype.getAudioVideoSenderCount = function() {
    return this.chat.callInfo.audioVideoSenderCount();
};

RtcModule.prototype._setupCallRecovery = function(call) {
    var self = this;
    var chatid = call.chatid;
    var existing = self.callRecoveries[chatid];
    if (existing) {
        if (existing.callid === call.id) {
            return;
        }
        self.logger.warn("setupCallRecovery: Call recovery for another call in this chatroom " +
            base64urlencode(chatid) + "already scheduled, canceling it first");
        self.abortCallRecovery(chatid);
    }
    assert(!self.callRecoveries[chatid]);
    var recovery = self.callRecoveries[chatid] = new CallRecovery(call);
    call.gLocalStream = null;
    return recovery;
};

/*
 This class holds all the state needed to recover a call after reconnect.
 However, it also serves as a placeholder for the actual call object in the GUI code,
 so that it can transparently query and manipulate the call state during recovery.
 For example, the on-hold state can be queried and changed, mic/cam can be muted and unmuted,
 etc.
*/
function CallRecovery(call) {
    var self = this;
    self.chatid = call.chatid;
    self.id = call.id;
    self.sessions = {};
    self.gLocalStream = call.gLocalStream;
    self._isCapturingScreen = call._isCapturingScreen;
    self._onHoldRestoreAv = call._onHoldRestoreAv;
    self.callHandler = call.handler;
    self.callerInfo = call.callerInfo;
    self.isRecovery = true; // GUI can use this to detect if it's a real Call object
    var manager = self.manager = call.manager;

    self.timeoutTimer = setTimeout(function() {
        delete self.timeoutTimer;
        var recovery = manager.callRecoveries[self.chatid];
        if (recovery) {
            if (recovery !== self) {
                return;
            }
            // we are in the .callRecoveries map
            self.abort(Term.kErrCallRecoveryFailed); // timeout really
        } else {
            // no entry in callRecoveries, but the call being recovered may be stuck - in that case, abort the call
            var call = manager.calls[self.chatid];
            if (call && call.id === self.id) {
                if (call.state < CallState.kCallInProgress) {
                    // call is being recovered, but not yet established - we have to terminate it
                    call.logger.log("Call recovery timed out during call set up - destroying call");
                    call._destroy(Term.kErrCallRecoveryFailed, true);
                }
                // otherwise call is either in progress (ok) or terminating/terminated (has its own handing)
            }
            // we are not in callRecoveries, localStream must be either moved to a call or closed
            assert(!self.gLocalStream);
        }
    }, RtcModule.kCallRecoveryTimeout);
}

CallRecovery.prototype.localStream = function() {
    return this.gLocalStream;
};

CallRecovery.prototype.abort = function(reason) {
    var self = this;
    if (self.timeoutTimer) {
        clearTimeout(self.timeoutTimer);
    }
    if (self.gLocalStream) {
        RTC.stopMediaStream(self.gLocalStream);
        delete self.gLocalStream;
    }
    self.callHandler.onDestroy((reason == null) ? Term.kErrNetSignalling : reason);
    delete self.manager.callRecoveries[self.chatid];
};

CallRecovery.prototype.hangup = CallRecovery.prototype.abort;

CallRecovery.prototype.isOnHold = function() {
    return this._onHoldRestoreAv != null;
};

CallRecovery.prototype.putOnHold = function() {
    var self = this;
    if (self.isOnHold()) {
        return;
    }
    self._onHoldRestoreAv = Av.fromStream(self.gLocalStream);
    Av.enableAllTracks(self.gLocalStream, false);
};

CallRecovery.prototype.releaseOnHold = function() {
    assert(false, "Not supported");
};

CallRecovery.prototype.isScreenCaptureEnabled = function() {
    return this._isCapturingScreen;
};

CallRecovery.prototype.disableVideo = function() {
    RTC.streamStopAndRemoveVideoTracks(this.gLocalStream);
    delete this._isCapturingScreen;
    return Promise.resolve();
};

CallRecovery.prototype.enableCamera = function() {
    // Soft assert
    console.warn("Can't enable camera on a call in recovery"); // we don't have a logger at this point
    return Promise.reject();
};

CallRecovery.prototype.enableScreenCapture = function() {
    // Soft assert
    console.warn("Can't enable screencapture on a call in recovery"); // we don't have a logger at this point
    return Promise.reject();
};

CallRecovery.prototype.enableAudio = function(enable) {
    Av.enableAudio(this.gLocalStream, enable);
};

CallRecovery.prototype.isLocalMuteInProgress = function() {
    return false;
};

CallRecovery.prototype.localAv = function() {
    return Call.prototype.localAv.call(this);
};

CallRecovery.prototype.getAudioVideoSenderCount = function() {
    return { audio: 0, video: 0};
};

RtcModule.prototype.abortCallRecovery = function(chatid, reason) {
    assert(chatid);
    var recovery = this.callRecoveries[chatid];
    if (!recovery) {
        return;
    }
    recovery.abort(reason);
};

RtcModule.prototype.abortAllCallRecoveries = function(reason) {
    for (var chatid in this.callRecoveries) {
        var recovery = this.callRecoveries[chatid];
        recovery.abort(reason);
    }
    this.callRecoveries = {};
};

Call.prototype.cmdBroadcast = function(type, payload) {
    var self = this;
    if (!self.shard.rtcmd(self.chatid, null, null, type, payload)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, false); }, 0);
        return false;
    }
    return true;
};

Call.prototype._broadcastCallReq = function() {
    var self = this;
    if (self.state >= CallState.kTerminating) {
        self.logger.warn("_broadcastCallReq: Call terminating/destroyed");
        return false;
    }
    assert(!self._obtainingLocalStream);
    var localAv = self.localAv();
    assert(localAv != null);
    assert(self.isCallerOrJoiner);
    self.isRingingOut = true;
    if (!self._bcastCallData(CallDataType.kRinging)) {
        return false;
    }
    self._setState(CallState.kReqSent);
    // self.state is not enough - we continue ringing even
    // after peers pick up in group calls
    self._startIncallPingTimer();
    assert(!self._callOutTimer);

    self._callOutTimer = setTimeout(function() {
        self.isRingingOut = false;
        if (self.state === CallState.kReqSent) { // nobody answered, abort call request
            self.logger.log("Answer timeout, cancelling call request");
            self.hangup(Term.kAnswerTimeout); // TODO: differentiate whether peer has sent us RINGING or not
        } else {
            // In group calls we don't stop ringing even when call is answered, but stop it
            // after some time (we use the same kAnswerTimeout duration in order to share the timer)
            if (self.isGroup && self.state === CallState.kCallInProgress) {
                if (self._lastSentCalldataType === CallDataType.kRinging) {
                    // For more explicitness and backward compat,
                    // don't just clear the Ringing flag, but update the type to kNotRinging
                    self._bcastCallData(CallDataType.kNotRinging);
                } else {
                    // we don't want to overwrite the last sent CALLDATA, just clear the Ringing flag
                    self._bcastCallData(null);
                }
            }
            return;
        }
    }, RtcModule.kCallAnswerTimeout);
    self._fire("onCallRequestSent", { av: localAv});
    return true;
};

Call.prototype._startIncallPingTimer = function() {
    var self = this;
    var func = function() {
        if (!self.shard.cmd(Chatd.Opcode.INCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0')) {
            self._destroy(Term.kErrNetSignalling, true);
        }
    };
    self._inCallPingTimer = setInterval(func, RtcModule.kIncallPingInterval);
    func();
};

Call.prototype._stopIncallPingTimer = function(dontSendEndcall) {
    var self = this;
    if (!self._inCallPingTimer) {
        return;
    }
    clearInterval(self._inCallPingTimer);
    delete self._inCallPingTimer;
    if (!dontSendEndcall) {
        self.shard.cmd(Chatd.Opcode.ENDCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0');
    }
};

Call.prototype.hasNoSessions = function() {
    return (Object.keys(this.sessions).length === 0);
};

Call.prototype.hasNoSessionsOrPendingRetries = function() {
    return ((Object.keys(this.sessions).length === 0)
         && (Object.keys(this.sessRetries).length === 0));
};

Call.prototype._destroyIfNoSessionsOrRetries = function(reason) {
    // We may be called as a result of receiving a SESS_TERMINATE or ENDCALL for a peer that we don't
    // currently have a session to, but may have a scheduled session retry.
    // So, _removeRetry() calls us
    var self = this;
    if (!self.hasNoSessionsOrPendingRetries()) {
        return;
    }
    // We don't have any sessions or retries
    if (self._lastErrPeerOffline && (self.state === CallState.kCallInProgress)) {
        var recoveryDeadline = self._lastErrPeerOffline.ts + RtcModule.kCallRecoveryTimeout;
        var timeRemaining = recoveryDeadline - Date.now();
        if (timeRemaining > 0) {
            // Keep the call open for some time to give the last offline peer a chance to rejoin us
            assert(!self._peerCallRecoveryWaitTimer);
            self.logger.warn("A peer has recently left the call due to connection loss. Will keep the call open for " +
                Math.round(timeRemaining / 100) / 10 + " seconds, for peer to recover");
            self._peerCallRecoveryWaitTimer = setTimeout(function() {
                if (self.state >= CallState.kTerminating) {
                    return;
                }
                delete self._peerCallRecoveryWaitTimer;
                if (self.hasNoSessionsOrPendingRetries()) {
                    self._destroy(Term.kErrCallRecoveryFailed, false);
                }
            }, timeRemaining);
            return;
        } else {
            delete self._lastErrPeerOffline; // timer has expired, we can delete it
        }
    }
    self.logger.log("Everybody left, terminating call");
    self._destroy(reason, false, "Everybody left");
};

Call.prototype._removeSession = function(sess, reason, msg) {
    var self = this;
    var delSid = sess.sid;
    var peerId = sess.peer + sess.peerClient;
    var isTerminating = self.state >= CallState.kTerminating;
    var willRetry = isTermRetriable(reason) && (!isTerminating);
    sess._fire("onDestroy", reason & ~Term.kPeer,
        !!(reason & Term.kPeer), msg, willRetry); // jscs:ignore disallowImplicitTypeConversion

    delete self.sessions[delSid];
    var reasonNoPeer = reason & ~Term.kPeer;
    if (reasonNoPeer === Term.kErrIceFail || reasonNoPeer === Term.kErrIceTimeout) {
        if (self.iceFails[peerId] == null) {
            self.iceFails[peerId] = 1;
        } else {
            self.iceFails[peerId]++;
        }
    }
    // If we want to terminate the call (no matter if initiated by us or peer), we first
    // set the call's state to kTerminating. If that is not set, then it's only the session
    // that terminates for a reason that is not fatal to the call,
    // and can try re-establishing the session
    if (isTerminating) {
        return;
    }
    self._deleteRetry(peerId);
    if (!willRetry) { // we or peer hung up
        self._destroyIfNoSessionsOrRetries(reason);
        return;
    }
// Retry session
    var reconnCnt;
    var tsLastMedia = sess._tsLastMedia;
    if (sess._reconnInfo) {
        reconnCnt = sess._reconnInfo.reconnCnt + 1;
        // Only if we did not have any media, get tsLastMedia from the previous session
        if (!tsLastMedia && !sess._tsIceConn) {
            tsLastMedia = sess._reconnInfo.tsLastMedia;
        }
    }
    else {
        reconnCnt = 1; // needed for stats, during the next session it will be 1 already
    }
    var sessRetries = self.sessRetries;
    sessRetries[peerId] = {
        start: Date.now(),
        oldSid: delSid,
        reconnCnt: reconnCnt,
        tsLastMedia: tsLastMedia,
        termReason: reasonNoPeer
    };
    self.logger.warn("Scheduling session reconnect for session " + base64urlencode(sess.sid) +
        ((reason & Term.kPeer)
            ? ", peer terminated with "
            : ", we terminated with ")
        + constStateToText(Term, reasonNoPeer));

    // The original joiner re-joins, the peer does nothing, just keeps the call
    // ongoing and accepts the JOIN
    if (sess.isJoiner) {
        self.logger.log("Session to", base64urlencode(sess.peer), "failed, re-establishing it...");
        setTimeout(function() { //execute it async, to avoid re-entrancy
            if (self.state != CallState.kCallInProgress) {
                return;
            }
            for (var sid in self.sessions) {
                var s = self.sessions[sid];
                if (s.peer === sess.peer && s.peerClient === sess.peerClient) {
                    self.logger.warn("Session retry: About to retry, but there is already a session to that peer,",
                        "something is not right");
                    return;
                }
            }
            self.rejoinPeer(sess.peer, sess.peerClient);
        }, RtcModule.kSessRetryDelay);
    } else {
        // Else wait for peer to re-join...
        self.logger.log("Session to ", base64urlencode(sess.peer), "failed, expecting peer to re-establish it...");
    }
    // set a timeout for the session recovery
    setTimeout(function() {
        var retry = sessRetries[peerId];
        if (!retry || retry.oldSid !== delSid) { // retry canceled or we have a new one
            return;
        }
        delete sessRetries[peerId];
        if (self.state >= CallState.kTerminating) { // call already terminating
            return;
        }
        if (self.hasNoSessionsOrPendingRetries()) {
            self.logger.warn("Timed out waiting for session reconnect, terminating/leaving call");
            // kErrSessSetupTimeout is about existing session not reaching kSessInProgress
            self.hangup(Term.kErrSessRetryTimeout);
        }
    }, RtcModule.kSessSetupTimeout);
};

function fireEvent(handler, logger, evNameAndArgs) {
    var evName = evNameAndArgs[0];
    var args = [].slice.call(evNameAndArgs, 1);
    var func = handler[evName];
    if (logger.isEnabled()) {
        var msg = "fire " + evName;
        if (evName === "onDestroy") {
            msg += " (" + constStateToText(Term, args[0]) + ')';
        }
        if (!func) {
            msg += " ...unhandled ";
        }
        msg += eventArgsToString(args);
        logger.log(msg);
    }
    if (!func) {
        return undefined;
    }
    try {
        return func.apply(handler, args);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
    }
    return undefined;
}

Call.prototype._fire = function(evName) {
    return fireEvent(this.handler, this.logger, arguments);
};

Call.prototype._startOrJoin = function(av) {
    var self = this;
    assert(self.state < CallState.kCallInProgress);
    if (self.isJoiner) {
        var senders = self.getAudioVideoSenderCount();
        if ((av & Av.Video) && (senders.video >= RtcModule.kMaxCallVideoSenders)) {
            self.logger.warn("Can't join with camera - maximum number of video senders already reached");
            av &= ~Av.Video;
        }
        if ((av & Av.Audio) && (senders.audio >= RtcModule.kMaxCallAudioSenders)) {
            self.logger.warn("Can't join with mic - maximum number of audio senders already reached");
            av &= ~Av.Audio;
        }
    }
    var pms;
    if (self.recovery) {
        assert(self.role === CallRole.kJoiner);
        self._startOrJoinAv = self.localAv();
        pms = Promise.resolve(self.gLocalStream);
    } else {
        // we need _startOrJoinAv immediately after creating an outgoing call, so we can't set it
        // after obtaining the local stream (which is an async operation)
        self._startOrJoinAv = av;
        pms = self._initialGetLocalStream(av)
        .then(function() {
            self._updateOwnPeerAvState();
        });
    }
    return pms
    .catch(function(err) {
        self.logger.warn("Couldn't get local stream, continuing as receive-only");
    })
    .then(function() {
        if (self.state >= CallState.kTerminating) {
            self.logger.warn("Call killed while getting local stream, aborting start/join");
            return Promise.reject();
        }
        if (self.isJoiner) {
            if (!self._join()) {
                return Promise.reject();
            }
        } else {
            if (!self._broadcastCallReq()) {
                return Promise.reject();
            }
        }
    });
};

Call.prototype._join = function() {
    var self = this;
    self._sentSessions = {};
    assert(!self._obtainingLocalStream);
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8 flags.1
    // flags is sentAv + whether we support stream renegotiation
    var data = self.id + self.manager.ownAnonId + (String.fromCharCode(self.localAv() |
        (RTC.supportsUnifiedPlan ? Caps.kSupportsStreamReneg : 0)));
    self._setState(CallState.kJoining); // if our role is kJoiner, kJoining state is already set by Call constructor
    if (!self.cmdBroadcast(RTCMD.JOIN, data)) {
        return false;
    }
    if (self.recovery) {
        if (!self.recovery.isBlind) {
            // send a dummy CALLDATA so that peers receiving INCALL for us, know our state as well
            self._bcastCallData(CallDataType.kSession);
            self._startIncallPingTimer();
        }
    } else {
        self._startIncallPingTimer();
    }
    // Timeout from JOIN sending till kInProgress state
    // Then we have monitorCallSetupTimeout() - from kInProgress till first session connected
    setTimeout(function() {
        if (self.state <= CallState.kJoining) {
            self.logger.warn("Call setup timed out, destroying");
            self._destroy(Term.kErrCallSetupTimeout, true);
        }
    }, RtcModule.kJoinTimeout);
    return true;
};

Call.prototype.rejoinPeer = function(userid, clientid) {
    var self = this;
    assert(self.state === CallState.kCallInProgress);
    delete self._sentSessions[userid + clientid];
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8 flags.1
    // if userid is not specified, join all clients in the chat, otherwise
    // join a specific user (used when a session gets broken)
    var data = self.id + self.manager.ownAnonId + String.fromCharCode(self.localAv() | Caps.kSupportsStreamReneg);
    if (!self.shard.rtcmd(self.chatid, userid, clientid, RTCMD.JOIN, data)) {
        setTimeout(function() {
            self._destroy(Term.kErrNetSignalling, true);
        }, 0);
        return false;
    }
    return true;
};


Call.prototype.answer = function(av) {
    var self = this;
    assert(self.isJoiner);
    if (self.state !== CallState.kRingIn) {
        self.logger.warn("answer: Not in kRingIn state, (but in " + constStateToText(CallState, self.state) +
            "), nothing to answer");
        return false;
    }
    self.manager.putAllActiveCallsOnHold();
    return self._startOrJoin(av);
};

Call.prototype.hangup = function(reason) {
    var reasonNoPeer;
    if (reason != null) {
        reasonNoPeer = reason & ~Term.kPeer;
    }

    switch (this.state) {
    case CallState.kReqSent:
        if (reasonNoPeer == null) {
            reason = Term.kUserHangup;
        }
        // TODO: Assess the need to bcast CALL_REQ_CANCEL
        this.cmdBroadcast(RTCMD.CALL_REQ_CANCEL, this.id + String.fromCharCode(reason));
        return this._destroy(reason, false);
    case CallState.kRingIn:
        return this._reject();
    case CallState.kJoining:
    case CallState.kCallInProgress:
        if (reason == null) { // covers both 'undefined' and 'null'
            reason = Term.kUserHangup;
        } else {
            assert(reason === Term.kUserHangup || reason === Term.kAppTerminating ||
                RtcModule.termCodeIsError(reason));
        }
        break;
    case CallState.kTerminating:
    case CallState.kDestroyed:
        this.logger.log("hangup: Call already terminating/terminated");
        return Promise.resolve();
    default:
        this.logger.warn("Don't know what term code to send in state", constStateToText(CallState, this.state),
            "provided code is", constStateToText(Term, reason), "but defaulting to kUserHangup");
        reason = Term.kUserHangup;
        break;
    }
    return this._destroy(reason, true);
};

Call.prototype._reject = function(reason) {
    if (reason == null) {
        reason = Term.kCallRejected;
    }
    this.manager._rejectedCallIds[this.id] = true;
    var cinfo = this.callerInfo;
    assert(cinfo);
    assert(this.hasNoSessionsOrPendingRetries());
    this.cmdBroadcast(RTCMD.CALL_REQ_DECLINE, cinfo.callid + String.fromCharCode(reason));
    return this._destroy(reason, false);
};
/*
 * Returns whether this call is in a user-interactive state
 */
Call.prototype.isActive = function() {
    if (this.isOnHold()) {
        return false;
    }
    var state = this.state;
    return (state === CallState.kJoining || state === CallState.kCallInProgress ||
            state === CallState.kCallingOut || state === CallState.kReqSent);
};

Call.prototype._onClientLeftCall = function(userid, clientid) {
    // We received an ENDCALL
    var self = this;
    if (userid === self.manager.chatd.userId && clientid === self.shard.clientId) {
        if (self.recovery && self.state === CallState.kJoining) {
            // We may receive a parasitic ENDCALL after we reconnect to chatd, which is about the previous connection
            self.logger.warn("Ignoring ENDCALL received for a reconnect call while in kJoining state");
        } else {
            // We received ENDCALL for us because of INCALL ping timeout - our connection is slow
            self._destroy(Term.kErrNetSiglTimeout, false, "ENDCALL received for our client")
            .then(function() {
                var recovery = self.manager.callRecoveries[self.chatid];
                if (recovery) {
                    self.manager._startOrJoinCall(self.chatid, recovery.av, recovery.callHandler, true, recovery);
                } else {
                    self.logger.warn("No recovery scheduled after call destroyed with kErrNetSiglTimeout");
                }
            });
        }
    }
    else if (this.state === CallState.kRingIn) {
        if (userid === this.callerInfo.fromUser && clientid === this.callerInfo.fromClient) {
            // Caller went offline
            this._destroy(Term.kCallerGone, false);
        }
    }
    else {
        // destroy all sessions and retries to that peer
        // jshint -W083
        var peerId = userid + clientid;
        var sessions = this.sessions;
        var didSetLastErrPeerOffline;
        for (var sid in sessions) {
            var sess = sessions[sid];
            if (sess.peer === userid && sess.peerClient === clientid) {
                if (sess.state >= SessState.kTerminating) {
                    // The termination reason is not kErrPeerOffline, so don't consider the session
                    // for call recovery
                    // Destroy and remove it immediately, as the peer may immediately reconnect
                    // and send a JOIN. If the lingering terminating session is present, that JOIN
                    // will be ignored. Also remove potential retry for that session,
                    // as the peer eventually went offline, which is not a retriable condition
                    sess._destroy(sess._terminateReason);
                    self._deleteRetry(peerId);
                    return;
                } else {
                    // peer abruptly went offline
                    didSetLastErrPeerOffline = true;
                    self._lastErrPeerOffline = { peerId: peerId, ts: Date.now() };
                    sess._destroy(Term.kErrPeerOffline); // will keep the call open even if this is the last session
                }
                break;
            }
        }
        // jshint +W083
        // If there is a pending retry for that peer, replace it with call recovery
        // The retry will not wait for the peer to come back online, and is likely to fail
        // before that
        if (self.sessRetries[peerId]) {
            self.logger.log("We have a session retry scheduled for the peer that went offline");
            if (!didSetLastErrPeerOffline) {
                self.logger.log("Replacing retry with call recovery descriptor");
                self._lastErrPeerOffline = { peerId: peerId, ts: Date.now() };
            }
            self._deleteRetry(peerId, Term.kErrPeerOffline);
        }
    }
};

Call.prototype._deleteRetry = function(peerId, termCode) {
    // If termCode is specified, then the caller wants us to destroy
    // the call if there are no sessions and other retries pending
    // If it is not specified, caller either knows for sure there are other sessions/retries, or
    // is the code that destroys the call
    var sessRetries = this.sessRetries;
    var retry = sessRetries[peerId];
    if (!retry) {
        return;
    }
    delete sessRetries[peerId];
    // if termCode is undefined/null, then we are just asked to remove the retry, not
    // deal with call destruction
    if ((termCode != null) && this._destroyIfNoSessionsOrRetries(termCode)) {
        return; // call destroyed
    }
    if (retry.termReason === Term.kStreamChange) {
        this._checkLocalMuteCompleted();
    }
};

Call.prototype._checkLocalMuteCompleted = function() {
    var self = this;
    // We are called when a session renegotiation completes, but it may be the peer that does
    // the muting
    if (!self._localMuteCompletePromise) {
        return;
    }
    var sessRetries = self.sessRetries;
    var kStreamChange = Term.kStreamChange; // avoid lookup in loop
    // first, check for fallback 'renegotiations'
    for (var id in sessRetries) {
        var reason = sessRetries[id].termReason;
        if (reason === Term.kStreamChange || reason === Term.kErrStreamReneg || reason === Term.kStreamRenegTimeout) {
            return;
        }
    }
    // then, check for real renegotiations
    var sessions = self.sessions;
    for (var sid in sessions) {
        if (sessions[sid]._streamRenegTimer) {
            return;
        }
    }
    // No sessions or pending retries with stream change in progress
    // we are called only when a session has completed a stream change, so if there
    // are no others, notify the app, so it can re-enable the mute buttons
    self._notifyLocalMuteComplete();
};

Call.prototype._notifyLocalMuteInProgress = function() {
    var self = this;
    assert(!self._localMuteCompletePromise);
    self._localMuteCompletePromise = createPromiseWithResolveMethods();
    self._fire("onLocalMuteInProgress");
};

Call.prototype._notifyLocalMuteComplete = function(err) {
    var self = this;
    assert(self._localMuteCompletePromise);
    var pms = self._localMuteCompletePromise;
    delete self._localMuteCompletePromise;
    self._fire('onLocalMuteComplete');
    if (err) {
        pms.reject(err);
    } else {
        pms.resolve();
    }
};

Call.prototype.isLocalMuteInProgress = function() {
    return this._localMuteCompletePromise != null;
};

Call.prototype._removeRetry = function(reason, userid, clientid) {
    var self = this;
    var endpointId = userid + clientid;
    if (!self.sessRetries[endpointId]) {
        return false;
    }
    delete self.sessRetries[endpointId];
    self._destroyIfNoSessionsOrRetries(reason);
    return true;
};

Call.prototype._clearCallRecoveryTimer = function() {
    if (!this._peerCallRecoveryWaitTimer) {
        return;
    }
    clearTimeout(this._peerCallRecoveryWaitTimer);
    delete this._peerCallRecoveryWaitTimer;
};

Call.prototype._notifySessionConnected = function(sess) {
    /*
    var url = this.manager.statsUrl;
    if (url) {
        url += '/newsess?cid='+base64urlencode(this.id)+'&sid='+base64urlencode(sess.sid);
        jQuery.ajax(url);
    }
    */
    var self = this;

    self._clearCallRecoveryTimer();
    self._deleteRetry(sess.peer + sess.peerClient);
    self._checkLocalMuteCompleted();
    // handle first connected session
    if (self.hasConnectedSession) {
        return;
    }
    self.hasConnectedSession = true;
    // In group calls, we want to keep ringing for some time, so we send a special
    // version of kSession that doesn't suppress ringing.
    self._bcastCallData(CallDataType.kSession);

    var chat = self.chat;
    if (chat.tsCallStart == null) {
        chat.tsCallStart = Date.now();
    }

    if (!this.recovery) {
        this._fire('onCallStarted', chat.tsCallStart);
        if (!self.isGroup && Av.fromStream(sess.remoteStream) === 0 && self.localAv() === 0) {
            self._fire('onNoMediaOnBothEnds');
        }
    }

    if (self._renegotiateAfterInitialConnect) {
        assert(self.streamRenegTimer);
        delete self._renegotiateAfterInitialConnect;
        self.sendOffer();
    }
    self._checkStartMicMonitor();
};

Call.prototype.enableAudio = function(enable) {
    // Tolerates both localStream === null and localStream not having an audio track
    var self = this;
    if (self.state >= CallState.kTerminating) {
        self.logger.warn("enableAudio: Call is terminating");
        return;
    }
    if (self._localMuteCompletePromise) {
        self.logger.warn("enableAudio: Local mute/unmute already in progress");
        return;
    }
    var oldAv = self.localAv();
    var hadAudio = !!(oldAv & Av.Audio);
    if (hadAudio === enable) {
        self.logger.log("enableAudio: Nothing to change");
        return;
    }
    var senders = self.getAudioVideoSenderCount();
    assert(senders);
    if (enable && (senders.audio >= RtcModule.kMaxCallAudioSenders)) {
        this.logger.warn("Can't enable audio sending, too many audio senders in call");
        return;
    }
    self._notifyLocalMuteInProgress();
    var success = Av.enableAudio(self.gLocalStream, enable);
    var sessions = self.sessions;
    for (var sid in sessions) {
        var sess = sessions[sid];
        if (!sess.peerIsOnHold()) {
            Av.enableAudio(sess.rtcConn.outputStream, enable);
        }
    }
    self._notifyLocalMuteComplete();
    if (!success) {
        self.logger.warn("Failed to enable audio: there is no local stream or no audio tracks in it");
        self._fire('onLocalMediaFail', Av.Audio);
        return;
    }
    if (!self.isOnHold()) {
        self._bcastLocalAvChange();
    }
    var amChecker = self._audioMutedChecker;
    if (amChecker) {
        if (!enable) {
            amChecker.stop();
        } else if (!self.manager.audioInputDetected) {
            amChecker.start(self.gLocalStream);
        }
    }
};

Call.prototype._canEnableDisableVideo = function(enable) {
    var self = this;
    if (self.state !== CallState.kCallInProgress) {
        return "Call that is not in state kInProgress (but in " + constStateToText(CallState, self.state) + ")";
    }
    if (self._localMuteCompletePromise) {
        return "A mute/unmute operation is already in progress";
    }
    var oldAv = self.localAv();
    if ((!!(oldAv & Av.Video)) === enable) { // jshint -W018
        return "Nothing to change";
    }
    return null;
};

Call.prototype._enableVideo = function(screen) {
    var self = this;
    var err = self._canEnableDisableVideo(true);
    if (err) {
        self.logger.warn(err);
        return Promise.reject(err);
    }
    var senderCounts = self.getAudioVideoSenderCount();
    assert(senderCounts);
    if (senderCounts.video >= RtcModule.kMaxCallVideoSenders) {
        var msg = "Can't enable video sending, too many video senders in call";
        self.logger.warn(msg);
        return Promise.reject(msg);
    }

    self._isCapturingScreen = screen;
    self._notifyLocalMuteInProgress();
    var sessions = self.sessions;
    var pms = self._getLocalVideo(screen);
    pms.catch(function(err) {
        // can't enable camera/screen capture
        self._isCapturingScreen = false;
        self.logger.warn("Error getting local video: " + err);
        self._notifyLocalMuteComplete(err);
    });

    pms.then(function() {
        if (self.state >= CallState.kTerminating) {
            return;
        }
        var videoTrack = self.gLocalStream.getVideoTracks()[0];
        assert(videoTrack);
        if (screen) {
            var manager = self.manager;
            videoTrack.onended = function() {
                var call = manager.calls[self.chatid];
                if (call) {
                    if (call.id === self.id) {
                        call._onScreenCaptureEndedByFloatButton();
                    } else {
                        manager.logger.warn("Screen sharing track stop event: " +
                            "There is a new call in the chatroom, but the old screen stream is still active");
                    }
                } else {
                    // Support stopping screen sharing during call recovery
                    var recovery = manager.callRecoveries[chatid];
                    if (recovery) {
                        var stream = recovery.localStream;
                        assert(stream);
                        stream.removeTrack(stream.getVideoTracks()[0]);
                        recovery.av &= ~(Av.Video | Av.Screen);
                    }
                }
            };
        }
        // added video track to local stream, now add it to all sessions
        if (Object.keys(sessions).length === 0) {
            self._checkLocalMuteCompleted();
        } else {
            for (var sid in sessions) {
                sessions[sid]._addVideoTrack(videoTrack);
            }
        }
        if (!self.isOnHold()) {
            self._bcastLocalAvChange();
        }
    })
    .catch(function() {
        // silence logging an unhandled promise reject in the console,
        // since the error is passed to the pms.then() branch as well
    });
    return self._localMuteCompletePromise;
};

Call.prototype.disableVideo = function() {
    var self = this;
    var err = self._canEnableDisableVideo(false);
    if (err) {
        self.logger.warn(err);
        return Promise.reject(err);
    }
    delete self._isCapturingScreen;
    self._notifyLocalMuteInProgress();
    RTC.streamStopAndRemoveVideoTracks(self.gLocalStream);
    var sessions = self.sessions;
    if (Object.keys(sessions).length === 0) {
        self._checkLocalMuteCompleted();
    } else {
        for (var sid in sessions) {
            sessions[sid]._removeVideoTrack();
        }
    }
    if (!self.isOnHold()) {
        self._bcastLocalAvChange();
    }
    return self._localMuteCompletePromise;
};

Call.prototype.enableScreenCapture = function() {
    var self = this;
    if (!RTC.supportsScreenCapture) {
        return Promise.reject("Screen capture is not supported by this browser");
    }
    if (self._isCapturingScreen) {
        return Promise.reject("Screen capture already enabled");
    }
    var pms = (self.localAv() & Av.Video) ? self.disableVideo() : Promise.resolve();
    return pms
    .then(function() {
        return self._enableVideo(true);
    });
};

Call.prototype.enableCamera = function() {
    var self = this;
    var localAv = self.localAv();
    var pms;
    if (localAv & Av.Video) {
        if ((localAv & Av.Screen) === 0) {
            return Promise.reject("Camera already enabled");
        } else {
            pms = self.disableVideo();
        }
    } else {
        pms = Promise.resolve();
    }
    return pms
    .then(function() {
        return self._enableVideo(false);
    });
};

Call.prototype._onScreenCaptureEndedByFloatButton = function() {
    var self = this;
    if (!self._isCapturingScreen) {
        self.logger.warn("Received stop button click from screen capture, but we are not capturing screen, ignoring");
        return;
    }
    delete self._isCapturingScreen;
    self.logger.log("Screen capture ended by floating button, muting video");
    self.disableVideo().catch(function(err) {});
};

Call.prototype.isScreenCaptureEnabled = function() {
    return this._isCapturingScreen;
};

Call.prototype._bcastLocalAvChange = function() {
    this._bcastCallData(null); // this also calls _updateOwnPeerAvState();
    // For compatibility with older native clients that support only 1on1 calls, send RTMSG_MUTE as well
    if (!this.isGroup) {
        var av = this.localAv();
        var sessions = this.sessions;
        for (var sid in sessions) {
            sessions[sid]._sendAv(av);
        }
    }
};

Call.prototype._configFromRecovery = function(recovery) {
    this.recovery = recovery;
    this._isCapturingScreen = recovery._isCapturingScreen;
    this._onHoldRestoreAv = recovery._onHoldRestoreAv;
    this.gLocalStream = recovery.gLocalStream;
    delete recovery.gLocalStream;
    delete this.manager.callRecoveries[this.chatid];
    if (this.chat.callInfo.participantCount() < 1) {
        // We are doing a "blind" call reacovery - call does not exist anymore at chatd, but we are sending a JOIN
        // in hope everybody dropped out unexpectedly (chatd restart or all were on same network). In this case,
        // we don't want to register a new call before anyone actually replies the blind JOIN
        recovery.isBlind = true;
    }
    this._fire('onCallRecovering', this, this.chat.tsCallStart);
};

Call.prototype.localAv = function() {
    var av = Av.fromStream(this.gLocalStream);
    if ((av & Av.Video) && this._isCapturingScreen) {
        av |= Av.Screen;
    }
    if (this.isOnHold()) {
        av |= Av.OnHold;
    }
    return av;
};

Call.prototype.isOnHold = function() {
    return this._onHoldRestoreAv != null;
};

Call.prototype.putOnHold = function() {
    var self = this;
    if (self._onHoldRestoreAv != null) {
        var msg = "putOnHold: Call already on hold";
        self.logger.warn(msg);
        return;
    }
    var av = self._onHoldRestoreAv = self.localAv();
    if (self.gLocalStream) {
        Av.enableAllTracks(self.gLocalStream, false);
        var sessions = self.sessions;
        for (var sid in sessions) {
            var rtcConn = sessions[sid].rtcConn;
            if (rtcConn) {
                Av.enableAllTracks(rtcConn.outputStream, false);
            }
        }
    }
    self._muteUnmuteRemoteStreams(true);
    self._bcastLocalAvChange();
    // Force GUI update
    self._fire('onLocalMuteComplete');
};

Call.prototype._muteUnmuteRemoteStreams = function(mute) {
    var sessions = this.sessions;
    for (var sid in sessions) {
        var sess = sessions[sid];
        Av.enableAllTracks(sess.remoteStream, !mute);
    }
};

Call.prototype.releaseOnHold = function() {
    var self = this;
    if (!self.isOnHold()) {
        var msg = "releaseOnHold: Call is not on hold";
        self.logger.warn(msg);
        return;
    }

    // It's possible that while we are putting the other call on hold and enabling video,
    // another call becomes active, so that we end up with more than one active call. Therefore, having
    // only one active call at any time is not guaranteed
    self.manager.putAllActiveCallsOnHold();

    var restoreAv = self._onHoldRestoreAv;
    delete self._onHoldRestoreAv;

    if (self.gLocalStream) {
        if (restoreAv & Av.Audio) {
            Av.enableAudio(self.gLocalStream, true);
        }
        if (restoreAv & Av.Video) {
            Av.enableVideo(self.gLocalStream, true);
        }
    }
    var sessions = self.sessions;
    for (var sid in sessions) {
        var rtcConn = sessions[sid].rtcConn;
        if (restoreAv & Av.Audio) {
            Av.enableAudio(rtcConn.outputStream, true);
        }
        if (restoreAv & Av.Video) {
            Av.enableVideo(rtcConn.outputStream, true);
        }
    }
    // trigger DOM update
    self._fire('onLocalMuteComplete');
    self._muteUnmuteRemoteStreams(false);
    self._bcastLocalAvChange();
};

/** Protocol flow:
    C(aller): broadcast CALLDATA payloadLen.2 callid.8 type.1 avflags.1
       => state: CallState.kReqSent
    A(nswerer): send CALL_RINGING
       => state: CallState.kRingIn
    C: may send CALL_REQ_CANCEL callid.8 reason.1 if caller aborts the call request.
       The reason is normally Term.kUserHangup or Term.kAnswerTimeout
    A: may broadcast CALL_REQ_DECLINE callid.8 reason.1 if answerer rejects the call, or if
       the user is currently in another call: if that call is in the same chatroom, then the reason
       is kErrAlready, otherwise - kBusy.
       In group calls, CALL_REQ_DECLINE is ignored by the caller, as a group call request can't be rejected by
       a single user. In 1on1 rooms, the caller should abort the call by broadcasting CALL_REQ_CANCEL,
       with the reason from the received CALL_REQ_DECLINE, and the kPeer bit set. All other clients should stop
       ringing when they receive the CALL_REQ_CANCEL.
    == (from here on we can join an already ongoing group call) ==
    A: broadcast RTCMD.JOIN callid.8 anonId.8 flags.1
        => state: CallState.kJoining
        => isJoiner = true
        Other clients of user A will receive the answering client's JOIN (if call
        was answered), or CALL_REQ_DECLINE (in case the call was rejected), and will know that the call has
        been handled by another client of that user. They will then dismiss the "incoming call"
        dialog and stop ringing.

        In 1on1 calls, when the call initiator receives the first JOIN, it broadcasts a CALLDATA packet
        with type kNotRinging, signifying that the call was answered, so the other clients can stop ringing.

        Note: In case of joining an ongoing call, the callid is generated locally
          and does not match the callid if the ongoing call, as the protocol
          has no way of conveying the callid of the ongoing call. The responders
          to the JOIN will use the callid of the JOIN, and not the original callid.
          The callid is just used to match command/responses in the call setup handshake.
          Once that handshake is complete, only session ids are used for the actual 1on1 sessions.

    C: Creates a new session with random sid, and state SessState.kWaitSdpOffer
        => send SESSION callid.8 sid.8 anonId.8 encHashKey.32 actualCallId.8 flags.1
        => call state: CallState.kCallInProgress (in case of group calls call state may already be kCallInProgress)

    A: send SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        => call state: CallState.kInProress
        => sess state: SessState.kWaitSdpAnswer
    C: send SDP_ANSWER sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
        => state: SessState.kWaitMedia
    A and C: exchange ICE_CANDIDATE sid.8 mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen

    Once the webrtc session is connected (ICE connection state changes to 'connected'),
    and this is the first connected session for that client, then the call is locally considered
    as started, and the GUI transitions to the in-call state.

    A or C: may send MUTE sid.8 avState.1 (if user mutes/unmutes audio/video) together with
        CALLDATA of type kMute.

        Webrtc does not have an in-band notification of stream muting
        (needed to update the GUI), so we do it out-of-band.
        The client that sends the MUTE also sends a CALLDATA packet with type kMute and
        its new audio and video send state, in order to notify clients that are not in
        the call, so they can count the available audio/video slots within a group call.
        At a later stage, we may want to stop sending the RTCMD.MUTE command at all and only
        use the CALLDATA (which ws introduced at a later stage).
    A or C: send SESS_TERMINATE sid.8 reason.1
        => state: SessState.kTerminating
    C or A: send SESS_TERMINATE_ACK sid.8
        => state: Sess.kDestroyed
    A or C: close webrtc connection upont receipt of terminate ack,
        or after a timeout of 1-2 seconds. The terminate ack mechanism prevents
        the peer from thinking that the webrtc connection was closed
        due to error
        => state: Sess.kDestroyed
@note avflags of caller are duplicated in CALLDATA and RTCMD.SDP_OFFER
The first is purely informative, to make the callee aware what type of
call the caller is requesting - audio or video.

== INCALL, ENDCALL protocol ==
Each client that is involved in a call, periodically sends an INCALL ping packet to the server.
The server keeps track of all actively pinging clients, and dumps a list of them to clients that log
into that chatroom, and sends deltas in realtime when new clients join or leave. When a client leaves a call,
it sends an ENDCALL. If it times out to send an INCALL ping, the server behaves as if that client sent
an ENDCALL (i.e. considers that client went out of the call). This mechanism allows to keep track of
whether there is an ongoing call in a chatroom and who is participating in it at any moment.
This is how clients know whether they can join an ongoing group call.

== CALLDATA protocol ==
- Overview -
CALLDATA is a special packet that can contain arbitrary data, is sent by clients, and is stored on the server
per-client. The server stores only the last such packet received from each client. When a client
sends such a packet, the server also broadcasts it to all other clients in that chatroom. Upon JOIN
to a chatroom, the server dumps the CALLDATA blobs stored for all clients (i.e. the last ones they sent).
After that, any new CALLDATA a client sends is broadcast to everyone in the room.

- Call request -
The CALLDATA mechanism was initially introduced to allow for call requests to be received
via mobile PUSH. When the call request is broadcast, a mobile client is likely to not be running.
It would be started by the OS upon receipt by the PUSH event, but it would miss the realtime
call request message. Therefore, the call request needed to be persisted on the server.
This is done in the form of binary BLOBs stored on the server for each connected client in a chatroom.
A client sends such a blob via a CALLDATA command. The server stores that BLOB,
replacing any other previously stored (if any) for that client. Also, the server broadcasts
the received CALLDATA command to all clients in the chatroom. When a new client JOINs that chatroom,
the server dumps all CALLDATA BLOBs stored for all clients connected to the chatroom
(even before any history fetch is done).
This would allow for the call initiator to persist a CALLDATA BLOB on the server, that signifies
a call request (having a type kRinging). When the call is answered, the caller is responsible
for overwriting the kRinging CALLDATA with one that signals the call has been answered -
a type kNotRinging CALLDATA. When the call is destroyed at the client side, it sends a CALLDATA packet
of type kTerminated (0x02), and also an ENDCALL. A client sending an ENDCALL (or timing out the INCALL ping)
results in its CALLDATA not being sent by the server to clients that log into that chatroom.

- Call established -
In order for the server to know when (and if) the call actually started successfully, clients post a
CALLDATA of type kSession (0x03) as soon as their first webrtc media connection is successfully
established. There is one exception to this - in a group call should continue ringing for a fixed
period of time, even after people answer it. In order to achieve that, the call initiator should not
overwrite their kRinging CALLDATA, which would happen if they send kSession when first webrtc connection
is established. Still, the other peer in that webrtc connection would sent kSession and chatd
will be notified.

- Call end -
Later, the CALLDATA mechanism was extended to facilitate posting management messages (to chat history)
about call events - particularly about the start and end of a call. The posting of these call management
messages is done by the server. For call-ended messages, it needs to figure out the reason for the call termination,
in order to display "Call was not answered", "Call ended normally", "Call failed", "Call request was canceled", etc.
To do that, clients send CALLDATA of type kTerminated (0x03) to the server when they destroy the call locally,
with a reason code. When a client just sends an ENDCALL or times out the INCALL ping (e.g. because of disconnect),
the server assumes it left the call due to an error. When all clients have left the call,
the server combines the reasons they reported and posts a call-ended management message in the history.

- Example CALLDATA flow -

 = An answered group call
    C: (initiates a group call):
            sends kRinging CALLDATA
    CHATD: assumes there is a new call, starts the call duration timer
    A1: (picks up the call):
            doesn't send any CALLDATA immediately.
    A2: (picks up the call):
            doesn't send any CALLDATA immediately.
    A1: (first webrtc p2p connection established):
            sends kSession CALLDATA. Chatd detects call start, resets
            the duration timer and posts a call-started management message in history.
    C: (first webrtc p2p connection established):
            sends kSessionKeepRinging - a normal kSession would stop the ringing
                to other clients
    A2: (first webrtc p2p connection established):
            sends kSession CALLDATA
    C: (fixed time after it initiated the call):
            sends kNotRinging CALLDATA. Clients that haven't picked up stop ringing.
    A2: (leaves the call):
            sends kTerminated CALLDATA with reason ENDED
            sends ENDCALL
    A1: (went offline due to network issues):
            INCALL ping times out. Server assumes it sent ENDCALL and
            CALLDATA of type kTerminate with reason FAILED
    C: (leaves the call as it is the only client left in the call):
            sends kTerminated CALLDATA with reason ENDED
            sends ENDCALL
    CHATD: posts a call-ended management message with reason ENDED
            and duration from the moment since it received the first kSession or kSessionKeepRinging

  = An unanswered group call
    C: (initiates a group call):
        sends kRinging CALLDATA
    CHATD: assumes there is a new call, starts the call duration timer
    (15 seconds pass)
    A1: (user rejects the ringing call, client stops ringing locally):
        sends kTerminated CALLDATA with reason REJECTED
        sends ENDCALL
    (25 seconds pass, other clients keep ringing)
    C: (aborts the unanswered call):
        sends kTerminated CALLDATA with reason NO_ANSWER
        sends CALLDATA
    CHATD: posts a call-ended management message with reason NO_ANSWER and
        duration since the kRinging CALLDATA (40 seconds)

    = An established 1on1 call
    C: (initiate call):
        sends kRinging CALLDATA
    CHATD: assumes there is a new call, starts the call duration timer
    A: (answers the call):
        does not send any CALLDATA
    A: (first webrtc media channel established):
        sends kSession CALLDATA
    A: (first webrtc media channel established):
        sends kSession CALLDATA
    C: (hangs up the call):
        sends kTerminated CALLDATA with reason ENDED
        sends ENDCALL
    A: (hangs up the call because the peer hung up):
        sends kTerminated CALLDATA with reason ENDED
        sends ENDCALL
    CHATD: posts a call-ended management message with reason ENDED and duration
        since the first received kSession CALLDATA

  = A rejected 1on1 call
    C: (initiates the call):
        sends kRinging CALLDATA
    A: (rejects the call):
        sends kTerminated CALLDATA with reason REJECTED
        sends ENDCALL
    (immediately after that)
    C: (aborts the call)
        sends kTerminated CALLDATA
        sends ENDCALL
    CHATD: posts a call-ended management message with reason REJECTED and duration
    since the kRinging CALLDATA

- Audio/video slots -
In group calls, the number of audio and video senders and receivers has to be kept track of,
in order to not overload client with too many streams. This means that a client may be disallowed
to join a call with camera enabled, with microphone enabled, or even disallow join at all, even without
sending any media. This is because of the mesh configuration of group calls - the bandwidth and processing
requirement grows exponentially with the number of stream senders, but also linearly with the number of passive
receivers (a stream sender is also a receiver). Therefore, all CALLDATA packets that a client sends include
its current audio/video send state. This allows even clients that are not in the call to keep track of how many
people are sending and receiving audio/video, and disallow the user to enable camera/mic or even join the call.
There is a dedicated CALLDATA type kMute that clients send for the specific purpose of updating the a/v send state.
It is send when the client mutes/unmutes camera or mic. Currently this CALLDATA is sent together with the RTCMD.MUTE
message, but in the future we may want to only rely on the CALLDATA packet.
*/
function Session(call, packet, sessParams) {
    // Packet can be RTCMD.SESSION or RTCMD.SDP_OFFER
    var self = this;
    self.call = call;
    var data = packet.data;
    self.chatd = call.manager.chatd;
    self.peer = packet.fromUser;
    self.peerClient = packet.fromClient;
    self.crypto = call.manager.crypto;
    self._networkQuality = -1;
    self._mediaHiccups = 0;
    self._mediaHiccupMaxDur = 0;
    self._terminatePromise = createPromiseWithResolveMethods();
    self._peerAv = 0;
    self.appData = {};
    self.inputQueue = []; // packets are queued here until asyncInit() (i.e. crypto) is ready
    if (packet.type === RTCMD.SDP_OFFER) { // peer's offer
        assert(sessParams);
        // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        self.isJoiner = false;
        self.sid = data.substr(0, 8);
        self.state = SessState.kWaitLocalSdpAnswer;
        self.peerAnonId = data.substr(8, 8);
        self.peerSupportsReneg = sessParams.peerSupportsReneg;
        var ohk = sessParams.ownHashKey;
        assert(ohk && ohk.length === 32);
        self.ownHashKey = ohk;
        // The peer is likely to send ICE candidates immediately after the offer,
        // but we can't process them until setRemoteDescription is ready, so
        // we have to store them in a queue
        self.peerHash = data.substr(48, 32);
        self._encryptedPeerHashKey = data.substr(16, 32);
        self._peerAv = data.charCodeAt(80);
        var sdpLen = Chatd.unpack16le(data.substr(81, 2));
        assert(data.length >= 83 + sdpLen);
        self.peerSdpOffer = data.substr(83, sdpLen);
    } else if (packet.type === RTCMD.SESSION) {
        assert(!sessParams);
        // SESSION callid.8 sid.8 anonId.8 encHashKey.32
        self.isJoiner = true;
        self.sid = data.substr(8, 8);
        self.state = SessState.kWaitSdpAnswer;
        assert(data.length >= 56);
        self.ownHashKey = self.crypto.random(32);
        self.peerAnonId = data.substr(16, 8);
        self._encryptedPeerHashKey = data.substr(24, 32);
        self.peerSupportsReneg = ((packet.data.charCodeAt(64) & Caps.kSupportsStreamReneg) !== 0);
    } else {
        assert(false, "Attempted to create a Session object with packet of type",
            constStateToText(RTCMD, packet.type));
    }
    self.stringSid = base64urlencode(self.sid);
    self.logger = MegaLogger.getLogger("sess[" + self.stringSid + "]", call.manager._loggerOpts, call.logger);
    self.setupTimer = setTimeout(function() {
        if (self.state >= SessState.kSessInProgress) {
            return;
        }
        var term;
        if (self.state === SessState.kConnecting) {
            assert(self.rtcConn);
            assert(self._tsSdpHandshakeCompleted);
            var iceState = self.rtcConn.iceConnectionState;
            // if ICE server does not respond, only one side may be stuck to 'checking',
            // the other one may be at 'new'.
            var iceTime = Date.now() - self._tsSdpHandshakeCompleted;
            if (iceTime > RtcModule.kIceTimeout) {
                term = Term.kErrIceTimeout;
                self.logger.warn("ICE connect timed out - " + iceTime / 1000 +
                    "seconds elapsed. Terminating session with kErrIceTimeout");
            }
        }
        if (!term) {
            term = Term.kErrSessSetupTimeout;
        }
        self.terminateAndDestroy(term);
    }, RtcModule.kSessSetupTimeout);
}

Session.prototype._processInputQueue = function() {
    var queue = this.inputQueue;
    if (!queue) {
        return;
    }
    // Keep input queue, so that if somehow we get passed a new packet while processing the queue,
    // it gets enqueued and processed in order
    if (queue.length === 0) {
        delete this.inputQueue;
        return;
    }
    this.logger.warn("Packets were queued while crypto was being initialized, processing them...");
    try {
        do {
            this.processMsg(queue.shift());
        } while (queue.length > 0);
        this.logger.warn("Done processing queued packets");
    } catch(e) {
        if (this.state < Term.kTerminating) {
            this.terminateAndDestroy(Term.kErrInternal);
        }
        throw e;
    }
    finally {
        delete this.inputQueue;
    }
};

Session.prototype._asyncInit = function() {
    var self = this;
    assert(self._encryptedPeerHashKey);
    return self.crypto.loadCryptoForPeer(self.peer)
    .catch(function(err) {
        if (self.state < SessState.kTerminating) {
            self.terminateAndDestroy(Term.kErrCrypto);
        }
        return Promise.reject(err);
    })
    .then(function() {
        if (self.state >= SessState.kTerminating) {
            return Promise.reject();
        }
        try {
            self.peerHashKey = self.crypto.decryptNonceFrom(self.peer, self._encryptedPeerHashKey);
        } catch(e) {
            self.terminateAndDestroy(Term.kErrCrypto);
            return Promise.reject();
        }
        try {
            self._createRtcConn();
        } catch(e) {
            self.terminateAndDestroy(Term.kErrInternal);
            return Promise.reject();
        }
        return self;
    });
};

Session.prototype._setState = function(newState) {
    var oldState = this.state;

    if (oldState === newState) {
        return false;
    }

    assertStateChange(
        oldState,
        newState,
        SessStateAllowedStateTransitions,
        SessState
    );

    this.state = newState;

    if (d) { /* performance, save some loops/closures creation CPU/memory */
        this.logger.log(
            "State changed: ",
            constStateToText(SessState, oldState),
            ' -> ',
            constStateToText(SessState, newState)
        );
    }
    this._fire("onStateChange", this.state);
};

Session.prototype.processSdpOfferSendAnswer = function() {
    // offer must be in self.peerSdpOffer
    // sdp hash must be in self.peerHash
    var self = this;
    if (!self.verifySdpFingerprints(self.peerSdpOffer)) {
        self.logger.warn("Fingerprint verification error, immediately terminating session");
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forge attempt");
        return Promise.reject("Fingerprint verification failed");
    }
    var sdp = new RTCSessionDescription({type: 'offer', sdp: self.peerSdpOffer});
    self._mungeSdp(sdp);
    return self.rtcConn.setRemoteDescription(sdp)
    .then(function() {
        return self._sendSdpAnswer();
    });
};

Session.prototype._sendSdpAnswer = function() {
    var self = this;
    if (self.state > SessState.kSessInProgress) {
        return Promise.reject("Session killed");
    }

    return self.rtcConn.createAnswer(self.pcConstraints())
    .then(function(sdp) {
        if (self.state > SessState.kSessInProgress) {
            return Promise.reject("Session killed");
        }
        self.ownSdpAnswer = sdp.sdp;
        return self.rtcConn.setLocalDescription(sdp);
    })
    .catch(function(err) {
        // self.cmd() doesn't throw, so we are here because of other error
        var msg;
        if (err.stack) {
            err = err.stack;
        }
        msg = "Error creating SDP answer: " + err;
        self.terminateAndDestroy(self._streamRenegTimer ? Term.kErrStreamReneg : Term.kErrSdp, msg);
        return Promise.reject(err);
    })
    .then(function() {
        var opcode;
        if (self.state < SessState.kSessInProgress) { // initial
            self._tsSdpHandshakeCompleted = Date.now();
            self._setState(SessState.kConnecting);
            opcode = RTCMD.SDP_ANSWER;
        } else if (self.state === SessState.kSessInProgress) {
            opcode = RTCMD.SDP_ANSWER_RENEGOTIATE;
        } else {
            self.logger.log("_sendSdpAnswer: aborting, session in state " + constStateToText(SessState, self.state));
            return;
        }
        // SDP_ANSWER sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
        self.ownFprHash = self.crypto.mac(self.ownSdpAnswer, self.peerHashKey);
        var success = self.cmd(
            opcode,
            self.ownFprHash +
            String.fromCharCode(self.call.localAv()) +
            Chatd.pack16le(self.ownSdpAnswer.length) +
            self.ownSdpAnswer
        );
        if (success) {
            self.logger.log("Successfully generated and sent SDP answer");
        }
    })
};

Session.prototype.pcConstraints = function() {
    return this.call.manager.pcConstraints;
};

Session.prototype.peerNetworkQuality = function() {
    return this._networkQuality;
};

Session.prototype._updatePeerNetworkQuality = function(q) {
    if (q === this._networkQuality) {
        return;
    }
    this._networkQuality = q;
    this._fire('onPeerNetworkQualityChange', q);
    this.call.manager._notifySessionNetQualityChange(q);
};

Session.prototype.handleMsg = function(packet) {
    if (this.inputQueue) {
        this.inputQueue.push(packet);
        this.logger.log("Session not ready, queueing RTCMD.%s packet", constStateToText(RTCMD, packet.type));
     }
     else {
        this.processMsg(packet);
     }
};

Session.prototype.processMsg = function(packet) {
    this.logger.log("Processing RTCMD." + constStateToText(RTCMD, packet.type));
    switch (packet.type) {
        case RTCMD.SDP_ANSWER:
            this.msgSdpAnswer(packet);
            return;
        case RTCMD.SDP_OFFER_RENEGOTIATE:
            this.msgSdpOfferRenegotiate(packet);
            return;
        case RTCMD.SDP_ANSWER_RENEGOTIATE:
            this.msgSdpAnswerRenegotiate(packet);
            return;
        case RTCMD.ICE_CANDIDATE:
            this.msgIceCandidate(packet);
            return;
        case RTCMD.END_ICE_CANDIDATES:
            this.msgEndIceCandidates(packet);
            return;
        case RTCMD.SESS_TERMINATE:
            this.msgSessTerminate(packet);
            return;
        case RTCMD.SESS_TERMINATE_ACK:
            this.msgSessTerminateAck(packet);
            return;
        case RTCMD.MUTE:
            this.msgMute(packet);
            return;
        default:
            this.logger.warn("Don't know how to handle", constStateToText(RTCMD, packet.type));
            return;
    }
};

Session.prototype._createRtcConn = function() {
    var self = this;
    var iceServers;
    var iceFails = self.call.iceFails[self.peer + self.peerClient];
    if (iceFails) {
        iceServers = RTC.fixupIceServers(self.call.manager.allIceServers);
        this.logger.error("Using ALL ICE servers, because ICE to this peer has failed " + iceFails + " times");
    } else {
        iceServers = self.call.manager.iceServers;
        this.logger.log("Using ICE servers:", JSON.stringify(iceServers[0].urls));
    }
    var pcOptions = { iceServers: iceServers, sdpSemantics: 'unified-plan' };
    if (RtcModule.cfg.forceRelay) {
        pcOptions.iceTransportPolicy = 'relay';
    }
    var conn = self.rtcConn = RTC.peerConnCreate(pcOptions);
    var stream = self.call.gLocalStream;
    if (stream) {
        RTC.peerConnAddClonedTracksFromStream(conn, stream);
    }
    conn.onicecandidate = function(event) {
        if (self._streamRenegTimer) {
            return; // ignore ICE candidated during stream renegotiation, they should not be needed
        }
        // mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen
        var cand = event.candidate;
        var candString;
        if (!cand || (candString = cand.candidate).length === 0) {
            // Edge needs a null candidate to signal end of received candidates, but current clients
            // don't tolerate ICE_CANDATE packets without payload, so we introduce a new packet type
            // that will be simply ignored by older clients
            self.cmd(RTCMD.END_ICE_CANDIDATES);
            return;
        }
        if (RtcModule.cfg.forceRelay) {
        // "manual" match, in theory should not be needed, as we specify iceTransportPolicy=relay
        // but just in case iceTransportPolicy is not recognized
            var m = candString.match(/typ\s([^\s]+)/);
            if (m && (m.length > 1)) {
                var ctype = m[1];
                if (ctype !== 'relay') {
                    self.logger.warn("forceRelay: Not sending a '" + ctype + "' ICE candidate because it is not a relay");
                    return;
                }
            }
        }
        var idx = cand.sdpMLineIndex;
        var mid = cand.sdpMid;
        var data = String.fromCharCode(idx);
        if (mid) {
            data += String.fromCharCode(mid.length);
            data += mid;
        } else {
            data += '\0';
        }
        data += Chatd.pack16le(candString.length);
        data += candString;
        self.cmd(RTCMD.ICE_CANDIDATE, data);
    };
    conn.onaddstream = function(event) {
        self.logger.log("onaddstream");
        if (self.remoteStream) {
            self._fire("onRemoteStreamRemoved");
        }
        var stream = self.remoteStream = event.stream;
        self._fire("onRemoteStreamAdded", stream);
        if (stream.getAudioTracks().length) {
            if (RtcModule.cfg.showStats) {
                // Audio level notifications for all peers seems to require too much CPU
                self.audioLevelMonitor = new AudioLevelMonitor(stream, function(level) {
                    var ind = self.audioIndicator;
                    if (ind) {
                        ind.indicateAudioLevel(level);
                    }
                }, 0.01);
                // self.audioLevelMonitor.enableSmoothing(4);
            }
        }
        if (self.state > SessState.kSessInProgress) {
            return;
        }

        // FIXME: We never had audio work from the GUI player if video is disabled,
        // and the audio was coming from this 'internal' player. We need to fix that ASAP
        if (self.mediaWaitPlayer) {
            self.mediaWaitPlayer.pause();
        }
        var player = self.mediaWaitPlayer = document.createElement('audio');
        RTC.attachMediaStream(player, self.remoteStream);
    };
    conn.onremovestream = function(event) {
        if (self.audioLevelMonitor) {
            self.audioLevelMonitor.disconnect();
        }
        self._fire("onRemoteStreamRemoved");
        self.remoteStream = null;
    };
    conn.onnegotiationneeded = function(event) {
        if (self.state !== SessState.kSessInProgress) {
            if (self.state < SessState.kSessInProgress) {
                // If we are still in the initial SDP handshake, we don't want to interfere with it,
                // but renegotiate only after it completes, when the ICE state goes to 'connected'
                self._renegotiateAfterInitialConnect = true;
            }
            return;
        }

        // This callback is sometimes fired multiple times in a row. We should act only at the first call
        if (self._onNegotiationNeededCalled) {
            self.logger.warn("Ignoring multiple calls of onNegotiationNeeded (seems to be a Chrome bug)");
            return;
        }
        self._onNegotiationNeededCalled = true;
        assert(self._streamRenegTimer == null);
        self._setStreamRenegTimeout();
        self.logger.log("onNegotiationNeeded while in progress, sending sdp offer");
        self.sendOffer();
    };
    conn.ontrack = function(event) {
        self.logger.debug("ontrack:", streamInfo(event.streams[0]));
    };

    conn.onsignalingstatechange = function(event) {
        var state = conn.signalingState;
        self.logger.log('Signaling state change to', state);
    };
    conn.oniceconnectionstatechange = function (event) {
        var state = conn.iceConnectionState;
        self.logger.log('ICE connstate changed to', state);
        if (self.state >= SessState.kTerminating) { // use double equals because state might be
            return;                                 // some internal enum that converts to string?
        }
        if (self._streamRenegTimer && self.state === SessState.kSessInProgress) {
            return;
        }
        if (state === 'disconnected') {
            // Firefox appears to continue showing / sending video even after 'disconnected',
            // may switch back to 'connected', but that may take longer that our timer, so we ignore this event
            // The side effect is that we don't have a safety timer to prevent a stuck 'disconnected' state,
            // but it appears to reliably fire a 'failed' event if it can't recover. After 'failed', the video
            // finally stops
            if (RtcModule.cfg.tearSessOnMediaDisconn) {
                self.terminateAndDestroy(Term.kErrIceDisconn);
                return;
            }
            if (!RTC.isFirefox) {
                self._handleMediaConnDisconnected();
            }
        }
        else if (state === 'failed') {
            self._handleMediaConnFailed();
        }
        else if (state === 'connected') {
            if (self.state === SessState.kSessInProgress) {
                if (RTC.isFirefox) {
                    assert(!self._tsLastMedia);
                }
                else {
                    self._handleMediaConnRecovered();
                }
                return;
            }
            assert(self.state !== SessState.kSessInProgress);
            self._setState(SessState.kSessInProgress);
            self._tsIceConn = Date.now();
            // We may have had a previous connect-disconnect cycle, clear the end of the previous
            delete self._tsLastMedia;
            self._fire("onConnect");
            if (RTC.Stats) {
                self._lostAudioPktAvg = 0;
                self.statRecorder = new RTC.Stats.Recorder(conn, 5, self);
            }
            self.call._notifySessionConnected(self);
            // DEBUG: Enable this to simulate session ICE disconnect
            /*
            if (self.isJoiner)
            {
                setTimeout(() => {
                    if (self.state < SessState.kTerminating) {
                        self.terminateAndDestroy(Term.kErrIceFail);
                    }
                }, 4000);
            }
            */
        }
    };
    conn.onconnectionstatechange = function(event) {
        self.logger.log("Connstate changed to", conn.connectionState);
        if (conn.connectionState === "failed") {
            self._handleMediaConnFailed();
        }
    };
    // RTC.Stats will be set to 'false' if stats are not available for this browser
    if ((typeof RTC.Stats === 'undefined') && (typeof statsGlobalInit === 'function')) {
        statsGlobalInit(conn);
    }
};

Session.prototype._addVideoTrack = function(videoTrack) {
    var self = this;
    videoTrack = videoTrack.clone();
    if (self.peerIsOnHold()) {
        videoTrack.enabled = false;
    }
    if (RTC.peerConnCanReplaceVideoTrack(self.rtcConn)) {
        // we can just replace the track at the sender
        self._setStreamRenegTimeout();
        RTC.peerConnReplaceVideoTrack(self.rtcConn, videoTrack)
        .then(function() {
            self._notifyRenegotiationComplete();
        });
    }
    else { // no videoSender or we don't have replaceTrack support
        if (RTC.supportsUnifiedPlan && self.peerSupportsReneg) {
            RTC.peerConnAddVideoTrack(self.rtcConn, videoTrack);
        }
        else {
            self.terminateAndDestroy(Term.kStreamChange);
        }
    }
};

Session.prototype._removeVideoTrack = function() {
    var self = this;
    if (RTC.supportsReplaceTrack) {
        var pc = self.rtcConn;
        assert(pc);
        var pms = RTC.peerConnRemoveVideoTrack(pc);
        // pms is null if there was no video track
        if (!pms) {
            self.logger.warn("Session._removeVideoTrack: Peerconnection's sender doesn't have a video track");
            return;
        }
        self._setStreamRenegTimeout();
        pms.then(function() {
            self._notifyRenegotiationComplete();
        });
        pms.catch(function(err) { // replaceTrack(null) is not supported
            self.logger.warn("peerConnRemoveVideoTrack() returned failed promise: " + err +
                " falling back to session reconnect");
            self.terminateAndDestroy(Term.kStreamChange);
        });
    } else {
        self.terminateAndDestroy(Term.kStreamChange);
    }
};

Session.prototype._handleMediaConnDisconnected = function() {
    var self = this;
    self._clearMediaRecoveryTimer();
    self._tsLastMedia = Date.now(); // needed for stats about media stall time
    self._mediaRecoveryTimer = setTimeout(function() {
        if (self.state < SessState.kTerminating && self.rtcConn.iceConnectionState !== 'connected') {
            self.logger.warn("Timed out waiting for media connection to recover, terminating session");
            self.terminateAndDestroy(Term.kErrIceDisconn);
        }
    }, RtcModule.kMediaConnRecoveryTimeout);
};

Session.prototype._handleMediaConnRecovered = function() {
    var self = this;
    self._clearMediaRecoveryTimer();
    if (self._tsLastMedia) {
        self._mediaHiccups++;
        var hiccupDur = Date.now() - self._tsLastMedia;
        delete self._tsLastMedia;
        if (hiccupDur > self._mediaHiccupMaxDur) {
            self._mediaHiccupMaxDur = hiccupDur;
        }
        self.logger.log("Incoming media stalled for " + hiccupDur + " ms");
    }
    self.logger.log("Media stream successfully recovered by webRTC");
};

Session.prototype._handleMediaConnFailed = function() {
    var self = this;
    if (RTC.isFirefox) {
        self._tsLastMedia = Date.now();
    }
    self.terminateAndDestroy(self.state === SessState.kSessInProgress
        ? Term.kErrIceDisconn // We can have 'failed' when webRTC gives up trying to recoved after 'disconnected'
        : Term.kErrIceFail // or when initial ICE discovery fails
    );
};

Session.prototype._clearMediaRecoveryTimer = function() {
    var self = this;
    if (!self._mediaRecoveryTimer) {
        return;
    }
    clearTimeout(self._mediaRecoveryTimer);
    delete self._mediaRecoveryTimer;
};

Session.prototype._setStreamRenegTimeout = function() {
    var self = this;
    assert(!self._streamRenegTimer);
    self._streamRenegTimer = setTimeout(function() {
        if (!self._streamRenegTimer || self.state >= SessState.kTerminating) {
            return;
        }
        self.terminateAndDestroy(Term.kErrStreamRenegTimeout);
    }, RtcModule.kStreamRenegTimeout);
};

Session.prototype._notifyRenegotiationComplete = function() {
    var self = this;
    assert(self._streamRenegTimer);
    clearInterval(self._streamRenegTimer);
    delete self._streamRenegTimer;
    delete self._onNegotiationNeededCalled;
    self.call._checkLocalMuteCompleted();
};

// stats interface
Session.prototype.onStatCommonInfo = function(info) {
};

Session.prototype.onStatSample = function(sample, added) {
    // pollStats() calls us, and does it only if the session has a statRecorder
    // Note that the call is asynchronous, so the statRecorder may be gone meanwhile
    if (!this.statRecorder) {
        return -1;
    }
    if (RtcModule.cfg.showStats) {
        this._sendTextStats(sample);
    }
    var ret = this.calcNetworkQuality(sample);
    if (Date.now() - this.statRecorder.getStartTime() >= 6000) {
        this._updatePeerNetworkQuality(ret);
    }
    return ret;
};

function relayType(rly) {
    if (rly == null) {
        return "?";
    }
    else if (rly) {
        return "relay";
    }
    return "direct";
}

Session.prototype._sendTextStats = function(sample) {
    var basic = this.statRecorder.basicStats;
    var a = sample.a;
    var v = sample.v;
    var str = "conn: " + relayType(basic.rly) + "-" + relayType(basic.rrly) +
        ", quality: " + this.peerNetworkQuality();
    var sub = "\nrtt: " + ((a.rtt != null) ? (a.rtt + " ms") : "?");
    var as = a.s;
    var ar = a.r;
    if (ar.kbps) {
        if (ar.jtr) {
            sub += ", jtr: " + ar.jtr + " ms";
        }
        sub += "\nrx: " + ar.kbps + " kbps";
        if (ar.pl) {
            sub += ", " + ar.pl + " pkt lost";
        }
        if (ar.nacktx) {
            sub += "nacktx: " + ar.nacktx;
        }
    }
    if (as.kbps) {
        sub += "\ntx: " + as.kbps + " kbps";
    }
    if (sub.length) {
        str += "\n  -- audio --" + sub;
    }

    var vr = v.r;
    var vs = v.s;
    sub = '';
    if (v.rtt != null) {
        sub += "\nrtt: " + v.rtt +  "ms";
    }
    if (vr.kbps) {
        sub += "\nrx: ";
        if (vr.width) {
            sub += vr.width + "x" + vr.height + ", ";
        }
        sub += vr.fps + "fps, " + vr.kbps + "kbps";
        if (vr.pl) {
            sub += ", " + vr.pl + " pkt lost";
        }
    }
    if (vs.kbps) {
        sub += "\ntx: ";
        if (vs.width) {
            sub += vs.width + "x" + vs.height + ", ";
        }
        sub += vs.fps + "fps, " + vs.kbps + "kbps";
    }
    if (sub.length) {
        str += "\n\n  -- video --" + sub;
    }
    // bypass ._fire because it will log the stats string
    this.handler.onStats(str);
};

Session.prototype._sendAv = function(av) {
    this.cmd(RTCMD.MUTE, String.fromCharCode(av));
};

Session.prototype.sendOffer = function() {
    var self = this;
    assert(self.peerHashKey);
    assert(self.peerAnonId);
    var isInitial = self.state < SessState.kSessInProgress;
    return self.rtcConn.createOffer(self.pcConstraints())
    .then(function(sdp) {
    /*  if (self.state !== SessState.kWaitSdpAnswer) {
            return;
        }
    */
        self.ownSdpOffer = sdp.sdp;
        return self.rtcConn.setLocalDescription(sdp);
    })
    .then(function() {
        // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        self.cmd(isInitial ? RTCMD.SDP_OFFER : RTCMD.SDP_OFFER_RENEGOTIATE,
            self.call.manager.ownAnonId +
            (isInitial
                ? self.crypto.encryptNonceTo(self.peer, self.ownHashKey)
                : '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0') +
            self.crypto.mac(self.ownSdpOffer, self.peerHashKey) +
            String.fromCharCode(self.call.localAv()) +
            Chatd.pack16le(self.ownSdpOffer.length) +
            self.ownSdpOffer
        );
    })
    .catch(function(err) {
        if (err.stack) {
            err = err.stack;
        }
        self.terminateAndDestroy(self._streamRenegTimer ? Term.kErrStreamReneg : Term.kErrSdp,
            "Error creating SDP offer: " + err);
        self.logger.error("Error creating SDP offer. Failed SDP offer: ", self.ownSdpOffer);
        return Promise.reject();
    });
};

Call.prototype.msgSdpOffer = function(packet) {
    // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
    var self = this;
    var sess;
    if (self.state !== CallState.kJoining && self.state !== CallState.kCallInProgress) {
        self.logger.warn("Ingoring unexpected SDP offer while in state", constStateToText(CallState, self.state));
        return;
    }
    var peerId = packet.fromUser + packet.fromClient;
    var sentParams = self._sentSessions[peerId];
    if (!sentParams) {
        self.logger.error("Received SDP_OFFER without having previously sent SESSION, ignoring");
        return;
    }
    var sid = packet.data.substr(0, 8);
    if (sid !== sentParams.sid) {
        self.logger.error("Received SDP_OFFER with sid different than the one we have last",
            "sent in a SESSION packet to this client in this call. Ignoring packet");
        return;
    }

    // create session to this peer
    self._addNewSession(packet, sentParams)
    .then(function(sess) {
        assert(sess.sid === sentParams.sid);
        sess._startAsNonJoiner();
    });
};

Session.prototype._startAsNonJoiner = function() {
    var self = this;
    assert(!self.isJoiner);
    self.processSdpOfferSendAnswer()
    .then(function() {
        self._processInputQueue();
    })
    .catch(function(err) {
        if (self.state < SessState.kTerminating) {
            self.terminateAndDestroy(kErrInternal);
        }
    });
};

Session.prototype.msgSdpOfferRenegotiate = function(packet) {
    var self = this;
    if (self.state !== SessState.kSessInProgress) {
        self.logger.warn("Ignoring SDP_OFFER_RENEGOTIATE received for a session not in kSessInProgress state");
        return;
    }

    var data = packet.data;
    var sdpLen = Chatd.unpack16le(data.substr(81, 2));
    assert(data.length >= 83 + sdpLen);
    self.peerSdpOffer = data.substr(83, sdpLen);
    self.peerHash = data.substr(48, 32);
    self._setStreamRenegTimeout();
    self.processSdpOfferSendAnswer()
    .then(function() {
        self._notifyRenegotiationComplete();
    });
};

Call.prototype._addNewSession = function(packet, params) {
    var sess = new Session(this, packet, params);
    var retry = this.sessRetries[sess.peer + sess.peerClient];
    if (retry) {
        sess._reconnInfo = retry;
    }
    this.sessions[sess.sid] = sess;
    this._notifyNewSession(sess);
    return sess._asyncInit();
};

Session.prototype.msgSdpAnswer = function(packet) {
    var self = this;
    if (self.state !== SessState.kWaitSdpAnswer) {
        self.logger.warn("Ignoring unexpected SDP_ANSWER while in state", constStateToText(SessState, self.state));
        return;
    }
    // We don't set to kConnecting state in the setRemoteDescription's success handler,
    // because on some browsers (i.e. Vivaldi) the ICE connection state callback may
    // get called with 'connected' state before this success handler gets called, resulting
    // in an invalid state transition from kWaitSdpAnswer to kSessInProgress (skipping kConnecting)
    self._setState(SessState.kConnecting);
    self._setRemoteAnswerSdp(packet)
    .then(function() {
        self._tsSdpHandshakeCompleted = Date.now();
    });
};

Session.prototype._setRemoteAnswerSdp = function(packet) {
    // SDP_ANSWER, SDP_ANSWER_RENEGOTIATE sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
    // TODO: Maybe wrap in a try/catch block or a Promise constructor, in order to return a failed promise
    // in case of exception
    var self = this;
    var data = packet.data;
    this._peerAv = data.substr(40, 1).charCodeAt(0);
    var sdpLen = Chatd.unpack16le(data.substr(41, 2));
    assert(data.length >= sdpLen + 43);
    self.peerSdpAnswer = data.substr(43, sdpLen);
    self.peerHash = data.substr(8, 32);
    if (!self.verifySdpFingerprints(self.peerSdpAnswer)) {
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forgery");
        return Promise.reject();
    }

    var sdp = new RTCSessionDescription({type: 'answer', sdp: self.peerSdpAnswer});
    self._mungeSdp(sdp);
    return self.rtcConn.setRemoteDescription(sdp)
    .catch(function(err) {
        var msg = "Error setting SDP answer: " + err;
        self.terminateAndDestroy(self._streamRenegTimer ? Term.kErrStreamReneg : Term.kErrSdp, msg);
        return Promise.reject(err);
    });
};

Session.prototype.msgSdpAnswerRenegotiate = function(packet) {
    var self = this;
    if (!self._streamRenegTimer) {
        self.logger.warn("Ingoring SDP_ANSWER_RENEGOTIATE - not in renegotiation state");
        return;
    }
    if (self.state !== SessState.kSessInProgress) {
        self.logger.warn("Ignoring unexpected SDP_ANSWER_RENEGOTIATE while in state",
            constStateToText(SessState, self.state));
        return;
    }
    self._setRemoteAnswerSdp(packet)
    .then(function() {
        self._notifyRenegotiationComplete();
    });
};

Session.prototype.cmd = function(op, data) {
    var self = this;
    var payload = self.sid;
    if (data) {
        payload += data;
    }
    if (!self.call.shard.rtcmd(self.call.chatid, self.peer, self.peerClient, op, payload)) {
        if (self.state < SessState.kTerminating) {
            self.call._destroy(Term.kErrNetSignalling, false);
        }
        return false;
    }
    return true;
};

Session.prototype.terminateAndDestroy = function(code, msg) {
    var self = this;
    if (self.state >= SessState.kTerminating) {
        return self._terminatePromise;
    }
    self._terminateReason = code;
    self._setState(SessState.kTerminating);
    self._clearMediaRecoveryTimer();
    // Send SESS_TERMINATE synchronously (in case of tab close, the event loop will exit,
    // so no chance of doing it async), but destroy async so that we have dont have the
    // sessions object of a call altered if destroyed from a loop

    // destroy() sets state to kDestroyed
    if (!self.cmd(RTCMD.SESS_TERMINATE, String.fromCharCode(code))) {
        self._destroy(code, msg);
    } else {
        var ackFunc = function(packet) {
            if (self.state !== SessState.kTerminating) {
                return;
            }
            if (packet.type === RTCMD.SESS_TERMINATE) {
                // It's not actually an ack, but peer terminated at the same time
                var peerReason = packet.data.charCodeAt(8);
                if (!isTermError(peerReason) && isTermError(code)) {
                    // We saw error, but peer terminates on purpose.
                    // This happens for example when the tab is being closed - first the webrtc
                    // stream gets disconnected and we see kErrIceDisconnect, and immediately
                    // after that we receive SESS_TERMINATE with kAppTerminating, serving as
                    // an ACK to our own SESS_TERMINATE. In such a case, we use the peer's reason,
                    // to prevent our client retrying the session
                    code = peerReason | Term.kPeer;
                    msg = null;
                }
            }
            self._destroy(code, msg);
        };
        self._terminateAckCallback = ackFunc;
        setTimeout(function() {
            if (self.state === SessState.kTerminating) {
                self._destroy(code, msg);
            }
        }, RtcModule.kSessTermAckTimeout);
    }
    return self._terminatePromise;
};

Session.prototype.msgSessTerminateAck = function(packet) {
    if (this.state !== SessState.kTerminating) {
        this.logger.warn("Ignoring unexpected TERMINATE_ACK");
        return;
    }
    assert(this._terminateAckCallback);
    var cb = this._terminateAckCallback;
    delete this._terminateAckCallback;
    cb(packet);
};

Session.prototype.msgSessTerminate = function(packet) {
    // sid.8 termcode.1
    // Destroys the session immediately. This guarantees that the session will
    // not exist after receiving SESS_TERMINATE. This is important when
    // a session gets retried - we must guarantee that the old session does not exist
    // when the retry JOIN is received.
    var self = this;
    var reason = packet.data.charCodeAt(8);
    if (self.state === SessState.kDestroyed) {
        self.logger.warn("Ignoring SESS_TERMINATE for a dead session");
        return;
    }
    assert(packet.data.length >= 1);
    self.cmd(RTCMD.SESS_TERMINATE_ACK);
    if (self.state === SessState.kDestroyed) {
        this.logger.warn("msgSessTerminate executed for a session that is in kDestroyed state -",
            "it should have been removed from the sessions map of the call");
        return;
    }
    if (reason === Term.kErrIceDisconn && this._tsIceConn) {
        this._tsLastMedia = Date.now();
    }
    if (self.state === SessState.kTerminating && this._terminateAckCallback) {
        // handle terminate as if it were an ack - in both cases the peer is terminating
        self.msgSessTerminateAck(packet); // the ack handler should destroy it
    }
    if (self.state === SessState.kDestroyed) {
        return;
    }
    self._destroy(reason | Term.kPeer);
};

/** Terminates a session without the signalling terminate handshake.
  * This should normally not be called directly, but via terminateAndDestroy(),
  * unless there is a network error
  */
Session.prototype._destroy = function(code, msg) {
    assert(code != null);
    if (this.state >= SessState.kDestroyed) {
        this.logger.error("Session.destroy(): Already destroyed");
        return;
    }
    if (this.state < SessState.kTerminating) {
        this._setState(SessState.kTerminating);
    }
    if (msg) {
        this.logger.log("Destroying session due to:", msg);
    }
    this._clearMediaRecoveryTimer();
    this.submitStats(code, msg);

    if (this.rtcConn) {
        if (this.rtcConn.signallingState !== 'closed') {
            this.rtcConn.close();
        }
        RTC.peerConnDestroy(this.rtcConn);
        this.rtcConn = null;
    }
    this._setState(SessState.kDestroyed);
    this._fire("onRemoteStreamRemoved");
    this.call._removeSession(this, code);
    this._terminatePromise.resolve(code);
};

Session.prototype._terminateAndDestroyNow = function() {
    assert(this.state === SessState.kTerminating);
    this._destroy(this._terminateReason);
};

Session.prototype.submitStats = function(termCode, errInfo) {
    var stats;
    if (this.statRecorder) {
        stats = this.statRecorder.getStats(base64urlencode(this.call.id), base64urlencode(this.sid));
        stats.grp = this.call.isGroup ? 1 : 0;
        delete this.statRecorder;
    } else { //no stats, but will still provide callId and duration
        stats = {
            cid: base64urlencode(this.call.id),
            sid: base64urlencode(this.sid),
            grp: this.call.isGroup ? 1 : 0,
            bws: RTC.getBrowserId()
        };

        if (this._tsIceConn) {
            stats.ts = Math.round(this._tsIceConn/1000);
            stats.dur = Math.ceil((Date.now()-this._tsIceConn)/1000);
        } else {
            stats.ts = Date.now();
            stats.dur = 0;
        }
    }
    if (this.isJoiner) { // isJoiner means answerer
        stats.isJoiner = 1;
        stats.caid = base64urlencode(this.peerAnonId);
        stats.aaid = base64urlencode(this.call.manager.ownAnonId);
    } else {
        stats.isJoiner = 0;
        stats.caid = base64urlencode(this.call.manager.ownAnonId);
        stats.aaid = base64urlencode(this.peerAnonId);
    }

    if (termCode & Term.kPeer) {
        stats.termRsn = 'peer-'+constStateToText(Term, termCode & ~Term.kPeer);
    } else {
        stats.termRsn = constStateToText(Term, termCode);
    }
    if (errInfo) {
        stats.errInfo = errInfo;
    }
    if (this._mediaHiccups) {
        stats.hicc = {
            cnt: this._mediaHiccups,
            maxDur: this._mediaHiccupMaxDur
        };
    }
    var rcInfo = this._reconnInfo;
    if (rcInfo) {
        var reconn = stats.reconn = {
            cnt: rcInfo.reconnCnt,
            prevSid: base64urlencode(rcInfo.oldSid)
        };
        if (rcInfo.tsLastMedia && this._tsIceConn) {
            reconn.tStall = this._tsIceConn - rcInfo.tsLastMedia;
        }
    }
    var url = this.call.manager.statsUrl;
    if (url) {
        M.xhr(url + "/stats", JSON.stringify(stats));
    }
};

// we actually verify the whole SDP, not just the fingerprints
Session.prototype.verifySdpFingerprints = function(sdp) {
    var hash = this.crypto.mac(sdp, this.ownHashKey);
    var len = hash.length;
    var peerHash = this.peerHash;
    var match = true;
    // constant time compare
    for (var i = 0; i < len; i++) {
        match &= hash[i] === peerHash[i];
    }
    return match;
};

Session.prototype.msgIceCandidate = function(packet) {
    // sid.8 mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen
    var self = this;
    if (RTC.isEdge && (self.rtcConn.iceConnectionState === "completed")) {
        self.logger.warn("Edge: Ignoring received ICE candidate - we are already in 'completed' ICE conn state");
        return;
    }
    var data = packet.data;
    var mLineIdx = data.charCodeAt(8);
    var midLen = data.charCodeAt(9);
    if (midLen > data.length - 11) {
        throw new Error("Invalid ice candidate packet: midLen spans beyond data length");
    }
    var mid = midLen ? data.substr(10, midLen) : undefined;
    var candLen = Chatd.unpack16le(data.substr(10 + midLen, 2));
    assert(data.length >= 12 + midLen + candLen);
    var cand = new RTCIceCandidate({
            sdpMLineIndex: mLineIdx,
            sdpMid: mid,
            candidate: data.substr(midLen + 12, candLen)
    });
    if (!self.rtcConn) { // crypto is not ready yet
        if (!self.peerCandidates) {
            self._queuedPeerCandidates = [cand];
        }
        else {
            self._queuedPeerCandidates.push(cand);
        }
        return;
    }
    self.rtcConn.addIceCandidate(cand)
    .catch(function(err) {
        self.logger.error("addIceCandidate() failed: " + (err.stack || err.message || err) +
            "\ncand = " + cand);
        self.terminateAndDestroy(Term.kErrProtocol, err);
    });
};

Session.prototype.msgEndIceCandidates = function(packet) {
    var self = this;
    if (RTC.isEdge && (self.rtcConn.iceConnectionState === "completed")) {
        self.logger.warn("Edge: Ignoring received END_ICE_CANDIDATES marker - " +
            "we are already in 'completed' ICE conn state");
        return;
    }
    self.rtcConn.addIceCandidate(null)
    .catch(function(err) {
        self.logger.error("addIceCandidate(null) failed: " + err.stack || err.message || err);
        self.terminateAndDestroy(Term.kErrProtocol, err);
    });
};

Session.prototype.msgMute = function(packet) {
    // Only for compatibility with older clients
    // New clients don't use RTCMD_MUTE but update their flags via CALLDATA
    this._onRemoteMuteUnmute(packet.data.charCodeAt(8));
};

Session.prototype._onRemoteMuteUnmute = function(av) {
    if (av === this._peerAv) {
        // For compatibility, we send both RTMSG_MUTE and CALLDATA with updated av flags.
        // This results in two mute events, so we have to ignore the second one
        return;
    }
    var oldAv = this._peerAv;
    this._peerAv = av;
    var changed = oldAv ^ av;
    if (changed & Av.OnHold) {
        // Maybe replaceTrack() the audio track with a silence track, and when unhold,
        // replace back with the original audio track. Thus we would still have a centralized
        // mute for all peer. However, we need broader support for replaceTrack() to do this
        if (av & Av.OnHold) {
            // disable tracks sent to that peer
            this.logger.log("Peer put call on old, stopping stream sending to that peer");
            Av.enableAllTracks(this.rtcConn.outputStream, false);
        }
        else {
            var localAv = this.call.localAv();
            var outStream = this.rtcConn.outputStream;
            // re-enable tracks sent to that peer
            if (localAv & Av.Audio) {
                Av.enableAudio(outStream, true);
            }
            if (localAv & Av.Video) {
                Av.enableVideo(outStream, true);
            }
        }
    }
    this._fire('onRemoteMute', av & Av.Mask);

    var alm = this.audioLevelMonitor;
    if (alm) {
        if ((av & Av.Audio) === 0) {
            alm.disconnect();
        } else if (!alm.isConnected()) {
            alm.connect();
        }
    }
};
Session.prototype.peerIsOnHold = function() {
    return (this._peerAv & Av.OnHold);
};

Session.prototype.peerAv = function() {
    return this._peerAv;
};

Session.prototype._fire = function(evName) {
    return fireEvent(this.handler, this.logger, arguments);
};

Session.prototype._mungeSdp = function(sdp) {
    try {
        var maxbr = this.call.isGroup ? RtcModule.cfg.maxGroupBr : RtcModule.cfg.maxBr;
        if (maxbr) {
            maxbr = parseInt(maxbr);
            assert(!isNaN(maxbr));
            this.logger.warn("mungeSdp: Limiting peer's send video send bitrate to", maxbr, "kbps");
            RTC.sdpSetVideoBw(sdp, maxbr);
        }
    } catch(e) {
        this.logger.error("mungeSdp: Exception:", e.stack);
        throw e;
    }
}

Session.prototype.calcNetworkQuality = function(sample) {
    // console.warn(sample);
    try {
        if (RTC.isChrome) {
            return this.calcNetworkQualityChrome(sample);
        } else if (RTC.isFirefox) {
            return this.calcNetworkQualityFirefox(sample);
        } else {
            return 2;
        }
    } catch (e) {
        this.logger.error("Exception in calcNetworkQuality, returning 2. Exception message:", e);
        return 2;
    }
};

Session.prototype.calcNetworkQualityChrome = function(sample) {
    var apl = sample.d_apl;
    var aplAvg;
    if (apl > this._lostAudioPktAvg) {
        aplAvg = this._lostAudioPktAvg = apl;
    } else {
        aplAvg = this._lostAudioPktAvg = (this._lostAudioPktAvg * 4 + apl) / 5;
    }
    if (aplAvg > 2) {
        // We have lost audio packets since the last sample, that's the worst network quality
        this.logger.log(apl, "audio packets lost, returning link quality 0");
        return 0;
    }
    if ((sample.f & Av.Video) && sample.v && sample.v.s) {
        // We send video, this is the next most reliable way to estimate our link quality
        var result;
        var vs = sample.v.s;
        var bwav = vs.bwav;
        var width = vs.width;
        if (bwav != null && width != null) {
            if (width >= 480) {
                if (bwav < 30) {
                    this.logger.log("Width >= 480, but bwav < 30, returning link quality 0");
                    return 0;
                } else if (bwav < 64) {
                    return 1;
                } else if (bwav < 160) {
                    return 2;
                } else if (bwav < 300) {
                    return 3;
                } else if (bwav < 400) {
                    return 4;
                } else {
                    return 5;
                }
            }
        }

        var fps = vs.fps;
        if (fps != null && fps < 15) {
            if (fps < 3) {
                this.logger.log("send video fps(" + fps + ") < 3, returning link quality 0");
                result = 0;
            } else if (fps < 5) {
                result = 1;
            } else if (fps < 10) {
                result = 2;
            } else {
                result = 3;
            }
        }
        if (vs.lbw && result > 2) {
            this.logger.log("Video send resolution capped by bandwidth, returning 2");
            result = 2;
        }
        if (result != null) {
            return result;
        }
    }
    var rtt = sample.a ? sample.a.rtt : sample.v.rtt;
    if (rtt != null) {
        if (rtt < 150) {
            return 5;
        } else if (rtt < 200) {
            return 4;
        } else if (rtt < 300) {
            return 3;
        } else if (rtt < 500) {
            return 2;
        } else if (rtt < 1000) {
            return 1;
        } else {
            this.logger.log("rtt >= 1000ms, returning link quality 0");
            return 0;
        }
    }
    this.logger.log("Don't have any key stat param to estimate network quality from, returning 2");
    return 2;
};

Session.prototype.calcNetworkQualityFirefox = function(sample) {
    //  console.warn(sample);
    if (sample.d_apl) {
        // We have lost audio packets since the last sample, that's the worst network quality
        this.logger.log("Audio packets lost, returning 0 link quality");
        return 0;
    }
    var a = sample.a;
    if (a) {
        var rtt = a.rtt;
        if (rtt) {
            // console.log("artt =", rtt);
            if (rtt < 150) {
                return 5;
            } else if (rtt < 200) {
                return 4;
            } else if (rtt < 300) {
                return 3;
            } else if (rtt < 500) {
                return 2;
            } else if (rtt < 1000) {
                return 1;
            } else {
                return 0;
            }
        }
        var jtr = a.r.jtr;
        if (jtr) {
            // console.log("ajtr =", jtr);
            if (jtr >= 100) {
                return 1;
            } else if (jtr > 80) {
                return 2;
            } else if (jtr > 50) {
                return 3;
            } else if (jtr > 20) {
                return 4;
            } else {
                return 5;
            }
        }
    }
    if (sample.v) {
        var fps;
        var vr = sample.v.r;
        if (vr) {
            fps = vr.fps;
        } else {
            var vs = sample.v.s;
            if (vs) {
                fps = vs.fps;
            }
        }
        if (fps) {
            if (fps < 3) {
                return 0;
            } else if (fps < 5) {
                return 1;
            } else if (fps < 10) {
                return 2;
            } else if (fps < 15) {
                return 3;
            } else if (fps < 20) {
                return 4;
            } else {
                return 5;
            }
        }
    }
    return 2;
};

// jshint -W003
// Only if the Video flag is set, the Screen flag may be also set to denote that the video is
// a screen capture stream
var Av = { Audio: 1, Video: 2, AudioVideoMask: 3, Screen: 8, OnHold: 16, Mask: 27 }; // 4 is occupied by CallDataFlag.kRinging
Av.fromStream = function(stream) {
    if (!stream) {
        return 0;
    }
    var av = 0;
    var at = stream.getAudioTracks();
    for (var i = 0; i < at.length; i++) {
        if (at[i].enabled) {
            av |= Av.Audio;
            break;
        }
    }
    var vt = stream.getVideoTracks();
    for (var i = 0; i < vt.length; i++) {
        if (vt[i].enabled) {
            av |= Av.Video;
            break;
        }
    }
    return av;
};

Av.streamHasVideo = function(stream) {
    var vt = stream.getVideoTracks();
    var len = vt.length;
    if (!len) {
        return false;
    }
    for (var i = 0; i < len; i++) {
        if (!vt[i].enabled) {
            assert(false, "Av.streamHasVideo: Stream has a video track, but it is disabled");
        }
    }
};

Av.fromMediaOptions = function(opts) {
    var result = opts.audio ? Av.Audio : 0;
    if (opts.video) {
        result |= Av.Video;
        if (opts.screen) {
            result |= Av.Screen;
        }
    }
    return result;
};

Av.toMediaOptions = function(av) {
    return {
        audio: !!(av & Av.Audio), // jscs:ignore disallowImplicitTypeConversion
        video: !!(av & Av.Video), // jscs:ignore disallowImplicitTypeConversion
        screen: !!(av & Av.Screen), // jscs:ignore disallowImplicitTypeConversion
        onHold: !!(av & Av.OnHold)
    };
};

Av.enableTracks = function(tracks, enable) {
    if (!tracks || tracks.length === 0) {
        return false;
    }
    var len = tracks.length;
    for (var i = 0; i < len; i++) {
        tracks[i].enabled = enable;
    }
    return true;
};

Av.enableAudio = function(stream, enable) {
    if (!stream) {
        // disable on null stream is considered successful
        return !enable;
    }
    var ret = Av.enableTracks(stream.getAudioTracks(), enable);
    return enable ? ret : true;
};

Av.enableVideo = function(stream, enable) {
    if (!stream) {
        // disable on null stream is considered successful
        return !enable;
    }
    var ret = Av.enableTracks(stream.getVideoTracks(), enable);
    return enable ? ret : true;
};

Av.enableAllTracks = function(stream, enable) {
    if (!stream) {
        return;
    }
    Av.enableTracks(stream.getAudioTracks(), enable);
    Av.enableTracks(stream.getVideoTracks(), enable);
};

Av.applyToStream = function(stream, av) {
    if (!stream) {
        return;
    }
    var result = 0;
    var at = stream.getAudioTracks();
    var i;
    for (i = 0; i < at.length; i++) {
        if (av & Av.Audio) {
            at[i].enabled = true;
            result |= Av.Audio;
        } else {
            at[i].enabled = false;
        }
    }
    var vt = stream.getVideoTracks();
    for (i = 0; i < vt.length; i++) {
        if (av & Av.Video) {
            vt[i].enabled = true;
            result |= Av.Video;
        } else {
            vt[i].enabled = false;
        }
    }
    return result;
};

Av.toString = function(av) {
    var vidPart = null;
    var result;
    if (av & Av.Video) {
        if (av & Av.Screen) {
            vidPart = 'v(screen)';
        } else {
            vidPart = 'v';
        }
        result = (av & Av.Audio) ? ('a+' + vidPart) : vidPart;
    } else {
        // no video
        result = (av & Av.Audio) ? 'a' : '-';
    }
    if (av & Av.OnHold) {
        result += ' (hold)';
    }
    return result;
};

var RTCMD = Object.freeze({
//  CALL_REQUEST: 0, // initiate new call, receivers start ringing
    CALL_RINGING: 1, // notifies caller that there is a receiver and it is ringing
    CALL_REQ_DECLINE: 2, // decline incoming call request, with specified Term code
    // (can be only kBusy and kCallRejected)
    CALL_REQ_CANCEL: 3,  // caller cancels the call requests, specifies the request id
    CALL_TERMINATE: 4, // not used anymore, but need the opcode to explicitly ignore it!
    //  Hangup existing call, cancel call request. Works on an existing call
    JOIN: 5, // join an existing/just initiated call. There is no call yet, so the command identifies a call request
    SESSION: 6, // join was accepter and the receiver created a session to joiner
    SDP_OFFER: 7, // joiner sends an SDP offer
    SDP_ANSWER: 8, // joinee answers with SDP answer
    ICE_CANDIDATE: 9, // both parties exchange ICE candidates
    SESS_TERMINATE: 10, // initiate termination of a session
    SESS_TERMINATE_ACK: 11, // acknowledge the receipt of SESS_TERMINATE, so the sender can safely stop the stream and
                            // it will not be detected as an error by the receiver
    MUTE: 12, // Notify peer that we muted/unmuted
    SDP_OFFER_RENEGOTIATE: 13, // SDP offer, generated after changing the local stream. Used to renegotiate the stream
    SDP_ANSWER_RENEGOTIATE: 14, // SDP answer, resulting from SDP_OFFER_RENEGOTIATE
    END_ICE_CANDIDATES: 15 // Marks the end of the sequence of sent ICE_CANDIDATE-s. Required for Edge support
});

var Term = Object.freeze({
    kUserHangup: 0,         // < Normal user hangup
//  kCallReqCancel: 1,      // < deprecated, now we have CALL_REQ_CANCEL specially for call requests
    kCallRejected: 2,       // < Outgoing call has been rejected by the peer OR incoming call has been rejected by
                            // <another client of our user
    kAnsElsewhere: 3,       // < Call was answered on another device of ours
    kAnswerTimeout: 5,      // < Call was not answered in a timely manner
    kRingOutTimeout: 6,     // < We have sent a call request but no RINGING received within this timeout - no other
                            // < users are online
    kAppTerminating: 7,     // < The application is terminating
    kCallerGone: 8,         // < The call initiator of an incoming call went offline
    kBusy: 9,               // < Peer is in another call
    kStreamChange: 10,      // < Session was force closed by a client because it wants to change the media stream.
                            // < This is a fallback if one of the peers doesn't support Unified Plan
                            // < stream renegotiation
    kCancelOutAnswerIn: 11, // < Simultaneous call resolution: the outgoing 1on1 call was destroyed because we
                            // < received an incoming call request from the same peer
    kNormalHangupLast: 20,  // < Last enum specifying a normal call termination
    kErrorFirst: 21,        // < First enum specifying call termination due to error
    kErrApiTimeout: 22,     // < Mega API timed out on some request (usually for RSA keys)
    kErrFprVerifFailed: 23, // < Peer DTLS-SRTP fingerprint verification failed, posible MiTM attack
    kErrProtoTimeout: 24,   // < Protocol timeout - one if the peers did not send something that was expected,
                            // < in a timely manner
    kErrProtocol: 25,       // < General protocol error
    kErrInternal: 26,       // < Internal error in the client
    kErrLocalMedia: 27,     // < Error getting media from mic/camera
    kErrNoMedia: 28,        // < There is no media to be exchanged - both sides don't have audio/video to send
    kErrNetSignalling: 29,  // < chatd shard was disconnected
    kErrIceDisconn: 30,     // < ice-disconnect condition on webrtc connection
    kErrIceFail: 31,        // < ice-fail condition on webrtc connection
    kErrSdp: 32,            // < error generating or setting SDP description
    kErrPeerOffline: 33,    // < we received a notification that that peer went offline
    kErrSessSetupTimeout: 34, // < timed out waiting for session
    kErrSessRetryTimeout: 35, // < timed out waiting for peer to retry a failed session
    kErrAlready: 36,          // < There is already a call in this chatroom
    kErrNotSupported: 37,   // < Clients that don't support calls send CALL_REQ_CANCEL with this code
    kErrCallSetupTimeout: 38, // < Timed out waiting for a connected session after the call was answered/joined
    kErrKickedFromChat: 39, // Call terminated because we were removed from the group chat
    kErrIceTimeout: 40,     // < Sesion setup timed out, because ICE stuck at the 'checking' stage
    kErrStreamReneg: 41,    // < SDP error during stream renegotiation
    kErrStreamRenegTimeout: 42, // < Timed out waiting for completion of offer-answer exchange
                                // < during stream renegotiation
    kErrCallRecoveryFailed: 43, // < Timed out waiting for call to recover after own or peers' network drop
    kErrCrypto: 44,         // < An error was returned from the crypto subsystem used for MiTM attack protection
                            // < Typically this means that the Cu25519 pubkey of the peer wasn't found
    kErrNetSiglTimeout: 45, // < chatd shard was disconnected
    kErrorLast: 45,         // < Last enum indicating call termination due to error
    kLast: 45,              // < Last call terminate enum value
    kPeer: 128              // < If this flag is set, the condition specified by the code happened at the peer,
                            // < not at our side
});

function isTermError(code) {
    code &= 0x7f;
    return ((code >= Term.kErrorFirst) && (code <= Term.kErrorLast));
}

function isTermRetriable(code) {
    code &= ~Term.kPeer;
    return (isTermError(code) &&
        (code !== Term.kErrPeerOffline) && (code !== Term.kCallerGone))
        || (code === Term.kStreamChange);
}

var CallRole = Object.freeze({
    kCaller: 0,
    kAnswerer: 1,
    kJoiner: 3
});

var CallState = Object.freeze({
    kCallingOut: 0, // < Call object was initialised
    kReqSent: 3, // < Call request sent
    kRingIn: 4, // < Call request received, ringing
    kJoining: 5, // < Joining a call
    kCallInProgress: 6,
    kTerminating: 7, // < Call is waiting for sessions to terminate
    kDestroyed: 8 // < Call object is not valid anymore
});

var CallStateAllowedStateTransitions = {};
CallStateAllowedStateTransitions[CallState.kCallingOut] = [
    CallState.kReqSent,
    CallState.kTerminating
];
CallStateAllowedStateTransitions[CallState.kReqSent] = [
    CallState.kCallInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kRingIn] = [
    CallState.kJoining,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kJoining] = [
    CallState.kCallInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kCallInProgress] = [
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kTerminating] = [
    CallState.kDestroyed
];

CallStateAllowedStateTransitions[CallState.kDestroyed] = [];

var SessState = Object.freeze({
    kWaitSdpAnswer: 1, // < SDP offer has been sent by initiator, waniting for SDP answer
    kWaitLocalSdpAnswer: 2, // < Remote SDP offer has been set, and we are generating SDP answer
    kConnecting: 3, // < The SDP handshake has completed at this endpoint, and media connection is to be established
    kSessInProgress: 4, // < Media connection established
    kTerminating: 5, // < Session is in terminate handshake
    kDestroyed: 6 // < Session object is not valid anymore
});

var SessStateAllowedStateTransitions = {};
SessStateAllowedStateTransitions[SessState.kWaitLocalSdpAnswer] = [
    SessState.kConnecting,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kWaitSdpAnswer] = [
    SessState.kConnecting,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kConnecting] = [
    SessState.kSessInProgress,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kSessInProgress] = [
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kTerminating] = [
    SessState.kDestroyed
];
SessStateAllowedStateTransitions[SessState.kDestroyed] = [];

var UICallTerm = Object.freeze({
    'INITIALISED': 0,
    'WAITING_RESPONSE_OUTGOING': 10,
    'WAITING_RESPONSE_INCOMING': 20,
    'STARTING': 25,
    'STARTED': 30,
    'ENDED': 40,
    'HANDLED_ELSEWHERE': 45,
    'REJECTED': 50,
    'ABORTED': 55,
    'FAILED': 60,
    'MISSED': 70,
    'TIMEOUT': 80
});
RtcModule.UICallTerm = UICallTerm;
RtcModule.termCodeIsError = function(termCode) {
    return (termCode >= Term.kErrorFirst) && (termCode <= Term.kErrorLast);
};

// Not all timeouts are errors, i.e. kAnswerTimeout
RtcModule.termCodeIsTimeout = function(termCode, name) {
    if (!name) {
        name = constStateToText(Term, termCode);
    }
    return name.match(/k[^\s]+Timeout/i) != null; // covers both null and undefined
};

Call.prototype.termCodeToUIState = function(terminationCode) {
    var self = this;
    var isIncoming = (self.callerInfo != null);
    switch (terminationCode) {
        case Term.kUserHangup:
            switch (self.predestroyState) {
                case CallState.kRingIn:
                    return UICallTerm.MISSED;
                case CallState.kReqSent:
                    return UICallTerm.ABORTED;
                case CallState.kCallInProgress:
                    // We go into kCallInProgress as soon as we receive the fist JOIN,
                    // and GUI - when the first session gets connected. So, we may be in
                    // kCallInProgress and GUI still in WAITING_RESPONSE_OUTGOING
                    // Determine whether GUI is already in in-progress state
                    if (self._callStartSignalled) {
                        return UICallTerm.ENDED;
                    } else {
                        // GUI still considers the call in the setup phase
                        return (self.role === CallRole.kCaller)
                            ? UICallTerm.ABORTED
                            : UICallTerm.ENDED;
                    }
                default:
                    return UICallTerm.FAILED;
            }
            break; // just in case
        case Term.kCallRejected:
            return UICallTerm.REJECTED;
        case Term.kAnsElsewhere:
            return UICallTerm.HANDLED_ELSEWHERE;
        case Term.kRingOutTimeout:
            return UICallTerm.TIMEOUT;
        case Term.kAnswerTimeout:
            return isIncoming
                ? UICallTerm.MISSED
                : UICallTerm.TIMEOUT;
        case Term.kBusy:
            return UICallTerm.REJECTED;
        case Term.kErrAlready:
            return UICallTerm.FAILED;
        case Term.kCancelOutAnswerIn:
            return UICallTerm.ABORTED;
        case Term.kErrNotSupported:
            return UICallTerm.FAILED;
        case Term.kAppTerminating:
            return (self.predestroyState === CallState.kCallInProgress)
                ? UICallTerm.ENDED
                : UICallTerm.FAILED;
        default:
            var name = constStateToText(Term, terminationCode);
            if (RtcModule.termCodeIsError(terminationCode)) {
                return UICallTerm.FAILED;
            } else if (RtcModule.termCodeIsTimeout(terminationCode, name)) {
                return UICallTerm.TIMEOUT;
            } else {
                self.logger.warn("termCodeToUIState: Don't know how to translate term code " +
                    name + ", returning FAIL");
                return UICallTerm.FAILED;
            }
    }
};

// Used by chatd for logging
RtcModule.rtcmdToString = function(cmd, tx, chatdOpcode) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (type.1 data.(len-1))
    if (cmd.length < 23) {
        assert(false, "rtcmdToString: Command buffer length (" +
            cmd.length + ") is less than 23 bytes. Data:\n" + Chatd.dumpToHex(cmd));
    }
    var opCode = cmd.charCodeAt(23);
    var result = "RTCMD_" + constStateToText(RTCMD, opCode) + '(';
    switch (chatdOpcode) {
        case Chatd.Opcode.RTMSG_BROADCAST: result += 'bcast)'; break;
        case Chatd.Opcode.RTMSG_ENDPOINT: result += 'endpt)'; break;
        case Chatd.Opcode.RTMSG_USER: result += 'user)'; break;
        default: assert(false, 'Unexpected chatd opcode ' + chatdOpcode);
    }

    result += ' chatid: ' + base64urlencode(cmd.substr(1, 8));
    result += (tx ? ', to: ' : ', from: ') + base64urlencode(cmd.substr(9, 8));
    result += ', clientid: ' + Chatd.clientIdToString(cmd, 17);

    function termName(code) {
        var kPeer = Term.kPeer;
        var name = constStateToText(Term, code & ~kPeer);
        if (code & kPeer) {
            name += "|kPeer";
        }
        return name;
    }
    function getSid() {
        return ', sid: ' + base64urlencode(cmd.substr(24, 8));
    }
    var dataLen = cmd.length - 24;
    if (dataLen > 0) {
        switch (opCode) {
            case RTCMD.SESS_TERMINATE:
                result += getSid() + ', reason: ' + termName(cmd.charCodeAt(32));
                break;
                // fallthrough to add session id
            case RTCMD.SESS_TERMINATE_ACK:
                result += getSid();
                break;
            case RTCMD.CALL_REQ_DECLINE:
                result += ', reason: ' + termName(cmd.charCodeAt(32));
                break;
            case RTCMD.CALL_REQ_CANCEL:
                result += ', reason: ' + termName(cmd.charCodeAt(32));
                break;
            case RTCMD.ICE_CANDIDATE:
                // sid.8 mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen
                result += getSid();
                if (cmd.length === 32) {
                    result += "\n(null candidate)";
                } else {
                    var midLen = cmd.charCodeAt(33);
                    var candLen = Chatd.unpack16le(cmd.substr(33 + midLen, 2));
                    result += ', mid: ' + cmd.substr(34, midLen) +
                        '\n' + cmd.substr(35 + midLen, candLen);
                }
                break;
            case RTCMD.SDP_OFFER:
            case RTCMD.SDP_OFFER_RENEGOTIATE:
                result += getSid() + ', av: ' + Av.toString(cmd.charCodeAt(104));
                break;
            case RTCMD.SDP_ANSWER:
            case RTCMD.SDP_ANSWER_RENEGOTIATE:
                result += getSid() + ', av: ' + Av.toString(cmd.charCodeAt(64));
                break;
            default:
                result += '\ndata(' + (Chatd.unpack16le(cmd.substr(21, 2)) - 1) + '): ';
                if (dataLen > 64) {
                    result += Chatd.dumpToHex(cmd, 24, 64) + '...';
                } else {
                    result += Chatd.dumpToHex(cmd, 24);
                }
        }
    }
    return [result, 24 + dataLen];
};

/*
CallManager.CALL_END_REMOTE_REASON = {
    "CALL_ENDED": 0x01,
    "REJECTED": 0x02,
    "NO_ANSWER": 0x03,
    "FAILED": 0x04,
    "CANCELED": 0x05
};
 */
Call.prototype.termCodeToHistCallEndedCode = function(terminationCode) {
    var self = this;
    var isIncoming = self.isJoiner;
    var isPeer = (terminationCode & Term.kPeer) !== 0;
    terminationCode = terminationCode & ~Term.kPeer;
    switch (terminationCode) {
        case Term.kUserHangup:
            switch (self.predestroyState) {
                case CallState.kReqSent:
                    return CallManager.CALL_END_REMOTE_REASON.CANCELED;
                case CallState.kRingIn:
                    return (isPeer)
                    ? CallManager.CALL_END_REMOTE_REASON.CANCELED // if peer hung up, it's canceled
                    : CallManager.CALL_END_REMOTE_REASON.REJECTED; // if we hung up, it's rejected
                case CallState.kCallInProgress:
                    return CallManager.CALL_END_REMOTE_REASON.CALL_ENDED;
                default:
                    return CallManager.CALL_END_REMOTE_REASON.FAILED;
            }
            break; // just in case
        case Term.kCallRejected:
            return CallManager.CALL_END_REMOTE_REASON.REJECTED;
        case Term.kAnsElsewhere:
            assert(false, "Can't generate a history call ended message for local kAnsElsewhere code");
            return 0;
        case Term.kRingOutTimeout:
        case Term.kAnswerTimeout:
            return CallManager.CALL_END_REMOTE_REASON.NO_ANSWER;
        case Term.kBusy:
            return CallManager.CALL_END_REMOTE_REASON.REJECTED;
        case Term.kErrAlready:
            return CallManager.CALL_END_REMOTE_REASON.FAILED;
        case Term.kCancelOutAnswerIn:
        return CallManager.CALL_END_REMOTE_REASON.CANCELED;
        case Term.kErrNotSupported:
            return CallManager.CALL_END_REMOTE_REASON.FAILED;
        case Term.kAppTerminating:
            return (self.predestroyState === CallState.kCallInProgress)
                ? CallManager.CALL_END_REMOTE_REASON.CALL_ENDED
                : CallManager.CALL_END_REMOTE_REASON.FAILED;
        default:
            var name = constStateToText(Term, terminationCode);
            if (RtcModule.termCodeIsError(terminationCode)) {
                return CallManager.CALL_END_REMOTE_REASON.FAILED;
            } else if (RtcModule.termCodeIsTimeout(terminationCode, name)) {
                return (self.predestroyState < CallState.kCallInProgress)
                    ? CallManager.CALL_END_REMOTE_REASON.NO_ANSWER
                    : CallManager.CALL_END_REMOTE_REASON.FAILED;
            } else {
                self.logger.warn("termCodeToHistCallEndedCode: Don't know how to translate term code " +
                    name + ", returning FAILED");
                return CallManager.CALL_END_REMOTE_REASON.FAILED;
            }
    }
};

function AudioLevelMonitor(stream, handler, changeThreshold) {
    var self = this;
    self._lastLevel = 0.0;
    if (!handler) {
        handler = function(level) {  console.log("audio level change:", level);  };
    }
    self.handler = handler;
    self._changeThreshold = changeThreshold ? changeThreshold : 0.002;
    var ctx = self.audioCtx = new AudioContext();
    if (!ctx) {
        throw new Error("Can't create audio context, maybe maximum number of instances was reached");
    }
    self.source = ctx.createMediaStreamSource(stream);
    var scriptNode = self.scriptNode = ctx.createScriptProcessor(8192, 1, 1);
    scriptNode.onaudioprocess = function(event) {
        if (!self._connected) {
            return;
        }
        var inData = event.inputBuffer.getChannelData(0);
        var level = 0.0;
        // Samples are in float format (0 to 1). Process each n-th sample to save some cpu cycles
        for (var sn = 0; sn < inData.length; sn += 4) {
            var val = Math.abs(inData[sn]);
            if (val > level) {
                level = val;
            }
        }
        var lastLevel = self._lastLevel;
        var smoothFactor = self._smoothingFactor;
        if (smoothFactor) {
            if (level > self._lastLevel) {
                self._lastLevel = level;
            } else {
                self._lastLevel = level = self._lastLevel * smoothFactor;
            }
            if (Math.abs(level - lastLevel) >= self._changeThreshold) {
                handler(level);
            }
        }
        else {
            if (Math.abs(level - lastLevel) >= self._changeThreshold ||
                (level <= 0.0001 && lastLevel >= 0.0005)) { // return to zero
                self._lastLevel = level;
                handler(level);
            }
        }
    };
    self.connect();
}

AudioLevelMonitor.prototype.connect = function() {
    var self = this;
    if (self._connected) {
        return;
    }
    self.source.connect(self.scriptNode);
    if (!RTC.isFirefox) {
        self.scriptNode.connect(self.audioCtx.destination);
    }
    self._connected = true;
};

AudioLevelMonitor.prototype.disconnect = function() {
    var self = this;
    if (!self._connected) {
        return;
    }
    self.source.disconnect(self.scriptNode);
    if (!RTC.isFirefox) {
        self.scriptNode.disconnect(self.audioCtx.destination);
    }
    delete self._connected;
    if (self._lastLevel >= 0.005) {
        self._lastLevel = 0.0;
        self.handler(0.0);
    }
};

AudioLevelMonitor.prototype.isConnected = function() {
    return this._connected != null;
};

AudioLevelMonitor.prototype.setChangeThreshold = function(val) {
    this._changeThreshold = val / 100;
};

AudioLevelMonitor.prototype.enableSmoothing = function(factor) {
    this._smoothingFactor = 1 - 1 / factor;
    this._changeThreshold = 0;
};

AudioLevelMonitor.prototype.lastLevel = function() {
    return Math.round(this._lastLevel * 100);
};

AudioLevelMonitor.prototype.destroy = function() {
    if (this.audioCtx) {
        this.audioCtx.close();
        delete this.audioCtx;
    }
};

function AudioMutedChecker(handler, timeout) {
    this._timeout = timeout;
    this._handler = handler;
}

AudioMutedChecker.prototype.start = function(stream) {
    var self = this;
    if (!(Av.fromStream(stream) & Av.Audio)) {
        return false;
    }
    if (self._handler.audioInputDetected) {
        return false;
    }
    if (self._levelMonitor) {
        self._levelMonitor.disconnect();
        delete self._levelMonitor;
    }
    self._stream = stream;
    try {
        self._levelMonitor = new AudioLevelMonitor(stream, self.onAudioLevelChange.bind(self), 0.001); // also connects it to the stream
    } catch(e) {
        console.warn("Error creating audio level monitor:", e);
        return false;
    }
    self.arm();
    return true;
};

AudioMutedChecker.prototype.stop = function() {
    var self = this;
    if (self._timer) {
        clearTimeout(self._timer);
        delete self._timer;
    }
    if (this._levelMonitor) {
        this._levelMonitor.disconnect();
        delete this._levelMonitor;
    }
    delete this._stream;
};

AudioMutedChecker.prototype.destroy = function() {
    if (this._levelMonitor) {
        this._levelMonitor.destroy();
    }
};

AudioMutedChecker.prototype.onAudioLevelChange = function(level) {
    var self = this;
    if (level <= 0.0001) {
        // if we disconnect, there will be an artificial change to 0
        return;
    }
    self._handler.audioInputDetected = true;
    self.stop();
    console.log("Mic input detected");
};

AudioMutedChecker.prototype.detected = function() {
    return this._handler.audioInputDetected;
};

AudioMutedChecker.prototype.arm = function() {
    var self = this;
    if (self._timer || self._handler.audioInputDetected) {
        return;
    }
    self._timer = setTimeout(function() {
        if (self._handler.audioInputDetected) {
            return;
        }
        console.warn("No mic input detected");
        self._handler.onNoInputAudioDetected();
    }, self._timeout);
};

AudioMutedChecker.prototype.isConnected = function() {
    return this._levelMonitor.isConnected();
};

RtcModule.callDataToString = function(cmd, tx) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (payload.len)
    var result = ' chatid: ' + base64urlencode(cmd.substr(1, 8));
    if (!tx) {
        result += ' from: ' + base64urlencode(cmd.substr(9, 8)) +
        '(clientId: 0x' + Chatd.dumpToHex(cmd, 17, 4, true) + ')';
    }
    var len = Chatd.unpack16le(cmd.substr(21, 2));
    if (len < 1) {
        return [result, 23];
    }
    if (len < 10) {
        result += ' data:\n' + Chatd.dumpToHex(cmd, 23);
        return [result, 23 + len];
    }

    result += ' callid: ' + base64urlencode(cmd.substr(23, 8));
    var type = cmd.charCodeAt(31);
    result += ' type: ' + constStateToText(CallDataType, type);
    var flags = cmd.charCodeAt(32);
    result += ' flags: ' + flags;
    if (flags & CallDataFlag.kRinging) {
        result = '(ringing) ' + result;
    }
    result += ' av: ' + Av.toString(flags & Av.Mask);
    if (type === CallDataType.kTerminated) {
        assert(len >= 11);
        result += ' reason: ' + constStateToText(CallManager.CALL_END_REMOTE_REASON, cmd.charCodeAt(33));
    }
    return [result, 23 + len];
};

function eventArgsToString(args) {
    var len = args.length;
    var result = '[';
    for (var i = 0; i < len; i++) {
        var arg = args[i];
        var type = typeof arg;
        if (arg && type === 'object') { // arg could be object and null
            var ctor = arg.constructor;
            if (ctor) {
                var name = ctor.name;
                if (name) {
                    result += name + ',';
                    continue;
                }
            }
            result += 'Object,';
        } else if (type === 'string') {
            // Try to convert it to base64 if it's a binary string
            var slen = arg.length;
            if (slen <= 8) {
                for (var j = 0; j < slen; j++) {
                    var code = arg.charCodeAt(j);
                    if (code < 32 || code > 127) { // assume binary string
                        if (slen === 4) {
                            result += Chatd.clientIdToString(arg) + '(hex),';
                        } else {
                            result += base64urlencode(arg) + '(b64),';
                        }
                        break;
                    }
                }
                if (j < slen) {
                    continue;
                }
            }
            result += arg + ',';
        }
         else {
            result += JSON.stringify(arg) + ',';
        }
    }
    if (len > 0) {
        result = result.slice(0, -1);
    }
    return result + ']';
}

function trackInfo(track) {
    assert(track);
    return track.kind + ": " + ((track.muted ? "muted" : "NOT muted") + "; " +
        (track.enabled ? "enabled" : "disabled"));
}

function streamInfo(stream) {
    if (!stream) {
        return "(null stream)"
    }
    var str = "stream id: " + stream.id;
    var tracks = stream.getTracks();
    var len = tracks.length;
    for (var i = 0; i < len; i++) {
        str += "\n\t" + trackInfo(tracks[i]);
    }
    return str;
}
function createPromiseWithResolveMethods() {
    var cbResolve;
    var cbReject;
    var pms = new Promise(function(resolve, reject) {
        cbResolve = resolve;
        cbReject = reject;
    });
    pms.resolve = function(val) {
        if (pms.done) {
            return;
        }
        pms.done = true;
        cbResolve(val);
    };
    pms.reject = function(err) {
        if (pms.done) {
            return;
        }
        pms.done = true;
        cbReject(err);
    };
    return pms;
}

RtcModule.streamInfo = streamInfo;
scope.RtcModule = RtcModule;
scope.Call = Call;
scope.Session = Session;
scope.Av = Av;
scope.Term = Term;
scope.RTCMD = RTCMD;
scope.SessState = SessState;
scope.CallState = CallState;
scope.CallDataType = CallDataType;
scope.CallInfo = CallInfo;
}(window));
