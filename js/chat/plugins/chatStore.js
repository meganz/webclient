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

    self.megaChat = megaChat;
    self.db = new MegaDB("megaChat", u_handle, 5, ChatStore.DBSchema, {
        'parentLogger': self.logger
    });

    megaChat.unbind("onInit.chatStore");
    megaChat.bind("onInit.chatStore", function(e) {
        self.attachToChat(megaChat);

        if(self.cleanupInterval) {
            clearInterval(self.cleanupInterval);
        }
        self.cleanupInterval = setInterval(function() {
            self.cleanup();
        }, 30000); /* every 30sec? */

        setTimeout(function() {
            self.cleanup();
        }, 10); // run in different thread.

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
            messageId: { },
            sessionId: { }
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
                        'ctime': megaRoom.ctime,
                        'lastActivity': megaRoom.lastActivity
                    });
                }
            })
            .fail(function(r) {
                self.logger.error("Could not persist: ", megaRoom);
            });

        megaRoom.unbind("onStateChange.chatStore");
        megaRoom.bind("onStateChange.chatStore", function(e, oldState, newState) {
            self.db.query('conversations')
                .filter('roomJid', megaRoom.roomJid)
                .modify({
                    'state': newState,
                    'lastActivity': megaRoom.lastActivity,
                    'ended': megaRoom._conv_ended
                })
                .execute()
                .done(function() {
                    if(megaRoom._conv_ended === true) {
                        megaRoom.megaChat.trigger("onRoomDestroy.chatStore", megaRoom);
                    }
                });
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
    });

    self.restoreConversationsFromDb();

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

                    if(meta.room.encryptionHandler) {
                        if (meta.room.encryptionHandler.askeMember.sessionId) {
                            msg.sessionId = meta.room.encryptionHandler.askeMember.sessionId;
                        } else if(meta.sessionId) {
                            msg.sessionId = meta.sessionId;
                        } else {
                            msg.sessionId = null;

                            createTimeoutPromise(function () {
                                return meta.room.encryptionHandler && !!meta.room.encryptionHandler.askeMember.sessionId;
                            }, 1500, 60000)
                                .done(function () {

                                    self.db.query('chatMessages')
                                        .filter('messageId', msg.messageId)
                                        .modify({'sessionId': meta.room.encryptionHandler.askeMember.sessionId})
                                        .execute()
                                        .done(function(r) {
                                            self.logger.debug("Set session id for: ", msg.messageId, r);
                                        });
                                })
                                .fail(function() {
                                    self.logger.error("Could not set session id for message: ", {
                                        'messageId': msg.messageId,
                                        'roomJid': meta.room.roomJid
                                    });
                                });
                        }
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

                self.db.query('chatMessages')
                    .filter('messageId', obj.messageId)
                    .filter('roomJid', meta.room.roomJid)
                    .modify(modOp)
                    .execute();
            }
        });
    });
};

ChatStore.prototype.restoreConversationsFromDb = function() {
    var self = this;

    var _restore = function() {
        // restore any conversations from the db
        self.db.query('conversations')
            .execute()
            .done(function(results) {
                if(results.length == 0) { // no conversations
                    return;
                } else {
                    $.each(results, function(k, v) {
                        var foundRoom = megaChat.chats[v.roomJid];

                        if(!foundRoom) { // restore room from db, if room not found
                            if(v.ended) {
                                megaChat.trigger("onRoomDestroy.chatStore", v);
                            }
                            if(Object.keys(v.users).length == 0) {
                                megaChat.trigger("onRoomDestroy.chatStore", v);
                                self.logger.error("Could not restore room: ", v, ", because of missing v.users = {}.");
                                return;
                            }
                            var room = megaChat.chats[v.roomJid] = new ChatRoom(megaChat, v.roomJid, v.type, v.users, v.ctime, v.lastActivity);

                            room._conv_ended = v.ended;

                            room.setState(ChatRoom.STATE.JOINING);
                            if(megaChat.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
                                megaChat.karere.joinChat(v.roomJid);
                            } else {
                                megaChat.karere.one("onConnected.chatStore", function() {
                                    megaChat.karere.joinChat(v.roomJid);
                                });
                            }


                            room.refreshUI();

                            var participants = room.getParticipantsExceptMe();
                            var c = megaChat.getContactFromJid(participants[0]);
                            if(c) {
                                M.u[c.h].lastChatActivity = room.lastActivity;
                            }
                        }
                    })
                }
            });
    };

    if(!boot_done_called) {
        $(window).bind('MegaLoaded', _restore);
    } else {
        _restore();
    }
};
ChatStore.prototype.cleanup = function() {
    var self = this;

    if(MegaChatDisabled || !self.megaChat.is_initialized) {
        return;
    }

    var maxMessagesCount = self.megaChat.options.chatStoreOptions.autoPurgeMaxMessagesPerRoom;

    var msgCount = {};
    self.logger.debug("Starting cleanup...");

    self.db.query('chatMessages')
        .execute()
        .done(function(r) {
            r.forEach(function(v, k) {
                if(!msgCount[v.roomJid]) {
                    msgCount[v.roomJid] = 0;
                }
                msgCount[v.roomJid]++;
            });

            Object.keys(msgCount).forEach(function(k) {
                if(msgCount[k] > maxMessagesCount) {
                    self.logger.debug("Cleaning up chat history for room: ", k);
                    self._cleanupMessagesForRoom(k);
                }
            })
        });
};


ChatStore.prototype._cleanupMessagesForRoom = function(roomJid) {
    var self = this;
    var maxMessagesCount = self.megaChat.options.chatStoreOptions.autoPurgeMaxMessagesPerRoom;

    var _callAgainIfRequiresMoreCleaning = function() {
        self.db.query('chatMessages')
            .filter('roomJid', roomJid)
            .execute()
            .done(function (r) {
                if (r.length > maxMessagesCount) {
                    self._cleanupMessagesForRoom(roomJid);
                }
            });
    };

    self.db.query('chatMessages')
        .filter('roomJid', roomJid)
        .execute()
        .done(function(r) {
            if(r.length > 0) {
                if(r[0].sessionId) {
                    self.db.removeBy('chatMessages', 'sessionId', r[0].sessionId)
                        .done(function (rr) {
                            if(!rr || rr.length == 0) {
                                // for some reason (diff db version), sessionId index not found
                                self.db.removeBy('chatMessages', 'messageId', r[0].messageId)
                                    .done(function() {
                                        _callAgainIfRequiresMoreCleaning();
                                    })
                            } else {
                                _callAgainIfRequiresMoreCleaning();
                            }
                        });
                } else {
                    // no session id, remove single item

                    self.db.removeBy('chatMessages', 'messageId', r[0].messageId)
                        .done(function () {
                            _callAgainIfRequiresMoreCleaning();
                        });
                }
            }
        });
};