function Message(chatRoom, messagesBuff, vals) {
    'use strict';
    var self = this;

    self.chatRoom = chatRoom;
    self.messagesBuff = messagesBuff;

    MegaDataObject.call(
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
            'revoked': false,
            '_reactions': false,
            '_queuedReactions': false,
        },
        vals
    );

    self._parent = chatRoom.messagesBuff;
}

inherits(Message, MegaDataObject);

Message._mockupNonLoadedMessage = function(msgId, msg, orderValueIfNotFound) {
    "use strict";

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
        var textMessage = mega.ui.chat.getMessageString(
                message.type || message.dialogType,
                message.chatRoom.type === "group" || message.chatRoom.type === "public"
            ) || "";

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
            var otherContact;
            if (message.meta.excluded && message.meta.excluded.length > 0) {
                otherContact = M.u[message.meta.excluded[0]];
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
                    textMessage = (contact.u === otherContact.u) ?
                        l[23756] :
                        l[8907].replace("%s", contactName);
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
        else if (message.dialogType === "remoteCallStarted") {
            textMessage = mega.ui.chat.getMessageString(
                "call-started",
                message.chatRoom.type === "group" || message.chatRoom.type === "public"
            );

            if (textMessage.splice) {
                textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage);
            }
            else {
                textMessage = textMessage.replace("[X]", contactName);
                textMessage = textMessage.replace("%s", contactName);
            }
        }
        else if (message.dialogType === "openModeClosed") {
            textMessage = l[20569];
        }
        else if (message.dialogType === "chatHandleUpdate" && typeof message.meta.handleUpdate !== 'undefined') {
            textMessage = (message.meta.handleUpdate === 1) ?
                        l[20570]
                        : l[20571];
        }
        else if (message.dialogType === "remoteCallEnded") {
            var meta = message.meta;

            var isGroupOrPublic = message.chatRoom.type === "group" || message.chatRoom.type === "public";
            if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CALL_ENDED || (
                    meta.reason === CallManager.CALL_END_REMOTE_REASON.FAILED && meta.duration >= 5
                )
            ) {
                textMessage = mega.ui.chat.getMessageString("call-ended", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.REJECTED) {
                textMessage = mega.ui.chat.getMessageString("call-rejected", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CANCELED && contact.u === u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-canceled", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.CANCELED && contact.u !== u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-missed", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && contact.u !== u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-missed", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER && contact.u === u_handle) {
                textMessage = mega.ui.chat.getMessageString("call-timeout", isGroupOrPublic);
            }
            else if (meta.reason === CallManager.CALL_END_REMOTE_REASON.FAILED) {
                textMessage = mega.ui.chat.getMessageString("call-failed", isGroupOrPublic);
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
            return textMessage
                .replace(/\[\[/g, "")
                .replace(/\]\]/g, "");
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
            ChatdIntegration._ensureContactExists([message.userId]);
        }
        contact = M.u[message.userId];
    }
    else {
        console.error("No idea how to get contact for: ", message);

        return {};
    }

    return contact;
};

/** @property Message.reacts */
lazy(Message.prototype, 'reacts', function() {
    "use strict";
    return new Reactions(this);
});

Message.prototype.hasAttachments = function() {
    return !!M.chc[this.messageId];
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

    if (action === 'revoke') {
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

        if (M.chc[n.p][n.ch]) {
            Object.assign(n, M.chc[n.p][n.ch]);
        }
        else {
            M.chc[n.p][n.ch] = n;
        }

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

    if (
        this.source === Message.SOURCE.CHATD &&
        this.hasAttachments() &&
        !this.chatRoom.messagesBuff.sharedFiles[this.messageId]
    ) {
        this.chatRoom.messagesBuff.sharedFiles.push(this);
        this.chatRoom.messagesBuff.sharedFiles.trackDataChange();
    }

    megaChat._enqueueMessageUpdate(this);
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

        var sharedFiles = chatRoom.messagesBuff.sharedFiles;
        var sharedMsg = sharedFiles[mId];
        if (sharedMsg) {
            sharedMsg.revoked = true;
            sharedFiles.removeByKey(mId);
            sharedMsg.trackDataChange();
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
Message.prototype._safeParseJSON = tryCatch(JSON.parse.bind(JSON));

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


Message.prototype.isSentOrReceived = function() {
    "use strict";
    var state = this.getState();
    return (
        state === Message.STATE.DELIVERED ||
        state === Message.STATE.SENT  ||
        state === Message.STATE.SEEN ||
        state === Message.STATE.NOT_SEEN
    );
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
    "MANAGEMENT": "\x00",
    "ATTACHMENT": "\x10",
    "REVOKE_ATTACHMENT": "\x11",
    "CONTACT": "\x12",
    "CONTAINS_META": "\x13",
    "VOICE_CLIP": "\x14"
};

Message.MESSAGE_META_TYPE = {
    "RICH_PREVIEW": "\x00",
    "GEOLOCATION": "\x01"
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
    'use strict';
    return this.textContents && this.textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT;
};
Message.prototype.isRenderableManagement = function() {
    'use strict';

    return this.isManagement()
        && (
            this.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT ||
            this.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META ||
            this.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT ||
            this.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP
        );
};

/**
 * To be used when showing a summary of the text message (e.g. a text only repres.)
 */
Message.prototype.getManagementMessageSummaryText = function() {
    if (!this.isManagement()) {
        return this.textContents;
    }
    var messageHasAttachment = (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT);
    var messageIsVoiceClip = (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP);

    if (messageHasAttachment || messageIsVoiceClip) {
        var nodes = JSON.parse(this.textContents.substr(2, this.textContents.length));
        if (nodes.length === 1) {
            return l[8894].replace("%s", nodes[0].name);
        }
        else {
            return l[8895].replace("%s", nodes.length);
        }
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
        var nodes = JSON.parse(this.textContents.substr(2, this.textContents.length));
        if (nodes.length === 1) {
            return l[8896].replace("%s", nodes[0].name);
        }
        else {
            return l[8897].replace("%s", nodes.length);
        }
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META) {
        var metaType = this.textContents.substr(2, 1);
        var meta = JSON.parse(this.textContents.substr(3, this.textContents.length));
        return meta.textMessage || "";
    }
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
        return l[8892];
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
        'metaType',
        '_reactions',
        '_queuedReactions',
    ].forEach(function(k) {
        if (typeof self[k] !== 'undefined') {
            r[k] = self[k];
        }
    });

    return r;
};


Message.fromPersistableObject = function(chatRoom, msgData) {
    "use strict";
    var msgObj = msgData.msgObject;
    var msg = new Message(
        chatRoom,
        chatRoom.messagesBuff,
        {
            'messageId': msgData.msgId,
            'userId': msgData.userId,
            'keyid': msgData.keyId,
            'textContents': msgObj.textContents,
            'delay': msgObj.delay,
            'orderValue': msgData.orderValue,
            'updated': msgObj.updated,
            'sent': msgData.userId === u_handle ? Message.STATE.SENT : Message.STATE.NOT_SENT,
            'deleted': msgObj.deleted,
            'revoked': msgObj.revoked,
            '_reactions': msgObj._reactions,
            '_queuedReactions': msgObj._queuedReactions,
        }
    );
    // move non Message's internal DataStruct properties manually.
    [
        'meta',
        'dialogType',
        'references',
        'msgIdentity',
        'metaType'
    ].forEach(function(k) {
        if (typeof msgObj[k] !== 'undefined') {
            msg[k] = msgObj[k];
        }
    });

    msg.source = Message.SOURCE.IDB;

    return msg;
};
Message.prototype.addReaction = function(userId, utf) {
    "use strict";
    this.reacts.react(userId, utf).then(nop).catch(dump);
};

Message.prototype.delReaction = function(userId, utf) {
    "use strict";
    this.reacts.unreact(userId, utf).then(nop).catch(dump);
};


/**
 * Simple interface/structure wrapper for inline dialogs
 * @param opts
 * @constructor
 */
function ChatDialogMessage(opts) {
    'use strict';

    assert(opts.messageId, 'missing messageId');
    assert(opts.type, 'missing type');

    MegaDataObject.call(
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
        clone(ChatDialogMessage.DEFAULT_OPTS)
    );
    Object.assign(this, clone(opts));

    return this;
}

inherits(ChatDialogMessage, MegaDataObject);

/**
 * Default values for the ChatDialogMessage interface/datastruct.
 *
 * @type {Object}
 */
ChatDialogMessage.DEFAULT_OPTS = Object.freeze({
    'type': '',
    'messageId': '',
    'textContents': '',
    'authorContact': '',
    'delay': 0,
    'buttons': {},
    'read': false,
    'showInitiatorAvatar': false,
    'persist': true
});

// @see {@link MegaDataSortedMap}
function MessageBuffSortedMap() {
    'use strict';
    MegaDataSortedMap.apply(this, arguments);
}

inherits(MessageBuffSortedMap, MegaDataSortedMap);

tmp = function(method) {
    'use strict';
    return function msgBufSMWrap(msg, ignoreDB) {
        // signal about this message action *before* actually performing it.
        msg = msg in this && this[msg];
        if (msg instanceof Message) {
            msg._onMessageAction(ignoreDB ? method : 'revoke');
        }
        // proceed to the actual action.
        var res = MegaDataSortedMap.prototype[method].apply(this, arguments);

        var parent = this._parent;
        var chatdPersist = parent.chatdPersist;

        if (ignoreDB !== true && chatdPersist) {
            var chatRoom = parent.chatRoom;
            var members = chatRoom.members;

            if (
                !(chatRoom.type === "public" &&
                    parent.joined === true &&
                    (
                        members[u_handle] === undefined ||
                        members[u_handle] === -1
                    ))
            ) {
                chatdPersist.persistMessageBatched(
                    method === "removeByKey" ? "remove" : method,
                    chatRoom.chatId,
                    toArray.apply(null, arguments)
                );
            }
        }

        return res;
    };
};

MessageBuffSortedMap.prototype.append = tmp('push');
MessageBuffSortedMap.prototype.remove = tmp('remove');
MessageBuffSortedMap.prototype.replace = tmp('replace');
MessageBuffSortedMap.prototype.removeByKey = tmp('removeByKey');
tmp = null;

MessageBuffSortedMap.prototype.push = function(msg) {
    'use strict';
    var parent = this._parent;
    var chatRoom = parent.chatRoom;
    var res = this.append.apply(this, arguments);

    if (!(msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false)) {
        chatRoom.trigger('onMessagesBuffAppend', msg);
    }

    if (chatRoom.scrolledToBottom === true
        && chatRoom.activeSearches === 0
        && this.length > Chatd.MESSAGE_HISTORY_LOAD_COUNT * 2) {

        parent.detachMessages();
    }
    return res;
};

/**
 * Basic collection class that should collect all messages from different sources (chatd at the moment and xmpp in the
 * future)
 *
 * @param chatRoom
 * @param chatdInt
 * @constructor
 */
function MessagesBuff(chatRoom, chatdInt) {
    'use strict';
    var self = this;

    self.chatRoom = chatRoom;
    self.chatdInt = chatdInt;
    self.chatd = chatdInt.chatd;
    self.chatdPersist = self.chatd.chatdPersist;

    self.messages = new MessageBuffSortedMap("messageId", MessagesBuff.orderFunc, this);
    self.sharedFiles = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc, this);
    self.messagesBatchFromHistory = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);
    self.sharedFilesBatchFromHistory = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);
    self.sharedFilesLoadedOnce = false;
    self.sharedFilesPage = 0;

    // because on connect, chatd.js would request hist retrieval automatically, lets simply set a "lock"
    self.isDecrypting = new MegaPromise();

    self.lastSeen = null;
    self.lastSent = null;
    self.lastDelivered = null;
    self.isRetrievingHistory = false;
    self.isRetrievingSharedFiles = false;
    self.haveMoreSharedFiles = true; // by default assume there are shared files left for fetching[
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
    self.sharedFilesMessageOrders = {};

    var chatRoomId = chatRoom.roomId;
    var loggerIsEnabled = !!localStorage.messagesBuffLogger;

    self.logger = MegaLogger.getLogger(
        "messagesBuff[" + chatRoomId + "]",
        {
            minLogLevel: function() {
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            }
        },
        chatRoom.logger
    );

    MegaDataMap.call(this, chatRoom);

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

    chatRoom.rebind('onRoomDisconnected.mb', function() {
        self.isRetrievingSharedFiles = false;
        self.isRetrievingHistory = false;
        self.sendingListFlushed = true;
        self.expectedMessagesCount = 0;
        if (self.$msgsHistoryLoading) {
            self.$msgsHistoryLoading.reject();
            delete self.$msgsHistoryLoading;
        }
        if (self.$sharedFilesLoading) {
            self.$sharedFilesLoading.reject();
            delete self.$sharedFilesLoading;
        }
    });

    chatRoom.rebind('onHistoryDecrypted.mb', function() {
        if (chatRoom.messagesBuff.isDecrypting) {
            chatRoom.messagesBuff.isDecrypting.resolve();
            delete chatRoom.messagesBuff.isDecrypting;
        }

        if (
            !self.isRetrievingSharedFiles &&
            self.haveMoreHistory() &&
            self.messages.length <= Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL
        ) {
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
        if (self.$isDecryptingSharedFiles) {
            self.$isDecryptingSharedFiles.resolve();
            delete self.$isDecryptingSharedFiles;
        }

        chatRoom.trigger('onHistoryDecryptedDone');
    });

    chatRoom.rebind('onMessageLastSeen.messagesBuff' + chatRoomId, function(e, eventData) {
        self.setLastSeen(eventData.messageId, eventData.chatd);
        self.trackDataChange();
    });

    chatRoom.rebind('onMembersUpdated.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;

        if ((eventData.userId === u_handle)
                || (chatRoom.type === "public"))  {
            self.joined = true;
            if (chatRoom.state === ChatRoom.STATE.JOINING) {
                chatRoom.setState(ChatRoom.STATE.READY);
            }
        }
    });

    self.chatRoom.rebind('onMessageConfirm.messagesBuff' + chatRoomId, function(e, eventData) {
        self.lastSent = eventData.messageId;
        self.trackDataChange();
    });

    self.chatRoom.rebind('onMessageLastReceived.messagesBuff' + chatRoomId, function(e, eventData) {
        self.setLastReceived(eventData.messageId);
    });

    self.chatRoom.rebind('onMessagesHistoryDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;

        Reactions.clearQueuedReactionsForChat(chatRoom.chatId);
        var requestedMessagesCount;
        if (self.isRetrievingSharedFiles) {
            requestedMessagesCount = self.requestedMessagesCount || Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL;

            self.trigger('onHistoryFinished');

            self.isRetrievingSharedFiles = false;

            if (
                typeof(self.expectedMessagesCount) === 'undefined'
            ) {
                self.expectedMessagesCount = 0;
                self.haveMoreSharedFiles = true;
            }
            else if (
                self.expectedMessagesCount === requestedMessagesCount
            ) {
                // this is an empty/new chat.
                self.expectedMessagesCount = 0;
                self.haveMoreSharedFiles = false;
            }
            else if (
                self.expectedMessagesCount
            ) {
                // if the expectedMessagesCount is not 0 and < requested, then...chatd/idb returned < then the
                // requested #, which means, that there is no more history.
                self.haveMoreSharedFiles = !(self.expectedMessagesCount < requestedMessagesCount);
            }

            if (self.$sharedFilesLoading) {
                self.$sharedFilesLoading.resolve();
                delete self.$sharedFilesLoading;
            }
        }
        else {
            requestedMessagesCount = self.requestedMessagesCount || Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL;
            self.isRetrievingHistory = false;
            self.sendingListFlushed = true;


            if (
                typeof(self.expectedMessagesCount) === 'undefined'
            ) {
                self.expectedMessagesCount = 0;
                self.retrievedAllMessages = false;
            }
            else if (
                self.expectedMessagesCount === requestedMessagesCount
            ) {
                // this is an empty/new chat.
                self.expectedMessagesCount = 0;
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

            self.trigger('onHistoryFinished');

            if (self.$msgsHistoryLoading) {
                self.$msgsHistoryLoading.resolve();
                delete self.$msgsHistoryLoading;
            }

            self.trackDataChange();

            if (chatRoom.isCurrentlyActive && requestedMessagesCount === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
                // chat was active, when initial loading finished...request more messages
                chatRoom.trigger('onChatShown.mb');
            }
        }
    });


    self.chatRoom.rebind('onMessagesHistoryRequest.messagesBuff' + chatRoomId, function(e, eventData) {
        if (!eventData.isRetrievingSharedFiles) {
            self.isRetrievingHistory = true;
        }
        else {
            self.isRetrievingSharedFiles = true;
        }
        self.expectedMessagesCount = eventData.count === 0xDEAD ? null : Math.abs(eventData.count);
        self.trackDataChange();
    });

    self.chatRoom.rebind('onMessagesHistoryRetrieve.messagesBuff' + chatRoomId, function(e, eventData) {
        self.haveMessages = true;
        self.trackDataChange();
        self.retrieveChatHistory(true);
    });

    self.chatRoom.rebind('onMessageStore.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;
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

        if (!self.isRetrievingSharedFiles) {
            if (eventData.messageId === self.lastSeen) {
                self.lastSeenMessageRetrieved = true;
            }
            if (eventData.messageId === self.lastDelivered) {
                self.lastDeliveredMessageRetrieved = true;
            }
        }


        if (!eventData.isNew) {
            if (typeof self.expectedMessagesCount !== 'undefined') {
                self.expectedMessagesCount--;
            }

            if (!self.isRetrievingSharedFiles) {
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
                // is a shared file entry
                self.sharedFilesBatchFromHistory.push(msgObject);
            }
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

            if (!self.isRetrievingHistory) {
                self.trigger('onNewMessageReceived', msgObject);
            }

            if (eventData.pendingid) {
                chatRoom.trigger('onPendingMessageConfirmed', msgObject);
            }
        }
    });

    self.chatRoom.rebind('onMessageCheck.messagesBuff' + chatRoomId, function(e, eventData) {
        self.haveMessages = true;

        if (!self.messages[eventData.messageId]) {
            self.retrieveChatHistory(true);
        }
    });

    self.chatRoom.rebind('onMessageUpdated.messagesBuff' + chatRoomId, function(e, eventData) {
        // convert id to unsigned.
        eventData.id >>>= 0;

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
                    }
                    else {
                        chatRoom.one('onHistoryDecrypted.dbgverify', function() {
                            self.chatd.trigger('onMessageUpdated.messagesBuff' + chatRoomId, eventData);
                        });
                    }
                }
                else if (self.chatd.chatdPersist) {
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
                        r.delay = eventData.ts;
                    }
                    self.chatd.chatdPersist.modifyPersistedMessage(chatRoom.chatId, r);
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
                    'sent': true,
                    '_reactions': originalMessage ? originalMessage._reactions : undefined,
                    '_queuedReactions': originalMessage ? originalMessage._queuedReactions : undefined,
                }
            );

            ChatdIntegration.decryptMessageHelper(editedMessage)
                .then(function(decrypted) {
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
                        if (editedMessage.textContents === "" && editedMessage.dialogType !== 'truncated') {
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

                    return decrypted;
                })
                .then(function(decrypted) {
                    chatRoom.megaChat.plugins.chatdIntegration._parseMessage(chatRoom, editedMessage);
                    chatRoom.messagesBuff.messages.replace(editedMessage.messageId, editedMessage);

                    chatRoom.trigger('onMessageUpdateDecrypted', editedMessage);

                    if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                        var messageKeys = clone(chatRoom.messagesBuff.messages.keys());

                        for (var i = 0; i < messageKeys.length; i++) {
                            var v = self.messages[messageKeys[i]];

                            if (v.orderValue < eventData.id) {
                                // remove the messages with orderValue < eventData.id from message buffer.
                                self.messages.removeByKey(v.messageId);
                            }
                        }

                        self._removeMessagesBefore(editedMessage.messageId);
                    }
                })
                .catch(function(ex) {
                    self.logger.error('Failed to decrypt message!', ex);
                    self.messages.removeByKey(eventData.messageId);
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
                foundMessage = self.getByInternalId(eventData.id & 0xffffffff);

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

            ChatdIntegration.decryptMessageHelper(outgoingMessage)
                .then(function(decrypted) {
                    // if the edited payload is an empty string, it means the message has been deleted.
                    if (typeof decrypted.payload === 'undefined' || decrypted.payload === null) {
                        decrypted.payload = "";
                    }
                    outgoingMessage.textContents = decrypted.payload;
                    chatRoom.messagesBuff.messages.push(outgoingMessage);

                    chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                        chatRoom, chatRoom.messagesBuff.messages[eventData.messageId]
                    );
                })
                .catch(function(ex) {
                    self.logger.error('Failed to decrypt message!', ex);
                });
        }

        // pending would be handled automatically, because all NEW messages are set with state === NOT_SENT(== PENDING)
    });

    self.chatRoom.rebind('onMessagesKeyIdDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;
        if (!chatRoom.protocolHandler) {
            ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
                chatRoom.protocolHandler.setKeyID(eventData.keyxid, eventData.keyid);
                self.trackDataChange();
            });
        }
        else {
            chatRoom.protocolHandler.setKeyID(eventData.keyxid, eventData.keyid);
            self.trackDataChange();
        }
    });

    self.chatRoom.rebind('onMessageKeysDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;
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

        chatRoom._keysAreSeeding = new MegaPromise();

        var seedKeys = function() {
            for (var i=0;i < keys.length;i++) {
                if (chatRoom.protocolHandler.seedKeys([keys[i]])) {
                    var cacheKey = keys[i].userId + "-" + keys[i].keyid;
                    delete  chatRoom.notDecryptedKeys[cacheKey];
                }
            }
            chatRoom._keysAreSeeding.resolve();
        };

        ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
            ChatdIntegration._ensureKeysAreLoaded(keys, undefined, chatRoom.publicChatHandle).always(seedKeys);
        });

        self.trackDataChange();
    });

    self.chatRoom.rebind('onMessageIncludeKey.messagesBuff' + chatRoomId, function(e, eventData) {
        self.chatRoom.protocolHandler.setIncludeKey(true);
        self.trackDataChange();
    });

    self.chatRoom.rebind('onMessageKeyRestore.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatRoom;
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
        ChatdIntegration._ensureKeysAreLoaded(keys, undefined, chatRoom.publicChatHandle).always(seedKeys);

        self.trackDataChange();
    });

    self.addChangeListener(function() {
        var newCounter = 0;
        self.messages.forEach(function(v, k) {
            if (
                v.getState &&
                v.getState() === Message.STATE.NOT_SEEN &&
                !v.deleted &&
                v.textContents !== "" &&
                (
                    (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) ||
                    (
                        v.delay > 1592222400 && /* enable this only after 15th of June 12:00, as agreed that other
                        apps would have this feature already in production by that date */
                        v.dialogType === "remoteCallEnded" && v.meta && v.meta.userId !== u_handle &&
                        (
                            v.meta.reason === CallManager.CALL_END_REMOTE_REASON.CANCELED ||
                            v.meta.reason === CallManager.CALL_END_REMOTE_REASON.NO_ANSWER
                        )
                    ) ||
                    v.textContents /* not false-based value */
                )
            ) {
                var shouldRender = true;
                if (
                    (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) ||
                    v.revoked === true ||
                    /* dont add to the unread newCounter if the current user is not a part of the chat */
                    (Object.keys(self.chatRoom.members).indexOf(u_handle) === -1)
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
            self.chatRoom.trigger('onUnreadCountUpdate', newCounter);
            self.chatRoom.megaChat.updateSectionUnreadCount();
        }
    });

    self.chatRoom.rebind('onAddReaction.messagesBuff' + chatRoomId, function(e, eventData) {
        self.onAddReaction(eventData);
    });

    self.chatRoom.rebind('onDelReaction.messagesBuff' + chatRoomId, function(e, eventData) {
        self.onDelReaction(eventData);
    });

    self.chatRoom.rebind('onReactionSn.messagesBuff' + chatRoomId, function(e, eventData) {
        self.onReactionSn(eventData);
    });
    self.chatRoom.rebind('onAddDelReactionReject.messagesBuff' + chatRoomId, function(e, eventData) {
        self.onReactionReject(eventData);
    });

    self.initChatdPersistEvents();
};

inherits(MessagesBuff, MegaDataMap);

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

MessagesBuff.prototype.initChatdPersistEvents = function() {
    var self = this;
    self.chatRoom.rebind('onMeJoined.mb', function() {
        var cp = self.chatRoom.megaChat.plugins.chatdIntegration.chatd.chatdPersist;

        if (cp) {
            var r = self.chatRoom;
            if (self.chatRoom.type === "public") {
                if (self.lastSeen) {
                    self.setLastSeen(self.lastSeen, false, true);
                }
                self.messages.forEach(function(msg) {
                    cp.persistMessageBatched("push", r.chatId, [msg]);
                });
            }
        }
    });

    self.chatRoom.rebind('onMeLeft.mb', function() {

        if (self.chatRoom.megaChat.plugins.chatdIntegration.chatd.chatdPersist) {
            var r = self.chatRoom;
            var cp = r.megaChat.plugins.chatdIntegration.chatd.chatdPersist;
            if (self.chatRoom.type === "public") {
                cp.deleteAllMessages(r.chatId).always(dump);
            }
        }
    });
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

MessagesBuff.prototype.setLastSeen = function(msgId, isFromChatd, force) {
    var self = this;

    if (!force && msgId === self.lastSeen) {
        return; // already the same. can be triggered by the reset notifications in the UI.
    }

    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 999999999);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastSeen, self.messages[self.lastSeen], 0);

    if (!self.lastSeen || lastMsg.orderValue < targetMsg.orderValue || force) {
        self.lastSeen = msgId;

        if (
            force || (
                !isFromChatd &&
                self.joined &&
                !self.isRetrievingHistory &&
                typeof self.chatRoom.members[u_handle] !== 'undefined' &&
                !anonymouschat
            )
        ) {
            delay('MessagesBuff.setLastSeen:' + this, function() {
                self.chatdInt.markMessageAsSeen(self.chatRoom, msgId);
            }, 200);
        }
        if (ChatdPersist.isMasterTab() && self.chatdInt.chatd.chatdPersist) {
            var chatdPersist = self.chatdInt.chatd.chatdPersist;
            chatdPersist.setPointer(self.chatRoom.chatId, 'ls', msgId).always(nop);
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
    'use strict';
    return !!this.$msgsHistoryLoading;
};

MessagesBuff.prototype.retrieveSharedFilesHistory = function(len) {
    var self = this;
    len = typeof len === "undefined" ? 32 : len;
    if (self.$msgsHistoryLoading) {
        var proxyPromise = new MegaPromise();
        self.$msgsHistoryLoading.finally(function() {
            proxyPromise.linkDoneAndFailTo(self.retrieveSharedFilesHistory());
        });
        return proxyPromise;
    }
    else if (self.$isDecryptingSharedFiles) {
        var proxyPromise = new MegaPromise();
        self.$isDecryptingSharedFiles.finally(function() {
            proxyPromise.linkDoneAndFailTo(self.retrieveSharedFilesHistory());
        });
        return proxyPromise;
    }
    else if (self.$sharedFilesLoading) {
        var proxyPromise = new MegaPromise();
        self.$sharedFilesLoading.finally(function() {
            proxyPromise.linkDoneAndFailTo(self.retrieveSharedFilesHistory());
        });
        return proxyPromise;
    }
    else {
        var lastKnownMessage = self.getLastMessageFromServer();
        /**
         * Edge case:
         * If the last known message was retrieved via HIST e.g. as OLDMSG, it would not be synced in the sharedFiles.
         * But the request for NODEHIST is using that ID as a "last known message", so NODEHIST won't re-send it
         * either. To solve that, I'm simply moving that message -> sharedFiles
         */
        if (
            lastKnownMessage &&
            !self.sharedFilesLoadedOnce &&
            lastKnownMessage.hasAttachments &&
            lastKnownMessage.hasAttachments() &&
            !lastKnownMessage.source
        ) {
            self.sharedFiles.push(lastKnownMessage);
        }
        self.sharedFilesLoadedOnce = true;
        self.$isDecryptingSharedFiles = new MegaPromise();
        self.$sharedFilesLoading = new MegaPromise();
        self.requestedMessagesCount = len;

        var lastMsgId = self.sharedFiles.length === 0 ?
                (lastKnownMessage ? lastKnownMessage.messageId : "") :
                self.sharedFiles.getItem(0).messageId;



        if (!lastMsgId) {
            self.$sharedFilesLoading.reject();
            self.$isDecryptingSharedFiles.reject();
        }
        else {
            self.chatdInt.chatd._sendNodeHist(self.chatRoom.chatIdBin, base64urldecode(lastMsgId), len * -1);

            self.$sharedFilesLoading.always(function () {
                delete self.$sharedFilesLoading;
            });
            self.$isDecryptingSharedFiles.always(function () {
                delete self.$isDecryptingSharedFiles;
            });
        }

        return self.$isDecryptingSharedFiles;
    }
};

MessagesBuff.prototype.retrieveChatHistory = function(isInitialRetrivalCall) {
    var self = this;

    var len = (
        Number.isInteger(isInitialRetrivalCall) ?
            isInitialRetrivalCall :
            isInitialRetrivalCall ? Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL : Chatd.MESSAGE_HISTORY_LOAD_COUNT
    );
    if (self.$msgsHistoryLoading) {
        return self.$msgsHistoryLoading;
    }
    else if (self.isDecrypting) {
        // if is decrypting, queue a retrieveChatHistory to be executed AFTER the decryption finishes
        var proxyPromise = new MegaPromise();
        self.isDecrypting.finally(function() {
            proxyPromise.linkDoneAndFailTo(
                self.retrieveChatHistory(isInitialRetrivalCall)
            );
        });

        return proxyPromise;
    }

    self.isDecrypting = new MegaPromise();

    self.requestedMessagesCount = len;
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
        return !self.$msgsHistoryLoading;
    }, 500, 6e4 * 5)
        .catch(function() {
            if (self.$msgsHistoryLoading) {
                self.$msgsHistoryLoading.reject();
                delete self.$msgsHistoryLoading;
            }
        })
        .always(function() {
            self.trackDataChange();
        });

    self.$msgsHistoryLoading.catch(function(ex) {
        self.logger.error("HIST FAILED: ", ex);
        if (!isInitialRetrivalCall) {
            self._currentHistoryPointer += len;
        }
    });
    self.$msgsHistoryLoading.always(function() {
        timeoutPromise.verify();
        timeoutPromise = null;
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
    "use strict";

    var self = this;
    return self.messages[messageId] || false;
};

/**
 * Get message by orderValue
 * @param {String|Number} orderValue orderValue
 * @returns {Message|boolean} the found message or false
 */
MessagesBuff.prototype.getMessageByOrderValue = function(orderValue) {
    "use strict";
    var self = this;
    for (var i = 0; i < self.messages.length; i++) {
        var v = self.messages.getItem(i);
        if (v && v.orderValue === orderValue) {
            return v;
        }
    }

    return false;
};

MessagesBuff.prototype.removeMessageById = function(messageId) {
    "use strict";

    var self = this;
    var msg = self.getMessageById(messageId);
    if (!msg || msg.deleted) {
        return;
    }

    msg.deleted = 1;
    if (!msg.seen) {
        msg.seen = true;
    }

    // cleanup the messagesIndex
    self.messages.removeByKey(msg.messageId);
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

MessagesBuff.prototype.getLastMessageFromServer = function() {
    "use strict";
    if (this.messages.length > 0) {
        var msgs = this.messages;
        for (var i = msgs.length - 1; i >= 0; i--) {
            var msg = msgs.getItem(i);
            if (
                msg && (
                    (msg.textContents && msg.textContents.length > 0) ||
                    msg.dialogType
                ) &&
                msg.messageId && msg.messageId.length === 11
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

MessagesBuff.prototype.verifyMessageOrder = function(messageIdentity, references, messageOrdersSource) {
    messageOrdersSource = messageOrdersSource || this.messageOrders;
    var msgOrder = messageOrdersSource[messageIdentity];

    for (var i = 0; i < references.length; i++) {
        // skip "" references, known bug of native MEGAchat sdk
        if (
            references[i] &&
            references[i] !== "\0\0\0\0\0\0\0\0" &&
            messageOrdersSource[references[i]] &&
            messageOrdersSource[references[i]] > msgOrder
        ) {
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
        ChatdIntegration._ensureContactExists(msgObject.meta.included);
        ChatdIntegration._ensureContactExists(msgObject.meta.excluded);
    }
    self.haveMessages = true;

    if (typeof self.expectedMessagesCount !== 'undefined') {
        self.expectedMessagesCount--;
    }

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

    if (msgObject._queuedReactions) {
        Reactions._initIntrnlVarsForQueuedRctn(this.chatRoom.chatId, msgObject);
    }

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
 *
 * @returns {Boolean} if removed any messages
 */
// eslint-disable-next-line complexity
MessagesBuff.prototype.detachMessages = SoonFc(70, function() {
    'use strict';
    var self = this;
    var room = self.chatRoom;

    // instead of causing potential different execution paths, by implementing a in-memory VS in iDB persistence
    // and detaching of messages from the UI, we would need to simply disable the detaching of messages for
    // indexedDB incompatible browsers
    if (!room.megaChat.plugins.chatdIntegration.chatd.chatdPersist) {
        return false;
    }
    if (room.type === "public" && !anonymouschat && room.publicChatHandle && room.publicChatKey) {
        // do not detach messages in pub mode..otherwise, IF the user joins - the chat history that would get
        // persisted may contain missing messages in the iDB db.
        return false;
    }
    if (room.isScrollingToMessageId) {
        // do not detach messages if we are programatically retrieving history and scrolling to specific messageId
        return false;
    }

    var detachCount = self.chatRoom.isCurrentlyActive ? Chatd.MESSAGE_HISTORY_LOAD_COUNT * 2 : 3;
    if (self.messages.length > detachCount) {
        var deletedItems = self.messages.splice(0,  self.messages.length - detachCount);

        // detach attachments?
        if (M.chc[self.chatRoom.roomId]) {
            var attachmentsIndex = {};
            var atts = M.chc[self.chatRoom.roomId];
            for (var k in atts) {
                attachmentsIndex[atts[k].m] = k;
            }

            for (var i = 0; i < deletedItems.length; i++) {
                // cleanup the `messageId` index
                delete M.chc[deletedItems[i]];

                // search and optionally cleanup the [roomId] index in M.chc (atts)
                var foundKey = attachmentsIndex[deletedItems[i]];

                if (typeof foundKey !== "undefined") {
                    delete atts[foundKey];
                }
            }
        }

        if (self.retrievedAllMessages) {
            self.retrievedAllMessages = false;
        }
    }
});

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

// eslint-disable-next-line complexity
MessagesBuff.prototype.getRenderableSummary = function(lastMessage) {
    "use strict";

    var renderableSummary;
    if (lastMessage.renderableSummary) {
        renderableSummary = lastMessage.renderableSummary;
    }
    else {
        if (lastMessage.isManagement && lastMessage.isManagement()) {
            renderableSummary = lastMessage.getManagementMessageSummaryText();
        }
        else if (!lastMessage.textContents && lastMessage.dialogType) {
            renderableSummary = Message._getTextContentsForDialogType(lastMessage);
        }
        else {
            renderableSummary = lastMessage.textContents;
        }
        renderableSummary = renderableSummary && escapeHTML(renderableSummary, true) || '';

        var escapeUnescapeArgs = [
            {'type': 'onPreBeforeRenderMessage', 'textOnly': true},
            {'message': {'textContents': renderableSummary}},
            ['textContents', 'messageHtml'],
            'messageHtml'
        ];

        megaChat.plugins.btRtfFilter.escapeAndProcessMessage(
            escapeUnescapeArgs[0],
            escapeUnescapeArgs[1],
            escapeUnescapeArgs[2],
            escapeUnescapeArgs[3]
        );
        renderableSummary = escapeUnescapeArgs[1].message.textContents;

        renderableSummary = megaChat.plugins.emoticonsFilter.processHtmlMessage(renderableSummary);
        renderableSummary = megaChat.plugins.rtfFilter.processStripRtfFromMessage(renderableSummary);

        escapeUnescapeArgs[1].message.messageHtml = renderableSummary;

        escapeUnescapeArgs[0].type = "onPostBeforeRenderMessage";

        renderableSummary = megaChat.plugins.btRtfFilter.unescapeAndProcessMessage(
            escapeUnescapeArgs[0],
            escapeUnescapeArgs[1],
            escapeUnescapeArgs[2],
            escapeUnescapeArgs[3]
        );

        renderableSummary = renderableSummary || "";
        renderableSummary = renderableSummary.replace("<br/>", "\n").split("\n");
        renderableSummary = renderableSummary.length > 1 ? renderableSummary[0] + "..." : renderableSummary[0];
    }

    var author;

    if (lastMessage.dialogType === "privilegeChange" && lastMessage.meta && lastMessage.meta.targetUserId) {
        author = M.u[lastMessage.meta.targetUserId[0]] || Message.getContactForMessage(lastMessage);
    }
    else if (lastMessage.dialogType === "alterParticipants") {
        author = M.u[lastMessage.meta.included[0] || lastMessage.meta.excluded[0]] ||
            Message.getContactForMessage(lastMessage);
    }
    else {
        author = Message.getContactForMessage(lastMessage);
    }

    if (author) {
        if (lastMessage.chatRoom.type === "private") {
            if (author.u === u_handle) {
                renderableSummary = l[19285] + " " + renderableSummary;
            }
        }
        else if (lastMessage.chatRoom.type === "group" || lastMessage.chatRoom.type === "public") {
            if (author.u === u_handle) {
                renderableSummary = l[19285] + " " + renderableSummary;
            }
            else {
                var name = M.getNameByHandle(author.u);
                name = ellipsis(name, undefined, 11);
                if (name) {
                    renderableSummary = escapeHTML(name) + ": " + renderableSummary;
                }
            }
        }
    }

    return renderableSummary;
};

/**
 * Does an XOR add on 2 arrays
 *
 * @param {Array|Uint32Array} a
 * @param {Array|Uint32Array} b
 * @private
 */
MessagesBuff._XOR_ARR = function(a, b) {
    "use strict";
    for (var i = 0; i < a.length; i++) {
        a[i] ^= b[i % b.length];
    }
};

/**
 * Does what it says
 *
 * @param {Number} num
 * @param {Number} x
 * @returns {number}
 * @private
 */
MessagesBuff._roundToNearestMultipleOf = function(num, x) {
    "use strict";
    return Math.ceil(num / x) * x;
};

/**
 * Add padding \0 to a string
 *
 * @param {String} s16
 * @param {Number} fixLength
 * @returns {String}
 * @private
 */
MessagesBuff._padString = function(s16, fixLength) {
    "use strict";
    return s16 && fixLength ? s16.padStart(fixLength, "\0") : s16;
};

/**
 * Utility to depad \0s from the beginging of a string
 *
 * @param {String} s
 * @returns {*}
 * @private
 */
MessagesBuff._depadString = function(s) {
    "use strict";
    return s.replace(/^(\0+)/g, '');
};

/**
 * Private code that is used for encrypting reaction data to be sent to chatd
 *
 * @private
 * @param {String} msgId Message id
 * @param {Object} meta data
 * @param {String} key computed key
 * @param {Message} [msg] Message from DB
 * @returns {Promise}
 */
MessagesBuff.prototype.encryptReaction = promisify(function(resolve, reject, msgId, meta, key, msg) {
    "use strict";
    if (!meta || !meta.u) {
        return reject(EARGS);
    }

    msg = msg || this.getMessageById(msgId);
    var pk = this.chatRoom.protocolHandler.participantKeys;
    key = key || (
        msg.keyid
            ? pk[msg.userId] && pk[msg.userId][a32_to_str([msg.keyid])]
            : base64urldecode(this.chatRoom.protocolHandler.getUnifiedKey())
    );

    if (!key) {
        var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
        if (!cdp) {
            return reject(EKEY);
        }

        var self = this;
        cdp.getKey(self.chatRoom.chatId, msg.userId, msg.keyid)
            .then(function(r) {
                self.chatRoom.protocolHandler.seedKeys([
                    {
                        userId: msg.userId,
                        keyid: msg.keyid,
                        keylen: r.key.length,
                        key: r.key
                    }
                ]);
                var decryptedKey = self.chatRoom.protocolHandler.participantKeys[msg.userId][a32_to_str([msg.keyid])];

                if (decryptedKey) {
                    self.encryptReaction(msgId, meta, decryptedKey).then(resolve).catch(reject);
                }
                else {
                    reject(EKEY);
                }
            })
            .catch(function(ex) {
                if (d) {
                    self.logger.warn("Retrieve and seedKeys failed:", ex);
                }
                reject(EKEY);
            });
        return;
    }

    if (!key) {
        this.logger.warn("Key not found for encryptReaction", msgId);
    }
    key = new Uint32Array(str_to_a32(key));
    var msgId32 = new Uint32Array(str_to_a32(msgId));
    MessagesBuff._XOR_ARR(key, msgId32);

    var emoji = to8(meta.u);

    // pad s to min 4 characters.
    // xxtea won't work with <4 characters.
    emoji = MessagesBuff._padString(
        emoji,
        MessagesBuff._roundToNearestMultipleOf(emoji.length, 4)
    );

    var plaintext = msgId.substr(0, 4) + emoji;

    resolve(a32_to_str(xxtea.encryptUint32Array(new Uint32Array(str_to_a32(plaintext)), key)));
});

/**
 * Private code that is used for decrypting reaction data received from the chatd
 *
 * @private
 * @param {String} msgId
 * @param {String} s
 * @param {String} key
 * @param {String} [isRetry]
 * @param {Message} [msg] Message from DB
 * @returns {Promise}
 */
MessagesBuff.prototype.decryptReaction = promisify(function(resolve, reject, msgId, s, key, isRetry, msg) {
    "use strict";
    var self = this;
    msg = msg || this.getMessageById(msgId);
    if (msg === false && !isRetry && this.isRetrievingHistory) {
        // in case the message is not yet decrypted and put into the msgs buff, wait and retry
        self.chatRoom.one('onHistoryDecryptedDone', function() {
            self.decryptReaction(msgId, s, key, true).then(resolve).catch(reject);
        });
        return;
    }

    var pk = this.chatRoom.protocolHandler.participantKeys;
    key = key || (
        msg.keyid
            ? pk[msg.userId] && pk[msg.userId][a32_to_str([msg.keyid])]
            : base64urldecode(this.chatRoom.protocolHandler.getUnifiedKey())
    );

    if (!key) {
        var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
        if (!cdp) {
            console.error("Cant decrypt reaction", msgId, s, key, key);
            return reject(EKEY);
        }

        cdp.getKey(self.chatRoom.chatId, msg.userId, msg.keyid)
            .then(function(r) {
                self.chatRoom.protocolHandler.seedKeys([
                    {
                        userId: msg.userId,
                        keyid: msg.keyid,
                        keylen: r.key.length,
                        key: r.key
                    }
                ]);
                var decryptedKey = self.chatRoom.protocolHandler.participantKeys[msg.userId][a32_to_str([msg.keyid])];

                if (decryptedKey) {
                    self.decryptReaction(msgId, s, decryptedKey, undefined, msg).then(resolve).catch(reject);
                }
                else {
                    reject(EKEY);
                }
            })
            .catch(function(ex) {
                if (d) {
                    self.logger.warn("Retrieve and seedKeys failed [2]:", ex);
                }
                reject(EKEY);
            });
        return;
    }

    if (!key) {
        this.logger.warn("Key not found for decryptReaction", msgId);
    }
    key = new Uint32Array(str_to_a32(key));
    var msgId32 = new Uint32Array(str_to_a32(msgId));
    MessagesBuff._XOR_ARR(key, msgId32);

    var res = a32_to_str(xxtea.decryptUint32Array(new Uint32Array(str_to_a32(s)), key));
    resolve(from8(MessagesBuff._depadString(res.substr(4))));
});


/**
 * Called when the user triggers a reaction in the UI
 *
 * @param {Number} op
 * @param {String} msgId
 * @param {String} slug
 * @param {Object} meta
 * @private
 */
MessagesBuff.prototype._userReaction = function(op, msgId, slug, meta) {
    "use strict";
    var self = this;
    return self.encryptReaction(msgId, meta)
        .then(function(r) {
            Reactions.sendAndQueueOperation(
                op,
                self.chatRoom,
                self.getMessageById(msgId),
                msgId,
                slug,
                meta,
                r
            );
        })
        .catch(dump);

};

/**
 * Called when the user triggers a add reaction in the UI
 *
 * @param {String} msgId
 * @param {String} slug
 * @param {Object} meta
 */
MessagesBuff.prototype.userAddReaction = function(msgId, slug, meta) {
    "use strict";
    return this._userReaction(Reactions.OPERATIONS.ADD, msgId, slug, meta);
};

/**
 * Called when the user triggers a del reaction in the UI
 *
 * @param {String} msgId
 * @param {String} slug
 * @param {Object} meta
 */
MessagesBuff.prototype.userDelReaction = function(msgId, slug, meta) {
    "use strict";
    return this._userReaction(Reactions.OPERATIONS.REMOVE, msgId, slug, meta);
};

/**
 * Sends the add reaction opcode to chatd
 *
 * @param {String} msgId
 * @param {String} slug
 * @param {String} meta
 * @param {String} r
 */
MessagesBuff.prototype.sendAddReaction = function(msgId, slug, meta, r) {
    "use strict";
    var self = this;
    self.chatRoom.megaChat.plugins.chatdIntegration.chatd.addReaction(
        self.chatRoom.chatIdBin,
        base64urldecode(msgId),
        base64urldecode(u_handle),
        r
    );
};

/**
 * Sends the del reaction opcode to chatd
 *
 * @param {String} msgId
 * @param {String} slug
 * @param {String} meta
 * @param {String} r
 */
MessagesBuff.prototype.sendDelReaction = function(msgId, slug, meta, r) {
    "use strict";
    var self = this;
    self.chatRoom.megaChat.plugins.chatdIntegration.chatd.delReaction(
        self.chatRoom.chatIdBin,
        base64urldecode(msgId),
        base64urldecode(u_handle),
        r
    );
};

/**
 * The main handling code for all chatd reaction opcodes
 *
 * @param {String} eventName
 * @param {Object} eventData
 * @param {Function} cb
 * @param {Boolean} isRetry
 * @param {Message} msgFromDb
 * @private
 */
MessagesBuff.prototype._onReactionEvent = function(eventName, eventData, cb, isRetry, msgFromDb) {
    "use strict";
    var msgId = eventData.msgId;
    var msg = msgFromDb || this.getMessageById(msgId);
    var self = this;

    if (!msg) {
        if (!isRetry && self.isRetrievingHistory) {
            self.chatRoom.one('onHistoryDecrypted.' + eventName + eventData.msgId, function() {
                self._onReactionEvent(eventName, eventData, cb,true);
            });
        }
        else {
            megaChat.getMessageByMessageId(self.chatRoom.chatId, eventData.msgId)
                .then(function(r) {
                    self._onReactionEvent(eventName, eventData, cb, true, r);
                })
                .catch(nop);
        }
        return;
    }

    this.decryptReaction(msgId, eventData.emoji, undefined, undefined, msg)
        .then(function(r) {
            msg[cb](eventData.userId, r);

            if (eventData.userId === u_handle) {
                Reactions.deQueueOperation(self.chatRoom, msg, msg.messageId, cb, r);
            }
        })
        .catch(dump.bind(null, 'onReactionEvent'));
};

/**
 *
 * @param {Object} eventData the event data of the ADDREACTION opcode
 * @param {Boolean} isRetry
 * @returns {undefined}
 */
MessagesBuff.prototype.onAddReaction = function(eventData, isRetry) {
    "use strict";
    return this._onReactionEvent('onAddReaction', eventData, 'addReaction', isRetry);
};

/**
 * Called on DELRECTION on chatd
 * @param {Object} eventData the event data of the DELREACTION opcode
 * @param {Boolean} isRetry
 * @returns {undefined}
 */
MessagesBuff.prototype.onDelReaction = function(eventData, isRetry) {
    "use strict";
    return this._onReactionEvent('onDelReaction', eventData, 'delReaction', isRetry);
};

/**
 * Called on chatd REACTIONSN
 *
 * @param {Object} eventData the event data of the REACTIONSN opcode
 */
MessagesBuff.prototype.onReactionSn = function(eventData) {
    "use strict";
    Reactions.setSn(eventData.chatId, eventData.sn)
        .always(function() {
            Reactions.flushQueuedReactionsForChat(eventData.chatId);
        });
};

/**
 * Called on chatd REJECT for a specific reaction
 *
 * @param {Object} eventData the event data of the REJECT opcode
 */
MessagesBuff.prototype.onReactionReject = function(eventData) {
    "use strict";
    Reactions.clearQueuedReactionsForChat(eventData.chatId, eventData.msgId);
};
