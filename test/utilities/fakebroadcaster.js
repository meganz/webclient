/**
 * This file contains utility that helps on testing functionality that uses the mBroadcaster and watchdog.
 */



/**
 * Fake watchdog
 *
 * @param broadcaster
 * @constructor
 */
var FakeBroadcasterWatchdog = function(broadcaster) {
    this.broadcaster = broadcaster;

    this.id = this.wdID = broadcaster.id;

    this.eTag = '$WDE$!_';

    // Hols promises waiting for a query reply
    this.queryQueue = {};
    // Holds query replies if cached
    this.replyCache = {};

    this.eventHandlers = {};

    var loggerOpts = {};
    if (localStorage.fakeBroadcasterWatchdogDebug) {
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
            console.error.apply(console, args);
        };
    }
    else {
        loggerOpts['isEnabled'] = true;
        loggerOpts['minLogLevel'] = function () {
            return MegaLogger.LEVELS.ERROR;
        };
    }

    this.logger = new MegaLogger("FakeBroadcasterWatchdog[" + this.id + "]", loggerOpts);

    var self = this;
    this.addEventHandler("Q!Rep!y", function(args, watchdog) {
        self.logger.debug("Got reply: ", args.data.query, args.data.token, args.data.value);

        if (watchdog.queryQueue[args.data.token]) {
            watchdog.queryQueue[args.data.token].push(args.data.value);
        }

        if (watchdog.replyCache[args.data.query]) {
            watchdog.replyCache[args.data.query].push(args.data.value);
        }
    });
};

FakeBroadcasterWatchdog.prototype.destroy = function() {
    var self = this;

    self.queryQueue = self.replyCache = self.eventHandlers = {};
};

/**
 * A clone of watchdog.notify, but would pass the data to the FakeBroadcasterConnector, instead of localStorage.
 *
 * @param msg
 * @param data
 */
FakeBroadcasterWatchdog.prototype.notify = function(msg, data) {
    data = { origin: this.id, data: data, sid: Math.random()};

    assert(this.broadcaster.connector, 'Broadcaster is not connected to tab connector.');

    this.logger.debug("SEND notify: ", msg, data);

    this.broadcaster.connector.notify(this.eTag + msg, JSON.stringify(data));
};

/**
 * Almost 99% the same as watchdog.query
 *
 * @param what
 * @param timeout
 * @param cache
 * @returns {MegaPromise}
 */
FakeBroadcasterWatchdog.prototype.query = function(what, timeout, cache, data) {
    var self = this;
    var token = mRandomToken();
    var promise = new MegaPromise();

    self.logger.debug("SEND query: ", what, data, token, timeout, cache);

    if (this.replyCache[what]) {
        self.logger.debug("not-SEND query, found in cache: ", what, this.replyCache[what], timeout, cache);
        // a prior query was launched with the cache flag
        cache = this.replyCache[what];
        delete this.replyCache[what];
        return MegaPromise.resolve(cache);
    }

    // if not master
    if (!this.broadcaster.crossTab.master || Object(this.broadcaster.crossTab.slaves).length) {

        if (cache) {
            this.replyCache[what] = [];
        }
        this.queryQueue[token] = [];

        var tmpData;
        if (!data) {
            tmpData = {};
        }
        else {
            tmpData = clone(data);
        }
        tmpData['reply'] = token;

        // Soon does not work in PhantomJS, which causes tests using this function to fail.
        var delayedFnCall = /PhantomJS/.test(window.navigator.userAgent) ? setTimeout : Soon;

        delayedFnCall(function() {
            self.notify('Q!' + what, tmpData);
        });


        // wait for reply and fullfil/reject the promise
        setTimeout(function() {
            if (self.queryQueue[token].length) {
                self.logger.debug("RECEIVED response on query: ", what, token, self.queryQueue[token], timeout, cache);
                promise.resolve(self.queryQueue[token]);
            }
            else {
                self.logger.debug("NO response on query: ", what, token, timeout, cache, self.queryQueue);
                promise.reject(EACCESS);
            }
            delete self.queryQueue[token];
        }, timeout || 200);
    }
    else {
        // reject if master
        self.logger.debug(
            "REJECT SEND query, I'm flagged as master: ",
            what,
            self.queryQueue[token],
            timeout,
            cache
        );
        promise = MegaPromise.reject(EEXIST);
    }

    return promise;
};

/**
 * Get all currently registered eventHandlers
 *
 * @return {Object}
 */
FakeBroadcasterWatchdog.prototype.getEventHandlers = function () {
    return this.eventHandlers;
};

/**
 * Add new eventHandler.
 *
 * @param id {String} Index/unique ID of the eventHandler
 * @param val {Object} The actual eventHandler
 * @return {Object} the newly added eventHandler
 */
FakeBroadcasterWatchdog.prototype.addEventHandler = function (id, val) {
    this.eventHandlers[id] = val;

    return this.eventHandlers[id];
};

/**
 * Remove a eventHandler.
 *
 * @param idx {String} The Index/unique ID of the eventHandler to remove
 */
FakeBroadcasterWatchdog.prototype.removeEventHandler = function (idx) {
    if (this.hasEventHandler(idx)) {
        var tmp = this.eventHandlers[idx];
        delete this.eventHandlers[idx];
    }
};

/**
 * Triggers a fn calls on all event handlers (incl. those with namespaces).
 *
 * @param eventName {String}
 * @param args {Array}
 * @returns {boolean} returns true if at least 1 event handler was called
 */
FakeBroadcasterWatchdog.prototype.triggerEventHandlersByName = function(eventName, args) {
    var self = this;

    var processed = false;

    self.getEventHandlersByName(eventName).forEach(function(cb) {
        processed = true;
        cb.apply(self, args);
    });

    return processed;
};


/**
 * Returns ALL functions/callbacks for a specific event name (have support for .namespaces).
 *
 * @param eventName {String} name of the event (can have support for ".namespace", in which case, multiple
 * event callbacks can be returned)
 *
 * @returns {Array}
 */
FakeBroadcasterWatchdog.prototype.getEventHandlersByName = function(eventName) {
    var self = this;
    var found = [];
    Object.keys(this.eventHandlers).forEach(function(name) {
        var isNs = name.indexOf(".") !== -1;
        if (isNs && name.indexOf(eventName + ".") === 0) {
            found.push(self.eventHandlers[name]);
        }
        else if(!isNs && name === eventName) {
            found.push(self.eventHandlers[name]);
        }
    });

    return found;
};

/**
 * Check if eventHandler with id `idx` exists
 *
 * @param idx {String} Index/unique ID of the eventHandler
 * @return {boolean}
 */
FakeBroadcasterWatchdog.prototype.hasEventHandler = function (idx) {
    return !!this.eventHandlers[idx];
};

/**
 * Handle incoming events (also passes the unknown events to event handlers if such is found)
 *
 * @param k {String} eTag + operation
 * @param v {String} JSON
 */
FakeBroadcasterWatchdog.prototype.handleEvent = function(k, v) {
    var data = JSON.parse(v);

    var self = this;

    var processed = false;
    if (data.origin === self.id) {
        self.logger.debug("Ignoring own event:", k, v);
        processed = true;
    }
    else {
        var operation = k.substring(self.eTag.length);

        if (self.getEventHandlersByName(operation).length > 0) {
            processed = self.triggerEventHandlersByName(operation, [
                data,
                self
            ]);
        }
        else {
            if (operation.length === 0) {
                processed = this.triggerEventHandlersByName(k, [
                    data,
                    self
                ]);
            }
        }
    }
    if (!processed) {
        self.logger.debug("Unknown event: ", k, v);
    }
};


/**
 * The Connector that connects ALL broadcasters and proxies events between them, by simulating multi tab
 * environment
 *
 * @constructor
 */
var FakeBroadcastersConnector = function() {
    this.tabs = {};
    this.master = false;
};

/**
 * Changes the current master
 *
 * @param newMasterId {String} the new master ID
 */
FakeBroadcastersConnector.prototype.setMaster = function(newMasterId) {
    if (newMasterId instanceof FakeBroadcaster) {
        newMasterId = newMasterId.id;
    }

    assert(this.tabs[newMasterId], 'masterId passed to .setMaster is invalid (no such tab found)');

    this.master = newMasterId;

    this._updateMasterReferences();
};

/**
 * Get all currently registered tabs
 *
 * @return {Object}
 */
FakeBroadcastersConnector.prototype.getTabs = function () {
    return this.tabs;
};


/**
 * Update and maintain .crossTab.master and .crossTab.slaves[] on all managed tabs/broadcasters
 *
 * @private
 */
FakeBroadcastersConnector.prototype._updateMasterReferences = function() {
    var self = this;

    var slaves = [];
    Object.keys(self.tabs).forEach(function(id) {
        if (id !== self.master) {
            slaves.push(id);
        }
    });

    var masterBroadcaster = null;
    Object.keys(self.tabs).forEach(function(id) {
        var broadcaster = self.tabs[id];
        if (id === self.master) {
            broadcaster.crossTab.slaves = slaves;
            broadcaster.crossTab.master = id;
            masterBroadcaster = broadcaster;
        }
        else {
            broadcaster.crossTab.slaves = [];
            broadcaster.crossTab.master = undefined;
        }
    });


    if (self.master) {
        assert(masterBroadcaster, 'did not found any broadcaster to set as master, expected:' + self.master);
        masterBroadcaster.sendMessage('crossTab:master', self.master);
    }
};

/**
 * Add new tab.
 *
 * @param fakeBroadcasterInstance {FakeBroadcaster} The actual tab/FakeBroadcaster instance
 * @return {Object} the newly added tab
 */
FakeBroadcastersConnector.prototype.addTab = function (fakeBroadcasterInstance) {
    var self = this;

    self.tabs[fakeBroadcasterInstance.id] = fakeBroadcasterInstance;

    fakeBroadcasterInstance.connector = self;


    self._updateMasterReferences();

    return self.tabs[fakeBroadcasterInstance.id];
};

/**
 * Remove a tab.
 *
 * @param idx {String} The Index/unique ID of the tab to remove
 */
FakeBroadcastersConnector.prototype.removeTab = function (idx) {
    if (idx.id) {
        idx = idx.id;
    }

    if (this.hasTab(idx)) {
        var wasMaster = false;
        var newMaster;

        var tmp = this.tabs[idx];
        delete this.tabs[idx];
        if (this.master === idx) {
            wasMaster = true;
            // that tab was a master change the master now!
            var tabIds = Object.keys(this.tabs);
            if (tabIds.length > 0) {
                this.setMaster(tabIds[0]);
                newMaster = tabIds[0];
            }
        }
        this.notify('leaving', JSON.stringify({
            data: {
                wasMaster: wasMaster || -1,
                newMaster: newMaster
            }
        }));
        tmp.sendMessage('crossTab:leave', wasMaster);
    }
};

/**
 * Notify
 *
 * @param idx {String} The Index/unique ID of the tab to remove
 */
FakeBroadcastersConnector.prototype.notify = function (etag, val) {
    var self = this;
    Object.keys(this.tabs).forEach(function(k) {
        self.tabs[k].watchdog.handleEvent(etag, val);
    });
};

/**
 * Check if tab with id `idx` exists
 *
 * @param idx {String} Index/unique ID of the tab
 * @return {boolean}
 */
FakeBroadcastersConnector.prototype.hasTab = function (idx) {
    return !!this.tabs[idx];
};


/**
 * Fake, simulated mBroadcast object.
 *
 * @param id {String}
 * @constructor
 */
var FakeBroadcaster = function(id) {
    this.id = id;
    this.crossTab = {
        eTag: '$CTE$!_',
        master: null,
        slaves: [],
        ctID: id,
        notify: function crossTab_notify(msg, data) {

        }
    };
    this._topics = [];
    this.watchdog = new FakeBroadcasterWatchdog(this);
    this.connector = null;
};

FakeBroadcaster.prototype.once = mBroadcaster.once;
FakeBroadcaster.prototype.addListener = mBroadcaster.addListener;
FakeBroadcaster.prototype.removeListener = mBroadcaster.removeListener;
FakeBroadcaster.prototype.sendMessage = mBroadcaster.sendMessage;

/**
 *  Unit test purposes only
 */
FakeBroadcaster.prototype.destroy = function() {
    this._topics = [];
    this.watchdog.destroy();
    this.connector.removeTab(this);
};
