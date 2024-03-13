import {prepareExportIo, prepareExportStreams} from "./utils.jsx";

export const RETENTION_FORMAT = { HOURS: 'hour', DAYS: 'day', WEEKS: 'week', MONTHS: 'month', DISABLED: 'none' };
export const MCO_FLAGS = { OPEN_INVITE: 'oi', SPEAK_REQUEST: 'sr', WAITING_ROOM: 'w' };
window.RETENTION_FORMAT = RETENTION_FORMAT;
window.MCO_FLAGS = MCO_FLAGS;

/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat {Chat}
 * @param roomId
 * @param type {String} only "private" is supported for now
 * @param users {Array}
 * @param ctime {Integer} unix time
 * @param [lastActivity] {Integer} unix time
 * @param {String} chatId  The chats id
 * @param {Number} chatShard This rooms chat shard id
 * @param {String} chatdUrl Websocket URL for chatd
 * @param {*} noUI Unused
 * @param {String} [publicChatHandle] the public chat handle
 * @param {String} [publicChatKey] the public chat key
 * @param {String} ck  the chat key
 * @param {Boolean} isMeeting Is the chat a meeting
 * @param {Number} retentionTime Message retention length (0 = forever)
 * @param {Object} mcoFlags Flags related to calls/chat room (Open invite, speak request, waiting room)
 * @returns {ChatRoom}
 * @constructor
 *
 * @property {MessagesBuff} messagesBuff
 */
var ChatRoom = function (megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI,
                         publicChatHandle, publicChatKey, ck, isMeeting, retentionTime, mcoFlags
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
            topic: '',
            flags: 0x00,
            publicLink: null,
            observers: 0,
            dnd: null,
            alwaysNotify: null,
            retentionTime: 0,
            activeCallIds: null,
            meetingsLoading: null,
            options: {},
            scheduledMeeting: undefined
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
    this.publicLink = null;
    this.publicChatHandle = publicChatHandle;
    this.publicChatKey = publicChatKey;
    this.ck = ck;

    this.scrolledToBottom = 1;

    this.callRequest = null;
    this.shownMessages = {};
    this.retentionTime = retentionTime;

    this.activeSearches = 0;
    this.activeCallIds = new MegaDataMap(this);
    this.ringingCalls = new MegaDataMap(this);
    this.ringingCalls.addChangeListener(() => {
        // force full re-render since basically, the root `Conversations` app may need to render/remove a dialog
        megaChat.safeForceUpdate();
    });

    this.isMeeting = isMeeting;

    this.members = Object.create(null);

    // @todo was lazy to replace all hasOwn()s...
    Object.defineProperty(this.members, 'hasOwnProperty', {
        value(p) {
            return p in this;
        }
    });

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

    this.options = {};

    mcoFlags = mcoFlags || {};
    for (const flag of Object.values(MCO_FLAGS)) {
        this.options[flag] = mcoFlags[flag] || 0;
    }

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

            if (d > 2) {
                self.logger.warn('Restoring persisted messages...', self.type, self.isCurrentlyActive);
            }

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

                if (is_chatlink) {
                    megaChat.initContacts([eventData.userId]);
                }
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
    if (is_chatlink && !is_chatlink.callId && !this.options.w) {
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
        }
        self.trackDataChange();
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

        if (timer) {
            timer.abort();
            timer = null;
        }
        self.unbind('onMarkAsJoinRequested.initHist');
        self.unbind('onHistoryDecrypted.initHist');
        self.unbind('onMessagesHistoryDone.initHist');

        self.megaChat.safeForceUpdate();
    };
    self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
    self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);

    self.rebind('onMarkAsJoinRequested.initHist', () => {
        (timer = tSleep(300)).then(() => {
            if (d) {
                self.logger.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
            }
            timer = null;
            _historyIsAvailable(false);
        });
    });

    self.rebind('onRoomDisconnected', () => {
        if (!self.call) {
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
ChatRoom.TOPIC_MAX_LENGTH = 30;
ChatRoom.SCHEDULED_MEETINGS_INTERVAL = 1.8e6; /* 30 minutes */

ChatRoom._fnRequireParticipantKeys = function(fn, scope) {
    return function(...args) {
        const participants = this.protocolHandler.getTrackedParticipants();

        return ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
            .then(() => {
                return fn.apply(scope || this, args);
            })
            .catch((ex) => {
                this.logger.error("Failed to retrieve keys..", ex);
            });
    };
};

ChatRoom.MembersSet = function(chatRoom) {
    this.chatRoom = chatRoom;
    this.members = {};
};

ChatRoom.MembersSet.PRIVILEGE_STATE = {
    NOT_AVAILABLE: -5,
    OPERATOR: 3,
    FULL: 2,
    READONLY: 0,
    LEFT: -1
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
            return l.disabled_chat_history_cleaning_status;
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
 * isDisplayable
 * @description Check whether a chat is displayable
 * @returns {boolean}
 */

ChatRoom.prototype.isDisplayable = function() {
    return !this.isArchived() || this.call;
};

ChatRoom.prototype.isMuted = function() {
    return pushNotificationSettings.getDnd(this.chatId) || pushNotificationSettings.getDnd(this.chatId) === 0;
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
 * @param updateUI {Boolean} flag to indicate whether to update UI.
 */
ChatRoom.prototype.updateFlags = function(f, updateUI) {
    var self = this;
    var flagChange = (self.flags !== f);
    self.flags = f;
    if (self.isArchived()) {
        megaChat.archivedChatsCount++;
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

ChatRoom.prototype.getParticipantsTruncated = function(maxMembers = 5, maxLength = ChatRoom.TOPIC_MAX_LENGTH) {
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
 * getRoomTitle
 * @description Returns the room's topic in i) formatted form if available; alternatively, falls back to
 * ii) list of participants or iii) room's creation date.
 *
 * ex.:
 * i)  `MEGA meeting`
 * ii) `Chat created on DD/MM/YYYY, HH:MM:SS`
 * iii) `Participant A, Participant B, Participant c, ...`
 *
 * @return {string} Formatted room title
 */

ChatRoom.prototype.getRoomTitle = function() {
    const formattedDate =
        l[19077 /* `Chat created on %s1` */].replace('%s1', new Date(this.ctime * 1000).toLocaleString());

    // 1-on-1 chat -> use other participant's name as a topic
    if (this.type === 'private') {
        const participants = this.getParticipantsExceptMe();
        return participants && Array.isArray(participants) ? M.getNameByHandle(participants[0]) : formattedDate;
    }

    // No topic set -> list the participant names or if there aren't any fallback to the room creation date
    if (this.topic === '' || !this.topic) {
        return this.getParticipantsTruncated() || formattedDate;
    }

    // Public chat -> formatted room topic, incl. appended `(canceled)` label for canceled scheduled meetings
    const formattedTopic = this.getTruncatedRoomTopic();
    const isCanceled = this.scheduledMeeting && this.scheduledMeeting.isCanceled;
    return isCanceled ? `${formattedTopic} ${l.canceled_meeting}` : formattedTopic;
};

/**
 * getTruncatedRoomTopic
 * @description Returns truncated room topic based on the passed maximum character length.
 * @param {number} maxLength The maximum length of characters for the truncation
 * @returns {string}
 */

ChatRoom.prototype.getTruncatedRoomTopic = function(maxLength = ChatRoom.TOPIC_MAX_LENGTH) {
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

    if (
        (allowEmpty || newTopic.trim().length > 0) &&
        newTopic !== self.getRoomTitle()
    ) {
        self.scrolledToBottom = true;
        var participants = self.protocolHandler.getTrackedParticipants();
        return ChatdIntegration._ensureKeysAreLoaded(undefined, participants).then(() => {
            // self.state.value
            var topic = self.protocolHandler.embeddedEncryptTo(
                newTopic,
                strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                participants,
                undefined,
                self.type === "public"
            );

            if (topic) {
                return asyncApiReq({a: "mcst", id: self.chatId, ct: base64urlencode(topic), v: Chatd.VERSION});
            }
        }).catch(dump);
    }
    else {
        return false;
    }
};

/**
 * Leave this chat room
 * @param {boolean} [notify] Boolean flag indicating whether to notify other clients. `mcr` action is **not** invoked
 * given a falsy value is passed.
 * @returns {undefined}
 */

ChatRoom.prototype.leave = function(notify) {
    assert(this.type === 'group' || this.type === 'public', `Can't leave room "${this.roomId}" of type "${this.type}"`);

    this._leaving = true;
    this.topic = '';

    if (notify) {
        this.trigger('onLeaveChatRequested');
    }

    if (this.state !== ChatRoom.STATE.LEFT) {
        this.setState(ChatRoom.STATE.LEAVING);
        this.setState(ChatRoom.STATE.LEFT);
    }
    if (this.activeCallIds.length) {
        for (const activeCallId of this.activeCallIds.keys()) {
            this.activeCallIds.remove(activeCallId);
        }
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
        .then((r) => {
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
        .then((res) => {
            if (res === 0) {
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
 * @param {Boolean} [remove] if specified, then it will delete the public chat link.
 * @param {Boolean} [cim] create chat link if missing
 * @returns {Promise<*>}
 */
ChatRoom.prototype.updatePublicHandle = async function(remove, cim) {
    if (!remove && this.publicLink) {
        return this.publicLink;
    }

    return asyncApiReq({a: 'mcph', id: this.chatId, v: Chatd.VERSION, cim: cim ? 1 : 0, d: remove ? 1 : undefined})
        .then((res) => {
            assert(remove && res === 0 || Array.isArray(res) && res[1].length === 8);
            this.publicLink = remove ? null : `chat/${res[1]}#${this.protocolHandler.getUnifiedKey()}`;
        })
        .catch((ex) => {
            this.logger.warn('updatePublicHandle', ex);
            this.publicLink = null;
        });
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
ChatRoom.prototype.switchOffPublicMode = ChatRoom._fnRequireParticipantKeys(function() {
    let {topic, protocolHandler, chatId} = this;

    if (topic) {
        topic = protocolHandler.embeddedEncryptTo(
            topic,
            strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
            protocolHandler.getTrackedParticipants(),
            true,
            false /* hardcoded to false, to ensure the encryption DOES include keys in the new topic */
        );
        topic = base64urlencode(topic);
    }

    return asyncApiReq({a: 'mcscm', id: chatId, ct: topic || undefined, v: Chatd.VERSION})
        .then(() => {
            protocolHandler.switchOffOpenMode();
        });
});

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
    const { $chatTreePanePs } = megaChat;
    if ($chatTreePanePs && $chatTreePanePs.length) {
        const li = document.querySelector(`ul.conversations-pane li#conversation_${this.roomId}`);
        if (li && !verge.inViewport(li, -72 /* 2 x 36 px height buttons */)) {
            Object.values($chatTreePanePs).forEach(({ ref }) => {
                const wrapOuterHeight = $(ref.domNode).outerHeight();
                const itemOuterHeight = $('li:first', ref.domNode).outerHeight();
                const pos = li.offsetTop;
                if (ref.domNode.contains(li)) {
                    ref.doProgramaticScroll?.(Math.max(0, pos - wrapOuterHeight / 2 + itemOuterHeight), true);
                }
            });
            this._scrollToOnUpdate = false;
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

    return self._sendMessageToTransport(msgObject)
        .then((internalId) => {
            // @todo Chatd.prototype.submit() may returns false, shouldn't we handle this ?!
            if (!internalId) {
                this.logger.warn(`Got unexpected(?) 'sendingnum'...`, internalId);
            }
            msgObject.internalId = internalId;
            msgObject.orderValue = internalId;
            return internalId || -0xBADF;
        })
        .catch((ex) => {
            this.logger.error(`sendMessage failed..`, msgObject, ex);
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

    return Promise.allSettled(promises);
};


/**
 * Attach/share (send as message) file/folder nodes to the chat
 * @param {Array|String} nodes ufs-node handle, or an array of them.
 * @param {Object} [names] in place node rename
 * @returns {Promise}
 */
ChatRoom.prototype.attachNodes = async function(nodes, names) {

    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }
    const handles = new Set();

    for (let i = nodes.length; i--;) {
        const n = nodes[i];
        const h = String(crypto_keyok(n) && n.h || n);

        if (!M.getNodeByHandle(h)) {
            handles.add(h);
        }
    }

    if (handles.size) {
        await dbfetch.acquire([...handles]);
    }

    return this._attachNodes(nodes, names);
};

// @private -- see {@link ChatRoom.attachNodes}
ChatRoom.prototype._attachNodes = mutex('chatroom-attach-nodes', function _(resolve, reject, nodes, names) {
    var i;
    var step = 0;
    var users = [];
    var self = this;
    let result = null;
    var copy = Object.create(null);
    var send = Object.create(null);
    let link = Object.create(null);
    let nmap = Object.create(null);
    var members = self.getParticipantsExceptMe();
    var attach = (nodes) => {
        console.assert(self.type === 'public' || users.length, 'No users to send to?!');

        return this._sendNodes(nodes, users).then(() => {
            for (var i = nodes.length; i--;) {
                const n = nmap[nodes[i]] || M.getNodeByHandle(nodes[i]);
                console.assert(n.h, `Node not found... ${nodes[i]}`);

                if (n.h) {
                    const name = names && (names[n.hash] || names[n.h]) || n.name;

                    // 1b, 1b, JSON
                    self.sendMessage(
                        Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
                        Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT +
                        JSON.stringify([
                            {
                                h: n.h, k: n.k, t: n.t, s: n.s, fa: n.fa, ts: n.ts, hash: n.hash, name
                            }
                        ])
                    );
                }
            }
        });
    };

    var done = function() {
        if (--step < 1) {
            nmap = null;
            resolve(result);
        }
    };
    var fail = function(ex) {
        if (ex === EBLOCKED) {
            // User didn't want to revoke FR.
            result = ex;
        }
        else if (d) {
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

    for (i = nodes.length; i--;) {
        const h = nodes[i];
        const n = crypto_keyok(h) ? h : M.getNodeByHandle(h);

        if (n.t) {
            link[n.h] = 1;
            continue;
        }

        if (n.hash) {
            nmap[n.hash] = n;

            if (names && names[n.h]) {
                names[n.hash] = names[n.h];
            }
        }

        let op = send;
        if (!n.ch && (n.u !== u_handle || M.getNodeRoot(n.h) === 'shares')) {
            op = copy;
        }

        op[n.h] = 1;
        nmap[n.h] = n;
    }
    copy = Object.keys(copy);
    send = Object.keys(send);
    link = Object.keys(link);

    if (d) {
        _.logger.debug('copy:%d, send:%d, link:%d', copy.length, send.length, link.length, copy, send, link);
    }

    if (link.length) {
        ++step;
        Promise.resolve(mega.fileRequestCommon.storage.isDropExist(link))
            .then((res) => {
                if (res.length) {
                    return mega.fileRequest.showRemoveWarning(res);
                }
            })
            .then(() => {
                const createLink = (h) => M.createPublicLink(h).then(({link}) => this.sendMessage(link));

                return Promise.all(link.map(createLink));
            })
            .then(done)
            .catch(fail);
    }

    if (send.length) {
        step++;
        attach(send).then(done).catch(fail);
    }

    if (copy.length) {
        step++;
        this._copyNodesToAttach(copy, nmap).then((res) => attach(res)).then(done).catch(fail);
    }

    if (!step) {
        if (d) {
            _.logger.warn('Nothing to do here...');
        }
        queueMicrotask(done);
    }
});

// @private -- see {@link ChatRoom.attachNodes}
ChatRoom.prototype._copyNodesToAttach = async function(copy, nmap) {
    const {h: target} = await M.myChatFilesFolder.get(true);

    if (!M.c[target]) {
        await dbfetch.get(target);
    }
    const dir = Object.keys(M.c[target] || {});
    const rem = [];

    for (let i = copy.length; i--;) {
        const n = nmap[copy[i]] || M.getNodeByHandle(copy[i]);
        console.assert(n.h, `Node not found.. ${copy[i]}`);

        for (let y = dir.length; y--;) {
            const b = M.getNodeByHandle(dir[y]);

            if (n.h === b.h || b.hash === n.hash) {
                if (d) {
                    this.logger.info('deduplication %s:%s', n.h, b.h, [n], [b]);
                }
                rem.push(n.h);
                copy.splice(i, 1);
                break;
            }
        }
    }

    let res = [];
    if (copy.length) {

        res = await M.copyNodes(copy, target);
    }
    else if (d) {

        this.logger.info('No new nodes to copy.', rem);
    }
    assert(Array.isArray(res), `Unexpected response, ${res && res.message || res}`, res);

    const [h] = res;
    res = [...rem, ...res];

    // Something went wrong with copyNodes()?..
    assert(res.length, 'Unexpected condition... nothing to attach ?!');

    for (let i = res.length; i--;) {
        const n = nmap[res[i]] || M.getNodeByHandle(res[i]);

        if (n.fv) {

            if (d) {
                this.logger.info('Skipping file-version %s', n.h, n);
            }
            res.splice(i, 1);
        }
    }

    if (h && !res.length) {
        if (d) {
            this.logger.info('Adding nothing but a file-version?..', h);
        }
        res = [h];
    }

    return res;
};

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
 * hasUserMessages
 * @description Check if the current room has any chat history, excl. management messages
 * @returns boolean
 */

ChatRoom.prototype.hasUserMessages = function() {
    const { messages } = this.messagesBuff;
    return !!messages.length && messages.some(m => m.messageHtml);
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

ChatRoom.prototype.showMissingUnifiedKeyDialog = function() {
    return (
        msgDialog(
            `warningb:!^${l[82] /* `Cancel` */}!${l[23433] /* `Reload your account` */}`,
            null,
            l[200] /* `Oops, something went wrong.` */,
            l.chat_key_failed_dlg_text, /* `Unable to join the call. Reload MEGA Chat and try again.` */
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
                    buildVersion.website || 'dev',
                    String(this.chatId).length | 0,
                    this.type | 0,
                    this.isMeeting | 0,
                    typeof unifiedKey,
                    String(unifiedKey || '').length | 0,
                    typeof this.ck,
                    String(this.ck).length | 0,
                    (!!master) | 0,
                    Object(slaves).length | 0
                ])
            );
            return true;
        }
    }
    return false;
};

ChatRoom.prototype.joinCall = ChatRoom._fnRequireParticipantKeys(function(audio, video, callId) {
    if (!megaChat.hasSupportForCalls || this.activeCallIds.length === 0 || this.meetingsLoading) {
        return;
    }
    if (this.hasInvalidKeys()) {
        return this.showMissingUnifiedKeyDialog();
    }

    this.meetingsLoading = {
        title: l.joining /* `Joining` */,
        audio,
        video
    };

    callId = callId || this.activeCallIds.keys()[0];
    return asyncApiReq({'a': 'mcmj', 'cid': this.chatId, "mid": callId})
        .then((r) => {
            this.startOrJoinCall(callId, r.url, audio, video);
        });
});
ChatRoom.prototype.startOrJoinCall = function(callId, url, audio, video) {
    tryCatch(() => {
        const call = this.call = megaChat.activeCall =
            megaChat.plugins.callManager2.createCall(
                this,
                callId,
                this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC &&
                str_to_ab(this.protocolHandler.unifiedKey)
            );
        return call.connect(url, audio, video);
    }, ex => {
        this.call?.destroy();
        this.call = megaChat.activeCall = null;
        this.meetingsLoading = false;
        console.error('Failed to start/join call:', ex);
    })();
};
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
    const shard = this.chatd.shards[this.chatShard];
    if (shard) {
        shard.sendCallReject(base64urldecode(this.chatId), base64urldecode(callId));
    }
    return Promise.resolve();
};

ChatRoom.prototype.ringUser = function(userId, callId, callstate) {
    assert(userId, 'Missing user handle.');
    assert(callId, 'Missing chat handle.');
    assert(this.type !== 'private', 'Unexpected chat type.');
    const shard = this.chatd.shards[this.chatShard];
    if (shard) {
        api.req({ a: 'mcru', u: userId, cid: this.chatId })
            .then(() => shard.ringUser(this.chatIdBin, base64urldecode(userId), base64urldecode(callId), callstate))
            .catch(dump);
    }
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

ChatRoom.prototype.startAudioCall = function(scheduled) {
    return this.startCall(true, false, scheduled);
};
ChatRoom.prototype.startVideoCall = function(scheduled) {
    return this.startCall(true, true, scheduled);
};
ChatRoom.prototype.startCall = ChatRoom._fnRequireParticipantKeys(function(audio, video, scheduled) {
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

    this.meetingsLoading = {
        title: l.starting /* `Starting` */,
        audio,
        video
    };

    const opts = { a: 'mcms', cid: this.chatId, sm: scheduled && this.scheduledMeeting && this.scheduledMeeting.id };
    if (localStorage.sfuId) {
        opts.sfu = parseInt(localStorage.sfuId, 10);
    }

    return asyncApiReq(opts)
        .then(r => {
            this.startOrJoinCall(r.callId, r.sfu, audio, video);
        })
        .catch(ex => {
            this.meetingsLoading = false;
            this.logger.error(`Failed to start call: ${ex}`);
        });
});

ChatRoom.prototype.subscribeForCallEvents = function() {
    const callMgr = megaChat.plugins.callManager2;
    this.rebind("onChatdPeerJoinedCall.callManager", (e, data) => {
        if (!this.activeCallIds.exists(data.callId)) {
            this.activeCallIds.set(data.callId, []);
        }
        this.activeCallIds.set(data.callId, [...this.activeCallIds[data.callId], ...data.participants]);

        const parts = data.participants;
        for (var i = 0; i < parts.length; i++) {
            // halt call if anyone joins a 1on1 room or if I'd joined (e.g. I'd an incoming ringing first)
            if (
                this.type === "private" ||
                (
                    parts[i] === u_handle &&
                    this.ringingCalls.exists(data.callId)
                )
            ) {
                this.ringingCalls.remove(data.callId);

                callMgr.trigger("onRingingStopped", {
                    callId: data.callId,
                    chatRoom: this
                });
            }
        }

        this.callParticipantsUpdated();
    });
    this.rebind("onChatdPeerLeftCall.callManager", (e, data) => {
        if (!this.activeCallIds[data.callId]) {
            return;
        }
        const parts = data.participants;
        for (var i = 0; i < parts.length; i++) {
            array.remove(this.activeCallIds[data.callId], parts[i], true);

            if (parts[i] === u_handle && this.ringingCalls.exists(data.callId)) {
                this.ringingCalls.remove(data.callId);

                callMgr.trigger("onRingingStopped", {
                    callId: data.callId,
                    chatRoom: this
                });
            }
        }

        this.callParticipantsUpdated();
    });
    this.rebind("onCallLeft.callManager", (e, data) => {
        console.warn("onCallLeft:", JSON.stringify(data));
        const {call} = this;
        if (!call || call.callId !== data.callId) {
            if (d) {
                console.warn("... no active call or event not for it");
            }
            return;
        }
        this.meetingsLoading = false;
        call.hangUp(data.reason);
        megaChat.activeCall = this.call = null;
    });
    this.rebind("onChatdCallEnd.callManager", (e, data) => {
        if (d) {
            console.warn("onChatdCallEnd:", JSON.stringify(data));
        }
        this.meetingsLoading = false;
        this.activeCallIds.remove(data.callId);
        this.stopRinging(data.callId);
        this.callParticipantsUpdated();
    });
    this.rebind('onCallState.callManager', function(e, data) {
        assert(this.activeCallIds[data.callId], `unknown call: ${data.callId}`);
        callMgr.onCallState(data, this);
        this.callParticipantsUpdated();
    });
    this.rebind('onRoomDisconnected.callManager', function() {
        this.activeCallIds.clear(); // av: Added this to complement the explicit handling of chatd call events
        // Keep the current call active when online, but chatd got disconnected
        if (navigator.onLine) {
            return;
        }

        if (this.call) {
            this.trigger('ChatDisconnected', this);
        }
        this.callParticipantsUpdated();
    });
    this.rebind('onStateChange.callManager', function(e, oldState, newState) {
        if (newState === ChatRoom.STATE.LEFT && this.call) {
            this.call.hangUp(SfuClient.TermCode.kLeavingRoom);
        }
    });
    this.rebind('onCallPeerLeft.callManager', (e, data) => {
        const {call} = this;
        if (
            call.isDestroyed ||
            call.hasOtherParticipant() ||
            SfuClient.isTermCodeRetriable(data.reason)
        ) {
            return;
        }
        if (this.type === 'private') {
            return this.trigger('onCallLeft', { callId: call.callId });
        }
        // Wait for the peer left notifications to process before triggering.
        setTimeout(() => {
            // make sure we still have that call as active
            if (this.call === call) {
                this.call.initCallTimeout();
            }
        }, 3000);
    });

    this.rebind('onMeAdded', (e, addedBy) => {
        if (this.activeCallIds.length > 0) {
            const callId = this.activeCallIds.keys()[0];
            if (this.ringingCalls.exists(callId)) {
                return;
            }
            this.ringingCalls.set(callId, addedBy);
            this.megaChat.trigger('onIncomingCall', [
                this,
                callId,
                addedBy,
                callMgr
            ]);
            this.fakedLocalRing = true;

            // clear if not canceled/rejected already
            setTimeout(() => {
                delete this.fakedLocalRing;
                if (this.ringingCalls.exists(callId)) {
                    callMgr.trigger("onRingingStopped", {
                        callId: callId,
                        chatRoom: this
                    });
                }
            }, 30e3);
        }
    });
};
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
    return this.type === 'private'
        || this.members && this.members[u_handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR;
};
ChatRoom.prototype.iAmReadOnly = function() {
    return this.type !== 'private'
        && this.members && this.members[u_handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.READONLY;
};
ChatRoom.prototype.iAmWaitingRoomPeer = function() {
    return this.options.w && !this.iAmOperator();
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

/**
 * Seed keys for this chat room as soon they are made available, e.g. through onMessageKeysDone
 * @param {Array} keys An array of keys
 * @returns {Promise<Array>} An 'userid-keyid' map of successfully seeded keys.
 */
ChatRoom.prototype.seedRoomKeys = async function(keys) {
    assert(Array.isArray(keys) && keys.length, `Invalid keys parameter for seedRoomKeys.`, keys);

    if (d > 2) {
        this.logger.warn('Seeding room keys...', keys);
    }

    const promises = [
        ChatdIntegration._ensureKeysAreLoaded(keys, undefined, this.publicChatHandle)
    ];
    if (!this.protocolHandler) {
        promises.push(ChatdIntegration._waitForProtocolHandler(this));
    }

    if (!this.notDecryptedKeys) {
        this.notDecryptedKeys = Object.create(null);
    }

    for (let i = keys.length; i--;) {
        const {key, keyid, keylen, userId} = keys[i];
        this.notDecryptedKeys[`${userId}-${keyid}`] = {userId, keyid, keylen, key};
    }

    const promise = this._keysAreSeeding = Promise.all(promises)
        .then(() => {
            const res = this.protocolHandler.seedKeys(keys);

            for (let i = res.length; i--;) {
                delete this.notDecryptedKeys[res[i]];
            }

            return res;
        })
        .catch((ex) => {
            // @todo retry? evaluate possible exceptions..
            this.logger.error('Failed to seed room keys!', ex, keys);
            throw ex;
        })
        .finally(() => {
            if (promise === this._keysAreSeeding) {
                delete this._keysAreSeeding;
            }
        });

    return promise;
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
                .catch((ex) => {
                    if (ex === -2) {
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
        tSleep(1.5).then(() => {
            self.scrollToMessageId(msgId, index, true);
        });
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

ChatRoom.prototype.setMcoFlags = function(flags) {
    const req = {
        a: 'mco',
        cid: this.chatId,
        ...flags
    };
    asyncApiReq(req).dump('roomSetCallFlags');
};

ChatRoom.prototype.toggleOpenInvite = function() {
    if (this.type === 'private' || !this.iAmOperator()) {
        return;
    }
    this.setMcoFlags({ [MCO_FLAGS.OPEN_INVITE]: Math.abs(this.options[MCO_FLAGS.OPEN_INVITE] - 1) });
};

ChatRoom.prototype.toggleWaitingRoom = function() {
    if (this.type === 'private' || !this.iAmOperator()) {
        return;
    }
    this.setMcoFlags({ [MCO_FLAGS.WAITING_ROOM]: Math.abs(this.options[MCO_FLAGS.WAITING_ROOM] - 1) });
};

ChatRoom.prototype.exportToFile = function() {
    if (this.messagesBuff.messages.length === 0 || this.exportIo) {
        return;
    }

    loadingDialog.show('chat_export');
    eventlog(99874);
    this._exportChat()
        .then(() => {
            eventlog(99875, JSON.stringify([1]));
        })
        .catch(ex => {
            if (d) {
                console.warn('Chat export: ', ex);
            }
            const report = [
                String(ex && ex.message || ex).replace(/\s+/g, '').substring(0, 64),
            ];
            report.unshift(report[0] === 'Aborted' ? 1 : 0);
            if (!report[0]) {
                msgDialog('error', '', l.export_chat_failed, '', undefined, undefined, true);
            }
            eventlog(99875, JSON.stringify(report));
        })
        .finally(() => {
            loadingDialog.hide('chat_export');
            this.isScrollingToMessageId = false;
            onIdle(() => this.messagesBuff.detachMessages());
        });
};

ChatRoom.prototype._exportChat = async function() {
    // Fetch messages into memory
    this.isScrollingToMessageId = true; // Stop detach from running while this is processing.
    while (this.messagesBuff.haveMoreHistory()) {
        await this.messagesBuff.retrieveChatHistory(100);
    }
    // Wait for potentially in progress fetch/decrypt operations.
    await Promise.allSettled([
        this.messagesBuff.isDecrypting || Promise.resolve(),
        this.messagesBuff.$sharedFilesLoading || Promise.resolve(),
        this.messagesBuff.$isDecryptingSharedFiles || Promise.resolve(),
    ]);

    do {
        await this.messagesBuff.retrieveSharedFilesHistory(100);
    } while (this.messagesBuff.haveMoreSharedFiles);

    // Check if the user wants the shared nodes if applicable
    let withMedia = !!M.v.length;
    if (withMedia) {
        withMedia = await asyncMsgDialog(
            `*confirmation:!^${l.export_chat_media_dlg_conf}!${l.export_chat_media_dlg_rej}`,
            '',
            l.export_chat_media_dlg_title,
            l.export_chat_media_dlg_text
        );
        if (withMedia === null) {
            throw new Error('Aborted');
        }
    }
    let { attachNodes, stringNodes } = this.messagesBuff.getExportContent(withMedia);
    stringNodes = stringNodes.join('\n');
    const basename = M.getSafeName(this.getRoomTitle());
    const zname = l.export_chat_zip_file.replace('%s', basename);
    const bufferName = l.export_chat_text_file.replace('%s', basename);

    if (attachNodes.length) {
        const p = [];
        const n = [];
        let s = 0;
        for (const node of attachNodes) {
            s += node.s;
            if (node.ph) {
                p.push(node.ph);
            }
            else {
                n.push(node.h);
            }
        }
        const res = await asyncApiReq({ a: 'qbq', s, n, p });
        if (res === 1 || res === 2) {
            // Overquota. Offer to just save the chat history
            const fallback = await asyncMsgDialog(
                'confirmation',
                '',
                l.export_chat_media_obq_title,
                l.export_chat_media_obq_text
            );
            if (fallback) {
                return M.saveAs(stringNodes, bufferName);
            }
        }
        else if (res === 0) {
            await M.require('clientzip_js');
            // Prepare the chat history to be added to the zip file from memory
            const data = new TextEncoder().encode(stringNodes);
            const dl = {
                size: data.byteLength + s,
                n: bufferName,
                t: unixtime(),
                id: this.chatId,
                p: '',
                io: Object.create(null),
                writer: Object.create(null),
                offset: 0,
                zname,
            };

            const io = await prepareExportIo(dl);
            const t = new Date((this.lastActivity || this.ctime) * 1000);
            let failedCount = 0;

            const src = prepareExportStreams(attachNodes, (size) => {
                failedCount++;
                // Fake progress for empty file.
                dl.done += size;
            });
            src.unshift({
                name: bufferName,
                lastModified: t,
                input: data.buffer,
            });

            // Rudimentary progress tracking since we are skipping the normal transfer flow.
            dl.done = 0;
            const reader = clientZip.downloadZip(src).body.getReader();
            dl.nextChunk = async() => {
                const read = await reader.read().catch(dump);
                if (!read) {
                    reader.cancel().catch(ex => {
                        if (ex === EOVERQUOTA) {
                            dlmanager.showOverQuotaDialog();
                        }
                        else {
                            msgDialog('error', '', l.export_chat_failed, '', undefined, undefined, true);
                        }
                    });
                    io.abort();
                    delete this.exportIo;
                    return;
                }
                if (read.done) {
                    loadingDialog.hideProgress();
                    io.download(zname);
                    delete this.exportIo;
                    if (failedCount) {
                        msgDialog(
                            'error',
                            '',
                            l.export_chat_failed,
                            l.export_chat_partial_fail,
                            undefined,
                            undefined,
                            true
                        );
                    }
                }
                else {
                    dl.done += read.value.byteLength;
                    loadingDialog.showProgress((dl.done / dl.size) * 100);
                    io.write(read.value, dl.offset, dl.nextChunk);
                    dl.offset += read.value.length;
                }
            };
            io.begin = dl.nextChunk;
            io.setCredentials(false, dl.size, zname);
            this.exportIo = io;
        }
        else {
            throw new Error(`Unexpected qbq response ${res}`);
        }
    }
    else {
        // Download the chat history.
        return M.saveAs(stringNodes, bufferName);
    }
};

window.ChatRoom = ChatRoom;

export default {
    'ChatRoom': ChatRoom
};
