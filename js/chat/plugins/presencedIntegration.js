/**
 * Presenced integration
 *
 *
 * @param megaChat
 * @returns {PresencedIntegration}
 * @constructor
 */

var PresencedIntegration = function(megaChat) {
    var self = this;
    var loggerOpts = {};
    if (localStorage.presencedDebug) {
        loggerOpts['minLogLevel'] = function() { return MegaLogger.LEVELS.DEBUG; };
        loggerOpts['transport'] = function(level, args) {
            var fn = "log";

            if (level === MegaLogger.LEVELS.DEBUG) {
                fn = "debug";
            }
            else if (level === MegaLogger.LEVELS.LOG) {
                fn = "log";
            }
            else if (level === MegaLogger.LEVELS.INFO) {
                fn = "info";
            }
            else if (level === MegaLogger.LEVELS.WARN) {
                fn = "warn";
            }
            else if (level === MegaLogger.LEVELS.ERROR) {
                fn = "error";
            }
            else if (level === MegaLogger.LEVELS.CRITICAL) {
                fn = "error";
            }

            args.push("[" + fn + "]");
            console.debug.apply(console, args);
        };
    }
    else {
        loggerOpts['minLogLevel'] = function() { return MegaLogger.LEVELS.ERROR; };
    }

    self.logger = MegaLogger.getLogger("presencedIntegration", loggerOpts, megaChat.logger);

    self.megaChat = megaChat;

    self._is_mobile = {};
    self._is_webrtc = {};
    self._presence = {};

    megaChat.rebind("onInit.presencedIntegration", function() {
        // auto disable if the current connection is not to a websocket.
        self.init();
    });

    self.rebind('onPeerStatus.mystatus', function(e, handle, presence) {
        if (handle === u_handle) {
            megaChat.renderMyStatus();
        }
        M.onlineStatusEvent(M.u[handle], presence);
    });

    return self;
};

inherits(PresencedIntegration, MegaDataEmitter);

PresencedIntegration.FLAGS = {
    'IS_WEBRTC': 0x80,
    'IS_MOBILE': 0x40
};


PresencedIntegration.presenceToCssClass = function(presence) {
    if (presence === UserPresence.PRESENCE.ONLINE || presence === true) {
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

PresencedIntegration.cssClassToPresence = function(strPresence) {
    if (strPresence === 'online' || strPresence === 'chat') {
        return UserPresence.PRESENCE.ONLINE;
    }
    else if (strPresence === 'away') {
        return UserPresence.PRESENCE.AWAY;
    }
    else if (strPresence === 'busy' || strPresence === 'dnd') {
        return UserPresence.PRESENCE.DND;
    }
    else if (strPresence === 'offline') {
        return UserPresence.PRESENCE.OFFLINE;
    }
    else {
        return UserPresence.PRESENCE.UNAVAILABLE;
    }
};

PresencedIntegration.prototype.init = function() {
    if (anonymouschat) {
        return;
    }
    var self = this;
    var megaChat = self.megaChat;

    var userPresence = new UserPresence(
        u_handle,
        !!RTC,
        false,
        function presencedIntegration_connectedcb(isConnected) {
            // Tip: This cb can be called multiple times with the same isConnected argument, e.g. twice in case of
            // error + close or going offline (if supported by the browser) and then properly closing the socket
            self.logger.debug(isConnected ? "connected" : "disconnected");

            if (!u_handle) {
                // may be a logout or reload!
                return;
            }

            if (d) {
                console.time('presenced:init');
            }

            // set my own presence
            M.u.forEach(function(v, k) {
                if (k !== u_handle) {
                    v.presence = 'unavailable';
                }
            });

            if (d) {
                console.timeEnd('presenced:init');
            }

            megaChat.renderMyStatus();
        },
        self._peerstatuscb.bind(self),
        self._updateuicb.bind(self),
        null, // prefschangedcb
        function(user, minutes) {
            if (M.u[user]) {
                M.u[user].lastGreen = unixtime() - (minutes * 60);
            }

            if (PRESENCE2_DEBUG) {
                console.log("User", user, "last seen", minutes, "minutes ago");
            }
        }
    );

    /**
     *
     * @type {UserPresence}
     */
    megaChat.userPresence = self.userPresence = userPresence;

    userPresence.rebind('onConnected.presencedIntegration', function() {
        if (!u_handle || !M.u[u_handle]) {
            // a logout was triggered in the same moment just before the connect
            return;
        }
        // simply trust presence2.js and enable autoaway if its enabled initially in the code
        if (self.getAutoaway()) {
            self._initAutoawayEvents();
        }
        else {
            self._destroyAutoawayEvents();
        }

        // set my own presence
        M.u[u_handle].presence = self.getMyPresenceSetting();
    });

    userPresence.rebind('onDisconnected.presencedIntegration', function() {
        if (!u_handle || !M.u[u_handle]) {
            // may be a logout or reload!
            return;
        }

        M.u[u_handle].presence = "unavailable";
        self.megaChat.renderMyStatus();
    });


    userPresence.connectionRetryManager.requiresConnection();

    if (d) {
        console.time('presenced:init.peers');
    }

    // init .peers
    var peers = [];
    M.u.forEach(function(v, k) {
        if (v && k !== u_handle) {
            if (v.c === 1) {
                peers.push(k);
            }
            v.presence = 'unavailable';
        }
    });
    if (peers.length) {
        userPresence.addremovepeers(peers, false);
    }
    if (d) {
        console.timeEnd('presenced:init.peers');
    }
};

PresencedIntegration.prototype._updateuicb = function presencedIntegration_updateuicb(
    presence,
    autoaway,
    autoawaylock,
    autoawaytimeout,
    persist,
    persistlock,
    lastSeen
) {
    if (!u_handle) {
        // u_handle was cleared by menu reload / logout
        return;
    }
    var self = this;

    self.logger.debug("updateuicb", presence, autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen);

    self._presence[u_handle] = presence;

    if (self.getAutoaway()) {
        self._initAutoawayEvents();
    }
    else {
        self._destroyAutoawayEvents();
    }

    self.trigger('settingsUIUpdated', [autoaway, autoawaylock, autoawaytimeout, persist, persistlock, lastSeen]);

    self.trigger(
        'onPeerStatus',
        [
            u_handle,
            presence,
            !!RTC
        ]
    );
};

PresencedIntegration.prototype._peerstatuscb = function(user_hash, presence, isWebrtcFlag) {
    var self = this;

    self.logger.debug("peerstatuscb", user_hash, presence, isWebrtcFlag);


    isWebrtcFlag = isWebrtcFlag === PresencedIntegration.FLAGS.IS_WEBRTC;
    self._presence[user_hash] = presence;
    self._is_webrtc[user_hash] = isWebrtcFlag;

    var contact = M.u[user_hash];

    if (contact) {
        if (contact.presence === UserPresence.PRESENCE.ONLINE && presence !== UserPresence.PRESENCE.ONLINE) {
            contact.lastGreen = unixtime();
        }
        contact.presence = presence;
    }
    else {
        // unknown contact, add it to the contact list.
        contact = M.setUser(user_hash);
        contact.presence = presence;
        if (presence === UserPresence.PRESENCE.ONLINE) {
            contact.lastGreen = unixtime();
        }

        M.syncUsersFullname(user_hash);
        M.syncContactEmail(user_hash);
    }

    self.trigger(
        'onPeerStatus',
        [
            user_hash,
            presence,
            isWebrtcFlag
        ]
    );
};

PresencedIntegration.prototype.setPresence = function(presence) {
    var self = this;
    self.logger.debug("setPresence", presence);

    if (presence === UserPresence.PRESENCE.ONLINE) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.ui_setstatus(UserPresence.PRESENCE.ONLINE);
            });
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.ui_setstatus(UserPresence.PRESENCE.AWAY);
            });
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.ui_setstatus(UserPresence.PRESENCE.DND);
            });
    }
    else if (presence === UserPresence.PRESENCE.OFFLINE) {
        localStorage.removeItem("userPresenceIsOffline");

        // localStorage.userPresenceIsOffline = 1;

        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.ui_setstatus(UserPresence.PRESENCE.OFFLINE);
            });
    }
};

PresencedIntegration.prototype.addContact = function(u_h, isNewChat) {
    this.logger.debug("addContact", u_h);

    if (this.userPresence) {
        // can happen in case there is a queued/cached action packet that triggers add contact, before the chat had
        // fully loaded and initialised
        this.eventuallyAddPeer(u_h, isNewChat);
    }
};

PresencedIntegration.prototype.removeContact = function(u_h) {
    this.logger.debug("removeContact", u_h);

    if (this.userPresence) {
        // can happen in case there is a queued/cached action packet that triggers add contact, before the chat had
        // fully loaded and initialised
        this.userPresence.addremovepeers([u_h], true);
    }
    this._peerstatuscb(u_h, UserPresence.PRESENCE.UNAVAILABLE, false);
};

/**
 * Retrieve presence
 *
 * @param u_h {String} user's handle or empty for own presence
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */
PresencedIntegration.prototype.getPresence = function(u_h) {
    if (!u_h) {
        u_h = u_handle;
    }
    // this.logger.debug("getPresence", u_h, this._presence[u_h]);
    return this._presence[u_h];
};

PresencedIntegration.prototype.getPresenceAsText = function(u_h, pres) {
    if (!pres) {
        pres = this.getPresence(u_h);
    }
    return constStateToText(UserPresence.PRESENCE, pres);
};

PresencedIntegration.prototype.getAutoaway = function() {
    return this.userPresence.autoawayactive;
};

PresencedIntegration.prototype._initAutoawayEvents = function() {
    'use strict';

    var self = this;
    var oldOA;

    this._destroyAutoawayEvents();
    this._destroyAutoawayEvents = function() {
        window.onactivity = oldOA;
        delete this._destroyAutoawayEvents;
    };

    oldOA = window.onactivity;
    window.onactivity = function() {
        self.userPresence.ui_signalactivity();
        if (oldOA) {
            onIdle(oldOA);
        }
    };
};

PresencedIntegration.prototype._destroyAutoawayEvents = function() {
    'use strict';
    /* dummy */
};

/**
 * This method would simply return the last known user's setting for the presence. E.g. the user can be OFFLINE,
 * but since he did set his last presence to ONLINE, this method would return ONLINE
 */
PresencedIntegration.prototype.getMyPresenceSetting = function() {
    return this.getPresence();
};

/**
 * This method would return the actual presence of the current user, e.g. even if he had set his presence to ONLINE,
 * but he is right now offline (connection issue, etc) this method would return OFFLINE (the opposite of what
 * .getMyPresenceSetting() does).
 *
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */
PresencedIntegration.prototype.getMyPresence = function() {
    if (!this.megaChat.userPresence) {
        return;
    }

    var conRetMan = this.megaChat.userPresence.connectionRetryManager;
    return conRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED ?
        UserPresence.PRESENCE.OFFLINE :
        this.getPresence();
};


PresencedIntegration.prototype.eventuallyRemovePeer = function(user_handle, chatRoom) {
    var self = this;
    var skipRemoving = false;
    var megaChat = self.megaChat;
    if (M.u[user_handle] && M.u[user_handle].c === 1) {
        return;
    }
    if (M.u[user_handle] && M.u[user_handle].c === -1) {
        skipRemoving = true;
    }

    !skipRemoving && megaChat.chats.forEach(function(testChatRoom) {
        if (testChatRoom !== chatRoom && typeof(testChatRoom.members[user_handle]) !== 'undefined') {
            skipRemoving = true;
        }
    });
    var binUserHandle = base64urldecode(user_handle);

    if (!skipRemoving && megaChat.userPresence.peers[binUserHandle]) {
        megaChat.userPresence.addremovepeers([user_handle], true);
    }
};

PresencedIntegration.prototype.eventuallyAddPeer = function(user_handle, isNewChat) {
    'use strict';

    if (this.userPresence) {
        var user = user_handle in M.u && M.u[user_handle] || false;
        if (user.c === 1) {
            var binUserHandle = base64urldecode(user_handle);
            if (!this.userPresence.peers[binUserHandle]) {
                this.userPresence.addremovepeers([user_handle], false);
            }
        }
    }
};
