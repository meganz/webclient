/**
 * Integrates chatd.js into chat.js as a standalone plugin
 *
 *
 * @param megaChat
 * @returns {ChatdIntegration}
 * @constructor
 */
var ChatdIntegration = function(megaChat) {
    //return false;
    var self = this;
    self.logger = MegaLogger.getLogger("chatdInt", {}, megaChat.logger);

    self.megaChat = megaChat;
    self.chatd = new Chatd(u_handle);
    self.waitingChatIdPromises = {};
    self.chatIdToRoomJid = {};

    megaChat.rebind("onInit.chatdInt", function(e) {
        megaChat.rebind("onRoomCreated.chatdInt", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
            self._attachToChatRoom(chatRoom);
        });
        megaChat.rebind("onRoomDestroy.chatdInt", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');

            self._detachFromChatRoom(chatRoom);
        });

        //TODO: trigger mcf and open all chats returned by the server
        self.apiReq({a: "mcf"})
            .done(function(r) {
                // reopen chats from the MCF response.
                r.forEach(function(actionPacket) {
                    self.openChatFromApi(actionPacket);
                })
            })
    });


    $(window).rebind('onChatCreatedActionPacket.chatdInt', function(e, actionPacket) {
        self.openChatFromApi(actionPacket);
    });



    // handle data from chatd
    self.chatd.rebind('onMessageStore.chatdInt', function(e, eventData) {
        var chatRoomJid = self.chatIdToRoomJid[eventData.chatId];
        assert(chatRoomJid, 'chat room not found for chat id: ' + eventData.chatId);
        var chatRoom = self.megaChat.chats[chatRoomJid];

        var messageObject;
        if(!eventData.userId || eventData.userId === u_handle) {
            messageObject = new KarereEventObjects.OutgoingMessage(
                /* toJid,  */ chatRoom.roomJid,
                /* fromJid,  */ self.megaChat.getJidFromNodeId(eventData.userId),
                /* type,  */ "groupchat",
                /* messageId,  */ eventData.messageId,
                /* contents, */ eventData.message,
                /* meta,  */ {},
                /* delay,  */ eventData.ts,
                /* state,  */ KarereEventObjects.OutgoingMessage.STATE.DELIVERED,
                /* roomJid, */ chatRoom.roomJid,
                /* seen */ true
            );
        } else {
            /**
             * toJid, fromJid, type, rawType, messageId, rawMessage, roomJid, meta, contents, elements, delay, seen
             * @type {KarereEventObjects.IncomingMessage}
             */
            messageObject = new KarereEventObjects.IncomingMessage(
                /* toJid,  */ chatRoom.roomJid,
                /* fromJid,  */ self.megaChat.getJidFromNodeId(eventData.userId),
                /* type,  */ "groupchat",
                /* rawType, */ "groupchat",
                /* messageId,  */ eventData.messageId,
                /* rawMessage, */ undefined,
                /* roomJid, */ chatRoom.roomJid,
                /* meta,  */ {},
                /* contents, */ eventData.message,
                /* elements, */ undefined,
                /* delay,  */ eventData.ts,
                /* state,  */ KarereEventObjects.OutgoingMessage.STATE.DELIVERED,

                /* seen */ true
            );

            self.markMessageAsReceived(chatRoom, eventData.messageId);
        }

        if(messageObject) {
            chatRoom.appendMessage(messageObject);
        }
    });

    self.chatd.rebind('onMessageUpdated.chatdInt', function(e, eventData) {
        var chatRoomJid = self.chatIdToRoomJid[eventData.chatId];
        assert(chatRoomJid, 'chat room not found for chat id: ' + eventData.chatId);
        var chatRoom = self.megaChat.chats[chatRoomJid];

        if(eventData.state === "CONFIRMED") {
            chatRoom.messages.forEach(function(v, k) {
                if(v.internalId === eventData.id) {
                    v.messageId = eventData.messageId;
                    return false; // break
                }
            })
        }
    });

    return self;
};

ChatdIntegration.prototype.openChatFromApi = function(actionPacket) {
    var self = this;

    console.error("Will open chat for action packet: ", actionPacket);

    var chatParticipants = actionPacket.u;
    if(!chatParticipants) {
        console.error("@TODO: Waiting this to be implemented on the API side (e.g. mcf's actionPacket[.u]");

        chatParticipants = [
            'cX67BuuBF8c',
            'p0hh0WDWsbo'
        ];
    }
    var chatJids = [];
    Object.keys(chatParticipants).forEach(function(k) {
        var v = chatParticipants[k];
        chatJids.push(
            megaChat.getJidFromNodeId(v)
        );
    });

    var roomJid = self.megaChat.generatePrivateRoomName(chatJids) + "@conference." + megaChat.options.xmppDomain;

    var chatRoom = self.megaChat.chats[roomJid];
    if(!chatRoom) {
        self.megaChat.openChat(chatJids, "private", actionPacket.id, actionPacket.cs, actionPacket.url, false);

    } else {
        if(!chatRoom.chatId) {
            chatRoom.chatId = actionPacket.id;
            chatRoom.chatShard = actionPacket.cs;
            chatRoom.chatdUrl = actionPacket.url;
        }
    }
};

ChatdIntegration.prototype.apiReq = function(data) {
    console.error("Api req: ", data);

    var $promise = new MegaPromise();
    api_req(data, {
        callback: function(r) {
            if (typeof(r) === 'number') {
                $promise.reject.apply($promise, arguments);
            } else {
                $promise.resolve.apply($promise, arguments);
            }
        }
    });

    //TODO: fail case?! e.g. the exp. backoff failed after waiting for X minutes??

    return $promise;
};

ChatdIntegration._waitUntilChatIdIsAvailable = function(fn) {
    return function() {
        var self = this;
        var chatRoom = arguments[0];
        var masterPromise = new MegaPromise();
        var args = arguments;

        self._retrieveChatdIdIfRequired(chatRoom)
            .done(function() {
                if(chatRoom.chatId) {
                    masterPromise.resolve(
                        fn.apply(self, args)
                    );
                } else {
                    createTimeoutPromise(
                        function() {
                            return !!chatRoom.chatId
                        },
                        100,
                        30000 /* API can be down... */
                    )
                        .done(function() {
                            masterPromise.resolve(
                                fn.apply(self, args)
                            );
                        })
                        .fail(function() {
                            self.logger.error("Failed to retrieve chatId for chatRoom: ", chatRoom.roomJid);
                            masterPromise.reject(arguments);
                        });
                }
            })
            .fail(function() {
                self.logger.error("[2] Failed to retrieve chatId for chatRoom: ", chatRoom.roomJid);
                masterPromise.reject(arguments);
            });

        return masterPromise;
    };
};

ChatdIntegration.prototype._retrieveChatdIdIfRequired = function(chatRoom) {
    var self = this;

    if(!chatRoom.chatId) {
        // already sent an API request?
        if (
            self.waitingChatIdPromises[chatRoom.roomJid] &&
            self.waitingChatIdPromises[chatRoom.roomJid].status() === 'pending'
        ) {
            return self.waitingChatIdPromises[chatRoom.roomJid];
        }

        var userHashes = [];
        chatRoom.getParticipantsExceptMe().forEach(function(v) {
            var contact = self.megaChat.getContactFromJid(v);
            assert(contact && contact.u, 'contact with jid ' + v + ' not found.');

            userHashes.push(
                {
                    'u': contact.u,
                    'p': 1
                }
            );
        });

        // because, why not ?
        userHashes.sort(function(a,b) {
            if (a.u < b.u) {
                return -1;
            }
            else if (a.u > b.u) {
                return 1;
            } else {
                return 0;
            }
        });

        self.waitingChatIdPromises[chatRoom.roomJid] = self.apiReq({
                'a': 'mcc',
                'u': userHashes
            })
            .always(function() {
                delete self.waitingChatIdPromises[chatRoom.roomJid];
            })
            .done(function(r) {
                chatRoom.chatdUrl = r.url;
                chatRoom.chatId = r.id;
                chatRoom.chatShard = r.cs;

                self.join(chatRoom);
            })
            .fail(function() {
                self.logger.error("Failed to retrieve chatd ID from API for room: ", chatRoom.roomJid);
            });
        return self.waitingChatIdPromises[chatRoom.roomJid];
    } else {
        return MegaPromise.resolve();
    }
};

ChatdIntegration.prototype._attachToChatRoom = function(chatRoom) {
    var self = this;
    self._retrieveChatdIdIfRequired(chatRoom)
        .done(function() {
            self.join(chatRoom);
        });

};

/** chatd related commands **/

ChatdIntegration.prototype.join = function(chatRoom) {
    var self = this;

    assert(
        chatRoom.chatId && chatRoom.chatShard !== undefined && chatRoom.chatdUrl,
        'missing chatId, chatShard or chadUrl in megaRoom. halting chatd join and code execution.'
    );

    //console.error("JOINNNN: ", chatRoom.roomJid, chatRoom.chatId, chatRoom.chatShard, chatRoom.chatdUrl);
    self.chatd.join(base64urldecode(chatRoom.chatId), chatRoom.chatShard, chatRoom.chatdUrl);
    self.chatIdToRoomJid[chatRoom.chatId] = chatRoom.roomJid;
};

ChatdIntegration.prototype.retrieveHistory = function(chatRoom, numOfMessages) {
    var self = this;
    self.chatd.hist(base64urldecode(chatRoom.chatId), numOfMessages);
};

ChatdIntegration.prototype.markMessageAsSeen = function(chatRoom, msgid) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.SEEN, base64urldecode(chatRoom.chatId) + CHAT_UNDEFINED + base64urldecode(msgid));
};

ChatdIntegration.prototype.markMessageAsReceived = function(chatRoom, msgid) {
    var self = this;
    console.error("markMessageAsReceived", chatRoom, msgid);
    self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId) + base64urldecode(msgid));
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RETENTION, base64urldecode(chatRoom.chatId) + CHAT_UNDEFINED + pack32le(time));
};


ChatdIntegration.prototype.sendMessage = function(chatRoom, message) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;
    return self.chatd.submit(base64urldecode(chatRoom.chatId), message);
};

ChatdIntegration.prototype.updateMessage = function(chatRoom, num, newMessage) {
    // a msgupd is only possible up to ten minutes after the indicated (client-supplied) UTC timestamp.
    var self = this;
    self.chatd.modify(base64urldecode(chatRoom.chatId), num, newMessage);
};

//TODO: msg updated callback



// decorate ALL functions which require a valid chat ID
[
    'join',
    'retrieveHistory',
    'markMessageAsSeen',
    'markMessageAsReceived',
    'setRetention',
    'sendMessage',
    'updateMessage'
].forEach(function(fnName) {
        ChatdIntegration.prototype[fnName] = ChatdIntegration._waitUntilChatIdIsAvailable(
            ChatdIntegration.prototype[fnName]
        );
    });

makeObservable(ChatdIntegration);
