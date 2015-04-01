if (!window.indexedDB) {
    window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
}
if (!window.IDBKeyRange) {
    window.IDBKeyRange = window.webkitIDBKeyRange || window.msIDBKeyRange;
}
if (!window.IDBTransaction) {
    window.IDBTransaction = window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;
}

var mDBact, mDBv = 7;
var mDB = indexedDB ? 0x7f : undefined;

var mFileManagerDB = {
    schema: {
        ok: { key: { keyPath: "h"   }},
        s:  { key: { keyPath: "h_u" }},
        u:  { key: { keyPath: "u"   }},
        f:  { key: { keyPath: "h"   }}
    },
    version: 1,

    init: function mFileManagerDB_init() {
        var db = new MegaDB("fm", u_handle, this.version, this.schema, {plugins: {}});

        if (mBroadcaster.crossTab.master) {
            db.bind('onDbStateReady', function _onDbStateReady() {
                if (d) console.log('onDbStateReady', arguments);

                var oldVersion = +localStorage['fmdbv_' + u_handle] || this.currentVersion;
                localStorage['fmdbv_' + u_handle] = this.currentVersion;

                if (oldVersion < this.currentVersion) {
                    if (d) console.log('db version change');
                    mFileManagerDB.reload();
                }
                else if (+localStorage['fmdblock_' + u_handle]) {
                    if (d) console.log('db is locked');
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

        db.bind('onDbStateFailed', function _onDbStateFailed() {
            if (d) console.error('onDbStateFailed', arguments);
            mFileManagerDB._loadfm();
        });

        this.db = db;
        this.state = this.STATE_WORKING;
    },

    fetch: function mFileManagerDB_fetch(aTables) {
        var t = aTables.shift();
        if (d) console.log('db fetch', t);

        if (t) {
            this.db.query(t)
                .execute()
                .done(function _fetchDone(results) {
                    if (d) console.log('db fetch done', t, results);

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
                        $.mDBIgnoreDB = true;
                        process_f(results, function(hasMissingKeys) {
                            delete $.mDBIgnoreDB;
                            if (hasMissingKeys) {
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
                                M.nodeShare(results[i].h, results[i], 1);
                            }
                        }
                        else {
                            console.error('Unknown table', t);
                        }
                        mFileManagerDB.fetch(aTables);
                    }
                }).fail(function _fetchFail() {
                    if (d) console.log('db fetch failed', t);

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
                console.log('db fetch completed', maxaction, hasEntries);
            }

            if (!maxaction || !hasEntries) {
                if (this.slave) {
                    this._loadfm();
                } else {
                    this.reload();
                }
            }
            else {
                this._setstate(this.db);
                getsc(1);
            }
        }
    },

    query: function mFileManagerDB_query(aCommand, aTable, aData) {
        if (this.schema[aTable]) {
            var l = (+localStorage['fmdblock_' + u_handle] | 0) + 1;
            localStorage['fmdblock_' + u_handle] = l;

            if (d) console.log('db query', aCommand, aTable, aData, l);

            var promise;
            if (aCommand === 'add') {
                promise = this.db.server.update(aTable, aData);
            } else {
                promise = this.db.server.remove(aTable, aData);
            }

            promise.then(function() {
                var l = (+localStorage['fmdblock_' + u_handle] | 0) - 1;
                localStorage['fmdblock_' + u_handle] = l;
                if (d) console.log('db lock', l);
            });
        }
    },

    reload: function mFileManagerDB_reload() {
        if (this.db) {
            this.db.drop()
                .done(function _dropDone() {
                    if (d) console.log('db dropped');
                    mFileManagerDB._restart();
                }).fail(function _dropFail() {
                    if (d) console.log('db drop failed');
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
        this._setstate(aDBInstance);
        loadfm();
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
        if (d) console.log('mFileManagerDB.state', this.state);
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
        case mFileManagerDB.STATE_WORKING:
            if (!aSlave && is_fm()) {
                loadingDialog.show();
            }
            break;
        case mFileManagerDB.STATE_FAILED:
            if (!aSlave) {
                loadfm();
            }
        default:
            if (d) console.log('db state', mFileManagerDB.state);
    }
}

function mDBadd(t, n) {
    var a = n;
    if (a.name && a.p !== 'contacts') {
        delete a.name;
    }
    if (a.ar && a.p !== 'contacts') {
        delete a.ar;
    }
    delete a.key;
    delete a.seen;
    // mFileManagerDB.query('add', t, a);
    if (!mFileManagerDB.addQueue) {
        mFileManagerDB.addQueue = {};
    }
    if (!mFileManagerDB.addQueue[t]) {
        mFileManagerDB.addQueue[t] = [];
    }
    mFileManagerDB.addQueue[t].push(a);
    if (mFileManagerDB.addQueueTimer) {
        clearTimeout(mFileManagerDB.addQueueTimer);
    }
    mFileManagerDB.addQueueTimer = setTimeout(function() {
        for (var t in mFileManagerDB.addQueue) {
            var q = mFileManagerDB.addQueue[t];
            mFileManagerDB.query('add', t, q);
        }
        delete mFileManagerDB.addQueue;
        delete mFileManagerDB.addQueueTimer;
    }, 300);
}

function mDBdel(t, id) {
    mFileManagerDB.query('remove', t, id);
}

function mDBreload() {
    loadfm.loaded = false;
    mFileManagerDB.reload();
}

function mDBcls() {
    if (typeof mDB === 'object' && mDB.close) {
        mDB.close();
    }
    mDB = indexedDB ? 0x9e : undefined;
}
