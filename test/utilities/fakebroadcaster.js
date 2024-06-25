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

    this.id = this.origin = broadcaster.id;

    this.eTag = '$WDE$!_';

    // Hols promises waiting for a query reply
    this.queryQueue = {};
    // Holds query replies if cached
    this.replyCache = {};

    this.waitingQueries = {};

    var loggerOpts = {};

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

    // if not owner
    if (!this.broadcaster.crossTab.owner || Object(this.broadcaster.crossTab.actors).length) {

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
        // reject if owner
        self.logger.debug(
            "REJECT SEND query, I'm flagged as owner: ",
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
    this.owner = false;
};

/**
 * Changes the current owner
 *
 * @param newOwnerId {String} the new owner ID
 */
FakeBroadcastersConnector.prototype.takeOwnership = function(newOwnerId) {
    if (typeof newOwnerId.crossTab !== 'undefined') {
        // found a mBroadcaster as first argument, convert to string ID
        newOwnerId = newOwnerId.id;
    }

    assert(this.tabs[newOwnerId], 'ownerId passed to .takeOwnership is invalid (no such tab found)');

    this.owner = newOwnerId;

    this._updateOwnerReferences();
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
 * Update and maintain .crossTab.owner and .crossTab.actors[] on all managed tabs/broadcasters
 *
 * @private
 */
FakeBroadcastersConnector.prototype._updateOwnerReferences = function() {
    var self = this;

    var actors = [];
    Object.keys(self.tabs).forEach(function(id) {
        if (id !== self.owner) {
            actors.push(id);
        }
    });

    var ownerBroadcaster = null;
    Object.keys(self.tabs).forEach(function(id) {
        var broadcaster = self.tabs[id];
        if (id === self.owner) {
            broadcaster.crossTab.actors = actors;
            broadcaster.crossTab.owner = id;
            ownerBroadcaster = broadcaster;
        }
        else {
            broadcaster.crossTab.actors = [];
            broadcaster.crossTab.owner = undefined;
        }
    });


    if (self.owner) {
        assert(ownerBroadcaster, 'did not found any broadcaster to set as owner, expected:' + self.owner);
        ownerBroadcaster.sendMessage('crossTab:owner', self.owner);
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


    self._updateOwnerReferences();

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
        var owner = false;
        var election;

        var tmp = this.tabs[idx];
        delete this.tabs[idx];
        if (this.owner === idx) {
            owner = idx;
            // that tab was a owner change the owner now!
            var tabIds = Object.keys(this.tabs);
            if (tabIds.length > 0) {
                this.takeOwnership(tabIds[0]);
                election = tabIds[0];
            }
        }

        this.notify(tmp.crossTab.eTag + 'leaving', JSON.stringify({
            data: {
                owner,
                election
            }
        }));

        tmp.sendMessage('crossTab:leave', owner);
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
    var broadcaster = mBroadcaster.create(id);
    broadcaster.id = id;
    broadcaster.watchdog = new FakeBroadcasterWatchdog(broadcaster);
    broadcaster.crossTab.owner = null;
    broadcaster.crossTab.actors = [];
    broadcaster.destroy = function() {
        this._topics = [];
        this.watchdog.destroy();
        this.connector.removeTab(this);
    };

    return broadcaster;
};
