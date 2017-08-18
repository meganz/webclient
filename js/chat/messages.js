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
            'revoked': false,
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
Message.MANAGEMENT_MESSAGE_TYPES = {
    "MANAGEMENT": "\0",
    "ATTACHMENT": "\x10",
    "REVOKE_ATTACHMENT": "\x11",
    "CONTACT": "\x12",
};


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
    else if (this.textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
        return __(l[8892]);
    }
};

Message.prototype.isEditable = function() {
    return this.userId === u_handle && (unixtime() - this.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT;
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

    self.messages = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc, this);
    self.messagesBatchFromHistory = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);

    // because on connect, chatd.js would request hist retrieval automatically, lets simply set a "lock"
    self.isDecrypting = new MegaPromise();

    var origPush = self.messages.push;
    self.messages.push = function(msg) {
        if (msg.addChangeListener) {
            msg.addChangeListener(function() {
                self.messages.reorder();
            });
        }
        var res = origPush.call(this, msg);
        if (
            !(
                msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false
            )
        ) {
            chatRoom.trigger('onMessagesBuffAppend', msg);
        }
        return res;
    };

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
                self.messages.length === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL ||
                self.messagesBatchFromHistory.length === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL
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
                totalUnreads += msg.getState() === Message.STATE.NOT_SEEN ? 1 : 0;
            });
            if (totalUnreads === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
                self.retrieveChatHistory(false);
            }
        }
    });

    self.chatd.rebind('onMessageLastSeen.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (!chatRoom) {
            self.logger.warn("Message not found for: ", e, eventData);
            return;
        }

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.lastSeen = eventData.messageId;
            self.trackDataChange();
        }
    });
    self.chatd.rebind('onMembersUpdated.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (!chatRoom) {
            self.logger.warn("Message not found for: ", e, eventData);
            return;
        }

        if (chatRoom.roomId === self.chatRoom.roomId) {
            if (eventData.userId === u_handle) {
                self.joined = true;
                if (chatRoom.state === ChatRoom.STATE.JOINING) {
                    chatRoom.setState(ChatRoom.STATE.READY);
                }
            }
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
                self.retrievedAllMessages = false;
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

                    if (foundMessage.textContents) {
                        msgObject.textContents = foundMessage.textContents;
                    }

                    msgObject.pendingMessageId = foundMessage.messageId;
                }

                self.messagesBatchFromHistory.push(msgObject);

                // if not from history
                // mark as received if not sent by me
                if (eventData.userId !== u_handle) {
                    self.setLastReceived(eventData.messageId);
                }
                $(self).trigger('onNewMessageReceived', msgObject);
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
            var timestamp = chatRoom.messagesBuff.messages[eventData.messageId].delay ?
                chatRoom.messagesBuff.messages[eventData.messageId].delay : unixtime();

            var editedMessage = new Message(
                chatRoom,
                self,
                {
                    'messageId': eventData.messageId,
                    'userId': eventData.userId,
                    'keyid': eventData.keyid,
                    'message': eventData.message,
                    'updated': eventData.updated,
                    'delay' : timestamp,
                    'orderValue': eventData.id,
                    'sent': true
                }
            );
            var originalMessage = chatRoom.messagesBuff.messages[eventData.messageId];

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
                                self.logger.error("message order tampering detected: ", eventData.messageId);
                            }
                        }
                    }
                    else if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                        editedMessage.dialogType = 'truncated';
                        editedMessage.userId = decrypted.sender;
                        editedMessage.delay = unixtime();
                        chatRoom.lastActivity = editedMessage.delay;
                        chatRoom.didInteraction(editedMessage.userId, chatRoom.lastActivity);
                    }

                    chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                        chatRoom,
                        editedMessage
                    );

                    chatRoom.messagesBuff.messages.replace(editedMessage.messageId, editedMessage);

                    if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                        var messageKeys = chatRoom.messagesBuff.messages.keys();

                        for (var i = 0; i < messageKeys.length; i++) {
                            var v = chatRoom.messagesBuff.messages[messageKeys[i]];

                            if (v.orderValue < eventData.id) {
                                // remove the messages with orderValue < eventData.id from message buffer.
                                chatRoom.messagesBuff.messages.removeByKey(v.messageId);
                            }
                        }
                    }
                }
                else {
                    chatRoom.messagesBuff.messages.removeByKey(eventData.messageId);
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
        chatRoom.protocolHandler.setKeyID(eventData.keyxid, eventData.keyid);

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.trackDataChange();
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
            chatRoom.protocolHandler.restoreKeys(keyxid, keys);
        };
        ChatdIntegration._ensureKeysAreLoaded(keys).always(seedKeys);

        if (chatRoom.roomId === self.chatRoom.roomId) {
            self.trackDataChange();
        }
    });

    self.addChangeListener(function() {
        var newCounter = 0;
        self.messages.forEach(function(v, k) {
            if (v.getState && v.getState() === Message.STATE.NOT_SEEN) {
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
MessagesBuff.prototype.getUnreadCount = function() {
    return this._unreadCountCache;
};

MessagesBuff.prototype.setLastSeen = function(msgId) {
    var self = this;
    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 999999999);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastSeen, self.messages[self.lastSeen], 0);

    if (!self.lastSeen || lastMsg.orderValue < targetMsg.orderValue) {
        self.lastSeen = msgId;

        if (!self.isRetrievingHistory && !self.chatRoom.stateIsLeftOrLeaving()) {
            self.chatdInt.markMessageAsSeen(self.chatRoom, msgId);
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
    else {
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
        }, 100, 10000)
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


        return self.$msgsHistoryLoading;
    }
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
    $.each(self.messages, function(k, v) {
        if (v.messageId === messageId) {
            found = v;
            // break;
            return false;
        }
    });

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
    })
};

MessagesBuff.prototype.getLatestTextMessage = function() {
    if (this.messages.length > 0) {
        var msgs = this.messages;
        for (var i = msgs.length - 1; i >= 0; i--) {
            if (msgs.getItem(i) && msgs.getItem(i).textContents && msgs.getItem(i).textContents.length > 0) {
                var msg = msgs.getItem(i);
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
