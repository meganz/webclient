export default class ChatRouting {
    constructor(megaChatInstance) {
        this.megaChat = megaChatInstance;
    }
    openCustomView(sectionName) {
        const megaChat = this.megaChat;
        megaChat.routingSection = sectionName;
        megaChat.hideAllChats();
        delete megaChat.lastOpenedChat;
    }
    route(resolve, reject, location, event, isLandingPage) {
        if (!M.chat) {
            console.error('This function is meant to navigate within the chat...');
            return;
        }

        let megaChat = this.megaChat;

        if (isLandingPage) {
            megaChat.eventuallyInitMeetingUI();
        }


        var args = String(location || '').split('/').map(String.trim).filter(String);

        if (args[0] === 'fm') {
            args.shift();
        }
        if (args[0] === 'chat') {
            args.shift();
        }

        if (d) {
            megaChat.logger.warn('navigate(%s)', location, args);
        }

        var sectionName = args[0];
        // TODO: this.displayArchivedChats = type === 'archived';
        megaChat.routingSection = null;
        megaChat.routingSubSection = null;
        megaChat.routingParams = null;

        // Note: Order of if's should be kept as "Most commonly used -> Less commonly used"
        if (sectionName === 'c' || sectionName === 'g' || sectionName === 'p') {
            this.megaChat.routingSection = 'chat';

            [resolve, location] = this.routeChat(resolve, reject, location, sectionName, args);
        }
        else if (sectionName === "new_meeting") {
            megaChat.trigger('onStartNewMeeting');
            loadSubPage("/fm/chat");
            return;
        }
        else if (!sectionName) {
            this.megaChat.routingSection = 'chat';

            // show last seen/active chat.
            megaChat.onChatsHistoryReady(15e3)
                .then(() => {
                    return page === location ? megaChat.renderListing() : EACCESS;
                })
                .then(resolve)
                .catch(reject);
            resolve = null;
        }
        else if (sectionName === 'contacts') {
            this.openCustomView(sectionName);
            if (args[1] === "received" || args[1] === "sent") {
                megaChat.routingSubSection = args[1];
            }
            if (args[1] && args[1].length === 11) {
                megaChat.routingSubSection = "contact";
                megaChat.routingParams = args[1];
            }
        }
        else if (sectionName === 'archived') {
            this.openCustomView(sectionName);
        }
        else {
            let hasHashChar = sectionName.indexOf("#");
            if (hasHashChar > -1 && sectionName.substr(0, hasHashChar).length === 8) {
                [resolve, location] = this.routeChat(resolve, reject, location, sectionName, args);
            }
            else {
                this.openCustomView("notFound");
            }
        }

        if (resolve) {
            onIdle(resolve);
        }
        megaChat.safeForceUpdate();

        const method = page === 'chat' || page === 'fm/chat' || page === location
        || event && event.type === 'popstate' ? 'replaceState' : 'pushState';

        mBroadcaster.sendMessage('beforepagechange', location);
        M.currentdirid = String(page = location).replace('fm/', '');
        if (location.substr(0, 13) === "chat/contacts" || location.substr(0, 13) === "chat/archived") {
            // ensure that chat/contacts is always opened with fm/ prefix
            location = "fm/" + location;
        }
        history[method]({subpage: location}, "", (hashLogic ? '#' : '/') + location);
        mBroadcaster.sendMessage('pagechange', page);
    }
    routeChat(resolve, reject, location, sectionName, args) {
        let megaChat = this.megaChat;
        megaChat.routingSection = 'chat';

        var roomId = args[(sectionName === 'c' || sectionName === 'g' || sectionName === 'p') | 0];
        if (roomId.indexOf('#') > 0) {
            var key = roomId.split('#');
            roomId = key[0];
            key = key[1];

            megaChat.publicChatKeys[roomId] = key;
            roomId = megaChat.handleToId[roomId] || roomId;
        }

        var room = megaChat.getChatById(roomId);
        if (room) {
            room.show();
            location = room.getRoomUrl();
        }
        else if (sectionName === 'p') {
            if (roomId === u_handle) {
                return loadSubPage('/fm/chat');
            }
            megaChat.smartOpenChat([u_handle, roomId], 'private', undefined, undefined, undefined, true)
                .then(resolve)
                .catch(reject);
            resolve = null;
        }
        else {
            let done = resolve;
            megaChat.plugins.chatdIntegration.openChat(roomId)
                .then(chatId => {
                    megaChat.getChatById(chatId).show();
                    done(chatId);
                })
                .catch(ex => {
                    if (d && ex !== ENOENT) {
                        console.warn('If "%s" is a chat, something went wrong..', roomId, ex);
                    }

                    if (ex === ENOENT && megaChat.publicChatKeys[roomId]) {
                        msgDialog('warninga', l[20641], l[20642], 0, () => {
                            loadSubPage(is_chatlink ? 'start' : 'fm/chat', event);
                        });
                    }
                    else {
                        if (String(location).startsWith('chat')) {
                            location = 'fm/chat';
                        }
                        M.currentdirid = M.chat = page = false;
                        loadSubPage(location, event);
                    }
                    done(EACCESS);
                });
            resolve = null;
        }

        return [resolve, location];
    }

    initFmAndChat(targetChatId) {
        assert(!fminitialized);
        return new Promise((res, rej) => {
            // reset, so that once the fm and chat had initialized the browser won't always redirect back to the chat
            // link, but allow whoever is using this method to navigate where they want.
            M.currentdirid = targetChatId ? "fm/chat/" + targetChatId : undefined;
            loadSubPage('fm');

            mBroadcaster.once('chat_initialized', () => {
                authring.onAuthringReady()
                    .then(res, rej);
            });
        });
    }
    reinitAndOpenExistingChat(chatId, publicChatHandle = false, cbBeforeOpen = undefined) {
        const chatUrl = "fm/chat/c/" + chatId;
        publicChatHandle = publicChatHandle || megaChat.initialPubChatHandle;
        const meetingDialogClosed = megaChat.meetingDialogClosed;
        megaChat.destroy();
        is_chatlink = false;

        loadingDialog.pshow();

        return new Promise((resolve, reject) => {
            this.initFmAndChat(chatId)
                .always(() => {
                    megaChat.initialPubChatHandle = publicChatHandle;
                    megaChat.initialChatId = chatId;
                    megaChat.meetingDialogClosed = meetingDialogClosed;

                    const next = () => {
                        mBroadcaster.once('pagechange', () => {
                            // prevent recursion
                            onIdle(() => {
                                loadingDialog.phide();
                                megaChat.renderListing(chatUrl, true)
                                    .catch((ex) => {
                                        console.error("Failed to megaChat.renderListing:", ex);
                                        reject(ex);
                                    })
                                    .always(() => {
                                        megaChat.updateKeysInProtocolHandlers();
                                        const chatRoom = megaChat.getChatById(chatId);
                                        assert(chatRoom);
                                        if (chatRoom.state === ChatRoom.STATE.READY) {
                                            resolve(chatRoom);
                                        }
                                        else {
                                            chatRoom.rebind('onMessagesHistoryDone.reinitAndOpenExistingChat', () => {
                                                if (chatRoom.state === ChatRoom.STATE.READY) {
                                                    resolve(chatRoom);
                                                    chatRoom.unbind('onMessagesHistoryDone.reinitAndOpenExistingChat');
                                                }
                                            });
                                        }
                                    });
                            });
                        });

                        loadSubPage(chatUrl);
                    };
                    if (cbBeforeOpen) {
                        cbBeforeOpen().then(next, (ex) => {
                            console.error(
                                "Failed to execute `cbBeforeOpen`, got a reject of the returned promise:",
                                ex
                            );
                        });
                    }
                    else {
                        next();
                    }
                })
                .catch((ex) => reject(ex));
        });
    }
    reinitAndJoinPublicChat(chatId, initialPubChatHandle, publicChatKey) {
        initialPubChatHandle = initialPubChatHandle || megaChat.initialPubChatHandle;
        const meetingDialogClosed = megaChat.meetingDialogClosed;
        megaChat.destroy();
        is_chatlink = false;

        loadingDialog.pshow();

        return new Promise((res, rej) => {
            this.initFmAndChat(chatId)
                .then(() => {
                    megaChat.initialPubChatHandle = initialPubChatHandle;
                    megaChat.initialChatId = chatId;
                    megaChat.meetingDialogClosed = meetingDialogClosed;

                    // generate key for mciphReq
                    const mciphReq = megaChat.plugins.chatdIntegration.getMciphReqFromHandleAndKey(
                        initialPubChatHandle,
                        publicChatKey
                    );

                    const isReady = (chatRoom) => {
                        if (chatRoom.state === ChatRoom.STATE.READY) {
                            res(chatRoom);
                            loadingDialog.phide();
                        }
                        else {
                            chatRoom.rebind('onMessagesHistoryDone.reinitAndOpenExistingChat', () => {
                                if (chatRoom.state === ChatRoom.STATE.READY) {
                                    res(chatRoom);
                                    loadingDialog.phide();
                                    chatRoom.unbind('onMessagesHistoryDone.reinitAndOpenExistingChat');
                                }
                            });
                        }
                    };

                    const join = () => {
                        // Because rooms may exist in case we were previously a part of them, we need to handle this in
                        // 2 diff ways
                        const existingRoom = megaChat.getChatById(chatId);
                        if (!existingRoom) {
                            megaChat.rebind('onRoomInitialized.reinitAndJoinPublicChat', (e, megaRoom) => {
                                if (megaRoom.chatId === chatId) {
                                    megaRoom.setActive();
                                    isReady(megaRoom);
                                    megaChat.unbind('onRoomInitialized.reinitAndJoinPublicChat');
                                }
                            });
                        }
                        else {
                            existingRoom.setActive();
                            isReady(existingRoom);
                        }
                    };
                    join();


                    M.req(mciphReq)
                        .then(() => {
                            join();
                        })
                        .catch((ex) => {
                            if (ex === -12) {
                                // already in the room.
                                join();
                            }
                            else {
                                loadingDialog.phide();
                                console.error("Bad response for mciphReq:", mciphReq, ex);
                                rej(ex);
                            }
                        });
                });
        });
    }
}

