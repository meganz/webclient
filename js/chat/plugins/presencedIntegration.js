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
            console.warn.apply(console, args);
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


    $(self.userPresence).rebind('onDisconnected.presencedInt', function() {
        console.error('yup, onDiss2');
        self.trigger('onDisconnected');
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
    var userPresence = new UserPresence(
        u_handle,
        !!RTC,
        false,
        function presencedIntegration_connectedcb(isConnected) {
            self.logger.debug(isConnected ? "connected" : "disconnected");
        },
        self._peerstatuscb.bind(self),
        self._updateuicb.bind(self)
    );

    var megaChat = self.megaChat;


    /**
     *
     * @type {UserPresence}
     */
    megaChat.userPresence = self.userPresence = userPresence;

    $(userPresence).rebind('onConnected.presencedIntegration', function(e) {
        // set my own presence

        var contactHashes = [];
        M.u.forEach(function(v, k) {
            if (k !== u_handle && v.c !== 0) {
                contactHashes.push(k);
            }

            v.presence = 'unavailable';
        });

        userPresence.addremovepeers(contactHashes);
    });

    $(userPresence).rebind('onDisconnected.presencedIntegration', function(e) {
        // set my own presence
        M.u.forEach(function(v, k) {
            v.presence = 'unavailable';
        });
    });

    // if (!localStorage.userPresenceIsOffline) {
        userPresence.connectionRetryManager.requiresConnection();
    // }
};

PresencedIntegration.prototype._updateuicb = function presencedIntegration_updateuicb(
    presence,
    autoaway,
    autoawaytimeout,
    persist
) {
    var self = this;

    self.logger.debug("updateuicb", presence, autoaway, autoawaytimeout, persist);
    console.error('updateuicb', arguments);

    self._presence[u_handle] = presence;

    var status;
    if (presence == UserPresence.PRESENCE.OFFLINE) {
        status = 'offline';
    }
    else if (presence == UserPresence.PRESENCE.AWAY) {
        status = 'away';
    }
    else if (presence == UserPresence.PRESENCE.DND) {
        status = 'dnd';
    }
    else if (presence == UserPresence.PRESENCE.ONLINE) {
        status = 'available';
    }
    else {
        status = 'unavailable';
    }

    // sync presenced -> xmpp
    var xmppPresence = megaChat.karere.getPresence(megaChat.karere.getJid());
    var targetKarerePresence = false;

    if (status === 'offline' && xmppPresence) {
        megaChat.karere.disconnect();
    }
    else if (status === 'away' && xmppPresence !== 'away') {
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

    $(self).trigger('settingsUIUpdated', [autoaway, autoawaytimeout, persist]);

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

    console.error("peerstatuscb", user_hash, presence, isWebrtcFlag);

    isWebrtcFlag = isWebrtcFlag === PresencedIntegration.FLAGS.IS_WEBRTC;
    self._presence[user_hash] = presence;
    self._is_webrtc[user_hash] = isWebrtcFlag;

    var contact = M.u[user_hash];
    if (contact) {
        var status;
        if (presence == UserPresence.PRESENCE.OFFLINE) {
            status = 'offline';
        }
        else if (presence == UserPresence.PRESENCE.AWAY) {
            status = 'away';
        }
        else if (presence == UserPresence.PRESENCE.DND) {
            status = 'dnd';
        }
        else if (presence == UserPresence.PRESENCE.ONLINE) {
            status = 'available';
        }
        else {
            status = 'unavailable';
        }

        contact.presence = status;
    }

    if (user_hash === u_handle) {
        self._updateuicb(presence);
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

        localStorage.userPresenceIsOffline = 1;

        localStorage.removeItem("megaChatPresence"); // legacy


        // self.userPresence.canceled = true;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.ui_setstatus(UserPresence.PRESENCE.OFFLINE);
            });

        self.megaChat.karere.disconnect();
        // self._presence = {};
    }
};

PresencedIntegration.prototype.addContact = function(u_h) {
    this.logger.debug("addContact", u_h);

    if (
        this.userPresence.connectionRetryManager.getConnectionState()
            ===
        ConnectionRetryManager.CONNECTION_STATE.CONNECTED
    ) {
        this.userPresence.addremovepeers([u_h]);
    }
};

PresencedIntegration.prototype.removeContact = function(u_h) {
    this.logger.debug("removeContact", u_h);

    if (
        this.userPresence.connectionRetryManager.getConnectionState()
        ===
        ConnectionRetryManager.CONNECTION_STATE.CONNECTED
    ) {
        this.userPresence.addremovepeers([u_h], true);
        this._peerstatuscb(u_h, UserPresence.PRESENCE.OFFLINE, false);
    }
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

PresencedIntegration.prototype.setAutoaway = function(minutes) {
    // no need to do this here - the UI callback is always called
    //this._initAutoawayEvents();

    this.userPresence.ui_setautoaway(true, minutes*60);
};

PresencedIntegration.prototype.setAutoawayOn = function() {
    this.setAutoaway(true, this.userPresence.seconds());
};

PresencedIntegration.prototype.setAutoawayOff = function() {
    // no need to do this here - the UI callback is always called
    //this._destroyAutoawayEvents();

    this.userPresence.ui_setautoaway(false, this.userPresence.seconds());
};

PresencedIntegration.prototype.getAutoaway = function() {
    return (this.userPresence.autoawaytimeout & 0x8000) ?
            false :
            Math.floor(this.userPresence.seconds()/60);
};

PresencedIntegration.prototype.setPersistOn = function() {
    this.userPresence.ui_setpersist(true);
};

PresencedIntegration.prototype.setPersistOff = function() {
    this.userPresence.ui_setpersist(false);
};

PresencedIntegration.prototype.getPersist = function() {
    return this.userPresence.persist;
};

PresencedIntegration.prototype._initAutoawayEvents = function() {
    console.error("presencedInt._initAutoawayEvents");

    var self = this;
    $(document.body).rebind('mousemove.presencedInt keypress.presencedInt', function() {
        delay('ui_signalactivity', function() {
            self.userPresence.ui_signalactivity();
        }, 1000);
    });
};

PresencedIntegration.prototype._destroyAutoawayEvents = function() {
    console.error("presencedInt._desotryAutoawayEvnts");

    $(document.body).unbind('mousemove.presencedInt');
    $(document.body).unbind('keypress.presencedInt');
};

/**
 * Helper function for toggling the "radio"-like feature of autoaway and persist modes
 *
 * @param val {Number} -1 for disabled auto away, but persist = on, 0-N for auto away on, persist off, true for
 * autoaway on with previously stored autoawaytimeout
 */
PresencedIntegration.prototype.togglePresenceOrAutoaway = function(val) {
    if (val === -1) {
        this.setPersistOn();
    }
    else if (val === true) {
        this.setAutoawayOn();
    }
    else {
        this.setAutoaway(val);
    }
};
