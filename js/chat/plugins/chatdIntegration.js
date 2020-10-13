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
    self.chatIdToRoomId = {};
    self._cachedHandlers = {};
    self._loadingCount = 0;
    self.newlyCreatedChats = {};
    self.mcUrlInflightRequest = Object.create(null);

    // chat events
    megaChat.rebind("onRoomInitialized.chatdInt", function(e, chatRoom) {
        console.assert(chatRoom.type, 'missing room type');
        if (chatRoom.type) {
            self._attachToChatRoom(chatRoom);
        }
    });

    megaChat.rebind("onDestroy.chatdInt", function(e) {
        self.chatd.destroyed = true;
    });

    mBroadcaster.addListener('onChatdChatUpdatedActionPacket', SoonFc(10, function(actionPacket) {
        self.openChat(actionPacket).dump('onChatdChatUpdatedActionPacket');
    }));

    self.chatd.rebind('onNumByHandle.chatdInt', function(e, eventData) {
        var chatRoom = megaChat.getChatById(eventData.chatId);
        if (chatRoom) {
            chatRoom.observers = eventData.count;
        }
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

    megaChat.rebind('onNewGroupChatRequest.chatdInt', function(e, contactHashes, opts) {
        var participants = new Set();
        contactHashes = contactHashes || [];
        participants.add(u_handle);
        contactHashes.forEach(function(contactHash) {
            participants.add(contactHash);
        });


        var chatMode = opts.keyRotation ? strongvelope.CHAT_MODE.CLOSED : strongvelope.CHAT_MODE.PUBLIC;

        var protocolHandler = new strongvelope.ProtocolHandler(
                    u_handle,
                    u_privCu25519,
                    u_privEd25519,
                    u_pubEd25519,
                    chatMode,
                    true
                );
        var promises = [];
        promises.push(
            ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
        );

        var _createChat = function() {
            var invited_users = [];
            contactHashes.forEach(function(contactHash) {
                var entry = {
                    'u': contactHash,
                    'p': 2
                };
                if (chatMode === strongvelope.CHAT_MODE.PUBLIC) {
                    var chatkey = protocolHandler.packKeyTo([protocolHandler.unifiedKey], contactHash);
                    entry['ck'] = base64urlencode(chatkey);
                }
                invited_users.push(entry);
            });
            var myKey = protocolHandler.packKeyTo([protocolHandler.unifiedKey], u_handle);

            var topic = null;
            if (opts.topic) {
                topic = ChatRoom.encryptTopic(
                    protocolHandler,
                    opts.topic,
                    participants,
                    (chatMode === strongvelope.CHAT_MODE.PUBLIC)
                );
            }

            var mccPacket = {
                'a': 'mcc',
                'g': 1,
                'u': invited_users,
                'm': chatMode === strongvelope.CHAT_MODE.PUBLIC ? 1 : 0,
                'v': Chatd.VERSION
            };

            if (topic) {
                mccPacket['ct'] = topic;
            }

            if (chatMode === strongvelope.CHAT_MODE.PUBLIC) {
                mccPacket['ck'] = base64urlencode(myKey);
            }

            asyncApiReq(mccPacket)
            .done(function(r) {
                self.newlyCreatedChats[r.id] = true;
                megaChat._chatsAwaitingAps[r.id] = opts;
            })
            .fail(function() {
                self.logger.error(
                    "Failed to retrieve chatd ID from API, while trying to create a new room, args:",
                    arguments
                );
            });
        };
        MegaPromise.allDone(promises).done(
            function () {
                _createChat();
            }
        );
    });
    return self;
};

inherits(ChatdIntegration, MegaDataEmitter);

/**
 * Decrypt message helper.
 * @param {Message} message the
 * @param {ChatRoom} [chatRoom] the
 * @returns {Promise} result, the :P
 */
ChatdIntegration.decryptMessageHelper = function(message, chatRoom) {
    return new Promise(function(resolve, reject) {
        chatRoom = chatRoom || message.chatRoom;
        ChatdIntegration._ensureKeysAreLoaded([message], 0, chatRoom.publicChatHandle)
            .then(function() {
                var cacheKey = message.userId + "-" + message.keyid;
                if (!Object(chatRoom.notDecryptedKeys).hasOwnProperty(cacheKey)) {
                    return true;
                }

                return new Promise(function(resolve, reject) {
                    ChatdIntegration._waitForProtocolHandler(chatRoom, tryCatch(function() {
                        var ph = chatRoom.protocolHandler;
                        var mk = [chatRoom.notDecryptedKeys[cacheKey]];
                        ChatdIntegration._ensureKeysAreDecrypted(mk, ph).then(resolve).catch(reject);
                    }, reject));
                });
            })
            .then(function() {
                return chatRoom.protocolHandler.decryptFrom(message.message, message.userId, message.keyid, false);
            })
            .then(function(decrypted) {
                if (!decrypted) {
                    throw new Error('Message can not be decrypted!');
                }
                return decrypted;
            })
            .then(resolve)
            .catch(reject);
    });
};

ChatdIntegration.prototype.updateChatPublicHandle = function(h, d, callback) {
    var self = this;
    var req = {a: "mcph", "id": h, v: Chatd.VERSION};
    if (d) {
        req['d'] = 1;
    }

    return asyncApiReq(req)
        .done(function(r) {
            var chatRoom = self.megaChat.chats[h];
            if (d) {
                chatRoom.publicLink = null;
            }
            else {
                chatRoom.publicLink = 'chat/' + r + '#' + chatRoom.protocolHandler.getUnifiedKey();
            }

            if (callback) {
                callback();
            }
        })
        .fail(function() {
            var chatRoom = self.megaChat.chats[h];
            chatRoom.publicLink = null;
            if (callback) {
                callback();
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

ChatdIntegration._waitForProtocolHandler = function(chatRoom, cb) {
    if (chatRoom.protocolHandler) {
        cb();
    }
    else if (chatRoom.strongvelopeSetupPromises) {
        chatRoom.strongvelopeSetupPromises.always(cb);
    }
    else {
        createTimeoutPromise(function() {
            return !!chatRoom.protocolHandler;
        }, 500, 5000).always(cb);
    }
};

ChatdIntegration.prototype.joinChatViaPublicHandle = function(chatRoom) {
    var self = this;
    if (chatRoom.protocolHandler && chatRoom.protocolHandler.unifiedKey) {
        var myKey = chatRoom.protocolHandler.packKeyTo([chatRoom.protocolHandler.unifiedKey], u_handle);

        loadingDialog.show();
        asyncApiReq({
            a: 'mciph',
            ph: chatRoom.publicChatHandle,
            ck: base64urlencode(myKey),
            v: Chatd.VERSION
        }).then(function(res) {
            loadingDialog.hide();
            self.logger.info('mciph succeed...', res);
            self.chatd._reinitChatIdHistory(chatRoom.chatId, false);
            chatRoom.messagesBuff.messageOrders = {};
        }).catch(function(ex) {
            loadingDialog.hide();
            if (ex === EEXPIRED) {
                self.requiresUpdate();
            }
            else if (ex === ENOENT) {
                msgDialog('warninga', l[20641], l[20642]);
            }
            else {
                self.logger.warn('Unexpected mciph error...', ex);
            }
        });
    }
};

ChatdIntegration.prototype._finalizeMcurlResponseHandling = function(ret, chatInfo, publicChatHandle, finishProcess) {
    var self = this;
    var chatId;
    var chatRoom;
    if (publicChatHandle) {
        var keys = [
            'url',
            'id',
            'cs',
            'ct',
            'ts',
            'ck',
        ];
        for (var i = 0; i < keys.length; i++) {
            if (typeof(ret[keys[i]]) !== 'undefined') {
                chatInfo[keys[i]] = ret[keys[i]];
            }
        }

        chatInfo.m = 1;
        chatInfo.g = 1;

        if (ret.ts) {
            chatInfo.ctime = ret.ts;
        }

        chatId = ret.id;
        chatRoom = self.megaChat.chats[chatId];
        self.megaChat.handleToId[publicChatHandle] = ret.id;

        if (chatRoom && !chatRoom.publicChatHandle) {
            chatRoom.publicChatHandle = publicChatHandle;
        }


        if (chatRoom && self.megaChat.publicChatKeys[publicChatHandle]) {
            chatRoom.publicChatKey = self.megaChat.publicChatKeys[publicChatHandle];
        }

        if (chatRoom && chatRoom.publicChatHandle) {
            chatRoom.onPublicChatRoomInitialized();
        }

        // This chatlink is valid to be affilaited
        M.affiliate.storeAffiliate(publicChatHandle, 3);
    }
    else {
        chatInfo.url = ret;
    }

    finishProcess(chatId, chatRoom);
};


ChatdIntegration.prototype._retrieveShardUrl = function(isPublic, chatIdOrHandle, chatShard) {
    if (!isPublic && !chatIdOrHandle) {
        return Promise.reject(ENOENT);
    }
    var apiReq = {
        a: isPublic ? 'mcphurl' : 'mcurl',
        v: Chatd.VERSION
    };
    if (isPublic) {
        apiReq.ph = isPublic;
    }
    else {
        apiReq.id = chatIdOrHandle;

        if (chatShard === undefined) {
            var chat = megaChat.getChatById(chatIdOrHandle);
            if (chat) {
                chatShard = chat.chatShard;
            }
        }

        if (this.mcUrlInflightRequest[chatShard]) {
            return this.mcUrlInflightRequest[chatShard];
        }
    }

    var req = asyncApiReq(apiReq);

    if (chatShard !== undefined) {
        var self = this;
        self.mcUrlInflightRequest[chatShard] = req;
        req.always(function() {
            delete self.mcUrlInflightRequest[chatShard];
        });
    }

    return req;
};

/**
 * Core func for opening a chat.
 *
 * @param chatInfo {String|Object} can be either public chat handle (for pub chats) OR actionPacket from mcc/mcf
 * @param [isMcf] {undefined|bool}
 * @param [missingMcf] {undefined|bool}
 * @returns {Promise}
 */
// eslint-disable-next-line complexity
ChatdIntegration.prototype.openChat = promisify(function(resolve, reject, chatInfo, isMcf, missingMcf) {
    var self = this;
    var publicChatHandle;

    if (isString(chatInfo)) {
        publicChatHandle = chatInfo;
        chatInfo = {};
    }

    if (chatInfo && chatInfo.p === -1) {
        // left chat, hide for now.
        onIdle(reject.bind(null, EEXPIRED));
        return;
    }
    self._loadingCount++;

    // is isMcf and triggered by a missingMcf in the 'f' treecache, trigger an immediate store in the fmdb
    if (!publicChatHandle && isMcf && missingMcf && fmdb) {
        if (chatInfo.id && chatInfo.cs !== undefined) {
            fmdb.add('mcf', {id: chatInfo.id, d: chatInfo});
        }
    }

    loadingDialog.hide();

    var chatParticipants = chatInfo.u;

    var userHandles = [];
    if (chatParticipants) {
        Object.keys(chatParticipants).forEach(function(k) {
            var v = chatParticipants[k];
            if (v.u) {
                userHandles.push(v.u);
            }
        });
    }
    var chatId = chatInfo.id;

    var chatRoom = chatId && self.megaChat.getChatById(chatId);
    var wasActive = chatRoom ? chatRoom.isCurrentlyActive : false;
    var isRoomTypeChange = false;

    var getShardURL = function(onSuccess) {
        self._retrieveShardUrl(publicChatHandle, chatInfo.id, chatInfo.cs)
            .then(function(ret) {
                self._finalizeMcurlResponseHandling(ret, chatInfo, publicChatHandle, onSuccess);
            })
            .catch(function(ex) {
                self.logger.warn(ex);

                if (ex === EEXPIRED) {
                    self.requiresUpdate();
                }
                else {
                    reject(ex);
                }
            });
    };

    var finishProcess = function(newChatId, newChatRoom) {
        self._loadingCount--;

        if (newChatId) {
            chatId = newChatId;
        }

        if (newChatRoom) {
            chatRoom = newChatRoom;
        }

        if (d) {
            console.group('chatdint:openchat:finish:' + chatId);
            console.time('chatdint:openchat:finish:' + chatId);
        }

        // if the found chatRoom is in LEAVING mode...then try to reinitialise it!
        if (chatRoom && chatRoom.stateIsLeftOrLeaving() && chatInfo.ou !== u_handle) {
            self._cachedHandlers[chatId] = chatRoom.protocolHandler;

            if (!chatInfo.url) {
                // retrieve mcurl!
                return getShardURL(finishProcess);
            }
        }

        // try to find the chat room again, it may had been opened while waiting for the mcurl api call...
        chatRoom = self.megaChat.getChatById(chatId);
        if (!chatRoom) {
            var setAsActive = megaChat._chatsAwaitingAps[chatInfo.id];
            delete megaChat._chatsAwaitingAps[chatInfo.id];

            var r = self.megaChat.openChat(
                userHandles,
                (chatInfo.m === 1) ? "public" : (chatInfo.g === 1 ? "group" : "private"),
                chatInfo.id,
                chatInfo.cs,
                chatInfo.url,
                !!setAsActive,
                publicChatHandle ? publicChatHandle : undefined,
                self.megaChat.publicChatKeys[publicChatHandle],
                chatInfo.ck
            );
            chatRoom = r[1];
            if (!chatRoom) {
                return reject(ENOENT);
            }

            if (chatInfo.ct) {
                chatRoom.ct = chatInfo.ct;
            }
            if (chatInfo.ts) {
                chatRoom.ctime = chatInfo.ts;
            }


            if (typeof chatInfo.f !== 'undefined') {
                chatRoom.flags = chatInfo.f;
            }
            // apply the flags if any received during loading.
            if (loadfm.chatmcfc && typeof loadfm.chatmcfc[chatInfo.id] !== 'undefined') {
                chatRoom.updateFlags(loadfm.chatmcfc[chatInfo.id]);
                delete loadfm.chatmcfc[chatInfo.id];
            }
            if (chatInfo.ck) {
                chatRoom.ck = chatInfo.ck;

            }
            self.decryptTopic(chatRoom);

            // handler of the same room was cached before, then restore the keys.
            if (self._cachedHandlers[chatId] && chatRoom.protocolHandler) {
                chatRoom.protocolHandler.participantKeys = self._cachedHandlers[chatId].participantKeys;
            }
            if (!isMcf && chatInfo.ou === u_handle && !chatInfo.n) {
                if (chatRoom.lastActivity === 0) {
                    chatRoom.lastActivity = unixtime();
                }

                if (chatRoom.showAfterCreation) {
                    loadSubPage(chatRoom.getRoomUrl());
                }

                delete chatRoom.showAfterCreation;
            }
            if (!chatRoom.lastActivity && chatInfo.ts) {
                chatRoom.lastActivity = chatInfo.ts;
            }

            if (wasActive) {
                loadSubPage(chatRoom.getRoomUrl());
            }
            chatRoom.trackMemberUpdatesFromActionPacket(chatInfo, isMcf);

            if (setAsActive) {
                // wait for the .protocolHandler to be initialized
                var validate1 = function() {
                    return !!chatRoom.protocolHandler && chatRoom.state === ChatRoom.STATE.READY;
                };
                // in case of CPU throttling, the UI of the dialog may not yet be shown so lets delay this a bit
                var validate2 = function() {
                    return !!chatRoom.isUIMounted();
                };

                createTimeoutPromise(validate1, 500, 10000)
                    .then(function() {
                        if (setAsActive.createChatLink) {
                            createTimeoutPromise(validate2, 300, 2000)
                                .always(function() {
                                    chatRoom.trigger('showGetChatLinkDialog');
                                    affiliateUI.registeredDialog.show();
                                });
                        }
                    })
                    .catch(function(ex) {
                        self.logger.warn("Timed out waiting for protocolHandler, room title not set.", ex);
                    });
            }
        }
        else {
            chatRoom.ct = chatInfo.ct;
            if (chatInfo.ts) {
                chatRoom.ctime = chatInfo.ts;
            }

            var roomType = (chatInfo.m === 1) ? "public" : (chatInfo.g === 1 ? "group" : "private");
            // this needs to happen before any decryption call (e.g. decrypt topic)
            if (chatRoom.type !== roomType) {
                if ((chatRoom.type === "public") && (roomType !== "public")) {
                    isRoomTypeChange = true;
                    if (chatRoom.protocolHandler) {
                        chatRoom.protocolHandler.switchOffOpenMode();
                    }
                }
            }

            self.decryptTopic(chatRoom);

            if (!chatRoom.chatId) {
                chatRoom.chatId = chatInfo.id;
                chatRoom.chatIdBin = base64urldecode(chatInfo.id);
                chatRoom.chatShard = chatInfo.cs;
                chatRoom.chatdUrl = chatInfo.url;
            }
            else {
                // this is a member update or chat mode update.
                if (chatInfo.n) {

                    var included = [];
                    var excluded = [];
                    chatInfo.n.forEach(function(v) {
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
                                M.u[v.u].c === 1 &&
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
                            ChatdIntegration._ensureKeysAreLoaded([], included, chatRoom.publicChatHandle);
                            ChatdIntegration._ensureContactExists(included);
                            included.forEach(function(handle) {
                                if (M.u[handle] && !M.u[handle].c) {
                                    megaChat.processNewUser(handle);
                                }
                            });
                        }

                        chatRoom.trackDataChange();
                    }
                }

                if (chatRoom.type !== roomType) {
                    chatRoom.type = roomType;
                    if (chatInfo.m === 0 && megaChat.currentlyOpenedChat === chatRoom.chatId) {
                        $('.section.conversations').addClass('privatechat');
                        // url should be now /g/ instead of /c/
                        var roomUrl = chatRoom.getRoomUrl().replace("fm/", "");
                        M.openFolder(roomUrl);
                    }

                    chatRoom.trackDataChange();
                }
            }

            chatRoom.trackMemberUpdatesFromActionPacket(chatInfo, isMcf);
        }

        if (d) {
            console.timeEnd('chatdint:openchat:finish:' + chatId);
            console.groupEnd();
        }

        return resolve(chatId);
    };

    if (publicChatHandle || !chatInfo.url && (!chatRoom || !chatRoom.chatdUrl)) {
        getShardURL(finishProcess);
    }
    else {
        onIdle(function() {
            finishProcess();
        });
    }
});


ChatdIntegration._waitUntilChatIdIsAvailable = function(fn) {
    return function(chatRoom) {
        if (chatRoom.chatId) {
            return fn.apply(this, arguments);
        }
        var self = this;
        var masterPromise = new MegaPromise();
        var args = toArray.apply(null, arguments);
        self._retrieveChatdIdIfRequired(chatRoom)
            .then(function() {
                masterPromise.linkDoneAndFailToResult(fn, self, args);
            })
            .catch(function(ex) {
                self.logger.error("Failed to retrieve chatId for chatRoom %s", chatRoom.roomId, ex);
                masterPromise.reject(ex);
            });
        return masterPromise;
    };
};

ChatdIntegration.prototype._retrieveChatdIdIfRequired = function(chatRoom) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (chatRoom.chatId) {
            return resolve();
        }

        var userHashes = [];
        var members = chatRoom.getParticipantsExceptMe();
        for (var i = members.length; i--;) {
            var contact = M.u[members[i]];
            if (contact) {
                userHashes.push({u: contact.u, p: 2});
            }
        }

        // unknown user.
        if (userHashes.length === 0) {
            return reject(ENOENT);
        }

        asyncApiReq({
            'a': 'mcc',
            'g': chatRoom.type === "group" || chatRoom.type === "public" ? 1 : 0,
            'u': userHashes,
            'm': chatRoom.type === "public" ? 1 : 0,
            'v': Chatd.VERSION
        }).then(function(r) {
            chatRoom.chatdUrl = r.url;
            chatRoom.chatId = r.id;
            chatRoom.chatIdBin = base64urldecode(r.id);
            chatRoom.chatShard = r.cs;

            self.join(chatRoom);
            resolve();
        }).catch(function(ex) {
            if (d) {
                self.logger.error("Failed to retrieve chatd ID from API for room %s", chatRoom.roomId, ex);
            }
            reject(ex);
        });
    });
};

ChatdIntegration._waitForShardToBeAvailable = function(fn) {
    return function(chatRoom) {
        var chatIdDecoded = base64urldecode(chatRoom.chatId);

        if (this.chatd.chatIdShard[chatIdDecoded]) {
            return fn.apply(this, arguments);
        }

        var self = this;
        var masterPromise = new MegaPromise();
        var args = toArray.apply(null, arguments);

        createTimeoutPromise(function() {
            return !!self.chatd.chatIdShard[chatIdDecoded];
        }, 500, 10000)
            .then(function() {
                masterPromise.linkDoneAndFailToResult(fn, self, args);
            })
            .catch(function(ex) {
                console.error(ex);
                masterPromise.reject(ex);
            });
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


ChatdIntegration._ensureKeysAreLoaded = function(messages, users, chathandle) {
    if (chathandle) {
        return MegaPromise.resolve();
    }
    if (messages && messages.length === 0 && users && users.length === 0) {
        // speed up a little bit, by skipping the .isArray checks.
        return MegaPromise.resolve();
    }

    var i;
    var promises = [];
    var queue = function(userId) {
        if (userId && userId !== strongvelope.COMMANDER) {
            promises.push(crypt.getAllPubKeys(userId));
        }
    };

    if (Array.isArray(messages)) {
        for (i = messages.length; i--;) {
            queue(messages[i].userId);
        }
    }

    if (Array.isArray(users)) {
        for (i = users.length; i--;) {
            queue(users[i]);
        }
    }
    else if (users instanceof Set) {
        users.forEach(queue);
    }

    return MegaPromise.allDone(promises);
};


ChatdIntegration._ensureContactExists = function(users) {
    if (Array.isArray(users) || users instanceof Set) {
        users.forEach(function(h) {
            if (h !== strongvelope.COMMANDER) {
                M.setUser(h);
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
        var messageHasAttachment = (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT);
        var messageIsVoiceClip = (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP);

        if (messageHasAttachment || messageIsVoiceClip) {
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
                else if (origTextContents[2] === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                    message.metaType = Message.MESSAGE_META_TYPE.GEOLOCATION;
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

    chatRoom.rebind('onMeJoined.chatdInt', function() {
        var mc = chatRoom.megaChat;
        var cd = mc.plugins.chatdIntegration.chatd;
        var shard = cd.shards[chatRoom.chatShard];
        if (shard && !shard.joinedChatIds[chatRoom.chatIdBin]) {
            if (chatRoom.type === "public") {
                // this is a pub chat, where I was added or joined by chatd from api request to join
                shard.joinedChatIds[chatRoom.chatIdBin] = true;
            }
        }
    });

    chatRoom.rebind('onBroadcast.chatdInt' + chatRoomId, function(e, eventData) {
        chatRoom.trigger('onParticipantTyping', [eventData.userId, eventData.bCastCode]);
    });

    chatRoom.rebind('onRoomDisconnected.chatdInt' + chatRoomId, function(e, eventData) {
        if (self.megaChat.isLoggingOut) {
            return;
        }

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
    });

    if (!chatRoom.messagesBuff) {
        chatRoom.pubCu25519KeyIsMissing = false;

        chatRoom.messagesBuff = new MessagesBuff(chatRoom, self);
        chatRoom.messagesBuff.rebind('onHistoryFinished.chatd', function() {
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

            var hist = [];
            var invitors = [];
            containerBatchFromHist.forEach(function(v, k) {
                if (v.userId && !v.requiresManualRetry) {
                    if (!v.textContents && v.message && !v.deleted) {
                        var msg = v.message;

                        hist.push({
                            'message': msg,
                            'userId': v.userId,
                            'keyid': v.keyid,
                            'ts': v.delay,
                            'k': k
                        });

                        if (v.userId === strongvelope.COMMANDER) {
                            var parsedMessage = strongvelope._parseMessageContent(msg);
                            if (parsedMessage && invitors.indexOf(parsedMessage.invitor) < 0) {
                                invitors.push(parsedMessage.invitor);
                            }
                        }
                    }
                }
            });

            if (!hist.length) {
                return chatRoom.trigger('onHistoryDecrypted');
            }

            var mIdx = -1;
            var parseMessage = tryCatch(function(msg) {
                var messageId = hist[mIdx].k;
                var msgInstance = containerBatchFromHist[messageId]
                    || containerMessages[messageId] || chatRoom.messagesBuff.getMessageById(messageId);

                if (msgInstance) {
                    var succeeded = self._processDecryptedMessage(chatRoom, msgInstance, msg, isSharedFileMessage);
                    if (!succeeded) {
                        chatRoom.logger.error('Could not decrypt message "%s"', messageId, msg, msgInstance);
                    }

                    self._parseMessage(chatRoom, msgInstance);
                    containerMessages.push(msgInstance);
                    containerBatchFromHist.remove(messageId);
                }
                else {
                    chatRoom.logger.critical('Message "%s" not found.', messageId, hist[mIdx]);
                }
            }, function(ex) {
                chatRoom.logger.error('Failed to parse message.', hist[mIdx], ex);
            });

            (chatRoom._keysAreSeeding || Promise.resolve())
                .then(function() {
                    return chatRoom.strongvelopeSetupPromises;
                })
                .then(function() {
                    return ChatdIntegration._ensureKeysAreLoaded(hist, invitors, chatRoom.publicChatHandle);
                })
                .then(function() {
                    // .seed result is not used in here, since it returns false, even when some messages can be
                    // decrypted which in the current case (of tons of cached non encrypted msgs in chatd) is bad
                    return chatRoom.protocolHandler.seed(hist);
                })
                .then(function() {
                    return chatRoom.protocolHandler.batchDecrypt(hist, true);
                })
                .then(function(decryptedMsgs) {
                    for (mIdx = decryptedMsgs.length; mIdx--;) {
                        // message may failed to decrypt and decryption returned undefined.
                        if (decryptedMsgs[mIdx]) {
                            parseMessage(decryptedMsgs[mIdx]);
                        }
                    }
                    chatRoom.trigger('onHistoryDecrypted');
                })
                .catch(function(ex) {
                    chatRoom.logger.error("Failed to decrypt message(s) via strongvelope", ex);
                });
        });

        chatRoom.rebind('onLeaveChatRequested.chatdInt', function() {
            asyncApiReq({
                "a": "mcr", // request identifier
                "id": chatRoom.chatId, // chat id
                "v": Chatd.VERSION
            });
        });
        chatRoom.rebind('onAddUserRequest.chatdInt', function(e, contactHashes) {
            contactHashes.forEach(function(h) {
                if (chatRoom.topic) {
                    var participants = chatRoom.protocolHandler.getTrackedParticipants();
                    participants.add(h);

                    var promises = [];
                    promises.push(
                        ChatdIntegration._ensureKeysAreLoaded(undefined, participants, chatRoom.publicChatHandle)
                    );
                    var _runInvitedWithTopic = function() {

                        var topic = chatRoom.protocolHandler.embeddedEncryptTo(
                            chatRoom.topic,
                            strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                            participants,
                            undefined,
                            chatRoom.type === "public"
                        );

                        if (topic) {
                            if (chatRoom.type === 'public') {
                                var chatkey = chatRoom.protocolHandler.packKeyTo([chatRoom.protocolHandler.unifiedKey], h);
                                asyncApiReq({
                                    "a":"mci",
                                    "id":chatRoom.chatId,
                                    "u": h,
                                    "p": 2,
                                    "ct":base64urlencode(topic),
                                    "ck":base64urlencode(chatkey),
                                    "v": Chatd.VERSION
                                });
                            }
                            else {
                                asyncApiReq({
                                    "a":"mci",
                                    "id":chatRoom.chatId,
                                    "u": h,
                                    "p": 2,
                                    "ct":base64urlencode(topic),
                                    "v": Chatd.VERSION
                                });
                            }
                        }
                    };
                    MegaPromise.allDone(promises).done(
                        function () {
                            _runInvitedWithTopic();
                        }
                    );
                }
                else {
                    var req = {
                        "a":"mci",
                        "id": chatRoom.chatId,
                        "u": h,
                        "p": 2,
                        "v": Chatd.VERSION
                    };

                    if (chatRoom.type === 'public') {
                        var chatkey = chatRoom.protocolHandler.packKeyTo(
                            [chatRoom.protocolHandler.unifiedKey],
                            h
                        );
                        req['ck'] = base64urlencode(chatkey);
                    }

                    asyncApiReq(req);
                }
            });
        });

        chatRoom.rebind('onRemoveUserRequest.chatdInt', function(e, contactHash) {
            asyncApiReq({
                "a":"mcr",
                "id": chatRoom.chatId,
                "u": contactHash,
                "v": Chatd.VERSION
            });
        });
        chatRoom.rebind('alterUserPrivilege.chatdInt', function(e, contactHash, newPriv) {
            asyncApiReq({
                "a":"mcup",
                "id": chatRoom.chatId,
                "u": contactHash,
                "p": newPriv,
                "v": Chatd.VERSION
            });
        });

        chatRoom.rebind('onTopicChange.chatdInt', function(e, contactHash, topic) {
            asyncApiReq({
                "a":"mcst",
                "id":chatRoom.chatId,
                "ct":btoa(topic),
                "v": Chatd.VERSION
            });
        });

        chatRoom.messagesBuff.rebind('onNewMessageReceived.chatdStrongvelope', function(e, msgObject) {
            if (msgObject.message && msgObject.message.length && msgObject.message.length > 0) {
                ChatdIntegration.decryptMessageHelper(msgObject)
                    .then(function(decrypted) {
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
                            decrypted,
                            false,
                            true
                        );

                        if (succeeded) {
                            mb.messagesBatchFromHistory.remove(msg.messageId);
                            if (msgObject.pendingMessageId) {
                                mb.messages.remove(msgObject.pendingMessageId);
                            }
                            msg.source = Message.SOURCE.CHATD;
                            self._parseMessage(chatRoom, msg);
                            mb.messages.push(msg);
                        }
                    })
                    .catch(function(ex) {
                        self.logger.error('Failed to decrypt message!', ex);
                    });
            }
        });

        var waitingForPromises = [self._retrieveChatdIdIfRequired(chatRoom)];
        if ((chatRoom.type === "public" || chatRoom.type === "group") && chatRoom.ck) {
            // group chats with a ck (e.g. now "private group chats"), may have topics/messages that require
            // preloading of keys. Since we don't know just yet, we need to preload them just-in-case.
            var parsedKey = strongvelope.unpackKey(base64urldecode(chatRoom.ck));
            if (parsedKey) {
                waitingForPromises.push(
                    ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedKey.sender], chatRoom.publicChatHandle)
                );
            }
        }


        chatRoom.strongvelopeSetupPromises = Promise.allSettled(waitingForPromises)
            .then(function() {
                // after all dependencies (data) is initialised, lets init the protocol handler and others
                if (anonymouschat) {
                    chatRoom.protocolHandler = new strongvelope.ProtocolHandler(
                        null,
                        null,
                        null,
                        null,
                        strongvelope.CHAT_MODE.PUBLIC,
                        chatRoom.ck
                    );
                }
                else {
                    assert(u_handle, 'u_handle is not loaded, null or undefined!');
                    assert(u_privCu25519, 'u_privCu25519 is not loaded, null or undefined!');
                    assert(u_privEd25519, 'u_privEd25519 is not loaded, null or undefined!');
                    assert(u_pubEd25519, 'u_pubEd25519 is not loaded, null or undefined!');

                    chatRoom.protocolHandler = new strongvelope.ProtocolHandler(
                        u_handle,
                        u_privCu25519,
                        u_privEd25519,
                        u_pubEd25519,
                        (chatRoom.type === "public") ? strongvelope.CHAT_MODE.PUBLIC : strongvelope.CHAT_MODE.CLOSED,
                        chatRoom.ck
                    );
                }

                Object.keys(chatRoom.members).forEach(function(member) {
                    chatRoom.protocolHandler.addParticipant(member);
                });

                chatRoom.protocolHandler.chatRoom = chatRoom;
                if (chatRoom.ck && (chatRoom.type === "public")) {
                    self.decryptUnifiedkey(chatRoom).done(function () {
                        self.decryptTopic(chatRoom);
                    });
                }
                else if (chatRoom.publicChatKey && (chatRoom.type === "public")) {
                    chatRoom.protocolHandler.unifiedKey = base64urldecode(chatRoom.publicChatKey);
                }
                else {
                    self.decryptTopic(chatRoom);
                }
                self.join(chatRoom);
                delete chatRoom.strongvelopeSetupPromises;
            })
            .catch(function(ex) {
                self.logger.error(
                    "Failed to pre-load keys before initialising strongvelope. " +
                    "Can't initialise strongvelope for this chat: ",
                    chatRoom.roomId,
                    waitingForPromises,
                    ex
                );
            });
    }


    chatRoom.trigger('onChatdIntegrationReady');

};

ChatdIntegration.prototype._processDecryptedMessage = function(
    chatRoom,
    msgInstance,
    decryptedResult,
    isSharedFileMessage,
    isNewMessage
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
                    // intentionally return true.
                    return true;
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
                ChatdIntegration._ensureContactExists(decryptedResult.excludeParticipants);
                ChatdIntegration._ensureContactExists(decryptedResult.includeParticipants);
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
            if (decryptedResult.payload && decryptedResult.payload.length > 0) {
                msgInstance.meta = {
                    userId: decryptedResult.sender,
                    topic: decryptedResult.payload
                };
                msgInstance.dialogType = "topicChange";

                if (isNewMessage && (anonymouschat || !msgInstance.chatRoom.membersSetFromApi.members[u_handle])) {
                    // no ap's for anonymous users, set the topic from the message
                    msgInstance.chatRoom.topic = decryptedResult.payload;
                }
            }
            else {
                // this was eventually set to work for topicChange that have only embedded keys in it.
                // however, its not a bad idea (e.g. support for topic removal in the future?)
                // msgInstance.protocol = true;
            }
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
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.OPEN_MODE_CLOSED) {
            msgInstance.dialogType = 'openModeClosed';
            msgInstance.userId = decryptedResult.sender;
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.PUBLIC_HANDLE_CREATE
            || decryptedResult.type === strongvelope.MESSAGE_TYPES.PUBLIC_HANDLE_DELETE) {
            msgInstance.dialogType = 'chatHandleUpdate';
            msgInstance.meta = {
                userId: decryptedResult.sender,
                handleUpdate: (decryptedResult.type === strongvelope.MESSAGE_TYPES.PUBLIC_HANDLE_CREATE) ? 1 : 0
            };
        }
        else {
            self.logger.error("Could not decrypt: ", decryptedResult);
            return false;
        }

        if (decryptedResult.type === strongvelope.MESSAGE_TYPES.TRUNCATE && msgInstance) {
            var messageKeys = clone(chatRoom.messagesBuff.messages.keys());

            for (var i = 0; i < messageKeys.length; i++) {
                var v = chatRoom.messagesBuff.messages[messageKeys[i]];

                if (v.orderValue < msgInstance.orderValue) {
                    // remove the messages with orderValue < eventData.id from message buffer.
                    chatRoom.messagesBuff.messages.removeByKey(v.messageId);
                }
            }

            if (self.chatd.chatdPersist) {
                self.chatd.chatdPersist.persistTruncate(chatRoom.chatId, msgInstance.orderValue).always(nop);
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
    return new MegaPromise(function(resolve, reject) {
        if (!chatRoom.protocolHandler) {
            return reject(false);
        }
        var parsedMessage = strongvelope._parseMessageContent(base64urldecode(chatRoom.ct));

        ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedMessage.invitor], chatRoom.publicChatHandle)
            .then(function() {
                return chatRoom.protocolHandler.decryptFrom(base64urldecode(chatRoom.ct));
            })
            .then(function(decryptedCT) {
                chatRoom.topic = decryptedCT.payload;
                resolve();
            })
            .catch(function(ex) {
                if (d) {
                    self.logger.warn("Could not decrypt topic in root %s",
                        chatRoom.chatId, ex, localStorage.debugSignatureInvalid && parsedMessage);
                }
                reject(ex);
            });
    });
};

ChatdIntegration.prototype.decryptUnifiedkey = function(chatRoom) {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        if (!chatRoom.protocolHandler) {
            return reject(false);
        }
        var parsedKey = strongvelope.unpackKey(base64urldecode(chatRoom.ck));

        ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedKey.sender], chatRoom.publicChatHandle)
            .then(function() {
                var decryptedKeys = chatRoom.protocolHandler._decryptKeysFrom(parsedKey.senderKey, parsedKey.sender);
                chatRoom.protocolHandler.unifiedKey = decryptedKeys[0];
                resolve();
            })
            .catch(function(e) {
                self.logger.error("Could not get unified key: ", e);
                reject(e);
            });
    });
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
    if (chatRoom.type !== "public") {
        var participants = chatRoom.getParticipantsExceptMe();
        if (participants.length === 0 && chatRoom.type === "private") {
            return;
        }

        promises.push(
            ChatdIntegration._ensureKeysAreLoaded(undefined, participants)
        );
    }

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
                .then(function(r) {
                    if (!r) {
                        console.error(
                            "Update message failed, msgNum  was not found in either .buf, .sendingbuf or messagesBuff",
                            msgnum
                        );
                        return;
                    }
                    var msg = r[0];

                    self.chatd.chatdPersist.retrieveAndLoadKeysFor(chatRoom.chatId, msg.userId, msg.keyId)
                        .then(function() {

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
                        .catch(function(ex) {
                            self.logger.error("Failed to retrieve key for MSGUPD, ", msgnum, msg.keyId, ex);
                        });


                })
                .catch(function() {
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

ChatdIntegration.prototype.handleLeave = function(room) {
    var chatHandleBin = base64urldecode(room.publicChatHandle);
    var cd = this.chatd;
    var s = cd.chatIdShard[room.chatIdBin];
    if (s) {
        s.cmd(Chatd.Opcode.HANDLELEAVE, chatHandleBin);
    }
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

scope.ChatdIntegration = ChatdIntegration;
})(window);
