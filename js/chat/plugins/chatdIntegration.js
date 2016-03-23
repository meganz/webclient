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
    self.deviceId = null;


    // chat events
    megaChat.rebind("onInit.chatdInt", function(e) {
        megaChat.rebind("onRoomCreated.chatdInt", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
            self._attachToChatRoom(chatRoom);
        });
        megaChat.rebind("onRoomDestroy.chatdInt", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');

            //self._detachFromChatRoom(chatRoom);
        });

        asyncApiReq({a: "mcf", d: 1})
            .done(function(r) {
                // reopen chats from the MCF response.
                self.logger.debug("MCF returned: ", r);

                if (r.c) {
                    r.c.forEach(function (actionPacket) {
                        self.openChatFromApi(actionPacket, true);
                    });
                    self.deviceId = r.d;
                    self.mcfHasFinishedPromise.resolve();
                }
                else {
                    self.mcfHasFinishedPromise.reject(r);
                }
            })
    });

    megaChat.rebind("onDestroy.chatdInt", function(e) {
        self.chatd.destroyed = true;
    });

    $(window).rebind('onChatdChatUpdatedActionPacket.chatdInt', function(e, actionPacket) {
        self.openChatFromApi(actionPacket, false);
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

ChatdIntegration.prototype.waitForProtocolHandler = function (chatRoom, cb) {
    if (chatRoom.protocolHandler) {
        cb();
    }
    else {
        if (chatRoom.strongvelopeSetupPromises) {
            chatRoom.strongvelopeSetupPromises.done(function() {
                cb();
            });
        }
        else {
            createTimeoutPromise(function() {
                return !!chatRoom.protocolHandler;
            }, 300, 5000).done(function() {
                cb();
            }).fail(function() {
                debugger;
            });
        }
    }
};
ChatdIntegration.prototype.alterParticipants = function(chatRoom, included, excluded, forced) {
    var self = this;

    //self.protocolHandlerRequiresKeysInit(chatRoom);


    console.error('alterParticipants', chatRoom, included, excluded);

    if (included || excluded) {
        if (included.indexOf(u_handle) > -1) {
            removeValue(included, u_handle);
        }

        var doSendMsg = function() {
            /*if (!forced) {
                var msg = chatRoom.protocolHandler.alterParticipants(clone(included), clone(excluded));
                if (!msg) {
                    self.logger.error("Failed to do altPart: " + msg);
                }
                else {

                    var r = self.chatd.submit(base64urldecode(chatRoom.chatId), msg);

                    // append in the UI as a message
                    var alterPartMessage = new Message(
                        chatRoom,
                        chatRoom.messagesBuff,
                        {
                            'messageId': r,
                            'internalId': r,
                            'userId': u_handle,
                            'message': msg,
                            'textContents': "",
                            'delay': unixtime(),
                            'orderValue': unixtime(),
                            'sent': true
                        }
                    );
                    alterPartMessage.dialogType = 'alterParticipants';
                    alterPartMessage.meta = {
                        'excluded': excluded,
                        'included': included,
                    };


                    chatRoom.messagesBuff.messages.push(alterPartMessage);

                    $(chatRoom.messagesBuff).trigger('onNewMessageReceived', alterPartMessage);

                }
            }
            else {
                if (included) {
                    included.forEach(function(v) {
                        if (!chatRoom.protocolHandler.otherParticipants.has(v)) {
                            chatRoom.protocolHandler.otherParticipants.add(v);
                        }
                    });
                }
                if (excluded) {
                    excluded.forEach(function (v) {
                        chatRoom.protocolHandler.otherParticipants.delete(v);
                    });
                }

            }*/
        };


        self.waitForProtocolHandler(chatRoom, doSendMsg);
    }
};

ChatdIntegration.prototype.openChatFromApi = function(actionPacket, isMcf) {
    var self = this;

    loadingDialog.hide();

    var chatParticipants = actionPacket.u;
    if (!chatParticipants) {
        self.logger.error("actionPacket returned no chat participants: ", chatParticipants, ", removing chat.");
        //TODO: remove/destroy chat?
    }
    var chatJids = [];
    Object.keys(chatParticipants).forEach(function(k) {
        var v = chatParticipants[k];
        chatJids.push(
            megaChat.getJidFromNodeId(v.u)
        );
    });

    var roomJid;
    if (actionPacket.g !== 1) {
        roomJid = self.megaChat.generatePrivateRoomName(chatJids);
    }
    else {
        roomJid = self.megaChat.generateGroupRoomName(actionPacket.id);
    }
    roomJid += "@conference." + megaChat.options.xmppDomain;

    var chatRoom = self.megaChat.chats[roomJid];
    var finishProcess = function() {
        if (!chatRoom) {
            var r = self.megaChat.openChat(
                chatJids,
                actionPacket.g === 1 ? "group" : "private",
                actionPacket.id,
                actionPacket.cs,
                actionPacket.url,
                false
            );
            chatRoom = r[1];
            if (!isMcf && actionPacket.ou === u_handle && !actionPacket.n) {

                //self.setProtocolHandlerParticipants(chatRoom);

                //self.alterParticipants(chatRoom, members, [], true);

                window.location = chatRoom.getRoomUrl();
            }
        }
        else {
            if (!chatRoom.chatId) {
                chatRoom.chatId = actionPacket.id;
                chatRoom.chatShard = actionPacket.cs;
                chatRoom.chatdUrl = actionPacket.url;
            }
            else {
                //this is a member update!
                if (actionPacket.n) {
                    var included = [];
                    var excluded = [];
                    actionPacket.n.forEach(function(v) {
                        if (v.p === -1) {
                            excluded.push(v.u);
                            delete chatRoom.members[v.u];
                        }
                        else {
                            included.push(v.u);
                            chatRoom.members[v.u] = v.p;
                        }
                    });

                    if (included.length > 0 || excluded.length > 0) {
                        if (actionPacket.ou === u_handle) {
                            //self.alterParticipants(chatRoom, included, excluded);
                        }
                        chatRoom.trackDataChange();
                    }
                }
            }
        }
    };

    if (!actionPacket.url && (!chatRoom || !chatRoom.chatdUrl)) {
        asyncApiReq({
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

                if (!contact) {
                    return;
                }

                userHashes.push(
                    {
                        'u': contact.u,
                        'p': 3
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

            // unknown user.
            if (userHashes.length === 0) {
                return;
            }
            self.waitingChatIdPromises[chatRoom.roomJid] = asyncApiReq({
                'a': 'mcc',
                'g': chatRoom.type === "group" ? 1 : 0,
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
        if (!self.chatd.chatIdShard[chatIdDecoded]) {
            createTimeoutPromise(function() {
                return !!self.chatd.chatIdShard[chatIdDecoded]
            }, 100, 10000)
                .done(function() {
                    masterPromise.linkDoneAndFailToResult(fn, self, args);
                })
                .fail(function() {
                    masterPromise.reject(arguments)
                });
        }
        else {
            masterPromise.linkDoneAndFailToResult(fn, self, args);
        }
        return masterPromise;
    };
};
ChatdIntegration._ensureKeysAreLoaded = function(messages, users) {
    var promises = [];
    if (Array.isArray(messages)) {
        messages.forEach(function (msgObject) {
            if (msgObject.userId === strongvelope.COMMANDER) {
                return;
            }

            if (!pubCu25519[msgObject.userId]) {
                promises.push(
                    crypt.getPubCu25519(msgObject.userId)
                );
            }

            if (!u_pubkeys[msgObject.userId]) {
                promises.push(
                    crypt.getPubRSA(msgObject.userId)
                );
            }
            console.error(msgObject.userId);
        });
    }
    if (Array.isArray(users)) {
        users.forEach(function (userId) {
            if (userId === strongvelope.COMMANDER) {
                return;
            }

            if (!pubCu25519[userId]) {
                promises.push(
                    crypt.getPubCu25519(userId)
                );
            }

            if (!u_pubkeys[userId]) {
                promises.push(
                    crypt.getPubRSA(userId)
                );
            }
            console.error(userId);
        });
    }
    return MegaPromise.allDone(promises);
};

ChatdIntegration.prototype._attachToChatRoom = function(chatRoom) {
    var self = this;

    var chatRoomId = chatRoom.roomJid.split("@")[0];

    // chatd events
    self.chatd.rebind('onMembersUpdated.chatdInt' + chatRoomId, function(e, eventData) {
        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomJid === chatRoom.roomJid) {

            if (chatRoom.membersLoaded === false) {
                if (eventData.priv < 255) {
                    // add group participant in strongvelope
                    chatRoom.protocolHandler.addParticipant(eventData.userId);
                    // also add to our list
                    chatRoom.members[eventData.userId] = eventData.priv;
                }

                if (eventData.userId === u_handle) {
                    chatRoom.membersLoaded = true;
                    //self.setProtocolHandlerParticipants(chatRoom);
                }
            }
            else if (eventData.priv === 255) {
                // remove group participant in strongvelope
                chatRoom.protocolHandler.removeParticipant(eventData.userId);
                // also remove from our list
                delete chatRoom.members[eventData.userId];
            }
        }
    });

    if (!chatRoom.messagesBuff) {
        chatRoom.pubCu25519KeyIsMissing = false;

        var waitingForPromises = [];

        // retrieve all other user's Cu25519 keys IF needed
        chatRoom.getParticipants().forEach(function(jid) {
            var contactHash = chatRoom.megaChat.getContactHashFromJid(jid);
            if (contactHash && !pubCu25519[contactHash]) {
                var keyRetrievalPromise = crypt.getPubCu25519(contactHash);
                keyRetrievalPromise.fail(function(r) {
                    self.logger.warn("Failed to retrieve pubCu25519 key for: ", contactHash);
                });

                waitingForPromises.push(
                    keyRetrievalPromise
                );
            }
            if (contactHash && !u_pubkeys[contactHash]) {
                var keyRetrievalPromise = crypt.getPubRSA(contactHash);
                keyRetrievalPromise.fail(function(r) {
                    self.logger.warn("Failed to retrieve pubRSA key for: ", contactHash);
                });

                waitingForPromises.push(
                    keyRetrievalPromise
                );
            }
        });

        if (authring.hadInitialised() === false) {
            waitingForPromises.push(
                authring.initAuthenticationSystem()
                    .fail(function() {
                        self.logger.error("Failed to initialise authring.");
                    })
            );
        }

        chatRoom.notDecryptedBuffer = {};

        chatRoom.messagesBuff = new MessagesBuff(chatRoom, self);
        $(chatRoom.messagesBuff).rebind('onHistoryFinished.chatd', function() {
            //self.protocolHandlerRequiresKeysInit(chatRoom);

            chatRoom.messagesBuff.messages.forEach(function(v, k) {
                if (v.userId) {
                    var msg = v.getContents ? v.getContents() : v.message;
                    //if (msg && msg.length && msg.length > 0) {
                    //    msg = base64urldecode(msg);
                    //}

                    chatRoom.notDecryptedBuffer[k] = {
                        'message': msg,
                        'userId': v.userId,
                        'ts': v.delay,
                        'k': k
                    };
                }
            });

            var hist = [];
            Object.keys(chatRoom.notDecryptedBuffer).forEach(function(k) {
                var v = chatRoom.notDecryptedBuffer[k];

                if (v) {
                    hist.push(v);
                }
            });
            
            if (hist.length > 0) {
                var decryptMessages = function() {
                    try {
                        // .seed result is not used in here, since it returns false, even when some messages can be decrypted
                        // which in the current case (of tons of cached non encrypted txt msgs in chatd) is bad
                        var seedResult = chatRoom.protocolHandler.seed(hist);
                        //console.error(chatRoom.roomJid, seedResult);


                        var decryptedMsgs = chatRoom.protocolHandler.batchDecrypt(hist, true);
                        decryptedMsgs.forEach(function (v, k) {
                            if (typeof v === undefined) {
                                return; // skip already decrypted messages
                            }

                            if (v && v.payload) {
                                chatRoom.messagesBuff.messages[hist[k]['k']].textContents = v.payload;
                                delete chatRoom.notDecryptedBuffer[k];
                            }
                            else if (v && (v.type === 0 || v.type === 2)) {
                                // this is a system message
                                chatRoom.messagesBuff.messages[hist[k]['k']].protocol = true;
                            }
                            /*else if (v && !v.payload && v.type === strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS) {
                                console.error(v);
                                chatRoom.messagesBuff.messages[hist[k]['k']].meta = {
                                    userId: v.sender,
                                    included: v.includeParticipants,
                                    excluded: v.excludeParticipants
                                };
                                chatRoom.messagesBuff.messages[hist[k]['k']].dialogType = "alterParticipants";
                            }*/
                            else if (v && !v.payload) {
                                self.logger.error("Could not decrypt: ", v)
                            }
                        });
                    } catch (e) {
                        self.logger.error("Failed to decrypt stuff via strongvelope, because of uncaught exception: ", e);
                    }
                };


                if (!chatRoom.protocolHandler) {
                    if (chatRoom.strongvelopeSetupPromises) {
                        chatRoom.strongvelopeSetupPromises.done(function() {
                            ChatdIntegration._ensureKeysAreLoaded(hist)
                                .always(decryptMessages);
                        });
                    }
                    else {
                        debugger;
                    }
                }
                else {
                    ChatdIntegration._ensureKeysAreLoaded(hist)
                        .always(decryptMessages);
                }

            }
        });

        $(chatRoom).rebind('onLeaveChatRequested.chatdInt', function(e) {
            asyncApiReq({
                "a":"mcr", // request identifier
                "id": chatRoom.chatId, // chat id
                "u": u_handle // optional, email or handle of other user to remove. If not provided the requester is removed.
            });
        });
        $(chatRoom).rebind('onAddUserRequest.chatdInt', function(e, contactHash) {
            asyncApiReq({
                "a":"mci",
                "id": chatRoom.chatId,
                "u": contactHash,
                "p": 3
            });
        });

        $(chatRoom).rebind('onRemoveUserRequest.chatdInt', function(e, contactHash) {
            asyncApiReq({
                "a":"mcr",
                "id": chatRoom.chatId,
                "u": contactHash
            });
        });
        chatRoom.megaChat.rebind('onNewGroupChatRequest.chatdInt', function(e, contactHashes) {
            var users = [];
            contactHashes.forEach(function(k) {
                users.push({
                    'u': k,
                    'p': 3
                });
            });

            asyncApiReq({
                'a': 'mcc',
                'g': 1,
                'u': users
            })
                .done(function(r) {
                    // no need to do anything, the triggered action packet would trigger the code for joining the room.
                })
                .fail(function() {
                    self.logger.error("Failed to retrieve chatd ID from API, while trying to create a new room");
                });
        });
        $(chatRoom.messagesBuff).rebind('onNewMessageReceived.chatdStrongvelope', function(e, msgObject) {
            if (msgObject.message && msgObject.message.length && msgObject.message.length > 0) {
                var _runDecryption = function() {
                    try {
                        var decrypted = chatRoom.protocolHandler.decryptFrom(
                            msgObject.message,
                            msgObject.userId,
                            false
                        );

                        if (decrypted && decrypted.payload) {
                            chatRoom.messagesBuff.messages[msgObject.messageId].textContents = decrypted.payload;
                        } else if (decrypted && !decrypted.payload && typeof(decrypted.type) !== 'undefined') {
                            if (decrypted.type === strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS) {
                                chatRoom.messagesBuff.messages[msgObject.messageId].meta = {
                                    userId: decrypted.sender,
                                    included: decrypted.includeParticipants,
                                    excluded: decrypted.excludeParticipants
                                };
                                chatRoom.messagesBuff.messages[msgObject.messageId].dialogType = "alterParticipants";
                            }
                            else {
                                chatRoom.messagesBuff.messages[msgObject.messageId].protocol = true;
                            }
                        }
                    } catch(e) {
                        self.logger.error("Failed to decrypt stuff via strongvelope, because of uncaught exception: ", e);
                    }
                };

                var promises = [];
                if (!pubCu25519[msgObject.userId]) {
                    promises.push(
                        crypt.getPubCu25519(msgObject.userId)
                    );
                } if (!u_pubkeys[msgObject.userId]) {
                    promises.push(
                        crypt.getPubRSA(msgObject.userId)
                    );
                }

                MegaPromise.allDone(promises).always(function() {
                    _runDecryption();
                });
            }
        });

        waitingForPromises.push(
            self._retrieveChatdIdIfRequired(chatRoom)
        );


        chatRoom.strongvelopeSetupPromises = MegaPromise.allDone(
            waitingForPromises
        )
            .done(function () {
                // after all dependencies (data) is initialised, lets init the protocol handler
                assert(u_handle, 'u_handle is not loaded, null or undefined!');
                assert(u_privCu25519, 'u_privCu25519 is not loaded, null or undefined!');
                assert(u_privEd25519, 'u_privEd25519 is not loaded, null or undefined!');
                assert(u_pubEd25519, 'u_pubEd25519 is not loaded, null or undefined!');
                assert(self.deviceId !== null, 'deviceId not loaded.');

                chatRoom.protocolHandler = new strongvelope.ProtocolHandler(
                    u_handle,
                    u_privCu25519,
                    u_privEd25519,
                    u_pubEd25519,
                    a32_to_str([self.deviceId])
                );
                chatRoom.protocolHandler.chatRoom = chatRoom;

                self.join(chatRoom);
            })
            .fail(function() {
                self.logger.error(
                    "Failed to pre-load keys before initialising strongvelope. " +
                    "Can't initialise strongvelope for this chat: ",
                    chatRoom.roomJid,
                    waitingForPromises
                );
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
    self.chatd.cmd(Chatd.Opcode.SEEN, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
};

ChatdIntegration.prototype.markMessageAsReceived = function(chatRoom, msgid) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RETENTION, base64urldecode(chatRoom.chatId), Chatd.Const.UNDEFINED + pack32le(time));
};


ChatdIntegration.prototype.protocolHandlerRequiresKeysInit = function(chatRoom) {
    if (
        chatRoom.protocolHandler.previousKeyId === null &&
        chatRoom.protocolHandler.keyId === null
    ) {
        // new session, gen key!
        chatRoom.protocolHandler.updateSenderKey();
    }
};

ChatdIntegration.prototype.sendMessage = function(chatRoom, message) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;

    var promises = [];
    var participants = Object.keys(chatRoom.members);
    removeValue(participants, u_handle);

    promises.push(
        ChatdIntegration._ensureKeysAreLoaded(participants)
    );


    var tmpPromise = new MegaPromise();

    var _runEncryption = function() {
        // is this a new (empty) chat?
        self.protocolHandlerRequiresKeysInit(chatRoom);

        try {
            var result;
            if (chatRoom.type === "private") {
                result = chatRoom.protocolHandler.encryptTo(message, participants[0]);
            }
            else {
                result = chatRoom.protocolHandler.encryptTo(message);
            }

            if (result !== false) {
                tmpPromise.resolve(
                    self.chatd.submit(base64urldecode(chatRoom.chatId), result)
                );
            }
            else {
                tmpPromise.reject();
            }
        } catch(e) {
            self.logger.error("Failed to encrypt stuff via strongvelope, because of uncaught exception: ", e);
        }
    };

    MegaPromise.allDone(promises).always(function() {
        _runEncryption();
    });

    return tmpPromise;
};

ChatdIntegration.prototype.updateMessage = function(chatRoom, num, newMessage) {
    // a msgupd is only possible up to ten minutes after the indicated (client-supplied) UTC timestamp.
    var self = this;
    self.chatd.modify(base64urldecode(chatRoom.chatId), num, newMessage);
};

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
