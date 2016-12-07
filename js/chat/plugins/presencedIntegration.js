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


PresencedIntegration.prototype.init = function() {
    var self = this;
    var megaChat = self.megaChat;

    var userPresence = new UserPresence(
        u_handle,
        !!RTC,
        function(overridedPresence, isWebrtcFlag) {
            self._presence[u_handle] = overridedPresence;
            self._is_webrtc[u_handle] = isWebrtcFlag === PresencedIntegration.FLAGS.IS_WEBRTC;

            console.error("overridecb", arguments);
        },
        function(user_hash, presence, isWebrtcFlag) {
            console.error('presecencb', user_hash, presence, isWebrtcFlag);

            isWebrtcFlag = isWebrtcFlag === PresencedIntegration.FLAGS.IS_WEBRTC;
            self._presence[user_hash] = presence;
            self._is_webrtc[user_hash] = isWebrtcFlag;

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
        var contactHashes = [];
        M.u.forEach(function(v, k) {
            if (k !== u_handle) {
                contactHashes.push(k);
            }
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
