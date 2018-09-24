/**
 * Shared, Local Key Value Storage.
 * To be used for storing local (non-api persisted data, mostly non-critical data).
 *
 * @param name {String}
 * @param manualFlush {bool} by default disabled, note: NOT tested/used yet.
 * @param [broadcaster] {Object} mBroadcaster-like object in case you don't want to use the global mBroadcaster
 * and watchdog (useful for unit tests - see test/utilities/fakebroadcaster.js)
 *
 * @constructor
 */
var SharedLocalKVStorage = function(name, manualFlush, broadcaster) {
    var self = this;

    if (!broadcaster) {
        broadcaster = mBroadcaster;
    }
    self.broadcaster = broadcaster;

    // intentionally using '.wdog' instead of '.watchdog', because a self.wdog (where 'self' is not defined),
    // would basically cause our code to use the global 'watchdog' object, which can cause a lot of hard to track
    // issues!
    if (typeof broadcaster.watchdog !== 'undefined') {
        self.wdog = broadcaster.watchdog;
    }
    else {
        self.wdog = watchdog;
    }


    self.name = name;
    self.manualFlush = manualFlush;

    var loggerOpts = {};
    if (localStorage.SharedLocalKVStorageDebug) {
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

    self.logger = new MegaLogger("SharedLocalKVStorage[" + name + ":" + broadcaster.id + "]", loggerOpts);

    self.persistAdapter = null;

    self._queuedSetOperations = {};

    self._listeners = {};
    self._initPersistance();

    self.isMaster = false;


    Object.defineProperty(this, 'isMaster', {
        get: function() {
            return self.broadcaster.crossTab.master ? true : false;
        },
        set: function(value) {
            throw new Error(".isMaster is read only!");
        }
    });
};

/**
 * Worst case scenario of an inactive tab, that is heavily throttled by Chrome, so we need to set the query time out
 * when running in realworld cases to a bit higher value.
 */
SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT = (
    mega.chrome ? 10000 : 1000
);

SharedLocalKVStorage._replyToQuery = function(watchdog, token, query, value) {
    watchdog.notify('Q!Rep!y', {
        query: query,
        token: token,
        value: value
    });
};


SharedLocalKVStorage.prototype.triggerOnChange = function(k, v) {
    var self = this;
    $(self).trigger('onChange', [k, v]);
};

SharedLocalKVStorage.prototype._setupPersistance = function() {
    var self = this;

    // clear any old/previously added event handlers in case this function is called after a master change
    [
        'watchdog:Q!slkv_get_' + self.name,
        'watchdog:Q!slkv_keys_' + self.name,
        'watchdog:Q!slkv_set_' + self.name,
        'watchdog:slkv_mchanged_' + self.name,
        'crossTab:master'
    ].forEach(function(k) {
        if (self._listeners[k]) {
            self.broadcaster.removeListener(self._listeners[k]);
            delete self._listeners[k];
        }
        // self.wdog.removeEventHandler(k);
    }) ;


    var listenersMap = {};

    if (self.broadcaster.crossTab.master) {
        // i'm the cross tab master
        self.persistAdapter = new SharedLocalKVStorage.Utils.DexieStorage(
            self.name,
            self.manualFlush,
            self.wdog.wdID
        );

        listenersMap["watchdog:Q!slkv_keys_" + self.name] = function (args) {
            var token = args.data.reply;
            assert(token, 'token is missing for: ' + JSON.stringify(args));

            self.keys(args.data.p).done(function (keys) {
                SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_keys_" + self.name, keys);
            });
        };

        listenersMap["watchdog:Q!slkv_get_" + self.name] = function(args) {
            var token = args.data.reply;
            self.getItem(args.data.k)
                .done(function(response) {
                    self.logger.debug("Sending slkv_get reply: ", args.data.k, response);
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_get_" + self.name, response);
                })
                .fail(function() {
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_get_" + self.name, undefined);
                });
        };

        listenersMap["watchdog:Q!slkv_set_" + self.name] = function(args) {
            var token = args.data.reply;

            var result;

            if (typeof args.data.v === 'undefined') {
                result = self.removeItem(args.data.k, {
                    'origin': args.origin
                });
            }
            else {
                result = self.setItem(args.data.k, args.data.v, {
                    'origin': args.origin
                });
            }

            result
                .done(function(response) {
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_set_" + self.name, response);
                })
                .fail(function() {
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_set_" + self.name, undefined);
                });
        };
    }
    else {
        self.persistAdapter = false;

        listenersMap["watchdog:slkv_mchanged_" + self.name] = function(args) {
            if (args.data.meta.origin !== self.wdog.wdID) {
                self.triggerOnChange(args.data.k, args.data.v);
            }
        };

        listenersMap['crossTab:master'] = function(args) {
            // .setMaster was locally called.
            self._setupPersistance();
        };
    }


    Object.keys(listenersMap).forEach(function(k) {
        self._listeners[k] = self.broadcaster.addListener(k, listenersMap[k]);
    });
};

SharedLocalKVStorage.prototype._initPersistance = function() {
    var self = this;

    self._setupPersistance();

    if (d) {
        $(self).rebind("onChange.logger" + self.name, function(e, k, v) {
            self.logger.debug("Got onChange event:", k, v);
        });
    }

    self._leavingListener = self.broadcaster.addListener('crossTab:leaving', function slkv_crosstab_leaving(data) {
        // master had changed?
        if (data.data.wasMaster) {
            self._setupPersistance();


            if (data.data.newMaster !== -1) {
                if (data.data.newMaster === self.broadcaster.crossTab.ctID) {
                    self.logger.debug("I'd been elected as master.");
                }
                else {
                    self.logger.debug("New master found", data.data.newMaster);
                }

                // master had changed, do I've any queued ops that were not executed? re-send them!
                Object.keys(self._queuedSetOperations).forEach(function(k) {
                    var ops = self._queuedSetOperations[k];
                    ops.forEach(function(op) {
                        if (op.state && op.state() === 'pending') {
                            self.setItem(k, op.targetValue)
                                .done(function() {
                                    op.resolve();
                                })
                                .fail(function() {
                                    op.reject();
                                })
                                .always(function() {
                                    var index = self._queuedSetOperations[k].indexOf(op);
                                    if (index > -1) {
                                        self._queuedSetOperations[k].splice(index, 1);
                                    }
                                });

                            self.logger.debug("Re-setting value for", k, "to", op.targetValue, "because a new " +
                                "master had been elected.");
                        }
                    });
                });
            }
        }
    });
};


SharedLocalKVStorage.prototype.getItem = function(k) {
    var self = this;

    if (self.broadcaster.crossTab.master) {
        return this.persistAdapter.getItem(k);
    }
    else {
        // request using cross tab from master
        var promise = new MegaPromise();

        self.wdog.query("slkv_get_" + self.name, SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT, false, {'k': k}, true)
            .done(function(response) {
                if (response && response[0] && typeof response[0] !== 'undefined') {
                    promise.resolve(response[0]);
                }
                else {
                    promise.reject(response[0]);
                }
            })
            .fail(function(e) {
                self.logger.warn("getItem request failed: ", k, e);
                promise.reject(e);
            });

        return promise;
    }
};

SharedLocalKVStorage.prototype.eachPrefixItem = function __SLKVEachItem(prefix, cb) {
    var self = this;

    if (self.broadcaster.crossTab.master) {
        return self.persistAdapter.eachPrefixItem(prefix, cb);
    }
    else {
        var masterPromise = new MegaPromise();

        self.keys(prefix)
            .fail(function(err) {
                self.logger.warn("eachPrefixItem", prefix, "failed");
                masterPromise.reject(err);
            })
            .done(function(keys) {
                var promises = [];
                keys.forEach(function(k) {
                    var promise = new MegaPromise();

                    promises.push(promise);
                    self.getItem(k)
                        .done(function(v) {
                            cb(v, k);
                            promise.resolve();
                        })
                        .fail(function(err) {
                            self.logger.warn("eachPrefixItem -> getItem", prefix, "failed");
                            promise.reject(err);
                        });
                });
                masterPromise.linkDoneAndFailTo(MegaPromise.allDone(promises));
            });

        return masterPromise;
    }
};


SharedLocalKVStorage.prototype.keys = function(prefix) {
    var self = this;

    if (self.broadcaster.crossTab.master) {
        return self.persistAdapter.keys(prefix);
    }
    else {
        // request using cross tab from master
        var promise = new MegaPromise();

        self.wdog.query(
            "slkv_keys_" + self.name,
            SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT,
            false,
            {
                'p': prefix
            },
            true
        )
            .done(function(response) {
                if (response && response[0] && typeof response[0] !== 'undefined') {
                    promise.resolve(response[0]);
                }
                else {
                    promise.reject(response[0]);
                }
            })
            .fail(function() {
                promise.reject(arguments[0]);
            });

        return promise;
    }

};


SharedLocalKVStorage.prototype.setItem = function(k, v, meta) {
    var self = this;
    if (self.broadcaster.crossTab.master) {
        var fn = "setItem";
        if (typeof v === 'undefined') {
            fn = "removeItem";
        }

        if (!meta) {
            // if triggered locally, by the master, there is no 'meta', so lets add our wdID
            meta = {
                'origin': self.wdog.wdID
            };
        }
        else {
            // if i'm not the one who triggered the change, trigger a local on change event.
            self.triggerOnChange(k, v);
        }
        // Notify via watchdog that there was a change!
        // doing it immediately (and not after .done), because of Chrome's delay of indexedDB operations
        self.wdog.notify("slkv_mchanged_" + self.name, {'k': k, 'v': v, 'meta': meta});

        return self.persistAdapter[fn](k, v);
    }
    else {
        var promise = new MegaPromise();
        if (typeof self._queuedSetOperations[k] === 'undefined') {
            self._queuedSetOperations[k] = [];
        }
        self._queuedSetOperations[k].push(promise);
        promise.targetValue = v;

        self.wdog.query(
            "slkv_set_" + self.name,
            SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT,
            false,
            {
                'k': k,
                'v': v
            },
            true
        )
            .done(function() {
                promise.resolve(v);
            })
            .fail(function() {
                promise.reject();
            })
            .always(function() {
                var index = self._queuedSetOperations[k].indexOf(promise);
                if (index > -1) {
                    self._queuedSetOperations[k].splice(index, 1);
                }
            });
        return promise;
    }
};

SharedLocalKVStorage.prototype.removeItem = function(k, meta) {
    var self = this;
    if (self.broadcaster.crossTab.master) {
        return self.setItem(k, undefined, meta);
    }
    else {
        var promise = new MegaPromise();
        self.wdog.query(
            "slkv_set_" + self.name,
            SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT,
            false,
            {
                'k': k,
                'v': undefined
            },
            true
        )
            .done(function() {
                promise.resolve();
            })
            .fail(function() {
                promise.reject();
            });
        return promise;
    }
};

SharedLocalKVStorage.prototype.clear = function() {
    var self = this;

    var promise = new MegaPromise();
    var promises = [];

    (self.broadcaster.crossTab.master ? self.persistAdapter : self).keys().done(function(keys) {
        keys.forEach(function(k) {
            promises.push(
                self.removeItem(k)
            );
        });
        promise.linkDoneAndFailTo(MegaPromise.allDone(promises));
    })
        .fail(function() {
            promise.reject();
        });
    return promise;
};
SharedLocalKVStorage.prototype.destroy = function(onlyIfMaster) {
    var self = this;

    if (self._leavingListener) {
        self.broadcaster.removeListener(self._leavingListener);
    }

    if (self.broadcaster.crossTab.master) {
        return this.persistAdapter.destroy();
    }
    else if (!onlyIfMaster) {
        return self.clear();
    }
};

SharedLocalKVStorage.DB_STATE = {
    'NOT_READY': 0,
    'READY': 1,
    'INITIALISING': 2,
    'FAILED': 3,
};

SharedLocalKVStorage.encrypt = function(val) {
    return ab_to_base64(FMDB.prototype.strcrypt(JSON.stringify(val)));
};
SharedLocalKVStorage.decrypt = function(val) {
    try {
        return JSON.parse(FMDB.prototype.strdecrypt(base64_to_ab(val)));
    }
    catch (e) {
        return "";
    }
};

SharedLocalKVStorage.Utils = {};

SharedLocalKVStorage.Utils.DexieStorage = function(name, manualFlush, wdID) {
    var self = this;

    self.name = name;
    self.manualFlush = manualFlush;

    var loggerOpts = {};
    if (localStorage.SharedLocalKVStorageDebug || is_karma) {
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

    self.logger = new MegaLogger("SharedLocalKVStorage.Utils.DexieStorage[" + name + "]", loggerOpts);

    self.reinitCache();

    self.dbState = SharedLocalKVStorage.DB_STATE.NOT_READY;
    this.wdID = wdID;
};

SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady = function SLKVDBConnRequired(fn) {
    return function __requiresDBConnWrapper() {
        var self = this;
        var args = arguments;
        var promise = new MegaPromise();

        if (!u_handle) {
            promise.reject();
            return promise;
        }



        // lazy db init
        if (self.dbState === SharedLocalKVStorage.DB_STATE.NOT_READY && !self.dbLoadingPromise) {
            self.dbState = SharedLocalKVStorage.DB_STATE.INITIALISING;

            self.dbLoadingPromise = new MegaPromise();


            self.db = new Dexie("slkv_" + u_handle + "_" + self.name);

            self.db.version(1).stores({
                'kv': '&k, v'
            });
            self.db.version(2)
                .stores({
                    'kv': null
                })
                .upgrade(function(transaction) {
                    // because Dexie does not support changing PKs, we would need to drop the table
                    transaction.idbtrans.db.deleteObjectStore('kv');
                });

            self.db.version(3).stores({
                'kv': '++i, &k, v'
            });

            // typically...we could have used a .finally catch-all clause here, but because of Promises A+,
            // and forcing the exceptions triggered by any resolve/reject callbacks the code needs to be
            // duplicated in a setTimeout call.
            self.db.open()
                .then(
                    function() {
                        self._prefillMemCache()
                            .always(function() {
                                self.dbState = SharedLocalKVStorage.DB_STATE.READY;
                                // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                                // dbLoadingPromise .done cbs fail with a JS exception
                                setTimeout(function() {
                                    self.dbLoadingPromise.resolve();

                                    delete self.dbLoadingPromise;

                                    // recursion
                                    promise.linkDoneAndFailTo(
                                        SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady(fn).apply(self, args)
                                    );
                                }, 0);
                            });
                    },
                    function(e) {
                        self.logger.error("Failed to initialise db.", e && e.message ? e.message : e);

                        self.dbState = SharedLocalKVStorage.DB_STATE.FAILED;

                        // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                        // dbLoadingPromise .done cbs fail with a JS exception
                        setTimeout(function() {
                            self.dbLoadingPromise.reject("DB_OPEN_FAILED");

                            delete self.dbLoadingPromise;

                            // recursion
                            promise.linkDoneAndFailTo(
                                SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady(fn).apply(self, args)
                            );
                        }, 0);
                    }
                )
                .catch(function(e) {
                    self.logger.error("DbOpen failed, reason: ", e);

                    self.dbState = SharedLocalKVStorage.DB_STATE.FAILED;
                    // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                    // dbLoadingPromise .done cbs fail with a JS exception
                    setTimeout(function() {
                        self.dbLoadingPromise.reject("DB_OPEN_FAILED");
                        delete self.dbLoadingPromise;

                        // recursion
                        promise.linkDoneAndFailTo(
                            SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady(fn).apply(self, args)
                        );
                    }, 0);
                });
        }
        else if (
            self.dbState === SharedLocalKVStorage.DB_STATE.NOT_READY &&
            self.dbLoadingPromise &&
            self.dbLoadingPromise.state() === 'pending'
        ) {
            // DB open is in progress.
            promise.linkDoneAndFailTo(
                SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady(fn).apply(self, args)
            );
        }
        else if (self.dbState === SharedLocalKVStorage.DB_STATE.READY) {
            promise.linkDoneAndFailTo(
                fn.apply(self, args)
            );
        }
        else if (self.dbState === SharedLocalKVStorage.DB_STATE.FAILED) {
            promise.reject("DB_FAILED");
        }
        else {
            if (!self.dbLoadingPromise) {
                self.logger.error(
                    "DB Loading promise is missing, but the current DB loading state is: ", self.dbState, ".",
                    "Halting."
                );

                promise.reject("DB_LOADING_PROMISE_MISSING");
            }
            else {

                self.dbLoadingPromise
                    .done(function() {
                        promise.linkDoneAndFailTo(
                            fn.apply(self, args)
                        );
                    })
                    .fail(function() {
                        self.logger.error(
                            "DB Loading Failed."
                        );

                        promise.reject("DB_FAILED");
                    });
            }
        }

        return promise;
    };
};


SharedLocalKVStorage.Utils.DexieStorage.prototype._queuedExecution = function(cb, args, fnName) {
    var self = this;

    if (!self._execQueue) {
        self._execQueue = MegaPromise.QueuedPromiseCallbacks();
    }

    var arr = [self];
    args.forEach(function(v) {
        arr.push(v);
    });

    var resultPromise = self._execQueue.queue(cb.bind.apply(cb, arr), fnName);
    self._execQueue.tick();
    return resultPromise;
};

SharedLocalKVStorage.Utils.DexieStorage.prototype._prefillMemCache = function() {
    var self = this;

    var promise = new MegaPromise();

    self.db.kv
        .toArray()
        .then(
            function(r) {
                r.forEach(function (r) {
                    self.dbcache[SharedLocalKVStorage.decrypt(r.k)] = SharedLocalKVStorage.decrypt(r.v);
                });
                promise.resolve(r);
            },
            function(e) {
                self.logger.error("Failed to do a _prefillMemCache. Error: ", e);
                promise.reject(e);
            }
        )
        .catch(function(r) {
            self.logger.error("_PrefillMemCache .catch", r);
            promise.reject(r);
        });


    return promise;
};

// flush new items / deletions to the DB (in channel 0, this should
// be followed by call to setsn())
// will be a no-op if no fmdb set
SharedLocalKVStorage.Utils.DexieStorage.prototype.flush = function() {
    var self = this;

    var masterPromise = new MegaPromise();

    var delPromises = [];

    for (var k in this.delcache) {
        if (this.delcache.hasOwnProperty(k)) {
            delPromises.push(
                MegaPromise.asMegaPromiseProxy(
                    self.db.kv.where('k').equals(SharedLocalKVStorage.encrypt(k)).delete()
                )
            );
            delete self.dbcache[k];
        }
    }
    self.delcache = {};

    var tmpNewCache = self.newcache;

    var _flushEntry = function(encryptedKey, encryptedVal) {
        var tmpPromise = new MegaPromise();

        self.db.transaction('rw', self.db.kv, function () {
            // delete and put SHOULD be done in an ordered, atomical way.
            self.db.kv.where('k').equals(encryptedKey).toArray(function (found) {
                if (!self.db || !self.db.kv) {
                    // Connection to db closed.
                    tmpPromise.reject();
                }
                else if (found.length === 1) {
                    tmpPromise.linkFailTo(
                        MegaPromise.asMegaPromiseProxy(
                            self.db.kv.update(found[0], {
                                v: encryptedVal
                            })
                                .catch(function (e) {
                                    self.logger.error(
                                        "setItem -> flush -> dexie.update failed:",
                                        e && e.message ? e.message : e,
                                        found,
                                        k,
                                        tmpNewCache[k],
                                        arguments
                                    );
                                    tmpPromise.reject();
                                })
                        )
                    );
                } else if (!found || found.length === 0) {
                    // not found, proceed to add entry
                    tmpPromise.linkFailTo(
                        MegaPromise.asMegaPromiseProxy(
                            self.db.kv.add({
                                k: encryptedKey,
                                v: encryptedVal
                            })
                                .catch(function (e) {
                                    self.logger.error(
                                        "setItem -> flush -> dexie.add failed:",
                                        e && e.message ? e.message : e
                                    );
                                    tmpPromise.reject();
                                })
                        )
                    );
                } else {
                    if (d) {
                        self.logger.error("THIS SHOULD NEVER HAPPEN!", k, tmpNewCache[k], arguments);
                    }
                }
            });
        }).then(function () {
            tmpPromise.resolve();
        }).catch(function (err) {
            self.logger.error("Transaction failed on flush: ", err.message, err.type, err.stack, err);
            tmpPromise.reject(err);
        });

        return tmpPromise;
    };

    MegaPromise.allDone(delPromises)
        .always(function() {
            var promises = [];
            for (var k in tmpNewCache) {
                if (tmpNewCache.hasOwnProperty(k)) {
                    var encryptedKey = SharedLocalKVStorage.encrypt(k);
                    var encryptedVal = SharedLocalKVStorage.encrypt(tmpNewCache[k]);

                    promises.push(_flushEntry(encryptedKey, encryptedVal));

                    self.dbcache[k] = tmpNewCache[k];
                }
            }

            masterPromise.linkDoneAndFailTo(
                MegaPromise.allDone(promises)
            );
        });


    self.newcache = {};


    return masterPromise;
};


SharedLocalKVStorage.Utils.DexieStorage.prototype.setItem = function __SLKVSetItem(k, v) {
    var promise = new MegaPromise();

    delete this.delcache[k];
    this.newcache[k] = v;

    if (this.manualFlush) {
        promise.resolve();
    }
    else {
        this.flush()
            .done(function () {
                promise.resolve();
            })
            .fail(function () {
                promise.reject();
            });
    }

    return promise;
};

// get item - if not found, promise will be rejected
SharedLocalKVStorage.Utils.DexieStorage.prototype.getItem = function __SLKVGetItem(k) {
    var promise = new MegaPromise();

    if (!this.delcache[k]) {
        if (typeof(this.newcache[k]) !== 'undefined') {
            // record recently (over)written
            promise.resolve(this.newcache[k]);
            return promise;
        }
        else {
            // record available in DB
            if (typeof(this.dbcache[k]) !== 'undefined') {
                promise.resolve(this.dbcache[k]);
                return promise;
            }
        }
    }

    // record deleted or unavailable
    promise.reject();

    return promise;
};


SharedLocalKVStorage.Utils.DexieStorage.prototype.keys = function __SLKVKeys(prefix) {
    var self = this;

    var result = {};

    return MegaPromise.resolve(
        Object.keys(
            Object.assign({}, self.dbcache, self.newcache)
        )
            .filter(function(k) {
                return (prefix ? k.indexOf(prefix) === 0 : true) && !self.delcache.hasOwnProperty(k);
            })
    );
};

// check if item exists
SharedLocalKVStorage.Utils.DexieStorage.prototype.hasItem = function __SLKVHasItem(k) {
    var promise = new MegaPromise();

    if (!this.delcache[k] && (typeof(this.newcache[k]) !== 'undefined' || typeof(this.dbcache[k]) !== 'undefined')) {
        return MegaPromise.resolve();
    }

    return MegaPromise.reject();
};


SharedLocalKVStorage.Utils.DexieStorage.prototype.removeItem = function __SLKVRemoveItem(k) {
    var self = this;

    var promise = new MegaPromise();

    if (!self.newcache[k] && !self.dbcache[k]) {
        return promise.reject();
    }

    self.delcache[k] = true;
    delete self.newcache[k];
    delete self.dbcache[k];


    self.db.kv.where('k').equals(SharedLocalKVStorage.encrypt(k)).delete()
        .then(
            function() {
                self.delcache[k] = true;
                delete self.newcache[k];
                delete self.dbcache[k];

                promise.resolve();
            });

    return promise;
};

/**
 * Iterate over all items, with prefix.
 *
 * Note: Case sensitive.
 *
 * @param prefix {String} prefix that would be used for filtering the data
 * @param cb {Function} cb(value, key)
 * @returns {undefined}
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.eachPrefixItem = function __SLKVEachItem(prefix, cb) {
    for (var k in this.newcache) {
        if (this.newcache.hasOwnProperty(k) && !this.delcache[k]) {
            if (k.indexOf(prefix) === 0) {
                cb(this.newcache[k], k);
            }
        }
    }

    for (var kk in this.dbcache) {
        if (this.dbcache.hasOwnProperty(kk) && !this.delcache[kk] && typeof this.newcache[kk] === 'undefined') {
            if (kk.indexOf(prefix) === 0) {
                cb(this.dbcache[kk], kk);
            }
        }
    }

    return MegaPromise.resolve();
};

/**
 * Drops the local db
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.destroy = function __SLKVDestroy() {
    var self = this;
    var promise = new MegaPromise();

    self.dbState = SharedLocalKVStorage.DB_STATE.NOT_READY;

    self.db.delete()
        .then(
            function(r) {
                promise.resolve(r);
            },
            function(e) {
                promise.reject(e);
            }
        );

    promise.always(function() {
        self.reinitCache();
    });

    return promise;
};


/**
 * Re/Initialises the local in memory cache
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.reinitCache = function __SLKVReinitCache() {
    this.dbcache = {};     // items that reside in the DB
    this.newcache = {};    // new items that are pending flushing to the DB
    this.delcache = {};    // delete items that are pending deletion from the DB
};


/**
 * Clear DB contents.
 * @returns {MegaPromise}
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.clear = function __SLKVClear() {
    var self = this;

    var promise = new MegaPromise();

    self.db.kv.clear()
        .catch(function (e) {
            self.logger.error("clear failed: ", arguments, e.stack);
            self.reinitCache();
            promise.reject(e);
        })
        .finally(function () {
            self.reinitCache();
            promise.resolve();
        });

    return promise;
};

SharedLocalKVStorage.Utils.DexieStorage.prototype.close = function __SLKVClose() {
    var self = this;
    var oldState = self.dbState;
    self.dbState = SharedLocalKVStorage.DB_STATE.NOT_READY;
    if (oldState === SharedLocalKVStorage.DB_STATE.READY) {
        self.db.close();
    }
    self.db = null;
    self.reinitCache();
};

/**
 * So that the code in the file is more easy to debug via IDEs, the
 * SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady wrapper is going to wrap the required functions in runtime
 * here...:
 */
[
    'removeItem',
    'flush',
    'keys',
    'getItem',
    'eachPrefixItem',
    'hasItem',
    'clear',
    'destroy'
]
    .forEach(function(methodName) {
        var origFunc = SharedLocalKVStorage.Utils.DexieStorage.prototype[methodName];
        if (is_karma) {
            SharedLocalKVStorage.Utils.DexieStorage.prototype["_" + methodName] = origFunc;
        }

        // jscs:disable validateIndentation
        SharedLocalKVStorage.Utils.DexieStorage.prototype[methodName] = SharedLocalKVStorage.Utils.DexieStorage
            ._requiresDbReady(origFunc);
        // jscs:enable validateIndentation
    });

/**
 * Guarantee that promise-returning methods are executed one after another.
 */
[
    'setItem',
    'removeItem',
    'clear',
    'destroy',
    'eachPrefixItem',
    'getItem',
    'keys'
]
    .forEach(function(methodName) {
        var origFunc = SharedLocalKVStorage.Utils.DexieStorage.prototype[methodName];
        SharedLocalKVStorage.Utils.DexieStorage.prototype[methodName] = function() {
            return this._queuedExecution(origFunc, Array.prototype.slice.call(arguments), methodName);
        };
    });
/**
 * add support for .bind, .rebind, .unbind, .trigger
 */
makeObservable(SharedLocalKVStorage.Utils.DexieStorage);
