/**
 * Simple class which should persist/restore all chat related stuff
 * It should connect to the MegaChat class, ONLY using direct method calls or events (NO monkey patching or any other
 * hacks please).
 *
 * @param megaChat
 * @returns {ChatStore}
 * @constructor
 */
var ChatStore = function(megaChat) {
    var self = this;
    self.logger = MegaLogger.getLogger("chatStore", {}, megaChat.logger);

    self.db = new MegaDB("megaChat", u_handle, 4, ChatStore.DBSchema, {
        'parentLogger': self.logger
    });

    megaChat.unbind("onInit.chatStore");
    megaChat.bind("onInit.chatStore", function(e) {
        self.attachToChat(megaChat)
    });
    return this;
};

/**
 * Basic schema required to store offline messages
 */
ChatStore.DBSchema = {
    conversations: {
        key: { keyPath: 'id' , autoIncrement: true },
        indexes: {
            roomJid: { unique: true }
        }
    },
    outgoingQueue: {
        key: { keyPath: 'id' , autoIncrement: true },
        indexes: {
            toJid: { },
            messageId: { }
        }
    },
    chatMessages: {
        key: { keyPath: 'id' , autoIncrement: true },
        indexes: {
            roomJid: { },
            messageId: { }
        }
    }
};

/**
 * Entry point, for attaching the chat store to a specific `Chat` instance
 *
 * @param megaChat
 */
ChatStore.prototype.attachToChat = function(megaChat) {
    var self = this;

    megaChat.unbind("onRoomCreated.chatStore");
    megaChat.bind("onRoomCreated.chatStore", function(e, megaRoom) {
        assert(megaRoom.type, 'missing room type');

        self.db.query('conversations')
            .filter('roomJid', megaRoom.roomJid)
            .execute()
            .done(function(results) {
                if(results.length == 0) { // new room, add it to the already opened rooms.
                    self.db.add('conversations', {
                        'roomJid': megaRoom.roomJid,
                        'type': megaRoom.type,
                        'users': megaRoom.users,
                        'state': megaRoom.state,
                        'ended': megaRoom._conv_ended,
                        'ctime': megaRoom.ctime
                    });
                }
            });

        megaRoom.unbind("onStateChange.chatStore");
        megaRoom.bind("onStateChange.chatStore", function(e, oldState, newState) {
            self.db.query('conversations')
                .filter('roomJid', megaRoom.roomJid)
                .modify({
                    'state': newState,
                    'ended': megaRoom._conv_ended
                })
                .execute();
        });

        // restore & render any queued messages from the db
        self.db.query('outgoingQueue')
            .filter('toJid', megaRoom.roomJid)
            .execute()
            .done(function(r) {
                if(r.length && r.length > 0) { // found
                    r.forEach(function(v) {
                        var outgoingMessage = new KarereEventObjects.OutgoingMessage(
                            /* toJid */ v.toJid,
                            /* fromJid */ v.fromJid,
                            /* type */ v.type,
                            /* messageId */ v.messageId,
                            /* contents */ v.contents,
                            /* meta */ v.meta,
                            /* delay */ v.delay,
                            /* state */ v.state,
                            /* roomJid */ v.roomJid,
                            /* seen? */ v.seen
                        );

                        megaRoom._messagesQueue.push(outgoingMessage);

                        megaChat.trigger("onQueueMessage", [outgoingMessage, megaRoom]);

                        megaRoom.appendMessage(outgoingMessage);
                    });
                }
            });

        // restore & render any incoming/outgoing messages from the db
        self.db.query('chatMessages')
            .filter('roomJid', megaRoom.roomJid)
            .execute()
            .done(function(r) {
                if(r.length && r.length > 0) { // found
                    r.forEach(function(v) {
                        var chatMessageObject;
                        if(Karere.getNormalizedBareJid(v.fromJid) == megaRoom.megaChat.karere.getBareJid()){
                            chatMessageObject = new KarereEventObjects.OutgoingMessage(
                                /* toJid */ v.toJid,
                                /* fromJid */ v.fromJid,
                                /* type */ v.type,
                                /* messageId */ v.messageId,
                                /* contents */ v.contents,
                                /* meta */ v.meta,
                                /* delay */ v.delay,
                                /* state */ v.state,
                                /* roomJid */ v.roomJid,
                                /* seen? */ v.seen
                            );
                        } else {
                            chatMessageObject = new KarereEventObjects.IncomingMessage(
                                /* toJid */ v.toJid,
                                /* fromJid */ v.fromJid,
                                /* type */ v.type,
                                /* rawType */ "groupchat",
                                /* messageId */ v.messageId,
                                /* rawMessage */ undefined,
                                /* roomJid */ v.roomJid,
                                /* meta */ v.meta,
                                /* contents */ v.contents,
                                /* elements */ undefined,
                                /* delay */ v.delay,
                                /* seen? */ v.seen
                            );
                        }
                        megaRoom.appendMessage(chatMessageObject);
                    });
                }
            });
    });


    megaChat.unbind("onRoomDestroy.chatStore");
    megaChat.bind("onRoomDestroy.chatStore", function(e, megaRoom) {
        self.db.removeBy('conversations', 'roomJid', megaRoom.roomJid);
        self.db.removeBy('outgoingQueue', 'toJid', megaRoom.roomJid);
        self.db.removeBy('chatMessages', 'roomJid', megaRoom.roomJid);
    });

    // restore any conversations from the db
    self.db.query('conversations')
        .execute()
        .done(function(results) {
            if(results.length == 0) { // no conversations
                return;
            } else {
                $.each(results, function(k, v) {
                    if(!megaChat.chats[v.roomJid]) { // restore room from db
                        megaChat.chats[v.roomJid] = new ChatRoom(megaChat, v.roomJid, v.type, v.users, v.ctime);
                        megaChat.chats[v.roomJid]._conv_ended = v.ended;

                        megaChat.chats[v.roomJid].setState(ChatRoom.STATE.JOINING);
                        megaChat.karere.joinChat(v.roomJid);


                        megaChat.chats[v.roomJid].refreshUI();
                    }
                })
            }
        });

    // persist queued messages
    megaChat.unbind("onQueueMessage.chatStoreQueue");
    megaChat.bind("onQueueMessage.chatStoreQueue", function(e, outgoingMessage, megaRoom) {
        // add to db
        self.db.query('outgoingQueue')
            .filter('messageId', outgoingMessage.messageId)
            .filter('toJid', outgoingMessage.toJid)
            .execute()
            .done(function(r) {
                if(r.length === 0) { // not found
                    self.db.add('outgoingQueue', outgoingMessage);
                } else {
                    // already queued
                }
            });
        // sync store with messageQueue
        $(outgoingMessage).unbind("onChange.chatStoreQueue");
        $(outgoingMessage).bind("onChange.chatStoreQueue", function(e, obj, k, oldVal, newVal) {
            if(k == "meta" && newVal['isDeleted'] === true) {
                self.db.removeBy('outgoingQueue', {
                    'messageId': obj.messageId,
                    'toJid': obj.toJid
                });
            } else {
                var modOp = {};
                modOp[k] = newVal;

                self.db.query('outgoingQueue')
                    .filter('messageId', obj.messageId)
                    .filter('toJid', obj.toJid)
                    .modify(modOp)
                    .execute();
            }
        });

    });

    megaChat.unbind("onMessageQueueFlushed.chatStoreQueue");
    megaChat.bind("onMessageQueueFlushed.chatStoreQueue", function(e, megaRoom) {
        // remove from db when flushed
        self.db.removeBy('outgoingQueue', 'toJid', megaRoom.roomJid);
    });

    // persist incoming/outgoing messages
    megaChat.unbind("onBeforeRenderMessage.chatStore");
    megaChat.bind("onBeforeRenderMessage.chatStore", function(e, meta) {
        // add to db
        self.db.query('chatMessages')
            .filter('messageId', meta.message.messageId)
            .filter('roomJid', meta.room.roomJid)
            .execute()
            .done(function(r) {
                if(r.length === 0) { // not found
                    var msg = meta.message;

                    if(meta.room.encryptionHandler && meta.room.encryptionHandler.askeMember.sessionId) {
                        msg.sessionId = meta.room.encryptionHandler.askeMember.sessionId;
                    }

                    assert(msg.roomJid, 'missing .roomJid');
                    self.db.add('chatMessages', msg);
                } else {
                    // already queued
                }
            });

        // sync store with messageQueue
        $(meta.message).unbind("onChange.chatStore");
        $(meta.message).bind("onChange.chatStore", function(e, obj, k, oldVal, newVal) {
            if(k == "meta" && newVal['isDeleted'] === true) {
                self.db.removeBy('chatMessages', {
                    'messageId': obj.messageId,
                    'roomJid': meta.room.roomJid
                });
            } else {
                var modOp = {};
                modOp[k] = newVal;

                self.logger.debug("onChange: ", obj, k, oldVal, newVal);

                self.db.query('chatMessages')
                    .filter('messageId', obj.messageId)
                    .filter('roomJid', meta.room.roomJid)
                    .modify(modOp)
                    .execute();
            }
        });
    });
};