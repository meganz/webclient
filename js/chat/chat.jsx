var React = require("react");
var ReactDOM = require("react-dom");
var ConversationsUI = require("./ui/conversations.jsx");
var ChatRoom = require('./chatRoom.jsx');


var chatui;
var webSocketsSupport = typeof(WebSocket) !== 'undefined';

(function() {
    chatui = function(id) {
        var roomOrUserHash = id.replace("chat/", "");

        var roomType = false;

        if (roomOrUserHash.substr(0, 2) === "g/") {
            roomType = "group";
            roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
            if (!megaChat.chats[roomOrUserHash + "@conference." + megaChat.options.xmppDomain]) {
                // chat not found
                setTimeout(function () {
                    window.location = '#fm/chat';
                    M.openFolder('chat');
                }, 100);
                return;
            }
        }
        else {
            if (!M.u[roomOrUserHash]) {
                setTimeout(function () {
                    window.location = '#fm/chat';
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


        if (localStorage.megaChatPresence !== "unavailable") {
            if (megaChat.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
                megaChat.connect();
            }
        }

        if (roomType === "private") {
            var chatJids = id.split("chat/").pop();
            if (chatJids) {
                chatJids = chatJids.split(",");
            }
            else {
                chatJids = [];
            }

            $.each(chatJids, function (k, v) {
                chatJids[k] = megaChat.getJidFromNodeId(v);
            });

            var $promise;

            chatJids.push(megaChat.karere.getBareJid());
            var resp = megaChat.openChat(chatJids, chatJids.length === 2 ? "private" : "group", 
                undefined, undefined, undefined, true);

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
            megaChat.chats[roomOrUserHash + "@conference." + megaChat.options.xmppDomain].show();
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

    var xmppDomain = "karere.mega.nz";
    if (localStorage.megaChatUseSandbox) {
        xmppDomain = "developers.mega.co.nz";
    }

    this.options = {
        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
        'xmppDomain': xmppDomain,
        'loadbalancerService': 'gelb.karere.mega.nz',
        'fallbackXmppServers': [
             "https://xmpp.karere.mega.nz/ws",
        ],
        'rtcSession': {
            'crypto': {
                encryptMessageForJid: function (msg, bareJid) {
                    var contact = megaChat.getContactFromJid(bareJid);
                    if (!u_pubkeys[contact.h]) {
                        throw new Error("pubkey not loaded: " + contact);
                    }
                    return base64urlencode(crypto_rsaencrypt(msg, u_pubkeys[contact.h]));
                },
                decryptMessage: function (msg) {
                    var decryptedVal = crypto_rsadecrypt(base64urldecode(msg), u_privk);
                    if (decryptedVal && decryptedVal.length > 0) {
                        return decryptedVal.substring(0, 43);
                    }
                    else {
                        return decryptedVal; // some null/falsy value
                    }

                },
                preloadCryptoKeyForJid: function (sendMsgFunc, bareJid) {
                    crypt.getPubRSA(megaChat.getContactFromJid(bareJid).h, sendMsgFunc);
                },
                generateMac: function (msg, key) {
                    var rawkey = key;
                    try {
                        rawkey = base64urldecode(key);
                    } catch (e) {
                    }
                    // use the SDK's base64 alphabet, it is also safer for using in URLs
                    return base64urlencode(asmCrypto.bytes_to_string(
                        asmCrypto.HMAC_SHA256.bytes(msg, rawkey)));
                },
                generateMacKey: function() {
                    var array = new Uint8Array(32);
                    var result = '';
                    window.crypto.getRandomValues(array);
                    for (var i=0; i<32; i++)
                        result+=String.fromCharCode(array[i]);
                    return base64urlencode(result);
                },

                scrambleJid: function(bareJid) {
                    var H = asmCrypto.SHA256.base64;
                    return H(bareJid + H(u_privk + "webrtc stats collection")).substr(0, 16);
                }
            },
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
            'karerePing': KarerePing
            // 'persistedTypeArea': PersistedTypeArea
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
                        return params.from + " shared " + (params.attachmentsCount > 1 ? params.attachmentsCount +" files" : "a file");
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

    if (!window.megaChatIsDisabled) {
        try {
            // This might throw in browsers which doesn't support Strophe/WebRTC
            this.karere = new Karere({
                'clientName': 'mc',
                'xmppServiceUrl': function() { return self.getXmppServiceUrl(); }
            });
        }
        catch (e) {
            console.error(e);
            window.megaChatIsDisabled = true;
        }
    }

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


    // Karere Events
    this.karere.bind("onPresence", function(e, eventObject) {
        if (eventObject.error) {
            return;
        }

        var bareJid = eventObject.getFromJid().split("/")[0];

        // should we trigger refreshUI ?
        if (eventObject.isMyOwn(self.karere) === false) {
            self.chats.forEach(function(room, roomJid) {

                if (room.participantExistsInRoom(bareJid)) {
                    // if this user is part of the currently visible room, then refresh the UI
                    if (self.getCurrentRoomJid() === room.roomJid) {
                        // room.refreshUI();
                    }
                }
            });
        }


        // update M.u
        var contact = self.getContactFromJid(eventObject.getFromJid());
        if (contact) {
            if (!contact.presenceMtime || parseFloat(contact.presenceMtime) < eventObject.getDelay()) {
                contact.presence = megaChat.karere.getPresence(megaChat.getJidFromNodeId(contact.u));
                contact.presenceMtime = eventObject.getDelay();
            }
        }

        if (eventObject.getShow() !== "unavailable") {
            if (eventObject.isMyOwn(self.karere) === false) {
                // Sync presence across devices (will check the delayed val!)
                if (bareJid === self.karere.getBareJid()) {
                    if (eventObject.getDelay() && eventObject.getDelay() >= parseFloat(localStorage.megaChatPresenceMtime) && self._myPresence != eventObject.getShow()) {
                        self._myPresence = eventObject.getShow();
                        localStorage.megaChatPresence = eventObject.getShow();
                        localStorage.megaChatPresenceMtime = eventObject.getDelay();

                        self.karere.setPresence(
                            eventObject.getShow(),
                            undefined,
                            eventObject.getDelay()
                        );
                    }
                }

            }
        }

        self.renderMyStatus();
    });

    // Disco capabilities updated
    this.karere.bind("onDiscoCapabilities", function(e, eventObject) {
        var $treeElement = $('.nw-conversations-item[data-jid="' + eventObject.getFromUserBareJid() + '"]');

        $.each(eventObject.getCapabilities(), function(capability, capable) {
            if (capable) {
                $treeElement.addClass('chat-capability-' + capability);
            }
            else {
                $treeElement.removeClass('chat-capability-' + capability);
            }
        });

        var roomJid = $treeElement.attr('data-room-jid');

        var room = self.chats[roomJid + "@conference." + megaChat.options.xmppDomain];
        if (room) { // refresh UI if new capabilities were received.
            // room.refreshUI();
        }

    });

    var updateMyConnectionStatus = function() {
        self.renderMyStatus();
    };


    /**
     * Go throught all megaChat.chats[] and run .startChat so that the user will resume any started conversations,
     * in case of his connection was interuptted
     */
    var recoverChats = function() {
        self.chats.forEach(function(v, k) {
            if (v.state == ChatRoom.STATE.INITIALIZED) {
                v.recover();
            }
        });
    };

    this.karere.bind("onConnected", function() {

        if (localStorage.megaChatPresence) {
            self.karere.setPresence(localStorage.megaChatPresence, undefined, localStorage.megaChatPresenceMtime);
        }
        else {
            self.karere.setPresence();
        }

        updateMyConnectionStatus();

        recoverChats();
    });
    this.karere.bind("onConnecting", updateMyConnectionStatus);
    this.karere.bind("onConnfail", updateMyConnectionStatus);
    this.karere.bind("onAuthfail", updateMyConnectionStatus);
    this.karere.bind("onDisconnecting", updateMyConnectionStatus);
    this.karere.bind("onDisconnected", function() {
        if (!u_handle) {
            return;
        }

        updateMyConnectionStatus();

        self.chats.forEach(function(v, k) {
            if (v.state !== ChatRoom.STATE.LEFT) {
                v.setState(ChatRoom.STATE.INITIALIZED, true);
            }
        })
    });

    this.karere.bind("onUsersJoined", function(e, eventData) {
        return self._onUsersUpdate("joined", e, eventData);
    });

    this.karere.bind("onUsersLeft", function(e, eventData) {
        return self._onUsersUpdate("left", e, eventData);
    });



    this.karere.bind("onChatMessage", function() {
        self._onChatMessage.apply(self, arguments);
    });
    

    // UI events
    $(document.body).undelegate('.top-user-status-popup .tick-item', 'mousedown.megachat');

    $(document.body).delegate('.top-user-status-popup .tick-item', 'mousedown.megachat', function(e) {
        var presence = $(this).data("presence");
        self._myPresence = presence;

        localStorage.megaChatPresence = presence;
        localStorage.megaChatPresenceMtime = unixtime();

        $('.top-user-status-popup').addClass("hidden");

        if (self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED && presence != Karere.PRESENCE.OFFLINE) {
            self.karere._myPresence = presence;
            self.connect().done(function() {
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
                
                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function(k) {
                    var shard = self.plugins.chatdIntegration.chatd.shards[k];
                    shard.reconnect();
                });
            });
        }
        else {
            if (presence === Karere.PRESENCE.OFFLINE) {
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
                self.karere.connectionRetryManager.resetConnectionRetries();
                self.karere.disconnect();
                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function(k) {
                    var shard = self.plugins.chatdIntegration.chatd.shards[k];
                    shard.disconnect();
                });
            }
            else {
                self.karere.connectionRetryManager.resetConnectionRetries();
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
            }
        }
    });

    $(window).unbind('hashchange.megaChat' + this.instanceId);
    var lastOpenedRoom = null;
    $(window).bind('hashchange.megaChat' + this.instanceId, function() {
        var room = self.getCurrentRoom();

        if (room && !room.isCurrentlyActive && room.roomJid != lastOpenedRoom) { // opened window, different then one from the chat ones
            room.hide();
            self.currentlyOpenedChat = null;
        }
        if (lastOpenedRoom && (!room || room.roomJid != lastOpenedRoom)) { // have opened a chat window before, but now
            // navigated away from it
            if (self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
            }
        }
        if (lastOpenedRoom && $('.fm-chat-block').is(".hidden")) { // have opened a chat window before, but now
            // navigated away from it
            if (self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
                lastOpenedRoom = null;
            }
        }

        if (room) {
            lastOpenedRoom = room.roomJid;
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
            $(window).rebind('hashchange.delayedChatUiInit', function() {
                if (typeof($.leftPaneResizable) === 'undefined' || !fminitialized) {
                    // delay the chat init a bit more! specially for the case of a user getting from #pro -> #fm, which
                    // for some unknown reason, stopped working and delayed the init of $.leftPaneResizable
                    return;
                }
                appContainer = document.querySelector('.section.conversations');
                if (appContainer) {
                    initAppUI();
                    $(window).unbind('hashchange.delayedChatUiInit');
                }
            });
        }
        else {
            initAppUI();
        }
    }
    self.is_initialized = true;

    $('.activity-status-block, .activity-status').show();

    if (!localStorage.megaChatPresence || localStorage.megaChatPresence != "unavailable") {
        self.connect()
            .always(function() {
                self.renderMyStatus();
            });
    }
    else {
        self.renderMyStatus();
    }



    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() === Karere.CONNECTION_STATE.AUTHFAIL) {
        self.karere.authSetup(
            self.getJidFromNodeId(u_handle),
            self.getMyXMPPPassword()
        );
    }

    // contacts tab update

    self.on('onRoomCreated', function(e, room) {
        if (room.type === "private") {
            var jid = room.getParticipantsExceptMe()[0];

            if (!jid) {
                return;
            }
            var c = self.getContactFromJid(jid);

            if (!c) { return; }

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
            var jid = room.getParticipantsExceptMe()[0];
            var c = self.getContactFromJid(jid);

            if (!c) { return; }

            $('#contact_' + c.u + ' .start-chat-button')
                .removeClass("active");
        }
        if (room.callSession) {
            room.callSession.endCall();
        }
    });
    
    self.karere.rebind("onPresence.maintainUI", function(e, presenceEventData) {
        var contact = self.getContactFromJid(presenceEventData.getFromJid());
        M.onlineStatusEvent(contact, presenceEventData.getShow());
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
            if (!foundRoom && room.roomJid.split("@")[0] === urlHash) {
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

/**
 * Connect to the XMPP
 *
 * @returns {Deferred}
 */
Chat.prototype.connect = function() {
    var self = this;

    // connection flow already started/in progress?
    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING && (self.karere._$connectingPromise && self.karere._$connectingPromise.state() === 'pending')) {
        return self.karere._$connectingPromise.always(function() {
            self.renderMyStatus();
        });
    }

    self.karere.connectionRetryManager.resetConnectionRetries();

    return self.karere.connect(
                self.getJidFromNodeId(u_handle),
                self.getMyXMPPPassword()
            )
            .always(function() {
                self.renderMyStatus();
            });
};


/**
 * Incoming chat message handler
 *
 * @param e
 * @param eventObject {KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage}
 * @private
 */
Chat.prototype._onChatMessage = function(e, eventObject) {
    var self = this;

    if (e.isPropagationStopped()) {
        return;
    }

    // ignore empty messages (except attachments)
    if (eventObject.isEmptyMessage() && !eventObject.getMeta().attachments) {
        return;
    }
    else {
        self.logger.debug("MegaChat is now processing incoming message: ", eventObject);
    }
    // detect outgoing VS incoming messages here + sync their state

    var room = self.chats[eventObject.getRoomJid()];
    if (room) {
        room.appendMessage(eventObject);
    }
    else {
        self.logger.error("Room not found: ", eventObject.getRoomJid());
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
 * Incoming Users Update handler
 *
 * @param type
 * @param e
 * @param eventData
 * @private
 */
Chat.prototype._onUsersUpdate = function(type, e, eventObject) {
    var self = this;
    var updatedJids = Object.keys(eventObject.getCurrentUsers());

    var diffUsers = Object.keys(eventObject[type === "joined" ? "getNewUsers" : "getLeftUsers"]());

    if (type === "joined") {
        $.each(diffUsers, function(k, v) {
            updatedJids.push(v);
        })
    }
    else {
        $.each(diffUsers, function(k, v) {
            var idx = $.inArray(v, updatedJids);
            delete updatedJids[idx];
        });
    }


    // i had joined OR left
    var room;
    if ($.inArray(self.karere.getJid(), diffUsers) !== -1) {
        if (type != "joined") { // i'd left
            // i'd left, remove the room and the UI stuff
            if (self.chats[eventObject.getRoomJid()]) {
                self.chats[eventObject.getRoomJid()].setState(ChatRoom.STATE.LEFT);
            }
        }
        else {
            // i'd joined
            room = self.chats[eventObject.getRoomJid()];
            if (room) {
                room.setState(ChatRoom.STATE.READY);
            }
        }
    }
    else { //some one else had joined/left the room
        if (type !== "joined") { // they left the room
            room = self.chats[eventObject.getRoomJid()];

        }
        else {
            // they had joined
            room = self.chats[eventObject.getRoomJid()];
        }
        room = self.chats[eventObject.getRoomJid()];

        if (!room) {
            return;
        }

        assert(anyOf(updatedJids, "null") === false, "updatedJids should not contain \"null\".");

        room.syncUsers(clone(updatedJids));
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
    
    self.karere.destroying = true;
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


    self.karere.connectionRetryManager.resetConnectionRetries();


    self.karere.connectionRetryManager.options.functions.forceDisconnect();

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
 * Get Contact object from the Mega's Contacts that corresponds to the given jid
 *
 * @param jid {String} full or bare jid...does not mather
 * @returns {Object|null}
 */
Chat.prototype.getContactFromJid = function(jid) {
    var self = this;

    assert(jid, "Missing jid");

    if (jid === self.karere.getBareJid()) {
        return M.u[u_handle];
    }

    jid = Karere.getNormalizedBareJid(jid); // always convert to bare jid
    var h = megaJidToUserId(jid);

    var contact = null;
    contact = M.u[h];

    if (!contact) {
        // this can happen if:
        // user A added user B
        // user B's contacts list is still not updated
        // user B receives a XMPP presence info that user A is online and tries to render a DOM element which requires
        // the user's name..so this method gets called.
        if (window.d) {
            // debugger;
        }
    }
    return contact;
};

/**
 * Get Contact's hash from jid
 *
 * @param jid {String} full OR bare jid
 * @returns {*}
 */
Chat.prototype.getContactHashFromJid = function(jid) {
    var self = this;

    assert(jid, "Missing jid");

    if (jid === self.karere.getBareJid()) {
        return u_handle;
    }

    jid = Karere.getNormalizedBareJid(jid); // always convert to bare jid
    var h = megaJidToUserId(jid);

    return typeof h !== 'string' || base64urldecode(h).length !== 8 ? false : h;
};

/**
 * Get formatted contact name from Jid
 *
 * @param jid {String} full/bare jid, does not matter
 * @returns {String|undefined}
 * @throws {AssertionError}
 */
Chat.prototype.getContactNameFromJid = function(jid) {
    var self = this;
    var contact = self.getContactFromJid(jid);

    /* XXX: THIS WONT work in group chats, where all users are not contacts w/ each other, so we will show the jid@ part */

    var name = jid.split("@")[0];


    if (contact) {
        name = M.getNameByHandle(contact.u);
    }

    if (!name) {
        name = false;
    }

    return name;
};


/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a CSS class (e.g. will return 'online')
 *
 * @param presence {String}
 * @returns {String}
 */
Chat.prototype.xmppPresenceToCssClass = function(presence) {
    if (presence === Karere.PRESENCE.ONLINE || presence === Karere.PRESENCE.AVAILABLE || presence === true) {
        return 'online';
    }
    else if (presence === Karere.PRESENCE.AWAY || presence === "xa") {
        return 'away';
    }
    else if (presence === Karere.PRESENCE.BUSY) {
        return 'busy';
    }
    else if (!presence || presence === Karere.PRESENCE.OFFLINE) {
        return 'offline';
    }
    else {
        return 'black';
    }
};

/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a translated text
 *
 * @param presence {String}
 * @returns {String}
 */
Chat.prototype.xmppPresenceToText = function(presence) {
    if (presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE || presence === true) {
        return l[5923];
    }
    else if (presence == Karere.PRESENCE.AWAY || presence == "xa") {
        return l[5924];
    }
    else if (presence == Karere.PRESENCE.BUSY) {
        return l[5925];
    }
    else if (!presence || presence == Karere.PRESENCE.OFFLINE) {
        return l[5926];
    }
    else {
        return __('Unknown');
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

    // reset
    var $status = $('.activity-status-block .activity-status');

    $('.top-user-status-popup .tick-item').removeClass("active");


    $status
        .removeClass('online')
        .removeClass('away')
        .removeClass('busy')
        .removeClass('offline')
        .removeClass('black');



    var presence = self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED ?
                self.karere.getPresence(self.karere.getJid()) :
                localStorage.megaChatPresence;

    var cssClass = self.xmppPresenceToCssClass(
        presence
    );


    if (!presence && self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
        if (!localStorage.megaChatPresence) {
            presence = localStorage.megaChatPresence = "chat"; // default
        }
        else { // cached
            presence = localStorage.megaChatPresence;
        }

    }
    else if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() === Karere.CONNECTION_STATE.AUTHFAIL || self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTING) {
        cssClass = "offline";
    }



    if (cssClass === 'online') {
        $('.top-user-status-popup .tick-item[data-presence="chat"]').addClass("active");
    }
    else if (cssClass === 'away') {
        $('.top-user-status-popup .tick-item[data-presence="away"]').addClass("active");
    }
    else if (cssClass === 'busy') {
        $('.top-user-status-popup .tick-item[data-presence="dnd"]').addClass("active");
    }
    else if (cssClass === 'offline') {
        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
    }
    else {
        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
    }

    $status.addClass(
        cssClass
    );

    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING) {
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
 * This function is an abstract placeholder that should return JID from a nodeID (e.g. Mega User IDs)
 *
 * @param nodeId {String}
 * @returns {string}
 */
Chat.prototype.getJidFromNodeId = function(nodeId) {
    assert(nodeId, "Missing nodeId for getJidFromNodeId");

    return megaUserIdEncodeForXmpp(nodeId) + "@" + this.options.xmppDomain;
};

/**
 * Jid -> Mega User ID (NodeID)
 *
 * @param nodeId {String}
 * @returns {string}
 */
Chat.prototype.getNodeIdFromJid = function(jid) {
    assert(jid, "Missing jid for getNodeIdFromJid");

    return megaJidToUserId(jid);
};

/**
 * Placeholder function that should return my password for authenticating w/ the XMPP server
 *
 * @returns {String}
 */
Chat.prototype.getMyXMPPPassword = function() {
    return u_sid ? u_sid.substr(0, 16) : false;
};


/**
 * Open (and show) a new chat
 *
 * @param jids {Array} list of bare jids
 * @param type {String} "private" or "group"
 * @returns [roomJid {string}, room {MegaChatRoom}, {Deferred}]
 */
Chat.prototype.openChat = function(jids, type, chatId, chatShard, chatdUrl, setAsActive) {
    var self = this;
    type = type || "private";

    var $promise = new MegaPromise();

    if (type === "private") {
        // validate that ALL jids are contacts
        var allValid = true;
        jids.forEach(function(jid) {
            var contact = self.getContactFromJid(jid);
            if (!contact || (contact.c !== 1 && contact.c !== 2 && contact.c !== 0)) {
                allValid = false;
                $promise.reject();
                return false;
            }
        });
        if (allValid === false) {
            $promise.reject();
            return $promise;
        }
        var $element = $('.nw-conversations-item[data-jid="' + jids[0] + '"]');
        var roomJid = $element.attr('data-room-jid') + "@" + self.karere.options.mucDomain;
        if (self.chats[roomJid]) {
//            self.chats[roomJid].show();
            $promise.resolve(roomJid, self.chats[roomJid]);
            return [roomJid, self.chats[roomJid], $promise];
        }
        else {
            // open new chat
        }
    }


    var roomJid;
    if (type === "private") {
        roomJid = self.generatePrivateRoomName(jids);
    }
    else {
        assert(chatId, 'Tried to create a group chat, without passing the chatId.');

        roomJid = self.generateGroupRoomName(chatId);

        jids.forEach(function(jid) {
            var contactHash = megaChat.getContactHashFromJid(jid);

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
            }
        });
    }

    if (!chatId && setAsActive === true) {
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
                    var res = self.openChat(jids, type, chatId, chatShard, chatdUrl, setAsActive);
                    $promise.linkDoneAndFailTo(
                        res[2]
                    );
                });

            return [roomJid, undefined, $promise];
        }
    }

    var roomFullJid = roomJid + "@" + self.karere.options.mucDomain;
    if (self.chats[roomFullJid]) {
        var room = self.chats[roomFullJid];
        if (setAsActive) {
            room.show();
        }
        $promise.resolve(roomFullJid, room);
        return [roomFullJid, room, $promise];
    }
    if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat != roomJid) {
        self.hideChat(self.currentlyOpenedChat);
        self.currentlyOpenedChat = null;
    }


    var room = new ChatRoom(
        self,
        roomJid + "@" + self.karere.options.mucDomain,
        type,
        jids,
        unixtime(),
        undefined,
        chatId,
        chatShard,
        chatdUrl
    );

    self.chats.set(
        room.roomJid,
        room
    );

    if (setAsActive && !self.currentlyOpenedChat) {
        room.show();
    }


    var tmpJid = room.roomJid;

//    $promise.done(function(roomJid, room) {
//        assert(roomJid, "missing room jid");

        if (self.currentlyOpenedChat === tmpJid) {
            self.currentlyOpenedChat = room.roomJid;
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



    if (self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
        $promise.reject(roomJid, room);
        return [roomJid, room, $promise];
    }

    var jidsWithoutMyself = room.getParticipantsExceptMe(jids);

    room.setState(ChatRoom.STATE.JOINING);

    var $startChatPromise = self.karere.startChat([], type, roomJid, (type === "private" ? false : undefined));

    $startChatPromise
        .done(function(roomJid) {
            $promise.resolve(roomJid, self.chats[roomJid]);
        })
        .fail(function() {
            $promise.reject.apply($promise, arguments);

            if (self.chats[$startChatPromise.roomJid]) {
                self.chats[$startChatPromise.roomJid].destroy(false);
            }
        });


    return [roomJid, room, $promise];
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
 * Used to generate unique room JID for private (1on1) chats.
 *
 * @param jids {Array} of BARE jids
 * @returns {string}
 */
Chat.prototype.generatePrivateRoomName = function(jids) {
    var self = this;
    var newJids = clone(jids);
    newJids.sort();
    var roomName = "prv";
    $.each(newJids, function(k, jid) {
        roomName = roomName + jid.split("@")[0];
    });

    roomName = base32.encode(asmCrypto.SHA256.bytes(roomName).subarray(0, 16));
    return roomName;
};

/**
 * Used to generate unique room JID for group chats.
 *
 * @param chatId {String} of BARE jids
 * @returns {string}
 */
Chat.prototype.generateGroupRoomName = function(chatId) {
    var self = this;
    return base32.encode(base64urldecode(chatId));
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
 * Generates a room JID for a private chat with `jid`
 * @param jid {string} this should be a bare jid (however, it will get normalized in case you pass a full jid)
 * @returns {*|jQuery}
 */
Chat.prototype.getPrivateRoomJidFor = function(jid) {
    jid = Karere.getNormalizedBareJid(jid);
    var roomJid = $('.nw-conversations-item[data-jid="' + jid + '"]').attr("data-room-jid");

    assert(roomJid, "Missing private room jid for user jid: " + jid);
    return roomJid;
};



/**
 * Called when a new user is added into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */
Chat.prototype.processNewUser = function(u) {
    var self = this;

    self.logger.debug("added: ", u);


    this.karere.subscribe(megaChat.getJidFromNodeId(u), self.getMyXMPPPassword());

    if (M.u[u] && !M.u[u].presence) {
        M.u[u].presence = this.karere.getPresence(megaChat.getJidFromNodeId(u));
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

    this.karere.unsubscribe(megaChat.getJidFromNodeId(u), self.getMyXMPPPassword());

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
        if (activePopup.attr('class').indexOf('fm-add-contact-popup') === -1 && activePopup.attr('class').indexOf('fm-start-call-popup') === -1) activePopup.css('left', '-' + 10000 + 'px');
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
 * Called when the BOSH service url is requested for Karere to connect. Should return a full URL to the actual
 * BOSH service that should be used for connecting the current user.
 */
Chat.prototype.getXmppServiceUrl = function() {
    var self = this;

    if (localStorage.megaChatUseSandbox) {
        return "https://karere-005.developers.mega.co.nz/bosh";
    }
    else if (localStorage.customXmppServiceUrl) {
        return localStorage.customXmppServiceUrl;
    }
    else {
        var $promise = new MegaPromise();

        $.get("https://" + self.options.loadbalancerService + "/?service=xmpp")
            .done(function(r) {
                if (r.xmpp && r.xmpp.length > 0) {
                    var randomHost = array_random(r.xmpp);
                    if (webSocketsSupport) {
                        $promise.resolve("wss://" + randomHost.host + "/ws");
                    }
                    else {
                        $promise.resolve("https://" + randomHost.host + "/bosh");
                    }
                }
                else if (!r.xmpp || r.xmpp.length === 0) {
                    self.logger.error("GeLB returned no results. Halting.");
                    $promise.reject();
                }
                else {
                    var server = array_random(self.options.fallbackXmppServers);
                    self.logger.error("Got empty list from the load balancing service for xmpp, will fallback to: " + server + ".");
                    if (webSocketsSupport) {
                        server = server.replace("https:", "wss:").replace("/bosh", "/ws");
                    }
                    $promise.resolve(server);
                }
            })
            .fail(function() {
                var server = array_random(self.options.fallbackXmppServers);
                self.logger.error("Could not connect to load balancing service for xmpp, will fallback to: " + server + ".");

                if (webSocketsSupport) {
                    server = server.replace("https:", "wss:").replace("/bosh", "/ws");
                }
                $promise.resolve(server);
            });

        return $promise;
    }
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


    sectionUIopen('conversations');


    if (Object.keys(self.chats).length === 0) {
        $('.fm-empty-conversations').removeClass('hidden');
    }
    else {
        $('.fm-empty-conversations').addClass('hidden');

        if (self.lastOpenedChat && self.chats[self.lastOpenedChat] && self.chats[self.lastOpenedChat]._leaving !== true) {
            // have last opened chat, which is active
            self.chats[self.lastOpenedChat].setActive();
            self.chats[self.lastOpenedChat].show();
            return self.chats[self.lastOpenedChat];
        }
        else {
            // show first chat from the conv. list

            var sortedConversations = obj_values(self.chats.toJS());

            sortedConversations.sort(mega.utils.sortObjFn("lastActivity", -1));

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

    var jid = self.getJidFromNodeId(h);

    var found = false;
    self.chats.forEach(function(v, k) {
        if (v.type === "private" && v.getParticipantsExceptMe()[0] == jid) {
            found = v;
            return false; // break;
        }
    });

    return found;
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
                console.error("Destroying: ", chatRoomMeta.id, chatRoomMeta.g, chatRoomMeta.u);
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

Chat.prototype.updateDashboard = function() {
    if (M.currentdirid === 'dashboard') {
        delay('dashboard:updchat', dashboardUI.updateChatWidget);
    }
};

window.Chat = Chat;
window.chatui = chatui;

module.exports = {
    Chat,
    chatui
};
