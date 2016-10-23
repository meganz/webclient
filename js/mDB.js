var mDBact, mDBv = 7, mDB, mSDB, mSDBPromises = [];

/**
 *  @brief Dynamic wrapper around MegaDB which eases handling
 *         indexedDBs whose purpose is storing plain objects
 *         with no indexes and loaded in bulk at startup.
 *
 *  @param [string]   aName      Database name.
 *  @param [mixed]    aOptions   MegaDB Options (optional)
 *  @param [function] aCallback  Callback to invoke when the db
 *                               is ready to use (optional)
 *
 *  @details The schema is created at runtime by calling the function
 *           addSchemaHandler. If there is no callback provided on the
 *           constructor a mBroadcaster event will be dispatched with
 *           the DB name, ie mStorageDB:dbname, when it's ready to use.
 *           The version is automatically handled by computing a
 *           MurmurHash3 for the schema, and increased as it changes.
 *
 *  @example
 *       mStorageDB('myDataBase', function(aError) {
 *           if (aError) throw new Error('Database error');
 *
 *           this.add('myTable', {
 *               name: 'John Doe', age: 49, car: 'Volvo'
 *           }).then(function() {
 *               console.log('Item inserted successfully');
 *           });
 *       }).addSchemaHandler('myTable', 'name', function(results) {
 *           results.forEach(function(who) {
 *               console.debug('Meet ' + who.name);
 *           })
 *       });
 */
function mStorageDB(aName, aOptions, aCallback) {
    if (!(this instanceof mStorageDB)) {
        return new mStorageDB(aName, aOptions, aCallback);
    }
    if (typeof aOptions === 'function') {
        aCallback = aOptions;
        aOptions = undefined;
    }
    this.name     = aName;
    this.options  = aOptions || {};
    this.handlers = {};
    this.schema   = {};
    mSDBPromises.push(this);
    this.onReadyState = aCallback;

    if (!("plugins" in this.options)) {
        this.options.plugins = MegaDB.DB_PLUGIN.ENCRYPTION;
    }
}
mStorageDB.prototype = {
    addSchema: function mStorageDB_addSchema(aTable, aKeyPath, aIndex) {
        if (Array.isArray(aTable)) {
            var self = this;
            aTable.forEach(function(table) {
                self.addSchema(table, aKeyPath, aIndex);
            });
        }
        else {
            if (!aKeyPath) {
                aIndex = true;
                aKeyPath = 'k';
            }
            this.schema[aTable] = {
                key: {
                    keyPath: aKeyPath
                }
            };

            if (aIndex) {
                this.schema[aTable].indexes = {};
                this.schema[aTable].indexes[aKeyPath] = { unique: true };
            }
        }
        return this;
    },

    addSchemaHandler: function mStorageDB_addSchemaHandler(aTable, aKeyPath, aHandler) {
        this.addSchema(aTable, aKeyPath);
        this.handlers[aTable] = aHandler;
        return this;
    },

    query: function mStorageDB_query(aCommand, aTable, aData) {
        var promise, error;

        if (this.schema[aTable]) {
            if (d) console.log('msdb query', this.name, aCommand, aTable, aData);

            if (aCommand === 'add') {
                promise = this.db.addOrUpdate(aTable, aData);
            }
            else if (aCommand === 'del') {
                promise = this.db.remove(aTable, aData);
            }
            else {
                error = Error("Unknown command '"+aCommand+"'");
            }
        }
        else {
            error = Error("Unknown table '"+aTable+"' for db " + this.name);
        }

        if (error) {
            promise = new MegaPromise();
            Soon(function __msdb_queryError() {
                promise.reject(error);
            });
        }
        return promise;
    },

    setup: function mStorageDB_setup() {
        var promise = new MegaPromise(), self = this, db;

        // MegaDB's encryption plugin depends on u_privk
        if (typeof u_k !== 'undefined' && u_k) {

            db = new MegaDB(this.name, u_handle, this.schema, this.options);

            db.bind('onDbStateReady', function _onDbStateReady() {
                if (self.options.noBulkRead) {
                    return __dbNotifyCompletion();
                }
                self.fetch(Object.keys(self.schema))
                    .then(function() {
                        __dbNotifyCompletion();
                    }, function(err) {
                        __dbNotifyCompletion(err || true);
                    });
            });

            db.bind('onDbStateFailed', function _onDbStateFailed(ev, error) {
                if (d) console.error('onDbStateFailed', error.message || error);
                __dbNotifyCompletion(0xBADF);
            });
        }
        else {
            Soon(__dbNotifyCompletion.bind(null, 0xBADF));
        }

        function __dbNotifyCompletion(aError) {
            if (aError) {
                promise.reject(aError);
            } else {
                promise.resolve(db);
            }
            if (self.onReadyState) {
                Soon(self.onReadyState.bind(self, aError));
                delete self.onReadyState;
            }
            if (db) {
                db.unbind('onDbStateReady').unbind('onDbStateFailed');
            }
            mBroadcaster.sendMessage('mStorageDB:' + self.name, aError);
            promise = db = self = undefined;
        }

        this.db = db;
        this.add = this.query.bind(this, 'add');
        this.del = this.query.bind(this, 'del');

        if (db) {
            this.put = db.put.bind(db);
            this.get = db.getv.bind(db);
            this.cat = db.concat.bind(db);
        }

        return promise;
    },

    fetch: function mStorageDB_fetch(aTables, aPromise) {
        var t = aTables.shift(), self = this;
        if (d) console.log('msdb fetch', t);

        if (!aPromise) {
            aPromise = new MegaPromise();
        }

        if (t) {
            this.db.query(t)
                .execute()
                .then(function _fetchDone(results) {
                    if (d) console.log('msdb fetch done', t, results);

                    if (results.length) {
                        if (self.handlers[t]) {
                            try {
                                self.handlers[t](results, true);
                            }
                            catch(ex) {
                                if (d) console.error(ex);
                            }
                        }
                        else {
                            console.error('No handler for table', t);
                        }
                    }
                    self.fetch(aTables, aPromise);
                }, function _fetchFail() {
                    if (d) console.log('msdb fetch failed', t);
                    aPromise.reject.apply(aPromise, arguments);
                });
        } else {
            aPromise.resolve();
        }

        return aPromise;
    }
};

mBroadcaster.once('startMega', function __idb_setup() {
    try {
        if (!window.indexedDB) {
            window.indexedDB = window.webkitIndexedDB || window.msIndexedDB || window.mozIndexedDB;
            if (!window.indexedDB) {
                throw 1;
            }
        }
    }
    catch (ex) {
        return;
    }
    if (!window.IDBKeyRange) {
        window.IDBKeyRange = window.webkitIDBKeyRange || window.msIDBKeyRange;
    }
    if (!window.IDBTransaction) {
        window.IDBTransaction = window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;
    }
    if (indexedDB) {
        mDB = 0x7f;

        if (typeof indexedDB.webkitGetDatabaseNames !== 'function') {
            if (typeof indexedDB.getDatabaseNames === 'function') {
                indexedDB.webkitGetDatabaseNames = indexedDB.getDatabaseNames;
            }
            else {
                indexedDB.webkitGetDatabaseNames = function webkitGetDatabaseNames() {
                    var onsuccess, onerror;
                    var request = Object.create(IDBRequest.prototype, {
                        onsuccess: { set: function(fn) { onsuccess = fn; }},
                        onerror: { set: function(fn) { onerror = fn; }}
                    });

                    Soon(function __getDatabaseNames_polyfill() {
                        try {
                            var length = 0;
                            var list = Object.create(DOMStringList.prototype, {
                                item: { value: function(n) {
                                    return this.hasOwnProperty(n) && this[n] || null;
                                }},
                                contains: { value: function(k) {
                                    return ~Object.getOwnPropertyNames(this).indexOf(k);
                                }},
                                length: { get: function() { return length; }}
                            });

                            for (var i in localStorage) {

                                if (i.substr(0,4) === 'mdb_') {
                                    var idx = i.split('_').pop();

                                    if (idx == 'hash') {
                                        list[length++] = i.substr(0, i.length - 5);
                                    }
                                }
                            }

                            __Notify('success', list);
                        }
                        catch(e) {
                            if (typeof onerror === 'function') {
                                __Notify('error', e);
                            }
                            else {
                                throw e;
                            }
                        }
                    });

                    function __Notify(ev, result) {
                        try {
                            ev = new Event(ev);
                        }
                        catch (ex) { // MSIE
                            ev = { type: ev };
                        }
                        Object.defineProperty(ev, 'target', {value: request});
                        Object.defineProperty(request, 'result', {value: result});

                        if (ev.type === 'error') {
                            onerror(ev);
                        }
                        else {
                            onsuccess(ev);
                        }
                    }

                    return request;
                };
            }
        }
        if (typeof indexedDB.getDatabaseNames !== 'function') {
            indexedDB.getDatabaseNames = indexedDB.webkitGetDatabaseNames;
        }
    }
});

mBroadcaster.once('startMega', function __msdb_init() {
    var db = new mStorageDB('msmain');

    db.addSchemaHandler('opc',  'p',  processOPC);
    db.addSchemaHandler('ipc',  'p',  processIPC);
    db.addSchemaHandler('ps',   'p',  processPS);
    db.addSchemaHandler('mcf',  'id', processMCF);

    /*mStorageDB('idbcache', { plugins: 0, ersistant: 1 },
        function(aError) {
            if (aError) {
                if (d) {
                    console.warn('Unable to initialize idbcache', aError);
                }
            }
            else {
                Object.defineProperty(mega, 'idbcache', { value: this });
            }
        }).addSchema('fa');*/

    mBroadcaster.once('mStorageDB:' + db.name,
        function __msdb_ready(aError) {
            if (d) console.log('mStorageDB.ready', aError);

            if (aError === 0xBADF) {
                mSDB = db = undefined;
            }
        });

    mBroadcaster.once('mFileManagerDB.done',
        function __msdb_setup(aCallback) {
            function __msdb_done() {
                if (d) console.log('__msdb_done', arguments);

                if (aCallback === getsc) {
                    getsc(1);
                } else {
                    aCallback();
                }
            }
            var promises = mSDBPromises
                .map(function(aDBInstance) {
                    return aDBInstance.setup();
                });
            MegaPromise.all(promises)
                .done(function __msdb_ready(resultPromises) {
                    var requiresReload = resultPromises
                        .some(function(db) {
                            return db.flags & MegaDB.DB_FLAGS.HASNEWENCKEY;
                        });

                    if (requiresReload) {
                        mDBreload();
                    }
                    else {
                        __msdb_done();
                    }
                }).fail(function __msdb_failed(err) {
                    if (d) console.error('__msdb_setup error', err);

                    if (err === 0xBADF) {
                        // error accessing the db, continue with no mSDB support
                        __msdb_done();
                    } else {
                        // error reading db data on disk, force reload
                        mDBreload();
                    }
                }).always(function() {
                    mBroadcaster.sendMessage('mStorageDB!ready');
                });
            mSDBPromises = undefined;
        });

    mBroadcaster.addListener('mFileManagerDB.state',
        function __msdb_state(aState) {
            if (aState === mFileManagerDB.STATE_READONLY) {
                mSDB = undefined;
            } else {
                mSDB = db;
            }
        });
});

var mFileManagerDB = {
    schema: {
        ok: { key: { keyPath: "h"   }},
        u:  { key: { keyPath: "u"   }},
        f:  { key: { keyPath: "h"   }},
        s:  { key: { keyPath: "h_u" }}
    },

    init: function mFileManagerDB_init() {
        var db = new MegaDB("fm", u_handle, this.schema, { murSeed: 0x800F0002 });

        if (mBroadcaster.crossTab.master) {
            var ieAccessError;
            if ("ActiveXObject" in window) {
                db.bind('onDbTransientError', function _onDbTransientError(ev, err) {
                    if (!(db.flags & MegaDB.DB_FLAGS.DBUPGRADE)) {
                        ieAccessError = (Object(err).name === 'InvalidAccessError');
                    }
                });
            }
            db.bind('onDbStateReady', function _onDbStateReady() {
                if (d) console.log('onDbStateReady', arguments);

                var oldVersion = +localStorage['fmdbv_' + u_handle] || this.currentVersion;
                localStorage['fmdbv_' + u_handle] = this.currentVersion;

                if (oldVersion < this.currentVersion && !ieAccessError) {
                    if (d) console.log('fmdb version change');
                    mFileManagerDB.reload();
                }
                else if (+localStorage['fmdblock_' + u_handle]) {
                    if (d) console.log('fmdb is locked');
                    mFileManagerDB.reload();
                }
                else {
                    mDB = this;
                    if (localStorage[u_handle + '_maxaction']) {
                        if (d) console.time('fmdb');
                        mFileManagerDB.fetch(Object.keys(mFileManagerDB.schema));
                    } else {
                        mFileManagerDB._loadfm(this);
                    }
                }
            });
        }
        else {
            db.bind('onDbStateReady', function _onDbStateReady() {
                if (d) {
                    console.log('onDbStateReady.slave', arguments);
                    console.time('fmdb');
                }
                mFileManagerDB.fetch(Object.keys(mFileManagerDB.schema));
            });
            this.slave = true;
        }

        db.bind('onDbStateFailed', function _onDbStateFailed(ev, error) {
            if (d) console.error('onDbStateFailed', error && error.message || error);
            mFileManagerDB._loadfm();
        });

        this.db = db;
        this.state = this.STATE_WORKING;

        this._reset(u_handle);
    },

    fetch: function mFileManagerDB_fetch(aTables) {
        var t = aTables.shift();
        if (d) console.log('fmdb fetch', t);

        if (t) {
            this.db.query(t)
                .execute()
                .then(function _fetchDone(results) {
                    if (d) console.log('fmdb fetch done', t, results);

                    if (!results.length) {
                        mFileManagerDB.fetch(aTables);
                    }
                    else if (t === 'f') {
                        for (var i in results) {
                            if (results[i].sk) {
                                var n = results[i];
                                u_sharekeys[n.h] = crypto_process_sharekey(n.h, n.sk);
                            }
                        }
                        mega.loadReport.recvNodes = Date.now() - mega.loadReport.stepTimeStamp;
                        mega.loadReport.stepTimeStamp = Date.now();

                        $.mDBIgnoreDB = true;
                        process_f(results, function(hasMissingKeys) {
                            delete $.mDBIgnoreDB;
                            if (hasMissingKeys) {
                                srvlog('Got missing keys on DB, forcing fm reload...', null, true);
                                mFileManagerDB.reload();
                            } else {
                                mFileManagerDB.fetch(aTables);
                            }
                        }, 1);
                    }
                    else {
                        if (t === 'ok') {
                            process_ok(results, 1);
                        }
                        else if (t === 'u') {
                            for (var i in results) {
                                M.addUser(results[i], 1);
                            }
                        }
                        else if (t === 's') {
                            for (var i in results) {
                                if (!(results[i].n || results[i].h)) {
                                    console.error('missing required .n property for a nodeShare (mDB init)');
                                } else {
                                    M.nodeShare(
                                        results[i].n ? results[i].n : results[i].h,
                                        results[i],
                                        1
                                    );
                                }
                            }
                        }
                        else {
                            console.error('Unknown table', t);
                        }
                        mFileManagerDB.fetch(aTables);
                    }
                }, function _fetchFail() {
                    if (d) console.log('fmdb fetch failed', t);

                    if (mFileManagerDB.slave) {
                        mFileManagerDB._loadfm();
                    } else {
                        mFileManagerDB._restart();
                    }
                });
        }
        else {
            var hasEntries = false;
            maxaction = localStorage[u_handle + '_maxaction'];

            for (var i in M.d) {
                hasEntries = true;
                break;
            }

            if (d) {
                console.timeEnd('fmdb');
                console.log('fmdb fetch completed', maxaction, hasEntries);
            }

            mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
            mega.loadReport.procNodes     = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            if (!maxaction || !hasEntries) {
                this.reload();
            }
            else {
                this._setstate(this.db);
                mBroadcaster.sendMessage('mFileManagerDB.done', getsc) || getsc(1);
            }
        }
    },

    query: function mFileManagerDB_query(aCommand, aTable, aData) {
        var u_handle = this.userHandle;
        var lock = (parseInt(localStorage['fmdblock_' + u_handle]) | 0) + 1;
        localStorage['fmdblock_' + u_handle] = lock;

        if (!(this.db && this.db.server)) {
            console.warn("No database connection.");
        }
        else if (this.schema[aTable]) {
            var promise;

            if (d /*&& (d > 1 || !(mega.flags & window.MEGAFLAG_EXECSC))*/) {
                console.debug('fmdb query', aCommand, aTable, aData, lock);
            }

            try {
                if (aCommand === 'add') {
                    promise = this.db.server.update(aTable, aData);
                }
                else {
                    promise = this.db.server.remove(aTable, aData);
                }
            }
            catch (ex) {
                console.warn(u_handle, ex);
                return;
            }

            promise.then(function() {
                var l = (+localStorage['fmdblock_' + u_handle] | 0) - 1;
                localStorage['fmdblock_' + u_handle] = l;
                if (d > 1) {
                    console.log('fmdb lock', l);
                }
            });
        } else {
            throw new Error('Unknown fmdb table: ' + aTable);
        }
    },

    exec: function mFileManagerDB_exec(aFunc) {
        var db = this.db, promise = new MegaPromise();

        if (d) console.log('mFileManagerDB.exec', aFunc, db);

        if (db && db.dbState !== MegaDB.DB_STATE.CLOSED) {
            var u_handle = db.suffix;

            if (typeof db[aFunc] === 'function') {
                var expunge = aFunc === 'drop' || aFunc === 'close';

                try {
                    db[aFunc]()
                        .done(function() {
                            promise.resolve();
                        }).fail(function(e) {
                            if (expunge) {
                                localStorage['fmdblock_' + u_handle] = 0xDEAD;
                            }
                            promise.reject(e);
                        });
                } catch(e) {
                    promise.reject(e);
                }

                if (expunge) {
                    this.state = this.STATE_WAITING;
                    delete this.db;
                    this._reset(null);
                }
            }
            else {
                promise.reject('INVALID');
            }
        }
        else {
            promise.reject('CLOSED');
        }

        return promise;
    },

    reload: function mFileManagerDB_reload() {
        if (this.slave) {
            this.exec('close')
                .always(function() {
                    mFileManagerDB._loadfm();
                });
        }
        else if (this.db) {
            this.db.drop()
                .then(function _dropDone() {
                    if (d) console.log('fmdb dropped');
                    mFileManagerDB._restart();
                }, function _dropFail() {
                    if (d) console.log('fmdb drop failed');
                    mFileManagerDB._loadfm();
                });
            delete this.db;
        } else {
            mFileManagerDB._restart();
        }
    },

    _restart: function mFileManagerDB__restart() {
        delete localStorage['fmdblock_' + u_handle];
        delete localStorage[u_handle + '_maxaction'];
        this.init();
    },

    _loadfm: function mFileManagerDB__loadfm(aDBInstance) {

        // dbToNet holds the time wasted trying to read local DB, and having found we have to query the server.
        mega.loadReport.dbToNet = Date.now() - mega.loadReport.startTime;
        mega.loadReport.stepTimeStamp = Date.now();

        this._setstate(aDBInstance);
        mBroadcaster.sendMessage('mFileManagerDB.done', loadfm) || loadfm();
    },

    _reset: function mFileManagerDB__reset(userHandle) {
        if (mFileManagerDB.addQueueTimer
                || mFileManagerDB.delQueueTimer) {

            localStorage['fmdblock_' + this.userHandle] = 0xBADF;

            if (mFileManagerDB.addQueueTimer) {
                delete mFileManagerDB.addQueue;
                delay.cancel(mFileManagerDB.addQueueTimer);
                delete mFileManagerDB.addQueueTimer;
            }

            if (mFileManagerDB.delQueueTimer) {
                delete mFileManagerDB.delQueue;
                delay.cancel(mFileManagerDB.delQueueTimer);
                delete mFileManagerDB.delQueueTimer;
            }
        }
        if (userHandle !== null) {
            this.userHandle = userHandle;
        }
    },

    _setstate: function mFileManagerDB__setstate(aDBInstance) {
        if (!aDBInstance) {
            this.state = this.STATE_FAILED;
            mDB = undefined;
        }
        else if (!mBroadcaster.crossTab.master) {
            if (d) console.log('existing mDB session, read-only mode.');
            this.state = this.STATE_READONLY;
            mDB = undefined;
        }
        else {
            this.state = this.STATE_READY;
            mDB = aDBInstance;
        }
        mBroadcaster.sendMessage('mFileManagerDB.state', this.state);
    },

    state: 0,
    STATE_WAITING:  0,
    STATE_WORKING:  1,
    STATE_READONLY: 2,
    STATE_READY:    4,
    STATE_FAILED:   8
};

function mDBstart(aSlave) {
    switch(mFileManagerDB.state) {
        case mFileManagerDB.STATE_READONLY:
            if (aSlave) {
                mFileManagerDB.
                    _setstate(mFileManagerDB.db);
            }
            break;
        case mFileManagerDB.STATE_WAITING:
            mFileManagerDB.init();
        case mFileManagerDB.STATE_READY:
        case mFileManagerDB.STATE_WORKING:
            if (!aSlave) {
                if (loadfm.loaded) {
                    loadfm();
                }
                else if (is_fm()) {
                    loadingDialog.show();
                }
            }
            break;
        case mFileManagerDB.STATE_FAILED:
            if (!aSlave) {
                loadfm();
            }
        default:
            if (d) console.log('fmdb state', mFileManagerDB.state);
    }
}

function mDBadd(t, a) {
    if (mFileManagerDB.state !== mFileManagerDB.STATE_WORKING
            && mFileManagerDB.state !== mFileManagerDB.STATE_READY) {
        console.warn('Invalid fmdb state', mFileManagerDB.state);
        localStorage['fmdblock_' + u_handle] = 0xBADF;
        return;
    }

    if (a.p !== 'contacts') {
        delete a.ar;
        delete a.name;
    }

    delete a.i; // comes from 't' APs (indicating an index?)
    delete a.key;
    delete a.seen;

    delete a.presence;
    delete a.presenceMtime;

    mDBdel.dispatchTransactionQueue();

    if (!mFileManagerDB.addQueue) {
        mFileManagerDB.addQueue = {};
    }
    if (!mFileManagerDB.addQueue[t]) {
        mFileManagerDB.addQueue[t] = [];
    }
    mFileManagerDB.addQueue[t].push(a);
    mFileManagerDB.addQueueTimer = delay('mDBadd', mDBadd.dispatchTransactionQueue, 300);
}
mDBadd.dispatchTransactionQueue = function() {
    if (mFileManagerDB.addQueueTimer) {
        for (var t in mFileManagerDB.addQueue) {
            if (mFileManagerDB.addQueue.hasOwnProperty(t)) {
                var q = mFileManagerDB.addQueue[t];
                mFileManagerDB.query('add', t, q);
            }
        }
        delete mFileManagerDB.addQueue;
        delay.cancel(mFileManagerDB.addQueueTimer);
        delete mFileManagerDB.addQueueTimer;
    }
};

function mDBdel(t, id) {
    if (mFileManagerDB.state !== mFileManagerDB.STATE_WORKING
            && mFileManagerDB.state !== mFileManagerDB.STATE_READY) {
        console.warn('Invalid fmdb state', mFileManagerDB.state);
        localStorage['fmdblock_' + u_handle] = 0xBADF;
        return;
    }
    mDBadd.dispatchTransactionQueue();

    if (!mFileManagerDB.delQueue) {
        mFileManagerDB.delQueue = {};
    }
    if (!mFileManagerDB.delQueue[t]) {
        mFileManagerDB.delQueue[t] = [];
    }
    mFileManagerDB.delQueue[t].push(id);
    mFileManagerDB.delQueueTimer = delay('mDBdel', mDBdel.dispatchTransactionQueue, 300);
}
mDBdel.dispatchTransactionQueue = function() {
    if (mFileManagerDB.delQueueTimer) {
        for (var t in mFileManagerDB.delQueue) {
            if (mFileManagerDB.delQueue.hasOwnProperty(t)) {
                var q = mFileManagerDB.delQueue[t];
                mFileManagerDB.query('remove', t, q);
            }
        }
        delete mFileManagerDB.delQueue;
        delay.cancel(mFileManagerDB.delQueueTimer);
        delete mFileManagerDB.delQueueTimer;
    }
};

function mDBreload() {
    loadfm.loaded = false;
    mFileManagerDB.reload();
}

function mDBcls() {
    if (typeof mDB === 'object' && mDB.close) {
        mFileManagerDB.exec('close');
    }
    try {
        mDB = indexedDB ? 0x9e : undefined;
    }
    catch (e) {
        mDB = undefined;
    }
}
