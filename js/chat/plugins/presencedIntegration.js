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
    self.logger = MegaLogger.getLogger("presencedIntegration", {}, megaChat.logger);

    self.megaChat = megaChat;

    self._is_mobile = {};
    self._is_webrtc = {};
    self._presence = {};

    megaChat.unbind("onInit.karerePing");
    megaChat.bind("onInit.karerePing", function(e) {
        // auto disable if the current connection is not to a websocket.
        self.init();
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

        },
        function presencedIntegration_overridecb(presence, isWebrtcFlag) {
            self._presence[u_handle] = presence;
            self._is_webrtc[u_handle] = isWebrtcFlag === PresencedIntegration.FLAGS.IS_WEBRTC;

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
            if (status === 'offline' && xmppPresence) {
                megaChat.karere.disconnect();
            }
            else if (status === 'away' && xmppPresence !== 'away') {
                megaChat.karere.setPresence(Karere.PRESENCE.AWAY);
            }
            else if (status === 'dnd' && xmppPresence !== 'dnd') {
                megaChat.karere.setPresence(Karere.PRESENCE.BUSY);
            }
            else if (status === 'available' && xmppPresence !== 'available') {
                megaChat.karere.setPresence(Karere.PRESENCE.ONLINE);
            }

        },
        self._peerstatuscb.bind(self)
    );



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

    if (!localStorage.userPresenceIsOffline) {
        userPresence.connectionRetryManager.requiresConnection();
    }
};

PresencedIntegration.prototype._peerstatuscb = function(user_hash, presence, isWebrtcFlag) {
    var self = this;

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

        M.onlineStatusEvent(contact, status);
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
    if (presence === UserPresence.PRESENCE.ONLINE) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(true);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(false);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(false);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = false;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setdnd(true);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.OFFLINE) {
        localStorage.userPresenceIsOffline = 1;
        localStorage.removeItem("megaChatPresence"); // legacy
        self.userPresence.canceled = true;

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.disconnect(true);
            });
    }
};

PresencedIntegration.prototype.addContact = function(u_h) {
    if (
        this.userPresence.connectionRetryManager.getConnectionState()
            ===
        ConnectionRetryManager.CONNECTION_STATE.CONNECTED
    ) {
        this.userPresence.addremovepeers([u_h]);
    }
};

PresencedIntegration.prototype.removeContact = function(u_h) {
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
    return this._presence[u_h];
};

