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

    var loggerIsEnabled = localStorage['chatdIntegrationLogger'] === '1';
    self.logger = MegaLogger.getLogger(
        "chatdInt",
        {
            onCritical: function(msg) {
                if (msg.indexOf("order tampering") > -1) {
                    api_req({
                        a: 'log',
                        e: 99616,
                        m: 'order tampering'
                    }, {});
                }
            },
            minLogLevel: function() {
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            }
        },
        megaChat.logger
    );

    self.megaChat = megaChat;
    self.chatd = new Chatd(u_handle);
    self.waitingChatIdPromises = {};
    self.chatIdToRoomJid = {};
    self._cachedHandlers = {};
    self._loadingCount = 0;

    // chat events
    megaChat.rebind("onInit.chatdInt", function(e) {
        megaChat.rebind("onRoomCreated.chatdInt", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
            self._attachToChatRoom(chatRoom);
        });
        if (ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
            if (fminitialized === true) {
                // old db, which means that the 'mcf' is empty and the 'f' was not called.
                // do a separate mcf call!
                self.retrieveChatsFromApi();
            }
            else {
                mBroadcaster.once('fm:initialized', function() {
                    if (ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
                        self.retrieveChatsFromApi();
                    }
                });
            }
        }
        else {
            ChatdIntegration.mcfHasFinishedPromise.done(function () {
                var allPromises = [];
                Object.keys(ChatdIntegration._queuedChats).forEach(function (id) {
                    allPromises.push(
                        self.openChatFromApi(ChatdIntegration._queuedChats[id], true)
                    );
                });
                ChatdIntegration._queuedChats = {};
                ChatdIntegration.allChatsHadLoaded.linkDoneAndFailTo(MegaPromise.allDone(allPromises));
            });
        }
    });

    megaChat.rebind("onDestroy.chatdInt", function(e) {
        self.chatd.destroyed = true;
    });
    
    $(window).rebind('onChatdChatUpdatedActionPacket.chatdInt', function(e, actionPacket) {
        self.openChatFromApi(actionPacket, false);
    });


    self.chatd.rebind('onClose.chatdInt', function(e, eventData) {
        var shard = eventData.shard;

        shard.getRelatedChatIds().forEach(function(chatId) {
            var chatRoomJid = self.chatIdToRoomJid[chatId];
            if (chatRoomJid) {
                var chatRoom = self.megaChat.chats[chatRoomJid];
                if (chatRoom) {
                    if (chatRoom.state !== ChatRoom.STATE.LEFT) {
                        chatRoom.setState(ChatRoom.STATE.JOINING, true);
                    }
                }
            }
        });
    });

    megaChat.rebind('onNewGroupChatRequest.chatdInt', function(e, contactHashes) {
        var users = [];
        contactHashes.forEach(function(k) {
            users.push({
                'u': k,
                'p': 2
            });
        });

        asyncApiReq({
            'a': 'mcc',
            'g': 1,
            'u': users,
            'v': Chatd.VERSION
        })
            .done(function(r) {
                // no need to do anything, the triggered action packet would trigger the code for joining the room.
            })
            .fail(function() {
                self.logger.error("Failed to retrieve chatd ID from API, while trying to create a new room");
            });
    });
    return self;
};

/**
 * Resolved/rejected when the 'mcf' response is received (either from indexedDB or api),
 * Note: When this is resolved, chats are not yet accessible via megaChat.chats yet!
 *
 * @type {MegaPromise}
 */
ChatdIntegration.mcfHasFinishedPromise = new MegaPromise();

/**
 * Resolved/rejected when all chats are added to megaChat.chats, mcurls are received, etc. E.g. they are ready for
 * renderering.
 *
 * @type {MegaPromise}
 */
ChatdIntegration.allChatsHadLoaded = new MegaPromise();
ChatdIntegration._queuedChats = {};

ChatdIntegration.prototype.retrieveChatsFromApi = function() {
    var self = this;
    self._loadingCount++;
    asyncApiReq({a: "mcf", d: 1, v: Chatd.VERSION})
        .done(function(r) {
            self.logger.debug("MCF returned: ", r);

            var allPromises = [];
            // reopen chats from the MCF response.
            if (r.c) {
                r.c.forEach(function (actionPacket) {
                    if (actionPacket.active === 0) {
                        // skip non active chats for now...
                        return;
                    }
                    allPromises.push(
                        self.openChatFromApi(actionPacket, true)
                    );
                    if (typeof mSDB === 'object' && !pfkey) {
                        var roomInfo = {
                            'id': actionPacket.id,
                            'cs': actionPacket.cs,
                            'g': actionPacket.g,
                            'u': clone(actionPacket.u),
                            'ct': actionPacket.ct ? actionPacket.ct : null
                        };
                        mSDB.add('mcf', roomInfo);
                    }
                });

                ChatdIntegration.mcfHasFinishedPromise.resolve();
                ChatdIntegration.allChatsHadLoaded.linkDoneAndFailTo(MegaPromise.allDone(allPromises));
            }
            else {
                ChatdIntegration.mcfHasFinishedPromise.reject(r);
                ChatdIntegration.allChatsHadLoaded.reject();
            }
        })
        .fail(function(r) {
            ChatdIntegration.allChatsHadLoaded.reject();

            if (r === EEXPIRED) {
                self.requiresUpdate();
            }
        })
        .always(function() {
            self._loadingCount--;
            if (self._loadingCount === 0) {
                $(self).trigger('onMcfLoadingDone');
            }
        });
};

ChatdIntegration.prototype.requiresUpdate = function() {
    var self = this;

    if (window.location.toString().indexOf("/chat")) {
        $('.nw-fm-left-icon.cloud-drive').triggerHandler('click');
    }

    megaChat.destroy();
    megaChatIsDisabled = true;
    $('.nw-fm-left-icon.conversations').hide();

    // because msgDialog would be closed on location.hash change... we need to do this a bit later....
    Soon(function() {

        if (localStorage.chatUpdateIgnored === String(Chatd.VERSION)) {
            return;
        }
        if (!is_extension) {
            msgDialog('confirmation', l[1900], l[8840], '', function (e) {
                if (e) {
                    window.location.reload();
                }
                else {
                    localStorage.chatUpdateIgnored = Chatd.VERSION;
                }
            });
        }
        else {
            msgDialog(
                'warningb',
                l[1900],
                l[8841]
            );
            localStorage.chatUpdateIgnored = Chatd.VERSION;
        }
    });
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
                return chatRoom.protocolHandler ? true : false;
            }, 300, 5000).done(function() {
                cb();
            }).fail(function() {
                // debugger;
            });
        }
    }
};

ChatdIntegration.prototype.openChatFromApi = function(actionPacket, isMcf) {
    var self = this;

    var masterPromise = new MegaPromise();
    if (isMcf === false && ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
        // 'mcf'/'f' is still loading..ANY incoming action packets, should be rejected (and never happen...)
        return masterPromise.reject();
    }
    self._loadingCount++;

    var roomInfo = {
        'id': actionPacket.id,
        'cs': actionPacket.cs,
        'g': actionPacket.g,
        'u': clone(actionPacket.u),
        'ct': actionPacket.ct ? actionPacket.ct : null
    };

    if (isMcf === false) {
        if (typeof mSDB === 'object') {
            mSDB.add('mcf', roomInfo);
        }
    }
    loadingDialog.hide();

    if (actionPacket.active === 0) {
        // skip non active chats for now...
        return MegaPromise.reject();
    }
    var chatParticipants = actionPacket.u;
    if (!chatParticipants) {
        // its ok, no participants mean inactive chat, that we woudl skip...for now...
        return masterPromise.reject();
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
    var wasActive = chatRoom ? chatRoom.isCurrentlyActive : false;

    var finishProcess = function() {
        self._loadingCount--;

        // if the found chatRoom is in LEAVING mode...then try to reinitialise it!

        if (chatRoom && chatRoom.stateIsLeftOrLeaving() && actionPacket.ou !== u_handle) {
            self._cachedHandlers[roomJid] = chatRoom.protocolHandler;
            chatRoom.destroy(undefined, true);
            chatRoom = false;
            
            if (actionPacket.url) {
                Soon(finishProcess);
            }
            else {
                // retrieve mcurl!

                asyncApiReq({
                    a: 'mcurl',
                    id: actionPacket.id,
                    v: Chatd.VERSION
                })
                    .done(function(mcurl) {
                        actionPacket.url = mcurl;
                        finishProcess();
                    })
                    .fail(function(r) {
                        if (r === EEXPIRED) {
                            self.requiresUpdate();
                        }
                    });
            }
            return;
        }

        // try to find the chat room again, it may had been opened while waiting for the mcurl api call...
        chatRoom = self.megaChat.chats[roomJid];
        if (!chatRoom) {
            // don't try to open a chat, if its not yet opened and the actionPacket consist of me leaving...
            if (actionPacket.n) {
                var foundMeLeaving = actionPacket.n.some(function(userPrivChangeEntry) {
                    if (userPrivChangeEntry.p === -1 && userPrivChangeEntry.u === u_handle) {
                        return masterPromise.reject();
                    }
                });

                if (foundMeLeaving) {
                    if (typeof mSDB === 'object') {
                        mSDB.del('mcf', actionPacket.id);
                    }
                    return masterPromise.reject();
                }
            }

            var r = self.megaChat.openChat(
                chatJids,
                actionPacket.g === 1 ? "group" : "private",
                actionPacket.id,
                actionPacket.cs,
                actionPacket.url,
                false
            );
            chatRoom = r[1];
            if (actionPacket.ct) {
                chatRoom.ct = actionPacket.ct;
            }
            self.decryptTopic(chatRoom);
            // handler of the same room was cached before, then restore the keys.
            if (self._cachedHandlers[roomJid]) {
                chatRoom.protocolHandler.participantKeys = self._cachedHandlers[roomJid].participantKeys;
            }
            if (!isMcf && actionPacket.ou === u_handle && !actionPacket.n) {
                if (chatRoom.lastActivity === 0) {
                    chatRoom.lastActivity = unixtime();
                }
                loadSubPage(chatRoom.getRoomUrl());
            }

            if (wasActive) {
                loadSubPage(chatRoom.getRoomUrl());
            }
        }
        else {
            chatRoom.ct = actionPacket.ct;
            self.decryptTopic(chatRoom);

            if (!chatRoom.chatId) {
                chatRoom.chatId = actionPacket.id;
                chatRoom.chatShard = actionPacket.cs;
                chatRoom.chatdUrl = actionPacket.url;
            }
            else {
                // this is a member update!
                if (actionPacket.n) {
                    var included = [];
                    var excluded = [];
                    actionPacket.n.forEach(function(v) {
                        if (v.p === -1) {
                            excluded.push(v.u);
                            delete chatRoom.members[v.u];
                            if (v.u === u_handle) {
                                if (typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined') {
                                    Object.keys(chatRoom.members).forEach(function(user_handle) {
                                        // not a real contact?
                                        if (M.u[user_handle].c === 0) {
                                            chatRoom.megaChat.plugins.presencedIntegration.eventuallyRemovePeer(
                                                user_handle,
                                                chatRoom
                                            );
                                        }
                                    });
                                }
                                chatRoom.leave(false);
                                // i had left, also do a chatd.leave!
                                self.chatd.leave(
                                    base64urldecode(actionPacket.id)
                                );

                                if (isMcf === false) {
                                    if (typeof mSDB === 'object') {
                                        mSDB.del('mcf', roomInfo.id);
                                    }
                                }
                            }
                            else {
                                // someone else left the room
                                if (
                                    M.u[v.u].c === 0 &&
                                    typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined'
                                ) {
                                    chatRoom.megaChat.plugins.presencedIntegration.eventuallyRemovePeer(
                                        v.u,
                                        chatRoom
                                    );
                                }
                            }
                        }
                        else {
                            included.push(v.u);
                            chatRoom.members[v.u] = v.p;
                            if (v.u === u_handle && v.p !== 0) {
                                chatRoom.privateReadOnlyChat = false;
                            }
                            if (
                                M.u[v.u] &&
                                M.u[v.u].c === 0 &&
                                typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined'
                            ) {
                                chatRoom.megaChat.plugins.presencedIntegration.eventuallyAddPeer(
                                    v.u
                                );
                            }
                        }
                    });

                    if (included.length > 0 || excluded.length > 0) {
                        if (included.length > 0) {
                            ChatdIntegration._ensureKeysAreLoaded([], included);
                            ChatdIntegration._ensureNamesAreLoaded(included);
                            included.forEach(function(handle) {
                                if (M.u[handle] && M.u[handle].c === 0) {
                                    megaChat.processNewUser(handle);
                                }
                            });
                        }

                        chatRoom.trackDataChange();
                    }
                }
            }
        }
        return masterPromise.resolve();
    };

    if (!actionPacket.url && (!chatRoom || !chatRoom.chatdUrl)) {
        asyncApiReq({
            a: 'mcurl',
            id: actionPacket.id,
            v: Chatd.VERSION
        })
        .done(function(mcurl) {
                actionPacket.url = mcurl;
                finishProcess();
        })
        .fail(function(r) {
            if (r === EEXPIRED) {
                self.requiresUpdate();
            }
        });
    }
    else {
        finishProcess();
    }
    return masterPromise;

};


ChatdIntegration._waitUntilChatIdIsAvailable = function(fn) {
    return function() {
        var self = this;
        var chatRoom = arguments[0];
        var masterPromise = new MegaPromise();
        var args = arguments;

        ChatdIntegration.mcfHasFinishedPromise.done(function() {
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

    ChatdIntegration.mcfHasFinishedPromise.done(function() {
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
                        'p': 2
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
                'u': userHashes,
                'v': Chatd.VERSION
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

ChatdIntegration._ensureKeysAreDecrypted = function(keys, handler) {
    var pms = new MegaPromise();
    ChatdIntegration._ensureKeysAreLoaded(keys).done(
        function() {
            if (handler.seedKeys(keys)) {
                pms.resolve();
            }
            else {
                pms.reject();
            }
        }
    );
    return pms;
};

ChatdIntegration._ensureKeysAreLoaded = function(messages, users) {
    var promises = [];

    if (Array.isArray(messages)) {
        messages.forEach(function (msgObject) {
            if (typeof(msgObject.userId) === "undefined" || msgObject.userId === null) {
                return;
            }

            if (msgObject.userId === strongvelope.COMMANDER) {
                return;
            }

            if (!pubCu25519[msgObject.userId]) {
                promises.push(
                    crypt.getPubCu25519(msgObject.userId)
                );
            }

            if (!pubEd25519[msgObject.userId]) {
                promises.push(
                    crypt.getPubEd25519(msgObject.userId)
                );
            }

            if (!u_pubkeys[msgObject.userId]) {
                promises.push(
                    crypt.getPubRSA(msgObject.userId)
                );
            }
        });
    }
    if (Array.isArray(users)) {
        users.forEach(function (userId) {
            if (typeof(userId) === "undefined" || userId === null) {
                return;
            }

            if (userId === strongvelope.COMMANDER) {
                return;
            }

            if (!pubCu25519[userId]) {
                promises.push(
                    crypt.getPubCu25519(userId)
                );
            }

            if (!pubEd25519[userId]) {
                promises.push(
                    crypt.getPubEd25519(userId)
                );
            }

            if (!u_pubkeys[userId]) {
                promises.push(
                    crypt.getPubRSA(userId)
                );
            }
        });
    }
    return MegaPromise.allDone(promises);
};


ChatdIntegration._ensureNamesAreLoaded = function(users) {
    if (Array.isArray(users)) {
        users.forEach(function (userId) {
            if (userId === strongvelope.COMMANDER) {
                return;
            }

            if (!M.u[userId]) {
                M.u.set(
                    userId,
                    new MegaDataObject(MEGA_USER_STRUCT, true, {
                        'h': userId,
                        'u': userId,
                        'm': '',
                        'c': 0
                    })
                );
                M.syncUsersFullname(userId);
            }
            else {
                M.syncUsersFullname(userId);
            }
        });
    }
};


ChatdIntegration.prototype._parseMessage = function(chatRoom, message) {
    var textContents = message.getContents ? message.getContents() : message.textContents;

    if (textContents.substr && textContents.substr(0, 1) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
        if (textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
            try {
                var attachmentMeta = JSON.parse(textContents.substr(2));
            } catch(e) {
                // debugger;
                return null;
            }


            attachmentMeta.forEach(function(v) {
                var attachmentMetaInfo;
                // cache ALL current attachments, so that we can revoke them later on in an ordered way.
                if (message.messageId) {
                    if (!chatRoom.attachments.exists(v.h)) {
                        chatRoom.attachments.set(v.h, new MegaDataMap(chatRoom.attachments));
                    }

                    if (!chatRoom.attachments[v.h].exists(message.messageId)) {
                        chatRoom.attachments[v.h].set(
                            message.messageId,
                            attachmentMetaInfo = new MegaDataObject({
                                messageId: message.messageId,
                                revoked: false
                            })
                        );
                        attachmentMetaInfo._parent = chatRoom.attachments;
                    }
                    else {
                        attachmentMetaInfo = chatRoom.attachments[v.h][message.messageId];
                    }
                }

                // generate preview/icon
                var icon = fileIcon(v);

                if (!attachmentMetaInfo.revoked && !message.revoked) {
                    if (v.fa && (icon === "graphic" || icon === "image")) {
                        var imagesListKey = message.messageId + "_" + v.h;
                        if (!chatRoom.images.exists(imagesListKey)) {
                            v.id = imagesListKey;
                            v.delay = message.delay;
                            chatRoom.images.push(v);
                        }
                    }
                }
            });
        }
        else if (textContents.substr &&
            textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
            var foundRevokedNode = null;

            var revokedNode = textContents.substr(2, textContents.length);

            if (chatRoom.attachments.exists(revokedNode)) {
                chatRoom.attachments[revokedNode].forEach(function(obj) {
                    var messageId = obj.messageId;
                    var attachedMsg = chatRoom.messagesBuff.messages[messageId];

                    var allAttachmentsRevoked = false;
                    if (!attachedMsg) {
                        return;
                    }

                    if (attachedMsg.orderValue < message.orderValue) {
                        try {
                            var attc = attachedMsg.textContents;
                            var attachments = JSON.parse(attc.substr(2, attc.length));
                            var revokedInSameMessage = 0;
                            attachments.forEach(function(node) {
                                if (node.h === revokedNode) {
                                    foundRevokedNode = node;
                                }
                                if (
                                    chatRoom.attachments[node.h] &&
                                    chatRoom.attachments[node.h][messageId] &&
                                    (
                                        chatRoom.attachments[node.h][messageId].revoked === true ||
                                        node.h === revokedNode
                                    )
                                ) {
                                    revokedInSameMessage++;
                                }
                            });
                            if (revokedInSameMessage === attachments.length) {
                                allAttachmentsRevoked = true;
                            }
                        } catch(e) {
                        }

                        obj.revoked = true;
                        // mark the whole message as revoked if all attachments in it are marked as revoked.
                        if (allAttachmentsRevoked) {
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
                });
            }

            // don't show anything if this is a 'revoke' message
            return null;
        }
        else {
            return null;
        }
    }
};

ChatdIntegration.prototype._attachToChatRoom = function(chatRoom) {
    var self = this;

    var chatRoomId = chatRoom.roomJid.split("@")[0];

    chatRoom.rebind('typing.chatdInt', function() {
        self.broadcast(chatRoom, String.fromCharCode(1));
    });

    self.chatd.rebind('onBroadcast.chatdInt' + chatRoomId, function(e, eventData) {
        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomJid === chatRoom.roomJid) {
            foundChatRoom.trigger('onParticipantTyping', [eventData.userId, eventData.bCastCode]);
        }
    });

    self.chatd.rebind('onRoomConnected.chatdInt' + chatRoomId, function(e, eventData) {
        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomJid === chatRoom.roomJid) {
            if (chatRoom.state === ChatRoom.STATE.JOINING) {
                chatRoom.setState(
                    ChatRoom.STATE.READY
                );
            }
        }
    });

    self.chatd.rebind('onRoomDisconnected.chatdInt' + chatRoomId, function(e, eventData) {
        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomJid === chatRoom.roomJid) {
            delete chatRoom.chatId;
            delete chatRoom.chatShard;
            delete chatRoom.chatdUrl;
            
            if (chatRoom.state === ChatRoom.STATE.READY || chatRoom.state === ChatRoom.STATE.JOINED) {
                chatRoom.setState(
                    ChatRoom.STATE.JOINING,
                    true
                );
            }
        }
    });
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
                    function addParticipant() {
                        // add group participant in strongvelope
                        chatRoom.protocolHandler.addParticipant(eventData.userId);
                        // also add to our list
                        chatRoom.members[eventData.userId] = eventData.priv;

                        if (
                            M.u[eventData.userId] &&
                            M.u[eventData.userId].c === 0 &&
                            typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined'
                        ) {
                            chatRoom.megaChat.plugins.presencedIntegration.eventuallyAddPeer(
                                eventData.userId
                            );
                        }
                        $(chatRoom).trigger('onMembersUpdated');
                    }
                    self.waitForProtocolHandler(chatRoom, addParticipant);
                }

                if (eventData.userId === u_handle) {
                    chatRoom.membersLoaded = true;
                }
            }
            else if (eventData.priv === 255) {
                function deleteParticipant() {
                    // remove group participant in strongvelope
                    chatRoom.protocolHandler.removeParticipant(eventData.userId);
                    // also remove from our list
                    delete chatRoom.members[eventData.userId];

                    if (
                        M.u[eventData.userId].c === 0 &&
                        typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined'
                    ) {
                        chatRoom.megaChat.plugins.presencedIntegration.eventuallyRemovePeer(
                            eventData.userId,
                            chatRoom
                        );
                    }

                    $(chatRoom).trigger('onMembersUpdated');
                }
                self.waitForProtocolHandler(chatRoom, deleteParticipant);
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
            chatRoom.messagesBuff.messages.forEach(function(v, k) {

                if (v.userId && !v.requiresManualRetry) {
                    var msg = v.getContents ? v.getContents() : v.message;

                    chatRoom.notDecryptedBuffer[k] = {
                        'message': msg,
                        'userId': v.userId,
                        'keyid': v.keyid,
                        'ts': v.delay,
                        'k': k
                    };
                }
            });

            var hist = [];
            var invitors = [];
            Object.keys(chatRoom.notDecryptedBuffer).forEach(function(k) {
                var v = chatRoom.notDecryptedBuffer[k];

                if (v) {
                    hist.push(v);
                }
                if (v.userId === strongvelope.COMMANDER) {
                    var parsedMessage = strongvelope._parseMessageContent(v.message);
                    if (parsedMessage) {
                        invitors.push(parsedMessage.invitor);
                    }
                }
            });

            if (hist.length > 0) {
                var decryptMessages = function() {
                    try {
                        // .seed result is not used in here, since it returns false, even when some messages can be
                        // decrypted which in the current case (of tons of cached non encrypted txt msgs in chatd) is
                        // bad
                        chatRoom.protocolHandler.seed(hist);
                        var decryptedMsgs = chatRoom.protocolHandler.batchDecrypt(hist, true);
                        for (var i = decryptedMsgs.length-1; i >= 0; i--) {
                            var v = decryptedMsgs[i];
                            var messageId = hist[i]['k'];
                            if (v) {

                                if (v.type === strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP) {
                                    if (typeof(v.payload) === 'undefined' || v.payload === null) {
                                        v.payload = "";
                                    }
                                    chatRoom.messagesBuff.messages[messageId].textContents = v.payload;
                                    if (v.identity && v.references) {
                                        var mb = chatRoom.messagesBuff;
                                        mb.messages[messageId].references = v.references;
                                        mb.messages[messageId].msgIdentity = v.identity;
                                        mb.messageOrders[v.identity] = mb.messages[messageId].orderValue;
                                        if (mb.verifyMessageOrder(v.identity, v.references) === false) {
                                            // potential message order tampering detected.
                                            self.logger.critical("message order tampering detected: ", messageId);
                                        }
                                    }
                                }
                                else if (v.type === strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS) {
                                    if (chatRoom.messagesBuff.messages[messageId]) {
                                        chatRoom.messagesBuff.messages[messageId].meta = {
                                            userId: v.sender,
                                            included: v.includeParticipants,
                                            excluded: v.excludeParticipants
                                        };
                                        ChatdIntegration._ensureNamesAreLoaded(v.excludeParticipants);
                                        ChatdIntegration._ensureNamesAreLoaded(v.includeParticipants);
                                        chatRoom.messagesBuff.messages[messageId].dialogType = "alterParticipants";
                                    }
                                }
                                else if (v.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                                    chatRoom.messagesBuff.messages[messageId].dialogType = 'truncated';
                                    chatRoom.messagesBuff.messages[messageId].userId = v.sender;
                                }
                                else if (v.type === strongvelope.MESSAGE_TYPES.PRIVILEGE_CHANGE) {
                                    chatRoom.messagesBuff.messages[messageId].meta = {
                                        userId: v.sender,
                                        privilege: v.privilege.charCodeAt(0),
                                        targetUserId: v.recipients
                                    };
                                    chatRoom.messagesBuff.messages[messageId].dialogType = "privilegeChange";
                                }
                                else if (v.type === strongvelope.MESSAGE_TYPES.TOPIC_CHANGE){
                                    chatRoom.messagesBuff.messages[messageId].meta = {
                                        userId: v.sender,
                                        topic: v.payload
                                    };
                                    chatRoom.messagesBuff.messages[messageId].dialogType = "topicChange";
                                }
                                else if (v.type === strongvelope.MESSAGE_TYPES.GROUP_KEYED) {
                                    // this is a system message
                                    chatRoom.messagesBuff.messages[messageId].protocol = true;
                                }
                                else {
                                    self.logger.error("Could not decrypt: ", v);
                                }
                                self._parseMessage(chatRoom, chatRoom.messagesBuff.messages[messageId]);
                                delete chatRoom.notDecryptedBuffer[messageId];
                            }
                            else {
                                delete chatRoom.notDecryptedBuffer[messageId];
                            }
                        };
                    } catch (e) {
                        self.logger.error("Failed to decrypt stuff via strongvelope, uncaught exception: ", e);
                    }
                };


                if (!chatRoom.protocolHandler) {
                    if (chatRoom.strongvelopeSetupPromises) {
                        chatRoom.strongvelopeSetupPromises.done(function() {
                            ChatdIntegration._ensureKeysAreLoaded(hist, invitors)
                                .always(decryptMessages);
                        });
                    }
                }
                else {
                    ChatdIntegration._ensureKeysAreLoaded(hist, invitors)
                        .always(decryptMessages);
                }

            }
        });

        $(chatRoom).rebind('onLeaveChatRequested.chatdInt', function(e) {
            asyncApiReq({
                "a":"mcr", // request identifier
                "id": chatRoom.chatId, // chat id
                "v": Chatd.VERSION
            });
        });
        $(chatRoom).rebind('onAddUserRequest.chatdInt', function(e, contactHashes) {
            contactHashes.forEach(function(h) {
                if (chatRoom.topic) {
                    var participants = chatRoom.protocolHandler.getTrackedParticipants();
                    participants.add(h);

                    var promises = [];
                    promises.push(
                        ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
                    );
                    var _runInvitedWithTopic = function() {
                        var topic = chatRoom.protocolHandler.embeddedEncryptTo(chatRoom.topic,
                                                                               strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                                                                               participants);
                        if (topic) {
                            asyncApiReq({
                                "a":"mci",
                                "id":chatRoom.chatId,
                                "u": h,
                                "p": 2,
                                "ct":base64urlencode(topic),
                                "v": Chatd.VERSION
                            });
                        }
                    };
                    MegaPromise.allDone(promises).done(
                        function () {
                            _runInvitedWithTopic();
                        }
                    );
                }
                else {
                    asyncApiReq({
                        "a":"mci",
                        "id": chatRoom.chatId,
                        "u": h,
                        "p": 2,
                        "v": Chatd.VERSION
                    });
                }
            });
        });

        $(chatRoom).rebind('onRemoveUserRequest.chatdInt', function(e, contactHash) {
            asyncApiReq({
                "a":"mcr",
                "id": chatRoom.chatId,
                "u": contactHash,
                "v": Chatd.VERSION
            });
        });
        $(chatRoom).rebind('alterUserPrivilege.chatdInt', function(e, contactHash, newPriv) {
            asyncApiReq({
                "a":"mcup",
                "id": chatRoom.chatId,
                "u": contactHash,
                "p": newPriv,
                "v": Chatd.VERSION
            });
        });

        $(chatRoom).rebind('onTopicChange.chatdInt', function(e, contactHash, topic) {
            asyncApiReq({
                "a":"mcst",
                "id":chatRoom.chatId,
                "ct":btoa(topic),
                "v": Chatd.VERSION
            });
        });

        $(chatRoom.messagesBuff).rebind('onNewMessageReceived.chatdStrongvelope', function(e, msgObject) {
            if (msgObject.message && msgObject.message.length && msgObject.message.length > 0) {
                var _runDecryption = function() {
                    try {

                        var decrypted = chatRoom.protocolHandler.decryptFrom(
                            msgObject.message,
                            msgObject.userId,
                            msgObject.keyid,
                            false
                        );
                        if (decrypted) {
                            if (decrypted.type === strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP) {
                                if (typeof(decrypted.payload) === 'undefined' || decrypted.payload === null) {
                                    decrypted.payload = "";
                                }
                                chatRoom.messagesBuff.messages[msgObject.messageId].textContents = decrypted.payload;
                                if (decrypted.identity && decrypted.references) {
                                    var mb = chatRoom.messagesBuff;
                                    mb.messages[msgObject.messageId].references = decrypted.references;
                                    mb.messages[msgObject.messageId].msgIdentity = decrypted.identity;
                                    mb.messageOrders[decrypted.identity] = msgObject.orderValue;
                                    if (mb.verifyMessageOrder(decrypted.identity, decrypted.references) === false) {
                                        // potential message order tampering detected.
                                        var l = self.logger;
                                        l.critical("message order tampering detected: ", msgObject.messageId);
                                    }
                                }
                            } else if (decrypted.type === strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS) {
                                chatRoom.messagesBuff.messages[msgObject.messageId].meta = {
                                    userId: decrypted.sender,
                                    included: decrypted.includeParticipants,
                                    excluded: decrypted.excludeParticipants
                                };
                                chatRoom.messagesBuff.messages[msgObject.messageId].dialogType = "alterParticipants";
                            } else if (decrypted.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
                                var msg = chatRoom.messagesBuff.messages[msgObject.messageId];
                                msg.dialogType = 'truncated';
                                msg.userId = decrypted.sender;
                            }
                            else if (decrypted.type === strongvelope.MESSAGE_TYPES.PRIVILEGE_CHANGE) {
                                var msg = chatRoom.messagesBuff.messages[msgObject.messageId];
                                msg.meta = {
                                    userId: decrypted.sender,
                                    privilege: decrypted.privilege.charCodeAt(0),
                                    targetUserId: decrypted.recipients
                                };
                                msg.dialogType = "privilegeChange";

                            }
                            else if (decrypted.type === strongvelope.MESSAGE_TYPES.TOPIC_CHANGE){
                                chatRoom.messagesBuff.messages[msgObject.messageId].meta = {
                                    userId: decrypted.sender,
                                    topic: decrypted.payload
                                };
                                chatRoom.messagesBuff.messages[msgObject.messageId].dialogType = "topicChange";
                            }
                            else if (decrypted.type === strongvelope.MESSAGE_TYPES.GROUP_KEYED){
                                chatRoom.messagesBuff.messages[msgObject.messageId].protocol = true;
                            }
                            self._parseMessage(chatRoom, chatRoom.messagesBuff.messages[msgObject.messageId]);
                        } else {
                            self.logger.error('Unknown message type!');
                        }
                    } catch(e) {
                        self.logger.error("Failed to decrypt stuff via strongvelope, uncaught exception: ", e);
                    }
                };

                var promises = [];
                promises.push(
                    ChatdIntegration._ensureKeysAreLoaded([msgObject])
                );
                var pendingkeys = [];
                var msgkeycacheid = msgObject.userId  + "-" + msgObject.keyid;
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

                chatRoom.protocolHandler = new strongvelope.ProtocolHandler(
                    u_handle,
                    u_privCu25519,
                    u_privEd25519,
                    u_pubEd25519
                );

                chatRoom.protocolHandler.chatRoom = chatRoom;
                self.decryptTopic(chatRoom);
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

ChatdIntegration.prototype.decryptTopic = function(chatRoom) {
    var self = this;
    if (chatRoom && chatRoom.ct && chatRoom.protocolHandler) {
        var parsedMessage = strongvelope._parseMessageContent(base64urldecode(chatRoom.ct));
        if (parsedMessage) {
            var promises = [];
            promises.push(
                ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedMessage.invitor])
            );
            var _runTopicDecryption = function() {
                try {
                    var decryptedCT = chatRoom.protocolHandler.decryptFrom(base64urldecode(chatRoom.ct));
                    if (decryptedCT) {
                        chatRoom.topic = decryptedCT.payload;
                    }
                } catch (e) {
                    self.logger.error("Could not decrypt topic: ", e);
                }
            };
            MegaPromise.allDone(promises).done(
                function () {
                    _runTopicDecryption();
                }
            );
        }
    }
};

/** chatd related commands **/

ChatdIntegration.prototype.join = function(chatRoom) {
    var self = this;

    assert(
        chatRoom.chatId && chatRoom.chatShard !== undefined && chatRoom.chatdUrl,
        'missing chatId, chatShard or chadUrl in megaRoom. halting chatd join and code execution.'
    );

    self.chatIdToRoomJid[chatRoom.chatId] = chatRoom.roomJid;
    
    self.chatd.join(
        base64urldecode(chatRoom.chatId),
        chatRoom.chatShard,
        chatRoom.chatdUrl
            .replace("ws:", "wss:")
            .replace("https:", "wss:")
            .replace("31.216.147.155", "chattest.userstorage.mega.co.nz")
    );

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
    if (!chatRoom.stateIsLeftOrLeaving()) {
        self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
    }
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(Chatd.Opcode.RETENTION, base64urldecode(chatRoom.chatId), Chatd.Const.UNDEFINED + pack32le(time));
};

ChatdIntegration.prototype.sendNewKey = function(chatRoom, keyxid, keyBlob) {
    var self = this;
    var keylen = keyBlob.length;
    var keybody = self.chatd.pack32le(keyxid) + self.chatd.pack32le(keylen) + keyBlob;
    self.chatd.cmd(Chatd.Opcode.NEWKEY, base64urldecode(chatRoom.chatId), keybody);
};

ChatdIntegration.prototype.sendMessage = function(chatRoom, messageObject) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;

    var messageContents = messageObject.getContents() ? messageObject.getContents() : "";
    var tmpPromise = new MegaPromise();

    var promises = [];
    var participants = chatRoom.getParticipantsExceptMe();
    if (participants.length === 0 && chatRoom.type === "private") {
        return;
    }
    else {
        participants.forEach(function(v, k) {
            participants[k] = megaChat.getNodeIdFromJid(v);
        });
    }

    promises.push(
        ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
    );

    var refs = self.chatd.msgreferencelist(base64urldecode(chatRoom.chatId));
    var refids = [];
    for (var i = 0; i < refs.length; i++) {
        var foundMessage = chatRoom.messagesBuff.getByInternalId(refs[i]);
        if (foundMessage) {
            if (foundMessage.msgIdentity) {
                refids.push(foundMessage.msgIdentity);
            }
        } else if (chatRoom.messagesBuff.messages[refs[i]]) {
            if (chatRoom.messagesBuff.messages[refs[i]].msgIdentity) {
                refids.push(chatRoom.messagesBuff.messages[refs[i]].msgIdentity);
            }
        }
    }

    var _runEncryption = function() {

        try {
            var result = chatRoom.protocolHandler.encryptTo(messageContents, refids);
            if (result !== false) {
                var keyid = chatRoom.protocolHandler.getKeyId();

                messageObject.encryptedMessageContents = [result, keyid];
                messageObject.msgIdentity = result[result.length - 1].identity;
                messageObject.references = refids;

                tmpPromise.resolve(
                    self.chatd.submit(base64urldecode(chatRoom.chatId), result, keyid)
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

ChatdIntegration.prototype.updateMessage = function(chatRoom, msgnum, newMessage) {
    // a msgupd is only possible up to 1hour after the indicated (client-supplied) UTC timestamp.
    var cipher;

    var self = this;
    var rawChatId = base64urldecode(chatRoom.chatId);

    var chatMessages = self.chatd.chatIdMessages[rawChatId];
    if (!chatMessages) {
        return;
    }

    var msg = chatMessages.buf[msgnum];
    var foundMsg;
    if (!msg) {
        msg = chatMessages.sendingbuf[msgnum & 0xffffffff];
        if (!msg) {
            console.error("Update message failed, msgNum  was not found in either .buf or .sendingbuf", msgnum);
            return false;
        }
        else {
            foundMsg = chatRoom.messagesBuff.getByInternalId(msgnum);
            msgnum = msgnum & 0xffffffff;
        }
    }
    else {
        var msgId = base64urlencode(msg[Chatd.MsgField.MSGID]);
        foundMsg =  chatRoom.messagesBuff.messages[msgId];
    }
    var keyId = msg[Chatd.MsgField.KEYID];

    if (!foundMsg) {
        console.error("Update message failed, because message  was not found", msgnum);
        return false;
    }
    cipher = chatRoom.protocolHandler.encryptWithKeyId(newMessage, keyId, foundMsg.references, foundMsg.msgIdentity);

    return self.chatd.modify(rawChatId, msgnum, cipher);
};

ChatdIntegration.prototype.deleteMessage = function(chatRoom, msgnum) {
    // a msgupd is only possible up to 1hour after the indicated (client-supplied) UTC timestamp.
    var self = this;

    return self.updateMessage(chatRoom, msgnum, "");
};


/**
 * Discard a message from the sending queue
 *
 * @param chatRoom
 * @param msgId
 */
ChatdIntegration.prototype.discardMessage = function(chatRoom, msgId) {
    var self = this;
    var rawChatId = base64urldecode(chatRoom.chatId);
    var chatMessages = self.chatd.chatIdMessages[rawChatId];
    if (!chatMessages) {
        return;
    }

    msgId = base64urldecode(msgId);

    if (msgId.length === 0) {
        // debugger;
    }
    return self.chatd.discard(msgId, rawChatId);
};



ChatdIntegration.prototype.broadcast = function(chatRoom, broadCastCode) {
    var self = this;
    var rawChatId = base64urldecode(chatRoom.chatId);
    var chatMessages = self.chatd.chatIdMessages[rawChatId];
    return self.chatd.broadcast(rawChatId, broadCastCode);
};


ChatdIntegration.prototype.isLoading = function() {
    return this._loadingCount > 0;
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
