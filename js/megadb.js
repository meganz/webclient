/**
 * Mega DB Wrapper around db.js
 */

/**
 * Mega DB wrapper
 *
 * @param suffix {string} used for suffixing the db name
 * @param name {string} name of the database (a-zA-Z0-9_-)
 * @param version {Integer} version
 * @param schema {Object} db schema (IndexedDB format)
 * @returns {MegaDB}
 * @constructor
 */
function MegaDB(name, suffix, version, schema) {
    this.name = name;
    this.suffix = suffix;

    this.server = null;

    this.currentVersion = version;
    this.schema = schema;
    this.dbState = MegaDB.DB_STATE.OPENING;

    var self = this;

    self._dbOpenPromise = db.open({
        server: 'mdb_' + name + '_' + suffix,
        version: version,
        schema: schema
    }).then( function ( s ) {
        self.server = s;
        self.dbState = MegaDB.DB_STATE.INITIALIZED;
        self.initialize();
    }, function() {
        self.dbState = MegaDB.DB_STATE.FAILED_TO_INITIALIZE;
        ERRDEBUG("Could not initialise MegaDB: ", arguments, name, version, schema);
    });

    return this;
};

makeObservable(MegaDB);

/**
 * Static
 */
MegaDB.DB_STATE = {
    'OPENING': 0,
    'INITIALIZED': 10,
    'FAILED_TO_INITIALIZE': 20,
    'CLOSED': 30
};


MegaDB._promiseAtoJQueryPromise = function(p) {
    var $promise = new $.Deferred();

    p.then(function(argument) {
        $promise.resolve(argument)
    }, function(argument) {
        if(localStorage.d) {
            var stack;
            // try to get the stack trace
            try {
                throw new Error("DEBUG")
            } catch(e) {
                stack = e.stack;
            }
            console.error("Promise rejected: ", argument, p, stack);
        }
        $promise.reject(argument);
    });

    return $promise;
};


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
            var $promise = new $.Deferred();


            megaDb._dbOpenPromise.then(
                function() {
                    try {
                        var resultPromise = fn.apply(self, args);
                    } catch(e) {
                        $promise.reject.apply($promise, arguments);
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
        }
    }
};


MegaDB.prototype.initialize = function() {
    var self = this;

    // init code goes here

    // trigger ready
    self.trigger('onReady');
};



MegaDB.prototype.add = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        function(tableName, val) {
            assert(this.server[tableName], 'table not found:' + tableName);

            // ignore any __privateProperties and get back the .id after .add is done
            var tempObj = clone(val);

            Object.keys(tempObj).forEach(function(k) {
                if(k.toString().indexOf("__") === 0) {
                    delete tempObj[k];
                }
            });

            return MegaDB._promiseAtoJQueryPromise(this.server[tableName].add(tempObj))
                .then(function() {
                    if(tempObj.id && tempObj.id != val.id) {
                        val.id = tempObj.id;
                    }
                });
        }
    ),
    'Add'
);


//TODO: test me please
MegaDB.prototype.update = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        function(tableName, k, val) {
            var self = this;

            assert(this.server[tableName], 'table not found:' + tableName);

            // ignore any __privateProperties and get back the .id after .add is done
            var tempObj = clone(val);

            Object.keys(tempObj).forEach(function(k) {
                if(k.toString().indexOf("__") === 0) {
                    delete tempObj[k];
                }
            });

            return self.query(tableName)
                .filter('id', k)
                .modify(val)
                .execute();
        }
    ),
    'Update'
);

MegaDB.prototype.remove = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        function(tableName, id) {
            return this.removeBy(
                tableName,
                "id",
                id
            );
        }
    ),
    'Remove'
);

MegaDB.prototype.removeBy = function(tableName, keyName, value) {
    var self = this;

    var q = self.query(tableName);
    if(!value && $.isPlainObject(keyName)) {
        keyName.forEach(function(v, k) {
            q = q.filter(k, v);
        });
    } else {
        q = q.filter(keyName, value)
    }


    return new Promise(function(resolve, reject) {
        q.execute()
            .then(function(r) {
                if(r.length && r.length > 0) { // found
                    var promises = [];
                    r.forEach(function(v) {
                        promises.push(
                            self.server.remove(tableName, v["id"])
                        );
                    });
                }
                Promise.all(promises).then(function(ar) {
                    resolve(ar);
                }, function(ar) {
                    reject(ar)
                });
            }, function() {
                reject(arguments);
            });
    });
};

MegaDB.prototype.clear = _wrapFnWithBeforeAndAfterEvents(
    function(tableName) {
        return MegaDB._promiseAtoJQueryPromise(this.server.clear(tableName));
    },
    'Clear'
);
MegaDB.prototype.drop = _wrapFnWithBeforeAndAfterEvents(
    function() {
        var self = this;
        self.close();
        return MegaDB._promiseAtoJQueryPromise(self.server.destroy());
    },
    'Drop'
);

MegaDB.prototype.get = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        function(tableName, val) {
            var self = this;

            assert(this.server[tableName], 'table not found:' + tableName);

            var promise = new Promise(function(resolve, reject) {

                self.query(tableName)
                    .filter("id", val)
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
            return MegaDB._promiseAtoJQueryPromise(promise);
        }
    ),
    'Get'
);


MegaDB.prototype.query = _wrapFnWithBeforeAndAfterEvents(
    function(tableName) {
        assert(this.schema[tableName], 'table not found:' + tableName);

        return new MegaDB.QuerySet(this, tableName);
    },
    'Query',
    true /* does not return a promise, may return false or instance of IndexQuery */
);


MegaDB.prototype.close = _wrapFnWithBeforeAndAfterEvents(
    MegaDB._delayFnCallUntilDbReady(
        function() {
            var self = this;
            self.server.close();

            console.warn("Closing db: ", self);

            self.dbState = MegaDB.DB_STATE.CLOSED;

            return true;
        }
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

    self._ops = [];

    'only bound upperBound lowerBound filter all modify map'.split(' ').forEach(function (name) {
        self[name] = function() {
            self._queueOp(name, toArray(arguments));

            return self;
        }
    });

    return this;
};

MegaDB.QuerySet.prototype._queueOp = function(opName, args) {
    var self = this;
    self._ops.push(
        [opName,  args, false]
    );
};

MegaDB.QuerySet.prototype._dequeueOps = function(q, opName) {
    var self = this;
    self._ops.forEach(function(v) {
        if(v[2] === true || v[0] != opName) {
            return; // continue;
        }

        if(opName == "filter") {
            self.megaDb.trigger("onFilterQuery", [self.tableName, v[1]]);
        }
        q = q[opName].apply(q, v[1]);

        v[2] = true; // mark as dequeued
    });
    return q;
};


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


        // by using .map trigger an event when an object is loaded, so that the encryption can kick in and decrypt it
        q = q.map(function(r) {
            megaDb.trigger("onDbRead", [tableName, r]);
            return r;
        });


        // everything else
        q = self._dequeueOps(q, "map");
        q = self._dequeueOps(q, "modify");


        return MegaDB._promiseAtoJQueryPromise(q.execute());
    }
);