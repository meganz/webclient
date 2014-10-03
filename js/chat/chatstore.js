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
    self.db = new MegaDB("megaChat", u_handle, 1, ChatStore.DBSchema);

    megaChat.unbind("onInit.chatStore");
    megaChat.bind("onInit.chatStore", function(e) {
        self.attachToChat(megaChat)
    });
    return this;
};

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
    }
};


ChatStore.prototype.attachToChat = function(megaChat) {
    var self = this;

    megaChat.unbind("onRoomCreated.chatStore");
    megaChat.bind("onRoomCreated.chatStore", function(e, megaRoom) {
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
                            /* state */ v.state
                        );

                        megaRoom._messagesQueue.push(outgoingMessage);

                        megaChat.trigger("onQueueMessage", [outgoingMessage, megaRoom]);

                        megaRoom.appendMessage(outgoingMessage);
                    });
                }
            });
    });


    megaChat.unbind("onRoomDestroy.chatStore");
    megaChat.bind("onRoomDestroy.chatStore", function(e, megaRoom) {
        self.db.removeBy('conversations', 'roomJid', megaRoom.roomJid);
        self.db.removeBy('outgoingQueue', 'toJid', megaRoom.roomJid);
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
                        megaChat.chats[v.roomJid] = new ChatRoom(megaChat, v.roomJid);
                        megaChat.chats[v.roomJid]._conv_ended = v.ended;
                        megaChat.chats[v.roomJid].setType(v.type);
                        megaChat.chats[v.roomJid].ctime = v.ctime;
                        megaChat.chats[v.roomJid].setUsers(v.users);

                        megaChat.chats[v.roomJid].setState(ChatRoom.STATE.JOINING);
                        megaChat.karere.joinChat(v.roomJid);


                        megaChat.chats[v.roomJid].refreshUI();
                    }
                })
            }
        });

    // persist queued messages
    megaChat.unbind("onQueueMessage.chatStore");
    megaChat.bind("onQueueMessage.chatStore", function(e, outgoingMessage, megaRoom) {
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
        $(outgoingMessage).unbind("onChange.chatStore");
        $(outgoingMessage).bind("onChange.chatStore", function(e, obj, k, oldVal, newVal) {
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

    megaChat.unbind("onMessageQueueFlushed.chatStore");
    megaChat.bind("onMessageQueueFlushed.chatStore", function(e, megaRoom) {
        // remove from db when flushed
        self.db.removeBy('outgoingQueue', 'toJid', megaRoom.roomJid);
    });
};