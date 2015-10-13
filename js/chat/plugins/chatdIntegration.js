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
    self.mcfHasFinishedPromise = new MegaPromise();

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
                if (r.c) {
                    r.c.forEach(function (actionPacket) {
                        self.openChatFromApi(actionPacket);
                    });

                    self.mcfHasFinishedPromise.resolve();
                }
                else {
                    self.mcfHasFinishedPromise.reject(r);
                }
            })
    });


    $(window).rebind('onChatCreatedActionPacket.chatdInt', function(e, actionPacket) {
        self.openChatFromApi(actionPacket);
    });

    return self;
};

ChatdIntegration.prototype._getChatRoomFromEventData = function(eventData) {
    var self = this;
    var chatRoomJid = self.chatIdToRoomJid[eventData.chatId];
    assert(chatRoomJid, 'chat room not found for chat id: ' + eventData.chatId);
    return self.megaChat.chats[chatRoomJid];
};

ChatdIntegration.prototype._getKarereObjFromChatdObj = function(chatdEventObj) {
    var self = this;
    var chatRoom = self._getChatRoomFromEventData(chatdEventObj);

    var msgContents;
    //try {
    //    msgContents = msgContents = chatRoom.protocolHandler.decryptFrom(
    //        base64urldecode(chatdEventObj.message),
    //        chatdEventObj.userId
    //    );
    //    if (msgContents && msgContents.payload) {
    //        msgContents = msgContents.payload;
    //    }
    //    else if (msgContents === false) {
    //        return false;
    //    }
    //    else {
    //        msgContents = chatdEventObj.message; // fallback to plaintext?
    //    }
    //} catch (e) {
    //    if (e instanceof URIError) {
    //        self.logger.error(
    //            "Failed to decrypt message: ", chatdEventObj.messageId,
    //            "with length:", chatdEventObj.message.length
    //        );
    //
    //        msgContents = chatdEventObj.message; // fallback to plaintext?
    //    }
    //    else {
    //        throw e;
    //    }
    //}

    msgContents = chatdEventObj.message;

    var messageObject;
    if (!chatdEventObj.userId || chatdEventObj.userId === u_handle) {
        var state = KarereEventObjects.OutgoingMessage.STATE.SENT;

        /**
         * toJid, fromJid, type, messageId, contents, meta, delay, state, roomJid, seen
         *
         * @type {KarereEventObjects.OutgoingMessage}
         */
        messageObject = new KarereEventObjects.OutgoingMessage(
            /* toJid,  */ chatRoom.roomJid,
            /* fromJid,  */ self.megaChat.getJidFromNodeId(chatdEventObj.userId),
            /* type,  */ "groupchat",
            /* messageId,  */ chatdEventObj.messageId,
            /* contents, */ msgContents,
            /* meta,  */ {},
            /* delay,  */ chatdEventObj.ts,
            /* state,  */ state,
            /* roomJid, */ chatRoom.roomJid,
            /* seen */ chatdEventObj.seen
        );
    }
    else {
        /**
         * toJid, fromJid, type, rawType, messageId, rawMessage, roomJid, meta, contents, elements, delay, seen
         * @type {KarereEventObjects.IncomingMessage}
         */
        messageObject = new KarereEventObjects.IncomingMessage(
            /* toJid,  */ chatRoom.roomJid,
            /* fromJid,  */ self.megaChat.getJidFromNodeId(chatdEventObj.userId),
            /* type,  */ "groupchat",
            /* rawType, */ "groupchat",
            /* messageId,  */ chatdEventObj.messageId,
            /* rawMessage, */ undefined,
            /* roomJid, */ chatRoom.roomJid,
            /* meta,  */ {},
            /* contents, */ msgContents,
            /* elements, */ undefined,
            /* delay,  */ chatdEventObj.ts,
            /* seen */ chatdEventObj.seen
        );
    }
    return messageObject;
};

ChatdIntegration.prototype.openChatFromApi = function(actionPacket) {
    var self = this;

    //console.error("Will open chat for action packet: ", actionPacket);

    var chatParticipants = actionPacket.u;
    if (!chatParticipants) {
        self.logger.error("actionPacket returned no chat participants: ", chatParticipants);
    }
    var chatJids = [];
    Object.keys(chatParticipants).forEach(function(k) {
        var v = chatParticipants[k];
        chatJids.push(
            megaChat.getJidFromNodeId(v.u)
        );
    });
    if (chatJids.length < 2) {
        self.logger.warn("Will ignore chatd room: ", actionPacket.id, "since it only have 1 user (me).");
        return;
    }

    var roomJid = self.megaChat.generatePrivateRoomName(chatJids) + "@conference." + megaChat.options.xmppDomain;

    var chatRoom = self.megaChat.chats[roomJid];
    var finishProcess = function() {
        if (!chatRoom) {
            self.megaChat.openChat(chatJids, "private", actionPacket.id, actionPacket.cs, actionPacket.url, false);

        }
        else {
            if (!chatRoom.chatId) {
                chatRoom.chatId = actionPacket.id;
                chatRoom.chatShard = actionPacket.cs;
                chatRoom.chatdUrl = actionPacket.url;
            }
        }
    };

    if (!actionPacket.url) {
        self.apiReq({
            a: 'mcurl',
            id: actionPacket.id
        })
        .done(function(mcurl) {
                actionPacket.url = mcurl;
                finishProcess();
            });
    }
    else {
        finishProcess();
    }

};

ChatdIntegration.prototype.apiReq = function(data) {
    console.error("Api req: ", data);

    var $promise = new MegaPromise();
    api_req(data, {
        callback: function(r) {
            if (typeof(r) === 'number') {
                $promise.reject.apply($promise, arguments);
            }
            else {
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

        self.mcfHasFinishedPromise.done(function() {
            self._retrieveChatdIdIfRequired(chatRoom)
                .done(function() {
                    if (chatRoom.chatId) {
                        masterPromise.linkDoneAndFailToResult(fn, self, args);
                    }
                    else {
                        createTimeoutPromise(
                            function() {
                                return !!chatRoom.chatId
                            },
                            100,
                            30000 /* API can be down... */
                        )
                            .done(function() {
                                masterPromise.linkDoneAndFailToResult(fn, self, args);
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
        })
        .fail(function() {
                self.logger.error("mcf failed");
                masterPromise.reject(arguments);
            });

        return masterPromise;
    };
};

ChatdIntegration.prototype._retrieveChatdIdIfRequired = function(chatRoom) {
    var self = this;
    var masterPromise = new MegaPromise();

    self.mcfHasFinishedPromise.done(function() {
        if (!chatRoom.chatId) {
            // already sent an API request?
            if (
                self.waitingChatIdPromises[chatRoom.roomJid] &&
                self.waitingChatIdPromises[chatRoom.roomJid].state() === 'pending'
            ) {
                masterPromise.linkDoneAndFailTo(
                    self.waitingChatIdPromises[chatRoom.roomJid]
                );
                return masterPromise;
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
                }
                else {
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

            return masterPromise.linkDoneAndFailTo(
                self.waitingChatIdPromises[chatRoom.roomJid]
            );
        }
        else {
            masterPromise.resolve();
            return masterPromise;
        }
    });
    return masterPromise;
};

ChatdIntegration._waitForShardToBeAvailable = function(fn) {
    return function() {
        var self = this;
        var chatRoom = arguments[0];
        var masterPromise = new MegaPromise();
        var args = arguments;

        var chatIdDecoded = base64urldecode(chatRoom.chatId);
        if (!self.chatd.chatidshard[chatIdDecoded]) {
            //console.error('shard is NOT available, queueing fn exection', fn);
            createTimeoutPromise(function() {
                return !!self.chatd.chatidshard[chatIdDecoded]
            }, 100, 10000)
                .done(function() {
                    //console.error('shard is NOW available, executing queued fn', fn);
                    masterPromise.linkDoneAndFailToResult(fn, self, args);
                })
                .fail(function() {
                    //console.error('waiting for shard failed rejecting call to', fn);
                    masterPromise.reject(arguments)
                });
        }
        else {
            //console.error('shard is available, executing immediately.');
            masterPromise.linkDoneAndFailToResult(fn, self, args);
        }
        return masterPromise;
    };
};

ChatdIntegration.prototype._attachToChatRoom = function(chatRoom) {
    var self = this;

    if (!chatRoom.messagesBuff) {
        var strongvelopeInitPromise = createTimeoutPromise(function() {
            return !!u_handle && !!u_privCu25519 && !!u_privEd25519 && !!u_pubEd25519
        }, 50, 5000)
            .done(function() {
                // after all dependencies (data) is initialised, lets init the protocol handler
                assert(u_handle, 'u_handle is not loaded, null or undefined!');
                assert(u_privCu25519, 'u_privCu25519 is not loaded, null or undefined!');
                assert(u_privEd25519, 'u_privEd25519 is not loaded, null or undefined!');
                assert(u_pubEd25519, 'u_pubEd25519 is not loaded, null or undefined!');

                // retrieve all other user's Cu25519 keys IF needed
                chatRoom.getParticipants().forEach(function(jid) {
                    var contact = chatRoom.megaChat.getContactFromJid(jid);
                    if (contact && contact.u && !pubCu25519[contact.u]) {
                        crypt.getPubCu25519(contact.u);
                    }
                });

                chatRoom.protocolHandler = new strongvelope.ProtocolHandler(
                    u_handle,
                    u_privCu25519,
                    u_privEd25519,
                    u_pubEd25519
                );
            })
            .fail(function() {
                self.logger.error(
                    "Failed to initialise strongvelope protocol handler, because u_* vars were not available in a" +
                    " timely manner."
                );
            });

        // try to init immediately
        strongvelopeInitPromise.verify();

        chatRoom.messagesBuff = new MessagesBuff(chatRoom, self);
        console.error("New MessagesBuff: ", chatRoom);

        self._retrieveChatdIdIfRequired(chatRoom)
            .done(function () {
                self.join(chatRoom);
            });
    }



};

/** chatd related commands **/

ChatdIntegration.prototype.join = function(chatRoom) {
    var self = this;

    assert(
        chatRoom.chatId && chatRoom.chatShard !== undefined && chatRoom.chatdUrl,
        'missing chatId, chatShard or chadUrl in megaRoom. halting chatd join and code execution.'
    );

    ////console.error("JOINNNN: ", chatRoom.roomJid, chatRoom.chatId, chatRoom.chatShard, chatRoom.chatdUrl);
    self.chatd.join(
        base64urldecode(chatRoom.chatId),
        chatRoom.chatShard,
        chatRoom.chatdUrl
            .replace("ws:", "wss:")
            .replace("31.216.147.155", "chattest.userstorage.mega.co.nz")
    );
    self.chatIdToRoomJid[chatRoom.chatId] = chatRoom.roomJid;
};

ChatdIntegration.prototype.retrieveHistory = function(chatRoom, numOfMessages) {
    var self = this;
    self.chatd.hist(base64urldecode(chatRoom.chatId), numOfMessages);
};

ChatdIntegration.prototype.markMessageAsSeen = function(chatRoom, msgid) {
    var self = this;
    //console.error("markMessageAsSeen", chatRoom, msgid);
    self.chatd.cmd(Chatd.Opcode.SEEN, base64urldecode(chatRoom.chatId), Chatd.Const.UNDEFINED + base64urldecode(msgid));
};

ChatdIntegration.prototype.markMessageAsReceived = function(chatRoom, msgid) {
    var self = this;
    //console.error("markMessageAsReceived", chatRoom, msgid);
    self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RETENTION, base64urldecode(chatRoom.chatId), Chatd.Const.UNDEFINED + pack32le(time));
};


ChatdIntegration.prototype.sendMessage = function(chatRoom, message) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;
    //var destinationUser = chatRoom.megaChat.getContactFromJid(chatRoom.getParticipantsExceptMe()[0]);
    //assert(destinationUser, 'user/contact not found!');
    //var ciphertext = base64urlencode(chatRoom.protocolHandler.encryptTo(message, destinationUser.u));

    var ciphertext = message; // TODO: introduce back encryption

    return self.chatd.submit(base64urldecode(chatRoom.chatId), ciphertext);
};

ChatdIntegration.prototype.updateMessage = function(chatRoom, num, newMessage) {
    // a msgupd is only possible up to ten minutes after the indicated (client-supplied) UTC timestamp.
    var self = this;
    self.chatd.modify(base64urldecode(chatRoom.chatId), num, newMessage);
};

//TODO: msg updated callback



// decorate ALL functions which require shard to be available before executing
[
    'retrieveHistory',
    'markMessageAsSeen',
    'markMessageAsReceived',
    'setRetention',
    'sendMessage',
    'updateMessage'
].forEach(function(fnName) {
        ChatdIntegration.prototype[fnName] = ChatdIntegration._waitForShardToBeAvailable(
            ChatdIntegration.prototype[fnName]
        );
    });

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
