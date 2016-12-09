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

PresencedIntegration.cssClassToPresence = function(cssClass) {
    if (cssClass === 'online') {
        return UserPresence.PRESENCE.ONLINE;
    }
    else if (cssClass === 'away') {
        return UserPresence.PRESENCE.AWAY;
    }
    else if (cssClass === 'busy') {
        return UserPresence.PRESENCE.DND;
    }
    else if (cssClass === 'offline') {
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

            console.error("overridecb", status, isWebrtcFlag);
        },
        function presencedIntegration_peerstatuscb(user_hash, presence, isWebrtcFlag) {
            console.error('presecencb', user_hash, presence, isWebrtcFlag);

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
        }
    );



    megaChat.userPresence = self.userPresence = userPresence;

    $(userPresence).rebind('onConnected.presencedIntegration', function(e) {
        // set my own presence

        var contactHashes = [];
        M.u.forEach(function(v, k) {
            if (k !== u_handle) {
                contactHashes.push(k);
            }

            console.error(k, 'default pres');
            v.presence = 'unavailable';
        });

        userPresence.addremovepeers(contactHashes);
    });

    $(userPresence).rebind('onDisconnected.presencedIntegration', function(e) {
        // TODO: change my presence to false and clear local presence cache for other users
    });

    if (!localStorage.userPresenceIsOffline) {
        userPresence.connectionRetryManager.requiresConnection();
    }
};


PresencedIntegration.prototype.setPresence = function(presence) {
    var self = this;
    if (presence === UserPresence.PRESENCE.ONLINE) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(true);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(false);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.AWAY) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setonline(false);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.DND) {
        localStorage.removeItem("userPresenceIsOffline");
        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.setdnd(true);
                self.userPresence.setoverride(presence, !!RTC);
            });
    }
    else if (presence === UserPresence.PRESENCE.OFFLINE) {
        localStorage.userPresenceIsOffline = 1;
        localStorage.removeItem("megaChatPresence"); // legacy

        self.userPresence.connectionRetryManager.requiresConnection()
            .done(function() {
                self.userPresence.disconnect(true);
            });
    }
};

PresencedIntegration.prototype.getPresence = function(u_h) {
    if (!u_h) {
        u_h = u_handle;
    }
    return this._presence[u_h];
};

