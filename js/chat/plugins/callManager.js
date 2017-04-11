/**
 * CallSession Manager
 *
 * @param chatRoom
 * @param sid
 * @constructor
 */
var CallSession = function(chatRoom, sid) {
    CallManager.assert(chatRoom, 'missing chatRoom for CallSession');
    CallManager.assert(sid, 'missing sid for CallSession');

    this.sid = sid;
    this.room = chatRoom;
    this.logger = MegaLogger.getLogger("callSession[" + sid + "]", {}, chatRoom.logger);
    this.state = CallSession.STATE.INITIALISED;

    this.localPlayer = null;
    this.remotePlayer = null;

    this.answer = null;
    this.cancel = null;

    this.callStats = [];
    this.liveCallStats = {};

    if (this.room.callSession) {
        if (this.room.callSession.isStarting() === true) {
            this.logger.debug("Room have a starting session, will terminate and replace with the the newly created session.");
            this.room.callSession.endCall();
        } else if (this.room.callSession.isNotStarted() === true) {
            this.logger.debug("Room have a not started session, will terminate and replace with the the newly created session.");
            this.room.callSession.endCall();
        } else if (this.room.callSession.isStarted() === true) {
            this.logger.debug("Room have a started session, will terminate and replace with the the newly created session.");
            this.room.callSession.endCall();
        } else if (this.room.callSession.isTerminated() === false) {
            this.logger.error("Room already have an attached started/in progress/waiting session.");
            return;
        }
    }
    this.room.callSession = this;
};

makeObservable(CallSession);


CallSession.STATE = {
    'INITIALISED': 0,
    'WAITING_RESPONSE_OUTGOING': 10,
    'WAITING_RESPONSE_INCOMING': 20,
    'STARTING': 25,
    'STARTED': 30,
    'ENDED': 40,
    'HANDLED_ELSEWHERE': 45,
    'REJECTED': 50,
    'FAILED': 60,
    'MISSED': 70,
    'TIMEOUT': 80
};

// ES5's ugly syntax...in the future we can use ES6 to properly format this code
CallSession.ALLOWED_STATE_TRANSITIONS = {};

CallSession.ALLOWED_STATE_TRANSITIONS[CallSession.STATE.INITIALISED] =  // ->
    [
        CallSession.STATE.WAITING_RESPONSE_INCOMING,
        CallSession.STATE.WAITING_RESPONSE_OUTGOING
    ];

CallSession.ALLOWED_STATE_TRANSITIONS[CallSession.STATE.WAITING_RESPONSE_OUTGOING] =  // ->
        [
            CallSession.STATE.STARTING,
            CallSession.STATE.REJECTED,
            CallSession.STATE.FAILED,
            CallSession.STATE.TIMEOUT
        ];

CallSession.ALLOWED_STATE_TRANSITIONS[CallSession.STATE.WAITING_RESPONSE_INCOMING] = // ->
        [
            CallSession.STATE.STARTING,
            CallSession.STATE.FAILED,
            CallSession.STATE.MISSED,
            CallSession.STATE.HANDLED_ELSEWHERE,
            CallSession.STATE.REJECTED
        ];

CallSession.ALLOWED_STATE_TRANSITIONS[CallSession.STATE.STARTING] = // ->
        [
            CallSession.STATE.STARTED,
            CallSession.STATE.FAILED,
            CallSession.STATE.REJECTED
        ];

CallSession.ALLOWED_STATE_TRANSITIONS[CallSession.STATE.STARTED] = // ->
        [
            CallSession.STATE.FAILED,
            CallSession.STATE.ENDED
        ];


CallSession.prototype.isActive = function() {
    return (
        this.state === CallSession.STATE.STARTED ||
        this.state === CallSession.STATE.STARTING
    );
};

/**
 * UI -> event mapping stuff
 */

CallSession.prototype.onLocalStreamReceived = function(e, eventData) {
    var self = this;
    self.localPlayer = eventData.player;
    self.localPlayer.play();
};

CallSession.prototype.onRemoteStreamReceived = function(e, eventData) {
    var self = this;

    if (!$.isArray(eventData.player)) {
        self.remotePlayer = eventData.player;
    } else if (eventData.player) {
        self.remotePlayer = eventData.player[0];
    }

    self._renderInCallUI();
};

CallSession.prototype.onLocalStreamRemoved = function(e, eventData) {
    var self = this;
    self.localPlayer.pause();
    $(self.localPlayer).remove();
};

CallSession.prototype.onRemoteStreamRemoved = function(e, eventData) {
    var self = this;

    if (self.remotePlayer && self.remotePlayer.length > 0) {
        self.remotePlayer[0].pause();
    }
    else if (self.remotePlayer && self.remotePlayer.pause) {
        self.remotePlayer.pause();
    }
    $(self.remotePlayer).remove();
};

CallSession._extractMediaOptionsFromEventData = function(eventData) {
    var opts = eventData.peerMedia;
    if (!opts) {
        opts = eventData.callOptions;
    }
    return opts;
};

CallSession.prototype.onWaitingResponseOutgoing = function(e, eventData) {
    var self = this;
    var callOptions = CallSession._extractMediaOptionsFromEventData(eventData);

    if (eventData) {
        if (eventData.cancel) {
            self.cancel = eventData.cancel;
        }

        self.getCallManager().outgoingRequestJingleSessions[self.sid] =  {
            cancel: eventData.cancel,
            sid: eventData.sid,
            sentMediaTypes: function() {
                return {
                    'audio': callOptions.audio,
                    'video': callOptions.video
                };
            },
            receivedMediaTypes: function() {
                return {
                    'audio': callOptions.audio,
                    'video': callOptions.video
                };
            }
        };
    }
};

CallSession.prototype.onWaitingResponseIncoming = function(e, eventData) {
    var self = this;

    var callOptions = CallSession._extractMediaOptionsFromEventData(eventData);

    // since the session is not YET created in jingle, i will need to find a way to fake it
    self.answer = eventData.answer;
    self.reqStillValid = eventData.reqStillValid;

    if (!self.room.megaChat.rtc.getSessionBySid(eventData.sid)) {
        // create a fake/dummy session
        var sess = {
            peerJid: function() { return eventData.peer; },
            sentMediaTypes: function() {
                return {
                    'audio': callOptions.audio,
                    'video': callOptions.video
                };
            },
            receivedMediaTypes: function() {
                return {
                    'audio': callOptions.audio,
                    'video': callOptions.video
                };
            }
        };
        self.getCallManager().incomingRequestJingleSessions[eventData.sid] = sess;
    }

    // capture the initial requested media options
    var mediaOptions = self.getRemoteMediaOptions();

    var doAnswer = function() {
        self.room.activateWindow();
        self.room.show();
        self.getCallManager().incomingCallDialog.hide();

        // close any started/starting sessions
        self.getCallManager().forEachCallSession(function(callSession) {
            if (callSession.isStarted() || callSession.isStarting()) {
                callSession.endCall();
            }
        });

        eventData.answer(true, {
            mediaOptions: mediaOptions
        });


        self.room.megaChat.trigger('onCallAnswered', [self, eventData]);
        self.getCallManager().trigger('CallAnswered', [self, eventData]);
    };

    var doCancel = function() {
        self.getCallManager().incomingCallDialog.hide();

        if (!eventData.info) {
            eventData.info = {};
        }
        eventData.info.reason = 'busy';

        eventData.answer(false, eventData.info.reason);

        self.room.trigger('onCallDeclined', eventData);

        self.setState(CallSession.STATE.REJECTED);
        self.getCallManager().trigger('CallRejected', [self, eventData.info.reason]);
    };

    var participants = self.room.getParticipantsExceptMe();

    var dialogMessage = new ChatDialogMessage({
        messageId: 'incoming-call-' + self.sid,
        type: 'incoming-call',
        authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
        delay: unixtime(),
        persist: false,
        buttons: {
            'answer': {
                'type': 'primary',
                'classes': 'default-white-button small-text left',
                'text': l[7205],
                'callback': doAnswer
            },
            'reject': {
                'type': 'secondary',
                'classes': 'default-white-button small-text left red',
                'text': l[1686],
                'callback': doCancel
            }
        }
    });

    if (self.room.type === "private") {

        CallManager.assert(participants[0], "No participants found.");


        var contact = self.room.megaChat.getContactFromJid(participants[0]);

        if (!contact) {
            self.logger.error("Contact not found: ", participants[0]);
        } else {

            var avatar = useravatar.contact(contact.u, '', 'div');

            // callOptions, can be == {} in the cases then the user does not have/have not provided access
            // to the cam & mic
            var showVideoButton = true;

            if (self.getRemoteMediaOptions().video === false && self.getRemoteMediaOptions().audio === true) {
                showVideoButton = false;
            }

            self.room.megaChat.trigger('onIncomingCall', [
                self.room,
                self.room.megaChat.getContactNameFromJid(participants[0]),
                avatar,
                showVideoButton,
                eventData.sid,
                self,
                dialogMessage
            ]);



            self.getCallManager().incomingCallDialog.show(
                self.room.megaChat.getContactNameFromJid(participants[0]),
                avatar,
                eventData.sid,
                showVideoButton,
                function() {
                    mediaOptions.audio = true;
                    mediaOptions.video = false;

                    doAnswer();
                },
                function() {
                    mediaOptions.audio = true;
                    mediaOptions.video = true;

                    doAnswer();
                },
                function() {
                    doCancel();
                }
            );
        }

    } else {
        // TODO: Groups, TBD
        throw new Error("Not implemented");
    }

    self.room.appendMessage(
        dialogMessage
    );
};

CallSession.prototype._removeTempMessages = function() {
    var self = this;

    var toBeRemovedTypes = [
        'call-initialising',
        'call-starting',
        'incoming-call',
        'outgoing-call',
    ];

    self.room.messagesBuff.removeMessageBy(function(v) {
        if (toBeRemovedTypes.indexOf(v.type) >= 0 && v.messageId === v.type+"-"+self.sid) {
            return true;
        }
    });

    self.room.messagesBuff.removeMessageByType("call-initialising-" + self.sid);
    self.room.messagesBuff.removeMessageByType("incoming-call-" + self.sid);
    self.room.messagesBuff.removeMessageByType("outgoing-call-" + self.sid);
    self.room.messagesBuff.removeMessageByType("call-starting-" + self.sid);
};
CallSession.prototype.onCallStarting = function(e) {
    var self = this;

    self._removeTempMessages();

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-starting-' + self.sid,
            type: 'call-starting',
            authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
            delay: unixtime(),
            persist: false
        })
    );

};

CallSession.prototype.onCallAnswered = function(e) {
    var self = this;

    self._removeTempMessages();

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-initialising-' + self.sid,
            type: 'call-initialising',
            authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
            delay: unixtime(),
            persist: false
        })
    );

};

CallSession.prototype._renderInCallUI = function() {
    var self = this;

    self.room._currentCallCounter = 0;
    if (self.room._currentCallTimer) {
        clearInterval(self.room._currentCallTimer);
    }
    self.room._currentCallTimer = setInterval(function() {
        $('.call-counter[data-room-jid="' + self.room.roomJid.split("@")[0] + '"]').text(
            secondsToTimeShort(self.room._currentCallCounter)
        );

        self.room._currentCallCounter++;
    }, 1000);

    self.renderCallStartedState();
};

CallSession.prototype.onCallStarted = function(e, eventData) {
    var self = this;

    self.liveCallStats = {};

    eventData.stats = {
        scanPeriod: 1, maxSamplePeriod: 5,
        onSample: function(stats, type) {
            if (type === 1) {
                self.liveCallStats.stats = stats;
            } else if (type === 0) {
                self.liveCallStats.commonStats = stats;
            }
        }
    };

    if (
        self.room.callSession &&
        self.room.callSession !== self &&
        (
            self.room.callSession.isStarted() || self.room.callSession.isStarting()
        )
    ) {
        self.room.callSession.endCall('busy');
    }

    if (!self.room.callSession || self.room.callSession !== self) {
        delete self.room.callSession;
        self.room.callSession = self;
    }


    self._renderInCallUI();

    self.room.megaChat.dumpCallStats = self.room.dumpCallStats = function() {
        var s = self.callStats.stats ? RTC.Stats.statItemToString(self.callStats.stats) : "";
        s += self.callStats.commonStats ? RTC.Stats.statItemToString(self.callStats.commonStats) : "";
        s = s.replace(/\n/g, '\n');

        console.debug(
            "Debug Call Stats: \n" + s
        );


        return {
            'str': s,
            'stats': self.callStats.stats,
            'commonStats': self.callStats.commonStats
        };
    };


    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-started-' + self.sid,
            type: 'call-started',
            authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
            delay: unixtime(),
            persist: false
        })
    );

    self.renderCallStartedState();
};

CallSession.prototype.onCallEnded = function(e, reason) {
    var self = this;


    if (self.room._currentCallCounter) {
        self.room.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-ended-' + self.sid,
                type: 'call-ended',
                authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
                delay: unixtime(),
                cssClasses: ['fm-chat-call-reason-' + reason],
                currentCallCounter: self.room._currentCallCounter
            })
        );
    }
    self.room.trigger('CallTerminated', [e, self.room]);
    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallRejected = function(e, reason) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    if (reason === "caller") {
        self.room.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-ended-' + self.sid,
                type: 'call-canceled',
                authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
                delay: unixtime(),
            })
        );
    } else {
        self.room.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-rejected-' + self.sid,
                type: 'call-rejected',
                authorContact: self.room.megaChat.getContactFromJid(self.getPeer()),
                delay: unixtime()
            })
        );
    }

    self.getCallManager().trigger('CallTerminated', [self, e]);
};
CallSession.prototype.onCallHandledElsewhere = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-handled-elsewhere-' + self.sid,
            type: 'call-handled-elsewhere',
            authorContact: self.room.megaChat.getContactFromJid(peer),
            delay: unixtime(),
            persist: false
        })
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallFailed = function(e, reason, txt) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-failed-' + self.sid,
            type: 'call-failed',
            authorContact: self.room.megaChat.getContactFromJid(peer),
            delay: unixtime(),
            persist: false
        })
    );

    self.room.trigger('CallTerminated', [e, self.room]);

    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallMissed = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-missed-' + self.sid,
            type: 'call-missed',
            authorContact: self.room.megaChat.getContactFromJid(peer),
            delay: unixtime()
        })
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};
CallSession.prototype.onCallTimeout = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    self.room.appendMessage(
        new ChatDialogMessage({
            messageId: 'call-timeout-' + self.sid,
            type: 'call-timeout',
            authorContact: self.room.megaChat.getContactFromJid(peer),
            delay: unixtime()
        })
    );


    self.getCallManager().trigger('CallTerminated', [self, e]);
};

/**
 * Called when the call was missed, failed, rejected or simply ended
 */
CallSession.prototype.onCallTerminated = function(e) {
    var self = this;

    if (self.getCallManager().incomingCallDialog.sid === self.sid) {
        self.getCallManager().incomingCallDialog.hide();

        self._removeTempMessages();
    }

    if (self.room.callSession === self) {
        delete self.room.callSession;
    }

    if ($(document).fullScreen() && self.room.isCurrentlyActive) {
        $(document).fullScreen(false);
    }


    self.renderCallEndedState();
};

/**
 * onStateChanged handler, for now will only notify the room that there was a change in
 * the underlying data (e.g. state)
 *
 * @param e
 * @param session
 * @param oldState
 * @param newState
 */
CallSession.prototype.onStateChanged = function(e, session, oldState, newState) {
    this.room.trackDataChange();
};

/**
 * End/cancel/reject a call.
 *
 * @param [reason] {String}
 * @returns {*}
 */
CallSession.prototype.endCall = function(reason) {
    var self = this;

    if (
        self.isStarting() ||
        self.state === CallSession.STATE.WAITING_RESPONSE_OUTGOING ||
        self.state === CallSession.STATE.WAITING_RESPONSE_INCOMING
    ) {
        if (self.answer && self.reqStillValid && self.reqStillValid()) {
            if (reason === 'failed') {
                self.setState(CallSession.STATE.FAILED);
                self.getCallManager().trigger('CallFailed', [self, reason]);
                return self.answer(false, {reason: reason});
            } else {
                self.setState(CallSession.STATE.MISSED);
                self.getCallManager().trigger('CallMissed', [self, reason]);
                return self.answer(false, {reason: reason});
            }
        } else if (self.cancel) {
            self.setState(CallSession.STATE.REJECTED);
            self.getCallManager().trigger('CallRejected', [self, reason]);
            return self.cancel();
        } else {
            // no need to trigger event, the RTC module will trigger it, when receiving the session ended stanzas
            return self.room.megaChat.rtc.hangup(self.sid, reason);
        }
    } else if (self.isStarted()) {
        // no need to trigger event, the RTC module will trigger it, when receiving the session ended stanzas
        return self.room.megaChat.rtc.hangup(self.sid, reason);
    } else {
        return false;
    }
};

CallSession.prototype.onRemoteAudioMuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onRemoteAudioUnmuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onRemoteVideoMuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onRemoteVideoUnmuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};

CallSession.prototype.onLocalAudioMuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onLocalAudioUnmuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onLocalVideoMuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};
CallSession.prototype.onLocalVideoUnmuted = function(e) {
    var self = this;
    self.room.trackDataChange();
};


CallSession.prototype.muteAudio = function(/*?*/) {
    var self = this;

    self.room.megaChat.karere.connection.rtc.muteUnmute(true, {audio:true});

    self.getCallManager().trigger('LocalAudioMuted', [self]);
};
CallSession.prototype.unmuteAudio = function(/*?*/) {
    var self = this;

    self.room.megaChat.karere.connection.rtc.muteUnmute(false, {audio:true});

    self.getCallManager().trigger('LocalAudioUnmuted', [self]);
};
CallSession.prototype.muteVideo = function(/*?*/) {
    var self = this;

    self.room.megaChat.karere.connection.rtc.muteUnmute(true, {video:true});

    self.getCallManager().trigger('LocalVideoMuted', [self]);
};
CallSession.prototype.unmuteVideo = function(/*?*/) {
    var self = this;

    self.room.megaChat.karere.connection.rtc.muteUnmute(false, {video:true});

    self.getCallManager().trigger('LocalVideoUnmuted', [self]);
};

CallSession.prototype.setState = function(newState) {
    var oldState = this.state;

    if (oldState === newState) {
        return false;
    }

    assertStateChange(
        oldState,
        newState,
        CallSession.ALLOWED_STATE_TRANSITIONS,
        CallSession.STATE
    );

    this.state = newState;

    if (d) { /* performance, save some loops/closures creation CPU/memory */
        this.logger.debug(
            "State changed: ",
            constStateToText(CallSession.STATE, oldState),
            ' -> ',
            constStateToText(CallSession.STATE, newState)
        );
    }

    this.getCallManager().trigger('StateChanged', [this, this, oldState, newState]);
};


CallSession.prototype.isTerminated = function() {
    return (
            this.state === CallSession.STATE.ENDED ||
            this.state === CallSession.STATE.HANDLED_ELSEWHERE ||
            this.state === CallSession.STATE.REJECTED ||
            this.state === CallSession.STATE.FAILED ||
            this.state === CallSession.STATE.MISSED ||
            this.state === CallSession.STATE.TIMEOUT
    );
};


CallSession.prototype.isStarting = function() {
    return (
            this.state === CallSession.STATE.STARTING
    );
};
CallSession.prototype.isStarted = function() {
    return (
            this.state === CallSession.STATE.STARTED
    );
};

CallSession.prototype.isNotStarted = function() {
    return (
        this.state !== CallSession.STATE.STARTED &&
        (
            this.state === CallSession.STATE.INITIALISED ||
            this.state === CallSession.STATE.WAITING_RESPONSE_INCOMING ||
            this.state === CallSession.STATE.WAITING_RESPONSE_OUTGOING
        )
    );
};

CallSession.prototype.getCallManager = function() {
    var self = this;
    return self.room.megaChat.plugins.callManager;
};

CallSession.prototype.getJingleSession = function() {
    var self = this;

    var session = self.room.megaChat.rtc.getSessionBySid(self.sid);
    if (!session) {
        session = self.getCallManager().incomingRequestJingleSessions[self.sid];

        if (!session) {
            session = self.getCallManager().callEndedJingleSessions[self.sid];

            if (!session) {
                session = self.getCallManager().outgoingRequestJingleSessions[self.sid];

                if (!session) {
                    if (d) {
                        debugger;
                    }
                }
            }
        }
    }
    CallManager.assert(session, 'jingle session not found.');

    return session;
};

CallSession.prototype.getPeer = function() {
    var jingleSession = this.getJingleSession();
    if (jingleSession && jingleSession.peerJid) {
        return jingleSession.peerJid();
    } else if (
        this.state === CallSession.STATE.WAITING_RESPONSE_OUTGOING ||
        this.state === CallSession.STATE.REJECTED
    ) {
        // jingleSession.peerJid === undefined
        if (this.room) {
            return this.room.getParticipantsExceptMe()[0];
        } else {
            CallManager.assert(false, "Failed to get peerJid [1]");
        }
    } else {
        CallManager.assert(false, "Failed to get peerJid [2]");
    }
};

CallSession.prototype.getMediaOptions = function() {
    return this.getJingleSession().sentMediaTypes();
};

CallSession.prototype.getRemoteMediaOptions = function() {
    return this.getJingleSession().receivedMediaTypes();
};


CallSession.prototype.renderCallStartedState = function() {
    var self = this;

    self.room.megaChat.activeCallSession = self;


    self.room.trackDataChange();
    self._removeTempMessages();
};

CallSession.prototype.renderCallEndedState = function() {
    var self = this;

    self.getCallManager().incomingCallDialog.hide();


    self.room.getNavElement().show();

    if (self.room._currentCallTimer) {
        clearInterval(self.room._currentCallTimer);
    }

    self._removeTempMessages();
};

CallSession.prototype.destroy = function() {
    // TODO: self destruct + remove self from the CallManager's registers onCallTerminated with some timeout.
};

/**
 * Manages RTC <-> MegChat logic and mapping to UI
 *
 * @param megaChat
 * @returns {CallManager}
 * @constructor
 */
var CallManager = function(megaChat) {
    var self = this;
    self.logger = MegaLogger.getLogger("callManager", {}, megaChat.logger);

    self.megaChat = megaChat;

    self.incomingCallDialog = new mega.ui.chat.IncomingCallDialog();

    self.callSessions = {};

    self.incomingRequestJingleSessions = {};
    self.outgoingRequestJingleSessions = {};
    self.callEndedJingleSessions = {};

    megaChat.unbind("onInit.callManager");
    megaChat.bind("onInit.callManager", function(e) {
        try {
            megaChat.rtc = megaChat.karere.connection.rtc = new RtcSession(megaChat.karere.connection, megaChat.options.rtcSession);
            self._attachToChat(megaChat);
        }
        catch (e) {
            // no RTC support.
            if (e instanceof RtcSession.NotSupportedError) {
                self.logger.warn("This browser does not support webRTC");
            } else {
                self.logger.error("Error initializing webRTC support:", e);
            }
            megaChat.rtcError = e;
        }
    });

    return self;
};

makeObservable(CallManager);

CallManager.prototype._rtcEventProxyToRoom = function(e, eventData) {
    var self = this;
    var megaChat = self.megaChat;

    self.logger.debug("RTC: ", e, eventData);

    var peer = eventData.peer;

    if (peer) {
        var fromBareJid = Karere.getNormalizedBareJid(peer);
        if (fromBareJid === megaChat.karere.getBareJid()) {
            megaChat.logger.warn("Ignoring my own incoming request.");

            return;
        }
        var chatJids = [fromBareJid];
        chatJids.push(megaChat.karere.getBareJid());

        var resp = megaChat.openChat(chatJids, "private", undefined, undefined, undefined, false);

        resp[2].done(function(roomJid, room) {
            room.trigger(e, eventData);
        });
    } else {
        var room = megaChat.getCurrentRoom();

        self.logger.log("Routing RTC event to current room: ", room, e, eventData);

        // local-stream-connect = most likely this is the currently active window/room
        if (room) {
            room.trigger(e, eventData);
        }
    }


    // TODO: Multi group calls?
};

/**
 * Entry point, for attaching the chat store to a specific `Chat` instance
 *
 * @param megaChat
 */
CallManager.prototype._attachToChat = function(megaChat) {
    var self = this;

    megaChat.rtc.statsUrl = "https://stats.karere.mega.nz/stats";



    var selfBoundRtcEventProxyToRoom = self._rtcEventProxyToRoom.bind(self);
    $(megaChat.rtc).on('call-incoming-request.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-answered.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-declined.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-answer-timeout.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-canceled.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-canceled-caller.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('media-recv.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('local-stream-connect.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('remote-player-remove.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('local-player-remove.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('local-media-fail.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-init.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('call-ended.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('muted.callManager', selfBoundRtcEventProxyToRoom);
    $(megaChat.rtc).on('unmuted.callManager', selfBoundRtcEventProxyToRoom);


    $(megaChat.rtc).on('local-media-request.callManager', function() {
        $('.camera-access').removeClass('hidden');
    });
    $(megaChat.rtc).on('local-media-handled.callManager', function() {
        $('.camera-access').addClass('hidden');
    });
    $(megaChat.rtc).on('local-media-fail.callManager', function() {
        $('.camera-access').addClass('hidden');
    });

    megaChat.unbind("onRoomDestroy.callManager");
    megaChat.bind("onRoomDestroy.callManager", function(e, chatRoom) {
        CallManager.assert(chatRoom.type, 'missing room type');

        self._detachFromChatRoom(megaChat, chatRoom);
    });

    megaChat.unbind("onRoomCreated.chatStore");
    megaChat.bind("onRoomCreated.chatStore", function(e, chatRoom) {
        CallManager.assert(chatRoom.type, 'missing room type');

        self._attachToChatRoom(megaChat, chatRoom);
    });
};


/**
 * Suggested by Alex, a simple regexp to detect and find ALL 'reason's for a call failed reasons.
 **/
CallManager._isAFailedReason = function(reason) {
    if (!reason || !reason.match) {
        return false;
    }
    return reason.match(/.*(ice-disconnect|fail|error|security|timeout|xmpp-disconnect).*/) ? 1 : 0;
}

/**
 * This method will map RtcSession Events to Call Manager events and CallSession callbacks.
 * This method should NOT contain any UI logic.
 * The UI Logic will be embedded into the CallSession's callbacks.
 * Any external logic should be hooked up using events, so that the code is organised into diff. files for different
 * logic and still be self-contained and with no hard coded (or minimum) relations between modules/components.
 *
 * @param megaChat
 * @param chatRoom
 * @private
 */
CallManager.prototype._attachToChatRoom = function(megaChat, chatRoom) {
    var self = this;

    /**
     * call-incoming-request:
     * map session
     * if there is already opened session - reject
     * if not, show incoming call dialog
     * log msg
     * on answer - set state
     */

    chatRoom.rebind('media-recv.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);

        self.trigger('RemoteStreamReceived', [session, eventData]);
    });

    chatRoom.rebind('local-stream-connect.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        self.trigger('LocalStreamReceived', [session, eventData]);
    });
    chatRoom.rebind('local-player-remove.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        self.trigger('LocalStreamRemoved', [session, eventData]);
    });
    chatRoom.rebind('remote-player-remove.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        self.trigger('RemoteStreamRemoved', [session, eventData]);
    });

    chatRoom.rebind('call-init.callManager call-answered.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        session.setState(CallSession.STATE.STARTING);
        self.trigger('CallStarting', [session]);

        session.setState(CallSession.STATE.STARTED);
        self.trigger('CallStarted', [session, eventData]);
    });


    chatRoom.rebind('call-incoming-request.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        session.setState(CallSession.STATE.WAITING_RESPONSE_INCOMING);
        self.trigger('WaitingResponseIncoming', [session, eventData]);
    });

    // local user will receive this event in case of timeout
    chatRoom.rebind('call-answer-timeout.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        session.setState(CallSession.STATE.TIMEOUT);

        self.callEndedJingleSessions[session.sid] = session.getJingleSession();

        if (self.incomingRequestJingleSessions[session.sid]) {
            delete self.incomingRequestJingleSessions[session.sid];
        } if (self.outgoingRequestJingleSessions[session.sid]) {
            delete self.outgoingRequestJingleSessions[session.sid];
        }

        self.trigger('CallTimeout', [session, eventData]);
    });


    // remote user will receive this event in case of timeout
    chatRoom.rebind('call-canceled.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        self.callEndedJingleSessions[session.sid] = session.getJingleSession();

        delete self.incomingRequestJingleSessions[session.sid];

        var reason = eventData.reason;
        if (reason === 'call-unanswered' || reason === 'peer-call-unanswered') {
            session.setState(CallSession.STATE.MISSED);
            self.trigger('CallMissed', [session, eventData]);
        } else if (reason === 'handled-elsewhere') {
            session.setState(CallSession.STATE.HANDLED_ELSEWHERE);
            self.trigger('CallHandledElsewhere', [session, eventData]);
        } else if (reason === 'peer-user') {
            session.setState(CallSession.STATE.MISSED);
            self.trigger('CallMissed', [session, eventData]);
        } else if (reason === 'user') {
            // do nothing, we canceled it so we have that handled already, this is just a feedback event
        } else if (CallManager._isAFailedReason(reason)) {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text])
        } else {
            CallManager.assert(false, 'unknown call-canceled:eventData.reason found:', reason);
        }
    });

    chatRoom.rebind('call-ended.callManager call-declined.callManager', function (e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);

        if (self.outgoingRequestJingleSessions[session.sid] || self.incomingRequestJingleSessions[session.sid]) {
            self.callEndedJingleSessions[session.sid] = session.getJingleSession(session.sid);
            self.callEndedJingleSessions[session.sid].peerJid = function() {
                return eventData.peer;
            };

            delete self.outgoingRequestJingleSessions[session.sid];
            delete self.incomingRequestJingleSessions[session.sid];
        }

        if (eventData.stats) {
            session.callStats.push(
                eventData.stats
            );
        }

        var reason = eventData.reason ?
            eventData.reason : (
            eventData.info && eventData.info.reason ?
                eventData.info.reason : undefined
        );

        if (
            (
                session.isStarted() ||
                session.isNotStarted()
            ) &&
            (
                reason === 'peer-hangup' ||
                reason === 'hangup' ||
                reason === 'caller' ||
                reason === 'disconnected'
            )
        ) {
            if (session.state === CallSession.STATE.STARTED) {
                session.setState(CallSession.STATE.ENDED);
                self.trigger('CallEnded', [session, reason]);
            }
            else {
                session.setState(CallSession.STATE.REJECTED);
                self.trigger('CallRejected', [session, reason]);
            }
        }
        else if (reason === 'busy' || reason === 'hangup' || reason === 'peer-hangup') {
            session.setState(CallSession.STATE.REJECTED);
            self.trigger('CallRejected', [session, reason]);
        }
        else if (reason === 'security') {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        }
        else if (reason === 'failed') {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        }
        else if (reason === 'initiate-timeout') { // "timed out, while waiting for the caller to join the call"
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        }
        else if (
                CallManager._isAFailedReason(reason) ||
                reason.indexOf('error') > -1
            ) {
                session.setState(CallSession.STATE.FAILED);
                self.trigger('CallFailed', [session, reason, eventData.text]);
        }
        else {
            session.logger.error(
                'Unknown call ended reason: ',
                reason,
                'in session with current state: ',
                constStateToText(
                    CallSession.STATE, session.state
                )
            );
        }
    });

    chatRoom.rebind('muted.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        if (eventData.info.video) {
            self.trigger('RemoteVideoMuted', [session]);
        } else if (eventData.info.audio) {
            self.trigger('RemoteAudioMuted', [session]);
        } else {
            session.logger.error('Unknown muted state: ', eventData.info);
        }
    });

    chatRoom.rebind('unmuted.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);
        if (eventData.info.video) {
            self.trigger('RemoteVideoUnmuted', [session]);
        } else if (eventData.info.audio) {
            self.trigger('RemoteAudioUnmuted', [session]);
        } else {
            session.logger.error('Unknown unmuted state: ', eventData.info);
        }
    });

    chatRoom.rebind('local-media-fail.callManager', function(e, eventData) {
        var session = self.getOrCreateSessionFromEventData(e.type, eventData, chatRoom);

        if (eventData.continue) {
            eventData.wait = true;
            eventData.continue(true);
        }

        if (!eventData.continue && chatRoom.callSession) {
            session.endCall('failed');
        }


        chatRoom.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-failed-media-' + session.sid,
                type: 'call-failed-media',
                authorContact: chatRoom.megaChat.getContactFromJid(session.getPeer()),
                delay: unixtime(),
                persist: false
            })
        );

    });

};

CallManager.prototype._detachFromChatRoom = function(megaChat, chatRoom) {
    var self = this;

    // reverse any persistent operation done from self._attachFormChatRoom
    chatRoom.unbind('media-recv.callManager');
    chatRoom.unbind('call-init.callManager call-answered.callManager');
    chatRoom.unbind('call-incoming-request.callManager');
    chatRoom.unbind('call-answer-timeout.callManager');
    chatRoom.unbind('call-canceled.callManager');
    chatRoom.unbind('call-ended.callManager');
    chatRoom.unbind('muted.callManager');
    chatRoom.unbind('unmuted.callManager');
};


CallManager.prototype.getOrCreateSessionFromEventData = function(eventName, eventData, chatRoom) {
    var self = this;
    var sid;
    var callSession;

    // no jingle session yet
    if (eventData.sid) { 
        sid = eventData.sid;
    }
    // there is a jingle session created for this sid
    else if (eventData.sess) {
        sid = eventData.sess.sid();
    }
    else {
        // handle the eventData{player: .., id: ...} use case for local-stream-* and remove stream etc
        if (chatRoom.callSession) {
            sid = chatRoom.callSession.sid;
        }
    }

    // the only allowed case, when the sid can not be found and the code should continue its execution is when the
    // local-stream-connect || local-player-remove is triggered, in that case, the active session is the one for the
    // currently active/visible room
    // ---
    // this is a local-stream-connect OR
    // local-player-remove
    if (eventData.player && $(eventData.player).is(".localViewport") === true) {
        if (!chatRoom.callSession) {
            return;
        }

        if (eventName === "local-stream-connect") {
            CallManager.assert(
                chatRoom.callSession.isNotStarted() ||
                chatRoom.callSession.isTerminated() ||
                chatRoom.callSession.isStarting(),
                'expected that when the local-stream-connect is triggered, the currently stored session in the room ' +
                'would be in starting state'
            );
        }

        sid = chatRoom.callSession.sid;
        callSession = chatRoom.callSession;
    }
    if (!sid) { debugger; }

    CallManager.assert(sid, 'No sid found in event', eventName, 'event data:', eventData);

    if (!callSession) {
        if (self.callSessions[sid] !== undefined) { // session found
            callSession = self.callSessions[sid];
        } else {
            callSession = self.callSessions[sid] = new CallSession(chatRoom, sid);
            var peer = eventData.peer;

            if (!chatRoom) {
                if (peer) {
                    var fromBareJid = Karere.getNormalizedBareJid(peer);
                    if (fromBareJid == megaChat.karere.getBareJid()) {
                        return;
                    }
                    var chatJids = [fromBareJid];
                    chatJids.push(megaChat.karere.getBareJid());

                    var resp = megaChat.openChat(chatJids, "private", undefined, undefined, undefined, false);

                    chatRoom = resp[1];
                }
            }

            CallManager.assert(chatRoom, 'chatRoom not found for session with evData: ', eventData);
        }
    }

    if (eventData.player) {
        if ($(eventData.player).is(".localViewport")) {
            callSession.localPlayer = eventData.player;
        } else {
            callSession.remotePlayer = eventData.player;
        }
    }
    return self.callSessions[sid];
};

CallManager.prototype.startCall = function(chatRoom, mediaOptions) {
    var self = this;

    if (chatRoom.callSession && !chatRoom.callSession.isTerminated()) {
        chatRoom.callSession.endCall('hangup');
    }

    var session;
    var $masterPromise = new MegaPromise();

    chatRoom.megaChat.closeChatPopups();

    var participants = chatRoom.getParticipantsExceptMe();
    CallManager.assert(participants.length > 0, "No participants.");

    if (!chatRoom.megaChat.rtc) {
        if (chatRoom.megaChat.rtcError && chatRoom.megaChat.rtcError instanceof RtcSession.NotSupportedError) {
            msgDialog('warninga', 'Error', l[7211]);
        }
        else {
            var errorMsg = chatRoom.megaChat.rtcError ? (
                chatRoom.megaChat.rtcError.toString() + "\n" + chatRoom.megaChat.rtcError.stack
            ) : l[1679];
            msgDialog('warninga', 'Error', l[1657] + ":\n" + errorMsg + "\n" + errorMsg);
        }
        return;
    }

    if (chatRoom.callSession && (chatRoom.callSession.isStarted() || chatRoom.callSession.isStarting())) {
        chatRoom.callSession.endCall();
    }

    var $promise = chatRoom._retrieveTurnServerFromLoadBalancer(4000);

    $promise.always(function() {
        var req = chatRoom.megaChat.rtc.startMediaCall(participants[0], mediaOptions);
        session = self.callSessions[req.sid] = new CallSession(chatRoom, req.sid);



        chatRoom._resetCallStateInCall();

        session.setState(CallSession.STATE.WAITING_RESPONSE_OUTGOING);

        chatRoom.trigger('onOutgoingCall', [req, mediaOptions, session]);

        chatRoom.appendMessage(
            new ChatDialogMessage({
                messageId: 'outgoing-call-' + session.sid,
                type: 'outgoing-call',
                authorContact: chatRoom.megaChat.getContactFromJid(participants[0]),
                delay: unixtime(),
                persist: false,
                buttons: {
                    'reject': {
                        'type': 'secondary',
                        'classes': 'default-white-button small-text left red',
                        'text': l[1686],
                        'callback': function () {
                            if (session) {
                                session.endCall('caller');
                            }
                        }
                    }
                }
            })
        );


        self.trigger('WaitingResponseOutgoing', [session, req]);
        $masterPromise.resolve(session);

    });

    return $masterPromise;
};

(function() { // used to make the _origTrigger a private var.
    var _origTrigger = CallManager.prototype.trigger;
    CallManager.prototype.trigger = function(evtName, args) {
        var self = this;
        var session = args;
        if ($.isArray(session)) { // jquery allows .trigger to be called in 2 different ways...
            session = session[0];
        }

        if (!session) {
            return;
        }

        CallManager.assert(
            session instanceof CallSession,
            'CallManager tried to relay event to a non-session argument:', typeof session
        );

        if (typeof(session["on" + evtName]) !== 'undefined') { // proxy events to sessions
            var eventObject = new jQuery.Event(evtName);
            var proxyArgs = args.slice(1);
            proxyArgs = [eventObject, proxyArgs];

            session.trigger.apply(session, proxyArgs); // pass the arguments, except the session and eventName

            self.logger.debug("Will trigger event: ", "on" + evtName/*, proxyArgs*/);

            // event handlers can stop the event propagation CallSession -> CallManager
            if (eventObject.isPropagationStopped()) {
                return self; // replicate jQuery's call chains
            }
        } else {
            self.logger.error("Event not found on session obj: ", "on" + evtName);
        }
        _origTrigger.apply(self, arguments);
    };
})();


/**
 * Helpers
 */
CallManager.prototype.forEachCallSession = function(cb) {
    var self = this;
    return Object.keys(self.callSessions).forEach(function(sid) {
        return cb(self.callSessions[sid], sid);
    });
};

CallManager.assert = function(cond) {
    if (cond) {
        return;
    }
    var msg = '';
    var last = arguments.length - 1;
    for (var i = 1; i <= last; i++) {
        msg += arguments[i];
        if (i < last) {
            msg += ' ';
        }
    }
    var stack = (new Error()).stack;

    //log error to call stat server
    megaChat.rtc.logMsg('e', "CallManager assertion failed: "+msg+"\nStack:\n"+stack);

    assert(false, msg);
}
