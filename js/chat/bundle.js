/** @file automatically generated, do not edit it. */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 662:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";

// UNUSED EXPORTS: default

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: external "ReactDOM"
var external_ReactDOM_ = __webpack_require__(533);
var external_ReactDOM_default = __webpack_require__.n(external_ReactDOM_);
// EXTERNAL MODULE: ./js/chat/ui/conversations.jsx + 23 modules
var conversations = __webpack_require__(592);
;// CONCATENATED MODULE: ./js/chat/chatRouting.jsx
class ChatRouting {
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

    let megaChat = this.megaChat;

    if (isLandingPage) {
      megaChat.eventuallyInitMeetingUI();
    }

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
    megaChat.routingSection = null;
    megaChat.routingSubSection = null;
    megaChat.routingParams = null;

    if (sectionName === 'c' || sectionName === 'g' || sectionName === 'p') {
      this.megaChat.routingSection = 'chat';
      [resolve, location] = this.routeChat(resolve, reject, location, sectionName, args);
    } else if (sectionName === "new_meeting") {
      megaChat.trigger('onStartNewMeeting');
      loadSubPage("/fm/chat");
      return;
    } else if (!sectionName) {
      this.megaChat.routingSection = 'chat';
      megaChat.onChatsHistoryReady(15e3).then(() => {
        return page === location ? megaChat.renderListing() : EACCESS;
      }).then(resolve).catch(reject);
      resolve = null;
    } else if (sectionName === 'contacts') {
      this.openCustomView(sectionName);

      if (args[1] === "received" || args[1] === "sent") {
        megaChat.routingSubSection = args[1];
      }

      if (args[1] && args[1].length === 11) {
        megaChat.routingSubSection = "contact";
        megaChat.routingParams = args[1];
      }
    } else if (sectionName === 'archived') {
      this.openCustomView(sectionName);
    } else {
      let hasHashChar = sectionName.indexOf("#");

      if (hasHashChar > -1 && sectionName.substr(0, hasHashChar).length === 8) {
        [resolve, location] = this.routeChat(resolve, reject, location, sectionName, args);
      } else {
        this.openCustomView("notFound");
      }
    }

    if (resolve) {
      onIdle(resolve);
    }

    megaChat.safeForceUpdate();
    const method = page === 'chat' || page === 'fm/chat' || page === location || event && event.type === 'popstate' ? 'replaceState' : 'pushState';
    mBroadcaster.sendMessage('beforepagechange', location);
    M.currentdirid = String(page = location).replace('fm/', '');

    if (location.substr(0, 13) === "chat/contacts" || location.substr(0, 13) === "chat/archived") {
      location = "fm/" + location;
    }

    history[method]({
      subpage: location
    }, "", (hashLogic ? '#' : '/') + location);
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
    } else if (sectionName === 'p') {
      megaChat.smartOpenChat([u_handle, roomId], 'private', undefined, undefined, undefined, true).then(resolve).catch(reject);
      resolve = null;
    } else {
      let done = resolve;
      megaChat.plugins.chatdIntegration.openChat(roomId).then(chatId => {
        megaChat.getChatById(chatId).show();
        done(chatId);
      }).catch(ex => {
        if (d && ex !== ENOENT) {
          console.warn('If "%s" is a chat, something went wrong..', roomId, ex);
        }

        if (ex === ENOENT && megaChat.publicChatKeys[roomId]) {
          msgDialog('warninga', l[20641], l[20642], 0, () => {
            loadSubPage(is_chatlink ? 'start' : 'fm/chat', event);
          });
        } else {
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

  initFmAndChat(targetChatId) {
    assert(!fminitialized);
    return new Promise((res, rej) => {
      M.currentdirid = targetChatId ? "fm/chat/" + targetChatId : undefined;
      loadSubPage('fm');
      mBroadcaster.once('chat_initialized', () => {
        authring.onAuthringReady().then(res, rej);
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
      this.initFmAndChat(chatId).always(() => {
        megaChat.initialPubChatHandle = publicChatHandle;
        megaChat.initialChatId = chatId;
        megaChat.meetingDialogClosed = meetingDialogClosed;

        const next = () => {
          mBroadcaster.once('pagechange', () => {
            onIdle(() => {
              loadingDialog.phide();
              megaChat.renderListing(chatUrl, true).catch(ex => {
                console.error("Failed to megaChat.renderListing:", ex);
                reject(ex);
              }).always(() => {
                megaChat.updateKeysInProtocolHandlers();
                const chatRoom = megaChat.getChatById(chatId);
                assert(chatRoom);

                if (chatRoom.state === ChatRoom.STATE.READY) {
                  resolve(chatRoom);
                } else {
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
          cbBeforeOpen().then(next, ex => {
            console.error("Failed to execute `cbBeforeOpen`, got a reject of the returned promise:", ex);
          });
        } else {
          next();
        }
      }).catch(ex => reject(ex));
    });
  }

  reinitAndJoinPublicChat(chatId, initialPubChatHandle, publicChatKey) {
    initialPubChatHandle = initialPubChatHandle || megaChat.initialPubChatHandle;
    const meetingDialogClosed = megaChat.meetingDialogClosed;
    megaChat.destroy();
    is_chatlink = false;
    loadingDialog.pshow();
    return new Promise((res, rej) => {
      this.initFmAndChat(chatId).then(() => {
        megaChat.initialPubChatHandle = initialPubChatHandle;
        megaChat.initialChatId = chatId;
        megaChat.meetingDialogClosed = meetingDialogClosed;
        const mciphReq = megaChat.plugins.chatdIntegration.getMciphReqFromHandleAndKey(initialPubChatHandle, publicChatKey);

        const isReady = chatRoom => {
          if (chatRoom.state === ChatRoom.STATE.READY) {
            res(chatRoom);
            loadingDialog.phide();
          } else {
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
          const existingRoom = megaChat.getChatById(chatId);

          if (!existingRoom) {
            megaChat.rebind('onRoomInitialized.reinitAndJoinPublicChat', (e, megaRoom) => {
              if (megaRoom.chatId === chatId) {
                megaRoom.setActive();
                isReady(megaRoom);
                megaChat.unbind('onRoomInitialized.reinitAndJoinPublicChat');
              }
            });
          } else {
            existingRoom.setActive();
            isReady(existingRoom);
          }
        };

        join();
        M.req(mciphReq).then(() => {
          join();
        }).catch(ex => {
          if (ex === -12) {
            join();
          } else {
            loadingDialog.phide();
            console.error("Bad response for mciphReq:", mciphReq, ex);
            rej(ex);
          }
        });
      });
    });
  }

}
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
;// CONCATENATED MODULE: ./js/chat/chat.jsx




__webpack_require__(62);

__webpack_require__(778);

__webpack_require__(336);



const EMOJI_DATASET_VERSION = 4;
const CHAT_ONHISTDECR_RECNT = "onHistoryDecrypted.recent";
const LOAD_ORIGINALS = {
  'image/gif': 25e6,
  'image/png': 2e5,
  'image/webp': 2e5
};
var megaChatInstanceId = 0;
var CHATUIFLAGS_MAPPING = {
  'convPanelCollapse': 'cPC'
};

function Chat() {
  var self = this;
  this.is_initialized = false;
  this.logger = MegaLogger.getLogger("chat");
  this.mbListeners = [];
  this.chats = new MegaDataMap();
  this.chatUIFlags = new MegaDataMap();
  this.initChatUIFlagsManagement();
  this.currentlyOpenedChat = null;
  this.lastOpenedChat = null;
  this.archivedChatsCount = 0;
  this.FORCE_EMAIL_LOADING = localStorage.fel;
  this._imageLoadCache = Object.create(null);
  this._imagesToBeLoaded = Object.create(null);
  this._imageAttributeCache = Object.create(null);
  this._queuedMccPackets = [];
  this._queuedMessageUpdates = [];
  this._queuedChatRoomEvents = {};
  this.handleToId = Object.create(null);
  this.publicChatKeys = Object.create(null);
  this.options = {
    'delaySendMessageIfRoomNotAvailableTimeout': 3000,
    filePickerOptions: {},
    'plugins': {
      'chatdIntegration': ChatdIntegration,
      'callManager2': CallManager2,
      'urlFilter': UrlFilter,
      'emoticonShortcutsFilter': EmoticonShortcutsFilter,
      'emoticonsFilter': EmoticonsFilter,
      'callFeedback': CallFeedback,
      'presencedIntegration': PresencedIntegration,
      'persistedTypeArea': PersistedTypeArea,
      'btRtfFilter': BacktickRtfFilter,
      'rtfFilter': RtfFilter,
      'richpreviewsFilter': RichpreviewsFilter,
      'chatToastIntegration': ChatToastIntegration,
      'chatStats': ChatStats,
      'geoLocationLinks': GeoLocationLinks
    },
    'chatNotificationOptions': {
      'textMessages': {
        'incoming-chat-message': {
          title: l.notif_title_incoming_msg,
          'icon': function (notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function (notificationObj, params) {
            return l.notif_body_incoming_msg.replace('%s', params.from);
          }
        },
        'incoming-attachment': {
          title: l.notif_title_incoming_attch,
          'icon': function (notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function (notificationObj, params) {
            return mega.icu.format(l.notif_body_incoming_attch, params.attachmentsCount).replace('%s', params.from);
          }
        },
        'incoming-voice-video-call': {
          'title': l[17878] || "Incoming call",
          'icon': function (notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function (notificationObj, params) {
            return l[5893].replace('[X]', params.from);
          }
        },
        'call-terminated': {
          title: l.notif_title_call_term,
          'icon': function (notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function (notificationObj, params) {
            return l[5889].replace('[X]', params.from);
          }
        },
        'screen-share-error': {
          title: l.screenshare_failed_notif || 'You are no longer sharing your screen',
          icon: notificationObj => {
            return notificationObj.options.icon;
          },
          body: ''
        }
      },
      'sounds': ['alert_info_message', 'error_message', 'incoming_chat_message', 'incoming_contact_request', 'incoming_file_transfer', 'incoming_voice_video_call', 'hang_out', 'user_join_call', 'user_left_call', 'reconnecting', 'end_call']
    },
    'chatStoreOptions': {
      'autoPurgeMaxMessagesPerRoom': 1024
    }
  };
  this.instanceId = megaChatInstanceId++;
  this.plugins = {};
  self.filePicker = null;
  self._chatsAwaitingAps = {};
  MegaDataObject.call(this, {
    "currentlyOpenedChat": null,
    "displayArchivedChats": false,
    "activeCall": null,
    'routingSection': null,
    'routingSubSection': null,
    'routingParams': null
  });
  this.routing = new ChatRouting(this);
  Object.defineProperty(this, 'hasSupportForCalls', {
    get: function () {
      return typeof SfuClient !== 'undefined' && typeof TransformStream !== 'undefined' && window.RTCRtpSender && !!RTCRtpSender.prototype.createEncodedStreams;
    }
  });
  return this;
}

inherits(Chat, MegaDataObject);
Object.defineProperty(Chat, 'mcf', {
  value: Object.create(null)
});
Chat.prototype.init = promisify(function (resolve, reject) {
  var self = this;

  if (self.is_initialized) {
    self.destroy();
  }

  if (d) {
    console.time('megachat:plugins:init');
  }

  self.plugins = Object.create(null);
  self.plugins.chatNotifications = new ChatNotifications(self, self.options.chatNotificationOptions);
  self.plugins.chatNotifications.notifications.rebind('onAfterNotificationCreated.megaChat', function () {
    self.updateSectionUnreadCount();
  });
  Object.keys(self.options.plugins).forEach(plugin => {
    self.plugins[plugin] = new self.options.plugins[plugin](self);
  });

  if (d) {
    console.timeEnd('megachat:plugins:init');
  }

  var $body = $(document.body);
  $body.rebind('mousedown.megachat', '.top-user-status-popup .dropdown-item', function () {
    var presence = $(this).data("presence");
    self._myPresence = presence;
    var targetPresence = PresencedIntegration.cssClassToPresence(presence);
    self.plugins.presencedIntegration.setPresence(targetPresence);

    if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
      Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
        var v = self.plugins.chatdIntegration.chatd.shards[k];
        v.connectionRetryManager.requiresConnection();
      });
    }
  });
  self.$container = $('.fm-chat-block');

  if (!is_chatlink) {
    $('.activity-status-block, .activity-status').removeClass('hidden');
  }

  self.on('onRoomInitialized', function (e, room) {
    if (room.type === "private") {
      var c = M.u[room.getParticipantsExceptMe()[0]];

      if (c) {
        $('#contact_' + c.u + ' .start-chat-button').addClass("active");
      }
    }

    room.rebind("onChatShown.chatMainList", function () {
      $('.conversations-main-listing').addClass("hidden");
    });
    self.updateDashboard();
  });
  self.on('onRoomDestroy', function (e, room) {
    if (room.type === "private") {
      var c = M.u[room.getParticipantsExceptMe()[0]];

      if (c) {
        $('#contact_' + c.u + ' .start-chat-button').removeClass("active");
      }
    }
  });
  $body.rebind('mouseover.notsentindicator', '.tooltip-trigger', function () {
    var $this = $(this);
    var $notification = $('.tooltip.' + $this.attr('data-tooltip')).removeClass('hidden');
    var iconTopPos = $this.offset().top;
    var iconLeftPos = $this.offset().left;
    var notificatonHeight = $notification.outerHeight() + 10;
    var notificatonWidth = $notification.outerWidth() / 2 - 10;
    $notification.offset({
      top: iconTopPos - notificatonHeight,
      left: iconLeftPos - notificatonWidth
    });
  });
  $body.rebind('mouseout.notsentindicator click.notsentindicator', '.tooltip-trigger', function () {
    var $notification = $('.tooltip');
    $notification.addClass('hidden').removeAttr('style');
  });

  if (is_chatlink) {
    const {
      ph,
      key
    } = is_chatlink;
    Chat.mcf[ph] = key;
    this.publicChatKeys[ph] = key;
  }

  var promises = [];
  var rooms = Object.keys(Chat.mcf);

  for (var i = rooms.length; i--;) {
    if (!this.publicChatKeys[rooms[i]]) {
      promises.push(self.plugins.chatdIntegration.openChat(Chat.mcf[rooms[i]], true));
    }

    delete Chat.mcf[rooms[i]];
  }

  Promise.allSettled(promises).then(function (res) {
    const pub = Object.keys(self.publicChatKeys);
    return Promise.allSettled([res].concat(pub.map(pch => {
      return self.plugins.chatdIntegration.openChat(pch, true);
    })));
  }).then(function (res) {
    res = res[0].value.concat(res.slice(1));
    self.logger.info('chats settled...', res);

    if (is_mobile) {
      return;
    }

    self.$conversationsAppInstance = external_ReactDOM_default().render(self.$conversationsApp = external_React_default().createElement(conversations.Z.ConversationsApp, {
      megaChat: self,
      routingSection: self.routingSection,
      routingSubSection: self.routingSubSection,
      routingParams: self.routingParams
    }), self.domSectionNode = document.querySelector(!is_chatlink ? '.section.conversations' : '.chat-links-preview > .chat-app-container'));
    self.onChatsHistoryReady().then(() => {
      const room = self.getCurrentRoom();

      if (room) {
        room.scrollToChat();
      }

      return room;
    }).dump('on-chat-history-loaded');
    self.is_initialized = true;
    self.registerUploadListeners();
    self.trigger("onInit");
    mBroadcaster.sendMessage('chat_initialized');
    setInterval(self._syncDnd.bind(self), 60000);
    setInterval(self.removeMessagesByRetentionTime.bind(self, null), 20000);
    self.autoJoinIfNeeded();
    return true;
  }).then(resolve).catch(reject);
  const bpcListener = mBroadcaster.addListener("beforepagechange", page => {
    if (page.includes('chat') && page !== 'securechat') {
      return;
    }

    if (megaChat.routingSection) {
      var _this$$conversationsA;

      if (String(M.currentdirid).substr(0, 4) === "chat") {
        delete M.currentdirid;
      }

      megaChat.routingParams = megaChat.routingSection = megaChat.routingSubSection = null;
      (_this$$conversationsA = this.$conversationsAppInstance) == null ? void 0 : _this$$conversationsA.forceUpdate();
    }
  });
  this.mbListeners.push(bpcListener);
});

Chat.prototype._syncDnd = function () {
  const chats = this.chats;

  if (chats && chats.length > 0) {
    chats.forEach(({
      chatId
    }) => {
      const dnd = pushNotificationSettings.getDnd(chatId);

      if (dnd && dnd < unixtime()) {
        if (this.logger) {
          this.logger.debug(`Chat.prototype._syncDnd chatId=${chatId}`);
        }

        pushNotificationSettings.disableDnd(chatId);
      }
    });
  }
};

Chat.prototype.loadChatUIFlagsFromConfig = function (val) {
  var hadChanged = false;
  var flags = val || mega.config.get("cUIF");

  if (flags) {
    if (typeof flags !== 'object') {
      flags = {};
    }

    Object.keys(CHATUIFLAGS_MAPPING).forEach(k => {
      var v = flags[CHATUIFLAGS_MAPPING[k]];
      hadChanged = v !== undefined && this.chatUIFlags.set(k, v) !== false || hadChanged;
    });
  }

  return hadChanged;
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
  this.mbListeners.push(mBroadcaster.addListener('fmconfig:cUIF', tryCatch(v => {
    if (self.loadChatUIFlagsFromConfig(v)) {
      self.chatUIFlags.trackDataChange(0xDEAD);
    }
  })));
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

  var forEachChat = function (chats, callback) {
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

  var lookupPendingUpload = function (id) {
    console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');

    for (var uid in ulmanager.ulEventData) {
      if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
        return uid;
      }
    }
  };

  var unregisterListeners = function () {
    if (!$.len(ulmanager.ulEventData)) {
      self.unregisterUploadListeners();
    }
  };

  var onUploadComplete = function (ul) {
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

  var onUploadCompletion = function (uid, handle, faid, chat) {
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

  var onUploadError = function (uid, error) {
    var ul = ulmanager.ulEventData[uid];

    if (d) {
      logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
    }

    if (ul) {
      delete ulmanager.ulEventData[uid];
      unregisterListeners();
    }
  };

  var onAttributeReady = function (handle, fa) {
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

  var onAttributeError = function (faid, error, onStorageAPIError, nFAiled) {
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

  var registerLocalListeners = function () {
    self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
    self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
    self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
    self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
    self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
  };

  self._uplStart = mBroadcaster.addListener('upload:start', function (data) {
    if (d) {
      logger.info('onUploadStart', [data]);
    }

    var notify = function (room) {
      room.onUploadStart(data);
    };

    for (var k in data) {
      var chats = data[k].chat;

      if (chats && forEachChat(chats, notify) && !self._uplError) {
        registerLocalListeners();
      }
    }
  });
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
  self.haveAnyActiveCall() === false && self.chats.forEach(function (megaRoom) {
    if (megaRoom.state == ChatRoom.STATE.LEFT) {
      return;
    }

    if (megaRoom.isArchived()) {
      return;
    }

    var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
    unreadCount += c;

    if (!havePendingCall) {
      if (megaRoom.havePendingCall() && megaRoom.uniqueCallParts && !megaRoom.uniqueCallParts[u_handle]) {
        havePendingCall = true;
      }
    }
  });
  unreadCount = unreadCount > 9 ? "9+" : unreadCount;
  var haveContents = false;

  if (havePendingCall) {
    haveContents = true;
    $('.new-messages-indicator .chat-pending-call').removeClass('hidden');
    $('.new-messages-indicator .chat-pending-call').removeClass('call-exists');
  } else {
    $('.new-messages-indicator .chat-pending-call').addClass('hidden').removeClass("call-exists");
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
Chat.prototype.dropAllDatabases = promisify(function (resolve, reject) {
  const chatd = this.plugins.chatdIntegration.chatd || false;
  const promises = [];

  if (chatd.chatdPersist) {
    promises.push(chatd.chatdPersist.drop());
  }

  if (chatd.messagesQueueKvStorage) {
    promises.push(chatd.messagesQueueKvStorage.clear());
  }

  if (Reactions.hasOwnProperty('_db')) {
    promises.push(Reactions._db.clear());
  }

  Promise.allSettled(promises).then(resolve).catch(reject);
});

Chat.prototype.destroy = function (isLogout) {
  var self = this;

  if (self.is_initialized === false) {
    return;
  }

  self.isLoggingOut = isLogout;

  for (let i = 0; i < this.mbListeners.length; i++) {
    mBroadcaster.removeListener(this.mbListeners[i]);
  }

  if (self.rtc && self.rtc.logout) {
    self.rtc.logout();
  }

  self.unregisterUploadListeners(true);
  self.trigger('onDestroy', [isLogout]);

  try {
    if (self.$conversationsAppInstance && external_ReactDOM_default().findDOMNode(self.$conversationsAppInstance) && external_ReactDOM_default().findDOMNode(self.$conversationsAppInstance).parentNode) {
      external_ReactDOM_default().unmountComponentAtNode(external_ReactDOM_default().findDOMNode(self.$conversationsAppInstance).parentNode);
    }
  } catch (e) {
    console.error("Failed do destroy chat dom:", e);
  }

  self.chats.forEach(function (room, roomJid) {
    if (!isLogout) {
      room.destroy(false, true);
    }

    self.chats.remove(roomJid);
  });
  self.is_initialized = false;

  if (self.plugins.chatdIntegration && self.plugins.chatdIntegration.chatd && self.plugins.chatdIntegration.chatd.shards) {
    var shards = self.plugins.chatdIntegration.chatd.shards;
    Object.keys(shards).forEach(function (k) {
      shards[k].connectionRetryManager.options.functions.forceDisconnect();
    });
  }

  for (const pluginName in self.plugins) {
    const plugin = self.plugins[pluginName];

    if (plugin.destroy) {
      plugin.destroy();
    }
  }
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
  } else if (presence === UserPresence.PRESENCE.OFFLINE) {
    return 'offline';
  } else {
    return 'black';
  }
};

Chat.prototype._renderMyStatus = function () {
  var self = this;

  if (!self.is_initialized) {
    return;
  }

  if (typeof megaChat.userPresence === 'undefined') {
    return;
  }

  var $status = $('.activity-status-block .activity-status', 'body');
  $('.top-user-status-popup .dropdown-item').removeClass("active");
  $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');
  var actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();
  var userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
  var presence = self.plugins.presencedIntegration.getMyPresence();
  var cssClass = PresencedIntegration.presenceToCssClass(presence);

  if (userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED) {
    cssClass = "offline";
  }

  const $activityStatus = $('.activity-text', '.js-topbar');

  if (actualPresence === UserPresence.PRESENCE.ONLINE) {
    $('.top-user-status-popup .dropdown-item[data-presence="chat"]').addClass("active");
    $activityStatus.text(l[5923]);
  } else if (actualPresence === UserPresence.PRESENCE.AWAY) {
    $('.top-user-status-popup .dropdown-item[data-presence="away"]').addClass("active");
    $activityStatus.text(l[5924]);
  } else if (actualPresence === UserPresence.PRESENCE.DND) {
    $('.top-user-status-popup .dropdown-item[data-presence="dnd"]').addClass("active");
    $activityStatus.text(l[5925]);
  } else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
    $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
    $activityStatus.text(l[5926]);
  } else {
    $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
    $activityStatus.text(l[5926]);
  }

  $status.addClass(cssClass);

  if (userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING) {
    $status.parent().addClass("fadeinout");
  } else {
    $status.parent().removeClass("fadeinout");
  }
};

Chat.prototype.renderMyStatus = SoonFc(Chat.prototype._renderMyStatus, 100);

Chat.prototype.reorderContactTree = function () {
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

Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck, isMeeting) {
  var self = this;
  var room = false;
  type = type || "private";
  setAsActive = setAsActive === true;
  var roomId = chatId;

  if (!publicChatKey && chatHandle && self.publicChatKeys[chatHandle]) {
    if (type !== "public") {
      console.error("this should never happen.", type);
      type = "public";
    }

    publicChatKey = self.publicChatKeys[chatHandle];
  }

  var $promise = new MegaPromise();

  if (type === "private") {
    userHandles.forEach(function (user_handle) {
      if (!(user_handle in M.u)) {
        M.u.set(user_handle, new MegaDataObject(MEGA_USER_STRUCT, {
          'h': user_handle,
          'u': user_handle,
          'm': '',
          'c': 2
        }));
      }
    });
    roomId = array.one(userHandles, u_handle);

    if (!roomId) {
      $promise.reject();
      return $promise;
    }

    if (self.chats[roomId]) {
      $promise.resolve(roomId, self.chats[roomId]);
      return [roomId, self.chats[roomId], $promise];
    }
  } else {
    assert(roomId, 'Tried to create a group chat, without passing the chatId.');
    roomId = chatId;
  }

  if (type === "group" || type === "public") {
    var newUsers = [];

    if (d) {
      console.time('openchat:' + chatId + '.' + type);
    }

    for (var i = userHandles.length; i--;) {
      var contactHash = userHandles[i];

      if (!(contactHash in M.u)) {
        M.u.set(contactHash, new MegaDataObject(MEGA_USER_STRUCT, {
          'h': contactHash,
          'u': contactHash,
          'm': '',
          'c': undefined
        }));

        if (type === "group") {
          M.syncUsersFullname(contactHash);
          M.syncContactEmail(contactHash);
        }

        newUsers.push(contactHash);
      }
    }

    if (newUsers.length) {
      var chats = self.chats._data;

      if (d) {
        console.debug('openchat:%s.%s: processing %s new users...', chatId, type, newUsers.length);
      }

      for (var k in chats) {
        var chatRoom = self.chats[k];
        var participants = array.to.object(chatRoom.getParticipantsExceptMe());

        for (var j = newUsers.length; j--;) {
          var u = newUsers[j];

          if (participants[u]) {
            chatRoom.trackDataChange();
            break;
          }
        }
      }

      self.renderMyStatus();
    }

    if (d) {
      console.timeEnd('openchat:' + chatId + '.' + type);
    }

    if (type === "group") {
      ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle);
    }

    ChatdIntegration._ensureContactExists(userHandles, chatHandle);
  }

  if (self.chats[roomId]) {
    room = self.chats[roomId];

    if (setAsActive) {
      room.show();
    }

    $promise.resolve(roomId, room);
    return [roomId, room, $promise];
  }

  if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat !== roomId) {
    self.hideChat(self.currentlyOpenedChat);
    self.currentlyOpenedChat = null;
  }

  room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl, null, chatHandle, publicChatKey, ck, isMeeting, 0);
  self.chats.set(room.roomId, room);

  if (setAsActive && !self.currentlyOpenedChat || self.currentlyOpenedChat === room.roomId) {
    room.setActive();
  }

  room.showAfterCreation = setAsActive !== false;
  this.trigger('onRoomInitialized', [room]);
  room.setState(ChatRoom.STATE.JOINING);

  if (this._queuedChatRoomEvents[chatId]) {
    for (const event of this._queuedChatRoomEvents[chatId]) {
      room.trigger(event[0], event[1]);
    }

    delete this._queuedChatRoomEvents[chatId];
    delete this._queuedChatRoomEvents[chatId + "_timer"];
  }

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
    var waitForReadyState = function (aRoom, aShow) {
      var verify = function () {
        return aRoom.state === ChatRoom.STATE.READY;
      };

      var ready = function () {
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
      var chatRoom = self.chats[array.one(args[0], u_handle)];

      if (chatRoom) {
        chatRoom.show();
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
  self.chats.forEach(chatRoom => {
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
    }, 500, self.options.delaySendMessageIfRoomNotAvailableTimeout).done(function () {
      self.chats[roomJid].sendMessage(val);
    });
  } else {
    self.chats[roomJid].sendMessage(val);
  }
};

Chat.prototype.processNewUser = function (u, isNewChat) {
  var self = this;

  if (self.plugins.presencedIntegration) {
    var user = M.u[u] || false;

    if (user.c === 1) {
      self.plugins.presencedIntegration.addContact(u, isNewChat);
    }
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

  if (!u_type && !self.$container && !megaChatIsReady) {
    $('.fm-chat-block').hide();
    return false;
  }

  $('.section.conversations .fm-chat-is-loading').addClass('hidden');

  if (self.$container.parent('.section.conversations .fm-right-files-block').length == 0) {
    $('.section.conversations .fm-right-files-block').append(self.$container);
  }

  self.$leftPane = self.$leftPane || $('.conversationsApp .fm-left-panel');

  if (is_chatlink || megaChat._joinDialogIsShown) {
    self.$leftPane.addClass('hidden');
  } else {
    self.$leftPane.removeClass('hidden');
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
      activePopup.css('left', "-10000px");
    } else activePopup.css('right', "-10000px");
  }
};

Chat.prototype.getChatNum = function (idx) {
  return this.chats[this.chats.keys()[idx]];
};

Chat.prototype.navigate = promisify(function megaChatNavigate(resolve, reject, location, event, isLandingPage) {
  this.routing.route(resolve, reject, location, event, isLandingPage);
});

if (is_mobile) {
  Chat.prototype.navigate = function (location, event, isLandingPage) {
    if (d) {
      this.logger.warn('mobile-nop navigate(%s)', location, event, isLandingPage);
    }

    if (is_chatlink) {
      mobile.chatlink.show(is_chatlink.ph, is_chatlink.key);
    } else {
      loadSubPage('fm', event);
    }

    return Promise.resolve();
  };
}

Chat.prototype.renderListing = promisify(function megaChatRenderListing(resolve, reject, location, isInitial) {
  if (!isInitial && !M.chat) {
    console.debug('renderListing: Not in chat.');
    return reject(EACCESS);
  }

  M.hideEmptyGrids();
  this.refreshConversations();
  this.hideAllChats();
  $('.files-grid-view').addClass('hidden');
  $('.fm-blocks-view').addClass('hidden');
  $('.contacts-grid-view').addClass('hidden');
  $('.fm-chat-block').addClass('hidden');
  $('.fm-contacts-blocks-view').addClass('hidden');
  $('.fm-right-files-block').addClass('hidden');
  $('.fm-right-files-block.in-chat').removeClass('hidden');
  $('.nw-conversations-item').removeClass('selected');
  $('.fm-empty-conversations').removeClass('hidden');
  M.onSectionUIOpen('conversations');

  if (!location && this.chats.length) {
    var valid = room => room && room._leaving !== true && room.isDisplayable() && room;

    var room = valid(this.chats[this.lastOpenedChat]);

    if (!room) {
      var idx = 0;
      var rooms = Object.values(this.chats.toJS());
      rooms.sort(M.sortObjFn("lastActivity", -1));

      do {
        room = valid(rooms[idx]);
      } while (!room && ++idx < rooms.length);
    }

    if (room) {
      location = room.getRoomUrl();
    }
  }

  if (location) {
    $('.fm-empty-conversations').addClass('hidden');
    return this.navigate(location, undefined, isInitial).then(resolve).catch(reject);
  }

  resolve(ENOENT);
});

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

Chat.prototype._enqueueMessageUpdate = function (message) {
  this._queuedMessageUpdates.push(message);

  delay('chat:enqueue-message-updates', () => {
    var queue = this._queuedMessageUpdates;
    this._queuedMessageUpdates = [];

    for (var i = queue.length; i--;) {
      queue[i].trackDataChange();
    }
  }, 400);
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

    if (this._imageLoadCache[n.fa]) {
      this._imageLoadCache[n.fa].push(n.ch);
    } else {
      this._imageLoadCache[n.fa] = [n.ch];

      if (load) {
        this._imagesToBeLoaded[n.fa] = n;
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
    this._doneLoadingImage(n.fa);
  }
};

Chat.prototype._doLoadImages = function () {
  "use strict";

  var self = this;
  var originals = Object.create(null);
  var imagesToBeLoaded = self._imagesToBeLoaded;
  self._imagesToBeLoaded = Object.create(null);

  var chatImageParser = function (h, data) {
    var n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;

    if (n && data !== 0xDEAD) {
      n.src = mObjectURL([data.buffer || data], 'image/jpeg');
      n.srcBuffer = data;
    } else if (d) {
      console.warn('Failed to load image for %s', h, n);
    }

    self._doneLoadingImage(h);
  };

  for (var k in imagesToBeLoaded) {
    var node = imagesToBeLoaded[k];
    var mime = filemime(node);

    if (node.s < LOAD_ORIGINALS[mime]) {
      originals[node.fa] = node;
      delete imagesToBeLoaded[k];
    }
  }

  var onSuccess = function (ctx, origNodeHandle, data) {
    chatImageParser(origNodeHandle, data);
  };

  var onError = function (origNodeHandle) {
    chatImageParser(origNodeHandle, 0xDEAD);
  };

  var loadOriginal = function (n) {
    const origFallback = ex => {
      const type = String(n.fa).indexOf(':1*') > 0 ? 1 : 0;

      if (d) {
        console.debug('Failed to load original image on chat.', n.h, n, ex);
      }

      imagesToBeLoaded[n.fa] = originals[n.fa];
      delete originals[n.fa];
      delay('ChatRoom[' + self.roomId + ']:origFallback' + type, function () {
        api_getfileattr(imagesToBeLoaded, type, onSuccess, onError);
      });
    };

    M.gfsfetch(n.h, 0, -1).then(function (data) {
      var handler = is_image(n);

      if (typeof handler === 'function') {
        handler(data, buffer => {
          if (buffer) {
            chatImageParser(n.fa, buffer);
          } else {
            origFallback(EFAILED);
          }
        });
      } else {
        chatImageParser(n.fa, data);
      }
    }).catch(origFallback);
  };

  if ($.len(originals)) {
    Object.values(originals).map(loadOriginal);
  }

  api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);
  [imagesToBeLoaded, originals].forEach(function (obj) {
    Object.keys(obj).forEach(function (handle) {
      self._startedLoadingImage(handle);
    });
  });
  imagesToBeLoaded = Object.create(null);
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
  var self = this;

  var setSource = function (n, img, src) {
    var message = n.mo;

    img.onload = function () {
      img.onload = null;
      n.srcWidth = this.naturalWidth;
      n.srcHeight = this.naturalHeight;

      if (message) {
        self._enqueueMessageUpdate(message);
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

Chat.prototype.onChatsHistoryReady = promisify(function (resolve, reject, timeout) {
  if (this.allChatsHadInitialLoadedHistory()) {
    return resolve();
  }

  let timer = null;
  const chatd = this.plugins.chatdIntegration.chatd;
  const eventName = 'onMessagesHistoryDone.ochr' + makeid(16);

  const ready = () => {
    onIdle(resolve);
    clearTimeout(timer);
    chatd.off(eventName);
  };

  chatd.on(eventName, () => {
    if (this.allChatsHadInitialLoadedHistory()) {
      ready();
    }
  });

  if (timeout > 0) {
    timer = setTimeout(ready, timeout);
  }
});

Chat.prototype.allChatsHadLoadedHistory = function () {
  var chatIds = this.chats.keys();

  for (var i = chatIds.length; i--;) {
    var room = this.chats[chatIds[i]];

    if (room.isLoading()) {
      return false;
    }
  }

  return true;
};

Chat.prototype.allChatsHadInitialLoadedHistory = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = chatIds.length; i--;) {
    var room = self.chats[chatIds[i]];

    if (room.initialMessageHistLoaded === false) {
      return false;
    }
  }

  return true;
};

Chat.prototype.getPrivateRoom = function (h) {
  'use strict';

  return this.chats[h] || false;
};

Chat.prototype.createAndShowPrivateRoom = promisify(function (resolve, reject, h) {
  M.openFolder('chat/p/' + h).then(() => {
    const room = this.getPrivateRoom(h);
    assert(room, 'room not found..');
    resolve(room);
  }).catch(reject);
});

Chat.prototype.createAndShowGroupRoomFor = function (contactHashes, topic, keyRotation, createChatLink, isMeeting) {
  this.trigger('onNewGroupChatRequest', [contactHashes, {
    'topic': topic || "",
    'keyRotation': keyRotation,
    'createChatLink': createChatLink,
    'isMeeting': isMeeting
  }]);
};

Chat.prototype.createAndStartMeeting = function (topic, audio, video) {
  megaChat.createAndShowGroupRoomFor([], topic, false, 2, true);
  megaChat.rebind('onRoomInitialized.meetingCreate', function (e, room) {
    room.rebind('onNewMeetingReady.meetingCreate', function () {
      room.startCall(audio, video);
    });
  });
};

Chat.prototype._destroyAllChatsFromChatd = function () {
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).done(function (r) {
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
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).done(function (r) {
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
    self._emojiData = {
      'emojisUtf': {},
      'emojisSlug': {}
    };
  }

  if (self._emojiData[name]) {
    return MegaPromise.resolve(self._emojiData[name]);
  } else if (self._emojiDataLoading[name]) {
    return self._emojiDataLoading[name];
  } else if (name === "categories") {
    self._emojiData[name] = ["people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
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

      if (name === "emojis") {
        self._mapEmojisToAliases();
      }

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

Chat.prototype._mapEmojisToAliases = function () {
  var self = this;
  var emojis = self._emojiData.emojis;

  if (!emojis) {
    return;
  }

  self._emojiData.emojisSlug = {};
  self._emojiData.emojisUtf = {};

  for (var i = 0; i < emojis.length; i++) {
    var emoji = emojis[i];
    self._emojiData.emojisSlug[emoji.n] = emoji;
    self._emojiData.emojisUtf[emoji.u] = emoji;
  }
};

Chat.prototype.isValidEmojiSlug = function (slug) {
  var self = this;
  var emojiData = self._emojiData.emojis;

  if (!emojiData) {
    self.getEmojiDataSet('emojis');
    return false;
  }

  for (var i = 0; i < emojiData.length; i++) {
    if (emojiData[i].n === slug) {
      return true;
    }
  }
};

Chat.prototype.getMyPresence = function () {
  if (u_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getMyPresence();
  } else {}
};

Chat.prototype.getPresence = function (user_handle) {
  if (user_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getPresence(user_handle);
  } else {}
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

  if (this.chats[this.handleToId[chatdId]]) {
    return this.chats[this.handleToId[chatdId]];
  }

  var found = false;
  self.chats.forEach(function (chatRoom) {
    if (!found && chatRoom.chatId === chatdId) {
      found = chatRoom;
      return false;
    }
  });
  return found;
};

Chat.prototype.getMessageByMessageId = promisify(function (resolve, reject, chatId, messageId) {
  var chatRoom = this.getChatById(chatId);
  var msg = chatRoom.messagesBuff.getMessageById(messageId);

  if (msg) {
    return resolve(msg);
  }

  var cdp = this.plugins.chatdIntegration.chatd.chatdPersist;

  if (!cdp) {
    return reject();
  }

  cdp.getMessageByMessageId(chatId, messageId).then(r => Message.fromPersistableObject(chatRoom, r[0])).then(resolve).catch(reject);
});

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

Chat.prototype.haveAnyOnHoldCall = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = 0; i < chatIds.length; i++) {
    if (self.chats[chatIds[i]].haveActiveOnHoldCall()) {
      return true;
    }
  }

  return false;
};

Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
  'use strict';

  this.smartOpenChat(user_handle).then(function (room) {
    if (room.$rConversationPanel && room.$rConversationPanel.isMounted()) {
      room.trigger('openSendFilesDialog');
    } else {
      room.one('onComponentDidMount.sendFilesDialog', () => {
        room.trigger('openSendFilesDialog');
      });
    }

    room.setActive();
  }).catch(this.logger.error.bind(this.logger));
};

Chat.prototype.openChatAndAttachNodes = function (targets, nodes, noOpen) {
  'use strict';

  var self = this;

  if (d) {
    console.group('Attaching nodes to chat room(s)...', targets, nodes);
  }

  return new MegaPromise(function (resolve, reject) {
    var promises = [];
    var folderNodes = [];
    var fileNodes = [];

    var handleRejct = function (reject, roomId, ex) {
      if (d) {
        self.logger.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId, ex);
      }

      reject(ex);
    };

    var attachNodes = function (roomId) {
      return new MegaPromise(function (resolve, reject) {
        self.smartOpenChat(roomId).then(function (room) {
          room.attachNodes(fileNodes).then(resolve.bind(self, room)).catch(reject);
        }).catch(ex => {
          handleRejct(reject, roomId, ex);
        });
      });
    };

    var attachFolders = roomId => {
      return new MegaPromise((resolve, reject) => {
        var createPublicLink = (nodeId, room) => {
          M.createPublicLink(nodeId).then(({
            link
          }) => {
            room.sendMessage(link);
            resolve(room);
          }).catch(reject);
        };

        self.smartOpenChat(roomId).then(room => {
          for (var i = folderNodes.length; i--;) {
            createPublicLink(folderNodes[i], room);
          }
        }).catch(ex => {
          handleRejct(reject, roomId, ex);
        });
      });
    };

    if (!Array.isArray(targets)) {
      targets = [targets];
    }

    for (var i = nodes.length; i--;) {
      if (M.d[nodes[i]].t) {
        folderNodes.push(nodes[i]);
      } else {
        fileNodes.push(nodes[i]);
      }
    }

    var _afterMDcheck = () => {
      for (var i = targets.length; i--;) {
        if (fileNodes.length > 0) {
          promises.push(attachNodes(targets[i]));
        }

        if (folderNodes.length > 0) {
          promises.push(attachFolders(targets[i]));
        }
      }

      MegaPromise.allDone(promises).unpack(function (result) {
        var room;

        for (var i = result.length; i--;) {
          if (result[i] instanceof ChatRoom) {
            room = result[i];
            showToast('send-chat', nodes.length > 1 ? l[17767] : l[17766]);

            if (noOpen) {
              resolve();
            } else {
              var roomUrl = room.getRoomUrl().replace("fm/", "");
              M.openFolder(roomUrl).always(resolve);
            }

            if (d) {
              console.groupEnd();
            }

            return;
          }
        }

        if (d) {
          self.logger.warn('openChatAndAttachNodes failed in whole...', result);
          console.groupEnd();
        }

        reject(result);
      });
    };

    if (mega.megadrop.isDropExist(folderNodes).length) {
      mega.megadrop.showRemoveWarning(folderNodes).then(_afterMDcheck);
    } else {
      _afterMDcheck();
    }
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
  if (Chat._frequentsCache) {
    return Chat._frequentsCache;
  }

  var chats = this.chats;
  var recentContacts = {};
  var promises = [];
  var finishedLoadingChats = {};
  var loadingMoreChats = {};

  var _calculateLastTsFor = function (r, maxMessages) {
    var mb = r.messagesBuff;
    var len = mb.messages.length;
    var msgs = mb.messages.slice(Math.max(0, len - maxMessages), len);

    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      var contactHandle = msg.userId === mega.BID && msg.meta ? msg.meta.userId : msg.userId;

      if (r.type === "private" && contactHandle === u_handle) {
        contactHandle = contactHandle || r.getParticipantsExceptMe()[0];
      }

      if (contactHandle !== mega.BID && contactHandle !== strongvelope.COMMANDER && contactHandle in M.u && M.u[contactHandle].c === 1 && contactHandle !== u_handle) {
        if (!recentContacts[contactHandle] || recentContacts[contactHandle].ts < msg.delay) {
          recentContacts[contactHandle] = {
            'userId': contactHandle,
            'ts': msg.delay
          };
        }
      }
    }
  };

  var _histDecryptedCb = function () {
    var mb = this.messagesBuff;

    if (!loadingMoreChats[this.chatId] && mb.messages.length < 32 && mb.haveMoreHistory()) {
      loadingMoreChats[this.chatId] = true;
      mb.retrieveChatHistory(false);
    } else {
      this.unbind(CHAT_ONHISTDECR_RECNT);

      _calculateLastTsFor(this, 32);

      delete loadingMoreChats[this.chatId];
      finishedLoadingChats[this.chatId] = true;
      mb.detachMessages();
    }
  };

  var _checkFinished = function (chatId) {
    return function () {
      return finishedLoadingChats[chatId] === true;
    };
  };

  chats.forEach(function (chatRoom) {
    if (chatRoom.isLoading()) {
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 10000));
    } else if (chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
      loadingMoreChats[chatRoom.chatId] = true;
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.messagesBuff.retrieveChatHistory(false);
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 15000));
    } else {
      _calculateLastTsFor(chatRoom, 32);
    }
  });
  var masterPromise = new MegaPromise();
  MegaPromise.allDone(promises).always(function () {
    var result = obj_values(recentContacts).sort(function (a, b) {
      return a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0;
    });
    masterPromise.resolve(result.reverse());
  });
  Chat._frequentsCache = masterPromise;
  masterPromise.always(function () {
    if (Chat._frequentsCacheTimer) {
      clearTimeout(Chat._frequentsCacheTimer);
    }

    Chat._frequentsCacheTimer = setTimeout(function () {
      delete Chat._frequentsCache;
    }, 300000);
  });
  return masterPromise;
};

Chat.prototype.eventuallyAddDldTicketToReq = function (req) {
  if (!u_handle) {
    return;
  }

  var currentRoom = this.getCurrentRoom();

  if (currentRoom && currentRoom.type === "public" && currentRoom.publicChatHandle && (is_chatlink || currentRoom.membersSetFromApi && !currentRoom.membersSetFromApi.members[u_handle])) {
    req['cauth'] = currentRoom.publicChatHandle;
  }
};

Chat.prototype.safeForceUpdate = SoonFc(60, function forceAppUpdate() {
  if (this.$conversationsAppInstance) {
    this.$conversationsAppInstance.forceUpdate();
  }
});

Chat.prototype.removeMessagesByRetentionTime = function (chatId) {
  if (this.chats.length > 0) {
    if (chatId) {
      if (this.logger && d > 3) {
        this.logger.debug(`Chat.prototype.removeMessagesByRetentionTime chatId=${chatId}`);
      }

      var room = this.getChatById(chatId);

      if (room) {
        room.removeMessagesByRetentionTime();
      }

      return;
    }

    let chatIds = this.chats.keys();

    for (var i = 0; i < chatIds.length; i++) {
      let chatRoom = this.chats[chatIds[i]];

      if (chatRoom.retentionTime > 0 && chatRoom.state === ChatRoom.STATE.READY) {
        if (this.logger && d > 3) {
          this.logger.debug(`Chat.prototype.removeMessagesByRetentionTime roomId=${chatRoom.roomId}`);
        }

        chatRoom.removeMessagesByRetentionTime();
      }
    }
  }
};

Chat.prototype.loginOrRegisterBeforeJoining = function (chatHandle, forceRegister, forceLogin, notJoinReq, onLoginSuccessCb) {
  if (!chatHandle && page !== 'securechat' && (page === 'chat' || page.indexOf('chat') > -1)) {
    chatHandle = getSitePath().split("chat/")[1].split("#")[0];
  }

  assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');
  const chatRoom = megaChat.getCurrentRoom();
  var chatKey = "#" + window.location.hash.split("#").pop();

  var finish = function (stay) {
    if (!notJoinReq) {
      localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey, chatRoom.chatId]);
    }

    if (!stay) {
      window.location.reload();
    }

    return stay;
  };

  var doShowLoginDialog = function () {
    mega.ui.showLoginRequiredDialog({
      minUserType: 3,
      skipInitialDialog: 1,
      onLoginSuccessCb: onLoginSuccessCb
    }).done(() => {
      if (page !== 'login' && onLoginSuccessCb) {
        onLoginSuccessCb();
      }
    });
  };

  var doShowRegisterDialog = function () {
    mega.ui.showRegisterDialog({
      title: l[5840],
      onCreatingAccount: function () {},
      onLoginAttemptFailed: function () {
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
      onAccountCreated: function (gotLoggedIn, registerData) {
        if (finish(!gotLoggedIn)) {
          security.register.cacheRegistrationData(registerData);
          mega.ui.sendSignupLinkDialog(registerData);
          megaChat.destroy();
        }
      },
      onLoginSuccessCb: onLoginSuccessCb
    });
  };

  if (u_handle && u_handle !== "AAAAAAAAAAA") {
    return finish();
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

Chat.prototype.highlight = (text, matches, dontEscape) => {
  if (text && matches) {
    text = dontEscape ? text : escapeHTML(text);
    const tags = [];
    text = text.replace(/<[^>]+>/g, match => "@@!" + (tags.push(match) - 1) + "!@@").split(' ');

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i].str;

      for (let j = 0; j < text.length; j++) {
        const word = text[j];

        const wordNormalized = ChatSearch._normalize_str(word);

        if (wordNormalized.includes(match)) {
          const matchIndex = wordNormalized.indexOf(match);
          text[j] = (0,mixins.Rc)(matchIndex, word, word.slice(matchIndex, matchIndex + match.length));
        }
      }
    }

    text = text.join(' ').replace(/\@\@\!\d+\!\@\@/g, match => {
      return tags[parseInt(match.replace("@@!", "").replace("!@@"), 10)];
    });
    return text;
  }

  return null;
};

Chat.prototype.html = function (content) {
  if (content) {
    return this.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(content));
  }

  return null;
};

Chat.prototype.updateKeysInProtocolHandlers = function () {
  this.chats.forEach(r => {
    let ph = r.protocolHandler;

    if (ph) {
      ph.reinitWithNewData(u_handle, u_privCu25519, u_privEd25519, u_pubEd25519, ph.chatMode);
    }
  });
};

Chat.prototype.eventuallyInitMeetingUI = function () {
  if (!window.location.hash) {
    return;
  }

  let loc = page.split("#")[0];
  loc = loc.replace("fm/", "/");

  if (loc.indexOf("chat/") === 0) {
    this.initialPubChatHandle = loc.substr(5).split("?")[0];
  }
};

Chat.prototype.enqueueChatRoomEvent = function (eventName, eventData) {
  if (!this.is_initialized) {
    return;
  }

  const chatId = eventData.chatId;

  if (this._queuedChatRoomEvents[chatId + "_timer"]) {
    clearTimeout(this._queuedChatRoomEvents[chatId + "_timer"]);
  }

  this._queuedChatRoomEvents[chatId + "_timer"] = setTimeout(() => {
    delete this._queuedChatRoomEvents[chatId + "_timer"];
    delete this._queuedChatRoomEvents[chatId];
  }, 15e3);
  this._queuedChatRoomEvents[chatId] = this._queuedChatRoomEvents[chatId] || [];

  this._queuedChatRoomEvents[chatId].push([eventName, eventData]);
};

Chat.prototype.autoJoinIfNeeded = function () {
  const rawAutoLoginInfo = localStorage.autoJoinOnLoginChat;

  if (u_type && rawAutoLoginInfo) {
    var autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(rawAutoLoginInfo) || false;

    if (unixtime() - 7200 < autoLoginChatInfo[1]) {
      const req = this.plugins.chatdIntegration.getMciphReqFromHandleAndKey(autoLoginChatInfo[0], autoLoginChatInfo[2].substr(1));
      megaChat.rebind('onRoomInitialized.autoJoin', (e, megaRoom) => {
        if (megaRoom.chatId === autoLoginChatInfo[3]) {
          megaRoom.setActive();
          megaChat.unbind('onRoomInitialized.autoJoin');
          localStorage.removeItem("autoJoinOnLoginChat");
        }
      });
      M.req(req);
    } else {
      localStorage.removeItem("autoJoinOnLoginChat");
    }
  }
};

window.Chat = Chat;

if (false) {}

const chat = ({
  Chat
});

/***/ }),

/***/ 62:
/***/ (() => {

(function () {
  var ChatGlobalEventManager = function () {};

  lazy(ChatGlobalEventManager.prototype, 'listeners', function () {
    window.addEventListener('hashchange', ev => this.triggered(ev));
    $(window).rebind('resize.chatGlobalEventManager', ev => this.triggered(ev));
    var listeners = Object.create(null);
    listeners.resize = Object.create(null);
    listeners.hashchange = Object.create(null);
    return listeners;
  });

  ChatGlobalEventManager.prototype.addEventListener = function (eventName, namespace, cb) {
    this.listeners[eventName][namespace] = this.listeners[namespace] || cb;
  };

  ChatGlobalEventManager.prototype.removeEventListener = function (eventName, namespace) {
    delete this.listeners[eventName][namespace];
  };

  ChatGlobalEventManager.prototype.triggered = SoonFc(140, function _chatEVDispatcher(ev) {
    if (M.chat) {
      var listeners = this.listeners[ev.type];

      for (var k in listeners) {
        listeners[k](ev);
      }
    }
  });
  window.chatGlobalEventManager = new ChatGlobalEventManager();
})();

/***/ }),

/***/ 778:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"RETENTION_FORMAT": () => (RETENTION_FORMAT),
"default": () => (__WEBPACK_DEFAULT_EXPORT__)
});
const RETENTION_FORMAT = {
  HOURS: 'hour',
  DAYS: 'day',
  WEEKS: 'week',
  MONTHS: 'month',
  DISABLED: 'none'
};
window.RETENTION_FORMAT = RETENTION_FORMAT;

var ChatRoom = function (megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI, publicChatHandle, publicChatKey, ck, isMeeting, retentionTime) {
  var self = this;
  this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);
  this.megaChat = megaChat;
  MegaDataObject.call(this, {
    state: null,
    users: [],
    roomId: null,
    type: null,
    messages: [],
    ctime: 0,
    lastActivity: 0,
    callRequest: null,
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
    showArchived: false,
    observers: 0,
    dnd: null,
    alwaysNotify: null,
    retentionTime: 0,
    sfuApp: null,
    activeCallIds: null,
    meetingsLoading: null
  });
  this.roomId = roomId;
  this.instanceIndex = ChatRoom.INSTANCE_INDEX++;
  this.type = type;
  this.ctime = ctime;
  this.lastActivity = lastActivity ? lastActivity : 0;
  this.chatd = megaChat.plugins.chatdIntegration.chatd;
  this.chatId = chatId;
  this.chatIdBin = chatId ? base64urldecode(chatId) : "";
  this.chatShard = chatShard;
  this.chatdUrl = chatdUrl;
  this.publicChatHandle = publicChatHandle;
  this.publicChatKey = publicChatKey;
  this.ck = ck;
  this.scrolledToBottom = 1;
  this.callRequest = null;
  this.shownMessages = {};
  this.retentionTime = retentionTime;
  this.retentionLabel = '';
  this.activeSearches = 0;
  self.members = {};
  this.activeCallIds = new MegaDataMap(this);
  this.ringingCalls = new MegaDataMap(this);
  this.ringingCalls.addChangeListener(() => {
    megaChat.safeForceUpdate();
  });
  this.isMeeting = isMeeting;

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
    'dontResendAutomaticallyQueuedMessagesOlderThen': 60,
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
    if (newState === ChatRoom.STATE.READY && !self.isReadOnly() && self.chatd && self.isOnline() && self.chatIdBin) {
      var cim = self.getChatIdMessages();
      cim.restore(true);
    }
  });
  self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
    if (is_chatlink) {
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
  self.rebind('onMembersUpdated.coreRoomDataMngmt', function (e, eventData) {
    if (self.state === ChatRoom.STATE.LEFT && eventData.priv >= 0 && eventData.priv < 255) {
      self.membersLoaded = false;
      self.setState(ChatRoom.STATE.JOINING, true);
    }

    var queuedMembersUpdatedEvent = false;

    if (self.membersLoaded === false) {
      if (eventData.priv >= 0 && eventData.priv < 255) {
        var addParticipant = function addParticipant() {
          self.protocolHandler.addParticipant(eventData.userId);
          self.members[eventData.userId] = eventData.priv;

          ChatdIntegration._ensureContactExists([eventData.userId]);

          self.trigger('onMembersUpdatedUI', eventData);
        };

        ChatdIntegration._waitForProtocolHandler(self, addParticipant);

        queuedMembersUpdatedEvent = true;
      }
    } else if (eventData.priv === 255 || eventData.priv === -1) {
      var deleteParticipant = function deleteParticipant() {
        if (eventData.userId === u_handle) {
          Object.keys(self.members).forEach(function (userId) {
            self.protocolHandler.removeParticipant(userId);
            delete self.members[userId];
          });
        } else {
          self.protocolHandler.removeParticipant(eventData.userId);
          delete self.members[eventData.userId];
        }

        self.trigger('onMembersUpdatedUI', eventData);
      };

      ChatdIntegration._waitForProtocolHandler(self, deleteParticipant);

      queuedMembersUpdatedEvent = true;
    }

    if (eventData.userId === u_handle) {
      self.membersLoaded = true;
    }

    if (!queuedMembersUpdatedEvent) {
      self.members[eventData.userId] = eventData.priv;
      self.trigger('onMembersUpdatedUI', eventData);
    }
  });

  if (is_chatlink && !is_chatlink.callId) {
    const unbind = () => {
      self.unbind('onMessagesHistoryDone.chatlinkAlreadyIn');
      self.unbind('onMembersUpdated.chatlinkAlreadyIn');
    };

    self.rebind('onMembersUpdated.chatlinkAlreadyIn', (e, eventData) => {
      if (eventData.userId === u_handle && eventData.priv >= 0) {
        unbind();
        return this.megaChat.routing.reinitAndOpenExistingChat(this.chatId, this.publicChatHandle);
      }
    });
    self.rebind('onMessagesHistoryDone.chatlinkAlreadyIn', (e, data) => {
      if (!data.chatdPersist) {
        unbind();
      }
    });
  }

  self.rebind('onMembersUpdatedUI.chatRoomMembersSync', function (e, eventData) {
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
    } else {
      var contact = M.u[eventData.userId];

      if (contact instanceof MegaDataMap) {
        if (eventData.priv === 255 || eventData.priv === -1) {
          if (contact._onMembUpdUIListener) {
            contact.removeChangeListener(contact._onMembUpdUIListener);
            roomRequiresUpdate = true;
          }
        } else if (!contact._onMembUpdUIListener) {
          contact._onMembUpdUIListener = contact.addChangeListener(function () {
            self.trackDataChange.apply(self, arguments);
          });
          roomRequiresUpdate = true;
        }
      }
    }

    if (roomRequiresUpdate) {
      self.trackDataChange();
    }
  });
  self.getParticipantsExceptMe().forEach(function (userHandle) {
    var contact = M.u[userHandle];

    if (contact && contact.c) {
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
  self.rebind('onClientLeftCall.chatRoom', () => self.callParticipantsUpdated());
  self.rebind('onClientJoinedCall.chatRoom', () => self.callParticipantsUpdated());
  self.rebind('onCallParticipantsUpdated.chatRoom', () => self.callParticipantsUpdated());
  self.initialMessageHistLoaded = false;
  var timer = null;

  var _historyIsAvailable = ev => {
    self.initialMessageHistLoaded = ev ? true : -1;
    clearTimeout(timer);
    self.unbind('onMarkAsJoinRequested.initHist');
    self.unbind('onHistoryDecrypted.initHist');
    self.unbind('onMessagesHistoryDone.initHist');
    self.megaChat.safeForceUpdate();
  };

  self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
  self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);
  self.rebind('onMarkAsJoinRequested.initHist', () => {
    timer = setTimeout(function () {
      if (d) {
        self.logger.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
      }

      _historyIsAvailable(false);
    }, 3e5);
  });
  self.rebind('onRoomDisconnected', () => {
    if (!self.activeCall) {
      for (const activeCallId of self.activeCallIds.keys()) {
        self.activeCallIds.remove(activeCallId);
      }
    }
  });
  this.membersSetFromApi = new ChatRoom.MembersSet(this);

  if (publicChatHandle) {
    this.onPublicChatRoomInitialized();
  }

  return this;
};

inherits(ChatRoom, MegaDataObject);
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
ChatRoom.ANONYMOUS_PARTICIPANT = mega.BID;
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

ChatRoom.encryptTopic = function (protocolHandler, newTopic, participants, isPublic = false) {
  if (protocolHandler instanceof strongvelope.ProtocolHandler && participants.size > 0) {
    const topic = protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, isPublic);

    if (topic) {
      return base64urlencode(topic);
    }
  }

  return false;
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

  if (!isMcf && ap.m === 1 && !ap.n && ap.url && ap.ou !== u_handle && typeof ap.p === 'undefined' && !ap.topicChange) {
    self.chatRoom.trigger('onMeAdded', ap.ou);
  }
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

ChatRoom.prototype.getCallParticipants = function () {
  var ids = this.activeCallIds.keys();

  if (ids.length === 0) {
    return [];
  }

  return this.activeCallIds[ids[0]];
};

ChatRoom.prototype.getChatIdMessages = function () {
  return this.chatd.chatIdMessages[this.chatIdBin];
};

ChatRoom.prototype.getRetentionFormat = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;

  switch (true) {
    case retentionTime === 0:
      return RETENTION_FORMAT.DISABLED;

    case retentionTime % daysToSeconds(30) === 0 || retentionTime >= 31536000:
      return RETENTION_FORMAT.MONTHS;

    case retentionTime % daysToSeconds(7) === 0:
      return RETENTION_FORMAT.WEEKS;

    case retentionTime % daysToSeconds(1) === 0:
      return RETENTION_FORMAT.DAYS;

    default:
      return RETENTION_FORMAT.HOURS;
  }
};

ChatRoom.prototype.getRetentionTimeFormatted = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;

  switch (this.getRetentionFormat(retentionTime)) {
    case RETENTION_FORMAT.MONTHS:
      return Math.floor(secondsToDays(retentionTime) / 30);

    case RETENTION_FORMAT.WEEKS:
      return secondsToDays(retentionTime) / 7;

    case RETENTION_FORMAT.DAYS:
      return secondsToDays(retentionTime);

    case RETENTION_FORMAT.HOURS:
      return secondsToHours(retentionTime);

    case RETENTION_FORMAT.DISABLED:
      return 0;
  }
};

ChatRoom.prototype.getRetentionLabel = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;
  const days = secondsToDays(retentionTime);
  const months = Math.floor(days / 30);
  const hours = secondsToHours(retentionTime);

  switch (this.getRetentionFormat(retentionTime)) {
    case RETENTION_FORMAT.DISABLED:
      return l[7070];

    case RETENTION_FORMAT.MONTHS:
      return mega.icu.format(l.months_chat_history_plural, months);

    case RETENTION_FORMAT.WEEKS:
      return mega.icu.format(l.weeks_chat_history_plural, days / 7);

    case RETENTION_FORMAT.DAYS:
      return mega.icu.format(l.days_chat_history_plural, days);

    case RETENTION_FORMAT.HOURS:
      return mega.icu.format(l.hours_chat_history_plural, hours);
  }
};

ChatRoom.prototype.setRetention = function (time) {
  asyncApiReq({
    "a": "mcsr",
    "id": this.chatId,
    "d": time,
    "ds": 1
  });
};

ChatRoom.prototype.removeMessagesByRetentionTime = function () {
  var self = this;
  var messages = self.messagesBuff.messages;

  if (messages.length === 0 || this.retentionTime === 0) {
    return;
  }

  var newest = messages.getItem(messages.length - 1);
  var lowestValue = newest.orderValue;
  var deleteFrom = null;
  var lastMessage = null;
  var deletePreviousTo = (new Date() - self.retentionTime * 1000) / 1000;
  let cp = self.megaChat.plugins.chatdIntegration.chatd.chatdPersist;
  var finished = false;

  if (typeof cp !== 'undefined') {
    var done = function (message) {
      if (message) {
        if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
          self.messagesBuff._removeMessagesBefore(message.messageId);
        }

        cp.removeMessagesBefore(self.chatId, message.orderValue);
      }
    };

    if (newest.delay < deletePreviousTo) {
      cp.clearChatHistoryForChat(self.chatId);
      return;
    }

    var removeMsgs = function () {
      cp._paginateMessages(lowestValue, Chatd.MESSAGE_HISTORY_LOAD_COUNT, self.chatId).then(function (messages) {
        messages = messages[0];

        if (messages.length) {
          for (let i = 0; i < messages.length; i++) {
            let message = messages[i];

            if (message.msgObject.delay < deletePreviousTo) {
              deleteFrom = lastMessage || message;
              break;
            }

            lastMessage = message;
            lowestValue = message.orderValue;
          }
        } else {
          finished = true;
        }

        if (!finished && !deleteFrom) {
          onIdle(removeMsgs);
        } else {
          done(deleteFrom);
        }
      });
    };

    removeMsgs();
  }

  if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
    var message;

    while (message = self.messagesBuff.messages.getItem(0)) {
      if (message.delay < deletePreviousTo) {
        if (!self.messagesBuff.messages.removeByKey(message.messageId)) {
          break;
        }
      } else {
        break;
      }
    }
  }
};

ChatRoom.prototype.isOnline = function () {
  var shard = this.chatd.shards[this.chatShard];
  return shard ? shard.isOnline() : false;
};

ChatRoom.prototype.isOnlineForCalls = function () {
  var chatdChat = this.getChatIdMessages();

  if (!chatdChat) {
    return false;
  }

  return chatdChat.loginState() >= LoginState.HISTDONE;
};

ChatRoom.prototype.isArchived = function () {
  var self = this;
  return self.flags & ChatRoom.ARCHIVED;
};

ChatRoom.prototype.isAnonymous = function () {
  return is_chatlink && this.type === "public" && this.publicChatHandle && this.publicChatKey && this.publicChatHandle === megaChat.initialPubChatHandle;
};

ChatRoom.prototype.isDisplayable = function () {
  var self = this;
  return self.showArchived === true || !self.isArchived() || self.activeCall;
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
        'g': self.type === "group" || self.type === "public" ? 1 : 0,
        'u': users,
        'ts': self.ctime,
        'ct': self.ct,
        'ck': self.ck ? self.ck : null,
        'f': self.flags,
        'm': self.type === "public" ? 1 : 0
      };
      fmdb.add('mcf', {
        id: roomInfo.id,
        d: roomInfo
      });
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
      megaChat.safeForceUpdate();
    }
  }

  this.trackDataChange();
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
  var res = clone(userHandles || this.getParticipants());
  array.remove(res, u_handle, true);
  return res;
};

ChatRoom.prototype.getParticipantsTruncated = function (maxMembers, maxLength) {
  maxMembers = maxMembers || 5;
  maxLength = maxLength || 30;
  var truncatedParticipantNames = [];
  const members = Object.keys(this.members);

  for (var i = 0; i < members.length; i++) {
    var handle = members[i];
    var name = M.getNameByHandle(handle);

    if (!handle || !name || handle === u_handle) {
      continue;
    }

    if (i > maxMembers) {
      break;
    }

    truncatedParticipantNames.push(name.length > maxLength ? name.substr(0, maxLength) + '...' : name);
  }

  if (truncatedParticipantNames.length === maxMembers) {
    truncatedParticipantNames.push('...');
  }

  return truncatedParticipantNames.join(', ');
};

ChatRoom.prototype.getRoomTitle = function (ignoreTopic, encapsTopicInQuotes) {
  var self = this;
  var participants;

  if (self.type === "private") {
    participants = self.getParticipantsExceptMe();
    return M.getNameByHandle(participants[0]) || "";
  } else {
    if (!ignoreTopic && self.topic && self.topic.substr) {
      return (encapsTopicInQuotes ? '"' : "") + self.getTruncatedRoomTopic() + (encapsTopicInQuotes ? '"' : "");
    }

    var names = self.getParticipantsTruncated();
    var def = l[19077].replace('%s1', new Date(self.ctime * 1000).toLocaleString());
    return names.length > 0 ? names : def;
  }
};

ChatRoom.prototype.getTruncatedRoomTopic = function (maxLength) {
  maxLength = maxLength || 30;
  return this.topic && this.topic.length > maxLength ? this.topic.substr(0, maxLength) + '...' : this.topic;
};

ChatRoom.prototype.setRoomTitle = function (newTopic, allowEmpty) {
  var self = this;
  newTopic = allowEmpty ? newTopic : String(newTopic);
  var masterPromise = new MegaPromise();

  if ((allowEmpty || newTopic.trim().length > 0) && newTopic !== self.getRoomTitle()) {
    self.scrolledToBottom = true;
    var participants = self.protocolHandler.getTrackedParticipants();
    var promises = [];
    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

    var _runUpdateTopic = function () {
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
      self.trigger('onLeaveChatRequested');
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
    'm': 1,
    'f': flags,
    'v': Chatd.VERSION
  }).done(function (r) {
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
    'm': 1,
    'f': 0,
    'v': Chatd.VERSION
  }).done(function (r) {
    if (r === 0) {
      self.updateFlags(0, true);
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

ChatRoom.prototype.iAmInRoom = function () {
  return !(!this.members.hasOwnProperty(u_handle) || this.members[u_handle] === -1);
};

ChatRoom.prototype.joinViaPublicHandle = function () {
  var self = this;

  if (!fminitialized && is_chatlink) {
    if (u_type) {
      return new Promise((res, rej) => {
        self.megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self).then(() => {
          self.megaChat.routing.reinitAndOpenExistingChat(self.chatId, self.publicChatHandle).then(res, rej);
        }, ex => {
          console.error("Failed joining a chat room (u_type)", ex);
          rej(ex);
        });
      });
    }

    return;
  }

  if (!self.iAmInRoom() && self.type === "public" && self.publicChatHandle) {
    return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
  }

  return Promise.reject();
};

ChatRoom.prototype.switchOffPublicMode = function () {
  var self = this;
  var participants = self.protocolHandler.getTrackedParticipants();
  var promises = [];
  promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

  var onSwitchDone = function () {
    self.protocolHandler.switchOffOpenMode();
  };

  var _runSwitchOffPublicMode = function () {
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
    return false;
  }

  self.megaChat.hideAllChats();

  if (d) {
    self.logger.debug(' ---- show');
  }

  $.tresizer();
  onIdle(function () {
    self.scrollToChat();
    self.trackDataChange();
  });
  self.isCurrentlyActive = true;
  self.lastShownInUI = Date.now();
  self.showArchived = self.isArchived();
  self.megaChat.setAttachments(self.roomId);
  self.megaChat.lastOpenedChat = self.roomId;
  self.megaChat.currentlyOpenedChat = self.roomId;
  self.trigger('activity');
  self.trigger('onChatShown');
  var tmp = self.megaChat.domSectionNode;

  if (self.type === 'public') {
    tmp.classList.remove('privatechat');
  } else {
    tmp.classList.add('privatechat');
  }

  if (tmp = tmp.querySelector('.conversation-panels')) {
    tmp.classList.remove('hidden');

    if (tmp = tmp.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]')) {
      tmp.classList.remove('hidden');
    }
  }

  if (tmp = document.getElementById('conversation_' + self.roomId)) {
    tmp.classList.add('active');
  }
};

ChatRoom.prototype.scrollToChat = function () {
  this._scrollToOnUpdate = true;

  if (megaChat.$chatTreePanePs) {
    var li = document.querySelector('ul.conversations-pane li#conversation_' + this.roomId);

    if (li) {
      var pos = li.offsetTop;

      if (!verge.inViewport(li, -72)) {
        var treePane = document.querySelector('.conversationsApp .fm-tree-panel');
        var wrapOuterHeight = $(treePane).outerHeight();
        var itemOuterHeight = $('li:first', treePane).outerHeight();
        megaChat.$chatTreePanePs.doProgramaticScroll(Math.max(0, pos - wrapOuterHeight / 2 + itemOuterHeight), true);
        this._scrollToOnUpdate = false;
      }
    }
  }
};

ChatRoom.prototype.isActive = function () {
  return document.hasFocus() && this.isCurrentlyActive;
};

ChatRoom.prototype.setActive = function () {
  loadSubPage(this.getRoomUrl());
};

ChatRoom.prototype.isLoading = function () {
  var mb = this.messagesBuff;
  return mb.messagesHistoryIsLoading() || mb.isDecrypting;
};

ChatRoom.prototype.getRoomUrl = function (getRawLink) {
  var self = this;

  if (self.type === "private") {
    var participants = self.getParticipantsExceptMe();
    var contact = M.u[participants[0]];

    if (contact) {
      return "fm/chat/p/" + contact.u;
    }
  } else if (!getRawLink && is_chatlink && self.type === "public" && self.publicChatHandle && self.publicChatKey) {
    return "chat/" + self.publicChatHandle + "#" + self.publicChatKey;
  } else if (self.type === "public") {
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

  if (d) {
    self.logger.debug(' ---- hide', self.isCurrentlyActive);
  }

  self.isCurrentlyActive = false;
  self.lastShownInUI = Date.now();

  if (self.megaChat.currentlyOpenedChat === self.roomId) {
    self.megaChat.currentlyOpenedChat = null;
  }

  var tmp = self.megaChat.domSectionNode.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]');

  if (tmp) {
    tmp.classList.add('hidden');
  }

  if (tmp = document.getElementById('conversation_' + self.roomId)) {
    tmp.classList.remove('active');
  }

  self.trigger('onChatHidden', self.isCurrentlyActive);
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
        self.logger.error("self.messages got out of sync...maybe there are some previous JS exceptions that caused that? note that messages may be displayed OUT OF ORDER in the UI.");
      } else {
        var nextVal = prevMsg.orderValue + 0.1;

        if (!prevMsg.sent) {
          var cid = megaChat.plugins.chatdIntegration.chatd.chatIdMessages[self.chatIdBin];

          if (cid && cid.highnum) {
            nextVal = ++cid.highnum;
          }
        }

        message.orderValue = nextVal;
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
      promises.push(asyncApiReq({
        'a': 'mcga',
        'n': nodeId,
        'u': strongvelope.COMMANDER,
        'id': self.chatId,
        'v': Chatd.VERSION
      }));
    });
  } else {
    users.forEach(function (uh) {
      nodeids.forEach(function (nodeId) {
        promises.push(asyncApiReq({
          'a': 'mcga',
          'n': nodeId,
          'u': uh,
          'id': self.chatId,
          'v': Chatd.VERSION
        }));
      });
    });
  }

  return MegaPromise.allDone(promises);
};

ChatRoom.prototype.attachNodes = mutex('chatroom-attach-nodes', function _(resolve, reject, nodes) {
  var i;
  var step = 0;
  var users = [];
  var self = this;
  var copy = Object.create(null);
  var send = Object.create(null);
  var members = self.getParticipantsExceptMe();
  var attach = promisify(function (resolve, reject, nodes) {
    console.assert(self.type === 'public' || users.length, 'No users to send to?!');

    self._sendNodes(nodes, users).then(function () {
      for (var i = nodes.length; i--;) {
        var n = M.getNodeByHandle(nodes[i]);
        console.assert(n.h, 'wtf..');

        if (n.h) {
          self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify([{
            h: n.h,
            k: n.k,
            t: n.t,
            s: n.s,
            fa: n.fa,
            ts: n.ts,
            hash: n.hash,
            name: n.name
          }]));
        }
      }

      resolve();
    }).catch(reject);
  });

  var done = function () {
    if (--step < 1) {
      resolve();
    }
  };

  var fail = function (ex) {
    console.error(ex);
    done();
  };

  if (d && !_.logger) {
    _.logger = new MegaLogger('attachNodes', {}, self.logger);
  }

  for (i = members.length; i--;) {
    var usr = M.getUserByHandle(members[i]);

    if (usr.u) {
      users.push(usr.u);
    }
  }

  if (!Array.isArray(nodes)) {
    nodes = [nodes];
  }

  for (i = nodes.length; i--;) {
    var n = M.getNodeByHandle(nodes[i]);
    (n && (n.u !== u_handle || M.getNodeRoot(n.h) === "shares") ? copy : send)[n.h] = 1;
  }

  copy = Object.keys(copy);
  send = Object.keys(send);

  if (d) {
    _.logger.debug('copy:%d, send:%d', copy.length, send.length, copy, send);
  }

  if (send.length) {
    step++;
    attach(send).then(done).catch(fail);
  }

  if (copy.length) {
    step++;
    M.myChatFilesFolder.get(true).then(function (target) {
      var rem = [];
      var c = Object.keys(M.c[target.h] || {});

      for (var i = copy.length; i--;) {
        var n = M.getNodeByHandle(copy[i]);
        console.assert(n.h, 'wtf..');

        for (var y = c.length; y--;) {
          var b = M.getNodeByHandle(c[y]);

          if (n.h === b.h || b.hash === n.hash) {
            if (d) {
              _.logger.info('deduplication %s:%s', n.h, b.h, [n], [b]);
            }

            rem.push(n.h);
            copy.splice(i, 1);
            break;
          }
        }
      }

      var next = function (res) {
        if (!Array.isArray(res)) {
          return fail(res);
        }

        attach([].concat(rem, res)).then(done).catch(fail);
      };

      if (copy.length) {
        M.copyNodes(copy, target.h, false, next).dump('attach-nodes');
      } else {
        if (d) {
          _.logger.info('No new nodes to copy.', [rem]);
        }

        next([]);
      }
    }).catch(fail);
  }

  if (!step) {
    if (d) {
      _.logger.warn('Nothing to do here...');
    }

    onIdle(done);
  }
});

ChatRoom.prototype.onUploadStart = function (data) {
  var self = this;

  if (d) {
    self.logger.debug('onUploadStart', data);
  }
};

ChatRoom.prototype.uploadFromComputer = function () {
  this.scrolledToBottom = true;
  $('#fileselect1').trigger('click');
};

ChatRoom.prototype.attachContacts = function (ids) {
  for (let i = 0; i < ids.length; i++) {
    const nodeId = ids[i];
    const node = M.u[nodeId];
    this.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify([{
      u: node.u,
      email: node.m,
      name: node.name || node.m
    }]));
  }
};

ChatRoom.prototype.getMessageById = function (messageId) {
  var self = this;
  var msgs = self.messagesBuff.messages;
  var msgKeys = msgs.keys();

  for (var i = 0; i < msgKeys.length; i++) {
    var k = msgKeys[i];
    var v = msgs[k];

    if (v && v.messageId === messageId) {
      return v;
    }
  }

  return false;
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

ChatRoom._fnRequireParticipantKeys = function (fn, scope) {
  var origFn = fn;
  return function () {
    var self = scope || this;
    var args = toArray.apply(null, arguments);
    var participants = self.protocolHandler.getTrackedParticipants();
    return ChatdIntegration._ensureKeysAreLoaded(undefined, participants).done(function () {
      origFn.apply(self, args);
    }).fail(function () {
      self.logger.error("Failed to retr. keys.");
    });
  };
};

ChatRoom.prototype.showMissingUnifiedKeyDialog = function () {
  return msgDialog(`warningb:!^${l[82]}!${l[23433]}`, null, l[200], "An error occurred while trying to join this call. Reloading MEGAchat may fix the problem. If the problem persists, please contact support@mega.nz", reload => reload ? M.reload() : null, 1);
};

ChatRoom.prototype.hasInvalidKeys = function () {
  if (!is_chatlink && this.type === 'public') {
    const {
      unifiedKey
    } = this.protocolHandler || {};

    if (!unifiedKey || unifiedKey && unifiedKey.length !== 16 || !this.ck || this.ck && this.ck.length !== 32) {
      console.error('Error instantiating room/call -- missing `unifiedKey`/malformed `ck` for public chat.');
      const {
        master,
        slaves
      } = mBroadcaster.crossTab;
      eventlog(99751, JSON.stringify([1, buildVersion.version || 'dev', String(this.chatId).length | 0, this.type | 0, this.isMeeting | 0, typeof unifiedKey, String(unifiedKey || '').length | 0, typeof this.ck, String(this.ck).length | 0, !!master | 0, Object(slaves).length | 0]));
      return true;
    }
  }

  return false;
};

ChatRoom.prototype.joinCall = ChatRoom._fnRequireParticipantKeys(function (audio, video, callId) {
  if (this.activeCallIds.length === 0) {
    return;
  }

  if (!megaChat.hasSupportForCalls) {
    return;
  }

  if (this.meetingsLoading) {
    return;
  }

  if (this.hasInvalidKeys()) {
    return this.showMissingUnifiedKeyDialog();
  }

  this.meetingsLoading = l.joining;
  this.rebind("onCallEnd.start", (e, data) => {
    if (data.callId === callId) {
      this.meetingsLoading = false;
    }
  });
  callId = callId || this.activeCallIds.keys()[0];
  return asyncApiReq({
    'a': 'mcmj',
    'cid': this.chatId,
    "mid": callId
  }).then(r => {
    var app = new SfuApp(this, callId);
    window.sfuClient = app.sfuClient = new SfuClient(u_handle, app, this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC && str_to_ab(this.protocolHandler.unifiedKey), {
      'speak': true,
      'moderator': true
    }, r.url.replace("https://", "wss://"));
    app.sfuClient.muteAudio(!audio);
    app.sfuClient.muteCamera(!video);
    return app.sfuClient.connect(r.url, callId, {
      isGroup: this.type !== "private"
    });
  }, ex => {
    console.error('Failed to join call:', ex);
    this.meetingsLoading = false;
    this.unbind("onCallEnd.start");
  });
});

ChatRoom.prototype.rejectCall = function (callId) {
  if (this.activeCallIds.length === 0) {
    return;
  }

  callId = callId || this.activeCallIds.keys()[0];

  if (this.type === "private") {
    return asyncApiReq({
      'a': 'mcme',
      'cid': this.chatId,
      'mid': callId
    });
  }

  return Promise.resolve();
};

ChatRoom.prototype.endCallForAll = function (callId) {
  if (this.activeCallIds.length && this.type !== 'private') {
    callId = callId || this.activeCallIds.keys()[0];
    asyncApiReq({
      'a': 'mcme',
      'cid': this.chatId,
      'mid': callId
    });
  }
};

ChatRoom.prototype.joinCallFromLink = function (audioFlag, videoFlag) {
  loadingDialog.show();

  if (this.iAmInRoom()) {
    this.joinCall(audioFlag, videoFlag);
    loadingDialog.hide();
  } else {
    this.joinViaPublicHandle().then(() => {
      this.joinCall(audioFlag, videoFlag);
    }).catch(() => {
      console.error("Joining failed.");
    }).always(function () {
      loadingDialog.hide();
    });
  }
};

ChatRoom.prototype.startAudioCall = ChatRoom._fnRequireParticipantKeys(function () {
  return this.startCall(true, false);
});
ChatRoom.prototype.startVideoCall = ChatRoom._fnRequireParticipantKeys(function () {
  return this.startCall(true, true);
});
ChatRoom.prototype.startCall = ChatRoom._fnRequireParticipantKeys(function (audio, video) {
  if (!megaChat.hasSupportForCalls || this.meetingsLoading) {
    return;
  }

  if (this.activeCallIds.length > 0) {
    this.joinCall(this.activeCallIds.keys()[0]);
    return;
  }

  if (this.hasInvalidKeys()) {
    return this.showMissingUnifiedKeyDialog();
  }

  this.meetingsLoading = l.starting;
  const opts = {
    'a': 'mcms',
    'cid': this.chatId
  };

  if (localStorage.sfuId) {
    opts.sfu = parseInt(localStorage.sfuId, 10);
  }

  asyncApiReq(opts).then(r => {
    var app = new SfuApp(this, r.callId);
    window.sfuClient = app.sfuClient = new SfuClient(u_handle, app, this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC && str_to_ab(this.protocolHandler.unifiedKey), {
      'speak': true,
      'moderator': true
    }, r.sfu.replace("https://", "wss://"));
    app.sfuClient.muteAudio(!audio);
    app.sfuClient.muteCamera(!video);
    this.rebind("onCallEnd.start", (e, data) => {
      if (data.callId === r.callId) {
        this.meetingsLoading = false;
      }
    });
    sfuClient.connect(r.sfu.replace("https://", "wss://"), r.callId, {
      isGroup: this.type !== "private"
    });
  }, ex => {
    console.error('Failed to start call:', ex);
    this.meetingsLoading = false;
    this.unbind("onCallEnd.start");
  });
});

ChatRoom.prototype.stateIsLeftOrLeaving = function () {
  return this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING || !is_chatlink && this.state === ChatRoom.STATE.READY && this.membersSetFromApi && !this.membersSetFromApi.members.hasOwnProperty(u_handle) || is_chatlink && !this.members.hasOwnProperty(u_handle);
};

ChatRoom.prototype._clearChatMessagesFromChatd = function () {
  this.chatd.shards[this.chatShard].retention(base64urldecode(this.chatId), 1);
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

      if (contact && user_handle !== u_handle && contact.c === 1) {
        setLastInteractionWith(contact.u, "1:" + newTs);
      }
    });
  } else {
    var contact = M.u[user_handle];

    if (contact && user_handle !== u_handle && contact.c === 1) {
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
          msgDialog('warninga', l[135], l[8880]);
        }
      });
    }
  }
};

ChatRoom.prototype.getActiveCalls = function () {
  return this.activeCallIds.map((parts, id) => {
    return parts.indexOf(u_handle) > -1 ? id : undefined;
  });
};

ChatRoom.prototype.haveActiveCall = function () {
  return this.getActiveCalls().length > 0;
};

ChatRoom.prototype.haveActiveOnHoldCall = function () {
  let activeCallIds = this.getActiveCalls();

  for (var i = 0; i < activeCallIds.length; i++) {
    let call = megaChat.plugins.callManager2.calls[this.chatId + "_" + activeCallIds[i]];

    if (call && call.av & SfuClient.Av.onHold) {
      return true;
    }
  }

  return false;
};

ChatRoom.prototype.havePendingGroupCall = function () {
  if (this.type !== "group" && this.type !== "public") {
    return false;
  }

  return this.activeCallIds.length > 0;
};

ChatRoom.prototype.havePendingCall = function () {
  return this.activeCallIds.length > 0;
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

  const callParts = self.getCallParticipants() || [];
  self.uniqueCallParts = {};

  for (let i = 0; i < callParts.length; i++) {
    self.uniqueCallParts[callParts[i]] = true;
  }

  var msg = self.messagesBuff.getMessageById(msgId);
  msg && msg.wrappedChatDialogMessage && msg.wrappedChatDialogMessage.trackDataChange();
  self.trackDataChange();
};

ChatRoom.prototype.onPublicChatRoomInitialized = function () {
  var self = this;

  if (self.type !== "public" || !localStorage.autoJoinOnLoginChat) {
    return;
  }

  var autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(localStorage.autoJoinOnLoginChat) || false;

  if (autoLoginChatInfo[0] === self.publicChatHandle) {
    localStorage.removeItem("autoJoinOnLoginChat");

    if (unixtime() - 7200 < autoLoginChatInfo[1]) {
      var doJoinEventually = function (state) {
        if (state === ChatRoom.STATE.READY) {
          self.joinViaPublicHandle();
          self.unbind('onStateChange.' + self.publicChatHandle);
        }
      };

      self.rebind('onStateChange.' + self.publicChatHandle, function (e, oldState, newState) {
        doJoinEventually(newState);
      });
      doJoinEventually(self.state);
    }
  }
};

ChatRoom.prototype.isUIMounted = function () {
  return this._uiIsMounted;
};

ChatRoom.prototype.attachSearch = function () {
  this.activeSearches++;
};

ChatRoom.prototype.detachSearch = function () {
  if (--this.activeSearches === 0) {
    this.messagesBuff.detachMessages();
  }

  this.activeSearches = Math.max(this.activeSearches, 0);
  this.trackDataChange();
};

ChatRoom.prototype.scrollToMessageId = function (msgId, index, retryActive) {
  var self = this;

  if (!self.isCurrentlyActive && !retryActive) {
    setTimeout(function () {
      self.scrollToMessageId(msgId, index, true);
    }, 1500);
    return;
  }

  assert(self.isCurrentlyActive, 'chatRoom is not visible');
  self.isScrollingToMessageId = true;

  if (!self.$rConversationPanel) {
    self.one('onHistoryPanelComponentDidMount.scrollToMsgId' + msgId, function () {
      self.scrollToMessageId(msgId, index);
    });
    return;
  }

  var ps = self.$rConversationPanel.messagesListScrollable;
  assert(ps);
  var msgObj = self.messagesBuff.getMessageById(msgId);

  if (msgObj) {
    var elem = $('.' + msgId + '.message.body')[0];
    self.scrolledToBottom = false;
    ps.scrollToElement(elem, true);
    self.$rConversationPanel.lastScrollPosition = undefined;
    self.isScrollingToMessageId = false;
  } else if (self.messagesBuff.isRetrievingHistory) {
    self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function () {
      self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function () {
        self.scrollToMessageId(msgId, index);
      });
    });
  } else if (self.messagesBuff.haveMoreHistory()) {
    self.messagesBuff.retrieveChatHistory(!index || index <= 0 ? undefined : index);
    ps.doProgramaticScroll(0, true);
    self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function () {
      self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function () {
        self.scrollToMessageId(msgId);
      });
    });
  } else {
    self.isScrollingToMessageId = false;
  }
};

window.ChatRoom = ChatRoom;
const __WEBPACK_DEFAULT_EXPORT__ = ({
  'ChatRoom': ChatRoom
});

/***/ }),

/***/ 503:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"LY": () => (timing),
"M9": () => (SoonFcWrap),
"Os": () => (schedule),
"Rc": () => (replaceAt),
"_p": () => (ContactAwareComponent),
"qC": () => (compose),
"wl": () => (MegaRenderMixin)
});

var _applyDecoratedDescriptor2__ = __webpack_require__(229);
var react_dom0__ = __webpack_require__(533);
var react_dom0 = __webpack_require__.n(react_dom0__);
var react1__ = __webpack_require__(363);
var react1 = __webpack_require__.n(react1__);


var _dec, _dec2, _dec3, _dec4, _dec5, _class;



var INTERSECTION_OBSERVER_AVAILABLE = typeof IntersectionObserver !== 'undefined';
var RESIZE_OBSERVER_AVAILABLE = typeof ResizeObserver !== 'undefined';

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  for (var key in objA) {
    if (key === "children") {
      continue;
    }

    if (objA.hasOwnProperty(key)) {
      if (!objB.hasOwnProperty(key)) {
        return false;
      } else if (objA[key] !== objB[key]) {
        if (typeof objA[key] === 'function' && typeof objB[key] === 'function') {
          if (objA[key].toString() !== objB[key].toString()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
  }

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

let _propertyTrackChangesVars = Object.create(null);

_propertyTrackChangesVars._listenersMap = Object.create(null);
_propertyTrackChangesVars._dataChangedHistory = Object.create(null);

if (window._propertyTrackChangesVars) {
  _propertyTrackChangesVars = window._propertyTrackChangesVars;
} else {
  window._propertyTrackChangesVars = _propertyTrackChangesVars;
}

window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;
var FUNCTIONS = ['render', 'shouldComponentUpdate', 'doProgramaticScroll', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'refreshUI', 'eventuallyInit', 'handleWindowResize', 'focusTypeArea', 'initScrolling', 'updateScroll', 'isActive', 'onMessagesScrollReinitialise', 'specShouldComponentUpdate', 'attachAnimationEvents', 'eventuallyReinitialise', 'reinitialise', 'reinitialised', 'getContentHeight', 'getScrollWidth', 'isAtBottom', 'onResize', 'isComponentEventuallyVisible', 'getCursorPosition', 'getTextareaMaxHeight'];
var localStorageProfileRenderFns = localStorage.profileRenderFns;

if (localStorageProfileRenderFns) {
  window.REACT_RENDER_CALLS = {};
}

let ID_CURRENT = 1;
const DEBUG_THIS = d > 1 ? d : false;

const scheduler = (func, name, debug) => {
  let dbug = debug !== false && DEBUG_THIS;
  let idnt = null;
  let task = null;

  let fire = () => {
    if (dbug) {
      console.warn('Dispatching scheduled task for %s.%s...', idnt, name);
    }

    if (task) {
      queueMicrotask(task);
      task = null;
    }
  };

  const _scheduler = function () {
    if (dbug) {
      if (!idnt) {
        idnt = name[0] === '(' && this.getReactId && this.getReactId() || this;
      }

      console.warn('Scheduling task from %s.%s...', idnt, name, [this], !!task);
    }

    if (!task) {
      queueMicrotask(fire);
    }

    let idx = arguments.length;
    const args = new Array(idx);

    while (idx--) {
      args[idx] = arguments[idx];
    }

    task = () => {
      func.apply(this, args);
    };
  };

  if (DEBUG_THIS) {
    Object.defineProperty(_scheduler, smbl(name), {
      value: func
    });
  }

  return _scheduler;
};

const timing = (min, max) => {
  return function (target, key, de) {
    if (DEBUG_THIS > 2) {
      de[key] = de.value;

      _timing(de, min, max);

      de.value = de[key];
    }

    return de;
  };
};
const logcall = () => {
  return function (target, key, descriptor) {
    if (DEBUG_THIS > 3) {
      const func = descriptor.value;

      descriptor.value = function () {
        console.group('[logcall] Entering into %s.%s...', this, key);
        var r = func.apply(this, arguments);
        console.info('[logcall] Leaving %s.%s...', this, key);
        console.groupEnd();
        return r;
      };
    }

    return descriptor;
  };
};
const schedule = (local, debug) => {
  return function (target, property, descriptor) {
    if (local) {
      const func = descriptor.value;
      descriptor = {
        configurable: true,
        get: function _unusedScheduler() {
          Object.defineProperty(this, property, {
            value: scheduler(func, '(' + property + ')', debug)
          });
          return this[property];
        }
      };
    } else {
      descriptor.value = scheduler(descriptor.value, property, debug);
    }

    return descriptor;
  };
};
const compose = (...funcs) => funcs.reduce((a, b) => (...args) => a(b(...args)), arg => arg);
const replaceAt = (i, o, n) => `${o.slice(0, i)}<strong>${n}</strong>${o.slice(i + n.length)}`;
const SoonFcWrap = (milliseconds, local) => {
  return function (target, propertyKey, descriptor) {
    descriptor.value = SoonFc(descriptor.value, !local, milliseconds);
    return descriptor;
  };
};
const rAFWrap = () => {
  return function (target, propertyKey, descriptor) {
    let old = descriptor.value;

    descriptor.value = function () {
      return old.apply(this, arguments);
    };

    return descriptor;
  };
};
const trycatcher = () => (t, p, d) => (d.value = tryCatch(d.value)) && d;
let MegaRenderMixin = (_dec = logcall(), _dec2 = SoonFcWrap(50, true), _dec3 = logcall(), _dec4 = SoonFcWrap(80, true), _dec5 = SoonFcWrap(350, true), (_class = class MegaRenderMixin extends (react1().Component) {
  constructor(props) {
    super(props);
    lazy(this, '__internalReactID', function () {
      let key = '';
      let fib = DEBUG_THIS && this._reactInternalFiber;

      while (fib) {
        let tmp = fib.key;

        if (tmp && tmp[0] !== '.' && key.indexOf(tmp) < 0) {
          key += tmp + '/';
        }

        if (tmp = fib.memoizedProps) {
          if (tmp.contact) {
            tmp = tmp.contact.u + (tmp.chatRoom ? '@' + tmp.chatRoom.roomId : '');
          } else if (tmp.chatRoom) {
            tmp = tmp.chatRoom.roomId;
          } else {
            tmp = 0;
          }

          if (tmp && key.indexOf(tmp) < 0) {
            key += tmp + '/';
          }
        }

        fib = fib._debugOwner;
      }

      key = key ? '[' + key.substr(0, key.length - 1) + ']' : '';
      return '::' + this.constructor.name + '[' + ('000' + ID_CURRENT++).slice(-4) + ']' + key;
    });
    lazy(this, '__internalUniqueID', function () {
      return (this.__internalReactID + makeUUID().substr(-12)).replace(/[^a-zA-Z0-9]/g, '');
    });
    Object.defineProperty(this, 'isMounted', {
      value: function MegaRenderMixin_isMounted() {
        return !!this.__isMounted;
      }
    });

    if (DEBUG_THIS > 2) {
      Object.defineProperty(this, 'safeForceUpdate', {
        value: function MegaRenderMixin_safeForceUpdate_debug() {
          console.group('%s.safeForceUpdate: mounted:%s, visible:%s', this.getReactId(), this.__isMounted, this.isComponentEventuallyVisible());

          if (this.__isMounted) {
            this.forceUpdate(() => {
              console.warn('%s.safeForceUpdate finished.', this.getReactId());
              console.groupEnd();
            });
          }
        }
      });
      Object.keys(this).forEach(k => {
        if (this[k] && this[k].apply) {
          let orig = this[k];

          this[k] = function () {
            let s = performance.now();
            let r = orig.apply(this, arguments);
            s = performance.now() - s;

            if (s > 30) {
              console.error(k, this, "took", s, "ms", 'returned', r);
            }

            return r;
          };
        }
      });
    }

    if (DEBUG_THIS) {
      if (!megaChat.__components) {
        megaChat.__components = new WeakMap();
      }

      megaChat.__components.set(this, Object.getPrototypeOf(this));
    }
  }

  componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }

    this.__isMounted = false;
    chatGlobalEventManager.removeEventListener('resize', 'megaRenderMixing' + this.getUniqueId());
    chatGlobalEventManager.removeEventListener('hashchange', 'hc' + this.getUniqueId());
    var node = this.findDOMNode();

    if (this.__intersectionObserverInstance) {
      if (node) {
        this.__intersectionObserverInstance.unobserve(node);
      }

      this.__intersectionObserverInstance.disconnect();

      this.__intersectionObserverInstance = undefined;
    }

    if (this.onResizeObserved) {
      if (!RESIZE_OBSERVER_AVAILABLE) {
        $(document.body).unbind('resize.resObs' + this.getUniqueId());
      } else {
        this.__resizeObserverInstance.unobserve(node);

        this.__resizeObserverInstance.disconnect();

        this.__resizeObserverInstance = undefined;
      }
    }

    var instanceId = this.getUniqueId();
    var listeners = _propertyTrackChangesVars._listenersMap[instanceId];

    if (listeners) {
      for (var k in listeners) {
        var v = listeners[k];
        v[0].removeChangeListener(v[1]);
      }
    }

    _propertyTrackChangesVars._listenersMap[instanceId] = null;
    _propertyTrackChangesVars._dataChangedHistory[instanceId] = null;

    if (this._dataStructListeners) {
      this._internalDetachRenderCallbacks();
    }

    if (this.detachRerenderCallbacks) {
      this.detachRerenderCallbacks();
    }
  }

  getReactId() {
    return this.__internalReactID;
  }

  getUniqueId() {
    return this.__internalUniqueID;
  }

  debouncedForceUpdate() {
    this.eventuallyUpdate();
  }

  componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }

    this.__isMounted = true;
    this._wasRendered = true;

    if (this.props.requiresUpdateOnResize || this.requiresUpdateOnResize || !this.props.skipQueuedUpdatesOnResize) {
      chatGlobalEventManager.addEventListener('resize', 'megaRenderMixing' + this.getUniqueId(), () => this.onResizeDoUpdate());
    }

    chatGlobalEventManager.addEventListener('hashchange', 'hc' + this.getUniqueId(), () => this.onResizeDoUpdate());

    if (this.props) {
      this._recurseAddListenersIfNeeded("p", this.props);
    }

    if (this.state) {
      this._recurseAddListenersIfNeeded("s", this.state);
    }

    var node = this.findDOMNode();

    if (INTERSECTION_OBSERVER_AVAILABLE && !this.customIsEventuallyVisible) {
      if (node) {
        this.__intersectionVisibility = false;
        setTimeout(() => {
          this.__intersectionObserverInstance = new IntersectionObserver(([entry]) => {
            if (entry.intersectionRatio < 0.2 && !entry.isIntersecting) {
              this.__intersectionVisibility = false;
            } else {
              this.__intersectionVisibility = true;

              if (this._requiresUpdateOnResize) {
                this.debouncedForceUpdate();
              }
            }

            if (this.onVisibilityChange) {
              this.onVisibilityChange(this.__intersectionVisibility);
            }
          }, {
            threshold: 0.1
          });

          this.__intersectionObserverInstance.observe(node);
        }, 150);
      }
    }

    if (this.onResizeObserved) {
      if (!RESIZE_OBSERVER_AVAILABLE) {
        $(document.body).rebind('resize.resObs' + this.getUniqueId(), () => {
          this.onResizeObserved(node.offsetWidth, node.offsetHeight);
        });
      } else {
        this.__resizeObserverInstance = new ResizeObserver(entries => {
          this.onResizeObserved(entries[0].contentRect.width, entries[0].contentRect.height);
        });

        this.__resizeObserverInstance.observe(node);
      }
    }

    if (this.attachRerenderCallbacks) {
      this.attachRerenderCallbacks();
    }
  }

  findDOMNode() {
    if (!this.domNode) {
      this.domNode = react_dom0().findDOMNode(this);
    }

    return this.domNode;
  }

  isComponentVisible() {
    if (!this.__isMounted) {
      return false;
    }

    if (this.customIsEventuallyVisible) {
      let ciev = this.customIsEventuallyVisible;
      var result = typeof ciev === "function" ? ciev.call(this) : ciev;

      if (result !== -1) {
        return result;
      }
    }

    if (this.__intersectionVisibility === false) {
      return false;
    } else if (this.__intersectionVisibility === true) {
      return true;
    }

    const domNode = this.findDOMNode();

    if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
      return false;
    }

    if (!$(domNode).is(":visible")) {
      return false;
    }

    return verge.inViewport(domNode);
  }

  isComponentEventuallyVisible() {
    if (!this.__isMounted) {
      return false;
    }

    if (this.customIsEventuallyVisible) {
      let ciev = this.customIsEventuallyVisible;
      return typeof ciev === "function" ? ciev.call(this) : !!ciev;
    }

    if (typeof this.props.isVisible !== 'undefined') {
      return this.props.isVisible;
    }

    return this.__intersectionVisibility !== false;
  }

  eventuallyUpdate() {
    if (!window.megaChat || megaChat.isLoggingOut || this._updatesDisabled || !this._wasRendered || !this.__isMounted) {
      return;
    }

    if (!this.isComponentEventuallyVisible()) {
      this._requiresUpdateOnResize = true;
      return;
    }

    if (this._requiresUpdateOnResize) {
      this._requiresUpdateOnResize = false;
    }

    this.forceUpdate();
  }

  tempDisableUpdates(forHowLong) {
    var self = this;
    self._updatesDisabled = true;

    if (self._updatesReenableTimer) {
      clearTimeout(self._updatesReenableTimer);
    }

    var timeout = forHowLong ? forHowLong : self.REENABLE_UPDATES_AFTER_TIMEOUT ? self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT;
    self._updatesReenableTimer = setTimeout(function () {
      self.tempEnableUpdates();
    }, timeout);
  }

  tempEnableUpdates() {
    clearTimeout(this._updatesReenableTimer);
    this._updatesDisabled = false;
    this.eventuallyUpdate();
  }

  onResizeDoUpdate() {
    this.eventuallyUpdate();
  }

  _getUniqueIDForMap(map, payload) {
    return map + '.' + payload;
  }

  _recurseAddListenersIfNeeded(idx, map, depth) {
    depth |= 0;

    if (map instanceof MegaDataMap) {
      var cacheKey = this._getUniqueIDForMap(map, idx);

      var instanceId = this.getUniqueId();

      if (!_propertyTrackChangesVars._listenersMap[instanceId]) {
        _propertyTrackChangesVars._listenersMap[instanceId] = Object.create(null);
      }

      if (!_propertyTrackChangesVars._listenersMap[instanceId][cacheKey]) {
        _propertyTrackChangesVars._listenersMap[instanceId][cacheKey] = [map, map.addChangeListener(() => this.onPropOrStateUpdated())];
      }
    }

    if (depth++ < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && !this.props.manualDataChangeTracking) {
      var mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);

      for (var i = 0; i < mapKeys.length; i++) {
        var k = mapKeys[i];

        if (map[k]) {
          this._recurseAddListenersIfNeeded(idx + "_" + k, map[k], depth);
        }
      }
    }
  }

  _checkDataStructForChanges(idx, v, rv, depth) {
    if (!v && v === rv) {
      return false;
    }

    if (!rv && v) {
      return true;
    }

    if (v === null) {
      return rv !== null;
    }

    if (v instanceof MegaDataMap) {
      var cacheKey = this._getUniqueIDForMap(v, idx);

      var dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;
      var instanceId = this.getUniqueId();

      if (!dataChangeHistory[instanceId]) {
        dataChangeHistory[instanceId] = Object.create(null);
      }

      if (dataChangeHistory[instanceId][cacheKey] !== v._dataChangeIndex) {
        if (window.RENDER_DEBUG) {
          console.error("changed: ", this.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
        }

        dataChangeHistory[instanceId][cacheKey] = v._dataChangeIndex;
        return true;
      }

      return false;
    }

    return depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && v && v.byteLength === undefined && typeof v === "object" && this._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true;
  }

  _recursiveSearchForDataChanges(idx, map, referenceMap, depth) {
    var self = this;
    depth = depth || 0;

    if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
      return;
    }

    if (!this._wasRendered) {
      if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);
      this._wasRendered = true;
      return true;
    }

    if (idx === "p_children") {
      if (map.map && referenceMap.map) {
        var oldKeys = map.map(function (child) {
          return child ? child.key : child;
        });
        var newKeys = referenceMap.map(function (child) {
          return child ? child.key : child;
        });

        if (!shallowEqual(oldKeys, newKeys)) {
          return true;
        }
      } else if (!map && referenceMap || map && !referenceMap) {
        return true;
      } else if (map.$$typeof && referenceMap.$$typeof) {
        if (!shallowEqual(map.props, referenceMap.props) || !shallowEqual(map.state, referenceMap.state)) {
          return true;
        }
      }
    } else if (map && !referenceMap || !map && referenceMap || map && referenceMap && !shallowEqual(map, referenceMap)) {
      return true;
    }

    const mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);

    for (let i = mapKeys.length; i--;) {
      let k = mapKeys[i];

      if (this._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth)) {
        return true;
      }
    }

    return false;
  }

  shouldComponentUpdate(nextProps, nextState) {
    var shouldRerender = false;

    if (megaChat && megaChat.isLoggingOut) {
      return false;
    }

    if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F1", this.getElementName(), this.props, nextProps, this.state, nextState);
      }

      return false;
    }

    if (this.customIsEventuallyVisible) {
      let ciev = this.customIsEventuallyVisible;
      ciev = typeof ciev === "function" ? ciev.call(this) : !!ciev;

      if (!this._queueUpdateWhenVisible && !ciev) {
        this._queueUpdateWhenVisible = true;

        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F1.1", this.getElementName(), this.props, nextProps, this.state, nextState);
        }
      } else if (this._queueUpdateWhenVisible && ciev) {
        delete this._queueUpdateWhenVisible;
        return true;
      }
    }

    if (this.specShouldComponentUpdate) {
      var r = this.specShouldComponentUpdate(nextProps, nextState);

      if (r === false) {
        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState);
        }

        this._requiresUpdateOnResize = true;
        return false;
      } else if (r === true) {
        return true;
      }
    }

    if (!this.props.disableCheckingVisibility && !this.isComponentEventuallyVisible()) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "FVis", this.getElementName(), this.props, nextProps, this.state, nextState);
      }

      this._requiresUpdateOnResize = true;
      return false;
    }

    if (this.props !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
    }

    if (shouldRerender === false) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F3", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }

    if (shouldRerender === false && this.state !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
    }

    if (window.RENDER_DEBUG) {
      if (shouldRerender) {}

      console.error("shouldRerender?", shouldRerender, "rendered: ", this.getElementName(), "props:", this.props, "nextProps:", this.props, "state:", this.state);
    }

    if (shouldRerender === true) {
      if (this.props) {
        this._recurseAddListenersIfNeeded("p", this.props);
      }

      if (this.state) {
        this._recurseAddListenersIfNeeded("s", this.state);
      }
    } else {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }

    return shouldRerender;
  }

  onPropOrStateUpdated() {
    this.eventuallyUpdate();
  }

  getElementName() {
    return this._reactInternalFiber.elementType.name;
  }

  safeForceUpdate() {
    if (this.__isMounted) {
      this.forceUpdate();
    }
  }

  componentDidUpdate() {
    if (window.RENDER_DEBUG) {
      var self = this;

      var getElementName = function () {
        if (!self.constructor) {
          return "unknown";
        }

        return self.constructor.name;
      };

      console.error("renderedX: ", getElementName(), "props:", this.props, "state:", this.state);
    }

    if (this.domNode && !this.domNode.isConnected) {
      delete this.domNode;
    }
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (localStorageProfileRenderFns) {
      var self = this;
      var componentName = self.constructor ? self.constructor.name : "unknown";

      if (!this._wrappedRender) {
        FUNCTIONS.forEach(function (fnName) {
          var _origFn = self[fnName];

          if (_origFn) {
            self[fnName] = function () {
              var start = performance.now();

              var res = _origFn.apply(this, arguments);

              REACT_RENDER_CALLS[componentName + "." + fnName] = REACT_RENDER_CALLS[componentName + "." + fnName] || 0;
              REACT_RENDER_CALLS[componentName + "." + fnName] += performance.now() - start;
              return res;
            };
          }
        });
        self._wrappedRender = true;
      }

      REACT_RENDER_CALLS.sorted = function () {
        var sorted = [];
        Object.keys(REACT_RENDER_CALLS).sort(function (a, b) {
          if (REACT_RENDER_CALLS[a] < REACT_RENDER_CALLS[b]) {
            return 1;
          } else if (REACT_RENDER_CALLS[a] > REACT_RENDER_CALLS[b]) {
            return -1;
          } else {
            return 0;
          }
        }).forEach(function (k) {
          if (typeof REACT_RENDER_CALLS[k] !== 'function') {
            sorted.push([k, REACT_RENDER_CALLS[k]]);
          }
        });
        return sorted;
      };

      REACT_RENDER_CALLS.clear = function () {
        Object.keys(REACT_RENDER_CALLS).forEach(function (k) {
          if (typeof REACT_RENDER_CALLS[k] !== 'function') {
            delete REACT_RENDER_CALLS[k];
          }
        });
      };
    }
  }

  _internalDetachRenderCallbacks() {
    const items = this._dataStructListeners || false;

    for (let i = items.length; i--;) {
      let item = items[i];

      if (item[0] === 'dsprops') {
        console.assert(item[2].removeChangeListener(item[1]), 'listener not found..');
      }
    }
  }

  addDataStructListenerForProperties(obj, properties) {
    if (!(obj instanceof MegaDataMap)) {
      return;
    }

    if (!this._dataStructListeners) {
      this._dataStructListeners = [];
    }

    properties = array.to.object(properties);
    var id = obj.addChangeListener((obj, data, k) => properties[k] && this.onPropOrStateUpdated());

    this._dataStructListeners.push(['dsprops', id, obj]);
  }

}, ((0,_applyDecoratedDescriptor2__.Z)(_class.prototype, "componentWillUnmount", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "componentWillUnmount"), _class.prototype), (0,_applyDecoratedDescriptor2__.Z)(_class.prototype, "debouncedForceUpdate", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "debouncedForceUpdate"), _class.prototype), (0,_applyDecoratedDescriptor2__.Z)(_class.prototype, "componentDidMount", [_dec3], Object.getOwnPropertyDescriptor(_class.prototype, "componentDidMount"), _class.prototype), (0,_applyDecoratedDescriptor2__.Z)(_class.prototype, "eventuallyUpdate", [_dec4], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyUpdate"), _class.prototype), (0,_applyDecoratedDescriptor2__.Z)(_class.prototype, "onResizeDoUpdate", [_dec5], Object.getOwnPropertyDescriptor(_class.prototype, "onResizeDoUpdate"), _class.prototype)), _class));
class ContactAwareComponent extends MegaRenderMixin {
  constructor(props) {
    super(props);
    this.loadContactInfo();
  }

  loadContactInfo() {
    var _contact$avatar;

    const contact = this.props.contact;
    const contactHandle = contact && (contact.h || contact.u);

    if (!(contactHandle in M.u)) {
      return;
    }

    const syncName = !ContactAwareComponent.unavailableNames[contactHandle] && !contact.firstName && !contact.lastName;
    const syncMail = megaChat.FORCE_EMAIL_LOADING || (contact.c === 1 || contact.c === 2) && !contact.m && !is_chatlink;
    const syncAvtr = (is_chatlink && (!contact.avatar || ((_contact$avatar = contact.avatar) == null ? void 0 : _contact$avatar.type) === "text") || !contact.avatar) && !avatars[contactHandle] && !ContactAwareComponent.unavailableAvatars[contactHandle];

    const loader = () => {
      if (!this.isComponentEventuallyVisible()) {
        this.__isLoadingContactInfo = null;
        this._requiresUpdateOnResize = true;
        return;
      }

      const promises = [];
      const chatHandle = is_chatlink.ph || this.props.chatRoom && this.props.chatRoom.publicChatHandle;

      if (syncName) {
        promises.push(M.syncUsersFullname(contactHandle, chatHandle, new MegaPromise()));
      }

      if (syncMail) {
        promises.push(M.syncContactEmail(contactHandle, new MegaPromise()));
      }

      if (syncAvtr) {
        promises.push(useravatar.loadAvatar(contactHandle, chatHandle).catch(function () {
          ContactAwareComponent.unavailableAvatars[contactHandle] = true;
        }));
      }

      MegaPromise.allDone(promises).always(() => {
        this.eventuallyUpdate();
        this.__isLoadingContactInfo = false;

        if (!contact.firstName && !contact.lastName) {
          ContactAwareComponent.unavailableNames[contactHandle] = true;
        }
      });
    };

    if (syncName || syncMail || syncAvtr) {
      this.__isLoadingContactInfo = setTimeout(loader, 300);
    }
  }

  componentDidUpdate() {
    super.componentDidUpdate();

    if (this.__isLoadingContactInfo === null) {
      this.loadContactInfo();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.__isLoadingContactInfo) {
      clearTimeout(this.__isLoadingContactInfo);
    }
  }

  isLoadingContactInfo() {
    return !!this.__isLoadingContactInfo;
  }

}
ContactAwareComponent.unavailableAvatars = Object.create(null);
ContactAwareComponent.unavailableNames = Object.create(null);

/***/ }),

/***/ 142:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (ChatToaster)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);
var _meetings_call_jsx2__ = __webpack_require__(357);
var _ui_buttons3__ = __webpack_require__(204);




const NAMESPACE = 'chat-toast';
class ChatToaster extends _mixins1__.wl {
  constructor() {
    super();
    this.state = {
      toast: null,
      endTime: 0,
      fmToastId: null,
      persistentToast: null
    };
    this.toasts = [];
    this.persistentToasts = [];
  }

  customIsEventuallyVisible() {
    return M.chat;
  }

  enqueueToast(e) {
    if (this.props.showDualNotifications && e.data.options && e.data.options.persistent) {
      this.persistentToasts.push(e.data);
    } else {
      this.toasts.push(e.data);
    }

    this.pollToasts();
  }

  pollToasts() {
    const {
      toast: shownToast,
      persistentToast: shownPersistentToast
    } = this.state;
    const {
      isRootToaster,
      showDualNotifications,
      onShownToast
    } = this.props;
    const now = Date.now();

    if (this.toasts.length + this.persistentToasts.length) {
      if (this.isMounted() && (!isRootToaster && _meetings_call_jsx2__.ZP.isExpanded() || M.chat)) {
        if (this.toasts.length && !shownToast) {
          this.dispatchToast(this.toasts.shift(), now);
        }

        if (showDualNotifications && this.persistentToasts.length && !shownPersistentToast) {
          const persistentToast = this.persistentToasts.shift();
          this.setState({
            persistentToast
          }, () => this.pollToasts());

          if (typeof onShownToast === 'function') {
            onShownToast(persistentToast);
          }
        }
      } else if (isRootToaster && this.toasts.length && !shownToast) {
        const toast = this.toasts.shift();
        this.dispatchToast(toast, now, {
          fmToastId: 'tmp'
        });
        window.toaster.alerts.medium(...toast.renderFM()).then(fmToastId => {
          toast.onShown(fmToastId);
          this.setState({
            fmToastId
          });
        });
      }
    }
  }

  dispatchToast(toast, now, options = {}) {
    const {
      fmToastId,
      endTime,
      silent
    } = options;
    const {
      onShownToast,
      onHideToast
    } = this.props;
    this.setState({
      toast,
      endTime: endTime || now + toast.getTTL(),
      fmToastId
    }, () => {
      this.eventuallyUpdate();

      if (!silent) {
        toast.onShown();
      }

      this.timeout = setTimeout(() => {
        delete this.timeout;
        this.setState({
          toast: null,
          endTime: 0
        }, () => this.pollToasts());

        if (typeof toast.onEnd === 'function') {
          toast.onEnd();
        }

        if (typeof onHideToast === 'function') {
          onHideToast(toast);
        }
      }, endTime ? endTime - now : toast.getTTL());
    });

    if (typeof onShownToast === 'function') {
      onShownToast(toast);
    }
  }

  onClose(persistent) {
    const {
      showDualNotifications,
      onHideToast
    } = this.props;
    const {
      toast,
      persistentToast
    } = this.state;

    if (showDualNotifications && persistent) {
      if (typeof persistentToast.onEnd === 'function') {
        persistentToast.onEnd();
      }

      this.setState({
        persistentToast: null
      }, () => this.pollToasts());

      if (typeof onHideToast === 'function') {
        onHideToast(persistentToast);
      }

      return;
    }

    clearTimeout(this.timeout);
    delete this.timeout;

    if (typeof toast.onEnd === 'function') {
      toast.onEnd();
    }

    if (typeof onHideToast === 'function') {
      onHideToast(toast);
    }

    this.setState({
      toast: null,
      endTime: 0
    }, () => this.pollToasts());
  }

  flush() {
    const {
      toast,
      persistentToast
    } = this.state;
    this.toasts = [];
    this.persistentToasts = [];

    if (this.timeout) {
      clearTimeout(this.timeout);
      delete this.timeout;
    }

    if (toast) {
      this.onClose(toast.persistent);
    }

    if (persistentToast) {
      this.onClose(true);
    }

    this.setState({
      toast: null,
      endTime: 0,
      fmToastId: null,
      persistentToast: null
    });
  }

  componentDidMount() {
    super.componentDidMount();
    megaChat.rebind(`onChatToast.toaster${this.getUniqueId()}`, e => this.enqueueToast(e));
    megaChat.rebind(`onChatToastFlush.toaster${this.getUniqueId()}`, () => this.flush());
    onIdle(() => this.pollToasts());

    if (this.props.isRootToaster) {
      this.bpcListener = mBroadcaster.addListener('beforepagechange', tpage => {
        const {
          toast,
          endTime,
          fmToastId
        } = this.state;
        const now = Date.now();

        if (toast && endTime - 500 > now) {
          const toChat = tpage.includes('chat') && tpage !== 'securechat';

          if (toChat && !M.chat) {
            clearTimeout(this.timeout);
            window.toaster.alerts.hide(fmToastId);
            this.dispatchToast(toast, now, {
              endTime,
              silent: true
            });
          } else if (!toChat && M.chat) {
            clearTimeout(this.timeout);
            this.dispatchToast(toast, now, {
              fmToastId: 'tmp',
              endTime,
              silent: true
            });
            window.toaster.alerts.medium(...toast.renderFM()).then(id => {
              this.setState({
                fmToastId: id
              });
            });
          }
        } else if (toast && typeof toast.onEnd === 'function') {
          toast.onEnd();
        }
      });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    megaChat.off(`onChatToast.toaster${this.getUniqueId()}`);
    megaChat.off(`onChatToastFlush.toaster${this.getUniqueId()}`);

    if (this.bpcListener) {
      mBroadcaster.removeListener(this.bpcListener);
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  render() {
    const {
      hidden,
      isRootToaster,
      showDualNotifications
    } = this.props;
    const {
      toast,
      fmToastId,
      persistentToast
    } = this.state;
    return !hidden && !fmToastId && react0().createElement("div", {
      className: `chat-toast-bar ${isRootToaster ? 'toaster-root' : ''}`
    }, toast && react0().createElement(ChatToastMsg, {
      toast: toast,
      isRootToaster: isRootToaster,
      onClose: p => this.onClose(p)
    }), showDualNotifications && persistentToast && react0().createElement(ChatToastMsg, {
      toast: persistentToast,
      isRootToaster: isRootToaster,
      isDualToast: !!toast,
      usePersistentStyle: true,
      onClose: p => this.onClose(p)
    }));
  }

}

class ChatToastMsg extends _mixins1__.wl {
  constructor(...args) {
    super(...args);
    this.state = {
      value: ''
    };
  }

  componentDidMount() {
    super.componentDidMount();
    const {
      toast,
      onClose
    } = this.props;

    if (toast.updater && typeof toast.updater === 'function') {
      toast.updater();
      this.updateInterval = setInterval(() => {
        toast.updater();
        const value = toast.render();

        if (!value) {
          return onClose(toast.options && toast.options.persistent);
        }

        if (value !== this.state.value) {
          this.setState({
            value
          });
        }
      }, 250);
    }

    const value = toast.render();

    if (value) {
      this.setState({
        value
      });
    } else {
      onClose(toast.options && toast.options.persistent);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  render() {
    const {
      toast,
      isRootToaster,
      isDualToast,
      usePersistentStyle,
      onClose
    } = this.props;
    const {
      value
    } = this.state;

    if (usePersistentStyle && toast.options.persistent) {
      return react0().createElement("div", {
        className: `${NAMESPACE} chat-persistent-toast ${isDualToast ? 'dual-toast' : ''}`
      }, value || toast.render());
    }

    const closeButton = toast.close && react0().createElement(_ui_buttons3__.Button, {
      className: "chat-toast-close",
      icon: "sprite-fm-mono icon-close-component",
      onClick: onClose
    });
    const icon = toast.icon && react0().createElement("i", {
      className: toast.icon
    });

    if (isRootToaster) {
      return react0().createElement("div", {
        className: `${NAMESPACE} chat-toast-wrapper root-toast`
      }, react0().createElement("div", {
        className: "toast-value-wrapper"
      }, icon, react0().createElement("div", {
        className: "toast-value"
      }, value || toast.render())), closeButton);
    }

    return react0().createElement("div", {
      className: `${NAMESPACE} chat-toast-wrapper theme-light-forced`
    }, react0().createElement("div", {
      className: "toast-value"
    }, value || toast.render()));
  }

}

/***/ }),

/***/ 813:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (ComposedTextArea)
});

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
;// CONCATENATED MODULE: ./js/chat/ui/whosTyping.jsx
var React = __webpack_require__(363);



class WhosTyping extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      currentlyTyping: {}
    };
  }

  componentWillMount() {
    var self = this;
    var chatRoom = self.props.chatRoom;
    self.props.chatRoom.megaChat;
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
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom.megaChat;
    chatRoom.off("onParticipantTyping.whosTyping");
  }

  stoppedTyping(u_h) {
    if (this.isMounted()) {
      const {
        currentlyTyping
      } = this.state;

      if (currentlyTyping[u_h]) {
        const newState = clone(currentlyTyping);

        if (newState[u_h]) {
          clearTimeout(newState[u_h][1]);
        }

        delete newState[u_h];
        this.setState({
          currentlyTyping: newState
        });
      }
    }
  }

  render() {
    var self = this;
    var typingElement = null;

    if (Object.keys(self.state.currentlyTyping).length > 0) {
      var names = Object.keys(self.state.currentlyTyping).map(u_h => {
        var contact = M.u[u_h];

        if (contact && contact.firstName) {
          if (contact.nickname !== '') {
            return contact.nickname;
          }

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
        msg = l[8872].replace("%1", namesDisplay[0]).replace("%2", namesDisplay[1]);
      } else {
        msg = l[8629].replace("%1", namesDisplay[0]);
      }

      typingElement = React.createElement("div", {
        className: "typing-block"
      }, React.createElement("div", {
        className: "typing-text"
      }, msg), React.createElement("div", {
        className: "typing-bounce"
      }, React.createElement("div", {
        className: "typing-bounce1"
      }), React.createElement("div", {
        className: "typing-bounce2"
      }), React.createElement("div", {
        className: "typing-bounce3"
      })));
    }

    return typingElement;
  }

}


// EXTERNAL MODULE: ./js/chat/ui/typingArea.jsx + 1 modules
var typingArea = __webpack_require__(825);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
var buttons = __webpack_require__(204);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var dropdowns = __webpack_require__(78);
;// CONCATENATED MODULE: ./js/chat/ui/composedTextArea.jsx






class ComposedTextArea extends mixins.wl {
  render() {
    const {
      chatRoom: room,
      parent,
      containerRef
    } = this.props;
    return external_React_default().createElement("div", {
      className: "chat-textarea-block"
    }, external_React_default().createElement(WhosTyping, {
      chatRoom: room
    }), external_React_default().createElement(typingArea.j, {
      chatRoom: room,
      className: "main-typing-area",
      containerRef: containerRef,
      disabled: room.isReadOnly(),
      persist: true,
      onUpEditPressed: () => {
        const time = unixtime();
        const keys = room.messagesBuff.messages.keys();

        for (var i = keys.length; i--;) {
          var message = room.messagesBuff.messages[keys[i]];
          var contact = M.u[message.userId];

          if (!contact) {
            continue;
          }

          if (contact.u === u_handle && time - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof Message) && (!message.isManagement || !message.isManagement())) {
            parent.historyPanel.editMessage(message.messageId);
            return true;
          }
        }

        return false;
      },
      onResized: () => {
        parent.historyPanel.handleWindowResize();
        $('.js-messages-scroll-area', parent.findDOMNode()).trigger('forceResize', [true]);
      },
      onConfirm: messageContents => {
        const {
          messagesListScrollable
        } = parent.historyPanel;

        if (messageContents && messageContents.length > 0) {
          if (!room.scrolledToBottom) {
            room.scrolledToBottom = true;
            parent.lastScrollPosition = 0;
            room.rebind('onMessagesBuffAppend.pull', () => {
              if (messagesListScrollable) {
                messagesListScrollable.scrollToBottom(false);
                delay('messagesListScrollable', () => {
                  messagesListScrollable.enable();
                }, 1500);
              }
            });
            room.sendMessage(messageContents);
            messagesListScrollable.disable();
            messagesListScrollable.scrollToBottom(true);
          } else {
            room.sendMessage(messageContents);
          }
        }
      }
    }, external_React_default().createElement(buttons.Button, {
      className: "popup-button left",
      icon: "sprite-fm-mono icon-add",
      disabled: room.isReadOnly()
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "wide-dropdown attach-to-chat-popup light",
      noArrow: "true",
      positionMy: "left top",
      positionAt: "left bottom",
      vertOffset: 4
    }, external_React_default().createElement("div", {
      className: "dropdown info-txt"
    }, l[23753] ? l[23753] : "Send..."), external_React_default().createElement(dropdowns.DropdownItem, {
      className: "link-button",
      icon: "sprite-fm-mono icon-cloud",
      label: l[19794] ? l[19794] : "My Cloud Drive",
      disabled: mega.paywall,
      onClick: () => room.trigger('openAttachCloudDialog')
    }), external_React_default().createElement(dropdowns.DropdownItem, {
      className: "link-button",
      icon: "sprite-fm-mono icon-session-history",
      label: l[19795] ? l[19795] : "My computer",
      disabled: mega.paywall,
      onClick: () => room.uploadFromComputer()
    }), !is_eplusplus && !is_chatlink && external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
      className: "link-button",
      icon: "sprite-fm-mono icon-send-contact",
      label: l[8628] ? l[8628] : "Send contact",
      onClick: () => room.trigger('openSendContactDialog')
    }))))));
  }

}

/***/ }),

/***/ 13:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"Avatar": () => (Avatar),
"ContactAwareName": () => (ContactAwareName),
"ContactButton": () => (ContactButton),
"ContactCard": () => (ContactCard),
"ContactFingerprint": () => (ContactFingerprint),
"ContactItem": () => (ContactItem),
"ContactPickerDialog": () => (ContactPickerDialog),
"ContactPickerWidget": () => (ContactPickerWidget),
"ContactPresence": () => (ContactPresence),
"ContactVerified": () => (ContactVerified),
"ContactsListItem": () => (ContactsListItem),
"LastActivity": () => (LastActivity),
"MAX_FREQUENTS": () => (MAX_FREQUENTS),
"MembersAmount": () => (MembersAmount)
});
var _extends8__ = __webpack_require__(462);
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);
var _ui_utils_jsx2__ = __webpack_require__(79);
var _ui_perfectScrollbar_jsx3__ = __webpack_require__(285);
var _ui_buttons_jsx4__ = __webpack_require__(204);
var _ui_dropdowns_jsx5__ = __webpack_require__(78);
var _contactsPanel_contactsPanel_jsx6__ = __webpack_require__(105);
var _ui_modalDialogs7__ = __webpack_require__(904);










const MAX_FREQUENTS = 3;
const EMPTY_ARR = [];

let _attchRerenderCbContacts = function (others) {
  this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'm', 'avatar'].concat(others ? others : EMPTY_ARR));
};

const closeDropdowns = () => {
  document.dispatchEvent(new Event('closeDropdowns'));
};

class ContactsListItem extends _mixins1__._p {
  constructor(...args) {
    super(...args);
    this.attachRerenderCallback = _attchRerenderCbContacts;
  }

  render() {
    var classString = "nw-conversations-item";
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    classString += " " + megaChat.userPresenceToCssClass(contact.presence);
    return react0().createElement("div", null, react0().createElement("div", {
      className: classString,
      onClick: this.props.onContactClicked.bind(this)
    }, react0().createElement("div", {
      className: "nw-contact-status"
    }), react0().createElement("div", {
      className: "nw-conversations-unread"
    }, "0"), react0().createElement("div", {
      className: "nw-conversations-name"
    }, M.getNameByHandle(contact.u))));
  }

}
ContactsListItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactButton extends _mixins1__._p {
  constructor(...args) {
    super(...args);
    this.attachRerenderCallbacks = _attchRerenderCbContacts;

    this.loadAccount = () => loadSubPage('fm/account');

    this.dropdownItemGenerator = () => {
      let {
        contact,
        dropdowns,
        chatRoom,
        dropdownRemoveButton
      } = this.props;
      dropdowns = dropdowns ? dropdowns : [];
      const moreDropdowns = [];
      const username = react0().createElement(_ui_utils_jsx2__.OFlowEmoji, null, M.getNameByHandle(contact.u));

      const onContactClicked = () => {
        if (contact.c === 2) {
          this.loadAccount();
        }

        if (contact.c === 1) {
          loadSubPage('fm/chat/contacts/' + contact.u);
        }
      };

      moreDropdowns.push(react0().createElement("div", {
        className: "dropdown-avatar rounded",
        key: "mainContactInfo",
        onClick: onContactClicked
      }, react0().createElement(Avatar, {
        className: "avatar-wrapper context-avatar",
        chatRoom: chatRoom,
        contact: contact,
        hideVerifiedBadge: "true"
      }), react0().createElement("div", {
        className: "dropdown-user-name"
      }, react0().createElement("div", {
        className: "name"
      }, username, react0().createElement(ContactPresence, {
        className: "small",
        contact: contact
      })), contact && (megaChat.FORCE_EMAIL_LOADING || contact.c === 1 || contact.c === 2) && react0().createElement("span", {
        className: "email"
      }, contact.m))));
      moreDropdowns.push(react0().createElement(ContactFingerprint, {
        key: "fingerprint",
        contact: contact
      }));

      if (dropdowns.length && contact.c !== 2) {
        moreDropdowns.push(dropdowns);
        moreDropdowns.push(react0().createElement("hr", {
          key: "top-separator"
        }));
      }

      if (contact.u === u_handle) {
        moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
          key: "view0",
          icon: "sprite-fm-mono icon-user-filled",
          label: l[187],
          onClick: this.loadAccount
        }));
      }

      if (contact.c === 1) {
        const startAudioCall = () => {
          megaChat.createAndShowPrivateRoom(contact.u).then(room => {
            room.setActive();
            room.startAudioCall();
          });
        };

        if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
          moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
            key: "startCall",
            className: "sprite-fm-mono-before icon-arrow-right-before",
            icon: "sprite-fm-mono icon-phone",
            submenu: true,
            label: l[19125],
            onClick: startAudioCall
          }));
          moreDropdowns.push(react0().createElement("div", {
            className: "dropdown body submenu",
            key: "dropdownGroup"
          }, react0().createElement("div", null, react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
            key: "startAudio",
            icon: "sprite-fm-mono icon-phone",
            disabled: !megaChat.hasSupportForCalls,
            label: l[1565],
            onClick: startAudioCall
          })), react0().createElement("div", null, react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
            key: "startVideo",
            icon: "sprite-fm-mono icon-video-call-filled",
            disabled: !megaChat.hasSupportForCalls,
            label: l[1566],
            onClick: () => {
              megaChat.createAndShowPrivateRoom(contact.u).then(room => {
                room.setActive();
                room.startVideoCall();
              });
            }
          }))));
        } else {
          moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
            key: "startChat",
            icon: "sprite-fm-mono icon-chat",
            label: l[5885],
            onClick: () => {
              loadSubPage('fm/chat/p/' + contact.u);
            }
          }));
        }

        moreDropdowns.push(react0().createElement("hr", {
          key: "files-separator"
        }));
        moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
          key: "send-files-item",
          icon: "sprite-fm-mono icon-send-files",
          label: l[6834],
          disabled: mega.paywall,
          onClick: () => {
            megaChat.openChatAndSendFilesDialog(contact.u);
          }
        }));
        moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
          key: "share-item",
          icon: "sprite-fm-mono icon-folder-outgoing-share",
          label: l[6775],
          onClick: () => {
            openCopyShareDialog(contact.u);
          }
        }));
      } else if (!is_chatlink && !is_eplusplus && (!contact.c || contact.c === 2 && contact.u !== u_handle)) {
        moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
          key: "view2",
          icon: "sprite-fm-mono icon-add",
          label: l[101],
          onClick: () => {
            const isAnonymousUser = !u_handle || u_type !== 3;
            const ADD_CONTACT = 'addContact';

            if (is_chatlink && isAnonymousUser) {
              megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);

              if (localStorage.getItem(ADD_CONTACT) === null) {
                localStorage.setItem(ADD_CONTACT, JSON.stringify({
                  u: contact.u,
                  unixTime: unixtime()
                }));
              }
            } else {
              loadingDialog.show();
              M.syncContactEmail(contact.u, new MegaPromise(), true).done(email => {
                if (Object.values(M.opc || {}).some(cr => cr.m === email)) {
                  closeDialog();
                  msgDialog('warningb', '', l[17545]);
                } else {
                  M.inviteContact(M.u[u_handle].m, email);
                  const title = l[150];
                  const msg = l[5898].replace('[X]', email);
                  closeDialog();
                  msgDialog('info', title, msg.replace('[X]', email));
                }
              }).always(() => loadingDialog.hide()).catch(() => {
                const {
                  chatRoom
                } = this.props;
                const {
                  u: userHandle
                } = contact;

                if (chatRoom.sfuApp) {
                  return mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle);
                }

                const name = M.getNameByHandle(userHandle);
                return msgDialog('info', '', l.ephemeral_title ? l.ephemeral_title.replace('%1', name) : `${name} is using an ephemeral session.`, l.ephemeral_info);
              });
            }
          }
        }));
      }

      if (u_attr && contact.u !== u_handle) {
        if (moreDropdowns.length > 0 && !(moreDropdowns.length === 2 && moreDropdowns[1] && moreDropdowns[1].key === "fingerprint")) {
          moreDropdowns.push(react0().createElement("hr", {
            key: "nicknames-separator"
          }));
        }

        moreDropdowns.push(react0().createElement(_ui_dropdowns_jsx5__.DropdownItem, {
          key: "set-nickname",
          icon: "sprite-fm-mono icon-rename",
          label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
          onClick: () => {
            nicknames.setNicknameDialog.init(contact.u);
          }
        }));
      }

      if (dropdownRemoveButton && dropdownRemoveButton.length) {
        moreDropdowns.push(react0().createElement("hr", {
          key: "remove-separator"
        }));
        moreDropdowns.push(dropdownRemoveButton);
      }

      return moreDropdowns;
    };
  }

  customIsEventuallyVisible() {
    if (this.props.chatRoom) {
      return this.props.chatRoom.isCurrentlyActive;
    }

    return -1;
  }

  render() {
    let {
      label = '',
      className = '',
      contact,
      dropdownIconClasses = [],
      verticalOffset,
      dropdownDisabled,
      noLoading,
      noContextMenu
    } = this.props;
    let dropdownPosition = "left top";
    let vertOffset = 0;
    let horizOffset = -30;

    if (!contact) {
      return null;
    }

    if (label) {
      className = `user-card-name ${className}`;
      dropdownIconClasses = '';
      dropdownPosition = 'left bottom';
      vertOffset = 25;
      horizOffset = 0;
    }

    if (typeof verticalOffset !== 'undefined') {
      vertOffset = verticalOffset;
    }

    if (!contact.name && !contact.m && !noLoading && this.isLoadingContactInfo()) {
      label = react0().createElement("em", {
        className: "contact-name-loading"
      });
      className = `contact-button-loading ${className}`;
    }

    return noContextMenu ? react0().createElement("div", {
      className: "user-card-name light"
    }, label) : react0().createElement(_ui_buttons_jsx4__.Button, {
      className: className,
      icon: dropdownIconClasses,
      disabled: dropdownDisabled,
      label: label
    }, react0().createElement(_ui_dropdowns_jsx5__.Dropdown, {
      className: "context contact-card-dropdown",
      positionMy: dropdownPosition,
      positionAt: dropdownPosition,
      vertOffset: vertOffset,
      horizOffset: horizOffset,
      dropdownItemGenerator: this.dropdownItemGenerator,
      noArrow: true
    }));
  }

}
ContactButton.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactVerified extends _mixins1__.wl {
  attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  }

  render() {
    if (is_chatlink) {
      return null;
    }

    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    if (u_authring && u_authring.Ed25519) {
      var verifyState = u_authring.Ed25519[contact.u] || {};

      if (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        return react0().createElement("div", {
          className: `
                            user-card-verified
                            ${this.props.className || ''}
                        `
        }, react0().createElement("i", {
          className: "sprite-fm-mono icon-check"
        }));
      }
    } else if (!pubEd25519[contact.u]) {
      crypt.getPubEd25519(contact.u).then(() => {
        if (pubEd25519[contact.u]) {
          this.safeForceUpdate();
        }
      });
    }

    return null;
  }

}
ContactVerified.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactPresence extends _mixins1__.wl {
  render() {
    var contact = this.props.contact;
    var className = this.props.className || '';

    if (!contact || !contact.c) {
      return null;
    }

    const pres = megaChat.userPresenceToCssClass(contact.presence);
    return react0().createElement("div", {
      className: `user-card-presence ${pres} ${className}`
    });
  }

}
ContactPresence.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class LastActivity extends _mixins1__._p {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      contact,
      showLastGreen
    } = this.props;

    if (!contact) {
      return null;
    }

    const lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
    const SECONDS = new Date().getTime() / 1000 - lastActivity;
    const timeToLast = SECONDS > 3888000 ? l[20673] : time2last(lastActivity, true);
    const hasActivityStatus = showLastGreen && contact.presence <= 2 && lastActivity;
    return react0().createElement("span", null, hasActivityStatus ? (l[19994] || "Last seen %s").replace("%s", timeToLast) : M.onlineStatusClass(contact.presence)[0]);
  }

}
class ContactAwareName extends _mixins1__._p {
  render() {
    return this.props.contact ? react0().createElement("span", null, this.props.children) : null;
  }

}
class MembersAmount extends _mixins1__._p {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      room
    } = this.props;
    return room ? react0().createElement("span", null, (l[20233] || "%s Members").replace("%s", Object.keys(room.members).length)) : null;
  }

}
class ContactFingerprint extends _mixins1__.wl {
  attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  }

  render() {
    var contact = this.props.contact;

    if (!contact || !contact.u || is_chatlink) {
      return null;
    }

    var infoBlocks = [];
    userFingerprint(contact.u, function (fingerprints) {
      fingerprints.forEach(function (v, k) {
        infoBlocks.push(react0().createElement("span", {
          key: "fingerprint-" + k
        }, v));
      });
    });
    var verifyButton = null;

    if (contact.c === 1 && u_authring && u_authring.Ed25519) {
      var verifyState = u_authring.Ed25519[contact.u] || {};

      if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        verifyButton = react0().createElement(_ui_buttons_jsx4__.Button, {
          className: "dropdown-verify active",
          label: l[7692],
          icon: "sprite-fm-mono icon-key",
          onClick: () => {
            closeDropdowns();
            fingerprintDialog(contact.u);
          }
        });
      }
    }

    var fingerprintCode = null;

    if (infoBlocks.length > 0) {
      fingerprintCode = react0().createElement("div", {
        className: `dropdown-fingerprint ${this.props.className || ''}`
      }, react0().createElement("div", {
        className: "contact-fingerprint-title"
      }, react0().createElement("span", null, l[6872])), react0().createElement("div", {
        className: "contact-fingerprint-txt"
      }, infoBlocks), verifyButton);
    }

    return fingerprintCode;
  }

}
ContactFingerprint.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class Avatar extends _mixins1__._p {
  constructor(...args) {
    super(...args);
    this.attachRerenderCallbacks = _attchRerenderCbContacts;
  }

  render() {
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

    if (!this.props.hideVerifiedBadge && !is_chatlink) {
      verifiedElement = react0().createElement(ContactVerified, {
        contact: this.props.contact,
        className: this.props.verifiedClassName
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

      if (this.props.simpletipClass) {
        extraProps['data-simpletip-class'] = this.props.simpletipClass;
      }
    }

    if (avatarMeta.type === "image") {
      displayedAvatar = react0().createElement("div", (0,_extends8__.Z)({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? e => {
          closeDropdowns();
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, react0().createElement("img", {
        src: avatarMeta.avatar,
        style: this.props.imgStyles
      }));
    } else {
      classes += " color" + avatarMeta.avatar.colorIndex;
      var isLoading = self.isLoadingContactInfo();

      if (isLoading) {
        classes += " default-bg";
      }

      displayedAvatar = react0().createElement("div", (0,_extends8__.Z)({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? e => {
          closeDropdowns();
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, react0().createElement("span", null, isLoading ? "" : avatarMeta.avatar.letters));
    }

    return displayedAvatar;
  }

}
Avatar.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactCard extends _mixins1__._p {
  attachRerenderCallbacks() {
    _attchRerenderCbContacts.call(this, ['presence']);
  }

  specShouldComponentUpdate(nextProps, nextState) {
    var self = this;
    var foundKeys = Object.keys(self.props);

    if (foundKeys.indexOf('dropdowns') >= 0) {
      array.remove(foundKeys, 'dropdowns', true);
    }

    let shouldUpdate;

    if (foundKeys.length) {
      let k = foundKeys[0];
      shouldUpdate = shallowEqual(nextProps[k], self.props[k]);
    }

    if (!shouldUpdate) {
      shouldUpdate = shallowEqual(nextState, self.state);
    }

    if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {
      if (self.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
        var oldKeys = self.state.props.dropdowns.map(child => child.key);
        var newKeys = nextProps.state.dropdowns.map(child => child.key);

        if (!shallowEqual(oldKeys, newKeys)) {
          shouldUpdate = true;
        }
      }
    }

    return shouldUpdate;
  }

  render() {
    var self = this;
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    var pres = megaChat.userPresenceToCssClass(contact.presence);
    var username = (this.props.namePrefix ? this.props.namePrefix : "") + (M.getNameByHandle(contact.u) || contact.m);

    if (contact.u === u_handle) {
      username += " (" + escapeHTML(l[8885]) + ")";
    }

    var escapedUsername = react0().createElement(_ui_utils_jsx2__.OFlowEmoji, null, username);
    var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
    var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
    var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
    var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];
    var highlightSearchValue = self.props.highlightSearchValue ? self.props.highlightSearchValue : false;
    var emailTooltips = self.props.emailTooltips ? self.props.emailTooltips : false;
    var searchValue = self.props.searchValue ? self.props.searchValue : "";
    var usernameBlock;

    if (!noContextMenu) {
      usernameBlock = react0().createElement(ContactButton, {
        key: "lnk",
        dropdowns: dropdowns,
        noContextMenu: noContextMenu,
        contact: contact,
        className: "light",
        label: escapedUsername,
        chatRoom: this.props.chatRoom,
        dropdownRemoveButton: dropdownRemoveButton,
        verticalOffset: 0
      });
    } else {
      if (highlightSearchValue && searchValue.length > 0) {
        var matches = [];
        var regex = new RegExp(RegExpEscape(searchValue), 'gi');
        var result;

        while (result = regex.exec(username)) {
          matches.push({
            idx: result.index,
            str: result[0]
          });
        }

        if (matches.length > 0) {
          escapedUsername = react0().createElement(_ui_utils_jsx2__.ParsedHTML, null, megaChat.highlight(megaChat.html(username), matches, true));
        }
      }

      if (emailTooltips) {
        usernameBlock = react0().createElement("div", {
          className: "user-card-name light simpletip",
          "data-simpletip": contact.m,
          "data-simpletipposition": "top"
        }, escapedUsername);
      } else {
        usernameBlock = react0().createElement("div", {
          className: "user-card-name light"
        }, escapedUsername);
      }
    }

    var userCard = null;
    var className = this.props.className || "";

    if (className.indexOf("short") >= 0) {
      userCard = react0().createElement("div", {
        className: "user-card-data"
      }, usernameBlock, react0().createElement("div", {
        className: "user-card-status"
      }, react0().createElement(ContactPresence, {
        contact: contact,
        className: this.props.presenceClassName
      }), this.props.isInCall ? react0().createElement("div", {
        className: "audio-call"
      }, react0().createElement("i", {
        className: "sprite-fm-mono icon-phone"
      })) : null, react0().createElement(LastActivity, {
        contact: contact,
        showLastGreen: this.props.showLastGreen
      })));
    } else {
      userCard = react0().createElement("div", {
        className: "user-card-data"
      }, usernameBlock, react0().createElement(ContactPresence, {
        contact: contact,
        className: this.props.presenceClassName
      }), this.props.isInCall ? react0().createElement("div", {
        className: "audio-call"
      }, react0().createElement("i", {
        className: "sprite-fm-mono icon-phone"
      })) : null, react0().createElement("div", {
        className: "user-card-email"
      }, contact.m));
    }

    var selectionTick = null;

    if (this.props.selectable) {
      selectionTick = react0().createElement("div", {
        className: "user-card-tick-wrap"
      }, react0().createElement("i", {
        className: "sprite-fm-mono icon-check"
      }));
    }

    return react0().createElement("div", {
      className: "contacts-info body " + (pres === "offline" ? "offline" : "") + (className ? " " + className : ""),
      onClick: e => {
        if (self.props.onClick) {
          self.props.onClick(contact, e);
        }
      },
      onDoubleClick: e => {
        if (self.props.onDoubleClick) {
          self.props.onDoubleClick(contact, e);
        }
      },
      style: self.props.style
    }, react0().createElement(Avatar, {
      contact: contact,
      className: "avatar-wrapper small-rounded-avatar",
      chatRoom: this.props.chatRoom
    }), is_chatlink || noContextButton ? null : react0().createElement(ContactButton, {
      key: "button",
      dropdowns: dropdowns,
      dropdownIconClasses: self.props.dropdownIconClasses ? self.props.dropdownIconClasses : "",
      disabled: self.props.dropdownDisabled,
      noContextMenu: noContextMenu,
      contact: contact,
      className: self.props.dropdownButtonClasses,
      dropdownRemoveButton: dropdownRemoveButton,
      noLoading: self.props.noLoading,
      chatRoom: self.props.chatRoom,
      verticalOffset: 0
    }), selectionTick, userCard);
  }

}
ContactCard.defaultProps = {
  'dropdownButtonClasses': "tiny-button",
  'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
  'presenceClassName': '',
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactItem extends _mixins1__._p {
  constructor(...args) {
    super(...args);
    this.attachRerenderCallbacks = _attchRerenderCbContacts;
  }

  render() {
    var self = this;
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);
    return react0().createElement("div", {
      className: "selected-contact-card short"
    }, react0().createElement("div", {
      className: "remove-contact-bttn",
      onClick: e => {
        if (self.props.onClick) {
          self.props.onClick(contact, e);
        }
      }
    }, react0().createElement("i", {
      className: "tiny-icon small-cross"
    })), react0().createElement(Avatar, {
      contact: contact,
      className: "avatar-wrapper small-rounded-avatar",
      hideVerifiedBadge: true,
      chatRoom: this.props.chatRoom
    }), react0().createElement("div", {
      className: "user-card-data simpletip",
      "data-simpletip": username,
      "data-simpletipposition": "top"
    }, react0().createElement(ContactButton, {
      noContextMenu: this.props.noContextMenu,
      contact: contact,
      className: "light",
      label: react0().createElement(_ui_utils_jsx2__.Emoji, null, username),
      chatRoom: this.props.chatRoom
    })));
  }

}
ContactItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactPickerWidget extends _mixins1__.wl {
  constructor(props) {
    super(props);
    this.contactLinkListener = null;
    this.containerRef = react0().createRef();

    this.onSearchChange = ev => {
      this.setState({
        searchValue: ev.target.value
      });
    };

    this.state = {
      searchValue: '',
      selected: this.props.selected || false,
      publicLink: M.account && M.account.contactLink || undefined
    };
  }

  componentDidMount() {
    super.componentDidMount();
    setContactLink(this.containerRef && this.containerRef.current);
    this.contactLinkListener = mBroadcaster.addListener('contact:setContactLink', publicLink => this.state.publicLink ? null : this.setState({
      publicLink
    }));
  }

  componentDidUpdate() {
    var self = this;

    if (self.scrollToLastSelected && self.psSelected) {
      self.scrollToLastSelected = false;
      self.psSelected.scrollToPercentX(100, false);
    }
  }

  componentWillMount() {
    if (super.componentWillMount) {
      super.componentWillMount();
    }

    var self = this;

    if (self.props.multiple) {
      $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function (e) {
        var keyCode = e.which || e.keyCode;

        if (keyCode === 13) {
          if (self.state.selected) {
            e.preventDefault();
            e.stopPropagation();
            closeDropdowns();

            if (self.props.onSelectDone) {
              self.props.onSelectDone(self.state.selected);
            }
          }
        }
      });
    }

    self._frequents = megaChat.getFrequentContacts();

    self._frequents.always(function (r) {
      if (self.props.disableFrequents) {
        self._foundFrequents = [];
      } else {
        self._foundFrequents = r.slice(Math.max(r.length - 30, 0), r.length).reverse();
      }

      self.safeForceUpdate();
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    delete self._foundFrequents;
    delete self._frequents;

    if (self.props.multiple) {
      $(document.body).off('keypress.contactPicker' + self.getUniqueId());
    }

    if (this.contactLinkListener) {
      mBroadcaster.removeListener(this.contactLinkListener);
    }
  }

  _eventuallyAddContact(v, contacts, selectableContacts, forced) {
    var self = this;

    if (!forced && (v.c !== 1 || v.u === u_handle)) {
      return false;
    }

    if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
      return false;
    }

    var isDisabled = false;

    if (!self.wasMissingKeysForContacts) {
      self.wasMissingKeysForContacts = {};
    }

    if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      self.wasMissingKeysForContacts[v.u] = true;

      ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u]).always(function () {
        if (self.isMounted()) {
          self.safeForceUpdate();
        }
      });

      isDisabled = true;
      return true;
    } else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      return false;
    }

    var pres = megaChat.getPresence(v.u);
    var avatarMeta = generateAvatarMeta(v.u);

    if (self.state.searchValue && self.state.searchValue.length > 0) {
      var userName = ChatSearch._normalize_str(avatarMeta.fullName.toLowerCase());

      var userRealName = ChatSearch._normalize_str(v.name.toLowerCase());

      var userEmail = ChatSearch._normalize_str(v.m.toLowerCase());

      if (userName.indexOf(self.state.searchValue.toLowerCase()) === -1 && userRealName.indexOf(self.state.searchValue.toLowerCase()) === -1 && (userEmail.indexOf(self.state.searchValue.toLowerCase()) === -1 || self.props.notSearchInEmails)) {
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

    contacts.push(react0().createElement(ContactCard, {
      disabled: isDisabled,
      contact: v,
      chatRoom: false,
      className: "contacts-search short " + selectedClass + (isDisabled ? " disabled" : ""),
      noContextButton: "true",
      selectable: selectableContacts,
      onClick: self.props.readOnly ? () => {} : contact => {
        if (isDisabled) {
          return false;
        }

        var contactHash = contact.u;

        if (contactHash === self.lastClicked && new Date() - self.clickTime < 500 && !self.props.disableDoubleClick || !self.props.multiple) {
          if (self.props.onSelected) {
            self.props.onSelected([contactHash]);
          }

          self.props.onSelectDone([contactHash]);
          closeDropdowns();
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

          self.setState({
            'selected': selected
          });

          if (self.props.selectCleanSearchRes) {
            self.setState({
              'searchValue': ''
            });
          }

          if (self.props.autoFocusSearchField) {
            self.contactSearchField.focus();
          }
        }

        self.clickTime = new Date();
        self.lastClicked = contactHash;
      },
      noContextMenu: true,
      searchValue: self.state.searchValue,
      highlightSearchValue: self.props.highlightSearchValue,
      emailTooltips: self.props.emailTooltips,
      key: v.u
    }));

    if (typeof this.props.onEventuallyUpdated === 'function') {
      this.props.onEventuallyUpdated();
    }

    return true;
  }

  render() {
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

    var onAddContact = e => {
      e.preventDefault();
      e.stopPropagation();
      contactAddDialog();

      if (this.props.onClose) {
        this.props.onClose();
      }
    };

    if (self.props.readOnly) {
      var sel = self.state.selected || [];

      for (var i = 0; i < sel.length; i++) {
        var v = sel[i];
        contactsSelected.push(react0().createElement(ContactItem, {
          contact: M.u[v],
          key: v,
          chatRoom: self.props.chatRoom
        }));
      }
    } else if (self.props.multiple) {
      selectableContacts = true;

      var onSelectDoneCb = e => {
        e.preventDefault();
        e.stopPropagation();
        closeDropdowns();

        if (self.props.onSelectDone) {
          self.props.onSelectDone(self.state.selected);
        }
      };

      var onContactSelectDoneCb = contact => {
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

          self.setState({
            'selected': selected
          });

          if (self.props.selectCleanSearchRes) {
            self.setState({
              'searchValue': ''
            });
          }

          if (self.props.autoFocusSearchField) {
            self.contactSearchField.focus();
          }
        }

        self.clickTime = new Date();
        self.lastClicked = contactHash;
      };

      var selectedWidthSize = self.props.selectedWidthSize || 54;
      var selectedWidth = self.state.selected.length * selectedWidthSize;

      if (!self.state.selected || self.state.selected.length === 0) {
        selectedContacts = false;
        var emptySelectionMsg = self.props.emptySelectionMsg || l[8889];
        multipleContacts = react0().createElement("div", {
          className: "horizontal-contacts-list"
        }, react0().createElement("div", {
          className: "contacts-list-empty-txt"
        }, self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : emptySelectionMsg));
      } else {
        selectedContacts = true;
        onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
        var sel2 = self.state.selected || [];

        for (var i2 = 0; i2 < sel2.length; i2++) {
          var v2 = sel2[i2];
          contactsSelected.push(react0().createElement(ContactItem, {
            key: v2,
            chatRoom: self.props.chatRoom || false,
            contact: M.u[v2],
            noContextMenu: true,
            onClick: onContactSelectDoneCb
          }));
        }

        multipleContacts = react0().createElement("div", {
          className: "horizontal-contacts-list"
        }, react0().createElement(_ui_perfectScrollbar_jsx3__.F, {
          className: "perfectScrollbarContainer selected-contact-block horizontal-only",
          selected: this.state.selected,
          ref: function (psSelected) {
            self.psSelected = psSelected;
          }
        }, react0().createElement("div", {
          className: "select-contact-centre",
          style: {
            width: selectedWidth
          }
        }, contactsSelected)));
      }

      if (self.props.selectFooter) {
        selectFooter = react0().createElement("footer", null, react0().createElement("button", {
          className: "mega-button",
          onClick: onAddContact.bind(self)
        }, react0().createElement("span", null, l[71])), react0().createElement("div", {
          className: "footer-spacing"
        }), react0().createElement("button", {
          className: `mega-button ${selectedContacts ? '' : 'disabled'}`,
          onClick: function (e) {
            if (self.state.selected.length > 0) {
              onSelectDoneCb(e);
            }
          }
        }, react0().createElement("span", null, this.props.multipleSelectedButtonLabel ? this.props.multipleSelectedButtonLabel : l[8890])));
      }
    }

    const {
      showTopButtons
    } = this.props;

    if (showTopButtons) {
      topButtons = react0().createElement("div", {
        className: "contacts-search-buttons"
      }, showTopButtons.map(button => {
        const {
          key,
          icon,
          className,
          title,
          onClick
        } = button;
        return react0().createElement("div", {
          key: key,
          className: "button-wrapper"
        }, react0().createElement(_ui_buttons_jsx4__.Button, {
          className: `
                                        ${className || ''}
                                        ${key === 'newChatLink' ? 'branded-blue' : ''}
                                        mega-button
                                        round
                                    `,
          icon: icon,
          onClick: e => {
            closeDropdowns();
            onClick(e);
          }
        }), react0().createElement("span", {
          className: "button-title"
        }, title));
      }));
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
        if (totalFound < MAX_FREQUENTS && v.userId in M.u && self._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
          alreadyAdded[v.userId] = 1;
          totalFound++;
        }
      });
    }

    self.props.contacts.forEach(function (v) {
      alreadyAdded[v.h] || self._eventuallyAddContact(v, contacts, selectableContacts);
    });
    var sortFn = M.getSortByNameFn2(1);
    contacts.sort(function (a, b) {
      return sortFn(a.props.contact, b.props.contact);
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
        contacts = react0().createElement("em", null, noContactsMsg);
      }
    }

    var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;
    var contactsList;

    if (haveContacts) {
      if (frequentContacts.length === 0 && noOtherContacts) {
        if (self.props.newEmptySearchResult) {
          contactsList = react0().createElement("div", {
            className: "chat-contactspicker-no-contacts searching"
          }, react0().createElement("div", {
            className: "section-icon sprite-fm-mono icon-contacts"
          }), react0().createElement("div", {
            className: "fm-empty-cloud-txt small"
          }, l[8674]));
        } else {
          contactsList = react0().createElement("div", {
            className: "chat-contactspicker-no-contacts"
          }, react0().createElement("div", {
            className: "contacts-list-header"
          }, l[165]), react0().createElement("div", {
            className: "section-icon sprite-fm-mono icon-contacts"
          }), react0().createElement("div", {
            className: "fm-empty-cloud-txt small"
          }, l[784]), react0().createElement("div", {
            className: "fm-empty-description small"
          }, l[19115]));
        }
      } else {
        contactsList = react0().createElement(_ui_utils_jsx2__["default"].JScrollPane, {
          className: "contacts-search-scroll",
          selected: this.state.selected,
          changedHashProp: this.props.changedHashProp,
          contacts: contacts,
          frequentContacts: frequentContacts,
          searchValue: this.state.searchValue
        }, react0().createElement("div", null, react0().createElement("div", {
          className: "contacts-search-subsection",
          style: {
            'display': !hideFrequents ? "" : "none"
          }
        }, react0().createElement("div", {
          className: "contacts-list-header"
        }, l[20141]), frequentsLoading ? react0().createElement("div", {
          className: "loading-spinner"
        }, "...") : react0().createElement("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, frequentContacts)), contacts.length > 0 ? react0().createElement("div", {
          className: "contacts-search-subsection"
        }, react0().createElement("div", {
          className: "contacts-list-header"
        }, frequentContacts.length === 0 ? self.props.readOnly ? l[16217] : l[165] : l[165]), react0().createElement("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, contacts)) : undefined));
      }
    } else if (self.props.newNoContact) {
      multipleContacts = "";
      contactsList = react0().createElement("div", {
        className: "chat-contactspicker-no-contacts"
      }, react0().createElement("div", {
        className: "section-icon sprite-fm-mono icon-contacts"
      }), react0().createElement("div", {
        className: "fm-empty-cloud-txt small"
      }, l[784]), react0().createElement("div", {
        className: "fm-empty-description small"
      }, l[19115]));
      extraClasses += " no-contacts";
    } else {
      contactsList = react0().createElement("div", {
        className: "chat-contactspicker-no-contacts"
      }, react0().createElement("div", {
        className: "section-icon sprite-fm-mono icon-contacts"
      }), react0().createElement("div", {
        className: "fm-empty-cloud-txt small"
      }, l[784]), react0().createElement("div", {
        className: "fm-empty-description small"
      }, l[19115]), react0().createElement("button", {
        className: "mega-button positive large fm-empty-button",
        onClick: function () {
          contactAddDialog();

          if (self.props.onClose) {
            self.props.onClose();
          }
        }
      }, react0().createElement("span", null, l[101])), react0().createElement("div", {
        className: `
                        ${this.state.publicLink ? '' : 'loading'}
                        empty-share-public
                    `
      }, react0().createElement("i", {
        className: "sprite-fm-mono icon-link-circle"
      }), react0().createElement(_ui_utils_jsx2__.ParsedHTML, null, l[19111])));
      extraClasses += " no-contacts";
    }

    const totalContactsNum = contacts.length + frequentContacts.length;
    const searchPlaceholderMsg = mega.icu.format(l.search_contact_placeholder, totalContactsNum);
    return react0().createElement("div", {
      ref: this.containerRef,
      className: `
                    ${this.props.className || ''}
                    ${extraClasses}
                `
    }, topButtons, multipleContacts, !this.props.readOnly && haveContacts && react0().createElement((react0().Fragment), null, react0().createElement("div", {
      className: `
                                contacts-search-header
                                ${this.props.headerClasses}
                            `
    }, react0().createElement("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), react0().createElement("input", {
      autoFocus: true,
      type: "search",
      placeholder: searchPlaceholderMsg,
      ref: nodeRef => {
        this.contactSearchField = nodeRef;
      },
      onChange: this.onSearchChange,
      value: this.state.searchValue
    }), react0().createElement("div", {
      className: `
                                    search-result-clear
                                    ${this.state.searchValue && this.state.searchValue.length > 0 ? '' : 'hidden'}
                                `,
      onClick: () => {
        this.setState({
          searchValue: ''
        }, () => this.contactSearchField.focus());
      }
    }, react0().createElement("i", {
      className: "sprite-fm-mono icon-close-component"
    }))), react0().createElement("div", {
      className: "contacts-search-header-separator"
    })), contactsList, selectFooter, _contactsPanel_contactsPanel_jsx6__.Z.hasContacts() && this.props.showAddContact && react0().createElement("div", {
      className: "contacts-search-bottom"
    }, react0().createElement(_ui_buttons_jsx4__.Button, {
      className: "mega-button action positive",
      icon: "sprite-fm-mono icon-add-circle",
      label: l[18759],
      onClick: () => {
        contactAddDialog();
        closeDropdowns();
      }
    })));
  }

}
ContactPickerWidget.defaultProps = {
  multipleSelectedButtonLabel: false,
  singleSelectedButtonLabel: false,
  nothingSelectedButtonLabel: false,
  allowEmpty: false,
  disableFrequents: false,
  notSearchInEmails: false,
  autoFocusSearchField: true,
  selectCleanSearchRes: true,
  disableDoubleClick: false,
  newEmptySearchResult: false,
  newNoContact: false,
  emailTooltips: false
};
class ContactPickerDialog extends _mixins1__.wl {
  render() {
    const {
      active,
      allowEmpty,
      className,
      exclude,
      megaChat,
      multiple,
      multipleSelectedButtonLabel,
      name,
      nothingSelectedButtonLabel,
      selectFooter,
      showTopButtons,
      singleSelectedButtonLabel,
      onClose,
      onSelectDone
    } = this.props;
    return react0().createElement(_ui_modalDialogs7__.Z.ModalDialog, {
      name: name,
      className: `${className} contact-picker-dialog contacts-search`,
      onClose: onClose
    }, react0().createElement(ContactPickerWidget, {
      active: active,
      allowEmpty: allowEmpty,
      className: 'popup contacts-search small-footer',
      contacts: M.u,
      exclude: exclude,
      megaChat: megaChat,
      multiple: multiple,
      multipleSelectedButtonLabel: multipleSelectedButtonLabel,
      nothingSelectedButtonLabel: nothingSelectedButtonLabel,
      selectFooter: selectFooter,
      showTopButtons: showTopButtons,
      singleSelectedButtonLabel: singleSelectedButtonLabel,
      onClose: onClose,
      onSelectDone: onSelectDone
    }));
  }

}

/***/ }),

/***/ 105:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (ContactsPanel)
});

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
var buttons = __webpack_require__(204);
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/navigation.jsx




class Navigation extends mixins.wl {
  render() {
    const {
      view
    } = this.props;
    const {
      receivedRequestsCount
    } = this.props;
    const {
      VIEW,
      LABEL
    } = ContactsPanel;
    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
      className: "contacts-navigation"
    }, external_React_default().createElement("ul", null, Object.keys(VIEW).map(key => {
      let activeClass = view === VIEW[key] ? 'active' : '';

      if (view === VIEW.PROFILE && VIEW[key] === VIEW.CONTACTS) {
        activeClass = 'active';
      }

      if (VIEW[key] !== VIEW.PROFILE) {
        return external_React_default().createElement("li", {
          key: key,
          onClick: () => {
            let page = key.toLowerCase().split("_")[0];
            page = page === 'contacts' ? '' : page;
            loadSubPage(`fm/chat/contacts/${page}`);
          }
        }, external_React_default().createElement(buttons.Button, {
          className: `
                                                mega-button
                                                action
                                                ${activeClass}
                                            `,
          receivedRequestsCount: receivedRequestsCount
        }, external_React_default().createElement("span", null, LABEL[key]), receivedRequestsCount > 0 && VIEW[key] === VIEW.RECEIVED_REQUESTS && external_React_default().createElement("div", {
          className: "notifications-count"
        }, receivedRequestsCount > 9 ? '9+' : receivedRequestsCount)));
      }

      return null;
    }))), ContactsPanel.hasContacts() ? null : external_React_default().createElement("div", {
      className: "back-to-landing"
    }, external_React_default().createElement(buttons.Button, {
      className: "mega-button action",
      icon: "sprite-fm-mono icon-left",
      onClick: () => loadSubPage('fm/chat')
    }, l.back_to_chat_landing_page)));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/nil.jsx
var nil = __webpack_require__(479);
// EXTERNAL MODULE: ./js/ui/jsx/fm/fmView.jsx + 9 modules
var fmView = __webpack_require__(61);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var contacts = __webpack_require__(13);
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx + 1 modules
var genericNodePropsComponent = __webpack_require__(297);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactName.jsx




class ColumnContactName extends genericNodePropsComponent.L {
  constructor(...args) {
    super(...args);
    this.Mail = (0,utils.withOverflowObserver)(() => external_React_default().createElement("span", {
      className: "contact-item-email"
    }, this.props.nodeAdapter.props.node.m));
  }

  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", null, external_React_default().createElement(contacts.Avatar, {
      contact: node,
      className: "avatar-wrapper box-avatar"
    }), external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-user"
    }, external_React_default().createElement(utils.OFlowEmoji, null, nodeAdapter.nodeProps.title)), external_React_default().createElement(this.Mail, null)), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}
ColumnContactName.sortable = true;
ColumnContactName.id = "name";
ColumnContactName.label = l[86];
ColumnContactName.megatype = "name";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactStatus.jsx


class ColumnContactStatus extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let onlineStatus = nodeAdapter.nodeProps.onlineStatus;
    return external_React_default().createElement("td", {
      megatype: ColumnContactStatus.megatype,
      className: ColumnContactStatus.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-status"
    }, external_React_default().createElement("div", {
      className: "user-card-presence " + onlineStatus[1]
    }), onlineStatus[0])));
  }

}
ColumnContactStatus.sortable = true;
ColumnContactStatus.id = "status";
ColumnContactStatus.label = l[89];
ColumnContactStatus.megatype = "status";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactLastInteraction.jsx


class ColumnContactLastInteraction extends genericNodePropsComponent.L {
  constructor(...args) {
    super(...args);

    this.getLastInteractionIcon = handle => {
      const {
        interactions
      } = this.props;
      const interaction = interactions[handle];
      const {
        type,
        time
      } = interaction || {
        type: undefined,
        time: undefined
      };
      return external_React_default().createElement("i", {
        className: `
                    sprite-fm-mono
                    ${parseInt(type, 10) === 0 ? 'icon-cloud' : ''}
                    ${parseInt(type, 10) === 1 ? 'icon-chat' : ''}
                    ${!time ? 'icon-minimise' : ''}
                `
      });
    };

    this.getLastInteractionTime = handle => {
      const {
        interactions
      } = this.props;
      const interaction = interactions[handle];
      return interaction ? time2last(interaction.time) : l[1051];
    };
  }

  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", {
      megatype: ColumnContactLastInteraction.megatype,
      className: ColumnContactLastInteraction.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-time"
    }, this.getLastInteractionIcon(node.h), this.getLastInteractionTime(node.h))));
  }

}
ColumnContactLastInteraction.sortable = true;
ColumnContactLastInteraction.id = "interaction";
ColumnContactLastInteraction.label = l[5904];
ColumnContactLastInteraction.megatype = "interaction";
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var dropdowns = __webpack_require__(78);
// EXTERNAL MODULE: ./js/chat/ui/meetings/call.jsx + 23 modules
var call = __webpack_require__(357);
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/contextMenu.jsx







class ContextMenu extends mixins.wl {
  constructor(props) {
    super(props);
    this.EVENT_CLOSE = new Event('closeDropdowns');

    this.close = callback => {
      if (callback && typeof callback === 'function' && !M.isInvalidUserStatus()) {
        callback();
      }

      document.dispatchEvent(this.EVENT_CLOSE);
    };

    this.handleSetNickname = handle => this.close(() => nicknames.setNicknameDialog.init(handle));

    this.handleAddContact = handle => {
      M.syncContactEmail(handle, new MegaPromise(), true).done(email => {
        const OPC = Object.values(M.opc);
        const ALREADY_SENT = OPC && OPC.length && OPC.some(opc => opc.m === email);
        this.close(() => {
          if (ALREADY_SENT) {
            return msgDialog('warningb', '', l[17545]);
          }

          msgDialog('info', l[150], l[5898]);
          M.inviteContact(M.u[u_handle].m, email);
        });
      });
    };
  }

  render() {
    const {
      contact,
      selected,
      withProfile
    } = this.props;

    if (ContactsPanel.hasRelationship(contact)) {
      return external_React_default().createElement((external_React_default()).Fragment, null, withProfile && external_React_default().createElement("div", {
        className: "dropdown-avatar rounded",
        onClick: e => {
          e.stopPropagation();
          loadSubPage(`fm/chat/contacts/${contact.h}`);
        }
      }, external_React_default().createElement(contacts.Avatar, {
        contact: contact,
        className: "avatar-wrapper context-avatar"
      }), external_React_default().createElement("div", {
        className: "dropdown-profile"
      }, external_React_default().createElement("span", null, external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(contact.u))), external_React_default().createElement(contacts.ContactPresence, {
        contact: contact
      }))), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-chat",
        label: l[8632],
        onClick: () => this.close(() => {
          if (selected && selected.length) {
            return megaChat.createAndShowGroupRoomFor(selected, '', true, false);
          }

          return loadSubPage(`fm/chat/p/${contact.u}`);
        })
      }), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-send-files",
        label: l[6834],
        onClick: () => this.close(() => megaChat.openChatAndSendFilesDialog(contact.u))
      }), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-folder-outgoing-share",
        label: l[5631],
        onClick: () => this.close(() => openCopyShareDialog(contact.u))
      }), external_React_default().createElement(dropdowns.DropdownItem, {
        submenu: true,
        icon: "sprite-fm-mono icon-phone",
        className: "sprite-fm-mono-before icon-arrow-right-before",
        label: l[19125]
      }), external_React_default().createElement("div", {
        className: "dropdown body submenu"
      }, external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-phone",
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        label: l[5896],
        onClick: () => (0,call.xt)().then(() => this.close(() => megaChat.createAndShowPrivateRoom(contact.u).then(room => {
          room.setActive();
          room.startAudioCall();
        }))).catch(() => d && console.warn('Already in a call.'))
      }), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-video-call-filled",
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        label: l[5897],
        onClick: () => (0,call.xt)().then(() => this.close(() => megaChat.createAndShowPrivateRoom(contact.u).then(room => {
          room.setActive();
          room.startVideoCall();
        }))).catch(() => d && console.warn('Already in a call.'))
      })), external_React_default().createElement("hr", null), withProfile && external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-my-account",
        label: l[5868],
        onClick: () => loadSubPage(`fm/chat/contacts/${contact.u}`)
      }), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-rename",
        label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
        onClick: () => this.handleSetNickname(contact.u)
      }), external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
        submenu: true,
        icon: "sprite-fm-mono icon-key",
        className: "sprite-fm-mono-before icon-arrow-right-before",
        label: l[6872]
      }), external_React_default().createElement("div", {
        className: "dropdown body white-context-menu submenu"
      }, ContactsPanel.isVerified(contact) ? external_React_default().createElement(dropdowns.DropdownItem, {
        label: l[742],
        onClick: () => this.close(() => ContactsPanel.resetCredentials(contact))
      }) : external_React_default().createElement(dropdowns.DropdownItem, {
        label: l[1960],
        onClick: () => this.close(() => ContactsPanel.verifyCredentials(contact))
      })), external_React_default().createElement("div", {
        className: "dropdown-credentials"
      }, ContactsPanel.getUserFingerprint(contact.u)), external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-disable",
        label: l[1001],
        disabled: !!contact.b,
        className: "",
        onClick: () => this.close(() => fmremove(contact.u))
      }));
    }

    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-disabled-filled",
      label: l[71],
      onClick: () => this.handleAddContact(contact.u)
    }), external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-rename",
      label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
      onClick: () => this.handleSetNickname(contact.u)
    }));
  }

}
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactButtons.jsx





class ColumnContactButtons extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node,
      selected
    } = nodeAdapter.props;
    let handle = node.h;
    return external_React_default().createElement("td", {
      megatype: ColumnContactButtons.megatype,
      className: ColumnContactButtons.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-controls"
    }, external_React_default().createElement(buttons.Button, {
      className: "mega-button action simpletip",
      icon: "sprite-fm-mono icon-chat",
      attrs: {
        'data-simpletip': l[8632]
      },
      onClick: () => loadSubPage('fm/chat/p/' + handle)
    }), external_React_default().createElement(buttons.Button, {
      className: "mega-button action simpletip",
      icon: "sprite-fm-mono icon-folder-outgoing-share",
      attrs: {
        'data-simpletip': l[5631]
      },
      onClick: () => openCopyShareDialog(handle)
    }), external_React_default().createElement(buttons.Button, {
      ref: node => {
        this.props.onContextMenuRef(handle, node);
      },
      className: "mega-button action contact-more",
      icon: "sprite-fm-mono icon-options"
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "context",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      positionLeft: this.props.contextMenuPosition || null,
      horizOffset: 4,
      onActiveChange: opened => {
        this.props.onActiveChange(opened);
      }
    }, external_React_default().createElement(ContextMenu, {
      contact: node,
      selected: selected,
      withProfile: true
    }))))));
  }

}
ColumnContactButtons.sortable = true;
ColumnContactButtons.id = "grid-url-header-nw";
ColumnContactButtons.label = "";
ColumnContactButtons.megatype = "grid-url-header-nw";
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/contactList.jsx








class ContactList extends mixins.wl {
  constructor(props) {
    super(props);
    this.contextMenuRefs = [];
    this.state = {
      selected: [],
      searchValue: null,
      interactions: {},
      contextMenuPosition: null
    };

    this.getLastInteractions = () => {
      const {
        contacts
      } = this.props;
      let interactions = {};
      let promises = [];

      for (let handle in contacts) {
        if (contacts.hasOwnProperty(handle)) {
          promises.push(getLastInteractionWith(handle, true, true).done(timestamp => {
            const [type, time] = timestamp.split(':');
            interactions[handle] = {
              'u': handle,
              'type': type,
              'time': time
            };
          }));
        }
      }

      Promise.allSettled(promises).then(() => {
        if (!this.isMounted()) {
          return;
        }

        this.setState({
          'interactions': interactions
        });
      }).catch(() => {
        console.error("Failed to retrieve last interactions.");
      });
    };

    this.handleContextMenu = (ev, handle) => {
      ev.persist();

      if (this.state.selected.length > 1) {
        return null;
      }

      this.setState({
        contextMenuPosition: ev.clientX
      }, () => {
        let ref = this.contextMenuRefs[handle];

        if (ref && ref.isMounted()) {
          this.contextMenuRefs[handle].onClick(ev);
        }
      });
    };

    this.onSelected = this.onSelected.bind(this);
    this.onHighlighted = this.onHighlighted.bind(this);
    this.onExpand = this.onExpand.bind(this);
    this.onAttachClicked = this.onAttachClicked.bind(this);
  }

  componentDidMount() {
    super.componentDidMount();
    this.getLastInteractions();
  }

  onSelected(handle) {
    this.setState({
      'selected': handle
    });
  }

  onHighlighted(handle) {
    this.setState({
      'highlighted': handle
    });
  }

  onExpand(handle) {
    loadSubPage('/fm/chat/contacts/' + handle);
  }

  onAttachClicked() {
    if (this.state.selected[0]) {
      this.onExpand(this.state.selected[0]);
    }
  }

  render() {
    const {
      contacts
    } = this.props;

    if (contacts && contacts.length > 1) {
      return external_React_default().createElement("div", {
        className: "contacts-list"
      }, external_React_default().createElement(fmView.Z, {
        dataSource: this.props.contacts,
        customFilterFn: r => {
          return r.c === 1;
        },
        currentlyViewedEntry: "contacts",
        onSelected: this.onSelected,
        onHighlighted: this.onHighlighted,
        searchValue: this.state.searchValue,
        onExpand: this.onExpand,
        onAttachClicked: this.onAttachClicked,
        viewMode: 0,
        currentdirid: "contacts",
        megaListItemHeight: 59,
        headerContainerClassName: "contacts-table contacts-table-head",
        containerClassName: "contacts-table contacts-table-results",
        onContextMenu: (ev, handle) => this.handleContextMenu(ev, handle),
        listAdapterColumns: [ColumnContactName, ColumnContactStatus, [ColumnContactLastInteraction, {
          interactions: this.state.interactions
        }], [ColumnContactButtons, {
          onContextMenuRef: (handle, node) => {
            this.contextMenuRefs[handle] = node;
          },
          onActiveChange: opened => {
            if (!opened) {
              this.setState({
                contextMenuPosition: null
              });
            }
          },
          contextMenuPosition: this.state.contextMenuPosition
        }]],
        initialSortBy: ['status', 'asc'],
        fmConfigSortEnabled: true,
        fmConfigSortId: "contacts",
        NilComponent: external_React_default().createElement(nil.Z, {
          title: l[5737]
        })
      }));
    }

    return external_React_default().createElement(nil.Z, {
      title: l[5737]
    });
  }

}
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactRequestsEmail.jsx



class ColumnContactRequestsEmail extends mixins.wl {
  render() {
    const {
      nodeAdapter,
      currView
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", null, currView && currView === 'opc' ? external_React_default().createElement("span", null, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-send-requests"
    })) : external_React_default().createElement(utils.ParsedHTML, null, useravatar.contact(node.m, 'box-avatar')), external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-user"
    }, node.m)), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}
ColumnContactRequestsEmail.sortable = true;
ColumnContactRequestsEmail.id = "email";
ColumnContactRequestsEmail.label = l[95];
ColumnContactRequestsEmail.megatype = "email";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactRequestsTs.jsx


class ColumnContactRequestsTs extends mixins.wl {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    let timestamp = node.rts || node.ts;

    if (timestamp) {
      timestamp = time2last(timestamp);
    } else {
      timestamp = node.dts ? l[6112] : "";
    }

    return external_React_default().createElement("td", null, external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-time"
    }, timestamp)), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}
ColumnContactRequestsTs.sortable = true;
ColumnContactRequestsTs.id = "ts";
ColumnContactRequestsTs.label = l[19506];
ColumnContactRequestsTs.megatype = "ts";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactRequestsRcvdBtns.jsx



class ColumnContactRequestsRcvdBtns extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.reinviteAllowed = rts => {
      const UTC_DATE_NOW = Math.floor(Date.now() / 1000);
      return UTC_DATE_NOW > rts + 1209600;
    };
  }

  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", {
      megatype: ColumnContactRequestsRcvdBtns.megatype,
      className: ColumnContactRequestsRcvdBtns.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item-controls"
    }, external_React_default().createElement(buttons.Button, {
      className: "mega-button action contact-reject",
      icon: "sprite-fm-mono icon-close-component",
      label: l[20981],
      onClick: () => this.props.onReject(node.p)
    }), external_React_default().createElement(buttons.Button, {
      className: "mega-button action contact-block",
      icon: "sprite-fm-mono icon-disable",
      label: l[20980],
      onClick: () => this.props.onBlock(node.p)
    }), external_React_default().createElement(buttons.Button, {
      className: "mega-button action contact-accept",
      icon: "sprite-fm-mono icon-check",
      label: l[5856],
      onClick: () => this.props.onAccept(node.p)
    })));
  }

}
ColumnContactRequestsRcvdBtns.sortable = true;
ColumnContactRequestsRcvdBtns.id = "grid-url-header-nw";
ColumnContactRequestsRcvdBtns.label = "";
ColumnContactRequestsRcvdBtns.megatype = "grid-url-header-nw contact-controls-container";
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/receivedRequests.jsx







class ReceivedRequests extends mixins.wl {
  constructor(props) {
    super(props);
    this.requestReceivedListener = null;
    this.receivedRequestsRefs = [];

    this.drawReceivedRequests = () => {
      const {
        received
      } = this.props;
      return external_React_default().createElement(fmView.Z, {
        sortFoldersFirst: false,
        dataSource: received,
        customFilterFn: r => {
          return !r.dts;
        },
        currentlyViewedEntry: "ipc",
        onSelected: nop,
        onHighlighted: nop,
        onExpand: nop,
        onAttachClicked: nop,
        viewMode: 0,
        currentdirid: "ipc",
        megaListItemHeight: 59,
        headerContainerClassName: "contacts-table requests-table contacts-table-head",
        containerClassName: "contacts-table requests-table contacts-table-results",
        listAdapterColumns: [[ColumnContactRequestsEmail, {
          currView: "ipc"
        }], [ColumnContactRequestsTs, {
          label: l[19505]
        }], [ColumnContactRequestsRcvdBtns, {
          onReject: handle => {
            M.denyPendingContactRequest(handle);
          },
          onBlock: handle => {
            M.ignorePendingContactRequest(handle);
          },
          onAccept: handle => {
            M.acceptPendingContactRequest(handle);
          }
        }]],
        keyProp: "p",
        nodeAdapterProps: {
          'className': node => {
            return `
                        ${node.dts || node.s && node.s === 3 ? 'deleted' : ''}
                        ${node.s && node.s === 1 ? 'ignored' : ''}
                    `;
          }
        },
        NilComponent: () => {
          return external_React_default().createElement(nil.Z, {
            title: l[6196]
          });
        },
        initialSortBy: ['email', 'asc'],
        fmConfigSortEnabled: true,
        fmConfigSortId: "ipc"
      });
    };
  }

  render() {
    return external_React_default().createElement("div", {
      className: "contacts-list"
    }, this.drawReceivedRequests());
  }

}
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactRequestsSentBtns.jsx



class ColumnContactRequestsSentBtns extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.reinviteAllowed = rts => {
      const UTC_DATE_NOW = Math.floor(Date.now() / 1000);
      return UTC_DATE_NOW > rts + 1209600;
    };
  }

  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", {
      megatype: ColumnContactRequestsSentBtns.megatype,
      className: ColumnContactRequestsSentBtns.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item-controls"
    }, !node.dts && this.reinviteAllowed(node.rts) && external_React_default().createElement(buttons.Button, {
      className: "mega-button action",
      icon: "sprite-fm-mono icon-rewind",
      label: l[5861],
      onClick: () => this.props.onReinvite(node.m)
    }), !node.dts && external_React_default().createElement(buttons.Button, {
      className: "mega-button action contact-reject",
      icon: "sprite-fm-mono icon-close-component",
      label: l[82],
      onClick: () => this.props.onReject(node.m)
    })));
  }

}
ColumnContactRequestsSentBtns.sortable = true;
ColumnContactRequestsSentBtns.id = "grid-url-header-nw";
ColumnContactRequestsSentBtns.label = "";
ColumnContactRequestsSentBtns.megatype = "grid-url-header-nw contact-controls-container";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnContactRequestsRts.jsx


class ColumnContactRequestsRts extends ColumnContactRequestsTs {}
ColumnContactRequestsRts.sortable = true;
ColumnContactRequestsRts.id = "rts";
ColumnContactRequestsRts.label = l[19506];
ColumnContactRequestsRts.megatype = "rts";
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/sentRequests.jsx







class SentRequests extends mixins.wl {
  constructor(props) {
    super(props);
    this.requestSentListener = null;

    this.handleReinvite = mail => {
      this.setState({
        reinvited: true
      }, () => {
        M.reinvitePendingContactRequest(mail);
        contactsInfoDialog(l[19126], mail, l[19127]);
      });
    };

    this.drawSentRequests = () => {
      const {
        sent
      } = this.props;
      return external_React_default().createElement(fmView.Z, {
        sortFoldersFirst: false,
        dataSource: sent,
        currentlyViewedEntry: "opc",
        onSelected: nop,
        onHighlighted: nop,
        onExpand: nop,
        onAttachClicked: nop,
        viewMode: 0,
        currentdirid: "opc",
        megaListItemHeight: 59,
        headerContainerClassName: "contacts-table requests-table contacts-table-head",
        containerClassName: "contacts-table requests-table contacts-table-results",
        listAdapterColumns: [[ColumnContactRequestsEmail, {
          currView: "opc"
        }], ColumnContactRequestsRts, [ColumnContactRequestsSentBtns, {
          onReject: email => {
            M.cancelPendingContactRequest(email);
          },
          onReinvite: email => {
            this.handleReinvite(email);
          }
        }]],
        NilComponent: () => {
          return external_React_default().createElement(nil.Z, {
            title: l[6196]
          });
        },
        listAdapterOpts: {
          'className': node => node.dts && ' disabled'
        },
        keyProp: "p",
        initialSortBy: ['email', 'asc'],
        fmConfigSortEnabled: true,
        fmConfigSortMap: {
          'rts': 'rTimeStamp'
        },
        fmConfigSortId: "opc"
      });
    };
  }

  render() {
    return external_React_default().createElement("div", {
      className: "contacts-list"
    }, this.drawSentRequests());
  }

}
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/columns/columnFavIcon.jsx
var columnFavIcon = __webpack_require__(310);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnSharedFolderName.jsx


class ColumnSharedFolderName extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    return external_React_default().createElement("td", {
      megatype: ColumnSharedFolderName.megatype,
      className: ColumnSharedFolderName.megatype
    }, external_React_default().createElement("div", {
      className: "shared-folder-icon"
    }), external_React_default().createElement("div", {
      className: "shared-folder-info-block"
    }, external_React_default().createElement("div", {
      className: "shared-folder-name"
    }, nodeAdapter.nodeProps.title), external_React_default().createElement("div", {
      className: "shared-folder-info"
    }, fm_contains(node.tf, node.td))));
  }

}
ColumnSharedFolderName.sortable = true;
ColumnSharedFolderName.id = "name";
ColumnSharedFolderName.label = l[86];
ColumnSharedFolderName.megatype = "name";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnSharedFolderAccess.jsx


class ColumnSharedFolderAccess extends genericNodePropsComponent.L {
  render() {
    const {
      nodeAdapter
    } = this.props;
    return external_React_default().createElement("td", {
      megatype: ColumnSharedFolderAccess.megatype,
      className: ColumnSharedFolderAccess.megatype
    }, external_React_default().createElement("div", {
      className: "shared-folder-access"
    }, external_React_default().createElement("i", {
      className: `
                            sprite-fm-mono
                            ${nodeAdapter.nodeProps.incomingShareData.accessIcon}
                        `
    }), external_React_default().createElement("span", null, nodeAdapter.nodeProps.incomingShareData.accessLabel)));
  }

}
ColumnSharedFolderAccess.sortable = true;
ColumnSharedFolderAccess.id = 'access';
ColumnSharedFolderAccess.label = l[5906];
ColumnSharedFolderAccess.megatype = 'access';
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnSharedFolderButtons.jsx



class ColumnSharedFolderButtons extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    let handle = node.h;
    return external_React_default().createElement("td", {
      megatype: ColumnSharedFolderButtons.megatype,
      className: ColumnSharedFolderButtons.megatype
    }, external_React_default().createElement("div", {
      className: "contact-item"
    }, external_React_default().createElement("div", {
      className: "contact-item-controls"
    }, external_React_default().createElement(buttons.Button, {
      className: "mega-button action contact-more",
      icon: "sprite-fm-mono icon-options",
      onClick: (button, e) => {
        e.persist();
        $.selected = [handle];
        $.gridLastSelected = handle;
        e.preventDefault();
        e.stopPropagation();
        e.delegateTarget = $(e.target).parents('td')[0];
        e.currentTarget = $(e.target).parents('tr');

        if (!$(e.target).hasClass('active')) {
          M.contextMenuUI(e, 1);
          $(this).addClass('active');
        } else {
          $.hideContextMenu();
          $(e.target).removeClass('active');
        }
      }
    }))));
  }

}
ColumnSharedFolderButtons.sortable = true;
ColumnSharedFolderButtons.id = "grid-url-header-nw";
ColumnSharedFolderButtons.label = "";
ColumnSharedFolderButtons.megatype = "grid-url-header-nw";
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
var ui_link = __webpack_require__(941);
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/contactProfile.jsx
















class ContactProfile extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.state = {
      selected: [],
      loading: true
    };

    this.onAttachClicked = () => {
      const {
        selected
      } = this.state.selected;

      if (selected[0]) {
        this.onExpand(selected[0]);
      }
    };

    this.onExpand = handle => loadSubPage(`fm/${handle}`);

    this.Breadcrumb = () => {
      const {
        handle
      } = this.props;
      return external_React_default().createElement("div", {
        className: "profile-breadcrumb"
      }, external_React_default().createElement("ul", null, external_React_default().createElement("li", null, external_React_default().createElement(ui_link.Z, {
        to: "/fm/chat/contacts"
      }, ContactsPanel.LABEL.CONTACTS), external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-arrow-right"
      })), external_React_default().createElement("li", null, external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(handle)))));
    };

    this.Credentials = () => {
      const {
        handle
      } = this.props;
      const contact = M.u[handle];

      if (handle && contact && contact.c === 1) {
        const IS_VERIFIED = ContactsPanel.isVerified(contact);
        return external_React_default().createElement("div", {
          className: "profile-credentials"
        }, external_React_default().createElement("span", {
          className: "credentials-head"
        }, l[6872]), external_React_default().createElement("div", {
          className: "credentials-fingerprints"
        }, ContactsPanel.getUserFingerprint(handle)), external_React_default().createElement("button", {
          className: `
                            mega-button
                            small
                            ${IS_VERIFIED ? '' : 'positive'}
                        `,
          onClick: () => ContactsPanel[IS_VERIFIED ? 'resetCredentials' : 'verifyCredentials'](contact)
        }, IS_VERIFIED ? l[742] : l[7692]));
      }

      return null;
    };

    this.handleContextMenu = (e, handle) => {
      e.persist();
      e.preventDefault();
      e.stopPropagation();
      e.delegateTarget = e.target.tagName === "TR" ? e.target : $(e.target).parents('tr')[0];
      e.currentTarget = $(e.delegateTarget);
      $.selected = [handle];
      M.contextMenuUI(e, 1);
    };
  }

  componentWillMount() {
    if (super.componentWillMount) {
      super.componentWillMount();
    }

    const {
      handle
    } = this.props;

    if (handle) {
      const contact = M.u[handle];

      if (contact) {
        this._listener = contact.addChangeListener(() => {
          if (contact && contact.c === 1) {
            this.safeForceUpdate();
          } else {
            loadSubPage("/fm/chat/contacts");
            return 0xDEAD;
          }
        });
      }
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this._listener) {
      const {
        handle
      } = this.props;
      const contact = M.u[handle];
      contact.removeChangeListener(this._listener);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).finally(() => {
      if (this.isMounted()) {
        this.setState({
          'loading': false
        });
      }
    });
  }

  getSharedFoldersView() {
    return this.state.loading ? null : external_React_default().createElement(fmView.Z, {
      currentlyViewedEntry: this.props.handle,
      onSelected: handle => this.setState({
        selected: handle
      }),
      onHighlighted: nop,
      searchValue: this.state.searchValue,
      onExpand: this.onExpand,
      onAttachClicked: this.onAttachClicked,
      viewMode: 0,
      currentdirid: "shares",
      megaListItemHeight: 65,
      headerContainerClassName: "grid-table-header",
      containerClassName: "grid-table shared-with-me",
      onContextMenu: (ev, handle) => this.handleContextMenu(ev, handle),
      listAdapterColumns: [columnFavIcon.l, [ColumnSharedFolderName, {
        'label': `${l.shared_folders_from.replace('%NAME', M.getNameByHandle(this.props.handle))}`
      }], ColumnSharedFolderAccess, ColumnSharedFolderButtons]
    });
  }

  render() {
    const {
      handle
    } = this.props;

    if (handle) {
      const contact = M.u[handle];

      if (!contact || contact.c !== 1) {
        return external_React_default().createElement(nil.Z, {
          title: l.contact_not_found
        });
      }

      const HAS_RELATIONSHIP = ContactsPanel.hasRelationship(contact);
      return external_React_default().createElement("div", {
        className: "contacts-profile"
      }, external_React_default().createElement(this.Breadcrumb, null), external_React_default().createElement("div", {
        className: "profile-content"
      }, external_React_default().createElement("div", {
        className: "profile-head"
      }, HAS_RELATIONSHIP && external_React_default().createElement(this.Credentials, null), external_React_default().createElement(contacts.Avatar, {
        contact: contact,
        className: "profile-photo avatar-wrapper contacts-medium-avatar"
      }), external_React_default().createElement("div", {
        className: "profile-info"
      }, external_React_default().createElement("h2", null, external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(handle)), external_React_default().createElement(contacts.ContactPresence, {
        contact: contact
      })), external_React_default().createElement("span", null, contact.m)), HAS_RELATIONSHIP && external_React_default().createElement("div", {
        className: "profile-controls"
      }, external_React_default().createElement(buttons.Button, {
        className: "mega-button round simpletip",
        icon: "sprite-fm-mono icon-chat-filled",
        attrs: {
          'data-simpletip': l[8632]
        },
        onClick: () => loadSubPage(`fm/chat/p/${handle}`)
      }), external_React_default().createElement(buttons.Button, {
        className: "mega-button round simpletip",
        icon: "sprite-fm-mono icon-share-filled",
        attrs: {
          'data-simpletip': l[5631]
        },
        onClick: () => {
          if (M.isInvalidUserStatus()) {
            return;
          }

          openCopyShareDialog(handle);
        }
      }), external_React_default().createElement(buttons.Button, {
        className: "mega-button round simpletip",
        icon: "sprite-fm-mono icon-video-call-filled",
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        attrs: {
          'data-simpletip': l[5897]
        },
        onClick: () => {
          if (M.isInvalidUserStatus()) {
            return;
          }

          return (0,call.xt)().then(() => megaChat.createAndShowPrivateRoom(handle).then(room => {
            room.setActive();
            room.startVideoCall();
          })).catch(() => d && console.warn('Already in a call.'));
        }
      }), external_React_default().createElement(buttons.Button, {
        className: "mega-button round",
        icon: "sprite-fm-mono icon-options"
      }, external_React_default().createElement(dropdowns.Dropdown, {
        className: "context",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, external_React_default().createElement(ContextMenu, {
        contact: contact
      }))))), external_React_default().createElement("div", {
        className: "profile-shared-folders"
      }, this.getSharedFoldersView())));
    }

    return null;
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/contactsPanel/contactsPanel.jsx







class ContactsPanel extends mixins.wl {
  get view() {
    switch (megaChat.routingSubSection) {
      case null:
        return ContactsPanel.VIEW.CONTACTS;

      case "contact":
        return ContactsPanel.VIEW.PROFILE;

      case "received":
        return ContactsPanel.VIEW.RECEIVED_REQUESTS;

      case "sent":
        return ContactsPanel.VIEW.SENT_REQUESTS;

      default:
        console.error("Shouldn't happen.");
        return false;
    }
  }

  constructor(props) {
    super(props);
    this.requestReceivedListener = null;
    this.state = {
      receivedRequestsCount: 0
    };

    this.handleToggle = ({
      keyCode
    }) => {
      if (keyCode === 27) {
        const HAS_DIALOG_OPENED = $.dialog || ['.contact-nickname-dialog', '.fingerprint-dialog', '.context'].some(selector => {
          const dialog = document.querySelector(selector);
          return dialog && dialog.offsetHeight > 0;
        });
        return HAS_DIALOG_OPENED ? keyCode : loadSubPage('fm/chat');
      }
    };

    this.handleAcceptAllRequests = () => {
      const {
        received
      } = this.props;
      let receivedKeys = Object.keys(received);

      if (received && receivedKeys.length) {
        const promises = [];

        for (let i = 0; i < receivedKeys.length; i++) {
          promises.push(M.acceptPendingContactRequest(receivedKeys[i]));
        }

        MegaPromise.allDone(promises).always(() => {
          delay('updateIpcRequests', updateIpcRequests);
        });
      }
    };

    this.renderView = () => {
      const {
        contacts,
        received,
        sent
      } = this.props;
      const {
        view
      } = this;

      switch (view) {
        case ContactsPanel.VIEW.CONTACTS:
          return external_React_default().createElement(ContactList, {
            contacts: contacts
          });

        case ContactsPanel.VIEW.PROFILE:
          return external_React_default().createElement(ContactProfile, {
            handle: view === ContactsPanel.VIEW.PROFILE && megaChat.routingParams
          });

        case ContactsPanel.VIEW.RECEIVED_REQUESTS:
          return external_React_default().createElement(ReceivedRequests, {
            received: received
          });

        case ContactsPanel.VIEW.SENT_REQUESTS:
          return external_React_default().createElement(SentRequests, {
            sent: sent
          });
      }
    };

    this.state.receivedRequestsCount = Object.keys(M.ipc).length;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    document.documentElement.removeEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);

    if (this.requestReceivedListener) {
      mBroadcaster.removeListener(this.requestReceivedListener);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    document.documentElement.addEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);
    this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => this.setState({
      receivedRequestsCount: Object.keys(M.ipc).length
    }));
  }

  render() {
    const {
      view,
      state
    } = this;
    const {
      receivedRequestsCount
    } = state;
    return external_React_default().createElement("div", {
      className: "contacts-panel"
    }, external_React_default().createElement(Navigation, {
      view: view,
      contacts: this.props.contacts,
      receivedRequestsCount: receivedRequestsCount
    }), view !== ContactsPanel.VIEW.PROFILE && external_React_default().createElement("div", {
      className: "contacts-actions"
    }, view === ContactsPanel.VIEW.RECEIVED_REQUESTS && receivedRequestsCount > 1 && external_React_default().createElement("button", {
      className: "mega-button action",
      onClick: this.handleAcceptAllRequests
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-check"
    }), external_React_default().createElement("span", null, l[19062])), ContactsPanel.hasContacts() && external_React_default().createElement("button", {
      className: "mega-button action",
      onClick: () => contactAddDialog()
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-add-circle"
    }), external_React_default().createElement("span", null, l[71]))), external_React_default().createElement("div", {
      className: "contacts-content"
    }, this.renderView()));
  }

}
ContactsPanel.EVENTS = {
  KEYDOWN: 'keydown'
};
ContactsPanel.VIEW = {
  CONTACTS: 0x00,
  RECEIVED_REQUESTS: 0x01,
  SENT_REQUESTS: 0x02,
  PROFILE: 0x03
};
ContactsPanel.LABEL = {
  CONTACTS: l[165],
  RECEIVED_REQUESTS: l[5863],
  SENT_REQUESTS: l[5862]
};

ContactsPanel.hasContacts = () => M.u.some(contact => contact.c === 1);

ContactsPanel.hasRelationship = contact => contact && contact.c === 1;

ContactsPanel.isVerified = contact => {
  if (contact && contact.u) {
    const {
      u: handle
    } = contact;
    const verificationState = u_authring.Ed25519[handle] || {};
    return verificationState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON;
  }

  return null;
};

ContactsPanel.verifyCredentials = contact => {
  if (contact.c === 1 && u_authring && u_authring.Ed25519) {
    const verifyState = u_authring.Ed25519[contact.u] || {};

    if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
      fingerprintDialog(contact.u);
    }
  }
};

ContactsPanel.resetCredentials = contact => {
  if (M.isInvalidUserStatus()) {
    return;
  }

  authring.resetFingerprintsForUser(contact.u);
  contact.trackDataChange();
};

ContactsPanel.getUserFingerprint = handle => {
  const $$FINGERPRINT = [];
  userFingerprint(handle, fingerprints => {
    for (let i = 0; i < fingerprints.length; i++) {
      $$FINGERPRINT.push(external_React_default().createElement("span", {
        key: i
      }, fingerprints[i]));
    }
  });
  return $$FINGERPRINT;
};

/***/ }),

/***/ 479:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (Nil)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _ui_buttons_jsx1__ = __webpack_require__(204);
var _mixins2__ = __webpack_require__(503);
var _ui_utils3__ = __webpack_require__(79);




class Nil extends _mixins2__.wl {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    super.componentDidMount();
    setContactLink();
  }

  render() {
    const {
      title
    } = this.props;
    return react0().createElement("div", {
      className: "fm-empty-section fm-empty-contacts"
    }, react0().createElement("div", {
      className: "fm-empty-pad"
    }, react0().createElement("i", {
      className: "section-icon sprite-fm-mono icon-contacts"
    }), react0().createElement("div", {
      className: "fm-empty-cloud-txt"
    }, title), react0().createElement("div", {
      className: "fm-empty-description"
    }, l[19115]), react0().createElement(_ui_buttons_jsx1__.Button, {
      className: "mega-button positive large fm-empty-button",
      onClick: () => contactAddDialog()
    }, react0().createElement("span", null, l[71])), react0().createElement("div", {
      className: "empty-share-public"
    }, react0().createElement("i", {
      className: "sprite-fm-mono icon-link-circle"
    }), react0().createElement(_ui_utils3__.ParsedHTML, null, l[19111]))));
  }

}

/***/ }),

/***/ 592:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (conversations)
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(462);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(229);
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
var buttons = __webpack_require__(204);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var dropdowns = __webpack_require__(78);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(904);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/viewModeSelector.jsx


class ViewModeSelector extends mixins.wl {
  render() {
    let viewMode = this.props.viewMode;
    return external_React_default().createElement("div", {
      className: "chat-fm-view-mode-selector"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-view-medium-list" + (viewMode ? "" : " active"),
      title: l[5553],
      onClick: () => {
        if (this.props.onChange) {
          this.props.onChange(ViewModeSelector.VIEW_MODE.LIST);
        }
      }
    }), external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-view-grid" + (viewMode ? " active" : ""),
      title: l[5552],
      onClick: () => {
        if (this.props.onChange) {
          this.props.onChange(ViewModeSelector.VIEW_MODE.GRID);
        }
      }
    }));
  }

}
ViewModeSelector.VIEW_MODE = {
  "GRID": 1,
  "LIST": undefined
};
;// CONCATENATED MODULE: ./js/ui/jsx/fm/breadcrumbs.jsx


class Breadcrumbs extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'breadcrumbDropdownVisible': false
    };
    this.onGlobalClickHandler = this.onGlobalClickHandler.bind(this);
    this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
  }

  getBreadcrumbNodeIcon(nodeId) {
    switch (nodeId) {
      case M.RootID:
        return 'cloud-drive';

      case M.RubbishID:
        return 'recycle-item';

      case M.InboxID:
        return 'inbox-item';

      case 'shares':
        return 'contacts-item';

      default:
        return nodeId && M.d[nodeId] && fileIcon(M.d[nodeId]);
    }
  }

  getBreadcrumbNodeText(nodeId, prevNodeId) {
    switch (nodeId) {
      case M.RootID:
        return l[164];

      case M.RubbishID:
        return l[167];

      case M.InboxID:
        return l[166];

      case 'shares':
        return prevNodeId && M.d[prevNodeId] ? M.d[prevNodeId].m : l[5589];

      default:
        return M.d[nodeId] && M.d[nodeId].name;
    }
  }

  getBreadcrumbDropdownContents(items) {
    let contents = [];

    for (let item of items) {
      let icon;

      if (item.type === 'cloud-drive') {
        icon = external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-cloud icon24"
        });
      } else if (item.type === 'folder') {
        icon = external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-folder-filled icon24"
        });
      }

      contents.push(external_React_default().createElement("a", {
        className: "crumb-drop-link",
        key: 'drop_link_' + item.nodeId,
        onClick: e => this.onBreadcrumbNodeClick(e, item.nodeId)
      }, icon, external_React_default().createElement("span", null, item.name)));
    }

    return contents;
  }

  onBreadcrumbNodeClick(e, nodeId) {
    e.preventDefault();
    e.stopPropagation();

    if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
      this.setState({
        'breadcrumbDropdownVisible': false
      });
    }

    this.props.onNodeClick(nodeId);
  }

  resizeBreadcrumbs() {
    Soon(() => {
      var $breadcrumbsWrapper = $('.fm-breadcrumbs-wrapper.add-from-cloud', this.findDOMNode());
      var $breadcrumbs = $('.fm-breadcrumbs-block', $breadcrumbsWrapper);
      var wrapperWidth = $breadcrumbsWrapper.outerWidth();
      var $el = $(this.props.isSearch ? '.search-path-txt' : '.right-arrow-bg', $breadcrumbs);
      var i = 0;
      var j = 0;
      $el.removeClass('short-foldername ultra-short-foldername invisible');
      $breadcrumbsWrapper.removeClass('long-path overflowed-path');

      if ($breadcrumbs.outerWidth() > wrapperWidth) {
        $breadcrumbsWrapper.addClass('long-path');
      }

      while ($breadcrumbs.outerWidth() > wrapperWidth) {
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
          $breadcrumbsWrapper.addClass('overflowed-path');
          break;
        }
      }
    });
  }

  customIsEventuallyVisible() {
    return true;
  }

  onGlobalClickHandler(e) {
    let node = this.findDOMNode();

    if (node.contains(e.target) || node === e.target) {
      return;
    }

    if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
    }

    this.setState({
      'breadcrumbDropdownVisible': false
    });
  }

  removeGlobalClickHandler() {
    this._clickToHideListener = false;
    document.body.removeEventListener("click", this.onGlobalClickHandler);
  }

  componentDidUpdate() {
    super.componentDidUpdate();

    if (this.state.breadcrumbDropdownVisible) {
      if (!this._clickToHideListener) {
        this._clickToHideListener = true;
        document.body.addEventListener("click", this.onGlobalClickHandler);
      }
    } else if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.removeGlobalClickHandler();
  }

  render() {
    let {
      className,
      highlighted,
      currentlyViewedEntry,
      isSearch,
      path
    } = this.props;
    const breadcrumb = [];
    const extraPathItems = [];
    let breadcrumbDropdownContents = [];
    const entryId = isSearch ? highlighted[0] : currentlyViewedEntry;

    if (entryId !== undefined) {
      (path || M.getPath(entryId)).forEach((nodeId, k, path) => {
        var breadcrumbClasses = "";

        if (nodeId === M.RootID) {
          breadcrumbClasses += " cloud-drive";
        } else {
          breadcrumbClasses += " folder";
        }

        if (nodeId.length === 11 && M.u[nodeId]) {
          return;
        }

        if (nodeId === "shares") {
          breadcrumbClasses += " shared-with-me";
        }

        const prevNodeId = path[k - 1];
        const nodeName = this.getBreadcrumbNodeText(nodeId, prevNodeId);

        ((nodeId, k) => {
          if (k < 4) {
            breadcrumb.unshift(external_React_default().createElement("a", {
              className: "fm-breadcrumbs contains-directories " + breadcrumbClasses,
              key: nodeId,
              onClick: e => this.onBreadcrumbNodeClick(e, nodeId)
            }, external_React_default().createElement("span", {
              className: `right-arrow-bg simpletip`,
              "data-simpletip": nodeName
            }, external_React_default().createElement("span", null, nodeName)), k !== 0 && external_React_default().createElement("i", {
              className: "next-arrow sprite-fm-mono icon-arrow-right icon16"
            })));
          } else {
            extraPathItems.push({
              name: nodeName,
              type: nodeId === M.RootID ? 'cloud-drive' : 'folder',
              nodeId
            });
          }
        })(nodeId, k);
      });

      if (extraPathItems.length > 0) {
        breadcrumbDropdownContents = this.getBreadcrumbDropdownContents(extraPathItems);
      }
    }

    return external_React_default().createElement("div", {
      className: `fm-breadcrumbs-wrapper ${className || ""}`
    }, external_React_default().createElement("div", {
      className: "fm-breadcrumbs-block"
    }, breadcrumbDropdownContents.length ? external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
      className: "crumb-overflow-link"
    }, external_React_default().createElement("a", {
      className: "breadcrumb-dropdown-link dropdown",
      onClick: () => {
        this.setState({
          breadcrumbDropdownVisible: !this.state.breadcrumbDropdownVisible
        });
      }
    }, external_React_default().createElement("i", {
      className: "menu-icon sprite-fm-mono icon-options icon24"
    })), external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-arrow-right icon16"
    })), breadcrumb) : breadcrumb), breadcrumbDropdownContents.length ? external_React_default().createElement("div", {
      className: this.state.breadcrumbDropdownVisible ? 'breadcrumb-dropdown active' : 'breadcrumb-dropdown'
    }, breadcrumbDropdownContents) : '');
  }

}
// EXTERNAL MODULE: ./js/ui/jsx/fm/fmView.jsx + 9 modules
var fmView = __webpack_require__(61);
;// CONCATENATED MODULE: ./js/ui/cloudBrowserModalDialog.jsx







class CloudBrowserDialog extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'isActiveSearch': false,
      'selected': [],
      'highlighted': [],
      'currentlyViewedEntry': M.RootID,
      'selectedTab': 'clouddrive',
      'searchValue': '',
      'searchText': ''
    };
    this.onAttachClicked = this.onAttachClicked.bind(this);
    this.onClearSearchIconClick = this.onClearSearchIconClick.bind(this);
    this.onPopupDidMount = this.onPopupDidMount.bind(this);
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onSearchIconClick = this.onSearchIconClick.bind(this);
    this.onSelected = this.onSelected.bind(this);
    this.onHighlighted = this.onHighlighted.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.onViewModeSwitch = this.onViewModeSwitch.bind(this);
    this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
    this.onExpand = this.onExpand.bind(this);
  }

  onViewModeSwitch(newMode) {
    let currentViewMode = mega.config.get('cbvm') | 0;

    if (newMode === currentViewMode) {
      return;
    }

    mega.config.set('cbvm', newMode);
    this.forceUpdate();
  }

  getHeaderButtonsClass() {
    const classes = ['fm-header-buttons'];

    if (this.state.isActiveSearch) {
      classes.push('active-search');
    }

    return classes.join(' ');
  }

  getSearchIconClass() {
    const classes = ['sprite-fm-mono', 'icon-preview-reveal'];

    if (this.state.isActiveSearch && this.state.searchText.length > 0) {
      classes.push('disabled');
    }

    return classes.join(' ');
  }

  onSearchIconClick() {
    const isActiveSearch = !this.state.isActiveSearch;

    if (isActiveSearch) {
      this.searchInput.focus();
      this.setState({
        'isActiveSearch': isActiveSearch
      });
    }
  }

  onClearSearchIconClick() {
    this.setState({
      'isActiveSearch': false,
      'searchValue': '',
      'searchText': '',
      'currentlyViewedEntry': this.state.selectedTab === 'shares' ? 'shares' : M.RootID
    });
  }

  handleTabChange(selectedTab) {
    this.setState({
      selectedTab,
      currentlyViewedEntry: selectedTab === 'shares' ? 'shares' : M.RootID,
      searchValue: '',
      searchText: '',
      isLoading: false
    });
  }

  onSearchBlur() {
    if (this.state.searchText === '') {
      this.setState({
        'isActiveSearch': false
      });
    }
  }

  onSearchChange(e) {
    var searchValue = e.target.value;
    const newState = {
      searchText: searchValue
    };

    if (searchValue && searchValue.length >= 3) {
      this.setState(newState);
      delay('cbd:search-proc', this.searchProc.bind(this), 500);
      return;
    }

    if (this.state.currentlyViewedEntry === 'search' && (!searchValue || searchValue.length < 3)) {
      newState.currentlyViewedEntry = this.state.selectedTab === 'shares' ? 'shares' : M.RootID;
      newState.searchValue = undefined;
    }

    this.setState(newState);
    this.clearSelectionAndHighlight();
  }

  searchProc() {
    const {
      searchText
    } = this.state;
    const newState = {
      nodeLoading: true
    };

    if (searchText && searchText.length >= 3) {
      this.setState(newState);
      M.fmSearchNodes(searchText).then(() => {
        newState.nodeLoading = false;
        newState.searchValue = searchText;
        newState.currentlyViewedEntry = 'search';
        this.setState(newState);
        this.clearSelectionAndHighlight();
      });
    }
  }

  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });
    this.props.onSelected(nodes);
  }

  onHighlighted(nodes) {
    this.setState({
      'highlighted': nodes
    });

    if (this.props.onHighlighted) {
      this.props.onHighlighted(nodes);
    }
  }

  clearSelectionAndHighlight() {
    this.onSelected([]);
    this.onHighlighted([]);
  }

  onPopupDidMount(elem) {
    this.domNode = elem;
  }

  onAttachClicked() {
    this.props.onAttachClicked();
  }

  onBreadcrumbNodeClick(nodeId) {
    if (nodeId === 'shares') {
      return this.handleTabChange('shares');
    }

    if (M.d[nodeId] && M.d[nodeId].t) {
      const nodeRoot = M.getNodeRoot(nodeId);
      this.setState({
        selectedTab: nodeRoot === 'shares' || nodeRoot === "contacts" ? 'shares' : 'clouddrive',
        currentlyViewedEntry: nodeId,
        selected: [],
        searchValue: '',
        searchText: ''
      });
    }
  }

  onExpand(nodeId) {
    this.setState({
      'currentlyViewedEntry': nodeId,
      'searchValue': '',
      'searchText': '',
      'selected': [],
      'highlighted': []
    });
  }

  render() {
    var self = this;
    const viewMode = mega.config.get('cbvm') | 0;
    const classes = `add-from-cloud ${self.props.className} dialog-template-tool `;
    let folderIsHighlighted = false;
    let share = false;
    let isSearch = this.state.currentlyViewedEntry === 'search';
    const entryId = isSearch ? self.state.highlighted[0] : self.state.currentlyViewedEntry;
    let isIncomingShare = M.getNodeRoot(entryId) === "shares";
    this.state.highlighted.forEach(nodeId => {
      if (M.d[nodeId] && M.d[nodeId].t === 1) {
        folderIsHighlighted = true;
      }

      share = M.getNodeShare(nodeId);
    });
    let buttons = [{
      "label": this.props.cancelLabel,
      "key": "cancel",
      "onClick": e => {
        this.props.onClose(this);
        e.preventDefault();
        e.stopPropagation();
      }
    }];

    if (folderIsHighlighted) {
      const {
        highlighted
      } = this.state;
      const className = `${share && share.down ? 'disabled' : ''}`;
      const highlightedNode = highlighted && highlighted.length && highlighted[0];
      const allowAttachFolders = this.props.allowAttachFolders && !isIncomingShare;
      buttons.push({
        "label": this.props.openLabel,
        "key": "select",
        className: "positive " + className,
        onClick: e => {
          e.preventDefault();
          e.stopPropagation();
          this.setState({
            currentlyViewedEntry: highlightedNode
          });
          this.clearSelectionAndHighlight();
          this.setState({
            selected: [],
            searchValue: '',
            searchText: '',
            highlighted: []
          });
        }
      }, allowAttachFolders ? {
        "label": l[8023],
        "key": "attach",
        className: "positive " + className,
        onClick: () => {
          this.props.onClose();
          onIdle(() => {
            const createPublicLink = () => {
              M.createPublicLink(highlightedNode).then(({
                link
              }) => this.props.room.sendMessage(link));
            };

            return mega.megadrop.isDropExist(highlightedNode).length ? msgDialog('confirmation', l[1003], l[17403].replace('%1', escapeHTML(highlightedNode.name)), l[18229], e => {
              if (e) {
                mega.megadrop.pufRemove([highlightedNode]);
                mega.megadrop.pufCallbacks[highlightedNode] = {
                  del: createPublicLink
                };
              }
            }) : createPublicLink();
          });
        }
      } : null);
    }

    if (!folderIsHighlighted || this.props.folderSelectable) {
      buttons.push({
        "label": this.props.selectLabel,
        "key": "select",
        "className": "positive " + (this.state.selected.length === 0 || share && share.down ? "disabled" : ""),
        "onClick": e => {
          if (this.state.selected.length > 0) {
            this.props.onSelected(this.state.selected.filter(node => !M.getNodeShare(node).down));
            this.props.onAttachClicked();
          }

          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    var clearSearchBtn = null;

    if (self.state.searchText.length >= 3) {
      clearSearchBtn = external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-close-component",
        onClick: () => {
          self.onClearSearchIconClick();
        }
      });
    }

    let breadcrumbPath = M.getPath(entryId);
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, {
      title: self.props.title || l[8011],
      className: classes + (isSearch && this.state.selected.length > 0 ? 'has-breadcrumbs-bottom' : ''),
      onClose: () => {
        self.props.onClose(self);
      },
      dialogName: "add-from-cloud-dialog dialog-template-tool",
      popupDidMount: self.onPopupDidMount,
      buttons: buttons
    }, external_React_default().createElement("section", {
      className: "content"
    }, external_React_default().createElement("div", {
      className: "content-block"
    }, external_React_default().createElement("div", {
      className: "fm-dialog-tabs"
    }, external_React_default().createElement("div", {
      className: `
                                    fm-dialog-tab cloud
                                    ${self.state.selectedTab === 'clouddrive' ? 'active' : ''}
                                `,
      onClick: () => self.handleTabChange('clouddrive')
    }, l[164]), external_React_default().createElement("div", {
      className: `
                                    fm-dialog-tab incoming
                                    ${self.state.selectedTab === 'shares' ? 'active' : ''}
                                `,
      onClick: () => self.handleTabChange('shares')
    }, l[5542]), external_React_default().createElement("div", {
      className: "clear"
    })), external_React_default().createElement("div", {
      className: "fm-picker-header"
    }, external_React_default().createElement("div", {
      className: self.getHeaderButtonsClass()
    }, external_React_default().createElement(ViewModeSelector, {
      viewMode: viewMode,
      onChange: this.onViewModeSwitch
    }), external_React_default().createElement("div", {
      className: "fm-files-search"
    }, external_React_default().createElement("i", {
      className: self.getSearchIconClass(),
      onClick: () => {
        self.onSearchIconClick();
      }
    }), external_React_default().createElement("input", {
      ref: input => {
        this.searchInput = input;
      },
      type: "search",
      placeholder: l[102],
      value: self.state.searchText,
      onChange: self.onSearchChange,
      onBlur: () => {
        self.onSearchBlur();
      }
    }), clearSearchBtn), external_React_default().createElement("div", {
      className: "clear"
    })), !isSearch && external_React_default().createElement(Breadcrumbs, {
      className: "add-from-cloud",
      nodeId: entryId,
      path: breadcrumbPath,
      onNodeClick: this.onBreadcrumbNodeClick,
      isSearch: isSearch,
      highlighted: this.state.highlighted,
      currentlyViewedEntry: this.state.currentlyViewedEntry
    })), external_React_default().createElement(fmView.Z, {
      nodeLoading: this.state.nodeLoading,
      sortFoldersFirst: true,
      currentlyViewedEntry: this.state.currentlyViewedEntry,
      folderSelectNotAllowed: this.props.folderSelectNotAllowed,
      onSelected: this.onSelected,
      onHighlighted: this.onHighlighted,
      onAttachClicked: this.onAttachClicked,
      initialSelected: this.state.selected,
      initialHighlighted: this.state.highlighted,
      searchValue: this.state.searchValue,
      onExpand: this.onExpand,
      viewMode: viewMode,
      initialSortBy: ['name', 'asc'],
      fmConfigSortEnabled: true,
      fmConfigSortId: "cbd"
    }), isSearch && breadcrumbPath.length > 0 && external_React_default().createElement("div", {
      className: `
                            fm-breadcrumbs-wrapper add-from-cloud breadcrumbs-bottom
                        `
    }, external_React_default().createElement("div", {
      className: "fm-breadcrumbs-block"
    }, external_React_default().createElement(Breadcrumbs, {
      nodeId: entryId,
      path: breadcrumbPath,
      onNodeClick: this.onBreadcrumbNodeClick,
      isSearch: isSearch,
      highlighted: this.state.highlighted,
      currentlyViewedEntry: this.state.currentlyViewedEntry
    }), external_React_default().createElement("div", {
      className: "clear"
    }))))));
  }

}

CloudBrowserDialog.defaultProps = {
  'selectLabel': l[8023],
  'openLabel': l[1710],
  'cancelLabel': l[82],
  'hideable': true,
  'className': ''
};
window.CloudBrowserModalDialogUI = {
  CloudBrowserDialog
};
const cloudBrowserModalDialog = ({
  CloudBrowserDialog
});
// EXTERNAL MODULE: ./js/chat/chatRoom.jsx
var chat_chatRoom = __webpack_require__(778);
;// CONCATENATED MODULE: ./js/ui/historyRetentionDialog.jsx




const LIMIT = {
  CHARS: 2,
  HOURS: 24,
  DAYS: 31,
  WEEKS: 4,
  MONTHS: 12
};
class HistoryRetentionDialog extends external_React_.Component {
  constructor(props) {
    super(props);
    this.inputRef = external_React_default().createRef();
    this.state = {
      selectedTimeFormat: chat_chatRoom.RETENTION_FORMAT.HOURS,
      timeRange: undefined
    };

    this.handleRadioChange = e => {
      const selectedTimeFormat = e.target.value;
      this.setState(prevState => ({
        selectedTimeFormat,
        timeRange: this.filterTimeRange(prevState.timeRange, selectedTimeFormat)
      }));
    };

    this.handleOnTimeChange = e => {
      const timeValue = e.target.value;
      this.setState(prevState => ({
        timeRange: this.filterTimeRange(timeValue, prevState.selectedTimeFormat)
      }));
    };

    const {
      chatRoom
    } = props;
    this.state.timeRange = chatRoom.getRetentionTimeFormatted();

    if (this.state.timeRange === 0) {
      this.state.timeRange = '';
    }

    this.state.selectedTimeFormat = chatRoom.getRetentionFormat();
    this.state.selectedTimeFormat = this.state.selectedTimeFormat === chat_chatRoom.RETENTION_FORMAT.DISABLED ? chat_chatRoom.RETENTION_FORMAT.HOURS : this.state.selectedTimeFormat;
  }

  hasInput() {
    return this.state.timeRange && parseInt(this.state.timeRange, 10) >= 1;
  }

  getDefaultValue(selectedTimeFormat) {
    switch (selectedTimeFormat) {
      case chat_chatRoom.RETENTION_FORMAT.HOURS:
        return LIMIT.HOURS;

      case chat_chatRoom.RETENTION_FORMAT.DAYS:
        return LIMIT.DAYS;

      case chat_chatRoom.RETENTION_FORMAT.WEEKS:
        return LIMIT.WEEKS;

      case chat_chatRoom.RETENTION_FORMAT.MONTHS:
        return LIMIT.MONTHS;
    }
  }

  getParsedLabel(label, timeRange) {
    timeRange = timeRange ? parseInt(timeRange, 10) : this.getDefaultValue(label);

    switch (label) {
      case chat_chatRoom.RETENTION_FORMAT.HOURS:
        return mega.icu.format(l.plural_hour, timeRange);

      case chat_chatRoom.RETENTION_FORMAT.DAYS:
        return mega.icu.format(l.plural_day, timeRange);

      case chat_chatRoom.RETENTION_FORMAT.WEEKS:
        return mega.icu.format(l.plural_week, timeRange);

      case chat_chatRoom.RETENTION_FORMAT.MONTHS:
        return mega.icu.format(l.plural_month, timeRange);
    }
  }

  filterTimeRange(timeRange, selectedTimeFormat) {
    if (timeRange.length > LIMIT.CHARS) {
      return timeRange.substring(0, LIMIT.CHARS);
    }

    timeRange = parseInt(timeRange, 10);

    if (timeRange === 0 || isNaN(timeRange)) {
      return '';
    }

    switch (selectedTimeFormat) {
      case chat_chatRoom.RETENTION_FORMAT.HOURS:
        return timeRange > LIMIT.HOURS ? LIMIT.HOURS : timeRange;

      case chat_chatRoom.RETENTION_FORMAT.DAYS:
        return timeRange > LIMIT.DAYS ? LIMIT.DAYS : timeRange;

      case chat_chatRoom.RETENTION_FORMAT.WEEKS:
        return timeRange > LIMIT.WEEKS ? LIMIT.WEEKS : timeRange;

      case chat_chatRoom.RETENTION_FORMAT.MONTHS:
        return timeRange > LIMIT.MONTHS ? LIMIT.MONTHS : timeRange;
    }

    return timeRange;
  }

  handleOnSubmit(e) {
    if (!this.hasInput()) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const {
      chatRoom,
      onClose
    } = this.props;
    const {
      selectedTimeFormat,
      timeRange
    } = this.state;
    let time = 0;

    switch (selectedTimeFormat) {
      case chat_chatRoom.RETENTION_FORMAT.HOURS:
        time = hoursToSeconds(Number(timeRange));
        break;

      case chat_chatRoom.RETENTION_FORMAT.DAYS:
        time = daysToSeconds(Number(timeRange));
        break;

      case chat_chatRoom.RETENTION_FORMAT.WEEKS:
        time = daysToSeconds(Number(timeRange) * 7);
        break;

      case chat_chatRoom.RETENTION_FORMAT.MONTHS:
        time = daysToSeconds(Number(timeRange) * 30);
        break;
    }

    chatRoom.setRetention(time);
    onClose();
  }

  renderCustomRadioButton() {
    return [chat_chatRoom.RETENTION_FORMAT.HOURS, chat_chatRoom.RETENTION_FORMAT.DAYS, chat_chatRoom.RETENTION_FORMAT.WEEKS, chat_chatRoom.RETENTION_FORMAT.MONTHS].map(label => {
      return external_React_default().createElement(CustomRadioButton, {
        checked: this.state.selectedTimeFormat === label,
        label: this.getParsedLabel(label, this.state.timeRange),
        name: "time-selector",
        value: label,
        onChange: this.handleRadioChange,
        key: label
      });
    });
  }

  componentDidMount() {
    $(document.body).rebind('keydown.historyRetentionDialog', e => {
      const key = e.keyCode || e.which;

      if (key === 13) {
        this.handleOnSubmit(e);
      }
    });
  }

  componentWillUnmount() {
    $(document.body).off('keydown.historyRetentionDialog');
  }

  render() {
    const {
      chatRoom,
      onClose
    } = this.props;
    const {
      selectedTimeFormat,
      timeRange
    } = this.state;
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      chatRoom: chatRoom,
      onClose: onClose,
      dialogName: "msg-retention-dialog",
      dialogType: "tool",
      onClick: () => this.inputRef.current.focus()
    }), external_React_default().createElement("header", null, external_React_default().createElement("h2", {
      id: "msg-retention-dialog-title"
    }, l[23434])), external_React_default().createElement("section", {
      className: "content"
    }, external_React_default().createElement("div", {
      className: "content-block"
    }, external_React_default().createElement("p", null, l[23435])), external_React_default().createElement("div", {
      className: "content-block form"
    }, external_React_default().createElement("div", {
      className: "form-section"
    }, external_React_default().createElement("span", {
      className: "form-section-placeholder"
    }, this.getParsedLabel(selectedTimeFormat, timeRange)), external_React_default().createElement("input", {
      type: "number",
      min: "0",
      step: "1",
      className: "form-section-time",
      placeholder: this.getDefaultValue(selectedTimeFormat),
      ref: this.inputRef,
      autoFocus: true,
      value: timeRange,
      onChange: this.handleOnTimeChange,
      onKeyDown: e => (e.key === '-' || e.key === '+' || e.key === 'e') && e.preventDefault()
    })), external_React_default().createElement("div", {
      className: "form-section"
    }, external_React_default().createElement("div", {
      className: "form-section-radio"
    }, this.renderCustomRadioButton())))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
      className: "footer-container"
    }, external_React_default().createElement("button", {
      className: "mega-button",
      onClick: onClose
    }, external_React_default().createElement("span", null, l[82])), external_React_default().createElement("button", {
      className: `
                                mega-button positive
                                ${this.hasInput() ? '' : 'disabled'}
                            `,
      onClick: e => this.handleOnSubmit(e)
    }, external_React_default().createElement("span", null, l[726])))));
  }

}

function CustomRadioButton({
  checked = false,
  label,
  name,
  value,
  onChange
}) {
  return external_React_default().createElement("label", {
    key: value,
    className: "radio-txt"
  }, label, external_React_default().createElement("div", {
    className: "custom-radio small green-active " + (checked ? "radioOn" : "radioOff")
  }, external_React_default().createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange
  })));
}
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(13);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(285);
;// CONCATENATED MODULE: ./js/ui/accordion.jsx
var React = __webpack_require__(363);



class AccordionPanel extends mixins.wl {
  render() {
    var self = this;
    var contentClass = self.props.className ? self.props.className : '';
    return React.createElement("div", {
      className: "chat-dropdown container"
    }, React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function (e) {
        self.props.onToggle(e);
      }
    }, React.createElement("span", null, this.props.title), React.createElement("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), this.props.expanded ? React.createElement("div", {
      className: "chat-dropdown content have-animation " + contentClass
    }, this.props.children) : null);
  }

}

class Accordion extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'expandedPanel': this.props.expandedPanel
    };
  }

  onToggle(e, key) {
    var obj = {};
    obj[key] = !(this.state.expandedPanel || {})[key];
    this.setState({
      'expandedPanel': obj
    });
    this.props.onToggle && this.props.onToggle(key);
  }

  render() {
    var self = this;
    var classes = "accordion-panels " + (self.props.className ? self.props.className : '');
    var accordionPanels = [];
    var x = 0;
    React.Children.forEach(self.props.children, child => {
      if (!child) {
        return;
      }

      if (child.type.name === 'AccordionPanel' || child.type.name && child.type.name.indexOf('AccordionPanel') > -1) {
        accordionPanels.push(React.cloneElement(child, {
          key: child.key,
          expanded: !!self.state.expandedPanel[child.key],
          accordion: self,
          onToggle: function (e) {
            self.onToggle(e, child.key);
          }
        }));
      } else {
        accordionPanels.push(React.cloneElement(child, {
          key: x++,
          accordion: self
        }));
      }
    });
    return React.createElement("div", {
      className: classes
    }, accordionPanels);
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/participantsList.jsx



var DropdownsUI = __webpack_require__(78);

var ContactsUI = __webpack_require__(13);

var PerfectScrollbar = (__webpack_require__(285).F);

class ParticipantsList extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'scrollPositionY': 0,
      'scrollHeight': 144
    };
    this.doResizesOnComponentUpdate = SoonFc(10, function () {
      var self = this;

      if (!self.isMounted()) {
        return;
      }

      var fitHeight = self.contactsListScroll.getContentHeight();

      if (!fitHeight) {
        return null;
      }

      var $node = $(self.findDOMNode());
      var $parentContainer = $node.closest('.chat-right-pad');
      var maxHeight = $parentContainer.outerHeight(true) - $('.chat-right-head', $parentContainer).outerHeight(true) - 72;

      if (fitHeight < $('.buttons-block', $parentContainer).outerHeight(true)) {
        fitHeight = Math.max(fitHeight, 53);
      } else if (maxHeight < fitHeight) {
        fitHeight = Math.max(maxHeight, 53);
      }

      fitHeight = Math.min(self.calculateListHeight($parentContainer), fitHeight);
      var $contactsList = $('.chat-contacts-list', $parentContainer);

      if ($contactsList.height() !== fitHeight) {
        $('.chat-contacts-list', $parentContainer).height(fitHeight);
        self.contactsListScroll.reinitialise();
      }

      if (self.state.scrollHeight !== fitHeight) {
        self.setState({
          'scrollHeight': fitHeight
        });
      }

      self.onUserScroll();
    });
  }

  onUserScroll() {
    if (!this.contactsListScroll) {
      return;
    }

    var scrollPosY = this.contactsListScroll.getScrollPositionY();

    if (this.state.scrollPositionY !== scrollPosY) {
      this.setState({
        'scrollPositionY': scrollPosY
      });
    }
  }

  calculateListHeight($parentContainer) {
    var room = this.props.chatRoom;
    return ($parentContainer ? $parentContainer : $('.conversationsApp')).outerHeight() - 144 - 10 - (room.type === "public" && room.observers > 0 ? 48 : 0) - (room.isReadOnly() ? 12 : 0);
  }

  componentDidUpdate() {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    if (!self.contactsListScroll) {
      return null;
    }

    self.doResizesOnComponentUpdate();
  }

  render() {
    var self = this;
    var room = this.props.chatRoom;

    if (!room) {
      return null;
    }

    var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
    var contactListStyles = {};
    contactListStyles.height = Math.min(this.calculateListHeight(), contacts.length * this.props.contactCardHeight);
    return external_React_default().createElement("div", {
      className: "chat-contacts-list",
      style: contactListStyles
    }, external_React_default().createElement(PerfectScrollbar, {
      chatRoom: room,
      members: room.members,
      ref: function (ref) {
        self.contactsListScroll = ref;
      },
      disableCheckingVisibility: true,
      onUserScroll: SoonFc(self.onUserScroll.bind(self), 76),
      requiresUpdateOnResize: true,
      onAnimationEnd: function () {
        self.safeForceUpdate();
      },
      isVisible: self.props.chatRoom.isCurrentlyActive,
      options: {
        suppressScrollX: true
      }
    }, external_React_default().createElement(ParticipantsListInner, {
      chatRoom: room,
      members: room.members,
      scrollPositionY: self.state.scrollPositionY,
      scrollHeight: self.state.scrollHeight,
      disableCheckingVisibility: true
    })));
  }

}

ParticipantsList.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 36
};

class ParticipantsListInner extends mixins.wl {
  render() {
    var room = this.props.chatRoom;
    var contactCardHeight = this.props.contactCardHeight;
    var scrollPositionY = this.props.scrollPositionY;
    var scrollHeight = this.props.scrollHeight;
    const {
      FULL,
      OPERATOR,
      READONLY
    } = ChatRoom.MembersSet.PRIVILEGE_STATE;

    if (!room) {
      return null;
    }

    if (!room.isCurrentlyActive && room._leaving !== true) {
      return false;
    }

    var contacts = room.getParticipantsExceptMe();
    var contactsList = [];
    const firstVisibleUserNum = Math.floor(scrollPositionY / contactCardHeight);
    const visibleUsers = Math.ceil(scrollHeight / contactCardHeight);
    var contactListInnerStyles = {
      'height': contacts.length * contactCardHeight
    };

    if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving() && room.members.hasOwnProperty(u_handle)) {
      contacts.unshift(u_handle);
      contactListInnerStyles.height += contactCardHeight;
    }

    var onRemoveClicked = contactHash => {
      room.trigger('onRemoveUserRequest', [contactHash]);
    };

    var onSetPrivClicked = (contactHash, priv) => {
      if (room.members[contactHash] !== priv) {
        room.trigger('alterUserPrivilege', [contactHash, priv]);
      }
    };

    for (var i = 0; i < contacts.length; i++) {
      var contactHash = contacts[i];

      if (!(contactHash in M.u)) {
        continue;
      }

      var contact = M.u[contactHash];

      if (i < firstVisibleUserNum || i > firstVisibleUserNum + visibleUsers) {
        continue;
      }

      var dropdowns = [];
      var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";
      var dropdownRemoveButton = [];

      if (room.type === "public" || room.type === "group" && room.members) {
        if (room.iAmOperator() && contactHash !== u_handle) {
          dropdownRemoveButton.push(external_React_default().createElement(DropdownsUI.DropdownItem, {
            className: "red",
            key: "remove",
            icon: "sprite-fm-mono icon-disabled-filled",
            label: l[8867],
            onClick: onRemoveClicked.bind(this, contactHash)
          }));
        }

        if (room.iAmOperator()) {
          dropdowns.push(external_React_default().createElement("div", {
            key: "setPermLabel",
            className: "dropdown-items-info"
          }, l[8868]));
          dropdowns.push(external_React_default().createElement(DropdownsUI.DropdownItem, {
            key: "privOperator",
            icon: "sprite-fm-mono icon-admin-outline",
            label: l[8875],
            className: "tick-item " + (room.members[contactHash] === FULL ? "active" : ""),
            disabled: contactHash === u_handle,
            onClick: onSetPrivClicked.bind(this, contactHash, FULL)
          }));
          dropdowns.push(external_React_default().createElement(DropdownsUI.DropdownItem, {
            key: "privFullAcc",
            icon: "sprite-fm-mono icon-chat",
            className: "tick-item " + (room.members[contactHash] === OPERATOR ? "active" : ""),
            disabled: contactHash === u_handle,
            label: l[8874],
            onClick: onSetPrivClicked.bind(this, contactHash, OPERATOR)
          }));
          dropdowns.push(external_React_default().createElement(DropdownsUI.DropdownItem, {
            key: "privReadOnly",
            icon: "sprite-fm-mono icon-read-only",
            className: "tick-item " + (room.members[contactHash] === READONLY ? "active" : ""),
            disabled: contactHash === u_handle,
            label: l[8873],
            onClick: onSetPrivClicked.bind(this, contactHash, READONLY)
          }));
        }

        const baseClassName = 'sprite-fm-mono';

        switch (room.members[contactHash]) {
          case FULL:
            dropdownIconClasses = `${baseClassName} icon-admin`;
            break;

          case OPERATOR:
            dropdownIconClasses = `${baseClassName} icon-chat-filled`;
            break;

          case READONLY:
            dropdownIconClasses = `${baseClassName} icon-read-only`;
            break;

          default:
            break;
        }

        contactsList.push(external_React_default().createElement(ContactsUI.ContactCard, {
          key: contact.u,
          contact: contact,
          chatRoom: room,
          className: "right-chat-contact-card",
          dropdownPositionMy: "left top",
          dropdownPositionAt: "left top",
          dropdowns: dropdowns,
          dropdownDisabled: contactHash === u_handle || is_chatlink || is_eplusplus,
          dropdownButtonClasses: "contacts-icon",
          dropdownRemoveButton: dropdownRemoveButton,
          dropdownIconClasses: dropdownIconClasses,
          noLoading: true,
          isInCall: room.uniqueCallParts && room.uniqueCallParts[contactHash],
          style: {
            width: 234,
            position: 'absolute',
            top: i * contactCardHeight
          }
        }));
      }
    }

    return external_React_default().createElement("div", {
      className: "chat-contacts-list-inner default-bg",
      style: contactListInnerStyles
    }, contactsList);
  }

}

ParticipantsListInner.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 32,
  'scrollPositionY': 0,
  'scrollHeight': 128,
  'chatRoom': undefined
};

// EXTERNAL MODULE: ./js/chat/ui/messages/generic.jsx + 13 modules
var generic = __webpack_require__(98);
;// CONCATENATED MODULE: ./js/chat/ui/sharedFilesAccordionPanel.jsx


var _dec, _class;

var sharedFilesAccordionPanel_React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);




class SharedFileItem extends mixins.wl {
  render() {
    var self = this;
    var message = this.props.message;
    var contact = Message.getContactForMessage(message);
    var name = M.getNameByHandle(contact.u);
    var timestamp = time2date(message.delay);
    var node = this.props.node;
    var icon = this.props.icon;
    return sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-block " + (self.props.isLoading ? "is-loading" : ""),
      key: message.messageId + "_" + node.h,
      onClick: () => this.props.isPreviewable ? M.viewMediaFile(node) : M.addDownload([node]),
      onDoubleClick: () => M.addDownload([node])
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: `icon-or-thumb ${thumbnails.has(node.fa) ? "thumb" : ""}`
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: "medium-file-icon " + icon
    }), sharedFilesAccordionPanel_React.createElement("div", {
      className: "img-wrapper",
      id: this.props.imgId
    }, sharedFilesAccordionPanel_React.createElement("img", {
      alt: "",
      src: thumbnails.get(node.fa) || ""
    }))), sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-info"
    }, sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt"
    }, node.name), sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt small"
    }, sharedFilesAccordionPanel_React.createElement(utils.Emoji, null, name)), sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt small grey"
    }, timestamp)));
  }

}

let SharedFilesAccordionPanel = (_dec = utils["default"].SoonFcWrap(350), (_class = class SharedFilesAccordionPanel extends mixins.wl {
  eventuallyRenderThumbnails() {
    if (this.allShownNodes) {
      var pending = [];
      const nodes = new Map(this.allShownNodes);

      const render = n => {
        if (thumbnails.has(n.fa)) {
          const src = thumbnails.get(n.fa);
          const batch = [...nodes.get(n.fa)];

          for (var i = batch.length; i--;) {
            const n = batch[i];
            let img = document.getElementById(`sharedFiles!${n.ch}`);

            if (img && (img = img.querySelector('img'))) {
              img.src = src;

              if (img = Object(img.parentNode).parentNode) {
                img.classList.add('thumb');
              }
            }
          }

          return true;
        }
      };

      for (const [, [n]] of nodes) {
        if (!render(n)) {
          pending.push(n);
        }
      }

      this.allShownNodes.clear();

      if (pending.length) {
        fm_thumbnails('standalone', pending, render);
      }
    }
  }

  componentWillMount() {
    this.allShownNodes = new MapSet();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    delete this.allShownNodes;
  }

  componentDidUpdate() {
    this.eventuallyRenderThumbnails();
  }

  render() {
    var self = this;
    var room = self.props.chatRoom;
    var mb = room.messagesBuff;
    var contents = null;
    var currentPage = mb.sharedFilesPage;
    var startPos = currentPage * 12;
    var endPos = startPos + 12;
    var totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / 12);
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
        prev = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav button prev",
          onClick: function () {
            mb.sharedFilesPage--;
            self.safeForceUpdate();
          }
        });
      }

      if (haveMore) {
        next = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav button next",
          onClick: function () {
            if (self.isLoadingMore) {
              return;
            }

            if (mb.sharedFiles.length < endPos + 12) {
              self.isLoadingMore = true;
              mb.retrieveSharedFilesHistory(12).always(function () {
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
          }
        });
      }

      if (!mb.sharedFilesLoadedOnce) {
        mb.retrieveSharedFilesHistory(12).always(function () {
          Soon(function () {
            self.safeForceUpdate();
          });
        });
      }

      var sharedNodesContainer = null;

      if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt loading-initial"
        }, sharedFilesAccordionPanel_React.createElement("div", {
          className: "loading-spinner light small"
        }, sharedFilesAccordionPanel_React.createElement("div", {
          className: "main-loader"
        })));
      } else if (mb.sharedFiles.length === 0) {
        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt"
        }, l[19985]);
      } else {
        var keys = clone(mb.sharedFiles.keys()).reverse();

        for (var i = startPos; i < endPos; i++) {
          var message = mb.sharedFiles[keys[i]];

          if (!message) {
            continue;
          }

          var nodes = message.getAttachmentMeta();
          nodes.forEach(function (node) {
            var imgId = "sharedFiles!" + node.ch;
            const {
              icon,
              showThumbnail,
              isPreviewable
            } = M.getMediaProperties(node);
            files.push(sharedFilesAccordionPanel_React.createElement(SharedFileItem, {
              message: message,
              key: node.h + "_" + message.messageId,
              isLoading: self.isLoadingMore,
              node: node,
              icon: icon,
              imgId: imgId,
              showThumbnail: showThumbnail,
              isPreviewable: isPreviewable,
              chatRoom: room
            }));

            if (showThumbnail) {
              self.allShownNodes.set(node.fa, node);
            }
          });
        }

        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", null, files);
      }

      contents = sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown content have-animation"
      }, sharedNodesContainer, self.isLoadingMore ? sharedFilesAccordionPanel_React.createElement("div", {
        className: "loading-spinner light small"
      }, sharedFilesAccordionPanel_React.createElement("div", {
        className: "main-loader"
      })) : null, files.length > 0 ? sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-share-nav body"
      }, prev, next, sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-share-nav pages"
      }, (l[19988] ? l[19988] : "Page %1").replace("%1", currentPage + 1))) : null);
    }

    return sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown container"
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function (e) {
        self.props.onToggle(e);
      }
    }, sharedFilesAccordionPanel_React.createElement("span", null, this.props.title), sharedFilesAccordionPanel_React.createElement("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
    }, contents));
  }

}, ((0,applyDecoratedDescriptor.Z)(_class.prototype, "eventuallyRenderThumbnails", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyRenderThumbnails"), _class.prototype)), _class));

;// CONCATENATED MODULE: ./js/chat/ui/incomingSharesAccordionPanel.jsx
var incomingSharesAccordionPanel_React = __webpack_require__(363);

var incomingSharesAccordionPanel_ReactDOM = __webpack_require__(533);



class SharedFolderItem extends mixins.wl {
  render() {
    var self = this;
    var node = this.props.node;
    return incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-block incoming " + (self.props.isLoading ? "is-loading" : ""),
      key: node.h,
      onClick: function () {
        M.openFolder(node.h);
      },
      onDoubleClick: function () {
        M.openFolder(node.h);
      }
    }, incomingSharesAccordionPanel_React.createElement("div", {
      className: "medium-file-icon inbound-share"
    }), incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-info"
    }, incomingSharesAccordionPanel_React.createElement("span", {
      className: "txt"
    }, node.name), incomingSharesAccordionPanel_React.createElement("span", {
      className: "txt small"
    }, fm_contains(node.tf, node.td))));
  }

}

class IncSharesAccordionPanel extends mixins.wl {
  componentWillMount() {
    this.hadLoaded = false;
  }

  getContactHandle() {
    var self = this;
    var room = self.props.chatRoom;
    var contactHandle = room.getParticipantsExceptMe()[0];

    if (!contactHandle || room.type !== "private") {
      return {};
    }

    return contactHandle;
  }

  render() {
    var self = this;
    var room = self.props.chatRoom;
    var contactHandle = self.getContactHandle();
    var contents = null;

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
        });
      }

      var incomingSharesContainer = null;
      var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

      if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
        incomingSharesContainer = incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt"
        }, l[19986]);
      } else {
        var haveMore = sharedFolders.length > 10;
        var defSortFn = M.getSortByNameFn();
        sharedFolders.sort(function (a, b) {
          var nodeA = M.d[a];
          var nodeB = M.d[b];
          return defSortFn(nodeA, nodeB, -1);
        });
        var renderNodes = [];

        for (var i = 0; i < Math.min(sharedFolders.length, 10); i++) {
          var nodeHandle = sharedFolders[i];
          var node = M.d[nodeHandle];

          if (!node) {
            continue;
          }

          renderNodes.push(incomingSharesAccordionPanel_React.createElement(SharedFolderItem, {
            key: node.h,
            isLoading: self.isLoadingMore,
            node: node,
            chatRoom: room
          }));
        }

        incomingSharesContainer = incomingSharesAccordionPanel_React.createElement("div", null, renderNodes, haveMore ? incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav body"
        }, incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav show-all",
          onClick: function () {
            M.openFolder(contactHandle);
          }
        }, incomingSharesAccordionPanel_React.createElement("span", {
          className: "transfer-filetype-icon inbound-share"
        }, incomingSharesAccordionPanel_React.createElement("span", {
          className: "transfer-filetype-icon inbound-share"
        })), incomingSharesAccordionPanel_React.createElement("span", {
          className: "txt"
        }, l[19797] ? l[19797] : "Show All"))) : null);
      }

      contents = incomingSharesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown content have-animation"
      }, incomingSharesContainer, self.isLoadingMore ? incomingSharesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown empty-txt"
      }, incomingSharesAccordionPanel_React.createElement("div", {
        className: "loading-spinner light small"
      }, incomingSharesAccordionPanel_React.createElement("div", {
        className: "main-loader"
      }))) : null);
    }

    return incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown container"
    }, incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function (e) {
        self.props.onToggle(e);
      }
    }, incomingSharesAccordionPanel_React.createElement("span", null, this.props.title), incomingSharesAccordionPanel_React.createElement("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
    }, contents));
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/chatlinkDialog.jsx





class ChatlinkDialog extends mixins.wl {
  constructor(props) {
    super(props);

    this.onPopupDidMount = $node => {
      this.$popupNode = $node;
    };

    this.retrieveChatLink = () => {
      const {
        chatRoom
      } = this.props;

      if (!chatRoom.topic) {
        delete this.loading;
        return;
      }

      this.loading = chatRoom.updatePublicHandle(undefined).always(() => {
        if (chatRoom.publicLink) {
          this.setState({
            'link': getBaseUrl() + '/' + chatRoom.publicLink
          });
        } else {
          this.setState({
            link: l[20660]
          });
        }
      });
    };

    this.onClose = () => {
      if (this.props.onClose) {
        this.props.onClose();
      }
    };

    this.onTopicFieldChanged = e => {
      this.setState({
        newTopic: e.target.value
      });
    };

    this.onTopicFieldKeyPress = e => {
      if (e.which === 13) {
        this.props.chatRoom.setRoomTitle(this.state.newTopic);
      }
    };

    this.state = {
      link: l[5533],
      newTopic: ''
    };
  }

  componentWillMount() {
    this.retrieveChatLink();
  }

  componentDidUpdate() {
    const {
      chatRoom
    } = this.props;

    if (!this.loading && chatRoom.topic) {
      this.retrieveChatLink();
    }

    this.toastTxt = l[7654];

    if (!this.$popupNode) {
      return;
    }

    const $node = this.$popupNode;
    const $copyButton = $('.copy-to-clipboard', $node);
    $copyButton.rebind('click', () => {
      copyToClipboard(this.state.link, this.toastTxt);
      return false;
    });
    $('span', $copyButton).text(l[1990]);
  }

  render() {
    const {
      chatRoom
    } = this.props;
    const {
      newTopic,
      link
    } = this.state;
    const closeButton = external_React_default().createElement("button", {
      key: "close",
      className: "mega-button negative links-button",
      onClick: this.onClose
    }, external_React_default().createElement("span", null, l[148]));
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      title: chatRoom.iAmOperator() && !chatRoom.topic ? l[9080] : '',
      className: `
                    chat-rename-dialog
                    export-chat-links-dialog
                    group-chat-link
                    ${chatRoom.topic ? '' : 'requires-topic'}
                `,
      onClose: this.onClose,
      dialogName: "chat-link-dialog",
      dialogType: chatRoom.iAmOperator() && !chatRoom.topic ? 'main' : 'graphic',
      chatRoom: chatRoom,
      popupDidMount: this.onPopupDidMount
    }), chatRoom.iAmOperator() && !chatRoom.topic ? external_React_default().createElement("section", {
      className: "content"
    }, external_React_default().createElement("div", {
      className: "content-block"
    }, external_React_default().createElement("div", {
      className: "export-chat-ink-warning"
    }, l[20617]), external_React_default().createElement("div", {
      className: "rename-input-bl",
      style: {
        margin: '10px auto 20px auto'
      }
    }, external_React_default().createElement("input", {
      type: "text",
      name: "newTopic",
      value: newTopic,
      ref: field => {
        this.topicInput = field;
      },
      style: {
        paddingLeft: 8
      },
      onChange: this.onTopicFieldChanged,
      onKeyPress: this.onTopicFieldKeyPress,
      placeholder: l[20616],
      maxLength: "30"
    })))) : external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("header", null, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-chat-group"
    }), external_React_default().createElement("h2", {
      id: "chat-link-dialog-title"
    }, external_React_default().createElement(utils.Emoji, null, chatRoom.topic))), external_React_default().createElement("section", {
      className: "content"
    }, external_React_default().createElement("div", {
      className: "content-block"
    }, external_React_default().createElement("div", {
      className: "chat-link-input"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-link-small"
    }), external_React_default().createElement("input", {
      type: "text",
      readOnly: true,
      value: !chatRoom.topic ? l[20660] : link
    })), external_React_default().createElement("div", {
      className: "info"
    }, chatRoom.publicLink ? l[20644] : null)))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
      className: "footer-container"
    }, chatRoom.iAmOperator() && chatRoom.publicLink && external_React_default().createElement("button", {
      key: "deleteLink",
      className: `
                                    mega-button
                                    links-button
                                    ${this.loading && this.loading.state() === 'pending' ? 'disabled' : ''}
                                `,
      onClick: () => {
        chatRoom.updatePublicHandle(1);
        this.onClose();
      }
    }, external_React_default().createElement("span", null, l[20487])), chatRoom.topic ? chatRoom.publicLink ? external_React_default().createElement("button", {
      className: `
                                        mega-button
                                        positive
                                        copy-to-clipboard
                                        ${this.loading && this.loading.state() === 'pending' ? 'disabled' : ''}
                                    `
    }, external_React_default().createElement("span", null, l[63])) : closeButton : chatRoom.iAmOperator() ? external_React_default().createElement("button", {
      key: "setTopic",
      className: `
                                        mega-button
                                        positive
                                        links-button
                                        ${newTopic && $.trim(newTopic) ? '' : 'disabled'}
                                    `,
      onClick: () => chatRoom.iAmOperator() && chatRoom.setRoomTitle(newTopic)
    }, external_React_default().createElement("span", null, l[20615])) : closeButton)));
  }

}
ChatlinkDialog.defaultProps = {
  requiresUpdateOnResize: true,
  disableCheckingVisibility: true
};
// EXTERNAL MODULE: external "ReactDOM"
var external_ReactDOM_ = __webpack_require__(533);
var external_ReactDOM_default = __webpack_require__.n(external_ReactDOM_);
;// CONCATENATED MODULE: ./js/chat/ui/conversationaudiovideopanel.jsx







var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1;
var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;
var VIEW_MODES = {
  "GRID": 1,
  "CAROUSEL": 2
};

function muteOrHoldIconStyle(opts, contact) {
  var props = {};

  if (opts.onHold) {
    props.className = "sprite-fm-mono icon-pause on-hold simpletip";
    props["data-simpletip"] = l[23542].replace("%s", M.getNameByHandle(contact.u));
  } else if (!opts.audio) {
    props.className = "sprite-fm-mono icon-audio-off";
  } else {
    props.className = "hidden";
  }

  return props;
}

class RemoteVideoPlayer extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    var self = this;
    var sess = self.props.sess;
    var sid = sess.stringSid;
    var peerMedia = Av.toMediaOptions(this.props.peerAv);
    var contact = M.u[base64urlencode(sess.peer)];

    if (!self.props.video) {
      assert(contact);
      return external_React_default().createElement("div", {
        className: "call user-audio is-avatar " + (self.props.isActive ? "active" : "") + " stream" + sid,
        onClick: () => {
          let onPlayerClick = self.props.onPlayerClick;

          if (onPlayerClick) {
            onPlayerClick(sid);
          }
        }
      }, sess.peerNetworkQuality() === 0 ? external_React_default().createElement("div", {
        className: "icon-connection-issues"
      }) : null, external_React_default().createElement("div", {
        className: "center-avatar-wrapper theme-light-forced",
        style: {
          left: "auto"
        }
      }, external_React_default().createElement("div", muteOrHoldIconStyle(peerMedia, contact)), external_React_default().createElement(ui_contacts.Avatar, {
        contact: contact,
        className: "avatar-wrapper",
        simpletip: contact.name,
        simpletipWrapper: "#call-block",
        simpletipOffset: 8,
        simpletipClass: "in-call",
        simpletipPosition: "top",
        hideVerifiedBadge: true
      })), external_React_default().createElement("div", {
        className: "audio-level",
        ref: function (ref) {
          self.audioLevelDiv = ref;
        }
      }));
    } else {
      return external_React_default().createElement("div", {
        className: "call user-video is-video " + (self.props.isActive ? "active" : "") + " stream" + sid + (peerMedia.screen ? " is-screen" : ""),
        onClick: () => {
          let onPlayerClick = self.props.onPlayerClick;

          if (onPlayerClick) {
            onPlayerClick(sid);
          }
        }
      }, sess.peerNetworkQuality() === 0 ? external_React_default().createElement("div", {
        className: "icon-connection-issues"
      }) : null, external_React_default().createElement("div", muteOrHoldIconStyle(peerMedia, contact)), external_React_default().createElement("div", {
        className: "audio-level",
        ref: function (ref) {
          self.audioLevelDiv = ref;
        }
      }), external_React_default().createElement("video", {
        autoPlay: true,
        className: "rmtViewport rmtVideo",
        ref: "player"
      }));
    }
  }

  indicateAudioLevel(level) {
    if (this.audioLevelDiv) {
      this.audioLevelDiv.style.width = Math.round(level * 100) + '%';
    }
  }

  componentDidMount() {
    var self = this;

    if (!self.props.noAudioLevel) {
      self.props.sess.audioIndicator = this;
    }

    super.componentDidMount();
    self.relinkToStream();
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.player) {
      RTC.detachMediaStream(this.player);
      delete this.player;
    }
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    this.relinkToStream();
  }

  relinkToStream() {
    var self = this;
    let player = self.refs.player;

    if (self.props.video) {
      assert(player);
      let sess = self.props.sess;

      if (player.srcObject) {
        if (player.srcObject.id === sess.remoteStream.id && !player.paused) {
          return;
        }

        RTC.detachMediaStream(player);
      }

      RTC.attachMediaStream(player, sess.remoteStream);
    } else {
      if (player) {
        RTC.detachMediaStream(player);
      }
    }
  }

}

class ConversationAVPanel extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'messagesBlockEnabled': false,
      'fullScreenModeEnabled': false,
      'localMediaDisplay': true,
      'viewMode': VIEW_MODES.GRID,
      'selectedStreamSid': false
    };
  }

  specShouldComponentUpdate() {
    if (this.state.fullScreenModeEnabled) {
      return true;
    }
  }

  getActiveSid() {
    var self = this;
    var call = self.props.chatRoom.callManagerCall;

    if (!call) {
      return false;
    }

    var rtcCall = call.rtcCall;
    var selected = self.state.selectedStreamSid;

    if (selected && selected !== "local" && !rtcCall.sessions[base64urldecode(selected)]) {
      selected = null;
    }

    if (selected) {
      return selected;
    }

    let sess = Object.values(rtcCall.sessions)[0];
    return sess ? sess.stringSid : "local";
  }

  haveScreenSharingPeer() {
    var call = this.props.chatRoom.callManagerCall;

    if (!call) {
      return false;
    }

    var rtcCall = call.rtcCall;

    if (!rtcCall.sessions) {
      return false;
    }

    var sessions = rtcCall.sessions;

    for (var sid in sessions) {
      var av = sessions[sid].peerAv;

      if (av != null && av & Av.Screen) {
        return true;
      }
    }

    return false;
  }

  getViewMode() {
    var chatRoom = this.props.chatRoom;
    var callManagerCall = chatRoom.callManagerCall;

    if (callManagerCall) {
      var participantsCount = Object.keys(callManagerCall.rtcCall.sessions).length;

      if (DEBUG_PARTICIPANTS_MULTIPLICATOR) {
        participantsCount *= DEBUG_PARTICIPANTS_MULTIPLICATOR;
      }

      if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
        return VIEW_MODES.CAROUSEL;
      }
    }

    if (chatRoom.type === "private") {
      return VIEW_MODES.GRID;
    }

    if (this.haveScreenSharingPeer()) {
      return VIEW_MODES.CAROUSEL;
    }

    return this.state.viewMode;
  }

  onPlayerClick(sid) {
    if (this.getViewMode() !== VIEW_MODES.CAROUSEL) {
      return;
    }

    this.setState({
      'selectedStreamSid': sid
    });
  }

  _hideBottomPanel() {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    var room = self.props.chatRoom;

    if (!room.callManagerCall || !room.callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default().findDOMNode(self));
    self.visiblePanel = false;
    $container.removeClass('visible-panel');
  }

  resizeVideos() {
    var self = this;
    var chatRoom = self.props.chatRoom;

    if (chatRoom.type === "private") {
      return;
    }

    var callManagerCall = chatRoom.callManagerCall;

    if (!callManagerCall || !callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default().findDOMNode(self));
    var totalWidth = $container.outerWidth();

    if (totalWidth > $('.participantsContainer', $container).parent().outerWidth()) {
      totalWidth = $('.participantsContainer', $container).parent().outerWidth();
    }

    if (ua.details.browser === "Safari") {
      totalWidth -= 1;
    }

    var $streams = $('.user-video, .user-audio', $container);
    var totalStreams = $streams.length;

    if (totalStreams === 1) {
      totalWidth = Math.min(totalWidth, $container.outerHeight() - $('.call-header', $container).outerHeight());
    }

    var newWidth;

    if (self.getViewMode() === VIEW_MODES.CAROUSEL) {
      var activeStreamHeight = $container.outerHeight() - $('.call-header').outerHeight() - $('.participantsContainer', $container).outerHeight();
      var activeSid = this.getActiveSid();
      var mediaOpts = activeSid === "local" ? callManagerCall.getMediaOptions() : callManagerCall.getRemoteMediaOptions(activeSid);
      $('.activeStream', $container).height(activeStreamHeight);
      $('.user-video, .user-audio, .user-video video', $container).width('').height('');
      var $video;
      var $mutedIcon;
      $video = $('.activeStream video', $container);
      $mutedIcon = $('.activeStream .icon-audio-muted', $container);

      if ($video.length > 0 && $mutedIcon.length > 0) {
        if ($video.outerHeight() > 0 && $video[0].videoWidth > 0 && $video[0].videoHeight > 0) {
          var actualWidth = Math.min($video.outerWidth(), $video[0].videoWidth / $video[0].videoHeight * $video.outerHeight());

          if (mediaOpts.audio) {
            $mutedIcon.addClass('hidden');
          } else {
            $mutedIcon.removeClass('hidden');
          }

          $mutedIcon.css({
            'right': 'auto',
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
      newWidth = totalWidth / totalStreams;
    }

    var $resizables = $('.user-video, .user-audio', $('.participantsContainer', $container));
    $resizables.width(newWidth);

    for (var i = 0; i < $resizables.length; i++) {
      var elem = $resizables[i];
      var $elem = $(elem);
      $('video', elem).width(newWidth).height(newWidth);
      $elem.width(newWidth).height(newWidth);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    this.resizeVideos();
    this.initialRender = false;
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    var self = this;
    var room = self.props.chatRoom;
    var callManagerCall = room.callManagerCall;

    if (!callManagerCall || !callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default().findDOMNode(self));
    var mouseoutThrottling = null;
    $container.rebind('mouseover.chatUI' + room.roomId, function () {
      var $this = $(this);
      clearTimeout(mouseoutThrottling);
      self.visiblePanel = true;
      $container.addClass('visible-panel');

      if ($this.hasClass('full-sized-block')) {
        $('.call.top-panel', $container).addClass('visible-panel');
      }
    });
    $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomId, function () {
      $(this);
      clearTimeout(mouseoutThrottling);

      if ($('.dropdown.call-actions').length > 0) {
        return;
      }

      mouseoutThrottling = setTimeout(function () {
        self.visiblePanel = false;

        self._hideBottomPanel();

        $container.removeClass('visible-panel');
      }, 500);
    });
    var idleMouseTimer;
    var forceMouseHide = false;

    var hideBottomPanel = function () {
      self.visiblePanel = false;

      self._hideBottomPanel();

      $container.addClass('no-cursor');
      $container.removeClass('visible-panel');
      forceMouseHide = true;
      setTimeout(function () {
        forceMouseHide = false;
      }, 400);
    };

    $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomId, function () {
      var $this = $(this);

      if (self._bottomPanelMouseOver) {
        return;
      }

      clearTimeout(idleMouseTimer);

      if (!forceMouseHide) {
        self.visiblePanel = true;
        $container.addClass('visible-panel');
        $container.removeClass('no-cursor');

        if ($this.hasClass('full-sized-block')) {
          $('.call.top-panel', $container).addClass('visible-panel');
        }

        idleMouseTimer = setTimeout(hideBottomPanel, 20000);
      }
    });
    $('.call.bottom-panel', $container).rebind('mouseenter.chatUI' + self.props.chatRoom.roomId, function () {
      self._bottomPanelMouseOver = true;
      clearTimeout(idleMouseTimer);
    });
    $('.call.bottom-panel', $container).rebind('mouseleave.chatUI' + self.props.chatRoom.roomId, function () {
      self._bottomPanelMouseOver = false;
      idleMouseTimer = setTimeout(hideBottomPanel, 20000);
    });
    $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
      if (!$(document).fullScreen() && room.isCurrentlyActive) {
        self.setState({
          fullScreenModeEnabled: false
        });
      } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
        self.setState({
          fullScreenModeEnabled: true
        });
      }

      self.forceUpdate();
    });
    var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
    $localMediaDisplay.draggable({
      'refreshPositions': true,
      'containment': $container,
      'scroll': false,
      drag: function (event, ui) {
        if ($(this).is(".minimized")) {
          return false;
        }

        var right = Math.max(0, $container.outerWidth(true) - ui.position.left);
        var bottom = Math.max(0, $container.outerHeight(true) - ui.position.top);
        right = Math.min(right, $container.outerWidth(true) - 8);
        bottom = Math.min(bottom, $container.outerHeight(true) - 8);
        right -= ui.helper.outerWidth(true);
        bottom -= ui.helper.outerHeight(true);
        ui.offset = {
          left: 'auto',
          top: 'auto',
          right: right < 8 ? 8 : right,
          bottom: bottom < 8 ? 8 : bottom,
          height: "",
          width: ""
        };
        ui.position.left = 'auto';
        ui.position.top = 'auto';
        ui.helper.css(ui.offset);
        $(this).css(ui.offset);
      }
    });
    chatGlobalEventManager.addEventListener('resize', 'chatUI_' + room.roomId, function () {
      if ($container.is(":visible")) {
        if (!elementInViewport($localMediaDisplay[0])) {
          $localMediaDisplay.removeAttr('style');
        }
      }

      self.resizePanes();
      self.resizeVideos();
    });
    room.rebind('toggleMessages.av', function () {
      self.toggleMessages();
    });
    room.messagesBlockEnabled = self.state.messagesBlockEnabled;
    this.props.chatRoom.rebind('onLocalMuteInProgress.ui', function () {
      self.setState({
        'muteInProgress': true
      });
    });
    this.props.chatRoom.rebind('onLocalMuteComplete.ui', function () {
      self.setState({
        'muteInProgress': false
      });
    });

    if (self.initialRender === false && $container) {
      self.bindInitialEvents();
    }

    self.resizePanes();
    self.resizeVideos();
    $('.simpletip', $container).trigger('simpletipUpdated');
  }

  resizePanes() {
    var self = this;
    var $container = $(self.findDOMNode());
    var $rootContainer = $container.parents('.conversation-panel');

    if (!self.state.messagesBlockEnabled && self.props.chatRoom.callManagerCall) {
      $('.call-block', $rootContainer).height('');
    }

    $rootContainer.trigger('resized');
  }

  bindInitialEvents() {
    var self = this;
    var $container = $(external_ReactDOM_default().findDOMNode(self));
    self.avResizable = new FMResizablePane($container, {
      'direction': 's',
      'handle': '.av-resize-handler',
      'minHeight': 168,
      'persistanceKey': false,
      'containment': $container.parent()
    });
    $(self.avResizable).rebind('resize.avp', function (e, e2, ui) {
      self.resizePanes();
      mega.config.set('chatAvPaneHeight', ui.size.height | 0);
    });
    self.initialRender = true;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    var room = self.props.chatRoom;
    var $container = $(external_ReactDOM_default().findDOMNode(self));

    if ($container) {
      $container.off('mouseover.chatUI' + self.props.chatRoom.roomId);
      $container.off('mouseout.chatUI' + self.props.chatRoom.roomId);
      $container.off('mousemove.chatUI' + self.props.chatRoom.roomId);
    }

    $(document).off("fullscreenchange.megaChat_" + room.roomId);
    chatGlobalEventManager.removeEventListener('resize', 'chatUI_' + room.roomId);
    room.off('toggleMessages.av');
    var $rootContainer = $container.parents('.conversation-panel');
    $('.call-block', $rootContainer).height('');
    self.initialRender = false;
  }

  toggleMessages(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (this.props.onMessagesToggle) {
      this.props.onMessagesToggle(!this.state.messagesBlockEnabled);
      var $container = $(this.findDOMNode());
      var predefHeight = mega.config.get('chatAvPaneHeight') | 0;

      if (predefHeight) {
        $container.height(predefHeight);
      }

      $('.simpletip', $container).trigger('simpletipClose');
    }

    this.setState({
      'messagesBlockEnabled': !this.state.messagesBlockEnabled
    });

    if (!this.state.messagesBlockEnabled) {
      Soon(function () {
        $(window).trigger('resize');
      });
    }
  }

  fullScreenModeToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    var newVal = !this.state.fullScreenModeEnabled;
    var $container = $(external_ReactDOM_default().findDOMNode(this));
    $(document).fullScreen(newVal);
    $('.simpletip', $container).trigger('simpletipClose');
    this.setState({
      'fullScreenModeEnabled': newVal,
      'messagesBlockEnabled': newVal ? false : this.state.messagesBlockEnabled
    }, () => this.props.onMessagesToggle && this.props.onMessagesToggle(this.state.messagesBlockEnabled));
  }

  toggleLocalVideoDisplay(e) {
    e.preventDefault();
    e.stopPropagation();
    var $container = $(external_ReactDOM_default().findDOMNode(this));
    var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
    var newVal = !this.state.localMediaDisplay;
    $localMediaDisplay.removeAttr('style');
    this.setState({
      localMediaDisplay: newVal
    });
  }

  render() {
    var chatRoom = this.props.chatRoom;
    var self = this;
    var callManagerCall = chatRoom.callManagerCall;

    if (!callManagerCall || !callManagerCall.isStarted()) {
      self.initialRender = false;
      return null;
    }

    var rtcCall = callManagerCall.rtcCall;
    assert(rtcCall);
    var participants = chatRoom.getParticipantsExceptMe();
    var displayNames = [];
    participants.forEach(function (v) {
      displayNames.push(htmlentities(M.getNameByHandle(v)));
    });
    var localPlayerElement = null;
    var remotePlayerElements = [];
    var onRemotePlayerClick;
    var isCarousel = self.getViewMode() === VIEW_MODES.CAROUSEL;

    if (isCarousel) {
      var activeSid = self.getActiveSid();
      var activePlayer;
      onRemotePlayerClick = self.onPlayerClick.bind(self);
    }

    var sessions = rtcCall.sessions;
    var realSids = Object.keys(sessions);
    var sids = [];
    var initialCount = realSids.length;

    for (var i = 0; i < initialCount; i++) {
      for (var j = 0; j < DEBUG_PARTICIPANTS_MULTIPLICATOR; j++) {
        sids.push(realSids[i]);
      }
    }

    this.visiblePanel ? " visible-panel" : "";
    var localMedia = Av.toMediaOptions(rtcCall.localAv());
    sids.forEach(function (binSid, i) {
      let sess = sessions[binSid];
      let sid = sess.stringSid;
      let playerIsActive = activeSid === sid;
      let av = sess.peerAv();
      let hasVideo = (av & Av.Video) != 0 && !sess.call.isOnHold() && !sess.peerIsOnHold();
      let player = external_React_default().createElement(RemoteVideoPlayer, {
        sess: sess,
        key: sid + "_" + i,
        peerAv: av,
        video: hasVideo,
        isActive: playerIsActive,
        onPlayerClick: onRemotePlayerClick
      });

      if (playerIsActive && isCarousel) {
        activePlayer = external_React_default().createElement(RemoteVideoPlayer, {
          sess: sess,
          key: "carousel_active",
          peerAv: av,
          video: hasVideo,
          isCarouselMain: true,
          noAudioLevel: true
        });
      }

      remotePlayerElements.push(player);
    });

    if (this.getViewMode() === VIEW_MODES.GRID) {
      if (!localMedia.video) {
        localPlayerElement = external_React_default().createElement("div", {
          className: "call local-audio right-aligned bottom-aligned is-avatar" + (this.state.localMediaDisplay ? "" : " minimized ")
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default().createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default().createElement("button", {
          className: "tiny-button call",
          onClick: this.toggleLocalVideoDisplay.bind(this)
        }, external_React_default().createElement("div", null, external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-minimise"
        }))), external_React_default().createElement("div", {
          className: "center-avatar-wrapper"
        }, external_React_default().createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default().createElement(ui_contacts.Avatar, {
          contact: M.u[u_handle],
          chatRoom: this.props.chatRoom,
          className: "call avatar-wrapper is-avatar",
          hideVerifiedBadge: true
        })));
      } else {
        localPlayerElement = external_React_default().createElement("div", {
          className: "call local-video right-aligned is-video bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + (activeSid === "local" ? " active " : "") + (localMedia.screen ? " is-screen" : "")
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default().createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default().createElement("button", {
          className: "tiny-button call",
          onClick: this.toggleLocalVideoDisplay.bind(this)
        }, external_React_default().createElement("div", null, external_React_default().createElement("i", {
          className: "tiny-icon grey-minus-icon"
        }))), external_React_default().createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default().createElement("video", {
          className: "localViewport",
          defaultmuted: "true",
          muted: true,
          volume: 0,
          id: "localvideo_" + base64urlencode(rtcCall.id),
          style: {
            display: !this.state.localMediaDisplay ? "none" : ""
          },
          ref: function (ref) {
            if (ref && !RTC.isAttachedToStream(ref)) {
              RTC.attachMediaStream(ref, rtcCall.localStream());
            }
          }
        }));
      }
    } else {
      let localPlayer;

      if (!localMedia.video) {
        localPlayer = external_React_default().createElement("div", {
          className: "call user-audio local-carousel is-avatar" + (activeSid === "local" ? " active " : ""),
          key: "local",
          onClick: () => {
            self.onPlayerClick("local");
          }
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default().createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default().createElement("div", {
          className: "center-avatar-wrapper"
        }, external_React_default().createElement("div", muteOrHoldIconStyle(callManagerCall.getMediaOptions(), M.u[u_handle])), external_React_default().createElement(ui_contacts.Avatar, {
          contact: M.u[u_handle],
          className: "call avatar-wrapper",
          chatRoom: this.props.chatRoom,
          hideVerifiedBadge: true
        })));

        if (activeSid === "local") {
          activePlayer = localPlayer;
        }
      } else {
        localPlayer = external_React_default().createElement("div", {
          className: "call user-video local-carousel is-video" + (activeSid === "local" ? " active " : "") + (localMedia.screen ? " is-screen" : ""),
          key: "local-video",
          onClick: () => {
            self.onPlayerClick("local");
          }
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default().createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default().createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default().createElement("video", {
          ref: "localViewport",
          className: "localViewport smallLocalViewport",
          defaultmuted: "true",
          muted: true,
          volume: 0,
          id: "localvideo_" + base64urlencode(rtcCall.id),
          ref: function (ref) {
            if (ref && !RTC.isAttachedToStream(ref)) {
              RTC.attachMediaStream(ref, rtcCall.localStream());
            }
          }
        }));

        if (activeSid === "local") {
          activePlayer = external_React_default().createElement("div", {
            className: "call user-video is-video local-carousel local-carousel-big " + (localMedia.screen ? " is-screen" : ""),
            key: "local-video2"
          }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default().createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default().createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default().createElement("video", {
            className: "localViewport bigLocalViewport",
            defaultmuted: "true",
            muted: true,
            volume: 0,
            id: "localvideo_big_" + base64urlencode(rtcCall.id),
            ref: function (ref) {
              if (ref && !RTC.isAttachedToStream(ref)) {
                RTC.attachMediaStream(ref, rtcCall.localStream());
              }
            }
          }));
        }
      }

      remotePlayerElements.push(localPlayer);
    }

    var unreadDiv = null;
    var unreadCount = chatRoom.messagesBuff.getUnreadCount();

    if (unreadCount > 0) {
      unreadDiv = external_React_default().createElement("div", {
        className: "unread-messages"
      }, unreadCount > 9 ? "9+" : unreadCount);
    }

    var additionalClass = "";
    additionalClass = this.state.fullScreenModeEnabled ? " full-sized-block" : "";

    if (additionalClass.length === 0) {
      additionalClass = this.state.messagesBlockEnabled ? " small-block" : "";
    }

    var participantsCount = Object.keys(rtcCall.sessions).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;
    additionalClass += " participants-count-" + participantsCount;
    var header = null;
    var videoSessionCount = rtcCall.getAudioVideoSenderCount().video;
    var videoSendersMaxed = videoSessionCount >= RtcModule.kMaxCallVideoSenders;
    var notifBar = null;

    if (chatRoom.type === "group" || chatRoom.type === "public") {
      const IS_GRID = self.getViewMode() === VIEW_MODES.GRID;
      const EXCEEDS_MAX_PARTICIPANTS = participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE;
      header = external_React_default().createElement("div", {
        className: "call-header"
      }, external_React_default().createElement("div", {
        className: "call-header-column"
      }, external_React_default().createElement("div", {
        className: "call-topic"
      }, external_React_default().createElement(utils.Emoji, null, ellipsis(chatRoom.getRoomTitle(), 'end', 70))), external_React_default().createElement("div", {
        className: "call-participants-count"
      }, chatRoom.getCallParticipants().length)), external_React_default().createElement("div", {
        className: "call-header-column"
      }, external_React_default().createElement("i", {
        className: `
                                call-switch-view
                                sprite-fm-mono
                                ${IS_GRID ? 'icon-speaker-view' : 'icon-thumbnail-view'}
                                ${EXCEEDS_MAX_PARTICIPANTS || this.haveScreenSharingPeer() ? 'disabled' : ''}
                            `,
        onClick: () => EXCEEDS_MAX_PARTICIPANTS || self.setState({
          selectedStreamSid: false,
          viewMode: IS_GRID ? VIEW_MODES.CAROUSEL : VIEW_MODES.GRID
        })
      }), external_React_default().createElement("div", {
        className: `call-av-counter ${videoSendersMaxed ? 'limit-reached' : ''}`
      }, videoSessionCount, " / ", RtcModule.kMaxCallVideoSenders), external_React_default().createElement("i", {
        className: `
                                sprite-fm-mono
                                icon-video-call-filled
                                ${videoSendersMaxed.video ? 'warn' : ''}
                            `
      }), external_React_default().createElement("div", {
        className: "call-header-duration",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallCounter))));
      var nEngine = callManagerCall.callNotificationsEngine;
      var notif = nEngine.getCurrentNotification();

      if (!nEngine._bound) {
        nEngine.rebind('onChange.cavp', function () {
          if (chatRoom.isCurrentlyActive) {
            self.safeForceUpdate();
            var $notif = $('.in-call-notif:visible');
            $notif.css({
              'opacity': 0.3
            }).animate({
              'opacity': 1
            }, {
              queue: false,
              duration: 1500
            });
          }
        });
        nEngine._bound = true;
      }

      if (notif) {
        var title = notif.getTitle();
        notifBar = external_React_default().createElement("div", {
          className: "in-call-notif " + notif.getClassName()
        }, title ? title : null);
      }
    }

    var networkQualityBar = null;
    var netq = megaChat.rtc.ownNetworkQuality();

    if (netq != null && netq <= 1) {
      var networkQualityMessage = l[23213];
      networkQualityBar = external_React_default().createElement("div", {
        className: "in-call-notif yellow" + (notifBar ? " after-green-notif" : "")
      }, networkQualityMessage);
    }

    var otherPartyIsOnHold = false;

    if (realSids.length === 1 && !rtcCall.isOnHold()) {
      var session = sessions[realSids[0]];
      otherPartyIsOnHold = !!session.peerIsOnHold();
    }

    if (rtcCall.isOnHold() || otherPartyIsOnHold) {
      networkQualityBar = external_React_default().createElement("div", {
        className: "in-call-notif gray" + (notifBar ? " after-green-notif" : "")
      }, l[23457]);
    }

    additionalClass += self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel";
    var players = null;

    if (self.getViewMode() === VIEW_MODES.GRID) {
      players = external_React_default().createElement("div", {
        className: "participantsWrapper",
        key: "container"
      }, external_React_default().createElement("div", {
        className: "participantsContainer",
        key: "partsContainer"
      }, external_React_default().createElement("div", {
        className: "call-counter",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallTimer)), remotePlayerElements), localPlayerElement);
    } else {
      players = external_React_default().createElement("div", {
        className: "activeStreamWrap",
        key: "container"
      }, external_React_default().createElement("div", {
        className: "activeStream",
        key: "activeStream"
      }, activePlayer), external_React_default().createElement("div", {
        className: "participantsContainer",
        key: "partsContainer"
      }, remotePlayerElements, localPlayerElement));
    }

    var topPanel = null;

    if (chatRoom.type !== "group") {
      var remoteCamEnabled = null;
      topPanel = external_React_default().createElement("div", {
        className: "call top-panel"
      }, external_React_default().createElement("div", {
        className: "call top-user-info"
      }, external_React_default().createElement("span", {
        className: "user-card-name white"
      }, displayNames.join(", ")), remoteCamEnabled), external_React_default().createElement("div", {
        className: "call-duration medium blue call-counter",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallCounter)));
    }

    if (participantsCount < 4) {
      additionalClass += " participants-less-4";
    } else if (participantsCount < 8) {
      additionalClass += " participants-less-8";
    } else if (participantsCount < 16) {
      additionalClass += " participants-less-16";
    } else {
      additionalClass += " participants-a-lot";
    }

    var hugeOverlayDiv = null;

    if (chatRoom.callReconnecting) {
      hugeOverlayDiv = external_React_default().createElement("div", {
        className: "callReconnecting"
      }, external_React_default().createElement("i", {
        className: "huge-icon crossed-phone"
      }));
    } else if (rtcCall.isOnHold() || otherPartyIsOnHold) {
      hugeOverlayDiv = external_React_default().createElement("div", {
        className: "callReconnecting dark"
      }, external_React_default().createElement("div", {
        className: "call-on-hold body " + (otherPartyIsOnHold ? 'other-party' : 'me')
      }, external_React_default().createElement("div", {
        className: "call-on-hold icon",
        onClick: otherPartyIsOnHold ? undefined : function () {
          rtcCall.releaseOnHold();
        }
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono " + (otherPartyIsOnHold ? "icon-pause" : "icon-play")
      })), external_React_default().createElement("div", {
        className: "call-on-hold txt"
      }, otherPartyIsOnHold ? l[23458] : l[23459])));
      additionalClass += " call-is-on-hold";
    }

    var micMuteBtnDisabled = rtcCall.isLocalMuteInProgress() || rtcCall.isRecovery || rtcCall.isOnHold();
    var camMuteBtnDisabled = micMuteBtnDisabled || !localMedia.video && videoSendersMaxed;
    var screenShareBtnDisabled = micMuteBtnDisabled || !RTC.supportsScreenCapture;
    return external_React_default().createElement("div", {
      className: "call-block" + additionalClass,
      id: "call-block"
    }, external_React_default().createElement("div", {
      className: "av-resize-handler ui-resizable-handle ui-resizable-s " + (this.state.messagesBlockEnabled && !this.state.fullScreenModeEnabled ? "" : "hidden")
    }), header, notifBar, networkQualityBar, null, players, hugeOverlayDiv, topPanel, external_React_default().createElement("div", {
      className: "call bottom-panel theme-light-forced"
    }, external_React_default().createElement("div", {
      className: "button call left" + (unreadDiv ? " unread" : ""),
      onClick: this.toggleMessages.bind(this)
    }, unreadDiv, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-chat-filled simpletip",
      "data-simpletip": this.state.messagesBlockEnabled ? l[22892] : l[22891],
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletipoffset": "5"
    })), external_React_default().createElement("div", {
      className: "button call " + (micMuteBtnDisabled ? " disabled" : ""),
      onClick: function () {
        if (micMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        rtcCall.enableAudio(!localMedia.audio);
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono simpletip " + (localMedia.audio ? "icon-audio-filled" : "icon-audio-off"),
      "data-simpletip": localMedia.audio ? l[16214] : l[16708],
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletipoffset": "5"
    })), external_React_default().createElement("div", {
      className: "button call" + (camMuteBtnDisabled ? " disabled" : ""),
      onClick: function () {
        if (camMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        var videoMode = callManagerCall.videoMode();

        if (videoMode === Av.Video) {
          rtcCall.disableVideo().catch(() => {});
        } else {
          rtcCall.enableCamera().catch(() => {});
        }
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono simpletip " + (callManagerCall.videoMode() === Av.Video ? "icon-video-call-filled" : "icon-video-off"),
      "data-simpletip": callManagerCall.videoMode() === Av.Video ? l[22894] : l[22893],
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletipoffset": "5"
    })), external_React_default().createElement("div", {
      className: "button call" + (screenShareBtnDisabled ? " disabled" : ""),
      onClick: function () {
        if (screenShareBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        if (rtcCall.isScreenCaptureEnabled()) {
          rtcCall.disableVideo().catch(() => {});
        } else {
          rtcCall.enableScreenCapture().catch(() => {});
        }
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono simpletip " + (rtcCall.isScreenCaptureEnabled() ? "icon-end-screenshare" : "icon-screen-share"),
      "data-simpletip": rtcCall.isScreenCaptureEnabled() ? l[22890] : l[22889],
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletipoffset": "5"
    })), external_React_default().createElement(buttons.Button, {
      className: "call",
      disabled: rtcCall.isRecovery && rtcCall.isOnHold(),
      icon: "sprite-fm-mono icon-options"
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "dark black call-actions",
      noArrow: true,
      positionMy: "center top",
      positionAt: "center bottom",
      vertOffset: 10
    }, rtcCall.isOnHold() ? external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-play",
      label: l[23459],
      onClick: function () {
        rtcCall.releaseOnHold();
      }
    }) : external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-pause",
      label: l[23460],
      onClick: function () {
        rtcCall.putOnHold();
      }
    }))), external_React_default().createElement("div", {
      className: "button call",
      onClick: function () {
        callManagerCall.endCall();
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-end-call simpletip",
      "data-simpletip": l[5884],
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletipoffset": "5"
    })), external_React_default().createElement("div", {
      className: "button call right",
      onClick: this.fullScreenModeToggle.bind(this)
    }, external_React_default().createElement("i", {
      className: `
                            sprite-fm-mono
                            ${this.state.fullScreenModeEnabled ? 'icon-fullscreen-leave' : 'icon-fullscreen-enter'}
                            simpletip
                        `,
      "data-simpletip-class": "in-call theme-light-forced",
      "data-simpletip": this.state.fullScreenModeEnabled ? l[22895] : l[17803]
    }))));
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/pushSettingsDialog.jsx




class PushSettingsDialog extends mixins.wl {
  constructor(props) {
    super(props);

    this.renderOptions = () => {
      return Object.keys(PushSettingsDialog.options).map(key => {
        key = parseInt(key, 10) || Infinity;
        return external_React_default().createElement("label", {
          key: key,
          className: "radio-txt"
        }, PushSettingsDialog.options[key], external_React_default().createElement("div", {
          className: "custom-radio small green-active " + (this.state.pushSettingsValue === key ? "radioOn" : "radioOff")
        }, external_React_default().createElement("input", {
          type: "radio",
          name: "time-selector",
          value: key,
          checked: this.state.pushSettingsValue === key,
          onChange: () => this.setState({
            pushSettingsValue: key
          })
        })));
      });
    };

    this.state = {
      pushSettingsValue: this.props.pushSettingsValue || Infinity
    };
  }

  render() {
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      name: "push-settings",
      title: l.dnd_mute_title,
      subtitle: l[22015],
      className: "push-settings-dialog",
      dialogName: "push-settings-chat-dialog",
      dialogType: "tool",
      onClose: this.props.onClose
    }), external_React_default().createElement("section", {
      className: "content"
    }, external_React_default().createElement("div", {
      className: "content-block"
    }, external_React_default().createElement("div", null, this.renderOptions()))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
      className: "footer-container"
    }, external_React_default().createElement("button", {
      className: "mega-button",
      onClick: this.props.onClose
    }, external_React_default().createElement("span", null, l[82])), external_React_default().createElement("button", {
      className: "mega-button positive",
      onClick: () => this.props.onConfirm(this.state.pushSettingsValue)
    }, external_React_default().createElement("span", null, l[726])))));
  }

}
PushSettingsDialog.options = {
  30: l[22012],
  60: l[19048],
  360: l[22013],
  1440: l[22014],
  Infinity: l[22011]
};
PushSettingsDialog.default = PushSettingsDialog.options[PushSettingsDialog.options.length - 1];
// EXTERNAL MODULE: ./js/chat/ui/meetings/call.jsx + 23 modules
var call = __webpack_require__(357);
// EXTERNAL MODULE: ./js/chat/ui/historyPanel.jsx + 8 modules
var historyPanel = __webpack_require__(638);
// EXTERNAL MODULE: ./js/chat/ui/composedTextArea.jsx + 1 modules
var composedTextArea = __webpack_require__(813);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/loading.jsx



class Loading extends mixins.wl {
  constructor(props) {
    super(props);

    this.renderDebug = () => {
      const {
        chatRoom
      } = this.props;

      if (chatRoom && chatRoom.sfuApp) {
        return external_React_default().createElement("div", {
          className: `${Loading.NAMESPACE}-debug`
        }, external_React_default().createElement("div", null, "callId: ", chatRoom.sfuApp.callId), external_React_default().createElement("div", null, "roomId: ", chatRoom.sfuApp.room.roomId), external_React_default().createElement("div", null, "isMeeting: ", chatRoom.sfuApp.room.isMeeting ? 'true' : 'false'));
      }
    };
  }

  componentDidMount() {
    var _notify, _alarm;

    super.componentDidMount();
    document.dispatchEvent(new Event('closeDropdowns'));
    closeDialog == null ? void 0 : closeDialog();
    (_notify = notify) == null ? void 0 : _notify.closePopup();
    (_alarm = alarm) == null ? void 0 : _alarm.hideAllWarningPopups();
    document.querySelectorAll('.js-dropdown-account').forEach(({
      classList
    }) => classList.contains('show') && classList.remove('show'));
  }

  render() {
    const {
      title
    } = this.props;
    return external_React_default().createElement("div", {
      className: Loading.NAMESPACE
    }, external_React_default().createElement("div", {
      className: `${Loading.NAMESPACE}-content`
    }, external_React_default().createElement("span", null, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-video-call-filled"
    })), external_React_default().createElement("h3", null, title || l.starting), external_React_default().createElement("div", {
      className: "loading-container"
    }, external_React_default().createElement("div", {
      className: "loading-indication"
    }))), d ? this.renderDebug() : '');
  }

}
Loading.NAMESPACE = 'meetings-loading';
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
var meetings_button = __webpack_require__(193);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/preview.jsx





class Preview extends mixins.wl {
  constructor(props) {
    super(props);
    this.videoRef = external_React_default().createRef();
    this.stream = null;
    this.state = {
      audio: false,
      video: false
    };

    this.getTrackType = type => !type ? 'getTracks' : type === Preview.STREAMS.AUDIO ? 'getAudioTracks' : 'getVideoTracks';

    this.startStream = () => {
      this.stopStream();
      const {
        audio,
        video
      } = this.state;
      navigator.mediaDevices.getUserMedia({
        audio,
        video
      }).then(stream => {
        const videoRef = this.videoRef.current;

        if (videoRef) {
          videoRef.srcObject = stream;
          this.stream = stream;

          if (this.props.onToggle) {
            this.props.onToggle(this.state.audio, this.state.video);
          }
        }
      }).catch(ex => console.error(ex.name + ": " + ex.message));
    };

    this.stopStream = type => {
      if (this.stream) {
        const trackType = this.getTrackType(type);
        const tracks = this.stream[trackType]();

        for (const track of tracks) {
          track.stop();
        }
      }
    };

    this.toggleStream = type => {
      const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
      this.setState(state => ({
        [stream]: !state[stream]
      }), () => {
        if (this.props.onToggle) {
          this.props.onToggle(this.state.audio, this.state.video);
        }

        return this.state[stream] ? this.startStream(type) : this.stopStream(type);
      });
    };

    this.renderAvatar = () => {
      if (call.ZP.isGuest() || is_chatlink) {
        return external_React_default().createElement("div", {
          className: "avatar-guest"
        }, external_React_default().createElement("i", {
          className: "sprite-fm-uni icon-owner"
        }));
      }

      return external_React_default().createElement(ui_contacts.Avatar, {
        contact: M.u[u_handle]
      });
    };
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.stopStream();
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.props.onToggle) {
      this.props.onToggle(this.state.audio, this.state.video);
    }

    this.toggleStream(Preview.STREAMS.AUDIO);
  }

  render() {
    const {
      NAMESPACE
    } = Preview;
    const {
      audio,
      video
    } = this.state;
    const SIMPLETIP_PROPS = {
      label: undefined,
      position: 'top',
      className: 'theme-dark-forced'
    };
    return external_React_default().createElement("div", {
      className: `
                    ${NAMESPACE}
                    local-stream-mirrored
                `
    }, video && external_React_default().createElement("div", {
      className: `${NAMESPACE}-video-overlay`
    }), external_React_default().createElement("video", {
      className: video ? 'streaming' : '',
      muted: true,
      autoPlay: true,
      ref: this.videoRef
    }), !video && this.renderAvatar(), external_React_default().createElement("div", {
      className: `${NAMESPACE}-controls`
    }, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: audio ? l[16214] : l[16708]
      },
      className: `
                            mega-button
                            round
                            large
                            theme-light-forced
                            ${audio ? '' : 'inactive'}
                        `,
      icon: audio ? 'icon-audio-filled' : 'icon-audio-off',
      onClick: () => this.toggleStream(Preview.STREAMS.AUDIO)
    }, external_React_default().createElement("span", null, audio ? l[16214] : l[16708])), external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: video ? l[22894] : l[22893]
      },
      className: `
                            mega-button
                            round
                            large
                            theme-light-forced
                            ${video ? '' : 'inactive'}
                        `,
      icon: video ? 'icon-video-call-filled' : 'icon-video-off',
      onClick: () => this.toggleStream(Preview.STREAMS.VIDEO)
    }, external_React_default().createElement("span", null, video ? l[22894] : l[22893]))));
  }

}
Preview.NAMESPACE = 'preview-meeting';
Preview.STREAMS = {
  AUDIO: 1,
  VIDEO: 2
};
;// CONCATENATED MODULE: ./js/chat/ui/meetings/meetingsCallEndedDialog.jsx



class MeetingsCallEndedDialog extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'safeShowDialogRendered': false
    };
  }

  componentDidMount() {
    super.componentDidMount();
    M.safeShowDialog(MeetingsCallEndedDialog.dialogName, () => {
      this.setState({
        'safeShowDialogRendered': true
      });
      return this.findDOMNode();
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if ($.dialog === MeetingsCallEndedDialog.dialogName) {
      closeDialog();
    }
  }

  render() {
    const {
      onClose
    } = this.props;

    if (!this.state.safeShowDialogRendered) {
      return null;
    }

    return external_React_default().createElement(modalDialogs.Z.ModalDialog, {
      className: "meetings-call-ended-dialog",
      dialogType: "message",
      title: l.meeting_ended,
      buttons: [{
        label: l.view_history,
        key: "view",
        className: "action",
        onClick: onClose
      }, {
        label: l[81],
        key: "ok",
        className: "negative",
        onClick: () => {
          if (is_chatlink) {
            is_chatlink = false;
            delete megaChat.initialPubChatHandle;
            megaChat.destroy();
          }

          loadSubPage(u_type === 0 ? 'register' : 'securechat');
        }
      }],
      iconElement: external_React_default().createElement("div", {
        className: "avatar"
      }, external_React_default().createElement("div", {
        "data-color": "color12",
        className: "avatar-wrapper small-rounded-avatar color12"
      }, "X")),
      onClose: onClose
    });
  }

}
MeetingsCallEndedDialog.dialogName = 'meetings-ended-dialog';
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
var ui_link = __webpack_require__(941);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/join.jsx









class Join extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      preview: false,
      view: Join.VIEW.INITIAL,
      firstName: '',
      lastName: '',
      previewAudio: false,
      previewVideo: false,
      ephemeralDialog: false
    };

    this.handleKeyDown = ({
      key
    }) => {
      var _this$props$onClose, _this$props;

      return key && key === 'Escape' ? (_this$props$onClose = (_this$props = this.props).onClose) == null ? void 0 : _this$props$onClose.call(_this$props) : true;
    };

    this.showPanels = () => {
      return [document.querySelector('.nw-fm-left-icons-panel'), document.querySelector('.chat-app-container')].map(el => el && el.classList.remove('hidden'));
    };

    this.hidePanels = () => {
      return [document.querySelector('.nw-fm-left-icons-panel'), document.querySelector('.chat-app-container')].map(el => el && el.classList.add('hidden'));
    };

    this.showConfirmationDialog = () => {
      megaChat.destroy();
      return mega.ui.sendSignupLinkDialog(JSON.parse(localStorage.awaitingConfirmationAccount), () => {
        delete localStorage.awaitingConfirmationAccount;
        u_logout(true);
        location.reload();
      });
    };

    this.Ephemeral = () => {
      const onCancel = () => this.setState({
        ephemeralDialog: false
      });

      const msgFragments = l.ephemeral_data_lost.split(/\[A]|\[\/A]/);
      return external_React_default().createElement(modalDialogs.Z.ModalDialog, {
        name: "end-ephemeral",
        dialogType: "message",
        icon: "sprite-fm-uni icon-warning",
        title: l.ephemeral_data_lost_title,
        noCloseOnClickOutside: true,
        buttons: [{
          key: 'cancel',
          label: l[82],
          onClick: onCancel
        }, {
          key: 'continue',
          label: l[507],
          className: 'positive',
          onClick: () => {
            u_logout(true);
            sessionStorage.guestForced = true;
            location.reload();
          }
        }],
        onClose: onCancel
      }, external_React_default().createElement("p", null, msgFragments[0], external_React_default().createElement(ui_link.Z, {
        to: "/register",
        onClick: () => loadSubPage('register')
      }, msgFragments[1]), msgFragments[2]));
    };

    this.Head = () => {
      var _this$props$chatRoom;

      return external_React_default().createElement("div", {
        className: `${Join.NAMESPACE}-head`
      }, external_React_default().createElement("div", {
        className: `${Join.NAMESPACE}-logo`
      }, external_React_default().createElement("i", {
        className: `
                            sprite-fm-illustration-wide
                            ${document.body.classList.contains('theme-dark') ? 'mega-logo-dark' : 'img-mega-logo-light'}
                        `
      })), external_React_default().createElement("h1", null, external_React_default().createElement(utils.Emoji, null, l.you_have_invitation.replace('%1', (_this$props$chatRoom = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom.topic))), isEphemeral() && external_React_default().createElement("div", {
        className: "ephemeral-info"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-uni icon-warning"
      }), external_React_default().createElement("p", null, l.ephemeral_data_store_lost)));
    };

    this.Intro = () => {
      const $$CONTAINER = ({
        children
      }) => external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
        className: `${Join.NAMESPACE}-content`
      }, children), this.Chat());

      if (isEphemeral()) {
        return external_React_default().createElement($$CONTAINER, null, external_React_default().createElement(meetings_button.Z, {
          className: "mega-button positive",
          onClick: () => this.setState({
            ephemeralDialog: true
          })
        }, l.join_as_guest), external_React_default().createElement(meetings_button.Z, {
          className: "mega-button",
          onClick: () => loadSubPage('register')
        }, l[5582]), external_React_default().createElement("span", null, l[5585], external_React_default().createElement("a", {
          href: "#",
          onClick: () => mega.ui.showLoginRequiredDialog({
            minUserType: 3,
            skipInitialDialog: 1
          }).done(() => this.setState({
            view: Join.VIEW.ACCOUNT
          }))
        }, l[171])));
      }

      return external_React_default().createElement($$CONTAINER, null, external_React_default().createElement(meetings_button.Z, {
        className: "mega-button positive",
        onClick: () => this.setState({
          view: Join.VIEW.GUEST
        })
      }, l.join_as_guest), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button",
        onClick: () => {
          var _this$props$chatRoom2;

          megaChat.loginOrRegisterBeforeJoining((_this$props$chatRoom2 = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom2.publicChatHandle, false, true, undefined, () => this.setState({
            view: Join.VIEW.ACCOUNT
          }));
        }
      }, l[171]), external_React_default().createElement("p", null, external_React_default().createElement(utils.ParsedHTML, {
        onClick: e => {
          e.preventDefault();
          megaChat.loginOrRegisterBeforeJoining(this.props.chatRoom.publicChatHandle, true, undefined, undefined, () => this.setState({
            view: Join.VIEW.ACCOUNT
          }));
        }
      }, l[20635])));
    };

    this.Chat = () => {
      const {
        chatRoom
      } = this.props;
      const {
        preview
      } = this.state;
      return external_React_default().createElement("div", {
        className: `
                    ${Join.NAMESPACE}-chat
                    ${preview ? 'expanded' : ''}
                `
      }, external_React_default().createElement("div", {
        className: "chat-content"
      }, external_React_default().createElement("div", {
        className: "chat-content-head",
        onClick: () => this.setState({
          preview: !preview
        })
      }, external_React_default().createElement(utils.Emoji, null, chatRoom.topic), external_React_default().createElement(meetings_button.Z, {
        icon: "icon-minimise"
      })), preview && external_React_default().createElement("div", {
        className: "chat-body"
      }, external_React_default().createElement(historyPanel.Z, {
        chatRoom: chatRoom,
        onMount: cmp => cmp.messagesListScrollable.scrollToBottom()
      }))));
    };

    this.Card = ({
      children
    }) => external_React_default().createElement("div", {
      className: "card"
    }, external_React_default().createElement("div", {
      className: "card-body"
    }, children, external_React_default().createElement("div", null, external_React_default().createElement(ui_link.Z, {
      to: "/securechat"
    }, l.how_meetings_work))), external_React_default().createElement("div", {
      className: "card-preview"
    }, external_React_default().createElement(Preview, {
      onToggle: (audio, video) => this.setState({
        previewAudio: audio,
        previewVideo: video
      })
    })));

    this.Field = ({
      name,
      children
    }) => {
      var _this$state$name;

      return external_React_default().createElement("div", {
        className: `
                    mega-input
                    title-ontop
                    ${(_this$state$name = this.state[name]) != null && _this$state$name.length ? 'valued' : ''}
                `
      }, external_React_default().createElement("div", {
        className: "mega-input-title"
      }, children, external_React_default().createElement("span", {
        className: "required-red"
      }, "*")), external_React_default().createElement("input", {
        type: "text",
        name: name,
        className: "titleTop required megaInputs",
        placeholder: children,
        value: this.state[name] || '',
        onChange: ev => this.setState({
          [name]: ev.target.value
        })
      }));
    };

    this.Guest = () => external_React_default().createElement(this.Card, null, external_React_default().createElement("h2", null, l.enter_name_join_meeting), external_React_default().createElement("div", {
      className: "card-fields"
    }, external_React_default().createElement(this.Field, {
      name: "firstName"
    }, l[1096]), external_React_default().createElement(this.Field, {
      name: "lastName"
    }, l[1097])), external_React_default().createElement(meetings_button.Z, {
      className: `
                    mega-button
                    positive
                    large
                    ${this.state.firstName.length && this.state.lastName.length ? '' : 'disabled'}
                    ${this.state.joining && " loading disabled"}
                `,
      onClick: () => {
        if (this.state.joining) {
          return;
        }

        let {
          firstName,
          lastName,
          previewAudio,
          previewVideo
        } = this.state;
        firstName = firstName && firstName.trim();
        lastName = lastName && lastName.trim();

        if (firstName && lastName && firstName.length > 0 && lastName.length > 0) {
          this.setState({
            'joining': true
          });
          this.props.onJoinGuestClick(firstName, lastName, previewAudio, previewVideo);
        }
      }
    }, l.join_chat_button));

    this.Account = () => external_React_default().createElement(this.Card, null, external_React_default().createElement("h4", null, l.join_meeting), external_React_default().createElement(meetings_button.Z, {
      className: `mega-button positive large ${this.state.joining && " loading disabled"}`,
      onClick: () => {
        if (!this.state.joining) {
          this.setState({
            'joining': true
          });
          this.props.onJoinClick(this.state.previewAudio, this.state.previewVideo);
        }
      }
    }, "Join"));

    this.Unsupported = () => external_React_default().createElement("div", {
      className: "unsupported-container"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-error"
    }), external_React_default().createElement("div", {
      className: "unsupported-info"
    }, external_React_default().createElement("h3", null, "Your browser can't support MEGA meeting"), external_React_default().createElement("h3", null, "You can join meeting via the following approaches:"), external_React_default().createElement("ul", null, external_React_default().createElement("li", null, "Open the link via Chrome version XXX"), external_React_default().createElement("li", null, "Join via Mobile apps ", external_React_default().createElement(ui_link.Z, {
      to: "/mobile"
    }, "Download Mobile App")))));

    this.View = view => {
      switch (view) {
        default:
          return this.Intro();

        case Join.VIEW.GUEST:
          return this.Guest();

        case Join.VIEW.ACCOUNT:
          return this.Account();

        case Join.VIEW.UNSUPPORTED:
          return this.Unsupported();
      }
    };

    this.state.view = sessionStorage.guestForced ? Join.VIEW.GUEST : props.initialView || this.state.view;

    if (localStorage.awaitingConfirmationAccount) {
      this.showConfirmationDialog();
    }
  }

  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('keydown', this.handleKeyDown);
    this.hidePanels();
    megaChat._joinDialogIsShown = true;
    alarm.hideAllWarningPopups();

    if ($.dialog === MeetingsCallEndedDialog.dialogName) {
      closeDialog();
    }

    sessionStorage.removeItem('guestForced');
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('keydown', this.handleKeyDown);
    this.showPanels();
    megaChat._joinDialogIsShown = false;

    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  render() {
    const {
      view,
      ephemeralDialog
    } = this.state;
    return external_React_default().createElement(utils["default"].RenderTo, {
      element: document.body
    }, external_React_default().createElement("div", {
      className: Join.NAMESPACE
    }, this.Head(), this.View(view), ephemeralDialog && external_React_default().createElement(this.Ephemeral, null)));
  }

}
Join.NAMESPACE = 'join-meeting';
Join.VIEW = {
  INITIAL: 0,
  GUEST: 1,
  ACCOUNT: 2,
  UNSUPPORTED: 4
};
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/alert.jsx


const NAMESPACE = 'meetings-alert';
class Alert extends mixins.wl {
  render() {
    const {
      type,
      content,
      onClose
    } = this.props;

    if (content) {
      return external_React_default().createElement("div", {
        className: `
                        ${NAMESPACE}
                        ${type ? `${NAMESPACE}-${type}` : ''}
                    `
      }, external_React_default().createElement("div", {
        className: `${NAMESPACE}-content`
      }, content), onClose && external_React_default().createElement("span", {
        className: `${NAMESPACE}-close`,
        onClick: onClose
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-close-component"
      })));
    }

    return null;
  }

}
Alert.TYPE = {
  NEUTRAL: 'neutral',
  MEDIUM: 'medium',
  HIGH: 'high'
};
;// CONCATENATED MODULE: ./js/chat/ui/conversationpanel.jsx



var conversationpanel_dec, _dec2, conversationpanel_class;


























const ENABLE_GROUP_CALLING_FLAG = true;
const MAX_USERS_CHAT_PRIVATE = 100;

class EndCallButton extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.IS_MODERATOR = call.ZP.isModerator(this.props.chatRoom, u_handle);
    this.LABELS = {
      END_CALL: 'End call...',
      END_FOR_ALL: 'End for all',
      END_CALL_FOR_ALL: 'End call for all',
      LEAVE: 'Leave',
      LEAVE_CALL: 'Leave call',
      DIALOG_TITLE: 'End call for all?',
      DIALOG_BODY: 'This will end the call for all participants'
    };
    this.EVENTS = ['onCallPeerJoined.endCallButton', 'onCallPeerLeft.endCallButton'];
  }

  shouldComponentUpdate() {
    return true;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.EVENTS.map(ev => this.props.chatRoom.unbind(ev));
  }

  componentDidMount() {
    super.componentDidMount();
    this.EVENTS.map(ev => this.props.chatRoom.rebind(ev, () => this.safeForceUpdate()));
  }

  renderButton({
    label,
    onClick,
    children = null
  }) {
    return external_React_default().createElement(buttons.Button, {
      className: "link-button light red dropdown-element",
      icon: "small-icon colorized horizontal-red-handset",
      label: label,
      onClick: onClick
    }, children);
  }

  render() {
    const {
      chatRoom
    } = this.props;
    const {
      type,
      activeCall
    } = chatRoom;

    if (activeCall) {
      const peers = activeCall.peers && activeCall.peers.length;

      if (type === 'private') {
        return this.renderButton({
          label: this.LABELS.END_CALL,
          onClick: () => activeCall.hangUp()
        });
      }

      if (this.IS_MODERATOR) {
        return this.renderButton({
          label: this.LABELS.END_CALL,
          onClick: peers ? null : () => activeCall.hangUp(),
          children: peers && external_React_default().createElement(dropdowns.Dropdown, {
            className: "wide-dropdown send-files-selector light",
            noArrow: "true",
            vertOffset: 4,
            horizOffset: 0
          }, external_React_default().createElement(dropdowns.DropdownItem, {
            className: "link-button",
            icon: "sprite-fm-mono icon-leave-call",
            label: this.LABELS.LEAVE,
            onClick: () => activeCall.hangUp()
          }), external_React_default().createElement(dropdowns.DropdownItem, {
            className: "link-button",
            icon: "sprite-fm-mono icon-contacts",
            label: this.LABELS.END_FOR_ALL,
            onClick: () => chatRoom.endCallForAll()
          }))
        });
      }

      return this.renderButton({
        label: peers ? this.LABELS.LEAVE_CALL : this.LABELS.END_CALL,
        onClick: () => activeCall.hangUp()
      });
    }

    if (chatRoom.havePendingGroupCall()) {
      return this.IS_MODERATOR ? this.renderButton({
        label: this.LABELS.END_CALL_FOR_ALL,
        onClick: () => msgDialog('confirmation', null, this.LABELS.DIALOG_TITLE, this.LABELS.DIALOG_BODY, cb => cb ? chatRoom.endCallForAll() : 0xDEAD)
      }) : null;
    }

    return null;
  }

}

class JoinCallNotification extends mixins.wl {
  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }

  render() {
    const {
      chatRoom
    } = this.props;

    if (chatRoom.activeCall) {
      return null;
    }

    if (!megaChat.hasSupportForCalls) {
      return external_React_default().createElement("div", {
        className: "in-call-notif yellow join"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-phone"
      }), l.active_call_not_supported);
    }

    return external_React_default().createElement("div", {
      className: "in-call-notif neutral join"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-phone"
    }), external_React_default().createElement(utils.ParsedHTML, {
      onClick: () => (0,call.xt)(true).then(() => chatRoom.joinCall()).catch(ex => d && console.warn('Already in a call.', ex))
    }, (l[20460] || 'There is an active group call. [A]Join[/A]').replace('[A]', '<button class="mega-button positive joinActiveCall small">').replace('[/A]', '</button>')));
  }

}
class ConversationRightArea extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      contactPickerDialog: false
    };
  }

  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }

  allContactsInChat(participants) {
    if (participants.length === 0) {
      return false;
    }

    var currentContacts = M.u.keys();

    for (var i = 0; i < currentContacts.length; i++) {
      var k = currentContacts[i];

      if (M.u[k].c === 1 && participants.indexOf(k) === -1) {
        return false;
      }
    }

    return true;
  }

  setRetention(chatRoom, retentionTime) {
    chatRoom.setRetention(retentionTime);
    $(document).trigger('closeDropdowns');
  }

  render() {
    const self = this;
    const {
      chatRoom: room,
      onStartCall
    } = self.props;

    if (!room || !room.roomId) {
      return null;
    }

    if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
      return null;
    }

    self._wasAppendedEvenOnce = true;
    var startCallDisabled = isStartCallDisabled(room);
    var startCallButtonClass = startCallDisabled ? " disabled" : "";
    var startAudioCallButton;
    var startVideoCallButton;
    var isInCall = !!room.activeCall;

    if (isInCall) {
      startAudioCallButton = startVideoCallButton = null;
    }

    if (room.type === "group" || room.type === "public") {
      if (room.getCallParticipants().length > 0 && !isInCall) {
        startAudioCallButton = startVideoCallButton = null;
      }
    }

    if (startAudioCallButton !== null) {
      startAudioCallButton = external_React_default().createElement("div", {
        className: `link-button light ${startCallButtonClass}`,
        onClick: () => onStartCall(call.ZP.TYPE.AUDIO)
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-phone"
      }), external_React_default().createElement("span", null, l[5896]));
    }

    if (startVideoCallButton !== null) {
      startVideoCallButton = external_React_default().createElement("div", {
        className: `link-button light ${startCallButtonClass}`,
        onClick: () => onStartCall(call.ZP.TYPE.VIDEO)
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-video-call-filled"
      }), external_React_default().createElement("span", null, l[5897]));
    }

    var AVseperator = external_React_default().createElement("div", {
      className: "chat-button-separator"
    });
    var isReadOnlyElement = null;

    if (room.isReadOnly()) {
      isReadOnlyElement = external_React_default().createElement("center", {
        className: "center",
        style: {
          margin: "6px"
        }
      }, l.read_only_chat);
    }

    var excludedParticipants = room.type === "group" || room.type === "public" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipants() : room.getParticipants();

    if (excludedParticipants.indexOf(u_handle) >= 0) {
      array.remove(excludedParticipants, u_handle, false);
    }

    var dontShowTruncateButton = false;

    if (!room.iAmOperator() || room.isReadOnly() || room.messagesBuff.messages.length === 0 || room.messagesBuff.messages.length === 1 && room.messagesBuff.messages.getItem(0).dialogType === "truncated") {
      dontShowTruncateButton = true;
    }

    const renameButtonClass = `
            link-button
            light
            ${call.ZP.isGuest() || room.isReadOnly() || !room.iAmOperator() ? 'disabled' : ''}
        `;
    const getChatLinkClass = `
            link-button
            light
            ${call.ZP.isGuest() || room.isReadOnly() ? 'disabled' : ''}
        `;
    let participantsList = null;

    if (room.type === "group" || room.type === "public") {
      participantsList = external_React_default().createElement("div", null, isReadOnlyElement, external_React_default().createElement(ParticipantsList, {
        ref: function (r) {
          self.participantsListRef = r;
        },
        chatRoom: room,
        members: room.members,
        isCurrentlyActive: room.isCurrentlyActive
      }));
    }

    const addParticipantBtn = external_React_default().createElement(buttons.Button, {
      className: "link-button light",
      icon: "sprite-fm-mono icon-add-small",
      label: l[8007],
      disabled: call.ZP.isGuest() || !(!room.isReadOnly() && room.iAmOperator() && !self.allContactsInChat(excludedParticipants)),
      onClick: () => {
        this.setState({
          contactPickerDialog: true
        });
      }
    });
    const {
      pushSettingsValue,
      onPushSettingsToggled,
      onPushSettingsClicked
    } = this.props;
    const pushSettingsIcon = pushSettingsValue || pushSettingsValue === 0 ? 'icon-notification-off-filled' : 'icon-notification-filled';
    const pushSettingsBtn = !is_chatlink && room.membersSetFromApi.members.hasOwnProperty(u_handle) && external_React_default().createElement("div", {
      className: "push-settings"
    }, AVseperator, external_React_default().createElement(buttons.Button, {
      className: `
                        link-button
                        light
                        push-settings-button
                        ${call.ZP.isGuest() ? 'disabled' : ''}
                    `,
      icon: `
                        sprite-fm-mono
                        ${pushSettingsIcon}
                    `,
      label: l[16709],
      secondLabel: (() => {
        if (pushSettingsValue !== null && pushSettingsValue !== undefined) {
          return pushSettingsValue === 0 ? PushSettingsDialog.options[Infinity] : l[23539].replace('%s', unixtimeToTimeString(pushSettingsValue));
        }
      })(),
      secondLabelClass: "label--green",
      toggle: call.ZP.isGuest() ? null : {
        enabled: !pushSettingsValue && pushSettingsValue !== 0,
        onClick: () => !pushSettingsValue && pushSettingsValue !== 0 ? onPushSettingsClicked() : onPushSettingsToggled()
      },
      onClick: () => call.ZP.isGuest() ? null : onPushSettingsClicked()
    }), AVseperator);
    let retentionTime = room.retentionTime ? secondsToDays(room.retentionTime) : 0;
    const ICON_ACTIVE = external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-check"
    });
    const retentionHistoryBtn = external_React_default().createElement(buttons.Button, {
      className: "link-button light history-retention-btn",
      icon: "sprite-fm-mono icon-recents-filled",
      label: l[23436],
      disabled: !room.iAmOperator() || room.isReadOnly() || call.ZP.isGuest(),
      secondLabel: room.getRetentionLabel(),
      secondLabelClass: "label--red",
      chatRoom: room
    }, room.iAmOperator() ? external_React_default().createElement(dropdowns.Dropdown, {
      className: "retention-history-menu light",
      noArrow: "false",
      vertOffset: -53,
      horizOffset: -205
    }, external_React_default().createElement("div", {
      className: "retention-history-menu__list"
    }, external_React_default().createElement("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, 0)
    }, external_React_default().createElement("span", null, l[7070]), retentionTime === 0 && ICON_ACTIVE), external_React_default().createElement("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(1))
    }, external_React_default().createElement("span", null, l[23437]), retentionTime === 1 && ICON_ACTIVE), external_React_default().createElement("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(7))
    }, external_React_default().createElement("span", null, l[23438]), retentionTime === 7 && ICON_ACTIVE), external_React_default().createElement("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(30))
    }, external_React_default().createElement("span", null, l[23439]), retentionTime === 30 && ICON_ACTIVE), external_React_default().createElement("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => {
        $(document).trigger('closeDropdowns');
        self.props.onHistoryRetentionConfig();
      }
    }, external_React_default().createElement("span", null, l[23440]), [0, 1, 7, 30].indexOf(retentionTime) === -1 && ICON_ACTIVE))) : null);
    var expandedPanel = {};

    if (room.type === "group" || room.type === "public") {
      expandedPanel['participants'] = true;
    } else {
      expandedPanel['options'] = true;
    }

    return external_React_default().createElement("div", {
      className: "chat-right-area"
    }, external_React_default().createElement(perfectScrollbar.F, {
      className: "chat-right-area conversation-details-scroll",
      options: {
        'suppressScrollX': true
      },
      ref: function (ref) {
        self.rightScroll = ref;
      },
      triggerGlobalResize: true,
      isVisible: self.props.chatRoom.isCurrentlyActive,
      chatRoom: self.props.chatRoom
    }, external_React_default().createElement("div", {
      className: `
                        chat-right-pad
                        ${room.haveActiveCall() ? 'in-call' : ''}
                    `
    }, external_React_default().createElement(Accordion, (0,esm_extends.Z)({}, this.state, {
      chatRoom: room,
      onToggle: SoonFc(20, function () {
        if (self.rightScroll) {
          self.rightScroll.reinitialise();
        }

        if (self.participantsListRef) {
          self.participantsListRef.safeForceUpdate();
        }
      }),
      expandedPanel: expandedPanel
    }), participantsList ? external_React_default().createElement(AccordionPanel, {
      className: "small-pad",
      title: l[8876],
      chatRoom: room,
      key: "participants"
    }, participantsList) : null, room.type === "public" && room.observers > 0 ? external_React_default().createElement("div", {
      className: "accordion-text observers"
    }, l[20466], external_React_default().createElement("span", {
      className: "observers-count"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-eye-reveal"
    }), room.observers)) : external_React_default().createElement("div", null), external_React_default().createElement(AccordionPanel, {
      key: "options",
      className: "have-animation buttons",
      title: l[7537],
      chatRoom: room,
      sfuClient: window.sfuClient
    }, external_React_default().createElement("div", null, addParticipantBtn, startAudioCallButton, startVideoCallButton, external_React_default().createElement(EndCallButton, {
      call: room.havePendingGroupCall() || room.haveActiveCall(),
      chatRoom: room
    }), room.type == "group" || room.type == "public" ? external_React_default().createElement("div", {
      className: renameButtonClass,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (self.props.onRenameClicked) {
          self.props.onRenameClicked();
        }
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-rename"
    }), external_React_default().createElement("span", null, l[9080])) : null, room.type === "public" ? external_React_default().createElement("div", {
      className: getChatLinkClass,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onGetManageChatLinkClicked();
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-link-filled"
    }), external_React_default().createElement("span", null, l[20481])) : null, !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === "public" && !is_chatlink && room.publicChatHandle && room.publicChatKey ? external_React_default().createElement("div", {
      className: "link-button light",
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onJoinViaPublicLinkClicked();
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-rename"
    }), external_React_default().createElement("span", null, l[20597])) : null, AVseperator, external_React_default().createElement(buttons.Button, {
      className: "link-button light dropdown-element",
      icon: "sprite-fm-mono icon-upload-filled",
      label: l[23753],
      disabled: room.isReadOnly()
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "wide-dropdown send-files-selector light",
      noArrow: "true",
      vertOffset: 4,
      onClick: () => {}
    }, external_React_default().createElement("div", {
      className: "dropdown info-txt"
    }, l[23753] ? l[23753] : "Send..."), external_React_default().createElement(dropdowns.DropdownItem, {
      className: "link-button",
      icon: "sprite-fm-mono icon-cloud-drive",
      label: l[19794] ? l[19794] : "My Cloud Drive",
      disabled: mega.paywall,
      onClick: () => {
        self.props.onAttachFromCloudClicked();
      }
    }), external_React_default().createElement(dropdowns.DropdownItem, {
      className: "link-button",
      icon: "sprite-fm-mono icon-session-history",
      label: l[19795] ? l[19795] : "My computer",
      disabled: mega.paywall,
      onClick: () => {
        self.props.onAttachFromComputerClicked();
      }
    }))), pushSettingsBtn, external_React_default().createElement(buttons.Button, {
      className: "link-button light clear-history-button",
      disabled: dontShowTruncateButton || !room.members.hasOwnProperty(u_handle),
      onClick: () => {
        if (self.props.onTruncateClicked) {
          self.props.onTruncateClicked();
        }
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-remove"
    }), external_React_default().createElement("span", {
      className: "accordion-clear-history-text"
    }, l[8871])), retentionHistoryBtn, room.iAmOperator() && room.type === "public" ? external_React_default().createElement("div", {
      className: "chat-enable-key-rotation-paragraph"
    }, AVseperator, external_React_default().createElement("div", {
      className: "link-button light " + (Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE ? " disabled" : ""),
      onClick: e => {
        if (Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE || $(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onMakePrivateClicked();
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-key"
    }), external_React_default().createElement("span", null, l[20623])), external_React_default().createElement("p", null, external_React_default().createElement("span", null, l[20454]))) : null, AVseperator, external_React_default().createElement("div", {
      className: `
                                        link-button
                                        light
                                        ${(room.members.hasOwnProperty(u_handle) || room.state === ChatRoom.STATE.LEFT) && !is_chatlink ? '' : 'disabled'}
                                    `,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (room.isArchived()) {
          if (self.props.onUnarchiveClicked) {
            self.props.onUnarchiveClicked();
          }
        } else if (self.props.onArchiveClicked) {
          self.props.onArchiveClicked();
        }
      }
    }, external_React_default().createElement("i", {
      className: `
                                            sprite-fm-mono
                                            ${room.isArchived() ? 'icon-unarchive' : 'icon-archive'}
                                        `
    }), external_React_default().createElement("span", null, room.isArchived() ? l[19065] : l[16689])), room.type !== "private" ? external_React_default().createElement("div", {
      className: `
                                            link-button
                                            light
                                            ${room.type !== "private" && !is_chatlink && room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.membersSetFromApi.members[u_handle] !== -1 && !room.activeCall ? '' : 'disabled'}
                                        `,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (self.props.onLeaveClicked) {
          self.props.onLeaveClicked();
        }
      }
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-disabled-filled"
    }), external_React_default().createElement("span", null, l[8633])) : null)), external_React_default().createElement(SharedFilesAccordionPanel, {
      key: "sharedFiles",
      title: l[19796] ? l[19796] : "Shared Files",
      chatRoom: room,
      sharedFiles: room.messagesBuff.sharedFiles
    }), room.type === "private" ? external_React_default().createElement(IncSharesAccordionPanel, {
      key: "incomingShares",
      title: l[5542],
      chatRoom: room
    }) : null))), this.state.contactPickerDialog && external_React_default().createElement(ui_contacts.ContactPickerDialog, {
      exclude: excludedParticipants,
      megaChat: room.megaChat,
      multiple: true,
      className: 'popup add-participant-selector',
      singleSelectedButtonLabel: l[8869],
      multipleSelectedButtonLabel: l[8869],
      nothingSelectedButtonLabel: l[8870],
      onSelectDone: selected => {
        this.props.onAddParticipantSelected(selected);
        this.setState({
          contactPickerDialog: false
        });
      },
      onClose: () => {
        this.setState({
          contactPickerDialog: false
        });
      },
      selectFooter: true
    }));
  }

}
ConversationRightArea.defaultProps = {
  'requiresUpdateOnResize': true
};
let ConversationPanel = (conversationpanel_dec = utils["default"].SoonFcWrap(360), _dec2 = (0,mixins.LY)(0.7, 9), (conversationpanel_class = class ConversationPanel extends mixins.wl {
  constructor(props) {
    super(props);
    this.containerRef = external_React_default().createRef();
    this.$container = null;
    this.$messages = null;
    this.state = {
      startCallPopupIsActive: false,
      localVideoIsMinimized: false,
      isFullscreenModeEnabled: false,
      mouseOverDuringCall: false,
      attachCloudDialog: false,
      messagesToggledInCall: false,
      sendContactDialog: false,
      confirmDeleteDialog: false,
      pasteImageConfirmDialog: false,
      nonLoggedInJoinChatDialog: false,
      pushSettingsDialog: false,
      pushSettingsValue: null,
      messageToBeDeleted: null,
      callMinimized: false,
      editing: false,
      showHistoryRetentionDialog: false,
      setNonLoggedInJoinChatDlgTrue: null,
      hasInvalidKeys: null,
      invalidKeysBanner: null
    };

    this.handleDeleteDialog = msg => {
      if (msg) {
        this.setState({
          editing: false,
          confirmDeleteDialog: true,
          messageToBeDeleted: msg
        });
      }
    };

    this.toggleExpandedFlag = () => document.body.classList[call.ZP.isExpanded() ? 'remove' : 'add'](call.F3);

    this.startCall = type => {
      const {
        chatRoom
      } = this.props;

      if (isStartCallDisabled(chatRoom)) {
        return false;
      }

      return type === call.ZP.TYPE.AUDIO ? chatRoom.startAudioCall() : chatRoom.startVideoCall();
    };

    const {
      chatRoom: _chatRoom
    } = this.props;

    _chatRoom.rebind(`openAttachCloudDialog.${this.getUniqueId()}`, () => this.openAttachCloudDialog());

    _chatRoom.rebind(`openSendContactDialog.${this.getUniqueId()}`, () => this.openSendContactDialog());

    this.handleKeyDown = SoonFc(120, ev => this._handleKeyDown(ev));
  }

  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }

  openAttachCloudDialog() {
    this.setState({
      'attachCloudDialog': true
    });
  }

  openSendContactDialog() {
    this.setState({
      'sendContactDialog': true
    });
  }

  onMouseMove() {
    if (this.isComponentEventuallyVisible()) {
      this.props.chatRoom.trigger("onChatIsFocused");
    }
  }

  _handleKeyDown() {
    if (this.__isMounted) {
      const chatRoom = this.props.chatRoom;

      if (chatRoom.isActive() && !chatRoom.isReadOnly()) {
        chatRoom.trigger("onChatIsFocused");
      }
    }
  }

  componentDidMount() {
    super.componentDidMount();
    var self = this;
    self.$container = $('.conversation-panel', '#fmholder');
    self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', self.$container);
    window.addEventListener('keydown', self.handleKeyDown);
    self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function () {
      self.callJustEnded = true;
    });
    self.props.chatRoom.rebind('onSendMessage.scrollToBottom', function () {
      self.props.chatRoom.scrolledToBottom = true;

      if (self.messagesListScrollable) {
        self.messagesListScrollable.scrollToBottom();
      }
    });
    self.props.chatRoom.rebind('openSendFilesDialog.cpanel', function () {
      self.setState({
        'attachCloudDialog': true
      });
    });
    self.props.chatRoom.rebind('showGetChatLinkDialog.ui', function () {
      createTimeoutPromise(function () {
        return self.props.chatRoom.topic && self.props.chatRoom.state === ChatRoom.STATE.READY;
      }, 350, 15000).always(function () {
        if (self.props.chatRoom.isCurrentlyActive) {
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

      if (otherContactHash in M.u) {
        self._privateChangeListener = M.u[otherContactHash].addChangeListener(function () {
          if (!self.isMounted()) {
            return 0xDEAD;
          }

          self.safeForceUpdate();
        });
      }
    }

    self.eventuallyInit();

    if (is_chatlink && !self.props.chatRoom.isMeeting) {
      self.state.setNonLoggedInJoinChatDlgTrue = setTimeout(function () {
        M.safeShowDialog('chat-links-preview-desktop', () => {
          if (self.isMounted()) {
            self.setState({
              'nonLoggedInJoinChatDialog': true
            });
          }
        });
      }, rand_range(5, 10) * 1000);
    }

    if (is_chatlink && self.props.chatRoom.isMeeting && u_type !== false && u_type < 3) {
      eventlog(99747, JSON.stringify([1, u_type | 0]), true);
    }

    self.props.chatRoom._uiIsMounted = true;
    self.props.chatRoom.$rConversationPanel = self;
    self.props.chatRoom.trigger('onComponentDidMount');

    ChatdIntegration._waitForProtocolHandler(this.props.chatRoom, () => {
      if (this.isMounted()) {
        const hasInvalidKeys = this.props.chatRoom.hasInvalidKeys();
        this.setState({
          hasInvalidKeys,
          invalidKeysBanner: hasInvalidKeys
        }, () => this.safeForceUpdate());
      }
    });
  }

  eventuallyInit() {
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

    var room = self.props.chatRoom;
    $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
      if (self.isComponentEventuallyVisible()) {
        self.setState({
          isFullscreenModeEnabled: !!$(document).fullScreen()
        });
        self.forceUpdate();
      }
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom._uiIsMounted = true;

    if (this._privateChangeListener) {
      var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];

      if (otherContactHash in M.u) {
        M.u[otherContactHash].removeChangeListener(this._privateChangeListener);
        delete this._privateChangeListener;
      }
    }

    this.props.chatRoom.unbind("openAttachCloudDialog." + this.getUniqueId());
    this.props.chatRoom.unbind("openSendContactDialog." + this.getUniqueId());
    window.removeEventListener('keydown', self.handleKeyDown);
    $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
    $(document).off('keydown.keyboardScroll_' + chatRoom.roomId);
  }

  componentDidUpdate(prevProps, prevState) {
    var self = this;
    var room = this.props.chatRoom;
    self.eventuallyInit(false);
    room.megaChat.updateSectionUnreadCount();
    var domNode = self.findDOMNode();

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
      var $typeArea = $('.messages-textarea:visible:first', domNode);

      if ($typeArea.length === 1) {
        $typeArea.trigger("focus");
        moveCursortoToEnd($typeArea[0]);
      }
    }

    if (!prevState.renameDialog && self.state.renameDialog === true) {
      Soon(function () {
        var $input = $('.chat-rename-dialog input');

        if ($input && $input[0] && !$($input[0]).is(":focus")) {
          $input.trigger("focus");
          $input[0].selectionStart = 0;
          $input[0].selectionEnd = $input.val().length;
        }
      });
    }

    if (self.$messages && self.isComponentEventuallyVisible()) {
      $(window).rebind('pastedimage.chatRoom', function (e, blob, fileName) {
        if (self.$messages && self.isComponentEventuallyVisible()) {
          self.setState({
            'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)]
          });
          e.preventDefault();
        }
      });
      self.props.chatRoom.trigger("onComponentDidUpdate");
    }
  }

  isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  }

  render() {
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
    var conversationPanelClasses = "conversation-panel " + (room.type === "public" ? "group-chat " : "") + room.type + "-chat";

    if (!room.isCurrentlyActive || megaChat._joinDialogIsShown) {
      conversationPanelClasses += " hidden";
    }

    var topicBlockClass = "chat-topic-block";

    if (room.type !== "public") {
      topicBlockClass += " privateChat";
    }

    var attachCloudDialog = null;

    if (self.state.attachCloudDialog === true) {
      var selected = [];
      attachCloudDialog = external_React_default().createElement(cloudBrowserModalDialog.CloudBrowserDialog, {
        folderSelectNotAllowed: true,
        allowAttachFolders: true,
        room: room,
        onClose: () => {
          self.setState({
            'attachCloudDialog': false
          });
          selected = [];
        },
        onSelected: nodes => {
          selected = nodes;
        },
        onAttachClicked: () => {
          self.setState({
            'attachCloudDialog': false
          });
          self.props.chatRoom.scrolledToBottom = true;
          room.attachNodes(selected);
        }
      });
    }

    var nonLoggedInJoinChatDialog = null;

    if (self.state.nonLoggedInJoinChatDialog === true) {
      var usersCount = Object.keys(room.members).length;

      let closeJoinDialog = () => {
        onIdle(() => {
          if ($.dialog === 'chat-links-preview-desktop') {
            closeDialog();
          }
        });
        self.setState({
          'nonLoggedInJoinChatDialog': false
        });
      };

      nonLoggedInJoinChatDialog = external_React_default().createElement(modalDialogs.Z.ModalDialog, {
        title: l[20596],
        className: "mega-dialog chat-links-preview-desktop dialog-template-graphic",
        chatRoom: room,
        onClose: closeJoinDialog
      }, external_React_default().createElement("section", {
        className: "content"
      }, external_React_default().createElement("div", {
        className: "chatlink-contents"
      }, external_React_default().createElement("div", {
        className: "huge-icon group-chat"
      }), external_React_default().createElement("h3", null, external_React_default().createElement(utils.Emoji, null, room.topic ? room.getRoomTitle() : " ")), external_React_default().createElement("h5", null, usersCount ? l[20233].replace("%s", usersCount) : " "), external_React_default().createElement("p", null, l[20595]))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
        className: "bottom-buttons"
      }, external_React_default().createElement("button", {
        className: "mega-button positive",
        onClick: () => {
          closeJoinDialog();
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle, false, false, false, () => {
            megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey).then(() => {
              delete megaChat.initialPubChatHandle;
            }, ex => {
              console.error("Failed to join room:", ex);
            });
          });
        }
      }, l[20597]), external_React_default().createElement("button", {
        className: "mega-button",
        onClick: closeJoinDialog
      }, l[18682]))));
    }

    var chatLinkDialog;

    if (self.state.chatLinkDialog === true) {
      chatLinkDialog = external_React_default().createElement(ChatlinkDialog, {
        chatRoom: self.props.chatRoom,
        onClose: () => {
          self.setState({
            'chatLinkDialog': false
          });
        }
      });
    }

    let privateChatDialog;

    if (self.state.privateChatDialog === true) {
      const onClose = () => this.setState({
        privateChatDialog: false
      });

      privateChatDialog = external_React_default().createElement(modalDialogs.Z.ModalDialog, {
        title: l[20594],
        className: "mega-dialog create-private-chat",
        chatRoom: room,
        onClose: onClose,
        dialogType: "action",
        dialogName: "create-private-chat-dialog"
      }, external_React_default().createElement("section", {
        className: "content"
      }, external_React_default().createElement("div", {
        className: "content-block"
      }, external_React_default().createElement("i", {
        className: "huge-icon lock"
      }), external_React_default().createElement("div", {
        className: "dialog-body-text"
      }, external_React_default().createElement("strong", null, l[20590]), external_React_default().createElement("br", null), external_React_default().createElement("span", null, l[20591])))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
        className: "footer-container"
      }, external_React_default().createElement("button", {
        className: "mega-button positive large",
        onClick: () => {
          this.props.chatRoom.switchOffPublicMode();
          onClose();
        }
      }, external_React_default().createElement("span", null, l[20593])))));
    }

    var sendContactDialog = null;

    if (self.state.sendContactDialog === true) {
      var excludedContacts = [];

      if (room.type == "private") {
        room.getParticipantsExceptMe().forEach(function (userHandle) {
          if (userHandle in M.u) {
            excludedContacts.push(M.u[userHandle].u);
          }
        });
      }

      sendContactDialog = external_React_default().createElement(modalDialogs.Z.SelectContactDialog, {
        chatRoom: room,
        exclude: excludedContacts,
        onClose: () => {
          self.setState({
            'sendContactDialog': false
          });
          selected = [];
        },
        onSelectClicked: selected => {
          self.setState({
            'sendContactDialog': false
          });
          room.attachContacts(selected);
        }
      });
    }

    var confirmDeleteDialog = null;

    if (self.state.confirmDeleteDialog === true) {
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ConfirmDialog, {
        chatRoom: room,
        dialogType: "main",
        title: l[8004],
        subtitle: l[8879],
        name: "delete-message",
        pref: "1",
        onClose: () => {
          self.setState({
            'confirmDeleteDialog': false
          });
        },
        onConfirmClicked: () => {
          var msg = self.state.messageToBeDeleted;

          if (!msg) {
            return;
          }

          var chatdint = room.megaChat.plugins.chatdIntegration;

          if (msg.getState() === Message.STATE.SENT || msg.getState() === Message.STATE.DELIVERED || msg.getState() === Message.STATE.NOT_SENT) {
            const textContents = msg.textContents || '';

            if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
              const attachmentMetadata = msg.getAttachmentMeta() || [];
              attachmentMetadata.forEach(v => {
                M.moveToRubbish(v.h);
              });
            }

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
            msg.trigger('onChange', [msg, "deleted", false, true]);
          }
        }
      }, external_React_default().createElement("section", {
        className: "content"
      }, external_React_default().createElement("div", {
        className: "content-block"
      }, external_React_default().createElement(generic.Z, {
        className: " dialog-wrapper",
        message: self.state.messageToBeDeleted,
        hideActionButtons: true,
        initTextScrolling: true,
        dialog: true,
        chatRoom: self.props.chatRoom
      }))));
    }

    if (self.state.pasteImageConfirmDialog) {
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ConfirmDialog, {
        chatRoom: room,
        title: l[20905],
        subtitle: l[20906],
        icon: "sprite-fm-uni icon-question",
        name: "paste-image-chat",
        pref: "2",
        onClose: () => {
          self.setState({
            'pasteImageConfirmDialog': false
          });
        },
        onConfirmClicked: () => {
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
      }, external_React_default().createElement("img", {
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
        onLoad: function (e) {
          $(e.target).parents('.paste-image-chat').position({
            of: $(document.body)
          });
        }
      }));
    }

    let pushSettingsDialog = null;

    if (self.state.pushSettingsDialog === true) {
      const state = {
        pushSettingsDialog: false,
        pushSettingsValue: null
      };
      pushSettingsDialog = external_React_default().createElement(PushSettingsDialog, {
        room: room,
        pushSettingsValue: this.state.pushSettingsValue,
        onClose: () => this.setState({ ...state,
          pushSettingsValue: this.state.pushSettingsValue
        }),
        onConfirm: pushSettingsValue => self.setState({ ...state,
          pushSettingsValue
        }, () => pushNotificationSettings.setDnd(room.chatId, pushSettingsValue === Infinity ? 0 : unixtime() + pushSettingsValue * 60))
      });
    }

    if (self.state.truncateDialog === true) {
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ConfirmDialog, {
        chatRoom: room,
        title: l[8871],
        subtitle: l[8881],
        icon: "sprite-fm-uni icon-question",
        name: "truncate-conversation",
        pref: "3",
        dontShowAgainCheckbox: false,
        onClose: () => {
          self.setState({
            'truncateDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.truncate();
          self.setState({
            'truncateDialog': false
          });
        }
      });
    }

    if (self.state.archiveDialog === true) {
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ConfirmDialog, {
        chatRoom: room,
        title: l[19068],
        subtitle: l[19069],
        icon: "sprite-fm-uni icon-question",
        name: "archive-conversation",
        pref: "4",
        onClose: () => {
          self.setState({
            'archiveDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.archive();
          self.setState({
            'archiveDialog': false
          });
        }
      });
    }

    if (self.state.unarchiveDialog === true) {
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ConfirmDialog, {
        chatRoom: room,
        title: l[19063],
        subtitle: l[19064],
        icon: "sprite-fm-uni icon-question",
        name: "unarchive-conversation",
        pref: "5",
        onClose: () => {
          self.setState({
            'unarchiveDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.unarchive();
          self.setState({
            'unarchiveDialog': false
          });
        }
      });
    }

    if (self.state.renameDialog === true) {
      var onEditSubmit = function (e) {
        if (self.props.chatRoom.setRoomTitle(self.state.renameDialogValue)) {
          self.setState({
            'renameDialog': false,
            'renameDialogValue': undefined
          });
        }

        e.preventDefault();
        e.stopPropagation();
      };

      var renameDialogValue = typeof self.state.renameDialogValue !== 'undefined' ? self.state.renameDialogValue : self.props.chatRoom.getRoomTitle();
      confirmDeleteDialog = external_React_default().createElement(modalDialogs.Z.ModalDialog, {
        chatRoom: room,
        title: l[9080],
        name: "rename-group",
        className: "chat-rename-dialog dialog-template-main",
        onClose: () => {
          self.setState({
            'renameDialog': false,
            'renameDialogValue': undefined
          });
        },
        buttons: [{
          "label": l[1686],
          "key": "cancel",
          "onClick": function (e) {
            self.setState({
              'renameDialog': false,
              'renameDialogValue': undefined
            });
            e.preventDefault();
            e.stopPropagation();
          }
        }, {
          "label": l[61],
          "key": "rename",
          "className": $.trim(self.state.renameDialogValue).length === 0 || self.state.renameDialogValue === self.props.chatRoom.getRoomTitle() ? "positive disabled" : "positive",
          "onClick": function (e) {
            onEditSubmit(e);
          }
        }]
      }, external_React_default().createElement("section", {
        className: "content"
      }, external_React_default().createElement("div", {
        className: "content-block"
      }, external_React_default().createElement("div", {
        className: "dialog secondary-header"
      }, external_React_default().createElement("div", {
        className: "rename-input-bl"
      }, external_React_default().createElement("input", {
        type: "text",
        className: "chat-rename-group-dialog",
        name: "newTopic",
        value: renameDialogValue,
        maxLength: "30",
        onChange: e => {
          self.setState({
            'renameDialogValue': e.target.value.substr(0, 30)
          });
        },
        onKeyUp: e => {
          if (e.which === 13) {
            onEditSubmit(e);
          }
        }
      }))))));
    }

    var topicInfo = null;

    if (self.props.chatRoom.type === "group" || self.props.chatRoom.type === "public") {
      topicInfo = external_React_default().createElement("div", {
        className: "chat-topic-info"
      }, external_React_default().createElement("div", {
        className: "chat-topic-icon"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-uni icon-chat-group"
      })), external_React_default().createElement("div", {
        className: "chat-topic-text"
      }, external_React_default().createElement("span", {
        className: "txt"
      }, external_React_default().createElement(utils.Emoji, null, self.props.chatRoom.getRoomTitle())), external_React_default().createElement("span", {
        className: "txt small"
      }, external_React_default().createElement(ui_contacts.MembersAmount, {
        room: self.props.chatRoom
      }))));
    } else {
      contactHandle = contacts[0];
      contact = M.u[contactHandle];
      topicInfo = external_React_default().createElement(ui_contacts.ContactCard, {
        className: "short",
        chatRoom: room,
        noContextButton: "true",
        contact: contact,
        showLastGreen: true,
        key: contact.u
      });
    }

    let historyRetentionDialog = null;

    if (self.state.showHistoryRetentionDialog === true) {
      historyRetentionDialog = external_React_default().createElement(HistoryRetentionDialog, {
        chatRoom: room,
        title: '',
        name: "rename-group",
        className: "",
        onClose: () => {
          self.setState({
            showHistoryRetentionDialog: false
          });
        }
      });
    }

    var startCallDisabled = isStartCallDisabled(room);
    startCallDisabled ? " disabled" : "";
    return external_React_default().createElement("div", {
      className: conversationPanelClasses,
      onMouseMove: () => self.onMouseMove(),
      "data-room-id": self.props.chatRoom.chatId
    }, room.meetingsLoading && external_React_default().createElement(Loading, {
      chatRoom: room,
      title: room.meetingsLoading
    }), room.sfuApp && external_React_default().createElement(call.ZP, {
      chatRoom: room,
      sfuApp: room.sfuApp,
      streams: room.sfuApp.callManagerCall.peers,
      call: room.sfuApp.callManagerCall,
      minimized: this.state.callMinimized,
      onCallMinimize: () => {
        return this.state.callMinimized ? null : this.setState({
          callMinimized: true
        }, () => {
          this.toggleExpandedFlag();
          this.safeForceUpdate();
        });
      },
      onCallExpand: () => {
        return this.state.callMinimized && this.setState({
          callMinimized: false
        }, () => {
          $.hideTopMenu();
          loadSubPage('fm/chat');
          room.show();
          this.toggleExpandedFlag();
        });
      },
      didMount: this.toggleExpandedFlag,
      willUnmount: minimised => this.setState({
        callMinimized: false
      }, () => minimised ? null : this.toggleExpandedFlag()),
      onCallEnd: () => this.safeForceUpdate(),
      onDeleteMessage: this.handleDeleteDialog,
      parent: this
    }), megaChat.initialPubChatHandle && room.publicChatHandle === megaChat.initialPubChatHandle && !room.activeCall && room.isMeeting && !room.activeCall && room.activeCallIds.length > 0 && external_React_default().createElement(Join, {
      initialView: u_type || is_eplusplus ? Join.VIEW.ACCOUNT : Join.VIEW.INITIAL,
      chatRoom: room,
      onJoinGuestClick: (firstName, lastName, audioFlag, videoFlag) => {
        room.meetingsLoading = l.joining;
        u_eplusplus(firstName, lastName).then(() => {
          return megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey);
        }).then(() => {
          delete megaChat.initialPubChatHandle;
          return megaChat.getChatById(room.chatId).joinCall(audioFlag, videoFlag);
        }).catch(ex => {
          if (d) {
            console.error('E++ account failure!', ex);
          }

          setTimeout(() => {
            msgDialog('warninga', l[135], l.eplusplus_create_failed, escapeHTML(api_strerror(ex) || ex));
          }, 1234);
          eventlog(99745, JSON.stringify([1, String(ex).split('\n')[0]]));
        });
      },
      onJoinClick: (audioFlag, videoFlag) => {
        const chatId = room.chatId;

        if (room.members[u_handle]) {
          delete megaChat.initialPubChatHandle;
          megaChat.routing.reinitAndOpenExistingChat(chatId, room.publicChatHandle).then(() => {
            megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
          }, ex => {
            console.error("Failed to open existing room and join call:", ex);
          });
        } else {
          megaChat.routing.reinitAndJoinPublicChat(chatId, room.publicChatHandle, room.publicChatKey).then(() => {
            delete megaChat.initialPubChatHandle;
            megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
          }, ex => {
            console.error("Failed to join room:", ex);
          });
        }
      }
    }), external_React_default().createElement("div", {
      className: "chat-content-block " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ? "with-pane" : "no-pane")
    }, !room.megaChat.chatUIFlags['convPanelCollapse'] ? external_React_default().createElement(ConversationRightArea, {
      isVisible: this.props.chatRoom.isCurrentlyActive,
      chatRoom: this.props.chatRoom,
      roomFlags: this.props.chatRoom.flags,
      members: this.props.chatRoom.membersSetFromApi,
      messagesBuff: room.messagesBuff,
      pushSettingsValue: pushNotificationSettings.getDnd(this.props.chatRoom.chatId),
      onStartCall: mode => (0,call.xt)().then(() => this.startCall(mode)).catch(() => d && console.warn('Already in a call.')),
      onAttachFromComputerClicked: function () {
        self.props.chatRoom.uploadFromComputer();
      },
      onTruncateClicked: function () {
        self.setState({
          'truncateDialog': true
        });
      },
      onArchiveClicked: function () {
        self.setState({
          'archiveDialog': true
        });
      },
      onUnarchiveClicked: function () {
        self.setState({
          'unarchiveDialog': true
        });
      },
      onRenameClicked: function () {
        self.setState({
          'renameDialog': true,
          'renameDialogValue': self.props.chatRoom.getRoomTitle()
        });
      },
      onGetManageChatLinkClicked: function () {
        self.setState({
          'chatLinkDialog': true
        });
      },
      onMakePrivateClicked: function () {
        self.setState({
          'privateChatDialog': true
        });
      },
      onLeaveClicked: function () {
        room.leave(true);
      },
      onCloseClicked: function () {
        room.destroy();
      },
      onJoinViaPublicLinkClicked: function () {
        room.joinViaPublicHandle();
      },
      onSwitchOffPublicMode: function (topic) {
        room.switchOffPublicMode(topic);
      },
      onAttachFromCloudClicked: function () {
        self.setState({
          'attachCloudDialog': true
        });
      },
      onPushSettingsClicked: function () {
        self.setState({
          'pushSettingsDialog': true
        });
      },
      onPushSettingsToggled: function () {
        return room.dnd || room.dnd === 0 ? self.setState({
          pushSettingsValue: null
        }, () => pushNotificationSettings.disableDnd(room.chatId)) : pushNotificationSettings.setDnd(room.chatId, 0);
      },
      onHistoryRetentionConfig: function () {
        self.setState({
          showHistoryRetentionDialog: true
        });
      },
      onAddParticipantSelected: function (contactHashes) {
        self.props.chatRoom.scrolledToBottom = true;

        if (self.props.chatRoom.type == "private") {
          var megaChat = self.props.chatRoom.megaChat;
          loadingDialog.show();
          megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getParticipantsExceptMe().concat(contactHashes), {
            keyRotation: false,
            topic: ''
          }]);
        } else {
          self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
        }
      }
    }) : null, room.callManagerCall && room.callManagerCall.isStarted() ? external_React_default().createElement(ConversationAVPanel, {
      chatRoom: this.props.chatRoom,
      unreadCount: this.props.chatRoom.messagesBuff.getUnreadCount(),
      onMessagesToggle: function (isActive) {
        self.setState({
          'messagesToggledInCall': isActive
        }, function () {
          $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
        });
      }
    }) : null, privateChatDialog, chatLinkDialog, nonLoggedInJoinChatDialog, attachCloudDialog, sendContactDialog, confirmDeleteDialog, historyRetentionDialog, null, pushSettingsDialog, external_React_default().createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden"
    }, external_React_default().createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default().createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default().createElement("i", {
      className: "small-icon conversations"
    }), l[8882])), external_React_default().createElement("div", {
      className: `
                            chat-topic-block
                            ${topicBlockClass}
                            ${room.haveActiveCall() ? 'in-call' : ''}
                        `
    }, external_React_default().createElement("div", {
      className: "chat-topic-buttons"
    }, external_React_default().createElement(buttons.Button, {
      className: "right",
      disableCheckingVisibility: true,
      icon: "sprite-fm-mono icon-info-filled",
      onClick: () => room.megaChat.toggleUIFlag('convPanelCollapse')
    }), external_React_default().createElement(buttons.Button, {
      className: `
                                    button
                                    right
                                    ${startCallDisabled ? 'disabled' : ''}
                                `,
      icon: "sprite-fm-mono icon-video-call-filled",
      onClick: () => startCallDisabled ? false : (0,call.xt)().then(() => this.startCall(call.ZP.TYPE.VIDEO)).catch(() => d && console.warn('Already in a call.'))
    }), external_React_default().createElement(buttons.Button, {
      className: `
                                    button
                                    right
                                    ${startCallDisabled ? 'disabled' : ''}
                                `,
      icon: "sprite-fm-mono icon-phone",
      onClick: () => startCallDisabled ? false : (0,call.xt)().then(() => this.startCall(call.ZP.TYPE.AUDIO)).catch(() => d && console.warn('Already in a call.'))
    })), topicInfo), external_React_default().createElement("div", {
      ref: this.containerRef,
      className: `
                            messages-block
                            ${""}
                        `
    }, this.state.hasInvalidKeys && this.state.invalidKeysBanner && external_React_default().createElement(Alert, {
      type: Alert.TYPE.HIGH,
      content: external_React_default().createElement((external_React_default()).Fragment, null, "An error occurred while trying to join this chat. Reloading MEGAchat may fix the problem. ", external_React_default().createElement("a", {
        onClick: () => M.reload()
      }, "Reload account")),
      onClose: () => this.setState({
        invalidKeysBanner: false
      })
    }), external_React_default().createElement(historyPanel.Z, (0,esm_extends.Z)({}, this.props, {
      onMessagesListScrollableMount: mls => {
        this.messagesListScrollable = mls;
      },
      ref: historyPanel => {
        this.historyPanel = historyPanel;
      },
      onDeleteClicked: this.handleDeleteDialog
    })), !is_chatlink && room.state !== ChatRoom.STATE.LEFT && (room.havePendingGroupCall() || room.havePendingCall()) && navigator.onLine ? external_React_default().createElement(JoinCallNotification, {
      chatRoom: room
    }) : null, room.isAnonymous() ? external_React_default().createElement("div", {
      className: "join-chat-block"
    }, external_React_default().createElement("div", {
      className: "mega-button large positive",
      onClick: () => {
        const join = () => {
          megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey).then(() => delete megaChat.initialPubChatHandle, ex => console.error("Failed to join room:", ex));
        };

        if (u_type === 0) {
          return loadSubPage('register');
        }

        if (u_type === false) {
          clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle, false, false, false, join);
          return;
        }

        clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
        join();
      }
    }, l[20597])) : external_React_default().createElement(composedTextArea.Z, {
      chatRoom: room,
      parent: this,
      containerRef: this.containerRef
    }))));
  }

}, ((0,applyDecoratedDescriptor.Z)(conversationpanel_class.prototype, "onMouseMove", [conversationpanel_dec], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "onMouseMove"), conversationpanel_class.prototype), (0,applyDecoratedDescriptor.Z)(conversationpanel_class.prototype, "render", [_dec2], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "render"), conversationpanel_class.prototype)), conversationpanel_class));
class ConversationPanels extends mixins.wl {
  render() {
    var self = this;
    var now = Date.now();
    var conversations = [];
    megaChat.chats.forEach(function (chatRoom) {
      if (chatRoom.isCurrentlyActive || now - chatRoom.lastShownInUI < 900000) {
        conversations.push(external_React_default().createElement(ConversationPanel, {
          chatUIFlags: self.props.chatUIFlags,
          isExpanded: chatRoom.megaChat.chatUIFlags['convPanelCollapse'],
          chatRoom: chatRoom,
          roomType: chatRoom.type,
          isActive: chatRoom.isCurrentlyActive,
          messagesBuff: chatRoom.messagesBuff,
          key: chatRoom.roomId + "_" + chatRoom.instanceIndex
        }));
      }
    });

    if (self._MuChangeListener) {
      console.assert(M.u.removeChangeListener(self._MuChangeListener));
      delete self._MuChangeListener;
    }

    if (megaChat.chats.length === 0) {
      if (megaChat.routingSection !== "chat") {
        return null;
      }

      self._MuChangeListener = M.u.addChangeListener(() => self.safeForceUpdate());
      var contactsList = [];
      var contactsListOffline = [];
      var lim = Math.min(10, M.u.length);
      var userHandles = M.u.keys();

      for (var i = 0; i < lim; i++) {
        var contact = M.u[userHandles[i]];

        if (contact.u !== u_handle && contact.c === 1) {
          var pres = megaChat.userPresenceToCssClass(contact.presence);
          (pres === "offline" ? contactsListOffline : contactsList).push(external_React_default().createElement(ui_contacts.ContactCard, {
            contact: contact,
            key: contact.u,
            chatRoom: false
          }));
        }
      }

      let emptyMessage = escapeHTML(l[8008]).replace("[P]", "<span>").replace("[/P]", "</span>");
      let button = external_React_default().createElement("button", {
        className: "mega-button positive large new-chat-link",
        onClick: () => $(document.body).trigger('startNewChatLink')
      }, external_React_default().createElement("span", null, l[20638]));

      if (is_chatlink) {
        button = null;
        emptyMessage = '';
      }

      const hasContacts = !!contactsList.length || !!contactsListOffline.length;
      return external_React_default().createElement("div", null, hasContacts && external_React_default().createElement("div", {
        className: "chat-right-area"
      }, external_React_default().createElement("div", {
        className: "chat-right-area contacts-list-scroll"
      }, external_React_default().createElement("div", {
        className: "chat-right-pad"
      }, contactsList, contactsListOffline))), external_React_default().createElement("div", {
        className: `
                            fm-empty-section
                            ${hasContacts ? 'empty-messages' : 'empty-conversations'}
                        `
      }, external_React_default().createElement("div", {
        className: "fm-empty-pad"
      }, external_React_default().createElement("i", {
        className: "section-icon sprite-fm-mono icon-chat-filled"
      }), external_React_default().createElement("div", {
        className: "fm-empty-cloud-txt small"
      }, external_React_default().createElement(utils.ParsedHTML, null, emptyMessage)), button)));
    }

    return external_React_default().createElement("div", {
      className: "conversation-panels " + self.props.className
    }, [], conversations);
  }

}

function isStartCallDisabled(room) {
  if (call.ZP.isGuest()) {
    return true;
  }

  if (!megaChat.hasSupportForCalls) {
    return true;
  }

  return !room.isOnlineForCalls() || room.isReadOnly() || !room.chatId || room.activeCall || (room.type === "group" || room.type === "public") && false || room.getCallParticipants().length > 0;
}
;// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultTable.jsx


class ResultTable extends mixins.wl {
  render() {
    const {
      heading,
      children
    } = this.props;
    return external_React_default().createElement("div", {
      className: `result-table ${heading ? '' : 'nil'}`
    }, heading ? external_React_default().createElement("div", {
      className: "result-table-heading"
    }, heading) : null, children);
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultRow.jsx








const RESULT_ROW_CLASS = 'result-table-row';
const USER_CARD_CLASS = 'user-card';

const roomIsGroup = room => room && room.type === 'group' || room.type === 'public';

const openResult = ({
  room,
  messageId,
  index
}, callback) => {
  document.dispatchEvent(new Event(EVENTS.RESULT_OPEN));

  if (isString(room)) {
    loadSubPage(`fm/chat/p/${room}`);
  } else if (room && room.chatId && !messageId) {
    const chatRoom = megaChat.getChatById(room.chatId);

    if (chatRoom) {
      loadSubPage(chatRoom.getRoomUrl());
    } else {
      megaChat.openChat([u_handle, room.chatId], 'private', undefined, undefined, undefined, true);
    }
  } else {
    loadSubPage(room.getRoomUrl());

    if (messageId) {
      room.scrollToMessageId(messageId, index);
    }
  }

  return callback && typeof callback === 'function' && callback();
};

const lastActivity = room => {
  if (!room.lastActivity || !room.ctime) {
    room = megaChat.getChatById(room.chatId);
  }

  if (room && room.lastActivity || room.ctime) {
    return room.lastActivity ? todayOrYesterday(room.lastActivity * 1000) ? getTimeMarker(room.lastActivity) : time2date(room.lastActivity, 17) : todayOrYesterday(room.ctime * 1000) ? getTimeMarker(room.ctime) : time2date(room.ctime, 17);
  }

  return l[8000];
};

class MessageRow extends mixins.wl {
  render() {
    const {
      data,
      matches,
      room,
      index,
      onResultOpen
    } = this.props;
    const isGroup = room && roomIsGroup(room);
    const contact = room.getParticipantsExceptMe();
    const summary = data.renderableSummary || room.messagesBuff.getRenderableSummary(data);
    return external_React_default().createElement("div", {
      ref: node => {
        this.nodeRef = node;
      },
      className: `
                    ${RESULT_ROW_CLASS}
                    message
                `,
      onClick: () => openResult({
        room,
        messageId: data.messageId,
        index
      }, () => onResultOpen(this.nodeRef))
    }, external_React_default().createElement("div", {
      className: "message-result-avatar"
    }, isGroup ? external_React_default().createElement("div", {
      className: "chat-topic-icon"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-chat-group"
    })) : external_React_default().createElement(ui_contacts.Avatar, {
      contact: M.u[contact]
    })), external_React_default().createElement("div", {
      className: "user-card"
    }, external_React_default().createElement("span", {
      className: "title"
    }, external_React_default().createElement(ui_contacts.ContactAwareName, {
      contact: M.u[contact]
    }, external_React_default().createElement(utils.OFlowEmoji, null, room.getRoomTitle()))), isGroup ? null : external_React_default().createElement(ui_contacts.ContactPresence, {
      contact: M.u[contact]
    }), external_React_default().createElement("div", {
      className: "clear"
    }), external_React_default().createElement("div", {
      className: "message-result-info"
    }, external_React_default().createElement("div", {
      className: "summary"
    }, external_React_default().createElement(utils.OFlowParsedHTML, {
      content: megaChat.highlight(summary, matches, true)
    })), external_React_default().createElement("div", {
      className: "result-separator"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-dot"
    })), external_React_default().createElement("span", {
      className: "date"
    }, getTimeMarker(data.delay, true)))));
  }

}

class ChatRow extends mixins.wl {
  render() {
    const {
      room,
      matches,
      onResultOpen
    } = this.props;
    const result = megaChat.highlight(megaChat.html(room.topic), matches, true);
    return external_React_default().createElement("div", {
      ref: node => {
        this.nodeRef = node;
      },
      className: RESULT_ROW_CLASS,
      onClick: () => openResult({
        room
      }, () => onResultOpen(this.nodeRef))
    }, external_React_default().createElement("div", {
      className: "chat-topic-icon"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-chat-group"
    })), external_React_default().createElement("div", {
      className: USER_CARD_CLASS
    }, external_React_default().createElement("div", {
      className: "graphic"
    }, external_React_default().createElement(utils.OFlowParsedHTML, null, result)), lastActivity(room)), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}

class MemberRow extends mixins.wl {
  render() {
    const {
      data,
      matches,
      room,
      contact,
      onResultOpen
    } = this.props;
    const isGroup = room && roomIsGroup(room);
    return external_React_default().createElement("div", {
      ref: node => {
        this.nodeRef = node;
      },
      className: RESULT_ROW_CLASS,
      onClick: () => openResult({
        room: room || contact.h
      }, () => onResultOpen(this.nodeRef))
    }, isGroup ? external_React_default().createElement("div", {
      className: "chat-topic-icon"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-uni icon-chat-group"
    })) : external_React_default().createElement(ui_contacts.Avatar, {
      contact: contact
    }), external_React_default().createElement("div", {
      className: USER_CARD_CLASS
    }, external_React_default().createElement("div", {
      className: "graphic"
    }, isGroup ? external_React_default().createElement(utils.OFlowParsedHTML, null, megaChat.highlight(megaChat.html(room.topic || room.getRoomTitle()), matches, true)) : external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(utils.OFlowParsedHTML, null, megaChat.highlight(megaChat.html(nicknames.getNickname(data)), matches, true)), external_React_default().createElement(ui_contacts.ContactPresence, {
      contact: contact
    }))), lastActivity(room)), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}

const NilRow = ({
  onSearchMessages,
  isFirstQuery
}) => {
  const label = LABEL.SEARCH_MESSAGES_INLINE.replace('[A]', '<a>').replace('[/A]', '</a>');
  return external_React_default().createElement("div", {
    className: `
                ${RESULT_ROW_CLASS}
                nil
            `
  }, external_React_default().createElement("div", {
    className: "nil-container"
  }, external_React_default().createElement("i", {
    className: "sprite-fm-mono icon-preview-reveal"
  }), external_React_default().createElement("span", null, LABEL.NO_RESULTS), isFirstQuery && external_React_default().createElement("div", {
    className: "search-messages",
    onClick: onSearchMessages
  }, external_React_default().createElement(utils.OFlowParsedHTML, {
    tag: "div",
    content: label
  }))));
};

class ResultRow extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.setActive = nodeRef => {
      if (nodeRef) {
        const elements = document.querySelectorAll(`.${RESULT_ROW_CLASS}.${"active"}`);

        for (let i = elements.length; i--;) {
          elements[i].classList.remove('active');
        }

        nodeRef.classList.add("active");
      }
    };
  }

  render() {
    const {
      type,
      result,
      children,
      onSearchMessages,
      isFirstQuery
    } = this.props;

    if (result) {
      const {
        data,
        index,
        matches,
        room
      } = result;
      const PROPS = {
        data,
        index,
        matches,
        room,
        onResultOpen: this.setActive
      };

      switch (type) {
        case TYPE.MESSAGE:
          return external_React_default().createElement(MessageRow, PROPS);

        case TYPE.CHAT:
          return external_React_default().createElement(ChatRow, PROPS);

        case TYPE.MEMBER:
          return external_React_default().createElement(MemberRow, (0,esm_extends.Z)({}, PROPS, {
            contact: M.u[data]
          }));

        default:
          return external_React_default().createElement("div", {
            className: RESULT_ROW_CLASS
          }, children);
      }
    }

    return external_React_default().createElement(NilRow, {
      onSearchMessages: onSearchMessages,
      isFirstQuery: isFirstQuery
    });
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultContainer.jsx





const TYPE = {
  MESSAGE: 1,
  CHAT: 2,
  MEMBER: 3,
  NIL: 4
};
const LABEL = {
  MESSAGES: l[6868],
  CONTACTS_AND_CHATS: l[20174],
  NO_RESULTS: l[8674],
  SEARCH_MESSAGES_CTA: l[23547],
  SEARCH_MESSAGES_INLINE: l[23548],
  DECRYPTING_RESULTS: l[23543],
  PAUSE_SEARCH: l[23544],
  SEARCH_PAUSED: l[23549],
  SEARCH_COMPLETE: l[23546]
};
class ResultContainer extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.renderResults = (results, status, isFirstQuery, onSearchMessages) => {
      if (status === STATUS.COMPLETED && results.length < 1) {
        return external_React_default().createElement(ResultTable, null, external_React_default().createElement(ResultRow, {
          type: TYPE.NIL,
          isFirstQuery: isFirstQuery,
          onSearchMessages: onSearchMessages
        }));
      }

      const RESULT_TABLE = {
        CONTACTS_AND_CHATS: [],
        MESSAGES: []
      };

      for (const resultTypeGroup in results) {
        if (results.hasOwnProperty(resultTypeGroup)) {
          const len = results[resultTypeGroup].length;

          for (let i = 0; i < len; i++) {
            const result = results[resultTypeGroup].getItem(i);
            const {
              MESSAGE,
              MEMBER,
              CHAT
            } = TYPE;
            const {
              resultId,
              type
            } = result;
            const table = type === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';
            RESULT_TABLE[table] = [...RESULT_TABLE[table], external_React_default().createElement(ResultRow, {
              key: resultId,
              type: type === MESSAGE ? MESSAGE : type === MEMBER ? MEMBER : CHAT,
              result: result
            })];
          }
        }
      }

      return Object.keys(RESULT_TABLE).map((key, index) => {
        const table = {
          ref: RESULT_TABLE[key],
          hasRows: RESULT_TABLE[key] && RESULT_TABLE[key].length,
          isEmpty: RESULT_TABLE[key] && RESULT_TABLE[key].length < 1,
          props: {
            key: index,
            heading: key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS
          }
        };

        if (table.hasRows) {
          return external_React_default().createElement(ResultTable, table.props, table.ref.map(row => row));
        }

        if (status === STATUS.COMPLETED && key === 'MESSAGES') {
          const SEARCH_MESSAGES = external_React_default().createElement("button", {
            className: "search-messages mega-button",
            onClick: onSearchMessages
          }, external_React_default().createElement("span", null, LABEL.SEARCH_MESSAGES_CTA));
          const NO_RESULTS = external_React_default().createElement(ResultRow, {
            type: TYPE.NIL,
            isFirstQuery: isFirstQuery,
            onSearchMessages: onSearchMessages
          });
          return external_React_default().createElement(ResultTable, table.props, isFirstQuery ? SEARCH_MESSAGES : NO_RESULTS);
        }

        return null;
      });
    };
  }

  render() {
    const {
      results,
      status,
      isFirstQuery,
      onSearchMessages
    } = this.props;
    return this.renderResults(results, status, isFirstQuery, onSearchMessages);
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/searchPanel/searchField.jsx




const SEARCH_STATUS_CLASS = 'search-field-status';
const BASE_ICON_CLASS = 'sprite-fm-mono';
class SearchField extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.state = {
      hovered: false
    };

    this.renderStatusBanner = () => {
      switch (this.props.status) {
        case STATUS.IN_PROGRESS:
          return external_React_default().createElement("div", {
            className: `${SEARCH_STATUS_CLASS} searching info`
          }, LABEL.DECRYPTING_RESULTS);

        case STATUS.PAUSED:
          return external_React_default().createElement("div", {
            className: `${SEARCH_STATUS_CLASS} paused info`
          }, LABEL.SEARCH_PAUSED);

        case STATUS.COMPLETED:
          return external_React_default().createElement("div", {
            className: `${SEARCH_STATUS_CLASS} complete success`
          }, LABEL.SEARCH_COMPLETE);

        default:
          return null;
      }
    };

    this.renderStatusControls = () => {
      const {
        status,
        onToggle
      } = this.props;

      const handleHover = () => this.setState(state => ({
        hovered: !state.hovered
      }));

      switch (status) {
        case STATUS.IN_PROGRESS:
          return external_React_default().createElement("div", {
            className: "progress-controls",
            onClick: onToggle
          }, external_React_default().createElement("i", {
            className: `${BASE_ICON_CLASS} icon-pause`
          }));

        case STATUS.PAUSED:
          return external_React_default().createElement("i", {
            className: `${BASE_ICON_CLASS} icon-resume`,
            onClick: onToggle,
            onMouseOver: handleHover,
            onMouseOut: handleHover
          });

        case STATUS.COMPLETED:
          return null;

        default:
          return null;
      }
    };
  }

  componentDidMount() {
    super.componentDidMount();
    SearchField.focus();
  }

  render() {
    const {
      value,
      searching,
      status,
      onChange,
      onReset
    } = this.props;
    return external_React_default().createElement("div", {
      className: "search-field"
    }, external_React_default().createElement("i", {
      className: `${BASE_ICON_CLASS} icon-preview-reveal search-icon-find`
    }), external_React_default().createElement("input", {
      type: "search",
      autoComplete: "off",
      placeholder: l[102],
      ref: SearchField.inputRef,
      value: value,
      onChange: ev => {
        if (this.state.hovered) {
          this.setState({
            hovered: false
          });
        }

        onChange(ev);
      }
    }), searching && external_React_default().createElement("i", {
      className: `
                            ${BASE_ICON_CLASS}
                            icon-close-component
                            search-icon-reset
                        `,
      onClick: onReset
    }), searching && status && external_React_default().createElement((external_React_default()).Fragment, null, this.renderStatusControls(), this.renderStatusBanner()));
  }

}
SearchField.inputRef = external_React_default().createRef();

SearchField.select = () => {
  const inputElement = SearchField.inputRef && SearchField.inputRef.current;
  const value = inputElement && inputElement.value;

  if (inputElement && value) {
    inputElement.selectionStart = 0;
    inputElement.selectionEnd = value.length;
  }
};

SearchField.focus = () => SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus();

SearchField.hasValue = () => SearchField.inputRef && SearchField.inputRef.current && !!SearchField.inputRef.current.value.length;

SearchField.isVisible = () => SearchField.inputRef && SearchField.inputRef.current && elementIsVisible(SearchField.inputRef.current);
;// CONCATENATED MODULE: ./js/chat/ui/searchPanel/searchPanel.jsx





const STATUS = {
  IN_PROGRESS: 1,
  PAUSED: 2,
  COMPLETED: 3
};
const EVENTS = {
  RESULT_OPEN: 'chatSearchResultOpen',
  KEYDOWN: 'keydown'
};
const ACTIONS = {
  PAUSE: 'pause',
  RESUME: 'resume'
};
const SEARCH_PANEL_CLASS = `search-panel`;
class SearchPanel extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.wrapperRef = null;
    this.state = {
      value: '',
      searching: false,
      status: undefined,
      isFirstQuery: true,
      results: []
    };

    this.unbindEvents = () => {
      if (this.pageChangeListener) {
        mBroadcaster.removeListener(this.pageChangeListener);
      }

      document.removeEventListener(EVENTS.RESULT_OPEN, this.doPause);
      document.removeEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
      megaChat.plugins.chatdIntegration.chatd.off('onClose.search');
      megaChat.plugins.chatdIntegration.chatd.off('onOpen.search');
    };

    this.bindEvents = () => {
      this.pageChangeListener = mBroadcaster.addListener('pagechange', this.doPause);
      document.addEventListener(EVENTS.RESULT_OPEN, this.doPause);
      document.addEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
      megaChat.plugins.chatdIntegration.chatd.rebind('onClose.search', () => this.state.searching && this.doToggle(ACTIONS.PAUSE));
      megaChat.plugins.chatdIntegration.chatd.rebind('onOpen.search', () => this.state.searching && this.doToggle(ACTIONS.RESUME));
    };

    this.doPause = () => {
      if (this.state.status === STATUS.IN_PROGRESS) {
        this.doToggle(ACTIONS.PAUSE);
      }
    };

    this.doSearch = (s, searchMessages) => {
      return ChatSearch.doSearch(s, (room, result, results) => this.setState({
        results
      }), searchMessages).catch(ex => d && console.error('Search failed (or was reset)', ex)).always(() => this.setState({
        status: STATUS.COMPLETED
      }));
    };

    this.doToggle = (action) => {
      const {
        IN_PROGRESS,
        PAUSED,
        COMPLETED
      } = STATUS;
      const searching = this.state.status === IN_PROGRESS || this.state.status === PAUSED;

      if (action && searching) {
        const chatSearch = ChatSearch.doSearch.cs;

        if (!chatSearch) {
          return delay('chat-toggle', () => this.doToggle(action), 600);
        }

        this.setState({
          status: action === ACTIONS.PAUSE ? PAUSED : action === ACTIONS.RESUME ? IN_PROGRESS : COMPLETED
        }, () => chatSearch[action]());
      }
    };

    this.doDestroy = () => ChatSearch && ChatSearch.doSearch && ChatSearch.doSearch.cs && ChatSearch.doSearch.cs.destroy();

    this.handleKeyDown = ev => {
      const {
        keyCode
      } = ev;

      if (keyCode && keyCode === 27) {
        return SearchField.hasValue() ? this.handleReset() : this.doPause();
      }
    };

    this.handleChange = ev => {
      if (SearchField.isVisible()) {
        const {
          value
        } = ev.target;
        const searching = value.length > 0;
        this.doDestroy();
        this.setState({
          value,
          searching,
          status: undefined,
          isFirstQuery: true,
          results: []
        }, () => searching && delay('chat-search', () => this.doSearch(value, false), 1600));
        this.wrapperRef.scrollToY(0);
      }
    };

    this.handleToggle = () => {
      const inProgress = this.state.status === STATUS.IN_PROGRESS;
      this.setState({
        status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
      }, () => {
        delay('chat-toggled', () => SearchField.focus());
        return this.doToggle(inProgress ? ACTIONS.PAUSE : ACTIONS.RESUME);
      });
    };

    this.handleReset = () => this.setState({
      value: '',
      searching: false,
      status: undefined,
      results: []
    }, () => {
      this.wrapperRef.scrollToY(0);
      onIdle(() => SearchField.focus());
      this.doDestroy();
    });

    this.handleSearchMessages = () => SearchField.hasValue() && this.setState({
      status: STATUS.IN_PROGRESS,
      isFirstQuery: false
    }, () => {
      this.doSearch(this.state.value, true);
      SearchField.focus();
      SearchField.select();
    });
  }

  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }

  render() {
    const {
      value,
      searching,
      status,
      isFirstQuery,
      results
    } = this.state;
    return external_React_default().createElement("div", {
      className: `
                    ${SEARCH_PANEL_CLASS}
                    ${searching ? 'expanded' : ''}
                `
    }, external_React_default().createElement(SearchField, {
      value: value,
      searching: searching,
      status: status,
      onChange: this.handleChange,
      onToggle: this.handleToggle,
      onReset: this.handleReset
    }), external_React_default().createElement(perfectScrollbar.F, {
      className: "search-results-wrapper",
      ref: wrapper => {
        this.wrapperRef = wrapper;
      },
      options: {
        'suppressScrollX': true
      }
    }, searching && external_React_default().createElement(ResultContainer, {
      status: status,
      results: results,
      isFirstQuery: isFirstQuery,
      onSearchMessages: this.handleSearchMessages
    })));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/contactsPanel.jsx + 18 modules
var contactsPanel = __webpack_require__(105);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/start.jsx








class Start extends mixins.wl {
  constructor(props) {
    super(props);
    this.inputRef = external_React_default().createRef();
    this.state = {
      audio: false,
      video: false,
      editing: false,
      previousTopic: undefined,
      topic: undefined
    };

    this.handleChange = ev => this.setState({
      topic: ev.target.value
    });

    this.toggleEdit = () => this.setState(state => ({
      editing: !state.editing,
      previousTopic: state.topic
    }), () => onIdle(this.doFocus));

    this.doFocus = () => {
      if (this.state.editing) {
        const input = this.inputRef.current;
        input.focus();
        input.setSelectionRange(0, input.value.length);
      }
    };

    this.doReset = () => this.setState(state => ({
      editing: false,
      topic: state.previousTopic,
      previousTopic: undefined
    }));

    this.bindEvents = () => $(document).rebind(`mousedown.${Start.NAMESPACE}`, ev => {
      if (this.state.editing && !ev.target.classList.contains(Start.CLASS_NAMES.EDIT) && !ev.target.classList.contains(Start.CLASS_NAMES.INPUT)) {
        this.toggleEdit();
      }
    }).rebind(`keyup.${Start.NAMESPACE}`, ({
      keyCode
    }) => {
      if (this.state.editing) {
        const [ENTER, ESCAPE] = [13, 27];
        return keyCode === ENTER ? this.toggleEdit() : keyCode === ESCAPE ? this.doReset() : null;
      }
    });

    this.Input = () => external_React_default().createElement("input", {
      type: "text",
      ref: this.inputRef,
      className: Start.CLASS_NAMES.INPUT,
      value: this.state.topic,
      onChange: this.handleChange
    });

    this.onStreamToggle = (audio, video) => this.setState({
      audio,
      video
    });

    this.startMeeting = () => {
      const {
        onStart
      } = this.props;
      const {
        topic,
        audio,
        video
      } = this.state;

      if (onStart) {
        onStart(topic, audio, video);
      }
    };

    this.state.topic = l.default_meeting_topic.replace('%NAME', M.getNameByHandle(u_handle));
  }

  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    $(document).unbind(`.${Start.NAMESPACE}`);
  }

  render() {
    const {
      NAMESPACE,
      CLASS_NAMES
    } = Start;
    const {
      editing,
      topic
    } = this.state;
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      name: NAMESPACE,
      className: NAMESPACE,
      stopKeyPropagation: editing,
      onClose: () => this.props.onClose()
    }), external_React_default().createElement("div", {
      className: `${NAMESPACE}-preview`
    }, external_React_default().createElement(Preview, {
      onToggle: this.onStreamToggle
    })), external_React_default().createElement("div", {
      className: "fm-dialog-body"
    }, external_React_default().createElement("div", {
      className: `${NAMESPACE}-title`
    }, editing ? external_React_default().createElement(this.Input, null) : external_React_default().createElement("h2", {
      onClick: this.toggleEdit
    }, external_React_default().createElement(utils.Emoji, null, topic)), external_React_default().createElement(meetings_button.Z, {
      className: `
                                mega-button
                                action
                                small
                                ${CLASS_NAMES.EDIT}
                                ${editing ? 'editing' : ''}
                            `,
      icon: "icon-rename",
      simpletip: {
        label: l[1342],
        position: 'top'
      },
      onClick: this.toggleEdit
    }, external_React_default().createElement("span", null, l[1342]))), external_React_default().createElement(meetings_button.Z, {
      className: "mega-button positive large start-meeting-button",
      onClick: this.startMeeting
    }, external_React_default().createElement("span", null, l[7315])), external_React_default().createElement(ui_link.Z, {
      to: "/securechat"
    }, l.how_meetings_work)));
  }

}
Start.NAMESPACE = 'start-meeting';
Start.CLASS_NAMES = {
  EDIT: 'call-title-edit',
  INPUT: 'call-title-input'
};
Start.STREAMS = {
  AUDIO: 1,
  VIDEO: 2
};
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/nil.jsx
var nil = __webpack_require__(479);
// EXTERNAL MODULE: ./js/chat/ui/chatToaster.jsx
var chatToaster = __webpack_require__(142);
;// CONCATENATED MODULE: ./js/chat/ui/conversations.jsx



var conversations_dec, conversations_dec2, conversations_class, _dec3, _class3;



var conversations_React = __webpack_require__(363);



var conversations_PerfectScrollbar = (__webpack_require__(285).F);










var StartGroupChatWizard = (__webpack_require__(797).C);







var getRoomName = function (chatRoom) {
  return chatRoom.getRoomTitle();
};

let ConversationsListItem = (conversations_dec = utils["default"].SoonFcWrap(40, true), conversations_dec2 = (0,mixins.LY)(0.7, 8), (conversations_class = class ConversationsListItem extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.getConversationTimestamp = () => {
      const {
        chatRoom
      } = this.props;

      if (chatRoom) {
        const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        const timestamp = lastMessage && lastMessage.delay || chatRoom.ctime;
        return todayOrYesterday(timestamp * 1000) ? getTimeMarker(timestamp) : time2date(timestamp, 17);
      }

      return null;
    };
  }

  isLoading() {
    const mb = this.props.chatRoom.messagesBuff;

    if (mb.haveMessages) {
      return false;
    }

    return mb.messagesHistoryIsLoading() || mb.joined === false && mb.isDecrypting;
  }

  specShouldComponentUpdate() {
    return !this.loadingShown;
  }

  componentWillMount() {
    var self = this;
    self.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, () => {
      if (d > 2) {
        console.debug('%s: loading:%s', self.getReactId(), self.loadingShown, self.isLoading(), [self]);
      }

      self.safeForceUpdate();
    });
    self.props.chatRoom.rebind('onUnreadCountUpdate.convlistitem', function () {
      delete self.lastMessageId;
      self.safeForceUpdate();
    });
    self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
    self.props.chatRoom.unbind('onUnreadCountUpdate.convlistitem');
  }

  componentDidMount() {
    super.componentDidMount();
    this.eventuallyScrollTo();
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    this.eventuallyScrollTo();
  }

  eventuallyScrollTo() {
    const chatRoom = this.props.chatRoom || false;

    if (chatRoom._scrollToOnUpdate) {
      if (chatRoom.isCurrentlyActive) {
        chatRoom.scrollToChat();
      } else {
        chatRoom._scrollToOnUpdate = false;
      }
    }
  }

  render() {
    var classString = "";
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
      archivedDiv = conversations_React.createElement("div", {
        className: "archived-badge"
      }, l[19067]);
    }

    var contactId;
    var presenceClass;
    var id;

    if (chatRoom.type === "private") {
      let handle = chatRoom.getParticipantsExceptMe()[0];

      if (!handle || !(handle in M.u)) {
        return null;
      }

      let contact = M.u[handle];
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

    this.loadingShown = this.isLoading();
    var unreadCount = chatRoom.messagesBuff.getUnreadCount();
    var isUnread = false;
    var notificationItems = [];

    if (chatRoom.havePendingCall() && chatRoom.state != ChatRoom.STATE.LEFT) {
      notificationItems.push(conversations_React.createElement("i", {
        className: "tiny-icon " + (chatRoom.isCurrentlyActive ? "blue" : "white") + "-handset",
        key: "callIcon"
      }));
    }

    if (unreadCount > 0) {
      notificationItems.push(conversations_React.createElement("span", {
        key: "unreadCounter"
      }, unreadCount > 9 ? "9+" : unreadCount));
      isUnread = true;
    }

    var lastMessageDiv = null;
    var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
    var lastMsgDivClasses;

    if (lastMessage && lastMessage.renderableSummary && this.lastMessageId === lastMessage.messageId) {
      lastMsgDivClasses = this._lastMsgDivClassesCache;
      lastMessageDiv = this._lastMessageDivCache;
      lastMsgDivClasses += isUnread ? " unread" : "";

      if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
        lastMsgDivClasses += " call";
        classString += " call-exists";
      }
    } else if (lastMessage) {
      lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");
      var renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(lastMessage);
      lastMessage.renderableSummary = renderableSummary;

      if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
        lastMsgDivClasses += " call";
        classString += " call-exists";
      }

      lastMessageDiv = conversations_React.createElement("div", {
        className: lastMsgDivClasses
      }, conversations_React.createElement(utils.ParsedHTML, null, renderableSummary));
      const voiceClipType = Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP;

      if (lastMessage.textContents && lastMessage.textContents[1] === voiceClipType && lastMessage.getAttachmentMeta()[0]) {
        const playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
        lastMessageDiv = conversations_React.createElement("div", {
          className: lastMsgDivClasses
        }, conversations_React.createElement("i", {
          className: "sprite-fm-mono icon-audio-filled voice-message-icon"
        }), playTime);
      }

      if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
        lastMessageDiv = conversations_React.createElement("div", {
          className: lastMsgDivClasses
        }, conversations_React.createElement("i", {
          className: "sprite-fm-mono icon-location geolocation-icon"
        }), l[20789]);
      }
    } else {
      lastMsgDivClasses = "conversation-message";
      const emptyMessage = this.loadingShown ? l[7006] : l[8000];
      lastMessageDiv = conversations_React.createElement("div", null, conversations_React.createElement("div", {
        className: lastMsgDivClasses
      }, emptyMessage));
    }

    this.lastMessageId = lastMessage && lastMessage.messageId;
    this._lastMsgDivClassesCache = lastMsgDivClasses.replace(" call-exists", "").replace(" unread", "");
    this._lastMessageDivCache = lastMessageDiv;

    if (chatRoom.type !== "public") {
      nameClassString += " privateChat";
    }

    let roomTitle = conversations_React.createElement(utils.OFlowEmoji, null, chatRoom.getRoomTitle());

    if (chatRoom.type === "private") {
      roomTitle = conversations_React.createElement(ui_contacts.ContactAwareName, {
        contact: this.props.contact
      }, conversations_React.createElement("div", {
        className: "user-card-wrapper"
      }, conversations_React.createElement(utils.OFlowParsedHTML, null, megaChat.html(chatRoom.getRoomTitle()))));
    }

    nameClassString += chatRoom.type === "private" || chatRoom.type === "group" ? ' badge-pad' : '';
    return conversations_React.createElement("li", {
      id: id,
      className: classString,
      "data-room-id": roomId,
      "data-jid": contactId,
      onClick: ev => this.props.onConversationClicked(ev)
    }, conversations_React.createElement("div", {
      className: "conversation-avatar"
    }, chatRoom.type === 'group' || chatRoom.type === 'public' ? conversations_React.createElement("div", {
      className: "chat-topic-icon"
    }, conversations_React.createElement("i", {
      className: "sprite-fm-uni icon-chat-group"
    })) : conversations_React.createElement(ui_contacts.Avatar, {
      contact: chatRoom.getParticipantsExceptMe()[0]
    })), conversations_React.createElement("div", {
      className: "conversation-data"
    }, conversations_React.createElement("div", {
      className: "conversation-data-top"
    }, conversations_React.createElement("div", {
      className: `conversation-data-name ${nameClassString}`
    }, roomTitle), conversations_React.createElement("div", {
      className: "conversation-data-badges"
    }, chatRoom.type === "private" && conversations_React.createElement("span", {
      className: `user-card-presence ${presenceClass}`
    }), (chatRoom.type === "group" || chatRoom.type === "private") && conversations_React.createElement("i", {
      className: "sprite-fm-uni icon-ekr-key simpletip",
      "data-simpletip": l[20935]
    }), archivedDiv), conversations_React.createElement("div", {
      className: "date-time"
    }, this.getConversationTimestamp())), conversations_React.createElement("div", {
      className: "clear"
    }), conversations_React.createElement("div", {
      className: "conversation-message-info"
    }, lastMessageDiv, notificationItems.length > 0 ? conversations_React.createElement("div", {
      className: "unread-messages-container"
    }, conversations_React.createElement("div", {
      className: `unread-messages items-${notificationItems.length}`
    }, notificationItems)) : null)));
  }

}, ((0,applyDecoratedDescriptor.Z)(conversations_class.prototype, "eventuallyScrollTo", [conversations_dec], Object.getOwnPropertyDescriptor(conversations_class.prototype, "eventuallyScrollTo"), conversations_class.prototype), (0,applyDecoratedDescriptor.Z)(conversations_class.prototype, "render", [conversations_dec2], Object.getOwnPropertyDescriptor(conversations_class.prototype, "render"), conversations_class.prototype)), conversations_class));

class ArchConversationsListItem extends mixins.wl {
  componentWillMount() {
    const {
      chatRoom
    } = this.props;
    this.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, () => {
      this.safeForceUpdate();
    });
    chatRoom.addChangeListener(this.chatRoomChangeListener);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    const {
      chatRoom
    } = this.props;
    chatRoom.removeChangeListener(this.chatRoomChangeListener);
  }

  render() {
    const {
      chatRoom,
      onConversationSelected,
      onConversationClicked,
      onUnarchiveClicked
    } = this.props;
    let classString = 'arc-chat-list ui-droppable ui-draggable ui-draggable-handle';

    if (!chatRoom || !chatRoom.chatId) {
      return null;
    }

    const roomId = chatRoom.chatId;

    if (chatRoom.archivedSelected === true) {
      classString += ' ui-selected';
    }

    let nameClassString = 'user-card-name conversation-name';
    let contactId;
    let id;

    if (chatRoom.type === 'private') {
      const contact = M.u[chatRoom.getParticipantsExceptMe()[0]];

      if (!contact) {
        return null;
      }

      if (!this.fetchingNonContact && !chatRoom.getRoomTitle()) {
        this.fetchingNonContact = true;
        MegaPromise.allDone([M.syncUsersFullname(contact.h, undefined, new MegaPromise(nop)), M.syncContactEmail(contact.h, new MegaPromise(nop))]).always(() => {
          this.safeForceUpdate();
        });
      }

      id = `conversation_${escapeHTML(contact.u)}`;
    } else if (chatRoom.type === 'group') {
      contactId = roomId;
      id = `conversation_${contactId}`;
      classString += ' groupchat';
    } else if (chatRoom.type === 'public') {
      contactId = roomId;
      id = `conversation_${contactId}`;
      classString += ' groupchat public';
    } else {
      return `Unknown room type: ${chatRoom.roomId}`;
    }

    let lastMessageDiv;
    let lastMessageDatetimeDiv = null;
    let emptyMessage = null;
    const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();

    if (lastMessage) {
      const renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(lastMessage);
      lastMessage.renderableSummary = renderableSummary;
      lastMessageDiv = conversations_React.createElement("div", {
        className: "conversation-message"
      }, conversations_React.createElement(utils.ParsedHTML, null, renderableSummary));
      lastMessageDatetimeDiv = conversations_React.createElement("div", {
        className: "date-time"
      }, getTimeMarker(lastMessage.delay, true));
    } else {
      emptyMessage = chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];
      lastMessageDiv = conversations_React.createElement("div", null, conversations_React.createElement("div", {
        className: "conversation-message"
      }, emptyMessage));
    }

    if (chatRoom.type !== 'public') {
      nameClassString += ' privateChat';
    }

    return conversations_React.createElement("tr", {
      className: classString,
      id: id,
      "data-room-id": roomId,
      "data-jid": contactId,
      onClick: onConversationSelected,
      onDoubleClick: onConversationClicked
    }, conversations_React.createElement("td", null, conversations_React.createElement("div", {
      className: "fm-chat-user-info todo-star"
    }, conversations_React.createElement("div", {
      className: nameClassString
    }, conversations_React.createElement(utils.Emoji, null, chatRoom.getRoomTitle()), (chatRoom.type === 'group' || chatRoom.type === 'private') && conversations_React.createElement("i", {
      className: "sprite-fm-uni icon-ekr-key"
    })), conversations_React.createElement("div", {
      className: "last-message-info"
    }, lastMessageDiv, emptyMessage ? null : conversations_React.createElement("div", {
      className: "conversations-separator"
    }, conversations_React.createElement("i", {
      className: "sprite-fm-mono icon-dot"
    })), lastMessageDatetimeDiv)), conversations_React.createElement("div", {
      className: "archived-badge"
    }, l[19067])), conversations_React.createElement("td", {
      width: "330"
    }, conversations_React.createElement("div", {
      className: "archived-on"
    }, conversations_React.createElement("div", {
      className: "archived-date-time"
    }, lastMessageDatetimeDiv), conversations_React.createElement("div", {
      className: "clear"
    })), conversations_React.createElement(buttons.Button, {
      className: "mega-button action unarchive-chat right",
      icon: "sprite-fm-mono icon-rewind",
      onClick: onUnarchiveClicked
    }, conversations_React.createElement("span", null, l[19065]))));
  }

}

class ConversationsHead extends mixins.wl {
  constructor(props) {
    super(props);
    this.requestReceivedListener = null;
    this.state = {
      receivedRequestsCount: 0
    };
    this.state.receivedRequestsCount = Object.keys(M.ipc).length;
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.requestReceivedListener) {
      mBroadcaster.removeListener(this.requestReceivedListener);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => this.setState({
      receivedRequestsCount: Object.keys(M.ipc).length
    }));
  }

  render() {
    const {
      contactsActive,
      showTopButtons,
      showAddContact,
      onSelectDone
    } = this.props;
    const {
      receivedRequestsCount
    } = this.state;
    const ROUTES = {
      CHAT: 'fm/chat',
      CONTACTS: 'fm/chat/contacts'
    };
    const CONTACTS_ACTIVE = window.location.pathname.includes(ROUTES.CONTACTS);
    return conversations_React.createElement("div", {
      className: "lp-header"
    }, conversations_React.createElement("span", null, l[5902]), !is_eplusplus && !is_chatlink && conversations_React.createElement("div", {
      className: "conversations-head-buttons"
    }, conversations_React.createElement("div", {
      className: "contacts-toggle"
    }, conversations_React.createElement(buttons.Button, {
      receivedRequestCount: receivedRequestsCount,
      className: `
                                    mega-button
                                    round
                                    branded-blue
                                    contacts-toggle-button
                                    ${contactsActive ? 'active' : ''}
                                    ${receivedRequestsCount > 0 ? 'requests' : ''}
                                `,
      icon: `
                                    sprite-fm-mono
                                    icon-contacts
                                    ${CONTACTS_ACTIVE ? '' : 'active'}
                                `,
      onClick: () => loadSubPage(CONTACTS_ACTIVE ? ROUTES.CHAT : ROUTES.CONTACTS)
    }, !!receivedRequestsCount && conversations_React.createElement("div", {
      className: "notifications-count"
    }, conversations_React.createElement("span", null, receivedRequestsCount > 9 ? '9+' : receivedRequestsCount)))), conversations_React.createElement(buttons.Button, {
      group: "conversationsListing",
      className: "mega-button round positive",
      icon: "sprite-fm-mono icon-add"
    }, conversations_React.createElement(dropdowns.DropdownContactsSelector, {
      className: "main-start-chat-dropdown",
      onSelectDone: onSelectDone,
      multiple: false,
      showTopButtons: showTopButtons,
      showAddContact: showAddContact
    }))));
  }

}

class ConversationsList extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.backgroundUpdateInterval = null;
    this.conversations = megaChat.chats.toJS();
    this.state = {
      updated: 0
    };

    this.doUpdate = () => this.isComponentVisible() && document.visibilityState === 'visible' && this.setState(state => ({
      updated: ++state.updated
    }), () => this.forceUpdate());
  }

  customIsEventuallyVisible() {
    return M.chat;
  }

  attachRerenderCallbacks() {
    this._megaChatsListener = megaChat.chats.addChangeListener(() => this.onPropOrStateUpdated());
  }

  detachRerenderCallbacks() {
    if (super.detachRerenderCallbacks) {
      super.detachRerenderCallbacks();
    }

    megaChat.chats.removeChangeListener(this._megaChatsListener);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    clearInterval(this.backgroundUpdateInterval);
    document.removeEventListener('visibilitychange', this.doUpdate);
  }

  componentDidMount() {
    super.componentDidMount();
    this.backgroundUpdateInterval = setInterval(this.doUpdate, 600000);
    document.addEventListener('visibilitychange', this.doUpdate);
  }

  render() {
    return conversations_React.createElement("ul", {
      className: "conversations-pane"
    }, Object.values(this.conversations).sort(M.sortObjFn(room => room.lastActivity || room.ctime, -1)).map(chatRoom => {
      if (chatRoom.roomId && chatRoom.isDisplayable()) {
        return conversations_React.createElement(ConversationsListItem, {
          key: chatRoom.roomId,
          chatRoom: chatRoom,
          contact: M.u[chatRoom.getParticipantsExceptMe()[0]] || null,
          messages: chatRoom.messagesBuff,
          onConversationClicked: () => loadSubPage(chatRoom.getRoomUrl(false))
        });
      }

      return null;
    }));
  }

}

ConversationsList.defaultProps = {
  manualDataChangeTracking: true
};

class ArchivedConversationsList extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
    this.onSortNameClicked = this.onSortNameClicked.bind(this);
    this.onSortTimeClicked = this.onSortTimeClicked.bind(this);
  }

  getInitialState() {
    return {
      'items': megaChat.chats,
      'orderby': 'lastActivity',
      'nameorder': 1,
      'timeorder': -1,
      'confirmUnarchiveChat': null,
      'confirmUnarchiveDialogShown': false
    };
  }

  conversationClicked(room, e) {
    room.showArchived = true;
    loadSubPage(room.getRoomUrl());
    e.stopPropagation();
  }

  conversationSelected(room, e) {
    var self = this;
    var previousState = room.archivedSelected ? room.archivedSelected : false;
    var sortedConversations = obj_values(megaChat.chats.toJS());
    sortedConversations.forEach(chatRoom => {
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
  }

  unarchiveConversationClicked(room) {
    var self = this;
    self.setState({
      'confirmUnarchiveDialogShown': true,
      'confirmUnarchiveChat': room.roomId
    });
  }

  onSortNameClicked() {
    this.setState({
      'orderby': 'name',
      'nameorder': this.state.nameorder * -1
    });
  }

  onSortTimeClicked() {
    this.setState({
      'orderby': 'lastActivity',
      'timeorder': this.state.timeorder * -1
    });
  }

  render() {
    var self = this;
    var currConvsList = [];
    var sortedConversations = obj_values(megaChat.chats.toJS());
    var orderValue = -1;
    var orderKey = "lastActivity";
    var nameOrderClass = "";
    var timerOrderClass = "";

    if (self.state.orderby === "name") {
      orderKey = getRoomName;
      orderValue = self.state.nameorder;
      nameOrderClass = self.state.nameorder === 1 ? "down" : "up";
    } else {
      orderKey = "lastActivity";
      orderValue = self.state.timeorder;
      timerOrderClass = self.state.timeorder === 1 ? "down" : "up";
    }

    sortedConversations.sort(M.sortObjFn(orderKey, orderValue));
    sortedConversations.forEach(chatRoom => {
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

      currConvsList.push(conversations_React.createElement(ArchConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom: chatRoom,
        contact: contact,
        messages: chatRoom.messagesBuff,
        onConversationClicked: e => {
          self.conversationClicked(chatRoom, e);
        },
        onConversationSelected: e => {
          self.conversationSelected(chatRoom, e);
        },
        onUnarchiveClicked: e => {
          self.unarchiveConversationClicked(chatRoom, e);
        }
      }));
    });
    var confirmUnarchiveDialog = null;

    if (self.state.confirmUnarchiveDialogShown === true) {
      var room = megaChat.chats[self.state.confirmUnarchiveChat];

      if (room) {
        confirmUnarchiveDialog = conversations_React.createElement(modalDialogs.Z.ConfirmDialog, {
          chatRoom: room,
          title: l[19063],
          subtitle: l[19064],
          icon: "sprite-fm-uni icon-question",
          name: "unarchive-conversation",
          pref: "5",
          onClose: () => {
            self.setState({
              'confirmUnarchiveDialogShown': false
            });
          },
          onConfirmClicked: () => {
            room.unarchive();
            self.setState({
              'confirmUnarchiveDialogShown': false
            });
          }
        });
      }
    }

    return conversations_React.createElement("div", {
      className: "chat-content-block archived-chats"
    }, conversations_React.createElement(conversations_React.Fragment, null, currConvsList.length ? conversations_React.createElement("div", {
      className: "files-grid-view archived-chat-view"
    }, conversations_React.createElement("div", {
      className: "grid-scrolling-table archive-chat-list"
    }, conversations_React.createElement("div", {
      className: "grid-wrapper"
    }, conversations_React.createElement("table", {
      className: "grid-table arc-chat-messages-block table-hover"
    }, conversations_React.createElement("thead", null, conversations_React.createElement("tr", null, conversations_React.createElement("th", {
      className: "calculated-width",
      onClick: self.onSortNameClicked
    }, conversations_React.createElement("div", {
      className: "is-chat arrow name"
    }, conversations_React.createElement("i", {
      className: nameOrderClass ? `sprite-fm-mono icon-arrow-${nameOrderClass}` : ''
    }), l[86])), conversations_React.createElement("th", {
      width: "330",
      onClick: self.onSortTimeClicked
    }, conversations_React.createElement("div", {
      className: `is-chat arrow interaction ${timerOrderClass}`
    }, conversations_React.createElement("i", {
      className: timerOrderClass ? `sprite-fm-mono icon-arrow-${timerOrderClass}` : ''
    }), l[5904])))), conversations_React.createElement("tbody", null, currConvsList))))) : conversations_React.createElement(nil.Z, {
      title: l.archived_nil
    })), confirmUnarchiveDialog);
  }

}

let ConversationsApp = (_dec3 = utils["default"].SoonFcWrap(80), (_class3 = class ConversationsApp extends mixins.wl {
  constructor(props) {
    super(props);

    this.archiveChatsClicked = () => {
      loadSubPage('fm/chat/archived');
    };

    this.state = {
      leftPaneWidth: mega.config.get('leftPaneWidth'),
      startGroupChatDialogShown: false,
      startMeetingDialog: false
    };
    this.handleWindowResize = this.handleWindowResize.bind(this);

    this._cacheRouting();

    megaChat.rebind('onStartNewMeeting.convApp', () => this.startMeeting());
  }

  startMeeting() {
    if (megaChat.hasSupportForCalls) {
      return (0,call.xt)().then(() => this.setState({
        startMeetingDialog: true
      })).catch(() => d && console.warn('Already in a call.'));
    }

    return showToast('warning', l[7211]);
  }

  _cacheRouting() {
    this.routingSection = this.props.megaChat.routingSection;
    this.routingSubSection = this.props.megaChat.routingSubSection;
    this.routingParams = this.props.megaChat.routingParams;
  }

  specShouldComponentUpdate() {
    if (this.routingSection !== this.props.megaChat.routingSection || this.routingSubSection !== this.props.megaChat.routingSubSection || this.routingParams !== this.props.megaChat.routingParams) {
      this._cacheRouting();

      return true;
    }
  }

  startChatClicked(selected) {
    if (selected.length === 1) {
      megaChat.createAndShowPrivateRoom(selected[0]).then(function (room) {
        room.setActive();
      });
    } else {
      megaChat.createAndShowGroupRoomFor(selected);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    var self = this;
    $(document.body).rebind('startNewChatLink.conversations', function () {
      self.startGroupChatFlow = 2;
      self.setState({
        'startGroupChatDialogShown': true
      });
    });
    window.addEventListener('resize', this.handleWindowResize);
    $(document).rebind('keydown.megaChatTextAreaFocus', function (e) {
      if (!M.chat || e.megaChatHandled) {
        return;
      }

      const currentlyOpenedChat = megaChat.currentlyOpenedChat;
      const currentRoom = megaChat.getCurrentRoom();

      if (currentlyOpenedChat) {
        if (currentlyOpenedChat && currentRoom && currentRoom.isReadOnly() || $(e.target).is(".messages-textarea, input, textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
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
      if (!M.chat || e.megaChatHandled || slideshowid) {
        return;
      }

      var $target = $(e.target);

      if (megaChat.currentlyOpenedChat) {
        if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.closest('.messages.scroll-area').length > 0 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
          return;
        }

        var $typeArea = $('.messages-textarea:visible:first');

        if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
          $typeArea.trigger("focus");
          e.megaChatHandled = true;
        }
      }
    });
    self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function (value) {
      if (value > 0) {
        megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
        delay('CoApp:fmc:thr', function () {
          self.setState({
            leftPaneWidth: value
          });
          $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
          $('.jScrollPaneContainer:visible').trigger('forceResize');
        }, 75);
        megaChat.$leftPane.width(value);
        $('.fm-tree-panel', megaChat.$leftPane).width(value);
        self.onResizeDoUpdate();
      }
    });

    var lPaneResizableInit = function () {
      megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
      $.leftPaneResizableChat = new FMResizablePane(megaChat.$leftPane, $.leftPaneResizable.options);

      if (fmconfig.leftPaneWidth) {
        megaChat.$leftPane.width(Math.min($.leftPaneResizableChat.options.maxWidth, Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)));
      }

      $($.leftPaneResizableChat).on('resize', function () {
        var w = megaChat.$leftPane.width();

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
        $('.fm-left-panel').width(megaChat.$leftPane.width());
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

    megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');

    if (is_chatlink && !is_eplusplus) {
      megaChat.$leftPane.addClass('hidden');
    } else {
      megaChat.$leftPane.removeClass('hidden');
    }

    this.handleWindowResize();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    window.removeEventListener('resize', this.handleWindowResize);
    $(document).off('keydown.megaChatTextAreaFocus');
    mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    delete this.props.megaChat.$conversationsAppInstance;
  }

  componentDidUpdate() {
    this.handleWindowResize();

    if (megaChat.routingSection === "archived") {
      this.initArchivedChatsScrolling();
    }
  }

  handleWindowResize() {
    if (!M.chat) {
      return;
    }

    if (is_chatlink && !is_eplusplus) {
      $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
        'margin-left': "0px"
      });
    } else {
      if (megaChat.$leftPane && megaChat.$leftPane.hasClass('resizable-pane-active')) {
        return;
      }

      const lhpWidth = this.state.leftPaneWidth || $('.fm-left-panel').width();
      const newMargin = `${lhpWidth + $('.nw-fm-left-icons-panel').width()}px`;
      $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
        'margin-inline-start': newMargin,
        '-webkit-margin-start:': newMargin
      });
    }
  }

  initArchivedChatsScrolling() {
    deleteScrollPanel(".archive-chat-list", 'jsp');
    $(".archive-chat-list").jScrollPane({
      enableKeyboardNavigation: false,
      showArrows: true,
      arrowSize: 5
    });
    jScrollFade(".archive-chat-list");
  }

  calcArchiveChats() {
    var count = 0;
    megaChat.chats.forEach(chatRoom => {
      if (!chatRoom || !chatRoom.roomId) {
        return;
      }

      if (chatRoom.isArchived()) {
        count++;
      }
    });
    return count;
  }

  getContactsPickerButtons() {
    if (!this._topButtonsContactsPicker) {
      this._topButtonsContactsPicker = [{
        key: 'newGroupChat',
        title: l[19483],
        icon: 'sprite-fm-mono icon-chat-filled',
        onClick: () => {
          this.startGroupChatFlow = 1;
          this.setState({
            startGroupChatDialogShown: true
          });
        }
      }, {
        key: 'newMeeting',
        className: 'new-meeting',
        title: l.new_meeting,
        icon: 'sprite-fm-mono icon-video-call-filled',
        onClick: () => this.startMeeting()
      }, {
        key: 'newChatLink',
        className: 'new-chatlink',
        title: l[20638],
        icon: 'sprite-fm-mono icon-channel-new',
        onClick: () => {
          this.startGroupChatFlow = 2;
          this.setState({
            startGroupChatDialogShown: true
          });
        }
      }];
    }

    return this._topButtonsContactsPicker;
  }

  createMeetingEndDlgIfNeeded() {
    if (megaChat.initialPubChatHandle || megaChat.initialChatId) {
      let chatRoom = megaChat.getCurrentRoom();

      if (!chatRoom) {
        return null;
      }

      if (!chatRoom.initialMessageHistLoaded) {
        return null;
      }

      if (megaChat.meetingDialogClosed === chatRoom.chatId) {
        return null;
      }

      const activeCallIds = chatRoom.activeCallIds.keys();

      if (chatRoom.isMeeting && activeCallIds.length === 0 && (megaChat.initialPubChatHandle && chatRoom.publicChatHandle === megaChat.initialPubChatHandle || chatRoom.chatId === megaChat.initialChatId)) {
        return conversations_React.createElement(MeetingsCallEndedDialog, {
          onClose: () => {
            megaChat.meetingDialogClosed = chatRoom.chatId;
            megaChat.trackDataChange();
          }
        });
      }
    }

    return null;
  }

  render() {
    var self = this;
    var startGroupChatDialog = null;

    if (self.state.startGroupChatDialogShown === true) {
      startGroupChatDialog = conversations_React.createElement(StartGroupChatWizard, {
        name: "start-group-chat",
        flowType: self.startGroupChatFlow,
        onClose: () => {
          self.setState({
            'startGroupChatDialogShown': false
          });
          delete self.startGroupChatFlow;
        },
        onConfirmClicked: () => {
          self.setState({
            'startGroupChatDialogShown': false
          });
          delete self.startGroupChatFlow;
        }
      });
    }

    var startMeetingDialog = null;

    if (self.state.startMeetingDialog === true) {
      startMeetingDialog = conversations_React.createElement(Start, {
        onStart: (topic, audio, video) => {
          megaChat.createAndStartMeeting(topic, audio, video);
          this.setState({
            startMeetingDialog: false
          });
        },
        onClose: () => this.setState({
          startMeetingDialog: false
        })
      });
    }

    var leftPanelStyles = {};

    if (self.state.leftPaneWidth) {
      leftPanelStyles.width = self.state.leftPaneWidth;
    }

    var loadingOrEmpty = null;
    var isLoading = false;
    var nonArchivedChats = megaChat.chats.map(function (r) {
      return !r.isArchived() ? r : undefined;
    });

    if (nonArchivedChats.length === 0) {
      loadingOrEmpty = conversations_React.createElement("div", {
        className: "fm-empty-messages hidden"
      }, conversations_React.createElement("div", {
        className: "fm-empty-pad"
      }, conversations_React.createElement("div", {
        className: "fm-empty-messages-bg"
      }), conversations_React.createElement("div", {
        className: "fm-empty-cloud-txt"
      }, l[6870]), conversations_React.createElement("div", {
        className: "fm-not-logged-text"
      }, conversations_React.createElement("div", {
        className: "fm-not-logged-description"
      }, conversations_React.createElement(utils.ParsedHTML, null, l[8762].replace("[S]", "<span className='red'>").replace("[/S]", "</span>"))), conversations_React.createElement("div", {
        className: "fm-not-logged-button create-account"
      }, l[968]))));
    } else if (!megaChat.currentlyOpenedChat && megaChat.allChatsHadInitialLoadedHistory() === false && megaChat.routingSection !== "archived") {
      loadingOrEmpty = conversations_React.createElement("div", {
        className: "fm-empty-messages"
      }, conversations_React.createElement("div", {
        className: "loading-spinner js-messages-loading light manual-management",
        style: {
          "top": "50%"
        }
      }, conversations_React.createElement("div", {
        className: "main-loader",
        style: {
          "position": "fixed",
          "top": "50%",
          "left": "50%",
          "marginLeft": "72px"
        }
      })));
      isLoading = true;
    } else if (is_chatlink && (!megaChat.getCurrentRoom() || megaChat.getCurrentRoom().initialMessageHistLoaded === false)) {
      loadingOrEmpty = conversations_React.createElement("div", {
        className: "fm-empty-messages"
      }, conversations_React.createElement("div", {
        className: "loading-spinner js-messages-loading light manual-management",
        style: {
          "top": "50%"
        }
      }, conversations_React.createElement("div", {
        className: "main-loader",
        style: {
          "position": "fixed",
          "top": "50%",
          "left": "50%"
        }
      })));
      const currentChatRoom = megaChat.getCurrentRoom();

      if (currentChatRoom) {
        currentChatRoom.one('onMessagesHistoryDone.loadingStop', () => this.safeForceUpdate());
      }

      isLoading = true;
    }

    var rightPaneStyles = {};

    if (is_chatlink && !is_eplusplus) {
      rightPaneStyles = {
        'marginLeft': 0
      };
    }

    let meetingsCallEndedDialog = this.createMeetingEndDlgIfNeeded();
    const rightPane = conversations_React.createElement("div", {
      className: `fm-right-files-block in-chat ${is_chatlink ? " chatlink" : ""}`,
      style: rightPaneStyles
    }, loadingOrEmpty, !isLoading && conversations_React.createElement(chatToaster.Z, {
      isRootToaster: true
    }), !isLoading && megaChat.routingSection === "archived" && conversations_React.createElement(ArchivedConversationsList, {
      key: "archivedchats"
    }), !isLoading && megaChat.routingSection === "contacts" && conversations_React.createElement(contactsPanel.Z, {
      megaChat: megaChat,
      contacts: M.u,
      received: M.ipc,
      sent: M.opc
    }), !isLoading && megaChat.routingSection === "notFound" && conversations_React.createElement("span", null, conversations_React.createElement("center", null, "Section not found")), !isLoading && meetingsCallEndedDialog, !isLoading ? conversations_React.createElement(ConversationPanels, (0,esm_extends.Z)({}, this.props, {
      chatUIFlags: megaChat.chatUIFlags,
      displayArchivedChats: megaChat.routingSection === "archived",
      className: megaChat.routingSection !== "chat" ? 'hidden' : '',
      currentlyOpenedChat: megaChat.currentlyOpenedChat,
      chats: megaChat.chats
    })) : null);
    var archivedChatsCount = this.calcArchiveChats();
    var arcBtnClass = "left-pane-button archived";
    var arcIconClass = "small-icon archive colorized";

    if (megaChat.routingSection === "archived") {
      arcBtnClass += ' active';
      arcIconClass = arcIconClass.replace('colorized', 'white');
    }

    return conversations_React.createElement("div", {
      key: "conversationsApp",
      className: "conversationsApp"
    }, startGroupChatDialog, startMeetingDialog, conversations_React.createElement("div", {
      className: `
                        fm-left-panel
                        chat-lp-body
                        ${is_chatlink && 'hidden' || ''}
                        ${megaChat._joinDialogIsShown && 'hidden' || ''}
                    `,
      style: leftPanelStyles
    }, conversations_React.createElement("div", {
      className: "left-pane-drag-handle"
    }), conversations_React.createElement(ConversationsHead, {
      megaChat: megaChat,
      contactsActive: megaChat.routingSection === "contacts",
      onSelectDone: this.startChatClicked.bind(this),
      showTopButtons: self.getContactsPickerButtons(),
      showAddContact: contactsPanel.Z.hasContacts()
    }), conversations_React.createElement(SearchPanel, null), conversations_React.createElement(conversations_PerfectScrollbar, {
      className: "chat-lp-scroll-area",
      chats: megaChat.chats,
      ref: ref => {
        megaChat.$chatTreePanePs = ref;
      }
    }, megaChat.chats.length > 0 && conversations_React.createElement("div", {
      className: `
                                    content-panel
                                    conversations
                                    active
                                `
    }, conversations_React.createElement("span", {
      className: "heading"
    }, l.contacts_and_groups), conversations_React.createElement(ConversationsList, null))), megaChat.chats.length > 0 && conversations_React.createElement("div", {
      className: arcBtnClass,
      onClick: this.archiveChatsClicked
    }, conversations_React.createElement("div", {
      className: "heading"
    }, l[19066]), conversations_React.createElement("div", {
      className: "indicator"
    }, archivedChatsCount))), rightPane);
  }

}, ((0,applyDecoratedDescriptor.Z)(_class3.prototype, "handleWindowResize", [_dec3], Object.getOwnPropertyDescriptor(_class3.prototype, "handleWindowResize"), _class3.prototype)), _class3));

if (false) {}

const conversations = ({
  ConversationsList,
  ArchivedConversationsList,
  ConversationsApp: ConversationsApp
});

/***/ }),

/***/ 722:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "bl": () => (API),
  "wS": () => (LABELS),
  "ZP": () => (GifPanel)
});

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(285);
;// CONCATENATED MODULE: ./js/chat/ui/gifPanel/searchField.jsx



class SearchField extends mixins.wl {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      value,
      searching,
      onChange,
      onReset,
      onBack
    } = this.props;
    return external_React_default().createElement("div", {
      className: "gif-panel-search"
    }, external_React_default().createElement("div", {
      className: "gif-search-field"
    }, searching ? external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-left",
      onClick: onBack
    }) : external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), external_React_default().createElement("input", {
      ref: SearchField.inputRef,
      type: "text",
      placeholder: LABELS.SEARCH,
      autoFocus: true,
      value: value,
      onChange: onChange
    }), searching && external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-close-component",
      onClick: onReset
    })), external_React_default().createElement("div", {
      className: "giphy-logo"
    }, external_React_default().createElement("img", {
      src: staticpath + 'images/mega/giphy.gif',
      alt: "PWRD BY GIPHY"
    })));
  }

}
SearchField.inputRef = external_React_default().createRef();

SearchField.focus = () => SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus();

SearchField.hasValue = () => SearchField.inputRef && SearchField.inputRef.current && !!SearchField.inputRef.current.value.length;
;// CONCATENATED MODULE: ./js/chat/ui/gifPanel/result.jsx



class Result extends mixins.wl {
  constructor(props) {
    super(props);
    this.resultRef = external_React_default().createRef();
  }

  componentDidMount() {
    var _this$props$onMount, _this$props;

    super.componentDidMount();
    (_this$props$onMount = (_this$props = this.props).onMount) == null ? void 0 : _this$props$onMount.call(_this$props, this.resultRef.current);
  }

  componentWillUnmount() {
    var _this$props$onUnmount, _this$props2;

    super.componentWillUnmount();
    (_this$props$onUnmount = (_this$props2 = this.props).onUnmount) == null ? void 0 : _this$props$onUnmount.call(_this$props2, this.resultRef.current, 'unobserve');
  }

  render() {
    const {
      image,
      title,
      onClick
    } = this.props;
    return external_React_default().createElement("div", {
      className: `
                    ${NODE_CONTAINER_CLASS}
                    ${onClick ? 'clickable' : ''}
                `,
      style: {
        height: parseInt(image.height)
      }
    }, external_React_default().createElement("div", {
      ref: this.resultRef,
      className: NODE_CLASS,
      style: {
        backgroundImage: HAS_INTERSECTION_OBSERVER ? '' : `url(${image.url})`
      },
      "data-url": image.url,
      onClick: onClick
    }, external_React_default().createElement("span", null, title)));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/gifPanel/resultContainer.jsx




const HAS_INTERSECTION_OBSERVER = typeof IntersectionObserver !== 'undefined';
const NODE_CONTAINER_CLASS = 'node-container';
const NODE_CLASS = 'node';
const RESULT_CONTAINER_CLASS = 'gif-panel-results';
const RESULTS_END_CLASS = 'results-end';

const Nil = ({
  children
}) => external_React_default().createElement("div", {
  className: "no-results-container"
}, external_React_default().createElement("div", {
  className: "no-results-content"
}, external_React_default().createElement("i", {
  className: "huge-icon sad-smile"
}), external_React_default().createElement("span", null, children)));

class ResultContainer extends mixins.wl {
  constructor(props) {
    super(props);
    this.intersectionObserver = null;

    this.initializeIntersectionObserver = () => {
      if (HAS_INTERSECTION_OBSERVER) {
        this.intersectionObserver = new IntersectionObserver(entries => {
          for (let i = 0; i < entries.length; i++) {
            var _target$classList, _target$classList2;

            const entry = entries[i];
            const target = entry.target;

            if ((_target$classList = target.classList) != null && _target$classList.contains(NODE_CLASS)) {
              target.style.backgroundImage = entry.isIntersecting ? `url(${target.dataset.url})` : null;
            }

            if (entry.isIntersecting && (_target$classList2 = target.classList) != null && _target$classList2.contains(RESULTS_END_CLASS)) {
              this.props.onPaginate();
            }
          }
        });
      }
    };

    this.toggleIntersectionObserver = (node, action = 'observe') => {
      if (node && this.intersectionObserver) {
        this.intersectionObserver[action](node);
      }
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this.initializeIntersectionObserver();
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  componentWillReceiveProps(nextProps) {
    super.componentWillReceiveProps(nextProps);

    if (nextProps !== this.props) {
      this.safeForceUpdate();
    }
  }

  render() {
    const {
      loading,
      results,
      bottom,
      unavailable,
      onClick
    } = this.props;

    if (unavailable) {
      return external_React_default().createElement(Nil, null, LABELS.NOT_AVAILABLE);
    }

    if (loading && results.length < 1) {
      return external_React_default().createElement("div", {
        className: RESULT_CONTAINER_CLASS
      }, Array.from({
        length: 25
      }, (element, index) => external_React_default().createElement("div", {
        key: index,
        className: NODE_CONTAINER_CLASS
      }, external_React_default().createElement("div", {
        className: NODE_CLASS,
        style: {
          height: Math.floor(Math.random() * 150) + 100
        }
      }))));
    }

    if (!loading && results.length < 1) {
      return external_React_default().createElement(Nil, null, LABELS.NO_RESULTS);
    }

    if (results.length) {
      return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
        className: RESULT_CONTAINER_CLASS
      }, results.map(({
        slug,
        images: {
          fixed_width_downsampled
        },
        title
      }, index) => {
        return external_React_default().createElement(Result, {
          key: `${slug}--${index}`,
          image: fixed_width_downsampled,
          title: title,
          onClick: () => onClick(results[index]),
          onMount: this.toggleIntersectionObserver,
          onUnmount: this.toggleIntersectionObserver
        });
      })), external_React_default().createElement("div", {
        className: RESULTS_END_CLASS,
        ref: node => this.toggleIntersectionObserver(node),
        style: {
          visibility: bottom ? 'visible' : 'hidden'
        }
      }, external_React_default().createElement("img", {
        className: "emoji",
        alt: "\\ud83d\\ude10",
        src: `${staticpath}/images/mega/twemojis/2_v2/72x72/1f610.png`
      }), external_React_default().createElement("strong", null, LABELS.END_OF_RESULTS)));
    }

    return null;
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/gifPanel/gifPanel.jsx





const GIF_PANEL_CLASS = 'gif-panel-wrapper';
const MAX_HEIGHT = 550;
const API = {
  HOSTNAME: 'https://giphy.mega.nz/',
  ENDPOINT: 'v1/gifs',
  SCHEME: 'giphy://',
  convert: path => {
    if (path && typeof path === 'string') {
      const FORMAT = [API.SCHEME, API.HOSTNAME];

      if (path.indexOf(API.SCHEME) === 0 || path.indexOf(API.HOSTNAME) === 0) {
        return String.prototype.replace.apply(path, path.indexOf(API.SCHEME) === 0 ? FORMAT : FORMAT.reverse());
      }
    }
  },
  LIMIT: 25,
  OFFSET: 25
};
const LABELS = {
  SEARCH: l[24025],
  END_OF_RESULTS: l[24156],
  NO_RESULTS: l[24050],
  NOT_AVAILABLE: l[24512]
};
class GifPanel extends mixins.wl {
  constructor(props) {
    super(props);
    this.pathRef = '';
    this.controllerRef = null;
    this.fetchRef = null;
    this.delayProcID = null;
    this.defaultState = {
      value: '',
      searching: false,
      results: [],
      loading: true,
      offset: 0,
      bottom: false,
      unavailable: false
    };
    this.state = { ...this.defaultState
    };

    this.getContainerHeight = () => window.innerHeight * 0.6 > MAX_HEIGHT ? MAX_HEIGHT : window.innerHeight * 0.6;

    this.getFormattedPath = path => {
      const PATH = path + (path.indexOf('?') === -1 ? '?' : '&');
      const LIMIT = `limit=${API.LIMIT}`;
      return `${API.HOSTNAME + API.ENDPOINT}/${PATH + LIMIT}`;
    };

    this.clickedOutsideComponent = ev => {
      const $target = ev && $(ev.target);
      return $target.parents(`.${GIF_PANEL_CLASS}`).length === 0 && ['.small-icon.tiny-reset', '.small-icon.gif'].every(outsideElement => !$target.is(outsideElement));
    };

    this.bindEvents = () => {
      $(document).rebind('mousedown.gifPanel', ev => {
        if (this.clickedOutsideComponent(ev)) {
          this.props.onToggle();
        }
      }).rebind('keydown.gifPanel', ({
        keyCode
      }) => {
        if (keyCode && keyCode === 27) {
          return SearchField.hasValue() ? this.doReset() : this.props.onToggle();
        }
      });
    };

    this.unbindEvents = () => {
      if (this.delayProcID) {
        delay.cancel(this.delayProcID);
      }

      $(document).unbind('.gifPanel');
    };

    this.doFetch = path => {
      this.setState({
        loading: true,
        unavailable: false
      }, () => {
        this.pathRef = path;
        this.controllerRef = typeof AbortController === 'function' && new AbortController();
        this.fetchRef = fetch(this.getFormattedPath(path), {
          signal: this.controllerRef.signal
        }).then(response => response.json()).then(({
          data
        }) => {
          this.fetchRef = this.pathRef = null;

          if (this.isMounted()) {
            if (data && data.length) {
              return this.setState(state => ({
                results: [...state.results, ...data],
                loading: false
              }));
            }

            return this.setState({
              bottom: true,
              loading: false
            }, () => this.resultContainerRef.reinitialise());
          }
        }).catch(ex => {
          return ex.name === 'AbortError' ? null : this.setState({
            unavailable: true
          });
        });
      });
    };

    this.doPaginate = () => {
      const {
        value,
        loading,
        searching
      } = this.state;

      if (!loading) {
        this.setState(state => ({
          offset: state.offset + API.OFFSET
        }), () => {
          this.doFetch(searching ? `search?q=${escape(value)}&offset=${this.state.offset}` : `trending?offset=${this.state.offset}`);
        });
      }
    };

    this.doReset = () => {
      this.setState({ ...this.defaultState
      }, () => {
        this.doFetch('trending');
        onIdle(() => SearchField.focus());
        this.resultContainerRef.scrollToY(0);
      });
    };

    this.handleChange = ev => {
      const {
        value
      } = ev.target;
      const searching = value.length >= 2;

      if (value.length === 0) {
        return this.doReset();
      }

      if (this.fetchRef !== null && this.pathRef === 'trending' && this.controllerRef) {
        this.controllerRef.abort();
        this.fetchRef = this.pathRef = null;
      }

      this.setState(state => ({ ...this.defaultState,
        value,
        searching,
        results: searching ? [] : state.results
      }), () => {
        this.resultContainerRef.scrollToY(0);
        this.delayProcID = searching ? delay('gif-search', () => this.doFetch(`search?q=${escape(value)}`), 1600) : null;
      });
    };

    this.handleBack = () => this.doReset();

    this.doSend = result => {
      const {
        mp4,
        webp,
        mp4_size,
        webp_size,
        width,
        height
      } = result.images.fixed_height;
      const message = Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META + Message.MESSAGE_META_TYPE.GIPHY + JSON.stringify({
        textMessage: result.title,
        src: API.convert(mp4),
        src_webp: API.convert(webp),
        s: mp4_size,
        s_webp: webp_size,
        w: width,
        h: height
      });
      this.props.chatRoom.sendMessage(message);
      this.props.onToggle();
    };
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.state.results && this.state.results.length === 0) {
      this.doFetch('trending');
    }

    this.bindEvents();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }

  render() {
    const {
      value,
      searching,
      results,
      loading,
      bottom,
      unavailable
    } = this.state;
    return external_React_default().createElement("div", {
      className: "gif-panel-wrapper"
    }, external_React_default().createElement("div", {
      className: "gif-panel",
      style: {
        height: this.getContainerHeight()
      }
    }, external_React_default().createElement("div", {
      className: "gif-panel-header"
    }, external_React_default().createElement(SearchField, {
      value: value,
      searching: searching,
      onChange: this.handleChange,
      onReset: this.doReset,
      onBack: this.handleBack
    })), external_React_default().createElement("div", {
      className: "gif-panel-content"
    }, external_React_default().createElement(perfectScrollbar.F, {
      ref: container => {
        this.resultContainerRef = container;
      },
      options: {
        'suppressScrollX': true
      }
    }, external_React_default().createElement(ResultContainer, {
      results: results,
      loading: loading,
      bottom: bottom,
      unavailable: unavailable,
      onPaginate: this.doPaginate,
      onClick: this.doSend
    })))));
  }

}

/***/ }),

/***/ 638:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (HistoryPanel)
});

;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/initializerDefineProperty.js
function _initializerDefineProperty(target, property, descriptor, context) {
  if (!descriptor) return;
  Object.defineProperty(target, property, {
    enumerable: descriptor.enumerable,
    configurable: descriptor.configurable,
    writable: descriptor.writable,
    value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
  });
}
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(229);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: external "ReactDOM"
var external_ReactDOM_ = __webpack_require__(533);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
;// CONCATENATED MODULE: ./js/chat/ui/messages/alterParticipants.jsx
var React = __webpack_require__(363);

var ContactsUI = __webpack_require__(13);

var ConversationMessageMixin = (__webpack_require__(416).y);



class AltPartsConvMessage extends ConversationMessageMixin {
  _ensureNameIsLoaded(h) {
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
  }

  haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }

    if (this.props.message.meta) {
      if (this.props.message.meta.included) {
        return this.props.message.meta.included;
      } else if (this.props.message.meta.excluded) {
        return this.props.message.meta.excluded;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  render() {
    var self = this;
    var message = this.props.message;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
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
      var avatar = React.createElement(ContactsUI.Avatar, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;
      var text = h === contact.u ? l[23756] : l[8907].replace("%s", `<strong>${megaChat.html(displayName)}</strong>`);

      self._ensureNameIsLoaded(otherContact.u);

      messages.push(React.createElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId + "_" + h
      }, avatar, React.createElement("div", {
        className: "message content-area small-info-txt"
      }, React.createElement(ContactsUI.ContactButton, {
        className: "message",
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        label: React.createElement(utils.Emoji, null, otherDisplayName)
      }), datetime, React.createElement("div", {
        className: "message text-block"
      }, React.createElement(utils.ParsedHTML, null, text)))));
    });
    message.meta.excluded.forEach(function (h) {
      var otherContact = M.u[h] ? M.u[h] : {
        'u': h,
        'h': h,
        'c': 0
      };
      var avatar = React.createElement(ContactsUI.Avatar, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

      self._ensureNameIsLoaded(otherContact.u);

      var text;

      if (otherContact.u === contact.u) {
        text = l[8908];
      } else {
        text = l[8906].replace("%s", `<strong>${megaChat.html(displayName)}</strong>`);
      }

      messages.push(React.createElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId + "_" + h
      }, avatar, React.createElement("div", {
        className: "message content-area small-info-txt"
      }, React.createElement(ContactsUI.ContactButton, {
        className: "message",
        chatRoom: self.props.chatRoom,
        contact: otherContact,
        label: React.createElement(utils.Emoji, null, otherDisplayName)
      }), datetime, React.createElement("div", {
        className: "message text-block"
      }, React.createElement(utils.ParsedHTML, null, text)))));
    });
    return React.createElement("div", null, messages);
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/truncated.jsx
var truncated_React = __webpack_require__(363);

var truncated_ContactsUI = __webpack_require__(13);

var truncated_ConversationMessageMixin = (__webpack_require__(416).y);



class TruncatedMessage extends truncated_ConversationMessageMixin {
  render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = truncated_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
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
      avatar = truncated_React.createElement(truncated_ContactsUI.Avatar, {
        contact: contact,
        className: "message avatar-wrapper small-rounded-avatar",
        chatRoom: chatRoom
      });
      datetime = truncated_React.createElement("div", {
        className: "message date-time simpletip",
        "data-simpletip": time2date(timestampInt)
      }, timestamp);
    }

    return truncated_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, truncated_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, truncated_React.createElement(truncated_ContactsUI.ContactButton, {
      contact: contact,
      className: "message",
      label: truncated_React.createElement(utils.Emoji, null, displayName),
      chatRoom: chatRoom
    }), datetime, truncated_React.createElement("div", {
      className: "message text-block"
    }, l[8905])));
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/privilegeChange.jsx
var privilegeChange_React = __webpack_require__(363);

var privilegeChange_ContactsUI = __webpack_require__(13);

var privilegeChange_ConversationMessageMixin = (__webpack_require__(416).y);



class PrivilegeChange extends privilegeChange_ConversationMessageMixin {
  haveMoreContactListeners() {
    if (!this.props.message.meta || !this.props.message.meta.targetUserId) {
      return false;
    }

    var uid = this.props.message.meta.targetUserId;

    if (uid && M.u[uid]) {
      return uid;
    }

    return false;
  }

  render() {
    var self = this;
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = privilegeChange_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
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
    var avatar = privilegeChange_React.createElement(privilegeChange_ContactsUI.Avatar, {
      contact: otherContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: chatRoom
    });
    var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;
    var newPrivilegeText = "";

    if (message.meta.privilege === 3) {
      newPrivilegeText = l.priv_change_to_op;
    } else if (message.meta.privilege === 2) {
      newPrivilegeText = l.priv_change_to_std;
    } else if (message.meta.privilege === 0) {
      newPrivilegeText = l.priv_change_to_ro;
    }

    const text = newPrivilegeText.replace('[S]', '<strong>').replace('[/S]', '</strong>').replace('%s', `<strong>${megaChat.html(displayName)}</strong>`);
    messages.push(privilegeChange_React.createElement("div", {
      className: "message body",
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, privilegeChange_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, privilegeChange_React.createElement(privilegeChange_ContactsUI.ContactButton, {
      className: "message",
      chatRoom: self.props.chatRoom,
      contact: otherContact,
      label: privilegeChange_React.createElement(utils.Emoji, null, otherDisplayName)
    }), datetime, privilegeChange_React.createElement("div", {
      className: "message text-block"
    }, privilegeChange_React.createElement(utils.ParsedHTML, null, text)))));
    return privilegeChange_React.createElement("div", null, messages);
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/topicChange.jsx
var topicChange_React = __webpack_require__(363);

var topicChange_ContactsUI = __webpack_require__(13);

var topicChange_ConversationMessageMixin = (__webpack_require__(416).y);



class TopicChange extends topicChange_ConversationMessageMixin {
  render() {
    var self = this;
    var message = this.props.message;
    var megaChat = this.props.message.chatRoom.megaChat;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = topicChange_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var messages = [];
    var avatar = topicChange_React.createElement(topicChange_ContactsUI.Avatar, {
      contact: contact,
      chatRoom: chatRoom,
      className: "message avatar-wrapper small-rounded-avatar"
    });
    const topic = megaChat.html(message.meta.topic);
    messages.push(topicChange_React.createElement("div", {
      className: "message body",
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, topicChange_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, topicChange_React.createElement(topicChange_ContactsUI.ContactButton, {
      className: "message",
      chatRoom: chatRoom,
      contact: contact,
      label: topicChange_React.createElement(utils.Emoji, null, displayName)
    }), datetime, topicChange_React.createElement("div", {
      className: "message text-block"
    }, topicChange_React.createElement(utils.ParsedHTML, null, l[9081].replace('%s', `<strong>"${topic}"</strong>`))))));
    return topicChange_React.createElement("div", null, messages);
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/closeOpenMode.jsx
var closeOpenMode_React = __webpack_require__(363);

var closeOpenMode_ContactsUI = __webpack_require__(13);

var closeOpenMode_ConversationMessageMixin = (__webpack_require__(416).y);



class CloseOpenModeMessage extends closeOpenMode_ConversationMessageMixin {
  render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    this.props.message.chatRoom.megaChat;
    this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = closeOpenMode_React.createElement("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
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
      avatar = closeOpenMode_React.createElement(closeOpenMode_ContactsUI.Avatar, {
        contact: contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = closeOpenMode_React.createElement("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }

    return closeOpenMode_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, closeOpenMode_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, closeOpenMode_React.createElement("div", {
      className: "message user-card-name"
    }, closeOpenMode_React.createElement(utils.Emoji, null, displayName)), datetime, closeOpenMode_React.createElement("div", {
      className: "message text-block"
    }, l[20569])));
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/chatHandle.jsx
var chatHandle_React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);

var chatHandle_utils = __webpack_require__(79);

var chatHandle_ContactsUI = __webpack_require__(13);

var chatHandle_ConversationMessageMixin = (__webpack_require__(416).y);

var getMessageString = (__webpack_require__(504).l);



class ChatHandleMessage extends chatHandle_ConversationMessageMixin {
  render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    this.props.message.chatRoom.megaChat;
    this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = chatHandle_React.createElement("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
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
      avatar = chatHandle_React.createElement(chatHandle_ContactsUI.Avatar, {
        contact: contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = chatHandle_React.createElement("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }

    return chatHandle_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, chatHandle_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, chatHandle_React.createElement("div", {
      className: "message user-card-name"
    }, chatHandle_React.createElement(utils.Emoji, null, displayName)), datetime, chatHandle_React.createElement("div", {
      className: "message text-block"
    }, message.meta.handleUpdate === 1 ? l[20570] : l[20571])));
  }

}


// EXTERNAL MODULE: ./js/chat/ui/messages/generic.jsx + 13 modules
var generic = __webpack_require__(98);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(285);
// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
var mixin = __webpack_require__(416);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var contacts = __webpack_require__(13);
;// CONCATENATED MODULE: ./js/chat/ui/messages/retentionChange.jsx




class RetentionChange extends mixin.y {
  render() {
    const {
      message
    } = this.props;
    const contact = this.getContact();
    return external_React_default().createElement("div", {
      className: "message body",
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, external_React_default().createElement(contacts.Avatar, {
      contact: contact,
      className: "message avatar-wrapper small-rounded-avatar"
    }), external_React_default().createElement("div", {
      className: "message content-area small-info-txt"
    }, external_React_default().createElement(contacts.ContactButton, {
      contact: contact,
      className: "message",
      label: external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(contact.u))
    }), external_React_default().createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString()), external_React_default().createElement("div", {
      className: "message text-block"
    }, message.getMessageRetentionSummary())));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/meetings/call.jsx + 23 modules
var call = __webpack_require__(357);
;// CONCATENATED MODULE: ./js/chat/ui/historyPanel.jsx




var _dec, _dec2, _class, _descriptor;















let HistoryPanel = (_dec = utils["default"].SoonFcWrap(50), _dec2 = (0,mixins.M9)(450, true), (_class = class HistoryPanel extends mixins.wl {
  constructor(props) {
    super(props);
    this.$container = null;
    this.$messages = null;
    this.state = {
      editing: false,
      toast: false
    };

    this.onKeyboardScroll = ({
      keyCode
    }) => {
      const scrollbar = this.messagesListScrollable;
      const domNode = scrollbar == null ? void 0 : scrollbar.domNode;

      if (domNode && this.isComponentEventuallyVisible() && !this.state.attachCloudDialog) {
        const scrollPositionY = scrollbar.getScrollPositionY();
        const offset = parseInt(domNode.style.height);
        const PAGE = {
          UP: 33,
          DOWN: 34
        };

        switch (keyCode) {
          case PAGE.UP:
            scrollbar.scrollToY(scrollPositionY - offset, true);
            this.onMessagesScrollUserScroll(scrollbar, 100);
            break;

          case PAGE.DOWN:
            if (!scrollbar.isAtBottom()) {
              scrollbar.scrollToY(scrollPositionY + offset, true);
            }

            break;
        }
      }
    };

    _initializerDefineProperty(this, "onMessagesScrollReinitialise", _descriptor, this);

    this.onMessagesScrollUserScroll = (ps, offset = 5) => {
      const {
        chatRoom
      } = this.props;
      const {
        messagesBuff
      } = chatRoom;
      const scrollPositionY = ps.getScrollPositionY();

      if (messagesBuff.messages.length === 0) {
        chatRoom.scrolledToBottom = true;
        return;
      }

      if (ps.isCloseToBottom(30) === true) {
        if (!chatRoom.scrolledToBottom) {
          messagesBuff.detachMessages();
        }

        chatRoom.scrolledToBottom = true;
      } else {
        chatRoom.scrolledToBottom = false;
      }

      if (!this.scrollPullHistoryRetrieval && !messagesBuff.isRetrievingHistory && (ps.isAtTop() || scrollPositionY < offset && ps.getScrollHeight() > 500) && messagesBuff.haveMoreHistory()) {
        ps.disable();
        this.scrollPullHistoryRetrieval = true;
        this.lastScrollPosition = scrollPositionY;
        let msgAppended = 0;
        const scrYOffset = ps.getScrollHeight();
        chatRoom.one('onMessagesBuffAppend.pull', () => {
          msgAppended++;
        });
        chatRoom.off('onHistoryDecrypted.pull');
        chatRoom.one('onHistoryDecrypted.pull', () => {
          chatRoom.off('onMessagesBuffAppend.pull');

          if (msgAppended > 0) {
            this._reposOnUpdate = scrYOffset;
          }

          this.scrollPullHistoryRetrieval = -1;
        });
        messagesBuff.retrieveChatHistory();
      }

      if (this.lastScrollPosition !== scrollPositionY) {
        this.lastScrollPosition = scrollPositionY;
      }

      delay('chat-toast', this.initToast, 200);
    };

    this.initToast = () => {
      const {
        chatRoom
      } = this.props;
      this.setState({
        toast: !chatRoom.scrolledToBottom && !this.messagesListScrollable.isCloseToBottom(30)
      }, () => this.state.toast ? null : chatRoom.trigger('onChatIsFocused'));
    };

    this.renderToast = () => {
      const {
        chatRoom
      } = this.props;
      const unreadCount = chatRoom.messagesBuff.getUnreadCount();
      return external_React_default().createElement("div", {
        className: `
                    theme-dark-forced
                    messages-toast
                    ${this.state.toast ? 'active' : ''}
                `,
        onClick: () => {
          this.setState({
            toast: false
          }, () => {
            this.messagesListScrollable.scrollToBottom();
            chatRoom.scrolledToBottom = true;
          });
        }
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-down"
      }), unreadCount > 0 && external_React_default().createElement("span", null, unreadCount > 9 ? '9+' : unreadCount));
    };

    this.handleWindowResize = SoonFc(80, ev => this._handleWindowResize(ev));
  }

  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }

  componentWillMount() {
    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom.rebind('onHistoryDecrypted.cp', function () {
      self.eventuallyUpdate();
    });
    this._messagesBuffChangeHandler = chatRoom.messagesBuff.addChangeListener(SoonFc(function () {
      if (self.isComponentEventuallyVisible()) {
        $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
      }

      self.refreshUI();
    }));
  }

  componentDidMount() {
    super.componentDidMount();
    const {
      chatRoom,
      onMount
    } = this.props;
    window.addEventListener('resize', this.handleWindowResize);
    window.addEventListener('keydown', this.handleKeyDown);
    this.$container = $(`.conversation-panel[data-room-id="${chatRoom.chatId}"]`);
    this.eventuallyInit();
    chatRoom.trigger('onHistoryPanelComponentDidMount');

    if (onMount) {
      onMount(this);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    var chatRoom = self.props.chatRoom;

    if (this._messagesBuffChangeHandler) {
      chatRoom.messagesBuff.removeChangeListener(this._messagesBuffChangeHandler);
      delete this._messagesBuffChangeHandler;
    }

    window.removeEventListener('resize', self.handleWindowResize);
    window.removeEventListener('keydown', self.handleKeyDown);
    $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
    $(document).off('keydown.keyboardScroll_' + chatRoom.roomId);
  }

  componentDidUpdate(prevProps, prevState) {
    var self = this;
    self.eventuallyInit(false);
    var domNode = self.findDOMNode();
    var jml = domNode && domNode.querySelector('.js-messages-loading');

    if (jml) {
      if (self.loadingShown) {
        jml.classList.remove('hidden');
      } else {
        jml.classList.add('hidden');
      }
    }

    self.handleWindowResize();

    if (prevState.editing === false && self.state.editing !== false && self.messagesListScrollable) {
      self.messagesListScrollable.reinitialise(false);
      Soon(function () {
        if (self.editDomElement && self.editDomElement.length === 1) {
          self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
        }
      });
    }

    if (self._reposOnUpdate !== undefined) {
      var ps = self.messagesListScrollable;
      ps.__prevPosY = ps.getScrollHeight() - self._reposOnUpdate + self.lastScrollPosition;
      ps.scrollToY(ps.__prevPosY, true);
    }
  }

  eventuallyInit(doResize) {
    const self = this;

    if (self.initialised) {
      return;
    }

    if (self.findDOMNode()) {
      self.initialised = true;
    } else {
      return;
    }

    $(self.findDOMNode()).rebind('resized.convpanel', function () {
      self.handleWindowResize();
    });
    self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', self.$container);
    self.$messages.droppable({
      tolerance: 'pointer',
      drop: function (e, ui) {
        $.doDD(e, ui, 'drop', 1);
      },
      over: function (e, ui) {
        $.doDD(e, ui, 'over', 1);
      },
      out: function (e, ui) {
        $.doDD(e, ui, 'out', 1);
      }
    });
    self.lastScrollPosition = null;
    self.props.chatRoom.scrolledToBottom = true;
    self.lastScrollHeight = 0;
    self.lastUpdatedScrollHeight = 0;

    if (doResize !== false) {
      self.handleWindowResize();
    }
  }

  _handleWindowResize(e, scrollToBottom) {
    if (!M.chat) {
      return;
    }

    if (!this.isMounted()) {
      this.componentWillUnmount();
      return;
    }

    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    var self = this;
    self.eventuallyInit(false);

    if (!self.$messages) {
      return;
    }

    if (call.ZP.isExpanded()) {
      const $container = $('.meetings-call');
      const $messages = $('.js-messages-scroll-area', $container);
      const $textarea = $('.chat-textarea-block', $container);
      const $sidebar = $('.sidebar', $container);
      const scrollBlockHeight = parseInt($container.outerHeight(), 10) - parseInt($textarea.outerHeight(), 10) - 20;

      if ($sidebar.hasClass('chat-opened') && scrollBlockHeight !== $messages.outerHeight()) {
        $messages.css('height', scrollBlockHeight);
        self.refreshUI(true);
      }

      return;
    }

    var scrollBlockHeight = $('.chat-content-block', self.$container).outerHeight() - ($('.chat-topic-block', self.$container).outerHeight() || 0) - ($('.call-block', self.$container).outerHeight() || 0) - (is_chatlink ? $('.join-chat-block', self.$container).outerHeight() : $('.messages-block .chat-textarea-block', self.$container).outerHeight());

    if (scrollBlockHeight !== self.$messages.outerHeight()) {
      self.$messages.css('height', scrollBlockHeight);
      $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
      self.refreshUI(true);
    } else {
      self.refreshUI(scrollToBottom);
    }
  }

  refreshUI() {
    if (this.isComponentEventuallyVisible()) {
      const room = this.props.chatRoom;
      room.renderContactTree();
      room.megaChat.refreshConversations();
      room.trigger('RefreshUI');

      if (room.scrolledToBottom) {
        delay('hp:reinit-scroll', () => {
          this.messagesListScrollable.reinitialise(true, true);
        }, 30);
      }
    }
  }

  isLoading() {
    const chatRoom = this.props.chatRoom;
    const mb = chatRoom.messagesBuff;
    return this.scrollPullHistoryRetrieval === true || chatRoom.activeSearches || mb.messagesHistoryIsLoading() || mb.joined === false || mb.isDecrypting;
  }

  specShouldComponentUpdate() {
    return !this.loadingShown && this.isComponentEventuallyVisible();
  }

  enableScrollbar() {
    const ps = this.messagesListScrollable;
    ps.enable();
    this._reposOnUpdate = undefined;
    this.lastScrollPosition = ps.__prevPosY | 0;
  }

  editMessage(messageId) {
    var self = this;
    self.setState({
      'editing': messageId
    });
    self.props.chatRoom.scrolledToBottom = false;
  }

  onMessageEditDone(v, messageContents) {
    var self = this;
    var room = this.props.chatRoom;
    room.scrolledToBottom = true;
    self.editDomElement = null;
    var currentContents = v.textContents;
    v.edited = false;

    if (messageContents === false || messageContents === currentContents) {
      self.messagesListScrollable.scrollToBottom(true);
    } else if (messageContents) {
      room.trigger('onMessageUpdating', v);
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

        v.trigger('onChange', [v, "textContents", "", messageContents]);
        megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
      }

      self.messagesListScrollable.scrollToBottom(true);
    } else if (messageContents.length === 0) {
      this.props.onDeleteClicked(v);
    }

    self.setState({
      'editing': false
    });
    self.refreshUI();
    Soon(function () {
      $('.chat-textarea-block:visible textarea').focus();
    }, 300);
  }

  render() {
    var self = this;
    var room = this.props.chatRoom;

    if (!room || !room.roomId) {
      return null;
    }

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

    var messagesList = [];

    if (this.isLoading()) {
      self.loadingShown = true;
    } else {
      const mb = room.messagesBuff;

      if (this.scrollPullHistoryRetrieval < 0) {
        this.scrollPullHistoryRetrieval = false;
        self.enableScrollbar();
      }

      delete self.loadingShown;

      if (mb.joined === true && !self.scrollPullHistoryRetrieval && mb.haveMoreHistory() === false) {
        var headerText = l[8002];
        headerText = contactName ? headerText.replace('%s', `<span>${megaChat.html(contactName)}</span>`) : megaChat.html(room.getRoomTitle());
        messagesList.push(external_React_default().createElement("div", {
          className: "messages notification",
          key: "initialMsg"
        }, external_React_default().createElement("div", {
          className: "header"
        }, external_React_default().createElement(utils.ParsedHTML, {
          tag: "div",
          content: headerText
        })), external_React_default().createElement("div", {
          className: "info"
        }, l[8080], external_React_default().createElement("p", null, external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-lock"
        }), external_React_default().createElement(utils.ParsedHTML, null, l[8540].replace("[S]", "<strong>").replace("[/S]", "</strong>"))), external_React_default().createElement("p", null, external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-accept"
        }), external_React_default().createElement(utils.ParsedHTML, null, l[8539].replace("[S]", "<strong>").replace("[/S]", "</strong>"))))));
      }
    }

    var lastTimeMarker;
    var lastMessageFrom = null;
    var lastGroupedMessageTimeStamp = null;
    var grouped = false;

    for (var i = 0; i < room.messagesBuff.messages.length; i++) {
      var v = room.messagesBuff.messages.getItem(i);

      if (!v.protocol && v.revoked !== true) {
        var shouldRender = true;

        if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false || v.deleted === true) {
          shouldRender = false;
        }

        var timestamp = v.delay;
        var curTimeMarker = getTimeMarker(timestamp);

        if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
          lastTimeMarker = curTimeMarker;
          messagesList.push(external_React_default().createElement("div", {
            className: "message date-divider",
            key: v.messageId + "_marker",
            title: time2date(timestamp)
          }, curTimeMarker));
          grouped = false;
          lastMessageFrom = null;
          lastGroupedMessageTimeStamp = null;
        }

        if (shouldRender === true) {
          var userId = v.userId;

          if (!userId && contact && contact.u) {
            userId = contact.u;
          }

          if (v instanceof Message && v.dialogType !== "truncated") {
            if (!lastMessageFrom || userId && lastMessageFrom === userId) {
              if (timestamp - lastGroupedMessageTimeStamp < 300) {
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

        if ((v.dialogType === "remoteCallEnded" || v.dialogType === "remoteCallStarted") && v && v.wrappedChatDialogMessage) {
          v = v.wrappedChatDialogMessage;
        }

        if (v.dialogType) {
          var messageInstance = null;

          if (v.dialogType === 'alterParticipants') {
            messageInstance = external_React_default().createElement(AltPartsConvMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'truncated') {
            messageInstance = external_React_default().createElement(TruncatedMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'privilegeChange') {
            messageInstance = external_React_default().createElement(PrivilegeChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'topicChange') {
            messageInstance = external_React_default().createElement(TopicChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'openModeClosed') {
            messageInstance = external_React_default().createElement(CloseOpenModeMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'chatHandleUpdate') {
            messageInstance = external_React_default().createElement(ChatHandleMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'messageRetention') {
            messageInstance = external_React_default().createElement(RetentionChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v)
            });
          }

          messagesList.push(messageInstance);
        } else {
          if (!v.chatRoom) {
            v.chatRoom = room;
          }

          messagesList.push(external_React_default().createElement(generic.Z, {
            message: v,
            state: v.state,
            key: v.messageId,
            contact: Message.getContactForMessage(v),
            grouped: grouped,
            onUpdate: () => {
              self.onResizeDoUpdate();
            },
            editing: self.state.editing === v.messageId || self.state.editing === v.pendingMessageId,
            onEditStarted: ((v, $domElement) => {
              self.editDomElement = $domElement;
              self.setState({
                'editing': v.messageId
              });
              self.forceUpdate();
            }).bind(this, v),
            chatRoom: room,
            onEditDone: this.onMessageEditDone.bind(this, v),
            onDeleteClicked: msg => {
              if (this.props.onDeleteClicked) {
                this.props.onDeleteClicked(msg);
              }
            },
            onResized: () => {
              this.handleWindowResize();
            },
            onEmojiBarChange: () => {
              this.handleWindowResize();
            }
          }));
        }
      }
    }

    return external_React_default().createElement("div", {
      className: `
                    messages
                    scroll-area
                    ${this.props.className ? this.props.className : ''}
                `
    }, external_React_default().createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden"
    }, external_React_default().createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default().createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default().createElement("i", {
      className: "small-icon conversations"
    }), l[8883])), external_React_default().createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden"
    }, external_React_default().createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default().createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default().createElement("i", {
      className: "small-icon conversations"
    }), l[8884])), external_React_default().createElement(perfectScrollbar.F, {
      onFirstInit: ps => {
        ps.scrollToBottom(true);
        this.props.chatRoom.scrolledToBottom = 1;
      },
      onReinitialise: this.onMessagesScrollReinitialise,
      onUserScroll: this.onMessagesScrollUserScroll,
      className: "js-messages-scroll-area perfectScrollbarContainer",
      messagesToggledInCall: this.state.messagesToggledInCall,
      ref: ref => {
        this.messagesListScrollable = ref;
        $(document).rebind('keydown.keyboardScroll_' + this.props.chatRoom.roomId, this.onKeyboardScroll);

        if (this.props.onMessagesListScrollableMount) {
          this.props.onMessagesListScrollableMount(ref);
        }
      },
      chatRoom: this.props.chatRoom,
      messagesBuff: this.props.chatRoom.messagesBuff,
      editDomElement: this.state.editDomElement,
      editingMessageId: this.state.editing,
      confirmDeleteDialog: this.state.confirmDeleteDialog,
      renderedMessagesCount: messagesList.length,
      isLoading: this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() || this.props.chatRoom.activeSearches > 0 || this.loadingShown,
      options: {
        'suppressScrollX': true
      }
    }, external_React_default().createElement("div", {
      className: "messages main-pad"
    }, external_React_default().createElement("div", {
      className: "messages content-area"
    }, external_React_default().createElement("div", {
      key: "loadingSpinner",
      style: {
        top: "50%"
      },
      className: `
                                    loading-spinner
                                    js-messages-loading
                                    light
                                    manual-management
                                    ${this.loadingShown ? '' : 'hidden'}
                                `
    }, external_React_default().createElement("div", {
      className: "main-loader",
      style: {
        'position': 'fixed',
        'top': '50%',
        'left': '50%'
      }
    })), messagesList))), this.renderToast());
  }

}, (_descriptor = (0,applyDecoratedDescriptor.Z)(_class.prototype, "onMessagesScrollReinitialise", [_dec], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: function () {
    return (ps, $elem, forced, scrollPositionYPerc, scrollToElement) => {
      const {
        chatRoom
      } = this.props;

      if (this.scrollPullHistoryRetrieval || chatRoom.messagesBuff.isRetrievingHistory) {
        return;
      }

      if (forced) {
        if (!scrollPositionYPerc && !scrollToElement) {
          if (chatRoom.scrolledToBottom && !this.editDomElement) {
            ps.scrollToBottom(true);
            return true;
          }
        } else {
          return;
        }
      }

      if (this.isComponentEventuallyVisible() && !this.editDomElement && !chatRoom.isScrollingToMessageId) {
        if (chatRoom.scrolledToBottom) {
          ps.scrollToBottom(true);
          return true;
        }

        if (this.lastScrollPosition && this.lastScrollPosition !== ps.getScrollPositionY()) {
          ps.scrollToY(this.lastScrollPosition, true);
          return true;
        }
      }
    };
  }
}), (0,applyDecoratedDescriptor.Z)(_class.prototype, "enableScrollbar", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "enableScrollbar"), _class.prototype)), _class));


/***/ }),

/***/ 941:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (Link)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);


class Link extends _mixins1__.wl {
  constructor(props) {
    super(props);
    this.IS_CLICK_URL = undefined;
    this.IS_CLICK_URL = this.props.to && this.props.to.startsWith('/');
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.IS_CLICK_URL) {
      clickURLs();
    }
  }

  render() {
    const {
      className,
      to,
      target,
      children,
      onClick
    } = this.props;

    if (this.IS_CLICK_URL) {
      return react0().createElement("a", {
        className: `
                        clickurl
                        ${className || ''}
                    `,
        href: to,
        target: target
      }, children);
    }

    return react0().createElement("a", {
      className: className,
      href: "#",
      onClick: ev => {
        if (onClick) {
          ev.preventDefault();
          return onClick(ev);
        }

        return null;
      }
    }, children);
  }

}

/***/ }),

/***/ 193:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (__WEBPACK_DEFAULT_EXPORT__)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);



class Group extends _mixins1__.wl {
  constructor(...args) {
    super(...args);
    this.containerRef = react0().createRef();
    this.state = {
      expanded: false
    };

    this.toggleEvents = () => this.state.expanded ? $(document).rebind(`mousedown.${Group.NAMESPACE}`, ev => !this.containerRef.current.contains(ev.target) && this.doToggle()).rebind(`keydown.${Group.NAMESPACE}`, ({
      keyCode
    }) => keyCode && keyCode === 27 && this.doToggle()) : $(document).unbind(`.${Group.NAMESPACE}`);

    this.doToggle = () => this.setState(state => ({
      expanded: !state.expanded
    }), () => this.toggleEvents());
  }

  render() {
    const {
      active,
      warn,
      onHold,
      screenSharing,
      children
    } = this.props;

    if (children && children.length) {
      return react0().createElement("div", {
        ref: this.containerRef,
        className: Group.BASE_CLASS
      }, react0().createElement("div", {
        className: `
                            ${Group.BASE_CLASS}-menu
                            ${this.state.expanded ? 'expanded' : ''}
                        `,
        onClick: this.doToggle
      }, children.map((item, index) => react0().createElement("div", {
        key: index,
        className: `${Group.BASE_CLASS}-item`
      }, item))), react0().createElement("button", {
        className: "mega-button theme-light-forced round large",
        onClick: this.doToggle
      }, active && react0().createElement("div", {
        className: "info-indicator active"
      }), warn && react0().createElement("div", {
        className: "info-indicator warn simpletip",
        "data-simpletip": "Screen sharing a window or browser tab may be cropped.",
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5",
        "data-simpletip-class": "theme-dark-forced"
      }, react0().createElement("div", {
        className: "sprite-fm-mono icon-exclamation-filled"
      })), react0().createElement("i", {
        className: `
                                sprite-fm-mono
                                ${screenSharing ? 'icon-end-screenshare' : ''}
                                ${!onHold && !screenSharing && 'icon-options'}
                            `
      })));
    }

    return null;
  }

}

Group.NAMESPACE = 'buttonGroup';
Group.BASE_CLASS = 'button-group';

class Button extends _mixins1__.wl {
  constructor(props) {
    super(props);
    this.buttonRef = react0().createRef();
  }

  componentDidUpdate() {
    super.componentDidUpdate();

    if (this.props.simpletip) {
      $(this.buttonRef.current).trigger('simpletipUpdated');
    }
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.props.didMount) {
      this.props.didMount(this);
    }
  }

  render() {
    const {
      children,
      className,
      style,
      simpletip,
      icon,
      onClick
    } = this.props;
    return react0().createElement("button", {
      ref: this.buttonRef,
      className: `
                    ${className ? className : ''}
                    ${simpletip ? 'simpletip' : ''}
                `,
      style: style,
      "data-simpletip": simpletip == null ? void 0 : simpletip.label,
      "data-simpletipposition": simpletip == null ? void 0 : simpletip.position,
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": simpletip == null ? void 0 : simpletip.className,
      onClick: onClick
    }, icon && react0().createElement("i", {
      className: `sprite-fm-mono ${icon}`
    }), children);
  }

}

Button.Group = Group;
const __WEBPACK_DEFAULT_EXPORT__ = (Button);

/***/ }),

/***/ 357:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "F3": () => (EXPANDED_FLAG),
  "ZP": () => (Call),
  "xt": () => (inProgressAlert)
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(462);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(904);
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
var meetings_button = __webpack_require__(193);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/modeSwitch.jsx




class ModeSwitch extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.containerRef = external_React_default().createRef();
    this.state = {
      expanded: false
    };

    this.handleMousedown = ({
      target
    }) => {
      var _this$containerRef;

      return (_this$containerRef = this.containerRef) != null && _this$containerRef.current.contains(target) ? null : this.doClose();
    };

    this.handleKeydown = ({
      keyCode
    }) => keyCode && keyCode === 27 && this.doClose();

    this.doClose = () => this.setState({
      expanded: false
    });

    this.doToggle = () => this.setState(state => ({
      expanded: !state.expanded
    }));

    this.getModeIcon = mode => {
      switch (mode) {
        case Call.MODE.THUMBNAIL:
          return 'icon-thumbnail-view';

        case Call.MODE.SPEAKER:
          return 'icon-speaker-view';

        default:
          return null;
      }
    };

    this.Toggle = () => {
      const {
        mode
      } = this.props;
      return external_React_default().createElement("div", {
        className: `${ModeSwitch.BASE_CLASS}-toggle`,
        onClick: this.doToggle
      }, external_React_default().createElement(meetings_button.Z, null, external_React_default().createElement("i", {
        className: `sprite-fm-mono ${this.getModeIcon(mode)}`
      }), mode === Call.MODE.THUMBNAIL && external_React_default().createElement("div", null, l.thumbnail_view), mode === Call.MODE.SPEAKER && external_React_default().createElement("div", null, l.main_view)), external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-arrow-down"
      }));
    };

    this.Option = ({
      label,
      mode
    }) => {
      return external_React_default().createElement("div", {
        className: `
                    ${ModeSwitch.BASE_CLASS}-option
                    ${mode === this.props.mode ? 'active' : ''}
                `,
        onClick: () => {
          this.doToggle();
          this.props.onModeChange(mode);
        }
      }, external_React_default().createElement(meetings_button.Z, null, external_React_default().createElement("i", {
        className: `sprite-fm-mono ${this.getModeIcon(mode)}`
      }), external_React_default().createElement("div", null, label)));
    };
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('mousedown', this.handleMousedown);
    document.removeEventListener('keydown', this.handleKeydown);
  }

  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('mousedown', this.handleMousedown);
    document.addEventListener('keydown', this.handleKeydown);
  }

  render() {
    const {
      Toggle,
      Option,
      containerRef,
      state
    } = this;
    return external_React_default().createElement("div", {
      ref: containerRef,
      className: ModeSwitch.BASE_CLASS
    }, external_React_default().createElement(Toggle, null), external_React_default().createElement("div", {
      className: `
                        ${ModeSwitch.BASE_CLASS}-menu
                        ${state.expanded ? 'expanded' : ''}
                    `
    }, external_React_default().createElement(Option, {
      label: l.main_view,
      mode: Call.MODE.SPEAKER
    }), external_React_default().createElement(Option, {
      label: l.thumbnail_view,
      mode: Call.MODE.THUMBNAIL
    })));
  }

}
ModeSwitch.NAMESPACE = 'modeSwitch';
ModeSwitch.BASE_CLASS = 'mode';
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/streamHead.jsx







class StreamHead extends mixins.wl {
  constructor(props) {
    super(props);
    this.delayProcID = null;
    this.headRef = external_React_default().createRef();
    this.durationRef = external_React_default().createRef();
    this.dialogRef = external_React_default().createRef();
    this.topicRef = external_React_default().createRef();
    this.interval = undefined;
    this.state = {
      dialog: false,
      duration: undefined,
      banner: false
    };

    this.updateDurationDOM = () => {
      if (this.durationRef) {
        this.durationRef.current.innerText = this.durationString;
      }
    };

    this.closeTooltips = () => {
      for (const node of this.headRef.current.querySelectorAll('.simpletip')) {
        node.dispatchEvent(StreamHead.EVENTS.SIMPLETIP);
      }
    };

    this.toggleFullscreen = () => this.fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen();

    this.toggleBanner = callback => this.setState(state => ({
      banner: !state.banner
    }), () => callback && callback());

    this.handleDialogClose = ({
      target
    }) => {
      if (this.state.dialog) {
        const {
          topicRef,
          dialogRef,
          delayProcID
        } = this;
        const topicElement = topicRef && topicRef.current;
        const dialogElement = dialogRef && dialogRef.current && dialogRef.current.domNode;

        if (topicElement.contains(target)) {
          return;
        }

        return (target.classList.contains('icon-dialog-close') || !dialogElement.contains(target)) && this.setState({
          dialog: false
        }, () => delayProcID && delay.cancel(delayProcID));
      }
    };

    this.getModerators = () => {
      var _this$props$chatRoom;

      const members = (_this$props$chatRoom = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom.members;

      if (members) {
        const moderators = [];

        for (const [handle, role] of Object.entries(members)) {
          if (role === ChatRoom.MembersSet.PRIVILEGE_STATE.FULL) {
            moderators.push(M.getNameByHandle(handle));
          }
        }

        return mega.utils.trans.listToString(moderators, mega.icu.format(l.meeting_moderators, moderators.length));
      }
    };

    this.Dialog = () => {
      const {
        link
      } = this.props;
      return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({
        ref: this.dialogRef
      }, this.state, {
        name: "meeting-info-dialog",
        title: l[18132],
        className: "group-chat-link dialog-template-main theme-dark-forced in-call-info",
        hideOverlay: true
      }), external_React_default().createElement("section", {
        className: "content"
      }, external_React_default().createElement("div", {
        className: "content-block"
      }, external_React_default().createElement(utils.Emoji, {
        className: "info"
      }, this.getModerators()), external_React_default().createElement("div", {
        className: "info"
      }, l.copy_and_share), external_React_default().createElement("div", {
        className: "link-input-container"
      }, external_React_default().createElement("div", {
        className: "mega-input with-icon box-style"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-link"
      }), external_React_default().createElement("input", {
        type: "text",
        className: "megaInputs",
        readOnly: true,
        value: link
      })), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button positive copy-to-clipboard",
        onClick: () => {
          if (copyToClipboard(link)) {
            this.toggleBanner(() => {
              this.delayProcID = delay(`${StreamHead.NAMESPACE}-banner`, this.toggleBanner, 10000);
            });
          }
        }
      }, external_React_default().createElement("span", null, l[63]))), this.state.banner && external_React_default().createElement("div", {
        className: "banner-copy-success"
      }, l[7654]))), external_React_default().createElement("footer", null, external_React_default().createElement("div", {
        className: "footer-container"
      })));
    };
  }

  get fullscreen() {
    return document.fullscreenElement;
  }

  get duration() {
    return (Date.now() - this.props.call.ts) / 1000;
  }

  get durationString() {
    return this.duration ? secondsToTimeShort(this.duration) : '--:--:--';
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    clearInterval(this.durationInterval);
    document.removeEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
    document.removeEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
  }

  componentDidMount() {
    super.componentDidMount();
    this.durationInterval = setInterval(this.updateDurationDOM, 1000);
    document.addEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
    document.addEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
  }

  render() {
    const {
      NAMESPACE
    } = StreamHead;
    const {
      dialog
    } = this.state;
    const {
      mode,
      chatRoom,
      onCallMinimize,
      onModeChange
    } = this.props;
    const SIMPLETIP = {
      position: 'bottom',
      offset: 5,
      className: 'theme-dark-forced'
    };
    return external_React_default().createElement("div", {
      ref: this.headRef,
      className: `
                    ${NAMESPACE}
                    ${dialog ? 'active' : ''}
                `
    }, dialog && external_React_default().createElement(this.Dialog, null), external_React_default().createElement("div", {
      className: `${NAMESPACE}-content theme-dark-forced`
    }, external_React_default().createElement("div", {
      className: `${NAMESPACE}-info`
    }, external_React_default().createElement("div", {
      ref: this.durationRef,
      className: "stream-duration"
    }, this.durationString), external_React_default().createElement("div", {
      ref: this.topicRef,
      className: `
                                stream-topic
                                ${chatRoom.isMeeting ? 'has-meeting-link' : ''}
                            `,
      onClick: () => chatRoom.isMeeting && this.setState({
        dialog: !dialog,
        banner: false
      })
    }, external_React_default().createElement(utils.Emoji, null, chatRoom.getRoomTitle()), chatRoom.isMeeting && external_React_default().createElement("i", {
      className: `
                                        sprite-fm-mono
                                        ${dialog ? 'icon-arrow-up' : 'icon-arrow-down'}
                                    `
    }))), external_React_default().createElement("div", {
      className: `${NAMESPACE}-controls`
    }, external_React_default().createElement(ModeSwitch, {
      mode: mode,
      onModeChange: onModeChange
    }), external_React_default().createElement(meetings_button.Z, {
      className: "head-control",
      simpletip: { ...SIMPLETIP,
        label: l.minimize
      },
      icon: "icon-min-mode",
      onClick: onCallMinimize
    }, external_React_default().createElement("span", null, l.minimize)), external_React_default().createElement(meetings_button.Z, {
      className: "head-control",
      simpletip: { ...SIMPLETIP,
        label: this.fullscreen ? l[22895] : l[17803]
      },
      icon: `${this.fullscreen ? 'icon-fullscreen-leave' : 'icon-fullscreen-enter'}`,
      onClick: this.toggleFullscreen
    }, external_React_default().createElement("span", null, this.fullscreen ? l[22895] : l[17803])))));
  }

}
StreamHead.NAMESPACE = 'stream-head';
StreamHead.EVENTS = {
  FULLSCREEN: 'fullscreenchange',
  SIMPLETIP: new Event('simpletipClose'),
  CLICK_DIALOG: 'click'
};
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(13);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/streamNodeMenu.jsx





class StreamNodeMenu extends mixins.wl {
  constructor(props) {
    super(props);

    this.Contact = () => {
      const {
        stream,
        ephemeralAccounts,
        onCallMinimize
      } = this.props;
      const {
        userHandle
      } = stream;
      const IS_GUEST = Call.isGuest() || ephemeralAccounts && ephemeralAccounts.includes(userHandle);
      const HAS_RELATIONSHIP = M.u[userHandle].c === 1;

      if (HAS_RELATIONSHIP) {
        return external_React_default().createElement(meetings_button.Z, {
          icon: "sprite-fm-mono icon-chat-filled",
          onClick: () => {
            onCallMinimize();
            loadSubPage(`fm/chat/p/${userHandle}`);
          }
        }, external_React_default().createElement("span", null, l[7997]));
      }

      return external_React_default().createElement(meetings_button.Z, {
        className: IS_GUEST ? 'disabled' : '',
        icon: "sprite-fm-mono icon-add",
        onClick: () => {
          return IS_GUEST ? false : M.syncContactEmail(userHandle, new MegaPromise(), true).done(email => {
            const OPC = Object.values(M.opc);

            if (OPC && OPC.length && OPC.some(opc => opc.m === email)) {
              return msgDialog('warningb', '', l[17545]);
            }

            msgDialog('info', l[150], l[5898]);
            M.inviteContact(M.u[u_handle].m, email);
          }).catch(() => mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle));
        }
      }, external_React_default().createElement("span", null, l[24581]));
    };

    this.Pin = () => {
      const {
        stream,
        onSpeakerChange
      } = this.props;

      if (onSpeakerChange) {
        return external_React_default().createElement(meetings_button.Z, {
          icon: "sprite-fm-mono icon-speaker-view",
          onClick: () => onSpeakerChange(stream)
        }, external_React_default().createElement("span", null, l.display_in_main_view));
      }

      return null;
    };

    this.Privilege = () => {
      const {
        stream,
        chatRoom
      } = this.props;
      const {
        call,
        userHandle
      } = stream;

      if (call && call.isPublic) {
        const {
          FULL,
          OPERATOR
        } = ChatRoom.MembersSet.PRIVILEGE_STATE;
        const currentUserModerator = chatRoom.members[u_handle] === FULL;
        const targetUserModerator = chatRoom.members[userHandle] === FULL;
        return currentUserModerator && external_React_default().createElement(meetings_button.Z, {
          targetUserModerator: targetUserModerator,
          icon: "sprite-fm-mono icon-admin",
          onClick: () => {
            ['alterUserPrivilege', 'onCallPrivilegeChange'].map(event => chatRoom.trigger(event, [userHandle, targetUserModerator ? OPERATOR : FULL]));
          }
        }, external_React_default().createElement("span", null, targetUserModerator ? l.remove_moderator : l.make_moderator));
      }

      return null;
    };
  }

  render() {
    const {
      NAMESPACE
    } = StreamNodeMenu;
    const {
      userHandle
    } = this.props.stream;

    if (userHandle !== u_handle) {
      return external_React_default().createElement("div", {
        className: `
                        ${NAMESPACE}
                        theme-dark-forced
                    `
      }, external_React_default().createElement("div", {
        className: `${NAMESPACE}-toggle`
      }, external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(userHandle)), external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-side-menu"
      })), external_React_default().createElement("div", {
        className: `${NAMESPACE}-content`
      }, external_React_default().createElement("ul", null, [this.Contact, this.Pin, this.Privilege].map((button, index) => external_React_default().createElement("li", {
        key: index
      }, button())))));
    }

    return null;
  }

}
StreamNodeMenu.NAMESPACE = 'node-menu';
;// CONCATENATED MODULE: ./js/chat/ui/meetings/streamNode.jsx





class StreamNode extends mixins.wl {
  constructor(props) {
    super(props);
    this.nodeRef = external_React_default().createRef();
    this.contRef = external_React_default().createRef();
    this.statsHudRef = external_React_default().createRef();

    this.renderVideoDebugMode = () => {
      const {
        stream,
        isLocal
      } = this.props;

      if (stream.isFake) {
        return null;
      }

      let className = "video-rtc-stats";
      let title;

      if (isLocal) {
        if (window.sfuClient) {
          title = new URL(window.sfuClient.url).host;
        }

        if (this.props.isSelfOverlay) {
          className += " video-rtc-stats-ralign";
        }
      }

      if (!title) {
        title = "";
      }

      return external_React_default().createElement("div", {
        ref: this.statsHudRef,
        className: className,
        title: title
      });
    };

    this.renderContent = () => {
      const {
        stream,
        isCallOnHold
      } = this.props;
      const {
        loading
      } = this.state;

      if (stream && stream.isStreaming && stream.isStreaming() && !isCallOnHold) {
        return external_React_default().createElement((external_React_default()).Fragment, null, loading && external_React_default().createElement("i", {
          className: "sprite-fm-theme icon-loading-spinner loading-icon"
        }), external_React_default().createElement("div", {
          ref: this.contRef,
          className: "stream-node-holder"
        }));
      }

      delete this._lastResizeWidth;
      return external_React_default().createElement(ui_contacts.Avatar, {
        contact: M.u[stream.userHandle]
      });
    };

    this.getStatusIcon = (icon, label) => {
      return external_React_default().createElement("span", {
        className: "simpletip",
        "data-simpletip-class": "theme-dark-forced",
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5",
        "data-simpletip": label
      }, external_React_default().createElement("i", {
        className: `sprite-fm-mono ${icon}`
      }));
    };

    this.renderStatus = () => {
      const {
        mode,
        stream,
        chatRoom,
        localAudioMuted
      } = this.props;
      const {
        audioMuted,
        hasSlowNetwork,
        isOnHold,
        userHandle
      } = stream;

      const $$CONTAINER = ({
        children
      }) => external_React_default().createElement("div", {
        className: "stream-node-status theme-dark-forced"
      }, children);

      const onHoldLabel = l[23542].replace('%s', M.getNameByHandle(userHandle));
      const muted = userHandle === u_handle && localAudioMuted || audioMuted;

      if (isOnHold) {
        return external_React_default().createElement($$CONTAINER, null, this.getStatusIcon('icon-pause', onHoldLabel));
      }

      return external_React_default().createElement((external_React_default()).Fragment, null, mode === Call.MODE.SPEAKER && Call.isModerator(chatRoom, userHandle) && this.getStatusIcon('icon-admin call-role-icon', l[8875]), external_React_default().createElement($$CONTAINER, null, muted ? this.getStatusIcon('icon-audio-off', l.muted) : null, hasSlowNetwork ? this.getStatusIcon('icon-weak-signal', l.poor_connection) : null));
    };

    this.state = {
      loading: false
    };
    const {
      stream: _stream,
      externalVideo
    } = props;

    if (!externalVideo) {
      this.clonedVideo = document.createElement("video");
      this.setupVideoElement(this.clonedVideo);
    }

    if (!_stream.isFake) {
      _stream.registerConsumer(this);

      if (_stream instanceof CallManager2.Peer) {
        this._streamListener = _stream.addChangeListener((peer, data, key) => {
          if (key === "haveScreenshare") {
            this._lastResizeWidth = null;
          }

          this.requestVideo();
        });
      }
    }
  }

  requestVideo(forceVisible) {
    if (this.isComponentVisible() || forceVisible) {
      var node = this.findDOMNode();
      this.requestVideoBySize(node.offsetWidth, node.offsetHeight);
    } else {
      this.requestVideoBySize(0, 0);
    }
  }

  setupVideoElement(video) {
    if (video._snSetup) {
      return;
    }

    video.autoplay = true;
    video.controls = false;
    video.muted = true;

    video.ondblclick = e => {
      if (this.props.onDoubleClick) {
        this.props.onDoubleClick(e, this);
      }
    };

    video.onloadeddata = ev => {
      this.requestVideo();

      if (this.props.onLoadedData) {
        this.props.onLoadedData(ev);
      }
    };

    video._snSetup = true;
  }

  setLoading(loading) {
    if (this.isMounted()) {
      this.setState({
        loading: loading
      });
    } else {
      this.state.loading = loading;
    }
  }

  updateVideoElem() {
    if (!this.isMounted() || !this.contRef.current) {
      return;
    }

    const currVideo = this.contRef.current.firstChild;
    const {
      stream,
      externalVideo
    } = this.props;
    const {
      source
    } = stream;

    if (externalVideo) {
      if (currVideo === source) {
        return;
      }

      if (source) {
        this.setupVideoElement(source);
        this.contRef.current.replaceChildren(source);
      } else {
        this.contRef.current.replaceChildren();
      }
    } else {
      if (!currVideo) {
        this.contRef.current.replaceChildren(this.clonedVideo);
      }

      if (source) {
        if (this.clonedVideo.paused || this.clonedVideo.srcObject !== source.srcObject) {
          this.clonedVideo.srcObject = source.srcObject;
          this.clonedVideo.play().catch(() => {});
        }
      } else {
        SfuClient.playerStop(this.clonedVideo);
      }
    }
  }

  displayStats(stats) {
    const elem = this.statsHudRef.current;

    if (!elem) {
      return;
    }

    elem.textContent = `${stats} (${this.props.externalVideo ? "ref" : "cloned"})`;
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.props.didMount) {
      var _this$nodeRef;

      this.props.didMount((_this$nodeRef = this.nodeRef) == null ? void 0 : _this$nodeRef.current);
    }

    this.requestVideo(true);
  }

  onVisibilityChange(isVisible) {
    this.requestVideo(isVisible);
  }

  componentDidUpdate() {
    super.componentDidUpdate();

    if (this.props.didUpdate) {
      var _this$nodeRef2;

      this.props.didUpdate((_this$nodeRef2 = this.nodeRef) == null ? void 0 : _this$nodeRef2.current);
    }

    this.requestVideo();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    const peer = this.props.stream;

    if (peer && !peer.isFake) {
      this.props.stream.deregisterConsumer(this);

      if (this.props.externalVideo && peer.source) {
        const video = peer.source;

        video.onpause = () => {
          if (!video.isDestroyed) {
            video.play().catch(() => {});
          }

          delete video.onpause;
        };
      }
    }

    if (this._streamListener) {
      peer.removeChangeListener(this._streamListener);
    }

    if (this.props.willUnmount) {
      this.props.willUnmount();
    }
  }

  requestVideoBySize(w) {
    const {
      stream
    } = this.props;

    if (stream.isFake) {
      return;
    }

    if (!this.isMounted()) {
      return;
    }

    if (!stream.isLocal && !stream.isStreaming()) {
      stream.consumerGetVideo(this, CallManager2.CALL_QUALITY.NO_VIDEO);
      return;
    }

    if (this.contRef.current) {
      if (this._lastResizeWidth === w) {
        return;
      }

      this._lastResizeWidth = w;
    } else {
      this._lastResizeWidth = null;
    }

    let newQ;

    if (w > 400) {
      newQ = CallManager2.CALL_QUALITY.HIGH;
    } else if (w > 200) {
      newQ = CallManager2.CALL_QUALITY.MEDIUM;
    } else if (w > 180) {
      newQ = CallManager2.CALL_QUALITY.LOW;
    } else if (w === 0) {
      newQ = CallManager2.CALL_QUALITY.NO_VIDEO;
    } else {
      newQ = CallManager2.CALL_QUALITY.THUMB;
    }

    stream.consumerGetVideo == null ? void 0 : stream.consumerGetVideo(this, newQ);
  }

  render() {
    const {
      stream,
      mode,
      minimized,
      chatRoom,
      menu,
      className,
      simpletip,
      ephemeralAccounts,
      onClick,
      onCallMinimize,
      onSpeakerChange
    } = this.props;
    return external_React_default().createElement("div", {
      ref: this.nodeRef,
      className: `
                    stream-node
                    ${onClick ? 'clickable' : ''}
                    ${className ? className : ''}
                    ${this.state.loading ? 'loading' : ''}
                    ${simpletip ? 'simpletip' : ''}
                `,
      "data-simpletip": simpletip == null ? void 0 : simpletip.label,
      "data-simpletipposition": simpletip == null ? void 0 : simpletip.position,
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": simpletip == null ? void 0 : simpletip.className,
      onClick: () => onClick && onClick(stream)
    }, stream && external_React_default().createElement((external_React_default()).Fragment, null, menu && external_React_default().createElement(StreamNodeMenu, {
      privilege: chatRoom && chatRoom.members[stream.userHandle],
      chatRoom: chatRoom,
      stream: stream,
      ephemeralAccounts: ephemeralAccounts,
      onCallMinimize: onCallMinimize,
      onSpeakerChange: onSpeakerChange
    }), external_React_default().createElement("div", {
      className: "stream-node-content"
    }, SfuApp.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null, this.renderContent(), mode === Call.MODE.MINI || minimized ? null : this.renderStatus())));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/sidebarControls.jsx




class SidebarControls extends mixins.wl {
  constructor() {
    super();
  }

  render() {
    const {
      streams,
      view,
      sidebar,
      chatRoom,
      onChatToggle,
      onParticipantsToggle
    } = this.props;
    const SIMPLETIP = {
      position: 'left',
      offset: 5,
      className: 'theme-dark-forced'
    };
    const notifications = chatRoom.getUnreadCount();
    return external_React_default().createElement("div", {
      className: "sidebar-controls"
    }, external_React_default().createElement("ul", null, external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
      className: `
                                mega-button
                                theme-dark-forced
                                round
                                large
                                ${sidebar && view === Call.VIEW.CHAT ? 'selected' : ''}
                            `,
      simpletip: { ...SIMPLETIP,
        label: l.chats
      },
      icon: "icon-chat-filled",
      onClick: onChatToggle
    }, external_React_default().createElement("span", null, l.chats)), notifications > 0 && external_React_default().createElement("span", {
      className: "notifications-count"
    }, notifications > 9 ? '9+' : notifications)), external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
      className: `
                                mega-button
                                theme-dark-forced
                                round
                                large
                                ${sidebar && view === Call.VIEW.PARTICIPANTS ? 'selected' : ''}
                            `,
      simpletip: { ...SIMPLETIP,
        label: l[16217]
      },
      icon: "icon-contacts",
      onClick: onParticipantsToggle
    }, external_React_default().createElement("span", null, l[16217])), external_React_default().createElement("span", {
      className: "participants-count"
    }, streams + 1))));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/streamExtendedControls.jsx



class StreamExtendedControls extends mixins.wl {
  constructor(...args) {
    super(...args);

    this.isActive = type => {
      return !!(this.props.call.av & type);
    };
  }

  render() {
    const {
      onScreenSharingClick,
      onHoldClick
    } = this.props;
    const SIMPLETIP = {
      position: 'top',
      offset: 8,
      className: 'theme-dark-forced'
    };
    const screenSharingLabel = this.isActive(SfuClient.Av.Screen) ? l[22890] : l[22889];
    const callHoldLabel = this.isActive(SfuClient.Av.onHold) ? l[23459] : l[23460];
    return external_React_default().createElement(meetings_button.Z.Group, {
      active: this.isActive(SfuClient.Av.Screen)
    }, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP,
        label: screenSharingLabel
      },
      className: `
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                        ${this.isActive(SfuClient.Av.Screen) ? 'active' : ''}
                    `,
      icon: `
                        ${this.isActive(SfuClient.Av.Screen) ? 'icon-end-screenshare' : 'icon-screen-share'}
                    `,
      onClick: onScreenSharingClick
    }, external_React_default().createElement("span", null, screenSharingLabel)), external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP,
        label: callHoldLabel,
        position: 'left'
      },
      className: `
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(SfuClient.Av.onHold) ? 'active' : ''}
                    `,
      icon: this.isActive(SfuClient.Av.onHold) ? 'icon-play' : 'icon-pause',
      onClick: onHoldClick
    }, external_React_default().createElement("span", null, callHoldLabel)));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/micObserver.jsx



const withMicObserver = Component => class extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.namespace = `SO-${Component.NAMESPACE}`;
    this.signalObserver = `onMicSignalDetected.${this.namespace}`;
    this.inputObserver = `onNoMicInput.${this.namespace}`;
    this.state = {
      signal: true
    };

    this.unbindObservers = () => [this.signalObserver, this.inputObserver].map(observer => this.props.chatRoom.unbind(observer));

    this.bindObservers = () => this.props.chatRoom.rebind(this.signalObserver, ({
      data: signal
    }) => this.setState({
      signal
    })).rebind(this.inputObserver, () => this.setState({
      signal: false
    }));

    this.renderSignalDialog = () => {
      return msgDialog('warningb', null, 'Microphone not working', l.chat_mic_off_tooltip, null, 1);
    };

    this.renderSignalWarning = () => external_React_default().createElement("div", {
      className: `
                    ${this.namespace}
                    meetings-signal-issue
                    simpletip
                `,
      "data-simpletip": "Show more info",
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip-class": "theme-dark-forced",
      onClick: () => this.renderSignalDialog()
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-exclamation-filled"
    }));
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindObservers();
  }

  componentDidMount() {
    super.componentDidMount();
    this.bindObservers();
  }

  render() {
    return external_React_default().createElement(Component, (0,esm_extends.Z)({}, this.props, {
      signal: this.state.signal,
      renderSignalWarning: this.renderSignalWarning
    }));
  }

};
;// CONCATENATED MODULE: ./js/chat/ui/meetings/permissionsObserver.jsx



const withPermissionsObserver = Component => class extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.namespace = `PO-${Component.NAMESPACE}`;
    this.permissionsObserver = `onLocalMediaError.${this.namespace}`;
    this.state = {
      errAv: null
    };

    this.renderPermissionsDialog = av => {
      const CONTENT = {
        [Av.Audio]: [l.no_mic_title, l.no_mic_info],
        [Av.Camera]: [l.no_camera_title, l.no_camera_info]
      };
      return msgDialog('warningb', null, ...CONTENT[av], null, 1);
    };

    this.renderPermissionsWarning = av => external_React_default().createElement("div", {
      className: `
                    ${this.namespace}
                    meetings-signal-issue
                    simpletip
                `,
      "data-simpletip": "Show more info",
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip-class": "theme-dark-forced",
      onClick: () => this.renderPermissionsDialog(av)
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-exclamation-filled"
    }));
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.chatRoom.unbind(this.permissionsObserver);
  }

  componentDidMount() {
    super.componentDidMount();
    this.props.chatRoom.rebind(this.permissionsObserver, (e, errAv) => this.setState({
      errAv
    }));
  }

  render() {
    return external_React_default().createElement(Component, (0,esm_extends.Z)({}, this.props, {
      errAv: this.state.errAv,
      renderPermissionsWarning: this.renderPermissionsWarning
    }));
  }

};
;// CONCATENATED MODULE: ./js/chat/ui/meetings/streamControls.jsx









class StreamControls extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.endContainerRef = external_React_default().createRef();
    this.endButtonRef = external_React_default().createRef();
    this.SIMPLETIP = {
      position: 'top',
      offset: 8,
      className: 'theme-dark-forced'
    };
    this.state = {
      options: false
    };

    this.handleMousedown = ({
      target
    }) => {
      var _this$endContainerRef;

      return (_this$endContainerRef = this.endContainerRef) != null && _this$endContainerRef.current.contains(target) ? null : this.setState({
        options: false
      });
    };

    this.renderDebug = () => {
      return external_React_default().createElement("div", {
        className: "stream-debug",
        style: {
          position: 'absolute',
          left: 25,
          bottom: 36
        }
      }, external_React_default().createElement(meetings_button.Z, {
        className: "mega-button round small theme-dark-forced positive",
        simpletip: { ...this.SIMPLETIP,
          label: 'Add stream'
        },
        onClick: () => this.props.onStreamToggle(STREAM_ACTIONS.ADD)
      }, external_React_default().createElement("span", null, "Add")), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button round small theme-dark-forced negative",
        simpletip: { ...this.SIMPLETIP,
          label: 'Remove stream'
        },
        onClick: () => this.props.streams.length > 1 && this.props.onStreamToggle(STREAM_ACTIONS.REMOVE)
      }, external_React_default().createElement("span", null, "Remove")));
    };

    this.renderEndCall = () => {
      const {
        chatRoom,
        streams,
        onCallEnd
      } = this.props;
      return external_React_default().createElement("div", {
        ref: this.endContainerRef,
        className: "end-call-container"
      }, this.state.options && external_React_default().createElement("div", {
        className: "end-options theme-dark-forced"
      }, external_React_default().createElement("div", {
        className: "end-options-content"
      }, external_React_default().createElement(meetings_button.Z, {
        className: "mega-button",
        onClick: onCallEnd
      }, external_React_default().createElement("span", null, "Leave")), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button positive",
        onClick: () => chatRoom.endCallForAll()
      }, external_React_default().createElement("span", null, "End for all")))), external_React_default().createElement(meetings_button.Z, {
        simpletip: { ...this.SIMPLETIP,
          label: l[5884]
        },
        className: "mega-button theme-dark-forced round large negative end-call",
        icon: "icon-end-call",
        didMount: button => {
          this.endButtonRef = button.buttonRef;
        },
        onClick: () => chatRoom.type !== 'private' && streams.length && Call.isModerator(chatRoom, u_handle) ? this.setState(state => ({
          options: !state.options
        }), () => this.endButtonRef && $(this.endButtonRef.current).trigger('simpletipClose')) : onCallEnd()
      }, external_React_default().createElement("span", null, l[5884])));
    };
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('mousedown', this.handleMousedown);
  }

  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('mousedown', this.handleMousedown);
  }

  render() {
    const {
      call,
      signal,
      errAv,
      onAudioClick,
      onVideoClick,
      onScreenSharingClick,
      onHoldClick,
      renderSignalWarning,
      renderPermissionsWarning
    } = this.props;
    const avFlags = call.av;
    const audioLabel = avFlags & Av.Audio ? l[16214] : l[16708];
    const videoLabel = avFlags & Av.Camera ? l[22894] : l[22893];
    return external_React_default().createElement("div", {
      className: StreamControls.NAMESPACE
    }, d ? this.renderDebug() : '', external_React_default().createElement("ul", null, external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...this.SIMPLETIP,
        label: audioLabel
      },
      className: `
                                mega-button
                                theme-light-forced
                                round
                                large
                                ${avFlags & Av.onHold ? 'disabled' : ''}
                                ${avFlags & Av.Audio ? '' : 'inactive'}
                            `,
      icon: `${avFlags & Av.Audio ? 'icon-audio-filled' : 'icon-audio-off'}`,
      onClick: onAudioClick
    }, external_React_default().createElement("span", null, audioLabel)), signal ? null : renderSignalWarning(), errAv & Av.Audio ? renderPermissionsWarning(Av.Audio) : null), external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...this.SIMPLETIP,
        label: videoLabel
      },
      className: `
                                mega-button
                                theme-light-forced
                                round
                                large
                                ${avFlags & Av.onHold ? 'disabled' : ''}
                                ${avFlags & Av.Camera ? '' : 'inactive'}
                            `,
      icon: `${avFlags & Av.Camera ? 'icon-video-call-filled' : 'icon-video-off'}`,
      onClick: onVideoClick
    }, external_React_default().createElement("span", null, videoLabel)), errAv & Av.Camera ? renderPermissionsWarning(Av.Camera) : null), external_React_default().createElement("li", null, external_React_default().createElement(StreamExtendedControls, {
      call: call,
      onScreenSharingClick: onScreenSharingClick,
      onHoldClick: onHoldClick
    })), external_React_default().createElement("li", null, this.renderEndCall())));
  }

}

StreamControls.NAMESPACE = 'stream-controls';
const streamControls = ((0,mixins.qC)(withMicObserver, withPermissionsObserver)(StreamControls));
;// CONCATENATED MODULE: ./js/chat/ui/meetings/local.jsx










class Local extends mixins.wl {
  constructor(props) {
    super(props);
    this.collapseListener = null;
    this.state = {
      collapsed: false,
      ratio: undefined
    };

    this.gcd = (width, height) => {
      return height === 0 ? width : this.gcd(height, width % height);
    };

    this.getRatio = (width, height) => {
      return `${width / this.gcd(width, height)}:${height / this.gcd(width, height)}`;
    };

    this.getRatioClass = () => {
      const {
        ratio
      } = this.state;
      return ratio ? `ratio-${ratio.replace(':', '-')}` : '';
    };

    this.toggleCollapsedMode = () => {
      return this.setState(state => ({
        collapsed: !state.collapsed
      }));
    };

    this.onLoadedData = ev => {
      const {
        videoWidth,
        videoHeight
      } = ev.target;
      this.setState({
        ratio: this.getRatio(videoWidth, videoHeight)
      });
    };
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    mBroadcaster.removeListener(this.collapseListener);
  }

  componentDidMount() {
    super.componentDidMount();
    this.collapseListener = mBroadcaster.addListener('meetings:collapse', () => this.setState({
      collapsed: true
    }));
  }

  render() {
    const {
      streams,
      minimized,
      call
    } = this.props;

    if (streams.length === 0 && !minimized && !call.isSharingScreen()) {
      return null;
    }

    const STREAM_PROPS = { ...this.props,
      ratioClass: this.getRatioClass(),
      collapsed: this.state.collapsed,
      toggleCollapsedMode: this.toggleCollapsedMode,
      onLoadedData: this.onLoadedData
    };

    if (minimized) {
      return external_React_default().createElement(utils["default"].RenderTo, {
        element: document.body
      }, external_React_default().createElement(Stream, STREAM_PROPS));
    }

    return external_React_default().createElement(Stream, STREAM_PROPS);
  }

}
Local.NAMESPACE = 'local-stream';
Local.POSITION_MODIFIER = 'with-sidebar';

class Stream extends mixins.wl {
  constructor(props) {
    super(props);
    this.containerRef = external_React_default().createRef();
    this.DRAGGABLE = {
      POSITION: {
        top: undefined,
        left: undefined
      },
      OPTIONS: {
        scroll: 'false',
        cursor: 'move',
        opacity: 0.8,
        start: () => {
          if (this.state.options) {
            this.handleOptionsToggle();
          }
        },
        stop: (event, ui) => {
          this.DRAGGABLE.POSITION = ui.position;
          const {
            clientWidth,
            clientHeight
          } = document.body;
          const {
            helper
          } = ui;
          const {
            left,
            top
          } = this.DRAGGABLE.POSITION;

          if (left < clientWidth / 2) {
            helper.css('left', `${left / clientWidth * 100}%`).css('right', 'unset');
          } else {
            helper.css('left', 'unset').css('right', `${clientWidth - left - helper.width()}px`);
          }

          if (top < clientHeight / 2) {
            helper.css('top', `${top / clientHeight * 100}%`).css('bottom', 'unset');
          } else {
            helper.css('top', 'unset').css('bottom', `${clientHeight - top - helper.height()}px`);
          }
        }
      }
    };
    this.EVENTS = {
      MINIMIZE: ['slideshow:open', 'contact:open', 'textEditor:open', 'chat:open'],
      EXPAND: ['slideshow:close', 'textEditor:close']
    };
    this.LISTENERS = [];
    this.PREV_STATE = {};
    this.state = {
      options: false
    };

    this.getStreamSource = () => {
      const {
        call,
        mode,
        forcedLocal
      } = this.props;

      if (mode === Call.MODE.MINI) {
        return forcedLocal ? call.getLocalStream() : call.getActiveStream();
      }

      return call.getLocalStream();
    };

    this.unbindEvents = () => {
      const events = [...this.EVENTS.MINIMIZE, ...this.EVENTS.EXPAND];

      for (let i = events.length; i--;) {
        const event = events[i];
        mBroadcaster.removeListener(this.LISTENERS[event]);
      }

      document.removeEventListener('click', this.handleOptionsClose);
    };

    this.bindEvents = () => {
      for (let i = this.EVENTS.MINIMIZE.length; i--;) {
        const event = this.EVENTS.MINIMIZE[i];
        this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
          this.PREV_STATE.minimised = this.props.minimized;
          return this.props.onCallMinimize();
        });
      }

      for (let i = this.EVENTS.EXPAND.length; i--;) {
        const event = this.EVENTS.EXPAND[i];
        this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
          if (this.PREV_STATE.minimised) {
            delete this.PREV_STATE.minimised;
            return;
          }

          delete this.PREV_STATE.minimised;
          return this.props.view === Call.VIEW.CHAT && this.props.onCallExpand();
        });
      }

      document.addEventListener('click', this.handleOptionsClose);
    };

    this.initDraggable = () => {
      var _this$containerRef;

      const {
        minimized,
        wrapperRef
      } = this.props;
      const containerEl = (_this$containerRef = this.containerRef) == null ? void 0 : _this$containerRef.current;

      if (containerEl) {
        $(containerEl).draggable({ ...this.DRAGGABLE.OPTIONS,
          containment: minimized ? 'body' : wrapperRef == null ? void 0 : wrapperRef.current
        });
      }
    };

    this.repositionDraggable = () => {
      var _this$props$wrapperRe, _this$containerRef2;

      const wrapperEl = (_this$props$wrapperRe = this.props.wrapperRef) == null ? void 0 : _this$props$wrapperRe.current;
      const localEl = (_this$containerRef2 = this.containerRef) == null ? void 0 : _this$containerRef2.current;

      if (localEl.offsetLeft + localEl.offsetWidth > wrapperEl.offsetWidth) {
        localEl.style.left = 'auto';
      }
    };

    this.handleOptionsClose = ({
      target
    }) => {
      if (this.state.options && !target.classList.contains('icon-options')) {
        this.setState({
          options: false
        });
      }
    };

    this.handleOptionsToggle = () => this.setState({
      options: !this.state.options
    });

    this.renderOnHoldStreamNode = () => external_React_default().createElement(StreamNode, {
      stream: this.props.call.getLocalStream(),
      isCallOnHold: this.props.isOnHold,
      isLocal: true
    });

    this.renderOptionsDialog = () => {
      const {
        call,
        mode,
        forcedLocal,
        onScreenSharingClick,
        onSpeakerChange,
        onModeChange,
        toggleCollapsedMode
      } = this.props;
      const IS_SPEAKER_VIEW = mode === Call.MODE.SPEAKER && forcedLocal;
      const {
        POSITION
      } = this.DRAGGABLE;
      return external_React_default().createElement("div", {
        className: `
                     ${Local.NAMESPACE}-options
                     ${POSITION.left < 200 ? 'options-top' : ''}
                     ${POSITION.left < 200 && POSITION.top < 100 ? 'options-bottom' : ''}
                     theme-dark-forced
                 `
      }, external_React_default().createElement("ul", null, external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
        icon: "sprite-fm-mono icon-download-standard",
        onClick: () => this.setState({
          options: false
        }, () => toggleCollapsedMode())
      }, external_React_default().createElement("div", null, l.collapse_self_video))), external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
        icon: `
                                sprite-fm-mono
                                ${IS_SPEAKER_VIEW ? 'icon-thumbnail-view' : 'icon-speaker-view'}
                            `,
        onClick: () => this.setState({
          options: false
        }, () => {
          if (IS_SPEAKER_VIEW) {
            return onModeChange(Call.MODE.THUMBNAIL);
          }

          onSpeakerChange(call.getLocalStream());
          toggleCollapsedMode();
        })
      }, external_React_default().createElement("div", null, IS_SPEAKER_VIEW ? l.switch_to_thumb_view : l.display_in_main_view)))), !!(call.av & SfuClient.Av.Screen) && external_React_default().createElement("ul", {
        className: "has-separator"
      }, external_React_default().createElement("li", null, external_React_default().createElement(meetings_button.Z, {
        className: "end-screen-share",
        icon: "icon-end-screenshare",
        onClick: () => {
          this.setState({
            options: false
          });
          onScreenSharingClick();
        }
      }, external_React_default().createElement("div", null, l[22890])))));
    };

    this.renderMiniMode = () => {
      const {
        call,
        mode,
        isOnHold,
        forcedLocal,
        onLoadedData
      } = this.props;

      if (isOnHold) {
        return this.renderOnHoldStreamNode();
      }

      return external_React_default().createElement(StreamNode, {
        className: forcedLocal && !call.isSharingScreen() ? 'local-stream-mirrored' : '',
        mode: mode,
        isLocal: true,
        stream: this.getStreamSource(),
        onLoadedData: onLoadedData
      });
    };

    this.renderSelfView = () => {
      const {
        call,
        isOnHold,
        minimized,
        onLoadedData
      } = this.props;
      const {
        options
      } = this.state;

      if (isOnHold) {
        return this.renderOnHoldStreamNode();
      }

      return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(StreamNode, {
        isSelfOverlay: true,
        className: call.isSharingScreen() ? '' : 'local-stream-mirrored',
        minimized: minimized,
        stream: this.getStreamSource(),
        isLocal: true,
        onLoadedData: onLoadedData,
        localAudioMuted: !(call.av & SfuClient.Av.Audio)
      }), external_React_default().createElement("div", {
        className: `${Local.NAMESPACE}-self-overlay`
      }, external_React_default().createElement(meetings_button.Z, {
        className: `
                        mega-button
                        theme-light-forced
                        action
                        small
                        local-stream-options-control
                        ${options ? 'active' : ''}
                    `,
        icon: "sprite-fm-mono icon-options",
        onClick: () => this.handleOptionsToggle()
      }), options && this.renderOptionsDialog()));
    };
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }

  componentDidUpdate(prevProps) {
    super.componentDidUpdate();

    if (this.props.mode !== prevProps.mode) {
      this.initDraggable();
    }

    if (this.props.sidebar !== prevProps.sidebar && this.props.sidebar) {
      this.repositionDraggable();
    }
  }

  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
    this.initDraggable();
  }

  render() {
    const {
      NAMESPACE,
      POSITION_MODIFIER
    } = Local;
    const {
      mode,
      minimized,
      sidebar,
      ratioClass,
      collapsed,
      toggleCollapsedMode,
      onCallExpand
    } = this.props;
    const IS_MINI_MODE = mode === Call.MODE.MINI;

    if (collapsed) {
      return external_React_default().createElement("div", {
        ref: this.containerRef,
        className: `
                        ${NAMESPACE}
                        collapsed
                        theme-dark-forced
                        ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                    `,
        onClick: toggleCollapsedMode
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-arrow-up"
      }));
    }

    return external_React_default().createElement("div", {
      ref: this.containerRef,
      className: `
                    ${NAMESPACE}
                    ${this.getStreamSource().isStreaming() ? ratioClass : ''}
                    ${IS_MINI_MODE ? 'mini' : ''}
                    ${minimized ? 'minimized' : ''}
                    ${this.state.options ? 'active' : ''}
                    ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                `,
      onClick: ({
        target
      }) => minimized && target.classList.contains(`${NAMESPACE}-overlay`) && onCallExpand()
    }, IS_MINI_MODE && this.renderMiniMode(), !IS_MINI_MODE && this.renderSelfView(), minimized && external_React_default().createElement(__Minimized, (0,esm_extends.Z)({}, this.props, {
      onOptionsToggle: this.handleOptionsToggle
    })));
  }

}

class Minimized extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      unread: 0
    };

    this.isActive = type => {
      return this.props.call.av & type;
    };

    this.getUnread = () => {
      const {
        chatRoom
      } = this.props;
      chatRoom.rebind(Minimized.UNREAD_EVENT, () => this.setState({
        unread: chatRoom.getUnreadCount()
      }, () => this.safeForceUpdate()));
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this.getUnread();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.chatRoom.unbind(Minimized.UNREAD_EVENT);
  }

  render() {
    const {
      unread
    } = this.state;
    const {
      call,
      signal,
      errAv,
      renderSignalWarning,
      renderPermissionsWarning,
      onCallExpand,
      onCallEnd,
      onAudioClick,
      onVideoClick,
      onScreenSharingClick,
      onHoldClick
    } = this.props;
    const audioLabel = this.isActive(SfuClient.Av.Audio) ? l[16214] : l[16708];
    const videoLabel = this.isActive(SfuClient.Av.Camera) ? l[22894] : l[22893];
    const SIMPLETIP_PROPS = {
      position: 'top',
      offset: 5,
      className: 'theme-dark-forced'
    };
    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
      className: `${Local.NAMESPACE}-overlay`
    }, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: l.expand_mini_call
      },
      className: "mega-button theme-light-forced action small expand",
      icon: "sprite-fm-mono icon-fullscreen-enter",
      onClick: ev => {
        ev.stopPropagation();
        onCallExpand();
      }
    }), external_React_default().createElement("div", {
      className: `${Local.NAMESPACE}-controls`
    }, external_React_default().createElement("div", {
      className: "meetings-signal-container"
    }, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: audioLabel
      },
      className: `
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                    ${this.isActive(SfuClient.Av.Audio) ? '' : 'inactive'}
                                `,
      icon: `${this.isActive(SfuClient.Av.Audio) ? 'icon-audio-filled' : 'icon-audio-off'}`,
      onClick: ev => {
        ev.stopPropagation();
        onAudioClick();
      }
    }, external_React_default().createElement("span", null, audioLabel)), signal ? null : renderSignalWarning(), errAv & Av.Audio ? renderPermissionsWarning(Av.Audio) : null), external_React_default().createElement("div", {
      className: "meetings-signal-container"
    }, external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: videoLabel
      },
      className: `
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                    ${this.isActive(SfuClient.Av.Camera) ? '' : 'inactive'}
                                `,
      icon: `
                                    ${this.isActive(SfuClient.Av.Camera) ? 'icon-video-call-filled' : 'icon-video-off'}
                                `,
      onClick: ev => {
        ev.stopPropagation();
        onVideoClick();
      }
    }, external_React_default().createElement("span", null, videoLabel)), errAv & Av.Camera ? renderPermissionsWarning(Av.Camera) : null), external_React_default().createElement("div", {
      className: "meetings-signal-container"
    }, external_React_default().createElement(StreamExtendedControls, {
      call: call,
      errAv: errAv,
      onScreenSharingClick: onScreenSharingClick,
      onHoldClick: onHoldClick
    }), errAv & Av.Screen ? renderPermissionsWarning(Av.Screen) : null), external_React_default().createElement(meetings_button.Z, {
      simpletip: { ...SIMPLETIP_PROPS,
        label: l[5884]
      },
      className: "mega-button theme-dark-forced round large end-call",
      icon: "icon-end-call",
      onClick: ev => {
        ev.stopPropagation();
        onCallEnd();
      }
    }, external_React_default().createElement("span", null, l[5884])))), unread ? external_React_default().createElement("div", {
      className: `${Local.NAMESPACE}-notifications`
    }, external_React_default().createElement(meetings_button.Z, {
      className: "mega-button round large chat-control",
      icon: "icon-chat-filled"
    }, external_React_default().createElement("span", null, l.chats)), external_React_default().createElement("span", null, unread > 9 ? '9+' : unread)) : null);
  }

}

Minimized.NAMESPACE = 'local-stream-minimized';
Minimized.UNREAD_EVENT = 'onUnreadCountUpdate.localStreamNotifications';

const __Minimized = (0,mixins.qC)(withMicObserver, withPermissionsObserver)(Minimized);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/participantsNotice.jsx






class ParticipantsNotice extends mixins.wl {
  constructor(props) {
    super(props);

    this.renderUserAlone = () => external_React_default().createElement("div", {
      className: `
                ${ParticipantsNotice.NAMESPACE}
                theme-dark-forced
                user-alone
            `
    }, this.props.stayOnEnd ? external_React_default().createElement("div", {
      className: `${ParticipantsNotice.NAMESPACE}-heading`
    }, external_React_default().createElement("h1", null, this.props.everHadPeers ? l.only_one_here : l.waiting_for_others)) : external_React_default().createElement("div", {
      className: `${ParticipantsNotice.NAMESPACE}-content user-alone`
    }, external_React_default().createElement("h3", null, l.only_one_here), external_React_default().createElement("p", {
      className: "theme-dark-forced"
    }, external_React_default().createElement(utils.ParsedHTML, null, l.empty_call_dlg_text.replace('%s', '2'))), external_React_default().createElement("div", {
      className: "notice-footer"
    }, external_React_default().createElement(meetings_button.Z, {
      className: "mega-button large stay-on-call",
      onClick: this.props.onStayConfirm
    }, external_React_default().createElement("span", null, l.empty_call_stay_button)), external_React_default().createElement(meetings_button.Z, {
      className: "mega-button positive large stay-on-call",
      onClick: this.props.onCallEnd
    }, external_React_default().createElement("span", null, l.empty_call_dlg_end)))));

    this.renderUserWaiting = () => {
      const {
        chatRoom,
        onInviteToggle
      } = this.props;
      return external_React_default().createElement("div", {
        className: `
                    ${ParticipantsNotice.NAMESPACE}
                    ${chatRoom.isMeeting ? '' : 'user-alone'}
                    theme-dark-forced
                `
      }, external_React_default().createElement("div", {
        className: `${ParticipantsNotice.NAMESPACE}-heading`
      }, external_React_default().createElement("h1", null, l.waiting_for_others)), chatRoom.isMeeting && external_React_default().createElement("div", {
        className: `${ParticipantsNotice.NAMESPACE}-content`
      }, external_React_default().createElement("h3", null, l.copy_and_share), external_React_default().createElement("div", {
        className: "mega-input with-icon box-style"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-link"
      }), external_React_default().createElement("input", {
        type: "text",
        className: "megaInputs",
        readOnly: true,
        defaultValue: this.props.link
      })), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button positive large copy-to-clipboard",
        onClick: () => copyToClipboard(this.props.link, l[7654])
      }, external_React_default().createElement("span", null, l[17835])), Call.isModerator(chatRoom, u_handle) && external_React_default().createElement("div", {
        className: "peers-invite"
      }, external_React_default().createElement("hr", null), external_React_default().createElement(meetings_button.Z, {
        className: "mega-button action",
        onClick: onInviteToggle
      }, l.invite_from_contact_list))));
    };
  }

  specShouldComponentUpdate(newProps) {
    const {
      stayOnEnd,
      hasLeft
    } = this.props;
    return newProps.stayOnEnd !== stayOnEnd || newProps.hasLeft !== hasLeft;
  }

  render() {
    const {
      sfuApp,
      call,
      hasLeft,
      streamContainer
    } = this.props;

    if (sfuApp.isDestroyed) {
      return null;
    }

    return external_React_default().createElement((external_React_default()).Fragment, null, call.isSharingScreen() ? null : external_React_default().createElement(StreamNode, {
      className: "local-stream-mirrored",
      stream: call.getLocalStream()
    }), streamContainer(hasLeft ? this.renderUserAlone() : this.renderUserWaiting()));
  }

}
ParticipantsNotice.NAMESPACE = 'participants-notice';
// EXTERNAL MODULE: ./js/chat/ui/chatToaster.jsx
var chatToaster = __webpack_require__(142);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/stream.jsx










const STREAM_ACTIONS = {
  ADD: 1,
  REMOVE: 2
};
const MAX_STREAMS = 19;
const NAMESPACE = 'stream';
const MAX_STREAMS_PER_PAGE = 9;
const PAGINATION = {
  PREV: 1,
  NEXT: 2
};
const MOUSE_OUT_DELAY = 2500;
class stream_Stream extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.wrapperRef = external_React_default().createRef();
    this.containerRef = external_React_default().createRef();
    this.nodeRefs = [];
    this.chunks = [];
    this.chunksLength = 0;
    this.lastRescaledCache = undefined;
    this.delayProcID = null;
    this.state = {
      page: 0,
      hovered: false,
      link: undefined,
      overlayed: false
    };

    this.movePage = direction => this.setState(state => ({
      page: direction === PAGINATION.NEXT ? state.page + 1 : state.page - 1
    }));

    this.handleMouseMove = () => {
      this.setState({
        hovered: true
      });

      if (this.delayProcID) {
        delay.cancel(this.delayProcID);
        this.delayProcID = null;
      }
    };

    this.handleMouseOut = () => {
      if (this.state.hovered) {
        this.delayProcID = delay(`${NAMESPACE}-hover`, () => {
          if (this.isMounted()) {
            this.setState({
              hovered: false
            });
          }
        }, MOUSE_OUT_DELAY);
      }
    };

    this.getPublicLink = () => {
      const {
        chatRoom
      } = this.props;

      if (chatRoom && chatRoom.isMeeting) {
        chatRoom.updatePublicHandle(undefined, () => this.isMounted() ? this.setState({
          link: chatRoom.publicLink ? `${getBaseUrl()}/${chatRoom.publicLink}` : l[20660]
        }) : null);
      }

      return null;
    };

    this.getColumns = streamsCount => {
      switch (true) {
        case streamsCount === 1:
          return 1;

        case streamsCount >= 7:
          return 3;

        default:
          return 2;
      }
    };

    this.chunkNodes = (nodes, size) => {
      if (nodes && nodes.length && size) {
        const chunked = [];
        let index = 0;

        while (index < nodes.length) {
          chunked.push(nodes.slice(index, index + size));
          index += size;
        }

        return chunked;
      }

      return null;
    };

    this.scaleNodes = (columns, forced = false) => {
      const {
        streams,
        isOnHold,
        minimized,
        mode
      } = this.props;
      const container = this.containerRef.current;
      this.lastRescaledCache = forced ? null : this.lastRescaledCache;

      if (minimized || !container) {
        return;
      }

      const parentRef = container.parentNode;
      const containerWidth = parentRef.offsetWidth;
      const containerHeight = parentRef.offsetHeight - 100;
      const streamsInUI = streams.length > MAX_STREAMS_PER_PAGE ? this.chunks[this.state.page] : streams;

      if (streamsInUI) {
        const streamCountInUI = streamsInUI.length;
        let rows;

        if (mode === Call.MODE.THUMBNAIL) {
          columns = typeof columns === 'number' ? columns : this.getColumns(streamCountInUI);
          rows = Math.ceil(streamCountInUI / columns);
        } else {
          rows = 1;
          columns = 1;
        }

        let targetWidth = Math.floor(containerWidth / columns);
        let targetHeight = targetWidth / 16 * 9;

        if (targetHeight * rows > containerHeight) {
          targetHeight = Math.floor(containerHeight / rows);
          targetWidth = targetHeight / 9 * 16;
        }

        const nodeRefs = this.nodeRefs.flat();
        const nodeRefsLength = nodeRefs.length;
        const viewMode = mode || Call.MODE.SPEAKER;

        if (viewMode === Call.MODE.THUMBNAIL && columns !== 4 && (targetWidth < 160 || targetHeight < 120)) {
          return this.scaleNodes(4);
        }

        let cache = `${viewMode}:${targetWidth}:${targetHeight}:${nodeRefsLength}:${rows}:${streamCountInUI}:${columns}`;

        for (let i = 0; i < nodeRefsLength; i++) {
          cache += `${nodeRefs[i].cacheKey}:`;
        }

        if (this.lastRescaledCache === cache) {
          return;
        }

        this.lastRescaledCache = cache;

        for (let i = 0; i < nodeRefsLength; i++) {
          const node = nodeRefs[i];

          if (node && node.ref) {
            node.ref.style.width = `${targetWidth}px`;
            node.ref.style.height = `${targetHeight}px`;
          }
        }

        container.style.width = `${targetWidth * columns}px`;
      }
    };

    this.renderNodes = () => {
      const {
        mode,
        streams,
        call,
        forcedLocal,
        chatRoom,
        ephemeralAccounts,
        isOnHold,
        onCallMinimize,
        onSpeakerChange,
        onThumbnailDoubleClick
      } = this.props;

      if (mode === Call.MODE.THUMBNAIL) {
        if (streams.length <= MAX_STREAMS_PER_PAGE) {
          const $$STREAMS = [];
          streams.forEach(stream => {
            var _stream$source, _stream$source$srcObj;

            const cacheKey = (_stream$source = stream.source) == null ? void 0 : (_stream$source$srcObj = _stream$source.srcObject) == null ? void 0 : _stream$source$srcObj.id;
            $$STREAMS.push(external_React_default().createElement(StreamNode, {
              mode: mode,
              externalVideo: true,
              chatRoom: chatRoom,
              menu: true,
              ephemeralAccounts: ephemeralAccounts,
              isCallOnHold: isOnHold,
              onCallMinimize: onCallMinimize,
              onSpeakerChange: onSpeakerChange,
              onDoubleClick: (e, streamNode) => {
                e.preventDefault();
                e.stopPropagation();
                onThumbnailDoubleClick(streamNode);
              },
              key: `${mode}_${stream.clientId}_${cacheKey}`,
              stream: stream,
              didMount: ref => {
                this.nodeRefs.push({
                  clientId: stream.clientId,
                  cacheKey,
                  ref
                });
                this.scaleNodes(undefined, true);
              },
              willUnmount: () => {
                this.nodeRefs = this.nodeRefs.filter(nodeRef => nodeRef.clientId !== stream.clientId);
              }
            }));
          });
          return $$STREAMS;
        }

        const {
          page
        } = this.state;
        this.chunks = this.chunkNodes(streams, MAX_STREAMS_PER_PAGE);
        this.chunksLength = this.chunks.length;
        return external_React_default().createElement("div", {
          className: "carousel"
        }, external_React_default().createElement("div", {
          className: "carousel-container"
        }, this.chunks.map((chunk, i) => {
          return external_React_default().createElement("div", {
            key: i,
            className: `
                                        carousel-page
                                        ${i === page ? 'active' : ''}
                                    `
          }, chunk.map(stream => external_React_default().createElement(StreamNode, {
            key: stream.clientId,
            stream: stream,
            externalVideo: true,
            chatRoom: chatRoom,
            menu: true,
            ephemeralAccounts: ephemeralAccounts,
            isCallOnHold: isOnHold,
            onCallMinimize: onCallMinimize,
            onSpeakerChange: onSpeakerChange,
            didMount: ref => {
              if (!this.nodeRefs[i]) {
                this.nodeRefs[i] = [];
              }

              this.nodeRefs[i].push({
                clientId: stream.clientId,
                ref
              });
            },
            willUnmount: () => {
              this.nodeRefs = this.nodeRefs.map(chunk => chunk.filter(nodeRef => nodeRef.clientId !== stream.clientId));
            }
          })));
        })), page !== 0 && external_React_default().createElement("button", {
          className: "carousel-button-prev theme-dark-forced",
          onClick: () => this.movePage(PAGINATION.PREV)
        }, external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-arrow-left-thin"
        }), external_React_default().createElement("div", null, page + 1, "/", this.chunksLength)), page < this.chunksLength - 1 && external_React_default().createElement("button", {
          className: "carousel-button-next theme-dark-forced",
          onClick: () => this.movePage(PAGINATION.NEXT)
        }, external_React_default().createElement("i", {
          className: "sprite-fm-mono icon-arrow-right-thin"
        }), external_React_default().createElement("div", null, page + 1, "/", this.chunksLength)));
      }

      const activeStream = call.getActiveStream();
      const targetStream = forcedLocal ? call.getLocalStream() : activeStream;
      return forcedLocal || activeStream ? external_React_default().createElement(StreamNode, {
        key: targetStream.clientId,
        className: forcedLocal && !call.isSharingScreen() ? 'local-stream-mirrored' : '',
        stream: targetStream,
        externalVideo: true,
        chatRoom: chatRoom,
        menu: true,
        ephemeralAccounts: ephemeralAccounts,
        isCallOnHold: isOnHold,
        onCallMinimize: onCallMinimize
      }) : null;
    };

    this.renderOnHold = () => external_React_default().createElement("div", {
      className: "on-hold-overlay"
    }, external_React_default().createElement("div", {
      className: "stream-on-hold theme-light-forced",
      onClick: this.props.onHoldClick
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-play"
    }), external_React_default().createElement("span", null, l[23459])));

    this.renderStreamContainer = () => {
      const {
        sfuApp,
        call,
        chatRoom,
        streams,
        stayOnEnd,
        everHadPeers,
        onInviteToggle,
        onStayConfirm,
        onCallEnd
      } = this.props;

      const streamContainer = content => external_React_default().createElement("div", {
        ref: this.containerRef,
        className: `
                    ${NAMESPACE}-container
                    ${streams.length === 0 ? 'with-notice' : ''}
                `
      }, content);

      if (streams.length === 0) {
        return external_React_default().createElement(ParticipantsNotice, {
          sfuApp: sfuApp,
          call: call,
          hasLeft: call.left,
          chatRoom: chatRoom,
          everHadPeers: everHadPeers,
          streamContainer: streamContainer,
          link: this.state.link,
          stayOnEnd: stayOnEnd,
          onInviteToggle: onInviteToggle,
          onStayConfirm: onStayConfirm,
          onCallEnd: onCallEnd
        });
      }

      return streamContainer(this.renderNodes());
    };
  }

  specShouldComponentUpdate(nextProps) {
    if (nextProps.minimized !== this.props.minimized || nextProps.mode !== this.props.mode) {
      return true;
    }

    return null;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    chatGlobalEventManager.removeEventListener('resize', this.getUniqueId());
    mBroadcaster.removeListener(this.callHoldListener);
  }

  componentDidMount() {
    super.componentDidMount();
    this.getPublicLink();
    this.scaleNodes();
    chatGlobalEventManager.addEventListener('resize', this.getUniqueId(), this.scaleNodes);
    this.callHoldListener = mBroadcaster.addListener('meetings:toggleHold', () => this.scaleNodes(undefined, true));
  }

  componentDidUpdate() {
    super.componentDidMount();
    this.scaleNodes();

    if (this.chunksLength > 0 && this.state.page + 1 > this.chunksLength) {
      this.movePage(PAGINATION.PREV);
    }
  }

  render() {
    const {
      hovered,
      link,
      overlayed
    } = this.state;
    const {
      mode,
      call,
      chatRoom,
      minimized,
      streams,
      sidebar,
      forcedLocal,
      view,
      isOnHold,
      onCallMinimize,
      onCallExpand,
      onStreamToggle,
      onModeChange,
      onChatToggle,
      onParticipantsToggle,
      onAudioClick,
      onVideoClick,
      onCallEnd,
      onScreenSharingClick,
      onHoldClick,
      onSpeakerChange
    } = this.props;
    return external_React_default().createElement("div", {
      ref: this.wrapperRef,
      className: `
                    ${NAMESPACE}
                    ${sidebar ? '' : 'full'}
                    ${hovered ? 'hovered' : ''}
                `,
      onMouseMove: this.handleMouseMove,
      onMouseOut: this.handleMouseOut
    }, minimized ? null : external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(StreamHead, {
      disableCheckingVisibility: true,
      mode: mode,
      call: call,
      chatRoom: chatRoom,
      link: link,
      onCallMinimize: onCallMinimize,
      onModeChange: onModeChange
    }), isOnHold ? this.renderOnHold() : overlayed && external_React_default().createElement("div", {
      className: "call-overlay"
    }), this.renderStreamContainer(), external_React_default().createElement(streamControls, {
      call: call,
      streams: streams,
      chatRoom: chatRoom,
      onAudioClick: onAudioClick,
      onVideoClick: onVideoClick,
      onScreenSharingClick: onScreenSharingClick,
      onCallEnd: onCallEnd,
      onStreamToggle: onStreamToggle,
      onHoldClick: onHoldClick
    }), external_React_default().createElement(SidebarControls, {
      chatRoom: chatRoom,
      streams: streams.length,
      mode: mode,
      view: view,
      sidebar: sidebar,
      onChatToggle: onChatToggle,
      onParticipantsToggle: onParticipantsToggle
    })), external_React_default().createElement(chatToaster.Z, {
      showDualNotifications: true,
      hidden: minimized,
      onShownToast: t => {
        if (t.options && t.options.persistent) {
          this.setState({
            overlayed: true
          });
        }
      },
      onHideToast: t => {
        if (this.state.overlayed && t.options && t.options.persistent) {
          this.setState({
            overlayed: false
          });
        }
      }
    }), external_React_default().createElement(Local, {
      call: call,
      streams: streams,
      mode: mode,
      view: view,
      isOnHold: isOnHold,
      chatRoom: chatRoom,
      minimized: minimized,
      sidebar: sidebar,
      forcedLocal: forcedLocal,
      wrapperRef: this.wrapperRef,
      onAudioClick: onAudioClick,
      onVideoClick: onVideoClick,
      onCallEnd: onCallEnd,
      onScreenSharingClick: onScreenSharingClick,
      onCallMinimize: onCallMinimize,
      onCallExpand: async () => {
        await onCallExpand();
        this.scaleNodes(undefined, true);
      },
      onSpeakerChange: onSpeakerChange,
      onModeChange: onModeChange,
      onHoldClick: onHoldClick
    }));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/composedTextArea.jsx + 1 modules
var composedTextArea = __webpack_require__(813);
// EXTERNAL MODULE: ./js/chat/ui/historyPanel.jsx + 8 modules
var historyPanel = __webpack_require__(638);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/collapse.jsx


class Collapse extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      expanded: true
    };
  }

  render() {
    const {
      expanded
    } = this.state;
    const {
      heading,
      badge,
      children
    } = this.props;
    return external_React_default().createElement("div", {
      className: "collapse"
    }, heading && external_React_default().createElement("div", {
      className: "collapse-head",
      onClick: () => this.setState(state => ({
        expanded: !state.expanded
      }))
    }, external_React_default().createElement("i", {
      className: `
                                sprite-fm-mono
                                ${expanded ? 'icon-arrow-down' : 'icon-arrow-up'}
                            `
    }), external_React_default().createElement("h5", null, heading), badge !== undefined && badge > 0 && external_React_default().createElement("span", {
      className: "participants-count"
    }, badge)), expanded && children);
  }

}
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(285);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/participants.jsx









class Participant extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.baseIconClass = 'sprite-fm-mono';

    this.audioMuted = () => {
      const {
        call,
        stream
      } = this.props;

      if (call) {
        return !(call.av & SfuClient.Av.Audio);
      }

      return stream && stream.audioMuted;
    };

    this.videoMuted = () => {
      const {
        call,
        stream
      } = this.props;

      if (call) {
        return !(call.av & SfuClient.Av.Camera);
      }

      return stream && stream.videoMuted;
    };
  }

  render() {
    const {
      chatRoom,
      handle,
      name
    } = this.props;
    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(ui_contacts.Avatar, {
      contact: M.u[handle]
    }), external_React_default().createElement("div", {
      className: "name"
    }, external_React_default().createElement(utils.Emoji, null, handle === u_handle ? `${name} ${l.me}` : name), chatRoom.isMeeting && Call.isModerator(chatRoom, handle) && external_React_default().createElement("span", null, external_React_default().createElement("i", {
      className: `${this.baseIconClass} icon-admin`
    }))), external_React_default().createElement("div", {
      className: "status"
    }, external_React_default().createElement("i", {
      className: `
                            ${this.baseIconClass}
                            ${this.audioMuted() ? 'icon-audio-off inactive' : 'icon-audio-filled'}
                         `
    }), external_React_default().createElement("i", {
      className: `
                            ${this.baseIconClass}
                            ${this.videoMuted() ? 'icon-video-off inactive' : 'icon-video-call-filled'}
                        `
    })));
  }

}

class Participants extends mixins.wl {
  render() {
    const {
      streams,
      call,
      guest,
      chatRoom
    } = this.props;
    return external_React_default().createElement("div", {
      className: "participants"
    }, external_React_default().createElement(Collapse, (0,esm_extends.Z)({}, this.props, {
      heading: l[16217],
      badge: streams.length + 1
    }), external_React_default().createElement("div", {
      className: `
                            participants-list
                            ${guest ? 'guest' : ''}
                        `
    }, external_React_default().createElement(perfectScrollbar.F, {
      options: {
        'suppressScrollX': true
      }
    }, external_React_default().createElement("ul", null, external_React_default().createElement("li", null, external_React_default().createElement(Participant, {
      call: call,
      chatRoom: chatRoom,
      handle: u_handle,
      name: M.getNameByHandle(u_handle)
    })), streams.map((stream, i) => external_React_default().createElement("li", {
      key: `${stream.clientId}_${i}`
    }, external_React_default().createElement(Participant, {
      chatRoom: chatRoom,
      stream: stream,
      handle: stream.userHandle,
      name: stream.name
    }))))))));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/guest.jsx



class Guest extends mixins.wl {
  constructor(props) {
    super(props);
  }

  render() {
    return external_React_default().createElement("div", {
      className: "guest-register"
    }, external_React_default().createElement("div", {
      className: "guest-register-content"
    }, external_React_default().createElement(meetings_button.Z, {
      className: "close-guest-register",
      icon: "icon-close-component",
      onClick: this.props.onGuestClose
    }, external_React_default().createElement("span", null, l[148])), external_React_default().createElement("div", null, external_React_default().createElement("i", {
      className: "sprite-fm-illustration-wide registration"
    }), l.meetings_signup), external_React_default().createElement(meetings_button.Z, {
      className: "mega-button positive register-button",
      onClick: () => loadSubPage('register')
    }, l[968])));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/sidebar.jsx












class Sidebar extends mixins.wl {
  constructor(props) {
    super(props);
    this.containerRef = external_React_default().createRef();
    this.historyPanel = null;

    this.renderHead = () => {
      const {
        call,
        view,
        chatRoom,
        onSidebarClose,
        onInviteToggle
      } = this.props;
      return external_React_default().createElement("div", {
        className: "sidebar-head"
      }, external_React_default().createElement(meetings_button.Z, {
        simpletip: {
          label: l.close_sidebar,
          className: 'theme-dark-forced'
        },
        className: "mega-button action small left",
        icon: "icon-collapse-right",
        onClick: onSidebarClose
      }, external_React_default().createElement("span", null, l.close_sidebar)), view === Call.VIEW.CHAT && external_React_default().createElement("h2", null, l.chats), view !== Call.VIEW.CHAT && external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("h2", null, l[16217]), call.isPublic && !is_eplusplus && Call.isModerator(chatRoom, u_handle) && external_React_default().createElement(meetings_button.Z, {
        className: "mega-button round positive add",
        icon: "icon-add",
        onClick: onInviteToggle
      }, external_React_default().createElement("span", null, l[8007]))));
    };

    this.renderSpeakerMode = () => {
      const {
        mode,
        call,
        streams,
        guest,
        chatRoom,
        forcedLocal,
        isOnHold,
        onSpeakerChange
      } = this.props;
      const localStream = call.getLocalStream();
      const SIMPLE_TIP = {
        className: 'theme-dark-forced'
      };
      return external_React_default().createElement("div", {
        className: `
                    sidebar-streams-container
                    ${guest ? 'guest' : ''}
                `
      }, external_React_default().createElement(perfectScrollbar.F, {
        options: {
          'suppressScrollX': true
        }
      }, external_React_default().createElement(Collapse, (0,esm_extends.Z)({}, this.props, {
        heading: l[16217],
        badge: streams.length + 1
      }), external_React_default().createElement("div", {
        className: "sidebar-streams"
      }, external_React_default().createElement(StreamNode, {
        mode: mode,
        chatRoom: chatRoom,
        stream: localStream,
        isLocal: true,
        simpletip: { ...SIMPLE_TIP,
          label: l[8885]
        },
        isCallOnHold: isOnHold,
        localAudioMuted: !(call.av & SfuClient.Av.Audio),
        className: (call.isSharingScreen() ? '' : 'local-stream-mirrored') + ' ' + (forcedLocal ? 'active' : ''),
        onClick: () => {
          mBroadcaster.sendMessage('meetings:collapse');
          onSpeakerChange(localStream);
        }
      }), streams.map((stream, index) => {
        return external_React_default().createElement(StreamNode, {
          key: index,
          mode: mode,
          chatRoom: chatRoom,
          stream: stream,
          simpletip: { ...SIMPLE_TIP,
            label: M.getNameByHandle(stream.userHandle)
          },
          isCallOnHold: isOnHold,
          className: stream.isActive || stream.clientId === call.forcedActiveStream ? 'active' : '',
          onClick: onSpeakerChange
        });
      })))));
    };

    this.renderChatView = () => {
      const {
        chatRoom,
        onDeleteMessage
      } = this.props;
      return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(historyPanel.Z, {
        ref: ref => {
          this.historyPanel = ref;
        },
        chatRoom: chatRoom,
        className: "in-call",
        onDeleteClicked: onDeleteMessage
      }), external_React_default().createElement(composedTextArea.Z, {
        chatRoom: chatRoom,
        parent: this,
        containerRef: this.containerRef
      }));
    };

    this.renderParticipantsView = () => {
      const {
        call,
        streams,
        guest,
        chatRoom
      } = this.props;
      return external_React_default().createElement(Participants, {
        streams: streams,
        call: call,
        chatRoom: chatRoom,
        guest: guest
      });
    };
  }

  render() {
    const {
      mode,
      view,
      guest,
      onGuestClose
    } = this.props;
    return external_React_default().createElement("div", {
      ref: this.containerRef,
      className: `
                    sidebar
                    ${view === Call.VIEW.CHAT ? 'chat-opened' : 'theme-dark-forced'}
                `
    }, this.renderHead(), view === Call.VIEW.PARTICIPANTS && mode === Call.MODE.SPEAKER && this.renderSpeakerMode(), view === Call.VIEW.CHAT && this.renderChatView(), view === Call.VIEW.PARTICIPANTS && mode === Call.MODE.THUMBNAIL && this.renderParticipantsView(), guest && view !== Call.VIEW.CHAT && external_React_default().createElement(Guest, {
      onGuestClose: onGuestClose
    }));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/invite/search.jsx



class Search extends mixins.wl {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      value,
      placeholder,
      onChange
    } = this.props;
    return external_React_default().createElement("div", {
      className: `${Invite.NAMESPACE}-field`
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), external_React_default().createElement("input", {
      type: "text",
      autoFocus: true,
      placeholder: l[23750].replace('[X]', placeholder),
      ref: Search.inputRef,
      value: value,
      onChange: onChange
    }));
  }

}
Search.inputRef = external_React_default().createRef();

Search.focus = () => {
  return Search.inputRef && Search.inputRef.current && Search.inputRef.current.focus();
};
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/invite/footer.jsx



class Footer extends mixins.wl {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      selected,
      onClose,
      onAdd
    } = this.props;
    return external_React_default().createElement("footer", null, external_React_default().createElement("div", {
      className: "footer-container"
    }, external_React_default().createElement(meetings_button.Z, {
      className: "mega-button",
      onClick: onClose
    }, l[82]), external_React_default().createElement(meetings_button.Z, {
      className: `
                            mega-button
                            positive
                            ${selected.length > 0 ? '' : 'disabled'}
                        `,
      onClick: onAdd
    }, l.add)));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/invite/nil.jsx



class Nil extends mixins.wl {
  constructor(props) {
    super(props);
  }

  render() {
    return external_React_default().createElement("div", {
      className: `${Invite.NAMESPACE}-nil`
    }, external_React_default().createElement("div", {
      className: "fm-empty-contacts-bg"
    }), external_React_default().createElement("h2", null, HAS_CONTACTS() ? l[8674] : l[784]));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
var ui_link = __webpack_require__(941);
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/invite/invite.jsx











const HAS_CONTACTS = () => {
  const keys = M.u.keys();

  for (let i = 0; i < keys.length; i++) {
    if (M.u[keys[i]].c === 1) {
      return true;
    }
  }
};
class Invite extends mixins.wl {
  constructor(props) {
    super(props);
    this.wrapperRef = external_React_default().createRef();
    this.state = {
      loading: true,
      value: '',
      searching: false,
      contacts: [],
      contactsInitial: [],
      frequents: [],
      frequentsInitial: [],
      selected: [],
      excluded: [],
      input: false
    };

    this.getSortedContactsList = (frequents, excluded) => {
      frequents = frequents || this.state.frequents;
      excluded = excluded || this.state.excluded;
      const filteredContacts = [];
      (this.props.contacts || M.u).forEach(contact => {
        if (contact.c === 1 && !frequents.includes(contact.u) && !excluded.includes(contact.u)) {
          filteredContacts.push(contact);
        }
      });
      const sortFn = M.getSortByNameFn2(1);
      filteredContacts.sort((a, b) => sortFn(a, b));
      return filteredContacts;
    };

    this.doMatch = (value, collection) => {
      value = value.toLowerCase();
      return collection.filter(contact => {
        const name = M.getNameByHandle(contact.u || contact).toLowerCase();
        return name.includes(value);
      });
    };

    this.handleSearch = ev => {
      const {
        value
      } = ev.target;
      const searching = value.length >= 2;
      const frequents = searching ? this.doMatch(value, this.state.frequentsInitial) : this.state.frequentsInitial;
      const contacts = searching ? this.doMatch(value, this.state.contactsInitial) : this.state.contactsInitial;
      this.setState({
        value,
        searching,
        frequents,
        contacts
      }, () => {
        const wrapperRef = this.wrapperRef && this.wrapperRef.current;

        if (wrapperRef && searching) {
          wrapperRef.reinitialise();
          wrapperRef.scrollToY(0);
        }
      });
    };

    this.handleSelect = userHandle => {
      this.setState(state => ({
        selected: state.selected.includes(userHandle) ? state.selected.filter(c => c !== userHandle) : [...state.selected, userHandle]
      }), () => Search.focus());
    };

    this.handleAdd = () => {
      const {
        selected
      } = this.state;
      const {
        chatRoom,
        onClose
      } = this.props;

      if (selected.length > 0) {
        chatRoom == null ? void 0 : chatRoom.trigger('onAddUserRequest', [selected]);
        onClose == null ? void 0 : onClose();
      }
    };

    this.getFrequentContacts = () => megaChat.getFrequentContacts().then(response => {
      if (!this.isMounted()) {
        return;
      }

      const frequents = [];
      const maxFreq = Math.max(response.length - ui_contacts.MAX_FREQUENTS, 0);

      for (let i = response.length - 1; i >= maxFreq; i--) {
        const contact = response[i];

        if (!this.state.excluded.includes(contact.userId)) {
          frequents.push(contact.userId);
        }
      }

      this.setState({
        frequents,
        frequentsInitial: frequents,
        contacts: this.getSortedContactsList(frequents),
        loading: false
      });
    });

    this.getFilteredFrequents = () => {
      const {
        frequents,
        selected,
        searching
      } = this.state;

      if (frequents.length === 0) {
        return false;
      }

      return frequents.map(userHandle => {
        return external_React_default().createElement(ui_contacts.ContactCard, {
          key: userHandle,
          contact: M.u[userHandle],
          chatRoom: false,
          className: `
                        contacts-search
                        short
                        ${selected.includes(userHandle) ? 'selected' : ''}
                    `,
          noContextButton: true,
          noContextMenu: true,
          selectable: true,
          onClick: () => this.handleSelect(userHandle)
        });
      });
    };

    this.getFilteredContacts = () => {
      const {
        contacts,
        frequents,
        excluded,
        selected,
        searching
      } = this.state;
      const $$CONTACTS = [];

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const {
          u: userHandle
        } = contact;

        if (!frequents.includes(userHandle) && !excluded.includes(userHandle)) {
          $$CONTACTS.push(external_React_default().createElement(ui_contacts.ContactCard, {
            key: userHandle,
            contact: contact,
            chatRoom: false,
            className: `
                            contacts-search
                            short
                            ${selected.includes(userHandle) ? 'selected' : ''}
                        `,
            noContextButton: true,
            noContextMenu: true,
            selectable: true,
            onClick: () => this.handleSelect(userHandle)
          }));
        }
      }

      return $$CONTACTS.length === 0 && searching ? external_React_default().createElement(Nil, null) : $$CONTACTS;
    };

    this.renderContent = () => {
      var frequentContacts = this.getFilteredFrequents();

      if (HAS_CONTACTS()) {
        const {
          contacts,
          frequents
        } = this.state;

        const $$RESULT_TABLE = (header, children) => external_React_default().createElement("div", {
          className: "contacts-search-subsection"
        }, external_React_default().createElement("div", {
          className: "contacts-list-header"
        }, header), external_React_default().createElement("div", {
          className: "contacts-search-list"
        }, children));

        if (frequents.length === 0 && contacts.length === 0) {
          return external_React_default().createElement(Nil, null);
        }

        return external_React_default().createElement(perfectScrollbar.F, {
          ref: this.wrapperRef,
          options: {
            'suppressScrollX': true
          }
        }, frequentContacts ? $$RESULT_TABLE(l[20141], frequentContacts) : '', $$RESULT_TABLE(l[165], this.getFilteredContacts()));
      }

      return external_React_default().createElement(Nil, null);
    };

    this.renderLoading = () => {
      return external_React_default().createElement("div", {
        className: `${Invite.NAMESPACE}-loading`
      }, external_React_default().createElement("h2", null, "Loading"));
    };

    this.getPublicLink = () => {
      const {
        chatRoom
      } = this.props;

      if (chatRoom && chatRoom.isMeeting) {
        chatRoom.updatePublicHandle(undefined, () => {
          if (this.isMounted()) {
            this.setState({
              link: chatRoom.publicLink ? `${getBaseUrl()}/${chatRoom.publicLink}` : l[20660]
            });
          }
        });
      }
    };

    this.state.excluded = this.props.chatRoom ? this.props.chatRoom.getParticipantsExceptMe() : [];
    this.state.contacts = this.state.contactsInitial = this.getSortedContactsList();
  }

  componentDidMount() {
    super.componentDidMount();
    this.getFrequentContacts();
    this.getPublicLink();
  }

  render() {
    const {
      NAMESPACE
    } = Invite;
    const {
      link,
      value,
      loading,
      frequents,
      contacts,
      selected,
      field
    } = this.state;
    const {
      chatRoom,
      onClose
    } = this.props;
    const IS_MEETING = chatRoom && chatRoom.isMeeting;
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      name: NAMESPACE,
      className: `
                    ${NAMESPACE}
                    dialog-template-tool
                `,
      hideOverlay: true,
      onClose: onClose
    }), external_React_default().createElement("div", {
      className: `${NAMESPACE}-head`
    }, external_React_default().createElement("h2", null, IS_MEETING ? l.invite_participants : l[8726]), IS_MEETING && external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("p", null, l.copy_and_share), external_React_default().createElement("div", {
      className: "link-input-container"
    }, external_React_default().createElement(meetings_button.Z, {
      className: "mega-button large positive",
      onClick: () => link && copyToClipboard(link, 'Done!'),
      disabled: !link
    }, !link ? l[7006] : l[1394]), external_React_default().createElement(ui_link.Z, {
      className: "view-link-control",
      field: field,
      onClick: () => this.setState({
        field: !field
      })
    }, field ? l.collapse_meeting_link : l.expand_meeting_link, external_React_default().createElement("i", {
      className: `sprite-fm-mono ${field ? 'icon-arrow-up' : 'icon-arrow-down'}`
    })), field && link && external_React_default().createElement("div", {
      className: "chat-link-input"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-link"
    }), external_React_default().createElement("input", {
      type: "text",
      readOnly: true,
      value: link
    })))), HAS_CONTACTS() && external_React_default().createElement(Search, {
      value: value,
      contacts: contacts,
      placeholder: contacts.length + frequents.length,
      onChange: this.handleSearch
    })), external_React_default().createElement("div", {
      className: "fm-dialog-body"
    }, external_React_default().createElement("div", {
      className: `${NAMESPACE}-contacts`
    }, loading ? this.renderLoading() : this.renderContent())), external_React_default().createElement(Footer, {
      selected: selected,
      onAdd: this.handleAdd,
      onClose: onClose
    }));
  }

}
Invite.NAMESPACE = 'invite-meeting';
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/end.jsx





class End extends mixins.wl {
  constructor(props) {
    super(props);
    this.buttons = [{
      key: 'cancel',
      label: 'Cancel',
      onClick: this.props.onClose
    }, {
      key: 'leave',
      label: 'Leave call',
      className: 'negative',
      onClick: () => this.props.sfuApp.destroy()
    }];
    this.state = {
      contacts: false
    };

    this.toggleContacts = () => this.setState({
      contacts: !this.state.contacts
    });
  }

  render() {
    const {
      NAMESPACE
    } = End;
    const {
      contacts
    } = this.state;
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, (0,esm_extends.Z)({}, this.state, {
      name: NAMESPACE,
      dialogType: "message",
      icon: "sprite-fm-uni icon-question",
      title: "Please choose if you want ot end the call for all participants or just you",
      buttons: this.buttons,
      noCloseOnClickOutside: true,
      onClose: this.props.onClose
    }), external_React_default().createElement((external_React_default()).Fragment, null, "If you want to keep this call open with full function, please assign a new moderator. \xA0", external_React_default().createElement(ui_link.Z, {
      onClick: this.toggleContacts
    }, "Assign new moderator"), contacts && null));
  }

}
End.NAMESPACE = 'end-dialog';
;// CONCATENATED MODULE: ./js/chat/ui/meetings/workflow/ephemeral.jsx




class Ephemeral extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.buttons = [{
      key: 'ok',
      label: 'Ok',
      onClick: this.props.onClose
    }];
  }

  render() {
    const {
      ephemeralAccounts,
      onClose
    } = this.props;
    const ephemeralAccount = ephemeralAccounts && ephemeralAccounts[ephemeralAccounts.length - 1];
    const ephemeralName = M.getNameByHandle(ephemeralAccount);
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, {
      name: Ephemeral.NAMESPACE,
      dialogType: "message",
      icon: "sprite-fm-uni icon-info",
      title: external_React_default().createElement(utils.Emoji, null, ephemeralName),
      noCloseOnClickOutside: true,
      buttons: this.buttons,
      onClose: onClose
    }, external_React_default().createElement("p", null, l.ephemeral_info));
  }

}
Ephemeral.NAMESPACE = 'ephemeral-dialog';
;// CONCATENATED MODULE: ./js/chat/ui/meetings/offline.jsx



class Offline extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.buttons = [{
      key: 'ok',
      label: l[82],
      onClick: this.props.onClose
    }, {
      key: 'leave',
      label: l[5883],
      className: 'negative',
      onClick: this.props.onCallEnd
    }];
  }

  render() {
    return external_React_default().createElement(modalDialogs.Z.ModalDialog, {
      name: Offline.NAMESPACE,
      dialogType: "message",
      icon: "sprite-fm-uni icon-warning",
      title: "No internet",
      noCloseOnClickOutside: true,
      buttons: this.buttons,
      onClose: this.props.onClose
    }, external_React_default().createElement("p", null, "Please check your network cables, modem, and router and try reconnecting to Wi-Fi."));
  }

}
Offline.NAMESPACE = 'reconnect-dialog';
;// CONCATENATED MODULE: ./js/chat/ui/meetings/call.jsx









const EXPANDED_FLAG = 'in-call';
const inProgressAlert = isJoin => {
  return new Promise((resolve, reject) => {
    if (megaChat.haveAnyActiveCall()) {
      if (window.sfuClient) {
        const {
          chatRoom
        } = megaChat.activeCall;
        const peers = chatRoom ? chatRoom.getParticipantsExceptMe(chatRoom.getCallParticipants()).map(h => M.getNameByHandle(h)) : [];
        let body = isJoin ? l.cancel_to_join : l.cancel_to_start;

        if (peers.length) {
          body = mega.utils.trans.listToString(peers, isJoin ? l.cancel_with_to_join : l.cancel_with_to_start);
        }

        msgDialog('warningb', null, l.call_in_progress, body, null, 1);
        return reject();
      }

      return msgDialog(`warningb:!^${l[2005]}!${isJoin ? l.join_call_anyway : l.start_call_anyway}`, null, isJoin ? l.join_multiple_calls_title : l.start_multiple_calls_title, isJoin ? l.join_multiple_calls_text : l.start_multiple_calls_text, join => {
        if (join) {
          return resolve();
        }

        return reject();
      }, 1);
    }

    resolve();
  });
};
class Call extends mixins.wl {
  constructor(props) {
    super(props);
    this.ephemeralAddListener = null;
    this.state = {
      mode: undefined,
      view: Call.VIEW.PARTICIPANTS,
      sidebar: true,
      forcedLocal: false,
      invite: false,
      end: false,
      ephemeral: false,
      offline: false,
      ephemeralAccounts: [],
      stayOnEnd: !!mega.config.get('callemptytout'),
      everHadPeers: false,
      guest: Call.isGuest()
    };

    this.handleRetryTimeout = () => {
      if (!navigator.onLine) {
        this.handleCallEnd();
        this.props.chatRoom.trigger('onRetryTimeout');
        ion.sound.play('end_call');
      }
    };

    this.handleCallOffline = () => delay('callOffline', () => navigator.onLine ? null : this.setState({
      offline: true
    }), 3e4);

    this.handleCallOnline = () => this.setState({
      offline: false
    });

    this.customIsEventuallyVisible = () => true;

    this.bindCallEvents = () => {
      const {
        chatRoom
      } = this.props;
      chatRoom.rebind('onCallPeerLeft.callComp', () => {
        const {
          minimized,
          streams,
          call
        } = this.props;

        if (minimized) {
          this.setState({
            mode: streams.length === 0 ? Call.MODE.THUMBNAIL : Call.MODE.MINI
          }, () => {
            call.setViewMode(this.state.mode);
          });

          if (call.peers.length === 0) {
            this.showTimeoutDialog();
          }
        } else if (this.state.mode === Call.MODE.SPEAKER && call.forcedActiveStream && !streams[call.forcedActiveStream]) {
          this.setState({
            mode: Call.MODE.THUMBNAIL
          }, () => {
            call.setViewMode(this.state.mode);
          });
        }
      });
      chatRoom.rebind('onCallPeerJoined.callComp', () => {
        const {
          minimized,
          streams,
          call
        } = this.props;

        if (minimized) {
          this.setState({
            mode: streams.length === 0 ? Call.MODE.THUMBNAIL : Call.MODE.MINI
          }, () => {
            call.setViewMode(this.state.mode);
          });
        }

        if (this.state.stayOnEnd !== !!mega.config.get('callemptytout')) {
          this.setState({
            stayOnEnd: !!mega.config.get('callemptytout')
          });
        }

        if (!this.state.everHadPeers) {
          this.setState({
            everHadPeers: true
          });
        }

        if (this.callStartTimeout) {
          clearTimeout(this.callStartTimeout);
          delete this.callStartTimeout;
        }
      });
      chatRoom.rebind('onCallEnd.callComp', () => this.props.minimized && this.props.onCallEnd());
    };

    this.unbindCallEvents = () => ['onCallPeerLeft.callComp', 'onCallPeerJoined.callComp', 'onCallEnd.callComp'].map(event => this.props.chatRoom.off(event));

    this.handleCallMinimize = () => {
      const {
        call,
        streams,
        onCallMinimize
      } = this.props;
      const {
        mode,
        sidebar,
        view,
        stayOnEnd
      } = this.state;
      Call.STATE.PREVIOUS = mode !== Call.MODE.MINI ? {
        mode,
        sidebar,
        view
      } : Call.STATE.PREVIOUS;

      const noPeers = () => {
        onCallMinimize();

        if (typeof call.callToutId !== 'undefined' && !stayOnEnd) {
          this.showTimeoutDialog();
        }
      };

      return streams.length > 0 ? this.setState({
        mode: Call.MODE.MINI,
        sidebar: false
      }, () => {
        onCallMinimize();
        call.setViewMode(Call.MODE.MINI);
      }) : noPeers();
    };

    this.handleCallExpand = async () => {
      return new Promise(resolve => {
        this.setState({ ...Call.STATE.PREVIOUS
        }, () => {
          this.props.onCallExpand();
          resolve();
        });
      });
    };

    this.handleStreamToggle = action => {
      const {
        streams
      } = this.props;

      if (action === STREAM_ACTIONS.ADD && streams.length === MAX_STREAMS) {
        return;
      }

      return action === STREAM_ACTIONS.ADD ? streams.addFakeDupStream() : streams.removeFakeDupStream();
    };

    this.handleSpeakerChange = streamNode => {
      if (streamNode) {
        this.handleModeChange(Call.MODE.SPEAKER);
        this.props.call.setForcedActiveStream(streamNode.clientId);
        this.setState({
          forcedLocal: streamNode.isLocal
        });
      }
    };

    this.handleModeChange = mode => {
      this.props.call.setViewMode(mode);
      this.setState({
        mode,
        sidebar: true,
        view: mode === Call.MODE.THUMBNAIL || mode === Call.MODE.SPEAKER ? Call.VIEW.PARTICIPANTS : this.state.view,
        forcedLocal: false
      });
    };

    this.handleChatToggle = () => {
      if (this.state.sidebar && this.state.view === Call.VIEW.CHAT) {
        return this.setState({ ...Call.STATE.DEFAULT
        });
      }

      return this.setState({
        sidebar: true,
        view: Call.VIEW.CHAT
      });
    };

    this.handleParticipantsToggle = () => {
      if (this.state.sidebar && this.state.view === Call.VIEW.CHAT) {
        return this.setState({
          sidebar: true,
          view: Call.VIEW.PARTICIPANTS
        });
      }

      return this.setState({
        sidebar: !this.state.sidebar,
        view: Call.VIEW.PARTICIPANTS
      });
    };

    this.handleInviteToggle = () => this.setState({
      invite: !this.state.invite
    });

    this.handleHoldToggle = async () => {
      await this.props.call.toggleHold();
      mBroadcaster.sendMessage('meetings:toggleHold');
    };

    this.handleScreenSharingToggle = () => {
      const {
        call
      } = this.props;
      const userAgent = navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./);
      const version = parseInt(userAgent[2], 10);

      if (version === 92) {
        return msgDialog('info', undefined, l[47], l.chrome_screensharing);
      }

      return call.toggleScreenSharing();
    };

    this.handleCallEnd = () => {
      var _this$props$chatRoom, _this$props$chatRoom$;

      return (_this$props$chatRoom = this.props.chatRoom) == null ? void 0 : (_this$props$chatRoom$ = _this$props$chatRoom.sfuApp) == null ? void 0 : _this$props$chatRoom$.destroy();
    };

    this.handleEphemeralAdd = handle => handle && this.setState(state => ({
      ephemeral: true,
      ephemeralAccounts: [...state.ephemeralAccounts, handle]
    }));

    this.handleStayConfirm = () => {
      this.setState({
        stayOnEnd: true
      });
      this.props.call.initCallTimeout(true);
    };

    this.state.mode = props.call.viewMode;
    this.state.sidebar = props.chatRoom.type === 'public';
  }

  showTimeoutDialog() {
    msgDialog(`warninga:!^${l.empty_call_dlg_end}!${l.empty_call_stay_button}`, 'stay-on-call', l.empty_call_dlg_title, l.empty_call_dlg_text.replace('%s', '02:00'), res => {
      if (res === null) {
        return;
      }

      return res ? this.handleStayConfirm() : this.handleCallEnd();
    }, 1);
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this.props.willUnmount) {
      this.props.willUnmount(this.props.minimized);
    }

    if (this.ephemeralAddListener) {
      mBroadcaster.removeListener(this.ephemeralAddListener);
    }

    window.removeEventListener('offline', this.handleCallOffline);
    window.removeEventListener('online', this.handleCallOnline);
    this.unbindCallEvents();

    if (this.callStartTimeout) {
      clearTimeout(this.callStartTimeout);
    }
  }

  componentDidMount() {
    super.componentDidMount();

    if (this.props.didMount) {
      this.props.didMount();
    }

    this.ephemeralAddListener = mBroadcaster.addListener('meetings:ephemeralAdd', handle => this.handleEphemeralAdd(handle));
    window.addEventListener('offline', this.handleCallOffline);
    window.addEventListener('online', this.handleCallOnline);
    this.bindCallEvents();
    ['reconnecting', 'end_call'].map(sound => ion.sound.preload(sound));
    this.callStartTimeout = setTimeout(() => {
      const {
        call
      } = this.props;

      if (!mega.config.get('callemptytout') && !call.peers.length) {
        call.left = true;
        call.initCallTimeout();

        if (!Call.isExpanded()) {
          this.showTimeoutDialog();
        }
      }

      delete this.callStartTimeout;
    }, 300000);
    setTimeout(() => {
      if (this.props.call.peers.length) {
        this.setState({
          everHadPeers: true
        });
      }
    }, 2000);
  }

  render() {
    const {
      minimized,
      streams,
      call,
      chatRoom,
      parent,
      sfuApp,
      onDeleteMessage
    } = this.props;
    const {
      mode,
      view,
      sidebar,
      forcedLocal,
      invite,
      end,
      ephemeral,
      ephemeralAccounts,
      guest,
      offline,
      stayOnEnd,
      everHadPeers
    } = this.state;
    const STREAM_PROPS = {
      mode,
      streams,
      sidebar,
      forcedLocal,
      call,
      view,
      chatRoom,
      parent,
      stayOnEnd,
      everHadPeers,
      isOnHold: sfuApp.sfuClient.isOnHold(),
      onSpeakerChange: this.handleSpeakerChange,
      onInviteToggle: this.handleInviteToggle,
      onStayConfirm: this.handleStayConfirm
    };
    return external_React_default().createElement("div", {
      className: `meetings-call ${minimized ? 'minimized' : ''}`
    }, external_React_default().createElement(stream_Stream, (0,esm_extends.Z)({}, STREAM_PROPS, {
      sfuApp: sfuApp,
      minimized: minimized,
      ephemeralAccounts: ephemeralAccounts,
      onCallMinimize: this.handleCallMinimize,
      onCallExpand: this.handleCallExpand,
      onCallEnd: this.handleCallEnd,
      onStreamToggle: this.handleStreamToggle,
      onModeChange: this.handleModeChange,
      onChatToggle: this.handleChatToggle,
      onParticipantsToggle: this.handleParticipantsToggle,
      onAudioClick: () => call.toggleAudio(),
      onVideoClick: () => call.toggleVideo(),
      onScreenSharingClick: this.handleScreenSharingToggle,
      onHoldClick: this.handleHoldToggle,
      onThumbnailDoubleClick: streamNode => this.handleSpeakerChange(streamNode)
    })), sidebar && external_React_default().createElement(Sidebar, (0,esm_extends.Z)({}, STREAM_PROPS, {
      guest: guest,
      onGuestClose: () => this.setState({
        guest: false
      }),
      onSidebarClose: () => this.setState({ ...Call.STATE.DEFAULT
      }),
      onDeleteMessage: onDeleteMessage
    })), invite && external_React_default().createElement(Invite, {
      contacts: M.u,
      chatRoom: chatRoom,
      onClose: () => this.setState({
        invite: false
      })
    }), end && external_React_default().createElement(End, {
      sfuApp: sfuApp,
      onClose: () => this.setState({
        end: false
      })
    }), ephemeral && external_React_default().createElement(Ephemeral, {
      ephemeralAccounts: ephemeralAccounts,
      onClose: () => this.setState({
        ephemeral: false
      })
    }), offline && external_React_default().createElement(Offline, {
      onClose: () => {
        this.setState({
          offline: false
        }, () => delay('call:timeout', this.handleRetryTimeout, 3e4));
      },
      onCallEnd: this.handleRetryTimeout
    }));
  }

}
Call.TYPE = {
  AUDIO: 1,
  VIDEO: 2
};
Call.MODE = {
  THUMBNAIL: 1,
  SPEAKER: 2,
  MINI: 3
};
Call.VIEW = {
  DEFAULT: 0,
  CHAT: 1,
  PARTICIPANTS: 2
};
Call.STATE = {
  DEFAULT: {
    sidebar: false
  },
  PREVIOUS: {
    mode: null,
    sidebar: null,
    view: null
  }
};

Call.isGuest = () => !u_type;

Call.isModerator = (chatRoom, handle) => {
  if (chatRoom && handle) {
    return chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.FULL;
  }

  return false;
};

Call.isExpanded = () => document.body.classList.contains(EXPANDED_FLAG);

/***/ }),

/***/ 336:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"default": () => (Incoming)
});
var _extends6__ = __webpack_require__(462);
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);
var _contacts_jsx2__ = __webpack_require__(13);
var _ui_modalDialogs_jsx3__ = __webpack_require__(904);
var _button_jsx4__ = __webpack_require__(193);
var _ui_utils_jsx5__ = __webpack_require__(79);







class Incoming extends _mixins1__.wl {
  constructor(props) {
    super(props);
    this.state = {
      video: false,
      hoveredSwitch: true
    };

    this.renderSwitchControls = () => {
      const className = `mega-button large round switch ${this.state.hoveredSwitch ? 'hovered' : ''}`;

      const toggleHover = () => this.setState(state => ({
        hoveredSwitch: !state.hoveredSwitch
      }));

      return react0().createElement("div", {
        className: "switch-button"
      }, react0().createElement("div", {
        className: "switch-button-container simpletip",
        "data-simpletip": l.end_and_answer,
        "data-simpletipposition": "top",
        onMouseEnter: toggleHover,
        onMouseLeave: toggleHover,
        onClick: ev => {
          ev.stopPropagation();
          this.props.onSwitch();
        }
      }, react0().createElement(_button_jsx4__.Z, {
        className: `${className} negative`,
        icon: "icon-end-call"
      }), react0().createElement(_button_jsx4__.Z, {
        className: `${className} positive`,
        icon: "icon-phone"
      })));
    };

    this.renderAnswerControls = () => {
      const {
        video
      } = this.state;
      const {
        onAnswer,
        onToggleVideo
      } = this.props;
      return react0().createElement((react0().Fragment), null, react0().createElement(_button_jsx4__.Z, {
        className: "mega-button positive answer",
        icon: "icon-phone",
        simpletip: {
          position: 'top',
          label: l[7205]
        },
        onClick: onAnswer
      }, react0().createElement("span", null, l[7205])), react0().createElement(_button_jsx4__.Z, {
        className: `
                        mega-button
                        large
                        round
                        video
                        ${video ? '' : 'negative'}
                    `,
        icon: video ? 'icon-video-call-filled' : 'icon-video-off',
        simpletip: {
          position: 'top',
          label: video ? l[22894] : l[22893]
        },
        onClick: () => this.setState({
          video: !video
        }, () => onToggleVideo(video))
      }, react0().createElement("span", null, video ? l[22894] : l[22893])));
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this._old$dialog = $.dialog;
    $.dialog = "chat-incoming-call";
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    $.dialog = this._old$dialog;
  }

  render() {
    const {
      chatRoom
    } = this.props;

    if (chatRoom) {
      const {
        callerId,
        onClose,
        onReject
      } = this.props;
      const {
        NAMESPACE
      } = Incoming;
      const CALL_IN_PROGRESS = window.sfuClient;
      const isPrivateRoom = chatRoom.type === 'private';
      const rejectLabel = isPrivateRoom ? l[20981] : l[82];
      return react0().createElement(_ui_modalDialogs_jsx3__.Z.ModalDialog, (0,_extends6__.Z)({}, this.state, {
        name: NAMESPACE,
        className: NAMESPACE,
        noCloseOnClickOutside: true,
        onClose: () => onClose()
      }), react0().createElement("div", {
        className: "fm-dialog-body"
      }, react0().createElement("div", {
        className: `${NAMESPACE}-avatar`
      }, react0().createElement(_contacts_jsx2__.Avatar, {
        contact: M.u[callerId]
      })), react0().createElement("div", {
        className: `${NAMESPACE}-info`
      }, react0().createElement("h1", null, react0().createElement(_ui_utils_jsx5__.Emoji, null, chatRoom.getRoomTitle())), react0().createElement("span", null, isPrivateRoom ? l[17878] : l[19995])), react0().createElement("div", {
        className: `
                                ${NAMESPACE}-controls
                                ${CALL_IN_PROGRESS ? 'call-in-progress' : ''}
                            `
      }, react0().createElement(_button_jsx4__.Z, {
        className: "mega-button large round negative",
        icon: "icon-end-call",
        simpletip: {
          position: 'top',
          label: rejectLabel
        },
        onClick: onReject
      }, react0().createElement("span", null, rejectLabel)), CALL_IN_PROGRESS ? this.renderSwitchControls() : this.renderAnswerControls())));
    }

    console.error('Incoming dialog received missing chatRoom prop.');
    return null;
  }

}
Incoming.NAMESPACE = 'incoming-dialog';
window.ChatCallIncomingDialog = Incoming;

/***/ }),

/***/ 98:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (GenericConversationMessage)
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(462);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
var mixin = __webpack_require__(416);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(13);
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
;// CONCATENATED MODULE: ./js/chat/ui/messages/abstractGenericMessage.jsx




class AbstractGenericMessage extends mixin.y {
  constructor(props) {
    super(props);
  }

  getAvatar() {
    const contact = this.getContact() || Message.getContactForMessage(this.props.message);

    if (this.props.grouped) {
      return null;
    }

    return contact ? external_React_default().createElement(ui_contacts.Avatar, {
      contact: this.getContact(),
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: this.props.chatRoom
    }) : null;
  }

  getName() {
    const contact = this.getContact() || Message.getContactForMessage(this.props.message);

    if (this.props.grouped) {
      return null;
    }

    return contact ? external_React_default().createElement(ui_contacts.ContactButton, {
      contact: contact,
      className: "message",
      label: external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(contact.u)),
      chatRoom: this.props.message.chatRoom,
      dropdownDisabled: !!this.props.dialog
    }) : null;
  }

  renderMessageActionButtons(buttons) {
    if (!buttons) {
      return null;
    }

    const cnt = buttons.length;

    if (cnt === 0) {
      return null;
    }

    return external_React_default().createElement("div", {
      className: `right-aligned-msg-buttons ${cnt && cnt > 1 ? `total-${cnt}` : ''}`
    }, buttons);
  }

  render() {
    const {
      message,
      grouped,
      additionalClasses,
      hideActionButtons
    } = this.props;

    if (message.deleted) {
      return null;
    }

    return external_React_default().createElement("div", {
      "data-id": message.messageId,
      className: `
                    ${this.getClassNames ? this.getClassNames() : grouped ? 'grouped' : ''}
                    ${additionalClasses}
                    ${message.messageId}
                    message
                    body
                `
    }, this.getAvatar && this.getAvatar(), external_React_default().createElement("div", {
      className: "message content-area"
    }, this.getName && this.getName(), this.getMessageTimestamp ? this.getMessageTimestamp() : grouped ? null : external_React_default().createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString()), !hideActionButtons && this.getMessageActionButtons && this.renderMessageActionButtons(this.getMessageActionButtons()), this.getContents && this.getContents(), hideActionButtons ? null : this.getEmojisImages()));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/messages/utils.jsx
var messages_utils = __webpack_require__(504);
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/local.jsx





const MESSAGE_TYPE = {
  OUTGOING: 'outgoing-call',
  INCOMING: 'incoming-call',
  TIMEOUT: 'call-timeout',
  STARTING: 'call-starting',
  FEEDBACK: 'call-feedback',
  INITIALISING: 'call-initialising',
  ENDED: 'call-ended',
  ENDED_REMOTE: 'remoteCallEnded',
  FAILED: 'call-failed',
  FAILED_MEDIA: 'call-failed-media',
  HANDLED_ELSEWHERE: 'call-handled-elsewhere',
  MISSED: 'call-missed',
  REJECTED: 'call-rejected',
  CANCELLED: 'call-canceled',
  STARTED: 'call-started',
  STARTED_REMOTE: 'remoteCallStarted',
  ALTER_PARTICIPANTS: 'alterParticipants',
  PRIVILEGE_CHANGE: 'privilegeChange',
  TRUNCATED: 'truncated'
};
class Local extends AbstractGenericMessage {
  constructor(props) {
    super(props);

    this._roomIsGroup = () => this.props.message.chatRoom.type === 'group' || this.props.message.chatRoom.type === 'public';

    this._getParticipantNames = message => message.meta && message.meta.participants && !!message.meta.participants.length && message.meta.participants.map(handle => `[[${megaChat.html(M.getNameByHandle(handle))}]]`);

    this._getExtraInfo = message => {
      const {
        meta,
        type
      } = message;

      const participantNames = this._getParticipantNames(message);

      const HAS_PARTICIPANTS = participantNames && !!participantNames.length && participantNames.length > 1;
      const HAS_DURATION = meta && meta.duration;
      const ENDED = type === MESSAGE_TYPE.ENDED || type === MESSAGE_TYPE.FAILED || type === MESSAGE_TYPE.CANCELLED;
      let messageExtraInfo = [HAS_PARTICIPANTS ? mega.utils.trans.listToString(participantNames, l[20234]) : ''];

      if (ENDED) {
        messageExtraInfo = [...messageExtraInfo, HAS_PARTICIPANTS ? '. ' : '', HAS_DURATION ? l[7208].replace('[X]', `[[${secToDuration(meta.duration)}]]`) : ''];
      }

      return messageExtraInfo && messageExtraInfo.reduce((acc, cur) => (acc + cur).replace(/\[\[/g, '<span class="bold">').replace(/]]/g, '</span>'));
    };
  }

  componentDidMount() {
    super.componentDidMount();

    this._setClassNames();
  }

  _setClassNames() {
    let cssClass;

    switch (this.props.message.type) {
      case MESSAGE_TYPE.REJECTED:
        cssClass = 'sprite-fm-theme icon-handset-rejected';
        break;

      case MESSAGE_TYPE.MISSED:
        cssClass = 'sprite-fm-theme icon-handset-missed';
        break;

      case MESSAGE_TYPE.OUTGOING:
      case MESSAGE_TYPE.HANDLED_ELSEWHERE:
        cssClass = 'sprite-fm-theme icon-handset-outgoing';
        break;

      case MESSAGE_TYPE.FAILED:
      case MESSAGE_TYPE.FAILED_MEDIA:
        cssClass = 'sprite-fm-theme icon-handset-failed';
        break;

      case MESSAGE_TYPE.ENDED:
      case MESSAGE_TYPE.TIMEOUT:
        cssClass = 'sprite-fm-theme icon-handset-ended';
        break;

      case MESSAGE_TYPE.CANCELLED:
        cssClass = 'sprite-fm-theme icon-handset-cancelled';
        break;

      case MESSAGE_TYPE.FEEDBACK:
      case MESSAGE_TYPE.STARTING:
      case MESSAGE_TYPE.STARTED:
        cssClass = 'sprite-fm-mono icon-phone';
        break;

      case MESSAGE_TYPE.INCOMING:
        cssClass = 'sprite-fm-theme icon-handset-incoming';
        break;

      default:
        cssClass = 'sprite-fm-mono ' + this.props.message.type;
        break;
    }

    this.props.message.cssClass = cssClass;
  }

  _getIcon(message) {
    const MESSAGE_ICONS = {
      [MESSAGE_TYPE.STARTED]: `<i class="${"call-info-icon"} sprite-fm-mono icon-phone">&nbsp;</i>`,
      [MESSAGE_TYPE.ENDED]: `<i class="${"call-info-icon"} sprite-fm-theme icon-handset-ended">&nbsp;</i>`,
      DEFAULT: `<i class="${"call-info-icon"} ${message.cssClass}">&nbsp;</i>`
    };
    return MESSAGE_ICONS[message.type] || MESSAGE_ICONS.DEFAULT;
  }

  _getText() {
    const {
      message
    } = this.props;

    const IS_GROUP = this._roomIsGroup();

    let messageText = (0,messages_utils.l)(message.type, IS_GROUP);

    if (!messageText) {
      return console.error(`Message with type: ${message.type} -- no text string defined. Message: ${message}`);
    }

    messageText = CallManager2._getMltiStrTxtCntsForMsg(message, messageText.splice ? messageText : [messageText], true);
    message.textContents = String(messageText).replace("[[", "<span class=\"bold\">").replace("]]", "</span>");

    if (IS_GROUP) {
      messageText = `
                ${this._getIcon(message)}
                <div class="call-info-content">
                    <span class="call-info-message bold">${messageText}</span>
                    ${this._getExtraInfo(message)}
                </div>
            `;
    }

    return messageText;
  }

  _getAvatarsListing() {
    const {
      message
    } = this.props;

    if (this._roomIsGroup() && message.type === MESSAGE_TYPE.STARTED && message.messageId === `${MESSAGE_TYPE.STARTED}-${message.chatRoom.getActiveCallMessageId()}`) {
      const unique = message.chatRoom.uniqueCallParts ? Object.keys(message.chatRoom.uniqueCallParts) : [];
      return unique.map(handle => external_React_default().createElement(ui_contacts.Avatar, {
        key: handle,
        contact: M.u[handle],
        simpletip: handle in M.u && M.u[handle].name,
        className: "message avatar-wrapper small-rounded-avatar"
      }));
    }

    return null;
  }

  _getButtons() {
    const {
      message
    } = this.props;

    if (message.buttons && Object.keys(message.buttons).length) {
      return external_React_default().createElement("div", {
        className: "buttons-block"
      }, Object.keys(message.buttons).map(key => {
        const button = message.buttons[key];
        return external_React_default().createElement("button", {
          key: key,
          className: button.classes,
          onClick: e => button.callback(e.target)
        }, button.icon && external_React_default().createElement("div", null, external_React_default().createElement("i", {
          className: `small-icon ${button.icon}`
        })), external_React_default().createElement("span", null, button.text));
      }), external_React_default().createElement("div", {
        className: "clear"
      }));
    }
  }

  getAvatar() {
    const {
      message,
      grouped
    } = this.props;

    if (message.type === MESSAGE_TYPE.FEEDBACK) {
      return null;
    }

    const $$AVATAR = external_React_default().createElement(ui_contacts.Avatar, {
      contact: message.authorContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: message.chatRoom
    });
    const $$ICON = external_React_default().createElement("div", {
      className: "feedback call-status-block"
    }, external_React_default().createElement("i", {
      className: `sprite-fm-mono ${message.cssClass}`
    }));
    return message.showInitiatorAvatar ? grouped ? null : $$AVATAR : $$ICON;
  }

  getMessageTimestamp() {
    var _this$props$message, _this$props$message$m;

    const callId = (_this$props$message = this.props.message) == null ? void 0 : (_this$props$message$m = _this$props$message.meta) == null ? void 0 : _this$props$message$m.callId;
    let debugMsg = "";

    if (d && callId) {
      debugMsg = `: callId: ${callId}`;
    }

    return external_React_default().createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString(), debugMsg);
  }

  getClassNames() {
    const {
      message: {
        showInitiatorAvatar,
        type
      },
      grouped
    } = this.props;
    const classNames = [showInitiatorAvatar && grouped && 'grouped', this._roomIsGroup() && type !== MESSAGE_TYPE.OUTGOING && type !== MESSAGE_TYPE.INCOMING && 'with-border'];
    return classNames.filter(className => className).join(' ');
  }

  getName() {
    const {
      message,
      grouped
    } = this.props;
    const contact = this.getContact();
    return message.showInitiatorAvatar && !grouped ? external_React_default().createElement(ui_contacts.ContactButton, {
      contact: contact,
      className: "message",
      label: external_React_default().createElement(utils.Emoji, null, message.authorContact ? M.getNameByHandle(message.authorContact.u) : ''),
      chatRoom: message.chatRoom
    }) : M.getNameByHandle(contact.u);
  }

  getContents() {
    const {
      message: {
        getState
      }
    } = this.props;
    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
      className: "message text-block"
    }, external_React_default().createElement("div", {
      className: "message call-inner-block"
    }, external_React_default().createElement("div", {
      className: "call-info"
    }, external_React_default().createElement("div", {
      className: "call-info-container"
    }, external_React_default().createElement(utils.ParsedHTML, {
      className: "info-wrapper"
    }, this._getText())), external_React_default().createElement("div", {
      className: "call-info-avatars"
    }, this._getAvatarsListing(), external_React_default().createElement("div", {
      className: "clear"
    }))))), getState && getState() === Message.STATE.NOT_SENT ? null : this._getButtons());
  }

}
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var dropdowns = __webpack_require__(78);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
var buttons = __webpack_require__(204);
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/contact.jsx






class Contact extends AbstractGenericMessage {
  constructor(props) {
    super(props);
    this.DIALOG = {
      ADDED: addedEmail => msgDialog('info', l[150], l[5898].replace('[X]', addedEmail)),
      DUPLICATE: () => msgDialog('warningb', '', l[17545])
    };

    this._doAddContact = contactEmail => M.inviteContact(M.u[u_handle] ? M.u[u_handle].m : u_attr.email, contactEmail);

    this._handleAddContact = contactEmail => {
      var _this$props$chatRoom;

      if ((_this$props$chatRoom = this.props.chatRoom) != null && _this$props$chatRoom.isAnonymous()) {
        return this._doAddContact(contactEmail).done(addedEmail => this.DIALOG.ADDED(addedEmail)).catch(this.DIALOG.DUPLICATE);
      }

      return Object.values(M.opc).some(opc => opc.m === contactEmail) ? this.DIALOG.DUPLICATE() : this._doAddContact(contactEmail).done(addedEmail => this.DIALOG.ADDED(addedEmail));
    };

    this._getContactAvatar = (contact, className) => external_React_default().createElement(ui_contacts.Avatar, {
      className: `avatar-wrapper ${className}`,
      contact: M.u[contact.u],
      chatRoom: this.props.chatRoom
    });
  }

  _getContactDeleteButton(message) {
    if (message.userId === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT) {
      return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-dialog-close",
        label: l[83],
        onClick: e => this.props.onDelete(e, message)
      }));
    }
  }

  _getContactCard(message, contact, contactEmail) {
    const HAS_RELATIONSHIP = M.u[contact.u].c === 1;
    let name = external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(contact.u));
    const {
      chatRoom
    } = this.props;
    const isAnonView = chatRoom.isAnonymous();

    if (megaChat.FORCE_EMAIL_LOADING) {
      name += "(" + contact.m + ")";
    }

    return external_React_default().createElement(buttons.Button, {
      className: "tiny-button",
      icon: "tiny-icon icons-sprite grey-dots"
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "white-context-menu shared-contact-dropdown",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      horizOffset: 4
    }, external_React_default().createElement("div", {
      className: "dropdown-avatar rounded"
    }, this._getContactAvatar(contact, 'context-avatar'), !isAnonView ? external_React_default().createElement("div", {
      className: "dropdown-user-name"
    }, external_React_default().createElement("div", {
      className: "name"
    }, HAS_RELATIONSHIP && (this.isLoadingContactInfo() ? external_React_default().createElement("em", {
      className: "contact-name-loading"
    }) : name), !HAS_RELATIONSHIP && name, external_React_default().createElement(ui_contacts.ContactPresence, {
      className: "small",
      contact: contact
    })), external_React_default().createElement("div", {
      className: "email"
    }, M.u[contact.u].m)) : external_React_default().createElement("div", {
      className: "dropdown-user-name"
    })), external_React_default().createElement(ui_contacts.ContactFingerprint, {
      contact: M.u[contact.u]
    }), HAS_RELATIONSHIP && external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-user-filled",
      label: l[5868],
      onClick: () => {
        loadSubPage("fm/chat/contacts/" + contact.u);
        mBroadcaster.sendMessage('contact:open');
      }
    }), external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-chat-filled",
      label: l[8632],
      onClick: () => {
        loadSubPage("fm/chat/p/" + contact.u);
        mBroadcaster.sendMessage('chat:open');
      }
    })), u_type && u_type > 2 && contact.u !== u_handle && !HAS_RELATIONSHIP && !is_eplusplus && external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-add",
      label: l[71],
      onClick: () => this._handleAddContact(contactEmail)
    }), this._getContactDeleteButton(message)));
  }

  getContents() {
    const {
      message,
      chatRoom
    } = this.props;
    const textContents = message.textContents.substr(2, message.textContents.length);
    const attachmentMeta = JSON.parse(textContents);
    const isAnonView = chatRoom.isAnonymous();

    if (!attachmentMeta) {
      return console.error(`Message w/ type: ${message.type} -- no attachment meta defined. Message: ${message}`);
    }

    let contacts = [];
    attachmentMeta.forEach(v => {
      const contact = M.u && v.u in M.u ? M.u[v.u] : v;
      const contactEmail = contact.email ? contact.email : contact.m;

      if (!M.u[contact.u]) {
        M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, {
          'u': contact.u,
          'name': contact.name,
          'm': contact.email ? contact.email : contactEmail,
          'c': undefined
        }));
      } else if (M.u[contact.u] && !M.u[contact.u].m) {
        M.u[contact.u].m = contact.email ? contact.email : contactEmail;
      }

      contacts = [...contacts, external_React_default().createElement("div", {
        key: contact.u
      }, !isAnonView ? external_React_default().createElement("div", {
        className: "message shared-info"
      }, external_React_default().createElement("div", {
        className: "message data-title"
      }, external_React_default().createElement(utils.Emoji, null, M.getNameByHandle(contact.u))), M.u[contact.u] ? external_React_default().createElement(ui_contacts.ContactVerified, {
        className: "right-align",
        contact: M.u[contact.u]
      }) : null, external_React_default().createElement("div", {
        className: "user-card-email"
      }, contactEmail)) : external_React_default().createElement("div", {
        className: "message shared-info"
      }), external_React_default().createElement("div", {
        className: "message shared-data"
      }, external_React_default().createElement("div", {
        className: "data-block-view semi-big"
      }, M.u[contact.u] ? external_React_default().createElement(ui_contacts.ContactPresence, {
        className: "small",
        contact: M.u[contact.u]
      }) : null, this._getContactCard(message, contact, contactEmail), this._getContactAvatar(contact, 'medium-avatar')), external_React_default().createElement("div", {
        className: "clear"
      })))];
    });
    return external_React_default().createElement("div", {
      className: "message shared-block"
    }, contacts);
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/attachment.jsx




class Attachment extends AbstractGenericMessage {
  constructor(...args) {
    super(...args);

    this._isRevoked = node => !M.chd[node.ch] || node.revoked;
  }

  _isUserRegistered() {
    return typeof u_type !== 'undefined' && u_type > 2;
  }

  getContents() {
    const {
      message,
      chatRoom
    } = this.props;
    const contact = this.getContact();
    let NODE_DOESNT_EXISTS_ANYMORE = {};
    let attachmentMeta = message.getAttachmentMeta() || [];
    let files = [];

    for (let i = 0; i < attachmentMeta.length; i++) {
      let v = attachmentMeta[i];

      if (this._isRevoked(v)) {
        continue;
      }

      const {
        icon,
        isImage,
        isVideo,
        isAudio,
        isText,
        showThumbnail,
        isPreviewable
      } = M.getMediaProperties(v);
      var dropdown = null;
      var noThumbPrev = '';
      var previewButton = null;

      if (isPreviewable) {
        if (!showThumbnail) {
          noThumbPrev = 'no-thumb-prev';
        }

        var previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
        var previewIcon = isAudio ? 'icon-play' : isVideo ? 'icon-video-call-filled' : 'icon-preview-reveal';

        if (isText) {
          previewLabel = l[16797];
          previewIcon = "icon-file-edit";
        }

        previewButton = external_React_default().createElement("span", {
          key: "previewButton"
        }, external_React_default().createElement(dropdowns.DropdownItem, {
          label: previewLabel,
          icon: `sprite-fm-mono ${previewIcon}`,
          disabled: mega.paywall,
          onClick: e => this.props.onPreviewStart(v, e)
        }));
      }

      if (contact.u === u_handle) {
        dropdown = external_React_default().createElement(buttons.Button, {
          className: "tiny-button",
          icon: "tiny-icon icons-sprite grey-dots"
        }, external_React_default().createElement(dropdowns.Dropdown, {
          ref: refObj => {
            this.dropdown = refObj;
          },
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left top",
          positionAt: "left bottom",
          horizOffset: -4,
          vertOffset: 3,
          onBeforeActiveChange: newState => {
            if (newState === true) {
              this.forceUpdate();
            }
          },
          dropdownItemGenerator: dd => {
            var linkButtons = [];
            var firstGroupOfButtons = [];
            var revokeButton = null;
            var downloadButton = null;

            if (message.isEditable && message.isEditable()) {
              revokeButton = external_React_default().createElement(dropdowns.DropdownItem, {
                icon: "sprite-fm-mono icon-dialog-close",
                label: l[83],
                onClick: () => {
                  chatRoom.megaChat.plugins.chatdIntegration.updateMessage(chatRoom, message.internalId || message.orderValue, "");
                }
              });
            }

            if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
              dbfetch.acquire(v.h).always(() => {
                if (!M.d[v.h]) {
                  NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                  dd.doRerender();
                } else {
                  dd.doRerender();
                }
              });
              return external_React_default().createElement("span", {
                className: "loading"
              }, l[5533]);
            } else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
              downloadButton = external_React_default().createElement(dropdowns.DropdownItem, {
                icon: "sprite-fm-mono icon-download-small",
                label: l[1187],
                disabled: mega.paywall,
                onClick: () => this.props.onDownloadStart(v)
              });

              if (M.getNodeRoot(v.h) !== M.RubbishID) {
                this.props.onAddLinkButtons(v.h, linkButtons);
              }

              firstGroupOfButtons.push(external_React_default().createElement(dropdowns.DropdownItem, {
                icon: "sprite-fm-mono icon-info",
                label: l[6859],
                key: "infoDialog",
                onClick: () => {
                  $.selected = [v.h];
                  propertiesDialog();
                }
              }));
              this.props.onAddFavouriteButtons(v.h, firstGroupOfButtons);
              linkButtons.push(external_React_default().createElement(dropdowns.DropdownItem, {
                icon: "sprite-fm-mono icon-send-to-chat",
                label: l[17764],
                key: "sendToChat",
                disabled: mega.paywall,
                onClick: () => {
                  $.selected = [v.h];
                  openCopyDialog('conversations');
                }
              }));
            }

            if (!previewButton && firstGroupOfButtons.length === 0 && !downloadButton && linkButtons.length === 0 && !revokeButton) {
              return null;
            }

            if (previewButton && (firstGroupOfButtons.length > 0 || downloadButton || linkButtons.length > 0 || revokeButton)) {
              previewButton = [previewButton, external_React_default().createElement("hr", {
                key: "preview-sep"
              })];
            }

            return external_React_default().createElement("div", null, previewButton, firstGroupOfButtons, firstGroupOfButtons.length > 0 ? external_React_default().createElement("hr", null) : "", downloadButton, linkButtons, revokeButton && downloadButton ? external_React_default().createElement("hr", null) : "", revokeButton);
          }
        }));
      } else {
        dropdown = external_React_default().createElement(buttons.Button, {
          className: "tiny-button",
          icon: "tiny-icon icons-sprite grey-dots"
        }, external_React_default().createElement(dropdowns.Dropdown, {
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left top",
          positionAt: "left bottom",
          horizOffset: -4,
          vertOffset: 3
        }, previewButton, previewButton && external_React_default().createElement("hr", null), external_React_default().createElement(dropdowns.DropdownItem, {
          icon: "sprite-fm-mono icon-download-small",
          label: l[1187],
          disabled: mega.paywall,
          onClick: () => this.props.onDownloadStart(v)
        }), this._isUserRegistered() && external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(dropdowns.DropdownItem, {
          icon: "sprite-fm-mono icon-cloud",
          label: l[1988],
          disabled: mega.paywall,
          onClick: () => this.props.onAddToCloudDrive(v, false)
        }), external_React_default().createElement(dropdowns.DropdownItem, {
          icon: "sprite-fm-mono icon-send-to-chat",
          label: l[17764],
          disabled: mega.paywall,
          onClick: () => this.props.onAddToCloudDrive(v, true)
        }))));
      }

      if (M.getNodeShare(v.h).down) {
        dropdown = null;
      }

      var preview = external_React_default().createElement("div", {
        className: "data-block-view medium " + noThumbPrev,
        onClick: ({
          target,
          currentTarget
        }) => {
          if (isPreviewable && target === currentTarget) {
            this.props.onPreviewStart(v);
          }
        }
      }, dropdown, external_React_default().createElement("div", {
        className: "data-block-bg"
      }, external_React_default().createElement("div", {
        className: "block-view-file-type " + icon
      })));

      if (showThumbnail) {
        var src = v.src || window.noThumbURI || '';
        var thumbClass = v.src ? '' : " no-thumb";
        var thumbOverlay = null;

        if (isImage) {
          thumbClass += " image";
          thumbOverlay = external_React_default().createElement("div", {
            className: "thumb-overlay",
            onClick: () => this.props.onPreviewStart(v)
          });
        } else {
          thumbClass = thumbClass + " video " + (isPreviewable ? " previewable" : "non-previewable");
          thumbOverlay = external_React_default().createElement("div", {
            className: "thumb-overlay",
            onClick: () => isPreviewable && this.props.onPreviewStart(v)
          }, isPreviewable && external_React_default().createElement("div", {
            className: "thumb-overlay-play"
          }, external_React_default().createElement("div", {
            className: "thumb-overlay-circle"
          }, external_React_default().createElement("i", {
            className: "sprite-fm-mono icon-play"
          }))), external_React_default().createElement("div", {
            className: "video-thumb-details"
          }, v.playtime && external_React_default().createElement("i", {
            className: "sprite-fm-mono icon-play"
          }), external_React_default().createElement("span", null, secondsToTimeShort(v.playtime || -1))));
        }

        preview = src ? external_React_default().createElement("div", {
          id: v.ch,
          className: `shared-link thumb ${thumbClass}`
        }, thumbOverlay, dropdown, external_React_default().createElement("img", {
          alt: "",
          className: "thumbnail-placeholder " + v.h,
          src: src,
          key: 'thumb-' + v.ch,
          onClick: () => isPreviewable && this.props.onPreviewStart(v)
        })) : preview;
      }

      files.push(external_React_default().createElement("div", {
        className: "message shared-data",
        key: 'atch-' + v.ch
      }, external_React_default().createElement("div", {
        className: "message shared-info"
      }, external_React_default().createElement("div", {
        className: "message data-title"
      }, l[17669], external_React_default().createElement("span", {
        className: "file-name"
      }, v.name)), external_React_default().createElement("div", {
        className: "message file-size"
      }, bytesToSize(v.s))), preview, external_React_default().createElement("div", {
        className: "clear"
      })));
    }

    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement("div", {
      className: "message shared-block"
    }, files));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/audioPlayer.jsx

class AudioPlayer extends (external_React_default()).Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTime: null,
      progressWidth: 0,
      isBeingPlayed: false,
      isPaused: false
    };

    this.play = () => {
      const audio = this.audioEl;

      if (audio.paused) {
        const result = audio.play();

        if (result instanceof Promise) {
          result.catch(ex => {
            if (ex.name !== 'AbortError') {
              console.error(ex);
            }
          });
        }

        const audios = document.getElementsByClassName('audio-player__player');
        Array.prototype.filter.call(audios, audioElement => audioElement.id !== this.props.audioId).forEach(audioElement => {
          if (!audioElement.paused) {
            audioElement.pause();
          }
        });
        this.setState({
          isPaused: false
        });
      } else {
        audio.pause();
        this.setState({
          isPaused: true
        });
      }
    };

    this.handleOnPause = () => this.setState({
      isPaused: true
    });

    this.handleOnPlaying = () => this.setState({
      isBeingPlayed: true
    });

    this.handleOnTimeUpdate = () => {
      const {
        currentTime,
        duration
      } = this.audioEl;
      this.setState({
        currentTime: secondsToTimeShort(currentTime),
        progressWidth: currentTime / duration * 100
      });
    };

    this.handleOnEnded = () => this.setState({
      progressWidth: 0,
      isBeingPlayed: false,
      currentTime: 0
    });

    this.handleOnMouseDown = event => {
      event.preventDefault();
      const self = this;
      const sliderPin = this.sliderPin;
      const slider = this.slider;
      const shiftX = event.clientX - sliderPin.getBoundingClientRect().left;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      function onMouseMove(event) {
        let newLeft = event.clientX - shiftX - slider.getBoundingClientRect().left;

        if (newLeft < 0) {
          newLeft = 0;
        }

        let rightEdge = slider.offsetWidth - sliderPin.offsetWidth;

        if (newLeft > rightEdge) {
          newLeft = rightEdge;
        }

        sliderPin.style.left = `${newLeft}px`;
        const pinPosition = newLeft / slider.getBoundingClientRect().width;
        const newTime = Math.ceil(self.props.playtime * pinPosition);
        const newCurrentTime = secondsToTimeShort(newTime);
        self.audioEl.currentTime = newTime;
        self.setState({
          currentTime: newCurrentTime,
          progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
        });
      }

      function onMouseUp() {
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
      }

      sliderPin.ondragstart = () => false;
    };
  }

  render() {
    const {
      source,
      audioId,
      loading,
      playtime
    } = this.props;
    const {
      progressWidth,
      isBeingPlayed,
      isPaused,
      currentTime
    } = this.state;
    let playtimeStyles = null;

    if (isBeingPlayed) {
      playtimeStyles = {
        color: 'var(--secondary-red)'
      };
    }

    let btnClass = 'icon-pause';

    if (!isBeingPlayed || isPaused) {
      btnClass = 'icon-play';
    }

    let controls = external_React_default().createElement("span", {
      onClick: () => {
        this.play();

        if (this.props.source === null) {
          this.props.getAudioFile();
        }
      }
    }, external_React_default().createElement("i", {
      className: `sprite-fm-mono ${btnClass}`
    }));

    if (loading) {
      controls = external_React_default().createElement("div", {
        className: "small-blue-spinner audio-player__spinner"
      });
    }

    return external_React_default().createElement("div", {
      className: "audio-player"
    }, controls, external_React_default().createElement("div", {
      className: "slider",
      ref: slider => {
        this.slider = slider;
      }
    }, external_React_default().createElement("div", {
      className: "slider__progress",
      style: {
        width: `${progressWidth}%`
      }
    }), external_React_default().createElement("div", {
      className: "slider__progress__pin",
      style: {
        left: `${progressWidth}%`
      },
      ref: sliderPin => {
        this.sliderPin = sliderPin;
      },
      onMouseDown: this.handleOnMouseDown
    })), external_React_default().createElement("span", {
      className: "audio-player__time",
      style: playtimeStyles
    }, currentTime ? currentTime : secondsToTimeShort(playtime)), external_React_default().createElement("audio", {
      src: source,
      className: "audio-player__player",
      id: audioId,
      ref: audio => {
        this.audioEl = audio;
      },
      onPlaying: this.handleOnPlaying,
      onPause: this.handleOnPause,
      onEnded: this.handleOnEnded,
      onTimeUpdate: this.handleOnTimeUpdate
    }));
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/audioContainer.jsx


class AudioContainer extends (external_React_default()).Component {
  constructor(props) {
    super(props);
    this.state = {
      audioBlobUrl: null,
      loading: false
    };

    this.getAudioFile = () => {
      const {
        mime,
        h
      } = this.props;
      this.setState({
        loading: true
      });

      if (mime !== 'audio/mp4') {
        if (d) {
          console.warn('cannot play this file type (%s)', mime, h, [this]);
        }

        return false;
      }

      M.gfsfetch(h, 0, -1).then(({
        buffer
      }) => {
        this.setState(() => {
          return {
            audioBlobUrl: mObjectURL([buffer], 'audio/mp4'),
            loading: false
          };
        });
      }).catch(ex => {
        console.error(ex);
      });
      return true;
    };
  }

  componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }

    URL.revokeObjectURL(this.state.audioBlobUrl);
  }

  render() {
    const {
      audioBlobUrl,
      loading
    } = this.state;
    const {
      playtime,
      mime,
      audioId
    } = this.props;
    return external_React_default().createElement("div", {
      className: "audio-container"
    }, external_React_default().createElement(AudioPlayer, {
      source: audioBlobUrl ? audioBlobUrl : null,
      audioId: audioId,
      loading: loading,
      mime: mime,
      getAudioFile: this.getAudioFile,
      playtime: playtime
    }));
  }

}
AudioContainer.defaultProps = {
  h: null,
  mime: null
};
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/voiceClip.jsx





const voiceClip_MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 3600;
class VoiceClip extends AbstractGenericMessage {
  constructor(props) {
    super(props);
  }

  _getActionButtons() {
    const {
      message
    } = this.props;
    const contact = this.getContact();
    const iAmSender = contact && contact.u === u_handle;
    const stillEditable = unixtime() - message.delay < voiceClip_MESSAGE_NOT_EDITABLE_TIMEOUT;
    const isBeingEdited = this.props.isBeingEdited() === true;
    const chatIsReadOnly = this.props.chatRoom.isReadOnly() === true;

    if (iAmSender && stillEditable && !isBeingEdited && !chatIsReadOnly && !this.props.dialog) {
      return external_React_default().createElement(buttons.Button, {
        className: "tiny-button",
        icon: "tiny-icon icons-sprite grey-dots"
      }, external_React_default().createElement(dropdowns.Dropdown, {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono icon-dialog-close",
        label: l[1730],
        onClick: e => this.props.onDelete(e, message)
      })));
    }

    return null;
  }

  _getAudioContainer() {
    const {
      message
    } = this.props;
    const attachmentMeta = message.getAttachmentMeta();

    if (attachmentMeta && attachmentMeta.length) {
      return attachmentMeta.map(voiceClip => external_React_default().createElement(AudioContainer, {
        key: voiceClip.h,
        h: voiceClip.h,
        mime: voiceClip.mime,
        playtime: voiceClip.playtime,
        audioId: `vm${message.messageId}`
      }));
    }
  }

  getContents() {
    return external_React_default().createElement((external_React_default()).Fragment, null, this.props.message.getState() === Message.STATE.NOT_SENT ? null : this._getActionButtons(), this._getAudioContainer());
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreview.jsx
var React = __webpack_require__(363);

var ConversationMessageMixin = (__webpack_require__(416).y);

var MetaRichPreviewLoading = (__webpack_require__(480).F);

class MetaRichpreview extends ConversationMessageMixin {
  getBase64Url(b64incoming) {
    if (!b64incoming || !b64incoming.split) {
      return;
    }

    var exti = b64incoming.split(":");
    var b64i = exti[1];
    exti = exti[0];
    return "data:image/" + exti + ";base64," + b64i;
  }

  render() {
    var self = this;
    var message = this.props.message;
    var output = [];
    var metas = message.meta && message.meta.extra ? message.meta.extra : [];
    var failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 300;
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

      var previewContainer;

      if (isLoading) {
        previewContainer = React.createElement(MetaRichPreviewLoading, {
          message: message,
          isLoading: message.meta.isLoading
        });
      } else {
        var domainName = meta.url;
        domainName = domainName.replace("https://", "").replace("http://", "").split("/")[0];
        previewContainer = React.createElement("div", {
          className: "message richpreview body"
        }, meta.i ? React.createElement("div", {
          className: "message richpreview img-wrapper"
        }, React.createElement("div", {
          className: "message richpreview preview",
          style: previewCss
        })) : undefined, React.createElement("div", {
          className: "message richpreview inner-wrapper"
        }, React.createElement("div", {
          className: "message richpreview data-title"
        }, React.createElement("span", {
          className: "message richpreview title"
        }, meta.t)), React.createElement("div", {
          className: "message richpreview desc"
        }, ellipsis(meta.d, 'end', 82)), React.createElement("div", {
          className: "message richpreview url-container"
        }, meta.ic ? React.createElement("span", {
          className: "message richpreview url-favicon"
        }, React.createElement("img", {
          src: self.getBase64Url(meta.ic),
          width: 16,
          height: 16,
          onError: e => {
            e.target.parentNode.removeChild(e.target);
          },
          alt: ""
        })) : "", React.createElement("span", {
          className: "message richpreview url"
        }, domainName))));
      }

      output.push(React.createElement("div", {
        key: meta.url,
        className: "message richpreview container " + (meta.i ? "have-preview" : "no-preview") + " " + (meta.d ? "have-description" : "no-description") + " " + (isLoading ? "is-loading" : "done-loading"),
        onClick: function (url) {
          if (!message.meta.isLoading) {
            window.open(url, "_blank", 'noopener,noreferrer');
          }
        }.bind(this, meta.url)
      }, previewContainer, React.createElement("div", {
        className: "clear"
      })));
    }

    return React.createElement("div", {
      className: "message richpreview previews-container"
    }, output);
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreviewConfirmation.jsx
var metaRichpreviewConfirmation_React = __webpack_require__(363);

var metaRichpreviewConfirmation_ConversationMessageMixin = (__webpack_require__(416).y);

class MetaRichprevConfirmation extends metaRichpreviewConfirmation_ConversationMessageMixin {
  doAllow() {
    var message = this.props.message;
    var megaChat = this.props.message.chatRoom.megaChat;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoConfirm();
    megaChat.plugins.richpreviewsFilter.processMessage({}, message);
    message.trackDataChange();
  }

  doNotNow() {
    var message = this.props.message;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoNotNow();
    message.trackDataChange();
  }

  doNever() {
    var message = this.props.message;
    msgDialog('confirmation', l[870], l[18687], '', function (e) {
      if (e) {
        delete message.meta.requiresConfirmation;
        RichpreviewsFilter.confirmationDoNever();
        message.trackDataChange();
      }
    });
  }

  render() {
    var self = this;
    var notNowButton = null;
    var neverButton = null;

    if (RichpreviewsFilter.confirmationCount >= 2) {
      neverButton = metaRichpreviewConfirmation_React.createElement("button", {
        className: "mega-button right negative",
        onClick: function () {
          self.doNever();
        }
      }, metaRichpreviewConfirmation_React.createElement("span", null, l[1051]));
    }

    notNowButton = metaRichpreviewConfirmation_React.createElement("button", {
      className: "mega-button right",
      onClick: function () {
        self.doNotNow();
      }
    }, metaRichpreviewConfirmation_React.createElement("span", null, l[18682]));
    return metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview previews-container"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview container confirmation"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview body"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview img-wrapper"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: " message richpreview preview-confirmation sprite-fm-illustration img-chat-url-preview "
    })), metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview inner-wrapper"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview data-title"
    }, metaRichpreviewConfirmation_React.createElement("span", {
      className: "message richpreview title"
    }, l[18679])), metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview desc"
    }, l[18680])), metaRichpreviewConfirmation_React.createElement("div", {
      className: "buttons-block"
    }, metaRichpreviewConfirmation_React.createElement("button", {
      className: "mega-button right positive",
      onClick: () => {
        self.doAllow();
      }
    }, metaRichpreviewConfirmation_React.createElement("span", null, l[18681])), notNowButton, neverButton)), metaRichpreviewConfirmation_React.createElement("div", {
      className: "clear"
    })));
  }

}


;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/geoLocation.jsx


function GeoLocation(props) {
  const {
    latitude,
    lng
  } = props;

  const handleOnclick = (lat, lng) => {
    const openGmaps = () => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
    };

    if (GeoLocationLinks.gmapsConfirmation === -1 || GeoLocationLinks.gmapsConfirmation === false) {
      msgDialog('confirmation', 'geolocation-link', l[20788], 'Would you like to proceed?', answer => {
        if (answer) {
          GeoLocationLinks.confirmationDoConfirm();
          closeDialog();
          openGmaps();
        } else {
          GeoLocationLinks.confirmationDoNever();
        }
      });
    } else if (GeoLocationLinks.gmapsConfirmation) {
      openGmaps();
    }
  };

  return external_React_default().createElement("div", {
    className: "geolocation-container"
  }, external_React_default().createElement("div", {
    className: "geolocation",
    onClick: () => handleOnclick(latitude, lng)
  }, external_React_default().createElement("div", {
    className: "geolocation__details"
  }, external_React_default().createElement("div", {
    className: "geolocation__icon"
  }, external_React_default().createElement("i", {
    className: "sprite-fm-mono icon-location"
  })), external_React_default().createElement("ul", {
    className: "geolocation__data-list"
  }, external_React_default().createElement("li", null, external_React_default().createElement("span", {
    className: "geolocation__title"
  }, l[20789])), external_React_default().createElement("li", null, external_React_default().createElement("p", null, external_React_default().createElement("span", {
    className: "geolocation__coordinates-icon"
  }), external_React_default().createElement("span", {
    className: "geolocation__coordinates"
  }, "https://maps.google.com")))))));
}

const geoLocation = (GeoLocation);
// EXTERNAL MODULE: ./js/chat/ui/messages/types/partials/metaRichPreviewLoading.jsx
var metaRichPreviewLoading = __webpack_require__(480);
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreviewMegaLinks.jsx






class MetaRichpreviewMegaLinks extends mixin.y {
  render() {
    var self = this;
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var previewContainer;
    var output = [];
    var megaLinks = message.megaLinks ? message.megaLinks : [];

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

        previewContainer = external_React_default().createElement(metaRichPreviewLoading.F, {
          message: message,
          isLoading: megaLinkInfo.hadLoaded()
        });
      } else if (megaLinkInfo.is_contactlink) {
        var fakeContact = M.u[megaLinkInfo.info.h] ? M.u[megaLinkInfo.info.h] : {
          'u': megaLinkInfo.info.h,
          'm': megaLinkInfo.info.e,
          'firstName': megaLinkInfo.info.fn,
          'lastName': megaLinkInfo.info.ln,
          'name': megaLinkInfo.info.fn + " " + megaLinkInfo.info.ln
        };

        if (!M.u[fakeContact.u]) {
          M.u.set(fakeContact.u, new MegaDataObject(MEGA_USER_STRUCT, {
            'u': fakeContact.u,
            'name': fakeContact.firstName + " " + fakeContact.lastName,
            'm': fakeContact.m ? fakeContact.m : "",
            'c': undefined
          }));
        }

        var contact = M.u[megaLinkInfo.info.h];
        previewContainer = external_React_default().createElement("div", {
          key: megaLinkInfo.info.h,
          className: "message shared-block contact-link"
        }, external_React_default().createElement("div", {
          className: "message shared-info"
        }, external_React_default().createElement("div", {
          className: "message data-title"
        }, contact.name), external_React_default().createElement(ui_contacts.ContactVerified, {
          className: "right-align",
          contact: contact
        }), external_React_default().createElement("div", {
          className: "user-card-email"
        }, contact.m)), external_React_default().createElement("div", {
          className: "message shared-data"
        }, external_React_default().createElement("div", {
          className: "data-block-view semi-big"
        }, external_React_default().createElement(ui_contacts.ContactPresence, {
          className: "small",
          contact: contact
        }), external_React_default().createElement(ui_contacts.Avatar, {
          className: "avatar-wrapper medium-avatar",
          contact: contact,
          chatRoom: chatRoom
        })), external_React_default().createElement("div", {
          className: "clear"
        })));
      } else {
        var desc;
        var is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

        if (megaLinkInfo.is_chatlink) {
          desc = l[8876] + ": " + megaLinkInfo.info.ncm;
        } else if (!megaLinkInfo.is_dir) {
          desc = bytesToSize(megaLinkInfo.info.size);
        } else {
          const totalNumberOfFiles = megaLinkInfo.info.s[1];
          const numOfVersionedFiles = megaLinkInfo.info.s[4];
          const folderCount = megaLinkInfo.info.s[2];
          const totalFileSize = megaLinkInfo.info.size;
          const versionsSize = megaLinkInfo.info.s[3];
          desc = external_React_default().createElement("span", null, fm_contains(totalNumberOfFiles - numOfVersionedFiles, folderCount - 1), external_React_default().createElement("br", null), bytesToSize(totalFileSize - versionsSize));
        }

        previewContainer = external_React_default().createElement("div", {
          className: "message richpreview body " + ((is_icon ? "have-icon" : "no-icon") + " " + (megaLinkInfo.is_chatlink ? "is-chat" : ""))
        }, megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ? external_React_default().createElement("div", {
          className: "message richpreview img-wrapper"
        }, external_React_default().createElement("div", {
          className: "message richpreview preview",
          style: {
            "backgroundImage": 'url(' + megaLinkInfo.info.preview_url + ')'
          }
        })) : external_React_default().createElement("div", {
          className: "message richpreview img-wrapper"
        }, megaLinkInfo.is_chatlink ? external_React_default().createElement("i", {
          className: "huge-icon conversations"
        }) : external_React_default().createElement("div", {
          className: "message richpreview icon block-view-file-type " + (megaLinkInfo.is_dir ? "folder" : fileIcon(megaLinkInfo.info))
        })), external_React_default().createElement("div", {
          className: "message richpreview inner-wrapper"
        }, external_React_default().createElement("div", {
          className: "message richpreview data-title"
        }, external_React_default().createElement("span", {
          className: "message richpreview title"
        }, external_React_default().createElement(utils.Emoji, null, megaLinkInfo.info.name || megaLinkInfo.info.topic || ""))), external_React_default().createElement("div", {
          className: "message richpreview desc"
        }, desc), external_React_default().createElement("div", {
          className: "message richpreview url-container"
        }, external_React_default().createElement("span", {
          className: "message richpreview url-favicon"
        }, external_React_default().createElement("img", {
          src: "https://mega.nz/favicon.ico?v=3&c=1",
          width: 16,
          height: 16,
          onError: e => {
            if (e && e.target && e.target.parentNode) {
              e.target.parentNode.removeChild(e.target);
            }
          },
          alt: ""
        })), external_React_default().createElement("span", {
          className: "message richpreview url"
        }, ellipsis(megaLinkInfo.getLink(), 'end', 40)))));
      }

      output.push(external_React_default().createElement("div", {
        key: megaLinkInfo.node_key + "_" + output.length,
        className: "message richpreview container " + (megaLinkInfo.havePreview() ? "have-preview" : "no-preview") + " " + (megaLinkInfo.d ? "have-description" : "no-description") + " " + (!megaLinkInfo.hadLoaded() ? "is-loading" : "done-loading"),
        onClick: function (url, megaLinkInfo) {
          if (megaLinkInfo.hadLoaded()) {
            if (window.sfuClient && megaLinkInfo.is_chatlink) {
              const {
                chatRoom: callRoom
              } = megaChat.activeCall;
              const peers = callRoom ? callRoom.getParticipantsExceptMe(callRoom.getCallParticipants()).map(h => M.getNameByHandle(h)) : [];
              const body = peers.length ? mega.utils.trans.listToString(peers, l.cancel_with_to_join) : l.cancel_to_join;
              return msgDialog('confirmation', undefined, l.call_in_progress, body, e => e && window.open(url, '_blank', 'noopener,noreferrer'));
            }

            window.open(url, '_blank', 'noopener,noreferrer');
          }
        }.bind(this, megaLinkInfo.getLink(), megaLinkInfo)
      }, previewContainer, external_React_default().createElement("div", {
        className: "clear"
      })));
    }

    return external_React_default().createElement("div", {
      className: "message richpreview previews-container"
    }, output);
  }

}


// EXTERNAL MODULE: ./js/chat/ui/typingArea.jsx + 1 modules
var typingArea = __webpack_require__(825);
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/text.jsx










class Text extends AbstractGenericMessage {
  constructor(...args) {
    super(...args);

    this.isRichPreview = message => message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW;

    this.isGeoLocation = message => message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;
  }

  getClassNames() {
    const {
      message,
      isBeingEdited,
      grouped
    } = this.props;
    const REQUIRES_CONFIRMATION = this.isRichPreview(message) && message.meta.requiresConfirmation && !isBeingEdited() && (message.source === Message.SOURCE.SENT || message.confirmed === true);
    return `
            ${REQUIRES_CONFIRMATION ? 'preview-requires-confirmation-container' : ''}
            ${grouped ? 'grouped' : ''}
        `;
  }

  getMessageActionButtons() {
    const {
      chatRoom,
      message,
      isBeingEdited
    } = this.props;

    if (isBeingEdited()) {
      return [];
    }

    let extraPreButtons = [];
    let messageActionButtons = null;
    const IS_GEOLOCATION = this.isGeoLocation(message);

    if (!message.deleted && this.isRichPreview(message)) {
      if (!message.meta.requiresConfirmation) {
        if (message.isEditable()) {
          if (message.meta.isLoading) {
            extraPreButtons = [...extraPreButtons, external_React_default().createElement(dropdowns.DropdownItem, {
              icon: "sprite-fm-mono icon-eye-hidden",
              key: "stop-link-preview",
              label: l[18684],
              className: "",
              onClick: e => {
                e.stopPropagation();
                e.preventDefault();
                chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
              }
            })];
          } else {
            extraPreButtons = [...extraPreButtons, external_React_default().createElement(dropdowns.DropdownItem, {
              key: "remove-link-preview",
              icon: "sprite-fm-mono icon-eye-hidden",
              label: l[18684],
              className: "",
              onClick: e => {
                e.stopPropagation();
                e.preventDefault();
                chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
              }
            })];
          }
        }
      } else if (!isBeingEdited() && !(message.source === Message.SOURCE.SENT || message.confirmed === true)) {
        extraPreButtons = [...extraPreButtons, external_React_default().createElement(dropdowns.DropdownItem, {
          key: "insert-link-preview",
          icon: "icons-sprite bold-eye",
          label: l[18683],
          className: "",
          onClick: e => {
            e.stopPropagation();
            e.preventDefault();
            chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
          }
        })];
      }
    }

    if (!message.deleted) {
      const contact = this.getContact();

      if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && isBeingEdited() !== true && chatRoom.isReadOnly() === false && !message.requiresManualRetry) {
        const editButton = !IS_GEOLOCATION && external_React_default().createElement(dropdowns.DropdownItem, {
          icon: "sprite-fm-mono icon-rename",
          label: l[1342],
          onClick: () => this.props.onEditToggle(true)
        });
        messageActionButtons = external_React_default().createElement(buttons.Button, {
          key: "delete-msg",
          className: "tiny-button",
          icon: "sprite-fm-mono icon-options"
        }, external_React_default().createElement(dropdowns.Dropdown, {
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left bottom",
          positionAt: "right bottom",
          horizOffset: 4
        }, extraPreButtons, editButton, editButton ? external_React_default().createElement("hr", null) : null, external_React_default().createElement(dropdowns.DropdownItem, {
          icon: "sprite-fm-mono icon-dialog-close",
          label: l[1730],
          onClick: e => this.props.onDelete(e, message)
        })));
      }
    }

    let parentButtons;

    if (super.getMessageActionButtons) {
      parentButtons = super.getMessageActionButtons();
    }

    let returnedButtons = [];

    if (messageActionButtons) {
      returnedButtons.push(messageActionButtons);
    }

    if (message.messageHtml.includes('<pre class="rtf-multi">') && message.messageHtml.includes('</pre>')) {
      returnedButtons.push(external_React_default().createElement(buttons.Button, {
        key: "copy-msg",
        className: "tiny-button simpletip copy-txt-block",
        icon: "sprite-fm-mono icon-copy",
        attrs: {
          'data-simpletip': l.copy_txt_block_tip,
          'data-simpletipoffset': '3',
          'data-simpletipposition': 'top'
        },
        onClick: () => {
          copyToClipboard(message.textContents.replace(/```/g, ''), l.copy_txt_block_toast);
        }
      }));
    }

    if (parentButtons) {
      returnedButtons.push(parentButtons);
    }

    return returnedButtons;
  }

  getContents() {
    const {
      message,
      chatRoom,
      onUpdate,
      isBeingEdited,
      spinnerElement
    } = this.props;
    let messageNotSendIndicator;
    let textMessage = message.messageHtml;
    const IS_GEOLOCATION = this.isGeoLocation(message);
    const {
      lng,
      la: latitude
    } = IS_GEOLOCATION && message.meta.extra[0];

    if (message.textContents === '' && !message.dialogType) {
      message.deleted = true;
    }

    let subMessageComponent = [];

    if (!message.deleted) {
      if (this.isRichPreview(message)) {
        if (!message.meta.requiresConfirmation) {
          subMessageComponent = [...subMessageComponent, external_React_default().createElement(MetaRichpreview, {
            key: "richprev",
            message: message,
            chatRoom: chatRoom
          })];
        } else if (!isBeingEdited()) {
          if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
            subMessageComponent = [...subMessageComponent, external_React_default().createElement(MetaRichprevConfirmation, {
              key: "confirm",
              message: message,
              chatRoom: chatRoom
            })];
          }
        }
      }

      if (message.megaLinks) {
        subMessageComponent = [...subMessageComponent, external_React_default().createElement(MetaRichpreviewMegaLinks, {
          key: "richprevml",
          message: message,
          chatRoom: chatRoom
        })];
      }
    }

    if (message && message.getState && (message.getState() === Message.STATE.NOT_SENT || message.getState() === Message.STATE.NOT_SENT_EXPIRED)) {
      if (!spinnerElement) {
        if (message.requiresManualRetry) {
          if (isBeingEdited() !== true) {
            messageNotSendIndicator = external_React_default().createElement("div", {
              className: "not-sent-indicator"
            }, external_React_default().createElement("span", {
              className: "tooltip-trigger",
              key: "retry",
              "data-tooltip": "not-sent-notification-manual",
              onClick: e => this.props.onRetry(e, message)
            }, external_React_default().createElement("i", {
              className: "small-icon refresh-circle"
            })), external_React_default().createElement("span", {
              className: "tooltip-trigger",
              key: "cancel",
              "data-tooltip": "not-sent-notification-cancel",
              onClick: e => this.props.onCancelRetry(e, message)
            }, external_React_default().createElement("i", {
              className: "sprite-fm-mono icon-dialog-close"
            })));
          }
        } else {
          messageNotSendIndicator = external_React_default().createElement("div", {
            className: "not-sent-indicator tooltip-trigger",
            "data-tooltip": "not-sent-notification"
          }, external_React_default().createElement("i", {
            className: "small-icon yellow-triangle"
          }));
        }
      }
    }

    let messageDisplayBlock;

    if (isBeingEdited() === true) {
      let msgContents = message.textContents;
      msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);
      messageDisplayBlock = external_React_default().createElement(typingArea.j, {
        iconClass: "small-icon writing-pen textarea-icon",
        initialText: msgContents,
        chatRoom: chatRoom,
        showButtons: true,
        editing: true,
        className: "edit-typing-area",
        onUpdate: () => onUpdate ? onUpdate : null,
        onConfirm: messageContents => {
          this.props.onEditToggle(false);

          if (this.props.onEditDone) {
            Soon(() => {
              const tmpMessageObj = {
                textContents: messageContents
              };
              megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
              this.props.onEditDone(tmpMessageObj.textContents);

              if (this.isMounted()) {
                this.forceUpdate();
              }
            });
          }

          return true;
        },
        onResized: this.props.onResized ? this.props.onResized : false
      });
    } else {
      if (message.updated > 0 && !message.metaType) {
        textMessage = `${textMessage} <em class="edited">${l[8887]}</em>`;
      }

      if (this.props.initTextScrolling) {
        messageDisplayBlock = external_React_default().createElement(utils["default"].JScrollPane, {
          className: "message text-block scroll"
        }, external_React_default().createElement("div", {
          className: "message text-scroll"
        }, external_React_default().createElement(utils.ParsedHTML, null, textMessage)));
      } else {
        messageDisplayBlock = external_React_default().createElement("div", {
          className: "message text-block"
        }, external_React_default().createElement(utils.ParsedHTML, null, textMessage));
      }
    }

    return external_React_default().createElement((external_React_default()).Fragment, null, messageNotSendIndicator, IS_GEOLOCATION ? null : messageDisplayBlock, subMessageComponent, spinnerElement, IS_GEOLOCATION && external_React_default().createElement(geoLocation, {
      latitude: latitude,
      lng: lng
    }));
  }

}
// EXTERNAL MODULE: ./js/chat/ui/gifPanel/gifPanel.jsx + 3 modules
var gifPanel = __webpack_require__(722);
;// CONCATENATED MODULE: ./js/chat/ui/messages/types/giphy.jsx





class Giphy extends AbstractGenericMessage {
  constructor(props) {
    super(props);
    this.gifRef = external_React_default().createRef();
    this.state = {
      src: undefined
    };

    this.toggle = () => {
      const video = this.gifRef.current;
      video[video.paused ? 'play' : 'pause']();
    };
  }

  onVisibilityChange(isIntersecting) {
    this.setState({
      src: isIntersecting ? gifPanel.bl.convert(this.props.message.meta.src) : undefined
    }, () => {
      var _this$gifRef, _this$gifRef$current;

      (_this$gifRef = this.gifRef) == null ? void 0 : (_this$gifRef$current = _this$gifRef.current) == null ? void 0 : _this$gifRef$current[isIntersecting ? 'load' : 'pause']();
      this.safeForceUpdate();
    });
  }

  getMessageActionButtons() {
    const {
      onDelete,
      message
    } = this.props;
    const $$BUTTONS = [message.isEditable() && external_React_default().createElement(buttons.Button, {
      key: "delete-GIPHY-button",
      className: "tiny-button",
      icon: "sprite-fm-mono icon-options"
    }, external_React_default().createElement(dropdowns.Dropdown, {
      className: "white-context-menu attachments-dropdown",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      horizOffset: 4
    }, external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-dialog-close",
      label: l[1730],
      onClick: e => onDelete(e, message)
    }))), super.getMessageActionButtons && super.getMessageActionButtons()];
    return $$BUTTONS.filter(button => button);
  }

  getContents() {
    const {
      message,
      hideActionButtons
    } = this.props;
    const {
      s,
      w,
      h,
      src
    } = message.meta;
    const autoPlay = parseInt(s, 10) < 4e6;
    return external_React_default().createElement("video", {
      className: "giphy-block",
      ref: this.gifRef,
      title: message.textContents,
      autoPlay: autoPlay,
      loop: true,
      muted: true,
      controls: false,
      width: w,
      height: h,
      style: {
        cursor: autoPlay ? 'default' : 'pointer'
      },
      onClick: () => !autoPlay && this.toggle(),
      src: hideActionButtons ? gifPanel.bl.convert(src) : this.state.src
    });
  }

}
;// CONCATENATED MODULE: ./js/chat/ui/messages/generic.jsx










const CLICKABLE_ATTACHMENT_CLASSES = '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';
class GenericConversationMessage extends mixin.y {
  constructor(props) {
    super(props);

    this.isBeingEdited = () => this.state.editing === true || this.props.editing === true;

    this.doDelete = (e, msg) => {
      e.preventDefault(e);
      e.stopPropagation(e);

      if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
        this.doCancelRetry(e, msg);
      } else {
        this.props.onDeleteClicked(this.props.message);
      }
    };

    this.doCancelRetry = (e, msg) => {
      e.preventDefault(e);
      e.stopPropagation(e);
      const chatRoom = this.props.message.chatRoom;
      const messageId = msg.messageId;
      chatRoom.messagesBuff.messages.removeByKey(messageId);
      chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, messageId);
    };

    this.doRetry = (e, msg) => {
      e.preventDefault(e);
      e.stopPropagation(e);
      const chatRoom = this.props.message.chatRoom;
      this.doCancelRetry(e, msg);

      chatRoom._sendMessageToTransport(msg).done(internalId => {
        msg.internalId = internalId;
        this.safeForceUpdate();
      });
    };

    this.state = {
      editing: this.props.editing
    };
    this.pid = '__geom_' + String(Math.random()).substr(2);
  }

  componentDidUpdate(oldProps, oldState) {
    const isBeingEdited = this.isBeingEdited();
    const isMounted = this.isMounted();

    if (isBeingEdited && isMounted) {
      const $generic = $(this.findDOMNode());
      const $textarea = $('textarea', $generic);

      if ($textarea.length > 0 && !$textarea.is(":focus")) {
        $textarea.trigger("focus");
        moveCursortoToEnd($textarea[0]);
      }

      if (!oldState.editing && this.props.onEditStarted) {
        this.props.onEditStarted($generic);
        moveCursortoToEnd($textarea);
      }
    }

    if (isMounted && !isBeingEdited && oldState.editing === true && this.props.onUpdate) {
      this.props.onUpdate();
    }
  }

  componentDidMount() {
    super.componentDidMount();
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
      } else if ($(e.target).is(".shared-info") || $(e.target).parents(".shared-info").length > 0) {
        $block = $(e.target).is(".shared-info") ? $(e.target).next() : $(e.target).parents(".shared-info").next();
      } else {
        $block = $(e.target).parents('.message.shared-data');
      }

      Soon(function () {
        $('.tiny-button', $block).trigger('click');
      });
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    var $node = $(self.findDOMNode());
    self.props.message.off('onChange.GenericConversationMessage' + self.getUniqueId());
    $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
  }

  haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }

    if (this.props.message.meta && this.props.message.meta.participants) {
      return this.props.message.meta.participants;
    }

    return false;
  }

  _nodeUpdated() {
    var self = this;
    Soon(function () {
      if (self.isMounted() && self.isComponentVisible()) {
        self.forceUpdate();

        if (self.dropdown) {
          self.dropdown.forceUpdate();
        }
      }
    });
  }

  _favourite(h) {
    if (M.isInvalidUserStatus()) {
      return;
    }

    var newFavState = Number(!M.isFavourite(h));
    M.favourite([h], newFavState);
  }

  _addFavouriteButtons(h, arr) {
    var self = this;

    if (M.getNodeRights(h) > 1) {
      var isFav = M.isFavourite(h);
      arr.push(external_React_default().createElement(dropdowns.DropdownItem, {
        icon: `
                        sprite-fm-mono
                        context
                        ${isFav ? 'icon-favourite-removed' : 'icon-favourite'}
                    `,
        label: isFav ? l[5872] : l[5871],
        isFav: isFav,
        key: "fav",
        disabled: mega.paywall,
        onClick: e => {
          self._favourite(h);

          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }));
      return isFav;
    }

    return false;
  }

  _isNodeHavingALink(h) {
    return M.getNodeShare(h) !== false;
  }

  _addLinkButtons(h, arr) {
    var self = this;
    var haveLink = self._isNodeHavingALink(h) === true;
    var getManageLinkText = haveLink ? l[6909] : l[59];
    arr.push(external_React_default().createElement(dropdowns.DropdownItem, {
      icon: "sprite-fm-mono icon-link",
      key: "getLinkButton",
      label: getManageLinkText,
      disabled: mega.paywall,
      onClick: self._getLink.bind(self, h)
    }));

    if (haveLink) {
      arr.push(external_React_default().createElement(dropdowns.DropdownItem, {
        icon: "sprite-fm-mono context icon-link-remove",
        key: "removeLinkButton",
        label: l[6821],
        disabled: mega.paywall,
        onClick: self._removeLink.bind(self, h)
      }));
      return true;
    }

    return false;
  }

  _startDownload(v) {
    M.addDownload([v]);
  }

  _addToCloudDrive(v, openSendToChat) {
    $.selected = [v.h];
    $.chatAttachmentShare = true;
    openSaveToDialog(v, function (node, target) {
      if (Array.isArray(target)) {
        M.myChatFilesFolder.get(true).then(function (myChatFolder) {
          M.injectNodes(node, myChatFolder.h, function (res) {
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
            msgDialog('info', l[8005], target === M.RootID ? l[8006] : l[22903].replace('%s', escapeHTML(M.d[target].name)));
          }
        });
      }
    }, openSendToChat ? "conversations" : false);
  }

  _getLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      $.selected = [h];
      mega.Share.initCopyrightsDialog([h]);
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  _removeLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      var exportLink = new mega.Share.ExportLink({
        'updateUI': true,
        'nodesToProcess': [h]
      });
      exportLink.removeExportLink();
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  _startPreview(v, e) {
    if ($(e && e.target).is('.tiny-button')) {
      return;
    }

    assert(M.chat, 'Not in chat.');

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    M.viewMediaFile(v);
  }

  render() {
    const {
      message,
      chatRoom
    } = this.props;
    const megaChat = this.props.message.chatRoom.megaChat;
    let textContents = message.textContents;
    let additionalClasses = "";
    let spinnerElement = null;
    let messageIsNowBeingSent = false;

    if (this.props.className) {
      additionalClasses += this.props.className;
    }

    if (message instanceof Message) {
      if (!message.wasRendered || !message.messageHtml) {
        message.messageHtml = htmlentities(textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');
        message.processedBy = {};
        const evtObj = {
          message,
          room: chatRoom
        };
        megaChat.trigger('onPreBeforeRenderMessage', evtObj);
        const event = new MegaDataEvent('onBeforeRenderMessage');
        megaChat.trigger(event, evtObj);
        megaChat.trigger('onPostBeforeRenderMessage', evtObj);

        if (event.isPropagationStopped()) {
          this.logger.warn(`Event propagation stopped receiving (rendering) of message: ${message}`);
          return false;
        }

        message.wasRendered = 1;
      }

      var state = message.getState();
      var stateText = message.getStateText(state);

      if (state === Message.STATE.NOT_SENT) {
        messageIsNowBeingSent = unixtime() - message.delay < 5;

        if (messageIsNowBeingSent) {
          additionalClasses += ' sending';
          spinnerElement = external_React_default().createElement("div", {
            className: "small-blue-spinner"
          });

          if (!message.sending) {
            message.sending = true;
            delay(this.pid + message.messageId, () => {
              if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                chatRoom.messagesBuff.trackDataChange();

                if (this.isMounted()) {
                  this.forceUpdate();
                }
              }
            }, (5 - (unixtime() - message.delay)) * 1000);
          }
        } else {
          additionalClasses += ' not-sent';

          if (message.sending === true) {
            message.sending = false;
            message.trigger('onChange', [message, 'sending', true, false]);
          }

          if (message.requiresManualRetry) {
            additionalClasses += ' retrying requires-manual-retry';
          } else {
            additionalClasses += ' retrying';
          }
        }
      } else {
        additionalClasses += ' ' + stateText;
      }
    }

    const MESSAGE = {
      TYPE: {
        ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT,
        CONTACT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT,
        REVOKE_ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT,
        VOICE_CLIP: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP,
        GIPHY: message.metaType && message.metaType === Message.MESSAGE_META_TYPE.GIPHY,
        TEXT: textContents[0] !== Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT,
        INLINE: !(message instanceof Message) && message.type && !!message.type.length,
        REVOKED: message.revoked
      },
      props: { ...this.props,
        additionalClasses
      },
      isBeingEdited: this.isBeingEdited,
      onDelete: (e, message) => this.doDelete(e, message)
    };

    switch (true) {
      case MESSAGE.TYPE.REVOKED || MESSAGE.TYPE.REVOKE_ATTACHMENT:
        return null;

      case MESSAGE.TYPE.ATTACHMENT:
        return external_React_default().createElement(Attachment, (0,esm_extends.Z)({}, MESSAGE.props, {
          onPreviewStart: (v, e) => this._startPreview(v, e),
          onDownloadStart: v => this._startDownload(v),
          onAddLinkButtons: (h, arr) => this._addLinkButtons(h, arr),
          onAddToCloudDrive: (v, openSendToChat) => this._addToCloudDrive(v, openSendToChat),
          onAddFavouriteButtons: (h, arr) => this._addFavouriteButtons(h, arr)
        }));

      case MESSAGE.TYPE.CONTACT:
        return external_React_default().createElement(Contact, (0,esm_extends.Z)({}, MESSAGE.props, {
          onDelete: MESSAGE.onDelete
        }));

      case MESSAGE.TYPE.VOICE_CLIP:
        return external_React_default().createElement(VoiceClip, (0,esm_extends.Z)({}, MESSAGE.props, {
          isBeingEdited: MESSAGE.isBeingEdited,
          onDelete: MESSAGE.onDelete
        }));

      case MESSAGE.TYPE.INLINE:
        return external_React_default().createElement(Local, MESSAGE.props);

      case MESSAGE.TYPE.GIPHY:
        return external_React_default().createElement(Giphy, (0,esm_extends.Z)({}, MESSAGE.props, {
          onDelete: MESSAGE.onDelete
        }));

      case MESSAGE.TYPE.TEXT:
        return external_React_default().createElement(Text, (0,esm_extends.Z)({}, MESSAGE.props, {
          onEditToggle: editing => this.setState({
            editing
          }),
          onDelete: MESSAGE.onDelete,
          onRetry: (e, message) => this.doRetry(e, message),
          onCancelRetry: (e, message) => this.doCancelRetry(e, message),
          isBeingEdited: MESSAGE.isBeingEdited,
          spinnerElement: spinnerElement
        }));

      default:
        return null;
    }
  }

}

/***/ }),

/***/ 416:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"y": () => (ConversationMessageMixin)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _mixins1__ = __webpack_require__(503);
var _ui_buttons_jsx2__ = __webpack_require__(204);
var _ui_emojiDropdown_jsx3__ = __webpack_require__(768);





class ConversationMessageMixin extends _mixins1__._p {
  constructor(props) {
    super(props);

    this.haveMeetingsCall = () => {
      return document.querySelector('.meetings-call') && document.querySelector('.chat-opened');
    };

    this.getCurrentUserReactions = () => {
      const {
        reactions
      } = this.props.message.reacts;
      return Object.keys(reactions).filter(utf => {
        var _reactions$utf;

        return (_reactions$utf = reactions[utf]) == null ? void 0 : _reactions$utf[u_handle];
      });
    };

    this.__cmmUpdateTickCount = 0;
    this._contactChangeListeners = false;
    this.onAfterRenderWasTriggered = false;
    lazy(this, '__cmmId', () => {
      return this.getUniqueId() + '--' + String(Math.random()).slice(-7);
    });
    this._emojiOnActiveStateChange = this._emojiOnActiveStateChange.bind(this);
    this.emojiSelected = this.emojiSelected.bind(this);
    const {
      message: msg
    } = this.props;

    if (msg instanceof Message && msg._reactions && msg.messageId.length === 11 && msg.isSentOrReceived() && !Object.hasOwnProperty.call(msg, 'reacts')) {
      msg.reacts.forceLoad().then(nop).catch(dump.bind(null, 'reactions.load.' + msg.messageId));
    }
  }

  componentWillMount() {
    if (super.componentWillMount) {
      super.componentWillMount();
    }

    const chatRoom = this.props.chatRoom;

    if (chatRoom) {
      chatRoom.rebind('onChatShown.' + this.__cmmId, () => {
        if (!this._contactChangeListeners) {
          this.addContactListeners();
        }
      }).rebind('onChatHidden.' + this.__cmmId, () => {
        if (this._contactChangeListeners) {
          this.removeContactListeners();
        }
      });
    }

    this.addContactListeners();
  }

  removeContactListeners() {
    const users = this._contactChangeListeners;

    if (d > 1) {
      console.warn('%s.removeContactListeners', this.getReactId(), [this], users);
    }

    for (let i = users.length; i--;) {
      users[i].removeEventHandler(this);
    }

    this._contactChangeListeners = false;
  }

  addContactListeners() {
    const users = this._contactChangeListeners || [];

    const addUser = user => {
      if (user instanceof MegaDataMap && users.indexOf(user) < 0) {
        users.push(user);
      }
    };

    addUser(this.getContact());

    if (this.haveMoreContactListeners) {
      var moreIds = this.haveMoreContactListeners();

      if (moreIds) {
        for (let i = moreIds.length; i--;) {
          var handle = moreIds[i];
          addUser(handle in M.u && M.u[handle]);
        }
      }
    }

    if (d > 1) {
      console.warn('%s.addContactListeners', this.getReactId(), [this], users);
    }

    for (let i = users.length; i--;) {
      users[i].addChangeListener(this);
    }

    this._contactChangeListeners = users;
  }

  handleChangeEvent(x, z, k) {
    if (k === 'ts' || k === 'ats') {
      return;
    }

    delay(this.__cmmId, () => {
      this.eventuallyUpdate();
      this.__cmmUpdateTickCount = -2;
    }, ++this.__cmmUpdateTickCount > 5 ? -1 : 90);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    const chatRoom = this.props.chatRoom;

    if (chatRoom) {
      chatRoom.off('onChatShown.' + this.__cmmId).off('onChatHidden.' + this.__cmmId);
    }

    if (this._contactChangeListeners) {
      this.removeContactListeners();
    }
  }

  getContact() {
    if (this.props.contact) {
      return this.props.contact;
    }

    var message = this.props.message;
    return Message.getContactForMessage(message);
  }

  getTimestampAsString() {
    return unixtimeToTimeString(this.getTimestamp());
  }

  getTimestamp() {
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
  }

  getParentJsp() {
    return $(this.findDOMNode()).closest('.jScrollPaneContainer').data('jsp');
  }

  componentDidUpdate() {
    var self = this;
    var chatRoom = self.props.message.chatRoom;

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

  emojiSelected(e, slug, meta) {
    const {
      chatRoom,
      message,
      onEmojiBarChange
    } = this.props;

    if (chatRoom.isReadOnly()) {
      return false;
    }

    const {
      reactions
    } = this.props.message.reacts;
    const CURRENT_USER_REACTIONS = this.getCurrentUserReactions().length;
    const REACTIONS_LIMIT = {
      TOTAL: 50,
      PER_PERSON: 24
    };

    const addReaction = () => chatRoom.messagesBuff.userAddReaction(message.messageId, slug, meta);

    const emoji = megaChat._emojiData.emojisSlug[slug] || meta;

    if (emoji && message.reacts.getReaction(u_handle, emoji.u)) {
      if (onEmojiBarChange && Object.keys(reactions).length === 1 && Object.keys(reactions[emoji.u]).length === 1) {
        onEmojiBarChange(false);
      }

      return chatRoom.messagesBuff.userDelReaction(message.messageId, slug, meta);
    }

    if (emoji && reactions[emoji.u] && CURRENT_USER_REACTIONS < REACTIONS_LIMIT.PER_PERSON) {
      return addReaction();
    }

    if (CURRENT_USER_REACTIONS >= REACTIONS_LIMIT.PER_PERSON) {
      return msgDialog('info', '', l[24205].replace('%1', REACTIONS_LIMIT.PER_PERSON));
    }

    if (Object.keys(reactions).length >= REACTIONS_LIMIT.TOTAL) {
      return msgDialog('info', '', l[24206].replace('%1', REACTIONS_LIMIT.TOTAL));
    } else if (onEmojiBarChange && Object.keys(reactions).length === 0) {
      onEmojiBarChange(true);
    }

    return addReaction();
  }

  _emojiOnActiveStateChange(newVal) {
    this.setState(() => {
      return {
        reactionsDropdownActive: newVal
      };
    });
  }

  getEmojisImages() {
    const {
      chatRoom,
      message
    } = this.props;
    var isReadOnlyClass = chatRoom.isReadOnly() ? " disabled" : "";
    var emojisImages = message._reactions && message.reacts.reactions && Object.keys(message.reacts.reactions).map(utf => {
      var reaction = message.reacts.reactions[utf];
      var count = Object.keys(reaction).length;

      if (!count) {
        return null;
      }

      const filename = twemoji.convert.toCodePoint(utf);
      const currentUserReacted = !!reaction[u_handle];
      var names = [];

      if (reaction) {
        ChatdIntegration._ensureContactExists(Object.keys(reaction));

        var rKeys = Object.keys(reaction);

        for (var i = 0; i < rKeys.length; i++) {
          var uid = rKeys[i];

          if (reaction[uid]) {
            var c = M.u[uid] || {};
            names.push(uid === u_handle ? l[24071] || "You" : c.name ? c.name : c.m || "(missing name)");
          }
        }
      }

      var emojiData = megaChat._emojiData.emojisUtf[utf];

      if (!emojiData) {
        emojiData = Object.create(null);
        emojiData.u = utf;
      }

      var slug = emojiData && emojiData.n || "";
      var tipText;
      slug = slug ? `:${slug}:` : utf;

      if (Object.keys(reaction).length === 1 && reaction[u_handle]) {
        tipText = (l[24068] || "You (click to remove) [G]reacted with %s[/G]").replace("%s", slug);
      } else {
        tipText = mega.utils.trans.listToString(names, (l[24069] || "%s [G]reacted with %s2[/G]").replace("%s2", slug));
      }

      var notFoundEmoji = slug && slug[0] !== ":";
      return react0().createElement("div", {
        key: slug,
        onClick: ((e, slug, meta) => () => this.emojiSelected(e, slug, meta))(null, slug, emojiData),
        className: `
                            reactions-bar__reaction
                            simpletip
                            ${currentUserReacted ? 'user-reacted' : ''}
                            ${notFoundEmoji ? 'emoji-loading-error' : ''}
                            ${isReadOnlyClass}
                        `,
        "data-simpletip": tipText,
        "data-simpletipoffset": "3",
        "data-simpletipposition": "top"
      }, react0().createElement("img", {
        width: "10",
        height: "10",
        className: "emoji emoji-loading",
        draggable: "false",
        onError: e => {
          var textNode = document.createElement("em");
          textNode.classList.remove('emoji-loading');
          textNode.append(document.createTextNode(utf));
          e.target.replaceWith(textNode);
          textNode.parentNode.classList.add('emoji-loading-error');
        },
        title: !notFoundEmoji ? `:${emojiData.n}:` : utf,
        onLoad: e => {
          e.target.classList.remove('emoji-loading');
        },
        src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
      }), react0().createElement("span", {
        className: "message text-block"
      }, count));
    });
    emojisImages = emojisImages && emojisImages.filter(function (v) {
      return !!v;
    });

    if (emojisImages && emojisImages.length > 0) {
      const reactionBtn = !chatRoom.isReadOnly() ? react0().createElement(_ui_buttons_jsx2__.Button, {
        className: "popup-button reactions-button hover-colorized simpletip",
        icon: "sprite-fm-theme icon-emoji-reactions reactions-icon",
        disabled: false,
        key: "add-reaction-button",
        attrs: {
          'data-simpletip': l[24070] || "Add reaction...",
          'data-simpletipoffset': "3",
          'data-simpletipposition': "top"
        }
      }, react0().createElement(_ui_emojiDropdown_jsx3__.l, {
        horizOffset: this.haveMeetingsCall() ? -150 : 0,
        onActiveChange: this._emojiOnActiveStateChange,
        className: "popup emoji reactions-dropdown",
        onClick: this.emojiSelected
      })) : null;
      emojisImages.push(reactionBtn);
    }

    return emojisImages ? react0().createElement("div", {
      className: "reactions-bar",
      id: "reactions-bar"
    }, emojisImages) : null;
  }

  getMessageActionButtons() {
    const {
      chatRoom,
      message
    } = this.props;
    return message instanceof Message && message.isSentOrReceived() && !chatRoom.isReadOnly() ? react0().createElement(_ui_buttons_jsx2__.Button, {
      className: "popup-button reactions-button tiny-button simpletip",
      icon: `${"sprite-fm-theme reactions-icon"} icon-emoji-reactions`,
      iconHovered: `${"sprite-fm-theme reactions-icon"} icon-emoji-reactions-active`,
      disabled: false,
      key: "add-reaction-button",
      attrs: {
        'data-simpletip': l[24070] || "Add reaction...",
        'data-simpletipoffset': "3",
        'data-simpletipposition': "top"
      }
    }, react0().createElement(_ui_emojiDropdown_jsx3__.l, {
      horizOffset: this.haveMeetingsCall() ? -110 : 0,
      noArrow: true,
      onActiveChange: this._emojiOnActiveStateChange,
      className: "popup emoji reactions-dropdown",
      onClick: this.emojiSelected
    })) : null;
  }

}



/***/ }),

/***/ 480:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"F": () => (MetaRichpreviewLoading)
});
var React = __webpack_require__(363);

var ConversationMessageMixin = (__webpack_require__(416).y);

class MetaRichpreviewLoading extends ConversationMessageMixin {
  render() {
    return React.createElement("div", {
      className: "loading-spinner light small"
    }, React.createElement("div", {
      className: "main-loader"
    }));
  }

}



/***/ }),

/***/ 504:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"l": () => (getMessageString)
});
var getMessageString;

(function () {
  var MESSAGE_STRINGS;
  var MESSAGE_STRINGS_GROUP;

  var _sanitizeStrings = function (arg) {
    if (typeof arg === "undefined") {
      return arg;
    } else if (typeof arg === "string") {
      return escapeHTML(arg);
    } else if (arg.forEach) {
      arg.forEach(function (v, k) {
        arg[k] = _sanitizeStrings(v);
      });
    } else if (typeof arg === "object") {
      Object.keys(arg).forEach(function (k) {
        arg[k] = _sanitizeStrings(arg[k]);
      });
    }

    return arg;
  };

  getMessageString = function (type, isGroupCall) {
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


/***/ }),

/***/ 797:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "C": () => (StartGroupChatWizard)
});

// UNUSED EXPORTS: default

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(988);
// EXTERNAL MODULE: ./js/ui/forms.jsx
var ui_forms = __webpack_require__(773);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
;// CONCATENATED MODULE: ./js/ui/miniui.jsx



class ToggleCheckbox extends mixins.wl {
  constructor(props) {
    super(props);

    this.onToggle = () => {
      const newState = !this.state.value;
      this.setState({
        value: newState
      });

      if (this.props.onToggle) {
        this.props.onToggle(newState);
      }
    };

    this.state = {
      value: this.props.value
    };
  }

  render() {
    return external_React_default().createElement("div", {
      className: `
                    mega-switch
                    ${this.props.className}
                    ${this.state.value ? 'toggle-on' : ''}
                `,
      role: "switch",
      "aria-checked": !!this.state.value,
      onClick: this.onToggle
    }, external_React_default().createElement("div", {
      className: "mega-feature-switch"
    }));
  }

}

class Checkbox extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value
    };
  }

  componentDidMount() {
    super.componentDidMount();
    var self = this;
    var $node = self.findDOMNode();
    uiCheckboxes($node, false, function (newState) {
      self.setState({
        'value': newState
      });
      self.props.onToggle && self.props.onToggle(newState);
    }, !!self.props.value);
  }

  render() {
    var extraClasses = "";

    if (this.props.disabled) {
      extraClasses += " disabled";
    }

    return external_React_default().createElement("div", {
      className: this.props.className + " checkbox" + extraClasses
    }, external_React_default().createElement("div", {
      className: "checkdiv checkboxOn"
    }, external_React_default().createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.name,
      className: "checkboxOn",
      checked: ""
    })), external_React_default().createElement("label", {
      htmlFor: this.props.name,
      className: "radio-txt lato mid"
    }, this.props.label), external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}

class IntermediateCheckbox extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value
    };
  }

  componentDidMount() {
    super.componentDidMount();
    var self = this;
    var $node = self.findDOMNode();
    uiCheckboxes($node, false, function (newState) {
      self.setState({
        'value': newState
      });
      self.props.onToggle && self.props.onToggle(newState);
    }, !!self.props.value);
  }

  render() {
    var extraClasses = "";

    if (this.props.disabled) {
      extraClasses += " disabled";
    }

    return external_React_default().createElement("div", {
      className: this.props.className + " checkbox" + extraClasses
    }, external_React_default().createElement("div", {
      className: "checkdiv checkboxOn"
    }, external_React_default().createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.name,
      className: "checkboxOn",
      checked: ""
    })), external_React_default().createElement("label", {
      htmlFor: this.props.name,
      className: "radio-txt lato mid"
    }, this.props.label), external_React_default().createElement("div", {
      className: "clear"
    }), this.props.intermediate ? external_React_default().createElement("div", {
      className: "intermediate-state"
    }, this.props.intermediateMessage) : null, external_React_default().createElement("div", {
      className: "clear"
    }));
  }

}

const miniui = ({
  ToggleCheckbox,
  Checkbox,
  IntermediateCheckbox
});
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(13);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(904);
;// CONCATENATED MODULE: ./js/chat/ui/startGroupChatWizard.jsx
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);








class StartGroupChatWizard extends mixins.wl {
  constructor(props) {
    super(props);
    this.inputContainerRef = React.createRef();
    this.inputRef = React.createRef();
    var haveContacts = false;
    var keys = M.u.keys();

    for (var i = 0; i < keys.length; i++) {
      if (M.u[keys[i]].c === 1) {
        haveContacts = true;
        break;
      }
    }

    this.state = {
      'selected': this.props.selected ? this.props.selected : [],
      'haveContacts': haveContacts,
      'step': this.props.flowType === 2 || !haveContacts ? 1 : 0,
      'keyRotation': false,
      'createChatLink': this.props.flowType === 2 ? true : false,
      'groupName': ''
    };
    this.onFinalizeClick = this.onFinalizeClick.bind(this);
    this.onSelectClicked = this.onSelectClicked.bind(this);
    this.onSelected = this.onSelected.bind(this);
  }

  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
  }

  onSelectClicked() {
    if (this.props.onSelectClicked) {
      this.props.onSelectClicked();
    }
  }

  onFinalizeClick(e) {
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
  }

  render() {
    var self = this;
    var classes = "new-group-chat contrast small-footer " + self.props.className;
    var contacts = M.u;
    var haveContacts = self.state.haveContacts;
    var buttons = [];
    var allowNext = false;
    var failedToEnableChatlink = self.state.failedToEnableChatlink && self.state.createChatLink === true && !self.state.groupName;

    if (self.state.keyRotation) {
      failedToEnableChatlink = false;
    }

    var extraContent;

    if (this.props.extraContent) {
      self.state.step = 0;
      extraContent = React.createElement("div", {
        className: "content-block imported"
      });
    } else if (self.state.step === 0 && haveContacts) {
      allowNext = true;
      buttons.push({
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick": function (e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      buttons.push({
        "label": l[556],
        "key": "next",
        "className": !allowNext ? "disabled positive" : "positive",
        "onClick": function (e) {
          e.preventDefault();
          e.stopPropagation();
          self.setState({
            'step': 1
          });
        }
      });
    } else if (self.state.step === 1) {
      allowNext = self.state.createChatLink ? !failedToEnableChatlink : true;
      contacts = [];
      self.state.selected.forEach(function (h) {
        if (h in M.u) {
          contacts.push(M.u[h]);
        }
      });

      if (!haveContacts || this.props.flowType === 2) {
        buttons.push({
          "label": self.props.cancelLabel,
          "key": "cancel",
          "onClick": function (e) {
            self.props.onClose(self);
            e.preventDefault();
            e.stopPropagation();
          }
        });
      } else {
        buttons.push({
          "label": l[822],
          "key": "back",
          "onClick": function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.setState({
              'step': 0
            });
          }
        });
      }

      buttons.push({
        "label": l[726],
        "key": "done",
        "className": !allowNext ? "positive disabled" : "positive",
        "onClick": function (e) {
          if (self.state.createChatLink === true && !self.state.groupName) {
            self.setState({
              'failedToEnableChatlink': true
            });
          } else {
            self.onFinalizeClick(e);
          }
        }
      });
    }

    var chatInfoElements;

    if (self.state.step === 1) {
      var _this$state$groupName;

      var checkboxClassName = self.state.createChatLink ? "checkboxOn" : "checkboxOff";

      if (failedToEnableChatlink && self.state.createChatLink) {
        checkboxClassName += " intermediate-state";
      }

      if (self.state.keyRotation) {
        checkboxClassName = "checkboxOff";
      }

      chatInfoElements = React.createElement(React.Fragment, null, React.createElement("div", {
        className: `
                            contacts-search-header left-aligned top-pad
                            ${failedToEnableChatlink ? 'failed' : ''}
                        `
      }, React.createElement("div", {
        className: `
                                mega-input
                                with-icon
                                box-style
                                ${((_this$state$groupName = this.state.groupName) == null ? void 0 : _this$state$groupName.length) > 0 ? 'valued' : ''}
                                ${failedToEnableChatlink ? 'error msg' : ''}
                            `,
        ref: this.inputContainerRef
      }, React.createElement("i", {
        className: "sprite-fm-mono icon-channel-new"
      }), React.createElement("input", {
        autoFocus: true,
        className: "megaInputs",
        type: "text",
        ref: this.inputRef,
        placeholder: l[18509],
        value: this.state.groupName,
        maxLength: 30,
        onKeyDown: e => {
          const code = e.which || e.keyCode;

          if (allowNext && code === 13 && self.state.step === 1) {
            this.onFinalizeClick();
          }
        },
        onChange: e => {
          const containerRef = this.inputContainerRef.current;
          const {
            value
          } = e.target;
          containerRef.classList[value.length > 0 ? 'add' : 'remove']('valued');
          this.setState({
            groupName: value,
            failedToEnableChatlink: false
          });
        }
      }))), this.props.flowType === 2 ? null : React.createElement("div", {
        className: "group-chat-dialog content"
      }, React.createElement(miniui.ToggleCheckbox, {
        className: "rotation-toggle",
        checked: this.state.keyRotation,
        onToggle: keyRotation => this.setState({
          keyRotation
        }, () => this.inputRef.current.focus())
      }), React.createElement("div", {
        className: "group-chat-dialog header"
      }, this.state.keyRotation ? l[20631] : l[20576]), React.createElement("div", {
        className: "group-chat-dialog description"
      }, l[20484]), React.createElement("div", {
        className: `
                                    group-chat-dialog checkbox
                                    ${this.state.keyRotation ? 'disabled' : ''}
                                    ${failedToEnableChatlink ? 'failed' : ''}
                                `,
        onClick: () => {
          delay('chatWizard-createChatLink', () => {
            this.setState(state => ({
              createChatLink: !state.createChatLink
            }));
            this.inputRef.current.focus();
          }, 100);
        }
      }, React.createElement("div", {
        className: `checkdiv ${checkboxClassName}`
      }, React.createElement("input", {
        type: "checkbox",
        name: "group-encryption",
        id: "group-encryption",
        className: "checkboxOn hidden"
      })), React.createElement("label", {
        htmlFor: "group-encryption",
        className: "radio-txt lato mid"
      }, l[20575]), React.createElement("div", {
        className: "clear"
      }))), failedToEnableChatlink ? React.createElement("div", {
        className: "group-chat-dialog description chatlinks-intermediate-msg"
      }, l[20573]) : null);
    }

    return React.createElement(modalDialogs.Z.ModalDialog, {
      step: self.state.step,
      title: this.props.flowType === 2 && self.state.createChatLink ? l[20638] : this.props.customDialogTitle || l[19483],
      className: classes,
      dialogType: "tool",
      dialogName: "group-chat-dialog",
      showSelectedNum: self.props.showSelectedNum,
      selectedNum: self.state.selected.length,
      closeDlgOnClickOverlay: self.props.closeDlgOnClickOverlay,
      onClose: () => {
        self.props.onClose(self);
      },
      popupDidMount: elem => {
        if (this.props.extraContent) {
          var _elem$querySelector;

          (_elem$querySelector = elem.querySelector('.content-block.imported')) == null ? void 0 : _elem$querySelector.appendChild(this.props.extraContent);
        }

        if (this.props.onExtraContentDidMount) {
          this.props.onExtraContentDidMount(elem);
        }
      },
      triggerResizeOnUpdate: true,
      buttons: buttons
    }, React.createElement("div", {
      className: "content-block"
    }, chatInfoElements, React.createElement(ui_contacts.ContactPickerWidget, {
      changedHashProp: self.state.step,
      exclude: self.props.exclude,
      contacts: contacts,
      selectableContacts: "true",
      onSelectDone: self.onSelectClicked,
      onSelected: self.onSelected,
      selected: self.state.selected,
      headerClasses: "left-aligned",
      multiple: true,
      readOnly: self.state.step !== 0,
      allowEmpty: true,
      showMeAsSelected: self.state.step === 1,
      className: self.props.pickerClassName,
      disableFrequents: self.props.disableFrequents,
      notSearchInEmails: self.props.notSearchInEmails,
      autoFocusSearchField: self.props.autoFocusSearchField,
      selectCleanSearchRes: self.props.selectCleanSearchRes,
      disableDoubleClick: self.props.disableDoubleClick,
      selectedWidthSize: self.props.selectedWidthSize,
      emptySelectionMsg: self.props.emptySelectionMsg,
      newEmptySearchResult: self.props.newEmptySearchResult,
      newNoContact: self.props.newNoContact,
      highlightSearchValue: self.props.highlightSearchValue,
      emailTooltips: self.props.emailTooltips
    })), extraContent);
  }

}
StartGroupChatWizard.clickTime = 0;
StartGroupChatWizard.defaultProps = {
  'selectLabel': l[1940],
  'cancelLabel': l[82],
  'hideable': true,
  'flowType': 1,
  'pickerClassName': '',
  'showSelectedNum': false,
  'disableFrequents': false,
  'notSearchInEmails': false,
  'autoFocusSearchField': true,
  'selectCleanSearchRes': true,
  'disableDoubleClick': false,
  'newEmptySearchResult': false,
  'newNoContact': false,
  'closeDlgOnClickOverlay': true,
  'emailTooltips': false
};
window.StartGroupChatDialogUI = {
  StartGroupChatWizard
};
const startGroupChatWizard = ({
  StartGroupChatWizard
});

/***/ }),

/***/ 825:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "j": () => (TypingArea)
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(229);
// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(79);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./js/ui/emojiDropdown.jsx
var emojiDropdown = __webpack_require__(768);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
var ui_buttons = __webpack_require__(204);
;// CONCATENATED MODULE: ./js/chat/ui/emojiAutocomplete.jsx
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);



var ButtonsUI = __webpack_require__(204);

class EmojiAutocomplete extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'selected': 0
    };
    this.loading = false;
    this.data_emojis = [];
  }

  preload_emojis() {
    if (this.loading === false) {
      this.loading = true;
      megaChat.getEmojiDataSet('emojis').then(emojis => {
        this.loading = 0;
        this.data_emojis = emojis;
        this.safeForceUpdate();
      });
    }
  }

  unbindKeyEvents() {
    $(document).off('keydown.emojiAutocomplete' + this.getUniqueId());
  }

  bindKeyEvents() {
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
          self.setState({
            'prefilled': false
          });
        }
      }
    });
  }

  componentDidUpdate() {
    if (!this.props.emojiSearchQuery) {
      this.unbindKeyEvents();
    } else {
      this.bindKeyEvents();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindKeyEvents();
  }

  render() {
    var self = this;

    if (!self.props.emojiSearchQuery) {
      return null;
    }

    self.preload_emojis();

    if (self.loading) {
      return React.createElement("div", {
        className: "textarea-autofill-bl"
      }, React.createElement("div", {
        className: "textarea-autofill-info"
      }, l[5533]));
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
      setTimeout(function () {
        self.props.onCancel();
      }, 0);
      return null;
    }

    var emojisDomList = [];

    for (var i = 0; i < found.length; i++) {
      var meta = found[i];
      var filename = twemoji.convert.toCodePoint(meta.u);
      emojisDomList.push(React.createElement("div", {
        className: "emoji-preview shadow " + (this.state.selected === i ? "active" : ""),
        key: meta.n + "_" + (this.state.selected === i ? "selected" : "inselected"),
        title: ":" + meta.n + ":",
        onClick: function (e) {
          self.props.onSelect(e, e.target.title);
          self.unbindKeyEvents();
        }
      }, React.createElement("img", {
        width: "20",
        height: "20",
        className: "emoji emoji-loading",
        draggable: "false",
        alt: meta.u,
        onLoad: e => {
          e.target.classList.remove('emoji-loading');
        },
        onError: e => {
          e.target.classList.remove('emoji-loading');
          e.target.classList.add('emoji-loading-error');
        },
        src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
      }), React.createElement("div", {
        className: "emoji title"
      }, ":" + meta.n + ":")));
    }

    return React.createElement("div", {
      className: "textarea-autofill-bl"
    }, React.createElement("div", {
      className: "textarea-autofill-info"
    }, React.createElement("strong", null, "tab"), " or  ", React.createElement("i", {
      className: "small-icon tab-icon"
    }), " to navigate", React.createElement("i", {
      className: "small-icon enter-icon left-pad"
    }), " to select ", React.createElement("strong", {
      className: "left-pad"
    }, "esc"), "to dismiss"), React.createElement("div", {
      className: "textarea-autofill-emoji"
    }, emojisDomList));
  }

}
EmojiAutocomplete.defaultProps = {
  'requiresUpdateOnResize': true,
  'emojiSearchQuery': false,
  'disableCheckingVisibility': true,
  'maxEmojis': 12
};
// EXTERNAL MODULE: ./js/chat/ui/gifPanel/gifPanel.jsx + 3 modules
var gifPanel = __webpack_require__(722);
;// CONCATENATED MODULE: ./js/chat/ui/typingArea.jsx


var _dec, _dec2, _class;








let TypingArea = (_dec = (0,mixins.M9)(60), _dec2 = (0,mixins.M9)(54, true), (_class = class TypingArea extends mixins.wl {
  constructor(props) {
    super(props);
    this.typingAreaRef = external_React_default().createRef();
    this.state = {
      emojiSearchQuery: false,
      typedMessage: '',
      textareaHeight: 20,
      gifPanelActive: false
    };

    this.initScrolling = () => {
      if (this.typingAreaRef && this.typingAreaRef.current) {
        this.scrollingInitialised = true;
        const $textarea = $('textarea:first', this.typingAreaRef.current);
        const $textareaScrollBlock = $('.textarea-scroll', this.typingAreaRef.current);
        this.textareaLineHeight = parseInt($textarea.css('line-height'));
        $textareaScrollBlock.jScrollPane({
          enableKeyboardNavigation: false,
          showArrows: true,
          arrowSize: 5,
          animateScroll: false,
          maintainPosition: false
        });
      }
    };

    this.getTextareaMaxHeight = () => {
      const {
        containerRef
      } = this.props;

      if (containerRef && containerRef.current) {
        return this.isMounted() ? containerRef.current.offsetHeight * 0.4 : 100;
      }

      return 100;
    };

    this.onEmojiClicked = this.onEmojiClicked.bind(this);
    this.onTypeAreaKeyUp = this.onTypeAreaKeyUp.bind(this);
    this.onTypeAreaKeyDown = this.onTypeAreaKeyDown.bind(this);
    this.onTypeAreaBlur = this.onTypeAreaBlur.bind(this);
    this.onTypeAreaChange = this.onTypeAreaChange.bind(this);
    this.onTypeAreaSelect = this.onTypeAreaSelect.bind(this);
    this.onCopyCapture = this.onCopyCapture.bind(this);
    this.onPasteCapture = this.onPasteCapture.bind(this);
    this.onCutCapture = this.onCutCapture.bind(this);
    this.state.typedMessage = this.props.initialText || '';
  }

  onEmojiClicked(e, slug) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    slug = slug[0] === ':' || slug.substr(-1) === ':' ? slug : `:${slug}:`;
    const textarea = $('.messages-textarea', this.typingAreaRef.current)[0];
    const cursorPosition = this.getCursorPosition(textarea);
    this.setState({
      typedMessage: this.state.typedMessage.slice(0, cursorPosition) + slug + this.state.typedMessage.slice(cursorPosition)
    }, () => {
      textarea.selectionEnd = cursorPosition + slug.length;
    });
  }

  stoppedTyping() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }

    this.iAmTyping = false;
    this.props.chatRoom.trigger('stoppedTyping');
  }

  typing() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }

    var self = this;
    var now = Date.now();
    delay(this.getReactId(), () => self.iAmTyping && self.stoppedTyping(), 4e3);

    if (!self.iAmTyping || now - self.lastTypingStamp > 4e3) {
      self.iAmTyping = true;
      self.lastTypingStamp = now;
      self.props.chatRoom.trigger('typing');
    }
  }

  triggerOnUpdate(forced) {
    var self = this;

    if (!self.props.onUpdate || !self.isMounted()) {
      return;
    }

    var shouldTriggerUpdate = forced ? forced : false;

    if (!shouldTriggerUpdate && self.state.typedMessage !== self.lastTypedMessage) {
      self.lastTypedMessage = self.state.typedMessage;
      shouldTriggerUpdate = true;
    }

    if (!shouldTriggerUpdate) {
      var $textarea = $('.chat-textarea:visible textarea:visible', self.$container);

      if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
        self._lastTextareaHeight = $textarea.height();
        shouldTriggerUpdate = true;

        if (self.props.onResized) {
          self.props.onResized();
        }
      }
    }

    if (shouldTriggerUpdate) {
      self.props.onUpdate();
    }
  }

  onCancelClicked() {
    var self = this;
    self.setState({
      typedMessage: ""
    });

    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }

    self.onConfirmTrigger(false);
    self.triggerOnUpdate();
  }

  onSaveClicked() {
    var self = this;

    if (self.props.disabled || !self.isMounted()) {
      return;
    }

    var val = $.trim($('.chat-textarea:visible textarea:visible', self.$container).val());

    if (self.onConfirmTrigger(val) !== true) {
      self.setState({
        typedMessage: ""
      });
    }

    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }

    self.triggerOnUpdate();
  }

  onConfirmTrigger(val) {
    const {
      onConfirm,
      persist,
      chatRoom
    } = this.props;
    const result = onConfirm(val);

    if (val !== false && result !== false) {
      const $textareaScrollBlock = $('.textarea-scroll', this.typingAreaRef.current);
      const jsp = $textareaScrollBlock.data('jsp');
      jsp.scrollToY(0);
      $('.jspPane', $textareaScrollBlock).css({
        top: 0
      });
    }

    if (persist) {
      const {
        megaChat
      } = chatRoom;

      if (megaChat.plugins.persistedTypeArea) {
        megaChat.plugins.persistedTypeArea.removePersistedTypedValue(chatRoom);
      }
    }

    return result;
  }

  onTypeAreaKeyDown(e) {
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
        self.setState({
          typedMessage: ""
        });
        $(document).trigger('closeDropdowns');
      }

      e.preventDefault();
      e.stopPropagation();

      if (self.props.chatRoom && self.iAmTyping) {
        self.stoppedTyping();
      }
    }
  }

  onTypeAreaKeyUp(e) {
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
        self.setState({
          typedMessage: content
        });
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

      if (self.prefillMode) {
        return;
      }

      var char = String.fromCharCode(key);

      if (key === 16 || key === 17 || key === 18 || key === 91 || key === 8 || key === 37 || key === 39 || key === 40 || key === 38 || key === 9 || /[\w:-]/.test(char)) {
        var parsedResult = mega.utils.emojiCodeParser(currentContent, currentCursorPos);
        self.setState({
          'emojiSearchQuery': parsedResult[0],
          'emojiStartPos': parsedResult[1],
          'emojiEndPos': parsedResult[2]
        });
        return;
      }

      if (self.state.emojiSearchQuery) {
        self.setState({
          'emojiSearchQuery': false
        });
      }
    }

    self.updateScroll(true);
  }

  onTypeAreaBlur(e) {
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
  }

  onTypeAreaChange(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    var self = this;

    if (self.state.typedMessage !== e.target.value) {
      self.setState({
        typedMessage: e.target.value
      });
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
  }

  focusTypeArea() {
    if (this.props.disabled) {
      return;
    }

    if ($('.chat-textarea:visible textarea:visible', this.typingAreaRef.current).length > 0 && !$('.chat-textarea:visible textarea:visible:first', this.typingAreaRef.current).is(":focus")) {
      moveCursortoToEnd($('.chat-textarea:visible:first textarea', this.typingAreaRef.current)[0]);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    this._lastTextareaHeight = 20;
    this.lastTypedMessage = this.props.initialText || this.lastTypedMessage;
    chatGlobalEventManager.addEventListener('resize', `typingArea${this.getUniqueId()}`, () => this.handleWindowResize());
    $('.jScrollPaneContainer', this.typingAreaRef.current).rebind(`forceResize.typingArea${this.getUniqueId()}`, () => this.updateScroll(false));

    if (!this.scrollingInitialised) {
      this.initScrolling();
    }

    this.triggerOnUpdate(true);
    this.updateScroll(false);
  }

  componentWillMount() {
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

      megaChat.plugins.persistedTypeArea.data.rebind('onChange.typingArea' + self.getUniqueId(), function (e, k, v) {
        if (chatRoom.roomId == k) {
          self.setState({
            'typedMessage': v ? v : ""
          });
          self.triggerOnUpdate(true);
        }
      });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    self.triggerOnUpdate();
    chatGlobalEventManager.removeEventListener('resize', 'typingArea' + self.getUniqueId());
  }

  componentDidUpdate() {
    var self = this;

    if (self.isComponentEventuallyVisible()) {
      if ($(document.querySelector('textarea:focus,select:focus,input:focus')).filter(":visible").length === 0) {
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
      var el = $('.chat-textarea:visible:first textarea:visible', self.$container)[0];
      el.selectionStart = el.selectionEnd = self.onUpdateCursorPosition;
      self.onUpdateCursorPosition = false;
    }
  }

  updateScroll() {
    var self = this;

    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    var $node = self.$node = self.$node || this.typingAreaRef.current;
    var $textarea = self.$textarea = self.$textarea || $('textarea:first', $node);
    var $textareaClone = self.$textareaClone = self.$textareaClone || $('.message-preview', $node);
    var textareaMaxHeight = self.getTextareaMaxHeight();
    var $textareaScrollBlock = self.$textareaScrollBlock = self.$textareaScrollBlock || $('.textarea-scroll', $node);
    var textareaContent = $textarea.val();
    var cursorPosition = self.getCursorPosition($textarea[0]);
    var $textareaCloneSpan;
    var scrPos = 0;
    var viewRatio = 0;

    if (self.lastContent === textareaContent && self.lastPosition === cursorPosition) {
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
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        animateScroll: false
      });
      var textareaIsFocused = $textarea.is(":focus");
      jsp = $textareaScrollBlock.data('jsp');

      if (!textareaIsFocused) {
        moveCursortoToEnd($textarea[0]);
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
    } else if (viewRatio > self.textareaLineHeight || viewRatio < 0) {
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
  }

  getCursorPosition(el) {
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
  }

  onTypeAreaSelect() {
    this.updateScroll(true);
  }

  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }

  handleWindowResize(e) {
    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    if (e) {
      this.updateScroll(false);
    }

    this.triggerOnUpdate();
  }

  isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  }

  resetPrefillMode() {
    this.prefillMode = false;
  }

  onCopyCapture() {
    this.resetPrefillMode();
  }

  onCutCapture() {
    this.resetPrefillMode();
  }

  onPasteCapture() {
    this.resetPrefillMode();
  }

  render() {
    var self = this;
    var room = this.props.chatRoom;
    var buttons = null;

    if (self.props.showButtons === true) {
      buttons = [external_React_default().createElement(ui_buttons.Button, {
        key: "save",
        className: `${"mega-button right"} positive`,
        label: l[776],
        onClick: self.onSaveClicked.bind(self)
      }), external_React_default().createElement(ui_buttons.Button, {
        key: "cancel",
        className: "mega-button right",
        label: l[1718],
        onClick: self.onCancelClicked.bind(self)
      })];
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
      emojiAutocomplete = external_React_default().createElement(EmojiAutocomplete, {
        emojiSearchQuery: self.state.emojiSearchQuery,
        emojiStartPos: self.state.emojiStartPos,
        emojiEndPos: self.state.emojiEndPos,
        typedMessage: self.state.typedMessage,
        onPrefill: function (e, emojiAlias) {
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
        onSelect: function (e, emojiAlias, forceSend) {
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
                self.setState({
                  typedMessage: ""
                });
              }
            }
          }
        },
        onCancel: function () {
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
    var roomTitle = room.getRoomTitle(false, true);

    if (roomTitle[0] === '"' && roomTitle[roomTitle.length - 1] === '"') {
      placeholder = l[18763];
      roomTitle = roomTitle.slice(1, -1);
    }

    placeholder = placeholder.replace("%s", roomTitle);
    var disabledTextarea = room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false;
    return external_React_default().createElement("div", {
      ref: this.typingAreaRef,
      className: `
                    typingarea-component
                    ${this.props.className}
                `
    }, this.state.gifPanelActive && external_React_default().createElement(gifPanel.ZP, {
      chatRoom: this.props.chatRoom,
      onToggle: () => this.setState({
        gifPanelActive: false
      })
    }), external_React_default().createElement("div", {
      className: `
                        chat-textarea
                        ${this.props.className}
                    `
    }, emojiAutocomplete, self.props.children, self.props.editing ? null : external_React_default().createElement(ui_buttons.Button, {
      className: `
                                popup-button
                                gif-button
                                ${this.state.gifPanelActive ? 'active' : ''}
                            `,
      icon: "small-icon gif",
      disabled: this.props.disabled,
      onClick: () => this.setState(state => ({
        gifPanelActive: !state.gifPanelActive
      }))
    }), external_React_default().createElement(ui_buttons.Button, {
      className: "popup-button emoji-button",
      icon: "sprite-fm-theme icon-emoji",
      iconHovered: "sprite-fm-theme icon-emoji-active",
      disabled: this.props.disabled
    }, external_React_default().createElement(emojiDropdown.l, {
      className: "popup emoji",
      vertOffset: 17,
      onClick: this.onEmojiClicked
    })), external_React_default().createElement("hr", null), external_React_default().createElement("div", {
      className: "chat-textarea-scroll textarea-scroll jScrollPaneContainer",
      style: textareaScrollBlockStyles
    }, external_React_default().createElement("div", {
      className: "messages-textarea-placeholder"
    }, self.state.typedMessage ? null : external_React_default().createElement(utils.Emoji, null, placeholder)), external_React_default().createElement("textarea", {
      className: `
                                ${"messages-textarea"}
                                ${disabledTextarea ? 'disabled' : ''}
                            `,
      onKeyUp: this.onTypeAreaKeyUp,
      onKeyDown: this.onTypeAreaKeyDown,
      onBlur: this.onTypeAreaBlur,
      onChange: this.onTypeAreaChange,
      onSelect: this.onTypeAreaSelect,
      onCopyCapture: this.onCopyCapture,
      onPasteCapture: this.onPasteCapture,
      onCutCapture: this.onCutCapture,
      value: self.state.typedMessage,
      style: textareaStyles,
      disabled: disabledTextarea,
      readOnly: disabledTextarea
    }), external_React_default().createElement("div", {
      className: "message-preview"
    }))), buttons);
  }

}, ((0,applyDecoratedDescriptor.Z)(_class.prototype, "updateScroll", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "updateScroll"), _class.prototype), (0,applyDecoratedDescriptor.Z)(_class.prototype, "handleWindowResize", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "handleWindowResize"), _class.prototype)), _class));

/***/ }),

/***/ 204:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"Button": () => (Button)
});
var _extends2__ = __webpack_require__(462);
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _chat_mixins1__ = __webpack_require__(503);



let _buttonGroups = {};
class Button extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.buttonClass = `.button`;
    this.state = {
      focused: false,
      hovered: false,
      iconHovered: ''
    };

    this.onBlur = e => {
      if (!this.isMounted()) {
        return;
      }

      if (!e || !$(e.target).closest(this.buttonClass).is(this.findDOMNode())) {
        this.setState({
          focused: false
        }, () => {
          this.unbindEvents();
          this.safeForceUpdate();
        });
      }
    };

    this.onClick = e => {
      if (this.props.disabled === true) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ($(e.target).closest('.popup').closest(this.buttonClass).is(this.findDOMNode()) && this.state.focused === true) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ($(e.target).is('input, textarea, select')) {
        return;
      }

      if (this.state.focused === false) {
        if (this.props.onClick) {
          this.props.onClick(this, e);
        } else if (react0().Children.count(this.props.children) > 0) {
          this.setState({
            focused: true
          });
        }
      } else if (this.state.focused === true) {
        this.setState({
          focused: false
        });
        this.unbindEvents();
      }
    };

    this.state.iconHovered = this.props.iconHovered || '';
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.disabled === true && nextState.focused === true) {
      nextState.focused = false;
    }

    if (this.state.focused !== nextState.focused && nextState.focused === true) {
      $('.conversationsApp, .join-meeting, .main-blur-block').rebind('mousedown.button' + this.getUniqueId(), this.onBlur);
      $(document).rebind('keyup.button' + this.getUniqueId(), e => {
        if (this.state.focused === true && e.keyCode === 27) {
          this.onBlur();
        }
      });

      if (this._pageChangeListener) {
        mBroadcaster.removeListener(this._pageChangeListener);
      }

      this._pageChangeListener = mBroadcaster.addListener('pagechange', () => {
        if (this.state.focused === true) {
          this.onBlur();
        }
      });
      $(document).rebind('closeDropdowns.' + this.getUniqueId(), () => this.onBlur());

      if (this.props.group) {
        if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] !== this) {
          _buttonGroups[this.props.group].setState({
            focused: false
          });

          _buttonGroups[this.props.group].unbindEvents();
        }

        _buttonGroups[this.props.group] = this;
      }
    }

    if (this.props.group && nextState.focused === false && _buttonGroups[this.props.group] === this) {
      _buttonGroups[this.props.group] = null;
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }

  renderChildren() {
    var self = this;

    if (react0().Children.count(self.props.children) < 1) {
      return null;
    }

    return react0().Children.map(this.props.children, function (child) {
      if (!child) {
        return;
      }

      if (typeof child.type === 'string' || typeof child.type === 'undefined') {
        return child;
      }

      return react0().cloneElement(child, {
        active: self.state.focused,
        closeDropdown: function () {
          self.setState({
            'focused': false
          });
          self.unbindEvents();
        },
        onActiveChange: function (newVal) {
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
  }

  unbindEvents() {
    $(document).off('keyup.button' + this.getUniqueId());
    $(document).off('closeDropdowns.' + this.getUniqueId());
    $('.conversationsApp, .join-meeting, .main-blur-block').unbind('mousedown.button' + this.getUniqueId());

    if (this._pageChangeListener) {
      mBroadcaster.removeListener(this._pageChangeListener);
    }
  }

  render() {
    const {
      className,
      disabled,
      style,
      icon,
      iconHovered,
      label,
      attrs,
      toggle,
      secondLabel,
      secondLabelClass
    } = this.props;
    const isMegaButton = className && className.indexOf('mega-button') > -1;
    const TagName = isMegaButton ? 'button' : 'div';
    return react0().createElement(TagName, (0,_extends2__.Z)({
      className: `
                    button
                    ${className ? className : ''}
                    ${disabled ? 'disabled' : ''}
                    ${this.state.focused ? 'active active-dropdown' : ''}
                `,
      style: style,
      onClick: this.onClick,
      onMouseEnter: () => iconHovered && this.setState({
        hovered: true
      }),
      onMouseLeave: () => iconHovered && this.setState({
        hovered: false
      })
    }, attrs), icon && !isMegaButton && react0().createElement("div", null, react0().createElement("i", {
      className: this.state.hovered ? this.state.iconHovered : icon
    })), icon && isMegaButton && react0().createElement("div", null, react0().createElement("i", {
      className: this.state.hovered ? this.state.iconHovered : icon
    })), label && react0().createElement("span", null, label), secondLabel && react0().createElement("span", {
      className: secondLabelClass ? secondLabelClass : ''
    }, secondLabel), toggle && react0().createElement("div", {
      className: `
                            mega-switch
                            ${toggle.className ? toggle.className : ''}
                            ${toggle.enabled ? 'toggle-on' : ''}
                        `,
      role: "switch",
      "aria-checked": !!toggle.enabled,
      onClick: ev => {
        ev.stopPropagation();

        if (this.props.toggle.onClick) {
          this.props.toggle.onClick();
        }
      }
    }, react0().createElement("div", {
      className: "mega-feature-switch"
    })), this.renderChildren());
  }

}

/***/ }),

/***/ 78:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"Dropdown": () => (Dropdown),
"DropdownContactsSelector": () => (DropdownContactsSelector),
"DropdownItem": () => (DropdownItem)
});
var _utils_jsx0__ = __webpack_require__(79);
var _chat_mixins1__ = __webpack_require__(503);
var _chat_ui_contacts_jsx2__ = __webpack_require__(13);
var React = __webpack_require__(363);




class Dropdown extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.onActiveChange = this.onActiveChange.bind(this);
    this.onResized = this.onResized.bind(this);
  }

  componentWillUpdate(nextProps) {
    if (this.props.active != nextProps.active) {
      this.onActiveChange(nextProps.active);
    }
  }

  specShouldComponentUpdate(nextProps, nextState) {
    if (this.props.active != nextProps.active) {
      if (this.props.onBeforeActiveChange) {
        this.props.onBeforeActiveChange(nextProps.active);
      }

      return true;
    } else if (this.props.focused != nextProps.focused) {
      return true;
    } else if (this.state && this.state.active != nextState.active) {
      return true;
    }

    return undefined;
  }

  onActiveChange(newVal) {
    if (this.props.onActiveChange) {
      this.props.onActiveChange(newVal);
    }
  }

  reposElementUsing(element, obj, info) {
    var $element;

    if (this.popupElement) {
      $element = $(this.popupElement);
    } else {
      return;
    }

    var self = this;
    var vertOffset = 0;
    var horizOffset = 0;

    if (!self.props.noArrow) {
      var $arrow = $('.dropdown-white-arrow', $element);
      var arrowHeight;

      if (self.props.arrowHeight) {
        arrowHeight = self.props.arrowHeight;

        if (info.vertical === "top") {
          arrowHeight = 0;
        } else {
          arrowHeight *= -1;
        }
      } else {
        arrowHeight = $arrow.outerHeight();
      }

      if (info.vertical === "top") {
        $(element).removeClass("down-arrow").addClass("up-arrow");
      } else {
        $(element).removeClass("up-arrow").addClass("down-arrow");
      }

      vertOffset += info.vertical === "top" ? arrowHeight : 0;
    }

    if (self.props.vertOffset) {
      vertOffset += self.props.vertOffset * (info.vertical === "top" ? 1 : -1);
    }

    if (self.props.horizOffset) {
      horizOffset += self.props.horizOffset;
    }

    $(element).css({
      left: obj.left + 0 + horizOffset + 'px',
      top: obj.top + vertOffset + 'px'
    });

    if (this.props.positionLeft) {
      $(element).css({
        left: this.props.positionLeft
      });
    }
  }

  onResized() {
    var self = this;

    if (this.props.active === true && this.popupElement) {
      var $element = $(this.popupElement);
      var $positionToElement = $('.button.active-dropdown:visible');

      if ($positionToElement.length === 0) {
        return;
      }

      var $container = $positionToElement.closest('.messages.scroll-area');

      if ($container.length === 0) {
        $container = $(document.body);
      }

      $element.css('margin-left', '');
      $element.position({
        of: $positionToElement,
        my: self.props.positionMy ? self.props.positionMy : "center top",
        at: self.props.positionAt ? self.props.positionAt : "center bottom",
        collision: "flipfit",
        within: $container,
        using: function (obj, info) {
          self.reposElementUsing(this, obj, info);
        }
      });
    }
  }

  componentDidMount() {
    super.componentDidMount();
    chatGlobalEventManager.addEventListener('resize', 'drpdwn' + this.getUniqueId(), this.onResized.bind(this));
    this.onResized();
    var self = this;
    $(document.body).rebind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId(), function (e, target) {
      if (self.props.active && target !== self) {
        if (self.props && self.props.closeDropdown) {
          self.props.closeDropdown();
        }
      }
    });
  }

  componentDidUpdate() {
    this.onResized();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    $(document.body).unbind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId());

    if (this.props.active) {
      this.onActiveChange(false);
    }

    chatGlobalEventManager.removeEventListener('resize', 'drpdwn' + this.getUniqueId());
  }

  doRerender() {
    var self = this;
    setTimeout(function () {
      self.safeForceUpdate();
    }, 100);
    setTimeout(function () {
      self.onResized();
    }, 200);
  }

  renderChildren() {
    var self = this;
    return React.Children.map(this.props.children, function (child) {
      if (child) {
        var activeVal = self.props.active || self.state.active;
        activeVal = String(activeVal);
        return React.cloneElement(child, {
          active: activeVal
        });
      }

      return null;
    });
  }

  render() {
    if (this.props.active !== true) {
      return null;
    }

    var classes = "dropdown body " + (this.props.noArrow ? "" : "dropdown-arrow up-arrow") + " " + this.props.className;
    var styles;

    if (this.popupElement) {
      styles = {
        'zIndex': 123,
        'position': 'absolute',
        'width': this.props.styles ? this.props.styles.width : undefined
      };
    }

    var self = this;
    var child = null;

    if (this.props.children) {
      child = React.createElement("div", null, self.renderChildren());
    } else if (this.props.dropdownItemGenerator) {
      child = this.props.dropdownItemGenerator(this);
    }

    if (!child && !this.props.forceShowWhenEmpty) {
      if (this.props.active !== false) {
        queueMicrotask(function () {
          self.onActiveChange(false);
        });
      }

      return null;
    }

    return React.createElement(_utils_jsx0__["default"].RenderTo, {
      element: document.body,
      className: classes,
      style: styles,
      popupDidMount: popupElement => {
        self.popupElement = popupElement;
        self.onResized();
      },
      popupWillUnmount: () => {
        delete self.popupElement;
      }
    }, React.createElement("div", {
      onClick: function () {
        $(document.body).trigger('closeAllDropdownsExcept', self);
      }
    }, this.props.noArrow ? null : React.createElement("i", {
      className: "dropdown-white-arrow"
    }), child));
  }

}
Dropdown.defaultProps = {
  'requiresUpdateOnResize': true
};
class DropdownContactsSelector extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.state = {
      'selected': this.props.selected ? this.props.selected : []
    };
    this.onSelectClicked = this.onSelectClicked.bind(this);
    this.onSelected = this.onSelected.bind(this);
  }

  specShouldComponentUpdate(nextProps, nextState) {
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
  }

  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }

    this.forceUpdate();
  }

  onSelectClicked() {
    this.props.onSelectClicked();
  }

  render() {
    var self = this;
    return React.createElement(Dropdown, {
      className: "popup contacts-search " + this.props.className + " tooltip-blur",
      active: this.props.active,
      closeDropdown: this.props.closeDropdown,
      ref: function (r) {
        self.dropdownRef = r;
      },
      positionMy: this.props.positionMy,
      positionAt: this.props.positionAt,
      arrowHeight: this.props.arrowHeight,
      vertOffset: this.props.vertOffset,
      noArrow: true
    }, React.createElement(_chat_ui_contacts_jsx2__.ContactPickerWidget, {
      onClose: this.props.closeDropdown,
      onEventuallyUpdated: () => {
        var _self$dropdownRef;

        (_self$dropdownRef = self.dropdownRef) == null ? void 0 : _self$dropdownRef.doRerender();
      },
      active: this.props.active,
      className: "popup contacts-search tooltip-blur small-footer",
      contacts: M.u,
      selectFooter: this.props.selectFooter,
      megaChat: this.props.megaChat,
      exclude: this.props.exclude,
      allowEmpty: this.props.allowEmpty,
      multiple: this.props.multiple,
      showTopButtons: this.props.showTopButtons,
      showAddContact: this.props.showAddContact,
      onSelectDone: this.props.onSelectDone,
      multipleSelectedButtonLabel: this.props.multipleSelectedButtonLabel,
      singleSelectedButtonLabel: this.props.singleSelectedButtonLabel,
      nothingSelectedButtonLabel: this.props.nothingSelectedButtonLabel
    }));
  }

}
DropdownContactsSelector.defaultProps = {
  requiresUpdateOnResize: true
};
class DropdownItem extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.state = {
      'isClicked': false
    };
    this.onClick = this.onClick.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
  }

  renderChildren() {
    var self = this;
    return React.Children.map(this.props.children, function (child) {
      var props = {
        active: self.state.isClicked,
        closeDropdown: function () {
          self.setState({
            'isClicked': false
          });
        }
      };
      return React.cloneElement(child, props);
    });
  }

  onClick(ev) {
    const {
      children,
      onClick
    } = this.props;

    if (children) {
      ev.stopPropagation();
      ev.preventDefault();
      this.setState({
        isClicked: !this.state.isClicked
      });
    }

    $(document).trigger('closeDropdowns');
    return onClick && onClick(ev);
  }

  onMouseOver(e) {
    if (this.props.submenu) {
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
  }

  render() {
    const {
      className,
      disabled,
      label,
      icon,
      submenu
    } = this.props;
    return React.createElement("div", {
      className: `
                    dropdown-item
                    ${className ? className : ''}
                    ${submenu ? 'contains-submenu' : ''}
                    ${disabled ? 'disabled' : ''}
                `,
      onClick: disabled ? undefined : ev => this.onClick(ev),
      onMouseOver: this.onMouseOver
    }, icon && React.createElement("i", {
      className: icon
    }), label && React.createElement("span", null, label), submenu ? React.createElement("i", {
      className: "sprite-fm-mono icon-arrow-right submenu-icon"
    }) : '', React.createElement("div", null, this.renderChildren()));
  }

}
DropdownItem.defaultProps = {
  requiresUpdateOnResize: true
};

/***/ }),

/***/ 768:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"l": () => (DropdownEmojiSelector)
});
var _extends1__ = __webpack_require__(462);
var _chat_mixins0__ = __webpack_require__(503);


var React = __webpack_require__(363);

var utils = __webpack_require__(79);



var DropdownsUI = __webpack_require__(78);

var PerfectScrollbar = (__webpack_require__(285).F);

class DropdownEmojiSelector extends _chat_mixins0__.wl {
  constructor(props) {
    super(props);
    this.emojiSearchField = React.createRef();
    this.data_categories = null;
    this.data_emojis = null;
    this.data_emojiByCategory = null;
    this.customCategoriesOrder = ["frequently_used", "people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
    this.frequentlyUsedEmojis = ['slight_smile', 'grinning', 'smile', 'rofl', 'wink', 'yum', 'rolling_eyes', 'stuck_out_tongue', 'smiling_face_with_3_hearts', 'kissing_heart', 'sob', 'mask', 'eyes', 'thumbsup', 'pray', 'wave', 'white_check_mark', 'sparkles'];
    this.heightDefs = {
      'categoryTitleHeight': 55,
      'emojiRowHeight': 35,
      'containerHeight': 302,
      'totalScrollHeight': 302,
      'numberOfEmojisPerRow': 9
    };
    this.categoryLabels = {
      'frequently_used': l[17737],
      'people': l[8016],
      'objects': l[17735],
      'activity': l[8020],
      'nature': l[8017],
      'travel': l[8021],
      'symbols': l[17736],
      'food': l[8018],
      'flags': l[17703]
    };
    this.state = this.getInitialState();
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onUserScroll = this.onUserScroll.bind(this);
    this._onScrollChanged = this._onScrollChanged.bind(this);
  }

  getInitialState() {
    return clone({
      'previewEmoji': null,
      'searchValue': '',
      'browsingCategory': false,
      'isActive': false,
      'isLoading': true,
      'loadFailed': false,
      'visibleCategories': "0"
    });
  }

  _generateEmoji(meta) {
    var filename = twemoji.convert.toCodePoint(meta.u);
    return React.createElement("img", {
      width: "20",
      height: "20",
      className: "emoji emoji-loading",
      draggable: "false",
      alt: meta.u,
      title: ":" + meta.n + ":",
      onLoad: e => {
        e.target.classList.remove('emoji-loading');
      },
      onError: e => {
        e.target.classList.remove('emoji-loading');
        e.target.classList.add('emoji-loading-error');
      },
      src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
    });
  }

  _generateEmojiElement(emoji, cat) {
    var self = this;
    var categoryName = self.data_categories[cat];
    return React.createElement("div", {
      "data-emoji": emoji.n,
      className: "button square-button emoji",
      key: categoryName + "_" + emoji.n,
      onMouseEnter: e => {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }

        e.stopPropagation();
        e.preventDefault();
        self.mouseEnterTimer = setTimeout(function () {
          self.setState({
            'previewEmoji': emoji
          });
        }, 250);
      },
      onMouseLeave: e => {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }

        e.stopPropagation();
        e.preventDefault();
        self.setState({
          'previewEmoji': null
        });
      },
      onClick: e => {
        if (self.props.onClick) {
          self.props.onClick(e, emoji.n, emoji);
          $(document).trigger('closeDropdowns');
        }
      }
    }, self._generateEmoji(emoji));
  }

  componentWillUpdate(nextProps, nextState) {
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

            self.setState({
              'loadFailed': true,
              'isLoading': false
            });
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

          self.setState({
            'isLoading': false
          });
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
  }

  onSearchChange(e) {
    var self = this;
    self.setState({
      searchValue: e.target.value,
      browsingCategory: false
    });
  }

  onUserScroll($ps) {
    if (this.state.browsingCategory) {
      var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');

      if (!elementInViewport($cat)) {
        this.setState({
          'browsingCategory': false
        });
      }
    }

    this._onScrollChanged($ps.getScrollPositionY());
  }

  generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
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
      return self._cachedNodes[categoryId] = [totalHeight, React.createElement("div", {
        key: categoryName,
        "data-category-name": categoryName,
        className: "emoji-category-container",
        style: {
          'position': 'absolute',
          'top': posTop
        }
      }, emojis.length > 0 ? React.createElement("div", {
        className: "clear"
      }) : null, React.createElement("div", {
        className: "emoji-type-txt"
      }, self.categoryLabels[categoryName] ? self.categoryLabels[categoryName] : categoryName), React.createElement("div", {
        className: "clear"
      }), emojis, React.createElement("div", {
        className: "clear"
      }))];
    } else {
      return self._cachedNodes[categoryId] = undefined;
    }
  }

  _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
    var visibleTop = elTop < scrollTop ? scrollTop : elTop;
    var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
    return visibleBottom - visibleTop > 0;
  }

  _onScrollChanged(scrollPositionY, stateObj) {
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

    stateObj.searchValue;
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

    if (self._emojiReactElements.length === 0) {
      const emojisNotFound = React.createElement("span", {
        className: "emojis-not-found",
        key: 'emojis-not-found'
      }, l[20920]);

      self._emojiReactElements.push(emojisNotFound);
    }

    visibleCategories = visibleCategories.join(',');
    self.setState({
      'totalScrollHeight': currentPos,
      'visibleCategories': visibleCategories
    });
  }

  _renderEmojiPickerPopup() {
    var self = this;
    var preview;

    if (self.state.previewEmoji) {
      var meta = self.state.previewEmoji;
      var slug = meta.n;

      if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {}

      preview = React.createElement("div", {
        className: "emoji-preview"
      }, self._generateEmoji(meta), React.createElement("div", {
        className: "emoji title"
      }, ":" + meta.n + ":"));
    }

    var categoryIcons = {
      "frequently_used": "icon-emoji-type-frequent",
      "people": "icon-emoji-type-people",
      "nature": "icon-emoji-type-nature",
      "food": "icon-emoji-type-food",
      "activity": "icon-emoji-type-activity",
      "travel": "icon-emoji-type-travel",
      "objects": "icon-emoji-type-objects",
      "symbols": "icon-emoji-type-symbol",
      "flags": "icon-emoji-type-flag"
    };
    var categoryButtons = [];
    var activeCategoryName = false;

    if (!self.state.searchValue) {
      var firstActive = self.state.visibleCategories.split(",")[0];

      if (firstActive) {
        activeCategoryName = self.data_categories[firstActive];
      }
    }

    self.customCategoriesOrder.forEach(categoryName => {
      categoryButtons.push(React.createElement("div", {
        visiblecategories: this.state.visibleCategories,
        className: `
                        button square-button emoji
                        ${activeCategoryName === categoryName ? 'active' : ''}
                    `,
        key: categoryIcons[categoryName],
        onClick: e => {
          var _this$emojiSearchFiel;

          e.stopPropagation();
          e.preventDefault();
          this.setState({
            browsingCategory: categoryName,
            searchValue: ''
          });
          this._cachedNodes = {};
          const categoryPosition = this.data_categoryPositions[this.data_categories.indexOf(categoryName)] + 10;
          this.scrollableArea.scrollToY(categoryPosition);

          this._onScrollChanged(categoryPosition);

          (_this$emojiSearchFiel = this.emojiSearchField) == null ? void 0 : _this$emojiSearchFiel.current.focus();
        }
      }, React.createElement("i", {
        className: `sprite-fm-mono ${categoryIcons[categoryName]}`
      })));
    });
    return React.createElement(React.Fragment, null, React.createElement("div", {
      className: "popup-header emoji"
    }, preview || React.createElement("div", {
      className: "search-block emoji"
    }, React.createElement("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), React.createElement("input", {
      ref: this.emojiSearchField,
      type: "search",
      placeholder: l[102],
      onChange: this.onSearchChange,
      autoFocus: true,
      value: this.state.searchValue
    }))), React.createElement(PerfectScrollbar, {
      className: "popup-scroll-area emoji perfectScrollbarContainer",
      searchValue: this.state.searchValue,
      onUserScroll: this.onUserScroll,
      visibleCategories: this.state.visibleCategories,
      ref: ref => {
        this.scrollableArea = ref;
      }
    }, React.createElement("div", {
      className: "popup-scroll-content emoji"
    }, React.createElement("div", {
      style: {
        height: this.state.totalScrollHeight
      }
    }, this._emojiReactElements))), React.createElement("div", {
      className: "popup-footer emoji"
    }, categoryButtons));
  }

  render() {
    var self = this;
    var popupContents = null;

    if (self.state.isActive === true) {
      if (self.state.loadFailed === true) {
        popupContents = React.createElement("div", {
          className: "loading"
        }, l[1514]);
      } else if (self.state.isLoading === true && !self.data_emojiByCategory) {
        popupContents = React.createElement("div", {
          className: "loading"
        }, l[5533]);
      } else {
        popupContents = self._renderEmojiPickerPopup();
      }
    } else {
      popupContents = null;
    }

    return React.createElement(DropdownsUI.Dropdown, (0,_extends1__.Z)({
      className: "popup emoji"
    }, self.props, {
      ref: "dropdown",
      isLoading: self.state.isLoading,
      loadFailed: self.state.loadFailed,
      visibleCategories: this.state.visibleCategories,
      forceShowWhenEmpty: true,
      onActiveChange: newValue => {
        if (newValue === false) {
          self.setState(self.getInitialState());
          self._cachedNodes = {};

          self._onScrollChanged(0);
        } else {
          self.setState({
            'isActive': true
          });
        }

        if (self.props.onActiveChange) {
          self.props.onActiveChange(newValue);
        }
      },
      searchValue: self.state.searchValue,
      browsingCategory: self.state.browsingCategory,
      previewEmoji: self.state.previewEmoji
    }), popupContents);
  }

}
DropdownEmojiSelector.defaultProps = {
  'requiresUpdateOnResize': true,
  'hideable': true
};

/***/ }),

/***/ 773:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (__WEBPACK_DEFAULT_EXPORT__)
});
var _chat_mixins0__ = __webpack_require__(503);
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);

var utils = __webpack_require__(79);



class Checkbox extends _chat_mixins0__.wl {
  constructor(props) {
    super(props);
    this.state = {
      checked: this.props.checked ? this.props.checked : false
    };
    this.onLabelClick = this.onLabelClick.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  onLabelClick(e) {
    var state = !this.state.checked;
    this.setState({
      'checked': state
    });

    if (this.props.onLabelClick) {
      this.props.onLabelClick(e, state);
    }

    this.onChange(e);
  }

  onChange(e) {
    if (this.props.onChange) {
      this.props.onChange(e, this.state.checked);
    }
  }

  render() {
    var className = this.state.checked ? "checkboxOn" : "checkboxOff";
    return React.createElement("div", {
      className: "formsCheckbox"
    }, React.createElement("div", {
      className: "checkdiv " + className,
      onClick: this.onLabelClick
    }, React.createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.id,
      className: className,
      checked: this.state.checked,
      onChange: this.onChange
    })), React.createElement("label", {
      htmlFor: this.props.id,
      className: "radio-txt"
    }, this.props.children));
  }

}

const __WEBPACK_DEFAULT_EXPORT__ = ({
  Checkbox
});

/***/ }),

/***/ 61:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (FMView)
});

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(363);
var external_React_default = __webpack_require__.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(462);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(229);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(285);
;// CONCATENATED MODULE: ./js/ui/jsx/megaList/megaList2.jsx



var _dec, _class;




let MegaList2 = (_dec = (0,mixins.M9)(30, true), (_class = class MegaList2 extends mixins.wl {
  constructor(props) {
    super(props);
    this._calculated = false;
    this._firstRender = true;
    this.customIsEventuallyVisible = true;
    this.requiresUpdateOnResize = true;
    this.adapterChangedDoRepaint = false;
    assert(props.listAdapter, 'missing `listAdapter` for MegaList2');
    assert(props.nodeAdapter, 'missing `nodeAdapter` for MegaList2');
    assert(props.entries, 'missing `entries` for MegaList2');
    this.options = {
      extraRows: 8,
      batchPages: 0,
      perfectScrollOptions: {
        'handlers': ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
        'minScrollbarLength': 20
      }
    };
    this.onPsUserScroll = this.onPsUserScroll.bind(this);
    this.thumbsLoadingHandlers = new MapSet();
    this.thumbsThatRequireLoading = new MapSet();
    this.requestThumbnailCb = this.requestThumbnailCb.bind(this);
  }

  specShouldComponentUpdate(nextProps) {
    let invalidate = false;

    if (nextProps.listAdapter.prototype.constructor.name !== this.props.listAdapter.prototype.constructor.name || nextProps.entries !== this.props.entries || nextProps.viewMode !== this.props.viewMode) {
      invalidate = true;
    }

    if (nextProps.sortBy !== this.props.sortBy || nextProps.currentlyViewedEntry !== this.props.currentlyViewedEntry) {
      invalidate = true;
      this.ps.scrollToY(0);
    }

    if (invalidate) {
      this._calculated = false;
      this.adapterChangedDoRepaint = true;
      return true;
    }

    return null;
  }

  _recalculate() {
    if (this._calculated) {
      return this._calculated;
    }

    var calculated = this._calculated = Object.create(null);
    lazy(calculated, 'scrollWidth', () => {
      return this.ps.getClientWidth();
    });
    lazy(calculated, 'scrollHeight', () => this.ps.getClientHeight() - calculated.headerHeight);
    lazy(calculated, 'itemWidth', () => {
      if (this.props.listAdapter.itemWidth === false) {
        return calculated.scrollWidth;
      }

      return this.props.listAdapter.itemWidth;
    });
    lazy(calculated, 'itemHeight', () => {
      return this.props.itemHeight || this.props.listAdapter.itemHeight;
    });
    lazy(calculated, 'headerHeight', () => this.props.headerHeight || 0);
    lazy(calculated, 'contentWidth', () => {
      var contentWidth = this.ps.getContentWidth();

      if (contentWidth) {
        return contentWidth;
      }

      return calculated.itemWidth;
    });
    lazy(calculated, 'itemsPerRow', () => {
      if (this.props.listAdapter.itemsPerRow) {
        return this.props.listAdapter.itemsPerRow;
      }

      return Math.max(1, Math.floor(calculated.contentWidth / calculated.itemWidth));
    });
    lazy(calculated, 'contentHeight', () => {
      return Math.ceil(this.props.entries.length / calculated.itemsPerRow) * calculated.itemHeight;
    });
    lazy(calculated, 'scrollLeft', () => {
      return this.ps.getScrollPositionX();
    });
    lazy(calculated, 'scrollTop', () => {
      if (this.adapterChangedDoRepaint) {
        return 0;
      }

      return this.ps.getScrollPositionY();
    });
    lazy(calculated, 'scrolledPercentX', () => {
      return 100 / calculated.scrollWidth * calculated.scrollLeft;
    });
    lazy(calculated, 'scrolledPercentY', () => {
      return 100 / calculated.scrollHeight * calculated.scrollTop;
    });
    lazy(calculated, 'isAtTop', () => {
      return calculated.scrollTop === 0;
    });
    lazy(calculated, 'isAtBottom', () => {
      return calculated.scrollTop === calculated.scrollHeight;
    });
    lazy(calculated, 'itemsPerPage', () => {
      return Math.ceil(calculated.scrollHeight / calculated.itemHeight) * calculated.itemsPerRow;
    });
    lazy(calculated, 'visibleFirstItemNum', () => {
      var value = 0;
      value = Math.floor(Math.floor(calculated.scrollTop / calculated.itemHeight) * calculated.itemsPerRow);

      if (value > 0) {
        value = Math.max(0, value - this.options.extraRows * calculated.itemsPerRow);
      }

      return value;
    });
    lazy(calculated, 'visibleLastItemNum', () => {
      var value = Math.min(this.props.entries.length, Math.ceil(Math.ceil(calculated.scrollTop / calculated.itemHeight) * calculated.itemsPerRow + calculated.itemsPerPage));

      if (value < this.props.entries.length) {
        value = Math.min(this.props.entries.length, value + this.options.extraRows * calculated.itemsPerRow);
      }

      return value;
    });

    if (this.options.batchPages > 0) {
      var perPage = calculated.itemsPerPage;
      var visibleF = calculated.visibleFirstItemNum;
      calculated.visibleFirstItemNum = Math.max(0, ((visibleF - visibleF % perPage) / perPage - 1 - this.options.batchPages) * perPage);
      var visibleL = calculated.visibleLastItemNum;
      calculated.visibleLastItemNum = Math.min(this.props.entries.length, ((visibleL - visibleL % perPage) / perPage + 1 + this.options.batchPages) * perPage);
    }

    Object.defineProperty(M, 'rmItemsInView', {
      get: () => {
        const c = this.ps && this._calculated || !1;
        return c.itemsPerPage + c.itemsPerRow | 0;
      },
      configurable: true
    });
  }

  _contentUpdated() {
    this._calculated = false;

    this._recalculate();

    if (this.listContent && this._lastContentHeight !== this._calculated.contentHeight) {
      this._lastContentHeight = this._calculated.contentHeight;
      this.listContent.style.height = this._calculated.contentHeight + "px";
    }

    if (this.ps && this._calculated.scrollHeight + this._calculated.scrollTop > this._calculated.contentHeight) {
      this.ps.scrollToY(this._calculated.contentHeight - this._calculated.scrollHeight);
    }

    if (this.listAdapterInstance && this.listAdapterInstance.onContentUpdated) {
      this.listAdapterInstance.onContentUpdated();
    }
  }

  _getCalcsThatTriggerChange() {
    return [this.props.entries.length, this._calculated.scrollHeight, this._calculated.itemWidth, this._calculated.itemHeight, this._calculated.contentWidth, this._calculated.itemsPerRow, this._calculated.contentHeight, this._calculated.visibleFirstItemNum, this._calculated.visibleLastItemNum];
  }

  indexOfEntry(nodeHandle, prop) {
    prop = prop || 'h';

    for (let i = 0; i < this.props.entries.length; i++) {
      let entry = this.props.entries[i];

      if (entry[prop] === nodeHandle) {
        return i;
      }
    }

    return -1;
  }

  scrollToItem(nodeHandle) {
    var elementIndex = this.indexOfEntry(nodeHandle);

    if (elementIndex === -1) {
      return false;
    }

    var shouldScroll = false;

    var itemOffsetTop = Math.floor(elementIndex / this._calculated.itemsPerRow) * this._calculated.itemHeight;

    var itemOffsetTopPlusHeight = itemOffsetTop + this._calculated.itemHeight;

    if (itemOffsetTop < this._calculated.scrollTop || itemOffsetTopPlusHeight > this._calculated.scrollTop + this._calculated.scrollHeight) {
      shouldScroll = true;
    }

    if (shouldScroll) {
      this.ps.scrollToY(itemOffsetTop);
      onIdle(() => {
        this.safeForceUpdate();
      });
      return true;
    }

    return false;
  }

  onPsUserScroll() {
    if (!this.isMounted()) {
      return;
    }

    let oldCalc = JSON.stringify(this._getCalcsThatTriggerChange());

    this._contentUpdated();

    let newCalc = JSON.stringify(this._getCalcsThatTriggerChange());

    if (oldCalc !== newCalc) {
      this.forceUpdate();
    }
  }

  onResizeDoUpdate() {
    super.onResizeDoUpdate();

    this._contentUpdated();
  }

  componentDidMount() {
    super.componentDidMount();

    this._contentUpdated();

    this.forceUpdate();
  }

  componentDidUpdate() {
    super.componentDidUpdate();

    this._contentUpdated();

    if (this.adapterChangedDoRepaint) {
      this.adapterChangedDoRepaint = false;
      this._calculated = false;

      this._recalculate();
    }

    if (this.thumbsThatRequireLoading.size) {
      delay('chat:mega-list2:thumb-loader', () => this.enqueueThumbnailRetrieval(), 20);
    }

    this._firstRender = this._firstRender || this.props.viewmode !== M.viewmode;

    if (this._firstRender && this.ps) {
      this._firstRender = false;
      Ps.update(this.ps.findDOMNode());
    }
  }

  enqueueThumbnailRetrieval() {
    const loaders = new Map(this.thumbsLoadingHandlers);
    const nodes = new Map(this.thumbsThatRequireLoading);
    const pending = [];

    const defaultCallback = (n, src, id) => {
      let img = document.getElementById(id || `chat_${n.h}`);

      if (img && (img = img.querySelector('img'))) {
        var _img$parentNode$paren;

        img.src = src;
        (_img$parentNode$paren = img.parentNode.parentNode) == null ? void 0 : _img$parentNode$paren.classList.add('thumb');
      }
    };

    const setSource = n => {
      if (thumbnails.has(n.fa)) {
        const src = thumbnails.get(n.fa);
        const batch = [...nodes.get(n.fa)];

        for (var i = batch.length; i--;) {
          const n = batch[i];
          const handlers = [...loaders.get(n.h)];

          for (let i = handlers.length; i--;) {
            let callback = handlers[i];

            if (typeof callback !== 'function') {
              callback = defaultCallback;
            }

            tryCatch(() => {
              const id = callback(n, src);

              if (id) {
                defaultCallback(n, src, id);
              }
            })();
          }
        }

        return true;
      }
    };

    for (const [, [n]] of nodes) {
      if (!setSource(n)) {
        pending.push(n);
      }
    }

    if (pending.length) {
      fm_thumbnails('standalone', pending, setSource);
    }

    this.thumbsLoadingHandlers.clear();
    this.thumbsThatRequireLoading.clear();
  }

  requestThumbnailCb(node, immediate, callback) {
    if (node && node.fa) {
      if (typeof immediate === 'function') {
        callback = immediate;
        immediate = 0;
      }

      node.seen = node.seen || -7;
      this.thumbsLoadingHandlers.set(node.h, callback);
      this.thumbsThatRequireLoading.set(node.fa, node);
      delay('chat:mega-list2:thumb-loader', () => this.enqueueThumbnailRetrieval(), immediate || 480);
    }
  }

  render() {
    if (this.isMounted() && !this._calculated) {
      this._recalculate();
    }

    let {
      listAdapter,
      listAdapterOpts,
      entries,
      nodeAdapterProps,
      viewMode,
      header,
      onContextMenu
    } = this.props;
    let className = listAdapter.containerClassName + " megaList megaList2";
    var first = this._calculated.visibleFirstItemNum;
    var last = this._calculated.visibleLastItemNum;
    let nodes = [];

    for (var i = first; i < last; i++) {
      let node = entries[i];
      nodes.push(external_React_default().createElement(this.props.nodeAdapter, (0,esm_extends.Z)({
        key: i + "_" + node[this.props.keyProp],
        h: node[this.props.keyProp],
        index: i,
        megaList: this,
        listAdapter: listAdapter,
        node: node,
        calculated: this._calculated,
        listAdapterOpts: listAdapterOpts,
        onContextMenu: onContextMenu,
        selected: this.props.selected ? this.props.selected.indexOf(node[this.props.keyProp]) > -1 : false,
        highlighted: this.props.highlighted ? this.props.highlighted.indexOf(node[this.props.keyProp]) > -1 : false,
        requestThumbnailCb: this.requestThumbnailCb,
        keyProp: this.props.keyProp || 'h'
      }, nodeAdapterProps)));
    }

    let listAdapterName = listAdapter.prototype.constructor.name;
    return external_React_default().createElement((external_React_default()).Fragment, null, external_React_default().createElement(perfectScrollbar.F, {
      key: "ps_" + listAdapterName + "_" + viewMode,
      options: this.options.perfectScrollOptions,
      onUserScroll: this.onPsUserScroll,
      className: className,
      style: {
        'position': 'relative'
      },
      ref: instance => {
        this.ps = instance;
      }
    }, external_React_default().createElement(this.props.listAdapter, (0,esm_extends.Z)({
      containerClassName: this.props.containerClassName,
      key: "ps_" + listAdapterName + "_" + this.props.viewMode + "_la",
      ref: listAdapterInstance => {
        this.listAdapterInstance = listAdapterInstance;
      },
      listContentRef: listContent => {
        this.listContent = listContent;
      },
      header: header,
      megaList: this,
      calculated: this._calculated
    }, listAdapterOpts), nodes)));
  }

}, ((0,applyDecoratedDescriptor.Z)(_class.prototype, "onPsUserScroll", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "onPsUserScroll"), _class.prototype)), _class));
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx + 1 modules
var genericNodePropsComponent = __webpack_require__(297);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/genericGrid.jsx


class GenericGrid extends genericNodePropsComponent.L {
  render() {
    let {
      node,
      calculated,
      index,
      listAdapter,
      className,
      keyProp
    } = this.props;
    let style = {};
    listAdapter.repositionItem(node, calculated, index, style);
    let image = null;
    let src = null;
    let isThumbClass = "";

    if (node.fa && (is_image2(node) || is_video(node))) {
      src = thumbnails.get(node.fa);

      if (!src) {
        this.props.requestThumbnailCb(node);
        src = window.noThumbURI || '';
      }

      image = src ? external_React_default().createElement("img", {
        alt: "",
        src: src
      }) : external_React_default().createElement("img", {
        alt: ""
      });
      isThumbClass = " thumb";
    } else {
      image = external_React_default().createElement("img", null);
    }

    let fileStatusClass = "";

    if (node.fav) {
      fileStatusClass += " icon-favourite-filled";
    }

    return external_React_default().createElement("a", {
      className: "data-block-view megaListItem ui-droppable ui-draggable ui-draggable-handle " + this.nodeProps.classNames.join(" ") + (className && className(node) || ""),
      id: "chat_" + node[keyProp],
      onClick: e => {
        this.props.onClick(e, this.props.node);
      },
      onDoubleClick: e => {
        this.props.onDoubleClick(e, this.props.node);
      },
      title: this.nodeProps.title,
      style: style
    }, external_React_default().createElement("span", {
      className: "data-block-bg " + isThumbClass
    }, external_React_default().createElement("span", {
      className: "data-block-indicators"
    }, external_React_default().createElement("span", {
      className: "file-status-icon indicator sprite-fm-mono" + fileStatusClass
    }), external_React_default().createElement("span", {
      className: "versioning-indicator"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-versions-previous"
    })), external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-link"
    })), external_React_default().createElement("span", {
      className: "block-view-file-type " + this.nodeProps.icon
    }, image), external_React_default().createElement("div", {
      className: "video-thumb-details"
    }, external_React_default().createElement("i", {
      className: "small-icon small-play-icon"
    }), external_React_default().createElement("span", null, "00:00"))), external_React_default().createElement("span", {
      className: "file-block-title"
    }, this.nodeProps.title));
  }

}
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/genericTable.jsx



class GenericTableHeader extends mixins.wl {
  render() {
    let {
      sortBy,
      columns
    } = this.props;
    let columnsRendered = [];

    for (let i = 0; i < columns.length; i++) {
      var _colProps;

      let col = columns[i];
      let colProps;

      if (Array.isArray(col)) {
        colProps = col[1];
        col = col[0];
      }

      let sortable;

      if (col.sortable) {
        let classes = "";

        if (sortBy[0] === col.id) {
          const ordClass = sortBy[1] === "desc" ? "icon-arrow-down" : "icon-arrow-up";
          classes = `${classes} ${ordClass}`;
        }

        if (col.id === 'fav') {
          classes += ' hidden';
        }

        sortable = external_React_default().createElement("i", {
          className: `sprite-fm-mono ${col.id} ${classes}`
        });
      }

      columnsRendered.push(external_React_default().createElement("th", {
        megatype: col.megatype,
        className: col.headerClassName || col.megatype || "",
        key: col.id + "_" + i,
        onClick: e => {
          e.preventDefault();

          if (col.sortable) {
            this.props.onClick(col.id);
          }
        }
      }, external_React_default().createElement("span", null, ((_colProps = colProps) == null ? void 0 : _colProps.label) || col.label), col.icon && external_React_default().createElement("i", {
        className: "sprite-fm-mono " + col.icon
      }), sortable));
    }

    return external_React_default().createElement("thead", null, external_React_default().createElement("tr", null, columnsRendered));
  }

}
class GenericTable extends genericNodePropsComponent.L {
  render() {
    var _this$nodeProps;

    let {
      node,
      index,
      listAdapterOpts,
      className,
      keyProp
    } = this.props;
    let columns = [];

    for (let i = 0; i < listAdapterOpts.columns.length; i++) {
      let customColumn = listAdapterOpts.columns[i];

      if (Array.isArray(customColumn)) {
        columns.push(external_React_default().createElement(customColumn[0], { ...customColumn[1],
          'nodeAdapter': this,
          'h': node[keyProp],
          'node': node,
          'key': i + "_" + customColumn[0].prototype.constructor.name,
          'keyProp': keyProp
        }));
      } else {
        columns.push(external_React_default().createElement(customColumn, {
          'nodeAdapter': this,
          'h': node[keyProp],
          'node': node,
          'key': i + "_" + customColumn.prototype.constructor.name,
          'keyProp': keyProp
        }));
      }
    }

    let listClassName = listAdapterOpts.className;
    return external_React_default().createElement("tr", {
      className: "node_" + node[keyProp] + " " + (className && className(node) || "") + " " + (listClassName && listClassName(node) || "") + " " + ((_this$nodeProps = this.nodeProps) == null ? void 0 : _this$nodeProps.classNames.join(" ")),
      id: node[keyProp],
      onContextMenu: ev => {
        if (this.props.onContextMenu) {
          this.props.onContextMenu(ev, node[keyProp]);
        }
      },
      onClick: e => {
        this.props.onClick(e, this.props.node);
      },
      onDoubleClick: e => {
        this.props.onDoubleClick(e, this.props.node);
      },
      key: index + "_" + node[keyProp]
    }, columns);
  }

}
;// CONCATENATED MODULE: ./js/ui/jsx/megaList/adapters.jsx



class GenericListAdapter extends mixins.wl {
  constructor(...args) {
    super(...args);
    this.customIsEventuallyVisible = true;
  }

}

class Grid extends GenericListAdapter {
  static repositionItem(node, calculated, index, style) {
    style.position = "absolute";
    style.top = calculated.itemHeight * Math.floor(index / calculated.itemsPerRow);

    if (calculated.itemsPerRow > 1) {
      style.left = index % calculated.itemsPerRow * calculated.itemWidth;
    }
  }

  render() {
    return external_React_default().createElement("div", {
      className: "megaList-content",
      ref: this.props.listContentRef,
      style: {
        'position': 'relative'
      }
    }, this.props.children);
  }

}
Grid.itemWidth = 212;
Grid.itemHeight = 212;
Grid.containerClassName = "file-block-scrolling megaListContainer";
class Table extends GenericListAdapter {
  onContentUpdated() {
    let {
      calculated
    } = this.props;
    let pusherHeight = calculated.visibleFirstItemNum * calculated.itemHeight | 0;

    if (this.topPusher) {
      this.topPusher.style.height = pusherHeight + "px";
    }

    if (this.bottomPusher) {
      this.bottomPusher.style.height = (calculated.contentHeight - pusherHeight - (calculated.visibleLastItemNum - calculated.visibleFirstItemNum) * calculated.itemHeight | 0) + "px";
    }
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    this.onContentUpdated();
  }

  render() {
    return external_React_default().createElement("table", {
      width: "100%",
      className: this.props.containerClassName || "grid-table table-hover fm-dialog-table"
    }, this.props.header, external_React_default().createElement("tbody", {
      ref: this.props.listContentRef
    }, external_React_default().createElement("tr", {
      className: "megalist-pusher top",
      ref: r => {
        this.topPusher = r;
      }
    }), this.props.children, external_React_default().createElement("tr", {
      className: "megalist-pusher bottom",
      ref: r => {
        this.bottomPusher = r;
      }
    })));
  }

}
Table.itemHeight = 32;
Table.itemsPerRow = 1;
Table.containerClassName = "grid-scrolling-table megaListContainer";
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/columns/columnFavIcon.jsx
var columnFavIcon = __webpack_require__(310);
// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(988);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnNodeName.jsx



class ColumnNodeName extends genericNodePropsComponent.L {
  constructor(...args) {
    super(...args);
    this.state = {
      src: null
    };
  }

  componentDidMount() {
    super.componentDidMount();
  }

  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node,
      requestThumbnailCb
    } = nodeAdapter.props;
    const src = this.state.src || thumbnails.get(node.fa);
    return external_React_default().createElement("td", {
      megatype: ColumnNodeName.megatype
    }, src || is_image2(node) || is_video(node) ? external_React_default().createElement(tooltips.Z.Tooltip, {
      withArrow: true,
      className: "tooltip-handler-container",
      onShown: () => {
        if (!src) {
          requestThumbnailCb(node, true, (n, src) => {
            this.setState({
              src
            });
            return `preview_${n.h}`;
          });
        }
      }
    }, external_React_default().createElement(tooltips.Z.Handler, {
      className: `transfer-filetype-icon ${fileIcon(node)}`
    }), external_React_default().createElement(tooltips.Z.Contents, {
      className: "img-preview"
    }, external_React_default().createElement("div", {
      className: "dropdown img-wrapper img-block",
      id: `preview_${node.h}`
    }, external_React_default().createElement("img", {
      alt: "",
      className: `thumbnail-placeholder ${node.h}`,
      src: node.fa || src ? src || `${staticpath}/images/mega/ajax-loader-tiny.gif` : window.noThumbURI
    })))) : external_React_default().createElement("span", {
      className: `
                            transfer-filetype-icon
                            ${nodeAdapter.nodeProps.isFolder ? 'folder' : ''}
                            ${nodeAdapter.nodeProps.icon}
                            ${node.su ? 'inbound-share' : ''}
                        `
    }), external_React_default().createElement("span", {
      className: "tranfer-filetype-txt"
    }, nodeAdapter.nodeProps.title));
  }

}
ColumnNodeName.sortable = true;
ColumnNodeName.id = 'name';
ColumnNodeName.label = l[86];
ColumnNodeName.megatype = 'fname';
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnSize.jsx


class ColumnSize extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    return external_React_default().createElement("td", {
      megatype: ColumnSize.megatype,
      className: "size"
    }, !nodeAdapter.nodeProps.isFolder ? nodeAdapter.nodeProps.size : "");
  }

}
ColumnSize.sortable = true;
ColumnSize.id = "size";
ColumnSize.label = l[87];
ColumnSize.megatype = "size";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnTimeAdded.jsx


class ColumnTimeAdded extends genericNodePropsComponent.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    return external_React_default().createElement("td", {
      megatype: ColumnTimeAdded.megatype,
      className: "time ad"
    }, nodeAdapter.nodeProps.timestamp);
  }

}
ColumnTimeAdded.sortable = true;
ColumnTimeAdded.id = "ts";
ColumnTimeAdded.label = l[16169];
ColumnTimeAdded.megatype = "timeAd";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/columns/columnExtras.jsx


class ColumnExtras extends genericNodePropsComponent.L {
  render() {
    return external_React_default().createElement("td", {
      megatype: ColumnExtras.megatype,
      className: "grid-url-field own-data extras-column"
    }, external_React_default().createElement("span", {
      className: "versioning-indicator"
    }, external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-versions-previous"
    })), external_React_default().createElement("i", {
      className: "sprite-fm-mono icon-link"
    }));
  }

}
ColumnExtras.sortable = false;
ColumnExtras.id = "extras";
ColumnExtras.label = "";
ColumnExtras.megatype = "extras";
ColumnExtras.headerClassName = "grid-url-header";
;// CONCATENATED MODULE: ./js/ui/jsx/fm/browserEntries.jsx











class BrowserEntries extends mixins.wl {
  constructor(props) {
    super(props);
    this.state = {
      'sortBy': props.sortBy || ['name', 'asc']
    };
    this.toggleSortBy = this.toggleSortBy.bind(this);
  }

  componentWillMount() {
    this.lastCharKeyPressed = false;
    this.lastCharKeyIndex = -1;
  }

  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }

  componentDidUpdate(oldProps) {
    if (oldProps.sortBy && (oldProps.sortBy[0] !== this.props.sortBy[0] || oldProps.sortBy[1] !== this.props.sortBy[1])) {
      this.setState({
        'sortBy': this.props.sortBy
      });
    }
  }

  handleKeyNavigation(selectionManager, shiftKey, keyCode, viewMode) {
    let KEYS = BrowserEntries.KEYS;

    if (viewMode) {
      if (keyCode === KEYS.LEFT) {
        selectionManager.select_prev(shiftKey, true);
      } else if (keyCode === KEYS.RIGHT) {
        selectionManager.select_next(shiftKey, true);
      } else if (keyCode === KEYS.UP) {
        selectionManager.select_grid_up(shiftKey, true);
      } else {
        selectionManager.select_grid_down(shiftKey, true);
      }
    } else if (keyCode === KEYS.UP) {
      selectionManager.select_prev(shiftKey, true);
    } else {
      selectionManager.select_next(shiftKey, true);
    }
  }

  bindEvents() {
    var self = this;
    let KEYS = BrowserEntries.KEYS;
    $(document.body).rebind('keydown.be' + this.getUniqueId(), e => {
      var charTyped = false;
      var keyCode = e.which || e.keyCode;
      var $searchField = $('div.fm-files-search input');
      var $typingArea = $('textarea.messages-textarea');
      let {
        selectionManager
      } = this.props;

      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON" || e.target.tagName === "TEXTAREA" && !e.target.classList.contains("messages-textarea") || e.target.tagName === "SELECT")) {
        return;
      }

      if ($searchField.is(':focus')) {
        return;
      }

      if ($typingArea.is(':focus')) {
        $typingArea.trigger('blur');
      }

      var viewMode = this.props.viewMode;

      if (keyCode === KEYS.A && (e.ctrlKey || e.metaKey)) {
        selectionManager.select_all();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.metaKey && keyCode === KEYS.UP || keyCode === KEYS.BACKSPACE) {
        if (!viewMode) {
          var currentFolder = M.getNode(self.props.currentlyViewedEntry);

          if (currentFolder.p) {
            self.expandFolder(currentFolder.p);
          }
        }
      } else if (!e.metaKey && (!viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN) || viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN || keyCode === KEYS.LEFT || keyCode === KEYS.RIGHT))) {
        this.handleKeyNavigation(selectionManager, e.shiftKey, keyCode, viewMode);
      } else if (keyCode >= 48 && keyCode <= 57 || keyCode >= 65 && keyCode <= 123 || keyCode > 255) {
        charTyped = String.fromCharCode(keyCode).toLowerCase();
        var foundMatchingNodes = self.props.entries.filter(function (node) {
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
          selectionManager.clear_selection();
          selectionManager.set_currently_selected(foundNode[self.props.keyProp], true);
        }
      } else if (keyCode === KEYS.ENTER || e.metaKey && keyCode === KEYS.DOWN) {
        var selectedNodes = [];

        if (self.props.folderSelectNotAllowed === true) {
          self.props.highlighted.forEach(function (h) {
            var node = self.props.entries.find(entry => {
              return entry[self.props.keyProp] === h;
            });

            if (node && node.t === 0) {
              selectedNodes.push(h);
            }
          });

          if (selectedNodes.length === 0) {
            var cursorNode = this.props.highlighted[0] && M.getNodeByHandle(this.props.highlighted[0]);

            if (cursorNode.t === 1) {
              self.expandFolder(cursorNode[self.props.keyProp]);
              return;
            } else if (self.props.highlighted.length > 0) {
              var firstNodeId = self.props.highlighted[0];
              self.expandFolder(firstNodeId);
              return;
            }

            return;
          }
        } else {
          selectedNodes = self.props.highlighted;
        }

        self.props.onAttachClicked(selectedNodes);
      }

      if (!charTyped) {
        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1;
      }
    });
  }

  unbindEvents() {
    $(document.body).off('keydown.be' + this.getUniqueId());
  }

  onEntryClick(e, node) {
    var self = this;
    let {
      selectionManager
    } = this.props;
    self.lastCharKeyPressed = false;
    self.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      selectionManager.clear_selection();
      selectionManager.set_currently_selected(node[self.props.keyProp]);
    } else if (e.shiftKey) {
      selectionManager.shift_select_to(node[self.props.keyProp], true, true, false);
    } else if (e.ctrlKey || e.metaKey) {
      if (!self.props.highlighted || self.props.highlighted.indexOf(node[self.props.keyProp]) === -1) {
        let highlighted = clone(self.props.highlighted || []);

        if (self.props.folderSelectNotAllowed) {
          if (node.t === 1 && highlighted.length > 0) {
            return;
          } else if (highlighted.filter(function (nodeId) {
            var node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          }).length > 0) {
            selectionManager.clear_selection();
          }
        }

        selectionManager.add_to_selection(node[self.props.keyProp]);
      } else if (self.props.highlighted && self.props.highlighted.indexOf(node[self.props.keyProp]) !== -1) {
        let highlighted = clone(self.props.highlighted || []);

        if (self.props.folderSelectNotAllowed) {
          if (node.t === 1) {
            return;
          } else if (highlighted.filter(function (nodeId) {
            var node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          }).length > 0) {
            selectionManager.clear();
          }
        }

        selectionManager.remove_from_selection(node[self.props.keyProp]);
      }
    }
  }

  expandFolder(nodeId) {
    var self = this;
    var node = M.getNodeByHandle(nodeId);

    if (node) {
      self.lastCharKeyPressed = false;
      self.lastCharKeyIndex = -1;
      self.setState({
        'selected': [],
        'highlighted': [],
        'cursor': false
      });
      self.props.onExpand(node);
      self.forceUpdate();
    }
  }

  onEntryDoubleClick(e, node) {
    var self = this;
    self.lastCharKeyPressed = false;
    self.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();
    var share = M.getNodeShare(node);

    if (share && share.down) {
      return;
    }

    if (node.t) {
      self.props.onExpand(node);
      self.forceUpdate();
    } else {
      self.onEntryClick(e, node);
      self.props.onAttachClicked();
    }
  }

  customIsEventuallyVisible() {
    return true;
  }

  toggleSortBy(colId) {
    var newState = {};

    if (this.state.sortBy[0] === colId) {
      newState.sortBy = [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"];
    } else {
      newState.sortBy = [colId, "asc"];
    }

    this.setState(newState);
    this.props.onSortByChanged(newState.sortBy);
  }

  render() {
    var viewMode = this.props.viewMode;
    let listAdapterOpts = this.props.listAdapterOpts || {};

    if (!viewMode) {
      listAdapterOpts.columns = [columnFavIcon.l, ColumnNodeName, ColumnSize, ColumnTimeAdded, ColumnExtras];
    }

    if (this.props.listAdapterColumns) {
      listAdapterOpts.columns = this.props.listAdapterColumns;
    }

    if (this.props.isLoading) {
      return external_React_default().createElement("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, external_React_default().createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-cloud-drive"
      }), external_React_default().createElement("div", {
        className: "dialog-empty-header"
      }, l[5533])));
    } else if (!this.props.entries.length && this.props.currentlyViewedEntry === 'search') {
      return external_React_default().createElement("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, external_React_default().createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-preview-reveal"
      }), external_React_default().createElement("div", {
        className: "dialog-empty-header"
      }, l[978])));
    } else if (!this.props.entries.length) {
      const nilComp = this.props.NilComponent;
      return nilComp && (typeof nilComp === "function" ? nilComp() : nilComp) || external_React_default().createElement("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, this.props.currentlyViewedEntry === 'shares' ? external_React_default().createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-folder-incoming-share-filled"
      }), external_React_default().createElement("div", {
        className: "dialog-empty-header"
      }, l[6871])) : external_React_default().createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default().createElement("i", {
        className: "sprite-fm-mono icon-folder-filled"
      }), external_React_default().createElement("div", {
        className: "dialog-empty-header"
      }, this.props.currentlyViewedEntry === M.RootID ? l[1343] : M.u[this.props.currentlyViewedEntry] ? l[6787] : l[782])));
    }

    return external_React_default().createElement(MegaList2, {
      viewMode: viewMode,
      sortBy: this.state.sortBy,
      currentlyViewedEntry: this.props.currentlyViewedEntry,
      selected: this.props.selected,
      highlighted: this.props.highlighted,
      containerClassName: this.props.containerClassName,
      nodeAdapterProps: {
        'onClick': (e, node) => {
          this.onEntryClick(e, node);
        },
        'onDoubleClick': (e, node) => {
          this.onEntryDoubleClick(e, node);
        },
        'className': node => {
          return this.props.highlighted.indexOf(node[this.props.keyProp]) > -1 ? " ui-selected" : "";
        }
      },
      ref: r => {
        this.megaList = r;
      },
      listAdapter: viewMode ? Grid : Table,
      nodeAdapter: viewMode ? GenericGrid : GenericTable,
      listAdapterOpts: listAdapterOpts,
      entries: this.props.entries,
      itemHeight: this.props.megaListItemHeight,
      headerHeight: 36,
      header: !viewMode && external_React_default().createElement(GenericTableHeader, {
        columns: listAdapterOpts.columns,
        sortBy: this.state.sortBy,
        onClick: this.toggleSortBy,
        headerContainerClassName: this.props.headerContainerClassName
      }),
      currentdirid: this.props.currentdirid,
      onContextMenu: this.props.onContextMenu,
      keyProp: this.props.keyProp
    });
  }

}
BrowserEntries.KEYS = {
  A: 65,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ENTER: 13,
  BACKSPACE: 8
};
BrowserEntries.defaultProps = {
  'hideable': true,
  'requiresUpdateOnResize': true
};
;// CONCATENATED MODULE: ./js/ui/jsx/fm/fmView.jsx



class FMView extends mixins.wl {
  constructor(props) {
    var _this$dataSource;

    super(props);
    let initialSortBy = props.initialSortBy || ['name', 'asc'];

    if (props.fmConfigSortEnabled) {
      var _fmconfig$sortmodes, _fmconfig$sortmodes$s;

      const sortId = props.fmConfigSortId;
      assert(sortId, 'missing fmConfigSortId');

      if ((_fmconfig$sortmodes = fmconfig.sortmodes) != null && (_fmconfig$sortmodes$s = _fmconfig$sortmodes[sortId]) != null && _fmconfig$sortmodes$s.n) {
        var _fmconfig$sortmodes2;

        initialSortBy = this._translateFmConfigSortMode((_fmconfig$sortmodes2 = fmconfig.sortmodes) == null ? void 0 : _fmconfig$sortmodes2[sortId]);
      }
    }

    this.state = {
      'sortBy': initialSortBy,
      'selected': [],
      'highlighted': [],
      'entries': null
    };

    if (this.props.dataSource) {
      this.dataSource = this.props.dataSource;
    } else {
      this.dataSource = M.d;
    }

    this.state.entries = this.getEntries();
    this.onAttachClicked = this.onAttachClicked.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    if ((_this$dataSource = this.dataSource) != null && _this$dataSource.addChangeListener) {
      this._listener = this.dataSource.addChangeListener(() => {
        if (!this.isMounted()) {
          return;
        }

        this.setState({
          'entries': this.getEntries()
        });
      });
    }

    this.initSelectionManager();
  }

  _translateFmConfigSortMode(currentSortModes) {
    const sortId = this.props.fmConfigSortId;
    assert(sortId, 'missing fmConfigSortId');
    const sortByArr = [];

    if (currentSortModes != null && currentSortModes.n) {
      sortByArr[0] = currentSortModes.n;
      const sortMap = this.props.fmConfigSortMap;
      const aliasKeys = sortMap && Object.keys(sortMap) || [];

      for (const alias of aliasKeys) {
        if (sortByArr[0] === sortMap[alias]) {
          sortByArr[0] = alias;
          break;
        }
      }

      sortByArr[1] = currentSortModes.d === 1 ? "asc" : "desc";
    }

    return sortByArr;
  }

  initSelectionManager(entries) {
    this.selectionManager = new SelectionManager2_React(entries || this.state.entries, this.props.currentdirid || "cloud-drive", () => {
      var _this$browserEntries, _this$browserEntries$, _this$browserEntries$2;

      return (_this$browserEntries = this.browserEntries) == null ? void 0 : (_this$browserEntries$ = _this$browserEntries.megaList) == null ? void 0 : (_this$browserEntries$2 = _this$browserEntries$._calculated) == null ? void 0 : _this$browserEntries$2.itemsPerRow;
    }, nodeHandle => {
      if (this.browserEntries && this.browserEntries.megaList) {
        this.browserEntries.megaList.scrollToItem(nodeHandle);
      }
    }, {
      'onSelectedUpdated': selectedList => {
        this.onSelectionUpdated(selectedList);
      }
    });
  }

  onSelectionUpdated(selectedList) {
    selectedList = [...selectedList];
    let highlighted = selectedList;

    if (this.props.folderSelectNotAllowed) {
      selectedList = selectedList.filter(nodeId => this.dataSource[nodeId].t !== 1);
    }

    this.setState({
      'selected': selectedList,
      'highlighted': highlighted
    });
    this.props.onSelected(selectedList);
    this.props.onHighlighted(highlighted);
  }

  getEntries(newState) {
    var self = this;
    var sortBy = newState && newState.sortBy || self.state.sortBy;
    var order = sortBy[1] === "asc" ? 1 : -1;
    var entries = [];

    if (self.props.currentlyViewedEntry === "search" && self.props.searchValue && self.props.searchValue.length >= 3) {
      M.getFilterBy(M.getFilterBySearchFn(self.props.searchValue)).forEach(function (n) {
        if (!n.h || n.h.length === 11 || n.fv) {
          return;
        }

        if (self.props.customFilterFn && !self.props.customFilterFn(n)) {
          return;
        }

        entries.push(n);
      });
    } else {
      Object.keys(M.c[self.props.currentlyViewedEntry] || self.props.dataSource || {}).forEach(h => {
        if (this.dataSource[h]) {
          if (self.props.customFilterFn) {
            if (self.props.customFilterFn(this.dataSource[h])) {
              entries.push(this.dataSource[h]);
            }
          } else {
            entries.push(this.dataSource[h]);
          }
        }
      });
    }

    var sortFunc;

    if (sortBy[0] === "name") {
      sortFunc = M.getSortByNameFn();
    } else if (sortBy[0] === "size") {
      sortFunc = M.getSortBySizeFn();
    } else if (sortBy[0] === "ts") {
      sortFunc = M.getSortByDateTimeFn();
    } else if (sortBy[0] === "rts") {
      sortFunc = M.getSortByRtsFn();
    } else if (sortBy[0] === "status") {
      sortFunc = M.getSortByStatusFn();
    } else if (sortBy[0] === "interaction") {
      sortFunc = M.getSortByInteractionFn();
    } else if (sortBy[0] === "email") {
      sortFunc = M.getSortByEmail();
    } else if (sortBy[0] === 'access') {
      sortFunc = (a, b, o) => typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && (a.r < b.r ? -1 : 1) * o;
    } else {
        sortFunc = M.sortByFavFn(order);
      }

    var folders = [];

    if (this.props.sortFoldersFirst) {
      for (var i = entries.length; i--;) {
        if (entries[i] && entries[i].t) {
          folders.unshift(entries[i]);
          entries.splice(i, 1);
        }
      }
    }

    folders.sort(function (a, b) {
      return sortFunc(a, b, order);
    });
    entries.sort(function (a, b) {
      return sortFunc(a, b, order);
    });
    return folders.concat(entries);
  }

  onHighlighted(nodes) {
    this.setState({
      'highlighted': nodes
    });

    if (this.props.onHighlighted) {
      this.props.onHighlighted(nodes);
    }
  }

  finishedLoading(newState) {
    newState.isLoading = false;
    newState.entries = this.getEntries();
    this.initSelectionManager(newState.entries);
    this.setState(newState);
  }

  addOrUpdRawListener() {
    if (this._rawListener) {
      mBroadcaster.removeListener(this._rawListener);
    }

    this._rawListener = mBroadcaster.addListener("fmViewUpdate:" + this.props.currentlyViewedEntry, () => {
      this.setState({
        'entries': this.getEntries()
      }, () => {
        if (this.browserEntries.isMounted()) {
          this.browserEntries.forceUpdate();
        }
      });
    });
  }

  componentDidMount() {
    var _this$dataSource2;

    super.componentDidMount();

    if (!((_this$dataSource2 = this.dataSource) != null && _this$dataSource2.addChangeListener)) {
      this.addOrUpdRawListener();
    }

    if (this.props.fmConfigSortEnabled) {
      this._sortModeListener = mBroadcaster.addListener("fmconfig:sortmodes", sortModes => {
        this.onFmConfigSortModeChanged(sortModes);
      });
    }
  }

  componentDidUpdate(prevProps) {
    const {
      currentlyViewedEntry: currEntry,
      searchValue: currSearch
    } = this.props;
    const {
      currentlyViewedEntry: prevEntry,
      searchValue: prevSearch
    } = prevProps;

    if (prevEntry !== currEntry || currSearch !== prevSearch) {
      var _this$dataSource3;

      let newState = {
        'selected': [],
        'highlighted': []
      };

      if (!((_this$dataSource3 = this.dataSource) != null && _this$dataSource3.addChangeListener)) {
        this.addOrUpdRawListener();
      }

      const handle = currEntry;

      if (handle === 'shares') {
        newState.isLoading = true;
        this.setState(newState);
        dbfetch.geta(Object.keys(M.c.shares || {})).always(() => {
          this.finishedLoading(newState);
        });
        return;
      }

      if (!this.dataSource[handle] || this.dataSource[handle].t && !M.c[handle]) {
        this.setState({
          'isLoading': true
        });
        dbfetch.get(handle).always(() => {
          this.finishedLoading(newState);
        });
        return;
      }

      let entries = this.getEntries();
      this.initSelectionManager(entries);
      this.setState({
        entries: entries
      });
    }
  }

  onAttachClicked() {
    this.props.onAttachClicked();
  }

  onContextMenu() {}

  componentWillUnmount() {
    super.componentWillUnmount();

    if (this._listener) {
      var _this$dataSource4;

      (_this$dataSource4 = this.dataSource) == null ? void 0 : _this$dataSource4.removeChangeListener(this._listener);
    }

    if (this._rawListener) {
      mBroadcaster.removeListener(this._rawListener);
    }

    if (this._sortModeListener) {
      mBroadcaster.removeListener(this._sortModeListener);
    }

    $.selected = [];
    this.selectionManager.destroy();
    this.selectionManager = undefined;
    $('.dropdown.body.files-menu.context').css('z-index', '');
  }

  onSortByChanged(newState) {
    if (newState[0] === this.state.sortBy[0] && newState[1] === this.state.sortBy[1]) {
      return;
    }

    const entries = this.getEntries({
      'sortBy': newState
    });
    this.setState({
      'sortBy': newState,
      'entries': entries,
      'selected': [],
      'highlighted': []
    }, () => {
      if (this.props.onSortByChanged) {
        this.props.onSortByChanged(newState);
      }

      if (this.props.fmConfigSortEnabled) {
        const sortId = this.props.fmConfigSortId;
        assert(sortId, 'fmConfigSortId missing');

        if (newState[0] === this.props.initialSortBy[0] && newState[1] === this.props.initialSortBy[1]) {
          const sortModes = typeof fmconfig.sortmodes !== 'undefined' ? fmconfig.sortmodes : Object.create(null);
          delete sortModes[sortId];
          mega.config.set('sortmodes', sortModes);
          return;
        }

        const map = this.props.fmConfigSortMap || Object.create(null);
        const name = map[newState[0]] || newState[0];
        const direction = newState[1] === "asc" ? 1 : -1;
        fmsortmode(sortId, name, direction);
      }
    });
    this.initSelectionManager(entries);
  }

  onFmConfigSortModeChanged(sortModes) {
    const currentSortMode = sortModes[this.props.fmConfigSortId];

    if (!currentSortMode) {
      this.onSortByChanged(this.props.initialSortBy || ['name', 'asc']);
    } else {
      const newSortMode = this._translateFmConfigSortMode(currentSortMode);

      if (this.state.sortBy[0] !== newSortMode[0] || this.state.sortBy[1] !== newSortMode[1]) {
        this.onSortByChanged(newSortMode);
      }
    }
  }

  render() {
    return external_React_default().createElement("div", {
      className: "content-container",
      onClick: ev => {
        $.hideContextMenu(ev);
      }
    }, external_React_default().createElement(BrowserEntries, {
      isLoading: this.state.isLoading || this.props.nodeLoading,
      currentlyViewedEntry: this.props.currentlyViewedEntry,
      entries: this.state.entries || [],
      onExpand: node => {
        this.setState({
          'selected': [],
          'highlighted': []
        });
        this.props.onExpand(node[this.props.keyProp || 'h']);
      },
      sortBy: this.state.sortBy,
      folderSelectNotAllowed: this.props.folderSelectNotAllowed,
      onAttachClicked: this.onAttachClicked,
      viewMode: this.props.viewMode,
      selected: this.state.selected,
      highlighted: this.state.highlighted,
      onContextMenu: this.props.onContextMenu ? this.props.onContextMenu : this.onContextMenu,
      selectionManager: this.selectionManager,
      ref: browserEntries => {
        this.browserEntries = browserEntries;
      },
      onSortByChanged: newState => {
        this.onSortByChanged(newState);
      },
      listAdapterColumns: this.props.listAdapterColumns,
      currentdirid: this.props.currentdirid,
      containerClassName: this.props.containerClassName,
      headerContainerClassName: this.props.headerContainerClassName,
      megaListItemHeight: this.props.megaListItemHeight,
      keyProp: this.props.keyProp || 'h',
      NilComponent: this.props.NilComponent,
      listAdapterOpts: this.props.listAdapterOpts
    }));
  }

}

/***/ }),

/***/ 310:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"l": () => (ColumnFavIcon)
});
var react0__ = __webpack_require__(363);
var react0 = __webpack_require__.n(react0__);
var _genericNodePropsComponent1__ = __webpack_require__(297);


class ColumnFavIcon extends _genericNodePropsComponent1__.L {
  render() {
    let {
      nodeAdapter
    } = this.props;
    let {
      node
    } = nodeAdapter.props;
    let isFavouritable = node.r === 2;
    return react0().createElement("td", {
      megatype: ColumnFavIcon.megatype,
      className: ColumnFavIcon.megatype
    }, react0().createElement("span", {
      className: "grid-status-icon sprite-fm-mono " + (nodeAdapter.nodeProps.fav ? " icon-favourite-filled" : " icon-dot") + (!isFavouritable && " disabled" || ""),
      onClick: () => {
        if (isFavouritable) {
          M.favourite([node.h], !node.fav);
        }
      }
    }));
  }

}
ColumnFavIcon.sortable = true;
ColumnFavIcon.id = "fav";
ColumnFavIcon.label = "";
ColumnFavIcon.icon = "icon-favourite-filled";
ColumnFavIcon.megatype = "fav";
ColumnFavIcon.headerClassName = "grid-first-th fav";

/***/ }),

/***/ 297:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "L": () => (GenericNodePropsComponent)
});

// EXTERNAL MODULE: ./js/chat/mixins.js
var mixins = __webpack_require__(503);
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/nodeProperties.jsx
class NodeProperties {
  static get(node, changeListener) {
    assert(node.h, 'missing handle for node');

    if (NodeProperties._globalCleanupTimer) {
      clearTimeout(NodeProperties._globalCleanupTimer);
    }

    NodeProperties._globalCleanupTimer = setTimeout(() => {
      NodeProperties.cleanup(0);
    }, 120e3);
    let nodeProps;

    if (!NodeProperties._cache.has(node.h)) {
      nodeProps = new NodeProperties(node, changeListener);

      NodeProperties._cache.set(node.h, nodeProps);
    }

    return nodeProps || NodeProperties._cache.get(node.h);
  }

  unuse(changeListener) {
    let node = this.node;

    if (!node) {
      if (d) {
        console.warn("This should not happen.");
      }

      return;
    }

    this.changeListeners.delete(changeListener);

    let usages = NodeProperties._usages.get(this);

    if (usages) {
      NodeProperties._usages.set(this, --usages);

      if (usages === 0 && NodeProperties._cache.size > NodeProperties.MAX_CACHE_SIZE) {
        delay('nodePropCleanup', NodeProperties.cleanup, 1000);
      }
    }
  }

  static cleanup(maxCacheSize) {
    maxCacheSize = typeof maxCacheSize === "undefined" ? NodeProperties.MAX_CACHE_SIZE : maxCacheSize;
    let len = NodeProperties._cache.size;
    let removed = 0;

    for (let entry of NodeProperties._cache) {
      let id = entry[0];
      let node = entry[1];

      let usage = NodeProperties._usages.get(node);

      if (usage === 0) {
        NodeProperties._usages.delete(node);

        node._cleanup();

        NodeProperties._cache.delete(id);

        removed++;

        if (len - removed < maxCacheSize) {
          return;
        }
      }
    }
  }

  constructor(node, changeListener) {
    this.node = node;
    this.changeListeners = new Set();

    if (changeListener) {
      this.changeListeners.add(changeListener);
    }

    let _onChange = () => {
      this.initProps();

      for (let listener of this.changeListeners) {
        listener();
      }
    };

    if (this.node.addChangeListener) {
      this._listener = this.node.addChangeListener(_onChange);
    } else {
      this._mbListener = mBroadcaster.addListener("nodeUpdated:" + node.h, _onChange);
    }

    this.initProps();
  }

  use(changeListener) {
    if (changeListener) {
      this.changeListeners.add(changeListener);
    }

    NodeProperties._usages.set(this, (NodeProperties._usages.get(this) | 0) + 1);
  }

  _cleanup() {
    if (this._listener) {
      this.node.removeChangeListener(this._listener);
    }

    if (this._mbListener) {
      mBroadcaster.removeListener(this._mbListener);
    }

    oDestroy(this);
  }

  initProps() {
    let node = this.node;
    lazy(this, 'title', () => {
      return M.getNameByHandle(node.h);
    });
    lazy(this, 'classNames', () => {
      let classNames = [];

      if (node.su) {
        classNames.push('inbound-share');
      }

      if (node.t) {
        classNames.push('folder');
      } else {
        classNames.push('file');
      }

      var share = this.shareData;

      if (missingkeys[node.h] || share.down) {
        if (share.down) {
          classNames.push('taken-down');
        }

        if (missingkeys[node.h]) {
          classNames.push('undecryptable');
        }
      }

      if (share) {
        classNames.push('linked');
      }

      if (node.lbl && !folderlink) {
        var colourLabel = M.getLabelClassFromId(node.lbl);
        classNames.push('colour-label');
        classNames.push(colourLabel);
      }

      return classNames;
    });
    lazy(this, 'icon', () => {
      return fileIcon(node);
    });
    lazy(this, 'isFolder', () => {
      return !!node.t;
    });
    lazy(this, 'shareData', () => {
      return M.getNodeShare(node);
    });
    lazy(this, 'isTakendown', () => {
      return this.shareData && !!this.shareData.down;
    });
    lazy(this, 'fav', () => {
      return !!node.fav;
    });
    lazy(this, 'size', () => {
      return bytesToSize(node.s);
    });
    lazy(this, 'timestamp', () => {
      return time2date(node.ts);
    });
    lazy(this, 'root', () => {
      return M.getNodeRoot(node.h);
    });
    lazy(this, 'incomingShareData', () => {
      let result = {};

      if (node.r === 1) {
        result.accessLabel = l[56];
        result.accessIcon = 'icon-permissions-write';
      } else if (node.r === 2) {
        result.accessLabel = l[57];
        result.accessIcon = 'icon-star';
      } else {
        result.accessLabel = l[55];
        result.accessIcon = 'icon-read-only';
      }

      return result;
    });
    lazy(this, 'timestamp', () => {
      return time2date(node.ts);
    });
    lazy(this, 'onlineStatus', () => {
      return M.onlineStatusClass(node.presence ? node.presence : "unavailable");
    });
  }

}
NodeProperties._cache = new Map();
NodeProperties._usages = new WeakMap();
NodeProperties._globalCleanupTimer = void 0;
NodeProperties.MAX_CACHE_SIZE = 100;

if (d) {
  window.NodeProperties = NodeProperties;
}
;// CONCATENATED MODULE: ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx


class GenericNodePropsComponent extends mixins.wl {
  constructor(props) {
    super(props);

    if (this.props.node.h) {
      this.nodeProps = NodeProperties.get(this.props.node);
      this.changeListener = this.changeListener.bind(this);
    }
  }

  changeListener() {
    if (this.isMounted()) {
      this.safeForceUpdate();
    }
  }

  componentWillMount() {
    var _this$nodeProps;

    if (super.componentWillMount) {
      super.componentWillMount();
    }

    (_this$nodeProps = this.nodeProps) == null ? void 0 : _this$nodeProps.use(this.changeListener);
  }

  componentWillUnmount() {
    var _this$nodeProps2;

    super.componentWillUnmount();
    (_this$nodeProps2 = this.nodeProps) == null ? void 0 : _this$nodeProps2.unuse(this.changeListener);
  }

}

/***/ }),

/***/ 904:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (__WEBPACK_DEFAULT_EXPORT__)
});

var _utils_jsx0__ = __webpack_require__(79);
var _chat_mixins1__ = __webpack_require__(503);
var _tooltips_jsx2__ = __webpack_require__(988);
var _forms_jsx3__ = __webpack_require__(773);
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);






var ContactsUI = __webpack_require__(13);

class ExtraFooterElement extends _chat_mixins1__.wl {
  render() {
    return this.props.children;
  }

}

class ModalDialog extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.onBlur = this.onBlur.bind(this);
    this.onCloseClicked = this.onCloseClicked.bind(this);
    this.onPopupDidMount = this.onPopupDidMount.bind(this);
  }

  componentDidMount() {
    super.componentDidMount();

    if (!this.props.hideOverlay) {
      $(document.body).addClass('overlayed');
      $('.fm-dialog-overlay').removeClass('hidden');
    }

    $('textarea:focus').trigger("blur");

    if (!this.props.noCloseOnClickOutside) {
      const convApp = document.querySelector('.conversationsApp');

      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
        convApp.addEventListener('click', this.onBlur);
      }

      $('.fm-modal-dialog').rebind('click.modalDialogOv' + this.getUniqueId(), ({
        target
      }) => {
        if ($(target).is('.fm-modal-dialog')) {
          this.onBlur();
        }
      });
      $('.fm-dialog-overlay').rebind('click.modalDialog' + this.getUniqueId(), () => {
        if (this.props.closeDlgOnClickOverlay) {
          this.onBlur();
        }

        return false;
      });
    }

    $(document).rebind('keyup.modalDialog' + this.getUniqueId(), ({
      keyCode
    }) => {
      if (!this.props.stopKeyPropagation && keyCode === 27) {
        this.onBlur();
      }
    });
  }

  onBlur(e) {
    var $element = $(this.findDOMNode());

    if (!e || !$(e.target).closest('.mega-dialog').is($element)) {
      var convApp = document.querySelector('.conversationsApp');

      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
      }

      this.onCloseClicked();
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    if (!this.props.noCloseOnClickOutside) {
      var convApp = document.querySelector('.conversationsApp');

      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
      }

      $('.fm-dialog-overlay').off('click.modalDialog' + this.getUniqueId());
    }

    if (!this.props.hideOverlay) {
      $(document.body).removeClass('overlayed');
      $('.fm-dialog-overlay').addClass('hidden');
    }

    $(this.domNode).off('dialog-closed.modalDialog' + this.getUniqueId());
    $(document).off('keyup.modalDialog' + this.getUniqueId());
  }

  onCloseClicked() {
    var self = this;

    if (self.props.onClose) {
      self.props.onClose(self);
    }
  }

  onPopupDidMount(elem) {
    this.domNode = elem;
    $(elem).rebind('dialog-closed.modalDialog' + this.getUniqueId(), () => this.onCloseClicked());

    if (this.props.popupDidMount) {
      this.props.popupDidMount(elem);
    }
  }

  render() {
    var self = this;
    var classes = 'mega-dialog';
    var selectedNumEle = null;
    var footer = null;
    var extraFooterElements = [];
    var otherElements = [];
    var x = 0;
    React.Children.forEach(self.props.children, function (child) {
      if (!child) {
        return;
      }

      if (child.type.name === 'ExtraFooterElement') {
        extraFooterElements.push(React.cloneElement(child, {
          key: x++
        }));
      } else {
        otherElements.push(React.cloneElement(child, {
          key: x++
        }));
      }
    }.bind(this));

    if (self.props.className) {
      classes += ` ${self.props.className}`;
    }

    if (self.props.dialogType) {
      classes += ` dialog-template-${self.props.dialogType}`;
    }

    if (self.props.dialogName) {
      classes += ` ${self.props.dialogName}`;
    }

    if (self.props.showSelectedNum && self.props.selectedNum) {
      selectedNumEle = React.createElement("div", {
        className: "selected-num"
      }, React.createElement("span", null, self.props.selectedNum));
    }

    var buttons;

    if (self.props.buttons) {
      buttons = [];
      self.props.buttons.forEach(function (v, i) {
        if (v) {
          buttons.push(React.createElement("button", {
            className: (v.defaultClassname ? v.defaultClassname : "mega-button") + (v.className ? " " + v.className : "") + (self.props.dialogType === "action" ? "large" : ""),
            onClick: e => {
              if ($(e.target).is(".disabled")) {
                return false;
              }

              if (v.onClick) {
                v.onClick(e, self);
              }
            },
            key: v.key + i
          }, v.iconBefore ? React.createElement("div", null, React.createElement("i", {
            className: v.iconBefore
          })) : null, React.createElement("span", null, v.label), v.iconAfter ? React.createElement("div", null, React.createElement("i", {
            className: v.iconAfter
          })) : null));
        }
      });

      if (buttons && buttons.length > 0 || extraFooterElements.length > 0) {
        footer = React.createElement("footer", null, buttons && buttons.length > 0 ? React.createElement("div", {
          className: "footer-container"
        }, buttons) : null, extraFooterElements.length > 0 ? React.createElement("aside", null, extraFooterElements) : null);
      }
    }

    return React.createElement(_utils_jsx0__["default"].RenderTo, {
      element: document.body,
      className: "fm-modal-dialog",
      popupDidMount: this.onPopupDidMount
    }, React.createElement("div", {
      className: classes,
      "aria-labelledby": self.props.dialogName ? self.props.dialogName + "-title" : null,
      role: "dialog",
      "aria-modal": "true",
      onClick: self.props.onClick
    }, React.createElement("button", {
      className: "close",
      onClick: self.onCloseClicked
    }, React.createElement("i", {
      className: "sprite-fm-mono icon-dialog-close"
    })), self.props.title ? self.props.dialogType === "message" ? React.createElement("header", null, self.props.icon ? React.createElement("i", {
      className: `graphic ${self.props.icon}`
    }) : self.props.iconElement, React.createElement("div", null, React.createElement("h3", {
      id: self.props.dialogName ? self.props.dialogName + "-title" : null
    }, self.props.title, selectedNumEle), self.props.subtitle ? React.createElement("p", null, self.props.subtitle) : null, otherElements)) : React.createElement("header", null, self.props.icon ? React.createElement("i", {
      className: `graphic ${self.props.icon}`
    }) : self.props.iconElement, React.createElement("h2", {
      id: self.props.dialogName ? self.props.dialogName + "-title" : null
    }, self.props.title, selectedNumEle), self.props.subtitle ? React.createElement("p", null, self.props.subtitle) : null) : null, self.props.dialogType !== "message" ? otherElements : null, buttons || extraFooterElements ? footer : null));
  }

}

ModalDialog.defaultProps = {
  'hideable': true,
  'noCloseOnClickOutside': false,
  'closeDlgOnClickOverlay': true,
  'showSelectedNum': false,
  'selectedNum': 0
};

class SelectContactDialog extends _chat_mixins1__.wl {
  constructor(props) {
    super(props);
    this.state = {
      'selected': this.props.selected ? this.props.selected : []
    };
    this.onSelected = this.onSelected.bind(this);
  }

  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
  }

  onSelectClicked() {
    this.props.onSelectClicked();
  }

  render() {
    var self = this;
    var classes = "send-contact contrast small-footer dialog-template-tool " + self.props.className;
    return React.createElement(ModalDialog, {
      title: l[8628],
      className: classes,
      selected: self.state.selected,
      onClose: () => {
        self.props.onClose(self);
      },
      buttons: [{
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick": function (e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      }, {
        "label": self.props.selectLabel,
        "key": "select",
        "className": self.state.selected.length === 0 ? "positive disabled" : "positive",
        "onClick": function (e) {
          if (self.state.selected.length > 0) {
            if (self.props.onSelected) {
              self.props.onSelected(self.state.selected);
            }

            self.props.onSelectClicked(self.state.selected);
          }

          e.preventDefault();
          e.stopPropagation();
        }
      }]
    }, React.createElement("section", {
      className: "content"
    }, React.createElement("div", {
      className: "content-block"
    }, React.createElement(ContactsUI.ContactPickerWidget, {
      megaChat: self.props.megaChat,
      exclude: self.props.exclude,
      selectableContacts: "true",
      onSelectDone: self.props.onSelectClicked,
      onSelected: self.onSelected,
      onClose: self.props.onClose,
      selected: self.state.selected,
      contacts: M.u,
      headerClasses: "left-aligned",
      multiple: true
    }))));
  }

}

SelectContactDialog.clickTime = 0;
SelectContactDialog.defaultProps = {
  'selectLabel': l[1940],
  'cancelLabel': l[82],
  'hideable': true
};

class ConfirmDialog extends _chat_mixins1__.wl {
  static saveState(o) {
    let state = mega.config.get('xcod') >>> 0;
    mega.config.set('xcod', state | 1 << o.props.pref);
  }

  static clearState(o) {
    let state = mega.config.get('xcod') >>> 0;
    mega.config.set('xcod', state & ~(1 << o.props.pref));
  }

  static autoConfirm(o) {
    console.assert(o.props.pref > 0);
    let state = mega.config.get('xcod') >>> 0;
    return !!(state & 1 << o.props.pref);
  }

  constructor(props) {
    super(props);
    this._wasAutoConfirmed = undefined;
    this._keyUpEventName = 'keyup.confirmDialog' + this.getUniqueId();
    lazy(this, '_autoConfirm', () => this.props.onConfirmClicked && this.props.dontShowAgainCheckbox && ConfirmDialog.autoConfirm(this));
  }

  unbindEvents() {
    $(document).off(this._keyUpEventName);
  }

  componentDidMount() {
    super.componentDidMount();
    queueMicrotask(() => {
      if (!this.isMounted()) {
        return;
      }

      if (this._autoConfirm) {
        if (!this._wasAutoConfirmed) {
          this._wasAutoConfirmed = 1;
          queueMicrotask(() => {
            this.onConfirmClicked();
          });
        }

        return;
      }

      $(document).rebind(this._keyUpEventName, e => {
        if (e.which === 13 || e.keyCode === 13) {
          if (!this.isMounted()) {
            this.unbindEvents();
            return;
          }

          this.onConfirmClicked();
          return false;
        }
      });
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var self = this;
    self.unbindEvents();
    delete this._wasAutoConfirmed;
  }

  onConfirmClicked() {
    this.unbindEvents();

    if (this.props.onConfirmClicked) {
      this.props.onConfirmClicked();
    }
  }

  render() {
    var self = this;

    if (this._autoConfirm) {
      return null;
    }

    var classes = "delete-message" + (self.props.name ? ` ${self.props.name}` : "") + (self.props.className ? ` ${self.props.className}` : "");
    var dontShowCheckbox = null;

    if (self.props.dontShowAgainCheckbox) {
      dontShowCheckbox = React.createElement("div", {
        className: "footer-checkbox"
      }, React.createElement(_forms_jsx3__.Z.Checkbox, {
        name: "delete-confirm",
        id: "delete-confirm",
        onLabelClick: (e, state) => {
          if (state === true) {
            ConfirmDialog.saveState(self);
          } else {
            ConfirmDialog.clearState(self);
          }
        }
      }, l[7039]));
    }

    return React.createElement(ModalDialog, {
      title: this.props.title,
      subtitle: this.props.subtitle,
      className: classes,
      dialogId: this.props.name,
      dialogType: this.props.dialogType,
      icon: this.props.icon,
      onClose: () => {
        self.props.onClose(self);
      },
      buttons: [{
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick": function (e) {
          ConfirmDialog.clearState(self);
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      }, {
        "label": self.props.confirmLabel,
        "key": "select",
        "className": "positive",
        "onClick": function (e) {
          self.onConfirmClicked();
          e.preventDefault();
          e.stopPropagation();
        }
      }]
    }, self.props.children, dontShowCheckbox ? React.createElement(ExtraFooterElement, null, dontShowCheckbox) : null);
  }

}

ConfirmDialog.defaultProps = {
  'confirmLabel': l[6826],
  'cancelLabel': l[82],
  'dontShowAgainCheckbox': true,
  'hideable': true,
  'dialogType': 'message'
};
const __WEBPACK_DEFAULT_EXPORT__ = ({
  ModalDialog,
  SelectContactDialog,
  ConfirmDialog
});

/***/ }),

/***/ 285:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"F": () => (PerfectScrollbar)
});
var _applyDecoratedDescriptor1__ = __webpack_require__(229);
var _chat_mixins0__ = __webpack_require__(503);


var _dec, _dec2, _class, _class2;

var React = __webpack_require__(363);


let PerfectScrollbar = (_dec = (0,_chat_mixins0__.M9)(30, true), _dec2 = (0,_chat_mixins0__.M9)(30, true), (_class = (_class2 = class PerfectScrollbar extends _chat_mixins0__.wl {
  constructor(props) {
    super(props);
    this.isUserScroll = true;
    this.scrollEventIncId = 0;
  }

  get$Node() {
    if (!this.$Node) {
      this.$Node = $(this.findDOMNode());
    }

    return this.$Node;
  }

  doProgramaticScroll(newPos, forced, isX, skipReinitialised) {
    if (!this.isMounted()) {
      return;
    }

    var self = this;
    var $elem = self.get$Node();
    var animFrameInner = false;
    var prop = !isX ? 'scrollTop' : 'scrollLeft';
    var event = 'scroll.progscroll' + self.scrollEventIncId++;
    $elem.rebind(event, () => {
      if (animFrameInner) {
        cancelAnimationFrame(animFrameInner);
        animFrameInner = false;
      }

      $elem.off(event);

      if (!skipReinitialised) {
        self.reinitialised(true);
      } else if (typeof skipReinitialised === 'function') {
        onIdle(skipReinitialised);
      }

      self.isUserScroll = true;
    });
    self.isUserScroll = false;
    $elem[0][prop] = Math.round(newPos);
    Ps.update($elem[0]);
    animFrameInner = requestAnimationFrame(() => {
      animFrameInner = false;
      self.isUserScroll = true;
      $elem.off(event);
    });
    return true;
  }

  componentDidMount() {
    super.componentDidMount();
    var self = this;
    var $elem = self.get$Node();
    $elem.height('100%');
    var options = Object.assign({}, {
      'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection'],
      'minScrollbarLength': 20
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
    $elem.rebind('disable-scroll.ps' + self.getUniqueId(), function () {
      Ps.destroy($elem[0]);
    });
    $elem.rebind('enable-scroll.ps' + self.getUniqueId(), function () {
      Ps.initialize($elem[0], options);
    });
    $elem.rebind('forceResize.ps' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
      self.onResize(forced, scrollPositionYPerc, scrollToElement);
    });
    self.onResize();
    this.attachAnimationEvents();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var $elem = this.get$Node();
    $elem.off('ps-scroll-y.ps' + this.getUniqueId());
    var ns = '.ps' + this.getUniqueId();
    $elem.parents('.have-animation').unbind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);
  }

  attachAnimationEvents() {}

  eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
    var self = this;

    if (!self.isComponentEventuallyVisible()) {
      return;
    }

    var $elem = self.get$Node();
    var h = self.getContentHeight();

    if (forced || self._currHeight !== h) {
      self._currHeight = h;

      self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
    }
  }

  _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
    var fired = false;

    if (this.props.onReinitialise) {
      fired = this.props.onReinitialise(this, $elem, forced, scrollPositionYPerc, scrollToElement);
    }

    if (fired === false) {
      if (scrollPositionYPerc) {
        if (scrollPositionYPerc === -1) {
          this.scrollToBottom(true);
        } else {
          this.scrollToPercentY(scrollPositionYPerc, true);
        }
      } else if (scrollToElement) {
        this.scrollToElement(scrollToElement, true);
      }
    }
  }

  scrollToBottom(skipReinitialised) {
    this.reinitialise(skipReinitialised, true);
  }

  reinitialise(skipReinitialised, bottom) {
    var $elem = this.findDOMNode();
    this.isUserScroll = false;

    if (bottom) {
      $elem.scrollTop = this.getScrollHeight();
    }

    Ps.update($elem);
    this.isUserScroll = true;

    if (!skipReinitialised) {
      this.reinitialised(true);
    }
  }

  getDOMRect(node) {
    return (node || this.findDOMNode()).getBoundingClientRect();
  }

  getScrollOffset(value) {
    var $elem = this.findDOMNode();
    return this.getDOMRect($elem.children[0])[value] - this.getDOMRect($elem)[value] || 0;
  }

  getScrollHeight() {
    var res = this.getScrollOffset('height');

    if (res < 1) {
      return this._lastKnownScrollHeight || 0;
    }

    this._lastKnownScrollHeight = res;
    return res;
  }

  getScrollWidth() {
    var res = this.getScrollOffset('width');

    if (res < 1) {
      return this._lastKnownScrollWidth || 0;
    }

    this._lastKnownScrollWidth = res;
    return res;
  }

  getContentHeight() {
    var $elem = this.get$Node();
    return $elem[0].scrollHeight;
  }

  getContentWidth() {
    var $elem = this.get$Node();
    return $elem[0].scrollWidth;
  }

  setCssContentHeight(h) {
    var $elem = this.get$Node();
    return $elem.css('height', h);
  }

  isAtTop() {
    return this.findDOMNode().scrollTop === 0;
  }

  isAtBottom() {
    return Math.round(this.getScrollPositionY()) === Math.round(this.getScrollHeight());
  }

  isCloseToBottom(minPixelsOff) {
    return this.getScrollHeight() - this.getScrollPositionY() <= minPixelsOff;
  }

  getScrolledPercentY() {
    return 100 / this.getScrollHeight() * this.getScrollPositionY();
  }

  getScrollPositionY() {
    return this.findDOMNode().scrollTop;
  }

  getScrollPositionX() {
    return this.findDOMNode().scrollLeft;
  }

  getClientWidth() {
    return this.findDOMNode().clientWidth;
  }

  getClientHeight() {
    return this.findDOMNode().clientHeight;
  }

  scrollToPercentY(posPerc, skipReinitialised) {
    var $elem = this.get$Node();
    var targetPx = this.getScrollHeight() / 100 * posPerc;

    if ($elem[0].scrollTop !== targetPx) {
      this.doProgramaticScroll(targetPx, 0, 0, skipReinitialised);
    }
  }

  scrollToPercentX(posPerc, skipReinitialised) {
    var $elem = this.get$Node();
    var targetPx = this.getScrollWidth() / 100 * posPerc;

    if ($elem[0].scrollLeft !== targetPx) {
      this.doProgramaticScroll(targetPx, false, true, skipReinitialised);
    }
  }

  scrollToY(posY, skipReinitialised) {
    var $elem = this.get$Node();

    if ($elem[0].scrollTop !== posY) {
      this.doProgramaticScroll(posY, 0, 0, skipReinitialised);
    }
  }

  scrollToElement(element, skipReinitialised) {
    if (element && element.offsetParent) {
      this.doProgramaticScroll(element.offsetTop, 0, 0, skipReinitialised);
    }
  }

  disable() {
    if (this.isMounted()) {
      var $elem = this.get$Node();
      $elem.attr('data-scroll-disabled', true);
      $elem.addClass('ps-disabled');
      Ps.disable($elem[0]);
    }
  }

  enable() {
    if (this.isMounted()) {
      var $elem = this.get$Node();
      $elem.removeAttr('data-scroll-disabled');
      $elem.removeClass('ps-disabled');
      Ps.enable($elem[0]);
    }
  }

  reinitialised(forced) {
    if (this.props.onReinitialise) {
      this.props.onReinitialise(this, this.get$Node(), forced ? forced : false);
    }
  }

  onResize(forced, scrollPositionYPerc, scrollToElement) {
    if (forced && forced.originalEvent) {
      forced = true;
      scrollPositionYPerc = undefined;
    }

    this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
  }

  inViewport(domNode) {
    return verge.inViewport(domNode);
  }

  componentDidUpdate() {
    if (this.props.requiresUpdateOnResize || this.requiresUpdateOnResize) {
      this.onResize(true);
    }

    this.attachAnimationEvents();
  }

  customIsEventuallyVisible() {
    const chatRoom = this.props.chatRoom;
    return !chatRoom || chatRoom.isCurrentlyActive;
  }

  render() {
    var self = this;
    return React.createElement("div", {
      style: this.props.style,
      className: this.props.className
    }, self.props.children);
  }

}, _class2.defaultProps = {
  className: "perfectScrollbarContainer",
  requiresUpdateOnResize: true
}, _class2), ((0,_applyDecoratedDescriptor1__.Z)(_class.prototype, "eventuallyReinitialise", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyReinitialise"), _class.prototype), (0,_applyDecoratedDescriptor1__.Z)(_class.prototype, "onResize", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "onResize"), _class.prototype)), _class));

/***/ }),

/***/ 988:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (__WEBPACK_DEFAULT_EXPORT__)
});
var _chat_mixins0__ = __webpack_require__(503);
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);

var utils = __webpack_require__(79);



class Handler extends _chat_mixins0__.wl {
  render() {
    var classes = "tooltip-handler" + (this.props.className ? " " + this.props.className : "");
    return React.createElement("span", {
      className: classes,
      onMouseOver: this.props.onMouseOver,
      onMouseOut: this.props.onMouseOut
    }, this.props.children);
  }

}

Handler.defaultProps = {
  'hideable': true
};

class Contents extends _chat_mixins0__.wl {
  render() {
    var className = 'tooltip-contents dropdown body tooltip ' + (this.props.className ? this.props.className : "");

    if (this.props.active) {
      className += " visible";
      return React.createElement("div", {
        className: className
      }, this.props.withArrow ? React.createElement("i", {
        className: "dropdown-white-arrow"
      }) : null, this.props.children);
    } else {
      return null;
    }
  }

}

Contents.defaultProps = {
  'hideable': true
};

class Tooltip extends _chat_mixins0__.wl {
  constructor(props) {
    super(props);
    this.state = {
      'active': false
    };
  }

  componentDidUpdate(oldProps, oldState) {
    var self = this;

    if (oldState.active === true && this.state.active === false) {
      chatGlobalEventManager.removeEventListener('resize', 'tooltip' + this.getUniqueId());
    }

    if (self.state.active === true) {
      self.repositionTooltip();
      chatGlobalEventManager.addEventListener('resize', 'tooltip' + this.getUniqueId(), function () {
        self.repositionTooltip();
      });

      if (this.props.onShown) {
        this.props.onShown();
      }
    }
  }

  repositionTooltip() {
    var elLeftPos, elTopPos, elWidth, elHeight;
    var tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
    var docHeight;
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
      $(window).width();
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
  }

  onHandlerMouseOver() {
    this.setState({
      'active': true
    });
  }

  onHandlerMouseOut() {
    this.setState({
      'active': false
    });
  }

  render() {
    var self = this;
    var others = [];
    var handler = null;
    var contents = null;
    var x = 0;
    React.Children.forEach(this.props.children, function (child) {
      if (child.type.name === 'Handler') {
        handler = React.cloneElement(child, {
          onMouseOver: function () {
            self.onHandlerMouseOver();
          },
          onMouseOut: function () {
            self.onHandlerMouseOut();
          }
        });
      } else if (child.type.name === 'Contents') {
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
    return React.createElement("span", {
      className: this.props.className || ''
    }, handler, contents, others);
  }

}

Tooltip.defaultProps = {
  'hideable': true
};
const __WEBPACK_DEFAULT_EXPORT__ = ({
  Tooltip,
  Handler,
  Contents
});

/***/ }),

/***/ 79:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
"Emoji": () => (Emoji),
"OFlowEmoji": () => (OFlowEmoji),
"OFlowParsedHTML": () => (OFlowParsedHTML),
"ParsedHTML": () => (ParsedHTML),
"default": () => (__WEBPACK_DEFAULT_EXPORT__),
"withOverflowObserver": () => (withOverflowObserver)
});
var _chat_mixins0__ = __webpack_require__(503);
var React = __webpack_require__(363);

var ReactDOM = __webpack_require__(533);



class JScrollPane extends _chat_mixins0__.wl {
  componentDidMount() {
    super.componentDidMount();
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
    chatGlobalEventManager.addEventListener('resize', 'jsp' + self.getUniqueId(), self.onResize.bind(self));
    self.onResize();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    var $elem = $(ReactDOM.findDOMNode(this));
    $elem.off('jsp-will-scroll-y.jsp' + this.getUniqueId());
    chatGlobalEventManager.removeEventListener('resize', 'jsp' + this.getUniqueId());
  }

  eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
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
  }

  _doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem) {
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
  }

  onResize(forced, scrollPositionYPerc, scrollToElement) {
    if (forced && forced.originalEvent) {
      forced = true;
      scrollPositionYPerc = undefined;
    }

    this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
  }

  componentDidUpdate() {
    this.onResize();
  }

  render() {
    return React.createElement("div", {
      className: this.props.className
    }, React.createElement("div", {
      className: "jspContainer"
    }, React.createElement("div", {
      className: "jspPane"
    }, this.props.children)));
  }

}

JScrollPane.defaultProps = {
  className: "jScrollPaneContainer",
  requiresUpdateOnResize: true
};

class RenderTo extends React.Component {
  componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }

    this.popup = document.createElement("div");

    this._setClassNames();

    if (this.props.style) {
      $(this.popup).css(this.props.style);
    }

    this.props.element.appendChild(this.popup);
    var self = this;

    this._renderLayer(function () {
      if (self.props.popupDidMount) {
        self.props.popupDidMount(self.popup);
      }
    });
  }

  componentDidUpdate() {
    this._setClassNames();

    this._renderLayer();
  }

  componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }

    ReactDOM.unmountComponentAtNode(this.popup);

    if (this.props.popupWillUnmount) {
      this.props.popupWillUnmount(this.popup);
    }

    this.props.element.removeChild(this.popup);
  }

  _setClassNames() {
    this.popup.className = this.props.className ? this.props.className : "";
  }

  _renderLayer(cb) {
    ReactDOM.render(this.props.children, this.popup, cb);
  }

  render() {
    return null;
  }

}

const withOverflowObserver = Component => class extends _chat_mixins0__._p {
  constructor(...args) {
    super(...args);
    this.displayName = 'OverflowObserver';
    this.ref = React.createRef();
    this.state = {
      overflowed: false
    };

    this.handleMouseEnter = () => {
      const element = this.ref && this.ref.current;

      if (element) {
        this.setState({
          overflowed: element.scrollWidth > element.offsetWidth
        });
      }
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextState.overflowed !== this.state.overflowed || nextProps.children !== this.props.children || nextProps.content !== this.props.content;
  }

  render() {
    const {
      simpletip
    } = this.props;
    return React.createElement("div", {
      ref: this.ref,
      className: `
                        overflow-observer
                        ${this.state.overflowed ? 'simpletip simpletip-tc' : ''}
                    `,
      "data-simpletipposition": (simpletip == null ? void 0 : simpletip.position) || 'top',
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": (simpletip == null ? void 0 : simpletip.className) || 'medium-width center-align',
      onMouseEnter: this.handleMouseEnter
    }, React.createElement(Component, this.props));
  }

};
const Emoji = ({
  children
}) => {
  return React.createElement(ParsedHTML, {
    content: megaChat.html(children)
  });
};
class ParsedHTML extends React.Component {
  constructor(...args) {
    super(...args);
    this.ref = React.createRef();

    this.updateInternalState = () => {
      const {
        children,
        content
      } = this.props;
      const ref = this.ref && this.ref.current;

      if (!children && !content) {
        return d > 1 && console.warn('Emoji: No content passed.');
      }

      if (ref) {
        if (ref.childNodes.length) {
          while (ref.firstChild) {
            ref.removeChild(ref.firstChild);
          }
        }

        ref.appendChild(parseHTML(children || content));
      }
    };
  }

  shouldComponentUpdate(nextProps) {
    return nextProps && (nextProps.children !== this.props.children || nextProps.content !== this.props.content);
  }

  componentDidUpdate() {
    this.updateInternalState();
  }

  componentDidMount() {
    this.updateInternalState();
  }

  render() {
    const {
      className,
      onClick,
      tag
    } = this.props;
    return React.createElement(tag || 'span', {
      ref: this.ref,
      className: className,
      onClick: onClick
    });
  }

}
const OFlowEmoji = withOverflowObserver(Emoji);
const OFlowParsedHTML = withOverflowObserver(ParsedHTML);
const __WEBPACK_DEFAULT_EXPORT__ = ({
  JScrollPane,
  RenderTo,
  schedule: _chat_mixins0__.Os,
  SoonFcWrap: _chat_mixins0__.M9,
  OFlowEmoji,
  OFlowParsedHTML
});

/***/ }),

/***/ 363:
/***/ ((module) => {

"use strict";
module.exports = React;

/***/ }),

/***/ 533:
/***/ ((module) => {

"use strict";
module.exports = ReactDOM;

/***/ }),

/***/ 229:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (_applyDecoratedDescriptor)
});
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

/***/ }),

/***/ 462:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.d(__webpack_exports__, {
"Z": () => (_extends)
});
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };
  return _extends.apply(this, arguments);
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	__webpack_require__(662);
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(592);
/******/ 	
/******/ })()
;