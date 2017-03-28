React.makeElement = React['createElement'];
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(4);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var ConversationsUI = __webpack_require__(4);
	var ChatRoom = __webpack_require__(26);

	var EMOJI_DATASET_VERSION = 1;

	var chatui;
	var webSocketsSupport = typeof WebSocket !== 'undefined';

	(function () {
	    chatui = function chatui(id) {
	        var roomOrUserHash = id.replace("chat/", "");

	        var roomType = false;

	        if (roomOrUserHash.substr(0, 2) === "g/") {
	            roomType = "group";
	            roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
	            if (!megaChat.chats[roomOrUserHash + "@conference." + megaChat.options.xmppDomain]) {

	                setTimeout(function () {
	                    loadSubPage('fm/chat');
	                    M.openFolder('chat');
	                }, 100);
	                return;
	            }
	        } else {
	            if (!M.u[roomOrUserHash]) {
	                setTimeout(function () {
	                    loadSubPage('fm/chat');
	                    M.openFolder('chat');
	                }, 100);
	                return;
	            } else {
	                roomType = "private";
	            }
	        }

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

	        if (megaChat.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
	            megaChat.connect();
	        }

	        if (roomType === "private") {
	            var chatJids = id.split("chat/").pop();
	            if (chatJids) {
	                chatJids = chatJids.split(",");
	            } else {
	                chatJids = [];
	            }

	            $.each(chatJids, function (k, v) {
	                chatJids[k] = megaChat.getJidFromNodeId(v);
	            });

	            var $promise;

	            chatJids.push(megaChat.karere.getBareJid());
	            var resp = megaChat.openChat(chatJids, chatJids.length === 2 ? "private" : "group", undefined, undefined, undefined, true);

	            if (resp instanceof MegaPromise) {
	                if (resp.state() === 'rejected') {
	                    console.warn("openChat failed. Maybe tried to start a private chat with a non contact?");
	                    return;
	                }
	            } else {
	                $promise = resp[2];
	                if (resp[1]) {
	                    resp[1].show();
	                }
	            }
	        } else if (roomType === "group") {
	            megaChat.chats[roomOrUserHash + "@conference." + megaChat.options.xmppDomain].show();
	        } else {
	            console.error("Unknown room type.");
	            return;
	        }

	        $('.fm-chat-block').removeClass('hidden');
	    };
	})();

	var megaChatInstanceId = 0;

	var Chat = function Chat() {
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
	        'fallbackXmppServers': ["https://xmpp.karere.mega.nz/ws"],
	        'rtcSession': {
	            'crypto': {
	                encryptMessageForJid: function encryptMessageForJid(msg, bareJid) {
	                    var contact = megaChat.getContactFromJid(bareJid);
	                    if (!u_pubkeys[contact.h]) {
	                        throw new Error("pubkey not loaded: " + contact);
	                    }
	                    return base64urlencode(crypto_rsaencrypt(msg, u_pubkeys[contact.h]));
	                },
	                decryptMessage: function decryptMessage(msg) {
	                    var decryptedVal = crypto_rsadecrypt(base64urldecode(msg), u_privk);
	                    if (decryptedVal && decryptedVal.length > 0) {
	                        return decryptedVal.substring(0, 43);
	                    } else {
	                        return decryptedVal;
	                    }
	                },
	                preloadCryptoKeyForJid: function preloadCryptoKeyForJid(sendMsgFunc, bareJid) {
	                    crypt.getPubRSA(megaChat.getContactFromJid(bareJid).h, sendMsgFunc);
	                },
	                generateMac: function generateMac(msg, key) {
	                    var rawkey = key;
	                    try {
	                        rawkey = base64urldecode(key);
	                    } catch (e) {}

	                    return base64urlencode(asmCrypto.bytes_to_string(asmCrypto.HMAC_SHA256.bytes(msg, rawkey)));
	                },
	                generateMacKey: function generateMacKey() {
	                    var array = new Uint8Array(32);
	                    var result = '';
	                    window.crypto.getRandomValues(array);
	                    for (var i = 0; i < 32; i++) {
	                        result += String.fromCharCode(array[i]);
	                    }return base64urlencode(result);
	                },

	                scrambleJid: function scrambleJid(bareJid) {
	                    var H = asmCrypto.SHA256.base64;
	                    return H(bareJid + H(u_privk + "webrtc stats collection")).substr(0, 16);
	                }
	            },
	            iceServers: [{
	                urls: ['turn:trn.karere.mega.nz:3478?transport=udp'],
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }]
	        },
	        filePickerOptions: {},
	        'plugins': {
	            'chatdIntegration': ChatdIntegration,
	            'callManager': CallManager,
	            'urlFilter': UrlFilter,
	            'emoticonShortcutsFilter': EmoticonShortcutsFilter,
	            'emoticonsFilter': EmoticonsFilter,
	            'callFeedback': CallFeedback,
	            'karerePing': KarerePing,
	            "presencedIntegration": PresencedIntegration

	        },
	        'chatNotificationOptions': {
	            'textMessages': {
	                'incoming-chat-message': {
	                    'title': "Incoming chat message",
	                    'icon': function icon(notificationObj, params) {
	                        return notificationObj.options.icon;
	                    },
	                    'body': function body(notificationObj, params) {
	                        return "You have new incoming chat message from: " + params.from;
	                    }
	                },
	                'incoming-attachment': {
	                    'title': "Incoming attachment",
	                    'icon': function icon(notificationObj, params) {
	                        return notificationObj.options.icon;
	                    },
	                    'body': function body(notificationObj, params) {
	                        return params.from + " shared " + (params.attachmentsCount > 1 ? params.attachmentsCount + " files" : "a file");
	                    }
	                },
	                'incoming-voice-video-call': {
	                    'title': "Incoming call",
	                    'icon': function icon(notificationObj, params) {
	                        return notificationObj.options.icon;
	                    },
	                    'body': function body(notificationObj, params) {
	                        return l[5893].replace('[X]', params.from);
	                    }
	                },
	                'call-terminated': {
	                    'title': "Call terminated",
	                    'icon': function icon(notificationObj, params) {
	                        return notificationObj.options.icon;
	                    },
	                    'body': function body(notificationObj, params) {
	                        return l[5889].replace('[X]', params.from);
	                    }
	                }
	            },
	            'sounds': ['alert_info_message', 'error_message', 'incoming_chat_message', 'incoming_contact_request', 'incoming_file_transfer', 'incoming_voice_video_call', 'hang_out']
	        },
	        'chatStoreOptions': {
	            'autoPurgeMaxMessagesPerRoom': 1024
	        }
	    };

	    this.instanceId = megaChatInstanceId++;

	    this.plugins = {};

	    if (!window.megaChatIsDisabled) {
	        try {

	            this.karere = new Karere({
	                'clientName': 'mc',
	                'xmppServiceUrl': function xmppServiceUrl() {
	                    return self.getXmppServiceUrl();
	                }
	            });
	        } catch (e) {
	            console.error(e);
	            window.megaChatIsDisabled = true;
	        }
	    }

	    self.filePicker = null;

	    return this;
	};

	makeObservable(Chat);

	Chat.prototype.init = function () {
	    var self = this;

	    self.plugins = {};

	    self.plugins['chatNotifications'] = new ChatNotifications(self, self.options.chatNotificationOptions);

	    self.plugins['chatNotifications'].notifications.rebind('onAfterNotificationCreated.megaChat', function () {
	        self.updateSectionUnreadCount();
	    });

	    $.each(self.options.plugins, function (k, v) {
	        self.plugins[k] = new v(self);
	    });

	    this.karere.bind("onPresence", function (e, eventObject) {
	        if (eventObject.error) {
	            return;
	        }

	        var bareJid = eventObject.getFromJid().split("/")[0];

	        if (eventObject.isMyOwn(self.karere) === false) {
	            self.chats.forEach(function (room, roomJid) {

	                if (room.participantExistsInRoom(bareJid)) {

	                    if (self.getCurrentRoomJid() === room.roomJid) {}
	                }
	            });
	        }

	        var contact = self.getContactFromJid(eventObject.getFromJid());

	        if (!contact) {
	            return;
	        }

	        if (contact) {
	            var presencedPresence = contact.u !== u_handle ? self.plugins.presencedIntegration.getPresence(contact.u) : self.plugins.presencedIntegration.getMyPresence();

	            if (typeof presencedPresence === 'undefined') {
	                if (!contact.presenceMtime || parseFloat(contact.presenceMtime) < eventObject.getDelay()) {
	                    contact.presence = megaChat.karere.getPresence(megaChat.getJidFromNodeId(contact.u));
	                    contact.presenceMtime = eventObject.getDelay();
	                }
	            }
	        }

	        if (eventObject.getShow() !== "unavailable") {
	            if (eventObject.isMyOwn(self.karere) === false) {

	                if (bareJid === self.karere.getBareJid()) {
	                    if (eventObject.getDelay() && eventObject.getDelay() >= parseFloat(localStorage.megaChatPresenceMtime) && self._myPresence != eventObject.getShow()) {
	                        self.karere.setPresence(eventObject.getShow(), undefined, eventObject.getDelay());
	                    }
	                }
	            }
	        }

	        self.renderMyStatus();
	    });

	    var updateMyConnectionStatus = function updateMyConnectionStatus() {
	        self.renderMyStatus();
	    };

	    var recoverChats = function recoverChats() {
	        self.chats.forEach(function (v, k) {
	            if (v.state == ChatRoom.STATE.INITIALIZED) {
	                v.recover();
	            }
	        });
	    };

	    this.karere.bind("onConnected", function () {
	        if (self.plugins.presencedIntegration) {
	            var presence = self.plugins.presencedIntegration.getPresence(u_handle);
	            if (presence === UserPresence.PRESENCE.ONLINE) {
	                self.karere.setPresence(Karere.PRESENCE.ONLINE, undefined, localStorage.megaChatPresenceMtime);
	            } else if (presence === UserPresence.PRESENCE.AWAY) {
	                self.karere.setPresence(Karere.PRESENCE.AWAY, undefined, localStorage.megaChatPresenceMtime);
	            } else if (presence === UserPresence.PRESENCE.DND) {
	                self.karere.setPresence(Karere.PRESENCE.BUSY, undefined, localStorage.megaChatPresenceMtime);
	            }
	        } else {
	            self.karere.setPresence();
	        }

	        updateMyConnectionStatus();

	        recoverChats();
	    });
	    this.karere.bind("onConnecting", updateMyConnectionStatus);
	    this.karere.bind("onConnfail", updateMyConnectionStatus);
	    this.karere.bind("onAuthfail", updateMyConnectionStatus);
	    this.karere.bind("onDisconnecting", updateMyConnectionStatus);
	    this.karere.bind("onDisconnected", function () {
	        if (!u_handle) {
	            return;
	        }

	        updateMyConnectionStatus();

	        self.chats.forEach(function (v, k) {
	            if (v.state !== ChatRoom.STATE.LEFT) {
	                v.setState(ChatRoom.STATE.INITIALIZED, true);
	            }
	        });
	    });

	    this.karere.bind("onUsersJoined", function (e, eventData) {
	        return self._onUsersUpdate("joined", e, eventData);
	    });

	    this.karere.bind("onUsersLeft", function (e, eventData) {
	        return self._onUsersUpdate("left", e, eventData);
	    });

	    this.karere.bind("onChatMessage", function () {
	        self._onChatMessage.apply(self, arguments);
	    });

	    $(document.body).undelegate('.top-user-status-popup .tick-item', 'mousedown.megachat');

	    $(document.body).delegate('.top-user-status-popup .tick-item', 'mousedown.megachat', function (e) {
	        var presence = $(this).data("presence");
	        self._myPresence = presence;

	        $('.top-user-status-popup').removeClass("active");

	        $('.top-user-status-popup').addClass("hidden");

	        if (self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED && presence != Karere.PRESENCE.OFFLINE) {
	            self.karere._myPresence = presence;
	            self.connect().done(function () {
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);

	                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
	                    var shard = self.plugins.chatdIntegration.chatd.shards[k];
	                    shard.reconnect();
	                });
	            });
	        } else {
	            self.karere.connectionRetryManager.resetConnectionRetries();
	            self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
	        }

	        var targetPresence = PresencedIntegration.cssClassToPresence(presence);

	        self.plugins.presencedIntegration.setPresence(targetPresence);

	        if (presence !== Karere.PRESENCE.OFFLINE) {

	            Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
	                var v = self.plugins.chatdIntegration.chatd.shards[k];
	                v.connectionRetryManager.requiresConnection();
	            });
	        }
	    });

	    if (this._pageChangeListener) {
	        mBroadcaster.removeListener(this._pageChangeListener);
	    }
	    var lastOpenedRoom = null;
	    this._pageChangeListener = mBroadcaster.addListener('pagechange', function () {
	        var room = self.getCurrentRoom();

	        if (room && !room.isCurrentlyActive && room.roomJid != lastOpenedRoom) {
	            room.hide();
	            self.currentlyOpenedChat = null;
	        }
	        if (lastOpenedRoom && (!room || room.roomJid != lastOpenedRoom)) {

	            if (self.chats[lastOpenedRoom]) {
	                self.chats[lastOpenedRoom].hide();
	            }
	        }
	        if (lastOpenedRoom && $('.fm-chat-block').is(".hidden")) {

	            if (self.chats[lastOpenedRoom]) {
	                self.chats[lastOpenedRoom].hide();
	                lastOpenedRoom = null;
	            }
	        }

	        if (room) {
	            lastOpenedRoom = room.roomJid;
	        } else {
	            lastOpenedRoom = null;
	        }
	        $('.fm-create-chat-button').hide();
	    });

	    self.$container = $('.fm-chat-block');

	    var appContainer = document.querySelector('.section.conversations');

	    var initAppUI = function initAppUI() {
	        if (d) {
	            console.time('chatReactUiInit');
	        }

	        self.$conversationsApp = React.makeElement(ConversationsUI.ConversationsApp, { megaChat: self, contacts: M.u });

	        self.$conversationsAppInstance = ReactDOM.render(self.$conversationsApp, document.querySelector('.section.conversations'));

	        if (d) {
	            console.timeEnd('chatReactUiInit');
	        }
	    };

	    if (self.is_initialized) {
	        self.destroy().always(function () {
	            self.init();
	        });

	        return;
	    } else {
	        if (!appContainer) {
	            if (self._appInitPageChangeListener) {
	                mBroadcaster.removeListener(self._appInitPageChangeListener);
	            }
	            self._appInitPageChangeListener = mBroadcaster.addListener('pagechange', function () {
	                if (typeof $.leftPaneResizable === 'undefined' || !fminitialized) {

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
	        } else {
	            initAppUI();
	        }
	    }
	    self.is_initialized = true;

	    $('.activity-status-block, .activity-status').show();

	    self.connect().always(function () {
	        self.renderMyStatus();
	    });

	    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() === Karere.CONNECTION_STATE.AUTHFAIL) {
	        self.karere.authSetup(self.getJidFromNodeId(u_handle), self.getMyXMPPPassword());
	    }

	    self.on('onRoomCreated', function (e, room) {
	        if (room.type === "private") {
	            var jid = room.getParticipantsExceptMe()[0];

	            if (!jid) {
	                return;
	            }
	            var c = self.getContactFromJid(jid);

	            if (!c) {
	                return;
	            }

	            $('#contact_' + c.u + ' .start-chat-button').addClass("active");
	        }

	        room.bind("onChatShown", function () {
	            $('.conversations-main-listing').addClass("hidden");
	        });

	        self.updateDashboard();
	    });
	    self.on('onRoomDestroy', function (e, room) {
	        if (room.type === "private") {
	            var jid = room.getParticipantsExceptMe()[0];
	            var c = self.getContactFromJid(jid);

	            if (!c) {
	                return;
	            }

	            $('#contact_' + c.u + ' .start-chat-button').removeClass("active");
	        }
	        if (room.callSession) {
	            room.callSession.endCall();
	        }
	    });

	    $(document).rebind('megaulcomplete.megaChat', function (e, ul_target, uploads) {
	        if (ul_target.indexOf("chat/") > -1) {
	            var chatRoom = megaChat.getRoomFromUrlHash(ul_target);

	            if (!chatRoom) {
	                return;
	            }

	            chatRoom.attachNodes(uploads);
	        }
	    });

	    $(document.body).delegate('.tooltip-trigger', 'mouseover.notsentindicator', function () {
	        var $this = $(this),
	            $notification = $('.tooltip.' + $(this).attr('data-tooltip')),
	            iconTopPos,
	            iconLeftPos,
	            notificatonWidth,
	            notificatonHeight;

	        $notification.removeClass('hidden');
	        iconTopPos = $this.offset().top, iconLeftPos = $this.offset().left, notificatonWidth = $notification.outerWidth() / 2 - 10, notificatonHeight = $notification.outerHeight() + 10;
	        $notification.offset({ top: iconTopPos - notificatonHeight, left: iconLeftPos - notificatonWidth });
	    });

	    $(document.body).delegate('.tooltip-trigger', 'mouseout.notsentindicator click.notsentindicator', function () {

	        var $notification = $('.tooltip');
	        $notification.addClass('hidden').removeAttr('style');
	    });

	    self.trigger("onInit");
	};

	Chat.prototype.getRoomFromUrlHash = function (urlHash) {
	    if (urlHash.indexOf("#") === 0) {
	        urlHash = urlHash.subtr(1, urlHash.length);
	    }
	    if (urlHash.indexOf("chat/g/") > -1) {
	        var foundRoom = null;
	        urlHash = urlHash.replace("chat/g/", "");
	        megaChat.chats.forEach(function (room) {
	            if (!foundRoom && room.roomJid.split("@")[0] === urlHash) {
	                foundRoom = room;
	            }
	        });
	        return foundRoom;
	    } else {
	        var contactHash = urlHash.replace("chat/", "");
	        if (!contactHash) {
	            return;
	        }

	        var chatRoom = this.getPrivateRoom(contactHash);
	        return chatRoom;
	    }
	};

	Chat.prototype.connect = function () {
	    var self = this;

	    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING && self.karere._$connectingPromise && self.karere._$connectingPromise.state() === 'pending') {
	        return self.karere._$connectingPromise.always(function () {
	            self.renderMyStatus();
	        });
	    }

	    self.karere.connectionRetryManager.resetConnectionRetries();

	    return self.karere.connect(self.getJidFromNodeId(u_handle), self.getMyXMPPPassword()).always(function () {
	        self.renderMyStatus();
	    });
	};

	Chat.prototype._onChatMessage = function (e, eventObject) {
	    var self = this;

	    if (e.isPropagationStopped()) {
	        return;
	    }

	    if (eventObject.isEmptyMessage() && !eventObject.getMeta().attachments) {
	        return;
	    } else {
	        self.logger.debug("MegaChat is now processing incoming message: ", eventObject);
	    }

	    var room = self.chats[eventObject.getRoomJid()];
	    if (room) {
	        room.appendMessage(eventObject);
	    } else {
	        self.logger.error("Room not found: ", eventObject.getRoomJid());
	    }
	};

	Chat.prototype.updateSectionUnreadCount = function () {
	    var self = this;

	    var unreadCount = 0;

	    self.chats.forEach(function (megaRoom, k) {
	        var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
	        unreadCount += c;
	    });

	    if (self._lastUnreadCount != unreadCount) {
	        if (unreadCount > 0) {
	            $('.new-messages-indicator').text(unreadCount > 9 ? "9+" : unreadCount).removeClass('hidden');
	        } else {
	            $('.new-messages-indicator').addClass('hidden');
	        }
	        self._lastUnreadCount = unreadCount;

	        self.updateDashboard();
	    }
	};
	Chat.prototype._onUsersUpdate = function (type, e, eventObject) {
	    var self = this;
	    var updatedJids = Object.keys(eventObject.getCurrentUsers());

	    var diffUsers = Object.keys(eventObject[type === "joined" ? "getNewUsers" : "getLeftUsers"]());

	    if (type === "joined") {
	        $.each(diffUsers, function (k, v) {
	            updatedJids.push(v);
	        });
	    } else {
	        $.each(diffUsers, function (k, v) {
	            var idx = $.inArray(v, updatedJids);
	            delete updatedJids[idx];
	        });
	    }

	    var room;
	    if ($.inArray(self.karere.getJid(), diffUsers) !== -1) {
	        if (type != "joined") {

	            if (self.chats[eventObject.getRoomJid()]) {
	                self.chats[eventObject.getRoomJid()].setState(ChatRoom.STATE.LEFT);
	            }
	        } else {

	            room = self.chats[eventObject.getRoomJid()];
	            if (room) {
	                room.setState(ChatRoom.STATE.READY);
	            }
	        }
	    } else {
	        if (type !== "joined") {
	            room = self.chats[eventObject.getRoomJid()];
	        } else {

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

	Chat.prototype.destroy = function (isLogout) {
	    var self = this;

	    if (self.is_initialized === false) {
	        return;
	    }

	    self.karere.destroying = true;
	    self.trigger('onDestroy', [isLogout]);

	    if (self.$conversationsAppInstance && ReactDOM.findDOMNode(self.$conversationsAppInstance) && ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode) {
	        ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode);
	    }

	    self.chats.forEach(function (room, roomJid) {
	        if (!isLogout) {
	            room.destroy();
	        }
	        self.chats.remove(roomJid);
	    });

	    self.karere.connectionRetryManager.resetConnectionRetries();

	    self.karere.connectionRetryManager.options.functions.forceDisconnect();

	    if (self.plugins.chatdIntegration && self.plugins.chatdIntegration.chatd && self.plugins.chatdIntegration.chatd.shards) {
	        var shards = self.plugins.chatdIntegration.chatd.shards;
	        Object.keys(shards).forEach(function (k) {
	            shards[k].connectionRetryManager.options.functions.forceDisconnect();
	        });
	    }

	    self.is_initialized = false;

	    return MegaPromise.resolve();
	};

	Chat.prototype.getContacts = function () {
	    var results = [];
	    M.u.forEach(function (k, v) {
	        if (v.c == 1 || v.c == 2) {
	            results.push(v);
	        }
	    });
	    return results;
	};

	Chat.prototype.getContactFromJid = function (jid) {
	    var self = this;

	    assert(jid, "Missing jid");

	    if (jid === self.karere.getBareJid()) {
	        return M.u[u_handle];
	    }

	    jid = Karere.getNormalizedBareJid(jid);
	    var h = megaJidToUserId(jid);

	    var contact = null;
	    contact = M.u[h];

	    if (!contact) {

	        if (window.d) {}
	    }
	    return contact;
	};

	Chat.prototype.getContactHashFromJid = function (jid) {
	    var self = this;

	    assert(jid, "Missing jid");

	    if (jid === self.karere.getBareJid()) {
	        return u_handle;
	    }

	    jid = Karere.getNormalizedBareJid(jid);
	    var h = megaJidToUserId(jid);

	    return typeof h !== 'string' || base64urldecode(h).length !== 8 ? false : h;
	};

	Chat.prototype.getContactNameFromJid = function (jid) {
	    var self = this;
	    var contact = self.getContactFromJid(jid);

	    var name = jid.split("@")[0];

	    if (contact) {
	        name = M.getNameByHandle(contact.u);
	    }

	    if (!name) {
	        name = false;
	    }

	    return name;
	};

	Chat.prototype.xmppPresenceToCssClass = function (presence) {
	    if (presence === Karere.PRESENCE.ONLINE || presence === Karere.PRESENCE.AVAILABLE || presence === true) {
	        return 'online';
	    } else if (presence === Karere.PRESENCE.AWAY || presence === "xa") {
	        return 'away';
	    } else if (presence === Karere.PRESENCE.BUSY) {
	        return 'busy';
	    } else if (!presence || presence === Karere.PRESENCE.OFFLINE) {
	        return 'offline';
	    } else {
	        return 'black';
	    }
	};

	Chat.prototype.renderMyStatus = function () {
	    var self = this;
	    if (!self.is_initialized) {
	        return;
	    }
	    if (typeof megaChat.userPresence === 'undefined') {

	        return;
	    }

	    var $status = $('.activity-status-block .activity-status');

	    $('.top-user-status-popup .tick-item').removeClass("active");

	    $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');

	    var actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();

	    var userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
	    var presence = self.plugins.presencedIntegration.getMyPresence();

	    var cssClass = PresencedIntegration.presenceToCssClass(presence);

	    if (userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED) {
	        cssClass = "offline";
	    }

	    if (actualPresence === UserPresence.PRESENCE.ONLINE) {
	        $('.top-user-status-popup .tick-item[data-presence="chat"]').addClass("active");
	    } else if (actualPresence === UserPresence.PRESENCE.AWAY) {
	        $('.top-user-status-popup .tick-item[data-presence="away"]').addClass("active");
	    } else if (actualPresence === UserPresence.PRESENCE.DND) {
	        $('.top-user-status-popup .tick-item[data-presence="dnd"]').addClass("active");
	    } else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
	        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
	    } else {
	        $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
	    }

	    $status.addClass(cssClass);

	    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING || userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING) {
	        $status.parent().addClass("fadeinout");
	    } else {
	        $status.parent().removeClass("fadeinout");
	    }
	};

	Chat.prototype.reorderContactTree = function () {
	    var self = this;

	    var folders = M.getContacts({
	        'h': 'contacts'
	    });

	    folders = M.sortContacts(folders);

	    var $container = $('#treesub_contacts');

	    var $prevNode = null;
	    $.each(folders, function (k, v) {
	        var $currentNode = $('#treeli_' + v.u);

	        if (!$prevNode) {
	            var $first = $('li:first:not(#treeli_' + v.u + ')', $container);
	            if ($first.length > 0) {
	                $currentNode.insertBefore($first);
	            } else {
	                $container.append($currentNode);
	            }
	        } else {
	            $currentNode.insertAfter($prevNode);
	        }

	        $prevNode = $currentNode;
	    });
	};

	Chat.prototype.getJidFromNodeId = function (nodeId) {
	    assert(nodeId, "Missing nodeId for getJidFromNodeId");

	    return megaUserIdEncodeForXmpp(nodeId) + "@" + this.options.xmppDomain;
	};

	Chat.prototype.getNodeIdFromJid = function (jid) {
	    assert(jid, "Missing jid for getNodeIdFromJid");

	    return megaJidToUserId(jid);
	};

	Chat.prototype.getMyXMPPPassword = function () {
	    return u_sid ? u_sid.substr(0, 16) : false;
	};

	Chat.prototype.openChat = function (jids, type, chatId, chatShard, chatdUrl, setAsActive) {
	    var self = this;
	    type = type || "private";

	    var $promise = new MegaPromise();

	    if (type === "private") {

	        var allValid = true;
	        jids.forEach(function (jid) {
	            var contact = self.getContactFromJid(jid);
	            if (!contact || contact.c !== 1 && contact.c !== 2 && contact.c !== 0) {
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

	            $promise.resolve(roomJid, self.chats[roomJid]);
	            return [roomJid, self.chats[roomJid], $promise];
	        } else {}
	    }

	    var roomJid;
	    if (type === "private") {
	        roomJid = self.generatePrivateRoomName(jids);
	    } else {
	        assert(chatId, 'Tried to create a group chat, without passing the chatId.');

	        roomJid = self.generateGroupRoomName(chatId);

	        jids.forEach(function (jid) {
	            var contactHash = megaChat.getContactHashFromJid(jid);

	            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');

	            if (!M.u[contactHash]) {
	                M.u.set(contactHash, new MegaDataObject(MEGA_USER_STRUCT, true, {
	                    'h': contactHash,
	                    'u': contactHash,
	                    'm': '',
	                    'c': 0
	                }));
	                M.syncUsersFullname(contactHash);
	                self.processNewUser(contactHash);
	            }
	        });
	    }

	    if (!chatId && setAsActive === true) {

	        if (ChatdIntegration.allChatsHadLoaded.state() === 'pending' || ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
	            MegaPromise.allDone([ChatdIntegration.allChatsHadLoaded, ChatdIntegration.mcfHasFinishedPromise]).always(function () {
	                var res = self.openChat(jids, type, chatId, chatShard, chatdUrl, setAsActive);
	                $promise.linkDoneAndFailTo(res[2]);
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

	    var room = new ChatRoom(self, roomJid + "@" + self.karere.options.mucDomain, type, jids, unixtime(), undefined, chatId, chatShard, chatdUrl);

	    self.chats.set(room.roomJid, room);

	    if (setAsActive && !self.currentlyOpenedChat) {
	        room.show();
	    }

	    var tmpJid = room.roomJid;

	    if (self.currentlyOpenedChat === tmpJid) {
	        self.currentlyOpenedChat = room.roomJid;
	        if (room) {
	            room.show();
	        }
	    } else {
	        if (room) {}
	    }

	    if (self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
	        $promise.reject(roomJid, room);
	        return [roomJid, room, $promise];
	    }

	    var jidsWithoutMyself = room.getParticipantsExceptMe(jids);

	    room.setState(ChatRoom.STATE.JOINING);

	    var $startChatPromise = self.karere.startChat([], type, roomJid, type === "private" ? false : undefined);

	    $startChatPromise.done(function (roomJid) {
	        $promise.resolve(roomJid, self.chats[roomJid]);
	    }).fail(function () {
	        $promise.reject.apply($promise, arguments);

	        if (self.chats[$startChatPromise.roomJid]) {
	            self.chats[$startChatPromise.roomJid].destroy(false);
	        }
	    });

	    return [roomJid, room, $promise];
	};

	Chat.prototype.hideAllChats = function () {
	    var self = this;
	    self.chats.forEach(function (chatRoom, k) {
	        if (chatRoom.isCurrentlyActive) {
	            chatRoom.hide();
	        }
	    });
	};
	Chat.prototype.generatePrivateRoomName = function (jids) {
	    var self = this;
	    var newJids = clone(jids);
	    newJids.sort();
	    var roomName = "prv";
	    $.each(newJids, function (k, jid) {
	        roomName = roomName + jid.split("@")[0];
	    });

	    roomName = base32.encode(asmCrypto.SHA256.bytes(roomName).subarray(0, 16));
	    return roomName;
	};

	Chat.prototype.generateGroupRoomName = function (chatId) {
	    var self = this;
	    return base32.encode(base64urldecode(chatId));
	};

	Chat.prototype.getCurrentRoom = function () {
	    return this.chats[this.currentlyOpenedChat];
	};

	Chat.prototype.getCurrentRoomJid = function () {
	    return this.currentlyOpenedChat;
	};

	Chat.prototype.hideChat = function (roomJid) {
	    var self = this;

	    var room = self.chats[roomJid];
	    if (room) {
	        room.hide();
	    } else {
	        self.logger.warn("Room not found: ", roomJid);
	    }
	};

	Chat.prototype.sendMessage = function (roomJid, val) {
	    var self = this;

	    if (!self.chats[roomJid]) {
	        self.logger.warn("Queueing message for room: ", roomJid, val);

	        createTimeoutPromise(function () {
	            return !!self.chats[roomJid];
	        }, 100, self.options.delaySendMessageIfRoomNotAvailableTimeout).done(function () {
	            self.chats[roomJid].sendMessage(val);
	        });
	    } else {
	        self.chats[roomJid].sendMessage(val);
	    }
	};

	Chat.prototype.getPrivateRoomJidFor = function (jid) {
	    jid = Karere.getNormalizedBareJid(jid);
	    var roomJid = $('.nw-conversations-item[data-jid="' + jid + '"]').attr("data-room-jid");

	    assert(roomJid, "Missing private room jid for user jid: " + jid);
	    return roomJid;
	};

	Chat.prototype.processNewUser = function (u) {
	    var self = this;

	    self.logger.debug("added: ", u);

	    if (self.plugins.presencedIntegration) {
	        self.plugins.presencedIntegration.addContact(u);
	    }

	    this.karere.subscribe(megaChat.getJidFromNodeId(u), self.getMyXMPPPassword());

	    self.renderMyStatus();
	};

	Chat.prototype.processRemovedUser = function (u) {
	    var self = this;

	    self.logger.debug("removed: ", u);

	    if (self.plugins.presencedIntegration) {
	        self.plugins.presencedIntegration.removeContact(u);
	    }

	    this.karere.unsubscribe(megaChat.getJidFromNodeId(u), self.getMyXMPPPassword());

	    self.renderMyStatus();
	};

	Chat.prototype.refreshConversations = function () {
	    var self = this;

	    if (!self.$container && !megaChatIsReady && u_type == 0) {
	        $('.fm-chat-block').hide();
	        return false;
	    }

	    if (self.$container.parent('.section.conversations .fm-right-files-block').size() == 0) {
	        $('.section.conversations .fm-right-files-block').append(self.$container);
	    }
	};

	Chat.prototype.closeChatPopups = function () {
	    var activePopup = $('.chat-popup.active');
	    var activeButton = $('.chat-button.active');
	    activeButton.removeClass('active');
	    activePopup.removeClass('active');

	    if (activePopup.attr('class')) {
	        activeButton.removeClass('active');
	        activePopup.removeClass('active');
	        if (activePopup.attr('class').indexOf('fm-add-contact-popup') === -1 && activePopup.attr('class').indexOf('fm-start-call-popup') === -1) activePopup.css('left', '-' + 10000 + 'px');else activePopup.css('right', '-' + 10000 + 'px');
	    }
	};

	Chat.prototype.getChatNum = function (idx) {
	    return this.chats[this.chats.keys()[idx]];
	};

	Chat.prototype.getXmppServiceUrl = function (timeout) {
	    var self = this;

	    if (localStorage.megaChatUseSandbox) {
	        return "https://karere-005.developers.mega.co.nz/bosh";
	    } else if (localStorage.customXmppServiceUrl) {
	        return localStorage.customXmppServiceUrl;
	    } else {
	        var $promise = new MegaPromise();

	        $.ajax("https://" + self.options.loadbalancerService + "/?service=xmpp", {
	            method: "GET",
	            timeout: timeout ? timeout : 10000
	        }).done(function (r) {
	            if (r.xmpp && r.xmpp.length > 0) {
	                var randomHost = array_random(r.xmpp);
	                if (webSocketsSupport) {
	                    $promise.resolve("wss://" + randomHost.host + "/ws");
	                } else {
	                    $promise.resolve("https://" + randomHost.host + "/bosh");
	                }
	            } else if (!r.xmpp || r.xmpp.length === 0) {
	                self.logger.error("GeLB returned no results. Halting.");
	                $promise.reject();
	            } else {
	                var server = array_random(self.options.fallbackXmppServers);
	                self.logger.error("Got empty list from the load balancing service for xmpp, will fallback to: " + server + ".");
	                if (webSocketsSupport) {
	                    server = server.replace("https:", "wss:").replace("/bosh", "/ws");
	                }
	                $promise.resolve(server);
	            }
	        }).fail(function () {
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

	Chat.prototype.renderListing = function () {
	    var self = this;

	    self.hideAllChats();

	    hideEmptyGrids();

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
	    } else {
	        $('.fm-empty-conversations').addClass('hidden');

	        if (self.lastOpenedChat && self.chats[self.lastOpenedChat] && self.chats[self.lastOpenedChat]._leaving !== true) {

	            self.chats[self.lastOpenedChat].setActive();
	            self.chats[self.lastOpenedChat].show();
	            return self.chats[self.lastOpenedChat];
	        } else {

	            var sortedConversations = obj_values(self.chats.toJS());

	            sortedConversations.sort(mega.utils.sortObjFn("lastActivity", -1));

	            if (sortedConversations.length > 0) {
	                var room = sortedConversations[0];
	                room.setActive();
	                room.show();
	                return room;
	            } else {
	                $('.fm-empty-conversations').removeClass('hidden');
	            }
	        }
	    }
	};

	Chat.prototype.getPrivateRoom = function (h) {
	    var self = this;

	    var jid = self.getJidFromNodeId(h);

	    var found = false;
	    self.chats.forEach(function (v, k) {
	        if (v.type === "private" && v.getParticipantsExceptMe()[0] == jid) {
	            found = v;
	            return false;
	        }
	    });

	    return found;
	};

	Chat.prototype.createAndShowPrivateRoomFor = function (h) {
	    chatui(h);
	    return this.getPrivateRoom(h);
	};

	Chat.prototype.createAndShowGroupRoomFor = function (contactHashes) {
	    this.trigger('onNewGroupChatRequest', [contactHashes]);
	};

	Chat.prototype._destroyAllChatsFromChatd = function () {
	    var self = this;

	    asyncApiReq({ 'a': 'mcf', 'v': Chatd.VERSION }).done(function (r) {
	        r.c.forEach(function (chatRoomMeta) {
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
	        });
	    });
	};

	Chat.prototype.updateDashboard = function () {
	    if (M.currentdirid === 'dashboard') {
	        delay('dashboard:updchat', dashboardUI.updateChatWidget);
	    }
	};

	Chat.prototype.getEmojiDataSet = function (name) {
	    var self = this;
	    assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");

	    if (!self._emojiDataLoading) {
	        self._emojiDataLoading = {};
	    }
	    if (!self._emojiData) {
	        self._emojiData = {};
	    }

	    if (self._emojiData[name]) {
	        return MegaPromise.resolve(self._emojiData[name]);
	    } else if (self._emojiDataLoading[name]) {
	        return self._emojiDataLoading[name];
	    } else {
	        self._emojiDataLoading[name] = MegaPromise.asMegaPromiseProxy($.getJSON(staticpath + "js/chat/emojidata/" + name + ".json?v=" + EMOJI_DATASET_VERSION));
	        self._emojiDataLoading[name].done(function (data) {
	            self._emojiData[name] = data;
	            delete self._emojiDataLoading[name];
	        }).fail(function () {
	            delete self._emojiDataLoading[name];
	        });

	        return self._emojiDataLoading[name];
	    }
	};

	window.Chat = Chat;
	window.chatui = chatui;

	module.exports = {
	    Chat: Chat,
	    chatui: chatui
	};

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = React;

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = ReactDOM;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var PerfectScrollbar = __webpack_require__(7).PerfectScrollbar;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var ConversationPanelUI = __webpack_require__(11);

	var ConversationsListItem = React.createClass({
	    displayName: "ConversationsListItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        self.chatRoomChangeListener = function () {
	            self.forceUpdate();
	        };
	        self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
	    },
	    render: function render() {
	        var classString = "";

	        var megaChat = this.props.chatRoom.megaChat;
	        var chatRoom = this.props.chatRoom;
	        if (!chatRoom || !chatRoom.roomJid) {
	            return null;
	        }

	        var roomShortJid = chatRoom.roomJid.split("@")[0];

	        if (chatRoom.isCurrentlyActive) {
	            classString += " active";
	        }

	        var contactJid;
	        var presenceClass;
	        var id;

	        if (chatRoom.type === "private") {
	            contactJid = chatRoom.getParticipantsExceptMe()[0];
	            var contact = chatRoom.megaChat.getContactFromJid(contactJid);

	            if (!contact) {
	                return null;
	            }
	            id = 'conversation_' + htmlentities(contact.u);

	            var caps = megaChat.karere.getCapabilities(contactJid);
	            if (caps) {
	                Object.keys(caps).forEach(function (k) {
	                    var v = caps[k];
	                    if (v) {
	                        classString += " chat-capability-" + k;
	                    }
	                });
	            }

	            presenceClass = chatRoom.megaChat.xmppPresenceToCssClass(contact.presence);
	        } else if (chatRoom.type === "group") {
	            contactJid = roomShortJid;
	            id = 'conversation_' + contactJid;
	            presenceClass = 'group';
	            classString += ' groupchat';
	        } else {
	            return "unknown room type: " + chatRoom.roomJid.split("@")[0];
	        }

	        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
	        var unreadDiv = null;
	        var isUnread = false;
	        if (unreadCount > 0) {
	            unreadDiv = React.makeElement(
	                "div",
	                { className: "unread-messages" },
	                unreadCount > 9 ? "9+" : unreadCount
	            );
	            isUnread = true;
	        }

	        var inCallDiv = null;

	        var lastMessageDiv = null;
	        var lastMessageDatetimeDiv = null;
	        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
	        if (lastMessage) {
	            var lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");

	            var renderableSummary = lastMessage.textContents;

	            if (lastMessage.isManagement && lastMessage.isManagement()) {
	                renderableSummary = lastMessage.getManagementMessageSummaryText();
	            }

	            renderableSummary = htmlentities(renderableSummary);
	            renderableSummary = megaChat.plugins.emoticonsFilter.processHtmlMessage(renderableSummary);

	            lastMessageDiv = React.makeElement("div", { className: lastMsgDivClasses, dangerouslySetInnerHTML: { __html: renderableSummary } });

	            var timestamp = lastMessage.delay;
	            var curTimeMarker;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + msgDate.getHours() + ":" + msgDate.getMinutes();
	            } else {

	                curTimeMarker = acc_time2date(timestamp, true);
	            }

	            lastMessageDatetimeDiv = React.makeElement(
	                "div",
	                { className: "date-time" },
	                curTimeMarker
	            );
	        } else {
	            var lastMsgDivClasses = "conversation-message";

	            var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];

	            if (ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
	                if (!ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached) {
	                    ChatdIntegration.mcfHasFinishedPromise.always(function () {
	                        megaChat.chats.trackDataChange();
	                    });
	                    ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached = true;
	                }
	            }

	            lastMessageDiv = React.makeElement(
	                "div",
	                null,
	                React.makeElement(
	                    "div",
	                    { className: lastMsgDivClasses },
	                    __(emptyMessage)
	                )
	            );
	        }

	        if (chatRoom.callSession && chatRoom.callSession.isActive() === true) {
	            var mediaOptions = chatRoom.callSession.getMediaOptions();

	            var mutedMicrophone = null;
	            var activeCamera = null;

	            if (!mediaOptions.audio) {
	                mutedMicrophone = React.makeElement("i", { className: "small-icon grey-crossed-mic" });
	            }
	            if (mediaOptions.video) {
	                activeCamera = React.makeElement("i", { className: "small-icon grey-videocam" });
	            }
	            inCallDiv = React.makeElement(
	                "div",
	                { className: "call-duration" },
	                mutedMicrophone,
	                activeCamera,
	                React.makeElement(
	                    "span",
	                    { className: "call-counter", "data-room-jid": chatRoom.roomJid.split("@")[0] },
	                    secondsToTimeShort(chatRoom._currentCallCounter)
	                )
	            );

	            classString += " call-active";
	        }

	        return React.makeElement(
	            "li",
	            { className: classString, id: id, "data-room-jid": roomShortJid, "data-jid": contactJid, onClick: this.props.onConversationClicked },
	            React.makeElement(
	                "div",
	                { className: "user-card-name conversation-name" },
	                chatRoom.getRoomTitle(),
	                chatRoom.type === "private" ? React.makeElement("span", { className: "user-card-presence " + presenceClass }) : undefined
	            ),
	            unreadDiv,
	            inCallDiv,
	            lastMessageDiv,
	            lastMessageDatetimeDiv
	        );
	    }
	});

	var ConversationsList = React.createClass({
	    displayName: "ConversationsList",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    conversationClicked: function conversationClicked(room, e) {

	        loadSubPage(room.getRoomUrl());
	        e.stopPropagation();
	    },
	    currentCallClicked: function currentCallClicked(e) {
	        var activeCallSession = this.props.megaChat.activeCallSession;
	        if (activeCallSession) {
	            this.conversationClicked(activeCallSession.room, e);
	        }
	    },
	    contactClicked: function contactClicked(contact, e) {
	        loadSubPage("fm/chat/" + contact.u);
	        e.stopPropagation();
	    },
	    endCurrentCall: function endCurrentCall(e) {
	        var activeCallSession = this.props.megaChat.activeCallSession;
	        if (activeCallSession) {
	            activeCallSession.endCall('hangup');
	            this.conversationClicked(activeCallSession.room, e);
	        }
	    },
	    render: function render() {
	        var self = this;

	        var currentCallingContactStatusProps = {
	            'className': "nw-conversations-item current-calling",
	            'data-jid': ''
	        };

	        var megaChat = this.props.megaChat;

	        var activeCallSession = megaChat.activeCallSession;
	        if (activeCallSession && activeCallSession.room && megaChat.activeCallSession.isActive()) {
	            var room = activeCallSession.room;
	            var user = room.getParticipantsExceptMe()[0];
	            user = megaChat.getContactFromJid(user);

	            if (user) {
	                currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.xmppPresenceToCssClass(user.presence);
	                currentCallingContactStatusProps['data-jid'] = room.roomJid;

	                if (room.roomJid == megaChat.currentlyOpenedChat) {
	                    currentCallingContactStatusProps.className += " selected";
	                }
	            } else {
	                currentCallingContactStatusProps.className += ' hidden';
	            }
	        } else {
	            currentCallingContactStatusProps.className += ' hidden';
	        }

	        var currConvsList = [];

	        var sortedConversations = obj_values(this.props.chats.toJS());

	        sortedConversations.sort(mega.utils.sortObjFn("lastActivity", -1));

	        sortedConversations.forEach(function (chatRoom) {
	            var contact;
	            if (!chatRoom || !chatRoom.roomJid) {
	                return;
	            }

	            if (chatRoom.type === "private") {
	                contact = chatRoom.getParticipantsExceptMe()[0];
	                if (!contact) {
	                    return;
	                }
	                contact = chatRoom.megaChat.getContactFromJid(contact);

	                if (contact) {
	                    if (!chatRoom.privateReadOnlyChat && contact.c === 0) {

	                        Soon(function () {
	                            chatRoom.privateReadOnlyChat = true;
	                        });
	                    } else if (chatRoom.privateReadOnlyChat && contact.c !== 0) {

	                        Soon(function () {
	                            chatRoom.privateReadOnlyChat = false;
	                        });
	                    }
	                }
	            }

	            currConvsList.push(React.makeElement(ConversationsListItem, {
	                key: chatRoom.roomJid.split("@")[0],
	                chatRoom: chatRoom,
	                contact: contact,
	                messages: chatRoom.messagesBuff,
	                megaChat: megaChat,
	                onConversationClicked: function onConversationClicked(e) {
	                    self.conversationClicked(chatRoom, e);
	                } }));
	        });

	        return React.makeElement(
	            "div",
	            { className: "conversationsList" },
	            React.makeElement(
	                "ul",
	                { className: "conversations-pane" },
	                currConvsList
	            )
	        );
	    }
	});

	var ConversationsApp = React.createClass({
	    displayName: "ConversationsApp",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getInitialState: function getInitialState() {
	        return {
	            'leftPaneWidth': mega.config.get('leftPaneWidth')
	        };
	    },
	    startChatClicked: function startChatClicked(selected) {
	        if (selected.length === 1) {
	            loadSubPage("fm/chat/" + selected[0]);
	            this.props.megaChat.createAndShowPrivateRoomFor(selected[0]);
	        } else {
	            this.props.megaChat.createAndShowGroupRoomFor(selected);
	        }
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;

	        window.addEventListener('resize', this.handleWindowResize);
	        $(document).rebind('keydown.megaChatTextAreaFocus', function (e) {

	            if (e.megaChatHandled) {
	                return;
	            }

	            var megaChat = self.props.megaChat;
	            if (megaChat.currentlyOpenedChat) {

	                if ($(e.target).is(".messages-textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $('.fm-dialog:visible,.dropdown:visible').length > 0 || $('input:focus,textarea:focus,select:focus').length > 0) {
	                    return;
	                }

	                var $typeArea = $('.messages-textarea:visible:first');
	                moveCursortoToEnd($typeArea);
	                e.megaChatHandled = true;
	                $typeArea.triggerHandler(e);
	                e.preventDefault();
	                e.stopPropagation();
	                return false;
	            }
	        });

	        $(document).rebind('mouseup.megaChatTextAreaFocus', function (e) {

	            if (e.megaChatHandled) {
	                return;
	            }

	            var $target = $(e.target);

	            var megaChat = self.props.megaChat;
	            if (megaChat.currentlyOpenedChat) {

	                if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.closest('.messages.scroll-area').length > 0 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $('.fm-dialog:visible,.dropdown:visible').length > 0 || $('input:focus,textarea:focus,select:focus').length > 0) {
	                    return;
	                }

	                var $typeArea = $('.messages-textarea:visible:first');
	                if ($typeArea.size() === 1 && !$typeArea.is(":focus")) {
	                    $typeArea.focus();
	                    e.megaChatHandled = true;
	                    moveCursortoToEnd($typeArea[0]);
	                }
	            }
	        });

	        self.fmConfigThrottling = null;
	        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function () {
	            var lPane = $('.conversationsApp .fm-left-panel');
	            clearTimeout(self.fmConfigThrottling);
	            self.fmConfigThrottling = setTimeout(function fmConfigThrottlingLeftPaneResize() {
	                self.setState({
	                    'leftPaneWidth': mega.config.get('leftPaneWidth')
	                });
	                $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
	                $('.jScrollPaneContainer:visible').trigger('forceResize');
	            }, 75);
	            lPane.width(mega.config.get('leftPaneWidth'));
	            $('.fm-tree-panel', lPane).width(mega.config.get('leftPaneWidth'));
	        });

	        var lPaneResizableInit = function lPaneResizableInit() {
	            var lPane = $('.conversationsApp .fm-left-panel');
	            $.leftPaneResizableChat = new FMResizablePane(lPane, $.leftPaneResizable.options);

	            if (fmconfig.leftPaneWidth) {
	                lPane.width(Math.min($.leftPaneResizableChat.options.maxWidth, Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)));
	            }

	            $($.leftPaneResizableChat).on('resize', function () {
	                var w = lPane.width();
	                if (w >= $.leftPaneResizableChat.options.maxWidth) {
	                    $('.left-pane-drag-handle').css('cursor', 'w-resize');
	                } else if (w <= $.leftPaneResizableChat.options.minWidth) {
	                    $('.left-pane-drag-handle').css('cursor', 'e-resize');
	                } else {
	                    $('.left-pane-drag-handle').css('cursor', 'we-resize');
	                }

	                $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
	            });

	            $($.leftPaneResizableChat).on('resizestop', function () {
	                $('.fm-left-panel').width(lPane.width());

	                $('.jScrollPaneContainer:visible').trigger('forceResize');

	                setTimeout(function () {
	                    $('.hiden-when-dragging').removeClass('hiden-when-dragging');
	                }, 100);
	            });
	        };

	        if (typeof $.leftPaneResizable === 'undefined') {
	            mBroadcaster.once('fm:initialized', function () {
	                lPaneResizableInit();
	            });
	        } else {
	            lPaneResizableInit();
	        }

	        this.handleWindowResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        window.removeEventListener('resize', this.handleWindowResize);
	        $(document).unbind('keydown.megaChatTextAreaFocus');
	        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.handleWindowResize();
	    },
	    handleWindowResize: function handleWindowResize() {

	        $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
	            'margin-left': $('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width() + "px"
	        });
	    },
	    render: function render() {
	        var self = this;

	        var presence = self.props.megaChat.karere.getMyPresence();

	        var startChatIsDisabled = !presence || presence === "offline" || presence === "unavailable";

	        var leftPanelStyles = {};

	        if (self.state.leftPaneWidth) {
	            leftPanelStyles.width = self.state.leftPaneWidth;
	        }

	        return React.makeElement(
	            "div",
	            { className: "conversationsApp", key: "conversationsApp" },
	            React.makeElement(
	                "div",
	                { className: "fm-left-panel chat-left-panel", style: leftPanelStyles },
	                React.makeElement("div", { className: "left-pane-drag-handle" }),
	                React.makeElement(
	                    "div",
	                    { className: "fm-left-menu conversations" },
	                    React.makeElement(
	                        "div",
	                        { className: "nw-fm-tree-header conversations" },
	                        React.makeElement(
	                            "span",
	                            null,
	                            __(l[7997])
	                        ),
	                        React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                group: "conversationsListing",
	                                icon: "white-medium-plus",
	                                disabled: startChatIsDisabled,
	                                contacts: this.props.contacts
	                            },
	                            React.makeElement(DropdownsUI.DropdownContactsSelector, {
	                                contacts: this.props.contacts,
	                                megaChat: this.props.megaChat,
	                                onSelectDone: this.startChatClicked,
	                                multiple: true
	                            })
	                        )
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "fm-tree-panel manual-tree-panel-scroll-management", style: leftPanelStyles },
	                    React.makeElement(
	                        PerfectScrollbar,
	                        { style: leftPanelStyles },
	                        React.makeElement(
	                            "div",
	                            { className: "content-panel conversations" + (getSitePath().indexOf("/chat") !== -1 ? " active" : "") },
	                            React.makeElement(ConversationsList, { chats: this.props.megaChat.chats, megaChat: this.props.megaChat, contacts: this.props.contacts })
	                        )
	                    )
	                )
	            ),
	            React.makeElement(
	                "div",
	                { className: "fm-right-files-block" },
	                React.makeElement(
	                    "div",
	                    { className: "fm-empty-messages hidden" },
	                    React.makeElement(
	                        "div",
	                        { className: "fm-empty-pad" },
	                        React.makeElement("div", { className: "fm-empty-messages-bg" }),
	                        React.makeElement(
	                            "div",
	                            { className: "fm-empty-cloud-txt" },
	                            __(l[6870])
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "fm-not-logged-text" },
	                            React.makeElement("div", { className: "fm-not-logged-description", dangerouslySetInnerHTML: {
	                                    __html: __(l[8762]).replace("[S]", "<span className='red'>").replace("[/S]", "</span>")
	                                } }),
	                            React.makeElement(
	                                "div",
	                                { className: "fm-not-logged-button create-account" },
	                                __(l[968])
	                            )
	                        )
	                    )
	                ),
	                React.makeElement(ConversationPanelUI.ConversationPanels, _extends({}, this.props, {
	                    conversations: this.props.megaChat.chats
	                }))
	            )
	        );
	    }
	});

	module.exports = {
	    ConversationsList: ConversationsList,
	    ConversationsApp: ConversationsApp
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);

	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var JScrollPane = React.createClass({
	    displayName: "JScrollPane",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            className: "jScrollPaneContainer",
	            requiresUpdateOnResize: true
	        };
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $elem = $(ReactDOM.findDOMNode(self));

	        $elem.height('100%');

	        $elem.find('.jspContainer').replaceWith(function () {
	            var $children = $elem.find('.jspPane').children();
	            if ($children.size() === 0 || $children.size() > 1) {
	                console.error("JScrollPane on element: ", $elem, "encountered multiple (or zero) children nodes.", "Mean while, JScrollPane should always (!) have 1 children element.");
	            }
	            return $children;
	        });

	        var options = $.extend({}, {
	            enableKeyboardNavigation: false,
	            showArrows: true,
	            arrowSize: 8,
	            animateScroll: true,
	            container: $('.jspContainer', $elem),
	            pane: $('.jspPane', $elem)
	        }, self.props.options);

	        $elem.jScrollPane(options);

	        if (self.props.onFirstInit) {
	            self.props.onFirstInit($elem.data('jsp'), $elem);
	        }
	        $elem.rebind('jsp-will-scroll-y.jsp' + self.getUniqueId(), function (e) {
	            if ($elem.attr('data-scroll-disabled') === "true") {
	                e.preventDefault();
	                e.stopPropagation();

	                return false;
	            }
	        });

	        $elem.rebind('jsp-user-scroll-y.jsp' + self.getUniqueId(), function (e, scrollPositionY, isAtTop, isAtBottom) {
	            if (self.props.onUserScroll) {
	                if ($(e.target).is($elem)) {
	                    self.props.onUserScroll($elem.data('jsp'), $elem, e, scrollPositionY, isAtTop, isAtBottom);
	                }
	            }
	        });

	        $elem.rebind('forceResize.jsp' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
	            self.onResize(forced, scrollPositionYPerc, scrollToElement);
	        });
	        $(window).rebind('resize.jsp' + self.getUniqueId(), self.onResize);
	        self.onResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var $elem = $(ReactDOM.findDOMNode(this));
	        $elem.unbind('jsp-will-scroll-y.jsp' + this.getUniqueId());

	        $(window).unbind('resize.jsp' + this.getUniqueId());
	    },
	    eventuallyReinitialise: function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
	        var self = this;

	        if (!self.isMounted()) {
	            return;
	        }
	        if (!self.isComponentVisible()) {
	            return;
	        }

	        var $elem = $(ReactDOM.findDOMNode(self));

	        var currHeights = [$('.jspPane', $elem).outerHeight(), $elem.outerHeight()];

	        if (forced || self._lastHeights != currHeights) {

	            self._lastHeights = currHeights;

	            self._doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem);
	        }
	    },
	    _doReinit: function _doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem) {
	        var self = this;

	        if (!self.isMounted()) {
	            return;
	        }
	        if (!self.isComponentVisible()) {
	            return;
	        }

	        self._lastHeights = currHeights;
	        var $jsp = $elem.data('jsp');
	        if ($jsp) {
	            $jsp.reinitialise();

	            var manualReinitialiseControl = false;
	            if (self.props.onReinitialise) {
	                manualReinitialiseControl = self.props.onReinitialise($jsp, $elem, forced, scrollPositionYPerc, scrollToElement);
	            }

	            if (manualReinitialiseControl === false) {
	                if (scrollPositionYPerc) {

	                    if (scrollPositionYPerc === -1) {
	                        $jsp.scrollToBottom();
	                    } else {
	                        $jsp.scrollToPercentY(scrollPositionYPerc, false);
	                    }
	                } else if (scrollToElement) {
	                    $jsp.scrollToElement(scrollToElement);
	                }
	            }
	        }
	    },
	    onResize: function onResize(forced, scrollPositionYPerc, scrollToElement) {
	        if (forced && forced.originalEvent) {
	            forced = true;
	            scrollPositionYPerc = undefined;
	        }

	        this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.onResize();
	    },
	    render: function render() {
	        return React.makeElement(
	            "div",
	            _extends({}, this.props, { onResize: this.onResize }),
	            React.makeElement(
	                "div",
	                { className: "jspContainer" },
	                React.makeElement(
	                    "div",
	                    { className: "jspPane" },
	                    this.props.children
	                )
	            )
	        );
	    }
	});

	var RenderTo = React.createClass({
	    displayName: "RenderTo",

	    componentDidMount: function componentDidMount() {
	        this.popup = document.createElement("div");
	        this.popup.className = this.props.className ? this.props.className : "";
	        if (this.props.style) {
	            $(this.popup).css(this.props.style);
	        }
	        this.props.element.appendChild(this.popup);
	        this._renderLayer();
	        if (this.props.popupDidMount) {
	            this.props.popupDidMount(this.popup);
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this._renderLayer();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        ReactDOM.unmountComponentAtNode(this.popup);
	        if (this.props.popupWillUnmount) {
	            this.props.popupWillUnmount(this.popup);
	        }
	        this.props.element.removeChild(this.popup);
	    },
	    _renderLayer: function _renderLayer() {
	        ReactDOM.render(this.props.children, this.popup);
	    },
	    render: function render() {

	        return null;
	    }

	});

	module.exports = {
	    JScrollPane: JScrollPane,
	    RenderTo: RenderTo
	};

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var ReactDOM = __webpack_require__(3);

	// copied from Facebook's shallowEqual, used in PureRenderMixin, because it was defined as a _private_ module and
	// adapted to be a bit more optimal for functions...
	function shallowEqual(objA, objB) {
	    if (objA === objB) {
	        return true;
	    }
	    var key;
	    // Test for A's keys different from B.
	    for (key in objA) {
	        if (key === "children") {
	            // skip!
	            continue;
	        }
	        if (objA.hasOwnProperty(key)) {
	            if (!objB.hasOwnProperty(key)) {
	                return false;
	            }
	            else if (objA[key] !== objB[key]) {
	                // handle/match functions code
	                if (typeof(objA[key]) === 'function' && typeof(objB[key]) === 'function') {
	                    if (objA[key].toString() !== objB[key].toString()) {
	                        return false;
	                    }
	                }
	                else {
	                    return false;
	                }
	            }
	        }
	    }
	    // Test for B's keys missing from A.
	    for (key in objB) {
	        if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
	            return false;
	        }
	    }
	    return true;
	}

	window.shallowEqual = shallowEqual;

	var MAX_ALLOWED_DEBOUNCED_UPDATES = 1;
	var DEBOUNCED_UPDATE_TIMEOUT = 40;
	var REENABLE_UPDATES_AFTER_TIMEOUT = 300;

	var MAX_TRACK_CHANGES_RECURSIVE_DEPTH = 1;
	var _propertyTrackChangesVars = {
	    _dataChangedHistory: {},
	    _listenersMap: {}
	};

	if (window._propertyTrackChangesVars) {
	    _propertyTrackChangesVars = window._propertyTrackChangesVars;
	}
	else {
	    window._propertyTrackChangesVars = _propertyTrackChangesVars;
	}

	window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;

	var MegaRenderMixin = {
	    getReactId: function() {
	        return this._reactInternalInstance._rootNodeID;
	    },
	    getUniqueId: function() {
	        if (!this._reactInternalInstance) {
	            assert(this._uniqueId, 'missing unique id.');
	            return this._uniqueId;
	        }
	        this._uniqueId = this.getReactId().replace(/[^a-zA-Z0-9]/g, "");
	        return this._uniqueId;
	    },
	    debouncedForceUpdate: function() {
	        var self = this;
	        if (self.skippedUpdates) {
	            self.skippedUpdates = 0;
	        }

	        if (self.debounceTimer) {
	           clearTimeout(self.debounceTimer);
	            // console.error(self.getUniqueId(), self.skippedUpdates + 1);
	           self.skippedUpdates++;
	        }
	        var TIMEOUT_VAL = DEBOUNCED_UPDATE_TIMEOUT;

	        if (self.skippedUpdates > MAX_ALLOWED_DEBOUNCED_UPDATES) {
	            TIMEOUT_VAL = 0;
	        }

	        self.debounceTimer = setTimeout(function() {
	            self.eventuallyUpdate();
	            self.debounceTimer = null;
	            self.skippedUpdates = 0;
	        }, TIMEOUT_VAL);
	    },
	    componentDidMount: function() {

	        if (this.props.requiresUpdateOnResize) {
	            $(window).rebind('resize.megaRenderMixing' + this.getUniqueId(), this.onResizeDoUpdate);
	        }
	        // window.addEventListener('hashchange', this.onHashChangeDoUpdate);

	        // init on data structure change events
	        if (this.props) {
	            this._recurseAddListenersIfNeeded("p", this.props);
	        }

	        if (this.state) {
	            this._recurseAddListenersIfNeeded("s", this.state);
	        }

	        //$(window).rebind(
	        //    'DOMContentLoaded.lazyRenderer' + this.getUniqueId() + ' ' +
	        //    'load.lazyRenderer' + this.getUniqueId() + ' ' +
	        //    'resize.lazyRenderer' + this.getUniqueId() + ' ' +
	        //    'hashchange.lazyRenderer' + this.getUniqueId() + ' ' +
	        //    'scroll.lazyRenderer' + this.getUniqueId(),
	        //    this.requiresLazyRendering
	        //);
	        //
	        //this.requiresLazyRendering();

	        this._isMounted = true;
	    },
	    findDOMNode: function() {
	        if (this.domNode) {
	            // injected by RenderTo and ModalDialogs
	            return this.domNode;
	        }

	        return ReactDOM.findDOMNode(this);
	    },
	    componentWillUnmount: function() {
	        if (this.props.requiresUpdateOnResize) {
	            $(window).unbind('resize.megaRenderMixing' + this.getUniqueId());
	        }

	        // window.removeEventListener('hashchange', this.onHashChangeDoUpdate);

	        this._isMounted = false;
	    },
	    isComponentVisible: function() {
	        var domNode = $(this.findDOMNode());

	        // ._isMounted is faster then .isMounted() or any other operation
	        if (!this._isMounted) {
	            return false;
	        }
	        // offsetParent should NOT trigger a reflow/repaint
	        if (!this.props.hideable && (!domNode || domNode[0].offsetParent === null)) {
	            return false;
	        }
	        if (!domNode.is(":visible")) {
	            return false;
	        }
	        if (!verge.inX(domNode[0]) && !verge.inY(domNode[0])) {
	            return false;
	        }
	        return true;
	    },
	    /**
	     * Lightweight version of .isComponentVisible
	     * @returns {bool}
	     */
	    isComponentEventuallyVisible: function() {
	        var domNode = this.findDOMNode();

	        // ._isMounted is faster then .isMounted() or any other operation
	        if (!this._isMounted) {
	            return false;
	        }
	        // offsetParent should NOT trigger a reflow/repaint
	        if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
	            return false
	        }
	        return true;
	    },
	    eventuallyUpdate: function() {
	        var self = this;

	        if (self._updatesDisabled === true) {
	            return;
	        }
	        if (!self._wasRendered || (self._wasRendered && !self.isMounted())) {
	            return;
	        }
	        if (!self._isMounted) {
	            return;
	        }
	        if (!self.isComponentEventuallyVisible()) {
	            return;
	        }

	        self.safeForceUpdate();
	    },
	    tempDisableUpdates: function(forHowLong) {
	        var self = this;
	        self._updatesDisabled = true;
	        if (self._updatesReenableTimer) {
	            clearTimeout(self._updatesRenableTimer);
	        }

	        var timeout = forHowLong ?
	            forHowLong : (
	                self.REENABLE_UPDATES_AFTER_TIMEOUT ?
	                    self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT
	            );

	        self._updatesReenableTimer = setTimeout(function() {
	            self.tempEnableUpdates();
	        }, timeout);
	    },
	    tempEnableUpdates: function() {
	        clearTimeout(this._updatesReenableTimer);
	        this._updatesDisabled = false;
	        this.eventuallyUpdate();
	    },
	    onResizeDoUpdate: function() {
	        if (!this.isMounted() || this._pendingForceUpdate === true) {
	            return;
	        }

	        this.eventuallyUpdate();
	    },
	    // onHashChangeDoUpdate: function() {
	    //     if (!this.isMounted() || this._pendingForceUpdate === true) {
	    //         return;
	    //     }
	    //
	    //     this.eventuallyUpdate();
	    // },
	    _recurseAddListenersIfNeeded: function(idx, map, depth) {
	        var self = this;
	        depth = depth ? depth : 0;


	        if (typeof map._dataChangeIndex !== "undefined") {
	            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() +
	                            "_" + idx;
	            if (map.addChangeListener && !_propertyTrackChangesVars._listenersMap[cacheKey]) {
	                _propertyTrackChangesVars._listenersMap[cacheKey] = map.addChangeListener(function () {
	                    self.onPropOrStateUpdated(map, idx);
	                });
	            }
	        }
	        if (depth+1 > MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            return;
	        }

	        var mapKeys = map._dataChangeIndex !== undefined ? map.keys() : Object.keys(map);

	        mapKeys.forEach(function(k) {
	            if (map[k]) {
	                self._recurseAddListenersIfNeeded(idx + "_" + k, map[k], depth + 1);
	            }
	        });
	    },
	    _checkDataStructForChanges: function(idx, valA, valB, depth) {
	        var self = this;
	        var foundChanges = false;
	        var v = valA;
	        var rv = valB;

	        // alias
	        var dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;

	        if (!v && v === rv) { // null, undefined, false is ok
	            // console.error('r === rv, !v', k, referenceMap, map);
	            return false; // continue/skip
	        }
	        if (!rv && v) { // null, undefined, false is ok
	            return true;
	        }

	        if (v === null && rv !== null) {
	            return true;
	        }
	        else if (v === null && rv === null) {
	            return false;
	        }
	        
	        if (typeof v._dataChangeIndex !== "undefined") {
	            var cacheKey = this.getReactId() + "_" + v._dataChangeTrackedId + "_" + "_" + this.getElementName() +
	                                "_" + idx;

	            if (dataChangeHistory[cacheKey] !== v._dataChangeIndex) {
	                if (window.RENDER_DEBUG) {
	                    console.error(
	                        "changed: ", self.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v
	                    );
	                }
	                foundChanges = true;
	                dataChangeHistory[cacheKey] = v._dataChangeIndex;
	            } else {
	                // console.error("NOT changed: ", k, v._dataChangeTrackedId, v._dataChangeIndex, v);
	            }
	        } else if (typeof v === "object" && v !== null && depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
	                foundChanges = true;
	            } else {
	                // console.error("NOT (recursive) changed: ", k, v);
	            }
	        } else if (v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            v.forEach(function(v, k) {
	                if (self._recursiveSearchForDataChanges(idx, v[k], rv[k], depth + 1) === true) {
	                    foundChanges = true;
	                    return false; // break
	                }
	            });
	        } else {
	            // console.error("NOT tracked/changed: ", k, v);
	        }
	        return foundChanges;
	    },
	    _recursiveSearchForDataChanges: function(idx, map, referenceMap, depth) {
	        var self = this;
	        depth = depth || 0;

	        if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
	            return;
	        }

	        if (!this._wasRendered) {
	            if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);

	            this._wasRendered = true;
	            return true; // first time render, always render the first time
	        }
	        // quick lookup for children
	        if (
	            idx === "p_children"
	        ) {
	            // found a list of children nodes
	            if (map.map && referenceMap.map) {
	                var oldKeys = map.map(function(child) { return child.key; });
	                var newKeys = referenceMap.map(function(child) { return child.key; });
	                if (!shallowEqual(oldKeys, newKeys)) {
	                    return true;
	                }
	            }
	            else if (
	                (!map && referenceMap) ||
	                (map && !referenceMap)
	            ) {
	                return true;
	            }
	            else if (
	                map.$$typeof && referenceMap.$$typeof
	            ) {
	                if (
	                    !shallowEqual(map.props, referenceMap.props) ||
	                    !shallowEqual(map.state, referenceMap.state)
	                ) {
	                    return true;
	                }

	            }
	            // found a single node
	        }
	        else if (
	            (map && !referenceMap) ||
	            (!map && referenceMap) ||
	            (map && referenceMap && !shallowEqual(map, referenceMap))
	        ) {
	            return true;
	        }

	        var mapKeys = map._dataChangeIndex ? map.keys() : Object.keys(map);

	        var foundChanges = false;
	        mapKeys.forEach(function(k) {
	            if (foundChanges === true) {
	                return false; // break
	            }
	            foundChanges = self._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth);
	        });
	        return foundChanges;
	    },
	    shouldComponentUpdate: function(nextProps, nextState) {
	        var shouldRerender = false;

	        if (
	            !this.isMounted() ||
	            this._pendingForceUpdate === true ||
	            this._updatesDisabled === true
	        ) {
	            if (window.RENDER_DEBUG) {
	                console.error(
	                    "shouldUpdate? No.", "F1", this.getElementName(), this.props, nextProps, this.state, nextState
	                );
	            }
	            return false;
	        }

	        // component specific control of the React lifecycle
	        if (this.specificShouldComponentUpdate) {
	            var r = this.specificShouldComponentUpdate(nextProps, nextState);
	            if (r === false) {
	                if (window.RENDER_DEBUG) {
	                    console.error(
	                        "shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState
	                    );
	                }
	                return false;
	            }
	            else if (r === true) {
	                return true;
	            }
	        }

	        if (!this.isComponentEventuallyVisible()) {
	            if (window.RENDER_DEBUG) {
	                console.error(
	                    "shouldUpdate? No.", "FVis", this.getElementName(), this.props, nextProps, this.state, nextState
	                );
	            }
	            return false;
	        }

	        if (this.props !== null) {
	            shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
	        }
	        if (shouldRerender === false) {
	            if (window.RENDER_DEBUG) {
	                console.error(
	                    "shouldUpdate? No.", "F3", this.getElementName(), this.props, nextProps, this.state, nextState
	                );
	            }
	        }
	        if (shouldRerender === false && this.state !== null) {
	            shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
	        }




	        if (window.RENDER_DEBUG) {
	            if (shouldRerender) {
	                // debugger;
	            }
	            console.error("shouldRerender?",
	                shouldRerender,
	                "rendered: ", this.getElementName(),
	                "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
	                "props:", this.props,
	                "nextProps:", this.props,
	                "state:", this.state
	            );
	        }


	        if (shouldRerender === true) { // (eventually) add listeners to newly added data structures
	            if (this.props) {
	                this._recurseAddListenersIfNeeded("p", this.props);
	            }
	            if (this.state) {
	                this._recurseAddListenersIfNeeded("s", this.state);
	            }
	        } else {
	            if (window.RENDER_DEBUG) {
	                console.error(
	                    "shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState
	                );
	            }
	        }

	        return shouldRerender;
	    },
	    onPropOrStateUpdated: function() {
	        if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

	        if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
	            return;
	        }

	        this.forceUpdate();
	    },
	    getElementName: function() {
	        return this.constructor.displayName;
	    },
	    getRootElement: function() {
	        var rootElement = this;
	        while(rootElement = this._reactInternalInstance._currentElement._owner) {
	            //
	        }
	        return rootElement === this ? null : rootElement;
	    },
	    getOwnerElement: function() {
	        var owner = this._reactInternalInstance._currentElement._owner;
	        if (owner) {
	            return this._reactInternalInstance._currentElement._owner._instance;
	        } else {
	            return null;
	        }
	    },
	    safeForceUpdate: function() {
	        try {
	            if (this._isMounted && this.isMounted()) {
	                this.forceUpdate();
	            }
	        } catch (e) {
	            console.error("safeForceUpdate: ", e);
	        }
	    }
	};

	var RenderDebugger = {
	    componentDidUpdate: function() {
	        if (window.RENDER_DEBUG) {
	            var self = this;
	            var getElementName = function() {
	                if (!self.constructor) {
	                    return "unknown";
	                }
	                return self.constructor.displayName;
	            };

	            console.error(
	                "rendered: ", getElementName(),
	                "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
	                "props:", this.props,
	                "state:", this.state
	            );
	        }
	    }
	};

	window.MegaRenderMixin = MegaRenderMixin;

	module.exports = {
	    RenderDebugger: RenderDebugger,
	    MegaRenderMixin: MegaRenderMixin
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);

	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var PerfectScrollbar = React.createClass({
	    displayName: "PerfectScrollbar",

	    mixins: [MegaRenderMixin],
	    isUserScroll: true,
	    getDefaultProps: function getDefaultProps() {
	        return {
	            className: "perfectScrollbarContainer",
	            requiresUpdateOnResize: true
	        };
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $elem = $(ReactDOM.findDOMNode(self));

	        $elem.height('100%');

	        var options = $.extend({}, {}, self.props.options);

	        Ps.initialize($elem[0], options);

	        if (self.props.onFirstInit) {
	            self.props.onFirstInit(self, $elem);
	        }

	        $(document).rebind('ps-scroll-y.ps' + self.getUniqueId(), function (e) {
	            if ($elem.attr('data-scroll-disabled') === "true") {
	                e.stopPropagation();
	                e.preventDefault();
	                e.originalEvent.stopPropagation();
	                e.originalEvent.preventDefault();
	                return false;
	            }
	            if (self.props.onUserScroll && self.isUserScroll === true && $elem.is(e.target)) {
	                self.props.onUserScroll(self, $elem, e);
	            }
	        });

	        $elem.rebind('disable-scroll.ps' + self.getUniqueId(), function (e) {
	            Ps.destroy($elem[0]);
	        });
	        $elem.rebind('enable-scroll.ps' + self.getUniqueId(), function (e) {
	            Ps.initialize($elem[0], options);
	        });
	        $elem.rebind('forceResize.ps' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
	            self.onResize(forced, scrollPositionYPerc, scrollToElement);
	        });
	        self.onResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var $elem = $(ReactDOM.findDOMNode(this));
	        $(document).unbind('ps-scroll-y.ps' + this.getUniqueId());
	    },
	    eventuallyReinitialise: function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
	        var self = this;

	        if (!self.isMounted()) {
	            return;
	        }
	        if (!self.isComponentEventuallyVisible()) {
	            return;
	        }

	        var $elem = $(self.findDOMNode());

	        if (forced || self._currHeight != self.getContentHeight()) {
	            self._currHeight = self.getContentHeight();
	            self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
	        }
	    },
	    _doReinit: function _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
	        var self = this;

	        if (!self.isMounted()) {
	            return;
	        }
	        if (!self.isComponentEventuallyVisible()) {
	            return;
	        }

	        self.isUserScroll = false;
	        Ps.update($elem[0]);
	        self.isUserScroll = true;

	        var manualReinitialiseControl = false;
	        if (self.props.onReinitialise) {
	            manualReinitialiseControl = self.props.onReinitialise(self, $elem, forced, scrollPositionYPerc, scrollToElement);
	        }

	        if (manualReinitialiseControl === false) {
	            if (scrollPositionYPerc) {
	                if (scrollPositionYPerc === -1) {
	                    self.scrollToBottom(true);
	                } else {
	                    self.scrollToPercentY(scrollPositionYPerc, true);
	                }
	            } else if (scrollToElement) {
	                self.scrollToElement(scrollToElement, true);
	            }
	        }
	    },
	    scrollToBottom: function scrollToBottom(skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        $elem[0].scrollTop = this.getScrollHeight();
	        this.isUserScroll = false;
	        Ps.update($elem[0]);
	        this.isUserScroll = true;

	        if (!skipReinitialised) {
	            this.reinitialised(true);
	        }
	    },
	    reinitialise: function reinitialise(skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        this.isUserScroll = false;
	        Ps.update($elem[0]);
	        this.isUserScroll = true;

	        if (!skipReinitialised) {
	            this.reinitialised(true);
	        }
	    },
	    getScrollHeight: function getScrollHeight() {
	        var $elem = $(this.findDOMNode());
	        var outerHeightContainer = $elem.children(":first").outerHeight();
	        var outerHeightScrollable = $elem.outerHeight();

	        var res = outerHeightContainer - outerHeightScrollable;

	        if (res <= 0) {

	            return this._lastKnownScrollHeight ? this._lastKnownScrollHeight : 0;
	        }
	        this._lastKnownScrollHeight = res;
	        return res;
	    },
	    getContentHeight: function getContentHeight() {
	        var $elem = $(this.findDOMNode());
	        return $elem.children(":first").outerHeight();
	    },
	    isAtTop: function isAtTop() {
	        return this.findDOMNode().scrollTop === 0;
	    },
	    isAtBottom: function isAtBottom() {
	        return this.findDOMNode().scrollTop === this.getScrollHeight();
	    },
	    isCloseToBottom: function isCloseToBottom(minPixelsOff) {
	        return this.getScrollHeight() - this.getScrollPositionY() <= minPixelsOff;
	    },
	    getScrolledPercentY: function getScrolledPercentY() {
	        return 100 / this.getScrollHeight() * this.findDOMNode().scrollTop;
	    },
	    getScrollPositionY: function getScrollPositionY() {
	        return this.findDOMNode().scrollTop;
	    },
	    scrollToPercentY: function scrollToPercentY(posPerc, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        var targetPx = 100 / this.getScrollHeight() * posPerc;
	        if ($elem[0].scrollTop !== targetPx) {
	            $elem[0].scrollTop = targetPx;
	            this.isUserScroll = false;
	            Ps.update($elem[0]);
	            this.isUserScroll = true;
	            if (!skipReinitialised) {
	                this.reinitialised(true);
	            }
	        }
	    },
	    scrollToY: function scrollToY(posY, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        if ($elem[0].scrollTop !== posY) {
	            $elem[0].scrollTop = posY;
	            this.isUserScroll = false;
	            Ps.update($elem[0]);
	            this.isUserScroll = true;
	            if (!skipReinitialised) {
	                this.reinitialised(true);
	            }
	        }
	    },
	    scrollToElement: function scrollToElement(element, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        $elem[0].scrollTop = element.offsetTop;
	        this.isUserScroll = false;
	        Ps.update($elem[0]);
	        this.isUserScroll = true;

	        if (!skipReinitialised) {
	            this.reinitialised(true);
	        }
	    },
	    reinitialised: function reinitialised(forced) {
	        if (this.props.onReinitialise) {
	            this.props.onReinitialise(this, $(this.findDOMNode()), forced ? forced : false);
	        }
	    },
	    onResize: function onResize(forced, scrollPositionYPerc, scrollToElement) {
	        if (forced && forced.originalEvent) {
	            forced = true;
	            scrollPositionYPerc = undefined;
	        }

	        this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        if (this.props.requiresUpdateOnResize) {
	            this.onResize(true);
	        }
	    },
	    render: function render() {
	        return React.makeElement(
	            "div",
	            _extends({}, this.props, { onResize: this.onResize }),
	            this.props.children
	        );
	    }
	});

	module.exports = {
	    PerfectScrollbar: PerfectScrollbar
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var _buttonGroups = {};

	var Button = React.createClass({
	    displayName: "Button",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return { 'focused': false };
	    },
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	        var self = this;

	        if (nextProps.disabled === true && nextState.focused === true) {
	            nextState.focused = false;
	        }

	        if (this.state.focused != nextState.focused && nextState.focused === true) {
	            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	            document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

	            $(document).rebind('keyup.button' + self.getUniqueId(), function (e) {
	                if (self.state.focused === true) {
	                    if (e.keyCode == 27) {
	                        self.onBlur();
	                    }
	                }
	            });

	            if (self._pageChangeListener) {
	                mBroadcaster.removeListener(self._pageChangeListener);
	            }
	            mBroadcaster.addListener('pagechange', function () {
	                if (self.state.focused === true) {
	                    self.onBlur();
	                }
	            });

	            $(document).rebind('closeDropdowns.' + self.getUniqueId(), function (e) {
	                self.onBlur();
	            });

	            if (this.props.group) {
	                if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] != this) {
	                    _buttonGroups[this.props.group].setState({ focused: false });
	                }
	                _buttonGroups[this.props.group] = this;
	            }
	        }

	        if (this.props.group && nextState.focused === false && _buttonGroups[this.props.group] == this) {
	            _buttonGroups[this.props.group] = null;
	        }
	    },
	    renderChildren: function renderChildren() {
	        var self = this;

	        return React.Children.map(this.props.children, function (child) {
	            return React.cloneElement(child, {
	                active: self.state.focused,
	                closeDropdown: function closeDropdown() {
	                    self.setState({ 'focused': false });
	                },
	                onActiveChange: function onActiveChange(newVal) {
	                    var $element = $(self.findDOMNode());
	                    var $scrollables = $element.parents('.jScrollPaneContainer, .perfectScrollbarContainer');
	                    if ($scrollables.size() > 0) {
	                        if (newVal === true) {

	                            $scrollables.attr('data-scroll-disabled', true);
	                            $scrollables.filter('.perfectScrollbarContainer').each(function (k, element) {
	                                Ps.disable(element);
	                            });
	                        } else {

	                            $scrollables.removeAttr('data-scroll-disabled');
	                            $scrollables.filter('.perfectScrollbarContainer').each(function (k, element) {
	                                Ps.enable(element);
	                            });
	                        }
	                    }
	                    if (child.props.onActiveChange) {
	                        child.props.onActiveChange.call(this, newVal);
	                    }
	                }
	            });
	        }.bind(this));
	    },
	    onBlur: function onBlur(e) {
	        if (!this.isMounted()) {
	            return;
	        }
	        var $element = $(ReactDOM.findDOMNode(this));

	        if (!e || !$(e.target).closest(".button").is($element)) {
	            this.setState({ focused: false });
	            $(document).unbind('keyup.button' + this.getUniqueId());
	            $(document).unbind('closeDropdowns.' + this.getUniqueId());
	            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);

	            if (this._pageChangeListener) {
	                mBroadcaster.removeListener(this._pageChangeListener);
	            }
	            this.forceUpdate();
	        }
	    },
	    onClick: function onClick(e) {
	        var $element = $(ReactDOM.findDOMNode(this));

	        if (this.props.disabled === true) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        if ($(e.target).closest(".popup").closest('.button').is($element) && this.state.focused === true) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        if ($(e.target).is("input,textarea,select")) {
	            return;
	        }

	        if (this.state.focused === false) {
	            if (this.props.onClick) {
	                this.props.onClick(this);
	            } else if (React.Children.count(this.props.children) > 0) {
	                this.setState({ 'focused': true });
	            }
	        } else if (this.state.focused === true) {
	            this.setState({ focused: false });
	            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	        }
	    },
	    render: function render() {
	        var classes = this.props.className ? "button " + this.props.className : "button";

	        if (this.props.disabled == true || this.props.disabled == "true") {
	            classes += " disabled";
	        } else if (this.state.focused) {
	            classes += " active";
	        }

	        var label;
	        if (this.props.label) {
	            label = this.props.label;
	        }

	        var icon;
	        if (this.props.icon) {
	            icon = React.makeElement("i", { className: "small-icon " + this.props.icon });
	        }

	        return React.makeElement(
	            "div",
	            { className: classes, onClick: this.onClick, style: this.props.style },
	            icon,
	            label,
	            this.renderChildren()
	        );
	    }
	});

	module.exports = window.ButtonsUI = {
	    Button: Button
	};

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ContactsUI = __webpack_require__(10);
	var PerfectScrollbar = __webpack_require__(7).PerfectScrollbar;

	var Dropdown = React.createClass({
	    displayName: "Dropdown",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            requiresUpdateOnResize: true
	        };
	    },
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            this.onActiveChange(nextProps.active);
	        }
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            return true;
	        } else if (this.props.focused != nextProps.focused) {
	            return true;
	        } else if (this.state && this.state.active != nextState.active) {
	            return true;
	        } else {

	            return undefined;
	        }
	    },
	    onActiveChange: function onActiveChange(newVal) {
	        if (this.props.onActiveChange) {
	            this.props.onActiveChange(newVal);
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;

	        if (this.props.active === true) {
	            if (this.getOwnerElement()) {
	                var $element = $(this.popupElement);
	                var positionToElement = $('.button.active:visible');
	                var offsetLeft = 0;
	                var $container = $element.closest('.jspPane:first');

	                if ($container.size() == 0) {
	                    $container = $(document.body);
	                }

	                $element.css('margin-left', '');

	                $element.position({
	                    of: positionToElement,
	                    my: self.props.positionMy ? self.props.positionMy : "center top",
	                    at: self.props.positionAt ? self.props.positionAt : "center bottom",
	                    collision: "flip flip",
	                    within: $container,
	                    using: function using(obj, info) {
	                        var vertOffset = 0;
	                        var horizOffset = 0;

	                        if (!self.props.noArrow) {
	                            if (info.vertical != "top") {
	                                $(this).removeClass("up-arrow").addClass("down-arrow");
	                            } else {
	                                $(this).removeClass("down-arrow").addClass("up-arrow");
	                            }

	                            var $arrow = $('.dropdown-white-arrow', $element);
	                            vertOffset += info.vertical == "top" ? $arrow.outerHeight() : 0;
	                        }

	                        if (self.props.vertOffset) {
	                            vertOffset += self.props.vertOffset * (info.vertical == "top" ? 1 : -1);
	                        }

	                        if (self.props.horizOffset) {
	                            horizOffset += self.props.horizOffset;
	                        }

	                        $(this).css({
	                            left: obj.left + (offsetLeft ? offsetLeft / 2 : 0) + horizOffset + 'px',
	                            top: obj.top + vertOffset + 'px'
	                        });
	                    }
	                });
	            }
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        if (this.props.active) {

	            this.onActiveChange(false);
	        }
	    },
	    renderChildren: function renderChildren() {
	        var self = this;

	        return React.Children.map(this.props.children, function (child) {
	            if (child) {
	                return React.cloneElement(child, {
	                    active: self.props.active || self.state.active
	                });
	            } else {
	                return null;
	            }
	        }.bind(this));
	    },
	    render: function render() {
	        var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;

	        if (this.props.active !== true) {
	            classes += " hidden";

	            return null;
	        } else {
	            var styles;

	            if (this.getOwnerElement()) {
	                styles = {
	                    'zIndex': 123,
	                    'position': 'absolute',
	                    'width': this.props.styles ? this.props.styles.width : undefined
	                };
	            }

	            var self = this;

	            return React.makeElement(
	                utils.RenderTo,
	                { element: document.body, className: classes, style: styles,
	                    popupDidMount: function popupDidMount(popupElement) {
	                        self.popupElement = popupElement;
	                    },
	                    popupWillUnmount: function popupWillUnmount(popupElement) {
	                        delete self.popupElement;
	                    } },
	                React.makeElement(
	                    "div",
	                    null,
	                    !this.props.noArrow ? React.makeElement("i", { className: "dropdown-white-arrow" }) : null,
	                    this.renderChildren()
	                )
	            );
	        }
	    }
	});

	var DropdownContactsSelector = React.createClass({
	    displayName: "DropdownContactsSelector",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            requiresUpdateOnResize: true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'selected': this.props.selected ? this.props.selected : []
	        };
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            return true;
	        } else if (this.props.focused != nextProps.focused) {
	            return true;
	        } else if (this.state && this.state.active != nextState.active) {
	            return true;
	        } else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
	            return true;
	        } else {

	            return undefined;
	        }
	    },
	    onSelected: function onSelected(nodes) {
	        this.setState({ 'selected': nodes });
	        if (this.props.onSelected) {
	            this.props.onSelected(nodes);
	        }
	        this.forceUpdate();
	    },
	    onSelectClicked: function onSelectClicked() {
	        this.props.onSelectClicked();
	    },
	    render: function render() {
	        var self = this;

	        return React.makeElement(
	            Dropdown,
	            { className: "popup contacts-search " + this.props.className,
	                active: this.props.active,
	                closeDropdown: this.props.closeDropdown,
	                ref: "dropdown",
	                positionMy: this.props.positionMy,
	                positionAt: this.props.positionAt
	            },
	            React.makeElement(ContactsUI.ContactPickerWidget, {
	                active: this.props.active,
	                className: "popup contacts-search",
	                contacts: this.props.contacts,
	                megaChat: this.props.megaChat,
	                exclude: this.props.exclude,
	                multiple: this.props.multiple,
	                onSelectDone: this.props.onSelectDone,
	                multipleSelectedButtonLabel: this.props.multipleSelectedButtonLabel,
	                singleSelectedButtonLabel: this.props.singleSelectedButtonLabel,
	                nothingSelectedButtonLabel: this.props.nothingSelectedButtonLabel
	            })
	        );
	    }
	});

	var DropdownItem = React.createClass({
	    displayName: "DropdownItem",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            requiresUpdateOnResize: true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return { 'isClicked': false };
	    },
	    renderChildren: function renderChildren() {
	        var self = this;
	        return React.Children.map(this.props.children, function (child) {
	            return React.cloneElement(child, {
	                active: self.state.isClicked,
	                closeDropdown: function closeDropdown() {
	                    self.setState({ 'isClicked': false });
	                }
	            });
	        }.bind(this));
	    },
	    onClick: function onClick(e) {
	        var self = this;

	        if (this.props.children) {
	            self.setState({ 'isClicked': !self.state.isClicked });

	            e.stopPropagation();
	            e.preventDefault();
	        }
	    },
	    render: function render() {
	        var self = this;

	        var icon;
	        if (this.props.icon) {
	            icon = React.makeElement("i", { className: "small-icon " + this.props.icon });
	        }
	        var label;
	        if (this.props.label) {
	            label = this.props.label;
	        }

	        var child = null;

	        child = React.makeElement(
	            "div",
	            null,
	            self.renderChildren()
	        );

	        return React.makeElement(
	            "div",
	            {
	                className: "dropdown-item " + self.props.className,
	                onClick: self.props.onClick ? function (e) {
	                    $(document).trigger('closeDropdowns');
	                    self.props.onClick(e);
	                } : self.onClick
	            },
	            icon,
	            label,
	            child
	        );
	    }
	});

	module.exports = window.DropdownsUI = {
	    Dropdown: Dropdown,
	    DropdownItem: DropdownItem,
	    DropdownContactsSelector: DropdownContactsSelector
	};

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var utils = __webpack_require__(5);

	var ContactsListItem = React.createClass({
	    displayName: "ContactsListItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var classString = "nw-conversations-item";

	        var contact = this.props.contact;

	        if (!contact) {
	            return null;
	        }

	        classString += " " + this.props.megaChat.xmppPresenceToCssClass(contact.presence);

	        return React.makeElement(
	            "div",
	            null,
	            React.makeElement(
	                "div",
	                { className: classString,
	                    onClick: this.props.onContactClicked },
	                React.makeElement("div", { className: "nw-contact-status" }),
	                React.makeElement(
	                    "div",
	                    { className: "nw-conversations-unread" },
	                    "0"
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "nw-conversations-name" },
	                    M.getNameByHandle(contact.u)
	                )
	            )
	        );
	    }
	});

	var ContactVerified = React.createClass({
	    displayName: "ContactVerified",

	    mixins: [MegaRenderMixin],
	    render: function render() {
	        var self = this;

	        var contact = this.props.contact;

	        if (!contact) {
	            return null;
	        }

	        var verifiedElement = null;

	        if (u_authring && u_authring.Ed25519) {
	            var verifyState = u_authring.Ed25519[contact.u] || {};
	            verifiedElement = verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON ? React.makeElement("div", { className: "user-card-verified " + this.props.className }) : null;
	        } else {
	            var self = this;

	            crypt.getPubEd25519(contact.u).done(function () {
	                if (self.isMounted()) {
	                    self.safeForceUpdate();
	                }
	            });
	        }

	        return verifiedElement;
	    }
	});
	var ContactPresence = React.createClass({
	    displayName: "ContactPresence",

	    mixins: [MegaRenderMixin],
	    render: function render() {
	        var self = this;
	        var contact = this.props.contact;
	        if (!contact) {
	            return null;
	        }

	        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).xmppPresenceToCssClass(contact.presence);

	        return React.makeElement("div", { className: "user-card-presence " + pres + " " + this.props.className });
	    }
	});

	var _noAvatars = {};

	var Avatar = React.createClass({
	    displayName: "Avatar",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;
	        var contact = this.props.contact;

	        if (!contact) {
	            return null;
	        }

	        if (!contact.m && contact.email) {
	            contact.m = contact.email;
	        }

	        var avatarMeta = useravatar.generateContactAvatarMeta(contact);

	        var classes = (this.props.className ? this.props.className : 'small-rounded-avatar') + ' ' + contact.u;

	        var letterClass = 'avatar-letter';

	        var displayedAvatar;

	        var verifiedElement = null;

	        if (!this.props.hideVerifiedBadge) {
	            verifiedElement = React.makeElement(ContactVerified, { contact: this.props.contact, className: this.props.verifiedClassName });
	        }

	        if (!avatars[contact.u] && !_noAvatars[contact.u]) {
	            useravatar.loadAvatar(contact.u).done(function () {
	                self.safeForceUpdate();
	            }).fail(function (e) {
	                _noAvatars[contact.u] = true;
	            });
	        }

	        if (avatarMeta.type === "image") {
	            displayedAvatar = React.makeElement(
	                "div",
	                { className: classes, style: this.props.style },
	                verifiedElement,
	                React.makeElement("img", { src: avatarMeta.avatar, style: this.props.imgStyles })
	            );
	        } else {
	            classes += " color" + avatarMeta.avatar.colorIndex;

	            displayedAvatar = React.makeElement(
	                "div",
	                { className: classes, style: this.props.style },
	                verifiedElement,
	                React.makeElement("div", { className: letterClass, "data-user-letter": avatarMeta.avatar.letters })
	            );
	        }

	        return displayedAvatar;
	    }
	});

	var ContactCard = React.createClass({
	    displayName: "ContactCard",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'dropdownButtonClasses': "default-white-button tiny-button",
	            'dropdownIconClasses': "tiny-icon grey-down-arrow"
	        };
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate(nextProps, nextState) {
	        var self = this;

	        var foundKeys = Object.keys(self.props);
	        removeValue(foundKeys, 'dropdowns', true);

	        var shouldUpdate = undefined;
	        foundKeys.forEach(function (k) {
	            if (typeof shouldUpdate === 'undefined') {
	                if (!shallowEqual(nextProps[k], self.props[k])) {
	                    shouldUpdate = false;
	                } else {
	                    shouldUpdate = true;
	                }
	            }
	        });

	        if (!shouldUpdate) {

	            if (!shallowEqual(nextState, self.state)) {
	                shouldUpdate = false;
	            } else {
	                shouldUpdate = true;
	            }
	        }
	        if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {

	            if (self.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
	                var oldKeys = self.state.props.dropdowns.map(function (child) {
	                    return child.key;
	                });
	                var newKeys = nextProps.state.dropdowns.map(function (child) {
	                    return child.key;
	                });
	                if (!shallowEqual(oldKeys, newKeys)) {
	                    shouldUpdate = true;
	                }
	            }
	        }

	        return shouldUpdate;
	    },
	    render: function render() {
	        var self = this;

	        var contact = this.props.contact;
	        if (!contact) {
	            return null;
	        }

	        var pres = (this.props.megaChat ? this.props.megaChat : window.megaChat).xmppPresenceToCssClass(contact.presence);
	        var avatarMeta = generateAvatarMeta(contact.u);

	        var contextMenu;
	        if (!this.props.noContextMenu) {
	            var ButtonsUI = __webpack_require__(8);
	            var DropdownsUI = __webpack_require__(9);

	            var moreDropdowns = this.props.dropdowns ? $.extend([], this.props.dropdowns) : [];

	            if (contact.c === 1) {
	                if (moreDropdowns.length > 0) {
	                    moreDropdowns.unshift(React.makeElement("hr", { key: "separator" }));
	                }
	                moreDropdowns.unshift(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "view", icon: "human-profile", label: __(l[8866]), onClick: function onClick() {
	                        loadSubPage('fm/' + contact.u);
	                    } }));
	            }

	            if (moreDropdowns.length > 0) {
	                contextMenu = React.makeElement(
	                    ButtonsUI.Button,
	                    {
	                        className: self.props.dropdownButtonClasses,
	                        icon: self.props.dropdownIconClasses,
	                        disabled: self.props.dropdownDisabled },
	                    React.makeElement(
	                        DropdownsUI.Dropdown,
	                        { className: "contact-card-dropdown",
	                            positionMy: "right top",
	                            positionAt: "right bottom",
	                            vertOffset: 4,
	                            noArrow: true
	                        },
	                        moreDropdowns
	                    )
	                );
	            }
	        }

	        return React.makeElement(
	            "div",
	            {
	                className: "contacts-info body " + (pres === "offline" ? "offline" : "") + (this.props.className ? " " + this.props.className : ""),
	                onClick: function onClick(e) {
	                    if (self.props.onClick) {
	                        self.props.onClick(contact, e);
	                    }
	                },
	                onDoubleClick: function onDoubleClick(e) {
	                    if (self.props.onDoubleClick) {
	                        self.props.onDoubleClick(contact, e);
	                    }
	                },
	                style: self.props.style
	            },
	            React.makeElement(ContactPresence, { contact: contact, className: this.props.presenceClassName }),
	            React.makeElement(Avatar, { contact: contact, className: "small-rounded-avatar" }),
	            contextMenu,
	            React.makeElement(
	                "div",
	                { className: "user-card-data" },
	                React.makeElement(
	                    "div",
	                    { className: "user-card-name small" },
	                    this.props.namePrefix ? this.props.namePrefix : null,
	                    M.getNameByHandle(contact.u)
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "user-card-email small" },
	                    contact.m
	                )
	            )
	        );
	    }
	});

	var ContactPickerWidget = React.createClass({
	    displayName: "ContactPickerWidget",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            'searchValue': '',
	            'selected': false
	        };
	    },
	    getDefaultProps: function getDefaultProps() {
	        return {
	            multipleSelectedButtonLabel: false,
	            singleSelectedButtonLabel: false,
	            nothingSelectedButtonLabel: false
	        };
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({ searchValue: e.target.value });
	    },
	    render: function render() {
	        var self = this;

	        var contacts = [];

	        var footer = null;

	        if (self.props.multiple) {
	            var onSelectDoneCb = function onSelectDoneCb(e) {
	                e.preventDefault();
	                e.stopPropagation();

	                $(document).trigger('closeDropdowns');

	                if (self.props.onSelectDone) {
	                    self.props.onSelectDone(self.state.selected);
	                }
	            };

	            if (!self.state.selected || self.state.selected.length === 0) {
	                footer = React.makeElement(
	                    "div",
	                    { className: "fm-dialog-footer" },
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer-txt" },
	                        self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : __(l[8889])
	                    )
	                );
	            } else if (self.state.selected.length === 1) {
	                footer = React.makeElement(
	                    "div",
	                    { className: "contacts-search-footer" },
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer" },
	                        React.makeElement(
	                            "a",
	                            { href: "javascript:;", className: "default-white-button right", onClick: onSelectDoneCb },
	                            self.props.singleSelectedButtonLabel ? self.props.singleSelectedButtonLabel : l[5885]
	                        )
	                    )
	                );
	            } else if (self.state.selected.length > 1) {
	                footer = React.makeElement(
	                    "div",
	                    { className: "contacts-search-footer" },
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer" },
	                        React.makeElement(
	                            "a",
	                            { href: "javascript:;", className: "default-white-button right", onClick: onSelectDoneCb },
	                            self.props.multipleSelectedButtonLabel ? self.props.multipleSelectedButtonLabel : __(l[8890])
	                        )
	                    )
	                );
	            }
	        }

	        self.props.contacts.forEach(function (v, k) {
	            if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {

	                return;
	            }

	            var pres = self.props.megaChat.karere.getPresence(self.props.megaChat.getJidFromNodeId(v.u));

	            if (v.c == 0 || v.u == u_handle) {
	                return;
	            }

	            var avatarMeta = generateAvatarMeta(v.u);

	            if (self.state.searchValue && self.state.searchValue.length > 0) {

	                if (avatarMeta.fullName.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1 && v.m.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1) {
	                    return;
	                }
	            }

	            if (pres === "chat") {
	                pres = "online";
	            }

	            var selectedClass = "";
	            if (self.state.selected && self.state.selected.indexOf(v.u) !== -1) {
	                selectedClass = "selected";
	            }
	            contacts.push(React.makeElement(ContactCard, {
	                contact: v,
	                className: "contacts-search " + selectedClass,

	                onClick: function onClick(contact, e) {
	                    var contactHash = contact.h;

	                    if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {

	                        if (self.props.onSelected) {
	                            self.props.onSelected([contact.h]);
	                        }
	                        self.props.onSelectDone([contact.h]);
	                        return;
	                    } else {
	                        var selected = clone(self.state.selected || []);

	                        if (selected.indexOf(contactHash) === -1) {
	                            selected.push(contact.h);
	                            if (self.props.onSelected) {
	                                self.props.onSelected(selected);
	                            }
	                        } else {
	                            removeValue(selected, contactHash);
	                            if (self.props.onSelected) {
	                                self.props.onSelected(selected);
	                            }
	                        }
	                        self.setState({ 'selected': selected });
	                    }
	                    self.clickTime = new Date();
	                    self.lastClicked = contactHash;
	                },
	                noContextMenu: true,
	                key: v.u
	            }));
	        });

	        var innerDivStyles = {};

	        if (contacts.length < 6) {
	            innerDivStyles['height'] = Math.max(48, contacts.length * 48);
	            innerDivStyles['overflow'] = "visible";
	        }

	        if (contacts.length === 0) {
	            var noContactsMsg = "";
	            if (M.u.length < 2) {
	                noContactsMsg = __(l[8877]);
	            } else {
	                noContactsMsg = __(l[8878]);
	            }

	            contacts = React.makeElement(
	                "em",
	                null,
	                noContactsMsg
	            );
	        }

	        return React.makeElement(
	            "div",
	            { className: this.props.className },
	            React.makeElement(
	                "div",
	                { className: "contacts-search-header " + this.props.headerClasses },
	                React.makeElement("i", { className: "small-icon search-icon" }),
	                React.makeElement("input", {
	                    type: "search",
	                    placeholder: __(l[8010]),
	                    ref: "contactSearchField",
	                    onChange: this.onSearchChange,
	                    value: this.state.searchValue
	                })
	            ),
	            React.makeElement(
	                utils.JScrollPane,
	                { className: "contacts-search-scroll", selected: this.state.selected },
	                React.makeElement(
	                    "div",
	                    { style: innerDivStyles },
	                    contacts
	                )
	            ),
	            footer
	        );
	    }
	});

	module.exports = {
	    ContactsListItem: ContactsListItem,
	    ContactCard: ContactCard,
	    Avatar: Avatar,
	    ContactPickerWidget: ContactPickerWidget,
	    ContactVerified: ContactVerified,
	    ContactPresence: ContactPresence
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var ModalDialogsUI = __webpack_require__(12);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var ConversationsUI = __webpack_require__(4);
	var TypingAreaUI = __webpack_require__(15);
	var WhosTyping = __webpack_require__(17).WhosTyping;
	var getMessageString = __webpack_require__(18).getMessageString;
	var PerfectScrollbar = __webpack_require__(7).PerfectScrollbar;
	var ParticipantsList = __webpack_require__(19).ParticipantsList;

	var GenericConversationMessage = __webpack_require__(20).GenericConversationMessage;
	var AlterParticipantsConversationMessage = __webpack_require__(22).AlterParticipantsConversationMessage;
	var TruncatedMessage = __webpack_require__(23).TruncatedMessage;
	var PrivilegeChange = __webpack_require__(24).PrivilegeChange;
	var TopicChange = __webpack_require__(25).TopicChange;

	var ConversationRightArea = React.createClass({
	    displayName: "ConversationRightArea",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true
	        };
	    },
	    allContactsInChat: function allContactsInChat(participants) {
	        var self = this;
	        if (participants.length === 0) {
	            return false;
	        }

	        var currentContacts = self.props.contacts;
	        var foundNonMembers = 0;
	        currentContacts.forEach(function (u, k) {
	            if (u.c === 1) {
	                if (participants.indexOf(k) === -1) {
	                    foundNonMembers++;
	                }
	            }
	        });

	        if (foundNonMembers > 0) {
	            return false;
	        } else {
	            return true;
	        }
	    },
	    render: function render() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (!room || !room.roomJid) {

	            return null;
	        }
	        var contactJid;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactJid = contacts[0];
	            contact = room.megaChat.getContactFromJid(contactJid);
	        } else {
	            contact = {};
	        }

	        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
	            return null;
	        }
	        self._wasAppendedEvenOnce = true;

	        var myPresence = room.megaChat.xmppPresenceToCssClass(M.u[u_handle].presence);

	        var startAudioCallButton = React.makeElement(
	            "div",
	            { className: "link-button" + (!contact.presence ? " disabled" : ""), onClick: function onClick() {
	                    if (contact.presence && contact.presence !== "offline") {
	                        room.startAudioCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon audio-call" }),
	            __(l[5896])
	        );

	        var startVideoCallButton = React.makeElement(
	            "div",
	            { className: "link-button" + (!contact.presence ? " disabled" : ""), onClick: function onClick() {
	                    if (contact.presence && contact.presence !== "offline") {
	                        room.startVideoCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon video-call" }),
	            __(l[5897])
	        );

	        if (room.isReadOnly()) {
	            startAudioCallButton = startVideoCallButton = null;
	        }
	        var endCallButton = React.makeElement(
	            "div",
	            { className: "link-button red" + (!contact.presence ? " disabled" : ""), onClick: function onClick() {
	                    if (contact.presence && contact.presence !== "offline") {
	                        if (room.callSession) {
	                            room.callSession.endCall();
	                        }
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon horizontal-red-handset" }),
	            __(l[5884])
	        );

	        if (room.callSession && room.callSession.isActive() === true) {
	            startAudioCallButton = startVideoCallButton = null;
	        } else {
	            endCallButton = null;
	        }

	        var isReadOnlyElement = null;

	        if (room.isReadOnly()) {}
	        var excludedParticipants = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getContactParticipants() : room.getContactParticipants();

	        removeValue(excludedParticipants, u_handle, false);

	        var dontShowTruncateButton = false;
	        if (myPresence === 'offline' || !room.iAmOperator() || room.isReadOnly() || room.messagesBuff.messages.length === 0 || room.messagesBuff.messages.length === 1 && room.messagesBuff.messages.getItem(0).dialogType === "truncated") {
	            dontShowTruncateButton = true;
	        }

	        var membersHeader = null;

	        if (room.type === "group") {
	            membersHeader = React.makeElement(
	                "div",
	                { className: "chat-right-head" },
	                React.makeElement(
	                    "div",
	                    { className: "chat-grey-counter" },
	                    Object.keys(room.members).length
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "chat-right-head-txt" },
	                    __(l[8876])
	                )
	            );
	        }

	        var renameButtonClass = "link-button " + (room.isReadOnly() || !room.iAmOperator() || myPresence === 'offline' ? "disabled" : "");

	        return React.makeElement(
	            "div",
	            { className: "chat-right-area" },
	            React.makeElement(
	                "div",
	                { className: "chat-right-area conversation-details-scroll" },
	                React.makeElement(
	                    "div",
	                    { className: "chat-right-pad" },
	                    isReadOnlyElement,
	                    membersHeader,
	                    React.makeElement(ParticipantsList, {
	                        chatRoom: room,
	                        members: room.members,
	                        isCurrentlyActive: room.isCurrentlyActive
	                    }),
	                    React.makeElement(
	                        "div",
	                        { className: "buttons-block" },
	                        room.type !== "group" ? startAudioCallButton : null,
	                        room.type !== "group" ? startVideoCallButton : null,
	                        React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: "link-button dropdown-element",
	                                icon: "rounded-grey-plus",
	                                label: __(l[8007]),
	                                contacts: this.props.contacts,
	                                disabled: !(!self.allContactsInChat(excludedParticipants) && !room.isReadOnly() && room.iAmOperator()) || myPresence === 'offline'
	                            },
	                            React.makeElement(DropdownsUI.DropdownContactsSelector, {
	                                contacts: this.props.contacts,
	                                megaChat: this.props.megaChat,
	                                chatRoom: room,
	                                exclude: excludedParticipants,
	                                multiple: true,
	                                className: "popup add-participant-selector",
	                                singleSelectedButtonLabel: __(l[8869]),
	                                multipleSelectedButtonLabel: __(l[8869]),
	                                nothingSelectedButtonLabel: __(l[8870]),
	                                onSelectDone: this.props.onAddParticipantSelected,
	                                disabled: myPresence === 'offline',
	                                positionMy: "center top",
	                                positionAt: "left bottom"
	                            })
	                        ),
	                        room.type == "group" ? React.makeElement(
	                            "div",
	                            { className: renameButtonClass,
	                                onClick: function onClick(e) {
	                                    if ($(e.target).closest('.disabled').size() > 0) {
	                                        return false;
	                                    }
	                                    if (self.props.onRenameClicked) {
	                                        self.props.onRenameClicked();
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon writing-pen" }),
	                            __(l[9080])
	                        ) : null,
	                        React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: "link-button dropdown-element",
	                                icon: "rounded-grey-up-arrow",
	                                label: __(l[6834] + "..."),
	                                disabled: room.isReadOnly() || myPresence === 'offline'
	                            },
	                            React.makeElement(
	                                DropdownsUI.Dropdown,
	                                {
	                                    contacts: this.props.contacts,
	                                    megaChat: this.props.megaChat,
	                                    className: "wide-dropdown send-files-selector",
	                                    onClick: function onClick() {}
	                                },
	                                React.makeElement(DropdownsUI.DropdownItem, { icon: "grey-cloud", label: __(l[8013]), onClick: function onClick() {
	                                        self.props.onAttachFromCloudClicked();
	                                    } }),
	                                React.makeElement(DropdownsUI.DropdownItem, { icon: "grey-computer", label: __(l[8014]), onClick: function onClick() {
	                                        self.props.onAttachFromComputerClicked();
	                                    } })
	                            )
	                        ),
	                        endCallButton,
	                        React.makeElement(
	                            "div",
	                            { className: "link-button " + (dontShowTruncateButton ? "disabled" : ""),
	                                onClick: function onClick(e) {
	                                    if ($(e.target).closest('.disabled').size() > 0) {
	                                        return false;
	                                    }
	                                    if (self.props.onTruncateClicked) {
	                                        self.props.onTruncateClicked();
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon clear-arrow" }),
	                            __(l[8871])
	                        ),
	                        room.type === "group" ? React.makeElement(
	                            "div",
	                            { className: "link-button red " + (myPresence === 'offline' || room.stateIsLeftOrLeaving() ? "disabled" : ""),
	                                onClick: function onClick(e) {
	                                    if ($(e.target).closest('.disabled').size() > 0) {
	                                        return false;
	                                    }
	                                    if (self.props.onLeaveClicked) {
	                                        self.props.onLeaveClicked();
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon rounded-stop" }),
	                            l[8633]
	                        ) : null,
	                        room.type === "group" && room.stateIsLeftOrLeaving() ? React.makeElement(
	                            "div",
	                            { className: "link-button red", onClick: function onClick() {
	                                    if (self.props.onCloseClicked) {
	                                        self.props.onCloseClicked();
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon rounded-stop" }),
	                            l[148]
	                        ) : null
	                    )
	                )
	            )
	        );
	    }
	});

	var ConversationAudioVideoPanel = React.createClass({
	    displayName: "ConversationAudioVideoPanel",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            'messagesBlockEnabled': false,
	            'fullScreenModeEnabled': false,
	            'localMediaDisplay': true
	        };
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var $container = $(ReactDOM.findDOMNode(self));
	        var room = self.props.chatRoom;

	        var mouseoutThrottling = null;
	        $container.rebind('mouseover.chatUI' + self.props.chatRoom.roomJid, function () {
	            var $this = $(this);
	            clearTimeout(mouseoutThrottling);
	            self.visiblePanel = true;
	            $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
	            if ($this.hasClass('full-sized-block')) {
	                $('.call.top-panel', $container).addClass('visible-panel');
	            }
	        });

	        $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomJid, function () {
	            var $this = $(this);
	            clearTimeout(mouseoutThrottling);
	            mouseoutThrottling = setTimeout(function () {
	                self.visiblePanel = false;
	                $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).removeClass('visible-panel');
	                $('.call.top-panel', $container).removeClass('visible-panel');
	            }, 500);
	        });

	        var idleMouseTimer;
	        var forceMouseHide = false;
	        $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomJid, function (ev) {
	            var $this = $(this);
	            clearTimeout(idleMouseTimer);
	            if (!forceMouseHide) {
	                self.visiblePanel = true;
	                $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
	                $container.removeClass('no-cursor');
	                if ($this.hasClass('full-sized-block')) {
	                    $('.call.top-panel', $container).addClass('visible-panel');
	                }
	                idleMouseTimer = setTimeout(function () {
	                    self.visiblePanel = false;
	                    $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).removeClass('visible-panel');
	                    $container.addClass('no-cursor');
	                    $('.call.top-panel', $container).removeClass('visible-panel');

	                    forceMouseHide = true;
	                    setTimeout(function () {
	                        forceMouseHide = false;
	                    }, 400);
	                }, 2000);
	            }
	        });

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomJid).bind("fullscreenchange.megaChat_" + room.roomJid, function () {
	            if (!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ fullScreenModeEnabled: false });
	            } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ fullScreenModeEnabled: true });
	            }
	            self.forceUpdate();
	        });

	        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
	        $localMediaDisplay.draggable({
	            'refreshPositions': true,
	            'containment': $container,
	            'scroll': false,
	            drag: function drag(event, ui) {
	                if ($(this).is(".minimized")) {
	                    return false;
	                }

	                var right = Math.max(0, $container.outerWidth() - ui.position.left);
	                var bottom = Math.max(0, $container.outerHeight() - ui.position.top);

	                right = Math.min(right, $container.outerWidth() - 8);
	                bottom = Math.min(bottom, $container.outerHeight() - 8);

	                right = right - ui.helper.outerWidth();
	                bottom = bottom - ui.helper.outerHeight();

	                var minBottom = $(this).is(".minimized") ? 48 : 8;

	                if (bottom < minBottom) {
	                    bottom = minBottom;
	                    $(this).addClass('bottom-aligned');
	                } else {
	                    $(this).removeClass('bottom-aligned');
	                }

	                if (right < 8) {
	                    right = 8;
	                    $(this).addClass('right-aligned');
	                } else {
	                    $(this).removeClass('right-aligned');
	                }

	                ui.offset = {
	                    left: 'auto',
	                    top: 'auto',
	                    right: right,
	                    bottom: bottom,
	                    height: "",
	                    width: ""
	                };
	                ui.position.left = 'auto';
	                ui.position.top = 'auto';

	                ui.helper.css(ui.offset);
	                $(this).css(ui.offset);
	            }
	        });

	        $(window).rebind('resize.chatUI_' + room.roomJid, function (e) {
	            if ($container.is(":visible")) {
	                if (!elementInViewport($localMediaDisplay[0])) {
	                    $localMediaDisplay.addClass('right-aligned').addClass('bottom-aligned').css({
	                        'right': 8,
	                        'bottom': 8
	                    });
	                }
	            }
	        });

	        $('video', $container).each(function () {
	            $(this)[0].play();
	        });
	    },
	    toggleMessages: function toggleMessages(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        if (this.props.onMessagesToggle) {
	            this.props.onMessagesToggle(!this.state.messagesBlockEnabled);
	        }

	        this.setState({
	            'messagesBlockEnabled': !this.state.messagesBlockEnabled
	        });
	    },
	    fullScreenModeToggle: function fullScreenModeToggle(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        var newVal = !this.state.fullScreenModeEnabled;
	        $(document).fullScreen(newVal);

	        this.setState({
	            'fullScreenModeEnabled': newVal,
	            'messagesBlockEnabled': newVal === true ? false : this.state.messagesBlockEnabled
	        });
	    },
	    toggleLocalVideoDisplay: function toggleLocalVideoDisplay(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        var $container = $(ReactDOM.findDOMNode(this));
	        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);

	        $localMediaDisplay.addClass('right-aligned').addClass('bottom-aligned').css({
	            'width': '',
	            'height': '',
	            'right': 8,
	            'bottom': !this.state.localMediaDisplay === true ? 8 : 8
	        });

	        this.setState({ localMediaDisplay: !this.state.localMediaDisplay });
	    },
	    render: function render() {
	        var chatRoom = this.props.chatRoom;

	        if (!chatRoom.callSession || !chatRoom.callSession.isActive()) {
	            return null;
	        }

	        var participants = chatRoom.getParticipantsExceptMe();

	        var displayNames = [];

	        participants.forEach(function (v) {
	            displayNames.push(htmlentities(chatRoom.megaChat.getContactNameFromJid(v)));
	        });

	        var callSession = chatRoom.callSession;

	        var remoteCamEnabled = null;

	        if (callSession.getRemoteMediaOptions().video) {
	            remoteCamEnabled = React.makeElement("i", { className: "small-icon blue-videocam" });
	        }

	        var localPlayerElement = null;
	        var remotePlayerElement = null;

	        var visiblePanelClass = "";

	        if (this.visiblePanel === true) {
	            visiblePanelClass += " visible-panel";
	        }
	        if (callSession.getMediaOptions().video === false) {
	            localPlayerElement = React.makeElement(
	                "div",
	                { className: "call local-audio right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass },
	                React.makeElement(
	                    "div",
	                    { className: "default-white-button tiny-button call", onClick: this.toggleLocalVideoDisplay },
	                    React.makeElement("i", { className: "tiny-icon grey-minus-icon" })
	                ),
	                React.makeElement(ContactsUI.Avatar, {
	                    contact: M.u[u_handle], className: "call semi-big-avatar",
	                    style: { display: !this.state.localMediaDisplay ? "none" : "" }
	                })
	            );
	        } else {
	            if (callSession.localPlayer) {
	                var localPlayerSrc = callSession && callSession.localPlayer && callSession.localPlayer.src ? callSession.localPlayer.src : null;

	                if (!localPlayerSrc) {
	                    if (callSession.localPlayer.srcObject) {
	                        callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.srcObject);
	                        localPlayerSrc = callSession.localPlayer.src;
	                    } else if (callSession.localPlayer.mozSrcObject) {
	                        callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.mozSrcObject);
	                        localPlayerSrc = callSession.localPlayer.src;
	                    } else if (callSession.getJingleSession() && callSession.getJingleSession()._sess && callSession.getJingleSession()._sess.localStream) {
	                        callSession.localPlayer.src = URL.createObjectURL(callSession.getJingleSession()._sess.localStream);
	                        localPlayerSrc = callSession.localPlayer.src;
	                    } else {
	                        console.error("Could not retrieve src object.");
	                    }
	                }
	                localPlayerElement = React.makeElement(
	                    "div",
	                    {
	                        className: "call local-video right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass },
	                    React.makeElement(
	                        "div",
	                        { className: "default-white-button tiny-button call", onClick: this.toggleLocalVideoDisplay },
	                        React.makeElement("i", { className: "tiny-icon grey-minus-icon" })
	                    ),
	                    React.makeElement("video", {
	                        className: "localViewport",
	                        defaultMuted: true,
	                        muted: true,
	                        volume: 0,
	                        id: "localvideo_" + callSession.sid,
	                        src: localPlayerSrc,
	                        style: { display: !this.state.localMediaDisplay ? "none" : "" }

	                    })
	                );
	            }
	        }

	        if (callSession.getRemoteMediaOptions().video === false || !callSession.remotePlayer) {
	            var contact = chatRoom.megaChat.getContactFromJid(participants[0]);
	            remotePlayerElement = React.makeElement(
	                "div",
	                { className: "call user-audio" },
	                React.makeElement(ContactsUI.Avatar, { contact: contact, className: "big-avatar", hideVerifiedBadge: true })
	            );
	        } else {
	            var remotePlayer = callSession.remotePlayer[0];
	            if (!remotePlayer && callSession.remotePlayer) {
	                remotePlayer = callSession.remotePlayer;
	            }

	            var remotePlayerSrc = remotePlayer.src;

	            if (!remotePlayerSrc) {
	                if (remotePlayer.srcObject) {
	                    remotePlayer.src = URL.createObjectURL(remotePlayer.srcObject);
	                    remotePlayerSrc = remotePlayer.src;
	                } else if (remotePlayer.mozSrcObject) {
	                    remotePlayer.src = URL.createObjectURL(remotePlayer.mozSrcObject);
	                    remotePlayerSrc = remotePlayer.src;
	                } else {
	                    console.error("Could not retrieve src object.");
	                }
	            }

	            remotePlayerElement = React.makeElement(
	                "div",
	                { className: "call user-video" },
	                React.makeElement("video", {
	                    autoPlay: true,
	                    className: "rmtViewport rmtVideo",
	                    id: "remotevideo_" + callSession.sid,
	                    ref: "remoteVideo",
	                    src: remotePlayerSrc
	                })
	            );
	        }

	        var unreadDiv = null;
	        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
	        if (unreadCount > 0) {
	            unreadDiv = React.makeElement(
	                "div",
	                { className: "unread-messages" },
	                unreadCount > 9 ? "9+" : unreadCount
	            );
	        }

	        var additionalClass = "";
	        additionalClass = this.state.fullScreenModeEnabled === true ? " full-sized-block" : "";
	        if (additionalClass.length === 0) {
	            additionalClass = this.state.messagesBlockEnabled === true ? " small-block" : "";
	        }
	        return React.makeElement(
	            "div",
	            { className: "call-block" + additionalClass, id: "call-block" },
	            remotePlayerElement,
	            localPlayerElement,
	            React.makeElement(
	                "div",
	                { className: "call top-panel" },
	                React.makeElement(
	                    "div",
	                    { className: "call top-user-info" },
	                    React.makeElement(
	                        "span",
	                        { className: "user-card-name white" },
	                        displayNames.join(", ")
	                    ),
	                    remoteCamEnabled
	                ),
	                React.makeElement(
	                    "div",
	                    {
	                        className: "call-duration medium blue call-counter",
	                        "data-room-jid": chatRoom.roomJid.split("@")[0] },
	                    secondsToTimeShort(chatRoom._currentCallCounter)
	                )
	            ),
	            React.makeElement(
	                "div",
	                { className: "call bottom-panel" },
	                React.makeElement(
	                    "div",
	                    { className: "button call left" + (unreadDiv ? " unread" : ""), onClick: this.toggleMessages },
	                    unreadDiv,
	                    React.makeElement("i", { className: "big-icon conversations" })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call", onClick: function onClick(e) {
	                            if (callSession.getMediaOptions().audio === true) {
	                                callSession.muteAudio();
	                            } else {
	                                callSession.unmuteAudio();
	                            }
	                        } },
	                    React.makeElement("i", { className: "big-icon " + (callSession.getMediaOptions().audio ? " microphone" : " crossed-microphone") })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call", onClick: function onClick(e) {
	                            if (callSession.getMediaOptions().video === true) {
	                                callSession.muteVideo();
	                            } else {
	                                callSession.unmuteVideo();
	                            }
	                        } },
	                    React.makeElement("i", { className: "big-icon " + (callSession.getMediaOptions().video ? " videocam" : " crossed-videocam") })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call", onClick: function onClick(e) {
	                            chatRoom.callSession.endCall();
	                        } },
	                    React.makeElement("i", { className: "big-icon horizontal-red-handset" })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call right", onClick: this.fullScreenModeToggle },
	                    React.makeElement("i", { className: "big-icon nwse-resize" })
	                )
	            )
	        );
	    }
	});
	var ConversationPanel = React.createClass({
	    displayName: "ConversationPanel",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    lastScrollPositionPerc: 1,
	    getInitialState: function getInitialState() {
	        return {
	            startCallPopupIsActive: false,
	            localVideoIsMinimized: false,
	            isFullscreenModeEnabled: false,
	            mouseOverDuringCall: false,
	            attachCloudDialog: false,
	            messagesToggledInCall: false,
	            sendContactDialog: false,
	            confirmDeleteDialog: false,
	            pasteImageConfirmDialog: false,
	            messageToBeDeleted: null,
	            editing: false
	        };
	    },

	    uploadFromComputer: function uploadFromComputer() {
	        $('#fileselect1').trigger('click');
	    },
	    refreshUI: function refreshUI() {
	        var self = this;
	        var room = self.props.chatRoom;

	        if (!self.props.chatRoom.isCurrentlyActive) {
	            return;
	        }

	        room.renderContactTree();

	        room.megaChat.refreshConversations();

	        room.trigger('RefreshUI');
	    },

	    onMouseMove: SoonFc(function (e) {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (self.isMounted()) {
	            chatRoom.trigger("onChatIsFocused");
	        }
	    }, 150),

	    handleKeyDown: SoonFc(function (e) {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (self.isMounted() && chatRoom.isActive()) {
	            chatRoom.trigger("onChatIsFocused");
	        }
	    }, 150),
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        window.addEventListener('resize', self.handleWindowResize);
	        window.addEventListener('keydown', self.handleKeyDown);

	        self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function (e, eventData) {
	            self.callJustEnded = true;
	        });

	        self.eventuallyInit();
	    },
	    eventuallyInit: function eventuallyInit(doResize) {
	        var self = this;

	        if (self.initialised) {
	            return;
	        }
	        var $container = $(self.findDOMNode());

	        if ($container.length > 0) {
	            self.initialised = true;
	        }

	        self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', $container);

	        var droppableConfig = {
	            tolerance: 'pointer',
	            drop: function drop(e, ui) {
	                $.doDD(e, ui, 'drop', 1);
	            },
	            over: function over(e, ui) {
	                $.doDD(e, ui, 'over', 1);
	            },
	            out: function out(e, ui) {
	                $.doDD(e, ui, 'out', 1);
	            }
	        };

	        self.$messages.droppable(droppableConfig);

	        self.lastScrollPosition = null;
	        self.lastScrolledToBottom = true;
	        self.lastScrollHeight = 0;
	        self.lastUpdatedScrollHeight = 0;

	        var room = self.props.chatRoom;

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomJid).bind("fullscreenchange.megaChat_" + room.roomJid, function () {
	            if (!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ isFullscreenModeEnabled: false });
	            } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ isFullscreenModeEnabled: true });
	            }
	            self.forceUpdate();
	        });

	        if (doResize !== false) {
	            self.handleWindowResize();
	        }
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = self.props.chatRoom.megaChat;

	        $(chatRoom.messagesBuff).rebind('onHistoryFinished.cp', function () {
	            self.eventuallyUpdate();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        window.removeEventListener('resize', self.handleWindowResize);
	        window.removeEventListener('keydown', self.handleKeyDown);
	        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomJid);
	    },
	    componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
	        var self = this;
	        var room = this.props.chatRoom;

	        self.eventuallyInit(false);

	        room.megaChat.updateSectionUnreadCount();

	        var $node = $(self.findDOMNode());

	        if (self.loadingShown) {
	            $('.js-messages-loading', $node).removeClass('hidden');
	        } else {
	            $('.js-messages-loading', $node).addClass('hidden');
	        }
	        self.handleWindowResize();

	        if (prevState.messagesToggledInCall !== self.state.messagesToggledInCall || self.callJustEnded) {
	            if (self.callJustEnded) {
	                self.callJustEnded = false;
	            }
	            self.$messages.trigger('forceResize', [true, 1]);
	            Soon(function () {
	                self.messagesListScrollable.scrollToBottom(true);
	            });
	        }

	        if (prevProps.isActive === false && self.props.isActive === true) {
	            var $typeArea = $('.messages-textarea:visible:first', $node);
	            if ($typeArea.size() === 1) {
	                $typeArea.focus();
	                moveCursortoToEnd($typeArea[0]);
	            }
	        }
	        if (!prevState.renameDialog && self.state.renameDialog === true) {
	            var $input = $('.chat-rename-dialog input');
	            $input.focus();
	            $input[0].selectionStart = 0;
	            $input[0].selectionEnd = $input.val().length;
	        }

	        if (prevState.editing === false && self.state.editing !== false) {
	            if (self.messagesListScrollable) {
	                self.messagesListScrollable.reinitialise(false);

	                Soon(function () {
	                    if (self.editDomElement && self.editDomElement.size() === 1) {
	                        self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
	                    }
	                });
	            }
	        }

	        if (self.isMounted() && self.$messages && self.isComponentEventuallyVisible()) {
	            $(window).rebind('pastedimage.chatRoom', function (e, blob, fileName) {
	                if (self.isMounted() && self.$messages && self.isComponentEventuallyVisible()) {
	                    self.setState({ 'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)] });
	                    e.preventDefault();
	                }
	            });
	        }
	    },
	    handleWindowResize: function handleWindowResize(e, scrollToBottom) {
	        var $container = $(ReactDOM.findDOMNode(this));
	        var self = this;

	        self.eventuallyInit(false);

	        if (!self.isMounted() || !self.$messages || !self.isComponentEventuallyVisible()) {
	            return;
	        }

	        var scrollBlockHeight = $('.chat-content-block', $container).outerHeight() - $('.chat-topic-block', $container).outerHeight() - $('.call-block', $container).outerHeight() - $('.chat-textarea-block', $container).outerHeight();

	        if (scrollBlockHeight != self.$messages.outerHeight()) {
	            self.$messages.css('height', scrollBlockHeight);
	            $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
	            self.refreshUI(true);
	        } else {
	            self.refreshUI(scrollToBottom);
	        }
	    },
	    isActive: function isActive() {
	        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
	    },
	    onMessagesScrollReinitialise: function onMessagesScrollReinitialise(ps, $elem, forced, scrollPositionYPerc, scrollToElement) {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var mb = chatRoom.messagesBuff;

	        if (self.isRetrievingHistoryViaScrollPull || mb.isRetrievingHistory) {
	            return;
	        }

	        if (forced) {
	            if (!scrollPositionYPerc && !scrollToElement) {
	                if (self.scrolledToBottom && !self.editDomElement) {
	                    ps.scrollToBottom(true);
	                    return true;
	                }
	            } else {

	                return;
	            }
	        }

	        if (self.isComponentEventuallyVisible()) {
	            if (self.scrolledToBottom && !self.editDomElement) {
	                ps.scrollToBottom(true);
	                return true;
	            }
	            if (self.lastScrollPosition !== ps.getScrollPositionY() && !self.editDomElement) {
	                ps.scrollToY(self.lastScrollPosition, true);
	                return true;
	            }
	        }
	    },
	    onMessagesScrollUserScroll: function onMessagesScrollUserScroll(ps, $elem, e) {
	        var self = this;

	        var scrollPositionY = ps.getScrollPositionY();
	        var isAtTop = ps.isAtTop();
	        var isAtBottom = ps.isAtBottom();

	        if (ps.isCloseToBottom(30) === true) {
	            self.scrolledToBottom = true;
	        } else {
	            self.scrolledToBottom = false;
	        }
	        if (isAtTop || ps.getScrollHeight() < 80) {
	            var chatRoom = self.props.chatRoom;
	            var mb = chatRoom.messagesBuff;
	            if (mb.haveMoreHistory() && !self.isRetrievingHistoryViaScrollPull) {
	                mb.retrieveChatHistory();
	                self.isRetrievingHistoryViaScrollPull = true;
	                self.lastScrollPosition = scrollPositionY;

	                self.lastContentHeightBeforeHist = ps.getScrollHeight();
	                $(mb).unbind('onHistoryFinished.pull');
	                $(mb).one('onHistoryFinished.pull', function () {
	                    setTimeout(function () {

	                        self.isRetrievingHistoryViaScrollPull = false;
	                        self.justFinishedRetrievingHistory = false;

	                        self.justFinishedRetrievingHistory = false;
	                        var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;

	                        delete self.lastContentHeightBeforeHist;

	                        self.lastScrollPosition = prevPosY;

	                        ps.scrollToY(prevPosY, true);
	                        self.forceUpdate();
	                    }, 1000);
	                });
	            }
	        }

	        if (self.lastScrollPosition !== ps.getScrollPositionY()) {
	            self.lastScrollPosition = ps.getScrollPositionY();
	        }
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate() {
	        if (this.isRetrievingHistoryViaScrollPull && this.loadingShown || this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown || !this.props.chatRoom.isCurrentlyActive) {
	            return false;
	        } else {
	            return undefined;
	        }
	    },
	    render: function render() {
	        var self = this;

	        var room = this.props.chatRoom;
	        if (!room || !room.roomJid) {
	            return null;
	        }

	        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
	            return null;
	        }
	        self._wasAppendedEvenOnce = true;

	        var contacts = room.getParticipantsExceptMe();
	        var contactJid;
	        var contact;
	        if (contacts && contacts.length > 0) {
	            contactJid = contacts[0];
	            contact = room.megaChat.getContactFromJid(contactJid);
	        }

	        var conversationPanelClasses = "conversation-panel " + room.type + "-chat";

	        if (!room.isCurrentlyActive) {
	            conversationPanelClasses += " hidden";
	        }

	        var avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
	        var contactName = avatarMeta.fullName;

	        var messagesList = [];

	        if (self.isRetrievingHistoryViaScrollPull && !self.loadingShown || self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() === true || self.props.chatRoom.messagesBuff.joined === false || self.props.chatRoom.messagesBuff.joined === true && self.props.chatRoom.messagesBuff.haveMessages === true && self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() === true) {
	            self.loadingShown = true;
	        } else if (self.props.chatRoom.messagesBuff.joined === true) {
	            delete self.loadingShown;
	            var headerText = self.props.chatRoom.messagesBuff.messages.length === 0 ? __(l[8002]) : __(l[8002]);

	            headerText = headerText.replace("%s", "<span>" + htmlentities(contactName) + "</span>");

	            messagesList.push(React.makeElement(
	                "div",
	                { className: "messages notification", key: "initialMsg" },
	                React.makeElement("div", { className: "header", dangerouslySetInnerHTML: { __html: headerText } }),
	                React.makeElement(
	                    "div",
	                    { className: "info" },
	                    __(l[8080]),
	                    React.makeElement(
	                        "p",
	                        null,
	                        React.makeElement("i", { className: "semi-big-icon grey-lock" }),
	                        React.makeElement("span", { dangerouslySetInnerHTML: {
	                                __html: __(l[8540]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
	                            } })
	                    ),
	                    React.makeElement(
	                        "p",
	                        null,
	                        React.makeElement("i", { className: "semi-big-icon grey-tick" }),
	                        React.makeElement("span", { dangerouslySetInnerHTML: {
	                                __html: __(l[8539]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
	                            } })
	                    )
	                )
	            ));
	        } else {
	            delete self.loadingShown;
	        }
	        var lastTimeMarker;
	        var lastMessageFrom = null;
	        var lastGroupedMessageTimeStamp = null;
	        var lastMessageState = null;
	        var grouped = false;

	        self.props.chatRoom.messagesBuff.messages.forEach(function (v, k) {
	            if (!v.protocol && v.revoked !== true) {
	                var shouldRender = true;
	                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) {
	                    shouldRender = false;
	                }

	                var timestamp = v.delay;
	                var curTimeMarker;
	                var iso = new Date(timestamp * 1000).toISOString();
	                if (todayOrYesterday(iso)) {

	                    curTimeMarker = time2lastSeparator(iso);
	                } else {

	                    curTimeMarker = acc_time2date(timestamp, true);
	                }
	                var currentState = v.getState ? v.getState() : null;

	                if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
	                    lastTimeMarker = curTimeMarker;
	                    messagesList.push(React.makeElement(
	                        "div",
	                        { className: "message date-divider", key: v.messageId + "_marker" },
	                        curTimeMarker
	                    ));

	                    grouped = false;
	                    lastMessageFrom = null;
	                    lastGroupedMessageTimeStamp = null;
	                    lastMessageState = false;
	                }

	                if (shouldRender === true) {
	                    var userId = v.userId;
	                    if (!userId && v.fromJid) {
	                        var contact = room.megaChat.getContactFromJid(v.fromJid);
	                        if (contact && contact.u) {
	                            userId = contact.u;
	                        }
	                    }

	                    if ((v instanceof KarereEventObjects.OutgoingMessage || v instanceof Message) && v.keyid !== 0) {

	                        if (!lastMessageFrom || userId && lastMessageFrom === userId) {
	                            if (timestamp - lastGroupedMessageTimeStamp < 5 * 60) {
	                                grouped = true;
	                            } else {
	                                grouped = false;
	                                lastMessageFrom = userId;
	                                lastGroupedMessageTimeStamp = timestamp;
	                                lastMessageState = currentState;
	                            }
	                        } else {
	                            grouped = false;
	                            lastMessageFrom = userId;
	                            if (lastMessageFrom === userId) {
	                                lastGroupedMessageTimeStamp = timestamp;
	                            } else {
	                                lastGroupedMessageTimeStamp = null;
	                            }
	                        }
	                    } else {
	                        grouped = false;
	                        lastMessageFrom = null;
	                        lastGroupedMessageTimeStamp = null;
	                    }
	                }

	                if (v.dialogType) {
	                    var messageInstance = null;
	                    if (v.dialogType === 'alterParticipants') {
	                        messageInstance = React.makeElement(AlterParticipantsConversationMessage, {
	                            message: v,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped
	                        });
	                    } else if (v.dialogType === 'truncated') {
	                        messageInstance = React.makeElement(TruncatedMessage, {
	                            message: v,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped
	                        });
	                    } else if (v.dialogType === 'privilegeChange') {
	                        messageInstance = React.makeElement(PrivilegeChange, {
	                            message: v,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped
	                        });
	                    } else if (v.dialogType === 'topicChange') {
	                        messageInstance = React.makeElement(TopicChange, {
	                            message: v,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped
	                        });
	                    }

	                    messagesList.push(messageInstance);
	                } else {
	                    if (!v.chatRoom) {

	                        v.chatRoom = room;
	                    }

	                    messagesList.push(React.makeElement(GenericConversationMessage, {
	                        message: v,
	                        state: v.state,
	                        key: v.messageId,
	                        contact: contact,
	                        grouped: grouped,
	                        onUpdate: function onUpdate() {
	                            self.onResizeDoUpdate();
	                        },
	                        onEditStarted: function onEditStarted($domElement) {
	                            self.editDomElement = $domElement;
	                            self.setState({ 'editing': v });
	                            self.forceUpdate();
	                        },
	                        onEditDone: function onEditDone(messageContents) {
	                            self.editDomElement = null;

	                            var currentContents = v.textContents ? v.textContents : v.contents;

	                            if (messageContents === false || messageContents === currentContents) {
	                                self.messagesListScrollable.scrollToBottom(true);
	                                self.lastScrollPositionPerc = 1;
	                            } else if (messageContents) {
	                                room.megaChat.plugins.chatdIntegration.updateMessage(room, v.internalId ? v.internalId : v.orderValue, messageContents);
	                                if (v.textContents) {
	                                    v.textContents = messageContents;
	                                }
	                                if (v.contents) {
	                                    v.contents = messageContents;
	                                }
	                                if (v.emoticonShortcutsProcessed) {
	                                    v.emoticonShortcutsProcessed = false;
	                                }
	                                if (v.emoticonsProcessed) {
	                                    v.emoticonsProcessed = false;
	                                }
	                                if (v.messageHtml) {
	                                    delete v.messageHtml;
	                                }

	                                $(v).trigger('onChange', [v, "textContents", "", messageContents]);

	                                self.messagesListScrollable.scrollToBottom(true);
	                                self.lastScrollPositionPerc = 1;
	                            } else if (messageContents.length === 0) {

	                                self.setState({
	                                    'confirmDeleteDialog': true,
	                                    'messageToBeDeleted': v
	                                });
	                            }

	                            self.setState({ 'editing': false });
	                        },
	                        onDeleteClicked: function onDeleteClicked(e, msg) {
	                            self.setState({
	                                'confirmDeleteDialog': true,
	                                'messageToBeDeleted': msg
	                            });
	                            self.forceUpdate();
	                        }
	                    }));
	                }
	            }
	        });

	        var attachCloudDialog = null;
	        if (self.state.attachCloudDialog === true) {
	            var selected = [];
	            attachCloudDialog = React.makeElement(ModalDialogsUI.CloudBrowserDialog, {
	                folderSelectNotAllowed: true,
	                onClose: function onClose() {
	                    self.setState({ 'attachCloudDialog': false });
	                    selected = [];
	                },
	                onSelected: function onSelected(nodes) {
	                    selected = nodes;
	                },
	                onAttachClicked: function onAttachClicked() {
	                    self.setState({ 'attachCloudDialog': false });

	                    room.attachNodes(selected);
	                }
	            });
	        }

	        var sendContactDialog = null;
	        if (self.state.sendContactDialog === true) {
	            var excludedContacts = [];
	            if (room.type == "private") {
	                room.getParticipantsExceptMe().forEach(function (jid) {
	                    var contact = room.megaChat.getContactFromJid(jid);
	                    if (contact) {
	                        excludedContacts.push(contact.u);
	                    }
	                });
	            }

	            sendContactDialog = React.makeElement(ModalDialogsUI.SelectContactDialog, {
	                megaChat: room.megaChat,
	                chatRoom: room,
	                exclude: excludedContacts,
	                contacts: M.u,
	                onClose: function onClose() {
	                    self.setState({ 'sendContactDialog': false });
	                    selected = [];
	                },
	                onSelectClicked: function onSelectClicked(selected) {
	                    self.setState({ 'sendContactDialog': false });

	                    room.attachContacts(selected);
	                }
	            });
	        }

	        var confirmDeleteDialog = null;
	        if (self.state.confirmDeleteDialog === true) {
	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ConfirmDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __(l[8004]),
	                    name: "delete-message",
	                    onClose: function onClose() {
	                        self.setState({ 'confirmDeleteDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        var msg = self.state.messageToBeDeleted;
	                        if (!msg) {
	                            return;
	                        }
	                        var chatdint = room.megaChat.plugins.chatdIntegration;
	                        if (msg.getState() === Message.STATE.SENT || msg.getState() === Message.STATE.DELIVERED || msg.getState() === Message.STATE.NOT_SENT) {
	                            chatdint.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
	                        } else if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
	                            chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
	                        }

	                        msg.message = "";
	                        msg.contents = "";
	                        msg.messageHtml = "";
	                        msg.deleted = true;

	                        self.setState({
	                            'confirmDeleteDialog': false,
	                            'messageToBeDeleted': false
	                        });

	                        $(msg).trigger('onChange', [msg, "deleted", false, true]);
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        __(l[8879])
	                    ),
	                    React.makeElement(GenericConversationMessage, {
	                        className: "dialog-wrapper",
	                        message: self.state.messageToBeDeleted,
	                        hideActionButtons: true,
	                        initTextScrolling: true
	                    })
	                )
	            );
	        }

	        var pasteImageConfirmDialog = null;
	        if (self.state.pasteImageConfirmDialog) {
	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ConfirmDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __("Confirm paste"),
	                    name: "paste-image-chat",
	                    onClose: function onClose() {
	                        self.setState({ 'pasteImageConfirmDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        var meta = self.state.pasteImageConfirmDialog;
	                        if (!meta) {
	                            return;
	                        }

	                        M.addUpload([meta[0]]);

	                        self.setState({
	                            'pasteImageConfirmDialog': false
	                        });
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        __("Please confirm that you want to upload this image and share it in this chat room.")
	                    ),
	                    React.makeElement("img", {
	                        src: self.state.pasteImageConfirmDialog[2],
	                        style: {
	                            maxWidth: "90%",
	                            height: "auto",
	                            maxHeight: $(document).outerHeight() * 0.3,
	                            margin: '10px auto',
	                            display: 'block',
	                            border: '1px solid #ccc',
	                            borderRadius: '4px'
	                        },
	                        onLoad: function onLoad(e) {
	                            $(e.target).parents('.paste-image-chat').position({
	                                of: $(document.body)
	                            });
	                        }
	                    })
	                )
	            );
	        }

	        var confirmTruncateDialog = null;
	        if (self.state.truncateDialog === true) {
	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ConfirmDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __(l[8871]),
	                    name: "truncate-conversation",
	                    onClose: function onClose() {
	                        self.setState({ 'truncateDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        var chatMessages = room.messagesBuff.messages;
	                        if (chatMessages.length > 0) {
	                            var lastChatMessageId = null;
	                            var i = chatMessages.length - 1;
	                            while (lastChatMessageId == null && i >= 0) {
	                                var message = chatMessages.getItem(i);
	                                if (message instanceof Message) {
	                                    lastChatMessageId = message.messageId;
	                                }
	                                i--;
	                            }
	                            if (lastChatMessageId) {
	                                asyncApiReq({
	                                    a: 'mct',
	                                    id: room.chatId,
	                                    m: lastChatMessageId,
	                                    v: Chatd.VERSION
	                                }).fail(function (r) {
	                                    if (r === -2) {
	                                        msgDialog('warninga', l[135], __(l[8880]));
	                                    }
	                                });
	                            }
	                        }

	                        self.setState({
	                            'truncateDialog': false
	                        });
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        __(l[8881])
	                    )
	                )
	            );
	        }
	        if (self.state.renameDialog === true) {
	            var onEditSubmit = function onEditSubmit(e) {
	                if ($.trim(self.state.renameDialogValue).length > 0 && self.state.renameDialogValue !== self.props.chatRoom.getRoomTitle()) {
	                    var participants = self.props.chatRoom.protocolHandler.getTrackedParticipants();
	                    var promises = [];
	                    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));
	                    var _runUpdateTopic = function _runUpdateTopic() {

	                        var newTopic = self.state.renameDialogValue;
	                        var topic = self.props.chatRoom.protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants);
	                        if (topic) {
	                            asyncApiReq({
	                                "a": "mcst",
	                                "id": self.props.chatRoom.chatId,
	                                "ct": base64urlencode(topic),
	                                "v": Chatd.VERSION
	                            });
	                        }
	                    };
	                    MegaPromise.allDone(promises).done(function () {
	                        _runUpdateTopic();
	                    });
	                    self.setState({ 'renameDialog': false, 'renameDialogValue': undefined });
	                }
	                e.preventDefault();
	                e.stopPropagation();
	            };

	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ModalDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __(l[9080]),
	                    name: "rename-group",
	                    className: "chat-rename-dialog",
	                    onClose: function onClose() {
	                        self.setState({ 'renameDialog': false, 'renameDialogValue': undefined });
	                    },
	                    buttons: [{
	                        "label": l[61],
	                        "key": "rename",
	                        "className": $.trim(self.state.renameDialogValue).length === 0 || self.state.renameDialogValue === self.props.chatRoom.getRoomTitle() ? "disabled" : "",
	                        "onClick": function onClick(e) {
	                            onEditSubmit(e);
	                        }
	                    }, {
	                        "label": l[1686],
	                        "key": "cancel",
	                        "onClick": function onClick(e) {
	                            self.setState({ 'renameDialog': false, 'renameDialogValue': undefined });
	                            e.preventDefault();
	                            e.stopPropagation();
	                        }
	                    }] },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        React.makeElement(
	                            "div",
	                            { className: "rename-input-bl" },
	                            React.makeElement("input", { type: "text", name: "newTopic",
	                                defaultValue: self.props.chatRoom.getRoomTitle(),
	                                value: self.state.renameDialogValue,
	                                maxLength: "30",
	                                onChange: function onChange(e) {
	                                    self.setState({ 'renameDialogValue': e.target.value.substr(0, 30) });
	                                }, onKeyUp: function onKeyUp(e) {
	                                    if (e.which === 13) {
	                                        onEditSubmit(e);
	                                    }
	                                } })
	                        )
	                    )
	                )
	            );
	        }

	        var additionalClass = "";
	        if (additionalClass.length === 0 && self.state.messagesToggledInCall && room.callSession && room.callSession.isActive()) {
	            additionalClass = " small-block";
	        }

	        var myPresence = room.megaChat.xmppPresenceToCssClass(M.u[u_handle].presence);

	        return React.makeElement(
	            "div",
	            { className: conversationPanelClasses, onMouseMove: self.onMouseMove, "data-room-jid": self.props.chatRoom.roomJid.split("@")[0] },
	            React.makeElement(
	                "div",
	                { className: "chat-content-block" },
	                React.makeElement(ConversationRightArea, {
	                    chatRoom: this.props.chatRoom,
	                    members: this.props.chatRoom.members,
	                    contacts: self.props.contacts,
	                    megaChat: this.props.chatRoom.megaChat,
	                    messagesBuff: room.messagesBuff,
	                    onAttachFromComputerClicked: function onAttachFromComputerClicked() {
	                        self.uploadFromComputer();
	                    },
	                    onTruncateClicked: function onTruncateClicked() {
	                        self.setState({ 'truncateDialog': true });
	                    },
	                    onRenameClicked: function onRenameClicked() {
	                        self.setState({
	                            'renameDialog': true,
	                            'renameDialogValue': self.props.chatRoom.getRoomTitle()
	                        });
	                    },
	                    onLeaveClicked: function onLeaveClicked() {
	                        room.leave(true);
	                    },
	                    onCloseClicked: function onCloseClicked() {
	                        room.destroy();
	                    },
	                    onAttachFromCloudClicked: function onAttachFromCloudClicked() {
	                        self.setState({ 'attachCloudDialog': true });
	                    },
	                    onAddParticipantSelected: function onAddParticipantSelected(contactHashes) {
	                        if (self.props.chatRoom.type == "private") {
	                            var megaChat = self.props.chatRoom.megaChat;

	                            loadingDialog.show();

	                            megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getContactParticipantsExceptMe().concat(contactHashes)]);
	                        } else {
	                            self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
	                        }
	                    }
	                }),
	                React.makeElement(ConversationAudioVideoPanel, {
	                    chatRoom: this.props.chatRoom,
	                    contacts: self.props.contacts,
	                    megaChat: this.props.chatRoom.megaChat,
	                    unreadCount: this.props.chatRoom.messagesBuff.getUnreadCount(),
	                    onMessagesToggle: function onMessagesToggle(isActive) {
	                        self.setState({
	                            'messagesToggledInCall': isActive
	                        });
	                    }
	                }),
	                attachCloudDialog,
	                sendContactDialog,
	                confirmDeleteDialog,
	                confirmTruncateDialog,
	                React.makeElement(
	                    "div",
	                    { className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden" },
	                    React.makeElement("i", { className: "dropdown-white-arrow" }),
	                    React.makeElement(
	                        "div",
	                        { className: "dropdown notification-text" },
	                        React.makeElement("i", { className: "small-icon conversations" }),
	                        __(l[8882])
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden" },
	                    React.makeElement("i", { className: "dropdown-white-arrow" }),
	                    React.makeElement(
	                        "div",
	                        { className: "dropdown notification-text" },
	                        React.makeElement("i", { className: "small-icon conversations" }),
	                        __(l[8883])
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden" },
	                    React.makeElement("i", { className: "dropdown-white-arrow" }),
	                    React.makeElement(
	                        "div",
	                        { className: "dropdown notification-text" },
	                        React.makeElement("i", { className: "small-icon conversations" }),
	                        __(l[8884])
	                    )
	                ),
	                self.props.chatRoom.type === "group" ? React.makeElement(
	                    "div",
	                    { className: "chat-topic-block" },
	                    self.props.chatRoom.getRoomTitle()
	                ) : undefined,
	                React.makeElement(
	                    "div",
	                    { className: "messages-block " + additionalClass },
	                    React.makeElement(
	                        "div",
	                        { className: "messages scroll-area" },
	                        React.makeElement(
	                            PerfectScrollbar,
	                            {
	                                onFirstInit: function onFirstInit(ps, node) {
	                                    ps.scrollToBottom(true);
	                                    self.scrolledToBottom = 1;
	                                },
	                                onReinitialise: self.onMessagesScrollReinitialise,
	                                onUserScroll: self.onMessagesScrollUserScroll,
	                                className: "js-messages-scroll-area perfectScrollbarContainer",
	                                messagesToggledInCall: self.state.messagesToggledInCall,
	                                ref: function ref(_ref) {
	                                    return self.messagesListScrollable = _ref;
	                                },
	                                chatRoom: self.props.chatRoom,
	                                messagesBuff: self.props.chatRoom.messagesBuff,
	                                editDomElement: self.state.editDomElement,
	                                confirmDeleteDialog: self.state.confirmDeleteDialog
	                            },
	                            React.makeElement(
	                                "div",
	                                { className: "messages main-pad" },
	                                React.makeElement(
	                                    "div",
	                                    { className: "messages content-area" },
	                                    React.makeElement(
	                                        "div",
	                                        { className: "loading-spinner js-messages-loading light manual-management",
	                                            key: "loadingSpinner", style: { top: "50%" } },
	                                        React.makeElement("div", { className: "main-loader", style: {
	                                                'position': 'fixed',
	                                                'top': '50%',
	                                                'left': '50%'
	                                            } })
	                                    ),
	                                    messagesList
	                                )
	                            )
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "chat-textarea-block" },
	                        React.makeElement(WhosTyping, { chatRoom: room }),
	                        React.makeElement(
	                            TypingAreaUI.TypingArea,
	                            {
	                                chatRoom: self.props.chatRoom,
	                                className: "main-typing-area",
	                                disabled: room.isReadOnly(),
	                                persist: true,
	                                onUpEditPressed: function onUpEditPressed() {
	                                    var foundMessage = false;
	                                    room.messagesBuff.messages.keys().reverse().forEach(function (k) {
	                                        if (!foundMessage) {
	                                            var message = room.messagesBuff.messages[k];

	                                            var contact;
	                                            if (message.authorContact) {
	                                                contact = message.authorContact;
	                                            } else if (message.meta && message.meta.userId) {
	                                                contact = M.u[message.meta.userId];
	                                                if (!contact) {
	                                                    return false;
	                                                }
	                                            } else if (message.userId) {
	                                                if (!M.u[message.userId]) {

	                                                    return false;
	                                                }
	                                                contact = M.u[message.userId];
	                                            } else if (message.getFromJid) {
	                                                contact = megaChat.getContactFromJid(message.getFromJid());
	                                            } else {

	                                                return false;
	                                            }

	                                            if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof KarereEventObjects.OutgoingMessage) && (!message.isManagement || !message.isManagement())) {
	                                                foundMessage = message;
	                                            }
	                                        }
	                                    });

	                                    if (!foundMessage) {
	                                        return false;
	                                    } else {
	                                        $('.message.body.' + foundMessage.messageId).trigger('onEditRequest');
	                                        self.lastScrolledToBottom = false;
	                                        return true;
	                                    }
	                                },
	                                onResized: function onResized() {
	                                    self.handleWindowResize();
	                                    $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
	                                },
	                                onConfirm: function onConfirm(messageContents) {
	                                    if (messageContents && messageContents.length > 0) {
	                                        self.props.chatRoom.sendMessage(messageContents);
	                                    }
	                                }
	                            },
	                            React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: "popup-button",
	                                    icon: "small-icon grey-medium-plus",
	                                    disabled: room.isReadOnly() || myPresence === 'offline'
	                                },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: "wide-dropdown attach-to-chat-popup",
	                                        vertOffset: 10
	                                    },
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: "grey-cloud",
	                                        label: __(l[8011]),
	                                        onClick: function onClick(e) {
	                                            self.setState({ 'attachCloudDialog': true });
	                                        } }),
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: "grey-computer",
	                                        label: __(l[8014]),
	                                        onClick: function onClick(e) {
	                                            self.uploadFromComputer();
	                                        } }),
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: "square-profile",
	                                        label: __(l[8628]),
	                                        onClick: function onClick(e) {
	                                            self.setState({ 'sendContactDialog': true });
	                                        } })
	                                )
	                            )
	                        )
	                    )
	                )
	            )
	        );
	    }
	});

	var ConversationPanels = React.createClass({
	    displayName: "ConversationPanels",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;

	        var conversations = [];

	        if (getSitePath() === "/fm/chat") {

	            var activeFound = false;
	            self.props.conversations.forEach(function (chatRoom) {
	                if (chatRoom.isCurrentlyActive) {
	                    activeFound = true;
	                }
	            });
	            if (self.props.conversations.length > 0 && !activeFound) {
	                self.props.conversations[self.props.conversations.keys()[0]].setActive();
	                self.props.conversations[self.props.conversations.keys()[0]].show();
	            }
	        }

	        self.props.conversations.forEach(function (chatRoom) {
	            var otherParticipants = chatRoom.getParticipantsExceptMe();

	            var contact;
	            if (otherParticipants && otherParticipants.length > 0) {
	                contact = megaChat.getContactFromJid(otherParticipants[0]);
	            }

	            conversations.push(React.makeElement(ConversationPanel, {
	                chatRoom: chatRoom,
	                isActive: chatRoom.isCurrentlyActive,
	                messagesBuff: chatRoom.messagesBuff,
	                contacts: M.u,
	                contact: contact,
	                key: chatRoom.roomJid
	            }));
	        });

	        if (conversations.length === 0) {
	            var contactsList = [];
	            var contactsListOffline = [];

	            var hadLoaded = ChatdIntegration.allChatsHadLoaded.state() !== 'pending' && ChatdIntegration.mcfHasFinishedPromise.state() !== 'pending';

	            if (hadLoaded) {
	                self.props.contacts.forEach(function (contact) {
	                    if (contact.u === u_handle) {
	                        return;
	                    }

	                    if (contact.c === 1) {
	                        var pres = self.props.megaChat.xmppPresenceToCssClass(contact.presence);

	                        (pres === "offline" ? contactsListOffline : contactsList).push(React.makeElement(ContactsUI.ContactCard, { contact: contact, megaChat: self.props.megaChat,
	                            key: contact.u }));
	                    }
	                });
	            }
	            var emptyMessage = hadLoaded ? l[8008] : l[7006];

	            return React.makeElement(
	                "div",
	                null,
	                React.makeElement(
	                    "div",
	                    { className: "chat-right-area" },
	                    React.makeElement(
	                        "div",
	                        { className: "chat-right-area contacts-list-scroll" },
	                        React.makeElement(
	                            "div",
	                            { className: "chat-right-pad" },
	                            contactsList,
	                            contactsListOffline
	                        )
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "empty-block" },
	                    React.makeElement(
	                        "div",
	                        { className: "empty-pad conversations" },
	                        React.makeElement("div", { className: "empty-icon conversations" }),
	                        React.makeElement("div", { className: "empty-title", dangerouslySetInnerHTML: {
	                                __html: __(emptyMessage).replace("[P]", "<span>").replace("[/P]", "</span>")
	                            } })
	                    )
	                )
	            );
	        } else {
	            return React.makeElement(
	                "div",
	                { className: "conversation-panels" },
	                conversations
	            );
	        }
	    }
	});

	module.exports = {
	    ConversationPanel: ConversationPanel,
	    ConversationPanels: ConversationPanels
	};

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var Tooltips = __webpack_require__(13);
	var Forms = __webpack_require__(14);

	var ContactsUI = __webpack_require__(10);

	var ExtraFooterElement = React.createClass({
	    displayName: "ExtraFooterElement",
	    render: function render() {
	        return this.props.children;
	    }
	});

	var ModalDialog = React.createClass({
	    displayName: "ModalDialog",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },

	    componentDidMount: function componentDidMount() {
	        var self = this;
	        $(document.body).addClass('overlayed');
	        $('.fm-dialog-overlay').removeClass('hidden');

	        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

	        $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function (e) {
	            if (e.keyCode == 27) {
	                self.onBlur();
	            }
	        });
	    },
	    onBlur: function onBlur(e) {
	        var $element = $(ReactDOM.findDOMNode(this));

	        if (!e || !$(e.target).closest(".fm-dialog").is($element)) {
	            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	            this.onCloseClicked();
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	        $(document).unbind('keyup.modalDialog' + this.getUniqueId());
	        $(document.body).removeClass('overlayed');
	        $('.fm-dialog-overlay').addClass('hidden');
	    },
	    onCloseClicked: function onCloseClicked(e) {
	        var self = this;

	        if (self.props.onClose) {
	            self.props.onClose(self);
	        }
	    },
	    onPopupDidMount: function onPopupDidMount(elem) {
	        this.domNode = elem;

	        $(elem).css({
	            'margin': 'auto'
	        }).position({
	            of: $(document.body)
	        });

	        if (this.props.popupDidMount) {

	            this.props.popupDidMount(elem);
	        }
	    },
	    render: function render() {
	        var self = this;

	        var classes = "fm-dialog " + self.props.className;

	        var footer = null;

	        var extraFooterElements = [];
	        var otherElements = [];

	        var x = 0;
	        React.Children.forEach(self.props.children, function (child) {
	            if (!child) {

	                return;
	            }

	            if (child.type.displayName === 'ExtraFooterElement') {
	                extraFooterElements.push(React.cloneElement(child, {
	                    key: x++
	                }));
	            } else {
	                otherElements.push(React.cloneElement(child, {
	                    key: x++
	                }));
	            }
	        }.bind(this));

	        if (self.props.buttons) {
	            var buttons = [];
	            self.props.buttons.forEach(function (v) {
	                buttons.push(React.makeElement(
	                    "a",
	                    { href: "javascript:;", className: "default-white-button right" + (v.className ? " " + v.className : ""), onClick: function onClick(e) {
	                            if (v.onClick) {
	                                v.onClick(e, self);
	                            }
	                        }, key: v.key },
	                    v.label
	                ));
	            });

	            footer = React.makeElement(
	                "div",
	                { className: "fm-dialog-footer white" },
	                extraFooterElements,
	                buttons,
	                React.makeElement("div", { className: "clear" })
	            );
	        }

	        return React.makeElement(
	            utils.RenderTo,
	            { element: document.body, className: classes, popupDidMount: this.onPopupDidMount },
	            React.makeElement(
	                "div",
	                null,
	                React.makeElement("div", { className: "fm-dialog-close", onClick: self.onCloseClicked }),
	                self.props.title ? React.makeElement(
	                    "div",
	                    { className: "fm-dialog-title" },
	                    self.props.title
	                ) : null,
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    otherElements
	                ),
	                footer
	            )
	        );
	    }
	});

	var BrowserCol = React.createClass({
	    displayName: "BrowserCol",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },

	    render: function render() {
	        var self = this;

	        var classes = self.props.id + " " + (self.props.className ? self.props.className : "");

	        if (self.props.sortBy[0] === self.props.id) {
	            classes += " " + self.props.sortBy[1];
	        }
	        return React.makeElement(
	            "th",
	            { onClick: function onClick(e) {
	                    e.preventDefault();
	                    e.stopPropagation();
	                    self.props.onClick(self.props.id);
	                } },
	            React.makeElement(
	                "span",
	                { className: "arrow " + classes },
	                self.props.label
	            )
	        );
	    }
	});
	var BrowserEntries = React.createClass({
	    displayName: "BrowserEntries",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },

	    getInitialState: function getInitialState() {
	        return {
	            'highlighted': [],
	            'selected': []
	        };
	    },
	    onEntryClick: function onEntryClick(e, node) {
	        e.stopPropagation();
	        e.preventDefault();

	        this.setState({ 'highlighted': [node.h] });
	        if (this.props.onHighlighted) {
	            this.props.onHighlighted([node.h]);
	        }

	        if (this.props.folderSelectNotAllowed === true && node.t === 1) {
	            this.setState({ 'selected': [] });
	            this.props.onSelected([]);
	        } else {
	            this.setState({ 'selected': [node.h] });
	            this.props.onSelected([node.h]);
	        }
	    },
	    onEntryDoubleClick: function onEntryDoubleClick(e, node) {
	        var self = this;

	        e.stopPropagation();
	        e.preventDefault();

	        if (node.t === 1) {

	            self.setState({ 'selected': [], 'highlighted': [] });
	            self.props.onSelected([]);
	            self.props.onHighlighted([]);
	            self.props.onExpand(node);
	            self.forceUpdate();
	        } else {
	            self.onEntryClick(e, node);
	            self.props.onSelected(self.state.selected);
	            self.props.onAttachClicked(self.state.selected);
	        }
	    },
	    render: function render() {
	        var self = this;

	        var items = [];

	        var entry = self.props.entries;
	        self.props.entries.forEach(function (node) {
	            if (node.t !== 0 && node.t !== 1) {

	                return;
	            }
	            if (!node.name) {

	                return;
	            }

	            var isFolder = node.t === 1;
	            var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;

	            var tooltipElement = null;

	            var icon = React.makeElement(
	                "span",
	                { className: "transfer-filtype-icon " + fileIcon(node) },
	                " "
	            );

	            if (fileIcon(node) === "graphic" && node.fa) {
	                var src = thumbnails[node.h];
	                if (!src) {
	                    src = M.getNodeByHandle(node.h);

	                    M.v.push(node);
	                    if (!node.seen) {
	                        node.seen = 1;
	                    }
	                    delay('thumbnails', fm_thumbnails, 90);
	                    src = window.noThumbURI || '';
	                }
	                icon = React.makeElement(
	                    Tooltips.Tooltip,
	                    { withArrow: true },
	                    React.makeElement(
	                        Tooltips.Handler,
	                        { className: "transfer-filtype-icon " + fileIcon(node) },
	                        " "
	                    ),
	                    React.makeElement(
	                        Tooltips.Contents,
	                        { className: "img-preview" },
	                        React.makeElement(
	                            "div",
	                            { className: "dropdown img-wrapper img-block", id: node.h },
	                            React.makeElement("img", { alt: "",
	                                className: "thumbnail-placeholder " + node.h,
	                                src: src,
	                                width: "120",
	                                height: "120"
	                            })
	                        )
	                    )
	                );
	            }

	            items.push(React.makeElement(
	                "tr",
	                {
	                    className: (isFolder ? " folder" : "") + (isHighlighted ? " ui-selected" : ""),
	                    onClick: function onClick(e) {
	                        self.onEntryClick(e, node);
	                    },
	                    onDoubleClick: function onDoubleClick(e) {
	                        self.onEntryDoubleClick(e, node);
	                    },
	                    key: node.h
	                },
	                React.makeElement(
	                    "td",
	                    null,
	                    React.makeElement("span", { className: "grid-status-icon" + (node.fav ? " star" : "") })
	                ),
	                React.makeElement(
	                    "td",
	                    null,
	                    icon,
	                    React.makeElement(
	                        "span",
	                        { className: "tranfer-filetype-txt" },
	                        node.name
	                    )
	                ),
	                React.makeElement(
	                    "td",
	                    null,
	                    !isFolder ? bytesToSize(node.s) : ""
	                )
	            ));
	        });
	        if (items.length > 0) {
	            return React.makeElement(
	                utils.JScrollPane,
	                { className: "fm-dialog-grid-scroll",
	                    selected: this.state.selected,
	                    highlighted: this.state.highlighted,
	                    entries: this.props.entries
	                },
	                React.makeElement(
	                    "table",
	                    { className: "grid-table fm-dialog-table" },
	                    React.makeElement(
	                        "tbody",
	                        null,
	                        items
	                    )
	                )
	            );
	        } else {
	            return React.makeElement(
	                "div",
	                { className: "dialog-empty-block dialog-fm folder" },
	                React.makeElement(
	                    "div",
	                    { className: "dialog-empty-pad" },
	                    React.makeElement("div", { className: "dialog-empty-icon" }),
	                    React.makeElement(
	                        "div",
	                        { className: "dialog-empty-header" },
	                        __(l[782])
	                    )
	                )
	            );
	        }
	    }
	});
	var CloudBrowserDialog = React.createClass({
	    displayName: "CloudBrowserDialog",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'selectLabel': __(l[8023]),
	            'openLabel': __(l[1710]),
	            'cancelLabel': __(l[82]),
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'sortBy': ['name', 'asc'],
	            'selected': [],
	            'highlighted': [],
	            'currentlyViewedEntry': M.RootID
	        };
	    },
	    toggleSortBy: function toggleSortBy(colId) {
	        if (this.state.sortBy[0] === colId) {
	            this.setState({ 'sortBy': [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"] });
	        } else {
	            this.setState({ 'sortBy': [colId, "asc"] });
	        }
	    },
	    resizeBreadcrumbs: function resizeBreadcrumbs() {
	        var $breadcrumbs = $('.fm-breadcrumbs-block.add-from-cloud', this.findDOMNode());
	        var $breadcrumbsWrapper = $breadcrumbs.find('.breadcrumbs-wrapper');

	        setTimeout(function () {
	            var breadcrumbsWidth = $breadcrumbs.outerWidth();
	            var $el = $breadcrumbs.find('.right-arrow-bg');
	            var i = 0;
	            var j = 0;
	            $el.removeClass('short-foldername ultra-short-foldername invisible');

	            while ($breadcrumbsWrapper.outerWidth() > breadcrumbsWidth) {
	                if (i < $el.length - 1) {
	                    $($el[i]).addClass('short-foldername');
	                    i++;
	                } else if (j < $el.length - 1) {
	                    $($el[j]).addClass('ultra-short-foldername');
	                    j++;
	                } else if (!$($el[j]).hasClass('short-foldername')) {
	                    $($el[j]).addClass('short-foldername');
	                } else {
	                    $($el[j]).addClass('ultra-short-foldername');
	                    break;
	                }
	            }
	        }, 0);
	    },
	    componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
	        if (prevState.currentlyViewedEntry !== this.state.currentlyViewedEntry) {
	            this.resizeBreadcrumbs();
	        }
	    },
	    getEntries: function getEntries() {
	        var self = this;
	        var entries = [];

	        obj_values(M.d).forEach(function (v) {
	            if (v.p === self.state.currentlyViewedEntry) {
	                entries.push(v);
	            }
	        });
	        var sortKey;
	        var order = 1;

	        if (self.state.sortBy[0] === "name") {
	            sortKey = "name";
	        } else if (self.state.sortBy[0] === "size") {
	            sortKey = "s";
	        } else if (self.state.sortBy[0] === "grid-header-star") {
	            sortKey = "fav";
	        }

	        order = self.state.sortBy[1] === "asc" ? 1 : -1;

	        entries.sort(function (a, b) {

	            if (sortKey === "name") {
	                return (a[sortKey] ? a[sortKey] : "").localeCompare(b[sortKey]) * order;
	            } else {
	                var _a = a[sortKey] || 0;
	                var _b = b[sortKey] || 0;
	                if (_a > _b) {
	                    return 1 * order;
	                }
	                if (_a < _b) {
	                    return -1 * order;
	                }

	                return 0;
	            }
	        });

	        var files = [];
	        var folders = [];

	        entries.forEach(function (v) {
	            if (v.t === 1) {
	                folders.push(v);
	            } else if (v.t === 0) {
	                files.push(v);
	            }
	        });

	        return folders.concat(files);
	    },
	    onSelected: function onSelected(nodes) {
	        this.setState({ 'selected': nodes });
	        this.props.onSelected(nodes);
	    },
	    onHighlighted: function onHighlighted(nodes) {
	        this.setState({ 'highlighted': nodes });

	        if (this.props.onHighlighted) {
	            this.props.onHighlighted(nodes);
	        }
	    },
	    onAttachClicked: function onAttachClicked() {
	        this.props.onAttachClicked();
	    },
	    onPopupDidMount: function onPopupDidMount(elem) {
	        this.domNode = elem;
	    },
	    render: function render() {
	        var self = this;

	        var classes = "add-from-cloud " + self.props.className;

	        var folderIsHighlighted = false;

	        var breadcrumb = [];

	        var p = M.d[self.state.currentlyViewedEntry];
	        do {
	            var breadcrumbClasses = "";
	            if (p.h === M.RootID) {
	                breadcrumbClasses += " cloud-drive";

	                if (self.state.currentlyViewedEntry !== M.RootID) {
	                    breadcrumbClasses += " has-next-button";
	                }
	            } else {
	                breadcrumbClasses += " folder";
	            }

	            (function (p) {
	                if (self.state.currentlyViewedEntry !== p.h) {
	                    breadcrumbClasses += " has-next-button";
	                }
	                breadcrumb.unshift(React.makeElement(
	                    "a",
	                    { className: "fm-breadcrumbs contains-directories " + breadcrumbClasses, key: p.h, onClick: function onClick(e) {
	                            e.preventDefault();
	                            e.stopPropagation();
	                            self.setState({ 'currentlyViewedEntry': p.h, 'selected': [] });
	                            self.onSelected([]);
	                            self.onHighlighted([]);
	                        } },
	                    React.makeElement(
	                        "span",
	                        { className: "right-arrow-bg invisible" },
	                        React.makeElement(
	                            "span",
	                            null,
	                            p.h === M.RootID ? __("Cloud Drive") : p.name
	                        )
	                    )
	                ));
	            })(p);
	        } while (p = M.d[M.d[p.h].p]);

	        self.state.highlighted.forEach(function (nodeId) {
	            if (M.d[nodeId] && M.d[nodeId].t === 1) {
	                folderIsHighlighted = true;
	            }
	        });

	        var buttons = [];

	        if (!folderIsHighlighted) {
	            buttons.push({
	                "label": self.props.selectLabel,
	                "key": "select",
	                "className": "default-grey-button " + (self.state.selected.length === 0 ? "disabled" : null),
	                "onClick": function onClick(e) {
	                    if (self.state.selected.length > 0) {
	                        self.props.onSelected(self.state.selected);
	                        self.props.onAttachClicked();
	                    }
	                    e.preventDefault();
	                    e.stopPropagation();
	                }
	            });
	        } else if (folderIsHighlighted) {
	            buttons.push({
	                "label": self.props.openLabel,
	                "key": "select",
	                "className": "default-grey-button",
	                "onClick": function onClick(e) {
	                    if (self.state.highlighted.length > 0) {
	                        self.setState({ 'currentlyViewedEntry': self.state.highlighted[0]
	                        });
	                        self.onSelected([]);
	                        self.onHighlighted([]);
	                        self.browserEntries.setState({
	                            'selected': [],
	                            'highlighted': []
	                        });
	                    }
	                    e.preventDefault();
	                    e.stopPropagation();
	                }
	            });
	        }

	        buttons.push({
	            "label": self.props.cancelLabel,
	            "key": "cancel",
	            "onClick": function onClick(e) {
	                self.props.onClose(self);
	                e.preventDefault();
	                e.stopPropagation();
	            }
	        });

	        return React.makeElement(
	            ModalDialog,
	            {
	                title: __(l[8011]),
	                className: classes,
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                popupDidMount: self.onPopupDidMount,
	                buttons: buttons },
	            React.makeElement(
	                "div",
	                { className: "fm-breadcrumbs-block add-from-cloud" },
	                React.makeElement(
	                    "div",
	                    { className: "breadcrumbs-wrapper" },
	                    breadcrumb,
	                    React.makeElement("div", { className: "clear" })
	                )
	            ),
	            React.makeElement(
	                "table",
	                { className: "grid-table-header fm-dialog-table" },
	                React.makeElement(
	                    "tbody",
	                    null,
	                    React.makeElement(
	                        "tr",
	                        null,
	                        React.makeElement(BrowserCol, { id: "grid-header-star", sortBy: self.state.sortBy, onClick: self.toggleSortBy }),
	                        React.makeElement(BrowserCol, { id: "name", label: __("Name"), sortBy: self.state.sortBy, onClick: self.toggleSortBy }),
	                        React.makeElement(BrowserCol, { id: "size", label: __("Size"), sortBy: self.state.sortBy, onClick: self.toggleSortBy })
	                    )
	                )
	            ),
	            React.makeElement(BrowserEntries, {
	                entries: self.getEntries(),
	                onExpand: function onExpand(node) {
	                    self.onSelected([]);
	                    self.onHighlighted([]);
	                    self.setState({ 'currentlyViewedEntry': node.h });
	                },
	                folderSelectNotAllowed: self.props.folderSelectNotAllowed,
	                onSelected: self.onSelected,
	                onHighlighted: self.onHighlighted,
	                onAttachClicked: self.onAttachClicked,
	                ref: function ref(browserEntries) {
	                    self.browserEntries = browserEntries;
	                }
	            })
	        );
	    }
	});

	var SelectContactDialog = React.createClass({
	    displayName: "SelectContactDialog",

	    mixins: [MegaRenderMixin],
	    clickTime: 0,
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'selectLabel': __(l[1940]),
	            'cancelLabel': __(l[82]),
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'selected': this.props.selected ? this.props.selected : []
	        };
	    },
	    onSelected: function onSelected(nodes) {
	        this.setState({ 'selected': nodes });
	        if (this.props.onSelected) {
	            this.props.onSelected(nodes);
	        }
	    },
	    onSelectClicked: function onSelectClicked() {
	        this.props.onSelectClicked();
	    },
	    render: function render() {
	        var self = this;

	        var classes = "send-contact " + self.props.className;

	        return React.makeElement(
	            ModalDialog,
	            {
	                title: __("Send Contact"),
	                className: classes,
	                selected: self.state.selected,
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                buttons: [{
	                    "label": self.props.selectLabel,
	                    "key": "select",
	                    "className": self.state.selected.length === 0 ? "disabled" : null,
	                    "onClick": function onClick(e) {
	                        if (self.state.selected.length > 0) {
	                            if (self.props.onSelected) {
	                                self.props.onSelected(self.state.selected);
	                            }
	                            self.props.onSelectClicked(self.state.selected);
	                        }
	                        e.preventDefault();
	                        e.stopPropagation();
	                    }
	                }, {
	                    "label": self.props.cancelLabel,
	                    "key": "cancel",
	                    "onClick": function onClick(e) {
	                        self.props.onClose(self);
	                        e.preventDefault();
	                        e.stopPropagation();
	                    }
	                }] },
	            React.makeElement(ContactsUI.ContactPickerWidget, {
	                megaChat: self.props.megaChat,
	                contacts: self.props.contacts,
	                exclude: self.props.exclude,
	                onSelectDone: self.props.onSelectClicked,
	                onSelected: self.onSelected,
	                selected: self.state.selected,
	                headerClasses: "left-aligned"
	            })
	        );
	    }
	});

	var ConfirmDialog = React.createClass({
	    displayName: "ConfirmDialog",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'confirmLabel': __(l[6826]),
	            'cancelLabel': __(l[82]),
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {};
	    },
	    onConfirmClicked: function onConfirmClicked() {
	        if (this.props.onConfirmClicked) {
	            this.props.onConfirmClicked();
	        }
	    },
	    render: function render() {
	        var self = this;

	        if (mega.config.get('confirmModal_' + self.props.name) === true) {
	            if (this.props.onConfirmClicked) {

	                setTimeout(function () {
	                    self.props.onConfirmClicked();
	                }, 75);
	            }
	            return null;
	        }

	        var classes = "delete-message " + self.props.name + " " + self.props.className;

	        return React.makeElement(
	            ModalDialog,
	            {
	                title: this.props.title,
	                className: classes,
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                buttons: [{
	                    "label": self.props.confirmLabel,
	                    "key": "select",
	                    "className": null,
	                    "onClick": function onClick(e) {
	                        self.onConfirmClicked();
	                        e.preventDefault();
	                        e.stopPropagation();
	                    }
	                }, {
	                    "label": self.props.cancelLabel,
	                    "key": "cancel",
	                    "onClick": function onClick(e) {
	                        self.props.onClose(self);
	                        e.preventDefault();
	                        e.stopPropagation();
	                    }
	                }] },
	            React.makeElement(
	                "div",
	                { className: "fm-dialog-content" },
	                self.props.children
	            ),
	            React.makeElement(
	                ExtraFooterElement,
	                null,
	                React.makeElement(
	                    "div",
	                    { className: "footer-checkbox" },
	                    React.makeElement(
	                        Forms.Checkbox,
	                        {
	                            name: "delete-confirm",
	                            id: "delete-confirm",
	                            onLabelClick: function onLabelClick(e, state) {
	                                if (state === true) {
	                                    mega.config.set('confirmModal_' + self.props.name, true);
	                                } else {
	                                    mega.config.set('confirmModal_' + self.props.name, false);
	                                }
	                            }
	                        },
	                        l['7039']
	                    )
	                )
	            )
	        );
	    }
	});

	module.exports = window.ModalDialogUI = {
	    ModalDialog: ModalDialog,
	    CloudBrowserDialog: CloudBrowserDialog,
	    SelectContactDialog: SelectContactDialog,
	    ConfirmDialog: ConfirmDialog,
	    ExtraFooterElement: ExtraFooterElement
	};

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var Handler = React.createClass({
	    displayName: "Handler",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },
	    render: function render() {
	        var classes = "tooltip-handler" + (this.props.className ? " " + this.props.className : "");
	        return React.makeElement(
	            "span",
	            { className: classes, onMouseOver: this.props.onMouseOver, onMouseOut: this.props.onMouseOut },
	            this.props.children
	        );
	    }
	});

	var Contents = React.createClass({
	    displayName: "Contents",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },
	    render: function render() {
	        var className = 'tooltip-contents dropdown body tooltip ' + (this.props.className ? this.props.className : "");

	        if (this.props.active) {
	            className += " visible";

	            return React.makeElement(
	                "div",
	                { className: className },
	                this.props.withArrow ? React.makeElement("i", { className: "dropdown-white-arrow" }) : null,
	                this.props.children
	            );
	        } else {
	            return null;
	        }
	    }
	});

	var Tooltip = React.createClass({
	    displayName: "Tooltip",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            'active': false
	        };
	    },
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },
	    componentDidUpdate: function componentDidUpdate(oldProps, oldState) {
	        var self = this;
	        if (oldState.active === true && this.state.active === false) {
	            $(window).unbind('resize.tooltip' + this.getUniqueId());
	        }
	        if (self.state.active === true) {
	            self.repositionTooltip();
	            $(window).rebind('resize.tooltip' + this.getUniqueId(), function () {
	                self.repositionTooltip();
	            });
	        }
	    },
	    repositionTooltip: function repositionTooltip() {
	        var self = this;

	        var elLeftPos, elTopPos, elWidth, elHeight;
	        var tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
	        var docWidth, docHeight;
	        var arrowClass;

	        if (!this.isMounted()) {
	            return;
	        }

	        var $container = $(this.findDOMNode());
	        var $el = $('.tooltip-handler', $container);
	        var $tooltip = $('.tooltip-contents', $container);

	        var tooltipOffset = this.props.tooltipOffset;
	        var arrow = this.props.withArrow;

	        if ($el && $tooltip) {
	            elWidth = $el.outerWidth();
	            elHeight = $el.outerHeight();
	            elLeftPos = $el.offset().left;
	            elTopPos = $el.offset().top;
	            tooltipWidth = $tooltip.outerWidth();
	            tooltipHeight = $tooltip.outerHeight();
	            docWidth = $(window).width();
	            docHeight = $(window).height();
	            $tooltip.removeClass('dropdown-arrow left-arrow right-arrow up-arrow down-arrow').removeAttr('style');

	            if (!tooltipOffset) {
	                tooltipOffset = 7;
	            }

	            if (elTopPos - tooltipHeight - tooltipOffset > 10) {
	                tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
	                tooltipTopPos = elTopPos - tooltipHeight - tooltipOffset;
	                arrowClass = arrow ? 'dropdown-arrow down-arrow' : '';
	            } else if (docHeight - (elTopPos + elHeight + tooltipHeight + tooltipOffset) > 10) {
	                tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
	                tooltipTopPos = elTopPos + elHeight + tooltipOffset;
	                arrowClass = arrow ? 'dropdown-arrow up-arrow' : '';
	            } else if (elLeftPos - tooltipWidth - tooltipOffset > 10) {
	                tooltipLeftPos = elLeftPos - tooltipWidth - tooltipOffset;
	                tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
	                arrowClass = arrow ? 'dropdown-arrow right-arrow' : '';
	            } else {
	                tooltipLeftPos = elLeftPos + elWidth + tooltipOffset;
	                tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
	                arrowClass = arrow ? 'dropdown-arrow left-arrow' : '';
	            }

	            $tooltip.css({
	                'left': tooltipLeftPos,
	                'top': tooltipTopPos
	            });
	            $tooltip.addClass(arrowClass);
	        }
	    },
	    onHandlerMouseOver: function onHandlerMouseOver() {
	        this.setState({ 'active': true });
	    },
	    onHandlerMouseOut: function onHandlerMouseOut() {
	        this.setState({ 'active': false });
	    },
	    render: function render() {
	        var self = this;

	        var classes = "" + this.props.className;

	        var others = [];
	        var handler = null;
	        var contents = null;

	        var x = 0;
	        React.Children.forEach(this.props.children, function (child) {
	            if (child.type.displayName === 'Handler') {
	                handler = React.cloneElement(child, {
	                    onMouseOver: function onMouseOver(e) {
	                        self.onHandlerMouseOver();
	                    },
	                    onMouseOut: function onMouseOut(e) {
	                        self.onHandlerMouseOut();
	                    }
	                });
	            } else if (child.type.displayName === 'Contents') {
	                contents = React.cloneElement(child, {
	                    active: self.state.active,
	                    withArrow: self.props.withArrow
	                });
	            } else {
	                var tmp = React.cloneElement(child, {
	                    key: x++
	                });
	                others.push(tmp);
	            }
	        });

	        return React.makeElement(
	            "span",
	            { className: classes },
	            handler,
	            contents,
	            others
	        );
	    }
	});

	module.exports = {
	    Tooltip: Tooltip,
	    Handler: Handler,
	    Contents: Contents
	};

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var Checkbox = React.createClass({
	    displayName: "Checkbox",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            checked: this.props.checked ? this.props.checked : false
	        };
	    },

	    onLabelClick: function onLabelClick(e) {
	        var state = !this.state.checked;

	        this.setState({
	            'checked': state
	        });

	        if (this.props.onLabelClick) {
	            this.props.onLabelClick(e, state);
	        }
	        this.onChange(e);
	    },
	    onChange: function onChange(e) {
	        if (this.props.onChange) {
	            this.props.onChange(e, this.state.checked);
	        }
	    },
	    render: function render() {
	        var className = this.state.checked ? "checkboxOn" : "checkboxOff";

	        return React.makeElement(
	            "div",
	            { className: "formsCheckbox" },
	            React.makeElement(
	                "div",
	                { className: "checkdiv " + className, onClick: this.onLabelClick },
	                React.makeElement("input", {
	                    type: "checkbox",
	                    name: this.props.name,
	                    id: this.props.id,
	                    className: className,
	                    checked: this.state.checked,
	                    onChange: this.onChange
	                })
	            ),
	            React.makeElement(
	                "label",
	                { htmlFor: this.props.id, className: "radio-txt" },
	                this.props.children
	            )
	        );
	    }
	});

	module.exports = {
	    Checkbox: Checkbox
	};

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var ModalDialogsUI = __webpack_require__(12);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var ConversationsUI = __webpack_require__(4);
	var DropdownEmojiSelector = __webpack_require__(16).DropdownEmojiSelector;

	var TypingArea = React.createClass({
	    displayName: "TypingArea",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'textareaMaxHeight': "40%"
	        };
	    },
	    getInitialState: function getInitialState() {
	        var initialText = this.props.initialText;

	        return {
	            typedMessage: initialText ? initialText : "",
	            textareaHeight: 20
	        };
	    },
	    onEmojiClicked: function onEmojiClicked(e, slug, meta) {
	        if (this.props.disabled) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        var self = this;

	        var txt = ":" + slug + ":";
	        if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
	            txt = slug;
	        }

	        self.setState({
	            typedMessage: self.state.typedMessage + " " + txt + " "
	        });

	        var $container = $(ReactDOM.findDOMNode(this));
	        var $textarea = $('.chat-textarea:visible textarea:visible', $container);

	        setTimeout(function () {
	            $textarea.click();
	            moveCursortoToEnd($textarea[0]);
	        }, 100);
	    },

	    typing: function typing() {
	        if (this.props.disabled) {
	            return;
	        }

	        var self = this;
	        var room = this.props.chatRoom;

	        if (self.stoppedTypingTimeout) {
	            clearTimeout(self.stoppedTypingTimeout);
	        }

	        self.stoppedTypingTimeout = setTimeout(function () {
	            if (room && self.iAmTyping) {
	                self.iAmTyping = false;
	                delete self.lastTypingStamp;
	            }
	        }, 4000);

	        if (room && !self.iAmTyping || room && self.iAmTyping && unixtime() - self.lastTypingStamp >= 4) {
	            self.iAmTyping = true;
	            self.lastTypingStamp = unixtime();
	            room.trigger('typing');
	        }
	    },
	    triggerOnUpdate: function triggerOnUpdate(forced) {
	        var self = this;
	        if (!self.props.onUpdate || !self.isMounted()) {
	            return;
	        }

	        var shouldTriggerUpdate = forced ? forced : false;

	        if (!shouldTriggerUpdate && self.state.typedMessage != self.lastTypedMessage) {
	            self.lastTypedMessage = self.state.typedMessage;
	            shouldTriggerUpdate = true;
	        }

	        if (!shouldTriggerUpdate) {
	            var $container = $(ReactDOM.findDOMNode(this));
	            var $textarea = $('.chat-textarea:visible textarea:visible', $container);
	            if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
	                self._lastTextareaHeight = $textarea.height();
	                shouldTriggerUpdate = true;
	                if (self.props.onResized) {
	                    self.props.onResized();
	                }
	            }
	        }

	        if (shouldTriggerUpdate) {
	            if (self.onUpdateThrottling) {
	                clearTimeout(self.onUpdateThrottling);
	            }

	            self.onUpdateThrottling = setTimeout(function () {
	                self.props.onUpdate();
	            }, 70);
	        }
	    },
	    onCancelClicked: function onCancelClicked(e) {
	        var self = this;
	        self.setState({ typedMessage: "" });
	        self.onConfirmTrigger(false);
	        self.triggerOnUpdate();
	    },
	    onSaveClicked: function onSaveClicked(e) {
	        var self = this;

	        if (self.props.disabled || !self.isMounted()) {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(self));
	        var val = $.trim($('.chat-textarea:visible textarea:visible', $container).val());

	        if (self.onConfirmTrigger(val) !== true) {
	            self.setState({ typedMessage: "" });
	        }
	        self.triggerOnUpdate();
	    },
	    onConfirmTrigger: function onConfirmTrigger(val) {
	        var result = this.props.onConfirm(val);

	        if (val !== false && result !== false) {

	            var $node = $(this.findDOMNode());
	            var $textareaScrollBlock = $('.textarea-scroll', $node);
	            var jsp = $textareaScrollBlock.data('jsp');
	            jsp.scrollToY(0);
	            $('.jspPane', $textareaScrollBlock).css({ 'top': 0 });
	        }

	        if (this.props.persist) {
	            var megaChat = this.props.chatRoom.megaChat;
	            if (megaChat.plugins.persistedTypeArea) {
	                megaChat.plugins.persistedTypeArea.removePersistedTypedValue(this.props.chatRoom);
	            }
	        }
	        return result;
	    },
	    onTypeAreaKeyDown: function onTypeAreaKeyDown(e) {
	        if (this.props.disabled) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        var self = this;
	        var key = e.keyCode || e.which;
	        var element = e.target;
	        var val = $.trim(element.value);

	        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {

	            if (self.onConfirmTrigger(val) !== true) {
	                self.setState({ typedMessage: "" });
	            }
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }
	    },
	    onTypeAreaKeyUp: function onTypeAreaKeyUp(e) {
	        if (this.props.disabled) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        var self = this;
	        var key = e.keyCode || e.which;
	        var element = e.target;
	        var val = $.trim(element.value);

	        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {

	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        } else if (key === 13) {
	            if ($.trim(val).length === 0) {
	                e.preventDefault();
	            }
	        } else if (key === 38) {
	            if ($.trim(val).length === 0) {
	                if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
	                    e.preventDefault();
	                    return;
	                }
	            }
	        } else if (key === 27) {
	            if (self.props.showButtons === true) {
	                e.preventDefault();
	                self.onCancelClicked(e);
	                return;
	            }
	        }

	        self.updateScroll(true);
	    },
	    onTypeAreaBlur: function onTypeAreaBlur(e) {
	        if (this.props.disabled) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        var self = this;
	    },
	    onTypeAreaChange: function onTypeAreaChange(e) {
	        if (this.props.disabled) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }
	        var self = this;

	        if (self.state.typedMessage !== e.target.value) {
	            self.setState({ typedMessage: e.target.value });
	            self.forceUpdate();
	        }

	        if ($.trim(e.target.value).length > 0) {
	            self.typing();
	        }

	        if (this.props.persist) {
	            var megaChat = self.props.chatRoom.megaChat;
	            if (megaChat.plugins.persistedTypeArea) {
	                if ($.trim(e.target.value).length > 0) {
	                    megaChat.plugins.persistedTypeArea.updatePersistedTypedValue(self.props.chatRoom, e.target.value);
	                } else {
	                    megaChat.plugins.persistedTypeArea.removePersistedTypedValue(self.props.chatRoom);
	                }
	            }
	        }

	        self.updateScroll(true);
	    },
	    focusTypeArea: function focusTypeArea() {
	        if (this.props.disabled) {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(this));
	        if ($('.chat-textarea:visible textarea:visible', $container).length > 0) {
	            if (!$('.chat-textarea:visible textarea:visible', $container).is(":focus")) {

	                moveCursortoToEnd($('.chat-textarea:visible textarea', $container)[0]);
	            }
	        }
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        window.addEventListener('resize', self.handleWindowResize);

	        var $container = $(ReactDOM.findDOMNode(this));

	        self._lastTextareaHeight = 20;
	        if (self.props.initialText) {
	            self.lastTypedMessage = this.props.initialText;
	        }

	        var $container = $(self.findDOMNode());
	        $('.jScrollPaneContainer', $container).rebind('forceResize.typingArea' + self.getUniqueId(), function () {
	            self.updateScroll(false);
	        });
	        self.triggerOnUpdate(true);
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;
	        var initialText = self.props.initialText;

	        if (this.props.persist && megaChat.plugins.persistedTypeArea) {
	            if (!initialText) {
	                megaChat.plugins.persistedTypeArea.hasPersistedTypedValue(chatRoom).done(function () {
	                    megaChat.plugins.persistedTypeArea.getPersistedTypedValue(chatRoom).done(function (r) {
	                        if (self.state.typedMessage !== r) {
	                            self.setState({
	                                'typedMessage': r
	                            });
	                        }
	                    });
	                });
	            }
	            megaChat.plugins.persistedTypeArea.data.rebind('onChange.typingArea' + self.getUniqueId(), function (e, k, v) {
	                if (chatRoom.roomJid.split("@")[0] == k) {
	                    self.setState({ 'typedMessage': v ? v : "" });
	                    self.triggerOnUpdate(true);
	                }
	            });
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        self.triggerOnUpdate();
	        window.removeEventListener('resize', self.handleWindowResize);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (room.isCurrentlyActive && self.isMounted()) {
	            if ($('textarea:focus,select:focus,input:focus').size() === 0) {

	                this.focusTypeArea();
	            }

	            self.handleWindowResize();
	        }
	        if (!this.scrollingInitialised) {
	            this.initScrolling();
	        } else {
	            this.updateScroll();
	        }
	    },
	    initScrolling: function initScrolling() {
	        var self = this;
	        self.scrollingInitialised = true;
	        var $node = $(self.findDOMNode());
	        var $textarea = $('textarea:first', $node);
	        var $textareaClone = $('message-preview', $node);
	        self.textareaLineHeight = parseInt($textarea.css('line-height'));
	        var $textareaScrollBlock = $('.textarea-scroll', $node);
	        $textareaScrollBlock.jScrollPane({
	            enableKeyboardNavigation: false,
	            showArrows: true,
	            arrowSize: 5,
	            animateScroll: false,
	            maintainPosition: false
	        });
	    },
	    getTextareaMaxHeight: function getTextareaMaxHeight() {
	        var self = this;
	        var textareaMaxHeight = self.props.textareaMaxHeight;

	        if (String(textareaMaxHeight).indexOf("%") > -1) {
	            textareaMaxHeight = (parseInt(textareaMaxHeight.replace("%", "")) || 0) / 100;
	            if (textareaMaxHeight === 0) {
	                textareaMaxHeight = 100;
	            } else {
	                var $messagesContainer = $('.messages-block:visible');
	                textareaMaxHeight = $messagesContainer.height() * textareaMaxHeight;
	            }
	        }
	        return textareaMaxHeight;
	    },
	    updateScroll: function updateScroll(keyEvents) {
	        var self = this;

	        if (!self.isComponentEventuallyVisible()) {
	            return;
	        }

	        var $node = $(self.findDOMNode());

	        var $textarea = $('textarea:first', $node);
	        var $textareaClone = $('.message-preview', $node);
	        var textareaMaxHeight = self.getTextareaMaxHeight();

	        var $textareaScrollBlock = $('.textarea-scroll', $node);

	        var textareaContent = $textarea.val();
	        var cursorPosition = self.getCursorPosition($textarea[0]);
	        var $textareaCloneSpan;

	        var viewLimitTop = 0;
	        var scrPos = 0;
	        var viewRatio = 0;

	        if (keyEvents && self.lastContent === textareaContent && self.lastPosition === cursorPosition) {
	            return;
	        } else {
	            self.lastContent = textareaContent;
	            self.lastPosition = cursorPosition;

	            textareaContent = '@[!' + textareaContent.substr(0, cursorPosition) + '!]@' + textareaContent.substr(cursorPosition, textareaContent.length);

	            textareaContent = htmlentities(textareaContent);

	            textareaContent = textareaContent.replace(/@\[!/g, '<span>');
	            textareaContent = textareaContent.replace(/!\]@/g, '</span>');

	            textareaContent = textareaContent.replace(/\n/g, '<br />');
	            $textareaClone.html(textareaContent + '<br />');
	        }

	        var textareaCloneHeight = $textareaClone.height();
	        $textarea.height(textareaCloneHeight);
	        $textareaCloneSpan = $textareaClone.children('span');
	        var textareaCloneSpanHeight = $textareaCloneSpan.height();

	        var jsp = $textareaScrollBlock.data('jsp');

	        if (!jsp) {
	            $textareaScrollBlock.jScrollPane({
	                enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: false
	            });
	            var textareaWasFocused = $textarea.is(":focus");
	            jsp = $textareaScrollBlock.data('jsp');

	            if (textareaWasFocused) {
	                moveCursortoToEnd($('textarea:first', $node)[0]);
	            }
	        }

	        scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
	        viewRatio = Math.round(textareaCloneSpanHeight + scrPos);

	        $textareaScrollBlock.height(Math.min(textareaCloneHeight, textareaMaxHeight));

	        jsp.reinitialise();

	        if (textareaCloneHeight > textareaMaxHeight && textareaCloneSpanHeight < textareaMaxHeight) {
	            jsp.scrollToY(0);
	        } else if (viewRatio > self.textareaLineHeight || viewRatio < viewLimitTop) {
	            if (textareaCloneSpanHeight > 0 && jsp && textareaCloneSpanHeight > textareaMaxHeight) {
	                jsp.scrollToY(textareaCloneSpanHeight - self.textareaLineHeight);
	            } else if (jsp) {
	                jsp.scrollToY(0);
	            }
	        }

	        if (textareaCloneHeight < textareaMaxHeight) {
	            $textareaScrollBlock.addClass('noscroll');
	        } else {
	            $textareaScrollBlock.removeClass('noscroll');
	        }
	        if (textareaCloneHeight !== self.state.textareaHeight) {
	            self.setState({
	                'textareaHeight': textareaCloneHeight
	            });
	            if (self.props.onResized) {
	                self.props.onResized();
	            }
	        } else {
	            self.handleWindowResize();
	        }
	    },
	    getCursorPosition: function getCursorPosition(el) {
	        var pos = 0;
	        if ('selectionStart' in el) {
	            pos = el.selectionStart;
	        } else if ('selection' in document) {
	            el.focus();
	            var sel = document.selection.createRange(),
	                selLength = document.selection.createRange().text.length;

	            sel.moveStart('character', -el.value.length);
	            pos = sel.text.length - selLength;
	        }
	        return pos;
	    },
	    onTypeAreaSelect: function onTypeAreaSelect(e) {
	        this.updateScroll(true);
	    },
	    handleWindowResize: function handleWindowResize(e, scrollToBottom) {
	        var self = this;
	        if (!self.isMounted()) {
	            return;
	        }
	        if (!self.props.chatRoom.isCurrentlyActive) {
	            return;
	        }

	        if (e) {
	            self.updateScroll(false);
	        }
	        self.triggerOnUpdate();
	    },
	    isActive: function isActive() {
	        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
	    },
	    render: function render() {
	        var self = this;

	        var room = this.props.chatRoom;

	        var messageTextAreaClasses = "messages-textarea";

	        var buttons = null;

	        if (self.props.showButtons === true) {
	            buttons = [React.makeElement(ButtonsUI.Button, {
	                key: "save",
	                className: "default-white-button right",
	                icon: "",
	                onClick: self.onSaveClicked,
	                label: __(l[776]) }), React.makeElement(ButtonsUI.Button, {
	                key: "cancel",
	                className: "default-white-button right",
	                icon: "",
	                onClick: self.onCancelClicked,
	                label: __(l[1718]) })];
	        }

	        var textareaStyles = {
	            height: self.state.textareaHeight
	        };

	        var textareaScrollBlockStyles = {
	            height: Math.min(self.state.textareaHeight, self.getTextareaMaxHeight())
	        };

	        return React.makeElement(
	            "div",
	            { className: "typingarea-component" + self.props.className },
	            React.makeElement(
	                "div",
	                { className: "chat-textarea " + self.props.className },
	                React.makeElement("i", { className: self.props.iconClass ? self.props.iconClass : "small-icon conversations" }),
	                React.makeElement(
	                    "div",
	                    { className: "chat-textarea-buttons" },
	                    React.makeElement(
	                        ButtonsUI.Button,
	                        {
	                            className: "popup-button",
	                            icon: "smiling-face",
	                            disabled: this.props.disabled
	                        },
	                        React.makeElement(DropdownEmojiSelector, {
	                            className: "popup emoji",
	                            vertOffset: 12,
	                            onClick: self.onEmojiClicked
	                        })
	                    ),
	                    self.props.children
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "chat-textarea-scroll textarea-scroll jScrollPaneContainer",
	                        style: textareaScrollBlockStyles },
	                    React.makeElement("textarea", {
	                        className: messageTextAreaClasses,
	                        placeholder: __(l[8009]),
	                        onKeyUp: self.onTypeAreaKeyUp,
	                        onKeyDown: self.onTypeAreaKeyDown,
	                        onBlur: self.onTypeAreaBlur,
	                        onChange: self.onTypeAreaChange,
	                        onSelect: self.onTypeAreaSelect,
	                        value: self.state.typedMessage,
	                        ref: "typearea",
	                        style: textareaStyles,
	                        disabled: room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false,
	                        readOnly: room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false
	                    }),
	                    React.makeElement("div", { className: "message-preview" })
	                )
	            ),
	            buttons
	        );
	    }
	});

	module.exports = {
	    TypingArea: TypingArea
	};

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var DropdownsUI = __webpack_require__(9);
	var PerfectScrollbar = __webpack_require__(7).PerfectScrollbar;

	var DropdownEmojiSelector = React.createClass({
	    displayName: "DropdownEmojiSelector",

	    data_categories: null,
	    data_emojis: null,
	    data_emojiByCategory: null,
	    customCategoriesOrder: ["frequently_used", "people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"],
	    frequentlyUsedEmojis: ['slight_smile', 'grinning', 'smile', 'wink', 'yum', 'rolling_eyes', 'stuck_out_tongue'],
	    mixins: [MegaRenderMixin],
	    heightDefs: {
	        'categoryTitleHeight': 55,
	        'emojiRowHeight': 35,
	        'containerHeight': 302,
	        'totalScrollHeight': 302,
	        'numberOfEmojisPerRow': 9
	    },
	    categoryLabels: {
	        'people': l[8016],
	        'objects': __('Objects'),
	        'activity': l[8020],
	        'nature': l[8017],
	        'travel': l[8021],
	        'symbols': __('Symbols'),
	        'food': l[8018],
	        'flags': __('Flags')
	    },
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        var self = this;

	        return {
	            'previewEmoji': null,
	            'searchValue': '',
	            'browsingCategory': false,
	            'isActive': false,
	            'isLoading': true,
	            'loadFailed': false,
	            'visibleCategories': "0"
	        };
	    },
	    _generateEmoji: function _generateEmoji(meta) {
	        var filename = twemoji.convert.toCodePoint(meta.u);

	        return React.makeElement("img", {
	            width: "20",
	            height: "20",
	            className: "emoji emoji-loading",
	            draggable: "false",
	            alt: meta.u,
	            title: ":" + meta.n + ":",
	            onLoad: function onLoad(e) {
	                e.target.classList.remove('emoji-loading');
	            },
	            onError: function onError(e) {
	                e.target.classList.remove('emoji-loading');
	                e.target.classList.add('emoji-loading-error');
	            },
	            src: staticpath + "images/mega/twemojis/2/72x72/" + filename + ".png"
	        });
	    },
	    _generateEmojiElement: function _generateEmojiElement(emoji, cat) {
	        var self = this;

	        var categoryName = self.data_categories[cat];

	        return React.makeElement(
	            "div",
	            {
	                "data-emoji": emoji.n,
	                className: "button square-button emoji", key: categoryName + "_" + emoji.n,
	                onMouseEnter: function onMouseEnter(e) {
	                    if (self.mouseEnterTimer) {
	                        clearTimeout(self.mouseEnterTimer);
	                    }

	                    e.stopPropagation();
	                    e.preventDefault();

	                    self.mouseEnterTimer = setTimeout(function () {
	                        self.setState({ 'previewEmoji': emoji });
	                    }, 250);
	                },
	                onMouseLeave: function onMouseLeave(e) {
	                    if (self.mouseEnterTimer) {
	                        clearTimeout(self.mouseEnterTimer);
	                    }
	                    e.stopPropagation();
	                    e.preventDefault();

	                    self.setState({ 'previewEmoji': null });
	                },
	                onClick: function onClick(e) {
	                    if (self.props.onClick) {
	                        self.props.onClick(e, emoji.n, emoji);
	                    }
	                }
	            },
	            self._generateEmoji(emoji)
	        );
	    },
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	        window.$emojiDropdown = this;

	        if (nextState.searchValue !== this.state.searchValue || nextState.browsingCategories !== this.state.browsingCategories) {
	            this._cachedNodes = {};
	            if (this.scrollableArea) {
	                this.scrollableArea.scrollToY(0);
	            }
	            this._onScrollChanged(0, nextState);
	        }
	        if (nextState.isActive === true) {
	            var self = this;
	            if (nextState.isLoading === true || !self.loadingPromise && (!self.data_categories || !self.data_emojis)) {
	                self.loadingPromise = MegaPromise.allDone([megaChat.getEmojiDataSet('categories').done(function (categories) {
	                    self.data_categories = categories;
	                }), megaChat.getEmojiDataSet('emojis').done(function (emojis) {
	                    self.data_emojis = emojis;
	                })]).done(function (results) {
	                    if (!results[0] || results[0][1] && results[0][1] === "error" || !results[1] || results[1][1] && results[1][1] === "error") {
	                        if (d) {
	                            console.error("Emoji loading failed.", results);
	                        }
	                        self.setState({ 'loadFailed': true, 'isLoading': false });
	                        return;
	                    }

	                    self.data_categories.push('frequently_used');
	                    self.data_categoriesWithCustomOrder = [];
	                    self.customCategoriesOrder.forEach(function (catName) {
	                        self.data_categoriesWithCustomOrder.push(self.data_categories.indexOf(catName));
	                    });

	                    self.data_emojiByCategory = {};

	                    var frequentlyUsedEmojisMeta = {};
	                    self.data_emojis.forEach(function (emoji) {
	                        var cat = emoji.c;
	                        if (!self.data_emojiByCategory[cat]) {
	                            self.data_emojiByCategory[cat] = [];
	                        }
	                        if (self.frequentlyUsedEmojis.indexOf(emoji.n) > -1) {
	                            frequentlyUsedEmojisMeta[emoji.n] = emoji.u;
	                        }

	                        emoji.element = self._generateEmojiElement(emoji, cat);

	                        self.data_emojiByCategory[cat].push(emoji);
	                    });

	                    self.data_emojiByCategory[8] = [];

	                    self.frequentlyUsedEmojis.forEach(function (slug) {
	                        var emoji = {
	                            'n': slug,
	                            'u': frequentlyUsedEmojisMeta[slug]
	                        };

	                        emoji.element = self._generateEmojiElement(emoji, 99);
	                        self.data_emojiByCategory[8].push(emoji);
	                    });

	                    self._onScrollChanged(0);

	                    self.setState({ 'isLoading': false });
	                });
	            }
	        } else if (nextState.isActive === false) {
	            var self = this;

	            if (self.data_emojis) {

	                self.data_emojis.forEach(function (emoji) {
	                    delete emoji.element;
	                });
	            }
	            self.data_emojis = null;
	            self.data_categories = null;
	            self.data_emojiByCategory = null;
	            self.loadingPromise = null;
	        }
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({
	            searchValue: e.target.value,
	            browsingCategory: false
	        });
	    },
	    onUserScroll: function onUserScroll($ps, elem, e) {
	        if (this.state.browsingCategory) {
	            var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');
	            if (!elementInViewport($cat)) {
	                this.setState({ 'browsingCategory': false });
	            }
	        }

	        this._onScrollChanged($ps.getScrollPositionY());
	    },
	    generateEmojiElementsByCategory: function generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
	        var self = this;

	        if (!self._cachedNodes) {
	            self._cachedNodes = {};
	        }
	        if (!stateObj) {
	            stateObj = self.state;
	        }

	        if (typeof self._cachedNodes[categoryId] !== 'undefined') {
	            return self._cachedNodes[categoryId];
	        }

	        var categoryName = self.data_categories[categoryId];
	        var emojis = [];
	        var searchValue = stateObj.searchValue;

	        var totalEmojis = 0;
	        self.data_emojiByCategory[categoryId].forEach(function (meta) {
	            var slug = meta.n;
	            if (searchValue.length > 0) {
	                if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
	                    return;
	                }
	            }

	            totalEmojis++;

	            emojis.push(meta.element);
	        });

	        if (emojis.length > 0) {
	            var totalHeight = self.heightDefs.categoryTitleHeight + Math.ceil(totalEmojis / self.heightDefs.numberOfEmojisPerRow) * self.heightDefs.emojiRowHeight;

	            return self._cachedNodes[categoryId] = [totalHeight, React.makeElement(
	                "div",
	                {
	                    key: categoryName,
	                    "data-category-name": categoryName, className: "emoji-category-container",
	                    style: {
	                        'position': 'absolute',
	                        'top': posTop
	                    }
	                },
	                emojis.length > 0 ? React.makeElement("div", { className: "clear" }) : null,
	                React.makeElement(
	                    "div",
	                    { className: "emoji-type-txt" },
	                    self.categoryLabels[categoryName] ? self.categoryLabels[categoryName] : categoryName
	                ),
	                React.makeElement("div", { className: "clear" }),
	                emojis,
	                React.makeElement("div", { className: "clear" })
	            )];
	        } else {
	            return self._cachedNodes[categoryId] = undefined;
	        }
	    },
	    _isVisible: function _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
	        var visibleTop = elTop < scrollTop ? scrollTop : elTop;
	        var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
	        var visibleHeight = visibleBottom - visibleTop;

	        return visibleBottom - visibleTop > 0;
	    },
	    _onScrollChanged: function _onScrollChanged(scrollPositionY, stateObj) {
	        var self = this;

	        if (!self.data_categoriesWithCustomOrder) {
	            return;
	        }

	        if (scrollPositionY === false) {
	            scrollPositionY = self.scrollableArea.getScrollPositionY();
	        }
	        if (!stateObj) {
	            stateObj = self.state;
	        }

	        var emojis = [];
	        var searchValue = stateObj.searchValue;

	        var visibleStart = scrollPositionY;
	        var visibleEnd = visibleStart + self.heightDefs.containerHeight;

	        var currentPos = 0;
	        var visibleCategories = [];
	        self._emojiReactElements = [];
	        self.data_categoryPositions = {};
	        self.data_categoriesWithCustomOrder.forEach(function (k) {
	            var categoryDivMeta = self.generateEmojiElementsByCategory(k, currentPos, stateObj);
	            if (categoryDivMeta) {
	                var startPos = currentPos;
	                currentPos += categoryDivMeta[0];
	                var endPos = currentPos;

	                self.data_categoryPositions[k] = startPos;

	                if (self._isVisible(visibleStart, visibleEnd, startPos, endPos)) {
	                    visibleCategories.push(k);

	                    self._emojiReactElements.push(categoryDivMeta[1]);
	                }
	            }
	        });

	        visibleCategories = visibleCategories.join(',');

	        self.setState({
	            'totalScrollHeight': currentPos,
	            'visibleCategories': visibleCategories
	        });
	    },
	    _renderEmojiPickerPopup: function _renderEmojiPickerPopup() {
	        var self = this;

	        var preview;
	        if (self.state.previewEmoji) {
	            var meta = self.state.previewEmoji;
	            var slug = meta.n;
	            var txt = ":" + slug + ":";
	            if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
	                txt = slug;
	            }

	            preview = React.makeElement(
	                "div",
	                { className: "emoji-preview" },
	                self._generateEmoji(meta),
	                React.makeElement(
	                    "div",
	                    { className: "emoji title" },
	                    ":" + meta.n + ":"
	                )
	            );
	        }

	        var categoryIcons = {
	            "frequently_used": "clock-icon",
	            "people": "smile-icon",
	            "nature": "leaf-icon",
	            "food": "cutlery-icon",
	            "activity": "ball-icon",
	            "travel": "car-icon",
	            "objects": "bulb-icon",
	            "symbols": "heart-icon",
	            "flags": "flag-icon"
	        };

	        var categoryButtons = [];

	        var activeCategoryName = false;
	        if (!self.state.searchValue) {
	            var firstActive = self.state.visibleCategories.split(",")[0];
	            if (firstActive) {
	                activeCategoryName = self.data_categories[firstActive];
	            }
	        }

	        self.customCategoriesOrder.forEach(function (categoryName) {
	            var activeClass = activeCategoryName === categoryName ? " active" : "";

	            categoryButtons.push(React.makeElement(
	                "div",
	                {
	                    visibleCategories: self.state.visibleCategories,
	                    className: "button square-button emoji" + activeClass,
	                    key: categoryIcons[categoryName],
	                    onClick: function onClick(e) {
	                        e.stopPropagation();
	                        e.preventDefault();

	                        self.setState({ browsingCategory: categoryName, searchValue: '' });
	                        self._cachedNodes = {};

	                        var categoryPosition = self.data_categoryPositions[self.data_categories.indexOf(categoryName)] + 10;

	                        self.scrollableArea.scrollToY(categoryPosition);

	                        self._onScrollChanged(categoryPosition);
	                    }
	                },
	                React.makeElement("i", { className: "small-icon " + categoryIcons[categoryName] })
	            ));
	        });

	        return React.makeElement(
	            "div",
	            null,
	            React.makeElement(
	                "div",
	                { className: "popup-header emoji" },
	                preview ? preview : React.makeElement(
	                    "div",
	                    { className: "search-block emoji" },
	                    React.makeElement("i", { className: "small-icon search-icon" }),
	                    React.makeElement("input", { type: "search",
	                        placeholder: __(l[102]),
	                        ref: "emojiSearchField",
	                        onChange: this.onSearchChange,
	                        value: this.state.searchValue })
	                )
	            ),
	            React.makeElement(
	                PerfectScrollbar,
	                {
	                    className: "popup-scroll-area emoji perfectScrollbarContainer",
	                    searchValue: this.state.searchValue,
	                    onUserScroll: this.onUserScroll,
	                    visibleCategories: this.state.visibleCategories,
	                    ref: function ref(_ref) {
	                        self.scrollableArea = _ref;
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "popup-scroll-content emoji" },
	                    React.makeElement(
	                        "div",
	                        { style: { height: self.state.totalScrollHeight } },
	                        self._emojiReactElements
	                    )
	                )
	            ),
	            React.makeElement(
	                "div",
	                { className: "popup-footer emoji" },
	                categoryButtons
	            )
	        );
	    },
	    render: function render() {
	        var self = this;

	        var popupContents = null;

	        if (self.state.isActive === true) {
	            if (self.state.loadFailed === true) {
	                popupContents = React.makeElement(
	                    "div",
	                    { className: "loading" },
	                    l[1514]
	                );
	            } else if (self.state.isLoading === true && !self.data_emojiByCategory) {
	                popupContents = React.makeElement(
	                    "div",
	                    { className: "loading" },
	                    l[5533]
	                );
	            } else {
	                popupContents = self._renderEmojiPickerPopup();
	            }
	        } else {
	            popupContents = null;
	        }

	        return React.makeElement(
	            DropdownsUI.Dropdown,
	            _extends({
	                className: "popup emoji" }, self.props, { ref: "dropdown",
	                isLoading: self.state.isLoading,
	                loadFailed: self.state.loadFailed,
	                visibleCategories: this.state.visibleCategories,
	                onActiveChange: function onActiveChange(newValue) {

	                    if (newValue === false) {
	                        self.setState(self.getInitialState());
	                        self._cachedNodes = {};
	                        self._onScrollChanged(0);
	                    } else {
	                        self.setState({ 'isActive': true });
	                    }
	                },
	                searchValue: self.state.searchValue,
	                browsingCategory: self.state.browsingCategory,
	                previewEmoji: self.state.previewEmoji
	            }),
	            popupContents
	        );
	    }
	});

	module.exports = window.EmojiDropdown = {
	    DropdownEmojiSelector: DropdownEmojiSelector
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var WhosTyping = React.createClass({
	    displayName: "WhosTyping",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            currentlyTyping: {}
	        };
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = self.props.chatRoom.megaChat;

	        chatRoom.bind("onParticipantTyping.whosTyping", function (e, user_handle) {
	            if (!self.isMounted()) {
	                return;
	            }
	            if (user_handle === u_handle) {
	                return;
	            }

	            var currentlyTyping = clone(self.state.currentlyTyping);
	            var u_h = user_handle;

	            if (u_h === u_handle) {

	                return;
	            } else if (!M.u[u_h]) {

	                return;
	            }
	            if (currentlyTyping[u_h]) {
	                clearTimeout(currentlyTyping[u_h][1]);
	            }

	            var timer = setTimeout(function () {
	                if (self.state.currentlyTyping[u_h]) {
	                    var newState = clone(self.state.currentlyTyping);
	                    delete newState[u_h];
	                    self.setState({ currentlyTyping: newState });
	                }
	            }, 5000);

	            currentlyTyping[u_h] = [unixtime(), timer];

	            self.setState({
	                currentlyTyping: currentlyTyping
	            });

	            self.forceUpdate();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        chatRoom.unbind("onParticipantTyping.whosTyping");
	    },
	    render: function render() {
	        var self = this;

	        var typingElement = null;

	        if (Object.keys(self.state.currentlyTyping).length > 0) {
	            var names = Object.keys(self.state.currentlyTyping).map(function (u_h) {
	                var avatarMeta = generateAvatarMeta(u_h);
	                return avatarMeta.fullName.split(" ")[0];
	            });

	            var namesDisplay = "";
	            var areMultipleUsersTyping = false;

	            if (names.length > 1) {
	                areMultipleUsersTyping = true;
	                namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
	            } else {
	                areMultipleUsersTyping = false;
	                namesDisplay = [names[0]];
	            }

	            var msg;
	            if (areMultipleUsersTyping === true) {
	                msg = __(l[8872]).replace("%1", namesDisplay[0]).replace("%2", namesDisplay[1]);
	            } else {
	                msg = __(l[8629]).replace("%1", namesDisplay[0]);
	            }

	            typingElement = React.makeElement(
	                "div",
	                { className: "typing-block" },
	                React.makeElement(
	                    "div",
	                    { className: "typing-text" },
	                    msg
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "typing-bounce" },
	                    React.makeElement("div", { className: "typing-bounce1" }),
	                    React.makeElement("div", { className: "typing-bounce2" }),
	                    React.makeElement("div", { className: "typing-bounce3" })
	                )
	            );
	        } else {}

	        return typingElement;
	    }

	});

	module.exports = {
	    WhosTyping: WhosTyping
	};

/***/ },
/* 18 */
/***/ function(module, exports) {

	'use strict';

	var getMessageString;
	(function () {
	    var MESSAGE_STRINGS;
	    getMessageString = function getMessageString(type) {
	        if (!MESSAGE_STRINGS) {
	            MESSAGE_STRINGS = {
	                'outgoing-call': l[5891],
	                'incoming-call': l[5893],
	                'call-timeout': l[5890],
	                'call-starting': l[7206],
	                'call-feedback': l[7998],
	                'call-initialising': l[7207],
	                'call-ended': [l[5889], l[7208]],
	                'call-failed-media': l[7204],
	                'call-failed': [l[7209], l[7208]],
	                'call-handled-elsewhere': l[5895],
	                'call-missed': l[7210],
	                'call-rejected': l[5892],
	                'call-canceled': l[5894],
	                'call-started': l[5888]
	            };
	        }
	        return MESSAGE_STRINGS[type];
	    };
	})();

	module.exports = {
	    getMessageString: getMessageString
	};

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var ModalDialogsUI = __webpack_require__(12);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var PerfectScrollbar = __webpack_require__(7).PerfectScrollbar;

	var ParticipantsList = React.createClass({
	    displayName: "ParticipantsList",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'contactCardHeight': 49

	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'scrollPositionY': 0,
	            'scrollHeight': 49 * 4
	        };
	    },
	    onUserScroll: function onUserScroll() {
	        var scrollPosY = this.refs.contactsListScroll.getScrollPositionY();
	        if (this.state.scrollPositionY !== scrollPosY) {
	            this.setState({
	                'scrollPositionY': scrollPosY
	            });
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        if (!self.isMounted()) {
	            return;
	        }

	        var $node = $(self.findDOMNode());

	        var scrollHeight;
	        var fitHeight = scrollHeight = self.refs.contactsListScroll.getContentHeight();
	        if (fitHeight === 0) {

	            return null;
	        }

	        var $parentContainer = $node.closest('.chat-right-pad');
	        var maxHeight = $parentContainer.outerHeight(true) - $('.buttons-block', $parentContainer).outerHeight(true) - $('.chat-right-head', $parentContainer).outerHeight(true);

	        if (fitHeight < $('.buttons-block', $parentContainer).outerHeight(true)) {
	            fitHeight = Math.max(fitHeight, 48);
	        } else if (maxHeight < fitHeight) {
	            fitHeight = Math.max(maxHeight, 48);
	        }

	        var $contactsList = $('.chat-contacts-list', $parentContainer);

	        if ($contactsList.height() !== fitHeight + 4) {
	            $('.chat-contacts-list', $parentContainer).height(fitHeight + 4);
	            self.refs.contactsListScroll.eventuallyReinitialise(true);
	        }

	        if (self.state.scrollHeight !== fitHeight) {
	            self.setState({ 'scrollHeight': fitHeight });
	        }
	        self.onUserScroll();
	    },
	    render: function render() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (!room || !room.roomJid) {

	            return null;
	        }
	        var contactJid;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactJid = contacts[0];
	            contact = room.megaChat.getContactFromJid(contactJid);
	        } else {
	            contact = {};
	        }

	        return React.makeElement(
	            "div",
	            { className: "chat-contacts-list" },
	            React.makeElement(
	                PerfectScrollbar,
	                {
	                    chatRoom: room,
	                    members: room.members,
	                    ref: "contactsListScroll",
	                    onUserScroll: self.onUserScroll,
	                    requiresUpdateOnResize: true
	                },
	                React.makeElement(ParticipantsListInner, {
	                    chatRoom: room, members: room.members,
	                    scrollPositionY: self.state.scrollPositionY,
	                    scrollHeight: self.state.scrollHeight
	                })
	            )
	        );
	    }
	});

	var ParticipantsListInner = React.createClass({
	    displayName: "ParticipantsListInner",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'contactCardHeight': 49,
	            'scrollPositionY': 0,
	            'scrollHeight': 49 * 4

	        };
	    },
	    getInitialState: function getInitialState() {
	        return {};
	    },
	    render: function render() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (!room || !room.roomJid) {

	            return null;
	        }
	        if (!room.isCurrentlyActive && room._leaving !== true) {

	            return false;
	        }
	        var contactJid;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactJid = contacts[0];
	            contact = room.megaChat.getContactFromJid(contactJid);
	        } else {
	            contact = {};
	        }

	        var myPresence = room.megaChat.xmppPresenceToCssClass(M.u[u_handle].presence);

	        var contactsList = [];

	        contacts = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getContactParticipantsExceptMe() : room.getContactParticipantsExceptMe();

	        removeValue(contacts, u_handle, true);

	        var firstVisibleUserNum = Math.floor(self.props.scrollPositionY / self.props.contactCardHeight);
	        var visibleUsers = Math.ceil(self.props.scrollHeight / self.props.contactCardHeight);
	        var lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

	        var contactListInnerStyles = {
	            'height': contacts.length * self.props.contactCardHeight
	        };

	        if (room.type === "group" && !room.stateIsLeftOrLeaving()) {
	            contacts.unshift(u_handle);
	            contactListInnerStyles.height += self.props.contactCardHeight;
	        }

	        var i = 0;
	        contacts.forEach(function (contactHash) {
	            var contact = M.u[contactHash];
	            if (contact) {
	                if (i < firstVisibleUserNum || i > lastVisibleUserNum) {
	                    i++;
	                    return;
	                }
	                var dropdowns = [];
	                var privilege = null;

	                var dropdownIconClasses = "small-icon tiny-icon grey-down-arrow";

	                if (room.type === "group" && room.members && myPresence !== 'offline') {
	                    var removeParticipantButton = React.makeElement(DropdownsUI.DropdownItem, {
	                        key: "remove", icon: "rounded-stop", label: __(l[8867]), onClick: function onClick() {
	                            $(room).trigger('onRemoveUserRequest', [contactHash]);
	                        } });

	                    if (room.iAmOperator() || contactHash === u_handle) {

	                        dropdowns.push(React.makeElement(
	                            "div",
	                            { key: "setPermLabel", className: "dropdown-items-info" },
	                            __(l[8868])
	                        ));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privOperator", icon: "cogwheel-icon",
	                            label: __(l[8875]),
	                            className: "tick-item " + (room.members[contactHash] === 3 ? "active" : ""),
	                            disabled: myPresence === 'offline' || contactHash === u_handle,
	                            onClick: function onClick() {
	                                if (room.members[contactHash] !== 3) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 3]);
	                                }
	                            } }));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privFullAcc", icon: "conversation-icon",
	                            className: "tick-item " + (room.members[contactHash] === 2 ? "active" : ""),
	                            disabled: myPresence === 'offline' || contactHash === u_handle,
	                            label: __(l[8874]), onClick: function onClick() {
	                                if (room.members[contactHash] !== 2) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 2]);
	                                }
	                            } }));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privReadOnly", icon: "eye-icon",
	                            className: "tick-item " + (room.members[contactHash] === 0 ? "active" : ""),
	                            disabled: myPresence === 'offline' || contactHash === u_handle,
	                            label: __(l[8873]), onClick: function onClick() {
	                                if (room.members[contactHash] !== 0) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 0]);
	                                }
	                            } }));
	                    } else if (room.members[u_handle] === 2) {} else if (room.members[u_handle] === 1) {} else if (room.isReadOnly()) {} else {}

	                    if (room.members[contactHash] === 3) {
	                        dropdownIconClasses = "small-icon cogwheel-icon";
	                    } else if (room.members[contactHash] === 2) {
	                        dropdownIconClasses = "small-icon conversation-icon";
	                    } else if (room.members[contactHash] === 0) {
	                        dropdownIconClasses = "small-icon eye-icon";
	                    } else {}

	                    if (contactHash !== u_handle) {
	                        dropdowns.push(removeParticipantButton);
	                    }
	                }

	                contactsList.push(React.makeElement(ContactsUI.ContactCard, {
	                    key: contact.u,
	                    contact: contact,
	                    megaChat: room.megaChat,
	                    className: "right-chat-contact-card",
	                    dropdownPositionMy: "right top",
	                    dropdownPositionAt: "right bottom",
	                    dropdowns: dropdowns,
	                    dropdownDisabled: !room.iAmOperator() || contactHash === u_handle,
	                    dropdownButtonClasses: room.type == "group" && myPresence !== 'offline' ? "button icon-dropdown" : "default-white-button tiny-button",
	                    dropdownIconClasses: dropdownIconClasses,
	                    style: {
	                        width: 234,
	                        position: 'absolute',
	                        top: i * self.props.contactCardHeight
	                    }
	                }));

	                i++;
	            }
	        });

	        return React.makeElement(
	            "div",
	            { className: "chat-contacts-list-inner", style: contactListInnerStyles },
	            contactsList
	        );
	    }
	});
	module.exports = {
	    ParticipantsList: ParticipantsList
	};

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var getMessageString = __webpack_require__(18).getMessageString;
	var ConversationMessageMixin = __webpack_require__(21).ConversationMessageMixin;
	var ContactsUI = __webpack_require__(10);
	var TypingAreaUI = __webpack_require__(15);

	var MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60 * 60;

	var GenericConversationMessage = React.createClass({
	    displayName: 'GenericConversationMessage',

	    mixins: [ConversationMessageMixin],
	    getInitialState: function getInitialState() {
	        return {
	            'editing': false
	        };
	    },
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {},
	    componentDidUpdate: function componentDidUpdate(oldProps, oldState) {
	        var self = this;
	        if (self.state.editing === true && self.isMounted()) {
	            var $generic = $(self.findDOMNode());
	            var $textarea = $('textarea', $generic);
	            if ($textarea.size() > 0 && !$textarea.is(":focus")) {
	                $textarea.focus();
	                moveCursortoToEnd($textarea[0]);
	            }
	            if (!oldState.editing) {
	                if (self.props.onEditStarted) {
	                    self.props.onEditStarted($generic);
	                }
	            }
	        } else if (self.isMounted() && self.state.editing === false && oldState.editing === true) {
	            if (self.props.onUpdate) {
	                self.props.onUpdate();
	            }
	        }
	        var $node = $(self.findDOMNode());
	        $node.rebind('onEditRequest.genericMessage', function (e) {
	            if (self.state.editing === false) {
	                self.setState({ 'editing': true });

	                Soon(function () {
	                    var $generic = $(self.findDOMNode());
	                    var $textarea = $('textarea', $generic);
	                    if ($textarea.size() > 0 && !$textarea.is(":focus")) {
	                        $textarea.focus();
	                        moveCursortoToEnd($textarea[0]);
	                    }
	                });
	            }
	        });
	        $(self.props.message).rebind('onChange.GenericConversationMessage' + self.getUniqueId(), function () {
	            Soon(function () {
	                if (self.isMounted()) {
	                    self.eventuallyUpdate();
	                }
	            });
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var $node = $(self.findDOMNode());
	        $node.unbind('onEditRequest.genericMessage');
	        $(self.props.message).unbind('onChange.GenericConversationMessage' + self.getUniqueId());
	    },
	    doDelete: function doDelete(e, msg) {
	        e.preventDefault(e);
	        e.stopPropagation(e);

	        if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
	            this.doCancelRetry(e, msg);
	        } else {
	            this.props.onDeleteClicked(e, this.props.message);
	        }
	    },
	    doCancelRetry: function doCancelRetry(e, msg) {
	        e.preventDefault(e);
	        e.stopPropagation(e);
	        var chatRoom = this.props.message.chatRoom;

	        chatRoom.messagesBuff.messages.removeByKey(msg.messageId);

	        chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, msg.messageId);
	    },
	    doRetry: function doRetry(e, msg) {
	        var self = this;
	        e.preventDefault(e);
	        e.stopPropagation(e);
	        var chatRoom = this.props.message.chatRoom;
	        this.doCancelRetry(e, msg);
	        chatRoom._sendMessageToTransport(msg).done(function (internalId) {
	            msg.internalId = internalId;

	            self.safeForceUpdate();
	        });
	    },
	    render: function render() {
	        var self = this;

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var textMessage;

	        var additionalClasses = "";
	        var buttonsBlock = null;
	        var spinnerElement = null;
	        var messageNotSendIndicator = null;
	        var messageIsNowBeingSent = false;

	        if (this.props.className) {
	            additionalClasses += this.props.className;
	        }

	        if (message.revoked) {

	            return null;
	        }

	        if (message instanceof KarereEventObjects.IncomingMessage || message instanceof KarereEventObjects.OutgoingMessage || message instanceof KarereEventObjects.IncomingPrivateMessage || message instanceof Message) {

	            if (message.messageHtml) {
	                message.messageHtml = message.messageHtml;
	            } else {
	                message.messageHtml = htmlentities(message.getContents ? message.getContents() : message.textContents).replace(/\n/gi, "<br/>");
	            }

	            var event = new $.Event("onBeforeRenderMessage");
	            megaChat.trigger(event, {
	                message: message,
	                room: chatRoom
	            });

	            if (event.isPropagationStopped()) {
	                self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
	                return false;
	            }
	            textMessage = message.messageHtml;

	            if (message instanceof Message || message instanceof KarereEventObjects.OutgoingMessage || typeof message.userId !== 'undefined' && message.userId === u_handle) {
	                if (message.getState() === Message.STATE.NULL) {
	                    additionalClasses += " error";
	                } else if (message.getState() === Message.STATE.NOT_SENT) {
	                    messageIsNowBeingSent = unixtime() - message.delay < 5;

	                    if (!messageIsNowBeingSent) {
	                        additionalClasses += " not-sent";

	                        if (message.sending === true) {
	                            message.sending = false;

	                            $(message).trigger('onChange', [message, "sending", true, false]);
	                        }

	                        if (!message.requiresManualRetry) {
	                            additionalClasses += " retrying";
	                        } else {
	                            additionalClasses += " retrying requires-manual-retry";
	                        }

	                        buttonsBlock = null;
	                    } else {
	                        additionalClasses += " sending";
	                        spinnerElement = React.makeElement('div', { className: 'small-blue-spinner' });

	                        if (!message.sending) {
	                            message.sending = true;
	                            if (self._rerenderTimer) {
	                                clearTimeout(self._rerenderTimer);
	                            }
	                            self._rerenderTimer = setTimeout(function () {
	                                if (message.sending === true) {
	                                    chatRoom.messagesBuff.trackDataChange();
	                                    if (self.isMounted()) {
	                                        self.forceUpdate();
	                                    }
	                                }
	                            }, (5 - (unixtime() - message.delay)) * 1000);
	                        }
	                    }
	                } else if (message.getState() === Message.STATE.SENT) {
	                    additionalClasses += " sent";
	                } else if (message.getState() === Message.STATE.DELIVERED) {
	                    additionalClasses += " delivered";
	                } else if (message.getState() === Message.STATE.NOT_SEEN) {
	                    additionalClasses += " unread";
	                } else if (message.getState() === Message.STATE.SEEN) {
	                    additionalClasses += " seen";
	                } else if (message.getState() === Message.STATE.DELETED) {
	                    additionalClasses += " deleted";
	                } else {
	                    additionalClasses += " not-sent";
	                }
	            }

	            var displayName;
	            if (contact) {
	                displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
	            } else {
	                displayName = contact;
	            }

	            var textContents = message.getContents ? message.getContents() : message.textContents;

	            if (textContents.substr && textContents.substr(0, 1) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
	                if (textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
	                    textContents = textContents.substr(2, textContents.length);

	                    try {
	                        var attachmentMeta = JSON.parse(textContents);
	                    } catch (e) {
	                        return null;
	                    }

	                    var files = [];

	                    attachmentMeta.forEach(function (v, attachmentKey) {
	                        var startDownload = function startDownload() {
	                            M.addDownload([v]);
	                        };

	                        var attachmentMetaInfo;

	                        if (message.messageId) {
	                            if (chatRoom.attachments && chatRoom.attachments[v.h] && chatRoom.attachments[v.h][message.messageId]) {
	                                attachmentMetaInfo = chatRoom.attachments[v.h][message.messageId];
	                            } else {

	                                return;
	                            }
	                        }

	                        var addToCloudDrive = function addToCloudDrive() {
	                            M.injectNodes(v, M.RootID, false, function (res) {
	                                if (res === 0) {
	                                    msgDialog('info', __(l[8005]), __(l[8006]));
	                                }
	                            });
	                        };

	                        var startPreview = function startPreview(e) {
	                            assert(M.chat, 'Not in chat.');
	                            M.v = chatRoom.images.values();
	                            slideshow(v.h);
	                            if (e) {
	                                e.preventDefault();
	                                e.stopPropagation();
	                            }
	                        };

	                        var icon = fileIcon(v);

	                        var dropdown = null;
	                        var previewButtons = null;

	                        if (!attachmentMetaInfo.revoked) {
	                            if (v.fa && (icon === "graphic" || icon === "image")) {
	                                var imagesListKey = message.messageId + "_" + v.h;
	                                if (!chatRoom.images.exists(imagesListKey)) {
	                                    v.id = imagesListKey;
	                                    v.delay = message.delay;
	                                    chatRoom.images.push(v);
	                                }
	                                previewButtons = React.makeElement(
	                                    'span',
	                                    null,
	                                    React.makeElement(DropdownsUI.DropdownItem, { icon: 'search-icon', label: __(l[1899]),
	                                        onClick: startPreview }),
	                                    React.makeElement('hr', null)
	                                );
	                            }
	                            if (contact.u === u_handle) {
	                                dropdown = React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: 'default-white-button tiny-button',
	                                        icon: 'tiny-icon grey-down-arrow' },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            className: 'white-context-menu attachments-dropdown',
	                                            noArrow: true,
	                                            positionMy: 'left bottom',
	                                            positionAt: 'right bottom',
	                                            horizOffset: 4
	                                        },
	                                        previewButtons,
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: 'rounded-grey-down-arrow', label: __(l[1187]),
	                                            onClick: startDownload }),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: 'grey-cloud', label: __(l[8005]),
	                                            onClick: addToCloudDrive }),
	                                        React.makeElement('hr', null),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: 'red-cross', label: __(l[8909]), className: 'red',
	                                            onClick: function onClick() {
	                                                chatRoom.revokeAttachment(v);
	                                            } })
	                                    )
	                                );
	                            } else {
	                                dropdown = React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: 'default-white-button tiny-button',
	                                        icon: 'tiny-icon grey-down-arrow' },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            className: 'attachments-dropdown'
	                                        },
	                                        previewButtons,
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: 'rounded-grey-down-arrow', label: __(l[1187]),
	                                            onClick: startDownload }),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: 'grey-cloud', label: __(l[8005]),
	                                            onClick: addToCloudDrive })
	                                    )
	                                );
	                            }
	                        } else {

	                            return;
	                        }

	                        var attachmentClasses = "message shared-data";
	                        var preview = React.makeElement(
	                            'div',
	                            { className: 'data-block-view medium' },
	                            dropdown,
	                            React.makeElement(
	                                'div',
	                                { className: 'data-block-bg' },
	                                React.makeElement('div', { className: "block-view-file-type " + icon })
	                            )
	                        );

	                        if (M.chat && !message.revoked) {
	                            if (v.fa && (icon === "graphic" || icon === "image")) {
	                                var src = thumbnails[v.h];
	                                if (!src) {
	                                    src = M.getNodeByHandle(v.h);

	                                    if (!src || src !== v) {
	                                        M.v.push(v);
	                                        if (!v.seen) {
	                                            v.seen = 1;
	                                        }
	                                        delay('thumbnails', fm_thumbnails, 90);
	                                    }
	                                    src = window.noThumbURI || '';

	                                    v.imgId = "thumb" + message.messageId + "_" + attachmentKey + "_" + v.h;
	                                }

	                                preview = src ? React.makeElement(
	                                    'div',
	                                    { id: v.imgId, className: 'shared-link img-block' },
	                                    React.makeElement('div', { className: 'img-overlay', onClick: startPreview }),
	                                    React.makeElement(
	                                        'div',
	                                        { className: 'button overlay-button', onClick: startPreview },
	                                        React.makeElement('i', { className: 'huge-white-icon loupe' })
	                                    ),
	                                    dropdown,
	                                    React.makeElement('img', { alt: '', className: "thumbnail-placeholder " + v.h, src: src,
	                                        width: '120',
	                                        height: '120',
	                                        onClick: startPreview
	                                    })
	                                ) : preview;
	                            }
	                        }

	                        files.push(React.makeElement(
	                            'div',
	                            { className: attachmentClasses, key: v.h },
	                            React.makeElement(
	                                'div',
	                                { className: 'message shared-info' },
	                                React.makeElement(
	                                    'div',
	                                    { className: 'message data-title' },
	                                    v.name
	                                ),
	                                React.makeElement(
	                                    'div',
	                                    { className: 'message file-size' },
	                                    bytesToSize(v.s)
	                                )
	                            ),
	                            preview,
	                            React.makeElement('div', { className: 'clear' })
	                        ));
	                    });

	                    var avatar = null;
	                    var datetime = null;
	                    var name = null;
	                    if (this.props.grouped) {
	                        additionalClasses += " grouped";
	                    } else {
	                        avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message small-rounded-avatar' });
	                        datetime = React.makeElement(
	                            'div',
	                            { className: 'message date-time',
	                                title: time2date(timestampInt) },
	                            timestamp
	                        );
	                        name = React.makeElement(
	                            'div',
	                            { className: 'message user-card-name' },
	                            displayName
	                        );
	                    }

	                    return React.makeElement(
	                        'div',
	                        { className: message.messageId + " message body" + additionalClasses },
	                        avatar,
	                        React.makeElement(
	                            'div',
	                            { className: 'message content-area' },
	                            name,
	                            datetime,
	                            React.makeElement(
	                                'div',
	                                { className: 'message shared-block' },
	                                files
	                            ),
	                            buttonsBlock,
	                            spinnerElement
	                        )
	                    );
	                } else if (textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
	                    textContents = textContents.substr(2, textContents.length);

	                    try {
	                        var attachmentMeta = JSON.parse(textContents);
	                    } catch (e) {
	                        return null;
	                    }

	                    var contacts = [];

	                    attachmentMeta.forEach(function (v) {
	                        var contact = M.u && M.u[v.u] ? M.u[v.u] : v;
	                        var contactEmail = contact.email ? contact.email : contact.m;
	                        if (!contactEmail) {
	                            contactEmail = v.email ? v.email : v.m;
	                        }

	                        var deleteButtonOptional = null;

	                        if (message.userId === u_handle) {
	                            deleteButtonOptional = React.makeElement(DropdownsUI.DropdownItem, {
	                                icon: 'red-cross',
	                                label: __(l[1730]),
	                                className: 'red',
	                                onClick: function onClick(e) {
	                                    self.doDelete(e, message);
	                                }
	                            });
	                        }
	                        var dropdown = null;
	                        if (!M.u[contact.u]) {
	                            M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, true, {
	                                'u': contact.u,
	                                'name': contact.name,
	                                'm': contact.email ? contact.email : contactEmail,
	                                'c': 0
	                            }));
	                        } else if (M.u[contact.u] && !M.u[contact.u].m) {

	                            M.u[contact.u].m = contact.email ? contact.email : contactEmail;
	                        }

	                        if (M.u[contact.u] && M.u[contact.u].c === 1) {

	                            dropdown = React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: 'default-white-button tiny-button',
	                                    icon: 'tiny-icon grey-down-arrow' },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: 'white-context-menu shared-contact-dropdown',
	                                        noArrow: true,
	                                        positionMy: 'left bottom',
	                                        positionAt: 'right bottom',
	                                        horizOffset: 4
	                                    },
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: 'human-profile',
	                                        label: __(l[5868]),
	                                        onClick: function onClick() {
	                                            loadSubPage("fm/" + contact.u);
	                                        }
	                                    }),
	                                    React.makeElement('hr', null),
	                                    null,
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: 'conversations',
	                                        label: __(l[8632]),
	                                        onClick: function onClick() {
	                                            loadSubPage("fm/chat/" + contact.u);
	                                        }
	                                    }),
	                                    deleteButtonOptional ? React.makeElement('hr', null) : null,
	                                    deleteButtonOptional
	                                )
	                            );
	                        } else if (M.u[contact.u] && M.u[contact.u].c === 0) {
	                            dropdown = React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: 'default-white-button tiny-button',
	                                    icon: 'tiny-icon grey-down-arrow' },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: 'white-context-menu shared-contact-dropdown',
	                                        noArrow: true,
	                                        positionMy: 'left bottom',
	                                        positionAt: 'right bottom',
	                                        horizOffset: 4
	                                    },
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: 'rounded-grey-plus',
	                                        label: __(l[71]),
	                                        onClick: function onClick() {
	                                            var exists = false;
	                                            Object.keys(M.opc).forEach(function (k) {
	                                                if (!exists && M.opc[k].m === contactEmail) {
	                                                    exists = true;
	                                                    return false;
	                                                }
	                                            });

	                                            if (exists) {
	                                                closeDialog();
	                                                msgDialog('warningb', '', l[7413]);
	                                            } else {
	                                                M.inviteContact(M.u[u_handle].m, contactEmail);

	                                                var title = l[150];

	                                                var msg = l[5898].replace('[X]', contactEmail);

	                                                closeDialog();
	                                                msgDialog('info', title, msg);
	                                            }
	                                        }
	                                    }),
	                                    deleteButtonOptional ? React.makeElement('hr', null) : null,
	                                    deleteButtonOptional
	                                )
	                            );
	                        }

	                        contacts.push(React.makeElement(
	                            'div',
	                            { key: contact.u },
	                            React.makeElement(
	                                'div',
	                                { className: 'message shared-info' },
	                                React.makeElement(
	                                    'div',
	                                    { className: 'message data-title' },
	                                    M.getNameByHandle(contact.u)
	                                ),
	                                M.u[contact.u] ? React.makeElement(ContactsUI.ContactVerified, { className: 'big', contact: contact }) : null,
	                                React.makeElement(
	                                    'div',
	                                    { className: 'user-card-email' },
	                                    contactEmail
	                                )
	                            ),
	                            React.makeElement(
	                                'div',
	                                { className: 'message shared-data' },
	                                React.makeElement(
	                                    'div',
	                                    { className: 'data-block-view medium' },
	                                    M.u[contact.u] ? React.makeElement(ContactsUI.ContactPresence, { className: 'big', contact: contact }) : null,
	                                    dropdown,
	                                    React.makeElement(
	                                        'div',
	                                        { className: 'data-block-bg' },
	                                        React.makeElement(ContactsUI.Avatar, { className: 'medium-avatar share', contact: contact })
	                                    )
	                                ),
	                                React.makeElement('div', { className: 'clear' })
	                            )
	                        ));
	                    });

	                    var avatar = null;
	                    var datetime = null;
	                    var name = null;
	                    if (this.props.grouped) {
	                        additionalClasses += " grouped";
	                    } else {
	                        avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message small-rounded-avatar' });
	                        datetime = React.makeElement(
	                            'div',
	                            { className: 'message date-time',
	                                title: time2date(timestampInt) },
	                            timestamp
	                        );
	                        name = React.makeElement(
	                            'div',
	                            { className: 'message user-card-name' },
	                            displayName
	                        );
	                    }

	                    return React.makeElement(
	                        'div',
	                        { className: message.messageId + " message body" + additionalClasses },
	                        avatar,
	                        React.makeElement(
	                            'div',
	                            { className: 'message content-area' },
	                            name,
	                            datetime,
	                            React.makeElement(
	                                'div',
	                                { className: 'message shared-block' },
	                                contacts
	                            ),
	                            buttonsBlock,
	                            spinnerElement
	                        )
	                    );
	                } else if (textContents.substr && textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {

	                    return null;
	                } else {
	                    chatRoom.logger.warn("Invalid 2nd byte for a management message: ", textContents);
	                    return null;
	                }
	            } else {

	                if (message instanceof KarereEventObjects.OutgoingMessage) {
	                    if (message.contents === "") {
	                        message.deleted = true;
	                    }
	                } else if (message.textContents === "") {
	                    message.deleted = true;
	                }
	                var messageActionButtons = null;
	                if (message.getState() === Message.STATE.NOT_SENT) {
	                    messageActionButtons = null;

	                    if (!spinnerElement) {
	                        if (!message.requiresManualRetry) {
	                            messageNotSendIndicator = React.makeElement(
	                                'div',
	                                { className: 'not-sent-indicator tooltip-trigger',
	                                    'data-tooltip': 'not-sent-notification' },
	                                React.makeElement('i', { className: 'small-icon yellow-triangle' })
	                            );
	                        } else {
	                            if (self.state.editing !== true) {
	                                messageNotSendIndicator = React.makeElement(
	                                    'div',
	                                    { className: 'not-sent-indicator' },
	                                    React.makeElement(
	                                        'span',
	                                        { className: 'tooltip-trigger',
	                                            key: 'retry',
	                                            'data-tooltip': 'not-sent-notification-manual',
	                                            onClick: function onClick(e) {
	                                                self.doRetry(e, message);
	                                            } },
	                                        React.makeElement('i', { className: 'small-icon refresh-circle' })
	                                    ),
	                                    React.makeElement(
	                                        'span',
	                                        { className: 'tooltip-trigger',
	                                            key: 'cancel',
	                                            'data-tooltip': 'not-sent-notification-cancel',
	                                            onClick: function onClick(e) {
	                                                self.doCancelRetry(e, message);
	                                            } },
	                                        React.makeElement('i', { className: 'small-icon red-cross' })
	                                    )
	                                );
	                            }
	                        }
	                    }
	                }

	                var avatar = null;
	                var datetime = null;
	                var name = null;
	                if (this.props.grouped) {
	                    additionalClasses += " grouped";
	                } else {
	                    avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message small-rounded-avatar' });
	                    datetime = React.makeElement(
	                        'div',
	                        { className: 'message date-time',
	                            title: time2date(timestampInt) },
	                        timestamp
	                    );
	                    name = React.makeElement(
	                        'div',
	                        { className: 'message user-card-name' },
	                        displayName
	                    );
	                }

	                var messageDisplayBlock;
	                if (self.state.editing === true) {
	                    var msgContents = message.textContents ? message.textContents : message.contents;
	                    msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);

	                    messageDisplayBlock = React.makeElement(TypingAreaUI.TypingArea, {
	                        iconClass: 'small-icon writing-pen textarea-icon',
	                        initialText: msgContents,
	                        chatRoom: self.props.message.chatRoom,
	                        showButtons: true,
	                        className: 'edit-typing-area',
	                        onUpdate: function onUpdate() {
	                            if (self.props.onUpdate) {
	                                self.props.onUpdate();
	                            }
	                        },
	                        onConfirm: function onConfirm(messageContents) {
	                            self.setState({ 'editing': false });

	                            if (self.props.onEditDone) {
	                                Soon(function () {
	                                    var tmpMessageObj = {
	                                        'contents': messageContents
	                                    };
	                                    megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
	                                    self.props.onEditDone(tmpMessageObj.contents);
	                                    self.forceUpdate();
	                                });
	                            }

	                            return true;
	                        }
	                    });
	                } else if (message.deleted) {
	                    messageDisplayBlock = React.makeElement(
	                        'div',
	                        { className: 'message text-block' },
	                        React.makeElement(
	                            'em',
	                            null,
	                            __(l[8886])
	                        )
	                    );
	                } else {
	                    if (message.updated > 0) {
	                        textMessage = textMessage + " <em>" + __(l[8887]) + "</em>";
	                    }
	                    if (self.props.initTextScrolling) {
	                        messageDisplayBlock = React.makeElement(
	                            utils.JScrollPane,
	                            { className: 'message text-block scroll' },
	                            React.makeElement('div', { className: 'message text-scroll', dangerouslySetInnerHTML: { __html: textMessage } })
	                        );
	                    } else {
	                        messageDisplayBlock = React.makeElement('div', { className: 'message text-block', dangerouslySetInnerHTML: { __html: textMessage } });
	                    }
	                }
	                if (!message.deleted) {
	                    if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && self.state.editing !== true && chatRoom.isReadOnly() === false && !message.requiresManualRetry) {
	                        messageActionButtons = React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: 'default-white-button tiny-button',
	                                icon: 'tiny-icon grey-down-arrow' },
	                            React.makeElement(
	                                DropdownsUI.Dropdown,
	                                {
	                                    className: 'white-context-menu attachments-dropdown',
	                                    noArrow: true,
	                                    positionMy: 'left bottom',
	                                    positionAt: 'right bottom',
	                                    horizOffset: 4
	                                },
	                                React.makeElement(DropdownsUI.DropdownItem, {
	                                    icon: 'writing-pen',
	                                    label: __(l[1342]),
	                                    className: '',
	                                    onClick: function onClick(e) {
	                                        e.stopPropagation();
	                                        e.preventDefault();

	                                        self.setState({ 'editing': true });
	                                    }
	                                }),
	                                React.makeElement('hr', null),
	                                React.makeElement(DropdownsUI.DropdownItem, {
	                                    icon: 'red-cross',
	                                    label: __(l[1730]),
	                                    className: 'red',
	                                    onClick: function onClick(e) {
	                                        self.doDelete(e, message);
	                                    }
	                                })
	                            )
	                        );
	                    }
	                }

	                return React.makeElement(
	                    'div',
	                    { className: message.messageId + " message body " + additionalClasses },
	                    avatar,
	                    React.makeElement(
	                        'div',
	                        { className: 'message content-area' },
	                        name,
	                        datetime,
	                        self.props.hideActionButtons ? null : messageActionButtons,
	                        messageNotSendIndicator,
	                        messageDisplayBlock,
	                        buttonsBlock,
	                        spinnerElement
	                    )
	                );
	            }
	        } else if (message.type) {
	            textMessage = getMessageString(message.type);
	            if (!textMessage) {
	                console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
	                debugger;
	                throw new Error("boom");
	            }

	            if (textMessage.splice) {
	                var tmpMsg = textMessage[0].replace("[X]", htmlentities(M.getNameByHandle(contact.u)));

	                if (message.currentCallCounter) {
	                    tmpMsg += " " + textMessage[1].replace("[X]", "[[ " + secToDuration(message.currentCallCounter)) + "]] ";
	                }
	                textMessage = tmpMsg;
	                textMessage = textMessage.replace("[[ ", "<span className=\"grey-color\">").replace("]]", "</span>");
	            } else {
	                textMessage = textMessage.replace("[X]", htmlentities(M.getNameByHandle(contact.u)));
	            }

	            message.textContents = textMessage;

	            if (message.type === "call-rejected") {
	                message.cssClass = "crossed-handset red";
	            } else if (message.type === "call-missed") {
	                message.cssClass = "horizontal-handset yellow";
	            } else if (message.type === "call-handled-elsewhere") {
	                message.cssClass = "handset-with-arrow green";
	            } else if (message.type === "call-failed") {
	                message.cssClass = "horizontal-handset red";
	            } else if (message.type === "call-timeout") {
	                message.cssClass = "horizontal-handset yellow";
	            } else if (message.type === "call-failed-media") {
	                message.cssClass = "diagonal-handset yellow";
	            } else if (message.type === "call-canceled") {
	                message.cssClass = "horizontal-handset grey";
	            } else if (message.type === "call-ended") {
	                message.cssClass = "horizontal-handset grey";
	            } else if (message.type === "call-feedback") {
	                message.cssClass = "diagonal-handset grey";
	            } else if (message.type === "call-starting") {
	                message.cssClass = "diagonal-handset blue";
	            } else if (message.type === "call-initialising") {
	                message.cssClass = "diagonal-handset blue";
	            } else if (message.type === "call-started") {
	                message.cssClass = "diagonal-handset green";
	            } else if (message.type === "incoming-call") {
	                message.cssClass = "diagonal-handset green";
	            } else if (message.type === "outgoing-call") {
	                message.cssClass = "diagonal-handset blue";
	            } else {
	                message.cssClass = message.type;
	            }

	            var buttons = [];
	            if (message.buttons) {
	                Object.keys(message.buttons).forEach(function (k) {
	                    var button = message.buttons[k];
	                    var classes = button.classes;
	                    var icon;
	                    if (button.icon) {
	                        icon = React.makeElement('i', { className: "small-icon " + button.icon });
	                    }
	                    buttons.push(React.makeElement(
	                        'div',
	                        { className: classes, key: k, onClick: function onClick(e) {
	                                button.callback.call(e.target);
	                            } },
	                        icon,
	                        button.text
	                    ));
	                });
	            }

	            var buttonsCode;
	            if (buttons.length > 0) {
	                buttonsCode = React.makeElement(
	                    'div',
	                    { className: 'buttons-block' },
	                    buttons,
	                    React.makeElement('div', { className: 'clear' })
	                );
	            }

	            return React.makeElement(
	                'div',
	                { className: message.messageId + " message body" + additionalClasses,
	                    'data-id': "id" + message.messageId },
	                React.makeElement(
	                    'div',
	                    { className: 'feedback round-icon-block' },
	                    React.makeElement('i', { className: "round-icon " + message.cssClass })
	                ),
	                React.makeElement(
	                    'div',
	                    { className: 'message content-area' },
	                    React.makeElement(
	                        'div',
	                        { className: 'message date-time' },
	                        timestamp
	                    ),
	                    React.makeElement('div', { className: 'message text-block', dangerouslySetInnerHTML: { __html: textMessage } }),
	                    buttonsCode
	                )
	            );
	        }
	    }
	});

	module.exports = {
	    GenericConversationMessage: GenericConversationMessage
	};

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);

	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var ConversationMessageMixin = {
	    mixins: [MegaRenderMixin],
	    onAfterRenderWasTriggered: false,
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.message.chatRoom;
	        var megaChat = chatRoom.megaChat;
	        var contact = self.getContact();
	        if (contact && contact.addChangeListener) {
	            self._contactChangeListener = contact.addChangeListener(function () {
	                self.debouncedForceUpdate();
	            });
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var contact = self.getContact();

	        if (self._contactChangeListener && contact && contact.removeChangeListener) {
	            contact.removeChangeListener(self._contactChangeListener);
	        }
	    },
	    getContact: function getContact() {
	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;

	        var contact;
	        if (message.authorContact) {
	            contact = message.authorContact;
	        } else if (message.meta && message.meta.userId) {
	            contact = M.u[message.meta.userId];
	            if (!contact) {
	                return {
	                    'u': message.meta.userId,
	                    'h': message.meta.userId,
	                    'c': 0
	                };
	            }
	        } else if (message.userId) {
	            if (!M.u[message.userId]) {

	                return null;
	            }
	            contact = M.u[message.userId];
	        } else if (message.getFromJid) {
	            contact = megaChat.getContactFromJid(message.getFromJid());
	        } else {
	            console.error("No idea how to render this: ", this.props);

	            return {};
	        }

	        return contact;
	    },
	    getTimestampAsString: function getTimestampAsString() {
	        return unixtimeToTimeString(this.getTimestamp());
	    },
	    getTimestamp: function getTimestamp() {
	        var message = this.props.message;
	        var timestampInt;
	        if (message.getDelay) {
	            timestampInt = message.getDelay();
	        } else if (message.delay) {
	            timestampInt = message.delay;
	        } else {
	            timestampInt = unixtime();
	        }

	        return timestampInt;
	    },
	    getParentJsp: function getParentJsp() {
	        var $node = $(this.findDOMNode());
	        var $jsp = $node.closest('.jScrollPaneContainer').data('jsp');
	        return $jsp;
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var chatRoom = self.props.message.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        if (!self.onAfterRenderWasTriggered) {
	            var msg = self.props.message;
	            var shouldRender = true;
	            if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
	                shouldRender = false;
	            }

	            if (shouldRender) {
	                chatRoom.trigger("onAfterRenderMessage", self.props.message);
	                self.onAfterRenderWasTriggered = true;
	            }
	        }
	    }
	};

	module.exports = {
	    ConversationMessageMixin: ConversationMessageMixin
	};

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(10);
	var ConversationMessageMixin = __webpack_require__(21).ConversationMessageMixin;
	var getMessageString = __webpack_require__(18).getMessageString;

	var AlterParticipantsConversationMessage = React.createClass({
	    displayName: "AlterParticipantsConversationMessage",

	    mixins: [ConversationMessageMixin],

	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var datetime = React.makeElement(
	            "div",
	            { className: "message date-time",
	                title: time2date(timestampInt) },
	            timestamp
	        );

	        var displayName;
	        if (contact) {
	            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var messages = [];

	        message.meta.included.forEach(function (h) {
	            var otherContact = M.u[h] ? M.u[h] : {
	                'u': h,
	                'h': h,
	                'c': 0
	            };

	            var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact, className: "message small-rounded-avatar" });
	            var otherDisplayName = otherContact.u === u_handle ? __(l[8885]) : generateAvatarMeta(otherContact.u).fullName;

	            var text = __(l[8907]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

	            messages.push(React.makeElement(
	                "div",
	                { className: "message body", "data-id": "id" + message.messageId, key: h },
	                avatar,
	                React.makeElement(
	                    "div",
	                    { className: "message content-area small-info-txt" },
	                    React.makeElement(
	                        "div",
	                        { className: "message user-card-name" },
	                        otherDisplayName
	                    ),
	                    datetime,
	                    React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: text } })
	                )
	            ));
	        });

	        message.meta.excluded.forEach(function (h) {
	            var otherContact = M.u[h] ? M.u[h] : {
	                'u': h,
	                'h': h,
	                'c': 0
	            };

	            var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact, className: "message small-rounded-avatar" });
	            var otherDisplayName = otherContact.u === u_handle ? __(l[8885]) : generateAvatarMeta(otherContact.u).fullName;

	            var text;
	            if (otherContact.u === contact.u) {
	                text = __(l[8908]);
	            } else {
	                text = __(l[8906]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');
	            }

	            messages.push(React.makeElement(
	                "div",
	                { className: "message body", "data-id": "id" + message.messageId, key: h },
	                avatar,
	                React.makeElement(
	                    "div",
	                    { className: "message content-area small-info-txt" },
	                    React.makeElement(
	                        "div",
	                        { className: "message user-card-name" },
	                        otherDisplayName
	                    ),
	                    datetime,
	                    React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: text } })
	                )
	            ));
	        });

	        return React.makeElement(
	            "div",
	            null,
	            messages
	        );
	    }
	});

	module.exports = {
	    AlterParticipantsConversationMessage: AlterParticipantsConversationMessage
	};

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(10);
	var ConversationMessageMixin = __webpack_require__(21).ConversationMessageMixin;
	var getMessageString = __webpack_require__(18).getMessageString;

	var TruncatedMessage = React.createClass({
	    displayName: "TruncatedMessage",

	    mixins: [ConversationMessageMixin],

	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var datetime = React.makeElement(
	            "div",
	            { className: "message date-time",
	                title: time2date(timestampInt) },
	            timestamp
	        );

	        var displayName;
	        if (contact) {
	            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var avatar = null;
	        if (this.props.grouped) {
	            cssClasses += " grouped";
	        } else {
	            avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: "message small-rounded-avatar" });
	            datetime = React.makeElement(
	                "div",
	                { className: "message date-time",
	                    title: time2date(timestampInt) },
	                timestamp
	            );
	            name = React.makeElement(
	                "div",
	                { className: "message user-card-name" },
	                displayName
	            );
	        }

	        return React.makeElement(
	            "div",
	            { className: cssClasses, "data-id": "id" + message.messageId, key: message.messageId },
	            avatar,
	            React.makeElement(
	                "div",
	                { className: "message content-area small-info-txt" },
	                React.makeElement(
	                    "div",
	                    { className: "message user-card-name" },
	                    displayName
	                ),
	                datetime,
	                React.makeElement(
	                    "div",
	                    { className: "message text-block" },
	                    __(l[8905])
	                )
	            )
	        );
	    }
	});

	module.exports = {
	    TruncatedMessage: TruncatedMessage
	};

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(10);
	var ConversationMessageMixin = __webpack_require__(21).ConversationMessageMixin;
	var getMessageString = __webpack_require__(18).getMessageString;

	var PrivilegeChange = React.createClass({
	    displayName: "PrivilegeChange",

	    mixins: [ConversationMessageMixin],

	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var datetime = React.makeElement(
	            "div",
	            { className: "message date-time",
	                title: time2date(timestampInt) },
	            timestamp
	        );

	        var displayName;
	        if (contact) {
	            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var messages = [];

	        var otherContact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
	            'u': message.meta.targetUserId,
	            'h': message.meta.targetUserId,
	            'c': 0
	        };

	        var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact, className: "message small-rounded-avatar" });
	        var otherDisplayName = otherContact.u === u_handle ? __(l[8885]) : generateAvatarMeta(otherContact.u).fullName;

	        var newPrivilegeText = "";
	        if (message.meta.privilege === 3) {
	            newPrivilegeText = l[8875];
	        } else if (message.meta.privilege === 2) {
	            newPrivilegeText = l[8874];
	        } else if (message.meta.privilege === 0) {
	            newPrivilegeText = l[8873];
	        }

	        var text = __(l[8915]).replace("%s1", '<strong className="dark-grey-txt">' + htmlentities(newPrivilegeText) + '</strong>').replace("%s2", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

	        messages.push(React.makeElement(
	            "div",
	            { className: "message body", "data-id": "id" + message.messageId, key: message.messageId },
	            avatar,
	            React.makeElement(
	                "div",
	                { className: "message content-area small-info-txt" },
	                React.makeElement(
	                    "div",
	                    { className: "message user-card-name" },
	                    otherDisplayName
	                ),
	                datetime,
	                React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: text } })
	            )
	        ));

	        return React.makeElement(
	            "div",
	            null,
	            messages
	        );
	    }
	});

	module.exports = {
	    PrivilegeChange: PrivilegeChange
	};

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(10);
	var ConversationMessageMixin = __webpack_require__(21).ConversationMessageMixin;
	var getMessageString = __webpack_require__(18).getMessageString;

	var TopicChange = React.createClass({
	    displayName: "TopicChange",

	    mixins: [ConversationMessageMixin],

	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var datetime = React.makeElement(
	            "div",
	            { className: "message date-time",
	                title: time2date(timestampInt) },
	            timestamp
	        );

	        var displayName;
	        if (contact) {
	            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var messages = [];

	        var avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: "message small-rounded-avatar" });

	        var topic = message.meta.topic;

	        var text = __(l[9081]).replace("%s", '<strong className="dark-grey-txt">"' + htmlentities(topic) + '"</strong>');

	        messages.push(React.makeElement(
	            "div",
	            { className: "message body", "data-id": "id" + message.messageId, key: message.messageId },
	            avatar,
	            React.makeElement(
	                "div",
	                { className: "message content-area small-info-txt" },
	                React.makeElement(
	                    "div",
	                    { className: "message user-card-name" },
	                    displayName
	                ),
	                datetime,
	                React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: text } })
	            )
	        ));

	        return React.makeElement(
	            "div",
	            null,
	            messages
	        );
	    }
	});

	module.exports = {
	    TopicChange: TopicChange
	};

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var utils = __webpack_require__(27);
	var React = __webpack_require__(2);
	var ConversationPanelUI = __webpack_require__(11);

	var ChatRoom = function ChatRoom(megaChat, roomJid, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl) {
	    var self = this;

	    this.logger = MegaLogger.getLogger("room[" + roomJid + "]", {}, megaChat.logger);

	    this.megaChat = megaChat;

	    MegaDataObject.attachToExistingJSObject(this, {
	        state: null,
	        users: [],
	        attachments: null,
	        roomJid: null,
	        type: null,
	        messages: [],
	        ctime: 0,
	        lastActivity: 0,
	        callRequest: null,
	        callIsActive: false,
	        isCurrentlyActive: false,
	        _messagesQueue: [],
	        unreadCount: 0,
	        chatId: undefined,
	        chatdUrl: undefined,
	        chatShard: undefined,
	        members: {},
	        membersLoaded: false,
	        topic: ""
	    }, true);

	    this.users = users ? users : [];
	    this.roomJid = roomJid;
	    this.type = type;
	    this.ctime = ctime;
	    this.lastActivity = lastActivity ? lastActivity : 0;
	    this.chatId = chatId;
	    this.chatShard = chatShard;
	    this.chatdUrl = chatdUrl;

	    this.callRequest = null;
	    this.callIsActive = false;
	    this.shownMessages = {};
	    this.attachments = new MegaDataMap(this);
	    this.images = new MegaDataSortedMap("id", "delay", this);

	    this.options = {

	        'dontResendAutomaticallyQueuedMessagesOlderThen': 1 * 60,

	        'pluginsReadyTimeout': 60000,

	        'mediaOptions': {
	            audio: true,
	            video: true
	        }
	    };

	    this.setState(ChatRoom.STATE.INITIALIZED);

	    this.isCurrentlyActive = false;

	    this.bind('onStateChange', function (e, oldState, newState) {
	        self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));

	        if (newState === ChatRoom.STATE.JOINING) {} else if (newState === ChatRoom.STATE.READY) {}
	    });

	    self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
	        var ts = msg.delay ? msg.delay : msg.ts;
	        if (!ts) {
	            return;
	        }

	        if (self.lastActivity && self.lastActivity >= ts) {

	            return;
	        }

	        self.lastActivity = ts;

	        if (self.type === "private") {
	            var targetUserJid = self.getParticipantsExceptMe()[0];
	            var targetUserNode = self.megaChat.getContactFromJid(targetUserJid);
	            assert(M.u, 'M.u does not exists');

	            assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
	            assert(M.u[targetUserNode.u], 'User not found in M.u');

	            if (targetUserNode) {
	                setLastInteractionWith(targetUserNode.u, "1:" + self.lastActivity);
	            }
	        } else if (self.type === "group") {
	            var contactHash;
	            if (msg.authorContact) {
	                contactHash = msg.authorContact.h;
	            } else if (msg.userId) {
	                contactHash = msg.userId;
	            } else if (msg.getFromJid) {
	                contactHash = megaChat.getContactHashFromJid(msg.getFromJid());
	            }

	            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');
	        } else {
	            throw new Error("Not implemented");
	        }
	    });

	    var membersSnapshot = {};
	    self.rebind('onMembersUpdated.chatRoomMembersSync', function () {
	        var roomRequiresUpdate = false;

	        Object.keys(membersSnapshot).forEach(function (u_h) {
	            var contact = M.u[u_h];
	            if (contact) {
	                contact.removeChangeListener(membersSnapshot[u_h]);
	                if (!self.members[u_h]) {
	                    roomRequiresUpdate = true;
	                }
	            }
	            delete membersSnapshot[u_h];
	        });

	        Object.keys(self.members).forEach(function (u_h) {
	            var contact = M.u[u_h];
	            if (contact) {
	                membersSnapshot[u_h] = contact.addChangeListener(function () {
	                    self.trackDataChange();
	                });
	            }
	        });
	        if (roomRequiresUpdate) {
	            self.trackDataChange();
	        }
	    });

	    self.getParticipantsExceptMe().forEach(function (jid) {
	        var contact = self.megaChat.getContactFromJid(jid);
	        if (contact) {
	            getLastInteractionWith(contact.u);
	        }
	    });
	    self.megaChat.trigger('onRoomCreated', [self]);

	    $(window).rebind("focus." + self.roomJid, function () {
	        if (self.isCurrentlyActive) {
	            self.trigger("onChatShown");
	        }
	    });

	    self.megaChat.rebind("onRoomDestroy." + self.roomJid, function (e, room) {
	        if (room.roomJid == self.roomJid) {
	            $(window).unbind("focus." + self.roomJid);
	        }
	    });

	    return this;
	};

	makeObservable(ChatRoom);

	ChatRoom.STATE = {
	    'INITIALIZED': 5,
	    'JOINING': 10,
	    'JOINED': 20,

	    'READY': 150,

	    'ENDED': 190,

	    'LEAVING': 200,

	    'LEFT': 250
	};

	ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function (timeout) {
	    var self = this;

	    var $promise = new MegaPromise();

	    var anonId = "";

	    if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
	        anonId = self.megaChat.rtc.ownAnonId;
	    }
	    $.ajax("https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId, {
	        method: "GET",
	        timeout: timeout ? timeout : 10000
	    }).done(function (r) {
	        if (r.turn && r.turn.length > 0) {
	            var servers = [];
	            r.turn.forEach(function (v) {
	                var transport = v.transport;
	                if (!transport) {
	                    transport = "udp";
	                }

	                servers.push({
	                    urls: ['turn:' + v.host + ':' + v.port + '?transport=' + transport],
	                    username: "inoo20jdnH",
	                    credential: '02nNKDBkkS'
	                });
	            });
	            self.megaChat.rtc.updateIceServers(servers);

	            $promise.resolve();
	        } else {
	            $promise.resolve();
	        }
	    }).fail(function () {
	        $promise.reject();
	    });

	    return $promise;
	};

	ChatRoom.prototype._resetCallStateNoCall = function () {};

	ChatRoom.prototype._resetCallStateInCall = function () {};

	ChatRoom.stateToText = function (state) {
	    var txt = null;
	    $.each(ChatRoom.STATE, function (k, v) {
	        if (state === v) {
	            txt = k;

	            return false;
	        }
	    });

	    return txt;
	};

	ChatRoom.prototype.setState = function (newState, isRecover) {
	    var self = this;

	    assert(newState, 'Missing state');

	    if (newState === self.state) {
	        self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
	        return;
	    }

	    if (self.state) {

	        assert(newState === ChatRoom.STATE.JOINING && isRecover || newState === ChatRoom.STATE.INITIALIZED && isRecover || newState > self.state, 'Invalid state change. Current:' + ChatRoom.stateToText(self.state) + "to" + ChatRoom.stateToText(newState));
	    }

	    var oldState = self.state;
	    self.state = newState;

	    self.trigger('onStateChange', [oldState, newState]);
	};

	ChatRoom.prototype.getStateAsText = function () {
	    var self = this;
	    return ChatRoom.stateToText(self.state);
	};

	ChatRoom.prototype.setType = function (type) {
	    var self = this;

	    if (!type) {
	        if (window.d) {
	            debugger;
	        }
	        self.logger.error("missing type in .setType call");
	    }

	    self.type = type;
	};

	ChatRoom.prototype.setUsers = function (jids) {
	    this.users = clone(jids);
	};

	ChatRoom.prototype.syncUsers = function (jids) {
	    var self = this;

	    assert(jids, "Missing jids");

	    var users = clone(self.users);

	    $.each(jids, function (k, v) {
	        if (v) {
	            v = v.split("/")[0];
	            if (self.users.indexOf(v) === -1) {
	                users.push(v);
	            }
	        }
	    });

	    if (users.length > self.users.length) {
	        self.setUsers(users);
	    }
	};

	ChatRoom.prototype.participantExistsInRoom = function (jid, strict, notMe) {
	    var self = this;

	    strict = strict || false;

	    var result = false;
	    $.each(self.users, function (k, v) {
	        if (!v) {
	            self.logger.error("missing contact: ", k);

	            return;
	        }
	        if (notMe) {
	            if (Karere.getNormalizedBareJid(v) === self.megaChat.karere.getBareJid()) {
	                return;
	            }
	        }
	        if (strict && v === jid) {
	            result = true;
	            return false;
	        } else if (!strict && v.split("/")[0] === jid) {
	            result = true;
	            return false;
	        }
	    });

	    return result;
	};

	ChatRoom.prototype.getParticipants = function () {
	    var self = this;

	    var participants = {};

	    $.each(self.users, function (k, v) {
	        if (!v) {
	            self.logger.error("missing contact/user: ", k);

	            return;
	        }
	        participants[v.split("/")[0]] = true;
	    });

	    return Object.keys(participants);
	};

	ChatRoom.prototype.getUsers = function () {
	    var self = this;

	    return self.megaChat.karere.getUsersInChat(self.roomJid);
	};

	ChatRoom.prototype.getOrderedUsers = function () {
	    var self = this;

	    return self.megaChat.karere.getOrderedUsersInChat(self.roomJid);
	};

	ChatRoom.prototype.getRoomOwner = function () {
	    var self = this;

	    var users = self.megaChat.karere.getOrderedUsersInChat(self.roomJid);

	    return users[0];
	};

	ChatRoom.prototype.getParticipantsExceptMe = function (jids) {
	    var self = this;
	    if (!jids) {
	        jids = self.getParticipants();
	    }
	    var jidsWithoutMyself = clone(jids);
	    jidsWithoutMyself.splice($.inArray(self.megaChat.karere.getBareJid(), jidsWithoutMyself), 1);

	    return jidsWithoutMyself;
	};

	ChatRoom.prototype.getContactParticipantsExceptMe = function (jids) {
	    var self = this;
	    var participantJids = self.getParticipantsExceptMe(jids);

	    return participantJids.map(function (jid) {
	        var contactHash = megaJidToUserId(jid);
	        if (contactHash) {
	            return contactHash;
	        }
	    });
	};

	ChatRoom.prototype.getContactParticipants = function (jids) {
	    var self = this;
	    var participantJids = self.getParticipants(jids);

	    return participantJids.map(function (jid) {
	        var contactHash = megaJidToUserId(jid);
	        if (contactHash) {
	            return contactHash;
	        }
	    });
	};

	ChatRoom.prototype.getRoomTitle = function () {
	    var self = this;
	    if (this.type == "private") {
	        var participants = self.getParticipantsExceptMe();
	        return self.megaChat.getContactNameFromJid(participants[0]);
	    } else {
	        if (self.topic && self.topic.substr) {
	            return self.topic.substr(0, 30);
	        }

	        var participants = self.members && Object.keys(self.members).length > 0 ? Object.keys(self.members) : [];
	        var names = [];
	        participants.forEach(function (contactHash) {
	            if (contactHash && M.u[contactHash] && contactHash !== u_handle) {
	                names.push(M.u[contactHash] ? M.getNameByHandle(contactHash) : "non contact");
	            }
	        });
	        return names.length > 0 ? names.join(", ") : __(l[8888]);
	    }
	};

	ChatRoom.prototype.leave = function (triggerLeaveRequest) {
	    var self = this;

	    self._leaving = true;

	    self.members[u_handle] = 0;

	    if (triggerLeaveRequest) {
	        if (self.type == "group") {
	            $(self).trigger('onLeaveChatRequested');
	        } else {
	            self.logger.error("Can't leave room of type: " + self.type);
	            return;
	        }
	    }

	    if (self.roomJid.indexOf("@") != -1) {
	        if (self.state !== ChatRoom.STATE.LEFT) {
	            self.setState(ChatRoom.STATE.LEAVING);

	            return self.megaChat.karere.leaveChat(self.roomJid).done(function () {
	                self.setState(ChatRoom.STATE.LEFT);
	            });
	        } else {
	            return;
	        }
	    } else {
	        self.setState(ChatRoom.STATE.LEFT);
	    }

	    self.megaChat.refreshConversations();

	    self.trackDataChange();
	};

	ChatRoom.prototype.destroy = function (notifyOtherDevices, noRedirect) {
	    var self = this;

	    self.megaChat.trigger('onRoomDestroy', [self]);
	    var mc = self.megaChat;
	    var roomJid = self.roomJid;

	    if (!self.stateIsLeftOrLeaving()) {
	        self.leave(notifyOtherDevices);
	    }

	    Soon(function () {
	        if (self.isCurrentlyActive) {
	            self.isCurrentlyActive = false;
	        }

	        mc.chats.remove(roomJid);

	        if (!noRedirect) {
	            loadSubPage('fm/chat');
	        }
	    });
	};

	ChatRoom.prototype.show = function () {
	    var self = this;

	    if (self.isCurrentlyActive) {
	        return false;
	    }
	    self.megaChat.hideAllChats();

	    self.isCurrentlyActive = true;

	    $('.files-grid-view').addClass('hidden');
	    $('.fm-blocks-view').addClass('hidden');
	    $('.contacts-grid-view').addClass('hidden');
	    $('.fm-contacts-blocks-view').addClass('hidden');

	    $('.fm-right-files-block[data-reactid]').removeClass('hidden');
	    $('.fm-right-files-block:not([data-reactid])').addClass('hidden');

	    if (self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomJid) {
	        var oldRoom = self.megaChat.getCurrentRoom();
	        if (oldRoom) {
	            oldRoom.hide();
	        }
	    }

	    sectionUIopen('conversations');

	    self.megaChat.currentlyOpenedChat = self.roomJid;
	    self.megaChat.lastOpenedChat = self.roomJid;

	    self.trigger('activity');
	    self.trigger('onChatShown');
	};

	ChatRoom.prototype.isActive = function () {
	    return document.hasFocus() && this.isCurrentlyActive;
	};

	ChatRoom.prototype.setActive = function () {

	    var self = this;
	    Soon(function () {
	        loadSubPage(self.getRoomUrl());
	    });
	};

	ChatRoom.prototype.getRoomUrl = function () {
	    var self = this;
	    if (self.type === "private") {
	        var participants = self.getParticipantsExceptMe();
	        var contact = self.megaChat.getContactFromJid(participants[0]);
	        if (contact) {
	            return "fm/chat/" + contact.u;
	        }
	    } else if (self.type === "group") {
	        return "fm/chat/g/" + self.roomJid.split("@")[0];
	    } else {
	        throw new Error("Can't get room url for unknown room type.");
	    }
	};

	ChatRoom.prototype.activateWindow = function () {
	    var self = this;

	    loadSubPage(self.getRoomUrl());
	};

	ChatRoom.prototype.hide = function () {
	    var self = this;

	    self.isCurrentlyActive = false;

	    if (self.megaChat.currentlyOpenedChat === self.roomJid) {
	        self.megaChat.currentlyOpenedChat = null;
	    }
	};

	ChatRoom.prototype.appendMessage = function (message) {
	    var self = this;

	    if (message.deleted) {
	        return false;
	    }

	    if (message.getFromJid && message.getFromJid() === self.roomJid) {
	        return false;
	    }

	    if (message instanceof KarereEventObjects.OutgoingMessage) {
	        $(message).rebind('onChange.rerenderOnChangeHandler' + this.roomJid.split("@")[0], function (msg, property, oldVal, newVal) {
	            if (property === "textContents" || property === "contents") {
	                self.trackDataChange();
	            }
	        });
	    } else if (message.getFromJid && message instanceof KarereEventObjects.IncomingMessage && Karere.getNormalizedBareJid(message.getFromJid()) === self.megaChat.karere.getJid()) {

	        message = new KarereEventObjects.OutgoingMessage(message.toJid, message.fromJid, message.type, message.messageId, message.contents, message.meta, message.delay, message.meta && message.meta.state ? message.meta.state : message.state, message.roomJid);
	    }
	    if (self.shownMessages[message.messageId]) {

	        return false;
	    }
	    if (!message.orderValue) {

	        if (self.messages.length > 0) {
	            var prevMsg = self.messagesBuff.messages.getItem(self.messages.length - 1);
	            if (!prevMsg) {
	                self.logger.error('self.messages got out of sync...maybe there are some previous JS exceptions that caused that? ' + 'note that messages may be displayed OUT OF ORDER in the UI.');
	            } else {
	                message.orderValue = prevMsg.orderValue + 0.1;
	            }
	        }
	    }

	    self.trigger('onMessageAppended', message);
	    self.messagesBuff.messages.push(message);

	    self.shownMessages[message.messageId] = true;

	    self.megaChat.updateDashboard();
	};

	ChatRoom.prototype.getNavElement = function () {
	    var self = this;

	    return $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
	};

	ChatRoom.prototype.arePluginsForcingMessageQueue = function (message) {
	    var self = this;
	    var pluginsForceQueue = false;

	    $.each(self.megaChat.plugins, function (k) {
	        if (self.megaChat.plugins[k].shouldQueueMessage) {
	            if (self.megaChat.plugins[k].shouldQueueMessage(self, message) === true) {
	                pluginsForceQueue = true;
	                return false;
	            }
	        }
	    });

	    return pluginsForceQueue;
	};

	ChatRoom.prototype.sendMessage = function (message, meta) {
	    var self = this;
	    var megaChat = this.megaChat;
	    meta = meta || {};

	    var messageId = megaChat.karere.generateMessageId(self.roomJid, JSON.stringify([message, meta]));

	    var eventObject = new KarereEventObjects.OutgoingMessage(self.roomJid, megaChat.karere.getJid(), "groupchat", messageId, message, meta, unixtime(), KarereEventObjects.OutgoingMessage.STATE.NOT_SENT, self.roomJid);
	    eventObject.chatRoom = self;

	    eventObject.textContents = message;

	    self.appendMessage(eventObject);

	    self._sendMessageToTransport(eventObject).done(function (internalId) {
	        eventObject.internalId = internalId;
	        eventObject.orderValue = internalId;
	    });
	};

	ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
	    var self = this;
	    var megaChat = this.megaChat;

	    megaChat.trigger('onBeforeSendMessage', messageObject);

	    var messageMeta = messageObject.getMeta() ? messageObject.getMeta() : {};
	    if (messageMeta.isDeleted && messageMeta.isDeleted === true) {
	        return MegaPromise.reject();
	    }

	    if (messageObject.setDelay) {

	        messageObject.setDelay(unixtime());
	    }

	    return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject);
	};

	ChatRoom.prototype.getMediaOptions = function () {
	    return this.callSession ? this.callSession.getMediaOptions : {};
	};

	ChatRoom.prototype._sendNodes = function (nodeids, users) {
	    var promises = [];
	    var self = this;

	    users.forEach(function (uh) {
	        nodeids.forEach(function (nodeId) {
	            promises.push(asyncApiReq({ 'a': 'mcga', 'n': nodeId, 'u': uh, 'id': self.chatId, 'v': Chatd.VERSION }));
	        });
	    });

	    return MegaPromise.allDone(promises);
	};

	ChatRoom.prototype.attachNodes = function (ids) {
	    var self = this;

	    var users = [];

	    $.each(self.getParticipantsExceptMe(), function (k, v) {
	        var contact = self.megaChat.getContactFromJid(v);
	        if (contact && contact.u) {
	            users.push(contact.u);
	        }
	    });

	    var $masterPromise = new $.Deferred();

	    self._sendNodes(ids, users).done(function () {
	        var nodesMeta = [];
	        $.each(ids, function (k, nodeId) {
	            var node = M.d[nodeId];
	            nodesMeta.push({
	                'h': node.h,
	                'k': node.k,
	                't': node.t,
	                'name': node.name,
	                's': node.s,
	                'fa': node.fa,
	                'ts': node.ts
	            });
	        });

	        self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify(nodesMeta));

	        $masterPromise.resolve(ids);
	    }).fail(function (r) {
	        $masterPromise.reject(r);
	    });

	    return $masterPromise;
	};

	ChatRoom.prototype.attachContacts = function (ids) {
	    var self = this;

	    var nodesMeta = [];
	    $.each(ids, function (k, nodeId) {
	        var node = M.d[nodeId];
	        nodesMeta.push({
	            'u': node.u,
	            'email': node.m,
	            'name': node.firstName && node.lastName ? node.firstName + " " + node.lastName : node.m
	        });
	    });

	    self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify(nodesMeta));
	};

	ChatRoom.prototype.revokeAttachment = function (node) {
	    var self = this;

	    assert(node, 'node is missing.');

	    var users = [];

	    $.each(self.getParticipantsExceptMe(), function (k, v) {
	        var contact = self.megaChat.getContactFromJid(v);
	        if (contact && contact.u) {
	            users.push(contact.u);
	        }
	    });

	    loadingDialog.show();

	    var allPromises = [];

	    users.forEach(function (uh) {
	        allPromises.push(asyncApiReq({
	            'a': 'mcra', 'n': node.h, 'u': uh, 'id': self.chatId,
	            'v': Chatd.VERSION
	        }));
	    });
	    MegaPromise.allDone(allPromises).done(function (r) {
	        if (r && r[0] && r[0][0] && r[0][0] < 0) {
	            msgDialog('warninga', __("Revoke attachment"), __("Could not revoke access to attachment, error code: %s.").replace("%s", r[0][0]));
	        }

	        self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT + node.h);
	    }).always(function () {
	        loadingDialog.hide();
	    }).fail(function (r) {
	        msgDialog('warninga', __(l[8891]), __(l[8893]).replace("%s", r));
	    });

	    return allPromises;
	};

	ChatRoom.prototype.getMessageById = function (messageId) {
	    var self = this;
	    var found = false;
	    $.each(self.messagesBuff.messages, function (k, v) {
	        if (v.messageId === messageId) {
	            found = v;

	            return false;
	        }
	    });

	    return found;
	};

	ChatRoom.prototype.renderContactTree = function () {
	    var self = this;

	    var $navElement = self.getNavElement();

	    var $count = $('.nw-conversations-unread', $navElement);

	    var count = self.messagesBuff.getUnreadCount();

	    if (count > 0) {
	        $count.text(count > 9 ? "9+" : count);
	        $navElement.addClass("unread");
	    } else if (count === 0) {
	        $count.text("");
	        $navElement.removeClass("unread");
	    }

	    $navElement.data('chatroom', self);
	};

	ChatRoom.prototype.getUnreadCount = function () {
	    var self = this;
	    return self.messagesBuff.getUnreadCount();
	};

	ChatRoom.prototype.recover = function () {
	    var self = this;

	    self.callRequest = null;
	    var $startChatPromise;
	    if (self.state !== ChatRoom.STATE.LEFT) {
	        self.setState(ChatRoom.STATE.JOINING, true);
	        $startChatPromise = self.megaChat.karere.startChat([], self.type, self.roomJid.split("@")[0], self.type === "private" ? false : undefined);

	        self.megaChat.trigger("onRoomCreated", [self]);
	    } else {
	        $startChatPromise = MegaPromise.reject();
	    }

	    return $startChatPromise;
	};

	ChatRoom.prototype.startAudioCall = function () {
	    var self = this;
	    return self.megaChat.plugins.callManager.startCall(self, { audio: true, video: false });
	};

	ChatRoom.prototype.startVideoCall = function () {
	    var self = this;
	    return self.megaChat.plugins.callManager.startCall(self, { audio: true, video: true });
	};

	ChatRoom.prototype.stateIsLeftOrLeaving = function () {
	    return this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING;
	};

	ChatRoom.prototype._clearChatMessagesFromChatd = function () {
	    megaChat.plugins.chatdIntegration.chatd.shards[0].retention(base64urldecode(this.chatId), 1);
	};

	ChatRoom.prototype.isReadOnly = function () {
	    return this.members && this.members[u_handle] === 0 || this.privateReadOnlyChat || this.state === ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.LEFT;
	};
	ChatRoom.prototype.iAmOperator = function () {
	    return this.type === "private" || this.members && this.members[u_handle] === 3;
	};

	window.ChatRoom = ChatRoom;
	module.exports = ChatRoom;

/***/ },
/* 27 */
/***/ function(module, exports) {

	'use strict';

	module.exports = {
	    'altersData': function altersData(fn) {
	        fn.altersData = true;
	        return fn;
	    },
	    'prefixedKeyMirror': function prefixedKeyMirror(prefix, vals) {
	        var result = {};

	        Object.keys(vals).forEach(function (k) {
	            result[k] = prefix + ":" + k;
	        });
	        return result;
	    },
	    'extendActions': function extendActions(prefix, src, toBeAppended) {
	        var actions = Object.keys(src).concat(Object.keys(toBeAppended));
	        var result = {};

	        actions.forEach(function (k) {
	            result[k] = prefix + ":" + k;
	        });
	        return result;
	    }
	};

/***/ }
/******/ ]);