// FM IndexedDB layer (using Dexie.js - https://github.com/dfahlander/Dexie.js)
// (indexes and payload are obfuscated using AES ECB - FIXME: use CBC for the payload)

// DB name is fm_ + encrypted u_handle (folder links are not cached yet - FIXME)
// init() checks for the presence of a valid _sn record and wipes the DB if none is found
// pending[] is an array of write transactions that will be streamed to the DB
// setting pending[]._sn opens a new transaction, so always set it last

// - small updates run as a physical IndexedDB transaction
// - large updates are written on the fly, but with the _sn cleared, which
//   ensures integrity, but invalidates the DB if the update can't complete

// plainname: the base name that will be obfuscated using u_k
// schema: the Dexie database schema
// channelmap: { tablename : channel } - tables that do not map to channel 0
// (only channel 0 operates under an _sn-triggered transaction regime)
function FMDB(plainname, schema, channelmap) {
    'use strict';

    if (!(this instanceof FMDB)) {
        return new FMDB(plainname, schema, channelmap);
    }

    // DB name suffix, derived from u_handle and u_k
    this.name = false;

    // DB schema - https://github.com/dfahlander/Dexie.js/wiki/TableSchema
    this.schema = schema;

    // the table names contained in the schema (set at open)
    this.tables = null;

    // if we have non-transactional (write-through) tables, they are mapped
    // to channel numbers > 0 here
    this.channelmap = channelmap || {};

    // pending obfuscated writes [channel][tid][tablename][action_autoincrement] = [payloads]
    this.pending = [Object.create(null)];

    // current channel tid being written to (via .add()/.del()) by the application code
    this.head = [0];

    // current channel tid being sent to IndexedDB
    this.tail = [0];

    // -1: idle, 0: deleted sn and writing (or write-through), 1: transaction open and writing
    this.state = -1;

    // flag indicating whether there is a pending write
    this.writing = false;

    // [tid, tablename, action] of .pending[] hash item currently being written
    this.inflight = false;

    // the write is complete and needs be be committed (either because of _sn or write-through)
    this.commit = false;

    // a DB error occurred, do not touch IndexedDB for the rest of the session
    this.crashed = false;

    // DB invalidation process: callback and ready flag
    this.inval_cb = false;
    this.inval_ready = false;

    // whether multi-table transactions work (1) or not (0) (Apple, looking at you!)
    this.cantransact = -1;

    // a flag to know if we have sn set in database. -1 = we don't know, 0 = not set, 1 = is set
    this.sn_Set = -1;

    // @see {@link FMDB.compare}
    this._cache = Object.create(null);

    // initialise additional channels
    for (var i in this.channelmap) {
        i = this.channelmap[i];
        this.head[i] = 0;
        this.tail[i] = 0;
        this.pending[i] = Object.create(null);
    }

    // protect user identity post-logout
    this.name = ab_to_base64(this.strcrypt((plainname + plainname).substr(0, 16)));

    // console logging
    this.logger = MegaLogger.getLogger('FMDB');
    this.logger.options.printDate = false;
    this.logger.options.levelColors = {
        'ERROR': '#fe000b',
        'DEBUG': '#005aff',
        'WARN':  '#d66d00',
        'INFO':  '#2ca100',
        'LOG':   '#5b5352'
    };

    // if (d) Dexie.debug = "dexie";
}

tryCatch(function() {
    'use strict';

    // Check for indexedDB 2.0 + binary keys support.
    Object.defineProperty(FMDB, 'iDBv2', {value: indexedDB.cmp(new Uint8Array(0), 0)});
}, false)();

// options
FMDB.$useBinaryKeys = FMDB.iDBv2 ? 1 : 0;
FMDB.$usePostSerialz = 2;

// @private increase to drop/recreate *all* databases.
FMDB.version = 1;

// @private
Object.defineProperty(FMDB, 'capabilities', {
    value: FMDB.iDBv2 << 4 | (FMDB.$useBinaryKeys | FMDB.$usePostSerialz /* | ... */)
});
// @private persistence prefix
Object.defineProperty(FMDB, 'perspex', {value: '.' + FMDB.version + FMDB.capabilities.toString(32)});

// initialise cross-tab access arbitration identity
FMDB.prototype.identity = Date.now() + Math.random().toString(26);

// set up and check fm DB for user u
// calls result(sn) if found and sn present
// wipes DB an calls result(false) otherwise
FMDB.prototype.init = function fmdb_init(result, wipe) {
    "use strict";

    var fmdb = this;
    var dbpfx = 'fm30_';
    var slave = !mBroadcaster.crossTab.master;

    fmdb.crashed = false;
    fmdb.inval_cb = false;
    fmdb.inval_ready = false;

    // prefix database name with options/capabilities
    dbpfx += FMDB.perspex.substr(1);

    // Make the database name dependent on the current schema.
    dbpfx += MurmurHash3(JSON.stringify(this.schema), 0x6f01f).toString(16);

    // Notify completion invoking the provided callback
    var resolve = function(sn, error) {
        fmdb.opening = false;

        if (typeof result === 'function') {
            if (error) {
                fmdb.crashed = 2;
                fmdb.logger.warn('Marking DB as crashed.', error);

                if (fmdb.db) {
                    onIdle(function() {
                        fmdb.db.delete();
                        fmdb.db = false;
                    });
                }

                eventlog(99724, '$init:' + error, true);
            }

            result(sn);

            // prevent this from being called twice..
            result = null;
        }
    };

    // Catch errors, mark DB as crashed, and move forward without indexedDB support
    var reject = function(e) {
        resolve(false, e || EFAILED);
    };

    // Database opening logic
    var openDataBase = function() {
        // start inter-tab heartbeat
        // fmdb.beacon();
        fmdb.db = new Dexie(dbpfx + fmdb.name);

        // There is some inconsistency in Chrome 58.0.3029.110 that could cause indexedDB OPs to take ages...
        setTimeout(function() {
            // if not resolved already...
            if (result !== null) {
                if (d) {
                    fmdb.logger.warn('Opening the database timed out.');
                }

                reject(ETEMPUNAVAIL);
            }
        }, 15000);

        var dbSchema = {};
        if (!Array.isArray(fmdb.schema)) {
            fmdb.schema = [fmdb.schema];
        }

        for (var i = 0; i < fmdb.schema.length; i++) {
            var schema = fmdb.schema[i];
            for (var k in schema) {
                if (schema.hasOwnProperty(k)) {
                    dbSchema[k] = schema[k];
                }
            }
            fmdb.db.version(i + 1).stores(dbSchema);
        }
        fmdb.tables = Object.keys(dbSchema);

        fmdb.db.open().then(function() {
            if (fmdb.crashed) {
                // Opening timed out.
                return;
            }
            fmdb.get('_sn').always(function(r) {
                if (!wipe && r[0] && r[0].length === 11) {
                    if (d) {
                        fmdb.logger.log("DB sn: " + r[0]);
                    }
                    resolve(r[0]);
                }
                else if (slave || fmdb.crashed) {
                    fmdb.crashed = 2;
                    resolve(false);
                }
                else {
                    if (d) {
                        fmdb.logger.log("No sn found in DB, wiping...");
                    }
                    fmdb.db.delete().then(function() {
                        fmdb.db.open().then(function() {
                            resolve(false);
                        }).catch(reject);
                    }).catch(reject);
                }
            });
        }).catch(Dexie.MissingAPIError, function(e) {
            fmdb.logger.error("IndexedDB unavailable", e);
            reject(e);
        }).catch(reject);
    };
    openDataBase = tryCatch(openDataBase, reject);

    // Enumerate databases and collect those not prefixed with 'dbpfx' (which is the current format)
    var collectDataBaseNames = function() {
        var timer;
        var todrop = [];
        var done = function() {
            clearTimeout(timer);
            fmdb.dropall(todrop, openDataBase);
            done = null;
        };

        if (d) {
            fmdb.logger.log('Collecting database names...');
        }

        Dexie.getDatabaseNames(function(r) {
            if (sessionStorage.fmdbDropALL) {
                todrop = r;
                fmdb.logger.warn('drop all...', r);
                return;
            }
            for (var i = r.length; i--;) {
                // drop only fmX related databases and skip slkv's
                if (r[i][0] !== '$' && r[i].substr(0, dbpfx.length) !== dbpfx
                    && r[i].substr(-FMDB.perspex.length) !== FMDB.perspex) {

                    todrop.push(r[i]);
                }
            }
        }).finally(function() {
            if (d) {
                if (todrop.length) {
                    fmdb.logger.log("Deleting obsolete DBs: " + todrop.join(', '));
                }
                else {
                    fmdb.logger.log('No databases collected...');
                }
            }

            if (done) {
                done();
            }
        });

        timer = setTimeout(function() {
            if (d) {
                fmdb.logger.warn('Dexie.getDatabaseNames timed out...');
            }
            done();
        }, 3000);
    };
    collectDataBaseNames = tryCatch(collectDataBaseNames, openDataBase);

    // Let's start the fun...
    if (!fmdb.up()) {
        resolve(false);
    }
    else if (!fmdb.db) {
        if (fmdb.opening) {
            fmdb.logger.error('Something went wrong... a DB is already opening...');
        }
        else {
            // Collect obsolete databases to remove them, and proceed opening our current database
            collectDataBaseNames();

            fmdb.opening = true;
        }
    }
    else {
        console.error('fmdb.db is already set...');
    }
};

// drop database
FMDB.prototype.drop = function fmdb_drop() {
    var promise = new MegaPromise();

    if (!this.db) {
        promise.resolve();
    }
    else {
        var fmdb = this;

        this.invalidate(function() {

            fmdb.db.delete().then(function() {
                fmdb.logger.debug("IndexedDB deleted...");
            }).catch(function(err) {
                fmdb.logger.error("Unable to delete IndexedDB!", err);
            }).finally(function() {
                promise.resolve();
            });

            this.db = null;
        });
    }

    return promise;
};

// drop random databases
FMDB.prototype.dropall = function fmdb_dropall(dbs, cb) {
    if (!dbs || !dbs.length) {
        cb();
    }
    else {
        var fmdb = this;
        var db = new Dexie(dbs.pop());
        var next = function(ev) {
            next = function() {};
            if (ev && ev.type === 'blocked') {
                fmdb.logger.warn('Cannot delete blocked indexedDB: ' + db.name);
            }
            fmdb.dropall(dbs, cb);
        };

        // If the DB is blocked, Dexie will try to delete it as soon there are no locks on it.
        // However, we'll resolve immediately without waiting for it, since that will happen in
        // an undetermined amount of time which needless to say is an odd UX experience...
        db.on('blocked', next);

        db.delete().then(function() {
            fmdb.logger.log("Deleted IndexedDB " + db.name);
        }).catch(function(err){
            fmdb.logger.error("Unable to delete IndexedDB " + db.name, err);
        }).finally(function() {
            next();
        });
    }
};

// check if data for table is currently being written.
FMDB.prototype.hasPendingWrites = function(table) {
    'use strict';

    if (!table) {
        return this.writing;
    }
    var ch = this.channelmap[table] || 0;
    var ps = this.pending[ch][this.tail[ch]] || false;

    return this.tail[ch] !== this.head[ch] && ps[table];
};

// enqueue a table write - type 0 == addition, type 1 == deletion
// IndexedDB activity is triggered once we have a few thousand of pending rows or the sn
// (writing the sn - which is done last - completes the transaction and starts a new one)
FMDB.prototype.enqueue = function fmdb_enqueue(table, row, type) {
    "use strict";

    var c;
    var fmdb = this;
    var ch = fmdb.channelmap[table] || 0;

    // if needed, create new transaction at index fmdb.head
    if (!(c = fmdb.pending[ch][fmdb.head[ch]])) {
        c = fmdb.pending[ch][fmdb.head[ch]] = Object.create(null);
    }

    // if needed, create new hash of modifications for this table
    // .h = head, .t = tail (last written to the DB)
    if (!c[table]) {
        // even indexes hold additions, odd indexes hold deletions
        c[table] = { t : -1, h : type };
        c = c[table];

        // @todo is deduplicating nodes in Safari still needed?..
        if (table === 'f' && window.safari) {
            c.r = Object.create(null);
        }
    }
    else {
        // (we continue to use the highest index if it is of the requested type
        // unless it is currently in flight)
        // increment .h(head) if needed
        c = c[table];
        if ((c.h ^ type) & 1) c.h++;
    }

    if (!c[c.h]) {
        c[c.h] = [row];
    }
    else if (type || !c.r) {
        c[c.h].push(row);
    }
    else if (c.r[row.h]) {
        c[c.h][c.r[row.h]] = row;
    }
    else {
        c.r[row.h] = c[c.h].push(row) - 1;
    }

    // force a flush when a lot of data is pending or the _sn was updated
    // also, force a flush for non-transactional channels (> 0)
    if (ch || table[0] === '_' || c[c.h].length > 12281) {
        //  the next write goes to a fresh transaction
        if (!ch) {
            fmdb.head[ch]++;
        }
        fmdb.writepending(fmdb.head.length - 1);
    }
};

/**
 * Serialize data before storing it into indexedDB
 * @param {String} table The table this dta belongs to
 * @param {Object} row Object to serialize.
 * @returns {Object} The input data serialized
 */
FMDB.prototype.serialize = function(table, row) {
    'use strict';

    if (row.d) {
        if (this.stripnode[table]) {
            // this node type is stripnode-optimised: temporarily remove redundant elements
            // to create a leaner JSON and save IndexedDB space
            var j = row.d;  // this references the live object!
            var t = this.stripnode[table](j);   // remove overhead
            row.d = JSON.stringify(j);          // store lean result

            // Restore overhead (In Firefox, Object.assign() is ~63% faster than for..in)
            Object.assign(j, t);
        }
        else {
            // otherwise, just stringify it all
            row.d = JSON.stringify(row.d);
        }
    }

    // obfuscate index elements as base64-encoded strings, payload as ArrayBuffer
    for (var i in row) {
        if (i === 'd') {
            row.d = this.strcrypt(row.d);
        }
        else if (table !== 'f' || i !== 't') {
            row[i] = this.toStore(row[i]);
        }
    }

    return row;
};

// FIXME: auto-retry smaller transactions? (need stats about transaction failures)
// ch - channel to operate on
FMDB.prototype.writepending = function fmdb_writepending(ch) {
    "use strict";

    // exit loop if we ran out of pending writes or have crashed
    if (this.inflight || ch < 0 || this.crashed || this.writing) {
        return;
    }

    // signal when we start/finish to save stuff
    if (!ch) {
        if (this.tail[ch] === this.head[ch] - 1) {
            document.documentElement.classList.add('fmdb-working');
        }
        else if (this.tail[ch] === this.head[ch]) {
            document.documentElement.classList.remove('fmdb-working');
        }
    }

    // iterate all channels to find pending writes
    if (!this.pending[ch][this.tail[ch]]) {
        return this.writepending(ch - 1);
    }

    if (this.tail[ch] >= this.head[ch]) {
        return;
    }

    var fmdb = this;

    if (d > 1) {
        fmdb.logger.warn('writepending()', ch, fmdb.state,
            Object(fmdb.pending[0][fmdb.tail[0]])._sn, fmdb.cantransact);
    }

    if (!ch && fmdb.state < 0 && fmdb.cantransact) {

        // if the write job is on channel 0 and already complete (has _sn set),
        // we execute it in a single transaction without first clearing sn
        fmdb.state = 1;
        fmdb.writing = 1;
        fmdb.db.transaction('rw', fmdb.tables, function() {
            if (d) {
                fmdb.logger.info("Transaction started");
                console.time('fmdb-transaction');
            }
            fmdb.commit = false;
            fmdb.cantransact = 1;

            if (fmdb.sn_Set && !fmdb.pending[0][fmdb.tail[0]]._sn && currsn) {
                fmdb.db._sn.clear().then(function() {
                    fmdb.sn_Set = 0;
                    dispatchputs();
                });
            }
            else {
                dispatchputs();
            }
        }).then(function() {
            // transaction completed: delete written data
            delete fmdb.pending[0][fmdb.tail[0]++];

            if (d) {
                fmdb.logger.log("HEAD = " + fmdb.head[0] + " --- Tail = " + fmdb.tail[0]);
            }

            fmdb.state = -1;
            if (d) {
                fmdb.logger.info("Transaction committed");
                console.timeEnd('fmdb-transaction');
            }
            fmdb.writing = 0;
            fmdb.writepending(ch);
        }).catch(function(ex) {
            if (d) {
                console.timeEnd('fmdb-transaction');
            }

            if (fmdb.cantransact < 0) {
                fmdb.logger.error("Your browser's IndexedDB implementation is bogus, disabling transactions.");
                fmdb.cantransact = 0;
                fmdb.writing = 0;
                fmdb.writepending(ch);
            }
            else {
                // FIXME: retry instead? need statistics.
                fmdb.logger.error("Transaction failed, marking DB as crashed", ex);
                fmdb.state = -1;
                fmdb.invalidate();

                eventlog(99724, '$wptr:' + ex, true);
            }
        });
    }
    else {
        if (d) {
            console.error('channel 1 Block ... invoked');
        }
        // we do not inject write-through operations into a live transaction
        if (fmdb.state > 0) {
            dispatchputs();
        }
        else {
            // the job is incomplete or non-transactional - set state to "executing
            // write without transaction"
            fmdb.state = 0;

            if (ch) {
                // non-transactional channel: go ahead and write

                dispatchputs();
            }
            else {
                // mark db as "writing" until the sn cleaning have completed,
                // this flag will be reset on dispatchputs() once fmdb.commit is set
                fmdb.writing = 2;
                // we clear the sn (the new sn will be written as the last action in this write job)
                // unfortunately, the DB will have to be wiped in case anything goes wrong
                var sendOperation = function() {
                    fmdb.commit = false;
                    fmdb.writing = 3;

                    dispatchputs();
                };
                if (currsn) {
                    fmdb.db._sn.clear().then(
                        function() {
                            if (d) {
                                console.error('channel 1 + Sn cleared');
                            }
                            fmdb.sn_Set = 0;
                            sendOperation();
                        }
                    ).catch(function(e) {
                        fmdb.logger.error("SN clearing failed, marking DB as crashed", e);
                        fmdb.state = -1;
                        fmdb.invalidate();

                        eventlog(99724, '$wpsn:' + e, true);
                    });
                }
                else {
                    sendOperation();
                }

            }
        }
    }

    // start writing all pending data in this transaction to the DB
    // conclude/commit the (virtual or real) transaction once _sn has been written
    function dispatchputs() {
        if (fmdb.inflight) return;

        if (fmdb.commit) {
            // invalidation commit completed?
            if (fmdb.inval_ready) {
                if (fmdb.inval_cb) {
                    // fmdb.db.close();
                    fmdb.inval_cb();    // caller must not reuse fmdb object
                }
                return;
            }

            // the transaction is complete: delete from pending
            if (!fmdb.state) {
                // we had been executing without transaction protection, delete the current
                // transaction and try to dispatch the next one immediately
                if (!ch) delete fmdb.pending[0][fmdb.tail[0]++];

                fmdb.commit = false;
                fmdb.state = -1;
                fmdb.writing = false;
                fmdb.writepending(ch);
            }

            // if we had a real IndexedDB transaction open, it will commit
            // as soon as the browser main thread goes idle

            // I wont return, because this is relying on processing _sn table as the last
            // table in the current pending operations..

            // return;
        }

        var tablesremaining = false;

        // this entirely relies on non-numeric hash keys being iterated
        // in the order they were added. FIXME: check if always true
        for (var table in fmdb.pending[ch][fmdb.tail[ch]]) { // iterate through pending tables, _sn last
            var t = fmdb.pending[ch][fmdb.tail[ch]][table];

            // do we have at least one update pending? (could be multiple)
            if (t[t.h]) {
                tablesremaining = true;

                // locate next pending table update (even/odd: put/del)
                while (t.t <= t.h && !t[t.t]) t.t++;

                // all written: advance head
                if (t.t == t.h) t.h++;

                if (fmdb.crashed && !(t.t & 1)) {
                    if (d) {
                        fmdb.logger.warn('The DB is crashed, halting put...');
                    }
                    return;
                }

                if (d) {
                    fmdb.logger.debug("DB %s with %s element(s) on table %s, channel %s, state %s",
                        (t.t & 1) ? 'del' : 'put', t[t.t].length, table, ch, fmdb.state);
                }

                // if we are on a non-transactional channel or the _sn is being updated,
                // request a commit after the operation completes.
                if (ch || table[0] == '_') {
                    fmdb.commit = true;
                    fmdb.sn_Set = 1;
                }

                // record what we are sending...
                fmdb.inflight = t;

                // is this an in-band _sn invalidation, and do we have a callback set? arm it.
                if (fmdb.inval_cb && t.t & 1 && table[0] === '_') {
                    fmdb.inval_ready = true;
                }

                // ...and send update off to IndexedDB for writing
                write(table, t[t.t], t.t++ & 1 ? 'bulkDelete' : 'bulkPut');

                // we don't send more than one transaction (looking at you, Microsoft!)
                return;
            }
            else {
                // if we are non-transactional and all data has been written for this
                // table, we can safely delete its record
                if (!fmdb.state && t.t == t.h) {
                    delete fmdb.pending[ch][fmdb.tail[ch]][table];
                }
            }
        }

        // if we are non-transactional, this deletes the "transaction" when done
        // (as commit will never be set)
        if (!fmdb.state && !tablesremaining) {
            delete fmdb.pending[ch][fmdb.tail[ch]];

            fmdb.writing = null;
            fmdb.writepending(fmdb.head.length - 1);
        }
    }

    // bulk write operation
    function write(table, data, op) {
        var limit = window.fminitialized ? 1536 : data.length;

        if (FMDB.$usePostSerialz) {
            if (d) {
                console.time('fmdb-serialize');
            }

            if (op === 'bulkPut') {
                for (var x = data.length; x--;) {
                    fmdb.serialize(table, data[x]);
                }
            }
            else {
                for (var j = data.length; j--;) {
                    data[j] = fmdb.toStore(data[j]);
                }
            }

            if (d) {
                console.timeEnd('fmdb-serialize');
            }
        }

        if (data.length < limit) {
            fmdb.db[table][op](data).then(writeend).catch(writeerror);
            return;
        }

        var idx = 0;
        (function bulkTick() {
            var rows = data.slice(idx, idx += limit);

            if (rows.length) {
                if (d > 1) {
                    var left = idx > data.length ? 0 : data.length - idx;
                    fmdb.logger.log('%s for %d rows, %d remaining...', op, rows.length, left);
                }
                fmdb.db[table][op](rows).then(bulkTick).catch(writeerror);
            }
            else {
                data = undefined;
                writeend();
            }
        })();
    }

    // event handler for bulk operation completion
    function writeend() {
        if (d) {
            fmdb.logger.log('DB write successful'
                + (fmdb.commit ? ' - transaction complete' : '') + ', state: ' + fmdb.state);
        }

        // if we are non-transactional, remove the written data from pending
        // (we have to keep it for the transactional case because it needs to
        // be visible to the pending updates search that getbykey() performs)
        if (!fmdb.state) {
            delete fmdb.inflight[fmdb.inflight.t - 1];
            fmdb.inflight = false;

            // in non-transactional loop back when the browser is idle so that we'll
            // prevent unnecessarily hanging the main thread and short writes...
            if (!fmdb.commit) {
                if (loadfm.loaded) {
                    onIdle(dispatchputs);
                }
                else {
                    setTimeout(dispatchputs, 2600);
                }
                return;
            }
        }

        // loop back to write more pending data (or to commit the transaction)
        fmdb.inflight = false;
        dispatchputs();
    }

    // event handler for bulk operation error
    function writeerror(ex) {
        if (ex instanceof Dexie.BulkError) {
            fmdb.logger.error('Bulk operation error, %s records failed.', ex.failures.length, ex);
        }
        else {
            fmdb.logger.error('Unexpected error in bulk operation...', ex);
        }

        fmdb.state = -1;
        fmdb.inflight = false;

        // If there is an invalidation request pending, dispatch it.
        if (fmdb.inval_cb) {
            console.assert(fmdb.crashed, 'Invalid state, the DB must be crashed already...');
            fmdb.inval_cb();
        }
        else {
            fmdb.invalidate();
        }

        if (d) {
            fmdb.logger.warn('Marked DB as crashed...', ex.name);
        }

        eventlog(99724, String(ex), true);
    }
};

/**
 * Encrypt Unicode string with user's master key
 * @param {String} s The unicode string
 * @returns {ArrayBuffer} encrypted buffer
 * @todo use CBC instead of ECB!
 */
FMDB.prototype.strcrypt = function fmdb_strcrypt(s) {
    "use strict";

    if (d && String(s).length > 0x10000) {
        (this.logger || console)
            .warn('The data you are trying to write is too large and will degrade the performance...', [s]);
    }

    var len = (s = '' + s).length;
    var bytes = this.utf8length(s);
    if (bytes === len) {
        var a32 = new Int32Array(len + 3 >> 2);
        for (var i = len; i--;) {
            a32[i >> 2] |= s.charCodeAt(i) << 8 * (i & 3);
        }
        return this._crypt(u_k_aes, a32);
    }

    return this._crypt(u_k_aes, this.to8(s, bytes));
};

/**
 * Decrypt buffer with user's master key
 * @param {ArrayBuffer} buffer Encrypted buffer
 * @returns {String} unicode string
 * @see {@link FMDB.strcrypt}
 */
FMDB.prototype.strdecrypt = function fmdb_strdecrypt(buffer) {
    "use strict";

    if (buffer.byteLength) {
        var s = this.from8(this._decrypt(u_k_aes, buffer));
        for (var i = s.length; i--;) {
            if (s.charCodeAt(i)) {
                return s.substr(0, i + 1);
            }
        }
    }
    return '';
};

// @private legacy version
FMDB.prototype.strcrypt0 = function fmdb_strcrypt(s) {
    "use strict";

    if (d && String(s).length > 0x10000) {
        console.warn('The data you are trying to write is too huge and will degrade the performance...');
    }

    var a32 = str_to_a32(to8(s));
    for (var i = (-a32.length) & 3; i--; ) a32.push(0);
    return a32_to_ab(encrypt_key(u_k_aes, a32)).buffer;
};

// @private legacy version
FMDB.prototype.strdecrypt0 = function fmdb_strdecrypt(ab) {
    "use strict";

    if (!ab.byteLength) return '';
    var a32 = [];
    var dv = new DataView(ab);
    for (var i = ab.byteLength/4; i--; ) a32[i] = dv.getUint32(i*4);
    var s = from8(a32_to_str(decrypt_key(u_k_aes, a32)));
    for (var i = s.length; i--; ) if (s.charCodeAt(i)) return s.substr(0, i+1);
};


// TODO: @lp/@diego we need to move this to some other place...
FMDB._mcfCache = {};

// remove fields that are duplicated in or can be inferred from the index to reduce database size
FMDB.prototype.stripnode = Object.freeze({
    f : function(f) {
        'use strict';
        var t = { h : f.h, t : f.t, s : f.s };

        // Remove pollution from the ufs-size-cache
        // 1. non-folder nodes does not need tb/td/tf
        if (!f.t) {
            delete f.tb;
            delete f.td;
            delete f.tf;
        }
        // 2. remove Zero properties from versioning nodes inserted everywhere...
        if (f.tvb === 0) delete f.tvb;
        if (f.tvf === 0) delete f.tvf;

        // Remove properties used as indexes
        delete f.h;
        delete f.t;
        delete f.s;

        t.ts = f.ts;
        delete f.ts;

        if (f.hash) {
            t.hash = f.hash;
            delete f.hash;
        }

        // Remove other garbage
        if (f.seen) {
            t.seen = f.seen;
            delete f.seen; // inserted by the dynlist
        }

        if (f.shares) {
            t.shares = f.shares;
            delete f.shares; // will be populated from the s table
        }

        if (f.fav !== undefined && !(f.fav | 0)) {
            delete f.fav;
        }
        if (f.lbl !== undefined && !(f.lbl | 0)) {
            delete f.lbl;
        }

        if (f.p) {
            t.p = f.p;
            delete f.p;
        }

        if (f.ar) {
            t.ar = f.ar;
            delete f.ar;
        }

        if (f.u === u_handle) {
            t.u = f.u;
            f.u = '~';
        }

        return t;
    },

    tree: function(f) {
        'use strict';
        var t = {h: f.h};
        delete f.h;
        if (f.td !== undefined && !f.td) {
            delete f.td;
        }
        if (f.tb !== undefined && !f.tb) {
            delete f.tb;
        }
        if (f.tf !== undefined && !f.tf) {
            delete f.tf;
        }
        if (f.tvf !== undefined && !f.tvf) {
            delete f.tvf;
        }
        if (f.tvb !== undefined && !f.tvb) {
            delete f.tvb;
        }
        if (f.lbl !== undefined && !(f.lbl | 0)) {
            delete f.lbl;
        }
        return t;
    },

    ua: function(ua) {
        'use strict';
        delete ua.k;
    },

    u: function(usr) {
        'use strict';
        delete usr.u;
        delete usr.ats;
        delete usr.name;
        delete usr.avatar;
        delete usr.presence;
        delete usr.lastName;
        delete usr.firstName;
        delete usr.shortName;
        delete usr.presenceMtime;
    },

    mcf: function(mcf) {
        'use strict';
        // mcf may contain 'undefined' values, which should NOT be set, otherwise they may replace the mcfCache
        var cache = {};
        var keys = ['id', 'cs', 'g', 'u', 'ts', 'ct', 'ck', 'f', 'm'];
        for (var idx = keys.length; idx--;) {
            var k = keys[idx];

            if (mcf[k] !== undefined) {
                cache[k] = mcf[k];
            }
        }
        FMDB._mcfCache[cache.id] = Object.assign({}, FMDB._mcfCache[mcf.id], cache);
        Object.assign(mcf, FMDB._mcfCache[cache.id]);

        var t = {id: mcf.id, ou: mcf.ou, n: mcf.n, url: mcf.url};
        delete mcf.id;
        delete mcf.ou;
        delete mcf.url;
        delete mcf.n;

        if (mcf.g === 0) {
            t.g = 0;
            delete mcf.g;
        }
        if (mcf.m === 0) {
            t.m = 0;
            delete mcf.m;
        }
        if (mcf.f === 0) {
            t.f = 0;
            delete mcf.f;
        }
        if (mcf.cs === 0) {
            t.cs = 0;
            delete mcf.cs;
        }

        if (mcf.u) {
            t.u = mcf.u;
            mcf.u = '';

            for (var i = t.u.length; i--;) {
                mcf.u += t.u[i].u + t.u[i].p;
            }
        }

        return t;
    }
});

// re-add previously removed index fields to the payload object
FMDB.prototype.restorenode = Object.freeze({
    ok : function(ok, index) {
        'use strict';
        ok.h = index.h;
    },

    f : function(f, index) {
        'use strict';
        f.h = index.h;
        f.p = index.p;
        f.ts = index.t < 0 ? 1262304e3 - index.t : index.t;
        if (index.c) {
            f.hash = index.c;
        }
        if (index.s < 0) f.t = -index.s;
        else {
            f.t = 0;
            f.s = parseFloat(index.s);
        }
        if (!f.ar && f.k && typeof f.k == 'object') {
            f.ar = Object.create(null);
        }
        if (f.u === '~') {
            f.u = u_handle;
        }
    },
    tree : function(f, index) {
        'use strict';
        f.h = index.h;
    },

    ph : function(ph, index) {
        'use strict';
        ph.h = index.h;
    },

    ua : function(ua, index) {
        'use strict';
        ua.k = index.k;
    },

    u: function(usr, index) {
        'use strict';
        usr.u = index.u;
    },

    h: function(out, index) {
        'use strict';
        out.h = index.h;
        out.hash = index.c;
    },

    mk : function(mk, index) {
        'use strict';
        mk.h = index.h;
    },

    mcf: function(mcf, index) {
        'use strict';
        mcf.id = index.id;

        mcf.m = mcf.m || 0;
        mcf.g = mcf.g || 0;
        mcf.f = mcf.f || 0;
        mcf.cs = mcf.cs || 0;

        if (typeof mcf.u === 'string') {
            var users = [];
            for (var i = 0; i < mcf.u.length; i += 12) {
                users.push({
                    p: mcf.u[11 + i] | 0,
                    u: mcf.u.substr(i, 11)
                });
            }
            mcf.u = users;
        }

        FMDB._mcfCache[mcf.id] = mcf;
    }
});

// enqueue IndexedDB puts
// sn must be added last and effectively (mostly actually) "commits" the "transaction"
// the next addition will then start a new "transaction"
// (large writes will not execute as an IndexedDB transaction because IndexedDB can't)
FMDB.prototype.add = function fmdb_add(table, row) {
    "use strict";

    if (this.crashed) return;

    this.enqueue(table, row, 0);
};

// enqueue IndexedDB deletions
FMDB.prototype.del = function fmdb_del(table, index) {
    "use strict";

    if (this.crashed) return;

    this.enqueue(table, index, 1);
};

// non-transactional read with subsequent deobfuscation, with optional prefix filter
// (must NOT be used for dirty reads - use getbykey() instead)
FMDB.prototype.get = function fmdb_get(table, chunked) {
    "use strict";
    var self = this;
    return new Promise(function(resolve, reject) {
        if (self.crashed > 1) {
            // a read operation failed previously
            return resolve([]);
        }

        if (d) {
            self.logger.log("Fetching entire table %s...", table, chunked ? '(chunked)' : '');
        }

        if (chunked) {
            var limit = 8192;
            var keyPath = self.db[table].schema.primKey.keyPath;

            self.db[table].orderBy(keyPath)
                .limit(limit)
                .toArray()
                .then(function _(r) {
                    if (r.length) {
                        var last = r[r.length - 1][keyPath].slice(0);

                        self.normaliseresult(table, r);
                        last = chunked(r, last) || last;

                        if (r.length >= limit) {
                            self.db[table].where(keyPath).above(last).limit(limit).toArray().then(_).catch(reject);
                            return;
                        }
                    }
                    resolve();
                })
                .catch(reject);
            return;
        }

        self.db[table].toArray()
            .then(function(r) {
                self.normaliseresult(table, r);
                resolve(r);
            })
            .catch(function(ex) {
                if (d && !self.crashed) {
                    self.logger.error("Read operation failed, marking DB as read-crashed", ex);
                }
                self.invalidate(function() {
                    resolve([]);
                }, 1);
            });
    });
};

FMDB.prototype.normaliseresult = function fmdb_normaliseresult(table, r) {
    "use strict";

    var t;
    for (var i = r.length; i--; ) {
        try {
            if (!r[i]) {
                // non-existing bulkGet result.
                r.splice(i, 1);
                continue;
            }

            if (this._raw(r[i])) {
                // not encrypted.
                if (d) {
                    console.assert(FMDB.$usePostSerialz);
                }
                r[i] = r[i].d;
                continue;
            }

            t = r[i].d ? JSON.parse(this.strdecrypt(r[i].d)) : {};

            if (this.restorenode[table]) {
                // restore attributes based on the table's indexes
                for (var p in r[i]) {
                    if (p !== 'd' && (table !== 'f' || p !== 't')) {
                        r[i][p] = this.fromStore(r[i][p]);
                    }
                }
                this.restorenode[table](t, r[i]);
            }

            r[i] = t;
        }
        catch (ex) {
            if (d) {
                this.logger.error("IndexedDB corruption: " + this.strdecrypt(r[i].d), ex);
            }
            r.splice(i, 1);
        }
    }
};

// non-transactional read with subsequent deobfuscation, with optional key filter
// (dirty reads are supported by scanning the pending writes after the IndexedDB read completes)
// anyof and where are mutually exclusive, FIXME: add post-anyof where filtering?
// eslint-disable-next-line complexity
FMDB.prototype.getbykey = promisify(function fmdb_getbykey(resolve, reject, table, index, anyof, where, limit) {
    'use strict';
    var bulk = false;
    var options = false;
    if (typeof index !== 'string') {
        options = index;
        index = options.index;
        anyof = anyof || options.anyof;
        where = where || options.where;
        limit = limit || options.limit;
    }

    if (this.crashed > 1 || anyof && !anyof[1].length) {
        return onIdle(reject.bind(null, []));
    }

    var fmdb = this;
    var ch = fmdb.channelmap[table] || 0;

    if (d) {
        fmdb.logger.log("Fetching table %s...", table, options || where);
    }

    var t = fmdb.db[table];
    var i = 0;

    if (!index) {
        // No index provided, fallback to primary key
        index = t.schema.primKey.keyPath;
    }

    if (anyof) {
        // encrypt all values in the list
        for (i = anyof[1].length; i--;) {
            anyof[1][i] = this.toStore(anyof[1][i]);
        }

        if (anyof[1].length > 1) {
            if (!limit && anyof[0] === t.schema.primKey.keyPath) {
                bulk = true;
                t = t.bulkGet(anyof[1]);
            }
            else {
                // TODO: benchmark/replace .anyOf() by Promise.all() + .equals()
                t = t.where(anyof[0]).anyOf(anyof[1]);
            }
        }
        else {
            t = t.where(anyof[0]).equals(anyof[1][0]);
        }
    }
    else if (options.query) {
        // Perform custom user-provided query
        t = options.query(t);
    }
    else if (where) {
        for (var k = where.length; k--;) {
            // encrypt the filter values (logical AND is commutative, so we can reverse the order)
            if (typeof where[k][1] === 'string') {
                if (!this._cache[where[k][1]]) {
                    this._cache[where[k][1]] = this.toStore(where[k][1]);
                }
                where[k][1] = this._cache[where[k][1]];
            }

            // apply filter criterion
            if (i) {
                t = t.and(where[k][0]);
            }
            else {
                t = t.where(where[k][0]);
                i = 1;
            }

            t = t.equals(where[k][1]);
        }
    }

    if (options.offset) {
        t = t.offset(options.offset);
    }

    if (limit) {
        t = t.limit(limit);
    }
    t = options.sortBy ? t.sortBy(options.sortBy) : t.toArray ? t.toArray() : t;

    t.then(function(r) {
        // now scan the pending elements to capture and return unwritten updates
        // FIXME: typically, there are very few or no pending elements -
        // determine if we can reduce overall CPU load by replacing the
        // occasional scan with a constantly maintained hash for direct lookups?
        var j;
        var f;
        var k;
        var match = false;
        var matches = Object.create(null);
        var pendingch = fmdb.pending[ch];
        var tids = Object.keys(pendingch);
        var dbRecords = r.length;

        if (bulk) {
            for (i = r.length; i--;) {
                if (!r[i]) {
                    // non-existing bulkGet result.
                    r.splice(i, 1);
                }
            }
        }

        // iterate transactions in reverse chronological order
        for (var ti = tids.length; ti--;) {
            var tid = tids[ti];
            t = pendingch[tid][table];

            // any updates pending for this table?
            if (t && (t[t.h] && t[t.h].length || t[t.h - 1] && t[t.h - 1].length)) {
                // debugger
                // examine update actions in reverse chronological order
                // FIXME: can stop the loop at t.t for non-transactional writes
                for (var a = t.h; a >= 0; a--) {
                    /* eslint-disable max-depth */
                    if (t[a]) {
                        if (a & 1) {
                            // deletion - always by bare index
                            var deletions = t[a];

                            for (j = deletions.length; j--;) {
                                f = fmdb._value(deletions[j]);

                                if (typeof matches[f] == 'undefined') {
                                    // boolean false means "record deleted"
                                    if (dbRecords) {
                                        // no need to record a deletion unless we got db entries
                                        matches[f] = false;
                                        match = true;
                                    }
                                }
                            }
                        }
                        else {
                            // addition or update - index field is attribute
                            var updates = t[a];

                            // iterate updates in reverse chronological order
                            // (updates are not commutative)
                            for (j = updates.length; j--;) {
                                var update = updates[j];

                                f = fmdb._value(update[index]);
                                if (typeof matches[f] == 'undefined') {
                                    // check if this update matches our criteria, if any
                                    if (where) {
                                        for (k = where.length; k--;) {
                                            if (!fmdb.compare(table, where[k][0], where[k][1], update)) {
                                                break;
                                            }
                                        }

                                        // mismatch detected - record it as a deletion
                                        if (k >= 0) {
                                            // no need to record a deletion unless we got db entries
                                            if (dbRecords) {
                                                match = true;
                                                matches[f] = false;
                                            }
                                            continue;
                                        }
                                    }
                                    else if (options.query) {
                                        // If a custom query was made, notify there was a
                                        // pending update and whether if should be included.
                                        if (!(options.include && options.include(update, index))) {
                                            // nope - record it as a deletion
                                            matches[f] = false;
                                            match = true;
                                            continue;
                                        }
                                    }
                                    else if (anyof) {
                                        // does this update modify a record matched by the anyof inclusion list?
                                        for (k = anyof[1].length; k--;) {
                                            if (fmdb.compare(table, anyof[0], anyof[1][k], update)) {
                                                break;
                                            }
                                        }

                                        // no match detected - record it as a deletion
                                        if (k < 0) {
                                            // no need to record a deletion unless we got db entries
                                            if (dbRecords) {
                                                match = true;
                                                matches[f] = false;
                                            }
                                            continue;
                                        }
                                    }

                                    match = true;
                                    matches[f] = update;
                                }
                            }
                        }
                    }
                }
            }
        }

        // scan the result for updates/deletions/additions arising out of the matches found
        if (match) {
            if (d) {
                fmdb.logger.debug('pending matches', $.len(matches));
            }

            for (i = r.length; i--;) {
                // if this is a binary key, convert it to string
                f = fmdb._value(r[i][index]);

                if (typeof matches[f] !== 'undefined') {
                    if (matches[f] === false) {
                        // a returned record was deleted or overwritten with
                        // keys that fall outside our where clause
                        r.splice(i, 1);
                    }
                    else {
                        // a returned record was overwritten and still matches
                        // our where clause
                        r[i] = fmdb.clone(matches[f]);
                        delete matches[f];
                    }
                }
            }

            // now add newly written records
            for (t in matches) {
                if (matches[t]) {
                    r.push(fmdb.clone(matches[t]));
                }
            }
        }

        // filter out matching records
        if (where) {
            for (i = r.length; i--;) {
                for (k = where.length; k--;) {
                    if (!fmdb.compare(table, where[k][0], where[k][1], r[i])) {
                        r.splice(i, 1);
                        break;
                    }
                }
            }

            if ($.len(fmdb._cache) > 200) {
                fmdb._cache = Object.create(null);
            }
        }

        // Apply user-provided filtering, if any
        if (options.filter) {
            r = options.filter(r);
        }

        if (r.length) {
            fmdb.normaliseresult(table, r);
        }
        resolve(r);
    }).catch(function(ex) {
        if (d && !fmdb.crashed) {
            fmdb.logger.error("Read operation failed, marking DB as read-crashed", ex);
        }
        fmdb.invalidate(function() {
            reject([]);
        }, 1);
    });
});

// invokes getbykey in chunked mode
FMDB.prototype.getchunk = promisify(function(resolve, reject, table, options, onchunk) {
    'use strict';
    var self = this;

    if (typeof options === 'function') {
        onchunk = options;
        options = Object.create(null);
    }
    options.limit = options.limit || 1e4;

    var mng = options.offset === undefined;
    if (mng) {
        options.offset = -options.limit;
    }

    (function _next() {
        if (mng) {
            options.offset += options.limit;
        }
        self.getbykey(table, options)
            .always(function(r) {
                var limit = options.limit;

                if (onchunk(r) === false) {
                    return resolve(EAGAIN);
                }
                return r.length >= limit ? _next() : resolve();
            });
    })();
});

// simple/fast/non-recursive object cloning
FMDB.prototype.clone = function fmdb_clone(o) {
    'use strict';

    // In Firefox, Object.assign() is ~63% faster than for..in, ~21% in Chrome
    return Object.assign({}, o);
};

/**
 * Encrypt 32-bit words using AES ECB...
 * @param {sjcl.cipher.aes} cipher AES cipher
 * @param {TypedArray} input data
 * @returns {ArrayBuffer} encrypted data
 * @private
 */
FMDB.prototype._crypt = function(cipher, input) {
    'use strict';
    var a32 = new Int32Array(input.buffer);
    var i32 = new Int32Array(a32.length + 3 & ~3);
    for (var i = 0; i < a32.length; i += 4) {
        var u = cipher.encrypt([a32[i], a32[i + 1], a32[i + 2], a32[i + 3]]);
        i32[i] = u[0];
        i32[i + 1] = u[1];
        i32[i + 2] = u[2];
        i32[i + 3] = u[3];
    }
    return i32.buffer;
};

/**
 * Decrypt 32-bit words using AES ECB...
 * @param {sjcl.cipher.aes} cipher AES cipher
 * @param {ArrayBuffer} buffer Encrypted data
 * @returns {ArrayBuffer} decrypted data
 * @private
 */
FMDB.prototype._decrypt = function(cipher, buffer) {
    'use strict';
    var u32 = new Uint32Array(buffer);
    for (var i = 0; i < u32.length; i += 4) {
        var u = cipher.decrypt([u32[i], u32[i + 1], u32[i + 2], u32[i + 3]]);
        u32[i + 3] = u[3];
        u32[i + 2] = u[2];
        u32[i + 1] = u[1];
        u32[i] = u[0];
    }
    return u32.buffer;
};

/**
 * Converts UTF-8 string to Unicode
 * @param {ArrayBuffer} buffer Input buffer
 * @returns {String} Unicode string.
 */
FMDB.prototype.from8 = function(buffer) {
    'use strict';

    var idx = 0;
    var str = '';
    var ptr = new Uint8Array(buffer);
    var len = ptr.byteLength;
    while (len > idx) {
        var b = ptr[idx++];
        if (!b) {
            return str;
        }
        if (!(b & 0x80)) {
            str += String.fromCharCode(b);
            continue;
        }

        var l = ptr[idx++] & 63;
        if ((b & 0xE0) === 0xC0) {
            str += String.fromCharCode((b & 31) << 6 | l);
            continue;
        }

        var h = ptr[idx++] & 63;
        if ((b & 0xF0) === 0xE0) {
            b = (b & 15) << 12 | l << 6 | h;
        }
        else {
            b = (b & 7) << 18 | l << 12 | h << 6 | ptr[idx++] & 63;
        }

        if (b < 0x10000) {
            str += String.fromCharCode(b);
        }
        else {
            var ch = b - 0x10000;
            str += String.fromCharCode(0xD800 | ch >> 10, 0xDC00 | ch & 0x3FF);
        }
    }

    return str;
};

/**
 * Converts Unicode string to UTF-8
 * @param {String} str Input string
 * @param {Number} [len] bytes to allocate
 * @returns {Uint8Array} utf-8 bytes
 */
FMDB.prototype.to8 = function(str, len) {
    'use strict';
    var p = 0;
    var u8 = new Uint8Array((len || this.utf8length(str)) + 3 & ~3);

    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u > 55295 && u < 57344) {
            u = 0x10000 + ((u & 0x3FF) << 10) | str.charCodeAt(++i) & 0x3FF;
        }
        if (u < 128) {
            u8[p++] = u;
        }
        else if (u < 2048) {
            u8[p++] = 0xC0 | u >> 6;
            u8[p++] = 0x80 | u & 63;
        }
        else if (u < 65536) {
            u8[p++] = 0xE0 | u >> 12;
            u8[p++] = 0x80 | u >> 6 & 63;
            u8[p++] = 0x80 | u & 63;
        }
        else {
            u8[p++] = 0xF0 | u >> 18;
            u8[p++] = 0x80 | u >> 12 & 63;
            u8[p++] = 0x80 | u >> 6 & 63;
            u8[p++] = 0x80 | u & 63;
        }
    }
    return u8;
};

/**
 * Calculate the length required for Unicode to UTF-8 conversion
 * @param {String} str Input string.
 * @returns {Number} The length
 */
FMDB.prototype.utf8length = function(str) {
    'use strict';

    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u > 55295 && u < 57344) {
            u = 0x10000 + ((u & 0x3FF) << 10) | str.charCodeAt(++i) & 0x3FF;
        }
        if (u < 128) {
            ++len;
        }
        else if (u < 2048) {
            len += 2;
        }
        else if (u < 65536) {
            len += 3;
        }
        else {
            len += 4;
        }
    }
    return len;
};

/**
 * Check for needle into haystack
 * @param {Array} haystack haystack
 * @param {String|ArrayBuffer} needle needle
 * @returns {Boolean} whether is found.
 */
FMDB.prototype.exists = function(haystack, needle) {
    'use strict';
    for (var i = haystack.length; i--;) {
        if (this.equal(haystack[i], needle)) {
            return true;
        }
    }
    return false;
};

/**
 * Check whether two indexedDB-stored values are equal.
 * @param {ArrayBuffer|String} a1 first item to compare
 * @param {ArrayBuffer|String} a2 second item to compere
 * @returns {Boolean} true if both are deep equal
 */
FMDB.prototype.equal = function(a1, a2) {
    'use strict';
    return !indexedDB.cmp(a1, a2);
};

// See {@link FMDB.equal}
FMDB.prototype.equals = function(a1, a2) {
    'use strict';
    return a1 === a2;
};

/**
 * Validate store-ready entry
 * @param {Object} entry An object
 * @returns {Boolean} whether it is..
 * @private
 */
FMDB.prototype._raw = function(entry) {
    'use strict';
    return entry.d && entry.d.byteLength === undefined;
};

/**
 * Get raw value for encrypted record.
 * @param {String|ArrayBuffer} value Input
 * @returns {String} raw value
 * @private
 */
FMDB.prototype._value = function(value) {
    'use strict';

    if (value instanceof ArrayBuffer) {
        value = this.fromStore(value.slice(0));
    }

    return value;
};

/**
 * store-agnostic value comparison.
 * @param {String} table The DB table
 * @param {String} key The row index.
 * @param {String|ArrayBuffer} value item to compare (always encrypted)
 * @param {Object} store Store containing key. (*may* not be encrypted)
 * @returns {Boolean} true if both are deep equal
 */
FMDB.prototype.compare = function(table, key, value, store) {
    'use strict';
    var eq = store[key];

    if (!this._raw(store)) {
        // It's also encrypted
        if (d) {
            console.assert(typeof value === typeof eq);
        }
        return this.equal(value, eq);
    }

    if (!this._cache[eq]) {
        this._cache[eq] = this.toStore(eq);
    }
    return this.equal(value, this._cache[eq]);
};

/**
 * indexedDB data serialization.
 * @param {String} data Input string
 * @returns {*|String} serialized data (as base64, unless we have binary keys support)
 */
FMDB.prototype.toStore = function(data) {
    'use strict';
    return ab_to_base64(this.strcrypt(data));
};

/**
 * indexedDB data de-serialization.
 * @param {TypedArray|ArrayBuffer|String} data Input data
 * @returns {*} de-serialized data.
 */
FMDB.prototype.fromStore = function(data) {
    'use strict';
    return this.strdecrypt(base64_to_ab(data));
};

// convert to encrypted-base64
FMDB.prototype.toB64 = FMDB.prototype.toStore;
// convert from encrypted-base64
FMDB.prototype.fromB64 = FMDB.prototype.fromStore;

if (FMDB.$useBinaryKeys) {
    FMDB.prototype.toStore = FMDB.prototype.strcrypt;
    FMDB.prototype.fromStore = FMDB.prototype.strdecrypt;
}
else {
    FMDB.prototype.equal = FMDB.prototype.equals;

    if (!FMDB.$usePostSerialz) {
        FMDB.prototype.compare = FMDB.prototype.equal;
        console.warn('Fix FMDB._value()....');
    }
}

if (!FMDB.$usePostSerialz) {
    FMDB.prototype.add = function fmdb_adds(table, row) {
        'use strict';
        if (!this.crashed) {
            this.enqueue(table, this.serialize(table, row), 0);
        }
    };
    FMDB.prototype.del = function fmdb_dels(table, index) {
        "use strict";
        if (!this.crashed) {
            this.enqueue(table, this.toStore(index), 1);
        }
    };
}

// @private
FMDB.prototype._bench = function(v, m) {
    'use strict';
    var i;
    var a = Array(1e6);
    var s =
        '\u0073\u0061\u006d\u0070\u006c\u0065\u0020\u0074\u0072\u0061\u006e\u0073\u006c\u0061' +
        '\u0074\u0065\u003a\u0020\u5c11\u91cf\u002c\u0020\u6837\u54c1\u002c\u0020\uff08\u533b' +
        '\u751f\u6216\u79d1\u5b66\u5bb6\u68c0\u6d4b\u7528\u7684\uff09\u6837\u672c\uff0c\u8bd5';

    s = typeof v === 'string' ? v : v && JSON.stringify(v) || s;

    var enc = 'strcrypt' + (m === undefined ? '' : m);
    var dec = 'strdecrypt' + (m === undefined ? '' : m);

    onIdle(function() {
        console.time(enc);
        for (i = a.length; i--;) {
            a[i] = fmdb[enc](s);
        }
        console.timeEnd(enc);
    });

    onIdle(function() {
        console.time(dec);
        for (i = a.length; i--;) {
            fmdb[dec](a[i]);
        }
        console.timeEnd(dec);
    });

    onIdle(function() {
        console.assert(m !== undefined || fmdb.from8(a[1]).split('\0')[0] === s);
        console.groupEnd();
    });
    console.group('please wait...');
};


// reliably invalidate the current database (delete the sn)
FMDB.prototype.invalidate = function fmdb_invalidate(cb, readop) {
    cb = cb || this.logger.debug.bind(this.logger, 'DB Invalidation', !this.crashed);

    if (this.crashed) {
        return cb();
    }

    var channels = Object.keys(this.pending);

    // erase all pending data
    for (var i = channels.length; i--; ) {
        this.head[i] = 0;
        this.tail[i] = 0;
        this.pending[i] = Object.create(null);
    }

    // clear the writing flag for the next del() call to pass through
    this.writing = null;

    // enqueue the final _sn deletion that will mark the DB as invalid
    this.del('_sn', 1);

    // prevent further reads or writes
    this.crashed = readop ? 2 : 1;

    // set completion callback
    this.inval_cb = function() {
        // XXX: Just invalidating the DB may causes a timeout trying to open it on the next page load, since we
        // do attempt to delete it when no sn is found, which would take a while to complete for large accounts.
        // This is currently the 20% of hits we do receive through 99724 so from now on we will hold the current
        // session until the DB has been deleted.
        if (readop || !this.db) {
            onIdle(cb);
        }
        else {
            this.db.delete().then(cb).catch(cb);
        }
        document.documentElement.classList.remove('fmdb-working');
    };

    // force a non-treecache on the next load
    // localStorage.force = 1;
};

// checks if crashed or being used by another tab concurrently
FMDB.prototype.up = function fmdb_up() {
    return !this.crashed;
    /*
    if (this.crashed) return false;

    var state = localStorage[this.name];
    var time = Date.now();

    // another tab was active within the last second?
    if (state) {
        state = JSON.parse(state);

        if (time-state[0] < 1000
        && state[1] !== this.identity) {
            this.crashed = true;
            this.logger.error("*** DISCONNECTING FROM INDEXEDDB - cross-tab interference detected");
            // FIXME: check if mem-only ops are safe at this point, force reload if not
            return false;
        }
    }

    localStorage[this.name] = '[' + time + ',"' + this.identity + '"]';
    return true;
     */
};

// FIXME: improve like this:
// when a new tab is opened with the same session, request an update freeze from the master tab
// once the loading is completed, relinquish update lock
// (we could do this with transactions if Safari supported them properly...)
FMDB.prototype.beacon = function fmdb_beacon() {
    if (this.up()) {
        setTimeout(this.beacon.bind(this), 500);
    }
};


function mDBcls() {
    if (fmdb && fmdb.db) {
        fmdb.db.close();
    }
    fmdb = null;
}


// --------------------------------------------------------------------------

/**
 * Wrapper around Dexie that remembers and removes deprecated databases.
 * @param {String} aUniqueID Unique Identified for this database.
 * @see {@link MegaDexie.getDBName} for additional parameters.
 * @details as part of this constructor, {aPayLoad} must be the schema if provided.
 * @constructor
 */
function MegaDexie(aUniqueID) {
    'use strict';
    var __args = toArray.apply(null, arguments).slice(1);
    var dbname = MegaDexie.getDBName.apply(this, __args);

    this.__dbUniqueID = this.__fromUniqueID(aUniqueID + __args[0]);
    this.__rememberDBName(dbname);

    Dexie.call(this, dbname);

    if (__args[3]) {
        // Schema given.
        this.version(1).stores(__args[3]);
    }

    if (d > 2) {
        MegaDexie.__dbConnections.push(this);
    }
}

inherits(MegaDexie, Dexie);

/**
 * Helper to create common database names.
 * @param {String} aName The main name.
 * @param {String} [aIdent] Identity (added to the db name as-is)
 * @param {Boolean} [aTagUser] Whether this database is user-specific
 * @param {*} [aPayload] Some serializable data to randomize the db name
 * @param {*} [aPersistent] Whether this database is persistent, true by default.
 * @returns {String} encrypted database name
 */
MegaDexie.getDBName = function(aName, aIdent, aTagUser, aPayload, aPersistent) {
    'use strict';
    if (typeof u_k_aes === 'undefined') {
        if (window.u_k) {
            throw new Error('Invalid account state.');
        }
        window.u_k_aes = new sjcl.cipher.aes(str_to_a32('' + ua).slice(-4));
        console.warn('MegaDexie.getDBName: Adding temporal key for non-logged user.');
    }
    var pex = aPersistent === false ? '' : FMDB.perspex;
    aPayload = aPayload && MurmurHash3(JSON.stringify(aPayload)).toString(16) || '';
    return (aIdent || '') + FMDB.prototype.toB64(aPayload + aName + (aTagUser ? u_handle : '')) + pex;
};

/**
 * The missing Dexie.bulkUpdate
 * @param {String} [table] Optional Dexie table
 * @param {Array} bulkData Bulk data
 * @returns {Promise} promise
 */
MegaDexie.prototype.bulkUpdate = promisify(function(resolve, reject, table, bulkData) {
    'use strict';

    if (typeof table !== 'string') {
        bulkData = table;
        table = this.tables;
        table = table.length === 1 && table[0].name;
    }

    if (!bulkData.length) {
        return resolve(bulkData);
    }
    table = this.table(table);

    var i;
    var keyPath;
    var anyOf = [];
    var schema = table.schema;
    var indexes = schema.indexes;

    for (i = 0; i < indexes.length; ++i) {
        if (indexes[i].unique) {
            keyPath = indexes[i].keyPath;
            break;
        }
    }

    for (i = bulkData.length; i--;) {
        var v = bulkData[i][keyPath || schema.primKey.keyPath];

        if (FMDB.prototype.exists(anyOf, v)) {
            bulkData.splice(i, 1);
        }
        else {
            anyOf.push(v);
        }
    }

    (keyPath ? table.where(keyPath).anyOf(anyOf).toArray() : table.bulkGet(anyOf))
        .then(function(r) {
            var toUpdate = [];

            keyPath = keyPath || schema.primKey.keyPath;
            for (var i = r.length; i--;) {
                for (var j = r[i] && bulkData.length; j--;) {
                    if (FMDB.prototype.equal(r[i][keyPath], bulkData[j][keyPath])) {
                        delete bulkData[j][keyPath];
                        toUpdate.push([r[i], bulkData.splice(j, 1)[0]]);
                        break;
                    }
                }
            }

            var tasks = toUpdate.map(function(u) {
                return table.where(":id").equals(u[0][schema.primKey.keyPath]).modify(u[1]);
            });
            if (bulkData.length) {
                tasks.push(table.bulkPut(bulkData));
            }
            return Promise.all(tasks);
        })
        .then(resolve)
        .catch(reject);
});

/**
 * Remember newly opened database.
 * @param {String} aDBName The database being opened.
 * @returns {void}
 * @private
 */
MegaDexie.prototype.__rememberDBName = function(aDBName) {
    'use strict';
    var aUniqueID = this.__dbUniqueID;

    MegaDexie.__knownDBNames.get(aUniqueID)
        .then(function(s) {
            if (s) {
                if (s.v === aDBName) {
                    return;
                }
                Dexie.delete(s.v).then(nop).catch(dump);
            }
            return MegaDexie.__knownDBNames.put({k: aUniqueID, t: Date.now() - 1589e9, v: aDBName});
        })
        .catch(nop);

    this.__checkStaleDBNames();
};

/**
 * Forget database.
 * @returns {void}
 * @private
 */
MegaDexie.prototype.__forgetDBName = function() {
    'use strict';
    MegaDexie.__knownDBNames.delete(this.__dbUniqueID).then(nop).catch(dump);
};

MegaDexie.prototype.__checkStaleDBNames = function() {
    'use strict';

    if (MegaDexie.__staleDBsChecked) {
        return;
    }

    var canQueryDatabases = typeof Object(window.indexedDB).databases === 'function';
    MegaDexie.__staleDBsChecked = canQueryDatabases ? true : -1;

    if (canQueryDatabases) {
        setTimeout(function() {
            var databases = [];

            if (d) {
                console.debug('Checking stale databases...');
            }

            indexedDB.databases()
                .then(function(r) {
                    for (var i = r.length; i--;) {
                        console.assert(r[i].name);
                        if (r[i].name) {
                            databases.push(r[i].name);
                        }
                    }

                    return databases.length ? MegaDexie.__knownDBNames.toArray() : Promise.resolve([]);
                })
                .then(function(r) {
                    var stale = [];

                    for (var i = r.length; i--;) {
                        if (databases.indexOf(r[i].v) < 0) {
                            if (d) {
                                console.warn('Found stale database...', r[i].v);
                            }
                            stale.push(r[i].k);
                        }
                    }

                    if (stale.length) {
                        MegaDexie.__knownDBNames.bulkDelete(stale).then(nop).catch(dump);
                    }
                    else {
                        console.debug('Yay, no stale databases found.');
                    }
                })
                .catch(nop);
        }, 4e4);
    }
};

/**
 * Hash unique identifier
 * @param {Number|String} aUniqueID Unique Identifier for database.
 * @returns {Number} hash
 * @private
 */
MegaDexie.prototype.__fromUniqueID = function(aUniqueID) {
    'use strict';
    return MurmurHash3('mega' + aUniqueID + window.u_handle, -0x9fffee);
};

/**
 * Deletes the database.
 * @returns {Promise} promise
 */
MegaDexie.prototype.delete = function() {
    'use strict';
    this.__forgetDBName();
    return Dexie.prototype.delete.apply(this, arguments);
};

/**
 * Open the database.
 * @returns {Promise} promise
 */
MegaDexie.prototype.open = function() {
    'use strict';
    this.__rememberDBName(this.name);
    return Dexie.prototype.open.apply(this, arguments);
};

/**
 * @name __knownDBNames
 * @memberOf MegaDexie
 */
lazy(MegaDexie, '__knownDBNames', function() {
    'use strict';
    var db = new Dexie('$kdbn', {addons: []});
    db.version(1).stores({k: '&k'});
    return db.table('k');
});

// @private
MegaDexie.__dbConnections = [];

/**
 * Creates a new database layer, which may change at anytime, and thus with
 * the only assertion the instance returned will have set/get/remove methods
 * @param {String} name Database name.
 * @param {Boolean|Number} binary mode
 * @returns {*} database instance.
 */
MegaDexie.create = function(name, binary) {
    'use strict';
    binary = binary && SharedLocalKVStorage.DB_MODE.BINARY;
    return new SharedLocalKVStorage.Utils.DexieStorage('mdcdb:' + name, binary);
};

// Remove obsolete databases.
mBroadcaster.once('startMega', tryCatch(function _removeObsoleteDatabases() {
    'use strict';

    if (Date.now() > 163e10) {
        console.error('Remove me \uD83D\uDD34');
        return;
    }

    Dexie.getDatabaseNames()
        .then(function(r) {
            for (var i = r.length; i--;) {
                var n = r[i];

                if (n.substr(0, 6) === '$ctdb_') {
                    Dexie.delete(n).then(nop).catch(dump);
                    console.info('Removing obsolete db:%s', n);
                }
            }
        })
        .catch(nop);

    var entries = Object.keys(localStorage)
        .filter(function(k) {
            return k.startsWith('_$mdb$');
        });

    for (var i = entries.length; i--;) {
        delete localStorage[entries[i]];
    }
}, false));

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

/**
 * Helper functions to retrieve nodes from indexedDB.
 * @name dbfetch
 * @memberOf window
 */
Object.defineProperty(self, 'dbfetch', (function() {
    'use strict';
    var tree_inflight = Object.create(null);
    var node_inflight = Object.create(null);

    var getNode = function(h, cb) {
        if (M.d[h]) {
            return cb(M.d[h]);
        }
        fmdb.getbykey('f', 'h', ['h', [h]])
            .always(function(r) {
                if (r.length) {
                    emplacenode(r[0], true);
                }
                cb(M.d[h]);
            });

    };

    var showLoading = function(h) {
        $.dbOpenHandle = h;
        document.documentElement.classList.add('wait-cursor');
    };
    var hideLoading = function(h) {
        if ($.dbOpenHandle === h) {
            $.dbOpenHandle = false;
            document.documentElement.classList.remove('wait-cursor');
        }
    };

    var dbfetch = Object.freeze({
        /**
         * Retrieve root nodes only, on-demand node loading mode.
         * or retrieve whole 'f' table in chunked mode.
         * @returns {Promise} fulfilled on completion
         * @memberOf dbfetch
         */
        init: function fetchfroot() {

            if (!mBroadcaster.crossTab.master) {
                // fetch the whole cloud on slave tabs..
                return fmdb.get('f', function(r) {
                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);
                    }
                });
            }

            return new Promise(function(resolve, reject) {
                // fetch the three root nodes
                fmdb.getbykey('f', 'h', ['s', ['-2', '-3', '-4']]).always(function(r) {
                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);
                    }

                    if (!r.length || !M.RootID) {
                        return reject('indexedDB corruption!');
                    }

                    // fetch all top-level nodes
                    fmdb.getbykey('f', 'h', ['p', [M.RootID, M.InboxID, M.RubbishID]])
                        .always(function(r) {
                            for (var i = r.length; i--;) {
                                emplacenode(r[i]);
                            }
                            resolve();
                        });
                });
            });
        },

        /**
         * Check whether a node is currently loading from DB.
         * @param {String} handle The ufs-node handle
         * @returns {Boolean} whether it is.
         */
        isLoading: function(handle) {
            return Boolean(tree_inflight[handle] || node_inflight[handle]);
        },

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d in streaming mode
         *
         * @param {String} handle Node handle
         * @param {MegaPromise} [waiter] waiting parent
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        open: promisify(function(resolve, reject, handle, waiter) {
            var fail = function(ex) {
                reject(ex);
                hideLoading(handle);
                queueMicrotask(function() {
                    if (tree_inflight[handle] === waiter) {
                        delete tree_inflight[handle];
                    }
                    waiter.reject(ex);
                });
            };
            var done = function(res) {
                if (resolve) {
                    resolve(res);
                }
                hideLoading(handle);
                queueMicrotask(function() {
                    if (tree_inflight[handle] === waiter) {
                        delete tree_inflight[handle];
                    }
                    waiter.resolve(handle);
                });
            };
            var ready = function(n) {
                return dbfetch.open(n.p);
            };

            if (typeof handle !== 'string' || handle.length !== 8) {
                return resolve(handle);
            }
            var silent = waiter === undefined;

            if (silent) {
                // @todo refactor all of dbfetch to not use MegaPromise...
                // eslint-disable-next-line local-rules/hints
                waiter = new MegaPromise();
            }
            else {
                showLoading(handle);
            }

            if (tree_inflight[handle]) {
                if (M.c[handle]) {
                    queueMicrotask(resolve);
                    resolve = null;
                }
                return tree_inflight[handle].then(done).catch(fail);
            }
            tree_inflight[handle] = waiter;

            getNode(handle, function(n) {
                if (!n) {
                    return fail(ENOENT);
                }
                if (!n.t || M.c[n.h]) {
                    return ready(n).always(done);
                }

                var promise;
                var opts = {
                    limit: 4,
                    offset: 0,
                    where: [['p', handle]]
                };
                if (d) {
                    opts.i = makeid(9) + '.' + handle;
                }

                if (!silent) {
                    showLoading(handle);
                }
                fmdb.getchunk('f', opts, function(r) {
                    if (!opts.offset) {
                        M.c[n.h] = Object.create(null);
                    }

                    opts.offset += opts.limit;
                    if (opts.limit < 4096) {
                        opts.limit <<= 2;
                    }

                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);
                    }

                    if (ready) {
                        promise = ready(n).always(resolve);
                        ready = resolve = null;
                    }
                    else {
                        promise.always(function() {
                            newnodes = newnodes.concat(r);
                            queueMicrotask(function() {
                                M.updFileManagerUI().dump('dbf-open-' + opts.i);
                            });
                        });
                    }

                }).always(function() {
                    promise.always(done);
                });
            });
        }),

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d
         *
         * @param {String} parent  Node handle
         * @param {MegaPromise} [promise]
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        get: function fetchchildren(parent, promise) {

            if (d > 1) {
                console.warn('fetchchildren', parent, promise);
            }
            promise = promise || MegaPromise.busy();

            if (typeof parent !== 'string') {
                if (d) {
                    console.warn('Invalid parent, cannot fetchchildren', parent);
                }
                promise.reject(EARGS);
            }
            else if (!fmdb) {
                if (d) {
                    console.debug('No fmdb available...', folderlink, pfid);
                }
                promise.reject(EFAILED);
            }
            // is this a user handle or a non-handle? no fetching needed.
            else if (parent.length != 8) {
                promise.resolve();
            }
            // has the parent been fetched yet?
            else if (!M.d[parent]) {
                fmdb.getbykey('f', 'h', ['h', [parent]])
                    .always(function(r) {
                        if (r.length > 1) {
                            console.error('Unexpected number of result for node ' + parent, r.length, r);
                        }
                        for (var i = r.length; i--;) {
                            // providing a 'true' flag so that the node isn't added to M.c,
                            // otherwise crawling back to the parent won't work properly.
                            emplacenode(r[i], true);
                        }
                        if (!M.d[parent]) {
                            // no parent found?!
                            promise.reject(ENOENT);
                        }
                        else {
                            dbfetch.get(parent, promise);
                        }
                    });
            }
            // have the children been fetched yet?
            else if (M.d[parent].t && !M.c[parent]) {
                // no: do so now.
                this.tree([parent], 0, new MegaPromise())
                    .always(function() {
                        if (M.d[parent] && M.c[parent]) {
                            dbfetch.get(M.d[parent].p, promise);
                        }
                        else {
                            console.error('Failed to load folder ' + parent);
                            api_req({a: 'log', e: 99667, m: 'Failed to fill M.c for a folder node..'});
                            promise.reject(EACCESS);
                        }
                    });
            }
            else {
                // crawl back to root (not necessary until we start purging from memory)
                dbfetch.get(M.d[parent].p, promise);
            }

            return promise;
        },

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d
         * same as fetchchildren/dbfetch.get, but takes an array of handles.
         *
         * @param {Array} handles
         * @param {MegaPromise} [promise]
         * @returns {MegaPromise}
         * @memberOf dbfetch
         */
        geta: function geta(handles, promise) {
            promise = promise || MegaPromise.busy();

            var promises = [];
            for (var i = handles.length; i--;) {
                // fetch nodes and their path to root
                promises.push(dbfetch.get(handles[i], new MegaPromise()));
            }

            promise.linkDoneAndFailTo(MegaPromise.allDone(promises));

            return promise;
        },

        /**
         * Fetch entire subtree.
         *
         * @param {Array} parents  Node handles
         * @param {Number} [level] Recursion level, optional
         * @param {MegaPromise} [promise] optional
         * @param {Array} [handles] -- internal use only
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        tree: function fetchsubtree(parents, level, promise, handles) {
            var p = [];
            var inflight = Object.create(null);

            if (level === undefined) {
                level = -1;
            }

            // setup promise
            promise = promise || MegaPromise.busy();

            if (!fmdb) {
                if (d) {
                    console.debug('No fmdb available...', folderlink, pfid);
                }
                return promise.reject(EFAILED);
            }

            // first round: replace undefined handles with the parents
            if (!handles) {
                handles = parents;
            }

            // check which parents have already been fetched - no need to fetch those
            // (since we do not purge loaded nodes, the presence of M.c for a node
            // means that all of its children are guaranteed to be in memory.)
            for (var i = parents.length; i--;) {
                if (tree_inflight[parents[i]]) {
                    inflight[parents[i]] = tree_inflight[parents[i]];
                }
                else if (!M.c[parents[i]]) {
                    p.push(parents[i]);
                    tree_inflight[parents[i]] = promise;
                }
            }

            var masterPromise = promise;
            if ($.len(inflight)) {
                masterPromise = MegaPromise.allDone(array.unique(obj_values(inflight)).concat(promise));
            }
            // console.warn('fetchsubtree', arguments, p, inflight);

            // fetch children of all unfetched parents
            fmdb.getbykey('f', 'h', ['p', p.concat()])
                .always(function(r) {
                    // store fetched nodes
                    for (var i = p.length; i--;) {
                        delete tree_inflight[p[i]];

                        // M.c should be set when *all direct* children have
                        // been fetched from the DB (even if there are none)
                        M.c[p[i]] = Object.create(null);
                    }
                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);
                    }

                    if (level--) {
                        // extract parents from children
                        p = [];

                        for (var i = parents.length; i--;) {
                            for (var h in M.c[parents[i]]) {
                                handles.push(h);

                                // with file versioning, files can have children, too!
                                if (M.d[h].t || M.d[h].tvf) {
                                    p.push(h);
                                }
                            }
                        }

                        if (p.length) {
                            fetchsubtree(p, level, promise, handles);
                            return;
                        }
                    }
                    promise.resolve();
                });

            return masterPromise;
        },

        /**
         * Retrieve nodes by handle.
         * WARNING: emplacenode() is not used, it's up to the caller if so desired.
         *
         * @param {Array} handles
         * @returns {MegaPromise}
         * @memberOf dbfetch
         */
        node: promisify(function fetchnode(resolve, reject, handles) {
            var result = [];

            for (var i = handles.length; i--;) {
                if (M.d[handles[i]]) {
                    result.push(M.d[handles[i]]);
                    handles.splice(i, 1);
                }
            }

            if (!handles.length || !fmdb) {
                if (d && handles.length) {
                    console.warn('Unknown nodes: ' + handles);
                }
                return resolve(result);
            }

            fmdb.getbykey('f', 'h', ['h', handles.concat()])
                .always(function(r) {
                    if (handles.length == 1 && r.length > 1) {
                        console.error('Unexpected DB reply, more than a single node returned.');
                    }

                    for (var i = handles.length; i--;) {
                        delete node_inflight[handles[i]];
                    }

                    resolve(result.concat(r));
                });
        }),

        /**
         * Retrieve a node by its hash.
         *
         * @param hash
         * @returns {MegaPromise}
         * @memberOf dbfetch
         */
        hash: function fetchhash(hash) {
            var promise = new MegaPromise();

            if (M.h[hash] && Object.keys(M.h[hash])[0]) {
                promise.resolve(Object.keys(M.h[hash])[0]);
            }
            else {
                fmdb.getbykey('f', 'c', false, [['c', hash]], 1)
                    .always(function(r) {
                        var node = r[0];
                        if (node) {
                            // got the hash and a handle it belong to
                            if (!M.h[hash]) {
                                M.h[node.hash] = Object.create(null);
                                M.h[node.hash][node.h] = true;
                            }
                            else {
                                if (!M.h[node.hash][node.h]) {
                                    M.h[node.hash][node.h] = true;
                                }
                            }

                            promise.resolve(node);
                        }
                        else {
                            promise.resolve();
                        }
                    });
            }

            return promise;
        },

        /**
         * Fetch all children recursively; also, fetch path to root
         *
         * @param {Array} handles
         * @param {MegaPromise} [promise]
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        coll: function fetchrecursive(handles, promise) {
            promise = promise || MegaPromise.busy();

            if (!fmdb) {
                promise.resolve();
                return promise;
            }

            // fetch nodes and their path to root
            this.geta(handles, new MegaPromise())
                .always(function() {
                    var folders = [];
                    for (var i = handles.length; i--;) {
                        var h = handles[i];
                        if (M.d[h] && (M.d[h].t || M.d[h].tvf)) {
                            folders.push(h);
                        }
                    }
                    if (folders.length) {
                        dbfetch.tree(folders, -1, new MegaPromise())
                            .always(function(r) {
                                promise.resolve(r);
                            });
                    }
                    else {
                        promise.resolve();
                    }
                });

            return promise;
        }
    });

    return {value: dbfetch};
})());
