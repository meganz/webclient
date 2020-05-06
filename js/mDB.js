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
        'LOG':   '#8e8da7'
    };

    // if (d) Dexie.debug = "dexie";
}

// initialise cross-tab access arbitration identity
FMDB.prototype.identity = Date.now() + Math.random().toString(26);

// pre-computed 'anyof' or 'where'
FMDB.prototype.filters = Object.create(null);

// set up and check fm DB for user u
// calls result(sn) if found and sn present
// wipes DB an calls result(false) otherwise
FMDB.prototype.init = function fmdb_init(result, wipe) {
    "use strict";

    var fmdb = this;
    var dbpfx = 'fm28_';
    var slave = !mBroadcaster.crossTab.master;

    fmdb.crashed = false;
    fmdb.inval_cb = false;
    fmdb.inval_ready = false;

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

        // save the db name for our getDatabaseNames polyfill
        localStorage['_$mdb$' + dbpfx + fmdb.name] = Date.now();

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
            for (var i = r.length; i--;) {
                // drop only fmX related databases and skip slkv's
                if (r[i].substr(0, dbpfx.length) !== dbpfx
                    && r[i][0] !== '$'
                    && r[i].substr(0, 4) !== "slkv") {

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
            // Remove the DB name from localStorage so that our getDatabaseNames polyfill doesn't keep returning them
            delete localStorage['_$mdb$' + db.name];
            delete localStorage[db.name];

            fmdb.logger.log("Deleted IndexedDB " + db.name);
        }).catch(function(err){
            fmdb.logger.error("Unable to delete IndexedDB " + db.name, err);
        }).finally(function() {
            next();
        });
    }
};

// enqueue a table write - type 0 == addition, type 1 == deletion
// IndexedDB activity is triggered once we have at least 10240 pending rows or the sn
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

        if (table === 'f') {
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

    if (!c[c.h]) c[c.h] = [row];
    else {
        // add row to the highest index (we want big IndexedDB bulkPut()s)
        if (type || table !== 'f' || !window.safari) {
            c[c.h].push(row);
        }
        else if (c.r[row.h]) {
            c[c.h][c.r[row.h]] = row;
        }
        else {
            c.r[row.h] = c[c.h].push(row) - 1;
        }
    }

    // force a flush when a lot of data is pending or the _sn was updated
    // also, force a flush for non-transactional channels (> 0)
     if (ch || table[0] == '_' || c[c.h].length > 10240) {
        //  the next write goes to a fresh transaction
         if (!ch) fmdb.head[ch]++;
         fmdb.writepending(fmdb.head.length - 1);
    }
};

// FIXME: auto-retry smaller transactions? (need stats about transaction failures)
// ch - channel to operate on
FMDB.prototype.writepending = function fmdb_writepending(ch) {
    "use strict";

    // exit loop if we ran out of pending writes or have crashed
    if (this.inflight || ch < 0 || this.crashed || this.writing) {
        return;
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
        fmdb.db.transaction('rw',
            fmdb.tables,
            function(){
                if (d) {
                    fmdb.logger.log("Transaction started");
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
                    fmdb.logger.log("Transaction committed");
                }
                fmdb.writing = 0;
                fmdb.writepending(ch);
            }).catch(function(e){
                if (fmdb.cantransact < 0) {
                    fmdb.logger.error("Your browser's IndexedDB implementation is bogus, disabling transactions.");
                    fmdb.cantransact = 0;
                    fmdb.writing = 0;
                    fmdb.writepending(ch);
                }
                else {
                    // FIXME: retry instead? need statistics.
                    fmdb.logger.error("Transaction failed, marking DB as crashed", e);
                    fmdb.state = -1;
                    fmdb.invalidate();

                    eventlog(99724, '$wptr:' + e, true);
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
    // FIXME: check if having multiple IndexedDB writes in flight improves performance
    // on Chrome/Firefox/Safari - it kills MSIE
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

        // jshint -W083
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
                    fmdb.logger.log("DB %s with %s element(s) on table %s, channel %s, state %s",
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
                if (fmdb.inval_cb && t.t & 1 && table[0] == '_') fmdb.inval_ready = true;

                // ...and send update off to IndexedDB for writing
                var op = t.t & 1 ? 'bulkDelete' : 'bulkPut';
                var data = t[t.t++];
                var limit = 16384; // increase the limit of the batch

                if (op === 'bulkPut') {

                    for (var rw = 0; rw < data.length; rw++) {
                        var row = data[rw];
                        if (row.d) {
                            if (fmdb.stripnode[table]) {
                                // this node type is stripnode-optimised: temporarily remove redundant elements
                                // to create a leaner JSON and save IndexedDB space
                                var d = row.d;  // this references the live object!
                                var t1 = fmdb.stripnode[table](d);   // remove overhead
                                row.d = JSON.stringify(d);          // store lean result
                                for (var i1 in t1) d[i1] = t1[i1];       // restore overhead
                            }
                            else {
                                // otherwise, just stringify it all
                                row.d = JSON.stringify(row.d);
                            }
                        }

                        // obfuscate index elements as base64-encoded strings, payload as ArrayBuffer
                        for (var i2 in row) {
                            if (i2 == 'd') {
                                row.d = fmdb.strcrypt(row.d);
                            }
                            else if (table !== 'f' || i2 !== 't') {
                                row[i2] = ab_to_base64(fmdb.strcrypt(row[i2]));
                            }
                        }
                    }
                }

                if (data.length < limit) {
                    fmdb.db[table][op](data).then(writeend).catch(writeerror);
                }
                else {
                    (function bulkTick() {
                        var rows = data.splice(0, limit);

                        if (rows.length) {
                            if (d > 1) {
                                fmdb.logger.log('%s for %d rows, %d remaining.....................................',
                                    op, rows.length, data.length);
                            }
                            fmdb.db[table][op](rows).then(bulkTick).catch(writeerror);
                        }
                        else {
                            writeend();
                        }
                    })();
                }

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

// encrypt/decrypt UNICODE string s, returns ArrayBuffer
// FIXME: use CBC instead of ECB!
FMDB.prototype.strcrypt = function fmdb_strcrypt(s) {
    "use strict";

    if (d && String(s).length > 0x10000) {
        console.warn('The data you are trying to write is too huge and will degrade the performance...');
    }

    var a32 = str_to_a32(to8(s));
    for (var i = (-a32.length) & 3; i--; ) a32.push(0);
    return a32_to_ab(encrypt_key(u_k_aes, a32)).buffer;
};

FMDB.prototype.strdecrypt = function fmdb_strdecrypt(ab) {
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

        if (!(f.fav | 0)) {
            delete f.fav;
        }
        if (!(f.lbl | 0)) {
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

        return t;
    },

    tree: function(f) {
        var t = {h: f.h};
        delete f.h;
        if (!f.td) delete f.td;
        if (!f.tb) delete f.tb;
        if (!f.tf) delete f.tf;
        if (!f.tvf) delete f.tvf;
        if (!f.tvb) delete f.tvb;
        if (!(f.lbl | 0)) {
            delete f.lbl;
        }
        return t;
    },

    ua : function(ua, index) {
        delete ua.k;
    },
    mcf: function(mcfResponse) {
        var newMcf = {};
        // mcfResponse may contain 'undefined' values, which should NOT be set, otherwise they may replace the mcfCache
        var keys = [
            'id',
            'cs',
            'g',
            'u',
            'ts',
            'ct',
            'ck',
            'f',
            'm',
        ];
        for (var idx in keys) {
            var k = keys[idx];
            if (typeof mcfResponse[k] !== 'undefined') {
                newMcf[k] = mcfResponse[k];
            }
        }

        var t = {
            'ou': mcfResponse.ou,
            'n': mcfResponse.n,
            'url': mcfResponse.url
        };

        if (newMcf.u && Object.keys(newMcf.u).length > 50) {
            var u = newMcf.u;
            // cleanup before mcf.add
            delete newMcf.u;
            delete mcfResponse.u;

            // restore after fmdb.add
            t.u = u;

            // build smaller string based version to safe few bytes
            var stripu = "";
            for (var i = 0; i < u.length; i++) {
                stripu += base64urldecode(u[i].u) + String(u[i].p);
            }
            newMcf.stripu = stripu;
        }


        delete mcfResponse.ou;
        delete mcfResponse.url;
        delete mcfResponse.n;

        FMDB._mcfCache[newMcf.id] = Object.assign({}, FMDB._mcfCache[mcfResponse.id], newMcf);
        Object.assign(mcfResponse, FMDB._mcfCache[newMcf.id]);
        return t;
    }
});

// re-add previously removed index fields to the payload object
FMDB.prototype.restorenode = Object.freeze({
    ok : function(ok, index) {
        ok.h = index.h;
    },

    f : function(f, index) {
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
    },
    tree : function(f, index) {
        f.h = index.h;
    },

    ph : function(ph, index) {
        ph.h = index.h;
    },

    ua : function(ua, index) {
        ua.k = index.k;
    },

    h: function(out, index) {
        out.h = index.h;
        out.hash = index.c;
    },

    mk : function(mk, index) {
        mk.h = index.h;
    },

    mcf: function(mcf, index) {
        // fill cache.
        if (mcf.stripu) {
            mcf.u = [];
            for (var i = 0; i < mcf.stripu.length; i += 9) {
                mcf.u.push({
                    'u': base64urlencode(mcf.stripu.substr(i, 8)),
                    'p': parseInt(mcf.stripu.substr(i + 8, 1), 10)
                });
            }
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

    this.enqueue(table, ab_to_base64(this.strcrypt(index)), 1);
};

// non-transactional read with subsequent deobfuscation, with optional prefix filter
// (must NOT be used for dirty reads - use getbykey() instead)
FMDB.prototype.get = function fmdb_get(table, key, prefix) {
    "use strict";

    if (this.crashed > 1) {
        // a read operation failed previously
        return MegaPromise.reject([]);
    }

    var promise;
    var masterPromise = new MegaPromise();
    var fmdb = this;

    if (d) {
        fmdb.logger.log("Fetching entire table " + table + "...");
    }

    if (key) promise = fmdb.db[table].where(key).startsWith(prefix).toArray();
    else promise = fmdb.db[table].toArray();

    promise.then(function(r){
        fmdb.normaliseresult(table, r);
        masterPromise.resolve(r);
    }).catch(function(ex) {
        fmdb.logger.error("Read operation failed, marking DB as read-crashed", ex);
        fmdb.invalidate(function() {
            masterPromise.reject([]);
        }, 1);
    });

    return masterPromise;
};

FMDB.prototype.normaliseresult = function fmdb_normaliseresult(table, r) {
    "use strict";

    var t;

    for (var i = r.length; i--; ) {
        try {

            if (r[i].d && !r[i].d.byteLength) {
                // not encrypted.
                continue;
            }

            t = r[i].d ? JSON.parse(this.strdecrypt(r[i].d)) : {};

            if (this.restorenode[table]) {
                // restore attributes based on the table's indexes
                for (var p in r[i]) {
                    if (p !== 'd' && (table !== 'f' || p !== 't')) {
                        r[i][p] = this.strdecrypt(base64_to_ab(r[i][p]));
                    }
                }
                this.restorenode[table](t, r[i]);
            }

            r[i] = t;
        }
        catch (e) {
            this.logger.error("IndexedDB corruption: " + this.strdecrypt(r[i].d), e);
            r.splice(i, 1);
        }
    }
};

// non-transactional read with subsequent deobfuscation, with optional key filter
// (dirty reads are supported by scanning the pending writes after the IndexedDB read completes)
// anyof and where are mutually exclusive, FIXME: add post-anyof where filtering?
FMDB.prototype.getbykey = function fmdb_getbykey(table, index, anyof, where, limit) {
    'use strict';

    if (!mega.chrome || !anyof || !Object.keys(this.pending[0]).length) {
        return this.getbykey1.apply(this, arguments);
    }

    var fmdb = this;
    var promise = new MegaPromise();
    var args = toArray.apply(null, arguments);

    onIdle(function() {
        // XXX: Dexie.anyOf() is bugged when there are pending writes...
        //      dispatching this delayed should help to settle the transaction data
        promise.linkDoneAndFailTo(fmdb.getbykey1.apply(fmdb, args));
    });

    return promise;
};
// @private
FMDB.prototype.getbykey1 = function fmdb_getbykey1(table, index, anyof, where, limit) {
    "use strict"; /* jshint -W074 */

    var options = false;
    if (typeof index !== 'string') {
        options = index;
        index = options.index;
        anyof = anyof || options.anyof;
        where = where || options.where;
        limit = limit || options.limit;
    }

    if (this.crashed > 1 || anyof && !anyof[1].length) {
        return MegaPromise.reject([]);
    }

    var fmdb = this;
    var ch = fmdb.channelmap[table] || 0;
    var promise = new MegaPromise();

    if (d) {
        fmdb.logger.log("Fetching table " + table + (where ? (" by keys " + JSON.stringify(where)) : '') + "...");
    }

    var t = fmdb.db[table];
    var i = 0;

    if (!index) {
        // No index provided, fallback to primary key
        index = t.schema.primKey.keyPath;
    }

    var originalAnyof = [];
    var originalWhere = [];
    if (anyof) {
        originalAnyof = clone(anyof[1]);
        // encrypt all values in the list
        for (i = anyof[1].length; i--;) {
            /*if (!this.filters[anyof[1][i]]) {
                this.filters[anyof[1][i]] = ab_to_base64(this.strcrypt(anyof[1][i]));
            }
            anyof[1][i] = this.filters[anyof[1][i]];*/
            anyof[1][i] = ab_to_base64(this.strcrypt(anyof[1][i]));
        }

        if (anyof[1].length > 1) {
            t = t.where(anyof[0]).anyOf(anyof[1]);
        }
        else {
            t = t.where(anyof[0]).equals(anyof[1][0]);
        }
    }
    else if (options.query) {
        // Perform custom user-provided query
        t = options.query(t);
    }
    else {
        for (var k = where.length; k--;) {
            originalWhere.unshift(where[k][1]);
            // encrypt the filter values (logical AND is commutative, so we can reverse the order)
            if (!this.filters[where[k][1]]) {
                this.filters[where[k][1]] = ab_to_base64(this.strcrypt(where[k][1]));
            }
            where[k][1] = this.filters[where[k][1]];

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

    if (limit) {
        t = t.limit(limit);
    }
    t = options.sortBy ? t.sortBy(options.sortBy) : t.toArray();

    t.then(function(r) {
        // now scan the pending elements to capture and return unwritten updates
        // FIXME: typically, there are very few or no pending elements -
        // determine if we can reduce overall CPU load by replacing the
        // occasional scan with a constantly maintained hash for direct lookups?
        var matches = {};
        var pendingch = fmdb.pending[ch];
        var tids = Object.keys(pendingch);

        // iterate transactions in reverse chronological order
        for (var ti = tids.length; ti--; ) {
            var tid = tids[ti];
            var t = pendingch[tid][table];

            // any updates pending for this table?
            if (t && (t[t.h] && t[t.h].length || t[t.h-1] && t[t.h-1].length)) {
                // examine update actions in reverse chronological order
                // FIXME: can stop the loop at t.t for non-transactional writes
                for (var a = t.h; a >= 0; a--) {
                    if (t[a]) {
                        if (a & 1) {
                            // deletion - always by bare index
                            var deletions = t[a];

                            for (var j = deletions.length; j--; ) {
                                if (typeof matches[deletions[j]] == 'undefined') {
                                    // boolean false means "record deleted"
                                    matches[deletions[j]] = false;
                                }
                            }
                        }
                        else {
                            // addition or update - index field is attribute
                            var updates = t[a];

                            // iterate updates in reverse chronological order
                            // (updates are not commutative)
                            for (var j = updates.length; j--; ) {
                                var update = updates[j];

                                if (typeof matches[update[index]] == 'undefined') {
                                    // check if this update matches our criteria, if any
                                    if (where) {
                                        for (var k = where.length; k--;) {
                                            if (update[where[k][0]] !== where[k][1] && update[where[k][0]] !== originalWhere[k]) break;
                                        }

                                        // mismatch detected - record it as a deletion
                                        if (k >= 0) {
                                            matches[update[index]] = false;
                                            continue;
                                        }
                                    }
                                    else if (options.query) {
                                        // If a custom query was made, notify there was a
                                        // pending update and whether if should be included.
                                        if (!(options.include && options.include(update, index))) {
                                            // nope - record it as a deletion
                                            matches[update[index]] = false;
                                            continue;
                                        }
                                    }
                                    else {
                                        // does this update modify a record matched by the
                                        // anyof inclusion list?
                                        for (var k = anyof[1].length; k--;) {
                                            if (update[anyof[0]] === anyof[1][k] || update[anyof[0]] === originalAnyof[k]) break;
                                        }

                                        // no match detected - record it as a deletion
                                        if (k < 0) {
                                            matches[update[index]] = false;
                                            continue;
                                        }
                                    }

                                    matches[update[index]] = update;
                                }
                            }
                        }
                    }
                }
            }
        }

        // scan the result for updates/deletions/additions arising out of the matches found
        for (i = r.length; i--; ) {
            if (typeof matches[r[i][index]] != 'undefined') {
                if (matches[r[i][index]] === false) {
                    // a returned record was deleted or overwritten with
                    // keys that fall outside our where clause
                    r.splice(i, 1);
                }
                else {
                    // a returned record was overwritten and still matches
                    // our where clause
                    r[i] = fmdb.clone(matches[r[i][index]]);
                    delete matches[r[i][index]];
                }
            }
        }

        // now add newly written records
        for (t in matches) {
            if (matches[t]) r.push(fmdb.clone(matches[t]));
        }

        // filter out matching records
        if (where) {
            for (i = r.length; i--;) {
                for (var k = where.length; k--;) {
                    if (r[i][where[k][0]] !== where[k][1] && r[i][where[k][0]] !== originalWhere[k]) {
                        r.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Apply user-provided filtering, if any
        if (options.filter) {
            r = options.filter(r);
        }

        // limit matches records
        if (limit && r.length > limit) {
            r = r.slice(0, limit);
        }

        if (r.length) {
            fmdb.normaliseresult(table, r);
            promise.resolve(r);
        }
        else {
            promise.reject(r);
        }
    }).catch(function(ex) {
        fmdb.logger.error("Read operation failed, marking DB as read-crashed", ex);
        fmdb.invalidate(function() {
            promise.reject([]);
        }, 1);
    });

    return promise;
};

// simple/fast/non-recursive object cloning
FMDB.prototype.clone = function fmdb_clone(o) {
    var r = {};

    for (var i in o) r[i] = o[i];

    return r;
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
 * KISS Interface for Dexie to store key/value pairs
 * @param {String} name Database name
 * @constructor
 */
function StorageDB(name) {
    if (!(this instanceof StorageDB)) {
        return new StorageDB(name);
    }
    if (!window.u_k_aes) {
        if (d) {
            console.error('StorageDB requires a fully active account!');
        }
        return this;
    }
    var self = this;
    var dbname = '$' + this.encrypt(name);

    // save the db name for our getDatabaseNames polyfill
    localStorage['_$mdb$' + dbname] = Date.now();

    this.name = name;
    this.opening = new MegaPromise();

    var db = this.db = new Dexie(dbname);
    db.version(1).stores({kv: '&k'});
    db.open().then(function() {
        self.opening.resolve();
    }).catch(function(e) {
        console.error(dbname, e);
        self.db = null;
        self.opening.reject(e);
    }).finally(function() {
        delete self.opening;
    });
}
StorageDB.prototype = Object.create(FMDB.prototype);

StorageDB.prototype.open = function(callback) {
    "use strict";

    if (this.opening) {
        this.opening.always(callback.bind(this));
    }
    else {
        callback.call(this);
    }
};
StorageDB.prototype.get = function(k) {
    "use strict";

    var promise = new MegaPromise();

    this.open(function() {
        if (this.db) {
            var self = this;

            k = this.encrypt(k);
            this.db.kv.get(k).then(function(store) {
                try {
                    return promise.resolve(JSON.parse(self.strdecrypt(store.v)));
                }
                catch (e) {}

                promise.reject(EACCESS);
            }).catch(function(e) {
                promise.reject(e);
            });
        }
        else {
            promise.reject(ENOENT);
        }
    });

    return promise;
};
StorageDB.prototype.set = function(k, v) {
    "use strict";

    var promise = new MegaPromise();

    this.open(function() {
        if (this.db) {
            var store = {k: this.encrypt(k), v: this.strcrypt(JSON.stringify(v))};

            this.db.kv.put(store).then(function() {
                promise.resolve();
            }).catch(function(e) {
                promise.reject(e);
            });
        }
        else {
            promise.reject(ENOENT);
        }
    });

    return promise;
};
StorageDB.prototype.rem = function(k) {
    "use strict";

    var promise = new MegaPromise();

    this.open(function() {
        if (this.db) {
            var self = this;

            k = this.encrypt(k);
            this.db.kv.delete(k).then(function() {
                self.db.kv.count(function(num) {
                    if (num) {
                        promise.resolve();
                    }
                    else {
                        // no more entries in the db, remove it.

                        self.db.delete().then(function() {
                            promise.resolve();
                        }).catch(function(e) {
                            console.error(e);
                            promise.resolve();
                        });
                    }
                });
            }).catch(function(e) {
                promise.reject(e);
            });
        }
        else {
            promise.reject(ENOENT);
        }
    });

    return promise;
};
StorageDB.prototype.encrypt = function(data) {
    "use strict";

    return ab_to_base64(this.strcrypt(JSON.stringify(data)));
};

// --------------------------------------------------------------------------

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
                                else if (i.substr(0, 6) === '_$mdb$') {
                                    list[length++] = i.substr(6);
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


// --------------------------------------------------------------------------

/**
 * Helper functions to retrieve nodes from indexedDB.
 * @name dbfetch
 */
Object.defineProperty(self, 'dbfetch', (function() {
    var tree_inflight = Object.create(null);
    var node_inflight = Object.create(null);

    var dbfetch = Object.freeze({
        /**
         * Retrieve whole 'f' table.
         * To reduce peak mem usage, we fetch f in 64 small chunks.
         *
         * @param {Number} chunk
         * @param {MegaPromise} [promise]
         * @returns {MegaPromise}
         * @memberOf dbfetch
         */
        chunked: function fetchfchunked(chunk, promise) {
            promise = promise || (new MegaPromise());

            fmdb.get('f', 'h', b64[chunk++])
                .always(function(r) {
                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);
                    }
                    if (chunk == 64) {
                        promise.resolve(null);
                    }
                    else {
                        dbfetch.chunked(chunk, promise);
                    }
                });

            return promise;
        },

        /**
         * Retrieve root nodes only, on-demand node loading mode.
         * @returns {MegaPromise}
         * @memberOf dbfetch
         */
        root: function fetchfroot() {
            "use strict";

            var promise = new MegaPromise();

            // fetch the three root nodes
            fmdb.getbykey('f', 'h', ['s', ['-2', '-3', '-4']]).always(function(r) {
                for (var i = r.length; i--;) emplacenode(r[i]);
                // fetch all top-level nodes
                fmdb.getbykey('f', 'h', ['p', [M.RootID, M.InboxID, M.RubbishID]]).always(function(r) {
                    var folders = [];
                    for (var i = r.length; i--;) {
                        emplacenode(r[i]);

                        /*if (r[i].t == 1) {
                            folders.push(r[i].h);
                        }*/
                    }
                    promise.resolve(folders);
                });
            });

            return promise;
        },

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d
         *
         * @param {String} parent  Node handle
         * @param {MegaPromise} [promise]
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        get: function fetchchildren(parent, promise) {
            "use strict";

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
            "use strict";

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
            "use strict";

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
            "use strict";
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
            "use strict";

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
            "use strict";

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
