(function(scope) {
    'use strict'; // jscs:disable validateIndentation

var CallDataType = Object.freeze({
    kNotRinging: 0,
    kRinging: 1,
    kTerminated: 2
});

function RtcModule(chatd, crypto, handler, iceServers) {
    if (!RTC) {
        throw new RtcModule.NotSupportedError(
            "Attempting to create RtcModule, but there is no webRTC support in this browser"
        );
    }
    this.setupLogger();
    this.chatd = chatd;
    this.crypto = crypto;
    this.ownAnonId = base64urldecode(u_handle); //crypto.ownAnonId();
    this.handler = handler;
    this.calls = {};
    this.iceServers = iceServers;
    this.pc_constraints = {};
    this.pcConstraints = {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true
    };
    chatd.on('onClose', this.onDisconnect.bind(self));
    chatd.on('membersUpdated', function(event) {
        self.onUserJoinLeave(event.chatId, event.userId, event.priv);
    });
    chatd.setRtcHandler(this);
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
RtcModule.kMediaGetTimeout = 60000;
RtcModule.kSessSetupTimeout = 20000;

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
/*
   Globally configures the webRTC abstraction layer
*/
RtcModule.prototype.onDisconnect = function(shard) {
    // notify all relevant calls
    for (var chatid in shard.chatIds) {
        var call = this.calls[chatid];
        if (call && call.state < CallState.kTerminating) {
            call._destroy(Term.kErrNetSignalling, false);
        }
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
        if (this.handler.isGroupChat(chatid)) {
            this.logger.log("Ignoring a group chat RTMSG");
            return;
        }
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
            self.logger.error("Ignoring short CALLDATA packet");
            return;
        }
        var type = msg.charCodeAt(31);
        if (type !== CallDataType.kRinging) {
            return;
        }
        var chatid = msg.substr(1, 8);
        if (self.handler.isGroupChat(chatid)) {
            this.logger.log("Ignoring group chat CALLDATA");
            return;
        }
        var chat = self.chatd.chatIdMessages[chatid];
        if (!chat) {
            self.logger.error(
                "Received CALLDATA for unknown chatid " + chatid + ". Ignoring"
            );
            return;
        }
        // get userid and clientid
        var userid = msg.substr(9, 8);
        var clientid = msg.substr(17, 4);
        if (userid === self.chatd.userId && clientid === shard.clientId) {
            console.error("Ignoring CALLDATA sent back to sender");
            return;
        }
        // leave only the payload, we don't need the headers anymore
        var parsedCallData = {
            chatid: chatid,
            fromUser: userid,
            fromClient: clientid,
            shard: shard,
            data: msg.substr(23, payloadLen) // actual length of msg string may be more than len,
        };                                   // if there are other commands appended
        self.msgCallData(parsedCallData);
    } catch(e) {
        self.logger.error("handleCallData: Exception:", e);
    }
}

RtcModule.prototype.onUserJoinLeave = function(chatid, userid, priv) {
};

RtcModule.prototype.msgCallData = function(parsedCallData) {
    var self = this;
    if (parsedCallData.fromUser === self.chatd.userId) {
        self.logger.log("Ignoring call request from another client of our user");
        return;
    }
    parsedCallData.callid = parsedCallData.data.substr(0, 8);
    assert(parsedCallData.callid);
    var chatid = parsedCallData.chatid;
    function createNewCall() {
        var call = new Call(self, parsedCallData, self.handler.isGroupChat(chatid), true);
        self.calls[chatid] = call;
        call.handler = self.handler.onCallIncoming(call);
        assert(call.handler);
        assert(call.state === CallState.kRingIn);
        return call;
    }
    function sendBusy() {
        // Broadcast instead of send only to requestor, so that all other our clients know we rejected the call
        self.cmdBroadcast(RTCMD.CALL_REQ_DECLINE, parsedCallData.chatid,
            parsedCallData.callid + String.fromCharCode(Term.kBusy));
    }
    var keys = Object.keys(self.calls);
    if (keys.length) {
        assert(keys.length === 1);
        var existingChatid = keys[0];
        var existingOutCall = self.calls[existingChatid];
        if (existingOutCall.state < CallState.kJoining) {
            var ci = existingOutCall._callerInfo;
            if (ci) {
                if (ci.fromUser === parsedCallData.fromUser && ci.fromClient === parsedCallData.fromClient &&
                    ci.data === parsedCallData.data) {
                    //chatd sends duplicate CALLDATAs to immediately notify about incoming calls before the login and history fetch completes
                    return;
                }
                //existing call and this call are both incoming, we don't support this
                self.logger.warn("Another incoming call during an incoming call");
                sendBusy();
                return;
            }
            // If our user handle is greater than the calldata sender's, our outgoing call
            // survives, and their call request is declined. Otherwise, our existing outgoing
            // call is hung up, and theirs is answered
            if (self.chatd.userId < self.handler.get1on1RoomPeer(chatid)) {
                self.logger.warn("We have an outgoing call, and there is an incoming call - we don't have priority.",
                    "Hanging up our outgoing call and answering the incoming");
                var av = existingOutCall._callInitiateAvFlags;
                existingOutCall.hangup()
                .then(function() {
                    assert(!self.calls[existingChatid]);
                    // Make sure that possible async messages from the hangup
                    // are processed by the app before creating the new call
                    setTimeout(function() {
                        //create an incoming call from the packet, and auto answer it
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
        } else {
            // Call state is either kInProgress or kTerminating
            self.logger.log("Received call request while another call is in progress or terminating, sending busy");
            sendBusy();
            return;
        }
    }
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
    var len = payload ? payload.length + 1 : 1;
    assert(info.chatid);
    assert(info.fromUser);
    assert(info.fromClient);

    var data = info.chatid + info.fromUser + info.fromClient + Chatd.pack16le(len) + String.fromCharCode(type);
    if (payload) {
        data += payload;
    }
    if (!info.shard.rtcmd(Chatd.Opcode.RTMSG_ENDPOINT, data)) {
        throw new Error("cmdEndpoint: Send error trying to send command " + constStateToText(RTCMD, type));
    }
};

RtcModule.prototype.cmdBroadcast = function(op, chatid, payload) {
    assert(chatid);
    var len = payload ? payload.length + 1 : 1;

    var data = chatid+'\0\0\0\0\0\0\0\0\0\0\0\0' + Chatd.pack16le(len) + String.fromCharCode(op);
    if (payload) {
        data += payload;
    }
    var shard = this.chatd.chatIdShard[chatid];
    if (!shard) {
        self.logger.error("cmdBroadcast: No shard for chatid", base64urlencode(chatid));
        return;
    }
    if (!shard.rtcmd(Chatd.Opcode.RTMSG_BROADCAST, data)) {
        throw new Error("cmdEndpoint: Send error trying to send command " + constStateToText(RTCMD, op));
    } else {
        return true;
    }
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
    if (Object.keys(this.calls).length === 0 && this.gLocalStream) {
        RTC.stopMediaStream(this.gLocalStream);
        delete this.gLocalStream;
        delete this.localMediaPromise;
    }
};

RtcModule.prototype._getLocalStream = function(av) {
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
    setTimeout(function() {
        if (!resolved) {
            self._fire('onLocalMediaRequest');
            notified = true;
        }
    }, 1000);

    var pms = RTC.getUserMedia({audio: true, video: true})
        .catch(function(error) {
            self.logger.warn("getUserMedia: Failed to get audio+video, trying audio-only...");
            return RTC.getUserMedia({audio: true, video: false});
        })
        .catch(function(error) {
            self.logger.warn("getUserMedia: Failed to get audio only, trying video-only...");
            return RTC.getUserMedia({audio: false, video: true});
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
            // if all calls were not destroyed meanwhile
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

RtcModule.prototype._startOrJoinCall = function(chatid, av, handler, isJoin) {
    var self = this;
    var isGroup = this.handler.isGroupChat(chatid);
    var shard = self.chatd.chatIdShard[chatid];
    if (!shard) {
        throw new Error("startOrJoinCall: Unknown chatid " + base64urlencode(chatid));
    }
    var existing = self.calls[chatid];
    if (!existing && Object.keys(self.calls).length) {
        self.logger.warn("Not starting a call - there is already a call in another chatroom");
        return null;
    }
    if (existing && existing.state <= CallState.kInProgress) {
        self.logger.warn("There is already a call in this chatroom, not starting a new one");
        return null;
    }

    var call = new Call(
        this, {
            chatid: chatid,
            callid: this.crypto.random(8),
            shard: shard
        }, isGroup, isJoin, handler);

    self.calls[chatid] = call;
    call._startOrJoin(av);
    return call;
};

RtcModule.prototype.joinCall = function(chatid, av, handler) {
    return this._startOrJoinCall(chatid, av, handler, true);
};
RtcModule.prototype.startCall = function(chatid, av, handler) {
    return this._startOrJoinCall(chatid, av, handler, false);
};
RtcModule.prototype.onUserOffline = function(chatid, userid, clientid) {
    var call = this.calls[chatid];
    if (call) {
        call._onUserOffline(userid, clientid);
    }
};
RtcModule.prototype.onShutdown = function() {
    this.logger.warn("Shutting down....");
    var calls = this.calls;
    for (var chatid in calls) {
        var call = calls[chatid];
        if (call.state === CallState.kRingIn) {
            assert(Object.keys(call.sessions).length === 0);
        }
        call._destroy(Term.kAppTerminating, call.state !== CallState.kRingIn);
    }
    this.logger.warn("Shutdown complete");
};

RtcModule.prototype._fire = function(evName) {
    var self = this;
    var func = self.handler[evName];
    var logger = self.logger;
    if (logger.isEnabled()) {
        var msg = "fire " + evName;
        if (!func) {
            msg += " ...unhandled";
        }
        logger.log(msg);
    }
    if (!func) {
        return;
    }
    try {
        func.call(self.handler, arguments[1], arguments[2], arguments[3]);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
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

function Call(rtcModule, info, isGroup, isJoiner, handler) {
    this.manager = rtcModule;
    this.chatid = info.chatid;
    this.id = info.callid;
    this.handler = handler;
    this.shardNo = info.shard.shard;
    this.shard = info.shard;
    this.isGroup = isGroup;
    this.isJoiner = isJoiner; // the joiner is actually the answerer in case of new call
    this.sessions = {};
    this.sessRetries = { total: 0 };
    this.state = isJoiner ? CallState.kRingIn : CallState.kInitial;
    //  var level = this.manager.logger.options.minLogLevel();
    this.logger = MegaLogger.getLogger("call[" + base64urlencode(this.id) + "]",
            rtcModule._loggerOpts, rtcModule.logger);
    if (isJoiner) {
        this._callerInfo = info; // callerInfo is actually CALLDATA, needed for answering
    }
}

Call.prototype.handleMsg = function(packet) {
    var type = packet.type;
    switch (type)
    {
        case RTCMD.CALL_TERMINATE:
            this.msgCallTerminate(packet);
            return;
        case RTCMD.SESSION:
            this.msgSession(packet);
            return;
        case RTCMD.JOIN:
            this.msgJoin(packet);
            return;
        case RTCMD.CALL_RINGING:
            this.msgRinging(packet);
            return;
        case RTCMD.CALL_REQ_DECLINE:
            this.msgCallReqDecline(packet);
            return;
        case RTCMD.CALL_REQ_CANCEL:
            this.msgCallReqCancel(packet);
            return;
    }
    var data = packet.data;
    assert(data.length >= 8); // must start with sid.8
    var sid = data.substr(0, 8);
    var sess = this.sessions[sid];
    if (!sess) {
        this.logger.warn("Received " + constStateToText(RTCMD, type) +
            " for an existing call but non-existing session",
            base64urlencode(sid), "(" + Chatd.dumpToHex(sid) + ")");
        //        this.logger.warn("sessions:", Chatd.dumpToHex(Object.keys(this.sessions)[0]));
        return;
    }
    sess.handleMsg(packet);
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
    return self.manager._getLocalStream(av)
        .catch(function(err) {
            return Promise.reject(err);
        })
        .then(function(stream) {
            if (self.state > CallState.kInProgress) {
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
    if (code !== Term.kCallRejected && code !== Term.kBusy) {
        self.logger.warn("CALL_REQ_DECLINE with unexpected reason code", constStateToText(code));
    }

    if (packet.fromUser === self.manager.chatd.userId) {
        // Some other client of our user declined the call
        if (self.state !== CallState.kRingIn) {
            self.logger.warn("Ignoring CALL_REQ_DECLINE from another client of our user -",
                "the call is not in kRingIn state, but in ", constStateToText(CallState, self.state));
            return;
        }
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
    if (this.state >= CallState.kInProgress) {
        this.logger.warn("Ignoring unexpected CALL_REQ_CANCEL while in state", constStateToText(this.state));
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
    var term = packet.data.substr(8, 1);
    this._destroy(term | Term.kPeer, false);
};


Call.prototype.msgRinging = function(packet) {
    var self = this;
    if (self.state !== CallState.kReqSent && self.state !== CallState.kInProgress) {
        self.logger.warn("Ignoring unexpected RINGING");
        return;
    }
    var fromUser = packet.fromUser;
    if (!self.ringOutUsers) {
        self.ringOutUsers = {};
        self.ringOutUsers[fromUser] = true;
    } else {
        if (self.ringOutUsers[fromUser]) {
            return;
        }
        self.ringOutUsers[fromUser] = true;
    }
    this._fire("onRingOut", fromUser);
};
Call.prototype._clearCallOutTimer = function() {
    if (!this._callOutTimer) {
        return;
    }
    clearTimeout(this._callOutTimer);
    delete this._callOutTimer;
};

Call.prototype._bcastCallData = function(state, uiTermCode) {
    var self = this;
    var payload = self.id
        + String.fromCharCode(state)
        + String.fromCharCode(self._callInitiateAvFlags);
    if (state === CallDataType.kTerminated) {
        assert(uiTermCode != null);
        payload += String.fromCharCode(uiTermCode);
    }
    var cmd = self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0'
        + Chatd.pack16le(payload.length)
        + payload;

    if (!self.shard.cmd(Chatd.Opcode.CALLDATA, cmd)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
        return false;
    }
    return true;
};

Call.prototype.msgSession = function(packet) {
    var self = this;
    var callid = packet.data.substr(0, 8);
    if (callid !== self.id) {
        this.logger.log("Ignoring SESSION for another callid");
        return;
    }
    if (self.state === CallState.kJoining) {
        self._setState(CallState.kInProgress);
    } else if (self.state !== CallState.kInProgress) {
        this.logger.warn("Ignoring unexpected SESSION while in call state "+constStateToText(CallState, self.state));
        return;
    }
    var sid = packet.data.substr(8, 8);
    var sess = self.sessions[sid] = new Session(self, packet);
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

Call.prototype.msgJoin = function(packet) {
    var self = this;
    if (this.state === CallState.kRingIn && packet.fromUser === this.manager.chatd.userId) {
        this._destroy(Term.kAnsElsewhere, false);
    } else if (this.state === CallState.kInProgress || this.state === CallState.kReqSent) {
        packet.callid = packet.data.substr(0, 8);
        assert(packet.callid);
        if (this.state === CallState.kReqSent) {
            this._setState(CallState.kInProgress);
            if (!this._bcastCallData(CallDataType.kNotRinging)) {
                return;
            }
        }
        // create session to this peer
        var sess = new Session(this, packet);
        this.sessions[sess.sid] = sess;
        this._notifyNewSession(sess);
        sess._createRtcConn();
        sess._sendCmdSession(packet);
    } else {
        this.logger.warn("Ingoring unexpected JOIN");
        return;
    }
};
Call.prototype._gracefullyTerminateAllSessions = function(code, cb) {
    var self = this;
    var promises = [];
    for (var sid in self.sessions) {
        var sess = self.sessions[sid];
        promises.push(sess.terminateAndDestroy(code));
    }
    Promise.all(promises)
    .catch(function() {
        assert(false); // terminateAndDestroy() should never fail
    })
    .then(function() {
        cb();
    });
};
Call.prototype._waitAllSessionsTerminated = function(code, cb) {
    var self = this;
    var sessions = self.sessions;
    // if the peer initiated the call termination, we must wait for
    // all sessions to go away and remove the call
    for (var sid in sessions) {
        var sess = sessions[sid];
        sess._setState(SessState.kTerminating);
    }

    createTimeoutPromise(function() {
            return Object.keys(sessions).length <= 0;
        }, 200, 1400)
    .then(function() {
        cb();
    })
    .fail(function() {
        if (Object.keys(sessions).length > 0) {
            self.logger.warn("Timed out waiting for all sessions to terminate, force closing them");
            for (var sid in sessions) {
                var sess = sessions[sid];
                sess._destroy(code);
            }
        }
        cb();
    });
};

Call.prototype._destroy = function(code, weTerminate, msg) {
    assert(typeof code !== 'undefined');
    var self = this;
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
    self._clearCallOutTimer();
    var reasonNoPeer = code & ~Term.kPeer; // jscs:ignore disallowImplicitTypeConversion
    var pms = new Promise(function(resolve, reject) {
        self.logger.log("Terminating call in state", constStateToText(CallState, self.predestroyState),
            "with reason", constStateToText(Term, reasonNoPeer));
        if (self.predestroyState !== CallState.kRingIn && reasonNoPeer !== Term.kBusy) {
            // kBusy is a local thing, there is another call in the room
            self._bcastCallData(CallDataType.kTerminated, self.termCodeToHistCallEndedCode(code));
        } else {
            self.logger.log("Not posting termination CALLDATA because term code is",
                constStateToText(Term, reasonNoPeer),
                "and call state is", constStateToText(CallState, self.predestroyState));
        }
        if (weTerminate) {
            if (!self.isGroup) {
                // TODO: Maybe replace CALL_TERMINATE with CALLDATA? But we need the detailed termcode,
                // whereas the CALLDATA packet has the GUI state code
                self.cmdBroadcast(RTCMD.CALL_TERMINATE, String.fromCharCode(code));
            }
            // if we initiate the call termination, we must initiate the
            // session termination handshake
            self._gracefullyTerminateAllSessions(code, resolve);
        } else {
            self._waitAllSessionsTerminated(code, resolve);
        }
    });
    self._destroyPromise = pms.then(function() {
        if (self.state >= CallState.kDestroyed) {
            return;
        }
        assert(Object.keys(self.sessions).length === 0);
        self._stopIncallPingTimer();
        self._setState(CallState.kDestroyed);
        self._fire('onDestroy', reasonNoPeer, !!(code & 0x80), msg);// jscs:ignore disallowImplicitTypeConversion
        self.manager._removeCall(self);
    });
    return self._destroyPromise;
};

Call.prototype.cmdBroadcast = function(type, payload) {
    var self = this;
    var len = payload ? (payload.length + 1) : 1;
    var data = self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0' + Chatd.pack16le(len) + String.fromCharCode(type);

    if (payload) {
        data += payload;
    }
    if (!self.shard.rtcmd(Chatd.Opcode.RTMSG_BROADCAST, data)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, false); }, 0);
        return false;
    }
    return true;
};

Call.prototype._broadcastCallReq = function() {
    var self = this;
    if (self.state >= CallState.kTerminating) {
        console.warn("_broadcastCallReq: Call terminating/destroyed");
        return;
    }
    assert(self.state === CallState.kHasLocalStream);
    if (!self._bcastCallData(CallDataType.kRinging)) {
        return;
    }

    self._setState(CallState.kReqSent);
    self._startIncallPingTimer();
    self._callOutTimer = setTimeout(function() {
        if (self.state !== CallState.kReqSent) {
            return;
        }
        self.logger.log("Timed out waiting for ring confirmation, cancelling call request");
        self._destroy(Term.kRingOutTimeout, true);
    }, RtcModule.kRingOutTimeout);

    self._clearCallOutTimer();
    self._callOutTimer = setTimeout(function() {
        if (self.state !== CallState.kReqSent) {
            return;
        }
        self.logger.log("Answer timeout, cancelling call request");
        self._destroy(Term.kAnswerTimeout, true); // TODO: differentiate whether peer has sent us RINGING or not
    }, RtcModule.kCallAnswerTimeout);

    return true;
};
Call.prototype._startIncallPingTimer = function() {
    var self = this;
    self._inCallPingTimer = setInterval(function() {
        if (!self.shard.rtcmd(Chatd.Opcode.INCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0')) {
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
    self.shard.rtcmd(Chatd.Opcode.ENDCALL, self.chatid + '\0\0\0\0\0\0\0\0\0\0\0\0');
};

Call.prototype._removeSession = function(sess, reason) {
    var self = this;
    delete self.sessions[sess.sid];

    // If we want to terminate the call (no matter if initiated by us or peer), we first
    // set the call's state to kTerminating. If that is not set, then it's only the session
    // that terminates for a reason that is not fatal to the call,
    // and can try re-establishing the session
    if (self.state === CallState.kTerminating) {
        return;
    }
    var peer = sess.peer;
    var client = sess.peerClient;
    var endpointId = peer + client;
    var sessRetries = self.sessRetries;
    var totalRetries = ++sessRetries.total;
    var retryId;
    var retry = sessRetries[endpointId];
    // The retry.active flag is not cleared when the session is actually restored. Only the
    // combination of .active + no session to this peer + no newer retry means that this particular
    // retry is in progress
    if (retry) {
        retry.active = Date.now();
        retryId = ++retry.cnt;
    } else {
        sessRetries[endpointId] = {cnt: 1, active: Date.now() };
        retryId = 1;
    }

    // The original joiner re-joins, the peer does nothing, just keeps the call
    // ongoing and accepts the JOIN
    if (sess.isJoiner) {
        self.logger.log("Session to", base64urlencode(sess.peer), "failed, re-establishing it...");
        setTimeout(function() { // Execute it async, to avoid re-entrancy
            self.rejoinPeer(sess.peer, sess.peerClient);
        }, 0);
    } else {
        // Else wait for peer to re-join...
        self.logger.log("Session to ", base64urlencode(sess.peer), "failed, expecting peer to re-establish it...");
    }
    // set a timeout for the session recovery
    setTimeout(function() {
        var retry = sessRetries[endpointId];
        assert(retry);
        if (retry.cnt !== retryId) { // there was another retry on this session meanwhile
            return;
        }
        delete retry.active;
        if ((sessRetries.all > totalRetries) // there was a newer retry on another session
         || (self.state >= CallState.kTerminating)) { // call already terminating
            return; // timer is not relevant anymore
        }

        if (!self.isGroup && !Object.keys(self.sessions).length) {
            // There are no sessions currently
            // TODO: For group calls we would need to revise this
            self.logger.warn("Timed out waiting for peer to rejoin, terminating call");
            self.hangup(Term.kErrSessRetryTimeout); // not to be confused with kErrSessSetupTimeout
        }
    }, RtcModule.kSessSetupTimeout);
};
Call.prototype._fire = function(evName) {
    var self = this;
    var func = self.handler[evName];
    var logger = self.logger;
    if (logger.isEnabled()) {
        var msg = "fire event " + evName;
        if (evName === "onDestroy") {
            msg += " (" + constStateToText(Term, arguments[1]) + ')';
        }
        if (!func) {
            msg += " ...unhandled";
        }
        logger.log(msg);
    }
    if (!func) {
        return;
    }
    try {
        func.call(self.handler, arguments[1], arguments[2], arguments[3]);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
    }
};
Call.prototype._startOrJoin = function(av) {
    var self = this;
    self._callInitiateAvFlags = av;
    var pms = self._getLocalStream(av);
    pms.catch(function(err) {
        self.logger.log("Call.getLocalStream returned error:", err);
        self._destroy(Term.kErrLocalMedia, true, err);
    });
    pms.then(function() {
        if (self.isJoiner) {
            self._join();
        } else {
            self._broadcastCallReq();
        }
    });
};

Call.prototype._cmd = function(cmd, userid, clientid, data) {
    var opcode;
    if (!userid) {
        userid = '\0\0\0\0\0\0\0\0';
        clientid = '\0\0\0\0';
        opcode = Chatd.Opcode.RTMSG_BROADCAST;
    } else if (!clientid) {
        clientid = '\0\0\0\0';
        opcode = Chatd.Opcode.RTMSG_USER;
    } else {
        opcode = Chatd.Opcode.RTMSG_ENDPOINT;
    }
    var payload = this.chatid + userid + clientid;
    payload += Chatd.pack16le(data ? (1 + data.length) : 1);
    payload += String.fromCharCode(cmd);
    if (data) {
        payload += data;
    }
    return this.shard.rtcmd(opcode, payload);
};

Call.prototype._join = function(userid) {
    var self = this;
    assert(self.state === CallState.kHasLocalStream);
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8
    // if userid is not specified, join all clients in the chat, otherwise
    // join a specific user (used when a session gets broken)
    var opcode;
    if (!userid) {
        userid = "\0\0\0\0\0\0\0\0";
        opcode = Chatd.Opcode.RTMSG_BROADCAST;
    } else {
        opcode = Chatd.Opcode.RTMSG_USER;
    }
    var data = self.chatid + userid + '\0\0\0\0' + Chatd.pack16le(17) +
        String.fromCharCode(RTCMD.JOIN) + self.id + self.manager.ownAnonId;
    self._setState(CallState.kJoining);
    if (!self.shard.rtcmd(opcode, data)) {
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
    assert(self.state === CallState.kInProgress);
    // JOIN:
    // chatid.8 userid.8 clientid.4 dataLen.2 type.1 callid.8 anonId.8
    // if userid is not specified, join all clients in the chat, otherwise
    // join a specific user (used when a session gets broken)
    var data = self.chatid + userid + clientid +
        Chatd.pack16le(17) + String.fromCharCode(RTCMD.JOIN) +
        self.id + self.manager.ownAnonId;
    if (!self.shard.rtcmd(Chatd.Opcode.RTMSG_ENDPOINT, data)) {
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
        self.logger.warn("answer: Not in kRingIn state, nothing to answer");
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
        this.cmdBroadcast(RTCMD.CALL_REQ_CANCEL, this.id + String.fromCharCode(reason));
        return this._destroy(reason, false);
    case CallState.kRingIn:
        if (reason == null) {
            reason = Term.kCallRejected;
        } else {
            assert(reasonNoPeer === Term.kBusy,
                "Hangup reason can only be undefined or kBusy when hanging up call in state kRingIn");
        }
        var cinfo = this._callerInfo;
        assert(cinfo);
        assert(Object.keys(this.sessions).length === 0);
        this.cmdBroadcast(RTCMD.CALL_REQ_DECLINE, cinfo.callid + String.fromCharCode(reason));
        return this._destroy(reason, false);
    case CallState.kJoining:
    case CallState.kInProgress:
    case CallState.kWaitLocalStream:
        // TODO: For group calls, check if the sender is the call host and only then destroy the call
        if (reason == null) { // covers both 'undefined' and 'null'
            reason = Term.kUserHangup;
        } else {
            assert(reasonNoPeer === Term.kUserHangup || RtcModule.termCodeIsError(reasonNoPeer));
        }
        break;
    case CallState.kTerminating:
    case CallState.kDestroyed:
        this.logger.debug("hangup: Call already terminating/terminated");
        return Promise.resolve();
    default:
        reason = Term.kUserHangup;
        this.logger.warn("Don't know what term code to send in state", constStateToText(CallState, this.state));
        break;
    }
    // in any state, we just have to send CALL_TERMINATE and that's all
    return this._destroy(reason, true);
};

Call.prototype._onUserOffline = function(userid, clientid) {
    var self = this;
    if (self.state === CallState.kRingIn && userid === self._callerInfo.fromUser
    && clientid === self._callerInfo.fromClient) {
        self._destroy(Term.kUserHangup, false);
        return;
    }
    for (var sid in self.sessions) {
        var sess = self.sessions[sid];
        if (sess.peer === userid && sess.peerClient === clientid) {
            setTimeout(function() {
                if (!self.isGroup) {
                    self._destroy(Term.kErrUserOffline | Term.kPeer, false);
                } else {
                    sess.terminateAndDestroy(Term.kErrUserOffline | Term.kPeer);
                }
            }, 0);
            return;
        }
    }
    if (self.sessRetries[userid + clientid] && !self.isGroup) {
        self._destroy(Term.kErrUserOffline | Term.kPeer, false);
        return;
    }
};

Call.prototype._notifySessionConnected = function(sess) {
    if (this._hasConnectedSession) {
        return;
    }
    this._hasConnectedSession = true;
    this._fire('onCallStarted');
};

Call.prototype.muteUnmute = function(av) {
    var s = this.manager.gLocalStream;
    var oldAv = Av.fromStream(s);
    if (!s) {
        av = 0;
    } else {
        Av.applyToStream(s, av);
        av = Av.fromStream(s);
    }
    if (oldAv !== av) {
        for (var sid in this.sessions) {
            this.sessions[sid]._sendAv(av);
        }
    }
    this.manager.gLocalAv = av;
};
Call.prototype.localAv = function() {
    return this.manager.gLocalAv;
};

/** Protocol flow:
    C(aller): broadcast RTCMD.CALLDATA payloadLen.2 callid.8 callState.1 avflags.1
       => state: CallState.kReqSent
    A(nswerer): send RINGING
       => state: CallState.kRingIn
    C: may send RTCMD.CALL_REQ_CANCEL callid.8 reason.1 if caller aborts the call request.
       The reason is normally Term.kUserHangup or Term.kAnswerTimeout
    A: may broadcast RTCMD.CALL_REQ_DECLINE callid.8 reason.1 if answerer rejects the call.
       When other clients of the same user receive the CALL_REQ_DECLINE, they should stop ringing.
    == (from here on we can join an already ongoing group call) ==
    A: broadcast JOIN callid.8 anonId.8
        => state: CallState.kJoining
        => isJoiner = true
        Note: In case of joining an ongoing call, the callid is generated locally
          and does not match the callid if the ongoing call, as the protocol
          has no way of conveying the callid of the ongoing call. The responders
          to the JOIN will use the callid of the JOIN, and not the original callid.
          The callid is just used to match command/responses in the call setup handshake.
          Once that handshake is complete, only session ids are used for the actual 1on1 sessions.
        In case of 1on1 call other clients of user A will receive the answering client's JOIN (if call
        was answered), or TERMINATE (in case the call was rejected), and will know that the call has
        been handled by another client of that user. They will then dismiss the "incoming call"
        dialog.
          A: broadcast RTCMD.CALL_REQ_HANDLED callid.8 ans.1 to all other devices of own userid
    C: send SESSION callid.8 sid.8 anonId.8 encHashKey.32 actualCallId.8
        => call state: CallState.kInProgress
        => sess state: SessState.kWaitSdpOffer
    A: send SDP_OFFER sid.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
        => call state: CallState.kInProress
        => sess state: SessState.kWaitSdpAnswer
    C: send SDP_ANSWER sid.8 fprHash.32 av.1 sdpLen.2 sdpAnswer.sdpLen
        => state: SessState.kWaitMedia
    A and C: exchange ICE_CANDIDATE sid.8 midLen.1 mid.midLen mLineIdx.1 candLen.2 iceCand.candLen
    A or C: may send MUTE sid.8 avState.1 (if user mutes/unmutes audio/video).
        Webrtc does not have an in-band notification of stream muting
        (needed to update the GUI), so we do it out-of-band
    A or C: send SESS_TERMINATE sid.8 reason.1
        => state: SessState.kTerminating
    C or A: send SESS_TERMINATE_ACK sid.8
        => state: Sess.kDestroyed
    A or C: close webrtc connection upont receipt of terminate ack,
        or after a timeout of 1-2 seconds. The terminate ack mechanism prevents
        the peer from thinking that the webrtc connection was closed
        due to error
        => state: Sess.kDestroyed
@note avflags of caller are duplicated in RTCMD.CALLDATA and RTCMD.SDP_OFFER
The first is purely informative, to make the callee aware what type of
call the caller is requesting - audio or video.
This is not available when joining an existing call.
*/
function Session(call, packet) {
    // Packet can be RTCMD.JOIN or RTCMD.SESSION
    var self = this;
    self.call = call;
    var data = packet.data;
    self.chatd = call.manager.chatd;
    self.peer = packet.fromUser;
    self.peerClient = packet.fromClient;
    self.crypto = call.manager.crypto;
    self.ownHashKey = self.crypto.random(32);
    assert(self.ownHashKey.length === 32);
    if (packet.type === RTCMD.JOIN) { // peer will send offer
        // JOIN callid.8 anonId.8
        self.isJoiner = false;
        self.sid = self.crypto.random(8);
        self.state = SessState.kWaitSdpOffer;
        self.peerAnonId = data.substr(8, 8);
    } else {
        // SESSION callid.8 sid.8 anonId.8 encHashKey.32
        assert(packet.type === RTCMD.SESSION);
        self.isJoiner = true;
        self.sid = data.substr(8, 8);
        self.state = SessState.kWaitSdpAnswer;
        assert(data.length >= 56);
        self.peerAnonId = data.substr(16, 8);
        self.peerHashKey = self.crypto.decryptNonceFrom(this.peer, data.substr(24, 32));
    }
    self.logger = MegaLogger.getLogger("sess[" + base64urlencode(this.sid) + "]",
        call.manager._loggerOpts, call.logger);
    self.setupTimer = setTimeout(function() {
        if (self.state < SessState.kInProgress) {
            self.terminateAndDestroy(Term.kErrSessSetupTimeout);
        }
    }, RtcModule.kSessSetupTimeout);
}

Session.prototype._sendCmdSession = function(joinPacket) {
    // SESSION callid.8 sid.8 anonId.8 encHashKey.32
    this.call.manager.cmdEndpoint(RTCMD.SESSION, joinPacket,
        joinPacket.callid +
        this.sid +
        this.call.manager.ownAnonId +
        this.crypto.encryptNonceTo(this.peer, this.ownHashKey) +
        this.call.id
    );
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

Session.prototype.pcConstraints = function() {
    return this.call.manager.pcConstraints;
};

Session.prototype.handleMsg = function(packet) {
    switch (packet.type) {
        case RTCMD.SDP_OFFER:
            this.msgSdpOfferSendAnswer(packet);
            return;
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
    var iceServers = RTC.fixupIceServers(self.call.manager.iceServers);
    this.logger.log("Using ICE servers:", JSON.stringify(iceServers[0].urls));
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
        self.remoteStream = event.stream;
        self._remoteStream = self.remoteStream;
        self._fire("onRemoteStreamAdded", self.remoteStream);
        // FIXME: We never had audio work from the GUI player if video is disabled,
        // and the audio was coming from this 'internal' player. We need to fix that ASAP
        var player = self.mediaWaitPlayer = document.createElement('video');
        RTC.attachMediaStream(player, self.remoteStream);
    };
    conn.onremovestream = function(event) {
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
        if (self.state >= SessState.kTerminating) { // use double equals because state might be some internal enum that
            return;                                 // converts to string?
        }
        if (state === 'disconnected') { // double equal is on purpose, state may not be exactly a string
            self.terminateAndDestroy(Term.kErrIceDisconn);
        } else if (state === 'failed') {
            self.terminateAndDestroy(Term.kErrIceFail);
        } else if (state === 'connected') {
            self._setState(SessState.kInProgress);
            self._tsIceConn = Date.now();
            self.call._notifySessionConnected(self);
            /* DEBUG: Enable this to simulate session ICE disconnect
            if (self.isJoiner)
            {
                setTimeout(() => {
                    if (self.state < SessState.kTerminating) {
                        self.terminateAndDestroy(Term.kErrIceDisconn);
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
    if (RTC.Stats) {
        self.statRecorder = new RTC.Stats.Recorder(conn, 1, 5, self);
        self.statRecorder.start();
    }
};

// stats interface
Session.prototype.onCommonInfo = function(info) {
}
Session.prototype.onSample = function(sample) {
}
//====
Session.prototype._sendAv = function(av) {
    this.cmd(RTCMD.MUTE, String.fromCharCode(av));
};
/*
Session.prototype.waitForRemoteMedia = function() {
    if (this.state !== SessState.kInProgress) {
        return;
    }
    var self = this;
    // Under Firefox < 4x, currentTime seems to stay at 0 forever,
    // despite that there is playback
    if ((self.mediaWaitPlayer.currentTime > 0) || (RTC.browser === "firefox")) {
//      self.mediaWaitPlayer = undefined;
        self.logger.log('Actual media received');
        // Use this to debug remote media players:
        if (false) {
            $('.messages.content-area:visible').append(self.mediaWaitPlayer);
        }
        self.mediaWaitPlayer.play();
    } else {
        setTimeout(function () { self.waitForRemoteMedia(); }, 200);
    }
};
*/
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

Session.prototype.msgSdpOfferSendAnswer = function(packet) {
    // SDP_OFFER sid.8 anonId.8 encHashKey.32 fprHash.32 av.1 sdpLen.2 sdpOffer.sdpLen
    var self = this;
    if (self.state !== SessState.kWaitSdpOffer) {
        self.logger.warn("Ingoring unexpected SDP offer");
        return;
    }
    assert(!self.isJoiner);
    // The peer is likely to send ICE candidates immediately after the offer,
    // but we can't process them until setRemoteDescription is ready, so
    // we have to store them in a queue
    self._setState(SessState.kWaitLocalSdpAnswer);
    var data = packet.data;
    self.peerAnonId = data.substr(8, 8);
    self.peerHashKey = self.crypto.decryptNonceFrom(self.peer, data.substr(16, 32));
    self.peerAv = data.charCodeAt(80);
    var sdpLen = Chatd.unpack16le(data.substr(81, 2));
    assert(data.length >= 83 + sdpLen);
    self.peerSdpOffer = data.substr(83, sdpLen);
    if (!self.verifySdpFingerprints(self.peerSdpOffer, data.substr(48, 32))) {
        self.logger.warn("Fingerprint verification error, immediately terminating session");
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forge attempt");
        return;
    }
    var sdp = new RTCSessionDescription({type: 'offer', sdp: self.peerSdpOffer});
    self._mungeSdp(sdp);
    self.rtcConn.setRemoteDescription(sdp)
    .catch(function(err) {
        return Promise.reject({err: err, remote: true});
    })
    .then(function() {
        if (self.state > SessState.kInProgress) {
            return Promise.reject({err: "Session killed"});
        }
        return self.rtcConn.createAnswer(self.pcConstraints());
    })
    .then(function(sdp) {
        if (self.state > SessState.kInProgress) {
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

    if (!self.verifySdpFingerprints(self.peerSdpAnswer, data.substr(8, 32))) {
        self.terminateAndDestroy(Term.kErrFprVerifFailed, "Fingerprint verification failed, possible forgery");
        return;
    }

    var sdp = new RTCSessionDescription({type: 'answer', sdp: self.peerSdpAnswer});
    self._mungeSdp(sdp);
    self.rtcConn.setRemoteDescription(sdp)
    .then(function() {
        if (self.state > SessState.kInProgress) {
            return Promise.reject("Session killed");
        }
        self._setState(SessState.kInProgress);
    })
    .catch(function(err) {
        var msg = "Error setting SDP answer: " + err;
        self.terminateAndDestroy(Term.kErrSdp, msg);
    });
};

Session.prototype.cmd = function(op, data) {
    var self = this;
    var payload = String.fromCharCode(op) + self.sid;
    if (data) {
        payload += data;
    }
    if (!self.call.shard.rtcmd(Chatd.Opcode.RTMSG_ENDPOINT,
        self.call.chatid + self.peer + self.peerClient +
        Chatd.pack16le(payload.length) + payload)) {
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
            return new Promise(function(){}); //this promise never resolves, the actual termination is done by waitAllSessionsTerminated
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
        setTimeout(function() { //execute function async so that we have the promise object before that
            // destroy() sets state to kDestroyed
            if (!self.cmd(RTCMD.SESS_TERMINATE, String.fromCharCode(code))) {
                self._destroy(code, msg);
                resolve(null);
            } else {
                var done = function(packet) {
                    if (self.state !== SessState.kTerminating) {
                        return;
                    }
                    self._destroy(code, msg);
                    resolve(packet);
                };
                self.terminateAckCallback = done;
                setTimeout(function() {
                    done(null);
                }, 1000);
            }
        }, 0);
    }, 0);
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
    var self = this;
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
    self._destroy(packet.data.charCodeAt(8) | Term.kPeer);
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
    this._fire("onDestroy", code & 0x7f, !!(code & 0x80), msg);// jscs:ignore disallowImplicitTypeConversion
    this.call._removeSession(this, code);
};
Session.prototype.submitStats = function(termCode, errInfo) {
    var stats;
    if (this.statRecorder) {
        stats = this.statRecorder.getStats(base64urlencode(this.sid));
        delete this.statRecorder;
    } else { //no stats, but will still provide callId and duration
        stats = {
            cid: base64urlencode(this.sid),
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
        stats.isCaller = 0;
        stats.caid = base64urlencode(this.peerAnonId);
        stats.aaid = base64urlencode(this.call.manager.ownAnonId);
    } else {
        stats.isCaller = 1;
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
        M.xhr(url, JSON.stringify(stats));
    }
};

// we actually verify the whole SDP, not just the fingerprints
Session.prototype.verifySdpFingerprints = function(sdp, peerHash) {
    var hash = this.crypto.mac(sdp, this.ownHashKey);
    var len = hash.length;
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
};

Session.prototype._fire = function(evName) {
    var func = this.handler[evName];
    var logger = this.logger;
    if (logger.isEnabled()) {
        var msg = "fire sess event " + evName;
        if (evName === 'onDestroy') {
            msg += '(' + constStateToText(Term, arguments[1]) + ')';
        }
        if (!func) {
            msg += " ...unhandled";
        }
        logger.log(msg);
    }
    if (!func) {
        return;
    }
    try {
        // Don't mess with slicing the arguments array - this will be slower than
        // manually indexing arguments 1, 2 and 3. Currently we don't have an event with
        // more than 3 arguments. If such appears, we need to update this method
        func.call(this.handler, arguments[1], arguments[2], arguments[3]);
    } catch (e) {
        logger.error("Event handler '" + evName + "' threw exception:\n" + e, "\n", e.stack);
    }
};
Session.prototype._mungeSdp = function(sdp) {
    try {
        var maxbr = localStorage.webrtcMaxBr;
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

var Av = { Audio: 1, Video: 2 };
Av.fromStream = function(stream) {
    if (!stream) {
        return 0;
    }
    var av = 0;
    var at = stream.getAudioTracks();
    var i;
    for (i = 0; i < at.length; i++) {
        if (at[i].enabled) {
            av |= Av.Audio;
        }
    }
    var vt = stream.getVideoTracks();
    for (i = 0; i < vt.length; i++) {
        if (vt[i].enabled) {
            av |= Av.Video;
        }
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
    MUTE: 12
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
    kErrUserOffline: 33,    // < we received a notification that that user went offline
    kErrSessSetupTimeout: 34, // < timed out waiting for session
    kErrSessRetryTimeout: 35, // < timed out waiting for peer to retry a failed session
    kErrorLast: 35,         // < Last enum indicating call termination due to error
    kLast: 35,              // < Last call terminate enum value
    kPeer: 128              // < If this flag is set, the condition specified by the code happened at the peer,
    // < not at our side
});

function isTermError(code) {
    return (code & 0x7f) >= Term.kErrorFirst;
}

var CallState = Object.freeze({
    kInitial: 0, // < Call object was initialised
    kWaitLocalStream: 1,
    kHasLocalStream: 2,
    kReqSent: 3, // < Call request sent
    kRingIn: 4, // < Call request received, ringing
    kJoining: 5, // < Joining a call
    kInProgress: 6,
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
    CallState.kInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kRingIn] = [
    CallState.kWaitLocalStream,
    CallState.kInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kJoining] = [
    CallState.kInProgress,
    CallState.kTerminating
];

CallStateAllowedStateTransitions[CallState.kInProgress] = [
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
    //    kWaitRemoteMedia: 4, // < We have completed the SDP handshake and waiting for actual media frames from the
    // remote
    kInProgress: 5,
    kTerminating: 6, // < Session is in terminate handshake
    kDestroyed: 7 // < Session object is not valid anymore
});


var SessStateAllowedStateTransitions = {};
SessStateAllowedStateTransitions[SessState.kWaitSdpOffer] = [
    SessState.kWaitLocalSdpAnswer,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kWaitLocalSdpAnswer] = [
    SessState.kInProgress,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kWaitSdpAnswer] = [
    SessState.kInProgress,
    SessState.kTerminating
];
SessStateAllowedStateTransitions[SessState.kInProgress] = [
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
                case CallState.kInProgress:
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
        case Term.kAppTerminating:
            return (self.predestroyState === CallState.kInProgress && self._hasConnectedSession)
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

/*
CallManager.CALL_END_REMOTE_REASON = {
    "CALL_ENDED": 0x01,
    "REJECTED": 0x02,
    "NO_ANSWER": 0x03,
    "FAILED": 0x04
};
 */
Call.prototype.termCodeToHistCallEndedCode = function(terminationCode) {
    var self = this;
    var isIncoming = self.isJoiner;
    switch (terminationCode & 0x7f) {
        case Term.kUserHangup:
            switch (self.predestroyState) {
                case CallState.kReqSent:
                    return CallManager.CALL_END_REMOTE_REASON.CANCELED;
                case CallState.kRingIn:
                    return (terminationCode & 0x80)
                    ? CallManager.CALL_END_REMOTE_REASON.CANCELED // if peer hung up, it's canceled
                    : CallManager.CALL_END_REMOTE_REASON.REJECTED; // if we hung up, it's rejected
                case CallState.kInProgress:
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
        case Term.kAppTerminating:
            return (self.predestroyState === CallState.kInProgress && self._hasConnectedSession)
                ? CallManager.CALL_END_REMOTE_REASON.CALL_ENDED
                : CallManager.CALL_END_REMOTE_REASON.FAILED;
        default:
            var name = constStateToText(Term, terminationCode);
            if (RtcModule.termCodeIsError(terminationCode)) {
                return CallManager.CALL_END_REMOTE_REASON.FAILED;
            } else if (RtcModule.termCodeIsTimeout(terminationCode, name)) {
                return (self.predestroyState < CallState.kInProgress)
                    ? CallManager.CALL_END_REMOTE_REASON.NO_ANSWER
                    : CallManager.CALL_END_REMOTE_REASON.FAILED;
            } else {
                self.logger.warn("termCodeToHistCallEndedCode: Don't know how to translate term code " +
                    name + ", returning FAILED");
                return CallManager.CALL_END_REMOTE_REASON.FAILED;
            }
    }
};

RtcModule.rtcmdToString = function(cmd, tx) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (type.1 data.(len-1))
    if (cmd.length < 24) {
        assert(false, "rtcmdToString: Command buffer length (" +
            cmd.length + ") is less than 24 bytes. Data:\n" + Chatd.dumpToHex(cmd));
    }
    var opCode = cmd.charCodeAt(23);
    var result = constStateToText(RTCMD, opCode);
    result += ' chatId: ' + base64urlencode(cmd.substr(1, 8));
    result += (tx ? ' to:' : ' from:') + base64urlencode(cmd.substr(9, 8));
    result += ' clientId: 0x' + Chatd.dumpToHex(cmd, 17, 4, true);

    var dataLen = Chatd.unpack16le(cmd.substr(21, 2)) - 1; // first data byte is the RTCMD opcode
    if (dataLen > 0) {
        assert(dataLen <= cmd.length - 24);
        if (opCode === RTCMD.ICE_CANDIDATE) {
            // FIXME: there is binary data before the candidate text, but it's variable length,
            // so more complex parsing is required.
            result += '\n' + cmd.substr(25, dataLen);
        } else {
            result += ' data(' + (Chatd.unpack16le(cmd.substr(21, 2)) - 1) + '): ';
            if (dataLen > 64) {
                result += Chatd.dumpToHex(cmd, 24, 64) + '...';
            } else {
                result += Chatd.dumpToHex(cmd, 24);
            }
        }
    } else {
        assert(dataLen === 0);
    }

    return [result, 24 + dataLen];
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

scope.RtcModule = RtcModule;
scope.Call = Call;
scope.Session = Session;
scope.Av = Av;
scope.Term = Term;
scope.RTCMD = RTCMD;
scope.SessState = SessState;
scope.CallState = CallState;
}(window));
