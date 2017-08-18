var React = require("react");
var ReactDOM = require("react-dom");
var ConversationsUI = require("./ui/conversations.jsx");
var ChatRoom = require('./chatRoom.jsx');

var EMOJI_DATASET_VERSION = 2;

var chatui;
var webSocketsSupport = typeof(WebSocket) !== 'undefined';

(function() {
    chatui = function(id) {
        var roomOrUserHash = id.replace("chat/", "");

        var roomType = false;

        if (roomOrUserHash.substr(0, 2) === "g/") {
            roomType = "group";
            roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
            if (!megaChat.chats[roomOrUserHash]) {
                // chat not found
                setTimeout(function () {
                    loadSubPage('fm/chat');
                    M.openFolder('chat');
                }, 100);
                return;
            }
        }
        else {
            if (!M.u[roomOrUserHash]) {
                setTimeout(function () {
                    loadSubPage('fm/chat');
                    M.openFolder('chat');
                }, 100);
                return;
            }
            else {
                roomType = "private";
            }
        }
        // XX: code maintanance: move this code to MegaChat.constructor() and .show(jid)
        hideEmptyGrids();

        $('.fm-files-view-icon').addClass('hidden');
        $('.fm-blocks-view').addClass('hidden');
        $('.files-grid-view').addClass('hidden');
        $('.fm-right-account-block').addClass('hidden');
        $('.contacts-details-block').addClass('hidden');

        $('.shared-grid-view,.shared-blocks-view').addClass('hidden');


        $('.fm-right-files-block[data-reactid]').removeClass('hidden');
        $('.fm-right-files-block:not([data-reactid])').addClass('hidden');

        megaChat.refreshConversations();

        if (roomType === "private") {
            var userHandle = id.split("chat/").pop();
            var userHandles = [
                u_handle,
                userHandle
            ];
            var $promise;

            var resp = megaChat.openChat(userHandles, "private", undefined, undefined, undefined, true);

            if (resp instanceof MegaPromise) {
                if (resp.state() === 'rejected') {
                    console.warn("openChat failed. Maybe tried to start a private chat with a non contact?");
                    return;
                }
            }
            else {
                $promise = resp[2];
                if (resp[1]) {
                    resp[1].show();
                }
            }
        }
        else if(roomType === "group") {
            megaChat.chats[roomOrUserHash].show();
        }
        else {
            console.error("Unknown room type.");
            return;
        }




        // since .fm-chat-block is out of the scope of the CovnersationsApp, this should be done manually :(
        $('.fm-chat-block').removeClass('hidden');

    };
})();


/**
 * Used to differentiate MegaChat instances running in the same env (tab/window)
 *
 * @type {number}
 */
var megaChatInstanceId = 0;

/**
 * MegaChat - UI component that links XMPP/Strophejs (via Karere) w/ the Mega's UI
 *
 * @returns {Chat}
 * @constructor
 */
var Chat = function() {
    var self = this;


    this.is_initialized = false;
    this.logger = MegaLogger.getLogger("chat");

    this.chats = new MegaDataMap();
    this.currentlyOpenedChat = null;
    this.lastOpenedChat = null;
    this._myPresence = localStorage.megaChatPresence;

    this.options = {
        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
        'loadbalancerService': 'gelb.karere.mega.nz',
        'rtc': {
            iceServers:[
                // {urls: ['stun:stun.l.google.com:19302']},
                {
                    urls: ['turn:trn.karere.mega.nz:3478?transport=udp'],   // Luxembourg
                    username: "inoo20jdnH",
                    credential: '02nNKDBkkS'
                }
            ]
        },
        filePickerOptions: {
        },
        /**
         * Really simple plugin architecture
         */
        'plugins': {
            'chatdIntegration': ChatdIntegration,
            'callManager': CallManager,
            'urlFilter': UrlFilter,
            'emoticonShortcutsFilter': EmoticonShortcutsFilter,
            'emoticonsFilter': EmoticonsFilter,
            'callFeedback': CallFeedback,
            'presencedIntegration': PresencedIntegration,
            'persistedTypeArea': PersistedTypeArea
        },
        'chatNotificationOptions': {
            'textMessages': {
                'incoming-chat-message': {
                    'title': "Incoming chat message",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return "You have new incoming chat message from: " + params.from;
                    }
                },
                'incoming-attachment': {
                    'title': "Incoming attachment",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return params.from + " shared " + (
                                params.attachmentsCount > 1 ? params.attachmentsCount +" files" : "a file"
                            );
                    }
                },
                'incoming-voice-video-call': {
                    'title': "Incoming call",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return l[5893].replace('[X]', params.from); // You have an incoming call from [X].
                    }
                },
                'call-terminated': {
                    'title': "Call terminated",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return l[5889].replace('[X]', params.from); // Call with [X] ended.
                    }
                }
            },
            'sounds': [
                'alert_info_message',
                'error_message',
                'incoming_chat_message',
                'incoming_contact_request',
                'incoming_file_transfer',
                'incoming_voice_video_call',
                'hang_out',
            ]
        },
        'chatStoreOptions': {
            'autoPurgeMaxMessagesPerRoom': 1024
        }
    };

    this.instanceId = megaChatInstanceId++;

    this.plugins = {};

    self.filePicker = null; // initialized on a later stage when the DOM is fully available.

    return this;
};

makeObservable(Chat);

/**
 * Initialize the MegaChat (also will connect to the XMPP)
 */
Chat.prototype.init = function() {
    var self = this;

    // really simple plugin architecture that will initialize all plugins into self.options.plugins[name] = instance
    self.plugins = {};


    self.plugins['chatNotifications'] = new ChatNotifications(self, self.options.chatNotificationOptions);

    self.plugins['chatNotifications'].notifications.rebind('onAfterNotificationCreated.megaChat', function() {
        self.updateSectionUnreadCount();
    });

    $.each(self.options.plugins, function(k, v) {
        self.plugins[k] = new v(self);
    });



    var updateMyConnectionStatus = function() {
        self.renderMyStatus();
    };


    // UI events
    $(document.body).undelegate('.top-user-status-popup .tick-item', 'mousedown.megachat');

    $(document.body).delegate('.top-user-status-popup .tick-item', 'mousedown.megachat', function(e) {
        var presence = $(this).data("presence");
        self._myPresence = presence;

        $('.top-user-status-popup').removeClass("active");

        $('.top-user-status-popup').addClass("hidden");


        // presenced integration
        var targetPresence = PresencedIntegration.cssClassToPresence(presence);

        self.plugins.presencedIntegration.setPresence(targetPresence);


        // connection management - chatd shards, presenced
        if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
            // going from OFFLINE -> online/away/busy, e.g. requires a connection

            Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function(k) {
                var v = self.plugins.chatdIntegration.chatd.shards[k];
                v.connectionRetryManager.requiresConnection();
            });
        }
    });

    if (this._pageChangeListener) {
        mBroadcaster.removeListener(this._pageChangeListener)
    }
    var lastOpenedRoom = null;
    this._pageChangeListener = mBroadcaster.addListener('pagechange', function() {
        var room = self.getCurrentRoom();

        if (room && !room.isCurrentlyActive && room.chatId != lastOpenedRoom) {
            // opened window, different then one from the chat ones
            room.hide();
            self.currentlyOpenedChat = null;
        }
        if (lastOpenedRoom && (!room || room.chatId != lastOpenedRoom)) {
            // have opened a chat window before, but now
            // navigated away from it
            if (self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
            }
        }
        if (lastOpenedRoom && $('.fm-chat-block').is(".hidden")) {
            // have opened a chat window before, but now
            // navigated away from it
            if (self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
                lastOpenedRoom = null;
            }
        }

        if (room) {
            lastOpenedRoom = room.chatId;
        }
        else {
            lastOpenedRoom = null;
        }
        $('.fm-create-chat-button').hide();
    });

    self.$container = $('.fm-chat-block');


    var appContainer = document.querySelector('.section.conversations');

    var initAppUI = function() {
        if (d) {
            console.time('chatReactUiInit');
        }

        self.$conversationsApp = <ConversationsUI.ConversationsApp megaChat={self} contacts={M.u} />;

        self.$conversationsAppInstance = ReactDOM.render(
            self.$conversationsApp,
            document.querySelector('.section.conversations')
        );


        if (d) {
            console.timeEnd('chatReactUiInit');
        }
    };


    if (self.is_initialized) {
        self.destroy()
            .always(function() {
                self.init();
            });

        return;
    }
    else {
        if (!appContainer) {
            if (self._appInitPageChangeListener) {
                mBroadcaster.removeListener(self._appInitPageChangeListener);
            }
            self._appInitPageChangeListener = mBroadcaster.addListener('pagechange', function() {
                if (typeof($.leftPaneResizable) === 'undefined' || !fminitialized) {
                    // delay the chat init a bit more! specially for the case of a user getting from /pro -> /fm, which
                    // for some unknown reason, stopped working and delayed the init of $.leftPaneResizable
                    return;
                }
                appContainer = document.querySelector('.section.conversations');
                if (appContainer) {
                    initAppUI();
                    if (self._appInitPageChangeListener) {
                        mBroadcaster.removeListener(self._appInitPageChangeListener);
                    }
                }
            });
        }
        else {
            initAppUI();
        }
    }
    self.is_initialized = true;

    $('.activity-status-block, .activity-status').show();

    // contacts tab update
    self.on('onRoomCreated', function(e, room) {
        if (room.type === "private") {
            var userHandle = room.getParticipantsExceptMe()[0];

            if (!userHandle) {
                return;
            }
            var c = M.u[userHandle];

            if (!c) {
                return;
            }

            $('#contact_' + c.u + ' .start-chat-button')
                .addClass("active");
        }

        room.bind("onChatShown", function() {
            $('.conversations-main-listing').addClass("hidden");
        });

        self.updateDashboard();
    });
    self.on('onRoomDestroy', function(e, room) {
        if (room.type === "private") {
            var userHandle = room.getParticipantsExceptMe()[0];
            var c = M.u[userHandle];

            if (!c) {
                return;
            }

            $('#contact_' + c.u + ' .start-chat-button')
                .removeClass("active");
        }
        if (room.callManagerCall) {
            room.callManagerCall.endCall();
        }
    });


    $(document).rebind('megaulcomplete.megaChat', function(e, ul_target, uploads) {
        if (ul_target.indexOf("chat/") > -1) {
            var chatRoom = megaChat.getRoomFromUrlHash(ul_target);

            if (!chatRoom) {
                return;
            }

            chatRoom.attachNodes(uploads);
        }
    });

    $(document.body).delegate('.tooltip-trigger', 'mouseover.notsentindicator', function() {
        var $this = $(this),
            $notification = $('.tooltip.' + $(this).attr('data-tooltip')),
            iconTopPos,
            iconLeftPos,
            notificatonWidth,
            notificatonHeight;


        $notification.removeClass('hidden');
        iconTopPos = $this.offset().top,
            iconLeftPos = $this.offset().left,
            notificatonWidth = $notification.outerWidth()/2 - 10,
            notificatonHeight = $notification.outerHeight() + 10;
        $notification.offset({ top: iconTopPos - notificatonHeight, left: iconLeftPos - notificatonWidth});
    });

    $(document.body).delegate('.tooltip-trigger', 'mouseout.notsentindicator click.notsentindicator', function() {
        // hide all tooltips
        var $notification = $('.tooltip');
        $notification.addClass('hidden').removeAttr('style');
    });

    self.trigger("onInit");
};

Chat.prototype.getRoomFromUrlHash = function(urlHash) {
    if (urlHash.indexOf("#") === 0) {
        urlHash = urlHash.subtr(1, urlHash.length);
    }
    if (urlHash.indexOf("chat/g/") > -1) {
        var foundRoom = null;
        urlHash = urlHash.replace("chat/g/", "");
        megaChat.chats.forEach(function(room) {
            if (!foundRoom && room.chatId === urlHash) {
                foundRoom = room;
            }
        });
        return foundRoom;
    }
    else {
        var contactHash = urlHash.replace("chat/", "");
        if (!contactHash) {
            return;
        }

        var chatRoom = this.getPrivateRoom(contactHash);
        return chatRoom;
    }
};


Chat.prototype.updateSectionUnreadCount = function() {
    var self = this;

    // update the "global" conversation tab unread counter
    var unreadCount = 0;


    self.chats.forEach(function(megaRoom, k) {
        var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
        unreadCount += c;
    });

    // try NOT to touch the DOM if not needed...
    if (self._lastUnreadCount != unreadCount) {
        if (unreadCount > 0) {
            $('.new-messages-indicator')
                .text(
                unreadCount > 9 ? "9+" : unreadCount
            )
                .removeClass('hidden');
        }
        else {
            $('.new-messages-indicator')
                .addClass('hidden');
        }
        self._lastUnreadCount = unreadCount;

        self.updateDashboard();
    }
};

/**
 * Destroy this MegaChat instance (leave all rooms then disconnect)
 *
 * @returns {*}
 */
Chat.prototype.destroy = function(isLogout) {
    var self = this;

    if (self.is_initialized === false) {
        return;
    }

    self.trigger('onDestroy', [isLogout]);

    // unmount the UI elements, to reduce any unneeded.
    if (
        self.$conversationsAppInstance &&
        ReactDOM.findDOMNode(self.$conversationsAppInstance) &&
        ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode
    ) {
        ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode);
    }



    self.chats.forEach( function(room, roomJid) {
        if (!isLogout) {
            room.destroy();
        }
        self.chats.remove(roomJid);
    });


    if (
        self.plugins.chatdIntegration &&
        self.plugins.chatdIntegration.chatd &&
        self.plugins.chatdIntegration.chatd.shards
    ) {
        var shards = self.plugins.chatdIntegration.chatd.shards;
        Object.keys(shards).forEach(function(k) {
            shards[k].connectionRetryManager.options.functions.forceDisconnect();
        });
    }

    self.is_initialized = false;

    return MegaPromise.resolve();
};

/**
 * Get ALL contacts from the Mega Contacts list
 *
 * @returns {Array}
 */
Chat.prototype.getContacts = function() {
    var results = [];
    M.u.forEach( function(k, v) {
        if (v.c == 1 || v.c == 2) {
            results.push(v);
        }
    });
    return results;
};



/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a CSS class (e.g. will return 'online')
 *
 * @param presence {String}
 * @returns {String}
 */
Chat.prototype.userPresenceToCssClass = function(presence) {
    if (presence === UserPresence.PRESENCE.ONLINE) {
        return 'online';
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        return 'away';
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        return 'busy';
    }
    else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
        return 'offline';
    }
    else {
        return 'black';
    }
};

/**
 * Used to re-render my own presence/status
 */
Chat.prototype.renderMyStatus = function() {
    var self = this;
    if (!self.is_initialized) {
        return;
    }
    if (typeof(megaChat.userPresence) === 'undefined') {
        // still initialising...
        return;
    }

    // reset
    var $status = $('.activity-status-block .activity-status');

    $('.top-user-status-popup .tick-item').removeClass("active");


    $status
        .removeClass('online')
        .removeClass('away')
        .removeClass('busy')
        .removeClass('offline')
        .removeClass('black');



    var actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();

    var userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
    var presence = self.plugins.presencedIntegration.getMyPresence();

    var cssClass = PresencedIntegration.presenceToCssClass(
        presence
    );


    if (
        userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED
    ) {
        cssClass = "offline";
    }


    // use the actual presence for ticking the dropdown's items, since the user can be auto away/reconnecting,
    // but his actual presence's settings to be set to online/away/busy/etc
    if (actualPresence === UserPresence.PRESENCE.ONLINE) {
        $('.top-user-status-popup .tick-item[data-presence="chat"]').addClass("active");
    }
    else if (actualPresence === UserPresence.PRESENCE.AWAY) {
        $('.top-user-status-popup .tick-item[data-presence="away"]').addClass("active");
    }
    else if (actualPresence === UserPresence.PRESENCE.DND) {
        $('.top-user-status-popup .tick-item[data-presence="dnd"]').addClass("active");
    }
    else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
    }
    else {
        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
    }

    $status.addClass(
        cssClass
    );

    if (
        userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING
    ) {
        $status.parent()
            .addClass("fadeinout");
    }
    else {
        $status.parent()
            .removeClass("fadeinout");
    }

};


/**
 * Reorders the contact tree by last activity (THIS is going to just move DOM nodes, it will NOT recreate them from
 * scratch, the main goal is to be fast and clever.)
 */
Chat.prototype.reorderContactTree = function() {
    var self = this;

    var folders = M.getContacts({
        'h': 'contacts'
    });

    folders = M.sortContacts(folders);

    var $container = $('#treesub_contacts');

    var $prevNode = null;
    $.each(folders, function(k, v) {
        var $currentNode = $('#treeli_' + v.u);

        if (!$prevNode) {
            var $first = $('li:first:not(#treeli_' + v.u + ')', $container);
            if ($first.length > 0) {
                $currentNode.insertBefore($first);
            }
            else {
                $container.append($currentNode);
            }
        }
        else {
            $currentNode.insertAfter($prevNode);
        }


        $prevNode = $currentNode;
    });
};


/**
 * Open (and show) a new chat
 *
 * @param userHandles {Array} list of user handles
 * @param type {String} "private" or "group"
 * @returns [roomId {string}, room {MegaChatRoom}, {Deferred}]
 */
Chat.prototype.openChat = function(userHandles, type, chatId, chatShard, chatdUrl, setAsActive) {
    var self = this;
    type = type || "private";

    var roomId = chatId;

    var $promise = new MegaPromise();

    if (type === "private") {
        // validate that ALL jids are contacts
        var allValid = true;
        userHandles.forEach(function(user_handle) {
            var contact = M.u[user_handle];
            if (!contact || (contact.c !== 1 && contact.c !== 2 && contact.c !== 0)) {
                // this can happen in case the other contact is not in the contact list anymore, e.g. parked account,
                // removed contact, etc
                allValid = false;
                $promise.reject();
                return false;
            }
        });
        if (allValid === false) {
            $promise.reject();
            return $promise;
        }
        roomId = array.filterNonMatching(userHandles, u_handle)[0];
        if (!roomId) {
            // found a chat where I'm the only user in?
            $promise.reject();
            return $promise;
        }
        if (self.chats[roomId]) {
            $promise.resolve(roomId, self.chats[roomId]);
            return [roomId, self.chats[roomId], $promise];
        }
        else {
            // open new chat
        }
    }
    else {
        assert(roomId, 'Tried to create a group chat, without passing the chatId.');
        roomId = chatId;
    }

    if (type === "group") {
        userHandles.forEach(function(contactHash) {
            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');

            if (!M.u[contactHash]) {
                M.u.set(
                    contactHash,
                    new MegaDataObject(MEGA_USER_STRUCT, true, {
                        'h': contactHash,
                        'u': contactHash,
                        'm': '',
                        'c': 0
                    })
                );
                M.syncUsersFullname(contactHash);
                self.processNewUser(contactHash);
            }
        });
    }

    if (!roomId && setAsActive === true) {
        // manual/UI trigger, before the mcf/all chats are already loaded? postpone, since that chat may already
        // exists, so an 'mcc' API call may not be required
        if (
            ChatdIntegration.allChatsHadLoaded.state() === 'pending' ||
            ChatdIntegration.mcfHasFinishedPromise.state() === 'pending'
        ) {
            MegaPromise.allDone([
                ChatdIntegration.allChatsHadLoaded,
                ChatdIntegration.mcfHasFinishedPromise,
            ])
                .always(function() {
                    var res = self.openChat(userHandles, type, chatId, chatShard, chatdUrl, setAsActive);
                    $promise.linkDoneAndFailTo(
                        res[2]
                    );
                });

            return [roomId, undefined, $promise];
        }
    }

    if (self.chats[roomId]) {
        var room = self.chats[roomId];
        if (setAsActive) {
            room.show();
        }
        $promise.resolve(roomId, room);
        return [roomId, room, $promise];
    }
    if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat != roomId) {
        self.hideChat(self.currentlyOpenedChat);
        self.currentlyOpenedChat = null;
    }


    var room = new ChatRoom(
        self,
        roomId,
        type,
        userHandles,
        unixtime(),
        undefined,
        chatId,
        chatShard,
        chatdUrl
    );

    self.chats.set(
        room.roomId,
        room
    );

    if (setAsActive && !self.currentlyOpenedChat) {
        room.show();
    }


    var tmpRoomId = room.roomId;

//    $promise.done(function(roomId, room) {
//        assert(roomId, "missing room jid");

        if (self.currentlyOpenedChat === tmpRoomId) {
            self.currentlyOpenedChat = room.roomId;
            if (room) {
                room.show();
            }
        }
        else {
            if (room) {
                //room.refreshUI();
            }
        }
//    });



    room.setState(ChatRoom.STATE.JOINING);
    return [roomId, room, MegaPromise.resolve(roomId, self.chats[roomId])];
};


/**
 * Utility func to hide all visible chats
 */
Chat.prototype.hideAllChats = function() {
    var self = this;
    self.chats.forEach((chatRoom, k) => {
        if (chatRoom.isCurrentlyActive) {
            chatRoom.hide();
        }
    });
};


/**
 * Returns the currently opened room/chat
 *
 * @returns {null|undefined|Object}
 */
Chat.prototype.getCurrentRoom = function() {
    return this.chats[this.currentlyOpenedChat];
};

/**
 * Returns the currently opened room/chat JID
 *
 * @returns {null|String}
 */
Chat.prototype.getCurrentRoomJid = function() {
    return this.currentlyOpenedChat;
};


/**
 * Hide a room/chat's UI components.
 *
 * @param roomJid
 */
Chat.prototype.hideChat = function(roomJid) {
    var self = this;

    var room = self.chats[roomJid];
    if (room) {
        room.hide();
    }
    else {
        self.logger.warn("Room not found: ", roomJid);
    }
};


/**
 * Send message to a specific room
 *
 * @param roomJid
 * @param val
 */
Chat.prototype.sendMessage = function(roomJid, val) {
    var self = this;

    // queue if room is not ready.
    if (!self.chats[roomJid]) {
        self.logger.warn("Queueing message for room: ", roomJid, val);

        createTimeoutPromise(function() {
            return !!self.chats[roomJid]
        }, 100, self.options.delaySendMessageIfRoomNotAvailableTimeout)
            .done(function() {
                self.chats[roomJid].sendMessage(val);
            });
    }
    else {
        self.chats[roomJid].sendMessage(val);
    }
};



/**
 * Called when a new user is added into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */
Chat.prototype.processNewUser = function(u) {
    var self = this;

    self.logger.debug("added: ", u);

    if (self.plugins.presencedIntegration) {
        self.plugins.presencedIntegration.addContact(u);
    }

    self.renderMyStatus();
};

/**
 * Called when a new contact is removed into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */
Chat.prototype.processRemovedUser = function(u) {
    var self = this;

    self.logger.debug("removed: ", u);

    if (self.plugins.presencedIntegration) {
        self.plugins.presencedIntegration.removeContact(u);
    }

    self.renderMyStatus();
};


/**
 * Refresh the currently active conversation list in the UI
 */
Chat.prototype.refreshConversations = function() {
    var self = this;


    //$('.fm-tree-panel > .jspContainer > .jspPane > .nw-tree-panel-header').hide();
    //$('.fm-tree-panel > .nw-tree-panel-header').hide();


    if (!self.$container && !megaChatIsReady && u_type == 0) {
        $('.fm-chat-block').hide();
        return false;
    }
    // move to the proper place if loaded before the FM
    if (self.$container.parent('.section.conversations .fm-right-files-block').size() == 0) {
        $('.section.conversations .fm-right-files-block').append(self.$container);
    }
};

Chat.prototype.closeChatPopups = function() {
    var activePopup = $('.chat-popup.active');
    var activeButton = $('.chat-button.active');
    activeButton.removeClass('active');
    activePopup.removeClass('active');

    if (activePopup.attr('class')) {
        activeButton.removeClass('active');
        activePopup.removeClass('active');
        if (
            activePopup.attr('class').indexOf('fm-add-contact-popup') === -1 &&
            activePopup.attr('class').indexOf('fm-start-call-popup') === -1
        ) {
            activePopup.css('left', '-' + 10000 + 'px');
        }
        else activePopup.css('right', '-' + 10000 + 'px');
    }
};


/**
 * Debug helper
 */

Chat.prototype.getChatNum = function(idx) {
    return this.chats[this.chats.keys()[idx]];
};

/**
 * Called when Conversations tab is opened
 *
 * @returns boolean true if room was automatically shown and false if the listing page is shown
 */
Chat.prototype.renderListing = function() {
    var self = this;


    self.hideAllChats();

    hideEmptyGrids();

    //$('.fm-tree-panel > .jspContainer > .jspPane > .nw-tree-panel-header').hide();
    //$('.fm-tree-panel > .nw-tree-panel-header').hide();

    $('.files-grid-view').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.contacts-grid-view').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.fm-contacts-blocks-view').addClass('hidden');

    $('.fm-right-files-block').removeClass('hidden');
    $('.nw-conversations-item').removeClass('selected');


    M.onSectionUIOpen('conversations');


    if (Object.keys(self.chats).length === 0) {
        $('.fm-empty-conversations').removeClass('hidden');
    }
    else {
        $('.fm-empty-conversations').addClass('hidden');

        if (
            self.lastOpenedChat &&
            self.chats[self.lastOpenedChat] &&
            self.chats[self.lastOpenedChat]._leaving !== true
        ) {
            // have last opened chat, which is active
            self.chats[self.lastOpenedChat].setActive();
            self.chats[self.lastOpenedChat].show();
            return self.chats[self.lastOpenedChat];
        }
        else {
            // show first chat from the conv. list

            var sortedConversations = obj_values(self.chats.toJS());

            sortedConversations.sort(M.sortObjFn("lastActivity", -1));

            if (sortedConversations.length > 0) {
                var room = sortedConversations[0];
                room.setActive();
                room.show();
                return room;
            }
            else {
                $('.fm-empty-conversations').removeClass('hidden');
            }
        }
    }
};

/**
 * Tries to find if there is a opened (private) chat room with user `h`
 *
 * @param h {string} hash of the user
 * @returns {false|ChatRoom}
 */
Chat.prototype.getPrivateRoom = function(h) {
    var self = this;

    if (self.chats[h]) {
        return self.chats[h];
    }
    else {
        return false;
    }
};


Chat.prototype.createAndShowPrivateRoomFor = function(h) {
    chatui(h);
    return this.getPrivateRoom(h);
};

Chat.prototype.createAndShowGroupRoomFor = function(contactHashes) {
    this.trigger(
        'onNewGroupChatRequest',
        [
            contactHashes
        ]
    );
};

/**
 * Debug/dev/testing function
 *
 * @private
 */
Chat.prototype._destroyAllChatsFromChatd = function() {
    var self = this;

    asyncApiReq({'a': 'mcf', 'v': Chatd.VERSION}).done(function(r) {
        r.c.forEach(function(chatRoomMeta) {
            if (chatRoomMeta.g === 1) {
                chatRoomMeta.u.forEach(function (u) {
                    if (u.u !== u_handle) {
                        api_req({
                            a: 'mcr',
                            id: chatRoomMeta.id,
                            u: u.u,
                            v: Chatd.VERSION
                        });
                    }
                });
                api_req({
                    a: 'mcr',
                    id: chatRoomMeta.id,
                    u: u_handle,
                    v: Chatd.VERSION
                });
            }
        })
    });
};

Chat.prototype._leaveAllGroupChats = function() {
    asyncApiReq({'a': 'mcf', 'v': Chatd.VERSION}).done(function(r) {
        r.c.forEach(function(chatRoomMeta) {
            if (chatRoomMeta.g === 1) {
                asyncApiReq({
                    "a":"mcr", // request identifier
                    "id": chatRoomMeta.id, // chat id
                    "v": Chatd.VERSION
                });
            }
        })
    });
};

Chat.prototype.updateDashboard = function() {
    if (M.currentdirid === 'dashboard') {
        delay('dashboard:updchat', dashboardUI.updateChatWidget);
    }
};


/**
 * Warning: The data returned by this function is loaded directly and not hash-checked like in the secureboot.js. So
 * please use carefully and escape EVERYTHING that is loaded thru this.
 *
 * @param name
 * @returns {MegaPromise}
 */
Chat.prototype.getEmojiDataSet = function(name) {
    var self = this;
    assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");

    if (!self._emojiDataLoading) {
        self._emojiDataLoading = {};
    }
    if (!self._emojiData) {
        self._emojiData = {};
    }

    if (self._emojiData[name]) {
        return MegaPromise.resolve(
            self._emojiData[name]
        );
    }
    else if (self._emojiDataLoading[name]) {
        return self._emojiDataLoading[name];
    }
    else {
        self._emojiDataLoading[name] = MegaPromise.asMegaPromiseProxy(
            $.getJSON(staticpath + "js/chat/emojidata/" + name + "_v" + EMOJI_DATASET_VERSION + ".json")
        );
        self._emojiDataLoading[name].done(function(data) {
            self._emojiData[name] = data;
            delete self._emojiDataLoading[name];
        }).fail(function() {
            delete self._emojiDataLoading[name];
        });

        return self._emojiDataLoading[name];
    }
};

/**
 * A simple alias that returns PresencedIntegration's presence for the current user
 *
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */
Chat.prototype.getMyPresence = function() {
    if (u_handle && this.plugins.presencedIntegration) {
        return this.plugins.presencedIntegration.getMyPresence();
    }
    else {
        return;
    }
};

/**
 * A simple alias that returns PresencedIntegration's presence for the a specific user
 *
 * @param {String} user_handle the target user's presence
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */
Chat.prototype.getPresence = function(user_handle) {
    if (this.plugins.presencedIntegration) {
        return this.plugins.presencedIntegration.getPresence(user_handle);
    }
    else {
        return;
    }
};

Chat.prototype.getPresenceAsCssClass = function(user_handle) {
    var presence = this.getPresence(user_handle);
    return this.presenceStringToCssClass(presence);
};

/**
 * Utility for converting UserPresence.PRESENCE.* to css class strings
 *
 * @param {Number|undefined} presence
 * @returns {String}
 */
Chat.prototype.presenceStringToCssClass = function (presence) {
    if (presence === UserPresence.PRESENCE.ONLINE) {
        return 'online';
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        return 'away';
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        return 'busy';
    }
    else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
        return 'offline';
    }
    else {
        return 'black';
    }
};


/**
 * Internal method for generating unique (and a bit randomised) message ids
 *
 * @param {string} roomId
 * @param {string} messageAndMeta
 * @returns {string}
 */
Chat.prototype.generateTempMessageId = function(roomId, messageAndMeta) {
    var messageIdHash = u_handle + roomId;
    if (messageAndMeta) {
        messageIdHash += messageAndMeta;
    }
    return "m" + fastHashFunction(messageIdHash) + "_" + unixtime();
};


Chat.prototype.getChatById = function(chatdId) {
    var self = this;
    if (self.chats[chatdId]) {
        return self.chats[chatdId];
    }
    var found = false;
    self.chats.forEach(function(chatRoom) {
        if (!found && chatRoom.chatId === chatdId) {
            found = chatRoom;
            return false;
        }
    });
    return found ? found : false;
};

window.Chat = Chat;
window.chatui = chatui;

module.exports = {
    Chat,
    chatui
};
