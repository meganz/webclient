var utils = require("../utils.jsx");
var React = require("react");
var ConversationPanelUI = require("./ui/conversationpanel.jsx");



/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat {Chat}
 * @param roomJid
 * @param type {String} only "private" is supported for now
 * @param users {Array}
 * @param ctime {Integer} unix time
 * @param [lastActivity] {Integer} unix time
 * @returns {ChatRoom}
 * @constructor
 */
var ChatRoom = function(megaChat, roomJid, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl) {
    var self = this;

    this.logger = MegaLogger.getLogger("room[" + roomJid + "]", {}, megaChat.logger);

    this.megaChat = megaChat;

    MegaDataObject.attachToExistingJSObject(
        this,
        {
            state: null,
            users: [],
            attachments: null,
            roomJid: null,
            type: null,
            messages: [],
            ctime: 0,
            lastActivity: 0,
            callRequest: null,
            callIsActive: false,
            isCurrentlyActive: false,
            _messagesQueue: [],
            unreadCount: 0,
            chatId: undefined,
            chatdUrl: undefined,
            chatShard: undefined,
            members: {},
            membersLoaded: false
        },
        true
    );

    this.users = users ? users : [];
    this.roomJid = roomJid;
    this.type = type;
    this.ctime = ctime;
    this.lastActivity = lastActivity ? lastActivity : 0;
    this.chatId = chatId;
    this.chatShard = chatShard;
    this.chatdUrl = chatdUrl;

    this.callRequest = null;
    this.callIsActive = false;
    this.shownMessages = {};
    this.attachments = new MegaDataMap(this);
    this.images = new MegaDataSortedMap("k", "delay", this);

    this.options = {

        /**
         * Don't resend any messages in the queue, if older then Xs
         */
        'dontResendAutomaticallyQueuedMessagesOlderThen': 1*60,

        /**
         * The maximum time allowed for plugins to set the state of the room to PLUGINS_READY
         */
        'pluginsReadyTimeout': 60000, // XX: Because of the middle earth's internet, this should have been increased :)

        /**
         * Default media options
         */
        'mediaOptions': {
            audio: true,
            video: true
        }
    };

    this.setState(ChatRoom.STATE.INITIALIZED);

    this.isCurrentlyActive = false;

    // Events
    this.bind('onStateChange', function(e, oldState, newState) {
        self.logger.log("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));

        var resetStateToReady = function() {
            if (self.state != ChatRoom.STATE.LEFT && self.state != ChatRoom.STATE.READY) {
                self.logger.warn("setting state to READY.");

                self.setState(ChatRoom.STATE.READY);
            }
        };

        if (newState === ChatRoom.STATE.PLUGINS_READY) {
            resetStateToReady();
        }
        else if (newState === ChatRoom.STATE.JOINED) {
            self.setState(ChatRoom.STATE.PLUGINS_WAIT);
        }
        else if (newState === ChatRoom.STATE.PLUGINS_WAIT) {
            var $event = new $.Event("onPluginsWait");
            self.megaChat.trigger($event, [self]);

            if (!$event.isPropagationStopped()) {
                self.setState(ChatRoom.STATE.PLUGINS_READY);
            }
        }
        else if (newState === ChatRoom.STATE.PLUGINS_PAUSED) {
            // allow plugins to hold the PLUGINS_WAIT state for MAX 5s
            createTimeoutPromise(function() {
                return self.state !== ChatRoom.STATE.PLUGINS_PAUSED && self.state !== ChatRoom.STATE.PLUGINS_WAIT
            }, 100, self.options.pluginsReadyTimeout)
                .fail(function() {
                    if (self.state === ChatRoom.STATE.PLUGINS_WAIT || self.state === ChatRoom.STATE.PLUGINS_PAUSED) {
                        self.logger.error("Plugins had timed out, setting state to PLUGINS_READY");

                        var participants = self.getParticipantsExceptMe();
                        var contact = participants[0];

                        var pres = self.megaChat.karere.getPresence(contact);

                        if (pres && pres != "offline" && self.encryptionHandler && self.encryptionHandler.state !== 3) {
                            //var $dialog = self.generateInlineDialog(
                            //    "error-" + unixtime(),
                            //    self.megaChat.karere.getBareJid(),
                            //    "mpenc-setup-failed",
                            //    "Could not initialise the encryption in a timely manner. To try again, you can close and start the chat again.",
                            //    [],
                            //    undefined,
                            //    false
                            //);
                            //
                            //self._mpencFailedDialog = $dialog;
                            //
                            //self.appendDomMessage(
                            //    $dialog
                            //);

                            var othersJid = self.getParticipantsExceptMe()[0];
                            var data = {
                                currentMpencState: self.encryptionHandler.state,
                                currentKarereState: self.megaChat.karere.getConnectionState(),
                                myPresence: self.megaChat.karere.getPresence(self.megaChat.karere.getJid()),
                                otherUsersPresence: self.megaChat.karere.getPresence(othersJid),
                                callIsActive: self.callSession ? constStateToText(CallSession.STATE, self.callSession.state) : null,
                                queuedMessagesCount: self._messagesQueue.length,
                                opQueueErrorRetriesCount: self.encryptionOpQueue._error_retries
                            };

                            srvlog("Timed out initialising mpenc.", data, true);
                            self.logger.error("Timed out initialising mpenc.", data);
                        }

                        self.setState(ChatRoom.STATE.PLUGINS_READY);
                    }
                });
        }
        else if (newState === ChatRoom.STATE.JOINING) {
        }
        else if (newState === ChatRoom.STATE.READY) {
        }
    });


    // activity on a specific room (show, hidden, got new message, etc)
    self.bind('onAfterRenderMessage', function(e, msg) {
        var ts = msg.delay ? msg.delay : msg.ts;
        if (!ts) {
            return;
        }

        if (self.lastActivity && self.lastActivity > ts) {
            // this is an old message, DON'T update the lastActivity.
            return;
        }

        self.lastActivity = ts;

        if (self.type === "private") {
            var targetUserJid = self.getParticipantsExceptMe()[0];
            var targetUserNode = self.megaChat.getContactFromJid(targetUserJid);
            assert(M.u, 'M.u does not exists');

            assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
            assert(M.u[targetUserNode.u], 'User not found in M.u');

            if (targetUserNode) {
                setLastInteractionWith(targetUserNode.u, "1:" + self.lastActivity);
            }
        }
        else if (self.type === "group") {
            var contactHash;
            if (msg.authorContact) {
                contactHash = msg.authorContact.h;
            }
            else if (msg.userId) {
                contactHash = msg.userId;
            }
            else if (msg.getFromJid) {
                contactHash = megaChat.getContactHashFromJid(msg.getFromJid());
            }


            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');

            //TODO: last interaction for group chat
        }
        else {
            throw new Error("Not implemented");
        }
    });



    self.getParticipantsExceptMe().forEach(function(jid) {
        var contact = self.megaChat.getContactFromJid(jid);
        if (contact) {
            getLastInteractionWith(contact.u);
        }
    });
    self.megaChat.trigger('onRoomCreated', [self]);

    $(window).rebind("focus." + self.roomJid, function() {
        if (self.isCurrentlyActive) {
            self.trigger("onChatShown");
        }
    });

    self.megaChat.rebind("onRoomDestroy." + self.roomJid, function(e, room) {
        if (room.roomJid == self.roomJid) {
            $(window).unbind("focus." + self.roomJid);
        }
    });

    return this;
};

/**
 * Add support for .on, .bind, .unbind, etc
 */
makeObservable(ChatRoom);

/**
 * Room states
 *
 * @type {{INITIALIZED: number, JOINING: number, JOINED: number, WAITING_FOR_PARTICIPANTS: number, PARTICIPANTS_HAD_JOINED: number, PLUGINS_WAIT: number, PLUGINS_READY: number, READY: number, PLUGINS_PAUSED: number, LEAVING: number, LEFT: number}}
 */
ChatRoom.STATE = {
    'INITIALIZED': 5,
    'JOINING': 10,
    'JOINED': 20,

    'READY': 150,

    'PLUGINS_PAUSED': 175,

    'ENDED': 190,

    'LEAVING': 200,

    'LEFT': 250
};

ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function() {
    var self = this;

    var $promise = new MegaPromise();

    var anonId = "";

    if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
        anonId = self.megaChat.rtc.ownAnonId;
    }
    $.get("https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId)
        .done(function(r) {
            if (r.turn && r.turn.length > 0) {
                var servers = [];
                r.turn.forEach(function(v) {
                    var transport = v.transport;
                    if (!transport) {
                        transport = "udp";
                    }

                    servers.push({
                        url: 'turn:' + v.host + ':' + v.port + '?transport=' + transport,
                        username: "inoo20jdnH",
                        credential: '02nNKDBkkS'
                    });
                });
                self.megaChat.rtc.updateIceServers(servers);

                $promise.resolve();
            }
            else {
                $promise.resolve();
            }
        })
        .fail(function() {
            $promise.reject();
        });

    return $promise;
};

ChatRoom.prototype._resetCallStateNoCall = function() {

};



ChatRoom.prototype._resetCallStateInCall = function() {

};

/**
 * Convert state to text (helper function)
 *
 * @param state {Number}
 * @returns {String}
 */
ChatRoom.stateToText = function(state) {
    var txt = null;
    $.each(ChatRoom.STATE, function(k, v) {
        if (state === v) {
            txt = k;

            return false; // break
        }
    });

    return txt;
};

/**
 * Change the state of this room
 *
 * @param newState {ChatRoom.STATE} the new state
 * @param [isRecover] {Boolean}
 */
ChatRoom.prototype.setState = function(newState, isRecover) {
    var self = this;

    assert(newState, 'Missing state');

    if (newState === self.state) {
        self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
        return;
    }

    if (self.state) { // if not === null, e.g. setting to INITIALIZED
        // only allow state changes to be increasing the .state value (5->10->....150...) with the exception when a
        // PLUGINS_PAUSED is the current or new state
        assert(
            newState === ChatRoom.STATE.PLUGINS_PAUSED ||
            self.state === ChatRoom.STATE.PLUGINS_PAUSED ||
            (newState === ChatRoom.STATE.JOINING && isRecover) ||
            (newState === ChatRoom.STATE.INITIALIZED && isRecover) ||
            newState > self.state,
            'Invalid state change. Current:' + ChatRoom.stateToText(self.state) +  "to" + ChatRoom.stateToText(newState)
        );
    }

    var oldState = self.state;
    self.state = newState;

    self.trigger('onStateChange', [oldState, newState]);
};

/**
 * Returns current state as text
 *
 * @returns {String}
 */
ChatRoom.prototype.getStateAsText = function() {
    var self = this;
    return ChatRoom.stateToText(self.state);
};


/**
 * Change/set the type of the room
 *
 * @param type
 */
ChatRoom.prototype.setType = function(type) {
    var self = this;

    if (!type) {
        if (window.d) {
            debugger;
        }
        self.logger.error("missing type in .setType call");
    }

    self.type = type;
};

/**
 * Set the users (participants) of the room.
 * This is different then the actual current room occupants, based on the XMPP info, because it should contain a list
 * of BARE jids which SHOULD be in the room.
 *
 * Note: All of those JIDs would get auto-invitations to join this room when they connect to the XMPP automatically.
 *
 * @param jids {Array} List of bare jids
 */
ChatRoom.prototype.setUsers = function(jids) {
    this.users = clone(jids);
};


/**
 * the same as .setUsers, w/ the difference that it will only add any of the user jids in `jids` to the `.users`,
 * instead of just overwriting the `.users` property
 *
 * @param jids {Array} List of bare jids
 */
ChatRoom.prototype.syncUsers = function(jids) {
    var self = this;

    assert(jids, "Missing jids");

    var users = clone(self.users);

    $.each(jids, function(k, v) {
        if (v) {
            v = v.split("/")[0];
            if (self.users.indexOf(v) === -1) {
                users.push(
                    v
                )
            }
        }
    });

    if (users.length > self.users.length) {
        self.setUsers(users);
    }
};

/**
 * Check if participant exists in room
 *
 * @param jid {String} Full OR Bare jid
 * @param [strict] {boolean} If true, will only check for FULL jids.
 * @param [notMe] {boolean} set to true if you want the search to ignore if the matched partcipant === my bare jid
 * @returns {boolean}
 */
ChatRoom.prototype.participantExistsInRoom = function(jid, strict, notMe) {
    var self = this;

    strict = strict || false;

    var result = false;
    $.each(self.users, function(k, v) {
        if (!v) {
            self.logger.error("missing contact: ", k);

            return;
        }
        if (notMe) {
            if (Karere.getNormalizedBareJid(v) === self.megaChat.karere.getBareJid()) {
                return; // continue
            }
        }
        if (strict && v === jid) {
            result = true;
            return false; // break;
        }
        else if (!strict && v.split("/")[0] === jid) {
            result = true;
            return false; // break;
        }
    });

    return result;
};


/**
 * Get all participants in a chat room.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getParticipants = function() {
    var self = this;

    var participants = {};


    $.each(self.users, function(k, v) {
        if (!v) {
            self.logger.error("missing contact/user: ", k);

            return;
        }
        participants[v.split("/")[0]] = true;
    });

    return Object.keys(participants);
};

/**
 * Get all users in the chat room.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getUsers = function() {
    var self = this;

    return self.megaChat.karere.getUsersInChat(self.roomJid);
};

/**
 * Get all users in the chat room ordered by joining time.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getOrderedUsers = function() {
    var self = this;

    return self.megaChat.karere.getOrderedUsersInChat(self.roomJid);
};

/**
 * Get room owner (e.g. the oldest user who joined and is currently in the room)
 *
 * @returns {(string|null)}
 */
ChatRoom.prototype.getRoomOwner = function() {
    var self = this;

    var users = self.megaChat.karere.getOrderedUsersInChat(self.roomJid);

    return users[0];
};

/**
 * Get a list of the current participants for this room, excluding my jid (or if provided, exlucding any of the jids
 * founds in arr `jids`).
 *
 * @param [jids] {Array}
 * @returns {Array}
 */
ChatRoom.prototype.getParticipantsExceptMe = function(jids) {
    var self = this;
    if (!jids) {
        jids = self.getParticipants();
    }
    var jidsWithoutMyself = clone(jids);
    jidsWithoutMyself.splice($.inArray(self.megaChat.karere.getBareJid(), jidsWithoutMyself), 1);

    return jidsWithoutMyself;
};


/**
 * Used to conver participants (from jids) -> contacts (as user hashes).
 *
 * @param [jids] {Array} optional list of jids to be used for converting -> contact list (if not passed, the current
 * room jids would be used)
 * @returns {Array} array of user hashes with the participants in the room
 */
ChatRoom.prototype.getContactParticipantsExceptMe = function(jids) {
    var self = this;
    var participantJids = self.getParticipantsExceptMe(jids);

    return participantJids.map((jid) => {
        var contactHash = megaJidToUserId(jid);
        if (contactHash) {
            return contactHash;
        }
    });
};

/**
 * Used to conver participants (from jids) -> contacts (as user hashes).
 *
 * @param [jids] {Array} optional list of jids to be used for converting -> contact list (if not passed, the current
 * room jids would be used)
 * @returns {Array} array of user hashes with the participants in the room
 */
ChatRoom.prototype.getContactParticipants = function(jids) {
    var self = this;
    var participantJids = self.getParticipants(jids);

    return participantJids.map((jid) => {
        var contactHash = megaJidToUserId(jid);
        if (contactHash) {
            return contactHash;
        }
    });
};

/**
 * Get room title
 *
 * @returns {string}
 */
ChatRoom.prototype.getRoomTitle = function() {
    var self = this;
    if (this.type == "private") {
        var participants = self.getParticipantsExceptMe();
        return self.megaChat.getContactNameFromJid(participants[0]);
    }
    else {
        var participants = self.members && Object.keys(self.members).length > 0 ? Object.keys(self.members) : [];
        var names = [];
        participants.forEach(function(contactHash) {
            if (contactHash && M.u[contactHash] && contactHash !== u_handle) {
                names.push(
                    M.u[contactHash] ? M.getNameByHandle(contactHash) : "non contact"
                );
            }
        });
        return names.length > 0 ? names.join(", ") : __("(empty)");
    }
};



/**
 * Leave this chat room
 *
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 * @returns {undefined|Deferred}
 */
ChatRoom.prototype.leave = function(notifyOtherDevices) {
    var self = this;

    self._leaving = true;


    if (notifyOtherDevices === true) {
        if (self.type == "group") {
            $(self).trigger('onLeaveChatRequested');
        }
        else {
            self.logger.error("Can't leave room of type: " + self.type);
            return;
        }
    }


    if (self.roomJid.indexOf("@") != -1) {
        self.setState(ChatRoom.STATE.LEAVING);
        return self.megaChat.karere.leaveChat(self.roomJid).done(function() {
            self.setState(ChatRoom.STATE.LEFT);
        });
    }
    else {
        self.setState(ChatRoom.STATE.LEFT);
    }

    self.megaChat.refreshConversations();
};

/**
 * Destroy a room (leave + UI destroy + js cleanup)
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 */
ChatRoom.prototype.destroy = function(notifyOtherDevices) {
    var self = this;

    self.megaChat.trigger('onRoomDestroy', [self]);
    var mc = self.megaChat;
    var roomJid = self.roomJid;

    if (!self.stateIsLeftOrLeaving()) {
        self.leave(notifyOtherDevices);
    }

    Soon(function() {
        if (self.isCurrentlyActive) {
            self.isCurrentlyActive = false;
        }

        mc.chats.remove(roomJid);

        window.location = '#fm/chat';
    });
};


/**
 * Show UI elements of this room
 */
ChatRoom.prototype.show = function() {
    var self = this;

    if (self.isCurrentlyActive) {
        return false;
    }
    self.megaChat.hideAllChats();

    self.isCurrentlyActive = true;

    $('.files-grid-view').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.contacts-grid-view').addClass('hidden');
    $('.fm-contacts-blocks-view').addClass('hidden');

    $('.fm-right-files-block[data-reactid]').removeClass('hidden');
    $('.fm-right-files-block:not([data-reactid])').addClass('hidden');

    //$('.nw-conversations-item').removeClass('selected');


    if (self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomJid) {
        var oldRoom = self.megaChat.getCurrentRoom();
        if (oldRoom) {
            oldRoom.hide();
        }
    }

    sectionUIopen('conversations');


    self.megaChat.currentlyOpenedChat = self.roomJid;
    self.megaChat.lastOpenedChat = self.roomJid;

    self.trigger('activity');
    self.trigger('onChatShown');
};

/**
 * Returns true/false if the current room is currently active (e.g. visible)
 */
ChatRoom.prototype.isActive = function() {
    return document.hasFocus() && this.isCurrentlyActive;
};

ChatRoom.prototype.setActive = function() {
    window.location = this.getRoomUrl();
};


ChatRoom.prototype.getRoomUrl = function() {
    var self = this;
    if (self.type === "private") {
        var participants = self.getParticipantsExceptMe();
        var contact = self.megaChat.getContactFromJid(participants[0]);
        if (contact) {
            return "#fm/chat/" + contact.u;
        }
    }
    else if (self.type === "group") {
            return "#fm/chat/g/" + self.roomJid.split("@")[0];
    }
    else {
        throw new Error("Can't get room url for unknown room type.");
    }
};

/**
 * If this is not the currently active room, then this method will navigate the user to this room (using window.location)
 */
ChatRoom.prototype.activateWindow = function() {
    var self = this;

    window.location = self.getRoomUrl();
};

/**
 * Hide the UI elements of this room
 */
ChatRoom.prototype.hide = function() {
    var self = this;

    self.isCurrentlyActive = false;

    if (self.megaChat.currentlyOpenedChat === self.roomJid) {
        self.megaChat.currentlyOpenedChat = null;
    }
};

/**
 * Append message to the UI of this room.
 * Note: This method will also log the message, so that later when someone asks for message sync this log will be used.
 *
 * @param message {KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage|ChatDialogMessage}
 * @returns {boolean}
 */
ChatRoom.prototype.appendMessage = function(message) {
    var self = this;

    if (message.deleted) { // deleted messages should not be .append-ed
        return false;
    }

    if (message.getFromJid && message.getFromJid() === self.roomJid) {
        return false; // dont show any system messages (from the conf room)
    }

    if (message instanceof KarereEventObjects.OutgoingMessage) {
        $(message).rebind('onChange.rerenderOnChangeHandler' + this.roomJid.split("@")[0], function(
            msg,
            property,
            oldVal,
            newVal
        ) {
            if (property === "textContents" || property === "contents") {
                self.trackDataChange();
            }
        });
    }
    else if (
        message.getFromJid &&
        message instanceof KarereEventObjects.IncomingMessage &&
        Karere.getNormalizedBareJid(message.getFromJid()) === self.megaChat.karere.getJid()
    ) {
        // my own IncomingMessage message, should be converted to Outgoing
        message = new KarereEventObjects.OutgoingMessage(
            message.toJid,
            message.fromJid,
            message.type,
            message.messageId,
            message.contents,
            message.meta,
            message.delay,
            message.meta && message.meta.state ? message.meta.state : message.state,
            message.roomJid
        );
    }
    if (self.shownMessages[message.messageId]) {

        //self.logger.debug(self.roomJid.split("@")[0], message.messageId, "This message is already added to the message list (and displayed).");
        return false;
    }
    if (!message.orderValue) {
        // append at the bottom
        if (self.messages.length > 0) {
            var prevMsg = self.messagesBuff.messages.getItem(self.messages.length - 1);
            if (!prevMsg) {
                self.logger.error(
                    'self.messages got out of sync...maybe there are some previous JS exceptions that caused that? ' +
                    'note that messages may be displayed OUT OF ORDER in the UI.'
                );
            }
            else {
                message.orderValue = prevMsg.orderValue + 0.1;
            }
        }
    }

    self.trigger('onMessageAppended', message);
    self.messagesBuff.messages.push(message);

    self.shownMessages[message.messageId] = true;

    self.trackDataChange();
};


/**
 * Returns the actual DOM Element from the Mega's main navigation (tree) that is related to this chat room.
 *
 * @returns {*|jQuery|HTMLElement}
 */
ChatRoom.prototype.getNavElement = function() {
    var self = this;

    return $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
};


/**
 * Will check if any of the plugins requires a message to be 'queued' instead of sent.
 *
 * @param [message] {Object} optional message object (currently not used)
 * @returns {boolean}
 */
ChatRoom.prototype.arePluginsForcingMessageQueue = function(message) {
    var self = this;
    var pluginsForceQueue = false;

    $.each(self.megaChat.plugins, function(k) {
        if (self.megaChat.plugins[k].shouldQueueMessage) {
            if (self.megaChat.plugins[k].shouldQueueMessage(self, message) === true) {
                pluginsForceQueue = true;
                return false; // break
            }
        }
    });

    return pluginsForceQueue;
};

/**
 * Send message to this room
 *
 * @param message {String}
 * @param [meta] {Object}
 */
ChatRoom.prototype.sendMessage = function(message, meta) {
    var self = this;
    var megaChat = this.megaChat;
    meta = meta || {};

    if (self._conv_ended === true) {
        self._restartConversation();
    }
    var messageId = megaChat.karere.generateMessageId(self.roomJid, JSON.stringify([message, meta]));

    var eventObject = new KarereEventObjects.OutgoingMessage(
        self.roomJid,
        megaChat.karere.getJid(),
        "groupchat",
        messageId,
        message,
        meta,
        unixtime(),
        KarereEventObjects.OutgoingMessage.STATE.NOT_SENT,
        self.roomJid
    );

    eventObject.textContents = message;


    self.appendMessage(eventObject);
    
    self._sendMessageToTransport(eventObject)
        .done(function(internalId) {
            eventObject.internalId = internalId;
        });
};

/**
 * This method will:
 * - eventually (if the user is connected) try to send this message to the xmpp server
 * - mark the message as sent or unsent (if the user is not connected)
 *
 * @param messageObject {KarereEventObjects.OutgoingMessage}
 */
ChatRoom.prototype._sendMessageToTransport = function(messageObject) {
    var self = this;
    var megaChat = this.megaChat;

    var messageMeta = messageObject.getMeta() ? messageObject.getMeta() : {};
    if (messageMeta.isDeleted && messageMeta.isDeleted === true) {
        return MegaPromise.reject();
    }

    if (messageObject.setDelay) {
        // guarantee that all message's .delay would be === current time (e.g. the last time we tried to send them)
        messageObject.setDelay(unixtime());
    }


    return megaChat.plugins.chatdIntegration.sendMessage(
        self,
        messageObject
    );
};


/**
 * Helper for accessing options.mediaOptions;
 *
 * @returns {*}
 */
ChatRoom.prototype.getMediaOptions = function() {
    return this.callSession ? this.callSession.getMediaOptions : {};
};

/**
 * Internal method to notify the server that the specified `nodeids` are sent/shared to `users`
 * @param nodeids {Array}
 * @param users {Array}
 * @private
 */
ChatRoom.prototype._sendNodes = function(nodeids, users) {
    var promises = [];
    var self = this;

    users.forEach(function(uh) {
        nodeids.forEach(function(nodeId) {
            promises.push(
                asyncApiReq({'a': 'mcga', 'n': nodeId, 'u': uh, 'id': self.chatId})
            )
        })
    });

    return MegaPromise.allDone(promises);
};



/**
 * Attach/share (send as message) file/folder nodes to the chat
 * @param ids
 */
ChatRoom.prototype.attachNodes = function(ids) {
    var self = this;

    var users = [];

    $.each(self.getParticipantsExceptMe(), function(k, v) {
        var contact = self.megaChat.getContactFromJid(v);
        if (contact && contact.u) {
            users.push(
                contact.u
            );
        }
    });

    var $masterPromise = new $.Deferred();

    self._sendNodes(
        ids,
        users
    )
        .done(function() {
            var nodesMeta = [];
            $.each(ids, function(k, nodeId) {
                var node = M.d[nodeId];
                nodesMeta.push({
                    'h': node.h,
                    'key': node.key,
                    'k': node.k,
                    'a': node.a,
                    't': node.t,
                    'name': node.name,
                    's': node.s,
                    'fa': node.fa,
                    'ar': {
                        'n': node.ar.n,
                        't': node.ar.t,
                        'c': node.ar.c
                    },
                    'ts': node.ts
                });
            });

            // 1b, 1b, JSON
            self.sendMessage(
                Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
                Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT +
                JSON.stringify(nodesMeta)
            );

            $masterPromise.resolve(
                ids
            );
        })
        .fail(function(r) {
            $masterPromise.reject(r);
        });

    return $masterPromise;
};

/**
 * Attach/share (send as message) contact details
 * @param ids
 */
ChatRoom.prototype.attachContacts = function(ids) {
    var self = this;

    var nodesMeta = [];
    $.each(ids, function(k, nodeId) {
        var node = M.d[nodeId];
        nodesMeta.push({
            'u': node.u,
            'email': node.m,
            'name': node.firstName && node.lastName ? node.firstName + " " + node.lastName : node.m
        });
    });

    // 1b, 1b, JSON
    self.sendMessage(
        Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
        Message.MANAGEMENT_MESSAGE_TYPES.CONTACT +
        JSON.stringify(nodesMeta)
    );
};

ChatRoom.prototype.revokeAttachment = function(node) {
    var self = this;

    assert(node, 'node is missing.');

    var users = [];

    $.each(self.getParticipantsExceptMe(), function(k, v) {
        var contact = self.megaChat.getContactFromJid(v);
        if (contact && contact.u) {
            users.push(
                contact.u
            );
        }
    });

    loadingDialog.show();

    var allPromises = [];

    users.forEach(function(uh) {
        allPromises.push(
            asyncApiReq({
                'a': 'mcra', 'n': node.h, 'u': uh, 'id': self.chatId
            })
        );
    });
    MegaPromise.allDone(allPromises)
        .done(function(r) {
            if (r && r[0] && r[0][0] && r[0][0] < 0) {
                msgDialog(
                    'warninga',
                    __("Revoke attachment"),
                    __("Could not revoke access to attachment, error code: %s.").replace("%s", r[0][0])
                );
            }
            // 1b, 1b, JSON
            self.sendMessage(
                Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
                Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT +
                node.h
            );
        })
        .always(function() {
            loadingDialog.hide();
        })
        .fail(function(r) {
            msgDialog(
                'warninga',
                __("Revoke attachment"),
                __("Could not revoke access to attachment, error code: %s.").replace("%s", r)
            );
        });

    return allPromises;
};

/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */
ChatRoom.prototype.getMessageById = function(messageId) {
    var self = this;
    var found = false;
    $.each(self.messagesBuff.messages, function(k, v) {
        if (v.messageId === messageId) {
            found = v;
            return false; //break;
        }
    });

    return found;
};

/**
 * Used to update the DOM element containing data about this room.
 * E.g. unread count
 */
ChatRoom.prototype.renderContactTree = function() {
    var self = this;

    var $navElement = self.getNavElement();

    var $count = $('.nw-conversations-unread', $navElement);


    var count = self.messagesBuff.getUnreadCount();

    if (count > 0) {
        $count.text(
            count > 9 ? "9+" : count
        );
        $navElement.addClass("unread");
    }
    else if (count === 0) {
        $count.text("");
        $navElement.removeClass("unread");
    }

    $navElement.data('chatroom', self);
};

/**
 * Returns the # of messages which are currently marked as unread (uses the chatNotifications plugin)
 *
 * @returns {Integer|undefined}
 */
ChatRoom.prototype.getUnreadCount = function() {
    var self = this;
    return self.messagesBuff.getUnreadCount();
};


/**
 * Re-join - safely join a room after connection error/interruption
 */
ChatRoom.prototype.recover = function() {
    var self = this;

    self.logger.warn('recovering room: ', self.roomJid, self);

    self.callRequest = null;
    self.setState(ChatRoom.STATE.JOINING, true);
    var $startChatPromise = self.megaChat.karere.startChat([], self.type, self.roomJid.split("@")[0], (self.type === "private" ? false : undefined));

    self.megaChat.trigger("onRoomCreated", [self]); // re-initialise plugins

    return $startChatPromise;
};

ChatRoom.prototype._restartConversation = function() {
    var self = this;

    if (self._conv_ended === true) {
        self._conv_ended = self._leaving = false;

        self.setState(
            ChatRoom.STATE.PLUGINS_WAIT
        );

        self.trigger('onConversationStarted');
    }
};

ChatRoom.prototype._conversationEnded = function(userFullJid) {
    var self = this;

    if (self && self._leaving !== true) {
        if (self.callSession) {
            if (self.callSession.isStarted() || self.callSession.isStarting()) {
                self.callSession.endCall();
            }
        }

        self._conv_ended = true;

        self.setState(ChatRoom.STATE.ENDED);

        [self.$messages].forEach(function(k, v) {
            $(k).addClass("conv-end")
                .removeClass("conv-start");
        });
    }
};

ChatRoom.prototype._conversationStarted = function(userBareJid) {
    var self = this;

    if (self._conv_ended) {
        if (Karere.getNormalizedBareJid(userBareJid) != self.megaChat.karere.getBareJid()) {
            // the other user had joined, mark this conv as started again.
            self._restartConversation();
        }
    }
    else {
        // i'd joined
        self.trigger('onConversationStarted');
    }


    self.setState(ChatRoom.STATE.READY);
};


ChatRoom.prototype.startAudioCall = function() {
    var self = this;
    return self.megaChat.plugins.callManager.startCall(self, {audio: true, video:false});
};

ChatRoom.prototype.startVideoCall = function() {
    var self = this;
    return self.megaChat.plugins.callManager.startCall(self, {audio: true, video: true});
};

ChatRoom.prototype.stateIsLeftOrLeaving = function() {
    return (this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING);
};

ChatRoom.prototype._clearChatMessagesFromChatd = function() {
    megaChat.plugins.chatdIntegration.chatd.shards[0].retention(
        base64urldecode(this.chatId), 1
    );
};

ChatRoom.prototype.isReadOnly = function() {
    return (
        (this.members && this.members[u_handle] === 0) ||
        this.privateReadOnlyChat ||
        this.state === ChatRoom.STATE.LEAVING ||
        this.state === ChatRoom.STATE.LEFT
    );
};
ChatRoom.prototype.iAmOperator = function() {
    return this.type === "private" || this.members && this.members[u_handle] === 3;
};

window.ChatRoom = ChatRoom;
module.exports = ChatRoom;
