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
            chatRoom.rebind('onMessageAppended.chatdInt', function(e, messageObj) {
                $(messageObj).rebind("onChange.chatdInt", function(e, messageObj, propertyName, oldVal, newVal) {
                    if(propertyName === "seen" && newVal === true) {
                        self.markMessageAsSeen(chatRoom, messageObj.messageId);
                    }
                });
            });
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
                if(r.c) {
                    r.c.forEach(function (actionPacket) {
                        self.openChatFromApi(actionPacket);
                    });

                    self.mcfHasFinishedPromise.resolve();
                } else {
                    self.mcfHasFinishedPromise.reject(r);
                }
            })
    });


    $(window).rebind('onChatCreatedActionPacket.chatdInt', function(e, actionPacket) {
        self.openChatFromApi(actionPacket);
    });


    var _getChatRoomFromEventData = function(eventData) {
        var chatRoomJid = self.chatIdToRoomJid[eventData.chatId];
        assert(chatRoomJid, 'chat room not found for chat id: ' + eventData.chatId);
        return self.megaChat.chats[chatRoomJid];
    };

    self.chatd.rebind('onMessagesHistoryInfo.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);

        chatRoom.chatdOldest = eventData.oldest;
        chatRoom.chatdNewest = eventData.newest;
        chatRoom.chatdIsProcessingHistory = true;
        chatRoom.chatdHistorySeenMsgRetrieved = false;
        chatRoom.chatdHistoryDeliveredMsgRetrieved = false;
    });

    self.chatd.rebind('onMessageLastSeen.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);

        chatRoom.chatdLastSeen = eventData.messageId;
        var msg = chatRoom.messages[eventData.messageId];
        if(msg && eventData.userId === u_handle) {
            if(msg.setSeen) {
                msg.setSeen(true);
            } else if (msg.seen) {
                msg.seen = true;
            }
        }
    });
    self.chatd.rebind('onMessageLastReceived.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);

        chatRoom.chatdLastReceived = eventData.messageId;
        var msg = chatRoom.messages[eventData.messageId];
        if(msg && msg instanceof KarereEventObjects.OutgoingMessage) {
            msg.setState(
                KarereEventObjects.OutgoingMessage.STATE.DELIVERED
            );
        }
    });

    // handle data from chatd
    self.chatd.rebind('onMessageStore.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);

        if(eventData.messageId === chatRoom.chatdLastSeen) {
            chatRoom.chatdHistorySeenMsgRetrieved = true;
        }
        if(eventData.messageId === chatRoom.chatdLastReceived) {
            chatRoom.chatdHistoryDeliveredMsgRetrieved = true;
        }

        var messageObject;
        if(!eventData.userId || eventData.userId === u_handle) {
            var state = KarereEventObjects.OutgoingMessage.STATE.SENT;

            if(chatRoom.chatdIsProcessingHistory === true && chatRoom.chatdHistoryDeliveredMsgRetrieved === true) {
                //console.error("Setting state to delivered (from history)", eventData);
                state = KarereEventObjects.OutgoingMessage.STATE.DELIVERED;
            }

            /**
             * toJid, fromJid, type, messageId, contents, meta, delay, state, roomJid, seen
             *
             * @type {KarereEventObjects.OutgoingMessage}
             */
            messageObject = new KarereEventObjects.OutgoingMessage(
                /* toJid,  */ chatRoom.roomJid,
                /* fromJid,  */ self.megaChat.getJidFromNodeId(eventData.userId),
                /* type,  */ "groupchat",
                /* messageId,  */ eventData.messageId,
                /* contents, */ eventData.message,
                /* meta,  */ {},
                /* delay,  */ eventData.ts,
                /* state,  */ state,
                /* roomJid, */ chatRoom.roomJid,
                /* seen */ true
            );
        } else {
            var seenState = chatRoom.isCurrentlyActive && $.windowActive;

            //console.error(
            //    chatRoom.chatdIsProcessingHistory === true,
            //    chatRoom.chatdHistorySeenMsgRetrieved
            //);

            if(chatRoom.chatdIsProcessingHistory === true && chatRoom.chatdHistorySeenMsgRetrieved === true) {
                //console.error("Marking as seen (from history)", eventData.messageId);
                seenState = true;
            }

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
                /* seen */ seenState
            );

            if(chatRoom.chatdIsProcessingHistory !== true) {
                //console.error("Marking as received: ", chatRoom, eventData.messageId);
                self.markMessageAsReceived(chatRoom, eventData.messageId);
            }

            if(seenState && chatRoom.chatdIsProcessingHistory !== true) {
                //console.error("Marking as seen: ", chatRoom, eventData.messageId);
                self.markMessageAsSeen(chatRoom, eventData.messageId);
            }
        }

        if(messageObject) {
            messageObject.orderValue = eventData.id;
            chatRoom.appendMessage(messageObject);
        }

    });

    self.chatd.rebind('onMessagesHistoryDone.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);
        self.finishedReceivingMessagesHistory(chatRoom);
    });

    self.chatd.rebind('onMessageUpdated.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);

        if(eventData.state === "CONFIRMED") {
            if(!eventData.id) {
                debugger;
            }
            //console.error("Confirmed: ", eventData.id);

            var found = false;
            chatRoom.messages.forEach(function(v, k) {
                if(v.internalId === eventData.id) {
                    var prevMessageId = v.messageId;
                    v.messageId = eventData.messageId;
                    v.orderValue = eventData.id;
                    v.setState(KarereEventObjects.OutgoingMessage.STATE.SENT);
                    if(prevMessageId === eventData.messageId) {
                        // same id, don't re-add, just update all properties.
                        Object.keys(eventData).forEach(function(k) {
                            v[k] = eventData[k]
                        });
                    } else {
                        chatRoom.messages.removeByKey(prevMessageId);
                        chatRoom.messages.push(v);
                    }
                    found = true;
                    return false; // break
                }
            });
            if(!found) {
                self.logger.error("Message that was confirmed not found: ", eventData);
            }
        }
    });

    self.chatd.rebind('onMessageReceived.chatdInt', function(e, eventData) {
        var chatRoom = _getChatRoomFromEventData(eventData);


        //console.error("Received: ", eventData.messageId);

        var found = false;
        var msg = chatRoom.messages[eventData.messageId];
        if(msg) {
            if (msg instanceof KarereEventObjects.OutgoingMessage) {
                msg.setState(KarereEventObjects.OutgoingMessage.STATE.DELIVERED);
            } else {
                // its ok, don't change the state of any incoming messages.
            }
        } else {
            self.logger.error("Message received state was not changed, since message was not found:", eventData);
        }
    });

    return self;
};

ChatdIntegration.prototype.openChatFromApi = function(actionPacket) {
    var self = this;

    //console.error("Will open chat for action packet: ", actionPacket);

    var chatParticipants = actionPacket.u;
    if(!chatParticipants) {
        self.logger.error("actionPacket returned no chat participants: ", chatParticipants);
    }
    var chatJids = [];
    Object.keys(chatParticipants).forEach(function(k) {
        var v = chatParticipants[k];
        chatJids.push(
            megaChat.getJidFromNodeId(v.u)
        );
    });
    if(chatJids.length < 2) {
        self.logger.warn("Will ignore chatd room: ", actionPacket.id, "since it only have 1 user (me).");
        return;
    }

    var roomJid = self.megaChat.generatePrivateRoomName(chatJids) + "@conference." + megaChat.options.xmppDomain;

    var chatRoom = self.megaChat.chats[roomJid];
    var finishProcess = function() {
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
            } else {
                $promise.resolve.apply($promise, arguments);
            }
        }
    });

    //TODO: fail case?! e.g. the exp. backoff failed after waiting for X minutes??

    return $promise;
};


ChatdIntegration.prototype.finishedReceivingMessagesHistory = function(chatRoom) {
    var self = this;

    chatRoom.chatdIsProcessingHistory = false;

    delete chatRoom.chatdLastSeen;
    delete chatRoom.chatdLastReceived;
    delete chatRoom.chatdOldest;
    delete chatRoom.chatdNewest;
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
                    if(chatRoom.chatId) {
                        masterPromise.linkDoneAndFailToResult(fn, self, args);
                    } else {
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
        if(!chatRoom.chatId) {
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

            return masterPromise.linkDoneAndFailTo(
                self.waitingChatIdPromises[chatRoom.roomJid]
            );
        } else {
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
        if(!self.chatd.chatidshard[chatIdDecoded]) {
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
        } else {
            //console.error('shard is available, executing immediately.');
            masterPromise.linkDoneAndFailToResult(fn, self, args);
        }
        return masterPromise;
    };
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

    ////console.error("JOINNNN: ", chatRoom.roomJid, chatRoom.chatId, chatRoom.chatShard, chatRoom.chatdUrl);
    self.chatd.join(base64urldecode(chatRoom.chatId), chatRoom.chatShard, chatRoom.chatdUrl);
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
    return self.chatd.submit(base64urldecode(chatRoom.chatId), message);
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
