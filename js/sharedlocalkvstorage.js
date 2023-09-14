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

    const id = broadcaster.id || broadcaster.crossTab && broadcaster.crossTab.ctID;
    self.logger = new MegaLogger(`SharedLocalKVStorage[${name}:${id}]`);
    self.debug = window.d > 0 && d;

    self.persistAdapter = null;

    self._queuedSetOperations = Object.create(null);

    self._listeners = {};
    self._initPersistance();

    Object.defineProperty(this, 'isMaster', {
        get: function() {
            return !!self.broadcaster.crossTab.master;
        },
        set: function() {
            throw new Error(".isMaster is read only!");
        }
    });
};

inherits(SharedLocalKVStorage, MegaDataEmitter);

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

SharedLocalKVStorage._clearQueuedSetRecord = (self, key, target) => {
    'use strict';
    assert(self instanceof SharedLocalKVStorage);

    if (self._queuedSetOperations[key]) {
        const index = self._queuedSetOperations[key].indexOf(target);
        if (d) {
            console.assert(index >= 0, `Cannot find ${key}'s`, target);
        }

        if (index > -1) {
            self._queuedSetOperations[key].splice(index, 1);

            if (!self._queuedSetOperations[key].length) {
                delete self._queuedSetOperations[key];

                if (self.debug) {
                    self.logger.debug(`SetQueue ran empty for ${key}`);
                }
            }

            if (self.debug && !$.len(self._queuedSetOperations)) {
                self.logger.debug(`SetQueue emptied.`);
            }
        }
    }
    else if (self.debug) {
        self.logger.warn(`SetQueue is missing ${key}`);
    }
};

SharedLocalKVStorage.prototype.triggerOnChange = function(k, v) {
    var self = this;
    self.trigger('onChange', [k, v]);
};

SharedLocalKVStorage.prototype._setupPersistance = function() {
    'use strict';
    var self = this;
    console.assert(!this.persistAdapter, 'a previous persist adapter exists ?!..');

    // clear any old/previously added event handlers in case this function is called after a master change
    [
        'watchdog:Q!slkv_get_' + self.name,
        `watchdog:Q!slkv_getby_${this.name}`,
        'watchdog:Q!slkv_keys_' + self.name,
        'watchdog:Q!slkv_set_' + self.name,
        `watchdog:Q!slkv_clear_${this.name}`,
        `watchdog:Q!slkv_destroy_${this.name}`,
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

            self.keys(args.data.p).then((keys) => {
                SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_keys_" + self.name, keys);
            }).catch(dump);
        };

        listenersMap[`watchdog:Q!slkv_destroy_${this.name}`] = (args) => {
            const token = args.data.reply;

            this.destroy()
                .catch(dump)
                .finally(() => {
                    SharedLocalKVStorage._replyToQuery(this.wdog, token, `Q!slkv_destroy_${this.name}`, 0xDEAD);
                });
        };

        listenersMap[`watchdog:Q!slkv_clear_${this.name}`] = (args) => {
            const token = args.data.reply;

            this.clear()
                .catch(dump)
                .finally(() => {
                    SharedLocalKVStorage._replyToQuery(this.wdog, token, `Q!slkv_clear_${this.name}`, 0xDEADBEEF);
                });
        };

        listenersMap["watchdog:Q!slkv_get_" + self.name] = function(args) {
            var token = args.data.reply;
            self.getItem(args.data.k)
                .then((response) => {
                    if (self.debug > 1) {
                        self.logger.debug("Sending slkv_get reply: ", args.data.k, response);
                    }
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_get_" + self.name, response);
                })
                .catch(() => {
                    SharedLocalKVStorage._replyToQuery(self.wdog, token, "Q!slkv_get_" + self.name, undefined);
                });
        };

        listenersMap[`watchdog:Q!slkv_getby_${this.name}`] = (args) => {
            const {reply: token, pfx} = args.data;

            this.eachPrefixItem(pfx)
                .then((response) => {
                    SharedLocalKVStorage._replyToQuery(this.wdog, token, `Q!slkv_getby_${this.name}`, response);
                })
                .catch((ex) => {
                    if (this.debug && ex !== ENOENT || this.debug > 1) {
                        this.logger.warn(`slkv_getby_${this.name}:${pfx}`, ex);
                    }
                    SharedLocalKVStorage._replyToQuery(this.wdog, token, `Q!slkv_getby_${this.name}`, undefined);
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
            if (!self.persistAdapter) {
                self._setupPersistance();
            }
        };
    }


    Object.keys(listenersMap).forEach(function(k) {
        self._listeners[k] = self.broadcaster.addListener(k, listenersMap[k]);
    });
};

SharedLocalKVStorage.prototype._initPersistance = function() {
    var self = this;

    self._setupPersistance();

    if (this.debug) {
        self.rebind("onChange.logger" + self.name, function(e, k, v) {
            self.logger.debug("Got onChange event:", k, v);
        });
    }

    this._leavingListener = this.broadcaster.addListener('crossTab:leaving', ({origin, data}) => {
        const {wasMaster, newMaster} = data;
        const didMasterLeave = wasMaster && wasMaster !== -1;
        const didBecomeMaster = didMasterLeave && newMaster === this.broadcaster.crossTab.ctID;

        if (this.debug) {
            const msg = `Tab '${(origin >>> 0).toString(36)}' leaved, checking ownership...`;
            this.logger.log(msg, {didMasterLeave, didBecomeMaster, origin}, data);
        }

        // master had changed?
        if (didMasterLeave) {
            if (didBecomeMaster) {
                console.assert(this.broadcaster.crossTab.master, 'I was expecting to be master...');
                if (!this.persistAdapter) {
                    this._setupPersistance();
                }
            }

            const setItem = (k, data) => {
                const {targetValue, resolve, reject} = data;

                if (d) {
                    this.logger.debug(`Re-setting value for '${k}'`, targetValue);
                }

                this.setItem(k, targetValue)
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                        SharedLocalKVStorage._clearQueuedSetRecord(this, k, data);
                    });
            };

            // master had changed, do I've any queued ops that were not executed? re-send them!
            for (const k in this._queuedSetOperations) {
                const pending = this._queuedSetOperations[k];

                for (let i = 0; i < pending.length; ++i) {
                    setItem(k, pending[i]);
                }
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
            .then((response) => {
                if (response && response[0]) {
                    promise.resolve(response[0]);
                }
                else {
                    promise.reject();
                }
            })
            .catch((ex) => {
                self.logger.warn("getItem request failed: ", k, ex);
                promise.reject(ex);
            });

        return promise;
    }
};

SharedLocalKVStorage.prototype.eachPrefixItem = function __SLKVEachItem(pfx, each) {
    'use strict';

    if (this.broadcaster.crossTab.master) {
        return this.persistAdapter.eachPrefixItem(pfx, each);
    }

    return new MegaPromise((resolve, reject) => {

        this.wdog.query(`slkv_getby_${this.name}`, SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT, false, {pfx}, true)
            .then(([res]) => {
                if (!res) {
                    return reject(ENOENT);
                }
                if (each) {
                    for (const k in res) {
                        each(res[k], k);
                    }
                }
                resolve(res);
            })
            .catch(reject);
    });
};

SharedLocalKVStorage.prototype.dump = function(prefix) {
    'use strict';
    return this.eachPrefixItem(prefix || '', dump).dump(`${this.name}.dump(${prefix || ''})`);
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
        ).then((response) => {
            if (response && response[0]) {
                promise.resolve(response[0]);
            }
            else {
                promise.reject(EINCOMPLETE);
            }
        }).catch((ex) => {
            promise.reject(ex);
        });

        return promise;
    }

};


SharedLocalKVStorage.prototype.setItem = function(k, v, meta) {
    'use strict';
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

    return new MegaPromise((resolve, reject) => {

        if (!this._queuedSetOperations[k]) {
            this._queuedSetOperations[k] = [];
        }
        const op = {resolve, reject, targetValue: v};
        this._queuedSetOperations[k].push(op);

        this.wdog.query(`slkv_set_${this.name}`, SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT, false, {k, v}, true)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                SharedLocalKVStorage._clearQueuedSetRecord(self, k, op);
            });
    });
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
            .then(() => {
                promise.resolve();
            })
            .catch(() => {
                promise.reject();
            });
        return promise;
    }
};

SharedLocalKVStorage.prototype.clear = function() {
    'use strict';

    if (this.debug) {
        this.logger.warn('Cleaning instance...', [this]);
    }

    if (this.broadcaster.crossTab.master) {
        return this.persistAdapter.clear();
    }

    return new MegaPromise((resolve, reject) => {
        this.wdog.query(`slkv_clear_${this.name}`, SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT, false, false, true)
            .then(resolve)
            .catch(reject);
    });
};

SharedLocalKVStorage.prototype.destroy = function() {
    'use strict';
    var self = this;

    if (self.debug) {
        self.logger.warn('Destroying instance...', [this]);
    }

    if (self._leavingListener) {
        self.broadcaster.removeListener(self._leavingListener);
    }

    if (self.debug) {
        self.off(`onChange.logger${self.name}`);
    }

    if (self.broadcaster.crossTab.master) {
        return this.persistAdapter.destroy();
    }

    return new MegaPromise((resolve, reject) => {
        self.wdog.query(`slkv_destroy_${this.name}`, SharedLocalKVStorage.DEFAULT_QUERY_TIMEOUT, false, false, true)
            .then(resolve)
            .catch(reject);
    });
};

SharedLocalKVStorage.DB_MODE = {
    'MANUAL_FLUSH': 1,
    'NO_MEMOIZE': 2,
    'FORCE_MEMOIZE': 4,
    'BINARY': 8,
};
SharedLocalKVStorage.DB_STATE = {
    'NOT_READY': 0,
    'READY': 1,
    'INITIALISING': 2,
    'FAILED': 3,
};

SharedLocalKVStorage.encrypt = function(val) {
    'use strict';

    return FMDB.prototype.toStore(JSON.stringify(val));
};
SharedLocalKVStorage.decrypt = function(val) {
    'use strict';

    try {
        return JSON.parse(FMDB.prototype.fromStore(val));
    }
    catch (e) {
        return "";
    }
};

SharedLocalKVStorage.Utils = Object.create(null);

SharedLocalKVStorage.Utils.lazyInitCall = function(proto, method, master, fn) {
    'use strict';
    if (fn === undefined) {
        fn = master;
        master = true;
    }
    proto[method] = function __SLKVLazyInitCall(...args) {
        if (master && !mBroadcaster.crossTab.master) {
            // the method shall dealt with it.
            return fn.apply(this, arguments);
        }

        return new Promise((resolve, reject) => {
            const name = this.__slkvLazyInitMutex || (this.__slkvLazyInitMutex = `lIMutex${makeUUID().slice(-13)}`);
            mutex.lock(name).then((unlock) => {
                const onReadyState = () => {
                    delete this.__slkvLazyInitMutex;
                    return (this[method] = fn).apply(this, args).then(resolve).catch(reject);
                };

                if (Object.hasOwnProperty.call(this, '__slkvLazyInitReady')) {
                    return onReadyState().finally(unlock);
                }

                this.lazyInit()
                    .then(() => {
                        Object.defineProperty(this, '__slkvLazyInitReady', {value: 1});
                        return onReadyState();
                    })
                    .finally(unlock);
            }).catch(reject);
        });
    };

    return proto[method];
};

SharedLocalKVStorage.Utils._requiresMutex = function SLKVMutexWrapper(origFunc, methodName) {
    'use strict';
    return function __SLKVMutexWrapper(...args) {
        const name = this.__mutexLockName || (this.__mutexLockName = `slkv${makeUUID().slice(-13)}`);
        return new MegaPromise((resolve, reject) => {
            mutex.lock(name)
                .then((unlock) => {
                    const wrap = (dsp) => (arg) => {
                        if (d > 3) {
                            this.logger.warn('Releasing lock(%s) from %s...', name, methodName);
                            console.timeEnd(name);
                        }
                        unlock().then(() => dsp(arg)).catch(reject);
                    };
                    if (d > 3) {
                        this.logger.warn('Lock(%s) acquired for %s...', name, methodName, [this, ...args]);
                        console.time(name);
                    }
                    origFunc.apply(this, args).then(wrap(resolve)).catch(wrap(reject));
                })
                .catch(reject);
        });
    };
};

SharedLocalKVStorage.Utils.DexieStorage = function(name, options) {
    'use strict';

    this.name = name;
    this.dbState = SharedLocalKVStorage.DB_STATE.NOT_READY;
    this.logger = new MegaLogger("SLKVDStorage[" + name + "]");

    this.binary = options & SharedLocalKVStorage.DB_MODE.BINARY;
    this.manualFlush = options & SharedLocalKVStorage.DB_MODE.MANUAL_FLUSH;
    this.memoize = !(options & SharedLocalKVStorage.DB_MODE.NO_MEMOIZE);

    if (this.binary) {
        this.memoize = options & SharedLocalKVStorage.DB_MODE.FORCE_MEMOIZE;
        this._encryptValue = this._encryptBinaryValue;
        this._decryptValue = this._decryptBinaryValue;
    }

    this._reinitCache();
};
inherits(SharedLocalKVStorage.Utils.DexieStorage, MegaDataEmitter);

/**
 * Database connection.
 * @name db
 * @memberOf SharedLocalKVStorage.Utils.DexieStorage.prototype
 */
lazy(SharedLocalKVStorage.Utils.DexieStorage.prototype, 'db', function() {
    'use strict';
    return new MegaDexie('SLKV', this.name, 'slkv_', true, {kv: '++i, &k'});
});

SharedLocalKVStorage.Utils._requiresDbReady = function SLKVDBConnRequired(fn) {
    'use strict';
    return function __requiresDBConnWrapper(...args) {

        if (this.dbState === SharedLocalKVStorage.DB_STATE.READY) {
            return fn.apply(this, arguments);
        }

        var self = this;
        var promise = new MegaPromise();

        if (!u_handle) {
            promise.reject();
            return promise;
        }

        var success = function() {
            promise.linkDoneAndFailTo(fn.apply(self, args));
        };

        var failure = function(ex) {
            self.logger.warn(ex);
            self.dbState = SharedLocalKVStorage.DB_STATE.FAILED;
            promise.reject("DB_FAILED");
        };

        // lazy db init
        if (self.dbState === SharedLocalKVStorage.DB_STATE.NOT_READY) {
            self.dbState = SharedLocalKVStorage.DB_STATE.INITIALISING;

            self.dbLoadingPromise = new MegaPromise();

            self.db.open().then(self._OpenDB.bind(self)).then(function(r) {
                self.logger.info('DB Ready, %d records loaded.', r.length, r);
            }).catch(failure).finally(function() {
                var p = self.dbLoadingPromise;
                delete self.dbLoadingPromise;

                if (d > 1) {
                    self.db.$__OwnerInstance = self;
                }

                if (self.dbState === SharedLocalKVStorage.DB_STATE.FAILED) {
                    return p.reject("DB_OPEN_FAILED");
                }
                self.dbState = SharedLocalKVStorage.DB_STATE.READY;

                success();
                p.resolve();
            }).catch(failure);
        }
        else if (self.dbState === SharedLocalKVStorage.DB_STATE.INITIALISING) {
            // DB open is in progress.
            self.dbLoadingPromise.then(success).catch(failure);
        }
        else {
            promise.reject("DB_FAILED");
        }

        return promise;
    };
};

SharedLocalKVStorage.Utils.DexieStorage.prototype._encryptKey = SharedLocalKVStorage.encrypt;
SharedLocalKVStorage.Utils.DexieStorage.prototype._decryptKey = SharedLocalKVStorage.decrypt;
SharedLocalKVStorage.Utils.DexieStorage.prototype._encryptValue = SharedLocalKVStorage.encrypt;
SharedLocalKVStorage.Utils.DexieStorage.prototype._decryptValue = SharedLocalKVStorage.decrypt;

// @private
SharedLocalKVStorage.Utils.DexieStorage.prototype._encryptBinaryValue = function(value) {
    'use strict';
    var pad = -value.byteLength & 15;
    if (pad) {
        var tmp = new Uint8Array(value.byteLength + pad);
        tmp.set(value);
        value = tmp;
    }
    return [pad, FMDB.prototype._crypt(u_k_aes, value)];
};

// @private
SharedLocalKVStorage.Utils.DexieStorage.prototype._decryptBinaryValue = function(value) {
    'use strict';
    var pad = value[0];
    value = FMDB.prototype._decrypt(u_k_aes, value[1]);
    return pad ? value.slice(0, -pad) : value;
};

SharedLocalKVStorage.Utils.DexieStorage.prototype._OpenDB = function() {
    'use strict';
    var self = this;

    if (!this.memoize) {
        return Promise.resolve([]);
    }
    return self.db.kv.toArray()
        .then(function(r) {
            for (var i = 0; i < r.length; ++i) {
                self.dbcache[self._decryptKey(r[i].k)] = self._decryptValue(r[i].v);
            }
            return r;
        });
};

// flush new items / deletions to the DB (in channel 0, this should
// be followed by call to setsn())
// will be a no-op if no fmdb set
SharedLocalKVStorage.Utils.DexieStorage.prototype.flush = function() {
    'use strict';
    var self = this;
    var masterPromise = new MegaPromise();

    var debug = function(o) {
        return o.map(function(o) {
            return self._decryptKey(o.k) + ':' + self._decryptValue(o.v);
        });
    };

    var done = onIdle.bind(null, function() {
        if (!self.memoize) {
            self._reinitCache();
        }
        masterPromise.resolve();
    });

    var bulkDelete = Object.keys(self.delcache)
        .map(function(k) {
            delete self.dbcache[k];
            return self.db.kv.where('k').equals(self._encryptKey(k)).delete();
        });

    var bulkPut = Object.keys(self.newcache)
        .map(function(k) {
            self.dbcache[k] = self.newcache[k];
            return {
                k: self._encryptKey(k),
                v: self._encryptValue(self.newcache[k])
            };
        });

    self.delcache = Object.create(null);
    self.newcache = Object.create(null);

    Promise.all(bulkDelete)
        .then(function() {
            return self.db.bulkUpdate(bulkPut);
        })
        .then(done)
        .catch(function(ex) {
            if (d || is_karma) {
                self.db.kv.toArray()
                    .then(function(o) {
                        self.logger.error("flush failed", ex.message, [ex], debug(bulkPut), debug(o));
                        masterPromise.reject(ex);
                    });
            }
            else {
                masterPromise.reject(ex);
            }
        });

    return masterPromise;
};


SharedLocalKVStorage.Utils.DexieStorage.prototype.setItem = function __SLKVSetItem(k, v) {
    'use strict';
    console.assert(v !== undefined);

    delete this.delcache[k];
    this.newcache[k] = v;

    if (this.manualFlush) {
        return MegaPromise.resolve();
    }

    return this.flush();
};

// get item - if not found, promise will be rejected
SharedLocalKVStorage.Utils.DexieStorage.prototype.getItem = function __SLKVGetItem(k) {
    'use strict';
    var self = this;
    return new MegaPromise(function(resolve, reject) {

        if (!self.delcache[k]) {
            if (self.newcache[k] !== undefined) {
                // record recently (over)written
                return resolve(self.newcache[k]);
            }

            // record available in DB
            if (self.dbcache[k] !== undefined) {
                return resolve(self.dbcache[k]);
            }
        }

        if (self.memoize) {
            // record deleted or unavailable
            return reject();
        }

        self.db.kv.where('k').equals(self._encryptKey(k)).toArray()
            .then(function(r) {
                if (!r.length) {
                    // record deleted or unavailable
                    return reject();
                }

                resolve(self._decryptValue(r[0].v));
            })
            .catch(reject);
    });
};

SharedLocalKVStorage.Utils.DexieStorage.prototype.keys = function __SLKVKeys(prefix) {
    'use strict';
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        var filter = function(k) {
            return (prefix ? k.startsWith(prefix) : true) && self.delcache[k] === undefined;
        };

        if (self.memoize) {
            var keys = Object.keys(Object.assign({}, self.dbcache, self.newcache));
            return resolve(keys.filter(filter));
        }

        self.db.kv.orderBy('k').keys()
            .then(function(keys) {
                resolve(keys.map(self._decryptKey.bind(self)).filter(filter));
            })
            .catch(reject);
    });
};

// check if item exists
SharedLocalKVStorage.Utils.DexieStorage.prototype.hasItem = function __SLKVHasItem(k) {
    'use strict';
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        if (!self.delcache[k] && (self.newcache[k] !== undefined || self.dbcache[k] !== undefined)) {
            return resolve();
        }

        if (self.memoize) {
            return reject();
        }

        self.db.kv.where('k').equals(self._encryptKey(k)).keys()
            .then(function(r) {
                if (r.length) {
                    return resolve();
                }
                reject();
            })
            .catch(reject);
    });
};

SharedLocalKVStorage.Utils.DexieStorage.prototype.removeItem = function __SLKVRemoveItem(k, expunge) {
    'use strict';
    var self = this;
    expunge = expunge === true;
    if (d) {
        this.logger.debug(`removeItem(${JSON.stringify(k)})`, expunge, this.memoize, this.manualFlush);
    }

    if (!expunge && self.memoize && this.newcache[k] === undefined && this.dbcache[k] === undefined) {
        return MegaPromise.reject();
    }

    this.delcache[k] = true;
    delete this.newcache[k];
    delete this.dbcache[k];

    if (!expunge) {
        return this.flush();
    }

    return new MegaPromise(function(resolve, reject) {
        self.flush().then(function() {
            return self.db.kv.count();
        }).then(function(num) {
            if (d && !num) {
                console.assert(!$.len(Object.assign({}, self.dbcache, self.newcache)));
            }
            return num ? num : self._destroy();
        }).then(resolve).catch(reject);
    });
};

/**
 * Iterate over all items, with prefix.
 *
 * Note: Case sensitive.
 *
 * @param {String} prefix that would be used for filtering the data
 * @param {Function} [each] callback(value, key)
 * @returns {MegaPromise} promise
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.eachPrefixItem = function __SLKVEachItem(prefix, each) {
    'use strict';
    return new MegaPromise((resolve, reject) => {

        let count = 0;
        const res = Object.create(null);

        if (this.memoize) {
            Object.assign(res, this.dbcache, this.newcache);

            for (const key in res) {
                if (this.delcache[key] || !key.startsWith(prefix)) {
                    delete res[key];
                }
                else {
                    if (each) {
                        each(res[key], key);
                    }
                    ++count;
                }
            }

            return count ? resolve(res) : reject(ENOENT);
        }

        this.db.kv.toArray()
            .then((r) => {

                for (let i = r.length; i--;) {
                    const k = this._decryptKey(r[i].k);

                    if (k.startsWith(prefix)) {
                        res[k] = this._decryptValue(r[i].v);

                        if (each) {
                            each(res[k], k);
                        }
                        ++count;
                    }
                }

                return count ? resolve(res) : reject(ENOENT);
            })
            .catch(reject);
    });
};

/**
 * Drops the local db
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype.destroy = function __SLKVDestroy() {
    'use strict';
    return new MegaPromise((resolve, reject) => {

        this._reinitCache();
        this.dbState = SharedLocalKVStorage.DB_STATE.NOT_READY;

        return 'db' in this ? this.db.delete().then(resolve).catch(reject) : resolve();
    });
};

/**
 * Re/Initialises the local in memory cache
 */
SharedLocalKVStorage.Utils.DexieStorage.prototype._reinitCache = function __SLKVReinitCache() {
    'use strict';
    this.dbcache = Object.create(null);     // items that reside in the DB
    this.newcache = Object.create(null);    // new items that are pending flushing to the DB
    this.delcache = Object.create(null);    // delete items that are pending deletion from the DB
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
            self._reinitCache();
            promise.reject(e);
        })
        .finally(function () {
            self._reinitCache();
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
    self._reinitCache();
};

/**
 * So that the code in the file is more easy to debug via IDEs, the
 * SharedLocalKVStorage.Utils.DexieStorage._requiresDbReady wrapper is going to wrap the required functions in runtime
 * Guarantee that promise-returning methods are executed one after another.
 */
(function __monkeyPatch(proto) {
    'use strict';
    // eslint-disable-next-line local-rules/misc-warnings
    Object.keys(proto)
        .filter(function(n) {
            return n[0] !== '_';
        })
        .forEach(function(methodName) {
            var origFunc = SharedLocalKVStorage.Utils._requiresDbReady(proto[methodName], methodName);

            if (methodName !== 'flush') {
                if (methodName === 'destroy' /* || ... */) {
                    // to be used under an already acquired lock.
                    Object.defineProperty(proto, '_' + methodName, {value: proto[methodName]});
                }
                origFunc = SharedLocalKVStorage.Utils._requiresMutex(origFunc, methodName);
            }

            proto[methodName] = origFunc;

            var short = methodName.replace(/[A-Z].*/, '');
            if (short !== methodName) {
                Object.defineProperty(proto, short, {value: proto[methodName]});
            }
        });
})(SharedLocalKVStorage.Utils.DexieStorage.prototype);
