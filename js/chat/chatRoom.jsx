export const RETENTION_FORMAT = { HOURS: 'hour', DAYS: 'day', WEEKS: 'week', MONTHS: 'month', DISABLED: 'none' };
window.RETENTION_FORMAT = RETENTION_FORMAT;

/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat {Chat}
 * @param roomId
 * @param type {String} only "private" is supported for now
 * @param users {Array}
 * @param ctime {Integer} unix time
 * @param [lastActivity] {Integer} unix time
 * @returns {ChatRoom}
 * @constructor
 */
var ChatRoom = function (megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI,
                         publicChatHandle, publicChatKey,
                         ck,
                         isMeeting,
                         retentionTime
) {
    var self = this;

    this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);

    this.megaChat = megaChat;

    MegaDataObject.call(
        this,
        {
            state: null,
            users: [],
            roomId: null,
            type: null,
            messages: [],
            ctime: 0,
            lastActivity: 0,
            callRequest: null,
            isCurrentlyActive: false,
            _messagesQueue: [],
            unreadCount: 0,
            chatId: undefined,
            chatdUrl: undefined,
            chatShard: undefined,
            members: {},
            membersSet: false,
            membersLoaded: false,
            topic: "",
            flags: 0x00,
            publicLink: null,
            archivedSelected: false,
            showArchived: false,
            observers: 0,
            dnd: null,
            alwaysNotify: null,
            retentionTime: 0,
            sfuApp: null,
            activeCallIds: null,
            meetingsLoading: null
        }
    );

    this.roomId = roomId;
    this.instanceIndex = ChatRoom.INSTANCE_INDEX++;
    this.type = type;
    this.ctime = ctime;
    this.lastActivity = lastActivity ? lastActivity : 0;
    this.chatd = megaChat.plugins.chatdIntegration.chatd;

    this.chatId = chatId;
    this.chatIdBin = chatId ? base64urldecode(chatId) : "";

    this.chatShard = chatShard;
    this.chatdUrl = chatdUrl;
    this.publicChatHandle = publicChatHandle;
    this.publicChatKey = publicChatKey;
    this.ck = ck;

    this.scrolledToBottom = 1;

    this.callRequest = null;
    this.shownMessages = {};
    this.retentionTime = retentionTime;
    this.retentionLabel = '';

    this.activeSearches = 0;
    self.members = {};
    this.activeCallIds = new MegaDataMap(this);
    this.ringingCalls = new MegaDataMap(this);
    this.ringingCalls.addChangeListener(() => {
        // force full re-render since basically, the root `Conversations` app may need to render/remove a dialog
        megaChat.safeForceUpdate();
    });


    this.isMeeting = isMeeting;

    if (type === "private") {
        users.forEach(function(userHandle) {
            self.members[userHandle] = 3;
        });
    }
    else {
        users.forEach(function(userHandle) {
            // while loading, set permissions to read only
            self.members[userHandle] = 0;
        });
    }




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
    if (d) {
        this.rebind('onStateChange.chatRoomDebug', function(e, oldState, newState) {
            self.logger.debug(
                "Will change state from: ",
                ChatRoom.stateToText(oldState),
                " to ",
                ChatRoom.stateToText(newState)
            );
        });
    }

    self.rebind('onStateChange.chatRoom', function(e, oldState, newState) {
        if (newState === ChatRoom.STATE.READY && !self.isReadOnly()
            && self.chatd && self.isOnline() && self.chatIdBin) {

            // this should never happen, but just in case...
            var cim = self.getChatIdMessages();
            cim.restore(true);
        }
    });


    // activity on a specific room (show, hidden, got new message, etc)
    self.rebind('onMessagesBuffAppend.lastActivity', function(e, msg) {
        if (is_chatlink) {
            return;
        }

        var ts = msg.delay ? msg.delay : msg.ts;
        if (!ts) {
            return;
        }

        // set last seen/active/green
        var contactForMessage = msg && Message.getContactForMessage(msg);
        if (contactForMessage && contactForMessage.u !== u_handle) {
            if (!contactForMessage.ats || contactForMessage.ats < ts) {
                contactForMessage.ats = ts;
            }
        }

        if (self.lastActivity && self.lastActivity >= ts) {
            // this is an old message, DON'T update the lastActivity.
            return;
        }

        self.lastActivity = ts;

        if (msg.userId === u_handle) {
            self.didInteraction(u_handle, ts);
            return;
        }

        if (self.type === "private") {
            var targetUserId = self.getParticipantsExceptMe()[0];

            var targetUserNode;
            if (M.u[targetUserId]) {
                targetUserNode = M.u[targetUserId];
            }
            else if(msg.userId) {
                targetUserNode = M.u[msg.userId];
            }
            else {
                console.error("Missing participant in a 1on1 room.");
                return;
            }


            assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
            assert(M.u[targetUserNode.u], 'User not found in M.u');

            if (targetUserNode) {
                self.didInteraction(targetUserNode.u, self.lastActivity);
            }
        }
        else if (self.type === "group" || self.type === "public") {
            var contactHash;
            if (msg.authorContact) {
                contactHash = msg.authorContact.u;
            }
            else if (msg.userId) {
                contactHash = msg.userId;
            }

            if (contactHash && M.u[contactHash]) {
                self.didInteraction(contactHash, self.lastActivity);
            }
            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');
        }
        else {
            throw new Error("Not implemented");
        }


    });

    // onMembersUpdated core room data management
    self.rebind('onMembersUpdated.coreRoomDataMngmt', function(e, eventData) {
        if (
            self.state === ChatRoom.STATE.LEFT &&
            eventData.priv >= 0 && eventData.priv < 255
        ) {
            // joining
            self.membersLoaded = false;
            self.setState(ChatRoom.STATE.JOINING, true);
        }

        var queuedMembersUpdatedEvent = false;

        if (self.membersLoaded === false) {
            if (eventData.priv >= 0 && eventData.priv < 255) {
                var addParticipant = function addParticipant() {
                    // add group participant in strongvelope
                    self.protocolHandler.addParticipant(eventData.userId);
                    // also add to our list
                    self.members[eventData.userId] = eventData.priv;

                    ChatdIntegration._ensureContactExists([eventData.userId]);
                    self.trigger('onMembersUpdatedUI', eventData);
                };

                ChatdIntegration._waitForProtocolHandler(self, addParticipant);
                queuedMembersUpdatedEvent = true;
            }
        }
        else if (eventData.priv === 255 || eventData.priv === -1) {
            var deleteParticipant = function deleteParticipant() {
                if (eventData.userId === u_handle) {
                    // remove all participants from the room.
                    Object.keys(self.members).forEach(function(userId) {
                        // remove group participant in strongvelope
                        self.protocolHandler.removeParticipant(userId);
                        // also remove from our list
                        delete self.members[userId];
                    });
                }
                else {
                    // remove group participant in strongvelope
                    self.protocolHandler.removeParticipant(eventData.userId);
                    // also remove from our list
                    delete self.members[eventData.userId];
                }

                self.trigger('onMembersUpdatedUI', eventData);
            };

            ChatdIntegration._waitForProtocolHandler(self, deleteParticipant);
            queuedMembersUpdatedEvent = true;
        }

        if (eventData.userId === u_handle) {
            self.membersLoaded = true;
        }
        if (!queuedMembersUpdatedEvent) {
            self.members[eventData.userId] = eventData.priv;
            self.trigger('onMembersUpdatedUI', eventData);
        }
    });


    // Handle chatd telling the client that the user is already in the room when visiting a chat link
    if (is_chatlink && !is_chatlink.callId) {
        const unbind = () => {
            self.unbind('onMessagesHistoryDone.chatlinkAlreadyIn');
            self.unbind('onMembersUpdated.chatlinkAlreadyIn');
        };


        self.rebind('onMembersUpdated.chatlinkAlreadyIn', (e, eventData) => {
            if (eventData.userId === u_handle && eventData.priv >= 0) {
                unbind();
                return this.megaChat.routing.reinitAndOpenExistingChat(this.chatId, this.publicChatHandle);
            }
        });
        self.rebind('onMessagesHistoryDone.chatlinkAlreadyIn', (e, data) => {
            if (!data.chatdPersist) {
                // we don't care about ChatdPersist messages...we want to know when the history had been received
                // from the server (which means members list was received)
                unbind();
            }
        });
    }
    /**
     * Manually proxy contact related data change events, for more optimal UI rerendering.
     */
    self.rebind('onMembersUpdatedUI.chatRoomMembersSync', function(e, eventData) {
        var roomRequiresUpdate = false;

        if (eventData.userId === u_handle) {
            self.messagesBuff.joined = true;
            if (eventData.priv === 255 || eventData.priv === -1) {
                if (self.state === ChatRoom.STATE.JOINING) {
                    self.setState(ChatRoom.STATE.LEFT);
                }
            }
            else {
                if (self.state === ChatRoom.STATE.JOINING) {
                    self.setState(ChatRoom.STATE.READY);
                }
            }
            roomRequiresUpdate = true;
        }
        else {
            var contact = M.u[eventData.userId];
            if (contact instanceof MegaDataMap) {
                if (eventData.priv === 255 || eventData.priv === -1) {
                    if (contact._onMembUpdUIListener) {
                        contact.removeChangeListener(contact._onMembUpdUIListener);
                        roomRequiresUpdate = true;
                    }
                }
                else if (!contact._onMembUpdUIListener) {
                    contact._onMembUpdUIListener = contact.addChangeListener(function() {
                        self.trackDataChange.apply(self, arguments);
                    });
                    roomRequiresUpdate = true;
                }
            }
        }

        if (roomRequiresUpdate) {
            self.trackDataChange();
        }

    });

    self.getParticipantsExceptMe().forEach(function(userHandle) {
        var contact = M.u[userHandle];
        if (contact && contact.c) {
            getLastInteractionWith(contact.u);
        }
    });

    // This line of code should always be called, no matter what. Plugins rely on onRoomCreated
    // so that they can hook/add event listeners to newly created rooms.
    self.megaChat.trigger('onRoomCreated', [self]);

    if (this.type === "public" && self.megaChat.publicChatKeys[self.chatId]) {
        self.publicChatKey = self.megaChat.publicChatKeys[self.chatId];
    }



    $(window).rebind("focus." + self.roomId, function() {
        if (self.isCurrentlyActive) {
            self.trigger("onChatShown");
        }
    });

    self.megaChat.rebind("onRoomDestroy." + self.roomId, function(e, room) {
        if (room.roomId == self.roomId) {
            $(window).off("focus." + self.roomId);
        }
    });

    self.rebind('onClientLeftCall.chatRoom', () => self.callParticipantsUpdated());
    self.rebind('onClientJoinedCall.chatRoom', () => self.callParticipantsUpdated());
    self.rebind('onCallParticipantsUpdated.chatRoom', () => self.callParticipantsUpdated());

    self.initialMessageHistLoaded = false;

    var timer = null;
    var _historyIsAvailable = (ev) => {
        self.initialMessageHistLoaded = ev ? true : -1;

        clearTimeout(timer);
        self.unbind('onMarkAsJoinRequested.initHist');
        self.unbind('onHistoryDecrypted.initHist');
        self.unbind('onMessagesHistoryDone.initHist');

        self.megaChat.safeForceUpdate();
    };
    self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
    self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);

    self.rebind('onMarkAsJoinRequested.initHist', () => {
        timer = setTimeout(function() {
            if (d) {
                self.logger.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
            }
            _historyIsAvailable(false);
        }, 3e5);
    });

    self.rebind('onRoomDisconnected', () => {
        if (!self.activeCall) {
            for (const activeCallId of self.activeCallIds.keys()) {
                self.activeCallIds.remove(activeCallId);
            }
        }
    });

    this.membersSetFromApi = new ChatRoom.MembersSet(this);

    if (publicChatHandle) {
        this.onPublicChatRoomInitialized();
    }
    return this;
};

inherits(ChatRoom, MegaDataObject);

/**
 * Room states
 *
 * @type {{INITIALIZED: number,
           JOINING: number,
           JOINED: number,
           WAITING_FOR_PARTICIPANTS: number,
           PARTICIPANTS_HAD_JOINED: number,
           READY: number,
           LEAVING: number,
           LEFT: number}}
 */
ChatRoom.STATE = {
    'INITIALIZED': 5,
    'JOINING': 10,
    'JOINED': 20,

    'READY': 150,

    'ENDED': 190,

    'LEAVING': 200,

    'LEFT': 250
};

ChatRoom.INSTANCE_INDEX = 0;
ChatRoom.ANONYMOUS_PARTICIPANT = mega.BID;
ChatRoom.ARCHIVED = 0x01;

ChatRoom.MembersSet = function(chatRoom) {
    this.chatRoom = chatRoom;
    this.members = {};
};

ChatRoom.MembersSet.PRIVILEGE_STATE = {
    'NOT_AVAILABLE': -5,
    'FULL': 3,
    'OPERATOR': 2,
    'READONLY': 0,
    'LEFT': -1
};

ChatRoom.encryptTopic = function(protocolHandler, newTopic, participants, isPublic = false) {
    if (protocolHandler instanceof strongvelope.ProtocolHandler && participants.size > 0) {
        const topic = protocolHandler.embeddedEncryptTo(
            newTopic,
            strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
            participants,
            undefined,
            isPublic
        );

        if (topic) {
            return base64urlencode(topic)
        }
    }

    return false;
};

ChatRoom.MembersSet.prototype.trackFromActionPacket = function(ap, isMcf) {
    var self = this;

    var apMembers = {};
    (ap.u || []).forEach(function(r) {
        apMembers[r.u] = r.p;
    });

    // first verify and compare .u
    Object.keys(self.members).forEach(function(u_h) {
        if (typeof apMembers[u_h] === 'undefined') {
            self.remove(u_h);
        }
        else if (apMembers[u_h] !== self.members[u_h]) {
            self.update(u_h, apMembers[u_h]);
        }
    });

    Object.keys(apMembers).forEach(function(u_h) {
        if (typeof self.members[u_h] === 'undefined') {
            var priv2 = apMembers[u_h];
            !isMcf ? self.add(u_h, priv2) : self.init(u_h, priv2);
        }
        else if (apMembers[u_h] !== self.members[u_h]) {
            self.update(u_h, apMembers[u_h]);
        }
    });

    // detect if I was added to a room
    if (
        !isMcf &&
        ap.m === 1 &&
        !ap.n &&
        ap.url &&
        ap.ou !== u_handle &&
        typeof ap.p === 'undefined' &&
        !ap.topicChange
    ) {
        self.chatRoom.trigger('onMeAdded', ap.ou);
    }
};

ChatRoom.MembersSet.prototype.init = function(handle, privilege) {
    this.members[handle] = privilege;
    this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.update = function(handle, privilege) {
    this.members[handle] = privilege;
    this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.add = function(handle, privilege) {
    this.members[handle] = privilege;
    if (handle === u_handle) {
        this.chatRoom.trigger('onMeJoined');
    }
    this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.remove = function(handle) {
    delete this.members[handle];
    if (handle === u_handle) {
        this.chatRoom.trigger('onMeLeft');
    }
    this.chatRoom.trackDataChange();
};


ChatRoom.prototype.trackMemberUpdatesFromActionPacket = function(ap, isMcf) {
    if (!ap.u) {
        return;
    }

    if (this.membersSetFromApi) {
        this.membersSetFromApi.trackFromActionPacket(ap, isMcf);
    }
};

/**
 * @returns An array with the userid+clientid (binary) of the call participants in this room
 * If there is no call or there is no chatd chat with this chatid, returns an empty array
 */
ChatRoom.prototype.getCallParticipants = function() {
    var ids = this.activeCallIds.keys();
    if (ids.length === 0) {
        return [];
    }
    return this.activeCallIds[ids[0]];
};

ChatRoom.prototype.getChatIdMessages = function() {
    return this.chatd.chatIdMessages[this.chatIdBin];
};

/**
 * getRetentionFormat
 * @description Extrapolate the retention format based on retention time. If no `retentionTime` parameter is passed,
 * the format extrapolation is based on the `retentionTime` set for the given chat room.
 * @see RETENTION_FORMAT
 * @param {number} [retentionTime] The retention time timestamp
 * @returns {string} The retention time format, e.g. `hours`, `days`, `weeks`, `months` or `disabled`
 */

ChatRoom.prototype.getRetentionFormat = function(retentionTime) {
    retentionTime = retentionTime || this.retentionTime;
    switch (true) {
        case retentionTime === 0:
            return RETENTION_FORMAT.DISABLED;
        case retentionTime % daysToSeconds(30) === 0 || /* 365 days */ retentionTime >= 31536000:
            return RETENTION_FORMAT.MONTHS;
        case retentionTime % daysToSeconds(7) === 0:
            return RETENTION_FORMAT.WEEKS;
        case retentionTime % daysToSeconds(1) === 0:
            return RETENTION_FORMAT.DAYS;
        default:
            return RETENTION_FORMAT.HOURS;
    }
};

/**
 * Convert the retention time into a number based on the retention format. If no `retentionTime` parameter
 * is passed, the value is based on the `retentionTime` set for the given chat room.
 * @see RETENTION_FORMAT
 * @see ChatRoom.getRetentionFormat
 * @param {number} [retentionTime] The retention time timestamp
 * @returns {number} The converted retention time value
 */
ChatRoom.prototype.getRetentionTimeFormatted = function(retentionTime) {
    retentionTime = retentionTime || this.retentionTime;
    switch (this.getRetentionFormat(retentionTime)) {
        case RETENTION_FORMAT.MONTHS:
            return Math.floor(secondsToDays(retentionTime) / 30);
        case RETENTION_FORMAT.WEEKS:
            return secondsToDays(retentionTime) / 7;
        case RETENTION_FORMAT.DAYS:
            return secondsToDays(retentionTime);
        case RETENTION_FORMAT.HOURS:
            return secondsToHours(retentionTime);
        case RETENTION_FORMAT.DISABLED:
            return 0;
    }
};

/**
 * getRetentionLabel
 * @description Returns formatted retention label as a string. The formatting takes into account singular/plural forms
 * based on the specific retention time. The formatting is based on the `retentionTime` for the given chat room, if no
 * `retentionTime` is passed as parameter.
 * @example
 * room.retentionTime
 * => 1209600
 * room.getRetentionLabel()
 * => `2 weeks`
 * room.retentionTime
 * => 0
 * room.getRetentionLabel()
 * > `Disabled`
 * @see RETENTION_FORMAT
 * @param {number} retentionTime
 * @returns {string}
 */

ChatRoom.prototype.getRetentionLabel = function(retentionTime) {
    retentionTime = retentionTime || this.retentionTime;
    const days = secondsToDays(retentionTime);
    const months = Math.floor(days / 30);
    const hours = secondsToHours(retentionTime);

    switch (this.getRetentionFormat(retentionTime)) {
        case RETENTION_FORMAT.DISABLED:
            // `Disabled`
            return l[7070];
        case RETENTION_FORMAT.MONTHS:
            // `month` || `months`
            return mega.icu.format(l.months_chat_history_plural, months);
        case RETENTION_FORMAT.WEEKS:
            // `week` || `weeks`
            return mega.icu.format(l.weeks_chat_history_plural, days / 7);
        case RETENTION_FORMAT.DAYS:
            // `day` || `days`
            return mega.icu.format(l.days_chat_history_plural, days);
        case RETENTION_FORMAT.HOURS:
            // `hour` || `hours`
            return mega.icu.format(l.hours_chat_history_plural, hours);
    }
};

/**
 * setRetention
 * @description Sets the retention time for given chat room.
 * @param {String} time The retention time
 * @param {Boolean} [isHours] Optional flag to indicate that the retention time is in hours
 * @returns {void}
 */

ChatRoom.prototype.setRetention = function(time) {
    asyncApiReq({
        "a": "mcsr", // mega chat set retention
        "id": this.chatId,
        "d": time, // duration in seconds, a value <= 0 turns the feature off
        "ds": 1 // flag to indicate `d` is in seconds, instead of days (optional, for testing purposes ONLY)
    });
};

ChatRoom.prototype.removeMessagesByRetentionTime = function() {
    var self = this;
    var messages = self.messagesBuff.messages;
    if (messages.length === 0 || this.retentionTime === 0) {
        return;
    }

    var newest = messages.getItem(messages.length - 1);
    var lowestValue = newest.orderValue;
    var deleteFrom = null;
    var lastMessage = null;
    var deletePreviousTo = (new Date() - self.retentionTime * 1000) / 1000;

    let cp = self.megaChat.plugins.chatdIntegration.chatd.chatdPersist;

    var finished = false;
    if (typeof cp !== 'undefined') {
        var done = function(message) {
            if (message) {
                if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
                    self.messagesBuff._removeMessagesBefore(message.messageId);
                }

                cp.removeMessagesBefore(
                    self.chatId,
                    message.orderValue
                );
            }
        };

        if (newest.delay < deletePreviousTo) {
            // newest message is older then the retention time set, clear all history for this chat
            cp.clearChatHistoryForChat(
                self.chatId
            );
            return;
        }

        var removeMsgs = function() {
            cp._paginateMessages(
                lowestValue,
                Chatd.MESSAGE_HISTORY_LOAD_COUNT,
                self.chatId
            )
                .then(function(messages) {
                    messages = messages[0];

                    if (messages.length) {
                        for (let i = 0; i < messages.length; i++) {
                            let message = messages[i];
                            if (message.msgObject.delay < deletePreviousTo) {
                                deleteFrom = lastMessage || message;
                                break;
                            }
                            lastMessage = message;
                            lowestValue = message.orderValue;
                        }
                    }
                    else {
                        finished = true;
                    }

                    if (!finished && !deleteFrom) {
                        onIdle(removeMsgs);
                    }
                    else {
                        done(deleteFrom);
                    }
                });
        };
        removeMsgs();
    }
    if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
        var message;
        while ((message = self.messagesBuff.messages.getItem(0))) {
            if (message.delay < deletePreviousTo) {
                if (!self.messagesBuff.messages.removeByKey(message.messageId)) {
                    break;
                }
            }
            else {
                break;
            }
        }
    }
};

ChatRoom.prototype.isOnline = function() {
    var shard = this.chatd.shards[this.chatShard];
    return shard ? shard.isOnline() : false;
};

ChatRoom.prototype.isOnlineForCalls = function() {
    var chatdChat = this.getChatIdMessages();
    if (!chatdChat) {
        return false;
    }
    return chatdChat.loginState() >= LoginState.HISTDONE;
};

/**
 * Check whether a chat is archived or not.
 *
 * @returns {Boolean}
 */
ChatRoom.prototype.isArchived = function() {
    var self = this;
    return (self.flags & ChatRoom.ARCHIVED);
};

/**
 * Check whether a chatRoom is in anonymous view
 *
 * @returns {Boolean}
 */
ChatRoom.prototype.isAnonymous = function() {
    return is_chatlink && this.type === "public" && this.publicChatHandle &&
        this.publicChatKey && this.publicChatHandle === megaChat.initialPubChatHandle;
};

/**
 * Check whether a chat is displayable.
 *
 * @returns {Boolean}
 */
ChatRoom.prototype.isDisplayable = function() {
    var self = this;
    return self.showArchived === true || !self.isArchived() || self.activeCall;
};

/**
 * Save chat into info fmdb.
 *
 */
ChatRoom.prototype.persistToFmdb = function() {
    var self = this;
    if (fmdb) {
        var users = [];
        if (self.members) {
            Object.keys(self.members).forEach(function(user_handle) {
                users.push({
                    u: user_handle,
                    p: self.members[user_handle]
                });
            });
        }
        if (self.chatId && self.chatShard !== undefined) {
            var roomInfo = {
                'id': self.chatId,
                'cs': self.chatShard,
                'g': self.type === "group" || self.type === "public" ? 1 : 0,
                'u' : users,
                'ts': self.ctime,
                'ct': self.ct,
                'ck': self.ck ? self.ck : null,
                'f' : self.flags,
                'm' : self.type === "public" ? 1 : 0,
            };

            fmdb.add('mcf', {id: roomInfo.id, d: roomInfo});
        }
    }
};

/**
 * Save the chat info into fmdb.
 * @param f {binary} new flags
 * @param updateUI {Boolen} flag to indicate whether to update UI.
 */
ChatRoom.prototype.updateFlags = function(f, updateUI) {
    var self = this;
    var flagChange = (self.flags !== f);
    self.flags = f;
    self.archivedSelected = false;
    if (self.isArchived()) {
        megaChat.archivedChatsCount++;
        self.showArchived = false;
    }
    else {
        megaChat.archivedChatsCount--;
    }
    self.persistToFmdb();


    if (updateUI && flagChange) {
        if (megaChat.currentlyOpenedChat &&
            megaChat.chats[megaChat.currentlyOpenedChat] &&
            megaChat.chats[megaChat.currentlyOpenedChat].chatId === self.chatId) {
            loadSubPage('fm/chat/');
        }
        else {
            megaChat.refreshConversations();
        }

        if (megaChat.$conversationsAppInstance) {
            megaChat.safeForceUpdate();
        }
    }
    this.trackDataChange();
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
            (newState === ChatRoom.STATE.JOINING && isRecover) ||
            (newState === ChatRoom.STATE.INITIALIZED && isRecover) ||
            newState > self.state,
            'Invalid state change. Current:'
            + ChatRoom.stateToText(self.state)
            +  "to"
            + ChatRoom.stateToText(newState)
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
 * Get all participants in a chat room.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getParticipants = function() {
    var self = this;

    return Object.keys(self.members);
};

/**
 * Get a list of the current participants for this room, excluding my handle (or if provided, userHandles
 * would be used instead of the current room participants).
 *
 * @param [userHandles] {Array}
 * @returns {Array}
 */
ChatRoom.prototype.getParticipantsExceptMe = function(userHandles) {
    var res = clone(userHandles || this.getParticipants());
    array.remove(res, u_handle, true);
    return res;
};

/**
 * getParticipantsTruncated
 * @description Returns comma-separated string of truncated member names based on passed room; allows to specify the
 * maximum amount of members to be retrieved, as well the desired maximum length for the truncation.
 * @param {number} maxMembers The maximum amount of members to be retrieved
 * @param {number} maxLength The maximum length of characters for the truncation
 * @returns {string}
 */

ChatRoom.prototype.getParticipantsTruncated = function(maxMembers, maxLength) {
    maxMembers = maxMembers || 5;
    maxLength = maxLength || 30;
    var truncatedParticipantNames = [];

    const members =  Object.keys(this.members);
    for (var i = 0; i < members.length; i++) {
        var handle = members[i];
        var name = M.getNameByHandle(handle);

        if (!handle || !name || handle === u_handle) {
            continue;
        }

        if (i > maxMembers) {
            break;
        }

        truncatedParticipantNames.push(
            name.length > maxLength ? name.substr(0, maxLength) + '...' : name
        );
    }

    if (truncatedParticipantNames.length === maxMembers) {
        truncatedParticipantNames.push('...');
    }

    return truncatedParticipantNames.join(', ');
};

/**
 * Get room title
 *
 * @param {Boolean} [ignoreTopic] ignore the topic and just return member names
 * @param {Boolean} [encapsTopicInQuotes] add quotes for the returned topic
 * @returns {string}
 */
ChatRoom.prototype.getRoomTitle = function(ignoreTopic, encapsTopicInQuotes) {
    var self = this;
    var participants;
    if (self.type === "private") {
        participants = self.getParticipantsExceptMe();
        return M.getNameByHandle(participants[0]) || "";
    }
    else {
        if (!ignoreTopic && self.topic && self.topic.substr) {
            return (encapsTopicInQuotes ? '"' : "") + self.getTruncatedRoomTopic() + (encapsTopicInQuotes ? '"' : "");
        }

        var names = self.getParticipantsTruncated();
        var def = l[19077].replace('%s1', new Date(self.ctime * 1000).toLocaleString());

        return names.length > 0 ? names : def;
    }
};

/**
 * getTruncatedRoomTopic
 * @description Returns truncated room topic based on the passed maximum character length.
 * @param {number} maxLength The maximum length of characters for the truncation
 * @returns {string}
 */

ChatRoom.prototype.getTruncatedRoomTopic = function(maxLength) {
    maxLength = maxLength || 30;
    return this.topic && this.topic.length > maxLength ? this.topic.substr(0, maxLength) + '...' : this.topic;
};

/**
 * Set the room topic
 * @param {String} newTopic
 * @param allowEmpty
 */
ChatRoom.prototype.setRoomTitle = function(newTopic, allowEmpty) {
    var self = this;
    newTopic = allowEmpty ? newTopic : String(newTopic);
    var masterPromise = new MegaPromise();

    if (
        (allowEmpty || newTopic.trim().length > 0) &&
        newTopic !== self.getRoomTitle()
    ) {
        self.scrolledToBottom = true;


        var participants = self.protocolHandler.getTrackedParticipants();
        var promises = [];
        promises.push(
            ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
        );
        var _runUpdateTopic = function() {
            // self.state.value
            var topic = self.protocolHandler.embeddedEncryptTo(
                newTopic,
                strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                participants,
                undefined,
                self.type === "public"
            );

            if (topic) {
                masterPromise.linkDoneAndFailTo(
                    asyncApiReq({
                        "a":"mcst",
                        "id":self.chatId,
                        "ct":base64urlencode(topic),
                        "v": Chatd.VERSION
                    })
                );
            }
            else {
                masterPromise.reject();
            }
        };
        MegaPromise.allDone(promises).done(
            function () {
                _runUpdateTopic();
            }
        );
        return masterPromise;
    }
    else {
        return false;
    }
};

/**
 * Leave this chat room
 *
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 * @returns {undefined|Deferred}
 */
ChatRoom.prototype.leave = function(triggerLeaveRequest) {
    var self = this;

    self._leaving = true;
    self._closing = triggerLeaveRequest;
    self.topic = null;


    if (triggerLeaveRequest) {
        if (self.type === "group" || self.type === "public") {
            self.trigger('onLeaveChatRequested');
        }
        else {
            self.logger.error("Can't leave room of type: " + self.type);
            return;
        }
    }


    if (self.roomId.indexOf("@") != -1) {
        if (self.state !== ChatRoom.STATE.LEFT) {
            self.setState(ChatRoom.STATE.LEAVING);
            self.setState(ChatRoom.STATE.LEFT);
        }
        else {
            return;
        }
    }
    else {
        self.setState(ChatRoom.STATE.LEFT);
    }
};

/**
 * Archive this chat room
 *
 */
ChatRoom.prototype.archive = function() {
    var self = this;
    var mask = 0x01;
    var flags = ChatRoom.ARCHIVED;

    asyncApiReq({
        'a' : 'mcsf',
        'id': self.chatId,
        'm' : mask,
        'f' : flags,
        'v' : Chatd.VERSION}
        )
        .done(function(r) {
            if (r === 0) {
                self.updateFlags(flags, true);
            }
        });
};

/**
 * Unarchive this chat room
 *
 */
ChatRoom.prototype.unarchive = function() {
    var self = this;
    var mask = 0x01;
    var flags = 0x00;

    asyncApiReq({
        'a': 'mcsf',
        'id': self.chatId,
        'm':mask, 'f':flags,
        'v': Chatd.VERSION}
        )
        .done(function(r) {
            if (r === 0) {
                self.updateFlags(flags, true);
            }
        });
};

/**
 * Destroy a room (leave + UI destroy + js cleanup)
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 */
ChatRoom.prototype.destroy = function(notifyOtherDevices, noRedirect) {
    var self = this;

    self.megaChat.trigger('onRoomDestroy', [self]);
    var mc = self.megaChat;
    var roomJid = self.roomId;

    if (!self.stateIsLeftOrLeaving()) {
        self.leave(notifyOtherDevices);
    }
    else if (self.type === "public" && self.publicChatHandle) {
        if (typeof self.members[u_handle] === 'undefined') {
            self.megaChat.plugins.chatdIntegration.handleLeave(self);
        }
    }

    if (self.isCurrentlyActive) {
        self.isCurrentlyActive = false;
    }

    Soon(function() {
        mc.chats.remove(roomJid);

        if (!noRedirect && u_type === 3) {
            loadSubPage('fm/chat');
        }
    });
};

/**
 * Create a public handle of a chat
 * @param [d] {boolean|undefined} if d is specified, then it will delete the public chat link.
 * @param [callback] {function} call back function.
 */
ChatRoom.prototype.updatePublicHandle = function(d, callback) {
    var self = this;

    return megaChat.plugins.chatdIntegration.updateChatPublicHandle(self.chatId, d, callback);
};


/**
 * Returns true if the current user is in the members list
 *
 * @returns {boolean}
 */
ChatRoom.prototype.iAmInRoom = function() {
    return !(!this.members.hasOwnProperty(u_handle) || this.members[u_handle] === -1);
};

/**
 * Join a chat via a public chat handle
 */
ChatRoom.prototype.joinViaPublicHandle = function() {
    var self = this;

    // Standalone page.
    if (!fminitialized && is_chatlink) {
        // is logged in?
        if (u_type) {
            return new Promise((res, rej) => {
                self.megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self)
                    .then(() => {
                        self.megaChat.routing.reinitAndOpenExistingChat(self.chatId, self.publicChatHandle)
                            .then(res, rej);
                    }, (ex) => {
                        console.error("Failed joining a chat room (u_type)", ex);
                        rej(ex);
                    });
            });
        }
        return;
    }
    if (!self.iAmInRoom() && self.type === "public" && self.publicChatHandle) {
        return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
    }
    return Promise.reject();
};

/**
 * Switch off the public mode of an open chat.
 */
ChatRoom.prototype.switchOffPublicMode = function() {
    var self = this;
    var participants = self.protocolHandler.getTrackedParticipants();
    var promises = [];
    promises.push(
        ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
    );
    var onSwitchDone = function() {
        self.protocolHandler.switchOffOpenMode();
    };

    var _runSwitchOffPublicMode = function() {
        // self.state.value
        var topic = null;
        if (self.topic) {
            topic = self.protocolHandler.embeddedEncryptTo(
                self.topic,
                strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                participants,
                true,
                false /* hardcoded to false, to ensure the encryption DOES includes keys in the new topic */
            );
            topic = base64urlencode(topic);

            asyncApiReq({
                a: 'mcscm',
                id: self.chatId,
                ct: topic,
                v: Chatd.VERSION
            })
                .done(onSwitchDone);
        }
        else {
            asyncApiReq({
                a: 'mcscm',
                id: self.chatId,
                v: Chatd.VERSION
            })
                .done(onSwitchDone);
        }
    };
    MegaPromise.allDone(promises).done(
        function () {
            _runSwitchOffPublicMode();
        }
    );

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

    if (d) {
        self.logger.debug(' ---- show');
    }

    $.tresizer();
    onIdle(function() {
        self.scrollToChat();
        self.trackDataChange();
    });
    self.isCurrentlyActive = true;
    self.lastShownInUI = Date.now();
    self.showArchived = self.isArchived();
    self.megaChat.setAttachments(self.roomId);
    self.megaChat.lastOpenedChat = self.roomId;
    self.megaChat.currentlyOpenedChat = self.roomId;

    self.trigger('activity');
    self.trigger('onChatShown');

    var tmp = self.megaChat.domSectionNode;

    if (self.type === 'public') {
        tmp.classList.remove('privatechat');
    }
    else {
        tmp.classList.add('privatechat');
    }

    if ((tmp = tmp.querySelector('.conversation-panels'))) {
        tmp.classList.remove('hidden');

        if ((tmp = tmp.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]'))) {
            tmp.classList.remove('hidden');
        }
    }

    if ((tmp = document.getElementById('conversation_' + self.roomId))) {
        // do not wait for ConversationsListItem to set the active class..
        tmp.classList.add('active');
    }
};

ChatRoom.prototype.scrollToChat = function() {
    this._scrollToOnUpdate = true;

    if (megaChat.$chatTreePanePs) {
        var li = document.querySelector('ul.conversations-pane li#conversation_' + this.roomId);
        if (li) {
            var pos = li.offsetTop;
            if (!verge.inViewport(li, -72 /* 2 x 36 px height buttons */)) {
                var treePane = document.querySelector('.conversationsApp .fm-tree-panel');
                var wrapOuterHeight = $(treePane).outerHeight();
                var itemOuterHeight = $('li:first', treePane).outerHeight();
                megaChat.$chatTreePanePs.doProgramaticScroll(
                    Math.max(0, pos - wrapOuterHeight / 2 + itemOuterHeight),
                    true
                );
                this._scrollToOnUpdate = false;
            }
        }
    }
};

/**
 * Returns true/false if the current room is currently active (e.g. visible)
 */
ChatRoom.prototype.isActive = function() {
    return document.hasFocus() && this.isCurrentlyActive;
};

/**
 * Shows the current room (changes url if needed)
 */
ChatRoom.prototype.setActive = function() {
    loadSubPage(this.getRoomUrl());
};

/**
 * Returns true if messages are still being retrieved from chatd OR in decrypting state
 * (e.g. nothing to render in the messages history pane yet)
 * @returns {MegaPromise|boolean}
 */
ChatRoom.prototype.isLoading = function() {
    var mb = this.messagesBuff;
    return mb.messagesHistoryIsLoading() || mb.isDecrypting;
};

/**
 * Returns relative url for this room
 *
 * @param {boolean} getRawLink ture/false to return the raw link to fm/chat/c/... and ignore the is_chatlink flag
 * @returns {string}
 */
ChatRoom.prototype.getRoomUrl = function(getRawLink) {
    var self = this;

    if (self.type === "private") {
        var participants = self.getParticipantsExceptMe();
        var contact = M.u[participants[0]];
        if (contact) {
            return "fm/chat/p/" + contact.u;
        }
    }
    else if (!getRawLink && is_chatlink && self.type === "public" && self.publicChatHandle && self.publicChatKey) {
        return "chat/" + self.publicChatHandle + "#" + self.publicChatKey;
    }
    else if (self.type === "public") {
        return "fm/chat/c/" + self.roomId;
    }
    else if (self.type === "group" || self.type === "public") {
        return "fm/chat/g/" + self.roomId;
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

    loadSubPage(self.getRoomUrl());
};

/**
 * Hide the UI elements of this room
 */
ChatRoom.prototype.hide = function() {
    var self = this;

    if (d) {
        self.logger.debug(' ---- hide', self.isCurrentlyActive);
    }
    self.isCurrentlyActive = false;
    self.lastShownInUI = Date.now();

    if (self.megaChat.currentlyOpenedChat === self.roomId) {
        self.megaChat.currentlyOpenedChat = null;
    }

    var tmp = self.megaChat.domSectionNode.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]');
    if (tmp) {
        tmp.classList.add('hidden');
    }

    if ((tmp = document.getElementById('conversation_' + self.roomId))) {
        // do not wait for ConversationsListItem to remove the active class..
        tmp.classList.remove('active');
    }

    self.trigger('onChatHidden', self.isCurrentlyActive);
};

/**
 * Append message to the UI of this room.
 * Note: This method will also log the message, so that later when someone asks for message sync this log will be used.
 *
 * @param message {Message|ChatDialogMessage}
 * @returns {boolean}
 */
ChatRoom.prototype.appendMessage = function(message) {
    var self = this;

    if (message.deleted) { // deleted messages should not be .append-ed
        return false;
    }

    if (message.getFromJid && message.getFromJid() === self.roomId) {
        return false; // dont show any system messages (from the conf room)
    }

    if (self.shownMessages[message.messageId]) {
        return false;
    }
    if (!message.orderValue) {
        var mb = self.messagesBuff;
        // append at the bottom
        if (mb.messages.length > 0) {
            var prevMsg = mb.messages.getItem(mb.messages.length - 1);
            if (!prevMsg) {
                self.logger.error(
                    'self.messages got out of sync...maybe there are some previous JS exceptions that caused that? ' +
                    'note that messages may be displayed OUT OF ORDER in the UI.'
                );
            }
            else {
                var nextVal = prevMsg.orderValue + 0.1;
                if (!prevMsg.sent) {
                    var cid = megaChat.plugins.chatdIntegration.chatd.chatIdMessages[self.chatIdBin];
                    if (cid && cid.highnum) {
                        nextVal = ++cid.highnum;
                    }
                }
                message.orderValue = nextVal;
            }
        }
    }

    message.source = Message.SOURCE.SENT;

    self.trigger('onMessageAppended', message);
    self.messagesBuff.messages.push(message);

    self.shownMessages[message.messageId] = true;
};


/**
 * Returns the actual DOM Element from the Mega's main navigation (tree) that is related to this chat room.
 *
 * @returns {*|jQuery|HTMLElement}
 */
ChatRoom.prototype.getNavElement = function() {
    var self = this;

    return $('.nw-conversations-item[data-room-id="' + self.chatId + '"]');
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
ChatRoom.prototype.sendMessage = function(message) {
    var self = this;
    var megaChat = this.megaChat;
    var messageId = megaChat.generateTempMessageId(self.roomId, message);

    var msgObject = new Message(
        self,
        self.messagesBuff,
        {
            'messageId': messageId,
            'userId': u_handle,
            'message': message,
            'textContents': message,
            'delay': unixtime(),
            'sent': Message.STATE.NOT_SENT
        }
    );


    self.trigger('onSendMessage');

    self.appendMessage(msgObject);

    self._sendMessageToTransport(msgObject)
        .done(function(internalId) {
            msgObject.internalId = internalId;
            msgObject.orderValue = internalId;
        });
};

/**
 * This method will:
 * - eventually (if the user is connected) try to send this message to the chatd server
 * - mark the message as sent or unsent (if the user is not connected)
 *
 * @param messageObject {Message}
 */
ChatRoom.prototype._sendMessageToTransport = function(messageObject) {
    var self = this;
    var megaChat = this.megaChat;

    megaChat.trigger('onPreBeforeSendMessage', messageObject);
    megaChat.trigger('onBeforeSendMessage', messageObject);
    megaChat.trigger('onPostBeforeSendMessage', messageObject);

    return megaChat.plugins.chatdIntegration.sendMessage(
        self,
        messageObject
    );
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

    if (self.type === "public") {
        nodeids.forEach(function (nodeId) {
            promises.push(
                asyncApiReq({'a': 'mcga', 'n': nodeId, 'u': strongvelope.COMMANDER, 'id': self.chatId, 'v': Chatd.VERSION})
            );
        });
    }
    else {
        users.forEach(function (uh) {
            nodeids.forEach(function (nodeId) {
                promises.push(
                    asyncApiReq({'a': 'mcga', 'n': nodeId, 'u': uh, 'id': self.chatId, 'v': Chatd.VERSION})
                );
            });
        });
    }

    return MegaPromise.allDone(promises);
};


/**
 * Attach/share (send as message) file/folder nodes to the chat
 * @param {Array|String} nodes ufs-node handle, or an array of them.
 * @returns {Promise}
 */
ChatRoom.prototype.attachNodes = mutex('chatroom-attach-nodes', function _(resolve, reject, nodes) {
    var i;
    var step = 0;
    var users = [];
    var self = this;
    var copy = Object.create(null);
    var send = Object.create(null);
    var members = self.getParticipantsExceptMe();
    var attach = promisify(function(resolve, reject, nodes) {
        console.assert(self.type === 'public' || users.length, 'No users to send to?!');

        self._sendNodes(nodes, users).then(function() {
            for (var i = nodes.length; i--;) {
                var n = M.getNodeByHandle(nodes[i]);
                console.assert(n.h, 'wtf..');

                if (n.h) {
                    // 1b, 1b, JSON
                    self.sendMessage(
                        Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
                        Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT +
                        JSON.stringify([
                            {
                                h: n.h, k: n.k, t: n.t, s: n.s, fa: n.fa, ts: n.ts, hash: n.hash, name: n.name
                            }
                        ])
                    );
                }
            }
            resolve();
        }).catch(reject);
    });

    var done = function() {
        if (--step < 1) {
            resolve();
        }
    };
    var fail = function(ex) {
        if (d) {
            _.logger.error(ex);
        }
        done();
    };

    if (d && !_.logger) {
        _.logger = new MegaLogger('attachNodes', {}, self.logger);
    }

    for (i = members.length; i--;) {
        var usr = M.getUserByHandle(members[i]);
        if (usr.u) {
            users.push(usr.u);
        }
    }

    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }

    for (i = nodes.length; i--;) {
        var n = M.getNodeByHandle(nodes[i]);
        (n && (n.u !== u_handle || M.getNodeRoot(n.h) === "shares") ? copy : send)[n.h] = 1;
    }
    copy = Object.keys(copy);
    send = Object.keys(send);

    if (d) {
        _.logger.debug('copy:%d, send:%d', copy.length, send.length, copy, send);
    }

    if (send.length) {
        step++;
        attach(send).then(done).catch(fail);
    }

    if (copy.length) {
        step++;
        M.myChatFilesFolder.get(true)
            .then(function(target) {
                var rem = [];
                var c = Object.keys(M.c[target.h] || {});

                for (var i = copy.length; i--;) {
                    var n = M.getNodeByHandle(copy[i]);
                    console.assert(n.h, 'wtf..');

                    for (var y = c.length; y--;) {
                        var b = M.getNodeByHandle(c[y]);

                        if (n.h === b.h || b.hash === n.hash) {
                            if (d) {
                                _.logger.info('deduplication %s:%s', n.h, b.h, [n], [b]);
                            }
                            rem.push(n.h);
                            copy.splice(i, 1);
                            break;
                        }
                    }
                }

                var next = function(res) {
                    if (!Array.isArray(res)) {
                        return fail(res);
                    }
                    const [h] = res;
                    res = [...rem, ...res];

                    if (!res.length) {
                        // Something went wrong with copyNodes()?..
                        return fail('Nothing to attach...?!');
                    }

                    for (let i = res.length; i--;) {
                        const n = M.getNodeByHandle(res[i]);

                        if (n.fv) {

                            if (d) {
                                _.logger.info('Skipping file-version %s', n.h, n);
                            }
                            res.splice(i, 1);
                        }
                    }

                    if (h && !res.length) {
                        if (d) {
                            _.logger.info('Adding nothing but a file-version?..', h);
                        }
                        res = [h];
                    }

                    attach(res).then(done).catch(fail);
                };

                if (copy.length) {
                    M.copyNodes(copy, target.h, false, next).dump('attach-nodes');
                }
                else {
                    if (d) {
                        _.logger.info('No new nodes to copy.', [rem]);
                    }
                    next([]);
                }
            })
            .catch(fail);
    }

    if (!step) {
        if (d) {
            _.logger.warn('Nothing to do here...');
        }
        onIdle(done);
    }
});

ChatRoom.prototype.onUploadStart = function(data) {
    var self = this;

    if (d) {
        self.logger.debug('onUploadStart', data);
    }
};

ChatRoom.prototype.uploadFromComputer = function() {
    this.scrolledToBottom = true;
    $('#fileselect1').trigger('click');
};

/**
 * Attach/share (send as message) contact details
 * @param ids {Array} list of contact identifiers
 * @returns {void}
 */

ChatRoom.prototype.attachContacts = function(ids) {
    for (let i = 0; i < ids.length; i++) {
        const nodeId = ids[i];
        const node = M.u[nodeId];

        // 1b, 1b, JSON
        this.sendMessage(
            Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
            Message.MANAGEMENT_MESSAGE_TYPES.CONTACT +
            JSON.stringify([{
                u: node.u,
                email: node.m,
                name: node.name || node.m
            }])
        );
    }
};


/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */
ChatRoom.prototype.getMessageById = function(messageId) {
    var self = this;
    var msgs = self.messagesBuff.messages;
    var msgKeys = msgs.keys();
    for (var i = 0; i < msgKeys.length; i++) {
        var k = msgKeys[i];
        var v = msgs[k];
        if (v && v.messageId === messageId) {
            return v;
        }
    }
    return false;
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

    self.callRequest = null;
    if (self.state !== ChatRoom.STATE.LEFT) {
        self.membersLoaded = false;
        self.setState(ChatRoom.STATE.JOINING, true);
        self.megaChat.trigger("onRoomCreated", [self]); // re-initialise plugins
        return MegaPromise.resolve();
    }
    else {
        return MegaPromise.reject();
    }
};

ChatRoom._fnRequireParticipantKeys = function(fn, scope) {
    var origFn = fn;
    return function() {
        var self = scope || this;
        var args = toArray.apply(null, arguments);
        var participants = self.protocolHandler.getTrackedParticipants();

        return ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
            .done(function() {
                origFn.apply(self, args);
            })
            .fail(function() {
                self.logger.error("Failed to retr. keys.");
            });
    };
};

ChatRoom.prototype.showMissingUnifiedKeyDialog = function() {
    return (
        msgDialog(
            `warningb:!^${l[82] /* `Cancel` */}!${l[23433] /* `Reload your account` */}`,
            null,
            l[200] /* `Oops, something went wrong.` */,
            'An error occurred while trying to join this call. Reloading MEGAchat may fix the problem. If the ' +
            'problem persists, please contact support@mega.nz',
            reload => reload ? M.reload() : null,
            1
        )
    );
};

ChatRoom.prototype.hasInvalidKeys = function() {
    if (!is_chatlink && this.type === 'public') {
        const { unifiedKey } = this.protocolHandler || {};
        if (
            !unifiedKey || (unifiedKey && unifiedKey.length !== 16) ||
            !this.ck || (this.ck && this.ck.length !== 32)
        ) {
            console.error('Error instantiating room/call -- missing `unifiedKey`/malformed `ck` for public chat.');
            const { master, slaves } = mBroadcaster.crossTab;
            eventlog(
                99751,
                JSON.stringify([
                    1,
                    buildVersion.version || 'dev',
                    String(this.chatId).length | 0,
                    this.type | 0,
                    this.isMeeting | 0,
                    typeof unifiedKey,
                    String(unifiedKey || '').length | 0,
                    typeof this.ck,
                    String(this.ck).length | 0,
                    (!!master) | 0,
                    Object(slaves).length | 0])
            );
            return true;
        }
    }
    return false;
};

ChatRoom.prototype.joinCall = ChatRoom._fnRequireParticipantKeys(function(audio, video, callId) {
    if (this.activeCallIds.length === 0) {
        return;
    }
    if (!megaChat.hasSupportForCalls) {
        return;
    }
    if (this.meetingsLoading) {
        return;
    }
    if (this.hasInvalidKeys()) {
        return this.showMissingUnifiedKeyDialog();
    }

    this.meetingsLoading = l.joining /* `Joining` */;

    this.rebind("onCallLeft.start", (e, data) => {
        if (data.callId === callId) {
            // ensure that the Loading/Joining/Starting overlay is removed if the call ended
            // (or had failed to start)
            this.meetingsLoading = false;
        }
    });

    callId = callId || this.activeCallIds.keys()[0];
    return asyncApiReq({'a': 'mcmj', 'cid': this.chatId, "mid": callId})
        .then((r) => {
            var app = new SfuApp(this, callId);
            window.sfuClient = app.sfuClient = new SfuClient(
                u_handle,
                app,
                (
                    this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC &&
                    str_to_ab(this.protocolHandler.unifiedKey)
                ),
                {
                    'speak': true,
                    'moderator': true
                },
                r.url.replace("https://", "wss://")
            );
            app.sfuClient.muteAudio(!audio);
            app.sfuClient.muteCamera(!video);
            return app.sfuClient.connect(r.url, callId, {isGroup: this.type !== "private"});
        }, ex => {
            console.error('Failed to join call:', ex);
            this.meetingsLoading = false;
            this.unbind("onCallLeft.start");
        });

});


ChatRoom.prototype.rejectCall = function(callId) {
    if (this.activeCallIds.length === 0) {
        return;
    }

    callId = callId || this.activeCallIds.keys()[0];

    if (this.type === "private") {
        return asyncApiReq({
            'a': 'mcme',
            'cid': this.chatId,
            'mid': callId
        });
    }
    return Promise.resolve();
};

ChatRoom.prototype.endCallForAll = function(callId) {
    if (this.activeCallIds.length && this.type !== 'private') {
        callId = callId || this.activeCallIds.keys()[0];
        asyncApiReq({
            'a': 'mcme',
            'cid': this.chatId,
            'mid': callId
        });
        eventlog(99761, JSON.stringify([this.chatId, callId, this.isMeeting | 0]));
    }
};

/**
 * Used in "chat link" pages to join the user before joining the call if needed.
 *
 * @param {boolean} audioFlag
 * @param {boolean} videoFlag
 */
ChatRoom.prototype.joinCallFromLink = function(audioFlag, videoFlag) {
    loadingDialog.show();
    if (this.iAmInRoom()) {
        this.joinCall(audioFlag, videoFlag);
        loadingDialog.hide();
    }
    else {
        this.joinViaPublicHandle()
            .then(() => {
                this.joinCall(audioFlag, videoFlag);
            })
            .catch(() => {
                console.error("Joining failed.");
            })
            .always(function() {
                loadingDialog.hide();
            });
    }
};

ChatRoom.prototype.startAudioCall = ChatRoom._fnRequireParticipantKeys(function() {
    return this.startCall(true, false);
});
ChatRoom.prototype.startVideoCall = ChatRoom._fnRequireParticipantKeys(function() {
    return this.startCall(true, true);
});
ChatRoom.prototype.startCall = ChatRoom._fnRequireParticipantKeys(function(audio, video) {
    if (!megaChat.hasSupportForCalls || this.meetingsLoading) {
        return;
    }

    if (this.activeCallIds.length > 0) {
        this.joinCall(this.activeCallIds.keys()[0]);
        return;
    }

    if (this.hasInvalidKeys()) {
        return this.showMissingUnifiedKeyDialog();
    }

    this.meetingsLoading = l.starting /* `Starting` */;

    const opts = {'a': 'mcms', 'cid': this.chatId};
    if (localStorage.sfuId) {
        opts.sfu = parseInt(localStorage.sfuId, 10);
    }

    asyncApiReq(opts)
        .then((r) => {
            var app = new SfuApp(this, r.callId);
            window.sfuClient = app.sfuClient = new SfuClient(
                u_handle,
                app,
                (
                    this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC &&
                    str_to_ab(this.protocolHandler.unifiedKey)
                ),
                {
                    'speak': true,
                    'moderator': true
                },
                r.sfu.replace("https://", "wss://")
            );
            app.sfuClient.muteAudio(!audio);
            app.sfuClient.muteCamera(!video);

            this.rebind("onCallLeft.start", (e, data) => {
                if (data.callId === r.callId) {
                    this.meetingsLoading = false;
                }
            });
            // r.callId
            sfuClient.connect(r.sfu.replace("https://", "wss://"), r.callId, {isGroup: this.type !== "private"});
        }, ex => {
            console.error('Failed to start call:', ex);
            this.meetingsLoading = false;
            this.unbind("onCallLeft.start");
        });
});


ChatRoom.prototype.stateIsLeftOrLeaving = function() {
    return (
        this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING ||
        (
            /* Chatlinks don't receive members list from API, so we trust chatd */
            (
                !is_chatlink  &&
                this.state === ChatRoom.STATE.READY && this.membersSetFromApi &&
                !this.membersSetFromApi.members.hasOwnProperty(u_handle)
            ) || (
                /* if its a chatlink, trust chatd members list */
                is_chatlink && !this.members.hasOwnProperty(u_handle)
            )
        )
    );
};

ChatRoom.prototype._clearChatMessagesFromChatd = function() {
    this.chatd.shards[this.chatShard].retention(
        base64urldecode(this.chatId), 1
    );
};

ChatRoom.prototype.isReadOnly = function() {
    // check if still contacts.
    if (this.type === "private") {
        var members = this.getParticipantsExceptMe();
        if (members[0] && !M.u[members[0]].c) {
            return true;
        }
    }

    return (
        (this.members && this.members[u_handle] <= 0) ||
        (!this.members.hasOwnProperty(u_handle)) ||
        this.privateReadOnlyChat ||
        this.state === ChatRoom.STATE.LEAVING ||
        this.state === ChatRoom.STATE.LEFT
    );
};
ChatRoom.prototype.iAmOperator = function() {
    return this.type === "private" || this.members && this.members[u_handle] === 3;
};

/**
 * Internal, utility function that would mark all contacts in a chat (specially for group chats), that I'd interacted
 * with them.
 */
ChatRoom.prototype.didInteraction = function(user_handle, ts) {
    var self = this;
    var newTs = ts || unixtime();

    if (user_handle === u_handle) {
        Object.keys(self.members).forEach(function (user_handle) {
            var contact = M.u[user_handle];
            if (contact && user_handle !== u_handle && contact.c === 1) {
                setLastInteractionWith(contact.u, "1:" + newTs);
            }
        });
    }
    else {
        var contact = M.u[user_handle];
        if (contact && user_handle !== u_handle && contact.c === 1) {
            setLastInteractionWith(contact.u, "1:" + newTs);
        }
    }
};

ChatRoom.prototype.retrieveAllHistory = function() {
    var self = this;
    self.messagesBuff.retrieveChatHistory().done(function() {
        if (self.messagesBuff.haveMoreHistory()) {
            self.retrieveAllHistory();
        }
    });
};


ChatRoom.prototype.truncate = function() {
    var self = this;
    var chatMessages = self.messagesBuff.messages;
    if (chatMessages.length > 0) {
        var lastChatMessageId = null;
        var i = chatMessages.length - 1;
        while (lastChatMessageId == null && i >= 0) {
            var message = chatMessages.getItem(i);
            if (message instanceof Message && message.dialogType !== "truncated") {
                lastChatMessageId = message.messageId;
            }
            i--;
        }

        if (lastChatMessageId) {
            asyncApiReq({
                a: 'mct',
                id: self.chatId,
                m: lastChatMessageId,
                v: Chatd.VERSION
            })
                .fail(function(r) {
                    if (r === -2) {
                        msgDialog(
                            'warninga',
                            l[135],
                            l[8880]
                        );
                    }
                });
        }
    }
};

ChatRoom.prototype.getActiveCalls = function() {
    return this.activeCallIds.map((parts, id) => {
        return parts.indexOf(u_handle) > -1 ? id : undefined;
    });
};


ChatRoom.prototype.haveActiveCall = function() {
    return this.getActiveCalls().length > 0;
};

ChatRoom.prototype.haveActiveOnHoldCall = function() {
    let activeCallIds = this.getActiveCalls();
    for (var i = 0; i < activeCallIds.length; i++) {
        let call = megaChat.plugins.callManager2.calls[this.chatId + "_" + activeCallIds[i]];
        if (call && call.av & SfuClient.Av.onHold) {
            return true;
        }
    }
    return false;
};

ChatRoom.prototype.havePendingGroupCall = function() {
    if (this.type !== "group" && this.type !== "public") {
        return false;
    }
    return this.activeCallIds.length > 0;
};

/**
 * Returns whether there is a call in the room that we can answer (1on1 or group) or join (group)
 * This is used e.g. to determine whether to display a small handset icon in the notification area
 * for the room in the LHP
 */
ChatRoom.prototype.havePendingCall = function() {
    return this.activeCallIds.length > 0;
};

/**
 * Returns message id of the call started message that is currently active (optionally).
 * @param [ignoreActive] {Boolean} if not passed would skip the "active" check and just return last call started
 * @returns {Boolean}
 */
ChatRoom.prototype.getActiveCallMessageId = function(ignoreActive) {
    var self = this;
    if (!ignoreActive && !self.havePendingCall() && !self.haveActiveCall()) {
        return false;
    }

    var msgs = self.messagesBuff.messages;
    for (var i = msgs.length - 1; i >= 0; i--) {
        var msg = msgs.getItem(i);
        if (msg.dialogType === "remoteCallEnded") {
            // found remoteCallEnded before a call started...this doesn't make sense, halt.
            return false;
        }
        if (msg.dialogType === "remoteCallStarted") {
            return msg.messageId;
        }
    }
};

ChatRoom.prototype.stopRinging = function(callId) {
    if (this.ringingCalls.exists(callId)) {
        this.ringingCalls.remove(callId);
    }
    megaChat.plugins.callManager2.trigger("onRingingStopped", {
        callId: callId,
        chatRoom: this
    });
};
ChatRoom.prototype.callParticipantsUpdated = function(
    /* e, userid, clientid, participants */
) {
    var self = this;
    var msgId = self.getActiveCallMessageId();
    if (!msgId)  {
        // force last start call msg id to be retrieved.
        msgId = self.getActiveCallMessageId(true);
    }

    const callParts = self.getCallParticipants() || [];
    self.uniqueCallParts = {};
    for (let i = 0; i < callParts.length; i++) {
        self.uniqueCallParts[callParts[i]] = true;
    }

    var msg = self.messagesBuff.getMessageById(msgId);
    msg && msg.wrappedChatDialogMessage && msg.wrappedChatDialogMessage.trackDataChange();

    self.trackDataChange();
};

ChatRoom.prototype.onPublicChatRoomInitialized = function() {
    var self = this;

    if (self.type !== "public" || !localStorage.autoJoinOnLoginChat) {
        return;
    }

    var autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(localStorage.autoJoinOnLoginChat) || false;

    if (autoLoginChatInfo[0] === self.publicChatHandle) {
        localStorage.removeItem("autoJoinOnLoginChat");

        if (unixtime() - 2 * 60 * 60 < autoLoginChatInfo[1]) {
            var doJoinEventually = function(state) {
                if (state === ChatRoom.STATE.READY) {
                    self.joinViaPublicHandle();
                    self.unbind('onStateChange.' + self.publicChatHandle);
                }
            };

            self.rebind('onStateChange.' + self.publicChatHandle, function (e, oldState, newState) {
                doJoinEventually(newState);
            });

            doJoinEventually(self.state);
        }
    }
};

ChatRoom.prototype.isUIMounted = function() {
    return this._uiIsMounted;
};

ChatRoom.prototype.attachSearch = function() {
    this.activeSearches++;
};

ChatRoom.prototype.detachSearch = function() {
    if (--this.activeSearches === 0) {
        this.messagesBuff.detachMessages();
    }
    this.activeSearches = Math.max(this.activeSearches, 0);
    this.trackDataChange();
};

ChatRoom.prototype.scrollToMessageId = function(msgId, index, retryActive) {
    var self = this;
    if (!self.isCurrentlyActive && !retryActive) {
        // room not shown yet, retry only once again after 1.5s
        setTimeout(function() {
            self.scrollToMessageId(msgId, index, true);
        }, 1500);
        return;
    }

    assert(self.isCurrentlyActive, 'chatRoom is not visible');
    self.isScrollingToMessageId = true;

    if (!self.$rConversationPanel) {
        self.one('onHistoryPanelComponentDidMount.scrollToMsgId' + msgId, function() {
            self.scrollToMessageId(msgId, index);
        });
        return;
    }
    var ps = self.$rConversationPanel.messagesListScrollable;
    assert(ps);

    var msgObj = self.messagesBuff.getMessageById(msgId);
    if (msgObj) {
        var elem = $('.' + msgId + '.message.body')[0];
        self.scrolledToBottom = false;

        ps.scrollToElement(elem, true);

        // cleanup the stored old scroll position, so that the auto scroll won't scroll back to previous position
        // after all onResizes and componentDidUpdates
        self.$rConversationPanel.lastScrollPosition = undefined;
        self.isScrollingToMessageId = false;
    }
    else if (self.messagesBuff.isRetrievingHistory) {
        // wait for messages to be received
        self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function() {
            // wait for UI to update (so that the element is now available in the dom)
            self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function() {
                self.scrollToMessageId(msgId, index);
            });
        });
    }
    else if (self.messagesBuff.haveMoreHistory()) {
        self.messagesBuff.retrieveChatHistory(!index || index <= 0 ? undefined : index);
        ps.doProgramaticScroll(0, true);
        // wait for messages to be received
        self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function() {
            // wait for UI to update (so that the element is now available in the dom)
            self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function() {
                self.scrollToMessageId(msgId);
            });
        });
    }
    else {
        self.isScrollingToMessageId = false;
    }
};

window.ChatRoom = ChatRoom;

export default {
    'ChatRoom': ChatRoom
};
