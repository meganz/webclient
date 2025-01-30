import React from 'react';
import { createRoot } from 'react-dom';
import ConversationsUI from './ui/conversations.jsx';

require("./chatGlobalEventManager.jsx");
// load chatRoom.jsx, so that its included in bundle.js, despite that ChatRoom is legacy ES ""class""
require("./chatRoom.jsx");

// ensure that the Incoming dialog is included, so that it would be added to the window scope for accessing from
// vanilla JS
require("./ui/meetings/workflow/incoming.jsx");

import ChatRouting from "./chatRouting.jsx";
import MeetingsManager from './meetingsManager.jsx';
import { ChatOnboarding } from "./chatOnboarding.jsx";
import { inProgressAlert } from "./ui/meetings/call.jsx";

const EMOJI_DATASET_VERSION = 5;
const CHAT_ONHISTDECR_RECNT = "onHistoryDecrypted.recent";

const LOAD_ORIGINALS = {
    'image/gif': 25e6,
    'image/png': 2e5,
    'image/webp': 2e5
};

var CHATUIFLAGS_MAPPING = {
    'convPanelCollapse': 'cPC'
};

/**
 * MegaChat - UI component that links XMPP/Strophejs (via Karere) w/ the Mega's UI
 *
 * @returns {Chat}
 * @constructor
 */
function Chat() {
    var self = this;


    this.is_initialized = false;
    this.logger = MegaLogger.getLogger("chat");

    this.mbListeners = [];

    this.chats = new MegaDataMap();
    this.scheduledMeetings = new MegaDataMap();
    this.chatUIFlags = new MegaDataMap();
    this.$chatTreePanePs = [];
    this.initChatUIFlagsManagement();

    this.currentlyOpenedChat = null;
    this.currentlyOpenedView = null;
    this.lastOpenedChat = null;
    this.archivedChatsCount = 0;

    this.FORCE_EMAIL_LOADING = localStorage.fel;

    this._imageLoadCache = Object.create(null);
    this._imagesToBeLoaded = Object.create(null);
    this._imageAttributeCache = Object.create(null);
    this._queuedMccPackets = [];
    this._queuedMcsmPackets = {};
    this._queuedMessageUpdates = [];
    this._queuedChatRoomEvents = Object.create(null);

    this.handleToId = Object.create(null);
    this.publicChatKeys = Object.create(null);

    this.SOUNDS = {
        ALERT: 'alert_info_message',
        INCOMING_MSG: 'incoming_chat_message',
        INCOMING_CALL: 'incoming_voice_video_call',
        CALL_JOIN: 'user_join_call',
        CALL_LEFT: 'user_left_call',
        CALL_END: 'end_call',
        CALL_JOIN_WAITING: 'user_join_waiting',
        RECONNECT: 'reconnecting',
        SPEAKER_TEST: 'test_speaker',
    };

    this.options = {
        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
        /**
         * Really simple plugin architecture
         *
         * @property {ChatdIntegration} chatdIntegration
         * @property {CallManager2} callManager2
         * @property {UrlFilter} urlFilter
         * @property {EmoticonShortcutsFilter} emoticonShorcutsFilter
         * @property {EmoticonsFilter} emoticonsFilter
         * @property {CallFeedback} callFeedback
         * @property {PresencedIntegration} presencedIntegration
         * @property {PersistedTypeArea} persistedTypeArea
         * @property {BacktickRtfFilter} btRtfFilter
         * @property {RtfFilter} rtfFilter
         * @property {RichpreviewsFilter} richpreviewsFilter
         * @property {ChatToastIntegration} ChatToastIntegration
         * @property {ChatStats} chatStats
         * @property {GeoLocationLinks} geoLocationLinks
         * @property {MeetingsManager} meetingsManager
         * @property {ChatOnboarding} chatOnboarding
         */
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
            'geoLocationLinks': GeoLocationLinks,
            'meetingsManager': MeetingsManager,
            'chatOnboarding': ChatOnboarding,
            'userHelper': ChatUserHelper,
        },
        'chatNotificationOptions':  {
            'textMessages': {
                'incoming-chat-message': {
                    title: l.notif_title_incoming_msg, /* `New message` */
                    'icon': function(notificationObj) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        if (params.type === 'private') {
                            /* `%s sent you a message.` */
                            return l.notif_body_incoming_msg.replace('%s', params.from);
                        }
                        /* `%1 sent a message to %2` */
                        return l.notif_body_incoming_msg_group
                            .replace('%1', params.from)
                            .replace('%2', params.roomTitle);
                    }
                },
                'incoming-voice-video-call': {
                    'title': l[17878] || "Incoming call",
                    'icon': function(notificationObj) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return l[5893].replace('[X]', params.from); // You have an incoming call from [X].
                    }
                },
                'screen-share-error': {
                    title: l.screenshare_failed_notif || 'You are no longer sharing your screen',
                    icon: (notificationObj) => {
                        return notificationObj.options.icon;
                    },
                    body: '',
                },
                'upcoming-scheduled-occurrence': {
                    title: ({ options }) => {
                        return options.meeting.title;
                    },
                    icon: `${staticpath}/images/mega/mega-icon.svg`,
                    body: l.notif_body_scheduled_upcoming, /* `Meeting starts in 15 minutes` */
                },
                'starting-scheduled-occurrence': {
                    title: ({ options }) => {
                        return options.meeting.title;
                    },
                    icon: `${staticpath}/images/mega/mega-icon.svg`,
                    body: l.notif_body_scheduled_starting, /* `Meeting starts now` */
                }
            },
            sounds: Object.values(this.SOUNDS),
        },
        'chatStoreOptions': {
            'autoPurgeMaxMessagesPerRoom': 1024
        }
    };
    this.SOUNDS.buffers = Object.create(null);

    this.plugins = {};

    self.filePicker = null; // initialized on a later stage when the DOM is fully available.
    self._chatsAwaitingAps = {};

    // those, once changed, should trigger UI reupdate via MegaRenderMixin.
    MegaDataObject.call(
        this,
        {
            "currentlyOpenedChat": null,
            "activeCall": null,
            'routingSection': null,
            'routingSubSection': null,
            'routingParams': null,
        }
    );

    this.routing = new ChatRouting(this);

    Object.defineProperty(this, 'hasSupportForCalls', {
        get: function() {
            return typeof SfuClient !== 'undefined' && typeof TransformStream !== 'undefined' &&
                window.RTCRtpSender &&
                !!RTCRtpSender.prototype.createEncodedStreams;
        }
    });

    // Just have the one interval (per minute) for the whole chat.
    this.minuteClockInterval = setInterval(() => this._syncChats(), 6e4);

    return this;
};

inherits(Chat, MegaDataObject);

Object.defineProperty(Chat, 'mcf', {value: Object.create(null)});
Object.defineProperty(Chat, 'mcsm', {value: Object.create(null)});

/**
 * Initialize the MegaChat (also will connect to the XMPP)
 */
Chat.prototype.init = promisify(function(resolve, reject) {
    var self = this;
    if (self.is_initialized) {
        self.destroy();
    }

    if (d) {
        console.time('megachat:plugins:init');
    }


    // really simple plugin architecture that will initialize all plugins into self.options.plugins[name] = instance
    self.plugins = Object.create(null);
    self.plugins.chatNotifications = new ChatNotifications(self, self.options.chatNotificationOptions);
    self.plugins.chatNotifications.notifications.rebind('onAfterNotificationCreated.megaChat', function() {
        self.updateSectionUnreadCount();
    });


    Object.keys(self.options.plugins).forEach(plugin => {
        self.plugins[plugin] = new self.options.plugins[plugin](self);
    });

    if (d) {
        console.timeEnd('megachat:plugins:init');
    }

    // UI events
    var $body = $(document.body);
    if (!is_chatlink) {
        $(mega.ui.header.setStatus).rebind('mousedown.megachat', '.sub-menu.status button', function() {
            var presence = $(this).data("presence");
            self._myPresence = presence;

            // presenced integration
            var targetPresence = PresencedIntegration.cssClassToPresence(presence);

            self.plugins.presencedIntegration.setPresence(targetPresence);


            // connection management - chatd shards, presenced
            if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
                // going from OFFLINE -> online/away/busy, e.g. requires a connection

                Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(k => {
                    var v = self.plugins.chatdIntegration.chatd.shards[k];
                    v.connectionRetryManager.requiresConnection();
                });
            }
        });
    }

    // @todo where is this used?
    self.$container = $('.fm-chat-block');

    if (M.chat && !is_chatlink) {
        $('.activity-status-block, .activity-status').removeClass('hidden');
        $('.js-dropdown-account .status-dropdown').removeClass('hidden');
    }

    $body.rebind('mouseover.notsentindicator', '.tooltip-trigger', function() {
        var $this = $(this);
        var $notification = $('.tooltip.' + $this.attr('data-tooltip')).removeClass('hidden');
        var iconTopPos = $this.offset().top;
        var iconLeftPos = $this.offset().left;
        var notificatonHeight = $notification.outerHeight() + 10;
        var notificatonWidth = $notification.outerWidth() / 2 - 10;
        $notification.offset({top: iconTopPos - notificatonHeight, left: iconLeftPos - notificatonWidth});
    });

    $body.rebind('mouseout.notsentindicator click.notsentindicator', '.tooltip-trigger', function() {
        // hide all tooltips
        var $notification = $('.tooltip');
        $notification.addClass('hidden').removeAttr('style');
    });

    if (is_chatlink) {
        const {ph, key} = is_chatlink;
        Chat.mcf[ph] = key;
        this.publicChatKeys[ph] = key;
    }

    const promises = [];
    const rooms = Object.keys(Chat.mcf);
    for (let i = rooms.length; i--;) {
        const roomId = rooms[i];
        const room = Chat.mcf[roomId];
        if (!this.publicChatKeys[rooms[i]]) {
            promises.push(self.plugins.chatdIntegration.openChat(room, true));
        }
        delete Chat.mcf[rooms[i]];
    }

    Promise.allSettled(promises)
        .then(res => {
            const pub = Object.keys(this.publicChatKeys);
            return Promise.allSettled(
                [res].concat(pub.map(pch => {
                    return this.plugins.chatdIntegration.openChat(pch, true);
                }))
            );
        })
        .then(res => {
            res = res[0].value.concat(res.slice(1));
            this.logger.info('chats settled...', res);

            if (is_mobile) {
                // No more business here...
                return;
            }

            const selector = is_chatlink ? '.chat-links-preview > .chat-app-container' : '.section.conversations';
            const rootDOMNode = this.rootDOMNode = document.querySelector(selector);
            const $$root = this.$$root = createRoot(rootDOMNode);
            $$root.render(
                <ConversationsUI.ConversationsApp
                    megaChat={this}
                    routingSection={this.routingSection}
                    routingSubSection={this.routingSubSection}
                    routingParams={this.routingParams}
                />
            );

            this.onChatsHistoryReady()
                .then(() => {
                    const room = this.getCurrentRoom();
                    if (room) {
                        room.scrollToChat();
                    }
                    return room;
                })
                .dump('on-chat-history-loaded');

            this.is_initialized = true;
            this.registerUploadListeners();
            this.trigger('onInit');
            mBroadcaster.sendMessage('chat_initialized');
            setInterval(this.removeMessagesByRetentionTime.bind(this, null), 2e4);

            this.autoJoinIfNeeded();

            const scheduledMeetings = Object.values(Chat.mcsm);
            if (scheduledMeetings && scheduledMeetings.length) {
                for (let i = scheduledMeetings.length; i--;) {
                    const scheduledMeeting = scheduledMeetings[i];
                    this.plugins.meetingsManager.attachMeeting(scheduledMeeting);
                    delete Chat.mcsm[scheduledMeeting.id];
                }
            }

            if (notify) {
                notify.countAndShowNewNotifications();
            }

            return true;
        })
        .then(resolve)
        .catch(reject);
});

Chat.prototype.showUpgradeDialog = function() {
    return is_extension ?
        // `An update is available`, `MEGA Chat has been upgraded and it will now only be supported in...`
        msgDialog('warningb', l[1900], l[8841]) :
        // `An update is available`, `MEGA Chat has been upgraded and requires a reload. Do you reload...`
        msgDialog('confirmation', l[1900], l[8840], '', cb => cb && location.reload());
};

Chat.prototype._syncChats = function() {
    if (!this.is_initialized) {
        return;
    }
    this.plugins.meetingsManager.checkForNotifications();
    const { chats, logger } = this;
    if (chats && chats.length) {
        chats.forEach(({ chatId, scheduledMeeting }) => {
            // Sync push notification settings -- disable the mute notifications setting for the given room if
            // the selected mute until time have been reached.
            const dnd = pushNotificationSettings.getDnd(chatId);
            if (dnd && dnd < unixtime()) {
                pushNotificationSettings.disableDnd(chatId);
                if (logger) {
                    logger.debug(`Chat.prototype._syncDnd chatId=${chatId}`);
                }
            }

            // Sync scheduled meetings -- mark one-off meetings that have already passed, and update recurring
            // meetings with their immediate next occurrence.
            const { isUpcoming, chatRoom, id } = scheduledMeeting || {};
            if (isUpcoming) {
                scheduledMeeting.setNextOccurrence();
                chatRoom.trackDataChange();
                if (logger) {
                    logger.debug(`Chat.prototype.__syncScheduledMeetings id=${id} chatId=${chatId}`);
                }
            }
        });
    }
};

/**
 * Load chat UI Flags from mega.config
 *
 * @param [val] {Object} optional settings, if already received.
 */
Chat.prototype.loadChatUIFlagsFromConfig = function(val) {
    var hadChanged = false;
    var flags = val || mega.config.get("cUIF");
    if (flags) {
        if (typeof flags !== 'object') {
            flags = {};
        }

        // @todo refactor this to use config.factory()
        Object.keys(CHATUIFLAGS_MAPPING).forEach((k) => {
            var v = flags[CHATUIFLAGS_MAPPING[k]];
            hadChanged = v !== undefined && this.chatUIFlags.set(k, v) !== false || hadChanged;
        });
    }

    return hadChanged;
};

/**
 * Cleanup chat state when navigating away from it.
 * @param {Boolean} [clean] full cleanup to reinitialize/reroute the chat if a loadSubPage() will follow.
 * @returns {void}
 */
Chat.prototype.cleanup = function(clean) {
    const room = this.getCurrentRoom();
    if (room) {
        room.hide();
    }

    M.chat = false;
    this.routingParams = null;
    this.routingSection = null;
    this.routingSubSection = null;

    if (clean) {
        // a loadSubPage() will follow.
        M.currentdirid = page = false;
    }
};

/**
 * Init chatUIFlags management code
 */
Chat.prototype.initChatUIFlagsManagement = function() {
    var self = this;

    self.loadChatUIFlagsFromConfig();

    this.chatUIFlags.addChangeListener(function(hashmap, extraArg) {
        var flags = mega.config.get("cUIF") || {};
        var hadChanged = false;
        var hadLocalChanged = false;
        // merge w/ raw, so that we won't replace any new (unknown) flags set by new-version clients
        Object.keys(CHATUIFLAGS_MAPPING).forEach(function(k) {
            if (flags[CHATUIFLAGS_MAPPING[k]] !== self.chatUIFlags[k]) {
                if (extraArg === 0xDEAD) {
                    self.chatUIFlags._data[k] = flags[CHATUIFLAGS_MAPPING[k]];
                    hadLocalChanged = true;
                }
                else {
                    flags[CHATUIFLAGS_MAPPING[k]] = self.chatUIFlags[k];
                    hadChanged = true;
                }
            }
        });

        if (hadLocalChanged) {
            if (extraArg !== 0xDEAD) {
                // prevent recursion
                self.chatUIFlags.trackDataChange(0xDEAD);
            }

            $.tresizer();
        }
        if (extraArg === 0xDEAD) {
            // don't update the mega.config, it should be updated already by the ap
            return;
        }
        if (hadChanged) {
            mega.config.set("cUIF", flags);
        }
    });

    this.mbListeners.push(
        mBroadcaster.addListener('fmconfig:cUIF', tryCatch((v) => {
            if (self.loadChatUIFlagsFromConfig(v)) {
                self.chatUIFlags.trackDataChange(0xDEAD);
            }
        })),
        mBroadcaster.addListener('statechange', state => {
            this.trigger('viewstateChange', state);
        })
    );
};

Chat.prototype.unregisterUploadListeners = function(destroy) {
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

Chat.prototype.registerUploadListeners = function() {
    'use strict';
    var self = this;
    var logger = d && MegaLogger.getLogger('chatUploadListener', false, self.logger);

    self.unregisterUploadListeners(true);

    // Iterate chats for which we are uploading
    var forEachChat = function(chats, callback) {
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

    // find pending upload id by faid or handle
    var lookupPendingUpload = function(id) {
        console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');

        for (var uid in ulmanager.ulEventData) {
            if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
                return uid;
            }
        }
    };

    // Stop listening for upload-related events if there are no more pending uploads
    var unregisterListeners = function() {
        if (!$.len(ulmanager.ulEventData)) {
            self.unregisterUploadListeners();
        }
    };

    // Attach nodes to a chat room on upload completion
    var onUploadComplete = function(ul) {
        if (ulmanager.ulEventData[ul && ul.uid]) {
            forEachChat(ul.chat, function(room) {

                if (d) {
                    logger.debug('Attaching node[%s] to chat room[%s]...', ul.h, room.chatId, ul.uid, ul, M.d[ul.h]);
                }
                room.attachNodes([ul.h]).catch(dump);
            });

            delete ulmanager.ulEventData[ul.uid];
            unregisterListeners();
        }
    };

    // Handle upload completions
    var onUploadCompletion = function(uid, handle, faid, chat) {
        if (!chat) {
            if (d > 1) {
                logger.debug('ignoring upload:completion that is unrelated to chat.', arguments);
            }
            return;
        }

        const n = M.getNodeByHandle(handle);
        const ul = ulmanager.ulEventData[uid] || false;

        if (d) {
            logger.info('upload:completion', uid, handle, faid, ul, n);
        }

        if (!ul) {
            // This should not happen...
            if (d) {
                logger.error('Upload event data store missing...', uid, n, ul);
            }
        }
        else {
            ul.h = handle;

            if (ul.efa && !n) {
                if (d) {
                    logger.error('Invalid state, efa set on deduplication?', ul.efa, ul);
                }
                ul.efa = 0;
            }

            if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {
                // The fa was not yet attached to the node, wait for fa:* events
                ul.faid = faid;

                if (d) {
                    logger.info('Waiting for file attribute to arrive.', handle, ul);
                }
            }
            else {
                // this is not a media file or the fa is already set, attach node to chat room
                onUploadComplete(ul);
            }
        }
    };

    // Handle upload errors
    var onUploadError = function(uid, error) {
        var ul = ulmanager.ulEventData[uid];

        if (d) {
            logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
        }

        if (ul) {
            delete ulmanager.ulEventData[uid];
            unregisterListeners();
        }
    };

    // Signal upload completion on file attribute availability
    var onAttributeReady = function(handle, fa) {
        delay('chat:fa-ready:' + handle, function() {
            var uid = lookupPendingUpload(handle);
            var ul = ulmanager.ulEventData[uid] || false;

            if (d) {
                logger.debug('fa:ready', handle, fa, uid, ul);
            }

            if (ul.h && String(fa).split('/').length >= ul.efa) {
                // The fa is now attached to the node, add it to the chat room(s)
                onUploadComplete(ul);
            }
            else if (d) {
                logger.debug('Not enough file attributes yet, holding...', ul);
            }
        });
    };

    // Signal upload completion if we were unable to store file attributes
    var onAttributeError = function(faid, error, onStorageAPIError, nFAiled) {
        var uid = lookupPendingUpload(faid);
        var ul = ulmanager.ulEventData[uid] || false;

        if (d) {
            logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul, nFAiled, ul.efa);
        }

        // Attaching some fa to the node failed.
        if (ul) {
            // decrement the number of expected file attributes
            ul.efa = Math.max(0, ul.efa - nFAiled) | 0;

            // has this upload finished?
            if (ul.h) {
                // Yes, check whether we must attach the node
                const n = M.getNodeByHandle(ul.h);

                if (!ul.efa || (n.fa && String(n.fa).split('/').length >= ul.efa)) {
                    onUploadComplete(ul);
                }
            }
        }
    };

    // Register additional listeners when starting to upload
    var registerLocalListeners = function() {
        self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
        self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
        self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
        self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
        self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
    };

    // Listen to upload events
    var onUploadStart = function(data) {
        if (d) {
            logger.info('onUploadStart', [data]);
        }

        var notify = function(room) {
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

Chat.prototype.getRoomFromUrlHash = function(urlHash) {
    // works only for group and private chats for now
    if (urlHash.indexOf("#") === 0) {
        urlHash = urlHash.subtr(1, urlHash.length);
    }
    if (urlHash.indexOf("chat/g/") > -1 || urlHash.indexOf("chat/c/") > -1) {
        var foundRoom = null;
        urlHash = urlHash.replace("chat/g/", "").replace("chat/c/", "");
        megaChat.chats.forEach(function(room) {
            if (!foundRoom && room.chatId === urlHash) {
                foundRoom = room;
            }
        });
        return foundRoom;
    }
    else if (urlHash.indexOf("chat/p/") > -1) {
        var contactHash = urlHash.replace("chat/p/", "");
        if (!contactHash) {
            return;
        }

        var chatRoom = this.getPrivateRoom(contactHash);
        return chatRoom;
    }
    else if (urlHash.indexOf("chat/") > -1 && urlHash[13] === "#") {
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
    }
    else {
        return null;
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
    const notificationsCount = {
        unreadChats: 0,
        unreadMeetings: 0
    };


    var havePendingCall = false;
    self.chats.forEach(chatRoom => {
        if (chatRoom.isArchived() || chatRoom.state === ChatRoom.STATE.LEFT) {
            return;
        }

        const unreads = parseInt(chatRoom.messagesBuff.getUnreadCount(), 10);
        unreadCount += unreads;

        if (unreads) {
            notificationsCount[chatRoom.isMeeting ? 'unreadMeetings' : 'unreadChats'] += unreads;
        }

        if (
            !havePendingCall &&
            chatRoom.havePendingCall() &&
            chatRoom.uniqueCallParts &&
            !chatRoom.uniqueCallParts[u_handle]
        ) {
            havePendingCall = true;
        }
    });


    unreadCount = unreadCount > 9 ? "9+" : unreadCount;

    var haveContents = false;
    // try NOT to touch the DOM if not needed...
    if (havePendingCall) {
        haveContents = true;
        $('.new-messages-indicator .chat-pending-call')
            .removeClass('hidden');
    }
    else {
        $('.new-messages-indicator .chat-pending-call')
            .addClass('hidden')
            .removeClass("call-exists");
    }

    if (self._lastUnreadCount !== unreadCount) {
        if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
            $('.new-messages-indicator .chat-unread-count')
                .removeClass('hidden')
                .text(unreadCount);
        }
        else {
            $('.new-messages-indicator .chat-unread-count')
                .addClass('hidden');
        }
        self._lastUnreadCount = unreadCount;

        delay('notifFavicoUpd', () => {
            self.favico.reset();
            tryCatch(() => self.favico.badge(unreadCount))();
        });
    }

    if (
        !this._lastNotifications ||
        this._lastNotifications.unreadChats !== notificationsCount.unreadChats ||
        this._lastNotifications.unreadMeetings !== notificationsCount.unreadMeetings
    ) {
        this._lastNotifications = notificationsCount;
        megaChat.trigger('onUnreadCountUpdate', notificationsCount);
    }

    if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
        haveContents = true;
    }

    if (!haveContents) {
        $('.new-messages-indicator').addClass('hidden');
    }
    else {
        $('.new-messages-indicator').removeClass('hidden');
    }
}, 100);

/**
 * Drop all MegaChat databases.
 * @returns {Promise}
 */
Chat.prototype.dropAllDatabases = promisify(function(resolve, reject) {
    const chatd = this.plugins.chatdIntegration.chatd || false;
    const promises = [];

    if (chatd.chatdPersist) {
        promises.push(chatd.chatdPersist.drop());
    }

    if ('messagesQueueKvStorage' in chatd) {
        promises.push(chatd.messagesQueueKvStorage.destroy());
    }

    if (Reactions.ready) {
        promises.push(Reactions._db.destroy());
    }

    if (PersistedTypeArea.ready) {
        promises.push(PersistedTypeArea._db.destroy());
    }

    Promise.allSettled(promises).then(resolve).catch(reject);
});


/**
 * Destroy this MegaChat instance (leave all rooms then disconnect)
 *
 * @returns {*}
 */
Chat.prototype.destroy = function(isLogout) {
    if (!this.is_initialized) {
        return;
    }

    this.isLoggingOut = isLogout;

    for (let i = 0; i < this.mbListeners.length; i++) {
        mBroadcaster.removeListener(this.mbListeners[i]);
    }

    this.unregisterUploadListeners(true);
    this.trigger('onDestroy', [isLogout]);
    tryCatch(() => this.$$root.unmount())();

    this.chats.forEach((chatRoom, chatId) => {
        if (!isLogout) {
            chatRoom.destroy(false, true);
        }
        this.chats.remove(chatId);
    });

    // must be set before chatd disconnect, because of potential .destroy -> reinit and event queueing.
    this.is_initialized = false;

    if (
        this.plugins.chatdIntegration &&
        this.plugins.chatdIntegration.chatd &&
        this.plugins.chatdIntegration.chatd.shards
    ) {
        const { shards } = this.plugins.chatdIntegration.chatd;
        Object.keys(shards).forEach(shard => shards[shard].connectionRetryManager.options.functions.forceDisconnect());
    }

    for (const pluginName in this.plugins) {
        const plugin = this.plugins[pluginName];
        if (plugin.destroy) {
            plugin.destroy();
        }
    }

    if (this.minuteClockInterval) {
        clearInterval(this.minuteClockInterval);
    }
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
    else if (presence === UserPresence.PRESENCE.OFFLINE) {
        return 'offline';
    }
    else {
        return 'black';
    }
};

/**
 * Used to re-render my own presence/status
 */
Chat.prototype._renderMyStatus = function() {
    var self = this;
    if (!self.is_initialized) {
        return;
    }
    if (typeof(megaChat.userPresence) === 'undefined') {
        // still initialising...
        return;
    }

    // reset
    var $status = $('.activity-status-block .activity-status', 'body');

    $('.top-user-status-popup .dropdown-item').removeClass("active");


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
    const $activityStatus = $('.activity-text', '.js-topbar');

    if (actualPresence === UserPresence.PRESENCE.ONLINE) {
        $('.top-user-status-popup .dropdown-item[data-presence="chat"]').addClass("active");
        $activityStatus.text(l[5923]);
    }
    else if (actualPresence === UserPresence.PRESENCE.AWAY) {
        $('.top-user-status-popup .dropdown-item[data-presence="away"]').addClass("active");
        $activityStatus.text(l[5924]);
    }
    else if (actualPresence === UserPresence.PRESENCE.DND) {
        $('.top-user-status-popup .dropdown-item[data-presence="dnd"]').addClass("active");
        $activityStatus.text(l[5925]);
    }
    else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
        $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
        $activityStatus.text(l[5926]);
    }
    else {
        $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
        $activityStatus.text(l[5926]);
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


Chat.prototype.renderMyStatus = SoonFc(Chat.prototype._renderMyStatus, 100);

/**
 * openChat
 * @description Open and optionally show a new chat
 * @param {Array} userHandles LIst of user handles
 * @param {String} type Chat type, e.g. `private`, `group` or `public`
 * @param {String} [chatId] the chat id
 * @param {String} [chatShard] the chat shard
 * @param {String} [chatdUrl] the chatd URL
 * @param {Boolean} [setAsActive] optionally open and set the given chat as active
 * @param {String} [chatHandle] the public chat handle
 * @param {String} [publicChatKey] the public chat key
 * @param {String} ck the chat key
 * @param {Boolean} isMeeting Is the chat a meeting
 * @param {Object} [mcoFlags] Flags set by mco requests for the room see MCO_FLAGS for options.
 * @param {String} organiser The user handle of the user who created the chat
 * @return {String|ChatRoom|Promise}
 */

Chat.prototype.openChat = function(userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle,
                                   publicChatKey, ck, isMeeting, mcoFlags, organiser
) {
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
        this.initContacts(userHandles, 2);
        roomId = array.one(userHandles, u_handle);
        if (!roomId) {
            // found a chat where I'm the only user in?
            $promise.reject();
            return $promise;
        }
        if (self.chats[roomId]) {
            $promise.resolve(roomId, self.chats[roomId]);
            return [roomId, self.chats[roomId], $promise];
        }
    }
    else {
        assert(roomId, 'Tried to create a group chat, without passing the chatId.');
        roomId = chatId;
    }

    if (type === "group" || type === "public") {
        if (d) {
            console.time('openchat:' + chatId + '.' + type);
        }
        const newUsers = this.initContacts(userHandles);

        if (newUsers.length) {
            var chats = self.chats._data;

            if (d) {
                console.debug('openchat:%s.%s: processing %s new users...', chatId, type, newUsers.length);
            }

            // ._data is a dict, so no guard-for-in needed
            // eslint-disable-next-line guard-for-in
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
            // @todo couldn't this race?
            ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle).catch(dump);
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

    // chat room not found, create a new one
    room = new ChatRoom(
        self,
        roomId,
        type,
        userHandles,
        unixtime(),
        undefined,
        chatId,
        chatShard,
        chatdUrl,
        null,
        chatHandle,
        publicChatKey,
        ck,
        isMeeting,
        0,
        mcoFlags,
        organiser
    );

    self.chats.set(room.roomId, room);


    if (setAsActive && !self.currentlyOpenedChat || self.currentlyOpenedChat === room.roomId) {
        room.setActive();
    }

    room.showAfterCreation = setAsActive !== false;

    return [
        roomId, room, new Promise((resolve, reject) => {
            this.trigger('onRoomInitialized', [room, resolve, reject]);
            room.setState(ChatRoom.STATE.JOINING);

            const q = this._queuedChatRoomEvents[chatId];
            if (q) {
                delete this._queuedChatRoomEvents[chatId];

                for (let i = 0; i < q.length; ++i) {
                    const [event, data] = q[i];
                    if (d) {
                        this.logger.debug(`Dispatching deferred event '${event}'`, data);
                    }
                    room.trigger(event, data);
                }
                q.timer.abort();
            }

            this.processQueuedMcsmPackets();
        })
    ];
};

/**
 * @param {Array} userHandles Array of user-handles
 * @param {Number} [c] contact type relationship, as per M.u[].c
 * @return {Array} newly seen users
 */
Chat.prototype.initContacts = function(userHandles, c) {
    const newUsers = [];

    for (let i = userHandles.length; i--;) {
        const u = userHandles[i];
        const e = u in M.u;

        M.addUser(e ? {u} : {u, c}, e || !newUsers.push(u));
    }

    return newUsers;
};

/**
 * Wrapper around openChat() that does wait for the chat to be ready.
 * @see Chat.openChat
 */
Chat.prototype.smartOpenChat = function(...args) {
    var self = this;

    if (typeof args[0] === 'string') {
        // Allow to provide a single argument which defaults to opening a private chat with such user
        args[0] = [u_handle, args[0]];
        if (args.length < 2) {
            args.push('private');
        }
    }

    return new Promise((resolve, reject) => {

        // Helper function to actually wait for a room to be ready once we've got it.
        var waitForReadyState = function(aRoom, aShow) {
            var verify = function() {
                return aRoom.state === ChatRoom.STATE.READY;
            };

            var ready = function() {
                if (aShow) {
                    aRoom.show();
                }
                resolve(aRoom);
            };

            if (verify()) {
                return ready();
            }

            const {roomId} = aRoom;
            createTimeoutPromise(verify, 300, 3e4, false, `waitForReadyState(${roomId})`).then(ready).catch(reject);
        };

        // Check whether we can prevent the actual call to openChat()
        if (args[0].length === 2 && args[1] === 'private') {
            var chatRoom = self.chats[array.one(args[0], u_handle)];
            if (chatRoom) {
                if (args[5]) {
                    chatRoom.show();
                }
                return waitForReadyState(chatRoom, args[5]);
            }
        }

        var result = self.openChat.apply(self, args);

        if (result instanceof MegaPromise) {
            // if an straight promise is returned, the operation got rejected
            result.then(reject).catch(reject);
        }
        else if (!Array.isArray(result)) {
            // The function should return an array at all other times...
            reject(EINTERNAL);
        }
        else {
            var room = result[1];
            var roomId = result[0];
            var promise = result[2];

            if (!(promise instanceof Promise)) {
                // Something went really wrong...
                self.logger.error('Unexpected openChat() response...');
                return reject(EINTERNAL);
            }

            self.logger.debug('Waiting for chat "%s" to be ready...', roomId, [room]);

            promise.then((aRoom) => {
                const aRoomId = aRoom && aRoom.roomId;

                if (aRoomId !== roomId || (room && room !== aRoom) || !(aRoom instanceof ChatRoom)) {
                    self.logger.error('Unexpected openChat() procedure...', aRoomId, [aRoom]);
                    return reject(EINTERNAL);
                }

                waitForReadyState(aRoom);

            }).catch(ex => {
                if (ex === EACCESS) {
                    // API denied access to the room so discard it
                    room.destroy();
                }
                reject(ex);
            });
        }
    });
};

/**
 * Utility func to hide all visible chats
 */
Chat.prototype.hideAllChats = function() {
    var self = this;
    self.chats.forEach((chatRoom) => {
        if (chatRoom.isCurrentlyActive) {
            chatRoom.hide();
        }
    });
};

/**
 * Retrieve shared files history.
 * @param {Number} [len] number to retrieve
 * @param {ChatRoom} [chatRoom] chat room, current by default.
 * @returns {Promise<*>}
 */
Chat.prototype.retrieveSharedFilesHistory = async function(len = 47, chatRoom = null) {

    chatRoom = len instanceof ChatRoom ? len : chatRoom || this.getCurrentRoom();

    return chatRoom.messagesBuff.retrieveSharedFilesHistory(len);
};


/**
 * Returns the currently opened room/chat
 *
 * @returns {null|undefined|ChatRoom}
 */
Chat.prototype.getCurrentRoom = function() {
    return this.chats[this.currentlyOpenedChat];
};

/**
 * Returns the scheduled meeting for the currently opened room/chat
 * @returns {null|undefined|ScheduledMeeting}
 */

Chat.prototype.getCurrentMeeting = function() {
    const chatRoom = this.getCurrentRoom();
    return chatRoom && chatRoom.scheduledMeeting || null;
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
    const fail = (ex) => {
        this.logger.error(`sendMessage(${roomJid}) failed.`, ex);
    };

    // queue if room is not ready.
    if (!this.chats[roomJid]) {
        this.logger.warn("Queueing message for room: ", roomJid, val);

        const timeout = this.options.delaySendMessageIfRoomNotAvailableTimeout;
        return createTimeoutPromise(() => !!this.chats[roomJid], 500, timeout)
            .then(() => {
                return this.chats[roomJid].sendMessage(val);
            })
            .catch(fail);
    }

    return this.chats[roomJid].sendMessage(val).catch(fail);
};


/**
 * Called when a new user is added into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 * @param [isNewChat] {boolean} optional - pass true if this is called API that opens OR creates a new chat (new, from
 * in memory perspective)
 */
Chat.prototype.processNewUser = function(u, isNewChat) {
    var self = this;

    // self.logger.debug("added: ", u);

    if (self.plugins.presencedIntegration) {
        var user = M.u[u] || false;
        if (user.c === 1) {
            self.plugins.presencedIntegration.addContact(u, isNewChat);
        }
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

    // self.logger.debug("removed: ", u);

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


    if (!u_type && !self.$container && !megaChatIsReady) {
        $('.fm-chat-block').hide();
        return false;
    }
    $('.section.conversations .fm-chat-is-loading').addClass('hidden');
    // move to the proper place if loaded before the FM
    if (self.$container.parent('.section.conversations .fm-right-files-block').length == 0) {
        $('.section.conversations .fm-right-files-block').append(self.$container);
    }
    self.$leftPane = self.$leftPane || $('.conversationsApp .fm-left-panel');
    if (is_chatlink || megaChat._joinDialogIsShown) {
        self.$leftPane.addClass('hidden');
    }
    else {
        self.$leftPane.removeClass('hidden');
    }
};

Chat.prototype.navigate = function megaChatNavigate(location, event, isLandingPage) {
    return new Promise((resolve, reject) => {
        this.routing.route(resolve, reject, location, event, isLandingPage);
    });
};

if (is_mobile) {
    Chat.prototype.navigate = function(location, event, isLandingPage) {
        if (d) {
            this.logger.warn('mobile-nop navigate(%s)', location, event, isLandingPage);
        }
        if (is_chatlink) {
            // parsepage(pages.mobile);
            mobile.chatlink.show(is_chatlink.ph, is_chatlink.key);
        }
        else {
            loadSubPage('fm', event);
        }
        return Promise.resolve();
    };
}

/**
 * Called when Conversations tab is opened
 *
 * @returns boolean true if room was automatically shown and false if the listing page is shown
 */
Chat.prototype.renderListing = async function megaChatRenderListing(location, isInitial) {
    if (!isInitial && !M.chat) {
        console.debug('renderListing: Not in chat.');
        throw EACCESS;
    }
    M.hideEmptyGrids();
    this.refreshConversations();
    this.hideAllChats();

    $('.files-grid-view').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.fm-right-files-block').addClass('hidden');
    $('.fm-right-files-block.in-chat').removeClass('hidden');
    $('.nw-conversations-item').removeClass('selected');
    $('.fm-empty-conversations').removeClass('hidden');

    M.onSectionUIOpen('conversations');

    let room;
    if (!location && this.chats.length) {
        const valid = (room) => room && room._leaving !== true && room.isDisplayable() && room;
        room = valid(this.chats[this.lastOpenedChat]);

        if (!room) {
            let idx = 0;
            const rooms = Object.values(this.chats)
                .filter(r => this.currentlyOpenedView === null || r.isMeeting === !!this.currentlyOpenedView)
                .sort(M.sortObjFn('lastActivity', -1));

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

        return this.navigate(location, undefined, isInitial)
            .catch((ex) => {
                if (d) {
                    this.logger.warn('Failed to navigate to %s...', location, room, ex);
                }
                if (!room) {
                    return this.renderListing(null);
                }
                onIdle(() => {
                    room.destroy();
                });
                throw ex;
            });
    }

    return ENOENT;
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
            const sv = this.chats[roomId]?.messagesBuff?.sharedFiles?._sortedVals;

            if (sv && sv.length === M.v.length) {
                M.v.sort((a, b) => sv.indexOf(a.m) - sv.indexOf(b.m));
            }
            else {
                if (d) {
                    this.logger.info('falling back to order-value sorting.', sv);
                }
                M.v.sort(M.sortObjFn('co'));
            }

            for (var i = M.v.length; i--;) {
                var n = M.v[i];

                if (!n.revoked && !n.seen) {
                    n.seen = -1;

                    if (String(n.fa).indexOf(':1*') > 0) {
                        this._enqueueImageLoad(n);
                    }
                }
            }

            if ($.triggerSlideShow) {

                delay('chat:refresh-slideshow-on-single-entry', () => {
                    const {slideshowid: id} = window;

                    if (id && $.triggerSlideShow === id) {
                        slideshow(id);
                    }
                    delete $.triggerSlideShow;
                });
            }
        }
    }
    else if (d) {
        console.warn('Not in chat...');
    }
};

/**
 * Enqueue track data change on message, i.e. after image attachment are ready to be displayed.
 * @param {Message} message the
 * @private
 */
Chat.prototype._enqueueMessageUpdate = function(message) {
    this._queuedMessageUpdates.push(message);

    delay('chat:enqueue-message-updates', () => {
        var queue = this._queuedMessageUpdates;
        this._queuedMessageUpdates = [];

        for (var i = queue.length; i--;) {
            queue[i].trackDataChange();
        }
    }, 400);
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

        if (this._imageLoadCache[n.fa]) {
            this._imageLoadCache[n.fa].push(n.ch);
        }
        else {
            this._imageLoadCache[n.fa] = [n.ch];

            if (load) {
                this._imagesToBeLoaded[n.fa] = n;
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
        this._doneLoadingImage(n.fa);
    }
};

/**
 * Actual code that is throttled and does load a bunch of queued images
 * @private
 */
Chat.prototype._doLoadImages = function() {
    "use strict";

    var self = this;
    var originals = Object.create(null);
    var imagesToBeLoaded = self._imagesToBeLoaded;
    self._imagesToBeLoaded = Object.create(null);

    var chatImageParser = function(h, data) {
        var n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;

        if (n && data !== 0xDEAD) {
            // Set the attachment node image source
            n.src = mObjectURL([data.buffer || data], 'image/jpeg');
            n.srcBuffer = data;
        }
        else if (d) {
            console.warn('Failed to load image for %s', h, n);
        }

        self._doneLoadingImage(h);
    };

    for (var k in imagesToBeLoaded) {
        var node = imagesToBeLoaded[k];
        // Load png & webp originals to preserve their transparency, if any
        var mime = filemime(node);
        if (node.s < LOAD_ORIGINALS[mime]) {
            originals[node.fa] = node;
            delete imagesToBeLoaded[k];
        }
    }
    var onSuccess = function(ctx, origNodeHandle, data) {
        chatImageParser(origNodeHandle, data);
    };

    var onError = function(origNodeHandle) {
        chatImageParser(origNodeHandle, 0xDEAD);
    };

    var loadOriginal = function(n) {
        const origFallback = (ex) => {
            const type = String(n.fa).indexOf(':1*') > 0 ? 1 : 0;

            if (d) {
                console.debug('Failed to load original image on chat.', n.h, n, ex);
            }

            imagesToBeLoaded[n.fa] = originals[n.fa];
            delete originals[n.fa];

            delay('ChatRoom[' + self.roomId + ']:origFallback' + type, function() {
                api_getfileattr(imagesToBeLoaded, type, onSuccess, onError);
            });
        };

        M.gfsfetch(n.h, 0, -1).then(function(data) {
            var handler = is_image(n);

            if (typeof handler === 'function') {
                handler(data, (buffer) => {
                    if (buffer) {
                        chatImageParser(n.fa, buffer);
                    }
                    else {
                        origFallback(EFAILED);
                    }
                });
            }
            else {
                chatImageParser(n.fa, data);
            }
        }).catch(origFallback);
    };

    if ($.len(originals)) {
        Object.values(originals).map(loadOriginal);
    }

    api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);

    [imagesToBeLoaded, originals].forEach(function(obj) {
        Object.keys(obj).forEach(function(handle) {
            self._startedLoadingImage(handle);
        });
    });

    imagesToBeLoaded = Object.create(null);
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
    var self = this;
    var setSource = function(n, img, src) {
        var message = n.mo;

        img.onload = function() {
            img.onload = null;
            n.srcWidth = this.naturalWidth;
            n.srcHeight = this.naturalHeight;

            // Notify changes...
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
            }
            else {
                container.classList.add('thumb-failed');
            }

            n.seen = 2;
            container.classList.remove('thumb-loading');
            setSource(n, imgNode, src || window.noThumbURI || '');
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

        // Remove the reference to the message since it's no longer needed.
        delete n.mo;
    }

    if (src) {
        mBroadcaster.sendMessage('chat_image_preview');
    }
};

/**
 * Wait for history across all chats to be ready.
 * @param {Number} [timeout] in ms
 * @returns {Promise} rejected on fatal error only.
 */
Chat.prototype.onChatsHistoryReady = promisify(function(resolve, reject, timeout) {
    if (this.allChatsHadInitialLoadedHistory()) {
        return resolve();
    }

    let timer = null;
    const chatd = this.plugins.chatdIntegration.chatd;
    const eventName = 'onMessagesHistoryDone.ochr' + makeid(16);
    const ready = () => {
        queueMicrotask(resolve);
        chatd.off(eventName);

        if (timer) {
            timer.abort();
            timer = null;
        }
    };

    chatd.on(eventName, () => {
        if (this.allChatsHadInitialLoadedHistory()) {
            ready();
        }
    });

    if (timeout > 0) {
        (timer = tSleep(timeout / 1e3)).then(ready);
    }
});


Chat.prototype.allChatsHadLoadedHistory = function() {
    var chatIds = this.chats.keys();

    for (var i = chatIds.length; i--;) {
        var room = this.chats[chatIds[i]];
        if (room.isLoading()) {
            return false;
        }
    }

    return true;
};

Chat.prototype.allChatsHadInitialLoadedHistory = function() {
    var self = this;

    var chatIds = self.chats.keys();

    for (var i = chatIds.length; i--;) {
        var room = self.chats[chatIds[i]];
        if (room.chatId && room.initialMessageHistLoaded === false) {
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
    'use strict';

    return this.chats[h] || false;
};


Chat.prototype.createAndShowPrivateRoom = promisify(function(resolve, reject, h) {
    M.openFolder('chat/p/' + h)
        .then(() => {
            const room = this.getPrivateRoom(h);
            assert(room, 'room not found..');
            resolve(room);
        })
        .catch(reject);
});

Chat.prototype.createAndShowGroupRoomFor = function(contactHashes, topic, opts = {}) {
    this.trigger(
        'onNewGroupChatRequest',
        [
            contactHashes,
            {
                'topic': topic || "",
                ...opts
            }
        ]
    );
};

Chat.prototype.createAndStartMeeting = function(topic, audio, video) {
    megaChat.createAndShowGroupRoomFor([], topic, {
        keyRotation: false,
        createChatLink: true,
        isMeeting: true
    });
    megaChat.rebind('onRoomInitialized.meetingCreate', function(e, room) {
        room.rebind('onNewMeetingReady.meetingCreate', function() {
            room.startCall(audio, video);
        });
    });
};

/**
 * Debug/dev/testing function
 *
 * @private
 */
Chat.prototype._destroyAllChatsFromChatd = function() {
    var self = this;

    asyncApiReq({'a': 'mcf', 'v': Chatd.VERSION}).then((r) => {
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
    asyncApiReq({'a': 'mcf', 'v': Chatd.VERSION}).then((r) => {
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

/**
 * Warning: The data returned by this function is loaded directly and not hash-checked like in the secureboot.js. So
 * please use carefully and escape EVERYTHING that is loaded thru this.
 *
 * @param name
 * @returns {MegaPromise}
 */
Chat.prototype.getEmojiDataSet = async function(name) {
    assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");

    if (!this._emojiDataLoading) {
        this._emojiDataLoading = Object.create(null);
    }
    if (!this._emojiData) {
        this._emojiData = {
            'emojisUtf': Object.create(null),
            'emojisSlug': Object.create(null)
        };
    }

    if (this._emojiData[name]) {
        return this._emojiData[name];
    }

    if (this._emojiDataLoading[name]) {
        return this._emojiDataLoading[name];
    }

    if (name === "categories") {
        // reduce the XHRs by one, by simply moving the categories_v2.json to be embedded inline here:
        this._emojiData[name] = ["people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
        // note, when updating categories_vX.json, please update this ^^ manually.

        return this._emojiData[name];
    }

    const {promise} = mega;
    this._emojiDataLoading[name] = promise;

    // @todo get rid of MegaPromise in M.xhr() (and probably, move that to fetch())

    M.xhr({
        type: 'json',
        url: `${staticpath}js/chat/emojidata/${name}_v${EMOJI_DATASET_VERSION}.json`
    }).then((ev, data) => {
        if (!data) {
            promise.reject(EFAILED);
            return;
        }
        this._emojiData[name] = data;
        delete this._emojiDataLoading[name];
        if (name === "emojis") {
            this._mapEmojisToAliases();
        }
        promise.resolve(data);
    }).catch((ex, error) => {
        if (d) {
            this.logger.warn('Failed to load emoji data "%s": %s', name, error, [ex]);
        }
        delete this._emojiDataLoading[name];
        promise.reject(error || ex);
    });

    return promise;
};


Chat.prototype._mapEmojisToAliases = function() {
    const {emojis} = this._emojiData;

    if (emojis) {
        this._emojiData.emojisUtf = Object.create(null);
        this._emojiData.emojisSlug = Object.create(null);

        for (let i = emojis.length; i--;) {
            const emoji = emojis[i];

            this._emojiData.emojisUtf[emoji.u] = emoji;
            this._emojiData.emojisSlug[emoji.n] = emoji;
        }
    }
};

/**
 * Method for checking if an emoji by that slug exists
 * @param slug
 */
Chat.prototype.isValidEmojiSlug = function(slug) {
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
    if (this.chats[this.handleToId[chatdId]]) {
        return this.chats[this.handleToId[chatdId]];
    }

    var found = false;
    self.chats.forEach(function(chatRoom) {
        if (!found && chatRoom.chatId === chatdId) {
            found = chatRoom;
            return false;
        }
    });
    return found;
};


/**
 * Retrieves a message of idb if not in memory
 *
 * @param {String} chatId chatId
 * @param {String} messageId messageId
 * @returns {Promise}
 * @private
 */
Chat.prototype.getMessageByMessageId = async function(chatId, messageId) {
    const chatRoom = this.getChatById(chatId);
    const msg = chatRoom.messagesBuff.getMessageById(messageId);
    if (msg) {
        return msg;
    }

    const {chatdPersist} = this.plugins.chatdIntegration.chatd;
    if (chatdPersist) {
        const [msg] = await chatdPersist.getMessageByMessageId(chatId, messageId).catch(dump) || [];
        if (msg) {
            return Message.fromPersistableObject(chatRoom, msg);
        }
    }

    if (d) {
        this.logger.debug('getMessageByMessageId: Cannot find %s on %s', messageId, chatId);
    }
    return Promise.reject(ENOENT);
};

/**
 * Returns true if there is a chat room with an active (started/starting) call.
 *
 * @returns {boolean}
 */
Chat.prototype.haveAnyActiveCall = function() {
   var self = this;
   var chatIds = self.chats.keys();
   for (var i = 0; i < chatIds.length; i++) {
       if (self.chats[chatIds[i]].haveActiveCall()) {
           return true;
       }
   }
   return false;
};

Chat.prototype.haveAnyOnHoldCall = function() {
   var self = this;
   var chatIds = self.chats.keys();
   for (var i = 0; i < chatIds.length; i++) {
       if (self.chats[chatIds[i]].haveActiveOnHoldCall()) {
           return true;
       }
   }
   return false;
};


/**
 * Creates a 1on1 chat room and opens the send files from cloud drive dialog automatically
 *
 * @param {string} user_handle
 */
Chat.prototype.openChatAndSendFilesDialog = function(user_handle) {
    'use strict';

    this.smartOpenChat(user_handle)
        .then(function(room) {
            if (room.$rConversationPanel && room.$rConversationPanel.isMounted()) {
                room.trigger('openSendFilesDialog');
            }
            else {
                room.one('onComponentDidMount.sendFilesDialog', () => {
                    room.trigger('openSendFilesDialog');
                });
            }
            room.setActive();
        })
        .catch(this.logger.error.bind(this.logger));
};

/**
 * Wrapper around Chat.openChat and ChatRoom.attachNodes as a single helper function
 * @param {Array|String} targets Where to send the nodes
 * @param {Array} nodes The list of nodes to attach into the room(s)
 * @param {Boolean} [silent] prevent redirection to the chat room after nodes are attached
 * @returns {Promise<*>} chat rooms.
 * @see Chat.openChat
 * @see ChatRoom.attachNodes
 */
Chat.prototype.openChatAndAttachNodes = async function(targets, nodes, silent) {
    const promises = [];

    if (d) {
        console.group('Attaching nodes to chat room(s)...', targets, nodes);
    }

    const attachNodes = (roomId) => this.smartOpenChat(roomId)
        .then((room) => {
            return room.attachNodes(nodes)
                .then((res) => {
                    if (res !== EBLOCKED && res !== ENOENT) {
                        return room;
                    }
                });
        })
        .catch((ex) => {
            if (d) {
                this.logger.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId, ex);
            }
            throw ex;
        });

    if (!Array.isArray(targets)) {
        targets = [targets];
    }

    for (let i = targets.length; i--;) {
        promises.push(attachNodes(targets[i]));
    }
    const result = (await Promise.allSettled(promises)).map(e => e.value).filter(Boolean);

    for (let i = result.length; i--;) {
        if (result[i] instanceof ChatRoom) {
            const room = result[i];

            showToast('send-chat', nodes.length > 1 ? l[17767] : l[17766]);

            if (!silent) {
                await M.openFolder(room.getRoomUrl().replace('fm/', '')).catch(dump);
            }

            break;
        }
    }

    if (d) {
        console.groupEnd();
    }

    return result;
};

Chat.prototype.toggleUIFlag = function(name) {
    this.chatUIFlags.set(name, this.chatUIFlags[name] ? 0 : 1);
};

Chat.prototype.onSnActionPacketReceived = function() {
    if (this._queuedMccPackets.length > 0) {
        var aps = this._queuedMccPackets;
        this._queuedMccPackets = [];
        for (var i = 0; i < aps.length; i++) {
            mBroadcaster.sendMessage('onChatdChatUpdatedActionPacket', aps[i]);
        }
    }
    this.processQueuedMcsmPackets();
};

Chat.prototype.processQueuedMcsmPackets = function() {
    const aps = Object.values(this._queuedMcsmPackets);
    if (aps.length) {
        for (let i = 0; i < aps.length; i++) {
            const ap = aps[i];
            const { type, data } = ap;
            const { meetingsManager } = this.plugins;

            // Attach a new scheduled meeting to an existing room; handled in `Chat.openChat()` if
            // the room is not instantiated yet, e.g. when `mcc` and `mcsmp` are being received together.
            // Covers also existing scheduled meetings, incl. canceling a meeting.
            if (type === 'mcsmp') {
                const chatRoom = this.getChatById(data.cid);
                if (chatRoom) {
                    const scheduledMeeting = meetingsManager.attachMeeting(data, true);
                    delete this._queuedMcsmPackets[scheduledMeeting.id];
                    return scheduledMeeting.iAmOwner ? null : notify.notifyFromActionPacket({ ...data, a: type });
                }
            }

            if (type === 'mcsmr') {
                meetingsManager.detachMeeting(data);
                delete this._queuedMcsmPackets[data.id];
            }
        }
    }
};

Chat.prototype.getFrequentContacts = function() {
    if (Chat._frequentsCache) {
        return Chat._frequentsCache;
    }

    var chats = this.chats;
    var recentContacts = {};
    var promises = [];
    var finishedLoadingChats = {};
    var loadingMoreChats = {};

    // this should use potential "Incoming shares" managed .ts, but it seems it doesn't work and its only updated
    // by the chat, but in a different algorithm (that won't be UX-effective enough for showing top3-5 "recent"
    // contacts, so its disabled for now.
    // PS: .ts is used for "Last interaction", which is different (semantically) then "Recent(s)"

    // M.u.forEach(function(contact) {
    //     if (contact.c === 1 && contact.ts) {
    //         recentContacts[contact.h] = {'userId': contact.h, 'ts': contact.ts};
    //     }
    // });

    var _calculateLastTsFor = function(r, maxMessages) {
        var mb = r.messagesBuff;
        var len = mb.messages.length;
        var msgs = mb.messages.slice(Math.max(0, len - maxMessages), len);
        for (var i = 0; i < msgs.length; i++) {
            var msg = msgs[i];
            var contactHandle = msg.userId === mega.BID && msg.meta ? msg.meta.userId : msg.userId;
            if (r.type === "private" && contactHandle === u_handle) {
                contactHandle = contactHandle || r.getParticipantsExceptMe()[0];
            }

            if (
                contactHandle !== mega.BID &&
                contactHandle !== strongvelope.COMMANDER &&
                contactHandle in M.u && M.u[contactHandle].c === 1 &&
                contactHandle !== u_handle
            ) {
                if (!recentContacts[contactHandle] || recentContacts[contactHandle].ts < msg.delay) {
                    recentContacts[contactHandle] = { 'userId': contactHandle, 'ts': msg.delay };
                }
            }
        }
    };

    var _histDecryptedCb = function() {
        var mb = this.messagesBuff;

        if (!loadingMoreChats[this.chatId] && mb.messages.length < 32 && mb.haveMoreHistory()) {
            loadingMoreChats[this.chatId] = true;
            mb.retrieveChatHistory(false);
        }
        else {
            this.unbind(CHAT_ONHISTDECR_RECNT);
            _calculateLastTsFor(this, 32);
            delete loadingMoreChats[this.chatId];
            finishedLoadingChats[this.chatId] = true;
            mb.detachMessages();
        }
    };

    var _checkFinished = function(chatId) {
        return function() {
            return finishedLoadingChats[chatId] === true;
        };
    };

    chats.forEach((chatRoom) => {
        const name = `getFrequentContacts(${chatRoom.roomId})`;

        if (chatRoom.isLoading()) {
            finishedLoadingChats[chatRoom.chatId] = false;
            chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
            promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 10000, false, name));
        }
        else if (chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
            loadingMoreChats[chatRoom.chatId] = true;
            finishedLoadingChats[chatRoom.chatId] = false;
            chatRoom.messagesBuff.retrieveChatHistory(false);
            chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
            promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 15000, false, name));
        }
        else {
            _calculateLastTsFor(chatRoom, 32);
        }
    });

    Chat._frequentsCache = new Promise((resolve, reject) => {
        Promise.allSettled(promises)
            .then(() => {
                const result = Object.values(recentContacts)
                    .sort((a, b) => a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0)
                    .reverse();

                tSleep(300).then(() => {
                    delete Chat._frequentsCache;
                });
                return result;
            })
            .then(resolve)
            .catch(reject);
    });
    return Chat._frequentsCache;
};


Chat.prototype.eventuallyAddDldTicketToReq = function(req) {
    if (!u_handle) {
        return;
    }

    var currentRoom = this.getCurrentRoom();
    if (currentRoom && currentRoom.type === "public" && currentRoom.publicChatHandle
        && (is_chatlink || currentRoom.membersSetFromApi && !currentRoom.membersSetFromApi.members[u_handle])) {

        req['cauth'] = currentRoom.publicChatHandle;
    }
};

Chat.prototype.removeMessagesByRetentionTime = function(chatId) {
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

Chat.prototype.loginOrRegisterBeforeJoining = function(
    chatHandle,
    forceRegister,
    forceLogin,
    notJoinReq,
    onLoginSuccessCb
) {
    if (!chatHandle && page !== 'securechat' && (page === 'chat' || page.indexOf('chat') > -1)) {
        chatHandle = getSitePath().split("chat/")[1].split("#")[0];
    }
    assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');

    const chatRoom = megaChat.getCurrentRoom();
    var chatKey = "#" + window.location.hash.split("#").pop();
    var finish = function(stay) {
        if (!notJoinReq) {
            localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey, chatRoom.chatId]);
        }

        if (!stay) {
            window.location.reload();
        }
        return stay;
    };
    var doShowLoginDialog = function() {
        mega.ui.showLoginRequiredDialog({
            minUserType: 3,
            skipInitialDialog: 1,
            onLoginSuccessCb: onLoginSuccessCb
        })
            .done(() => {
                if (page !== 'login' && onLoginSuccessCb) {
                    onLoginSuccessCb();
                }
            });
    };

    var doShowRegisterDialog = function() {
        mega.ui.showRegisterDialog({
            title: l[5840],
            onCreatingAccount: function() {},
            onLoginAttemptFailed: function() {
                msgDialog('warninga:' + l[171], l[1578], l[218], null, function(e) {
                    if (e) {
                        $('.pro-register-dialog').addClass('hidden');
                        if (signupPromptDialog) {
                            signupPromptDialog.hide();
                        }
                        doShowLoginDialog();
                    }
                });
            },

            onAccountCreated: function(gotLoggedIn, registerData) {
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
        // logged in/confirmed account in another tab!
        return finish();
    }
    if (forceRegister) {
        return doShowRegisterDialog();
    }
    else if (forceLogin) {
        return doShowLoginDialog();
    }

    // no forcing, proceed w/ regular logic.
    if (u_wasloggedin()) {
        doShowLoginDialog();
    }
    else {
        doShowRegisterDialog();
    }
};


/**
 * highlight
 * @description Wraps given text within `strong` element based on passed strings to be matched; performs the highlight
 * while taking into account the presence of DOM tags and/or Emoji content.
 *
 * @param {string} text The text to be highlighted
 * @param {Object[]} matches Array of objects specifying the matches
 * @param {boolean} dontEscape flag indicating whether to perform escaping
 * @param {string} matches[].str The match term to check against
 * @param {number} matches[].idx Number identifier for the match term
 * @returns {string|void}
 *
 * @example
 * highlight('Example MEGA string as input.', [{ idx: 0, str: 'MEGA' }, { idx: 1, str: 'input' }]);
 * => 'Example <strong>MEGA</strong> string as <strong>input</strong>.'
 */

Chat.prototype.highlight = (text, matches, dontEscape) => {
    if (text && matches) {
        text = dontEscape ? text : escapeHTML(text);
        // extract HTML tags
        const tags = [];
        text = text.replace(/<[^>]+>/g, match => "@@!" + (tags.push(match) - 1) + "!@@").split(' ');
        const done = [];
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i].str;
            if (!done.includes(match)) {
                done.push(match);
                for (let j = 0; j < text.length; j++) {
                    const word = text[j];
                    const wordNormalized = ChatSearch._normalize_str(word);
                    const matchPos = wordNormalized.indexOf(match);
                    if (matchPos > -1) {
                        const split = wordNormalized.split(match);
                        text[j] = wordNormalized === word
                            ? split.join(`[$]${match}[/$]`)
                            : megaChat._highlightDiacritics(word, matchPos, split, match);
                    }
                }
            }
        }
        // add back the HTML tags
        // eslint-disable-next-line optimize-regex/optimize-regex,no-useless-escape
        text = text.join(' ').replace(/\@\@\!\d+\!\@\@/g, match => {
            return tags[parseInt(match.replace("@@!", "").replace("!@@"), 10)];
        });
        // Convert to strong tags
        return text.replace(/\[\$]/g, '<strong>').replace(/\[\/\$]/g, '</strong>');
    }
    return null;
};

/**
 * Helper for highlight to use correct diacritics when replacing in a normalised string
 *
 * @see Chat.highlight
 * @param {String} word The word being matched against
 * @param {Number} matchPos The position of the first match
 * @param {Array} split An array terms form from splitting the normalised string around the match
 * @param {String} match The string to match
 * @returns {string} The highlighted string
 * @private
 */
Chat.prototype._highlightDiacritics = function(word, matchPos, split, match) {
    const parts = [];
    const origMatch = word.substring(matchPos, matchPos + match.length);
    let pos = 0;
    for (let k = 0; k < split.length; k++) {
        parts.push(word.substring(pos, pos + split[k].length));
        pos = pos + split[k].length + match.length;
    }
    return parts.join(`[$]${origMatch}[/$]`);
};


/**
 * html
 * @description Parses passed content through `EmoticonsFilter`; returns escaped content w/ Emoji formatting.
 * @param {string} content The content to be escaped and processed by `EmoticonsFilter`
 * @returns {string|void} The escaped/processed content
 * @see EmoticonsFilter.processHtmlMessage
 * @see Emoji
 * @see ParsedHTML
 */

Chat.prototype.html = function(content) {
    if (content) {
        return this.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(content));
    }
    return '';
};

/**
 * Should be used only when keys are expected to had changed after room's protocol handlers were initialized (e.g.
 * after E++ account creation)
 */
Chat.prototype.updateKeysInProtocolHandlers = function() {
    this.chats.forEach((r) => {
        let ph = r.protocolHandler;
        if (ph) {
            ph.reinitWithNewData(
                u_handle,
                u_privCu25519,
                u_privEd25519,
                u_pubEd25519,
                ph.chatMode
            );
        }
    });
};


/**
 * A method called only once when chat inits first, to detect if we want to init Meetings UI
 */
Chat.prototype.eventuallyInitMeetingUI = function() {
    if (!window.location.hash) {
        return;
    }

    let loc = page.split("#")[0];
    loc = loc.replace("fm/", "/");
    if (loc.indexOf("chat/") === 0) {
        this.initialPubChatHandle = loc.substr(5).split("?")[0];
    }
};


Chat.prototype.enqueueChatRoomEvent = function(eventName, eventData) {
    if (!this.is_initialized) {
        // was destroyed
        return;
    }
    const {chatId} = eventData;

    if (!this._queuedChatRoomEvents[chatId]) {
        this._queuedChatRoomEvents[chatId] = [];

        (this._queuedChatRoomEvents[chatId].timer = tSleep(15))
            .then(() => {
                if (d) {
                    this.logger.warn('Timer ran out, events lost...', this._queuedChatRoomEvents[chatId]);
                }
                delete this._queuedChatRoomEvents[chatId];
            });
    }
    this._queuedChatRoomEvents[chatId].push([eventName, eventData]);
};


Chat.prototype.autoJoinIfNeeded = function() {
    const rawAutoLoginInfo = localStorage.autoJoinOnLoginChat;
    if (u_type && rawAutoLoginInfo) {
        var autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(rawAutoLoginInfo) || false;


        if (unixtime() - 2 * 60 * 60 < autoLoginChatInfo[1]) {
            const req = this.plugins.chatdIntegration.getMciphReqFromHandleAndKey(
                autoLoginChatInfo[0],
                autoLoginChatInfo[2].substr(1)
            );

            // Bind for when the room gets initialized by the mcpc ap
            megaChat.rebind('onRoomInitialized.autoJoin', (e, megaRoom) => {
                if (megaRoom.chatId === autoLoginChatInfo[3]) {
                    megaRoom.setActive();
                    megaChat.unbind('onRoomInitialized.autoJoin');
                    localStorage.removeItem("autoJoinOnLoginChat");
                }
            });

            // send the join mciph
            asyncApiReq(req).catch(dump);
        }
        else {
            localStorage.removeItem("autoJoinOnLoginChat");
        }
    }
};

Chat.prototype.openScheduledMeeting = function(meetingId, toCall) {
    const meeting = this.scheduledMeetings[meetingId];
    if (!meeting) {
        console.warn('Meeting does not exist', meetingId);
        return;
    }
    window.focus();
    meeting.chatRoom.activateWindow();
    meeting.chatRoom.show();
    if (toCall && this.hasSupportForCalls) {
        this.openScheduledMeeting._queue = this.openScheduledMeeting._queue || [];
        this.openScheduledMeeting._queue.push(meetingId);
        delay('megachat:openScheduledMeetingCall', () => {
            const meetingId = this.openScheduledMeeting._queue[0];
            delete this.openScheduledMeeting._queue;
            const meetingRoom = this.scheduledMeetings[meetingId].chatRoom;
            // Ensure the room we want to start a call in is showing in case another room was shown.
            meetingRoom.activateWindow();
            meetingRoom.show();
            const haveCall = this.haveAnyActiveCall();
            if (haveCall && window.sfuClient) {
                const { chatRoom } = this.activeCall;
                if (chatRoom && chatRoom.chatId === meetingRoom.chatId) {
                    const peers = chatRoom.getCallParticipants();
                    if (peers.includes(u_handle)) {
                        return d && console.warn('Already in this call');
                    }
                }
            }
            inProgressAlert(true, meetingRoom)
                .then(() => meetingRoom.startAudioCall(true))
                .catch(ex => d && console.warn('Already in a call.', ex));
        });
    }
};

/**
 * Use this to play sounds instead of directly using ion.sound.play
 * Note: May use ion.sound.stop to stop a sound without playing another.
 *
 * @param {string} sound The sound to play refer to megaChat.SOUNDS for current sounds though any may be used
 * @param {true|object} [options] If true will stop playing the sound before playing again. Otherwise an options object
 * @param {boolean} [stop] If true will stop playing the sound before playing again.
 *
 * @see megaChat.SOUNDS
 */
Chat.prototype.playSound = tryCatch((sound, options, stop) => {
    if (options === true) {
        stop = true;
        options = undefined;
    }
    if (stop) {
        ion.sound.stop(sound);
    }
    return ion.sound.play(sound, options);
});

/**
 * Fetch an ArrayBuffer representation of the given sound.
 *
 * @param {string} sound The sound file to fetch the buffer of
 * @returns {Promise} Resolves with the ArrayBuffer of the sound
 * @see megaChat.SOUNDS
 */
Chat.prototype.fetchSoundBuffer = async function(sound) {
    if (this.SOUNDS.buffers[sound]) {
        return this.SOUNDS.buffers[sound].slice();
    }
    let res = await M.xhr({url: `${staticpath}sounds/${sound}.mp3`, type: 'arraybuffer'}).catch(() => {
        console.warn('Failed to fetch sound .mp3 file', sound);
    });
    if (!res) {
        res = await M.xhr({ url: `${staticpath}sounds/${sound}.ogg`, type: 'arraybuffer' }).catch(() => {
            console.error('Failed to fetch sound .ogg file', sound);
        });
    }
    if (!res) {
        throw ENOENT;
    }
    this.SOUNDS.buffers[sound] = res.target.response.slice();
    return res.target.response;
};

window.Chat = Chat;

if (module.hot) {
    module.hot.accept();
}

export default {Chat};
