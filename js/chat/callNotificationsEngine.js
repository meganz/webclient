/**
 * Transient, queue-able, aggregateable, validation supported notifications as per our new UX for Calls.
 *
 * @param chatRoom {ChatRoom} the chat room related ot this call.
 * @constructor
 */
var CallNotificationsEngine = function(chatRoom, callManagerCall) {
    "use strict";
    this.chatRoom = chatRoom;
    this.callManagerCall = callManagerCall;
    this.notifications = [];

    var loggerOpts = {};
    if (localStorage.callNotificationsEngineDebug) {
        loggerOpts['isEnabled'] = true;
        loggerOpts['minLogLevel'] = function () {
            return MegaLogger.LEVELS.DEBUG;
        };
        loggerOpts['transport'] = function (level, args) {
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
        loggerOpts['isEnabled'] = true;
        loggerOpts['minLogLevel'] = function () {
            return MegaLogger.LEVELS.WARN;
        };
    }

    this.logger = new MegaLogger("CallNotificationsEngine", loggerOpts);

    this.idx = CallNotificationsEngine._IDX++;

    this.current = false;

    var self = this;
    self._isOffline = false;
    $(window).rebind("online.callNotificationsEngine" + this.idx, function() {
        self._isOffline = false;
        if (self.current && self.current.action === CallNotificationsEngine.ACTIONS.OFFLINE) {
            self.trigger('onChange');
        }
        else {
            self.notify(CallNotificationsEngine.ACTIONS.ONLINE);
        }
    });
    $(window).rebind("offline.callNotificationsEngine" + this.idx, function() {
        self._isOffline = true;
        if (self.current && self.current.action === CallNotificationsEngine.ACTIONS.OFFLINE) {
            self.trigger('onChange');
        }
        else {
            self.notify(CallNotificationsEngine.ACTIONS.OFFLINE);
        }
    });

    chatRoom.rebind('onClientJoinedCall.cne' + self.idx, function(e, eventData) {
        self.notify(CallNotificationsEngine.ACTIONS.JOIN, [eventData.userId]);
    });
    chatRoom.rebind('onClientLeftCall.cne' + self.idx, function(e, eventData) {
        if (eventData.userId) {
            self.notify(CallNotificationsEngine.ACTIONS.LEFT, [eventData.userId]);
        }
    });

    chatRoom.rebind('onCallSessReconnecting.cne' + self.idx, function() {
        self.notify(CallNotificationsEngine.ACTIONS.SESS_RECONNECTING);
        chatRoom.callReconnecting = true;
        chatRoom.trackDataChange();
    });

    chatRoom.rebind('onCallSessReconnected.cne' + self.idx, function() {
        self.notify(CallNotificationsEngine.ACTIONS.SESS_RECONNECTED);
        delete chatRoom.callReconnecting;
        chatRoom.trackDataChange();
    });

};
makeObservable(CallNotificationsEngine);


/**
 * Used for creating simple, per running instance, unique ID of the callNotificationsEngine
 *
 * @type {Number}
 * @private
 */
CallNotificationsEngine._IDX = 0;

/**
 * Expire the currently shown notif in Xs.
 *
 * @type {Number}
 */
CallNotificationsEngine.EXPIRE = 5;

/**
 * All supported ACTIONS. Please use with .notify(action, ...)
 *
 * @type {Object}
 */
CallNotificationsEngine.ACTIONS = {
    'JOIN' : 1,
    'LEFT' : 2,
    'SLOW_CONNECTION' : 3,
    'OFFLINE' : 4,
    'ONLINE' : 5,
    'SESS_RECONNECTING' : 6,
    'SESS_RECONNECTED' : 7,
};

CallNotificationsEngine.ACTIONS_INT = {};
Object.keys(CallNotificationsEngine.ACTIONS).forEach(function(kStr) {
    "use strict";
    CallNotificationsEngine.ACTIONS_INT[CallNotificationsEngine.ACTIONS[kStr]] = kStr;
});


/**
 * Helper for defining features (and UI-meta) for all supported actions.
 *
 * @param className {String}
 * @param singularTitle {String}
 * @param pluralTitle {String}
 * @param clearPrevious {Boolean}
 * @param aggregateable  {Boolean}
 * @param validatorFn {undefined|Function}
 * @constructor
 */
CallNotificationsEngine.ActionMeta = function (
    className, singularTitle, pluralTitle, clearPrevious, aggregateable, validatorFn
) {
    "use strict";
    this.className = className;
    this.singularTitle = singularTitle;
    this.pluralTitle = pluralTitle;
    this.clearPrevious = clearPrevious || false;
    this.aggregateable = aggregateable || false;
    this.validatorFn = validatorFn || false;
};

CallNotificationsEngine.ACTIONS_META = {
    'JOIN': new CallNotificationsEngine.ActionMeta(
        'green',
        "%NAME joined the call",
        "%NAMES and %NAME_LAST joined the call",
        false,
        true
    ),
    'LEFT': new CallNotificationsEngine.ActionMeta(
        'green',
        "%NAME left the call",
        "%NAMES and %NAME_LAST left the call",
        false,
        true
    ),
    'SLOW_CONNECTION': new CallNotificationsEngine.ActionMeta(
        'green',
        l[23213],
        undefined,
        false,
        false
    ),
    'OFFLINE': new CallNotificationsEngine.ActionMeta(
        'green',
        l[5926],
        undefined,
        true,
        false,
        function(callNotifsEngine) {
            "use strict";
            return !callNotifsEngine._isOffline;
        }
    ),
    'ONLINE': new CallNotificationsEngine.ActionMeta(
        'green',
        l[5923],
        undefined,
        true,
        false,
        function(callNotifsEngine) {
            "use strict";
            return !callNotifsEngine._isOffline;
        }
    ),
    'SESS_RECONNECTING': new CallNotificationsEngine.ActionMeta(
        'green',
        'Call session - reconnecting',
        undefined,
        true,
        false,
        false
    ),
    'SESS_RECONNECTED': new CallNotificationsEngine.ActionMeta(
        'green',
        'Call session - reconnected',
        undefined,
        true,
        false,
        false
    ),
};

/**
 * Helper to return the integer -> string value of the ACTIONS enum.
 *
 * @param someIntVal
 * @returns {String|undefined}
 */
CallNotificationsEngine.actionIntToEnumStr = function(someIntVal) {
    "use strict";
    return CallNotificationsEngine.ACTIONS_INT[someIntVal];
};

/**
 * Basic internal representation for a notification. Don't use directly, use .notify.
 *
 * @param action {int} One of the enums from CallNotificationsEngine.ACTIONS
 * @param [actors] {Array} array of strings of user ids, if needed
 * @param parent {Object} Notification's initiator (e.g. CallNotificationsEngine instance)
 * @constructor
 */
CallNotificationsEngine.Notification = function(action, actors, parent) {
    "use strict";
    this.action = action;
    this.actors = actors || false;
    this.parent = parent;
    this.expiresIn = false;
    var strType = CallNotificationsEngine.actionIntToEnumStr(this.action);
    var meta = CallNotificationsEngine.ACTIONS_META[strType];
    if (!meta) {
        if (d) {
            console.error("Can't find meta for " + strType);
        }
    }
    else {
        this.meta = meta;
    }
};

/**
 * Returns validatorFn's result (if such exists, otherwise false)
 * @returns {Boolean}
 */
CallNotificationsEngine.Notification.prototype.isStillActive = function() {
    "use strict";
    var meta = this.meta;
    if (!meta) {
        if (d) {
            console.error("Can't find meta for ", this);
        }
        return;
    }
    return meta.validatorFn && meta.validatorFn(this.parent, this.action, this.actors);
};

CallNotificationsEngine.Notification.prototype.getTitle = function() {
    "use strict";
    var meta = this.meta;
    if (!meta) {
        if (d) {
            console.error("Can't find meta for ", this);
        }
        return;
    }

    if (this.actors && this.actors.length > 1) {
        var names = [];
        this.actors.forEach(function(userId) {
            names.push(M.u[base64urlencode(userId)].name || M.u[base64urlencode(userId)].m);
        });
        var last = names.pop();
        return meta.pluralTitle
            .replace("%NAMES", names.join(", "))
            .replace("%NAME_LAST", last);
    }
    else if (this.actors && this.actors.length === 1) {
        return meta.singularTitle.replace(
            "%NAME", M.u[base64urlencode(this.actors[0])].name || M.u[base64urlencode(this.actors[0])].m
        );
    }
    else {
        return meta.singularTitle;
    }
};

/**
 * Returns the defined meta's class name for this type of notif.
 */
CallNotificationsEngine.Notification.prototype.getClassName = function() {
    "use strict";
    var meta = this.meta;
    if (!meta) {
        if (d) {
            console.error("Can't find meta for ", this);
        }
        return;
    }
    return meta.className;
};

/**
 * Use this to add/queue notifications.
 *
 * @param action {int} One of the enums from CallNotificationsEngine.ACTIONS
 * @param [actors] {Array} array of strings of user ids, if needed
 * @constructor
 */
CallNotificationsEngine.prototype.notify = function(action, actors) {
    "use strict";
    var self = this;
    var strType = CallNotificationsEngine.actionIntToEnumStr(action);
    var meta = CallNotificationsEngine.ACTIONS_META[strType];

    if (!meta) {
        self.logger.error("Can't find meta for " + strType);
        return;
    }


    var skipAdd = false;
    if (meta.aggregateable) {
        var last = this.notifications[this.notifications.length - 1];
        if (last && last.action === action) {
            // same, aggregate
            last.actors = (last.actors || []).concat(actors);
            array.unique(last.actors);
            skipAdd = true;
        }
    }
    // have validatorFn? if yes, and it returned false, skip this.
    if (meta.validatorFn && !meta.validatorFn(self, action, actors)) {
        skipAdd = true;
    }

    if (!skipAdd) {
        var notif = new CallNotificationsEngine.Notification(action, actors, this);

        this.notifications.push(notif);


        if (meta.clearPrevious) {
            delete this.current; // immediately remove the current item!
            this.notifications = this.notifications.splice(-1);
        }
    }
    else if (meta.clearPrevious) {
        this.notifications = [];
    }
    if (this.notifications.length > 0) {
        this.trigger('onChange');
    }

};

/**
 * External interface method for use with the React/chat's UI for re-pulling the current notification
 * for generating the UI from.
 *
 * @returns {CallNotificationsEngine.Notification|undefined}
 */
CallNotificationsEngine.prototype.getCurrentNotification = function() {
    "use strict";
    // check if the currently shown notification had expired, if yes, delete it and the next code
    // should prefill the next one if such exist
    if (this.current && this.current.expiresIn && this.current.expiresIn < unixtime()) {
        delete this.current;
    }

    // current is empty, pull the first from the (LIFO) list
    if (!this.current && this.notifications.length > 0) {
        this.current = this.notifications.shift();
        if (!this.current.meta.validatorFn) {
            this.current.expiresIn = unixtime() + CallNotificationsEngine.EXPIRE;
        }

        var self = this;
        if (this.currentExpireTimer) {
            clearTimeout(this.currentExpireTimer);
        }

        if (this.current.expiresIn) {
            this.currentExpireTimer = setTimeout(function () {
                self.trigger('onChange');
            }, ((this.current.expiresIn - unixtime()) * 1000) + 1000);
        }
    }

    return this.current;
};

/**
 * Method that collects needed cleanup fn calls and operations.
 */
CallNotificationsEngine.prototype.destroy = function() {
    "use strict";
    var self = this;
    var chatRoom = self.chatRoom;

    $(window).unbind("offline.callNotificationsEngine" + self.idx);
    $(window).unbind("online.callNotificationsEngine" + self.idx);

    chatRoom.unbind('onClientJoinedCall.cne' + self.idx);
    chatRoom.unbind('onClientLeftCall.cne' + self.idx);
};
