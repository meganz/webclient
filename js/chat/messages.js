var Message = function(chatRoom, messagesBuff, vals) {
    var self = this;

    self.chatRoom = chatRoom;
    self.messagesBuff = messagesBuff;

    MegaDataObject.attachToExistingJSObject(
        self,
        {
            'userId': true,
            'messageId': true,

            'keyid': true,

            'message': true,

            'textContents': false,

            'delay': true,

            'orderValue': false,
            'updated': false,
            'sent': Message.STATE.NOT_SENT,
            'deleted': false,
            'revoked': false
        },
        true,
        vals
    );

    self._parent = chatRoom.messagesBuff;
};

Message._mockupNonLoadedMessage = function(msgId, msg, orderValueIfNotFound) {
    if (!msg) {
        return {
            messageId: msgId,
            orderValue: orderValueIfNotFound
        };
    }
    else {
        return msg;
    }
};

Message._getTextContentsForDialogType = function(message) {
    if (
        !message.textContents ||
        (
            typeof(message.textContents.length) !== 'undefined' &&
            message.textContents.length === 0
        )
    ) {
        var textMessage = mega.ui.chat.getMessageString(message.type || message.dialogType) || "";

        // if is an array.
        var contact = Message.getContactForMessage(message);
        var contactName = "";
        if (contact) {
            contactName = htmlentities(M.getNameByHandle(contact.u));
        }

        if (message.dialogType === "privilegeChange" && message.meta) {
            textMessage = textMessage.replace("%s2", contactName);
            var newPrivilegeText = "";
            if (message.meta.privilege === 3) {
                newPrivilegeText = l[8875];
            }
            else if (message.meta.privilege === 2) {
                newPrivilegeText = l[8874];
            }
            else if (message.meta.privilege === 0) {
                newPrivilegeText = l[8873];
            }

            contact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
                'u': message.meta.targetUserId,
                'h': message.meta.targetUserId,
                'c': 0
            };

            contactName = htmlentities(M.getNameByHandle(contact.u));
            textMessage = textMessage.replace("%s1", newPrivilegeText);
        }
        else if (message.dialogType === "alterParticipants" && message.meta) {
            if (message.meta.excluded && message.meta.excluded.length > 0) {
                var otherContact = M.u[message.meta.excluded[0]];
                if (otherContact) {
                    if (otherContact.u === contact.u) {
                        textMessage = l[8908];
                    }
                    else {
                        contact = otherContact;
                        textMessage = l[8906].replace("%s", contactName);
                        contactName = htmlentities(M.getNameByHandle(message.meta.excluded[0]));
                    }
                }
            }
            else if (message.meta.included && message.meta.included.length > 0) {
                otherContact = M.u[message.meta.included[0]];
                if (contact && otherContact) {
                    textMessage = l[8907].replace("%s", contactName);
                    var otherContactName = htmlentities(M.getNameByHandle(message.meta.included[0]));
                    contact = otherContact;
                    contactName = otherContactName;
                }
            }
            else {
                textMessage = "";
            }
        }
        else if (message.dialogType === "topicChange") {
            textMessage = l[9081].replace(
                "%s",
                '"' + htmlentities(message.meta.topic) + '"'
            );
        }
        else if (message.dialogType === "remoteCallEnded") {
            var meta = message.meta;

            if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CALL_ENDED) {
                textMessage = mega.ui.chat.getMessageString("call-ended");
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.REJECTED) {
                textMessage = mega.ui.chat.getMessageString("call-rejected");
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CANCELED) {
                textMessage = mega.ui.chat.getMessageString("call-canceled");
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && contact.u !== u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-missed");
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && contact.u === u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-timeout");
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.FAILED) {
                textMessage = mega.ui.chat.getMessageString("call-failed");
            }
            else {
                if (d) {
                    console.error("Unknown (remote) CALL_ENDED reason: ", meta.reason, meta);
                }
            }

            if (textMessage.splice) {
                textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage);
            }
            else {
                textMessage = textMessage.replace("[X]", contactName);
                textMessage = textMessage.replace("%s", contactName);
            }
        }
        else if (textMessage.splice) {
            textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage);
        }
        else {
            textMessage = textMessage.replace("[X]", contactName);
            textMessage = textMessage.replace("%s", contactName);
        }


        if (textMessage) {
            return textMessage;
        }
        else {
            return false;
        }
    }
};

Message.getContactForMessage = function(message) {
    var contact;
    if (message.authorContact) {
        contact = message.authorContact;
    }
    else if (message.meta && message.meta.userId) {
        contact = M.u[message.meta.userId];
        if (!contact) {
            return {
                'u': message.meta.userId,
                'h': message.meta.userId,
                'c': 0,
            };
        }
    }
    else if (message.userId) {
        if (!M.u[message.userId]) {
            // data is still loading!
            return null;
        }
        contact = M.u[message.userId];
    }
    else {
        console.error("No idea how to get contact for: ", message);

        return {};
    }

    return contact;
};

/**
 * Cached attachment's extracted from the message (if such data is available)
 *
 * @returns {*}
 */
Message.prototype.getAttachmentMeta = function() {
    "use strict";
    return M.chc[this.messageId] || [];
};

/**
 * Invoked when an event happens in the message
 * @param {String} action The action performed, i.e. push, replace, remove
 * @private
 */
Message.prototype._onMessageAction = function(action) {
    'use strict';
    var self = this;

    if (action !== 'push') {
        var attachments = this.getAttachmentMeta();

        if (attachments.length) {
            attachments.forEach(function(n) {
                self._onAttachmentRevoked(n.h, true);
            });
        }
    }
};

/**
 * Process a received attachment.
 * @param {String} data The serialized attachment data
 * @private
 */
Message.prototype._onAttachmentReceived = function(data) {
    'use strict';

    var attachments = this._safeParseJSON(data);

    for (var i = attachments.length; i--;) {
        // For the chat let's create a MegaNode in steroids...
        var n = new MegaNode(Object.assign({}, attachments[i], {p: this.chatRoom.roomId, m: this.messageId}));

        n.ch = n.m + '!' + n.h;
        n.co = this.orderValue;

        if (M.chd[n.ch]) {
            // if the message got flushed from history and re-shown later
            Object.assign(n, M.chd[n.ch]);
        }
        else {
            if (n.fa) {
                if (String(n.fa).indexOf(':1*') > 0) {
                    // storing a reference to the message to fire trackDataChange once the preview is loaded
                    n.mo = this;
                }
                if (String(n.fa).indexOf(':8*') > 0) {
                    Object.assign(n, MediaAttribute(n).data);
                }
            }
            n.mime = filemime(n);
        }

        // Index of attachments per room
        if (!M.chc[n.p]) {
            M.chc[n.p] = Object.create(null);
        }
        M.chc[n.p][n.ch] = n;

        // Index of attachments per message
        if (M.chc[n.m]) {
            var j = M.chc[n.m].length;

            // Ensure the node doesn't exists already.
            // XXX: We could simplify this since a message can no longer contain more than an attachment though (?)

            while (j--) {
                if (M.chc[n.m][j].ch === n.ch) {
                    break;
                }
            }

            if (j < 0) {
                M.chc[n.m].push(n);
            }
        }
        else {
            M.chc[n.m] = [n];
        }

        // Global index for all attachments
        M.chd[n.ch] = n;
    }

    this._onAttachmentUpdated();
};

/**
 * Process an attachment revocation.
 * @param {String} h The handle for the node that got revoked.
 * @param {Boolean} [thisMsg] Revoke only this message attachment(s)
 * @private
 */
Message.prototype._onAttachmentRevoked = function(h, thisMsg) {
    'use strict';

    var chatRoom = this.chatRoom;
    var roomId = chatRoom.roomId;
    var msgId = this.messageId;

    // Revoke all room attachments matching the same handle/message
    var a = Object.values(M.chc[roomId] || {})
        .filter(function(n) {
            return thisMsg ? n.m === msgId : n.h === h;
        });

    // Get a list of affected messages
    var m = a.map(function(n) {
        console.assert(n.p === roomId, 'check this...');

        n.revoked = true;
        delete M.chc[n.p][n.ch];

        if (!$.len(M.chc[n.p])) {
            delete M.chc[n.p];
        }

        if (slideshowid === n.ch) {
            // We'll reuse some logic at removeUInode() to close/move-next the slideshow
            removeUInode(n.ch);
        }

        return n.m;
    });

    // Process message revocation.
    for (var i = m.length; i--;) {
        var mId = m[i];
        var attachedMsg = chatRoom.messagesBuff.messages[mId];

        console.assert(M.chc[mId] && M.chc[mId].length, 'check this...');

        if (M.chc[mId]) {
            var c = M.chc[mId];
            for (var j = c.length; j--;) {
                if (c[j].h === h) {
                    c.splice(j, 1);
                    break;
                }
            }

            if (!M.chc[mId].length) {
                delete M.chc[mId];
            }
        }

        if (attachedMsg) {
            // mark the whole message as revoked if all attachments in it are marked as revoked.
            if (!M.chc[mId]) {
                attachedMsg.revoked = true;
            }
            else {
                // force re-render
                attachedMsg.trackDataChange();
            }

            if (!attachedMsg.seen) {
                attachedMsg.seen = true;
                if (chatRoom.messagesBuff._unreadCountCache > 0) {
                    chatRoom.messagesBuff._unreadCountCache--;
                    chatRoom.messagesBuff.trackDataChange();
                    chatRoom.megaChat.updateSectionUnreadCount();
                }
            }
        }
    }

    this._onAttachmentUpdated();
};

/**
 * Signal when new attachments are added/revoked...
 * @private
 */
Message.prototype._onAttachmentUpdated = function() {
    'use strict';

    // FIXME: This is only needed to fill M.v when the site is (re)loaded within the chat,
    // since otherwise openFolder() should take care, hence this is overkill FIND A BETTER WAY

    var chatRoom = this.chatRoom;
    var roomId = chatRoom.roomId;

    delay('chat-attachment-update:' + roomId, function() {
        if (chatRoom.isCurrentlyActive) {
            chatRoom.megaChat.setAttachments(roomId);
        }
    });
};

/**
 * Safer JSON.parse
 * @param {String} data The serialized data
 * @returns {*}
 * @private
 */
Message.prototype._safeParseJSON = function(data) {
    'use strict';

    try {
        return JSON.parse(data);
    }
    catch (ex) {
        console.warn(ex, this, [data]);
    }
    return false;
};

Message.prototype.getStateText = function(state) {
    'use strict';

    if (state === undefined) {
        state = this.getState();
    }

    return Message._stateToText[state] || 'not-sent';
};

Message.prototype.getState = function() {
    var self = this;
    var mb = self.messagesBuff;

    if (!self.orderValue) {
        return Message.STATE.NULL;
    }

    var foundMsg = mb.messages[mb.lastSeen] ? mb.messages[mb.lastSeen] : mb.messagesBatchFromHistory[mb.lastSeen];
    var lastSeenMessage = Message._mockupNonLoadedMessage(mb.lastSeen, foundMsg, 0);

    if (self.userId === u_handle) {
        // can be NOT_SENT, SENT, DELIVERED and DELETED
        if (self.deleted === true) {
            return Message.STATE.DELETED;
        }
        else if (self.sent === Message.STATE.NOT_SENT) {
            return Message.STATE.NOT_SENT;
        }
        else if (self.sent === Message.STATE.SENT) {
            return Message.STATE.SENT;
        }
        else if (self.sent === Message.STATE.NOT_SENT_EXPIRED) {
            return Message.STATE.NOT_SENT_EXPIRED;
        }
        else if (self.sent === true) {
            return Message.STATE.DELIVERED;
        }
        else {
            mb.logger.error("Was not able to determinate state from pointers [1].");
            return -1;
        }
    }
    else {
        // can be NOT_SEEN, SEEN and DELETED
        if (self.deleted === true) {
            return Message.STATE.DELETED;
        }
        else if (self.orderValue > lastSeenMessage.orderValue) {
            return Message.STATE.NOT_SEEN;
        }
        else if (self.orderValue <= lastSeenMessage.orderValue) {
            return Message.STATE.SEEN;
        }

        else {
            mb.logger.error("Was not able to determinate state from pointers [2].");
            return -2;
        }
    }
};

Message.STATE = {
    'NULL': 0,
    'NOT_SEEN': 1,
    'SENT': 10, /* SENT = CONFIRMED */
    'NOT_SENT_EXPIRED': 14,
    'NOT_SENT': 20, /* NOT_SENT = PENDING */
    'DELIVERED': 30,
    'SEEN': 40,
    'DELETED': 8,
};

Message.SOURCE = {
    'IDB': 0,
    'CHATD': 1,
    'SENT': 2,
};

Message.MANAGEMENT_MESSAGE_TYPES = {
    "MANAGEMENT": "\0",
    "ATTACHMENT": "\x10",
    "REVOKE_ATTACHMENT": "\x11",
    "CONTACT": "\x12",
    "CONTAINS_META": "\x13",

};

Message.MESSAGE_META_TYPE = {
    "RICH_PREVIEW": "\0",
};

Message._stateToText = Object.create(null);
Message._stateToText[Message.STATE.NULL] = 'error';
Message._stateToText[Message.STATE.NOT_SEEN] = 'unread';
Message._stateToText[Message.STATE.SENT] = 'sent';
Message._stateToText[Message.STATE.NOT_SENT_EXPIRED] = 'expired';
Message._stateToText[Message.STATE.NOT_SENT] = 'not-sent';
Message._stateToText[Message.STATE.DELIVERED] = 'delivered';
Message._stateToText[Message.STATE.SEEN] = 'seen';
Message._stateToText[Message.STATE.DELETED] = 'deleted';

Message.prototype.isManagement = function() {
    if (!this.textContents) {
        return false;
    }
    return this.textContents.substr(0, 1) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT;
};
Message.prototype.isRenderableManagement = function() {
    if (!this.textContents) {
        return false;
    }
    return this.textContents.substr(0, 1) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT && (
            this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT ||
            this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META ||
            this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT
        );
};

/**
 * To be used when showing a summary of the text message (e.g. a text only repres.)
 */
Message.prototype.getManagementMessageSummaryText = function() {
    if (!this.isManagement()) {
        return this.textContents;
    }
    if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
        var nodes = JSON.parse(this.textContents.substr(2, this.textContents.length));
        if (nodes.length === 1) {
            return __(l[8894]).replace("%s", nodes[0].name);
        }
        else {
            return __(l[8895]).replace("%s", nodes.length);
        }
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
        var nodes = JSON.parse(this.textContents.substr(2, this.textContents.length));
        if (nodes.length === 1) {
            return __(l[8896]).replace("%s", nodes[0].name);
        }
        else {
            return __(l[8897]).replace("%s", nodes.length);
        }
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META) {
        var metaType = this.textContents.substr(2, 1);
        var meta = JSON.parse(this.textContents.substr(3, this.textContents.length));
        if (metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW) {
            return meta.textMessage;
        }
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
        return __(l[8892]);
    }
};

Message.prototype.isEditable = function() {
    return this.userId === u_handle && (unixtime() - this.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT;
};

Message.prototype.toPersistableObject = function() {
    var self = this;

    var r = {};
    [
        'delay',
        'deleted',
        'dialogType',
        'meta',
        'revoked',
        'sent',
        'updated',
        'textContents',
        'references',
        'msgIdentity',
        'metaType'
    ].forEach(function(k) {
        if (typeof self[k] !== 'undefined') {
            r[k] = self[k];
        }
    });

    return r;
};

/**
 * Simple interface/structure wrapper for inline dialogs
 * @param opts
 * @constructor
 */
var ChatDialogMessage = function(opts) {
    assert(opts.messageId, 'missing messageId');
    assert(opts.type, 'missing type');

    MegaDataObject.attachToExistingJSObject(
        this,
        {
            'type': true,
            'messageId': true,
            'textContents': true,
            'authorContact': true,
            'delay': true,
            'buttons': true,
            'read': true,
            'protocol': false,
            'persist': true,
            'deleted': 0,
            'seen': false
        },
        true,
        ChatDialogMessage.DEFAULT_OPTS
    );
    $.extend(true, this, opts);

    return this;
};

/**
 * Default values for the ChatDialogMessage interface/datastruct.
 *
 * @type {Object}
 */
ChatDialogMessage.DEFAULT_OPTS = {
    'type': '',
    'messageId': '',
    'textContents': '',
    'authorContact': '',
    'delay': 0,
    'buttons': {},
    'read': false,
    'persist': true
};


/**
 * Basic collection class that should collect all messages from different sources (chatd at the moment and xmpp in the
 * future)
 *
 * @param chatRoom
 * @param chatdInt
 * @constructor
 */
var MessagesBuff = function(chatRoom, chatdInt) {
    var self = this;

    self.chatRoom = chatRoom;
    self.chatdInt = chatdInt;
    self.chatd = chatdInt.chatd;
    var chatdPersist = self.chatdPersist = self.chatd.chatdPersist;

    self.messages = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc, this);
    self.messagesBatchFromHistory = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);

    // because on connect, chatd.js would request hist retrieval automatically, lets simply set a "lock"
    self.isDecrypting = new MegaPromise();


    var origPush = self.messages.push;
    self.messages.push = function(msg) {
        var res = origPush.apply(this, arguments);
        if (
            !(
                msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false
            )
        ) {
            chatRoom.trigger('onMessagesBuffAppend', msg);
        }

        if (self.chatRoom.scrolledToBottom === true) {
            if (self.messages.length > Chatd.MESSAGE_HISTORY_LOAD_COUNT * 2) {
                self.detachMessages();
            }
        }

        return res;
    };

    ['push', 'replace', 'remove', 'removeByKey'].forEach(function(fnName) {
        var origFn = self.messages[fnName];

        self.messages[fnName] = function(messageId, ignoreDB) {
            // should be called first..otherwise origFn.apply may delete the message and cause `msg` to be undefined.
            var msg = self.messages[messageId];
            if (msg) {
                msg._onMessageAction(fnName);
            }

            var res = origFn.apply(this, arguments);

            if (!ignoreDB && self.chatd.chatdPersist) {
                chatdPersist.persistMessageBatched(
                    fnName === "removeByKey" ? "remove" : fnName,
                    chatRoom.chatId,
                    toArray.apply(null, arguments)
                );
            }

            return res;
        };
    });

    self.lastSeen = null;
    self.lastSent = null;
    self.lastDelivered = null;
    self.isRetrievingHistory = false;
    self.lastDeliveredMessageRetrieved = false;
    self.lastSeenMessageRetrieved = false;
    self.retrievedAllMessages = false;

    self.chatdIsProcessingHistory = false;
    self._currentHistoryPointer = 0;
    self.$msgsHistoryLoading = null;
    self._unreadCountCache = 0;

    self.haveMessages = false;
    self.joined = false;
    self.sendingListFlushed = false;
    self.messageOrders = {};

    var loggerIsEnabled = localStorage['messagesBuffLogger'] === '1';

    self.logger = MegaLogger.getLogger(
        "messagesBuff[" + chatRoom.roomId + "]",
        {
            minLogLevel: function() {
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            }
        },
        chatRoom.logger
    );

    manualTrackChangesOnStructure(self, true);

    // self._parent = chatRoom;

    var chatRoomId = chatRoom.roomId;

    chatRoom.rebind('onChatShown.mb', function() {
        // when the chat was first opened in the UI, try to retrieve more messages to fill the screen
        if (
            self.haveMoreHistory() &&
            (
                self.messages.length < Chatd.MESSAGE_HISTORY_LOAD_COUNT &&
                self.messagesBatchFromHistory.length < Chatd.MESSAGE_HISTORY_LOAD_COUNT
            )
        ) {
            self.retrieveChatHistory(false);
        }
    });

    chatRoom.rebind('onHistoryDecrypted.mb', function() {
        if (chatRoom.messagesBuff.isDecrypting) {
            chatRoom.messagesBuff.isDecrypting.resolve();
        }



        if (self.haveMoreHistory() && self.messages.length <= Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
            // if there are more messages in history, but there is no "renderable text message" (for the left tree
            // pane), we will try to retrieve Chatd.MESSAGE_HISTORY_LOAD_COUNT more messages, so that it won't display
            // an empty chat
            if (self.getLatestTextMessage() === false) {
                self.retrieveChatHistory(false);
                return;
            }

            // if the # of unreads === initial load count of messages, this may mean there are more unread messages
            // in the history, so retrieve all Chatd.MESSAGE_HISTORY_LOAD_COUNT messages
            var totalUnreads = 0;
            self.messages.forEach(function(msg) {
                totalUnreads += msg.getState && msg.getState() === Message.STATE.NOT_SEEN ? 1 : 0;
            });
            if (totalUnreads === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
                self.retrieveChatHistory(false);
            }
        }
        chatRoom.trigger('onHistoryDecryptedDone');
    });

    self.chatd.rebind('onMessageLastSeen.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (!chatRoom) {
            self.logger.warn("Message not found for: ", e, eventData);
            return;
        }

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.setLastSeen(eventData.messageId, eventData.chatd);
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageConfirm.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.lastSent = eventData.messageId;
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageLastReceived.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);
        if (chatRoom && chatRoom.roomId === self.chatRoom.roomId) {
            self.setLastReceived(eventData.messageId);
        }
    });

    self.chatd.rebind('onMessagesHistoryDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomId === self.chatRoom.roomId) {

            var requestedMessagesCount = self.requestedMessagesCount || Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL;
            self.isRetrievingHistory = false;
            self.chatdIsProcessingHistory = false;
            self.sendingListFlushed = true;

            if (
                typeof(self.expectedMessagesCount) === 'undefined' ||
                self.expectedMessagesCount === requestedMessagesCount
            ) {
                // this is an empty/new chat.
                self.expectedMessagesCount = 0;
                self.retrievedAllMessages = true;
            }
            else if (
                self.expectedMessagesCount === requestedMessagesCount
            ) {
                self.haveMessages = true;
                self.retrievedAllMessages = true;
            }
            else if (
                self.expectedMessagesCount
            ) {
                self.haveMessages = true;
                // if the expectedMessagesCount is not 0 and < requested, then...chatd/idb returned < then the
                // requested #, which means, that there is no more history.
                self.retrievedAllMessages = self.expectedMessagesCount < requestedMessagesCount;
            }



            delete self.expectedMessagesCount;
            delete self.requestedMessagesCount;

            $(self).trigger('onHistoryFinished');

            if (self.$msgsHistoryLoading && self.$msgsHistoryLoading.state() === 'pending') {
                self.$msgsHistoryLoading.resolve();
            }

            self.trackDataChange();

            if (chatRoom.isCurrentlyActive && requestedMessagesCount === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
                // chat was active, when initial loading finished...request more messages
                chatRoom.trigger('onChatShown.mb');
            }
        }
    });


    self.chatd.rebind('onMessagesHistoryRequest.messagesBuff' + chatRoomId, function(e, eventData) {

        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom && chatRoom.roomId === self.chatRoom.roomId) {
            self.isRetrievingHistory = true;
            self.expectedMessagesCount = Math.abs(eventData.count);
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessagesHistoryRetrieve.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (!chatRoom) {
            self.logger.warn("Message not found for: ", e, eventData);
            return;
        }
        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.haveMessages = true;
            self.trackDataChange();
            self.retrieveChatHistory(true);
        }
    });

    self.chatd.rebind('onMessageStore.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom && chatRoom.roomId === self.chatRoom.roomId) {
            self.haveMessages = true;

            var msgObject = new Message(
                chatRoom,
                self,
                {
                    'messageId': eventData.messageId,
                    'userId': eventData.userId,
                    'keyid': eventData.keyid,
                    'message': eventData.message,
                    'delay': eventData.ts,
                    'orderValue': eventData.id,
                    'updated': eventData.updated,
                    'sent': (eventData.userId === u_handle) ? Message.STATE.SENT : Message.STATE.NOT_SENT
                }
            );

            if (eventData.messageId === self.lastSeen) {
                self.lastSeenMessageRetrieved = true;
            }
            if (eventData.messageId === self.lastDelivered) {
                self.lastDeliveredMessageRetrieved = true;
            }


            if (!eventData.isNew) {
                self.expectedMessagesCount--;
                if (eventData.userId !== u_handle) {
                    if (self.lastDeliveredMessageRetrieved === true) {
                        // received a message from history, which was NOT marked as received, e.g. was sent during
                        // this user was offline, so -> do proceed and mark it as received automatically
                        self.setLastReceived(eventData.messageId);

                    }
                }
                self.messagesBatchFromHistory.push(msgObject);
            }
            else {
                if (eventData.pendingid) {
                    var foundMessage = self.getByInternalId(eventData.pendingid);

                    // its ok if foundMessage is empty, e.g. it can be sent from another client
                    if (foundMessage && foundMessage.textContents) {
                        msgObject.textContents = foundMessage.textContents;
                    }

                    msgObject.pendingMessageId = foundMessage.messageId;

                    [
                        'meta',
                        'metaType',
                        'pendingMessageId'
                    ].forEach(function(k) {
                        if (foundMessage[k]) {
                            msgObject[k] = foundMessage[k];
                        }
                    });
                }

                self.messagesBatchFromHistory.push(msgObject);

                // if not from history
                // mark as received if not sent by me
                if (eventData.userId !== u_handle) {
                    self.setLastReceived(eventData.messageId);
                }
                $(self).trigger('onNewMessageReceived', msgObject);

                if (eventData.pendingid) {
                    $(chatRoom).trigger('onPendingMessageConfirmed', msgObject);
                }
            }
        }
    });

    self.chatd.rebind('onMessageCheck.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (!chatRoom) {
            self.logger.warn("Message not found for: ", e, eventData);
            return;
        }

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.haveMessages = true;

            if (!self.messages[eventData.messageId]) {
                self.retrieveChatHistory(true);
            }
        }
    });

    self.chatd.rebind('onMessageUpdated.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (self.chatRoom.chatId !== chatRoom.chatId) {
            return; // ignore event
        }
        self.logger.debug(eventData.id, eventData.state, eventData);
        // convert id to unsigned.
        eventData.id = (eventData.id>>>0);

        if (eventData.state === "EDITED" || eventData.state === "TRUNCATED") {
            if (!chatRoom.messagesBuff.messages[eventData.messageId]) {
                if (!eventData.isRetry) {
                    eventData.isRetry = true;
                    if (chatRoom.messagesBuff.messagesBatchFromHistory[eventData.messageId]) {
                        // NEWMSG already in the "to be decrypted/decrypting" buffer, wait for it first!
                        var bufferedMsg = chatRoom.messagesBuff.messagesBatchFromHistory[eventData.messageId];
                        bufferedMsg.addChangeListener(function() {
                            if (bufferedMsg.decrypted === true) {
                                // done decrypting
                                self.chatd.trigger('onMessageUpdated.messagesBuff' + chatRoomId, eventData);
                                return 0xDEAD;
                            }
                        });
                    } else {
                        $(chatRoom).one('onHistoryDecrypted.dbgverify', function () {
                            self.chatd.trigger('onMessageUpdated.messagesBuff' + chatRoomId, eventData);
                        });
                    }
                }
                else {
                    if (self.chatd.chatdPersist) {
                        var r = {
                            'messageId': eventData.messageId,
                            'userId': eventData.userId,
                            'keyid': eventData.keyid,
                            'message': eventData.message,
                            'updated': eventData.updated,
                            'orderValue': eventData.id,
                            'sent': true
                        };
                        if (eventData.ts) {
                            r['delay'] = eventData.ts;
                        }

                        self.chatd.chatdPersist.modifyPersistedMessage(
                            chatRoom.chatId,
                            r
                        );
                    }
                }
                return;
            }

            var originalMessage = chatRoom.messagesBuff.messages[eventData.messageId];

            var timestamp = originalMessage.delay ? originalMessage.delay : unixtime();

            var editedMessage = new Message(
                chatRoom,
                self,
                {
                    'messageId': eventData.messageId,
                    'userId': eventData.userId,
                    'keyid': eventData.keyid,
                    'message': eventData.message,
                    'updated': eventData.updated,
                    'delay' : eventData.ts ? eventData.ts : timestamp,
                    'orderValue': eventData.id,
                    'sent': true
                }
            );

            var _decryptSuccessCb = function(decrypted) {
                if (decrypted) {
                    // if the edited payload is an empty string, it means the message has been deleted.
                    if (decrypted.type === strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP) {
                        if (typeof decrypted.payload === 'undefined' || decrypted.payload === null) {
                            decrypted.payload = "";
                        }
                        editedMessage.textContents = decrypted.payload;

                        if (decrypted.identity && decrypted.references) {
                            editedMessage.references = decrypted.references;
                            editedMessage.msgIdentity = decrypted.identity;
                            if (
                                chatRoom.messagesBuff.verifyMessageOrder(
                                    decrypted.identity,
                                    decrypted.references
                                ) === false) {
                                // potential message order tampering detected.
                                self.logger.critical(
                                    "message order tampering detected: ",
                                    chatRoom.chatId,
                                    eventData.messageId
                                );
                            }
                        }
                        if (editedMessage.textContents === "") {
                            editedMessage.deleted = true;
                        }
                    }
                    else if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                        editedMessage.dialogType = 'truncated';
                        editedMessage.userId = decrypted.sender;
                        if (eventData.ts) {
                            editedMessage.delay = eventData.ts;
                        }
                        chatRoom.protocolHandler.clearKeyId();
                    }

                    chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                        chatRoom,
                        editedMessage
                    );


                    chatRoom.messagesBuff.messages.replace(editedMessage.messageId, editedMessage);

                    $(chatRoom).trigger('onMessageUpdateDecrypted', editedMessage);

                    if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                        var messageKeys = chatRoom.messagesBuff.messages.keys();

                        for (var i = 0; i < messageKeys.length; i++) {
                            var v = self.messages[messageKeys[i]];

                            if (v.orderValue < eventData.id) {
                                // remove the messages with orderValue < eventData.id from message buffer.
                                self.messages.removeByKey(v.messageId);
                            }
                        }

                        self._removeMessagesBefore(editedMessage.messageId);
                    }
                }
                else {
                    self.messages.removeByKey(eventData.messageId);
                    throw new Error('Message can not be decrypted!');
                }
            };

            var _runDecryption = function() {
                try {
                    chatRoom.protocolHandler.decryptFrom(
                        eventData.message,
                        eventData.userId,
                        eventData.keyid,
                        false
                    )
                    .done(_decryptSuccessCb)
                    .fail(function(e) {
                        self.logger.error(
                            "Failed to decrypt stuff via strongvelope, " +
                            "decryptFrom failed with error:", e
                        );
                    });
                } catch (e) {
                    self.logger.error("Failed to decrypt stuff via strongvelope, because of uncaught exception: ", e);
                }
            };

            var promises = [];
            promises.push(
                ChatdIntegration._ensureKeysAreLoaded([editedMessage])
            );

            var pendingkeys = [];
            var msgkeycacheid = eventData.userId  + "-" + eventData.keyid;
            if (chatRoom.notDecryptedKeys && chatRoom.notDecryptedKeys[msgkeycacheid]) {
                pendingkeys.push(chatRoom.notDecryptedKeys[msgkeycacheid]);
            }
            MegaPromise.allDone(promises).done(
                function() {
                    if (pendingkeys.length > 0) {
                        ChatdIntegration._ensureKeysAreDecrypted(pendingkeys, chatRoom.protocolHandler).done(
                            function () {
                                _runDecryption();
                            }
                        );
                    }
                    else {
                        _runDecryption();
                    }
            });
        }
        else if (eventData.state === "CONFIRMED") {
            self.haveMessages = true;

            if (!eventData.id) {
                // debugger;
            }

            var foundMessage = self.getByInternalId(eventData.id);

            if (foundMessage) {
                var confirmedMessage = new Message(
                    chatRoom,
                    self,
                    {
                        'messageId': eventData.messageId,
                        'userId': eventData.userId,
                        'keyid': eventData.keyid,
                        'message': eventData.message,
                        'textContents': foundMessage.textContents ? foundMessage.textContents : "",
                        'delay': foundMessage.delay,
                        'orderValue': eventData.id,
                        'sent': true
                    }
                );

                self.messages.replace(foundMessage.messageId, confirmedMessage);

                if (foundMessage.textContents) {
                    self.chatRoom.megaChat.plugins.chatdIntegration._parseMessage(chatRoom, confirmedMessage);
                }
            }
            else {
                // its ok, this happens when a system/protocol message was sent OR this message was re-sent by chatd
                // after the page had been reloaded
                self.logger.warn("Not found: ", eventData.id);
                return;
            }
        }
        else if (eventData.state === "DISCARDED") {
            // messages was already sent, but the confirmation was not received, so this is a dup and should be removed
            self.haveMessages = true;

            if (!eventData.id) {
                // debugger;
            }

            var foundMessage = self.getByInternalId(eventData.id);

            if (foundMessage) {
                self.messages.removeByKey(foundMessage.messageId);
            }

            foundMessage = self.getByInternalId(eventData.messageId);

            if (foundMessage) {
                self.messages.removeByKey(foundMessage.messageId);
            }
        }
        else if (eventData.state === "EXPIRED") {
            self.haveMessages = true;

            if (!eventData.id) {
                // debugger;
            }

            var foundMessage = self.getByInternalId(eventData.id);

            if (foundMessage) {
                foundMessage.sent = Message.STATE.NOT_SENT_EXPIRED;
                foundMessage.requiresManualRetry = true;
            }
            else {
                var foundMessage = self.getByInternalId(eventData.id & 0xffffffff);

                if (foundMessage) {
                    foundMessage.sent = Message.STATE.NOT_SENT_EXPIRED;
                    foundMessage.requiresManualRetry = true;
                }
                else {
                    // its ok, this happens when a system/protocol message was sent
                    self.logger.error("Not found: ", eventData.id);
                    return;
                }
            }
            if (foundMessage.messageId !== eventData.messageId) {
                // messageId had changed. update the messagesBuff
                self.messages.removeByKey(foundMessage.messageId);
                foundMessage.messageId = eventData.messageId;
                self.messages.push(
                    foundMessage
                );
            }

        }
        else if (eventData.state === "RESTOREDEXPIRED") {
            self.haveMessages = true;

            if (!eventData.id) {
                // debugger;
            }

            var foundMessage = self.getByInternalId(eventData.id);

            if (foundMessage) {
                self.removeMessageById(foundMessage.messageId);
            }

            var outgoingMessage = new Message(
                    chatRoom,
                    self,
                    {
                    'userId': eventData.userId,
                    'messageId': eventData.id,
                    'message': eventData.message,
                    'textContents': "",
                    'delay':eventData.ts,
                    'state':Message.STATE.RESTOREDEXPIRED,
                    'updated': false,
                    'deleted': false,
                    'revoked': false
                }
            );

            outgoingMessage.internalId = eventData.id;
            outgoingMessage.orderValue = eventData.id;
            outgoingMessage.requiresManualRetry = true;
            outgoingMessage.userId = eventData.userId;
            outgoingMessage.messageId = eventData.messageId;

            var _runDecryption = function() {
                try
                {
                    chatRoom.protocolHandler.decryptFrom(
                        eventData.message,
                        eventData.userId,
                        eventData.keyid,
                        false
                    ).done(function(decrypted) {
                        if (decrypted) {
                            // if the edited payload is an empty string, it means the message has been deleted.
                            if (typeof decrypted.payload === 'undefined' || decrypted.payload === null) {
                                decrypted.payload = "";
                            }
                            outgoingMessage.textContents = decrypted.payload;
                            chatRoom.messagesBuff.messages.push(outgoingMessage);

                            chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                                chatRoom, chatRoom.messagesBuff.messages[eventData.messageId]
                            );
                        }
                        else {
                            throw new Error('Message can not be decrypted!');
                        }
                    });
                } catch(e) {
                    self.logger.error("Failed to decrypt stuff via strongvelope, because of uncaught exception: ", e);
                }
            };

            var promises = [];
            promises.push(
                ChatdIntegration._ensureKeysAreLoaded([outgoingMessage])
            );

            MegaPromise.allDone(promises).always(function() {
                _runDecryption();
            });
        }

        // pending would be handled automatically, because all NEW messages are set with state === NOT_SENT(== PENDING)
    });

    self.chatd.rebind('onMessagesKeyIdDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);
        if (!chatRoom.protocolHandler) {
            ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
                chatRoom.protocolHandler.setKeyID(eventData.keyxid, eventData.keyid);

                if (chatRoom.roomId === self.chatRoom.roomId) {
                    self.trackDataChange();
                }
            });
        }
        else {
            chatRoom.protocolHandler.setKeyID(eventData.keyxid, eventData.keyid);

            if (chatRoom.roomId === self.chatRoom.roomId) {
                self.trackDataChange();
            }
        }
    });

    self.chatd.rebind('onMessageKeysDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);
        var keys = eventData.keys;
        if (!chatRoom.notDecryptedKeys) {
            chatRoom.notDecryptedKeys = {};
        }

        for (var i=0;i < keys.length;i++) {
            var cacheKey = keys[i].userId + "-" + keys[i].keyid;
            chatRoom.notDecryptedKeys[cacheKey] = {
                userId : keys[i].userId,
                keyid  : keys[i].keyid,
                keylen : keys[i].keylen,
                key    : keys[i].key
            };
        }
        var seedKeys = function() {
            for (var i=0;i < keys.length;i++) {
                if (chatRoom.protocolHandler.seedKeys([keys[i]])) {
                    var cacheKey = keys[i].userId + "-" + keys[i].keyid;
                    delete  chatRoom.notDecryptedKeys[cacheKey];
                }
            }
        };
        ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
            ChatdIntegration._ensureKeysAreLoaded(keys).always(seedKeys);
        });

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageIncludeKey.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);
        chatRoom.protocolHandler.setIncludeKey(true);

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageKeyRestore.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);
        var keyxid = eventData.keyid || eventData.keyxid;
        var keys = eventData.keys;

        var seedKeys = function() {
            if (!chatRoom.protocolHandler) {
                ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
                    chatRoom.protocolHandler.restoreKeys(keyxid, keys);
                });
            }
            else {
                chatRoom.protocolHandler.restoreKeys(keyxid, keys);
            }
        };
        ChatdIntegration._ensureKeysAreLoaded(keys).always(seedKeys);

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.trackDataChange();
        }
    });

    self.addChangeListener(function() {
        var newCounter = 0;
        self.messages.forEach(function(v, k) {
            if (
                v.getState &&
                v.getState() === Message.STATE.NOT_SEEN &&
                !v.deleted &&
                v.textContents !== "" &&
                v.textContents /* not false-based value */
            ) {
                var shouldRender = true;
                if (
                    (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) ||
                    v.revoked === true
                ) {
                    shouldRender = false;
                }

                if (shouldRender) {
                    newCounter++;
                }
            }
        });
        if (self._unreadCountCache !== newCounter) {
            self._unreadCountCache = newCounter;
            self.chatRoom.megaChat.updateSectionUnreadCount();
        }
    });
};


MessagesBuff.orderFunc = function(a, b) {
    var sortFields = ["orderValue","delay"];

    for (var i = 0; i < sortFields.length; i++) {
        var sortField = sortFields[i];
        var ascOrDesc = 1;
        if (sortField.substr(0, 1) === "-") {
            ascOrDesc = -1;
            sortField = sortField.substr(1);
        }

        if (a[sortField] && b[sortField]) {
            if (a[sortField] < b[sortField]) {
                return -1 * ascOrDesc;
            }
            else if (a[sortField] > b[sortField]) {
                return 1 * ascOrDesc;
            }
            else {
                return 0;
            }
        }
    }

    return 0;
};


MessagesBuff.prototype.getByInternalId = function(internalId) {
    assert(internalId, 'missing internalId');

    var self = this;
    var found = false;

    self.messages.every(function(v, k) {
        if (v.internalId === internalId) {

            found = v;

            return false; // break
        }
        else {
            return true;
        }
    });
    return found;
};

MessagesBuff.prototype.getByOrderValue = function(orderValue) {
    assert(orderValue, 'missing orderValue');

    var self = this;
    var found = false;

    self.messages.every(function(v, k) {
        if (v.orderValue === orderValue) {

            found = v;

            return false; // break
        }
        else {
            return true;
        }
    });
    return found;
};

MessagesBuff.prototype.getUnreadCount = function() {
    return this._unreadCountCache;
};

MessagesBuff.prototype.setLastSeen = function(msgId, isFromChatd) {
    var self = this;

    if (msgId === self.lastSeen) {
        return; // already the same. can be triggered by the reset notifications in the UI.
    }

    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 999999999);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastSeen, self.messages[self.lastSeen], 0);

    if (!self.lastSeen || lastMsg.orderValue < targetMsg.orderValue) {
        self.lastSeen = msgId;

        if (!isFromChatd && self.joined && !self.isRetrievingHistory && !self.chatRoom.stateIsLeftOrLeaving()) {
            if (self._lastSeenThrottling) {
                clearTimeout(self._lastSeenThrottling);
            }
            self._lastSeenThrottling = setTimeout(function() {
                delete self._lastSeenThrottling;
                self.chatdInt.markMessageAsSeen(self.chatRoom, msgId);
            }, 160);
        }
        if (ChatdPersist.isMasterTab() && self.chatdInt.chatd.chatdPersist) {
            var chatdPersist = self.chatdInt.chatd.chatdPersist;
            chatdPersist.setPointer(self.chatRoom.chatId, 'ls', msgId);
        }

        // check if last recv needs to be updated
        var lastRecvMessage = self.messages[self.lastDelivered];
        if (self.lastDelivered && !lastRecvMessage) {
            lastRecvMessage = {
                'messageId': self.lastDelivered,
                'orderValue': 0 /* from history! */
            };
        }

        if (!lastRecvMessage || lastRecvMessage.orderValue < targetMsg.orderValue) {
            self.setLastReceived(msgId);
        }

        self.trackDataChange();
    }
    else if (self.lastSeen && lastMsg.orderValue >= targetMsg.orderValue) {
        // same message
        if (lastMsg.orderValue === targetMsg.orderValue) {
            if (self._lastRetriedSeenId === self.lastSeen) {
                // lastSeen confirmed.
                delete self._lastRetriedSeenId;
            }
        }
        else {
            // currentMessage > reportedMessage
            // something reported an old lastSeen!
            if (!self._lastRetriedSeenId || self._lastRetriedSeenId !== self.lastSeen) {
                // tell chatd that the last seen is `self.lastSeen` message id
                self.chatdInt.markMessageAsSeen(self.chatRoom, self.lastSeen);
                self._lastRetriedSeenId = self.lastSeen;
            }
        }
    }
};


MessagesBuff.prototype.setLastReceived = function(msgId) {
    var self = this;
    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 0);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastDelivered, self.messages[self.lastDelivered], 999999999);

    if (!self.lastDelivered || lastMsg.orderValue < targetMsg.orderValue) {

        self.lastDelivered = msgId;
        if (!self.isRetrievingHistory) {
            if (targetMsg.userId !== u_handle) {
                self.chatdInt.markMessageAsReceived(self.chatRoom, msgId);
            } else {
                // dont do anything.
            }
        }

        self.trackDataChange();
    }
    else {
        // its totally normal if this branch of code is executed, just don't do nothing
    }
};


MessagesBuff.prototype.messagesHistoryIsLoading = function() {
    var self = this;
    return (
            self.$msgsHistoryLoading && self.$msgsHistoryLoading.state() === 'pending'
        ) || self.chatdIsProcessingHistory;
};

MessagesBuff.prototype.retrieveChatHistory = function(isInitialRetrivalCall) {
    var self = this;

    var len = isInitialRetrivalCall ? Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL : Chatd.MESSAGE_HISTORY_LOAD_COUNT;

    if (self.messagesHistoryIsLoading()) {
        return self.$msgsHistoryLoading;
    }
    else if (self.isDecrypting && self.isDecrypting.state() === 'pending') {
        // if is decrypting, queue a retrieveChatHistory to be executed AFTER the decryption finishes
        var proxyPromise = new MegaPromise();
        self.isDecrypting.always(function() {
            proxyPromise.linkDoneAndFailTo(
                self.retrieveChatHistory(isInitialRetrivalCall)
            );
        });

        return proxyPromise;
    }

    self.isDecrypting = new MegaPromise();

    self.requestedMessagesCount = len;
    self.chatdIsProcessingHistory = true;
    if (!isInitialRetrivalCall) {
        self._currentHistoryPointer -= len;
    }

    self.$msgsHistoryLoading = new MegaPromise();
    self.chatdInt.retrieveHistory(
        self.chatRoom,
        len * -1
    );

    self.trackDataChange();


    var timeoutPromise = createTimeoutPromise(function() {
        return self.$msgsHistoryLoading.state() !== 'pending';
    }, 75, 10000)
        .always(function() {
            self.chatdIsProcessingHistory = false;
        })
        .fail(function() {
            self.$msgsHistoryLoading.reject();
        })
        .always(function() {
            self.trackDataChange();
        });

    self.$msgsHistoryLoading.fail(function() {
        self.logger.error("HIST FAILED: ", arguments);
        if (!isInitialRetrivalCall) {
            self._currentHistoryPointer += len;
        }
    });
    self.$msgsHistoryLoading.always(function() {
        timeoutPromise.verify();
    });


    return self.$msgsHistoryLoading;
};

MessagesBuff.prototype.haveMoreHistory = function() {
    var self = this;

    if (!self.haveMessages) {
        return false;
    }
    else if (self.retrievedAllMessages === false) {
        return true;
    }
    else {
        return false;
    }
};


MessagesBuff.prototype.markAllAsSeen = function() {
    var self = this;
    var lastToBeMarkedAsSeen = null;

    var keys = clone(self.messages.keys());
    keys.forEach(function(k) {
        var msg = self.messages[k];

        if (msg.userId !== u_handle) {
            lastToBeMarkedAsSeen = k;
            return false; // break?
        }
    });

    if (lastToBeMarkedAsSeen) {
        self.setLastSeen(lastToBeMarkedAsSeen);
    }
};
MessagesBuff.prototype.markAllAsReceived = function() {
    var self = this;

    var lastToBeMarkedAsReceived = null;

    // TODO: move to .getItem(-1).messageId ?
    var keys = clone(self.messages.keys());
    keys.forEach(function(k) {
        var msg = self.messages[k];

        lastToBeMarkedAsReceived = k;
    });

    if (lastToBeMarkedAsReceived) {
        self.setLastReceived(lastToBeMarkedAsReceived);
    }
};


/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */
MessagesBuff.prototype.getMessageById = function(messageId) {
    var self = this;
    var found = false;
    for (var i = 0; i < self.messages.length; i++) {
        var v = self.messages.getItem(i);
        if (v && v.messageId === messageId) {
            return v;
        }
    }

    return found;
};

MessagesBuff.prototype.removeMessageById = function(messageId) {
    var self = this;
    self.messages.forEach(function(v, k) {
        if (v.deleted === 1) {
            return; // skip
        }

        if (v.messageId === messageId) {
            v.deleted = 1;
            if (!v.seen) {
                v.seen = true;
            }

            // cleanup the messagesIndex
            self.messages.removeByKey(v.messageId);
            return false; // break;
        }
    });
};
MessagesBuff.prototype.removeMessageBy = function(cb) {
    var self = this;
    self.messages.forEach(function(v, k) {
        if (cb(v, k) === true) {
            self.removeMessageById(v.messageId);
        }
    });
};
MessagesBuff.prototype.removeMessageByType = function(type) {
    var self = this;
    self.removeMessageBy(function(v, k) {
        if (v.type === type) {
            return true;
        }
        else {
            return false;
        }
    });
};

MessagesBuff.prototype.getLatestTextMessage = function() {
    if (this.messages.length > 0) {
        var msgs = this.messages;
        for (var i = msgs.length - 1; i >= 0; i--) {
            var msg = msgs.getItem(i);
            if (
                msg && (
                    (msg.textContents && msg.textContents.length > 0) ||
                    msg.dialogType
                )
            ) {
                if (
                    (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) ||
                    msg.revoked === true
                ) {
                    continue;
                }
                return msg;
            }
        }
        // no renderable msgs found
        return false;
    }
    else {
        return false;
    }
};

MessagesBuff.prototype.verifyMessageOrder = function(messageIdentity, references) {
    var msgOrder = this.messageOrders[messageIdentity];

    for (var i = 0; i < references.length; i++) {
        if (this.messageOrders[references[i]] && this.messageOrders[references[i]] > msgOrder) {
            // There might be a potential message order tampering.It should raise an event to UI.
            return false;
        }
    }
    return true;
};

/**
 * Injects a message (from indexedDB) into the current messagesBuff and triggers all needed "setup" calls for the
 * message to be rendered as it was just received from chatd.
 *
 * @param msgObject {Message}
 */
MessagesBuff.prototype.restoreMessage = function(msgObject) {
    var self = this;

    self.chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
        self.chatRoom,
        msgObject
    );

    if (msgObject.dialogType === "alterParticipants" && msgObject.meta) {
        ChatdIntegration._ensureNamesAreLoaded(msgObject.meta.included);
        ChatdIntegration._ensureNamesAreLoaded(msgObject.meta.excluded);
    }
    self.haveMessages = true;

    self.expectedMessagesCount--;

    if (msgObject.messageId === self.lastSeen) {
        self.lastSeenMessageRetrieved = true;
    }
    if (msgObject.messageId === self.lastDelivered) {
        self.lastDeliveredMessageRetrieved = true;
    }


    self.messages.push(
        msgObject,
        true
    );

};


/**
 * Dump all messages from the .messages to console. Debugging tool.
 */
MessagesBuff.prototype.dumpBufferToConsole = function() {
    var self = this;
    self.messages.forEach(function(v) {
        console.error(v.messageId, new Date((v.delay + v.updated) * 1000), v.orderValue, v.textContents, v.dialogType);
    });
};

/**
 * Remove messages from the buff. Typically used when the user has scrolled to the bottom of the chat, so it does
 * not make sense to render too old messages and waste cpu/mem/dom tree usage.
 */
MessagesBuff.prototype.detachMessages = function() {
    var self = this;
    var msg;
    // instead of causing potential different execution paths, by implementing a in-memory VS in iDB persistence
    // and detaching of messages from the UI, we would need to simply disable the detaching of messages for
    // indexedDB incompatible browsers
    if (!self.chatRoom.megaChat.plugins.chatdIntegration.chatd.chatdPersist) {
        return;
    }
    var removedAnyMessage = false;
    while (msg = self.messages.getItem(self.messages.length - Chatd.MESSAGE_HISTORY_LOAD_COUNT * 2)) {
        self.messages.removeByKey(msg.messageId, true);
        removedAnyMessage = true;
    }

    if (removedAnyMessage === true && self.retrievedAllMessages) {
        self.retrievedAllMessages = false;
    }
};

/**
 * Used to remove all messages in the sorted messages list before a specific messageId
 * Note: This is executed after and by the regular truncate procedure which uses chatd's .buf references (which
 * typically does not include internal/dialog type of messages as call started, etc)
 *
 * @param messageId {String}
 * @private
 */
MessagesBuff.prototype._removeMessagesBefore = function(messageId) {
    var self = this;
    var found = self.getMessageById(messageId);
    if (!found) {
        return;
    }
    var ts = found.delay + (found.updated ? found.updated : 0);

    for (var i = self.messages.length - 1; i >= 0; i--) {
        var currentMessage = self.messages.getItem(i);
        if (currentMessage.delay < ts && currentMessage.dialogType !== "truncated") {
            self.messages.removeByKey(currentMessage.messageId);
        }
    }
};


/**
 * Calculate low and high message ids from the decrypted UI buffer.
 * @param [returnNumsInsteadOfIds] {boolean} if true, would return orderValues instead of ids
 */
MessagesBuff.prototype.getLowHighIds = function(returnNumsInsteadOfIds) {
    var self = this;
    var msg;
    var msgsLen = self.messages.length;
    if (msgsLen === 0) {
        return false;
    }

    var tmpMsg;
    var foundFirst = false;
    var foundLast = false;
    var i = 0;
    do {
        if (i >= msgsLen) {
            break;
        }
        tmpMsg = self.messages.getItem(i++);
        if (tmpMsg instanceof Message && tmpMsg.messageId.length === 11) {
            msg = tmpMsg;
        }
    }
    while (!(msg instanceof Message) || msg.messageId.length !== 11);

    foundFirst = msg ? msg : foundFirst;
    msg = false;

    var last = self.messages.length - 1;
    do {
        if (last < 0) {
            break;
        }
        tmpMsg = self.messages.getItem(last--);
        if (tmpMsg instanceof Message && tmpMsg.messageId.length === 11) {
            msg = tmpMsg;
        }
    }
    while (!(msg instanceof Message) || msg.messageId.length !== 11);

    foundLast = msg ? msg : foundLast;

    return foundFirst && foundLast ? [
        (returnNumsInsteadOfIds ? foundFirst.orderValue : foundFirst.messageId),
        (returnNumsInsteadOfIds ? foundLast.orderValue : foundLast.messageId)
    ] : false;
};
