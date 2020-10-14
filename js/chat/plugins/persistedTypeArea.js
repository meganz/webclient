(function(scope) {
    'use strict'; // jscs:disable validateIndentation

/**
 * Uses c2s pings to determinate if the current connection is broken or not
 *
 * Note: Why are we implementing this? Answer: https://code.google.com/p/chromium/issues/detail?id=76358
 *
 * @param megaChat
 * @returns {PersistedTypeArea}
 * @constructor
 */
var PersistedTypeArea = function (megaChat) {
    var self = this;
    self.logger = MegaLogger.getLogger("persistedTypeArea", {}, megaChat.logger);

    self.megaChat = megaChat;


    megaChat.rebind("onInit.persistedTypeArea", function() {
        self.data = new SharedLocalKVStorage("pta2");
    });

    // clear on logout
    megaChat.rebind("onDestroy.persistedTypeArea", function() {
        self.data.destroy(true);
    });


    self._throttledUpdate = function (key, cb) {
        delay('ptaupdate:' + key, cb, 250);
    };
    return self;
};
makeObservable(PersistedTypeArea);

PersistedTypeArea.prototype.updatePersistedTypedValue = function (chatRoom, value) {
    var self = this;
    var k = chatRoom.roomId;
    self._throttledUpdate(k, function () {
        self.data.setItem(chatRoom.roomId, value);
    });
};

PersistedTypeArea.prototype.getPersistedTypedValue = function (chatRoom) {
    return this.data.getItem(chatRoom.roomId);
};

PersistedTypeArea.prototype.removePersistedTypedValue = function (chatRoom) {
    var self = this;
    var k = chatRoom.roomId;
    self._throttledUpdate(k, function () {
        self.data.removeItem(k);
    });
};

scope.PersistedTypeArea = PersistedTypeArea;
})(window);
