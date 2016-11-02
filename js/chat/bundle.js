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
	                    window.location = '#fm/chat';
	                    M.openFolder('chat');
	                }, 100);
	                return;
	            }
	        } else {
	            if (!M.u[roomOrUserHash]) {
	                setTimeout(function () {
	                    window.location = '#fm/chat';
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

	        if (localStorage.megaChatPresence !== "unavailable") {
	            if (megaChat.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
	                megaChat.connect();
	            }
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
	        'fallbackXmppServers': ["https://xmpp270n001.karere.mega.nz/ws", "https://xmpp270n002.karere.mega.nz/ws"],
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
	                url: 'turn:trn270n001.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                url: 'turn:trn270n002.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                url: 'turn:trn302n001.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                url: 'turn:trn302n002.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                url: 'turn:trn530n002.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                url: 'turn:trn530n003.karere.mega.nz:3478?transport=udp',
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
	            'persistedTypeArea': PersistedTypeArea
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
	        if (contact) {
	            if (!contact.presenceMtime || parseFloat(contact.presenceMtime) < eventObject.getDelay()) {
	                contact.presence = megaChat.karere.getPresence(megaChat.getJidFromNodeId(contact.u));
	                contact.presenceMtime = eventObject.getDelay();
	            }
	        }

	        if (eventObject.getShow() !== "unavailable") {
	            if (eventObject.isMyOwn(self.karere) === false) {

	                if (bareJid === self.karere.getBareJid()) {
	                    if (eventObject.getDelay() && eventObject.getDelay() >= parseFloat(localStorage.megaChatPresenceMtime) && self._myPresence != eventObject.getShow()) {
	                        self._myPresence = eventObject.getShow();
	                        localStorage.megaChatPresence = eventObject.getShow();
	                        localStorage.megaChatPresenceMtime = eventObject.getDelay();

	                        self.karere.setPresence(eventObject.getShow(), undefined, eventObject.getDelay());
	                    }
	                }
	            }
	        }

	        self.renderMyStatus();
	    });

	    this.karere.bind("onDiscoCapabilities", function (e, eventObject) {
	        var $treeElement = $('.nw-conversations-item[data-jid="' + eventObject.getFromUserBareJid() + '"]');

	        $.each(eventObject.getCapabilities(), function (capability, capable) {
	            if (capable) {
	                $treeElement.addClass('chat-capability-' + capability);
	            } else {
	                $treeElement.removeClass('chat-capability-' + capability);
	            }
	        });

	        var roomJid = $treeElement.attr('data-room-jid');

	        var room = self.chats[roomJid + "@conference." + megaChat.options.xmppDomain];
	        if (room) {}
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

	        if (localStorage.megaChatPresence) {
	            self.karere.setPresence(localStorage.megaChatPresence, undefined, localStorage.megaChatPresenceMtime);
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

	    $(document.body).undelegate('.top-user-status-item', 'mousedown.megachat');

	    $(document.body).delegate('.top-user-status-item', 'mousedown.megachat', function () {
	        var presence = $(this).data("presence");
	        self._myPresence = presence;

	        localStorage.megaChatPresence = presence;
	        localStorage.megaChatPresenceMtime = unixtime();

	        $('.top-user-status-popup').removeClass("active");

	        if (self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED && presence != Karere.PRESENCE.OFFLINE) {
	            self.karere._myPresence = presence;
	            self.connect().done(function () {
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);

	                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
	                    var shard = self.plugins.chatdIntegration.chatd.shards[k];
	                    shard.reconnect();
	                });
	            });
	            return true;
	        } else {
	            if (presence === Karere.PRESENCE.OFFLINE) {
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
	                self.karere.connectionRetryManager.resetConnectionRetries();
	                self.karere.disconnect();
	                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
	                    var shard = self.plugins.chatdIntegration.chatd.shards[k];
	                    shard.disconnect();
	                });
	            } else {
	                self.karere.connectionRetryManager.resetConnectionRetries();
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
	            }
	        }
	    });

	    $(window).unbind('hashchange.megaChat' + this.instanceId);
	    var lastOpenedRoom = null;
	    $(window).bind('hashchange.megaChat' + this.instanceId, function () {
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
	            $(window).rebind('hashchange.delayedChatUiInit', function () {
	                if (typeof $.leftPaneResizable === 'undefined' || !fminitialized) {

	                    return;
	                }
	                appContainer = document.querySelector('.section.conversations');
	                if (appContainer) {
	                    initAppUI();
	                    $(window).unbind('hashchange.delayedChatUiInit');
	                }
	            });
	        } else {
	            initAppUI();
	        }
	    }
	    self.is_initialized = true;

	    $('.activity-status-block, .activity-status').show();

	    if (!localStorage.megaChatPresence || localStorage.megaChatPresence != "unavailable") {
	        self.connect().always(function () {
	            self.renderMyStatus();
	        });
	    } else {
	        self.renderMyStatus();
	    }

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

	    self.karere.rebind("onPresence.maintainUI", function (e, presenceEventData) {
	        var contact = self.getContactFromJid(presenceEventData.getFromJid());
	        M.onlineStatusEvent(contact, presenceEventData.getShow());
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

	Chat.prototype.xmppPresenceToText = function (presence) {
	    if (presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE || presence === true) {
	        return l[5923];
	    } else if (presence == Karere.PRESENCE.AWAY || presence == "xa") {
	        return l[5924];
	    } else if (presence == Karere.PRESENCE.BUSY) {
	        return l[5925];
	    } else if (!presence || presence == Karere.PRESENCE.OFFLINE) {
	        return l[5926];
	    } else {
	        return __('Unknown');
	    }
	};

	Chat.prototype.renderMyStatus = function () {
	    var self = this;
	    if (!self.is_initialized) {
	        return;
	    }

	    var $status = $('.activity-status-block .activity-status');

	    $('.top-user-status-popup .top-user-status-item').removeClass("active");

	    $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');

	    var presence = self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED ? self.karere.getPresence(self.karere.getJid()) : localStorage.megaChatPresence;

	    var cssClass = self.xmppPresenceToCssClass(presence);

	    if (!presence && self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
	        if (!localStorage.megaChatPresence) {
	            presence = localStorage.megaChatPresence = "chat";
	        } else {
	            presence = localStorage.megaChatPresence;
	        }
	    } else if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() === Karere.CONNECTION_STATE.AUTHFAIL || self.karere.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTING) {
	        cssClass = "offline";
	    }

	    if (cssClass === 'online') {
	        $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').addClass("active");
	    } else if (cssClass === 'away') {
	        $('.top-user-status-popup .top-user-status-item[data-presence="away"]').addClass("active");
	    } else if (cssClass === 'busy') {
	        $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').addClass("active");
	    } else if (cssClass === 'offline') {
	        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
	    } else {
	        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
	    }

	    $status.addClass(cssClass);

	    if (self.karere.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING) {
	        $status.parent().addClass("connecting");
	    } else {
	        $status.parent().removeClass("connecting");
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

	    this.karere.subscribe(megaChat.getJidFromNodeId(u), self.getMyXMPPPassword());

	    if (M.u[u] && !M.u[u].presence) {
	        M.u[u].presence = this.karere.getPresence(megaChat.getJidFromNodeId(u));
	    }

	    self.renderMyStatus();
	};

	Chat.prototype.processRemovedUser = function (u) {
	    var self = this;

	    self.logger.debug("removed: ", u);

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

	Chat.prototype.getXmppServiceUrl = function () {
	    var self = this;

	    if (localStorage.megaChatUseSandbox) {
	        return "https://karere-005.developers.mega.co.nz/bosh";
	    } else if (localStorage.customXmppServiceUrl) {
	        return localStorage.customXmppServiceUrl;
	    } else {
	        var $promise = new MegaPromise();

	        $.get("https://" + self.options.loadbalancerService + "/?service=xmpp").done(function (r) {
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
	        });
	    });
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
	var ConversationPanelUI = __webpack_require__(12);

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

	            lastMessageDiv = React.makeElement(
	                "div",
	                { className: lastMsgDivClasses },
	                renderableSummary
	            );

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

	            var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || chatRoom.messagesBuff.joined === false ? localStorage.megaChatPresence !== 'unavailable' ? l[7006] : "" : l[8000];

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

	        window.location = room.getRoomUrl();
	        e.stopPropagation();
	    },
	    currentCallClicked: function currentCallClicked(e) {
	        var activeCallSession = this.props.megaChat.activeCallSession;
	        if (activeCallSession) {
	            this.conversationClicked(activeCallSession.room, e);
	        }
	    },
	    contactClicked: function contactClicked(contact, e) {
	        window.location = "#fm/chat/" + contact.u;
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

	                if (contact && contact.c === 0) {

	                    Soon(function () {
	                        chatRoom.privateReadOnlyChat = true;
	                    });
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
	            window.location = "#fm/chat/" + selected[0];
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

	        var lPane = $('.conversationsApp .fm-left-panel');

	        self.fmConfigThrottling = null;
	        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function () {
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
	                { className: "fm-left-panel", style: leftPanelStyles },
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
	                            { className: "content-panel conversations" + (window.location.hash.indexOf("/chat") !== -1 ? " active" : "") },
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
	        if (this.props.popupDidMount) {
	            this.props.popupDidMount(this.popup);
	        }
	        this._renderLayer();
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
	    getScrolledPercentY: function getScrolledPercentY() {
	        var $elem = $(this.findDOMNode());
	        return 100 / this.getScrollHeight() * $elem[0].scrollTop;
	    },
	    getScrollPositionY: function getScrollPositionY() {
	        var $elem = $(this.findDOMNode());
	        return $elem[0].scrollTop;
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

	            $(window).rebind('hashchange.button' + self.getUniqueId(), function (e) {
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

	            $(window).unbind('hashchange.button' + this.getUniqueId());
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

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ContactsUI = __webpack_require__(10);
	var EMOJILIST = __webpack_require__(11);
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
	    render: function render() {
	        var _this = this;

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
	                nothingSelectedButtonLabel: this.props.nothingSelectedButtonLabel,
	                onClick: function onClick(contact, e) {
	                    _this.props.onClick(contact, e);
	                    _this.props.closeDropdown();
	                } })
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

	var DropdownEmojiSelector = React.createClass({
	    displayName: "DropdownEmojiSelector",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'previewEmoji': null,
	            'searchValue': '',
	            'browsingCategory': false,
	            'isActive': false
	        };
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({
	            searchValue: e.target.value,
	            browsingCategory: false
	        });
	        self.refs.scrollableArea.scrollToY(0);
	    },
	    onUserScroll: function onUserScroll($ps, elem, e) {
	        if (this.state.browsingCategory) {
	            var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');
	            if (!elementInViewport($cat)) {
	                this.setState({ 'browsingCategory': false });
	            }
	        }
	    },
	    render: function render() {
	        var self = this;

	        var categoryTranslations = {
	            "PEOPLE": l[8016],
	            "NATURE": l[8017],
	            "FOOD & DRINK": l[8018],
	            "CELEBRATION": l[8019],
	            "ACTIVITY": l[8020],
	            "TRAVEL & PLACES": l[8021],
	            "OBJECTS & SYMBOLS": l[8022]
	        };

	        var popupContents = null;

	        if (self.state.isActive === true) {
	            var preview;
	            if (self.state.previewEmoji) {
	                var slug = self.state.previewEmoji;
	                var emojiMeta = EMOJILIST.EMOJIS[slug];
	                var txt = ":" + slug + ":";
	                if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
	                    txt = slug;
	                }

	                preview = React.makeElement(
	                    "div",
	                    { className: "emoji-one-preview" },
	                    React.makeElement("span", { className: "emoji-one demo-icon emojione-" + emojiMeta[0] }),
	                    React.makeElement(
	                        "div",
	                        { className: "emoji-one title" },
	                        txt
	                    )
	                );
	            }

	            var emojis = [];
	            var searchValue = self.state.searchValue;

	            Object.keys(EMOJILIST.EMOJI_CATEGORIES).forEach(function (categoryName) {
	                var curCategoryEmojis = [];
	                Object.keys(EMOJILIST.EMOJI_CATEGORIES[categoryName]).forEach(function (slug) {
	                    if (searchValue.length > 0) {
	                        if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
	                            return;
	                        }
	                    }
	                    var meta = EMOJILIST.EMOJIS[slug];

	                    curCategoryEmojis.push(React.makeElement(
	                        "div",
	                        {
	                            "data-emoji": slug,
	                            className: "button square-button emoji-one", key: categoryName + "_" + slug,
	                            onMouseEnter: function onMouseEnter(e) {
	                                if (self.mouseEnterTimer) {
	                                    clearTimeout(self.mouseEnterTimer);
	                                }

	                                e.stopPropagation();
	                                e.preventDefault();

	                                self.mouseEnterTimer = setTimeout(function () {
	                                    self.setState({ 'previewEmoji': slug });
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
	                                    self.props.onClick(e, slug, meta);
	                                }
	                            }
	                        },
	                        React.makeElement(
	                            "span",
	                            {
	                                className: "emojione-" + meta[0],
	                                title: ":" + slug + ":" },
	                            meta[1]
	                        )
	                    ));
	                });

	                if (curCategoryEmojis.length > 0) {
	                    emojis.push(React.makeElement(
	                        "div",
	                        { key: categoryName, "data-category-name": categoryName, className: "emoji-category-container" },
	                        emojis.length > 0 ? React.makeElement("div", { className: "clear" }) : null,
	                        React.makeElement(
	                            "div",
	                            { className: "emoji-type-txt" },
	                            categoryTranslations[categoryName] ? categoryTranslations[categoryName] : categoryName
	                        ),
	                        React.makeElement("div", { className: "clear" }),
	                        curCategoryEmojis,
	                        React.makeElement("div", { className: "clear" })
	                    ));
	                }
	            });
	            var categoryIcons = {

	                "PEOPLE": "smile-icon",
	                "NATURE": "sun-icon",
	                "FOOD & DRINK": "wineglass-icon",
	                "CELEBRATION": "present-icon",
	                "ACTIVITY": "bowling-ball-icon",
	                "TRAVEL & PLACES": "earth-icon",
	                "OBJECTS & SYMBOLS": "percents-icon"
	            };

	            var categoryButtons = [];

	            Object.keys(categoryIcons).forEach(function (categoryName) {
	                var activeClass = self.state.browsingCategory === categoryName ? " active" : "";

	                if (self.state.browsingCategory === false && self.state.searchValue === '' && categoryIcons[categoryName] === "clock-icon") {
	                    activeClass = " active";
	                }

	                categoryButtons.push(React.makeElement(
	                    "div",
	                    {
	                        className: "button square-button emoji-one" + activeClass,
	                        key: categoryIcons[categoryName],
	                        onClick: function onClick(e) {
	                            e.stopPropagation();
	                            e.preventDefault();

	                            self.setState({ browsingCategory: categoryName, searchValue: '' });

	                            self.refs.scrollableArea.scrollToElement($('.emoji-category-container[data-category-name="' + categoryName + '"]:visible')[0]);
	                        }
	                    },
	                    React.makeElement("i", { className: "small-icon " + categoryIcons[categoryName] })
	                ));
	            });

	            popupContents = React.makeElement(
	                "div",
	                null,
	                React.makeElement(
	                    "div",
	                    { className: "popup-header emoji-one" },
	                    preview ? preview : React.makeElement(
	                        "div",
	                        { className: "search-block emoji-one" },
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
	                        className: "popup-scroll-area emoji-one perfectScrollbarContainer",
	                        searchValue: this.state.searchValue,
	                        onUserScroll: this.onUserScroll,
	                        ref: "scrollableArea"
	                    },
	                    React.makeElement(
	                        "div",
	                        { className: "popup-scroll-content emoji-one" },
	                        emojis
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "popup-footer emoji-one" },
	                    categoryButtons
	                )
	            );
	        } else {
	            popupContents = null;
	        }

	        return React.makeElement(
	            Dropdown,
	            _extends({
	                className: "popup emoji-one" }, self.props, { ref: "dropdown",
	                onActiveChange: function onActiveChange(newValue) {

	                    if (newValue === false) {
	                        self.setState(self.getInitialState());
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

	module.exports = window.DropdownsUI = {
	    Dropdown: Dropdown,
	    DropdownEmojiSelector: DropdownEmojiSelector,
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
	                        window.location = '#fm/' + contact.u;
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
	            'selected': this.props.selected ? this.props.selected : []
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
	                    { className: "contacts-search-footer" },
	                    React.makeElement(
	                        "em",
	                        null,
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
	                onDoubleClick: function onDoubleClick(contact, e) {
	                    if (!self.props.multiple) {
	                        if (self.props.onClick) {
	                            self.props.onClick(contact, e);
	                        }
	                    } else {
	                        if (self.props.onSelect) {
	                            self.props.onSelect(contact, e);
	                        }

	                        $(document).trigger('closeDropdowns');

	                        var sel = self.state.selected;
	                        if (sel.indexOf(contact.u) === -1) {
	                            sel.push(contact.u);
	                        }

	                        if (self.props.onSelectDone) {
	                            self.props.onSelectDone(sel);
	                        }
	                    }
	                },
	                onClick: function onClick(contact, e) {
	                    if (!self.props.multiple) {
	                        if (self.props.onClick) {
	                            self.props.onClick(contact, e);
	                        }
	                    } else {
	                        var sel = self.state.selected;
	                        if (!sel) {
	                            sel = [];
	                        }
	                        if (self.state.selected.indexOf(contact.u) > -1) {
	                            removeValue(sel, contact.u, false);
	                        } else {
	                            sel.push(contact.u);
	                        }

	                        self.setState({ 'selected': sel });

	                        self.forceUpdate();

	                        if (self.props.onSelect) {
	                            self.props.onSelect(contact, e);
	                        }
	                    }
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
	                { className: "contacts-search-scroll" },
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
/***/ function(module, exports) {

	"use strict";

	var EMOJI_CATEGORIES = {
	    "PEOPLE": {
	        "slight_smile": ["1F642", "&#x1F642;"],
	        "grinning": ["1F600", "&#x1F600;"],
	        "smirk": ["1F60F", "&#x1F60F;"],
	        "heart_eyes": ["1F60D", "&#x1F60D;"],
	        "sunglasses": ["1F60E", "&#x1F60E;"],
	        "innocent": ["1F607", "&#x1F607;"],
	        "kissing_closed_eyes": ["1F61A", "&#x1F61A;"],
	        "stuck_out_tongue": ["1F61B", "&#x1F61B;"],
	        "stuck_out_tongue_winking_eye": ["1F61C", "&#x1F61C;"],
	        "stuck_out_tongue_closed_eyes": ["1F61D", "&#x1F61D;"],
	        "blush": ["1F60A", "&#x1F60A;"],
	        "yum": ["1F60B", "&#x1F60B;"],
	        "sleepy": ["1F62A", "&#x1F62A;"],
	        "tired_face": ["1F62B", "&#x1F62B;"],
	        "grimacing": ["1F62C", "&#x1F62C;"],
	        "sob": ["1F62D", "&#x1F62D;"],
	        "open_mouth": ["1F62E", "&#x1F62E;"],
	        "sleeping": ["1F634", "&#x1F634;"],
	        "disappointed": ["1F61E", "&#x1F61E;"],
	        "worried": ["1F61F", "&#x1F61F;"],
	        "joy": ["1F602", "&#x1F602;"],
	        "smiling_imp": ["1F608", "&#x1F608;"],
	        "rage": ["1F621", "&#x1F621;"],
	        "cold_sweat": ["1F630", "&#x1F630;"],
	        "sweat": ["1F613", "&#x1F613;"],
	        "kissing_heart": ["1F618", "&#x1F618;"],
	        "sweat_smile": ["1F605", "&#x1F605;"],
	        "smile": ["1F604", "&#x1F604;"],
	        "scream": ["1F631", "&#x1F631;"],
	        "relieved": ["1F60C", "&#x1F60C;"],
	        "dizzy_face": ["1F635", "&#x1F635;"],
	        "confused": ["1f621", "&#x1f621;"],
	        "slight_frown": ["1F641", "&#x1F641;"],
	        "confounded": ["1F616", "&#x1F616;"],
	        "angry": ["1f620", "&#x1f620;"],
	        "kissing_smiling_eyes": ["1F619", "&#x1F619;"],
	        "triumph": ["1F624", "&#x1F624;"],
	        "neutral_face": ["1F610", "&#x1F610;"],
	        "laughing": ["1F606", "&#x1F606;"],
	        "hushed": ["1F62F", "&#x1F62F;"],
	        "disappointed_relieved": ["1F625", "&#x1F625;"],
	        "anguished": ["1F627", "&#x1F627;"],
	        "weary": ["1F629", "&#x1F629;"],
	        "flushed": ["1F633", "&#x1F633;"],
	        "unamused": ["1F612", "&#x1F612;"],
	        "expressionless": ["1F611", "&#x1F611;"],
	        "wink": ["1F609", "&#x1F609;"],
	        "grin": ["1F601", "&#x1F601;"],
	        "mask": ["1F637", "&#x1F637;"],
	        "no_mouth": ["1F636", "&#x1F636;"],
	        "baby": ["1F476", "&#x1F476;"],
	        "smiley_cat": ["1F63A", "&#x1F63A;"],
	        "heart_eyes_cat": ["1F63B", "&#x1F63B;"],
	        "smirk_cat": ["1F63C", "&#x1F63C;"],
	        "kissing_cat": ["1F63D", "&#x1F63D;"],
	        "pouting_cat": ["1F63E", "&#x1F63E;"],
	        "crying_cat_face": ["1F63F", "&#x1F63F;"],
	        "hear_no_evil": ["1F649", "&#x1F649;"],
	        "see_no_evil": ["1F648", "&#x1F648;"],
	        "skull": ["1F480", "&#x1F480;"],
	        "ghost": ["1F47B", "&#x1F47B;"],
	        "alien": ["1F47D", "&#x1F47D;"],
	        "japanese_ogre": ["1F479", "&#x1F479;"],
	        "angel": ["1F47C", "&#x1F47C;"],
	        "santa": ["1F385", "&#x1F385;"],
	        "couple": ["1F46B", "&#x1F46B;"],
	        "couple_with_heart": ["1F491", "&#x1F491;"],
	        "family": ["1F46A", "&#x1F46A;"],
	        "two_women_holding_hands": ["1F46D", "&#x1F46D;"],
	        "couple_ww": ["1F469-2764-1F469", "&nbsp;"],
	        "family_wwg": ["1F469-1F469-1F467", "&nbsp;"],
	        "two_men_holding_hands": ["1F46C", "&#x1F46C;"],
	        "couple_mm": ["-1F468-2764-1F468", "&nbsp;"],
	        "dancers": ["1F46F", "&#x1F46F;"],
	        "footprints": ["1F463", "&#x1F463;"],
	        "poop": ["1F4A9", "&#x1F4A9;"],
	        "eyes": ["1F440", "&#x1F440;"],
	        "lips": ["1F444", "&#x1F444;"],
	        "tongue": ["1F445", "&#x1F445;"],
	        "ear": ["1F442", "&#x1F442;"],
	        "nose": ["1F443", "&#x1F443;"],
	        "point_up": ["261D", "&#x261D;"],
	        "v": ["270C", "&#x270C;"],
	        "punch": ["1F44A", "&#x1F44A;"],
	        "clap": ["1F44F", "&#x1F44F;"],
	        "thumbsup": ["1F44D", "&#x1F44D;"],
	        "thumbsdown": ["1F44E", "&#x1F44E;"],
	        "raised_hand": ["270B", "&#x270B;"],
	        "hand_splayed": ["1F590", "&#x1F590;"],
	        "middle_finger": ["1F595", "&#x1F595;"],
	        "ok_hand": ["1F44C", "&#x1F44C;"],
	        "vulcan": ["1F596", "&#x1F596;"],
	        "muscle": ["1F4AA", "&#x1F4AA;"],
	        "raised_hands": ["1F64C", "&#x1F64C;"],
	        "pray": ["1F64F", "&#x1F64F;"],
	        "writing_hand": ["1F58E", "&#x1F58E;"]
	    },
	    "NATURE": {
	        "seedling": ["1F331", "&#x1F331;"],
	        "evergreen_tree": ["1F332", "&#x1F332;"],
	        "deciduous_tree": ["1F333", "&#x1F333;"],
	        "palm_tree": ["1F334", "&#x1F334;"],
	        "cactus": ["1F335", "&#x1F335;"],
	        "tulip": ["1F337", "&#x1F337;"],
	        "cherry_blossom": ["1F338", "&#x1F338;"],
	        "rose": ["1F339", "&#x1F339;"],
	        "four_leaf_clover": ["1F340", "&#x1F340;"],
	        "maple_leaf": ["1F341", "&#x1F341;"],
	        "fallen_leaf": ["1F342", "&#x1F342;"],
	        "leaves": ["1F343", "&#x1F343;"],
	        "mushroom": ["1F344", "&#x1F344;"],
	        "bouquet": ["1F490", "&#x1F490;"],
	        "chestnut": ["1F330", "&#x1F330;"],
	        "rat": ["1F400", "&#x1F400;"],
	        "mouse2": ["1F401", "&#x1F401;"],
	        "ox": ["1F402", "&#x1F402;"],
	        "water_buffalo": ["1F403", "&#x1F403;"],
	        "cow2": ["1F404", "&#x1F404;"],
	        "tiger2": ["1F405", "&#x1F405;"],
	        "leopard": ["1F406", "&#x1F406;"],
	        "rabbit2": ["1F407", "&#x1F407;"],
	        "cat2": ["1F408", "&#x1F408;"],
	        "dragon": ["1F409", "&#x1F409;"],
	        "goat": ["1F410", "&#x1F410;"],
	        "sheep": ["1F411", "&#x1F411;"],
	        "monkey": ["1F412", "&#x1F412;"],
	        "rooster": ["1F413", "&#x1F413;"],
	        "chicken": ["1F414", "&#x1F414;"],
	        "dog2": ["1F415", "&#x1F415;"],
	        "pig2": ["1F416", "&#x1F416;"],
	        "pig": ["1F437", "&#x1F437;"],
	        "elephant": ["1F418", "&#x1F418;"],
	        "octopus": ["1F419", "&#x1F419;"],
	        "tropical_fish": ["1F420", "&#x1F420;"],
	        "blowfish": ["1F421", "&#x1F421;"],
	        "turtle": ["1F422", "&#x1F422;"],
	        "hatching_chick": ["1F423", "&#x1F423;"],
	        "baby_chick": ["1F424", "&#x1F424;"],
	        "hatched_chick": ["1F425", "&#x1F425;"],
	        "bird": ["1F426", "&#x1F426;"],
	        "penguin": ["1F427", "&#x1F427;"],
	        "koala": ["1F428", "&#x1F428;"],
	        "poodle": ["1F429", "&#x1F429;"],
	        "rabbit": ["1F430", "&#x1F430;"],
	        "cat": ["1F431", "&#x1F431;"],
	        "bear": ["1F43B", "&#x1F43B;"],
	        "whale": ["1F433", "&#x1F433;"],
	        "horse": ["1F434", "&#x1F434;"],
	        "monkey_face": ["1F435", "&#x1F435;"],
	        "dog": ["1F436", "&#x1F436;"],
	        "boar": ["1F417", "&#x1F417;"],
	        "frog": ["1F438", "&#x1F438;"],
	        "hamster": ["1F439", "&#x1F439;"],
	        "panda_face": ["1F43C", "&#x1F43C;"],
	        "bug": ["1F41B", "&#x1F41B;"],
	        "chipmunk": ["1F43F", "&#x1F43F;"],
	        "pig_nose": ["1F43D", "&#x1F43D;"],
	        "bee": ["1F41D", "&#x1F41D;"],
	        "fish": ["1F41F", "&#x1F41F;"],
	        "beetle": ["1F41E", "&#x1F41E;"],
	        "dolphin": ["1F42C", "&#x1F42C;"],
	        "mouse": ["1F42D", "&#x1F42D;"],
	        "snake": ["1F40D", "&#x1F40D;"],
	        "snail": ["1F40C", "&#x1F40C;"],
	        "shell": ["1F41A", "&#x1F41A;"],
	        "feet": ["1F43E", "&#x1F43E;"],
	        "zap": ["26A1", "&#x26A1;"],
	        "fire": ["1F525", "&#x1F525;"],
	        "crescent_moon": ["1F319", "&#x1F319;"],
	        "sunny": ["2600", "&#x2600;"],
	        "partly_sunny": ["26C5", "&#x26C5;"],
	        "droplet": ["1F4A7", "&#x1F4A7;"],
	        "sweat_drops": ["1F4A6", "&#x1F4A6;"],
	        "umbrella": ["2614", "&#x2614;"],
	        "dash": ["1F4A8", "&#x1F4A8;"],
	        "cloud_tornado": ["1F32A", "&#x1F32A;"],
	        "cloud_rain": ["1F327", "&#x1F327;"],
	        "cloud_lightning": ["1F329", "&#x1F329;"],
	        "cloud_snow": ["1F328", "&#x1F328;"],
	        "snowflake": ["2744", "&#x2744;"],
	        "star2": ["1F31F", "&#x1F31F;"],
	        "star": ["2B50", "&#x2B50;"],
	        "stars": ["1F320", "&#x1F320;"],
	        "sunrise_over_mountains": ["1F304", "&#x1F304;"],
	        "sunrise": ["1F305", "&#x1F305;"],
	        "rainbow": ["1F308", "&#x1F308;"],
	        "volcano": ["1F30B", "&#x1F30B;"],
	        "ocean": ["1F30A", "&#x1F30A;"],
	        "fog": ["1F32B", "&#x1F32B;"],
	        "japan": ["1F5FE", "&#x1F5FE;"],
	        "milky_way": ["1F30C", "&#x1F30C;"],
	        "globe_with_meridians": ["1F310", "&#x1F310;"],
	        "earth_africa": ["1F30D", "&#x1F30D;"],
	        "earth_americas": ["1F30E", "&#x1F30E;"],
	        "earth_asia": ["1F30F", "&#x1F30F;"],
	        "new_moon": ["1F311", "&#x1F311;"],
	        "waxing_crescent_moon": ["1F312", "&#x1F312;"],
	        "first_quarter_moon": ["1F313", "&#x1F313;"],
	        "waxing_gibbous_moon": ["1F314", "&#x1F314;"],
	        "full_moon": ["1F315", "&#x1F315;"],
	        "waning_gibbous_moon": ["1F316", "&#x1F316;"],
	        "last_quarter_moon": ["1F317", "&#x1F317;"],
	        "waning_crescent_moon": ["1F318", "&#x1F318;"],
	        "new_moon_with_face": ["1F31A", "&#x1F31A;"],
	        "full_moon_with_face": ["1F31D", "&#x1F31D;"],
	        "first_quarter_moon_with_face": ["1F31B", "&#x1F31B;"],
	        "last_quarter_moon_with_face": ["1F31C", "&#x1F31C;"],
	        "sun_with_face": ["1F31E", "&#x1F31E;"]
	    },
	    "FOOD & DRINK": {
	        "apple": ["1F34E", "&#x1F34E;"],
	        "green_apple": ["1F34F", "&#x1F34F;"],
	        "tangerine": ["1F34A", "&#x1F34A;"],
	        "pineapple": ["1F34D", "&#x1F34D;"],
	        "lemon": ["1F34B", "&#x1F34B;"],
	        "banana": ["1F34C", "&#x1F34C;"],
	        "strawberry": ["1F353", "&#x1F353;"],
	        "peach": ["1F351", "&#x1F351;"],
	        "melon": ["1F348", "&#x1F348;"],
	        "watermelon": ["1F349", "&#x1F349;"],
	        "grapes": ["1F347", "&#x1F347;"],
	        "pear": ["1F350", "&#x1F350;"],
	        "cherries": ["1F352", "&#x1F352;"],
	        "eggplant": ["1F346", "&#x1F346;"],
	        "tomato": ["1F345", "&#x1F345;"],
	        "bread": ["1F35E", "&#x1F35E;"],
	        "hot_pepper": ["1F336", "&#x1F336;"],
	        "ramen": ["1F35C", "&#x1F35C;"],
	        "spaghetti": ["1F35D", "&#x1F35D;"],
	        "fries": ["1F35F", "&#x1F35F;"],
	        "hamburger": ["1F354", "&#x1F354;"],
	        "pizza": ["1F355", "&#x1F355;"],
	        "meat_on_bone": ["1F356", "&#x1F356;"],
	        "poultry_leg": ["1F357", "&#x1F357;"],
	        "rice_cracker": ["1F358", "&#x1F358;"],
	        "rice_ball": ["1F359", "&#x1F359;"],
	        "sushi": ["1F363", "&#x1F363;"],
	        "egg": ["1F373", "&#x1F373;"],
	        "stew": ["1F372", "&#x1F372;"],
	        "fried_shrimp": ["1F364", "&#x1F364;"],
	        "fish_cake": ["1F365", "&#x1F365;"],
	        "dango": ["1F361", "&#x1F361;"],
	        "icecream": ["1F366", "&#x1F366;"],
	        "shaved_ice": ["1F367", "&#x1F367;"],
	        "ice_cream": ["1F368", "&#x1F368;"],
	        "doughnut": ["1F369", "&#x1F369;"],
	        "cookie": ["1F36A", "&#x1F36A;"],
	        "chocolate_bar": ["1F36B", "&#x1F36B;"],
	        "candy": ["1F36C", "&#x1F36C;"],
	        "lollipop": ["1F36D", "&#x1F36D;"],
	        "custard": ["1F36E", "&#x1F36E;"],
	        "honey_pot": ["1F36F", "&#x1F36F;"],
	        "cake": ["1F370", "&#x1F370;"],
	        "fork_and_knife": ["1F374", "&#x1F374;"],
	        "fork_knife_plate": ["1F37D", "&#x1F37D;"],
	        "tea": ["1F375", "&#x1F375;"],
	        "coffee": ["2615", "&#x2615;"],
	        "sake": ["1F376", "&#x1F376;"],
	        "wine_glass": ["1F377", "&#x1F377;"],
	        "tropical_drink": ["1F379", "&#x1F379;"],
	        "cocktail": ["1F378", "&#x1F378;"],
	        "beers": ["1F37B", "&#x1F37B;"],
	        "beer": ["1F37A", "&#x1F37A;"],
	        "baby_bottle": ["1F37C", "&#x1F37C;"]
	    },
	    "CELEBRATION": {
	        "ribbon": ["1F380", "&#x1F380;"],
	        "gift": ["1F381", "&#x1F381;"],
	        "birthday": ["1F382", "&#x1F382;"],
	        "jack_o_lantern": ["1F383", "&#x1F383;"],
	        "christmas_tree": ["1F384", "&#x1F384;"],
	        "tanabata_tree": ["1F38B", "&#x1F38B;"],
	        "bamboo": ["1F38D", "&#x1F38D;"],
	        "rice_scene": ["1F391", "&#x1F391;"],
	        "fireworks": ["1F386", "&#x1F386;"],
	        "sparkler": ["1F387", "&#x1F387;"],
	        "tada": ["1F389", "&#x1F389;"],
	        "confetti_ball": ["1F38A", "&#x1F38A;"],
	        "balloon": ["1F388", "&#x1F388;"],
	        "dizzy": ["1F4AB", "&#x1F4AB;"],
	        "sparkles": ["2728", "&#x2728;"],
	        "boom": ["1F4A5", "&#x1F4A5;"],
	        "mortar_board": ["1F393", "&#x1F393;"],
	        "crown": ["1F451", "&#x1F451;"],
	        "dolls": ["1F38E", "&#x1F38E;"],
	        "flags": ["1F38F", "&#x1F38F;"],
	        "wind_chime": ["1F390", "&#x1F390;"],
	        "crossed_flags": ["1F38C", "&#x1F38C;"],
	        "izakaya_lantern": ["1F3EE", "&#x1F3EE;"],
	        "ring": ["1F48D", "&#x1F48D;"],
	        "heart": ["2764", "&#x2764;"],
	        "broken_heart": ["1F494", "&#x1F494;"],
	        "love_letter": ["1F48C", "&#x1F48C;"],
	        "two_hearts": ["1F495", "&#x1F495;"],
	        "revolving_hearts": ["1F49E", "&#x1F49E;"],
	        "heartbeat": ["1F493", "&#x1F493;"],
	        "heartpulse": ["1F497", "&#x1F497;"],
	        "sparkling_heart": ["1F496", "&#x1F496;"],
	        "cupid": ["1F498", "&#x1F498;"],
	        "gift_heart": ["1F49D", "&#x1F49D;"],
	        "heart_decoration": ["1F49F", "&#x1F49F;"],
	        "purple_heart": ["1F49C", "&#x1F49C;"],
	        "yellow_heart": ["1F49B", "&#x1F49B;"],
	        "green_heart": ["1F49A", "&#x1F49A;"],
	        "blue_heart": ["1F499", "&#x1F499;"]
	    },
	    "ACTIVITY": {
	        "runner": ["1F3C3", "&#x1F3C3;"],
	        "walking": ["1F6B6", "&#x1F6B6;"],
	        "golfer": ["1F3CC", "&#x1F3CC;"],
	        "lifter": ["1F3CB", "&#x1F3CB;"],
	        "dancer": ["1F483", "&#x1F483;"],
	        "rowboat": ["1F6A3", "&#x1F6A3;"],
	        "swimmer": ["1F3CA", "&#x1F3CA;"],
	        "surfer": ["1F3C4", "&#x1F3C4;"],
	        "bath": ["1F6C0", "&#x1F6C0;"],
	        "snowboarder": ["1F3C2", "&#x1F3C2;"],
	        "ski": ["1F3BF", "&#x1F3BF;"],
	        "snowman": ["26C4", "&#x26C4;"],
	        "bicyclist": ["1F6B4", "&#x1F6B4;"],
	        "mountain_bicyclist": ["1F6B5", "&#x1F6B5;"],
	        "horse_racing": ["1F3C7", "&#x1F3C7;"],
	        "tent": ["26FA", "&#x26FA;"],
	        "fishing_pole_and_fish": ["1F3A3", "&#x1F3A3;"],
	        "soccer": ["26BD", "&#x26BD;"],
	        "basketball": ["1F3C0", "&#x1F3C0;"],
	        "football": ["1F3C8", "&#x1F3C8;"],
	        "baseball": ["26BE", "&#x26BE;"],
	        "tennis": ["1F3BE", "&#x1F3BE;"],
	        "rugby_football": ["1F3C9", "&#x1F3C9;"],
	        "golf": ["26F3", "&#x26F3;"],
	        "trophy": ["1F3C6", "&#x1F3C6;"],
	        "running_shirt_with_sash": ["1F3BD", "&#x1F3BD;"],
	        "checkered_flag": ["1F3C1", "&#x1F3C1;"],
	        "musical_keyboard": ["1F3B9", "&#x1F3B9;"],
	        "guitar": ["1F3B8", "&#x1F3B8;"],
	        "violin": ["1F3BB", "&#x1F3BB;"],
	        "saxophone": ["1F3B7", "&#x1F3B7;"],
	        "trumpet": ["1F3BA", "&#x1F3BA;"],
	        "musical_note": ["1F3B5", "&#x1F3B5;"],
	        "notes": ["1F3B6", "&#x1F3B6;"],
	        "musical_score": ["1F3BC", "&#x1F3BC;"],
	        "headphones": ["1F3A7", "&#x1F3A7;"],
	        "microphone": ["1F3A4", "&#x1F3A4;"],
	        "performing_arts": ["1F3AD", "&#x1F3AD;"],
	        "ticket": ["1F3AB", "&#x1F3AB;"],
	        "tophat": ["1F3A9", "&#x1F3A9;"],
	        "circus_tent": ["1F3AA", "&#x1F3AA;"],
	        "clapper": ["1F3AC", "&#x1F3AC;"],
	        "art": ["1F3A8", "&#x1F3A8;"],
	        "dart": ["1F3AF", "&#x1F3AF;"],
	        "8ball": ["1F3B1", "&#x1F3B1;"],
	        "bowling": ["1F3B3", "&#x1F3B3;"],
	        "slot_machine": ["1F3B0", "&#x1F3B0;"],
	        "game_die": ["1F3B2", "&#x1F3B2;"],
	        "video_game": ["1F3AE", "&#x1F3AE;"],
	        "flower_playing_cards": ["1F3B4", "&#x1F3B4;"],
	        "black_joker": ["1F0CF", "&#x1F0CF;"],
	        "mahjong": ["1F004", "&#x1F004;"],
	        "carousel_horse": ["1F3A0", "&#x1F3A0;"],
	        "ferris_wheel": ["1F3A1", "&#x1F3A1;"],
	        "roller_coaster": ["1F3A2", "&#x1F3A2;"]
	    },
	    "TRAVEL & PLACES": {
	        "railway_car": ["1F683", "&#x1F683;"],
	        "mountain_railway": ["1F69E", "&#x1F69E;"],
	        "steam_locomotive": ["1F682", "&#x1F682;"],
	        "train": ["1F68B", "&#x1F68B;"],
	        "monorail": ["1F69D", "&#x1F69D;"],
	        "bullettrain_side": ["1F684", "&#x1F684;"],
	        "bullettrain_front": ["1F685", "&#x1F685;"],
	        "train2": ["1F686", "&#x1F686;"],
	        "metro": ["1F687", "&#x1F687;"],
	        "light_rail": ["1F688", "&#x1F688;"],
	        "station": ["1F689", "&#x1F689;"],
	        "tram": ["1F68A", "&#x1F68A;"],
	        "bus": ["1F68C", "&#x1F68C;"],
	        "oncoming_bus": ["1F68D", "&#x1F68D;"],
	        "trolleybus": ["1F68E", "&#x1F68E;"],
	        "minibus": ["1F690", "&#x1F690;"],
	        "ambulance": ["1F691", "&#x1F691;"],
	        "fire_engine": ["1F692", "&#x1F692;"],
	        "police_car": ["1F693", "&#x1F693;"],
	        "oncoming_police_car": ["1F694", "&#x1F694;"],
	        "rotating_light": ["1F6A8", "&#x1F6A8;"],
	        "taxi": ["1F695", "&#x1F695;"],
	        "oncoming_taxi": ["1F696", "&#x1F696;"],
	        "red_car": ["1F697", "&#x1F697;"],
	        "oncoming_automobile": ["1F698", "&#x1F698;"],
	        "blue_car": ["1F699", "&#x1F699;"],
	        "truck": ["1F69A", "&#x1F69A;"],
	        "articulated_lorry": ["1F69B", "&#x1F69B;"],
	        "tractor": ["1F69C", "&#x1F69C;"],
	        "bike": ["1F6B2", "&#x1F6B2;"],
	        "busstop": ["1F68F", "&#x1F68F;"],
	        "fuelpump": ["26FD", "&#x26FD;"],
	        "construction": ["1F6A7", "&#x1F6A7;"],
	        "vertical_traffic_light": ["1F6A6", "&#x1F6A6;"],
	        "traffic_light": ["1F6A5", "&#x1F6A5;"],
	        "rocket": ["1F680", "&#x1F680;"],
	        "helicopter": ["1F681", "&#x1F681;"],
	        "airplane": ["2708", "&#x2708;"],
	        "seat": ["1F4BA", "&#x1F4BA;"],
	        "anchor": ["2693", "&#x2693;"],
	        "ship": ["1F6A2", "&#x1F6A2;"],
	        "speedboat": ["1F6A4", "&#x1F6A4;"],
	        "sailboat": ["26F5", "&#x26F5;"],
	        "aerial_tramway": ["1F6A1", "&#x1F6A1;"],
	        "mountain_cableway": ["1F6A0", "&#x1F6A0;"],
	        "suspension_railway": ["1F69F", "&#x1F69F;"],
	        "passport_control": ["1F6C2", "&#x1F6C2;"],
	        "customs": ["1F6C3", "&#x1F6C3;"],
	        "baggage_claim": ["1F6C4", "&#x1F6C4;"],
	        "left_luggage": ["1F6C5", "&#x1F6C5;"],
	        "yen": ["1F4B4", "&#x1F4B4;"],
	        "euro": ["1F4B6", "&#x1F4B6;"],
	        "pound": ["1F4B7", "&#x1F4B7;"],
	        "dollar": ["1F4B5", "&#x1F4B5;"],
	        "statue_of_liberty": ["1F5FD", "&#x1F5FD;"],
	        "moyai": ["1F5FF", "&#x1F5FF;"],
	        "foggy": ["1F301", "&#x1F301;"],
	        "tokyo_tower": ["1F5FC", "&#x1F5FC;"],
	        "stadium": ["1F3DF", "&#x1F3DF;"],
	        "european_castle": ["1F3F0", "&#x1F3F0;"],
	        "japanese_castle": ["1F3EF", "&#x1F3EF;"],
	        "mountain_snow": ["1F3D4", "&#x1F3D4;"],
	        "camping": ["1F3D5", "&#x1F3D5;"],
	        "beach": ["1F3D6", "&#x1F3D6;"],
	        "desert": ["1F3DC", "&#x1F3DC;"],
	        "island": ["1F3DD", "&#x1F3DD;"],
	        "park": ["1F3DE", "&#x1F3DE;"],
	        "cityscape": ["1F3D9", "&#x1F3D9;"],
	        "city_dusk": ["1F306", "&#x1F306;"],
	        "city_sunset": ["1F307", "&#x1F307;"],
	        "night_with_stars": ["1F303", "&#x1F303;"],
	        "bridge_at_night": ["1F309", "&#x1F309;"],
	        "house": ["1F3E0", "&#x1F3E0;"],
	        "house_with_garden": ["1F3E1", "&#x1F3E1;"],
	        "house_abandoned": ["1F3DA", "&#x1F3DA;"],
	        "office": ["1F3E2", "&#x1F3E2;"],
	        "department_store": ["1F3EC", "&#x1F3EC;"],
	        "factory": ["1F3ED", "&#x1F3ED;"],
	        "post_office": ["1F3E3", "&#x1F3E3;"],
	        "european_post_office": ["1F3E4", "&#x1F3E4;"],
	        "hospital": ["1F3E5", "&#x1F3E5;"],
	        "bank": ["1F3E6", "&#x1F3E6;"],
	        "hotel": ["1F3E8", "&#x1F3E8;"],
	        "love_hotel": ["1F3E9", "&#x1F3E9;"],
	        "wedding": ["1F492", "&#x1F492;"],
	        "church": ["26EA", "&#x26EA;"],
	        "convenience_store": ["1F3EA", "&#x1F3EA;"],
	        "school": ["1F3EB", "&#x1F3EB;"],
	        "flag_au": ["1F1E6-1F1FA", "&#x1F1E6;-&#x1F1FA;"],
	        "flag_at": ["1F1E6-F1F9", "&#x1F1E6;-&#x1F1F9;"],
	        "flag_be": ["1F1E7-1F1EA", "&#x1F1E7;-&#x1F1EA;"],
	        "flag_br": ["1F1E7-1F1F7", "&#x1F1E7;-&#x1F1F7;"],
	        "flag_ca": ["1F1E8-1F1E6", "&#x1F1E8;-&#x1F1E6;"],
	        "flag_pt": ["1F1F5-1F1F9", "&#x1F1F5;-&#x1F1F9;"],
	        "flag_cn": ["1F1E8-1F1F3", "&#x1F1E8;-&#x1F1F3;"],
	        "flag_co": ["1F1E8-1F1F4", "&#x1F1E8;-&#x1F1F4;"],
	        "flag_dk": ["1F1E9-1F1F0", "&#x1F1E9;-&#x1F1F0;"],
	        "flag_fi": ["1F1EB-1F1EE", "&#x1F1EB;-&#x1F1EE;"],
	        "flag_fr": ["1F1EB-1F1F7", "&#x1F1EB;-&#x1F1F7;"],
	        "flag_de": ["1F1E9-1F1EA", "&#x1F1E9;-&#x1F1EA;"],
	        "flag_ch": ["1F1E8-1F1ED", "&#x1F1E8;-&#x1F1ED;"],
	        "flag_bo": ["1F1E7-1F1F4", "&#x1F1E7;-&#x1F1F4;"],
	        "flag_id": ["1F1EE-1F1E9", "&#x1F1EE;-&#x1F1E9;"],
	        "flag_ie": ["1F1EE-1F1EA", "&#x1F1EE;-&#x1F1EA;"],
	        "flag_il": ["1F1EE-1F1F1", "&#x1F1EE;-&#x1F1F1;"],
	        "flag_se": ["1F1F8-1F1EA", "&#x1F1F8;-&#x1F1EA;"],
	        "flag_it": ["1F1EE-1F1F9", "&#x1F1EE;-&#x1F1F9;"],
	        "flag_jp": ["1F1EF-1F1F5", "&#x1F1EF;-&#x1F1F5;"],
	        "flag_kr": ["1F1F0-1F1F7", "&#x1F1F0;-&#x1F1F7;"],
	        "flag_hr": ["1F1ED-1F1F7", "&#x1F1ED;-&#x1F1F7;"],
	        "flag_gb": ["1F1EC-1F1E7", "&#x1F1EC;-&#x1F1E7;"],
	        "flag_za": ["1F1FF-1F1E6", "&#x1F1FF;-&#x1F1E6;"],
	        "flag_nz": ["1F1F3-1F1FF", "&#x1F1F3;-&#x1F1FF;"],
	        "flag_us": ["1F1FA-1F1F8", "&#x1F1FA;-&#x1F1F8;"],
	        "flag_es": ["1F1EA-1F1F8", "&#x1F1EA;-&#x1F1F8;"],
	        "flag_ru": ["1F1F7-1F1FA", "&#x1F1F7;-&#x1F1FA;"],
	        "flag_gr": ["1F1EC-1F1F7", "&#x1F1EC;-&#x1F1F7;"],
	        "flag_vn": ["1F1FB-1F1F3", "&#x1F1FB;-&#x1F1F3;"],
	        "flag_ad": ["1F1E9-1F1FF", "&#x1F1E9;-&#x1F1FF;"],
	        "flag_tr": ["1F1F9-1F1F7", "&#x1F1F9;-&#x1F1F7;"]
	    },
	    "OBJECTS & SYMBOLS": {
	        "watch": ["231A", "&#x231A;"],
	        "iphone": ["1F4F1", "&#x1F4F1;"],
	        "calling": ["1F4F2", "&#x1F4F2;"],
	        "computer": ["1F4BB", "&#x1F4BB;"],
	        "printer": ["1F5A8", "&#x1F5A8;"],
	        "alarm_clock": ["23F0", "&#x23F0;"],
	        "hourglass_flowing_sand": ["23F3", "&#x23F3;"],
	        "hourglass": ["231B", "&#x231B;"],
	        "camera": ["1F4F7", "&#x1F4F7;"],
	        "video_camera": ["1F4F9", "&#x1F4F9;"],
	        "movie_camera": ["1F3A5", "&#x1F3A5;"],
	        "projector": ["1F4FD", "&#x1F4FD;"],
	        "tv": ["1F4FA", "&#x1F4FA;"],
	        "radio": ["1F4FB", "&#x1F4FB;"],
	        "pager": ["1F4DF", "&#x1F4DF;"],
	        "telephone_receiver": ["1F4DE", "&#x1F4DE;"],
	        "telephone": ["260E", "&#x260E;"],
	        "fax": ["1F4E0", "&#x1F4E0;"],
	        "minidisc": ["1F4BD", "&#x1F4BD;"],
	        "floppy_disk": ["1F4BE", "&#x1F4BE;"],
	        "cd": ["1F4BF", "&#x1F4BF;"],
	        "dvd": ["1F4C0", "&#x1F4C0;"],
	        "vhs": ["1F4FC", "&#x1F4FC;"],
	        "battery": ["1F50B", "&#x1F50B;"],
	        "electric_plug": ["1F50C", "&#x1F50C;"],
	        "bulb": ["1F4A1", "&#x1F4A1;"],
	        "flashlight": ["1F526", "&#x1F526;"],
	        "satellite": ["1F4E1", "&#x1F4E1;"],
	        "satellite_orbital": ["1F6F0", "&#x1F6F0;"],
	        "credit_card": ["1F4B3", "&#x1F4B3;"],
	        "money_with_wings": ["1F4B8", "&#x1F4B8;"],
	        "moneybag": ["1F4B0", "&#x1F4B0;"],
	        "gem": ["1F48E", "&#x1F48E;"],
	        "closed_umbrella": ["1F302", "&#x1F302;"],
	        "pouch": ["1F45D", "&#x1F45D;"],
	        "purse": ["1F45B", "&#x1F45B;"],
	        "handbag": ["1F45C", "&#x1F45C;"],
	        "briefcase": ["1F4BC", "&#x1F4BC;"],
	        "school_satchel": ["1F392", "&#x1F392;"],
	        "lipstick": ["1F484", "&#x1F484;"],
	        "eyeglasses": ["1F453", "&#x1F453;"],
	        "dark_sunglasses": ["1F576", "&#x1F576;"],
	        "womans_hat": ["1F452", "&#x1F452;"],
	        "sandal": ["1F461", "&#x1F461;"],
	        "high_heel": ["1F460", "&#x1F460;"],
	        "boot": ["1F462", "&#x1F462;"],
	        "mans_shoe": ["1F45E", "&#x1F45E;"],
	        "athletic_shoe": ["1F45F", "&#x1F45F;"],
	        "bikini": ["1F459", "&#x1F459;"],
	        "dress": ["1F457", "&#x1F457;"],
	        "kimono": ["1F458", "&#x1F458;"],
	        "womans_clothes": ["1F45A", "&#x1F45A;"],
	        "shirt": ["1F455", "&#x1F455;"],
	        "necktie": ["1F454", "&#x1F454;"],
	        "jeans": ["1F456", "&#x1F456;"],
	        "door": ["1F6AA", "&#x1F6AA;"],
	        "shower": ["1F6BF", "&#x1F6BF;"],
	        "bathtub": ["1F6C1", "&#x1F6C1;"],
	        "toilet": ["1F6BD", "&#x1F6BD;"],
	        "barber": ["1F488", "&#x1F488;"],
	        "syringe": ["1F489", "&#x1F489;"],
	        "pill": ["1F48A", "&#x1F48A;"],
	        "microscope": ["1F52C", "&#x1F52C;"],
	        "telescope": ["1F52D", "&#x1F52D;"],
	        "crystal_ball": ["1F52E", "&#x1F52E;"],
	        "wrench": ["1F527", "&#x1F527;"],
	        "knife": ["1F52A", "&#x1F52A;"],
	        "nut_and_bolt": ["1F529", "&#x1F529;"],
	        "hammer": ["1F528", "&#x1F528;"],
	        "bomb": ["1F4A3", "&#x1F4A3;"],
	        "smoking": ["1F6AC", "&#x1F6AC;"],
	        "gun": ["1F52B", "&#x1F52B;"],
	        "bookmark": ["1F516", "&#x1F516;"],
	        "newspaper": ["1F4F0", "&#x1F4F0;"],
	        "newspaper2": ["1F5DE", "&#x1F5DE;"],
	        "thermometer": ["1F321", "&#x1F321;"],
	        "key": ["1F511", "&#x1F511;"],
	        "medal": ["1F3C5", "&#x1F3C5;"],
	        "envelope": ["2709", "&#x2709;"],
	        "envelope_with_arrow": ["1F4E9", "&#x1F4E9;"],
	        "incoming_envelope": ["1F4E8", "&#x1F4E8;"],
	        "e-mail": ["1F4E7", "&#x1F4E7;"],
	        "inbox_tray": ["1F4E5", "&#x1F4E5;"],
	        "outbox_tray": ["1F4E4", "&#x1F4E4;"],
	        "package": ["1F4E6", "&#x1F4E6;"],
	        "postal_horn": ["1F4EF", "&#x1F4EF;"],
	        "postbox": ["1F4EE", "&#x1F4EE;"],
	        "mailbox_closed": ["1F4EA", "&#x1F4EA;"],
	        "mailbox": ["1F4EB", "&#x1F4EB;"],
	        "mailbox_with_mail": ["1F4EC", "&#x1F4EC;"],
	        "mailbox_with_no_mail": ["1F4ED", "&#x1F4ED;"],
	        "page_facing_up": ["1F4C4", "&#x1F4C4;"],
	        "page_with_curl": ["1F4C3", "&#x1F4C3;"],
	        "bookmark_tabs": ["1F4D1", "&#x1F4D1;"],
	        "chart_with_upwards_trend": ["1F4C8", "&#x1F4C8;"],
	        "chart_with_downwards_trend": ["1F4C9", "&#x1F4C9;"],
	        "bar_chart": ["1F4CA", "&#x1F4CA;"],
	        "date": ["1F4C5", "&#x1F4C5;"],
	        "calendar": ["1F4C6", "&#x1F4C6;"],
	        "low_brightness": ["1F505", "&#x1F505;"],
	        "high_brightness": ["1F506", "&#x1F506;"],
	        "ballot_box": ["1F5F3", "&#x1F5F3;"],
	        "scroll": ["1F4DC", "&#x1F4DC;"],
	        "book": ["1F4D6", "&#x1F4D6;"],
	        "notebook": ["1F4D3", "&#x1F4D3;"],
	        "notebook_with_decorative_cover": ["1F4D4", "&#x1F4D4;"],
	        "ledger": ["1F4D2", "&#x1F4D2;"],
	        "closed_book": ["1F4D5", "&#x1F4D5;"],
	        "green_book": ["1F4D7", "&#x1F4D7;"],
	        "blue_book": ["1F4D8", "&#x1F4D8;"],
	        "orange_book": ["1F4D9", "&#x1F4D9;"],
	        "books": ["1F4DA", "&#x1F4DA;"],
	        "card_index": ["1F4C7", "&#x1F4C7;"],
	        "link": ["1F517", "&#x1F517;"],
	        "paperclip": ["1F4CE", "&#x1F4CE;"],
	        "pushpin": ["1F4CC", "&#x1F4CC;"],
	        "scissors": ["2702", "&#x2702;"],
	        "triangular_ruler": ["1F4D0", "&#x1F4D0;"],
	        "round_pushpin": ["1F4CD", "&#x1F4CD;"],
	        "straight_ruler": ["1F4CF", "&#x1F4CF;"],
	        "triangular_flag_on_post": ["1F6A9", "&#x1F6A9;"],
	        "flag_white": ["1F3F3", "&#x1F3F3;"],
	        "flag_black": ["1F3F4", "&#x1F3F4;"],
	        "hole": ["1F573", "&#x1F573;"],
	        "file_folder": ["1F4C1", "&#x1F4C1;"],
	        "open_file_folder": ["1F4C2", "&#x1F4C2;"],
	        "file_cabinet": ["1F5C4", "&#x1F5C4;"],
	        "pencil2": ["270F", "&#x270F;"],
	        "pen_ballpoint": ["1F58A", "&#x1F58A;"],
	        "paintbrush": ["1F58C", "&#x1F58C;"],
	        "crayon": ["1F58D", "&#x1F58D;"],
	        "pencil": ["1F4DD", "&#x1F4DD;"],
	        "lock_with_ink_pen": ["1F50F", "&#x1F50F;"],
	        "closed_lock_with_key": ["1F510", "&#x1F510;"],
	        "lock": ["1F512", "&#x1F512;"],
	        "unlock": ["1F513", "&#x1F513;"],
	        "mega": ["1F4E3", "&#x1F4E3;"],
	        "loudspeaker": ["1F4E2", "&#x1F4E2;"],
	        "speaker": ["1F508", "&#x1F508;"],
	        "sound": ["1F509", "&#x1F509;"],
	        "loud_sound": ["1F50A", "&#x1F50A;"],
	        "mute": ["1F507", "&#x1F507;"],
	        "zzz": ["1F4A4", "&#x1F4A4;"],
	        "bell": ["1F514", "&#x1F514;"],
	        "no_bell": ["1F515", "&#x1F515;"],
	        "dove": ["1F54A", "&#x1F54A;"],
	        "thought_balloon": ["1F4AD", "&#x1F4AD;"],
	        "speech_balloon": ["1F4AC", "&#x1F4AC;"],
	        "anger_right": ["1F5EF", "&#x1F5EF;"],
	        "children_crossing": ["1F6B8", "&#x1F6B8;"],
	        "mag": ["1F50D", "&#x1F50D;"],
	        "mag_right": ["1F50E", "&#x1F50E;"],
	        "no_entry_sign": ["1F6AB", "&#x1F6AB;"],
	        "no_entry": ["26D4", "&#x26D4;"],
	        "name_badge": ["1F4DB", "&#x1F4DB;"],
	        "no_pedestrians": ["1F6B7", "&#x1F6B7;"],
	        "do_not_litter": ["1F6AF", "&#x1F6AF;"],
	        "no_bicycles": ["1F6B3", "&#x1F6B3;"],
	        "non-potable_water": ["1F6B1", "&#x1F6B1;"],
	        "no_mobile_phones": ["1F4F5", "&#x1F4F5;"],
	        "underage": ["1F51E", "&#x1F51E;"],
	        "accept": ["1F251", "&#x1F251;"],
	        "ideograph_advantage": ["1F250", "&#x1F250;"],
	        "white_flower": ["1F4AE", "&#x1F4AE;"],
	        "secret": ["3299", "&#x3299;"],
	        "congratulations": ["3297", "&#x3297;"],
	        "u5408": ["1F234", "&#x1F234;"],
	        "u6e80": ["1F235", "&#x1F235;"],
	        "u7981": ["1F232", "&#x1F232;"],
	        "u6709": ["1F236", "&#x1F236;"],
	        "u7121": ["1F21A", "&#x1F21A;"],
	        "u7533": ["1F238", "&#x1F238;"],
	        "u55b6": ["1F23A", "&#x1F23A;"],
	        "u6708": ["1F237", "&#x1F237;"],
	        "u5272": ["1F239", "&#x1F239;"],
	        "u7a7a": ["1F233", "&#x1F233;"],
	        "sa": ["1F202", "&#x1F202;"],
	        "koko": ["1F201", "&#x1F201;"],
	        "u6307": ["1F22F", "&#x1F22F;"],
	        "chart": ["1F4B9", "&#x1F4B9;"],
	        "sparkle": ["2747", "&#x2747;"],
	        "eight_spoked_asterisk": ["2733", "&#x2733;"],
	        "negative_squared_cross_mark": ["274E", "&#x274E;"],
	        "white_check_mark": ["2705", "&#x2705;"],
	        "eight_pointed_black_star": ["2734", "&#x2734;"],
	        "vibration_mode": ["1F4F3", "&#x1F4F3;"],
	        "mobile_phone_off": ["1F4F4", "&#x1F4F4;"],
	        "vs": ["1F19A", "&#x1F19A;"],
	        "a": ["1F170", "&#x1F170;"],
	        "b": ["1F171", "&#x1F171;"],
	        "ab": ["1F18E", "&#x1F18E;"],
	        "cl": ["1F191", "&#x1F191;"],
	        "o2": ["1F17E", "&#x1F17E;"],
	        "sos": ["1F198", "&#x1F198;"],
	        "id": ["1F194", "&#x1F194;"],
	        "parking": ["1F17F", "&#x1F17F;"],
	        "wc": ["1F6BE", "&#x1F6BE;"],
	        "cool": ["1F192", "&#x1F192;"],
	        "free": ["1F193", "&#x1F193;"],
	        "new": ["1F195", "&#x1F195;"],
	        "ng": ["1F196", "&#x1F196;"],
	        "ok": ["1F197", "&#x1F197;"],
	        "atm": ["1F3E7", "&#x1F3E7;"],
	        "aries": ["2648", "&#x2648;"],
	        "taurus": ["2649", "&#x2649;"],
	        "gemini": ["264A", "&#x264A;"],
	        "cancer": ["264B", "&#x264B;"],
	        "leo": ["264C", "&#x264C;"],
	        "virgo": ["264D", "&#x264D;"],
	        "libra": ["264E", "&#x264E;"],
	        "scorpius": ["264F", "&#x264F;"],
	        "sagittarius": ["2650", "&#x2650;"],
	        "capricorn": ["2651", "&#x2651;"],
	        "aquarius": ["2652", "&#x2652;"],
	        "pisces": ["2653", "&#x2653;"],
	        "restroom": ["1F6BB", "&#x1F6BB;"],
	        "mens": ["1F6B9", "&#x1F6B9;"],
	        "womens": ["1F6BA", "&#x1F6BA;"],
	        "baby_symbol": ["1F6BC", "&#x1F6BC;"],
	        "wheelchair": ["267F", "&#x267F;"],
	        "potable_water": ["1F6B0", "&#x1F6B0;"],
	        "no_smoking": ["1F6AD", "&#x1F6AD;"],
	        "put_litter_in_its_place": ["1F6AE", "&#x1F6AE;"],
	        "arrow_forward": ["25B6", "&#x25B6;"],
	        "arrow_backward": ["25C0", "&#x25C0;"],
	        "arrow_up_small": ["1F53C", "&#x1F53C;"],
	        "arrow_down_small": ["1F53D", "&#x1F53D;"],
	        "fast_forward": ["23E9", "&#x23E9;"],
	        "rewind": ["23EA", "&#x23EA;"],
	        "arrow_double_up": ["23EB", "&#x23EB;"],
	        "arrow_double_down": ["23EC", "&#x23EC;"],
	        "arrow_right": ["27A1", "&#x27A1;"],
	        "arrow_left": ["2B05", "&#x2B05;"],
	        "arrow_up": ["2B06", "&#x2B06;"],
	        "arrow_down": ["2B07", "&#x2B07;"],
	        "arrow_upper_right": ["2197", "&#x2197;"],
	        "arrow_lower_right": ["2198", "&#x2198;"],
	        "arrow_lower_left": ["2199", "&#x2199;"],
	        "arrow_upper_left": ["2196", "&#x2196;"],
	        "arrow_up_down": ["2195", "&#x2195;"],
	        "left_right_arrow": ["2194", "&#x2194;"],
	        "arrows_counterclockwise": ["1F504", "&#x1F504;"],
	        "arrow_right_hook": ["21AA", "&#x21AA;"],
	        "leftwards_arrow_with_hook": ["21A9", "&#x21A9;"],
	        "arrow_heading_up": ["2934", "&#x2934;"],
	        "arrow_heading_down": ["2935", "&#x2935;"],
	        "twisted_rightwards_arrows": ["1F500", "&#x1F500;"],
	        "repeat": ["1F501", "&#x1F501;"],
	        "hash": ["0023-20E3", "&#x0023;-&#x20E3;"],
	        "zero": ["0030-20E3", "&#x0030;-&#x20E3;"],
	        "one": ["0031-20E3", "&#x0031;-&#x20E3;"],
	        "two": ["0032-20E3", "&#x0032;-&#x20E3;"],
	        "three": ["0033-20E3", "&#x0033;-&#x20E3;"],
	        "four": ["0034-20E3", "&#x0034;-&#x20E3;"],
	        "five": ["0035-20E3", "&#x0035;-&#x20E3;"],
	        "six": ["0036-20E3", "&#x0036;-&#x20E3;"],
	        "seven": ["0037-20E3", "&#x0037;-&#x20E3;"],
	        "eight": ["0038-20E3", "&#x0038;-&#x20E3;"],
	        "nine": ["0039-20E3", "&#x0039;-&#x20E3;"],
	        "keycap_ten": ["1F51F", "&#x1F51F;"],
	        "1234": ["1F522", "&#x1F522;"],
	        "abc": ["1F524", "&#x1F524;"],
	        "abcd": ["1F521", "&#x1F521;"],
	        "capital_abcd": ["1F520", "&#x1F520;"],
	        "information_source": ["2139", "&#x2139;"],
	        "cinema": ["1F3A6", "&#x1F3A6;"],
	        "symbols": ["1F523", "&#x1F523;"],
	        "heavy_plus_sign": ["2795", "&#x2795;"],
	        "heavy_minus_sign": ["2796", "&#x2796;"],
	        "heavy_division_sign": ["2797", "&#x2797;"],
	        "heavy_multiplication_x": ["2716", "&#x2716;"],
	        "heavy_check_mark": ["2714", "&#x2714;"],
	        "arrows_clockwise": ["1F503", "&#x1F503;"],
	        "tm": ["2122", "&#x2122;"],
	        "copyright": ["00A9", "&#x00A9;"],
	        "registered": ["00AE", "&#x00AE;"],
	        "currency_exchange": ["1F4B1", "&#x1F4B1;"],
	        "heavy_dollar_sign": ["1F4B2", "&#x1F4B2;"],
	        "curly_loop": ["27B0", "&#x27B0;"],
	        "loop": ["27BF", "&#x27BF;"],
	        "exclamation": ["2757", "&#x2757;"],
	        "question": ["2753", "&#x2753;"],
	        "grey_exclamation": ["2755", "&#x2755;"],
	        "grey_question": ["2754", "&#x2754;"],
	        "bangbang": ["203C", "&#x203C;"],
	        "x": ["274C", "&#x274C;"],
	        "o": ["2B55", "&#x2B55;"],
	        "100": ["1F4AF", "&#x1F4AF;"],
	        "end": ["1F51A", "&#x1F51A;"],
	        "back": ["1F519", "&#x1F519;"],
	        "on": ["1F51B", "&#x1F51B;"],
	        "top": ["1F51D", "&#x1F51D;"],
	        "soon": ["1F51C", "&#x1F51C;"],
	        "cyclone": ["1F300", "&#x1F300;"],
	        "m": ["24C2", "&#x24C2;"],
	        "ophiuchus": ["26CE", "&#x26CE;"],
	        "six_pointed_star": ["1F52F", "&#x1F52F;"],
	        "beginner": ["1F530", "&#x1F530;"],
	        "trident": ["1F531", "&#x1F531;"],
	        "hotsprings": ["2668", "&#x2668;"],
	        "recycle": ["267B", "&#x267B;"],
	        "anger": ["1F4A2", "&#x1F4A2;"],
	        "diamond_shape_with_a_dot_inside": ["1F4A0", "&#x1F4A0;"],
	        "spades": ["2660", "&#x2660;"],
	        "clubs": ["2663", "&#x2663;"],
	        "hearts": ["2665", "&#x2665;"],
	        "diamonds": ["2666", "&#x2666;"],
	        "ballot_box_with_check": ["2611", "&#x2611;"],
	        "white_circle": ["26AA", "&#x26AA;"],
	        "black_circle": ["26AB", "&#x26AB;"],
	        "radio_button": ["1F518", "&#x1F518;"],
	        "red_circle": ["1F534", "&#x1F534;"],
	        "large_blue_circle": ["1F535", "&#x1F535;"],
	        "small_red_triangle": ["1F53A", "&#x1F53A;"],
	        "small_red_triangle_down": ["1F53B", "&#x1F53B;"],
	        "small_orange_diamond": ["1F538", "&#x1F538;"],
	        "small_blue_diamond": ["1F539", "&#x1F539;"],
	        "large_orange_diamond": ["1F536", "&#x1F536;"],
	        "large_blue_diamond": ["1F537", "&#x1F537;"],
	        "black_small_square": ["25AA", "&#x25AA;"],
	        "white_small_square": ["25AB", "&#x25AB;"],
	        "black_large_square": ["2B1B", "&#x2B1B;"],
	        "white_large_square": ["2B1C", "&#x2B1C;"],
	        "black_medium_square": ["25FC", "&#x25FC;"],
	        "white_medium_square": ["25FB", "&#x25FB;"],
	        "black_medium_small_square": ["25FE", "&#x25FE;"],
	        "white_medium_small_square": ["25FD", "&#x25FD;"],
	        "black_square_button": ["1F532", "&#x1F532;"],
	        "white_square_button": ["1F533", "&#x1F533;"],
	        "clock1": ["1F550", "&#x1F550;"],
	        "clock2": ["1F551", "&#x1F551;"],
	        "clock3": ["1F552", "&#x1F552;"],
	        "clock4": ["1F553", "&#x1F553;"],
	        "clock5": ["1F554", "&#x1F554;"],
	        "clock6": ["1F555", "&#x1F555;"],
	        "clock7": ["1F556", "&#x1F556;"],
	        "clock8": ["1F557", "&#x1F557;"],
	        "clock9": ["1F558", "&#x1F558;"],
	        "clock10": ["1F559", "&#x1F559;"],
	        "clock11": ["1F55A", "&#x1F55A;"],
	        "clock12": ["1F55B", "&#x1F55B;"],
	        "clock130": ["1F55C", "&#x1F55C;"],
	        "clock230": ["1F55D", "&#x1F55D;"],
	        "clock330": ["1F55E", "&#x1F55E;"],
	        "clock430": ["1F55F", "&#x1F55F;"],
	        "clock530": ["1F560", "&#x1F560;"],
	        "clock630": ["1F561", "&#x1F561;"],
	        "clock730": ["1F562", "&#x1F562;"],
	        "clock830": ["1F563", "&#x1F563;"],
	        "clock930": ["1F564", "&#x1F564;"],
	        "clock1030": ["1F565", "&#x1F565;"],
	        "clock1130": ["1F566", "&#x1F566;"],
	        "clock1230": ["1F567", "&#x1F567;"]
	    }
	};

	var EMOJIS = {};
	var ORDERED_EMOJIS = [];

	Object.keys(EMOJI_CATEGORIES).forEach(function (categoryName) {
	    var emojis = EMOJI_CATEGORIES[categoryName];
	    Object.keys(emojis).forEach(function (slug) {
	        EMOJIS[slug] = emojis[slug];
	        EMOJI_CATEGORIES[categoryName][slug] = 1;
	        ORDERED_EMOJIS.push(slug);
	    });
	});

	module.exports = window.EMOJILIST = {
	    EMOJI_CATEGORIES: EMOJI_CATEGORIES,
	    EMOJIS: EMOJIS,
	    ORDERED_EMOJIS: ORDERED_EMOJIS
	};

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var ModalDialogsUI = __webpack_require__(13);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var ConversationsUI = __webpack_require__(4);
	var TypingAreaUI = __webpack_require__(16);
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
	                            { className: "link-button red " + (dontShowTruncateButton ? "disabled" : ""),
	                                onClick: function onClick(e) {
	                                    if ($(e.target).closest('.disabled').size() > 0) {
	                                        return false;
	                                    }
	                                    if (self.props.onTruncateClicked) {
	                                        self.props.onTruncateClicked();
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon rounded-stop" }),
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
	            messageToBeDeleted: null,
	            editing: false
	        };
	    },

	    uploadFromComputer: function uploadFromComputer() {
	        $('#fileselect3').trigger('click');
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

	        if (isAtBottom === true) {
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
	            if (localStorage.megaChatPresence !== 'unavailable') {
	                self.loadingShown = true;
	            }
	        } else if (self.props.chatRoom.messagesBuff.joined === true && (self.props.chatRoom.messagesBuff.messages.length === 0 || !self.props.chatRoom.messagesBuff.haveMoreHistory())) {
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

	            var selected = [];
	            sendContactDialog = React.makeElement(ModalDialogsUI.SelectContactDialog, {
	                megaChat: room.megaChat,
	                chatRoom: room,
	                exclude: excludedContacts,
	                contacts: M.u,
	                onClose: function onClose() {
	                    self.setState({ 'sendContactDialog': false });
	                    selected = [];
	                },
	                onSelected: function onSelected(nodes) {
	                    selected = nodes;
	                },
	                onSelectClicked: function onSelectClicked() {
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

	        if (window.location.hash === "#fm/chat") {

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
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var Tooltips = __webpack_require__(14);
	var Forms = __webpack_require__(15);

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
	                { className: "fm-dialog-footer" },
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
	            'selected': []
	        };
	    },
	    onEntryClick: function onEntryClick(e, node) {
	        e.stopPropagation();
	        e.preventDefault();

	        if (this.props.folderSelectNotAllowed === true && node.t === 1) {

	            return;
	        }
	        this.setState({ 'selected': [node.h] });
	        this.props.onSelected([node.h]);
	    },
	    onEntryDoubleClick: function onEntryDoubleClick(e, node) {
	        var self = this;

	        e.stopPropagation();
	        e.preventDefault();

	        if (node.t === 1) {

	            self.setState({ 'selected': [] });
	            self.props.onSelected([]);
	            self.props.onExpand(node);
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
	            var isSelected = self.state.selected.indexOf(node.h) !== -1;

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
	                    className: (isFolder ? " folder" : "") + (isSelected ? " ui-selected" : ""),
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
	        return React.makeElement(
	            utils.JScrollPane,
	            { className: "fm-dialog-grid-scroll", selected: this.state.selected },
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
	    }
	});
	var CloudBrowserDialog = React.createClass({
	    displayName: "CloudBrowserDialog",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'selectLabel': __("Attach"),
	            'cancelLabel': __("Cancel"),
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'sortBy': ['name', 'asc'],
	            'selected': [],
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
	    onAttachClicked: function onAttachClicked() {
	        this.props.onAttachClicked();
	    },
	    onPopupDidMount: function onPopupDidMount(elem) {
	        this.domNode = elem;
	    },
	    render: function render() {
	        var self = this;

	        var classes = "add-from-cloud " + self.props.className;

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
	                            self.props.onSelected([]);
	                        } },
	                    React.makeElement(
	                        "span",
	                        { className: "right-arrow-bg" },
	                        React.makeElement(
	                            "span",
	                            null,
	                            p.h === M.RootID ? __("Cloud Drive") : p.name
	                        )
	                    )
	                ));
	            })(p);
	        } while (p = M.d[M.d[p.h].p]);

	        return React.makeElement(
	            ModalDialog,
	            {
	                title: __("Add from your Cloud Drive"),
	                className: classes,
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                popupDidMount: self.onPopupDidMount,
	                buttons: [{
	                    "label": self.props.selectLabel,
	                    "key": "select",
	                    "className": self.state.selected.length === 0 ? "disabled" : null,
	                    "onClick": function onClick(e) {
	                        if (self.state.selected.length > 0) {
	                            self.props.onSelected(self.state.selected);
	                            self.props.onAttachClicked();
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
	            React.makeElement(
	                "div",
	                { className: "fm-breadcrumbs-block" },
	                breadcrumb,
	                React.makeElement("div", { className: "clear" })
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
	                    self.setState({ 'currentlyViewedEntry': node.h });
	                },
	                folderSelectNotAllowed: self.props.folderSelectNotAllowed,
	                onSelected: self.onSelected,
	                onAttachClicked: self.onAttachClicked
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
	            'selectLabel': __("Send"),
	            'cancelLabel': __("Cancel"),
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'selected': []
	        };
	    },
	    onSelected: function onSelected(nodes) {
	        this.setState({ 'selected': nodes });
	        this.props.onSelected(nodes);
	        this.forceUpdate();
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
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                buttons: [{
	                    "label": self.props.selectLabel,
	                    "key": "select",
	                    "className": self.state.selected.length === 0 ? "disabled" : null,
	                    "onClick": function onClick(e) {
	                        if (self.state.selected.length > 0) {
	                            self.props.onSelected(self.state.selected);
	                            self.props.onSelectClicked();
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
	                onClick: function onClick(contact, e) {
	                    var contactHash = contact.h;

	                    if (new Date() - self.clickTime < 500) {

	                        self.onSelected([contact.h]);
	                        self.props.onSelectClicked();
	                    } else {

	                        if (self.state.selected.indexOf(contactHash) === -1) {
	                            self.state.selected.push(contact.h);
	                            self.onSelected(self.state.selected);
	                        } else {
	                            removeValue(self.state.selected, contactHash);
	                            self.onSelected(self.state.selected);
	                        }
	                    }
	                    self.clickTime = new Date();
	                },
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
	            'confirmLabel': __("Continue"),
	            'cancelLabel': __("Cancel"),
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
/* 14 */
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
/* 15 */
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
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(8);
	var ModalDialogsUI = __webpack_require__(13);
	var DropdownsUI = __webpack_require__(9);
	var ContactsUI = __webpack_require__(10);
	var ConversationsUI = __webpack_require__(4);

	var TypingArea = React.createClass({
	    displayName: "TypingArea",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'textareaMaxHeight': 100
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

	        if (!self.typingTimeout) {
	            if (room && room.state === ChatRoom.STATE.READY && !self.iAmTyping) {
	                self.iAmTyping = true;
	                room.megaChat.karere.sendIsComposing(room.roomJid);
	            }
	        } else if (self.typingTimeout) {
	            clearTimeout(self.typingTimeout);
	        }

	        self.typingTimeout = setTimeout(function () {
	            self.stoppedTyping();
	        }, 2000);
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
	    stoppedTyping: function stoppedTyping() {
	        if (this.props.disabled) {
	            return;
	        }

	        var self = this;
	        var room = this.props.chatRoom;

	        if (self.typingTimeout) {
	            clearTimeout(self.typingTimeout);
	            self.typingTimeout = null;
	        }

	        if (self.iAmTyping) {

	            self.triggerOnUpdate();
	        }
	        if (room && room.state === ChatRoom.STATE.READY && self.iAmTyping === true) {
	            room.megaChat.karere.sendComposingPaused(room.roomJid);
	            self.iAmTyping = false;
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

	        if (val.length > 0) {
	            if (self.onConfirmTrigger(val) !== true) {
	                self.setState({ typedMessage: "" });
	            }
	            self.triggerOnUpdate();
	            return;
	        } else {

	            self.onCancelClicked(e);
	        }
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
	            megaChat.plugins.persistedTypeArea.removePersistedTypedValue(this.props.chatRoom);
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
	            self.stoppedTyping();
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
	                self.stoppedTyping();
	                e.preventDefault();
	            }
	        } else if (key === 38) {
	            if ($.trim(val).length === 0) {
	                if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
	                    self.stoppedTyping();
	                    e.preventDefault();
	                    return;
	                }
	            }
	        } else if (key === 27) {
	            if (self.props.showButtons === true) {
	                self.stoppedTyping();
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
	    updateScroll: function updateScroll(keyEvents) {
	        var self = this;

	        if (!self.isComponentEventuallyVisible()) {
	            return;
	        }

	        var $node = $(self.findDOMNode());

	        var $textarea = $('textarea:first', $node);
	        var $textareaClone = $('.message-preview', $node);
	        var textareaMaxHeight = self.props.textareaMaxHeight;
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
	            height: Math.min(self.state.textareaHeight, self.props.textareaMaxHeight)
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
	                        React.makeElement(DropdownsUI.DropdownEmojiSelector, {
	                            className: "popup emoji-one",
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
	            currentlyTyping: []
	        };
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = self.props.chatRoom.megaChat;

	        megaChat.karere.bind("onComposingMessage.whosTyping" + chatRoom.roomJid, function (e, eventObject) {
	            if (!self.isMounted()) {
	                return;
	            }
	            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
	                return;
	            }

	            var room = megaChat.chats[eventObject.getRoomJid()];
	            if (room.roomJid == chatRoom.roomJid) {
	                var currentlyTyping = self.state.currentlyTyping;
	                var u_h = megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u;

	                if (u_h === u_handle) {

	                    return;
	                }

	                currentlyTyping.push(u_h);
	                currentlyTyping = array_unique(currentlyTyping);
	                self.setState({
	                    currentlyTyping: currentlyTyping
	                });
	                self.forceUpdate();
	            }
	        });

	        megaChat.karere.rebind("onPausedMessage.whosTyping" + chatRoom.roomJid, function (e, eventObject) {
	            var room = megaChat.chats[eventObject.getRoomJid()];

	            if (!self.isMounted()) {
	                return;
	            }
	            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
	                return;
	            }

	            if (room.roomJid === chatRoom.roomJid) {
	                var currentlyTyping = self.state.currentlyTyping;
	                var u_h = megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u;
	                if (u_h === u_handle) {

	                    return;
	                }

	                if (currentlyTyping.indexOf(u_h) > -1) {
	                    removeValue(currentlyTyping, u_h);
	                    self.setState({
	                        currentlyTyping: currentlyTyping
	                    });
	                    self.forceUpdate();
	                }
	            }
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid);
	        megaChat.karere.unbind("onPausedMessage." + chatRoom.roomJid);
	    },
	    render: function render() {
	        var self = this;

	        var typingElement = null;

	        if (self.state.currentlyTyping.length > 0) {
	            var names = self.state.currentlyTyping.map(function (u_h) {
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
	var ModalDialogsUI = __webpack_require__(13);
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
	var TypingAreaUI = __webpack_require__(16);

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

	                    attachmentMeta.forEach(function (v) {
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
	                                    v.k = imagesListKey;
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
	                                }

	                                preview = src ? React.makeElement(
	                                    'div',
	                                    { id: v.h, className: 'shared-link img-block' },
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
	                                            window.location = "#fm/" + contact.u;
	                                        }
	                                    }),
	                                    React.makeElement('hr', null),
	                                    null,
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: 'conversations',
	                                        label: __(l[8632]),
	                                        onClick: function onClick() {
	                                            window.location = "#fm/chat/" + contact.u;
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
	                                            M.inviteContact(M.u[u_handle].m, contactEmail);

	                                            var title = l[150];

	                                            var msg = l[5898].replace('[X]', contactEmail);

	                                            closeDialog();
	                                            msgDialog('info', title, msg);
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
	                    messageDisplayBlock = React.makeElement(TypingAreaUI.TypingArea, {
	                        iconClass: 'small-icon writing-pen textarea-icon',
	                        initialText: message.textContents ? message.textContents : message.contents,
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
	                                    self.props.onEditDone(messageContents);
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
	                        { className: classes, key: k, onClick: function onClick() {
	                                button.callback();
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
	var ConversationPanelUI = __webpack_require__(12);

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
	    this.images = new MegaDataSortedMap("k", "delay", this);

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

	ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function () {
	    var self = this;

	    var $promise = new MegaPromise();

	    var anonId = "";

	    if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
	        anonId = self.megaChat.rtc.ownAnonId;
	    }
	    $.get("https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId).done(function (r) {
	        if (r.turn && r.turn.length > 0) {
	            var servers = [];
	            r.turn.forEach(function (v) {
	                var transport = v.transport;
	                if (!transport) {
	                    transport = "udp";
	                }

	                servers.push({
	                    url: 'turn:' + v.host + ':' + v.port + '?transport=' + transport,
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
	            window.location = '#fm/chat';
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
	    window.location = this.getRoomUrl();
	};

	ChatRoom.prototype.getRoomUrl = function () {
	    var self = this;
	    if (self.type === "private") {
	        var participants = self.getParticipantsExceptMe();
	        var contact = self.megaChat.getContactFromJid(participants[0]);
	        if (contact) {
	            return "#fm/chat/" + contact.u;
	        }
	    } else if (self.type === "group") {
	        return "#fm/chat/g/" + self.roomJid.split("@")[0];
	    } else {
	        throw new Error("Can't get room url for unknown room type.");
	    }
	};

	ChatRoom.prototype.activateWindow = function () {
	    var self = this;

	    window.location = self.getRoomUrl();
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
	                'key': node.key,
	                'k': node.k,
	                'a': node.a,
	                't': node.t,
	                'name': node.name,
	                's': node.s,
	                'fa': node.fa,
	                'ar': {
	                    'n': node.ar.n,
	                    't': node.ar.t,
	                    'c': node.ar.c
	                },
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