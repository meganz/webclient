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
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(4);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var ConversationsUI = __webpack_require__(4);
	var ChatRoom = __webpack_require__(32);

	var EMOJI_DATASET_VERSION = 2;

	var _chatui;
	var webSocketsSupport = typeof WebSocket !== 'undefined';

	(function () {
	    _chatui = function chatui(id) {
	        var roomOrUserHash = id.replace("chat/", "");

	        var roomType = false;
	        megaChat.displayArchivedChats = false;
	        if (roomOrUserHash === "archived") {
	            roomType = "archived";
	            megaChat.displayArchivedChats = true;
	        } else if (roomOrUserHash.substr(0, 2) === "g/") {
	            roomType = "group";
	            roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
	            megaChat.displayArchivedChats = false;
	            if (!megaChat.chats[roomOrUserHash]) {

	                if (ChatdIntegration._loadingChats[roomOrUserHash] && ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.state() === 'pending') {
	                    ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.done(function () {
	                        _chatui(id);
	                    });
	                    return;
	                }

	                setTimeout(function () {
	                    loadSubPage('fm/chat');
	                    M.openFolder('chat');
	                }, 100);
	                return;
	            }
	        } else {
	            megaChat.displayArchivedChats = false;
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
	            var userHandles = [u_handle, userHandle];
	            var $promise;

	            var resp = megaChat.openChat(userHandles, "private", undefined, undefined, undefined, true);

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
	            if (megaChat.chats[roomOrUserHash].isArchived()) {
	                megaChat.chats[roomOrUserHash].showArchived = true;
	            }
	            megaChat.chats[roomOrUserHash].show();
	        } else if (roomType === "archived") {
	            megaChat.hideAllChats();
	            M.onSectionUIOpen('conversations');
	            $('.archived-chat-view').removeClass('hidden');
	            if (megaChat.$conversationsAppInstance) {
	                megaChat.$conversationsAppInstance.safeForceUpdate();
	            }
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
	    this.archivedChatsCount = 0;
	    this._myPresence = localStorage.megaChatPresence;

	    this.options = {
	        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
	        'loadbalancerService': 'gelb.karere.mega.nz',
	        'rtc': {
	            iceServers: [{
	                urls: ['turn:trn.karere.mega.nz:3478?transport=udp'],
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }]
	        },
	        filePickerOptions: {},
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

	    self.filePicker = null;
	    self._chatsAwaitingAps = {};

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

	    var updateMyConnectionStatus = function updateMyConnectionStatus() {
	        self.renderMyStatus();
	    };

	    $(document.body).undelegate('.top-user-status-popup .tick-item', 'mousedown.megachat');

	    $(document.body).delegate('.top-user-status-popup .tick-item', 'mousedown.megachat', function (e) {
	        var presence = $(this).data("presence");
	        self._myPresence = presence;

	        $('.top-user-status-popup').removeClass("active");

	        $('.top-user-status-popup').addClass("hidden");

	        var targetPresence = PresencedIntegration.cssClassToPresence(presence);

	        self.plugins.presencedIntegration.setPresence(targetPresence);

	        if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {

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

	        if (room && !room.isCurrentlyActive && room.chatId != lastOpenedRoom) {

	            room.hide();
	            self.currentlyOpenedChat = null;
	        }
	        if (lastOpenedRoom && (!room || room.chatId != lastOpenedRoom)) {

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
	            lastOpenedRoom = room.chatId;
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

	    self.on('onRoomCreated', function (e, room) {
	        if (room.type === "private") {
	            var userHandle = room.getParticipantsExceptMe()[0];

	            if (!userHandle) {
	                return;
	            }
	            var c = M.u[userHandle];

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
	            var userHandle = room.getParticipantsExceptMe()[0];
	            var c = M.u[userHandle];

	            if (!c) {
	                return;
	            }

	            $('#contact_' + c.u + ' .start-chat-button').removeClass("active");
	        }
	        if (room.callManagerCall) {
	            room.callManagerCall.endCall();
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

	    mBroadcaster.addListener('upload:start', function (data) {
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

	Chat.prototype.getRoomFromUrlHash = function (urlHash) {
	    if (urlHash.indexOf("#") === 0) {
	        urlHash = urlHash.subtr(1, urlHash.length);
	    }
	    if (urlHash.indexOf("chat/g/") > -1) {
	        var foundRoom = null;
	        urlHash = urlHash.replace("chat/g/", "");
	        megaChat.chats.forEach(function (room) {
	            if (!foundRoom && room.chatId === urlHash) {
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

	Chat.prototype.updateSectionUnreadCount = SoonFc(function () {
	    var self = this;

	    if (!self.favico) {
	        assert(Favico, 'Favico.js is missing.');

	        $('link[rel="icon"]').attr('href', (location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath) + 'favicon.ico');

	        self.favico = new Favico({
	            type: 'rectangle',
	            animation: 'popFade',
	            bgColor: '#fff',
	            textColor: '#d00'
	        });
	    }

	    var unreadCount = 0;

	    self.chats.forEach(function (megaRoom, k) {
	        var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
	        unreadCount += c;
	    });

	    unreadCount = unreadCount > 9 ? "9+" : unreadCount;

	    if (self._lastUnreadCount != unreadCount) {
	        if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
	            $('.new-messages-indicator').text(unreadCount).removeClass('hidden');
	        } else {
	            $('.new-messages-indicator').addClass('hidden');
	        }
	        self._lastUnreadCount = unreadCount;

	        delay('notifFavicoUpd', function () {
	            self.favico.reset();
	            self.favico.badge(unreadCount);
	        });

	        self.updateDashboard();
	    }
	}, 100);

	Chat.prototype.destroy = function (isLogout) {
	    var self = this;

	    if (self.is_initialized === false) {
	        return;
	    }

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

	Chat.prototype.userPresenceToCssClass = function (presence) {
	    if (presence === UserPresence.PRESENCE.ONLINE) {
	        return 'online';
	    } else if (presence === UserPresence.PRESENCE.AWAY) {
	        return 'away';
	    } else if (presence === UserPresence.PRESENCE.DND) {
	        return 'busy';
	    } else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
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

	    if (userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING) {
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

	Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive) {
	    var self = this;
	    type = type || "private";
	    setAsActive = setAsActive === true;

	    var roomId = chatId;

	    var $promise = new MegaPromise();

	    if (type === "private") {

	        var allValid = true;
	        userHandles.forEach(function (user_handle) {
	            var contact = M.u[user_handle];
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
	        roomId = array.filterNonMatching(userHandles, u_handle)[0];
	        if (!roomId) {

	            $promise.reject();
	            return $promise;
	        }
	        if (self.chats[roomId]) {
	            $promise.resolve(roomId, self.chats[roomId]);
	            return [roomId, self.chats[roomId], $promise];
	        } else {}
	    } else {
	        assert(roomId, 'Tried to create a group chat, without passing the chatId.');
	        roomId = chatId;
	    }

	    if (type === "group") {
	        userHandles.forEach(function (contactHash) {
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
	                M.syncContactEmail(contactHash);
	            }
	        });
	    }

	    if (!roomId && setAsActive === true) {

	        if (ChatdIntegration.allChatsHadLoaded.state() === 'pending' || ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
	            MegaPromise.allDone([ChatdIntegration.allChatsHadLoaded, ChatdIntegration.mcfHasFinishedPromise]).always(function () {
	                var res = self.openChat(userHandles, type, chatId, chatShard, chatdUrl, setAsActive);
	                $promise.linkDoneAndFailTo(res[2]);
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

	    if (!chatId && ChatdIntegration._loadingChats[roomId]) {

	        ChatdIntegration._loadingChats[roomId].loadingPromise.done(function () {

	            if (self.chats[roomId]) {
	                if (self.chats[roomId].isArchived() && roomId === megaChat.currentlyOpenedChat) {
	                    self.chats[roomId].showArchived = true;
	                }
	                return;
	            }
	            var res = self.openChat(userHandles, ap.g === 1 ? "group" : "private", ap.id, ap.cs, ap.url, setAsActive);

	            $promise.linkDoneAndFailTo(res[2]);
	        }).fail(function () {
	            $promise.reject(arguments[0]);
	        });

	        if (setAsActive) {

	            ChatdIntegration._loadingChats[roomId].setAsActive = true;
	        }

	        return [roomId, undefined, $promise];
	    }

	    var room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl);

	    self.chats.set(room.roomId, room);

	    if (setAsActive && !self.currentlyOpenedChat) {
	        room.show();
	    }

	    if (setAsActive === false && chatId && ChatdIntegration._loadingChats[roomId] && ChatdIntegration._loadingChats[roomId].setAsActive) {
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
	    } else {
	        room.showAfterCreation = true;
	    }

	    room.setState(ChatRoom.STATE.JOINING);
	    return [roomId, room, MegaPromise.resolve(roomId, self.chats[roomId])];
	};

	Chat.prototype.hideAllChats = function () {
	    var self = this;
	    self.chats.forEach(function (chatRoom, k) {
	        if (chatRoom.isCurrentlyActive) {
	            chatRoom.hide();
	        }
	    });
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

	Chat.prototype.processNewUser = function (u) {
	    var self = this;

	    self.logger.debug("added: ", u);

	    if (self.plugins.presencedIntegration) {
	        self.plugins.presencedIntegration.addContact(u);
	    }
	    self.chats.forEach(function (chatRoom) {
	        if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
	            chatRoom.trackDataChange();
	        }
	    });

	    self.renderMyStatus();
	};

	Chat.prototype.processRemovedUser = function (u) {
	    var self = this;

	    self.logger.debug("removed: ", u);

	    if (self.plugins.presencedIntegration) {
	        self.plugins.presencedIntegration.removeContact(u);
	    }
	    self.chats.forEach(function (chatRoom) {
	        if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
	            chatRoom.trackDataChange();
	        }
	    });

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
	        if (activePopup.attr('class').indexOf('fm-add-contact-popup') === -1 && activePopup.attr('class').indexOf('fm-start-call-popup') === -1) {
	            activePopup.css('left', '-' + 10000 + 'px');
	        } else activePopup.css('right', '-' + 10000 + 'px');
	    }
	};

	Chat.prototype.getChatNum = function (idx) {
	    return this.chats[this.chats.keys()[idx]];
	};

	Chat.prototype.renderListing = function () {
	    var self = this;

	    self.hideAllChats();

	    M.hideEmptyGrids();

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
	    } else {
	        $('.fm-empty-conversations').addClass('hidden');

	        if (self.lastOpenedChat && self.chats[self.lastOpenedChat] && self.chats[self.lastOpenedChat]._leaving !== true && self.chats[self.lastOpenedChat].isDisplayable()) {

	            self.chats[self.lastOpenedChat].setActive();
	            self.chats[self.lastOpenedChat].show();
	            return self.chats[self.lastOpenedChat];
	        } else {
	            if (self.chats.length > 0) {
	                return self.showLastActive();
	            } else {
	                $('.fm-empty-conversations').removeClass('hidden');
	            }
	        }
	    }
	};

	Chat.prototype.showLastActive = function () {
	    var self = this;

	    if (self.chats.length > 0 && self.allChatsHadLoadedHistory()) {
	        var sortedConversations = obj_values(self.chats.toJS());

	        sortedConversations.sort(M.sortObjFn("lastActivity", -1));
	        var index = 0;

	        while (index < sortedConversations.length && !sortedConversations[index].isDisplayable()) {
	            index++;
	        }
	        if (index < sortedConversations.length) {
	            var room = sortedConversations[index];
	            if (!room.isActive()) {
	                room.setActive();
	                room.show();
	            }
	            return room;
	        } else {
	            return false;
	        }
	    } else {
	        return false;
	    }
	};

	Chat.prototype.allChatsHadLoadedHistory = function () {
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

	Chat.prototype.getPrivateRoom = function (h) {
	    var self = this;

	    if (self.chats[h]) {
	        return self.chats[h];
	    } else {
	        return false;
	    }
	};

	Chat.prototype.createAndShowPrivateRoomFor = function (h) {
	    var self = this;

	    if (self.chats[h]) {
	        _chatui(h);
	        return MegaPromise.resolve(this.getPrivateRoom(h));
	    } else {
	        var userHandles = [u_handle, h];
	        var result = megaChat.openChat(userHandles, "private");
	        var roomId = result[1] && result[1].roomId ? result[1].roomId : '';
	        var promise = new MegaPromise();

	        if (result && result[1] && result[2]) {
	            var room = result[1];
	            var chatInitDonePromise = result[2];
	            chatInitDonePromise.done(function () {
	                createTimeoutPromise(function () {
	                    return room.state === ChatRoom.STATE.READY;
	                }, 300, 30000).done(function () {
	                    room.setActive();
	                    promise.resolve(room);
	                }).fail(function (e) {
	                    promise.reject(e);
	                });
	            });
	        } else if (d) {
	            console.warn('Cannot openChat for %s.', roomId);
	            promise.reject();
	        }

	        return promise;
	    }
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

	Chat.prototype._leaveAllGroupChats = function () {
	    asyncApiReq({ 'a': 'mcf', 'v': Chatd.VERSION }).done(function (r) {
	        r.c.forEach(function (chatRoomMeta) {
	            if (chatRoomMeta.g === 1) {
	                asyncApiReq({
	                    "a": "mcr",
	                    "id": chatRoomMeta.id,
	                    "v": Chatd.VERSION
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
	    } else if (name === "categories") {

	        self._emojiData[name] = ["people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];

	        return MegaPromise.resolve(self._emojiData[name]);
	    } else {
	        self._emojiDataLoading[name] = MegaPromise.asMegaPromiseProxy($.getJSON(staticpath + "js/chat/emojidata/" + name + "_v" + EMOJI_DATASET_VERSION + ".json"));
	        self._emojiDataLoading[name].done(function (data) {
	            self._emojiData[name] = data;
	            delete self._emojiDataLoading[name];
	        }).fail(function () {
	            delete self._emojiDataLoading[name];
	        });

	        return self._emojiDataLoading[name];
	    }
	};

	Chat.prototype.isValidEmojiSlug = function (slug) {
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

	Chat.prototype.getMyPresence = function () {
	    if (u_handle && this.plugins.presencedIntegration) {
	        return this.plugins.presencedIntegration.getMyPresence();
	    } else {
	        return;
	    }
	};

	Chat.prototype.getPresence = function (user_handle) {
	    if (user_handle && this.plugins.presencedIntegration) {
	        return this.plugins.presencedIntegration.getPresence(user_handle);
	    } else {
	        return;
	    }
	};

	Chat.prototype.getPresenceAsCssClass = function (user_handle) {
	    var presence = this.getPresence(user_handle);
	    return this.presenceStringToCssClass(presence);
	};

	Chat.prototype.presenceStringToCssClass = function (presence) {
	    if (presence === UserPresence.PRESENCE.ONLINE) {
	        return 'online';
	    } else if (presence === UserPresence.PRESENCE.AWAY) {
	        return 'away';
	    } else if (presence === UserPresence.PRESENCE.DND) {
	        return 'busy';
	    } else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
	        return 'offline';
	    } else {
	        return 'black';
	    }
	};

	Chat.prototype.generateTempMessageId = function (roomId, messageAndMeta) {
	    var messageIdHash = u_handle + roomId;
	    if (messageAndMeta) {
	        messageIdHash += messageAndMeta;
	    }
	    return "m" + fastHashFunction(messageIdHash) + "_" + unixtime();
	};

	Chat.prototype.getChatById = function (chatdId) {
	    var self = this;
	    if (self.chats[chatdId]) {
	        return self.chats[chatdId];
	    } else if (self.chatIdToRoomId && self.chatIdToRoomId[chatdId] && self.chats[self.chatIdToRoomId[chatdId]]) {
	        return self.chats[self.chatIdToRoomId[chatdId]];
	    }

	    var found = false;
	    self.chats.forEach(function (chatRoom) {
	        if (!found && chatRoom.chatId === chatdId) {
	            found = chatRoom;
	            return false;
	        }
	    });
	    return found ? found : false;
	};

	Chat.prototype.getMyChatFilesFolder = function () {
	    var promise = new MegaPromise();

	    var folderName = "My chat files";
	    var paths = [folderName];
	    var safePath = M.getSafePath(paths);

	    if (safePath.length === 1) {
	        safePath = safePath[0];
	    }

	    var target = M.RootID;

	    M.createFolder(target, safePath, new MegaPromise()).always(function (_target) {
	        if (typeof _target === 'number') {
	            ulmanager.logger.warn('Unable to create folder "%s" on target "%s"', path, target, api_strerror(_target));
	            promise.reject();
	        } else {
	            promise.resolve(_target);
	        }
	    });

	    return promise;
	};

	Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
	    var userHandles = [u_handle, user_handle];
	    var result = megaChat.openChat(userHandles, "private");
	    var roomId = result[1] && result[1].roomId ? result[1].roomId : '';

	    if (result && result[1] && result[2]) {
	        var room = result[1];
	        var chatInitDonePromise = result[2];
	        chatInitDonePromise.done(function () {
	            createTimeoutPromise(function () {
	                return room.state === ChatRoom.STATE.READY;
	            }, 300, 30000).done(function () {
	                room.setActive();
	                $(room).trigger('openSendFilesDialog');
	            });
	        });
	    } else if (d) {
	        console.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId);
	    }
	};

	window.Chat = Chat;
	window.chatui = _chatui;

	module.exports = {
	    Chat: Chat,
	    chatui: _chatui
	};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	module.exports = React;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = ReactDOM;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var getMessageString = __webpack_require__(7).getMessageString;
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(9);
	var DropdownsUI = __webpack_require__(10);
	var ContactsUI = __webpack_require__(11);
	var ConversationPanelUI = __webpack_require__(12);
	var ModalDialogsUI = __webpack_require__(13);

	var renderMessageSummary = function renderMessageSummary(lastMessage) {
	    var renderableSummary;
	    if (lastMessage.renderableSummary) {
	        renderableSummary = lastMessage.renderableSummary;
	    } else {
	        if (lastMessage.isManagement && lastMessage.isManagement()) {
	            renderableSummary = lastMessage.getManagementMessageSummaryText();
	        } else if (!lastMessage.textContents && lastMessage.dialogType) {
	            renderableSummary = Message._getTextContentsForDialogType(lastMessage);
	        } else {
	            renderableSummary = lastMessage.textContents;
	        }
	        renderableSummary = renderableSummary && removeHTML(renderableSummary, true) || '';

	        var escapeUnescapeArgs = [{ 'type': 'onPreBeforeRenderMessage', 'textOnly': true }, { 'message': { 'textContents': renderableSummary } }, ['textContents', 'messageHtml'], 'messageHtml'];

	        megaChat.plugins.btRtfFilter.escapeAndProcessMessage(escapeUnescapeArgs[0], escapeUnescapeArgs[1], escapeUnescapeArgs[2], escapeUnescapeArgs[3]);
	        renderableSummary = escapeUnescapeArgs[1].message.textContents;

	        renderableSummary = megaChat.plugins.emoticonsFilter.processHtmlMessage(renderableSummary);
	        renderableSummary = megaChat.plugins.rtfFilter.processStripRtfFromMessage(renderableSummary);

	        escapeUnescapeArgs[1].message.messageHtml = renderableSummary;

	        escapeUnescapeArgs[0].type = "onPostBeforeRenderMessage";

	        renderableSummary = megaChat.plugins.btRtfFilter.unescapeAndProcessMessage(escapeUnescapeArgs[0], escapeUnescapeArgs[1], escapeUnescapeArgs[2], escapeUnescapeArgs[3]);

	        renderableSummary = renderableSummary || "";
	        renderableSummary = renderableSummary.replace("<br/>", "\n").split("\n");
	        renderableSummary = renderableSummary.length > 1 ? renderableSummary[0] + "..." : renderableSummary[0];
	    }
	    return renderableSummary;
	};

	var getRoomName = function getRoomName(chatRoom) {
	    return chatRoom.getRoomTitle();
	};

	var ConversationsListItem = React.createClass({
	    displayName: "ConversationsListItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    specificShouldComponentUpdate: function specificShouldComponentUpdate() {
	        if (this.loadingShown || this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown) {
	            return false;
	        } else {
	            return undefined;
	        }
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        self.chatRoomChangeListener = function () {
	            self.debouncedForceUpdate(750);
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
	        if (!chatRoom || !chatRoom.chatId) {
	            return null;
	        }

	        var roomId = chatRoom.chatId;

	        if (chatRoom.isCurrentlyActive) {
	            classString += " active";
	        }

	        var nameClassString = "user-card-name conversation-name";
	        var archivedDiv = "";
	        if (chatRoom.isArchived()) {
	            archivedDiv = React.makeElement(
	                "div",
	                { className: "archived-badge" },
	                __(l[19067])
	            );
	        }

	        var contactId;
	        var presenceClass;
	        var id;

	        if (chatRoom.type === "private") {
	            var contact = M.u[chatRoom.getParticipantsExceptMe()[0]];

	            if (!contact) {
	                return null;
	            }
	            id = 'conversation_' + htmlentities(contact.u);

	            presenceClass = chatRoom.megaChat.userPresenceToCssClass(contact.presence);
	        } else if (chatRoom.type === "group") {
	            contactId = roomId;
	            id = 'conversation_' + contactId;
	            presenceClass = 'group';
	            classString += ' groupchat';
	        } else {
	            return "unknown room type: " + chatRoom.roomId;
	        }

	        if (ChatdIntegration._loadingChats[chatRoom.roomId] && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise.state() === 'pending' || chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.joined === false || chatRoom.messagesBuff.joined === true && chatRoom.messagesBuff.haveMessages === true && chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.isDecrypting && chatRoom.messagesBuff.isDecrypting.state() === 'pending') {
	            this.loadingShown = true;
	        } else {
	            delete this.loadingShown;
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
	            var renderableSummary = renderMessageSummary(lastMessage);
	            lastMessage.renderableSummary = renderableSummary;

	            lastMessageDiv = React.makeElement("div", { className: lastMsgDivClasses, dangerouslySetInnerHTML: { __html: renderableSummary } });

	            var timestamp = lastMessage.delay;
	            var curTimeMarker;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
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

	            var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];

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

	        if (chatRoom.callManagerCall && chatRoom.callManagerCall.isActive() === true) {
	            var mediaOptions = chatRoom.callManagerCall.getMediaOptions();

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
	                    { className: "call-counter", "data-room-id": chatRoom.chatId },
	                    secondsToTimeShort(chatRoom._currentCallCounter)
	                )
	            );

	            classString += " call-active";

	            archivedDiv = "";
	        }

	        return React.makeElement(
	            "li",
	            { className: classString, id: id, "data-room-id": roomId, "data-jid": contactId,
	                onClick: this.props.onConversationClicked },
	            React.makeElement(
	                "div",
	                { className: nameClassString },
	                React.makeElement(
	                    utils.EmojiFormattedContent,
	                    null,
	                    chatRoom.getRoomTitle()
	                ),
	                chatRoom.type === "private" ? React.makeElement("span", { className: "user-card-presence " + presenceClass }) : undefined
	            ),
	            archivedDiv,
	            unreadDiv,
	            inCallDiv,
	            lastMessageDiv,
	            lastMessageDatetimeDiv
	        );
	    }
	});

	var ArchivedConversationsListItem = React.createClass({
	    displayName: "ArchivedConversationsListItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var classString = "arc-chat-list ui-droppable ui-draggable ui-draggable-handle";

	        var megaChat = this.props.chatRoom.megaChat;

	        var chatRoom = this.props.chatRoom;
	        if (!chatRoom || !chatRoom.chatId) {
	            return null;
	        }

	        var roomId = chatRoom.chatId;

	        if (chatRoom.archivedSelected === true) {
	            classString += " ui-selected";
	        }

	        var contactId;
	        var presenceClass;
	        var id;

	        if (chatRoom.type === "private") {
	            var contact = M.u[chatRoom.getParticipantsExceptMe()[0]];

	            if (!contact) {
	                return null;
	            }
	            id = 'conversation_' + htmlentities(contact.u);

	            presenceClass = chatRoom.megaChat.userPresenceToCssClass(contact.presence);
	        } else if (chatRoom.type === "group") {
	            contactId = roomId;
	            id = 'conversation_' + contactId;
	            presenceClass = 'group';
	            classString += ' groupchat';
	        } else {
	            return "unknown room type: " + chatRoom.roomId;
	        }

	        var lastMessageDiv = null;
	        var lastMessageDatetimeDiv = null;
	        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
	        if (lastMessage) {
	            var lastMsgDivClasses = "conversation-message";
	            var renderableSummary = renderMessageSummary(lastMessage);
	            lastMessage.renderableSummary = renderableSummary;

	            lastMessageDiv = React.makeElement("div", { className: lastMsgDivClasses, dangerouslySetInnerHTML: { __html: renderableSummary } });

	            var timestamp = lastMessage.delay;
	            var curTimeMarker;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
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

	            var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];

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

	        return React.makeElement(
	            "tr",
	            { className: classString, id: id, "data-room-id": roomId, "data-jid": contactId,
	                onClick: this.props.onConversationSelected, onDoubleClick: this.props.onConversationClicked },
	            React.makeElement(
	                "td",
	                { className: "" },
	                React.makeElement(
	                    "div",
	                    { className: "fm-chat-user-info todo-star" },
	                    React.makeElement(
	                        "div",
	                        { className: "user-card-name conversation-name" },
	                        React.makeElement(
	                            utils.EmojiFormattedContent,
	                            null,
	                            chatRoom.getRoomTitle()
	                        )
	                    ),
	                    lastMessageDiv,
	                    lastMessageDatetimeDiv
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "archived-badge" },
	                    __(l[19067])
	                )
	            ),
	            React.makeElement(
	                "td",
	                { width: "330" },
	                React.makeElement(
	                    "div",
	                    { className: "archived-on" },
	                    React.makeElement(
	                        "div",
	                        { className: "archived-date-time" },
	                        lastMessageDatetimeDiv
	                    ),
	                    React.makeElement("div", { className: "clear" })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button default-white-button semi-big unarchive-chat right",
	                        onClick: this.props.onUnarchiveConversationClicked },
	                    React.makeElement(
	                        "span",
	                        null,
	                        __(l[19065])
	                    )
	                )
	            )
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
	                currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.userPresenceToCssClass(user.presence);
	                currentCallingContactStatusProps['data-jid'] = room.roomId;

	                if (room.roomId == megaChat.currentlyOpenedChat) {
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

	        sortedConversations.sort(M.sortObjFn("lastActivity", -1));
	        sortedConversations.forEach(function (chatRoom) {
	            var contact;
	            if (!chatRoom || !chatRoom.roomId) {
	                return;
	            }
	            if (!chatRoom.isDisplayable()) {
	                return;
	            }
	            if (chatRoom.type === "private") {
	                contact = chatRoom.getParticipantsExceptMe()[0];
	                if (!contact) {
	                    return;
	                }
	                contact = M.u[contact];

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
	                key: chatRoom.roomId,
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

	var ArchivedConversationsList = React.createClass({
	    displayName: "ArchivedConversationsList",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getInitialState: function getInitialState() {
	        return {
	            'items': this.props.chats,
	            'orderby': 'lastActivity',
	            'nameorder': 1,
	            'timeorder': -1,
	            'confirmUnarchiveChat': null,
	            'confirmUnarchiveDialogShown': false
	        };
	    },
	    conversationClicked: function conversationClicked(room, e) {
	        room.showArchived = true;
	        loadSubPage(room.getRoomUrl());
	        e.stopPropagation();
	    },
	    conversationSelected: function conversationSelected(room, e) {
	        var self = this;
	        var previousState = room.archivedSelected ? room.archivedSelected : false;
	        var sortedConversations = obj_values(this.props.chats.toJS());
	        sortedConversations.forEach(function (chatRoom) {
	            if (!chatRoom || !chatRoom.roomId) {
	                return;
	            }
	            if (!chatRoom.isArchived()) {
	                return;
	            }
	            if (chatRoom.chatId !== room.chatId) {
	                chatRoom.archivedSelected = false;
	            } else {
	                chatRoom.archivedSelected = !chatRoom.archivedSelected;
	            }
	        });
	        room.archivedSelected = !previousState;
	        self.setState({
	            'items': sortedConversations
	        });
	        e.stopPropagation();
	    },
	    unarchiveConversationClicked: function unarchiveConversationClicked(room, e) {
	        var self = this;
	        self.setState({
	            'confirmUnarchiveDialogShown': true,
	            'confirmUnarchiveChat': room.roomId
	        });
	    },
	    onSortNameClicked: function onSortNameClicked(e) {
	        this.setState({
	            'orderby': 'name'
	        });
	        this.setState({
	            'nameorder': this.state.nameorder * -1
	        });
	    },
	    onSortTimeClicked: function onSortTimeClicked(e) {
	        this.setState({
	            'orderby': 'lastActivity'
	        });
	        this.setState({
	            'timeorder': this.state.timeorder * -1
	        });
	    },
	    render: function render() {
	        var self = this;

	        var currentCallingContactStatusProps = {
	            'className': "nw-conversations-item current-calling",
	            'data-jid': ''
	        };

	        var megaChat = this.props.megaChat;

	        var currConvsList = [];

	        var sortedConversations = obj_values(this.props.chats.toJS());
	        var orderValue = -1;
	        var orderKey = "lastActivity";

	        var nameOrderClass = "";
	        var timerOrderClass = "";
	        if (self.state.orderby === "name") {
	            orderKey = getRoomName;
	            orderValue = self.state.nameorder;
	            nameOrderClass = self.state.nameorder === 1 ? "desc" : "asc";
	        } else {
	            orderKey = "lastActivity";
	            orderValue = self.state.timeorder;
	            timerOrderClass = self.state.timeorder === 1 ? "desc" : "asc";
	        }

	        sortedConversations.sort(M.sortObjFn(orderKey, orderValue));
	        sortedConversations.forEach(function (chatRoom) {
	            var contact;
	            if (!chatRoom || !chatRoom.roomId) {
	                return;
	            }
	            if (!chatRoom.isArchived()) {
	                return;
	            }

	            if (chatRoom.type === "private") {
	                contact = chatRoom.getParticipantsExceptMe()[0];
	                if (!contact) {
	                    return;
	                }
	                contact = M.u[contact];

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

	            currConvsList.push(React.makeElement(ArchivedConversationsListItem, {
	                key: chatRoom.roomId,
	                chatRoom: chatRoom,
	                contact: contact,
	                messages: chatRoom.messagesBuff,
	                megaChat: megaChat,
	                onConversationClicked: function onConversationClicked(e) {
	                    self.conversationClicked(chatRoom, e);
	                },
	                onConversationSelected: function onConversationSelected(e) {
	                    self.conversationSelected(chatRoom, e);
	                },
	                onUnarchiveConversationClicked: function onUnarchiveConversationClicked(e) {
	                    self.unarchiveConversationClicked(chatRoom, e);
	                } }));
	        });

	        var confirmUnarchiveDialog = null;
	        if (self.state.confirmUnarchiveDialogShown === true) {
	            var room = this.props.chats[self.state.confirmUnarchiveChat];
	            if (room) {
	                confirmUnarchiveDialog = React.makeElement(
	                    ModalDialogsUI.ConfirmDialog,
	                    {
	                        megaChat: room.megaChat,
	                        chatRoom: room,
	                        title: __(l[19063]),
	                        name: "unarchive-conversation",
	                        onClose: function onClose() {
	                            self.setState({ 'confirmUnarchiveDialogShown': false });
	                        },
	                        onConfirmClicked: function onConfirmClicked() {
	                            room.unarchive();
	                            self.setState({ 'confirmUnarchiveDialogShown': false });
	                        }
	                    },
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-content" },
	                        React.makeElement(
	                            "div",
	                            { className: "dialog secondary-header" },
	                            __(l[19064])
	                        )
	                    )
	                );
	            }
	        }
	        return React.makeElement(
	            "div",
	            { className: "chat-content-block archived-chats" },
	            React.makeElement(
	                "div",
	                { className: "files-grid-view archived-chat-view" },
	                React.makeElement(
	                    "table",
	                    { className: "grid-table-header", width: "100%", cellSpacing: "0", cellPadding: "0", border: "0" },
	                    React.makeElement(
	                        "tbody",
	                        null,
	                        React.makeElement(
	                            "tr",
	                            null,
	                            React.makeElement(
	                                "th",
	                                { className: "calculated-width", onClick: self.onSortNameClicked },
	                                React.makeElement(
	                                    "div",
	                                    { className: "arrow name " + nameOrderClass },
	                                    __(l[86])
	                                )
	                            ),
	                            React.makeElement(
	                                "th",
	                                { width: "330", onClick: self.onSortTimeClicked },
	                                React.makeElement(
	                                    "div",
	                                    { className: "arrow interaction " + timerOrderClass },
	                                    __(l[5904])
	                                )
	                            )
	                        )
	                    )
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "grid-scrolling-table archive-chat-list" },
	                    React.makeElement(
	                        "table",
	                        { className: "grid-table arc-chat-messages-block" },
	                        React.makeElement(
	                            "tbody",
	                            null,
	                            currConvsList
	                        )
	                    )
	                )
	            ),
	            confirmUnarchiveDialog
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
	            megaChat.createAndShowPrivateRoomFor(selected[0]).then(function (room) {
	                room.setActive();
	            });
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

	                if (megaChat.currentlyOpenedChat && megaChat.getCurrentRoom().isReadOnly() || $(e.target).is(".messages-textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $('.fm-dialog:visible,.dropdown:visible').length > 0 || $('input:focus,textarea:focus,select:focus').length > 0) {
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

	            if (e.megaChatHandled || slideshowid) {
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
	        this.initArchivedChatsScrolling();
	    },
	    handleWindowResize: function handleWindowResize() {

	        $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
	            'margin-left': $('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width() + "px"
	        });
	    },
	    initArchivedChatsScrolling: function initArchivedChatsScrolling() {
	        var scroll = '.archive-chat-list';
	        deleteScrollPanel(scroll, 'jsp');
	        $(scroll).jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 5 });
	        jScrollFade(scroll);
	    },
	    archiveChatsClicked: function archiveChatsClicked() {
	        loadSubPage('fm/chat/archived');
	    },
	    calcArchiveChats: function calcArchiveChats() {
	        var conversations = obj_values(this.props.megaChat.chats.toJS());
	        var count = 0;
	        conversations.forEach(function (chatRoom) {
	            if (!chatRoom || !chatRoom.roomId) {
	                return;
	            }
	            if (chatRoom.isArchived()) {
	                count++;
	            }
	        });
	        return count;
	    },
	    render: function render() {
	        var self = this;

	        var presence = self.props.megaChat.getMyPresence();

	        var leftPanelStyles = {};

	        if (self.state.leftPaneWidth) {
	            leftPanelStyles.width = self.state.leftPaneWidth;
	        }

	        var loadingOrEmpty = null;
	        var megaChat = this.props.megaChat;

	        if (megaChat.chats.length === 0) {
	            loadingOrEmpty = React.makeElement(
	                "div",
	                { className: "fm-empty-messages hidden" },
	                React.makeElement(
	                    "div",
	                    { className: "fm-empty-pad" },
	                    React.makeElement("div", { className: "fm-empty-messages-bg" }),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-empty-cloud-txt" },
	                        l[6870]
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
	            );
	        } else if (megaChat.allChatsHadLoadedHistory() === false && !megaChat.currentlyOpenedChat && megaChat.displayArchivedChats !== true) {
	            loadingOrEmpty = React.makeElement(
	                "div",
	                { className: "fm-empty-messages" },
	                React.makeElement(
	                    "div",
	                    { className: "loading-spinner js-messages-loading light manual-management", style: { "top": "50%" } },
	                    React.makeElement("div", { className: "main-loader", style: {
	                            "position": "fixed",
	                            "top": "50%",
	                            "left": "50%",
	                            "marginLeft": "72px"
	                        } })
	                )
	            );
	        }

	        var rightPane = null;

	        rightPane = React.makeElement(
	            "div",
	            { className: "fm-right-files-block" },
	            loadingOrEmpty,
	            megaChat.displayArchivedChats === true ? React.makeElement(ArchivedConversationsList, { chats: this.props.megaChat.chats, megaChat: this.props.megaChat,
	                contacts: this.props.contacts, key: "archivedchats" }) : null,
	            React.makeElement(ConversationPanelUI.ConversationPanels, _extends({}, this.props, {
	                className: megaChat.displayArchivedChats === true ? "hidden" : "",
	                conversations: this.props.megaChat.chats
	            }))
	        );
	        var archivedChatsCount = this.calcArchiveChats();
	        var arcBtnClass = megaChat.displayArchivedChats === true ? "arc-conversation-btn-block active" : "arc-conversation-btn-block";
	        var arcIconClass = megaChat.displayArchivedChats === true ? "small-icon archive white" : "small-icon archive";
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
	                        { style: leftPanelStyles, className: "conversation-reduce-height" },
	                        React.makeElement(
	                            "div",
	                            { className: "content-panel conversations" + (getSitePath().indexOf("/chat") !== -1 ? " active" : "") },
	                            React.makeElement(ConversationsList, { chats: this.props.megaChat.chats, megaChat: this.props.megaChat,
	                                contacts: this.props.contacts })
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: arcBtnClass, onClick: this.archiveChatsClicked },
	                        React.makeElement(
	                            "div",
	                            { className: "arc-conversation-icon" },
	                            React.makeElement("i", { className: arcIconClass })
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "arc-conversation-heading" },
	                            __(l[19066])
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "arc-conversation-number" },
	                            archivedChatsCount
	                        )
	                    )
	                )
	            ),
	            rightPane
	        );
	    }
	});

	module.exports = {
	    ConversationsList: ConversationsList,
	    ArchivedConversationsList: ArchivedConversationsList,
	    ConversationsApp: ConversationsApp
	};

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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

	var EmojiFormattedContent = React.createClass({
	    displayName: "EmojiFormattedContent",

	    _eventuallyUpdateInternalState: function _eventuallyUpdateInternalState(props) {
	        if (!props) {
	            props = this.props;
	        }

	        assert(typeof props.children === "string", "EmojiFormattedContent received a non-string (got: " + _typeof(props.children) + ") as props.children");

	        var str = props.children;
	        if (this._content !== str) {
	            this._content = str;
	            this._formattedContent = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(str));
	        }
	    },
	    shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
	        if (!this._isMounted) {
	            this._eventuallyUpdateInternalState();
	            return true;
	        }

	        if (nextProps && nextProps.children !== this.props.children) {
	            this._eventuallyUpdateInternalState(nextProps);
	            return true;
	        } else {
	            return false;
	        }
	    },
	    render: function render() {
	        this._eventuallyUpdateInternalState();

	        return React.makeElement("span", { dangerouslySetInnerHTML: { __html: this._formattedContent } });
	    }
	});

	module.exports = {
	    JScrollPane: JScrollPane,
	    RenderTo: RenderTo,
	    EmojiFormattedContent: EmojiFormattedContent
	};

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

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

	var MAX_ALLOWED_DEBOUNCED_UPDATES = 5;
	var DEBOUNCED_UPDATE_TIMEOUT = 60;
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
	    debouncedForceUpdate: function(timeout) {
	        var self = this;
	        if (typeof(self.skippedUpdates) === 'undefined') {
	            self.skippedUpdates = 0;
	        }

	        if (self.debounceTimer) {
	            clearTimeout(self.debounceTimer);
	            // console.error(self.getUniqueId(), self.skippedUpdates + 1);
	            self.skippedUpdates++;
	        }
	        var TIMEOUT_VAL = timeout || DEBOUNCED_UPDATE_TIMEOUT;

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
	            return false;
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
	            clearTimeout(self._updatesReenableTimer);
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

	        if (!this.props.disableCheckingVisibility && !this.isComponentEventuallyVisible()) {
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


/***/ }),
/* 7 */
/***/ (function(module, exports) {

	'use strict';

	var getMessageString;
	(function () {
	    var MESSAGE_STRINGS;
	    getMessageString = function getMessageString(type) {
	        if (!MESSAGE_STRINGS) {
	            MESSAGE_STRINGS = {
	                'outgoing-call': l[5891],
	                'incoming-call': l[5893],
	                'call-timeout': [[l[18698]]],
	                'call-starting': l[7206],
	                'call-feedback': l[7998],
	                'call-initialising': l[7207],
	                'call-ended': [[l[18689], l[5889]], l[7208]],
	                'remoteCallEnded': [[l[18689], l[5889]], l[7208]],
	                'call-failed-media': l[7204],
	                'call-failed': [[l[18690], l[7209]], l[7208]],
	                'call-handled-elsewhere': l[5895],
	                'call-missed': l[7210],
	                'call-rejected': [[l[18691], l[5892]]],
	                'call-canceled': [[l[18692], l[5894]]],
	                'call-started': l[5888],
	                'alterParticipants': undefined,
	                'privilegeChange': l[8915],
	                'truncated': l[8905]

	            };
	        }
	        return MESSAGE_STRINGS[type];
	    };
	})();

	mega.ui.chat.getMessageString = getMessageString;

	module.exports = {
	    getMessageString: getMessageString
	};

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

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

	        var options = $.extend({}, {
	            'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection']
	        }, self.props.options);

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
	    getScrollWidth: function getScrollWidth() {
	        var $elem = $(this.findDOMNode());
	        var outerWidthContainer = $elem.children(":first").outerWidth();
	        var outerWidthScrollable = $elem.outerWidth();

	        var res = outerWidthContainer - outerWidthScrollable;

	        if (res <= 0) {

	            return this._lastKnownScrollWidth ? this._lastKnownScrollWidth : 0;
	        }
	        this._lastKnownScrollWidth = res;
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
	        var targetPx = this.getScrollHeight() / 100 * posPerc;
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
	    scrollToPercentX: function scrollToPercentX(posPerc, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        var targetPx = this.getScrollWidth() / 100 * posPerc;
	        if ($elem[0].scrollLeft !== targetPx) {
	            $elem[0].scrollLeft = targetPx;
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
	    disable: function disable() {
	        if (this.isMounted()) {
	            var $elem = $(this.findDOMNode());
	            $elem.attr('data-scroll-disabled', true);
	            $elem.addClass('ps-disabled');
	            Ps.disable($elem[0]);
	        }
	    },
	    enable: function enable() {
	        if (this.isMounted()) {
	            var $elem = $(this.findDOMNode());
	            $elem.removeAttr('data-scroll-disabled');
	            $elem.removeClass('ps-disabled');
	            Ps.enable($elem[0]);
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

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

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

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ContactsUI = __webpack_require__(11);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

	var Dropdown = React.createClass({
	    displayName: "Dropdown",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {};
	    },
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true
	        };
	    },
	    componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            this.onActiveChange(nextProps.active);
	        }
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate(nextProps, nextState) {
	        if (this.props.active != nextProps.active) {
	            if (this.props.onBeforeActiveChange) {
	                this.props.onBeforeActiveChange(nextProps.active);
	            }
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
	    onResized: function onResized() {
	        var self = this;

	        if (this.props.active === true) {
	            if (this.getOwnerElement()) {
	                var $element = $(this.popupElement);
	                var positionToElement = $('.button.active:visible');
	                var offsetLeft = 0;
	                var $container = positionToElement.closest('.messages.scroll-area');

	                if ($container.size() == 0) {
	                    $container = $(document.body);
	                }

	                $element.css('margin-left', '');

	                $element.position({
	                    of: positionToElement,
	                    my: self.props.positionMy ? self.props.positionMy : "center top",
	                    at: self.props.positionAt ? self.props.positionAt : "center bottom",
	                    collision: "flipfit",
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
	    componentDidMount: function componentDidMount() {
	        this.onResized();
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.onResized();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        if (this.props.active) {

	            this.onActiveChange(false);
	        }
	    },
	    doRerender: function doRerender() {
	        var self = this;

	        setTimeout(function () {
	            self.safeForceUpdate();
	        }, 100);

	        setTimeout(function () {
	            self.onResized();
	        }, 200);
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
	        if (this.props.active !== true) {
	            return null;
	        } else {
	            var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;

	            var styles;

	            if (this.getOwnerElement()) {
	                styles = {
	                    'zIndex': 123,
	                    'position': 'absolute',
	                    'width': this.props.styles ? this.props.styles.width : undefined
	                };
	            }

	            var self = this;

	            var child = null;

	            if (this.props.children) {
	                child = React.makeElement(
	                    "div",
	                    null,
	                    self.renderChildren()
	                );
	            } else if (this.props.dropdownItemGenerator) {
	                child = this.props.dropdownItemGenerator(this);
	            }

	            if (!child && !this.props.forceShowWhenEmpty) {
	                if (this.props.active !== false) {
	                    (window.setImmediate || window.setTimeout)(function () {
	                        self.onActiveChange(false);
	                    });
	                }
	                return null;
	            }

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
	                    child
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
	            { className: "popup contacts-search " + this.props.className + " tooltip-blur",
	                active: this.props.active,
	                closeDropdown: this.props.closeDropdown,
	                ref: "dropdown",
	                positionMy: this.props.positionMy,
	                positionAt: this.props.positionAt
	            },
	            React.makeElement(ContactsUI.ContactPickerWidget, {
	                active: this.props.active,
	                className: "popup contacts-search tooltip-blur",
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
	    onMouseOver: function onMouseOver(e) {
	        var self = this;

	        if (this.props.className === "contains-submenu") {
	            var $contextItem = $(e.target).closest(".contains-submenu");
	            var $subMenu = $contextItem.next('.submenu');
	            var contextTopPos = $contextItem.position().top;
	            var contextleftPos = 0;

	            $contextItem.addClass("opened");
	            $subMenu.addClass("active");

	            contextleftPos = $contextItem.offset().left + $contextItem.outerWidth() + $subMenu.outerWidth() + 10;

	            if (contextleftPos > $(document.body).width()) {
	                $subMenu.addClass("left-position");
	            }

	            $subMenu.css({
	                "top": contextTopPos
	            });
	        } else if (!$(e.target).parent('.submenu').length) {
	            var $dropdown = $(e.target).closest(".dropdown.body");
	            $dropdown.find(".contains-submenu").removeClass("opened");
	            $dropdown.find(".submenu").removeClass("active");
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
	                    !self.props.disabled && self.props.onClick(e);
	                } : self.onClick,
	                onMouseOver: self.onMouseOver
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

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var utils = __webpack_require__(5);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

	var ContactsListItem = React.createClass({
	    displayName: "ContactsListItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var classString = "nw-conversations-item";

	        var contact = this.props.contact;

	        if (!contact) {
	            return null;
	        }

	        classString += " " + this.props.megaChat.userPresenceToCssClass(contact.presence);

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

	var ContactButton = React.createClass({
	    displayName: "ContactButton",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;

	        var label = self.props.label ? self.props.label : "";
	        var classes = self.props.className ? self.props.className : "";
	        var contact = self.props.contact;
	        var dropdowns = self.props.dropdowns ? self.props.dropdowns : [];
	        var icon = self.props.dropdownIconClasses ? self.props.dropdownIconClasses : [];
	        var dropdownPosition = "left top";
	        var vertOffset = 0;
	        var horizOffset = -30;
	        var megaChat = self.props.megaChat ? self.props.megaChat : window.megaChat;

	        if (label) {
	            classes = "user-card-name " + classes;
	            icon = "";
	            dropdownPosition = "left bottom";
	            vertOffset = 25;
	            horizOffset = 0;
	        }

	        if (!contact) {
	            return null;
	        }

	        var username = M.getNameByHandle(contact.u);

	        var buttonComponent = null;
	        if (!self.props.noContextMenu) {
	            var ButtonsUI = __webpack_require__(9);
	            var DropdownsUI = __webpack_require__(10);

	            var moreDropdowns = [];

	            moreDropdowns.push(React.makeElement(
	                "div",
	                { className: "dropdown-avatar rounded", key: "mainContactInfo" },
	                React.makeElement(Avatar, { className: "avatar-wrapper context-avatar",
	                    contact: contact, hideVerifiedBadge: "true", onClick: function onClick() {
	                        if (contact.c === 2) {
	                            loadSubPage('fm/account');
	                        }
	                        if (contact.c === 1) {
	                            loadSubPage('fm/' + contact.u);
	                        }
	                    } }),
	                React.makeElement(
	                    "div",
	                    { className: "dropdown-user-name" },
	                    username,
	                    React.makeElement(ContactPresence, { className: "small", contact: contact })
	                )
	            ));

	            moreDropdowns.push(React.makeElement(ContactFingerprint, { key: "fingerprint", contact: contact }));

	            if (dropdowns.length && contact.c !== 2) {
	                moreDropdowns.push(dropdowns);

	                moreDropdowns.push(React.makeElement("hr", { key: "top-separator" }));
	            }

	            if (contact.c === 2) {
	                moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "view0", icon: "human-profile", label: __(l[187]), onClick: function onClick() {
	                        loadSubPage('fm/account');
	                    } }));
	            }
	            if (contact.c === 1) {

	                if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
	                    moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                        key: "startCall", className: "contains-submenu", icon: "context handset", label: __(l[19125]), onClick: function onClick() {

	                            megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
	                                room.setActive();
	                                room.startAudioCall();
	                            });
	                        } }));
	                    moreDropdowns.push(React.makeElement(
	                        "div",
	                        { className: "dropdown body submenu", key: "dropdownGroup" },
	                        React.makeElement(
	                            "div",
	                            null,
	                            React.makeElement(DropdownsUI.DropdownItem, {
	                                key: "startAudio", icon: "context handset", label: __(l[1565]), onClick: function onClick() {
	                                    megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
	                                        room.setActive();
	                                        room.startAudioCall();
	                                    });
	                                } })
	                        ),
	                        React.makeElement(
	                            "div",
	                            null,
	                            React.makeElement(DropdownsUI.DropdownItem, {
	                                key: "startVideo", icon: "context videocam", label: __(l[1566]), onClick: function onClick() {
	                                    megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
	                                        room.setActive();
	                                        room.startVideoCall();
	                                    });
	                                } })
	                        )
	                    ));
	                } else {
	                    moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                        key: "startChat", icon: "context conversation", label: __(l[5885]), onClick: function onClick() {
	                            loadSubPage('fm/chat/' + contact.u);
	                        } }));
	                }

	                moreDropdowns.push(React.makeElement("hr", { key: "files-separator" }));

	                moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "send-files-item", icon: "context arrow-in-circle", label: __(l[6834]), onClick: function onClick() {
	                        megaChat.openChatAndSendFilesDialog(contact.u);
	                    } }));
	                moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "share-item", icon: "context share-folder", label: __(l[6775]), onClick: function onClick() {
	                        openCopyShareDialog(contact.u);
	                    } }));
	            } else if (contact.c === 0) {
	                moreDropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                    key: "view2", icon: "small-icon icons-sprite grey-plus", label: __(l[101]), onClick: function onClick() {
	                        loadingDialog.show();

	                        M.syncContactEmail(contact.u).done(function (email) {
	                            var exists = false;
	                            Object.keys(M.opc).forEach(function (k) {
	                                if (!exists && M.opc[k].m === email) {
	                                    exists = true;
	                                    return false;
	                                }
	                            });

	                            if (exists) {
	                                closeDialog();
	                                msgDialog('warningb', '', l[7413]);
	                            } else {
	                                M.inviteContact(M.u[u_handle].m, email);
	                                var title = l[150];

	                                var msg = l[5898].replace('[X]', email);

	                                closeDialog();
	                                msgDialog('info', title, msg);
	                            }
	                        }).always(function () {
	                            loadingDialog.hide();
	                        });
	                    } }));
	            }

	            if (self.props.dropdownRemoveButton && self.props.dropdownRemoveButton.length) {
	                moreDropdowns.push(React.makeElement("hr", { key: "remove-separator" }));
	                moreDropdowns.push(self.props.dropdownRemoveButton);
	            }

	            if (moreDropdowns.length > 0) {
	                buttonComponent = React.makeElement(
	                    ButtonsUI.Button,
	                    {
	                        className: classes,
	                        icon: icon,
	                        disabled: moreDropdowns.length === 0 || self.props.dropdownDisabled,
	                        label: label
	                    },
	                    React.makeElement(
	                        DropdownsUI.Dropdown,
	                        { className: "contact-card-dropdown",
	                            positionMy: dropdownPosition,
	                            positionAt: dropdownPosition,
	                            vertOffset: vertOffset,
	                            horizOffset: horizOffset,
	                            noArrow: true
	                        },
	                        moreDropdowns
	                    )
	                );
	            }
	        }

	        return buttonComponent;
	    }
	});

	var ContactVerified = React.createClass({
	    displayName: "ContactVerified",

	    mixins: [MegaRenderMixin],
	    componentWillMount: function componentWillMount() {
	        var self = this;

	        var contact = this.props.contact;
	        if (contact && contact.addChangeListener) {
	            self._contactListener = contact.addChangeListener(function () {
	                self.safeForceUpdate();
	            });
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;

	        var contact = this.props.contact;
	        if (contact && self._contactListener) {
	            contact.removeChangeListener(self._contactListener);
	        }
	    },
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

	        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).userPresenceToCssClass(contact.presence);

	        return React.makeElement("div", { className: "user-card-presence " + pres + " " + this.props.className });
	    }
	});

	var ContactFingerprint = React.createClass({
	    displayName: "ContactFingerprint",

	    mixins: [MegaRenderMixin],
	    render: function render() {
	        var self = this;
	        var contact = this.props.contact;
	        if (!contact || !contact.u) {
	            return null;
	        }

	        var infoBlocks = [];

	        userFingerprint(contact.u, function (fingerprints) {
	            fingerprints.forEach(function (v, k) {
	                infoBlocks.push(React.makeElement(
	                    "span",
	                    { key: "fingerprint-" + k },
	                    v
	                ));
	            });
	        });

	        var verifyButton = null;

	        if (contact.c === 1 && u_authring && u_authring.Ed25519) {
	            var verifyState = u_authring.Ed25519[contact.u] || {};
	            if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
	                verifyButton = React.makeElement(ButtonsUI.Button, {
	                    className: "dropdown-verify active",
	                    label: __(l[7692]),
	                    icon: "grey-key",
	                    onClick: function onClick() {
	                        $(document).trigger('closeDropdowns');

	                        fingerprintDialog(contact.u);
	                    } });
	            }
	        }

	        var fingerprintCode;
	        if (infoBlocks.length > 0) {
	            fingerprintCode = React.makeElement(
	                "div",
	                { className: "dropdown-fingerprint" },
	                React.makeElement(
	                    "div",
	                    { className: "contact-fingerprint-title" },
	                    React.makeElement(
	                        "span",
	                        null,
	                        __(l[6872])
	                    ),
	                    React.makeElement(ContactVerified, { contact: contact })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "contact-fingerprint-txt" },
	                    infoBlocks
	                ),
	                verifyButton
	            );
	        }

	        return fingerprintCode;
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

	        var classes = (this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar') + ' ' + contact.u;

	        classes += " chat-avatar";

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
	                { className: classes, style: this.props.style,
	                    onClick: self.props.onClick ? function (e) {
	                        $(document).trigger('closeDropdowns');
	                        self.props.onClick(e);
	                    } : self.onClick },
	                verifiedElement,
	                React.makeElement("img", { src: avatarMeta.avatar, style: this.props.imgStyles })
	            );
	        } else {
	            classes += " color" + avatarMeta.avatar.colorIndex;

	            displayedAvatar = React.makeElement(
	                "div",
	                { className: classes, style: this.props.style,
	                    onClick: self.props.onClick ? function (e) {
	                        $(document).trigger('closeDropdowns');
	                        self.props.onClick(e);
	                    } : self.onClick },
	                verifiedElement,
	                avatarMeta.avatar.letters
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
	            'dropdownIconClasses': "tiny-icon icons-sprite grey-dots"
	        };
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate(nextProps, nextState) {
	        var self = this;

	        var foundKeys = Object.keys(self.props);
	        if (foundKeys.indexOf('dropdowns') >= 0) {
	            array.remove(foundKeys, 'dropdowns', true);
	        }
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

	        var pres = (this.props.megaChat ? this.props.megaChat : window.megaChat).userPresenceToCssClass(contact.presence);
	        var avatarMeta = generateAvatarMeta(contact.u);
	        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);
	        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
	        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
	        var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];

	        var usernameBlock;
	        if (!noContextMenu) {
	            usernameBlock = React.makeElement(ContactButton, { key: "lnk", dropdowns: dropdowns,
	                noContextMenu: noContextMenu,
	                contact: contact,
	                className: "light",
	                label: username,
	                dropdownRemoveButton: dropdownRemoveButton
	            });
	        } else {
	            usernameBlock = React.makeElement(
	                "div",
	                { className: "user-card-name light" },
	                username
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
	                },
	                onDoubleClick: function onDoubleClick(e) {
	                    if (self.props.onDoubleClick) {
	                        self.props.onDoubleClick(contact, e);
	                    }
	                },
	                style: self.props.style
	            },
	            React.makeElement(Avatar, { contact: contact, className: "avatar-wrapper small-rounded-avatar" }),
	            React.makeElement(ContactButton, { key: "button",
	                dropdowns: dropdowns,
	                dropdownIconClasses: self.props.dropdownIconClasses ? self.props.dropdownIconClasses : "",
	                disabled: self.props.dropdownDisabled,
	                noContextMenu: noContextMenu,
	                contact: contact,
	                className: self.props.dropdownButtonClasses,
	                dropdownRemoveButton: dropdownRemoveButton,
	                megaChat: self.props.megaChat ? this.props.megaChat : window.megaChat
	            }),
	            React.makeElement(
	                "div",
	                { className: "user-card-data" },
	                usernameBlock,
	                React.makeElement(ContactPresence, { contact: contact, className: this.props.presenceClassName }),
	                React.makeElement(
	                    "div",
	                    { className: "user-card-email" },
	                    contact.m
	                )
	            )
	        );
	    }
	});

	var ContactItem = React.createClass({
	    displayName: "ContactItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var classString = "nw-conversations-item";
	        var self = this;
	        var contact = this.props.contact;

	        if (!contact) {
	            return null;
	        }

	        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

	        return React.makeElement(
	            "div",
	            { className: "selected-contact-card" },
	            React.makeElement(
	                "div",
	                { className: "remove-contact-bttn", onClick: function onClick(e) {
	                        if (self.props.onClick) {
	                            self.props.onClick(contact, e);
	                        }
	                    } },
	                React.makeElement("div", { className: "remove-contact-icon" })
	            ),
	            React.makeElement(Avatar, { contact: contact, className: "avatar-wrapper small-rounded-avatar" }),
	            React.makeElement(
	                "div",
	                { className: "user-card-data" },
	                React.makeElement(ContactButton, { contact: contact, className: "light", label: username })
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
	    componentDidUpdate: function componentDidUpdate() {

	        var self = this;
	        if (self.scrollToLastSelected && self.jspSelected) {

	            self.scrollToLastSelected = false;
	            var $jsp = $(self.jspSelected.findDOMNode()).data('jsp');
	            if ($jsp) {
	                $jsp.scrollToPercentX(1, false);
	            }
	        }
	    },
	    render: function render() {
	        var self = this;

	        var contacts = [];

	        var contactsSelected = [];

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
	            var clearSearch = function clearSearch(e) {
	                self.setState({ searchValue: '' });
	                self.refs.contactSearchField.focus();
	            };
	            var onAddContact = function onAddContact(e) {

	                e.preventDefault();
	                e.stopPropagation();

	                contactAddDialog();
	            };
	            var onContactSelectDoneCb = function onContactSelectDoneCb(contact, e) {

	                var contactHash = contact.u;

	                if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {

	                    if (self.props.onSelected) {
	                        self.props.onSelected([contactHash]);
	                    }
	                    self.props.onSelectDone([contactHash]);
	                    return;
	                } else {
	                    var selected = clone(self.state.selected || []);

	                    if (selected.indexOf(contactHash) === -1) {
	                        selected.push(contactHash);

	                        self.scrollToLastSelected = true;

	                        if (self.props.onSelected) {
	                            self.props.onSelected(selected);
	                        }
	                    } else {
	                        if (selected.indexOf(contactHash) >= 0) {
	                            array.remove(selected, contactHash);
	                        }
	                        if (self.props.onSelected) {
	                            self.props.onSelected(selected);
	                        }
	                    }
	                    self.setState({ 'selected': selected });
	                    self.setState({ 'searchValue': '' });
	                    self.refs.contactSearchField.focus();
	                }
	                self.clickTime = new Date();
	                self.lastClicked = contactHash;
	            };
	            var selectedWidth = self.state.selected.length * 60;
	            if (!self.state.selected || self.state.selected.length === 0) {
	                footer = React.makeElement(
	                    "div",
	                    { className: "fm-dialog-footer" },
	                    React.makeElement(
	                        "a",
	                        { href: "javascript:;", className: "default-white-button left", onClick: onAddContact },
	                        l[71]
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer-txt right" },
	                        self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : __(l[8889])
	                    )
	                );
	            } else if (self.state.selected.length === 1) {
	                self.state.selected.forEach(function (v, k) {
	                    contactsSelected.push(React.makeElement(ContactItem, { contact: self.props.contacts[v], onClick: onContactSelectDoneCb,
	                        key: v
	                    }));
	                });
	                footer = React.makeElement(
	                    "div",
	                    { className: "contacts-search-footer" },
	                    React.makeElement(
	                        PerfectScrollbar,
	                        { className: "selected-contact-block", selected: this.state.selected },
	                        React.makeElement(
	                            "div",
	                            { className: "select-contact-centre", style: { width: selectedWidth } },
	                            contactsSelected
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer" },
	                        React.makeElement(
	                            "span",
	                            { className: "selected-contact-amount" },
	                            self.state.selected.length,
	                            " contacts selected"
	                        ),
	                        React.makeElement(
	                            "a",
	                            { href: "javascript:;", className: "default-grey-button right", onClick: onSelectDoneCb },
	                            self.props.singleSelectedButtonLabel ? self.props.singleSelectedButtonLabel : l[5885]
	                        )
	                    )
	                );
	            } else if (self.state.selected.length > 1) {
	                self.state.selected.forEach(function (v, k) {
	                    contactsSelected.push(React.makeElement(ContactItem, { contact: self.props.contacts[v], onClick: onContactSelectDoneCb,
	                        key: v
	                    }));
	                });

	                footer = React.makeElement(
	                    "div",
	                    { className: "contacts-search-footer" },
	                    React.makeElement(
	                        utils.JScrollPane,
	                        { className: "selected-contact-block horizontal-only",
	                            selected: this.state.selected,
	                            ref: function ref(jspSelected) {
	                                self.jspSelected = jspSelected;
	                            } },
	                        React.makeElement(
	                            "div",
	                            { className: "select-contact-centre", style: { width: selectedWidth } },
	                            contactsSelected
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-dialog-footer" },
	                        React.makeElement(
	                            "span",
	                            { className: "selected-contact-amount" },
	                            self.state.selected.length,
	                            " contacts selected"
	                        ),
	                        React.makeElement(
	                            "a",
	                            { href: "javascript:;", className: "default-grey-button right", onClick: onSelectDoneCb },
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

	            var pres = self.props.megaChat.getPresence(v.u);

	            if (v.c != 1 || v.u == u_handle) {
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
	                    var contactHash = contact.u;

	                    if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {

	                        if (self.props.onSelected) {
	                            self.props.onSelected([contactHash]);
	                        }
	                        self.props.onSelectDone([contactHash]);
	                        return;
	                    } else {
	                        var selected = clone(self.state.selected || []);

	                        if (selected.indexOf(contactHash) === -1) {
	                            selected.push(contactHash);

	                            self.scrollToLastSelected = true;
	                            if (self.props.onSelected) {
	                                self.props.onSelected(selected);
	                            }
	                        } else {
	                            if (selected.indexOf(contactHash) >= 0) {
	                                array.remove(selected, contactHash);
	                            }
	                            if (self.props.onSelected) {
	                                self.props.onSelected(selected);
	                            }
	                        }
	                        self.setState({ 'selected': selected });
	                        self.setState({ 'searchValue': '' });
	                        self.refs.contactSearchField.focus();
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
	        var displayStyle = self.state.searchValue && self.state.searchValue.length > 0 ? "" : "none";
	        return React.makeElement(
	            "div",
	            { className: this.props.className + " " },
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
	                }),
	                React.makeElement("div", { className: "search-result-clear", style: { display: displayStyle }, onClick: clearSearch })
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
	    ContactButton: ContactButton,
	    ContactCard: ContactCard,
	    Avatar: Avatar,
	    ContactPickerWidget: ContactPickerWidget,
	    ContactVerified: ContactVerified,
	    ContactPresence: ContactPresence,
	    ContactFingerprint: ContactFingerprint
	};

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(9);
	var ModalDialogsUI = __webpack_require__(13);
	var CloudBrowserModalDialog = __webpack_require__(16);
	var DropdownsUI = __webpack_require__(10);
	var ContactsUI = __webpack_require__(11);
	var ConversationsUI = __webpack_require__(4);
	var TypingAreaUI = __webpack_require__(17);
	var WhosTyping = __webpack_require__(20).WhosTyping;
	var getMessageString = __webpack_require__(7).getMessageString;
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;
	var ParticipantsList = __webpack_require__(21).ParticipantsList;

	var GenericConversationMessage = __webpack_require__(22).GenericConversationMessage;
	var AlterParticipantsConversationMessage = __webpack_require__(28).AlterParticipantsConversationMessage;
	var TruncatedMessage = __webpack_require__(29).TruncatedMessage;
	var PrivilegeChange = __webpack_require__(30).PrivilegeChange;
	var TopicChange = __webpack_require__(31).TopicChange;

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

	        if (!room || !room.roomId) {

	            return null;
	        }
	        var contactHandle;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactHandle = contacts[0];
	            contact = M.u[contactHandle];
	        } else {
	            contact = {};
	        }

	        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
	            return null;
	        }
	        self._wasAppendedEvenOnce = true;

	        var disabledCalls = room.isReadOnly() || !room.chatId || room.callManagerCall;

	        var startAudioCallButtonClass = "";
	        var startVideoCallButtonClass = "";

	        if (disabledCalls) {
	            startAudioCallButtonClass = startVideoCallButtonClass = "disabled";
	        }

	        var startAudioCallButton = React.makeElement(
	            "div",
	            { className: "link-button" + " " + startVideoCallButtonClass, onClick: function onClick() {
	                    if (!disabledCalls) {
	                        room.startAudioCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon audio-call" }),
	            __(l[5896])
	        );

	        var startVideoCallButton = React.makeElement(
	            "div",
	            { className: "link-button" + " " + startVideoCallButtonClass, onClick: function onClick() {
	                    if (!disabledCalls) {
	                        room.startVideoCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon video-call" }),
	            __(l[5897])
	        );
	        var AVseperator = React.makeElement("div", { className: "chat-button-seperator" });
	        var endCallButton = React.makeElement(
	            "div",
	            { className: "link-button red", onClick: function onClick() {
	                    if (room.callManagerCall) {
	                        room.callManagerCall.endCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon horizontal-red-handset" }),
	            __(l[5884])
	        );

	        if (room.callManagerCall && room.callManagerCall.isActive() === true) {
	            startAudioCallButton = startVideoCallButton = null;
	        } else {
	            endCallButton = null;
	        }

	        var isReadOnlyElement = null;

	        if (room.isReadOnly()) {}
	        var excludedParticipants = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipants() : room.getParticipants();

	        if (excludedParticipants.indexOf(u_handle) >= 0) {
	            array.remove(excludedParticipants, u_handle, false);
	        }
	        var dontShowTruncateButton = false;
	        if (!room.iAmOperator() || room.isReadOnly() || room.messagesBuff.messages.length === 0 || room.messagesBuff.messages.length === 1 && room.messagesBuff.messages.getItem(0).dialogType === "truncated") {
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

	        var renameButtonClass = "link-button " + (room.isReadOnly() || !room.iAmOperator() ? "disabled" : "");

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
	                        ButtonsUI.Button,
	                        {
	                            className: "add-chat-contact",
	                            label: __(l[8007]),
	                            contacts: this.props.contacts,
	                            disabled: !(!self.allContactsInChat(excludedParticipants) && !room.isReadOnly() && room.iAmOperator())
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
	                            positionMy: "center top",
	                            positionAt: "left bottom"
	                        })
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "buttons-block" },
	                        React.makeElement(
	                            "div",
	                            { className: "chat-right-head-txt" },
	                            "Options"
	                        ),
	                        room.type !== "group" ? startAudioCallButton : null,
	                        room.type !== "group" ? startVideoCallButton : null,
	                        room.type !== "group" ? AVseperator : null,
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
	                                disabled: room.isReadOnly()
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
	                        React.makeElement("div", { className: "chat-button-seperator" }),
	                        React.makeElement(
	                            "div",
	                            { className: "link-button",
	                                onClick: function onClick(e) {
	                                    if ($(e.target).closest('.disabled').size() > 0) {
	                                        return false;
	                                    }
	                                    if (room.isArchived()) {
	                                        if (self.props.onUnarchiveClicked) {
	                                            self.props.onUnarchiveClicked();
	                                        }
	                                    } else {
	                                        if (self.props.onArchiveClicked) {
	                                            self.props.onArchiveClicked();
	                                        }
	                                    }
	                                } },
	                            React.makeElement("i", { className: "small-icon " + (room.isArchived() ? "unarchive" : "archive") }),
	                            room.isArchived() ? __(l[19065]) : __(l[16689])
	                        ),
	                        room.type === "group" ? React.makeElement(
	                            "div",
	                            { className: "link-button red " + (room.stateIsLeftOrLeaving() ? "disabled" : ""),
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
	                        room._closing !== true && room.type === "group" && room.stateIsLeftOrLeaving() ? React.makeElement(
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
	    _hideBottomPanel: function _hideBottomPanel() {
	        var self = this;
	        var room = self.props.chatRoom;
	        if (!room.callManagerCall || !room.callManagerCall.isActive()) {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(self));

	        self.visiblePanel = false;
	        $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).removeClass('visible-panel');
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var room = self.props.chatRoom;
	        if (!room.callManagerCall || !room.callManagerCall.isActive()) {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(self));

	        var mouseoutThrottling = null;
	        $container.rebind('mouseover.chatUI' + self.props.chatRoom.roomId, function () {
	            var $this = $(this);
	            clearTimeout(mouseoutThrottling);
	            self.visiblePanel = true;
	            $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
	            if ($this.hasClass('full-sized-block')) {
	                $('.call.top-panel', $container).addClass('visible-panel');
	            }
	        });

	        $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomId, function () {
	            var $this = $(this);
	            clearTimeout(mouseoutThrottling);
	            mouseoutThrottling = setTimeout(function () {
	                self.visiblePanel = false;
	                self._hideBottomPanel();
	                $('.call.top-panel', $container).removeClass('visible-panel');
	            }, 500);
	        });

	        var idleMouseTimer;
	        var forceMouseHide = false;
	        $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomId, function (ev) {
	            var $this = $(this);
	            if (self._bottomPanelMouseOver) {
	                return;
	            }
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

	                    self._hideBottomPanel();

	                    $container.addClass('no-cursor');
	                    $('.call.top-panel', $container).removeClass('visible-panel');

	                    forceMouseHide = true;
	                    setTimeout(function () {
	                        forceMouseHide = false;
	                    }, 400);
	                }, 2000);
	            }
	        });

	        $('.call.bottom-panel', $container).rebind('mouseenter.chatUI' + self.props.chatRoom.roomId, function (ev) {
	            self._bottomPanelMouseOver = true;
	            clearTimeout(idleMouseTimer);
	        });
	        $('.call.bottom-panel', $container).rebind('mouseleave.chatUI' + self.props.chatRoom.roomId, function (ev) {
	            self._bottomPanelMouseOver = false;

	            idleMouseTimer = setTimeout(function () {
	                self.visiblePanel = false;

	                self._hideBottomPanel();

	                $container.addClass('no-cursor');
	                $('.call.top-panel', $container).removeClass('visible-panel');

	                forceMouseHide = true;
	                setTimeout(function () {
	                    forceMouseHide = false;
	                }, 400);
	            }, 2000);
	        });

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomId).bind("fullscreenchange.megaChat_" + room.roomId, function () {
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

	        $(window).rebind('resize.chatUI_' + room.roomId, function (e) {
	            if ($container.is(":visible")) {
	                if (!elementInViewport($localMediaDisplay[0])) {
	                    $localMediaDisplay.addClass('right-aligned').addClass('bottom-aligned').css({
	                        'right': 8,
	                        'bottom': 8
	                    });
	                }
	            }
	        });

	        if (self.refs.remoteVideo && self.refs.remoteVideo.src === "" && self.refs.remoteVideo.currentTime === 0 && !self.refs.remoteVideo.srcObject) {
	            var participants = room.getParticipantsExceptMe();
	            var stream = room.callManagerCall._streams[participants[0]];
	            RTC.attachMediaStream(self.refs.remoteVideo, stream);
	        }

	        if (room.megaChat.rtc && room.megaChat.rtc.gLocalStream && self.refs.localViewport && self.refs.localViewport.src === "" && self.refs.localViewport.currentTime === 0 && !self.refs.localViewport.srcObject) {
	            RTC.attachMediaStream(self.refs.localViewport, room.megaChat.rtc.gLocalStream);
	        }

	        $(room).rebind('toggleMessages.av', function () {
	            self.toggleMessages();
	        });

	        room.messagesBlockEnabled = self.state.messagesBlockEnabled;
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var room = self.props.chatRoom;

	        var $container = $(ReactDOM.findDOMNode(self));
	        if ($container) {
	            $container.unbind('mouseover.chatUI' + self.props.chatRoom.roomId);
	            $container.unbind('mouseout.chatUI' + self.props.chatRoom.roomId);
	            $container.unbind('mousemove.chatUI' + self.props.chatRoom.roomId);
	        }

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomId);
	        $(window).unbind('resize.chatUI_' + room.roomId);
	        $(room).unbind('toggleMessages.av');
	    },
	    toggleMessages: function toggleMessages(e) {
	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }

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

	        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isStarted()) {
	            return null;
	        }

	        var participants = chatRoom.getParticipantsExceptMe();

	        var displayNames = [];

	        participants.forEach(function (v) {
	            displayNames.push(htmlentities(M.getNameByHandle(v)));
	        });

	        var callManagerCall = chatRoom.callManagerCall;

	        var remoteCamEnabled = null;

	        if (callManagerCall.getRemoteMediaOptions().video) {
	            remoteCamEnabled = React.makeElement("i", { className: "small-icon blue-videocam" });
	        }

	        var localPlayerElement = null;
	        var remotePlayerElement = null;

	        var visiblePanelClass = "";
	        var localPlayerStream;
	        if (callManagerCall && chatRoom.megaChat.rtc && chatRoom.megaChat.rtc.gLocalStream) {
	            localPlayerStream = chatRoom.megaChat.rtc.gLocalStream;
	        }

	        if (this.visiblePanel === true) {
	            visiblePanelClass += " visible-panel";
	        }
	        if (!localPlayerStream || callManagerCall.getMediaOptions().video === false) {
	            localPlayerElement = React.makeElement(
	                "div",
	                { className: "call local-audio right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass },
	                React.makeElement(
	                    "div",
	                    { className: "default-white-button tiny-button call", onClick: this.toggleLocalVideoDisplay },
	                    React.makeElement("i", { className: "tiny-icon grey-minus-icon" })
	                ),
	                React.makeElement(ContactsUI.Avatar, {
	                    contact: M.u[u_handle], className: "call avatar-wrapper semi-big-avatar",
	                    style: { display: !this.state.localMediaDisplay ? "none" : "" }
	                })
	            );
	        } else {
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
	                    ref: "localViewport",
	                    className: "localViewport",
	                    defaultMuted: true,
	                    muted: true,
	                    volume: 0,
	                    id: "localvideo_" + callManagerCall.id,
	                    style: { display: !this.state.localMediaDisplay ? "none" : "" }

	                })
	            );
	        }

	        var remotePlayerStream = callManagerCall._streams[participants[0]];

	        if (!remotePlayerStream || callManagerCall.getRemoteMediaOptions().video === false) {

	            var contact = M.u[participants[0]];
	            remotePlayerElement = React.makeElement(
	                "div",
	                { className: "call user-audio" },
	                React.makeElement(ContactsUI.Avatar, { contact: contact, className: "avatar-wrapper big-avatar", hideVerifiedBadge: true })
	            );
	        } else {
	            remotePlayerElement = React.makeElement(
	                "div",
	                { className: "call user-video" },
	                React.makeElement("video", {
	                    autoPlay: true,
	                    className: "rmtViewport rmtVideo",
	                    id: "remotevideo_" + callManagerCall.id,
	                    ref: "remoteVideo"
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
	                        "data-room-id": chatRoom.chatId },
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
	                            if (callManagerCall.getMediaOptions().audio === true) {
	                                callManagerCall.muteAudio();
	                            } else {
	                                callManagerCall.unmuteAudio();
	                            }
	                        } },
	                    React.makeElement("i", { className: "big-icon " + (callManagerCall.getMediaOptions().audio ? " microphone" : " crossed-microphone") })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call", onClick: function onClick(e) {
	                            if (callManagerCall.getMediaOptions().video === true) {
	                                callManagerCall.muteVideo();
	                            } else {
	                                callManagerCall.unmuteVideo();
	                            }
	                        } },
	                    React.makeElement("i", { className: "big-icon " + (callManagerCall.getMediaOptions().video ? " videocam" : " crossed-videocam") })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "button call", onClick: function onClick(e) {
	                            if (chatRoom.callManagerCall) {
	                                chatRoom.callManagerCall.endCall();
	                            }
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
	        this.scrolledToBottom = true;

	        this.props.chatRoom.uploadFromComputer();
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
	        if (self.isMounted() && chatRoom.isActive() && !chatRoom.isReadOnly()) {
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

	        self.props.chatRoom.rebind('onSendMessage.scrollToBottom', function (e, eventData) {
	            self.scrolledToBottom = true;
	            if (self.messagesListScrollable) {
	                self.messagesListScrollable.scrollToBottom();
	            }
	        });
	        self.props.chatRoom.rebind('openSendFilesDialog', function (e) {
	            self.setState({ 'attachCloudDialog': true });
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

	        $(document).unbind("fullscreenchange.megaChat_" + room.roomId).bind("fullscreenchange.megaChat_" + room.roomId, function () {
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

	        $(chatRoom).rebind('onHistoryDecrypted.cp', function () {
	            self.eventuallyUpdate();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        window.removeEventListener('resize', self.handleWindowResize);
	        window.removeEventListener('keydown', self.handleKeyDown);
	        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomId);
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
	        var chatRoom = self.props.chatRoom;
	        var mb = chatRoom.messagesBuff;

	        if (mb.messages.length === 0) {
	            self.props.chatRoom.scrolledToBottom = self.scrolledToBottom = true;
	            return;
	        }

	        if (ps.isCloseToBottom(30) === true) {
	            if (!self.scrolledToBottom) {
	                mb.detachMessages();
	            }
	            self.props.chatRoom.scrolledToBottom = self.scrolledToBottom = true;
	        } else {
	            self.props.chatRoom.scrolledToBottom = self.scrolledToBottom = false;
	        }

	        if (isAtTop || ps.getScrollPositionY() < 5 && ps.getScrollHeight() > 500) {
	            if (mb.haveMoreHistory() && !self.isRetrievingHistoryViaScrollPull && !mb.isRetrievingHistory) {
	                ps.disable();

	                self.isRetrievingHistoryViaScrollPull = true;
	                self.lastScrollPosition = scrollPositionY;

	                self.lastContentHeightBeforeHist = ps.getScrollHeight();

	                var msgsAppended = 0;
	                $(chatRoom).unbind('onMessagesBuffAppend.pull');
	                $(chatRoom).bind('onMessagesBuffAppend.pull', function () {
	                    msgsAppended++;
	                });

	                $(chatRoom).unbind('onHistoryDecrypted.pull');
	                $(chatRoom).one('onHistoryDecrypted.pull', function (e) {
	                    $(chatRoom).unbind('onMessagesBuffAppend.pull');
	                    var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;

	                    ps.scrollToY(prevPosY, true);

	                    chatRoom.messagesBuff.addChangeListener(function () {
	                        if (msgsAppended > 0) {
	                            var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;

	                            ps.scrollToY(prevPosY, true);

	                            self.lastScrollPosition = prevPosY;
	                        }

	                        delete self.lastContentHeightBeforeHist;

	                        return 0xDEAD;
	                    });

	                    setTimeout(function () {
	                        self.isRetrievingHistoryViaScrollPull = false;

	                        ps.enable();
	                        self.forceUpdate();
	                    }, 1150);
	                });

	                mb.retrieveChatHistory();
	            }
	        }

	        if (self.lastScrollPosition !== ps.getScrollPositionY()) {
	            self.lastScrollPosition = ps.getScrollPositionY();
	        }
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate() {
	        if (this.isRetrievingHistoryViaScrollPull || this.loadingShown || this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || !this.props.chatRoom.isCurrentlyActive) {
	            return false;
	        } else {
	            return undefined;
	        }
	    },
	    render: function render() {
	        var self = this;

	        var room = this.props.chatRoom;
	        if (!room || !room.roomId) {
	            return null;
	        }

	        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
	            return null;
	        }
	        self._wasAppendedEvenOnce = true;

	        var contacts = room.getParticipantsExceptMe();
	        var contactHandle;
	        var contact;
	        var avatarMeta;
	        var contactName = "";
	        if (contacts && contacts.length === 1) {
	            contactHandle = contacts[0];
	            contact = M.u[contactHandle];
	            avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
	            contactName = avatarMeta.fullName;
	        } else if (contacts && contacts.length > 1) {
	            contactName = room.getRoomTitle(true);
	        }

	        var conversationPanelClasses = "conversation-panel " + room.type + "-chat";

	        if (!room.isCurrentlyActive) {
	            conversationPanelClasses += " hidden";
	        }

	        var messagesList = [];

	        if (ChatdIntegration._loadingChats[room.roomId] && ChatdIntegration._loadingChats[room.roomId].loadingPromise && ChatdIntegration._loadingChats[room.roomId].loadingPromise.state() === 'pending' || self.isRetrievingHistoryViaScrollPull && !self.loadingShown || room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.joined === false || room.messagesBuff.joined === true && room.messagesBuff.haveMessages === true && room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.isDecrypting && room.messagesBuff.isDecrypting.state() === 'pending') {
	            self.loadingShown = true;
	        } else if (room.messagesBuff.joined === true) {
	            if (!self.isRetrievingHistoryViaScrollPull && room.messagesBuff.haveMoreHistory() === false) {
	                var headerText = room.messagesBuff.messages.length === 0 ? __(l[8002]) : __(l[8002]);

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

	            delete self.loadingShown;
	        } else {
	            delete self.loadingShown;
	        }

	        var lastTimeMarker;
	        var lastMessageFrom = null;
	        var lastGroupedMessageTimeStamp = null;
	        var lastMessageState = null;
	        var grouped = false;

	        room.messagesBuff.messages.forEach(function (v, k) {
	            if (!v.protocol && v.revoked !== true) {
	                var shouldRender = true;
	                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false || v.deleted === true) {
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
	                    if (!userId) {

	                        if (contact && contact.u) {
	                            userId = contact.u;
	                        }
	                    }

	                    if (v instanceof Message && v.keyid !== 0) {

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

	                if (v.dialogType === "remoteCallEnded" && v && v.wrappedChatDialogMessage) {
	                    v = v.wrappedChatDialogMessage;
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
	                        editing: self.state.editing === v.messageId || self.state.editing === v.pendingMessageId,
	                        onEditStarted: function onEditStarted($domElement) {
	                            self.editDomElement = $domElement;
	                            self.setState({ 'editing': v.messageId });
	                            self.forceUpdate();
	                        },
	                        onEditDone: function onEditDone(messageContents) {
	                            self.editDomElement = null;

	                            var currentContents = v.textContents;

	                            v.edited = false;

	                            if (messageContents === false || messageContents === currentContents) {
	                                self.messagesListScrollable.scrollToBottom(true);
	                                self.lastScrollPositionPerc = 1;
	                            } else if (messageContents) {
	                                $(room).trigger('onMessageUpdating', v);
	                                room.megaChat.plugins.chatdIntegration.updateMessage(room, v.internalId ? v.internalId : v.orderValue, messageContents);
	                                if (v.getState && (v.getState() === Message.STATE.NOT_SENT || v.getState() === Message.STATE.SENT) && !v.requiresManualRetry) {
	                                    if (v.textContents) {
	                                        v.textContents = messageContents;
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

	                                    megaChat.plugins.richpreviewsFilter.processMessage({}, v);
	                                }

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
	                                'editing': false,
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
	            attachCloudDialog = React.makeElement(CloudBrowserModalDialog.CloudBrowserDialog, {
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

	                    self.scrolledToBottom = true;

	                    room.attachNodes(selected);
	                }
	            });
	        }

	        var sendContactDialog = null;
	        if (self.state.sendContactDialog === true) {
	            var excludedContacts = [];
	            if (room.type == "private") {
	                room.getParticipantsExceptMe().forEach(function (userHandle) {
	                    var contact = M.u[userHandle];
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
	                            msg.deleted = true;
	                            msg.textContents = "";
	                            room.messagesBuff.removeMessageById(msg.messageId);
	                        } else if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
	                            chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
	                        }

	                        self.setState({
	                            'confirmDeleteDialog': false,
	                            'messageToBeDeleted': false
	                        });

	                        if (msg.getState && msg.getState() === Message.STATE.NOT_SENT && !msg.requiresManualRetry) {
	                            msg.message = "";
	                            msg.textContents = "";
	                            msg.messageHtml = "";
	                            msg.deleted = true;

	                            $(msg).trigger('onChange', [msg, "deleted", false, true]);
	                        }
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

	                        try {
	                            Object.defineProperty(meta[0], 'name', {
	                                configurable: true,
	                                writeable: true,
	                                value: Date.now() + '.' + M.getSafeName(meta[1] || meta[0].name)
	                            });
	                        } catch (e) {}

	                        self.scrolledToBottom = true;

	                        M.addUpload([meta[0]]);

	                        self.setState({
	                            'pasteImageConfirmDialog': false
	                        });

	                        URL.revokeObjectURL(meta[2]);
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
	                    dontShowAgainCheckbox: false,
	                    onClose: function onClose() {
	                        self.setState({ 'truncateDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        self.scrolledToBottom = true;

	                        room.truncate();

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
	        if (self.state.archiveDialog === true) {
	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ConfirmDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __(l[19068]),
	                    name: "archive-conversation",
	                    onClose: function onClose() {
	                        self.setState({ 'archiveDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        self.scrolledToBottom = true;

	                        room.archive();

	                        self.setState({
	                            'archiveDialog': false
	                        });
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        __(l[19069])
	                    )
	                )
	            );
	        }
	        if (self.state.unarchiveDialog === true) {
	            confirmDeleteDialog = React.makeElement(
	                ModalDialogsUI.ConfirmDialog,
	                {
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    title: __(l[19063]),
	                    name: "unarchive-conversation",
	                    onClose: function onClose() {
	                        self.setState({ 'unarchiveDialog': false });
	                    },
	                    onConfirmClicked: function onConfirmClicked() {
	                        self.scrolledToBottom = true;

	                        room.unarchive();

	                        self.setState({
	                            'unarchiveDialog': false
	                        });
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-content" },
	                    React.makeElement(
	                        "div",
	                        { className: "dialog secondary-header" },
	                        __(l[19064])
	                    )
	                )
	            );
	        }
	        if (self.state.renameDialog === true) {
	            var onEditSubmit = function onEditSubmit(e) {
	                if ($.trim(self.state.renameDialogValue).length > 0 && self.state.renameDialogValue !== self.props.chatRoom.getRoomTitle()) {
	                    self.scrolledToBottom = true;

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
	        if (additionalClass.length === 0 && self.state.messagesToggledInCall && room.callManagerCall && room.callManagerCall.isActive()) {
	            additionalClass = " small-block";
	        }

	        return React.makeElement(
	            "div",
	            { className: conversationPanelClasses, onMouseMove: self.onMouseMove,
	                "data-room-id": self.props.chatRoom.chatId },
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
	                    onArchiveClicked: function onArchiveClicked() {
	                        self.setState({ 'archiveDialog': true });
	                    },
	                    onUnarchiveClicked: function onUnarchiveClicked() {
	                        self.setState({ 'unarchiveDialog': true });
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
	                        self.scrolledToBottom = true;

	                        if (self.props.chatRoom.type == "private") {
	                            var megaChat = self.props.chatRoom.megaChat;

	                            loadingDialog.show();

	                            megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getParticipantsExceptMe().concat(contactHashes)]);
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
	                    React.makeElement(
	                        utils.EmojiFormattedContent,
	                        null,
	                        self.props.chatRoom.getRoomTitle()
	                    )
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
	                                    self.props.chatRoom.scrolledToBottom = self.scrolledToBottom = 1;
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
	                                editingMessageId: self.state.editing,
	                                confirmDeleteDialog: self.state.confirmDeleteDialog,
	                                renderedMessagesCount: messagesList.length
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
	                                    room.messagesBuff.messages.keys().reverse().some(function (k) {
	                                        if (!foundMessage) {
	                                            var message = room.messagesBuff.messages[k];

	                                            var contact;
	                                            if (message.userId) {
	                                                if (!M.u[message.userId]) {

	                                                    return;
	                                                }
	                                                contact = M.u[message.userId];
	                                            } else {

	                                                return;
	                                            }

	                                            if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof Message) && (!message.isManagement || !message.isManagement())) {
	                                                foundMessage = message;
	                                                return foundMessage;
	                                            }
	                                        }
	                                    });

	                                    if (!foundMessage) {
	                                        return false;
	                                    } else {
	                                        self.setState({ 'editing': foundMessage.messageId });
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
	                                        if (!self.scrolledToBottom) {
	                                            self.scrolledToBottom = true;
	                                            self.lastScrollPosition = 0;

	                                            $(self.props.chatRoom).bind('onMessagesBuffAppend.pull', function () {
	                                                self.messagesListScrollable.scrollToBottom(false);
	                                                setTimeout(function () {
	                                                    self.messagesListScrollable.enable();
	                                                }, 1500);
	                                            });

	                                            self.props.chatRoom.sendMessage(messageContents);
	                                            self.messagesListScrollable.disable();
	                                            self.messagesListScrollable.scrollToBottom(true);
	                                        } else {
	                                            self.props.chatRoom.sendMessage(messageContents);
	                                        }
	                                    }
	                                }
	                            },
	                            React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: "popup-button",
	                                    icon: "small-icon grey-medium-plus",
	                                    disabled: room.isReadOnly()
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

	        var hadLoaded = ChatdIntegration.allChatsHadLoaded.state() !== 'pending' && ChatdIntegration.mcfHasFinishedPromise.state() !== 'pending' && Object.keys(ChatdIntegration._loadingChats).length === 0;

	        if (hadLoaded && getSitePath() === "/fm/chat") {

	            var activeFound = false;
	            self.props.conversations.forEach(function (chatRoom) {
	                if (chatRoom.isCurrentlyActive) {
	                    activeFound = true;
	                }
	            });
	            if (self.props.conversations.length > 0 && !activeFound) {
	                self.props.megaChat.showLastActive();
	            }
	        }

	        hadLoaded && self.props.conversations.forEach(function (chatRoom) {
	            var otherParticipants = chatRoom.getParticipantsExceptMe();

	            var contact;
	            if (otherParticipants && otherParticipants.length > 0) {
	                contact = M.u[otherParticipants[0]];
	            }

	            conversations.push(React.makeElement(ConversationPanel, {
	                chatRoom: chatRoom,
	                isActive: chatRoom.isCurrentlyActive,
	                messagesBuff: chatRoom.messagesBuff,
	                contacts: M.u,
	                contact: contact,
	                key: chatRoom.roomId + "_" + chatRoom.instanceIndex
	            }));
	        });

	        if (conversations.length === 0) {
	            var contactsList = [];
	            var contactsListOffline = [];

	            if (hadLoaded) {
	                self.props.contacts.forEach(function (contact) {
	                    if (contact.u === u_handle) {
	                        return;
	                    }
	                    if (contact.c === 1) {
	                        var pres = self.props.megaChat.userPresenceToCssClass(contact.presence);

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
	                { className: "conversation-panels " + self.props.className },
	                conversations
	            );
	        }
	    }
	});

	module.exports = {
	    ConversationPanel: ConversationPanel,
	    ConversationPanels: ConversationPanels
	};

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var Tooltips = __webpack_require__(14);
	var Forms = __webpack_require__(15);

	var ContactsUI = __webpack_require__(11);

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

	        $('textarea:focus').blur();

	        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
	        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

	        $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function (e) {
	            if (e.keyCode == 27) {
	                self.onBlur();
	            }
	        });
	        $(window).rebind('resize.modalDialog' + self.getUniqueId(), function () {
	            self.onResize();
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
	        $(window).unbind('resize.modalDialog' + this.getUniqueId());
	    },
	    onCloseClicked: function onCloseClicked(e) {
	        var self = this;

	        if (self.props.onClose) {
	            self.props.onClose(self);
	        }
	    },
	    onResize: function onResize() {
	        if (!this.domNode) {
	            return;
	        }

	        $(this.domNode).css({
	            'margin': 'auto'
	        }).position({
	            of: $(document.body)
	        });
	    },
	    onPopupDidMount: function onPopupDidMount(elem) {
	        this.domNode = elem;

	        this.onResize();

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
	                title: __(l[8628]),
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
	            'dontShowAgainCheckbox': true,
	            'hideable': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {};
	    },
	    unbindEvents: function unbindEvents() {
	        $(document).unbind('keyup.confirmDialog' + this.getUniqueId());
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;

	        setTimeout(function () {
	            if (!self.isMounted()) {

	                return;
	            }
	            $(document).rebind('keyup.confirmDialog' + self.getUniqueId(), function (e) {
	                if (e.which === 13 || e.keyCode === 13) {
	                    if (!self.isMounted()) {

	                        self.unbindEvents();
	                        return;
	                    }
	                    self.onConfirmClicked();
	                    return false;
	                }
	            });
	        }, 75);
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        self.unbindEvents();
	    },
	    onConfirmClicked: function onConfirmClicked() {
	        this.unbindEvents();
	        if (this.props.onConfirmClicked) {
	            this.props.onConfirmClicked();
	        }
	    },
	    render: function render() {
	        var self = this;

	        if (self.props.dontShowAgainCheckbox && mega.config.get('confirmModal_' + self.props.name) === true) {
	            if (this.props.onConfirmClicked) {

	                setTimeout(function () {
	                    self.unbindEvents();
	                    self.props.onConfirmClicked();
	                }, 75);
	            }
	            return null;
	        }

	        var classes = "delete-message " + self.props.name + " " + self.props.className;

	        var dontShowCheckbox = null;
	        if (self.props.dontShowAgainCheckbox) {
	            dontShowCheckbox = React.makeElement(
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
	                    l[7039]
	                )
	            );
	        }
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
	                dontShowCheckbox
	            )
	        );
	    }
	});

	module.exports = window.ModalDialogUI = {
	    ModalDialog: ModalDialog,
	    SelectContactDialog: SelectContactDialog,
	    ConfirmDialog: ConfirmDialog,
	    ExtraFooterElement: ExtraFooterElement
	};

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

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

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

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

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var Tooltips = __webpack_require__(14);
	var ModalDialogsUI = __webpack_require__(13);

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
	            var ordClass = self.props.sortBy[1] == "desc" ? "asc" : "desc";
	            classes = classes + " " + ordClass;
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
	    componentWillMount: function componentWillMount() {
	        this.lastCursor = false;
	        this.lastCharKeyPressed = false;
	        this.lastCharKeyIndex = -1;
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;

	        if (!self.lastCursor || self.lastCursor !== self.state.cursor) {
	            self.lastCursor = self.state.cursor;
	            var tr = self.findDOMNode().querySelector('tr.node_' + self.lastCursor);
	            var $jsp = $(tr).parents('.jspScrollable').data('jsp');
	            if (tr && $jsp) {
	                $jsp.scrollToElement(tr, undefined, false);
	            }
	        }
	    },
	    componentDidMount: function componentDidMount() {
	        this.bindEvents();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        this.unbindEvents();
	    },
	    getNodesInIndexRange: function getNodesInIndexRange(firstIndex, lastIndex) {
	        var self = this;
	        return self.props.entries.filter(function (node, index) {
	            return index >= firstIndex && index <= lastIndex && (!self.props.folderSelectNotAllowed ? true : node.t === 0);
	        }).map(function (node) {
	            return node.h;
	        });
	    },
	    getIndexByNodeId: function getIndexByNodeId(nodeId, notFoundValue) {
	        var self = this;
	        var foundIndex = typeof notFoundValue === 'undefined' ? -1 : notFoundValue;
	        self.props.entries.find(function (r, index) {
	            if (r.h === nodeId) {
	                foundIndex = index;
	                return true;
	            }
	        });
	        return foundIndex;
	    },
	    setSelectedAndHighlighted: function setSelectedAndHighlighted(highlighted, cursor) {
	        var self = this;

	        var currentViewOrderMap = {};
	        self.props.entries.forEach(function (v, k) {
	            currentViewOrderMap[v.h] = k;
	        });

	        highlighted.sort(function (a, b) {
	            var aa = currentViewOrderMap[a];
	            var bb = currentViewOrderMap[b];
	            if (aa < bb) {
	                return -1;
	            }
	            if (aa > bb) {
	                return 1;
	            }

	            return 0;
	        });

	        self.setState({ 'highlighted': highlighted, 'cursor': cursor });
	        self.props.onHighlighted(highlighted);

	        var selected = highlighted.filter(function (nodeId) {
	            var node = M.getNodeByHandle(nodeId);
	            return !self.props.folderSelectNotAllowed || node && node.t === 0;
	        });

	        self.setState({ 'selected': selected });
	        self.props.onSelected(selected);
	    },
	    bindEvents: function bindEvents() {
	        var self = this;

	        var KEY_A = 65;
	        var KEY_UP = 38;
	        var KEY_DOWN = 40;
	        var KEY_ENTER = 13;
	        var KEY_BACKSPACE = 8;

	        $(document.body).rebind('keydown.cloudBrowserModalDialog', function (e) {
	            var charTyped = false;
	            var keyCode = e.which || e.keyCode;
	            var selectionIncludeShift = e.shiftKey;

	            if (keyCode === KEY_A && (e.ctrlKey || e.metaKey)) {

	                var newCursor = false;

	                var highlighted = [];
	                if (self.props.entries && self.props.entries.length > 0) {
	                    var firstIndex = 0;
	                    var lastIndex = self.props.entries.length - 1;
	                    newCursor = self.props.entries[lastIndex].h;
	                    highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);
	                }

	                self.setSelectedAndHighlighted(highlighted, newCursor);
	                e.preventDefault();
	                e.stopPropagation();
	            } else if (e.metaKey && keyCode === KEY_UP || keyCode === KEY_BACKSPACE) {

	                var currentFolder = M.getNode(self.props.currentlyViewedEntry);
	                if (currentFolder.p) {
	                    self.expandFolder(currentFolder.p);
	                }
	            } else if (!e.metaKey && (keyCode === KEY_UP || keyCode === KEY_DOWN)) {

	                var dir = keyCode === KEY_UP ? -1 : 1;

	                var lastHighlighted = self.state.cursor || false;
	                if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
	                    lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
	                }

	                var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);

	                var targetIndex = currentIndex + dir;

	                while (selectionIncludeShift && self.props.folderSelectNotAllowed && self.props.entries && self.props.entries[targetIndex] && self.props.entries[targetIndex].t === 1) {
	                    targetIndex = targetIndex + dir;
	                    if (targetIndex < 0) {
	                        return;
	                    }
	                }

	                if (targetIndex >= self.props.entries.length) {
	                    if (selectionIncludeShift) {

	                        return;
	                    } else {
	                        targetIndex = self.props.entries.length - 1;
	                    }
	                }

	                if (targetIndex < 0 || !self.props.entries[targetIndex]) {
	                    targetIndex = Math.min(0, currentIndex);
	                }

	                if (self.props.entries.length === 0 || !self.props.entries[targetIndex]) {
	                    return;
	                }

	                var highlighted;

	                if (selectionIncludeShift) {
	                    var firstIndex;
	                    var lastIndex;
	                    if (targetIndex < currentIndex) {

	                        if (self.state.highlighted && self.state.highlighted.length > 0) {

	                            if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {

	                                firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
	                                lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 2], self.state.highlighted.length - 2);
	                            } else {
	                                firstIndex = targetIndex;
	                                lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], -1);
	                            }
	                        } else {
	                            firstIndex = targetIndex;
	                            lastIndex = currentIndex;
	                        }
	                    } else {

	                        if (self.state.highlighted && self.state.highlighted.length > 0) {

	                            if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {

	                                firstIndex = self.getIndexByNodeId(self.state.highlighted[1], 1);
	                                lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], self.state.highlighted.length - 1);
	                            } else {

	                                firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
	                                lastIndex = targetIndex;
	                            }
	                        } else {
	                            firstIndex = currentIndex;
	                            lastIndex = targetIndex;
	                        }
	                    }

	                    highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);

	                    self.setSelectedAndHighlighted(highlighted, self.props.entries[targetIndex].h);
	                } else {
	                    highlighted = [self.props.entries[targetIndex].h];
	                    self.setSelectedAndHighlighted(highlighted, highlighted[0]);
	                }
	            } else if (keyCode >= 48 && keyCode <= 57 || keyCode >= 65 && keyCode <= 123 || keyCode > 255) {
	                charTyped = String.fromCharCode(keyCode).toLowerCase();

	                var foundMatchingNodes = self.props.entries.filter(function (node, index) {
	                    return node.name && node.name.substr(0, 1).toLowerCase() === charTyped;
	                });

	                if (self.lastCharKeyPressed === charTyped) {
	                    self.lastCharKeyIndex++;
	                }

	                self.lastCharKeyPressed = charTyped;

	                if (foundMatchingNodes.length > 0) {
	                    if (!foundMatchingNodes[self.lastCharKeyIndex]) {

	                        self.lastCharKeyIndex = 0;
	                    }
	                    var foundNode = foundMatchingNodes[self.lastCharKeyIndex];

	                    self.setSelectedAndHighlighted([foundNode.h], foundNode.h);
	                }
	            } else if (keyCode === KEY_ENTER || e.metaKey && keyCode === KEY_DOWN) {
	                var selectedNodes = [];

	                if (self.props.folderSelectNotAllowed === true) {

	                    self.state.highlighted.forEach(function (h) {
	                        var node = self.props.entries.find(function (entry) {
	                            return entry.h === h;
	                        });

	                        if (node && node.t === 0) {
	                            selectedNodes.push(h);
	                        }
	                    });

	                    if (selectedNodes.length === 0) {
	                        var cursorNode = self.state.cursor && M.getNodeByHandle(self.state.cursor);
	                        if (cursorNode.t === 1) {
	                            self.expandFolder(cursorNode.h);
	                            return;
	                        } else if (self.state.highlighted.length > 0) {

	                            var firstNodeId = self.state.highlighted[0];
	                            self.expandFolder(firstNodeId);
	                            return;
	                        } else {

	                            return;
	                        }
	                    }
	                } else {
	                    selectedNodes = self.state.highlighted;
	                }

	                self.setState({ 'selected': selectedNodes });
	                self.props.onSelected(selectedNodes);
	                self.props.onAttachClicked(selectedNodes);
	            } else {}

	            if (!charTyped) {
	                self.lastCharKeyPressed = false;
	                self.lastCharKeyIndex = -1;
	            }
	        });
	    },
	    unbindEvents: function unbindEvents() {
	        $(document.body).unbind('keydown.cloudBrowserModalDialog');
	    },
	    onEntryClick: function onEntryClick(e, node) {
	        var self = this;

	        self.lastCharKeyPressed = false;
	        self.lastCharKeyIndex = -1;

	        e.stopPropagation();
	        e.preventDefault();

	        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
	            self.setSelectedAndHighlighted([node.h], node.h);
	        } else if (e.shiftKey) {

	            var targetIndex = self.getIndexByNodeId(node.h, 0);
	            var firstIndex = 0;
	            if (self.state.highlighted && self.state.highlighted.length > 0) {
	                firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
	            }
	            var lastIndex = 0;
	            if (self.state.highlighted && self.state.highlighted.length > 0) {
	                lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], 0);
	            }

	            if (targetIndex < firstIndex) {
	                firstIndex = targetIndex;
	            }
	            if (targetIndex > lastIndex) {
	                lastIndex = targetIndex;
	            }
	            var highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);

	            self.setSelectedAndHighlighted(highlighted, node.h);
	        } else if (e.ctrlKey || e.metaKey) {

	            if (!self.state.highlighted || self.state.highlighted.indexOf(node.h) === -1) {
	                var highlighted = clone(self.state.highlighted || []);
	                if (self.props.folderSelectNotAllowed) {
	                    if (node.t === 1 && highlighted.length > 0) {
	                        return;
	                    } else if (highlighted.filter(function (nodeId) {
	                        var node = M.getNodeByHandle(nodeId);
	                        return node && node.t === 1;
	                    }).length > 0) {

	                        highlighted = [];
	                    }
	                }
	                highlighted.push(node.h);
	                self.setSelectedAndHighlighted(highlighted, node.h);
	            } else if (self.state.highlighted && self.state.highlighted.indexOf(node.h) !== -1) {
	                var highlighted = clone(self.state.highlighted || []);
	                if (self.props.folderSelectNotAllowed) {
	                    if (node.t === 1) {
	                        return;
	                    } else if (highlighted.filter(function (nodeId) {
	                        var node = M.getNodeByHandle(nodeId);
	                        return node && node.t === 1;
	                    }).length > 0) {

	                        highlighted = [];
	                    }
	                }
	                array.remove(highlighted, node.h);
	                self.setSelectedAndHighlighted(highlighted, highlighted.length == 0 ? false : highlighted[0]);
	            }
	        }
	    },
	    expandFolder: function expandFolder(nodeId) {
	        var self = this;
	        var node = M.getNodeByHandle(nodeId);
	        if (node) {

	            self.lastCharKeyPressed = false;
	            self.lastCharKeyIndex = -1;

	            self.setState({ 'selected': [], 'highlighted': [], 'cursor': false });
	            self.props.onSelected([]);
	            self.props.onHighlighted([]);
	            self.props.onExpand(node);
	            self.forceUpdate();
	        }
	    },

	    onEntryDoubleClick: function onEntryDoubleClick(e, node) {
	        var self = this;

	        self.lastCharKeyPressed = false;
	        self.lastCharKeyIndex = -1;

	        e.stopPropagation();
	        e.preventDefault();

	        if (node.t) {

	            self.setState({ 'selected': [], 'highlighted': [], 'cursor': false });
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

	            var isFolder = node.t;
	            var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;

	            var tooltipElement = null;

	            var icon = React.makeElement(
	                "span",
	                {
	                    className: "transfer-filetype-icon " + (isFolder ? " folder " : "") + fileIcon(node) },
	                " "
	            );

	            if (is_image(node) && node.fa) {
	                var src = thumbnails[node.h];
	                if (!src) {
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
	                        { className: "transfer-filetype-icon " + fileIcon(node) },
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
	                                width: "156",
	                                height: "156"
	                            })
	                        )
	                    )
	                );
	            }

	            items.push(React.makeElement(
	                "tr",
	                { className: "node_" + node.h + " " + (isFolder ? " folder" : "") + (isHighlighted ? " ui-selected" : ""),
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
	                ),
	                React.makeElement(
	                    "td",
	                    null,
	                    time2date(node.ts)
	                )
	            ));
	        });
	        if (items.length > 0) {
	            return React.makeElement(
	                utils.JScrollPane,
	                { className: "fm-dialog-grid-scroll",
	                    selected: this.state.selected,
	                    highlighted: this.state.highlighted,
	                    entries: this.props.entries,
	                    ref: function ref(jsp) {
	                        self.jsp = jsp;
	                    }
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
	        } else if (self.props.isLoading) {
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
	                        __(l[5533])
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
	                        self.props.currentlyViewedEntry === M.RootID ? l[1343] : l[782]
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

	            var handle = this.state.currentlyViewedEntry;
	            if (!M.d[handle] || M.d[handle].t && !M.c[handle]) {
	                var self = this;
	                self.setState({ 'isLoading': true });
	                dbfetch.get(handle).always(function () {
	                    self.setState({ 'isLoading': false });
	                    self.setState({ entries: self.getEntries() });
	                });
	                return;
	            }
	        }

	        this.setState({ entries: null });
	    },
	    getEntries: function getEntries() {
	        var self = this;
	        var order = self.state.sortBy[1] === "asc" ? 1 : -1;
	        var entries = Object.keys(M.c[self.state.currentlyViewedEntry] || {}).map(function (h) {
	            return M.d[h];
	        });
	        var sortFunc;

	        if (self.state.sortBy[0] === "name") {
	            sortFunc = M.getSortByNameFn();
	        } else if (self.state.sortBy[0] === "size") {
	            sortFunc = M.getSortBySizeFn();
	        } else if (self.state.sortBy[0] === "ts") {
	            sortFunc = M.getSortByDateTimeFn();
	        } else {
	            sortFunc = M.sortByFavFn(order);
	        }

	        var folders = [];

	        for (var i = entries.length; i--;) {
	            if (entries[i].t) {
	                folders.unshift(entries[i]);
	                entries.splice(i, 1);
	            }
	        }

	        folders.sort(function (a, b) {
	            return sortFunc(a, b, order);
	        });

	        entries.sort(function (a, b) {
	            return sortFunc(a, b, order);
	        });

	        return folders.concat(entries);
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

	        var entries = self.state.entries || self.getEntries();

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
	                    { className: "fm-breadcrumbs contains-directories " + breadcrumbClasses, key: p.h,
	                        onClick: function onClick(e) {
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
	                            p.h === M.RootID ? __(l[164]) : p.name
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
	            ModalDialogsUI.ModalDialog,
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
	                        React.makeElement(BrowserCol, { id: "name", label: __(l[86]), sortBy: self.state.sortBy,
	                            onClick: self.toggleSortBy }),
	                        React.makeElement(BrowserCol, { id: "size", label: __(l[87]), sortBy: self.state.sortBy,
	                            onClick: self.toggleSortBy }),
	                        React.makeElement(BrowserCol, { id: "ts", label: __(l[16169]), sortBy: self.state.sortBy,
	                            onClick: self.toggleSortBy })
	                    )
	                )
	            ),
	            React.makeElement(BrowserEntries, {
	                isLoading: self.state.isLoading,
	                currentlyViewedEntry: self.state.currentlyViewedEntry,
	                entries: entries,
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

	module.exports = window.CloudBrowserModalDialogUI = {
	    CloudBrowserDialog: CloudBrowserDialog
	};

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(9);
	var ModalDialogsUI = __webpack_require__(13);
	var DropdownsUI = __webpack_require__(10);
	var ContactsUI = __webpack_require__(11);
	var ConversationsUI = __webpack_require__(4);
	var DropdownEmojiSelector = __webpack_require__(18).DropdownEmojiSelector;
	var EmojiAutocomplete = __webpack_require__(19).EmojiAutocomplete;

	var TypingArea = React.createClass({
	    displayName: "TypingArea",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    validEmojiCharacters: new RegExp("[\w\:\-\_0-9]", "gi"),
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'textareaMaxHeight': "40%"
	        };
	    },
	    getInitialState: function getInitialState() {
	        var initialText = this.props.initialText;

	        return {
	            emojiSearchQuery: false,
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

	    stoppedTyping: function stoppedTyping() {
	        if (this.props.disabled) {
	            return;
	        }
	        var self = this;
	        var room = this.props.chatRoom;

	        self.iAmTyping = false;

	        delete self.lastTypingStamp;

	        room.trigger('stoppedTyping');
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
	                self.stoppedTyping();
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
	        if (self.props.chatRoom && self.iAmTyping) {
	            self.stoppedTyping();
	        }
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
	        if (self.props.chatRoom && self.iAmTyping) {
	            self.stoppedTyping();
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

	        if (self.state.emojiSearchQuery) {
	            return;
	        }
	        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {

	            if (e.isPropagationStopped() || e.isDefaultPrevented()) {
	                return;
	            }

	            if (self.onConfirmTrigger(val) !== true) {
	                self.setState({ typedMessage: "" });
	            }
	            e.preventDefault();
	            e.stopPropagation();
	            if (self.props.chatRoom && self.iAmTyping) {
	                self.stoppedTyping();
	            }
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
	            if (self.state.emojiSearchQuery) {
	                return;
	            }

	            if (e.altKey) {
	                var content = element.value;
	                var cursorPos = self.getCursorPosition(element);
	                content = content.substring(0, cursorPos) + "\n" + content.substring(cursorPos, content.length);

	                self.setState({ typedMessage: content });
	                self.onUpdateCursorPosition = cursorPos + 1;
	                e.preventDefault();
	            } else if ($.trim(val).length === 0) {
	                e.preventDefault();
	            }
	        } else if (key === 38) {
	            if (self.state.emojiSearchQuery) {
	                return;
	            }

	            if ($.trim(val).length === 0) {
	                if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
	                    e.preventDefault();
	                    return;
	                }
	            }
	        } else if (key === 27) {
	            if (self.state.emojiSearchQuery) {
	                return;
	            }

	            if (self.props.showButtons === true) {
	                e.preventDefault();
	                self.onCancelClicked(e);
	                return;
	            }
	        } else {
	            if (self.prefillMode && (key === 8 || key === 32 || key === 13)) {

	                self.prefillMode = false;
	            }
	            var char = String.fromCharCode(key);
	            if (self.prefillMode) {
	                return;
	            }

	            if (key === 16 || key === 17 || key === 18 || key === 91 || key === 8 || key === 37 || key === 39 || key === 40 || key === 38 || key === 9 || char.match(self.validEmojiCharacters)) {
	                var currentContent = element.value;
	                var currentCursorPos = self.getCursorPosition(element) - 1;

	                var startPos = false;
	                var endPos = false;

	                var matchedWord = "";
	                var currentChar;
	                for (var x = currentCursorPos; x >= 0; x--) {
	                    currentChar = currentContent.substr(x, 1);
	                    if (currentChar && currentChar.match(self.validEmojiCharacters)) {
	                        matchedWord = currentChar + matchedWord;
	                    } else {
	                        startPos = x + 1;
	                        break;
	                    }
	                }

	                for (var x = currentCursorPos + 1; x < currentContent.length; x++) {
	                    currentChar = currentContent.substr(x, 1);
	                    if (currentChar && currentChar.match(self.validEmojiCharacters)) {
	                        matchedWord = matchedWord + currentChar;
	                    } else {
	                        endPos = x;
	                        break;
	                    }
	                }

	                if (matchedWord && matchedWord.length > 2 && matchedWord.substr(0, 1) === ":") {
	                    endPos = endPos ? endPos : startPos + matchedWord.length;

	                    if (matchedWord.substr(-1) === ":") {
	                        matchedWord = matchedWord.substr(0, matchedWord.length - 1);
	                    }

	                    var strictMatch = currentContent.substr(startPos, endPos - startPos);

	                    if (strictMatch.substr(0, 1) === ":" && strictMatch.substr(-1) === ":") {
	                        strictMatch = strictMatch.substr(1, strictMatch.length - 2);
	                    } else {
	                        strictMatch = false;
	                    }

	                    if (strictMatch && megaChat.isValidEmojiSlug(strictMatch)) {

	                        if (self.state.emojiSearchQuery) {
	                            self.setState({
	                                'emojiSearchQuery': false,
	                                'emojiStartPos': false,
	                                'emojiEndPos': false
	                            });
	                        }
	                        return;
	                    }

	                    self.setState({
	                        'emojiSearchQuery': matchedWord,
	                        'emojiStartPos': startPos ? startPos : 0,
	                        'emojiEndPos': endPos
	                    });
	                    return;
	                } else {
	                    if (!matchedWord && self.state.emojiStartPos !== false && self.state.emojiEndPos !== false) {
	                        matchedWord = element.value.substr(self.state.emojiStartPos, self.state.emojiEndPos);
	                    }

	                    if (!element.value || element.value.length <= 2 || matchedWord.length === 1) {
	                        self.setState({
	                            'emojiSearchQuery': false,
	                            'emojiStartPos': false,
	                            'emojiEndPos': false
	                        });
	                    }
	                    return;
	                }
	            }
	            if (self.state.emojiSearchQuery) {
	                self.setState({ 'emojiSearchQuery': false });
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

	        if (self.state.emojiSearchQuery) {

	            setTimeout(function () {
	                if (self.isMounted()) {
	                    self.setState({
	                        'emojiSearchQuery': false,
	                        'emojiStartPos': false,
	                        'emojiEndPos': false
	                    });
	                }
	            }, 300);
	        }
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
	        } else {
	            self.stoppedTyping();
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
	            if (!$('.chat-textarea:visible textarea:visible:first', $container).is(":focus")) {
	                moveCursortoToEnd($('.chat-textarea:visible:first textarea', $container)[0]);
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
	                megaChat.plugins.persistedTypeArea.getPersistedTypedValue(chatRoom).done(function (r) {
	                    if (typeof r != 'undefined') {
	                        if (!self.state.typedMessage && self.state.typedMessage !== r) {
	                            self.setState({
	                                'typedMessage': r
	                            });
	                        }
	                    }
	                }).fail(function (e) {
	                    if (d) {
	                        console.warn("Failed to retrieve persistedTypeArea value for", chatRoom, "with error:", e);
	                    }
	                });
	            }
	            $(megaChat.plugins.persistedTypeArea.data).rebind('onChange.typingArea' + self.getUniqueId(), function (e, k, v) {
	                if (chatRoom.roomId == k) {
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
	            if ($('textarea:focus,select:focus,input:focus').filter(":visible").size() === 0) {

	                this.focusTypeArea();
	            }

	            self.handleWindowResize();
	        }
	        if (!this.scrollingInitialised) {
	            this.initScrolling();
	        } else {
	            this.updateScroll();
	        }
	        if (self.onUpdateCursorPosition) {
	            var $container = $(ReactDOM.findDOMNode(this));
	            var el = $('.chat-textarea:visible:first textarea:visible', $container)[0];
	            el.selectionStart = el.selectionEnd = self.onUpdateCursorPosition;
	            self.onUpdateCursorPosition = false;
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
	            var textareaIsFocused = $textarea.is(":focus");
	            jsp = $textareaScrollBlock.data('jsp');

	            if (!textareaIsFocused) {
	                moveCursortoToEnd($('textarea:visible:first', $node)[0]);
	            }
	        }

	        scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
	        viewRatio = Math.round(textareaCloneSpanHeight + scrPos);

	        $textareaScrollBlock.height(Math.min(textareaCloneHeight, textareaMaxHeight));

	        var textareaWasFocusedBeforeReinit = $textarea.is(":focus");
	        var selectionPos = false;
	        if (textareaWasFocusedBeforeReinit) {
	            selectionPos = [$textarea[0].selectionStart, $textarea[0].selectionEnd];
	        }

	        jsp.reinitialise();

	        $textarea = $('textarea:first', $node);

	        if (textareaWasFocusedBeforeReinit) {

	            $textarea[0].selectionStart = selectionPos[0];
	            $textarea[0].selectionEnd = selectionPos[1];
	        }

	        if (textareaCloneHeight > textareaMaxHeight && textareaCloneSpanHeight < textareaMaxHeight) {
	            jsp.scrollToY(0);
	        } else if (viewRatio > self.textareaLineHeight || viewRatio < viewLimitTop) {
	            if (textareaCloneSpanHeight > 0 && jsp && textareaCloneSpanHeight > textareaMaxHeight) {
	                jsp.scrollToY(textareaCloneSpanHeight - self.textareaLineHeight);
	            } else if (jsp) {
	                jsp.scrollToY(0);

	                if (scrPos < 0) {
	                    $textareaScrollBlock.find('.jspPane').css('top', 0);
	                }
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
	    resetPrefillMode: function resetPrefillMode() {
	        this.prefillMode = false;
	    },
	    onCopyCapture: function onCopyCapture(e) {
	        this.resetPrefillMode();
	    },
	    onCutCapture: function onCutCapture(e) {
	        this.resetPrefillMode();
	    },
	    onPasteCapture: function onPasteCapture(e) {
	        this.resetPrefillMode();
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

	        var emojiAutocomplete = null;
	        if (self.state.emojiSearchQuery) {

	            emojiAutocomplete = React.makeElement(EmojiAutocomplete, {
	                emojiSearchQuery: self.state.emojiSearchQuery,
	                emojiStartPos: self.state.emojiStartPos,
	                emojiEndPos: self.state.emojiEndPos,
	                typedMessage: self.state.typedMessage,
	                onPrefill: function onPrefill(e, emojiAlias) {
	                    if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
	                        var msg = self.state.typedMessage;
	                        var pre = msg.substr(0, self.state.emojiStartPos);
	                        var post = msg.substr(self.state.emojiEndPos, msg.length);

	                        self.onUpdateCursorPosition = self.state.emojiStartPos + emojiAlias.length;

	                        self.prefillMode = true;
	                        self.setState({
	                            'typedMessage': pre + emojiAlias + (post ? post.substr(0, 1) !== " " ? " " + post : post : " "),
	                            'emojiEndPos': self.state.emojiStartPos + emojiAlias.length + (post ? post.substr(0, 1) !== " " ? 1 : 0 : 1)
	                        });
	                    }
	                },
	                onSelect: function onSelect(e, emojiAlias, forceSend) {
	                    if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
	                        var msg = self.state.typedMessage;
	                        var pre = msg.substr(0, self.state.emojiStartPos);
	                        var post = msg.substr(self.state.emojiEndPos, msg.length);
	                        var val = pre + emojiAlias + (post ? post.substr(0, 1) !== " " ? " " + post : post : " ");
	                        self.prefillMode = false;
	                        self.setState({
	                            'typedMessage': val,
	                            'emojiSearchQuery': false,
	                            'emojiStartPos': false,
	                            'emojiEndPos': false
	                        });
	                        if (forceSend) {
	                            if (self.onConfirmTrigger($.trim(val)) !== true) {
	                                self.setState({ typedMessage: "" });
	                            }
	                        }
	                    }
	                },
	                onCancel: function onCancel() {
	                    self.prefillMode = false;
	                    self.setState({
	                        'emojiSearchQuery': false,
	                        'emojiStartPos': false,
	                        'emojiEndPos': false
	                    });
	                }
	            });
	        }
	        var placeholder = l[18669];
	        placeholder = placeholder.replace("%s", room.getRoomTitle(false, true));

	        return React.makeElement(
	            "div",
	            { className: "typingarea-component" + self.props.className },
	            React.makeElement(
	                "div",
	                { className: "chat-textarea " + self.props.className },
	                emojiAutocomplete,
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
	                        placeholder: placeholder,
	                        roomTitle: room.getRoomTitle(),
	                        onKeyUp: self.onTypeAreaKeyUp,
	                        onKeyDown: self.onTypeAreaKeyDown,
	                        onBlur: self.onTypeAreaBlur,
	                        onChange: self.onTypeAreaChange,
	                        onSelect: self.onTypeAreaSelect,
	                        value: self.state.typedMessage,
	                        ref: "typearea",
	                        style: textareaStyles,
	                        disabled: room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false,
	                        readOnly: room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false,
	                        onCopyCapture: self.onCopyCapture,
	                        onPasteCapture: self.onPasteCapture,
	                        onCutCapture: self.onCutCapture
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

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var DropdownsUI = __webpack_require__(10);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

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
	        'frequently_used': l[17737],
	        'people': l[8016],
	        'objects': l[17735],
	        'activity': l[8020],
	        'nature': l[8017],
	        'travel': l[8021],
	        'symbols': l[17736],
	        'food': l[8018],
	        'flags': l[17703]
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
	            src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
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
	                forceShowWhenEmpty: true,
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

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(9);

	var EmojiAutocomplete = React.createClass({
	    displayName: "EmojiAutocomplete",

	    mixins: [MegaRenderMixin],
	    data_emojis: null,
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'emojiSearchQuery': false,
	            'disableCheckingVisibility': true,
	            'maxEmojis': 12
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'selected': 0
	        };
	    },

	    preload_emojis: function preload_emojis() {
	        var self = this;
	        if (!self.loadingPromise) {
	            self.loadingPromise = megaChat.getEmojiDataSet('emojis').done(function (emojis) {
	                Soon(function () {
	                    self.data_emojis = emojis;
	                    self.safeForceUpdate();
	                });
	            });
	        };
	    },
	    unbindKeyEvents: function unbindKeyEvents() {
	        $(document).unbind('keydown.emojiAutocomplete' + this.getUniqueId());
	    },
	    bindKeyEvents: function bindKeyEvents() {
	        var self = this;
	        $(document).rebind('keydown.emojiAutocomplete' + self.getUniqueId(), function (e) {
	            if (!self.props.emojiSearchQuery) {
	                self.unbindKeyEvents();
	                return;
	            }

	            var key = e.keyCode || e.which;

	            if (!$(e.target).is("textarea")) {
	                console.error("this should never happen.");
	                return;
	            }

	            if (e.altKey || e.metaKey) {

	                return;
	            }

	            var selected = $.isNumeric(self.state.selected) ? self.state.selected : 0;

	            var handled = false;
	            if (!e.shiftKey && (key === 37 || key === 38)) {

	                selected = selected - 1;
	                selected = selected < 0 ? self.maxFound - 1 : selected;

	                if (self.found[selected] && self.state.selected !== selected) {
	                    self.setState({
	                        'selected': selected,
	                        'prefilled': true
	                    });
	                    handled = true;
	                    self.props.onPrefill(false, ":" + self.found[selected].n + ":");
	                }
	            } else if (!e.shiftKey && (key === 39 || key === 40 || key === 9)) {

	                selected = selected + (key === 9 ? e.shiftKey ? -1 : 1 : 1);

	                selected = selected < 0 ? Object.keys(self.found).length - 1 : selected;

	                selected = selected >= self.props.maxEmojis || selected >= Object.keys(self.found).length ? 0 : selected;

	                if (self.found[selected] && (key === 9 || self.state.selected !== selected)) {
	                    self.setState({
	                        'selected': selected,
	                        'prefilled': true
	                    });

	                    self.props.onPrefill(false, ":" + self.found[selected].n + ":");

	                    handled = true;
	                }
	            } else if (key === 13) {

	                self.unbindKeyEvents();
	                if (selected === -1) {
	                    if (self.found.length > 0) {
	                        for (var i = 0; i < self.found.length; i++) {
	                            if (":" + self.found[i].n + ":" === self.props.emojiSearchQuery + ":") {

	                                self.props.onSelect(false, ":" + self.found[0].n + ":", self.state.prefilled);
	                                handled = true;
	                            }
	                        }
	                    }

	                    if (!handled && key === 13) {
	                        self.props.onCancel();
	                    }
	                    return;
	                } else if (self.found.length > 0 && self.found[selected]) {
	                    self.props.onSelect(false, ":" + self.found[selected].n + ":", self.state.prefilled);
	                    handled = true;
	                } else {
	                    self.props.onCancel();
	                }
	            } else if (key === 27) {

	                self.unbindKeyEvents();
	                self.props.onCancel();
	                handled = true;
	            }

	            if (handled) {
	                e.preventDefault();
	                e.stopPropagation();
	                return false;
	            } else {
	                if (self.isMounted()) {
	                    self.setState({ 'prefilled': false });
	                }
	            }
	        });
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        if (!this.props.emojiSearchQuery) {
	            this.unbindKeyEvents();
	        } else {
	            this.bindKeyEvents();
	        }
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        this.unbindKeyEvents();
	    },
	    render: function render() {
	        var self = this;
	        if (!self.props.emojiSearchQuery) {
	            return null;
	        }

	        self.preload_emojis();

	        if (self.loadingPromise && self.loadingPromise.state() === 'pending') {
	            return React.makeElement(
	                "div",
	                { className: "textarea-autofill-bl" },
	                React.makeElement(
	                    "div",
	                    { className: "textarea-autofill-info" },
	                    l[5533]
	                )
	            );
	        }

	        var q = self.props.emojiSearchQuery.substr(1, self.props.emojiSearchQuery.length);

	        var exactMatch = [];
	        var partialMatch = [];
	        var emojis = self.data_emojis || [];

	        for (var i = 0; i < emojis.length; i++) {
	            var emoji = emojis[i];
	            var match = emoji.n.indexOf(q);
	            if (match !== -1) {
	                if (match === 0) {
	                    exactMatch.push(emoji);
	                } else if (partialMatch.length < self.props.maxEmojis - exactMatch.length) {
	                    partialMatch.push(emoji);
	                }
	            }
	            if (exactMatch.length >= self.props.maxEmojis) {
	                break;
	            }
	        }

	        exactMatch.sort(function (a, b) {
	            if (a.n === q) {
	                return -1;
	            } else if (b.n === q) {
	                return 1;
	            } else {
	                return 0;
	            }
	        });

	        var found = exactMatch.concat(partialMatch).slice(0, self.props.maxEmojis);

	        exactMatch = partialMatch = null;

	        this.maxFound = found.length;
	        this.found = found;

	        if (!found || found.length === 0) {
	            return null;
	        }

	        var emojisDomList = [];

	        for (var i = 0; i < found.length; i++) {
	            var meta = found[i];
	            var filename = twemoji.convert.toCodePoint(meta.u);

	            emojisDomList.push(React.makeElement(
	                "div",
	                { className: "emoji-preview shadow " + (this.state.selected === i ? "active" : ""),
	                    key: meta.n + "_" + (this.state.selected === i ? "selected" : "inselected"),
	                    title: ":" + meta.n + ":",
	                    onClick: function onClick(e) {
	                        self.props.onSelect(e, e.target.title);
	                        self.unbindKeyEvents();
	                    } },
	                React.makeElement("img", {
	                    width: "20",
	                    height: "20",
	                    className: "emoji emoji-loading",
	                    draggable: "false",
	                    alt: meta.u,
	                    onLoad: function onLoad(e) {
	                        e.target.classList.remove('emoji-loading');
	                    },
	                    onError: function onError(e) {
	                        e.target.classList.remove('emoji-loading');
	                        e.target.classList.add('emoji-loading-error');
	                    },
	                    src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
	                }),
	                React.makeElement(
	                    "div",
	                    { className: "emoji title" },
	                    ":" + meta.n + ":"
	                )
	            ));
	        }

	        return React.makeElement(
	            "div",
	            { className: "textarea-autofill-bl" },
	            React.makeElement(
	                "div",
	                { className: "textarea-autofill-info" },
	                React.makeElement(
	                    "strong",
	                    null,
	                    "tab"
	                ),
	                " or  ",
	                React.makeElement("i", { className: "small-icon tab-icon" }),
	                " to navigate",
	                React.makeElement("i", { className: "small-icon enter-icon left-pad" }),
	                " to select ",
	                React.makeElement(
	                    "strong",
	                    { className: "left-pad" },
	                    "esc"
	                ),
	                "to dismiss"
	            ),
	            React.makeElement(
	                "div",
	                { className: "textarea-autofill-emoji" },
	                emojisDomList
	            )
	        );
	    }
	});

	module.exports = {
	    EmojiAutocomplete: EmojiAutocomplete
	};

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

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

	        chatRoom.bind("onParticipantTyping.whosTyping", function (e, user_handle, bCastCode) {
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

	            if (bCastCode === 1) {
	                var timer = setTimeout(function (u_h) {
	                    self.stoppedTyping(u_h);
	                }, 5000, u_h);

	                currentlyTyping[u_h] = [unixtime(), timer];

	                self.setState({
	                    currentlyTyping: currentlyTyping
	                });
	            } else {
	                self.stoppedTyping(u_h);
	            }

	            self.forceUpdate();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        chatRoom.unbind("onParticipantTyping.whosTyping");
	    },
	    stoppedTyping: function stoppedTyping(u_h) {
	        var self = this;
	        if (self.state.currentlyTyping[u_h]) {
	            var newState = clone(self.state.currentlyTyping);
	            if (newState[u_h]) {
	                clearTimeout(newState[u_h][1]);
	            }
	            delete newState[u_h];
	            self.setState({ currentlyTyping: newState });
	        }
	    },
	    render: function render() {
	        var self = this;

	        var typingElement = null;

	        if (Object.keys(self.state.currentlyTyping).length > 0) {
	            var names = Object.keys(self.state.currentlyTyping).map(function (u_h) {
	                var contact = M.u[u_h];
	                if (contact && contact.firstName) {
	                    return contact.firstName;
	                } else {
	                    var avatarMeta = generateAvatarMeta(u_h);
	                    return avatarMeta.fullName.split(" ")[0];
	                }
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

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ButtonsUI = __webpack_require__(9);
	var ModalDialogsUI = __webpack_require__(13);
	var DropdownsUI = __webpack_require__(10);
	var ContactsUI = __webpack_require__(11);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

	var ParticipantsList = React.createClass({
	    displayName: "ParticipantsList",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'contactCardHeight': 36

	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'scrollPositionY': 0,
	            'scrollHeight': 36 * 4
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
	        if (!self.refs.contactsListScroll) {
	            return null;
	        }

	        var fitHeight = scrollHeight = self.refs.contactsListScroll.getContentHeight();
	        if (fitHeight === 0) {

	            return null;
	        }

	        var $parentContainer = $node.closest('.chat-right-pad');
	        var maxHeight = $parentContainer.outerHeight(true) - $('.buttons-block', $parentContainer).outerHeight(true) - $('.chat-right-head', $parentContainer).outerHeight(true) - 72;

	        if (fitHeight < $('.buttons-block', $parentContainer).outerHeight(true)) {
	            fitHeight = Math.max(fitHeight, 53);
	        } else if (maxHeight < fitHeight) {
	            fitHeight = Math.max(maxHeight, 53);
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

	        if (!room) {

	            return null;
	        }
	        var contactHandle;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactHandle = contacts[0];
	            contact = M.u[contactHandle];
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
	            'contactCardHeight': 32,
	            'scrollPositionY': 0,
	            'scrollHeight': 32 * 4

	        };
	    },
	    getInitialState: function getInitialState() {
	        return {};
	    },
	    render: function render() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (!room) {

	            return null;
	        }
	        if (!room.isCurrentlyActive && room._leaving !== true) {

	            return false;
	        }
	        var contactHandle;
	        var contact;
	        var contacts = room.getParticipantsExceptMe();
	        if (contacts && contacts.length > 0) {
	            contactHandle = contacts[0];
	            contact = M.u[contactHandle];
	        } else {
	            contact = {};
	        }

	        var myPresence = room.megaChat.userPresenceToCssClass(M.u[u_handle].presence);

	        var contactsList = [];

	        contacts = room.type === "group" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipantsExceptMe() : room.getParticipantsExceptMe();
	        if (contacts.indexOf(u_handle) >= 0) {
	            array.remove(contacts, u_handle, true);
	        }
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

	                var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";

	                if (room.type === "group" && room.members) {
	                    var dropdownRemoveButton = [];

	                    if (room.iAmOperator() && contactHash !== u_handle) {
	                        dropdownRemoveButton.push(React.makeElement(DropdownsUI.DropdownItem, { className: "red",
	                            key: "remove", icon: "rounded-stop", label: __(l[8867]), onClick: function onClick() {
	                                $(room).trigger('onRemoveUserRequest', [contactHash]);
	                            } }));
	                    }

	                    if (room.iAmOperator() || contactHash === u_handle) {

	                        dropdowns.push(React.makeElement(
	                            "div",
	                            { key: "setPermLabel", className: "dropdown-items-info" },
	                            __(l[8868])
	                        ));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privOperator", icon: "gentleman",
	                            label: __(l[8875]),
	                            className: "tick-item " + (room.members[contactHash] === 3 ? "active" : ""),
	                            disabled: contactHash === u_handle,
	                            onClick: function onClick() {
	                                if (room.members[contactHash] !== 3) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 3]);
	                                }
	                            } }));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privFullAcc", icon: "conversation-icon",
	                            className: "tick-item " + (room.members[contactHash] === 2 ? "active" : ""),
	                            disabled: contactHash === u_handle,
	                            label: __(l[8874]), onClick: function onClick() {
	                                if (room.members[contactHash] !== 2) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 2]);
	                                }
	                            } }));

	                        dropdowns.push(React.makeElement(DropdownsUI.DropdownItem, {
	                            key: "privReadOnly", icon: "eye-icon",
	                            className: "tick-item " + (room.members[contactHash] === 0 ? "active" : ""),
	                            disabled: contactHash === u_handle,
	                            label: __(l[8873]), onClick: function onClick() {
	                                if (room.members[contactHash] !== 0) {
	                                    $(room).trigger('alterUserPrivilege', [contactHash, 0]);
	                                }
	                            } }));
	                    } else if (room.members[u_handle] === 2) {} else if (room.members[u_handle] === 1) {} else if (room.isReadOnly()) {} else {}

	                    if (room.members[contactHash] === 3) {
	                        dropdownIconClasses = "small-icon gentleman";
	                    } else if (room.members[contactHash] === 2) {
	                        dropdownIconClasses = "small-icon conversation-icon";
	                    } else if (room.members[contactHash] === 0) {
	                        dropdownIconClasses = "small-icon eye-icon";
	                    } else {}
	                }

	                contactsList.push(React.makeElement(ContactsUI.ContactCard, {
	                    key: contact.u,
	                    contact: contact,
	                    megaChat: room.megaChat,
	                    className: "right-chat-contact-card",
	                    dropdownPositionMy: "left top",
	                    dropdownPositionAt: "left top",
	                    dropdowns: dropdowns,
	                    dropdownDisabled: contactHash === u_handle,
	                    dropdownButtonClasses: room.type == "group" ? "button icon-dropdown" : "default-white-button tiny-button",
	                    dropdownRemoveButton: dropdownRemoveButton,
	                    dropdownIconClasses: dropdownIconClasses,
	                    style: {
	                        width: 249,
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

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var getMessageString = __webpack_require__(7).getMessageString;
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var MetaRichpreview = __webpack_require__(24).MetaRichpreview;
	var MetaRichpreviewConfirmation = __webpack_require__(26).MetaRichpreviewConfirmation;
	var MetaRichpreviewMegaLinks = __webpack_require__(27).MetaRichpreviewMegaLinks;
	var ContactsUI = __webpack_require__(11);
	var TypingAreaUI = __webpack_require__(17);

	var MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60 * 60;

	var CLICKABLE_ATTACHMENT_CLASSES = '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';

	var NODE_DOESNT_EXISTS_ANYMORE = {};

	var GenericConversationMessage = React.createClass({
	    displayName: 'GenericConversationMessage',

	    mixins: [ConversationMessageMixin],
	    getInitialState: function getInitialState() {
	        return {
	            'editing': this.props.editing
	        };
	    },
	    isBeingEdited: function isBeingEdited() {
	        return this.state.editing === true || this.props.editing === true;
	    },
	    componentDidUpdate: function componentDidUpdate(oldProps, oldState) {
	        var self = this;
	        if (self.isBeingEdited() && self.isMounted()) {
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
	        } else if (self.isMounted() && !self.isBeingEdited() && oldState.editing === true) {
	            if (self.props.onUpdate) {
	                self.props.onUpdate();
	            }
	        }

	        $(self.props.message).rebind('onChange.GenericConversationMessage' + self.getUniqueId(), function () {
	            Soon(function () {
	                if (self.isMounted()) {
	                    self.eventuallyUpdate();
	                }
	            });
	        });
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $node = $(self.findDOMNode());

	        if (self.isBeingEdited() && self.isMounted()) {
	            var $generic = $(self.findDOMNode());
	            var $textarea = $('textarea', $generic);
	            if ($textarea.size() > 0 && !$textarea.is(":focus")) {
	                $textarea.focus();
	                moveCursortoToEnd($textarea[0]);
	            }
	        }

	        $node.delegate(CLICKABLE_ATTACHMENT_CLASSES, 'click.dropdownShortcut', function (e) {
	            if (e.target.classList.contains('button')) {

	                return;
	            }
	            if (e.target.classList.contains('no-thumb-prev')) {

	                return;
	            }

	            var $block;
	            if ($(e.target).is('.shared-data')) {
	                $block = $(e.target);
	            } else if ($(e.target).is('.shared-info') || $(e.target).parents('.shared-info').length > 0) {
	                $block = $(e.target).is('.shared-info') ? $(e.target).next() : $(e.target).parents('.shared-info').next();
	            } else {
	                $block = $(e.target).parents('.message.shared-data');
	            }

	            Soon(function () {

	                $('.button.default-white-button.tiny-button', $block).trigger('click');
	            });
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var $node = $(self.findDOMNode());

	        $(self.props.message).unbind('onChange.GenericConversationMessage' + self.getUniqueId());
	        $node.undelegate(CLICKABLE_ATTACHMENT_CLASSES, 'click.dropdownShortcut');
	    },
	    _nodeUpdated: function _nodeUpdated(h) {
	        var self = this;

	        Soon(function () {
	            if (self.isMounted() && self.isComponentVisible()) {
	                self.forceUpdate();
	                if (self.dropdown) {
	                    self.dropdown.forceUpdate();
	                }
	            }
	        });
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
	    _favourite: function _favourite(h) {
	        var newFavState = Number(!M.isFavourite(h));
	        M.favourite([h], newFavState);
	    },
	    _addFavouriteButtons: function _addFavouriteButtons(h, arr) {
	        var self = this;

	        if (M.getNodeRights(h) > 1) {
	            var isFav = M.isFavourite(h);

	            arr.push(React.makeElement(DropdownsUI.DropdownItem, { icon: "context " + (isFav ? "broken-heart" : "heart"),
	                label: isFav ? l[5872] : l[5871],
	                isFav: isFav,
	                key: 'fav',
	                onClick: function onClick(e) {
	                    self._favourite(h);
	                    e.stopPropagation();
	                    e.preventDefault();
	                    return false;
	                } }));
	            return isFav;
	        } else {
	            return false;
	        }
	    },
	    _isNodeHavingALink: function _isNodeHavingALink(h) {
	        return M.getNodeShare(h) !== false;
	    },
	    _addLinkButtons: function _addLinkButtons(h, arr) {
	        var self = this;

	        var haveLink = self._isNodeHavingALink(h) === true;

	        var getManageLinkText = haveLink ? l[6909] : l[59];

	        arr.push(React.makeElement(DropdownsUI.DropdownItem, { icon: 'icons-sprite chain',
	            key: 'getLinkButton',
	            label: getManageLinkText,
	            onClick: self._getLink.bind(self, h)
	        }));

	        if (haveLink) {
	            arr.push(React.makeElement(DropdownsUI.DropdownItem, { icon: 'context remove-link',
	                key: 'removeLinkButton',
	                label: __(l[6821]),
	                onClick: self._removeLink.bind(self, h)
	            }));
	            return true;
	        } else {
	            return false;
	        }
	    },
	    _startDownload: function _startDownload(v) {
	        M.addDownload([v]);
	    },
	    _addToCloudDrive: function _addToCloudDrive(v, openSendToChat) {
	        openSaveToDialog(v, function (node, target, isForward) {
	            if (isForward) {
	                megaChat.getMyChatFilesFolder().done(function (myChatFolderId) {
	                    M.injectNodes(node, myChatFolderId, function (res) {
	                        if (!Array.isArray(res)) {
	                            if (d) {
	                                console.error("Failed to inject nodes. Res:", res);
	                            }
	                        } else {

	                            megaChat.chats[$.mcselected].attachNodes(res);
	                            showToast('send-chat', res.length > 1 ? l[17767] : l[17766]);
	                        }
	                    });
	                }).fail(function () {
	                    if (d) {
	                        console.error("Failed to allocate 'My chat files' folder.", arguments);
	                    }
	                });
	            } else {

	                target = target || M.RootID;
	                M.injectNodes(node, target, function (res) {
	                    if (!Array.isArray(res)) {
	                        if (d) {
	                            console.error("Failed to inject nodes. Res:", res);
	                        }
	                    } else {
	                        if (target === M.RootID) {

	                            msgDialog('info', l[8005], l[8006]);
	                        }
	                    }
	                });
	            }
	        }, openSendToChat ? "conversations" : false);
	    },

	    _getLink: function _getLink(h, e) {
	        if (u_type === 0) {
	            ephemeralDialog(l[1005]);
	        } else {
	            mega.Share.initCopyrightsDialog([h]);
	        }
	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }
	    },
	    _removeLink: function _removeLink(h, e) {
	        if (u_type === 0) {
	            ephemeralDialog(l[1005]);
	        } else {
	            var exportLink = new mega.Share.ExportLink({ 'updateUI': true, 'nodesToProcess': [h] });
	            exportLink.removeExportLink();
	        }

	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }
	    },

	    _startPreview: function _startPreview(v, e) {
	        if ($(e && e.target).is('.tiny-button')) {

	            return;
	        }
	        var chatRoom = this.props.message.chatRoom;
	        assert(M.chat, 'Not in chat.');
	        chatRoom._rebuildAttachmentsImmediate();

	        if (is_video(v)) {
	            $.autoplay = v.h;
	        }
	        slideshow(v.h, undefined, true);
	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }
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
	        var subMessageComponent = [];

	        var extraPreButtons = [];

	        if (this.props.className) {
	            additionalClasses += this.props.className;
	        }

	        if (message.revoked) {

	            return null;
	        }

	        if (message instanceof Message) {
	            if (!message.wasRendered || !message.messageHtml) {

	                message.messageHtml = htmlentities(message.textContents).replace(/\n/gi, "<br/>");

	                message.processedBy = {};

	                var evtObj = {
	                    message: message,
	                    room: chatRoom
	                };

	                megaChat.trigger('onPreBeforeRenderMessage', evtObj);
	                var event = new $.Event("onBeforeRenderMessage");
	                megaChat.trigger(event, evtObj);
	                megaChat.trigger('onPostBeforeRenderMessage', evtObj);

	                if (event.isPropagationStopped()) {
	                    self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
	                    return false;
	                }
	                message.wasRendered = 1;
	            }

	            textMessage = message.messageHtml;

	            if (message instanceof Message || typeof message.userId !== 'undefined' && message.userId === u_handle) {
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
	                                if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
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
	                displayName = generateAvatarMeta(contact.u).fullName;
	            } else {
	                displayName = contact;
	            }

	            var textContents = message.textContents || false;

	            if (textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
	                if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
	                    attachmentMeta = message.getAttachmentMeta() || [];

	                    var files = [];

	                    self.attachments = [];

	                    attachmentMeta.forEach(function (v, attachmentKey) {
	                        self.attachments.push(v);

	                        var attachmentMetaInfo;

	                        if (message.messageId) {
	                            if (chatRoom.attachments && chatRoom.attachments[v.h] && chatRoom.attachments[v.h][message.messageId]) {
	                                attachmentMetaInfo = chatRoom.attachments[v.h][message.messageId];
	                            } else {

	                                return;
	                            }
	                        }

	                        if (attachmentMetaInfo.revoked) {

	                            return;
	                        }

	                        var icon = fileIcon(v);
	                        var isImage = is_image2(v);
	                        var isVideo = is_video(v) > 0;
	                        var showThumbnail = v.fa && isImage || String(v.fa).indexOf(':0*') > 0;
	                        var isPreviewable = isImage || isVideo;

	                        var dropdown = null;
	                        var noThumbPrev = '';
	                        var previewButton = null;

	                        if (showThumbnail || isImage) {
	                            var imagesListKey = message.messageId + "_" + v.h;
	                            if (!chatRoom.images.exists(imagesListKey)) {
	                                v.id = imagesListKey;
	                                v.orderValue = message.orderValue;
	                                v.messageId = message.messageId;
	                                chatRoom.images.push(v);
	                            }
	                        }

	                        if (isPreviewable) {
	                            if (!showThumbnail) {
	                                noThumbPrev = 'no-thumb-prev';
	                            }
	                            var previewLabel = isVideo ? l[17732] : l[1899];
	                            previewButton = React.makeElement(
	                                'span',
	                                { key: 'previewButton' },
	                                React.makeElement(DropdownsUI.DropdownItem, { icon: 'search-icon', label: previewLabel,
	                                    onClick: self._startPreview.bind(self, v) })
	                            );
	                        }

	                        if (contact.u === u_handle) {
	                            dropdown = React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: 'default-white-button tiny-button',
	                                    icon: 'tiny-icon icons-sprite grey-dots' },
	                                React.makeElement(DropdownsUI.Dropdown, {
	                                    ref: function ref(refObj) {
	                                        self.dropdown = refObj;
	                                    },
	                                    className: 'white-context-menu attachments-dropdown',
	                                    noArrow: true,
	                                    positionMy: 'left top',
	                                    positionAt: 'left bottom',
	                                    horizOffset: -4,
	                                    vertOffset: 3,
	                                    onBeforeActiveChange: function onBeforeActiveChange(newState) {
	                                        if (newState === true) {
	                                            self.forceUpdate();
	                                        }
	                                    },
	                                    dropdownItemGenerator: function dropdownItemGenerator(dd) {
	                                        var linkButtons = [];
	                                        var firstGroupOfButtons = [];
	                                        var revokeButton = null;
	                                        var downloadButton = null;

	                                        if (message.isEditable && message.isEditable()) {
	                                            revokeButton = React.makeElement(DropdownsUI.DropdownItem, { icon: 'red-cross',
	                                                label: __(l[83]),
	                                                className: 'red',
	                                                onClick: function onClick() {
	                                                    chatRoom.megaChat.plugins.chatdIntegration.updateMessage(chatRoom, message.internalId || message.orderValue, "");
	                                                } });
	                                        }

	                                        if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
	                                            dbfetch.get(v.h).always(function () {
	                                                if (!M.d[v.h]) {
	                                                    NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
	                                                    dd.doRerender();
	                                                } else {
	                                                    dd.doRerender();
	                                                }
	                                            });
	                                            return React.makeElement(
	                                                'span',
	                                                null,
	                                                l[5533]
	                                            );
	                                        } else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
	                                            downloadButton = React.makeElement(DropdownsUI.DropdownItem, {
	                                                icon: 'rounded-grey-down-arrow',
	                                                label: __(l[1187]),
	                                                onClick: self._startDownload.bind(self, v) });

	                                            self._addLinkButtons(v.h, linkButtons);

	                                            firstGroupOfButtons.push(React.makeElement(DropdownsUI.DropdownItem, { icon: 'context info', label: __(l[6859]),
	                                                key: 'infoDialog',
	                                                onClick: function onClick() {
	                                                    $.selected = [v.h];
	                                                    propertiesDialog();
	                                                } }));

	                                            self._addFavouriteButtons(v.h, firstGroupOfButtons);

	                                            linkButtons.push(React.makeElement(DropdownsUI.DropdownItem, { icon: 'small-icon conversations',
	                                                label: __(l[17764]),
	                                                key: 'sendToChat',
	                                                onClick: function onClick() {
	                                                    $.selected = [v.h];
	                                                    openCopyDialog('conversations');
	                                                } }));
	                                        }

	                                        if (!previewButton && firstGroupOfButtons.length === 0 && !downloadButton && linkButtons.length === 0 && !revokeButton) {
	                                            return null;
	                                        }

	                                        if (previewButton && (firstGroupOfButtons.length > 0 || downloadButton || linkButtons.length > 0 || revokeButton)) {
	                                            previewButton = [previewButton, React.makeElement('hr', { key: 'preview-sep' })];
	                                        }

	                                        return React.makeElement(
	                                            'div',
	                                            null,
	                                            previewButton,
	                                            firstGroupOfButtons,
	                                            firstGroupOfButtons && firstGroupOfButtons.length > 0 ? React.makeElement('hr', null) : "",
	                                            downloadButton,
	                                            linkButtons,
	                                            revokeButton && downloadButton ? React.makeElement('hr', null) : "",
	                                            revokeButton
	                                        );
	                                    }
	                                })
	                            );
	                        } else {
	                            dropdown = React.makeElement(
	                                ButtonsUI.Button,
	                                {
	                                    className: 'default-white-button tiny-button',
	                                    icon: 'tiny-icon icons-sprite grey-dots' },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: 'white-context-menu attachments-dropdown',
	                                        noArrow: true,
	                                        positionMy: 'left top',
	                                        positionAt: 'left bottom',
	                                        horizOffset: -4,
	                                        vertOffset: 3
	                                    },
	                                    previewButton,
	                                    React.makeElement('hr', null),
	                                    React.makeElement(DropdownsUI.DropdownItem, { icon: 'rounded-grey-down-arrow', label: __(l[1187]),
	                                        onClick: self._startDownload.bind(self, v) }),
	                                    React.makeElement(DropdownsUI.DropdownItem, { icon: 'grey-cloud', label: __(l[1988]),
	                                        onClick: self._addToCloudDrive.bind(self, v, false) }),
	                                    React.makeElement(DropdownsUI.DropdownItem, { icon: 'conversations', label: __(l[17764]),
	                                        onClick: self._addToCloudDrive.bind(self, v, true) })
	                                )
	                            );
	                        }

	                        var attachmentClasses = "message shared-data";
	                        var preview = React.makeElement(
	                            'div',
	                            { className: "data-block-view medium " + noThumbPrev,
	                                onClick: isPreviewable && self._startPreview.bind(self, v) },
	                            dropdown,
	                            React.makeElement(
	                                'div',
	                                { className: 'data-block-bg' },
	                                React.makeElement('div', { className: "block-view-file-type " + icon })
	                            )
	                        );

	                        if (M.chat && showThumbnail && !message.revoked) {
	                            var src = chatRoom.getCachedImageURI(v);

	                            if (!src) {
	                                v.seen = 1;
	                                chatRoom.loadImage(v);
	                                src = window.noThumbURI || '';
	                            }
	                            if (!v.imgId) {
	                                v.imgId = "thumb" + message.messageId + "_" + attachmentKey + "_" + v.h;
	                            }

	                            var thumbClass = src === window.noThumbURI ? " no-thumb" : "";
	                            var thumbOverlay = null;

	                            if (isImage) {
	                                thumbClass = thumbClass + " image";
	                                thumbOverlay = React.makeElement('div', { className: 'thumb-overlay',
	                                    onClick: self._startPreview.bind(self, v) });
	                            } else {
	                                thumbClass = thumbClass + " video " + (isPreviewable ? " previewable" : "non-previewable");
	                                thumbOverlay = React.makeElement(
	                                    'div',
	                                    { className: 'thumb-overlay',
	                                        onClick: isPreviewable && self._startPreview.bind(self, v) },
	                                    isPreviewable && React.makeElement('div', { className: 'play-video-button' }),
	                                    React.makeElement(
	                                        'div',
	                                        { className: 'video-thumb-details' },
	                                        v.playtime && React.makeElement('i', { className: 'small-icon small-play-icon' }),
	                                        React.makeElement(
	                                            'span',
	                                            null,
	                                            secondsToTimeShort(v.playtime || -1)
	                                        )
	                                    )
	                                );
	                            }

	                            preview = src ? React.makeElement(
	                                'div',
	                                { id: v.imgId, className: "shared-link thumb " + thumbClass },
	                                thumbOverlay,
	                                dropdown,
	                                React.makeElement('img', { alt: '', className: "thumbnail-placeholder " + v.h, src: src,
	                                    key: src === window.noThumbURI ? v.imgId : src,
	                                    onClick: isPreviewable && self._startPreview.bind(self, v)
	                                })
	                            ) : preview;
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
	                                    __(l[17669]),
	                                    React.makeElement(
	                                        'span',
	                                        { className: 'file-name' },
	                                        v.name
	                                    )
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
	                        avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message avatar-wrapper small-rounded-avatar' });
	                        datetime = React.makeElement(
	                            'div',
	                            { className: 'message date-time',
	                                title: time2date(timestampInt) },
	                            timestamp
	                        );
	                        name = React.makeElement(ContactsUI.ContactButton, { contact: contact, className: 'message', label: displayName });
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
	                } else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
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

	                        if (message.userId === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT) {
	                            deleteButtonOptional = React.makeElement(DropdownsUI.DropdownItem, {
	                                icon: 'red-cross',
	                                label: l[83],
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
	                                    icon: 'tiny-icon icons-sprite grey-dots' },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: 'white-context-menu shared-contact-dropdown',
	                                        noArrow: true,
	                                        positionMy: 'left bottom',
	                                        positionAt: 'right bottom',
	                                        horizOffset: 4
	                                    },
	                                    React.makeElement(
	                                        'div',
	                                        { className: 'dropdown-avatar rounded' },
	                                        React.makeElement(ContactsUI.ContactPresence, { className: 'small', contact: contact }),
	                                        React.makeElement(ContactsUI.Avatar, { className: 'avatar-wrapper context-avatar', contact: contact }),
	                                        React.makeElement(
	                                            'div',
	                                            { className: 'dropdown-user-name' },
	                                            M.getNameByHandle(contact.u)
	                                        )
	                                    ),
	                                    React.makeElement(ContactsUI.ContactFingerprint, { contact: contact }),
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
	                                    icon: 'tiny-icon icons-sprite grey-dots' },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: 'white-context-menu shared-contact-dropdown',
	                                        noArrow: true,
	                                        positionMy: 'left bottom',
	                                        positionAt: 'right bottom',
	                                        horizOffset: 4
	                                    },
	                                    React.makeElement(
	                                        'div',
	                                        { className: 'dropdown-avatar rounded' },
	                                        React.makeElement(ContactsUI.ContactPresence, { className: 'small', contact: contact }),
	                                        React.makeElement(ContactsUI.Avatar, { className: 'avatar-wrapper context-avatar', contact: contact }),
	                                        React.makeElement(
	                                            'div',
	                                            { className: 'dropdown-user-name' },
	                                            M.getNameByHandle(contact.u)
	                                        )
	                                    ),
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
	                                M.u[contact.u] ? React.makeElement(ContactsUI.ContactVerified, { className: 'right-align', contact: contact }) : null,
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
	                                    { className: 'data-block-view semi-big' },
	                                    M.u[contact.u] ? React.makeElement(ContactsUI.ContactPresence, { className: 'small', contact: contact }) : null,
	                                    dropdown,
	                                    React.makeElement(ContactsUI.Avatar, { className: 'avatar-wrapper medium-avatar', contact: contact })
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
	                        avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message avatar-wrapper small-rounded-avatar' });
	                        datetime = React.makeElement(
	                            'div',
	                            { className: 'message date-time',
	                                title: time2date(timestampInt) },
	                            timestamp
	                        );
	                        name = React.makeElement(ContactsUI.ContactButton, { contact: contact, className: 'message', label: displayName });
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
	                } else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {

	                    return null;
	                } else {
	                    chatRoom.logger.warn("Invalid 2nd byte for a management message: ", textContents);
	                    return null;
	                }
	            } else {

	                if (message.textContents === "" && !message.dialogType) {
	                    message.deleted = true;
	                }

	                if (!message.deleted) {
	                    if (message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW) {
	                        if (!message.meta.requiresConfirmation) {
	                            subMessageComponent.push(React.makeElement(MetaRichpreview, {
	                                key: "richprev",
	                                message: message,
	                                chatRoom: chatRoom
	                            }));
	                            if (message.isEditable()) {
	                                if (!message.meta.isLoading) {
	                                    extraPreButtons.push(React.makeElement(DropdownsUI.DropdownItem, {
	                                        key: 'remove-link-preview',
	                                        icon: 'icons-sprite bold-crossed-eye',
	                                        label: l[18684],
	                                        className: '',
	                                        onClick: function onClick(e) {
	                                            e.stopPropagation();
	                                            e.preventDefault();

	                                            chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
	                                        }
	                                    }));
	                                } else {

	                                    extraPreButtons.push(React.makeElement(DropdownsUI.DropdownItem, {
	                                        icon: 'icons-sprite bold-crossed-eye',
	                                        key: 'stop-link-preview',
	                                        label: l[18684],
	                                        className: '',
	                                        onClick: function onClick(e) {
	                                            e.stopPropagation();
	                                            e.preventDefault();

	                                            chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
	                                        }
	                                    }));
	                                }
	                            }
	                        } else if (!self.isBeingEdited()) {
	                            if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
	                                additionalClasses += " preview-requires-confirmation-container";
	                                subMessageComponent.push(React.makeElement(MetaRichpreviewConfirmation, {
	                                    key: "confirm",
	                                    message: message,
	                                    chatRoom: chatRoom
	                                }));
	                            } else {
	                                extraPreButtons.push(React.makeElement(DropdownsUI.DropdownItem, {
	                                    key: 'insert-link-preview',
	                                    icon: 'icons-sprite bold-eye',
	                                    label: l[18683],
	                                    className: '',
	                                    onClick: function onClick(e) {
	                                        e.stopPropagation();
	                                        e.preventDefault();

	                                        chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
	                                    }
	                                }));
	                            }
	                        }
	                    }
	                    if (message.megaLinks) {
	                        subMessageComponent.push(React.makeElement(MetaRichpreviewMegaLinks, {
	                            key: "richprevml",
	                            message: message,
	                            chatRoom: chatRoom
	                        }));
	                    }
	                }

	                var messageActionButtons = null;
	                if (message.getState() === Message.STATE.NOT_SENT || message.getState() === Message.STATE.NOT_SENT_EXPIRED) {
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
	                            if (self.isBeingEdited() !== true) {
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
	                    avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: 'message avatar-wrapper small-rounded-avatar' });
	                    datetime = React.makeElement(
	                        'div',
	                        { className: 'message date-time',
	                            title: time2date(timestampInt) },
	                        timestamp
	                    );
	                    name = React.makeElement(ContactsUI.ContactButton, { contact: contact, className: 'message', label: displayName });
	                }

	                var messageDisplayBlock;
	                if (self.isBeingEdited() === true) {
	                    var msgContents = message.textContents;
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
	                                        'textContents': messageContents
	                                    };
	                                    megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
	                                    self.props.onEditDone(tmpMessageObj.textContents);
	                                    if (self.isMounted()) {
	                                        self.forceUpdate();
	                                    }
	                                });
	                            }

	                            return true;
	                        }
	                    });
	                } else if (message.deleted) {
	                    return null;
	                } else {
	                    if (message.updated > 0 && !message.metaType) {
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
	                    if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && self.isBeingEdited() !== true && chatRoom.isReadOnly() === false && !message.requiresManualRetry) {
	                        messageActionButtons = React.makeElement(
	                            ButtonsUI.Button,
	                            {
	                                className: 'default-white-button tiny-button',
	                                icon: 'tiny-icon icons-sprite grey-dots' },
	                            React.makeElement(
	                                DropdownsUI.Dropdown,
	                                {
	                                    className: 'white-context-menu attachments-dropdown',
	                                    noArrow: true,
	                                    positionMy: 'left bottom',
	                                    positionAt: 'right bottom',
	                                    horizOffset: 4
	                                },
	                                extraPreButtons,
	                                React.makeElement(DropdownsUI.DropdownItem, {
	                                    icon: 'icons-sprite writing-pencil',
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
	                        subMessageComponent,
	                        buttonsBlock,
	                        spinnerElement
	                    )
	                );
	            }
	        } else if (message.type) {
	            textMessage = getMessageString(message.type);
	            if (!textMessage) {
	                console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
	                return;
	            }

	            if (textMessage.splice) {
	                textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage, true);
	            } else {
	                textMessage = textMessage.replace("[X]", htmlentities(M.getNameByHandle(contact.u)));
	            }

	            message.textContents = textMessage;

	            if (message.type === "call-rejected") {
	                message.cssClass = "handset-with-stop";
	            } else if (message.type === "call-missed") {
	                message.cssClass = "handset-with-yellow-arrow";
	            } else if (message.type === "call-handled-elsewhere") {
	                message.cssClass = "handset-with-up-arrow";
	            } else if (message.type === "call-failed") {
	                message.cssClass = "handset-with-cross";
	            } else if (message.type === "call-timeout") {
	                message.cssClass = "horizontal-handset";
	            } else if (message.type === "call-failed-media") {
	                message.cssClass = "handset-with-yellow-cross";
	            } else if (message.type === "call-canceled") {
	                message.cssClass = "crossed-handset";
	            } else if (message.type === "call-ended") {
	                message.cssClass = "horizontal-handset";
	            } else if (message.type === "call-feedback") {
	                message.cssClass = "diagonal-handset";
	            } else if (message.type === "call-starting") {
	                message.cssClass = "diagonal-handset";
	            } else if (message.type === "call-initialising") {
	                message.cssClass = "diagonal-handset";
	            } else if (message.type === "call-started") {
	                message.cssClass = "diagonal-handset";
	            } else if (message.type === "incoming-call") {
	                message.cssClass = "handset-with-down-arrow";
	            } else if (message.type === "outgoing-call") {
	                message.cssClass = "handset-with-up-arrow";
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
	                    { className: 'feedback call-status-block' },
	                    React.makeElement('i', { className: "call-icon " + message.cssClass })
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

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

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
	        if (contact && contact.addChangeListener && !self._contactChangeListener) {
	            self._contactChangeListener = contact.addChangeListener(function (contact, oldData, k, v) {
	                if (k === "ts") {

	                    return;
	                }
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

	        return Message.getContactForMessage(message);
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

	        if (timestampInt && message.updated && message.updated > 0) {
	            timestampInt += message.updated;
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

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;
	var MetaRichPreviewLoading = __webpack_require__(25).MetaRichpreviewLoading;

	var MetaRichpreview = React.createClass({
	    displayName: "MetaRichpreview",

	    mixins: [ConversationMessageMixin],
	    getBase64Url: function getBase64Url(b64incoming) {
	        if (!b64incoming || !b64incoming.split) {
	            return;
	        }
	        var exti = b64incoming.split(":");
	        var b64i = exti[1];
	        exti = exti[0];
	        return "data:image/" + exti + ";base64," + b64i;
	    },
	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;

	        var output = [];

	        var metas = message.meta && message.meta.extra ? message.meta.extra : [];
	        var failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 60 * 5;
	        var isLoading = !!message.meta.isLoading;
	        if (failedToLoad) {
	            return null;
	        }

	        for (var i = 0; i < metas.length; i++) {
	            var meta = metas[i];

	            if (!meta.d && !meta.t && !message.meta.isLoading) {
	                continue;
	            }
	            var previewCss = {};
	            if (meta.i) {
	                previewCss['backgroundImage'] = "url(" + self.getBase64Url(meta.i) + ")";
	                previewCss['backgroundRepeat'] = "no-repeat";
	                previewCss['backgroundPosition'] = "center center";
	            }

	            var previewContainer = undefined;

	            if (isLoading) {
	                previewContainer = React.makeElement(MetaRichPreviewLoading, { message: message, isLoading: message.meta.isLoading });
	            } else {
	                var domainName = meta.url;
	                domainName = domainName.replace("https://", "").replace("http://", "").split("/")[0];
	                previewContainer = React.makeElement(
	                    "div",
	                    { className: "message richpreview body" },
	                    meta.i ? React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        React.makeElement("div", { className: "message richpreview preview", style: previewCss })
	                    ) : undefined,
	                    React.makeElement(
	                        "div",
	                        { className: "message richpreview inner-wrapper" },
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview data-title" },
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview title" },
	                                meta.t
	                            )
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview desc" },
	                            ellipsis(meta.d, 'end', 82)
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview url-container" },
	                            meta.ic ? React.makeElement(
	                                "span",
	                                { className: "message richpreview url-favicon" },
	                                React.makeElement("img", { src: self.getBase64Url(meta.ic), width: 16, height: 16,
	                                    onError: function onError(e) {
	                                        e.target.parentNode.removeChild(e.target);
	                                    },
	                                    alt: ""
	                                })
	                            ) : "",
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview url" },
	                                domainName
	                            )
	                        )
	                    )
	                );
	            }

	            output.push(React.makeElement(
	                "div",
	                { key: meta.url, className: "message richpreview container " + (meta.i ? "have-preview" : "no-preview") + " " + (meta.d ? "have-description" : "no-description") + " " + (isLoading ? "is-loading" : "done-loading"),
	                    onClick: function (url) {
	                        if (!message.meta.isLoading) {
	                            window.open(url, "_blank");
	                        }
	                    }.bind(this, meta.url) },
	                previewContainer,
	                React.makeElement("div", { className: "clear" })
	            ));
	        }
	        return React.makeElement(
	            "div",
	            { className: "message richpreview previews-container" },
	            output
	        );
	    }
	});

	module.exports = {
	    MetaRichpreview: MetaRichpreview
	};

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;

	var MetaRichpreviewLoading = React.createClass({
	    displayName: "MetaRichpreviewLoading",

	    mixins: [ConversationMessageMixin],
	    render: function render() {
	        return React.makeElement(
	            "div",
	            { className: "loading-spinner light small" },
	            React.makeElement("div", { className: "main-loader" })
	        );
	    }
	});

	module.exports = {
	    MetaRichpreviewLoading: MetaRichpreviewLoading
	};

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

	var MetaRichpreviewConfirmation = React.createClass({
	    displayName: "MetaRichpreviewConfirmation",

	    mixins: [ConversationMessageMixin],
	    doAllow: function doAllow() {
	        var self = this;
	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;

	        delete message.meta.requiresConfirmation;
	        RichpreviewsFilter.confirmationDoConfirm();
	        megaChat.plugins.richpreviewsFilter.processMessage({}, message);
	        message.trackDataChange();
	    },
	    doNotNow: function doNotNow() {
	        var self = this;
	        var message = this.props.message;
	        delete message.meta.requiresConfirmation;
	        RichpreviewsFilter.confirmationDoNotNow();
	        message.trackDataChange();
	    },
	    doNever: function doNever() {
	        var self = this;
	        var message = this.props.message;
	        msgDialog('confirmation', l[870], l[18687], '', function (e) {
	            if (e) {
	                delete message.meta.requiresConfirmation;
	                RichpreviewsFilter.confirmationDoNever();
	                message.trackDataChange();
	            } else {}
	        });
	    },
	    render: function render() {
	        var self = this;

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;

	        var notNowButton = null;
	        var neverButton = null;

	        if (RichpreviewsFilter.confirmationCount >= 2) {
	            neverButton = React.makeElement(
	                "div",
	                { className: "default-white-button small-text small right red",
	                    onClick: function onClick(e) {
	                        self.doNever();
	                    } },
	                React.makeElement(
	                    "span",
	                    null,
	                    l[1051]
	                )
	            );
	        }

	        notNowButton = React.makeElement(
	            "div",
	            { className: "default-white-button small-text small grey-txt right",
	                onClick: function onClick(e) {
	                    self.doNotNow();
	                } },
	            React.makeElement(
	                "span",
	                null,
	                l[18682]
	            )
	        );

	        return React.makeElement(
	            "div",
	            { className: "message richpreview previews-container" },
	            React.makeElement(
	                "div",
	                { className: "message richpreview container confirmation" },
	                React.makeElement(
	                    "div",
	                    { className: "message richpreview body" },
	                    React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        React.makeElement("div", { className: "message richpreview preview confirmation-icon" })
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "message richpreview inner-wrapper" },
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview data-title" },
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview title" },
	                                l[18679]
	                            )
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview desc" },
	                            l[18680]
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "buttons-block" },
	                            React.makeElement(
	                                "div",
	                                { className: "default-grey-button small-text small right", onClick: function onClick(e) {
	                                        self.doAllow();
	                                    } },
	                                React.makeElement(
	                                    "span",
	                                    null,
	                                    l[18681]
	                                )
	                            ),
	                            notNowButton,
	                            neverButton
	                        )
	                    )
	                ),
	                React.makeElement("div", { className: "clear" })
	            )
	        );
	    }
	});

	module.exports = {
	    MetaRichpreviewConfirmation: MetaRichpreviewConfirmation
	};

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;
	var MetaRichPreviewLoading = __webpack_require__(25).MetaRichpreviewLoading;

	var MetaRichpreviewMegaLinks = React.createClass({
	    displayName: "MetaRichpreviewMegaLinks",

	    mixins: [ConversationMessageMixin],
	    render: function render() {
	        var self = this;
	        var cssClasses = "message body";

	        var message = this.props.message;
	        var megaChat = this.props.message.chatRoom.megaChat;
	        var chatRoom = this.props.message.chatRoom;
	        var previewContainer;

	        var output = [];

	        var megaLinks = message.megaLinks && message.megaLinks ? message.megaLinks : [];
	        for (var i = 0; i < megaLinks.length; i++) {
	            var megaLinkInfo = megaLinks[i];
	            if (megaLinkInfo.failed) {
	                continue;
	            }

	            if (megaLinkInfo.hadLoaded() === false) {
	                if (megaLinkInfo.startedLoading() === false) {
	                    megaLinkInfo.getInfo().always(function () {
	                        message.trackDataChange();
	                    });
	                }

	                previewContainer = React.makeElement(MetaRichPreviewLoading, { message: message, isLoading: megaLinkInfo.hadLoaded() });
	            } else {
	                var desc;

	                var is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

	                if (!megaLinkInfo.is_dir) {
	                    desc = bytesToSize(megaLinkInfo.info.size);
	                } else {
	                    if (!megaLinkInfo.info || !megaLinkInfo.info.s) {
	                        debugger;
	                    }
	                    desc = React.makeElement(
	                        "span",
	                        null,
	                        fm_contains(megaLinkInfo.info.s[1], megaLinkInfo.info.s[2] - 1),
	                        React.makeElement("br", null),
	                        bytesToSize(megaLinkInfo.info.size)
	                    );
	                }

	                previewContainer = React.makeElement(
	                    "div",
	                    { className: "message richpreview body " + (is_icon ? "have-icon" : "no-icon") },
	                    megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ? React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        React.makeElement("div", { className: "message richpreview preview",
	                            style: { "backgroundImage": 'url(' + megaLinkInfo.info.preview_url + ')' } })
	                    ) : React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        React.makeElement("div", { className: "message richpreview icon block-view-file-type " + (megaLinkInfo.is_dir ? "folder" : fileIcon(megaLinkInfo.info)) })
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "message richpreview inner-wrapper" },
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview data-title" },
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview title" },
	                                megaLinkInfo.info.name
	                            )
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview desc" },
	                            desc
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "message richpreview url-container" },
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview url-favicon" },
	                                React.makeElement("img", { src: "https://mega.nz/favicon.ico?v=3&c=1", width: 16, height: 16,
	                                    onError: function onError(e) {
	                                        e.target.parentNode.removeChild(e.target);
	                                    },
	                                    alt: ""
	                                })
	                            ),
	                            React.makeElement(
	                                "span",
	                                { className: "message richpreview url" },
	                                ellipsis(megaLinkInfo.getLink(), 'end', 40)
	                            )
	                        )
	                    )
	                );
	            }

	            output.push(React.makeElement(
	                "div",
	                { key: megaLinkInfo.node_key + "_" + output.length, className: "message richpreview container " + (megaLinkInfo.havePreview() ? "have-preview" : "no-preview") + " " + (megaLinkInfo.d ? "have-description" : "no-description") + " " + (!megaLinkInfo.hadLoaded() ? "is-loading" : "done-loading"),
	                    onClick: function (url) {
	                        if (megaLinkInfo.hadLoaded()) {
	                            window.open(url, "_blank");
	                        }
	                    }.bind(this, megaLinkInfo.getLink()) },
	                previewContainer,
	                React.makeElement("div", { className: "clear" })
	            ));
	        }
	        return React.makeElement(
	            "div",
	            { className: "message richpreview previews-container" },
	            output
	        );
	    }
	});

	module.exports = {
	    MetaRichpreviewMegaLinks: MetaRichpreviewMegaLinks
	};

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

	var AlterParticipantsConversationMessage = React.createClass({
	    displayName: "AlterParticipantsConversationMessage",

	    mixins: [ConversationMessageMixin],

	    _ensureNameIsLoaded: function _ensureNameIsLoaded(h) {
	        var self = this;
	        var contact = M.u[h] ? M.u[h] : {
	            'u': h,
	            'h': h,
	            'c': 0
	        };
	        var displayName = generateAvatarMeta(contact.u).fullName;

	        if (!displayName) {
	            M.u.addChangeListener(function () {
	                displayName = generateAvatarMeta(contact.u).fullName;
	                if (displayName) {
	                    self.safeForceUpdate();

	                    return 0xDEAD;
	                }
	            });
	        }
	    },
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
	            displayName = generateAvatarMeta(contact.u).fullName;
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

	            var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact,
	                className: "message avatar-wrapper small-rounded-avatar" });
	            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

	            var text = __(l[8907]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

	            self._ensureNameIsLoaded(otherContact.u);
	            messages.push(React.makeElement(
	                "div",
	                { className: "message body", "data-id": "id" + message.messageId, key: h },
	                avatar,
	                React.makeElement(
	                    "div",
	                    { className: "message content-area small-info-txt" },
	                    React.makeElement(ContactsUI.ContactButton, { contact: otherContact, className: "message", label: otherDisplayName }),
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

	            var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact,
	                className: "message avatar-wrapper small-rounded-avatar" });
	            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

	            self._ensureNameIsLoaded(otherContact.u);

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
	                    React.makeElement(ContactsUI.ContactButton, { contact: otherContact, className: "message", label: otherDisplayName }),
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

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

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
	            displayName = generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var avatar = null;
	        if (this.props.grouped) {
	            cssClasses += " grouped";
	        } else {
	            avatar = React.makeElement(ContactsUI.Avatar, { contact: contact,
	                className: "message avatar-wrapper small-rounded-avatar" });
	            datetime = React.makeElement(
	                "div",
	                { className: "message date-time",
	                    title: time2date(timestampInt) },
	                timestamp
	            );
	            name = React.makeElement(ContactsUI.ContactButton, { contact: contact, className: "message", label: displayName });
	        }

	        return React.makeElement(
	            "div",
	            { className: cssClasses, "data-id": "id" + message.messageId, key: message.messageId },
	            avatar,
	            React.makeElement(
	                "div",
	                { className: "message content-area small-info-txt" },
	                React.makeElement(ContactsUI.ContactButton, { contact: contact, className: "message", label: displayName }),
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

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

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
	            displayName = generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var messages = [];

	        var otherContact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
	            'u': message.meta.targetUserId,
	            'h': message.meta.targetUserId,
	            'c': 0
	        };

	        var avatar = React.makeElement(ContactsUI.Avatar, { contact: otherContact,
	            className: "message avatar-wrapper small-rounded-avatar" });
	        var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

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
	                React.makeElement(ContactsUI.ContactButton, { contact: otherContact, className: "message", label: otherDisplayName }),
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

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(23).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

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
	            displayName = generateAvatarMeta(contact.u).fullName;
	        } else {
	            displayName = contact;
	        }

	        var messages = [];

	        var avatar = React.makeElement(ContactsUI.Avatar, { contact: contact,
	            className: "message avatar-wrapper small-rounded-avatar" });

	        var topic = message.meta.topic;

	        var text = __(l[9081]).replace("%s", '<strong className="dark-grey-txt">"' + megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(topic)) + '"</strong>');

	        messages.push(React.makeElement(
	            "div",
	            { className: "message body", "data-id": "id" + message.messageId, key: message.messageId },
	            avatar,
	            React.makeElement(
	                "div",
	                { className: "message content-area small-info-txt" },
	                React.makeElement(ContactsUI.ContactButton, { contact: contact, className: "message", label: displayName }),
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

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var utils = __webpack_require__(33);
	var React = __webpack_require__(2);
	var ConversationPanelUI = __webpack_require__(12);

	var ChatRoom = function ChatRoom(megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl) {
	    var self = this;

	    this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);

	    this.megaChat = megaChat;

	    MegaDataObject.attachToExistingJSObject(this, {
	        state: null,
	        users: [],
	        attachments: null,
	        roomId: null,
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
	        topic: "",
	        flags: 0x00,
	        archivedSelected: false
	    }, true);

	    this.roomId = roomId;
	    this.instanceIndex = ChatRoom.INSTANCE_INDEX++;
	    this.type = type;
	    this.ctime = ctime;
	    this.lastActivity = lastActivity ? lastActivity : 0;
	    this.chatId = chatId;
	    this.chatIdBin = chatId ? base64urldecode(chatId) : "";

	    this.chatShard = chatShard;
	    this.chatdUrl = chatdUrl;

	    this.callRequest = null;
	    this.callIsActive = false;
	    this.shownMessages = {};
	    this.attachments = new MegaDataMap(this);
	    this.images = new MegaDataSortedMap("id", "orderValue", this);
	    this.images.addChangeListener(function () {
	        if (slideshowid) {
	            self._rebuildAttachments();
	        }
	    });

	    this._imagesLoading = Object.create(null);
	    this._imagesToBeLoaded = Object.create(null);
	    this._mediaAttachmentsCache = Object.create(null);

	    self.members = {};

	    if (type === "private") {
	        users.forEach(function (userHandle) {
	            self.members[userHandle] = 3;
	        });
	    } else {
	        users.forEach(function (userHandle) {

	            self.members[userHandle] = 0;
	        });
	    }

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

	    if (d) {
	        this.bind('onStateChange', function (e, oldState, newState) {
	            self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));
	        });
	    }

	    self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
	        var ts = msg.delay ? msg.delay : msg.ts;
	        if (!ts) {
	            return;
	        }

	        if (self.lastActivity && self.lastActivity >= ts) {

	            return;
	        }

	        self.lastActivity = ts;

	        if (msg.userId === u_handle) {
	            self.didInteraction(u_handle, ts);
	            return;
	        }

	        if (self.type === "private") {
	            var targetUserId = self.getParticipantsExceptMe()[0];

	            var targetUserNode;
	            if (M.u[targetUserId]) {
	                targetUserNode = M.u[targetUserId];
	            } else if (msg.userId) {
	                targetUserNode = M.u[msg.userId];
	            } else {
	                console.error("Missing participant in a 1on1 room.");
	                return;
	            }

	            assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
	            assert(M.u[targetUserNode.u], 'User not found in M.u');

	            if (targetUserNode) {
	                self.didInteraction(targetUserNode.u, self.lastActivity);
	            }
	        } else if (self.type === "group") {
	            var contactHash;
	            if (msg.authorContact) {
	                contactHash = msg.authorContact.h;
	            } else if (msg.userId) {
	                contactHash = msg.userId;
	            } else if (msg.getFromJid) {
	                debugger;
	                contactHash = megaChat.getContactHashFromJid(msg.getFromJid());
	            }

	            if (contactHash && M.u[contactHash]) {
	                self.didInteraction(contactHash, self.lastActivity);
	            }
	            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');
	        } else {
	            throw new Error("Not implemented");
	        }
	    });

	    var membersSnapshot = {};
	    self.rebind('onMembersUpdated.chatRoomMembersSync', function (e, eventData) {
	        var roomRequiresUpdate = false;

	        if (eventData.userId === u_handle) {
	            self.messagesBuff.joined = true;
	            if (self.state === ChatRoom.STATE.JOINING) {
	                self.setState(ChatRoom.STATE.READY);
	            }
	            roomRequiresUpdate = true;
	        }

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
	            if (contact && contact.addChangeListener) {
	                membersSnapshot[u_h] = contact.addChangeListener(function () {
	                    self.trackDataChange();
	                });
	            }
	        });
	        if (roomRequiresUpdate) {
	            self.trackDataChange();
	        }
	    });

	    self.getParticipantsExceptMe().forEach(function (userHandle) {
	        var contact = M.u[userHandle];
	        if (contact) {
	            getLastInteractionWith(contact.u);
	        }
	    });

	    self.megaChat.trigger('onRoomCreated', [self]);

	    $(window).rebind("focus." + self.roomId, function () {
	        if (self.isCurrentlyActive) {
	            self.trigger("onChatShown");
	        }
	    });

	    self.megaChat.rebind("onRoomDestroy." + self.roomId, function (e, room) {
	        if (room.roomId == self.roomId) {
	            $(window).unbind("focus." + self.roomId);
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

	ChatRoom.INSTANCE_INDEX = 0;
	ChatRoom.ARCHIVED = 0x01;

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

	ChatRoom.prototype.isArchived = function () {
	    var self = this;
	    return self.flags & ChatRoom.ARCHIVED;
	};

	ChatRoom.prototype.isDisplayable = function () {
	    var self = this;
	    return self.showArchived === true || !self.isArchived() || self.callManagerCall && self.callManagerCall.isActive();
	};

	ChatRoom.prototype.persistToFmdb = function () {
	    var self = this;
	    if (fmdb) {
	        var users = [];
	        if (self.members) {
	            Object.keys(self.members).forEach(function (user_handle) {
	                users.push({
	                    u: user_handle,
	                    p: self.members[user_handle]
	                });
	            });
	        }

	        if (self.chatId && self.chatShard !== undefined) {
	            var roomInfo = {
	                'id': self.chatId,
	                'cs': self.chatShard,
	                'g': self.type === "group" ? 1 : 0,
	                'u': users,
	                'ts': self.ctime,
	                'ct': self.ct,
	                'f': self.flags
	            };
	            fmdb.add('mcf', { id: roomInfo.id, d: roomInfo });
	        }
	    }
	};

	ChatRoom.prototype.updateFlags = function (f, updateUI) {
	    var self = this;
	    var flagChange = self.flags !== f;
	    self.flags = f;
	    self.archivedSelected = false;
	    if (self.isArchived()) {
	        megaChat.archivedChatsCount++;
	        self.showArchived = false;
	    } else {
	        megaChat.archivedChatsCount--;
	    }
	    self.persistToFmdb();

	    if (updateUI && flagChange) {
	        if (megaChat.currentlyOpenedChat && megaChat.chats[megaChat.currentlyOpenedChat] && megaChat.chats[megaChat.currentlyOpenedChat].chatId === self.chatId) {
	            loadSubPage('fm/chat/');
	        } else {
	            megaChat.refreshConversations();
	        }

	        if (megaChat.$conversationsAppInstance) {
	            megaChat.$conversationsAppInstance.safeForceUpdate();
	        }
	    }
	};

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

	ChatRoom.prototype.getParticipants = function () {
	    var self = this;

	    return Object.keys(self.members);
	};

	ChatRoom.prototype.getParticipantsExceptMe = function (userHandles) {
	    var self = this;
	    if (!userHandles) {
	        userHandles = self.getParticipants();
	    }
	    var handlesWithoutMyself = clone(userHandles);
	    handlesWithoutMyself.splice($.inArray(u_handle, handlesWithoutMyself), 1);

	    return handlesWithoutMyself;
	};

	ChatRoom.prototype.getRoomTitle = function (ignoreTopic, encapsTopicInQuotes) {
	    var self = this;
	    if (this.type == "private") {
	        var participants = self.getParticipantsExceptMe();
	        return M.getNameByHandle(participants[0]) || "";
	    } else {
	        if (!ignoreTopic && self.topic && self.topic.substr) {
	            return (encapsTopicInQuotes ? '"' : "") + self.topic.substr(0, 30) + (encapsTopicInQuotes ? '"' : "");
	        }

	        var participants = self.members && Object.keys(self.members).length > 0 ? Object.keys(self.members) : [];
	        var names = [];
	        participants.forEach(function (contactHash) {
	            if (contactHash && M.u[contactHash] && contactHash !== u_handle) {
	                names.push(M.u[contactHash] ? M.getNameByHandle(contactHash) : "non contact");
	            }
	        });
	        return names.length > 0 ? names.join(", ") : __(l[19077]).replace('%s1', new Date(self.ctime * 1000).toLocaleString());
	    }
	};

	ChatRoom.prototype.leave = function (triggerLeaveRequest) {
	    var self = this;

	    self._leaving = true;
	    self._closing = triggerLeaveRequest;

	    if (triggerLeaveRequest) {
	        if (self.type == "group") {
	            $(self).trigger('onLeaveChatRequested');
	        } else {
	            self.logger.error("Can't leave room of type: " + self.type);
	            return;
	        }
	    }

	    if (self.roomId.indexOf("@") != -1) {
	        if (self.state !== ChatRoom.STATE.LEFT) {
	            self.setState(ChatRoom.STATE.LEAVING);
	            self.setState(ChatRoom.STATE.LEFT);
	        } else {
	            return;
	        }
	    } else {
	        self.setState(ChatRoom.STATE.LEFT);
	    }
	};

	ChatRoom.prototype.archive = function () {
	    var self = this;
	    var mask = 0x01;
	    var flags = ChatRoom.ARCHIVED;

	    asyncApiReq({
	        'a': 'mcsf',
	        'id': self.chatId,
	        'm': mask,
	        'f': flags,
	        'v': Chatd.VERSION }).done(function (r) {
	        if (r === 0) {
	            self.updateFlags(flags, true);
	        }
	    });
	};

	ChatRoom.prototype.unarchive = function () {
	    var self = this;
	    var mask = 0x01;
	    var flags = 0x00;

	    asyncApiReq({
	        'a': 'mcsf',
	        'id': self.chatId,
	        'm': mask, 'f': flags,
	        'v': Chatd.VERSION }).done(function (r) {
	        if (r === 0) {
	            self.updateFlags(flags, true);
	        }
	    });
	};

	ChatRoom.prototype.destroy = function (notifyOtherDevices, noRedirect) {
	    var self = this;

	    self.megaChat.trigger('onRoomDestroy', [self]);
	    var mc = self.megaChat;
	    var roomJid = self.roomId;

	    if (!self.stateIsLeftOrLeaving()) {
	        self.leave(notifyOtherDevices);
	    }

	    if (self.isCurrentlyActive) {
	        self.isCurrentlyActive = false;
	    }

	    Soon(function () {
	        mc.chats.remove(roomJid);

	        if (!noRedirect) {
	            loadSubPage('fm/chat');
	        }
	    });
	};

	ChatRoom.prototype.show = function () {
	    var self = this;

	    if (self.isCurrentlyActive) {
	        if (!self.messagesBlockEnabled && self.callManagerCall && self.getUnreadCount() > 0) {
	            $(self).trigger('toggleMessages');
	        }
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

	    if (self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomId) {
	        var oldRoom = self.megaChat.getCurrentRoom();
	        if (oldRoom) {
	            oldRoom.hide();
	        }
	    }

	    M.onSectionUIOpen('conversations');

	    self.megaChat.currentlyOpenedChat = self.roomId;
	    self.megaChat.lastOpenedChat = self.roomId;

	    self.trigger('activity');
	    self.trigger('onChatShown');

	    Soon(function () {
	        if (megaChat.$conversationsAppInstance) {
	            megaChat.$conversationsAppInstance.safeForceUpdate();
	        }
	    });
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

	ChatRoom.prototype.isLoading = function () {
	    var self = this;
	    var mb = self.messagesBuff;
	    return mb.messagesHistoryIsLoading() || mb.isDecrypting && mb.isDecrypting.state() === 'pending';
	};

	ChatRoom.prototype.getRoomUrl = function () {
	    var self = this;
	    if (self.type === "private") {
	        var participants = self.getParticipantsExceptMe();
	        var contact = M.u[participants[0]];
	        if (contact) {
	            return "fm/chat/" + contact.u;
	        }
	    } else if (self.type === "group") {
	        return "fm/chat/g/" + self.roomId;
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

	    if (self.megaChat.currentlyOpenedChat === self.roomId) {
	        self.megaChat.currentlyOpenedChat = null;
	    }
	};

	ChatRoom.prototype.appendMessage = function (message) {
	    var self = this;

	    if (message.deleted) {
	        return false;
	    }

	    if (message.getFromJid && message.getFromJid() === self.roomId) {
	        return false;
	    }

	    if (self.shownMessages[message.messageId]) {
	        return false;
	    }
	    if (!message.orderValue) {
	        var mb = self.messagesBuff;

	        if (mb.messages.length > 0) {
	            var prevMsg = mb.messages.getItem(mb.messages.length - 1);
	            if (!prevMsg) {
	                self.logger.error('self.messages got out of sync...maybe there are some previous JS exceptions that caused that? ' + 'note that messages may be displayed OUT OF ORDER in the UI.');
	            } else {
	                message.orderValue = prevMsg.orderValue + 0.1;
	            }
	        }
	    }

	    message.source = Message.SOURCE.SENT;

	    self.trigger('onMessageAppended', message);
	    self.messagesBuff.messages.push(message);

	    self.shownMessages[message.messageId] = true;

	    self.megaChat.updateDashboard();
	};

	ChatRoom.prototype.getNavElement = function () {
	    var self = this;

	    return $('.nw-conversations-item[data-room-id="' + self.chatId + '"]');
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

	ChatRoom.prototype.sendMessage = function (message) {
	    var self = this;
	    var megaChat = this.megaChat;
	    var messageId = megaChat.generateTempMessageId(self.roomId, message);

	    var msgObject = new Message(self, self.messagesBuff, {
	        'messageId': messageId,
	        'userId': u_handle,
	        'message': message,
	        'textContents': message,
	        'delay': unixtime(),
	        'sent': Message.STATE.NOT_SENT
	    });

	    self.trigger('onSendMessage');

	    self.appendMessage(msgObject);

	    self._sendMessageToTransport(msgObject).done(function (internalId) {
	        msgObject.internalId = internalId;
	        msgObject.orderValue = internalId;
	    });
	};

	ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
	    var self = this;
	    var megaChat = this.megaChat;

	    megaChat.trigger('onPreBeforeSendMessage', messageObject);
	    megaChat.trigger('onBeforeSendMessage', messageObject);
	    megaChat.trigger('onPostBeforeSendMessage', messageObject);

	    return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject);
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
	        var contact = M.u[v];
	        if (contact && contact.u) {
	            users.push(contact.u);
	        }
	    });

	    var $masterPromise = new MegaPromise();

	    var waitingPromises = [];
	    ids.forEach(function (nodeId) {
	        var proxyPromise = new MegaPromise();

	        self._sendNodes([nodeId], users).done(function () {
	            var nodesMeta = [];
	            var node = M.d[nodeId];
	            nodesMeta.push({
	                'h': node.h,
	                'k': node.k,
	                't': node.t,
	                's': node.s,
	                'name': node.name,
	                'hash': node.hash,
	                'fa': node.fa,
	                'ts': node.ts
	            });

	            self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify(nodesMeta));

	            proxyPromise.resolve([nodeId]);
	        }).fail(function (r) {
	            proxyPromise.reject(r);
	        });

	        waitingPromises.push(proxyPromise);
	    });

	    $masterPromise.linkDoneAndFailTo(MegaPromise.allDone(waitingPromises));

	    return $masterPromise;
	};

	ChatRoom.prototype.lookupPendingUpload = function (faid, handle) {
	    if (!this.pendingUploads) {
	        return;
	    }
	    assert(faid || handle, 'lookupPendingUpload is missing both faid and handle args.');

	    for (var uid in this.pendingUploads) {
	        if (faid && this.pendingUploads[uid].faid === faid || handle && this.pendingUploads[uid].h === handle) {
	            return uid;
	        }
	    }
	};

	ChatRoom.prototype.onUploadError = function (uid, error) {

	    if (d) {
	        var logger = MegaLogger.getLogger('onUploadEvent[' + this.roomId + ']');
	        logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error);
	    }

	    var ul = self.pendingUploads && self.pendingUploads[uid] || false;

	    if (ul) {
	        delete this.pendingUploads[uid];
	        if (Object.keys(this.pendingUploads).length === 0) {
	            this.clearUploadListeners();
	        }
	    }
	};

	ChatRoom.prototype.onUploadStart = function (data) {
	    var self = this;
	    if (!self.pendingUploads) {
	        self.pendingUploads = Object.create(null);
	    }

	    Object.assign(self.pendingUploads, data);

	    if (!self.uploadListeners) {
	        self.uploadListeners = [];
	    }

	    if (self.uploadListeners.length === 0) {
	        var logger = d && MegaLogger.getLogger('onUploadEvent[' + self.roomId + ']');

	        self.uploadListeners.push(mBroadcaster.addListener('upload:completion', function (uid, handle, faid, chat) {
	            if (!chat) {
	                return;
	            }
	            if (chat.indexOf("/" + self.roomId) === -1) {
	                if (d) {
	                    logger.debug('ignoring upload:completion that is unrelated to this chat.');
	                }
	            }

	            var n = M.d[handle];
	            var ul = self.pendingUploads && self.pendingUploads[uid] || false;

	            if (d) {
	                logger.debug('upload:completion', uid, handle, faid, ul, n);
	            }

	            if (!ul || !n) {

	                logger.error('Invalid state error...');
	            } else {
	                ul.h = handle;

	                if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {

	                    ul.faid = faid;

	                    if (d) {
	                        logger.debug('Waiting for file attribute to arrive.', handle, ul);
	                    }
	                } else {

	                    self.onUploadComplete(ul);
	                }
	            }
	        }));

	        self.uploadListeners.push(mBroadcaster.addListener('upload:error', self.onUploadError.bind(self)));
	        self.uploadListeners.push(mBroadcaster.addListener('upload:abort', self.onUploadError.bind(self)));

	        self.uploadListeners.push(mBroadcaster.addListener('fa:error', function (faid, error, onStorageAPIError, nFAiled) {
	            var uid = self.lookupPendingUpload(faid, faid);
	            var ul = self.pendingUploads && self.pendingUploads[uid] || false;

	            if (d) {
	                logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul);
	            }

	            if (ul) {

	                ul.efa = Math.max(0, ul.efa - nFAiled) | 0;

	                if (ul.h) {

	                    var n = M.d[ul.h] || false;

	                    if (!ul.efa || n.fa && String(n.fa).split('/').length >= ul.efa) {
	                        self.onUploadComplete(ul);
	                    }
	                }
	            }
	        }));

	        self.uploadListeners.push(mBroadcaster.addListener('fa:ready', function (handle, fa) {
	            delay('chat:fa-ready:' + handle, function () {
	                var uid = self.lookupPendingUpload(false, handle);
	                var ul = self.pendingUploads && self.pendingUploads[uid] || false;

	                if (d) {
	                    logger.debug('fa:ready', handle, fa, uid, ul);
	                }

	                if (ul.h && String(fa).split('/').length >= ul.efa) {

	                    self.onUploadComplete(ul);
	                } else if (d) {
	                    logger.debug('Not enough file attributes yet, holding...', ul);
	                }
	            });
	        }));
	    }
	};

	ChatRoom.prototype.onUploadComplete = function (ul) {
	    if (this.pendingUploads && this.pendingUploads[ul.uid]) {
	        if (d) {
	            console.debug('Attaching node to chat room...', ul.h, ul.uid, ul, M.d[ul.h]);
	        }
	        this.attachNodes([ul.h]);
	        delete this.pendingUploads[ul.uid];
	    }

	    this.clearUploadListeners();
	};

	ChatRoom.prototype.clearUploadListeners = function () {
	    if (!this.pendingUploads || Object.keys(this.pendingUploads).length === 0) {
	        for (var i = 0; i < this.uploadListeners.length; i++) {
	            var listenerId = this.uploadListeners[i];
	            mBroadcaster.removeListener(listenerId);
	        }
	        this.uploadListeners = [];
	    }
	};

	ChatRoom.prototype.uploadFromComputer = function () {
	    $('#fileselect1').trigger('click');
	};

	ChatRoom.prototype.attachContacts = function (ids) {
	    var self = this;

	    var nodesMeta = [];
	    $.each(ids, function (k, nodeId) {
	        var node = M.u[nodeId];
	        var name = M.getNameByHandle(node.u);

	        nodesMeta.push({
	            'u': node.u,
	            'email': node.m,
	            'name': name || node.m
	        });
	    });

	    self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify(nodesMeta));
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
	    if (self.state !== ChatRoom.STATE.LEFT) {
	        self.membersLoaded = false;
	        self.setState(ChatRoom.STATE.JOINING, true);
	        self.megaChat.trigger("onRoomCreated", [self]);
	        return MegaPromise.resolve();
	    } else {
	        return MegaPromise.reject();
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

	ChatRoom.prototype.isReadOnly = function () {

	    if (this.type === "private") {
	        var members = this.getParticipantsExceptMe();
	        if (members[0] && M.u[members[0]].c === 0) {
	            return true;
	        }
	    }

	    return this.members && this.members[u_handle] <= 0 || this.privateReadOnlyChat || this.state === ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.LEFT;
	};
	ChatRoom.prototype.iAmOperator = function () {
	    return this.type === "private" || this.members && this.members[u_handle] === 3;
	};

	ChatRoom.prototype.didInteraction = function (user_handle, ts) {
	    var self = this;
	    ts = ts || unixtime();

	    if (user_handle === u_handle) {
	        Object.keys(self.members).forEach(function (user_handle) {
	            var contact = M.u[user_handle];
	            if (contact && user_handle !== u_handle) {
	                setLastInteractionWith(contact.u, "1:" + ts);
	            }
	        });
	    } else {
	        var contact = M.u[user_handle];
	        if (contact && user_handle !== u_handle) {
	            setLastInteractionWith(contact.u, "1:" + ts);
	        }
	    }
	};

	ChatRoom.prototype.retrieveAllHistory = function () {
	    var self = this;
	    self.messagesBuff.retrieveChatHistory().done(function () {
	        if (self.messagesBuff.haveMoreHistory()) {
	            self.retrieveAllHistory();
	        }
	    });
	};

	ChatRoom.prototype.truncate = function () {
	    var self = this;
	    var chatMessages = self.messagesBuff.messages;
	    if (chatMessages.length > 0) {
	        var lastChatMessageId = null;
	        var i = chatMessages.length - 1;
	        while (lastChatMessageId == null && i >= 0) {
	            var message = chatMessages.getItem(i);
	            if (message instanceof Message && message.dialogType !== "truncated") {
	                lastChatMessageId = message.messageId;
	            }
	            i--;
	        }

	        if (lastChatMessageId) {
	            asyncApiReq({
	                a: 'mct',
	                id: self.chatId,
	                m: lastChatMessageId,
	                v: Chatd.VERSION
	            }).fail(function (r) {
	                if (r === -2) {
	                    msgDialog('warninga', l[135], __(l[8880]));
	                }
	            });
	        }
	    }
	};

	ChatRoom.prototype._rebuildAttachmentsImmediate = function () {
	    if (!M.chat) {
	        return;
	    }

	    var self = this;

	    var imagesList = [];
	    var deleted = [];
	    self.images.values().forEach(function (v) {
	        var msg = self.messagesBuff.getMessageById(v.messageId);
	        if (!msg || msg.revoked || msg.deleted || msg.keyid === 0) {
	            slideshowid && deleted.push(v.id.substr(-8));
	            self.images.removeByKey(v.id);
	            return;
	        }
	        imagesList.push(v);
	    });

	    M.v = imagesList;

	    var slideshowCalled = false;
	    slideshowid && deleted.forEach(function (currentNodeId) {
	        if (currentNodeId === slideshowid) {
	            var lastNode;
	            var found = false;
	            M.v.forEach(function (node) {
	                if (!found && node.h !== currentNodeId) {
	                    lastNode = node.h;
	                }
	                if (node.h === currentNodeId) {
	                    found = true;
	                }
	            });

	            if (!lastNode) {
	                for (var i = 0; i < M.v.length; i++) {
	                    if (M.v[i].h !== currentNodeId) {
	                        lastNode = M.v[i].h;
	                        break;
	                    }
	                }
	            }

	            if (!lastNode) {

	                slideshow(undefined, true);
	                slideshowCalled = true;
	            } else {

	                slideshow(lastNode, undefined, true);
	                slideshowCalled = true;
	            }
	        }
	    });

	    slideshowid && !slideshowCalled && slideshow(slideshowid, undefined, true);
	};

	ChatRoom.prototype._rebuildAttachments = SoonFc(ChatRoom.prototype._rebuildAttachmentsImmediate, 300);

	ChatRoom.prototype.loadImage = function (node) {
	    "use strict";

	    var self = this;

	    if (preqs[node.h] || pfails[node.h] || self.getCachedImageURI(node)) {
	        onIdle(self._doneLoadingImage.bind(self, node));
	    } else if (!self._imagesLoading[node.h]) {
	        self._imagesLoading[node.h] = true;
	        self._imagesToBeLoaded[node.h] = node;
	        delay('ChatRoom[' + self.roomId + ']:doLoadImages', self._doLoadImages.bind(self), 90);
	    }
	};

	ChatRoom.prototype._doneLoadingImage = function (node) {
	    "use strict";

	    var imgNode = document.getElementById(node.imgId || node.h);

	    if (imgNode && (imgNode = imgNode.querySelector('img'))) {
	        var src = this.getCachedImageURI(node);
	        var container = imgNode.parentNode.parentNode;

	        if (src) {
	            imgNode.setAttribute('src', src);
	            container.classList.add('thumb');
	            container.classList.remove('thumb-loading');
	        } else {
	            imgNode.setAttribute('src', window.noThumbURIs || '');
	            container.classList.add('thumb-failed');
	            container.classList.remove('thumb-loading');
	        }

	        node.seen = 2;
	    }

	    var self = this;
	    if (self.attachments[node.h]) {
	        self.attachments[node.h].keys().forEach(function (foundInMessageId) {
	            var msg = self.messagesBuff.messages[foundInMessageId];
	            if (msg) {
	                msg.trackDataChange();
	            }
	        });
	    }
	};

	ChatRoom.prototype.getCachedImageURI = function (n) {
	    var h = n && (typeof n === "undefined" ? "undefined" : _typeof(n)) === 'object' && n.h || n;

	    return this._mediaAttachmentsCache[h] || previews[h] && (previews[h].poster || previews[h].src);
	};

	ChatRoom.prototype._startedLoadingImage = function (node) {
	    "use strict";

	    var imgNode = document.getElementById(node.imgId || node.h);

	    if (imgNode && (imgNode = imgNode.querySelector('img'))) {
	        imgNode.parentNode.parentNode.classList.add('thumb-loading');
	    }
	};

	ChatRoom.prototype._getDedupedNodesForThumbanils = function (imagesToBeLoaded, origNodeHandle) {
	    "use strict";

	    var origNode = imagesToBeLoaded[origNodeHandle];
	    var nodes = [origNode];
	    if (origNode.fa_dups) {
	        nodes = nodes.concat(origNode.fa_dups);
	    }

	    return nodes;
	};

	ChatRoom.prototype._doLoadImages = function () {
	    "use strict";

	    var self = this;
	    var dups = Object.create(null);
	    var thumbToLoad = Object.create(null);
	    var imagesToBeLoaded = self._imagesToBeLoaded;
	    self._imagesToBeLoaded = Object.create(null);

	    for (var k in imagesToBeLoaded) {
	        var node = imagesToBeLoaded[k];
	        if (dups[node.fa]) {
	            dups[node.fa].fa_dups = dups[node.fa].fa_dups || [];
	            dups[node.fa].fa_dups.push(node);

	            delete imagesToBeLoaded[k];
	        } else {
	            dups[node.fa] = node;
	        }

	        if (String(node.fa).indexOf(':1*') < 0) {
	            if (String(node.fa).indexOf(':0*') > 0) {
	                if (d) {
	                    console.debug('Chat loading thumbnail for %s since it has no preview fa', node.h, node);
	                }
	                thumbToLoad[node.h] = node;
	            } else if (d) {
	                console.warn('Chat cannot load image for %s since it has no suitable file attribute.', node.h, node);
	            }
	            delete imagesToBeLoaded[k];
	        }
	    }

	    var chatImageParser = function chatImageParser(h, data) {
	        var isThumbnail = thumbToLoad[h];
	        var nodes = self._getDedupedNodesForThumbanils(isThumbnail ? thumbToLoad : imagesToBeLoaded, h);

	        for (var i = nodes.length; i--;) {
	            var n = nodes[i];
	            h = n.h;

	            if (data !== 0xDEAD) {
	                if (!isThumbnail && !previews[h] && is_image3(n)) {
	                    preqs[h] = 1;
	                    previewimg(h, data, 'image/jpeg');
	                    previews[h].fromChat = Date.now();
	                } else {
	                    self._mediaAttachmentsCache[h] = mObjectURL([data.buffer || data], 'image/jpeg');
	                }
	            } else {
	                if (d) {
	                    console.error('Failed to load image for %s', h);
	                }
	                self._mediaAttachmentsCache[h] = false;
	            }
	            delete self._imagesLoading[h];
	            self._doneLoadingImage(n);
	        }
	    };

	    var onSuccess = function onSuccess(ctx, origNodeHandle, data) {
	        chatImageParser(origNodeHandle, data);
	    };

	    var onError = function onError(origNodeHandle) {
	        chatImageParser(origNodeHandle, 0xDEAD);
	    };

	    api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);

	    if ($.len(thumbToLoad)) {
	        api_getfileattr(thumbToLoad, 0, onSuccess, onError);
	    }

	    [imagesToBeLoaded, thumbToLoad].forEach(function (obj) {
	        Object.keys(obj).forEach(function (handle) {
	            self._startedLoadingImage(obj[handle]);
	        });
	    });
	};

	window.ChatRoom = ChatRoom;
	module.exports = ChatRoom;

/***/ }),
/* 33 */
/***/ (function(module, exports) {

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

/***/ })
/******/ ]);
