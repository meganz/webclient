export default class ChatRouting {
    constructor(megaChatInstance) {
        this.megaChat = megaChatInstance;
    }
    openCustomView(sectionName) {
        let megaChat = this.megaChat;
        megaChat.routingSection = sectionName;
        megaChat.hideAllChats();
        delete megaChat.lastOpenedChat;
    }
    route(resolve, reject, location, event) {
        if (!M.chat) {
            console.error('This function is meant to navigate within the chat...');
            return;
        }
        let megaChat = this.megaChat;

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

        M.currentdirid = String(page = location).replace('fm/', '');
        if (location.substr(0, 13) === "chat/contacts") {
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
                        msgDialog('warninga', l[20641], l[20642], 0, function() {
                            loadSubPage(anonymouschat ? 'start' : 'fm/chat', event);
                        });
                    }
                    else {
                        if (String(location).startsWith('chat')) {
                            location = location === 'chat' ? 'fm' : 'chat';
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
}

