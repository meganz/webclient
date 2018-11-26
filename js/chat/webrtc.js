(function(scope) {
"use strict";
// jscs:disable disallowImplicitTypeConversion
// jscs:disable validateIndentation
// jscs: disable disallowEmptyBlocks

// jshint -W116
// We often enumerate our own objects, created by 'obj = {}', so no inherited properties
// jshint -W089
// jshint -W004
// jshint -W098
// jshint -W074
// jshint -W073

var CallDataType = Object.freeze({
    kNotRinging: 0,
    kRinging: 1,
    kTerminated: 2,
    kSession: 3,
    kMute: 4,
    kSessionKeepRinging: 5
});

function RtcModule(chatd, crypto, handler, allIceServers, iceServers) {
    if (!RTC) {
        throw new RtcModule.NotSupportedError(
            "Attempting to create RtcModule, but there is no webRTC support in this browser"
        );
    }
    var self = this;
    self.setupLogger();
    self.chatd = chatd;
    self.crypto = crypto;
    self.ownAnonId = base64urldecode(u_handle); // crypto.ownAnonId();
    self.handler = handler;
    self.calls = {};
    self.allIceServers = allIceServers;
    self.iceServers = iceServers ? iceServers : allIceServers;
    self.pc_constraints = {};
    self.pcConstraints = {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true
    };
    self.offCallStates = {};
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
RtcModule.kMediaGetTimeout = 20000;
RtcModule.kSessSetupTimeout = 14000;
RtcModule.kCallSetupTimeout = 30000;

RtcModule.kMaxCallReceivers = 6;
RtcModule.kMaxCallAudioSenders = RtcModule.kMaxCallReceivers;
RtcModule.kMaxCallVideoSenders = 4;

RtcModule.prototype.logToServer = function(type, data) {
    if (typeof data !== 'object') {
        data = { data: data };
    }
    data.client = RTC.browser;
    data = JSON.stringify(data);

    var wait = 500;
    var retryNo = 0;
    var self = this;
    var url = "https://stats.karere.mega.nz/msglog?aid=" + base64urlencode(self.ownAnonId) + "&t=" + type;

    (function req() {
        M.xhr(url, data).catch(function() {
            if (++retryNo < 20) {
                setTimeout(req, wait *= 2);
            }
        });
    })();
};

RtcModule.prototype.setupLogger = function() {
    var loggerDebug = localStorage['webrtcDebug'] === "1";
    var minLogLevel = loggerDebug ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.WARN;
    var self = this;
    self._loggerOpts = {
        minLogLevel: function() {
            return MegaLogger.LEVELS.DEBUG; // minLogLevel;
        },
        transport: function(level, args) {
            if (level === MegaLogger.LEVELS.ERROR || level === MegaLogger.LEVELS.CRITICAL) {
                console.error.apply(console, args);
                self.logToServer('e', args.join(' '));
                return;
            }
            if (loggerDebug) {
                console.error.apply(console, args);
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
        // we went offline - it's like all others left the call
        delete this.offCallStates[chatid];
        var chat = chats[chatid];
        assert(chat);
        assert(Object.keys(chat.callParticipants).length === 0);
        this._fire('onClientLeftCall', chatid, null, null, chat.callParticipants);
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
            this.logger.warn("Received " + constStateToText(RTCMD, type) +
                " for a chat that doesn't currently have a call, ignoring");
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
        // if (self.handler.isGroupChat(chatid)) {
        //     this.logger.log("Ignoring group chat CALLDATA");
        //     return;
        // }
        var chat = self.chatd.chatIdMessages[chatid];
        if (!chat) {
            self.logger.warn("Received CALLDATA for unknown chatid " + base64urlencode(chatid) + ". Ignoring");
            return;
        }
        if (chat.isLoggedIn == null) { // login not started
            self.logger.log("Ingoring CALLDATA received before chat join");
            return;
        }
        // get userid and clientid
        var userid = msg.substr(9, 8);
        var clientid = msg.substr(17, 4);
        if (userid === self.chatd.userId && clientid === shard.clientId) {
            console.error("Ignoring CALLDATA sent back to sender");
            return;
        }
        // Actual length of msg string may be more than len, if there are other commands appended
        var data = msg.substr(23, payloadLen);
        var type = msg.charCodeAt(31);
        var parsedCallData = {
            chatid: chatid,
            fromUser: userid,
            fromClient: clientid,
            shard: shard,
            callid: data.substr(0, 8),
            type: type,
            av: data.charCodeAt(9),
            data: data
        };
        self.updatePeerAvState(parsedCallData);
        if (type === CallDataType.kRinging) {
            self.handleCallRequest(parsedCallData);
        } else if (type === CallDataType.kNotRinging) {
            var call = self.calls[parsedCallData.chatid];
            if (!call) {
                self.logger.warn("Ignoring kNotRinging CALLDATA for unknown call");
                return;
            }
            if (call.isGroup && call.state === CallState.kRingIn) {
                call._destroy(Term.kAnswerTimeout, false);
            }
        } else if (type === CallDataType.kSession) {
            if (chat.tsCallStart == null) {
                // Received in realtime. If it was during a CALLDATA dump, CALLTIME
                // is always received before any CALLDATA
                chat.tsCallStart = Date.now();
            }
        } else if (type === CallDataType.kSessionKeepRinging) {
            if (chat.tsCallStart == null) {
                // Received in realtime, see the kSession case
                chat.tsCallStart = Date.now();
            }
            if (chat.isLoggedIn === false) {
                var call = self.calls[parsedCallData.chatid];
                if (call && parsedCallData.callid === call.id) {
                    return;
                }
                self.handleCallRequest(parsedCallData); // it will handle the case when there is another call
            } else {
                self.logger.log("Ignored non-kRinging type CALLDATA from " + base64urlencode(userid) +
                    " with ringing flag because we are not logging in");
            }
        }
    } catch(e) {
        self.logger.error("handleCallData: Exception:", e);
    }
};

RtcModule.prototype.onKickedFromChatroom = function(chat) {
    var chatid = chat.chatId;
    this.logger.warn("We have been removed from chatroom " + base64urlencode(chatid));
    assert(Object.keys(chat.callParticipants).length === 0);
    var call = this.calls[chatid];
    if (call) {
        call.hangup(Term.kErrKickedFromChat);
    }
    delete this.offCallStates[chatid];
    this._fire('onClientLeftCall', chatid, null, null, chat.callParticipants);
};

RtcModule.prototype.updatePeerAvState = function(parsedCallData) {
    var chatid = parsedCallData.chatid;
    var userid = parsedCallData.fromUser;
    var clientid = parsedCallData.fromClient;
    var av = parsedCallData.av;
    var peerid = userid + clientid;
    var roomCallState = this.offCallStates[chatid];
    if (!roomCallState) {
        roomCallState = this.offCallStates[chatid] = { callId: parsedCallData.callid, peerAv: {} };
    }
    var peerAvs = roomCallState.peerAv;
    var oldAv = peerAvs[peerid];
    if (av === oldAv) {
        return;
    }
    peerAvs[peerid] = av;
    this._fire('onClientAvChange', chatid, userid, clientid, av);
};

RtcModule.prototype.callHasSlots = function(chatid) {
    var chat = this.chatd.chatIdMessages[chatid];
    assert(chat);
    var partCount = Object.keys(chat.callParticipants).length;
    if (partCount >= RtcModule.kMaxCallReceivers) {
        return null;
    }
    var result = {};
    var senders = this.getAudioVideoSenderCount(chatid);
    if (senders.video < RtcModule.kMaxCallVideoSenders) {
        result.video = true;
    }
    if (senders.audio < RtcModule.kMaxCallAudioSenders) {
        result.audio = true;
    }
    return result;
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
    if (self.handler.isGroupChat(chatid)) {
        var parts = chat.callParticipants;
        for (var k in parts) {
            if (k.substr(0, 8) === thisUser) {
                // we are already in the call from another client
                self.logger.log("Ignoring call request: We are already in the group call from another client");
                return;
            }
        }
    }
    function createNewCall() {
        var call = new Call(self, parsedCallData, self.handler.isGroupChat(chatid), true);
        self.calls[chatid] = call;
        self.logger.log("Notifying app about incoming call from " + base64urlencode(parsedCallData.fromUser));
        call.handler = self._fire('onCallIncoming', call, parsedCallData.fromUser);
        assert(call.handler);
        assert(call.state === CallState.kRingIn);
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

    var keys = Object.keys(self.calls);
    if (keys.length) {
        assert(keys.length === 1);
        var existingChatid = keys[0];
        if (existingChatid !== chatid) {
            self.logger.log("Incoming call while having a call (in any state) in another chatroom, sending busy");
            sendBusy();
            return;
        }
        // Both calls are in same chatroom
        var existingCall = self.calls[existingChatid];
        if (existingCall.isGroup) {
            self.logger.log("Incoming call while having a call in same group chat room, sending kErrAlready");
            sendBusy(true);
            return;
        }
        // Both calls are in same 1on1 chatroom
        if (existingCall.state >= CallState.kJoining) {
            // Existing call is in progress or terminating
            self.logger.warn("Received call request while another call in the same chatroom is in progress or",
                " terminating, sending kErrAlready");
            sendBusy(true);
            return;
        }
        // Existing call's state is < kJoining
        if (!existingCall.isCallInitiator) {
            // Existing call and this call are both incoming, we don't support this
            /*
            var ci = existingCall._callerInfo;
            if (ci) {
                if (ci.fromUser === parsedCallData.fromUser && ci.fromClient === parsedCallData.fromClient &&
                    ci.data === parsedCallData.data) {
                // chatd sends duplicate CALLDATAs to immediately notify about incoming calls
                // before the login and history fetch completes
                return;
            }
            */
            self.logger.warn("Another incoming call during an incoming call, sending kErrAlready");
            sendBusy(true);
            return;
        }

        // Existing call is in same 1on1 chatroom, outgoing and not yet answered
        // If our user handle is greater than the calldata sender's, our outgoing call
        // survives, and their call request is declined. Otherwise, our existing outgoing
        // call is hung up, and theirs is answered
        if (self.chatd.userId < self.handler.get1on1RoomPeer(chatid)) {
            self.logger.warn("We have an outgoing call, and there is an incoming call - we don't have priority.",
                "Hanging up our outgoing call and answering the incoming");
            var av = existingCall.localAv();
            existingCall.hangup()
            .then(function() {
                assert(!self.calls[existingChatid]);
                // Make sure that possible async messages from the hangup
                // are processed by the app before creating the new call
                setTimeout(function() {
                    // Create an incoming call from the packet, and auto answer it
                    var incomingCall = createNewCall();
                    setTimeout(function() {
                        incomingCall.answer(av);
                    }, 0);
                }, 0);
            });
        }  else {
            self.logger.warn("We have an outgoing call, and there is an incoming call - we have a priority.",
                "The caller of the incoming call should abort the call");
        }
        return;
    }

    // Create incoming call
    var call = createNewCall();
    self.cmdEndpoint(RTCMD.CALL_RINGING, parsedCallData, parsedCallData.callid);
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
        this.logger.debug("removeCall: Call already removed");
        return;
    }
    if (existing.id !== call.id || call !== existing) {
        this.logger.debug("removeCall: Call has been replaced, not removing");
        return;
    }
    delete this.calls[chatid];
    if (Object.keys(this.calls).length === 0) {
        if (this.gLocalStream) {
            if (this._audioMutedChecker) {
                this._audioMutedChecker.disconnect();
                delete this._audioMutedChecker;
            }
            RTC.stopMediaStream(this.gLocalStream);
            delete this.gLocalStream;
            delete this.localMediaPromise;
        }
        if (this._statTimer) {
            clearInterval(this._statTimer);
            delete this._statTimer;
        }
    }
};

RtcModule.prototype._getLocalStream = function(av, resolution) {
    var self = this;
    assert(Object.keys(self.calls).length > 0);
    if (self.gLocalStream) {
        if (self.gLocalAv !== av) {
            self.gLocalAv = Av.applyToStream(self.gLocalStream, av);
        }
        return Promise.resolve(RTC.cloneMediaStream(self.gLocalStream, {audio: true, video: true}));
    }

    // self.gLocalStream is null
    if (self.localMediaPromise) {
        if (self.localMediaPromise === true) {
            return Promise.reject("getLocalStream called re-entrantly from within a getLocalStream callback." +
                "You should call getLocalStream() asynchronously to resolve this");
        }
        return self.localMediaPromise;
    }
    // Mark that we have an ongoing GUM request, but we don't have the
    // actual promise yet. This is because some callbacks may be called
    // synchronously and they may initiate a second getLocalStream(),
    // before we have the promise ready to assign to self.localMediaPromise
    self.localMediaPromise = true;
    var resolved = false; // track whether the promise was resolved for the timeout reject
    var notified = false;
    // If it takes too long, display in browser a hint that we are requesting permissions for camera/mic
    setTimeout(function() {
        if (!resolved) {
            self._fire('onLocalMediaRequest');
            notified = true;
        }
    }, 1000);

    var vidOpts = resolution ? RTC.mediaConstraintsResolution(resolution) : true;
    var pms = RTC.getUserMedia({audio: true, video: vidOpts})
        .catch(function(error) {
            self.logger.warn("getUserMedia: Failed to get audio+video, trying audio-only...");
            return RTC.getUserMedia({audio: true, video: false});
        })
        .catch(function(error) {
            self.logger.warn("getUserMedia: Failed to get audio only, trying video-only...");
            return RTC.getUserMedia({audio: false, video: vidOpts});
        })
        .catch(function(error) {
            var msg;
            try {
                delete self.localMediaPromise;
                msg = RtcModule.gumErrorToString(error);
                self.logger.warn("getUserMedia failed:", msg);
            } catch(err) {
                msg = "Exception in final catch handler of getUserMedia: "+err;
            }
            return Promise.resolve(msg);
        });
    assert(self.localMediaPromise, "getUserMedia resolved synchronously");
    self.localMediaPromise = new Promise(function(resolve, reject) {
        pms.then(function(stream) {
            resolved = true;
            if (typeof stream === 'string') {
                self.gLocalStream = null;
                self.gLocalAv = 0;
                if (notified) {
                    self._fire('onLocalMediaFail', stream);
                }
            } else {
                self.gLocalStream = stream;
                self.gLocalAv = Av.applyToStream(self.gLocalStream, av);
                if (notified) {
                    self._fire('onLocalMediaObtained', stream);
                }
            }
            delete self.localMediaPromise;
            // if all calls weren't destroyed meanwhile
            if (Object.keys(self.calls).length !== 0) {
                resolve(stream);
            }
        });
        pms.catch(function(err) {
            reject(err);
        });

        setTimeout(function() {
            if (!resolved) {
                reject("timeout");
            }
        }, RtcModule.kMediaGetTimeout);
    });
    return self.localMediaPromise;
};

RtcModule.prototype._muteUnmute = function(av) {
    var s = this.gLocalStream;
    var amChecker = this._audioMutedChecker;
    if (amChecker) {
        var prev = Av.fromStream(s);
        if ((av & Av.Audio) !== (prev & Av.Audio)) {
            if ((av & Av.Audio) === 0) {
                amChecker.disconnect();
            } else if (!amChecker.detected()) {
                amChecker.connect();
            }
        }
    }
    Av.applyToStream(s, av);
    av = Av.fromStream(s);
    this.gLocalAv = av;
    return av;
};

RtcModule.prototype._startOrJoinCall = function(chatid, av, handler, isJoin) {
    var self = this;
    var isGroup = self.handler.isGroupChat(chatid);
    var shard = self.chatd.chatIdShard[chatid];
    if (!shard) {
        throw new Error("startOrJoinCall: Unknown chatid " + base64urlencode(chatid));
    }
    if (!shard.clientId) {
        self.logger.warn("Refusing to start or join call: clientid not yet assigned by shard", shard.shard);
        return null;
    }
    var existing = self.calls[chatid];
    if (!existing && Object.keys(self.calls).length) {
        self.logger.warn("Not starting a call - there is already a call in another chatroom");
        return null;
    }
    if (existing) {
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
    }
    var callid;
    if (isJoin) {
        var roomState = self.offCallStates[chatid];
        if (roomState) {
            callid = roomState.callId;
        }
        if (!callid) {
            self.logger.warn("Could not obtain callid for the call being joined, generating one locally,",
                "but group call stats will be messed up");
        } else {
            console.log("callid obtained from off state for joining call:", base64urlencode(callid));
        }
    }
    if (!callid) {
        callid = self.crypto.random(8);
    }
    var call = new Call(
        self, {
            chatid: chatid,
            callid: callid,
            shard: shard
        }, isGroup, isJoin, handler);

    self.calls[chatid] = call;
    call._startOrJoin(av);
    return call;
};

RtcModule.prototype.joinCall = function(chatid, av, handler) {
    var chat = this.chatd.chatIdMessages[chatid];
    assert(chat);
    var partCount = Object.keys(chat.callParticipants).length + 1;
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
    var roomCallState = this.offCallStates[chatid];
    if (roomCallState) {
        var peerAv = roomCallState.peerAv;
        delete peerAv[userid + clientid];
        if (Object.keys(peerAv).length === 0) {
            delete this.offCallStates[chatid];
        }
    }
    this._fire('onClientAvChange', chatid, userid, clientid, 0);

    var isGroup;
    var call = this.calls[chatid];
    if (call) {
        isGroup = call.isGroup;
        call._onClientLeftCall(userid, clientid);
    } else {
        isGroup = this.handler.isGroupChat(chatid);
    }
    if (isGroup) {
        if (Object.keys(chat.callParticipants).length === 0) {
            this.logger.debug("Notifying about last client leaving call");
        }
        this._fire('onClientLeftCall', chatid, userid, clientid, chat.callParticipants);
    }
};

RtcModule.prototype.onClientJoinedCall = function(chat, userid, clientid) {
    var chatid = chat.chatId;
    var call = this.calls[chatid];
    var isGroup = call ? call.isGroup : this.handler.isGroupChat(chatid);
    if (isGroup) {
        this._fire('onClientJoinedCall', chat.chatId, userid, clientid, chat.callParticipants);
    }
};

RtcModule.prototype.onShutdown = function() {
    this.logger.warn("Shutting down....");
    var calls = this.calls;
    for (var chatid in calls) {
        var call = calls[chatid];
        if (call.state === CallState.kRingIn) {
            assert(call.hasNoSessions());
        }
        call._destroy(Term.kAppTerminating, call.state !== CallState.kRingIn);
    }
    this.logger.warn("Shutdown complete");
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
            var q = sess.getPeerNetworkQuality();
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

RtcModule.prototype._notifySessionNetQualityChange = function(q) {
    if (q > this._ownNetworkQuality) {
        this._updateOwnNetworkQuality(q);
    } else {
        this._scanSessionsUpdateOwnNetworkQuality();
    }
};

RtcModule.prototype._fire = function(evName) {
    var self = this;
    var func = self.handler[evName];
    var logger = self.logger;
    var args = [].slice.call(arguments, 1);
    if (logger.isEnabled()) {
        var msg = "fire " + evName;
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
        return func.apply(self.handler, args);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
        return undefined;
    }
};
RtcModule.prototype.getAudioVideoSenderCount = function(chatid) {
    var call = this.calls[chatid];
    var audioSenders; var videoSenders;
    var localAv;
    if (call && ((localAv = call.localAv()) != null)) {
        audioSenders = ((localAv & Av.Audio) != 0) ? 1 : 0;
        videoSenders = ((localAv & Av.Video) != 0) ? 1 : 0;
    } else {
        audioSenders = videoSenders = 0;
    }
    var roomState = this.offCallStates[chatid];
    if (!roomState) {
        return { audio: audioSenders, video: videoSenders };
    }
    var roomAv = roomState.peerAv;
    assert(roomAv);
    for (var k in roomAv) {
        var flags = roomAv[k];
        if (flags & Av.Audio) {
            audioSenders++;
        }
        if (flags & Av.Video) {
            videoSenders++;
        }
    }
    return { audio: audioSenders, video: videoSenders };
};

RtcModule.prototype.logout = function() {
    this._loggedOut = true;
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

function Call(rtcModule, info, isGroup, isJoiner, handler) {
    this.manager = rtcModule;
    this.chatid = info.chatid;
    this.chat = rtcModule.chatd.chatIdMessages[this.chatid];
    assert(this.chat);
    this.id = info.callid;
    this.handler = handler;
    this.shardNo = info.shard.shard;
    this.shard = info.shard;
    this.isGroup = isGroup;
    this.isJoiner = isJoiner; // the joiner is actually the answerer in case of new call
    this.sessions = {};
    this.sessRetries = {};
    this._sentSessions = {};
    this.iceFails = {};
    this.state = isJoiner ? CallState.kRingIn : CallState.kInitial;
    //  var level = this.manager.logger.options.minLogLevel();
    this.logger = MegaLogger.getLogger("call[" + base64urlencode(this.id) + "]",
            rtcModule._loggerOpts, rtcModule.logger);
    if (isJoiner) {
        this._callerInfo = info; // callerInfo is actually CALLDATA, needed for answering
    }
    this.manager._startStatsTimer();
}

Call.prototype.handleMsg = function(packet) {
    var self = this;
    var type = packet.type;
    switch (type)
    {
        case RTCMD.CALL_TERMINATE:
            self.msgCallTerminate(packet);
            return;
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
            var endpointId = packet.fromUser + packet.fromClient;
            if (!isTermRetriable(reason) && self.sessRetries[endpointId]) {
                // Peer terminates on purpose, but we have scheduled a retry.
                // Cancel the retry and maybe terminate the call
                delete self.sessRetries[endpointId];
                self.logger.log("Peer terminates session willingfully,",
                    "but we have scheduled a retry because of error. Aborting retry");
                self._destroyIfNoSessionsOrRetries(reason);
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

Call.prototype._getLocalStream = function(av) {
    var self = this;
    self._setState(CallState.kWaitLocalStream);
    // getLocalStream currently never fails - if there is error, stream is a string with the error message
    return self.manager._getLocalStream(av, (self.isGroup && !RTC.isFirefox) ? "low" : undefined)
        .catch(function(err) {
            assert(false, "RtcModule._getLocalStream promise failed. Error: " + err);
            return Promise.reject(err);
        })
        .then(function(stream) {
            if (self.state > CallState.kCallInProgress) {
                return Promise.reject("getLocalStream: Call killed (or went into state " +
                    constStateToText(CallState, self.state) + ") while obtaining local stream");
            }
            self._setState(CallState.kHasLocalStream);
        });
};

Call.prototype.msgCallTerminate = function(packet) {
    var self = this;
    if (packet.data.length < 1) {
        self.logger.error("Ignoring CALL_TERMINATE without reason code");
        return;
    }
    if (self.isGroup) {
        self.logger.warn("Ignoring CALL_TERMINATE in a group call");
        return;
    }
    var code = packet.data.charCodeAt(0);
    var sessions = self.sessions;
    var ci = self._callerInfo;
    var isParticipant = false;
    if (Object.keys(sessions).length) { // Call is in progress, look in sessions
        for (var sid in sessions) {
            var sess = sessions[sid];
            if (sess.peer === packet.fromUser && sess.peerClient === packet.fromClient) {
                isParticipant = true;
                break;
            }
        }
    } else if (self.state <= CallState.kJoining
        && ci
        && ci.fromUser === packet.fromUser
        && ci.fromClient === packet.fromClient) { // Caller terminates, in the call setup phase
            isParticipant = true;
    } else {
        var retry = self.sessRetries[packet.fromUser + packet.fromClient];
        if (retry && (Date.now() - retry.active <= RtcModule.kSessSetupTimeout)) {
            // no session to this peer at the moment, but we are in the process of reconnecting to them
            isParticipant = true;
        }
    }

    if (!isParticipant) {
        self.logger.warn("Received CALL_TERMINATE from a client that is not in the call, ignoring");
        return;
    }
    self._destroy(code | Term.kPeer, false);
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
    var cinfo = this._callerInfo;
    if (!cinfo) {
        this.logger.warn("Ignoring CALL_REQ_CANCEL for a call that is not incoming");
        return;
    }
    if (this.state >= CallState.kCallInProgress) {
        if (this.state === CallState.kCallInProress) {
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
    var payload = self.id
        + String.fromCharCode(type)
        + String.fromCharCode(self.localAv());
    if (type === CallDataType.kTerminated) {
        assert(uiTermCode != null);
        payload += String.fromCharCode(uiTermCode);
    }
    var cmd = self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0'
        + Chatd.pack16le(payload.length)
        + payload;

    // We don't get our CALLDATA echoed back from chatd, same as with RTCMD broadcast
    self.updateOwnPeerAvState();
    if (!self.shard.cmd(Chatd.Opcode.CALLDATA, cmd)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
        return false;
    }
    return true;
};

Call.prototype.updateOwnPeerAvState = function() {
    this.manager.updatePeerAvState({
        chatid: this.chatid,
        fromUser: this.manager.chatd.userId,
        fromClient: this.shard.clientId,
        av: this.localAv(),
        callid: this.id
    });
};

Call.prototype.msgSession = function(packet) {
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
        self.logger.warn("Detected simultaneous join with " + base64urlencode(packet.fromUser) +
            ' (' + Chatd.clientIdToString(packet.fromClient) + ')');

        var ourId = self.manager.chatd.userId + packet.shard.clientId;
        assert(peerId !== ourId);
        if (ourId > peerId) {
            self.logger.warn("Detected simultaneous join - received RTCMD.SESSION after having already sent one.",
                "Our peerId is greater, ignoring received SESSION");
            return;
        }
    }

    if (self.state === CallState.kJoining) {
        self._setState(CallState.kCallInProgress);
        self._monitorCallSetupTimeout();
    } else if (self.state !== CallState.kCallInProgress) {
        this.logger.warn("Ignoring unexpected SESSION while in call state "+constStateToText(CallState, self.state));
        return;
    }

    var sess = new Session(self, packet);
    self.sessions[sess.sid] = sess;
    self._notifyNewSession(sess);
    sess.sendOffer();
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
        this._fire('onCallStarting');
    }
};

Call.prototype._monitorCallSetupTimeout = function() {
    var self = this;
    self._setupTimer = setTimeout(function() {
        if (self.state === CallState.kCallInProgress && !self.hasConnectedSession) {
            self.hangup(Term.kErrCallSetupTimeout);
        }
    }, RtcModule.kCallSetupTimeout);
};

Call.prototype.msgJoin = function(packet) {
    var self = this;
    if (self.state === CallState.kRingIn && packet.fromUser === self.manager.chatd.userId) {
        self.logger.log("Incoming call answered on another device, destroying");
        self._destroy(Term.kAnsElsewhere, false);
    } else if (self.state === CallState.kJoining || self.state === CallState.kCallInProgress ||
        self.state === CallState.kReqSent) {
        packet.callid = packet.data.substr(0, 8);
        assert(packet.callid);
        for (var sid in self.sessions) {
            var s = self.sessions[sid];
            if (s.peer === packet.fromUser && s.peerClient === packet.fromClient) {
                self.logger.warn("Ignoring JOIN from", base64urlencode(packet.fromUser),
                    "(0x" + Chatd.dumpToHex(packet.fromClient, 0, 4, true) + ") to whom we already have a session");
                return;
            }
        }
        if (self.state === CallState.kReqSent) {
            self._setState(CallState.kCallInProgress);
            self._monitorCallSetupTimeout();
            if (!self.isGroup && !self._bcastCallData(CallDataType.kNotRinging)) {
                return;
            }
        }

        var newSid = self.manager.crypto.random(8);
        var peerId = packet.fromUser + packet.fromClient;
        delete self._sentSessions[peerId];
        var ownHashKey = self.manager.crypto.random(32);

        // SESSION callid.8 sid.8 anonId.8 encHashKey.32
        self.manager.cmdEndpoint(RTCMD.SESSION, packet,
            packet.callid +
            newSid +
            self.manager.ownAnonId +
            self.manager.crypto.encryptNonceTo(packet.fromUser, ownHashKey) +
            self.id
        );
        self._sentSessions[peerId] = { sid: newSid, ownHashKey: ownHashKey };
    } else {
        self.logger.warn("Ignoring unexpected JOIN while in state", constStateToText(CallState, self.state));
        return;
    }
};
Call.prototype._gracefullyTerminateAllSessions = function(code) {
    var self = this;
    var promises = [];
    for (var sid in self.sessions) {
        var sess = self.sessions[sid];
        promises.push(sess.terminateAndDestroy(code));
    }
    return Promise.all(promises)
    .catch(function() {
        assert(false); // terminateAndDestroy() should never fail
    })
};

Call.prototype._waitAllSessionsTerminated = function(code) {
    var self = this;
    var sessions = self.sessions;
    // if the peer initiated the call termination, we must wait for
    // all sessions to go away and remove the call
    for (var sid in sessions) {
        var sess = sessions[sid];
        sess._setState(SessState.kTerminating);
    }
    return new Promise(function(resolve, reject) {
        var timer = setInterval(function() {
            if (self.hasNoSessions() && (timer != null)) {
                timer = null;
                clearInterval(timer);
                resolve();
            }
        }, 200);
        setTimeout(function() {
            if (!timer) {
                assert(self.hasNoSessions());
                return;
            }
            timer = null;
            clearInterval(timer);
            if (!self.hasNoSessions()) {
                self.logger.warn("Timed out waiting for all sessions to terminate, force closing them");
                for (var sid in sessions) {
                    var sess = sessions[sid];
                    sess._destroy(code);
                }
            }
            resolve();
        }, 1400);
    });
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
        self.logger.log("Destroying call due to:", msg);
    }
    self.predestroyState = self.state;
    self._setState(CallState.kTerminating);
    delete self.chat.tsCallStart;
    self._clearCallOutTimer();

    var pmsGracefulTerm;
    if (weTerminate) {
        if (!self.isGroup) {
            self.cmdBroadcast(RTCMD.CALL_TERMINATE, String.fromCharCode(code));
        }
        // if we initiate the call termination, we must initiate the
        // session termination handshake
        pmsGracefulTerm = self._gracefullyTerminateAllSessions(code);
    } else {
        pmsGracefulTerm = self._waitAllSessionsTerminated(code);
    }

    var destroyCall = function() {
        if (self.state >= CallState.kDestroyed) {
            return;
        }
        if (code !== Term.kAppTerminating) {
            assert(self.hasNoSessions());
        }
        self.logger.log("Terminating call in state", constStateToText(CallState, self.predestroyState),
            "with reason", constStateToText(Term, reasonNoPeer));

        // reasonNoPeer can be kBusy even in a group call if we are the callee, and another client of ours
        // is already in a call. In that case, our other client will broadcast a decline with kBusy,
        // and we will see it and abort the incoming call request

        if (reasonNoPeer === Term.kAnsElsewhere || reasonNoPeer === Term.kErrAlready
         || reasonNoPeer === Term.kAnswerTimeout) {
            self.logger.log("Not sending CALLDATA because destroy reason is", constStateToText(Term, reasonNoPeer));
        } else if (self.predestroyState === CallState.kRingIn) {
            self.logger.log("Not sending CALLDATA because we were passively ringing");
        } else {
            self._bcastCallData(CallDataType.kTerminated, self.termCodeToHistCallEndedCode(code));
        }
        self._stopIncallPingTimer();
        self._setState(CallState.kDestroyed);
        self._fire('onDestroy', reasonNoPeer, (code & Term.kPeer) !== 0, msg);
        self.manager._removeCall(self);
    };
    if (code === Term.kAppTerminating) {
        self.logger.warn("Destroying call immediately due to kAppTerminating");
        destroyCall();
        self._destroyPromise = Promise.resolve();
    } else {
        self._destroyPromise = pmsGracefulTerm.then(destroyCall);
    }
    return self._destroyPromise;
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
        return;
    }
    assert(self.state === CallState.kHasLocalStream);
    assert(self.localAv() != null);
    self.isCallInitiator = true;
    if (!self._bcastCallData(CallDataType.kRinging)) {
        return;
    }
    if (self.isGroup) {
        self.isRingingOutToGroup = true;
    }
    self._setState(CallState.kReqSent);
    self._startIncallPingTimer();
    assert(!self._callOutTimer);

    self._callOutTimer = setTimeout(function() {
        self.isRingingOutToGroup = false;
        if (self.state === CallState.kReqSent) { // nobody answered, abort call request
            self.logger.log("Answer timeout, cancelling call request");
            self._destroy(Term.kAnswerTimeout, true); // TODO: differentiate whether peer has sent us RINGING or not
        } else {
            // In group calls we don't stop ringing even when call is answered, but stop it
            // after some time (we use the same kAnswerTimeout duration in order to share the timer)
            if (self.isGroup && self.state === CallState.kCallInProgress) {
                self._bcastCallData(CallDataType.kNotRinging);
            }
            return;
        }
    }, RtcModule.kCallAnswerTimeout);

    return true;
};
Call.prototype._startIncallPingTimer = function() {
    var self = this;
    self._inCallPingTimer = setInterval(function() {
        if (!self.shard.cmd(Chatd.Opcode.INCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0')) {
            self._destroy(Term.kErrNetSignalling, true);
        }
    }, RtcModule.kIncallPingInterval);
};

Call.prototype._stopIncallPingTimer = function() {
    var self = this;
    if (self._inCallPingTimer) {
        clearInterval(self._inCallPingTimer);
        delete self._inCallPingTimer;
    }
    self.shard.cmd(Chatd.Opcode.ENDCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0');
};
Call.prototype.hasNoSessions = function() {
    return (Object.keys(this.sessions).length === 0);
};

Call.prototype.hasNoSessionsOrPendingRetries = function() {
    return ((Object.keys(this.sessions).length === 0)
         && (Object.keys(this.sessRetries).length === 0));
};

Call.prototype._destroyIfNoSessionsOrRetries = function(reason) {
    var self = this;
    if (self.hasNoSessionsOrPendingRetries()) {
        self.logger.log("Everybody left, terminating call");
        self._destroy(reason, false, "Everybody left");
    }
};

Call.prototype._removeSession = function(sess, reason, msg) {
    var self = this;
    var delSid = sess.sid;
    var peerId = sess.peer + sess.peerClient;
    var isTerminating = self.state >= CallState.kTerminating;
    var retry = isTermRetriable(reason) && (!isTerminating);
    sess._fire("onDestroy", reason & 0x7f,
        !!(reason & Term.kPeer), msg, retry); // jscs:ignore disallowImplicitTypeConversion

    delete self.sessions[delSid];
    var reasonNoPeer = (reason & ~Term.kPeer);
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
    var sessRetries = self.sessRetries;
    delete sessRetries[peerId];
    if (!retry) { // we or peer hung up
        self._destroyIfNoSessionsOrRetries(reason);
        return;
    }
// Retry session
    sessRetries[peerId] = {
        start: Date.now(),
        oldSid: delSid
    };
    self.logger.warn("Scheduling session reconnect for session", base64urlencode(sess.sid));

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
        }, 1000);
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

Call.prototype._fire = function(evName) {
    var self = this;
    var func = self.handler[evName];
    var args = [].slice.call(arguments, 1);
    var logger = self.logger;
    if (logger.isEnabled()) {
        var msg = "fire " + evName;
        if (evName === "onDestroy") {
            msg += " (" + constStateToText(Term, arguments[1]) + ')';
        }
        if (!func) {
            msg += " ...unhandled ";
        }
        msg += eventArgsToString(args);
        logger.log(msg);
    }
    if (!func) {
        return;
    }
    try {
        func.apply(self.handler, args);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
    }
};

Call.prototype._startOrJoin = function(av) {
    var self = this;
    if (self.isJoiner) {
        var senders = this.manager.getAudioVideoSenderCount(self.chatid);
        if ((av & Av.Video) && (senders.video >= RtcModule.kMaxCallVideoSenders)) {
            this.logger.warn("Can't join with camera - maximum number of video senders already reached");
            av &= ~Av.Video;
        }
        if ((av & Av.Audio) && (senders.audio >= RtcModule.kMaxCallAudioSenders)) {
            this.logger.warn("Can't join with mic - maximum number of audio senders already reached");
            av &= ~Av.Audio;
        }
    }
    var pms = self._getLocalStream(av);
    pms.catch(function(err) {
        self._destroy(Term.kErrLocalMedia, true, err);
    });
    pms.then(function() {
        self.updateOwnPeerAvState();
        if (self.isJoiner) {
            self._join();
        } else {
            self._broadcastCallReq();
        }
    });
};

Call.prototype._join = function() {
    var self = this;
    self._sentSessions = {};
    assert(self.state === CallState.kHasLocalStream);
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8 sentAv.1
    var data = self.id + self.manager.ownAnonId + String.fromCharCode(self.localAv());
    self._setState(CallState.kJoining);
    if (!self.cmdBroadcast(RTCMD.JOIN, data)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
        return false;
    }
    self._startIncallPingTimer();
    // we have session setup timeout timer, but in case we don't even reach a session creation,
    // we need another timer as well
    setTimeout(function() {
        if (self.state <= CallState.kJoining) {
            self._destroy(Term.kErrSessSetupTimeout, true);
        }
    }, RtcModule.kSessSetupTimeout);
    return true;
};

Call.prototype.rejoinPeer = function(userid, clientid) {
    var self = this;
    assert(self.state === CallState.kCallInProgress);
    delete self._sentSessions[userid + clientid];
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8 sentAv.1
    // if userid is not specified, join all clients in the chat, otherwise
    // join a specific user (used when a session gets broken)
    var data = self.id + self.manager.ownAnonId + String.fromCharCode(self.localAv());
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
    var calls = self.manager.calls;
    if (Object.keys(calls).length <= 1) {
        return self._startOrJoin(av);
    }
    // There is another ongoing call, terminate it first
    var promises = [];
    for (var k in calls) {
        var call = calls[k];
        if (call !== self) {
            promises.push(call.hangup());
        }
    }
    self.logger.log("answer: Waiting for other call(s) to terminate first...");
    return Promise.all(promises)
    .then(function() {
        self.logger.log("answer: Other call(s) terminated, answering");
        return self._startOrJoin(av);
    });
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
        if (reason == null) {
            reason = Term.kCallRejected;
        }
        var cinfo = this._callerInfo;
        assert(cinfo);
        assert(this.hasNoSessionsOrPendingRetries());
        this.cmdBroadcast(RTCMD.CALL_REQ_DECLINE, cinfo.callid + String.fromCharCode(reason));
        return this._destroy(reason, false);
    case CallState.kJoining:
    case CallState.kCallInProgress:
    case CallState.kWaitLocalStream:
        // TODO: For group calls, check if the sender is the call host and only then destroy the call
        if (reason == null) { // covers both 'undefined' and 'null'
            reason = Term.kUserHangup;
        } else {
            assert(reason === Term.kUserHangup || reason === Term.kAppTerminating ||
                RtcModule.termCodeIsError(reason));
        }
        break;
    case CallState.kTerminating:
    case CallState.kDestroyed:
        this.logger.debug("hangup: Call already terminating/terminated");
        return Promise.resolve();
    default:
        this.logger.warn("Don't know what term code to send in state", constStateToText(CallState, this.state),
            "provided code is", constStateToText(Term, reason), "but defaulting to kUserHangup");
        reason = Term.kUserHangup;
        break;
    }
    // in any state, we just have to send CALL_TERMINATE and that's all
    return this._destroy(reason, true);
};

Call.prototype._onClientLeftCall = function(userid, clientid) {
    if (userid === this.manager.chatd.userId && clientid === this.shard.clientId) {
        this._destroy(Term.kErrNetSignalling, false, "ENDCALL received for ourselves");
        return;
    }
    if (this.state === CallState.kRingIn && userid === this._callerInfo.fromUser
    && clientid === this._callerInfo.fromClient) { // caller went offline
        this._destroy(Term.kUserHangup, false);
        return;
    }
    for (var sid in this.sessions) {
        var sess = this.sessions[sid];
        if (sess.peer === userid && sess.peerClient === clientid) {
            setTimeout(function() {
                sess.terminateAndDestroy(Term.kErrPeerOffline);
            }, 0);
            break;
        }
    }
    var endpointId = userid + clientid;
    if (this.sessRetries[endpointId]) {
        delete this.sessRetries[endpointId];
        this._destroyIfNoSessionsOrRetries(Term.kErrPeerOffline);
    }
};

Call.prototype._notifySessionConnected = function(sess) {
    /*
    var url = this.manager.statsUrl;
    if (url) {
        url += '/newsess?cid='+base64urlencode(this.id)+'&sid='+base64urlencode(sess.sid);
        jQuery.ajax(url);
    }
    */
    if (this.hasConnectedSession) {
        return;
    }
    this.hasConnectedSession = true;
    // In group calls, we want to keep ringing for some time, so we send a special
    // version of kSession that doesn't suppress ringing.
    this._bcastCallData(this.isRingingOutToGroup
        ? CallDataType.kSessionKeepRinging
        : CallDataType.kSession);

    var chat = this.chat;
    if (chat.tsCallStart == null) {
        chat.tsCallStart = Date.now();
    }
    var rtcModule = this.manager;
    if (!rtcModule._audioMutedChecker && rtcModule.gLocalStream && rtcModule.gLocalStream.getAudioTracks().length) {
        // rtcModule._audioMutedChecker = new AudioMutedChecker(rtcModule.gLocalStream, rtcModule.handler, 10000);
    }
    this._fire('onCallStarted', chat.tsCallStart);
    if (!this.isGroup && Av.fromStream(sess.remoteStream) === 0 && Av.fromStream(this.manager.gLocalAv) === 0) {
        this._fire('onNoMediaOnBothEnds');
    }
};

Call.prototype.muteUnmute = function(av) {
    var s = this.manager.gLocalStream;
    if (!s) {
        return;
    }
    var oldAv = Av.fromStream(s);
    var enableVideo = (av & Av.Video) && ((oldAv & Av.Video) == 0);
    var enableAudio = (av & Av.Audio) && ((oldAv & Av.Audio) == 0);
    var senders = this.manager.getAudioVideoSenderCount(this.chatid);
    assert(senders);
    if (enableAudio) {
        if (senders.audio >= RtcModule.kMaxCallAudioSenders) {
            this.logger.warn("Can't unmute mic, too many audio senders in call");
            av &= ~Av.Audio;
        }
    }
    if (enableVideo) {
        if (senders.video >= RtcModule.kMaxCallVideoSenders) {
            this.logger.warn("Can't unmute camera, too many video senders in call");
            av &= ~Av.Video;
        }
    }

    if (av === oldAv) {
        return;
    }
    av = this.manager._muteUnmute(av);
    if (av === oldAv) {
        return;
    }
    var roomCallState = this.manager.offCallStates[this.chatid];
    assert(roomCallState);
    var userid = this.manager.chatd.userId;
    var clientid = this.shard.clientId;

    roomCallState.peerAv[userid + clientid] = av;
    this.manager._fire('onClientAvChange', this.chatid, userid, clientid, av);

    for (var sid in this.sessions) {
        this.sessions[sid]._sendAv(av);
    }
    this._bcastCallData(CallDataType.kMute);
};

Call.prototype.localAv = function() {
    return this.manager.gLocalAv;
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
    A: broadcast RTCMD.JOIN callid.8 anonId.8
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
        => send SESSION callid.8 sid.8 anonId.8 encHashKey.32 actualCallId.8
        => call state: CallState.kCallInProgress (in case of group calls call state may already be kCallInProgress)

    A: send SDP_OFFER sid.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
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
    if (packet.type === RTCMD.SDP_OFFER) { // peer's offer
        assert(sessParams);
        // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        self.isJoiner = false;
        self.sid = data.substr(0, 8);
        self.state = SessState.kWaitLocalSdpAnswer;
        self.peerAnonId = data.substr(8, 8);
        var ohk = sessParams.ownHashKey;
        assert(ohk && ohk.length === 32);
        self.ownHashKey = ohk;
        // The peer is likely to send ICE candidates immediately after the offer,
        // but we can't process them until setRemoteDescription is ready, so
        // we have to store them in a queue
        self.peerHash = data.substr(48, 32);
        self.peerHashKey = self.crypto.decryptNonceFrom(self.peer, data.substr(16, 32));
        self.peerAv = data.charCodeAt(80);
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
        self.peerHashKey = self.crypto.decryptNonceFrom(this.peer, data.substr(24, 32));
    } else {
        assert(false, "Attempted to create a Session object with packet of type",
            constStateToText(RTCMD, packet.type));
    }
    self.logger = MegaLogger.getLogger("sess[" + base64urlencode(this.sid) + "]",
        call.manager._loggerOpts, call.logger);
    self.setupTimer = setTimeout(function() {
        if (self.state >= SessState.kSessInProgress) {
            return;
        }
        var term;
        if (self.rtcConn) {
            var iceState = self.rtcConn.iceConnectionState;
            // if ICE server does not respond, only one side may be stuck to 'checking',
            // the other one may be at 'new'.
            if (iceState === 'checking') {
                term = Term.kErrIceTimeout;
            }
        }
        if (!term) {
            term = Term.kErrSessSetupTimeout;
        }
        self.terminateAndDestroy(term);
    }, RtcModule.kSessSetupTimeout);
}

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

Session.prototype.verifySdpOfferSendAnswer = function() {
    var self = this;
    if (!self.verifySdpFingerprints(self.peerSdpOffer)) {
        self.logger.warn("Fingerprint verification error, immediately terminating session");
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forge attempt");
        return Promise.reject("Fingerprint verification failed");
    }
    var sdp = new RTCSessionDescription({type: 'offer', sdp: self.peerSdpOffer});
    self._mungeSdp(sdp);
    return self.rtcConn.setRemoteDescription(sdp)
    .catch(function(err) {
        return Promise.reject({err: err, remote: true});
    })
    .then(function() {
        if (self.state > SessState.kSessInProgress) {
            return Promise.reject({err: "Session killed"});
        }
        return self.rtcConn.createAnswer(self.pcConstraints());
    })
    .then(function(sdp) {
        if (self.state > SessState.kSessInProgress) {
            return Promise.reject({err: "Session killed"});
        }
        self.ownSdpAnswer = sdp.sdp;
        return self.rtcConn.setLocalDescription(sdp);
    })
    .then(function() {
        // SDP_ANSWER sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
        self.ownFprHash = self.crypto.mac(self.ownSdpAnswer, self.peerHashKey);
        var success = self.cmd(
            RTCMD.SDP_ANSWER,
            self.ownFprHash +
            String.fromCharCode(Av.fromStream(self.call.manager.gLocalStream)) +
            Chatd.pack16le(self.ownSdpAnswer.length) +
            self.ownSdpAnswer
        );
        if (success) {
            self.logger.log("Successfully generated and sent SDP answer");
        }
    })
    .catch(function(err) {
        // self.cmd() doesn't throw, so we are here because of other error
        var msg;
        if (err.remote) {
            msg = "Error accepting remote SDP offer: " + err.err;
        } else {
            if (err.stack) {
                err = err.stack;
            } else if (err.err) {
                err = err.err;
            }
            msg = "Error creating SDP answer: " + err;
        }
        self.terminateAndDestroy(Term.kErrSdp, msg);
    });
};

Session.prototype.pcConstraints = function() {
    return this.call.manager.pcConstraints;
};

Session.prototype.getPeerNetworkQuality = function() {
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
    switch (packet.type) {
        case RTCMD.SDP_ANSWER:
            this.msgSdpAnswer(packet);
            return;
        case RTCMD.ICE_CANDIDATE:
            this.msgIceCandidate(packet);
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
    var conn = self.rtcConn = new RTCPeerConnection({ iceServers: iceServers });
    if (self.call.manager.gLocalStream) {
        conn.addStream(self.call.manager.gLocalStream);
    }
    conn.onicecandidate = function(event) {
        // mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen
        var cand = event.candidate;
        if (!cand) {
            return;
        }
        var ctype = cand.candidate.match(/typ\s([^\s]+)/)[1];
        if (localStorage.forceRelay && ctype !== 'relay') {
            self.logger.warn("forceRelay: Not sending a '" + ctype + "' ICE candidate because it is not a relay");
            return;
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
        data += Chatd.pack16le(cand.candidate.length);
        data += cand.candidate;
        self.cmd(RTCMD.ICE_CANDIDATE, data);
    };
    conn.onaddstream = function(event) {
        var stream = self.remoteStream = event.stream;
        self._fire("onRemoteStreamAdded", stream);
        if (stream.getAudioTracks().length) {
            // self.audioLevelMonitor = new AudioLevelMonitor(stream, self.handler);
        }
        // FIXME: We never had audio work from the GUI player if video is disabled,
        // and the audio was coming from this 'internal' player. We need to fix that ASAP
        var player = self.mediaWaitPlayer = document.createElement('video');
        RTC.attachMediaStream(player, self.remoteStream);
    };
    conn.onremovestream = function(event) {
        if (self.audioLevelMonitor) {
            self.audioLevelMonitor.disconnect();
        }
        self._fire("onRemoteStreamRemoved");
        self.self.remoteStream = null;
    };
    conn.onsignalingstatechange = function(event) {
        var state = conn.signalingState;
        self.logger.log('Signaling state change to', state);
    };
    conn.oniceconnectionstatechange = function (event) {
        var state = conn.iceConnectionState;
        self.logger.debug('ICE connstate changed to', state);
        if (self.state >= SessState.kTerminating) { // use double equals because state might be
            return;                                 // some internal enum that converts to string?
        }
        if (state === 'disconnected') {
            self.terminateAndDestroy(Term.kErrIceDisconn);
        } else if (state === 'failed') {
            self.terminateAndDestroy(Term.kErrIceFail);
        } else if (state === 'connected') {
            self._setState(SessState.kSessInProgress);
            self._tsIceConn = Date.now();
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
    // RTC.Stats will be set to 'false' if stats are not available for this browser
    if ((typeof RTC.Stats === 'undefined') && (typeof statsGlobalInit === 'function')) {
        statsGlobalInit(conn);
    }
};

// stats interface
Session.prototype.onStatCommonInfo = function(info) {
};

Session.prototype.onStatSample = function(sample, added) {
    // pollStats() initiates this call, and is called on the session only if
    // it has a statRecorder, but onStatSample() is called back asynchronously,
    // so meanwhile statRecorder may be gone
    if (!this.statRecorder) {
        return -1;
    }
    var ret = this.calcNetworkQuality(sample);
    if (Date.now() - this.statRecorder.getStartTime() >= 6000) {
        this._updatePeerNetworkQuality(ret);
    }
    return ret;
};
// ====

Session.prototype._sendAv = function(av) {
    this.cmd(RTCMD.MUTE, String.fromCharCode(av));
};

Session.prototype.sendOffer = function() {
    var self = this;
    assert(self.isJoiner); // the joiner sends the SDP offer
    assert(self.peerAnonId);
    self._createRtcConn();
    self.rtcConn.createOffer(self.pcConstraints())
    .then(function (sdp) {
    /*  if (self.state !== SessState.kWaitSdpAnswer) {
            return;
        }
    */

        self.ownSdpOffer = sdp.sdp;
        return self.rtcConn.setLocalDescription(sdp);
    })
    .then(function() {
        // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        self.cmd(RTCMD.SDP_OFFER,
            self.call.manager.ownAnonId +
            self.crypto.encryptNonceTo(self.peer, self.ownHashKey) +
            self.crypto.mac(self.ownSdpOffer, self.peerHashKey) +
            String.fromCharCode(Av.fromStream(self.call.manager.gLocalStream)) +
            Chatd.pack16le(self.ownSdpOffer.length) +
            self.ownSdpOffer
        );
        assert(self.state === SessState.kWaitSdpAnswer);
    })
    .catch(function(err) {
        if (err.stack) {
            err = err.stack;
        } else if (err.err) {
            err = err.err;
        }
        self.terminateAndDestroy(Term.kErrSdp, "Error creating SDP offer: " + err);
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
    sess = new Session(self, packet, sentParams);
    assert(sess.sid === sentParams.sid);
    self.sessions[sess.sid] = sess;
    self._notifyNewSession(sess);
    sess._createRtcConn();
    sess.verifySdpOfferSendAnswer();
};

Session.prototype.msgSdpAnswer = function(packet) {
    var self = this;
    if (self.state !== SessState.kWaitSdpAnswer) {
        self.logger.warn("Ignoring unexpected SDP_ANSWER");
        return;
    }
    // SDP_ANSWER sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
    var data = packet.data;
    this.peerAv = data.substr(40, 1).charCodeAt(0);
    var sdpLen = Chatd.unpack16le(data.substr(41, 2));
    assert(data.length >= sdpLen + 43);
    self.peerSdpAnswer = data.substr(43, sdpLen);
    self.peerHash = data.substr(8, 32);
    if (!self.verifySdpFingerprints(self.peerSdpAnswer)) {
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forgery");
        return;
    }

    var sdp = new RTCSessionDescription({type: 'answer', sdp: self.peerSdpAnswer});
    self._mungeSdp(sdp);
    self.rtcConn.setRemoteDescription(sdp)
    .then(function() {
        if (self.state > SessState.kSessInProgress) {
            return Promise.reject("Session killed");
        }
    })
    .catch(function(err) {
        var msg = "Error setting SDP answer: " + err;
        self.terminateAndDestroy(Term.kErrSdp, msg);
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
    if (self.state === SessState.kTerminating) {
        if (!self.terminatePromise) { //we are waiting for session terminate by peer
            self.logger.warn("terminateAndDestroy: Already waiting for termination");
            // This promise never resolves, the actual termination is done by waitAllSessionsTerminated
            return new Promise(function() {});
        } else {
            return self.terminatePromise;
        }
    } else if (self.state === SessState.kTerminated) {
        return Promise.resolve();
    }

    if (msg) {
        self.logger.error("Terminating due to:", msg);
    }
    self._setState(SessState.kTerminating);
    self.terminatePromise = new Promise(function(resolve, reject) {
        // Send SESS_TERMINATE synchronously (in case of tab close, the event loop will exit,
        // so no chance of doing it async), but destroy async so that we have dont have the
        // sessions object of a call altered if destroyed from a loop

        // destroy() sets state to kDestroyed
        if (!self.cmd(RTCMD.SESS_TERMINATE, String.fromCharCode(code))) {
            setTimeout(function() {
                self._destroy(code, msg);
                resolve(null);
            }, 0);
        } else {
            var ackFunc = function(packet) {
                if (self.state !== SessState.kTerminating) {
                    return;
                }
                if (packet && packet.type === RTCMD.SESS_TERMINATE) {
                    // It's not actually an ack, but peer terminated at the same time
                    var peerReason = packet.data.charCodeAt(8);
                    if (!isTermError(peerReason) && isTermError(code)) {
                        // We saw error, but peer terminates on purpose.
                        // This happens for example when the tab is being closed - first the webrtc
                        // stream gets disconnected and we see kErrIceDisconnect, and immediately
                        // after that we receive SESS_TERMINATE with kAppTerminating, serving as
                        // an ACK to our own SESS_TERMINATE. In such a case, we use the peer's reason,
                        // to prevent our client retrying the session
                        code = peerReason;
                        msg = null;
                    }
                }
                self._destroy(code, msg);
                resolve(packet);
            };
            self.terminateAckCallback = ackFunc;
            setTimeout(function() {
                ackFunc(null);
            }, 1000);
        }
    });
    return self.terminatePromise;
};

Session.prototype.msgSessTerminateAck = function(packet) {
    if (this.state !== SessState.kTerminating) {
        this.logger.warn("Ignoring unexpected TERMINATE_ACK");
        return;
    }
    assert(this.terminateAckCallback);
    var cb = this.terminateAckCallback;
    delete this.terminateAckCallback;
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
    if (self.state === SessState.kTerminating && this.terminateAckCallback) {
        // handle terminate as if it were an ack - in both cases the peer is terminating
        self.msgSessTerminateAck(packet);
        if (self.state === SessState.kDestroyed) { // the ack handler destroyed it
            return;
        }
    }
    if (self.state === SessState.kDestroyed) {
        return;
    }
    self._setState(SessState.kTerminating);
    self._destroy(reason | Term.kPeer);
};

/** Terminates a session without the signalling terminate handshake.
  * This should normally not be called directly, but via terminate(),
  * unless there is a network error
  */
Session.prototype._destroy = function(code, msg) {
    assert(typeof code !== 'undefined');
    if (this.state >= SessState.kDestroyed) {
        this.logger.error("Session.destroy(): Already destroyed");
        return;
    }
    if (msg) {
        this.logger.log("Destroying session due to:", msg);
    }

    this.submitStats(code, msg);

    if (this.rtcConn) {
        if (this.rtcConn.signallingState !== 'closed') {
            this.rtcConn.close();
        }
        this.rtcConn = null;
    }
    this._setState(SessState.kDestroyed);
    this._fire("onRemoteStreamRemoved");
    this.call._removeSession(this, code);
};
Session.prototype.submitStats = function(termCode, errInfo) {
    var stats;
    if (this.statRecorder) {
        stats = this.statRecorder.getStats(base64urlencode(this.call.id), base64urlencode(this.sid));
        delete this.statRecorder;
    } else { //no stats, but will still provide callId and duration
        stats = {
            cid: base64urlencode(this.call.id),
            sid: base64urlencode(this.sid),
            bws: RTC.getBrowserVersion()
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
    var match = true; // constant time compare
    for (var i = 0; i < len; i++) {
        match &= hash[i] === peerHash[i];
    }
    return match;
};

Session.prototype.msgIceCandidate = function(packet) {
    // sid.8 mLineIdx.1 midLen.1 mid.midLen candLen.2 cand.candLen
    var self = this;
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
    return self.rtcConn.addIceCandidate(cand)
        .catch(function(err) {
            self.terminateAndDestroy(Term.kErrProtocol, err);
            return Promise.reject(err);
        });
};

Session.prototype.msgMute = function(packet) {
    var av = packet.data.charCodeAt(8);
    this.peerAv = av;
    this._fire('onRemoteMute', av);
    var alm = this.audioLevelMonitor;
    if (alm) {
        if ((av & Av.Audio) === 0) {
            alm.disconnect();
        } else if (!alm.isConnected()) {
            alm.connect();
        }
    }
};

Session.prototype._fire = function(evName) {
    var func = this.handler[evName];
    var args = [].slice.call(arguments, 1);
    var logger = this.logger;
    if (logger.isEnabled()) {
        var msg = "fire " + evName;
        if (evName === 'onDestroy') {
            msg += '(' + constStateToText(Term, arguments[1]) + ')';
        }
        if (!func) {
            msg += " ...unhandled ";
        }
        msg += eventArgsToString(args);
        logger.log(msg);
    }
    if (!func) {
        return;
    }
    try {
        func.apply(this.handler, args);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
    }
};
Session.prototype._mungeSdp = function(sdp) {
    try {
        var maxbr = this.isGroup ? localStorage.webrtcMaxGroupBr : localStorage.webrtcMaxBr;
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
        this.logger.warn(apl, "audio packets lost, returning 0 link quality");
        return 0;
    }
    if (sample.v && sample.v.s) {
        // We send video, this is the next most reliable way to estimate our link quality
        var result;
        var vs = sample.v.s;
        var bwav = vs.bwav;
        var width = vs.width;
        if (bwav != null && width != null) {
            if (width >= 480) {
                if (bwav < 30) {
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
            return 0;
        }
    }
    this.logger.warn("Don't have any key stat param to estimate network quality from, returning 2");
    return 2;
};

Session.prototype.calcNetworkQualityFirefox = function(sample) {
    //  console.warn(sample);
    if (sample.d_apl) {
        // We have lost audio packets since the last sample, that's the worst network quality
        this.logger.warn("Audio packets lost, returning 0 link quality");
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
var Av = { Audio: 1, Video: 2, Mask: 3 };
Av.fromStream = function(stream) {
    if (!stream) {
        return 0;
    }
    var av = 0;
    if (stream.getAudioTracks) {
        var at = stream.getAudioTracks();
        for (var i = 0; i < at.length; i++) {
            if (at[i].enabled) {
                av |= Av.Audio;
            }
        }
    } else {
        console.warn("stream has no getAudioTracks() method, it is", stream.getAudioTracks);
    }
    if (stream.getVideoTracks) {
        var vt = stream.getVideoTracks();
        for (var i = 0; i < vt.length; i++) {
            if (vt[i].enabled) {
                av |= Av.Video;
            }
        }
    } else {
        console.warn("stream has no getVideoTracks() method, it is", stream.getVideoTracks);
    }
    return av;
};

Av.fromMediaOptions = function(opts) {
    var result = opts.audio ? Av.Audio : 0;
    if (opts.video) {
        result |= Av.Video;
    }
    return result;
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
    if (av & Av.Audio) {
        if (av & Av.Video) {
            return 'a+v';
        } else {
            return 'a';
        }
    } else if (av & Av.Video) {
        return 'v';
    } else {
        return '-';
    }
};

var RTCMD = Object.freeze({
//  CALL_REQUEST: 0, // initiate new call, receivers start ringing
    CALL_RINGING: 1, // notifies caller that there is a receiver and it is ringing
    CALL_REQ_DECLINE: 2, // decline incoming call request, with specified Term code
    // (can be only kBusy and kCallRejected)
    CALL_REQ_CANCEL: 3,  // caller cancels the call requests, specifies the request id
    CALL_TERMINATE: 4, // hangup existing call, cancel call request. Works on an existing call
    JOIN: 5, // join an existing/just initiated call. There is no call yet, so the command identifies a call request
    SESSION: 6, // join was accepter and the receiver created a session to joiner
    SDP_OFFER: 7, // joiner sends an SDP offer
    SDP_ANSWER: 8, // joinee answers with SDP answer
    ICE_CANDIDATE: 9, // both parties exchange ICE candidates
    SESS_TERMINATE: 10, // initiate termination of a session
    SESS_TERMINATE_ACK: 11, // acknowledge the receipt of SESS_TERMINATE, so the sender can safely stop the stream and
    // it will not be detected as an error by the receiver
    MUTE: 12 // Notify peer that we muted/unmuted
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
    kCallGone: 8,
    kBusy: 9,               // < Peer is in another call
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
    kErrorLast: 40,         // < Last enum indicating call termination due to error
    kLast: 40,              // < Last call terminate enum value
    kPeer: 128              // < If this flag is set, the condition specified by the code happened at the peer,
    // < not at our side
});

function isTermError(code) {
    code &= 0x7f;
    return ((code >= Term.kErrorFirst) && (code <= Term.kErrorLast));
}
function isTermRetriable(code) {
    return isTermError(code) && (code !== Term.kErrPeerOffline);
}

var CallState = Object.freeze({
    kInitial: 0, // < Call object was initialised
    kWaitLocalStream: 1,
    kHasLocalStream: 2,
    kReqSent: 3, // < Call request sent
    kRingIn: 4, // < Call request received, ringing
    kJoining: 5, // < Joining a call
    kCallInProgress: 6,
    kTerminating: 7, // < Call is waiting for sessions to terminate
    kDestroyed: 8 // < Call object is not valid anymore
});

var CallStateAllowedStateTransitions = {};
CallStateAllowedStateTransitions[CallState.kInitial] = [
    CallState.kWaitLocalStream,
    CallState.kReqSent
];
CallStateAllowedStateTransitions[CallState.kWaitLocalStream] = [
    CallState.kHasLocalStream,
    CallState.kTerminating
];
CallStateAllowedStateTransitions[CallState.kHasLocalStream] = [
    CallState.kJoining,
    CallState.kReqSent,
    CallState.kTerminating
];
CallStateAllowedStateTransitions[CallState.kReqSent] = [
    CallState.kCallInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kRingIn] = [
    CallState.kWaitLocalStream,
    CallState.kCallInProgress,
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
    kWaitSdpOffer: 1, // < Session just created, waiting for SDP offer from initiator
    kWaitSdpAnswer: 2, // < SDP offer has been sent by initiator, waniting for SDP answer
    kWaitLocalSdpAnswer: 3, // < Remote SDP offer has been set, and we are generating SDP answer
    kSessInProgress: 5,
    kTerminating: 6, // < Session is in terminate handshake
    kDestroyed: 7 // < Session object is not valid anymore
});


var SessStateAllowedStateTransitions = {};
SessStateAllowedStateTransitions[SessState.kWaitSdpOffer] = [
    SessState.kWaitLocalSdpAnswer,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kWaitLocalSdpAnswer] = [
    SessState.kSessInProgress,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kWaitSdpAnswer] = [
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
    var isIncoming = self.isJoiner;
    switch (terminationCode) {
        case Term.kUserHangup:
            switch (self.predestroyState) {
                case CallState.kRingIn:
                    return UICallTerm.MISSED;
                case CallState.kReqSent:
                    return UICallTerm.ABORTED;
                case CallState.kCallInProgress:
                    return UICallTerm.ENDED;
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
                var midLen = cmd.charCodeAt(33);
                var candLen = Chatd.unpack16le(cmd.substr(33 + midLen, 2));
                result += getSid() + ', mid: ' + cmd.substr(34, midLen) +
                    '\n' + cmd.substr(35 + midLen, candLen);
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

RtcModule.callDataToString = function(cmd, tx) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (payload.len)
    var result = 'CALLDATA chatid: ' + base64urlencode(cmd.substr(1, 8));
    if (!tx) {
        result += ' from: ' + base64urlencode(cmd.substr(9, 8)) +
        ' (0x' + Chatd.dumpToHex(cmd, 17, 4, true) + ')';
    }
    var len = Chatd.unpack16le(cmd.substr(21, 2));
    if (len < 1) {
        return result;
    }
    if (len < 10) {
        result += ' data:\n' + Chatd.dumpToHex(cmd, 23);
        return result;
    }

    result += ' callid: ' + base64urlencode(cmd.substr(23, 8));
    var type = cmd.charCodeAt(31);
    result += ' type: ' + constStateToText(CallDataType, type);
    var av = cmd.charCodeAt(32);
    result += ' av: ' + Av.toString(av);
    if (type === CallDataType.kTerminated) {
        assert(len >= 11);
        result += ' reason: ' + constStateToText(CallManager.CALL_END_REMOTE_REASON, cmd.charCodeAt(33));
    }
    return result;
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
        handler = { onAudioLevelChange: function(level) {  console.log("audio level change:", level);  } };
    }
    self.handler = handler;
    self._changeThreshold = changeThreshold ? (changeThreshold / 100) : 0.05;
    var ctx = self.audioCtx = new AudioContext();
    self.source = ctx.createMediaStreamSource(stream);
    var scriptNode = self.scriptNode = ctx.createScriptProcessor(8192, 1, 1);
    scriptNode.onaudioprocess = function(event) {
        var inData = event.inputBuffer.getChannelData(0);
        var max = Math.abs(inData[0]);
        for (var sn = 2; sn < inData.length; sn += 2) {
            var sample = Math.abs(inData[sn]);
            if (sample > max) {
                max = sample;
            }
        }
        var lastLevel = self._lastLevel;
        if (Math.abs(max - lastLevel) >= self._changeThreshold ||
           (max < 0.005 && lastLevel >= 0.005)) { // return to zero
            self._lastLevel = max;
            handler.onAudioLevelChange(Math.round(max * 100));
        }
    };
    this.connect();
}

AudioLevelMonitor.prototype.connect = function() {
    if (this._connected) {
        return;
    }
    this.source.connect(this.scriptNode);
    if (RTC.isChrome) {
        this.scriptNode.connect(this.audioCtx.destination);
    }
    this._connected = true;
};

AudioLevelMonitor.prototype.disconnect = function() {
    if (!this._connected) {
        return;
    }
    this.source.disconnect(this.scriptNode);
    if (RTC.isChrome) {
        this.scriptNode.disconnect(this.audioCtx.destination);
    }
    delete this._connected;
    if (this._lastLevel >= 0.005) {
        this._lastLevel = 0.0;
        this.handler.onAudioLevelChange(0);
    }
};

AudioLevelMonitor.prototype.isConnected = function() {
    return this._connected != null;
};

AudioLevelMonitor.prototype.setChangeThreshold = function(val) {
    self._changeThreshold = val / 100;
};

AudioLevelMonitor.prototype.lastLevel = function() {
    return Math.round(this._lastLevel * 100);
};

function AudioMutedChecker(stream, handler, timeout) {
    var self = this;
    self._timeout = timeout;
    self.handler = handler;
    self._detected = false;
    self._levelMonitor = new AudioLevelMonitor(stream, self, 1);
    self.arm();
    // console.log("Mic input checker armed");
}

AudioMutedChecker.prototype.onAudioLevelChange = function(level) {
    if (level < 1) {
        // if we disconnect, there will be an artificial change to 0
        // console.warn("AudioMutedChecker: Received level change to", level, "- should be > 0");
        return;
    }
    this._detected = true;
    this.disconnect();
    console.log("Mic input detected");
};

AudioMutedChecker.prototype.detected = function() {
    return this._detected;
};

AudioMutedChecker.prototype.arm = function() {
    var self = this;
    if (self._timer || self._detected) {
        return;
    }
    self._timer = setTimeout(function() {
        if (self._detected) {
            return;
        }
        console.warn("No mic input detected");
        self.handler.onNoInputAudioDetected();
    }, self._timeout);
};

AudioMutedChecker.prototype.connect = function() {
    this._levelMonitor.connect();
    this.arm();
};

AudioMutedChecker.prototype.disconnect = function() {
    var self = this;
    if (self._timer) {
        clearTimeout(self._timer);
        delete self._timer;
    }
    this._levelMonitor.disconnect();
};

AudioMutedChecker.prototype.isConnected = function() {
    return this._levelMonitor.isConnected();
};

RtcModule.callDataToString = function(cmd, tx) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (payload.len)
    var result = ' chatid: ' + base64urlencode(cmd.substr(1, 8));
    if (!tx) {
        result += ' from: ' + base64urlencode(cmd.substr(9, 8)) +
        ' (0x' + Chatd.dumpToHex(cmd, 17, 4, true) + ')';
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
    var av = cmd.charCodeAt(32);
    result += ' av: ' + Av.toString(av);
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

scope.RtcModule = RtcModule;
scope.Call = Call;
scope.Session = Session;
scope.Av = Av;
scope.Term = Term;
scope.RTCMD = RTCMD;
scope.SessState = SessState;
scope.CallState = CallState;
scope.CallDataType = CallDataType;
}(window));
