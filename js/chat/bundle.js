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

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var ConversationsUI = __webpack_require__(4);
	var ChatRoom = __webpack_require__(41);

	var EMOJI_DATASET_VERSION = 3;

	var _chatui;
	var webSocketsSupport = typeof WebSocket !== 'undefined';

	(function () {
	    _chatui = function chatui(id) {
	        var roomOrUserHash = id.replace("chat/", "");
	        var isPubLink = id.substr(0, 5) === "chat/" && id.substr(6, 1) !== "/";

	        var roomType = false;
	        megaChat.displayArchivedChats = false;
	        if (roomOrUserHash === "archived") {
	            roomType = "archived";
	            megaChat.displayArchivedChats = true;
	        } else if (roomOrUserHash.substr(0, 2) === "g/" || roomOrUserHash.substr(0, 2) === "c/" || isPubLink) {
	            roomType = isPubLink || roomOrUserHash.substr(0, 2) === "c/" ? "public" : "group";

	            var publicChatHandle;
	            var publicChatKey;
	            var publicChatId;
	            if (roomType === "public" && isPubLink) {
	                publicChatHandle = roomOrUserHash.split("#")[0];
	                publicChatKey = roomOrUserHash.split("#")[1];

	                if (publicChatKey && String(publicChatKey).indexOf("?") > -1) {
	                    publicChatKey = publicChatKey.split("?")[0];
	                }
	                publicChatId = megaChat.handleToId[publicChatHandle];
	                roomOrUserHash = publicChatHandle;

	                megaChat.publicChatKeys = megaChat.publicChatKeys || {};
	                megaChat.publicChatKeys[publicChatHandle] = publicChatKey;
	            } else {
	                roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
	            }

	            megaChat.displayArchivedChats = false;
	            if (publicChatId && megaChat.chats[publicChatId]) {
	                megaChat.chats[publicChatId].show();
	            } else if (!megaChat.chats[roomOrUserHash]) {

	                if (anonymouschat || publicChatHandle) {

	                    M.chat = true;

	                    var promises = [];
	                    if (!anonymouschat) {
	                        promises.push(ChatdIntegration.mcfHasFinishedPromise);
	                    }
	                    MegaPromise.allDone(promises).always(function () {
	                        megaChat.plugins.chatdIntegration.openChat(publicChatHandle).always(function () {
	                            if (anonymouschat) {
	                                ChatdIntegration.mcfHasFinishedPromise.resolve();
	                                ChatdIntegration.allChatsHadLoaded.resolve();
	                            }
	                            var publicChatId = megaChat.handleToId[publicChatHandle];
	                            if (megaChat.chats[publicChatId]) {
	                                megaChat.chats[publicChatId].show();
	                            }
	                        });
	                    });
	                } else {
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
	                }

	                return;
	            }
	        } else {
	            if (roomOrUserHash.substr(0, 2) === "p/") {
	                roomOrUserHash = roomOrUserHash.substr(2);
	            }
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
	            var userHandle = id.split("chat/p/").pop();
	            var userHandles = [u_handle, userHandle];

	            megaChat.smartOpenChat(userHandles, "private", undefined, undefined, undefined, true).then(function (room) {
	                room.show();
	            }).catch(function (ex) {
	                console.warn("openChat failed. Maybe tried to start a private chat with a non contact?", ex);
	            });
	        } else if (roomType === "group") {
	            if (megaChat.chats[roomOrUserHash].isArchived()) {
	                megaChat.chats[roomOrUserHash].showArchived = true;
	            }
	            megaChat.chats[roomOrUserHash].show();
	        } else if (roomType === "public") {
	            if (megaChat.chats[roomOrUserHash] && id.indexOf('chat/') > -1) {
	                megaChat.chats[roomOrUserHash].show();
	            } else {
	                var publicChatId = megaChat.handleToId[roomOrUserHash];

	                if (publicChatId && megaChat.chats[publicChatId]) {
	                    megaChat.chats[publicChatId].show();
	                }
	            }
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

	var CHATUIFLAGS_MAPPING = {
	    'convPanelCollapse': 'cPC'
	};

	var Chat = function Chat() {
	    var self = this;

	    this.is_initialized = false;
	    this.logger = MegaLogger.getLogger("chat");

	    this.chats = new MegaDataMap();
	    this.chatUIFlags = new MegaDataMap();
	    this.initChatUIFlagsManagement();

	    this.currentlyOpenedChat = null;
	    this.lastOpenedChat = null;
	    this.archivedChatsCount = 0;
	    this._myPresence = localStorage.megaChatPresence;

	    this._imageLoadCache = Object.create(null);
	    this._imagesToBeLoaded = Object.create(null);
	    this._imageAttributeCache = Object.create(null);
	    this._queuedMccPackets = [];

	    this.publicChatKeys = {};
	    this.handleToId = {};

	    this.options = {
	        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
	        'loadbalancerService': 'gelb.karere.mega.nz',
	        'rtc': {
	            iceServers: [{
	                urls: 'turn:trn270n001.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                urls: 'turn:trn302n001.karere.mega.nz:3478?transport=udp',
	                username: "inoo20jdnH",
	                credential: '02nNKDBkkS'
	            }, {
	                urls: 'turn:trn530n001.karere.mega.nz:3478?transport=udp',
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
	                    'title': l[17878] || "Incoming call",
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

	    $(document.body).rebind('mousedown.megachat', '.top-user-status-popup .tick-item', function () {
	        var presence = $(this).data("presence");
	        self._myPresence = presence;

	        $('.top-user-status-popup').removeClass("active").addClass("hidden");

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
	    if (!anonymouschat) {
	        $('.activity-status-block, .activity-status').show();
	    } else {}

	    self.on('onRoomInitialized', function (e, room) {
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

	        room.rebind("onChatShown.chatMainList", function () {
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

	    $(document.body).rebind('mouseover.notsentindicator', '.tooltip-trigger', function () {
	        var $this = $(this);
	        var $notification = $('.tooltip.' + $this.attr('data-tooltip')).removeClass('hidden');
	        var iconTopPos = $this.offset().top;
	        var iconLeftPos = $this.offset().left;
	        var notificatonHeight = $notification.outerHeight() + 10;
	        var notificatonWidth = $notification.outerWidth() / 2 - 10;
	        $notification.offset({ top: iconTopPos - notificatonHeight, left: iconLeftPos - notificatonWidth });
	    });

	    $(document.body).rebind('mouseout.notsentindicator click.notsentindicator', '.tooltip-trigger', function () {

	        var $notification = $('.tooltip');
	        $notification.addClass('hidden').removeAttr('style');
	    });

	    self.registerUploadListeners();
	    self.trigger("onInit");
	};

	Chat.prototype.loadChatUIFlagsFromConfig = function (val) {
	    var self = this;
	    var flags = val || mega.config.get("cUIF");
	    if (flags) {
	        if ((typeof flags === "undefined" ? "undefined" : _typeof(flags)) !== 'object') {
	            flags = {};
	        }

	        try {
	            Object.keys(CHATUIFLAGS_MAPPING).forEach(function (k) {
	                var v = flags[CHATUIFLAGS_MAPPING[k]];
	                if (v) {
	                    self.chatUIFlags.set(k, v);
	                }
	            });
	        } catch (e) {
	            console.warn("Failed to parse persisted chatUIFlags: ", e);
	        }
	    }
	};

	Chat.prototype.initChatUIFlagsManagement = function () {
	    var self = this;

	    self.loadChatUIFlagsFromConfig();

	    this.chatUIFlags.addChangeListener(function (hashmap, extraArg) {
	        var flags = mega.config.get("cUIF") || {};
	        var hadChanged = false;
	        var hadLocalChanged = false;

	        Object.keys(CHATUIFLAGS_MAPPING).forEach(function (k) {
	            if (flags[CHATUIFLAGS_MAPPING[k]] !== self.chatUIFlags[k]) {
	                if (extraArg === 0xDEAD) {
	                    self.chatUIFlags._data[k] = flags[CHATUIFLAGS_MAPPING[k]];
	                    hadLocalChanged = true;
	                } else {
	                    flags[CHATUIFLAGS_MAPPING[k]] = self.chatUIFlags[k];
	                    hadChanged = true;
	                }
	            }
	        });

	        if (hadLocalChanged) {
	            if (extraArg !== 0xDEAD) {

	                self.chatUIFlags.trackDataChange(0xDEAD);
	            }

	            $.tresizer();
	        }
	        if (extraArg === 0xDEAD) {

	            return;
	        }
	        if (hadChanged) {
	            mega.config.set("cUIF", flags);
	        }
	    });
	    mBroadcaster.addListener('fmconfig:cUIF', function (v) {
	        self.loadChatUIFlagsFromConfig(v);
	        self.chatUIFlags.trackDataChange(0xDEAD);
	    });
	};

	Chat.prototype.unregisterUploadListeners = function (destroy) {
	    'use strict';

	    var self = this;

	    mBroadcaster.removeListener(self._uplDone);
	    mBroadcaster.removeListener(self._uplError);
	    mBroadcaster.removeListener(self._uplAbort);
	    mBroadcaster.removeListener(self._uplFAError);
	    mBroadcaster.removeListener(self._uplFAReady);

	    if (destroy) {
	        mBroadcaster.removeListener(self._uplStart);
	    }

	    delete self._uplError;
	};

	Chat.prototype.registerUploadListeners = function () {
	    'use strict';

	    var self = this;
	    var logger = d && MegaLogger.getLogger('chatUploadListener', false, self.logger);

	    self.unregisterUploadListeners(true);

	    var forEachChat = function forEachChat(chats, callback) {
	        var result = 0;

	        if (!Array.isArray(chats)) {
	            chats = [chats];
	        }

	        for (var i = chats.length; i--;) {
	            var room = self.getRoomFromUrlHash(chats[i]);
	            if (room) {
	                callback(room, ++result);
	            }
	        }

	        return result;
	    };

	    var lookupPendingUpload = function lookupPendingUpload(id) {
	        console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');

	        for (var uid in ulmanager.ulEventData) {
	            if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
	                return uid;
	            }
	        }
	    };

	    var unregisterListeners = function unregisterListeners() {
	        if (!$.len(ulmanager.ulEventData)) {
	            self.unregisterUploadListeners();
	        }
	    };

	    var onUploadComplete = function onUploadComplete(ul) {
	        if (ulmanager.ulEventData[ul && ul.uid]) {
	            forEachChat(ul.chat, function (room) {

	                if (d) {
	                    logger.debug('Attaching node[%s] to chat room[%s]...', ul.h, room.chatId, ul.uid, ul, M.d[ul.h]);
	                }
	                room.attachNodes([ul.h]);
	            });

	            delete ulmanager.ulEventData[ul.uid];
	            unregisterListeners();
	        }
	    };

	    var onUploadCompletion = function onUploadCompletion(uid, handle, faid, chat) {
	        if (!chat) {
	            if (d > 1) {
	                logger.debug('ignoring upload:completion that is unrelated to chat.', arguments);
	            }
	            return;
	        }

	        var n = M.d[handle];
	        var ul = ulmanager.ulEventData[uid] || false;

	        if (d) {
	            logger.debug('upload:completion', uid, handle, faid, ul, n);
	        }

	        if (!ul || !n) {

	            if (d) {
	                logger.error('Invalid state error...');
	            }
	        } else {
	            ul.h = handle;

	            if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {

	                ul.faid = faid;

	                if (d) {
	                    logger.debug('Waiting for file attribute to arrive.', handle, ul);
	                }
	            } else {

	                onUploadComplete(ul);
	            }
	        }
	    };

	    var onUploadError = function onUploadError(uid, error) {
	        var ul = ulmanager.ulEventData[uid];

	        if (d) {
	            logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
	        }

	        if (ul) {
	            delete ulmanager.ulEventData[uid];
	            unregisterListeners();
	        }
	    };

	    var onAttributeReady = function onAttributeReady(handle, fa) {
	        delay('chat:fa-ready:' + handle, function () {
	            var uid = lookupPendingUpload(handle);
	            var ul = ulmanager.ulEventData[uid] || false;

	            if (d) {
	                logger.debug('fa:ready', handle, fa, uid, ul);
	            }

	            if (ul.h && String(fa).split('/').length >= ul.efa) {

	                onUploadComplete(ul);
	            } else if (d) {
	                logger.debug('Not enough file attributes yet, holding...', ul);
	            }
	        });
	    };

	    var onAttributeError = function onAttributeError(faid, error, onStorageAPIError, nFAiled) {
	        var uid = lookupPendingUpload(faid);
	        var ul = ulmanager.ulEventData[uid] || false;

	        if (d) {
	            logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul, nFAiled, ul.efa);
	        }

	        if (ul) {

	            ul.efa = Math.max(0, ul.efa - nFAiled) | 0;

	            if (ul.h) {

	                var n = M.d[ul.h] || false;

	                if (!ul.efa || n.fa && String(n.fa).split('/').length >= ul.efa) {
	                    onUploadComplete(ul);
	                }
	            }
	        }
	    };

	    var registerLocalListeners = function registerLocalListeners() {
	        self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
	        self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
	        self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
	        self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
	        self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
	    };

	    var onUploadStart = function onUploadStart(data) {
	        if (d) {
	            logger.info('onUploadStart', [data]);
	        }

	        var notify = function notify(room) {
	            room.onUploadStart(data);
	        };

	        for (var k in data) {
	            var chats = data[k].chat;

	            if (chats && forEachChat(chats, notify) && !self._uplError) {
	                registerLocalListeners();
	            }
	        }
	    };

	    self._uplStart = mBroadcaster.addListener('upload:start', onUploadStart);
	};

	Chat.prototype.getRoomFromUrlHash = function (urlHash) {

	    if (urlHash.indexOf("#") === 0) {
	        urlHash = urlHash.subtr(1, urlHash.length);
	    }
	    if (urlHash.indexOf("chat/g/") > -1 || urlHash.indexOf("chat/c/") > -1) {
	        var foundRoom = null;
	        urlHash = urlHash.replace("chat/g/", "").replace("chat/c/", "");
	        megaChat.chats.forEach(function (room) {
	            if (!foundRoom && room.chatId === urlHash) {
	                foundRoom = room;
	            }
	        });
	        return foundRoom;
	    } else if (urlHash.indexOf("chat/p/") > -1) {
	        var contactHash = urlHash.replace("chat/p/", "");
	        if (!contactHash) {
	            return;
	        }

	        var chatRoom = this.getPrivateRoom(contactHash);
	        return chatRoom;
	    } else if (urlHash.indexOf("chat/") > -1 && urlHash[13] === "#") {
	        var foundRoom = null;
	        var pubHandle = urlHash.replace("chat/", "").split("#")[0];
	        urlHash = urlHash.replace("chat/g/", "");
	        var chatIds = megaChat.chats.keys();
	        for (var i = 0; i < chatIds.length; i++) {
	            var cid = chatIds[i];
	            var room = megaChat.chats[cid];
	            if (room.publicChatHandle === pubHandle) {
	                foundRoom = room;
	                break;
	            }
	        }
	        return foundRoom;
	    } else {
	        return null;
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

	    var havePendingCall = false;
	    self.haveAnyActiveCall() === false && self.chats.forEach(function (megaRoom, k) {
	        if (megaRoom.state == ChatRoom.STATE.LEFT) {

	            return;
	        }
	        if (megaRoom.isArchived()) {
	            return;
	        }

	        var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
	        unreadCount += c;
	        havePendingCall = havePendingCall || megaRoom.havePendingCall();
	    });

	    unreadCount = unreadCount > 9 ? "9+" : unreadCount;

	    var haveContents = false;

	    if (havePendingCall) {
	        haveContents = true;
	        $('.new-messages-indicator .chat-pending-call').removeClass('hidden');
	    } else {
	        $('.new-messages-indicator .chat-pending-call').addClass('hidden');
	    }

	    if (self._lastUnreadCount != unreadCount) {
	        if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
	            $('.new-messages-indicator .chat-unread-count').removeClass('hidden').text(unreadCount);
	        } else {
	            $('.new-messages-indicator .chat-unread-count').addClass('hidden');
	        }
	        self._lastUnreadCount = unreadCount;

	        delay('notifFavicoUpd', function () {
	            self.favico.reset();
	            self.favico.badge(unreadCount);
	        });

	        self.updateDashboard();
	    }
	    if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
	        haveContents = true;
	    }

	    if (!haveContents) {
	        $('.new-messages-indicator').addClass('hidden');
	    } else {
	        $('.new-messages-indicator').removeClass('hidden');
	    }
	}, 100);

	Chat.prototype.destroy = function (isLogout) {
	    var self = this;

	    if (self.is_initialized === false) {
	        return;
	    }

	    self.isLoggingOut = isLogout;

	    if (self.rtc && self.rtc.logout) {
	        self.rtc.logout();
	    }

	    self.unregisterUploadListeners(true);
	    self.trigger('onDestroy', [isLogout]);

	    if (self.$conversationsAppInstance && ReactDOM.findDOMNode(self.$conversationsAppInstance) && ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode) {
	        ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(self.$conversationsAppInstance).parentNode);
	    }

	    self.chats.forEach(function (room, roomJid) {
	        if (!isLogout) {
	            room.destroy(false, true);
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

	Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck) {
	    var self = this;
	    type = type || "private";
	    setAsActive = setAsActive === true;

	    var roomId = chatId;
	    var publicChatKey;

	    if (!publicChatKey && chatHandle && self.publicChatKeys[chatHandle]) {
	        if (type !== "public") {
	            console.error("this should never happen.", type);
	            type = "public";
	        }
	        publicChatKey = self.publicChatKeys[chatHandle];
	    }

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

	    if (type === "group" || type == "public") {
	        ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle);
	        ChatdIntegration._ensureNamesAreLoaded(userHandles, chatHandle);

	        userHandles.forEach(function (contactHash) {
	            assert(contactHash, 'Invalid hash for user (extracted from inc. message)');

	            if (!M.u[contactHash]) {
	                M.u.set(contactHash, new MegaDataObject(MEGA_USER_STRUCT, true, {
	                    'h': contactHash,
	                    'u': contactHash,
	                    'm': '',
	                    'c': undefined
	                }));
	                M.syncUsersFullname(contactHash);
	                self.processNewUser(contactHash, true);
	                M.syncContactEmail(contactHash);
	            }
	        });
	    }

	    if (!roomId && setAsActive) {

	        if (ChatdIntegration.allChatsHadLoaded.state() === 'pending' || ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
	            MegaPromise.allDone([ChatdIntegration.allChatsHadLoaded, ChatdIntegration.mcfHasFinishedPromise]).always(function () {
	                var res = self.openChat(userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck);
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
	                $promise.resolve(roomId, self.chats[roomId]);
	                return;
	            }
	            var res = self.openChat(userHandles, ap.m === 1 ? "public" : ap.g === 1 ? "group" : "private", ap.id, ap.cs, ap.url, setAsActive, chatHandle, publicChatKey, ck);

	            $promise.linkDoneAndFailTo(res[2]);
	        }).fail(function () {
	            $promise.reject(arguments[0]);
	        });

	        if (setAsActive) {

	            ChatdIntegration._loadingChats[roomId].setAsActive = true;
	        }

	        return [roomId, undefined, $promise];
	    }

	    var room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl, null, chatHandle, publicChatKey, ck);

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

	    this.trigger('onRoomInitialized', [room]);
	    room.setState(ChatRoom.STATE.JOINING);
	    return [roomId, room, MegaPromise.resolve(roomId, self.chats[roomId])];
	};

	Chat.prototype.smartOpenChat = function () {
	    'use strict';

	    var self = this;
	    var args = toArray.apply(null, arguments);

	    if (typeof args[0] === 'string') {

	        args[0] = [u_handle, args[0]];
	        if (args.length < 2) {
	            args.push('private');
	        }
	    }

	    return new MegaPromise(function (resolve, reject) {

	        var waitForReadyState = function waitForReadyState(aRoom, aShow) {
	            var verify = function verify() {
	                return aRoom.state === ChatRoom.STATE.READY;
	            };

	            var ready = function ready() {
	                if (aShow) {
	                    aRoom.show();
	                }
	                resolve(aRoom);
	            };

	            if (verify()) {
	                return ready();
	            }

	            createTimeoutPromise(verify, 300, 3e4).then(ready).catch(reject);
	        };

	        if (args[0].length === 2 && args[1] === 'private') {
	            var chatRoom = self.chats[array.filterNonMatching(args[0], u_handle)[0]];
	            if (chatRoom) {
	                return waitForReadyState(chatRoom, args[5]);
	            }
	        }

	        var result = self.openChat.apply(self, args);

	        if (result instanceof MegaPromise) {

	            result.then(reject).catch(reject);
	        } else if (!Array.isArray(result)) {

	            reject(EINTERNAL);
	        } else {
	            var room = result[1];
	            var roomId = result[0];
	            var promise = result[2];

	            if (!(promise instanceof MegaPromise)) {

	                self.logger.error('Unexpected openChat() response...');
	                return reject(EINTERNAL);
	            }

	            self.logger.debug('Waiting for chat "%s" to be ready...', roomId, [room]);

	            promise.then(function (aRoomId, aRoom) {
	                if (aRoomId !== roomId || room && room !== aRoom || !(aRoom instanceof ChatRoom)) {
	                    self.logger.error('Unexpected openChat() procedure...', aRoomId, [aRoom]);
	                    return reject(EINTERNAL);
	                }

	                waitForReadyState(aRoom);
	            }).catch(reject);
	        }
	    });
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

	Chat.prototype.processNewUser = function (u, isNewChat) {
	    var self = this;

	    self.logger.debug("added: ", u);

	    if (self.plugins.presencedIntegration) {
	        self.plugins.presencedIntegration.addContact(u, isNewChat);
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

	    if (self.$container.parent('.section.conversations .fm-right-files-block').length == 0) {
	        $('.section.conversations .fm-right-files-block').append(self.$container);
	    }
	    if (anonymouschat) {
	        $('.conversationsApp .fm-left-panel').addClass('hidden');
	    } else {
	        $('.conversationsApp .fm-left-panel').removeClass('hidden');
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

	Chat.prototype.setAttachments = function (roomId) {
	    'use strict';

	    if (M.chat) {
	        if (d) {
	            console.assert(this.chats[roomId] && this.chats[roomId].isCurrentlyActive, 'check this...');
	        }

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
	    } else if (d) {
	        console.warn('Not in chat...');
	    }
	};

	Chat.prototype._enqueueImageLoad = function (n) {
	    'use strict';

	    var cc = previews[n.h] || previews[n.hash];
	    if (cc) {
	        if (cc.poster) {
	            n.src = cc.poster;
	        } else {
	            if (cc.full && n.mime !== 'image/png' && n.mime !== 'image/webp') {
	                cc = cc.prev || false;
	            }

	            if (String(cc.type).startsWith('image/')) {
	                n.src = cc.src;
	            }
	        }
	    }

	    var cached = n.src;

	    if (String(n.fa).indexOf(':1*') > 0) {
	        var load = false;
	        var dedup = true;

	        if (this._imageAttributeCache[n.fa]) {
	            this._imageAttributeCache[n.fa].push(n.ch);
	        } else {
	            this._imageAttributeCache[n.fa] = [n.ch];
	            load = !cached;
	        }

	        if (this._imageLoadCache[n.h]) {
	            this._imageLoadCache[n.h].push(n.ch);
	        } else {
	            this._imageLoadCache[n.h] = [n.ch];

	            if (load) {
	                this._imagesToBeLoaded[n.h] = n;
	                dedup = false;
	            }
	        }

	        if (dedup) {
	            cached = true;
	        } else {
	            delay('chat:enqueue-image-load', this._doLoadImages.bind(this), 350);
	        }
	    }

	    if (cached) {
	        this._doneLoadingImage(n.h);
	    }
	};

	Chat.prototype._doLoadImages = function () {
	    "use strict";

	    var self = this;
	    var imagesToBeLoaded = self._imagesToBeLoaded;
	    self._imagesToBeLoaded = Object.create(null);

	    var chatImageParser = function chatImageParser(h, data) {
	        var n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;

	        if (data !== 0xDEAD) {

	            n.src = mObjectURL([data.buffer || data], 'image/jpeg');
	            n.srcBuffer = data;
	        } else if (d) {
	            console.warn('Failed to load image for %s', h, n);
	        }

	        self._doneLoadingImage(h);
	    };

	    var onSuccess = function onSuccess(ctx, origNodeHandle, data) {
	        chatImageParser(origNodeHandle, data);
	    };

	    var onError = function onError(origNodeHandle) {
	        chatImageParser(origNodeHandle, 0xDEAD);
	    };

	    api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);

	    [imagesToBeLoaded].forEach(function (obj) {
	        Object.keys(obj).forEach(function (handle) {
	            self._startedLoadingImage(handle);
	        });
	    });
	};

	Chat.prototype._getImageNodes = function (h, src) {
	    var nodes = this._imageLoadCache[h] || [];
	    var handles = [].concat(nodes);

	    for (var i = nodes.length; i--;) {
	        var n = M.chd[nodes[i]] || false;

	        if (this._imageAttributeCache[n.fa]) {
	            handles = handles.concat(this._imageAttributeCache[n.fa]);
	        }
	    }
	    handles = array.unique(handles);

	    nodes = handles.map(function (ch) {
	        var n = M.chd[ch] || false;
	        if (src && n.src) {
	            Object.assign(src, n);
	        }
	        return n;
	    });

	    return nodes;
	};

	Chat.prototype._startedLoadingImage = function (h) {
	    "use strict";

	    var nodes = this._getImageNodes(h);

	    for (var i = nodes.length; i--;) {
	        var n = nodes[i];

	        if (!n.src && n.seen !== 2) {

	            var imgNode = document.getElementById(n.ch);

	            if (imgNode && (imgNode = imgNode.querySelector('img'))) {
	                imgNode.parentNode.parentNode.classList.add('thumb-loading');
	            }
	        }
	    }
	};

	Chat.prototype._doneLoadingImage = function (h) {
	    "use strict";

	    var setSource = function setSource(n, img, src) {
	        var message = n.mo;

	        img.onload = function () {
	            img.onload = null;
	            n.srcWidth = this.naturalWidth;
	            n.srcHeight = this.naturalHeight;

	            if (message) {
	                message.trackDataChange();
	            }
	        };
	        img.setAttribute('src', src);
	    };

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
	                container.classList.add('thumb');
	                parent.classList.remove('no-thumb');
	            } else {
	                container.classList.add('thumb-failed');
	            }

	            n.seen = 2;
	            container.classList.remove('thumb-loading');
	            setSource(n, imgNode, src || window.noThumbURI || '');
	        }

	        if (src) {
	            n.src = src;

	            if (root.srcBuffer && root.srcBuffer.byteLength) {
	                n.srcBuffer = root.srcBuffer;
	            }

	            if (n.srcBuffer && !previews[n.h] && is_image3(n)) {
	                preqs[n.h] = 1;
	                previewimg(n.h, n.srcBuffer, 'image/jpeg');
	                previews[n.h].fromChat = Date.now();
	            }
	        }

	        delete n.mo;
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
	    'use strict';

	    return this.chats[h] || false;
	};

	Chat.prototype.createAndShowPrivateRoomFor = function (h) {
	    'use strict';

	    var room = this.getPrivateRoom(h);

	    if (room) {
	        _chatui(h);
	        return MegaPromise.resolve(room);
	    }

	    var promise = megaChat.smartOpenChat(h);

	    promise.done(function (room) {
	        room.setActive();
	    });

	    return promise;
	};

	Chat.prototype.createAndShowGroupRoomFor = function (contactHashes, topic, keyRotation, createChatLink) {
	    this.trigger('onNewGroupChatRequest', [contactHashes, {
	        'topic': topic || "",
	        'keyRotation': keyRotation,
	        'createChatLink': createChatLink
	    }]);
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

	        self._emojiData[name] = ["symbols", "activity", "objects", "nature", "food", "people", "travel", "flags"];

	        return MegaPromise.resolve(self._emojiData[name]);
	    } else {
	        var promise = new MegaPromise();
	        self._emojiDataLoading[name] = promise;

	        M.xhr({
	            type: 'json',
	            url: staticpath + "js/chat/emojidata/" + name + "_v" + EMOJI_DATASET_VERSION + ".json"
	        }).then(function (ev, data) {
	            self._emojiData[name] = data;
	            delete self._emojiDataLoading[name];
	            promise.resolve(data);
	        }).catch(function (ev, error) {
	            if (d) {
	                self.logger.warn('Failed to load emoji data "%s": %s', name, error, [ev]);
	            }
	            delete self._emojiDataLoading[name];
	            promise.reject(error);
	        });

	        return promise;
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

	Chat.prototype.haveAnyIncomingOrOutgoingCall = function (chatIdBin) {
	    if (chatIdBin) {
	        if (!this.rtc || !this.rtc.calls || Object.keys(this.rtc.calls).length === 0) {
	            return false;
	        } else if (this.rtc && this.rtc.calls) {
	            var callIds = Object.keys(this.rtc.calls);
	            for (var i = 0; i < callIds.length; i++) {
	                if (this.rtc.calls[callIds[i]].chatid !== chatIdBin) {
	                    return true;
	                }
	            }

	            return false;
	        } else {
	            return false;
	        }
	    } else {
	        return this.rtc && this.rtc.calls && Object.keys(this.rtc.calls).length > 0;
	    }
	};

	Chat.prototype.haveAnyActiveCall = function () {
	    var self = this;
	    var chatIds = self.chats.keys();
	    for (var i = 0; i < chatIds.length; i++) {
	        if (self.chats[chatIds[i]].haveActiveCall()) {
	            return true;
	        }
	    }
	    return false;
	};

	Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
	    'use strict';

	    this.smartOpenChat(user_handle).then(function (room) {
	        room.setActive();
	        $(room).trigger('openSendFilesDialog');
	    }).catch(this.logger.error.bind(this.logger));
	};

	Chat.prototype.openChatAndAttachNodes = function (targets, nodes) {
	    'use strict';

	    var self = this;

	    if (d) {
	        console.group('Attaching nodes to chat room(s)...', targets, nodes);
	    }

	    return new MegaPromise(function (resolve, reject) {
	        var promises = [];
	        var attachNodes = function attachNodes(roomId) {
	            return new MegaPromise(function (resolve, reject) {
	                self.smartOpenChat(roomId).then(function (room) {
	                    room.attachNodes(nodes).then(resolve.bind(self, room)).catch(reject);
	                }).catch(function (ex) {
	                    if (d) {
	                        self.logger.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId, ex);
	                    }
	                    reject(ex);
	                });
	            });
	        };

	        if (!Array.isArray(targets)) {
	            targets = [targets];
	        }

	        for (var i = targets.length; i--;) {
	            promises.push(attachNodes(targets[i]));
	        }

	        MegaPromise.allDone(promises).unpack(function (result) {
	            var room;

	            for (var i = result.length; i--;) {
	                if (result[i] instanceof ChatRoom) {
	                    room = result[i];
	                    break;
	                }
	            }

	            if (room) {
	                showToast('send-chat', nodes.length > 1 ? l[17767] : l[17766]);
	                M.openFolder('chat/' + (room.type === 'group' ? 'g/' : '') + room.roomId).always(resolve);
	            } else {
	                if (d) {
	                    self.logger.warn('openChatAndAttachNodes failed in whole...', result);
	                }
	                reject(result);
	            }

	            if (d) {
	                console.groupEnd();
	            }
	        });
	    });
	};

	Chat.prototype.toggleUIFlag = function (name) {
	    this.chatUIFlags.set(name, this.chatUIFlags[name] ? 0 : 1);
	};

	Chat.prototype.onSnActionPacketReceived = function () {
	    if (this._queuedMccPackets.length > 0) {
	        var aps = this._queuedMccPackets;
	        this._queuedMccPackets = [];
	        for (var i = 0; i < aps.length; i++) {
	            mBroadcaster.sendMessage('onChatdChatUpdatedActionPacket', aps[i]);
	        }
	    }
	};

	Chat.prototype.getFrequentContacts = function () {
	    var chats = this.chats;
	    var recentContacts = {};
	    var promises = [];
	    var finishedLoadingChats = {};
	    var loadingMoreChats = {};

	    var _calculateLastTsFor = function _calculateLastTsFor(r, maxMessages) {
	        var msgIds = r.messagesBuff.messages.keys().reverse();
	        msgIds = msgIds.splice(0, maxMessages);
	        msgIds.forEach(function (msgId) {
	            var msg = r.messagesBuff.getMessageById(msgId);
	            var contactHandle = msg.userId === "gTxFhlOd_LQ" && msg.meta ? msg.meta.userId : msg.userId;
	            if (r.type === "private" && contactHandle === u_handle) {
	                contactHandle = contactHandle || r.getParticipantsExceptMe()[0];
	            }

	            if (contactHandle !== "gTxFhlOd_LQ" && M.u[contactHandle] && M.u[contactHandle].c === 1 && contactHandle !== u_handle) {
	                if (!recentContacts[contactHandle] || recentContacts[contactHandle].ts < msg.delay) {
	                    recentContacts[contactHandle] = { 'userId': contactHandle, 'ts': msg.delay };
	                }
	            }
	        });
	    };

	    chats.forEach(function (r) {

	        var _histDecryptedCb = function _histDecryptedCb(r) {

	            if (!loadingMoreChats[r.chatId] && r.messagesBuff.messages.length < 32 && r.messagesBuff.haveMoreHistory()) {

	                loadingMoreChats[r.chatId] = true;
	                r.messagesBuff.retrieveChatHistory(false);
	            } else {
	                $(r).unbind('onHistoryDecrypted.recent');
	                _calculateLastTsFor(r, 32);
	                delete loadingMoreChats[r.chatId];
	                finishedLoadingChats[r.chatId] = true;
	            }
	        };

	        if (r.isLoading()) {
	            var promise = createTimeoutPromise(function () {
	                return finishedLoadingChats[r.chatId] === true;
	            }, 300, 10000, undefined, undefined, r.roomId + "FrequentsLoading");

	            finishedLoadingChats[r.chatId] = false;
	            promises.push(promise);
	            $(r).rebind('onHistoryDecrypted.recent', _histDecryptedCb.bind(this, r));
	        } else if (r.messagesBuff.messages.length < 32 && r.messagesBuff.haveMoreHistory()) {

	            loadingMoreChats[r.chatId] = true;
	            finishedLoadingChats[r.chatId] = false;
	            $(r).rebind('onHistoryDecrypted.recent', _histDecryptedCb.bind(this, r));
	            var promise = createTimeoutPromise(function () {
	                return finishedLoadingChats[r.chatId] === true;
	            }, 300, 15000);
	            promises.push(promise);
	            r.messagesBuff.retrieveChatHistory(false);
	        } else {
	            _calculateLastTsFor(r, 32);
	        };
	    });

	    var masterPromise = new MegaPromise();
	    MegaPromise.allDone(promises).always(function () {
	        var result = obj_values(recentContacts).sort(function (a, b) {
	            return a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0;
	        });
	        masterPromise.resolve(result.reverse());
	    });
	    return masterPromise;
	};

	Chat.prototype.eventuallyAddDldTicketToReq = function (req) {
	    if (!u_handle) {
	        return;
	    }

	    var currentRoom = this.getCurrentRoom();
	    if (currentRoom && currentRoom.type == "public" && currentRoom.publicChatHandle && (anonymouschat || currentRoom.membersSetFromApi && !currentRoom.membersSetFromApi.members[u_handle])) {
	        req['cauth'] = currentRoom.publicChatHandle;
	    }
	};

	Chat.prototype.loginOrRegisterBeforeJoining = function (chatHandle, forceRegister, forceLogin) {
	    if (!chatHandle && (page === 'chat' || page.indexOf('chat') > -1)) {
	        chatHandle = getSitePath().split("chat/")[1].split("#")[0];
	    }
	    assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');

	    var chatKey = "#" + window.location.hash.split("#").pop();
	    var doShowLoginDialog = function doShowLoginDialog() {
	        mega.ui.showLoginRequiredDialog({
	            minUserType: 3,
	            skipInitialDialog: 1
	        }).done(function () {
	            closeDialog();
	            topmenuUI();
	            if (page !== 'login') {
	                localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
	                window.location.reload();
	            }
	        });
	    };

	    var doShowRegisterDialog = function doShowRegisterDialog() {
	        mega.ui.showRegisterDialog({
	            title: l[5840],
	            onCreatingAccount: function onCreatingAccount() {},
	            onLoginAttemptFailed: function onLoginAttemptFailed(registerData) {
	                msgDialog('warninga:' + l[171], l[1578], l[218], null, function (e) {
	                    if (e) {
	                        $('.pro-register-dialog').addClass('hidden');
	                        if (signupPromptDialog) {
	                            signupPromptDialog.hide();
	                        }
	                        doShowLoginDialog();
	                    }
	                });
	            },

	            onAccountCreated: function onAccountCreated(gotLoggedIn, registerData) {
	                localStorage.awaitingConfirmationAccount = JSON.stringify(registerData);
	                localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);

	                mega.ui.sendSignupLinkDialog(registerData, false);
	                megaChat.destroy();
	            }
	        });
	    };

	    if (u_handle && u_handle !== "AAAAAAAAAAA") {

	        localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
	        window.location.reload();
	        return;
	    }
	    if (forceRegister) {
	        return doShowRegisterDialog();
	    } else if (forceLogin) {
	        return doShowLoginDialog();
	    }

	    if (u_wasloggedin()) {
	        doShowLoginDialog();
	    } else {
	        doShowRegisterDialog();
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
	var StartGroupChatWizard = __webpack_require__(39).StartGroupChatWizard;

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
	        renderableSummary = renderableSummary && escapeHTML(renderableSummary, true) || '';

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

	    var author;

	    if (lastMessage.dialogType === "privilegeChange" && lastMessage.meta && lastMessage.meta.targetUserId) {
	        author = M.u[lastMessage.meta.targetUserId[0]] || Message.getContactForMessage(lastMessage);
	    } else if (lastMessage.dialogType === "alterParticipants") {
	        author = M.u[lastMessage.meta.included[0] || lastMessage.meta.excluded[0]] || Message.getContactForMessage(lastMessage);
	    } else {
	        author = Message.getContactForMessage(lastMessage);
	    }
	    if (author) {
	        if (!lastMessage._contactChangeListener && author.addChangeListener) {
	            lastMessage._contactChangeListener = author.addChangeListener(function () {
	                delete lastMessage.renderableSummary;
	            });
	        }

	        if (lastMessage.chatRoom.type === "private") {
	            if (author && author.u === u_handle) {
	                renderableSummary = l[19285] + " " + renderableSummary;
	            }
	        } else if (lastMessage.chatRoom.type === "group" || lastMessage.chatRoom.type === "public") {
	            if (author) {
	                if (author.u === u_handle) {
	                    renderableSummary = l[19285] + " " + renderableSummary;
	                } else {
	                    var name = M.getNameByHandle(author.u);
	                    if (String(name).length > 10) {
	                        if (author.firstName) {
	                            name = author.firstName;
	                            if (author.lastName && String(author.lastName).length > 0) {
	                                var letter = String(author.lastName)[0];
	                                if (letter && letter.toUpperCase()) {
	                                    name += " " + letter.toUpperCase();
	                                }
	                            }
	                        }
	                    }
	                    name = ellipsis(name, undefined, 11);
	                    if (name) {
	                        renderableSummary = escapeHTML(name) + ": " + renderableSummary;
	                    }
	                }
	            }
	        }
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
	        } else if (chatRoom.type === "public") {
	            contactId = roomId;
	            id = 'conversation_' + contactId;
	            presenceClass = 'group';
	            classString += ' groupchat public';
	        } else {
	            return "unknown room type: " + chatRoom.roomId;
	        }

	        if (ChatdIntegration._loadingChats[chatRoom.roomId] && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise.state() === 'pending' || chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.joined === false || chatRoom.messagesBuff.joined === true && chatRoom.messagesBuff.haveMessages === true && chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.isDecrypting && chatRoom.messagesBuff.isDecrypting.state() === 'pending') {
	            this.loadingShown = true;
	        } else {
	            delete this.loadingShown;
	        }

	        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
	        var isUnread = false;

	        var notificationItems = [];
	        if (chatRoom.havePendingCall() && chatRoom.state != ChatRoom.STATE.LEFT) {
	            notificationItems.push(React.makeElement("i", {
	                className: "tiny-icon " + (chatRoom.isCurrentlyActive ? "blue" : "white") + "-handset",
	                key: "callIcon" }));
	        }
	        if (unreadCount > 0) {
	            notificationItems.push(React.makeElement(
	                "span",
	                { key: "unreadCounter" },
	                unreadCount > 9 ? "9+" : unreadCount
	            ));
	            isUnread = true;
	        }

	        var inCallDiv = null;

	        var lastMessageDiv = null;
	        var lastMessageDatetimeDiv = null;

	        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
	        var lastMsgDivClasses;
	        if (lastMessage) {
	            lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");

	            var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
	            lastMessage.renderableSummary = renderableSummary;

	            if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
	                lastMsgDivClasses += " call";
	                classString += " call-exists";
	            }
	            lastMessageDiv = React.makeElement("div", { className: lastMsgDivClasses, dangerouslySetInnerHTML: { __html: renderableSummary } });

	            var timestamp = lastMessage.delay;
	            var curTimeMarker;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
	            } else {

	                curTimeMarker = acc_time2date(timestamp, false);
	            }

	            lastMessageDatetimeDiv = React.makeElement(
	                "div",
	                { className: "date-time" },
	                curTimeMarker
	            );
	        } else {
	            lastMsgDivClasses = "conversation-message";

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

	            timestamp = chatRoom.ctime;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
	            } else {

	                curTimeMarker = acc_time2date(timestamp, false);
	            }
	            lastMessageDatetimeDiv = React.makeElement(
	                "div",
	                { className: "date-time" },
	                l[19077].replace("%s1", curTimeMarker)
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

	        if (chatRoom.type !== "public") {
	            nameClassString += " privateChat";
	        }
	        if (chatRoom.callManagerCall && (chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING)) {
	            classString += " have-incoming-ringing-call";
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
	            chatRoom.type === "group" || chatRoom.type === "private" ? React.makeElement("i", { className: "tiny-icon blue-key" }) : undefined,
	            archivedDiv,
	            notificationItems.length > 0 ? React.makeElement(
	                "div",
	                { className: "unread-messages items-" + notificationItems.length },
	                notificationItems
	            ) : null,
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

	        var nameClassString = "user-card-name conversation-name";

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
	        } else if (chatRoom.type === "public") {
	            contactId = roomId;
	            id = 'conversation_' + contactId;
	            presenceClass = 'group';
	            classString += ' groupchat public';
	        } else {
	            return "unknown room type: " + chatRoom.roomId;
	        }

	        var lastMessageDiv = null;
	        var lastMessageDatetimeDiv = null;
	        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
	        if (lastMessage) {
	            var lastMsgDivClasses = "conversation-message";
	            var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
	            lastMessage.renderableSummary = renderableSummary;

	            lastMessageDiv = React.makeElement("div", { className: lastMsgDivClasses, dangerouslySetInnerHTML: { __html: renderableSummary } });

	            var timestamp = lastMessage.delay;
	            var curTimeMarker;
	            var msgDate = new Date(timestamp * 1000);
	            var iso = msgDate.toISOString();
	            if (todayOrYesterday(iso)) {

	                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
	            } else {

	                curTimeMarker = acc_time2date(timestamp, false);
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
	        if (chatRoom.type !== "public") {
	            nameClassString += " privateChat";
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
	                        { className: nameClassString },
	                        React.makeElement(
	                            utils.EmojiFormattedContent,
	                            null,
	                            chatRoom.getRoomTitle()
	                        ),
	                        chatRoom.type === "group" ? React.makeElement("i", { className: "tiny-icon blue-key" }) : undefined
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
	        loadSubPage("fm/chat/p/" + contact.u);
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

	        sortedConversations.sort(M.sortObjFn(function (room) {
	            return !room.lastActivity ? room.ctime : room.lastActivity;
	        }, -1));

	        sortedConversations.forEach(function (chatRoom) {
	            var contact;
	            if (!chatRoom || !chatRoom.roomId) {
	                return;
	            }
	            if (!chatRoom.isDisplayable()) {
	                return;
	            }

	            if (u_attr && u_attr.b && u_attr.b.s === -1) {
	                chatRoom.privateReadOnlyChat = true;
	            } else {
	                if (chatRoom.type === "private") {
	                    contact = chatRoom.getParticipantsExceptMe()[0];
	                    if (!contact) {
	                        return;
	                    }
	                    contact = M.u[contact];

	                    if (contact) {
	                        if (!chatRoom.privateReadOnlyChat && !contact.c) {

	                            Soon(function () {
	                                chatRoom.privateReadOnlyChat = true;
	                            });
	                        } else if (chatRoom.privateReadOnlyChat && contact.c) {

	                            Soon(function () {
	                                chatRoom.privateReadOnlyChat = false;
	                            });
	                        }
	                    }
	                }
	            }

	            currConvsList.push(React.makeElement(ConversationsListItem, {
	                key: chatRoom.roomId,
	                chatRoom: chatRoom,
	                contact: contact,
	                messages: chatRoom.messagesBuff,
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
	                    if (!chatRoom.privateReadOnlyChat && !contact.c) {

	                        Soon(function () {
	                            chatRoom.privateReadOnlyChat = true;
	                        });
	                    } else if (chatRoom.privateReadOnlyChat && contact.c) {

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
	            'leftPaneWidth': mega.config.get('leftPaneWidth'),
	            'startGroupChatDialogShown': false
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

	        $(document.body).rebind('startNewChatLink.conversations', function (e) {
	            self.startGroupChatFlow = 2;
	            self.setState({ 'startGroupChatDialogShown': true });
	        });

	        window.addEventListener('resize', this.handleWindowResize);
	        $(document).rebind('keydown.megaChatTextAreaFocus', function (e) {

	            if (e.megaChatHandled) {
	                return;
	            }

	            var megaChat = self.props.megaChat;
	            if (megaChat.currentlyOpenedChat) {

	                if (megaChat.currentlyOpenedChat && megaChat.getCurrentRoom().isReadOnly() || $(e.target).is(".messages-textarea, input, textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $('.fm-dialog:visible,.dropdown:visible').length > 0 || $('input:focus,textarea:focus,select:focus').length > 0) {
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
	                if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
	                    $typeArea.trigger("focus");
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

	        if (anonymouschat) {
	            $('.conversationsApp .fm-left-panel').addClass('hidden');
	        } else {
	            $('.conversationsApp .fm-left-panel').removeClass('hidden');
	        }
	        this.handleWindowResize();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        window.removeEventListener('resize', this.handleWindowResize);
	        $(document).off('keydown.megaChatTextAreaFocus');
	        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.handleWindowResize();
	        this.initArchivedChatsScrolling();
	    },
	    handleWindowResize: function handleWindowResize() {

	        if (anonymouschat) {
	            $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
	                'margin-left': "0px"
	            });
	        } else {
	            $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
	                'margin-left': $('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width() + "px"
	            });
	        }
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
	    getTopButtonsForContactsPicker: function getTopButtonsForContactsPicker() {
	        var self = this;
	        if (!self._topButtonsContactsPicker) {
	            self._topButtonsContactsPicker = [{
	                'key': 'add',
	                'title': l[71],
	                'icon': 'rounded-plus colorized',
	                'onClick': function onClick(e) {
	                    contactAddDialog();
	                }
	            }, {
	                'key': 'newGroupChat',
	                'title': l[19483],
	                'icon': 'conversation-with-plus',
	                'onClick': function onClick(e) {
	                    self.startGroupChatFlow = 1;
	                    self.setState({ 'startGroupChatDialogShown': true });
	                }
	            }, {
	                'key': 'newChatLink',
	                'title': l[20638],
	                'icon': 'small-icon blue-chain colorized',
	                'onClick': function onClick(e) {
	                    self.startGroupChatFlow = 2;
	                    self.setState({ 'startGroupChatDialogShown': true });
	                }
	            }];
	        }
	        return self._topButtonsContactsPicker;
	    },
	    render: function render() {
	        var self = this;

	        var startGroupChatDialog = null;
	        if (self.state.startGroupChatDialogShown === true) {
	            startGroupChatDialog = React.makeElement(StartGroupChatWizard, {
	                name: "start-group-chat",
	                megaChat: self.props.megaChat,
	                flowType: self.startGroupChatFlow,
	                contacts: M.u,
	                onClose: function onClose() {
	                    self.setState({ 'startGroupChatDialogShown': false });
	                    delete self.startGroupChatFlow;
	                },
	                onConfirmClicked: function onConfirmClicked() {
	                    self.setState({ 'startGroupChatDialogShown': false });
	                    delete self.startGroupChatFlow;
	                }
	            });
	        }

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
	                chatUIFlags: megaChat.chatUIFlags,
	                className: megaChat.displayArchivedChats === true ? "hidden" : "",
	                conversations: this.props.megaChat.chats
	            }))
	        );
	        var archivedChatsCount = this.calcArchiveChats();
	        var arcBtnClass = megaChat.displayArchivedChats === true ? "left-pane-button archived active" : "left-pane-button archived";
	        var arcIconClass = megaChat.displayArchivedChats === true ? "small-icon archive white" : "small-icon archive colorized";
	        return React.makeElement(
	            "div",
	            { className: "conversationsApp", key: "conversationsApp" },
	            startGroupChatDialog,
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
	                                icon: "chat-with-plus",
	                                contacts: this.props.contacts
	                            },
	                            React.makeElement(DropdownsUI.DropdownContactsSelector, {
	                                className: "main-start-chat-dropdown",
	                                contacts: this.props.contacts,
	                                megaChat: this.props.megaChat,
	                                onSelectDone: this.startChatClicked,
	                                multiple: false,
	                                showTopButtons: self.getTopButtonsForContactsPicker()
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
	                        { className: "left-pane-button new-link", onClick: function onClick(e) {
	                                self.startGroupChatFlow = 2;
	                                self.setState({ 'startGroupChatDialogShown': true });
	                                return false;
	                            } },
	                        React.makeElement("i", { className: "small-icon blue-chain colorized" }),
	                        React.makeElement(
	                            "div",
	                            { className: "heading" },
	                            __(l[20638])
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: arcBtnClass, onClick: this.archiveChatsClicked },
	                        React.makeElement("i", { className: arcIconClass }),
	                        React.makeElement(
	                            "div",
	                            { className: "heading" },
	                            __(l[19066])
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "indicator" },
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	            if ($children.length === 0 || $children.length > 1) {
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
	        $elem.off('jsp-will-scroll-y.jsp' + this.getUniqueId());

	        $(window).off('resize.jsp' + this.getUniqueId());
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
	            $(window).off('resize.megaRenderMixing' + this.getUniqueId());
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

	        if (this.componentSpecificIsComponentEventuallyVisible) {
	            return this.componentSpecificIsComponentEventuallyVisible();
	        }

	        // ._isMounted is faster then .isMounted() or any other operation
	        if (!this._isMounted) {
	            return false;
	        }
	        if (this.props.isVisible) {
	            return true;
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
	        } else if (
	            !(v instanceof Uint8Array) && typeof v === "object" && v !== null &&
	            depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
	            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
	                foundChanges = true;
	            } else {
	                // console.error("NOT (recursive) changed: ", k, v);
	            }
	        } else if (!(v instanceof Uint8Array) && v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
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
	                var oldKeys = map.map(function(child) { return child ? child.key : child; });
	                var newKeys = referenceMap.map(function(child) { return child ? child.key : child; });
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
	        if (this.componentSpecificIsComponentEventuallyVisible) {
	            // we asume `componentSpecificIsComponentEventuallyVisible` is super quick/does have low CPU usage
	            if (!this._queueUpdateWhenVisible && !this.componentSpecificIsComponentEventuallyVisible()) {
	                this._queueUpdateWhenVisible = true;
	            }
	            else if (this._queueUpdateWhenVisible && this.componentSpecificIsComponentEventuallyVisible()) {
	                delete this._queueUpdateWhenVisible;
	                return true;
	            }
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
	                "renderedX: ", getElementName(),
	                "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
	                "props:", this.props,
	                "state:", this.state
	            );
	        }
	    }
	};
	if (localStorage.profileRenderFns) {
	    window.REACT_RENDER_CALLS = {};
	    var FUNCTIONS = [
	        'render',
	        'shouldComponentUpdate',
	        'doProgramaticScroll',
	        'componentDidMount',
	        'componentDidUpdate',
	        'componentWillUnmount',
	        'refreshUI',
	        'eventuallyInit',
	        'handleWindowResize',
	        'isActive',
	        'onMessagesScrollReinitialise',
	        'specificShouldComponentUpdate',
	        'attachAnimationEvents',
	        'eventuallyReinitialise',
	        'reinitialise',
	        'getContentHeight',
	        'onResize',
	        'isComponentEventuallyVisible'
	    ];

	    RenderDebugger.componentWillReceiveProps = function(nextProps, nextContext) {
	        // since this is not used in our app, we can use it as a pre-call hook to wrap render() fn's for performance
	        // logging
	        var self = this;
	        var componentName = self.constructor ? self.constructor.displayName : "unknown";
	        if (!this._wrappedRender) {
	            FUNCTIONS.forEach(function(fnName) {
	                var _origFn = self[fnName];
	                if (_origFn) {
	                    self[fnName] = function() {
	                        var start = performance.now();
	                        var res = _origFn.apply(this, arguments);
	                        REACT_RENDER_CALLS[componentName + "." + fnName] = REACT_RENDER_CALLS[componentName + "." + fnName]
	                            || 0;
	                        REACT_RENDER_CALLS[componentName + "." + fnName] += performance.now() - start;
	                        return res;
	                    };
	                }
	            });
	            self._wrappedRender = true;
	        }
	        REACT_RENDER_CALLS.sorted = function() {
	            var sorted = [];
	            Object.keys(REACT_RENDER_CALLS).sort(function(a, b) {
	                if (REACT_RENDER_CALLS[a] < REACT_RENDER_CALLS[b]) {
	                    return 1;
	                }
	                else if (REACT_RENDER_CALLS[a] > REACT_RENDER_CALLS[b]) {
	                    return -1;
	                }
	                else {
	                    return 0;
	                }
	            }).forEach(function(k) {
	                if (typeof REACT_RENDER_CALLS[k] !== 'function') {
	                    sorted.push([k, REACT_RENDER_CALLS[k]]);
	                }
	            });

	            return sorted;
	        };
	        REACT_RENDER_CALLS.clear = function() {
	            Object.keys(REACT_RENDER_CALLS).forEach(function(k) {
	                if (typeof REACT_RENDER_CALLS[k] !== 'function') {
	                    delete REACT_RENDER_CALLS[k];
	                }
	            });
	        };
	    }
	}

	window.MegaRenderMixin = MegaRenderMixin;

	module.exports = {
	    RenderDebugger: RenderDebugger,
	    MegaRenderMixin: MegaRenderMixin
	};


/***/ }),
/* 7 */
/***/ (function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var getMessageString;
	(function () {
	    var MESSAGE_STRINGS;
	    var MESSAGE_STRINGS_GROUP;
	    var _sanitizeStrings = function _sanitizeStrings(arg) {
	        if (typeof arg === "undefined") {
	            return arg;
	        } else if (typeof arg === "string") {
	            return escapeHTML(arg);
	        } else if (arg.forEach) {
	            arg.forEach(function (v, k) {
	                arg[k] = _sanitizeStrings(v);
	            });
	        } else if ((typeof arg === "undefined" ? "undefined" : _typeof(arg)) === "object") {
	            Object.keys(arg).forEach(function (k) {
	                arg[k] = _sanitizeStrings(arg[k]);
	            });
	        }
	        return arg;
	    };

	    getMessageString = function getMessageString(type, isGroupCall) {
	        if (!MESSAGE_STRINGS) {
	            MESSAGE_STRINGS = {
	                'outgoing-call': l[5891].replace("[X]", "[[[X]]]"),
	                'incoming-call': l[19964] || "[[%s]] is calling...",
	                'call-timeout': [l[18698].replace("[X]", "[[[X]]]")],
	                'call-starting': l[7206].replace("[X]", "[[[X]]]"),
	                'call-feedback': l[7998].replace("[X]", "[[[X]]]"),
	                'call-initialising': l[7207].replace("[X]", "[[[X]]]"),
	                'call-ended': [l[19965] || "Call ended.", l[7208]],
	                'remoteCallEnded': [l[19965] || "Call ended.", l[7208]],
	                'call-failed-media': l[7204],
	                'call-failed': [l[19966] || "Call failed.", l[7208]],
	                'call-handled-elsewhere': l[5895].replace("[X]", "[[[X]]]"),
	                'call-missed': l[17870],
	                'call-rejected': l[19040],
	                'call-canceled': l[19041],
	                'remoteCallStarted': l[5888],
	                'call-started': l[5888].replace("[X]", "[[[X]]]"),
	                'alterParticipants': undefined,
	                'privilegeChange': l[8915],
	                'truncated': l[8905]
	            };
	            _sanitizeStrings(MESSAGE_STRINGS);
	        }
	        if (isGroupCall && !MESSAGE_STRINGS_GROUP) {
	            MESSAGE_STRINGS_GROUP = {
	                'call-ended': [l[19967], l[7208]],
	                'remoteCallEnded': [l[19967], l[7208]],
	                'call-handled-elsewhere': l[19968],
	                'call-canceled': l[19969],
	                'call-started': l[19970]
	            };
	            _sanitizeStrings(MESSAGE_STRINGS_GROUP);
	        }
	        return !isGroupCall ? MESSAGE_STRINGS[type] : MESSAGE_STRINGS_GROUP[type] ? MESSAGE_STRINGS_GROUP[type] : MESSAGE_STRINGS[type];
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var x = 0;
	var PerfectScrollbar = React.createClass({
	    displayName: "PerfectScrollbar",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    isUserScroll: true,
	    scrollEventIncId: 0,
	    getDefaultProps: function getDefaultProps() {
	        return {
	            className: "perfectScrollbarContainer",
	            requiresUpdateOnResize: true
	        };
	    },
	    doProgramaticScroll: function doProgramaticScroll(newPos, forced, isX) {
	        var self = this;
	        var $elem = $(ReactDOM.findDOMNode(self));
	        var animFrameInner = false;

	        var prop = !isX ? 'scrollTop' : 'scrollLeft';

	        if (!forced && $elem[0] && $elem[0][prop] === newPos) {
	            return;
	        }

	        var idx = self.scrollEventIncId++;

	        $elem.rebind('scroll.progscroll' + idx, function (idx, e) {
	            if (animFrameInner) {
	                cancelAnimationFrame(animFrameInner);
	                animFrameInner = false;
	            }
	            $elem.off('scroll.progscroll' + idx);
	            self.isUserScroll = true;
	        }.bind(this, idx));

	        self.isUserScroll = false;
	        $elem[0][prop] = newPos;
	        Ps.update($elem[0]);

	        animFrameInner = requestAnimationFrame(function (idx) {
	            animFrameInner = false;
	            self.isUserScroll = true;
	            $elem.off('scroll.progscroll' + idx);
	        }.bind(this, idx));
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

	        $elem.rebind('ps-scroll-y.ps' + self.getUniqueId(), function (e) {
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
	        this.attachAnimationEvents();
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var $elem = $(ReactDOM.findDOMNode(this));
	        $elem.off('ps-scroll-y.ps' + this.getUniqueId());

	        var ns = '.ps' + this.getUniqueId();
	        $elem.parents('.have-animation').unbind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);
	    },
	    attachAnimationEvents: function attachAnimationEvents() {
	        var self = this;
	        if (!self.isMounted()) {
	            return;
	        }

	        var $haveAnimationNode = self._haveAnimNode;

	        if (!$haveAnimationNode) {
	            var $node = $(self.findDOMNode());
	            var ns = '.ps' + self.getUniqueId();
	            $haveAnimationNode = self._haveAnimNode = $node.parents('.have-animation');
	        }

	        $haveAnimationNode.rebind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns, function (e) {
	            self.safeForceUpdate(true);
	            if (self.props.onAnimationEnd) {
	                self.props.onAnimationEnd();
	            }
	        });
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

	        self.doProgramaticScroll($elem[0].scrollTop, true);

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
	        this.doProgramaticScroll(9999999);

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
	            this.doProgramaticScroll(targetPx);

	            if (!skipReinitialised) {
	                this.reinitialised(true);
	            }
	        }
	    },
	    scrollToPercentX: function scrollToPercentX(posPerc, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        var targetPx = this.getScrollWidth() / 100 * posPerc;
	        if ($elem[0].scrollLeft !== targetPx) {
	            this.doProgramaticScroll(targetPx, false, true);
	            if (!skipReinitialised) {
	                this.reinitialised(true);
	            }
	        }
	    },
	    scrollToY: function scrollToY(posY, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        if ($elem[0].scrollTop !== posY) {
	            this.doProgramaticScroll(posY);

	            if (!skipReinitialised) {
	                this.reinitialised(true);
	            }
	        }
	    },
	    scrollToElement: function scrollToElement(element, skipReinitialised) {
	        var $elem = $(this.findDOMNode());
	        if (!element || !element.offsetTop) {
	            return;
	        }

	        this.doProgramaticScroll(element.offsetTop);

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
	        this.attachAnimationEvents();
	    },
	    render: function render() {
	        var self = this;
	        return React.makeElement(
	            "div",
	            _extends({}, this.props, { onResize: this.onResize, onAnimationEnd: function onAnimationEnd() {
	                    self.onResize();
	                    if (this.props.triggerGlobalResize) {
	                        $.tresizer();
	                    }
	                } }),
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	                    if ($scrollables.length > 0) {
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
	            $(document).off('keyup.button' + this.getUniqueId());
	            $(document).off('closeDropdowns.' + this.getUniqueId());
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	                if ($container.length == 0) {
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
	                            var $arrow = $('.dropdown-white-arrow', $element);
	                            var arrowHeight;
	                            if (self.props.arrowHeight) {
	                                arrowHeight = self.props.arrowHeight;
	                                if (info.vertical !== "top") {
	                                    arrowHeight = arrowHeight * -1;
	                                } else {
	                                    arrowHeight = 0;
	                                }
	                            } else {
	                                arrowHeight = $arrow.outerHeight();
	                            }
	                            if (info.vertical != "top") {
	                                $(this).removeClass("up-arrow").addClass("down-arrow");
	                            } else {
	                                $(this).removeClass("down-arrow").addClass("up-arrow");
	                            }

	                            vertOffset += info.vertical == "top" ? arrowHeight : 0;
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	                positionAt: this.props.positionAt,
	                arrowHeight: this.props.arrowHeight,
	                vertOffset: this.props.vertOffset
	            },
	            React.makeElement(ContactsUI.ContactPickerWidget, {
	                active: this.props.active,
	                className: "popup contacts-search tooltip-blur small-footer",
	                contacts: this.props.contacts,
	                selectFooter: this.props.selectFooter,
	                megaChat: this.props.megaChat,
	                exclude: this.props.exclude,
	                allowEmpty: this.props.allowEmpty,
	                multiple: this.props.multiple,
	                showTopButtons: this.props.showTopButtons,
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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
	                    { className: "dropdown-user-name", onClick: function onClick() {
	                            if (contact.c === 2) {
	                                loadSubPage('fm/account');
	                            }
	                            if (contact.c === 1) {
	                                loadSubPage('fm/' + contact.u);
	                            }
	                        } },
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
	                        key: "startCall", className: "contains-submenu", icon: "context handset", label: __(l[19125]),
	                        onClick: function onClick() {
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
	                            loadSubPage('fm/chat/p/' + contact.u);
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
	            } else if (!contact.c) {
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
	                                msgDialog('warningb', '', l[17545]);
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;
	        var contact = this.props.contact;
	        if (!contact || !contact.u || anonymouschat) {
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

	        var classes = (this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar') + ' ' + contact.u + ' in-chat';

	        classes += " chat-avatar";

	        var displayedAvatar;

	        var verifiedElement = null;

	        if (!this.props.hideVerifiedBadge && !anonymouschat) {
	            verifiedElement = React.makeElement(ContactVerified, { contact: this.props.contact, className: this.props.verifiedClassName });
	        }

	        if (!avatars[contact.u] && !_noAvatars[contact.u]) {
	            useravatar.loadAvatar(contact.u, pchandle).done(function () {
	                self.safeForceUpdate();
	            }).fail(function (e) {
	                _noAvatars[contact.u] = true;
	            });
	        }

	        var extraProps = {};
	        if (this.props.simpletip) {
	            classes += " simpletip";
	            extraProps['data-simpletip'] = this.props.simpletip;
	            if (this.props.simpletipWrapper) {
	                extraProps['data-simpletipwrapper'] = this.props.simpletipWrapper;
	            }
	            if (this.props.simpletipOffset) {
	                extraProps['data-simpletipoffset'] = this.props.simpletipOffset;
	            }
	            if (this.props.simpletipPosition) {
	                extraProps['data-simpletipposition'] = this.props.simpletipPosition;
	            }
	        }
	        if (avatarMeta.type === "image") {
	            displayedAvatar = React.makeElement(
	                "div",
	                _extends({ className: classes, style: this.props.style
	                }, extraProps, {
	                    onClick: self.props.onClick ? function (e) {
	                        $(document).trigger('closeDropdowns');
	                        self.props.onClick(e);
	                    } : self.onClick }),
	                verifiedElement,
	                React.makeElement("img", { src: avatarMeta.avatar, style: this.props.imgStyles })
	            );
	        } else {
	            classes += " color" + avatarMeta.avatar.colorIndex;

	            displayedAvatar = React.makeElement(
	                "div",
	                _extends({ className: classes, style: this.props.style
	                }, extraProps, {
	                    onClick: self.props.onClick ? function (e) {
	                        $(document).trigger('closeDropdowns');
	                        self.props.onClick(e);
	                    } : self.onClick }),
	                verifiedElement,
	                React.makeElement(
	                    "span",
	                    null,
	                    avatarMeta.avatar.letters
	                )
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
	        if (contact.u == u_handle) {
	            username += " (Me)";
	        }
	        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
	        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
	        var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
	        var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];

	        var usernameBlock;
	        if (!noContextMenu && !anonymouschat) {
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

	        var userCard = null;
	        var className = this.props.className || "";
	        if (className.indexOf("short") >= 0) {
	            var presenceRow;
	            var lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
	            if (this.props.showLastGreen && contact.presence <= 2 && lastActivity) {
	                presenceRow = (l[19994] || "Last seen %s").replace("%s", time2last(lastActivity));
	            } else {
	                presenceRow = M.onlineStatusClass(contact.presence)[0];
	            }

	            userCard = React.makeElement(
	                "div",
	                { className: "user-card-data" },
	                usernameBlock,
	                React.makeElement(
	                    "div",
	                    { className: "user-card-status" },
	                    React.makeElement(ContactPresence, { contact: contact, className: this.props.presenceClassName }),
	                    this.props.isInCall ? React.makeElement("i", { className: "small-icon audio-call" }) : null,
	                    presenceRow
	                )
	            );
	        } else {
	            userCard = React.makeElement(
	                "div",
	                { className: "user-card-data" },
	                usernameBlock,
	                React.makeElement(ContactPresence, { contact: contact, className: this.props.presenceClassName }),
	                this.props.isInCall ? React.makeElement("i", { className: "small-icon audio-call" }) : null,
	                React.makeElement(
	                    "div",
	                    { className: "user-card-email" },
	                    contact.m
	                )
	            );
	        }

	        var selectionTick = null;
	        if (this.props.selectable) {
	            selectionTick = React.makeElement(
	                "div",
	                { className: "user-card-tick-wrap" },
	                React.makeElement("i", { className: "small-icon mid-green-tick" })
	            );
	        }

	        return React.makeElement(
	            "div",
	            {
	                className: "contacts-info body " + (pres === "offline" ? "offline" : "") + (className ? " " + className : ""),
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
	            anonymouschat || noContextButton ? null : React.makeElement(ContactButton, { key: "button",
	                dropdowns: dropdowns,
	                dropdownIconClasses: self.props.dropdownIconClasses ? self.props.dropdownIconClasses : "",
	                disabled: self.props.dropdownDisabled,
	                noContextMenu: noContextMenu,
	                contact: contact,
	                className: self.props.dropdownButtonClasses,
	                dropdownRemoveButton: dropdownRemoveButton,
	                megaChat: self.props.megaChat ? this.props.megaChat : window.megaChat
	            }),
	            selectionTick,
	            userCard
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
	            { className: "selected-contact-card short" },
	            React.makeElement(
	                "div",
	                { className: "remove-contact-bttn", onClick: function onClick(e) {
	                        if (self.props.onClick) {
	                            self.props.onClick(contact, e);
	                        }
	                    } },
	                React.makeElement("i", { className: "tiny-icon small-cross" })
	            ),
	            React.makeElement(Avatar, { contact: contact, className: "avatar-wrapper small-rounded-avatar", hideVerifiedBadge: true }),
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

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getInitialState: function getInitialState() {
	        return {
	            'searchValue': '',
	            'selected': this.props.selected || false
	        };
	    },
	    getDefaultProps: function getDefaultProps() {
	        return {
	            multipleSelectedButtonLabel: false,
	            singleSelectedButtonLabel: false,
	            nothingSelectedButtonLabel: false,
	            allowEmpty: false
	        };
	    },
	    onSearchChange: function onSearchChange(e) {
	        var self = this;
	        self.setState({ searchValue: e.target.value });
	    },
	    componentDidMount: function componentDidMount() {
	        setContactLink();
	    },
	    componentDidUpdate: function componentDidUpdate() {

	        var self = this;
	        if (self.scrollToLastSelected && self.psSelected) {

	            self.scrollToLastSelected = false;
	            self.psSelected.scrollToPercentX(100, false);
	        }

	        setContactLink();
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;

	        if (self.props.multiple) {
	            var KEY_ENTER = 13;

	            $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function (e) {
	                var keyCode = e.which || e.keyCode;
	                if (keyCode === KEY_ENTER) {
	                    if (self.state.selected) {
	                        e.preventDefault();
	                        e.stopPropagation();

	                        $(document).trigger('closeDropdowns');

	                        if (self.props.onSelectDone) {
	                            self.props.onSelectDone(self.state.selected);
	                        }
	                    }
	                }
	            });
	        }

	        self._frequents = megaChat.getFrequentContacts();
	        self._frequents.always(function (r) {
	            self._foundFrequents = r.reverse().splice(0, 30);
	            self.safeForceUpdate();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;

	        delete self._foundFrequents;
	        delete self._frequents;

	        if (self.props.multiple) {
	            $(document.body).off('keypress.contactPicker' + self.getUniqueId());
	        }
	    },
	    _eventuallyAddContact: function _eventuallyAddContact(v, contacts, selectableContacts, forced) {
	        var self = this;
	        if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {

	            return false;
	        }

	        var pres = self.props.megaChat.getPresence(v.u);

	        if (!forced && (v.c != 1 || v.u == u_handle)) {
	            return false;
	        }

	        var avatarMeta = generateAvatarMeta(v.u);

	        if (self.state.searchValue && self.state.searchValue.length > 0) {

	            if (avatarMeta.fullName.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1 && v.m.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1) {
	                return false;
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
	            className: "contacts-search short " + selectedClass,
	            noContextButton: "true",
	            selectable: selectableContacts,
	            onClick: self.props.readOnly ? function () {} : function (contact, e) {
	                var contactHash = contact.u;

	                if (contactHash === self.lastClicked && new Date() - self.clickTime < 500 || !self.props.multiple) {

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
	        return true;
	    },
	    render: function render() {
	        var self = this;

	        var contacts = [];
	        var frequentContacts = [];
	        var extraClasses = "";

	        var contactsSelected = [];

	        var multipleContacts = null;
	        var topButtons = null;
	        var selectableContacts = false;
	        var selectFooter = null;
	        var selectedContacts = false;
	        var isSearching = !!self.state.searchValue;

	        var onAddContact = function onAddContact(e) {

	            e.preventDefault();
	            e.stopPropagation();

	            contactAddDialog();
	        };

	        if (self.props.readOnly) {
	            (self.state.selected || []).forEach(function (v, k) {
	                contactsSelected.push(React.makeElement(ContactItem, { contact: self.props.contacts[v], key: v }));
	            });
	        } else if (self.props.multiple) {
	            selectableContacts = true;

	            var onSelectDoneCb = function onSelectDoneCb(e) {

	                e.preventDefault();
	                e.stopPropagation();

	                $(document).trigger('closeDropdowns');

	                if (self.props.onSelectDone) {
	                    self.props.onSelectDone(self.state.selected);
	                }
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
	            var selectedWidth = self.state.selected.length * 54;

	            if (!self.state.selected || self.state.selected.length === 0) {
	                selectedContacts = false;

	                multipleContacts = React.makeElement(
	                    "div",
	                    { className: "horizontal-contacts-list" },
	                    React.makeElement(
	                        "div",
	                        { className: "contacts-list-empty-txt" },
	                        self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : l[8889]
	                    )
	                );
	            } else {
	                selectedContacts = true;

	                (self.state.selected || []).forEach(function (v, k) {
	                    contactsSelected.push(React.makeElement(ContactItem, { contact: self.props.contacts[v], onClick: onContactSelectDoneCb,
	                        key: v
	                    }));
	                });

	                multipleContacts = React.makeElement(
	                    "div",
	                    { className: "horizontal-contacts-list" },
	                    React.makeElement(
	                        PerfectScrollbar,
	                        { className: "perfectScrollbarContainer selected-contact-block horizontal-only",
	                            selected: this.state.selected,
	                            ref: function ref(psSelected) {
	                                self.psSelected = psSelected;
	                            } },
	                        React.makeElement(
	                            "div",
	                            { className: "select-contact-centre", style: { width: selectedWidth } },
	                            contactsSelected
	                        )
	                    )
	                );
	            }

	            if (self.props.selectFooter) {

	                selectFooter = React.makeElement(
	                    "div",
	                    { className: "fm-dialog-footer" },
	                    React.makeElement(
	                        "a",
	                        { href: "javascript:;", className: "default-white-button left", onClick: onAddContact },
	                        l[71]
	                    ),
	                    React.makeElement(
	                        "a",
	                        { href: "javascript:;", className: "default-grey-button right " + (!selectedContacts ? "disabled" : ""),
	                            onClick: function onClick(e) {
	                                if (self.state.selected.length > 0) {
	                                    onSelectDoneCb(e);
	                                }
	                            } },
	                        this.props.multipleSelectedButtonLabel ? this.props.multipleSelectedButtonLabel : l[8890]
	                    )
	                );
	            }
	        }

	        if (self.props.showTopButtons) {
	            var _topButtons = [];

	            self.props.showTopButtons.forEach(function (button) {
	                _topButtons.push(React.makeElement(
	                    "div",
	                    { className: "link-button light", key: button.key, onClick: function onClick(e) {
	                            e.preventDefault();
	                            e.stopPropagation();

	                            $(document).trigger('closeDropdowns');

	                            button.onClick(e);
	                        } },
	                    React.makeElement("i", { className: "small-icon " + button.icon }),
	                    button.title
	                ));
	            });
	            topButtons = React.makeElement(
	                "div",
	                { className: "contacts-search-buttons" },
	                _topButtons
	            );
	        }

	        var alreadyAdded = {};
	        var hideFrequents = !self.props.readOnly && !self.state.searchValue && frequentContacts.length > 0;
	        var frequentsLoading = false;
	        if (self._frequents && !self._foundFrequents) {
	            if (self._frequents.state() === 'pending') {
	                hideFrequents = false;
	                frequentsLoading = true;
	            }
	        } else if (!self.props.readOnly && self._foundFrequents) {
	            var totalFound = 0;
	            self._foundFrequents.forEach(function (v) {
	                if (totalFound < 5 && M.u[v.userId]) {
	                    if (self._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
	                        alreadyAdded[v.userId] = 1;
	                        totalFound++;
	                    }
	                }
	            });
	        }

	        self.props.contacts.forEach(function (v, k) {
	            !alreadyAdded[v.h] && self._eventuallyAddContact(v, contacts, selectableContacts);
	        });

	        if (Object.keys(alreadyAdded).length === 0) {
	            hideFrequents = true;
	        }
	        var innerDivStyles = {};

	        if (this.props.showMeAsSelected) {
	            self._eventuallyAddContact(M.u[u_handle], contacts, selectableContacts, true);
	        }
	        var noOtherContacts = false;
	        if (contacts.length === 0) {
	            noOtherContacts = true;
	            var noContactsMsg = "";
	            if (M.u.length < 2) {
	                noContactsMsg = l[8877];
	            } else {
	                noContactsMsg = l[8878];
	            }

	            if (hideFrequents) {
	                contacts = React.makeElement(
	                    "em",
	                    null,
	                    noContactsMsg
	                );
	            }
	        }

	        var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;

	        var contactsList;
	        if (haveContacts) {
	            if (frequentContacts.length === 0 && noOtherContacts) {
	                contactsList = React.makeElement(
	                    "div",
	                    { className: "chat-contactspicker-no-contacts" },
	                    React.makeElement(
	                        "div",
	                        { className: "contacts-list-header" },
	                        l[165]
	                    ),
	                    React.makeElement("div", { className: "fm-empty-contacts-bg" }),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-empty-cloud-txt small" },
	                        l[784]
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-empty-description small" },
	                        l[19115]
	                    )
	                );
	            } else {
	                contactsList = React.makeElement(
	                    utils.JScrollPane,
	                    { className: "contacts-search-scroll",
	                        selected: this.state.selected,
	                        changedHashProp: this.props.changedHashProp,
	                        searchValue: this.state.searchValue },
	                    React.makeElement(
	                        "div",
	                        null,
	                        React.makeElement(
	                            "div",
	                            { className: "contacts-search-subsection",
	                                style: { 'display': !hideFrequents ? "" : "none" } },
	                            React.makeElement(
	                                "div",
	                                { className: "contacts-list-header" },
	                                l[20141]
	                            ),
	                            frequentsLoading ? React.makeElement(
	                                "div",
	                                { className: "loading-spinner" },
	                                "..."
	                            ) : React.makeElement(
	                                "div",
	                                { className: "contacts-search-list", style: innerDivStyles },
	                                frequentContacts
	                            )
	                        ),
	                        contacts.length > 0 ? React.makeElement(
	                            "div",
	                            { className: "contacts-search-subsection" },
	                            React.makeElement(
	                                "div",
	                                { className: "contacts-list-header" },
	                                !frequentsLoading && frequentContacts.length === 0 ? !self.props.readOnly ? l[165] : l[16217] : l[165]
	                            ),
	                            React.makeElement(
	                                "div",
	                                { className: "contacts-search-list", style: innerDivStyles },
	                                contacts
	                            )
	                        ) : undefined
	                    )
	                );
	            }
	        } else {
	            contactsList = React.makeElement(
	                "div",
	                { className: "chat-contactspicker-no-contacts" },
	                React.makeElement(
	                    "div",
	                    { className: "contacts-list-header" },
	                    l[165]
	                ),
	                React.makeElement("div", { className: "fm-empty-contacts-bg" }),
	                React.makeElement(
	                    "div",
	                    { className: "fm-empty-cloud-txt small" },
	                    l[784]
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "fm-empty-description small" },
	                    l[19115]
	                ),
	                React.makeElement(
	                    "div",
	                    { className: " big-red-button fm-empty-button", onClick: function onClick(e) {
	                            contactAddDialog();
	                        } },
	                    l[101]
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "empty-share-public" },
	                    React.makeElement("i", { className: "small-icon icons-sprite grey-chain" }),
	                    React.makeElement("span", { dangerouslySetInnerHTML: { __html: l[19111] } })
	                )
	            );

	            extraClasses += " no-contacts";
	        }

	        var displayStyle = self.state.searchValue && self.state.searchValue.length > 0 ? "" : "none";
	        return React.makeElement(
	            "div",
	            { className: this.props.className + " " + extraClasses },
	            multipleContacts,
	            !self.props.readOnly && haveContacts ? React.makeElement(
	                "div",
	                { className: "contacts-search-header " + this.props.headerClasses },
	                React.makeElement("i", { className: "small-icon thin-search-icon" }),
	                React.makeElement("input", {
	                    autoFocus: true,
	                    type: "search",
	                    placeholder: __(l[8010]),
	                    ref: "contactSearchField",
	                    onChange: this.onSearchChange,
	                    value: this.state.searchValue
	                }),
	                React.makeElement("div", {
	                    onClick: function onClick(e) {
	                        self.setState({ searchValue: '' });
	                        self.refs.contactSearchField.focus();
	                    },
	                    className: "search-result-clear",
	                    style: { display: displayStyle }
	                })
	            ) : null,
	            topButtons,
	            contactsList,
	            selectFooter
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
	var Accordion = __webpack_require__(21).Accordion;
	var AccordionPanel = __webpack_require__(21).AccordionPanel;
	var ParticipantsList = __webpack_require__(22).ParticipantsList;

	var GenericConversationMessage = __webpack_require__(23).GenericConversationMessage;
	var AlterParticipantsConversationMessage = __webpack_require__(29).AlterParticipantsConversationMessage;
	var TruncatedMessage = __webpack_require__(30).TruncatedMessage;
	var PrivilegeChange = __webpack_require__(31).PrivilegeChange;
	var TopicChange = __webpack_require__(32).TopicChange;
	var SharedFilesAccordionPanel = __webpack_require__(33).SharedFilesAccordionPanel;
	var IncomingSharesAccordionPanel = __webpack_require__(34).IncomingSharesAccordionPanel;

	var CloseOpenModeMessage = __webpack_require__(35).CloseOpenModeMessage;
	var ChatHandleMessage = __webpack_require__(36).ChatHandleMessage;
	var ChatlinkDialog = __webpack_require__(37).ChatlinkDialog;

	var ENABLE_GROUP_CALLING_FLAG = true;

	var ConversationAudioVideoPanel = __webpack_require__(38).ConversationAudioVideoPanel;

	var JoinCallNotification = React.createClass({
	    displayName: "JoinCallNotification",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    componentDidUpdate: function componentDidUpdate() {
	        var $node = $(this.findDOMNode());
	        var room = this.props.chatRoom;
	        $('a.joinActiveCall', $node).rebind('click.joinCall', function (e) {
	            room.joinCall();
	            e.preventDefault();
	            return false;
	        });
	    },
	    render: function render() {
	        var room = this.props.chatRoom;
	        if (Object.keys(room.callParticipants).length >= RtcModule.kMaxCallReceivers) {
	            return React.makeElement(
	                "div",
	                { className: "in-call-notif yellow join" },
	                React.makeElement("i", { className: "small-icon audio-call colorized" }),
	                l[20200]
	            );
	        } else {
	            var translatedCode = escapeHTML(l[20460] || "There is an active group call. [A]Join[/A]");
	            translatedCode = translatedCode.replace("[A]", '<a href="javascript:;" class="joinActiveCall">').replace('[/A]', '</a>');

	            return React.makeElement(
	                "div",
	                { className: "in-call-notif neutral join" },
	                React.makeElement("i", { className: "small-icon audio-call colorized" }),
	                React.makeElement("span", { dangerouslySetInnerHTML: { __html: translatedCode } })
	            );
	        }
	    }
	});

	var ConversationRightArea = React.createClass({
	    displayName: "ConversationRightArea",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true
	        };
	    },
	    componentSpecificIsComponentEventuallyVisible: function componentSpecificIsComponentEventuallyVisible() {
	        return this.props.chatRoom.isCurrentlyActive;
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

	        var disabledCalls = room.isReadOnly() || !room.chatId || room.callManagerCall && room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_INCOMING;

	        var disableStartCalls = disabledCalls || megaChat.haveAnyIncomingOrOutgoingCall(room.chatIdBin) || (room.type === "group" || room.type === "public") && !ENABLE_GROUP_CALLING_FLAG;

	        var startAudioCallButtonClass = "";
	        var startVideoCallButtonClass = "";

	        if (disabledCalls || disableStartCalls) {
	            startAudioCallButtonClass = startVideoCallButtonClass = "disabled";
	        }

	        var startAudioCallButton = React.makeElement(
	            "div",
	            { className: "link-button light" + " " + startVideoCallButtonClass, onClick: function onClick() {
	                    if (!disableStartCalls) {
	                        room.startAudioCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon colorized audio-call" }),
	            __(l[5896])
	        );

	        var startVideoCallButton = React.makeElement(
	            "div",
	            { className: "link-button light" + " " + startVideoCallButtonClass, onClick: function onClick() {
	                    if (!disableStartCalls) {
	                        room.startVideoCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon colorized video-call" }),
	            __(l[5897])
	        );
	        var AVseperator = React.makeElement("div", { className: "chat-button-seperator" });
	        var endCallButton = React.makeElement(
	            "div",
	            { className: "link-button light red", onClick: function onClick() {
	                    if (room.callManagerCall) {
	                        room.callManagerCall.endCall();
	                    }
	                } },
	            React.makeElement("i", { className: "small-icon colorized horizontal-red-handset" }),
	            room.type === "group" || room.type === "public" ? "Leave call" : l[5884]
	        );

	        if (room.callManagerCall && room.callManagerCall.isActive() === true) {
	            startAudioCallButton = startVideoCallButton = null;
	        } else {
	            endCallButton = null;
	        }

	        if (room.type === "group" || room.type === "public") {
	            if (room.callParticipants && Object.keys(room.callParticipants).length > 0 && (!room.callManagerCall || room.callManagerCall.isActive() === false)) {

	                startAudioCallButton = startVideoCallButton = null;
	            }
	        }

	        if ((room.type === "group" || room.type === "public") && !ENABLE_GROUP_CALLING_FLAG) {
	            startAudioCallButton = startVideoCallButton = null;
	        }

	        var isReadOnlyElement = null;

	        if (room.isReadOnly()) {
	            isReadOnlyElement = React.makeElement(
	                "center",
	                { className: "center", style: { margin: "6px" } },
	                "(read only chat)"
	            );
	        }
	        var excludedParticipants = room.type === "group" || room.type === "public" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipants() : room.getParticipants();

	        if (excludedParticipants.indexOf(u_handle) >= 0) {
	            array.remove(excludedParticipants, u_handle, false);
	        }
	        var dontShowTruncateButton = false;
	        if (!room.iAmOperator() || room.isReadOnly() || room.messagesBuff.messages.length === 0 || room.messagesBuff.messages.length === 1 && room.messagesBuff.messages.getItem(0).dialogType === "truncated") {
	            dontShowTruncateButton = true;
	        }

	        var renameButtonClass = "link-button light " + (room.isReadOnly() || !room.iAmOperator() ? "disabled" : "");

	        var participantsList = null;
	        if (room.type === "group" || room.type === "public") {
	            participantsList = React.makeElement(
	                "div",
	                null,
	                isReadOnlyElement,
	                React.makeElement(ParticipantsList, {
	                    chatRoom: room,
	                    members: room.members,
	                    isCurrentlyActive: room.isCurrentlyActive
	                }),
	                React.makeElement(
	                    ButtonsUI.Button,
	                    {
	                        className: "link-button green light",
	                        icon: "rounded-plus colorized",
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
	                        positionAt: "left bottom",
	                        arrowHeight: -32,
	                        selectFooter: true
	                    })
	                )
	            );
	        }

	        return React.makeElement(
	            "div",
	            { className: "chat-right-area" },
	            React.makeElement(
	                PerfectScrollbar,
	                {
	                    className: "chat-right-area conversation-details-scroll",
	                    options: {
	                        'suppressScrollX': true
	                    },
	                    ref: function ref(_ref) {
	                        self.rightScroll = _ref;
	                    },
	                    triggerGlobalResize: true,
	                    chatRoom: self.props.chatRoom },
	                React.makeElement(
	                    "div",
	                    { className: "chat-right-pad" },
	                    React.makeElement(
	                        Accordion,
	                        {
	                            onToggle: function onToggle() {

	                                setTimeout(function () {
	                                    if (self.rightScroll) {
	                                        self.rightScroll.reinitialise();
	                                    }
	                                }, 250);
	                            },
	                            expandedPanel: room.type === "group" || room.type === "public" ? "participants" : "options" },
	                        participantsList ? React.makeElement(
	                            AccordionPanel,
	                            { className: "small-pad", title: l[8876], key: "participants" },
	                            participantsList
	                        ) : null,
	                        room.type === "public" ? React.makeElement(
	                            "div",
	                            { className: "accordion-text observers" },
	                            l[20466],
	                            React.makeElement(
	                                "span",
	                                { className: "observers-count" },
	                                React.makeElement("i", { className: "tiny-icon eye" }),
	                                self.props.chatRoom.observers
	                            )
	                        ) : React.makeElement("div", null),
	                        React.makeElement(
	                            AccordionPanel,
	                            { className: "have-animation buttons", title: l[7537], key: "options" },
	                            React.makeElement(
	                                "div",
	                                null,
	                                startAudioCallButton,
	                                startVideoCallButton,
	                                AVseperator,
	                                room.type == "group" || room.type == "public" ? React.makeElement(
	                                    "div",
	                                    { className: renameButtonClass,
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
	                                                return false;
	                                            }
	                                            if (self.props.onRenameClicked) {
	                                                self.props.onRenameClicked();
	                                            }
	                                        } },
	                                    React.makeElement("i", { className: "small-icon colorized writing-pen" }),
	                                    l[9080]
	                                ) : null,
	                                !room.isReadOnly() && room.type === "public" ? React.makeElement(
	                                    "div",
	                                    { className: "link-button light",
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
	                                                return false;
	                                            }

	                                            self.props.onGetManageChatLinkClicked();
	                                        } },
	                                    React.makeElement("i", { className: "small-icon blue-chain colorized" }),
	                                    l[20481]
	                                ) : null,
	                                !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === "public" && !anonymouschat && room.publicChatHandle && room.publicChatKey ? React.makeElement(
	                                    "div",
	                                    { className: "link-button light",
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
	                                                return false;
	                                            }

	                                            self.props.onJoinViaPublicLinkClicked();
	                                        } },
	                                    React.makeElement("i", { className: "small-icon writing-pen" }),
	                                    l[20597]
	                                ) : null,
	                                React.makeElement(
	                                    ButtonsUI.Button,
	                                    {
	                                        className: "link-button light dropdown-element",
	                                        icon: "rounded-grey-up-arrow colorized",
	                                        label: __(l[6834] + "..."),
	                                        disabled: room.isReadOnly()
	                                    },
	                                    React.makeElement(
	                                        DropdownsUI.Dropdown,
	                                        {
	                                            contacts: this.props.contacts,
	                                            megaChat: this.props.megaChat,
	                                            className: "wide-dropdown send-files-selector light",
	                                            noArrow: "true",
	                                            vertOffset: 4,
	                                            onClick: function onClick() {}
	                                        },
	                                        React.makeElement(
	                                            "div",
	                                            { className: "dropdown info-txt" },
	                                            __(l[19793]) ? __(l[19793]) : "Send files from..."
	                                        ),
	                                        React.makeElement(DropdownsUI.DropdownItem, {
	                                            className: "link-button light",
	                                            icon: "grey-cloud colorized",
	                                            label: __(l[19794]) ? __(l[19794]) : "My Cloud Drive",
	                                            onClick: function onClick() {
	                                                self.props.onAttachFromCloudClicked();
	                                            } }),
	                                        React.makeElement(DropdownsUI.DropdownItem, {
	                                            className: "link-button light",
	                                            icon: "grey-computer colorized",
	                                            label: __(l[19795]) ? __(l[19795]) : "My computer",
	                                            onClick: function onClick() {
	                                                self.props.onAttachFromComputerClicked();
	                                            } })
	                                    )
	                                ),
	                                endCallButton,
	                                React.makeElement(
	                                    "div",
	                                    { className: "link-button light " + (dontShowTruncateButton || !room.members.hasOwnProperty(u_handle) ? "disabled" : ""),
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
	                                                return false;
	                                            }
	                                            if (self.props.onTruncateClicked) {
	                                                self.props.onTruncateClicked();
	                                            }
	                                        } },
	                                    React.makeElement("i", { className: "small-icon colorized clear-arrow" }),
	                                    __(l[8871])
	                                ),
	                                room.iAmOperator() && room.type === "public" ? React.makeElement(
	                                    "div",
	                                    { className: "chat-enable-key-rotation-paragraph" },
	                                    React.makeElement("div", { className: "chat-button-seperator" }),
	                                    React.makeElement(
	                                        "div",
	                                        { className: "link-button light",
	                                            onClick: function onClick(e) {
	                                                if ($(e.target).closest('.disabled').length > 0) {
	                                                    return false;
	                                                }
	                                                self.props.onMakePrivateClicked();
	                                            } },
	                                        React.makeElement("i", { className: "small-icon yellow-key colorized" }),
	                                        l[20623]
	                                    ),
	                                    React.makeElement(
	                                        "p",
	                                        null,
	                                        l[20454]
	                                    )
	                                ) : null,
	                                React.makeElement("div", { className: "chat-button-seperator" }),
	                                React.makeElement(
	                                    "div",
	                                    { className: "link-button light" + (!(room.members.hasOwnProperty(u_handle) && !anonymouschat) ? " disabled" : ""),
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
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
	                                    React.makeElement("i", { className: "small-icon colorized " + (room.isArchived() ? "unarchive" : "archive") }),
	                                    room.isArchived() ? __(l[19065]) : __(l[16689])
	                                ),
	                                room.type !== "private" ? React.makeElement(
	                                    "div",
	                                    { className: "link-button light red " + (room.stateIsLeftOrLeaving() || !(room.type !== "private" && room.membersSetFromApi.members.hasOwnProperty(u_handle) && !anonymouschat) ? "disabled" : ""),
	                                        onClick: function onClick(e) {
	                                            if ($(e.target).closest('.disabled').length > 0) {
	                                                return false;
	                                            }
	                                            if (self.props.onLeaveClicked) {
	                                                self.props.onLeaveClicked();
	                                            }
	                                        } },
	                                    React.makeElement("i", { className: "small-icon rounded-stop colorized" }),
	                                    l[8633]
	                                ) : null,
	                                room._closing !== true && (room.type === "group" || room.type === "public") && room.stateIsLeftOrLeaving() && !anonymouschat ? React.makeElement(
	                                    "div",
	                                    { className: "link-button light red", onClick: function onClick() {
	                                            if (self.props.onCloseClicked) {
	                                                self.props.onCloseClicked();
	                                            }
	                                        } },
	                                    React.makeElement("i", { className: "small-icon rounded-stop colorized" }),
	                                    l[148]
	                                ) : null
	                            )
	                        ),
	                        React.makeElement(SharedFilesAccordionPanel, { key: "sharedFiles", title: l[19796] ? l[19796] : "Shared Files", chatRoom: room,
	                            sharedFiles: room.messagesBuff.sharedFiles }),
	                        room.type === "private" ? React.makeElement(IncomingSharesAccordionPanel, { key: "incomingShares", title: l[5542], chatRoom: room }) : null
	                    )
	                )
	            )
	        );
	    }
	});

	var ConversationPanel = React.createClass({
	    displayName: "ConversationPanel",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    lastScrollPositionPerc: 1,
	    componentSpecificIsComponentEventuallyVisible: function componentSpecificIsComponentEventuallyVisible() {
	        return this.props.chatRoom.isCurrentlyActive;
	    },
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
	            nonLoggedInJoinChatDialog: anonymouschat,
	            messageToBeDeleted: null,
	            editing: false
	        };
	    },

	    uploadFromComputer: function uploadFromComputer() {
	        this.props.chatRoom.scrolledToBottom = true;

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
	            self.props.chatRoom.scrolledToBottom = true;
	            if (self.messagesListScrollable) {
	                self.messagesListScrollable.scrollToBottom();
	            }
	        });
	        self.props.chatRoom.rebind('openSendFilesDialog.cpanel', function (e) {
	            self.setState({ 'attachCloudDialog': true });
	        });
	        self.props.chatRoom.rebind('showGetChatLinkDialog.ui', function (e, eventData) {
	            createTimeoutPromise(function () {
	                return self.props.chatRoom.topic && self.props.chatRoom.state === ChatRoom.STATE.READY;
	            }, 350, 15000).always(function () {
	                if (self.props.chatRoom.isActive) {
	                    self.setState({
	                        'chatLinkDialog': true
	                    });
	                } else {

	                    self.props.chatRoom.updatePublicHandle();
	                }
	            });
	        });

	        if (self.props.chatRoom.type === "private") {
	            var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];
	            if (M.u[otherContactHash]) {
	                M.u[otherContactHash].addChangeListener(function () {
	                    self.safeForceUpdate();
	                });
	            }
	        }

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
	        } else {
	            return;
	        }

	        $(self.findDOMNode()).rebind('resized.convpanel', function () {
	            self.handleWindowResize();
	        });

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
	        self.props.chatRoom.scrolledToBottom = true;
	        self.lastScrollHeight = 0;
	        self.lastUpdatedScrollHeight = 0;

	        var room = self.props.chatRoom;

	        $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
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

	        var ns = ".convPanel";
	        $container.rebind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns, function (e) {
	            self.safeForceUpdate(true);
	            $.tresizer();
	        });
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
	        $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
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
	            if ($typeArea.length === 1) {
	                $typeArea.trigger("focus");
	                moveCursortoToEnd($typeArea[0]);
	            }
	        }
	        if (!prevState.renameDialog && self.state.renameDialog === true) {
	            var $input = $('.chat-rename-dialog input');
	            $input.trigger("focus");
	            $input[0].selectionStart = 0;
	            $input[0].selectionEnd = $input.val().length;
	        }

	        if (prevState.editing === false && self.state.editing !== false) {
	            if (self.messagesListScrollable) {
	                self.messagesListScrollable.reinitialise(false);

	                Soon(function () {
	                    if (self.editDomElement && self.editDomElement.length === 1) {
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

	        var scrollBlockHeight = $('.chat-content-block', $container).outerHeight() - ($('.chat-topic-block', $container).outerHeight() || 0) - ($('.call-block', $container).outerHeight() || 0) - (anonymouschat ? $('.join-chat-block', $container).outerHeight() : $('.chat-textarea-block', $container).outerHeight());

	        if (scrollBlockHeight != self.$messages.outerHeight()) {
	            self.$messages.css('height', scrollBlockHeight);
	            $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
	            self.refreshUI(true);
	            if (self.props.chatRoom.callManagerCall) {
	                $('.messages-block', $container).height(scrollBlockHeight + $('.chat-textarea-block', $container).outerHeight());
	            } else {
	                $('.messages-block', $container).height('');
	            }
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
	                if (self.props.chatRoom.scrolledToBottom && !self.editDomElement) {
	                    ps.scrollToBottom(true);
	                    return true;
	                }
	            } else {

	                return;
	            }
	        }

	        if (self.isComponentEventuallyVisible()) {
	            if (self.props.chatRoom.scrolledToBottom && !self.editDomElement) {
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
	            self.props.chatRoom.scrolledToBottom = true;
	            return;
	        }

	        if (ps.isCloseToBottom(30) === true) {
	            if (!self.props.chatRoom.scrolledToBottom) {
	                mb.detachMessages();
	            }
	            self.props.chatRoom.scrolledToBottom = true;
	        } else {
	            self.props.chatRoom.scrolledToBottom = false;
	        }

	        if (isAtTop || ps.getScrollPositionY() < 5 && ps.getScrollHeight() > 500) {
	            if (mb.haveMoreHistory() && !self.isRetrievingHistoryViaScrollPull && !mb.isRetrievingHistory) {
	                ps.disable();

	                self.isRetrievingHistoryViaScrollPull = true;
	                self.lastScrollPosition = scrollPositionY;

	                self.lastContentHeightBeforeHist = ps.getScrollHeight();

	                var msgsAppended = 0;
	                $(chatRoom).rebind('onMessagesBuffAppend.pull', function () {
	                    msgsAppended++;
	                });

	                $(chatRoom).off('onHistoryDecrypted.pull');
	                $(chatRoom).one('onHistoryDecrypted.pull', function (e) {
	                    $(chatRoom).off('onMessagesBuffAppend.pull');
	                    var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;

	                    ps.scrollToY(prevPosY, true);

	                    chatRoom.messagesBuff.addChangeListener(function () {
	                        if (msgsAppended > 0) {
	                            var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;

	                            ps.scrollToY(prevPosY, true);

	                            self.lastScrollPosition = prevPosY;
	                        }

	                        delete self.lastContentHeightBeforeHist;

	                        setTimeout(function () {
	                            self.isRetrievingHistoryViaScrollPull = false;

	                            ps.enable();
	                            self.forceUpdate();
	                        }, 1150);

	                        return 0xDEAD;
	                    });
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

	        var conversationPanelClasses = "conversation-panel " + (room.type === "public" ? "group-chat " : "") + room.type + "-chat";

	        if (!room.isCurrentlyActive) {
	            conversationPanelClasses += " hidden";
	        }

	        var topicBlockClass = "chat-topic-block";
	        if (room.type !== "public") {
	            topicBlockClass += " privateChat";
	        }
	        var privateChatDiv = room.type === "group" ? "privateChatDiv" : '';
	        var messagesList = [];

	        if (ChatdIntegration._loadingChats[room.roomId] && ChatdIntegration._loadingChats[room.roomId].loadingPromise && ChatdIntegration._loadingChats[room.roomId].loadingPromise.state() === 'pending' || self.isRetrievingHistoryViaScrollPull && !self.loadingShown || room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.joined === false || room.messagesBuff.joined === true && room.messagesBuff.haveMessages === true && room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.isDecrypting && room.messagesBuff.isDecrypting.state() === 'pending') {

	            self.loadingShown = true;
	        } else if (room.messagesBuff.joined === true) {
	            if (!self.isRetrievingHistoryViaScrollPull && room.messagesBuff.haveMoreHistory() === false) {
	                var headerText = room.messagesBuff.messages.length === 0 ? __(l[8002]) : __(l[8002]);

	                if (contactName) {
	                    headerText = headerText.replace("%s", "<span>" + htmlentities(contactName) + "</span>");
	                } else {
	                    headerText = room.getRoomTitle();
	                }

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
	                        { className: "message date-divider", key: v.messageId + "_marker",
	                            title: time2date(timestamp) },
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

	                    if (v instanceof Message && v.dialogType !== "truncated") {

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

	                if ((v.dialogType === "remoteCallEnded" || v.dialogType === "remoteCallStarted") && v && v.wrappedChatDialogMessage) {
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
	                    } else if (v.dialogType === 'openModeClosed') {
	                        messageInstance = React.makeElement(CloseOpenModeMessage, {
	                            message: v,
	                            key: v.messageId,
	                            contact: M.u[v.userId],
	                            grouped: grouped
	                        });
	                    } else if (v.dialogType === 'chatHandleUpdate') {
	                        messageInstance = React.makeElement(ChatHandleMessage, {
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
	                            self.props.chatRoom.scrolledToBottom = false;
	                            self.setState({ 'editing': v.messageId });
	                            self.forceUpdate();
	                        },
	                        onEditDone: function onEditDone(messageContents) {
	                            self.props.chatRoom.scrolledToBottom = true;
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

	                                    megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
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

	                            Soon(function () {
	                                $('.chat-textarea-block:visible textarea').focus();
	                            }, 300);
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

	                    self.props.chatRoom.scrolledToBottom = true;

	                    room.attachNodes(selected);
	                }
	            });
	        }

	        var nonLoggedInJoinChatDialog = null;
	        if (self.state.nonLoggedInJoinChatDialog === true) {
	            var usersCount = Object.keys(room.members).length;
	            nonLoggedInJoinChatDialog = React.makeElement(
	                ModalDialogsUI.ModalDialog,
	                {
	                    title: l[20596],
	                    className: "fm-dialog chat-links-preview-desktop",
	                    megaChat: room.megaChat,
	                    chatRoom: room,
	                    onClose: function onClose() {
	                        self.setState({ 'nonLoggedInJoinChatDialog': false });
	                    }
	                },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-body" },
	                    React.makeElement(
	                        "div",
	                        { className: "chatlink-contents" },
	                        React.makeElement("div", { className: "huge-icon group-chat" }),
	                        React.makeElement(
	                            "h3",
	                            null,
	                            React.makeElement(
	                                utils.EmojiFormattedContent,
	                                null,
	                                room.topic ? room.getRoomTitle() : " "
	                            )
	                        ),
	                        React.makeElement(
	                            "h5",
	                            null,
	                            usersCount ? l[20233].replace("%s", usersCount) : " "
	                        ),
	                        React.makeElement(
	                            "p",
	                            null,
	                            l[20595]
	                        ),
	                        React.makeElement(
	                            "a",
	                            { className: "join-chat", onClick: function onClick(e) {
	                                    self.setState({ 'nonLoggedInJoinChatDialog': false });

	                                    megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
	                                } },
	                            l[20597]
	                        ),
	                        React.makeElement(
	                            "a",
	                            { className: "not-now", onClick: function onClick(e) {
	                                    self.setState({ 'nonLoggedInJoinChatDialog': false });
	                                } },
	                            l[18682]
	                        )
	                    )
	                )
	            );
	        }

	        var chatLinkDialog;
	        if (self.state.chatLinkDialog === true) {
	            chatLinkDialog = React.makeElement(ChatlinkDialog, {
	                chatRoom: self.props.chatRoom,
	                onClose: function onClose() {
	                    self.setState({ 'chatLinkDialog': false });
	                }
	            });
	        }

	        var privateChatDialog;

	        if (self.state.privateChatDialog === true) {
	            if (!$.dialog || $.dialog === "create-private-chat") {
	                $.dialog = "create-private-chat";

	                privateChatDialog = React.makeElement(
	                    ModalDialogsUI.ModalDialog,
	                    {
	                        title: l[20594],
	                        className: "fm-dialog create-private-chat",
	                        megaChat: room.megaChat,
	                        chatRoom: room,
	                        onClose: function onClose() {
	                            self.setState({ 'privateChatDialog': false });
	                            if ($.dialog === "create-private-chat") {
	                                closeDialog();
	                            }
	                        }
	                    },
	                    React.makeElement(
	                        "div",
	                        { className: "create-private-chat-content-block fm-dialog-body" },
	                        React.makeElement("i", { className: "huge-icon lock" }),
	                        React.makeElement(
	                            "div",
	                            { className: "dialog-body-text" },
	                            React.makeElement(
	                                "div",
	                                { className: "" },
	                                React.makeElement(
	                                    "b",
	                                    null,
	                                    l[20590]
	                                ),
	                                React.makeElement("br", null),
	                                l[20591]
	                            )
	                        ),
	                        React.makeElement("div", { className: "clear" }),
	                        React.makeElement(
	                            "div",
	                            { className: "big-red-button", id: "make-chat-private", onClick: function onClick() {
	                                    self.props.chatRoom.switchOffPublicMode();
	                                    self.setState({ 'privateChatDialog': false });
	                                    if ($.dialog === "create-private-chat") {
	                                        closeDialog();
	                                    }
	                                } },
	                            React.makeElement(
	                                "div",
	                                { className: "big-btn-txt" },
	                                l[20593]
	                            )
	                        )
	                    )
	                );

	                $('.create-private-chat .fm-dialog-close').rebind('click', function () {
	                    $('.create-private-chat').addClass('hidden');
	                    $('.fm-dialog-overlay').addClass('hidden');
	                });
	                $('.create-private-chat .default-red-button').rebind('click', function () {
	                    var participants = self.props.chatRoom.protocolHandler.getTrackedParticipants();
	                    var promises = [];
	                    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));
	                    var _runSwitchOffPublicMode = function _runSwitchOffPublicMode() {

	                        var topic = null;
	                        if (self.props.chatRoom.topic) {
	                            topic = self.props.chatRoom.protocolHandler.embeddedEncryptTo(self.props.chatRoom.topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, true, self.props.chatRoom.type === "public");
	                            topic = base64urlencode(topic);
	                        }
	                        self.props.onSwitchOffPublicMode(topic);
	                    };
	                    MegaPromise.allDone(promises).done(function () {
	                        _runSwitchOffPublicMode();
	                    });
	                });
	            }
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

	                        self.props.chatRoom.scrolledToBottom = true;

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
	                        self.props.chatRoom.scrolledToBottom = true;

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
	                        self.props.chatRoom.scrolledToBottom = true;

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
	                        self.props.chatRoom.scrolledToBottom = true;

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
	                if (self.props.chatRoom.setRoomTitle(self.state.renameDialogValue)) {
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
	                            React.makeElement("input", {
	                                type: "text",
	                                className: "chat-rename-group-dialog",
	                                name: "newTopic",
	                                defaultValue: self.props.chatRoom.getRoomTitle(),
	                                value: self.state.renameDialogValue,
	                                maxLength: "30",
	                                onChange: function onChange(e) {
	                                    self.setState({
	                                        'renameDialogValue': e.target.value.substr(0, 30)
	                                    });
	                                },
	                                onKeyUp: function onKeyUp(e) {
	                                    if (e.which === 13) {
	                                        onEditSubmit(e);
	                                    }
	                                }
	                            })
	                        )
	                    )
	                )
	            );
	        }

	        var additionalClass = "";
	        if (additionalClass.length === 0 && self.state.messagesToggledInCall && room.callManagerCall && room.callManagerCall.isActive()) {
	            additionalClass = " small-block";
	        }

	        var topicInfo = null;
	        if (self.props.chatRoom.type === "group" || self.props.chatRoom.type === "public") {
	            topicInfo = React.makeElement(
	                "div",
	                { className: "chat-topic-info" },
	                React.makeElement("div", { className: "chat-topic-icon" }),
	                React.makeElement(
	                    "div",
	                    { className: "chat-topic-text" },
	                    React.makeElement(
	                        "span",
	                        { className: "txt" },
	                        React.makeElement(
	                            utils.EmojiFormattedContent,
	                            null,
	                            self.props.chatRoom.getRoomTitle()
	                        )
	                    ),
	                    React.makeElement(
	                        "span",
	                        { className: "txt small" },
	                        (l[20233] || "%s Members").replace("%s", Object.keys(self.props.chatRoom.members).length)
	                    )
	                )
	            );
	        } else {
	            var contacts = room.getParticipantsExceptMe();
	            var contactHandle = contacts[0];
	            var contact = M.u[contactHandle];

	            topicInfo = React.makeElement(ContactsUI.ContactCard, {
	                className: "short",
	                noContextButton: "true",
	                contact: contact,
	                megaChat: self.props.chatRoom.megaChat,
	                showLastGreen: true,
	                key: contact.u });
	        }

	        var disabledCalls = room.isReadOnly() || !room.chatId || room.callManagerCall && room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_INCOMING;

	        var disableStartCalls = disabledCalls || megaChat.haveAnyIncomingOrOutgoingCall(room.chatIdBin) || (room.type === "group" || room.type === "public") && !ENABLE_GROUP_CALLING_FLAG;

	        return React.makeElement(
	            "div",
	            { className: conversationPanelClasses, onMouseMove: self.onMouseMove,
	                "data-room-id": self.props.chatRoom.chatId },
	            React.makeElement(
	                "div",
	                { className: "chat-content-block " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ? "with-pane" : "no-pane") },
	                !room.megaChat.chatUIFlags['convPanelCollapse'] ? React.makeElement(ConversationRightArea, {
	                    isVisible: this.props.chatRoom.isCurrentlyActive,
	                    chatRoom: this.props.chatRoom,
	                    members: this.props.chatRoom.membersSetFromApi,
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
	                    onGetManageChatLinkClicked: function onGetManageChatLinkClicked() {
	                        self.setState({
	                            'chatLinkDialog': true
	                        });
	                    },
	                    onMakePrivateClicked: function onMakePrivateClicked() {
	                        self.setState({ 'privateChatDialog': true });
	                    },
	                    onLeaveClicked: function onLeaveClicked() {
	                        room.leave(true);
	                    },
	                    onJoinViaPublicLinkClicked: function onJoinViaPublicLinkClicked() {
	                        room.joinViaPublicHandle();
	                    },
	                    onCloseClicked: function onCloseClicked() {
	                        room.destroy();
	                    },
	                    onSwitchOffPublicMode: function onSwitchOffPublicMode(topic) {
	                        room.switchOffPublicMode(topic);
	                    },
	                    onAttachFromCloudClicked: function onAttachFromCloudClicked() {
	                        self.setState({ 'attachCloudDialog': true });
	                    },
	                    onAddParticipantSelected: function onAddParticipantSelected(contactHashes) {
	                        self.props.chatRoom.scrolledToBottom = true;

	                        if (self.props.chatRoom.type == "private") {
	                            var megaChat = self.props.chatRoom.megaChat;

	                            loadingDialog.show();

	                            megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getParticipantsExceptMe().concat(contactHashes)]);
	                        } else {
	                            self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
	                        }
	                    }
	                }) : null,
	                room.callManagerCall && room.callManagerCall.isStarted() ? React.makeElement(ConversationAudioVideoPanel, {
	                    chatRoom: this.props.chatRoom,
	                    contacts: self.props.contacts,
	                    megaChat: this.props.chatRoom.megaChat,
	                    unreadCount: this.props.chatRoom.messagesBuff.getUnreadCount(),
	                    onMessagesToggle: function onMessagesToggle(isActive) {
	                        self.setState({
	                            'messagesToggledInCall': isActive
	                        });
	                    }
	                }) : null,
	                privateChatDialog,
	                chatLinkDialog,
	                nonLoggedInJoinChatDialog,
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
	                React.makeElement(
	                    "div",
	                    { className: "chat-topic-block " + topicBlockClass + (self.props.chatRoom.havePendingGroupCall() || self.props.chatRoom.haveActiveCall() ? " have-pending-group-call" : "") },
	                    React.makeElement(
	                        "div",
	                        { className: "chat-topic-buttons" },
	                        React.makeElement(ButtonsUI.Button, {
	                            className: "right",
	                            disableCheckingVisibility: true,
	                            icon: "small-icon " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ? "arrow-in-square" : "arrow-in-square active"),
	                            onClick: function onClick() {
	                                room.megaChat.toggleUIFlag('convPanelCollapse');
	                            }
	                        }),
	                        React.makeElement(
	                            "span",
	                            null,
	                            React.makeElement(
	                                "div",
	                                {
	                                    className: "button right",
	                                    onClick: function onClick() {
	                                        if (!disabledCalls) {
	                                            room.startVideoCall();
	                                        }
	                                    } },
	                                React.makeElement("i", { className: "small-icon small-icon video-call colorized" + (room.isReadOnly() || disableStartCalls ? " disabled" : "") })
	                            ),
	                            React.makeElement(
	                                "div",
	                                {
	                                    className: "button right",
	                                    onClick: function onClick() {
	                                        if (!disabledCalls) {
	                                            room.startAudioCall();
	                                        }
	                                    } },
	                                React.makeElement("i", { className: "small-icon small-icon audio-call colorized" + (room.isReadOnly() || disableStartCalls ? " disabled" : "") })
	                            )
	                        )
	                    ),
	                    topicInfo
	                ),
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
	                                    self.props.chatRoom.scrolledToBottom = 1;
	                                },
	                                onReinitialise: self.onMessagesScrollReinitialise,
	                                onUserScroll: self.onMessagesScrollUserScroll,
	                                className: "js-messages-scroll-area perfectScrollbarContainer",
	                                messagesToggledInCall: self.state.messagesToggledInCall,
	                                ref: function ref(_ref2) {
	                                    return self.messagesListScrollable = _ref2;
	                                },
	                                chatRoom: self.props.chatRoom,
	                                messagesBuff: self.props.chatRoom.messagesBuff,
	                                editDomElement: self.state.editDomElement,
	                                editingMessageId: self.state.editing,
	                                confirmDeleteDialog: self.state.confirmDeleteDialog,
	                                renderedMessagesCount: messagesList.length,
	                                isLoading: this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown,
	                                options: {
	                                    'suppressScrollX': true
	                                }
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
	                    !anonymouschat && room.state != ChatRoom.STATE.LEFT && room.havePendingGroupCall() && (!room.callManagerCall || room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING) ? React.makeElement(JoinCallNotification, { chatRoom: room }) : null,
	                    anonymouschat || !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === "public" && !anonymouschat && room.publicChatHandle && room.publicChatKey ? React.makeElement(
	                        "div",
	                        { className: "join-chat-block" },
	                        React.makeElement(
	                            "div",
	                            { className: "join-chat-button",
	                                onClick: function onClick(e) {
	                                    if (anonymouschat) {
	                                        megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
	                                    } else {
	                                        room.joinViaPublicHandle();
	                                    }
	                                } },
	                            l[20597]
	                        )
	                    ) : React.makeElement(
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
	                                        self.props.chatRoom.scrolledToBottom = false;
	                                        return true;
	                                    }
	                                },
	                                onResized: function onResized() {
	                                    self.handleWindowResize();
	                                    $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
	                                },
	                                onConfirm: function onConfirm(messageContents) {
	                                    if (messageContents && messageContents.length > 0) {
	                                        if (!self.props.chatRoom.scrolledToBottom) {
	                                            self.props.chatRoom.scrolledToBottom = true;
	                                            self.lastScrollPosition = 0;

	                                            $(self.props.chatRoom).rebind('onMessagesBuffAppend.pull', function () {
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
	                                    className: "popup-button left",
	                                    icon: "small-icon grey-small-plus",
	                                    disabled: room.isReadOnly()
	                                },
	                                React.makeElement(
	                                    DropdownsUI.Dropdown,
	                                    {
	                                        className: "wide-dropdown attach-to-chat-popup light",
	                                        noArrow: "true",
	                                        positionMy: "left top",
	                                        positionAt: "left bottom",
	                                        vertOffset: 4
	                                    },
	                                    React.makeElement(
	                                        "div",
	                                        { className: "dropdown info-txt" },
	                                        __(l[19793]) ? __(l[19793]) : "Send files from..."
	                                    ),
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        className: "link-button light",
	                                        icon: "grey-cloud colorized",
	                                        label: __(l[19794]) ? __(l[19794]) : "My Cloud Drive",
	                                        onClick: function onClick(e) {
	                                            self.setState({ 'attachCloudDialog': true });
	                                        } }),
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        className: "link-button light",
	                                        icon: "grey-computer colorized",
	                                        label: __(l[19795]) ? __(l[19795]) : "My computer",
	                                        onClick: function onClick(e) {
	                                            self.uploadFromComputer();
	                                        } }),
	                                    React.makeElement("div", { className: "chat-button-seperator" }),
	                                    React.makeElement(DropdownsUI.DropdownItem, {
	                                        className: "link-button light",
	                                        icon: "square-profile colorized",
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

	        var hadLoaded = anonymouschat || ChatdIntegration.allChatsHadLoaded.state() !== 'pending' && ChatdIntegration.mcfHasFinishedPromise.state() !== 'pending' && Object.keys(ChatdIntegration._loadingChats).length === 0;

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
	                chatUIFlags: self.props.chatUIFlags,
	                isExpanded: chatRoom.megaChat.chatUIFlags['convPanelCollapse'],
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
	                        React.makeElement("div", { className: "fm-empty-conversations-bg" }),
	                        React.makeElement("div", { className: "fm-empty-cloud-txt small", dangerouslySetInnerHTML: {
	                                __html: __(emptyMessage).replace("[P]", "<span>").replace("[/P]", "</span>")
	                            } }),
	                        React.makeElement(
	                            "div",
	                            { className: "big-red-button new-chat-link", onClick: function onClick(e) {
	                                    $(document.body).trigger('startNewChatLink');
	                                } },
	                            l[20638]
	                        )
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
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

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'hideable': true
	        };
	    },

	    componentDidMount: function componentDidMount() {
	        var self = this;
	        $(document.body).addClass('overlayed');
	        $('.fm-dialog-overlay').removeClass('hidden');

	        $('textarea:focus').trigger("blur");

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
	        $(document).off('keyup.modalDialog' + this.getUniqueId());
	        $(document.body).removeClass('overlayed');
	        $('.fm-dialog-overlay').addClass('hidden');
	        $(window).off('resize.modalDialog' + this.getUniqueId());
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

	        var classes = "fm-dialog fm-modal-dialog " + self.props.className;

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
	                    { href: "javascript:;",
	                        className: (v.defaultClassname ? v.defaultClassname : "default-white-button right") + (v.className ? " " + v.className : ""),
	                        onClick: function onClick(e) {
	                            if ($(e.target).is(".disabled")) {
	                                return false;
	                            }
	                            if (v.onClick) {
	                                v.onClick(e, self);
	                            }
	                        }, key: v.key },
	                    v.iconBefore ? React.makeElement("i", { className: v.iconBefore }) : null,
	                    v.label,
	                    v.iconAfter ? React.makeElement("i", { className: v.iconAfter }) : null
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	        var classes = "send-contact contrast small-footer " + self.props.className;

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
	                    "defaultClassname": "default-grey-button lato right",
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
	                    "defaultClassname": "link-button lato left",
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
	                selectableContacts: "true",
	                onSelectDone: self.props.onSelectClicked,
	                onSelected: self.onSelected,
	                selected: self.state.selected,
	                headerClasses: "left-aligned",
	                multiple: true
	            })
	        );
	    }
	});

	var ConfirmDialog = React.createClass({
	    displayName: "ConfirmDialog",

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	        $(document).off('keyup.confirmDialog' + this.getUniqueId());
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var Handler = React.createClass({
	    displayName: "Handler",

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	            $(window).off('resize.tooltip' + this.getUniqueId());
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
	                'top': tooltipTopPos - 5
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var Checkbox = React.createClass({
	    displayName: "Checkbox",

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ModalDialogsUI = __webpack_require__(13);
	var Tooltips = __webpack_require__(14);

	var BrowserCol = React.createClass({
	    displayName: "BrowserCol",

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	            var tr = self.findDOMNode().querySelector('.node_' + self.lastCursor);
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
	    _doSelect: function _doSelect(selectionIncludeShift, currentIndex, targetIndex) {
	        var self = this;
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
	    },
	    bindEvents: function bindEvents() {
	        var self = this;

	        var KEY_A = 65;
	        var KEY_UP = 38;
	        var KEY_DOWN = 40;

	        var KEY_LEFT = 37;
	        var KEY_RIGHT = 39;

	        var KEY_ENTER = 13;
	        var KEY_BACKSPACE = 8;

	        $(document.body).rebind('keydown.cloudBrowserModalDialog', function (e) {
	            var charTyped = false;
	            var keyCode = e.which || e.keyCode;
	            var selectionIncludeShift = e.shiftKey;
	            if ($('input:focus, textarea:focus').length > 0) {
	                return;
	            }

	            var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

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
	                if (viewMode === "0") {

	                    var currentFolder = M.getNode(self.props.currentlyViewedEntry);
	                    if (currentFolder.p) {
	                        self.expandFolder(currentFolder.p);
	                    }
	                }
	            } else if (!e.metaKey && (viewMode === "0" && (keyCode === KEY_UP || keyCode === KEY_DOWN) || viewMode === "1" && (keyCode === KEY_LEFT || keyCode === KEY_RIGHT))) {

	                var dir = keyCode === (viewMode === "1" ? KEY_LEFT : KEY_UP) ? -1 : 1;

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

	                self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
	            } else if (viewMode === "1" && (keyCode === KEY_UP || keyCode === KEY_DOWN)) {
	                var containerWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible').outerWidth();
	                var itemWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible .data-block-view:first').outerWidth();
	                var itemsPerRow = Math.floor(containerWidth / itemWidth);

	                var dir = keyCode === KEY_UP ? -1 : 1;

	                var lastHighlighted = self.state.cursor || false;
	                if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
	                    lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
	                }

	                var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);

	                var targetIndex = currentIndex + dir * itemsPerRow;
	                if (self.props.entries.length - 1 < targetIndex || targetIndex < 0) {

	                    return;
	                }

	                self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
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
	        $(document.body).off('keydown.cloudBrowserModalDialog');
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
	        var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

	        var imagesThatRequireLoading = [];
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

	            var image = null;
	            var src = null;
	            if ((is_image(node) || is_video(node)) && node.fa) {
	                src = thumbnails[node.h];
	                if (!src) {
	                    node.imgId = "chat_" + node.h;
	                    imagesThatRequireLoading.push(node);

	                    if (!node.seen) {
	                        node.seen = 1;
	                    }
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

	                if (src) {
	                    image = React.makeElement("img", { alt: "", src: src });
	                } else {
	                    image = React.makeElement("img", { alt: "" });
	                }
	            }

	            if (viewMode === "0") {
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
	            } else {
	                var playtime = MediaAttribute(node).data.playtime;
	                if (playtime) {
	                    playtime = secondsToTimeShort(playtime);
	                }
	                var share = M.getNodeShare(node);
	                var colorLabelClasses = "";
	                if (node.lbl) {
	                    var colourLabel = M.getLabelClassFromId(node.lbl);
	                    colorLabelClasses += ' colour-label';
	                    colorLabelClasses += ' ' + colourLabel;
	                }

	                items.push(React.makeElement(
	                    "div",
	                    {
	                        className: "data-block-view node_" + node.h + " " + (isFolder ? " folder" : " file") + (isHighlighted ? " ui-selected" : "") + (share ? " linked" : "") + colorLabelClasses,
	                        onClick: function onClick(e) {
	                            self.onEntryClick(e, node);
	                        },
	                        onDoubleClick: function onDoubleClick(e) {
	                            self.onEntryDoubleClick(e, node);
	                        },
	                        id: "chat_" + node.h,
	                        key: "block_" + node.h,
	                        title: node.name
	                    },
	                    React.makeElement(
	                        "div",
	                        { className: (src ? "data-block-bg thumb" : "data-block-bg") + (is_video(node) ? " video" : "") },
	                        React.makeElement(
	                            "div",
	                            { className: "data-block-indicators" },
	                            React.makeElement("div", { className: "file-status-icon indicator" + (node.fav ? " star" : "") }),
	                            React.makeElement("div", { className: "data-item-icon indicator" })
	                        ),
	                        React.makeElement(
	                            "div",
	                            { className: "block-view-file-type " + (isFolder ? " folder " : " file " + fileIcon(node)) },
	                            image
	                        ),
	                        is_video(node) ? React.makeElement(
	                            "div",
	                            { className: "video-thumb-details" },
	                            React.makeElement("i", { className: "small-icon small-play-icon" }),
	                            React.makeElement(
	                                "span",
	                                null,
	                                playtime ? playtime : "00:00"
	                            )
	                        ) : null
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "file-block-title" },
	                        node.name
	                    )
	                ));
	            }
	        });
	        if (imagesThatRequireLoading.length > 0) {
	            fm_thumbnails('standalone', imagesThatRequireLoading);
	        }

	        if (items.length > 0) {
	            if (viewMode === "0") {
	                return React.makeElement(
	                    utils.JScrollPane,
	                    { className: "fm-dialog-scroll grid",
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
	            } else {
	                return React.makeElement(
	                    utils.JScrollPane,
	                    { className: "fm-dialog-scroll blocks",
	                        selected: this.state.selected,
	                        highlighted: this.state.highlighted,
	                        entries: this.props.entries,
	                        ref: function ref(jsp) {
	                            self.jsp = jsp;
	                        }
	                    },
	                    React.makeElement(
	                        "div",
	                        { className: "content" },
	                        items,
	                        React.makeElement("div", { className: "clear" })
	                    )
	                );
	            }
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
	                self.props.currentlyViewedEntry === 'shares' ? React.makeElement(
	                    "div",
	                    { className: "dialog-empty-pad" },
	                    React.makeElement("div", { className: "fm-empty-incoming-bg" }),
	                    React.makeElement(
	                        "div",
	                        { className: "dialog-empty-header" },
	                        l[6871]
	                    )
	                ) : React.makeElement(
	                    "div",
	                    { className: "dialog-empty-pad" },
	                    React.makeElement("div", { className: "fm-empty-folder-bg" }),
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

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	            'currentlyViewedEntry': M.RootID,
	            'selectedTab': 'clouddrive',
	            'searchValue': ''
	        };
	    },
	    toggleSortBy: function toggleSortBy(colId) {
	        if (this.state.sortBy[0] === colId) {
	            this.setState({ 'sortBy': [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"] });
	        } else {
	            this.setState({ 'sortBy': [colId, "asc"] });
	        }
	    },
	    onViewButtonClick: function onViewButtonClick(e, node) {
	        var self = this;
	        var $this = $(e.target);

	        if ($this.hasClass("active")) {
	            return false;
	        }

	        if ($this.hasClass("block-view")) {
	            localStorage.dialogViewMode = "1";
	        } else {
	            localStorage.dialogViewMode = "0";
	        }

	        self.setState({ entries: self.getEntries() });

	        $this.parent().find('.active').removeClass("active");
	        $this.addClass("active");
	    },
	    onSearchIconClick: function onSearchIconClick(e, node) {
	        var $parentBlock = $(e.target).closest(".fm-header-buttons");

	        if ($parentBlock.hasClass("active-search")) {
	            $parentBlock.removeClass("active-search");
	        } else {
	            $parentBlock.addClass("active-search");
	            $('input', $parentBlock).trigger("focus");
	        }
	    },
	    onClearSearchIconClick: function onClearSearchIconClick() {
	        var self = this;

	        self.setState({
	            'searchValue': '',
	            'currentlyViewedEntry': M.RootID
	        });
	    },
	    onTabButtonClick: function onTabButtonClick(e, selectedTab) {
	        var $this = $(e.target);

	        $this.parent().find('.active').removeClass("active");
	        $this.addClass("active");

	        var newState = {
	            'selectedTab': selectedTab,
	            'searchValue': ''
	        };
	        if (selectedTab === 'shares') {
	            newState['currentlyViewedEntry'] = 'shares';
	        } else {
	            newState['currentlyViewedEntry'] = M.RootID;
	        }
	        this.setState(newState);
	        this.onSelected([]);
	        this.onHighlighted([]);
	    },
	    onSearchChange: function onSearchChange(e) {
	        var searchValue = e.target.value;
	        var newState = {
	            'selectedTab': 'search',
	            'searchValue': searchValue
	        };
	        if (searchValue && searchValue.length >= 3) {
	            newState['currentlyViewedEntry'] = 'search';
	        } else if (this.state.currentlyViewedEntry === 'search') {
	            if (!searchValue || searchValue.length < 3) {
	                newState['currentlyViewedEntry'] = M.RootID;
	            }
	        }

	        this.setState(newState);
	        this.onSelected([]);
	        this.onHighlighted([]);
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
	            var self = this;

	            this.resizeBreadcrumbs();
	            var handle = this.state.currentlyViewedEntry;
	            if (handle === 'shares') {
	                self.setState({ 'isLoading': true });

	                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).done(function () {
	                    self.setState({ 'isLoading': false });
	                    self.setState({ entries: self.getEntries() });
	                });
	            }
	            if (!M.d[handle] || M.d[handle].t && !M.c[handle]) {
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
	        var entries = [];
	        if (self.state.currentlyViewedEntry === "search" && self.state.searchValue && self.state.searchValue.length >= 3) {
	            M.getFilterBy(M.getFilterBySearchFn(self.state.searchValue)).forEach(function (n) {

	                if (!n.h || n.h.length === 11) {
	                    return;
	                }
	                entries.push(n);
	            });
	        } else {
	            Object.keys(M.c[self.state.currentlyViewedEntry] || {}).forEach(function (h) {
	                M.d[h] && entries.push(M.d[h]);
	            });
	        }

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
	            if (entries[i] && entries[i].t) {
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
	        var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

	        var classes = "add-from-cloud " + self.props.className;

	        var folderIsHighlighted = false;

	        var breadcrumb = [];

	        M.getPath(self.state.currentlyViewedEntry).forEach(function (breadcrumbNodeId, k) {

	            if (M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].h && M.d[breadcrumbNodeId].h.length === 11) {
	                return;
	            }

	            var breadcrumbClasses = "";
	            if (breadcrumbNodeId === M.RootID) {
	                breadcrumbClasses += " cloud-drive";

	                if (self.state.currentlyViewedEntry !== M.RootID) {
	                    breadcrumbClasses += " has-next-button";
	                }
	            } else {
	                breadcrumbClasses += " folder";
	            }

	            if (k !== 0) {
	                breadcrumbClasses += " has-next-button";
	            }
	            if (breadcrumbNodeId === "shares") {
	                breadcrumbClasses += " shared-with-me";
	            }

	            (function (breadcrumbNodeId) {
	                breadcrumb.unshift(React.makeElement(
	                    "a",
	                    { className: "fm-breadcrumbs contains-directories " + breadcrumbClasses,
	                        key: breadcrumbNodeId,
	                        onClick: function onClick(e) {
	                            e.preventDefault();
	                            e.stopPropagation();
	                            self.setState({
	                                'currentlyViewedEntry': breadcrumbNodeId,
	                                'selected': [],
	                                'searchValue': ''
	                            });
	                            self.onSelected([]);
	                            self.onHighlighted([]);
	                        } },
	                    React.makeElement(
	                        "span",
	                        { className: "right-arrow-bg" },
	                        React.makeElement(
	                            "span",
	                            null,
	                            breadcrumbNodeId === M.RootID ? __(l[164]) : breadcrumbNodeId === "shares" ? l[5589] : M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].name
	                        )
	                    )
	                ));
	            })(breadcrumbNodeId);
	        });

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
	                        self.setState({ 'currentlyViewedEntry': self.state.highlighted[0] });
	                        self.onSelected([]);
	                        self.onHighlighted([]);
	                        self.browserEntries.setState({
	                            'selected': [],
	                            'searchValue': '',
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

	        var gridHeader = [];

	        if (viewMode === "0") {
	            gridHeader.push(React.makeElement(
	                "table",
	                { className: "grid-table-header fm-dialog-table", key: "grid-table-header" },
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
	            ));
	        }

	        var clearSearchBtn = null;
	        if (self.state.searchValue.length >= 3) {
	            clearSearchBtn = React.makeElement("i", {
	                className: "top-clear-button",
	                style: { 'right': '85px' },
	                onClick: function onClick() {
	                    self.onClearSearchIconClick();
	                }
	            });
	        }

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
	                { className: "fm-dialog-tabs" },
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-tab cloud active",
	                        onClick: function onClick(e) {
	                            self.onTabButtonClick(e, 'clouddrive');
	                        } },
	                    __(l[164])
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "fm-dialog-tab incoming",
	                        onClick: function onClick(e) {
	                            self.onTabButtonClick(e, 'shares');
	                        } },
	                    __(l[5542])
	                ),
	                React.makeElement("div", { className: "clear" })
	            ),
	            React.makeElement(
	                "div",
	                { className: "fm-picker-header" },
	                React.makeElement(
	                    "div",
	                    { className: "fm-header-buttons" },
	                    React.makeElement("a", { className: "fm-files-view-icon block-view" + (viewMode === "1" ? " active" : ""),
	                        title: "Thumbnail view",
	                        onClick: function onClick(e) {
	                            self.onViewButtonClick(e);
	                        } }),
	                    React.makeElement("a", { className: "fm-files-view-icon listing-view" + (viewMode === "0" ? " active" : ""),
	                        title: "List view",
	                        onClick: function onClick(e) {
	                            self.onViewButtonClick(e);
	                        } }),
	                    React.makeElement(
	                        "div",
	                        { className: "fm-files-search" },
	                        React.makeElement(
	                            "i",
	                            { className: "search",
	                                onClick: function onClick(e) {
	                                    self.onSearchIconClick(e);
	                                } },
	                            ">"
	                        ),
	                        React.makeElement("input", { type: "search", placeholder: __(l[102]), value: self.state.searchValue,
	                            onChange: self.onSearchChange }),
	                        clearSearchBtn
	                    ),
	                    React.makeElement("div", { className: "clear" })
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "fm-breadcrumbs-block add-from-cloud" },
	                    React.makeElement(
	                        "div",
	                        { className: "breadcrumbs-wrapper" },
	                        breadcrumb,
	                        React.makeElement("div", { className: "clear" })
	                    )
	                )
	            ),
	            gridHeader,
	            React.makeElement(BrowserEntries, {
	                isLoading: self.state.isLoading,
	                currentlyViewedEntry: self.state.currentlyViewedEntry,
	                entries: entries,
	                onExpand: function onExpand(node) {
	                    self.onSelected([]);
	                    self.onHighlighted([]);
	                    self.setState({
	                        'currentlyViewedEntry': node.h,
	                        'searchValue': ''
	                    });
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
	            if (self.prefillMode && (key === 8 || key === 32 || key === 186 || key === 13)) {

	                self.prefillMode = false;
	            }

	            var currentContent = element.value;
	            var currentCursorPos = self.getCursorPosition(element) - 1;
	            if (self.prefillMode && (currentCursorPos > self.state.emojiEndPos || currentCursorPos < self.state.emojiStartPos)) {

	                self.prefillMode = false;

	                self.setState({
	                    'emojiSearchQuery': false,
	                    'emojiStartPos': false,
	                    'emojiEndPos': false
	                });
	                return;
	            }

	            var char = String.fromCharCode(key);
	            if (self.prefillMode) {
	                return;
	            }

	            if (key === 16 || key === 17 || key === 18 || key === 91 || key === 8 || key === 37 || key === 39 || key === 40 || key === 38 || key === 9 || char.match(self.validEmojiCharacters)) {

	                var parsedResult = mega.utils.emojiCodeParser(currentContent, currentCursorPos);

	                self.setState({
	                    'emojiSearchQuery': parsedResult[0],
	                    'emojiStartPos': parsedResult[1],
	                    'emojiEndPos': parsedResult[2]
	                });

	                return;
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
	        $(window).rebind('resize.typingArea' + self.getUniqueId(), self.handleWindowResize);

	        var $container = $(ReactDOM.findDOMNode(this));

	        self._lastTextareaHeight = 20;
	        if (self.props.initialText) {
	            self.lastTypedMessage = this.props.initialText;
	        }

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

	        $(window).unbind('resize.typingArea' + self.getUniqueId());
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var room = this.props.chatRoom;

	        if (room.isCurrentlyActive && self.isMounted()) {
	            if ($('textarea:focus,select:focus,input:focus').filter(":visible").length === 0) {

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

	        var textareaScrollBlockStyles = {};
	        var newHeight = Math.min(self.state.textareaHeight, self.getTextareaMaxHeight());

	        if (newHeight > 0) {
	            textareaScrollBlockStyles['height'] = newHeight;
	        }

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
	                        var post = msg.substr(self.state.emojiEndPos + 1, msg.length);
	                        var startPos = self.state.emojiStartPos;
	                        var fwdPos = startPos + emojiAlias.length;
	                        var endPos = fwdPos;

	                        self.onUpdateCursorPosition = fwdPos;

	                        self.prefillMode = true;

	                        if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
	                            emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
	                            endPos -= 1;
	                        } else {
	                            post = post ? post.substr(0, 1) !== " " ? " " + post : post : " ";
	                            self.onUpdateCursorPosition++;
	                        }

	                        self.setState({
	                            'typedMessage': pre + emojiAlias + post,
	                            'emojiEndPos': endPos
	                        });
	                    }
	                },
	                onSelect: function onSelect(e, emojiAlias, forceSend) {
	                    if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
	                        var msg = self.state.typedMessage;
	                        var pre = msg.substr(0, self.state.emojiStartPos);
	                        var post = msg.substr(self.state.emojiEndPos + 1, msg.length);

	                        if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
	                            emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
	                        } else {
	                            post = post ? post.substr(0, 1) !== " " ? " " + post : post : " ";
	                        }

	                        var val = pre + emojiAlias + post;

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

	        var disabledTextarea = room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false;

	        return React.makeElement(
	            "div",
	            { className: "typingarea-component" + self.props.className + (disabledTextarea ? " disabled" : "") },
	            React.makeElement(
	                "div",
	                { className: "chat-textarea " + self.props.className },
	                emojiAutocomplete,
	                self.props.children,
	                React.makeElement(
	                    ButtonsUI.Button,
	                    {
	                        className: "popup-button",
	                        icon: "smiling-face",
	                        disabled: this.props.disabled
	                    },
	                    React.makeElement(DropdownEmojiSelector, {
	                        className: "popup emoji",
	                        vertOffset: 17,
	                        onClick: self.onEmojiClicked
	                    })
	                ),
	                React.makeElement("hr", null),
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
	                        disabled: disabledTextarea ? true : false,
	                        readOnly: disabledTextarea ? true : false,
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var DropdownsUI = __webpack_require__(10);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

	var DropdownEmojiSelector = React.createClass({
	    displayName: "DropdownEmojiSelector",

	    data_categories: null,
	    data_emojis: null,
	    data_emojiByCategory: null,
	    customCategoriesOrder: ["frequently_used", "people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"],
	    frequentlyUsedEmojis: ['slight_smile', 'grinning', 'smile', 'wink', 'yum', 'rolling_eyes', 'stuck_out_tongue'],
	    mixins: [MegaRenderMixin, RenderDebugger],
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ButtonsUI = __webpack_require__(9);

	var EmojiAutocomplete = React.createClass({
	    displayName: "EmojiAutocomplete",

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	        $(document).off('keydown.emojiAutocomplete' + this.getUniqueId());
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

	                                self.props.onSelect(false, ":" + self.found[0].n + ":");
	                                handled = true;
	                            }
	                        }
	                    }

	                    if (!handled && key === 13) {
	                        self.props.onCancel();
	                    }
	                    return;
	                } else if (self.found.length > 0 && self.found[selected]) {
	                    self.props.onSelect(false, ":" + self.found[selected].n + ":");
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var WhosTyping = React.createClass({
	    displayName: "WhosTyping",

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	        chatRoom.off("onParticipantTyping.whosTyping");
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
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var AccordionPanel = React.createClass({
	    displayName: "AccordionPanel",

	    render: function render() {
	        var self = this;
	        var contentClass = self.props.className ? self.props.className : '';

	        return React.makeElement(
	            "div",
	            { className: "chat-dropdown container" },
	            React.makeElement(
	                "div",
	                { className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""), onClick: function onClick(e) {
	                        self.props.onToggle(e);
	                    } },
	                React.makeElement(
	                    "span",
	                    null,
	                    this.props.title
	                ),
	                React.makeElement("i", { className: "tiny-icon right-arrow" })
	            ),
	            this.props.expanded ? React.makeElement(
	                "div",
	                {
	                    className: "chat-dropdown content have-animation " + contentClass },
	                this.props.children
	            ) : null
	        );
	    }
	});

	var Accordion = React.createClass({
	    displayName: "Accordion",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getInitialState: function getInitialState() {
	        return {
	            'expandedPanel': this.props.expandedPanel
	        };
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        $(window).rebind('resize.modalDialog' + self.getUniqueId(), function () {
	            self.onResize();
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        $(window).off('resize.modalDialog' + this.getUniqueId());
	    },
	    onResize: function onResize() {},
	    onToggle: function onToggle(e, key) {
	        this.setState({ 'expandedPanel': this.state.expandedPanel === key ? undefined : key });
	        this.props.onToggle && this.props.onToggle(key);
	    },
	    render: function render() {
	        var self = this;

	        var classes = "accordion-panels " + self.props.className;

	        var accordionPanels = [];
	        var otherElements = [];

	        var x = 0;
	        React.Children.forEach(self.props.children, function (child) {
	            if (!child) {

	                return;
	            }

	            if (child.type.displayName === 'AccordionPanel' || child.type.displayName && child.type.displayName.indexOf('AccordionPanel') > -1) {
	                accordionPanels.push(React.cloneElement(child, {
	                    key: child.key,
	                    expanded: this.state.expandedPanel === child.key,
	                    accordion: self,
	                    onToggle: function onToggle(e) {
	                        self.onToggle(e, child.key);
	                    }
	                }));
	            } else {
	                accordionPanels.push(React.cloneElement(child, {
	                    key: x++,
	                    accordion: self
	                }));
	            }
	        }.bind(this));

	        return React.makeElement(
	            "div",
	            { className: classes },
	            accordionPanels,
	            otherElements
	        );
	    }
	});

	module.exports = {
	    Accordion: Accordion,
	    AccordionPanel: AccordionPanel
	};

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var ButtonsUI = __webpack_require__(9);
	var ModalDialogsUI = __webpack_require__(13);
	var DropdownsUI = __webpack_require__(10);
	var ContactsUI = __webpack_require__(11);
	var PerfectScrollbar = __webpack_require__(8).PerfectScrollbar;

	var ParticipantsList = React.createClass({
	    displayName: "ParticipantsList",

	    mixins: [MegaRenderMixin, RenderDebugger],
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
	        var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
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
	                    disableCheckingVisibility: true,
	                    onUserScroll: self.onUserScroll,
	                    requiresUpdateOnResize: true,
	                    onAnimationEnd: function onAnimationEnd() {
	                        self.safeForceUpdate();
	                    }
	                },
	                React.makeElement(ParticipantsListInner, {
	                    chatRoom: room, members: room.members,
	                    disableCheckingVisibility: true,
	                    scrollPositionY: self.state.scrollPositionY,
	                    scrollHeight: self.state.scrollHeight
	                })
	            )
	        );
	    }
	});

	var ParticipantsListInner = React.createClass({
	    displayName: "ParticipantsListInner",

	    mixins: [MegaRenderMixin, RenderDebugger],
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

	        var myPresence = anonymouschat ? 'offline' : room.megaChat.userPresenceToCssClass(M.u[u_handle].presence);

	        var contactsList = [];

	        var firstVisibleUserNum = Math.floor(self.props.scrollPositionY / self.props.contactCardHeight);
	        var visibleUsers = Math.ceil(self.props.scrollHeight / self.props.contactCardHeight);
	        var lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

	        var contactListInnerStyles = {
	            'height': contacts.length * self.props.contactCardHeight
	        };

	        if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving() && room.members.hasOwnProperty(u_handle)) {
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

	                if (room.type === "public" || room.type === "group" && room.members && myPresence !== 'offline') {
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
	                    dropdownDisabled: contactHash === u_handle || anonymouschat,
	                    dropdownButtonClasses: (room.type == "group" || room.type === "public") && myPresence !== 'offline' ? "button icon-dropdown" : "button icon-dropdown",
	                    dropdownRemoveButton: dropdownRemoveButton,
	                    dropdownIconClasses: dropdownIconClasses,
	                    isInCall: room.uniqueCallParts && room.uniqueCallParts[contactHash]
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
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);
	var utils = __webpack_require__(5);
	var getMessageString = __webpack_require__(7).getMessageString;
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
	var MetaRichpreview = __webpack_require__(25).MetaRichpreview;
	var MetaRichpreviewConfirmation = __webpack_require__(27).MetaRichpreviewConfirmation;
	var MetaRichpreviewMegaLinks = __webpack_require__(28).MetaRichpreviewMegaLinks;
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
	            if ($textarea.length > 0 && !$textarea.is(":focus")) {
	                $textarea.trigger("focus");
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
	            if ($textarea.length > 0 && !$textarea.is(":focus")) {
	                $textarea.trigger("focus");
	                moveCursortoToEnd($textarea[0]);
	            }
	        }

	        $node.rebind('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES, function (e) {
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

	        $(self.props.message).off('onChange.GenericConversationMessage' + self.getUniqueId());
	        $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
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
	        $.selected = [v.h];
	        openSaveToDialog(v, function (node, target) {
	            if (Array.isArray(target)) {
	                megaChat.getMyChatFilesFolder().then(function (myChatFolderId) {
	                    M.injectNodes(node, myChatFolderId, function (res) {
	                        if (Array.isArray(res) && res.length) {
	                            megaChat.openChatAndAttachNodes(target, res).dump();
	                        } else if (d) {
	                            console.warn('Unable to inject nodes... no longer existing?', res);
	                        }
	                    });
	                }).catch(function () {
	                    if (d) {
	                        console.error("Failed to allocate 'My chat files' folder.", arguments);
	                    }
	                });
	            } else {

	                target = target || M.RootID;
	                M.injectNodes(node, target, function (res) {
	                    if (!Array.isArray(res) || !res.length) {
	                        if (d) {
	                            console.warn('Unable to inject nodes... no longer existing?', res);
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
	        assert(M.chat, 'Not in chat.');

	        if (is_video(v)) {
	            $.autoplay = v.h;
	        }
	        slideshow(v.ch, undefined, true);
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

	        var additionalClasses = "";
	        var buttonsBlock = null;
	        var spinnerElement = null;
	        var messageNotSendIndicator = null;
	        var messageIsNowBeingSent = false;
	        var subMessageComponent = [];
	        var attachmentMeta = false;
	        var extraPreButtons = [];

	        if (this.props.className) {
	            additionalClasses += this.props.className;
	        }

	        if (message.revoked) {

	            return null;
	        }

	        if (message instanceof Message) {
	            if (!message.wasRendered || !message.messageHtml) {

	                message.messageHtml = htmlentities(message.textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');

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

	            var textMessage = message.messageHtml;

	            var state = message.getState();
	            var stateText = message.getStateText(state);
	            var textContents = message.textContents || false;
	            var displayName = contact && generateAvatarMeta(contact.u).fullName || '';

	            if (state === Message.STATE.NOT_SENT) {
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
	            } else {
	                additionalClasses += ' ' + stateText;
	            }

	            if (textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
	                if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
	                    attachmentMeta = message.getAttachmentMeta() || [];

	                    var files = [];
	                    attachmentMeta.forEach(function (v, attachmentKey) {

	                        if (!M.chd[v.ch] || v.revoked) {

	                            return;
	                        }

	                        var icon = fileIcon(v);
	                        var mediaType = is_video(v);
	                        var isImage = is_image2(v);
	                        var isVideo = mediaType > 0;
	                        var isAudio = mediaType > 1;
	                        var showThumbnail = String(v.fa).indexOf(':1*') > 0;
	                        var isPreviewable = isImage || isVideo;

	                        var dropdown = null;
	                        var noThumbPrev = '';
	                        var previewButton = null;

	                        if (isPreviewable) {
	                            if (!showThumbnail) {
	                                noThumbPrev = 'no-thumb-prev';
	                            }
	                            var previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
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

	                        if (showThumbnail) {
	                            var src = v.src || window.noThumbURI || '';
	                            var thumbClass = v.src ? '' : " no-thumb";
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
	                                { id: v.ch, className: "shared-link thumb " + thumbClass },
	                                thumbOverlay,
	                                dropdown,
	                                React.makeElement('img', { alt: '', className: "thumbnail-placeholder " + v.h, src: src,
	                                    key: 'thumb-' + v.ch,
	                                    onClick: isPreviewable && self._startPreview.bind(self, v)
	                                })
	                            ) : preview;
	                        }

	                        files.push(React.makeElement(
	                            'div',
	                            { className: attachmentClasses, key: 'atch-' + v.ch },
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
	                            { className: 'message date-time simpletip',
	                                'data-simpletip': time2date(timestampInt) },
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
	                                'c': undefined
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
	                                            loadSubPage("fm/chat/p/" + contact.u);
	                                        }
	                                    }),
	                                    deleteButtonOptional ? React.makeElement('hr', null) : null,
	                                    deleteButtonOptional
	                                )
	                            );
	                        } else if (M.u[contact.u] && !M.u[contact.u].c) {
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
	                                                if (!exists && M.opc[k].m === contactEmail && !M.opc[k].hasOwnProperty('dts')) {
	                                                    exists = true;
	                                                    return false;
	                                                }
	                                            });

	                                            if (exists) {
	                                                closeDialog();
	                                                msgDialog('warningb', '', l[17545]);
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
	                            { className: 'message date-time simpletip',
	                                'data-simpletip': time2date(timestampInt) },
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
	                        { className: 'message date-time simpletip',
	                            'data-simpletip': time2date(timestampInt) },
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
	                        var editButton = message.metaType !== -1 ? React.makeElement(DropdownsUI.DropdownItem, {
	                            icon: 'icons-sprite writing-pencil',
	                            label: __(l[1342]),
	                            className: '',
	                            onClick: function onClick(e) {
	                                e.stopPropagation();
	                                e.preventDefault();

	                                self.setState({ 'editing': true });
	                            } }) : null;

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
	                                editButton,
	                                editButton ? React.makeElement('hr', null) : null,
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
	            var avatarsListing = [];
	            textMessage = getMessageString(message.type, message.chatRoom.type === "group" || message.chatRoom.type === "public");

	            if (!textMessage) {
	                console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
	                return;
	            }

	            textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage.splice ? textMessage : [textMessage], true);

	            message.textContents = String(textMessage).replace("[[", "<span class=\"bold\">").replace("]]", "</span>");

	            var avatar = null;
	            var name = null;

	            if (message.showInitiatorAvatar) {
	                if (this.props.grouped) {
	                    additionalClasses += " grouped";
	                } else {
	                    avatar = React.makeElement(ContactsUI.Avatar, { contact: message.authorContact,
	                        className: 'message avatar-wrapper small-rounded-avatar' });
	                    displayName = M.getNameByHandle(message.authorContact.u);
	                    name = React.makeElement(ContactsUI.ContactButton, { contact: contact, className: 'message', label: displayName });
	                }
	            }

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

	            if (message.chatRoom.type === "group" || message.chatRoom.type === "public") {
	                var participantNames = [];
	                (message.meta && message.meta.participants || []).forEach(function (handle) {
	                    var name = M.getNameByHandle(handle);
	                    name && participantNames.push("[[" + htmlentities(name) + "]]");
	                });

	                additionalClasses += message.type !== "outgoing-call" && message.type != "incoming-call" ? " with-border" : "";
	                var translationString = "";

	                if (participantNames && participantNames.length > 0) {
	                    translationString += mega.utils.trans.listToString(participantNames, l[20234]);
	                }

	                if ((message.type === "call-ended" || message.type === "call-failed") && message.meta && message.meta.duration) {
	                    translationString += (participantNames && participantNames.length > 0 ? ". " : "") + l[7208].replace("[X]", "[[" + secToDuration(message.meta.duration) + "]]");
	                }
	                translationString = translationString.replace(/\[\[/g, "<span class=\"bold\">").replace(/\]\]/g, "</span>");

	                if (message.type === "call-started") {
	                    textMessage = '<i class="call-icon diagonal-handset green"></i>' + textMessage;
	                } else if (message.type === "call-ended") {
	                    textMessage = '<i class="call-icon big horizontal-handset grey"></i>' + textMessage;
	                } else if (message.type !== "outgoing-call" && message.type !== "incoming-call") {
	                    textMessage = '<i class="call-icon ' + message.cssClass + '"></i>' + textMessage;
	                }

	                textMessage = "<div class=\"bold mainMessage\">" + textMessage + "</div>" + "<div class=\"extraCallInfo\">" + translationString + "</div>";

	                if (message.type === "call-started" && message.messageId === "call-started-" + chatRoom.getActiveCallMessageId()) {
	                    var callParts = Object.keys(chatRoom.callParticipants);
	                    var unique = {};
	                    callParts.forEach(function (handleAndSid) {
	                        var handle = base64urlencode(handleAndSid.substr(0, 8));
	                        if (!unique[handle]) {
	                            avatarsListing.push(React.makeElement(ContactsUI.Avatar, {
	                                key: handle,
	                                contact: M.u[handle],
	                                simpletip: M.u[handle] && M.u[handle].name,
	                                className: 'message avatar-wrapper small-rounded-avatar'
	                            }));
	                        }

	                        unique[handle] = 1;
	                    });
	                }
	            }

	            return React.makeElement(
	                'div',
	                { className: message.messageId + " message body" + additionalClasses,
	                    'data-id': "id" + message.messageId },
	                !message.showInitiatorAvatar ? React.makeElement(
	                    'div',
	                    { className: 'feedback call-status-block' },
	                    React.makeElement('i', { className: "call-icon " + message.cssClass })
	                ) : avatar,
	                React.makeElement(
	                    'div',
	                    { className: 'message content-area' },
	                    name,
	                    React.makeElement(
	                        'div',
	                        { className: 'message date-time simpletip', 'data-simpletip': time2date(timestampInt) },
	                        timestamp
	                    ),
	                    React.makeElement(
	                        'div',
	                        { className: 'message text-block' },
	                        React.makeElement(
	                            'div',
	                            { className: 'message call-inner-block' },
	                            avatarsListing,
	                            React.makeElement('div', { dangerouslySetInnerHTML: { __html: textMessage } })
	                        )
	                    ),
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
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(2);

	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var ConversationMessageMixin = {
	    mixins: [MegaRenderMixin, RenderDebugger],
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
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;
	var MetaRichPreviewLoading = __webpack_require__(26).MetaRichpreviewLoading;

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
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;

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
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
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
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;
	var MetaRichPreviewLoading = __webpack_require__(26).MetaRichpreviewLoading;

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
	                        Soon(function () {
	                            message.trackDataChange();
	                            self.safeForceUpdate();
	                        });
	                    });
	                }

	                previewContainer = React.makeElement(MetaRichPreviewLoading, { message: message, isLoading: megaLinkInfo.hadLoaded() });
	            } else {
	                var desc;

	                var is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

	                if (megaLinkInfo.is_chatlink) {
	                    desc = l[8876] + ": " + megaLinkInfo.info['ncm'];
	                } else if (!megaLinkInfo.is_dir) {
	                    desc = bytesToSize(megaLinkInfo.info.size);
	                } else {
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
	                    { className: "message richpreview body " + ((is_icon ? "have-icon" : "no-icon") + " " + (megaLinkInfo.is_chatlink ? "is-chat" : "")) },
	                    megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ? React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        React.makeElement("div", { className: "message richpreview preview",
	                            style: { "backgroundImage": 'url(' + megaLinkInfo.info.preview_url + ')' } })
	                    ) : React.makeElement(
	                        "div",
	                        { className: "message richpreview img-wrapper" },
	                        megaLinkInfo.is_chatlink ? React.makeElement("i", { className: "huge-icon conversations" }) : React.createElement("div", { className: "message richpreview icon block-view-file-type " + (megaLinkInfo.is_dir ? "folder" : fileIcon(megaLinkInfo.info)) })
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
	                                React.makeElement(
	                                    utils.EmojiFormattedContent,
	                                    null,
	                                    megaLinkInfo.info.name || megaLinkInfo.info.topic || ""
	                                )
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
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
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
	            { className: "message date-time simpletip",
	                "data-simpletip": time2date(timestampInt) },
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

	            var text = h === contact.u ? __('joined the group chat.') : __(l[8907]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

	            self._ensureNameIsLoaded(otherContact.u);
	            messages.push(React.makeElement(
	                "div",
	                { className: "message body", "data-id": "id" + message.messageId, key: message.messageId + "_" + h },
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
	                { className: "message body", "data-id": "id" + message.messageId, key: message.messageId + "_" + h },
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
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
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
	            { className: "message date-time simpletip",
	                "data-simpletip": time2date(timestampInt) },
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
	                { className: "message date-time simpletip",
	                    "data-simpletip": time2date(timestampInt) },
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
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
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
	            { className: "message date-time simpletip",
	                "data-simpletip": time2date(timestampInt) },
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
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
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
	            { className: "message date-time simpletip",
	                "data-simpletip": time2date(timestampInt) },
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var SharedFileItem = React.createClass({
	    displayName: "SharedFileItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;
	        var message = this.props.message;
	        var contact = Message.getContactForMessage(message);
	        var name = M.getNameByHandle(contact.u);
	        var timestamp = time2date(message.delay);
	        var node = this.props.node;
	        var icon = this.props.icon;

	        return React.makeElement(
	            "div",
	            { className: "chat-shared-block " + (self.props.isLoading ? "is-loading" : ""),
	                key: message.messageId + "_" + node.h,
	                onClick: function onClick(e) {
	                    if (self.props.isPreviewable) {
	                        slideshow(node.ch, undefined, true);
	                    } else {
	                        M.addDownload([node]);
	                    }
	                },
	                onDoubleClick: function onDoubleClick(e) {
	                    M.addDownload([node]);
	                } },
	            React.makeElement(
	                "div",
	                { className: "icon-or-thumb " + (thumbnails[node.h] ? "thumb" : "") },
	                React.makeElement("div", { className: "medium-file-icon " + icon }),
	                React.makeElement(
	                    "div",
	                    { className: "img-wrapper", id: this.props.imgId },
	                    React.makeElement("img", { alt: "", src: thumbnails[node.h] || "" })
	                )
	            ),
	            React.makeElement(
	                "div",
	                { className: "chat-shared-info" },
	                React.makeElement(
	                    "span",
	                    { className: "txt" },
	                    node.name
	                ),
	                React.makeElement(
	                    "span",
	                    { className: "txt small" },
	                    name
	                ),
	                React.makeElement(
	                    "span",
	                    { className: "txt small grey" },
	                    timestamp
	                )
	            )
	        );
	    }
	});

	var SharedFilesAccordionPanel = React.createClass({
	    displayName: "SharedFilesAccordionPanel",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    eventuallyRenderThumbnails: SoonFc(function () {
	        if (this.allShownNodes) {
	            var pending = [];
	            var nodes = this.allShownNodes;
	            var handles = Object.keys(nodes);
	            var render = function render(h) {
	                if (thumbnails[h]) {
	                    var batch = nodes[h];

	                    for (var i = batch.length; i--;) {
	                        var n = batch[i];
	                        var img = document.getElementById('sharedFiles!' + n.ch);

	                        if (img && (img = img.querySelector('img'))) {
	                            img.src = thumbnails[h];

	                            if (img = Object(img.parentNode).parentNode) {
	                                img.classList.add('thumb');
	                            }
	                        }
	                    }

	                    return true;
	                }
	            };

	            for (var i = handles.length; i--;) {
	                var h = handles[i];

	                if (!render(h)) {
	                    pending.push(nodes[h][0]);
	                }
	            }
	            this.allShownNodes = {};

	            if (pending.length) {
	                fm_thumbnails('standalone', pending, render);
	            }
	        }
	    }, 350),
	    componentWillMount: function componentWillMount() {
	        this.allShownNodes = {};
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        delete this.allShownNodes;
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        this.eventuallyRenderThumbnails();
	    },
	    render: function render() {
	        var self = this;
	        var room = self.props.chatRoom;
	        var mb = room.messagesBuff;

	        var contents = null;

	        var currentPage = mb.sharedFilesPage;
	        var perPage = 12;
	        var startPos = currentPage * perPage;
	        var endPos = startPos + perPage;
	        var totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / perPage);
	        totalPages = mb.sharedFiles.length && !totalPages ? 1 : totalPages;
	        var haveMore = mb.haveMoreSharedFiles || currentPage + 1 < totalPages;
	        var files = [];

	        if (!mb.haveMoreSharedFiles && currentPage === totalPages) {

	            currentPage = mb.sharedFilesPage = Math.max(totalPages - 1, 0);
	        }

	        if (this.props.expanded) {
	            var prev = null;
	            var next = null;

	            if (currentPage > 0) {
	                prev = React.makeElement("div", { className: "chat-share-nav button prev", onClick: function onClick() {
	                        mb.sharedFilesPage--;
	                        self.safeForceUpdate();
	                    } });
	            }

	            if (haveMore) {
	                next = React.makeElement("div", { className: "chat-share-nav button next", onClick: function onClick() {
	                        if (self.isLoadingMore) {
	                            return;
	                        }
	                        if (mb.sharedFiles.length < endPos + perPage) {
	                            self.isLoadingMore = true;
	                            mb.retrieveSharedFilesHistory(perPage).always(function () {
	                                self.isLoadingMore = false;
	                                mb.sharedFilesPage++;
	                                if (!mb.haveMoreSharedFiles && mb.sharedFilesPage > totalPages) {

	                                    mb.sharedFilesPage = totalPages - 1;
	                                }
	                                Soon(function () {
	                                    self.safeForceUpdate();
	                                });
	                            });
	                        } else {

	                            mb.sharedFilesPage++;
	                        }
	                        Soon(function () {
	                            self.safeForceUpdate();
	                        });
	                    } });
	            }

	            if (!mb.sharedFilesLoadedOnce) {
	                mb.retrieveSharedFilesHistory(perPage).always(function () {
	                    Soon(function () {
	                        self.safeForceUpdate();
	                    });
	                });
	            }
	            var sharedNodesContainer = null;
	            if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
	                sharedNodesContainer = React.makeElement(
	                    "div",
	                    { className: "chat-dropdown empty-txt loading-initial" },
	                    React.makeElement(
	                        "div",
	                        { className: "loading-spinner light small" },
	                        React.makeElement("div", { className: "main-loader" })
	                    )
	                );
	            } else if (mb.sharedFiles.length === 0) {
	                sharedNodesContainer = React.makeElement(
	                    "div",
	                    { className: "chat-dropdown empty-txt" },
	                    l[19985]
	                );
	            } else {
	                var keys = mb.sharedFiles.keys().reverse();
	                for (var i = startPos; i < endPos; i++) {
	                    var message = mb.sharedFiles[keys[i]];
	                    if (!message) {
	                        continue;
	                    }
	                    var nodes = message.getAttachmentMeta();
	                    nodes.forEach(function (node) {
	                        var icon = fileIcon(node);
	                        var mediaType = is_video(node);
	                        var isImage = is_image2(node);
	                        var isVideo = mediaType > 0;
	                        var showThumbnail = String(node.fa).indexOf(':0*') > 0;
	                        var isPreviewable = isImage || isVideo;
	                        var imgId = "sharedFiles!" + node.ch;

	                        files.push(React.makeElement(SharedFileItem, { message: message, key: message.messageId, isLoading: self.isLoadingMore,
	                            node: node,
	                            icon: icon,
	                            imgId: imgId,
	                            showThumbnail: showThumbnail,
	                            isPreviewable: isPreviewable,
	                            chatRoom: room }));

	                        if (showThumbnail) {
	                            if (self.allShownNodes[node.h]) {
	                                if (self.allShownNodes[node.h].indexOf(node) < 0) {
	                                    self.allShownNodes[node.h].push(node);
	                                }
	                            } else {
	                                self.allShownNodes[node.h] = [node];
	                            }
	                        }
	                    });
	                }

	                sharedNodesContainer = React.makeElement(
	                    "div",
	                    null,
	                    files
	                );
	            }
	            contents = React.makeElement(
	                "div",
	                { className: "chat-dropdown content have-animation" },
	                sharedNodesContainer,
	                self.isLoadingMore ? React.makeElement(
	                    "div",
	                    { className: "loading-spinner light small" },
	                    React.makeElement("div", { className: "main-loader" })
	                ) : null,
	                files.length > 0 ? React.makeElement(
	                    "div",
	                    { className: "chat-share-nav body" },
	                    prev,
	                    next,
	                    React.makeElement(
	                        "div",
	                        { className: "chat-share-nav pages" },
	                        (l[19988] ? l[19988] : "Page %1").replace("%1", currentPage + 1)
	                    )
	                ) : null
	            );
	        }

	        return React.makeElement(
	            "div",
	            { className: "chat-dropdown container" },
	            React.makeElement(
	                "div",
	                { className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""), onClick: function onClick(e) {
	                        self.props.onToggle(e);
	                    } },
	                React.makeElement(
	                    "span",
	                    null,
	                    this.props.title
	                ),
	                React.makeElement("i", { className: "tiny-icon right-arrow" })
	            ),
	            React.makeElement(
	                "div",
	                { className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "") },
	                contents
	            )
	        );
	    }
	});

	module.exports = {
	    SharedFileItem: SharedFileItem,
	    SharedFilesAccordionPanel: SharedFilesAccordionPanel
	};

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var RenderDebugger = __webpack_require__(6).RenderDebugger;

	var SharedFolderItem = React.createClass({
	    displayName: "SharedFolderItem",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    render: function render() {
	        var self = this;
	        var node = this.props.node;
	        var cs = M.contactstatus(node.h);

	        return React.makeElement(
	            "div",
	            { className: "chat-shared-block incoming " + (self.props.isLoading ? "is-loading" : ""),
	                key: node.h,
	                onClick: function onClick(e) {
	                    M.openFolder(node.h);
	                },
	                onDoubleClick: function onDoubleClick(e) {
	                    M.openFolder(node.h);
	                } },
	            React.makeElement("div", { className: "medium-file-icon inbound-share" }),
	            React.makeElement(
	                "div",
	                { className: "chat-shared-info" },
	                React.makeElement(
	                    "span",
	                    { className: "txt" },
	                    node.name
	                ),
	                React.makeElement(
	                    "span",
	                    { className: "txt small" },
	                    fm_contains(cs.files, cs.folders)
	                )
	            )
	        );
	    }
	});

	var IncomingSharesAccordionPanel = React.createClass({
	    displayName: "IncomingSharesAccordionPanel",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    componentWillMount: function componentWillMount() {
	        this.hadLoaded = false;
	    },
	    getContactHandle: function getContactHandle() {
	        var self = this;
	        var room = self.props.chatRoom;
	        var contactHandle = room.getParticipantsExceptMe()[0];
	        if (!contactHandle || room.type !== "private") {
	            return {};
	        }
	        return contactHandle;
	    },
	    render: function render() {
	        var self = this;
	        var room = self.props.chatRoom;
	        var contactHandle = self.getContactHandle();
	        var contents = null;
	        var MAX_ITEMS = 10;

	        if (this.props.expanded) {
	            if (!this.hadLoaded) {
	                this.hadLoaded = true;

	                self.isLoadingMore = true;
	                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).always(function () {
	                    self.isLoadingMore = false;
	                    Soon(function () {
	                        if (self.isComponentEventuallyVisible()) {
	                            self.safeForceUpdate();
	                        }
	                    }, 5000);
	                }.bind(this));
	            }
	            var incomingSharesContainer = null;
	            var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

	            if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
	                incomingSharesContainer = React.makeElement(
	                    "div",
	                    { className: "chat-dropdown empty-txt" },
	                    l[19986]
	                );
	            } else {
	                var haveMore = sharedFolders.length > MAX_ITEMS;

	                var defSortFn = M.getSortByNameFn();
	                sharedFolders.sort(function (a, b) {
	                    var nodeA = M.d[a];
	                    var nodeB = M.d[b];
	                    return defSortFn(nodeA, nodeB, -1);
	                });

	                var renderNodes = [];
	                for (var i = 0; i < Math.min(sharedFolders.length, MAX_ITEMS); i++) {
	                    var nodeHandle = sharedFolders[i];
	                    var node = M.d[nodeHandle];
	                    if (!node) {
	                        continue;
	                    }
	                    renderNodes.push(React.makeElement(SharedFolderItem, { key: node.h, isLoading: self.isLoadingMore,
	                        node: node,
	                        chatRoom: room, s: true }));
	                }

	                incomingSharesContainer = React.makeElement(
	                    "div",
	                    null,
	                    renderNodes,
	                    haveMore ? React.makeElement(
	                        "div",
	                        { className: "chat-share-nav body" },
	                        React.makeElement(
	                            "div",
	                            { className: "chat-share-nav show-all", onClick: function onClick(e) {
	                                    M.openFolder(contactHandle);
	                                } },
	                            React.makeElement(
	                                "span",
	                                { className: "transfer-filetype-icon inbound-share" },
	                                React.makeElement("span", { className: "transfer-filetype-icon inbound-share" })
	                            ),
	                            React.makeElement(
	                                "span",
	                                { className: "txt" },
	                                __(l[19797]) ? __(l[19797]) : "Show All"
	                            )
	                        )
	                    ) : null
	                );
	            }
	            contents = React.makeElement(
	                "div",
	                { className: "chat-dropdown content have-animation" },
	                incomingSharesContainer,
	                self.isLoadingMore ? React.makeElement(
	                    "div",
	                    { className: "chat-dropdown empty-txt" },
	                    React.makeElement(
	                        "div",
	                        { className: "loading-spinner light small" },
	                        React.makeElement("div", { className: "main-loader" })
	                    )
	                ) : null
	            );
	        }

	        return React.makeElement(
	            "div",
	            { className: "chat-dropdown container" },
	            React.makeElement(
	                "div",
	                { className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""), onClick: function onClick(e) {
	                        self.props.onToggle(e);
	                    } },
	                React.makeElement(
	                    "span",
	                    null,
	                    this.props.title
	                ),
	                React.makeElement("i", { className: "tiny-icon right-arrow" })
	            ),
	            React.makeElement(
	                "div",
	                { className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "") },
	                contents
	            )
	        );
	    }
	});

	module.exports = {
	    SharedFolderItem: SharedFolderItem,
	    IncomingSharesAccordionPanel: IncomingSharesAccordionPanel
	};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

	var CloseOpenModeMessage = React.createClass({
	    displayName: "CloseOpenModeMessage",

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
	            avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: "message  avatar-wrapper small-rounded-avatar" });
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
	                    __('switched off chat open mode.')
	                )
	            )
	        );
	    }
	});

	module.exports = {
	    CloseOpenModeMessage: CloseOpenModeMessage
	};

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);
	var ConversationMessageMixin = __webpack_require__(24).ConversationMessageMixin;
	var getMessageString = __webpack_require__(7).getMessageString;

	var ChatHandleMessage = React.createClass({
	    displayName: "ChatHandleMessage",

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
	        var name = "";

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
	            avatar = React.makeElement(ContactsUI.Avatar, { contact: contact, className: "message  avatar-wrapper small-rounded-avatar" });
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
	                    message.meta.handleUpdate === 1 ? l[20570] : l[20571]
	                )
	            )
	        );
	    }
	});

	module.exports = {
	    ChatHandleMessage: ChatHandleMessage
	};

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ModalDialogsUI = __webpack_require__(13);
	var utils = __webpack_require__(5);

	var ChatlinkDialog = React.createClass({
	    displayName: "ChatlinkDialog",

	    mixins: [MegaRenderMixin],
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'requiresUpdateOnResize': true,
	            'disableCheckingVisibility': true
	        };
	    },
	    getInitialState: function getInitialState() {
	        return {
	            'link': l[5533]
	        };
	    },
	    onPopupDidMount: function onPopupDidMount($node) {
	        this.$popupNode = $node;
	    },
	    componentWillMount: function componentWillMount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = self.props.chatRoom.megaChat;
	        $.dialog = "group-chat-link";

	        self.retrieveChatLink();
	    },
	    retrieveChatLink: function retrieveChatLink() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (!chatRoom.topic) {
	            delete self.loading;
	            return;
	        }

	        self.loading = chatRoom.updatePublicHandle(undefined).always(function () {
	            if (chatRoom.publicLink) {
	                self.setState({ 'link': getBaseUrl() + '/' + chatRoom.publicLink });
	            } else {
	                self.setState({ 'link': l[20660] });
	            }
	        });
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        var megaChat = chatRoom.megaChat;

	        if ($.dialog === "group-chat-link") {
	            closeDialog();
	        }
	    },
	    componentDidUpdate: function componentDidUpdate() {
	        var self = this;
	        var chatRoom = this.props.chatRoom;
	        if (!this.loading && chatRoom.topic) {
	            this.retrieveChatLink();
	        }

	        this.toastTxt = l[7654];

	        if (!this.$popupNode) {
	            return;
	        }

	        var $node = this.$popupNode;
	        var $copyButton = $('.copy-to-clipboard', $node);

	        $copyButton.rebind('click', function () {
	            copyToClipboard(self.state.link, self.toastTxt);
	            return false;
	        });

	        $('span', $copyButton).text(l[1990]);
	    },
	    onClose: function onClose() {
	        if (this.props.onClose) {
	            this.props.onClose();
	        }
	    },
	    onTopicFieldChanged: function onTopicFieldChanged(e) {
	        this.setState({ 'newTopic': e.target.value });
	    },
	    onTopicFieldKeyPress: function onTopicFieldKeyPress(e) {
	        var self = this;
	        if (e.which === 13) {
	            self.props.chatRoom.setRoomTitle(self.state.newTopic);
	        }
	    },
	    render: function render() {
	        var self = this;

	        var closeButton = React.makeElement(
	            "div",
	            { key: "close", className: "default-red-button right links-button",
	                onClick: function onClick(e) {
	                    self.onClose();
	                } },
	            React.makeElement(
	                "span",
	                null,
	                l[148]
	            )
	        );

	        return React.makeElement(
	            ModalDialogsUI.ModalDialog,
	            {
	                title: self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? l[9080] : "",
	                className: "fm-dialog chat-rename-dialog export-chat-links-dialog group-chat-link" + (!self.props.chatRoom.topic ? " requires-topic" : ""),
	                onClose: function onClose() {
	                    self.onClose(self);
	                },
	                chatRoom: self.props.chatRoom,
	                popupDidMount: self.onPopupDidMount },
	            React.makeElement(
	                "div",
	                { className: "export-content-block" },
	                self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? React.makeElement(
	                    "div",
	                    null,
	                    React.makeElement(
	                        "div",
	                        { className: "export-chat-ink-warning" },
	                        l[20617]
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "rename-input-bl", style: {
	                                width: '320px',
	                                margin: '10px auto 20px auto'
	                            } },
	                        React.makeElement("input", { type: "text", name: "newTopic", value: self.state.newTopic,
	                            ref: function ref(field) {
	                                self.topicInput = field;
	                            },
	                            style: {
	                                'paddingLeft': 8
	                            },
	                            onChange: self.onTopicFieldChanged,
	                            onKeyPress: self.onTopicFieldKeyPress,
	                            placeholder: l[20616], maxLength: "30" })
	                    )
	                ) : React.makeElement(
	                    "div",
	                    { className: "fm-dialog-body" },
	                    React.makeElement("i", { className: "big-icon group-chat" }),
	                    React.makeElement(
	                        "div",
	                        { className: "chat-title" },
	                        React.makeElement(
	                            utils.EmojiFormattedContent,
	                            null,
	                            self.props.chatRoom.topic
	                        )
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "chat-link-input" },
	                        React.makeElement("i", { className: "small-icon blue-chain colorized" }),
	                        React.makeElement("input", { type: "text", readOnly: true, value: !self.props.chatRoom.topic ? l[20660] : self.state.link })
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "info" },
	                        self.props.chatRoom.publicLink ? l[20644] : null
	                    )
	                )
	            ),
	            React.makeElement(
	                "div",
	                { className: "fm-notifications-bottom" },
	                self.props.chatRoom.iAmOperator() && self.props.chatRoom.publicLink ? React.makeElement(
	                    "div",
	                    { key: "deleteLink", className: "default-white-button left links-button" + (self.loading && self.loading.state() === 'pending' ? " disabled" : ""), onClick: function onClick(e) {
	                            self.props.chatRoom.updatePublicHandle(1);
	                            self.onClose();
	                        } },
	                    React.makeElement(
	                        "span",
	                        null,
	                        l[20487]
	                    )
	                ) : null,
	                self.props.chatRoom.topic ? self.props.chatRoom.publicLink ? React.makeElement(
	                    "div",
	                    { className: "default-green-button button right copy-to-clipboard" + (self.loading && self.loading.state() === 'pending' ? " disabled" : "") },
	                    React.makeElement(
	                        "span",
	                        null,
	                        l[63]
	                    )
	                ) : closeButton : self.props.chatRoom.iAmOperator() ? React.makeElement(
	                    "div",
	                    { key: "setTopic", className: "default-red-button right links-button" + (self.state.newTopic && $.trim(self.state.newTopic) ? "" : " disabled"), onClick: function onClick(e) {
	                            if (self.props.chatRoom.iAmOperator()) {
	                                self.props.chatRoom.setRoomTitle(self.state.newTopic);
	                            }
	                        } },
	                    React.makeElement(
	                        "span",
	                        null,
	                        l[20615]
	                    )
	                ) : closeButton,
	                React.makeElement("div", { className: "clear" })
	            )
	        );
	    }

	});

	module.exports = {
	    ChatlinkDialog: ChatlinkDialog
	};

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var RenderDebugger = __webpack_require__(6).RenderDebugger;
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var ContactsUI = __webpack_require__(11);

	var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1;

	var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;

	var VIEW_MODES = {
	    "GRID": 1,
	    "CAROUSEL": 2
	};

	var ConversationAudioVideoPanel = React.createClass({
	    displayName: "ConversationAudioVideoPanel",

	    mixins: [MegaRenderMixin, RenderDebugger],
	    getInitialState: function getInitialState() {
	        return {
	            'messagesBlockEnabled': false,
	            'fullScreenModeEnabled': false,
	            'localMediaDisplay': true,
	            'viewMode': VIEW_MODES.GRID,
	            'selectedStreamSid': false
	        };
	    },
	    specificShouldComponentUpdate: function specificShouldComponentUpdate() {
	        if (this.state.fullScreenModeEnabled) {
	            return true;
	        }
	    },
	    getCurrentStreamId: function getCurrentStreamId() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;
	        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
	            return;
	        }

	        var streams = chatRoom.callManagerCall._streams;
	        var activeStream = self.state.selectedStreamSid || Object.keys(streams)[0];
	        return activeStream;
	    },
	    getViewMode: function getViewMode() {
	        var chatRoom = this.props.chatRoom;
	        var callManagerCall = chatRoom.callManagerCall;
	        if (callManagerCall) {
	            var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;
	            if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
	                return VIEW_MODES.CAROUSEL;
	            }
	        }
	        return this.state.viewMode;
	    },
	    onPlayerClick: function onPlayerClick(sid) {
	        if (this.getViewMode() === VIEW_MODES.CAROUSEL) {
	            this.setState({ 'selectedStreamSid': sid });
	        }
	    },
	    _hideBottomPanel: function _hideBottomPanel() {
	        var self = this;
	        var room = self.props.chatRoom;
	        if (!room.callManagerCall || !room.callManagerCall.isActive()) {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(self));

	        self.visiblePanel = false;
	        $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container).removeClass('visible-panel');
	    },
	    getRemoteSid: function getRemoteSid(sid) {
	        var fullSid = sid || this.state.selectedStreamSid;
	        if (!fullSid) {
	            return false;
	        }
	        var sid = fullSid.split(":")[2];

	        if (!sid) {
	            return false;
	        }
	        return sid;
	    },
	    resizeVideos: function resizeVideos() {
	        var self = this;
	        var chatRoom = self.props.chatRoom;

	        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
	            return;
	        }
	        if (chatRoom.type === "private") {
	            return;
	        }

	        var $container = $(ReactDOM.findDOMNode(self));

	        var totalWidth = $container.outerWidth();
	        if (totalWidth > $('.participantsContainer', $container).parent().outerWidth()) {

	            totalWidth = $('.participantsContainer', $container).parent().outerWidth();
	        }

	        var $streams = $('.user-video, .user-audio', $container);
	        var totalStreams = $streams.length;

	        if (totalStreams === 1) {
	            totalWidth = Math.min(totalWidth, $container.outerHeight() - $('.call-header', $container).outerHeight());
	        }
	        var newWidth;

	        if (self.getViewMode() === VIEW_MODES.CAROUSEL) {
	            $('.participantsContainer', $container).height('auto');
	            var activeStreamHeight = $container.outerHeight() - $('.call-header').outerHeight() - $('.participantsContainer', $container).outerHeight();

	            $('.activeStream', $container).height(activeStreamHeight);
	            $('.activeStream .user-audio .avatar-wrapper', $container).width(activeStreamHeight - 20).height(activeStreamHeight - 20).css('font-size', 100 / 240 * activeStreamHeight + "px");

	            $('.user-video, .user-audio, .user-video video', $container).width('').height('');

	            var $video;
	            var $mutedIcon;
	            $video = $('.activeStream video', $container);
	            $mutedIcon = $('.activeStream .icon-audio-muted', $container);

	            var callManagerCall = chatRoom.callManagerCall;
	            var audioIsMuted = false;
	            if (this.state.selectedStreamSid === "local") {
	                audioIsMuted = callManagerCall.getMediaOptions().audio;
	            } else {
	                audioIsMuted = callManagerCall.getRemoteMediaOptions(self.getRemoteSid()).audio;
	            }

	            if ($video.length > 0 && $mutedIcon.length > 0) {
	                if ($video.outerHeight() > 0 && $video[0].videoWidth > 0 && $video[0].videoHeight > 0) {
	                    var actualWidth = Math.min($video.outerWidth(), $video[0].videoWidth / $video[0].videoHeight * $video.outerHeight());
	                    if (!audioIsMuted) {
	                        $mutedIcon.removeClass('hidden');
	                    } else {
	                        $mutedIcon.addClass('hidden');
	                    }

	                    $mutedIcon.css({
	                        'right': 'auto',
	                        'top': 24 + 8,
	                        'left': $video.outerWidth() / 2 + actualWidth / 2 - $mutedIcon.outerWidth() - 24
	                    });
	                } else {
	                    $video.one('loadeddata.cav loadedmetadata.cav', function () {
	                        self.resizeVideos();
	                    });

	                    $mutedIcon.addClass('hidden');
	                }
	            }
	        } else {
	            $('.participantsContainer', $container).height($container.outerHeight() - $('.call-header', $container).outerHeight());

	            newWidth = totalWidth / totalStreams;
	        }

	        var $resizables = $('.user-video, .user-audio', $('.participantsContainer', $container));
	        $resizables.width(newWidth);

	        $resizables.each(function (i, elem) {
	            var $elem = $(elem);

	            $('video', elem).width(newWidth).height(newWidth);

	            $elem.width(newWidth).height(newWidth);
	        });
	    },
	    componentDidMount: function componentDidMount() {
	        this.resizeVideos();
	        this.initialRender = false;
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
	            $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container).addClass('visible-panel');

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

	        $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
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
	            self.resizePanes();
	            self.resizeVideos();
	        });

	        (self.remoteVideoRefs || []).forEach(function (remoteVideo) {
	            if (remoteVideo && remoteVideo.src === "" && remoteVideo.currentTime === 0 && !remoteVideo.srcObject) {
	                var stream = room.callManagerCall._streams[remoteVideo.id.split("remotevideo_")[1]];
	                RTC.attachMediaStream(remoteVideo, stream);
	            }
	        });

	        if (room.megaChat.rtc && room.megaChat.rtc.gLocalStream && self.refs.localViewport && self.refs.localViewport.src === "" && self.refs.localViewport.currentTime === 0 && !self.refs.localViewport.srcObject) {
	            RTC.attachMediaStream(self.refs.localViewport, room.megaChat.rtc.gLocalStream);
	        }

	        var bigLocalViewport = $('.bigLocalViewport')[0];
	        var smallLocalViewport = $('.smallLocalViewport')[0];

	        if (smallLocalViewport && bigLocalViewport && !bigLocalViewport.src && !bigLocalViewport.srcObject && room.megaChat.rtc && room.megaChat.rtc.gLocalStream && bigLocalViewport && bigLocalViewport.src === "" && bigLocalViewport.currentTime === 0) {
	            RTC.attachMediaStream(bigLocalViewport, room.megaChat.rtc.gLocalStream);
	        }

	        $(room).rebind('toggleMessages.av', function () {
	            self.toggleMessages();
	        });

	        room.messagesBlockEnabled = self.state.messagesBlockEnabled;

	        var self = this;
	        this.props.chatRoom.callManagerCall.rebind('onAudioLevelChange.ui', function (e, sid, level) {
	            var elm = $(".stream" + sid.replace(/:/g, "_"));

	            if (elm.length === 0) {
	                return;
	            }

	            if (level > 10) {
	                $('.avatar-wrapper', elm).css({
	                    'box-shadow': '0px 0px 0px 3px rgba(255, 255, 255, ' + Math.min(0.90, level / 100) + ')'
	                });
	            } else {
	                $('.avatar-wrapper', elm).css({
	                    'box-shadow': '0px 0px 0px 0px rgba(255, 255, 255, 0)'
	                });
	            }
	        });

	        if (self.initialRender === false && ReactDOM.findDOMNode(self)) {
	            self.bindInitialEvents();
	        }

	        self.resizePanes();
	        self.resizeVideos();
	    },
	    resizePanes: function resizePanes() {
	        var self = this;
	        var $container = $(self.findDOMNode());
	        var $rootContainer = $container.parents('.conversation-panel');
	        if (!self.state.messagesBlockEnabled && self.props.chatRoom.callManagerCall) {
	            $('.call-block', $rootContainer).height('');
	        }
	        $rootContainer.trigger('resized');
	    },
	    bindInitialEvents: function bindInitialEvents() {
	        var self = this;
	        var $container = $(ReactDOM.findDOMNode(self));
	        self.avResizable = new FMResizablePane($container, {
	            'direction': 's',
	            'handle': '.av-resize-handler',
	            'minHeight': 168,
	            'persistanceKey': false,
	            'containment': $container.parent()
	        });

	        $(self.avResizable).rebind('resize.avp', function (e, e2, ui) {
	            self.resizePanes();
	            localStorage.chatAvPaneHeight = ui.size.height;
	        });

	        self.initialRender = true;
	    },
	    componentWillUnmount: function componentWillUnmount() {
	        var self = this;
	        var room = self.props.chatRoom;

	        var $container = $(ReactDOM.findDOMNode(self));
	        if ($container) {
	            $container.off('mouseover.chatUI' + self.props.chatRoom.roomId);
	            $container.off('mouseout.chatUI' + self.props.chatRoom.roomId);
	            $container.off('mousemove.chatUI' + self.props.chatRoom.roomId);
	        }

	        $(document).off("fullscreenchange.megaChat_" + room.roomId);
	        $(window).off('resize.chatUI_' + room.roomId);
	        $(room).off('toggleMessages.av');

	        var $rootContainer = $container.parents('.conversation-panel');
	        $('.call-block', $rootContainer).height('');
	        self.initialRender = false;
	    },
	    toggleMessages: function toggleMessages(e) {
	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }

	        if (this.props.onMessagesToggle) {
	            this.props.onMessagesToggle(!this.state.messagesBlockEnabled);
	            var $container = $(this.findDOMNode());
	            var predefHeight = localStorage.chatAvPaneHeight || false;
	            if (predefHeight) {
	                $container.height(parseInt(localStorage.chatAvPaneHeight, 10));
	            }
	        }

	        this.setState({
	            'messagesBlockEnabled': !this.state.messagesBlockEnabled
	        });

	        if (this.state.messagesBlockEnabled === false) {
	            Soon(function () {
	                $(window).trigger('resize');
	            });
	        }
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
	        this.remoteVideoRefs = this.remoteVideoRefs || [];

	        var self = this;

	        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isStarted()) {
	            self.initialRender = false;
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
	        var activeStreamIdOrPlayer = (chatRoom.type === "group" || chatRoom.type === "public") && self.getViewMode() === VIEW_MODES.CAROUSEL ? self.getCurrentStreamId() : false;

	        var visiblePanelClass = "";
	        var localPlayerStream;
	        if (callManagerCall && chatRoom.megaChat.rtc && chatRoom.megaChat.rtc.gLocalStream) {
	            localPlayerStream = chatRoom.megaChat.rtc.gLocalStream;
	        }

	        if (this.visiblePanel === true) {
	            visiblePanelClass += " visible-panel";
	        }

	        remotePlayerElement = [];

	        var realStreams = Object.keys(callManagerCall._streams);
	        var streams = [];
	        if (!DEBUG_PARTICIPANTS_MULTIPLICATOR) {
	            streams = realStreams;
	        } else {

	            var initialCount = realStreams.length;
	            if (initialCount > 0) {
	                for (var i = 0; i < initialCount * DEBUG_PARTICIPANTS_MULTIPLICATOR; i++) {
	                    streams.push(realStreams[(i || 0) % initialCount]);
	                }
	            }
	        }

	        streams.forEach(function (streamId, k) {
	            var stream = callManagerCall._streams[streamId];
	            var userId = streamId.split(":")[0];
	            var clientId = streamId.split(":")[1];
	            var sessionId = streamId.split(":")[2];
	            var remotePlayerStream = stream;

	            if (!remotePlayerStream || callManagerCall.getRemoteMediaOptions(sessionId).video === false) {

	                var contact = M.u[userId];
	                var player = React.makeElement(
	                    "div",
	                    {
	                        className: "call user-audio is-avatar " + (activeStreamIdOrPlayer === streamId ? "active" : "") + " stream" + streamId.replace(/:/g, "_"),
	                        key: streamId + "_" + k,
	                        onClick: function onClick(e) {
	                            self.onPlayerClick(streamId);
	                        } },
	                    callManagerCall.peerQuality[streamId] === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    React.makeElement(
	                        "div",
	                        { className: "center-avatar-wrapper" },
	                        callManagerCall.getRemoteMediaOptions(sessionId).audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                        React.makeElement(ContactsUI.Avatar, { contact: contact, className: "avatar-wrapper", simpletip: contact.name,
	                            simpletipWrapper: "#call-block",
	                            simpletipOffset: 8,
	                            simpletipPosition: "top",
	                            hideVerifiedBadge: true })
	                    )
	                );

	                if (activeStreamIdOrPlayer === streamId) {
	                    activeStreamIdOrPlayer = player;
	                }
	                remotePlayerElement.push(player);
	            } else {
	                player = React.makeElement(
	                    "div",
	                    {
	                        className: "call user-video is-video " + (activeStreamIdOrPlayer === streamId ? "active" : "") + " stream" + streamId.replace(/:/g, "_"),
	                        key: streamId + "_" + k,
	                        onClick: function onClick(e) {
	                            self.onPlayerClick(streamId);
	                        } },
	                    callManagerCall.peerQuality[streamId] === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    callManagerCall.getRemoteMediaOptions(sessionId).audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                    React.makeElement("video", {
	                        autoPlay: true,
	                        className: "rmtViewport rmtVideo",
	                        id: "remotevideo_" + streamId,
	                        ref: function ref(_ref) {
	                            if (_ref && self.remoteVideoRefs.indexOf(_ref) === -1) {
	                                self.remoteVideoRefs.push(_ref);
	                            }
	                        }
	                    })
	                );

	                if (activeStreamIdOrPlayer === streamId) {
	                    activeStreamIdOrPlayer = player;
	                }
	                remotePlayerElement.push(player);
	            }
	        });

	        if (this.getViewMode() === VIEW_MODES.GRID) {
	            if (!localPlayerStream || callManagerCall.getMediaOptions().video === false) {
	                localPlayerElement = React.makeElement(
	                    "div",
	                    { className: "call local-audio right-aligned bottom-aligned is-avatar" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass },
	                    chatRoom.megaChat.networkQuality === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    React.makeElement(
	                        "div",
	                        { className: "default-white-button tiny-button call", onClick: this.toggleLocalVideoDisplay },
	                        React.makeElement("i", { className: "tiny-icon grey-minus-icon" })
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "center-avatar-wrapper " + (this.state.localMediaDisplay ? "" : "hidden") },
	                        callManagerCall.getMediaOptions().audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                        React.makeElement(ContactsUI.Avatar, {
	                            contact: M.u[u_handle],
	                            className: "call avatar-wrapper is-avatar " + (this.state.localMediaDisplay ? "" : "hidden"),
	                            hideVerifiedBadge: true
	                        })
	                    )
	                );
	            } else {
	                localPlayerElement = React.makeElement(
	                    "div",
	                    {
	                        className: "call local-video right-aligned is-video bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass + (activeStreamIdOrPlayer === "local" ? " active " : "") },
	                    chatRoom.megaChat.networkQuality === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    React.makeElement(
	                        "div",
	                        { className: "default-white-button tiny-button call", onClick: this.toggleLocalVideoDisplay },
	                        React.makeElement("i", { className: "tiny-icon grey-minus-icon" })
	                    ),
	                    callManagerCall.getMediaOptions().audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
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
	        } else {

	            var localPlayer;
	            if (!localPlayerStream || callManagerCall.getMediaOptions().video === false) {
	                localPlayer = React.makeElement(
	                    "div",
	                    { className: "call user-audio local-carousel is-avatar" + (activeStreamIdOrPlayer === "local" ? " active " : ""), key: "local",
	                        onClick: function onClick(e) {
	                            self.onPlayerClick("local");
	                        } },
	                    chatRoom.megaChat.networkQuality === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    React.makeElement(
	                        "div",
	                        { className: "center-avatar-wrapper" },
	                        callManagerCall.getMediaOptions().audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                        React.makeElement(ContactsUI.Avatar, {
	                            contact: M.u[u_handle], className: "call avatar-wrapper",
	                            hideVerifiedBadge: true
	                        })
	                    )
	                );

	                remotePlayerElement.push(localPlayer);

	                if (activeStreamIdOrPlayer === "local") {
	                    activeStreamIdOrPlayer = localPlayer;
	                }
	            } else {
	                localPlayer = React.makeElement(
	                    "div",
	                    {
	                        className: "call user-video local-carousel is-video" + (activeStreamIdOrPlayer === "local" ? " active " : ""),
	                        key: "local-video",
	                        onClick: function onClick(e) {
	                            self.onPlayerClick("local");
	                        } },
	                    chatRoom.megaChat.networkQuality === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                    callManagerCall.getMediaOptions().audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                    React.makeElement("video", {
	                        ref: "localViewport",
	                        className: "localViewport smallLocalViewport",
	                        defaultMuted: true,
	                        muted: true,
	                        volume: 0,
	                        id: "localvideo_" + callManagerCall.id
	                    })
	                );

	                remotePlayerElement.push(localPlayer);

	                if (activeStreamIdOrPlayer === "local") {
	                    activeStreamIdOrPlayer = React.makeElement(
	                        "div",
	                        {
	                            className: "call user-video is-video local-carousel local-carousel-big",
	                            key: "local-video2" },
	                        chatRoom.megaChat.networkQuality === 0 ? React.makeElement("div", { className: "icon-connection-issues" }) : null,
	                        callManagerCall.getMediaOptions().audio === false ? React.makeElement("div", { className: "small-icon icon-audio-muted" }) : React.createElement("div", { className: "small-icon icon-audio-muted hidden" }),
	                        React.makeElement("video", {
	                            className: "localViewport bigLocalViewport",
	                            defaultMuted: true,
	                            muted: true,
	                            volume: 0,
	                            id: "localvideo_big_" + callManagerCall.id
	                        })
	                    );
	                }
	            }
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

	        var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;

	        additionalClass += " participants-count-" + participantsCount;

	        var header = null;

	        var videoSessionCount = 0;
	        if (chatRoom.callManagerCall && chatRoom.callManagerCall.getCurrentVideoSlotsUsed) {
	            videoSessionCount = chatRoom.callManagerCall.getCurrentVideoSlotsUsed();
	        }

	        if (chatRoom.type === "group" || chatRoom.type === "public") {
	            header = React.makeElement(
	                "div",
	                { className: "call-header" },
	                React.makeElement(
	                    "div",
	                    { className: "call-topic" },
	                    ellipsis(chatRoom.getRoomTitle(), 'end', 70)
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "call-participants-count" },
	                    Object.keys(chatRoom.callParticipants).length
	                ),
	                React.makeElement("a", { href: "javascript:;", className: "call-switch-view " + (self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel") + (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE ? " disabled" : ""), onClick: function onClick(e) {
	                        if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
	                            return;
	                        }

	                        self.setState({
	                            'selectedStreamSid': false,
	                            'viewMode': self.getViewMode() === VIEW_MODES.GRID ? VIEW_MODES.CAROUSEL : VIEW_MODES.GRID
	                        });
	                    } }),
	                React.makeElement(
	                    "div",
	                    { className: "call-av-counter" + (videoSessionCount >= RtcModule.kMaxCallVideoSenders ? " limit-reached" : "") },
	                    videoSessionCount,
	                    " / ",
	                    RtcModule.kMaxCallVideoSenders
	                ),
	                React.makeElement("div", { className: "call-video-icon" + (chatRoom.callManagerCall.hasVideoSlotLimitReached() ? " call-video-icon-warn" : "") }),
	                React.makeElement(
	                    "div",
	                    { className: "call-header-duration",
	                        "data-room-id": chatRoom.chatId },
	                    secondsToTimeShort(chatRoom._currentCallCounter)
	                )
	            );
	        }

	        var notifBar = null;

	        if (chatRoom.type === "group" || chatRoom.type === "public") {
	            var notif = chatRoom.callManagerCall.callNotificationsEngine.getCurrentNotification();

	            if (!chatRoom.callManagerCall.callNotificationsEngine._bound) {
	                chatRoom.callManagerCall.callNotificationsEngine.rebind('onChange.cavp', function () {
	                    if (chatRoom.isCurrentlyActive) {
	                        self.safeForceUpdate();
	                        var $notif = $('.in-call-notif:visible');
	                        $notif.css({ 'opacity': 0.3 }).animate({ 'opacity': 1 }, {
	                            queue: false,
	                            duration: 1500
	                        });
	                    }
	                });
	                chatRoom.callManagerCall.callNotificationsEngine._bound = true;
	            }

	            if (notif) {
	                var title = notif.getTitle();
	                notifBar = React.makeElement(
	                    "div",
	                    { className: "in-call-notif " + notif.getClassName() },
	                    title ? title : null
	                );
	            }
	        }
	        var networkQualityBar = null;

	        if (chatRoom.megaChat.networkQuality <= 1) {
	            var networkQualityMessage = "Slow connection.";

	            networkQualityBar = React.makeElement(
	                "div",
	                { className: "in-call-notif yellow" + (notifBar ? " after-green-notif" : "") },
	                networkQualityMessage
	            );
	        }

	        additionalClass += self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel";

	        var players = null;
	        if (self.getViewMode() === VIEW_MODES.GRID) {
	            players = React.makeElement(
	                "div",
	                { className: "participantsWrapper", key: "container" },
	                React.makeElement(
	                    "div",
	                    { className: "participantsContainer", key: "partsContainer" },
	                    remotePlayerElement
	                ),
	                localPlayerElement
	            );
	        } else {

	            players = React.makeElement(
	                "div",
	                { key: "container" },
	                React.makeElement(
	                    "div",
	                    { className: "activeStream", key: "activeStream" },
	                    activeStreamIdOrPlayer
	                ),
	                React.makeElement(
	                    "div",
	                    { className: "participantsContainer", key: "partsContainer" },
	                    remotePlayerElement,
	                    localPlayerElement
	                )
	            );
	        }

	        var topPanel = null;

	        if (chatRoom.type !== "group") {
	            topPanel = React.makeElement(
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
	                    { className: "call-duration medium blue call-counter", "data-room-id": chatRoom.chatId },
	                    secondsToTimeShort(chatRoom._currentCallCounter)
	                )
	            );
	        }

	        if (participantsCount < 4) {
	            additionalClass = additionalClass + " participants-less-4";
	        } else if (participantsCount < 8) {
	            additionalClass = additionalClass + " participants-less-8";
	        } else if (participantsCount < 16) {
	            additionalClass = additionalClass + " participants-less-16";
	        } else {
	            additionalClass = additionalClass + " participants-a-lot";
	        }

	        return React.makeElement(
	            "div",
	            { className: "call-block" + additionalClass, id: "call-block" },
	            React.makeElement("div", { className: "av-resize-handler ui-resizable-handle ui-resizable-s " + (this.state.messagesBlockEnabled === true && this.state.fullScreenModeEnabled === false ? "" : "hidden") }),
	            header,
	            notifBar,
	            networkQualityBar,
	            players,
	            topPanel,
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
	                    { className: "button call" + (callManagerCall.hasVideoSlotLimitReached() === true && callManagerCall.getMediaOptions().video === false ? " disabled" : ""), onClick: function onClick(e) {
	                            if (callManagerCall.getMediaOptions().video === true) {
	                                callManagerCall.muteVideo();
	                            } else {
	                                if (!callManagerCall.hasVideoSlotLimitReached()) {
	                                    callManagerCall.unmuteVideo();
	                                }
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

	module.exports = {
	    ConversationAudioVideoPanel: ConversationAudioVideoPanel
	};

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var utils = __webpack_require__(5);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;
	var Tooltips = __webpack_require__(14);
	var Forms = __webpack_require__(15);
	var MiniUI = __webpack_require__(40);
	var ContactsUI = __webpack_require__(11);
	var ModalDialogsUI = __webpack_require__(13);

	var StartGroupChatWizard = React.createClass({
	    displayName: "StartGroupChatWizard",

	    mixins: [MegaRenderMixin],
	    clickTime: 0,
	    getDefaultProps: function getDefaultProps() {
	        return {
	            'selectLabel': __(l[1940]),
	            'cancelLabel': __(l[82]),
	            'hideable': true,
	            'flowType': 1
	        };
	    },
	    getInitialState: function getInitialState() {
	        var haveContacts = false;
	        var keys = this.props.contacts.keys();
	        for (var i = 0; i < keys.length; i++) {
	            if (this.props.contacts[keys[i]].c === 1) {
	                haveContacts = true;
	                break;
	            }
	        }

	        return {
	            'selected': this.props.selected ? this.props.selected : [],
	            'haveContacts': haveContacts,
	            'step': this.props.flowType === 2 || !haveContacts ? 1 : 0,
	            'keyRotation': false,
	            'createChatLink': this.props.flowType === 2 ? true : false,
	            'groupName': ''
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
	    onFinalizeClick: function onFinalizeClick(e) {
	        var self = this;
	        if (e) {
	            e.preventDefault();
	            e.stopPropagation();
	        }

	        var groupName = self.state.groupName;
	        var handles = self.state.selected;
	        var keyRotation = self.state.keyRotation;
	        var createChatLink = keyRotation ? false : self.state.createChatLink;
	        megaChat.createAndShowGroupRoomFor(handles, groupName, keyRotation, createChatLink);
	        self.props.onClose(self);
	    },
	    render: function render() {
	        var self = this;

	        var classes = "new-group-chat contrast small-footer " + self.props.className;

	        var contacts = self.props.contacts;
	        var haveContacts = self.state.haveContacts;
	        var buttons = [];
	        var allowNext = false;
	        var failedToEnableChatlink = self.state.failedToEnableChatlink && self.state.createChatLink === true && !self.state.groupName;

	        if (self.state.keyRotation) {
	            failedToEnableChatlink = false;
	        }

	        if (self.state.step === 0 && haveContacts) {

	            allowNext = true;

	            buttons.push({
	                "label": l[556],
	                "key": "next",

	                "defaultClassname": "link-button lato right",
	                "className": !allowNext ? "disabled" : null,
	                "iconAfter": "small-icon grey-right-arrow",
	                "onClick": function onClick(e) {
	                    e.preventDefault();
	                    e.stopPropagation();
	                    self.setState({ 'step': 1 });
	                }
	            });

	            buttons.push({
	                "label": self.props.cancelLabel,
	                "key": "cancel",
	                "defaultClassname": "link-button lato left",
	                "onClick": function onClick(e) {
	                    self.props.onClose(self);
	                    e.preventDefault();
	                    e.stopPropagation();
	                }
	            });
	        } else if (self.state.step === 1) {
	            allowNext = self.state.createChatLink ? !failedToEnableChatlink : true;

	            contacts = [];
	            self.state.selected.forEach(function (h) {
	                M.u[h] && contacts.push(M.u[h]);
	            });

	            buttons.push({
	                "label": l[726],
	                "key": "done",
	                "defaultClassname": "default-grey-button lato right",
	                "className": !allowNext ? "disabled" : null,
	                "onClick": function onClick(e) {
	                    if (self.state.createChatLink === true && !self.state.groupName) {
	                        self.setState({ 'failedToEnableChatlink': true });
	                    } else {
	                        self.onFinalizeClick(e);
	                    }
	                }
	            });

	            if (!haveContacts || this.props.flowType === 2) {
	                buttons.push({
	                    "label": self.props.cancelLabel,
	                    "key": "cancel",
	                    "defaultClassname": "link-button lato left",
	                    "onClick": function onClick(e) {
	                        self.props.onClose(self);
	                        e.preventDefault();
	                        e.stopPropagation();
	                    }
	                });
	            } else {
	                buttons.push({
	                    "label": l[822],
	                    "key": "back",
	                    "defaultClassname": "button link-button lato left",
	                    "iconBefore": "small-icon grey-left-arrow",
	                    "onClick": function onClick(e) {
	                        e.preventDefault();
	                        e.stopPropagation();
	                        self.setState({ 'step': 0 });
	                    }
	                });
	            }
	        }

	        var chatInfoElements;
	        if (self.state.step === 1) {
	            var checkboxClassName = self.state.createChatLink ? "checkboxOn" : "checkboxOff";

	            if (failedToEnableChatlink && self.state.createChatLink) {
	                checkboxClassName += " intermediate-state";
	            }
	            if (self.state.keyRotation) {
	                checkboxClassName = "checkboxOff";
	            }

	            chatInfoElements = React.makeElement(
	                "div",
	                null,
	                React.makeElement(
	                    "div",
	                    { className: "contacts-search-header left-aligned top-pad" + (failedToEnableChatlink ? " failed" : "") },
	                    React.makeElement("i", { className: "small-icon conversations" }),
	                    React.makeElement("input", { type: "search",
	                        placeholder: "Enter group name", value: self.state.groupName,
	                        onKeyDown: function onKeyDown(e) {
	                            var code = e.which || e.keyCode;
	                            if (allowNext && code === 13) {
	                                if (self.state.step === 1) {
	                                    self.onFinalizeClick();
	                                }
	                            }
	                        },
	                        onChange: function onChange(e) {
	                            self.setState({
	                                'groupName': e.target.value,
	                                'failedToEnableChatlink': false
	                            });
	                        } })
	                ),
	                this.props.flowType !== 2 ? React.makeElement(
	                    "div",
	                    { className: "group-chat-dialog content" },
	                    React.makeElement(MiniUI.ToggleCheckbox, { className: "right", checked: self.state.keyRotation, onToggle: function onToggle(v) {
	                            self.setState({ 'keyRotation': v });
	                        } }),
	                    React.makeElement(
	                        "div",
	                        { className: "group-chat-dialog header" },
	                        !self.state.keyRotation ? l[20576] : l[20631]
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "group-chat-dialog description" },
	                        l[20484]
	                    ),
	                    React.makeElement(
	                        "div",
	                        { className: "group-chat-dialog checkbox " + (self.state.keyRotation ? "disabled" : "") + (failedToEnableChatlink ? " failed" : ""), onClick: SoonFc(function (e) {

	                                self.setState({ 'createChatLink': !self.state.createChatLink });
	                            }, 75) },
	                        React.makeElement(
	                            "div",
	                            { className: "checkdiv " + checkboxClassName },
	                            React.makeElement("input", { type: "checkbox",
	                                name: "group-encryption",
	                                id: "group-encryption",
	                                className: "checkboxOn hidden" })
	                        ),
	                        React.makeElement(
	                            "label",
	                            { htmlFor: "group-encryption", className: "radio-txt lato mid" },
	                            l[20575]
	                        ),
	                        React.makeElement("div", { className: "clear" })
	                    )
	                ) : null,
	                failedToEnableChatlink ? React.makeElement(
	                    "div",
	                    { className: "group-chat-dialog description chatlinks-intermediate-msg" },
	                    l[20573]
	                ) : null
	            );
	        }

	        return React.makeElement(
	            ModalDialogsUI.ModalDialog,
	            {
	                step: self.state.step,
	                title: l[19483],
	                className: classes,
	                selected: self.state.selected,
	                onClose: function onClose() {
	                    self.props.onClose(self);
	                },
	                triggerResizeOnUpdate: true,
	                buttons: buttons },
	            chatInfoElements,
	            React.makeElement(ContactsUI.ContactPickerWidget, {
	                changedHashProp: self.state.step,
	                megaChat: self.props.megaChat,
	                contacts: contacts,
	                exclude: self.props.exclude,
	                selectableContacts: "true",
	                onSelectDone: self.props.onSelectClicked,
	                onSelected: self.onSelected,
	                selected: self.state.selected,
	                headerClasses: "left-aligned",
	                multiple: true,
	                readOnly: self.state.step !== 0,
	                allowEmpty: true,
	                showMeAsSelected: self.state.step === 1
	            })
	        );
	    }
	});

	module.exports = {
	    StartGroupChatWizard: StartGroupChatWizard
	};

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var React = __webpack_require__(2);
	var ReactDOM = __webpack_require__(3);
	var MegaRenderMixin = __webpack_require__(6).MegaRenderMixin;

	var ToggleCheckbox = React.createClass({
	    displayName: "ToggleCheckbox",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            value: this.props.value
	        };
	    },
	    onToggle: function onToggle() {
	        var newState = !this.state.value;
	        this.setState({ 'value': newState });
	        if (this.props.onToggle) {
	            this.props.onToggle(newState);
	        }
	    },
	    render: function render() {
	        var self = this;

	        return React.makeElement(
	            "div",
	            { className: "toggle-checkbox " + (self.state.value ? " checked " : "") + self.props.className,
	                onClick: function onClick(e) {
	                    self.onToggle();
	                } },
	            React.makeElement(
	                "div",
	                { className: "toggle-checkbox-wrap" },
	                React.makeElement("div", { className: "toggle-checkbox-button" })
	            )
	        );
	    }
	});

	var Checkbox = React.createClass({
	    displayName: "Checkbox",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            value: this.props.value
	        };
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $node = self.findDOMNode();
	        uiCheckboxes($node, false, function (newState) {
	            self.setState({ 'value': newState });
	            self.props.onToggle && self.props.onToggle(newState);
	        }, !!self.props.value);
	    },

	    render: function render() {
	        var extraClasses = "";
	        if (this.props.disabled) {
	            extraClasses += " disabled";
	        }
	        return React.makeElement(
	            "div",
	            { className: this.props.className + " checkbox" + extraClasses },
	            React.makeElement(
	                "div",
	                { className: "checkdiv checkboxOn" },
	                React.makeElement("input", { type: "checkbox", name: this.props.name, id: this.props.name, className: "checkboxOn",
	                    checked: "" })
	            ),
	            React.makeElement(
	                "label",
	                { htmlFor: this.props.name, className: "radio-txt lato mid" },
	                this.props.label
	            ),
	            React.makeElement("div", { className: "clear" })
	        );
	    }
	});

	var IntermediateCheckbox = React.createClass({
	    displayName: "IntermediateCheckbox",

	    mixins: [MegaRenderMixin],
	    getInitialState: function getInitialState() {
	        return {
	            value: this.props.value
	        };
	    },
	    componentDidMount: function componentDidMount() {
	        var self = this;
	        var $node = self.findDOMNode();
	        uiCheckboxes($node, false, function (newState) {
	            self.setState({ 'value': newState });
	            self.props.onToggle && self.props.onToggle(newState);
	        }, !!self.props.value);
	    },

	    render: function render() {
	        var extraClasses = "";
	        if (this.props.disabled) {
	            extraClasses += " disabled";
	        }
	        return React.makeElement(
	            "div",
	            { className: this.props.className + " checkbox" + extraClasses },
	            React.makeElement(
	                "div",
	                { className: "checkdiv checkboxOn" },
	                React.makeElement("input", { type: "checkbox", name: this.props.name, id: this.props.name, className: "checkboxOn",
	                    checked: "" })
	            ),
	            React.makeElement(
	                "label",
	                { htmlFor: this.props.name, className: "radio-txt lato mid" },
	                this.props.label
	            ),
	            React.makeElement("div", { className: "clear" }),
	            this.props.intermediate ? React.makeElement(
	                "div",
	                { className: "intermediate-state" },
	                this.props.intermediateMessage
	            ) : null,
	            React.makeElement("div", { className: "clear" })
	        );
	    }
	});
	module.exports = {
	    ToggleCheckbox: ToggleCheckbox,
	    Checkbox: Checkbox,
	    IntermediateCheckbox: IntermediateCheckbox
	};

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var utils = __webpack_require__(42);
	var React = __webpack_require__(2);
	var ConversationPanelUI = __webpack_require__(12);

	var ChatRoom = function ChatRoom(megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI, publicChatHandle, publicChatKey, ck) {
	    var self = this;

	    this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);

	    this.megaChat = megaChat;

	    MegaDataObject.attachToExistingJSObject(this, {
	        state: null,
	        users: [],
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
	        membersSet: false,
	        membersLoaded: false,
	        topic: "",
	        flags: 0x00,
	        publicLink: null,
	        archivedSelected: false,
	        callParticipants: false,
	        observers: 0
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
	    this.publicChatHandle = publicChatHandle;
	    this.publicChatKey = publicChatKey;
	    this.ck = ck;

	    this.scrolledToBottom = 1;

	    this.callRequest = null;
	    this.callIsActive = false;
	    this.shownMessages = {};

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
	        this.rebind('onStateChange.chatRoomDebug', function (e, oldState, newState) {
	            self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));
	        });
	    }

	    self.rebind('onStateChange.chatRoom', function (e, oldState, newState) {
	        if (newState === ChatRoom.STATE.READY && !self.isReadOnly()) {
	            var cd = self.megaChat.plugins.chatdIntegration.chatd;
	            if (self.chatIdBin && cd && cd.chatIdMessages[self.chatIdBin]) {
	                var cid = cd.chatIdMessages[self.chatIdBin];
	                if (cd.chatIdShard[self.chatIdBin].isOnline()) {

	                    cd.chatIdMessages[self.chatIdBin].resend();
	                }
	            }
	        }
	    });

	    self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
	        if (anonymouschat) {
	            return;
	        }

	        var ts = msg.delay ? msg.delay : msg.ts;
	        if (!ts) {
	            return;
	        }

	        var contactForMessage = msg && Message.getContactForMessage(msg);
	        if (contactForMessage && contactForMessage.u !== u_handle) {
	            if (!contactForMessage.ats || contactForMessage.ats < ts) {
	                contactForMessage.ats = ts;
	            }
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
	        } else if (self.type === "group" || self.type === "public") {
	            var contactHash;
	            if (msg.authorContact) {
	                contactHash = msg.authorContact.u;
	            } else if (msg.userId) {
	                contactHash = msg.userId;
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
	            if (eventData.priv === 255 || eventData.priv === -1) {
	                if (self.state === ChatRoom.STATE.JOINING) {
	                    self.setState(ChatRoom.STATE.LEFT);
	                }
	            } else {
	                if (self.state === ChatRoom.STATE.JOINING) {
	                    self.setState(ChatRoom.STATE.READY);
	                }
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

	    if (this.type === "public" && self.megaChat.publicChatKeys[self.chatId]) {
	        self.publicChatKey = self.megaChat.publicChatKeys[self.chatId];
	    }

	    $(window).rebind("focus." + self.roomId, function () {
	        if (self.isCurrentlyActive) {
	            self.trigger("onChatShown");
	        }
	    });

	    self.megaChat.rebind("onRoomDestroy." + self.roomId, function (e, room) {
	        if (room.roomId == self.roomId) {
	            $(window).off("focus." + self.roomId);
	        }
	    });

	    self.rebind('onCallParticipantsUpdated.chatRoom', function (e, userid, clientid, participants) {
	        if (participants) {
	            self.callParticipants = participants;
	        } else if (!userid && !clientid && !participants) {
	            self.callParticipants = {};
	        }

	        self.callParticipantsUpdated();
	    });

	    self.rebind('onClientLeftCall.chatRoom', self.callParticipantsUpdated.bind(self));
	    self.rebind('onClientJoinedCall.chatRoom', self.callParticipantsUpdated.bind(self));

	    this.membersSetFromApi = new ChatRoom.MembersSet(this);

	    if (publicChatHandle) {
	        this.onPublicChatRoomInitialized();
	    }
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
	ChatRoom.ANONYMOUS_PARTICIPANT = 'gTxFhlOd_LQ';
	ChatRoom.ARCHIVED = 0x01;

	ChatRoom.MembersSet = function (chatRoom) {
	    this.chatRoom = chatRoom;
	    this.members = {};
	};

	ChatRoom.MembersSet.PRIVILEGE_STATE = {
	    'NOT_AVAILABLE': -5,
	    'FULL': 3,
	    'OPERATOR': 2,
	    'READONLY': 0,
	    'LEFT': -1
	};

	ChatRoom.MembersSet.prototype.trackFromActionPacket = function (ap, isMcf) {
	    var self = this;

	    var apMembers = {};
	    (ap.u || []).forEach(function (r) {
	        apMembers[r.u] = r.p;
	    });

	    Object.keys(self.members).forEach(function (u_h) {
	        if (typeof apMembers[u_h] === 'undefined') {
	            self.remove(u_h);
	        } else if (apMembers[u_h] !== self.members[u_h]) {
	            self.update(u_h, apMembers[u_h]);
	        }
	    });

	    Object.keys(apMembers).forEach(function (u_h) {
	        if (typeof self.members[u_h] === 'undefined') {
	            var priv2 = apMembers[u_h];
	            !isMcf ? self.add(u_h, priv2) : self.init(u_h, priv2);
	        } else if (apMembers[u_h] !== self.members[u_h]) {
	            self.update(u_h, apMembers[u_h]);
	        }
	    });
	};

	ChatRoom.MembersSet.prototype.init = function (handle, privilege) {
	    this.members[handle] = privilege;
	    this.chatRoom.trackDataChange();
	};

	ChatRoom.MembersSet.prototype.update = function (handle, privilege) {
	    this.members[handle] = privilege;
	    this.chatRoom.trackDataChange();
	};

	ChatRoom.MembersSet.prototype.add = function (handle, privilege) {
	    this.members[handle] = privilege;
	    if (handle === u_handle) {
	        this.chatRoom.trigger('onMeJoined');
	    }
	    this.chatRoom.trackDataChange();
	};

	ChatRoom.MembersSet.prototype.remove = function (handle) {
	    delete this.members[handle];
	    if (handle === u_handle) {
	        this.chatRoom.trigger('onMeLeft');
	    }
	    this.chatRoom.trackDataChange();
	};

	ChatRoom.prototype.trackMemberUpdatesFromActionPacket = function (ap, isMcf) {
	    if (!ap.u) {
	        return;
	    }

	    if (this.membersSetFromApi) {
	        this.membersSetFromApi.trackFromActionPacket(ap, isMcf);
	    }
	};

	ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function (timeout) {
	    'use strict';

	    var self = this;
	    var anonId = "";
	    var $promise = new MegaPromise();

	    if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
	        anonId = self.megaChat.rtc.ownAnonId;
	    }

	    M.xhr({
	        timeout: timeout || 10000,
	        url: "https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId
	    }).then(function (ev, r) {
	        r = JSON.parse(r);
	        if (r.turn && r.turn.length > 0) {
	            var servers = [];
	            r.turn.forEach(function (v) {
	                var transport = v.transport || 'udp';

	                servers.push({
	                    urls: 'turn:' + v.host + ':' + v.port + '?transport=' + transport,
	                    username: "inoo20jdnH",
	                    credential: '02nNKDBkkS'
	                });
	            });
	            self.megaChat.rtc.updateIceServers(servers);
	        }

	        $promise.resolve();
	    }).catch(function () {
	        $promise.reject.apply($promise, arguments);
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
	                'ck': self.ck ? self.ck : null,
	                'f': self.flags,
	                'm': self.type === "public" ? 1 : 0
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
	    var index = $.inArray(u_handle, handlesWithoutMyself);
	    if (index >= 0) {
	        handlesWithoutMyself.splice($.inArray(u_handle, handlesWithoutMyself), 1);
	    }
	    return handlesWithoutMyself;
	};

	ChatRoom.prototype.getRoomTitle = function (ignoreTopic, encapsTopicInQuotes) {
	    var self = this;

	    if (self.type === "private") {
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

	ChatRoom.prototype.setRoomTitle = function (newTopic, allowEmpty) {
	    var self = this;
	    newTopic = allowEmpty ? newTopic : String(newTopic);
	    var masterPromise = new MegaPromise();

	    if ((allowEmpty || $.trim(newTopic).length > 0) && newTopic !== self.getRoomTitle()) {
	        self.scrolledToBottom = true;

	        var participants = self.protocolHandler.getTrackedParticipants();
	        var promises = [];
	        promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));
	        var _runUpdateTopic = function _runUpdateTopic() {

	            var topic = self.protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, self.type === "public");

	            if (topic) {
	                masterPromise.linkDoneAndFailTo(asyncApiReq({
	                    "a": "mcst",
	                    "id": self.chatId,
	                    "ct": base64urlencode(topic),
	                    "v": Chatd.VERSION
	                }));
	            } else {
	                masterPromise.reject();
	            }
	        };
	        MegaPromise.allDone(promises).done(function () {
	            _runUpdateTopic();
	        });
	        return masterPromise;
	    } else {
	        return false;
	    }
	};

	ChatRoom.prototype.leave = function (triggerLeaveRequest) {
	    var self = this;

	    self._leaving = true;
	    self._closing = triggerLeaveRequest;
	    self.topic = null;

	    if (triggerLeaveRequest) {
	        if (self.type === "group" || self.type === "public") {
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
	    } else if (self.type === "public" && self.publicChatHandle) {
	        if (typeof self.members[u_handle] === 'undefined') {
	            self.megaChat.plugins.chatdIntegration.handleLeave(self);
	        }
	    }

	    if (self.isCurrentlyActive) {
	        self.isCurrentlyActive = false;
	    }

	    Soon(function () {
	        mc.chats.remove(roomJid);

	        if (!noRedirect && u_type === 3) {
	            loadSubPage('fm/chat');
	        }
	    });
	};

	ChatRoom.prototype.updatePublicHandle = function (d, callback) {
	    var self = this;

	    return megaChat.plugins.chatdIntegration.updateChatPublicHandle(self.chatId, d, callback);
	};

	ChatRoom.prototype.joinViaPublicHandle = function () {
	    var self = this;

	    if ((!self.members.hasOwnProperty(u_handle) || self.members[u_handle] === -1) && self.type === "public" && self.publicChatHandle) {
	        return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
	    }
	};

	ChatRoom.prototype.switchOffPublicMode = function () {
	    var self = this;
	    var participants = self.protocolHandler.getTrackedParticipants();
	    var promises = [];
	    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));
	    var onSwitchDone = function onSwitchDone() {
	        self.protocolHandler.switchOffOpenMode();
	    };

	    var _runSwitchOffPublicMode = function _runSwitchOffPublicMode() {

	        var topic = null;
	        if (self.topic) {
	            topic = self.protocolHandler.embeddedEncryptTo(self.topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, true, false);
	            topic = base64urlencode(topic);

	            asyncApiReq({
	                a: 'mcscm',
	                id: self.chatId,
	                ct: topic,
	                v: Chatd.VERSION
	            }).done(onSwitchDone);
	        } else {
	            asyncApiReq({
	                a: 'mcscm',
	                id: self.chatId,
	                v: Chatd.VERSION
	            }).done(onSwitchDone);
	        }
	    };
	    MegaPromise.allDone(promises).done(function () {
	        _runSwitchOffPublicMode();
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
	    self.megaChat.setAttachments(self.roomId);

	    self.trigger('activity');
	    self.trigger('onChatShown');

	    if (self.type !== 'public') {
	        $('.section.conversations').addClass('privatechat');
	    } else {
	        $('.section.conversations').removeClass('privatechat');
	    }
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
	            return "fm/chat/p/" + contact.u;
	        }
	    } else if (self.type === "public" && self.publicChatHandle && self.publicChatKey) {
	        return "chat/" + self.publicChatHandle + "#" + self.publicChatKey;
	    } else if (self.type === "public" && !self.publicChatHandle) {
	        return "fm/chat/c/" + self.roomId;
	    } else if (self.type === "group" || self.type === "public") {
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

	    if (self.type === "public") {
	        nodeids.forEach(function (nodeId) {
	            promises.push(asyncApiReq({ 'a': 'mcga', 'n': nodeId, 'u': strongvelope.COMMANDER, 'id': self.chatId, 'v': Chatd.VERSION }));
	        });
	    } else {
	        users.forEach(function (uh) {
	            nodeids.forEach(function (nodeId) {
	                promises.push(asyncApiReq({ 'a': 'mcga', 'n': nodeId, 'u': uh, 'id': self.chatId, 'v': Chatd.VERSION }));
	            });
	        });
	    }

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

	        if (M.d[nodeId] && M.d[nodeId].u !== u_handle) {

	            self.megaChat.getMyChatFilesFolder().then(function (myChatFilesFolderHandle) {
	                M.copyNodes([nodeId], myChatFilesFolderHandle, false, new MegaPromise()).then(function (copyNodesResponse) {
	                    if (copyNodesResponse && copyNodesResponse[0]) {
	                        proxyPromise.linkDoneAndFailTo(self.attachNodes([copyNodesResponse[0]]));
	                    } else {
	                        proxyPromise.reject();
	                    }
	                }).catch(function (err) {
	                    proxyPromise.reject(err);
	                });
	            }).catch(function (err) {
	                proxyPromise.reject(err);
	            });
	        } else {
	            self._sendNodes([nodeId], users).then(function () {
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
	            }).catch(function (r) {
	                proxyPromise.reject(r);
	            });
	        }
	        waitingPromises.push(proxyPromise);
	    });

	    $masterPromise.linkDoneAndFailTo(MegaPromise.allDone(waitingPromises));

	    return $masterPromise;
	};

	ChatRoom.prototype.onUploadStart = function (data) {
	    var self = this;

	    if (d) {
	        self.logger.debug('onUploadStart', data);
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

	ChatRoom.prototype.joinCall = function () {
	    var self = this;
	    assert(self.type === "group" || self.type === "public", "Can't join non-group chat call.");

	    if (self.megaChat.activeCallManagerCall) {
	        self.megaChat.activeCallManagerCall.endCall();
	    }

	    return self.megaChat.plugins.callManager.joinCall(self, { audio: true, video: false });
	};

	ChatRoom.prototype.startVideoCall = function () {
	    var self = this;
	    return self.megaChat.plugins.callManager.startCall(self, { audio: true, video: true });
	};

	ChatRoom.prototype.stateIsLeftOrLeaving = function () {
	    return this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.READY && this.membersSetFromApi && !this.membersSetFromApi.members.hasOwnProperty(u_handle);
	};

	ChatRoom.prototype._clearChatMessagesFromChatd = function () {
	    megaChat.plugins.chatdIntegration.chatd.shards[0].retention(base64urldecode(this.chatId), 1);
	};

	ChatRoom.prototype.isReadOnly = function () {

	    if (this.type === "private") {
	        var members = this.getParticipantsExceptMe();
	        if (members[0] && !M.u[members[0]].c) {
	            return true;
	        }
	    }

	    return this.members && this.members[u_handle] <= 0 || !this.members.hasOwnProperty(u_handle) || this.privateReadOnlyChat || this.state === ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.LEFT;
	};
	ChatRoom.prototype.iAmOperator = function () {
	    return this.type === "private" || this.members && this.members[u_handle] === 3;
	};

	ChatRoom.prototype.didInteraction = function (user_handle, ts) {
	    var self = this;
	    var newTs = ts || unixtime();

	    if (user_handle === u_handle) {
	        Object.keys(self.members).forEach(function (user_handle) {
	            var contact = M.u[user_handle];
	            if (contact && user_handle !== u_handle) {
	                setLastInteractionWith(contact.u, "1:" + newTs);
	            }
	        });
	    } else {
	        var contact = M.u[user_handle];
	        if (contact && user_handle !== u_handle) {
	            setLastInteractionWith(contact.u, "1:" + newTs);
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

	ChatRoom.prototype.getTotalCallSessionCount = function () {
	    var self = this;
	    if (!self.callParticipants || !Object.keys(self.callParticipants).length) {
	        return 0;
	    }
	    var count = 0;
	    Object.keys(self.callParticipants).forEach(function (k) {
	        if (!self.callParticipants[k]) {
	            return;
	        }
	        var currentCount = Object.keys(self.callParticipants[k]);
	        count += currentCount.length || 0;
	    });
	    return count;
	};

	ChatRoom.prototype.haveActiveCall = function () {
	    return this.callManagerCall && this.callManagerCall.isActive() === true;
	};

	ChatRoom.prototype.havePendingGroupCall = function () {
	    var self = this;
	    if ((self.type === "group" || self.type === "public") && self.callManagerCall && (self.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || self.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING) && self.callParticipants && Object.keys(self.callParticipants).length > 0) {
	        return true;
	    } else if (!self.callManagerCall && self.callParticipants && Object.keys(self.callParticipants).length > 0) {
	        return true;
	    } else {
	        return false;
	    }
	};

	ChatRoom.prototype.havePendingCall = function () {
	    var self = this;
	    if (self.callManagerCall && (self.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || self.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING)) {
	        return true;
	    } else if (self.type === "group" || self.type === "public") {
	        return self.havePendingGroupCall();
	    } else {
	        return false;
	    }
	};

	ChatRoom.prototype.getActiveCallMessageId = function (ignoreActive) {
	    var self = this;
	    if (!ignoreActive && !self.havePendingCall() && !self.haveActiveCall()) {
	        return false;
	    }

	    var msgs = self.messagesBuff.messages;
	    for (var i = msgs.length - 1; i >= 0; i--) {
	        var msg = msgs.getItem(i);
	        if (msg.dialogType === "remoteCallEnded") {

	            return false;
	        }
	        if (msg.dialogType === "remoteCallStarted") {
	            return msg.messageId;
	        }
	    }
	};

	ChatRoom.prototype.callParticipantsUpdated = function () {
	    var self = this;
	    var msgId = self.getActiveCallMessageId();
	    if (!msgId) {

	        msgId = self.getActiveCallMessageId(true);
	    }

	    var callParts = Object.keys(self.callParticipants);
	    var uniqueCallParts = {};
	    callParts.forEach(function (handleAndSid) {
	        var handle = base64urlencode(handleAndSid.substr(0, 8));
	        uniqueCallParts[handle] = 1;
	    });
	    self.uniqueCallParts = uniqueCallParts;

	    var msg = self.messagesBuff.getMessageById(msgId);
	    msg && msg.wrappedChatDialogMessage && msg.wrappedChatDialogMessage.trackDataChange();

	    self.trackDataChange();
	};

	ChatRoom.prototype.onPublicChatRoomInitialized = function () {
	    var self = this;
	    var autoLoginChatInfo = typeof localStorage.autoJoinOnLoginChat !== "undefined" ? JSON.parse(localStorage.autoJoinOnLoginChat) : false;

	    if (self.type === "public" && autoLoginChatInfo && autoLoginChatInfo[0] === self.publicChatHandle) {

	        if (unixtime() - 2 * 60 * 60 < autoLoginChatInfo[1]) {
	            var doJoinEventually = function doJoinEventually(state) {
	                if (state === ChatRoom.STATE.READY) {
	                    self.joinViaPublicHandle();
	                    localStorage.removeItem("autoJoinOnLoginChat");
	                    self.unbind('onStateChange.' + self.publicChatHandle);
	                }
	            };

	            doJoinEventually(self.state);

	            self.rebind('onStateChange.' + self.publicChatHandle, function (e, oldState, newState) {
	                doJoinEventually(newState);
	            });
	        } else {

	            localStorage.removeItem("autoJoinOnLoginChat");
	        }
	    }
	};

	window.ChatRoom = ChatRoom;
	module.exports = ChatRoom;

/***/ }),
/* 42 */
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