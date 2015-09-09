/**
 * Integrates chatd.js into chat.js as a standalone plugin
 *
 *
 * @param megaChat
 * @returns {ChatdIntegration}
 * @constructor
 */
var ChatdIntegration = function(megaChat) {
    var self = this;
    self.logger = MegaLogger.getLogger("chatdInt", {}, megaChat.logger);

    self.megaChat = megaChat;
    self.chatd = new Chatd();
    self.waitingChatIdPromises = {};

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
    });

    //TODO: use jquery events to retrieve action packets and do stuff


    return self;
};

ChatdIntegration.prototype.apiReq = function(data) {
    console.error("Api req: ", data);

    var $promise = new MegaPromise();
    api_req(data, {
        callback: function(r) {
            if (typeof(r) === 'number') {
                $promise.reject(arguments);
            } else {
                $promise.resolve(arguments);
            }
        }
    });

    //TODO: fail case?!

    return $promise;
};

ChatdIntegration._waitUntilChatIdIsAvailable = function(fn) {
    return function() {
        var self = this;
        var chatRoom = arguments[0];
        var masterPromise = new MegaPromise();

        self._retrieveChatdIdIfRequired(chatRoom)
            .done(function() {
                if(chatRoom.chatId) {
                    masterPromise.resolve(
                        fn.apply(this, arguments)
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
                                fn.apply(this, arguments)
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
        chatRoom.getParticipants().forEach(function(v) {
            var contact = self.megaChat.getContactFromJid(v);
            assert(contact && contact.u, 'contact with jid ' + v + ' not found.');

            userHashes.push(
                {
                    'u': contact.u,
                    'priv': 1
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
    self._retrieveChatdIdIfRequired(chatRoom);
};

/** chatd related commands **/

ChatdIntegration.prototype.join = function(chatRoom) {
    var self = this;
    self.chatd.join(chatRoom.chatId, chatRoom.chatShard, chatRoom.chatdUrl + base64urlencode(u_handle));
};

ChatdIntegration.prototype.retrieveHistory = function(chatRoom, numOfMessages) {
    var self = this;
    self.chatd.hist(chatRoom.chatId, numOfMessages);
};

ChatdIntegration.prototype.markMessageAsSeen = function(chatRoom, msgid) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.SEEN, chatRoom.chatId + CHAT_UNDEFINED + base64urldecode(msgid));
};

ChatdIntegration.prototype.markMessageAsReceived = function(chatRoom, msgid) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RECEIVED, chatRoom.chatId + base64urldecode(msgid));
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RETENTION, chatRoom.chatId + CHAT_UNDEFINED + pack32le(time));
};


ChatdIntegration.prototype.sendMessage = function(chatRoom, message) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;
    self.chatd.submit(chatRoom.chatId, message);
};

ChatdIntegration.prototype.updateMessage = function(chatRoom, num, newMessage) {
    // a msgupd is only possible up to ten minutes after the indicated (client-supplied) UTC timestamp.
    var self = this;
    self.chatd.modify(chatRoom.chatId, num, newMessage);
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
