export default class ChatRouting {
    static gPageHandlers = {
        async start({location}) {
            // show last seen/active chat.
            return megaChat.onChatsHistoryReady(15e3)
                .then(() => {
                    return page === location ? megaChat.renderListing() : EACCESS;
                });
        },
        async redirect(target, path = 'fm/chat') {
            target.location = path;
            return ChatRouting.gPageHandlers.start(target);
        },
        async new_meeting(target) {
            megaChat.trigger('onStartNewMeeting');
            return ChatRouting.gPageHandlers.redirect(target);
        },
        async contacts({section, args}) {

            this.openCustomView(section);

            const [, target = ''] = args;

            if (target.length === 11) {
                megaChat.routingSubSection = "contact";
                megaChat.routingParams = target;
            }
            else if (target === "received" || target === "sent") {
                megaChat.routingSubSection = target;
            }
        }
    };

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
        const args = String(location || '').split('/').map(String.trim).filter(String);

        if (args[0] === 'fm') {
            args.shift();
        }
        if (args[0] === 'chat') {
            args.shift();
        }

        const [section] = args;
        const {megaChat} = this;

        if (d) {
            megaChat.logger.warn('navigate(%s)', location, args);
        }
        args.route = {location, section, args};

        if (isLandingPage) {
            megaChat.eventuallyInitMeetingUI();
        }
        megaChat.routingSection = 'chat';
        megaChat.routingSubSection = null;
        megaChat.routingParams = null;

        const handler = ChatRouting.gPageHandlers[section || 'start'];

        if (handler) {
            handler.call(this, args.route).then(resolve).catch(reject);
            resolve = null;
        }
        else {
            let roomId = String(args[(section === 'c' || section === 'g' || section === 'p') | 0] || '');
            if (roomId.includes('#')) {
                let key = roomId.split('#');
                roomId = key[0];
                key = key[1];

                megaChat.publicChatKeys[roomId] = key;
                roomId = megaChat.handleToId[roomId] || roomId;
            }

            const room = megaChat.getChatById(roomId);
            if (room) {
                room.show();
                args.route.location = room.getRoomUrl();
            }
            else if (!roomId || roomId === u_handle) {
                ChatRouting.gPageHandlers.redirect(args.route, 'fm/chat').then(resolve).catch(reject);
                resolve = null;
            }
            else if (section === 'p') {
                megaChat.smartOpenChat([u_handle, roomId], 'private', undefined, undefined, undefined, true)
                    .then(resolve)
                    .catch(reject);
                resolve = null;
            }
            else {
                megaChat.plugins.chatdIntegration.openChat(roomId)
                    .then(chatId => {
                        megaChat.getChatById(chatId).show();
                        return chatId;
                    })
                    .catch(ex => {
                        if (d && ex !== ENOENT) {
                            console.warn('If "%s" is a chat, something went wrong..', roomId, ex);
                        }

                        // did we move elsewhere meanwhile?
                        if (page !== location) {
                            // yep, another concurrent navigate() might be ongoing.
                            return EEXPIRED;
                        }
                        megaChat.cleanup(true);


                        // @todo could there be an endless redirection with the fm-side not picking this page/location
                        // and this reached back again for it? if so, catch it and invoke openCustomView(notFound) (?)


                        if (ex === ENOENT && megaChat.publicChatKeys[roomId]) {
                            msgDialog('warninga', l[20641], l[20642], 0, () => {
                                loadSubPage(is_chatlink ? 'start' : 'fm/chat', event);
                            });
                        }
                        else {
                            if (String(location).startsWith('chat')) {
                                location = 'fm/chat';
                            }
                            loadSubPage(location, location.includes('chat') ? 'override' : event);
                        }
                        return EACCESS;
                    })
                    .then(resolve)
                    .catch(reject);

                resolve = null;
            }
        }

        if (resolve) {
            onIdle(resolve);
        }
        megaChat.safeForceUpdate();

        if (args.route.location !== location) {
            location = args.route.location;
        }

        const method = page === 'chat' || page === 'fm/chat' || page === location
        || event && event.type === 'popstate' ? 'replaceState' : 'pushState';

        mBroadcaster.sendMessage('beforepagechange', location);
        M.currentdirid = String(page = location).replace('fm/', '');

        if (location.substr(0, 13) === "chat/contacts") {
            // ensure that chat/contacts is always opened with fm/ prefix
            location = "fm/" + location;
        }

        history[method]({subpage: location}, "", (hashLogic ? '#' : '/') + location);
        mBroadcaster.sendMessage('pagechange', page);
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

