/**
 * This file contains utility that helps on testing functionality that uses the mBroadcaster and watchdog.
 */



// copy the mBroadcaster once, so that we can reuse it later for crafting multiple, separated
// broadcasters for unit tests
var MASTER_BROADCASTER = clone(mBroadcaster);
MASTER_BROADCASTER._topics = {};

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

    this.waitingQueries = {};

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
    this.broadcaster.addListener("watchdog:Q!Rep!y", function(args) {
        self.logger.debug("Got reply: ", args.data.query, args.data.token, args.data.value);

        if (self.queryQueue[args.data.token]) {
            self.queryQueue[args.data.token].push(args.data.value);
        }

        if (self.replyCache[args.data.query]) {
            self.replyCache[args.data.query].push(args.data.value);
        }

        // if there is a promise in .waitingQueries, that means that this query is expecting only 1 response
        // so we can resolve it immediately.
        if (self.waitingQueries[args.data.token]) {

            clearTimeout(self.waitingQueries[args.data.token].timer);
            self.waitingQueries[args.data.token]
                .always(function() {
                    // cleanup after all other done/always/fail handlers...
                    delete self.waitingQueries[args.data.token];
                    delete self.queryQueue[args.data.token];
                })
                .resolve([args.data.value]);

        }
    });
};

FakeBroadcasterWatchdog.prototype.destroy = function() {
    var self = this;

    self.queryQueue = self.replyCache = {};
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
FakeBroadcasterWatchdog.prototype.query = function(what, timeout, cache, data, expectsSingleAnswer) {
    var self = this;
    var token = Math.random().toString(36);
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

        setTimeout(function() {
            self.notify('Q!' + what, tmpData);
        });


        if (!expectsSingleAnswer) {
            // wait for reply and fullfil/reject the promise
            setTimeout(function () {
                if (self.queryQueue[token].length) {
                    promise.resolve(self.queryQueue[token]);
                }
                else {
                    promise.reject(EACCESS);
                }
                delete self.queryQueue[token];
            }, timeout || 200);
        }
        else {
            promise.timer = setTimeout(function () {
                if (promise.state() === 'pending') {
                    promise.reject(EACCESS);
                    delete self.queryQueue[token];
                    delete self.waitingQueries[token];
                }
            }, timeout || 200);

            self.waitingQueries[token] = promise;
        }
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
        self.broadcaster.sendMessage("watchdog:" + operation, data);
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
    if (typeof newMasterId.crossTab !== 'undefined') {
        // found a mBroadcaster as first argument, convert to string ID
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

        this.notify(tmp.crossTab.eTag + 'leaving', JSON.stringify({
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
var CreateNewFakeBroadcaster = function(id) {
    var broadcaster = clone(MASTER_BROADCASTER);
    broadcaster.id = id;
    broadcaster.watchdog = new FakeBroadcasterWatchdog(broadcaster);
    broadcaster.crossTab.master = null;
    broadcaster.crossTab.slaves = [];
    broadcaster.destroy = function() {
        this._topics = [];
        this.watchdog.destroy();
        this.connector.removeTab(this);
    };

    return broadcaster;
};
