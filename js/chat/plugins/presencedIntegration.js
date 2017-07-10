/**
 * Presenced integration and sync with XMPP
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

    megaChat.unbind("onInit.karerePing");
    megaChat.bind("onInit.karerePing", function(e) {
        // auto disable if the current connection is not to a websocket.
        self.init();
    });

    $(self).rebind('onPeerStatus.mystatus', function(e, handle, presence) {
        if (handle === u_handle) {
            megaChat.renderMyStatus();
        }
    });

    return self;
};


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
    else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
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
        return UserPresence.PRESENCE.OFFLINE;
    }
};

PresencedIntegration.prototype.init = function() {
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
            // set my own presence
            M.u.forEach(function(v, k) {
                if (k !== u_handle) {
                    v.presence = 'unavailable';
                }
            });

            megaChat.renderMyStatus();
        },
        self._peerstatuscb.bind(self),
        self._updateuicb.bind(self)
    );




    /**
     *
     * @type {UserPresence}
     */
    megaChat.userPresence = self.userPresence = userPresence;

    $(userPresence).rebind('onConnected.presencedIntegration', function(e) {
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

        var contactHashes = [];
        M.u.forEach(function(v, k) {
            if (k === u_handle || !v) {
                return;
            }

            if (v.c !== 0) {
                contactHashes.push(k);
            }

            v.presence = 'unavailable';
        });

        M.u[u_handle].presence = self.getMyPresenceSetting();

        userPresence.addremovepeers(contactHashes);
    });

    $(userPresence).rebind('onDisconnected.presencedIntegration', function(e) {
        if (!u_handle || !M.u[u_handle]) {
            // may be a logout or reload!
            return;
        }

        M.u[u_handle].presence = "unavailable";
        self.megaChat.renderMyStatus();
    });


    userPresence.connectionRetryManager.requiresConnection();
};

PresencedIntegration.prototype._updateuicb = function presencedIntegration_updateuicb(
    presence,
    autoaway,
    autoawaylock,
    autoawaytimeout,
    persist,
    persistlock
) {
    if (!u_handle) {
        // u_handle was cleared by menu reload / logout
        return;
    }
    var self = this;

    self.logger.debug("updateuicb", presence, autoaway, autoawaylock, autoawaytimeout, persist, persistlock);

    self._presence[u_handle] = presence;

    var status;
    if (presence === UserPresence.PRESENCE.OFFLINE) {
        status = 'offline';
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        status = 'away';
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        status = 'dnd';
    }
    else if (presence === UserPresence.PRESENCE.ONLINE) {
        status = 'available';
    }
    else {
        status = 'unavailable';
    }

    // sync presenced -> xmpp
    var xmppPresence = megaChat.karere.getPresence(megaChat.karere.getJid());
    var targetKarerePresence = false;

    if (status === 'away' && xmppPresence !== 'away') {
        targetKarerePresence = Karere.PRESENCE.AWAY;
    }
    else if (status === 'dnd' && xmppPresence !== 'dnd') {
        targetKarerePresence = Karere.PRESENCE.BUSY;

    }
    else if (status === 'available' && xmppPresence !== 'available') {
        targetKarerePresence = Karere.PRESENCE.ONLINE;
    }

    if (targetKarerePresence) {
        if (!xmppPresence) {
            megaChat.karere.connectionRetryManager.requiresConnection()
                .then(function() {
                    megaChat.karere.setPresence(targetKarerePresence);
                });
        }
        else {
            megaChat.karere.setPresence(targetKarerePresence);
        }
    }

    if (self.getAutoaway()) {
        self._initAutoawayEvents();
    }
    else {
        self._destroyAutoawayEvents();
    }

    $(self).trigger('settingsUIUpdated', [autoaway, autoawaylock, autoawaytimeout, persist, persistlock]);

    $(self).trigger(
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
    var status;
    if (presence === UserPresence.PRESENCE.OFFLINE) {
        status = 'offline';
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        status = 'away';
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        status = 'dnd';
    }
    else if (presence === UserPresence.PRESENCE.ONLINE) {
        status = 'available';
    }
    else {
        status = 'unavailable';
    }


    if (contact) {
        contact.presence = status;
    }
    else {
        // unknown contact, add it to the contact list.
        M.u.set(
            user_hash,
            new MegaDataObject(MEGA_USER_STRUCT, true, {
                'h': user_hash,
                'u': user_hash,
                'm': '',
                'c': 0
            })
        );
        contact = M.u[user_hash];
        contact.presence = status;
        M.syncUsersFullname(user_hash);
    }

    $(self).trigger(
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

PresencedIntegration.prototype.addContact = function(u_h) {
    this.logger.debug("addContact", u_h);

    if (this.userPresence) {
        // can happen in case there is a queued/cached action packet that triggers add contact, before the chat had
        // fully loaded and initialised
        this.userPresence.addremovepeers([u_h]);
    }
};

PresencedIntegration.prototype.removeContact = function(u_h) {
    this.logger.debug("removeContact", u_h);

    if (this.userPresence) {
        // can happen in case there is a queued/cached action packet that triggers add contact, before the chat had
        // fully loaded and initialised
        this.userPresence.addremovepeers([u_h], true);
    }
    this._peerstatuscb(u_h, UserPresence.PRESENCE.OFFLINE, false);
};

PresencedIntegration.prototype.getPresence = function(u_h) {
    if (!u_h) {
        u_h = u_handle;
    }
    this.logger.debug("getPresence", u_h, this._presence[u_h]);
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

    var self = this;
    $(document.body).rebind('mousemove.presencedInt keypress.presencedInt', function() {
        delay('ui_signalactivity', function() {
            self.userPresence.ui_signalactivity();
        }, 1000);
    });
};

PresencedIntegration.prototype._destroyAutoawayEvents = function() {
    $(document.body).unbind('mousemove.presencedInt');
    $(document.body).unbind('keypress.presencedInt');
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
    var foundInOtherChatRooms = false;
    var megaChat = self.megaChat;
    megaChat.chats.forEach(function(testChatRoom) {
        if (testChatRoom !== chatRoom && typeof(testChatRoom.members[user_handle]) !== 'undefined') {
            foundInOtherChatRooms = true;
        }
    });

    var binUserHandle = base64urldecode(user_handle);

    if (!foundInOtherChatRooms && megaChat.userPresence.peers[binUserHandle]) {
        megaChat.userPresence.addremovepeers([user_handle], true);
    }
};

PresencedIntegration.prototype.eventuallyAddPeer = function(user_handle) {
    var binUserHandle = base64urldecode(user_handle);

    if (!megaChat.userPresence.peers[binUserHandle]) {
        megaChat.userPresence.addremovepeers([user_handle]);
    }
};
