// jscs:disable validateIndentation
(function(scope) {
'use strict';

/**
 * Manages RTC <-> MegChat logic and mapping to UI
 *
 * @param megaChat
 * @returns {CallManager}
 * @constructor
 */
var CallManager = function (megaChat) {
    var self = this;

    if (anonymouschat) {
        return;
    }


    self.logger = MegaLogger.getLogger("callManager", {}, megaChat.logger);

    self.megaChat = megaChat;

    self.incomingCallDialog = new mega.ui.chat.IncomingCallDialog();

    self._calls = [];

    self.incomingRequestJingleSessions = {};
    self.outgoingRequestJingleSessions = {};
    self.callEndedJingleSessions = {};

    megaChat.rebind("onInit.callManager", function() {
        try {
            megaChat.rtcGlobalEventHandler = new RtcGlobalEventHandler(megaChat);
            megaChat.rtc = new RtcModule(
                megaChat.plugins.chatdIntegration.chatd,
                RtcGlobalEventHandler.CRYPTO_HELPERS,
                megaChat.rtcGlobalEventHandler,
                megaChat.options.rtc.iceServers
            );

            self._attachToChat(megaChat);
        }
        catch (exc) {
            // no RTC support.
            if (exc instanceof RtcModule.NotSupportedError) {
                self.logger.warn("This browser does not support webRTC");
            } else {
                self.logger.error("Error initializing webRTC support:", exc);
            }
            megaChat.rtcError = exc;
        }
    });

    return self;
};

makeObservable(CallManager);


/**
* Used for the remote call ended reason types
* @type {*}
*/
CallManager.CALL_END_REMOTE_REASON = {
    "CALL_ENDED": 0x01,
    "REJECTED": 0x02,
    "NO_ANSWER": 0x03,
    "FAILED": 0x04,
    "CANCELED": 0x05
};

/**
 * Entry point, for attaching the chat store to a specific `Chat` instance
 *
 * @param megaChat
 */
CallManager.prototype._attachToChat = function (megaChat) {
    megaChat.rtc.statsUrl = "https://stats.karere.mega.nz:1380";

    megaChat.rebind("onRoomDestroy.callManager", function(e, chatRoom) {
        CallManager.assert(chatRoom.type, 'missing room type');
    });

    megaChat.rebind("onRoomInitialized.chatStore", function(e, chatRoom) {
        CallManager.assert(chatRoom.type, 'missing room type');
    });
};

CallManager._proxyCallTo = function (prototype, listName, fnName, subpropName) {
    prototype[fnName] = function () {
        var args = toArray.apply(null, arguments);
        var targetObj = args.shift();
        if (targetObj instanceof jQuery.Event) {
            // if called via local .trigger(...)
            var event = targetObj;
            targetObj = args.shift();
            args.unshift(event);
            return targetObj[fnName].apply(targetObj, args);
        }

        var self = this;
        for (var i = 0; i < self[listName].length; i++) {
            if (subpropName) {
                if (self[listName][i][fnName] && self[listName][i][subpropName] === targetObj) {
                    return self[listName][i][fnName].apply(self[listName][i], args);
                }
            }
            else {
                if (self[listName][i][fnName] && self[listName][i] === targetObj) {
                    return self[listName][i].apply(self[listName][i], args);
                }
            }
        }
        if (d) {
            console.warn("Could not find:", fnName, 'on', prototype, 'called with: ', arguments);
        }
    };
};

CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onDestroy', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onRemoteStreamAdded', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onRemoteStreamRemoved', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onRemoteMute', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onLocalMute', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onCallStarted', 'rtcCall');
CallManager._proxyCallTo(CallManager.prototype, '_calls', 'onCallStarting', 'rtcCall');

CallManager.prototype.registerCall = function (chatRoom, rtcCall) {
    var self = this;
    var callManagerCall = new CallManagerCall(chatRoom, rtcCall);
    self._calls.push(callManagerCall);
    return callManagerCall;
};


CallManager.prototype.startCall = function (chatRoom, mediaOptions) {
    var self = this;

    // if (chatRoom.callManagerCall && !chatRoom.callManagerCall.isTerminated()) {
    //     chatRoom.callManagerCall.endCall('other');
    // }

    var $masterPromise = new MegaPromise();

    chatRoom.megaChat.closeChatPopups();

    var participants = chatRoom.getParticipantsExceptMe();
    CallManager.assert(participants.length > 0, "No participants.");

    if (!chatRoom.megaChat.rtc) {
        if (chatRoom.megaChat.rtcError && chatRoom.megaChat.rtcError instanceof RtcModule.NotSupportedError) {
            msgDialog('warninga', 'Error', l[7211]);
        }
        else {
            var errorMsg = chatRoom.megaChat.rtcError ?
                chatRoom.megaChat.rtcError.toString() + "\n" + chatRoom.megaChat.rtcError.stack
                : l[1679];
            msgDialog('warninga', 'Error', l[1657] + ":\n" + errorMsg + "\n" + errorMsg);
        }
        return;
    }

    var $promise = chatRoom._retrieveTurnServerFromLoadBalancer(4000);

    $promise.always(function () {
        var callEventHandler = new RtcCallEventHandler(chatRoom);
        var callObj = chatRoom.megaChat.rtc.startCall(
            chatRoom.chatIdBin,
            Av.fromMediaOptions(mediaOptions),
            callEventHandler
        );
        if (!callObj) {
            // call already starte/dup call.
            $masterPromise.reject();
            return;
        }
        callEventHandler.call = callObj;
        var callManagerCall = self.registerCall(chatRoom, callObj);

        chatRoom._resetCallStateInCall();

        callManagerCall.setState(CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING);

        chatRoom.trigger('onOutgoingCall', [callManagerCall, mediaOptions]);

        chatRoom.appendMessage(
            new ChatDialogMessage({
                messageId: 'outgoing-call-' + callManagerCall.id,
                type: 'outgoing-call',
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                authorContact: M.u[u_handle],
                delay: unixtime(),
                persist: false,
                buttons: {
                    'reject': {
                        'type': 'secondary',
                        'classes': 'default-white-button small-text left red',
                        'text': l[1686],
                        'callback': function () {
                            if (callManagerCall) {
                                callManagerCall.endCall('caller');
                            }
                        }
                    }
                }
            })
        );


        self.trigger('WaitingResponseOutgoing', [callManagerCall, mediaOptions]);
        $masterPromise.resolve(callManagerCall);

    });

    return $masterPromise;
};

CallManager.prototype.joinCall = function (chatRoom, mediaOptions) {
    var self = this;

    // if (chatRoom.callManagerCall && !chatRoom.callManagerCall.isTerminated()) {
    //     chatRoom.callManagerCall.endCall('other');
    // }

    var $masterPromise = new MegaPromise();

    chatRoom.megaChat.closeChatPopups();

    var participants = chatRoom.getParticipantsExceptMe();
    CallManager.assert(participants.length > 0, "No participants.");

    if (!chatRoom.megaChat.rtc) {
        if (chatRoom.megaChat.rtcError && chatRoom.megaChat.rtcError instanceof RtcModule.NotSupportedError) {
            msgDialog('warninga', 'Error', l[7211]);
        }
        else {
            var errorMsg = chatRoom.megaChat.rtcError ?
                chatRoom.megaChat.rtcError.toString() + "\n" + chatRoom.megaChat.rtcError.stack
                : l[1679];
            msgDialog('warninga', 'Error', l[1657] + ":\n" + errorMsg + "\n" + errorMsg);
        }
        return;
    }

    var $promise = chatRoom._retrieveTurnServerFromLoadBalancer(4000);

    $promise.always(function () {
        var callEventHandler = new RtcCallEventHandler(chatRoom);
        var callObj = chatRoom.megaChat.rtc.joinCall(
            chatRoom.chatIdBin,
            Av.fromMediaOptions(mediaOptions),
            callEventHandler
        );
        if (!callObj) {
            // call already starte/dup call.
            $masterPromise.reject();
            return;
        }
        callEventHandler.call = callObj;
        var callManagerCall = self.registerCall(chatRoom, callObj);

        chatRoom._resetCallStateInCall();

        callManagerCall.setState(CallManagerCall.STATE.STARTING);

        chatRoom.trigger('onCallStarting', [callManagerCall, mediaOptions]);

        self.trigger('CallStarting', [callManagerCall, mediaOptions]);
        $masterPromise.resolve(callManagerCall);

    });

    return $masterPromise;
};


(function () { // used to make the _origTrigger a private var.
    var _origTrigger = CallManager.prototype.trigger;
    CallManager.prototype.trigger = function (evtName, args) {
        var self = this;
        var callManagerCall = args;
        if ($.isArray(callManagerCall)) { // jquery allows .trigger to be called in 2 different ways...
            callManagerCall = callManagerCall[0];
        }

        if (!callManagerCall) {
            return;
        }

        CallManager.assert(
            callManagerCall instanceof CallManagerCall,
            'CallManager tried to relay event to a non-callManagerCall argument:', typeof callManagerCall
        );

        if (typeof callManagerCall["on" + evtName] !== 'undefined') { // proxy events to callManagerCalls
            var eventObject = new jQuery.Event(evtName);
            var proxyArgs = args.slice(1);
            proxyArgs = [eventObject, proxyArgs];

            // pass the arguments, except the callManagerCall and eventName
            callManagerCall.trigger.apply(callManagerCall, proxyArgs);

            self.logger.debug("Will trigger event: ", "on" + evtName/*, proxyArgs*/);

            // event handlers can stop the event propagation CallManagerCall -> CallManager
            if (eventObject.isPropagationStopped()) {
                return self; // replicate jQuery's call chains
            }
        } else {
            self.logger.error("Event not found on callManagerCall obj: ", "on" + evtName);
        }
        _origTrigger.apply(self, arguments);
    };
})();


/**
 * Helpers
 */
CallManager.prototype.forEachCallManagerCall = function (cb) {
    var self = this;
    return Object.keys(self._calls).forEach(function (idx) {
        return cb(self._calls[idx], idx);
    });
};

/**
 * Private method for handling multi string text contents for messages in private rooms
 * @param message {Message}
 * @param otherContactsName {Array}
 * @param contact {Object}
 * @param textMessage {String}
 * @returns {String}
 * @private
 */
CallManager._getMultiStringTextContentsForMessagePrivate = function(message, otherContactsName, contact, textMessage) {
    var tmpMsg = "";
    if (!$.isArray(textMessage[0])) {
        tmpMsg = textMessage[0].replace("[X]", "%s");
        tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
    }
    else {
        if (contact.u === u_handle) {
            tmpMsg = textMessage[0][0].replace("[X]", otherContactsName[0] || "");
        }
        else {
            tmpMsg = textMessage[0][1].replace("[X]", "%s");
            tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
        }
    }

    // append duration, if available in the meta
    if (
        message.meta && message.meta.duration &&
        (
            message.type === "call-ended" ||
            message.dialogType === "remoteCallEnded" ||
            message.type === "call-failed"
        )
    ) {
        tmpMsg += " " + l[7208].replace("[X]", "[[" + secToDuration(message.meta.duration) + "]]");
    }
    return tmpMsg;
};

/**
 * Private method for handling multi string text contents for messages in group rooms
 * @param message {Message}
 * @param otherContactsName {Array}
 * @param textMessage {String}
 * @param contactName {String}
 * @param contact {Object}
 * @returns {String}
 * @private
 */
CallManager._getMultiStringTextContentsForMessageGroup = function(
    message,
    otherContactsName,
    textMessage,
    contactName,
    contact
) {
    var tmpMsg = "";
    if (message.type === "call-handled-elsewhere") {
        otherContactsName = [contactName];
    }
    if (message.type === "incoming-call") {
        tmpMsg = textMessage[0].replace("%s", contactName);
    }
    else if (message.type === "call-started") {
        tmpMsg = textMessage[0].replace("%s", contactName);
    }
    else if (!$.isArray(textMessage[0])) {
        tmpMsg = textMessage[0].replace("[X]", "%s");
        tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
    }
    else {
        if (contact.u === u_handle) {
            tmpMsg = mega.utils.trans.listToString(otherContactsName, textMessage[0][0]);
        }
        else {
            tmpMsg = mega.utils.trans.listToString(otherContactsName, textMessage[0][1]);
        }
    }
    return tmpMsg;
};

/**
 * To be used internally by Message._getTextContentsForDialogType
 * @param message {Message|ChatDialogMessage}
 * @param textMessage {String}
 * @param [html] {boolean} pass true to return (eventually) HTML formatted messages
 * @param [participants] {Array} optional list of handles to use for this message
 */
CallManager._getMultiStringTextContentsForMessage = function(message, textMessage, html, participants) {
    var tmpMsg;
    var contact = Message.getContactForMessage(message);
    var contactName = "";
    if (contact) {
        contactName = htmlentities(M.getNameByHandle(contact.u));
    }

    if (!participants && message.meta && message.meta.participants && message.meta.participants.length > 0) {
        participants = message.meta.participants;
    }

    var otherContactsName = [];
    if (message.chatRoom) {
        (participants || message.chatRoom.getParticipantsExceptMe()).forEach(function(handle) {
            if (handle !== u_handle) {
                var name = htmlentities(M.getNameByHandle(handle));
                if (name) {
                    otherContactsName.push(name);
                }
            }
        });
        if (!otherContactsName || otherContactsName.length === 0) {
            if (participants) {
                message.chatRoom.getParticipantsExceptMe().forEach(function(handle) {
                    if (handle !== u_handle) {
                        var name = htmlentities(M.getNameByHandle(handle));
                        if (name) {
                            otherContactsName.push(name);
                        }
                    }
                });
            }
            if (!otherContactsName || otherContactsName.length === 0) {
                // this should never happen, but in case it does... e.g. a room where I'm the only one left, but had
                // a call recorded with no participants passed in the meta
                otherContactsName.push(l[7381]);
            }
        }
    }


    if (message.chatRoom.type === "private") {
        tmpMsg = CallManager._getMultiStringTextContentsForMessagePrivate(
            message,
            otherContactsName,
            contact,
            textMessage
        );
    }
    else {
        tmpMsg = CallManager._getMultiStringTextContentsForMessageGroup(
            message,
            otherContactsName,
            textMessage,
            contactName,
            contact
        );
    }

    textMessage = tmpMsg;

    textMessage = textMessage
        .replace("[[", " ")
        .replace("]]", "");

    return textMessage;
};

CallManager.prototype.remoteStartedCallToDialogMsg = function(chatRoom, msgInstance) {
    var result = false;
    var meta = msgInstance.meta;
    var authorContact = M.u[meta.userId];
    var delay = msgInstance.delay;
    var msgId;
    var type;
    var cssClasses = [];
    var currentCallCounter;

    msgId = 'call-started-' + msgInstance.messageId;
    type = "call-started";
    cssClasses = ['fm-chat-call-started'];
    currentCallCounter = meta.duration;

    result = new ChatDialogMessage({
        messageId: msgId,
        type: type,
        showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
        authorContact: authorContact,
        delay: delay,
        cssClasses: cssClasses,
        currentCallCounter: currentCallCounter,
        meta: meta
    });

    return result;
};

CallManager.prototype.remoteEndCallToDialogMsg = function(chatRoom, msgInstance) {
    var self = this;

    var result = false;
    var meta = msgInstance.meta;
    var authorContact = M.u[meta.userId];
    var delay = msgInstance.delay;
    if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CALL_ENDED) {
        var msgId;
        var type;
        var cssClasses = [];
        var currentCallCounter;
        if (meta.duration && meta.duration > 0) {
            msgId = 'call-ended-' + msgInstance.messageId;
            type = "call-ended";
            cssClasses = ['fm-chat-call-reason-' + meta.reason];
            currentCallCounter = meta.duration;
        }
        else {
            msgId = 'call-failed-' + msgInstance.messageId;
            type = 'call-failed';
        }

        result = new ChatDialogMessage({
            messageId: msgId,
            type: type,
            authorContact: authorContact,
            showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
            delay: delay,
            cssClasses: cssClasses,
            currentCallCounter: currentCallCounter,
            meta: meta
        });
    }
    else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.REJECTED) {
        result = new ChatDialogMessage({
            messageId: 'call-rejected-' + msgInstance.messageId,
            type: 'call-rejected',
            authorContact: authorContact,
            showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
            delay: delay,
            meta: meta
        });
    }
    else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CANCELED) {
        if (authorContact && authorContact.u === u_handle) {
            result = new ChatDialogMessage({
                messageId: 'call-canceled-' + msgInstance.messageId,
                type: 'call-canceled',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
        else {
            result = new ChatDialogMessage({
                messageId: 'call-missed-' + msgInstance.messageId,
                type: 'call-missed',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
    }
    else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && authorContact.u !== u_handle) {
        result = new ChatDialogMessage({
            messageId: 'call-missed-' + msgInstance.messageId,
            type: 'call-missed',
            authorContact: authorContact,
            showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
            delay: delay,
            meta: meta
        });
    }
    else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && authorContact.u === u_handle) {
        result = new ChatDialogMessage({
            messageId: 'call-timeout-' + msgInstance.messageId,
            type: 'call-timeout',
            authorContact: authorContact,
            showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
            delay: delay,
            meta: meta
        });
    }
    else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.FAILED) {
        if (meta.duration >= 5) {
            result = new ChatDialogMessage({
                messageId: 'call-ended-' + msgInstance.messageId,
                type: 'call-ended',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
        else {
            result = new ChatDialogMessage({
                messageId: 'call-failed-' + msgInstance.messageId,
                type: 'call-failed',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
    }
    else {
        self.logger.error("Unknown (remote) CALL_ENDED reason: ", meta.reason, meta);
    }

    return result;
};

CallManager.assert = function (cond) {
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

    // log error to call stat server
    megaChat.rtc.logger.error("CallManager assertion failed: " + msg + "\nStack:\n" + stack);

    assert(false, msg);
};

/**
 * CallManagerCall Manager
 *
 * @param chatRoom
 * @param rtcCall
 * @constructor
 */
var CallManagerCall = function (chatRoom, rtcCall) {
    var self = this;
    CallManager.assert(chatRoom, 'missing chatRoom for CallManagerCall');
    CallManager.assert(rtcCall, 'missing rtcCall for CallManagerCall');

    self.rtcCall = rtcCall;
    self.room = chatRoom;
    self._streams = {};
    self.callNotificationsEngine = new CallNotificationsEngine(chatRoom, self);
    self.peerQuality = {};

    Object.defineProperty(this, 'id', {
        get: function () {
            return base64urlencode(self.rtcCall.id);
        },
        enumerable: true,
        configurable: false
    });

    var level = localStorage['webrtcDebug'] === "1" ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;

    var loggerOpts = {
        minLogLevel: function () {
            return level;
        }
    };

    if (localStorage['webrtcDebug'] === "1") {
        loggerOpts['transport'] = function (level, args) {
            var fn = "log";

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
            }
            else if (level === MegaLogger.LEVELS.ERROR) {
                fn = "error";
            }
            else if (level === MegaLogger.LEVELS.CRITICAL) {
                fn = "error";
            }

            args.push("[" + fn + "]");
            console.error.apply(console, args);
        };
    }

    self.logger = MegaLogger.getLogger("callManagerCall[" + self.id + "]", loggerOpts, chatRoom.logger);

    self.state = CallManagerCall.STATE.INITIALISED;

    self.localPlayer = null;
    self.remotePlayer = null;

/*
    if (self.room.callManagerCall) {
        if (self.room.callManagerCall.isStarting() === true) {
            self.logger.debug(
                "Room have a starting session, will terminate and replace with the the newly created session."
            );
            self.room.callManagerCall.endCall();
        } else if (
            self.room.callManagerCall.isNotStarted() === true && self.room.callManagerCall.isTerminated() === false
        ) {
            self.logger.debug(
                "Room have a not started session, will terminate and replace with the the newly created session."
            );
            // self.room.callManagerCall.endCall('other');
        } else if (self.room.callManagerCall.isStarted() === true) {
            self.logger.debug(
                "Room have a started session, will terminate and replace with the the newly created session."
            );
            self.room.callManagerCall.endCall();
        } else if (self.room.callManagerCall.isTerminated() === false) {
            self.logger.error("Room already have an attached started/in progress/waiting session.");
            return;
        }
    }
*/
    self.room.callManagerCall = this;
};

makeObservable(CallManagerCall);


CallManagerCall.STATE = RtcModule.UICallTerm;

// ES5's ugly syntax...in the future we can use ES6 to properly format this code
CallManagerCall.ALLOWED_STATE_TRANSITIONS = {};

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.INITIALISED] =  // ->
    [
        CallManagerCall.STATE.WAITING_RESPONSE_INCOMING,
        CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING,
        CallManagerCall.STATE.STARTING,
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING] =  // ->
    [
        CallManagerCall.STATE.STARTING,
        CallManagerCall.STATE.REJECTED,
        CallManagerCall.STATE.FAILED,
        CallManagerCall.STATE.TIMEOUT,
        CallManagerCall.STATE.ABORTED
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.WAITING_RESPONSE_INCOMING] = // ->
    [
        CallManagerCall.STATE.STARTING,
        CallManagerCall.STATE.FAILED,
        CallManagerCall.STATE.MISSED,
        CallManagerCall.STATE.HANDLED_ELSEWHERE,
        CallManagerCall.STATE.REJECTED
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.STARTING] = // ->
    [
        CallManagerCall.STATE.STARTED,
        CallManagerCall.STATE.FAILED,
        CallManagerCall.STATE.ENDED,
        CallManagerCall.STATE.REJECTED
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.STARTED] = // ->
    [
        CallManagerCall.STATE.FAILED,
        CallManagerCall.STATE.ENDED
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.REJECTED] = // ->
    [
        CallManagerCall.STATE.ENDED
    ];

CallManagerCall.ALLOWED_STATE_TRANSITIONS[CallManagerCall.STATE.ABORTED] = // ->
    [
        CallManagerCall.STATE.ENDED
    ];


CallManagerCall.prototype.isActive = function () {
    return this.state === CallManagerCall.STATE.STARTED || this.state === CallManagerCall.STATE.STARTING;
};

/**
 * UI -> event mapping stuff
 */

CallManagerCall.prototype.onWaitingResponseOutgoing = function () {
    // Unused
};

CallManagerCall.prototype.onWaitingResponseIncoming = function (e, eventData) {
    var self = this;

    // capture the initial requested media options
    var mediaOptions = {audio: true, video: true};
    // var mediaOptions = self.getRemoteMediaOptions();

    var doAnswer = ChatRoom._fnRequireParticipantKeys(function () {
        self.room.activateWindow();
        self.room.show();
        self.getCallManager().incomingCallDialog.hide();


        var $promise = self.room._retrieveTurnServerFromLoadBalancer(4000);

        $promise.always(function () {
            if (!self.rtcCall.answer(Av.fromMediaOptions(mediaOptions))) {
                self.onCallTerminated();
                return;
            }

            self.room.megaChat.trigger('onCallAnswered', [self, eventData]);
            self.getCallManager().trigger('CallAnswered', [self, eventData]);
        });
    }, self.room);

    var doCancel = function () {
        self.getCallManager().incomingCallDialog.hide();

        self.endCall('busy');
    };

    var participants = self.room.getParticipantsExceptMe();

    var contact = M.u[base64urlencode(self.initiator)];

    var dialogMessage = new ChatDialogMessage({
        messageId: 'incoming-call-' + self.id,
        type: 'incoming-call',
        authorContact: contact,
        showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
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

    CallManager.assert(participants[0], "No participants found.");

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
            M.getNameByHandle(contact.u),
            avatar,
            showVideoButton,
            self.id,
            self,
            dialogMessage
        ]);


        self.getCallManager().incomingCallDialog.show(
            contact.name,
            avatar,
            self.id,
            showVideoButton,
            function () {
                mediaOptions.audio = true;
                mediaOptions.video = false;

                doAnswer();
            },
            function () {
                mediaOptions.audio = true;
                mediaOptions.video = true;

                doAnswer();
            },
            function () {
                doCancel();
            },
            self.room.type === "group" || self.room.type === "public"
        );
    }


    if (self.room.type !== "group") {
        // there is now an overlay hint + button for joining a call + the incoming call dialog, no need to show
        // the inline dialog message ...
        self.room.appendMessage(
            dialogMessage
        );
    }
};

CallManagerCall.prototype._removeTempMessages = function () {
    var self = this;

    var toBeRemovedTypes = [
        'call-initialising',
        'call-starting',
        'incoming-call',
        'outgoing-call',
    ];

    self.room.messagesBuff.removeMessageBy(function (v) {
        if (toBeRemovedTypes.indexOf(v.type) >= 0 && v.messageId === v.type + "-" + self.id) {
            return true;
        }
    });

    self.room.messagesBuff.removeMessageByType("call-initialising-" + self.id);
    self.room.messagesBuff.removeMessageByType("incoming-call-" + self.id);
    self.room.messagesBuff.removeMessageByType("outgoing-call-" + self.id);
    self.room.messagesBuff.removeMessageByType("call-starting-" + self.id);
};
CallManagerCall.prototype.onCallStarting = function () {
    var self = this;

    self.setState(CallManagerCall.STATE.STARTING);

    if (
        self.room.megaChat.plugins.callManager.incomingCallDialog &&
        self.room.megaChat.plugins.callManager.incomingCallDialog.sid === self.id
    ) {
        self.room.megaChat.plugins.callManager.incomingCallDialog.destroy();
    }

    self._removeTempMessages();

    self.room.appendMessage(
        new ChatDialogMessage({
            showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
            messageId: 'call-starting-' + self.id,
            type: 'call-starting',
            authorContact: self.getPeer(),
            delay: unixtime(),
            persist: false
        })
    );

};

CallManagerCall.prototype.onCallAnswered = function () {
    var self = this;

    self._removeTempMessages();

    self.room.appendMessage(
        new ChatDialogMessage({
            showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
            messageId: 'call-initialising-' + self.id,
            type: 'call-initialising',
            authorContact: self.getPeer(),
            delay: unixtime(),
            persist: false
        })
    );

};

CallManagerCall.prototype._renderInCallUI = function () {
    var self = this;

    if (self.state === CallManagerCall.STATE.STARTING) {
        // onRemoteStreamAdded may trigger this. Skip if call haven't really started.
        return;
    }
    if (self.room._currentCallTimer) {
        clearInterval(self.room._currentCallTimer);
    }
    self.room._currentCallTimer = setInterval(function () {
        var tsCallStart = self._tsCallStart;
        var elapsed = tsCallStart ? Math.round((Date.now() - self._tsCallStart) / 1000) : 0;
        $('.call-counter[data-room-id="' + self.room.chatId + '"]').text(
            secondsToTimeShort(elapsed)
        );
        $('.call-header-duration[data-room-id="' + self.room.chatId + '"]').text(
            secondsToTimeShort(elapsed)
        );
    }, 1000);

    self.renderCallStartedState();
    this.room.trackDataChange();
};

CallManagerCall.prototype.onCallStarted = function (tsCallStart) {
    var self = this;
    self._tsCallStart = tsCallStart;
    var currCall = self.room.callManagerCall;
    if (currCall && currCall !== self && currCall.isStarted()) {
        currCall.endCall('busy');
    }

    if (currCall && currCall !== self) {
        delete self.room.callManagerCall;
        self.room.callManagerCall = self;
    }

    self.setState(CallManagerCall.STATE.STARTED);
    self._renderInCallUI();


    var megaChat = self.room.megaChat;
    var presencedInt = megaChat.plugins.presencedIntegration;
    if (presencedInt.getAutoaway() === true && presencedInt.getMyPresence() !== UserPresence.PRESENCE.OFFLINE) {
        self._presencedActivityInterval = setInterval(function() {
            if (presencedInt.getAutoaway() === true && presencedInt.getMyPresence() !== UserPresence.PRESENCE.OFFLINE) {
                presencedInt.userPresence.ui_signalactivity();
            }
        }, 5000);
    }


    if (self.room.type !== "group") {
        self.room.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-started-' + self.id,
                type: 'call-started',
                authorContact: self.getPeer(),
                showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
                delay: unixtime(),
                persist: false
            })
        );
    }

    self.renderCallStartedState();
};

CallManagerCall.prototype.onCallEnded = function (e, reason) {
    var self = this;

    if (Date.now() === self._tsCallStart) {
        self.room.appendMessage(
            new ChatDialogMessage({
                messageId: 'call-failed-' + self.id,
                type: 'call-failed',
                authorContact: self.getPeer(),
                showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
                delay: unixtime(),
                persist: false
            })
        );
    }
    self.room.trigger('call-ended', self);
    self.room.trigger('CallTerminated', [e, self.room]);
};

CallManagerCall.prototype.onCallRejected = function (e, reason) {
    var self = this;
    if (reason === Term.kErrAlready) {
        self.room.appendMessage(
            new ChatDialogMessage({
                showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
                messageId: 'call-rejected-' + self.id,
                type: 'call-rejected',
                authorContact: self.getPeer(),
                delay: unixtime(),
                persist: false
            })
        );
    }
};

CallManagerCall.prototype.onCallAborted = function (e, reason) {
};

CallManagerCall.prototype.onCallHandledElsewhere = function (e) {
    var self = this;

    var peer = self.getPeer();

    self.room.appendMessage(
        new ChatDialogMessage({
            showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
            messageId: 'call-handled-elsewhere-' + self.id,
            type: 'call-handled-elsewhere',
            authorContact: peer,
            delay: unixtime(),
            persist: false
        })
    );
};

CallManagerCall.prototype.onCallFailed = function (e, reason) {
    var self = this;

    var peer;
    if (self.room.type === "private") {
        peer = M.u[self.room.getParticipantsExceptMe()[0]];
    }
    else {
        peer = self.getPeer();
    }

    var msgConstInfo = {
        messageId: 'call-failed-' + self.id,
        type: 'call-failed',
        authorContact: peer,
        showInitiatorAvatar: self.room.type === "group" || self.room.type === "public",
        delay: unixtime(),
        persist: false
    };

    if (reason === Term.kErrNetSignalling && this._tsCallStart) {
        msgConstInfo['meta'] = {'duration': (Date.now() - this._tsCallStart) / 1000};
        msgConstInfo['messageId'] = 'call-ended-' + self.id;
        msgConstInfo['type'] = 'call-ended';
        msgConstInfo['isLocallyGenerated'] = true;
    }

    self.room.appendMessage(
        new ChatDialogMessage(msgConstInfo)
    );

    self.room.trigger('CallTerminated', [e, self.room]);
};

CallManagerCall.prototype.onCallMissed = function (e) {
};

CallManagerCall.prototype.onCallTimeout = function (e) {
};

/**
 * Called when the call was missed, failed, rejected or simply ended
 */
CallManagerCall.prototype.onCallTerminated = function () {
    var self = this;

    if (self.getCallManager().incomingCallDialog.id === self.id) {
        self.getCallManager().incomingCallDialog.hide();

        self._removeTempMessages();
    }
    self.room.messagesBuff.removeMessageByType("call-started");
    self.room.messagesBuff.removeMessageByType("call-starting");
    self.room.messagesBuff.removeMessageByType("call-initialising");

    if (self.room.callManagerCall === self) {
        delete self.room.callManagerCall;
    }

    if ($(document).fullScreen() && self.room.isCurrentlyActive) {
        $(document).fullScreen(false);
    }


    self.renderCallEndedState();

    self.room.trackDataChange();
    setTimeout(function() {
        // force re-render in case no "remote call ended" is received.
        self.room.trackDataChange();
    }, 1000);
};

CallManagerCall.prototype.onDestroy = function (terminationCode, peerTerminates) {
    var self = this;
    // TODO: @lp: Execute onRemoteStreamRemoved() just in case it wasn't called by the rtcModule before session destroy
    var isIncoming = self.rtcCall.isJoiner;
    var state = self.rtcCall.termCodeToUIState(terminationCode);
    self.setState(state);
    var callMgr = self.getCallManager();
    switch (state) {
        case CallManagerCall.STATE.REJECTED:
            callMgr.trigger('CallRejected', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.ABORTED:
            callMgr.trigger('CallAborted', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.MISSED:
            callMgr.trigger('CallMissed', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.ENDED:
            callMgr.trigger('CallEnded', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.FAILED:
            callMgr.trigger('CallFailed', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.HANDLED_ELSEWHERE:
            callMgr.trigger('CallHandledElsewhere', [self, terminationCode]);
            break;
        case CallManagerCall.STATE.TIMEOUT:
            callMgr.trigger('CallTimeout', [self, terminationCode]);
            break;
        default:
            self.logger.warn("onDestroy: Unknown UI call termination state",
                constStateToText(CallManagerCall.STATE, state),
                " for termcode ", RtcModule.getTermCodeName(terminationCode));
            break;
    }
    self.onCallTerminated();
};

CallManagerCall.prototype.onRemoteStreamAdded = function (rtcSessionEventHandler, stream) {
    var peerId = base64urlencode(rtcSessionEventHandler.rtcCallSession.peer);
    var clientId = base64urlencode(rtcSessionEventHandler.rtcCallSession.peerClient);
    var sid = base64urlencode(rtcSessionEventHandler.rtcCallSession.sid);
    this._streams[peerId + ":" + clientId + ":" + sid] = stream;
    this._renderInCallUI();
};
CallManagerCall.prototype.onRemoteStreamRemoved = function (rtcSessionEventHandler) {
    var peerId = base64urlencode(rtcSessionEventHandler.rtcCallSession.peer);
    var clientId = base64urlencode(rtcSessionEventHandler.rtcCallSession.peerClient);
    var sid = base64urlencode(rtcSessionEventHandler.rtcCallSession.sid);
    var idx = peerId + ":" + clientId + ":" + sid;
    if (this._streams[idx]) {
        delete this._streams[idx];
    }

    this.room.trackDataChange();
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
CallManagerCall.prototype.onStateChanged = function (e, session, oldState, newState) {
    this.room.callParticipantsUpdated();
    this.room.trackDataChange();
};

/**
 * End/cancel/reject a call.
 *
 * @param [reason] {String}
 * @returns {*}
 */
CallManagerCall.prototype.endCall = function (reason) {
    var self = this;

    if (
        self.isStarting() ||
        self.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING ||
        self.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING
    ) {

        if (reason === 'failed') {
            return self.rtcCall.hangup(Term.kErrorLast);
        }
        else if (reason === 'busy') {
            return self.rtcCall.hangup();
        }
        else if (reason === 'caller') {
            return self.rtcCall.hangup(Term.kReqCancel);
        }
        else if (reason === 'other') {
            if (self.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING) {
                return self.rtcCall.hangup(Term.kReqCancel);
            }
            else if (self.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING) {
                return self.rtcCall.hangup();
            }
        }
        else if (!reason && self.isStarting()) {
            return self.rtcCall.hangup();
        }
        self.logger.warn("(non started call) Convert to Term.k* type of hangup reason: ", reason);
    } else if (self.isStarted()) {
        return self.rtcCall.hangup(Term.kUserHangup);
    } else {
        return false;
    }
};

CallManagerCall.prototype.onRemoteMute = function () {
    var self = this;
    self.room.trackDataChange();
};

CallManagerCall.prototype.onLocalMute = function () {
    var self = this;
    self.room.trackDataChange();
};

CallManagerCall.prototype.muteAudio = function () {
    var self = this;

    var mediaOpts = self.getMediaOptions();
    mediaOpts.audio = false;

    self.rtcCall.muteUnmute(Av.fromMediaOptions(mediaOpts));

    self.getCallManager().trigger('LocalMute', [self]);
};
CallManagerCall.prototype.unmuteAudio = function () {
    var self = this;

    var mediaOpts = self.getMediaOptions();
    mediaOpts.audio = true;

    self.rtcCall.muteUnmute(Av.fromMediaOptions(mediaOpts));

    self.getCallManager().trigger('LocalMute', [self]);
};
CallManagerCall.prototype.muteVideo = function () {
    var self = this;

    var mediaOpts = self.getMediaOptions();
    mediaOpts.video = false;

    self.rtcCall.muteUnmute(Av.fromMediaOptions(mediaOpts));

    self.getCallManager().trigger('LocalMute', [self]);
};
CallManagerCall.prototype.unmuteVideo = function () {
    var self = this;

    var mediaOpts = self.getMediaOptions();
    mediaOpts.video = true;

    self.rtcCall.muteUnmute(Av.fromMediaOptions(mediaOpts));

    self.getCallManager().trigger('LocalMute', [self]);
};

CallManagerCall.prototype.setState = function (newState) {
    var oldState = this.state;

    if (oldState === newState) {
        return false;
    }

    assertStateChange(
        oldState,
        newState,
        CallManagerCall.ALLOWED_STATE_TRANSITIONS,
        CallManagerCall.STATE
    );

    this.state = newState;

    if (d) { /* performance, save some loops/closures creation CPU/memory */
        this.logger.debug(
            "State changed: ",
            constStateToText(CallManagerCall.STATE, oldState),
            ' -> ',
            constStateToText(CallManagerCall.STATE, newState)
        );
    }

    this.getCallManager().trigger('StateChanged', [this, this, oldState, newState]);
};


CallManagerCall.prototype.getStateAsText = function () {
    return constStateToText(CallManagerCall.STATE, this.state);
};

CallManagerCall.prototype.isTerminated = function () {
    return this.state === CallManagerCall.STATE.ENDED ||
        this.state === CallManagerCall.STATE.HANDLED_ELSEWHERE ||
        this.state === CallManagerCall.STATE.REJECTED ||
        this.state === CallManagerCall.STATE.FAILED ||
        this.state === CallManagerCall.STATE.MISSED ||
        this.state === CallManagerCall.STATE.TIMEOUT;
};


CallManagerCall.prototype.isStarting = function () {
    return this.state === CallManagerCall.STATE.STARTING;
};
CallManagerCall.prototype.isStarted = function () {
    return this.state === CallManagerCall.STATE.STARTED;
};

CallManagerCall.prototype.isNotStarted = function () {
    return this.state !== CallManagerCall.STATE.STARTED &&
        (
            this.state === CallManagerCall.STATE.INITIALISED ||
            this.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING ||
            this.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING
        );
};

CallManagerCall.prototype.getCallManager = function () {
    var self = this;
    return self.room.megaChat.plugins.callManager;
};

CallManagerCall.prototype.getPeer = function () {
    if (this.rtcCall.callerInfo) {
        if (!M.u[base64urlencode(this.rtcCall.callerInfo.fromUser)]) {
            self.logger.error("this should never happen.");
            return M.u[u_handle];
        }
        return M.u[base64urlencode(this.rtcCall.callerInfo.fromUser)];
    }
    else if ((this.room.type === "group" || this.room.type === "public") && this.initiator) {
        return M.u[base64urlencode(this.initiator)];
    }
    else if (this.room.type === "private") {
        var peer = this.room.getParticipantsExceptMe()[0];
        return peer ? M.u[peer] : false;
    }
    else {
        return M.u[u_handle];
    }
};

CallManagerCall.prototype.getMediaOptions = function () {
    var localAv = this.rtcCall.localAv();
    if (typeof localAv === 'undefined') {
        this.logger.log(".getMediaOptions: rtcCall.localAv() returned undefined");
        return {audio: false, video: false};
    }
    return {audio: !!(localAv & Av.Audio), video: !!(localAv & Av.Video)};// jscs:ignore disallowImplicitTypeConversion
};

CallManagerCall.prototype.getRemoteMediaOptions = function (sessionId) {
    var sessions = this.rtcCall.sessions;
    var firstSession;
    if (sessionId) {
        firstSession = sessions[base64urldecode(sessionId)];
        if (!firstSession) {
            var msg = ".getRemoteMediaOptions could not find session with id:" + sessionId;
            if (!Object.keys(sessions).length) {
                msg += " Call has no sessions";
            }
            this.logger.debug(msg);
            return {audio: false, video: false};
        }
    } else {
        firstSession = sessions[Object.keys(sessions)[0]];
        if (!firstSession) {
            this.logger.debug(".getRemoteMediaOptions: Call has no sessions");
            return {audio: false, video: false};
        }
    }
    if (typeof firstSession.peerAv === 'undefined') {
        this.logger.log(
            ".getRemoteMediaOptions could not find .peerAv for session",
            base64urlencode(firstSession.sid)
        );
        return {audio: false, video: false};
    }

    // jscs:disable disallowImplicitTypeConversion
    return {audio: !!(firstSession.peerAv & Av.Audio), video: !!(firstSession.peerAv & Av.Video)};
    // jscs:enable disallowImplicitTypeConversion
};


CallManagerCall.prototype.renderCallStartedState = function () {
    var self = this;

    self.room.megaChat.activeCallManagerCall = self;


    self.room.trackDataChange();
    self._removeTempMessages();
};

CallManagerCall.prototype.renderCallEndedState = function () {
    var self = this;

    self.getCallManager().incomingCallDialog.hide();


    self.room.getNavElement().show();

    if (self.room._currentCallTimer) {
        clearInterval(self.room._currentCallTimer);
    }

    delete megaChat.activeCallManagerCall;

    if (self._presencedActivityInterval) {
        clearInterval(self._presencedActivityInterval);
    }

    self._removeTempMessages();

    self.callNotificationsEngine.destroy();
};

CallManagerCall.prototype.getCurrentVideoSlotsUsed = function() {
    var self = this;
    var videoSessionCount = 0; // megaChat.activeCallManagerCall._streams;
    if (self._streams) {
        Object.keys(self._streams).forEach(function(k) {
            var sid = k.split(":")[2];
            var opts = self.getRemoteMediaOptions(sid);
            if (opts && opts.video) {
                videoSessionCount += 1;
            }
        });

        videoSessionCount += self.getMediaOptions().video === true ? 1 : 0;
    }
    return videoSessionCount;
};

CallManagerCall.prototype.hasVideoSlotLimitReached = function() {
    return this.getCurrentVideoSlotsUsed() >= RtcModule.kMaxCallVideoSenders;
};

CallManagerCall.prototype.destroy = function () {
    // TODO: self destruct + remove self from the CallManager's registers onCallTerminated with some timeout.
};

scope.CallManagerCall = CallManagerCall;
scope.CallManager = CallManager;
})(window);
