/**
 * CallSession Manager
 *
 * @param chatRoom
 * @param sid
 * @constructor
 */
var CallSession = function(chatRoom, sid) {
    assert(chatRoom, 'missing chatRoom for CallSession');
    assert(sid, 'missing sid for CallSession');

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


/**
 * UI -> event mapping stuff
 */

CallSession.prototype.onLocalStreamReceived = function(e, eventData) {
    var self = this;
    $('.my-av-screen video', self.room.$header).remove();
    $('.localVideoWrapper', self.room.$header).append(eventData.player);
    self.localPlayer = eventData.player;
    self.localPlayer.play();
};

CallSession.prototype.onRemoteStreamReceived = function(e, eventData) {
    var self = this;

    if (!$.isArray(eventData.player)) {
        self.remotePlayer = eventData.player;
    } else {
        self.remotePlayer = eventData.player[0];
    }
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

    $('.btn-chat-call', self.room.$header).addClass("disabled");

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

    if (self.room.type === "private") {

        assert(participants[0], "No participants found.");


        var contact = self.room.megaChat.getContactFromJid(participants[0]);

        if (!contact) {
            self.logger.error("Contact not found: ", participants[0]);
        } else {

            var avatar = null;
            if (avatars[contact.u]) {
                avatar = avatars[contact.u].url;
            }

            self.room.megaChat.trigger('onIncomingCall', [
                self.room,
                self.room.megaChat.getContactNameFromJid(participants[0]),
                avatar,
                self.getRemoteMediaOptions().video ? true : false,
                eventData.sid,
                self
            ]);

            // callOptions, can be == {} in the cases then the user does not have/have not provided access
            // to the cam & mic
            var showVideoButton = self.getRemoteMediaOptions().video ? true : false;

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
                    mediaOptions.true = false;

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



    var $answer = $('.btn-chat-answer-incoming-call', self.room.$header);
    $answer.unbind('click.megaChat');
    $answer.bind('click.megaChat', doAnswer);
    $answer.show();

    var $cancel = $('.btn-chat-reject-incoming-call', self.room.$header);
    $cancel.unbind('click.megaChat');
    $cancel.bind('click.megaChat', doCancel);
    $cancel.show();

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "incoming-call",
            participants[0],
            "incoming-call",
            "Incoming call from " + self.room.megaChat.getContactNameFromJid(self.getPeer()),
            [],
            {
                'answer': {
                    'type': 'primary',
                    'text': "Answer",
                    'callback': doAnswer
                },
                'reject': {
                    'type': 'secondary',
                    'text': l[1686],
                    'callback': doCancel
                }
            }
        )
    );
};

CallSession.prototype.onCallStarting = function(e) {
    var self = this;

    self.room.getInlineDialogInstance("incoming-call").remove();
    self.room.getInlineDialogInstance("outgoing-call").remove();
    self.room.getInlineDialogInstance("call-starting").remove();

    // cleanup old video elements.
    $('.my-av-screen video, video.rmtViewport', self.room.$header);

    var msg = "Call with [X] is now starting...".replace(
        '[X]',
        self.room.megaChat.getContactNameFromJid(
            self.getPeer()
        )
    );

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "call-starting-" + self.sid,
            self.getPeer(),
            "call-starting",
            msg,
            ['fm-chat-call-starting']
        )
    );

};

CallSession.prototype.onCallAnswered = function(e) {
    var self = this;

    self.room.getInlineDialogInstance("incoming-call").remove();
    self.room.getInlineDialogInstance("outgoing-call").remove();
    self.room.getInlineDialogInstance("call-starting").remove();


    var msg = "Call with [X] is now initialising...".replace(
        '[X]',
        self.room.megaChat.getContactNameFromJid(
            self.getPeer()
        )
    );

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "call-initialising-" + self.sid,
            self.getPeer(),
            "call-starting",
            msg,
            ['fm-chat-call-starting']
        )
    );

    $('.btn-chat-call', self.room.$header).addClass('disabled');

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


    if (self.remotePlayer.length && self.remotePlayer.length === 1) {
        // api incompatibility ?
        self.room._othersAvElement = self.remotePlayer[0];
    } else {
        self.room._othersAvElement = self.remotePlayer;
    }

    self.room.megaChat.dumpCallStats = self.room.dumpCallStats = function() {
        var s = self.callStats.stats ? RTC.Stats.statItemToString(self.callStats.stats) : "";
        s += self.callStats.commonStats ? RTC.Stats.statItemToString(self.callStats.commonStats) : "";
        s = s.replace(/\n/g, '<br/>\n');

        var $inlineDialog = self.room.generateInlineDialog(
            "alert-info",
            self.room.megaChat.karere.getJid(),
            "debug",
            "Debug Call Stats...",
            [],
            {},
            !self.room.isActive()
        );
        $('.chat-message-txt', $inlineDialog).html(
            "Debug Call Stats: <br/>" + s
        );

        self.room.appendDomMessage(
            $inlineDialog
        );

        return {
            'str': s,
            'stats': self.callStats.stats,
            'commonStats': self.callStats.commonStats
        };
    };


    $('.others-av-screen video', self.room.$header).remove();

    if (!$('.video-full-container').is(":visible")) {
        $('.others-av-screen', self.room.$header).append(self.remotePlayer);
    } else {
        $('.video-full-container .other-user .front').append(self.remotePlayer);
    }
    $('.others-av-screen', self.room.$header).attr('data-jid', self.getPeer());

    if (self.getMediaOptions().video === false) {
        $('.others-av-screen .video-only', self.room.$header).hide();
    } else {
        $('.others-av-screen .video-only', self.room.$header).show();
    }


    $('.btn-chat-call', self.room.$header).addClass('disabled');


    $('.nw-conversations-item.current-calling').rebind('click.megaChat', function() {
        self.room.activateWindow();
    });

    var otherUsersJid = self.room.getParticipantsExceptMe()[0];

    var contactName = self.room.megaChat.getContactNameFromJid(
        otherUsersJid
    );
    if (contactName) {
        $('.nw-conversations-item.current-calling .nw-conversations-name').text(
            contactName
        );
    }

    self.room.megaChat._currentCallCounter = 0;
    if (self.room.megaChat._currentCallTimer) {
        clearInterval(self.room.megaChat._currentCallTimer);
    }
    self.room.megaChat._currentCallTimer = setInterval(function() {
        $('.nw-conversations-item.current-calling .chat-time-txt').text(
            secondsToTime(self.room.megaChat._currentCallCounter)
        );

        self.room.megaChat._currentCallCounter++;
    }, 1000);


    // Substitute email into language string
    var callWithString = l[5888].replace('[X]', self.room.megaChat.getContactNameFromJid(self.getPeer()));

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "started-call-" + unixtime(),
            self.getPeer(),
            "call-started",
            callWithString,
            []
        )
    );

    self.renderCallStartedState();
};

CallSession.prototype.onCallEnded = function(e, reason) {
    var self = this;


    if (self.room.megaChat._currentCallCounter) {
        var msg = l[5889].replace('[X]', self.room.megaChat.getContactNameFromJid(self.getPeer()));
        msg += " Call duration: [X].".replace("[X]", secToDuration(self.room.megaChat._currentCallCounter));

        self.room.appendDomMessage(
            self.room.generateInlineDialog(
                "ended-call-" + unixtime(),
                self.getPeer(),
                "call-ended",
                msg,
                ['fm-chat-call-reason-' + reason]
            )
        );

    }
    self.room.trigger('CallTerminated', [e, self.room]);
    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallRejected = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    // Show "Call with [X] was rejected."
    // ^^ should this should be changed to "canceled", not "rejected"?
    var msg = l[5892].replace('[X]', self.room.megaChat.getContactNameFromJid(peer));

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "rejected-call-" + unixtime(),
            peer,
            "rejected-call",
            msg,
            []
        )
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};
CallSession.prototype.onCallHandledElsewhere = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "canceled-call-" + unixtime(),
            peer,
            "call-from-different-device",
            l[5895].replace(
                '[X]',
                // Call with [X] was handled on some other device.
                self.room.megaChat.getContactNameFromJid(peer)
            ),
            []
        )
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallFailed = function(e, reason, txt) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    // Substitute email into language string
    var msg = "Call with [X] failed.".replace('[X]', self.room.megaChat.getContactNameFromJid(peer));
    if (self.room.megaChat._currentCallCounter) {
        msg += " Call duration: [X].".replace("[X]", secToDuration(self.room.megaChat._currentCallCounter));
    }

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "error-" + unixtime(),
            peer,
            "rejected-call",
            msg + " " + (txt ? txt : ""),
            []
        )
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};

CallSession.prototype.onCallMissed = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    var translationMissing = "You have one missed call from [X].";
    var msg = translationMissing.replace('[X]', self.room.megaChat.getContactNameFromJid(peer));

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "error-" + unixtime(),
            peer,
            "call-missed",
            msg,
            []
        )
    );

    self.getCallManager().trigger('CallTerminated', [self, e]);
};
CallSession.prototype.onCallTimeout = function(e) {
    var self = this;

    var peer = self.room.getParticipantsExceptMe()[0];

    // Substitute email into language string
    var callWithString = l[5890].replace(
        '[X]',
        self.room.megaChat.getContactNameFromJid(
                peer
        )
    );

    self.room.appendDomMessage(
        self.room.generateInlineDialog(
            "rejected-call-" + unixtime(),
            peer,
            "call-timeout",
            callWithString,
            []
        )
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
        self.room.getInlineDialogInstance("incoming-call").remove();
        self.room.getInlineDialogInstance("call-starting").remove();
    }

    if (self.room.callSession === self) {
        delete self.room.callSession;
    }
    self.renderCallEndedState();
};

CallSession.prototype.onStateChanged = function(e, session, oldState, newState) {};

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
                self.getCallManager().trigger('CallFailed', [self]);
                return self.answer(false, {reason: reason});
            } else {
                self.setState(CallSession.STATE.MISSED);
                self.getCallManager().trigger('CallMissed', [self]);
                return self.answer(false, {reason: reason});
            }
        } else if (self.cancel) {
            self.setState(CallSession.STATE.REJECTED);
            self.getCallManager().trigger('CallRejected', [self]);
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
    self.renderAudioVideoScreens();
};
CallSession.prototype.onRemoteAudioUnmuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};
CallSession.prototype.onRemoteVideoMuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};
CallSession.prototype.onRemoteVideoUnmuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};

CallSession.prototype.onLocalAudioMuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};
CallSession.prototype.onLocalAudioUnmuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};
CallSession.prototype.onLocalVideoMuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
};
CallSession.prototype.onLocalVideoUnmuted = function(e) {
    var self = this;
    self.renderAudioVideoScreens();
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
    assert(session, 'jingle session not found.');

    return session;
};

CallSession.prototype.getPeer = function() {
    return this.getJingleSession().peerJid();
};
CallSession.prototype.getMediaOptions = function() {
    return this.getJingleSession().sentMediaTypes();
};

CallSession.prototype.getRemoteMediaOptions = function() {
    return this.getJingleSession().receivedMediaTypes();
};


CallSession.prototype.renderCallStartedState = function() {
    var self = this;

    if (!self.getMediaOptions().audio) {
        $('.audio-icon', self.room.$header).addClass("active");
    } else {
        $('.audio-icon', self.room.$header).removeClass("active");
    }

    if (!self.getMediaOptions().video) {
        $('.video-icon', self.room.$header).addClass("active");
    } else {
        $('.video-icon', self.room.$header).removeClass("active");
    }

    $('.btn-chat-call', self.room.$header).addClass('hidden');
    $('.fm-end-call', self.room.$header).removeClass('hidden');

    $('.drag-handle', self.room.$header).show();
    self.room.$header.parent().addClass("video-call"); // adds video-call or audio-call class name

    // hide all elements
    $([
        '.chat-header-indicator.muted-audio',
        '.chat-header-indicator.muted-video',
        '.others-av-screen',
        '.my-av-screen'
    ].join(","), self.room.$header.parent()).addClass("hidden");


    // configure elements - avatars
    var myAvatar = avatars[u_handle];
    if (myAvatar) {
        $('.my-avatar', self.room.$header).attr('src', myAvatar.url);
        $('.my-avatar', self.room.$header).show();
        $('.my-avatar-text', self.room.$header).hide();
    } else {
        $('.my-avatar', self.room.$header).hide();
        var $txtAvatar = $('<div class="nw-contact-avatar"/>')
            .append(
            generateAvatarElement(u_handle)
        )
            .addClass(u_handle)
            .addClass(
            "color" + generateAvatarMeta(u_handle).color
        );

        $('.my-avatar-text', self.room.$header)
            .empty()
            .append(
            $txtAvatar
        )
            .show();
    }
    var otherUserContact = self.room.megaChat.getContactFromJid(self.room.getParticipantsExceptMe()[0]);
    if (otherUserContact.u && avatars[otherUserContact.u]) {
        $('.other-avatar', self.room.$header).attr('src', avatars[otherUserContact.u].url);
        $('.other-avatar', self.room.$header).show();
        $('.other-avatar-text', self.room.$header).hide();
    } else {
        $('.other-avatar', self.room.$header).hide();

        var $txtAvatar2 = $('<div class="nw-contact-avatar"/>')
            .append(
            generateAvatarElement(otherUserContact.u)
        )
            .addClass(otherUserContact.u)
            .addClass(
            "color" + generateAvatarMeta(otherUserContact.u).color
        );

        $('.other-avatar-text', self.room.$header)
            .empty()
            .append(
            $txtAvatar2
        )
            .show();
    }


    // new fullscreen logic
    var $expandButtons = $('.video-call-button.size-icon');
    var $fullscreenContainer = $('.video-full-container');
    $expandButtons.unbind('click.megaChat');
    $expandButtons.bind('click.megaChat', function() {
        if ($(this).attr('class').indexOf('active') === -1) {
            $expandButtons.addClass('active');
            $('.video-call-button.size-icon', $fullscreenContainer).addClass('active');

            // move the <video/> elements
            if (self.localPlayer) {
                $('.video-full-canvas-block.current-user .front', $fullscreenContainer).append(self.localPlayer);
                self.localPlayer.play();
            }
            if (self.room._othersAvElement) {
                $('.video-full-canvas-block.other-user .front', $fullscreenContainer).append(self.room._othersAvElement);
                self.room._othersAvElement.play();
            }

            // handle the hidden state of video tags in cases where the video was muted.
            $fullscreenContainer.removeClass("hidden");
            if (!$(self.localPlayer).is(":visible")) {
                $('.video-full-canvas-block.current-user').addClass('video-off');
            } else {
                $('.video-full-canvas-block.current-user video').css('display', '');
                $('.video-full-canvas-block.current-user').removeClass('video-off');
            }

            if (!$(self.room._othersAvElement).is(":visible")) {
                $('.video-full-canvas-block.other-user').addClass('video-off');
            } else {
                $('.video-full-canvas-block.other-user video').css('display', '');
                $('.video-full-canvas-block.other-user').removeClass('video-off');
            }

            $('.video-full-container .video-call-button.video-icon')[self.getMediaOptions().video ? "removeClass" : "addClass"]("active");
            $('.video-full-container .video-call-button.audio-icon')[self.getMediaOptions().audio ? "removeClass" : "addClass"]("active");

            $(document).fullScreen(true);
            $(window).trigger('resize');
        }
        else {
            $expandButtons.removeClass('active');
            $('.video-call-button.size-icon', $fullscreenContainer).removeClass('active');
            // move back the <video/> elements
            if (self.localPlayer) {
                $(self.localPlayer).css('height', '');
                $('.localVideoWrapper', self.room.$header).empty();
                $('.localVideoWrapper', self.room.$header).append(self.localPlayer);
                self.localPlayer.play();
            }
            if (self.room._othersAvElement) {
                $(self.room._othersAvElement).css({
                    'height': '',
                    'margin-top': '',
                    'margin-left': ''
                });

                $('.others-av-screen', self.room.$header).append(self.room._othersAvElement);
                self.room._othersAvElement.play();
            }


            $('.video-call-button.video-icon', self.room.$header)[self.getMediaOptions().video ? "removeClass" : "addClass"]("active");
            $('.video-call-button.audio-icon', self.room.$header)[self.getMediaOptions().audio ? "removeClass" : "addClass"]("active");
            self.renderAudioVideoScreens();
            $fullscreenContainer.addClass("hidden");

            $(document).fullScreen(false);
            $(window).trigger('resize');

            // object-fit hack
            $('.others-av-screen.video-call-container video').css('height', 'auto');
            setTimeout(function() { // TODO: remove this after the demo and find a proper solution.
                $('.others-av-screen.video-call-container video').css('height', '');
            }, 800);
        }
    });

    // collapse on ESC pressed (exited fullscreen)
    $(document)
        .unbind("fullscreenchange.megaChat")
        .bind("fullscreenchange.megaChat", function() {
            if (!$(document).fullScreen() && $fullscreenContainer.is(":visible")) {
                $('.video-full-container .video-call-button.size-icon.active').trigger('click');
            }
        });

    $('.video-call-button.hang-up-icon, .fm-end-call', $fullscreenContainer)
        .unbind('click.megaChat')
        .bind('click.megaChat', function() {
            $fullscreenContainer.addClass("hidden");
            self.endCall('hangup');
        });

    $('.small-video-reziser')
        .unbind('click')
        .bind('click', function() {
            if ($(this).attr('class').indexOf('active') == -1) {
                $(this).parent().addClass('minimized');
                $(this).parent().animate({
                    'min-height': '24px',
                    width: 24,
                    height: 24
                }, 200, function() {
                    $('.small-video-reziser').addClass('active');
                });
            } else {
                var w = 245;
                if ($(this).parent().attr('class').indexOf('current-user-audio-container') >= 1) {
                    w = 184;
                }
                $(this).parent().removeClass('minimized');
                $(this).parent().animate({
                    width: w,
                    height:184
                }, 200, function() {
                    $('.small-video-reziser').removeClass('active');
                    $(this).parent().css('min-height', '184px');
                });
            }
        });

    $('.video-call-button.audio-icon', $fullscreenContainer)
        .unbind('click.megaChat')
        .bind('click.megaChat', function() {
            if (self.getMediaOptions().audio === false) { // un mute
                self.getMediaOptions().audio = true;
                self.room.megaChat.karere.connection.rtc.muteUnmute(false, {audio:true});
                $(this).removeClass("active");
            } else { // mute
                self.getMediaOptions().audio = false;
                self.room.megaChat.karere.connection.rtc.muteUnmute(true, {audio:true});
                $(this).addClass("active");
            }
        })
        [self.getMediaOptions().audio ? "removeClass" : "addClass"]("active");


    $('.video-call-button.video-icon', $fullscreenContainer)
        .unbind('click.megaChat')
        .bind('click.megaChat', function() {
            if (self.getMediaOptions().video === false) { // un mute
                self.getMediaOptions().video = true;
                self.room.megaChat.karere.connection.rtc.muteUnmute(false, {video:true});
                $(this).removeClass("active");
                $('.video-full-canvas-block.current-user').removeClass('video-off');
                $('.video-full-canvas-block.current-user video').css('display', '');
            } else { // mute
                self.getMediaOptions().video = false;
                self.room.megaChat.karere.connection.rtc.muteUnmute(true, {video:true});
                $(this).addClass("active");
                $('.video-full-canvas-block.current-user').addClass('video-off');
            }
        })
        [self.getMediaOptions().video ? "removeClass" : "addClass"]("active");



    self.room.megaChat.activeCallRoom = self;
    $('.nw-conversations-header.call-started, .nw-conversations-item.current-calling').removeClass('hidden');
    $('.nw-conversations-item.current-calling').addClass('selected');

    self.room.getNavElement().hide();

    $('.nw-conversations-item.current-calling').attr('data-jid', self.room.roomJid);

    $('.nw-conversations-item.current-calling .chat-cancel-icon').unbind('click.megaChat');
    $('.nw-conversations-item.current-calling .chat-cancel-icon').bind('click.megaChat', function() {
        self.endCall('hangup');
    });

    // .chat-header-indicator.muted-video and .muted-audio should be synced when the .mute event is called

    var $cancel = $('.hang-up-icon, .fm-end-call', self.room.$header);
    $cancel.unbind('click.megaChat');
    $cancel.bind('click.megaChat', function() {
        self.endCall('hangup');
    });


    $cancel.show();

    self.room.megaChat.renderContactTree();

    self.renderAudioVideoScreens();

    self.room.getInlineDialogInstance("call-starting").remove();
    self.room.getInlineDialogInstance("incoming-call").remove();
    self.room.getInlineDialogInstance("outgoing-call").remove();

    self.room.refreshScrollUI();

    self.room.refreshUI(true);

    self.room.resized();
};

CallSession.prototype.renderCallEndedState = function() {
    var self = this;

    $('.drag-handle', self.room.$header).hide();

    self.room.$header.css('height', '');

    self.getCallManager().incomingCallDialog.hide();


    $('.chat-header-indicator.muted-video', self.room.$header).addClass("hidden");
    $('.chat-header-indicator.muted-audio', self.room.$header).addClass("hidden");

    $('.btn-chat-call', self.room.$header).removeClass('hidden');
    $('.btn-chat-call', self.room.$header).removeClass('disabled');
    $('.fm-end-call', self.room.$header).addClass('hidden');


    self.room.$header.parent()
        .removeClass("video-call")
        .removeClass("audio-call");


    $('.nw-conversations-header.call-started, .nw-conversations-item.current-calling')
        .addClass('hidden')
        .removeClass('selected');

    self.room.getNavElement().show();

    if (self.room.megaChat._currentCallTimer) {
        clearInterval(self.room.megaChat._currentCallTimer);
    }





    self.room.getInlineDialogInstance("call-starting").remove();
    self.room.getInlineDialogInstance("incoming-call").remove();
    self.room.getInlineDialogInstance("outgoing-call").remove();

    $('.video-full-container').addClass("hidden");

    $('.others-av-screen', self.room.$header).attr('data-jid', ''); // cleanup

    $(document).fullScreen(false);

    self.localPlayer = self.room._othersAvElement = null;

    self.room.refreshScrollUI();

    self.room.refreshUI();

    $(window).trigger('resize');
};

CallSession.prototype.renderAudioVideoScreens = function() {
    var self = this;

    // mine
    var mineMediaOpts = self.getMediaOptions();

    $('.my-av-screen', self.room.$header).removeClass("hidden");

    if (mineMediaOpts) {
        self.renderSingleAudioVideoScreen(
            $('.my-av-screen', self.room.$header),
            mineMediaOpts,
            'current-user-audio-container',
            'current-user-video-container'

        );
    } else {
        self.room.logger.error("no media opts");
    }

    // others
    $('.others-av-screen', self.room.$header).removeClass("hidden");

    $('.others-av-screen', self.room.$header).each(function() {
        var otherUserJid = $(this).attr('data-jid');

        if (!otherUserJid) {
            // continue;
            return;
        }
        var otherUserMediaOpts = self.getRemoteMediaOptions();

        if (!otherUserMediaOpts) {
            otherUserMediaOpts = {
                video: false,
                audio: false
            };
        }

        self.renderSingleAudioVideoScreen(
            $(this),
            otherUserMediaOpts,
            'audio-call-container',
            'video-call-container'
        );
    });

};

CallSession.prototype.renderSingleAudioVideoScreen = function($screenElement, mediaOpts, audioCssClass, videoCssClass) {
    var self = this;

    assert($screenElement, 'media options missing');
    assert(mediaOpts, 'media options missing');

    if (!mediaOpts.video) {
        $screenElement
            .addClass(audioCssClass)
            .removeClass(videoCssClass);

        $('.my-avatar[src], .other-avatar[src]', $screenElement).show();
        $('.video-only', $screenElement).hide();
        $('video', $screenElement).hide();

        if (videoCssClass === 'current-user-video-container') {
            if ($('.my-avatar', $screenElement).attr('src') !== '') {
                $('.my-avatar', $screenElement).show();
                $('.my-avatar-text', $screenElement).hide();
            } else {
                $('.my-avatar', $screenElement).hide();
                $('.my-avatar-text', $screenElement).show();
            }
        } else {
            if ($('.other-avatar', $screenElement).attr('src') !== '') {
                $('.other-avatar', $screenElement).show();
                $('.other-avatar-text', $screenElement).hide();
            } else {
                $('.other-avatar', $screenElement).hide();
                $('.other-avatar-text', $screenElement).show();
            }
        }

        if ($('.video-full-container').is(":visible")) {
            if (videoCssClass === 'current-user-video-container') {
                // my video screen
                $('.video-full-canvas-block.current-user').addClass("video-off");
            } else {
                $('.video-full-canvas-block.other-user').addClass("video-off");
            }
        }
    } else {
        $screenElement
            .removeClass(audioCssClass)
            .addClass(videoCssClass);

        $('.my-avatar, .my-avatar-text, .other-avatar, .other-avatar-text', $screenElement).hide();
        $('.video-only', $screenElement).show();
        $('video', $screenElement).show();

        if ($('.video-full-container').is(":visible")) {
            if (videoCssClass === 'current-user-video-container') {
                // my video screen
                $('.video-full-canvas-block.current-user video').css('display', '');
                $('.video-full-canvas-block.current-user').removeClass("video-off");
            } else {
                $('.video-full-canvas-block.other-user video').css('display', '');
                $('.video-full-canvas-block.other-user').removeClass("video-off");
            }
        }
    }
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
            self.logger.error("No rtc support: ", e);
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

        var resp = megaChat.openChat(chatJids, "private");

        resp[2].done(function(roomJid, room) {
            room.trigger(e, eventData);
        });
    } else {
        var room = megaChat.getCurrentRoom();

        self.logger.warn("Routing RTC event to current room: ", room, e, eventData);

        // local-stream-obtained = most likely this is the currently active window/room
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

    megaChat.unbind("onRoomDestroy.callManager");
    megaChat.bind("onRoomDestroy.callManager", function(e, chatRoom) {
        assert(chatRoom.type, 'missing room type');

        self._detachFromChatRoom(megaChat, chatRoom);
    });
    
    megaChat.unbind("onRoomCreated.chatStore");
    megaChat.bind("onRoomCreated.chatStore", function(e, chatRoom) {
        assert(chatRoom.type, 'missing room type');

        self._attachToChatRoom(megaChat, chatRoom);
    });
};


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
        session.setState(CallSession.STATE.STARTED);
        self.trigger('RemoteStreamReceived', [session, eventData]);
        self.trigger('CallStarted', [session, eventData]);
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

        // wtf?
        var reason = eventData.reason ?
                            eventData.reason : (
                                                    eventData.info && eventData.info.reason ?
                                                                eventData.info.reason : undefined
                                                );

        if (reason === 'answer-timeout') {
            session.setState(CallSession.STATE.MISSED);
            self.trigger('CallMissed', [session, eventData]);
        } else if (reason === 'handled-elsewhere') {
            session.setState(CallSession.STATE.HANDLED_ELSEWHERE);
            self.trigger('CallHandledElsewhere', [session, eventData]);
        } else if (reason === 'caller') {
            session.setState(CallSession.STATE.MISSED);
            self.trigger('CallMissed', [session, eventData]);
        } else {
            assert(false, 'unknown call-canceled:eventData.info.reason found: ', reason);
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

        var reason = eventData.reason ? eventData.reason : (eventData.info && eventData.info.reason ? eventData.info.reason : undefined);var reason = eventData.reason ?
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
            } else {
                session.setState(CallSession.STATE.REJECTED);
                self.trigger('CallRejected', [session, reason]);
            }
        } else if (reason === 'busy' || reason === 'hangup' || reason === 'peer-hangup') {
            session.setState(CallSession.STATE.REJECTED);
            self.trigger('CallRejected', [session, reason]);
        } else if (reason === 'peer-disconnected' || reason === 'ice-disconnect' || reason.indexOf('error') > -1) {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        } else if (reason === 'security') {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        } else if (reason === 'failed') {
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        } else if (reason === 'initiate-timeout') { // "timed out, while waiting for the caller to join the call"
            session.setState(CallSession.STATE.FAILED);
            self.trigger('CallFailed', [session, reason, eventData.text]);
        } else {
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

        var msg = "Could not start call.";

        if (eventData.error === "PermissionDeniedError" || eventData === "PermissionDeniedError") {
            msg = "You may have forbidden camera access for that site previously " +
            "- in this case any subsequent camera requests fail silently. You can " +
            "check the camera icon next to the address bar, or in the site" +
            " permissions settings.";

            session.endCall('failed');
        } else if (eventData.error === "DevicesNotFoundError") {
            msg = "You may have forbidden camera access for that site previously - " +
            "in this case any subsequent camera requests fail silently. You can check" +
            " the camera icon next to the address bar, or in the site permissions " +
            "settings.";

            session.endCall('failed');
        }

        if (!eventData.continue && chatRoom.callSession) {
            session.endCall('failed');
        }



        chatRoom.appendDomMessage(
            chatRoom.generateInlineDialog(
                "canceled-call-" + unixtime(),
                session.getPeer(),
                "call-canceled",
                msg,
                []
            )
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

    // TODO: Hangup?
};


CallManager.prototype.getOrCreateSessionFromEventData = function(eventName, eventData, chatRoom) {
    var self = this;
    var sid;
    var callSession;

    if (eventData.sid) {
        sid = eventData.sid;
    } else if (eventData.sess && eventData.sess._sess && eventData.sess._sess.sid) {
        sid = eventData.sess._sess.sid;
    } else if (eventData.info && eventData.info.sid) {
        sid = eventData.info.sid;
    } else {
        // handle the eventData{player: .., id: ...} use case for local-stream-* and remove stream etc
        if (chatRoom.callSession) {
            sid = chatRoom.callSession.sid;
        }
    }

    // the only allowed case, when the sid can not be found and the code should continue its execution is when the
    // local-stream-connect || local-player-remove is triggered, in that case, the active session is the one for the
    // currently active/visible
    // room
    // ---
    // this is a local-stream-connect OR
    // local-player-remove
    if (eventData.player && $(eventData.player).is(".localViewport") === true) {
        if (!chatRoom.callSession) {
            return;
        }

        if (eventName === "local-stream-connect") {
            assert(
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

    assert(sid, 'no sid found in: ', eventData);


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

                    var resp = megaChat.openChat(chatJids, "private");

                    chatRoom = resp[1];
                }
            }

            assert(chatRoom, 'chatRoom not found for session with evData: ', eventData);
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
    assert(participants.length > 0, "No participants.");

    if (!chatRoom.megaChat.rtc) {
        msgDialog('warninga', 'Error', 'Your browser does not have the required audio/video capabilities for making calls.');
        return;
    }
    if (chatRoom._conv_ended === true) {
        chatRoom._restartConversation();
    }

    if (chatRoom.callSession && (chatRoom.callSession.isStarted() || chatRoom.callSession.isStarting())) {
        chatRoom.callSession.endCall();
    }

    var $promise = chatRoom._retrieveTurnServerFromLoadBalancer();

    $promise.always(function() {
        var req = chatRoom.megaChat.rtc.startMediaCall(participants[0], mediaOptions);
        session = self.callSessions[req.sid] = new CallSession(chatRoom, req.sid);

        session.setState(CallSession.STATE.WAITING_RESPONSE_OUTGOING);

        chatRoom.trigger('onOutgoingCall', [req, mediaOptions, session]);


        self.trigger('WaitingResponseOutgoing', [session, req]);
        $masterPromise.resolve(session);

    });



    $('.btn-chat-cancel-active-call', chatRoom.$header).bind('click.megaChat', function() {
        if (chatRoom.callSession) {
            if (chatRoom.callSession.isStarted() || chatRoom.callSession.isStarting()) {
                chatRoom.callSession.endCall();
            }
        }
    });


    chatRoom._resetCallStateInCall();

    // Substitute email into language string
    var callingString = l[5891].replace('[X]', chatRoom.megaChat.getContactNameFromJid(participants[0]));

    chatRoom.appendDomMessage(
        chatRoom.generateInlineDialog(
            "outgoing-call",
            participants[0],
            "outgoing-call",
            callingString,
            [], {
                'reject': {
                    'type': 'secondary',
                    'text': l[1686],
                    'callback': function() {
                        if (session) { session.endCall(); }
                    }
                }
            }
        )
    );

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

        assert(
            session instanceof CallSession,
            'CallManager tried to relay event to a non-session argument: ' + typeof(session)
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
