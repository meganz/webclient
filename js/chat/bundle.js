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
	module.exports = __webpack_require__(155);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var ConversationsUI = __webpack_require__(155);
	var ChatRoom = __webpack_require__(168);

	var disableMpEnc = true;

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

	            $promise = resp[2];

	            resp[1].show();
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
	        'loadbalancerService': 'gelb530n001.karere.mega.nz',
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
	            'karerePing': KarerePing
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

	Chat.prototype.renderConversationsApp = function () {};

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
	            v.setState(ChatRoom.STATE.INITIALIZED, true);
	        });
	    });

	    this.karere.bind("onUsersJoined", function (e, eventData) {
	        if (eventData.newUsers[self.karere.getJid()]) {

	            var iAmFirstToJoin = true;
	            Object.keys(eventData.currentUsers).forEach(function (k) {
	                if (k.indexOf(self.karere.getBareJid()) !== -1) {
	                    iAmFirstToJoin = false;
	                    return false;
	                }
	            });
	            if (iAmFirstToJoin) {
	                var room = self.chats[eventData.roomJid];

	                if (room) {
	                    self.sendBroadcastAction("conv-start", { roomJid: room.roomJid, type: room.type, participants: room.getParticipants() });
	                }
	            }
	        }
	        return self._onUsersUpdate("joined", e, eventData);
	    });

	    this.karere.bind("onUsersLeft", function (e, eventData) {
	        return self._onUsersUpdate("left", e, eventData);
	    });
	    this.karere.bind("onUsersUpdatedDone", function (e, eventObject) {
	        var room = self.chats[eventObject.getRoomJid()];
	        if (room && room.state == ChatRoom.STATE.JOINING) {
	            room.setState(ChatRoom.STATE.PLUGINS_PAUSED);
	        }
	    });

	    this.karere.bind("onChatMessage", function () {
	        self._onChatMessage.apply(self, arguments);
	    });

	    this.karere.bind("onActionMessage", function (e, eventObject) {
	        if (eventObject.isMyOwn(self.karere) === true || e.isPropagationStopped() === true) {
	            return;
	        }

	        var room;
	        var meta = eventObject.getMeta();
	        var fromMyDevice = Karere.getNormalizedBareJid(eventObject.getFromJid()) === self.karere.getBareJid();

	        if (eventObject.getAction() === "sync") {
	            room = self.chats[meta.roomJid];
	            room.sendMessagesSyncResponse(eventObject);
	        } else if (eventObject.getAction() === "syncResponse") {
	            room = self.chats[meta.roomJid];
	            room.handleSyncResponse(eventObject);
	        } else if (eventObject.getAction() === "cancel-attachment" && fromMyDevice === true) {
	            if (fromMyDevice === true) {
	                room = self.chats[meta.roomJid];
	                room.cancelAttachment(meta.messageId, meta.nodeId);
	            }
	        } else if (eventObject.getAction() === "conv-end") {
	            if (fromMyDevice === true) {
	                room = self.chats[meta.roomJid];
	                if (room && room._leaving !== true) {
	                    room.destroy(false);
	                }
	            } else {

	                room = self.chats[meta.roomJid];
	                if (room) {
	                    room._conversationEnded(eventObject.getFromJid());
	                }
	            }
	        } else if (eventObject.getAction() === "conv-start" && fromMyDevice === true) {
	            if (fromMyDevice) {
	                room = self.chats[meta.roomJid];
	                if (!room) {
	                    self.openChat(meta.participants, meta.type, undefined, undefined, undefined, false);
	                }
	            } else {
	                room = self.chats[meta.roomJid];
	                if (!room) {
	                    [room.$messages].forEach(function (v, k) {
	                        $(k).addClass("conv-start").removeClass("conv-end");
	                    });
	                }
	            }
	        } else {
	            self.logger.error("Not sure how to handle action message: ", eventObject.getAction(), eventObject, e);
	        }
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
	            });
	            return true;
	        } else {
	            if (presence === Karere.PRESENCE.OFFLINE) {
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
	                self.karere.connectionRetryManager.resetConnectionRetries();
	                self.karere.disconnect();
	            } else {
	                self.karere.connectionRetryManager.resetConnectionRetries();
	                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
	            }
	        }
	    });

	    $(window).unbind('hashchange.megaChat');
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
	        self.$conversationsApp = React.makeElement(ConversationsUI.ConversationsApp, { megaChat: self, contacts: M.u });

	        self.$conversationsAppInstance = ReactDOM.render(self.$conversationsApp, document.querySelector('.section.conversations'));

	        self.renderConversationsApp();
	    };

	    if (!appContainer) {
	        $(window).rebind('hashchange.delayedChatUiInit', function () {
	            appContainer = document.querySelector('.section.conversations');
	            if (appContainer) {
	                initAppUI();
	                $(window).unbind('hashchange.delayedChatUiInit');
	            }
	        });
	    } else {
	        initAppUI();
	    }

	    $(window).unbind('hashchange.chat').bind('hashchange.chat', function () {
	        if (window.location.hash.indexOf("/chat") !== -1) {
	            self.renderConversationsApp();
	        }
	    });

	    if (self.is_initialized) {
	        self.destroy().always(function () {
	            self.init();
	        });

	        return;
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

	    self.trigger("onInit");
	};

	Chat.prototype.getRoomFromUrlHash = function (urlHash) {
	    if (urlHash.indexOf("#") === 0) {
	        urlHash = urlHash.subtr(1, urlHash.length);
	    }
	    var contactHash = urlHash.replace("chat/", "");
	    if (!contactHash) {
	        return;
	    }

	    var chatRoom = this.getPrivateRoom(contactHash);
	    return chatRoom;
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
	        self.logger.debug("Empty message, MegaChat will not process it: ", eventObject);

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
	            $('.new-messages-indicator').text(unreadCount).removeClass('hidden');
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
	                self.chats[eventObject.getRoomJid()].destroy(true);
	            }
	        } else {
	            room = self.chats[eventObject.getRoomJid()];
	            if (room) {
	                if (room._conv_ended === true || typeof room._conv_ended === 'undefined') {
	                    room._conversationStarted(room.getParticipantsExceptMe()[0]);
	                }
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

	    if (contact && contact.name) {
	        name = contact.name;
	    } else if (contact && contact.m) {
	        name = contact.m;
	    }

	    assert(name, "Name not found for jid: " + jid);

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

	    return megaUserIdEncodeForXmpp(nodeId) + "@" + this.options.xmppDomain;
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
	            if (!contact || contact.c !== 1 && contact.c !== 2) {
	                allValid = false;
	                return false;
	            }
	        });
	        if (allValid === false) {
	            return MegaPromise.reject();
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

	    var roomFullJid = roomJid + "@" + self.karere.options.mucDomain;
	    if (self.chats[roomFullJid]) {
	        var room = self.chats[roomFullJid];
	        if (setAsActive) {
	            room.show();
	        }
	        return [roomFullJid, room, new $.Deferred().resolve(roomFullJid, room)];
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
	        return [roomJid, room, new MegaPromise().reject(roomJid, room)];
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

	    self.renderMyStatus();
	};

	Chat.prototype.processRemovedUser = function (u) {
	    var self = this;

	    self.logger.debug("removed: ", u);

	    var room = self.getPrivateRoom(u);
	    if (room) {
	        room.destroy(true);
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

	    self.renderConversationsApp();
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

	    self.renderConversationsApp();

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

	            if (sortedConversations.length > 1) {
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

	Chat.prototype.sendBroadcastAction = function (toRoomJid, action, meta) {
	    var self = this;

	    if (arguments.length === 2) {
	        meta = action;
	        action = toRoomJid;
	        toRoomJid = undefined;
	    }

	    var messageId = self.karere.generateMessageId(self.karere.getJid() + (toRoomJid ? toRoomJid : ""), JSON.stringify([action, meta]));

	    self.karere.sendAction(self.karere.getBareJid(), action, meta, messageId);
	    if (toRoomJid) {
	        self.karere.sendAction(toRoomJid, action, meta, messageId);
	    }
	};

	Chat.prototype.getPrivateRoom = function (h) {
	    var self = this;

	    var jid = self.getJidFromNodeId(h);

	    var found = false;
	    self.chats.forEach(function (v, k) {
	        if (v.getParticipantsExceptMe()[0] == jid) {
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

	Chat.prototype._destroyAllChatsFromChatd = function () {
	    var self = this;

	    asyncApiReq({ 'a': 'mcf' }).done(function (r) {
	        r.c.forEach(function (chatRoomMeta) {
	            if (chatRoomMeta.g === 1) {
	                console.error("Destroying: ", chatRoomMeta.id, chatRoomMeta.g, chatRoomMeta.u);
	                chatRoomMeta.u.forEach(function (u) {
	                    if (u.u !== u_handle) {
	                        api_req({
	                            a: 'mcr',
	                            id: chatRoomMeta.id,
	                            u: u.u
	                        });
	                    }
	                });
	                api_req({
	                    a: 'mcr',
	                    id: chatRoomMeta.id,
	                    u: u_handle
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
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(3);


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule React
	 */

	'use strict';

	var ReactDOM = __webpack_require__(4);
	var ReactDOMServer = __webpack_require__(144);
	var ReactIsomorphic = __webpack_require__(148);

	var assign = __webpack_require__(39);
	var deprecated = __webpack_require__(153);

	// `version` will be added here by ReactIsomorphic.
	var React = {};

	assign(React, ReactIsomorphic);

	assign(React, {
	  // ReactDOM
	  findDOMNode: deprecated('findDOMNode', 'ReactDOM', 'react-dom', ReactDOM, ReactDOM.findDOMNode),
	  render: deprecated('render', 'ReactDOM', 'react-dom', ReactDOM, ReactDOM.render),
	  unmountComponentAtNode: deprecated('unmountComponentAtNode', 'ReactDOM', 'react-dom', ReactDOM, ReactDOM.unmountComponentAtNode),

	  // ReactDOMServer
	  renderToString: deprecated('renderToString', 'ReactDOMServer', 'react-dom/server', ReactDOMServer, ReactDOMServer.renderToString),
	  renderToStaticMarkup: deprecated('renderToStaticMarkup', 'ReactDOMServer', 'react-dom/server', ReactDOMServer, ReactDOMServer.renderToStaticMarkup)
	});

	React.__SECRET_DOM_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactDOM;
	React.__SECRET_DOM_SERVER_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactDOMServer;

	module.exports = React;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOM
	 */

	/* globals __REACT_DEVTOOLS_GLOBAL_HOOK__*/

	'use strict';

	var ReactCurrentOwner = __webpack_require__(5);
	var ReactDOMTextComponent = __webpack_require__(6);
	var ReactDefaultInjection = __webpack_require__(71);
	var ReactInstanceHandles = __webpack_require__(45);
	var ReactMount = __webpack_require__(28);
	var ReactPerf = __webpack_require__(18);
	var ReactReconciler = __webpack_require__(50);
	var ReactUpdates = __webpack_require__(54);
	var ReactVersion = __webpack_require__(142);

	var findDOMNode = __webpack_require__(91);
	var renderSubtreeIntoContainer = __webpack_require__(143);
	var warning = __webpack_require__(25);

	ReactDefaultInjection.inject();

	var render = ReactPerf.measure('React', 'render', ReactMount.render);

	var React = {
	  findDOMNode: findDOMNode,
	  render: render,
	  unmountComponentAtNode: ReactMount.unmountComponentAtNode,
	  version: ReactVersion,

	  /* eslint-disable camelcase */
	  unstable_batchedUpdates: ReactUpdates.batchedUpdates,
	  unstable_renderSubtreeIntoContainer: renderSubtreeIntoContainer
	};

	// Inject the runtime into a devtools global hook regardless of browser.
	// Allows for debugging when the hook is injected on the page.
	/* eslint-enable camelcase */
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.inject === 'function') {
	  __REACT_DEVTOOLS_GLOBAL_HOOK__.inject({
	    CurrentOwner: ReactCurrentOwner,
	    InstanceHandles: ReactInstanceHandles,
	    Mount: ReactMount,
	    Reconciler: ReactReconciler,
	    TextComponent: ReactDOMTextComponent
	  });
	}

	if (false) {
	  var ExecutionEnvironment = require('fbjs/lib/ExecutionEnvironment');
	  if (ExecutionEnvironment.canUseDOM && window.top === window.self) {

	    // First check if devtools is not installed
	    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
	      // If we're in Chrome or Firefox, provide a download link if not installed.
	      if (navigator.userAgent.indexOf('Chrome') > -1 && navigator.userAgent.indexOf('Edge') === -1 || navigator.userAgent.indexOf('Firefox') > -1) {
	        console.debug('Download the React DevTools for a better development experience: ' + 'https://fb.me/react-devtools');
	      }
	    }

	    // If we're in IE8, check to see if we are in compatibility mode and provide
	    // information on preventing compatibility mode
	    var ieCompatibilityMode = document.documentMode && document.documentMode < 8;

	    process.env.NODE_ENV !== 'production' ? warning(!ieCompatibilityMode, 'Internet Explorer is running in compatibility mode; please add the ' + 'following tag to your HTML to prevent this from happening: ' + '<meta http-equiv="X-UA-Compatible" content="IE=edge" />') : undefined;

	    var expectedFeatures = [
	    // shims
	    Array.isArray, Array.prototype.every, Array.prototype.forEach, Array.prototype.indexOf, Array.prototype.map, Date.now, Function.prototype.bind, Object.keys, String.prototype.split, String.prototype.trim,

	    // shams
	    Object.create, Object.freeze];

	    for (var i = 0; i < expectedFeatures.length; i++) {
	      if (!expectedFeatures[i]) {
	        console.error('One or more ES5 shim/shams expected by React are not available: ' + 'https://fb.me/react-warning-polyfills');
	        break;
	      }
	    }
	  }
	}

	module.exports = React;

/***/ },
/* 5 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactCurrentOwner
	 */

	'use strict';

	/**
	 * Keeps track of the current owner.
	 *
	 * The current owner is the component who should own any components that are
	 * currently being constructed.
	 */
	var ReactCurrentOwner = {

	  /**
	   * @internal
	   * @type {ReactComponent}
	   */
	  current: null

	};

	module.exports = ReactCurrentOwner;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMTextComponent
	 * @typechecks static-only
	 */

	'use strict';

	var DOMChildrenOperations = __webpack_require__(7);
	var DOMPropertyOperations = __webpack_require__(22);
	var ReactComponentBrowserEnvironment = __webpack_require__(26);
	var ReactMount = __webpack_require__(28);

	var assign = __webpack_require__(39);
	var escapeTextContentForBrowser = __webpack_require__(21);
	var setTextContent = __webpack_require__(20);
	var validateDOMNesting = __webpack_require__(70);

	/**
	 * Text nodes violate a couple assumptions that React makes about components:
	 *
	 *  - When mounting text into the DOM, adjacent text nodes are merged.
	 *  - Text nodes cannot be assigned a React root ID.
	 *
	 * This component is used to wrap strings in elements so that they can undergo
	 * the same reconciliation that is applied to elements.
	 *
	 * TODO: Investigate representing React components in the DOM with text nodes.
	 *
	 * @class ReactDOMTextComponent
	 * @extends ReactComponent
	 * @internal
	 */
	var ReactDOMTextComponent = function (props) {
	  // This constructor and its argument is currently used by mocks.
	};

	assign(ReactDOMTextComponent.prototype, {

	  /**
	   * @param {ReactText} text
	   * @internal
	   */
	  construct: function (text) {
	    // TODO: This is really a ReactText (ReactNode), not a ReactElement
	    this._currentElement = text;
	    this._stringText = '' + text;

	    // Properties
	    this._rootNodeID = null;
	    this._mountIndex = 0;
	  },

	  /**
	   * Creates the markup for this text node. This node is not intended to have
	   * any features besides containing text content.
	   *
	   * @param {string} rootID DOM ID of the root node.
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @return {string} Markup for this text node.
	   * @internal
	   */
	  mountComponent: function (rootID, transaction, context) {
	    if (false) {
	      if (context[validateDOMNesting.ancestorInfoContextKey]) {
	        validateDOMNesting('span', null, context[validateDOMNesting.ancestorInfoContextKey]);
	      }
	    }

	    this._rootNodeID = rootID;
	    if (transaction.useCreateElement) {
	      var ownerDocument = context[ReactMount.ownerDocumentContextKey];
	      var el = ownerDocument.createElement('span');
	      DOMPropertyOperations.setAttributeForID(el, rootID);
	      // Populate node cache
	      ReactMount.getID(el);
	      setTextContent(el, this._stringText);
	      return el;
	    } else {
	      var escapedText = escapeTextContentForBrowser(this._stringText);

	      if (transaction.renderToStaticMarkup) {
	        // Normally we'd wrap this in a `span` for the reasons stated above, but
	        // since this is a situation where React won't take over (static pages),
	        // we can simply return the text as it is.
	        return escapedText;
	      }

	      return '<span ' + DOMPropertyOperations.createMarkupForID(rootID) + '>' + escapedText + '</span>';
	    }
	  },

	  /**
	   * Updates this component by updating the text content.
	   *
	   * @param {ReactText} nextText The next text content
	   * @param {ReactReconcileTransaction} transaction
	   * @internal
	   */
	  receiveComponent: function (nextText, transaction) {
	    if (nextText !== this._currentElement) {
	      this._currentElement = nextText;
	      var nextStringText = '' + nextText;
	      if (nextStringText !== this._stringText) {
	        // TODO: Save this as pending props and use performUpdateIfNecessary
	        // and/or updateComponent to do the actual update for consistency with
	        // other component types?
	        this._stringText = nextStringText;
	        var node = ReactMount.getNode(this._rootNodeID);
	        DOMChildrenOperations.updateTextContent(node, nextStringText);
	      }
	    }
	  },

	  unmountComponent: function () {
	    ReactComponentBrowserEnvironment.unmountIDFromEnvironment(this._rootNodeID);
	  }

	});

	module.exports = ReactDOMTextComponent;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule DOMChildrenOperations
	 * @typechecks static-only
	 */

	'use strict';

	var Danger = __webpack_require__(8);
	var ReactMultiChildUpdateTypes = __webpack_require__(16);
	var ReactPerf = __webpack_require__(18);

	var setInnerHTML = __webpack_require__(19);
	var setTextContent = __webpack_require__(20);
	var invariant = __webpack_require__(13);

	/**
	 * Inserts `childNode` as a child of `parentNode` at the `index`.
	 *
	 * @param {DOMElement} parentNode Parent node in which to insert.
	 * @param {DOMElement} childNode Child node to insert.
	 * @param {number} index Index at which to insert the child.
	 * @internal
	 */
	function insertChildAt(parentNode, childNode, index) {
	  // By exploiting arrays returning `undefined` for an undefined index, we can
	  // rely exclusively on `insertBefore(node, null)` instead of also using
	  // `appendChild(node)`. However, using `undefined` is not allowed by all
	  // browsers so we must replace it with `null`.

	  // fix render order error in safari
	  // IE8 will throw error when index out of list size.
	  var beforeChild = index >= parentNode.childNodes.length ? null : parentNode.childNodes.item(index);

	  parentNode.insertBefore(childNode, beforeChild);
	}

	/**
	 * Operations for updating with DOM children.
	 */
	var DOMChildrenOperations = {

	  dangerouslyReplaceNodeWithMarkup: Danger.dangerouslyReplaceNodeWithMarkup,

	  updateTextContent: setTextContent,

	  /**
	   * Updates a component's children by processing a series of updates. The
	   * update configurations are each expected to have a `parentNode` property.
	   *
	   * @param {array<object>} updates List of update configurations.
	   * @param {array<string>} markupList List of markup strings.
	   * @internal
	   */
	  processUpdates: function (updates, markupList) {
	    var update;
	    // Mapping from parent IDs to initial child orderings.
	    var initialChildren = null;
	    // List of children that will be moved or removed.
	    var updatedChildren = null;

	    for (var i = 0; i < updates.length; i++) {
	      update = updates[i];
	      if (update.type === ReactMultiChildUpdateTypes.MOVE_EXISTING || update.type === ReactMultiChildUpdateTypes.REMOVE_NODE) {
	        var updatedIndex = update.fromIndex;
	        var updatedChild = update.parentNode.childNodes[updatedIndex];
	        var parentID = update.parentID;

	        !updatedChild ?  false ? invariant(false, 'processUpdates(): Unable to find child %s of element. This ' + 'probably means the DOM was unexpectedly mutated (e.g., by the ' + 'browser), usually due to forgetting a <tbody> when using tables, ' + 'nesting tags like <form>, <p>, or <a>, or using non-SVG elements ' + 'in an <svg> parent. Try inspecting the child nodes of the element ' + 'with React ID `%s`.', updatedIndex, parentID) : invariant(false) : undefined;

	        initialChildren = initialChildren || {};
	        initialChildren[parentID] = initialChildren[parentID] || [];
	        initialChildren[parentID][updatedIndex] = updatedChild;

	        updatedChildren = updatedChildren || [];
	        updatedChildren.push(updatedChild);
	      }
	    }

	    var renderedMarkup;
	    // markupList is either a list of markup or just a list of elements
	    if (markupList.length && typeof markupList[0] === 'string') {
	      renderedMarkup = Danger.dangerouslyRenderMarkup(markupList);
	    } else {
	      renderedMarkup = markupList;
	    }

	    // Remove updated children first so that `toIndex` is consistent.
	    if (updatedChildren) {
	      for (var j = 0; j < updatedChildren.length; j++) {
	        updatedChildren[j].parentNode.removeChild(updatedChildren[j]);
	      }
	    }

	    for (var k = 0; k < updates.length; k++) {
	      update = updates[k];
	      switch (update.type) {
	        case ReactMultiChildUpdateTypes.INSERT_MARKUP:
	          insertChildAt(update.parentNode, renderedMarkup[update.markupIndex], update.toIndex);
	          break;
	        case ReactMultiChildUpdateTypes.MOVE_EXISTING:
	          insertChildAt(update.parentNode, initialChildren[update.parentID][update.fromIndex], update.toIndex);
	          break;
	        case ReactMultiChildUpdateTypes.SET_MARKUP:
	          setInnerHTML(update.parentNode, update.content);
	          break;
	        case ReactMultiChildUpdateTypes.TEXT_CONTENT:
	          setTextContent(update.parentNode, update.content);
	          break;
	        case ReactMultiChildUpdateTypes.REMOVE_NODE:
	          // Already removed by the for-loop above.
	          break;
	      }
	    }
	  }

	};

	ReactPerf.measureMethods(DOMChildrenOperations, 'DOMChildrenOperations', {
	  updateTextContent: 'updateTextContent'
	});

	module.exports = DOMChildrenOperations;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Danger
	 * @typechecks static-only
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var createNodesFromMarkup = __webpack_require__(10);
	var emptyFunction = __webpack_require__(15);
	var getMarkupWrap = __webpack_require__(14);
	var invariant = __webpack_require__(13);

	var OPEN_TAG_NAME_EXP = /^(<[^ \/>]+)/;
	var RESULT_INDEX_ATTR = 'data-danger-index';

	/**
	 * Extracts the `nodeName` from a string of markup.
	 *
	 * NOTE: Extracting the `nodeName` does not require a regular expression match
	 * because we make assumptions about React-generated markup (i.e. there are no
	 * spaces surrounding the opening tag and there is at least one attribute).
	 *
	 * @param {string} markup String of markup.
	 * @return {string} Node name of the supplied markup.
	 * @see http://jsperf.com/extract-nodename
	 */
	function getNodeName(markup) {
	  return markup.substring(1, markup.indexOf(' '));
	}

	var Danger = {

	  /**
	   * Renders markup into an array of nodes. The markup is expected to render
	   * into a list of root nodes. Also, the length of `resultList` and
	   * `markupList` should be the same.
	   *
	   * @param {array<string>} markupList List of markup strings to render.
	   * @return {array<DOMElement>} List of rendered nodes.
	   * @internal
	   */
	  dangerouslyRenderMarkup: function (markupList) {
	    !ExecutionEnvironment.canUseDOM ?  false ? invariant(false, 'dangerouslyRenderMarkup(...): Cannot render markup in a worker ' + 'thread. Make sure `window` and `document` are available globally ' + 'before requiring React when unit testing or use ' + 'ReactDOMServer.renderToString for server rendering.') : invariant(false) : undefined;
	    var nodeName;
	    var markupByNodeName = {};
	    // Group markup by `nodeName` if a wrap is necessary, else by '*'.
	    for (var i = 0; i < markupList.length; i++) {
	      !markupList[i] ?  false ? invariant(false, 'dangerouslyRenderMarkup(...): Missing markup.') : invariant(false) : undefined;
	      nodeName = getNodeName(markupList[i]);
	      nodeName = getMarkupWrap(nodeName) ? nodeName : '*';
	      markupByNodeName[nodeName] = markupByNodeName[nodeName] || [];
	      markupByNodeName[nodeName][i] = markupList[i];
	    }
	    var resultList = [];
	    var resultListAssignmentCount = 0;
	    for (nodeName in markupByNodeName) {
	      if (!markupByNodeName.hasOwnProperty(nodeName)) {
	        continue;
	      }
	      var markupListByNodeName = markupByNodeName[nodeName];

	      // This for-in loop skips the holes of the sparse array. The order of
	      // iteration should follow the order of assignment, which happens to match
	      // numerical index order, but we don't rely on that.
	      var resultIndex;
	      for (resultIndex in markupListByNodeName) {
	        if (markupListByNodeName.hasOwnProperty(resultIndex)) {
	          var markup = markupListByNodeName[resultIndex];

	          // Push the requested markup with an additional RESULT_INDEX_ATTR
	          // attribute.  If the markup does not start with a < character, it
	          // will be discarded below (with an appropriate console.error).
	          markupListByNodeName[resultIndex] = markup.replace(OPEN_TAG_NAME_EXP,
	          // This index will be parsed back out below.
	          '$1 ' + RESULT_INDEX_ATTR + '="' + resultIndex + '" ');
	        }
	      }

	      // Render each group of markup with similar wrapping `nodeName`.
	      var renderNodes = createNodesFromMarkup(markupListByNodeName.join(''), emptyFunction // Do nothing special with <script> tags.
	      );

	      for (var j = 0; j < renderNodes.length; ++j) {
	        var renderNode = renderNodes[j];
	        if (renderNode.hasAttribute && renderNode.hasAttribute(RESULT_INDEX_ATTR)) {

	          resultIndex = +renderNode.getAttribute(RESULT_INDEX_ATTR);
	          renderNode.removeAttribute(RESULT_INDEX_ATTR);

	          !!resultList.hasOwnProperty(resultIndex) ?  false ? invariant(false, 'Danger: Assigning to an already-occupied result index.') : invariant(false) : undefined;

	          resultList[resultIndex] = renderNode;

	          // This should match resultList.length and markupList.length when
	          // we're done.
	          resultListAssignmentCount += 1;
	        } else if (false) {
	          console.error('Danger: Discarding unexpected node:', renderNode);
	        }
	      }
	    }

	    // Although resultList was populated out of order, it should now be a dense
	    // array.
	    !(resultListAssignmentCount === resultList.length) ?  false ? invariant(false, 'Danger: Did not assign to every index of resultList.') : invariant(false) : undefined;

	    !(resultList.length === markupList.length) ?  false ? invariant(false, 'Danger: Expected markup to render %s nodes, but rendered %s.', markupList.length, resultList.length) : invariant(false) : undefined;

	    return resultList;
	  },

	  /**
	   * Replaces a node with a string of markup at its current position within its
	   * parent. The markup must render into a single root node.
	   *
	   * @param {DOMElement} oldChild Child node to replace.
	   * @param {string} markup Markup to render in place of the child node.
	   * @internal
	   */
	  dangerouslyReplaceNodeWithMarkup: function (oldChild, markup) {
	    !ExecutionEnvironment.canUseDOM ?  false ? invariant(false, 'dangerouslyReplaceNodeWithMarkup(...): Cannot render markup in a ' + 'worker thread. Make sure `window` and `document` are available ' + 'globally before requiring React when unit testing or use ' + 'ReactDOMServer.renderToString() for server rendering.') : invariant(false) : undefined;
	    !markup ?  false ? invariant(false, 'dangerouslyReplaceNodeWithMarkup(...): Missing markup.') : invariant(false) : undefined;
	    !(oldChild.tagName.toLowerCase() !== 'html') ?  false ? invariant(false, 'dangerouslyReplaceNodeWithMarkup(...): Cannot replace markup of the ' + '<html> node. This is because browser quirks make this unreliable ' + 'and/or slow. If you want to render to the root you must use ' + 'server rendering. See ReactDOMServer.renderToString().') : invariant(false) : undefined;

	    var newChild;
	    if (typeof markup === 'string') {
	      newChild = createNodesFromMarkup(markup, emptyFunction)[0];
	    } else {
	      newChild = markup;
	    }
	    oldChild.parentNode.replaceChild(newChild, oldChild);
	  }

	};

	module.exports = Danger;

/***/ },
/* 9 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ExecutionEnvironment
	 */

	'use strict';

	var canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);

	/**
	 * Simple, lightweight module assisting with the detection and context of
	 * Worker. Helps avoid circular dependencies and allows code to reason about
	 * whether or not they are in a Worker, even if they never include the main
	 * `ReactWorker` dependency.
	 */
	var ExecutionEnvironment = {

	  canUseDOM: canUseDOM,

	  canUseWorkers: typeof Worker !== 'undefined',

	  canUseEventListeners: canUseDOM && !!(window.addEventListener || window.attachEvent),

	  canUseViewport: canUseDOM && !!window.screen,

	  isInWorker: !canUseDOM // For now, this is true - might change in the future.

	};

	module.exports = ExecutionEnvironment;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule createNodesFromMarkup
	 * @typechecks
	 */

	/*eslint-disable fb-www/unsafe-html*/

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var createArrayFromMixed = __webpack_require__(11);
	var getMarkupWrap = __webpack_require__(14);
	var invariant = __webpack_require__(13);

	/**
	 * Dummy container used to render all markup.
	 */
	var dummyNode = ExecutionEnvironment.canUseDOM ? document.createElement('div') : null;

	/**
	 * Pattern used by `getNodeName`.
	 */
	var nodeNamePattern = /^\s*<(\w+)/;

	/**
	 * Extracts the `nodeName` of the first element in a string of markup.
	 *
	 * @param {string} markup String of markup.
	 * @return {?string} Node name of the supplied markup.
	 */
	function getNodeName(markup) {
	  var nodeNameMatch = markup.match(nodeNamePattern);
	  return nodeNameMatch && nodeNameMatch[1].toLowerCase();
	}

	/**
	 * Creates an array containing the nodes rendered from the supplied markup. The
	 * optionally supplied `handleScript` function will be invoked once for each
	 * <script> element that is rendered. If no `handleScript` function is supplied,
	 * an exception is thrown if any <script> elements are rendered.
	 *
	 * @param {string} markup A string of valid HTML markup.
	 * @param {?function} handleScript Invoked once for each rendered <script>.
	 * @return {array<DOMElement|DOMTextNode>} An array of rendered nodes.
	 */
	function createNodesFromMarkup(markup, handleScript) {
	  var node = dummyNode;
	  !!!dummyNode ?  false ? invariant(false, 'createNodesFromMarkup dummy not initialized') : invariant(false) : undefined;
	  var nodeName = getNodeName(markup);

	  var wrap = nodeName && getMarkupWrap(nodeName);
	  if (wrap) {
	    node.innerHTML = wrap[1] + markup + wrap[2];

	    var wrapDepth = wrap[0];
	    while (wrapDepth--) {
	      node = node.lastChild;
	    }
	  } else {
	    node.innerHTML = markup;
	  }

	  var scripts = node.getElementsByTagName('script');
	  if (scripts.length) {
	    !handleScript ?  false ? invariant(false, 'createNodesFromMarkup(...): Unexpected <script> element rendered.') : invariant(false) : undefined;
	    createArrayFromMixed(scripts).forEach(handleScript);
	  }

	  var nodes = createArrayFromMixed(node.childNodes);
	  while (node.lastChild) {
	    node.removeChild(node.lastChild);
	  }
	  return nodes;
	}

	module.exports = createNodesFromMarkup;

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule createArrayFromMixed
	 * @typechecks
	 */

	'use strict';

	var toArray = __webpack_require__(12);

	/**
	 * Perform a heuristic test to determine if an object is "array-like".
	 *
	 *   A monk asked Joshu, a Zen master, "Has a dog Buddha nature?"
	 *   Joshu replied: "Mu."
	 *
	 * This function determines if its argument has "array nature": it returns
	 * true if the argument is an actual array, an `arguments' object, or an
	 * HTMLCollection (e.g. node.childNodes or node.getElementsByTagName()).
	 *
	 * It will return false for other array-like objects like Filelist.
	 *
	 * @param {*} obj
	 * @return {boolean}
	 */
	function hasArrayNature(obj) {
	  return(
	    // not null/false
	    !!obj && (
	    // arrays are objects, NodeLists are functions in Safari
	    typeof obj == 'object' || typeof obj == 'function') &&
	    // quacks like an array
	    'length' in obj &&
	    // not window
	    !('setInterval' in obj) &&
	    // no DOM node should be considered an array-like
	    // a 'select' element has 'length' and 'item' properties on IE8
	    typeof obj.nodeType != 'number' && (
	    // a real array
	    Array.isArray(obj) ||
	    // arguments
	    'callee' in obj ||
	    // HTMLCollection/NodeList
	    'item' in obj)
	  );
	}

	/**
	 * Ensure that the argument is an array by wrapping it in an array if it is not.
	 * Creates a copy of the argument if it is already an array.
	 *
	 * This is mostly useful idiomatically:
	 *
	 *   var createArrayFromMixed = require('createArrayFromMixed');
	 *
	 *   function takesOneOrMoreThings(things) {
	 *     things = createArrayFromMixed(things);
	 *     ...
	 *   }
	 *
	 * This allows you to treat `things' as an array, but accept scalars in the API.
	 *
	 * If you need to convert an array-like object, like `arguments`, into an array
	 * use toArray instead.
	 *
	 * @param {*} obj
	 * @return {array}
	 */
	function createArrayFromMixed(obj) {
	  if (!hasArrayNature(obj)) {
	    return [obj];
	  } else if (Array.isArray(obj)) {
	    return obj.slice();
	  } else {
	    return toArray(obj);
	  }
	}

	module.exports = createArrayFromMixed;

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule toArray
	 * @typechecks
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * Convert array-like objects to arrays.
	 *
	 * This API assumes the caller knows the contents of the data type. For less
	 * well defined inputs use createArrayFromMixed.
	 *
	 * @param {object|function|filelist} obj
	 * @return {array}
	 */
	function toArray(obj) {
	  var length = obj.length;

	  // Some browse builtin objects can report typeof 'function' (e.g. NodeList in
	  // old versions of Safari).
	  !(!Array.isArray(obj) && (typeof obj === 'object' || typeof obj === 'function')) ?  false ? invariant(false, 'toArray: Array-like object expected') : invariant(false) : undefined;

	  !(typeof length === 'number') ?  false ? invariant(false, 'toArray: Object needs a length property') : invariant(false) : undefined;

	  !(length === 0 || length - 1 in obj) ?  false ? invariant(false, 'toArray: Object should have keys for indices') : invariant(false) : undefined;

	  // Old IE doesn't give collections access to hasOwnProperty. Assume inputs
	  // without method will throw during the slice call and skip straight to the
	  // fallback.
	  if (obj.hasOwnProperty) {
	    try {
	      return Array.prototype.slice.call(obj);
	    } catch (e) {
	      // IE < 9 does not support Array#slice on collections objects
	    }
	  }

	  // Fall back to copying key by key. This assumes all keys have a value,
	  // so will not preserve sparsely populated inputs.
	  var ret = Array(length);
	  for (var ii = 0; ii < length; ii++) {
	    ret[ii] = obj[ii];
	  }
	  return ret;
	}

	module.exports = toArray;

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule invariant
	 */

	'use strict';

	/**
	 * Use invariant() to assert state which your program assumes to be true.
	 *
	 * Provide sprintf-style format (only %s is supported) and arguments
	 * to provide information about what broke and what you were
	 * expecting.
	 *
	 * The invariant message will be stripped in production, but the invariant
	 * will remain to ensure logic does not differ in production.
	 */

	function invariant(condition, format, a, b, c, d, e, f) {
	  if (false) {
	    if (format === undefined) {
	      throw new Error('invariant requires an error message argument');
	    }
	  }

	  if (!condition) {
	    var error;
	    if (format === undefined) {
	      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
	    } else {
	      var args = [a, b, c, d, e, f];
	      var argIndex = 0;
	      error = new Error(format.replace(/%s/g, function () {
	        return args[argIndex++];
	      }));
	      error.name = 'Invariant Violation';
	    }

	    error.framesToPop = 1; // we don't care about invariant's own frame
	    throw error;
	  }
	}

	module.exports = invariant;

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getMarkupWrap
	 */

	/*eslint-disable fb-www/unsafe-html */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var invariant = __webpack_require__(13);

	/**
	 * Dummy container used to detect which wraps are necessary.
	 */
	var dummyNode = ExecutionEnvironment.canUseDOM ? document.createElement('div') : null;

	/**
	 * Some browsers cannot use `innerHTML` to render certain elements standalone,
	 * so we wrap them, render the wrapped nodes, then extract the desired node.
	 *
	 * In IE8, certain elements cannot render alone, so wrap all elements ('*').
	 */

	var shouldWrap = {};

	var selectWrap = [1, '<select multiple="true">', '</select>'];
	var tableWrap = [1, '<table>', '</table>'];
	var trWrap = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

	var svgWrap = [1, '<svg xmlns="http://www.w3.org/2000/svg">', '</svg>'];

	var markupWrap = {
	  '*': [1, '?<div>', '</div>'],

	  'area': [1, '<map>', '</map>'],
	  'col': [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
	  'legend': [1, '<fieldset>', '</fieldset>'],
	  'param': [1, '<object>', '</object>'],
	  'tr': [2, '<table><tbody>', '</tbody></table>'],

	  'optgroup': selectWrap,
	  'option': selectWrap,

	  'caption': tableWrap,
	  'colgroup': tableWrap,
	  'tbody': tableWrap,
	  'tfoot': tableWrap,
	  'thead': tableWrap,

	  'td': trWrap,
	  'th': trWrap
	};

	// Initialize the SVG elements since we know they'll always need to be wrapped
	// consistently. If they are created inside a <div> they will be initialized in
	// the wrong namespace (and will not display).
	var svgElements = ['circle', 'clipPath', 'defs', 'ellipse', 'g', 'image', 'line', 'linearGradient', 'mask', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'stop', 'text', 'tspan'];
	svgElements.forEach(function (nodeName) {
	  markupWrap[nodeName] = svgWrap;
	  shouldWrap[nodeName] = true;
	});

	/**
	 * Gets the markup wrap configuration for the supplied `nodeName`.
	 *
	 * NOTE: This lazily detects which wraps are necessary for the current browser.
	 *
	 * @param {string} nodeName Lowercase `nodeName`.
	 * @return {?array} Markup wrap configuration, if applicable.
	 */
	function getMarkupWrap(nodeName) {
	  !!!dummyNode ?  false ? invariant(false, 'Markup wrapping node not initialized') : invariant(false) : undefined;
	  if (!markupWrap.hasOwnProperty(nodeName)) {
	    nodeName = '*';
	  }
	  if (!shouldWrap.hasOwnProperty(nodeName)) {
	    if (nodeName === '*') {
	      dummyNode.innerHTML = '<link />';
	    } else {
	      dummyNode.innerHTML = '<' + nodeName + '></' + nodeName + '>';
	    }
	    shouldWrap[nodeName] = !dummyNode.firstChild;
	  }
	  return shouldWrap[nodeName] ? markupWrap[nodeName] : null;
	}

	module.exports = getMarkupWrap;

/***/ },
/* 15 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule emptyFunction
	 */

	"use strict";

	function makeEmptyFunction(arg) {
	  return function () {
	    return arg;
	  };
	}

	/**
	 * This function accepts and discards inputs; it has no side effects. This is
	 * primarily useful idiomatically for overridable function endpoints which
	 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
	 */
	function emptyFunction() {}

	emptyFunction.thatReturns = makeEmptyFunction;
	emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
	emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
	emptyFunction.thatReturnsNull = makeEmptyFunction(null);
	emptyFunction.thatReturnsThis = function () {
	  return this;
	};
	emptyFunction.thatReturnsArgument = function (arg) {
	  return arg;
	};

	module.exports = emptyFunction;

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactMultiChildUpdateTypes
	 */

	'use strict';

	var keyMirror = __webpack_require__(17);

	/**
	 * When a component's children are updated, a series of update configuration
	 * objects are created in order to batch and serialize the required changes.
	 *
	 * Enumerates all the possible types of update configurations.
	 *
	 * @internal
	 */
	var ReactMultiChildUpdateTypes = keyMirror({
	  INSERT_MARKUP: null,
	  MOVE_EXISTING: null,
	  REMOVE_NODE: null,
	  SET_MARKUP: null,
	  TEXT_CONTENT: null
	});

	module.exports = ReactMultiChildUpdateTypes;

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule keyMirror
	 * @typechecks static-only
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * Constructs an enumeration with keys equal to their value.
	 *
	 * For example:
	 *
	 *   var COLORS = keyMirror({blue: null, red: null});
	 *   var myColor = COLORS.blue;
	 *   var isColorValid = !!COLORS[myColor];
	 *
	 * The last line could not be performed if the values of the generated enum were
	 * not equal to their keys.
	 *
	 *   Input:  {key1: val1, key2: val2}
	 *   Output: {key1: key1, key2: key2}
	 *
	 * @param {object} obj
	 * @return {object}
	 */
	var keyMirror = function (obj) {
	  var ret = {};
	  var key;
	  !(obj instanceof Object && !Array.isArray(obj)) ?  false ? invariant(false, 'keyMirror(...): Argument must be an object.') : invariant(false) : undefined;
	  for (key in obj) {
	    if (!obj.hasOwnProperty(key)) {
	      continue;
	    }
	    ret[key] = key;
	  }
	  return ret;
	};

	module.exports = keyMirror;

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactPerf
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * ReactPerf is a general AOP system designed to measure performance. This
	 * module only has the hooks: see ReactDefaultPerf for the analysis tool.
	 */
	var ReactPerf = {
	  /**
	   * Boolean to enable/disable measurement. Set to false by default to prevent
	   * accidental logging and perf loss.
	   */
	  enableMeasure: false,

	  /**
	   * Holds onto the measure function in use. By default, don't measure
	   * anything, but we'll override this if we inject a measure function.
	   */
	  storedMeasure: _noMeasure,

	  /**
	   * @param {object} object
	   * @param {string} objectName
	   * @param {object<string>} methodNames
	   */
	  measureMethods: function (object, objectName, methodNames) {
	    if (false) {
	      for (var key in methodNames) {
	        if (!methodNames.hasOwnProperty(key)) {
	          continue;
	        }
	        object[key] = ReactPerf.measure(objectName, methodNames[key], object[key]);
	      }
	    }
	  },

	  /**
	   * Use this to wrap methods you want to measure. Zero overhead in production.
	   *
	   * @param {string} objName
	   * @param {string} fnName
	   * @param {function} func
	   * @return {function}
	   */
	  measure: function (objName, fnName, func) {
	    if (false) {
	      var measuredFunc = null;
	      var wrapper = function () {
	        if (ReactPerf.enableMeasure) {
	          if (!measuredFunc) {
	            measuredFunc = ReactPerf.storedMeasure(objName, fnName, func);
	          }
	          return measuredFunc.apply(this, arguments);
	        }
	        return func.apply(this, arguments);
	      };
	      wrapper.displayName = objName + '_' + fnName;
	      return wrapper;
	    }
	    return func;
	  },

	  injection: {
	    /**
	     * @param {function} measure
	     */
	    injectMeasure: function (measure) {
	      ReactPerf.storedMeasure = measure;
	    }
	  }
	};

	/**
	 * Simply passes through the measured function, without measuring it.
	 *
	 * @param {string} objName
	 * @param {string} fnName
	 * @param {function} func
	 * @return {function}
	 */
	function _noMeasure(objName, fnName, func) {
	  return func;
	}

	module.exports = ReactPerf;

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule setInnerHTML
	 */

	/* globals MSApp */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var WHITESPACE_TEST = /^[ \r\n\t\f]/;
	var NONVISIBLE_TEST = /<(!--|link|noscript|meta|script|style)[ \r\n\t\f\/>]/;

	/**
	 * Set the innerHTML property of a node, ensuring that whitespace is preserved
	 * even in IE8.
	 *
	 * @param {DOMElement} node
	 * @param {string} html
	 * @internal
	 */
	var setInnerHTML = function (node, html) {
	  node.innerHTML = html;
	};

	// Win8 apps: Allow all html to be inserted
	if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
	  setInnerHTML = function (node, html) {
	    MSApp.execUnsafeLocalFunction(function () {
	      node.innerHTML = html;
	    });
	  };
	}

	if (ExecutionEnvironment.canUseDOM) {
	  // IE8: When updating a just created node with innerHTML only leading
	  // whitespace is removed. When updating an existing node with innerHTML
	  // whitespace in root TextNodes is also collapsed.
	  // @see quirksmode.org/bugreports/archives/2004/11/innerhtml_and_t.html

	  // Feature detection; only IE8 is known to behave improperly like this.
	  var testElement = document.createElement('div');
	  testElement.innerHTML = ' ';
	  if (testElement.innerHTML === '') {
	    setInnerHTML = function (node, html) {
	      // Magic theory: IE8 supposedly differentiates between added and updated
	      // nodes when processing innerHTML, innerHTML on updated nodes suffers
	      // from worse whitespace behavior. Re-adding a node like this triggers
	      // the initial and more favorable whitespace behavior.
	      // TODO: What to do on a detached node?
	      if (node.parentNode) {
	        node.parentNode.replaceChild(node, node);
	      }

	      // We also implement a workaround for non-visible tags disappearing into
	      // thin air on IE8, this only happens if there is no visible text
	      // in-front of the non-visible tags. Piggyback on the whitespace fix
	      // and simply check if any non-visible tags appear in the source.
	      if (WHITESPACE_TEST.test(html) || html[0] === '<' && NONVISIBLE_TEST.test(html)) {
	        // Recover leading whitespace by temporarily prepending any character.
	        // \uFEFF has the potential advantage of being zero-width/invisible.
	        // UglifyJS drops U+FEFF chars when parsing, so use String.fromCharCode
	        // in hopes that this is preserved even if "\uFEFF" is transformed to
	        // the actual Unicode character (by Babel, for example).
	        // https://github.com/mishoo/UglifyJS2/blob/v2.4.20/lib/parse.js#L216
	        node.innerHTML = String.fromCharCode(0xFEFF) + html;

	        // deleteData leaves an empty `TextNode` which offsets the index of all
	        // children. Definitely want to avoid this.
	        var textNode = node.firstChild;
	        if (textNode.data.length === 1) {
	          node.removeChild(textNode);
	        } else {
	          textNode.deleteData(0, 1);
	        }
	      } else {
	        node.innerHTML = html;
	      }
	    };
	  }
	}

	module.exports = setInnerHTML;

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule setTextContent
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);
	var escapeTextContentForBrowser = __webpack_require__(21);
	var setInnerHTML = __webpack_require__(19);

	/**
	 * Set the textContent property of a node, ensuring that whitespace is preserved
	 * even in IE8. innerText is a poor substitute for textContent and, among many
	 * issues, inserts <br> instead of the literal newline chars. innerHTML behaves
	 * as it should.
	 *
	 * @param {DOMElement} node
	 * @param {string} text
	 * @internal
	 */
	var setTextContent = function (node, text) {
	  node.textContent = text;
	};

	if (ExecutionEnvironment.canUseDOM) {
	  if (!('textContent' in document.documentElement)) {
	    setTextContent = function (node, text) {
	      setInnerHTML(node, escapeTextContentForBrowser(text));
	    };
	  }
	}

	module.exports = setTextContent;

/***/ },
/* 21 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule escapeTextContentForBrowser
	 */

	'use strict';

	var ESCAPE_LOOKUP = {
	  '&': '&amp;',
	  '>': '&gt;',
	  '<': '&lt;',
	  '"': '&quot;',
	  '\'': '&#x27;'
	};

	var ESCAPE_REGEX = /[&><"']/g;

	function escaper(match) {
	  return ESCAPE_LOOKUP[match];
	}

	/**
	 * Escapes text to prevent scripting attacks.
	 *
	 * @param {*} text Text value to escape.
	 * @return {string} An escaped string.
	 */
	function escapeTextContentForBrowser(text) {
	  return ('' + text).replace(ESCAPE_REGEX, escaper);
	}

	module.exports = escapeTextContentForBrowser;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule DOMPropertyOperations
	 * @typechecks static-only
	 */

	'use strict';

	var DOMProperty = __webpack_require__(23);
	var ReactPerf = __webpack_require__(18);

	var quoteAttributeValueForBrowser = __webpack_require__(24);
	var warning = __webpack_require__(25);

	// Simplified subset
	var VALID_ATTRIBUTE_NAME_REGEX = /^[a-zA-Z_][\w\.\-]*$/;
	var illegalAttributeNameCache = {};
	var validatedAttributeNameCache = {};

	function isAttributeNameSafe(attributeName) {
	  if (validatedAttributeNameCache.hasOwnProperty(attributeName)) {
	    return true;
	  }
	  if (illegalAttributeNameCache.hasOwnProperty(attributeName)) {
	    return false;
	  }
	  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
	    validatedAttributeNameCache[attributeName] = true;
	    return true;
	  }
	  illegalAttributeNameCache[attributeName] = true;
	   false ? warning(false, 'Invalid attribute name: `%s`', attributeName) : undefined;
	  return false;
	}

	function shouldIgnoreValue(propertyInfo, value) {
	  return value == null || propertyInfo.hasBooleanValue && !value || propertyInfo.hasNumericValue && isNaN(value) || propertyInfo.hasPositiveNumericValue && value < 1 || propertyInfo.hasOverloadedBooleanValue && value === false;
	}

	if (false) {
	  var reactProps = {
	    children: true,
	    dangerouslySetInnerHTML: true,
	    key: true,
	    ref: true
	  };
	  var warnedProperties = {};

	  var warnUnknownProperty = function (name) {
	    if (reactProps.hasOwnProperty(name) && reactProps[name] || warnedProperties.hasOwnProperty(name) && warnedProperties[name]) {
	      return;
	    }

	    warnedProperties[name] = true;
	    var lowerCasedName = name.toLowerCase();

	    // data-* attributes should be lowercase; suggest the lowercase version
	    var standardName = DOMProperty.isCustomAttribute(lowerCasedName) ? lowerCasedName : DOMProperty.getPossibleStandardName.hasOwnProperty(lowerCasedName) ? DOMProperty.getPossibleStandardName[lowerCasedName] : null;

	    // For now, only warn when we have a suggested correction. This prevents
	    // logging too much when using transferPropsTo.
	    process.env.NODE_ENV !== 'production' ? warning(standardName == null, 'Unknown DOM property %s. Did you mean %s?', name, standardName) : undefined;
	  };
	}

	/**
	 * Operations for dealing with DOM properties.
	 */
	var DOMPropertyOperations = {

	  /**
	   * Creates markup for the ID property.
	   *
	   * @param {string} id Unescaped ID.
	   * @return {string} Markup string.
	   */
	  createMarkupForID: function (id) {
	    return DOMProperty.ID_ATTRIBUTE_NAME + '=' + quoteAttributeValueForBrowser(id);
	  },

	  setAttributeForID: function (node, id) {
	    node.setAttribute(DOMProperty.ID_ATTRIBUTE_NAME, id);
	  },

	  /**
	   * Creates markup for a property.
	   *
	   * @param {string} name
	   * @param {*} value
	   * @return {?string} Markup string, or null if the property was invalid.
	   */
	  createMarkupForProperty: function (name, value) {
	    var propertyInfo = DOMProperty.properties.hasOwnProperty(name) ? DOMProperty.properties[name] : null;
	    if (propertyInfo) {
	      if (shouldIgnoreValue(propertyInfo, value)) {
	        return '';
	      }
	      var attributeName = propertyInfo.attributeName;
	      if (propertyInfo.hasBooleanValue || propertyInfo.hasOverloadedBooleanValue && value === true) {
	        return attributeName + '=""';
	      }
	      return attributeName + '=' + quoteAttributeValueForBrowser(value);
	    } else if (DOMProperty.isCustomAttribute(name)) {
	      if (value == null) {
	        return '';
	      }
	      return name + '=' + quoteAttributeValueForBrowser(value);
	    } else if (false) {
	      warnUnknownProperty(name);
	    }
	    return null;
	  },

	  /**
	   * Creates markup for a custom property.
	   *
	   * @param {string} name
	   * @param {*} value
	   * @return {string} Markup string, or empty string if the property was invalid.
	   */
	  createMarkupForCustomAttribute: function (name, value) {
	    if (!isAttributeNameSafe(name) || value == null) {
	      return '';
	    }
	    return name + '=' + quoteAttributeValueForBrowser(value);
	  },

	  /**
	   * Sets the value for a property on a node.
	   *
	   * @param {DOMElement} node
	   * @param {string} name
	   * @param {*} value
	   */
	  setValueForProperty: function (node, name, value) {
	    var propertyInfo = DOMProperty.properties.hasOwnProperty(name) ? DOMProperty.properties[name] : null;
	    if (propertyInfo) {
	      var mutationMethod = propertyInfo.mutationMethod;
	      if (mutationMethod) {
	        mutationMethod(node, value);
	      } else if (shouldIgnoreValue(propertyInfo, value)) {
	        this.deleteValueForProperty(node, name);
	      } else if (propertyInfo.mustUseAttribute) {
	        var attributeName = propertyInfo.attributeName;
	        var namespace = propertyInfo.attributeNamespace;
	        // `setAttribute` with objects becomes only `[object]` in IE8/9,
	        // ('' + value) makes it output the correct toString()-value.
	        if (namespace) {
	          node.setAttributeNS(namespace, attributeName, '' + value);
	        } else if (propertyInfo.hasBooleanValue || propertyInfo.hasOverloadedBooleanValue && value === true) {
	          node.setAttribute(attributeName, '');
	        } else {
	          node.setAttribute(attributeName, '' + value);
	        }
	      } else {
	        var propName = propertyInfo.propertyName;
	        // Must explicitly cast values for HAS_SIDE_EFFECTS-properties to the
	        // property type before comparing; only `value` does and is string.
	        if (!propertyInfo.hasSideEffects || '' + node[propName] !== '' + value) {
	          // Contrary to `setAttribute`, object properties are properly
	          // `toString`ed by IE8/9.
	          node[propName] = value;
	        }
	      }
	    } else if (DOMProperty.isCustomAttribute(name)) {
	      DOMPropertyOperations.setValueForAttribute(node, name, value);
	    } else if (false) {
	      warnUnknownProperty(name);
	    }
	  },

	  setValueForAttribute: function (node, name, value) {
	    if (!isAttributeNameSafe(name)) {
	      return;
	    }
	    if (value == null) {
	      node.removeAttribute(name);
	    } else {
	      node.setAttribute(name, '' + value);
	    }
	  },

	  /**
	   * Deletes the value for a property on a node.
	   *
	   * @param {DOMElement} node
	   * @param {string} name
	   */
	  deleteValueForProperty: function (node, name) {
	    var propertyInfo = DOMProperty.properties.hasOwnProperty(name) ? DOMProperty.properties[name] : null;
	    if (propertyInfo) {
	      var mutationMethod = propertyInfo.mutationMethod;
	      if (mutationMethod) {
	        mutationMethod(node, undefined);
	      } else if (propertyInfo.mustUseAttribute) {
	        node.removeAttribute(propertyInfo.attributeName);
	      } else {
	        var propName = propertyInfo.propertyName;
	        var defaultValue = DOMProperty.getDefaultValueForProperty(node.nodeName, propName);
	        if (!propertyInfo.hasSideEffects || '' + node[propName] !== defaultValue) {
	          node[propName] = defaultValue;
	        }
	      }
	    } else if (DOMProperty.isCustomAttribute(name)) {
	      node.removeAttribute(name);
	    } else if (false) {
	      warnUnknownProperty(name);
	    }
	  }

	};

	ReactPerf.measureMethods(DOMPropertyOperations, 'DOMPropertyOperations', {
	  setValueForProperty: 'setValueForProperty',
	  setValueForAttribute: 'setValueForAttribute',
	  deleteValueForProperty: 'deleteValueForProperty'
	});

	module.exports = DOMPropertyOperations;

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule DOMProperty
	 * @typechecks static-only
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	function checkMask(value, bitmask) {
	  return (value & bitmask) === bitmask;
	}

	var DOMPropertyInjection = {
	  /**
	   * Mapping from normalized, camelcased property names to a configuration that
	   * specifies how the associated DOM property should be accessed or rendered.
	   */
	  MUST_USE_ATTRIBUTE: 0x1,
	  MUST_USE_PROPERTY: 0x2,
	  HAS_SIDE_EFFECTS: 0x4,
	  HAS_BOOLEAN_VALUE: 0x8,
	  HAS_NUMERIC_VALUE: 0x10,
	  HAS_POSITIVE_NUMERIC_VALUE: 0x20 | 0x10,
	  HAS_OVERLOADED_BOOLEAN_VALUE: 0x40,

	  /**
	   * Inject some specialized knowledge about the DOM. This takes a config object
	   * with the following properties:
	   *
	   * isCustomAttribute: function that given an attribute name will return true
	   * if it can be inserted into the DOM verbatim. Useful for data-* or aria-*
	   * attributes where it's impossible to enumerate all of the possible
	   * attribute names,
	   *
	   * Properties: object mapping DOM property name to one of the
	   * DOMPropertyInjection constants or null. If your attribute isn't in here,
	   * it won't get written to the DOM.
	   *
	   * DOMAttributeNames: object mapping React attribute name to the DOM
	   * attribute name. Attribute names not specified use the **lowercase**
	   * normalized name.
	   *
	   * DOMAttributeNamespaces: object mapping React attribute name to the DOM
	   * attribute namespace URL. (Attribute names not specified use no namespace.)
	   *
	   * DOMPropertyNames: similar to DOMAttributeNames but for DOM properties.
	   * Property names not specified use the normalized name.
	   *
	   * DOMMutationMethods: Properties that require special mutation methods. If
	   * `value` is undefined, the mutation method should unset the property.
	   *
	   * @param {object} domPropertyConfig the config as described above.
	   */
	  injectDOMPropertyConfig: function (domPropertyConfig) {
	    var Injection = DOMPropertyInjection;
	    var Properties = domPropertyConfig.Properties || {};
	    var DOMAttributeNamespaces = domPropertyConfig.DOMAttributeNamespaces || {};
	    var DOMAttributeNames = domPropertyConfig.DOMAttributeNames || {};
	    var DOMPropertyNames = domPropertyConfig.DOMPropertyNames || {};
	    var DOMMutationMethods = domPropertyConfig.DOMMutationMethods || {};

	    if (domPropertyConfig.isCustomAttribute) {
	      DOMProperty._isCustomAttributeFunctions.push(domPropertyConfig.isCustomAttribute);
	    }

	    for (var propName in Properties) {
	      !!DOMProperty.properties.hasOwnProperty(propName) ?  false ? invariant(false, 'injectDOMPropertyConfig(...): You\'re trying to inject DOM property ' + '\'%s\' which has already been injected. You may be accidentally ' + 'injecting the same DOM property config twice, or you may be ' + 'injecting two configs that have conflicting property names.', propName) : invariant(false) : undefined;

	      var lowerCased = propName.toLowerCase();
	      var propConfig = Properties[propName];

	      var propertyInfo = {
	        attributeName: lowerCased,
	        attributeNamespace: null,
	        propertyName: propName,
	        mutationMethod: null,

	        mustUseAttribute: checkMask(propConfig, Injection.MUST_USE_ATTRIBUTE),
	        mustUseProperty: checkMask(propConfig, Injection.MUST_USE_PROPERTY),
	        hasSideEffects: checkMask(propConfig, Injection.HAS_SIDE_EFFECTS),
	        hasBooleanValue: checkMask(propConfig, Injection.HAS_BOOLEAN_VALUE),
	        hasNumericValue: checkMask(propConfig, Injection.HAS_NUMERIC_VALUE),
	        hasPositiveNumericValue: checkMask(propConfig, Injection.HAS_POSITIVE_NUMERIC_VALUE),
	        hasOverloadedBooleanValue: checkMask(propConfig, Injection.HAS_OVERLOADED_BOOLEAN_VALUE)
	      };

	      !(!propertyInfo.mustUseAttribute || !propertyInfo.mustUseProperty) ?  false ? invariant(false, 'DOMProperty: Cannot require using both attribute and property: %s', propName) : invariant(false) : undefined;
	      !(propertyInfo.mustUseProperty || !propertyInfo.hasSideEffects) ?  false ? invariant(false, 'DOMProperty: Properties that have side effects must use property: %s', propName) : invariant(false) : undefined;
	      !(propertyInfo.hasBooleanValue + propertyInfo.hasNumericValue + propertyInfo.hasOverloadedBooleanValue <= 1) ?  false ? invariant(false, 'DOMProperty: Value can be one of boolean, overloaded boolean, or ' + 'numeric value, but not a combination: %s', propName) : invariant(false) : undefined;

	      if (false) {
	        DOMProperty.getPossibleStandardName[lowerCased] = propName;
	      }

	      if (DOMAttributeNames.hasOwnProperty(propName)) {
	        var attributeName = DOMAttributeNames[propName];
	        propertyInfo.attributeName = attributeName;
	        if (false) {
	          DOMProperty.getPossibleStandardName[attributeName] = propName;
	        }
	      }

	      if (DOMAttributeNamespaces.hasOwnProperty(propName)) {
	        propertyInfo.attributeNamespace = DOMAttributeNamespaces[propName];
	      }

	      if (DOMPropertyNames.hasOwnProperty(propName)) {
	        propertyInfo.propertyName = DOMPropertyNames[propName];
	      }

	      if (DOMMutationMethods.hasOwnProperty(propName)) {
	        propertyInfo.mutationMethod = DOMMutationMethods[propName];
	      }

	      DOMProperty.properties[propName] = propertyInfo;
	    }
	  }
	};
	var defaultValueCache = {};

	/**
	 * DOMProperty exports lookup objects that can be used like functions:
	 *
	 *   > DOMProperty.isValid['id']
	 *   true
	 *   > DOMProperty.isValid['foobar']
	 *   undefined
	 *
	 * Although this may be confusing, it performs better in general.
	 *
	 * @see http://jsperf.com/key-exists
	 * @see http://jsperf.com/key-missing
	 */
	var DOMProperty = {

	  ID_ATTRIBUTE_NAME: 'data-reactid',

	  /**
	   * Map from property "standard name" to an object with info about how to set
	   * the property in the DOM. Each object contains:
	   *
	   * attributeName:
	   *   Used when rendering markup or with `*Attribute()`.
	   * attributeNamespace
	   * propertyName:
	   *   Used on DOM node instances. (This includes properties that mutate due to
	   *   external factors.)
	   * mutationMethod:
	   *   If non-null, used instead of the property or `setAttribute()` after
	   *   initial render.
	   * mustUseAttribute:
	   *   Whether the property must be accessed and mutated using `*Attribute()`.
	   *   (This includes anything that fails `<propName> in <element>`.)
	   * mustUseProperty:
	   *   Whether the property must be accessed and mutated as an object property.
	   * hasSideEffects:
	   *   Whether or not setting a value causes side effects such as triggering
	   *   resources to be loaded or text selection changes. If true, we read from
	   *   the DOM before updating to ensure that the value is only set if it has
	   *   changed.
	   * hasBooleanValue:
	   *   Whether the property should be removed when set to a falsey value.
	   * hasNumericValue:
	   *   Whether the property must be numeric or parse as a numeric and should be
	   *   removed when set to a falsey value.
	   * hasPositiveNumericValue:
	   *   Whether the property must be positive numeric or parse as a positive
	   *   numeric and should be removed when set to a falsey value.
	   * hasOverloadedBooleanValue:
	   *   Whether the property can be used as a flag as well as with a value.
	   *   Removed when strictly equal to false; present without a value when
	   *   strictly equal to true; present with a value otherwise.
	   */
	  properties: {},

	  /**
	   * Mapping from lowercase property names to the properly cased version, used
	   * to warn in the case of missing properties. Available only in __DEV__.
	   * @type {Object}
	   */
	  getPossibleStandardName:  false ? {} : null,

	  /**
	   * All of the isCustomAttribute() functions that have been injected.
	   */
	  _isCustomAttributeFunctions: [],

	  /**
	   * Checks whether a property name is a custom attribute.
	   * @method
	   */
	  isCustomAttribute: function (attributeName) {
	    for (var i = 0; i < DOMProperty._isCustomAttributeFunctions.length; i++) {
	      var isCustomAttributeFn = DOMProperty._isCustomAttributeFunctions[i];
	      if (isCustomAttributeFn(attributeName)) {
	        return true;
	      }
	    }
	    return false;
	  },

	  /**
	   * Returns the default property value for a DOM property (i.e., not an
	   * attribute). Most default values are '' or false, but not all. Worse yet,
	   * some (in particular, `type`) vary depending on the type of element.
	   *
	   * TODO: Is it better to grab all the possible properties when creating an
	   * element to avoid having to create the same element twice?
	   */
	  getDefaultValueForProperty: function (nodeName, prop) {
	    var nodeDefaults = defaultValueCache[nodeName];
	    var testElement;
	    if (!nodeDefaults) {
	      defaultValueCache[nodeName] = nodeDefaults = {};
	    }
	    if (!(prop in nodeDefaults)) {
	      testElement = document.createElement(nodeName);
	      nodeDefaults[prop] = testElement[prop];
	    }
	    return nodeDefaults[prop];
	  },

	  injection: DOMPropertyInjection
	};

	module.exports = DOMProperty;

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule quoteAttributeValueForBrowser
	 */

	'use strict';

	var escapeTextContentForBrowser = __webpack_require__(21);

	/**
	 * Escapes attribute value to prevent scripting attacks.
	 *
	 * @param {*} value Value to escape.
	 * @return {string} An escaped string.
	 */
	function quoteAttributeValueForBrowser(value) {
	  return '"' + escapeTextContentForBrowser(value) + '"';
	}

	module.exports = quoteAttributeValueForBrowser;

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule warning
	 */

	'use strict';

	var emptyFunction = __webpack_require__(15);

	/**
	 * Similar to invariant but only logs a warning if the condition is not met.
	 * This can be used to log issues in development environments in critical
	 * paths. Removing the logging code for production environments will keep the
	 * same logic and follow the same code paths.
	 */

	var warning = emptyFunction;

	if (false) {
	  warning = function (condition, format) {
	    for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
	      args[_key - 2] = arguments[_key];
	    }

	    if (format === undefined) {
	      throw new Error('`warning(condition, format, ...args)` requires a warning ' + 'message argument');
	    }

	    if (format.indexOf('Failed Composite propType: ') === 0) {
	      return; // Ignore CompositeComponent proptype check.
	    }

	    if (!condition) {
	      var argIndex = 0;
	      var message = 'Warning: ' + format.replace(/%s/g, function () {
	        return args[argIndex++];
	      });
	      if (typeof console !== 'undefined') {
	        console.error(message);
	      }
	      try {
	        // --- Welcome to debugging React ---
	        // This error was thrown as a convenience so that you can use this stack
	        // to find the callsite that caused this warning to fire.
	        throw new Error(message);
	      } catch (x) {}
	    }
	  };
	}

	module.exports = warning;

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactComponentBrowserEnvironment
	 */

	'use strict';

	var ReactDOMIDOperations = __webpack_require__(27);
	var ReactMount = __webpack_require__(28);

	/**
	 * Abstracts away all functionality of the reconciler that requires knowledge of
	 * the browser context. TODO: These callers should be refactored to avoid the
	 * need for this injection.
	 */
	var ReactComponentBrowserEnvironment = {

	  processChildrenUpdates: ReactDOMIDOperations.dangerouslyProcessChildrenUpdates,

	  replaceNodeWithMarkupByID: ReactDOMIDOperations.dangerouslyReplaceNodeWithMarkupByID,

	  /**
	   * If a particular environment requires that some resources be cleaned up,
	   * specify this in the injected Mixin. In the DOM, we would likely want to
	   * purge any cached node ID lookups.
	   *
	   * @private
	   */
	  unmountIDFromEnvironment: function (rootNodeID) {
	    ReactMount.purgeID(rootNodeID);
	  }

	};

	module.exports = ReactComponentBrowserEnvironment;

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMIDOperations
	 * @typechecks static-only
	 */

	'use strict';

	var DOMChildrenOperations = __webpack_require__(7);
	var DOMPropertyOperations = __webpack_require__(22);
	var ReactMount = __webpack_require__(28);
	var ReactPerf = __webpack_require__(18);

	var invariant = __webpack_require__(13);

	/**
	 * Errors for properties that should not be updated with `updatePropertyByID()`.
	 *
	 * @type {object}
	 * @private
	 */
	var INVALID_PROPERTY_ERRORS = {
	  dangerouslySetInnerHTML: '`dangerouslySetInnerHTML` must be set using `updateInnerHTMLByID()`.',
	  style: '`style` must be set using `updateStylesByID()`.'
	};

	/**
	 * Operations used to process updates to DOM nodes.
	 */
	var ReactDOMIDOperations = {

	  /**
	   * Updates a DOM node with new property values. This should only be used to
	   * update DOM properties in `DOMProperty`.
	   *
	   * @param {string} id ID of the node to update.
	   * @param {string} name A valid property name, see `DOMProperty`.
	   * @param {*} value New value of the property.
	   * @internal
	   */
	  updatePropertyByID: function (id, name, value) {
	    var node = ReactMount.getNode(id);
	    !!INVALID_PROPERTY_ERRORS.hasOwnProperty(name) ?  false ? invariant(false, 'updatePropertyByID(...): %s', INVALID_PROPERTY_ERRORS[name]) : invariant(false) : undefined;

	    // If we're updating to null or undefined, we should remove the property
	    // from the DOM node instead of inadvertantly setting to a string. This
	    // brings us in line with the same behavior we have on initial render.
	    if (value != null) {
	      DOMPropertyOperations.setValueForProperty(node, name, value);
	    } else {
	      DOMPropertyOperations.deleteValueForProperty(node, name);
	    }
	  },

	  /**
	   * Replaces a DOM node that exists in the document with markup.
	   *
	   * @param {string} id ID of child to be replaced.
	   * @param {string} markup Dangerous markup to inject in place of child.
	   * @internal
	   * @see {Danger.dangerouslyReplaceNodeWithMarkup}
	   */
	  dangerouslyReplaceNodeWithMarkupByID: function (id, markup) {
	    var node = ReactMount.getNode(id);
	    DOMChildrenOperations.dangerouslyReplaceNodeWithMarkup(node, markup);
	  },

	  /**
	   * Updates a component's children by processing a series of updates.
	   *
	   * @param {array<object>} updates List of update configurations.
	   * @param {array<string>} markup List of markup strings.
	   * @internal
	   */
	  dangerouslyProcessChildrenUpdates: function (updates, markup) {
	    for (var i = 0; i < updates.length; i++) {
	      updates[i].parentNode = ReactMount.getNode(updates[i].parentID);
	    }
	    DOMChildrenOperations.processUpdates(updates, markup);
	  }
	};

	ReactPerf.measureMethods(ReactDOMIDOperations, 'ReactDOMIDOperations', {
	  dangerouslyReplaceNodeWithMarkupByID: 'dangerouslyReplaceNodeWithMarkupByID',
	  dangerouslyProcessChildrenUpdates: 'dangerouslyProcessChildrenUpdates'
	});

	module.exports = ReactDOMIDOperations;

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactMount
	 */

	'use strict';

	var DOMProperty = __webpack_require__(23);
	var ReactBrowserEventEmitter = __webpack_require__(29);
	var ReactCurrentOwner = __webpack_require__(5);
	var ReactDOMFeatureFlags = __webpack_require__(41);
	var ReactElement = __webpack_require__(42);
	var ReactEmptyComponentRegistry = __webpack_require__(44);
	var ReactInstanceHandles = __webpack_require__(45);
	var ReactInstanceMap = __webpack_require__(47);
	var ReactMarkupChecksum = __webpack_require__(48);
	var ReactPerf = __webpack_require__(18);
	var ReactReconciler = __webpack_require__(50);
	var ReactUpdateQueue = __webpack_require__(53);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var emptyObject = __webpack_require__(58);
	var containsNode = __webpack_require__(59);
	var instantiateReactComponent = __webpack_require__(62);
	var invariant = __webpack_require__(13);
	var setInnerHTML = __webpack_require__(19);
	var shouldUpdateReactComponent = __webpack_require__(67);
	var validateDOMNesting = __webpack_require__(70);
	var warning = __webpack_require__(25);

	var ATTR_NAME = DOMProperty.ID_ATTRIBUTE_NAME;
	var nodeCache = {};

	var ELEMENT_NODE_TYPE = 1;
	var DOC_NODE_TYPE = 9;
	var DOCUMENT_FRAGMENT_NODE_TYPE = 11;

	var ownerDocumentContextKey = '__ReactMount_ownerDocument$' + Math.random().toString(36).slice(2);

	/** Mapping from reactRootID to React component instance. */
	var instancesByReactRootID = {};

	/** Mapping from reactRootID to `container` nodes. */
	var containersByReactRootID = {};

	if (false) {
	  /** __DEV__-only mapping from reactRootID to root elements. */
	  var rootElementsByReactRootID = {};
	}

	// Used to store breadth-first search state in findComponentRoot.
	var findComponentRootReusableArray = [];

	/**
	 * Finds the index of the first character
	 * that's not common between the two given strings.
	 *
	 * @return {number} the index of the character where the strings diverge
	 */
	function firstDifferenceIndex(string1, string2) {
	  var minLen = Math.min(string1.length, string2.length);
	  for (var i = 0; i < minLen; i++) {
	    if (string1.charAt(i) !== string2.charAt(i)) {
	      return i;
	    }
	  }
	  return string1.length === string2.length ? -1 : minLen;
	}

	/**
	 * @param {DOMElement|DOMDocument} container DOM element that may contain
	 * a React component
	 * @return {?*} DOM element that may have the reactRoot ID, or null.
	 */
	function getReactRootElementInContainer(container) {
	  if (!container) {
	    return null;
	  }

	  if (container.nodeType === DOC_NODE_TYPE) {
	    return container.documentElement;
	  } else {
	    return container.firstChild;
	  }
	}

	/**
	 * @param {DOMElement} container DOM element that may contain a React component.
	 * @return {?string} A "reactRoot" ID, if a React component is rendered.
	 */
	function getReactRootID(container) {
	  var rootElement = getReactRootElementInContainer(container);
	  return rootElement && ReactMount.getID(rootElement);
	}

	/**
	 * Accessing node[ATTR_NAME] or calling getAttribute(ATTR_NAME) on a form
	 * element can return its control whose name or ID equals ATTR_NAME. All
	 * DOM nodes support `getAttributeNode` but this can also get called on
	 * other objects so just return '' if we're given something other than a
	 * DOM node (such as window).
	 *
	 * @param {?DOMElement|DOMWindow|DOMDocument|DOMTextNode} node DOM node.
	 * @return {string} ID of the supplied `domNode`.
	 */
	function getID(node) {
	  var id = internalGetID(node);
	  if (id) {
	    if (nodeCache.hasOwnProperty(id)) {
	      var cached = nodeCache[id];
	      if (cached !== node) {
	        !!isValid(cached, id) ?  false ? invariant(false, 'ReactMount: Two valid but unequal nodes with the same `%s`: %s', ATTR_NAME, id) : invariant(false) : undefined;

	        nodeCache[id] = node;
	      }
	    } else {
	      nodeCache[id] = node;
	    }
	  }

	  return id;
	}

	function internalGetID(node) {
	  // If node is something like a window, document, or text node, none of
	  // which support attributes or a .getAttribute method, gracefully return
	  // the empty string, as if the attribute were missing.
	  return node && node.getAttribute && node.getAttribute(ATTR_NAME) || '';
	}

	/**
	 * Sets the React-specific ID of the given node.
	 *
	 * @param {DOMElement} node The DOM node whose ID will be set.
	 * @param {string} id The value of the ID attribute.
	 */
	function setID(node, id) {
	  var oldID = internalGetID(node);
	  if (oldID !== id) {
	    delete nodeCache[oldID];
	  }
	  node.setAttribute(ATTR_NAME, id);
	  nodeCache[id] = node;
	}

	/**
	 * Finds the node with the supplied React-generated DOM ID.
	 *
	 * @param {string} id A React-generated DOM ID.
	 * @return {DOMElement} DOM node with the suppled `id`.
	 * @internal
	 */
	function getNode(id) {
	  if (!nodeCache.hasOwnProperty(id) || !isValid(nodeCache[id], id)) {
	    nodeCache[id] = ReactMount.findReactNodeByID(id);
	  }
	  return nodeCache[id];
	}

	/**
	 * Finds the node with the supplied public React instance.
	 *
	 * @param {*} instance A public React instance.
	 * @return {?DOMElement} DOM node with the suppled `id`.
	 * @internal
	 */
	function getNodeFromInstance(instance) {
	  var id = ReactInstanceMap.get(instance)._rootNodeID;
	  if (ReactEmptyComponentRegistry.isNullComponentID(id)) {
	    return null;
	  }
	  if (!nodeCache.hasOwnProperty(id) || !isValid(nodeCache[id], id)) {
	    nodeCache[id] = ReactMount.findReactNodeByID(id);
	  }
	  return nodeCache[id];
	}

	/**
	 * A node is "valid" if it is contained by a currently mounted container.
	 *
	 * This means that the node does not have to be contained by a document in
	 * order to be considered valid.
	 *
	 * @param {?DOMElement} node The candidate DOM node.
	 * @param {string} id The expected ID of the node.
	 * @return {boolean} Whether the node is contained by a mounted container.
	 */
	function isValid(node, id) {
	  if (node) {
	    !(internalGetID(node) === id) ?  false ? invariant(false, 'ReactMount: Unexpected modification of `%s`', ATTR_NAME) : invariant(false) : undefined;

	    var container = ReactMount.findReactContainerForID(id);
	    if (container && containsNode(container, node)) {
	      return true;
	    }
	  }

	  return false;
	}

	/**
	 * Causes the cache to forget about one React-specific ID.
	 *
	 * @param {string} id The ID to forget.
	 */
	function purgeID(id) {
	  delete nodeCache[id];
	}

	var deepestNodeSoFar = null;
	function findDeepestCachedAncestorImpl(ancestorID) {
	  var ancestor = nodeCache[ancestorID];
	  if (ancestor && isValid(ancestor, ancestorID)) {
	    deepestNodeSoFar = ancestor;
	  } else {
	    // This node isn't populated in the cache, so presumably none of its
	    // descendants are. Break out of the loop.
	    return false;
	  }
	}

	/**
	 * Return the deepest cached node whose ID is a prefix of `targetID`.
	 */
	function findDeepestCachedAncestor(targetID) {
	  deepestNodeSoFar = null;
	  ReactInstanceHandles.traverseAncestors(targetID, findDeepestCachedAncestorImpl);

	  var foundNode = deepestNodeSoFar;
	  deepestNodeSoFar = null;
	  return foundNode;
	}

	/**
	 * Mounts this component and inserts it into the DOM.
	 *
	 * @param {ReactComponent} componentInstance The instance to mount.
	 * @param {string} rootID DOM ID of the root node.
	 * @param {DOMElement} container DOM element to mount into.
	 * @param {ReactReconcileTransaction} transaction
	 * @param {boolean} shouldReuseMarkup If true, do not insert markup
	 */
	function mountComponentIntoNode(componentInstance, rootID, container, transaction, shouldReuseMarkup, context) {
	  if (ReactDOMFeatureFlags.useCreateElement) {
	    context = assign({}, context);
	    if (container.nodeType === DOC_NODE_TYPE) {
	      context[ownerDocumentContextKey] = container;
	    } else {
	      context[ownerDocumentContextKey] = container.ownerDocument;
	    }
	  }
	  if (false) {
	    if (context === emptyObject) {
	      context = {};
	    }
	    var tag = container.nodeName.toLowerCase();
	    context[validateDOMNesting.ancestorInfoContextKey] = validateDOMNesting.updatedAncestorInfo(null, tag, null);
	  }
	  var markup = ReactReconciler.mountComponent(componentInstance, rootID, transaction, context);
	  componentInstance._renderedComponent._topLevelWrapper = componentInstance;
	  ReactMount._mountImageIntoNode(markup, container, shouldReuseMarkup, transaction);
	}

	/**
	 * Batched mount.
	 *
	 * @param {ReactComponent} componentInstance The instance to mount.
	 * @param {string} rootID DOM ID of the root node.
	 * @param {DOMElement} container DOM element to mount into.
	 * @param {boolean} shouldReuseMarkup If true, do not insert markup
	 */
	function batchedMountComponentIntoNode(componentInstance, rootID, container, shouldReuseMarkup, context) {
	  var transaction = ReactUpdates.ReactReconcileTransaction.getPooled(
	  /* forceHTML */shouldReuseMarkup);
	  transaction.perform(mountComponentIntoNode, null, componentInstance, rootID, container, transaction, shouldReuseMarkup, context);
	  ReactUpdates.ReactReconcileTransaction.release(transaction);
	}

	/**
	 * Unmounts a component and removes it from the DOM.
	 *
	 * @param {ReactComponent} instance React component instance.
	 * @param {DOMElement} container DOM element to unmount from.
	 * @final
	 * @internal
	 * @see {ReactMount.unmountComponentAtNode}
	 */
	function unmountComponentFromNode(instance, container) {
	  ReactReconciler.unmountComponent(instance);

	  if (container.nodeType === DOC_NODE_TYPE) {
	    container = container.documentElement;
	  }

	  // http://jsperf.com/emptying-a-node
	  while (container.lastChild) {
	    container.removeChild(container.lastChild);
	  }
	}

	/**
	 * True if the supplied DOM node has a direct React-rendered child that is
	 * not a React root element. Useful for warning in `render`,
	 * `unmountComponentAtNode`, etc.
	 *
	 * @param {?DOMElement} node The candidate DOM node.
	 * @return {boolean} True if the DOM element contains a direct child that was
	 * rendered by React but is not a root element.
	 * @internal
	 */
	function hasNonRootReactChild(node) {
	  var reactRootID = getReactRootID(node);
	  return reactRootID ? reactRootID !== ReactInstanceHandles.getReactRootIDFromNodeID(reactRootID) : false;
	}

	/**
	 * Returns the first (deepest) ancestor of a node which is rendered by this copy
	 * of React.
	 */
	function findFirstReactDOMImpl(node) {
	  // This node might be from another React instance, so we make sure not to
	  // examine the node cache here
	  for (; node && node.parentNode !== node; node = node.parentNode) {
	    if (node.nodeType !== 1) {
	      // Not a DOMElement, therefore not a React component
	      continue;
	    }
	    var nodeID = internalGetID(node);
	    if (!nodeID) {
	      continue;
	    }
	    var reactRootID = ReactInstanceHandles.getReactRootIDFromNodeID(nodeID);

	    // If containersByReactRootID contains the container we find by crawling up
	    // the tree, we know that this instance of React rendered the node.
	    // nb. isValid's strategy (with containsNode) does not work because render
	    // trees may be nested and we don't want a false positive in that case.
	    var current = node;
	    var lastID;
	    do {
	      lastID = internalGetID(current);
	      current = current.parentNode;
	      if (current == null) {
	        // The passed-in node has been detached from the container it was
	        // originally rendered into.
	        return null;
	      }
	    } while (lastID !== reactRootID);

	    if (current === containersByReactRootID[reactRootID]) {
	      return node;
	    }
	  }
	  return null;
	}

	/**
	 * Temporary (?) hack so that we can store all top-level pending updates on
	 * composites instead of having to worry about different types of components
	 * here.
	 */
	var TopLevelWrapper = function () {};
	TopLevelWrapper.prototype.isReactComponent = {};
	if (false) {
	  TopLevelWrapper.displayName = 'TopLevelWrapper';
	}
	TopLevelWrapper.prototype.render = function () {
	  // this.props is actually a ReactElement
	  return this.props;
	};

	/**
	 * Mounting is the process of initializing a React component by creating its
	 * representative DOM elements and inserting them into a supplied `container`.
	 * Any prior content inside `container` is destroyed in the process.
	 *
	 *   ReactMount.render(
	 *     component,
	 *     document.getElementById('container')
	 *   );
	 *
	 *   <div id="container">                   <-- Supplied `container`.
	 *     <div data-reactid=".3">              <-- Rendered reactRoot of React
	 *       // ...                                 component.
	 *     </div>
	 *   </div>
	 *
	 * Inside of `container`, the first element rendered is the "reactRoot".
	 */
	var ReactMount = {

	  TopLevelWrapper: TopLevelWrapper,

	  /** Exposed for debugging purposes **/
	  _instancesByReactRootID: instancesByReactRootID,

	  /**
	   * This is a hook provided to support rendering React components while
	   * ensuring that the apparent scroll position of its `container` does not
	   * change.
	   *
	   * @param {DOMElement} container The `container` being rendered into.
	   * @param {function} renderCallback This must be called once to do the render.
	   */
	  scrollMonitor: function (container, renderCallback) {
	    renderCallback();
	  },

	  /**
	   * Take a component that's already mounted into the DOM and replace its props
	   * @param {ReactComponent} prevComponent component instance already in the DOM
	   * @param {ReactElement} nextElement component instance to render
	   * @param {DOMElement} container container to render into
	   * @param {?function} callback function triggered on completion
	   */
	  _updateRootComponent: function (prevComponent, nextElement, container, callback) {
	    ReactMount.scrollMonitor(container, function () {
	      ReactUpdateQueue.enqueueElementInternal(prevComponent, nextElement);
	      if (callback) {
	        ReactUpdateQueue.enqueueCallbackInternal(prevComponent, callback);
	      }
	    });

	    if (false) {
	      // Record the root element in case it later gets transplanted.
	      rootElementsByReactRootID[getReactRootID(container)] = getReactRootElementInContainer(container);
	    }

	    return prevComponent;
	  },

	  /**
	   * Register a component into the instance map and starts scroll value
	   * monitoring
	   * @param {ReactComponent} nextComponent component instance to render
	   * @param {DOMElement} container container to render into
	   * @return {string} reactRoot ID prefix
	   */
	  _registerComponent: function (nextComponent, container) {
	    !(container && (container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE || container.nodeType === DOCUMENT_FRAGMENT_NODE_TYPE)) ?  false ? invariant(false, '_registerComponent(...): Target container is not a DOM element.') : invariant(false) : undefined;

	    ReactBrowserEventEmitter.ensureScrollValueMonitoring();

	    var reactRootID = ReactMount.registerContainer(container);
	    instancesByReactRootID[reactRootID] = nextComponent;
	    return reactRootID;
	  },

	  /**
	   * Render a new component into the DOM.
	   * @param {ReactElement} nextElement element to render
	   * @param {DOMElement} container container to render into
	   * @param {boolean} shouldReuseMarkup if we should skip the markup insertion
	   * @return {ReactComponent} nextComponent
	   */
	  _renderNewRootComponent: function (nextElement, container, shouldReuseMarkup, context) {
	    // Various parts of our code (such as ReactCompositeComponent's
	    // _renderValidatedComponent) assume that calls to render aren't nested;
	    // verify that that's the case.
	     false ? warning(ReactCurrentOwner.current == null, '_renderNewRootComponent(): Render methods should be a pure function ' + 'of props and state; triggering nested component updates from ' + 'render is not allowed. If necessary, trigger nested updates in ' + 'componentDidUpdate. Check the render method of %s.', ReactCurrentOwner.current && ReactCurrentOwner.current.getName() || 'ReactCompositeComponent') : undefined;

	    var componentInstance = instantiateReactComponent(nextElement, null);
	    var reactRootID = ReactMount._registerComponent(componentInstance, container);

	    // The initial render is synchronous but any updates that happen during
	    // rendering, in componentWillMount or componentDidMount, will be batched
	    // according to the current batching strategy.

	    ReactUpdates.batchedUpdates(batchedMountComponentIntoNode, componentInstance, reactRootID, container, shouldReuseMarkup, context);

	    if (false) {
	      // Record the root element in case it later gets transplanted.
	      rootElementsByReactRootID[reactRootID] = getReactRootElementInContainer(container);
	    }

	    return componentInstance;
	  },

	  /**
	   * Renders a React component into the DOM in the supplied `container`.
	   *
	   * If the React component was previously rendered into `container`, this will
	   * perform an update on it and only mutate the DOM as necessary to reflect the
	   * latest React component.
	   *
	   * @param {ReactComponent} parentComponent The conceptual parent of this render tree.
	   * @param {ReactElement} nextElement Component element to render.
	   * @param {DOMElement} container DOM element to render into.
	   * @param {?function} callback function triggered on completion
	   * @return {ReactComponent} Component instance rendered in `container`.
	   */
	  renderSubtreeIntoContainer: function (parentComponent, nextElement, container, callback) {
	    !(parentComponent != null && parentComponent._reactInternalInstance != null) ?  false ? invariant(false, 'parentComponent must be a valid React Component') : invariant(false) : undefined;
	    return ReactMount._renderSubtreeIntoContainer(parentComponent, nextElement, container, callback);
	  },

	  _renderSubtreeIntoContainer: function (parentComponent, nextElement, container, callback) {
	    !ReactElement.isValidElement(nextElement) ?  false ? invariant(false, 'ReactDOM.render(): Invalid component element.%s', typeof nextElement === 'string' ? ' Instead of passing an element string, make sure to instantiate ' + 'it by passing it to React.makeElement.' : typeof nextElement === 'function' ? ' Instead of passing a component class, make sure to instantiate ' + 'it by passing it to React.createElement.' :
	    // Check if it quacks like an element
	    nextElement != null && nextElement.props !== undefined ? ' This may be caused by unintentionally loading two independent ' + 'copies of React.' : '') : invariant(false) : undefined;

	     false ? warning(!container || !container.tagName || container.tagName.toUpperCase() !== 'BODY', 'render(): Rendering components directly into document.body is ' + 'discouraged, since its children are often manipulated by third-party ' + 'scripts and browser extensions. This may lead to subtle ' + 'reconciliation issues. Try rendering into a container element created ' + 'for your app.') : undefined;

	    var nextWrappedElement = new ReactElement(TopLevelWrapper, null, null, null, null, null, nextElement);

	    var prevComponent = instancesByReactRootID[getReactRootID(container)];

	    if (prevComponent) {
	      var prevWrappedElement = prevComponent._currentElement;
	      var prevElement = prevWrappedElement.props;
	      if (shouldUpdateReactComponent(prevElement, nextElement)) {
	        var publicInst = prevComponent._renderedComponent.getPublicInstance();
	        var updatedCallback = callback && function () {
	          callback.call(publicInst);
	        };
	        ReactMount._updateRootComponent(prevComponent, nextWrappedElement, container, updatedCallback);
	        return publicInst;
	      } else {
	        ReactMount.unmountComponentAtNode(container);
	      }
	    }

	    var reactRootElement = getReactRootElementInContainer(container);
	    var containerHasReactMarkup = reactRootElement && !!internalGetID(reactRootElement);
	    var containerHasNonRootReactChild = hasNonRootReactChild(container);

	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(!containerHasNonRootReactChild, 'render(...): Replacing React-rendered children with a new root ' + 'component. If you intended to update the children of this node, ' + 'you should instead have the existing children update their state ' + 'and render the new components instead of calling ReactDOM.render.') : undefined;

	      if (!containerHasReactMarkup || reactRootElement.nextSibling) {
	        var rootElementSibling = reactRootElement;
	        while (rootElementSibling) {
	          if (internalGetID(rootElementSibling)) {
	            process.env.NODE_ENV !== 'production' ? warning(false, 'render(): Target node has markup rendered by React, but there ' + 'are unrelated nodes as well. This is most commonly caused by ' + 'white-space inserted around server-rendered markup.') : undefined;
	            break;
	          }
	          rootElementSibling = rootElementSibling.nextSibling;
	        }
	      }
	    }

	    var shouldReuseMarkup = containerHasReactMarkup && !prevComponent && !containerHasNonRootReactChild;
	    var component = ReactMount._renderNewRootComponent(nextWrappedElement, container, shouldReuseMarkup, parentComponent != null ? parentComponent._reactInternalInstance._processChildContext(parentComponent._reactInternalInstance._context) : emptyObject)._renderedComponent.getPublicInstance();
	    if (callback) {
	      callback.call(component);
	    }
	    return component;
	  },

	  /**
	   * Renders a React component into the DOM in the supplied `container`.
	   *
	   * If the React component was previously rendered into `container`, this will
	   * perform an update on it and only mutate the DOM as necessary to reflect the
	   * latest React component.
	   *
	   * @param {ReactElement} nextElement Component element to render.
	   * @param {DOMElement} container DOM element to render into.
	   * @param {?function} callback function triggered on completion
	   * @return {ReactComponent} Component instance rendered in `container`.
	   */
	  render: function (nextElement, container, callback) {
	    return ReactMount._renderSubtreeIntoContainer(null, nextElement, container, callback);
	  },

	  /**
	   * Registers a container node into which React components will be rendered.
	   * This also creates the "reactRoot" ID that will be assigned to the element
	   * rendered within.
	   *
	   * @param {DOMElement} container DOM element to register as a container.
	   * @return {string} The "reactRoot" ID of elements rendered within.
	   */
	  registerContainer: function (container) {
	    var reactRootID = getReactRootID(container);
	    if (reactRootID) {
	      // If one exists, make sure it is a valid "reactRoot" ID.
	      reactRootID = ReactInstanceHandles.getReactRootIDFromNodeID(reactRootID);
	    }
	    if (!reactRootID) {
	      // No valid "reactRoot" ID found, create one.
	      reactRootID = ReactInstanceHandles.createReactRootID();
	    }
	    containersByReactRootID[reactRootID] = container;
	    return reactRootID;
	  },

	  /**
	   * Unmounts and destroys the React component rendered in the `container`.
	   *
	   * @param {DOMElement} container DOM element containing a React component.
	   * @return {boolean} True if a component was found in and unmounted from
	   *                   `container`
	   */
	  unmountComponentAtNode: function (container) {
	    // Various parts of our code (such as ReactCompositeComponent's
	    // _renderValidatedComponent) assume that calls to render aren't nested;
	    // verify that that's the case. (Strictly speaking, unmounting won't cause a
	    // render but we still don't expect to be in a render call here.)
	     false ? warning(ReactCurrentOwner.current == null, 'unmountComponentAtNode(): Render methods should be a pure function ' + 'of props and state; triggering nested component updates from render ' + 'is not allowed. If necessary, trigger nested updates in ' + 'componentDidUpdate. Check the render method of %s.', ReactCurrentOwner.current && ReactCurrentOwner.current.getName() || 'ReactCompositeComponent') : undefined;

	    !(container && (container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE || container.nodeType === DOCUMENT_FRAGMENT_NODE_TYPE)) ?  false ? invariant(false, 'unmountComponentAtNode(...): Target container is not a DOM element.') : invariant(false) : undefined;

	    var reactRootID = getReactRootID(container);
	    var component = instancesByReactRootID[reactRootID];
	    if (!component) {
	      // Check if the node being unmounted was rendered by React, but isn't a
	      // root node.
	      var containerHasNonRootReactChild = hasNonRootReactChild(container);

	      // Check if the container itself is a React root node.
	      var containerID = internalGetID(container);
	      var isContainerReactRoot = containerID && containerID === ReactInstanceHandles.getReactRootIDFromNodeID(containerID);

	      if (false) {
	        process.env.NODE_ENV !== 'production' ? warning(!containerHasNonRootReactChild, 'unmountComponentAtNode(): The node you\'re attempting to unmount ' + 'was rendered by React and is not a top-level container. %s', isContainerReactRoot ? 'You may have accidentally passed in a React root node instead ' + 'of its container.' : 'Instead, have the parent component update its state and ' + 'rerender in order to remove this component.') : undefined;
	      }

	      return false;
	    }
	    ReactUpdates.batchedUpdates(unmountComponentFromNode, component, container);
	    delete instancesByReactRootID[reactRootID];
	    delete containersByReactRootID[reactRootID];
	    if (false) {
	      delete rootElementsByReactRootID[reactRootID];
	    }
	    return true;
	  },

	  /**
	   * Finds the container DOM element that contains React component to which the
	   * supplied DOM `id` belongs.
	   *
	   * @param {string} id The ID of an element rendered by a React component.
	   * @return {?DOMElement} DOM element that contains the `id`.
	   */
	  findReactContainerForID: function (id) {
	    var reactRootID = ReactInstanceHandles.getReactRootIDFromNodeID(id);
	    var container = containersByReactRootID[reactRootID];

	    if (false) {
	      var rootElement = rootElementsByReactRootID[reactRootID];
	      if (rootElement && rootElement.parentNode !== container) {
	        process.env.NODE_ENV !== 'production' ? warning(
	        // Call internalGetID here because getID calls isValid which calls
	        // findReactContainerForID (this function).
	        internalGetID(rootElement) === reactRootID, 'ReactMount: Root element ID differed from reactRootID.') : undefined;
	        var containerChild = container.firstChild;
	        if (containerChild && reactRootID === internalGetID(containerChild)) {
	          // If the container has a new child with the same ID as the old
	          // root element, then rootElementsByReactRootID[reactRootID] is
	          // just stale and needs to be updated. The case that deserves a
	          // warning is when the container is empty.
	          rootElementsByReactRootID[reactRootID] = containerChild;
	        } else {
	          process.env.NODE_ENV !== 'production' ? warning(false, 'ReactMount: Root element has been removed from its original ' + 'container. New container: %s', rootElement.parentNode) : undefined;
	        }
	      }
	    }

	    return container;
	  },

	  /**
	   * Finds an element rendered by React with the supplied ID.
	   *
	   * @param {string} id ID of a DOM node in the React component.
	   * @return {DOMElement} Root DOM node of the React component.
	   */
	  findReactNodeByID: function (id) {
	    var reactRoot = ReactMount.findReactContainerForID(id);
	    return ReactMount.findComponentRoot(reactRoot, id);
	  },

	  /**
	   * Traverses up the ancestors of the supplied node to find a node that is a
	   * DOM representation of a React component rendered by this copy of React.
	   *
	   * @param {*} node
	   * @return {?DOMEventTarget}
	   * @internal
	   */
	  getFirstReactDOM: function (node) {
	    return findFirstReactDOMImpl(node);
	  },

	  /**
	   * Finds a node with the supplied `targetID` inside of the supplied
	   * `ancestorNode`.  Exploits the ID naming scheme to perform the search
	   * quickly.
	   *
	   * @param {DOMEventTarget} ancestorNode Search from this root.
	   * @pararm {string} targetID ID of the DOM representation of the component.
	   * @return {DOMEventTarget} DOM node with the supplied `targetID`.
	   * @internal
	   */
	  findComponentRoot: function (ancestorNode, targetID) {
	    var firstChildren = findComponentRootReusableArray;
	    var childIndex = 0;

	    var deepestAncestor = findDeepestCachedAncestor(targetID) || ancestorNode;

	    if (false) {
	      // This will throw on the next line; give an early warning
	      process.env.NODE_ENV !== 'production' ? warning(deepestAncestor != null, 'React can\'t find the root component node for data-reactid value ' + '`%s`. If you\'re seeing this message, it probably means that ' + 'you\'ve loaded two copies of React on the page. At this time, only ' + 'a single copy of React can be loaded at a time.', targetID) : undefined;
	    }

	    firstChildren[0] = deepestAncestor.firstChild;
	    firstChildren.length = 1;

	    while (childIndex < firstChildren.length) {
	      var child = firstChildren[childIndex++];
	      var targetChild;

	      while (child) {
	        var childID = ReactMount.getID(child);
	        if (childID) {
	          // Even if we find the node we're looking for, we finish looping
	          // through its siblings to ensure they're cached so that we don't have
	          // to revisit this node again. Otherwise, we make n^2 calls to getID
	          // when visiting the many children of a single node in order.

	          if (targetID === childID) {
	            targetChild = child;
	          } else if (ReactInstanceHandles.isAncestorIDOf(childID, targetID)) {
	            // If we find a child whose ID is an ancestor of the given ID,
	            // then we can be sure that we only want to search the subtree
	            // rooted at this child, so we can throw out the rest of the
	            // search state.
	            firstChildren.length = childIndex = 0;
	            firstChildren.push(child.firstChild);
	          }
	        } else {
	          // If this child had no ID, then there's a chance that it was
	          // injected automatically by the browser, as when a `<table>`
	          // element sprouts an extra `<tbody>` child as a side effect of
	          // `.innerHTML` parsing. Optimistically continue down this
	          // branch, but not before examining the other siblings.
	          firstChildren.push(child.firstChild);
	        }

	        child = child.nextSibling;
	      }

	      if (targetChild) {
	        // Emptying firstChildren/findComponentRootReusableArray is
	        // not necessary for correctness, but it helps the GC reclaim
	        // any nodes that were left at the end of the search.
	        firstChildren.length = 0;

	        return targetChild;
	      }
	    }

	    firstChildren.length = 0;

	     true ?  false ? invariant(false, 'findComponentRoot(..., %s): Unable to find element. This probably ' + 'means the DOM was unexpectedly mutated (e.g., by the browser), ' + 'usually due to forgetting a <tbody> when using tables, nesting tags ' + 'like <form>, <p>, or <a>, or using non-SVG elements in an <svg> ' + 'parent. ' + 'Try inspecting the child nodes of the element with React ID `%s`.', targetID, ReactMount.getID(ancestorNode)) : invariant(false) : undefined;
	  },

	  _mountImageIntoNode: function (markup, container, shouldReuseMarkup, transaction) {
	    !(container && (container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE || container.nodeType === DOCUMENT_FRAGMENT_NODE_TYPE)) ?  false ? invariant(false, 'mountComponentIntoNode(...): Target container is not valid.') : invariant(false) : undefined;

	    if (shouldReuseMarkup) {
	      var rootElement = getReactRootElementInContainer(container);
	      if (ReactMarkupChecksum.canReuseMarkup(markup, rootElement)) {
	        return;
	      } else {
	        var checksum = rootElement.getAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);
	        rootElement.removeAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);

	        var rootMarkup = rootElement.outerHTML;
	        rootElement.setAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME, checksum);

	        var normalizedMarkup = markup;
	        if (false) {
	          // because rootMarkup is retrieved from the DOM, various normalizations
	          // will have occurred which will not be present in `markup`. Here,
	          // insert markup into a <div> or <iframe> depending on the container
	          // type to perform the same normalizations before comparing.
	          var normalizer;
	          if (container.nodeType === ELEMENT_NODE_TYPE) {
	            normalizer = document.createElement('div');
	            normalizer.innerHTML = markup;
	            normalizedMarkup = normalizer.innerHTML;
	          } else {
	            normalizer = document.createElement('iframe');
	            document.body.appendChild(normalizer);
	            normalizer.contentDocument.write(markup);
	            normalizedMarkup = normalizer.contentDocument.documentElement.outerHTML;
	            document.body.removeChild(normalizer);
	          }
	        }

	        var diffIndex = firstDifferenceIndex(normalizedMarkup, rootMarkup);
	        var difference = ' (client) ' + normalizedMarkup.substring(diffIndex - 20, diffIndex + 20) + '\n (server) ' + rootMarkup.substring(diffIndex - 20, diffIndex + 20);

	        !(container.nodeType !== DOC_NODE_TYPE) ?  false ? invariant(false, 'You\'re trying to render a component to the document using ' + 'server rendering but the checksum was invalid. This usually ' + 'means you rendered a different component type or props on ' + 'the client from the one on the server, or your render() ' + 'methods are impure. React cannot handle this case due to ' + 'cross-browser quirks by rendering at the document root. You ' + 'should look for environment dependent code in your components ' + 'and ensure the props are the same client and server side:\n%s', difference) : invariant(false) : undefined;

	        if (false) {
	          process.env.NODE_ENV !== 'production' ? warning(false, 'React attempted to reuse markup in a container but the ' + 'checksum was invalid. This generally means that you are ' + 'using server rendering and the markup generated on the ' + 'server was not what the client was expecting. React injected ' + 'new markup to compensate which works but you have lost many ' + 'of the benefits of server rendering. Instead, figure out ' + 'why the markup being generated is different on the client ' + 'or server:\n%s', difference) : undefined;
	        }
	      }
	    }

	    !(container.nodeType !== DOC_NODE_TYPE) ?  false ? invariant(false, 'You\'re trying to render a component to the document but ' + 'you didn\'t use server rendering. We can\'t do this ' + 'without using server rendering due to cross-browser quirks. ' + 'See ReactDOMServer.renderToString() for server rendering.') : invariant(false) : undefined;

	    if (transaction.useCreateElement) {
	      while (container.lastChild) {
	        container.removeChild(container.lastChild);
	      }
	      container.appendChild(markup);
	    } else {
	      setInnerHTML(container, markup);
	    }
	  },

	  ownerDocumentContextKey: ownerDocumentContextKey,

	  /**
	   * React ID utilities.
	   */

	  getReactRootID: getReactRootID,

	  getID: getID,

	  setID: setID,

	  getNode: getNode,

	  getNodeFromInstance: getNodeFromInstance,

	  isValid: isValid,

	  purgeID: purgeID
	};

	ReactPerf.measureMethods(ReactMount, 'ReactMount', {
	  _renderNewRootComponent: '_renderNewRootComponent',
	  _mountImageIntoNode: '_mountImageIntoNode'
	});

	module.exports = ReactMount;

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactBrowserEventEmitter
	 * @typechecks static-only
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPluginHub = __webpack_require__(31);
	var EventPluginRegistry = __webpack_require__(32);
	var ReactEventEmitterMixin = __webpack_require__(37);
	var ReactPerf = __webpack_require__(18);
	var ViewportMetrics = __webpack_require__(38);

	var assign = __webpack_require__(39);
	var isEventSupported = __webpack_require__(40);

	/**
	 * Summary of `ReactBrowserEventEmitter` event handling:
	 *
	 *  - Top-level delegation is used to trap most native browser events. This
	 *    may only occur in the main thread and is the responsibility of
	 *    ReactEventListener, which is injected and can therefore support pluggable
	 *    event sources. This is the only work that occurs in the main thread.
	 *
	 *  - We normalize and de-duplicate events to account for browser quirks. This
	 *    may be done in the worker thread.
	 *
	 *  - Forward these native events (with the associated top-level type used to
	 *    trap it) to `EventPluginHub`, which in turn will ask plugins if they want
	 *    to extract any synthetic events.
	 *
	 *  - The `EventPluginHub` will then process each event by annotating them with
	 *    "dispatches", a sequence of listeners and IDs that care about that event.
	 *
	 *  - The `EventPluginHub` then dispatches the events.
	 *
	 * Overview of React and the event system:
	 *
	 * +------------+    .
	 * |    DOM     |    .
	 * +------------+    .
	 *       |           .
	 *       v           .
	 * +------------+    .
	 * | ReactEvent |    .
	 * |  Listener  |    .
	 * +------------+    .                         +-----------+
	 *       |           .               +--------+|SimpleEvent|
	 *       |           .               |         |Plugin     |
	 * +-----|------+    .               v         +-----------+
	 * |     |      |    .    +--------------+                    +------------+
	 * |     +-----------.--->|EventPluginHub|                    |    Event   |
	 * |            |    .    |              |     +-----------+  | Propagators|
	 * | ReactEvent |    .    |              |     |TapEvent   |  |------------|
	 * |  Emitter   |    .    |              |<---+|Plugin     |  |other plugin|
	 * |            |    .    |              |     +-----------+  |  utilities |
	 * |     +-----------.--->|              |                    +------------+
	 * |     |      |    .    +--------------+
	 * +-----|------+    .                ^        +-----------+
	 *       |           .                |        |Enter/Leave|
	 *       +           .                +-------+|Plugin     |
	 * +-------------+   .                         +-----------+
	 * | application |   .
	 * |-------------|   .
	 * |             |   .
	 * |             |   .
	 * +-------------+   .
	 *                   .
	 *    React Core     .  General Purpose Event Plugin System
	 */

	var alreadyListeningTo = {};
	var isMonitoringScrollValue = false;
	var reactTopListenersCounter = 0;

	// For events like 'submit' which don't consistently bubble (which we trap at a
	// lower node than `document`), binding at `document` would cause duplicate
	// events so we don't include them here
	var topEventMapping = {
	  topAbort: 'abort',
	  topBlur: 'blur',
	  topCanPlay: 'canplay',
	  topCanPlayThrough: 'canplaythrough',
	  topChange: 'change',
	  topClick: 'click',
	  topCompositionEnd: 'compositionend',
	  topCompositionStart: 'compositionstart',
	  topCompositionUpdate: 'compositionupdate',
	  topContextMenu: 'contextmenu',
	  topCopy: 'copy',
	  topCut: 'cut',
	  topDoubleClick: 'dblclick',
	  topDrag: 'drag',
	  topDragEnd: 'dragend',
	  topDragEnter: 'dragenter',
	  topDragExit: 'dragexit',
	  topDragLeave: 'dragleave',
	  topDragOver: 'dragover',
	  topDragStart: 'dragstart',
	  topDrop: 'drop',
	  topDurationChange: 'durationchange',
	  topEmptied: 'emptied',
	  topEncrypted: 'encrypted',
	  topEnded: 'ended',
	  topError: 'error',
	  topFocus: 'focus',
	  topInput: 'input',
	  topKeyDown: 'keydown',
	  topKeyPress: 'keypress',
	  topKeyUp: 'keyup',
	  topLoadedData: 'loadeddata',
	  topLoadedMetadata: 'loadedmetadata',
	  topLoadStart: 'loadstart',
	  topMouseDown: 'mousedown',
	  topMouseMove: 'mousemove',
	  topMouseOut: 'mouseout',
	  topMouseOver: 'mouseover',
	  topMouseUp: 'mouseup',
	  topPaste: 'paste',
	  topPause: 'pause',
	  topPlay: 'play',
	  topPlaying: 'playing',
	  topProgress: 'progress',
	  topRateChange: 'ratechange',
	  topScroll: 'scroll',
	  topSeeked: 'seeked',
	  topSeeking: 'seeking',
	  topSelectionChange: 'selectionchange',
	  topStalled: 'stalled',
	  topSuspend: 'suspend',
	  topTextInput: 'textInput',
	  topTimeUpdate: 'timeupdate',
	  topTouchCancel: 'touchcancel',
	  topTouchEnd: 'touchend',
	  topTouchMove: 'touchmove',
	  topTouchStart: 'touchstart',
	  topVolumeChange: 'volumechange',
	  topWaiting: 'waiting',
	  topWheel: 'wheel'
	};

	/**
	 * To ensure no conflicts with other potential React instances on the page
	 */
	var topListenersIDKey = '_reactListenersID' + String(Math.random()).slice(2);

	function getListeningForDocument(mountAt) {
	  // In IE8, `mountAt` is a host object and doesn't have `hasOwnProperty`
	  // directly.
	  if (!Object.prototype.hasOwnProperty.call(mountAt, topListenersIDKey)) {
	    mountAt[topListenersIDKey] = reactTopListenersCounter++;
	    alreadyListeningTo[mountAt[topListenersIDKey]] = {};
	  }
	  return alreadyListeningTo[mountAt[topListenersIDKey]];
	}

	/**
	 * `ReactBrowserEventEmitter` is used to attach top-level event listeners. For
	 * example:
	 *
	 *   ReactBrowserEventEmitter.putListener('myID', 'onClick', myFunction);
	 *
	 * This would allocate a "registration" of `('onClick', myFunction)` on 'myID'.
	 *
	 * @internal
	 */
	var ReactBrowserEventEmitter = assign({}, ReactEventEmitterMixin, {

	  /**
	   * Injectable event backend
	   */
	  ReactEventListener: null,

	  injection: {
	    /**
	     * @param {object} ReactEventListener
	     */
	    injectReactEventListener: function (ReactEventListener) {
	      ReactEventListener.setHandleTopLevel(ReactBrowserEventEmitter.handleTopLevel);
	      ReactBrowserEventEmitter.ReactEventListener = ReactEventListener;
	    }
	  },

	  /**
	   * Sets whether or not any created callbacks should be enabled.
	   *
	   * @param {boolean} enabled True if callbacks should be enabled.
	   */
	  setEnabled: function (enabled) {
	    if (ReactBrowserEventEmitter.ReactEventListener) {
	      ReactBrowserEventEmitter.ReactEventListener.setEnabled(enabled);
	    }
	  },

	  /**
	   * @return {boolean} True if callbacks are enabled.
	   */
	  isEnabled: function () {
	    return !!(ReactBrowserEventEmitter.ReactEventListener && ReactBrowserEventEmitter.ReactEventListener.isEnabled());
	  },

	  /**
	   * We listen for bubbled touch events on the document object.
	   *
	   * Firefox v8.01 (and possibly others) exhibited strange behavior when
	   * mounting `onmousemove` events at some node that was not the document
	   * element. The symptoms were that if your mouse is not moving over something
	   * contained within that mount point (for example on the background) the
	   * top-level listeners for `onmousemove` won't be called. However, if you
	   * register the `mousemove` on the document object, then it will of course
	   * catch all `mousemove`s. This along with iOS quirks, justifies restricting
	   * top-level listeners to the document object only, at least for these
	   * movement types of events and possibly all events.
	   *
	   * @see http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
	   *
	   * Also, `keyup`/`keypress`/`keydown` do not bubble to the window on IE, but
	   * they bubble to document.
	   *
	   * @param {string} registrationName Name of listener (e.g. `onClick`).
	   * @param {object} contentDocumentHandle Document which owns the container
	   */
	  listenTo: function (registrationName, contentDocumentHandle) {
	    var mountAt = contentDocumentHandle;
	    var isListening = getListeningForDocument(mountAt);
	    var dependencies = EventPluginRegistry.registrationNameDependencies[registrationName];

	    var topLevelTypes = EventConstants.topLevelTypes;
	    for (var i = 0; i < dependencies.length; i++) {
	      var dependency = dependencies[i];
	      if (!(isListening.hasOwnProperty(dependency) && isListening[dependency])) {
	        if (dependency === topLevelTypes.topWheel) {
	          if (isEventSupported('wheel')) {
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'wheel', mountAt);
	          } else if (isEventSupported('mousewheel')) {
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'mousewheel', mountAt);
	          } else {
	            // Firefox needs to capture a different mouse scroll event.
	            // @see http://www.quirksmode.org/dom/events/tests/scroll.html
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'DOMMouseScroll', mountAt);
	          }
	        } else if (dependency === topLevelTypes.topScroll) {

	          if (isEventSupported('scroll', true)) {
	            ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topScroll, 'scroll', mountAt);
	          } else {
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topScroll, 'scroll', ReactBrowserEventEmitter.ReactEventListener.WINDOW_HANDLE);
	          }
	        } else if (dependency === topLevelTypes.topFocus || dependency === topLevelTypes.topBlur) {

	          if (isEventSupported('focus', true)) {
	            ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topFocus, 'focus', mountAt);
	            ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topBlur, 'blur', mountAt);
	          } else if (isEventSupported('focusin')) {
	            // IE has `focusin` and `focusout` events which bubble.
	            // @see http://www.quirksmode.org/blog/archives/2008/04/delegating_the.html
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topFocus, 'focusin', mountAt);
	            ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topBlur, 'focusout', mountAt);
	          }

	          // to make sure blur and focus event listeners are only attached once
	          isListening[topLevelTypes.topBlur] = true;
	          isListening[topLevelTypes.topFocus] = true;
	        } else if (topEventMapping.hasOwnProperty(dependency)) {
	          ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(dependency, topEventMapping[dependency], mountAt);
	        }

	        isListening[dependency] = true;
	      }
	    }
	  },

	  trapBubbledEvent: function (topLevelType, handlerBaseName, handle) {
	    return ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelType, handlerBaseName, handle);
	  },

	  trapCapturedEvent: function (topLevelType, handlerBaseName, handle) {
	    return ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelType, handlerBaseName, handle);
	  },

	  /**
	   * Listens to window scroll and resize events. We cache scroll values so that
	   * application code can access them without triggering reflows.
	   *
	   * NOTE: Scroll events do not bubble.
	   *
	   * @see http://www.quirksmode.org/dom/events/scroll.html
	   */
	  ensureScrollValueMonitoring: function () {
	    if (!isMonitoringScrollValue) {
	      var refresh = ViewportMetrics.refreshScrollValues;
	      ReactBrowserEventEmitter.ReactEventListener.monitorScrollValue(refresh);
	      isMonitoringScrollValue = true;
	    }
	  },

	  eventNameDispatchConfigs: EventPluginHub.eventNameDispatchConfigs,

	  registrationNameModules: EventPluginHub.registrationNameModules,

	  putListener: EventPluginHub.putListener,

	  getListener: EventPluginHub.getListener,

	  deleteListener: EventPluginHub.deleteListener,

	  deleteAllListeners: EventPluginHub.deleteAllListeners

	});

	ReactPerf.measureMethods(ReactBrowserEventEmitter, 'ReactBrowserEventEmitter', {
	  putListener: 'putListener',
	  deleteListener: 'deleteListener'
	});

	module.exports = ReactBrowserEventEmitter;

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventConstants
	 */

	'use strict';

	var keyMirror = __webpack_require__(17);

	var PropagationPhases = keyMirror({ bubbled: null, captured: null });

	/**
	 * Types of raw signals from the browser caught at the top level.
	 */
	var topLevelTypes = keyMirror({
	  topAbort: null,
	  topBlur: null,
	  topCanPlay: null,
	  topCanPlayThrough: null,
	  topChange: null,
	  topClick: null,
	  topCompositionEnd: null,
	  topCompositionStart: null,
	  topCompositionUpdate: null,
	  topContextMenu: null,
	  topCopy: null,
	  topCut: null,
	  topDoubleClick: null,
	  topDrag: null,
	  topDragEnd: null,
	  topDragEnter: null,
	  topDragExit: null,
	  topDragLeave: null,
	  topDragOver: null,
	  topDragStart: null,
	  topDrop: null,
	  topDurationChange: null,
	  topEmptied: null,
	  topEncrypted: null,
	  topEnded: null,
	  topError: null,
	  topFocus: null,
	  topInput: null,
	  topKeyDown: null,
	  topKeyPress: null,
	  topKeyUp: null,
	  topLoad: null,
	  topLoadedData: null,
	  topLoadedMetadata: null,
	  topLoadStart: null,
	  topMouseDown: null,
	  topMouseMove: null,
	  topMouseOut: null,
	  topMouseOver: null,
	  topMouseUp: null,
	  topPaste: null,
	  topPause: null,
	  topPlay: null,
	  topPlaying: null,
	  topProgress: null,
	  topRateChange: null,
	  topReset: null,
	  topScroll: null,
	  topSeeked: null,
	  topSeeking: null,
	  topSelectionChange: null,
	  topStalled: null,
	  topSubmit: null,
	  topSuspend: null,
	  topTextInput: null,
	  topTimeUpdate: null,
	  topTouchCancel: null,
	  topTouchEnd: null,
	  topTouchMove: null,
	  topTouchStart: null,
	  topVolumeChange: null,
	  topWaiting: null,
	  topWheel: null
	});

	var EventConstants = {
	  topLevelTypes: topLevelTypes,
	  PropagationPhases: PropagationPhases
	};

	module.exports = EventConstants;

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventPluginHub
	 */

	'use strict';

	var EventPluginRegistry = __webpack_require__(32);
	var EventPluginUtils = __webpack_require__(33);
	var ReactErrorUtils = __webpack_require__(34);

	var accumulateInto = __webpack_require__(35);
	var forEachAccumulated = __webpack_require__(36);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	/**
	 * Internal store for event listeners
	 */
	var listenerBank = {};

	/**
	 * Internal queue of events that have accumulated their dispatches and are
	 * waiting to have their dispatches executed.
	 */
	var eventQueue = null;

	/**
	 * Dispatches an event and releases it back into the pool, unless persistent.
	 *
	 * @param {?object} event Synthetic event to be dispatched.
	 * @param {boolean} simulated If the event is simulated (changes exn behavior)
	 * @private
	 */
	var executeDispatchesAndRelease = function (event, simulated) {
	  if (event) {
	    EventPluginUtils.executeDispatchesInOrder(event, simulated);

	    if (!event.isPersistent()) {
	      event.constructor.release(event);
	    }
	  }
	};
	var executeDispatchesAndReleaseSimulated = function (e) {
	  return executeDispatchesAndRelease(e, true);
	};
	var executeDispatchesAndReleaseTopLevel = function (e) {
	  return executeDispatchesAndRelease(e, false);
	};

	/**
	 * - `InstanceHandle`: [required] Module that performs logical traversals of DOM
	 *   hierarchy given ids of the logical DOM elements involved.
	 */
	var InstanceHandle = null;

	function validateInstanceHandle() {
	  var valid = InstanceHandle && InstanceHandle.traverseTwoPhase && InstanceHandle.traverseEnterLeave;
	   false ? warning(valid, 'InstanceHandle not injected before use!') : undefined;
	}

	/**
	 * This is a unified interface for event plugins to be installed and configured.
	 *
	 * Event plugins can implement the following properties:
	 *
	 *   `extractEvents` {function(string, DOMEventTarget, string, object): *}
	 *     Required. When a top-level event is fired, this method is expected to
	 *     extract synthetic events that will in turn be queued and dispatched.
	 *
	 *   `eventTypes` {object}
	 *     Optional, plugins that fire events must publish a mapping of registration
	 *     names that are used to register listeners. Values of this mapping must
	 *     be objects that contain `registrationName` or `phasedRegistrationNames`.
	 *
	 *   `executeDispatch` {function(object, function, string)}
	 *     Optional, allows plugins to override how an event gets dispatched. By
	 *     default, the listener is simply invoked.
	 *
	 * Each plugin that is injected into `EventsPluginHub` is immediately operable.
	 *
	 * @public
	 */
	var EventPluginHub = {

	  /**
	   * Methods for injecting dependencies.
	   */
	  injection: {

	    /**
	     * @param {object} InjectedMount
	     * @public
	     */
	    injectMount: EventPluginUtils.injection.injectMount,

	    /**
	     * @param {object} InjectedInstanceHandle
	     * @public
	     */
	    injectInstanceHandle: function (InjectedInstanceHandle) {
	      InstanceHandle = InjectedInstanceHandle;
	      if (false) {
	        validateInstanceHandle();
	      }
	    },

	    getInstanceHandle: function () {
	      if (false) {
	        validateInstanceHandle();
	      }
	      return InstanceHandle;
	    },

	    /**
	     * @param {array} InjectedEventPluginOrder
	     * @public
	     */
	    injectEventPluginOrder: EventPluginRegistry.injectEventPluginOrder,

	    /**
	     * @param {object} injectedNamesToPlugins Map from names to plugin modules.
	     */
	    injectEventPluginsByName: EventPluginRegistry.injectEventPluginsByName

	  },

	  eventNameDispatchConfigs: EventPluginRegistry.eventNameDispatchConfigs,

	  registrationNameModules: EventPluginRegistry.registrationNameModules,

	  /**
	   * Stores `listener` at `listenerBank[registrationName][id]`. Is idempotent.
	   *
	   * @param {string} id ID of the DOM element.
	   * @param {string} registrationName Name of listener (e.g. `onClick`).
	   * @param {?function} listener The callback to store.
	   */
	  putListener: function (id, registrationName, listener) {
	    !(typeof listener === 'function') ?  false ? invariant(false, 'Expected %s listener to be a function, instead got type %s', registrationName, typeof listener) : invariant(false) : undefined;

	    var bankForRegistrationName = listenerBank[registrationName] || (listenerBank[registrationName] = {});
	    bankForRegistrationName[id] = listener;

	    var PluginModule = EventPluginRegistry.registrationNameModules[registrationName];
	    if (PluginModule && PluginModule.didPutListener) {
	      PluginModule.didPutListener(id, registrationName, listener);
	    }
	  },

	  /**
	   * @param {string} id ID of the DOM element.
	   * @param {string} registrationName Name of listener (e.g. `onClick`).
	   * @return {?function} The stored callback.
	   */
	  getListener: function (id, registrationName) {
	    var bankForRegistrationName = listenerBank[registrationName];
	    return bankForRegistrationName && bankForRegistrationName[id];
	  },

	  /**
	   * Deletes a listener from the registration bank.
	   *
	   * @param {string} id ID of the DOM element.
	   * @param {string} registrationName Name of listener (e.g. `onClick`).
	   */
	  deleteListener: function (id, registrationName) {
	    var PluginModule = EventPluginRegistry.registrationNameModules[registrationName];
	    if (PluginModule && PluginModule.willDeleteListener) {
	      PluginModule.willDeleteListener(id, registrationName);
	    }

	    var bankForRegistrationName = listenerBank[registrationName];
	    // TODO: This should never be null -- when is it?
	    if (bankForRegistrationName) {
	      delete bankForRegistrationName[id];
	    }
	  },

	  /**
	   * Deletes all listeners for the DOM element with the supplied ID.
	   *
	   * @param {string} id ID of the DOM element.
	   */
	  deleteAllListeners: function (id) {
	    for (var registrationName in listenerBank) {
	      if (!listenerBank[registrationName][id]) {
	        continue;
	      }

	      var PluginModule = EventPluginRegistry.registrationNameModules[registrationName];
	      if (PluginModule && PluginModule.willDeleteListener) {
	        PluginModule.willDeleteListener(id, registrationName);
	      }

	      delete listenerBank[registrationName][id];
	    }
	  },

	  /**
	   * Allows registered plugins an opportunity to extract events from top-level
	   * native browser events.
	   *
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @internal
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    var events;
	    var plugins = EventPluginRegistry.plugins;
	    for (var i = 0; i < plugins.length; i++) {
	      // Not every plugin in the ordering may be loaded at runtime.
	      var possiblePlugin = plugins[i];
	      if (possiblePlugin) {
	        var extractedEvents = possiblePlugin.extractEvents(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget);
	        if (extractedEvents) {
	          events = accumulateInto(events, extractedEvents);
	        }
	      }
	    }
	    return events;
	  },

	  /**
	   * Enqueues a synthetic event that should be dispatched when
	   * `processEventQueue` is invoked.
	   *
	   * @param {*} events An accumulation of synthetic events.
	   * @internal
	   */
	  enqueueEvents: function (events) {
	    if (events) {
	      eventQueue = accumulateInto(eventQueue, events);
	    }
	  },

	  /**
	   * Dispatches all synthetic events on the event queue.
	   *
	   * @internal
	   */
	  processEventQueue: function (simulated) {
	    // Set `eventQueue` to null before processing it so that we can tell if more
	    // events get enqueued while processing.
	    var processingEventQueue = eventQueue;
	    eventQueue = null;
	    if (simulated) {
	      forEachAccumulated(processingEventQueue, executeDispatchesAndReleaseSimulated);
	    } else {
	      forEachAccumulated(processingEventQueue, executeDispatchesAndReleaseTopLevel);
	    }
	    !!eventQueue ?  false ? invariant(false, 'processEventQueue(): Additional events were enqueued while processing ' + 'an event queue. Support for this has not yet been implemented.') : invariant(false) : undefined;
	    // This would be a good time to rethrow if any of the event handlers threw.
	    ReactErrorUtils.rethrowCaughtError();
	  },

	  /**
	   * These are needed for tests only. Do not use!
	   */
	  __purge: function () {
	    listenerBank = {};
	  },

	  __getListenerBank: function () {
	    return listenerBank;
	  }

	};

	module.exports = EventPluginHub;

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventPluginRegistry
	 * @typechecks static-only
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * Injectable ordering of event plugins.
	 */
	var EventPluginOrder = null;

	/**
	 * Injectable mapping from names to event plugin modules.
	 */
	var namesToPlugins = {};

	/**
	 * Recomputes the plugin list using the injected plugins and plugin ordering.
	 *
	 * @private
	 */
	function recomputePluginOrdering() {
	  if (!EventPluginOrder) {
	    // Wait until an `EventPluginOrder` is injected.
	    return;
	  }
	  for (var pluginName in namesToPlugins) {
	    var PluginModule = namesToPlugins[pluginName];
	    var pluginIndex = EventPluginOrder.indexOf(pluginName);
	    !(pluginIndex > -1) ?  false ? invariant(false, 'EventPluginRegistry: Cannot inject event plugins that do not exist in ' + 'the plugin ordering, `%s`.', pluginName) : invariant(false) : undefined;
	    if (EventPluginRegistry.plugins[pluginIndex]) {
	      continue;
	    }
	    !PluginModule.extractEvents ?  false ? invariant(false, 'EventPluginRegistry: Event plugins must implement an `extractEvents` ' + 'method, but `%s` does not.', pluginName) : invariant(false) : undefined;
	    EventPluginRegistry.plugins[pluginIndex] = PluginModule;
	    var publishedEvents = PluginModule.eventTypes;
	    for (var eventName in publishedEvents) {
	      !publishEventForPlugin(publishedEvents[eventName], PluginModule, eventName) ?  false ? invariant(false, 'EventPluginRegistry: Failed to publish event `%s` for plugin `%s`.', eventName, pluginName) : invariant(false) : undefined;
	    }
	  }
	}

	/**
	 * Publishes an event so that it can be dispatched by the supplied plugin.
	 *
	 * @param {object} dispatchConfig Dispatch configuration for the event.
	 * @param {object} PluginModule Plugin publishing the event.
	 * @return {boolean} True if the event was successfully published.
	 * @private
	 */
	function publishEventForPlugin(dispatchConfig, PluginModule, eventName) {
	  !!EventPluginRegistry.eventNameDispatchConfigs.hasOwnProperty(eventName) ?  false ? invariant(false, 'EventPluginHub: More than one plugin attempted to publish the same ' + 'event name, `%s`.', eventName) : invariant(false) : undefined;
	  EventPluginRegistry.eventNameDispatchConfigs[eventName] = dispatchConfig;

	  var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
	  if (phasedRegistrationNames) {
	    for (var phaseName in phasedRegistrationNames) {
	      if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
	        var phasedRegistrationName = phasedRegistrationNames[phaseName];
	        publishRegistrationName(phasedRegistrationName, PluginModule, eventName);
	      }
	    }
	    return true;
	  } else if (dispatchConfig.registrationName) {
	    publishRegistrationName(dispatchConfig.registrationName, PluginModule, eventName);
	    return true;
	  }
	  return false;
	}

	/**
	 * Publishes a registration name that is used to identify dispatched events and
	 * can be used with `EventPluginHub.putListener` to register listeners.
	 *
	 * @param {string} registrationName Registration name to add.
	 * @param {object} PluginModule Plugin publishing the event.
	 * @private
	 */
	function publishRegistrationName(registrationName, PluginModule, eventName) {
	  !!EventPluginRegistry.registrationNameModules[registrationName] ?  false ? invariant(false, 'EventPluginHub: More than one plugin attempted to publish the same ' + 'registration name, `%s`.', registrationName) : invariant(false) : undefined;
	  EventPluginRegistry.registrationNameModules[registrationName] = PluginModule;
	  EventPluginRegistry.registrationNameDependencies[registrationName] = PluginModule.eventTypes[eventName].dependencies;
	}

	/**
	 * Registers plugins so that they can extract and dispatch events.
	 *
	 * @see {EventPluginHub}
	 */
	var EventPluginRegistry = {

	  /**
	   * Ordered list of injected plugins.
	   */
	  plugins: [],

	  /**
	   * Mapping from event name to dispatch config
	   */
	  eventNameDispatchConfigs: {},

	  /**
	   * Mapping from registration name to plugin module
	   */
	  registrationNameModules: {},

	  /**
	   * Mapping from registration name to event name
	   */
	  registrationNameDependencies: {},

	  /**
	   * Injects an ordering of plugins (by plugin name). This allows the ordering
	   * to be decoupled from injection of the actual plugins so that ordering is
	   * always deterministic regardless of packaging, on-the-fly injection, etc.
	   *
	   * @param {array} InjectedEventPluginOrder
	   * @internal
	   * @see {EventPluginHub.injection.injectEventPluginOrder}
	   */
	  injectEventPluginOrder: function (InjectedEventPluginOrder) {
	    !!EventPluginOrder ?  false ? invariant(false, 'EventPluginRegistry: Cannot inject event plugin ordering more than ' + 'once. You are likely trying to load more than one copy of React.') : invariant(false) : undefined;
	    // Clone the ordering so it cannot be dynamically mutated.
	    EventPluginOrder = Array.prototype.slice.call(InjectedEventPluginOrder);
	    recomputePluginOrdering();
	  },

	  /**
	   * Injects plugins to be used by `EventPluginHub`. The plugin names must be
	   * in the ordering injected by `injectEventPluginOrder`.
	   *
	   * Plugins can be injected as part of page initialization or on-the-fly.
	   *
	   * @param {object} injectedNamesToPlugins Map from names to plugin modules.
	   * @internal
	   * @see {EventPluginHub.injection.injectEventPluginsByName}
	   */
	  injectEventPluginsByName: function (injectedNamesToPlugins) {
	    var isOrderingDirty = false;
	    for (var pluginName in injectedNamesToPlugins) {
	      if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
	        continue;
	      }
	      var PluginModule = injectedNamesToPlugins[pluginName];
	      if (!namesToPlugins.hasOwnProperty(pluginName) || namesToPlugins[pluginName] !== PluginModule) {
	        !!namesToPlugins[pluginName] ?  false ? invariant(false, 'EventPluginRegistry: Cannot inject two different event plugins ' + 'using the same name, `%s`.', pluginName) : invariant(false) : undefined;
	        namesToPlugins[pluginName] = PluginModule;
	        isOrderingDirty = true;
	      }
	    }
	    if (isOrderingDirty) {
	      recomputePluginOrdering();
	    }
	  },

	  /**
	   * Looks up the plugin for the supplied event.
	   *
	   * @param {object} event A synthetic event.
	   * @return {?object} The plugin that created the supplied event.
	   * @internal
	   */
	  getPluginModuleForEvent: function (event) {
	    var dispatchConfig = event.dispatchConfig;
	    if (dispatchConfig.registrationName) {
	      return EventPluginRegistry.registrationNameModules[dispatchConfig.registrationName] || null;
	    }
	    for (var phase in dispatchConfig.phasedRegistrationNames) {
	      if (!dispatchConfig.phasedRegistrationNames.hasOwnProperty(phase)) {
	        continue;
	      }
	      var PluginModule = EventPluginRegistry.registrationNameModules[dispatchConfig.phasedRegistrationNames[phase]];
	      if (PluginModule) {
	        return PluginModule;
	      }
	    }
	    return null;
	  },

	  /**
	   * Exposed for unit testing.
	   * @private
	   */
	  _resetEventPlugins: function () {
	    EventPluginOrder = null;
	    for (var pluginName in namesToPlugins) {
	      if (namesToPlugins.hasOwnProperty(pluginName)) {
	        delete namesToPlugins[pluginName];
	      }
	    }
	    EventPluginRegistry.plugins.length = 0;

	    var eventNameDispatchConfigs = EventPluginRegistry.eventNameDispatchConfigs;
	    for (var eventName in eventNameDispatchConfigs) {
	      if (eventNameDispatchConfigs.hasOwnProperty(eventName)) {
	        delete eventNameDispatchConfigs[eventName];
	      }
	    }

	    var registrationNameModules = EventPluginRegistry.registrationNameModules;
	    for (var registrationName in registrationNameModules) {
	      if (registrationNameModules.hasOwnProperty(registrationName)) {
	        delete registrationNameModules[registrationName];
	      }
	    }
	  }

	};

	module.exports = EventPluginRegistry;

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventPluginUtils
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var ReactErrorUtils = __webpack_require__(34);

	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	/**
	 * Injected dependencies:
	 */

	/**
	 * - `Mount`: [required] Module that can convert between React dom IDs and
	 *   actual node references.
	 */
	var injection = {
	  Mount: null,
	  injectMount: function (InjectedMount) {
	    injection.Mount = InjectedMount;
	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(InjectedMount && InjectedMount.getNode && InjectedMount.getID, 'EventPluginUtils.injection.injectMount(...): Injected Mount ' + 'module is missing getNode or getID.') : undefined;
	    }
	  }
	};

	var topLevelTypes = EventConstants.topLevelTypes;

	function isEndish(topLevelType) {
	  return topLevelType === topLevelTypes.topMouseUp || topLevelType === topLevelTypes.topTouchEnd || topLevelType === topLevelTypes.topTouchCancel;
	}

	function isMoveish(topLevelType) {
	  return topLevelType === topLevelTypes.topMouseMove || topLevelType === topLevelTypes.topTouchMove;
	}
	function isStartish(topLevelType) {
	  return topLevelType === topLevelTypes.topMouseDown || topLevelType === topLevelTypes.topTouchStart;
	}

	var validateEventDispatches;
	if (false) {
	  validateEventDispatches = function (event) {
	    var dispatchListeners = event._dispatchListeners;
	    var dispatchIDs = event._dispatchIDs;

	    var listenersIsArr = Array.isArray(dispatchListeners);
	    var idsIsArr = Array.isArray(dispatchIDs);
	    var IDsLen = idsIsArr ? dispatchIDs.length : dispatchIDs ? 1 : 0;
	    var listenersLen = listenersIsArr ? dispatchListeners.length : dispatchListeners ? 1 : 0;

	    process.env.NODE_ENV !== 'production' ? warning(idsIsArr === listenersIsArr && IDsLen === listenersLen, 'EventPluginUtils: Invalid `event`.') : undefined;
	  };
	}

	/**
	 * Dispatch the event to the listener.
	 * @param {SyntheticEvent} event SyntheticEvent to handle
	 * @param {boolean} simulated If the event is simulated (changes exn behavior)
	 * @param {function} listener Application-level callback
	 * @param {string} domID DOM id to pass to the callback.
	 */
	function executeDispatch(event, simulated, listener, domID) {
	  var type = event.type || 'unknown-event';
	  event.currentTarget = injection.Mount.getNode(domID);
	  if (simulated) {
	    ReactErrorUtils.invokeGuardedCallbackWithCatch(type, listener, event, domID);
	  } else {
	    ReactErrorUtils.invokeGuardedCallback(type, listener, event, domID);
	  }
	  event.currentTarget = null;
	}

	/**
	 * Standard/simple iteration through an event's collected dispatches.
	 */
	function executeDispatchesInOrder(event, simulated) {
	  var dispatchListeners = event._dispatchListeners;
	  var dispatchIDs = event._dispatchIDs;
	  if (false) {
	    validateEventDispatches(event);
	  }
	  if (Array.isArray(dispatchListeners)) {
	    for (var i = 0; i < dispatchListeners.length; i++) {
	      if (event.isPropagationStopped()) {
	        break;
	      }
	      // Listeners and IDs are two parallel arrays that are always in sync.
	      executeDispatch(event, simulated, dispatchListeners[i], dispatchIDs[i]);
	    }
	  } else if (dispatchListeners) {
	    executeDispatch(event, simulated, dispatchListeners, dispatchIDs);
	  }
	  event._dispatchListeners = null;
	  event._dispatchIDs = null;
	}

	/**
	 * Standard/simple iteration through an event's collected dispatches, but stops
	 * at the first dispatch execution returning true, and returns that id.
	 *
	 * @return {?string} id of the first dispatch execution who's listener returns
	 * true, or null if no listener returned true.
	 */
	function executeDispatchesInOrderStopAtTrueImpl(event) {
	  var dispatchListeners = event._dispatchListeners;
	  var dispatchIDs = event._dispatchIDs;
	  if (false) {
	    validateEventDispatches(event);
	  }
	  if (Array.isArray(dispatchListeners)) {
	    for (var i = 0; i < dispatchListeners.length; i++) {
	      if (event.isPropagationStopped()) {
	        break;
	      }
	      // Listeners and IDs are two parallel arrays that are always in sync.
	      if (dispatchListeners[i](event, dispatchIDs[i])) {
	        return dispatchIDs[i];
	      }
	    }
	  } else if (dispatchListeners) {
	    if (dispatchListeners(event, dispatchIDs)) {
	      return dispatchIDs;
	    }
	  }
	  return null;
	}

	/**
	 * @see executeDispatchesInOrderStopAtTrueImpl
	 */
	function executeDispatchesInOrderStopAtTrue(event) {
	  var ret = executeDispatchesInOrderStopAtTrueImpl(event);
	  event._dispatchIDs = null;
	  event._dispatchListeners = null;
	  return ret;
	}

	/**
	 * Execution of a "direct" dispatch - there must be at most one dispatch
	 * accumulated on the event or it is considered an error. It doesn't really make
	 * sense for an event with multiple dispatches (bubbled) to keep track of the
	 * return values at each dispatch execution, but it does tend to make sense when
	 * dealing with "direct" dispatches.
	 *
	 * @return {*} The return value of executing the single dispatch.
	 */
	function executeDirectDispatch(event) {
	  if (false) {
	    validateEventDispatches(event);
	  }
	  var dispatchListener = event._dispatchListeners;
	  var dispatchID = event._dispatchIDs;
	  !!Array.isArray(dispatchListener) ?  false ? invariant(false, 'executeDirectDispatch(...): Invalid `event`.') : invariant(false) : undefined;
	  var res = dispatchListener ? dispatchListener(event, dispatchID) : null;
	  event._dispatchListeners = null;
	  event._dispatchIDs = null;
	  return res;
	}

	/**
	 * @param {SyntheticEvent} event
	 * @return {boolean} True iff number of dispatches accumulated is greater than 0.
	 */
	function hasDispatches(event) {
	  return !!event._dispatchListeners;
	}

	/**
	 * General utilities that are useful in creating custom Event Plugins.
	 */
	var EventPluginUtils = {
	  isEndish: isEndish,
	  isMoveish: isMoveish,
	  isStartish: isStartish,

	  executeDirectDispatch: executeDirectDispatch,
	  executeDispatchesInOrder: executeDispatchesInOrder,
	  executeDispatchesInOrderStopAtTrue: executeDispatchesInOrderStopAtTrue,
	  hasDispatches: hasDispatches,

	  getNode: function (id) {
	    return injection.Mount.getNode(id);
	  },
	  getID: function (node) {
	    return injection.Mount.getID(node);
	  },

	  injection: injection
	};

	module.exports = EventPluginUtils;

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactErrorUtils
	 * @typechecks
	 */

	'use strict';

	var caughtError = null;

	/**
	 * Call a function while guarding against errors that happens within it.
	 *
	 * @param {?String} name of the guard to use for logging or debugging
	 * @param {Function} func The function to invoke
	 * @param {*} a First argument
	 * @param {*} b Second argument
	 */
	function invokeGuardedCallback(name, func, a, b) {
	  try {
	    return func(a, b);
	  } catch (x) {
	    if (caughtError === null) {
	      caughtError = x;
	    }
	    return undefined;
	  }
	}

	var ReactErrorUtils = {
	  invokeGuardedCallback: invokeGuardedCallback,

	  /**
	   * Invoked by ReactTestUtils.Simulate so that any errors thrown by the event
	   * handler are sure to be rethrown by rethrowCaughtError.
	   */
	  invokeGuardedCallbackWithCatch: invokeGuardedCallback,

	  /**
	   * During execution of guarded functions we will capture the first error which
	   * we will rethrow to be handled by the top level error handler.
	   */
	  rethrowCaughtError: function () {
	    if (caughtError) {
	      var error = caughtError;
	      caughtError = null;
	      throw error;
	    }
	  }
	};

	if (false) {
	  /**
	   * To help development we can get better devtools integration by simulating a
	   * real browser event.
	   */
	  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof document !== 'undefined' && typeof document.createEvent === 'function') {
	    var fakeNode = document.createElement('react');
	    ReactErrorUtils.invokeGuardedCallback = function (name, func, a, b) {
	      var boundFunc = func.bind(null, a, b);
	      var evtType = 'react-' + name;
	      fakeNode.addEventListener(evtType, boundFunc, false);
	      var evt = document.createEvent('Event');
	      evt.initEvent(evtType, false, false);
	      fakeNode.dispatchEvent(evt);
	      fakeNode.removeEventListener(evtType, boundFunc, false);
	    };
	  }
	}

	module.exports = ReactErrorUtils;

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule accumulateInto
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 *
	 * Accumulates items that must not be null or undefined into the first one. This
	 * is used to conserve memory by avoiding array allocations, and thus sacrifices
	 * API cleanness. Since `current` can be null before being passed in and not
	 * null after this function, make sure to assign it back to `current`:
	 *
	 * `a = accumulateInto(a, b);`
	 *
	 * This API should be sparingly used. Try `accumulate` for something cleaner.
	 *
	 * @return {*|array<*>} An accumulation of items.
	 */

	function accumulateInto(current, next) {
	  !(next != null) ?  false ? invariant(false, 'accumulateInto(...): Accumulated items must not be null or undefined.') : invariant(false) : undefined;
	  if (current == null) {
	    return next;
	  }

	  // Both are not empty. Warning: Never call x.concat(y) when you are not
	  // certain that x is an Array (x could be a string with concat method).
	  var currentIsArray = Array.isArray(current);
	  var nextIsArray = Array.isArray(next);

	  if (currentIsArray && nextIsArray) {
	    current.push.apply(current, next);
	    return current;
	  }

	  if (currentIsArray) {
	    current.push(next);
	    return current;
	  }

	  if (nextIsArray) {
	    // A bit too dangerous to mutate `next`.
	    return [current].concat(next);
	  }

	  return [current, next];
	}

	module.exports = accumulateInto;

/***/ },
/* 36 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule forEachAccumulated
	 */

	'use strict';

	/**
	 * @param {array} arr an "accumulation" of items which is either an Array or
	 * a single item. Useful when paired with the `accumulate` module. This is a
	 * simple utility that allows us to reason about a collection of items, but
	 * handling the case when there is exactly one item (and we do not need to
	 * allocate an array).
	 */
	var forEachAccumulated = function (arr, cb, scope) {
	  if (Array.isArray(arr)) {
	    arr.forEach(cb, scope);
	  } else if (arr) {
	    cb.call(scope, arr);
	  }
	};

	module.exports = forEachAccumulated;

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactEventEmitterMixin
	 */

	'use strict';

	var EventPluginHub = __webpack_require__(31);

	function runEventQueueInBatch(events) {
	  EventPluginHub.enqueueEvents(events);
	  EventPluginHub.processEventQueue(false);
	}

	var ReactEventEmitterMixin = {

	  /**
	   * Streams a fired top-level event to `EventPluginHub` where plugins have the
	   * opportunity to create `ReactEvent`s to be dispatched.
	   *
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {object} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native environment event.
	   */
	  handleTopLevel: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    var events = EventPluginHub.extractEvents(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget);
	    runEventQueueInBatch(events);
	  }
	};

	module.exports = ReactEventEmitterMixin;

/***/ },
/* 38 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ViewportMetrics
	 */

	'use strict';

	var ViewportMetrics = {

	  currentScrollLeft: 0,

	  currentScrollTop: 0,

	  refreshScrollValues: function (scrollPosition) {
	    ViewportMetrics.currentScrollLeft = scrollPosition.x;
	    ViewportMetrics.currentScrollTop = scrollPosition.y;
	  }

	};

	module.exports = ViewportMetrics;

/***/ },
/* 39 */
/***/ function(module, exports) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Object.assign
	 */

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign

	'use strict';

	function assign(target, sources) {
	  if (target == null) {
	    throw new TypeError('Object.assign target cannot be null or undefined');
	  }

	  var to = Object(target);
	  var hasOwnProperty = Object.prototype.hasOwnProperty;

	  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
	    var nextSource = arguments[nextIndex];
	    if (nextSource == null) {
	      continue;
	    }

	    var from = Object(nextSource);

	    // We don't currently support accessors nor proxies. Therefore this
	    // copy cannot throw. If we ever supported this then we must handle
	    // exceptions and side-effects. We don't support symbols so they won't
	    // be transferred.

	    for (var key in from) {
	      if (hasOwnProperty.call(from, key)) {
	        to[key] = from[key];
	      }
	    }
	  }

	  return to;
	}

	module.exports = assign;

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isEventSupported
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var useHasFeature;
	if (ExecutionEnvironment.canUseDOM) {
	  useHasFeature = document.implementation && document.implementation.hasFeature &&
	  // always returns true in newer browsers as per the standard.
	  // @see http://dom.spec.whatwg.org/#dom-domimplementation-hasfeature
	  document.implementation.hasFeature('', '') !== true;
	}

	/**
	 * Checks if an event is supported in the current execution environment.
	 *
	 * NOTE: This will not work correctly for non-generic events such as `change`,
	 * `reset`, `load`, `error`, and `select`.
	 *
	 * Borrows from Modernizr.
	 *
	 * @param {string} eventNameSuffix Event name, e.g. "click".
	 * @param {?boolean} capture Check if the capture phase is supported.
	 * @return {boolean} True if the event is supported.
	 * @internal
	 * @license Modernizr 3.0.0pre (Custom Build) | MIT
	 */
	function isEventSupported(eventNameSuffix, capture) {
	  if (!ExecutionEnvironment.canUseDOM || capture && !('addEventListener' in document)) {
	    return false;
	  }

	  var eventName = 'on' + eventNameSuffix;
	  var isSupported = (eventName in document);

	  if (!isSupported) {
	    var element = document.createElement('div');
	    element.setAttribute(eventName, 'return;');
	    isSupported = typeof element[eventName] === 'function';
	  }

	  if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
	    // This is the only way to test support for the `wheel` event in IE9+.
	    isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
	  }

	  return isSupported;
	}

	module.exports = isEventSupported;

/***/ },
/* 41 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMFeatureFlags
	 */

	'use strict';

	var ReactDOMFeatureFlags = {
	  useCreateElement: false
	};

	module.exports = ReactDOMFeatureFlags;

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactElement
	 */

	'use strict';

	var ReactCurrentOwner = __webpack_require__(5);

	var assign = __webpack_require__(39);
	var canDefineProperty = __webpack_require__(43);

	// The Symbol used to tag the ReactElement type. If there is no native Symbol
	// nor polyfill, then a plain number is used for performance.
	var REACT_ELEMENT_TYPE = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('react.element') || 0xeac7;

	var RESERVED_PROPS = {
	  key: true,
	  ref: true,
	  __self: true,
	  __source: true
	};

	/**
	 * Base constructor for all React elements. This is only used to make this
	 * work with a dynamic instanceof check. Nothing should live on this prototype.
	 *
	 * @param {*} type
	 * @param {*} key
	 * @param {string|object} ref
	 * @param {*} self A *temporary* helper to detect places where `this` is
	 * different from the `owner` when React.makeElement is called, so that we
	 * can warn. We want to get rid of owner and replace string `ref`s with arrow
	 * functions, and as long as `this` and owner are the same, there will be no
	 * change in behavior.
	 * @param {*} source An annotation object (added by a transpiler or otherwise)
	 * indicating filename, line number, and/or other information.
	 * @param {*} owner
	 * @param {*} props
	 * @internal
	 */
	var ReactElement = function (type, key, ref, self, source, owner, props) {
	  var element = {
	    // This tag allow us to uniquely identify this as a React Element
	    $$typeof: REACT_ELEMENT_TYPE,

	    // Built-in properties that belong on the element
	    type: type,
	    key: key,
	    ref: ref,
	    props: props,

	    // Record the component responsible for creating this element.
	    _owner: owner
	  };

	  if (false) {
	    // The validation flag is currently mutative. We put it on
	    // an external backing store so that we can freeze the whole object.
	    // This can be replaced with a WeakMap once they are implemented in
	    // commonly used development environments.
	    element._store = {};

	    // To make comparing ReactElements easier for testing purposes, we make
	    // the validation flag non-enumerable (where possible, which should
	    // include every environment we run tests in), so the test framework
	    // ignores it.
	    if (canDefineProperty) {
	      Object.defineProperty(element._store, 'validated', {
	        configurable: false,
	        enumerable: false,
	        writable: true,
	        value: false
	      });
	      // self and source are DEV only properties.
	      Object.defineProperty(element, '_self', {
	        configurable: false,
	        enumerable: false,
	        writable: false,
	        value: self
	      });
	      // Two elements created in two different places should be considered
	      // equal for testing purposes and therefore we hide it from enumeration.
	      Object.defineProperty(element, '_source', {
	        configurable: false,
	        enumerable: false,
	        writable: false,
	        value: source
	      });
	    } else {
	      element._store.validated = false;
	      element._self = self;
	      element._source = source;
	    }
	    Object.freeze(element.props);
	    Object.freeze(element);
	  }

	  return element;
	};

	ReactElement.createElement = function (type, config, children) {
	  var propName;

	  // Reserved names are extracted
	  var props = {};

	  var key = null;
	  var ref = null;
	  var self = null;
	  var source = null;

	  if (config != null) {
	    ref = config.ref === undefined ? null : config.ref;
	    key = config.key === undefined ? null : '' + config.key;
	    self = config.__self === undefined ? null : config.__self;
	    source = config.__source === undefined ? null : config.__source;
	    // Remaining properties are added to a new props object
	    for (propName in config) {
	      if (config.hasOwnProperty(propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
	        props[propName] = config[propName];
	      }
	    }
	  }

	  // Children can be more than one argument, and those are transferred onto
	  // the newly allocated props object.
	  var childrenLength = arguments.length - 2;
	  if (childrenLength === 1) {
	    props.children = children;
	  } else if (childrenLength > 1) {
	    var childArray = Array(childrenLength);
	    for (var i = 0; i < childrenLength; i++) {
	      childArray[i] = arguments[i + 2];
	    }
	    props.children = childArray;
	  }

	  // Resolve default props
	  if (type && type.defaultProps) {
	    var defaultProps = type.defaultProps;
	    for (propName in defaultProps) {
	      if (typeof props[propName] === 'undefined') {
	        props[propName] = defaultProps[propName];
	      }
	    }
	  }

	  return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
	};

	ReactElement.createFactory = function (type) {
	  var factory = ReactElement.createElement.bind(null, type);
	  // Expose the type on the factory and the prototype so that it can be
	  // easily accessed on elements. E.g. `<Foo />.type === Foo`.
	  // This should not be named `constructor` since this may not be the function
	  // that created the element, and it may not even be a constructor.
	  // Legacy hook TODO: Warn if this is accessed
	  factory.type = type;
	  return factory;
	};

	ReactElement.cloneAndReplaceKey = function (oldElement, newKey) {
	  var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);

	  return newElement;
	};

	ReactElement.cloneAndReplaceProps = function (oldElement, newProps) {
	  var newElement = ReactElement(oldElement.type, oldElement.key, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, newProps);

	  if (false) {
	    // If the key on the original is valid, then the clone is valid
	    newElement._store.validated = oldElement._store.validated;
	  }

	  return newElement;
	};

	ReactElement.cloneElement = function (element, config, children) {
	  var propName;

	  // Original props are copied
	  var props = assign({}, element.props);

	  // Reserved names are extracted
	  var key = element.key;
	  var ref = element.ref;
	  // Self is preserved since the owner is preserved.
	  var self = element._self;
	  // Source is preserved since cloneElement is unlikely to be targeted by a
	  // transpiler, and the original source is probably a better indicator of the
	  // true owner.
	  var source = element._source;

	  // Owner will be preserved, unless ref is overridden
	  var owner = element._owner;

	  if (config != null) {
	    if (config.ref !== undefined) {
	      // Silently steal the ref from the parent.
	      ref = config.ref;
	      owner = ReactCurrentOwner.current;
	    }
	    if (config.key !== undefined) {
	      key = '' + config.key;
	    }
	    // Remaining properties override existing props
	    for (propName in config) {
	      if (config.hasOwnProperty(propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
	        props[propName] = config[propName];
	      }
	    }
	  }

	  // Children can be more than one argument, and those are transferred onto
	  // the newly allocated props object.
	  var childrenLength = arguments.length - 2;
	  if (childrenLength === 1) {
	    props.children = children;
	  } else if (childrenLength > 1) {
	    var childArray = Array(childrenLength);
	    for (var i = 0; i < childrenLength; i++) {
	      childArray[i] = arguments[i + 2];
	    }
	    props.children = childArray;
	  }

	  return ReactElement(element.type, key, ref, self, source, owner, props);
	};

	/**
	 * @param {?object} object
	 * @return {boolean} True if `object` is a valid component.
	 * @final
	 */
	ReactElement.isValidElement = function (object) {
	  return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
	};

	module.exports = ReactElement;

/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule canDefineProperty
	 */

	'use strict';

	var canDefineProperty = false;
	if (false) {
	  try {
	    Object.defineProperty({}, 'x', { get: function () {} });
	    canDefineProperty = true;
	  } catch (x) {
	    // IE will fail on defineProperty
	  }
	}

	module.exports = canDefineProperty;

/***/ },
/* 44 */
/***/ function(module, exports) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactEmptyComponentRegistry
	 */

	'use strict';

	// This registry keeps track of the React IDs of the components that rendered to
	// `null` (in reality a placeholder such as `noscript`)
	var nullComponentIDsRegistry = {};

	/**
	 * @param {string} id Component's `_rootNodeID`.
	 * @return {boolean} True if the component is rendered to null.
	 */
	function isNullComponentID(id) {
	  return !!nullComponentIDsRegistry[id];
	}

	/**
	 * Mark the component as having rendered to null.
	 * @param {string} id Component's `_rootNodeID`.
	 */
	function registerNullComponentID(id) {
	  nullComponentIDsRegistry[id] = true;
	}

	/**
	 * Unmark the component as having rendered to null: it renders to something now.
	 * @param {string} id Component's `_rootNodeID`.
	 */
	function deregisterNullComponentID(id) {
	  delete nullComponentIDsRegistry[id];
	}

	var ReactEmptyComponentRegistry = {
	  isNullComponentID: isNullComponentID,
	  registerNullComponentID: registerNullComponentID,
	  deregisterNullComponentID: deregisterNullComponentID
	};

	module.exports = ReactEmptyComponentRegistry;

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactInstanceHandles
	 * @typechecks static-only
	 */

	'use strict';

	var ReactRootIndex = __webpack_require__(46);

	var invariant = __webpack_require__(13);

	var SEPARATOR = '.';
	var SEPARATOR_LENGTH = SEPARATOR.length;

	/**
	 * Maximum depth of traversals before we consider the possibility of a bad ID.
	 */
	var MAX_TREE_DEPTH = 10000;

	/**
	 * Creates a DOM ID prefix to use when mounting React components.
	 *
	 * @param {number} index A unique integer
	 * @return {string} React root ID.
	 * @internal
	 */
	function getReactRootIDString(index) {
	  return SEPARATOR + index.toString(36);
	}

	/**
	 * Checks if a character in the supplied ID is a separator or the end.
	 *
	 * @param {string} id A React DOM ID.
	 * @param {number} index Index of the character to check.
	 * @return {boolean} True if the character is a separator or end of the ID.
	 * @private
	 */
	function isBoundary(id, index) {
	  return id.charAt(index) === SEPARATOR || index === id.length;
	}

	/**
	 * Checks if the supplied string is a valid React DOM ID.
	 *
	 * @param {string} id A React DOM ID, maybe.
	 * @return {boolean} True if the string is a valid React DOM ID.
	 * @private
	 */
	function isValidID(id) {
	  return id === '' || id.charAt(0) === SEPARATOR && id.charAt(id.length - 1) !== SEPARATOR;
	}

	/**
	 * Checks if the first ID is an ancestor of or equal to the second ID.
	 *
	 * @param {string} ancestorID
	 * @param {string} descendantID
	 * @return {boolean} True if `ancestorID` is an ancestor of `descendantID`.
	 * @internal
	 */
	function isAncestorIDOf(ancestorID, descendantID) {
	  return descendantID.indexOf(ancestorID) === 0 && isBoundary(descendantID, ancestorID.length);
	}

	/**
	 * Gets the parent ID of the supplied React DOM ID, `id`.
	 *
	 * @param {string} id ID of a component.
	 * @return {string} ID of the parent, or an empty string.
	 * @private
	 */
	function getParentID(id) {
	  return id ? id.substr(0, id.lastIndexOf(SEPARATOR)) : '';
	}

	/**
	 * Gets the next DOM ID on the tree path from the supplied `ancestorID` to the
	 * supplied `destinationID`. If they are equal, the ID is returned.
	 *
	 * @param {string} ancestorID ID of an ancestor node of `destinationID`.
	 * @param {string} destinationID ID of the destination node.
	 * @return {string} Next ID on the path from `ancestorID` to `destinationID`.
	 * @private
	 */
	function getNextDescendantID(ancestorID, destinationID) {
	  !(isValidID(ancestorID) && isValidID(destinationID)) ?  false ? invariant(false, 'getNextDescendantID(%s, %s): Received an invalid React DOM ID.', ancestorID, destinationID) : invariant(false) : undefined;
	  !isAncestorIDOf(ancestorID, destinationID) ?  false ? invariant(false, 'getNextDescendantID(...): React has made an invalid assumption about ' + 'the DOM hierarchy. Expected `%s` to be an ancestor of `%s`.', ancestorID, destinationID) : invariant(false) : undefined;
	  if (ancestorID === destinationID) {
	    return ancestorID;
	  }
	  // Skip over the ancestor and the immediate separator. Traverse until we hit
	  // another separator or we reach the end of `destinationID`.
	  var start = ancestorID.length + SEPARATOR_LENGTH;
	  var i;
	  for (i = start; i < destinationID.length; i++) {
	    if (isBoundary(destinationID, i)) {
	      break;
	    }
	  }
	  return destinationID.substr(0, i);
	}

	/**
	 * Gets the nearest common ancestor ID of two IDs.
	 *
	 * Using this ID scheme, the nearest common ancestor ID is the longest common
	 * prefix of the two IDs that immediately preceded a "marker" in both strings.
	 *
	 * @param {string} oneID
	 * @param {string} twoID
	 * @return {string} Nearest common ancestor ID, or the empty string if none.
	 * @private
	 */
	function getFirstCommonAncestorID(oneID, twoID) {
	  var minLength = Math.min(oneID.length, twoID.length);
	  if (minLength === 0) {
	    return '';
	  }
	  var lastCommonMarkerIndex = 0;
	  // Use `<=` to traverse until the "EOL" of the shorter string.
	  for (var i = 0; i <= minLength; i++) {
	    if (isBoundary(oneID, i) && isBoundary(twoID, i)) {
	      lastCommonMarkerIndex = i;
	    } else if (oneID.charAt(i) !== twoID.charAt(i)) {
	      break;
	    }
	  }
	  var longestCommonID = oneID.substr(0, lastCommonMarkerIndex);
	  !isValidID(longestCommonID) ?  false ? invariant(false, 'getFirstCommonAncestorID(%s, %s): Expected a valid React DOM ID: %s', oneID, twoID, longestCommonID) : invariant(false) : undefined;
	  return longestCommonID;
	}

	/**
	 * Traverses the parent path between two IDs (either up or down). The IDs must
	 * not be the same, and there must exist a parent path between them. If the
	 * callback returns `false`, traversal is stopped.
	 *
	 * @param {?string} start ID at which to start traversal.
	 * @param {?string} stop ID at which to end traversal.
	 * @param {function} cb Callback to invoke each ID with.
	 * @param {*} arg Argument to invoke the callback with.
	 * @param {?boolean} skipFirst Whether or not to skip the first node.
	 * @param {?boolean} skipLast Whether or not to skip the last node.
	 * @private
	 */
	function traverseParentPath(start, stop, cb, arg, skipFirst, skipLast) {
	  start = start || '';
	  stop = stop || '';
	  !(start !== stop) ?  false ? invariant(false, 'traverseParentPath(...): Cannot traverse from and to the same ID, `%s`.', start) : invariant(false) : undefined;
	  var traverseUp = isAncestorIDOf(stop, start);
	  !(traverseUp || isAncestorIDOf(start, stop)) ?  false ? invariant(false, 'traverseParentPath(%s, %s, ...): Cannot traverse from two IDs that do ' + 'not have a parent path.', start, stop) : invariant(false) : undefined;
	  // Traverse from `start` to `stop` one depth at a time.
	  var depth = 0;
	  var traverse = traverseUp ? getParentID : getNextDescendantID;
	  for (var id = start;; /* until break */id = traverse(id, stop)) {
	    var ret;
	    if ((!skipFirst || id !== start) && (!skipLast || id !== stop)) {
	      ret = cb(id, traverseUp, arg);
	    }
	    if (ret === false || id === stop) {
	      // Only break //after// visiting `stop`.
	      break;
	    }
	    !(depth++ < MAX_TREE_DEPTH) ?  false ? invariant(false, 'traverseParentPath(%s, %s, ...): Detected an infinite loop while ' + 'traversing the React DOM ID tree. This may be due to malformed IDs: %s', start, stop, id) : invariant(false) : undefined;
	  }
	}

	/**
	 * Manages the IDs assigned to DOM representations of React components. This
	 * uses a specific scheme in order to traverse the DOM efficiently (e.g. in
	 * order to simulate events).
	 *
	 * @internal
	 */
	var ReactInstanceHandles = {

	  /**
	   * Constructs a React root ID
	   * @return {string} A React root ID.
	   */
	  createReactRootID: function () {
	    return getReactRootIDString(ReactRootIndex.createReactRootIndex());
	  },

	  /**
	   * Constructs a React ID by joining a root ID with a name.
	   *
	   * @param {string} rootID Root ID of a parent component.
	   * @param {string} name A component's name (as flattened children).
	   * @return {string} A React ID.
	   * @internal
	   */
	  createReactID: function (rootID, name) {
	    return rootID + name;
	  },

	  /**
	   * Gets the DOM ID of the React component that is the root of the tree that
	   * contains the React component with the supplied DOM ID.
	   *
	   * @param {string} id DOM ID of a React component.
	   * @return {?string} DOM ID of the React component that is the root.
	   * @internal
	   */
	  getReactRootIDFromNodeID: function (id) {
	    if (id && id.charAt(0) === SEPARATOR && id.length > 1) {
	      var index = id.indexOf(SEPARATOR, 1);
	      return index > -1 ? id.substr(0, index) : id;
	    }
	    return null;
	  },

	  /**
	   * Traverses the ID hierarchy and invokes the supplied `cb` on any IDs that
	   * should would receive a `mouseEnter` or `mouseLeave` event.
	   *
	   * NOTE: Does not invoke the callback on the nearest common ancestor because
	   * nothing "entered" or "left" that element.
	   *
	   * @param {string} leaveID ID being left.
	   * @param {string} enterID ID being entered.
	   * @param {function} cb Callback to invoke on each entered/left ID.
	   * @param {*} upArg Argument to invoke the callback with on left IDs.
	   * @param {*} downArg Argument to invoke the callback with on entered IDs.
	   * @internal
	   */
	  traverseEnterLeave: function (leaveID, enterID, cb, upArg, downArg) {
	    var ancestorID = getFirstCommonAncestorID(leaveID, enterID);
	    if (ancestorID !== leaveID) {
	      traverseParentPath(leaveID, ancestorID, cb, upArg, false, true);
	    }
	    if (ancestorID !== enterID) {
	      traverseParentPath(ancestorID, enterID, cb, downArg, true, false);
	    }
	  },

	  /**
	   * Simulates the traversal of a two-phase, capture/bubble event dispatch.
	   *
	   * NOTE: This traversal happens on IDs without touching the DOM.
	   *
	   * @param {string} targetID ID of the target node.
	   * @param {function} cb Callback to invoke.
	   * @param {*} arg Argument to invoke the callback with.
	   * @internal
	   */
	  traverseTwoPhase: function (targetID, cb, arg) {
	    if (targetID) {
	      traverseParentPath('', targetID, cb, arg, true, false);
	      traverseParentPath(targetID, '', cb, arg, false, true);
	    }
	  },

	  /**
	   * Same as `traverseTwoPhase` but skips the `targetID`.
	   */
	  traverseTwoPhaseSkipTarget: function (targetID, cb, arg) {
	    if (targetID) {
	      traverseParentPath('', targetID, cb, arg, true, true);
	      traverseParentPath(targetID, '', cb, arg, true, true);
	    }
	  },

	  /**
	   * Traverse a node ID, calling the supplied `cb` for each ancestor ID. For
	   * example, passing `.0.$row-0.1` would result in `cb` getting called
	   * with `.0`, `.0.$row-0`, and `.0.$row-0.1`.
	   *
	   * NOTE: This traversal happens on IDs without touching the DOM.
	   *
	   * @param {string} targetID ID of the target node.
	   * @param {function} cb Callback to invoke.
	   * @param {*} arg Argument to invoke the callback with.
	   * @internal
	   */
	  traverseAncestors: function (targetID, cb, arg) {
	    traverseParentPath('', targetID, cb, arg, true, false);
	  },

	  getFirstCommonAncestorID: getFirstCommonAncestorID,

	  /**
	   * Exposed for unit testing.
	   * @private
	   */
	  _getNextDescendantID: getNextDescendantID,

	  isAncestorIDOf: isAncestorIDOf,

	  SEPARATOR: SEPARATOR

	};

	module.exports = ReactInstanceHandles;

/***/ },
/* 46 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactRootIndex
	 * @typechecks
	 */

	'use strict';

	var ReactRootIndexInjection = {
	  /**
	   * @param {function} _createReactRootIndex
	   */
	  injectCreateReactRootIndex: function (_createReactRootIndex) {
	    ReactRootIndex.createReactRootIndex = _createReactRootIndex;
	  }
	};

	var ReactRootIndex = {
	  createReactRootIndex: null,
	  injection: ReactRootIndexInjection
	};

	module.exports = ReactRootIndex;

/***/ },
/* 47 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactInstanceMap
	 */

	'use strict';

	/**
	 * `ReactInstanceMap` maintains a mapping from a public facing stateful
	 * instance (key) and the internal representation (value). This allows public
	 * methods to accept the user facing instance as an argument and map them back
	 * to internal methods.
	 */

	// TODO: Replace this with ES6: var ReactInstanceMap = new Map();
	var ReactInstanceMap = {

	  /**
	   * This API should be called `delete` but we'd have to make sure to always
	   * transform these to strings for IE support. When this transform is fully
	   * supported we can rename it.
	   */
	  remove: function (key) {
	    key._reactInternalInstance = undefined;
	  },

	  get: function (key) {
	    return key._reactInternalInstance;
	  },

	  has: function (key) {
	    return key._reactInternalInstance !== undefined;
	  },

	  set: function (key, value) {
	    key._reactInternalInstance = value;
	  }

	};

	module.exports = ReactInstanceMap;

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactMarkupChecksum
	 */

	'use strict';

	var adler32 = __webpack_require__(49);

	var TAG_END = /\/?>/;

	var ReactMarkupChecksum = {
	  CHECKSUM_ATTR_NAME: 'data-react-checksum',

	  /**
	   * @param {string} markup Markup string
	   * @return {string} Markup string with checksum attribute attached
	   */
	  addChecksumToMarkup: function (markup) {
	    var checksum = adler32(markup);

	    // Add checksum (handle both parent tags and self-closing tags)
	    return markup.replace(TAG_END, ' ' + ReactMarkupChecksum.CHECKSUM_ATTR_NAME + '="' + checksum + '"$&');
	  },

	  /**
	   * @param {string} markup to use
	   * @param {DOMElement} element root React element
	   * @returns {boolean} whether or not the markup is the same
	   */
	  canReuseMarkup: function (markup, element) {
	    var existingChecksum = element.getAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);
	    existingChecksum = existingChecksum && parseInt(existingChecksum, 10);
	    var markupChecksum = adler32(markup);
	    return markupChecksum === existingChecksum;
	  }
	};

	module.exports = ReactMarkupChecksum;

/***/ },
/* 49 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule adler32
	 */

	'use strict';

	var MOD = 65521;

	// adler32 is not cryptographically strong, and is only used to sanity check that
	// markup generated on the server matches the markup generated on the client.
	// This implementation (a modified version of the SheetJS version) has been optimized
	// for our use case, at the expense of conforming to the adler32 specification
	// for non-ascii inputs.
	function adler32(data) {
	  var a = 1;
	  var b = 0;
	  var i = 0;
	  var l = data.length;
	  var m = l & ~0x3;
	  while (i < m) {
	    for (; i < Math.min(i + 4096, m); i += 4) {
	      b += (a += data.charCodeAt(i)) + (a += data.charCodeAt(i + 1)) + (a += data.charCodeAt(i + 2)) + (a += data.charCodeAt(i + 3));
	    }
	    a %= MOD;
	    b %= MOD;
	  }
	  for (; i < l; i++) {
	    b += a += data.charCodeAt(i);
	  }
	  a %= MOD;
	  b %= MOD;
	  return a | b << 16;
	}

	module.exports = adler32;

/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactReconciler
	 */

	'use strict';

	var ReactRef = __webpack_require__(51);

	/**
	 * Helper to call ReactRef.attachRefs with this composite component, split out
	 * to avoid allocations in the transaction mount-ready queue.
	 */
	function attachRefs() {
	  ReactRef.attachRefs(this, this._currentElement);
	}

	var ReactReconciler = {

	  /**
	   * Initializes the component, renders markup, and registers event listeners.
	   *
	   * @param {ReactComponent} internalInstance
	   * @param {string} rootID DOM ID of the root node.
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @return {?string} Rendered markup to be inserted into the DOM.
	   * @final
	   * @internal
	   */
	  mountComponent: function (internalInstance, rootID, transaction, context) {
	    var markup = internalInstance.mountComponent(rootID, transaction, context);
	    if (internalInstance._currentElement && internalInstance._currentElement.ref != null) {
	      transaction.getReactMountReady().enqueue(attachRefs, internalInstance);
	    }
	    return markup;
	  },

	  /**
	   * Releases any resources allocated by `mountComponent`.
	   *
	   * @final
	   * @internal
	   */
	  unmountComponent: function (internalInstance) {
	    ReactRef.detachRefs(internalInstance, internalInstance._currentElement);
	    internalInstance.unmountComponent();
	  },

	  /**
	   * Update a component using a new element.
	   *
	   * @param {ReactComponent} internalInstance
	   * @param {ReactElement} nextElement
	   * @param {ReactReconcileTransaction} transaction
	   * @param {object} context
	   * @internal
	   */
	  receiveComponent: function (internalInstance, nextElement, transaction, context) {
	    var prevElement = internalInstance._currentElement;

	    if (nextElement === prevElement && context === internalInstance._context) {
	      // Since elements are immutable after the owner is rendered,
	      // we can do a cheap identity compare here to determine if this is a
	      // superfluous reconcile. It's possible for state to be mutable but such
	      // change should trigger an update of the owner which would recreate
	      // the element. We explicitly check for the existence of an owner since
	      // it's possible for an element created outside a composite to be
	      // deeply mutated and reused.

	      // TODO: Bailing out early is just a perf optimization right?
	      // TODO: Removing the return statement should affect correctness?
	      return;
	    }

	    var refsChanged = ReactRef.shouldUpdateRefs(prevElement, nextElement);

	    if (refsChanged) {
	      ReactRef.detachRefs(internalInstance, prevElement);
	    }

	    internalInstance.receiveComponent(nextElement, transaction, context);

	    if (refsChanged && internalInstance._currentElement && internalInstance._currentElement.ref != null) {
	      transaction.getReactMountReady().enqueue(attachRefs, internalInstance);
	    }
	  },

	  /**
	   * Flush any dirty changes in a component.
	   *
	   * @param {ReactComponent} internalInstance
	   * @param {ReactReconcileTransaction} transaction
	   * @internal
	   */
	  performUpdateIfNecessary: function (internalInstance, transaction) {
	    internalInstance.performUpdateIfNecessary(transaction);
	  }

	};

	module.exports = ReactReconciler;

/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactRef
	 */

	'use strict';

	var ReactOwner = __webpack_require__(52);

	var ReactRef = {};

	function attachRef(ref, component, owner) {
	  if (typeof ref === 'function') {
	    ref(component.getPublicInstance());
	  } else {
	    // Legacy ref
	    ReactOwner.addComponentAsRefTo(component, ref, owner);
	  }
	}

	function detachRef(ref, component, owner) {
	  if (typeof ref === 'function') {
	    ref(null);
	  } else {
	    // Legacy ref
	    ReactOwner.removeComponentAsRefFrom(component, ref, owner);
	  }
	}

	ReactRef.attachRefs = function (instance, element) {
	  if (element === null || element === false) {
	    return;
	  }
	  var ref = element.ref;
	  if (ref != null) {
	    attachRef(ref, instance, element._owner);
	  }
	};

	ReactRef.shouldUpdateRefs = function (prevElement, nextElement) {
	  // If either the owner or a `ref` has changed, make sure the newest owner
	  // has stored a reference to `this`, and the previous owner (if different)
	  // has forgotten the reference to `this`. We use the element instead
	  // of the public this.props because the post processing cannot determine
	  // a ref. The ref conceptually lives on the element.

	  // TODO: Should this even be possible? The owner cannot change because
	  // it's forbidden by shouldUpdateReactComponent. The ref can change
	  // if you swap the keys of but not the refs. Reconsider where this check
	  // is made. It probably belongs where the key checking and
	  // instantiateReactComponent is done.

	  var prevEmpty = prevElement === null || prevElement === false;
	  var nextEmpty = nextElement === null || nextElement === false;

	  return(
	    // This has a few false positives w/r/t empty components.
	    prevEmpty || nextEmpty || nextElement._owner !== prevElement._owner || nextElement.ref !== prevElement.ref
	  );
	};

	ReactRef.detachRefs = function (instance, element) {
	  if (element === null || element === false) {
	    return;
	  }
	  var ref = element.ref;
	  if (ref != null) {
	    detachRef(ref, instance, element._owner);
	  }
	};

	module.exports = ReactRef;

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactOwner
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * ReactOwners are capable of storing references to owned components.
	 *
	 * All components are capable of //being// referenced by owner components, but
	 * only ReactOwner components are capable of //referencing// owned components.
	 * The named reference is known as a "ref".
	 *
	 * Refs are available when mounted and updated during reconciliation.
	 *
	 *   var MyComponent = React.createClass({
	 *     render: function() {
	 *       return (
	 *         <div onClick={this.handleClick}>
	 *           <CustomComponent ref="custom" />
	 *         </div>
	 *       );
	 *     },
	 *     handleClick: function() {
	 *       this.refs.custom.handleClick();
	 *     },
	 *     componentDidMount: function() {
	 *       this.refs.custom.initialize();
	 *     }
	 *   });
	 *
	 * Refs should rarely be used. When refs are used, they should only be done to
	 * control data that is not handled by React's data flow.
	 *
	 * @class ReactOwner
	 */
	var ReactOwner = {

	  /**
	   * @param {?object} object
	   * @return {boolean} True if `object` is a valid owner.
	   * @final
	   */
	  isValidOwner: function (object) {
	    return !!(object && typeof object.attachRef === 'function' && typeof object.detachRef === 'function');
	  },

	  /**
	   * Adds a component by ref to an owner component.
	   *
	   * @param {ReactComponent} component Component to reference.
	   * @param {string} ref Name by which to refer to the component.
	   * @param {ReactOwner} owner Component on which to record the ref.
	   * @final
	   * @internal
	   */
	  addComponentAsRefTo: function (component, ref, owner) {
	    !ReactOwner.isValidOwner(owner) ?  false ? invariant(false, 'addComponentAsRefTo(...): Only a ReactOwner can have refs. You might ' + 'be adding a ref to a component that was not created inside a component\'s ' + '`render` method, or you have multiple copies of React loaded ' + '(details: https://fb.me/react-refs-must-have-owner).') : invariant(false) : undefined;
	    owner.attachRef(ref, component);
	  },

	  /**
	   * Removes a component by ref from an owner component.
	   *
	   * @param {ReactComponent} component Component to dereference.
	   * @param {string} ref Name of the ref to remove.
	   * @param {ReactOwner} owner Component on which the ref is recorded.
	   * @final
	   * @internal
	   */
	  removeComponentAsRefFrom: function (component, ref, owner) {
	    !ReactOwner.isValidOwner(owner) ?  false ? invariant(false, 'removeComponentAsRefFrom(...): Only a ReactOwner can have refs. You might ' + 'be removing a ref to a component that was not created inside a component\'s ' + '`render` method, or you have multiple copies of React loaded ' + '(details: https://fb.me/react-refs-must-have-owner).') : invariant(false) : undefined;
	    // Check that `component` is still the current ref because we do not want to
	    // detach the ref if another component stole it.
	    if (owner.getPublicInstance().refs[ref] === component.getPublicInstance()) {
	      owner.detachRef(ref);
	    }
	  }

	};

	module.exports = ReactOwner;

/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactUpdateQueue
	 */

	'use strict';

	var ReactCurrentOwner = __webpack_require__(5);
	var ReactElement = __webpack_require__(42);
	var ReactInstanceMap = __webpack_require__(47);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	function enqueueUpdate(internalInstance) {
	  ReactUpdates.enqueueUpdate(internalInstance);
	}

	function getInternalInstanceReadyForUpdate(publicInstance, callerName) {
	  var internalInstance = ReactInstanceMap.get(publicInstance);
	  if (!internalInstance) {
	    if (false) {
	      // Only warn when we have a callerName. Otherwise we should be silent.
	      // We're probably calling from enqueueCallback. We don't want to warn
	      // there because we already warned for the corresponding lifecycle method.
	      process.env.NODE_ENV !== 'production' ? warning(!callerName, '%s(...): Can only update a mounted or mounting component. ' + 'This usually means you called %s() on an unmounted component. ' + 'This is a no-op. Please check the code for the %s component.', callerName, callerName, publicInstance.constructor.displayName) : undefined;
	    }
	    return null;
	  }

	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(ReactCurrentOwner.current == null, '%s(...): Cannot update during an existing state transition ' + '(such as within `render`). Render methods should be a pure function ' + 'of props and state.', callerName) : undefined;
	  }

	  return internalInstance;
	}

	/**
	 * ReactUpdateQueue allows for state updates to be scheduled into a later
	 * reconciliation step.
	 */
	var ReactUpdateQueue = {

	  /**
	   * Checks whether or not this composite component is mounted.
	   * @param {ReactClass} publicInstance The instance we want to test.
	   * @return {boolean} True if mounted, false otherwise.
	   * @protected
	   * @final
	   */
	  isMounted: function (publicInstance) {
	    if (false) {
	      var owner = ReactCurrentOwner.current;
	      if (owner !== null) {
	        process.env.NODE_ENV !== 'production' ? warning(owner._warnedAboutRefsInRender, '%s is accessing isMounted inside its render() function. ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', owner.getName() || 'A component') : undefined;
	        owner._warnedAboutRefsInRender = true;
	      }
	    }
	    var internalInstance = ReactInstanceMap.get(publicInstance);
	    if (internalInstance) {
	      // During componentWillMount and render this will still be null but after
	      // that will always render to something. At least for now. So we can use
	      // this hack.
	      return !!internalInstance._renderedComponent;
	    } else {
	      return false;
	    }
	  },

	  /**
	   * Enqueue a callback that will be executed after all the pending updates
	   * have processed.
	   *
	   * @param {ReactClass} publicInstance The instance to use as `this` context.
	   * @param {?function} callback Called after state is updated.
	   * @internal
	   */
	  enqueueCallback: function (publicInstance, callback) {
	    !(typeof callback === 'function') ?  false ? invariant(false, 'enqueueCallback(...): You called `setProps`, `replaceProps`, ' + '`setState`, `replaceState`, or `forceUpdate` with a callback that ' + 'isn\'t callable.') : invariant(false) : undefined;
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance);

	    // Previously we would throw an error if we didn't have an internal
	    // instance. Since we want to make it a no-op instead, we mirror the same
	    // behavior we have in other enqueue* methods.
	    // We also need to ignore callbacks in componentWillMount. See
	    // enqueueUpdates.
	    if (!internalInstance) {
	      return null;
	    }

	    if (internalInstance._pendingCallbacks) {
	      internalInstance._pendingCallbacks.push(callback);
	    } else {
	      internalInstance._pendingCallbacks = [callback];
	    }
	    // TODO: The callback here is ignored when setState is called from
	    // componentWillMount. Either fix it or disallow doing so completely in
	    // favor of getInitialState. Alternatively, we can disallow
	    // componentWillMount during server-side rendering.
	    enqueueUpdate(internalInstance);
	  },

	  enqueueCallbackInternal: function (internalInstance, callback) {
	    !(typeof callback === 'function') ?  false ? invariant(false, 'enqueueCallback(...): You called `setProps`, `replaceProps`, ' + '`setState`, `replaceState`, or `forceUpdate` with a callback that ' + 'isn\'t callable.') : invariant(false) : undefined;
	    if (internalInstance._pendingCallbacks) {
	      internalInstance._pendingCallbacks.push(callback);
	    } else {
	      internalInstance._pendingCallbacks = [callback];
	    }
	    enqueueUpdate(internalInstance);
	  },

	  /**
	   * Forces an update. This should only be invoked when it is known with
	   * certainty that we are **not** in a DOM transaction.
	   *
	   * You may want to call this when you know that some deeper aspect of the
	   * component's state has changed but `setState` was not called.
	   *
	   * This will not invoke `shouldComponentUpdate`, but it will invoke
	   * `componentWillUpdate` and `componentDidUpdate`.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @internal
	   */
	  enqueueForceUpdate: function (publicInstance) {
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'forceUpdate');

	    if (!internalInstance) {
	      return;
	    }

	    internalInstance._pendingForceUpdate = true;

	    enqueueUpdate(internalInstance);
	  },

	  /**
	   * Replaces all of the state. Always use this or `setState` to mutate state.
	   * You should treat `this.state` as immutable.
	   *
	   * There is no guarantee that `this.state` will be immediately updated, so
	   * accessing `this.state` after calling this method may return the old value.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} completeState Next state.
	   * @internal
	   */
	  enqueueReplaceState: function (publicInstance, completeState) {
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'replaceState');

	    if (!internalInstance) {
	      return;
	    }

	    internalInstance._pendingStateQueue = [completeState];
	    internalInstance._pendingReplaceState = true;

	    enqueueUpdate(internalInstance);
	  },

	  /**
	   * Sets a subset of the state. This only exists because _pendingState is
	   * internal. This provides a merging strategy that is not available to deep
	   * properties which is confusing. TODO: Expose pendingState or don't use it
	   * during the merge.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} partialState Next partial state to be merged with state.
	   * @internal
	   */
	  enqueueSetState: function (publicInstance, partialState) {
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'setState');

	    if (!internalInstance) {
	      return;
	    }

	    var queue = internalInstance._pendingStateQueue || (internalInstance._pendingStateQueue = []);
	    queue.push(partialState);

	    enqueueUpdate(internalInstance);
	  },

	  /**
	   * Sets a subset of the props.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} partialProps Subset of the next props.
	   * @internal
	   */
	  enqueueSetProps: function (publicInstance, partialProps) {
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'setProps');
	    if (!internalInstance) {
	      return;
	    }
	    ReactUpdateQueue.enqueueSetPropsInternal(internalInstance, partialProps);
	  },

	  enqueueSetPropsInternal: function (internalInstance, partialProps) {
	    var topLevelWrapper = internalInstance._topLevelWrapper;
	    !topLevelWrapper ?  false ? invariant(false, 'setProps(...): You called `setProps` on a ' + 'component with a parent. This is an anti-pattern since props will ' + 'get reactively updated when rendered. Instead, change the owner\'s ' + '`render` method to pass the correct value as props to the component ' + 'where it is created.') : invariant(false) : undefined;

	    // Merge with the pending element if it exists, otherwise with existing
	    // element props.
	    var wrapElement = topLevelWrapper._pendingElement || topLevelWrapper._currentElement;
	    var element = wrapElement.props;
	    var props = assign({}, element.props, partialProps);
	    topLevelWrapper._pendingElement = ReactElement.cloneAndReplaceProps(wrapElement, ReactElement.cloneAndReplaceProps(element, props));

	    enqueueUpdate(topLevelWrapper);
	  },

	  /**
	   * Replaces all of the props.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} props New props.
	   * @internal
	   */
	  enqueueReplaceProps: function (publicInstance, props) {
	    var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'replaceProps');
	    if (!internalInstance) {
	      return;
	    }
	    ReactUpdateQueue.enqueueReplacePropsInternal(internalInstance, props);
	  },

	  enqueueReplacePropsInternal: function (internalInstance, props) {
	    var topLevelWrapper = internalInstance._topLevelWrapper;
	    !topLevelWrapper ?  false ? invariant(false, 'replaceProps(...): You called `replaceProps` on a ' + 'component with a parent. This is an anti-pattern since props will ' + 'get reactively updated when rendered. Instead, change the owner\'s ' + '`render` method to pass the correct value as props to the component ' + 'where it is created.') : invariant(false) : undefined;

	    // Merge with the pending element if it exists, otherwise with existing
	    // element props.
	    var wrapElement = topLevelWrapper._pendingElement || topLevelWrapper._currentElement;
	    var element = wrapElement.props;
	    topLevelWrapper._pendingElement = ReactElement.cloneAndReplaceProps(wrapElement, ReactElement.cloneAndReplaceProps(element, props));

	    enqueueUpdate(topLevelWrapper);
	  },

	  enqueueElementInternal: function (internalInstance, newElement) {
	    internalInstance._pendingElement = newElement;
	    enqueueUpdate(internalInstance);
	  }

	};

	module.exports = ReactUpdateQueue;

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactUpdates
	 */

	'use strict';

	var CallbackQueue = __webpack_require__(55);
	var PooledClass = __webpack_require__(56);
	var ReactPerf = __webpack_require__(18);
	var ReactReconciler = __webpack_require__(50);
	var Transaction = __webpack_require__(57);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);

	var dirtyComponents = [];
	var asapCallbackQueue = CallbackQueue.getPooled();
	var asapEnqueued = false;

	var batchingStrategy = null;

	function ensureInjected() {
	  !(ReactUpdates.ReactReconcileTransaction && batchingStrategy) ?  false ? invariant(false, 'ReactUpdates: must inject a reconcile transaction class and batching ' + 'strategy') : invariant(false) : undefined;
	}

	var NESTED_UPDATES = {
	  initialize: function () {
	    this.dirtyComponentsLength = dirtyComponents.length;
	  },
	  close: function () {
	    if (this.dirtyComponentsLength !== dirtyComponents.length) {
	      // Additional updates were enqueued by componentDidUpdate handlers or
	      // similar; before our own UPDATE_QUEUEING wrapper closes, we want to run
	      // these new updates so that if A's componentDidUpdate calls setState on
	      // B, B will update before the callback A's updater provided when calling
	      // setState.
	      dirtyComponents.splice(0, this.dirtyComponentsLength);
	      flushBatchedUpdates();
	    } else {
	      dirtyComponents.length = 0;
	    }
	  }
	};

	var UPDATE_QUEUEING = {
	  initialize: function () {
	    this.callbackQueue.reset();
	  },
	  close: function () {
	    this.callbackQueue.notifyAll();
	  }
	};

	var TRANSACTION_WRAPPERS = [NESTED_UPDATES, UPDATE_QUEUEING];

	function ReactUpdatesFlushTransaction() {
	  this.reinitializeTransaction();
	  this.dirtyComponentsLength = null;
	  this.callbackQueue = CallbackQueue.getPooled();
	  this.reconcileTransaction = ReactUpdates.ReactReconcileTransaction.getPooled( /* forceHTML */false);
	}

	assign(ReactUpdatesFlushTransaction.prototype, Transaction.Mixin, {
	  getTransactionWrappers: function () {
	    return TRANSACTION_WRAPPERS;
	  },

	  destructor: function () {
	    this.dirtyComponentsLength = null;
	    CallbackQueue.release(this.callbackQueue);
	    this.callbackQueue = null;
	    ReactUpdates.ReactReconcileTransaction.release(this.reconcileTransaction);
	    this.reconcileTransaction = null;
	  },

	  perform: function (method, scope, a) {
	    // Essentially calls `this.reconcileTransaction.perform(method, scope, a)`
	    // with this transaction's wrappers around it.
	    return Transaction.Mixin.perform.call(this, this.reconcileTransaction.perform, this.reconcileTransaction, method, scope, a);
	  }
	});

	PooledClass.addPoolingTo(ReactUpdatesFlushTransaction);

	function batchedUpdates(callback, a, b, c, d, e) {
	  ensureInjected();
	  batchingStrategy.batchedUpdates(callback, a, b, c, d, e);
	}

	/**
	 * Array comparator for ReactComponents by mount ordering.
	 *
	 * @param {ReactComponent} c1 first component you're comparing
	 * @param {ReactComponent} c2 second component you're comparing
	 * @return {number} Return value usable by Array.prototype.sort().
	 */
	function mountOrderComparator(c1, c2) {
	  return c1._mountOrder - c2._mountOrder;
	}

	function runBatchedUpdates(transaction) {
	  var len = transaction.dirtyComponentsLength;
	  !(len === dirtyComponents.length) ?  false ? invariant(false, 'Expected flush transaction\'s stored dirty-components length (%s) to ' + 'match dirty-components array length (%s).', len, dirtyComponents.length) : invariant(false) : undefined;

	  // Since reconciling a component higher in the owner hierarchy usually (not
	  // always -- see shouldComponentUpdate()) will reconcile children, reconcile
	  // them before their children by sorting the array.
	  dirtyComponents.sort(mountOrderComparator);

	  for (var i = 0; i < len; i++) {
	    // If a component is unmounted before pending changes apply, it will still
	    // be here, but we assume that it has cleared its _pendingCallbacks and
	    // that performUpdateIfNecessary is a noop.
	    var component = dirtyComponents[i];

	    // If performUpdateIfNecessary happens to enqueue any new updates, we
	    // shouldn't execute the callbacks until the next render happens, so
	    // stash the callbacks first
	    var callbacks = component._pendingCallbacks;
	    component._pendingCallbacks = null;

	    ReactReconciler.performUpdateIfNecessary(component, transaction.reconcileTransaction);

	    if (callbacks) {
	      for (var j = 0; j < callbacks.length; j++) {
	        transaction.callbackQueue.enqueue(callbacks[j], component.getPublicInstance());
	      }
	    }
	  }
	}

	var flushBatchedUpdates = function () {
	  // ReactUpdatesFlushTransaction's wrappers will clear the dirtyComponents
	  // array and perform any updates enqueued by mount-ready handlers (i.e.,
	  // componentDidUpdate) but we need to check here too in order to catch
	  // updates enqueued by setState callbacks and asap calls.
	  while (dirtyComponents.length || asapEnqueued) {
	    if (dirtyComponents.length) {
	      var transaction = ReactUpdatesFlushTransaction.getPooled();
	      transaction.perform(runBatchedUpdates, null, transaction);
	      ReactUpdatesFlushTransaction.release(transaction);
	    }

	    if (asapEnqueued) {
	      asapEnqueued = false;
	      var queue = asapCallbackQueue;
	      asapCallbackQueue = CallbackQueue.getPooled();
	      queue.notifyAll();
	      CallbackQueue.release(queue);
	    }
	  }
	};
	flushBatchedUpdates = ReactPerf.measure('ReactUpdates', 'flushBatchedUpdates', flushBatchedUpdates);

	/**
	 * Mark a component as needing a rerender, adding an optional callback to a
	 * list of functions which will be executed once the rerender occurs.
	 */
	function enqueueUpdate(component) {
	  ensureInjected();

	  // Various parts of our code (such as ReactCompositeComponent's
	  // _renderValidatedComponent) assume that calls to render aren't nested;
	  // verify that that's the case. (This is called by each top-level update
	  // function, like setProps, setState, forceUpdate, etc.; creation and
	  // destruction of top-level components is guarded in ReactMount.)

	  if (!batchingStrategy.isBatchingUpdates) {
	    batchingStrategy.batchedUpdates(enqueueUpdate, component);
	    return;
	  }

	  dirtyComponents.push(component);
	}

	/**
	 * Enqueue a callback to be run at the end of the current batching cycle. Throws
	 * if no updates are currently being performed.
	 */
	function asap(callback, context) {
	  !batchingStrategy.isBatchingUpdates ?  false ? invariant(false, 'ReactUpdates.asap: Can\'t enqueue an asap callback in a context where' + 'updates are not being batched.') : invariant(false) : undefined;
	  asapCallbackQueue.enqueue(callback, context);
	  asapEnqueued = true;
	}

	var ReactUpdatesInjection = {
	  injectReconcileTransaction: function (ReconcileTransaction) {
	    !ReconcileTransaction ?  false ? invariant(false, 'ReactUpdates: must provide a reconcile transaction class') : invariant(false) : undefined;
	    ReactUpdates.ReactReconcileTransaction = ReconcileTransaction;
	  },

	  injectBatchingStrategy: function (_batchingStrategy) {
	    !_batchingStrategy ?  false ? invariant(false, 'ReactUpdates: must provide a batching strategy') : invariant(false) : undefined;
	    !(typeof _batchingStrategy.batchedUpdates === 'function') ?  false ? invariant(false, 'ReactUpdates: must provide a batchedUpdates() function') : invariant(false) : undefined;
	    !(typeof _batchingStrategy.isBatchingUpdates === 'boolean') ?  false ? invariant(false, 'ReactUpdates: must provide an isBatchingUpdates boolean attribute') : invariant(false) : undefined;
	    batchingStrategy = _batchingStrategy;
	  }
	};

	var ReactUpdates = {
	  /**
	   * React references `ReactReconcileTransaction` using this property in order
	   * to allow dependency injection.
	   *
	   * @internal
	   */
	  ReactReconcileTransaction: null,

	  batchedUpdates: batchedUpdates,
	  enqueueUpdate: enqueueUpdate,
	  flushBatchedUpdates: flushBatchedUpdates,
	  injection: ReactUpdatesInjection,
	  asap: asap
	};

	module.exports = ReactUpdates;

/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule CallbackQueue
	 */

	'use strict';

	var PooledClass = __webpack_require__(56);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);

	/**
	 * A specialized pseudo-event module to help keep track of components waiting to
	 * be notified when their DOM representations are available for use.
	 *
	 * This implements `PooledClass`, so you should never need to instantiate this.
	 * Instead, use `CallbackQueue.getPooled()`.
	 *
	 * @class ReactMountReady
	 * @implements PooledClass
	 * @internal
	 */
	function CallbackQueue() {
	  this._callbacks = null;
	  this._contexts = null;
	}

	assign(CallbackQueue.prototype, {

	  /**
	   * Enqueues a callback to be invoked when `notifyAll` is invoked.
	   *
	   * @param {function} callback Invoked when `notifyAll` is invoked.
	   * @param {?object} context Context to call `callback` with.
	   * @internal
	   */
	  enqueue: function (callback, context) {
	    this._callbacks = this._callbacks || [];
	    this._contexts = this._contexts || [];
	    this._callbacks.push(callback);
	    this._contexts.push(context);
	  },

	  /**
	   * Invokes all enqueued callbacks and clears the queue. This is invoked after
	   * the DOM representation of a component has been created or updated.
	   *
	   * @internal
	   */
	  notifyAll: function () {
	    var callbacks = this._callbacks;
	    var contexts = this._contexts;
	    if (callbacks) {
	      !(callbacks.length === contexts.length) ?  false ? invariant(false, 'Mismatched list of contexts in callback queue') : invariant(false) : undefined;
	      this._callbacks = null;
	      this._contexts = null;
	      for (var i = 0; i < callbacks.length; i++) {
	        callbacks[i].call(contexts[i]);
	      }
	      callbacks.length = 0;
	      contexts.length = 0;
	    }
	  },

	  /**
	   * Resets the internal queue.
	   *
	   * @internal
	   */
	  reset: function () {
	    this._callbacks = null;
	    this._contexts = null;
	  },

	  /**
	   * `PooledClass` looks for this.
	   */
	  destructor: function () {
	    this.reset();
	  }

	});

	PooledClass.addPoolingTo(CallbackQueue);

	module.exports = CallbackQueue;

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule PooledClass
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * Static poolers. Several custom versions for each potential number of
	 * arguments. A completely generic pooler is easy to implement, but would
	 * require accessing the `arguments` object. In each of these, `this` refers to
	 * the Class itself, not an instance. If any others are needed, simply add them
	 * here, or in their own files.
	 */
	var oneArgumentPooler = function (copyFieldsFrom) {
	  var Klass = this;
	  if (Klass.instancePool.length) {
	    var instance = Klass.instancePool.pop();
	    Klass.call(instance, copyFieldsFrom);
	    return instance;
	  } else {
	    return new Klass(copyFieldsFrom);
	  }
	};

	var twoArgumentPooler = function (a1, a2) {
	  var Klass = this;
	  if (Klass.instancePool.length) {
	    var instance = Klass.instancePool.pop();
	    Klass.call(instance, a1, a2);
	    return instance;
	  } else {
	    return new Klass(a1, a2);
	  }
	};

	var threeArgumentPooler = function (a1, a2, a3) {
	  var Klass = this;
	  if (Klass.instancePool.length) {
	    var instance = Klass.instancePool.pop();
	    Klass.call(instance, a1, a2, a3);
	    return instance;
	  } else {
	    return new Klass(a1, a2, a3);
	  }
	};

	var fourArgumentPooler = function (a1, a2, a3, a4) {
	  var Klass = this;
	  if (Klass.instancePool.length) {
	    var instance = Klass.instancePool.pop();
	    Klass.call(instance, a1, a2, a3, a4);
	    return instance;
	  } else {
	    return new Klass(a1, a2, a3, a4);
	  }
	};

	var fiveArgumentPooler = function (a1, a2, a3, a4, a5) {
	  var Klass = this;
	  if (Klass.instancePool.length) {
	    var instance = Klass.instancePool.pop();
	    Klass.call(instance, a1, a2, a3, a4, a5);
	    return instance;
	  } else {
	    return new Klass(a1, a2, a3, a4, a5);
	  }
	};

	var standardReleaser = function (instance) {
	  var Klass = this;
	  !(instance instanceof Klass) ?  false ? invariant(false, 'Trying to release an instance into a pool of a different type.') : invariant(false) : undefined;
	  instance.destructor();
	  if (Klass.instancePool.length < Klass.poolSize) {
	    Klass.instancePool.push(instance);
	  }
	};

	var DEFAULT_POOL_SIZE = 10;
	var DEFAULT_POOLER = oneArgumentPooler;

	/**
	 * Augments `CopyConstructor` to be a poolable class, augmenting only the class
	 * itself (statically) not adding any prototypical fields. Any CopyConstructor
	 * you give this may have a `poolSize` property, and will look for a
	 * prototypical `destructor` on instances (optional).
	 *
	 * @param {Function} CopyConstructor Constructor that can be used to reset.
	 * @param {Function} pooler Customizable pooler.
	 */
	var addPoolingTo = function (CopyConstructor, pooler) {
	  var NewKlass = CopyConstructor;
	  NewKlass.instancePool = [];
	  NewKlass.getPooled = pooler || DEFAULT_POOLER;
	  if (!NewKlass.poolSize) {
	    NewKlass.poolSize = DEFAULT_POOL_SIZE;
	  }
	  NewKlass.release = standardReleaser;
	  return NewKlass;
	};

	var PooledClass = {
	  addPoolingTo: addPoolingTo,
	  oneArgumentPooler: oneArgumentPooler,
	  twoArgumentPooler: twoArgumentPooler,
	  threeArgumentPooler: threeArgumentPooler,
	  fourArgumentPooler: fourArgumentPooler,
	  fiveArgumentPooler: fiveArgumentPooler
	};

	module.exports = PooledClass;

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Transaction
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	/**
	 * `Transaction` creates a black box that is able to wrap any method such that
	 * certain invariants are maintained before and after the method is invoked
	 * (Even if an exception is thrown while invoking the wrapped method). Whoever
	 * instantiates a transaction can provide enforcers of the invariants at
	 * creation time. The `Transaction` class itself will supply one additional
	 * automatic invariant for you - the invariant that any transaction instance
	 * should not be run while it is already being run. You would typically create a
	 * single instance of a `Transaction` for reuse multiple times, that potentially
	 * is used to wrap several different methods. Wrappers are extremely simple -
	 * they only require implementing two methods.
	 *
	 * <pre>
	 *                       wrappers (injected at creation time)
	 *                                      +        +
	 *                                      |        |
	 *                    +-----------------|--------|--------------+
	 *                    |                 v        |              |
	 *                    |      +---------------+   |              |
	 *                    |   +--|    wrapper1   |---|----+         |
	 *                    |   |  +---------------+   v    |         |
	 *                    |   |          +-------------+  |         |
	 *                    |   |     +----|   wrapper2  |--------+   |
	 *                    |   |     |    +-------------+  |     |   |
	 *                    |   |     |                     |     |   |
	 *                    |   v     v                     v     v   | wrapper
	 *                    | +---+ +---+   +---------+   +---+ +---+ | invariants
	 * perform(anyMethod) | |   | |   |   |         |   |   | |   | | maintained
	 * +----------------->|-|---|-|---|-->|anyMethod|---|---|-|---|-|-------->
	 *                    | |   | |   |   |         |   |   | |   | |
	 *                    | |   | |   |   |         |   |   | |   | |
	 *                    | |   | |   |   |         |   |   | |   | |
	 *                    | +---+ +---+   +---------+   +---+ +---+ |
	 *                    |  initialize                    close    |
	 *                    +-----------------------------------------+
	 * </pre>
	 *
	 * Use cases:
	 * - Preserving the input selection ranges before/after reconciliation.
	 *   Restoring selection even in the event of an unexpected error.
	 * - Deactivating events while rearranging the DOM, preventing blurs/focuses,
	 *   while guaranteeing that afterwards, the event system is reactivated.
	 * - Flushing a queue of collected DOM mutations to the main UI thread after a
	 *   reconciliation takes place in a worker thread.
	 * - Invoking any collected `componentDidUpdate` callbacks after rendering new
	 *   content.
	 * - (Future use case): Wrapping particular flushes of the `ReactWorker` queue
	 *   to preserve the `scrollTop` (an automatic scroll aware DOM).
	 * - (Future use case): Layout calculations before and after DOM updates.
	 *
	 * Transactional plugin API:
	 * - A module that has an `initialize` method that returns any precomputation.
	 * - and a `close` method that accepts the precomputation. `close` is invoked
	 *   when the wrapped process is completed, or has failed.
	 *
	 * @param {Array<TransactionalWrapper>} transactionWrapper Wrapper modules
	 * that implement `initialize` and `close`.
	 * @return {Transaction} Single transaction for reuse in thread.
	 *
	 * @class Transaction
	 */
	var Mixin = {
	  /**
	   * Sets up this instance so that it is prepared for collecting metrics. Does
	   * so such that this setup method may be used on an instance that is already
	   * initialized, in a way that does not consume additional memory upon reuse.
	   * That can be useful if you decide to make your subclass of this mixin a
	   * "PooledClass".
	   */
	  reinitializeTransaction: function () {
	    this.transactionWrappers = this.getTransactionWrappers();
	    if (this.wrapperInitData) {
	      this.wrapperInitData.length = 0;
	    } else {
	      this.wrapperInitData = [];
	    }
	    this._isInTransaction = false;
	  },

	  _isInTransaction: false,

	  /**
	   * @abstract
	   * @return {Array<TransactionWrapper>} Array of transaction wrappers.
	   */
	  getTransactionWrappers: null,

	  isInTransaction: function () {
	    return !!this._isInTransaction;
	  },

	  /**
	   * Executes the function within a safety window. Use this for the top level
	   * methods that result in large amounts of computation/mutations that would
	   * need to be safety checked. The optional arguments helps prevent the need
	   * to bind in many cases.
	   *
	   * @param {function} method Member of scope to call.
	   * @param {Object} scope Scope to invoke from.
	   * @param {Object?=} a Argument to pass to the method.
	   * @param {Object?=} b Argument to pass to the method.
	   * @param {Object?=} c Argument to pass to the method.
	   * @param {Object?=} d Argument to pass to the method.
	   * @param {Object?=} e Argument to pass to the method.
	   * @param {Object?=} f Argument to pass to the method.
	   *
	   * @return {*} Return value from `method`.
	   */
	  perform: function (method, scope, a, b, c, d, e, f) {
	    !!this.isInTransaction() ?  false ? invariant(false, 'Transaction.perform(...): Cannot initialize a transaction when there ' + 'is already an outstanding transaction.') : invariant(false) : undefined;
	    var errorThrown;
	    var ret;
	    try {
	      this._isInTransaction = true;
	      // Catching errors makes debugging more difficult, so we start with
	      // errorThrown set to true before setting it to false after calling
	      // close -- if it's still set to true in the finally block, it means
	      // one of these calls threw.
	      errorThrown = true;
	      this.initializeAll(0);
	      ret = method.call(scope, a, b, c, d, e, f);
	      errorThrown = false;
	    } finally {
	      try {
	        if (errorThrown) {
	          // If `method` throws, prefer to show that stack trace over any thrown
	          // by invoking `closeAll`.
	          try {
	            this.closeAll(0);
	          } catch (err) {}
	        } else {
	          // Since `method` didn't throw, we don't want to silence the exception
	          // here.
	          this.closeAll(0);
	        }
	      } finally {
	        this._isInTransaction = false;
	      }
	    }
	    return ret;
	  },

	  initializeAll: function (startIndex) {
	    var transactionWrappers = this.transactionWrappers;
	    for (var i = startIndex; i < transactionWrappers.length; i++) {
	      var wrapper = transactionWrappers[i];
	      try {
	        // Catching errors makes debugging more difficult, so we start with the
	        // OBSERVED_ERROR state before overwriting it with the real return value
	        // of initialize -- if it's still set to OBSERVED_ERROR in the finally
	        // block, it means wrapper.initialize threw.
	        this.wrapperInitData[i] = Transaction.OBSERVED_ERROR;
	        this.wrapperInitData[i] = wrapper.initialize ? wrapper.initialize.call(this) : null;
	      } finally {
	        if (this.wrapperInitData[i] === Transaction.OBSERVED_ERROR) {
	          // The initializer for wrapper i threw an error; initialize the
	          // remaining wrappers but silence any exceptions from them to ensure
	          // that the first error is the one to bubble up.
	          try {
	            this.initializeAll(i + 1);
	          } catch (err) {}
	        }
	      }
	    }
	  },

	  /**
	   * Invokes each of `this.transactionWrappers.close[i]` functions, passing into
	   * them the respective return values of `this.transactionWrappers.init[i]`
	   * (`close`rs that correspond to initializers that failed will not be
	   * invoked).
	   */
	  closeAll: function (startIndex) {
	    !this.isInTransaction() ?  false ? invariant(false, 'Transaction.closeAll(): Cannot close transaction when none are open.') : invariant(false) : undefined;
	    var transactionWrappers = this.transactionWrappers;
	    for (var i = startIndex; i < transactionWrappers.length; i++) {
	      var wrapper = transactionWrappers[i];
	      var initData = this.wrapperInitData[i];
	      var errorThrown;
	      try {
	        // Catching errors makes debugging more difficult, so we start with
	        // errorThrown set to true before setting it to false after calling
	        // close -- if it's still set to true in the finally block, it means
	        // wrapper.close threw.
	        errorThrown = true;
	        if (initData !== Transaction.OBSERVED_ERROR && wrapper.close) {
	          wrapper.close.call(this, initData);
	        }
	        errorThrown = false;
	      } finally {
	        if (errorThrown) {
	          // The closer for wrapper i threw an error; close the remaining
	          // wrappers but silence any exceptions from them to ensure that the
	          // first error is the one to bubble up.
	          try {
	            this.closeAll(i + 1);
	          } catch (e) {}
	        }
	      }
	    }
	    this.wrapperInitData.length = 0;
	  }
	};

	var Transaction = {

	  Mixin: Mixin,

	  /**
	   * Token to look for to determine if an error occurred.
	   */
	  OBSERVED_ERROR: {}

	};

	module.exports = Transaction;

/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule emptyObject
	 */

	'use strict';

	var emptyObject = {};

	if (false) {
	  Object.freeze(emptyObject);
	}

	module.exports = emptyObject;

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule containsNode
	 * @typechecks
	 */

	'use strict';

	var isTextNode = __webpack_require__(60);

	/*eslint-disable no-bitwise */

	/**
	 * Checks if a given DOM node contains or is another DOM node.
	 *
	 * @param {?DOMNode} outerNode Outer DOM node.
	 * @param {?DOMNode} innerNode Inner DOM node.
	 * @return {boolean} True if `outerNode` contains or is `innerNode`.
	 */
	function containsNode(_x, _x2) {
	  var _again = true;

	  _function: while (_again) {
	    var outerNode = _x,
	        innerNode = _x2;
	    _again = false;

	    if (!outerNode || !innerNode) {
	      return false;
	    } else if (outerNode === innerNode) {
	      return true;
	    } else if (isTextNode(outerNode)) {
	      return false;
	    } else if (isTextNode(innerNode)) {
	      _x = outerNode;
	      _x2 = innerNode.parentNode;
	      _again = true;
	      continue _function;
	    } else if (outerNode.contains) {
	      return outerNode.contains(innerNode);
	    } else if (outerNode.compareDocumentPosition) {
	      return !!(outerNode.compareDocumentPosition(innerNode) & 16);
	    } else {
	      return false;
	    }
	  }
	}

	module.exports = containsNode;

/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isTextNode
	 * @typechecks
	 */

	'use strict';

	var isNode = __webpack_require__(61);

	/**
	 * @param {*} object The object to check.
	 * @return {boolean} Whether or not the object is a DOM text node.
	 */
	function isTextNode(object) {
	  return isNode(object) && object.nodeType == 3;
	}

	module.exports = isTextNode;

/***/ },
/* 61 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isNode
	 * @typechecks
	 */

	/**
	 * @param {*} object The object to check.
	 * @return {boolean} Whether or not the object is a DOM node.
	 */
	'use strict';

	function isNode(object) {
	  return !!(object && (typeof Node === 'function' ? object instanceof Node : typeof object === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string'));
	}

	module.exports = isNode;

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule instantiateReactComponent
	 * @typechecks static-only
	 */

	'use strict';

	var ReactCompositeComponent = __webpack_require__(63);
	var ReactEmptyComponent = __webpack_require__(68);
	var ReactNativeComponent = __webpack_require__(69);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	// To avoid a cyclic dependency, we create the final class in this module
	var ReactCompositeComponentWrapper = function () {};
	assign(ReactCompositeComponentWrapper.prototype, ReactCompositeComponent.Mixin, {
	  _instantiateReactComponent: instantiateReactComponent
	});

	function getDeclarationErrorAddendum(owner) {
	  if (owner) {
	    var name = owner.getName();
	    if (name) {
	      return ' Check the render method of `' + name + '`.';
	    }
	  }
	  return '';
	}

	/**
	 * Check if the type reference is a known internal type. I.e. not a user
	 * provided composite type.
	 *
	 * @param {function} type
	 * @return {boolean} Returns true if this is a valid internal type.
	 */
	function isInternalComponentType(type) {
	  return typeof type === 'function' && typeof type.prototype !== 'undefined' && typeof type.prototype.mountComponent === 'function' && typeof type.prototype.receiveComponent === 'function';
	}

	/**
	 * Given a ReactNode, create an instance that will actually be mounted.
	 *
	 * @param {ReactNode} node
	 * @return {object} A new instance of the element's constructor.
	 * @protected
	 */
	function instantiateReactComponent(node) {
	  var instance;

	  if (node === null || node === false) {
	    instance = new ReactEmptyComponent(instantiateReactComponent);
	  } else if (typeof node === 'object') {
	    var element = node;
	    !(element && (typeof element.type === 'function' || typeof element.type === 'string')) ?  false ? invariant(false, 'Element type is invalid: expected a string (for built-in components) ' + 'or a class/function (for composite components) but got: %s.%s', element.type == null ? element.type : typeof element.type, getDeclarationErrorAddendum(element._owner)) : invariant(false) : undefined;

	    // Special case string values
	    if (typeof element.type === 'string') {
	      instance = ReactNativeComponent.createInternalComponent(element);
	    } else if (isInternalComponentType(element.type)) {
	      // This is temporarily available for custom components that are not string
	      // representations. I.e. ART. Once those are updated to use the string
	      // representation, we can drop this code path.
	      instance = new element.type(element);
	    } else {
	      instance = new ReactCompositeComponentWrapper();
	    }
	  } else if (typeof node === 'string' || typeof node === 'number') {
	    instance = ReactNativeComponent.createInstanceForText(node);
	  } else {
	     true ?  false ? invariant(false, 'Encountered invalid React node of type %s', typeof node) : invariant(false) : undefined;
	  }

	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(typeof instance.construct === 'function' && typeof instance.mountComponent === 'function' && typeof instance.receiveComponent === 'function' && typeof instance.unmountComponent === 'function', 'Only React Components can be mounted.') : undefined;
	  }

	  // Sets up the instance. This can probably just move into the constructor now.
	  instance.construct(node);

	  // These two fields are used by the DOM and ART diffing algorithms
	  // respectively. Instead of using expandos on components, we should be
	  // storing the state needed by the diffing algorithms elsewhere.
	  instance._mountIndex = 0;
	  instance._mountImage = null;

	  if (false) {
	    instance._isOwnerNecessary = false;
	    instance._warnedAboutRefsInRender = false;
	  }

	  // Internal instances should fully constructed at this point, so they should
	  // not get any new fields added to them at this point.
	  if (false) {
	    if (Object.preventExtensions) {
	      Object.preventExtensions(instance);
	    }
	  }

	  return instance;
	}

	module.exports = instantiateReactComponent;

/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactCompositeComponent
	 */

	'use strict';

	var ReactComponentEnvironment = __webpack_require__(64);
	var ReactCurrentOwner = __webpack_require__(5);
	var ReactElement = __webpack_require__(42);
	var ReactInstanceMap = __webpack_require__(47);
	var ReactPerf = __webpack_require__(18);
	var ReactPropTypeLocations = __webpack_require__(65);
	var ReactPropTypeLocationNames = __webpack_require__(66);
	var ReactReconciler = __webpack_require__(50);
	var ReactUpdateQueue = __webpack_require__(53);

	var assign = __webpack_require__(39);
	var emptyObject = __webpack_require__(58);
	var invariant = __webpack_require__(13);
	var shouldUpdateReactComponent = __webpack_require__(67);
	var warning = __webpack_require__(25);

	function getDeclarationErrorAddendum(component) {
	  var owner = component._currentElement._owner || null;
	  if (owner) {
	    var name = owner.getName();
	    if (name) {
	      return ' Check the render method of `' + name + '`.';
	    }
	  }
	  return '';
	}

	function StatelessComponent(Component) {}
	StatelessComponent.prototype.render = function () {
	  var Component = ReactInstanceMap.get(this)._currentElement.type;
	  return Component(this.props, this.context, this.updater);
	};

	/**
	 * ------------------ The Life-Cycle of a Composite Component ------------------
	 *
	 * - constructor: Initialization of state. The instance is now retained.
	 *   - componentWillMount
	 *   - render
	 *   - [children's constructors]
	 *     - [children's componentWillMount and render]
	 *     - [children's componentDidMount]
	 *     - componentDidMount
	 *
	 *       Update Phases:
	 *       - componentWillReceiveProps (only called if parent updated)
	 *       - shouldComponentUpdate
	 *         - componentWillUpdate
	 *           - render
	 *           - [children's constructors or receive props phases]
	 *         - componentDidUpdate
	 *
	 *     - componentWillUnmount
	 *     - [children's componentWillUnmount]
	 *   - [children destroyed]
	 * - (destroyed): The instance is now blank, released by React and ready for GC.
	 *
	 * -----------------------------------------------------------------------------
	 */

	/**
	 * An incrementing ID assigned to each component when it is mounted. This is
	 * used to enforce the order in which `ReactUpdates` updates dirty components.
	 *
	 * @private
	 */
	var nextMountID = 1;

	/**
	 * @lends {ReactCompositeComponent.prototype}
	 */
	var ReactCompositeComponentMixin = {

	  /**
	   * Base constructor for all composite component.
	   *
	   * @param {ReactElement} element
	   * @final
	   * @internal
	   */
	  construct: function (element) {
	    this._currentElement = element;
	    this._rootNodeID = null;
	    this._instance = null;

	    // See ReactUpdateQueue
	    this._pendingElement = null;
	    this._pendingStateQueue = null;
	    this._pendingReplaceState = false;
	    this._pendingForceUpdate = false;

	    this._renderedComponent = null;

	    this._context = null;
	    this._mountOrder = 0;
	    this._topLevelWrapper = null;

	    // See ReactUpdates and ReactUpdateQueue.
	    this._pendingCallbacks = null;
	  },

	  /**
	   * Initializes the component, renders markup, and registers event listeners.
	   *
	   * @param {string} rootID DOM ID of the root node.
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @return {?string} Rendered markup to be inserted into the DOM.
	   * @final
	   * @internal
	   */
	  mountComponent: function (rootID, transaction, context) {
	    this._context = context;
	    this._mountOrder = nextMountID++;
	    this._rootNodeID = rootID;

	    var publicProps = this._processProps(this._currentElement.props);
	    var publicContext = this._processContext(context);

	    var Component = this._currentElement.type;

	    // Initialize the public class
	    var inst;
	    var renderedElement;

	    // This is a way to detect if Component is a stateless arrow function
	    // component, which is not newable. It might not be 100% reliable but is
	    // something we can do until we start detecting that Component extends
	    // React.Component. We already assume that typeof Component === 'function'.
	    var canInstantiate = ('prototype' in Component);

	    if (canInstantiate) {
	      if (false) {
	        ReactCurrentOwner.current = this;
	        try {
	          inst = new Component(publicProps, publicContext, ReactUpdateQueue);
	        } finally {
	          ReactCurrentOwner.current = null;
	        }
	      } else {
	        inst = new Component(publicProps, publicContext, ReactUpdateQueue);
	      }
	    }

	    if (!canInstantiate || inst === null || inst === false || ReactElement.isValidElement(inst)) {
	      renderedElement = inst;
	      inst = new StatelessComponent(Component);
	    }

	    if (false) {
	      // This will throw later in _renderValidatedComponent, but add an early
	      // warning now to help debugging
	      if (inst.render == null) {
	        process.env.NODE_ENV !== 'production' ? warning(false, '%s(...): No `render` method found on the returned component ' + 'instance: you may have forgotten to define `render`, returned ' + 'null/false from a stateless component, or tried to render an ' + 'element whose type is a function that isn\'t a React component.', Component.displayName || Component.name || 'Component') : undefined;
	      } else {
	        // We support ES6 inheriting from React.Component, the module pattern,
	        // and stateless components, but not ES6 classes that don't extend
	        process.env.NODE_ENV !== 'production' ? warning(Component.prototype && Component.prototype.isReactComponent || !canInstantiate || !(inst instanceof Component), '%s(...): React component classes must extend React.Component.', Component.displayName || Component.name || 'Component') : undefined;
	      }
	    }

	    // These should be set up in the constructor, but as a convenience for
	    // simpler class abstractions, we set them up after the fact.
	    inst.props = publicProps;
	    inst.context = publicContext;
	    inst.refs = emptyObject;
	    inst.updater = ReactUpdateQueue;

	    this._instance = inst;

	    // Store a reference from the instance back to the internal representation
	    ReactInstanceMap.set(inst, this);

	    if (false) {
	      // Since plain JS classes are defined without any special initialization
	      // logic, we can not catch common errors early. Therefore, we have to
	      // catch them here, at initialization time, instead.
	      process.env.NODE_ENV !== 'production' ? warning(!inst.getInitialState || inst.getInitialState.isReactClassApproved, 'getInitialState was defined on %s, a plain JavaScript class. ' + 'This is only supported for classes created using React.createClass. ' + 'Did you mean to define a state property instead?', this.getName() || 'a component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(!inst.getDefaultProps || inst.getDefaultProps.isReactClassApproved, 'getDefaultProps was defined on %s, a plain JavaScript class. ' + 'This is only supported for classes created using React.createClass. ' + 'Use a static property to define defaultProps instead.', this.getName() || 'a component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(!inst.propTypes, 'propTypes was defined as an instance property on %s. Use a static ' + 'property to define propTypes instead.', this.getName() || 'a component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(!inst.contextTypes, 'contextTypes was defined as an instance property on %s. Use a ' + 'static property to define contextTypes instead.', this.getName() || 'a component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(typeof inst.componentShouldUpdate !== 'function', '%s has a method called ' + 'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' + 'The name is phrased as a question because the function is ' + 'expected to return a value.', this.getName() || 'A component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(typeof inst.componentDidUnmount !== 'function', '%s has a method called ' + 'componentDidUnmount(). But there is no such lifecycle method. ' + 'Did you mean componentWillUnmount()?', this.getName() || 'A component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(typeof inst.componentWillRecieveProps !== 'function', '%s has a method called ' + 'componentWillRecieveProps(). Did you mean componentWillReceiveProps()?', this.getName() || 'A component') : undefined;
	    }

	    var initialState = inst.state;
	    if (initialState === undefined) {
	      inst.state = initialState = null;
	    }
	    !(typeof initialState === 'object' && !Array.isArray(initialState)) ?  false ? invariant(false, '%s.state: must be set to an object or null', this.getName() || 'ReactCompositeComponent') : invariant(false) : undefined;

	    this._pendingStateQueue = null;
	    this._pendingReplaceState = false;
	    this._pendingForceUpdate = false;

	    if (inst.componentWillMount) {
	      inst.componentWillMount();
	      // When mounting, calls to `setState` by `componentWillMount` will set
	      // `this._pendingStateQueue` without triggering a re-render.
	      if (this._pendingStateQueue) {
	        inst.state = this._processPendingState(inst.props, inst.context);
	      }
	    }

	    // If not a stateless component, we now render
	    if (renderedElement === undefined) {
	      renderedElement = this._renderValidatedComponent();
	    }

	    this._renderedComponent = this._instantiateReactComponent(renderedElement);

	    var markup = ReactReconciler.mountComponent(this._renderedComponent, rootID, transaction, this._processChildContext(context));
	    if (inst.componentDidMount) {
	      transaction.getReactMountReady().enqueue(inst.componentDidMount, inst);
	    }

	    return markup;
	  },

	  /**
	   * Releases any resources allocated by `mountComponent`.
	   *
	   * @final
	   * @internal
	   */
	  unmountComponent: function () {
	    var inst = this._instance;

	    if (inst.componentWillUnmount) {
	      inst.componentWillUnmount();
	    }

	    ReactReconciler.unmountComponent(this._renderedComponent);
	    this._renderedComponent = null;
	    this._instance = null;

	    // Reset pending fields
	    // Even if this component is scheduled for another update in ReactUpdates,
	    // it would still be ignored because these fields are reset.
	    this._pendingStateQueue = null;
	    this._pendingReplaceState = false;
	    this._pendingForceUpdate = false;
	    this._pendingCallbacks = null;
	    this._pendingElement = null;

	    // These fields do not really need to be reset since this object is no
	    // longer accessible.
	    this._context = null;
	    this._rootNodeID = null;
	    this._topLevelWrapper = null;

	    // Delete the reference from the instance to this internal representation
	    // which allow the internals to be properly cleaned up even if the user
	    // leaks a reference to the public instance.
	    ReactInstanceMap.remove(inst);

	    // Some existing components rely on inst.props even after they've been
	    // destroyed (in event handlers).
	    // TODO: inst.props = null;
	    // TODO: inst.state = null;
	    // TODO: inst.context = null;
	  },

	  /**
	   * Filters the context object to only contain keys specified in
	   * `contextTypes`
	   *
	   * @param {object} context
	   * @return {?object}
	   * @private
	   */
	  _maskContext: function (context) {
	    var maskedContext = null;
	    var Component = this._currentElement.type;
	    var contextTypes = Component.contextTypes;
	    if (!contextTypes) {
	      return emptyObject;
	    }
	    maskedContext = {};
	    for (var contextName in contextTypes) {
	      maskedContext[contextName] = context[contextName];
	    }
	    return maskedContext;
	  },

	  /**
	   * Filters the context object to only contain keys specified in
	   * `contextTypes`, and asserts that they are valid.
	   *
	   * @param {object} context
	   * @return {?object}
	   * @private
	   */
	  _processContext: function (context) {
	    var maskedContext = this._maskContext(context);
	    if (false) {
	      var Component = this._currentElement.type;
	      if (Component.contextTypes) {
	        this._checkPropTypes(Component.contextTypes, maskedContext, ReactPropTypeLocations.context);
	      }
	    }
	    return maskedContext;
	  },

	  /**
	   * @param {object} currentContext
	   * @return {object}
	   * @private
	   */
	  _processChildContext: function (currentContext) {
	    var Component = this._currentElement.type;
	    var inst = this._instance;
	    var childContext = inst.getChildContext && inst.getChildContext();
	    if (childContext) {
	      !(typeof Component.childContextTypes === 'object') ?  false ? invariant(false, '%s.getChildContext(): childContextTypes must be defined in order to ' + 'use getChildContext().', this.getName() || 'ReactCompositeComponent') : invariant(false) : undefined;
	      if (false) {
	        this._checkPropTypes(Component.childContextTypes, childContext, ReactPropTypeLocations.childContext);
	      }
	      for (var name in childContext) {
	        !(name in Component.childContextTypes) ?  false ? invariant(false, '%s.getChildContext(): key "%s" is not defined in childContextTypes.', this.getName() || 'ReactCompositeComponent', name) : invariant(false) : undefined;
	      }
	      return assign({}, currentContext, childContext);
	    }
	    return currentContext;
	  },

	  /**
	   * Processes props by setting default values for unspecified props and
	   * asserting that the props are valid. Does not mutate its argument; returns
	   * a new props object with defaults merged in.
	   *
	   * @param {object} newProps
	   * @return {object}
	   * @private
	   */
	  _processProps: function (newProps) {
	    if (false) {
	      var Component = this._currentElement.type;
	      if (Component.propTypes) {
	        this._checkPropTypes(Component.propTypes, newProps, ReactPropTypeLocations.prop);
	      }
	    }
	    return newProps;
	  },

	  /**
	   * Assert that the props are valid
	   *
	   * @param {object} propTypes Map of prop name to a ReactPropType
	   * @param {object} props
	   * @param {string} location e.g. "prop", "context", "child context"
	   * @private
	   */
	  _checkPropTypes: function (propTypes, props, location) {
	    // TODO: Stop validating prop types here and only use the element
	    // validation.
	    var componentName = this.getName();
	    for (var propName in propTypes) {
	      if (propTypes.hasOwnProperty(propName)) {
	        var error;
	        try {
	          // This is intentionally an invariant that gets caught. It's the same
	          // behavior as without this statement except with a better message.
	          !(typeof propTypes[propName] === 'function') ?  false ? invariant(false, '%s: %s type `%s` is invalid; it must be a function, usually ' + 'from React.PropTypes.', componentName || 'React class', ReactPropTypeLocationNames[location], propName) : invariant(false) : undefined;
	          error = propTypes[propName](props, propName, componentName, location);
	        } catch (ex) {
	          error = ex;
	        }
	        if (error instanceof Error) {
	          // We may want to extend this logic for similar errors in
	          // top-level render calls, so I'm abstracting it away into
	          // a function to minimize refactoring in the future
	          var addendum = getDeclarationErrorAddendum(this);

	          if (location === ReactPropTypeLocations.prop) {
	            // Preface gives us something to blacklist in warning module
	             false ? warning(false, 'Failed Composite propType: %s%s', error.message, addendum) : undefined;
	          } else {
	             false ? warning(false, 'Failed Context Types: %s%s', error.message, addendum) : undefined;
	          }
	        }
	      }
	    }
	  },

	  receiveComponent: function (nextElement, transaction, nextContext) {
	    var prevElement = this._currentElement;
	    var prevContext = this._context;

	    this._pendingElement = null;

	    this.updateComponent(transaction, prevElement, nextElement, prevContext, nextContext);
	  },

	  /**
	   * If any of `_pendingElement`, `_pendingStateQueue`, or `_pendingForceUpdate`
	   * is set, update the component.
	   *
	   * @param {ReactReconcileTransaction} transaction
	   * @internal
	   */
	  performUpdateIfNecessary: function (transaction) {
	    if (this._pendingElement != null) {
	      ReactReconciler.receiveComponent(this, this._pendingElement || this._currentElement, transaction, this._context);
	    }

	    if (this._pendingStateQueue !== null || this._pendingForceUpdate) {
	      this.updateComponent(transaction, this._currentElement, this._currentElement, this._context, this._context);
	    }
	  },

	  /**
	   * Perform an update to a mounted component. The componentWillReceiveProps and
	   * shouldComponentUpdate methods are called, then (assuming the update isn't
	   * skipped) the remaining update lifecycle methods are called and the DOM
	   * representation is updated.
	   *
	   * By default, this implements React's rendering and reconciliation algorithm.
	   * Sophisticated clients may wish to override this.
	   *
	   * @param {ReactReconcileTransaction} transaction
	   * @param {ReactElement} prevParentElement
	   * @param {ReactElement} nextParentElement
	   * @internal
	   * @overridable
	   */
	  updateComponent: function (transaction, prevParentElement, nextParentElement, prevUnmaskedContext, nextUnmaskedContext) {
	    var inst = this._instance;

	    var nextContext = this._context === nextUnmaskedContext ? inst.context : this._processContext(nextUnmaskedContext);
	    var nextProps;

	    // Distinguish between a props update versus a simple state update
	    if (prevParentElement === nextParentElement) {
	      // Skip checking prop types again -- we don't read inst.props to avoid
	      // warning for DOM component props in this upgrade
	      nextProps = nextParentElement.props;
	    } else {
	      nextProps = this._processProps(nextParentElement.props);
	      // An update here will schedule an update but immediately set
	      // _pendingStateQueue which will ensure that any state updates gets
	      // immediately reconciled instead of waiting for the next batch.

	      if (inst.componentWillReceiveProps) {
	        inst.componentWillReceiveProps(nextProps, nextContext);
	      }
	    }

	    var nextState = this._processPendingState(nextProps, nextContext);

	    var shouldUpdate = this._pendingForceUpdate || !inst.shouldComponentUpdate || inst.shouldComponentUpdate(nextProps, nextState, nextContext);

	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(typeof shouldUpdate !== 'undefined', '%s.shouldComponentUpdate(): Returned undefined instead of a ' + 'boolean value. Make sure to return true or false.', this.getName() || 'ReactCompositeComponent') : undefined;
	    }

	    if (shouldUpdate) {
	      this._pendingForceUpdate = false;
	      // Will set `this.props`, `this.state` and `this.context`.
	      this._performComponentUpdate(nextParentElement, nextProps, nextState, nextContext, transaction, nextUnmaskedContext);
	    } else {
	      // If it's determined that a component should not update, we still want
	      // to set props and state but we shortcut the rest of the update.
	      this._currentElement = nextParentElement;
	      this._context = nextUnmaskedContext;
	      inst.props = nextProps;
	      inst.state = nextState;
	      inst.context = nextContext;
	    }
	  },

	  _processPendingState: function (props, context) {
	    var inst = this._instance;
	    var queue = this._pendingStateQueue;
	    var replace = this._pendingReplaceState;
	    this._pendingReplaceState = false;
	    this._pendingStateQueue = null;

	    if (!queue) {
	      return inst.state;
	    }

	    if (replace && queue.length === 1) {
	      return queue[0];
	    }

	    var nextState = assign({}, replace ? queue[0] : inst.state);
	    for (var i = replace ? 1 : 0; i < queue.length; i++) {
	      var partial = queue[i];
	      assign(nextState, typeof partial === 'function' ? partial.call(inst, nextState, props, context) : partial);
	    }

	    return nextState;
	  },

	  /**
	   * Merges new props and state, notifies delegate methods of update and
	   * performs update.
	   *
	   * @param {ReactElement} nextElement Next element
	   * @param {object} nextProps Next public object to set as properties.
	   * @param {?object} nextState Next object to set as state.
	   * @param {?object} nextContext Next public object to set as context.
	   * @param {ReactReconcileTransaction} transaction
	   * @param {?object} unmaskedContext
	   * @private
	   */
	  _performComponentUpdate: function (nextElement, nextProps, nextState, nextContext, transaction, unmaskedContext) {
	    var inst = this._instance;

	    var hasComponentDidUpdate = Boolean(inst.componentDidUpdate);
	    var prevProps;
	    var prevState;
	    var prevContext;
	    if (hasComponentDidUpdate) {
	      prevProps = inst.props;
	      prevState = inst.state;
	      prevContext = inst.context;
	    }

	    if (inst.componentWillUpdate) {
	      inst.componentWillUpdate(nextProps, nextState, nextContext);
	    }

	    this._currentElement = nextElement;
	    this._context = unmaskedContext;
	    inst.props = nextProps;
	    inst.state = nextState;
	    inst.context = nextContext;

	    this._updateRenderedComponent(transaction, unmaskedContext);

	    if (hasComponentDidUpdate) {
	      transaction.getReactMountReady().enqueue(inst.componentDidUpdate.bind(inst, prevProps, prevState, prevContext), inst);
	    }
	  },

	  /**
	   * Call the component's `render` method and update the DOM accordingly.
	   *
	   * @param {ReactReconcileTransaction} transaction
	   * @internal
	   */
	  _updateRenderedComponent: function (transaction, context) {
	    var prevComponentInstance = this._renderedComponent;
	    var prevRenderedElement = prevComponentInstance._currentElement;
	    var nextRenderedElement = this._renderValidatedComponent();
	    if (shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
	      ReactReconciler.receiveComponent(prevComponentInstance, nextRenderedElement, transaction, this._processChildContext(context));
	    } else {
	      // These two IDs are actually the same! But nothing should rely on that.
	      var thisID = this._rootNodeID;
	      var prevComponentID = prevComponentInstance._rootNodeID;
	      ReactReconciler.unmountComponent(prevComponentInstance);

	      this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
	      var nextMarkup = ReactReconciler.mountComponent(this._renderedComponent, thisID, transaction, this._processChildContext(context));
	      this._replaceNodeWithMarkupByID(prevComponentID, nextMarkup);
	    }
	  },

	  /**
	   * @protected
	   */
	  _replaceNodeWithMarkupByID: function (prevComponentID, nextMarkup) {
	    ReactComponentEnvironment.replaceNodeWithMarkupByID(prevComponentID, nextMarkup);
	  },

	  /**
	   * @protected
	   */
	  _renderValidatedComponentWithoutOwnerOrContext: function () {
	    var inst = this._instance;
	    var renderedComponent = inst.render();
	    if (false) {
	      // We allow auto-mocks to proceed as if they're returning null.
	      if (typeof renderedComponent === 'undefined' && inst.render._isMockFunction) {
	        // This is probably bad practice. Consider warning here and
	        // deprecating this convenience.
	        renderedComponent = null;
	      }
	    }

	    return renderedComponent;
	  },

	  /**
	   * @private
	   */
	  _renderValidatedComponent: function () {
	    var renderedComponent;
	    ReactCurrentOwner.current = this;
	    try {
	      renderedComponent = this._renderValidatedComponentWithoutOwnerOrContext();
	    } finally {
	      ReactCurrentOwner.current = null;
	    }
	    !(
	    // TODO: An `isValidNode` function would probably be more appropriate
	    renderedComponent === null || renderedComponent === false || ReactElement.isValidElement(renderedComponent)) ?  false ? invariant(false, '%s.render(): A valid ReactComponent must be returned. You may have ' + 'returned undefined, an array or some other invalid object.', this.getName() || 'ReactCompositeComponent') : invariant(false) : undefined;
	    return renderedComponent;
	  },

	  /**
	   * Lazily allocates the refs object and stores `component` as `ref`.
	   *
	   * @param {string} ref Reference name.
	   * @param {component} component Component to store as `ref`.
	   * @final
	   * @private
	   */
	  attachRef: function (ref, component) {
	    var inst = this.getPublicInstance();
	    !(inst != null) ?  false ? invariant(false, 'Stateless function components cannot have refs.') : invariant(false) : undefined;
	    var publicComponentInstance = component.getPublicInstance();
	    if (false) {
	      var componentName = component && component.getName ? component.getName() : 'a component';
	      process.env.NODE_ENV !== 'production' ? warning(publicComponentInstance != null, 'Stateless function components cannot be given refs ' + '(See ref "%s" in %s created by %s). ' + 'Attempts to access this ref will fail.', ref, componentName, this.getName()) : undefined;
	    }
	    var refs = inst.refs === emptyObject ? inst.refs = {} : inst.refs;
	    refs[ref] = publicComponentInstance;
	  },

	  /**
	   * Detaches a reference name.
	   *
	   * @param {string} ref Name to dereference.
	   * @final
	   * @private
	   */
	  detachRef: function (ref) {
	    var refs = this.getPublicInstance().refs;
	    delete refs[ref];
	  },

	  /**
	   * Get a text description of the component that can be used to identify it
	   * in error messages.
	   * @return {string} The name or null.
	   * @internal
	   */
	  getName: function () {
	    var type = this._currentElement.type;
	    var constructor = this._instance && this._instance.constructor;
	    return type.displayName || constructor && constructor.displayName || type.name || constructor && constructor.name || null;
	  },

	  /**
	   * Get the publicly accessible representation of this component - i.e. what
	   * is exposed by refs and returned by render. Can be null for stateless
	   * components.
	   *
	   * @return {ReactComponent} the public component instance.
	   * @internal
	   */
	  getPublicInstance: function () {
	    var inst = this._instance;
	    if (inst instanceof StatelessComponent) {
	      return null;
	    }
	    return inst;
	  },

	  // Stub
	  _instantiateReactComponent: null

	};

	ReactPerf.measureMethods(ReactCompositeComponentMixin, 'ReactCompositeComponent', {
	  mountComponent: 'mountComponent',
	  updateComponent: 'updateComponent',
	  _renderValidatedComponent: '_renderValidatedComponent'
	});

	var ReactCompositeComponent = {

	  Mixin: ReactCompositeComponentMixin

	};

	module.exports = ReactCompositeComponent;

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactComponentEnvironment
	 */

	'use strict';

	var invariant = __webpack_require__(13);

	var injected = false;

	var ReactComponentEnvironment = {

	  /**
	   * Optionally injectable environment dependent cleanup hook. (server vs.
	   * browser etc). Example: A browser system caches DOM nodes based on component
	   * ID and must remove that cache entry when this instance is unmounted.
	   */
	  unmountIDFromEnvironment: null,

	  /**
	   * Optionally injectable hook for swapping out mount images in the middle of
	   * the tree.
	   */
	  replaceNodeWithMarkupByID: null,

	  /**
	   * Optionally injectable hook for processing a queue of child updates. Will
	   * later move into MultiChildComponents.
	   */
	  processChildrenUpdates: null,

	  injection: {
	    injectEnvironment: function (environment) {
	      !!injected ?  false ? invariant(false, 'ReactCompositeComponent: injectEnvironment() can only be called once.') : invariant(false) : undefined;
	      ReactComponentEnvironment.unmountIDFromEnvironment = environment.unmountIDFromEnvironment;
	      ReactComponentEnvironment.replaceNodeWithMarkupByID = environment.replaceNodeWithMarkupByID;
	      ReactComponentEnvironment.processChildrenUpdates = environment.processChildrenUpdates;
	      injected = true;
	    }
	  }

	};

	module.exports = ReactComponentEnvironment;

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactPropTypeLocations
	 */

	'use strict';

	var keyMirror = __webpack_require__(17);

	var ReactPropTypeLocations = keyMirror({
	  prop: null,
	  context: null,
	  childContext: null
	});

	module.exports = ReactPropTypeLocations;

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactPropTypeLocationNames
	 */

	'use strict';

	var ReactPropTypeLocationNames = {};

	if (false) {
	  ReactPropTypeLocationNames = {
	    prop: 'prop',
	    context: 'context',
	    childContext: 'child context'
	  };
	}

	module.exports = ReactPropTypeLocationNames;

/***/ },
/* 67 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule shouldUpdateReactComponent
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Given a `prevElement` and `nextElement`, determines if the existing
	 * instance should be updated as opposed to being destroyed or replaced by a new
	 * instance. Both arguments are elements. This ensures that this logic can
	 * operate on stateless trees without any backing instance.
	 *
	 * @param {?object} prevElement
	 * @param {?object} nextElement
	 * @return {boolean} True if the existing instance should be updated.
	 * @protected
	 */
	function shouldUpdateReactComponent(prevElement, nextElement) {
	  var prevEmpty = prevElement === null || prevElement === false;
	  var nextEmpty = nextElement === null || nextElement === false;
	  if (prevEmpty || nextEmpty) {
	    return prevEmpty === nextEmpty;
	  }

	  var prevType = typeof prevElement;
	  var nextType = typeof nextElement;
	  if (prevType === 'string' || prevType === 'number') {
	    return nextType === 'string' || nextType === 'number';
	  } else {
	    return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
	  }
	  return false;
	}

	module.exports = shouldUpdateReactComponent;

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactEmptyComponent
	 */

	'use strict';

	var ReactElement = __webpack_require__(42);
	var ReactEmptyComponentRegistry = __webpack_require__(44);
	var ReactReconciler = __webpack_require__(50);

	var assign = __webpack_require__(39);

	var placeholderElement;

	var ReactEmptyComponentInjection = {
	  injectEmptyComponent: function (component) {
	    placeholderElement = ReactElement.createElement(component);
	  }
	};

	var ReactEmptyComponent = function (instantiate) {
	  this._currentElement = null;
	  this._rootNodeID = null;
	  this._renderedComponent = instantiate(placeholderElement);
	};
	assign(ReactEmptyComponent.prototype, {
	  construct: function (element) {},
	  mountComponent: function (rootID, transaction, context) {
	    ReactEmptyComponentRegistry.registerNullComponentID(rootID);
	    this._rootNodeID = rootID;
	    return ReactReconciler.mountComponent(this._renderedComponent, rootID, transaction, context);
	  },
	  receiveComponent: function () {},
	  unmountComponent: function (rootID, transaction, context) {
	    ReactReconciler.unmountComponent(this._renderedComponent);
	    ReactEmptyComponentRegistry.deregisterNullComponentID(this._rootNodeID);
	    this._rootNodeID = null;
	    this._renderedComponent = null;
	  }
	});

	ReactEmptyComponent.injection = ReactEmptyComponentInjection;

	module.exports = ReactEmptyComponent;

/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactNativeComponent
	 */

	'use strict';

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);

	var autoGenerateWrapperClass = null;
	var genericComponentClass = null;
	// This registry keeps track of wrapper classes around native tags.
	var tagToComponentClass = {};
	var textComponentClass = null;

	var ReactNativeComponentInjection = {
	  // This accepts a class that receives the tag string. This is a catch all
	  // that can render any kind of tag.
	  injectGenericComponentClass: function (componentClass) {
	    genericComponentClass = componentClass;
	  },
	  // This accepts a text component class that takes the text string to be
	  // rendered as props.
	  injectTextComponentClass: function (componentClass) {
	    textComponentClass = componentClass;
	  },
	  // This accepts a keyed object with classes as values. Each key represents a
	  // tag. That particular tag will use this class instead of the generic one.
	  injectComponentClasses: function (componentClasses) {
	    assign(tagToComponentClass, componentClasses);
	  }
	};

	/**
	 * Get a composite component wrapper class for a specific tag.
	 *
	 * @param {ReactElement} element The tag for which to get the class.
	 * @return {function} The React class constructor function.
	 */
	function getComponentClassForElement(element) {
	  if (typeof element.type === 'function') {
	    return element.type;
	  }
	  var tag = element.type;
	  var componentClass = tagToComponentClass[tag];
	  if (componentClass == null) {
	    tagToComponentClass[tag] = componentClass = autoGenerateWrapperClass(tag);
	  }
	  return componentClass;
	}

	/**
	 * Get a native internal component class for a specific tag.
	 *
	 * @param {ReactElement} element The element to create.
	 * @return {function} The internal class constructor function.
	 */
	function createInternalComponent(element) {
	  !genericComponentClass ?  false ? invariant(false, 'There is no registered component for the tag %s', element.type) : invariant(false) : undefined;
	  return new genericComponentClass(element.type, element.props);
	}

	/**
	 * @param {ReactText} text
	 * @return {ReactComponent}
	 */
	function createInstanceForText(text) {
	  return new textComponentClass(text);
	}

	/**
	 * @param {ReactComponent} component
	 * @return {boolean}
	 */
	function isTextComponent(component) {
	  return component instanceof textComponentClass;
	}

	var ReactNativeComponent = {
	  getComponentClassForElement: getComponentClassForElement,
	  createInternalComponent: createInternalComponent,
	  createInstanceForText: createInstanceForText,
	  isTextComponent: isTextComponent,
	  injection: ReactNativeComponentInjection
	};

	module.exports = ReactNativeComponent;

/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule validateDOMNesting
	 */

	'use strict';

	var assign = __webpack_require__(39);
	var emptyFunction = __webpack_require__(15);
	var warning = __webpack_require__(25);

	var validateDOMNesting = emptyFunction;

	if (false) {
	  // This validation code was written based on the HTML5 parsing spec:
	  // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
	  //
	  // Note: this does not catch all invalid nesting, nor does it try to (as it's
	  // not clear what practical benefit doing so provides); instead, we warn only
	  // for cases where the parser will give a parse tree differing from what React
	  // intended. For example, <b><div></div></b> is invalid but we don't warn
	  // because it still parses correctly; we do warn for other cases like nested
	  // <p> tags where the beginning of the second element implicitly closes the
	  // first, causing a confusing mess.

	  // https://html.spec.whatwg.org/multipage/syntax.html#special
	  var specialTags = ['address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound', 'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input', 'isindex', 'li', 'link', 'listing', 'main', 'marquee', 'menu', 'menuitem', 'meta', 'nav', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext', 'pre', 'script', 'section', 'select', 'source', 'style', 'summary', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul', 'wbr', 'xmp'];

	  // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
	  var inScopeTags = ['applet', 'caption', 'html', 'table', 'td', 'th', 'marquee', 'object', 'template',

	  // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
	  // TODO: Distinguish by namespace here -- for <title>, including it here
	  // errs on the side of fewer warnings
	  'foreignObject', 'desc', 'title'];

	  // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
	  var buttonScopeTags = inScopeTags.concat(['button']);

	  // https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
	  var impliedEndTags = ['dd', 'dt', 'li', 'option', 'optgroup', 'p', 'rp', 'rt'];

	  var emptyAncestorInfo = {
	    parentTag: null,

	    formTag: null,
	    aTagInScope: null,
	    buttonTagInScope: null,
	    nobrTagInScope: null,
	    pTagInButtonScope: null,

	    listItemTagAutoclosing: null,
	    dlItemTagAutoclosing: null
	  };

	  var updatedAncestorInfo = function (oldInfo, tag, instance) {
	    var ancestorInfo = assign({}, oldInfo || emptyAncestorInfo);
	    var info = { tag: tag, instance: instance };

	    if (inScopeTags.indexOf(tag) !== -1) {
	      ancestorInfo.aTagInScope = null;
	      ancestorInfo.buttonTagInScope = null;
	      ancestorInfo.nobrTagInScope = null;
	    }
	    if (buttonScopeTags.indexOf(tag) !== -1) {
	      ancestorInfo.pTagInButtonScope = null;
	    }

	    // See rules for 'li', 'dd', 'dt' start tags in
	    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
	    if (specialTags.indexOf(tag) !== -1 && tag !== 'address' && tag !== 'div' && tag !== 'p') {
	      ancestorInfo.listItemTagAutoclosing = null;
	      ancestorInfo.dlItemTagAutoclosing = null;
	    }

	    ancestorInfo.parentTag = info;

	    if (tag === 'form') {
	      ancestorInfo.formTag = info;
	    }
	    if (tag === 'a') {
	      ancestorInfo.aTagInScope = info;
	    }
	    if (tag === 'button') {
	      ancestorInfo.buttonTagInScope = info;
	    }
	    if (tag === 'nobr') {
	      ancestorInfo.nobrTagInScope = info;
	    }
	    if (tag === 'p') {
	      ancestorInfo.pTagInButtonScope = info;
	    }
	    if (tag === 'li') {
	      ancestorInfo.listItemTagAutoclosing = info;
	    }
	    if (tag === 'dd' || tag === 'dt') {
	      ancestorInfo.dlItemTagAutoclosing = info;
	    }

	    return ancestorInfo;
	  };

	  /**
	   * Returns whether
	   */
	  var isTagValidWithParent = function (tag, parentTag) {
	    // First, let's check if we're in an unusual parsing mode...
	    switch (parentTag) {
	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
	      case 'select':
	        return tag === 'option' || tag === 'optgroup' || tag === '#text';
	      case 'optgroup':
	        return tag === 'option' || tag === '#text';
	      // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
	      // but
	      case 'option':
	        return tag === '#text';

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
	      // No special behavior since these rules fall back to "in body" mode for
	      // all except special table nodes which cause bad parsing behavior anyway.

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
	      case 'tr':
	        return tag === 'th' || tag === 'td' || tag === 'style' || tag === 'script' || tag === 'template';

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
	      case 'tbody':
	      case 'thead':
	      case 'tfoot':
	        return tag === 'tr' || tag === 'style' || tag === 'script' || tag === 'template';

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
	      case 'colgroup':
	        return tag === 'col' || tag === 'template';

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
	      case 'table':
	        return tag === 'caption' || tag === 'colgroup' || tag === 'tbody' || tag === 'tfoot' || tag === 'thead' || tag === 'style' || tag === 'script' || tag === 'template';

	      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
	      case 'head':
	        return tag === 'base' || tag === 'basefont' || tag === 'bgsound' || tag === 'link' || tag === 'meta' || tag === 'title' || tag === 'noscript' || tag === 'noframes' || tag === 'style' || tag === 'script' || tag === 'template';

	      // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
	      case 'html':
	        return tag === 'head' || tag === 'body';
	    }

	    // Probably in the "in body" parsing mode, so we outlaw only tag combos
	    // where the parsing rules cause implicit opens or closes to be added.
	    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
	    switch (tag) {
	      case 'h1':
	      case 'h2':
	      case 'h3':
	      case 'h4':
	      case 'h5':
	      case 'h6':
	        return parentTag !== 'h1' && parentTag !== 'h2' && parentTag !== 'h3' && parentTag !== 'h4' && parentTag !== 'h5' && parentTag !== 'h6';

	      case 'rp':
	      case 'rt':
	        return impliedEndTags.indexOf(parentTag) === -1;

	      case 'caption':
	      case 'col':
	      case 'colgroup':
	      case 'frame':
	      case 'head':
	      case 'tbody':
	      case 'td':
	      case 'tfoot':
	      case 'th':
	      case 'thead':
	      case 'tr':
	        // These tags are only valid with a few parents that have special child
	        // parsing rules -- if we're down here, then none of those matched and
	        // so we allow it only if we don't know what the parent is, as all other
	        // cases are invalid.
	        return parentTag == null;
	    }

	    return true;
	  };

	  /**
	   * Returns whether
	   */
	  var findInvalidAncestorForTag = function (tag, ancestorInfo) {
	    switch (tag) {
	      case 'address':
	      case 'article':
	      case 'aside':
	      case 'blockquote':
	      case 'center':
	      case 'details':
	      case 'dialog':
	      case 'dir':
	      case 'div':
	      case 'dl':
	      case 'fieldset':
	      case 'figcaption':
	      case 'figure':
	      case 'footer':
	      case 'header':
	      case 'hgroup':
	      case 'main':
	      case 'menu':
	      case 'nav':
	      case 'ol':
	      case 'p':
	      case 'section':
	      case 'summary':
	      case 'ul':

	      case 'pre':
	      case 'listing':

	      case 'table':

	      case 'hr':

	      case 'xmp':

	      case 'h1':
	      case 'h2':
	      case 'h3':
	      case 'h4':
	      case 'h5':
	      case 'h6':
	        return ancestorInfo.pTagInButtonScope;

	      case 'form':
	        return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

	      case 'li':
	        return ancestorInfo.listItemTagAutoclosing;

	      case 'dd':
	      case 'dt':
	        return ancestorInfo.dlItemTagAutoclosing;

	      case 'button':
	        return ancestorInfo.buttonTagInScope;

	      case 'a':
	        // Spec says something about storing a list of markers, but it sounds
	        // equivalent to this check.
	        return ancestorInfo.aTagInScope;

	      case 'nobr':
	        return ancestorInfo.nobrTagInScope;
	    }

	    return null;
	  };

	  /**
	   * Given a ReactCompositeComponent instance, return a list of its recursive
	   * owners, starting at the root and ending with the instance itself.
	   */
	  var findOwnerStack = function (instance) {
	    if (!instance) {
	      return [];
	    }

	    var stack = [];
	    /*eslint-disable space-after-keywords */
	    do {
	      /*eslint-enable space-after-keywords */
	      stack.push(instance);
	    } while (instance = instance._currentElement._owner);
	    stack.reverse();
	    return stack;
	  };

	  var didWarn = {};

	  validateDOMNesting = function (childTag, childInstance, ancestorInfo) {
	    ancestorInfo = ancestorInfo || emptyAncestorInfo;
	    var parentInfo = ancestorInfo.parentTag;
	    var parentTag = parentInfo && parentInfo.tag;

	    var invalidParent = isTagValidWithParent(childTag, parentTag) ? null : parentInfo;
	    var invalidAncestor = invalidParent ? null : findInvalidAncestorForTag(childTag, ancestorInfo);
	    var problematic = invalidParent || invalidAncestor;

	    if (problematic) {
	      var ancestorTag = problematic.tag;
	      var ancestorInstance = problematic.instance;

	      var childOwner = childInstance && childInstance._currentElement._owner;
	      var ancestorOwner = ancestorInstance && ancestorInstance._currentElement._owner;

	      var childOwners = findOwnerStack(childOwner);
	      var ancestorOwners = findOwnerStack(ancestorOwner);

	      var minStackLen = Math.min(childOwners.length, ancestorOwners.length);
	      var i;

	      var deepestCommon = -1;
	      for (i = 0; i < minStackLen; i++) {
	        if (childOwners[i] === ancestorOwners[i]) {
	          deepestCommon = i;
	        } else {
	          break;
	        }
	      }

	      var UNKNOWN = '(unknown)';
	      var childOwnerNames = childOwners.slice(deepestCommon + 1).map(function (inst) {
	        return inst.getName() || UNKNOWN;
	      });
	      var ancestorOwnerNames = ancestorOwners.slice(deepestCommon + 1).map(function (inst) {
	        return inst.getName() || UNKNOWN;
	      });
	      var ownerInfo = [].concat(
	      // If the parent and child instances have a common owner ancestor, start
	      // with that -- otherwise we just start with the parent's owners.
	      deepestCommon !== -1 ? childOwners[deepestCommon].getName() || UNKNOWN : [], ancestorOwnerNames, ancestorTag,
	      // If we're warning about an invalid (non-parent) ancestry, add '...'
	      invalidAncestor ? ['...'] : [], childOwnerNames, childTag).join(' > ');

	      var warnKey = !!invalidParent + '|' + childTag + '|' + ancestorTag + '|' + ownerInfo;
	      if (didWarn[warnKey]) {
	        return;
	      }
	      didWarn[warnKey] = true;

	      if (invalidParent) {
	        var info = '';
	        if (ancestorTag === 'table' && childTag === 'tr') {
	          info += ' Add a <tbody> to your code to match the DOM tree generated by ' + 'the browser.';
	        }
	        process.env.NODE_ENV !== 'production' ? warning(false, 'validateDOMNesting(...): <%s> cannot appear as a child of <%s>. ' + 'See %s.%s', childTag, ancestorTag, ownerInfo, info) : undefined;
	      } else {
	        process.env.NODE_ENV !== 'production' ? warning(false, 'validateDOMNesting(...): <%s> cannot appear as a descendant of ' + '<%s>. See %s.', childTag, ancestorTag, ownerInfo) : undefined;
	      }
	    }
	  };

	  validateDOMNesting.ancestorInfoContextKey = '__validateDOMNesting_ancestorInfo$' + Math.random().toString(36).slice(2);

	  validateDOMNesting.updatedAncestorInfo = updatedAncestorInfo;

	  // For testing
	  validateDOMNesting.isTagValidInContext = function (tag, ancestorInfo) {
	    ancestorInfo = ancestorInfo || emptyAncestorInfo;
	    var parentInfo = ancestorInfo.parentTag;
	    var parentTag = parentInfo && parentInfo.tag;
	    return isTagValidWithParent(tag, parentTag) && !findInvalidAncestorForTag(tag, ancestorInfo);
	  };
	}

	module.exports = validateDOMNesting;

/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDefaultInjection
	 */

	'use strict';

	var BeforeInputEventPlugin = __webpack_require__(72);
	var ChangeEventPlugin = __webpack_require__(80);
	var ClientReactRootIndex = __webpack_require__(83);
	var DefaultEventPluginOrder = __webpack_require__(84);
	var EnterLeaveEventPlugin = __webpack_require__(85);
	var ExecutionEnvironment = __webpack_require__(9);
	var HTMLDOMPropertyConfig = __webpack_require__(89);
	var ReactBrowserComponentMixin = __webpack_require__(90);
	var ReactComponentBrowserEnvironment = __webpack_require__(26);
	var ReactDefaultBatchingStrategy = __webpack_require__(92);
	var ReactDOMComponent = __webpack_require__(93);
	var ReactDOMTextComponent = __webpack_require__(6);
	var ReactEventListener = __webpack_require__(118);
	var ReactInjection = __webpack_require__(121);
	var ReactInstanceHandles = __webpack_require__(45);
	var ReactMount = __webpack_require__(28);
	var ReactReconcileTransaction = __webpack_require__(125);
	var SelectEventPlugin = __webpack_require__(130);
	var ServerReactRootIndex = __webpack_require__(131);
	var SimpleEventPlugin = __webpack_require__(132);
	var SVGDOMPropertyConfig = __webpack_require__(141);

	var alreadyInjected = false;

	function inject() {
	  if (alreadyInjected) {
	    // TODO: This is currently true because these injections are shared between
	    // the client and the server package. They should be built independently
	    // and not share any injection state. Then this problem will be solved.
	    return;
	  }
	  alreadyInjected = true;

	  ReactInjection.EventEmitter.injectReactEventListener(ReactEventListener);

	  /**
	   * Inject modules for resolving DOM hierarchy and plugin ordering.
	   */
	  ReactInjection.EventPluginHub.injectEventPluginOrder(DefaultEventPluginOrder);
	  ReactInjection.EventPluginHub.injectInstanceHandle(ReactInstanceHandles);
	  ReactInjection.EventPluginHub.injectMount(ReactMount);

	  /**
	   * Some important event plugins included by default (without having to require
	   * them).
	   */
	  ReactInjection.EventPluginHub.injectEventPluginsByName({
	    SimpleEventPlugin: SimpleEventPlugin,
	    EnterLeaveEventPlugin: EnterLeaveEventPlugin,
	    ChangeEventPlugin: ChangeEventPlugin,
	    SelectEventPlugin: SelectEventPlugin,
	    BeforeInputEventPlugin: BeforeInputEventPlugin
	  });

	  ReactInjection.NativeComponent.injectGenericComponentClass(ReactDOMComponent);

	  ReactInjection.NativeComponent.injectTextComponentClass(ReactDOMTextComponent);

	  ReactInjection.Class.injectMixin(ReactBrowserComponentMixin);

	  ReactInjection.DOMProperty.injectDOMPropertyConfig(HTMLDOMPropertyConfig);
	  ReactInjection.DOMProperty.injectDOMPropertyConfig(SVGDOMPropertyConfig);

	  ReactInjection.EmptyComponent.injectEmptyComponent('noscript');

	  ReactInjection.Updates.injectReconcileTransaction(ReactReconcileTransaction);
	  ReactInjection.Updates.injectBatchingStrategy(ReactDefaultBatchingStrategy);

	  ReactInjection.RootIndex.injectCreateReactRootIndex(ExecutionEnvironment.canUseDOM ? ClientReactRootIndex.createReactRootIndex : ServerReactRootIndex.createReactRootIndex);

	  ReactInjection.Component.injectEnvironment(ReactComponentBrowserEnvironment);

	  if (false) {
	    var url = ExecutionEnvironment.canUseDOM && window.location.href || '';
	    if (/[?&]react_perf\b/.test(url)) {
	      var ReactDefaultPerf = require('./ReactDefaultPerf');
	      ReactDefaultPerf.start();
	    }
	  }
	}

	module.exports = {
	  inject: inject
	};

/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015 Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule BeforeInputEventPlugin
	 * @typechecks static-only
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPropagators = __webpack_require__(73);
	var ExecutionEnvironment = __webpack_require__(9);
	var FallbackCompositionState = __webpack_require__(74);
	var SyntheticCompositionEvent = __webpack_require__(76);
	var SyntheticInputEvent = __webpack_require__(78);

	var keyOf = __webpack_require__(79);

	var END_KEYCODES = [9, 13, 27, 32]; // Tab, Return, Esc, Space
	var START_KEYCODE = 229;

	var canUseCompositionEvent = ExecutionEnvironment.canUseDOM && 'CompositionEvent' in window;

	var documentMode = null;
	if (ExecutionEnvironment.canUseDOM && 'documentMode' in document) {
	  documentMode = document.documentMode;
	}

	// Webkit offers a very useful `textInput` event that can be used to
	// directly represent `beforeInput`. The IE `textinput` event is not as
	// useful, so we don't use it.
	var canUseTextInputEvent = ExecutionEnvironment.canUseDOM && 'TextEvent' in window && !documentMode && !isPresto();

	// In IE9+, we have access to composition events, but the data supplied
	// by the native compositionend event may be incorrect. Japanese ideographic
	// spaces, for instance (\u3000) are not recorded correctly.
	var useFallbackCompositionData = ExecutionEnvironment.canUseDOM && (!canUseCompositionEvent || documentMode && documentMode > 8 && documentMode <= 11);

	/**
	 * Opera <= 12 includes TextEvent in window, but does not fire
	 * text input events. Rely on keypress instead.
	 */
	function isPresto() {
	  var opera = window.opera;
	  return typeof opera === 'object' && typeof opera.version === 'function' && parseInt(opera.version(), 10) <= 12;
	}

	var SPACEBAR_CODE = 32;
	var SPACEBAR_CHAR = String.fromCharCode(SPACEBAR_CODE);

	var topLevelTypes = EventConstants.topLevelTypes;

	// Events and their corresponding property names.
	var eventTypes = {
	  beforeInput: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onBeforeInput: null }),
	      captured: keyOf({ onBeforeInputCapture: null })
	    },
	    dependencies: [topLevelTypes.topCompositionEnd, topLevelTypes.topKeyPress, topLevelTypes.topTextInput, topLevelTypes.topPaste]
	  },
	  compositionEnd: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCompositionEnd: null }),
	      captured: keyOf({ onCompositionEndCapture: null })
	    },
	    dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionEnd, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
	  },
	  compositionStart: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCompositionStart: null }),
	      captured: keyOf({ onCompositionStartCapture: null })
	    },
	    dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionStart, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
	  },
	  compositionUpdate: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCompositionUpdate: null }),
	      captured: keyOf({ onCompositionUpdateCapture: null })
	    },
	    dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionUpdate, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
	  }
	};

	// Track whether we've ever handled a keypress on the space key.
	var hasSpaceKeypress = false;

	/**
	 * Return whether a native keypress event is assumed to be a command.
	 * This is required because Firefox fires `keypress` events for key commands
	 * (cut, copy, select-all, etc.) even though no character is inserted.
	 */
	function isKeypressCommand(nativeEvent) {
	  return (nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) &&
	  // ctrlKey && altKey is equivalent to AltGr, and is not a command.
	  !(nativeEvent.ctrlKey && nativeEvent.altKey);
	}

	/**
	 * Translate native top level events into event types.
	 *
	 * @param {string} topLevelType
	 * @return {object}
	 */
	function getCompositionEventType(topLevelType) {
	  switch (topLevelType) {
	    case topLevelTypes.topCompositionStart:
	      return eventTypes.compositionStart;
	    case topLevelTypes.topCompositionEnd:
	      return eventTypes.compositionEnd;
	    case topLevelTypes.topCompositionUpdate:
	      return eventTypes.compositionUpdate;
	  }
	}

	/**
	 * Does our fallback best-guess model think this event signifies that
	 * composition has begun?
	 *
	 * @param {string} topLevelType
	 * @param {object} nativeEvent
	 * @return {boolean}
	 */
	function isFallbackCompositionStart(topLevelType, nativeEvent) {
	  return topLevelType === topLevelTypes.topKeyDown && nativeEvent.keyCode === START_KEYCODE;
	}

	/**
	 * Does our fallback mode think that this event is the end of composition?
	 *
	 * @param {string} topLevelType
	 * @param {object} nativeEvent
	 * @return {boolean}
	 */
	function isFallbackCompositionEnd(topLevelType, nativeEvent) {
	  switch (topLevelType) {
	    case topLevelTypes.topKeyUp:
	      // Command keys insert or clear IME input.
	      return END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1;
	    case topLevelTypes.topKeyDown:
	      // Expect IME keyCode on each keydown. If we get any other
	      // code we must have exited earlier.
	      return nativeEvent.keyCode !== START_KEYCODE;
	    case topLevelTypes.topKeyPress:
	    case topLevelTypes.topMouseDown:
	    case topLevelTypes.topBlur:
	      // Events are not possible without cancelling IME.
	      return true;
	    default:
	      return false;
	  }
	}

	/**
	 * Google Input Tools provides composition data via a CustomEvent,
	 * with the `data` property populated in the `detail` object. If this
	 * is available on the event object, use it. If not, this is a plain
	 * composition event and we have nothing special to extract.
	 *
	 * @param {object} nativeEvent
	 * @return {?string}
	 */
	function getDataFromCustomEvent(nativeEvent) {
	  var detail = nativeEvent.detail;
	  if (typeof detail === 'object' && 'data' in detail) {
	    return detail.data;
	  }
	  return null;
	}

	// Track the current IME composition fallback object, if any.
	var currentComposition = null;

	/**
	 * @param {string} topLevelType Record from `EventConstants`.
	 * @param {DOMEventTarget} topLevelTarget The listening component root node.
	 * @param {string} topLevelTargetID ID of `topLevelTarget`.
	 * @param {object} nativeEvent Native browser event.
	 * @return {?object} A SyntheticCompositionEvent.
	 */
	function extractCompositionEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	  var eventType;
	  var fallbackData;

	  if (canUseCompositionEvent) {
	    eventType = getCompositionEventType(topLevelType);
	  } else if (!currentComposition) {
	    if (isFallbackCompositionStart(topLevelType, nativeEvent)) {
	      eventType = eventTypes.compositionStart;
	    }
	  } else if (isFallbackCompositionEnd(topLevelType, nativeEvent)) {
	    eventType = eventTypes.compositionEnd;
	  }

	  if (!eventType) {
	    return null;
	  }

	  if (useFallbackCompositionData) {
	    // The current composition is stored statically and must not be
	    // overwritten while composition continues.
	    if (!currentComposition && eventType === eventTypes.compositionStart) {
	      currentComposition = FallbackCompositionState.getPooled(topLevelTarget);
	    } else if (eventType === eventTypes.compositionEnd) {
	      if (currentComposition) {
	        fallbackData = currentComposition.getData();
	      }
	    }
	  }

	  var event = SyntheticCompositionEvent.getPooled(eventType, topLevelTargetID, nativeEvent, nativeEventTarget);

	  if (fallbackData) {
	    // Inject data generated from fallback path into the synthetic event.
	    // This matches the property of native CompositionEventInterface.
	    event.data = fallbackData;
	  } else {
	    var customData = getDataFromCustomEvent(nativeEvent);
	    if (customData !== null) {
	      event.data = customData;
	    }
	  }

	  EventPropagators.accumulateTwoPhaseDispatches(event);
	  return event;
	}

	/**
	 * @param {string} topLevelType Record from `EventConstants`.
	 * @param {object} nativeEvent Native browser event.
	 * @return {?string} The string corresponding to this `beforeInput` event.
	 */
	function getNativeBeforeInputChars(topLevelType, nativeEvent) {
	  switch (topLevelType) {
	    case topLevelTypes.topCompositionEnd:
	      return getDataFromCustomEvent(nativeEvent);
	    case topLevelTypes.topKeyPress:
	      /**
	       * If native `textInput` events are available, our goal is to make
	       * use of them. However, there is a special case: the spacebar key.
	       * In Webkit, preventing default on a spacebar `textInput` event
	       * cancels character insertion, but it *also* causes the browser
	       * to fall back to its default spacebar behavior of scrolling the
	       * page.
	       *
	       * Tracking at:
	       * https://code.google.com/p/chromium/issues/detail?id=355103
	       *
	       * To avoid this issue, use the keypress event as if no `textInput`
	       * event is available.
	       */
	      var which = nativeEvent.which;
	      if (which !== SPACEBAR_CODE) {
	        return null;
	      }

	      hasSpaceKeypress = true;
	      return SPACEBAR_CHAR;

	    case topLevelTypes.topTextInput:
	      // Record the characters to be added to the DOM.
	      var chars = nativeEvent.data;

	      // If it's a spacebar character, assume that we have already handled
	      // it at the keypress level and bail immediately. Android Chrome
	      // doesn't give us keycodes, so we need to blacklist it.
	      if (chars === SPACEBAR_CHAR && hasSpaceKeypress) {
	        return null;
	      }

	      return chars;

	    default:
	      // For other native event types, do nothing.
	      return null;
	  }
	}

	/**
	 * For browsers that do not provide the `textInput` event, extract the
	 * appropriate string to use for SyntheticInputEvent.
	 *
	 * @param {string} topLevelType Record from `EventConstants`.
	 * @param {object} nativeEvent Native browser event.
	 * @return {?string} The fallback string for this `beforeInput` event.
	 */
	function getFallbackBeforeInputChars(topLevelType, nativeEvent) {
	  // If we are currently composing (IME) and using a fallback to do so,
	  // try to extract the composed characters from the fallback object.
	  if (currentComposition) {
	    if (topLevelType === topLevelTypes.topCompositionEnd || isFallbackCompositionEnd(topLevelType, nativeEvent)) {
	      var chars = currentComposition.getData();
	      FallbackCompositionState.release(currentComposition);
	      currentComposition = null;
	      return chars;
	    }
	    return null;
	  }

	  switch (topLevelType) {
	    case topLevelTypes.topPaste:
	      // If a paste event occurs after a keypress, throw out the input
	      // chars. Paste events should not lead to BeforeInput events.
	      return null;
	    case topLevelTypes.topKeyPress:
	      /**
	       * As of v27, Firefox may fire keypress events even when no character
	       * will be inserted. A few possibilities:
	       *
	       * - `which` is `0`. Arrow keys, Esc key, etc.
	       *
	       * - `which` is the pressed key code, but no char is available.
	       *   Ex: 'AltGr + d` in Polish. There is no modified character for
	       *   this key combination and no character is inserted into the
	       *   document, but FF fires the keypress for char code `100` anyway.
	       *   No `input` event will occur.
	       *
	       * - `which` is the pressed key code, but a command combination is
	       *   being used. Ex: `Cmd+C`. No character is inserted, and no
	       *   `input` event will occur.
	       */
	      if (nativeEvent.which && !isKeypressCommand(nativeEvent)) {
	        return String.fromCharCode(nativeEvent.which);
	      }
	      return null;
	    case topLevelTypes.topCompositionEnd:
	      return useFallbackCompositionData ? null : nativeEvent.data;
	    default:
	      return null;
	  }
	}

	/**
	 * Extract a SyntheticInputEvent for `beforeInput`, based on either native
	 * `textInput` or fallback behavior.
	 *
	 * @param {string} topLevelType Record from `EventConstants`.
	 * @param {DOMEventTarget} topLevelTarget The listening component root node.
	 * @param {string} topLevelTargetID ID of `topLevelTarget`.
	 * @param {object} nativeEvent Native browser event.
	 * @return {?object} A SyntheticInputEvent.
	 */
	function extractBeforeInputEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	  var chars;

	  if (canUseTextInputEvent) {
	    chars = getNativeBeforeInputChars(topLevelType, nativeEvent);
	  } else {
	    chars = getFallbackBeforeInputChars(topLevelType, nativeEvent);
	  }

	  // If no characters are being inserted, no BeforeInput event should
	  // be fired.
	  if (!chars) {
	    return null;
	  }

	  var event = SyntheticInputEvent.getPooled(eventTypes.beforeInput, topLevelTargetID, nativeEvent, nativeEventTarget);

	  event.data = chars;
	  EventPropagators.accumulateTwoPhaseDispatches(event);
	  return event;
	}

	/**
	 * Create an `onBeforeInput` event to match
	 * http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105/#events-inputevents.
	 *
	 * This event plugin is based on the native `textInput` event
	 * available in Chrome, Safari, Opera, and IE. This event fires after
	 * `onKeyPress` and `onCompositionEnd`, but before `onInput`.
	 *
	 * `beforeInput` is spec'd but not implemented in any browsers, and
	 * the `input` event does not provide any useful information about what has
	 * actually been added, contrary to the spec. Thus, `textInput` is the best
	 * available event to identify the characters that have actually been inserted
	 * into the target node.
	 *
	 * This plugin is also responsible for emitting `composition` events, thus
	 * allowing us to share composition fallback code for both `beforeInput` and
	 * `composition` event types.
	 */
	var BeforeInputEventPlugin = {

	  eventTypes: eventTypes,

	  /**
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @see {EventPluginHub.extractEvents}
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    return [extractCompositionEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget), extractBeforeInputEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget)];
	  }
	};

	module.exports = BeforeInputEventPlugin;

/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventPropagators
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPluginHub = __webpack_require__(31);

	var warning = __webpack_require__(25);

	var accumulateInto = __webpack_require__(35);
	var forEachAccumulated = __webpack_require__(36);

	var PropagationPhases = EventConstants.PropagationPhases;
	var getListener = EventPluginHub.getListener;

	/**
	 * Some event types have a notion of different registration names for different
	 * "phases" of propagation. This finds listeners by a given phase.
	 */
	function listenerAtPhase(id, event, propagationPhase) {
	  var registrationName = event.dispatchConfig.phasedRegistrationNames[propagationPhase];
	  return getListener(id, registrationName);
	}

	/**
	 * Tags a `SyntheticEvent` with dispatched listeners. Creating this function
	 * here, allows us to not have to bind or create functions for each event.
	 * Mutating the event's members allows us to not have to create a wrapping
	 * "dispatch" object that pairs the event with the listener.
	 */
	function accumulateDirectionalDispatches(domID, upwards, event) {
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(domID, 'Dispatching id must not be null') : undefined;
	  }
	  var phase = upwards ? PropagationPhases.bubbled : PropagationPhases.captured;
	  var listener = listenerAtPhase(domID, event, phase);
	  if (listener) {
	    event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
	    event._dispatchIDs = accumulateInto(event._dispatchIDs, domID);
	  }
	}

	/**
	 * Collect dispatches (must be entirely collected before dispatching - see unit
	 * tests). Lazily allocate the array to conserve memory.  We must loop through
	 * each event and perform the traversal for each one. We cannot perform a
	 * single traversal for the entire collection of events because each event may
	 * have a different target.
	 */
	function accumulateTwoPhaseDispatchesSingle(event) {
	  if (event && event.dispatchConfig.phasedRegistrationNames) {
	    EventPluginHub.injection.getInstanceHandle().traverseTwoPhase(event.dispatchMarker, accumulateDirectionalDispatches, event);
	  }
	}

	/**
	 * Same as `accumulateTwoPhaseDispatchesSingle`, but skips over the targetID.
	 */
	function accumulateTwoPhaseDispatchesSingleSkipTarget(event) {
	  if (event && event.dispatchConfig.phasedRegistrationNames) {
	    EventPluginHub.injection.getInstanceHandle().traverseTwoPhaseSkipTarget(event.dispatchMarker, accumulateDirectionalDispatches, event);
	  }
	}

	/**
	 * Accumulates without regard to direction, does not look for phased
	 * registration names. Same as `accumulateDirectDispatchesSingle` but without
	 * requiring that the `dispatchMarker` be the same as the dispatched ID.
	 */
	function accumulateDispatches(id, ignoredDirection, event) {
	  if (event && event.dispatchConfig.registrationName) {
	    var registrationName = event.dispatchConfig.registrationName;
	    var listener = getListener(id, registrationName);
	    if (listener) {
	      event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
	      event._dispatchIDs = accumulateInto(event._dispatchIDs, id);
	    }
	  }
	}

	/**
	 * Accumulates dispatches on an `SyntheticEvent`, but only for the
	 * `dispatchMarker`.
	 * @param {SyntheticEvent} event
	 */
	function accumulateDirectDispatchesSingle(event) {
	  if (event && event.dispatchConfig.registrationName) {
	    accumulateDispatches(event.dispatchMarker, null, event);
	  }
	}

	function accumulateTwoPhaseDispatches(events) {
	  forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle);
	}

	function accumulateTwoPhaseDispatchesSkipTarget(events) {
	  forEachAccumulated(events, accumulateTwoPhaseDispatchesSingleSkipTarget);
	}

	function accumulateEnterLeaveDispatches(leave, enter, fromID, toID) {
	  EventPluginHub.injection.getInstanceHandle().traverseEnterLeave(fromID, toID, accumulateDispatches, leave, enter);
	}

	function accumulateDirectDispatches(events) {
	  forEachAccumulated(events, accumulateDirectDispatchesSingle);
	}

	/**
	 * A small set of propagation patterns, each of which will accept a small amount
	 * of information, and generate a set of "dispatch ready event objects" - which
	 * are sets of events that have already been annotated with a set of dispatched
	 * listener functions/ids. The API is designed this way to discourage these
	 * propagation strategies from actually executing the dispatches, since we
	 * always want to collect the entire set of dispatches before executing event a
	 * single one.
	 *
	 * @constructor EventPropagators
	 */
	var EventPropagators = {
	  accumulateTwoPhaseDispatches: accumulateTwoPhaseDispatches,
	  accumulateTwoPhaseDispatchesSkipTarget: accumulateTwoPhaseDispatchesSkipTarget,
	  accumulateDirectDispatches: accumulateDirectDispatches,
	  accumulateEnterLeaveDispatches: accumulateEnterLeaveDispatches
	};

	module.exports = EventPropagators;

/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FallbackCompositionState
	 * @typechecks static-only
	 */

	'use strict';

	var PooledClass = __webpack_require__(56);

	var assign = __webpack_require__(39);
	var getTextContentAccessor = __webpack_require__(75);

	/**
	 * This helper class stores information about text content of a target node,
	 * allowing comparison of content before and after a given event.
	 *
	 * Identify the node where selection currently begins, then observe
	 * both its text content and its current position in the DOM. Since the
	 * browser may natively replace the target node during composition, we can
	 * use its position to find its replacement.
	 *
	 * @param {DOMEventTarget} root
	 */
	function FallbackCompositionState(root) {
	  this._root = root;
	  this._startText = this.getText();
	  this._fallbackText = null;
	}

	assign(FallbackCompositionState.prototype, {
	  destructor: function () {
	    this._root = null;
	    this._startText = null;
	    this._fallbackText = null;
	  },

	  /**
	   * Get current text of input.
	   *
	   * @return {string}
	   */
	  getText: function () {
	    if ('value' in this._root) {
	      return this._root.value;
	    }
	    return this._root[getTextContentAccessor()];
	  },

	  /**
	   * Determine the differing substring between the initially stored
	   * text content and the current content.
	   *
	   * @return {string}
	   */
	  getData: function () {
	    if (this._fallbackText) {
	      return this._fallbackText;
	    }

	    var start;
	    var startValue = this._startText;
	    var startLength = startValue.length;
	    var end;
	    var endValue = this.getText();
	    var endLength = endValue.length;

	    for (start = 0; start < startLength; start++) {
	      if (startValue[start] !== endValue[start]) {
	        break;
	      }
	    }

	    var minEnd = startLength - start;
	    for (end = 1; end <= minEnd; end++) {
	      if (startValue[startLength - end] !== endValue[endLength - end]) {
	        break;
	      }
	    }

	    var sliceTail = end > 1 ? 1 - end : undefined;
	    this._fallbackText = endValue.slice(start, sliceTail);
	    return this._fallbackText;
	  }
	});

	PooledClass.addPoolingTo(FallbackCompositionState);

	module.exports = FallbackCompositionState;

/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getTextContentAccessor
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var contentKey = null;

	/**
	 * Gets the key used to access text content on a DOM node.
	 *
	 * @return {?string} Key used to access text content.
	 * @internal
	 */
	function getTextContentAccessor() {
	  if (!contentKey && ExecutionEnvironment.canUseDOM) {
	    // Prefer textContent to innerText because many browsers support both but
	    // SVG <text> elements don't support innerText even when <div> does.
	    contentKey = 'textContent' in document.documentElement ? 'textContent' : 'innerText';
	  }
	  return contentKey;
	}

	module.exports = getTextContentAccessor;

/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticCompositionEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticEvent = __webpack_require__(77);

	/**
	 * @interface Event
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/#events-compositionevents
	 */
	var CompositionEventInterface = {
	  data: null
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticCompositionEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticEvent.augmentClass(SyntheticCompositionEvent, CompositionEventInterface);

	module.exports = SyntheticCompositionEvent;

/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticEvent
	 * @typechecks static-only
	 */

	'use strict';

	var PooledClass = __webpack_require__(56);

	var assign = __webpack_require__(39);
	var emptyFunction = __webpack_require__(15);
	var warning = __webpack_require__(25);

	/**
	 * @interface Event
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var EventInterface = {
	  type: null,
	  target: null,
	  // currentTarget is set when dispatching; no use in copying it here
	  currentTarget: emptyFunction.thatReturnsNull,
	  eventPhase: null,
	  bubbles: null,
	  cancelable: null,
	  timeStamp: function (event) {
	    return event.timeStamp || Date.now();
	  },
	  defaultPrevented: null,
	  isTrusted: null
	};

	/**
	 * Synthetic events are dispatched by event plugins, typically in response to a
	 * top-level event delegation handler.
	 *
	 * These systems should generally use pooling to reduce the frequency of garbage
	 * collection. The system should check `isPersistent` to determine whether the
	 * event should be released into the pool after being dispatched. Users that
	 * need a persisted event should invoke `persist`.
	 *
	 * Synthetic events (and subclasses) implement the DOM Level 3 Events API by
	 * normalizing browser quirks. Subclasses do not necessarily have to implement a
	 * DOM interface; custom application-specific events can also subclass this.
	 *
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 */
	function SyntheticEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  this.dispatchConfig = dispatchConfig;
	  this.dispatchMarker = dispatchMarker;
	  this.nativeEvent = nativeEvent;

	  var Interface = this.constructor.Interface;
	  for (var propName in Interface) {
	    if (!Interface.hasOwnProperty(propName)) {
	      continue;
	    }
	    var normalize = Interface[propName];
	    if (normalize) {
	      this[propName] = normalize(nativeEvent);
	    } else {
	      if (propName === 'target') {
	        this.target = nativeEventTarget;
	      } else {
	        this[propName] = nativeEvent[propName];
	      }
	    }
	  }

	  var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;
	  if (defaultPrevented) {
	    this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
	  } else {
	    this.isDefaultPrevented = emptyFunction.thatReturnsFalse;
	  }
	  this.isPropagationStopped = emptyFunction.thatReturnsFalse;
	}

	assign(SyntheticEvent.prototype, {

	  preventDefault: function () {
	    this.defaultPrevented = true;
	    var event = this.nativeEvent;
	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(event, 'This synthetic event is reused for performance reasons. If you\'re ' + 'seeing this, you\'re calling `preventDefault` on a ' + 'released/nullified synthetic event. This is a no-op. See ' + 'https://fb.me/react-event-pooling for more information.') : undefined;
	    }
	    if (!event) {
	      return;
	    }

	    if (event.preventDefault) {
	      event.preventDefault();
	    } else {
	      event.returnValue = false;
	    }
	    this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
	  },

	  stopPropagation: function () {
	    var event = this.nativeEvent;
	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(event, 'This synthetic event is reused for performance reasons. If you\'re ' + 'seeing this, you\'re calling `stopPropagation` on a ' + 'released/nullified synthetic event. This is a no-op. See ' + 'https://fb.me/react-event-pooling for more information.') : undefined;
	    }
	    if (!event) {
	      return;
	    }

	    if (event.stopPropagation) {
	      event.stopPropagation();
	    } else {
	      event.cancelBubble = true;
	    }
	    this.isPropagationStopped = emptyFunction.thatReturnsTrue;
	  },

	  /**
	   * We release all dispatched `SyntheticEvent`s after each event loop, adding
	   * them back into the pool. This allows a way to hold onto a reference that
	   * won't be added back into the pool.
	   */
	  persist: function () {
	    this.isPersistent = emptyFunction.thatReturnsTrue;
	  },

	  /**
	   * Checks if this event should be released back into the pool.
	   *
	   * @return {boolean} True if this should not be released, false otherwise.
	   */
	  isPersistent: emptyFunction.thatReturnsFalse,

	  /**
	   * `PooledClass` looks for `destructor` on each instance it releases.
	   */
	  destructor: function () {
	    var Interface = this.constructor.Interface;
	    for (var propName in Interface) {
	      this[propName] = null;
	    }
	    this.dispatchConfig = null;
	    this.dispatchMarker = null;
	    this.nativeEvent = null;
	  }

	});

	SyntheticEvent.Interface = EventInterface;

	/**
	 * Helper to reduce boilerplate when creating subclasses.
	 *
	 * @param {function} Class
	 * @param {?object} Interface
	 */
	SyntheticEvent.augmentClass = function (Class, Interface) {
	  var Super = this;

	  var prototype = Object.create(Super.prototype);
	  assign(prototype, Class.prototype);
	  Class.prototype = prototype;
	  Class.prototype.constructor = Class;

	  Class.Interface = assign({}, Super.Interface, Interface);
	  Class.augmentClass = Super.augmentClass;

	  PooledClass.addPoolingTo(Class, PooledClass.fourArgumentPooler);
	};

	PooledClass.addPoolingTo(SyntheticEvent, PooledClass.fourArgumentPooler);

	module.exports = SyntheticEvent;

/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticInputEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticEvent = __webpack_require__(77);

	/**
	 * @interface Event
	 * @see http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105
	 *      /#events-inputevents
	 */
	var InputEventInterface = {
	  data: null
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticInputEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticEvent.augmentClass(SyntheticInputEvent, InputEventInterface);

	module.exports = SyntheticInputEvent;

/***/ },
/* 79 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule keyOf
	 */

	/**
	 * Allows extraction of a minified key. Let's the build system minify keys
	 * without losing the ability to dynamically use key strings as values
	 * themselves. Pass in an object with a single key/val pair and it will return
	 * you the string key of that single record. Suppose you want to grab the
	 * value for a key 'className' inside of an object. Key/val minification may
	 * have aliased that key to be 'xa12'. keyOf({className: null}) will return
	 * 'xa12' in that case. Resolve keys you want to use once at startup time, then
	 * reuse those resolutions.
	 */
	"use strict";

	var keyOf = function (oneKeyObj) {
	  var key;
	  for (key in oneKeyObj) {
	    if (!oneKeyObj.hasOwnProperty(key)) {
	      continue;
	    }
	    return key;
	  }
	  return null;
	};

	module.exports = keyOf;

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ChangeEventPlugin
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPluginHub = __webpack_require__(31);
	var EventPropagators = __webpack_require__(73);
	var ExecutionEnvironment = __webpack_require__(9);
	var ReactUpdates = __webpack_require__(54);
	var SyntheticEvent = __webpack_require__(77);

	var getEventTarget = __webpack_require__(81);
	var isEventSupported = __webpack_require__(40);
	var isTextInputElement = __webpack_require__(82);
	var keyOf = __webpack_require__(79);

	var topLevelTypes = EventConstants.topLevelTypes;

	var eventTypes = {
	  change: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onChange: null }),
	      captured: keyOf({ onChangeCapture: null })
	    },
	    dependencies: [topLevelTypes.topBlur, topLevelTypes.topChange, topLevelTypes.topClick, topLevelTypes.topFocus, topLevelTypes.topInput, topLevelTypes.topKeyDown, topLevelTypes.topKeyUp, topLevelTypes.topSelectionChange]
	  }
	};

	/**
	 * For IE shims
	 */
	var activeElement = null;
	var activeElementID = null;
	var activeElementValue = null;
	var activeElementValueProp = null;

	/**
	 * SECTION: handle `change` event
	 */
	function shouldUseChangeEvent(elem) {
	  var nodeName = elem.nodeName && elem.nodeName.toLowerCase();
	  return nodeName === 'select' || nodeName === 'input' && elem.type === 'file';
	}

	var doesChangeEventBubble = false;
	if (ExecutionEnvironment.canUseDOM) {
	  // See `handleChange` comment below
	  doesChangeEventBubble = isEventSupported('change') && (!('documentMode' in document) || document.documentMode > 8);
	}

	function manualDispatchChangeEvent(nativeEvent) {
	  var event = SyntheticEvent.getPooled(eventTypes.change, activeElementID, nativeEvent, getEventTarget(nativeEvent));
	  EventPropagators.accumulateTwoPhaseDispatches(event);

	  // If change and propertychange bubbled, we'd just bind to it like all the
	  // other events and have it go through ReactBrowserEventEmitter. Since it
	  // doesn't, we manually listen for the events and so we have to enqueue and
	  // process the abstract event manually.
	  //
	  // Batching is necessary here in order to ensure that all event handlers run
	  // before the next rerender (including event handlers attached to ancestor
	  // elements instead of directly on the input). Without this, controlled
	  // components don't work properly in conjunction with event bubbling because
	  // the component is rerendered and the value reverted before all the event
	  // handlers can run. See https://github.com/facebook/react/issues/708.
	  ReactUpdates.batchedUpdates(runEventInBatch, event);
	}

	function runEventInBatch(event) {
	  EventPluginHub.enqueueEvents(event);
	  EventPluginHub.processEventQueue(false);
	}

	function startWatchingForChangeEventIE8(target, targetID) {
	  activeElement = target;
	  activeElementID = targetID;
	  activeElement.attachEvent('onchange', manualDispatchChangeEvent);
	}

	function stopWatchingForChangeEventIE8() {
	  if (!activeElement) {
	    return;
	  }
	  activeElement.detachEvent('onchange', manualDispatchChangeEvent);
	  activeElement = null;
	  activeElementID = null;
	}

	function getTargetIDForChangeEvent(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topChange) {
	    return topLevelTargetID;
	  }
	}
	function handleEventsForChangeEventIE8(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topFocus) {
	    // stopWatching() should be a noop here but we call it just in case we
	    // missed a blur event somehow.
	    stopWatchingForChangeEventIE8();
	    startWatchingForChangeEventIE8(topLevelTarget, topLevelTargetID);
	  } else if (topLevelType === topLevelTypes.topBlur) {
	    stopWatchingForChangeEventIE8();
	  }
	}

	/**
	 * SECTION: handle `input` event
	 */
	var isInputEventSupported = false;
	if (ExecutionEnvironment.canUseDOM) {
	  // IE9 claims to support the input event but fails to trigger it when
	  // deleting text, so we ignore its input events
	  isInputEventSupported = isEventSupported('input') && (!('documentMode' in document) || document.documentMode > 9);
	}

	/**
	 * (For old IE.) Replacement getter/setter for the `value` property that gets
	 * set on the active element.
	 */
	var newValueProp = {
	  get: function () {
	    return activeElementValueProp.get.call(this);
	  },
	  set: function (val) {
	    // Cast to a string so we can do equality checks.
	    activeElementValue = '' + val;
	    activeElementValueProp.set.call(this, val);
	  }
	};

	/**
	 * (For old IE.) Starts tracking propertychange events on the passed-in element
	 * and override the value property so that we can distinguish user events from
	 * value changes in JS.
	 */
	function startWatchingForValueChange(target, targetID) {
	  activeElement = target;
	  activeElementID = targetID;
	  activeElementValue = target.value;
	  activeElementValueProp = Object.getOwnPropertyDescriptor(target.constructor.prototype, 'value');

	  // Not guarded in a canDefineProperty check: IE8 supports defineProperty only
	  // on DOM elements
	  Object.defineProperty(activeElement, 'value', newValueProp);
	  activeElement.attachEvent('onpropertychange', handlePropertyChange);
	}

	/**
	 * (For old IE.) Removes the event listeners from the currently-tracked element,
	 * if any exists.
	 */
	function stopWatchingForValueChange() {
	  if (!activeElement) {
	    return;
	  }

	  // delete restores the original property definition
	  delete activeElement.value;
	  activeElement.detachEvent('onpropertychange', handlePropertyChange);

	  activeElement = null;
	  activeElementID = null;
	  activeElementValue = null;
	  activeElementValueProp = null;
	}

	/**
	 * (For old IE.) Handles a propertychange event, sending a `change` event if
	 * the value of the active element has changed.
	 */
	function handlePropertyChange(nativeEvent) {
	  if (nativeEvent.propertyName !== 'value') {
	    return;
	  }
	  var value = nativeEvent.srcElement.value;
	  if (value === activeElementValue) {
	    return;
	  }
	  activeElementValue = value;

	  manualDispatchChangeEvent(nativeEvent);
	}

	/**
	 * If a `change` event should be fired, returns the target's ID.
	 */
	function getTargetIDForInputEvent(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topInput) {
	    // In modern browsers (i.e., not IE8 or IE9), the input event is exactly
	    // what we want so fall through here and trigger an abstract event
	    return topLevelTargetID;
	  }
	}

	// For IE8 and IE9.
	function handleEventsForInputEventIE(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topFocus) {
	    // In IE8, we can capture almost all .value changes by adding a
	    // propertychange handler and looking for events with propertyName
	    // equal to 'value'
	    // In IE9, propertychange fires for most input events but is buggy and
	    // doesn't fire when text is deleted, but conveniently, selectionchange
	    // appears to fire in all of the remaining cases so we catch those and
	    // forward the event if the value has changed
	    // In either case, we don't want to call the event handler if the value
	    // is changed from JS so we redefine a setter for `.value` that updates
	    // our activeElementValue variable, allowing us to ignore those changes
	    //
	    // stopWatching() should be a noop here but we call it just in case we
	    // missed a blur event somehow.
	    stopWatchingForValueChange();
	    startWatchingForValueChange(topLevelTarget, topLevelTargetID);
	  } else if (topLevelType === topLevelTypes.topBlur) {
	    stopWatchingForValueChange();
	  }
	}

	// For IE8 and IE9.
	function getTargetIDForInputEventIE(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topSelectionChange || topLevelType === topLevelTypes.topKeyUp || topLevelType === topLevelTypes.topKeyDown) {
	    // On the selectionchange event, the target is just document which isn't
	    // helpful for us so just check activeElement instead.
	    //
	    // 99% of the time, keydown and keyup aren't necessary. IE8 fails to fire
	    // propertychange on the first input event after setting `value` from a
	    // script and fires only keydown, keypress, keyup. Catching keyup usually
	    // gets it and catching keydown lets us fire an event for the first
	    // keystroke if user does a key repeat (it'll be a little delayed: right
	    // before the second keystroke). Other input methods (e.g., paste) seem to
	    // fire selectionchange normally.
	    if (activeElement && activeElement.value !== activeElementValue) {
	      activeElementValue = activeElement.value;
	      return activeElementID;
	    }
	  }
	}

	/**
	 * SECTION: handle `click` event
	 */
	function shouldUseClickEvent(elem) {
	  // Use the `click` event to detect changes to checkbox and radio inputs.
	  // This approach works across all browsers, whereas `change` does not fire
	  // until `blur` in IE8.
	  return elem.nodeName && elem.nodeName.toLowerCase() === 'input' && (elem.type === 'checkbox' || elem.type === 'radio');
	}

	function getTargetIDForClickEvent(topLevelType, topLevelTarget, topLevelTargetID) {
	  if (topLevelType === topLevelTypes.topClick) {
	    return topLevelTargetID;
	  }
	}

	/**
	 * This plugin creates an `onChange` event that normalizes change events
	 * across form elements. This event fires at a time when it's possible to
	 * change the element's value without seeing a flicker.
	 *
	 * Supported elements are:
	 * - input (see `isTextInputElement`)
	 * - textarea
	 * - select
	 */
	var ChangeEventPlugin = {

	  eventTypes: eventTypes,

	  /**
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @see {EventPluginHub.extractEvents}
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {

	    var getTargetIDFunc, handleEventFunc;
	    if (shouldUseChangeEvent(topLevelTarget)) {
	      if (doesChangeEventBubble) {
	        getTargetIDFunc = getTargetIDForChangeEvent;
	      } else {
	        handleEventFunc = handleEventsForChangeEventIE8;
	      }
	    } else if (isTextInputElement(topLevelTarget)) {
	      if (isInputEventSupported) {
	        getTargetIDFunc = getTargetIDForInputEvent;
	      } else {
	        getTargetIDFunc = getTargetIDForInputEventIE;
	        handleEventFunc = handleEventsForInputEventIE;
	      }
	    } else if (shouldUseClickEvent(topLevelTarget)) {
	      getTargetIDFunc = getTargetIDForClickEvent;
	    }

	    if (getTargetIDFunc) {
	      var targetID = getTargetIDFunc(topLevelType, topLevelTarget, topLevelTargetID);
	      if (targetID) {
	        var event = SyntheticEvent.getPooled(eventTypes.change, targetID, nativeEvent, nativeEventTarget);
	        event.type = 'change';
	        EventPropagators.accumulateTwoPhaseDispatches(event);
	        return event;
	      }
	    }

	    if (handleEventFunc) {
	      handleEventFunc(topLevelType, topLevelTarget, topLevelTargetID);
	    }
	  }

	};

	module.exports = ChangeEventPlugin;

/***/ },
/* 81 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getEventTarget
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Gets the target node from a native browser event by accounting for
	 * inconsistencies in browser DOM APIs.
	 *
	 * @param {object} nativeEvent Native browser event.
	 * @return {DOMEventTarget} Target node.
	 */
	function getEventTarget(nativeEvent) {
	  var target = nativeEvent.target || nativeEvent.srcElement || window;
	  // Safari may fire events on text nodes (Node.TEXT_NODE is 3).
	  // @see http://www.quirksmode.org/js/events_properties.html
	  return target.nodeType === 3 ? target.parentNode : target;
	}

	module.exports = getEventTarget;

/***/ },
/* 82 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isTextInputElement
	 */

	'use strict';

	/**
	 * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#input-type-attr-summary
	 */
	var supportedInputTypes = {
	  'color': true,
	  'date': true,
	  'datetime': true,
	  'datetime-local': true,
	  'email': true,
	  'month': true,
	  'number': true,
	  'password': true,
	  'range': true,
	  'search': true,
	  'tel': true,
	  'text': true,
	  'time': true,
	  'url': true,
	  'week': true
	};

	function isTextInputElement(elem) {
	  var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
	  return nodeName && (nodeName === 'input' && supportedInputTypes[elem.type] || nodeName === 'textarea');
	}

	module.exports = isTextInputElement;

/***/ },
/* 83 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ClientReactRootIndex
	 * @typechecks
	 */

	'use strict';

	var nextReactRootIndex = 0;

	var ClientReactRootIndex = {
	  createReactRootIndex: function () {
	    return nextReactRootIndex++;
	  }
	};

	module.exports = ClientReactRootIndex;

/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule DefaultEventPluginOrder
	 */

	'use strict';

	var keyOf = __webpack_require__(79);

	/**
	 * Module that is injectable into `EventPluginHub`, that specifies a
	 * deterministic ordering of `EventPlugin`s. A convenient way to reason about
	 * plugins, without having to package every one of them. This is better than
	 * having plugins be ordered in the same order that they are injected because
	 * that ordering would be influenced by the packaging order.
	 * `ResponderEventPlugin` must occur before `SimpleEventPlugin` so that
	 * preventing default on events is convenient in `SimpleEventPlugin` handlers.
	 */
	var DefaultEventPluginOrder = [keyOf({ ResponderEventPlugin: null }), keyOf({ SimpleEventPlugin: null }), keyOf({ TapEventPlugin: null }), keyOf({ EnterLeaveEventPlugin: null }), keyOf({ ChangeEventPlugin: null }), keyOf({ SelectEventPlugin: null }), keyOf({ BeforeInputEventPlugin: null })];

	module.exports = DefaultEventPluginOrder;

/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EnterLeaveEventPlugin
	 * @typechecks static-only
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPropagators = __webpack_require__(73);
	var SyntheticMouseEvent = __webpack_require__(86);

	var ReactMount = __webpack_require__(28);
	var keyOf = __webpack_require__(79);

	var topLevelTypes = EventConstants.topLevelTypes;
	var getFirstReactDOM = ReactMount.getFirstReactDOM;

	var eventTypes = {
	  mouseEnter: {
	    registrationName: keyOf({ onMouseEnter: null }),
	    dependencies: [topLevelTypes.topMouseOut, topLevelTypes.topMouseOver]
	  },
	  mouseLeave: {
	    registrationName: keyOf({ onMouseLeave: null }),
	    dependencies: [topLevelTypes.topMouseOut, topLevelTypes.topMouseOver]
	  }
	};

	var extractedEvents = [null, null];

	var EnterLeaveEventPlugin = {

	  eventTypes: eventTypes,

	  /**
	   * For almost every interaction we care about, there will be both a top-level
	   * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
	   * we do not extract duplicate events. However, moving the mouse into the
	   * browser from outside will not fire a `mouseout` event. In this case, we use
	   * the `mouseover` top-level event.
	   *
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @see {EventPluginHub.extractEvents}
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    if (topLevelType === topLevelTypes.topMouseOver && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
	      return null;
	    }
	    if (topLevelType !== topLevelTypes.topMouseOut && topLevelType !== topLevelTypes.topMouseOver) {
	      // Must not be a mouse in or mouse out - ignoring.
	      return null;
	    }

	    var win;
	    if (topLevelTarget.window === topLevelTarget) {
	      // `topLevelTarget` is probably a window object.
	      win = topLevelTarget;
	    } else {
	      // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
	      var doc = topLevelTarget.ownerDocument;
	      if (doc) {
	        win = doc.defaultView || doc.parentWindow;
	      } else {
	        win = window;
	      }
	    }

	    var from;
	    var to;
	    var fromID = '';
	    var toID = '';
	    if (topLevelType === topLevelTypes.topMouseOut) {
	      from = topLevelTarget;
	      fromID = topLevelTargetID;
	      to = getFirstReactDOM(nativeEvent.relatedTarget || nativeEvent.toElement);
	      if (to) {
	        toID = ReactMount.getID(to);
	      } else {
	        to = win;
	      }
	      to = to || win;
	    } else {
	      from = win;
	      to = topLevelTarget;
	      toID = topLevelTargetID;
	    }

	    if (from === to) {
	      // Nothing pertains to our managed components.
	      return null;
	    }

	    var leave = SyntheticMouseEvent.getPooled(eventTypes.mouseLeave, fromID, nativeEvent, nativeEventTarget);
	    leave.type = 'mouseleave';
	    leave.target = from;
	    leave.relatedTarget = to;

	    var enter = SyntheticMouseEvent.getPooled(eventTypes.mouseEnter, toID, nativeEvent, nativeEventTarget);
	    enter.type = 'mouseenter';
	    enter.target = to;
	    enter.relatedTarget = from;

	    EventPropagators.accumulateEnterLeaveDispatches(leave, enter, fromID, toID);

	    extractedEvents[0] = leave;
	    extractedEvents[1] = enter;

	    return extractedEvents;
	  }

	};

	module.exports = EnterLeaveEventPlugin;

/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticMouseEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticUIEvent = __webpack_require__(87);
	var ViewportMetrics = __webpack_require__(38);

	var getEventModifierState = __webpack_require__(88);

	/**
	 * @interface MouseEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var MouseEventInterface = {
	  screenX: null,
	  screenY: null,
	  clientX: null,
	  clientY: null,
	  ctrlKey: null,
	  shiftKey: null,
	  altKey: null,
	  metaKey: null,
	  getModifierState: getEventModifierState,
	  button: function (event) {
	    // Webkit, Firefox, IE9+
	    // which:  1 2 3
	    // button: 0 1 2 (standard)
	    var button = event.button;
	    if ('which' in event) {
	      return button;
	    }
	    // IE<9
	    // which:  undefined
	    // button: 0 0 0
	    // button: 1 4 2 (onmouseup)
	    return button === 2 ? 2 : button === 4 ? 1 : 0;
	  },
	  buttons: null,
	  relatedTarget: function (event) {
	    return event.relatedTarget || (event.fromElement === event.srcElement ? event.toElement : event.fromElement);
	  },
	  // "Proprietary" Interface.
	  pageX: function (event) {
	    return 'pageX' in event ? event.pageX : event.clientX + ViewportMetrics.currentScrollLeft;
	  },
	  pageY: function (event) {
	    return 'pageY' in event ? event.pageY : event.clientY + ViewportMetrics.currentScrollTop;
	  }
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticMouseEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticUIEvent.augmentClass(SyntheticMouseEvent, MouseEventInterface);

	module.exports = SyntheticMouseEvent;

/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticUIEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticEvent = __webpack_require__(77);

	var getEventTarget = __webpack_require__(81);

	/**
	 * @interface UIEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var UIEventInterface = {
	  view: function (event) {
	    if (event.view) {
	      return event.view;
	    }

	    var target = getEventTarget(event);
	    if (target != null && target.window === target) {
	      // target is a window object
	      return target;
	    }

	    var doc = target.ownerDocument;
	    // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
	    if (doc) {
	      return doc.defaultView || doc.parentWindow;
	    } else {
	      return window;
	    }
	  },
	  detail: function (event) {
	    return event.detail || 0;
	  }
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticEvent}
	 */
	function SyntheticUIEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticEvent.augmentClass(SyntheticUIEvent, UIEventInterface);

	module.exports = SyntheticUIEvent;

/***/ },
/* 88 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getEventModifierState
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Translation from modifier key to the associated property in the event.
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/#keys-Modifiers
	 */

	var modifierKeyToProp = {
	  'Alt': 'altKey',
	  'Control': 'ctrlKey',
	  'Meta': 'metaKey',
	  'Shift': 'shiftKey'
	};

	// IE8 does not implement getModifierState so we simply map it to the only
	// modifier keys exposed by the event itself, does not support Lock-keys.
	// Currently, all major browsers except Chrome seems to support Lock-keys.
	function modifierStateGetter(keyArg) {
	  var syntheticEvent = this;
	  var nativeEvent = syntheticEvent.nativeEvent;
	  if (nativeEvent.getModifierState) {
	    return nativeEvent.getModifierState(keyArg);
	  }
	  var keyProp = modifierKeyToProp[keyArg];
	  return keyProp ? !!nativeEvent[keyProp] : false;
	}

	function getEventModifierState(nativeEvent) {
	  return modifierStateGetter;
	}

	module.exports = getEventModifierState;

/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule HTMLDOMPropertyConfig
	 */

	'use strict';

	var DOMProperty = __webpack_require__(23);
	var ExecutionEnvironment = __webpack_require__(9);

	var MUST_USE_ATTRIBUTE = DOMProperty.injection.MUST_USE_ATTRIBUTE;
	var MUST_USE_PROPERTY = DOMProperty.injection.MUST_USE_PROPERTY;
	var HAS_BOOLEAN_VALUE = DOMProperty.injection.HAS_BOOLEAN_VALUE;
	var HAS_SIDE_EFFECTS = DOMProperty.injection.HAS_SIDE_EFFECTS;
	var HAS_NUMERIC_VALUE = DOMProperty.injection.HAS_NUMERIC_VALUE;
	var HAS_POSITIVE_NUMERIC_VALUE = DOMProperty.injection.HAS_POSITIVE_NUMERIC_VALUE;
	var HAS_OVERLOADED_BOOLEAN_VALUE = DOMProperty.injection.HAS_OVERLOADED_BOOLEAN_VALUE;

	var hasSVG;
	if (ExecutionEnvironment.canUseDOM) {
	  var implementation = document.implementation;
	  hasSVG = implementation && implementation.hasFeature && implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');
	}

	var HTMLDOMPropertyConfig = {
	  isCustomAttribute: RegExp.prototype.test.bind(/^(data|aria)-[a-z_][a-z\d_.\-]*$/),
	  Properties: {
	    /**
	     * Standard Properties
	     */
	    accept: null,
	    acceptCharset: null,
	    accessKey: null,
	    action: null,
	    allowFullScreen: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    allowTransparency: MUST_USE_ATTRIBUTE,
	    alt: null,
	    async: HAS_BOOLEAN_VALUE,
	    autoComplete: null,
	    // autoFocus is polyfilled/normalized by AutoFocusUtils
	    // autoFocus: HAS_BOOLEAN_VALUE,
	    autoPlay: HAS_BOOLEAN_VALUE,
	    capture: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    cellPadding: null,
	    cellSpacing: null,
	    charSet: MUST_USE_ATTRIBUTE,
	    challenge: MUST_USE_ATTRIBUTE,
	    checked: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    classID: MUST_USE_ATTRIBUTE,
	    // To set className on SVG elements, it's necessary to use .setAttribute;
	    // this works on HTML elements too in all browsers except IE8. Conveniently,
	    // IE8 doesn't support SVG and so we can simply use the attribute in
	    // browsers that support SVG and the property in browsers that don't,
	    // regardless of whether the element is HTML or SVG.
	    className: hasSVG ? MUST_USE_ATTRIBUTE : MUST_USE_PROPERTY,
	    cols: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
	    colSpan: null,
	    content: null,
	    contentEditable: null,
	    contextMenu: MUST_USE_ATTRIBUTE,
	    controls: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    coords: null,
	    crossOrigin: null,
	    data: null, // For `<object />` acts as `src`.
	    dateTime: MUST_USE_ATTRIBUTE,
	    'default': HAS_BOOLEAN_VALUE,
	    defer: HAS_BOOLEAN_VALUE,
	    dir: null,
	    disabled: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    download: HAS_OVERLOADED_BOOLEAN_VALUE,
	    draggable: null,
	    encType: null,
	    form: MUST_USE_ATTRIBUTE,
	    formAction: MUST_USE_ATTRIBUTE,
	    formEncType: MUST_USE_ATTRIBUTE,
	    formMethod: MUST_USE_ATTRIBUTE,
	    formNoValidate: HAS_BOOLEAN_VALUE,
	    formTarget: MUST_USE_ATTRIBUTE,
	    frameBorder: MUST_USE_ATTRIBUTE,
	    headers: null,
	    height: MUST_USE_ATTRIBUTE,
	    hidden: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    high: null,
	    href: null,
	    hrefLang: null,
	    htmlFor: null,
	    httpEquiv: null,
	    icon: null,
	    id: MUST_USE_PROPERTY,
	    inputMode: MUST_USE_ATTRIBUTE,
	    integrity: null,
	    is: MUST_USE_ATTRIBUTE,
	    keyParams: MUST_USE_ATTRIBUTE,
	    keyType: MUST_USE_ATTRIBUTE,
	    kind: null,
	    label: null,
	    lang: null,
	    list: MUST_USE_ATTRIBUTE,
	    loop: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    low: null,
	    manifest: MUST_USE_ATTRIBUTE,
	    marginHeight: null,
	    marginWidth: null,
	    max: null,
	    maxLength: MUST_USE_ATTRIBUTE,
	    media: MUST_USE_ATTRIBUTE,
	    mediaGroup: null,
	    method: null,
	    min: null,
	    minLength: MUST_USE_ATTRIBUTE,
	    multiple: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    muted: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    name: null,
	    nonce: MUST_USE_ATTRIBUTE,
	    noValidate: HAS_BOOLEAN_VALUE,
	    open: HAS_BOOLEAN_VALUE,
	    optimum: null,
	    pattern: null,
	    placeholder: null,
	    poster: null,
	    preload: null,
	    radioGroup: null,
	    readOnly: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    rel: null,
	    required: HAS_BOOLEAN_VALUE,
	    reversed: HAS_BOOLEAN_VALUE,
	    role: MUST_USE_ATTRIBUTE,
	    rows: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
	    rowSpan: null,
	    sandbox: null,
	    scope: null,
	    scoped: HAS_BOOLEAN_VALUE,
	    scrolling: null,
	    seamless: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    selected: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
	    shape: null,
	    size: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
	    sizes: MUST_USE_ATTRIBUTE,
	    span: HAS_POSITIVE_NUMERIC_VALUE,
	    spellCheck: null,
	    src: null,
	    srcDoc: MUST_USE_PROPERTY,
	    srcLang: null,
	    srcSet: MUST_USE_ATTRIBUTE,
	    start: HAS_NUMERIC_VALUE,
	    step: null,
	    style: null,
	    summary: null,
	    tabIndex: null,
	    target: null,
	    title: null,
	    type: null,
	    useMap: null,
	    value: MUST_USE_PROPERTY | HAS_SIDE_EFFECTS,
	    width: MUST_USE_ATTRIBUTE,
	    wmode: MUST_USE_ATTRIBUTE,
	    wrap: null,

	    /**
	     * RDFa Properties
	     */
	    about: MUST_USE_ATTRIBUTE,
	    datatype: MUST_USE_ATTRIBUTE,
	    inlist: MUST_USE_ATTRIBUTE,
	    prefix: MUST_USE_ATTRIBUTE,
	    // property is also supported for OpenGraph in meta tags.
	    property: MUST_USE_ATTRIBUTE,
	    resource: MUST_USE_ATTRIBUTE,
	    'typeof': MUST_USE_ATTRIBUTE,
	    vocab: MUST_USE_ATTRIBUTE,

	    /**
	     * Non-standard Properties
	     */
	    // autoCapitalize and autoCorrect are supported in Mobile Safari for
	    // keyboard hints.
	    autoCapitalize: MUST_USE_ATTRIBUTE,
	    autoCorrect: MUST_USE_ATTRIBUTE,
	    // autoSave allows WebKit/Blink to persist values of input fields on page reloads
	    autoSave: null,
	    // color is for Safari mask-icon link
	    color: null,
	    // itemProp, itemScope, itemType are for
	    // Microdata support. See http://schema.org/docs/gs.html
	    itemProp: MUST_USE_ATTRIBUTE,
	    itemScope: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
	    itemType: MUST_USE_ATTRIBUTE,
	    // itemID and itemRef are for Microdata support as well but
	    // only specified in the the WHATWG spec document. See
	    // https://html.spec.whatwg.org/multipage/microdata.html#microdata-dom-api
	    itemID: MUST_USE_ATTRIBUTE,
	    itemRef: MUST_USE_ATTRIBUTE,
	    // results show looking glass icon and recent searches on input
	    // search fields in WebKit/Blink
	    results: null,
	    // IE-only attribute that specifies security restrictions on an iframe
	    // as an alternative to the sandbox attribute on IE<10
	    security: MUST_USE_ATTRIBUTE,
	    // IE-only attribute that controls focus behavior
	    unselectable: MUST_USE_ATTRIBUTE
	  },
	  DOMAttributeNames: {
	    acceptCharset: 'accept-charset',
	    className: 'class',
	    htmlFor: 'for',
	    httpEquiv: 'http-equiv'
	  },
	  DOMPropertyNames: {
	    autoComplete: 'autocomplete',
	    autoFocus: 'autofocus',
	    autoPlay: 'autoplay',
	    autoSave: 'autosave',
	    // `encoding` is equivalent to `enctype`, IE8 lacks an `enctype` setter.
	    // http://www.w3.org/TR/html5/forms.html#dom-fs-encoding
	    encType: 'encoding',
	    hrefLang: 'hreflang',
	    radioGroup: 'radiogroup',
	    spellCheck: 'spellcheck',
	    srcDoc: 'srcdoc',
	    srcSet: 'srcset'
	  }
	};

	module.exports = HTMLDOMPropertyConfig;

/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactBrowserComponentMixin
	 */

	'use strict';

	var ReactInstanceMap = __webpack_require__(47);

	var findDOMNode = __webpack_require__(91);
	var warning = __webpack_require__(25);

	var didWarnKey = '_getDOMNodeDidWarn';

	var ReactBrowserComponentMixin = {
	  /**
	   * Returns the DOM node rendered by this component.
	   *
	   * @return {DOMElement} The root node of this component.
	   * @final
	   * @protected
	   */
	  getDOMNode: function () {
	     false ? warning(this.constructor[didWarnKey], '%s.getDOMNode(...) is deprecated. Please use ' + 'ReactDOM.findDOMNode(instance) instead.', ReactInstanceMap.get(this).getName() || this.tagName || 'Unknown') : undefined;
	    this.constructor[didWarnKey] = true;
	    return findDOMNode(this);
	  }
	};

	module.exports = ReactBrowserComponentMixin;

/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule findDOMNode
	 * @typechecks static-only
	 */

	'use strict';

	var ReactCurrentOwner = __webpack_require__(5);
	var ReactInstanceMap = __webpack_require__(47);
	var ReactMount = __webpack_require__(28);

	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	/**
	 * Returns the DOM node rendered by this element.
	 *
	 * @param {ReactComponent|DOMElement} componentOrElement
	 * @return {?DOMElement} The root node of this element.
	 */
	function findDOMNode(componentOrElement) {
	  if (false) {
	    var owner = ReactCurrentOwner.current;
	    if (owner !== null) {
	      process.env.NODE_ENV !== 'production' ? warning(owner._warnedAboutRefsInRender, '%s is accessing getDOMNode or findDOMNode inside its render(). ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', owner.getName() || 'A component') : undefined;
	      owner._warnedAboutRefsInRender = true;
	    }
	  }
	  if (componentOrElement == null) {
	    return null;
	  }
	  if (componentOrElement.nodeType === 1) {
	    return componentOrElement;
	  }
	  if (ReactInstanceMap.has(componentOrElement)) {
	    return ReactMount.getNodeFromInstance(componentOrElement);
	  }
	  !(componentOrElement.render == null || typeof componentOrElement.render !== 'function') ?  false ? invariant(false, 'findDOMNode was called on an unmounted component.') : invariant(false) : undefined;
	   true ?  false ? invariant(false, 'Element appears to be neither ReactComponent nor DOMNode (keys: %s)', Object.keys(componentOrElement)) : invariant(false) : undefined;
	}

	module.exports = findDOMNode;

/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDefaultBatchingStrategy
	 */

	'use strict';

	var ReactUpdates = __webpack_require__(54);
	var Transaction = __webpack_require__(57);

	var assign = __webpack_require__(39);
	var emptyFunction = __webpack_require__(15);

	var RESET_BATCHED_UPDATES = {
	  initialize: emptyFunction,
	  close: function () {
	    ReactDefaultBatchingStrategy.isBatchingUpdates = false;
	  }
	};

	var FLUSH_BATCHED_UPDATES = {
	  initialize: emptyFunction,
	  close: ReactUpdates.flushBatchedUpdates.bind(ReactUpdates)
	};

	var TRANSACTION_WRAPPERS = [FLUSH_BATCHED_UPDATES, RESET_BATCHED_UPDATES];

	function ReactDefaultBatchingStrategyTransaction() {
	  this.reinitializeTransaction();
	}

	assign(ReactDefaultBatchingStrategyTransaction.prototype, Transaction.Mixin, {
	  getTransactionWrappers: function () {
	    return TRANSACTION_WRAPPERS;
	  }
	});

	var transaction = new ReactDefaultBatchingStrategyTransaction();

	var ReactDefaultBatchingStrategy = {
	  isBatchingUpdates: false,

	  /**
	   * Call the provided function in a context within which calls to `setState`
	   * and friends are batched such that components aren't updated unnecessarily.
	   */
	  batchedUpdates: function (callback, a, b, c, d, e) {
	    var alreadyBatchingUpdates = ReactDefaultBatchingStrategy.isBatchingUpdates;

	    ReactDefaultBatchingStrategy.isBatchingUpdates = true;

	    // The code is written this way to avoid extra allocations
	    if (alreadyBatchingUpdates) {
	      callback(a, b, c, d, e);
	    } else {
	      transaction.perform(callback, null, a, b, c, d, e);
	    }
	  }
	};

	module.exports = ReactDefaultBatchingStrategy;

/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMComponent
	 * @typechecks static-only
	 */

	/* global hasOwnProperty:true */

	'use strict';

	var AutoFocusUtils = __webpack_require__(94);
	var CSSPropertyOperations = __webpack_require__(96);
	var DOMProperty = __webpack_require__(23);
	var DOMPropertyOperations = __webpack_require__(22);
	var EventConstants = __webpack_require__(30);
	var ReactBrowserEventEmitter = __webpack_require__(29);
	var ReactComponentBrowserEnvironment = __webpack_require__(26);
	var ReactDOMButton = __webpack_require__(104);
	var ReactDOMInput = __webpack_require__(105);
	var ReactDOMOption = __webpack_require__(109);
	var ReactDOMSelect = __webpack_require__(112);
	var ReactDOMTextarea = __webpack_require__(113);
	var ReactMount = __webpack_require__(28);
	var ReactMultiChild = __webpack_require__(114);
	var ReactPerf = __webpack_require__(18);
	var ReactUpdateQueue = __webpack_require__(53);

	var assign = __webpack_require__(39);
	var canDefineProperty = __webpack_require__(43);
	var escapeTextContentForBrowser = __webpack_require__(21);
	var invariant = __webpack_require__(13);
	var isEventSupported = __webpack_require__(40);
	var keyOf = __webpack_require__(79);
	var setInnerHTML = __webpack_require__(19);
	var setTextContent = __webpack_require__(20);
	var shallowEqual = __webpack_require__(117);
	var validateDOMNesting = __webpack_require__(70);
	var warning = __webpack_require__(25);

	var deleteListener = ReactBrowserEventEmitter.deleteListener;
	var listenTo = ReactBrowserEventEmitter.listenTo;
	var registrationNameModules = ReactBrowserEventEmitter.registrationNameModules;

	// For quickly matching children type, to test if can be treated as content.
	var CONTENT_TYPES = { 'string': true, 'number': true };

	var CHILDREN = keyOf({ children: null });
	var STYLE = keyOf({ style: null });
	var HTML = keyOf({ __html: null });

	var ELEMENT_NODE_TYPE = 1;

	function getDeclarationErrorAddendum(internalInstance) {
	  if (internalInstance) {
	    var owner = internalInstance._currentElement._owner || null;
	    if (owner) {
	      var name = owner.getName();
	      if (name) {
	        return ' This DOM node was rendered by `' + name + '`.';
	      }
	    }
	  }
	  return '';
	}

	var legacyPropsDescriptor;
	if (false) {
	  legacyPropsDescriptor = {
	    props: {
	      enumerable: false,
	      get: function () {
	        var component = this._reactInternalComponent;
	        process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .props of a DOM node; instead, ' + 'recreate the props as `render` did originally or read the DOM ' + 'properties/attributes directly from this node (e.g., ' + 'this.refs.box.className).%s', getDeclarationErrorAddendum(component)) : undefined;
	        return component._currentElement.props;
	      }
	    }
	  };
	}

	function legacyGetDOMNode() {
	  if (false) {
	    var component = this._reactInternalComponent;
	    process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .getDOMNode() of a DOM node; ' + 'instead, use the node directly.%s', getDeclarationErrorAddendum(component)) : undefined;
	  }
	  return this;
	}

	function legacyIsMounted() {
	  var component = this._reactInternalComponent;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .isMounted() of a DOM node.%s', getDeclarationErrorAddendum(component)) : undefined;
	  }
	  return !!component;
	}

	function legacySetStateEtc() {
	  if (false) {
	    var component = this._reactInternalComponent;
	    process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .setState(), .replaceState(), or ' + '.forceUpdate() of a DOM node. This is a no-op.%s', getDeclarationErrorAddendum(component)) : undefined;
	  }
	}

	function legacySetProps(partialProps, callback) {
	  var component = this._reactInternalComponent;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .setProps() of a DOM node. ' + 'Instead, call ReactDOM.render again at the top level.%s', getDeclarationErrorAddendum(component)) : undefined;
	  }
	  if (!component) {
	    return;
	  }
	  ReactUpdateQueue.enqueueSetPropsInternal(component, partialProps);
	  if (callback) {
	    ReactUpdateQueue.enqueueCallbackInternal(component, callback);
	  }
	}

	function legacyReplaceProps(partialProps, callback) {
	  var component = this._reactInternalComponent;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(false, 'ReactDOMComponent: Do not access .replaceProps() of a DOM node. ' + 'Instead, call ReactDOM.render again at the top level.%s', getDeclarationErrorAddendum(component)) : undefined;
	  }
	  if (!component) {
	    return;
	  }
	  ReactUpdateQueue.enqueueReplacePropsInternal(component, partialProps);
	  if (callback) {
	    ReactUpdateQueue.enqueueCallbackInternal(component, callback);
	  }
	}

	function friendlyStringify(obj) {
	  if (typeof obj === 'object') {
	    if (Array.isArray(obj)) {
	      return '[' + obj.map(friendlyStringify).join(', ') + ']';
	    } else {
	      var pairs = [];
	      for (var key in obj) {
	        if (Object.prototype.hasOwnProperty.call(obj, key)) {
	          var keyEscaped = /^[a-z$_][\w$_]*$/i.test(key) ? key : JSON.stringify(key);
	          pairs.push(keyEscaped + ': ' + friendlyStringify(obj[key]));
	        }
	      }
	      return '{' + pairs.join(', ') + '}';
	    }
	  } else if (typeof obj === 'string') {
	    return JSON.stringify(obj);
	  } else if (typeof obj === 'function') {
	    return '[function object]';
	  }
	  // Differs from JSON.stringify in that undefined becauses undefined and that
	  // inf and nan don't become null
	  return String(obj);
	}

	var styleMutationWarning = {};

	function checkAndWarnForMutatedStyle(style1, style2, component) {
	  if (style1 == null || style2 == null) {
	    return;
	  }
	  if (shallowEqual(style1, style2)) {
	    return;
	  }

	  var componentName = component._tag;
	  var owner = component._currentElement._owner;
	  var ownerName;
	  if (owner) {
	    ownerName = owner.getName();
	  }

	  var hash = ownerName + '|' + componentName;

	  if (styleMutationWarning.hasOwnProperty(hash)) {
	    return;
	  }

	  styleMutationWarning[hash] = true;

	   false ? warning(false, '`%s` was passed a style object that has previously been mutated. ' + 'Mutating `style` is deprecated. Consider cloning it beforehand. Check ' + 'the `render` %s. Previous style: %s. Mutated style: %s.', componentName, owner ? 'of `' + ownerName + '`' : 'using <' + componentName + '>', friendlyStringify(style1), friendlyStringify(style2)) : undefined;
	}

	/**
	 * @param {object} component
	 * @param {?object} props
	 */
	function assertValidProps(component, props) {
	  if (!props) {
	    return;
	  }
	  // Note the use of `==` which checks for null or undefined.
	  if (false) {
	    if (voidElementTags[component._tag]) {
	      process.env.NODE_ENV !== 'production' ? warning(props.children == null && props.dangerouslySetInnerHTML == null, '%s is a void element tag and must not have `children` or ' + 'use `props.dangerouslySetInnerHTML`.%s', component._tag, component._currentElement._owner ? ' Check the render method of ' + component._currentElement._owner.getName() + '.' : '') : undefined;
	    }
	  }
	  if (props.dangerouslySetInnerHTML != null) {
	    !(props.children == null) ?  false ? invariant(false, 'Can only set one of `children` or `props.dangerouslySetInnerHTML`.') : invariant(false) : undefined;
	    !(typeof props.dangerouslySetInnerHTML === 'object' && HTML in props.dangerouslySetInnerHTML) ?  false ? invariant(false, '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' + 'Please visit https://fb.me/react-invariant-dangerously-set-inner-html ' + 'for more information.') : invariant(false) : undefined;
	  }
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(props.innerHTML == null, 'Directly setting property `innerHTML` is not permitted. ' + 'For more information, lookup documentation on `dangerouslySetInnerHTML`.') : undefined;
	    process.env.NODE_ENV !== 'production' ? warning(!props.contentEditable || props.children == null, 'A component is `contentEditable` and contains `children` managed by ' + 'React. It is now your responsibility to guarantee that none of ' + 'those nodes are unexpectedly modified or duplicated. This is ' + 'probably not intentional.') : undefined;
	  }
	  !(props.style == null || typeof props.style === 'object') ?  false ? invariant(false, 'The `style` prop expects a mapping from style properties to values, ' + 'not a string. For example, style={{marginRight: spacing + \'em\'}} when ' + 'using JSX.%s', getDeclarationErrorAddendum(component)) : invariant(false) : undefined;
	}

	function enqueuePutListener(id, registrationName, listener, transaction) {
	  if (false) {
	    // IE8 has no API for event capturing and the `onScroll` event doesn't
	    // bubble.
	    process.env.NODE_ENV !== 'production' ? warning(registrationName !== 'onScroll' || isEventSupported('scroll', true), 'This browser doesn\'t support the `onScroll` event') : undefined;
	  }
	  var container = ReactMount.findReactContainerForID(id);
	  if (container) {
	    var doc = container.nodeType === ELEMENT_NODE_TYPE ? container.ownerDocument : container;
	    listenTo(registrationName, doc);
	  }
	  transaction.getReactMountReady().enqueue(putListener, {
	    id: id,
	    registrationName: registrationName,
	    listener: listener
	  });
	}

	function putListener() {
	  var listenerToPut = this;
	  ReactBrowserEventEmitter.putListener(listenerToPut.id, listenerToPut.registrationName, listenerToPut.listener);
	}

	// There are so many media events, it makes sense to just
	// maintain a list rather than create a `trapBubbledEvent` for each
	var mediaEvents = {
	  topAbort: 'abort',
	  topCanPlay: 'canplay',
	  topCanPlayThrough: 'canplaythrough',
	  topDurationChange: 'durationchange',
	  topEmptied: 'emptied',
	  topEncrypted: 'encrypted',
	  topEnded: 'ended',
	  topError: 'error',
	  topLoadedData: 'loadeddata',
	  topLoadedMetadata: 'loadedmetadata',
	  topLoadStart: 'loadstart',
	  topPause: 'pause',
	  topPlay: 'play',
	  topPlaying: 'playing',
	  topProgress: 'progress',
	  topRateChange: 'ratechange',
	  topSeeked: 'seeked',
	  topSeeking: 'seeking',
	  topStalled: 'stalled',
	  topSuspend: 'suspend',
	  topTimeUpdate: 'timeupdate',
	  topVolumeChange: 'volumechange',
	  topWaiting: 'waiting'
	};

	function trapBubbledEventsLocal() {
	  var inst = this;
	  // If a component renders to null or if another component fatals and causes
	  // the state of the tree to be corrupted, `node` here can be null.
	  !inst._rootNodeID ?  false ? invariant(false, 'Must be mounted to trap events') : invariant(false) : undefined;
	  var node = ReactMount.getNode(inst._rootNodeID);
	  !node ?  false ? invariant(false, 'trapBubbledEvent(...): Requires node to be rendered.') : invariant(false) : undefined;

	  switch (inst._tag) {
	    case 'iframe':
	      inst._wrapperState.listeners = [ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes.topLoad, 'load', node)];
	      break;
	    case 'video':
	    case 'audio':

	      inst._wrapperState.listeners = [];
	      // create listener for each media event
	      for (var event in mediaEvents) {
	        if (mediaEvents.hasOwnProperty(event)) {
	          inst._wrapperState.listeners.push(ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes[event], mediaEvents[event], node));
	        }
	      }

	      break;
	    case 'img':
	      inst._wrapperState.listeners = [ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes.topError, 'error', node), ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes.topLoad, 'load', node)];
	      break;
	    case 'form':
	      inst._wrapperState.listeners = [ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes.topReset, 'reset', node), ReactBrowserEventEmitter.trapBubbledEvent(EventConstants.topLevelTypes.topSubmit, 'submit', node)];
	      break;
	  }
	}

	function mountReadyInputWrapper() {
	  ReactDOMInput.mountReadyWrapper(this);
	}

	function postUpdateSelectWrapper() {
	  ReactDOMSelect.postUpdateWrapper(this);
	}

	// For HTML, certain tags should omit their close tag. We keep a whitelist for
	// those special cased tags.

	var omittedCloseTags = {
	  'area': true,
	  'base': true,
	  'br': true,
	  'col': true,
	  'embed': true,
	  'hr': true,
	  'img': true,
	  'input': true,
	  'keygen': true,
	  'link': true,
	  'meta': true,
	  'param': true,
	  'source': true,
	  'track': true,
	  'wbr': true
	};

	// NOTE: menuitem's close tag should be omitted, but that causes problems.
	var newlineEatingTags = {
	  'listing': true,
	  'pre': true,
	  'textarea': true
	};

	// For HTML, certain tags cannot have children. This has the same purpose as
	// `omittedCloseTags` except that `menuitem` should still have its closing tag.

	var voidElementTags = assign({
	  'menuitem': true
	}, omittedCloseTags);

	// We accept any tag to be rendered but since this gets injected into arbitrary
	// HTML, we want to make sure that it's a safe tag.
	// http://www.w3.org/TR/REC-xml/#NT-Name

	var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset
	var validatedTagCache = {};
	var hasOwnProperty = ({}).hasOwnProperty;

	function validateDangerousTag(tag) {
	  if (!hasOwnProperty.call(validatedTagCache, tag)) {
	    !VALID_TAG_REGEX.test(tag) ?  false ? invariant(false, 'Invalid tag: %s', tag) : invariant(false) : undefined;
	    validatedTagCache[tag] = true;
	  }
	}

	function processChildContextDev(context, inst) {
	  // Pass down our tag name to child components for validation purposes
	  context = assign({}, context);
	  var info = context[validateDOMNesting.ancestorInfoContextKey];
	  context[validateDOMNesting.ancestorInfoContextKey] = validateDOMNesting.updatedAncestorInfo(info, inst._tag, inst);
	  return context;
	}

	function isCustomComponent(tagName, props) {
	  return tagName.indexOf('-') >= 0 || props.is != null;
	}

	/**
	 * Creates a new React class that is idempotent and capable of containing other
	 * React components. It accepts event listeners and DOM properties that are
	 * valid according to `DOMProperty`.
	 *
	 *  - Event listeners: `onClick`, `onMouseDown`, etc.
	 *  - DOM properties: `className`, `name`, `title`, etc.
	 *
	 * The `style` property functions differently from the DOM API. It accepts an
	 * object mapping of style properties to values.
	 *
	 * @constructor ReactDOMComponent
	 * @extends ReactMultiChild
	 */
	function ReactDOMComponent(tag) {
	  validateDangerousTag(tag);
	  this._tag = tag.toLowerCase();
	  this._renderedChildren = null;
	  this._previousStyle = null;
	  this._previousStyleCopy = null;
	  this._rootNodeID = null;
	  this._wrapperState = null;
	  this._topLevelWrapper = null;
	  this._nodeWithLegacyProperties = null;
	  if (false) {
	    this._unprocessedContextDev = null;
	    this._processedContextDev = null;
	  }
	}

	ReactDOMComponent.displayName = 'ReactDOMComponent';

	ReactDOMComponent.Mixin = {

	  construct: function (element) {
	    this._currentElement = element;
	  },

	  /**
	   * Generates root tag markup then recurses. This method has side effects and
	   * is not idempotent.
	   *
	   * @internal
	   * @param {string} rootID The root DOM ID for this node.
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @param {object} context
	   * @return {string} The computed markup.
	   */
	  mountComponent: function (rootID, transaction, context) {
	    this._rootNodeID = rootID;

	    var props = this._currentElement.props;

	    switch (this._tag) {
	      case 'iframe':
	      case 'img':
	      case 'form':
	      case 'video':
	      case 'audio':
	        this._wrapperState = {
	          listeners: null
	        };
	        transaction.getReactMountReady().enqueue(trapBubbledEventsLocal, this);
	        break;
	      case 'button':
	        props = ReactDOMButton.getNativeProps(this, props, context);
	        break;
	      case 'input':
	        ReactDOMInput.mountWrapper(this, props, context);
	        props = ReactDOMInput.getNativeProps(this, props, context);
	        break;
	      case 'option':
	        ReactDOMOption.mountWrapper(this, props, context);
	        props = ReactDOMOption.getNativeProps(this, props, context);
	        break;
	      case 'select':
	        ReactDOMSelect.mountWrapper(this, props, context);
	        props = ReactDOMSelect.getNativeProps(this, props, context);
	        context = ReactDOMSelect.processChildContext(this, props, context);
	        break;
	      case 'textarea':
	        ReactDOMTextarea.mountWrapper(this, props, context);
	        props = ReactDOMTextarea.getNativeProps(this, props, context);
	        break;
	    }

	    assertValidProps(this, props);
	    if (false) {
	      if (context[validateDOMNesting.ancestorInfoContextKey]) {
	        validateDOMNesting(this._tag, this, context[validateDOMNesting.ancestorInfoContextKey]);
	      }
	    }

	    if (false) {
	      this._unprocessedContextDev = context;
	      this._processedContextDev = processChildContextDev(context, this);
	      context = this._processedContextDev;
	    }

	    var mountImage;
	    if (transaction.useCreateElement) {
	      var ownerDocument = context[ReactMount.ownerDocumentContextKey];
	      var el = ownerDocument.createElement(this._currentElement.type);
	      DOMPropertyOperations.setAttributeForID(el, this._rootNodeID);
	      // Populate node cache
	      ReactMount.getID(el);
	      this._updateDOMProperties({}, props, transaction, el);
	      this._createInitialChildren(transaction, props, context, el);
	      mountImage = el;
	    } else {
	      var tagOpen = this._createOpenTagMarkupAndPutListeners(transaction, props);
	      var tagContent = this._createContentMarkup(transaction, props, context);
	      if (!tagContent && omittedCloseTags[this._tag]) {
	        mountImage = tagOpen + '/>';
	      } else {
	        mountImage = tagOpen + '>' + tagContent + '</' + this._currentElement.type + '>';
	      }
	    }

	    switch (this._tag) {
	      case 'input':
	        transaction.getReactMountReady().enqueue(mountReadyInputWrapper, this);
	      // falls through
	      case 'button':
	      case 'select':
	      case 'textarea':
	        if (props.autoFocus) {
	          transaction.getReactMountReady().enqueue(AutoFocusUtils.focusDOMComponent, this);
	        }
	        break;
	    }

	    return mountImage;
	  },

	  /**
	   * Creates markup for the open tag and all attributes.
	   *
	   * This method has side effects because events get registered.
	   *
	   * Iterating over object properties is faster than iterating over arrays.
	   * @see http://jsperf.com/obj-vs-arr-iteration
	   *
	   * @private
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @param {object} props
	   * @return {string} Markup of opening tag.
	   */
	  _createOpenTagMarkupAndPutListeners: function (transaction, props) {
	    var ret = '<' + this._currentElement.type;

	    for (var propKey in props) {
	      if (!props.hasOwnProperty(propKey)) {
	        continue;
	      }
	      var propValue = props[propKey];
	      if (propValue == null) {
	        continue;
	      }
	      if (registrationNameModules.hasOwnProperty(propKey)) {
	        if (propValue) {
	          enqueuePutListener(this._rootNodeID, propKey, propValue, transaction);
	        }
	      } else {
	        if (propKey === STYLE) {
	          if (propValue) {
	            if (false) {
	              // See `_updateDOMProperties`. style block
	              this._previousStyle = propValue;
	            }
	            propValue = this._previousStyleCopy = assign({}, props.style);
	          }
	          propValue = CSSPropertyOperations.createMarkupForStyles(propValue);
	        }
	        var markup = null;
	        if (this._tag != null && isCustomComponent(this._tag, props)) {
	          if (propKey !== CHILDREN) {
	            markup = DOMPropertyOperations.createMarkupForCustomAttribute(propKey, propValue);
	          }
	        } else {
	          markup = DOMPropertyOperations.createMarkupForProperty(propKey, propValue);
	        }
	        if (markup) {
	          ret += ' ' + markup;
	        }
	      }
	    }

	    // For static pages, no need to put React ID and checksum. Saves lots of
	    // bytes.
	    if (transaction.renderToStaticMarkup) {
	      return ret;
	    }

	    var markupForID = DOMPropertyOperations.createMarkupForID(this._rootNodeID);
	    return ret + ' ' + markupForID;
	  },

	  /**
	   * Creates markup for the content between the tags.
	   *
	   * @private
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @param {object} props
	   * @param {object} context
	   * @return {string} Content markup.
	   */
	  _createContentMarkup: function (transaction, props, context) {
	    var ret = '';

	    // Intentional use of != to avoid catching zero/false.
	    var innerHTML = props.dangerouslySetInnerHTML;
	    if (innerHTML != null) {
	      if (innerHTML.__html != null) {
	        ret = innerHTML.__html;
	      }
	    } else {
	      var contentToUse = CONTENT_TYPES[typeof props.children] ? props.children : null;
	      var childrenToUse = contentToUse != null ? null : props.children;
	      if (contentToUse != null) {
	        // TODO: Validate that text is allowed as a child of this node
	        ret = escapeTextContentForBrowser(contentToUse);
	      } else if (childrenToUse != null) {
	        var mountImages = this.mountChildren(childrenToUse, transaction, context);
	        ret = mountImages.join('');
	      }
	    }
	    if (newlineEatingTags[this._tag] && ret.charAt(0) === '\n') {
	      // text/html ignores the first character in these tags if it's a newline
	      // Prefer to break application/xml over text/html (for now) by adding
	      // a newline specifically to get eaten by the parser. (Alternately for
	      // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
	      // \r is normalized out by HTMLTextAreaElement#value.)
	      // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
	      // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
	      // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
	      // See: Parsing of "textarea" "listing" and "pre" elements
	      //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
	      return '\n' + ret;
	    } else {
	      return ret;
	    }
	  },

	  _createInitialChildren: function (transaction, props, context, el) {
	    // Intentional use of != to avoid catching zero/false.
	    var innerHTML = props.dangerouslySetInnerHTML;
	    if (innerHTML != null) {
	      if (innerHTML.__html != null) {
	        setInnerHTML(el, innerHTML.__html);
	      }
	    } else {
	      var contentToUse = CONTENT_TYPES[typeof props.children] ? props.children : null;
	      var childrenToUse = contentToUse != null ? null : props.children;
	      if (contentToUse != null) {
	        // TODO: Validate that text is allowed as a child of this node
	        setTextContent(el, contentToUse);
	      } else if (childrenToUse != null) {
	        var mountImages = this.mountChildren(childrenToUse, transaction, context);
	        for (var i = 0; i < mountImages.length; i++) {
	          el.appendChild(mountImages[i]);
	        }
	      }
	    }
	  },

	  /**
	   * Receives a next element and updates the component.
	   *
	   * @internal
	   * @param {ReactElement} nextElement
	   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
	   * @param {object} context
	   */
	  receiveComponent: function (nextElement, transaction, context) {
	    var prevElement = this._currentElement;
	    this._currentElement = nextElement;
	    this.updateComponent(transaction, prevElement, nextElement, context);
	  },

	  /**
	   * Updates a native DOM component after it has already been allocated and
	   * attached to the DOM. Reconciles the root DOM node, then recurses.
	   *
	   * @param {ReactReconcileTransaction} transaction
	   * @param {ReactElement} prevElement
	   * @param {ReactElement} nextElement
	   * @internal
	   * @overridable
	   */
	  updateComponent: function (transaction, prevElement, nextElement, context) {
	    var lastProps = prevElement.props;
	    var nextProps = this._currentElement.props;

	    switch (this._tag) {
	      case 'button':
	        lastProps = ReactDOMButton.getNativeProps(this, lastProps);
	        nextProps = ReactDOMButton.getNativeProps(this, nextProps);
	        break;
	      case 'input':
	        ReactDOMInput.updateWrapper(this);
	        lastProps = ReactDOMInput.getNativeProps(this, lastProps);
	        nextProps = ReactDOMInput.getNativeProps(this, nextProps);
	        break;
	      case 'option':
	        lastProps = ReactDOMOption.getNativeProps(this, lastProps);
	        nextProps = ReactDOMOption.getNativeProps(this, nextProps);
	        break;
	      case 'select':
	        lastProps = ReactDOMSelect.getNativeProps(this, lastProps);
	        nextProps = ReactDOMSelect.getNativeProps(this, nextProps);
	        break;
	      case 'textarea':
	        ReactDOMTextarea.updateWrapper(this);
	        lastProps = ReactDOMTextarea.getNativeProps(this, lastProps);
	        nextProps = ReactDOMTextarea.getNativeProps(this, nextProps);
	        break;
	    }

	    if (false) {
	      // If the context is reference-equal to the old one, pass down the same
	      // processed object so the update bailout in ReactReconciler behaves
	      // correctly (and identically in dev and prod). See #5005.
	      if (this._unprocessedContextDev !== context) {
	        this._unprocessedContextDev = context;
	        this._processedContextDev = processChildContextDev(context, this);
	      }
	      context = this._processedContextDev;
	    }

	    assertValidProps(this, nextProps);
	    this._updateDOMProperties(lastProps, nextProps, transaction, null);
	    this._updateDOMChildren(lastProps, nextProps, transaction, context);

	    if (!canDefineProperty && this._nodeWithLegacyProperties) {
	      this._nodeWithLegacyProperties.props = nextProps;
	    }

	    if (this._tag === 'select') {
	      // <select> value update needs to occur after <option> children
	      // reconciliation
	      transaction.getReactMountReady().enqueue(postUpdateSelectWrapper, this);
	    }
	  },

	  /**
	   * Reconciles the properties by detecting differences in property values and
	   * updating the DOM as necessary. This function is probably the single most
	   * critical path for performance optimization.
	   *
	   * TODO: Benchmark whether checking for changed values in memory actually
	   *       improves performance (especially statically positioned elements).
	   * TODO: Benchmark the effects of putting this at the top since 99% of props
	   *       do not change for a given reconciliation.
	   * TODO: Benchmark areas that can be improved with caching.
	   *
	   * @private
	   * @param {object} lastProps
	   * @param {object} nextProps
	   * @param {ReactReconcileTransaction} transaction
	   * @param {?DOMElement} node
	   */
	  _updateDOMProperties: function (lastProps, nextProps, transaction, node) {
	    var propKey;
	    var styleName;
	    var styleUpdates;
	    for (propKey in lastProps) {
	      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
	        continue;
	      }
	      if (propKey === STYLE) {
	        var lastStyle = this._previousStyleCopy;
	        for (styleName in lastStyle) {
	          if (lastStyle.hasOwnProperty(styleName)) {
	            styleUpdates = styleUpdates || {};
	            styleUpdates[styleName] = '';
	          }
	        }
	        this._previousStyleCopy = null;
	      } else if (registrationNameModules.hasOwnProperty(propKey)) {
	        if (lastProps[propKey]) {
	          // Only call deleteListener if there was a listener previously or
	          // else willDeleteListener gets called when there wasn't actually a
	          // listener (e.g., onClick={null})
	          deleteListener(this._rootNodeID, propKey);
	        }
	      } else if (DOMProperty.properties[propKey] || DOMProperty.isCustomAttribute(propKey)) {
	        if (!node) {
	          node = ReactMount.getNode(this._rootNodeID);
	        }
	        DOMPropertyOperations.deleteValueForProperty(node, propKey);
	      }
	    }
	    for (propKey in nextProps) {
	      var nextProp = nextProps[propKey];
	      var lastProp = propKey === STYLE ? this._previousStyleCopy : lastProps[propKey];
	      if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp) {
	        continue;
	      }
	      if (propKey === STYLE) {
	        if (nextProp) {
	          if (false) {
	            checkAndWarnForMutatedStyle(this._previousStyleCopy, this._previousStyle, this);
	            this._previousStyle = nextProp;
	          }
	          nextProp = this._previousStyleCopy = assign({}, nextProp);
	        } else {
	          this._previousStyleCopy = null;
	        }
	        if (lastProp) {
	          // Unset styles on `lastProp` but not on `nextProp`.
	          for (styleName in lastProp) {
	            if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
	              styleUpdates = styleUpdates || {};
	              styleUpdates[styleName] = '';
	            }
	          }
	          // Update styles that changed since `lastProp`.
	          for (styleName in nextProp) {
	            if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
	              styleUpdates = styleUpdates || {};
	              styleUpdates[styleName] = nextProp[styleName];
	            }
	          }
	        } else {
	          // Relies on `updateStylesByID` not mutating `styleUpdates`.
	          styleUpdates = nextProp;
	        }
	      } else if (registrationNameModules.hasOwnProperty(propKey)) {
	        if (nextProp) {
	          enqueuePutListener(this._rootNodeID, propKey, nextProp, transaction);
	        } else if (lastProp) {
	          deleteListener(this._rootNodeID, propKey);
	        }
	      } else if (isCustomComponent(this._tag, nextProps)) {
	        if (!node) {
	          node = ReactMount.getNode(this._rootNodeID);
	        }
	        if (propKey === CHILDREN) {
	          nextProp = null;
	        }
	        DOMPropertyOperations.setValueForAttribute(node, propKey, nextProp);
	      } else if (DOMProperty.properties[propKey] || DOMProperty.isCustomAttribute(propKey)) {
	        if (!node) {
	          node = ReactMount.getNode(this._rootNodeID);
	        }
	        // If we're updating to null or undefined, we should remove the property
	        // from the DOM node instead of inadvertantly setting to a string. This
	        // brings us in line with the same behavior we have on initial render.
	        if (nextProp != null) {
	          DOMPropertyOperations.setValueForProperty(node, propKey, nextProp);
	        } else {
	          DOMPropertyOperations.deleteValueForProperty(node, propKey);
	        }
	      }
	    }
	    if (styleUpdates) {
	      if (!node) {
	        node = ReactMount.getNode(this._rootNodeID);
	      }
	      CSSPropertyOperations.setValueForStyles(node, styleUpdates);
	    }
	  },

	  /**
	   * Reconciles the children with the various properties that affect the
	   * children content.
	   *
	   * @param {object} lastProps
	   * @param {object} nextProps
	   * @param {ReactReconcileTransaction} transaction
	   * @param {object} context
	   */
	  _updateDOMChildren: function (lastProps, nextProps, transaction, context) {
	    var lastContent = CONTENT_TYPES[typeof lastProps.children] ? lastProps.children : null;
	    var nextContent = CONTENT_TYPES[typeof nextProps.children] ? nextProps.children : null;

	    var lastHtml = lastProps.dangerouslySetInnerHTML && lastProps.dangerouslySetInnerHTML.__html;
	    var nextHtml = nextProps.dangerouslySetInnerHTML && nextProps.dangerouslySetInnerHTML.__html;

	    // Note the use of `!=` which checks for null or undefined.
	    var lastChildren = lastContent != null ? null : lastProps.children;
	    var nextChildren = nextContent != null ? null : nextProps.children;

	    // If we're switching from children to content/html or vice versa, remove
	    // the old content
	    var lastHasContentOrHtml = lastContent != null || lastHtml != null;
	    var nextHasContentOrHtml = nextContent != null || nextHtml != null;
	    if (lastChildren != null && nextChildren == null) {
	      this.updateChildren(null, transaction, context);
	    } else if (lastHasContentOrHtml && !nextHasContentOrHtml) {
	      this.updateTextContent('');
	    }

	    if (nextContent != null) {
	      if (lastContent !== nextContent) {
	        this.updateTextContent('' + nextContent);
	      }
	    } else if (nextHtml != null) {
	      if (lastHtml !== nextHtml) {
	        this.updateMarkup('' + nextHtml);
	      }
	    } else if (nextChildren != null) {
	      this.updateChildren(nextChildren, transaction, context);
	    }
	  },

	  /**
	   * Destroys all event registrations for this instance. Does not remove from
	   * the DOM. That must be done by the parent.
	   *
	   * @internal
	   */
	  unmountComponent: function () {
	    switch (this._tag) {
	      case 'iframe':
	      case 'img':
	      case 'form':
	      case 'video':
	      case 'audio':
	        var listeners = this._wrapperState.listeners;
	        if (listeners) {
	          for (var i = 0; i < listeners.length; i++) {
	            listeners[i].remove();
	          }
	        }
	        break;
	      case 'input':
	        ReactDOMInput.unmountWrapper(this);
	        break;
	      case 'html':
	      case 'head':
	      case 'body':
	        /**
	         * Components like <html> <head> and <body> can't be removed or added
	         * easily in a cross-browser way, however it's valuable to be able to
	         * take advantage of React's reconciliation for styling and <title>
	         * management. So we just document it and throw in dangerous cases.
	         */
	         true ?  false ? invariant(false, '<%s> tried to unmount. Because of cross-browser quirks it is ' + 'impossible to unmount some top-level components (eg <html>, ' + '<head>, and <body>) reliably and efficiently. To fix this, have a ' + 'single top-level component that never unmounts render these ' + 'elements.', this._tag) : invariant(false) : undefined;
	        break;
	    }

	    this.unmountChildren();
	    ReactBrowserEventEmitter.deleteAllListeners(this._rootNodeID);
	    ReactComponentBrowserEnvironment.unmountIDFromEnvironment(this._rootNodeID);
	    this._rootNodeID = null;
	    this._wrapperState = null;
	    if (this._nodeWithLegacyProperties) {
	      var node = this._nodeWithLegacyProperties;
	      node._reactInternalComponent = null;
	      this._nodeWithLegacyProperties = null;
	    }
	  },

	  getPublicInstance: function () {
	    if (!this._nodeWithLegacyProperties) {
	      var node = ReactMount.getNode(this._rootNodeID);

	      node._reactInternalComponent = this;
	      node.getDOMNode = legacyGetDOMNode;
	      node.isMounted = legacyIsMounted;
	      node.setState = legacySetStateEtc;
	      node.replaceState = legacySetStateEtc;
	      node.forceUpdate = legacySetStateEtc;
	      node.setProps = legacySetProps;
	      node.replaceProps = legacyReplaceProps;

	      if (false) {
	        if (canDefineProperty) {
	          Object.defineProperties(node, legacyPropsDescriptor);
	        } else {
	          // updateComponent will update this property on subsequent renders
	          node.props = this._currentElement.props;
	        }
	      } else {
	        // updateComponent will update this property on subsequent renders
	        node.props = this._currentElement.props;
	      }

	      this._nodeWithLegacyProperties = node;
	    }
	    return this._nodeWithLegacyProperties;
	  }

	};

	ReactPerf.measureMethods(ReactDOMComponent, 'ReactDOMComponent', {
	  mountComponent: 'mountComponent',
	  updateComponent: 'updateComponent'
	});

	assign(ReactDOMComponent.prototype, ReactDOMComponent.Mixin, ReactMultiChild.Mixin);

	module.exports = ReactDOMComponent;

/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule AutoFocusUtils
	 * @typechecks static-only
	 */

	'use strict';

	var ReactMount = __webpack_require__(28);

	var findDOMNode = __webpack_require__(91);
	var focusNode = __webpack_require__(95);

	var Mixin = {
	  componentDidMount: function () {
	    if (this.props.autoFocus) {
	      focusNode(findDOMNode(this));
	    }
	  }
	};

	var AutoFocusUtils = {
	  Mixin: Mixin,

	  focusDOMComponent: function () {
	    focusNode(ReactMount.getNode(this._rootNodeID));
	  }
	};

	module.exports = AutoFocusUtils;

/***/ },
/* 95 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule focusNode
	 */

	'use strict';

	/**
	 * @param {DOMElement} node input/textarea to focus
	 */
	function focusNode(node) {
	  // IE8 can throw "Can't move focus to the control because it is invisible,
	  // not enabled, or of a type that does not accept the focus." for all kinds of
	  // reasons that are too expensive and fragile to test.
	  try {
	    node.focus();
	  } catch (e) {}
	}

	module.exports = focusNode;

/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule CSSPropertyOperations
	 * @typechecks static-only
	 */

	'use strict';

	var CSSProperty = __webpack_require__(97);
	var ExecutionEnvironment = __webpack_require__(9);
	var ReactPerf = __webpack_require__(18);

	var camelizeStyleName = __webpack_require__(98);
	var dangerousStyleValue = __webpack_require__(100);
	var hyphenateStyleName = __webpack_require__(101);
	var memoizeStringOnly = __webpack_require__(103);
	var warning = __webpack_require__(25);

	var processStyleName = memoizeStringOnly(function (styleName) {
	  return hyphenateStyleName(styleName);
	});

	var hasShorthandPropertyBug = false;
	var styleFloatAccessor = 'cssFloat';
	if (ExecutionEnvironment.canUseDOM) {
	  var tempStyle = document.createElement('div').style;
	  try {
	    // IE8 throws "Invalid argument." if resetting shorthand style properties.
	    tempStyle.font = '';
	  } catch (e) {
	    hasShorthandPropertyBug = true;
	  }
	  // IE8 only supports accessing cssFloat (standard) as styleFloat
	  if (document.documentElement.style.cssFloat === undefined) {
	    styleFloatAccessor = 'styleFloat';
	  }
	}

	if (false) {
	  // 'msTransform' is correct, but the other prefixes should be capitalized
	  var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;

	  // style values shouldn't contain a semicolon
	  var badStyleValueWithSemicolonPattern = /;\s*$/;

	  var warnedStyleNames = {};
	  var warnedStyleValues = {};

	  var warnHyphenatedStyleName = function (name) {
	    if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
	      return;
	    }

	    warnedStyleNames[name] = true;
	    process.env.NODE_ENV !== 'production' ? warning(false, 'Unsupported style property %s. Did you mean %s?', name, camelizeStyleName(name)) : undefined;
	  };

	  var warnBadVendoredStyleName = function (name) {
	    if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
	      return;
	    }

	    warnedStyleNames[name] = true;
	    process.env.NODE_ENV !== 'production' ? warning(false, 'Unsupported vendor-prefixed style property %s. Did you mean %s?', name, name.charAt(0).toUpperCase() + name.slice(1)) : undefined;
	  };

	  var warnStyleValueWithSemicolon = function (name, value) {
	    if (warnedStyleValues.hasOwnProperty(value) && warnedStyleValues[value]) {
	      return;
	    }

	    warnedStyleValues[value] = true;
	    process.env.NODE_ENV !== 'production' ? warning(false, 'Style property values shouldn\'t contain a semicolon. ' + 'Try "%s: %s" instead.', name, value.replace(badStyleValueWithSemicolonPattern, '')) : undefined;
	  };

	  /**
	   * @param {string} name
	   * @param {*} value
	   */
	  var warnValidStyle = function (name, value) {
	    if (name.indexOf('-') > -1) {
	      warnHyphenatedStyleName(name);
	    } else if (badVendoredStyleNamePattern.test(name)) {
	      warnBadVendoredStyleName(name);
	    } else if (badStyleValueWithSemicolonPattern.test(value)) {
	      warnStyleValueWithSemicolon(name, value);
	    }
	  };
	}

	/**
	 * Operations for dealing with CSS properties.
	 */
	var CSSPropertyOperations = {

	  /**
	   * Serializes a mapping of style properties for use as inline styles:
	   *
	   *   > createMarkupForStyles({width: '200px', height: 0})
	   *   "width:200px;height:0;"
	   *
	   * Undefined values are ignored so that declarative programming is easier.
	   * The result should be HTML-escaped before insertion into the DOM.
	   *
	   * @param {object} styles
	   * @return {?string}
	   */
	  createMarkupForStyles: function (styles) {
	    var serialized = '';
	    for (var styleName in styles) {
	      if (!styles.hasOwnProperty(styleName)) {
	        continue;
	      }
	      var styleValue = styles[styleName];
	      if (false) {
	        warnValidStyle(styleName, styleValue);
	      }
	      if (styleValue != null) {
	        serialized += processStyleName(styleName) + ':';
	        serialized += dangerousStyleValue(styleName, styleValue) + ';';
	      }
	    }
	    return serialized || null;
	  },

	  /**
	   * Sets the value for multiple styles on a node.  If a value is specified as
	   * '' (empty string), the corresponding style property will be unset.
	   *
	   * @param {DOMElement} node
	   * @param {object} styles
	   */
	  setValueForStyles: function (node, styles) {
	    var style = node.style;
	    for (var styleName in styles) {
	      if (!styles.hasOwnProperty(styleName)) {
	        continue;
	      }
	      if (false) {
	        warnValidStyle(styleName, styles[styleName]);
	      }
	      var styleValue = dangerousStyleValue(styleName, styles[styleName]);
	      if (styleName === 'float') {
	        styleName = styleFloatAccessor;
	      }
	      if (styleValue) {
	        style[styleName] = styleValue;
	      } else {
	        var expansion = hasShorthandPropertyBug && CSSProperty.shorthandPropertyExpansions[styleName];
	        if (expansion) {
	          // Shorthand property that IE8 won't like unsetting, so unset each
	          // component to placate it
	          for (var individualStyleName in expansion) {
	            style[individualStyleName] = '';
	          }
	        } else {
	          style[styleName] = '';
	        }
	      }
	    }
	  }

	};

	ReactPerf.measureMethods(CSSPropertyOperations, 'CSSPropertyOperations', {
	  setValueForStyles: 'setValueForStyles'
	});

	module.exports = CSSPropertyOperations;

/***/ },
/* 97 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule CSSProperty
	 */

	'use strict';

	/**
	 * CSS properties which accept numbers but are not in units of "px".
	 */
	var isUnitlessNumber = {
	  animationIterationCount: true,
	  boxFlex: true,
	  boxFlexGroup: true,
	  boxOrdinalGroup: true,
	  columnCount: true,
	  flex: true,
	  flexGrow: true,
	  flexPositive: true,
	  flexShrink: true,
	  flexNegative: true,
	  flexOrder: true,
	  fontWeight: true,
	  lineClamp: true,
	  lineHeight: true,
	  opacity: true,
	  order: true,
	  orphans: true,
	  tabSize: true,
	  widows: true,
	  zIndex: true,
	  zoom: true,

	  // SVG-related properties
	  fillOpacity: true,
	  stopOpacity: true,
	  strokeDashoffset: true,
	  strokeOpacity: true,
	  strokeWidth: true
	};

	/**
	 * @param {string} prefix vendor-specific prefix, eg: Webkit
	 * @param {string} key style name, eg: transitionDuration
	 * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
	 * WebkitTransitionDuration
	 */
	function prefixKey(prefix, key) {
	  return prefix + key.charAt(0).toUpperCase() + key.substring(1);
	}

	/**
	 * Support style names that may come passed in prefixed by adding permutations
	 * of vendor prefixes.
	 */
	var prefixes = ['Webkit', 'ms', 'Moz', 'O'];

	// Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
	// infinite loop, because it iterates over the newly added props too.
	Object.keys(isUnitlessNumber).forEach(function (prop) {
	  prefixes.forEach(function (prefix) {
	    isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
	  });
	});

	/**
	 * Most style properties can be unset by doing .style[prop] = '' but IE8
	 * doesn't like doing that with shorthand properties so for the properties that
	 * IE8 breaks on, which are listed here, we instead unset each of the
	 * individual properties. See http://bugs.jquery.com/ticket/12385.
	 * The 4-value 'clock' properties like margin, padding, border-width seem to
	 * behave without any problems. Curiously, list-style works too without any
	 * special prodding.
	 */
	var shorthandPropertyExpansions = {
	  background: {
	    backgroundAttachment: true,
	    backgroundColor: true,
	    backgroundImage: true,
	    backgroundPositionX: true,
	    backgroundPositionY: true,
	    backgroundRepeat: true
	  },
	  backgroundPosition: {
	    backgroundPositionX: true,
	    backgroundPositionY: true
	  },
	  border: {
	    borderWidth: true,
	    borderStyle: true,
	    borderColor: true
	  },
	  borderBottom: {
	    borderBottomWidth: true,
	    borderBottomStyle: true,
	    borderBottomColor: true
	  },
	  borderLeft: {
	    borderLeftWidth: true,
	    borderLeftStyle: true,
	    borderLeftColor: true
	  },
	  borderRight: {
	    borderRightWidth: true,
	    borderRightStyle: true,
	    borderRightColor: true
	  },
	  borderTop: {
	    borderTopWidth: true,
	    borderTopStyle: true,
	    borderTopColor: true
	  },
	  font: {
	    fontStyle: true,
	    fontVariant: true,
	    fontWeight: true,
	    fontSize: true,
	    lineHeight: true,
	    fontFamily: true
	  },
	  outline: {
	    outlineWidth: true,
	    outlineStyle: true,
	    outlineColor: true
	  }
	};

	var CSSProperty = {
	  isUnitlessNumber: isUnitlessNumber,
	  shorthandPropertyExpansions: shorthandPropertyExpansions
	};

	module.exports = CSSProperty;

/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule camelizeStyleName
	 * @typechecks
	 */

	'use strict';

	var camelize = __webpack_require__(99);

	var msPattern = /^-ms-/;

	/**
	 * Camelcases a hyphenated CSS property name, for example:
	 *
	 *   > camelizeStyleName('background-color')
	 *   < "backgroundColor"
	 *   > camelizeStyleName('-moz-transition')
	 *   < "MozTransition"
	 *   > camelizeStyleName('-ms-transition')
	 *   < "msTransition"
	 *
	 * As Andi Smith suggests
	 * (http://www.andismith.com/blog/2012/02/modernizr-prefixed/), an `-ms` prefix
	 * is converted to lowercase `ms`.
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function camelizeStyleName(string) {
	  return camelize(string.replace(msPattern, 'ms-'));
	}

	module.exports = camelizeStyleName;

/***/ },
/* 99 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule camelize
	 * @typechecks
	 */

	"use strict";

	var _hyphenPattern = /-(.)/g;

	/**
	 * Camelcases a hyphenated string, for example:
	 *
	 *   > camelize('background-color')
	 *   < "backgroundColor"
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function camelize(string) {
	  return string.replace(_hyphenPattern, function (_, character) {
	    return character.toUpperCase();
	  });
	}

	module.exports = camelize;

/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule dangerousStyleValue
	 * @typechecks static-only
	 */

	'use strict';

	var CSSProperty = __webpack_require__(97);

	var isUnitlessNumber = CSSProperty.isUnitlessNumber;

	/**
	 * Convert a value into the proper css writable value. The style name `name`
	 * should be logical (no hyphens), as specified
	 * in `CSSProperty.isUnitlessNumber`.
	 *
	 * @param {string} name CSS property name such as `topMargin`.
	 * @param {*} value CSS property value such as `10px`.
	 * @return {string} Normalized style value with dimensions applied.
	 */
	function dangerousStyleValue(name, value) {
	  // Note that we've removed escapeTextForBrowser() calls here since the
	  // whole string will be escaped when the attribute is injected into
	  // the markup. If you provide unsafe user data here they can inject
	  // arbitrary CSS which may be problematic (I couldn't repro this):
	  // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
	  // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
	  // This is not an XSS hole but instead a potential CSS injection issue
	  // which has lead to a greater discussion about how we're going to
	  // trust URLs moving forward. See #2115901

	  var isEmpty = value == null || typeof value === 'boolean' || value === '';
	  if (isEmpty) {
	    return '';
	  }

	  var isNonNumeric = isNaN(value);
	  if (isNonNumeric || value === 0 || isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name]) {
	    return '' + value; // cast to string
	  }

	  if (typeof value === 'string') {
	    value = value.trim();
	  }
	  return value + 'px';
	}

	module.exports = dangerousStyleValue;

/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule hyphenateStyleName
	 * @typechecks
	 */

	'use strict';

	var hyphenate = __webpack_require__(102);

	var msPattern = /^ms-/;

	/**
	 * Hyphenates a camelcased CSS property name, for example:
	 *
	 *   > hyphenateStyleName('backgroundColor')
	 *   < "background-color"
	 *   > hyphenateStyleName('MozTransition')
	 *   < "-moz-transition"
	 *   > hyphenateStyleName('msTransition')
	 *   < "-ms-transition"
	 *
	 * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
	 * is converted to `-ms-`.
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function hyphenateStyleName(string) {
	  return hyphenate(string).replace(msPattern, '-ms-');
	}

	module.exports = hyphenateStyleName;

/***/ },
/* 102 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule hyphenate
	 * @typechecks
	 */

	'use strict';

	var _uppercasePattern = /([A-Z])/g;

	/**
	 * Hyphenates a camelcased string, for example:
	 *
	 *   > hyphenate('backgroundColor')
	 *   < "background-color"
	 *
	 * For CSS style names, use `hyphenateStyleName` instead which works properly
	 * with all vendor prefixes, including `ms`.
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function hyphenate(string) {
	  return string.replace(_uppercasePattern, '-$1').toLowerCase();
	}

	module.exports = hyphenate;

/***/ },
/* 103 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule memoizeStringOnly
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Memoizes the return value of a function that accepts one string argument.
	 *
	 * @param {function} callback
	 * @return {function}
	 */
	function memoizeStringOnly(callback) {
	  var cache = {};
	  return function (string) {
	    if (!cache.hasOwnProperty(string)) {
	      cache[string] = callback.call(this, string);
	    }
	    return cache[string];
	  };
	}

	module.exports = memoizeStringOnly;

/***/ },
/* 104 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMButton
	 */

	'use strict';

	var mouseListenerNames = {
	  onClick: true,
	  onDoubleClick: true,
	  onMouseDown: true,
	  onMouseMove: true,
	  onMouseUp: true,

	  onClickCapture: true,
	  onDoubleClickCapture: true,
	  onMouseDownCapture: true,
	  onMouseMoveCapture: true,
	  onMouseUpCapture: true
	};

	/**
	 * Implements a <button> native component that does not receive mouse events
	 * when `disabled` is set.
	 */
	var ReactDOMButton = {
	  getNativeProps: function (inst, props, context) {
	    if (!props.disabled) {
	      return props;
	    }

	    // Copy the props, except the mouse listeners
	    var nativeProps = {};
	    for (var key in props) {
	      if (props.hasOwnProperty(key) && !mouseListenerNames[key]) {
	        nativeProps[key] = props[key];
	      }
	    }

	    return nativeProps;
	  }
	};

	module.exports = ReactDOMButton;

/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMInput
	 */

	'use strict';

	var ReactDOMIDOperations = __webpack_require__(27);
	var LinkedValueUtils = __webpack_require__(106);
	var ReactMount = __webpack_require__(28);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);

	var instancesByReactID = {};

	function forceUpdateIfMounted() {
	  if (this._rootNodeID) {
	    // DOM component is still mounted; update
	    ReactDOMInput.updateWrapper(this);
	  }
	}

	/**
	 * Implements an <input> native component that allows setting these optional
	 * props: `checked`, `value`, `defaultChecked`, and `defaultValue`.
	 *
	 * If `checked` or `value` are not supplied (or null/undefined), user actions
	 * that affect the checked state or value will trigger updates to the element.
	 *
	 * If they are supplied (and not null/undefined), the rendered element will not
	 * trigger updates to the element. Instead, the props must change in order for
	 * the rendered element to be updated.
	 *
	 * The rendered element will be initialized as unchecked (or `defaultChecked`)
	 * with an empty value (or `defaultValue`).
	 *
	 * @see http://www.w3.org/TR/2012/WD-html5-20121025/the-input-element.html
	 */
	var ReactDOMInput = {
	  getNativeProps: function (inst, props, context) {
	    var value = LinkedValueUtils.getValue(props);
	    var checked = LinkedValueUtils.getChecked(props);

	    var nativeProps = assign({}, props, {
	      defaultChecked: undefined,
	      defaultValue: undefined,
	      value: value != null ? value : inst._wrapperState.initialValue,
	      checked: checked != null ? checked : inst._wrapperState.initialChecked,
	      onChange: inst._wrapperState.onChange
	    });

	    return nativeProps;
	  },

	  mountWrapper: function (inst, props) {
	    if (false) {
	      LinkedValueUtils.checkPropTypes('input', props, inst._currentElement._owner);
	    }

	    var defaultValue = props.defaultValue;
	    inst._wrapperState = {
	      initialChecked: props.defaultChecked || false,
	      initialValue: defaultValue != null ? defaultValue : null,
	      onChange: _handleChange.bind(inst)
	    };
	  },

	  mountReadyWrapper: function (inst) {
	    // Can't be in mountWrapper or else server rendering leaks.
	    instancesByReactID[inst._rootNodeID] = inst;
	  },

	  unmountWrapper: function (inst) {
	    delete instancesByReactID[inst._rootNodeID];
	  },

	  updateWrapper: function (inst) {
	    var props = inst._currentElement.props;

	    // TODO: Shouldn't this be getChecked(props)?
	    var checked = props.checked;
	    if (checked != null) {
	      ReactDOMIDOperations.updatePropertyByID(inst._rootNodeID, 'checked', checked || false);
	    }

	    var value = LinkedValueUtils.getValue(props);
	    if (value != null) {
	      // Cast `value` to a string to ensure the value is set correctly. While
	      // browsers typically do this as necessary, jsdom doesn't.
	      ReactDOMIDOperations.updatePropertyByID(inst._rootNodeID, 'value', '' + value);
	    }
	  }
	};

	function _handleChange(event) {
	  var props = this._currentElement.props;

	  var returnValue = LinkedValueUtils.executeOnChange(props, event);

	  // Here we use asap to wait until all updates have propagated, which
	  // is important when using controlled components within layers:
	  // https://github.com/facebook/react/issues/1698
	  ReactUpdates.asap(forceUpdateIfMounted, this);

	  var name = props.name;
	  if (props.type === 'radio' && name != null) {
	    var rootNode = ReactMount.getNode(this._rootNodeID);
	    var queryRoot = rootNode;

	    while (queryRoot.parentNode) {
	      queryRoot = queryRoot.parentNode;
	    }

	    // If `rootNode.form` was non-null, then we could try `form.elements`,
	    // but that sometimes behaves strangely in IE8. We could also try using
	    // `form.getElementsByName`, but that will only return direct children
	    // and won't include inputs that use the HTML5 `form=` attribute. Since
	    // the input might not even be in a form, let's just use the global
	    // `querySelectorAll` to ensure we don't miss anything.
	    var group = queryRoot.querySelectorAll('input[name=' + JSON.stringify('' + name) + '][type="radio"]');

	    for (var i = 0; i < group.length; i++) {
	      var otherNode = group[i];
	      if (otherNode === rootNode || otherNode.form !== rootNode.form) {
	        continue;
	      }
	      // This will throw if radio buttons rendered by different copies of React
	      // and the same name are rendered into the same form (same as #1939).
	      // That's probably okay; we don't support it just as we don't support
	      // mixing React with non-React.
	      var otherID = ReactMount.getID(otherNode);
	      !otherID ?  false ? invariant(false, 'ReactDOMInput: Mixing React and non-React radio inputs with the ' + 'same `name` is not supported.') : invariant(false) : undefined;
	      var otherInstance = instancesByReactID[otherID];
	      !otherInstance ?  false ? invariant(false, 'ReactDOMInput: Unknown radio button ID %s.', otherID) : invariant(false) : undefined;
	      // If this is a controlled radio button group, forcing the input that
	      // was previously checked to update will cause it to be come re-checked
	      // as appropriate.
	      ReactUpdates.asap(forceUpdateIfMounted, otherInstance);
	    }
	  }

	  return returnValue;
	}

	module.exports = ReactDOMInput;

/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule LinkedValueUtils
	 * @typechecks static-only
	 */

	'use strict';

	var ReactPropTypes = __webpack_require__(107);
	var ReactPropTypeLocations = __webpack_require__(65);

	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	var hasReadOnlyValue = {
	  'button': true,
	  'checkbox': true,
	  'image': true,
	  'hidden': true,
	  'radio': true,
	  'reset': true,
	  'submit': true
	};

	function _assertSingleLink(inputProps) {
	  !(inputProps.checkedLink == null || inputProps.valueLink == null) ?  false ? invariant(false, 'Cannot provide a checkedLink and a valueLink. If you want to use ' + 'checkedLink, you probably don\'t want to use valueLink and vice versa.') : invariant(false) : undefined;
	}
	function _assertValueLink(inputProps) {
	  _assertSingleLink(inputProps);
	  !(inputProps.value == null && inputProps.onChange == null) ?  false ? invariant(false, 'Cannot provide a valueLink and a value or onChange event. If you want ' + 'to use value or onChange, you probably don\'t want to use valueLink.') : invariant(false) : undefined;
	}

	function _assertCheckedLink(inputProps) {
	  _assertSingleLink(inputProps);
	  !(inputProps.checked == null && inputProps.onChange == null) ?  false ? invariant(false, 'Cannot provide a checkedLink and a checked property or onChange event. ' + 'If you want to use checked or onChange, you probably don\'t want to ' + 'use checkedLink') : invariant(false) : undefined;
	}

	var propTypes = {
	  value: function (props, propName, componentName) {
	    if (!props[propName] || hasReadOnlyValue[props.type] || props.onChange || props.readOnly || props.disabled) {
	      return null;
	    }
	    return new Error('You provided a `value` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultValue`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
	  },
	  checked: function (props, propName, componentName) {
	    if (!props[propName] || props.onChange || props.readOnly || props.disabled) {
	      return null;
	    }
	    return new Error('You provided a `checked` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultChecked`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
	  },
	  onChange: ReactPropTypes.func
	};

	var loggedTypeFailures = {};
	function getDeclarationErrorAddendum(owner) {
	  if (owner) {
	    var name = owner.getName();
	    if (name) {
	      return ' Check the render method of `' + name + '`.';
	    }
	  }
	  return '';
	}

	/**
	 * Provide a linked `value` attribute for controlled forms. You should not use
	 * this outside of the ReactDOM controlled form components.
	 */
	var LinkedValueUtils = {
	  checkPropTypes: function (tagName, props, owner) {
	    for (var propName in propTypes) {
	      if (propTypes.hasOwnProperty(propName)) {
	        var error = propTypes[propName](props, propName, tagName, ReactPropTypeLocations.prop);
	      }
	      if (error instanceof Error && !(error.message in loggedTypeFailures)) {
	        // Only monitor this failure once because there tends to be a lot of the
	        // same error.
	        loggedTypeFailures[error.message] = true;

	        var addendum = getDeclarationErrorAddendum(owner);
	         false ? warning(false, 'Failed form propType: %s%s', error.message, addendum) : undefined;
	      }
	    }
	  },

	  /**
	   * @param {object} inputProps Props for form component
	   * @return {*} current value of the input either from value prop or link.
	   */
	  getValue: function (inputProps) {
	    if (inputProps.valueLink) {
	      _assertValueLink(inputProps);
	      return inputProps.valueLink.value;
	    }
	    return inputProps.value;
	  },

	  /**
	   * @param {object} inputProps Props for form component
	   * @return {*} current checked status of the input either from checked prop
	   *             or link.
	   */
	  getChecked: function (inputProps) {
	    if (inputProps.checkedLink) {
	      _assertCheckedLink(inputProps);
	      return inputProps.checkedLink.value;
	    }
	    return inputProps.checked;
	  },

	  /**
	   * @param {object} inputProps Props for form component
	   * @param {SyntheticEvent} event change event to handle
	   */
	  executeOnChange: function (inputProps, event) {
	    if (inputProps.valueLink) {
	      _assertValueLink(inputProps);
	      return inputProps.valueLink.requestChange(event.target.value);
	    } else if (inputProps.checkedLink) {
	      _assertCheckedLink(inputProps);
	      return inputProps.checkedLink.requestChange(event.target.checked);
	    } else if (inputProps.onChange) {
	      return inputProps.onChange.call(undefined, event);
	    }
	  }
	};

	module.exports = LinkedValueUtils;

/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactPropTypes
	 */

	'use strict';

	var ReactElement = __webpack_require__(42);
	var ReactPropTypeLocationNames = __webpack_require__(66);

	var emptyFunction = __webpack_require__(15);
	var getIteratorFn = __webpack_require__(108);

	/**
	 * Collection of methods that allow declaration and validation of props that are
	 * supplied to React components. Example usage:
	 *
	 *   var Props = require('ReactPropTypes');
	 *   var MyArticle = React.createClass({
	 *     propTypes: {
	 *       // An optional string prop named "description".
	 *       description: Props.string,
	 *
	 *       // A required enum prop named "category".
	 *       category: Props.oneOf(['News','Photos']).isRequired,
	 *
	 *       // A prop named "dialog" that requires an instance of Dialog.
	 *       dialog: Props.instanceOf(Dialog).isRequired
	 *     },
	 *     render: function() { ... }
	 *   });
	 *
	 * A more formal specification of how these methods are used:
	 *
	 *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
	 *   decl := ReactPropTypes.{type}(.isRequired)?
	 *
	 * Each and every declaration produces a function with the same signature. This
	 * allows the creation of custom validation functions. For example:
	 *
	 *  var MyLink = React.createClass({
	 *    propTypes: {
	 *      // An optional string or URI prop named "href".
	 *      href: function(props, propName, componentName) {
	 *        var propValue = props[propName];
	 *        if (propValue != null && typeof propValue !== 'string' &&
	 *            !(propValue instanceof URI)) {
	 *          return new Error(
	 *            'Expected a string or an URI for ' + propName + ' in ' +
	 *            componentName
	 *          );
	 *        }
	 *      }
	 *    },
	 *    render: function() {...}
	 *  });
	 *
	 * @internal
	 */

	var ANONYMOUS = '<<anonymous>>';

	var ReactPropTypes = {
	  array: createPrimitiveTypeChecker('array'),
	  bool: createPrimitiveTypeChecker('boolean'),
	  func: createPrimitiveTypeChecker('function'),
	  number: createPrimitiveTypeChecker('number'),
	  object: createPrimitiveTypeChecker('object'),
	  string: createPrimitiveTypeChecker('string'),

	  any: createAnyTypeChecker(),
	  arrayOf: createArrayOfTypeChecker,
	  element: createElementTypeChecker(),
	  instanceOf: createInstanceTypeChecker,
	  node: createNodeChecker(),
	  objectOf: createObjectOfTypeChecker,
	  oneOf: createEnumTypeChecker,
	  oneOfType: createUnionTypeChecker,
	  shape: createShapeTypeChecker
	};

	function createChainableTypeChecker(validate) {
	  function checkType(isRequired, props, propName, componentName, location, propFullName) {
	    componentName = componentName || ANONYMOUS;
	    propFullName = propFullName || propName;
	    if (props[propName] == null) {
	      var locationName = ReactPropTypeLocationNames[location];
	      if (isRequired) {
	        return new Error('Required ' + locationName + ' `' + propFullName + '` was not specified in ' + ('`' + componentName + '`.'));
	      }
	      return null;
	    } else {
	      return validate(props, propName, componentName, location, propFullName);
	    }
	  }

	  var chainedCheckType = checkType.bind(null, false);
	  chainedCheckType.isRequired = checkType.bind(null, true);

	  return chainedCheckType;
	}

	function createPrimitiveTypeChecker(expectedType) {
	  function validate(props, propName, componentName, location, propFullName) {
	    var propValue = props[propName];
	    var propType = getPropType(propValue);
	    if (propType !== expectedType) {
	      var locationName = ReactPropTypeLocationNames[location];
	      // `propValue` being instance of, say, date/regexp, pass the 'object'
	      // check, but we can offer a more precise error message here rather than
	      // 'of type `object`'.
	      var preciseType = getPreciseType(propValue);

	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'));
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createAnyTypeChecker() {
	  return createChainableTypeChecker(emptyFunction.thatReturns(null));
	}

	function createArrayOfTypeChecker(typeChecker) {
	  function validate(props, propName, componentName, location, propFullName) {
	    var propValue = props[propName];
	    if (!Array.isArray(propValue)) {
	      var locationName = ReactPropTypeLocationNames[location];
	      var propType = getPropType(propValue);
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
	    }
	    for (var i = 0; i < propValue.length; i++) {
	      var error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']');
	      if (error instanceof Error) {
	        return error;
	      }
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createElementTypeChecker() {
	  function validate(props, propName, componentName, location, propFullName) {
	    if (!ReactElement.isValidElement(props[propName])) {
	      var locationName = ReactPropTypeLocationNames[location];
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a single ReactElement.'));
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createInstanceTypeChecker(expectedClass) {
	  function validate(props, propName, componentName, location, propFullName) {
	    if (!(props[propName] instanceof expectedClass)) {
	      var locationName = ReactPropTypeLocationNames[location];
	      var expectedClassName = expectedClass.name || ANONYMOUS;
	      var actualClassName = getClassName(props[propName]);
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createEnumTypeChecker(expectedValues) {
	  if (!Array.isArray(expectedValues)) {
	    return createChainableTypeChecker(function () {
	      return new Error('Invalid argument supplied to oneOf, expected an instance of array.');
	    });
	  }

	  function validate(props, propName, componentName, location, propFullName) {
	    var propValue = props[propName];
	    for (var i = 0; i < expectedValues.length; i++) {
	      if (propValue === expectedValues[i]) {
	        return null;
	      }
	    }

	    var locationName = ReactPropTypeLocationNames[location];
	    var valuesString = JSON.stringify(expectedValues);
	    return new Error('Invalid ' + locationName + ' `' + propFullName + '` of value `' + propValue + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
	  }
	  return createChainableTypeChecker(validate);
	}

	function createObjectOfTypeChecker(typeChecker) {
	  function validate(props, propName, componentName, location, propFullName) {
	    var propValue = props[propName];
	    var propType = getPropType(propValue);
	    if (propType !== 'object') {
	      var locationName = ReactPropTypeLocationNames[location];
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
	    }
	    for (var key in propValue) {
	      if (propValue.hasOwnProperty(key)) {
	        var error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key);
	        if (error instanceof Error) {
	          return error;
	        }
	      }
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createUnionTypeChecker(arrayOfTypeCheckers) {
	  if (!Array.isArray(arrayOfTypeCheckers)) {
	    return createChainableTypeChecker(function () {
	      return new Error('Invalid argument supplied to oneOfType, expected an instance of array.');
	    });
	  }

	  function validate(props, propName, componentName, location, propFullName) {
	    for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
	      var checker = arrayOfTypeCheckers[i];
	      if (checker(props, propName, componentName, location, propFullName) == null) {
	        return null;
	      }
	    }

	    var locationName = ReactPropTypeLocationNames[location];
	    return new Error('Invalid ' + locationName + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`.'));
	  }
	  return createChainableTypeChecker(validate);
	}

	function createNodeChecker() {
	  function validate(props, propName, componentName, location, propFullName) {
	    if (!isNode(props[propName])) {
	      var locationName = ReactPropTypeLocationNames[location];
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a ReactNode.'));
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function createShapeTypeChecker(shapeTypes) {
	  function validate(props, propName, componentName, location, propFullName) {
	    var propValue = props[propName];
	    var propType = getPropType(propValue);
	    if (propType !== 'object') {
	      var locationName = ReactPropTypeLocationNames[location];
	      return new Error('Invalid ' + locationName + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
	    }
	    for (var key in shapeTypes) {
	      var checker = shapeTypes[key];
	      if (!checker) {
	        continue;
	      }
	      var error = checker(propValue, key, componentName, location, propFullName + '.' + key);
	      if (error) {
	        return error;
	      }
	    }
	    return null;
	  }
	  return createChainableTypeChecker(validate);
	}

	function isNode(propValue) {
	  switch (typeof propValue) {
	    case 'number':
	    case 'string':
	    case 'undefined':
	      return true;
	    case 'boolean':
	      return !propValue;
	    case 'object':
	      if (Array.isArray(propValue)) {
	        return propValue.every(isNode);
	      }
	      if (propValue === null || ReactElement.isValidElement(propValue)) {
	        return true;
	      }

	      var iteratorFn = getIteratorFn(propValue);
	      if (iteratorFn) {
	        var iterator = iteratorFn.call(propValue);
	        var step;
	        if (iteratorFn !== propValue.entries) {
	          while (!(step = iterator.next()).done) {
	            if (!isNode(step.value)) {
	              return false;
	            }
	          }
	        } else {
	          // Iterator will provide entry [k,v] tuples rather than values.
	          while (!(step = iterator.next()).done) {
	            var entry = step.value;
	            if (entry) {
	              if (!isNode(entry[1])) {
	                return false;
	              }
	            }
	          }
	        }
	      } else {
	        return false;
	      }

	      return true;
	    default:
	      return false;
	  }
	}

	// Equivalent of `typeof` but with special handling for array and regexp.
	function getPropType(propValue) {
	  var propType = typeof propValue;
	  if (Array.isArray(propValue)) {
	    return 'array';
	  }
	  if (propValue instanceof RegExp) {
	    // Old webkits (at least until Android 4.0) return 'function' rather than
	    // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
	    // passes PropTypes.object.
	    return 'object';
	  }
	  return propType;
	}

	// This handles more types than `getPropType`. Only used for error messages.
	// See `createPrimitiveTypeChecker`.
	function getPreciseType(propValue) {
	  var propType = getPropType(propValue);
	  if (propType === 'object') {
	    if (propValue instanceof Date) {
	      return 'date';
	    } else if (propValue instanceof RegExp) {
	      return 'regexp';
	    }
	  }
	  return propType;
	}

	// Returns class name of the object, if any.
	function getClassName(propValue) {
	  if (!propValue.constructor || !propValue.constructor.name) {
	    return '<<anonymous>>';
	  }
	  return propValue.constructor.name;
	}

	module.exports = ReactPropTypes;

/***/ },
/* 108 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getIteratorFn
	 * @typechecks static-only
	 */

	'use strict';

	/* global Symbol */
	var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
	var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

	/**
	 * Returns the iterator method function contained on the iterable object.
	 *
	 * Be sure to invoke the function with the iterable as context:
	 *
	 *     var iteratorFn = getIteratorFn(myIterable);
	 *     if (iteratorFn) {
	 *       var iterator = iteratorFn.call(myIterable);
	 *       ...
	 *     }
	 *
	 * @param {?object} maybeIterable
	 * @return {?function}
	 */
	function getIteratorFn(maybeIterable) {
	  var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
	  if (typeof iteratorFn === 'function') {
	    return iteratorFn;
	  }
	}

	module.exports = getIteratorFn;

/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMOption
	 */

	'use strict';

	var ReactChildren = __webpack_require__(110);
	var ReactDOMSelect = __webpack_require__(112);

	var assign = __webpack_require__(39);
	var warning = __webpack_require__(25);

	var valueContextKey = ReactDOMSelect.valueContextKey;

	/**
	 * Implements an <option> native component that warns when `selected` is set.
	 */
	var ReactDOMOption = {
	  mountWrapper: function (inst, props, context) {
	    // TODO (yungsters): Remove support for `selected` in <option>.
	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(props.selected == null, 'Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.') : undefined;
	    }

	    // Look up whether this option is 'selected' via context
	    var selectValue = context[valueContextKey];

	    // If context key is null (e.g., no specified value or after initial mount)
	    // or missing (e.g., for <datalist>), we don't change props.selected
	    var selected = null;
	    if (selectValue != null) {
	      selected = false;
	      if (Array.isArray(selectValue)) {
	        // multiple
	        for (var i = 0; i < selectValue.length; i++) {
	          if ('' + selectValue[i] === '' + props.value) {
	            selected = true;
	            break;
	          }
	        }
	      } else {
	        selected = '' + selectValue === '' + props.value;
	      }
	    }

	    inst._wrapperState = { selected: selected };
	  },

	  getNativeProps: function (inst, props, context) {
	    var nativeProps = assign({ selected: undefined, children: undefined }, props);

	    // Read state only from initial mount because <select> updates value
	    // manually; we need the initial state only for server rendering
	    if (inst._wrapperState.selected != null) {
	      nativeProps.selected = inst._wrapperState.selected;
	    }

	    var content = '';

	    // Flatten children and warn if they aren't strings or numbers;
	    // invalid types are ignored.
	    ReactChildren.forEach(props.children, function (child) {
	      if (child == null) {
	        return;
	      }
	      if (typeof child === 'string' || typeof child === 'number') {
	        content += child;
	      } else {
	         false ? warning(false, 'Only strings and numbers are supported as <option> children.') : undefined;
	      }
	    });

	    if (content) {
	      nativeProps.children = content;
	    }

	    return nativeProps;
	  }

	};

	module.exports = ReactDOMOption;

/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactChildren
	 */

	'use strict';

	var PooledClass = __webpack_require__(56);
	var ReactElement = __webpack_require__(42);

	var emptyFunction = __webpack_require__(15);
	var traverseAllChildren = __webpack_require__(111);

	var twoArgumentPooler = PooledClass.twoArgumentPooler;
	var fourArgumentPooler = PooledClass.fourArgumentPooler;

	var userProvidedKeyEscapeRegex = /\/(?!\/)/g;
	function escapeUserProvidedKey(text) {
	  return ('' + text).replace(userProvidedKeyEscapeRegex, '//');
	}

	/**
	 * PooledClass representing the bookkeeping associated with performing a child
	 * traversal. Allows avoiding binding callbacks.
	 *
	 * @constructor ForEachBookKeeping
	 * @param {!function} forEachFunction Function to perform traversal with.
	 * @param {?*} forEachContext Context to perform context with.
	 */
	function ForEachBookKeeping(forEachFunction, forEachContext) {
	  this.func = forEachFunction;
	  this.context = forEachContext;
	  this.count = 0;
	}
	ForEachBookKeeping.prototype.destructor = function () {
	  this.func = null;
	  this.context = null;
	  this.count = 0;
	};
	PooledClass.addPoolingTo(ForEachBookKeeping, twoArgumentPooler);

	function forEachSingleChild(bookKeeping, child, name) {
	  var func = bookKeeping.func;
	  var context = bookKeeping.context;

	  func.call(context, child, bookKeeping.count++);
	}

	/**
	 * Iterates through children that are typically specified as `props.children`.
	 *
	 * The provided forEachFunc(child, index) will be called for each
	 * leaf child.
	 *
	 * @param {?*} children Children tree container.
	 * @param {function(*, int)} forEachFunc
	 * @param {*} forEachContext Context for forEachContext.
	 */
	function forEachChildren(children, forEachFunc, forEachContext) {
	  if (children == null) {
	    return children;
	  }
	  var traverseContext = ForEachBookKeeping.getPooled(forEachFunc, forEachContext);
	  traverseAllChildren(children, forEachSingleChild, traverseContext);
	  ForEachBookKeeping.release(traverseContext);
	}

	/**
	 * PooledClass representing the bookkeeping associated with performing a child
	 * mapping. Allows avoiding binding callbacks.
	 *
	 * @constructor MapBookKeeping
	 * @param {!*} mapResult Object containing the ordered map of results.
	 * @param {!function} mapFunction Function to perform mapping with.
	 * @param {?*} mapContext Context to perform mapping with.
	 */
	function MapBookKeeping(mapResult, keyPrefix, mapFunction, mapContext) {
	  this.result = mapResult;
	  this.keyPrefix = keyPrefix;
	  this.func = mapFunction;
	  this.context = mapContext;
	  this.count = 0;
	}
	MapBookKeeping.prototype.destructor = function () {
	  this.result = null;
	  this.keyPrefix = null;
	  this.func = null;
	  this.context = null;
	  this.count = 0;
	};
	PooledClass.addPoolingTo(MapBookKeeping, fourArgumentPooler);

	function mapSingleChildIntoContext(bookKeeping, child, childKey) {
	  var result = bookKeeping.result;
	  var keyPrefix = bookKeeping.keyPrefix;
	  var func = bookKeeping.func;
	  var context = bookKeeping.context;

	  var mappedChild = func.call(context, child, bookKeeping.count++);
	  if (Array.isArray(mappedChild)) {
	    mapIntoWithKeyPrefixInternal(mappedChild, result, childKey, emptyFunction.thatReturnsArgument);
	  } else if (mappedChild != null) {
	    if (ReactElement.isValidElement(mappedChild)) {
	      mappedChild = ReactElement.cloneAndReplaceKey(mappedChild,
	      // Keep both the (mapped) and old keys if they differ, just as
	      // traverseAllChildren used to do for objects as children
	      keyPrefix + (mappedChild !== child ? escapeUserProvidedKey(mappedChild.key || '') + '/' : '') + childKey);
	    }
	    result.push(mappedChild);
	  }
	}

	function mapIntoWithKeyPrefixInternal(children, array, prefix, func, context) {
	  var escapedPrefix = '';
	  if (prefix != null) {
	    escapedPrefix = escapeUserProvidedKey(prefix) + '/';
	  }
	  var traverseContext = MapBookKeeping.getPooled(array, escapedPrefix, func, context);
	  traverseAllChildren(children, mapSingleChildIntoContext, traverseContext);
	  MapBookKeeping.release(traverseContext);
	}

	/**
	 * Maps children that are typically specified as `props.children`.
	 *
	 * The provided mapFunction(child, key, index) will be called for each
	 * leaf child.
	 *
	 * @param {?*} children Children tree container.
	 * @param {function(*, int)} func The map function.
	 * @param {*} context Context for mapFunction.
	 * @return {object} Object containing the ordered map of results.
	 */
	function mapChildren(children, func, context) {
	  if (children == null) {
	    return children;
	  }
	  var result = [];
	  mapIntoWithKeyPrefixInternal(children, result, null, func, context);
	  return result;
	}

	function forEachSingleChildDummy(traverseContext, child, name) {
	  return null;
	}

	/**
	 * Count the number of children that are typically specified as
	 * `props.children`.
	 *
	 * @param {?*} children Children tree container.
	 * @return {number} The number of children.
	 */
	function countChildren(children, context) {
	  return traverseAllChildren(children, forEachSingleChildDummy, null);
	}

	/**
	 * Flatten a children object (typically specified as `props.children`) and
	 * return an array with appropriately re-keyed children.
	 */
	function toArray(children) {
	  var result = [];
	  mapIntoWithKeyPrefixInternal(children, result, null, emptyFunction.thatReturnsArgument);
	  return result;
	}

	var ReactChildren = {
	  forEach: forEachChildren,
	  map: mapChildren,
	  mapIntoWithKeyPrefixInternal: mapIntoWithKeyPrefixInternal,
	  count: countChildren,
	  toArray: toArray
	};

	module.exports = ReactChildren;

/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule traverseAllChildren
	 */

	'use strict';

	var ReactCurrentOwner = __webpack_require__(5);
	var ReactElement = __webpack_require__(42);
	var ReactInstanceHandles = __webpack_require__(45);

	var getIteratorFn = __webpack_require__(108);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	var SEPARATOR = ReactInstanceHandles.SEPARATOR;
	var SUBSEPARATOR = ':';

	/**
	 * TODO: Test that a single child and an array with one item have the same key
	 * pattern.
	 */

	var userProvidedKeyEscaperLookup = {
	  '=': '=0',
	  '.': '=1',
	  ':': '=2'
	};

	var userProvidedKeyEscapeRegex = /[=.:]/g;

	var didWarnAboutMaps = false;

	function userProvidedKeyEscaper(match) {
	  return userProvidedKeyEscaperLookup[match];
	}

	/**
	 * Generate a key string that identifies a component within a set.
	 *
	 * @param {*} component A component that could contain a manual key.
	 * @param {number} index Index that is used if a manual key is not provided.
	 * @return {string}
	 */
	function getComponentKey(component, index) {
	  if (component && component.key != null) {
	    // Explicit key
	    return wrapUserProvidedKey(component.key);
	  }
	  // Implicit key determined by the index in the set
	  return index.toString(36);
	}

	/**
	 * Escape a component key so that it is safe to use in a reactid.
	 *
	 * @param {*} text Component key to be escaped.
	 * @return {string} An escaped string.
	 */
	function escapeUserProvidedKey(text) {
	  return ('' + text).replace(userProvidedKeyEscapeRegex, userProvidedKeyEscaper);
	}

	/**
	 * Wrap a `key` value explicitly provided by the user to distinguish it from
	 * implicitly-generated keys generated by a component's index in its parent.
	 *
	 * @param {string} key Value of a user-provided `key` attribute
	 * @return {string}
	 */
	function wrapUserProvidedKey(key) {
	  return '$' + escapeUserProvidedKey(key);
	}

	/**
	 * @param {?*} children Children tree container.
	 * @param {!string} nameSoFar Name of the key path so far.
	 * @param {!function} callback Callback to invoke with each child found.
	 * @param {?*} traverseContext Used to pass information throughout the traversal
	 * process.
	 * @return {!number} The number of children in this subtree.
	 */
	function traverseAllChildrenImpl(children, nameSoFar, callback, traverseContext) {
	  var type = typeof children;

	  if (type === 'undefined' || type === 'boolean') {
	    // All of the above are perceived as null.
	    children = null;
	  }

	  if (children === null || type === 'string' || type === 'number' || ReactElement.isValidElement(children)) {
	    callback(traverseContext, children,
	    // If it's the only child, treat the name as if it was wrapped in an array
	    // so that it's consistent if the number of children grows.
	    nameSoFar === '' ? SEPARATOR + getComponentKey(children, 0) : nameSoFar);
	    return 1;
	  }

	  var child;
	  var nextName;
	  var subtreeCount = 0; // Count of children found in the current subtree.
	  var nextNamePrefix = nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

	  if (Array.isArray(children)) {
	    for (var i = 0; i < children.length; i++) {
	      child = children[i];
	      nextName = nextNamePrefix + getComponentKey(child, i);
	      subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
	    }
	  } else {
	    var iteratorFn = getIteratorFn(children);
	    if (iteratorFn) {
	      var iterator = iteratorFn.call(children);
	      var step;
	      if (iteratorFn !== children.entries) {
	        var ii = 0;
	        while (!(step = iterator.next()).done) {
	          child = step.value;
	          nextName = nextNamePrefix + getComponentKey(child, ii++);
	          subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
	        }
	      } else {
	        if (false) {
	          process.env.NODE_ENV !== 'production' ? warning(didWarnAboutMaps, 'Using Maps as children is not yet fully supported. It is an ' + 'experimental feature that might be removed. Convert it to a ' + 'sequence / iterable of keyed ReactElements instead.') : undefined;
	          didWarnAboutMaps = true;
	        }
	        // Iterator will provide entry [k,v] tuples rather than values.
	        while (!(step = iterator.next()).done) {
	          var entry = step.value;
	          if (entry) {
	            child = entry[1];
	            nextName = nextNamePrefix + wrapUserProvidedKey(entry[0]) + SUBSEPARATOR + getComponentKey(child, 0);
	            subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
	          }
	        }
	      }
	    } else if (type === 'object') {
	      var addendum = '';
	      if (false) {
	        addendum = ' If you meant to render a collection of children, use an array ' + 'instead or wrap the object using createFragment(object) from the ' + 'React add-ons.';
	        if (children._isReactElement) {
	          addendum = ' It looks like you\'re using an element created by a different ' + 'version of React. Make sure to use only one copy of React.';
	        }
	        if (ReactCurrentOwner.current) {
	          var name = ReactCurrentOwner.current.getName();
	          if (name) {
	            addendum += ' Check the render method of `' + name + '`.';
	          }
	        }
	      }
	      var childrenString = String(children);
	       true ?  false ? invariant(false, 'Objects are not valid as a React child (found: %s).%s', childrenString === '[object Object]' ? 'object with keys {' + Object.keys(children).join(', ') + '}' : childrenString, addendum) : invariant(false) : undefined;
	    }
	  }

	  return subtreeCount;
	}

	/**
	 * Traverses children that are typically specified as `props.children`, but
	 * might also be specified through attributes:
	 *
	 * - `traverseAllChildren(this.props.children, ...)`
	 * - `traverseAllChildren(this.props.leftPanelChildren, ...)`
	 *
	 * The `traverseContext` is an optional argument that is passed through the
	 * entire traversal. It can be used to store accumulations or anything else that
	 * the callback might find relevant.
	 *
	 * @param {?*} children Children tree object.
	 * @param {!function} callback To invoke upon traversing each child.
	 * @param {?*} traverseContext Context for traversal.
	 * @return {!number} The number of children in this subtree.
	 */
	function traverseAllChildren(children, callback, traverseContext) {
	  if (children == null) {
	    return 0;
	  }

	  return traverseAllChildrenImpl(children, '', callback, traverseContext);
	}

	module.exports = traverseAllChildren;

/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMSelect
	 */

	'use strict';

	var LinkedValueUtils = __webpack_require__(106);
	var ReactMount = __webpack_require__(28);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var warning = __webpack_require__(25);

	var valueContextKey = '__ReactDOMSelect_value$' + Math.random().toString(36).slice(2);

	function updateOptionsIfPendingUpdateAndMounted() {
	  if (this._rootNodeID && this._wrapperState.pendingUpdate) {
	    this._wrapperState.pendingUpdate = false;

	    var props = this._currentElement.props;
	    var value = LinkedValueUtils.getValue(props);

	    if (value != null) {
	      updateOptions(this, Boolean(props.multiple), value);
	    }
	  }
	}

	function getDeclarationErrorAddendum(owner) {
	  if (owner) {
	    var name = owner.getName();
	    if (name) {
	      return ' Check the render method of `' + name + '`.';
	    }
	  }
	  return '';
	}

	var valuePropNames = ['value', 'defaultValue'];

	/**
	 * Validation function for `value` and `defaultValue`.
	 * @private
	 */
	function checkSelectPropTypes(inst, props) {
	  var owner = inst._currentElement._owner;
	  LinkedValueUtils.checkPropTypes('select', props, owner);

	  for (var i = 0; i < valuePropNames.length; i++) {
	    var propName = valuePropNames[i];
	    if (props[propName] == null) {
	      continue;
	    }
	    if (props.multiple) {
	       false ? warning(Array.isArray(props[propName]), 'The `%s` prop supplied to <select> must be an array if ' + '`multiple` is true.%s', propName, getDeclarationErrorAddendum(owner)) : undefined;
	    } else {
	       false ? warning(!Array.isArray(props[propName]), 'The `%s` prop supplied to <select> must be a scalar ' + 'value if `multiple` is false.%s', propName, getDeclarationErrorAddendum(owner)) : undefined;
	    }
	  }
	}

	/**
	 * @param {ReactDOMComponent} inst
	 * @param {boolean} multiple
	 * @param {*} propValue A stringable (with `multiple`, a list of stringables).
	 * @private
	 */
	function updateOptions(inst, multiple, propValue) {
	  var selectedValue, i;
	  var options = ReactMount.getNode(inst._rootNodeID).options;

	  if (multiple) {
	    selectedValue = {};
	    for (i = 0; i < propValue.length; i++) {
	      selectedValue['' + propValue[i]] = true;
	    }
	    for (i = 0; i < options.length; i++) {
	      var selected = selectedValue.hasOwnProperty(options[i].value);
	      if (options[i].selected !== selected) {
	        options[i].selected = selected;
	      }
	    }
	  } else {
	    // Do not set `select.value` as exact behavior isn't consistent across all
	    // browsers for all cases.
	    selectedValue = '' + propValue;
	    for (i = 0; i < options.length; i++) {
	      if (options[i].value === selectedValue) {
	        options[i].selected = true;
	        return;
	      }
	    }
	    if (options.length) {
	      options[0].selected = true;
	    }
	  }
	}

	/**
	 * Implements a <select> native component that allows optionally setting the
	 * props `value` and `defaultValue`. If `multiple` is false, the prop must be a
	 * stringable. If `multiple` is true, the prop must be an array of stringables.
	 *
	 * If `value` is not supplied (or null/undefined), user actions that change the
	 * selected option will trigger updates to the rendered options.
	 *
	 * If it is supplied (and not null/undefined), the rendered options will not
	 * update in response to user actions. Instead, the `value` prop must change in
	 * order for the rendered options to update.
	 *
	 * If `defaultValue` is provided, any options with the supplied values will be
	 * selected.
	 */
	var ReactDOMSelect = {
	  valueContextKey: valueContextKey,

	  getNativeProps: function (inst, props, context) {
	    return assign({}, props, {
	      onChange: inst._wrapperState.onChange,
	      value: undefined
	    });
	  },

	  mountWrapper: function (inst, props) {
	    if (false) {
	      checkSelectPropTypes(inst, props);
	    }

	    var value = LinkedValueUtils.getValue(props);
	    inst._wrapperState = {
	      pendingUpdate: false,
	      initialValue: value != null ? value : props.defaultValue,
	      onChange: _handleChange.bind(inst),
	      wasMultiple: Boolean(props.multiple)
	    };
	  },

	  processChildContext: function (inst, props, context) {
	    // Pass down initial value so initial generated markup has correct
	    // `selected` attributes
	    var childContext = assign({}, context);
	    childContext[valueContextKey] = inst._wrapperState.initialValue;
	    return childContext;
	  },

	  postUpdateWrapper: function (inst) {
	    var props = inst._currentElement.props;

	    // After the initial mount, we control selected-ness manually so don't pass
	    // the context value down
	    inst._wrapperState.initialValue = undefined;

	    var wasMultiple = inst._wrapperState.wasMultiple;
	    inst._wrapperState.wasMultiple = Boolean(props.multiple);

	    var value = LinkedValueUtils.getValue(props);
	    if (value != null) {
	      inst._wrapperState.pendingUpdate = false;
	      updateOptions(inst, Boolean(props.multiple), value);
	    } else if (wasMultiple !== Boolean(props.multiple)) {
	      // For simplicity, reapply `defaultValue` if `multiple` is toggled.
	      if (props.defaultValue != null) {
	        updateOptions(inst, Boolean(props.multiple), props.defaultValue);
	      } else {
	        // Revert the select back to its default unselected state.
	        updateOptions(inst, Boolean(props.multiple), props.multiple ? [] : '');
	      }
	    }
	  }
	};

	function _handleChange(event) {
	  var props = this._currentElement.props;
	  var returnValue = LinkedValueUtils.executeOnChange(props, event);

	  this._wrapperState.pendingUpdate = true;
	  ReactUpdates.asap(updateOptionsIfPendingUpdateAndMounted, this);
	  return returnValue;
	}

	module.exports = ReactDOMSelect;

/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMTextarea
	 */

	'use strict';

	var LinkedValueUtils = __webpack_require__(106);
	var ReactDOMIDOperations = __webpack_require__(27);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	function forceUpdateIfMounted() {
	  if (this._rootNodeID) {
	    // DOM component is still mounted; update
	    ReactDOMTextarea.updateWrapper(this);
	  }
	}

	/**
	 * Implements a <textarea> native component that allows setting `value`, and
	 * `defaultValue`. This differs from the traditional DOM API because value is
	 * usually set as PCDATA children.
	 *
	 * If `value` is not supplied (or null/undefined), user actions that affect the
	 * value will trigger updates to the element.
	 *
	 * If `value` is supplied (and not null/undefined), the rendered element will
	 * not trigger updates to the element. Instead, the `value` prop must change in
	 * order for the rendered element to be updated.
	 *
	 * The rendered element will be initialized with an empty value, the prop
	 * `defaultValue` if specified, or the children content (deprecated).
	 */
	var ReactDOMTextarea = {
	  getNativeProps: function (inst, props, context) {
	    !(props.dangerouslySetInnerHTML == null) ?  false ? invariant(false, '`dangerouslySetInnerHTML` does not make sense on <textarea>.') : invariant(false) : undefined;

	    // Always set children to the same thing. In IE9, the selection range will
	    // get reset if `textContent` is mutated.
	    var nativeProps = assign({}, props, {
	      defaultValue: undefined,
	      value: undefined,
	      children: inst._wrapperState.initialValue,
	      onChange: inst._wrapperState.onChange
	    });

	    return nativeProps;
	  },

	  mountWrapper: function (inst, props) {
	    if (false) {
	      LinkedValueUtils.checkPropTypes('textarea', props, inst._currentElement._owner);
	    }

	    var defaultValue = props.defaultValue;
	    // TODO (yungsters): Remove support for children content in <textarea>.
	    var children = props.children;
	    if (children != null) {
	      if (false) {
	        process.env.NODE_ENV !== 'production' ? warning(false, 'Use the `defaultValue` or `value` props instead of setting ' + 'children on <textarea>.') : undefined;
	      }
	      !(defaultValue == null) ?  false ? invariant(false, 'If you supply `defaultValue` on a <textarea>, do not pass children.') : invariant(false) : undefined;
	      if (Array.isArray(children)) {
	        !(children.length <= 1) ?  false ? invariant(false, '<textarea> can only have at most one child.') : invariant(false) : undefined;
	        children = children[0];
	      }

	      defaultValue = '' + children;
	    }
	    if (defaultValue == null) {
	      defaultValue = '';
	    }
	    var value = LinkedValueUtils.getValue(props);

	    inst._wrapperState = {
	      // We save the initial value so that `ReactDOMComponent` doesn't update
	      // `textContent` (unnecessary since we update value).
	      // The initial value can be a boolean or object so that's why it's
	      // forced to be a string.
	      initialValue: '' + (value != null ? value : defaultValue),
	      onChange: _handleChange.bind(inst)
	    };
	  },

	  updateWrapper: function (inst) {
	    var props = inst._currentElement.props;
	    var value = LinkedValueUtils.getValue(props);
	    if (value != null) {
	      // Cast `value` to a string to ensure the value is set correctly. While
	      // browsers typically do this as necessary, jsdom doesn't.
	      ReactDOMIDOperations.updatePropertyByID(inst._rootNodeID, 'value', '' + value);
	    }
	  }
	};

	function _handleChange(event) {
	  var props = this._currentElement.props;
	  var returnValue = LinkedValueUtils.executeOnChange(props, event);
	  ReactUpdates.asap(forceUpdateIfMounted, this);
	  return returnValue;
	}

	module.exports = ReactDOMTextarea;

/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactMultiChild
	 * @typechecks static-only
	 */

	'use strict';

	var ReactComponentEnvironment = __webpack_require__(64);
	var ReactMultiChildUpdateTypes = __webpack_require__(16);

	var ReactCurrentOwner = __webpack_require__(5);
	var ReactReconciler = __webpack_require__(50);
	var ReactChildReconciler = __webpack_require__(115);

	var flattenChildren = __webpack_require__(116);

	/**
	 * Updating children of a component may trigger recursive updates. The depth is
	 * used to batch recursive updates to render markup more efficiently.
	 *
	 * @type {number}
	 * @private
	 */
	var updateDepth = 0;

	/**
	 * Queue of update configuration objects.
	 *
	 * Each object has a `type` property that is in `ReactMultiChildUpdateTypes`.
	 *
	 * @type {array<object>}
	 * @private
	 */
	var updateQueue = [];

	/**
	 * Queue of markup to be rendered.
	 *
	 * @type {array<string>}
	 * @private
	 */
	var markupQueue = [];

	/**
	 * Enqueues markup to be rendered and inserted at a supplied index.
	 *
	 * @param {string} parentID ID of the parent component.
	 * @param {string} markup Markup that renders into an element.
	 * @param {number} toIndex Destination index.
	 * @private
	 */
	function enqueueInsertMarkup(parentID, markup, toIndex) {
	  // NOTE: Null values reduce hidden classes.
	  updateQueue.push({
	    parentID: parentID,
	    parentNode: null,
	    type: ReactMultiChildUpdateTypes.INSERT_MARKUP,
	    markupIndex: markupQueue.push(markup) - 1,
	    content: null,
	    fromIndex: null,
	    toIndex: toIndex
	  });
	}

	/**
	 * Enqueues moving an existing element to another index.
	 *
	 * @param {string} parentID ID of the parent component.
	 * @param {number} fromIndex Source index of the existing element.
	 * @param {number} toIndex Destination index of the element.
	 * @private
	 */
	function enqueueMove(parentID, fromIndex, toIndex) {
	  // NOTE: Null values reduce hidden classes.
	  updateQueue.push({
	    parentID: parentID,
	    parentNode: null,
	    type: ReactMultiChildUpdateTypes.MOVE_EXISTING,
	    markupIndex: null,
	    content: null,
	    fromIndex: fromIndex,
	    toIndex: toIndex
	  });
	}

	/**
	 * Enqueues removing an element at an index.
	 *
	 * @param {string} parentID ID of the parent component.
	 * @param {number} fromIndex Index of the element to remove.
	 * @private
	 */
	function enqueueRemove(parentID, fromIndex) {
	  // NOTE: Null values reduce hidden classes.
	  updateQueue.push({
	    parentID: parentID,
	    parentNode: null,
	    type: ReactMultiChildUpdateTypes.REMOVE_NODE,
	    markupIndex: null,
	    content: null,
	    fromIndex: fromIndex,
	    toIndex: null
	  });
	}

	/**
	 * Enqueues setting the markup of a node.
	 *
	 * @param {string} parentID ID of the parent component.
	 * @param {string} markup Markup that renders into an element.
	 * @private
	 */
	function enqueueSetMarkup(parentID, markup) {
	  // NOTE: Null values reduce hidden classes.
	  updateQueue.push({
	    parentID: parentID,
	    parentNode: null,
	    type: ReactMultiChildUpdateTypes.SET_MARKUP,
	    markupIndex: null,
	    content: markup,
	    fromIndex: null,
	    toIndex: null
	  });
	}

	/**
	 * Enqueues setting the text content.
	 *
	 * @param {string} parentID ID of the parent component.
	 * @param {string} textContent Text content to set.
	 * @private
	 */
	function enqueueTextContent(parentID, textContent) {
	  // NOTE: Null values reduce hidden classes.
	  updateQueue.push({
	    parentID: parentID,
	    parentNode: null,
	    type: ReactMultiChildUpdateTypes.TEXT_CONTENT,
	    markupIndex: null,
	    content: textContent,
	    fromIndex: null,
	    toIndex: null
	  });
	}

	/**
	 * Processes any enqueued updates.
	 *
	 * @private
	 */
	function processQueue() {
	  if (updateQueue.length) {
	    ReactComponentEnvironment.processChildrenUpdates(updateQueue, markupQueue);
	    clearQueue();
	  }
	}

	/**
	 * Clears any enqueued updates.
	 *
	 * @private
	 */
	function clearQueue() {
	  updateQueue.length = 0;
	  markupQueue.length = 0;
	}

	/**
	 * ReactMultiChild are capable of reconciling multiple children.
	 *
	 * @class ReactMultiChild
	 * @internal
	 */
	var ReactMultiChild = {

	  /**
	   * Provides common functionality for components that must reconcile multiple
	   * children. This is used by `ReactDOMComponent` to mount, update, and
	   * unmount child components.
	   *
	   * @lends {ReactMultiChild.prototype}
	   */
	  Mixin: {

	    _reconcilerInstantiateChildren: function (nestedChildren, transaction, context) {
	      if (false) {
	        if (this._currentElement) {
	          try {
	            ReactCurrentOwner.current = this._currentElement._owner;
	            return ReactChildReconciler.instantiateChildren(nestedChildren, transaction, context);
	          } finally {
	            ReactCurrentOwner.current = null;
	          }
	        }
	      }
	      return ReactChildReconciler.instantiateChildren(nestedChildren, transaction, context);
	    },

	    _reconcilerUpdateChildren: function (prevChildren, nextNestedChildrenElements, transaction, context) {
	      var nextChildren;
	      if (false) {
	        if (this._currentElement) {
	          try {
	            ReactCurrentOwner.current = this._currentElement._owner;
	            nextChildren = flattenChildren(nextNestedChildrenElements);
	          } finally {
	            ReactCurrentOwner.current = null;
	          }
	          return ReactChildReconciler.updateChildren(prevChildren, nextChildren, transaction, context);
	        }
	      }
	      nextChildren = flattenChildren(nextNestedChildrenElements);
	      return ReactChildReconciler.updateChildren(prevChildren, nextChildren, transaction, context);
	    },

	    /**
	     * Generates a "mount image" for each of the supplied children. In the case
	     * of `ReactDOMComponent`, a mount image is a string of markup.
	     *
	     * @param {?object} nestedChildren Nested child maps.
	     * @return {array} An array of mounted representations.
	     * @internal
	     */
	    mountChildren: function (nestedChildren, transaction, context) {
	      var children = this._reconcilerInstantiateChildren(nestedChildren, transaction, context);
	      this._renderedChildren = children;
	      var mountImages = [];
	      var index = 0;
	      for (var name in children) {
	        if (children.hasOwnProperty(name)) {
	          var child = children[name];
	          // Inlined for performance, see `ReactInstanceHandles.createReactID`.
	          var rootID = this._rootNodeID + name;
	          var mountImage = ReactReconciler.mountComponent(child, rootID, transaction, context);
	          child._mountIndex = index++;
	          mountImages.push(mountImage);
	        }
	      }
	      return mountImages;
	    },

	    /**
	     * Replaces any rendered children with a text content string.
	     *
	     * @param {string} nextContent String of content.
	     * @internal
	     */
	    updateTextContent: function (nextContent) {
	      updateDepth++;
	      var errorThrown = true;
	      try {
	        var prevChildren = this._renderedChildren;
	        // Remove any rendered children.
	        ReactChildReconciler.unmountChildren(prevChildren);
	        // TODO: The setTextContent operation should be enough
	        for (var name in prevChildren) {
	          if (prevChildren.hasOwnProperty(name)) {
	            this._unmountChild(prevChildren[name]);
	          }
	        }
	        // Set new text content.
	        this.setTextContent(nextContent);
	        errorThrown = false;
	      } finally {
	        updateDepth--;
	        if (!updateDepth) {
	          if (errorThrown) {
	            clearQueue();
	          } else {
	            processQueue();
	          }
	        }
	      }
	    },

	    /**
	     * Replaces any rendered children with a markup string.
	     *
	     * @param {string} nextMarkup String of markup.
	     * @internal
	     */
	    updateMarkup: function (nextMarkup) {
	      updateDepth++;
	      var errorThrown = true;
	      try {
	        var prevChildren = this._renderedChildren;
	        // Remove any rendered children.
	        ReactChildReconciler.unmountChildren(prevChildren);
	        for (var name in prevChildren) {
	          if (prevChildren.hasOwnProperty(name)) {
	            this._unmountChildByName(prevChildren[name], name);
	          }
	        }
	        this.setMarkup(nextMarkup);
	        errorThrown = false;
	      } finally {
	        updateDepth--;
	        if (!updateDepth) {
	          if (errorThrown) {
	            clearQueue();
	          } else {
	            processQueue();
	          }
	        }
	      }
	    },

	    /**
	     * Updates the rendered children with new children.
	     *
	     * @param {?object} nextNestedChildrenElements Nested child element maps.
	     * @param {ReactReconcileTransaction} transaction
	     * @internal
	     */
	    updateChildren: function (nextNestedChildrenElements, transaction, context) {
	      updateDepth++;
	      var errorThrown = true;
	      try {
	        this._updateChildren(nextNestedChildrenElements, transaction, context);
	        errorThrown = false;
	      } finally {
	        updateDepth--;
	        if (!updateDepth) {
	          if (errorThrown) {
	            clearQueue();
	          } else {
	            processQueue();
	          }
	        }
	      }
	    },

	    /**
	     * Improve performance by isolating this hot code path from the try/catch
	     * block in `updateChildren`.
	     *
	     * @param {?object} nextNestedChildrenElements Nested child element maps.
	     * @param {ReactReconcileTransaction} transaction
	     * @final
	     * @protected
	     */
	    _updateChildren: function (nextNestedChildrenElements, transaction, context) {
	      var prevChildren = this._renderedChildren;
	      var nextChildren = this._reconcilerUpdateChildren(prevChildren, nextNestedChildrenElements, transaction, context);
	      this._renderedChildren = nextChildren;
	      if (!nextChildren && !prevChildren) {
	        return;
	      }
	      var name;
	      // `nextIndex` will increment for each child in `nextChildren`, but
	      // `lastIndex` will be the last index visited in `prevChildren`.
	      var lastIndex = 0;
	      var nextIndex = 0;
	      for (name in nextChildren) {
	        if (!nextChildren.hasOwnProperty(name)) {
	          continue;
	        }
	        var prevChild = prevChildren && prevChildren[name];
	        var nextChild = nextChildren[name];
	        if (prevChild === nextChild) {
	          this.moveChild(prevChild, nextIndex, lastIndex);
	          lastIndex = Math.max(prevChild._mountIndex, lastIndex);
	          prevChild._mountIndex = nextIndex;
	        } else {
	          if (prevChild) {
	            // Update `lastIndex` before `_mountIndex` gets unset by unmounting.
	            lastIndex = Math.max(prevChild._mountIndex, lastIndex);
	            this._unmountChild(prevChild);
	          }
	          // The child must be instantiated before it's mounted.
	          this._mountChildByNameAtIndex(nextChild, name, nextIndex, transaction, context);
	        }
	        nextIndex++;
	      }
	      // Remove children that are no longer present.
	      for (name in prevChildren) {
	        if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
	          this._unmountChild(prevChildren[name]);
	        }
	      }
	    },

	    /**
	     * Unmounts all rendered children. This should be used to clean up children
	     * when this component is unmounted.
	     *
	     * @internal
	     */
	    unmountChildren: function () {
	      var renderedChildren = this._renderedChildren;
	      ReactChildReconciler.unmountChildren(renderedChildren);
	      this._renderedChildren = null;
	    },

	    /**
	     * Moves a child component to the supplied index.
	     *
	     * @param {ReactComponent} child Component to move.
	     * @param {number} toIndex Destination index of the element.
	     * @param {number} lastIndex Last index visited of the siblings of `child`.
	     * @protected
	     */
	    moveChild: function (child, toIndex, lastIndex) {
	      // If the index of `child` is less than `lastIndex`, then it needs to
	      // be moved. Otherwise, we do not need to move it because a child will be
	      // inserted or moved before `child`.
	      if (child._mountIndex < lastIndex) {
	        enqueueMove(this._rootNodeID, child._mountIndex, toIndex);
	      }
	    },

	    /**
	     * Creates a child component.
	     *
	     * @param {ReactComponent} child Component to create.
	     * @param {string} mountImage Markup to insert.
	     * @protected
	     */
	    createChild: function (child, mountImage) {
	      enqueueInsertMarkup(this._rootNodeID, mountImage, child._mountIndex);
	    },

	    /**
	     * Removes a child component.
	     *
	     * @param {ReactComponent} child Child to remove.
	     * @protected
	     */
	    removeChild: function (child) {
	      enqueueRemove(this._rootNodeID, child._mountIndex);
	    },

	    /**
	     * Sets this text content string.
	     *
	     * @param {string} textContent Text content to set.
	     * @protected
	     */
	    setTextContent: function (textContent) {
	      enqueueTextContent(this._rootNodeID, textContent);
	    },

	    /**
	     * Sets this markup string.
	     *
	     * @param {string} markup Markup to set.
	     * @protected
	     */
	    setMarkup: function (markup) {
	      enqueueSetMarkup(this._rootNodeID, markup);
	    },

	    /**
	     * Mounts a child with the supplied name.
	     *
	     * NOTE: This is part of `updateChildren` and is here for readability.
	     *
	     * @param {ReactComponent} child Component to mount.
	     * @param {string} name Name of the child.
	     * @param {number} index Index at which to insert the child.
	     * @param {ReactReconcileTransaction} transaction
	     * @private
	     */
	    _mountChildByNameAtIndex: function (child, name, index, transaction, context) {
	      // Inlined for performance, see `ReactInstanceHandles.createReactID`.
	      var rootID = this._rootNodeID + name;
	      var mountImage = ReactReconciler.mountComponent(child, rootID, transaction, context);
	      child._mountIndex = index;
	      this.createChild(child, mountImage);
	    },

	    /**
	     * Unmounts a rendered child.
	     *
	     * NOTE: This is part of `updateChildren` and is here for readability.
	     *
	     * @param {ReactComponent} child Component to unmount.
	     * @private
	     */
	    _unmountChild: function (child) {
	      this.removeChild(child);
	      child._mountIndex = null;
	    }

	  }

	};

	module.exports = ReactMultiChild;

/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactChildReconciler
	 * @typechecks static-only
	 */

	'use strict';

	var ReactReconciler = __webpack_require__(50);

	var instantiateReactComponent = __webpack_require__(62);
	var shouldUpdateReactComponent = __webpack_require__(67);
	var traverseAllChildren = __webpack_require__(111);
	var warning = __webpack_require__(25);

	function instantiateChild(childInstances, child, name) {
	  // We found a component instance.
	  var keyUnique = childInstances[name] === undefined;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(keyUnique, 'flattenChildren(...): Encountered two children with the same key, ' + '`%s`. Child keys must be unique; when two children share a key, only ' + 'the first child will be used.', name) : undefined;
	  }
	  if (child != null && keyUnique) {
	    childInstances[name] = instantiateReactComponent(child, null);
	  }
	}

	/**
	 * ReactChildReconciler provides helpers for initializing or updating a set of
	 * children. Its output is suitable for passing it onto ReactMultiChild which
	 * does diffed reordering and insertion.
	 */
	var ReactChildReconciler = {
	  /**
	   * Generates a "mount image" for each of the supplied children. In the case
	   * of `ReactDOMComponent`, a mount image is a string of markup.
	   *
	   * @param {?object} nestedChildNodes Nested child maps.
	   * @return {?object} A set of child instances.
	   * @internal
	   */
	  instantiateChildren: function (nestedChildNodes, transaction, context) {
	    if (nestedChildNodes == null) {
	      return null;
	    }
	    var childInstances = {};
	    traverseAllChildren(nestedChildNodes, instantiateChild, childInstances);
	    return childInstances;
	  },

	  /**
	   * Updates the rendered children and returns a new set of children.
	   *
	   * @param {?object} prevChildren Previously initialized set of children.
	   * @param {?object} nextChildren Flat child element maps.
	   * @param {ReactReconcileTransaction} transaction
	   * @param {object} context
	   * @return {?object} A new set of child instances.
	   * @internal
	   */
	  updateChildren: function (prevChildren, nextChildren, transaction, context) {
	    // We currently don't have a way to track moves here but if we use iterators
	    // instead of for..in we can zip the iterators and check if an item has
	    // moved.
	    // TODO: If nothing has changed, return the prevChildren object so that we
	    // can quickly bailout if nothing has changed.
	    if (!nextChildren && !prevChildren) {
	      return null;
	    }
	    var name;
	    for (name in nextChildren) {
	      if (!nextChildren.hasOwnProperty(name)) {
	        continue;
	      }
	      var prevChild = prevChildren && prevChildren[name];
	      var prevElement = prevChild && prevChild._currentElement;
	      var nextElement = nextChildren[name];
	      if (prevChild != null && shouldUpdateReactComponent(prevElement, nextElement)) {
	        ReactReconciler.receiveComponent(prevChild, nextElement, transaction, context);
	        nextChildren[name] = prevChild;
	      } else {
	        if (prevChild) {
	          ReactReconciler.unmountComponent(prevChild, name);
	        }
	        // The child must be instantiated before it's mounted.
	        var nextChildInstance = instantiateReactComponent(nextElement, null);
	        nextChildren[name] = nextChildInstance;
	      }
	    }
	    // Unmount children that are no longer present.
	    for (name in prevChildren) {
	      if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
	        ReactReconciler.unmountComponent(prevChildren[name]);
	      }
	    }
	    return nextChildren;
	  },

	  /**
	   * Unmounts all rendered children. This should be used to clean up children
	   * when this component is unmounted.
	   *
	   * @param {?object} renderedChildren Previously initialized set of children.
	   * @internal
	   */
	  unmountChildren: function (renderedChildren) {
	    for (var name in renderedChildren) {
	      if (renderedChildren.hasOwnProperty(name)) {
	        var renderedChild = renderedChildren[name];
	        ReactReconciler.unmountComponent(renderedChild);
	      }
	    }
	  }

	};

	module.exports = ReactChildReconciler;

/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule flattenChildren
	 */

	'use strict';

	var traverseAllChildren = __webpack_require__(111);
	var warning = __webpack_require__(25);

	/**
	 * @param {function} traverseContext Context passed through traversal.
	 * @param {?ReactComponent} child React child component.
	 * @param {!string} name String name of key path to child.
	 */
	function flattenSingleChildIntoContext(traverseContext, child, name) {
	  // We found a component instance.
	  var result = traverseContext;
	  var keyUnique = result[name] === undefined;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(keyUnique, 'flattenChildren(...): Encountered two children with the same key, ' + '`%s`. Child keys must be unique; when two children share a key, only ' + 'the first child will be used.', name) : undefined;
	  }
	  if (keyUnique && child != null) {
	    result[name] = child;
	  }
	}

	/**
	 * Flattens children that are typically specified as `props.children`. Any null
	 * children will not be included in the resulting object.
	 * @return {!object} flattened children keyed by name.
	 */
	function flattenChildren(children) {
	  if (children == null) {
	    return children;
	  }
	  var result = {};
	  traverseAllChildren(children, flattenSingleChildIntoContext, result);
	  return result;
	}

	module.exports = flattenChildren;

/***/ },
/* 117 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule shallowEqual
	 * @typechecks
	 * 
	 */

	'use strict';

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * Performs equality by iterating through keys on an object and returning false
	 * when any key has values which are not strictly equal between the arguments.
	 * Returns true when the values of all keys are strictly equal.
	 */
	function shallowEqual(objA, objB) {
	  if (objA === objB) {
	    return true;
	  }

	  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
	    return false;
	  }

	  var keysA = Object.keys(objA);
	  var keysB = Object.keys(objB);

	  if (keysA.length !== keysB.length) {
	    return false;
	  }

	  // Test for A's keys different from B.
	  var bHasOwnProperty = hasOwnProperty.bind(objB);
	  for (var i = 0; i < keysA.length; i++) {
	    if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
	      return false;
	    }
	  }

	  return true;
	}

	module.exports = shallowEqual;

/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactEventListener
	 * @typechecks static-only
	 */

	'use strict';

	var EventListener = __webpack_require__(119);
	var ExecutionEnvironment = __webpack_require__(9);
	var PooledClass = __webpack_require__(56);
	var ReactInstanceHandles = __webpack_require__(45);
	var ReactMount = __webpack_require__(28);
	var ReactUpdates = __webpack_require__(54);

	var assign = __webpack_require__(39);
	var getEventTarget = __webpack_require__(81);
	var getUnboundedScrollPosition = __webpack_require__(120);

	var DOCUMENT_FRAGMENT_NODE_TYPE = 11;

	/**
	 * Finds the parent React component of `node`.
	 *
	 * @param {*} node
	 * @return {?DOMEventTarget} Parent container, or `null` if the specified node
	 *                           is not nested.
	 */
	function findParent(node) {
	  // TODO: It may be a good idea to cache this to prevent unnecessary DOM
	  // traversal, but caching is difficult to do correctly without using a
	  // mutation observer to listen for all DOM changes.
	  var nodeID = ReactMount.getID(node);
	  var rootID = ReactInstanceHandles.getReactRootIDFromNodeID(nodeID);
	  var container = ReactMount.findReactContainerForID(rootID);
	  var parent = ReactMount.getFirstReactDOM(container);
	  return parent;
	}

	// Used to store ancestor hierarchy in top level callback
	function TopLevelCallbackBookKeeping(topLevelType, nativeEvent) {
	  this.topLevelType = topLevelType;
	  this.nativeEvent = nativeEvent;
	  this.ancestors = [];
	}
	assign(TopLevelCallbackBookKeeping.prototype, {
	  destructor: function () {
	    this.topLevelType = null;
	    this.nativeEvent = null;
	    this.ancestors.length = 0;
	  }
	});
	PooledClass.addPoolingTo(TopLevelCallbackBookKeeping, PooledClass.twoArgumentPooler);

	function handleTopLevelImpl(bookKeeping) {
	  // TODO: Re-enable event.path handling
	  //
	  // if (bookKeeping.nativeEvent.path && bookKeeping.nativeEvent.path.length > 1) {
	  //   // New browsers have a path attribute on native events
	  //   handleTopLevelWithPath(bookKeeping);
	  // } else {
	  //   // Legacy browsers don't have a path attribute on native events
	  //   handleTopLevelWithoutPath(bookKeeping);
	  // }

	  void handleTopLevelWithPath; // temporarily unused
	  handleTopLevelWithoutPath(bookKeeping);
	}

	// Legacy browsers don't have a path attribute on native events
	function handleTopLevelWithoutPath(bookKeeping) {
	  var topLevelTarget = ReactMount.getFirstReactDOM(getEventTarget(bookKeeping.nativeEvent)) || window;

	  // Loop through the hierarchy, in case there's any nested components.
	  // It's important that we build the array of ancestors before calling any
	  // event handlers, because event handlers can modify the DOM, leading to
	  // inconsistencies with ReactMount's node cache. See #1105.
	  var ancestor = topLevelTarget;
	  while (ancestor) {
	    bookKeeping.ancestors.push(ancestor);
	    ancestor = findParent(ancestor);
	  }

	  for (var i = 0; i < bookKeeping.ancestors.length; i++) {
	    topLevelTarget = bookKeeping.ancestors[i];
	    var topLevelTargetID = ReactMount.getID(topLevelTarget) || '';
	    ReactEventListener._handleTopLevel(bookKeeping.topLevelType, topLevelTarget, topLevelTargetID, bookKeeping.nativeEvent, getEventTarget(bookKeeping.nativeEvent));
	  }
	}

	// New browsers have a path attribute on native events
	function handleTopLevelWithPath(bookKeeping) {
	  var path = bookKeeping.nativeEvent.path;
	  var currentNativeTarget = path[0];
	  var eventsFired = 0;
	  for (var i = 0; i < path.length; i++) {
	    var currentPathElement = path[i];
	    if (currentPathElement.nodeType === DOCUMENT_FRAGMENT_NODE_TYPE) {
	      currentNativeTarget = path[i + 1];
	    }
	    // TODO: slow
	    var reactParent = ReactMount.getFirstReactDOM(currentPathElement);
	    if (reactParent === currentPathElement) {
	      var currentPathElementID = ReactMount.getID(currentPathElement);
	      var newRootID = ReactInstanceHandles.getReactRootIDFromNodeID(currentPathElementID);
	      bookKeeping.ancestors.push(currentPathElement);

	      var topLevelTargetID = ReactMount.getID(currentPathElement) || '';
	      eventsFired++;
	      ReactEventListener._handleTopLevel(bookKeeping.topLevelType, currentPathElement, topLevelTargetID, bookKeeping.nativeEvent, currentNativeTarget);

	      // Jump to the root of this React render tree
	      while (currentPathElementID !== newRootID) {
	        i++;
	        currentPathElement = path[i];
	        currentPathElementID = ReactMount.getID(currentPathElement);
	      }
	    }
	  }
	  if (eventsFired === 0) {
	    ReactEventListener._handleTopLevel(bookKeeping.topLevelType, window, '', bookKeeping.nativeEvent, getEventTarget(bookKeeping.nativeEvent));
	  }
	}

	function scrollValueMonitor(cb) {
	  var scrollPosition = getUnboundedScrollPosition(window);
	  cb(scrollPosition);
	}

	var ReactEventListener = {
	  _enabled: true,
	  _handleTopLevel: null,

	  WINDOW_HANDLE: ExecutionEnvironment.canUseDOM ? window : null,

	  setHandleTopLevel: function (handleTopLevel) {
	    ReactEventListener._handleTopLevel = handleTopLevel;
	  },

	  setEnabled: function (enabled) {
	    ReactEventListener._enabled = !!enabled;
	  },

	  isEnabled: function () {
	    return ReactEventListener._enabled;
	  },

	  /**
	   * Traps top-level events by using event bubbling.
	   *
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {string} handlerBaseName Event name (e.g. "click").
	   * @param {object} handle Element on which to attach listener.
	   * @return {?object} An object with a remove function which will forcefully
	   *                  remove the listener.
	   * @internal
	   */
	  trapBubbledEvent: function (topLevelType, handlerBaseName, handle) {
	    var element = handle;
	    if (!element) {
	      return null;
	    }
	    return EventListener.listen(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
	  },

	  /**
	   * Traps a top-level event by using event capturing.
	   *
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {string} handlerBaseName Event name (e.g. "click").
	   * @param {object} handle Element on which to attach listener.
	   * @return {?object} An object with a remove function which will forcefully
	   *                  remove the listener.
	   * @internal
	   */
	  trapCapturedEvent: function (topLevelType, handlerBaseName, handle) {
	    var element = handle;
	    if (!element) {
	      return null;
	    }
	    return EventListener.capture(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
	  },

	  monitorScrollValue: function (refresh) {
	    var callback = scrollValueMonitor.bind(null, refresh);
	    EventListener.listen(window, 'scroll', callback);
	  },

	  dispatchEvent: function (topLevelType, nativeEvent) {
	    if (!ReactEventListener._enabled) {
	      return;
	    }

	    var bookKeeping = TopLevelCallbackBookKeeping.getPooled(topLevelType, nativeEvent);
	    try {
	      // Event queue being processed in the same cycle allows
	      // `preventDefault`.
	      ReactUpdates.batchedUpdates(handleTopLevelImpl, bookKeeping);
	    } finally {
	      TopLevelCallbackBookKeeping.release(bookKeeping);
	    }
	  }
	};

	module.exports = ReactEventListener;

/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 *
	 * @providesModule EventListener
	 * @typechecks
	 */

	'use strict';

	var emptyFunction = __webpack_require__(15);

	/**
	 * Upstream version of event listener. Does not take into account specific
	 * nature of platform.
	 */
	var EventListener = {
	  /**
	   * Listen to DOM events during the bubble phase.
	   *
	   * @param {DOMEventTarget} target DOM element to register listener on.
	   * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
	   * @param {function} callback Callback function.
	   * @return {object} Object with a `remove` method.
	   */
	  listen: function (target, eventType, callback) {
	    if (target.addEventListener) {
	      target.addEventListener(eventType, callback, false);
	      return {
	        remove: function () {
	          target.removeEventListener(eventType, callback, false);
	        }
	      };
	    } else if (target.attachEvent) {
	      target.attachEvent('on' + eventType, callback);
	      return {
	        remove: function () {
	          target.detachEvent('on' + eventType, callback);
	        }
	      };
	    }
	  },

	  /**
	   * Listen to DOM events during the capture phase.
	   *
	   * @param {DOMEventTarget} target DOM element to register listener on.
	   * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
	   * @param {function} callback Callback function.
	   * @return {object} Object with a `remove` method.
	   */
	  capture: function (target, eventType, callback) {
	    if (target.addEventListener) {
	      target.addEventListener(eventType, callback, true);
	      return {
	        remove: function () {
	          target.removeEventListener(eventType, callback, true);
	        }
	      };
	    } else {
	      if (false) {
	        console.error('Attempted to listen to events during the capture phase on a ' + 'browser that does not support the capture phase. Your application ' + 'will not receive some events.');
	      }
	      return {
	        remove: emptyFunction
	      };
	    }
	  },

	  registerDefault: function () {}
	};

	module.exports = EventListener;

/***/ },
/* 120 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getUnboundedScrollPosition
	 * @typechecks
	 */

	'use strict';

	/**
	 * Gets the scroll position of the supplied element or window.
	 *
	 * The return values are unbounded, unlike `getScrollPosition`. This means they
	 * may be negative or exceed the element boundaries (which is possible using
	 * inertial scrolling).
	 *
	 * @param {DOMWindow|DOMElement} scrollable
	 * @return {object} Map with `x` and `y` keys.
	 */
	function getUnboundedScrollPosition(scrollable) {
	  if (scrollable === window) {
	    return {
	      x: window.pageXOffset || document.documentElement.scrollLeft,
	      y: window.pageYOffset || document.documentElement.scrollTop
	    };
	  }
	  return {
	    x: scrollable.scrollLeft,
	    y: scrollable.scrollTop
	  };
	}

	module.exports = getUnboundedScrollPosition;

/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactInjection
	 */

	'use strict';

	var DOMProperty = __webpack_require__(23);
	var EventPluginHub = __webpack_require__(31);
	var ReactComponentEnvironment = __webpack_require__(64);
	var ReactClass = __webpack_require__(122);
	var ReactEmptyComponent = __webpack_require__(68);
	var ReactBrowserEventEmitter = __webpack_require__(29);
	var ReactNativeComponent = __webpack_require__(69);
	var ReactPerf = __webpack_require__(18);
	var ReactRootIndex = __webpack_require__(46);
	var ReactUpdates = __webpack_require__(54);

	var ReactInjection = {
	  Component: ReactComponentEnvironment.injection,
	  Class: ReactClass.injection,
	  DOMProperty: DOMProperty.injection,
	  EmptyComponent: ReactEmptyComponent.injection,
	  EventPluginHub: EventPluginHub.injection,
	  EventEmitter: ReactBrowserEventEmitter.injection,
	  NativeComponent: ReactNativeComponent.injection,
	  Perf: ReactPerf.injection,
	  RootIndex: ReactRootIndex.injection,
	  Updates: ReactUpdates.injection
	};

	module.exports = ReactInjection;

/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactClass
	 */

	'use strict';

	var ReactComponent = __webpack_require__(123);
	var ReactElement = __webpack_require__(42);
	var ReactPropTypeLocations = __webpack_require__(65);
	var ReactPropTypeLocationNames = __webpack_require__(66);
	var ReactNoopUpdateQueue = __webpack_require__(124);

	var assign = __webpack_require__(39);
	var emptyObject = __webpack_require__(58);
	var invariant = __webpack_require__(13);
	var keyMirror = __webpack_require__(17);
	var keyOf = __webpack_require__(79);
	var warning = __webpack_require__(25);

	var MIXINS_KEY = keyOf({ mixins: null });

	/**
	 * Policies that describe methods in `ReactClassInterface`.
	 */
	var SpecPolicy = keyMirror({
	  /**
	   * These methods may be defined only once by the class specification or mixin.
	   */
	  DEFINE_ONCE: null,
	  /**
	   * These methods may be defined by both the class specification and mixins.
	   * Subsequent definitions will be chained. These methods must return void.
	   */
	  DEFINE_MANY: null,
	  /**
	   * These methods are overriding the base class.
	   */
	  OVERRIDE_BASE: null,
	  /**
	   * These methods are similar to DEFINE_MANY, except we assume they return
	   * objects. We try to merge the keys of the return values of all the mixed in
	   * functions. If there is a key conflict we throw.
	   */
	  DEFINE_MANY_MERGED: null
	});

	var injectedMixins = [];

	var warnedSetProps = false;
	function warnSetProps() {
	  if (!warnedSetProps) {
	    warnedSetProps = true;
	     false ? warning(false, 'setProps(...) and replaceProps(...) are deprecated. ' + 'Instead, call render again at the top level.') : undefined;
	  }
	}

	/**
	 * Composite components are higher-level components that compose other composite
	 * or native components.
	 *
	 * To create a new type of `ReactClass`, pass a specification of
	 * your new class to `React.createClass`. The only requirement of your class
	 * specification is that you implement a `render` method.
	 *
	 *   var MyComponent = React.createClass({
	 *     render: function() {
	 *       return <div>Hello World</div>;
	 *     }
	 *   });
	 *
	 * The class specification supports a specific protocol of methods that have
	 * special meaning (e.g. `render`). See `ReactClassInterface` for
	 * more the comprehensive protocol. Any other properties and methods in the
	 * class specification will be available on the prototype.
	 *
	 * @interface ReactClassInterface
	 * @internal
	 */
	var ReactClassInterface = {

	  /**
	   * An array of Mixin objects to include when defining your component.
	   *
	   * @type {array}
	   * @optional
	   */
	  mixins: SpecPolicy.DEFINE_MANY,

	  /**
	   * An object containing properties and methods that should be defined on
	   * the component's constructor instead of its prototype (static methods).
	   *
	   * @type {object}
	   * @optional
	   */
	  statics: SpecPolicy.DEFINE_MANY,

	  /**
	   * Definition of prop types for this component.
	   *
	   * @type {object}
	   * @optional
	   */
	  propTypes: SpecPolicy.DEFINE_MANY,

	  /**
	   * Definition of context types for this component.
	   *
	   * @type {object}
	   * @optional
	   */
	  contextTypes: SpecPolicy.DEFINE_MANY,

	  /**
	   * Definition of context types this component sets for its children.
	   *
	   * @type {object}
	   * @optional
	   */
	  childContextTypes: SpecPolicy.DEFINE_MANY,

	  // ==== Definition methods ====

	  /**
	   * Invoked when the component is mounted. Values in the mapping will be set on
	   * `this.props` if that prop is not specified (i.e. using an `in` check).
	   *
	   * This method is invoked before `getInitialState` and therefore cannot rely
	   * on `this.state` or use `this.setState`.
	   *
	   * @return {object}
	   * @optional
	   */
	  getDefaultProps: SpecPolicy.DEFINE_MANY_MERGED,

	  /**
	   * Invoked once before the component is mounted. The return value will be used
	   * as the initial value of `this.state`.
	   *
	   *   getInitialState: function() {
	   *     return {
	   *       isOn: false,
	   *       fooBaz: new BazFoo()
	   *     }
	   *   }
	   *
	   * @return {object}
	   * @optional
	   */
	  getInitialState: SpecPolicy.DEFINE_MANY_MERGED,

	  /**
	   * @return {object}
	   * @optional
	   */
	  getChildContext: SpecPolicy.DEFINE_MANY_MERGED,

	  /**
	   * Uses props from `this.props` and state from `this.state` to render the
	   * structure of the component.
	   *
	   * No guarantees are made about when or how often this method is invoked, so
	   * it must not have side effects.
	   *
	   *   render: function() {
	   *     var name = this.props.name;
	   *     return <div>Hello, {name}!</div>;
	   *   }
	   *
	   * @return {ReactComponent}
	   * @nosideeffects
	   * @required
	   */
	  render: SpecPolicy.DEFINE_ONCE,

	  // ==== Delegate methods ====

	  /**
	   * Invoked when the component is initially created and about to be mounted.
	   * This may have side effects, but any external subscriptions or data created
	   * by this method must be cleaned up in `componentWillUnmount`.
	   *
	   * @optional
	   */
	  componentWillMount: SpecPolicy.DEFINE_MANY,

	  /**
	   * Invoked when the component has been mounted and has a DOM representation.
	   * However, there is no guarantee that the DOM node is in the document.
	   *
	   * Use this as an opportunity to operate on the DOM when the component has
	   * been mounted (initialized and rendered) for the first time.
	   *
	   * @param {DOMElement} rootNode DOM element representing the component.
	   * @optional
	   */
	  componentDidMount: SpecPolicy.DEFINE_MANY,

	  /**
	   * Invoked before the component receives new props.
	   *
	   * Use this as an opportunity to react to a prop transition by updating the
	   * state using `this.setState`. Current props are accessed via `this.props`.
	   *
	   *   componentWillReceiveProps: function(nextProps, nextContext) {
	   *     this.setState({
	   *       likesIncreasing: nextProps.likeCount > this.props.likeCount
	   *     });
	   *   }
	   *
	   * NOTE: There is no equivalent `componentWillReceiveState`. An incoming prop
	   * transition may cause a state change, but the opposite is not true. If you
	   * need it, you are probably looking for `componentWillUpdate`.
	   *
	   * @param {object} nextProps
	   * @optional
	   */
	  componentWillReceiveProps: SpecPolicy.DEFINE_MANY,

	  /**
	   * Invoked while deciding if the component should be updated as a result of
	   * receiving new props, state and/or context.
	   *
	   * Use this as an opportunity to `return false` when you're certain that the
	   * transition to the new props/state/context will not require a component
	   * update.
	   *
	   *   shouldComponentUpdate: function(nextProps, nextState, nextContext) {
	   *     return !equal(nextProps, this.props) ||
	   *       !equal(nextState, this.state) ||
	   *       !equal(nextContext, this.context);
	   *   }
	   *
	   * @param {object} nextProps
	   * @param {?object} nextState
	   * @param {?object} nextContext
	   * @return {boolean} True if the component should update.
	   * @optional
	   */
	  shouldComponentUpdate: SpecPolicy.DEFINE_ONCE,

	  /**
	   * Invoked when the component is about to update due to a transition from
	   * `this.props`, `this.state` and `this.context` to `nextProps`, `nextState`
	   * and `nextContext`.
	   *
	   * Use this as an opportunity to perform preparation before an update occurs.
	   *
	   * NOTE: You **cannot** use `this.setState()` in this method.
	   *
	   * @param {object} nextProps
	   * @param {?object} nextState
	   * @param {?object} nextContext
	   * @param {ReactReconcileTransaction} transaction
	   * @optional
	   */
	  componentWillUpdate: SpecPolicy.DEFINE_MANY,

	  /**
	   * Invoked when the component's DOM representation has been updated.
	   *
	   * Use this as an opportunity to operate on the DOM when the component has
	   * been updated.
	   *
	   * @param {object} prevProps
	   * @param {?object} prevState
	   * @param {?object} prevContext
	   * @param {DOMElement} rootNode DOM element representing the component.
	   * @optional
	   */
	  componentDidUpdate: SpecPolicy.DEFINE_MANY,

	  /**
	   * Invoked when the component is about to be removed from its parent and have
	   * its DOM representation destroyed.
	   *
	   * Use this as an opportunity to deallocate any external resources.
	   *
	   * NOTE: There is no `componentDidUnmount` since your component will have been
	   * destroyed by that point.
	   *
	   * @optional
	   */
	  componentWillUnmount: SpecPolicy.DEFINE_MANY,

	  // ==== Advanced methods ====

	  /**
	   * Updates the component's currently mounted DOM representation.
	   *
	   * By default, this implements React's rendering and reconciliation algorithm.
	   * Sophisticated clients may wish to override this.
	   *
	   * @param {ReactReconcileTransaction} transaction
	   * @internal
	   * @overridable
	   */
	  updateComponent: SpecPolicy.OVERRIDE_BASE

	};

	/**
	 * Mapping from class specification keys to special processing functions.
	 *
	 * Although these are declared like instance properties in the specification
	 * when defining classes using `React.createClass`, they are actually static
	 * and are accessible on the constructor instead of the prototype. Despite
	 * being static, they must be defined outside of the "statics" key under
	 * which all other static methods are defined.
	 */
	var RESERVED_SPEC_KEYS = {
	  displayName: function (Constructor, displayName) {
	    Constructor.displayName = displayName;
	  },
	  mixins: function (Constructor, mixins) {
	    if (mixins) {
	      for (var i = 0; i < mixins.length; i++) {
	        mixSpecIntoComponent(Constructor, mixins[i]);
	      }
	    }
	  },
	  childContextTypes: function (Constructor, childContextTypes) {
	    if (false) {
	      validateTypeDef(Constructor, childContextTypes, ReactPropTypeLocations.childContext);
	    }
	    Constructor.childContextTypes = assign({}, Constructor.childContextTypes, childContextTypes);
	  },
	  contextTypes: function (Constructor, contextTypes) {
	    if (false) {
	      validateTypeDef(Constructor, contextTypes, ReactPropTypeLocations.context);
	    }
	    Constructor.contextTypes = assign({}, Constructor.contextTypes, contextTypes);
	  },
	  /**
	   * Special case getDefaultProps which should move into statics but requires
	   * automatic merging.
	   */
	  getDefaultProps: function (Constructor, getDefaultProps) {
	    if (Constructor.getDefaultProps) {
	      Constructor.getDefaultProps = createMergedResultFunction(Constructor.getDefaultProps, getDefaultProps);
	    } else {
	      Constructor.getDefaultProps = getDefaultProps;
	    }
	  },
	  propTypes: function (Constructor, propTypes) {
	    if (false) {
	      validateTypeDef(Constructor, propTypes, ReactPropTypeLocations.prop);
	    }
	    Constructor.propTypes = assign({}, Constructor.propTypes, propTypes);
	  },
	  statics: function (Constructor, statics) {
	    mixStaticSpecIntoComponent(Constructor, statics);
	  },
	  autobind: function () {} };

	// noop
	function validateTypeDef(Constructor, typeDef, location) {
	  for (var propName in typeDef) {
	    if (typeDef.hasOwnProperty(propName)) {
	      // use a warning instead of an invariant so components
	      // don't show up in prod but not in __DEV__
	       false ? warning(typeof typeDef[propName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'React.PropTypes.', Constructor.displayName || 'ReactClass', ReactPropTypeLocationNames[location], propName) : undefined;
	    }
	  }
	}

	function validateMethodOverride(proto, name) {
	  var specPolicy = ReactClassInterface.hasOwnProperty(name) ? ReactClassInterface[name] : null;

	  // Disallow overriding of base class methods unless explicitly allowed.
	  if (ReactClassMixin.hasOwnProperty(name)) {
	    !(specPolicy === SpecPolicy.OVERRIDE_BASE) ?  false ? invariant(false, 'ReactClassInterface: You are attempting to override ' + '`%s` from your class specification. Ensure that your method names ' + 'do not overlap with React methods.', name) : invariant(false) : undefined;
	  }

	  // Disallow defining methods more than once unless explicitly allowed.
	  if (proto.hasOwnProperty(name)) {
	    !(specPolicy === SpecPolicy.DEFINE_MANY || specPolicy === SpecPolicy.DEFINE_MANY_MERGED) ?  false ? invariant(false, 'ReactClassInterface: You are attempting to define ' + '`%s` on your component more than once. This conflict may be due ' + 'to a mixin.', name) : invariant(false) : undefined;
	  }
	}

	/**
	 * Mixin helper which handles policy validation and reserved
	 * specification keys when building React classses.
	 */
	function mixSpecIntoComponent(Constructor, spec) {
	  if (!spec) {
	    return;
	  }

	  !(typeof spec !== 'function') ?  false ? invariant(false, 'ReactClass: You\'re attempting to ' + 'use a component class as a mixin. Instead, just use a regular object.') : invariant(false) : undefined;
	  !!ReactElement.isValidElement(spec) ?  false ? invariant(false, 'ReactClass: You\'re attempting to ' + 'use a component as a mixin. Instead, just use a regular object.') : invariant(false) : undefined;

	  var proto = Constructor.prototype;

	  // By handling mixins before any other properties, we ensure the same
	  // chaining order is applied to methods with DEFINE_MANY policy, whether
	  // mixins are listed before or after these methods in the spec.
	  if (spec.hasOwnProperty(MIXINS_KEY)) {
	    RESERVED_SPEC_KEYS.mixins(Constructor, spec.mixins);
	  }

	  for (var name in spec) {
	    if (!spec.hasOwnProperty(name)) {
	      continue;
	    }

	    if (name === MIXINS_KEY) {
	      // We have already handled mixins in a special case above.
	      continue;
	    }

	    var property = spec[name];
	    validateMethodOverride(proto, name);

	    if (RESERVED_SPEC_KEYS.hasOwnProperty(name)) {
	      RESERVED_SPEC_KEYS[name](Constructor, property);
	    } else {
	      // Setup methods on prototype:
	      // The following member methods should not be automatically bound:
	      // 1. Expected ReactClass methods (in the "interface").
	      // 2. Overridden methods (that were mixed in).
	      var isReactClassMethod = ReactClassInterface.hasOwnProperty(name);
	      var isAlreadyDefined = proto.hasOwnProperty(name);
	      var isFunction = typeof property === 'function';
	      var shouldAutoBind = isFunction && !isReactClassMethod && !isAlreadyDefined && spec.autobind !== false;

	      if (shouldAutoBind) {
	        if (!proto.__reactAutoBindMap) {
	          proto.__reactAutoBindMap = {};
	        }
	        proto.__reactAutoBindMap[name] = property;
	        proto[name] = property;
	      } else {
	        if (isAlreadyDefined) {
	          var specPolicy = ReactClassInterface[name];

	          // These cases should already be caught by validateMethodOverride.
	          !(isReactClassMethod && (specPolicy === SpecPolicy.DEFINE_MANY_MERGED || specPolicy === SpecPolicy.DEFINE_MANY)) ?  false ? invariant(false, 'ReactClass: Unexpected spec policy %s for key %s ' + 'when mixing in component specs.', specPolicy, name) : invariant(false) : undefined;

	          // For methods which are defined more than once, call the existing
	          // methods before calling the new property, merging if appropriate.
	          if (specPolicy === SpecPolicy.DEFINE_MANY_MERGED) {
	            proto[name] = createMergedResultFunction(proto[name], property);
	          } else if (specPolicy === SpecPolicy.DEFINE_MANY) {
	            proto[name] = createChainedFunction(proto[name], property);
	          }
	        } else {
	          proto[name] = property;
	          if (false) {
	            // Add verbose displayName to the function, which helps when looking
	            // at profiling tools.
	            if (typeof property === 'function' && spec.displayName) {
	              proto[name].displayName = spec.displayName + '_' + name;
	            }
	          }
	        }
	      }
	    }
	  }
	}

	function mixStaticSpecIntoComponent(Constructor, statics) {
	  if (!statics) {
	    return;
	  }
	  for (var name in statics) {
	    var property = statics[name];
	    if (!statics.hasOwnProperty(name)) {
	      continue;
	    }

	    var isReserved = (name in RESERVED_SPEC_KEYS);
	    !!isReserved ?  false ? invariant(false, 'ReactClass: You are attempting to define a reserved ' + 'property, `%s`, that shouldn\'t be on the "statics" key. Define it ' + 'as an instance property instead; it will still be accessible on the ' + 'constructor.', name) : invariant(false) : undefined;

	    var isInherited = (name in Constructor);
	    !!isInherited ?  false ? invariant(false, 'ReactClass: You are attempting to define ' + '`%s` on your component more than once. This conflict may be ' + 'due to a mixin.', name) : invariant(false) : undefined;
	    Constructor[name] = property;
	  }
	}

	/**
	 * Merge two objects, but throw if both contain the same key.
	 *
	 * @param {object} one The first object, which is mutated.
	 * @param {object} two The second object
	 * @return {object} one after it has been mutated to contain everything in two.
	 */
	function mergeIntoWithNoDuplicateKeys(one, two) {
	  !(one && two && typeof one === 'object' && typeof two === 'object') ?  false ? invariant(false, 'mergeIntoWithNoDuplicateKeys(): Cannot merge non-objects.') : invariant(false) : undefined;

	  for (var key in two) {
	    if (two.hasOwnProperty(key)) {
	      !(one[key] === undefined) ?  false ? invariant(false, 'mergeIntoWithNoDuplicateKeys(): ' + 'Tried to merge two objects with the same key: `%s`. This conflict ' + 'may be due to a mixin; in particular, this may be caused by two ' + 'getInitialState() or getDefaultProps() methods returning objects ' + 'with clashing keys.', key) : invariant(false) : undefined;
	      one[key] = two[key];
	    }
	  }
	  return one;
	}

	/**
	 * Creates a function that invokes two functions and merges their return values.
	 *
	 * @param {function} one Function to invoke first.
	 * @param {function} two Function to invoke second.
	 * @return {function} Function that invokes the two argument functions.
	 * @private
	 */
	function createMergedResultFunction(one, two) {
	  return function mergedResult() {
	    var a = one.apply(this, arguments);
	    var b = two.apply(this, arguments);
	    if (a == null) {
	      return b;
	    } else if (b == null) {
	      return a;
	    }
	    var c = {};
	    mergeIntoWithNoDuplicateKeys(c, a);
	    mergeIntoWithNoDuplicateKeys(c, b);
	    return c;
	  };
	}

	/**
	 * Creates a function that invokes two functions and ignores their return vales.
	 *
	 * @param {function} one Function to invoke first.
	 * @param {function} two Function to invoke second.
	 * @return {function} Function that invokes the two argument functions.
	 * @private
	 */
	function createChainedFunction(one, two) {
	  return function chainedFunction() {
	    one.apply(this, arguments);
	    two.apply(this, arguments);
	  };
	}

	/**
	 * Binds a method to the component.
	 *
	 * @param {object} component Component whose method is going to be bound.
	 * @param {function} method Method to be bound.
	 * @return {function} The bound method.
	 */
	function bindAutoBindMethod(component, method) {
	  var boundMethod = method.bind(component);
	  if (false) {
	    boundMethod.__reactBoundContext = component;
	    boundMethod.__reactBoundMethod = method;
	    boundMethod.__reactBoundArguments = null;
	    var componentName = component.constructor.displayName;
	    var _bind = boundMethod.bind;
	    /* eslint-disable block-scoped-var, no-undef */
	    boundMethod.bind = function (newThis) {
	      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	        args[_key - 1] = arguments[_key];
	      }

	      // User is trying to bind() an autobound method; we effectively will
	      // ignore the value of "this" that the user is trying to use, so
	      // let's warn.
	      if (newThis !== component && newThis !== null) {
	        process.env.NODE_ENV !== 'production' ? warning(false, 'bind(): React component methods may only be bound to the ' + 'component instance. See %s', componentName) : undefined;
	      } else if (!args.length) {
	        process.env.NODE_ENV !== 'production' ? warning(false, 'bind(): You are binding a component method to the component. ' + 'React does this for you automatically in a high-performance ' + 'way, so you can safely remove this call. See %s', componentName) : undefined;
	        return boundMethod;
	      }
	      var reboundMethod = _bind.apply(boundMethod, arguments);
	      reboundMethod.__reactBoundContext = component;
	      reboundMethod.__reactBoundMethod = method;
	      reboundMethod.__reactBoundArguments = args;
	      return reboundMethod;
	      /* eslint-enable */
	    };
	  }
	  return boundMethod;
	}

	/**
	 * Binds all auto-bound methods in a component.
	 *
	 * @param {object} component Component whose method is going to be bound.
	 */
	function bindAutoBindMethods(component) {
	  for (var autoBindKey in component.__reactAutoBindMap) {
	    if (component.__reactAutoBindMap.hasOwnProperty(autoBindKey)) {
	      var method = component.__reactAutoBindMap[autoBindKey];
	      component[autoBindKey] = bindAutoBindMethod(component, method);
	    }
	  }
	}

	/**
	 * Add more to the ReactClass base class. These are all legacy features and
	 * therefore not already part of the modern ReactComponent.
	 */
	var ReactClassMixin = {

	  /**
	   * TODO: This will be deprecated because state should always keep a consistent
	   * type signature and the only use case for this, is to avoid that.
	   */
	  replaceState: function (newState, callback) {
	    this.updater.enqueueReplaceState(this, newState);
	    if (callback) {
	      this.updater.enqueueCallback(this, callback);
	    }
	  },

	  /**
	   * Checks whether or not this composite component is mounted.
	   * @return {boolean} True if mounted, false otherwise.
	   * @protected
	   * @final
	   */
	  isMounted: function () {
	    return this.updater.isMounted(this);
	  },

	  /**
	   * Sets a subset of the props.
	   *
	   * @param {object} partialProps Subset of the next props.
	   * @param {?function} callback Called after props are updated.
	   * @final
	   * @public
	   * @deprecated
	   */
	  setProps: function (partialProps, callback) {
	    if (false) {
	      warnSetProps();
	    }
	    this.updater.enqueueSetProps(this, partialProps);
	    if (callback) {
	      this.updater.enqueueCallback(this, callback);
	    }
	  },

	  /**
	   * Replace all the props.
	   *
	   * @param {object} newProps Subset of the next props.
	   * @param {?function} callback Called after props are updated.
	   * @final
	   * @public
	   * @deprecated
	   */
	  replaceProps: function (newProps, callback) {
	    if (false) {
	      warnSetProps();
	    }
	    this.updater.enqueueReplaceProps(this, newProps);
	    if (callback) {
	      this.updater.enqueueCallback(this, callback);
	    }
	  }
	};

	var ReactClassComponent = function () {};
	assign(ReactClassComponent.prototype, ReactComponent.prototype, ReactClassMixin);

	/**
	 * Module for creating composite components.
	 *
	 * @class ReactClass
	 */
	var ReactClass = {

	  /**
	   * Creates a composite component class given a class specification.
	   *
	   * @param {object} spec Class specification (which must define `render`).
	   * @return {function} Component constructor function.
	   * @public
	   */
	  createClass: function (spec) {
	    var Constructor = function (props, context, updater) {
	      // This constructor is overridden by mocks. The argument is used
	      // by mocks to assert on what gets mounted.

	      if (false) {
	        process.env.NODE_ENV !== 'production' ? warning(this instanceof Constructor, 'Something is calling a React component directly. Use a factory or ' + 'JSX instead. See: https://fb.me/react-legacyfactory') : undefined;
	      }

	      // Wire up auto-binding
	      if (this.__reactAutoBindMap) {
	        bindAutoBindMethods(this);
	      }

	      this.props = props;
	      this.context = context;
	      this.refs = emptyObject;
	      this.updater = updater || ReactNoopUpdateQueue;

	      this.state = null;

	      // ReactClasses doesn't have constructors. Instead, they use the
	      // getInitialState and componentWillMount methods for initialization.

	      var initialState = this.getInitialState ? this.getInitialState() : null;
	      if (false) {
	        // We allow auto-mocks to proceed as if they're returning null.
	        if (typeof initialState === 'undefined' && this.getInitialState._isMockFunction) {
	          // This is probably bad practice. Consider warning here and
	          // deprecating this convenience.
	          initialState = null;
	        }
	      }
	      !(typeof initialState === 'object' && !Array.isArray(initialState)) ?  false ? invariant(false, '%s.getInitialState(): must return an object or null', Constructor.displayName || 'ReactCompositeComponent') : invariant(false) : undefined;

	      this.state = initialState;
	    };
	    Constructor.prototype = new ReactClassComponent();
	    Constructor.prototype.constructor = Constructor;

	    injectedMixins.forEach(mixSpecIntoComponent.bind(null, Constructor));

	    mixSpecIntoComponent(Constructor, spec);

	    // Initialize the defaultProps property after all mixins have been merged.
	    if (Constructor.getDefaultProps) {
	      Constructor.defaultProps = Constructor.getDefaultProps();
	    }

	    if (false) {
	      // This is a tag to indicate that the use of these method names is ok,
	      // since it's used with createClass. If it's not, then it's likely a
	      // mistake so we'll warn you to use the static property, property
	      // initializer or constructor respectively.
	      if (Constructor.getDefaultProps) {
	        Constructor.getDefaultProps.isReactClassApproved = {};
	      }
	      if (Constructor.prototype.getInitialState) {
	        Constructor.prototype.getInitialState.isReactClassApproved = {};
	      }
	    }

	    !Constructor.prototype.render ?  false ? invariant(false, 'createClass(...): Class specification must implement a `render` method.') : invariant(false) : undefined;

	    if (false) {
	      process.env.NODE_ENV !== 'production' ? warning(!Constructor.prototype.componentShouldUpdate, '%s has a method called ' + 'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' + 'The name is phrased as a question because the function is ' + 'expected to return a value.', spec.displayName || 'A component') : undefined;
	      process.env.NODE_ENV !== 'production' ? warning(!Constructor.prototype.componentWillRecieveProps, '%s has a method called ' + 'componentWillRecieveProps(). Did you mean componentWillReceiveProps()?', spec.displayName || 'A component') : undefined;
	    }

	    // Reduce time spent doing lookups by setting these on the prototype.
	    for (var methodName in ReactClassInterface) {
	      if (!Constructor.prototype[methodName]) {
	        Constructor.prototype[methodName] = null;
	      }
	    }

	    return Constructor;
	  },

	  injection: {
	    injectMixin: function (mixin) {
	      injectedMixins.push(mixin);
	    }
	  }

	};

	module.exports = ReactClass;

/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactComponent
	 */

	'use strict';

	var ReactNoopUpdateQueue = __webpack_require__(124);

	var canDefineProperty = __webpack_require__(43);
	var emptyObject = __webpack_require__(58);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	/**
	 * Base class helpers for the updating state of a component.
	 */
	function ReactComponent(props, context, updater) {
	  this.props = props;
	  this.context = context;
	  this.refs = emptyObject;
	  // We initialize the default updater but the real one gets injected by the
	  // renderer.
	  this.updater = updater || ReactNoopUpdateQueue;
	}

	ReactComponent.prototype.isReactComponent = {};

	/**
	 * Sets a subset of the state. Always use this to mutate
	 * state. You should treat `this.state` as immutable.
	 *
	 * There is no guarantee that `this.state` will be immediately updated, so
	 * accessing `this.state` after calling this method may return the old value.
	 *
	 * There is no guarantee that calls to `setState` will run synchronously,
	 * as they may eventually be batched together.  You can provide an optional
	 * callback that will be executed when the call to setState is actually
	 * completed.
	 *
	 * When a function is provided to setState, it will be called at some point in
	 * the future (not synchronously). It will be called with the up to date
	 * component arguments (state, props, context). These values can be different
	 * from this.* because your function may be called after receiveProps but before
	 * shouldComponentUpdate, and this new state, props, and context will not yet be
	 * assigned to this.
	 *
	 * @param {object|function} partialState Next partial state or function to
	 *        produce next partial state to be merged with current state.
	 * @param {?function} callback Called after state is updated.
	 * @final
	 * @protected
	 */
	ReactComponent.prototype.setState = function (partialState, callback) {
	  !(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null) ?  false ? invariant(false, 'setState(...): takes an object of state variables to update or a ' + 'function which returns an object of state variables.') : invariant(false) : undefined;
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(partialState != null, 'setState(...): You passed an undefined or null state object; ' + 'instead, use forceUpdate().') : undefined;
	  }
	  this.updater.enqueueSetState(this, partialState);
	  if (callback) {
	    this.updater.enqueueCallback(this, callback);
	  }
	};

	/**
	 * Forces an update. This should only be invoked when it is known with
	 * certainty that we are **not** in a DOM transaction.
	 *
	 * You may want to call this when you know that some deeper aspect of the
	 * component's state has changed but `setState` was not called.
	 *
	 * This will not invoke `shouldComponentUpdate`, but it will invoke
	 * `componentWillUpdate` and `componentDidUpdate`.
	 *
	 * @param {?function} callback Called after update is complete.
	 * @final
	 * @protected
	 */
	ReactComponent.prototype.forceUpdate = function (callback) {
	  this.updater.enqueueForceUpdate(this);
	  if (callback) {
	    this.updater.enqueueCallback(this, callback);
	  }
	};

	/**
	 * Deprecated APIs. These APIs used to exist on classic React classes but since
	 * we would like to deprecate them, we're not going to move them over to this
	 * modern base class. Instead, we define a getter that warns if it's accessed.
	 */
	if (false) {
	  var deprecatedAPIs = {
	    getDOMNode: ['getDOMNode', 'Use ReactDOM.findDOMNode(component) instead.'],
	    isMounted: ['isMounted', 'Instead, make sure to clean up subscriptions and pending requests in ' + 'componentWillUnmount to prevent memory leaks.'],
	    replaceProps: ['replaceProps', 'Instead, call render again at the top level.'],
	    replaceState: ['replaceState', 'Refactor your code to use setState instead (see ' + 'https://github.com/facebook/react/issues/3236).'],
	    setProps: ['setProps', 'Instead, call render again at the top level.']
	  };
	  var defineDeprecationWarning = function (methodName, info) {
	    if (canDefineProperty) {
	      Object.defineProperty(ReactComponent.prototype, methodName, {
	        get: function () {
	          process.env.NODE_ENV !== 'production' ? warning(false, '%s(...) is deprecated in plain JavaScript React classes. %s', info[0], info[1]) : undefined;
	          return undefined;
	        }
	      });
	    }
	  };
	  for (var fnName in deprecatedAPIs) {
	    if (deprecatedAPIs.hasOwnProperty(fnName)) {
	      defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
	    }
	  }
	}

	module.exports = ReactComponent;

/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactNoopUpdateQueue
	 */

	'use strict';

	var warning = __webpack_require__(25);

	function warnTDZ(publicInstance, callerName) {
	  if (false) {
	    process.env.NODE_ENV !== 'production' ? warning(false, '%s(...): Can only update a mounted or mounting component. ' + 'This usually means you called %s() on an unmounted component. ' + 'This is a no-op. Please check the code for the %s component.', callerName, callerName, publicInstance.constructor && publicInstance.constructor.displayName || '') : undefined;
	  }
	}

	/**
	 * This is the abstract API for an update queue.
	 */
	var ReactNoopUpdateQueue = {

	  /**
	   * Checks whether or not this composite component is mounted.
	   * @param {ReactClass} publicInstance The instance we want to test.
	   * @return {boolean} True if mounted, false otherwise.
	   * @protected
	   * @final
	   */
	  isMounted: function (publicInstance) {
	    return false;
	  },

	  /**
	   * Enqueue a callback that will be executed after all the pending updates
	   * have processed.
	   *
	   * @param {ReactClass} publicInstance The instance to use as `this` context.
	   * @param {?function} callback Called after state is updated.
	   * @internal
	   */
	  enqueueCallback: function (publicInstance, callback) {},

	  /**
	   * Forces an update. This should only be invoked when it is known with
	   * certainty that we are **not** in a DOM transaction.
	   *
	   * You may want to call this when you know that some deeper aspect of the
	   * component's state has changed but `setState` was not called.
	   *
	   * This will not invoke `shouldComponentUpdate`, but it will invoke
	   * `componentWillUpdate` and `componentDidUpdate`.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @internal
	   */
	  enqueueForceUpdate: function (publicInstance) {
	    warnTDZ(publicInstance, 'forceUpdate');
	  },

	  /**
	   * Replaces all of the state. Always use this or `setState` to mutate state.
	   * You should treat `this.state` as immutable.
	   *
	   * There is no guarantee that `this.state` will be immediately updated, so
	   * accessing `this.state` after calling this method may return the old value.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} completeState Next state.
	   * @internal
	   */
	  enqueueReplaceState: function (publicInstance, completeState) {
	    warnTDZ(publicInstance, 'replaceState');
	  },

	  /**
	   * Sets a subset of the state. This only exists because _pendingState is
	   * internal. This provides a merging strategy that is not available to deep
	   * properties which is confusing. TODO: Expose pendingState or don't use it
	   * during the merge.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} partialState Next partial state to be merged with state.
	   * @internal
	   */
	  enqueueSetState: function (publicInstance, partialState) {
	    warnTDZ(publicInstance, 'setState');
	  },

	  /**
	   * Sets a subset of the props.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} partialProps Subset of the next props.
	   * @internal
	   */
	  enqueueSetProps: function (publicInstance, partialProps) {
	    warnTDZ(publicInstance, 'setProps');
	  },

	  /**
	   * Replaces all of the props.
	   *
	   * @param {ReactClass} publicInstance The instance that should rerender.
	   * @param {object} props New props.
	   * @internal
	   */
	  enqueueReplaceProps: function (publicInstance, props) {
	    warnTDZ(publicInstance, 'replaceProps');
	  }

	};

	module.exports = ReactNoopUpdateQueue;

/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactReconcileTransaction
	 * @typechecks static-only
	 */

	'use strict';

	var CallbackQueue = __webpack_require__(55);
	var PooledClass = __webpack_require__(56);
	var ReactBrowserEventEmitter = __webpack_require__(29);
	var ReactDOMFeatureFlags = __webpack_require__(41);
	var ReactInputSelection = __webpack_require__(126);
	var Transaction = __webpack_require__(57);

	var assign = __webpack_require__(39);

	/**
	 * Ensures that, when possible, the selection range (currently selected text
	 * input) is not disturbed by performing the transaction.
	 */
	var SELECTION_RESTORATION = {
	  /**
	   * @return {Selection} Selection information.
	   */
	  initialize: ReactInputSelection.getSelectionInformation,
	  /**
	   * @param {Selection} sel Selection information returned from `initialize`.
	   */
	  close: ReactInputSelection.restoreSelection
	};

	/**
	 * Suppresses events (blur/focus) that could be inadvertently dispatched due to
	 * high level DOM manipulations (like temporarily removing a text input from the
	 * DOM).
	 */
	var EVENT_SUPPRESSION = {
	  /**
	   * @return {boolean} The enabled status of `ReactBrowserEventEmitter` before
	   * the reconciliation.
	   */
	  initialize: function () {
	    var currentlyEnabled = ReactBrowserEventEmitter.isEnabled();
	    ReactBrowserEventEmitter.setEnabled(false);
	    return currentlyEnabled;
	  },

	  /**
	   * @param {boolean} previouslyEnabled Enabled status of
	   *   `ReactBrowserEventEmitter` before the reconciliation occurred. `close`
	   *   restores the previous value.
	   */
	  close: function (previouslyEnabled) {
	    ReactBrowserEventEmitter.setEnabled(previouslyEnabled);
	  }
	};

	/**
	 * Provides a queue for collecting `componentDidMount` and
	 * `componentDidUpdate` callbacks during the the transaction.
	 */
	var ON_DOM_READY_QUEUEING = {
	  /**
	   * Initializes the internal `onDOMReady` queue.
	   */
	  initialize: function () {
	    this.reactMountReady.reset();
	  },

	  /**
	   * After DOM is flushed, invoke all registered `onDOMReady` callbacks.
	   */
	  close: function () {
	    this.reactMountReady.notifyAll();
	  }
	};

	/**
	 * Executed within the scope of the `Transaction` instance. Consider these as
	 * being member methods, but with an implied ordering while being isolated from
	 * each other.
	 */
	var TRANSACTION_WRAPPERS = [SELECTION_RESTORATION, EVENT_SUPPRESSION, ON_DOM_READY_QUEUEING];

	/**
	 * Currently:
	 * - The order that these are listed in the transaction is critical:
	 * - Suppresses events.
	 * - Restores selection range.
	 *
	 * Future:
	 * - Restore document/overflow scroll positions that were unintentionally
	 *   modified via DOM insertions above the top viewport boundary.
	 * - Implement/integrate with customized constraint based layout system and keep
	 *   track of which dimensions must be remeasured.
	 *
	 * @class ReactReconcileTransaction
	 */
	function ReactReconcileTransaction(forceHTML) {
	  this.reinitializeTransaction();
	  // Only server-side rendering really needs this option (see
	  // `ReactServerRendering`), but server-side uses
	  // `ReactServerRenderingTransaction` instead. This option is here so that it's
	  // accessible and defaults to false when `ReactDOMComponent` and
	  // `ReactTextComponent` checks it in `mountComponent`.`
	  this.renderToStaticMarkup = false;
	  this.reactMountReady = CallbackQueue.getPooled(null);
	  this.useCreateElement = !forceHTML && ReactDOMFeatureFlags.useCreateElement;
	}

	var Mixin = {
	  /**
	   * @see Transaction
	   * @abstract
	   * @final
	   * @return {array<object>} List of operation wrap procedures.
	   *   TODO: convert to array<TransactionWrapper>
	   */
	  getTransactionWrappers: function () {
	    return TRANSACTION_WRAPPERS;
	  },

	  /**
	   * @return {object} The queue to collect `onDOMReady` callbacks with.
	   */
	  getReactMountReady: function () {
	    return this.reactMountReady;
	  },

	  /**
	   * `PooledClass` looks for this, and will invoke this before allowing this
	   * instance to be reused.
	   */
	  destructor: function () {
	    CallbackQueue.release(this.reactMountReady);
	    this.reactMountReady = null;
	  }
	};

	assign(ReactReconcileTransaction.prototype, Transaction.Mixin, Mixin);

	PooledClass.addPoolingTo(ReactReconcileTransaction);

	module.exports = ReactReconcileTransaction;

/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactInputSelection
	 */

	'use strict';

	var ReactDOMSelection = __webpack_require__(127);

	var containsNode = __webpack_require__(59);
	var focusNode = __webpack_require__(95);
	var getActiveElement = __webpack_require__(129);

	function isInDocument(node) {
	  return containsNode(document.documentElement, node);
	}

	/**
	 * @ReactInputSelection: React input selection module. Based on Selection.js,
	 * but modified to be suitable for react and has a couple of bug fixes (doesn't
	 * assume buttons have range selections allowed).
	 * Input selection module for React.
	 */
	var ReactInputSelection = {

	  hasSelectionCapabilities: function (elem) {
	    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
	    return nodeName && (nodeName === 'input' && elem.type === 'text' || nodeName === 'textarea' || elem.contentEditable === 'true');
	  },

	  getSelectionInformation: function () {
	    var focusedElem = getActiveElement();
	    return {
	      focusedElem: focusedElem,
	      selectionRange: ReactInputSelection.hasSelectionCapabilities(focusedElem) ? ReactInputSelection.getSelection(focusedElem) : null
	    };
	  },

	  /**
	   * @restoreSelection: If any selection information was potentially lost,
	   * restore it. This is useful when performing operations that could remove dom
	   * nodes and place them back in, resulting in focus being lost.
	   */
	  restoreSelection: function (priorSelectionInformation) {
	    var curFocusedElem = getActiveElement();
	    var priorFocusedElem = priorSelectionInformation.focusedElem;
	    var priorSelectionRange = priorSelectionInformation.selectionRange;
	    if (curFocusedElem !== priorFocusedElem && isInDocument(priorFocusedElem)) {
	      if (ReactInputSelection.hasSelectionCapabilities(priorFocusedElem)) {
	        ReactInputSelection.setSelection(priorFocusedElem, priorSelectionRange);
	      }
	      focusNode(priorFocusedElem);
	    }
	  },

	  /**
	   * @getSelection: Gets the selection bounds of a focused textarea, input or
	   * contentEditable node.
	   * -@input: Look up selection bounds of this input
	   * -@return {start: selectionStart, end: selectionEnd}
	   */
	  getSelection: function (input) {
	    var selection;

	    if ('selectionStart' in input) {
	      // Modern browser with input or textarea.
	      selection = {
	        start: input.selectionStart,
	        end: input.selectionEnd
	      };
	    } else if (document.selection && (input.nodeName && input.nodeName.toLowerCase() === 'input')) {
	      // IE8 input.
	      var range = document.selection.createRange();
	      // There can only be one selection per document in IE, so it must
	      // be in our element.
	      if (range.parentElement() === input) {
	        selection = {
	          start: -range.moveStart('character', -input.value.length),
	          end: -range.moveEnd('character', -input.value.length)
	        };
	      }
	    } else {
	      // Content editable or old IE textarea.
	      selection = ReactDOMSelection.getOffsets(input);
	    }

	    return selection || { start: 0, end: 0 };
	  },

	  /**
	   * @setSelection: Sets the selection bounds of a textarea or input and focuses
	   * the input.
	   * -@input     Set selection bounds of this input or textarea
	   * -@offsets   Object of same form that is returned from get*
	   */
	  setSelection: function (input, offsets) {
	    var start = offsets.start;
	    var end = offsets.end;
	    if (typeof end === 'undefined') {
	      end = start;
	    }

	    if ('selectionStart' in input) {
	      input.selectionStart = start;
	      input.selectionEnd = Math.min(end, input.value.length);
	    } else if (document.selection && (input.nodeName && input.nodeName.toLowerCase() === 'input')) {
	      var range = input.createTextRange();
	      range.collapse(true);
	      range.moveStart('character', start);
	      range.moveEnd('character', end - start);
	      range.select();
	    } else {
	      ReactDOMSelection.setOffsets(input, offsets);
	    }
	  }
	};

	module.exports = ReactInputSelection;

/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMSelection
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(9);

	var getNodeForCharacterOffset = __webpack_require__(128);
	var getTextContentAccessor = __webpack_require__(75);

	/**
	 * While `isCollapsed` is available on the Selection object and `collapsed`
	 * is available on the Range object, IE11 sometimes gets them wrong.
	 * If the anchor/focus nodes and offsets are the same, the range is collapsed.
	 */
	function isCollapsed(anchorNode, anchorOffset, focusNode, focusOffset) {
	  return anchorNode === focusNode && anchorOffset === focusOffset;
	}

	/**
	 * Get the appropriate anchor and focus node/offset pairs for IE.
	 *
	 * The catch here is that IE's selection API doesn't provide information
	 * about whether the selection is forward or backward, so we have to
	 * behave as though it's always forward.
	 *
	 * IE text differs from modern selection in that it behaves as though
	 * block elements end with a new line. This means character offsets will
	 * differ between the two APIs.
	 *
	 * @param {DOMElement} node
	 * @return {object}
	 */
	function getIEOffsets(node) {
	  var selection = document.selection;
	  var selectedRange = selection.createRange();
	  var selectedLength = selectedRange.text.length;

	  // Duplicate selection so we can move range without breaking user selection.
	  var fromStart = selectedRange.duplicate();
	  fromStart.moveToElementText(node);
	  fromStart.setEndPoint('EndToStart', selectedRange);

	  var startOffset = fromStart.text.length;
	  var endOffset = startOffset + selectedLength;

	  return {
	    start: startOffset,
	    end: endOffset
	  };
	}

	/**
	 * @param {DOMElement} node
	 * @return {?object}
	 */
	function getModernOffsets(node) {
	  var selection = window.getSelection && window.getSelection();

	  if (!selection || selection.rangeCount === 0) {
	    return null;
	  }

	  var anchorNode = selection.anchorNode;
	  var anchorOffset = selection.anchorOffset;
	  var focusNode = selection.focusNode;
	  var focusOffset = selection.focusOffset;

	  var currentRange = selection.getRangeAt(0);

	  // In Firefox, range.startContainer and range.endContainer can be "anonymous
	  // divs", e.g. the up/down buttons on an <input type="number">. Anonymous
	  // divs do not seem to expose properties, triggering a "Permission denied
	  // error" if any of its properties are accessed. The only seemingly possible
	  // way to avoid erroring is to access a property that typically works for
	  // non-anonymous divs and catch any error that may otherwise arise. See
	  // https://bugzilla.mozilla.org/show_bug.cgi?id=208427
	  try {
	    /* eslint-disable no-unused-expressions */
	    currentRange.startContainer.nodeType;
	    currentRange.endContainer.nodeType;
	    /* eslint-enable no-unused-expressions */
	  } catch (e) {
	    return null;
	  }

	  // If the node and offset values are the same, the selection is collapsed.
	  // `Selection.isCollapsed` is available natively, but IE sometimes gets
	  // this value wrong.
	  var isSelectionCollapsed = isCollapsed(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);

	  var rangeLength = isSelectionCollapsed ? 0 : currentRange.toString().length;

	  var tempRange = currentRange.cloneRange();
	  tempRange.selectNodeContents(node);
	  tempRange.setEnd(currentRange.startContainer, currentRange.startOffset);

	  var isTempRangeCollapsed = isCollapsed(tempRange.startContainer, tempRange.startOffset, tempRange.endContainer, tempRange.endOffset);

	  var start = isTempRangeCollapsed ? 0 : tempRange.toString().length;
	  var end = start + rangeLength;

	  // Detect whether the selection is backward.
	  var detectionRange = document.createRange();
	  detectionRange.setStart(anchorNode, anchorOffset);
	  detectionRange.setEnd(focusNode, focusOffset);
	  var isBackward = detectionRange.collapsed;

	  return {
	    start: isBackward ? end : start,
	    end: isBackward ? start : end
	  };
	}

	/**
	 * @param {DOMElement|DOMTextNode} node
	 * @param {object} offsets
	 */
	function setIEOffsets(node, offsets) {
	  var range = document.selection.createRange().duplicate();
	  var start, end;

	  if (typeof offsets.end === 'undefined') {
	    start = offsets.start;
	    end = start;
	  } else if (offsets.start > offsets.end) {
	    start = offsets.end;
	    end = offsets.start;
	  } else {
	    start = offsets.start;
	    end = offsets.end;
	  }

	  range.moveToElementText(node);
	  range.moveStart('character', start);
	  range.setEndPoint('EndToStart', range);
	  range.moveEnd('character', end - start);
	  range.select();
	}

	/**
	 * In modern non-IE browsers, we can support both forward and backward
	 * selections.
	 *
	 * Note: IE10+ supports the Selection object, but it does not support
	 * the `extend` method, which means that even in modern IE, it's not possible
	 * to programatically create a backward selection. Thus, for all IE
	 * versions, we use the old IE API to create our selections.
	 *
	 * @param {DOMElement|DOMTextNode} node
	 * @param {object} offsets
	 */
	function setModernOffsets(node, offsets) {
	  if (!window.getSelection) {
	    return;
	  }

	  var selection = window.getSelection();
	  var length = node[getTextContentAccessor()].length;
	  var start = Math.min(offsets.start, length);
	  var end = typeof offsets.end === 'undefined' ? start : Math.min(offsets.end, length);

	  // IE 11 uses modern selection, but doesn't support the extend method.
	  // Flip backward selections, so we can set with a single range.
	  if (!selection.extend && start > end) {
	    var temp = end;
	    end = start;
	    start = temp;
	  }

	  var startMarker = getNodeForCharacterOffset(node, start);
	  var endMarker = getNodeForCharacterOffset(node, end);

	  if (startMarker && endMarker) {
	    var range = document.createRange();
	    range.setStart(startMarker.node, startMarker.offset);
	    selection.removeAllRanges();

	    if (start > end) {
	      selection.addRange(range);
	      selection.extend(endMarker.node, endMarker.offset);
	    } else {
	      range.setEnd(endMarker.node, endMarker.offset);
	      selection.addRange(range);
	    }
	  }
	}

	var useIEOffsets = ExecutionEnvironment.canUseDOM && 'selection' in document && !('getSelection' in window);

	var ReactDOMSelection = {
	  /**
	   * @param {DOMElement} node
	   */
	  getOffsets: useIEOffsets ? getIEOffsets : getModernOffsets,

	  /**
	   * @param {DOMElement|DOMTextNode} node
	   * @param {object} offsets
	   */
	  setOffsets: useIEOffsets ? setIEOffsets : setModernOffsets
	};

	module.exports = ReactDOMSelection;

/***/ },
/* 128 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getNodeForCharacterOffset
	 */

	'use strict';

	/**
	 * Given any node return the first leaf node without children.
	 *
	 * @param {DOMElement|DOMTextNode} node
	 * @return {DOMElement|DOMTextNode}
	 */
	function getLeafNode(node) {
	  while (node && node.firstChild) {
	    node = node.firstChild;
	  }
	  return node;
	}

	/**
	 * Get the next sibling within a container. This will walk up the
	 * DOM if a node's siblings have been exhausted.
	 *
	 * @param {DOMElement|DOMTextNode} node
	 * @return {?DOMElement|DOMTextNode}
	 */
	function getSiblingNode(node) {
	  while (node) {
	    if (node.nextSibling) {
	      return node.nextSibling;
	    }
	    node = node.parentNode;
	  }
	}

	/**
	 * Get object describing the nodes which contain characters at offset.
	 *
	 * @param {DOMElement|DOMTextNode} root
	 * @param {number} offset
	 * @return {?object}
	 */
	function getNodeForCharacterOffset(root, offset) {
	  var node = getLeafNode(root);
	  var nodeStart = 0;
	  var nodeEnd = 0;

	  while (node) {
	    if (node.nodeType === 3) {
	      nodeEnd = nodeStart + node.textContent.length;

	      if (nodeStart <= offset && nodeEnd >= offset) {
	        return {
	          node: node,
	          offset: offset - nodeStart
	        };
	      }

	      nodeStart = nodeEnd;
	    }

	    node = getLeafNode(getSiblingNode(node));
	  }
	}

	module.exports = getNodeForCharacterOffset;

/***/ },
/* 129 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getActiveElement
	 * @typechecks
	 */

	/* eslint-disable fb-www/typeof-undefined */

	/**
	 * Same as document.activeElement but wraps in a try-catch block. In IE it is
	 * not safe to call document.activeElement if there is nothing focused.
	 *
	 * The activeElement will be null only if the document or document body is not
	 * yet defined.
	 */
	'use strict';

	function getActiveElement() /*?DOMElement*/{
	  if (typeof document === 'undefined') {
	    return null;
	  }
	  try {
	    return document.activeElement || document.body;
	  } catch (e) {
	    return document.body;
	  }
	}

	module.exports = getActiveElement;

/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SelectEventPlugin
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventPropagators = __webpack_require__(73);
	var ExecutionEnvironment = __webpack_require__(9);
	var ReactInputSelection = __webpack_require__(126);
	var SyntheticEvent = __webpack_require__(77);

	var getActiveElement = __webpack_require__(129);
	var isTextInputElement = __webpack_require__(82);
	var keyOf = __webpack_require__(79);
	var shallowEqual = __webpack_require__(117);

	var topLevelTypes = EventConstants.topLevelTypes;

	var skipSelectionChangeEvent = ExecutionEnvironment.canUseDOM && 'documentMode' in document && document.documentMode <= 11;

	var eventTypes = {
	  select: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onSelect: null }),
	      captured: keyOf({ onSelectCapture: null })
	    },
	    dependencies: [topLevelTypes.topBlur, topLevelTypes.topContextMenu, topLevelTypes.topFocus, topLevelTypes.topKeyDown, topLevelTypes.topMouseDown, topLevelTypes.topMouseUp, topLevelTypes.topSelectionChange]
	  }
	};

	var activeElement = null;
	var activeElementID = null;
	var lastSelection = null;
	var mouseDown = false;

	// Track whether a listener exists for this plugin. If none exist, we do
	// not extract events.
	var hasListener = false;
	var ON_SELECT_KEY = keyOf({ onSelect: null });

	/**
	 * Get an object which is a unique representation of the current selection.
	 *
	 * The return value will not be consistent across nodes or browsers, but
	 * two identical selections on the same node will return identical objects.
	 *
	 * @param {DOMElement} node
	 * @return {object}
	 */
	function getSelection(node) {
	  if ('selectionStart' in node && ReactInputSelection.hasSelectionCapabilities(node)) {
	    return {
	      start: node.selectionStart,
	      end: node.selectionEnd
	    };
	  } else if (window.getSelection) {
	    var selection = window.getSelection();
	    return {
	      anchorNode: selection.anchorNode,
	      anchorOffset: selection.anchorOffset,
	      focusNode: selection.focusNode,
	      focusOffset: selection.focusOffset
	    };
	  } else if (document.selection) {
	    var range = document.selection.createRange();
	    return {
	      parentElement: range.parentElement(),
	      text: range.text,
	      top: range.boundingTop,
	      left: range.boundingLeft
	    };
	  }
	}

	/**
	 * Poll selection to see whether it's changed.
	 *
	 * @param {object} nativeEvent
	 * @return {?SyntheticEvent}
	 */
	function constructSelectEvent(nativeEvent, nativeEventTarget) {
	  // Ensure we have the right element, and that the user is not dragging a
	  // selection (this matches native `select` event behavior). In HTML5, select
	  // fires only on input and textarea thus if there's no focused element we
	  // won't dispatch.
	  if (mouseDown || activeElement == null || activeElement !== getActiveElement()) {
	    return null;
	  }

	  // Only fire when selection has actually changed.
	  var currentSelection = getSelection(activeElement);
	  if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
	    lastSelection = currentSelection;

	    var syntheticEvent = SyntheticEvent.getPooled(eventTypes.select, activeElementID, nativeEvent, nativeEventTarget);

	    syntheticEvent.type = 'select';
	    syntheticEvent.target = activeElement;

	    EventPropagators.accumulateTwoPhaseDispatches(syntheticEvent);

	    return syntheticEvent;
	  }

	  return null;
	}

	/**
	 * This plugin creates an `onSelect` event that normalizes select events
	 * across form elements.
	 *
	 * Supported elements are:
	 * - input (see `isTextInputElement`)
	 * - textarea
	 * - contentEditable
	 *
	 * This differs from native browser implementations in the following ways:
	 * - Fires on contentEditable fields as well as inputs.
	 * - Fires for collapsed selection.
	 * - Fires after user input.
	 */
	var SelectEventPlugin = {

	  eventTypes: eventTypes,

	  /**
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @see {EventPluginHub.extractEvents}
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    if (!hasListener) {
	      return null;
	    }

	    switch (topLevelType) {
	      // Track the input node that has focus.
	      case topLevelTypes.topFocus:
	        if (isTextInputElement(topLevelTarget) || topLevelTarget.contentEditable === 'true') {
	          activeElement = topLevelTarget;
	          activeElementID = topLevelTargetID;
	          lastSelection = null;
	        }
	        break;
	      case topLevelTypes.topBlur:
	        activeElement = null;
	        activeElementID = null;
	        lastSelection = null;
	        break;

	      // Don't fire the event while the user is dragging. This matches the
	      // semantics of the native select event.
	      case topLevelTypes.topMouseDown:
	        mouseDown = true;
	        break;
	      case topLevelTypes.topContextMenu:
	      case topLevelTypes.topMouseUp:
	        mouseDown = false;
	        return constructSelectEvent(nativeEvent, nativeEventTarget);

	      // Chrome and IE fire non-standard event when selection is changed (and
	      // sometimes when it hasn't). IE's event fires out of order with respect
	      // to key and input events on deletion, so we discard it.
	      //
	      // Firefox doesn't support selectionchange, so check selection status
	      // after each key entry. The selection changes after keydown and before
	      // keyup, but we check on keydown as well in the case of holding down a
	      // key, when multiple keydown events are fired but only one keyup is.
	      // This is also our approach for IE handling, for the reason above.
	      case topLevelTypes.topSelectionChange:
	        if (skipSelectionChangeEvent) {
	          break;
	        }
	      // falls through
	      case topLevelTypes.topKeyDown:
	      case topLevelTypes.topKeyUp:
	        return constructSelectEvent(nativeEvent, nativeEventTarget);
	    }

	    return null;
	  },

	  didPutListener: function (id, registrationName, listener) {
	    if (registrationName === ON_SELECT_KEY) {
	      hasListener = true;
	    }
	  }
	};

	module.exports = SelectEventPlugin;

/***/ },
/* 131 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ServerReactRootIndex
	 * @typechecks
	 */

	'use strict';

	/**
	 * Size of the reactRoot ID space. We generate random numbers for React root
	 * IDs and if there's a collision the events and DOM update system will
	 * get confused. In the future we need a way to generate GUIDs but for
	 * now this will work on a smaller scale.
	 */
	var GLOBAL_MOUNT_POINT_MAX = Math.pow(2, 53);

	var ServerReactRootIndex = {
	  createReactRootIndex: function () {
	    return Math.ceil(Math.random() * GLOBAL_MOUNT_POINT_MAX);
	  }
	};

	module.exports = ServerReactRootIndex;

/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SimpleEventPlugin
	 */

	'use strict';

	var EventConstants = __webpack_require__(30);
	var EventListener = __webpack_require__(119);
	var EventPropagators = __webpack_require__(73);
	var ReactMount = __webpack_require__(28);
	var SyntheticClipboardEvent = __webpack_require__(133);
	var SyntheticEvent = __webpack_require__(77);
	var SyntheticFocusEvent = __webpack_require__(134);
	var SyntheticKeyboardEvent = __webpack_require__(135);
	var SyntheticMouseEvent = __webpack_require__(86);
	var SyntheticDragEvent = __webpack_require__(138);
	var SyntheticTouchEvent = __webpack_require__(139);
	var SyntheticUIEvent = __webpack_require__(87);
	var SyntheticWheelEvent = __webpack_require__(140);

	var emptyFunction = __webpack_require__(15);
	var getEventCharCode = __webpack_require__(136);
	var invariant = __webpack_require__(13);
	var keyOf = __webpack_require__(79);

	var topLevelTypes = EventConstants.topLevelTypes;

	var eventTypes = {
	  abort: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onAbort: true }),
	      captured: keyOf({ onAbortCapture: true })
	    }
	  },
	  blur: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onBlur: true }),
	      captured: keyOf({ onBlurCapture: true })
	    }
	  },
	  canPlay: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCanPlay: true }),
	      captured: keyOf({ onCanPlayCapture: true })
	    }
	  },
	  canPlayThrough: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCanPlayThrough: true }),
	      captured: keyOf({ onCanPlayThroughCapture: true })
	    }
	  },
	  click: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onClick: true }),
	      captured: keyOf({ onClickCapture: true })
	    }
	  },
	  contextMenu: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onContextMenu: true }),
	      captured: keyOf({ onContextMenuCapture: true })
	    }
	  },
	  copy: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCopy: true }),
	      captured: keyOf({ onCopyCapture: true })
	    }
	  },
	  cut: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onCut: true }),
	      captured: keyOf({ onCutCapture: true })
	    }
	  },
	  doubleClick: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDoubleClick: true }),
	      captured: keyOf({ onDoubleClickCapture: true })
	    }
	  },
	  drag: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDrag: true }),
	      captured: keyOf({ onDragCapture: true })
	    }
	  },
	  dragEnd: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragEnd: true }),
	      captured: keyOf({ onDragEndCapture: true })
	    }
	  },
	  dragEnter: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragEnter: true }),
	      captured: keyOf({ onDragEnterCapture: true })
	    }
	  },
	  dragExit: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragExit: true }),
	      captured: keyOf({ onDragExitCapture: true })
	    }
	  },
	  dragLeave: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragLeave: true }),
	      captured: keyOf({ onDragLeaveCapture: true })
	    }
	  },
	  dragOver: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragOver: true }),
	      captured: keyOf({ onDragOverCapture: true })
	    }
	  },
	  dragStart: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDragStart: true }),
	      captured: keyOf({ onDragStartCapture: true })
	    }
	  },
	  drop: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDrop: true }),
	      captured: keyOf({ onDropCapture: true })
	    }
	  },
	  durationChange: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onDurationChange: true }),
	      captured: keyOf({ onDurationChangeCapture: true })
	    }
	  },
	  emptied: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onEmptied: true }),
	      captured: keyOf({ onEmptiedCapture: true })
	    }
	  },
	  encrypted: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onEncrypted: true }),
	      captured: keyOf({ onEncryptedCapture: true })
	    }
	  },
	  ended: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onEnded: true }),
	      captured: keyOf({ onEndedCapture: true })
	    }
	  },
	  error: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onError: true }),
	      captured: keyOf({ onErrorCapture: true })
	    }
	  },
	  focus: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onFocus: true }),
	      captured: keyOf({ onFocusCapture: true })
	    }
	  },
	  input: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onInput: true }),
	      captured: keyOf({ onInputCapture: true })
	    }
	  },
	  keyDown: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onKeyDown: true }),
	      captured: keyOf({ onKeyDownCapture: true })
	    }
	  },
	  keyPress: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onKeyPress: true }),
	      captured: keyOf({ onKeyPressCapture: true })
	    }
	  },
	  keyUp: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onKeyUp: true }),
	      captured: keyOf({ onKeyUpCapture: true })
	    }
	  },
	  load: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onLoad: true }),
	      captured: keyOf({ onLoadCapture: true })
	    }
	  },
	  loadedData: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onLoadedData: true }),
	      captured: keyOf({ onLoadedDataCapture: true })
	    }
	  },
	  loadedMetadata: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onLoadedMetadata: true }),
	      captured: keyOf({ onLoadedMetadataCapture: true })
	    }
	  },
	  loadStart: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onLoadStart: true }),
	      captured: keyOf({ onLoadStartCapture: true })
	    }
	  },
	  // Note: We do not allow listening to mouseOver events. Instead, use the
	  // onMouseEnter/onMouseLeave created by `EnterLeaveEventPlugin`.
	  mouseDown: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onMouseDown: true }),
	      captured: keyOf({ onMouseDownCapture: true })
	    }
	  },
	  mouseMove: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onMouseMove: true }),
	      captured: keyOf({ onMouseMoveCapture: true })
	    }
	  },
	  mouseOut: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onMouseOut: true }),
	      captured: keyOf({ onMouseOutCapture: true })
	    }
	  },
	  mouseOver: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onMouseOver: true }),
	      captured: keyOf({ onMouseOverCapture: true })
	    }
	  },
	  mouseUp: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onMouseUp: true }),
	      captured: keyOf({ onMouseUpCapture: true })
	    }
	  },
	  paste: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onPaste: true }),
	      captured: keyOf({ onPasteCapture: true })
	    }
	  },
	  pause: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onPause: true }),
	      captured: keyOf({ onPauseCapture: true })
	    }
	  },
	  play: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onPlay: true }),
	      captured: keyOf({ onPlayCapture: true })
	    }
	  },
	  playing: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onPlaying: true }),
	      captured: keyOf({ onPlayingCapture: true })
	    }
	  },
	  progress: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onProgress: true }),
	      captured: keyOf({ onProgressCapture: true })
	    }
	  },
	  rateChange: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onRateChange: true }),
	      captured: keyOf({ onRateChangeCapture: true })
	    }
	  },
	  reset: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onReset: true }),
	      captured: keyOf({ onResetCapture: true })
	    }
	  },
	  scroll: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onScroll: true }),
	      captured: keyOf({ onScrollCapture: true })
	    }
	  },
	  seeked: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onSeeked: true }),
	      captured: keyOf({ onSeekedCapture: true })
	    }
	  },
	  seeking: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onSeeking: true }),
	      captured: keyOf({ onSeekingCapture: true })
	    }
	  },
	  stalled: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onStalled: true }),
	      captured: keyOf({ onStalledCapture: true })
	    }
	  },
	  submit: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onSubmit: true }),
	      captured: keyOf({ onSubmitCapture: true })
	    }
	  },
	  suspend: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onSuspend: true }),
	      captured: keyOf({ onSuspendCapture: true })
	    }
	  },
	  timeUpdate: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onTimeUpdate: true }),
	      captured: keyOf({ onTimeUpdateCapture: true })
	    }
	  },
	  touchCancel: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onTouchCancel: true }),
	      captured: keyOf({ onTouchCancelCapture: true })
	    }
	  },
	  touchEnd: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onTouchEnd: true }),
	      captured: keyOf({ onTouchEndCapture: true })
	    }
	  },
	  touchMove: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onTouchMove: true }),
	      captured: keyOf({ onTouchMoveCapture: true })
	    }
	  },
	  touchStart: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onTouchStart: true }),
	      captured: keyOf({ onTouchStartCapture: true })
	    }
	  },
	  volumeChange: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onVolumeChange: true }),
	      captured: keyOf({ onVolumeChangeCapture: true })
	    }
	  },
	  waiting: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onWaiting: true }),
	      captured: keyOf({ onWaitingCapture: true })
	    }
	  },
	  wheel: {
	    phasedRegistrationNames: {
	      bubbled: keyOf({ onWheel: true }),
	      captured: keyOf({ onWheelCapture: true })
	    }
	  }
	};

	var topLevelEventsToDispatchConfig = {
	  topAbort: eventTypes.abort,
	  topBlur: eventTypes.blur,
	  topCanPlay: eventTypes.canPlay,
	  topCanPlayThrough: eventTypes.canPlayThrough,
	  topClick: eventTypes.click,
	  topContextMenu: eventTypes.contextMenu,
	  topCopy: eventTypes.copy,
	  topCut: eventTypes.cut,
	  topDoubleClick: eventTypes.doubleClick,
	  topDrag: eventTypes.drag,
	  topDragEnd: eventTypes.dragEnd,
	  topDragEnter: eventTypes.dragEnter,
	  topDragExit: eventTypes.dragExit,
	  topDragLeave: eventTypes.dragLeave,
	  topDragOver: eventTypes.dragOver,
	  topDragStart: eventTypes.dragStart,
	  topDrop: eventTypes.drop,
	  topDurationChange: eventTypes.durationChange,
	  topEmptied: eventTypes.emptied,
	  topEncrypted: eventTypes.encrypted,
	  topEnded: eventTypes.ended,
	  topError: eventTypes.error,
	  topFocus: eventTypes.focus,
	  topInput: eventTypes.input,
	  topKeyDown: eventTypes.keyDown,
	  topKeyPress: eventTypes.keyPress,
	  topKeyUp: eventTypes.keyUp,
	  topLoad: eventTypes.load,
	  topLoadedData: eventTypes.loadedData,
	  topLoadedMetadata: eventTypes.loadedMetadata,
	  topLoadStart: eventTypes.loadStart,
	  topMouseDown: eventTypes.mouseDown,
	  topMouseMove: eventTypes.mouseMove,
	  topMouseOut: eventTypes.mouseOut,
	  topMouseOver: eventTypes.mouseOver,
	  topMouseUp: eventTypes.mouseUp,
	  topPaste: eventTypes.paste,
	  topPause: eventTypes.pause,
	  topPlay: eventTypes.play,
	  topPlaying: eventTypes.playing,
	  topProgress: eventTypes.progress,
	  topRateChange: eventTypes.rateChange,
	  topReset: eventTypes.reset,
	  topScroll: eventTypes.scroll,
	  topSeeked: eventTypes.seeked,
	  topSeeking: eventTypes.seeking,
	  topStalled: eventTypes.stalled,
	  topSubmit: eventTypes.submit,
	  topSuspend: eventTypes.suspend,
	  topTimeUpdate: eventTypes.timeUpdate,
	  topTouchCancel: eventTypes.touchCancel,
	  topTouchEnd: eventTypes.touchEnd,
	  topTouchMove: eventTypes.touchMove,
	  topTouchStart: eventTypes.touchStart,
	  topVolumeChange: eventTypes.volumeChange,
	  topWaiting: eventTypes.waiting,
	  topWheel: eventTypes.wheel
	};

	for (var type in topLevelEventsToDispatchConfig) {
	  topLevelEventsToDispatchConfig[type].dependencies = [type];
	}

	var ON_CLICK_KEY = keyOf({ onClick: null });
	var onClickListeners = {};

	var SimpleEventPlugin = {

	  eventTypes: eventTypes,

	  /**
	   * @param {string} topLevelType Record from `EventConstants`.
	   * @param {DOMEventTarget} topLevelTarget The listening component root node.
	   * @param {string} topLevelTargetID ID of `topLevelTarget`.
	   * @param {object} nativeEvent Native browser event.
	   * @return {*} An accumulation of synthetic events.
	   * @see {EventPluginHub.extractEvents}
	   */
	  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
	    var dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
	    if (!dispatchConfig) {
	      return null;
	    }
	    var EventConstructor;
	    switch (topLevelType) {
	      case topLevelTypes.topAbort:
	      case topLevelTypes.topCanPlay:
	      case topLevelTypes.topCanPlayThrough:
	      case topLevelTypes.topDurationChange:
	      case topLevelTypes.topEmptied:
	      case topLevelTypes.topEncrypted:
	      case topLevelTypes.topEnded:
	      case topLevelTypes.topError:
	      case topLevelTypes.topInput:
	      case topLevelTypes.topLoad:
	      case topLevelTypes.topLoadedData:
	      case topLevelTypes.topLoadedMetadata:
	      case topLevelTypes.topLoadStart:
	      case topLevelTypes.topPause:
	      case topLevelTypes.topPlay:
	      case topLevelTypes.topPlaying:
	      case topLevelTypes.topProgress:
	      case topLevelTypes.topRateChange:
	      case topLevelTypes.topReset:
	      case topLevelTypes.topSeeked:
	      case topLevelTypes.topSeeking:
	      case topLevelTypes.topStalled:
	      case topLevelTypes.topSubmit:
	      case topLevelTypes.topSuspend:
	      case topLevelTypes.topTimeUpdate:
	      case topLevelTypes.topVolumeChange:
	      case topLevelTypes.topWaiting:
	        // HTML Events
	        // @see http://www.w3.org/TR/html5/index.html#events-0
	        EventConstructor = SyntheticEvent;
	        break;
	      case topLevelTypes.topKeyPress:
	        // FireFox creates a keypress event for function keys too. This removes
	        // the unwanted keypress events. Enter is however both printable and
	        // non-printable. One would expect Tab to be as well (but it isn't).
	        if (getEventCharCode(nativeEvent) === 0) {
	          return null;
	        }
	      /* falls through */
	      case topLevelTypes.topKeyDown:
	      case topLevelTypes.topKeyUp:
	        EventConstructor = SyntheticKeyboardEvent;
	        break;
	      case topLevelTypes.topBlur:
	      case topLevelTypes.topFocus:
	        EventConstructor = SyntheticFocusEvent;
	        break;
	      case topLevelTypes.topClick:
	        // Firefox creates a click event on right mouse clicks. This removes the
	        // unwanted click events.
	        if (nativeEvent.button === 2) {
	          return null;
	        }
	      /* falls through */
	      case topLevelTypes.topContextMenu:
	      case topLevelTypes.topDoubleClick:
	      case topLevelTypes.topMouseDown:
	      case topLevelTypes.topMouseMove:
	      case topLevelTypes.topMouseOut:
	      case topLevelTypes.topMouseOver:
	      case topLevelTypes.topMouseUp:
	        EventConstructor = SyntheticMouseEvent;
	        break;
	      case topLevelTypes.topDrag:
	      case topLevelTypes.topDragEnd:
	      case topLevelTypes.topDragEnter:
	      case topLevelTypes.topDragExit:
	      case topLevelTypes.topDragLeave:
	      case topLevelTypes.topDragOver:
	      case topLevelTypes.topDragStart:
	      case topLevelTypes.topDrop:
	        EventConstructor = SyntheticDragEvent;
	        break;
	      case topLevelTypes.topTouchCancel:
	      case topLevelTypes.topTouchEnd:
	      case topLevelTypes.topTouchMove:
	      case topLevelTypes.topTouchStart:
	        EventConstructor = SyntheticTouchEvent;
	        break;
	      case topLevelTypes.topScroll:
	        EventConstructor = SyntheticUIEvent;
	        break;
	      case topLevelTypes.topWheel:
	        EventConstructor = SyntheticWheelEvent;
	        break;
	      case topLevelTypes.topCopy:
	      case topLevelTypes.topCut:
	      case topLevelTypes.topPaste:
	        EventConstructor = SyntheticClipboardEvent;
	        break;
	    }
	    !EventConstructor ?  false ? invariant(false, 'SimpleEventPlugin: Unhandled event type, `%s`.', topLevelType) : invariant(false) : undefined;
	    var event = EventConstructor.getPooled(dispatchConfig, topLevelTargetID, nativeEvent, nativeEventTarget);
	    EventPropagators.accumulateTwoPhaseDispatches(event);
	    return event;
	  },

	  didPutListener: function (id, registrationName, listener) {
	    // Mobile Safari does not fire properly bubble click events on
	    // non-interactive elements, which means delegated click listeners do not
	    // fire. The workaround for this bug involves attaching an empty click
	    // listener on the target node.
	    if (registrationName === ON_CLICK_KEY) {
	      var node = ReactMount.getNode(id);
	      if (!onClickListeners[id]) {
	        onClickListeners[id] = EventListener.listen(node, 'click', emptyFunction);
	      }
	    }
	  },

	  willDeleteListener: function (id, registrationName) {
	    if (registrationName === ON_CLICK_KEY) {
	      onClickListeners[id].remove();
	      delete onClickListeners[id];
	    }
	  }

	};

	module.exports = SimpleEventPlugin;

/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticClipboardEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticEvent = __webpack_require__(77);

	/**
	 * @interface Event
	 * @see http://www.w3.org/TR/clipboard-apis/
	 */
	var ClipboardEventInterface = {
	  clipboardData: function (event) {
	    return 'clipboardData' in event ? event.clipboardData : window.clipboardData;
	  }
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticClipboardEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticEvent.augmentClass(SyntheticClipboardEvent, ClipboardEventInterface);

	module.exports = SyntheticClipboardEvent;

/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticFocusEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticUIEvent = __webpack_require__(87);

	/**
	 * @interface FocusEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var FocusEventInterface = {
	  relatedTarget: null
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticFocusEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticUIEvent.augmentClass(SyntheticFocusEvent, FocusEventInterface);

	module.exports = SyntheticFocusEvent;

/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticKeyboardEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticUIEvent = __webpack_require__(87);

	var getEventCharCode = __webpack_require__(136);
	var getEventKey = __webpack_require__(137);
	var getEventModifierState = __webpack_require__(88);

	/**
	 * @interface KeyboardEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var KeyboardEventInterface = {
	  key: getEventKey,
	  location: null,
	  ctrlKey: null,
	  shiftKey: null,
	  altKey: null,
	  metaKey: null,
	  repeat: null,
	  locale: null,
	  getModifierState: getEventModifierState,
	  // Legacy Interface
	  charCode: function (event) {
	    // `charCode` is the result of a KeyPress event and represents the value of
	    // the actual printable character.

	    // KeyPress is deprecated, but its replacement is not yet final and not
	    // implemented in any major browser. Only KeyPress has charCode.
	    if (event.type === 'keypress') {
	      return getEventCharCode(event);
	    }
	    return 0;
	  },
	  keyCode: function (event) {
	    // `keyCode` is the result of a KeyDown/Up event and represents the value of
	    // physical keyboard key.

	    // The actual meaning of the value depends on the users' keyboard layout
	    // which cannot be detected. Assuming that it is a US keyboard layout
	    // provides a surprisingly accurate mapping for US and European users.
	    // Due to this, it is left to the user to implement at this time.
	    if (event.type === 'keydown' || event.type === 'keyup') {
	      return event.keyCode;
	    }
	    return 0;
	  },
	  which: function (event) {
	    // `which` is an alias for either `keyCode` or `charCode` depending on the
	    // type of the event.
	    if (event.type === 'keypress') {
	      return getEventCharCode(event);
	    }
	    if (event.type === 'keydown' || event.type === 'keyup') {
	      return event.keyCode;
	    }
	    return 0;
	  }
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticKeyboardEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticUIEvent.augmentClass(SyntheticKeyboardEvent, KeyboardEventInterface);

	module.exports = SyntheticKeyboardEvent;

/***/ },
/* 136 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getEventCharCode
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * `charCode` represents the actual "character code" and is safe to use with
	 * `String.fromCharCode`. As such, only keys that correspond to printable
	 * characters produce a valid `charCode`, the only exception to this is Enter.
	 * The Tab-key is considered non-printable and does not have a `charCode`,
	 * presumably because it does not produce a tab-character in browsers.
	 *
	 * @param {object} nativeEvent Native browser event.
	 * @return {number} Normalized `charCode` property.
	 */
	function getEventCharCode(nativeEvent) {
	  var charCode;
	  var keyCode = nativeEvent.keyCode;

	  if ('charCode' in nativeEvent) {
	    charCode = nativeEvent.charCode;

	    // FF does not set `charCode` for the Enter-key, check against `keyCode`.
	    if (charCode === 0 && keyCode === 13) {
	      charCode = 13;
	    }
	  } else {
	    // IE8 does not implement `charCode`, but `keyCode` has the correct value.
	    charCode = keyCode;
	  }

	  // Some non-printable keys are reported in `charCode`/`keyCode`, discard them.
	  // Must not discard the (non-)printable Enter-key.
	  if (charCode >= 32 || charCode === 13) {
	    return charCode;
	  }

	  return 0;
	}

	module.exports = getEventCharCode;

/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getEventKey
	 * @typechecks static-only
	 */

	'use strict';

	var getEventCharCode = __webpack_require__(136);

	/**
	 * Normalization of deprecated HTML5 `key` values
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
	 */
	var normalizeKey = {
	  'Esc': 'Escape',
	  'Spacebar': ' ',
	  'Left': 'ArrowLeft',
	  'Up': 'ArrowUp',
	  'Right': 'ArrowRight',
	  'Down': 'ArrowDown',
	  'Del': 'Delete',
	  'Win': 'OS',
	  'Menu': 'ContextMenu',
	  'Apps': 'ContextMenu',
	  'Scroll': 'ScrollLock',
	  'MozPrintableKey': 'Unidentified'
	};

	/**
	 * Translation from legacy `keyCode` to HTML5 `key`
	 * Only special keys supported, all others depend on keyboard layout or browser
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
	 */
	var translateToKey = {
	  8: 'Backspace',
	  9: 'Tab',
	  12: 'Clear',
	  13: 'Enter',
	  16: 'Shift',
	  17: 'Control',
	  18: 'Alt',
	  19: 'Pause',
	  20: 'CapsLock',
	  27: 'Escape',
	  32: ' ',
	  33: 'PageUp',
	  34: 'PageDown',
	  35: 'End',
	  36: 'Home',
	  37: 'ArrowLeft',
	  38: 'ArrowUp',
	  39: 'ArrowRight',
	  40: 'ArrowDown',
	  45: 'Insert',
	  46: 'Delete',
	  112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
	  118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
	  144: 'NumLock',
	  145: 'ScrollLock',
	  224: 'Meta'
	};

	/**
	 * @param {object} nativeEvent Native browser event.
	 * @return {string} Normalized `key` property.
	 */
	function getEventKey(nativeEvent) {
	  if (nativeEvent.key) {
	    // Normalize inconsistent values reported by browsers due to
	    // implementations of a working draft specification.

	    // FireFox implements `key` but returns `MozPrintableKey` for all
	    // printable characters (normalized to `Unidentified`), ignore it.
	    var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
	    if (key !== 'Unidentified') {
	      return key;
	    }
	  }

	  // Browser does not implement `key`, polyfill as much of it as we can.
	  if (nativeEvent.type === 'keypress') {
	    var charCode = getEventCharCode(nativeEvent);

	    // The enter-key is technically both printable and non-printable and can
	    // thus be captured by `keypress`, no other non-printable key should.
	    return charCode === 13 ? 'Enter' : String.fromCharCode(charCode);
	  }
	  if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
	    // While user keyboard layout determines the actual meaning of each
	    // `keyCode` value, almost all function keys have a universal value.
	    return translateToKey[nativeEvent.keyCode] || 'Unidentified';
	  }
	  return '';
	}

	module.exports = getEventKey;

/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticDragEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticMouseEvent = __webpack_require__(86);

	/**
	 * @interface DragEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var DragEventInterface = {
	  dataTransfer: null
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticDragEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticMouseEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticMouseEvent.augmentClass(SyntheticDragEvent, DragEventInterface);

	module.exports = SyntheticDragEvent;

/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticTouchEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticUIEvent = __webpack_require__(87);

	var getEventModifierState = __webpack_require__(88);

	/**
	 * @interface TouchEvent
	 * @see http://www.w3.org/TR/touch-events/
	 */
	var TouchEventInterface = {
	  touches: null,
	  targetTouches: null,
	  changedTouches: null,
	  altKey: null,
	  metaKey: null,
	  ctrlKey: null,
	  shiftKey: null,
	  getModifierState: getEventModifierState
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticUIEvent}
	 */
	function SyntheticTouchEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticUIEvent.augmentClass(SyntheticTouchEvent, TouchEventInterface);

	module.exports = SyntheticTouchEvent;

/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SyntheticWheelEvent
	 * @typechecks static-only
	 */

	'use strict';

	var SyntheticMouseEvent = __webpack_require__(86);

	/**
	 * @interface WheelEvent
	 * @see http://www.w3.org/TR/DOM-Level-3-Events/
	 */
	var WheelEventInterface = {
	  deltaX: function (event) {
	    return 'deltaX' in event ? event.deltaX :
	    // Fallback to `wheelDeltaX` for Webkit and normalize (right is positive).
	    'wheelDeltaX' in event ? -event.wheelDeltaX : 0;
	  },
	  deltaY: function (event) {
	    return 'deltaY' in event ? event.deltaY :
	    // Fallback to `wheelDeltaY` for Webkit and normalize (down is positive).
	    'wheelDeltaY' in event ? -event.wheelDeltaY :
	    // Fallback to `wheelDelta` for IE<9 and normalize (down is positive).
	    'wheelDelta' in event ? -event.wheelDelta : 0;
	  },
	  deltaZ: null,

	  // Browsers without "deltaMode" is reporting in raw wheel delta where one
	  // notch on the scroll is always +/- 120, roughly equivalent to pixels.
	  // A good approximation of DOM_DELTA_LINE (1) is 5% of viewport size or
	  // ~40 pixels, for DOM_DELTA_SCREEN (2) it is 87.5% of viewport size.
	  deltaMode: null
	};

	/**
	 * @param {object} dispatchConfig Configuration used to dispatch this event.
	 * @param {string} dispatchMarker Marker identifying the event target.
	 * @param {object} nativeEvent Native browser event.
	 * @extends {SyntheticMouseEvent}
	 */
	function SyntheticWheelEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
	  SyntheticMouseEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
	}

	SyntheticMouseEvent.augmentClass(SyntheticWheelEvent, WheelEventInterface);

	module.exports = SyntheticWheelEvent;

/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule SVGDOMPropertyConfig
	 */

	'use strict';

	var DOMProperty = __webpack_require__(23);

	var MUST_USE_ATTRIBUTE = DOMProperty.injection.MUST_USE_ATTRIBUTE;

	var NS = {
	  xlink: 'http://www.w3.org/1999/xlink',
	  xml: 'http://www.w3.org/XML/1998/namespace'
	};

	var SVGDOMPropertyConfig = {
	  Properties: {
	    clipPath: MUST_USE_ATTRIBUTE,
	    cx: MUST_USE_ATTRIBUTE,
	    cy: MUST_USE_ATTRIBUTE,
	    d: MUST_USE_ATTRIBUTE,
	    dx: MUST_USE_ATTRIBUTE,
	    dy: MUST_USE_ATTRIBUTE,
	    fill: MUST_USE_ATTRIBUTE,
	    fillOpacity: MUST_USE_ATTRIBUTE,
	    fontFamily: MUST_USE_ATTRIBUTE,
	    fontSize: MUST_USE_ATTRIBUTE,
	    fx: MUST_USE_ATTRIBUTE,
	    fy: MUST_USE_ATTRIBUTE,
	    gradientTransform: MUST_USE_ATTRIBUTE,
	    gradientUnits: MUST_USE_ATTRIBUTE,
	    markerEnd: MUST_USE_ATTRIBUTE,
	    markerMid: MUST_USE_ATTRIBUTE,
	    markerStart: MUST_USE_ATTRIBUTE,
	    offset: MUST_USE_ATTRIBUTE,
	    opacity: MUST_USE_ATTRIBUTE,
	    patternContentUnits: MUST_USE_ATTRIBUTE,
	    patternUnits: MUST_USE_ATTRIBUTE,
	    points: MUST_USE_ATTRIBUTE,
	    preserveAspectRatio: MUST_USE_ATTRIBUTE,
	    r: MUST_USE_ATTRIBUTE,
	    rx: MUST_USE_ATTRIBUTE,
	    ry: MUST_USE_ATTRIBUTE,
	    spreadMethod: MUST_USE_ATTRIBUTE,
	    stopColor: MUST_USE_ATTRIBUTE,
	    stopOpacity: MUST_USE_ATTRIBUTE,
	    stroke: MUST_USE_ATTRIBUTE,
	    strokeDasharray: MUST_USE_ATTRIBUTE,
	    strokeLinecap: MUST_USE_ATTRIBUTE,
	    strokeOpacity: MUST_USE_ATTRIBUTE,
	    strokeWidth: MUST_USE_ATTRIBUTE,
	    textAnchor: MUST_USE_ATTRIBUTE,
	    transform: MUST_USE_ATTRIBUTE,
	    version: MUST_USE_ATTRIBUTE,
	    viewBox: MUST_USE_ATTRIBUTE,
	    x1: MUST_USE_ATTRIBUTE,
	    x2: MUST_USE_ATTRIBUTE,
	    x: MUST_USE_ATTRIBUTE,
	    xlinkActuate: MUST_USE_ATTRIBUTE,
	    xlinkArcrole: MUST_USE_ATTRIBUTE,
	    xlinkHref: MUST_USE_ATTRIBUTE,
	    xlinkRole: MUST_USE_ATTRIBUTE,
	    xlinkShow: MUST_USE_ATTRIBUTE,
	    xlinkTitle: MUST_USE_ATTRIBUTE,
	    xlinkType: MUST_USE_ATTRIBUTE,
	    xmlBase: MUST_USE_ATTRIBUTE,
	    xmlLang: MUST_USE_ATTRIBUTE,
	    xmlSpace: MUST_USE_ATTRIBUTE,
	    y1: MUST_USE_ATTRIBUTE,
	    y2: MUST_USE_ATTRIBUTE,
	    y: MUST_USE_ATTRIBUTE
	  },
	  DOMAttributeNamespaces: {
	    xlinkActuate: NS.xlink,
	    xlinkArcrole: NS.xlink,
	    xlinkHref: NS.xlink,
	    xlinkRole: NS.xlink,
	    xlinkShow: NS.xlink,
	    xlinkTitle: NS.xlink,
	    xlinkType: NS.xlink,
	    xmlBase: NS.xml,
	    xmlLang: NS.xml,
	    xmlSpace: NS.xml
	  },
	  DOMAttributeNames: {
	    clipPath: 'clip-path',
	    fillOpacity: 'fill-opacity',
	    fontFamily: 'font-family',
	    fontSize: 'font-size',
	    gradientTransform: 'gradientTransform',
	    gradientUnits: 'gradientUnits',
	    markerEnd: 'marker-end',
	    markerMid: 'marker-mid',
	    markerStart: 'marker-start',
	    patternContentUnits: 'patternContentUnits',
	    patternUnits: 'patternUnits',
	    preserveAspectRatio: 'preserveAspectRatio',
	    spreadMethod: 'spreadMethod',
	    stopColor: 'stop-color',
	    stopOpacity: 'stop-opacity',
	    strokeDasharray: 'stroke-dasharray',
	    strokeLinecap: 'stroke-linecap',
	    strokeOpacity: 'stroke-opacity',
	    strokeWidth: 'stroke-width',
	    textAnchor: 'text-anchor',
	    viewBox: 'viewBox',
	    xlinkActuate: 'xlink:actuate',
	    xlinkArcrole: 'xlink:arcrole',
	    xlinkHref: 'xlink:href',
	    xlinkRole: 'xlink:role',
	    xlinkShow: 'xlink:show',
	    xlinkTitle: 'xlink:title',
	    xlinkType: 'xlink:type',
	    xmlBase: 'xml:base',
	    xmlLang: 'xml:lang',
	    xmlSpace: 'xml:space'
	  }
	};

	module.exports = SVGDOMPropertyConfig;

/***/ },
/* 142 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactVersion
	 */

	'use strict';

	module.exports = '0.14.7';

/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	* @providesModule renderSubtreeIntoContainer
	*/

	'use strict';

	var ReactMount = __webpack_require__(28);

	module.exports = ReactMount.renderSubtreeIntoContainer;

/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMServer
	 */

	'use strict';

	var ReactDefaultInjection = __webpack_require__(71);
	var ReactServerRendering = __webpack_require__(145);
	var ReactVersion = __webpack_require__(142);

	ReactDefaultInjection.inject();

	var ReactDOMServer = {
	  renderToString: ReactServerRendering.renderToString,
	  renderToStaticMarkup: ReactServerRendering.renderToStaticMarkup,
	  version: ReactVersion
	};

	module.exports = ReactDOMServer;

/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @typechecks static-only
	 * @providesModule ReactServerRendering
	 */
	'use strict';

	var ReactDefaultBatchingStrategy = __webpack_require__(92);
	var ReactElement = __webpack_require__(42);
	var ReactInstanceHandles = __webpack_require__(45);
	var ReactMarkupChecksum = __webpack_require__(48);
	var ReactServerBatchingStrategy = __webpack_require__(146);
	var ReactServerRenderingTransaction = __webpack_require__(147);
	var ReactUpdates = __webpack_require__(54);

	var emptyObject = __webpack_require__(58);
	var instantiateReactComponent = __webpack_require__(62);
	var invariant = __webpack_require__(13);

	/**
	 * @param {ReactElement} element
	 * @return {string} the HTML markup
	 */
	function renderToString(element) {
	  !ReactElement.isValidElement(element) ?  false ? invariant(false, 'renderToString(): You must pass a valid ReactElement.') : invariant(false) : undefined;

	  var transaction;
	  try {
	    ReactUpdates.injection.injectBatchingStrategy(ReactServerBatchingStrategy);

	    var id = ReactInstanceHandles.createReactRootID();
	    transaction = ReactServerRenderingTransaction.getPooled(false);

	    return transaction.perform(function () {
	      var componentInstance = instantiateReactComponent(element, null);
	      var markup = componentInstance.mountComponent(id, transaction, emptyObject);
	      return ReactMarkupChecksum.addChecksumToMarkup(markup);
	    }, null);
	  } finally {
	    ReactServerRenderingTransaction.release(transaction);
	    // Revert to the DOM batching strategy since these two renderers
	    // currently share these stateful modules.
	    ReactUpdates.injection.injectBatchingStrategy(ReactDefaultBatchingStrategy);
	  }
	}

	/**
	 * @param {ReactElement} element
	 * @return {string} the HTML markup, without the extra React ID and checksum
	 * (for generating static pages)
	 */
	function renderToStaticMarkup(element) {
	  !ReactElement.isValidElement(element) ?  false ? invariant(false, 'renderToStaticMarkup(): You must pass a valid ReactElement.') : invariant(false) : undefined;

	  var transaction;
	  try {
	    ReactUpdates.injection.injectBatchingStrategy(ReactServerBatchingStrategy);

	    var id = ReactInstanceHandles.createReactRootID();
	    transaction = ReactServerRenderingTransaction.getPooled(true);

	    return transaction.perform(function () {
	      var componentInstance = instantiateReactComponent(element, null);
	      return componentInstance.mountComponent(id, transaction, emptyObject);
	    }, null);
	  } finally {
	    ReactServerRenderingTransaction.release(transaction);
	    // Revert to the DOM batching strategy since these two renderers
	    // currently share these stateful modules.
	    ReactUpdates.injection.injectBatchingStrategy(ReactDefaultBatchingStrategy);
	  }
	}

	module.exports = {
	  renderToString: renderToString,
	  renderToStaticMarkup: renderToStaticMarkup
	};

/***/ },
/* 146 */
/***/ function(module, exports) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactServerBatchingStrategy
	 * @typechecks
	 */

	'use strict';

	var ReactServerBatchingStrategy = {
	  isBatchingUpdates: false,
	  batchedUpdates: function (callback) {
	    // Don't do anything here. During the server rendering we don't want to
	    // schedule any updates. We will simply ignore them.
	  }
	};

	module.exports = ReactServerBatchingStrategy;

/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactServerRenderingTransaction
	 * @typechecks
	 */

	'use strict';

	var PooledClass = __webpack_require__(56);
	var CallbackQueue = __webpack_require__(55);
	var Transaction = __webpack_require__(57);

	var assign = __webpack_require__(39);
	var emptyFunction = __webpack_require__(15);

	/**
	 * Provides a `CallbackQueue` queue for collecting `onDOMReady` callbacks
	 * during the performing of the transaction.
	 */
	var ON_DOM_READY_QUEUEING = {
	  /**
	   * Initializes the internal `onDOMReady` queue.
	   */
	  initialize: function () {
	    this.reactMountReady.reset();
	  },

	  close: emptyFunction
	};

	/**
	 * Executed within the scope of the `Transaction` instance. Consider these as
	 * being member methods, but with an implied ordering while being isolated from
	 * each other.
	 */
	var TRANSACTION_WRAPPERS = [ON_DOM_READY_QUEUEING];

	/**
	 * @class ReactServerRenderingTransaction
	 * @param {boolean} renderToStaticMarkup
	 */
	function ReactServerRenderingTransaction(renderToStaticMarkup) {
	  this.reinitializeTransaction();
	  this.renderToStaticMarkup = renderToStaticMarkup;
	  this.reactMountReady = CallbackQueue.getPooled(null);
	  this.useCreateElement = false;
	}

	var Mixin = {
	  /**
	   * @see Transaction
	   * @abstract
	   * @final
	   * @return {array} Empty list of operation wrap procedures.
	   */
	  getTransactionWrappers: function () {
	    return TRANSACTION_WRAPPERS;
	  },

	  /**
	   * @return {object} The queue to collect `onDOMReady` callbacks with.
	   */
	  getReactMountReady: function () {
	    return this.reactMountReady;
	  },

	  /**
	   * `PooledClass` looks for this, and will invoke this before allowing this
	   * instance to be reused.
	   */
	  destructor: function () {
	    CallbackQueue.release(this.reactMountReady);
	    this.reactMountReady = null;
	  }
	};

	assign(ReactServerRenderingTransaction.prototype, Transaction.Mixin, Mixin);

	PooledClass.addPoolingTo(ReactServerRenderingTransaction);

	module.exports = ReactServerRenderingTransaction;

/***/ },
/* 148 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactIsomorphic
	 */

	'use strict';

	var ReactChildren = __webpack_require__(110);
	var ReactComponent = __webpack_require__(123);
	var ReactClass = __webpack_require__(122);
	var ReactDOMFactories = __webpack_require__(149);
	var ReactElement = __webpack_require__(42);
	var ReactElementValidator = __webpack_require__(150);
	var ReactPropTypes = __webpack_require__(107);
	var ReactVersion = __webpack_require__(142);

	var assign = __webpack_require__(39);
	var onlyChild = __webpack_require__(152);

	var createElement = ReactElement.createElement;
	var createFactory = ReactElement.createFactory;
	var cloneElement = ReactElement.cloneElement;

	if (false) {
	  createElement = ReactElementValidator.createElement;
	  createFactory = ReactElementValidator.createFactory;
	  cloneElement = ReactElementValidator.cloneElement;
	}

	var React = {

	  // Modern

	  Children: {
	    map: ReactChildren.map,
	    forEach: ReactChildren.forEach,
	    count: ReactChildren.count,
	    toArray: ReactChildren.toArray,
	    only: onlyChild
	  },

	  Component: ReactComponent,

	  makeElement: createElement,
	  cloneElement: cloneElement,
	  isValidElement: ReactElement.isValidElement,

	  // Classic

	  PropTypes: ReactPropTypes,
	  createClass: ReactClass.createClass,
	  createFactory: createFactory,
	  createMixin: function (mixin) {
	    // Currently a noop. Will be used to validate and trace mixins.
	    return mixin;
	  },

	  // This looks DOM specific but these are actually isomorphic helpers
	  // since they are just generating DOM strings.
	  DOM: ReactDOMFactories,

	  version: ReactVersion,

	  // Hook for JSX spread, don't use this for anything else.
	  __spread: assign
	};

	module.exports = React;

/***/ },
/* 149 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactDOMFactories
	 * @typechecks static-only
	 */

	'use strict';

	var ReactElement = __webpack_require__(42);
	var ReactElementValidator = __webpack_require__(150);

	var mapObject = __webpack_require__(151);

	/**
	 * Create a factory that creates HTML tag elements.
	 *
	 * @param {string} tag Tag name (e.g. `div`).
	 * @private
	 */
	function createDOMFactory(tag) {
	  if (false) {
	    return ReactElementValidator.createFactory(tag);
	  }
	  return ReactElement.createFactory(tag);
	}

	/**
	 * Creates a mapping from supported HTML tags to `ReactDOMComponent` classes.
	 * This is also accessible via `React.DOM`.
	 *
	 * @public
	 */
	var ReactDOMFactories = mapObject({
	  a: 'a',
	  abbr: 'abbr',
	  address: 'address',
	  area: 'area',
	  article: 'article',
	  aside: 'aside',
	  audio: 'audio',
	  b: 'b',
	  base: 'base',
	  bdi: 'bdi',
	  bdo: 'bdo',
	  big: 'big',
	  blockquote: 'blockquote',
	  body: 'body',
	  br: 'br',
	  button: 'button',
	  canvas: 'canvas',
	  caption: 'caption',
	  cite: 'cite',
	  code: 'code',
	  col: 'col',
	  colgroup: 'colgroup',
	  data: 'data',
	  datalist: 'datalist',
	  dd: 'dd',
	  del: 'del',
	  details: 'details',
	  dfn: 'dfn',
	  dialog: 'dialog',
	  div: 'div',
	  dl: 'dl',
	  dt: 'dt',
	  em: 'em',
	  embed: 'embed',
	  fieldset: 'fieldset',
	  figcaption: 'figcaption',
	  figure: 'figure',
	  footer: 'footer',
	  form: 'form',
	  h1: 'h1',
	  h2: 'h2',
	  h3: 'h3',
	  h4: 'h4',
	  h5: 'h5',
	  h6: 'h6',
	  head: 'head',
	  header: 'header',
	  hgroup: 'hgroup',
	  hr: 'hr',
	  html: 'html',
	  i: 'i',
	  iframe: 'iframe',
	  img: 'img',
	  input: 'input',
	  ins: 'ins',
	  kbd: 'kbd',
	  keygen: 'keygen',
	  label: 'label',
	  legend: 'legend',
	  li: 'li',
	  link: 'link',
	  main: 'main',
	  map: 'map',
	  mark: 'mark',
	  menu: 'menu',
	  menuitem: 'menuitem',
	  meta: 'meta',
	  meter: 'meter',
	  nav: 'nav',
	  noscript: 'noscript',
	  object: 'object',
	  ol: 'ol',
	  optgroup: 'optgroup',
	  option: 'option',
	  output: 'output',
	  p: 'p',
	  param: 'param',
	  picture: 'picture',
	  pre: 'pre',
	  progress: 'progress',
	  q: 'q',
	  rp: 'rp',
	  rt: 'rt',
	  ruby: 'ruby',
	  s: 's',
	  samp: 'samp',
	  script: 'script',
	  section: 'section',
	  select: 'select',
	  small: 'small',
	  source: 'source',
	  span: 'span',
	  strong: 'strong',
	  style: 'style',
	  sub: 'sub',
	  summary: 'summary',
	  sup: 'sup',
	  table: 'table',
	  tbody: 'tbody',
	  td: 'td',
	  textarea: 'textarea',
	  tfoot: 'tfoot',
	  th: 'th',
	  thead: 'thead',
	  time: 'time',
	  title: 'title',
	  tr: 'tr',
	  track: 'track',
	  u: 'u',
	  ul: 'ul',
	  'var': 'var',
	  video: 'video',
	  wbr: 'wbr',

	  // SVG
	  circle: 'circle',
	  clipPath: 'clipPath',
	  defs: 'defs',
	  ellipse: 'ellipse',
	  g: 'g',
	  image: 'image',
	  line: 'line',
	  linearGradient: 'linearGradient',
	  mask: 'mask',
	  path: 'path',
	  pattern: 'pattern',
	  polygon: 'polygon',
	  polyline: 'polyline',
	  radialGradient: 'radialGradient',
	  rect: 'rect',
	  stop: 'stop',
	  svg: 'svg',
	  text: 'text',
	  tspan: 'tspan'

	}, createDOMFactory);

	module.exports = ReactDOMFactories;

/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactElementValidator
	 */

	/**
	 * ReactElementValidator provides a wrapper around a element factory
	 * which validates the props passed to the element. This is intended to be
	 * used only in DEV and could be replaced by a static type checker for languages
	 * that support it.
	 */

	'use strict';

	var ReactElement = __webpack_require__(42);
	var ReactPropTypeLocations = __webpack_require__(65);
	var ReactPropTypeLocationNames = __webpack_require__(66);
	var ReactCurrentOwner = __webpack_require__(5);

	var canDefineProperty = __webpack_require__(43);
	var getIteratorFn = __webpack_require__(108);
	var invariant = __webpack_require__(13);
	var warning = __webpack_require__(25);

	function getDeclarationErrorAddendum() {
	  if (ReactCurrentOwner.current) {
	    var name = ReactCurrentOwner.current.getName();
	    if (name) {
	      return ' Check the render method of `' + name + '`.';
	    }
	  }
	  return '';
	}

	/**
	 * Warn if there's no key explicitly set on dynamic arrays of children or
	 * object keys are not valid. This allows us to keep track of children between
	 * updates.
	 */
	var ownerHasKeyUseWarning = {};

	var loggedTypeFailures = {};

	/**
	 * Warn if the element doesn't have an explicit key assigned to it.
	 * This element is in an array. The array could grow and shrink or be
	 * reordered. All children that haven't already been validated are required to
	 * have a "key" property assigned to it.
	 *
	 * @internal
	 * @param {ReactElement} element Element that requires a key.
	 * @param {*} parentType element's parent's type.
	 */
	function validateExplicitKey(element, parentType) {
	  if (!element._store || element._store.validated || element.key != null) {
	    return;
	  }
	  element._store.validated = true;

	  var addenda = getAddendaForKeyUse('uniqueKey', element, parentType);
	  if (addenda === null) {
	    // we already showed the warning
	    return;
	  }
	   false ? warning(false, 'Each child in an array or iterator should have a unique "key" prop.' + '%s%s%s', addenda.parentOrOwner || '', addenda.childOwner || '', addenda.url || '') : undefined;
	}

	/**
	 * Shared warning and monitoring code for the key warnings.
	 *
	 * @internal
	 * @param {string} messageType A key used for de-duping warnings.
	 * @param {ReactElement} element Component that requires a key.
	 * @param {*} parentType element's parent's type.
	 * @returns {?object} A set of addenda to use in the warning message, or null
	 * if the warning has already been shown before (and shouldn't be shown again).
	 */
	function getAddendaForKeyUse(messageType, element, parentType) {
	  var addendum = getDeclarationErrorAddendum();
	  if (!addendum) {
	    var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;
	    if (parentName) {
	      addendum = ' Check the top-level render call using <' + parentName + '>.';
	    }
	  }

	  var memoizer = ownerHasKeyUseWarning[messageType] || (ownerHasKeyUseWarning[messageType] = {});
	  if (memoizer[addendum]) {
	    return null;
	  }
	  memoizer[addendum] = true;

	  var addenda = {
	    parentOrOwner: addendum,
	    url: ' See https://fb.me/react-warning-keys for more information.',
	    childOwner: null
	  };

	  // Usually the current owner is the offender, but if it accepts children as a
	  // property, it may be the creator of the child that's responsible for
	  // assigning it a key.
	  if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
	    // Give the component that originally created this child.
	    addenda.childOwner = ' It was passed a child from ' + element._owner.getName() + '.';
	  }

	  return addenda;
	}

	/**
	 * Ensure that every element either is passed in a static location, in an
	 * array with an explicit keys property defined, or in an object literal
	 * with valid key property.
	 *
	 * @internal
	 * @param {ReactNode} node Statically passed child of any type.
	 * @param {*} parentType node's parent's type.
	 */
	function validateChildKeys(node, parentType) {
	  if (typeof node !== 'object') {
	    return;
	  }
	  if (Array.isArray(node)) {
	    for (var i = 0; i < node.length; i++) {
	      var child = node[i];
	      if (ReactElement.isValidElement(child)) {
	        validateExplicitKey(child, parentType);
	      }
	    }
	  } else if (ReactElement.isValidElement(node)) {
	    // This element was passed in a valid location.
	    if (node._store) {
	      node._store.validated = true;
	    }
	  } else if (node) {
	    var iteratorFn = getIteratorFn(node);
	    // Entry iterators provide implicit keys.
	    if (iteratorFn) {
	      if (iteratorFn !== node.entries) {
	        var iterator = iteratorFn.call(node);
	        var step;
	        while (!(step = iterator.next()).done) {
	          if (ReactElement.isValidElement(step.value)) {
	            validateExplicitKey(step.value, parentType);
	          }
	        }
	      }
	    }
	  }
	}

	/**
	 * Assert that the props are valid
	 *
	 * @param {string} componentName Name of the component for error messages.
	 * @param {object} propTypes Map of prop name to a ReactPropType
	 * @param {object} props
	 * @param {string} location e.g. "prop", "context", "child context"
	 * @private
	 */
	function checkPropTypes(componentName, propTypes, props, location) {
	  for (var propName in propTypes) {
	    if (propTypes.hasOwnProperty(propName)) {
	      var error;
	      // Prop type validation may throw. In case they do, we don't want to
	      // fail the render phase where it didn't fail before. So we log it.
	      // After these have been cleaned up, we'll let them throw.
	      try {
	        // This is intentionally an invariant that gets caught. It's the same
	        // behavior as without this statement except with a better message.
	        !(typeof propTypes[propName] === 'function') ?  false ? invariant(false, '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'React.PropTypes.', componentName || 'React class', ReactPropTypeLocationNames[location], propName) : invariant(false) : undefined;
	        error = propTypes[propName](props, propName, componentName, location);
	      } catch (ex) {
	        error = ex;
	      }
	       false ? warning(!error || error instanceof Error, '%s: type specification of %s `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', ReactPropTypeLocationNames[location], propName, typeof error) : undefined;
	      if (error instanceof Error && !(error.message in loggedTypeFailures)) {
	        // Only monitor this failure once because there tends to be a lot of the
	        // same error.
	        loggedTypeFailures[error.message] = true;

	        var addendum = getDeclarationErrorAddendum();
	         false ? warning(false, 'Failed propType: %s%s', error.message, addendum) : undefined;
	      }
	    }
	  }
	}

	/**
	 * Given an element, validate that its props follow the propTypes definition,
	 * provided by the type.
	 *
	 * @param {ReactElement} element
	 */
	function validatePropTypes(element) {
	  var componentClass = element.type;
	  if (typeof componentClass !== 'function') {
	    return;
	  }
	  var name = componentClass.displayName || componentClass.name;
	  if (componentClass.propTypes) {
	    checkPropTypes(name, componentClass.propTypes, element.props, ReactPropTypeLocations.prop);
	  }
	  if (typeof componentClass.getDefaultProps === 'function') {
	     false ? warning(componentClass.getDefaultProps.isReactClassApproved, 'getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.') : undefined;
	  }
	}

	var ReactElementValidator = {

	  makeElement: function (type, props, children) {
	    var validType = typeof type === 'string' || typeof type === 'function';
	    // We warn in this case but don't throw. We expect the element creation to
	    // succeed and there will likely be errors in render.
	     false ? warning(validType, 'React.makeElement: type should not be null, undefined, boolean, or ' + 'number. It should be a string (for DOM elements) or a ReactClass ' + '(for composite components).%s', getDeclarationErrorAddendum()) : undefined;

	    var element = ReactElement.createElement.apply(this, arguments);

	    // The result can be nullish if a mock or a custom function is used.
	    // TODO: Drop this when these are no longer allowed as the type argument.
	    if (element == null) {
	      return element;
	    }

	    // Skip key warning if the type isn't valid since our key validation logic
	    // doesn't expect a non-string/function type and can throw confusing errors.
	    // We don't want exception behavior to differ between dev and prod.
	    // (Rendering will throw with a helpful message and as soon as the type is
	    // fixed, the key warnings will appear.)
	    if (validType) {
	      for (var i = 2; i < arguments.length; i++) {
	        validateChildKeys(arguments[i], type);
	      }
	    }

	    validatePropTypes(element);

	    return element;
	  },

	  createFactory: function (type) {
	    var validatedFactory = ReactElementValidator.createElement.bind(null, type);
	    // Legacy hook TODO: Warn if this is accessed
	    validatedFactory.type = type;

	    if (false) {
	      if (canDefineProperty) {
	        Object.defineProperty(validatedFactory, 'type', {
	          enumerable: false,
	          get: function () {
	            process.env.NODE_ENV !== 'production' ? warning(false, 'Factory.type is deprecated. Access the class directly ' + 'before passing it to createFactory.') : undefined;
	            Object.defineProperty(this, 'type', {
	              value: type
	            });
	            return type;
	          }
	        });
	      }
	    }

	    return validatedFactory;
	  },

	  cloneElement: function (element, props, children) {
	    var newElement = ReactElement.cloneElement.apply(this, arguments);
	    for (var i = 2; i < arguments.length; i++) {
	      validateChildKeys(arguments[i], newElement.type);
	    }
	    validatePropTypes(newElement);
	    return newElement;
	  }

	};

	module.exports = ReactElementValidator;

/***/ },
/* 151 */
/***/ function(module, exports) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule mapObject
	 */

	'use strict';

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * Executes the provided `callback` once for each enumerable own property in the
	 * object and constructs a new object from the results. The `callback` is
	 * invoked with three arguments:
	 *
	 *  - the property value
	 *  - the property name
	 *  - the object being traversed
	 *
	 * Properties that are added after the call to `mapObject` will not be visited
	 * by `callback`. If the values of existing properties are changed, the value
	 * passed to `callback` will be the value at the time `mapObject` visits them.
	 * Properties that are deleted before being visited are not visited.
	 *
	 * @grep function objectMap()
	 * @grep function objMap()
	 *
	 * @param {?object} object
	 * @param {function} callback
	 * @param {*} context
	 * @return {?object}
	 */
	function mapObject(object, callback, context) {
	  if (!object) {
	    return null;
	  }
	  var result = {};
	  for (var name in object) {
	    if (hasOwnProperty.call(object, name)) {
	      result[name] = callback.call(context, object[name], name, object);
	    }
	  }
	  return result;
	}

	module.exports = mapObject;

/***/ },
/* 152 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule onlyChild
	 */
	'use strict';

	var ReactElement = __webpack_require__(42);

	var invariant = __webpack_require__(13);

	/**
	 * Returns the first child in a collection of children and verifies that there
	 * is only one child in the collection. The current implementation of this
	 * function assumes that a single child gets passed without a wrapper, but the
	 * purpose of this helper function is to abstract away the particular structure
	 * of children.
	 *
	 * @param {?object} children Child collection structure.
	 * @return {ReactComponent} The first and only `ReactComponent` contained in the
	 * structure.
	 */
	function onlyChild(children) {
	  !ReactElement.isValidElement(children) ?  false ? invariant(false, 'onlyChild must be passed a children with exactly one child.') : invariant(false) : undefined;
	  return children;
	}

	module.exports = onlyChild;

/***/ },
/* 153 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule deprecated
	 */

	'use strict';

	var assign = __webpack_require__(39);
	var warning = __webpack_require__(25);

	/**
	 * This will log a single deprecation notice per function and forward the call
	 * on to the new API.
	 *
	 * @param {string} fnName The name of the function
	 * @param {string} newModule The module that fn will exist in
	 * @param {string} newPackage The module that fn will exist in
	 * @param {*} ctx The context this forwarded call should run in
	 * @param {function} fn The function to forward on to
	 * @return {function} The function that will warn once and then call fn
	 */
	function deprecated(fnName, newModule, newPackage, ctx, fn) {
	  var warned = false;
	  if (false) {
	    var newFn = function () {
	      process.env.NODE_ENV !== 'production' ? warning(warned,
	      // Require examples in this string must be split to prevent React's
	      // build tools from mistaking them for real requires.
	      // Otherwise the build tools will attempt to build a '%s' module.
	      'React.%s is deprecated. Please use %s.%s from require' + '(\'%s\') ' + 'instead.', fnName, newModule, fnName, newPackage) : undefined;
	      warned = true;
	      return fn.apply(ctx, arguments);
	    };
	    // We need to make sure all properties of the original fn are copied over.
	    // In particular, this is needed to support PropTypes
	    return assign(newFn, fn);
	  }

	  return fn;
	}

	module.exports = deprecated;

/***/ },
/* 154 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(4);


/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var RenderDebugger = __webpack_require__(157).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(158);
	var DropdownsUI = __webpack_require__(159);
	var ContactsUI = __webpack_require__(160);
	var ConversationPanelUI = __webpack_require__(162);

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
	                unreadCount
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
	            lastMessageDatetimeDiv = React.makeElement(
	                "div",
	                { className: "date-time" },
	                unixtimeToTimeString(lastMessage.delay)
	            );
	        } else {
	            var lastMsgDivClasses = "conversation-message";

	            var emptyMessage = megaChat.plugins.chatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];

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
	                React.makeElement("span", { className: "user-card-presence " + presenceClass })
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
	    handleWindowResize: function handleWindowResize() {
	        var contentPanelConversations = document.querySelector('.content-panel.conversations');
	        if (!contentPanelConversations || !contentPanelConversations.parentNode || !contentPanelConversations.parentNode.parentNode || !contentPanelConversations.parentNode.parentNode.parentNode) {

	            return;
	        }
	        var $container = $(contentPanelConversations.parentNode.parentNode.parentNode);
	        var $jsp = $container.data('jsp');

	        if ($jsp) {
	            $jsp.reinitialise();
	        }
	    },
	    componentDidMount: function componentDidMount() {
	        window.addEventListener('resize', this.handleWindowResize);
	        this.handleWindowResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        window.removeEventListener('resize', this.handleWindowResize);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.handleWindowResize();
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
	            if (chatRoom._leaving || chatRoom.stateIsLeftOrLeaving()) {
	                return;
	            }

	            if (chatRoom.type === "private") {
	                var contact = chatRoom.getParticipantsExceptMe()[0];
	                if (!contact) {
	                    return;
	                }
	                contact = chatRoom.megaChat.getContactFromJid(contact);

	                if (contact && contact.c === 0) {

	                    Soon(function () {
	                        chatRoom.destroy();
	                    });
	                    return;
	                }
	            }

	            currConvsList.push(React.makeElement(ConversationsListItem, {
	                key: chatRoom.roomJid.split("@")[0],
	                chatRoom: chatRoom,
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
	    startChatClicked: function startChatClicked(contact, e) {
	        e.preventDefault();
	        window.location = "#fm/chat/" + contact.u;
	        var room = this.props.megaChat.createAndShowPrivateRoomFor(contact.u);
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

	                var $typeArea = $('.messages-textarea:visible');
	                moveCursortoToEnd($typeArea);
	                e.megaChatHandled = true;
	                $typeArea.triggerHandler(e);
	                e.preventDefault();
	                e.stopPropagation();
	                return false;
	            }
	        });

	        $(document).rebind('click.megaChatTextAreaFocus', function (e) {

	            if (e.megaChatHandled) {
	                return;
	            }

	            var $target = $(e.target);

	            var megaChat = self.props.megaChat;
	            if (megaChat.currentlyOpenedChat) {

	                if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.parents('.messages.scroll-area').length > 0 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $('.fm-dialog:visible,.dropdown:visible').length > 0 || $('input:focus,textarea:focus,select:focus').length > 0) {
	                    return;
	                }

	                var $typeArea = $('.messages-textarea:visible');
	                $typeArea.focus();
	                e.megaChatHandled = true;
	                moveCursortoToEnd($typeArea);
	                return false;
	            }
	        });
	        this.handleWindowResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        window.removeEventListener('resize', this.handleWindowResize);
	        $(document).unbind('keydown.megaChatTextAreaFocus');
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.handleWindowResize();
	    },
	    handleWindowResize: function handleWindowResize() {},
	    render: function render() {
	        var self = this;

	        var presence = self.props.megaChat.karere.getMyPresence();

	        var startChatIsDisabled = !presence || presence === "offline";

	        return React.makeElement(
	            "div",
	            { className: "conversationsApp", key: "conversationsApp" },
	            React.makeElement(
	                "div",
	                { className: "fm-left-panel" },
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
	                                onClick: this.startChatClicked
	                            })
	                        )
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "fm-tree-panel" },
	                    React.makeElement(
	                        "div",
	                        { className: "content-panel conversations" },
	                        React.makeElement(ConversationsList, { chats: this.props.megaChat.chats, megaChat: this.props.megaChat, contacts: this.props.contacts })
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
	                            React.makeElement(
	                                "div",
	                                { className: "fm-not-logged-description" },
	                                "Login or create an account to ",
	                                React.makeElement(
	                                    "span",
	                                    { className: "red" },
	                                    "get 50GB FREE"
	                                ),
	                                " and get messages from your friends and coworkers."
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "fm-not-logged-button login" },
	                                __(l[193])
	                            ),
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
/* 156 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);

	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(157).RenderDebugger;

	var JScrollPane = React.createClass({
	    displayName: "JScrollPane",

	    mixins: [MegaRenderMixin],
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $elem = $(ReactDOM.findDOMNode(self));

	        $elem.height('100%');

	        self.setWidthHeightIfEmpty();

	        $elem.find('.jspContainer').replaceWith(function () {
	            return $elem.find('.jspPane').children();
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
	        $elem.rebind('jsp-will-scroll-y.jsp' + self.getUniqueId(), function (e) {
	            if ($elem.attr('data-scroll-disabled') === "true") {
	                e.preventDefault();
	                e.stopPropagation();

	                return false;
	            }
	        });

	        $(window).rebind('resize.jsp' + self.getUniqueId(), self.onResize);
	        self.onResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var $elem = $(ReactDOM.findDOMNode(this));
	        $elem.unbind('jsp-will-scroll-y.jsp' + this.getUniqueId());

	        $(window).unbind('resize.jsp' + this.getUniqueId());
	    },
	    setWidthHeightIfEmpty: function setWidthHeightIfEmpty() {
	        var $elem = $(ReactDOM.findDOMNode(this));

	        if (!$elem.width() && $elem.parent().outerWidth()) {
	            $elem.width($elem.parent().outerWidth());
	        }
	    },
	    onResize: function onResize() {
	        if (!this.isMounted()) {
	            return;
	        }

	        var $elem = $(ReactDOM.findDOMNode(this));

	        this.setWidthHeightIfEmpty();

	        var $jsp = $elem.data('jsp');
	        if ($jsp) {
	            $jsp.reinitialise();
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.onResize();
	    },
	    render: function render() {
	        return React.makeElement(
	            "div",
	            _extends({ className: this.props.className + " jScrollPaneContainer" }, this.props, { onResize: this.onResize }),
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
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this._renderLayer();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        ReactDOM.unmountComponentAtNode(this.popup);
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
/* 157 */
/***/ function(module, exports, __webpack_require__) {

	var ReactDOM = __webpack_require__(154);

	// copied from Facebook's shallowEqual, used in PureRenderMixin, because it was defined as a _private_ module
	function shallowEqual(objA, objB) {
	    if (objA === objB) {
	        return true;
	    }
	    var key;
	    // Test for A's keys different from B.
	    for (key in objA) {
	        if (objA.hasOwnProperty(key) &&
	            (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
	            return false;
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
	    //inViewport: false,
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
	    componentDidMount: function() {

	        $(window).rebind('resize.megaRenderMixing' + this.getUniqueId(), this.onResizeDoUpdate);
	        window.addEventListener('hashchange', this.onHashChangeDoUpdate);

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
	    },
	    findDOMNode: function() {
	        return ReactDOM.findDOMNode(this);
	    },
	    componentWillUnmount: function() {
	        $(window).unbind('resize.megaRenderMixing' + this.getUniqueId());
	        window.removeEventListener('hashchange', this.onHashChangeDoUpdate);

	        //$(window).unbind('DOMContentLoaded.lazyRenderer' + this.getUniqueId());
	        //$(window).unbind('load.lazyRenderer' + this.getUniqueId());
	        //$(window).unbind('resize.lazyRenderer' + this.getUniqueId());
	        //$(window).unbind('hashchange.lazyRenderer' + this.getUniqueId());
	        //$(window).unbind('scroll.lazyRenderer' + this.getUniqueId());
	    },
	    eventuallyUpdate: function() {
	        var domNode = $(this.findDOMNode());
	        if (!domNode.is(":visible")) {
	            return;
	        }
	        if (!verge.inX(domNode[0]) && !verge.inY(domNode[0])) {
	            return;
	        }

	        this.forceUpdate();
	    },
	    onResizeDoUpdate: function() {
	        if (!this.isMounted() || this._pendingForceUpdate === true) {
	            return;
	        }

	        this.eventuallyUpdate();
	    },
	    onHashChangeDoUpdate: function() {
	        if (!this.isMounted() || this._pendingForceUpdate === true) {
	            return;
	        }

	        this.eventuallyUpdate();
	    },
	    _recurseAddListenersIfNeeded: function(idx, map, depth) {
	        var self = this;
	        depth = depth ? depth : 0;


	        if (typeof map._dataChangeIndex !== "undefined") {
	            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;
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
	            //console.error('r === rv, !v', k, referenceMap, map);
	            return false; // continue/skip
	        }

	        if (typeof v._dataChangeIndex !== "undefined") {
	            var cacheKey = this.getReactId() + "_" + v._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;

	            if (dataChangeHistory[cacheKey] !== v._dataChangeIndex) {
	                if (window.RENDER_DEBUG) console.error("changed: ", self.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
	                foundChanges = true;
	                dataChangeHistory[cacheKey] = v._dataChangeIndex;
	            } else {
	                //console.error("NOT changed: ", k, v._dataChangeTrackedId, v._dataChangeIndex, v);
	            }
	        } else if (typeof v === "object" && v !== null && depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
	                foundChanges = true;
	            } else {
	                //console.error("NOT (recursive) changed: ", k, v);
	            }
	        } else if (v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            v.forEach(function(v, k) {
	                if (self._recursiveSearchForDataChanges(idx, v[k], rv[k], depth + 1) === true) {
	                    foundChanges = true;
	                    return false; // break
	                }
	            });
	        } else {
	            //console.error("NOT tracked/changed: ", k, v);
	        }
	        return foundChanges;
	    },
	    _recursiveSearchForDataChanges: function(idx, map, referenceMap, depth) {
	        var self = this;
	        depth = depth || 0;

	        if (!this.isMounted() || this._pendingForceUpdate === true) {
	            return;
	        }

	        if (!this._wasRendered) {
	            if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);

	            this._wasRendered = true;
	            return true; // first time render, always render the first time
	        }
	        // quick lookup
	        if (
	            (map && !referenceMap) ||
	            (!map && referenceMap) ||
	            (map && referenceMap && !shallowEqual(map, referenceMap))
	        ) {
	            return true;
	        }  else if (
	            map.children && referenceMap.children && !shallowEqual(map.children.length, referenceMap.children.length)
	        ) {
	            return true;
	        }

	        var mapKeys = map._dataChangeIndex ? map.keys() : Object.keys(map);

	        var foundChanges = false;
	        mapKeys.forEach(function(k) {
	            foundChanges = self._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth);

	            if (foundChanges === true) {
	                return false; // break
	            }
	        });
	        return foundChanges;
	    },
	    shouldComponentUpdate: function(nextProps, nextState) {
	        var shouldRerender = false;
	        if (!this.isMounted() || this._pendingForceUpdate === true) {
	            return false;
	        }

	        if (this.props !== null) {
	            shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
	        }
	        if (shouldRerender === false && this.state !== null) {
	            shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
	        }

	        if (this.getElementName() === "unknown") {
	            debugger;
	        }
	        if (window.RENDER_DEBUG) console.error("shouldRerender?",
	            shouldRerender,
	            "rendered: ", this.getElementName(),
	            "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
	            "props:", this.props,
	            "state:", this.state
	        );


	        if (shouldRerender === true) { // (eventually) add listeners to newly added data structures
	            if (this.props) {
	                this._recurseAddListenersIfNeeded("p", this.props);
	            }
	            if (this.state) {
	                this._recurseAddListenersIfNeeded("s", this.state);
	            }
	        }

	        return shouldRerender;
	    },
	    onPropOrStateUpdated: function() {
	        if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

	        if (!this.isMounted() || this._pendingForceUpdate === true) {
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
	    //requiresLazyRendering: function() {
	    //    var domNode = this.findDOMNode();
	    //    var wasInViewPort = this.inViewport;
	    //
	    //    if (domNode) {
	    //        this.inViewport = elementInViewport2(domNode);
	    //    }
	    //    else {
	    //        this.inViewport = false;
	    //    }
	    //
	    //    if (wasInViewPort !== this.inViewport) {
	    //        if (!this.inViewport) {
	    //            $(domNode).css({'visibility': 'hidden'});
	    //        }
	    //        else {
	    //            $(domNode).css({'visibility': 'visible'});
	    //        }
	    //    }
	    //},
	    getOwnerElement: function() {
	        var owner = this._reactInternalInstance._currentElement._owner;
	        if (owner) {
	            return this._reactInternalInstance._currentElement._owner._instance;
	        } else {
	            return null;
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
/* 158 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(157).RenderDebugger;

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
	                active: this.state.focused,
	                closeDropdown: function closeDropdown() {
	                    self.setState({ 'focused': false });
	                }
	            });
	        }.bind(this));
	    },
	    onBlur: function onBlur(e) {
	        var $element = $(ReactDOM.findDOMNode(this));

	        if (e && e.target && $(e.target).is($element)) {
	            return;
	        }

	        if (!e || !$(e.target).parents(".button").is($element)) {
	            this.setState({ focused: false });
	            $(document).unbind('keyup.button' + this.getUniqueId());
	            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	        }
	    },
	    onClick: function onClick(e) {
	        var $element = $(ReactDOM.findDOMNode(this));

	        if (this.props.disabled === true) {
	            e.preventDefault();
	            e.stopPropagation();
	            return;
	        }

	        if ($(e.target).parents(".popup").parents('.button').is($element) && this.state.focused === true) {
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
/* 159 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(157).RenderDebugger;
	var ContactsUI = __webpack_require__(160);
	var EMOJILIST = __webpack_require__(161);

	var Dropdown = React.createClass({
	    displayName: "Dropdown",

	    mixins: [MegaRenderMixin],
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            this.onActiveChange(nextProps.active);
	        }
	    },
	    onActiveChange: function onActiveChange(newVal) {
	        var $element = $(ReactDOM.findDOMNode(this));

	        var $scrollables = $element.parents('.jScrollPaneContainer');
	        if (newVal === true) {
	            $element.parents('.jspScrollable').attr('data-scroll-disabled', true);
	        } else {
	            $element.parents('.jspScrollable').removeAttr('data-scroll-disabled');
	        }

	        if (this.props.onActiveChange) {
	            this.props.onActiveChange(newVal);
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;

	        if (this.props.active === true) {
	            if (this.getOwnerElement()) {
	                var $element = $(ReactDOM.findDOMNode(this));
	                var parentDomNode = $element.parents('.button');
	                var positionToElement = parentDomNode;
	                var offsetLeft = 0;
	                var $container = $element.parents('.jspPane:first');

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
	    render: function render() {
	        var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;

	        if (this.props.active !== true) {
	            classes += " hidden";

	            return React.makeElement("div", { className: classes });
	        } else {
	            var styles;

	            if (this.getOwnerElement()) {
	                styles = {
	                    'zIndex': 123,
	                    'position': 'absolute',
	                    'width': this.props.styles ? this.props.styles.width : undefined
	                };
	            }

	            return React.makeElement(
	                "div",
	                { className: classes, style: styles },
	                !this.props.noArrow ? React.makeElement("i", { className: "dropdown-white-arrow" }) : null,
	                this.props.children
	            );
	        }
	    }
	});

	var DropdownContactsSelector = React.createClass({
	    displayName: "DropdownContactsSelector",

	    mixins: [MegaRenderMixin],
	    render: function render() {
	        var _this = this;

	        var self = this;

	        return React.makeElement(
	            Dropdown,
	            { className: "popup contacts-search", active: this.props.active, closeDropdown: this.props.closeDropdown, ref: "dropdown" },
	            React.makeElement(
	                "div",
	                { className: "popup contacts-search" },
	                React.makeElement(ContactsUI.ContactPickerWidget, {
	                    contacts: this.props.contacts,
	                    megaChat: this.props.megaChat,
	                    exclude: this.props.exclude,
	                    onClick: function onClick(contact, e) {
	                        _this.props.onClick(contact, e);
	                        _this.props.closeDropdown();
	                    } })
	            )
	        );
	    }
	});

	var DropdownItem = React.createClass({
	    displayName: "DropdownItem",

	    mixins: [MegaRenderMixin],
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
	                onClick: self.props.onClick ? self.props.onClick : self.onClick
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
	    getInitialState: function getInitialState() {
	        return {
	            'previewEmoji': null,
	            'searchValue': '',
	            'browsingCategory': false,
	            'isActive': false,
	            'visibleEmojis': [].concat(Object.keys(EMOJILIST.EMOJI_CATEGORIES["PEOPLE"]))
	        };
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({
	            searchValue: e.target.value,
	            browsingCategory: false
	        });
	        $('.popup-scroll-area.emoji-one:visible').data('jsp').scrollTo(0);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var $element = $(self.findDOMNode());

	        $('.popup-scroll-area.emoji-one', $element).rebind('jsp-user-scroll-y.emojis', function (e, pos) {
	            self.rerender();
	        });
	    },
	    _getVisibleEmojis: function _getVisibleEmojis() {
	        var self = this;

	        var $element = $('.popup-header.emoji-one:visible').parent();

	        if (!$element.is(":visible")) {
	            return false;
	        }

	        var $jsp = $('.popup-scroll-area.emoji-one', $element).data("jsp");
	        var pos = 0;

	        if ($jsp) {
	            pos = $jsp.getContentPositionY();
	        }

	        var emojiHeight = 42;
	        var emojiWidth = 42;
	        var emojiContainerWidth = 360;
	        var jspHeight = 336;
	        var bufferRows = 6;
	        var emojisPerRow = Math.floor(emojiContainerWidth / (emojiWidth - 5));
	        var visibleEmojiRows = Math.floor(jspHeight / emojiHeight);

	        var emojiList = EMOJILIST.ORDERED_EMOJIS;
	        if (self.state.searchValue && self.state.searchValue.length > 0) {
	            emojiList = [];
	            EMOJILIST.ORDERED_EMOJIS.forEach(function (v) {
	                if (v.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) > -1) {
	                    emojiList.push(v);
	                }
	            });
	        }

	        var firstEmojiNumber = Math.max(0, Math.ceil(pos / emojiHeight * emojisPerRow) - Math.floor(bufferRows * emojisPerRow));
	        var lastEmojiNumber = firstEmojiNumber + Math.ceil(emojisPerRow * (visibleEmojiRows + bufferRows));

	        var inViewport = emojiList.slice(Math.max(0, firstEmojiNumber - 1), lastEmojiNumber + 1);

	        return inViewport;
	    },
	    rerender: function rerender() {
	        var self = this;

	        var inViewport = self._getVisibleEmojis();

	        if (self.state.visibleEmojis.join(",") != inViewport.join(",")) {
	            self.setState({ 'visibleEmojis': inViewport });
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
	            var visibleEmojis = this._getVisibleEmojis();
	            if (visibleEmojis === false) {
	                visibleEmojis = self.state.visibleEmojis;
	            }

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

	                    if (visibleEmojis.indexOf(slug) > -1) {
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
	                    } else {
	                        curCategoryEmojis.push(React.makeElement("div", {
	                            "data-emoji": slug,
	                            className: "button square-button emoji-one placeholder",
	                            key: categoryName + "_" + slug + "_pl"
	                        }));
	                    }
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
	                            $('.popup-scroll-area.emoji-one:visible').data('jsp').scrollToElement($('.emoji-category-container[data-category-name="' + categoryName + '"]:visible'), true, true);
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
	                    utils.JScrollPane,
	                    {
	                        className: "popup-scroll-area emoji-one",
	                        searchValue: this.state.searchValue,
	                        browsingCategory: this.state.browsingCategory
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
	            _extends({ className: "popup emoji-one" }, self.props, { ref: "dropdown", onActiveChange: function onActiveChange(newValue) {

	                    if (newValue === false) {
	                        self.setState(self.getInitialState);
	                    } else {
	                        self.setState({ 'isActive': true });
	                    }
	                } }),
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
/* 160 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(157).RenderDebugger;
	var utils = __webpack_require__(156);

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
	                { className: classString, onClick: this.props.onContactClicked },
	                React.makeElement("div", { className: "nw-contact-status" }),
	                React.makeElement(
	                    "div",
	                    { className: "nw-conversations-unread" },
	                    "0"
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "nw-conversations-name" },
	                    generateContactName(contact.u)
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
	                    self.forceUpdate();
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

	        var $avatar = $(useravatar.contact(contact));

	        var classes = (this.props.className ? this.props.className : 'small-rounded-avatar') + ' ' + contact.u;

	        var letterClass = 'avatar-letter';

	        var displayedAvatar;

	        var verifiedElement = null;

	        if (!this.props.hideVerifiedBadge) {
	            verifiedElement = React.makeElement(ContactVerified, { contact: this.props.contact, className: this.props.verifiedClassName });
	        }

	        if ($avatar.find("img").length > 0) {
	            displayedAvatar = React.makeElement(
	                "div",
	                { className: classes, style: this.props.style },
	                verifiedElement,
	                React.makeElement("img", { src: $("img", $avatar).attr("src"), style: this.props.imgStyles })
	            );
	        } else {
	            var tempClasses = $avatar.attr('class');
	            var colorNum = tempClasses.split("color")[1].split(" ")[0];
	            classes += " color" + colorNum;

	            displayedAvatar = React.makeElement(
	                "div",
	                { className: classes, style: this.props.style },
	                verifiedElement,
	                React.makeElement("div", { className: letterClass, "data-user-letter": $(useravatar.contact(contact)).text() })
	            );
	        }

	        return displayedAvatar;
	    }
	});

	var AvatarImage = React.createClass({
	    displayName: "AvatarImage",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var contact = this.props.contact;

	        var imgUrl = useravatar.imgUrl(contact.u);

	        var displayedAvatar;

	        displayedAvatar = React.makeElement("img", { src: imgUrl, style: this.props.imgStyles, className: "avatar-img" });

	        if (!avatars[contact.u] && (!_noAvatars[contact.u] || _noAvatars[contact.u] !== true)) {
	            var self = this;

	            var loadAvatarPromise;
	            if (!_noAvatars[contact.u]) {
	                loadAvatarPromise = mega.attr.get(contact.u, 'a', true, false);
	            } else {
	                loadAvatarPromise = _noAvatars[contact.u];
	            }

	            loadAvatarPromise.done(function (r) {
	                if (typeof r !== 'number' && r.length > 5) {
	                    var blob = new Blob([str_to_ab(base64urldecode(r))], { type: 'image/jpeg' });
	                    avatars[contact.u] = {
	                        data: blob,
	                        url: myURL.createObjectURL(blob)
	                    };
	                }

	                useravatar.loaded(contact);

	                delete _noAvatars[contact.u];

	                self.forceUpdate();
	            }).fail(function (e) {
	                _noAvatars[contact.u] = true;
	            });
	        }

	        return displayedAvatar;
	    }
	});

	var ContactCard = React.createClass({
	    displayName: "ContactCard",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;

	        var contact = this.props.contact;
	        if (!contact) {
	            return null;
	        }

	        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).xmppPresenceToCssClass(contact.presence);
	        var avatarMeta = generateAvatarMeta(contact.u);

	        var contextMenu;
	        if (!this.props.noContextMenu) {
	            var ButtonsUI = __webpack_require__(158);
	            var DropdownsUI = __webpack_require__(159);

	            var moreDropdowns = this.props.dropdowns ? this.props.dropdowns : [];

	            if (contact.c === 1) {
	                moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "view", icon: "human-profile", label: __("View Profile"), onClick: function onClick() {
	                        window.location = '#fm/' + contact.u;
	                    } }));
	                if (window.location.hash != '#fm/chat/' + contact.u) {
	                    moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                        key: "start_conv_" + contact.u,
	                        icon: "conversations", label: __("Open/start Chat"), onClick: function onClick() {
	                            window.location = '#fm/chat/' + contact.u;
	                        } }));
	                }
	            }

	            contextMenu = React.makeElement(
	                ButtonsUI.Button,
	                {
	                    className: "default-white-button tiny-button",
	                    icon: "tiny-icon grey-down-arrow" },
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

	        return React.makeElement(
	            "div",
	            {
	                className: "contacts-info body " + (pres === "offline" ? "offline" : "") + (this.props.className ? " " + this.props.className : ""),
	                onClick: function onClick(e) {
	                    if (self.props.onClick) {
	                        self.props.onClick(contact, e);
	                    }
	                }
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
	                    avatarMeta.fullName
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
	            'searchValue': ''
	        };
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({ searchValue: e.target.value });
	    },
	    render: function render() {
	        var self = this;

	        var contacts = [];

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
	            if (self.props.selected && self.props.selected.indexOf(v.h) !== -1) {
	                selectedClass = "selected";
	            }
	            contacts.push(React.makeElement(ContactCard, {
	                contact: v,
	                className: "contacts-search " + selectedClass,
	                onClick: function onClick(contact, e) {
	                    if (self.props.onClick) {
	                        self.props.onClick(contact, e);
	                    }
	                },
	                noContextMenu: true,
	                key: v.u + "_" + selectedClass
	            }));
	        });

	        return React.makeElement(
	            "div",
	            null,
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
	                    null,
	                    contacts
	                )
	            )
	        );
	    }
	});

	module.exports = {
	    ContactsListItem: ContactsListItem,
	    ContactCard: ContactCard,
	    Avatar: Avatar,
	    ContactPickerWidget: ContactPickerWidget,
	    ContactVerified: ContactVerified,
	    ContactPresence: ContactPresence,
	    AvatarImage: AvatarImage
	};

/***/ },
/* 161 */
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
	        "slight_frown": ["1F641", "&#x1F641;"],
	        "confounded": ["1F616", "&#x1F616;"],
	        "angry": ["1F61E", "&#x1F61E;"],
	        "kissing_smiling_eyes": ["1F619", "&#x1F619;"],
	        "triumph": ["1F624", "&#x1F624;"],
	        "neutral_face": ["1F610", "&#x1F610;"],
	        "laughing": ["1F606", "&#x1F606;"],
	        "hushed": ["1F62F", "&#x1F62F;"],
	        "disappointed_relieved": ["1F625", "&#x1F625;"],
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
	        "earth_asia": ["1F642", "&#x1F30F;"],
	        "new_moon": ["1F311", "&#x1F311;"],
	        "waxing_crescent_moon": ["1F312", "&#x1F312;"],
	        "first_quarter_moon": ["1F313", "&#x1F313;"],
	        "waxing_gibbous_moon": ["1F314", "&#x1F314;"],
	        "full_moon": ["1F642", "&#x1F315;"],
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
	        "printer": ["1F683", "&#x1F5A8;"],
	        "alarm_clock": ["1F683", "&#x23F0;"],
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
	        "closed_book": ["1F683", "&#x1F4D5;"],
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
	        "triangular_flag_on_post": ["1F683", "&#x1F6A9;"],
	        "flag_white": ["1F3F3", "&#x1F3F3;"],
	        "flag_black": ["1F3F4", "&#x1F3F4;"],
	        "hole": ["1F683", "&#x1F573;"],
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
	        "no_entry": ["1F683", "&#x26D4;"],
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
	        "koko": ["1F683", "&#x1F201;"],
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
	        "gemini": ["1F683", "&#x264A;"],
	        "cancer": ["1F683", "&#x264B;"],
	        "leo": ["264C", "&#x264C;"],
	        "virgo": ["264D", "&#x264D;"],
	        "libra": ["1F683", "&#x264E;"],
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
	        "rewind": ["1F683", "&#x23EA;"],
	        "arrow_double_up": ["23EB", "&#x23EB;"],
	        "arrow_double_down": ["23EC", "&#x23EC;"],
	        "arrow_right": ["1F683", "&#x27A1;"],
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
	        "black_large_square": ["1F683", "&#x2B1B;"],
	        "white_large_square": ["1F683", "&#x2B1C;"],
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
/* 162 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var RenderDebugger = __webpack_require__(157).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(158);
	var ModalDialogsUI = __webpack_require__(163);
	var DropdownsUI = __webpack_require__(159);
	var ContactsUI = __webpack_require__(160);
	var ConversationsUI = __webpack_require__(155);
	var TypingAreaUI = __webpack_require__(164);

	var GenericConversationMessage = __webpack_require__(165).GenericConversationMessage;
	var AlterParticipantsConversationMessage = __webpack_require__(167).AlterParticipantsConversationMessage;

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

	var ConversationRightArea = React.createClass({
	    displayName: "ConversationRightArea",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;
	        var room = this.props.chatRoom;
	        var contactJid = room.getParticipantsExceptMe()[0];
	        var contact = room.megaChat.getContactFromJid(contactJid);

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

	        if (room.callSession && room.callSession.isActive() === true) {
	            startAudioCallButton = startVideoCallButton = null;
	        }

	        var contactsList = [];

	        var contacts = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getContactParticipantsExceptMe() : room.getContactParticipantsExceptMe();

	        contacts.forEach(function (contactHash) {
	            var contact = M.u[contactHash];
	            if (contact && contactHash != u_handle) {
	                var dropdowns = [];

	                if (room.members && room.members[u_handle] === 3) {
	                    dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                        key: "remove", icon: "human-profile", label: __("Remove participant"), onClick: function onClick() {
	                            $(room).trigger('onRemoveUserRequest', [contact.u]);
	                        } }));
	                }

	                contactsList.push(React.makeElement(ContactsUI.ContactCard, {
	                    key: contact.u,
	                    contact: contact,
	                    megaChat: room.megaChat,
	                    className: "right-chat-contact-card",
	                    dropdownPositionMy: "right top",
	                    dropdownPositionAt: "right bottom",
	                    dropdowns: dropdowns
	                }));
	            }
	        });

	        var excludedParticipants = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getContactParticipants() : room.getContactParticipants();

	        return React.makeElement(
	            "div",
	            { className: "chat-right-area" },
	            React.makeElement(
	                "div",
	                { className: "chat-right-area conversation-details-scroll" },
	                React.makeElement(
	                    "div",
	                    { className: "chat-right-pad" },
	                    contactsList,
	                    React.makeElement(
	                        "div",
	                        { className: "buttons-block" },
	                        startAudioCallButton,
	                        startVideoCallButton,
	                        React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: "link-button dropdown-element",
	                                icon: "rounded-grey-plus",
	                                label: __(l[8007]),
	                                contacts: this.props.contacts,
	                                disabled: excludedParticipants.length === this.props.contacts.length
	                            },
	                            React.makeElement(DropdownsUI.DropdownContactsSelector, {
	                                contacts: this.props.contacts,
	                                megaChat: this.props.megaChat,
	                                chatRoom: room,
	                                exclude: excludedParticipants,
	                                className: "popup add-participant-selector",
	                                onClick: this.props.onAddParticipantSelected
	                            })
	                        ),
	                        React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: "link-button dropdown-element",
	                                icon: "rounded-grey-up-arrow",
	                                label: __(l[6834] + "...")
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
	                        room.type === "group" ? React.makeElement(
	                            "div",
	                            { className: "link-button red", onClick: function onClick() {
	                                    room.leave(true);
	                                } },
	                            React.makeElement("i", { className: "small-icon rounded-stop" }),
	                            __("Leave Chat")
	                        ) : null,
	                        room.type === "group" ? React.makeElement(
	                            "div",
	                            { className: "link-button red", onClick: function onClick() {
	                                    Object.keys(room.members).forEach(function (h) {
	                                        if (h !== u_handle) {
	                                            api_req({
	                                                a: 'mcr',
	                                                id: room.chatId,
	                                                u: h
	                                            });
	                                        }
	                                    });
	                                    api_req({
	                                        a: 'mcr',
	                                        id: room.chatId,
	                                        u: u_handle
	                                    });

	                                    room.leave(true);
	                                } },
	                            React.makeElement("i", { className: "small-icon rounded-stop" }),
	                            __("(DEBUG) Destroy")
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
	            displayNames.push(chatRoom.megaChat.getContactNameFromJid(v));
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
	            var localPlayerSrc = callSession.localPlayer.src;

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
	                { className: "call local-video right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass },
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
	                unreadCount
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

	    getInitialState: function getInitialState() {
	        return {
	            startCallPopupIsActive: false,
	            localVideoIsMinimized: false,
	            isFullscreenModeEnabled: false,
	            mouseOverDuringCall: false,
	            currentlyTyping: [],
	            attachCloudDialog: false,
	            messagesToggledInCall: false,
	            editingMessageId: false,
	            sendContactDialog: false
	        };
	    },

	    uploadFromComputer: function uploadFromComputer() {
	        $('#fileselect3').trigger('click');
	    },
	    refreshUI: function refreshUI(scrollToBottom) {
	        var self = this;
	        var room = self.props.chatRoom;

	        if (room._leaving) {
	            return;
	        }

	        if (!self.props.chatRoom.isCurrentlyActive) {
	            return;
	        }

	        var $jsp = self.$messages.data("jsp");
	        if ($jsp) {
	            var perc = $jsp.getPercentScrolledY();

	            if (scrollToBottom) {
	                self.$messages.one('jsp-initialised', function () {
	                    $jsp.scrollToBottom();
	                });
	            } else {
	                self.$messages.one('jsp-initialised', function () {
	                    $jsp.scrollToPercentY($jsp.getPercentScrolledY(perc));
	                });
	            }
	            $jsp.reinitialise();
	        }

	        room.renderContactTree();

	        room.megaChat.refreshConversations();

	        room.trigger('RefreshUI');
	    },

	    onMouseMove: function onMouseMove(e) {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (self.isMounted()) {
	            chatRoom.trigger("onChatIsFocused");
	        }
	    },

	    handleKeyDown: function handleKeyDown(e) {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (self.isMounted() && chatRoom.isActive()) {
	            chatRoom.trigger("onChatIsFocused");
	        }
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        window.addEventListener('resize', self.handleWindowResize);
	        window.addEventListener('keydown', self.handleKeyDown);

	        var $container = $(ReactDOM.findDOMNode(self));

	        self.$messages = $('.messages.scroll-area > .jScrollPaneContainer', $container);

	        var droppableConfig = {
	            tolerance: 'pointer',
	            drop: function drop(e, ui) {
	                $.doDD(e, ui, 'drop', 1);
	            },
	            over: function over(e, ui) {
	                $.doDD(e, ui, 'over', 1);
	            },
	            out: function out(e, ui) {
	                var c1 = $(e.srcElement).attr('class'),
	                    c2 = $(e.target).attr('class');
	                if (c2 && c2.indexOf('fm-menu-item') > -1 && c1 && (c1.indexOf('cloud') > -1 || c1.indexOf('cloud') > -1)) return false;
	                $.doDD(e, ui, 'out', 1);
	            }
	        };

	        self.$messages.droppable(droppableConfig);

	        self.lastScrollPosition = null;
	        self.lastScrolledToBottom = true;
	        self.lastScrollHeight = 0;
	        self.lastUpdatedScrollHeight = 0;

	        self.$messages.rebind('jsp-user-scroll-y.conversationsPanel' + self.props.chatRoom.roomJid, function (e, scrollPositionY, isAtTop, isAtBottom) {
	            var $jsp = self.$messages.data("jsp");

	            if (self.lastScrollPosition === scrollPositionY || self.scrolledToBottom !== 1) {
	                return;
	            }

	            if (scrollPositionY < 350 && !isAtBottom && self.$messages.is(":visible")) {
	                if (self.lastUpdatedScrollHeight !== $jsp.getContentHeight() && !self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && self.props.chatRoom.messagesBuff.haveMoreHistory()) {
	                    self.props.chatRoom.messagesBuff.retrieveChatHistory();
	                    self.lastUpdatedScrollHeight = $jsp.getContentHeight();
	                }
	            }

	            if (isAtBottom) {
	                self.lastScrolledToBottom = true;
	            } else {
	                self.lastScrolledToBottom = false;
	            }

	            self.lastScrollHeight = $jsp.getContentHeight();
	            self.lastScrollPosition = scrollPositionY;
	        });

	        self.$messages.rebind('jsp-initialised.conversationsPanel' + self.props.chatRoom.roomJid, function (e) {
	            var $jsp = self.$messages.data("jsp");

	            if (self.lastScrolledToBottom === true) {
	                $jsp.scrollToBottom();
	            } else {
	                var prevPosY = $jsp.getContentHeight() - self.lastScrollHeight + self.lastScrollPosition;

	                $jsp.scrollToY(prevPosY);
	            }
	        });

	        var room = self.props.chatRoom;

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomJid).bind("fullscreenchange.megaChat_" + room.roomJid, function () {
	            if (!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ isFullscreenModeEnabled: false });
	            } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
	                self.setState({ isFullscreenModeEnabled: true });
	            }
	        });
	        self.handleWindowResize();
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = self.props.chatRoom.megaChat;
	        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid, function (e, eventObject) {
	            if (!self.isMounted()) {
	                return;
	            }
	            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
	                return;
	            }

	            var room = megaChat.chats[eventObject.getRoomJid()];
	            if (room.roomJid == chatRoom.roomJid) {
	                var currentlyTyping = self.state.currentlyTyping;
	                currentlyTyping.push(megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u);
	                currentlyTyping = array_unique(currentlyTyping);
	                self.setState({
	                    currentlyTyping: currentlyTyping
	                });
	            }
	        });

	        megaChat.karere.rebind("onPausedMessage." + chatRoom.roomJid, function (e, eventObject) {
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

	                if (currentlyTyping.indexOf(u_h) > -1) {
	                    removeValue(currentlyTyping, u_h);
	                    self.setState({
	                        currentlyTyping: currentlyTyping
	                    });
	                    self.forceUpdate();
	                }
	            }
	        });

	        $(document).rebind('keyup.megaChatEditTextareaClose' + chatRoom.roomJid, function (e) {
	            if (!self.state.editingMessageId) {
	                return;
	            }

	            var megaChat = self.props.chatRoom.megaChat;
	            if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === self.props.chatRoom.roomJid) {
	                if (e.keyCode === 27) {
	                    self.setState({ 'editingMessageId': false });
	                    e.preventDefault();
	                    e.stopPropagation();
	                    return false;
	                }
	            }
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        window.removeEventListener('resize', self.handleWindowResize);
	        window.removeEventListener('keydown', self.handleKeyDown);
	        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomJid);

	        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid);
	        megaChat.karere.unbind("onPausedMessage." + chatRoom.roomJid);

	        $(document).unbind('keyup.megaChatEditTextareaClose' + self.props.chatRoom.roomJid);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var room = this.props.chatRoom;

	        room.megaChat.updateSectionUnreadCount();

	        self.handleWindowResize();
	    },
	    handleWindowResize: function handleWindowResize(e, scrollToBottom) {
	        var $container = $(ReactDOM.findDOMNode(this));
	        var self = this;

	        if (!self.props.chatRoom.isCurrentlyActive) {
	            return;
	        }

	        var $textarea = $('.main-typing-area textarea.messages-textarea', $container);
	        var textareaHeight = $textarea.outerHeight();
	        var $hiddenDiv = $('.main-typing-area .message-preview', $container);
	        var $pane = $('.main-typing-area .chat-textarea-scroll', $container);
	        var $jsp;

	        if (textareaHeight != $hiddenDiv.height()) {
	            $textarea.css('height', $hiddenDiv.height());

	            if ($hiddenDiv.outerHeight() > 100) {
	                $pane.jScrollPane({
	                    enableKeyboardNavigation: false,
	                    showArrows: true,
	                    arrowSize: 5
	                });
	                $jsp = $pane.data('jsp');
	                $textarea.blur();
	                $textarea.focus();
	                $jsp.scrollByY(0);
	            } else {
	                $jsp = $pane.data('jsp');
	                if ($jsp) {
	                    $jsp.destroy();
	                    $textarea.blur();
	                    $textarea.focus();
	                }
	            }
	        }

	        var scrollBlockHeight = $('.chat-content-block', $container).outerHeight() - $('.call-block', $container).outerHeight() - $('.chat-textarea-block', $container).outerHeight();
	        if (scrollBlockHeight != self.$messages.outerHeight()) {
	            self.$messages.css('height', scrollBlockHeight);
	            $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
	            self.refreshUI(true);
	        } else {
	            self.refreshUI(scrollToBottom);
	        }

	        if (!self.scrolledToBottom) {
	            var $messagesPad = $('.messages.main-pad', self.$messages);
	            if ($messagesPad.outerHeight() - 1 > $messagesPad.parent().parent().parent().outerHeight()) {
	                self.scrolledToBottom = 1;
	                self.$messages.data("jsp").scrollToBottom();
	            }
	        }
	    },
	    isActive: function isActive() {
	        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
	    },
	    render: function render() {
	        var self = this;

	        var room = this.props.chatRoom;
	        var contactJid = room.getParticipantsExceptMe()[0];
	        var contact = room.megaChat.getContactFromJid(contactJid);

	        var conversationPanelClasses = "conversation-panel";

	        if (!room.isCurrentlyActive) {
	            conversationPanelClasses += " hidden";
	        }

	        if (!contact) {
	            return null;
	        }
	        var avatarMeta = generateAvatarMeta(contact.u);
	        var contactName = avatarMeta.fullName;

	        var messagesList = [];

	        if (self.props.messagesBuff.messagesHistoryIsLoading() === true || self.props.messagesBuff.joined === false || self.props.messagesBuff.joined === true && self.props.messagesBuff.haveMessages === true && self.props.messagesBuff.messagesHistoryIsLoading() === true) {
	            messagesList.push(React.makeElement(
	                "div",
	                { className: "loading-spinner light active", key: "loadingSpinner" },
	                React.makeElement("div", { className: "main-loader" })
	            ));
	        } else if (self.props.messagesBuff.joined === true && (self.props.messagesBuff.messages.length === 0 || !self.props.messagesBuff.haveMoreHistory())) {
	            var headerText = self.props.messagesBuff.messages.length === 0 ? __(l[8002]) : __(l[8002]);

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
	        }
	        var lastTimeMarker;
	        var lastMessageFrom = null;
	        var lastGroupedMessageTimeStamp = null;
	        var grouped = false;

	        self.props.messagesBuff.messages.forEach(function (v, k) {
	            if (v.deleted !== 1 && !v.protocol && v.revoked !== true) {
	                var shouldRender = true;
	                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) {
	                    shouldRender = false;
	                }

	                var curTimeMarker = time2lastSeparator(new Date(v.delay * 1000).toISOString());

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
	                }

	                if (shouldRender === true) {
	                    var userId = v.userId;
	                    var timestamp = v.delay;
	                    if (!userId && v.fromJid) {
	                        var contact = room.megaChat.getContactFromJid(v.fromJid);
	                        if (contact && contact.u) {
	                            userId = contact.u;
	                        }
	                    }

	                    if (v instanceof KarereEventObjects.OutgoingMessage || v instanceof Message) {

	                        if (!lastMessageFrom || userId && lastMessageFrom === userId) {
	                            if (timestamp - lastGroupedMessageTimeStamp < 5 * 60) {
	                                grouped = true;
	                            } else {
	                                grouped = false;
	                                lastMessageFrom = userId;
	                                lastGroupedMessageTimeStamp = timestamp;
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
	                            chatRoom: room,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped,
	                            isBeingEdited: self.state.editingMessageId === v.messageId,
	                            onEditDone: function onEditDone(messageContents) {
	                                self.setState({ 'editingMessageId': false });
	                            }
	                        });
	                    }

	                    messagesList.push(messageInstance);
	                } else {
	                    messagesList.push(React.makeElement(GenericConversationMessage, {
	                        message: v,
	                        chatRoom: room,
	                        key: v.messageId,
	                        contact: contact,
	                        grouped: grouped,
	                        isBeingEdited: self.state.editingMessageId === v.messageId,
	                        onEditDone: function onEditDone(messageContents) {
	                            self.setState({ 'editingMessageId': false });
	                        }
	                    }));
	                }
	            }
	        });

	        var typingElement;

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
	                msg = __("%s and %s are typing").replace("%s", namesDisplay[0]).replace("%s", namesDisplay[1]);
	            } else {
	                msg = __("%s is typing").replace("%s", namesDisplay[0]);
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
	            var selected = [];
	            sendContactDialog = React.makeElement(ModalDialogsUI.SelectContactDialog, {
	                megaChat: room.megaChat,
	                chatRoom: room,
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

	        var additionalClass = "";
	        if (additionalClass.length === 0 && self.state.messagesToggledInCall && room.callSession && room.callSession.isActive()) {
	            additionalClass = " small-block";
	        }

	        return React.makeElement(
	            "div",
	            { className: conversationPanelClasses, onMouseMove: self.onMouseMove, "data-room-jid": self.props.chatRoom.roomJid.split("@")[0] },
	            React.makeElement(
	                "div",
	                { className: "chat-content-block" },
	                React.makeElement(ConversationRightArea, {
	                    chatRoom: this.props.chatRoom,
	                    contacts: self.props.contacts,
	                    megaChat: this.props.chatRoom.megaChat,
	                    onAttachFromComputerClicked: function onAttachFromComputerClicked() {
	                        self.uploadFromComputer();
	                    },
	                    onAttachFromCloudClicked: function onAttachFromCloudClicked() {
	                        self.setState({ 'attachCloudDialog': true });
	                    },
	                    onAddParticipantSelected: function onAddParticipantSelected(contact, e) {
	                        if (self.props.chatRoom.type == "private") {
	                            var megaChat = self.props.chatRoom.megaChat;

	                            loadingDialog.show();

	                            megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getContactParticipantsExceptMe().concat([contact.u])]);
	                        } else {
	                            self.props.chatRoom.trigger('onAddUserRequest', [contact.u]);
	                        }
	                    }
	                }),
	                React.makeElement(ConversationAudioVideoPanel, {
	                    chatRoom: this.props.chatRoom,
	                    contacts: self.props.contacts,
	                    megaChat: this.props.chatRoom.megaChat,
	                    onMessagesToggle: function onMessagesToggle(isActive) {
	                        self.setState({
	                            'messagesToggledInCall': isActive
	                        });
	                    }
	                }),
	                attachCloudDialog,
	                sendContactDialog,
	                React.makeElement(
	                    "div",
	                    { className: "messages-block " + additionalClass },
	                    React.makeElement(
	                        "div",
	                        { className: "messages scroll-area" },
	                        React.makeElement(
	                            utils.JScrollPane,
	                            { options: {
	                                    enableKeyboardNavigation: false,
	                                    showArrows: true,
	                                    arrowSize: 5,
	                                    animateDuration: 70,
	                                    animateScroll: false,
	                                    maintainPosition: false
	                                },
	                                chatRoom: self.props.chatRoom,
	                                messagesToggledInCall: self.state.messagesToggledInCall
	                            },
	                            React.makeElement(
	                                "div",
	                                { className: "messages main-pad" },
	                                React.makeElement(
	                                    "div",
	                                    { className: "messages content-area" },
	                                    messagesList
	                                )
	                            )
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "chat-textarea-block" },
	                        typingElement,
	                        React.makeElement(
	                            TypingAreaUI.TypingArea,
	                            {
	                                chatRoom: self.props.chatRoom,
	                                className: "main-typing-area",
	                                onUpdate: function onUpdate() {
	                                    self.handleWindowResize();
	                                },
	                                onConfirm: function onConfirm(messageContents) {
	                                    self.props.chatRoom.sendMessage(messageContents);
	                                }
	                            },
	                            React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: "popup-button",
	                                    icon: "small-icon grey-medium-plus" },
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
	                                        label: __("Send Contact"),
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
	            if (chatRoom._leaving || chatRoom.stateIsLeftOrLeaving()) {
	                return;
	            }

	            var otherParticipants = chatRoom.getParticipantsExceptMe();

	            if (!otherParticipants || otherParticipants.length === 0) {
	                return;
	            }

	            var contact = megaChat.getContactFromJid(otherParticipants[0]);

	            conversations.push(React.makeElement(ConversationPanel, {
	                chatRoom: chatRoom,
	                contacts: M.u,
	                contact: contact,
	                messagesBuff: chatRoom.messagesBuff,
	                key: chatRoom.roomJid,
	                chat: self.props.megaChat
	            }));
	        });

	        if (conversations.length === 0) {
	            var contactsList = [];
	            var contactsListOffline = [];

	            self.props.contacts.forEach(function (contact) {
	                if (contact.u === u_handle) {
	                    return;
	                }

	                if (contact.c === 1) {
	                    var pres = self.props.megaChat.xmppPresenceToCssClass(contact.presence);

	                    (pres === "offline" ? contactsListOffline : contactsList).push(React.makeElement(ContactsUI.ContactCard, { contact: contact, megaChat: self.props.megaChat, key: contact.u }));
	                }
	            });
	            var emptyMessage = megaChat.plugins.chatdIntegration.mcfHasFinishedPromise.state() === 'resolved' ? l[8008] : l[7006];

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
/* 163 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;

	var ContactsUI = __webpack_require__(160);

	var ModalDialog = React.createClass({
	    displayName: "ModalDialog",

	    mixins: [MegaRenderMixin],
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

	        if (!e || !$(e.target).parents(".fm-dialog").is($element)) {
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
	    renderChildren: function renderChildren() {
	        return React.Children.map(this.props.children, function (child) {
	            return React.cloneElement(child, {});
	        }.bind(this));
	    },
	    render: function render() {
	        var self = this;

	        var classes = "fm-dialog " + self.props.className;

	        var footer = null;

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
	                buttons,
	                React.makeElement("div", { className: "clear" })
	            );
	        }

	        return React.makeElement(
	            utils.RenderTo,
	            { element: document.body, className: classes },
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
	                    self.renderChildren()
	                ),
	                footer
	            )
	        );
	    }
	});

	var BrowserCol = React.createClass({
	    displayName: "BrowserCol",

	    mixins: [MegaRenderMixin],
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
	                    React.makeElement(
	                        "span",
	                        { className: "transfer-filtype-icon " + fileIcon(node) },
	                        " "
	                    ),
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
	            { className: "fm-dialog-grid-scroll" },
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
	            'cancelLabel': __("Cancel")
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
	            'cancelLabel': __("Cancel")
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

	module.exports = window.ModalDialogUI = {
	    ModalDialog: ModalDialog,
	    CloudBrowserDialog: CloudBrowserDialog,
	    SelectContactDialog: SelectContactDialog
	};

/***/ },
/* 164 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var RenderDebugger = __webpack_require__(157).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(158);
	var ModalDialogsUI = __webpack_require__(163);
	var DropdownsUI = __webpack_require__(159);
	var ContactsUI = __webpack_require__(160);
	var ConversationsUI = __webpack_require__(155);

	var TypingArea = React.createClass({
	    displayName: "TypingArea",

	    mixins: [MegaRenderMixin, RenderDebugger],

	    getInitialState: function getInitialState() {
	        return {
	            typedMessage: this.props.initialText ? this.props.initialText : ""
	        };
	    },
	    onEmojiClicked: function onEmojiClicked(e, slug, meta) {
	        var self = this;

	        var txt = ":" + slug + ":";
	        if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
	            txt = slug;
	        }

	        self.setState({
	            typedMessage: self.state.typedMessage + " " + txt + " "
	        });

	        setTimeout(function () {
	            $('.chat-textarea:visible textarea').click();
	            moveCursortoToEnd($('.chat-textarea:visible textarea')[0]);
	        }, 100);
	    },

	    typing: function typing() {
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
	    stoppedTyping: function stoppedTyping() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (self.typingTimeout) {
	            clearTimeout(self.typingTimeout);
	            self.typingTimeout = null;
	        }

	        if (room && room.state === ChatRoom.STATE.READY && self.iAmTyping === true) {
	            room.megaChat.karere.sendComposingPaused(room.roomJid);
	            self.iAmTyping = false;
	        }
	    },
	    onTypeAreaKeyDown: function onTypeAreaKeyDown(e) {
	        var self = this;
	        var key = e.keyCode || e.which;
	        var element = e.target;
	        var val = element.value;

	        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
	            if ($.trim(val).length > 0) {
	                if (self.props.onConfirm(val) !== true) {
	                    self.setState({ typedMessage: "" });
	                }
	                self.stoppedTyping();
	                e.preventDefault();
	                return;
	            } else {
	                self.stoppedTyping();
	                e.preventDefault();
	            }
	        } else if (key === 13) {
	            if ($.trim(val).length === 0) {
	                self.stoppedTyping();
	                e.preventDefault();
	            }
	        }

	        this.setState({ typedMessage: e.target.value });
	    },
	    onTypeAreaBlur: function onTypeAreaBlur(e) {
	        var self = this;

	        self.stoppedTyping();
	    },
	    onTypeAreaChange: function onTypeAreaChange(e) {
	        var self = this;

	        self.setState({ typedMessage: e.target.value });

	        if ($.trim(e.target.value).length) {
	            self.typing();
	        }

	        if (self.props.onUpdate) {
	            self.props.onUpdate();
	        }
	    },
	    focusTypeArea: function focusTypeArea() {
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
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        window.removeEventListener('resize', self.handleWindowResize);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (room.isCurrentlyActive) {
	            this.focusTypeArea();
	        }

	        self.handleWindowResize();
	    },
	    handleWindowResize: function handleWindowResize(e, scrollToBottom) {
	        var $container = $(ReactDOM.findDOMNode(this));
	        var self = this;

	        if (!self.props.chatRoom.isCurrentlyActive) {
	            return;
	        }

	        var $textarea = $('textarea.messages-textarea', $container);
	        var textareaHeight = $textarea.outerHeight();
	        var $hiddenDiv = $('.message-preview', $container);
	        var $pane = $('.chat-textarea-scroll', $container);
	        var $jsp;

	        if (textareaHeight != $hiddenDiv.height()) {
	            $textarea.css('height', $hiddenDiv.height());

	            if ($hiddenDiv.outerHeight() > 100) {
	                $pane.jScrollPane({
	                    enableKeyboardNavigation: false,
	                    showArrows: true,
	                    arrowSize: 5
	                });
	                $jsp = $pane.data('jsp');
	                $textarea.blur();
	                $textarea.focus();
	                $jsp.scrollByY(0);
	            } else {
	                $jsp = $pane.data('jsp');
	                if ($jsp) {
	                    $jsp.destroy();
	                    $textarea.blur();
	                    $textarea.focus();
	                }
	            }

	            if (self.props.onUpdate) {
	                self.props.onUpdate();
	            }
	        }
	    },
	    isActive: function isActive() {
	        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
	    },
	    render: function render() {
	        var self = this;

	        var room = this.props.chatRoom;

	        var messageTextAreaClasses = "messages-textarea";

	        var typedMessage = htmlentities(self.state.typedMessage).replace(/\n/g, '<br/>');
	        typedMessage = typedMessage + '<br/>';

	        return React.makeElement(
	            "div",
	            { className: "typingarea-component" + self.props.className },
	            React.makeElement(
	                "div",
	                { className: "chat-textarea" },
	                React.makeElement("i", { className: self.props.iconClass ? self.props.iconClass : "small-icon conversations" }),
	                React.makeElement(
	                    "div",
	                    { className: "chat-textarea-buttons" },
	                    React.makeElement(
	                        ButtonsUI.Button,
	                        {
	                            className: "popup-button",
	                            icon: "smiling-face"
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
	                    { className: "chat-textarea-scroll" },
	                    React.makeElement(
	                        "div",
	                        { className: "textarea-wrapper" },
	                        React.makeElement("textarea", {
	                            className: messageTextAreaClasses,
	                            placeholder: __(l[8009]),
	                            onKeyDown: self.onTypeAreaKeyDown,
	                            onBlur: self.onTypeAreaBlur,
	                            onChange: self.onTypeAreaChange,
	                            value: self.state.typedMessage,
	                            ref: "typearea",
	                            disabled: room.pubCu25519KeyIsMissing === true ? true : false,
	                            readOnly: room.pubCu25519KeyIsMissing === true ? true : false
	                        }),
	                        React.makeElement("div", { className: "message-preview", dangerouslySetInnerHTML: {
	                                __html: typedMessage.replace(/\s/g, "&nbsp;")
	                            } })
	                    )
	                )
	            )
	        );
	    }
	});

	module.exports = {
	    TypingArea: TypingArea
	};

/***/ },
/* 165 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ContactsUI = __webpack_require__(160);

	var ConversationMessageMixin = __webpack_require__(166).ConversationMessageMixin;

	var GenericConversationMessage = React.createClass({
	    displayName: "GenericConversationMessage",

	    mixins: [ConversationMessageMixin],

	    doDelete: function doDelete(e, msg) {
	        e.preventDefault(e);
	        e.stopPropagation(e);
	        var chatRoom = this.props.chatRoom;
	        msg.message = "";
	        msg.deleted = true;
	        chatRoom.messagesBuff.messages.removeByKey(msg.messageId);
	    },
	    doRetry: function doRetry(e, msg) {
	        e.preventDefault(e);
	        e.stopPropagation(e);
	        var chatRoom = this.props.chatRoom;

	        chatRoom._sendMessageToTransport(msg).done(function (internalId) {
	            msg.internalId = internalId;
	        });
	    },
	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.chatRoom.megaChat;
	        var chatRoom = this.props.chatRoom;
	        var contact = self.getContact();
	        var timestampInt = self.getTimestamp();
	        var timestamp = self.getTimestampAsString();

	        var textMessage;

	        var additionalClasses = "";
	        var buttonsBlock = null;
	        var spinnerElement = null;

	        var messageIsNowBeingSent = false;

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
	                        message.sending = false;
	                        additionalClasses += " not-sent";

	                        buttonsBlock = React.makeElement(
	                            "div",
	                            { className: "buttons-block" },
	                            React.makeElement(
	                                "div",
	                                { className: "message circuit-label left" },
	                                __(l[8003])
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "default-white-button right", onClick: function onClick(e) {
	                                        self.doRetry(e, message);
	                                    } },
	                                __(l[1364])
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "default-white-button right red", onClick: function onClick(e) {
	                                        self.doDelete(e, message);
	                                    } },
	                                __(l[8004])
	                            ),
	                            React.makeElement("div", { className: "clear" })
	                        );
	                    } else {
	                        additionalClasses += " sending";
	                        spinnerElement = React.makeElement("div", { className: "small-blue-spinner" });

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
	                displayName = contact.u === u_handle ? __("Me") : generateAvatarMeta(contact.u).fullName;
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

	                        if (message.messageId) {
	                            if (!chatRoom._attachmentsMap) {
	                                chatRoom._attachmentsMap = {};
	                            }
	                            if (!chatRoom._attachmentsMap[v.h]) {
	                                chatRoom._attachmentsMap[v.h] = {};
	                            }
	                            chatRoom._attachmentsMap[v.h][message.messageId] = false;
	                        }
	                        var addToCloudDrive = function addToCloudDrive() {
	                            M.injectNodes(v, M.RootID, false, function (res) {
	                                if (res === 0) {
	                                    msgDialog('info', __(l[8005]), __(l[8006]));
	                                }
	                            });
	                        };

	                        var dropdown = null;
	                        if (!message.revoked) {
	                            if (contact.u === u_handle) {
	                                dropdown = React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: "default-white-button tiny-button",
	                                        icon: "tiny-icon grey-down-arrow" },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            className: "white-context-menu attachments-dropdown",
	                                            noArrow: true,
	                                            positionMy: "left bottom",
	                                            positionAt: "right bottom",
	                                            horizOffset: 4
	                                        },
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: "rounded-grey-down-arrow", label: __(l[1187]),
	                                            onClick: startDownload }),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: "grey-cloud", label: __(l[8005]),
	                                            onClick: addToCloudDrive }),
	                                        React.makeElement("hr", null),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: "red-cross", label: __("Revoke"), className: "red",
	                                            onClick: function onClick() {
	                                                chatRoom.revokeAttachment(v);
	                                            } })
	                                    )
	                                );
	                            } else {
	                                dropdown = React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: "default-white-button tiny-button",
	                                        icon: "tiny-icon grey-down-arrow" },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            className: "attachments-dropdown"
	                                        },
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: "rounded-grey-down-arrow", label: __(l[1187]),
	                                            onClick: startDownload }),
	                                        React.makeElement(DropdownsUI.DropdownItem, { icon: "grey-cloud", label: __(l[8005]),
	                                            onClick: addToCloudDrive })
	                                    )
	                                );
	                            }
	                        } else {
	                            dropdown = React.makeElement(ButtonsUI.Button, {
	                                className: "default-white-button tiny-button disabled",
	                                icon: "tiny-icon grey-down-arrow" });
	                        }

	                        files.push(React.makeElement(
	                            "div",
	                            { className: "message shared-data", key: v.h },
	                            React.makeElement(
	                                "div",
	                                { className: "message shared-info" },
	                                React.makeElement(
	                                    "div",
	                                    { className: "message data-title" },
	                                    v.name
	                                ),
	                                React.makeElement(
	                                    "div",
	                                    { className: "message file-size" },
	                                    bytesToSize(v.s)
	                                )
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "data-block-view medium" },
	                                dropdown,
	                                React.makeElement(
	                                    "div",
	                                    { className: "data-block-bg" },
	                                    React.makeElement("div", { className: "block-view-file-type " + fileIcon(v) })
	                                )
	                            ),
	                            React.makeElement("div", { className: "clear" })
	                        ));
	                    });

	                    var avatar = null;
	                    var datetime = null;
	                    var name = null;
	                    if (this.props.grouped) {
	                        additionalClasses += " grouped";
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
	                        { className: message.messageId + " message body" + additionalClasses },
	                        avatar,
	                        React.makeElement(
	                            "div",
	                            { className: "message content-area" },
	                            name,
	                            datetime,
	                            React.makeElement(
	                                "div",
	                                { className: "message shared-block" },
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

	                        var deleteButtonOptional = null;

	                        if (message.userId === u_handle) {
	                            deleteButtonOptional = React.makeElement(DropdownsUI.DropdownItem, {
	                                icon: "red-cross",
	                                label: __(l[1730]),
	                                className: "red",
	                                onClick: function onClick(e) {
	                                    self.doDelete(e, message);
	                                }
	                            });
	                        }
	                        var dropdown = null;
	                        if (M.u[contact.u]) {

	                            if (contact.c === 1) {
	                                dropdown = React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: "default-white-button tiny-button",
	                                        icon: "tiny-icon grey-down-arrow" },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            className: "white-context-menu shared-contact-dropdown",
	                                            noArrow: true,
	                                            positionMy: "left bottom",
	                                            positionAt: "right bottom",
	                                            horizOffset: 4
	                                        },
	                                        React.makeElement(DropdownsUI.DropdownItem, {
	                                            icon: "human-profile",
	                                            label: __("View profile"),
	                                            onClick: function onClick() {
	                                                window.location = "#fm/" + contact.u;
	                                            }
	                                        }),
	                                        React.makeElement("hr", null),
	                                        null,
	                                        React.makeElement(DropdownsUI.DropdownItem, {
	                                            icon: "conversations",
	                                            label: __("Start new chat"),
	                                            onClick: function onClick() {
	                                                window.location = "#fm/chat/" + contact.u;
	                                            }
	                                        }),
	                                        deleteButtonOptional ? React.makeElement("hr", null) : null,
	                                        deleteButtonOptional
	                                    )
	                                );
	                            }
	                        } else {
	                            dropdown = React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: "default-white-button tiny-button",
	                                    icon: "tiny-icon grey-down-arrow" },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: "white-context-menu shared-contact-dropdown",
	                                        noArrow: true,
	                                        positionMy: "left bottom",
	                                        positionAt: "right bottom",
	                                        horizOffset: 4
	                                    },
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: "rounded-grey-plus",
	                                        label: __("Add contact"),
	                                        onClick: function onClick() {
	                                            M.inviteContact(M.u[u_handle].m, contactEmail);

	                                            var title = l[150];

	                                            var msg = l[5898].replace('[X]', contactEmail);

	                                            closeDialog();
	                                            msgDialog('info', title, msg);
	                                        }
	                                    }),
	                                    deleteButtonOptional ? React.makeElement("hr", null) : null,
	                                    deleteButtonOptional
	                                )
	                            );
	                        }

	                        contacts.push(React.makeElement(
	                            "div",
	                            { key: contact.u },
	                            React.makeElement(
	                                "div",
	                                { className: "message shared-info" },
	                                React.makeElement(
	                                    "div",
	                                    { className: "message data-title" },
	                                    contact.name
	                                ),
	                                M.u[contact.u] ? React.makeElement(ContactsUI.ContactVerified, { className: "big", contact: contact }) : null,
	                                React.makeElement(
	                                    "div",
	                                    { className: "user-card-email" },
	                                    contactEmail
	                                )
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "message shared-data" },
	                                React.makeElement(
	                                    "div",
	                                    { className: "data-block-view medium" },
	                                    M.u[contact.u] ? React.makeElement(ContactsUI.ContactPresence, { className: "big", contact: contact }) : null,
	                                    dropdown,
	                                    React.makeElement(
	                                        "div",
	                                        { className: "data-block-bg" },
	                                        React.makeElement(ContactsUI.Avatar, { className: "medium-avatar share", contact: contact })
	                                    )
	                                ),
	                                React.makeElement("div", { className: "clear" })
	                            )
	                        ));
	                    });

	                    var avatar = null;
	                    var datetime = null;
	                    var name = null;
	                    if (this.props.grouped) {
	                        additionalClasses += " grouped";
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
	                        { className: message.messageId + " message body" + additionalClasses },
	                        avatar,
	                        React.makeElement(
	                            "div",
	                            { className: "message content-area" },
	                            name,
	                            datetime,
	                            React.makeElement(
	                                "div",
	                                { className: "message shared-block" },
	                                contacts
	                            ),
	                            buttonsBlock,
	                            spinnerElement
	                        )
	                    );
	                } else if (textContents.substr && textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
	                    if (!chatRoom._attachmentsMap) {
	                        chatRoom._attachmentsMap = {};
	                    }
	                    var foundRevokedNode = null;

	                    var revokedNode = textContents.substr(2, textContents.length);

	                    if (chatRoom._attachmentsMap[revokedNode]) {
	                        Object.keys(chatRoom._attachmentsMap[revokedNode]).forEach(function (messageId) {
	                            var attachedMsg = chatRoom.messagesBuff.messages[messageId];

	                            if (!attachedMsg) {
	                                return;
	                            }

	                            if (attachedMsg.orderValue < message.orderValue) {
	                                try {
	                                    var attachments = JSON.parse(attachedMsg.textContents.substr(2, attachedMsg.textContents.length));
	                                    attachments.forEach(function (node) {
	                                        if (node.h === revokedNode) {
	                                            foundRevokedNode = node;
	                                        }
	                                    });
	                                } catch (e) {}
	                                attachedMsg.revoked = true;
	                                attachedMsg.seen = true;
	                            }
	                        });
	                    }

	                    return null;
	                } else {
	                    chatRoom.logger.error("Invalid 2nd byte for a management message: ", textContents);
	                    return null;
	                }
	            } else {
	                var messageActionButtons = null;

	                if (message.getState() !== Message.STATE.NOT_SENT) {
	                    messageActionButtons = null;
	                }

	                var avatar = null;
	                var datetime = null;
	                var name = null;
	                if (this.props.grouped) {
	                    additionalClasses += " grouped";
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

	                var messageDisplayBlock;
	                if (self.props.isBeingEdited === true) {
	                    messageDisplayBlock = React.makeElement(TypingAreaUI.TypingArea, {
	                        iconClass: "small-icon writing-pen textarea-icon",
	                        initialText: message.textContents,
	                        chatRoom: self.props.chatRoom,
	                        className: "edit-typing-area",
	                        onUpdate: function onUpdate() {
	                            self.forceUpdate();
	                        },
	                        onConfirm: function onConfirm(messageContents) {
	                            if (self.props.onEditDone) {
	                                self.props.onEditDone(messageContents);
	                            }
	                            return true;
	                        }
	                    });
	                } else {
	                    messageDisplayBlock = React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: textMessage } });
	                }

	                return React.makeElement(
	                    "div",
	                    { className: message.messageId + " message body " + additionalClasses },
	                    avatar,
	                    React.makeElement(
	                        "div",
	                        { className: "message content-area" },
	                        name,
	                        datetime,
	                        messageActionButtons,
	                        messageDisplayBlock,
	                        buttonsBlock,
	                        spinnerElement
	                    )
	                );
	            }
	        } else if (message.type) {
	            textMessage = getMessageString(message.type);
	            if (!textMessage) {
	                console.error("Message with type: ", message.type, "does not have a text string defined. Message: ", message);
	                debugger;
	                throw new Error("boom");
	            }

	            if (textMessage.splice) {
	                var tmpMsg = textMessage[0].replace("[X]", htmlentities(generateContactName(contact.u)));

	                if (message.currentCallCounter) {
	                    tmpMsg += " " + textMessage[1].replace("[X]", "[[ " + secToDuration(message.currentCallCounter)) + "]] ";
	                }
	                textMessage = tmpMsg;
	                textMessage = textMessage.replace("[[ ", "<span className=\"grey-color\">").replace("]]", "</span>");
	            } else {
	                textMessage = textMessage.replace("[X]", htmlentities(generateContactName(contact.u)));
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
	                        icon = React.makeElement("i", { className: "small-icon " + button.icon });
	                    }
	                    buttons.push(React.makeElement(
	                        "div",
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
	                    "div",
	                    { className: "buttons-block" },
	                    buttons,
	                    React.makeElement("div", { className: "clear" })
	                );
	            }

	            return React.makeElement(
	                "div",
	                { className: "message body", "data-id": "id" + message.messageId },
	                React.makeElement(
	                    "div",
	                    { className: "feedback round-icon-block" },
	                    React.makeElement("i", { className: "round-icon " + message.cssClass })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "message content-area" },
	                    React.makeElement(
	                        "div",
	                        { className: "message date-time" },
	                        timestamp
	                    ),
	                    React.makeElement("div", { className: "message text-block", dangerouslySetInnerHTML: { __html: textMessage } }),
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
/* 166 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);

	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ContactsUI = __webpack_require__(160);

	var ConversationMessageMixin = {
	    mixins: [MegaRenderMixin],
	    onAfterRenderWasTriggered: false,
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;
	        megaChat.chats.addChangeListener(function () {
	            if (self.isMounted()) {
	                self.forceUpdate();
	            }
	        });
	    },
	    getContact: function getContact() {
	        var message = this.props.message;
	        var megaChat = this.props.chatRoom.megaChat;

	        var contact;
	        if (message.authorContact) {
	            contact = message.authorContact;
	        } else if (message.userId) {
	            if (!M.u[message.userId]) {

	                return null;
	            }
	            contact = M.u[message.userId];
	        } else if (message.getFromJid) {
	            contact = megaChat.getContactFromJid(message.getFromJid());
	        } else if (message.meta && message.meta.userId) {
	            contact = M.u[message.meta.userId];
	            if (!contact) {
	                return {
	                    'u': message.meta.userId,
	                    'h': message.meta.userId,
	                    'c': 0
	                };
	            }
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
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
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
/* 167 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(154);
	var utils = __webpack_require__(156);
	var MegaRenderMixin = __webpack_require__(157).MegaRenderMixin;
	var ContactsUI = __webpack_require__(160);
	var ConversationMessageMixin = __webpack_require__(166).ConversationMessageMixin;

	var AlterParticipantsConversationMessage = React.createClass({
	    displayName: "AlterParticipantsConversationMessage",

	    mixins: [ConversationMessageMixin],

	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.chatRoom.megaChat;
	        var chatRoom = this.props.chatRoom;
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
	            displayName = contact.u === u_handle ? __("Me") : generateAvatarMeta(contact.u).fullName;
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
	            var otherDisplayName = otherContact.u === u_handle ? __("Me") : generateAvatarMeta(otherContact.u).fullName;

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
	                    React.makeElement(
	                        "div",
	                        { className: "message text-block" },
	                        "Joined the group chat by invitation from ",
	                        React.makeElement(
	                            "strong",
	                            { className: "dark-grey-txt" },
	                            displayName
	                        )
	                    )
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
	            var otherDisplayName = otherContact.u === u_handle ? __("Me") : generateAvatarMeta(otherContact.u).fullName;

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
	                    React.makeElement(
	                        "div",
	                        { className: "message text-block" },
	                        "Was removed from the group chat by ",
	                        React.makeElement(
	                            "strong",
	                            { className: "dark-grey-txt" },
	                            displayName
	                        )
	                    )
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
/* 168 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var utils = __webpack_require__(169);
	var React = __webpack_require__(2);
	var ConversationPanelUI = __webpack_require__(162);

	var ChatRoom = function ChatRoom(megaChat, roomJid, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl) {
	    var self = this;

	    this.logger = MegaLogger.getLogger("room[" + roomJid + "]", {}, megaChat.logger);

	    this.megaChat = megaChat;

	    MegaDataObject.attachToExistingJSObject(this, {
	        state: null,
	        users: [],
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
	        membersLoaded: false
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

	    this.options = {

	        'sendMessageQueueIfNotReadyTimeout': 6500,

	        'pluginsReadyTimeout': 60000,

	        'mediaOptions': {
	            audio: true,
	            video: true
	        }
	    };

	    this.setState(ChatRoom.STATE.INITIALIZED);

	    this.isCurrentlyActive = false;

	    this.bind('onStateChange', function (e, oldState, newState) {
	        self.logger.warn("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));

	        var resetStateToReady = function resetStateToReady() {
	            if (self.state != ChatRoom.STATE.LEFT && self.state != ChatRoom.STATE.READY) {
	                self.logger.warn("setting state to READY.");

	                self.setState(ChatRoom.STATE.READY);
	            }
	        };

	        if (newState === ChatRoom.STATE.PLUGINS_READY) {
	            resetStateToReady();
	        } else if (newState === ChatRoom.STATE.JOINED) {
	            self.setState(ChatRoom.STATE.PLUGINS_WAIT);
	        } else if (newState === ChatRoom.STATE.PLUGINS_WAIT) {
	            var $event = new $.Event("onPluginsWait");
	            self.megaChat.trigger($event, [self]);

	            if (!$event.isPropagationStopped()) {
	                self.setState(ChatRoom.STATE.PLUGINS_READY);
	            }
	        } else if (newState === ChatRoom.STATE.PLUGINS_PAUSED) {

	            createTimeoutPromise(function () {
	                return self.state !== ChatRoom.STATE.PLUGINS_PAUSED && self.state !== ChatRoom.STATE.PLUGINS_WAIT;
	            }, 100, self.options.pluginsReadyTimeout).fail(function () {
	                if (self.state === ChatRoom.STATE.PLUGINS_WAIT || self.state === ChatRoom.STATE.PLUGINS_PAUSED) {
	                    self.logger.error("Plugins had timed out, setting state to PLUGINS_READY");

	                    var participants = self.getParticipantsExceptMe();
	                    var contact = participants[0];

	                    var pres = self.megaChat.karere.getPresence(contact);

	                    if (pres && pres != "offline" && self.encryptionHandler && self.encryptionHandler.state !== 3) {

	                        var othersJid = self.getParticipantsExceptMe()[0];
	                        var data = {
	                            currentMpencState: self.encryptionHandler.state,
	                            currentKarereState: self.megaChat.karere.getConnectionState(),
	                            myPresence: self.megaChat.karere.getPresence(self.megaChat.karere.getJid()),
	                            otherUsersPresence: self.megaChat.karere.getPresence(othersJid),
	                            callIsActive: self.callSession ? constStateToText(CallSession.STATE, self.callSession.state) : null,
	                            queuedMessagesCount: self._messagesQueue.length,
	                            opQueueErrorRetriesCount: self.encryptionOpQueue._error_retries
	                        };

	                        srvlog("Timed out initialising mpenc.", data, true);
	                        self.logger.error("Timed out initialising mpenc.", data);
	                    }

	                    self.setState(ChatRoom.STATE.PLUGINS_READY);
	                }
	            });
	        } else if (newState === ChatRoom.STATE.READY) {
	            self._flushMessagesQueue();
	        }
	    });

	    self.bind('onAfterRenderMessage', function (e, msg) {
	        var ts = msg.delay ? msg.delay : msg.ts;
	        if (!ts) {
	            return;
	        }

	        if (self.lastActivity && self.lastActivity > ts) {

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
	            $(window).rebind("unbind." + self.roomJid);
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

	    'PLUGINS_PAUSED': 175,

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

	        assert(newState === ChatRoom.STATE.PLUGINS_PAUSED || self.state === ChatRoom.STATE.PLUGINS_PAUSED || newState === ChatRoom.STATE.JOINING && isRecover || newState === ChatRoom.STATE.INITIALIZED && isRecover || newState > self.state, 'Invalid state change. Current:' + ChatRoom.stateToText(self.state) + "to" + ChatRoom.stateToText(newState));
	    }

	    var oldState = self.state;
	    self.state = newState;

	    self.trigger('onStateChange', [oldState, newState]);
	};

	ChatRoom.prototype.getStateAsText = function () {
	    var self = this;
	    return ChatRoom.stateToText(self.state);
	};

	ChatRoom.prototype.getCurrentCallType = function () {
	    var self = this;
	    var opts = self.callSession ? self.callSession.getMediaOptions() : null;

	    if (!self.callSession || self.callSession.isStarted() === false) {
	        return false;
	    } else if (opts.video === true && opts.audio === true) {
	        return "video-call";
	    } else if (opts.video === false && opts.audio === true) {
	        return "audio-call";
	    } else {
	        return "none";
	    }
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

	    this.refreshUI();
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

	ChatRoom.prototype.iAmRoomOwner = function () {
	    var self = this;

	    var users = self.getOrderedUsers();

	    return users[0] === self.megaChat.karere.getJid();
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
	        var participants = self.members && Object.keys(self.members).length > 0 ? Object.keys(self.members) : [];
	        var names = [];
	        participants.forEach(function (contactHash) {
	            if (contactHash && M.u[contactHash] && contactHash !== u_handle) {
	                names.push(M.u[contactHash].name ? M.u[contactHash].name : "non contact");
	            }
	        });
	        return names.length > 0 ? names.join(", ") : __("(empty)");
	    }
	};

	ChatRoom.prototype.getRoomIcon = function () {
	    var self = this;
	    if (this.type == "private") {
	        var participants = self.getParticipantsExceptMe();
	        var presence = self.megaChat.karere.getPresence(participants[0]);

	        var targetClassName = "offline";
	        if (!presence || presence == Karere.PRESENCE.OFFLINE) {
	            targetClassName = "offline";
	        } else if (presence == Karere.PRESENCE.AWAY) {
	            targetClassName = "away";
	        } else if (presence == Karere.PRESENCE.BUSY) {
	            targetClassName = "busy";
	        } else if (presence === true || presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE) {
	            targetClassName = "online";
	        } else {
	            targetClassName = "offline";
	        }

	        return targetClassName;
	    } else {
	        assert(false, "invalid room type");
	        return "[invalid room type]";
	    }
	};

	ChatRoom.prototype.leave = function (notifyOtherDevices) {
	    var self = this;

	    self._leaving = true;

	    if (notifyOtherDevices === true) {
	        if (self.type == "group") {
	            $(self).trigger('onLeaveChatRequested');
	        } else {
	            self.logger.error("Can't leave room of type: " + self.type);
	            return;
	        }
	    }

	    if (self.roomJid.indexOf("@") != -1) {
	        self.setState(ChatRoom.STATE.LEAVING);
	        return self.megaChat.karere.leaveChat(self.roomJid).done(function () {
	            self.setState(ChatRoom.STATE.LEFT);
	        });
	    } else {
	        self.setState(ChatRoom.STATE.LEFT);

	        self.destroyStructure();
	    }

	    self.megaChat.refreshConversations();
	};

	ChatRoom.prototype.destroy = function (notifyOtherDevices) {
	    var self = this;

	    self.megaChat.trigger('onRoomDestroy', [self]);

	    self.leave(notifyOtherDevices);

	    var $element = $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
	    $element.remove();

	    var mc = self.megaChat;
	    var roomJid = self.roomJid;

	    if (roomJid === mc.getCurrentRoomJid() || self.$messages && self.$messages.is(":visible")) {
	        window.location = "#fm/chat";
	        self.hide();
	        setTimeout(function () {
	            self.megaChat.renderListing();
	        }, 300);
	    } else {
	        self.megaChat.refreshConversations();
	    }

	    setTimeout(function () {
	        mc.chats.remove(roomJid);
	    }, 1);
	};

	ChatRoom.prototype.show = function () {
	    var self = this;

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

	    if (message.getFromJid && message instanceof KarereEventObjects.IncomingMessage && Karere.getNormalizedBareJid(message.getFromJid()) === self.megaChat.karere.getJid()) {

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

	    self.trackDataChange();
	};

	ChatRoom.prototype.refreshScrollUI = function () {};

	ChatRoom.prototype.refreshUI = function () {};

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

	    if (self._conv_ended === true) {
	        self._restartConversation();
	    }
	    var messageId = megaChat.karere.generateMessageId(self.roomJid, JSON.stringify([message, meta]));

	    var eventObject = new KarereEventObjects.OutgoingMessage(self.roomJid, megaChat.karere.getJid(), "groupchat", messageId, message, meta, unixtime(), KarereEventObjects.OutgoingMessage.STATE.NOT_SENT, self.roomJid);

	    eventObject.textContents = message;

	    if (megaChat.karere.getConnectionState() !== Karere.CONNECTION_STATE.CONNECTED || self.arePluginsForcingMessageQueue(message) || self.state != ChatRoom.STATE.READY && message.indexOf("?mpENC:") !== 0) {

	        var event = new $.Event("onQueueMessage");

	        self.megaChat.trigger(event, [eventObject, self]);

	        if (event.isPropagationStopped()) {
	            return false;
	        }

	        self.logger.debug("Queueing: ", eventObject);

	        self._messagesQueue.push(eventObject);

	        self.appendMessage(eventObject);
	    } else {
	        self._sendMessageToTransport(eventObject).done(function (internalId) {
	            eventObject.internalId = internalId;
	        });
	        self.appendMessage(eventObject);
	    }
	};

	ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
	    var self = this;
	    var megaChat = this.megaChat;

	    var messageContents = messageObject.getContents() ? messageObject.getContents() : "";

	    var messageMeta = messageObject.getMeta() ? messageObject.getMeta() : {};
	    if (messageMeta.isDeleted && messageMeta.isDeleted === true) {
	        return MegaPromise.reject();
	    }

	    return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject.getContents());
	};

	ChatRoom.prototype.sendAction = function (action, message, meta) {
	    var self = this;
	    meta.action = action;

	    self.sendMessage(message, meta);
	};

	ChatRoom.prototype.getMediaOptions = function () {
	    return this.callSession ? this.callSession.getMediaOptions : {};
	};

	ChatRoom.prototype._sendNodes = function (nodeids, users) {
	    var promises = [];
	    var self = this;

	    users.forEach(function (uh) {
	        nodeids.forEach(function (nodeId) {
	            promises.push(asyncApiReq({ 'a': 'mcga', 'n': nodeId, 'u': uh, 'id': self.chatId }));
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
	            'a': 'mcra', 'n': node.h, 'u': uh, 'id': self.chatId
	        }));
	    });
	    MegaPromise.allDone(allPromises).done(function () {

	        self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT + node.h);
	    }).always(function () {
	        loadingDialog.hide();
	    }).fail(function (r) {
	        msgDialog('warninga', __("Revoke attachment"), __("Could not revoke access to attachment, error code: %s.").replace("%s", r));
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
	        $count.text(count);
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

	    self.logger.warn('recovering room: ', self.roomJid, self);

	    self.callRequest = null;
	    self.setState(ChatRoom.STATE.JOINING, true);
	    var $startChatPromise = self.megaChat.karere.startChat([], self.type, self.roomJid.split("@")[0], self.type === "private" ? false : undefined);

	    self.megaChat.trigger("onRoomCreated", [self]);

	    return $startChatPromise;
	};

	ChatRoom.prototype._flushMessagesQueue = function () {
	    var self = this;

	    self.logger.debug("Chat room state set to ready, will flush queue: ", self._messagesQueue);

	    if (self._messagesQueue.length > 0) {
	        $.each(self._messagesQueue, function (k, v) {
	            if (!v || v.deleted) {
	                return;
	            }

	            self._sendMessageToTransport(v).done(function (internalId) {
	                v.internalId = internalId;
	            });
	        });
	        self._messagesQueue = [];

	        self.megaChat.trigger('onMessageQueueFlushed', self);
	    }
	};

	ChatRoom.prototype._generateContactAvatarElement = function (fullJid) {
	    var self = this;

	    var contact = self.megaChat.getContactFromJid(fullJid);

	    if (!contact) {
	        self.logger.error('contact not found: ' + fullJid);

	        return;
	    }

	    var $av = $(useravatar.contact(contact.u));
	    var cls = $av.attr('class');
	    var style = $av.attr('style');
	    $av.attr({ 'class': '', 'style': '' });

	    var $element = $('<div class="nw-contact-avatar"></div>').append($av);
	    $element.addClass(cls);
	    $element.addClass(contact.u);
	    $element.attr({ style: style });

	    if (contact.verified) {
	        $element.addClass('verified');
	    }

	    return $element;
	};

	ChatRoom.prototype._waitingForOtherParticipants = function () {
	    var self = this;

	    var otherUsersInRoom = false;

	    Object.keys(self.getUsers()).forEach(function (v, k) {
	        if (v.indexOf(self.megaChat.karere.getBareJid()) === -1) {
	            otherUsersInRoom = true;
	            return false;
	        }
	    });
	    return !otherUsersInRoom;
	};

	ChatRoom.prototype._restartConversation = function () {
	    var self = this;

	    if (self._conv_ended === true) {
	        self._conv_ended = self._leaving = false;

	        self.setState(ChatRoom.STATE.PLUGINS_WAIT);

	        self.trigger('onConversationStarted');
	    }
	};

	ChatRoom.prototype._conversationEnded = function (userFullJid) {
	    var self = this;

	    if (self && self._leaving !== true) {
	        if (self.callSession) {
	            if (self.callSession.isStarted() || self.callSession.isStarting()) {
	                self.callSession.endCall();
	            }
	        }

	        self._conv_ended = true;

	        self.setState(ChatRoom.STATE.ENDED);

	        [self.$messages].forEach(function (k, v) {
	            $(k).addClass("conv-end").removeClass("conv-start");
	        });

	        $('.fm-chat-file-button.fm-chat-inline-dialog-button-end-chat span', self.$messages).remove();
	    }
	};

	ChatRoom.prototype._conversationStarted = function (userBareJid) {
	    var self = this;

	    if (self._conv_ended) {
	        if (Karere.getNormalizedBareJid(userBareJid) != self.megaChat.karere.getBareJid()) {

	            self._restartConversation();
	        }
	    } else {

	        self.trigger('onConversationStarted');
	    }

	    self.setState(ChatRoom.STATE.READY);
	};
	ChatRoom.prototype.cancelAttachment = function (messageId, nodeId) {
	    var self = this;

	    var msg = self.messagesBuff.getMessageById(messageId);

	    if (msg && msg.meta && msg.meta.attachments && msg.meta.attachments[nodeId]) {
	        var meta = clone(msg.getMeta());
	        meta.attachments[nodeId].canceled = true;
	        msg.setMeta(meta);
	    }

	    var $container = $('.attachments-container[data-message-id="' + messageId + '"] .nw-chat-sharing-body[data-node-id="' + nodeId + '"]', self.$messages);
	    if ($container.length > 0) {
	        $('.nw-chat-button:first', $container).after($('<em>Canceled</em>'));

	        $('.nw-chat-button', $container).remove();
	    }
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

	window.ChatRoom = ChatRoom;
	module.exports = ChatRoom;

/***/ },
/* 169 */
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
