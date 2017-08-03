(function(scope) {
"use strict";

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
RtcModule.kRingOutTimeout = 6000;
RtcModule.kIncallPingInterval = 4000;
RtcModule.kMediaGetTimeout = 20000;
RtcModule.kSessSetupTimeout = 20000;

RtcModule.prototype.logToServer = function(type, data) {
    if (typeof data !== 'object') {
        data = { data: data };
    }
    data.client = RTC.browser;
    var wait = 500;
    var retryNo = 0;
    var self = this;
    function req() {
        jQuery.ajax("https://stats.karere.mega.nz/msglog?aid=" + base64urlencode(self.ownAnonId) + "&t=" + type, {
            type: 'POST',
            data: JSON.stringify(data),
            error: function(jqXHR, textStatus, errorThrown) {
                retryNo++;
                if (retryNo < 20) {
                    wait *= 2;
                    setTimeout(function() {
                        req();
                    }, wait);
                }
            },
            dataType: 'json'
        });
    }
    req();
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
                console.error.call(console, args);
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


        // this is the only command that is not handled by an existing call
        if (type === RTCMD.CALL_REQUEST) {
            assert(op === Chatd.Opcode.RTMSG_BROADCAST);
            this.msgCallRequest(packet);
            return;
        }
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

RtcModule.prototype.onUserJoinLeave = function(chatid, userid, priv) {
};

RtcModule.prototype.msgCallRequest = function(packet) {
    var self = this;
    if (packet.fromUser === self.chatd.userId) {
        self.logger.log("Ignoring call request from another client of our user");
        return;
    }
    packet.callid = packet.data;
    assert(packet.callid);
    var chatid = packet.chatid;
    var keys = Object.keys(self.calls);
    if (keys.length) {
        assert(keys.length === 1);
        var existingChatid = keys[0];
        var existingCall = self.calls[existingChatid];
        if (existingChatid === chatid && existingCall.state < CallState.kTerminating) {
            assert(self.handler.onAnotherCall);
            var answer = self.handler.onAnotherCall(existingCall, packet);
            if (answer) {
                existingCall.hangup();
                delete self.calls[existingCall.chatid];
            }  else {
                self.cmdEndpoint(RTCMD.CALL_REQ_DECLINE, packet, packet.callid + String.fromCharCode(Term.kBusy));
                return;
            }
        }
    }
    var call = new Call(self, packet, self.handler.isGroupChat(chatid), true);
    self.calls[chatid] = call;
    call.handler = self.handler.onCallIncoming(call);
    assert(call.handler);
    assert(call.state === CallState.kRingIn);
    self.cmdEndpoint(RTCMD.CALL_RINGING, packet, packet.callid);
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
    if (!info.shard.cmd(Chatd.Opcode.RTMSG_ENDPOINT, data)) {
        throw new Error("cmdEndpoint: Send error trying to send command " + constStateToText(RTCMD, type));
    }
};

RtcModule.prototype._removeCall = function(call) {
    var chatid = call.chatid;
    var existing = this.calls[chatid];
    assert(existing);
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
        return self.localMediaPromise
            .then(function(stream) {
                if (Object.keys(self.calls).length === 0) {
                    return Promise.reject(null);
                } else {
                    return Promise.resolve(self.gLocalStream);
                }
            });
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

    var pms = MegaPromise.asMegaPromiseProxy(
        RTC.getUserMedia({audio: true, video: true})
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
        }));
    assert(self.localMediaPromise, "getUserMedia executed synchronously");
    self.localMediaPromise = MegaPromise.asMegaPromiseProxy(pms
        .then(function(stream) {
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
            resolved = true;
            if (Object.keys(self.calls).length !== 0) {// all calls were destroyed meanwhile
                return Promise.resolve(stream);
            }
        }));
    setTimeout(function() {
        if (pms.state() === 'pending') {
            pms.resolve("timeout");
        }
    }, RtcModule.kMediaGetTimeout);

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
    if (existing) {
        self.logger.warn("There is already a call in this chatroom, destroying it");
        existing.hangup();
        delete self.calls[chatid];
    }
    var call = new Call(
        this, {
            chatid: chatid,
            callid: this.crypto.random(8),
            shard: shard
        }, isGroup, isJoin, handler);

    self.calls[chatid] = call;
    call._startOrJoin(av, isJoin);
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
    this.sessRetries = {};
    this.state = isJoiner ? CallState.kRingIn : CallState.kInitial;
    //  var level = this.manager.logger.options.minLogLevel();
    this.logger = MegaLogger.getLogger("call[" + base64urlencode(this.id) + "]",
            rtcModule._loggerOpts, rtcModule.logger);
    if (isJoiner) {
        this._callerInfo = info; // needed for answering
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
            assert(false, "RtcModule._getLocalStream promise failed, and it should not. Error:"+err);
            return err;
        })
        .then(function(stream) {
            if (self.state > CallState.kInProgress) {
                return Promise.reject("Call killed");
            }
            self._setState(CallState.kHasLocalStream);
        });
};

Call.prototype.msgCallTerminate = function(packet) {
    if (packet.data.length < 1) {
        this.logger.error("Ignoring CALL_TERMINATE without reason code");
        return;
    }
    var code = packet.data.charCodeAt(0);
    var sessions = this.sessions;
    var isCallParticipant = false;
    for (var sid in sessions) {
        var sess = sessions[sid];
        if (sess.peer === packet.fromUser && sess.peerClient === packet.fromClient) {
            isCallParticipant = true;
            break;
        }
    }
    if (!isCallParticipant) {
        this.logger.warn("Received CALL_TERMINATE from a client that is not in the call, ignoring");
        return;
    }
    this._destroy(code | Term.kPeer, false);
};
Call.prototype.msgCallReqDecline = function(packet) {
    // callid.8 termcode.1
    assert(packet.data.length >= 9);
    var code = packet.data.charCodeAt(8);
    if (code === Term.kCallRejected) {
        this._handleReject(packet);
    } else if (code === Term.kBusy) {
        this._handleBusy(packet);
    } else {
        this.logger.warn("Ingoring CALL_REQ_DECLINE with unexpected termnation code", constStateToText(code));
    }
};
Call.prototype.msgCallReqCancel = function(packet) {
    if (this.state >= CallState.kInProgress) {
        this.logger.warn("Ignoring unexpected CALL_REQ_CANCEL while in state", constStateToText(this.state));
        return;
    }
    // CALL_REQ_CANCEL callid.8 reason.1
    var cinfo = this._callerInfo;
    assert(cinfo);
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

Call.prototype._handleReject = function(packet) {
    if (this.state !== CallState.kReqSent && this.state !== CallState.kInProgress) {
        this.log.warn("ingoring unexpected CALL_REJECT while in state", constStateToText(this.state));
        return;
    }
    if (this.isGroup || Object.keys(this.sessions).length > 0) {
        return;
    }
    this._destroy(Term.kCallRejected | Term.kPeer, false);
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
        self._clearCallOutTimer();
        self._callOutTimer = setTimeout(function() {
            if (self.state !== CallState.kReqSent) {
                return;
            }
            self.hangup(Term.kAnswerTimeout); // TODO: differentiate whether peer has sent us RINGING or not
        }, RtcModule.kCallAnswerTimeout);
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
Call.prototype._handleBusy = function(packet) {
    if (this.state !== CallState.kReqSent && this.state !== CallState.kInProgress) {
        this.log.warn("Ignoring unexpected BUSY when in state", constStateToText(this.state));
        return;
    }
    if (!this.isGroup && Object.keys(this.sessions).length < 1) {
        this._destroy(Term.kBusy | Term.kPeer, false);
    } else {
        this.logger.warn("Ignoring incoming BUSY for a group call or one with already existing session(s)");
    }
};

Call.prototype.msgSession = function(packet) {
    var self = this;
    if (self.state !== CallState.kJoining && self.state !== CallState.kInProgress) {
        this.logger.warn("Ignoring unexpected SESSION");
        return;
    }
    self._setState(CallState.kInProgress);
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
    if (this.state === CallState.kRingIn && packet.fromUser === this.manager.chatd.userId) {
        this._destroy(Term.kAnsElsewhere, false);
    } else if (this.state === CallState.kInProgress || this.state === CallState.kReqSent) {
        packet.callid = packet.data.substr(0, 8);
        assert(packet.callid);
        if (this.state === CallState.kReqSent) {
            this._setState(CallState.kInProgress);
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
            self.logger.error("Timed out waiting for all sessions to terminate, force closing them");
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
    } else if (self.state === CallState.Terminating) {
        assert(self._destroyPromise);
        return self._destroyPromise;
    }
    if (msg) {
        self.logger.log("Destroying call due to:", msg);
    }

    self._setState(CallState.kTerminating);
    self._clearCallOutTimer();

    var pms = new Promise(function(resolve, reject) {
        if (weTerminate) {
            if (!self.isGroup) {
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
        assert(Object.keys(self.sessions).length === 0);
        self._stopIncallPingTimer();
        self._setState(CallState.kDestroyed);
        self._fire('onDestroy', code & 0x7f, !!(code & 0x80), msg);// jscs:ignore disallowImplicitTypeConversion
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
    if (!self.shard.cmd(Chatd.Opcode.RTMSG_BROADCAST, data)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
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
    if (!self.cmdBroadcast(RTCMD.CALL_REQUEST, self.id)) {
        return false;
    }

    self._setState(CallState.kReqSent);
    self._startIncallPingTimer();
    self._callOutTimer = setTimeout(function() {
        if (self.state !== CallState.kReqSent) {
            return;
        }
        self._destroy(Term.kRingOutTimeout, true);
    }, RtcModule.kRingOutTimeout);
    return true;
};
Call.prototype._startIncallPingTimer = function() {
    var self = this;
    self._inCallPingTimer = setInterval(function() {
        if (!self.shard.cmd(Chatd.Opcode.INCALL, self.chatid + self.manager.chatd.userId + self.shard.clientId)) {
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
    self.shard.cmd(Chatd.Opcode.ENDCALL, self.chatid + self.manager.chatd.userId + self.shard.clientId);
};

Call.prototype._removeSession = function(sess, reason) {
    var self = this;
    delete self.sessions[sess.sid];
    if (self.state === CallState.kTerminating) {
        return;
    }
    // if no more sessions left, destroy call even if group
    if (Object.keys(self.sessions).length === 0) {
        self._destroy(reason, false);
        return;
    }
    // upon session failure, we swap the offerer and answerer and retry
    if (self.isGroup && isTermError(reason) && !sess.isJoiner) {
        var endpointId = sess.peer + sess.peerClient;
        if (!self.sessRetries[endpointId]) {
            self.sessRetries[endpointId]++;
            setTimeout(function() {
                self._join(sess.peer);
            }, 500);
        }
    }
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
Call.prototype._startOrJoin = function(av, isJoin) {
    var self = this;
    self._getLocalStream(av)
    .catch(function(err) {
        self._destroy(Term.kErrLocalMedia, true, err);
        return err;
    })
    .then(function() {
        if (isJoin) {
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
    return this.shard.cmd(opcode, payload);
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
    if (!self.shard.cmd(opcode, data)) {
        setTimeout(function() { self._destroy(Term.kErrNetSignalling, true); }, 0);
        return false;
    }
    self._startIncallPingTimer();
    // we have session setup timeout timer, but in case we don't even reach a session creation,
    // we need another timer as well
    setTimeout(function() {
        if (self.state <= CallState.kJoining) {
            self._destroy(Term.kErrProtoTimeout, true);
        }
    }, RtcModule.kSessSetupTimeout);
    return true;
};

Call.prototype.answer = function(av) {
    var self = this;
    if (self.state !== CallState.kRingIn) {
        self.logger.warn("answer: Not in kRingIn state, nothing to answer");
        return false;
    }
    return self._startOrJoin(av, true);
};

Call.prototype.hangup = function(reason) {
    var term;
    switch (this.state)
    {
    case CallState.kReqSent:
        if (typeof reason === 'undefined') {
            reason = Term.kCallReqCancel;
        } else {
            assert(reason === Term.kCallReqCancel || reason === Term.kAnswerTimeout,
                   "Invalid reason for hangup of outgoing call request");
        }
        this._cmd(RTCMD.CALL_REQ_CANCEL, 0, 0, this.id+String.fromCharCode(reason));
        this._destroy(reason, false);
        return;
    case CallState.kRingIn:
        if (typeof reason === 'undefined') {
            term = Term.kCallRejected;
        } else if (reason === Term.kBusy) {
            term = Term.kBusy;
        } else {
            assert(false, "Hangup reason can only be undefined or kBusy when hanging up call in state kRingIn");
        }
        var cinfo = this._callerInfo;
        assert(cinfo);
        assert(Object.keys(this.sessions).length === 0);
        this._cmd(RTCMD.CALL_REQ_DECLINE, cinfo.fromUser, cinfo.fromClient, cinfo.callid + String.fromCharCode(term));
        this._destroy(term, false);
        return;
    case CallState.kJoining:
    case CallState.kInProgress:
    case CallState.kWaitLocalStream:
        // TODO: Check if the sender is the call host and only then destroy the call
        term = Term.kUserHangup;
        break;
    case CallState.kTerminating:
    case CallState.kDestroyed:
        this.logger.debug("hangup: Call already terminating/terminated");
        return;
    default:
        term = Term.kUserHangup;
        this.logger.warn("Don't know what term code to send in state", constStateToText(Term, this.state));
        break;
    }
    // in any state, we just have to send CALL_TERMINATE and that's all
    this._destroy(term, true);
};

Call.prototype.hangupAllCalls = function() {
    var calls = this.calls;
    for (var id in calls) {
        calls[id].hangup();
    }
};

Call.prototype._onUserOffline = function(userid, clientid) {
    if (this.state === CallState.kRingIn) {
        this._destroy(Term.kCallReqCancel, false);
        return;
    }
    for (var sid in this.sessions) {
        var sess = this.sessions[sid];
        if (sess.peer === userid && sess.peerClient === clientid) {
            setTimeout(function() {
                sess.terminateAndDestroy(Term.kErrUserOffline | Term.kPeer);
            }, 0);
            return true;
        }
    }
    return false;
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
    C(aller): broadcast RTCMD.CALL_REQUEST callid.8 avflags.1
       => state: CallState.kReqSent
    A(nswerer): send RINGING
       => state: CallState.kRingIn
    C: may send RTCMD.CALL_REQ_CANCEL callid.8 reason.1 if caller aborts the call request.
       The reason is normally Term.kCallReqCancel or Term.kAnswerTimeout
    A: may send RTCMD.CALL_REQ_DECLINE callid.8 reason.1 if answerer rejects the call
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
@note avflags of caller are duplicated in RTCMD.CALL_REQUEST and RTCMD.SDP_OFFER
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
        if (self._state < SessState.kInProgress) {
            self.terminateAndDestroy(Term.kErrProtoTimeout);
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
    var conn = self.rtcConn = new RTCPeerConnection({
        iceServers: RTC.fixupIceServers(self.call.manager.iceServers)
    });
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
        self._setState(SessState.kInProgress);
        self._remoteStream = self.remoteStream;
        self._fire("onRemoteStreamAdded", self.remoteStream);
        var player = self.mediaWaitPlayer = document.createElement('video');
        RTC.attachMediaStream(player, self.remoteStream);
        // self.waitForRemoteMedia();
    };
    conn.onremovestream = function(event) {
        self.self.remoteStream = null;
        // TODO: Do we need to generate event from this?
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
            self._tsIceConn = Date.now();
            self.call._notifySessionConnected(self);
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
        self.logger.warn("Ingoring unexpected SDP_ANSWER");
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
    if (!self.call.shard.cmd(Chatd.Opcode.RTMSG_ENDPOINT,
        self.call.chatid + self.peer + self.peerClient +
        Chatd.pack16le(payload.length) + payload)) {
        if (self.state < SessState.kTerminating) {
            this._destroy(Term.kErrNetSignalling);
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
        self.logger.warn("Terminating due to:", msg);
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
        });
    }, 0);
    return self.terminatePromise;
};

Session.prototype.msgSessTerminateAck = function(packet) {
    if (this.state !== SessState.kTerminating) {
        this.logger.warn("Ignoring unexpected TERMINATE_ACK");
    }
    assert(this.terminateAckCallback);
    var cb = this.terminateAckCallback;
    delete this.terminateAckCallback;
    cb(packet);
};

Session.prototype.msgSessTerminate = function(packet) {
    // sid.8 termcode.1
    var self = this;
    assert(packet.data.length >= 1);
    self.cmd(RTCMD.SESS_TERMINATE_ACK);

    if (self.state === SessState.kTerminating && this.terminateAckCallback) {
        // handle terminate as if it were an ack - in both cases the peer is terminating
        self.msgSessTerminateAck(packet);
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
        jQuery.ajax(url, {
                        type: 'POST',
                        data: JSON.stringify(stats)
                    });
    }
}

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
            return err;
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
var RTCMD = Object.freeze({
    CALL_REQUEST: 0, // initiate new call, receivers start ringing
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
    kCallReqCancel: 1,      // < Call request was canceled before call was answered
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
    kErrIceFail: 31,        // <ice-fail condition on webrtc connection
    kErrSdp: 32,            // < error generating or setting SDP description
    kErrUserOffline: 33,    // < we received a notification that that user went offline
    kErrorLast: 33,         // < Last enum indicating call termination due to error
    kLast: 33,              // < Last call terminate enum value
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

scope.RtcModule = RtcModule;
scope.Call = Call;
scope.Session = Session;
scope.Av = Av;
scope.Term = Term;
scope.RTCMD = RTCMD;
scope.SessState = SessState;
scope.CallState = CallState;
}(window));
