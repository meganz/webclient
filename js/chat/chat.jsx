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
        megaChat.displayArchivedChats = false;
        if (roomOrUserHash === "archived") {
            roomType = "archived";
            megaChat.displayArchivedChats = true;
        }
        else if (roomOrUserHash.substr(0, 2) === "g/") {
            roomType = "group";
            roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
            megaChat.displayArchivedChats = false;
            if (!megaChat.chats[roomOrUserHash]) {
                // chat not found
                // is it still loading?
                if (
                    ChatdIntegration._loadingChats[roomOrUserHash] &&
                    ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.state() === 'pending'
                ) {
                    ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.done(function() {
                        chatui(id);
                    });
                    return;
                }

                setTimeout(function () {
                    loadSubPage('fm/chat');
                    M.openFolder('chat');
                }, 100);
                return;
            }
        }
        else {
            megaChat.displayArchivedChats = false;
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
        M.hideEmptyGrids();

        $('.fm-files-view-icon').addClass('hidden');
        $('.fm-blocks-view').addClass('hidden');
        $('.files-grid-view').addClass('hidden');
        $('.fm-right-account-block').addClass('hidden');
        $('.contacts-details-block').addClass('hidden');

        $('.shared-grid-view,.shared-blocks-view').addClass('hidden');

        if (roomType !== "archived") {
            $('.fm-right-files-block[data-reactid]').removeClass('hidden');
            $('.fm-right-files-block:not([data-reactid])').addClass('hidden');
        }

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
            if (megaChat.chats[roomOrUserHash].isArchived()) {
                megaChat.chats[roomOrUserHash].showArchived = true;
            }
            megaChat.chats[roomOrUserHash].show();
        }
        else if(roomType === "archived") {
            megaChat.hideAllChats();
            M.onSectionUIOpen('conversations');
            $('.archived-chat-view').removeClass('hidden');
            if (megaChat.$conversationsAppInstance) {
                megaChat.$conversationsAppInstance.safeForceUpdate();
            }
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
    this.archivedChatsCount = 0;
    this._myPresence = localStorage.megaChatPresence;

    this._imageLoadCache = Object.create(null);
    this._imagesToBeLoaded = Object.create(null);
    this._imageAttributeCache = Object.create(null);

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
            'chatStats': ChatStats,
            'chatdIntegration': ChatdIntegration,
            'callManager': CallManager,
            'urlFilter': UrlFilter,
            'emoticonShortcutsFilter': EmoticonShortcutsFilter,
            'emoticonsFilter': EmoticonsFilter,
            'callFeedback': CallFeedback,
            'presencedIntegration': PresencedIntegration,
            'persistedTypeArea': PersistedTypeArea,
            'btRtfFilter': BacktickRtfFilter,
            'rtfFilter': RtfFilter,
            'richpreviewsFilter': RichpreviewsFilter
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
    self._chatsAwaitingAps = {};

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


    mBroadcaster.addListener('upload:start', function(data) {
        if (d) {
            MegaLogger.getLogger('onUploadEvent').debug('upload:start', data);
        }

        for (var k in data) {
            if (data[k].chat) {
                var roomId = data[k].chat.replace("g/", "").split("/")[1];
                if (self.chats[roomId]) {
                    self.chats[roomId].onUploadStart(data);
                    break;
                }
            }
        }
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


Chat.prototype.updateSectionUnreadCount = SoonFc(function() {
    var self = this;

    if (!self.favico) {
        assert(Favico, 'Favico.js is missing.');


        $('link[rel="icon"]').attr('href',
            (location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath) + 'favicon.ico'
        );

        self.favico = new Favico({
            type : 'rectangle',
            animation: 'popFade',
            bgColor : '#fff',
            textColor : '#d00'
        });
    }
    // update the "global" conversation tab unread counter
    var unreadCount = 0;


    self.chats.forEach(function(megaRoom, k) {
        var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
        unreadCount += c;
    });

    unreadCount = unreadCount > 9 ? "9+" : unreadCount;

    // try NOT to touch the DOM if not needed...
    if (self._lastUnreadCount != unreadCount) {
        if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
            $('.new-messages-indicator')
                .text(unreadCount)
                .removeClass('hidden');
        }
        else {
            $('.new-messages-indicator')
                .addClass('hidden');
        }
        self._lastUnreadCount = unreadCount;

        delay('notifFavicoUpd', function () {
            self.favico.reset();
            self.favico.badge(unreadCount);
        });

        self.updateDashboard();
    }
}, 100);

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
 * Open (and (optionally) show) a new chat
 *
 * @param userHandles {Array} list of user handles
 * @param type {String} "private" or "group"
 * @param [chatId] {String}
 * @param [chatShard]  {String}
 * @param [chatdUrl]  {String}
 * @param [setAsActive] {Boolean}
 * @returns [roomId {string}, room {MegaChatRoom}, {Deferred}]
 */
Chat.prototype.openChat = function(userHandles, type, chatId, chatShard, chatdUrl, setAsActive) {
    var self = this;
    type = type || "private";
    setAsActive = setAsActive === true;

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
                M.syncContactEmail(contactHash);
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

    // chatRoom is still loading from mcf/fmdb
    if (!chatId && ChatdIntegration._loadingChats[roomId]) {
        // wait for it to load
        ChatdIntegration._loadingChats[roomId].loadingPromise
            .done(function() {

                // already initialized ? other mcc action packet triggered init with the latest data for that chat?
                if (self.chats[roomId]) {
                    if ((self.chats[roomId].isArchived())
                        && (roomId === megaChat.currentlyOpenedChat)) {
                        self.chats[roomId].showArchived = true;
                    }
                    return;
                }
                var res = self.openChat(
                    userHandles,
                    ap.g === 1 ? "group" : "private",
                    ap.id,
                    ap.cs,
                    ap.url,
                    setAsActive
                );

                $promise.linkDoneAndFailTo(
                    res[2]
                );
            })
            .fail(function() {
                $promise.reject(arguments[0]);
            });

        if (setAsActive) {
            // store a flag, that would trigger a "setAsActive" for when the loading finishes
            // e.g. cover the case of the user reloading on a group chat that is readonly now
            ChatdIntegration._loadingChats[roomId].setAsActive = true;
        }

        return [roomId, undefined, $promise];
    }


    // chat room not found, create a new one


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

    // this is retry call, coming when the chat had just finished loading, with a previous call to .openChat with
    // `setAsActive` === true
    if (
        setAsActive === false &&
        chatId &&
        ChatdIntegration._loadingChats[roomId] &&
        ChatdIntegration._loadingChats[roomId].setAsActive
    ) {
        room.show();
    }


    var tmpRoomId = room.roomId;

    if (self.currentlyOpenedChat === tmpRoomId) {
        self.currentlyOpenedChat = room.roomId;
        if (room) {
            room.show();
        }
    }

    if (setAsActive === false) {
        room.showAfterCreation = false;
    }
    else {
        room.showAfterCreation = true;
    }




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
    self.chats.forEach(function(chatRoom) {
        if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
            chatRoom.trackDataChange();
        }
    });

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
    self.chats.forEach(function(chatRoom) {
        if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
            chatRoom.trackDataChange();
        }
    });

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

    M.hideEmptyGrids();

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

    if (Object.keys(self.chats).length === 0 || Object.keys(ChatdIntegration._loadingChats).length !== 0) {
        $('.fm-empty-conversations').removeClass('hidden');
    }
    else {
        $('.fm-empty-conversations').addClass('hidden');

        if (
            self.lastOpenedChat &&
            self.chats[self.lastOpenedChat] &&
            self.chats[self.lastOpenedChat]._leaving !== true &&
            self.chats[self.lastOpenedChat].isDisplayable()
        ) {
            // have last opened chat, which is active
            self.chats[self.lastOpenedChat].setActive();
            self.chats[self.lastOpenedChat].show();
            return self.chats[self.lastOpenedChat];
        }
        else {
            if (self.chats.length > 0) {
                return self.showLastActive();
            }
            else {
                $('.fm-empty-conversations').removeClass('hidden');
            }
        }
    }
};

/**
 * Inject the list of attachments for the current room into M.v
 * @param {String} roomId The room identifier
 */
Chat.prototype.setAttachments = function(roomId) {
    'use strict';

    if (M.chat) {
        if (d) {
            console.assert(this.chats[roomId] && this.chats[roomId].isCurrentlyActive, 'check this...');
        }

        // Reset list of attachments
        M.v = Object.values(M.chc[roomId] || {});

        if (M.v.length) {
            M.v.sort(M.sortObjFn('co'));

            for (var i = M.v.length; i--;) {
                var n = M.v[i];

                if (!n.revoked && !n.seen) {
                    n.seen = -1;

                    if (String(n.fa).indexOf(':1*') > 0) {
                        this._enqueueImageLoad(n);
                    }
                }
            }
        }
    }
    else if (d) {
        console.warn('Not in chat...');
    }
};

/**
 * Enqueue image loading.
 * @param {MegaNode} n The attachment node
 * @private
 */
Chat.prototype._enqueueImageLoad = function(n) {
    'use strict';

    // check whether the node is cached from the cloud side

    var cc = previews[n.h] || previews[n.hash];
    if (cc) {
        if (cc.poster) {
            n.src = cc.poster;
        }
        else {
            if (cc.full && n.mime !== 'image/png' && n.mime !== 'image/webp') {
                cc = cc.prev || false;
            }

            if (String(cc.type).startsWith('image/')) {
                n.src = cc.src;
            }
        }
    }

    var cached = n.src;

    // check the node does have a file attribute, this should be implicit
    // invoking this function but we may want to load originals later.

    if (String(n.fa).indexOf(':1*') > 0) {
        var load = false;
        var dedup = true;

        // Only load the image if its attribute was not seen before
        // TODO: also dedup from matching 'n.hash' checksum (?)

        if (this._imageAttributeCache[n.fa]) {
            this._imageAttributeCache[n.fa].push(n.ch);
        }
        else {
            this._imageAttributeCache[n.fa] = [n.ch];
            load = !cached;
        }

        // Only load the image once if its node is posted around several rooms

        if (this._imageLoadCache[n.h]) {
            this._imageLoadCache[n.h].push(n.ch);
        }
        else {
            this._imageLoadCache[n.h] = [n.ch];

            if (load) {
                this._imagesToBeLoaded[n.h] = n;
                dedup = false;
            }
        }

        if (dedup) {
            cached = true;
        }
        else {
            delay('chat:enqueue-image-load', this._doLoadImages.bind(this), 350);
        }
    }

    if (cached) {
        this._doneLoadingImage(n.h);
    }
};

/**
 * Actual code that is throttled and does load a bunch of queued images
 * @private
 */
Chat.prototype._doLoadImages = function() {
    "use strict";

    var self = this;
    var imagesToBeLoaded = self._imagesToBeLoaded;
    self._imagesToBeLoaded = Object.create(null);

    var chatImageParser = function(h, data) {
        var n = M.chd[self._imageLoadCache[h][0]] || false;

        if (data !== 0xDEAD) {
            // Set the attachment node image source
            n.src = mObjectURL([data.buffer || data], 'image/jpeg');
            n.srcBuffer = data;
        }
        else if (d) {
            console.warn('Failed to load image for %s', h, n);
        }

        self._doneLoadingImage(h);
    };

    var onSuccess = function(ctx, origNodeHandle, data) {
        chatImageParser(origNodeHandle, data);
    };

    var onError = function(origNodeHandle) {
        chatImageParser(origNodeHandle, 0xDEAD);
    };

    api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);

    [imagesToBeLoaded].forEach(function(obj) {
        Object.keys(obj).forEach(function(handle) {
            self._startedLoadingImage(handle);
        });
    });
};

/**
 * Retrieve all image loading (deduped) nodes for a handle
 * @param {String} h The node handle
 * @param {Object} [src] Empty object to store the source node that triggered the load.
 * @private
 */
Chat.prototype._getImageNodes = function(h, src) {
    var nodes = this._imageLoadCache[h] || [];
    var handles = [].concat(nodes);

    for (var i = nodes.length; i--;) {
        var n = M.chd[nodes[i]] || false;

        if (this._imageAttributeCache[n.fa]) {
            handles = handles.concat(this._imageAttributeCache[n.fa]);
        }
    }
    handles = array.unique(handles);

    nodes = handles.map(function(ch) {
        var n = M.chd[ch] || false;
        if (src && n.src) {
            Object.assign(src, n);
        }
        return n;
    });

    return nodes;
};

/**
 * Called when an image starts loading from the preview servers
 * @param {String} h The node handle being loaded.
 * @private
 */
Chat.prototype._startedLoadingImage = function(h) {
    "use strict";

    var nodes = this._getImageNodes(h);

    for (var i = nodes.length; i--;) {
        var n = nodes[i];

        if (!n.src && n.seen !== 2) {
            // to be used in the UI with the next design changes.
            var imgNode = document.getElementById(n.ch);

            if (imgNode && (imgNode = imgNode.querySelector('img'))) {
                imgNode.parentNode.parentNode.classList.add('thumb-loading');
            }
        }
    }
};

/**
 * Internal - called when an image is loaded in previews
 * @param {String} h The node handle being loaded.
 * @private
 */
Chat.prototype._doneLoadingImage = function(h) {
    "use strict";

    var root = {};
    var nodes = this._getImageNodes(h, root);
    var src = root.src;

    for (var i = nodes.length; i--;) {
        var n = nodes[i];
        var imgNode = document.getElementById(n.ch);

        if (imgNode && (imgNode = imgNode.querySelector('img'))) {
            var parent = imgNode.parentNode;
            var container = parent.parentNode;

            if (src) {
                imgNode.setAttribute('src', src);
                container.classList.add('thumb');
                parent.classList.remove('no-thumb');
            }
            else {
                imgNode.setAttribute('src', window.noThumbURI || '');
                container.classList.add('thumb-failed');
            }

            n.seen = 2;
            container.classList.remove('thumb-loading');
        }

        // Set the same image data/uri across all affected (same) nodes
        if (src) {
            n.src = src;

            if (root.srcBuffer && root.srcBuffer.byteLength) {
                n.srcBuffer = root.srcBuffer;
            }

            // Cache the loaded image in the cloud side for reuse
            if (n.srcBuffer && !previews[n.h] && is_image3(n)) {
                preqs[n.h] = 1;
                previewimg(n.h, n.srcBuffer, 'image/jpeg');
                previews[n.h].fromChat = Date.now();
            }
        }

        // Notify changes...
        if (n.mo) {
            n.mo.trackDataChange();
            n.mo = false;
        }
    }
};

/**
 * Show the last active chat room
 * @returns {*}
 */
Chat.prototype.showLastActive = function() {
    var self = this;

    if (self.chats.length > 0 && self.allChatsHadLoadedHistory()) {
        var sortedConversations = obj_values(self.chats.toJS());

        sortedConversations.sort(M.sortObjFn("lastActivity", -1));
        var index = 0;
        // find next active chat , it means a chat which is active or archived chat opened in the active chat list.
        while ((index < sortedConversations.length) &&
               (!sortedConversations[index].isDisplayable())) {
                index++;
        }
        if (index < sortedConversations.length) {
            var room = sortedConversations[index];
            if (!room.isActive()) {
                room.setActive();
                room.show();
            }
            return room;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
};


Chat.prototype.allChatsHadLoadedHistory = function() {
    var self = this;

    var chatIds = self.chats.keys();

    for (var i = 0; i < chatIds.length; i++) {
        var room = self.chats[chatIds[i]];
        if (room.isLoading()) {
            return false;
        }
    }

    return true;
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
    var self = this;

    if (self.chats[h]) {
        chatui(h);
        return MegaPromise.resolve(this.getPrivateRoom(h));
    }
    else {
        var userHandles = [u_handle, h];
        var result = megaChat.openChat(userHandles, "private");
        var roomId = result[1] && result[1].roomId ? result[1].roomId : '';
        var promise = new MegaPromise();

        if (result && result[1] && result[2]) {
            var room = result[1];
            var chatInitDonePromise = result[2];
            chatInitDonePromise.done(function() {
                createTimeoutPromise(function() {
                    return room.state === ChatRoom.STATE.READY;
                }, 300, 30000).done(function() {
                    room.setActive();
                    promise.resolve(room);
                })
                    .fail(function(e) {
                        promise.reject(e);
                    });
            });
        }
        else if (d) {
            console.warn('Cannot openChat for %s.', roomId);
            promise.reject();
        }

        return promise;
    }
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
    else if (name === "categories") {
        // reduce the XHRs by one, by simply moving the categories_v2.json to be embedded inline here:
        self._emojiData[name] = ["people","nature","food","activity","travel","objects","symbols","flags"];
        // note, when updating categories_vX.json, please update this ^^ manually.

        return MegaPromise.resolve(self._emojiData[name]);
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
 * Method for checking if an emoji by that slug exists
 * @param slug
 */
Chat.prototype.isValidEmojiSlug = function(slug) {
    var self = this;
    var emojiData = self._emojiData['emojis'];
    if (!emojiData) {
        self.getEmojiDataSet('emojis');
        return false;
    }

    for (var i = 0; i < emojiData.length; i++) {
        if (emojiData[i]['n'] === slug) {
            return true;
        }
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
    if (user_handle && this.plugins.presencedIntegration) {
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
    else if (self.chatIdToRoomId && self.chatIdToRoomId[chatdId] && self.chats[self.chatIdToRoomId[chatdId]]) {
        return self.chats[self.chatIdToRoomId[chatdId]];
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

Chat.prototype.getMyChatFilesFolder = function() {
    var promise = new MegaPromise();
    // Translation ?
    var folderName = "My chat files";
    var paths = [folderName];
    var safePath = M.getSafePath(paths);

    if (safePath.length === 1) {
        safePath = safePath[0];
    }

    var target = M.RootID;

    M.createFolder(target, safePath, new MegaPromise())
        .always(function(_target) {
            if (typeof _target === 'number') {
                ulmanager.logger.warn('Unable to create folder "%s" on target "%s"',
                    path, target, api_strerror(_target));
                promise.reject();
            }
            else {
                promise.resolve(_target);
            }
        });

    return promise;
};


/**
 * Creates a 1on1 chat room and opens the send files from cloud drive dialog automatically
 *
 * @param {string} user_handle
 */
Chat.prototype.openChatAndSendFilesDialog = function(user_handle) {
    var userHandles = [u_handle, user_handle];
    var result = megaChat.openChat(userHandles, "private");
    var roomId = result[1] && result[1].roomId ? result[1].roomId : '';

    if (result && result[1] && result[2]) {
        var room = result[1];
        var chatInitDonePromise = result[2];
        chatInitDonePromise.done(function() {
            createTimeoutPromise(function() {
                return room.state === ChatRoom.STATE.READY;
            }, 300, 30000).done(function() {
                room.setActive();
                $(room).trigger('openSendFilesDialog');
            });
        });
    }
    else if (d) {
        console.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId);
    }
};

window.Chat = Chat;
window.chatui = chatui;

module.exports = {
    Chat,
    chatui
};
