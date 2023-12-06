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
                    eventlog(99616, true);
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
    self.mcUrlInflightRequest = Object.create(null);

    // chat events
    megaChat.rebind("onRoomInitialized.chatdInt", (e, chatRoom, resolve = nop, reject = dump) => {
        console.assert(chatRoom.type, 'missing room type');

        if (!chatRoom.type) {
            return reject(EINCOMPLETE);
        }
        self._attachToChatRoom(chatRoom).then(resolve).catch(reject);
    });

    megaChat.rebind("onDestroy.chatdInt", function(e) {
        self.chatd.destroyed = true;
    });

    this.mBApListener = mBroadcaster.addListener('onChatdChatUpdatedActionPacket', (actionPacket) => {
        this.openChat(actionPacket).dump('onChatdChatUpdatedActionPacket');
    });

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

        var _createChat = () => {
            var invited_users = [];
            contactHashes.forEach(function(contactHash) {
                var entry = {
                    'u': contactHash,
                    'p': 2
                };
                if (chatMode === strongvelope.CHAT_MODE.PUBLIC) {
                    const key = protocolHandler.packKeyTo([protocolHandler.unifiedKey], contactHash);
                    const keyEncoded = base64urlencode(key);
                    assert(
                        keyEncoded && keyEncoded.length === 32,
                        'onNewGroupChatRequest: invalid chat key passed.'
                    );
                    entry.ck = keyEncoded;
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

            const reqi = String(rand(6e10));
            const mccPacket = {
                a: 'mcc',
                g: 1,
                u: invited_users,
                m: chatMode === strongvelope.CHAT_MODE.PUBLIC ? 1 : 0,
                v: Chatd.VERSION,
                i: reqi,
                w: opts.waitingRoom,
                oi: opts.openInvite,
                sm: opts.scheduledMeeting
            };

            if (opts.isMeeting) {
                mccPacket.mr = 1;
            }

            if (topic) {
                mccPacket.ct = topic;
            }

            if (chatMode === strongvelope.CHAT_MODE.PUBLIC) {
                const keyEncoded = base64urlencode(myKey);
                assert(keyEncoded && keyEncoded.length === 32, 'onNewGroupChatRequest: invalid chat key passed.');
                mccPacket.ck = keyEncoded;
            }
            megaChat._chatsAwaitingAps[reqi] = opts;
            asyncApiReq(mccPacket)
                .catch(ex => {
                    this.logger.error(
                        "Failed to retrieve chatd ID from API, while trying to create a new room, mccReq:",
                        mccPacket,
                        ex
                    );
                });
        };

        Promise.allSettled(promises).then(_createChat).catch(dump);

        if (d) {
            console.assert(!protocolHandler.error, protocolHandler.error);
        }
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
ChatdIntegration.decryptMessageHelper = async function(message, chatRoom) {
    chatRoom = chatRoom || message.chatRoom;

    if (chatRoom._keysAreSeeding) {
        await chatRoom._keysAreSeeding.catch(dump);
    }

    const {userId, keyid} = message;
    const {notDecryptedKeys = {}, publicChatHandle, protocolHandler, logger, roomId} = chatRoom;

    const ndk = `${userId}-${keyid}`;
    const users = [userId];

    if (notDecryptedKeys[ndk]) {
        // users.push(notDecryptedKeys[ndk].userId);

        if (d) {
            logger.warn(`Required keys not seeded (@${userId}), trying to fixup...`, $.len(notDecryptedKeys));
        }

        const res = await chatRoom.seedRoomKeys(Object.values(notDecryptedKeys));
        assert(res.includes(ndk), `Failed to seed key for ${roomId}:${userId}...`);
    }
    await ChatdIntegration._ensureKeysAreLoaded(0, users, publicChatHandle);

    const decrypted = await Promise.resolve(protocolHandler.decryptFrom(message.message, userId, keyid, false));

    assert(decrypted, `Message can not be decrypted! ${roomId}:${userId}`);
    return decrypted;
};

ChatdIntegration.prototype.requiresUpdate = function(source) {
    if (window.location.toString().indexOf("/chat")) {
        $('.nw-fm-left-icon.cloud-drive').triggerHandler('click');
    }

    megaChat.destroy();
    megaChatIsDisabled = true;
    $('.nw-fm-left-icon.conversations').hide();

    // because msgDialog would be closed on location.hash change... we need to do this a bit later....
    Soon(function() {

        if (sessionStorage.chatUpdateIgnored === String(Chatd.VERSION)) {
            return;
        }
        sessionStorage.chatUpdateIgnored = Chatd.VERSION;

        if (is_extension) {
            msgDialog('warningb', l[1900], l[8841]);
        }
        else {
            msgDialog('confirmation', l[1900], l[8840], '', function(e) {
                if (e) {
                    location.reload();
                }
            });
        }
    });

    if (source) {
        sessionStorage.updateRequiredBy = source;
    }
};

ChatdIntegration._waitForProtocolHandler = async function(chatRoom, cb = nop) {

    if (chatRoom.protocolHandler) {
        return cb();
    }

    const name = `waitForProtocolHandler(${chatRoom.roomId})`;
    const done = () => {
        assert(chatRoom.protocolHandler instanceof strongvelope.ProtocolHandler, 'Unexpected PH-instance..');
        cb();
    };
    const fail = (ex) => {
        chatRoom.logger.error(name, ex);
        throw ex;
    };

    if (chatRoom.strongvelopeSetupPromises) {
        return chatRoom.strongvelopeSetupPromises.then(done).catch(fail);
    }

    return createTimeoutPromise(() => !!chatRoom.protocolHandler, 500, 15000, false, name).then(done).catch(fail);
};

ChatdIntegration.prototype.getMciphRequest = function(chatRoom) {
    if (
        chatRoom.protocolHandler &&
        chatRoom.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC &&
        chatRoom.protocolHandler.unifiedKey
    ) {
        var myKey = chatRoom.protocolHandler.packKeyTo([chatRoom.protocolHandler.unifiedKey], u_handle);
        return {
            a: 'mciph',
            ph: chatRoom.publicChatHandle,
            ck: base64urlencode(myKey),
            v: Chatd.VERSION
        };
    }

    console.error("Can't generate mciph request - missing unified key.");
};

ChatdIntegration.prototype.getMciphReqFromHandleAndKey = function(publicChatHandle, key) {
    assert(publicChatHandle);
    assert(key);
    assert(u_handle);
    assert(u_type !== false);

    var protocolHandler = new strongvelope.ProtocolHandler(
        u_handle,
        u_privCu25519,
        u_privEd25519,
        u_pubEd25519,
        strongvelope.CHAT_MODE.PUBLIC,
        false
    );
    protocolHandler.unifiedKey = base64urldecode(key);

    if (d) {
        console.assert(protocolHandler.unifiedKey, 'Invalid key provided..', key);
    }

    var myKey = protocolHandler.packKeyTo([protocolHandler.unifiedKey], u_handle);

    return {
        a: 'mciph',
        ph: publicChatHandle,
        ck: base64urlencode(myKey),
        v: Chatd.VERSION
    };

};

ChatdIntegration.prototype.joinChatViaPublicHandle = function(chatRoom) {
    var self = this;
    return new Promise((resolve, reject) => {
        if (chatRoom.protocolHandler && chatRoom.protocolHandler.unifiedKey) {
            loadingDialog.show();
            chatRoom.rebind('onMembersUpdated.jph' + chatRoom.chatId, function(e) {
                if (e.data.userId === u_handle && e.data.chatId === chatRoom.chatId) {
                    chatRoom.unbind('onMembersUpdated.jph' + chatRoom.chatId);
                    loadingDialog.hide();
                    resolve();
                }
            });

            asyncApiReq(this.getMciphRequest(chatRoom)).then((res) => {
                self.logger.info('mciph succeed...', res);
            }).catch((ex) => {
                loadingDialog.hide();
                if (ex === EEXPIRED) {
                    self.requiresUpdate(2);
                }
                else if (ex === ENOENT) {
                    msgDialog('warninga', l[20641], l[20642]);
                }
                else {
                    self.logger.warn('Unexpected mciph error...', ex);
                }
                reject();
            });
        }
        else {
            console.error("Missing unifiedKey.");
            reject();
        }
    });
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
            'mr',
            'callId',
            'w',
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

        if (Array.isArray(ret.sm)) {
            processMCSM(ret.sm, true);
        }

        // feed the chat link info in is_chatlink, since thats where its stored now
        if (is_chatlink) {
            is_chatlink.mr = chatInfo.mr;
            is_chatlink.callId = chatInfo.callId;
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

        if (window.is_chatlink && is_chatlink.pnh === isPublic) {
            return Promise.resolve(is_chatlink);
        }
    }
    else {
        if (this.chatd &&
            ((this.chatd.shards[chatShard] || false).s || false).readyState === WebSocket.OPEN
        ) {
            return Promise.resolve(this.chatd.shards[chatShard].url);
        }

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

    if (d > 2) {
        this.logger.warn('Retrieving Shard URL...', apiReq);
    }

    const req = asyncApiReq(apiReq)
        .then(([, res]) => {
            assert(res && String(res.url || res).includes('://'));
            return res;
        })
        .finally(() => {
            delete this.mcUrlInflightRequest[chatShard];
        });

    if (chatShard !== undefined) {
        this.mcUrlInflightRequest[chatShard] = req;
    }

    return req;
};

/**
 * Core func for opening a chat.
 *
 * @alias chatdIntegration.openChat
 * @param chatInfo {String|Object} can be either public chat handle (for pub chats) OR actionPacket from mcc/mcf
 * @param [isMcf] {undefined|bool}
 * @param [missingMcf] {undefined|bool}
 * @returns {Promise}
 */
ChatdIntegration.prototype.openChat = promisify(function(resolve, reject, chatInfo, isMcf, missingMcf) {
    var self = this;
    var publicChatHandle;

    if (isString(chatInfo)) {
        if (chatInfo.length !== 8) {
            return reject(ENOENT);
        }
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
                    self.requiresUpdate(3);
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
            var setAsActive = megaChat._chatsAwaitingAps[chatInfo.i];
            delete megaChat._chatsAwaitingAps[chatInfo.i];
            const mcoFlags = {};
            for (const flag of Object.values(MCO_FLAGS)) {
                mcoFlags[flag] = chatInfo[flag] || 0;
            }

            var r = self.megaChat.openChat(
                userHandles,
                (chatInfo.m === 1) ? "public" : (chatInfo.g === 1 ? "group" : "private"),
                chatInfo.id,
                chatInfo.cs,
                chatInfo.url,
                !!setAsActive,
                publicChatHandle ? publicChatHandle : undefined,
                self.megaChat.publicChatKeys[publicChatHandle],
                chatInfo.ck,
                chatInfo.mr === 1,
                mcoFlags
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
                    .then(() => {
                        if (setAsActive.createChatLink === true) {
                            createTimeoutPromise(validate2, 300, 2000)
                                .always(() => {
                                    if (chatRoom.isMeeting) {
                                        chatRoom.updatePublicHandle(false, true);
                                        return chatRoom.scheduledMeeting ? null : chatRoom.trigger('onNewMeetingReady');
                                    }
                                    chatRoom.trigger('showGetChatLinkDialog');
                                });
                        }
                    })
                    .catch(ex => {
                        this.logger.warn("Timed out waiting for protocolHandler, room title not set.", ex);
                    });
            }

            if (chatInfo.callId && !chatRoom.activeCallIds.exists(chatInfo.callId)) {
                chatRoom.activeCallIds.set(chatInfo.callId, []);
            }
        }
        else {
            if (chatRoom.ct !== chatInfo.ct) {
                chatRoom.ct = chatInfo.ct;
                chatInfo.topicChange = true;
            }
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

            chatRoom.isMeeting = chatInfo.mr === 1;

            if (chatInfo.callId && !chatRoom.activeCallIds.exists(chatInfo.callId)) {
                chatRoom.activeCallIds.set(chatInfo.callId, []);
            }
            let mcoFlagChanged = false;
            for (const key of Object.values(MCO_FLAGS)) {
                const apKey = chatInfo[key] || 0;
                if (chatRoom.options[key] !== apKey) {
                    chatRoom.options[key] = apKey;
                    mcoFlagChanged = true;
                }
            }
            if (mcoFlagChanged) {
                chatRoom.trackDataChange();
            }

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
                                const { scheduledMeeting } = chatRoom;
                                if (scheduledMeeting) {
                                    megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.LEAVE, scheduledMeeting);
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
        self.decryptTopic(chatRoom).catch(dump);

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

ChatdIntegration._waitForShardToBeAvailable = function(name, fn) {
    return async function(...args) {
        const [chatRoom] = args;
        const chatIdDecoded = base64urldecode(chatRoom.chatId);

        if (!this.chatd.chatIdShard[chatIdDecoded]) {
            assert(chatRoom instanceof ChatRoom && chatIdDecoded);

            await createTimeoutPromise(() => !!this.chatd.chatIdShard[chatIdDecoded], 500, 1e4, 0, `wfShard.${name}`)
                .catch((ex) => {
                    chatRoom.logger.error(`Timed out waiting for shard to be available (${name})`, ex, args);
                    throw ex;
                });
        }

        return fn.apply(this, args);
    };
};


ChatdIntegration._waitUntilChatIdIsAvailable = function(name, fn) {
    return async function(...args) {
        const [chatRoom] = args;

        if (!chatRoom.chatId) {
            assert(chatRoom instanceof ChatRoom);

            await this._retrieveChatdIdIfRequired(chatRoom)
                .catch((ex) => {
                    chatRoom.logger.error(`Failed to retrieve chatId while invoking '${name}'`, ex, args);
                    throw ex;
                });
        }

        return fn.apply(this, args);
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

ChatdIntegration._ensureKeysAreLoaded = async function(messages, users, chathandle) {
    if (chathandle) {
        return;
    }
    if (messages && messages.length === 0 && users && users.length === 0) {
        // speed up a little bit, by skipping the .isArray checks.
        return;
    }

    const promises = [];
    const seen = Object.create(null);
    const queue = (userId) => {

        if (userId && !seen[userId] && userId !== strongvelope.COMMANDER) {
            seen[userId] = 1;

            if (!pubCu25519[userId]) {
                promises.push(crypt.getPubCu25519(userId));
            }
            if (!pubEd25519[userId]) {
                promises.push(crypt.getPubEd25519(userId));
            }
        }
    };

    if (Array.isArray(messages)) {
        for (let i = messages.length; i--;) {
            queue(messages[i].userId);
        }
    }

    if (Array.isArray(users)) {
        for (let i = users.length; i--;) {
            queue(users[i]);
        }
    }
    else if (users instanceof Set) {
        users.forEach(queue);
    }

    return promises.length && Promise.allSettled(promises);
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
                else if (origTextContents[2] === Message.MESSAGE_META_TYPE.GIPHY) {
                    message.metaType = Message.MESSAGE_META_TYPE.GIPHY;
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
        message.wrappedChatDialogMessage = chatRoom.megaChat.plugins.callManager2.remoteEndCallToDialogMsg(
            chatRoom,
            message
        );
    }
    else if (message.dialogType === "remoteCallStarted") {
        message.wrappedChatDialogMessage = chatRoom.megaChat.plugins.callManager2.remoteStartedCallToDialogMsg(
            chatRoom,
            message
        );
    }
};

ChatdIntegration.prototype._attachToChatRoom = promisify(function(resolve, reject, chatRoom) {
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

    chatRoom.rebind('onRoomDisconnected.chatdInt' + chatRoomId, function() {
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

    if (chatRoom.messagesBuff) {
        resolve();
    }
    else {
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

                    ChatdIntegration._ensureKeysAreLoaded(0, participants, chatRoom.publicChatHandle).then(() => {
                        var topic = chatRoom.protocolHandler.embeddedEncryptTo(
                            chatRoom.topic,
                            strongvelope.MESSAGE_TYPES.TOPIC_CHANGE,
                            participants,
                            undefined,
                            chatRoom.type === "public"
                        );

                        if (topic) {
                            if (chatRoom.type === 'public') {
                                const chatKey =
                                    chatRoom.protocolHandler.packKeyTo([chatRoom.protocolHandler.unifiedKey], h);
                                const chatKeyEncoded = base64urlencode(chatKey);
                                assert(
                                    chatKeyEncoded && chatKeyEncoded.length === 32,
                                    'onAddUserRequest: invalid chat key passed.'
                                );

                                return asyncApiReq({
                                    "a": "mci",
                                    "id": chatRoom.chatId,
                                    "u": h,
                                    "p": 2,
                                    "ct": base64urlencode(topic),
                                    "ck": chatKeyEncoded,
                                    "v": Chatd.VERSION
                                });
                            }

                            return asyncApiReq({
                                "a": "mci",
                                "id": chatRoom.chatId,
                                "u": h,
                                "p": 2,
                                "ct": base64urlencode(topic),
                                "v": Chatd.VERSION
                            });
                        }
                    }).catch(dump);
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
                        const chatKey = chatRoom.protocolHandler.packKeyTo([chatRoom.protocolHandler.unifiedKey], h);
                        const chatKeyEncoded = base64urlencode(chatKey);
                        assert(
                            chatKeyEncoded && chatKeyEncoded.length === 32,
                            'onAddUserRequest: invalid chat key passed.'
                        );
                        req.ck = chatKeyEncoded;
                    }

                    asyncApiReq(req).catch(dump);
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
                        chatRoom.logger.error('Failed to decrypt message!', ex);
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
            .then((res) => {
                for (let i = res.length; i--;) {
                    if (res[i].status !== 'fulfilled') {
                        throw res[i].reason;
                    }
                }

                // after all dependencies (data) is initialised, lets init the protocol handler and others
                if (is_chatlink) {
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

                if (d && !chatRoom.ck && chatRoom.type === "public") {
                    chatRoom.logger.warn('chat-key missing at protocol-handler installation..', chatRoom);
                }

                chatRoom.protocolHandler.setAssocChatRoom(chatRoom);

                Object.keys(chatRoom.members).forEach(function(member) {
                    chatRoom.protocolHandler.addParticipant(member);
                });

                if (chatRoom.ck && (chatRoom.type === "public")) {

                    if (!chatRoom.protocolHandler.gotRsaFailure) {
                        // @todo what's the point of this decryptUnifiedkey() ?
                        // i.e. the unifiedKey should have been set already at ProtocolHandler instance creation,
                        // this function additionally does wait for _ensureKeysAreLoaded() which we did here already.
                        self.decryptUnifiedkey(chatRoom).then(() => self.decryptTopic(chatRoom)).catch(nop);
                    }
                }
                else if (chatRoom.publicChatKey && (chatRoom.type === "public")) {
                    chatRoom.protocolHandler.unifiedKey = base64urldecode(chatRoom.publicChatKey);
                }
                else {
                    self.decryptTopic(chatRoom).catch(dump);
                }
                self.join(chatRoom);
                delete chatRoom.strongvelopeSetupPromises;
                resolve(chatRoom);
            })
            .catch((ex) => {
                if (d && ex instanceof Error) {
                    self.logger.error(
                        "Failed to pre-load keys before initialising strongvelope. " +
                        "Can't initialise strongvelope for this chat: ",
                        chatRoom.roomId,
                        waitingForPromises,
                        ex
                    );
                }
                reject(ex);
            });
    }

    chatRoom.trigger('onChatdIntegrationReady');
});

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
                    topic: decryptedResult.payload,
                    isScheduled: !!msgInstance.chatRoom.scheduledMeeting
                };
                msgInstance.dialogType = "topicChange";

                if (isNewMessage && (is_chatlink || !msgInstance.chatRoom.membersSetFromApi.members[u_handle])) {
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
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.MESSAGES_RETENTION) {
            msgInstance.dialogType = 'messageRetention';
            msgInstance.meta = {
                userId: decryptedResult.sender,
                retentionTime: Chatd.unpack32le(decryptedResult.payload),
            };
        }
        else if (decryptedResult.type === strongvelope.MESSAGE_TYPES.SCHEDULE_MEET) {
            msgInstance.dialogType = 'scheduleMeta';
            msgInstance.meta = megaChat.plugins.meetingsManager
                .getFormattingMeta(decryptedResult.handle, decryptedResult, chatRoom);
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
    return this._decryptTopicHelper(chatRoom)
        .catch((ex) => {
            const {logger, gotRsaFailure} = chatRoom.protocolHandler.setError(ex);

            if (d && !gotRsaFailure || d > 2) {
                if (gotRsaFailure) {
                    logger.debug('Could not decrypt topic.', ex);
                }
                else {
                    this.logger.warn(`Could not decrypt topic in room ${chatRoom.chatId}`, ex);
                }
            }
            throw ex;
        });
};

ChatdIntegration.prototype._decryptTopicHelper = async function(chatRoom) {
    if (!chatRoom.ct) {
        if (d > 2) {
            this.logger.warn(`Premature decryptTopic() invocation for chat-room ${chatRoom.chatId}`);
        }
        return;
    }
    if (!chatRoom.protocolHandler) {
        await ChatdIntegration._waitForProtocolHandler(chatRoom);
    }
    const parsedMessage = strongvelope._parseMessageContent(base64urldecode(chatRoom.ct));
    await ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedMessage.invitor], chatRoom.publicChatHandle);
    const decryptedCT = await Promise.resolve(chatRoom.protocolHandler.decryptFrom(base64urldecode(chatRoom.ct)));

    chatRoom.topic = decryptedCT.payload;
};

ChatdIntegration.prototype.decryptUnifiedkey = async function(chatRoom) {
    assert(chatRoom.protocolHandler, `Protocol-handler does not exists for chat-room ${chatRoom.chatId}`);

    const parsedKey = strongvelope.unpackKey(base64urldecode(chatRoom.ck));
    await ChatdIntegration._ensureKeysAreLoaded(undefined, [parsedKey.sender], chatRoom.publicChatHandle);
    const decryptedKeys = chatRoom.protocolHandler._decryptKeysFrom(parsedKey.senderKey, parsedKey.sender);

    chatRoom.protocolHandler.unifiedKey = decryptedKeys[0];
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

ChatdIntegration.prototype.markMessageAsReceived = function(chatRoom) {
    if (!chatRoom.stateIsLeftOrLeaving()) {
        // Temporarily disabled, until we get into the state in which we need this again in the UI:
        // self.chatd.cmd(Chatd.Opcode.RECEIVED, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
    }
};

ChatdIntegration.prototype.sendMessage = async function(chatRoom, messageObject) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    const messageContents = messageObject.textContents || messageObject.message || "";

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

    // chatRoom.logger.warn('sendMessage', promises.length, !chatRoom.protocolHandler, messageObject);

    await Promise.all([...promises, ChatdIntegration._waitForProtocolHandler(chatRoom)]);

    var refs = this.chatd.msgreferencelist(base64urldecode(chatRoom.chatId));
    var refids = [];
    for (var i = 0; i < refs.length; i++) {
        var foundMessage = chatRoom.messagesBuff.getByInternalId(refs[i]);
        if (foundMessage) {
            if (foundMessage.msgIdentity) {
                refids.push(foundMessage.msgIdentity);
            }
        }
        else if (chatRoom.messagesBuff.messages[refs[i]]
            && chatRoom.messagesBuff.messages[refs[i]].msgIdentity) {

            refids.push(chatRoom.messagesBuff.messages[refs[i]].msgIdentity);
        }
    }

    const result = chatRoom.protocolHandler.encryptTo(messageContents, refids);
    assert(Array.isArray(result) && result.length && 'type' in result[0], 'encryptTo() failed.');

    const keyid = chatRoom.protocolHandler.getKeyId();
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

    return this.chatd.submit(
        base64urldecode(chatRoom.chatId),
        result,
        keyid,
        messageObject.isPostedAttachment
    );
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
            return self.chatd.chatdPersist.getMessageByOrderValue(chatRoom.chatId, msgnum)
                .then((r) => {
                    assert(r && r.length, `Message not found..${r},${msgnum}`);

                    msg = r[0];
                    assert(msg && msg.userId, `Invalid message ${msgnum}`, msg);

                    return self.chatd.chatdPersist.retrieveAndLoadKeysFor(chatRoom.chatId, msg.userId, msg.keyId);
                })
                .then(() => {
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

                    return self.updateMessage(chatRoom, msgnum, newMessage);
                })
                .catch((ex) => {
                    console.error(
                        "Update message failed, msgNum was not found in either .buf, .sendingbuf or messagesBuff",
                        msgnum, ex
                    );
                });
        }

        foundMsg = chatRoom.messagesBuff.getByInternalId(msgnum);
        msgnum &= 0xffffffff;
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

ChatdIntegration.prototype.destroy = function() {
    mBroadcaster.removeListener(this.mBApListener);
};

ChatdIntegration.prototype.updateScheduledMeeting = async function(options, scheduledMeetingId, chatId) {
    const { timezone, startDateTime, endDateTime, topic, description, sendInvite, recurring } = options;
    const { encodeData } = megaChat.plugins.meetingsManager;
    const scheduledMeeting = megaChat.plugins.meetingsManager.getMeetingById(scheduledMeetingId);

    options.f = sendInvite ? 0x01 : 0x00;
    if (!scheduledMeeting.isSameAsOpts(options)) {
        let ct = scheduledMeeting.chatRoom.ct;
        if (topic !== scheduledMeeting.chatRoom.getRoomTitle()) {
            const { protocolHandler, type } = scheduledMeeting.chatRoom;
            const participants = protocolHandler.getTrackedParticipants();
            await ChatdIntegration._ensureKeysAreLoaded(undefined, participants);
            ct = ChatRoom.encryptTopic(protocolHandler, topic, participants, type === 'public') || undefined;
        }
        const res = await asyncApiReq({
            a: 'mcsmp',
            id: scheduledMeetingId,
            cid: chatId,
            tz: encodeData(timezone),
            s: startDateTime / 1000,
            e: endDateTime / 1000,
            t: encodeData(topic),
            d: encodeData(description) || '',
            f: sendInvite ? 0x01 : 0x00,
            // [...] TODO: refactor, clean-up, unify w/ `createMeeting`
            ...recurring && {
                r: {
                    f: recurring.frequency,
                    wd: recurring.weekDays,
                    md: recurring.monthDays,
                    mwd: recurring.offset,
                    ...recurring.end && { u: recurring.end / 1000 },
                    ...recurring.interval && { i: recurring.interval }
                }
            },
            ct,
        }).catch(ex => {
            this.logger.error(
                `Failed to update scheduled meeting ${scheduledMeetingId}, chatId: ${chatId}, error: ${ex}`
            );
            throw ex;
        });
        this.logger.info(`Updated scheduled meeting ${res}, chatId: ${chatId}`);
        return res;
    }
};

ChatdIntegration.prototype.cancelScheduledMeeting = async function(scheduledMeeting, chatId) {
    const { encodeData } = megaChat.plugins.meetingsManager;
    const res = await asyncApiReq({
        a: 'mcsmp',
        id: scheduledMeeting.id,
        cid: chatId,
        tz: encodeData(scheduledMeeting.timezone),
        s: scheduledMeeting.start / 1000,
        e: scheduledMeeting.end / 1000,
        t: encodeData(scheduledMeeting.title),
        d: encodeData(scheduledMeeting.description) || '',
        c: 1,
        f: scheduledMeeting.flags,
        ...scheduledMeeting.recurring && {
            r: {
                f: scheduledMeeting.recurring.frequency,
                wd: scheduledMeeting.recurring.weekDays,
                md: scheduledMeeting.recurring.monthDays,
                // TODO: refactor re: tuple format, helper
                mwd: scheduledMeeting.recurring.offset && Object.keys(scheduledMeeting.recurring.offset).length ?
                    [[scheduledMeeting.recurring.offset.value, scheduledMeeting.recurring.offset.weekDay]] :
                    [],
                ...scheduledMeeting.recurring.end && { u: scheduledMeeting.recurring.end / 1000 },
                ...scheduledMeeting.recurring.interval && { i: scheduledMeeting.recurring.interval }
            }
        }
    })
        .catch(ex => {
            this.logger.error(
                `Failed to cancel scheduled meeting ${scheduledMeeting.id}, chatId: ${chatId}, error: ${ex}`
            );
            throw ex;
        });
    this.logger.info(`Canceled scheduled meeting ${res}, chatId: ${chatId}`);
    return res;
};

ChatdIntegration.prototype.deleteScheduledMeeting = async function(scheduledMeetingId, chatId) {
    const res = await asyncApiReq({ a: 'mcsmr', id: scheduledMeetingId, i: chatId })
        .catch(ex => {
            this.logger.error(`Failed to cancel remove meeting ${scheduledMeetingId}, chatId: ${chatId}, error: ${ex}`);
            throw ex;
        });
    this.logger.info(`Removed scheduled meeting ${res}, chatId: ${chatId}`);
    return res;
};

// decorate ALL functions which require shard to be available before executing
[
    'retrieveHistory',
    'markMessageAsSeen',
    'markMessageAsReceived',
    'sendMessage',
    'updateMessage'
].forEach((fnName) => {
    ChatdIntegration.prototype[fnName] =
        ChatdIntegration._waitForShardToBeAvailable(fnName, ChatdIntegration.prototype[fnName]);
});


// decorate ALL functions which require a valid chat ID
[
    'join',
    'retrieveHistory',
    'markMessageAsSeen',
    'markMessageAsReceived',
    'sendMessage',
    'updateMessage'
].forEach((fnName) => {
    ChatdIntegration.prototype[fnName] =
        ChatdIntegration._waitUntilChatIdIsAvailable(fnName, ChatdIntegration.prototype[fnName]);
});

scope.ChatdIntegration = ChatdIntegration;
})(window);
