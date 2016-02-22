/**
 * Uses c2s pings to determinate if the current connection is broken or not
 *
 * Note: Why are we implementing this? Answer: https://code.google.com/p/chromium/issues/detail?id=76358
 *
 * @param megaChat
 * @returns {KarerePing}
 * @constructor
 */
var KarerePing = function(megaChat) {
    var self = this;
    self.logger = MegaLogger.getLogger("karerePing", {}, megaChat.logger);

    self.megaChat = megaChat;

    self._intervalId = false;
    self._currentPingRequest = false;

    megaChat.unbind("onInit.karerePing");
    megaChat.bind("onInit.karerePing", function(e) {
        // auto disable if the current connection is not to a websocket.
        if (megaChat.karere.connection.service.indexOf("wss://") !== 0) {
            return self;
        }

        megaChat.karere.rebind("onConnected.karerePing", function() {
            self.startTimer();
        });
        megaChat.karere.rebind(
            "onDisconnected.karerePing onConnectionClosed.karerePing onDisconnecting.karerePing",
            function() {
                self.stopTimer();
            }
        );
    });

    return self;
};

/**
 * Will start an interval/timer that will send a c2s pings ad trigger a connection retry if the ping response is not
 * received in a timely manner (see karere.options.karerePingInterval and karere.options.serverPingTimeout).
 *
 * Will be called when karere is connected.
 */
KarerePing.prototype.startTimer = function() {
    var self = this;


    if (self._intervalId) {
        self.stopTimer();
    }

    if (megaChat.karere.connection.service.indexOf("wss://") !== 0) {
        return;
    }

    self._intervalId = setInterval(function() {
        self._currentPingRequest = self.megaChat.karere.sendServerPing();
        self._currentPingRequest
            .fail(function() {
                self.megaChat.karere.connectionRetryManager.doConnectionRetry();
            })
            .always(function() {
                self._currentPingRequest = false;
            });
    }, self.megaChat.karere.options.karerePingInterval * 1.1);
};

/**
 * Stop the timer/interval (used when karere is disconnected)
 */
KarerePing.prototype.stopTimer = function() {
    var self = this;
    if (self._intervalId) {
        clearInterval(self._intervalId);
        self._intervalId = false;
        self._currentPingRequest = false;
    }
};

makeObservable(KarerePing);
