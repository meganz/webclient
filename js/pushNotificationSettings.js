(function(scope) {
    "use strict";
    /*
    Sample ^!ps data structure:
    {
        "GLOBAL": {"dnd": 1533074773, "nsch": {"start": 510, "end": 1170, "tz": "Pacific/Auckland"}},
        "CHATHANDLE_X": {"an": 1},
        "CHATHANDLE_Y": {"dnd": 1533074773},
        "CHATHANDLE_Z": {"dnd": 0},
        "CHAT": {"dnd": 0},
        "PCR": {"dnd": 0},
        "INSHARE": {"dnd": 1533074773}
    };
     */

    /**
     * Initializes the main PushNotificationSettings "controller" that sync data between this interface and the actual
     * user attribute
     *
     * @returns {PushNotificationSettings}
     * @constructor
     */
    var PushNotificationSettings = function() {
        this.data = {};
        mBroadcaster.once('chat_initialized', this.init.bind(this));
        return this;
    };

    /**
     * Predefined groups, in human/developer readable format (enum)
     *
     * @type {{CHAT: string, GLOBAL: string, IN_SHARE: string, PENDING_CONTACT_REQUEST: string}}
     */
    PushNotificationSettings.GROUPS = {
        'GLOBAL': 'GLOBAL',
        'CHAT': 'CHAT',
        'IN_SHARE': 'INSHARE',
        'PENDING_CONTACT_REQUEST': 'PCR'
    };

    /**
     * Call this to reinit the local data structure w/ the data from `u_attr['^!ps']` and re-sync all chats
     */
    PushNotificationSettings.prototype.init = function() {
        tryCatch(function() {
            this.data = u_attr && u_attr['^!ps'] && JSON.parse(u_attr['^!ps']) || {};
        }.bind(this), function(ex) {
            console.error(ex);
        })();

        this.data = this.data || {};

        megaChat.rebind("onInit.pushNotSet", function() {
            this.syncChatsData();
        }.bind(this));
    };

    /**
     * Sync all chats's `.dnd` and `.alwaysNotify` settings
     */
    PushNotificationSettings.prototype.syncChatsData = function() {
        for (var roomId in megaChat.chats) {
            if (megaChat.chats.hasOwnProperty(roomId)) {
                var chatRoom = megaChat.chats[roomId];
                var chatData = this.data[chatRoom.chatId];
                if (chatData) {
                    if (chatData.an) {
                        chatRoom.alwaysNotify = true;
                    }
                    else {
                        chatRoom.alwaysNotify = null;
                    }

                    if (typeof chatData.dnd === 'undefined') {
                        chatRoom.dnd = null;
                    }
                    else {
                        chatRoom.dnd = chatData.dnd;
                    }
                }
                else if (chatRoom) {
                    // no settings found.
                    chatRoom.alwaysNotify = null;
                    chatRoom.dnd = null;
                }
            }
        }
    };


    /**
     * Returns the current `dnd` setting for `group`
     *
     * @param {String} group
     * @returns {*|null}
     */
    PushNotificationSettings.prototype.getDnd = function(group) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group), 'invalid group');
        }
        return this.data && this.data[group] && this.data[group].dnd;
    };

    /**
     * Set the `dnd` value for `group`
     *
     * @param {String} group
     * @param {Number} dnd
     */
    PushNotificationSettings.prototype.setDnd = function(group, dnd) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group), 'invalid group');
            assert(dnd >= 0, 'invalid value passed for dnd');
        }

        this.data[group] = this.data[group] || {};
        this.data[group].dnd = dnd;
        this.commit();
    };

    /**
     * Disable `dnd` for `group`
     * @param {String} group
     */
    PushNotificationSettings.prototype.disableDnd = function(group) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group), 'invalid group');
        }
        this.data[group] = this.data[group] || {};
        delete this.data[group].dnd;
        this.commit();
    };

    /**
     * Get "always notify" value for `group`
     * @param {String} group
     * @returns {*|boolean}
     */
    PushNotificationSettings.prototype.getAlwaysNotify = function(group) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group));
        }
        return this.data[group] && this.data[group].an === 1;
    };

    /**
     * Enable "always notify" for `group`
     *
     * @param {String} group
     */
    PushNotificationSettings.prototype.enableAlwaysNotify = function(group) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group), 'invalid group');
        }
        this.data[group] = this.data[group] || {};
        this.data[group].an = 1;
        this.commit();
    };

    /**
     * Disable "always notify" for `group`
     * @param {String} group
     */
    PushNotificationSettings.prototype.disableAlwaysNotify = function(group) {
        if (d) {
            assert(group in PushNotificationSettings.GROUPS || megaChat.getChatById(group), 'invalid group');
        }
        this.data[group] = this.data[group] || {};
        delete this.data[group].an;
        this.commit();
    };

    /**
     * Checks in global, chat global and per chat id specific dnd (and an) settings and returns true if allowed
     * to receive notifications or false if not allowed
     *
     * @param {String} chatId
     * @returns {boolean}
     */
    PushNotificationSettings.prototype.isAllowedForChatId = function(chatId) {
        if (this.getAlwaysNotify(chatId)) {
            return true;
        }
        var globalDND = this.getDnd(PushNotificationSettings.GROUPS.GLOBAL);
        if (globalDND === 0 || globalDND > unixtime()) {
            return false;
        }

        var chatGlobalDND = this.getDnd(PushNotificationSettings.GROUPS.CHAT);
        if (chatGlobalDND === 0 || chatGlobalDND > unixtime()) {
            return false;
        }

        var chatDND = this.getDnd(chatId);
        if (chatDND === 0 || chatDND > unixtime()) {
            return false;
        }

        return true;
    };
    /**
     * Commit the internally stored `data` to the server/mega.attr.set
     * Note: Throttled at 350ms
     *
     * @type {Function}
     */
    PushNotificationSettings.prototype.commit = SoonFc(function() {
        for (var k in this.data) {
            // cleanup outdated `dnd`s
            if (this.data[k] && this.data[k].dnd && this.data[k].dnd < unixtime()) {
                delete this.data[k].dnd;
            }
            if (Object.keys(this.data[k]).length === 0) {
                delete this.data[k];
            }
        }
        mega.attr.set("ps", JSON.stringify(this.data), -2, true);
        this.syncChatsData();
    }, 350);

    // TODO: nsch

    scope.pushNotificationSettings = new PushNotificationSettings();
    scope.PushNotificationSettings = PushNotificationSettings;
})(window);
