(function(scope) {
"use strict";

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
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.WARN;
            }
        },
        megaChat.logger
    );

    self.megaChat = megaChat;
    self.chatd = new Chatd(u_handle, megaChat);
    self.waitingChatIdPromises = {};
    self.chatIdToRoomId = {};
    self._cachedHandlers = {};
    self._loadingCount = 0;

    // chat events
    megaChat.rebind("onInit.chatdInt", function(e) {
        megaChat.rebind("onRoomInitialized.chatdInt", function(e, chatRoom) {
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
                    var ap = ChatdIntegration._queuedChats[id];

                    var promise = self.openChatFromApi(ap, true);

                    var chatId = false;

                    if (ap.g === 0) {
                        // extract the chatId, if the type of the chat is private (e.g. == other user's id)
                        (ap.n || ap.u).forEach(function(member) {
                            if (!chatId && member.u !== u_handle) {
                                chatId = member.u;
                            }
                        });
                    }
                    else {
                        chatId = ap.id;
                    }

                    if (chatId && !ChatdIntegration._loadingChats[chatId]) {
                        ChatdIntegration._loadingChats[chatId] = {
                            'loadingPromise': promise,
                            'ap': ap
                        };

                        ChatdIntegration._loadingChats[chatId].loadingPromise.always(function() {
                            // since any .done may want to see if the chat was "just loaded"
                            // I'm delaying the cleanup of the _loadingChats cache
                            Soon(function() {
                                delete ChatdIntegration._loadingChats[chatId];
                            });
                        });
                    }

                    allPromises.push(
                        promise
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

    mBroadcaster.addListener('onChatdChatUpdatedActionPacket', function(actionPacket) {
        self.openChatFromApi(actionPacket, false, false);
    });


    self.chatd.rebind('onClose.chatdInt', function(e, eventData) {
        var shard = eventData.shard;

        shard.getRelatedChatIds().forEach(function(chatId) {
            var chatRoomJid = self.chatIdToRoomId[chatId];
            if (chatRoomJid) {
                var chatRoom = self.megaChat.chats[chatRoomJid];
                if (chatRoom) {
                    if (chatRoom.state !== ChatRoom.STATE.LEFT) {
                        chatRoom.membersLoaded = false;
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
                megaChat._chatsAwaitingAps[r.id] = true;
            })
            .fail(function() {
                self.logger.error(
                    "Failed to retrieve chatd ID from API, while trying to create a new room, args:",
                    arguments
                );
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

ChatdIntegration._loadingChats = {};

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
                        self.openChatFromApi(actionPacket, true, true)
                    );
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
    var chatRoomId = self.chatIdToRoomId[eventData.chatId];
    assert(chatRoomId, 'chat room not found for chat id: ' + eventData.chatId);
    return self.megaChat.chats[chatRoomId] || self.megaChat.getChatById(eventData.chatId);
};

ChatdIntegration.prototype._getKarereObjFromChatdObj = function(chatdEventObj) {
    var self = this;
    var chatRoom = self._getChatRoomFromEventData(chatdEventObj);

    var msgContents;

    msgContents = chatdEventObj.message;

    var state;

    if (!chatdEventObj.userId || chatdEventObj.userId === u_handle) {
        state = Message.STATE.SENT;
    }
    else if (chatdEventObj.seen) {
        state = Message.STATE.SEEN;
    }

    return new Message(
        chatRoom,
        chatRoom.messagesBuff,
        {

            'userId': chatdEventObj.userId,
            'messageId': chatdEventObj.messageId,
            'message': false,
            'textContents': msgContents,
            'delay': chatdEventObj.ts,
            'state': state,
            'updated': false,
            'deleted': false,
            'revoked': false
        }
    );
};

ChatdIntegration._waitForProtocolHandler = function (chatRoom, cb) {
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

ChatdIntegration.prototype.openChatFromApi = function(actionPacket, isMcf, missingMcf) {
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
        'ct': actionPacket.ct ? actionPacket.ct : null,
        'f': actionPacket.f
    };

    // is isMcf and triggered by a missingMcf in the 'f' treecache, trigger an immediate store in the fmdb
    if (isMcf && missingMcf && fmdb) {
        if (actionPacket.id && actionPacket.cs !== undefined) {
            var roomInfo = {
                'id': actionPacket.id,
                'cs': actionPacket.cs,
                'g' : actionPacket.g,
                'u' : actionPacket.u,
                'ts': actionPacket.ts,
                'ct': actionPacket.ct,
                'f' : actionPacket.f
            };
            fmdb.add('mcf', {id: roomInfo.id, d: roomInfo});
        }
    }

    loadingDialog.hide();

    if (actionPacket.active === 0) {
        // skip non active chats for now...
        return MegaPromise.reject();
    }
    var chatParticipants = actionPacket.u;
    if (!chatParticipants && (!actionPacket.f || !(actionPacket.f & ChatRoom.ARCHIVED))) {
        // its ok, no participants mean inactive chat, that we woudl skip if it is not archived.
        return masterPromise.reject();
    }
    var userHandles = [];
    if (chatParticipants) {
        Object.keys(chatParticipants).forEach(function(k) {
            var v = chatParticipants[k];
            if (v.u) {
                userHandles.push(v.u);
            }
        });
    }
    var chatId = actionPacket.id;

    var chatRoom = self.megaChat.getChatById(chatId);
    var wasActive = chatRoom ? chatRoom.isCurrentlyActive : false;

    var finishProcess = function() {
        self._loadingCount--;

        // if the found chatRoom is in LEAVING mode...then try to reinitialise it!

        if (chatRoom && chatRoom.stateIsLeftOrLeaving() && actionPacket.ou !== u_handle) {
            self._cachedHandlers[chatId] = chatRoom.protocolHandler;

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
        chatRoom = self.megaChat.getChatById(chatId);
        if (!chatRoom) {
            // don't try to open a chat, if its not yet opened and the actionPacket consist of me leaving...
            if (actionPacket.n) {
                var foundMeLeaving = actionPacket.n.some(function(userPrivChangeEntry) {
                    if (userPrivChangeEntry.p === -1 && userPrivChangeEntry.u === u_handle) {
                        return masterPromise.reject();
                    }
                });

                if (foundMeLeaving) {
                    return masterPromise.reject();
                }
            }

            var setAsActive = megaChat._chatsAwaitingAps[actionPacket.id] === true;
            delete megaChat._chatsAwaitingAps[actionPacket.id];

            var r = self.megaChat.openChat(
                userHandles,
                actionPacket.g === 1 ? "group" : "private",
                actionPacket.id,
                actionPacket.cs,
                actionPacket.url,
                setAsActive
            );
            chatRoom = r[1];
            if (!chatRoom) {
                return masterPromise.reject();
            }

            if (actionPacket.ct) {
                chatRoom.ct = actionPacket.ct;
            }
            if (typeof actionPacket.f !== 'undefined') {
                chatRoom.flags = actionPacket.f;
            }
            // apply the flags if any received during loading.
            if (loadfm.chatmcfc && typeof loadfm.chatmcfc[actionPacket.id] !== 'undefined') {
                chatRoom.updateFlags(loadfm.chatmcfc[actionPacket.id]);
                delete loadfm.chatmcfc[actionPacket.id];
            }

            self.decryptTopic(chatRoom);
            // handler of the same room was cached before, then restore the keys.
            if (self._cachedHandlers[chatId] && chatRoom.protocolHandler) {
                chatRoom.protocolHandler.participantKeys = self._cachedHandlers[chatId].participantKeys;
            }
            if (!isMcf && actionPacket.ou === u_handle && !actionPacket.n) {
                if (chatRoom.lastActivity === 0) {
                    chatRoom.lastActivity = unixtime();
                }

                if (chatRoom.showAfterCreation) {
                    loadSubPage(chatRoom.getRoomUrl());
                }

                delete chatRoom.showAfterCreation;
            }
            if (!chatRoom.lastActivity && actionPacket.ts) {
                chatRoom.lastActivity = actionPacket.ts;
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
                chatRoom.chatIdBin = base64urldecode(actionPacket.id);
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
                                        if (!M.u[user_handle].c) {
                                            chatRoom.megaChat.plugins.presencedIntegration.eventuallyRemovePeer(
                                                user_handle,
                                                chatRoom
                                            );
                                        }
                                        delete chatRoom.members[user_handle];
                                    });
                                }
                                chatRoom.leave(false);

                                if (actionPacket.ou === u_handle) {
                                    chatRoom.destroy();
                                }

                                // i had left, also do a chatd.leave!
                                self.chatd.leave(
                                    base64urldecode(actionPacket.id)
                                );
                            }
                            else {
                                // someone else left the room
                                if (
                                    !M.u[v.u].c &&
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
                                !M.u[v.u].c &&
                                typeof(chatRoom.megaChat.plugins.presencedIntegration) !== 'undefined'
                            ) {
                                chatRoom.megaChat.plugins.presencedIntegration.eventuallyAddPeer(
                                    v.u,
                                    undefined
                                );
                            }
                        }
                    });

                    if (included.length > 0 || excluded.length > 0) {
                        if (included.length > 0) {
                            ChatdIntegration._ensureKeysAreLoaded([], included);
                            ChatdIntegration._ensureNamesAreLoaded(included);
                            included.forEach(function(handle) {
                                if (M.u[handle] && !M.u[handle].c) {
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
                                self.logger.error("Failed to retrieve chatId for chatRoom: ", chatRoom.roomId);
                                masterPromise.reject(arguments);
                            });
                    }
                })
                .fail(function() {
                    self.logger.error("[2] Failed to retrieve chatId for chatRoom: ", chatRoom.roomId);
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
                self.waitingChatIdPromises[chatRoom.roomId] &&
                self.waitingChatIdPromises[chatRoom.roomId].state() === 'pending'
            ) {
                masterPromise.linkDoneAndFailTo(
                    self.waitingChatIdPromises[chatRoom.roomId]
                );
                return masterPromise;
            }

            var userHashes = [];
            chatRoom.getParticipantsExceptMe().forEach(function(userHandle) {
                var contact = M.u[userHandle];

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
            self.waitingChatIdPromises[chatRoom.roomId] = asyncApiReq({
                'a': 'mcc',
                'g': chatRoom.type === "group" ? 1 : 0,
                'u': userHashes,
                'v': Chatd.VERSION
            })
                .always(function() {
                    delete self.waitingChatIdPromises[chatRoom.roomId];
                })
                .done(function(r) {
                    chatRoom.chatdUrl = r.url;
                    chatRoom.chatId = r.id;
                    chatRoom.chatIdBin = base64urldecode(r.id);
                    chatRoom.chatShard = r.cs;

                    self.join(chatRoom);
                })
                .fail(function() {
                    self.logger.error("Failed to retrieve chatd ID from API for room: ", chatRoom.roomId);
                });

            return masterPromise.linkDoneAndFailTo(
                self.waitingChatIdPromises[chatRoom.roomId]
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
                        'c': undefined
                    })
                );
                M.syncUsersFullname(userId);
                M.syncContactEmail(userId);
            }
            else {
                M.syncUsersFullname(userId);
                if (!M.u[userId].m) {
                    M.syncContactEmail(userId);
                }
            }
        });
    }
};

ChatdIntegration.prototype._parseMessage = function(chatRoom, message) {
    var textContents = message.textContents || message.message || false;

    // reset any flags for what was processed in this message, since it just changed (was edited, or
    // decrypted).
    message.processedBy = {};
    message.messageHtml = htmlentities(message.textContents).replace(/\n/gi, "<br/>");
    message.decrypted = true;

    if (!textContents || textContents === "") {
        message.deleted = true;
        message.trackDataChange();
    }
    else if (textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
        if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {

            message._onAttachmentReceived(textContents.substr(2));
        }
        else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
            var revokedNode = textContents.substr(2, textContents.length);

            message._onAttachmentRevoked(revokedNode);

            // don't show anything if this is a 'revoke' message
            return null;
        }
        else if (
            textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META
        ) {

            var meta = textContents.substr(3, textContents.length);
            try {
                meta = JSON.parse(meta);
                var origTextContents = textContents;
                textContents = meta.textMessage;
                message.textContents = textContents;
                message.messageHtml = htmlentities(message.textContents).replace(/\n/gi, "<br/>");
                delete meta.textMessage;
                if (origTextContents[2] === Message.MESSAGE_META_TYPE.RICH_PREVIEW) {
                    message.metaType = Message.MESSAGE_META_TYPE.RICH_PREVIEW;
                }
                else {
                    message.metaType = -1;
                }

                message.meta = meta;
            }
            catch (e) {
                message.textContents = "";
                this.logger.warn("Failed to parse META message:", message);
            }
            message.trackDataChange();

        }
        else {
            return null;
        }
    }
    else if (message.dialogType === "remoteCallEnded") {
        message.wrappedChatDialogMessage = chatRoom.megaChat.plugins.callManager.remoteEndCallToDialogMsg(
            chatRoom,
            message
        );
    }
    else if (message.dialogType === "remoteCallStarted") {
        message.wrappedChatDialogMessage = chatRoom.megaChat.plugins.callManager.remoteStartedCallToDialogMsg(
            chatRoom,
            message
        );
    }
};

ChatdIntegration.prototype._attachToChatRoom = function(chatRoom) {
    var self = this;

    var chatRoomId = chatRoom.roomId;

    chatRoom.rebind('typing.chatdInt', function() {
        self.broadcast(chatRoom, String.fromCharCode(1));
    });
    chatRoom.rebind('stoppedTyping.chatdInt', function() {
        self.broadcast(chatRoom, String.fromCharCode(2));
    });

    self.chatd.rebind('onBroadcast.chatdInt' + chatRoomId, function(e, eventData) {
        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomId === chatRoom.roomId) {
            foundChatRoom.trigger('onParticipantTyping', [eventData.userId, eventData.bCastCode]);
        }
    });

    self.chatd.rebind('onRoomDisconnected.chatdInt' + chatRoomId, function(e, eventData) {
        if (self.megaChat.isLoggingOut) {
            return;
        }

        var foundChatRoom = self._getChatRoomFromEventData(eventData);

        if (!foundChatRoom) {
            self.logger.warn("Room not found for: ", e, eventData);
            return;
        }

        if (foundChatRoom.roomId === chatRoom.roomId) {
            chatRoom.chatdUrl = null;
            if (chatRoom.messagesBuff) {
                chatRoom.messagesBuff.sendingListFlushed = false;
            }
            if (chatRoom.state === ChatRoom.STATE.READY || chatRoom.state === ChatRoom.STATE.JOINED) {
                chatRoom.membersLoaded = false;
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

        if (foundChatRoom.roomId === chatRoom.roomId) {
            if (
                chatRoom.state === ChatRoom.STATE.LEFT &&
                eventData.priv >= 0 && eventData.priv < 255
            ) {
                // joining
                chatRoom.membersLoaded = false;
                chatRoom.setState(ChatRoom.STATE.JOINING, true);
            }

            var queuedMembersUpdatedEvent = false;

            if (chatRoom.membersLoaded === false) {
                if (eventData.priv < 255) {
                    var addParticipant = function addParticipant() {
                        // add group participant in strongvelope
                        chatRoom.protocolHandler.addParticipant(eventData.userId);
                        // also add to our list
                        chatRoom.members[eventData.userId] = eventData.priv;

                        $(chatRoom).trigger('onMembersUpdated', eventData);
                    };

                    ChatdIntegration._waitForProtocolHandler(chatRoom, addParticipant);
                    queuedMembersUpdatedEvent = true;
                }

                if (eventData.userId === u_handle) {
                    chatRoom.membersLoaded = true;
                }
            }
            else if (eventData.priv === 255 || eventData.priv === -1) {
                var deleteParticipant = function deleteParticipant() {
                    if (eventData.userId === u_handle) {
                        // remove all participants from the room.
                        Object.keys(chatRoom.members).forEach(function(userId) {
                            // remove group participant in strongvelope
                            chatRoom.protocolHandler.removeParticipant(userId);
                            // also remove from our list
                            delete chatRoom.members[userId];
                        });
                    }
                    else {
                        // remove group participant in strongvelope
                        chatRoom.protocolHandler.removeParticipant(eventData.userId);
                        // also remove from our list
                        delete chatRoom.members[eventData.userId];
                    }

                    $(chatRoom).trigger('onMembersUpdated', eventData);
                };

                ChatdIntegration._waitForProtocolHandler(chatRoom, deleteParticipant);
                queuedMembersUpdatedEvent = true;
            }

            if (!queuedMembersUpdatedEvent) {
                chatRoom.members[eventData.userId] = eventData.priv;
                $(chatRoom).trigger('onMembersUpdated', eventData);
            }
        }
    });

    if (!chatRoom.messagesBuff) {
        chatRoom.pubCu25519KeyIsMissing = false;

        var waitingForPromises = [];

        // retrieve all other user's Cu25519 keys IF needed
        chatRoom.getParticipants().forEach(function(userHandle) {
            var contactHash = userHandle;
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
            var containerBatchFromHist;
            var containerMessages;
            var isSharedFileMessage = false;

            if (chatRoom.messagesBuff.isRetrievingSharedFiles) {
                containerBatchFromHist = chatRoom.messagesBuff.sharedFilesBatchFromHistory;
                containerMessages = chatRoom.messagesBuff.sharedFiles;
                isSharedFileMessage = true;
            }
            else {
                containerBatchFromHist = chatRoom.messagesBuff.messagesBatchFromHistory;
                containerMessages = chatRoom.messagesBuff.messages;
            }

            containerBatchFromHist.forEach(function(v, k) {
                if (v.userId && !v.requiresManualRetry) {
                    if (!v.textContents && v.message && !v.deleted) {
                        var msg = v.message;

                        chatRoom.notDecryptedBuffer[k] = {
                            'message': msg,
                            'userId': v.userId,
                            'keyid': v.keyid,
                            'ts': v.delay,
                            'k': k
                        };
                    }
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
                var _decryptSuccessCb = function(decryptedMsgs) {
                    for (var i = decryptedMsgs.length - 1; i >= 0; i--) {
                        var v = decryptedMsgs[i];
                        if (!v) {
                            // message failed to decrypt and decryption returned undefined.
                            continue;
                        }
                        var failedToDecrypt = false;
                        var messageId = hist[i]['k'];

                        var msgInstance = containerBatchFromHist[messageId] || containerMessages[messageId];

                        var succeeded = self._processDecryptedMessage(chatRoom, msgInstance, v, isSharedFileMessage);
                        if (!succeeded) {
                            failedToDecrypt = true;
                            self.logger.error("Could not decrypt: ", v, msgInstance);
                        }

                        delete chatRoom.notDecryptedBuffer[messageId];

                        if (!failedToDecrypt) {
                            self._parseMessage(chatRoom, msgInstance);
                            containerMessages.push(msgInstance);
                            containerBatchFromHist.remove(messageId);
                        }
                    }

                    chatRoom.trigger('onHistoryDecrypted');
                };

                var decryptMessages = function() {
                    try {
                        // .seed result is not used in here, since it returns false, even when some messages can be
                        // decrypted which in the current case (of tons of cached non encrypted txt msgs in chatd) is
                        // bad
                        chatRoom.protocolHandler.seed(hist).always(function() {
                            chatRoom.protocolHandler.batchDecrypt(hist, true)
                                .done(_decryptSuccessCb)
                                .fail(function(e) {
                                    self.logger.error("Failed to decrypt stuff via strongvelope, error: ", e);
                                });
                        });
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
            else {
                // no new messages retrieved (from chatd!)
                chatRoom.trigger('onHistoryDecrypted');
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

                        chatRoom.protocolHandler.decryptFrom(
                            msgObject.message,
                            msgObject.userId,
                            msgObject.keyid,
                            false
                        ).done(function(decrypted) {
                            if (decrypted) {
                                var mb = chatRoom.messagesBuff;
                                var msg = mb.messagesBatchFromHistory[msgObject.messageId];
                                if (!msg) {
                                    // may had been decrypted already, if also returned in a chat history in case of a
                                    // reconnect
                                    return;
                                }

                                var succeeded = self._processDecryptedMessage(
                                    chatRoom,
                                    msg,
                                    decrypted
                                );

                                if (succeeded) {
                                    mb.messagesBatchFromHistory.remove(msg.messageId);
                                    if (msgObject.pendingMessageId) {
                                        mb.messages.remove(msgObject.pendingMessageId);
                                    }
                                    msg.source = Message.SOURCE.CHATD;
                                    mb.messages.push(msg);
                                    self._parseMessage(chatRoom, chatRoom.messagesBuff.messages[msgObject.messageId]);
                                }
                            } else {
                                self.logger.error('Unknown message type!');
                            }
                        });
                    } catch (e) {
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
                            ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
                                ChatdIntegration._ensureKeysAreDecrypted(pendingkeys, chatRoom.protocolHandler).done(
                                    function () {
                                        _runDecryption();
                                    }
                                );
                            });
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
                Object.keys(chatRoom.members).forEach(function(member) {
                    chatRoom.protocolHandler.addParticipant(member);
                });
                chatRoom.protocolHandler.chatRoom = chatRoom;
                self.decryptTopic(chatRoom);
                self.join(chatRoom);
            })
            .fail(function() {
                self.logger.error(
                    "Failed to pre-load keys before initialising strongvelope. " +
                    "Can't initialise strongvelope for this chat: ",
                    chatRoom.roomId,
                    waitingForPromises
                );
            });
    }


    $(chatRoom).trigger('onChatdIntegrationReady');

};

ChatdIntegration.prototype._processDecryptedMessage = function(
    chatRoom,
    msgInstance,
    decryptedResult,
    isSharedFileMessage
) {
    var self = this;
    var mb = chatRoom.messagesBuff;
    var messageOrdersSource = isSharedFileMessage ? mb.sharedFilesMessageOrders : mb.messageOrders;

    if (decryptedResult && msgInstance) {
        if (decryptedResult.type === strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP) {
            if (typeof decryptedResult.payload === 'undefined' || decryptedResult.payload === null) {
                decryptedResult.payload = "";
            }
            msgInstance.textContents = decryptedResult.payload;
            if (decryptedResult.identity && decryptedResult.references) {
                msgInstance.references = decryptedResult.references;
                msgInstance.msgIdentity = decryptedResult.identity;

                messageOrdersSource[decryptedResult.identity] = msgInstance.orderValue;

                if (mb.verifyMessageOrder(
                        decryptedResult.identity,
                        decryptedResult.references,
                        messageOrdersSource
                    ) === false) {
                    // potential message order tampering detected.
                    self.logger.critical("message order tampering detected: ", chatRoom.chatId, msgInstance.messageId);
                    return false;
                }
                else {
                    return true;
                }
            }
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.ALTER_PARTICIPANTS) {
            if (msgInstance) {
                msgInstance.meta = {
                    userId: decryptedResult.sender,
                    included: decryptedResult.includeParticipants,
                    excluded: decryptedResult.excludeParticipants
                };
                ChatdIntegration._ensureNamesAreLoaded(decryptedResult.excludeParticipants);
                ChatdIntegration._ensureNamesAreLoaded(decryptedResult.includeParticipants);
                msgInstance.dialogType = "alterParticipants";
            }
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.TRUNCATE) {
            msgInstance.dialogType = 'truncated';
            msgInstance.userId = decryptedResult.sender;
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.PRIVILEGE_CHANGE) {
            msgInstance.meta = {
                userId: decryptedResult.sender,
                privilege: decryptedResult.privilege.charCodeAt(0),
                targetUserId: decryptedResult.recipients
            };
            msgInstance.dialogType = "privilegeChange";
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.TOPIC_CHANGE){
            msgInstance.meta = {
                userId: decryptedResult.sender,
                topic: decryptedResult.payload
            };
            msgInstance.dialogType = "topicChange";
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.GROUP_KEYED) {
            // this is a system message
            msgInstance.protocol = true;
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.CALL_END) {
            // this is a system message
            msgInstance.meta = {
                userId: decryptedResult.sender,
                callId: decryptedResult.callId,
                reason: decryptedResult.reason,
                duration: decryptedResult.duration,
                participants: decryptedResult.participants
            };

            msgInstance.dialogType = "remoteCallEnded";
            // remove any locally generated FAILEDs
            chatRoom.messagesBuff.removeMessageBy(function (v) {
                if (v.type === "call-failed" && !v.meta) {
                    return true;
                }
                else if (v.type === "call-ended" && v.isLocallyGenerated) {
                    return true;
                }
            });
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.CALL_STARTED) {
            // this is a system message
            msgInstance.meta = {
                userId: decryptedResult.sender
            };

            msgInstance.dialogType = "remoteCallStarted";
        }
        else {
            self.logger.error("Could not decrypt: ", decryptedResult);
            return false;
        }

        if (decryptedResult.type === strongvelope.MESSAGE_TYPES.TRUNCATE && msgInstance) {
            var messageKeys = chatRoom.messagesBuff.messages.keys();

            for (var i = 0; i < messageKeys.length; i++) {
                var v = chatRoom.messagesBuff.messages[messageKeys[i]];

                if (v.orderValue < msgInstance.orderValue) {
                    // remove the messages with orderValue < eventData.id from message buffer.
                    chatRoom.messagesBuff.messages.removeByKey(v.messageId);
                }
            }

            if (self.chatd.chatdPersist) {
                self.chatd.chatdPersist.persistTruncate(chatRoom.chatId, msgInstance.orderValue);
            }
        }

        return true;
    }
    else {
        return false;
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
                    chatRoom.protocolHandler.decryptFrom(base64urldecode(chatRoom.ct))
                        .done(function(decryptedCT) {
                            if (decryptedCT) {
                                chatRoom.topic = decryptedCT.payload;
                            }
                        })
                        .fail(function(e) {
                            self.logger.error("Could not decrypt topic: ", e);
                        });
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
        'missing chatId, chatShard or chadUrl in megaRoom. halting chatd join and code execution.' + chatRoom.chatId
    );

    self.chatIdToRoomId[chatRoom.chatId] = chatRoom.roomId;
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
        // Temporarily disabled, until we get into the state in which we need this again in the UI:
        // self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
    }
};

ChatdIntegration.prototype.setRetention = function(chatRoom, time) {
    var self = this;
    self.chatd.cmd(
        Chatd.Opcode.RETENTION,
        base64urldecode(chatRoom.chatId),
        Chatd.Const.UNDEFINED + Chatd.pack32le(time)
    );
};

ChatdIntegration.prototype.sendNewKey = function(chatRoom, keyxid, keyBlob) {
    var self = this;
    var keylen = keyBlob.length;
    var keybody = Chatd.pack32le(keyxid) + Chatd.pack32le(keylen) + keyBlob;
    self.chatd.cmd(Chatd.Opcode.NEWKEY, base64urldecode(chatRoom.chatId), keybody);
};

ChatdIntegration.prototype.sendMessage = function(chatRoom, messageObject) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    var self = this;

    var messageContents = (messageObject.textContents ? messageObject.textContents : messageObject.message) || "";

    var tmpPromise = new MegaPromise();

    var promises = [];
    var participants = chatRoom.getParticipantsExceptMe();
    if (participants.length === 0 && chatRoom.type === "private") {
        return;
    }
    else {
        participants.forEach(function(v, k) {
            participants[k] = v;
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
                if (
                    messageObject.message.charCodeAt(0) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT.charCodeAt(0)
                    &&
                    messageObject.message.charCodeAt(1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT.charCodeAt(0)
                ) {
                    messageObject.isPostedAttachment = true;
                }

                tmpPromise.resolve(
                    self.chatd.submit(
                        base64urldecode(chatRoom.chatId),
                        result,
                        keyid,
                        messageObject.isPostedAttachment
                    )
                );
            }
            else {
                tmpPromise.reject();
            }
        } catch(e) {
            self.logger.error("Failed to encrypt stuff via strongvelope, because of uncaught exception: ", e);
        }
    };

    ChatdIntegration._waitForProtocolHandler(chatRoom, function() {
        MegaPromise.allDone(promises).always(function() {
            _runEncryption();
        });
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
        if (!msg && self.chatd.chatdPersist) {
            self.chatd.chatdPersist.getMessageByOrderValue(chatRoom.chatId, msgnum)
                .done(function(r) {
                    if (!r) {
                        console.error(
                            "Update message failed, msgNum  was not found in either .buf, .sendingbuf or messagesBuff",
                            msgnum
                        );
                        return;
                    }
                    var msg = r[0];

                    self.chatd.chatdPersist.retrieveAndLoadKeysFor(chatRoom.chatId, msg.userId, msg.keyId)
                        .done(function() {

                            chatMessages.buf[msgnum] = [
                                // Chatd.MsgField.MSGID,
                                base64urldecode(msg.msgId),
                                // Chatd.MsgField.USERID,
                                base64urldecode(msg.userId),
                                // Chatd.MsgField.TIMESTAMP,
                                msg.msgObject.delay,
                                // message,
                                "",
                                // Chatd.MsgField.KEYID,
                                msg.keyId,
                                // mintimestamp - Chatd.MsgField.TIMESTAMP + 1,
                                0,
                                // Chatd.MsgType.EDIT
                                0
                            ];


                            self.updateMessage(chatRoom, msgnum, newMessage);
                        })
                        .fail(function(e) {
                            self.logger.error("Failed to retrieve key for MSGUPD, ", msgnum, msg.keyId, e);
                        });


                })
                .fail(function() {
                    console.error(
                        "Update message failed, msgNum  was not found in either .buf, .sendingbuf or messagesBuff",
                        msgnum
                    );
                });
            return;
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
    if (!chatRoom.chatId) {
        return;
    }
    var rawChatId = base64urldecode(chatRoom.chatId);
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

scope.ChatdIntegration = ChatdIntegration;
})(window);
