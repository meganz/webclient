/**
 * Mega DB Wrapper around db.js
 */

/**
 * Mega DB wrapper
 *
 * @param suffix {string} used for suffixing the db name
 * @param name {string} name of the database (a-zA-Z0-9_-)
 * @param schema {Object} db schema (IndexedDB format)
 * @param options {Object}
 * @returns {MegaDB}
 * @constructor
 */
function MegaDB(name, suffix, schema, options) {
    this.name = name;
    this.suffix = suffix;
    this.server = null;
    this.schema = schema;
    this.dbState = MegaDB.DB_STATE.OPENING;
    this.plugins = {};
    this.flags = 0;

    options = options || {};
    this.options = $.extend({}, clone(MegaDB.DEFAULT_OPTIONS), options);

    this.logger = new MegaLogger("megaDB[" + name + "]", {}, options.parentLogger);

    var self = this;
    var dbName = 'mdb_' + name + '_' + suffix;
    var murSeed = options.murSeed || 0x4d444201;
    var murData =
        JSON.stringify(this.schema) +
        JSON.stringify(clone(this.options));

    var version = +localStorage[dbName + '_v'] || 0;
    var oldHash = +localStorage[dbName + '_hash'];
    var newHash = MurmurHash3( murData, murSeed );

    if (oldHash !== newHash) {
        localStorage[dbName + '_v'] = ++version;
        localStorage[dbName + '_hash'] = newHash;
    }

    var dbOpenOptions = {
        server: dbName,
        schema: schema
    };
    if (this.options.plugins & MegaDB.DB_PLUGIN.ENCRYPTION) {
        this.plugins.megaDbEncryptionPlugin = new MegaDBEncryption(this);
        dbOpenOptions.UDataSlave = true;
    }

    __dbOpen();

    function __dbOpenFailed(dbError) {
        self.dbState = MegaDB.DB_STATE.FAILED_TO_INITIALIZE;
        self.logger.error("Could not initialise MegaDB: ", arguments, name, version, schema);
        self.trigger('onDbStateFailed', dbError);
    }
    function __dbOpenSucceed(dbServer) {
        self.server = dbServer;
        self.currentVersion = version;
        self.dbName = dbName;
        self.dbState = MegaDB.DB_STATE.INITIALIZED;
        self.trigger('onDbStateReady');
        self.initialize();
    }
    function __dbBumpVersion(dbError) {
        MegaDB.getDatabaseVersion(dbName)
            .then(function(dbProp) {
                self.logger.info('Current DB Version', dbProp.version);
                localStorage[dbName + '_v'] = version = dbProp.version + 1;
                __dbOpen();
            }, function(error) {
                self.logger.error('MegaDB.getDatabaseVersion', error);
                __dbOpenFailed(dbError);
            });
    }
    function __dbOpen() {
        dbOpenOptions.version = version;

        self.logger.debug('Opening DB', version, dbOpenOptions);

        self._dbOpenPromise = db.open(dbOpenOptions).then( function( s ) {

            var pluginSetupPromises = obj_values(self.plugins)
                .map(function(pl) {
                    return typeof pl.setup === 'function' && pl.setup(s) || true;
                });

            if (pluginSetupPromises.length) {
                MegaPromise.all(pluginSetupPromises)
                    .then(function() {
                        self.logger.debug('MegaDB PlugIn(s) intialization succeed.', arguments);
                        __dbOpenSucceed(s);
                    }, function(err) {
                        s.close();

                        if (!err) {
                            err = new Error('Failed to initialize MegaDB PlugIn(s)');
                        }
                        else {
                            err = MegaDB.getRefError(err) || err;

                            if (err.code === DOMException.NOT_FOUND_ERR) {
                                return __dbBumpVersion(err);
                            }
                        }
                        __dbOpenFailed(err);
                    });
            }
            else {
                __dbOpenSucceed(s);
            }

        }, function( e ) {
            var dbError = MegaDB.getRefError(e);

            if (!dbError) {
                dbError = e;
                self.logger.error('Unexpected error', dbError);
            }

            if (dbError.name === 'VersionError' || dbError.name === 'InvalidAccessError') {
                self.logger.info(dbError.name + ' (retrying)');

                __dbBumpVersion(dbError);
            }
            else {
                __dbOpenFailed(dbError);
            }
        });
    }

    return this;
}

makeObservable(MegaDB);

/**
 * Static, DB state/flags
 */
MegaDB.DB_STATE = makeEnum(['OPENING','INITIALIZED','FAILED_TO_INITIALIZE','CLOSED']);
MegaDB.DB_FLAGS = makeEnum(['HASNEWENCKEY']);
MegaDB.DB_PLUGIN = makeEnum(['ENCRYPTION']);

/**
 * Static, default options
 */
MegaDB.DEFAULT_OPTIONS = {
    'murSeed': 0,
    'version': false,
    'plugins': 0
};

/**
 * Get Database version
 */
MegaDB.getDatabaseVersion = function(dbName) {
    var promise = new MegaPromise();

    try {
        var request = indexedDB.open(dbName);
        request.onsuccess = function(e) {
            var idb = e.target.result;
            var ver = idb.version;

            idb.close();
            promise.resolve({
                name: dbName,
                version: ver,
                gdbvSucceed: true
            });
        };
        request.onblocked = request.onerror = function(e) {
            promise.reject(e);
        };
    }
    catch(e) {
        promise.reject(e);
    }

    return promise;
};

/**
 * Wrapper around indexedDB.getDatabaseNames using promises
 *
 * MegaDB.getDatabaseNames().always(console.debug.bind(console))
 */
MegaDB.getDatabaseNames = function() {
    var promise = new MegaPromise();

    if (indexedDB) {
        var request = indexedDB.getDatabaseNames();

        request.onsuccess = function(ev) {
            promise.resolve(ev.target.result);
        };
        request.onerror = function(ev) {
            promise.reject(ev.target.result);
        };
    }
    else {
        promise.reject(DOMException.INVALID_ACCESS_ERR);
    }

    return promise;
};


/**
 * Remove all databases
 *
 * @param aUserHandle {String} optional
 */
MegaDB.dropAllDatabases = function(aUserHandle) {
    var promise = new MegaPromise();

    MegaDB.getDatabaseNames()
        .then(function(dbNameList) {
            assert(dbNameList instanceof DOMStringList, 'Invalid database list.');

            db.__closeAll();

            var promises = [];
            var len = dbNameList.length;
            while (len--) {
                var dbn = dbNameList.item(len);

                if (!aUserHandle || dbn.substr(-aUserHandle.length) === aUserHandle) {
                    promises.push(__drop(dbn));
                }
            }

            MegaPromise.allDone(promises).then(promise.resolve.bind(promise));

        }, function(error) {
            promise.reject(error);
        });

    function __drop(dbName) {
        var promise = new MegaPromise();

        try {
            var request = indexedDB.deleteDatabase( dbName );
            request.onsuccess = function() {
                promise.resolve();
            };
            request.onblocked = request.onerror = function(e) {
                console.error('Unable to delete database', dbName, e);
                promise.reject(e);
            };
        }
        catch(e) {
            promise.reject(e);
        }

        return promise;
    }

    return promise;
};

/**
 * Convert any promise-related error to their ending point
 *
 * @param aError {mixed} an error thrown from a reject
 * @returns {mixed} an expected error or null
 */
MegaDB.getRefError = function(aError) {
    var result = null;

    // nb: "reason" comes from our modified db.js
    if (typeof aError === 'object' && "reason" in aError) {
        aError = aError.reason;
    }

    if (aError instanceof Event) {

        if (aError.type === 'blocked') {
            result = new Error('Database is blocked');
        }
        else {
            var target = aError.target;
            var error = target && target.error;

            if (error && (typeof DOMError !== 'undefined'
                    && error instanceof DOMError
                    || error instanceof DOMException)) {
                result = error;
            }
        }
    }
    else if (aError instanceof DOMException) {
        result = aError;
    }

    return result;
};

/**
 * Wrap `fn` with a function which will create a "proxy" promise, which will wait for the DB state to be ready and then
 * actually execute the code in `fn`
 *
 * @param fn {Function} the function, which should be wrapped
 * @returns {Function}
 * @private
 */
MegaDB._delayFnCallUntilDbReady = function(fn) {
    return function() {
        var self = this;
        var megaDb = this;
        if(megaDb instanceof MegaDB.QuerySet) {
            megaDb = self.megaDb;
        }
        var args = toArray(arguments);

        assert(megaDb.dbState != MegaDB.DB_STATE.CLOSED, "Tried to execute method on a closed database.");
        assert(megaDb.dbState != MegaDB.DB_STATE.FAILED_TO_INITIALIZE, "Tried to execute method on a database which failed to initialize (open).");

        if(megaDb.dbState === MegaDB.DB_STATE.INITIALIZED) {
            return fn.apply(self, args);
        } else if(megaDb.dbState === MegaDB.DB_STATE.OPENING) {
            var $promise = new MegaPromise();


            megaDb._dbOpenPromise.then(
                function() {
                    try {
                        var resultPromise = fn.apply(self, args);
                    } catch(e) {
                        $promise.reject.apply($promise, arguments);
                        self.logger.error("Could not open db: ", e);
                    }

                    if(resultPromise.then) {
                        resultPromise.then(
                            function() {
                                $promise.resolve.apply($promise, arguments);
                            },
                            function() {
                                $promise.reject.apply($promise, arguments);
                            }
                        );
                    } else {
                        $promise.resolve.apply($promise, arguments);
                    }
                },function() {
                    $promise.reject.apply($promise, arguments);
                }
            );

            return $promise;
        } else if (self.dbState === MegaDB.DB_STATE.FAILED_TO_INITIALIZE) {
            return MegaPromise.reject("Failed to open database.");
        }
    }
};

/**
 * Try to find the table's keyPath (primary index) from the schema definition, if not found will return 'id'
 */
MegaDB.prototype._getTablePk = function(tableName) {
    assert(this.schema[tableName], 'table not found: ' + tableName);
    var tableSchema = this.schema[tableName];
    var k = 'id';
    if(tableSchema['key'] && tableSchema['key']['keyPath']) {
        k = tableSchema['key']['keyPath'];
    }
    return k;
};

/**
 * Place holder for code, which should be executed to initialize the db (executed when the db is ready)
 * Also, trigger "onReady" event on the MegaDB instance.
 *
 */
MegaDB.prototype.initialize = function() {
    var self = this;

    // trigger ready
    self.trigger('onReady');
};


/**
 * add a db record
 *
 * @param tableName {String} name of the table in which the object/row should be inserted
 * @param val {Object} object containing data to be inserted
 * @returns {MegaPromise}
 */
MegaDB.prototype.add = function(tableName, val) {
    var self = this;

    assert(this.server[tableName], 'table not found:' + tableName);

    var tempObj = clone(val);

    Object.keys(tempObj).forEach(function(k) {
        // ignore any __privateProperties and
        if(k.toString().indexOf("__") === 0) {
            delete tempObj[k];
        }
    });

    return this.server[tableName].add(tempObj)
        .then(function() {
            // get back the .id after .add is done
            if(tempObj[self._getTablePk(tableName)] && tempObj[self._getTablePk(tableName)] != val[self._getTablePk(tableName)]) {
                val[self._getTablePk(tableName)] = tempObj[self._getTablePk(tableName)];
            }
        });
};

MegaDB.prototype.add = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.add
    ),
    'Add'
);


MegaDB.prototype.addOrUpdate = function(tableName, val) {
    var self = this;

    var $promise;
    if(Array.isArray(val)) {
        var promises = val.map(function(v) {
            return self.addOrUpdate(tableName, v);
        });

        $promise = MegaPromise.allDone(promises);
    } else {
        $promise = this.update(tableName, val[this._getTablePk(tableName)], val);
    }
    return $promise;
};

MegaDB.prototype.addOrUpdate = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.addOrUpdate
    ),
    'AddOrUpdate'
);

/**
 * Update an object/row, where `k` should be the ID of the object which should be updated (will insert if not found)
 *
 * @param tableName {String}
 * @param k {Integer|Object} id of the object to be updated
 * @param [val] {Object|undefined} actual object, which will be used to replace the values in the current db
 * @returns {MegaPromise}
 */
MegaDB.prototype.update = function(tableName, k, val) {
    var self = this;

    assert(this.server[tableName], 'table not found:' + tableName);

    if(!val && Array.isArray(k)) {
        val = k;
        k = val[this._getTablePk(tableName)];
    }
    // ignore any __privateProperties and get back the .id after .add is done
    var tempObj = clone(val);

    Object.keys(tempObj).forEach(function(k) {
        if(k.toString().indexOf("__") === 0) {
            delete tempObj[k];
        }
    });


    val = clone(val);
    self.trigger("onModifyQuery", [tableName, val]);
    self.trigger("onBeforeUpdate", [tableName, val[self._getTablePk(tableName)], val, true]);
    return MegaPromise.asMegaPromiseProxy(self.server.update(tableName, val));
};

MegaDB.prototype.update = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.update
    ),
    'Update'
);


/**
 * Remove a row/object from `tableName` which pk/id equals to `id`
 *
 * @param tableName
 * @param id {Integer|String|Object}
 * @returns {MegaPromise}
 */
MegaDB.prototype.remove = function(tableName, id) {
    if($.isPlainObject(id)) {
        id = id[this._getTablePk(tableName)];
    } else if(Array.isArray(id)) {
        var self = this;
        return MegaPromise.allDone(id.map(function(v) {
            return self.remove(tableName, v);
        }))
    }

    return this.removeBy(
        tableName,
        this._getTablePk(tableName),
        id
    );
};


/**
 * Remove object, which have a property `keyName` with value `value` (alias of .query(tableName).filter(keyName, value)
 * + remove)
 *
 * @param tableName {String}
 * @param keyName {String}
 * @param value {String|Integer}
 * @returns {MegaPromise}
 */
MegaDB.prototype.removeBy = function(tableName, keyName, value) {
    var self = this;

    var q = self.query(tableName);
    if(!value && $.isPlainObject(keyName)) {
        Object.keys(keyName).forEach(function(k) {
            var v = keyName[k];
            q = q.filter(k, v);
        });
    } else {
        q = q.filter(keyName, value)
    }


    var promise = new MegaPromise();

    q.execute()
        .then(function(r) {
            var promises = [];
            if(r.length && r.length > 0) { // found
                r.forEach(function(v) {
                    promises.push(
                        MegaPromise.asMegaPromiseProxy(
                            self.server.remove(tableName, v[self._getTablePk(tableName)])
                        )
                    );
                });
            }

            MegaPromise.all(promises).then(function(ar) {
                promise.resolve(ar);
            }, function(ar) {
                promise.reject(ar)
            });
        }, function() {
            promise.reject(arguments);
        });

    return promise;
};
MegaDB.prototype.removeBy = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.removeBy
    ),
    'RemoveBy'
);


/**
 * Truncate a database (warning: this method will not reset the auto incremental counter!)
 *
 * @param tableName {String}
 * @returns {MegaPromise}
 */
MegaDB.prototype.clear = function(tableName) {
    return this.server.clear(tableName);
};
MegaDB.prototype.clear = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(MegaDB.prototype.clear),
    'Clear'
);


/**
 * Drop/delete the current database
 *
 * @returns {MegaPromise}
 */
MegaDB.prototype.drop = function() {
    this.close();
    delete localStorage[this.dbName + '_v'];
    delete localStorage[this.dbName + '_hash'];
    return MegaPromise.asMegaPromiseProxy(this.server.destroy());
};

MegaDB.prototype.drop = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(MegaDB.prototype.drop),
    'Drop'
);


/**
 * Get one object which pk equals to `val` from table `tableName`
 * If the row/object is not found, then the promise will be resolved with 1 argument, which will be empty array
 *
 * @param tableName {String}
 * @param val {Integer}
 * @returns {MegaPromise}
 */
MegaDB.prototype.get = function(tableName, val) {
    var self = this;

    assert(this.server[tableName], 'table not found:' + tableName);

    var promise = new MegaPromise(function(resolve, reject) {

        self.query(tableName)
            .filter(self._getTablePk(tableName), val)
            .execute()
            .then(
            function(result) {
                if($.isArray(result) && result.length == 1) {
                    resolve.apply(null, [result[0]]);
                } else if($.isArray(result) && result.length > 1) {
                    resolve.apply(null, [result]);
                }  else {
                    resolve.apply(null, toArray(arguments));
                }

                // resolve with 1 OR multiple arguments please
            },
            function() {
                reject.apply(null, toArray(arguments));
            });
    });
    return promise;
};
MegaDB.prototype.get = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.get
    ),
    'Get'
);


/**
 * Alias to create a new {MegaDB.QuerySet} instance for the target `tableName`
 *
 * @param tableName {String}
 * @returns {MegaDB.QuerySet}
 */
MegaDB.prototype.query = function(tableName) {
    assert(this.schema[tableName], 'table not found:' + tableName);

    return new MegaDB.QuerySet(this, tableName);
};

MegaDB.prototype.query = _wrapFnWithBeforeAndAfterEvents(
    MegaDB.prototype.query,
    'Query',
    true /* does not return a promise, may return false or instance of IndexQuery */
);


/**
 * Close the connection to the DB.
 * Warning: there is no way to re-open a db connection, so after .close is called this MegaDB instance will be useless
 * and throw exceptions/errors in case any of its method get called.
 *
 * @returns {boolean}
 */
MegaDB.prototype.close = function() {
    var self = this;
    self.server.close();


    self.logger.info("Closing db: ", self);

    self.dbState = MegaDB.DB_STATE.CLOSED;

    return true;
};
MegaDB.prototype.close = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        MegaDB.prototype.close
    ),
    'Close',
    true
);


/**
 * Lazy QuerySet executed helper built ontop of db.js's query API, nothing will happen, until .execute() is called
 *
 * Should be initialized using megaDbInstace.query('tableName').
 *
 * @param megaDb
 * @param tableName
 * @returns {MegaDB.QuerySet}
 * @constructor
 */
MegaDB.QuerySet = function(megaDb, tableName) {
    var self = this;
    self.megaDb = megaDb;
    self.tableName = tableName;
    self.logger = MegaLogger.getLogger("querySet[" + tableName + "]", {}, megaDb.logger);

    self._ops = [];

    'only bound upperBound lowerBound filter all modify map'.split(' ').forEach(function (name) {
        self[name] = function() {
            self._queueOp(name, toArray(arguments));

            return self;
        }
    });

    return this;
};

/**
 * Internal method, for adding MegaDB operations in the internal queue
 *
 * @param opName {String}
 * @param args {Array}
 * @private
 */
MegaDB.QuerySet.prototype._queueOp = function(opName, args) {
    var self = this;
    self._ops.push(
        [opName,  args, false]
    );
};

/**
 * Dequeue all queued operations of a specific type/name
 *
 * @param q {Object} internal db.js queryset object
 * @param opName {String}
 * @returns {Object} internal db.js queryset object
 * @private
 */
MegaDB.QuerySet.prototype._dequeueOps = function(q, opName) {
    var self = this;
    self._ops.forEach(function(v) {
        if(v[2] === true || v[0] != opName) {
            return; // continue;
        }

        var args = v[1];
        if(opName == "filter") {
            args = clone(v[1]);
            self.megaDb.trigger("onFilterQuery", [self.tableName, args]);
        } else if(opName == "modify") {
            args = clone(v[1]);
            self.megaDb.trigger("onModifyQuery", [self.tableName, args]);
        }
        //self.logger.debug("dequeue op:", opName, args);

        // if this was a modify() call, then trigger onBeforeUpdate
        if(opName == "modify") {
            q = q.map(function(r) {
                self.megaDb.trigger("onBeforeUpdate", [self.tableName, r[self.megaDb._getTablePk(self.tableName)], r, true]);
                return r;
            });
        }

        q = q[opName].apply(q, args);

        v[2] = true; // mark as dequeued
    });
    return q;
};


/**
 * Executes all queued operations and returns a promise, which will be resolved with 1 argument, an Array containing
 * all found results.
 *
 * @returns {MegaPromise}
 */
MegaDB.QuerySet.prototype.execute = MegaDB._delayFnCallUntilDbReady(
    function() {
        var self = this;
        var megaDb = this.megaDb;
        var tableName = self.tableName;

        var q = megaDb.server[tableName].query();

        // dequeue IndexQuery ops first!
        [
            'all',
            'filter',
            'only',
            'bound',
            'upperBound',
            'lowerBound'
        ].forEach(function(opName) {
                q = self._dequeueOps(q, opName);
            });

        if(q.only) { // is instanceof db.js IndexQuery, convert to db.js Query (<- no way to do instanceof, because IndexQuery is PRIVATE :|)
            q = q.all();
        }

        // Query ops
        [
            'distinct',
            'desc',
            'filter',
            'keys',
            'limit'
        ].forEach(function(opName) {
                q = self._dequeueOps(q, opName);
            });

        var $proxyPromise = new MegaPromise();

        // by using .map trigger an event when an object is loaded, so that the encryption can kick in and decrypt it
        q = q.map(function(r) {
            var $event = new $.Event("onDbRead");
            megaDb.trigger($event, [tableName, r]);
            if(!$event.isPropagationStopped()) {
                return r;
            } else {
                if($event.data && $event.data.errors && $event.data.errors.length > 0) {
                    $proxyPromise.reject($event.data.errors);
                }
                return undefined;
            }
        });


        // everything else
        q = self._dequeueOps(q, "map");
        q = self._dequeueOps(q, "modify");


        q.execute()
            .then(function(r) {
                if(r.length > 0) {
                    var results = [];
                    r.forEach(function(v, k) {
                        if(typeof(v) != 'undefined') { // skip undefined, e.g. items removed by .map()
                            results.push(v);
                        }
                    });
                    $proxyPromise.resolve(results);
                } else {
                    $proxyPromise.resolve.apply($proxyPromise, arguments);
                }

            }, function() {
                $proxyPromise.reject.apply($proxyPromise, arguments);
            });

        return $proxyPromise;
    }
);