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

    // the table names contained in the schema
    this.tables = Object.keys(schema);

    // if we have non-transactional (write-through) tables, they are mapped
    // to channel numbers > 0 here
    this.channelmap = channelmap || {};

    // pending obfuscated writes [channel][tid][tablename][action_autoincrement] = [payloads]
    this.pending = [{}];

    // current channel tid being written to (via .add()/.del()) by the application code
    this.head = [0];

    // current channel tid being sent to IndexedDB
    this.tail = [0];

    // -1: idle, 0: deleted sn and writing (or write-through), 1: transaction open and writing
    this.state = -1;

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

    // initialise additional channels
    for (var i in this.channelmap) {
        i = this.channelmap[i];
        this.head[i] = 0;
        this.tail[i] = 0;
        this.pending[i] = {};
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
}

// initialise cross-tab access arbitration identity
FMDB.prototype.identity = Date.now() + Math.random().toString(26);

// set up and check fm DB for user u
// calls result(sn) if found and sn present
// wipes DB an calls result(false) otherwise
FMDB.prototype.init = function fmdb_init(result, wipe) {
    var fmdb = this;
    var slave = !mBroadcaster.crossTab.master;

    fmdb.crashed = false;
    fmdb.inval_cb = false;
    fmdb.inval_ready = false;

    if (!fmdb.up()) result(false);
    else {
        try {
            if (!fmdb.db) {
                var todrop = [];
                var dbpfx = 'fm8_';

                // enumerate databases and collect those not prefixed with 'dbpfx'
                // (which is the current format)
                Dexie.getDatabaseNames(function(r) {
                    for (var i = r.length; i--;) {
                        if (r[i].substr(0, dbpfx.length) != dbpfx) {
                            todrop.push(r[i]);
                        }
                    }
                }).finally(function(){
                    if (d && todrop.length) {
                        fmdb.logger.log("Deleting obsolete DBs: " + todrop.join(', '));
                    }

                    fmdb.dropall(todrop, function() {
                        // start inter-tab heartbeat
                        // fmdb.beacon();
                        fmdb.db = new Dexie(dbpfx + fmdb.name);

                        // save the db name for our getDatabaseNames polyfill
                        localStorage['_$mdb$' + dbpfx + fmdb.name] = Date.now();

                        fmdb.db.version(1).stores(fmdb.schema);
                        fmdb.db.open().then(function(){
                            fmdb.get('_sn', function(r){
                                if (!wipe && r[0] && r[0].length == 11) {
                                    if (d) {
                                        fmdb.logger.log("DB sn: " + r[0]);
                                    }
                                    result(r[0]);
                                }
                                else if (slave) {
                                    fmdb.crashed = true;
                                    result(false);
                                }
                                else {
                                    if (d) {
                                        fmdb.logger.log("No sn found in DB, wiping...");
                                    }
                                    fmdb.db.delete().then(function(){
                                        fmdb.db.open().then(function(){
                                            result(false);
                                        });
                                    });
                                }
                            });
                        }).catch (Dexie.MissingAPIError, function (e) {
                            fmdb.crashed = true;
                            fmdb.logger.error("IndexedDB unavailable");
                            result(false);
                        }).catch (function (e) {
                            fmdb.crashed = true;
                            fmdb.logger.error(e);
                            result(false);
                        });
                    });
                });
            }
        }
        catch (e) {
            fmdb.logger.error("IndexedDB or crypto layer unavailable, disabling", e);
            fmdb.crashed = true;
            result(false);
        }
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

// enqueue a table write - type 0 == addition, type 1 == deletion
// IndexedDB activity is triggered once we have at least 1000 pending rows or the sn
// (writing the sn - which is done last - completes the transaction and starts a new one)
FMDB.prototype.enqueue = function fmdb_enqueue(table, row, type) {
    var fmdb = this;
    var c;
    var ch = fmdb.channelmap[table] || 0;

    // if needed, create new transaction at index fmdb.head
    if (!(c = fmdb.pending[ch][fmdb.head[ch]])) c = fmdb.pending[ch][fmdb.head[ch]] = {};

    // if needed, create new hash of modifications for this table
    // .h = head, .t = tail (last written to the DB)
    if (!c[table]) {
        // even indexes hold additions, odd indexes hold deletions
        c[table] = { t : -1, h : type };
        c = c[table];
    }
    else {
        // (we continue to use the highest index if it is of the requested type
        // unless it is currently in flight)
        // increment .h(head) if needed
        c = c[table];
        if ((c.h ^ type) & 1) c.h++;
    }

    if (!c[c.h]) c[c.h] = [row];
    else c[c.h].push(row);    // add row to the highest index (we want big IndexedDB bulkPut()s)

    // force a flush when a lot of data is pending or the _sn was updated
    // also, force a flush for non-transactional channels (> 0)
    if (ch || table[0] == '_' || c[c.h].length > 65536) {
        // if we have the _sn, the next write goes to a fresh transaction
        if (!ch && table[0] == '_') fmdb.head[ch]++;
        fmdb.writepending(fmdb.head.length-1);
    }
};

// FIXME: auto-retry smaller transactions? (need stats about transaction failures)
// ch - channel to operate on
FMDB.prototype.writepending = function fmdb_writepending(ch) {
    // exit loop if we ran out of pending writes or have crashed
    if (this.inflight || ch < 0 || this.crashed) return;

    // iterate all channels to find pending writes
    if (!this.pending[ch][this.tail[ch]]) return this.writepending(ch-1);

    var fmdb = this;

    if (!ch && fmdb.state < 0 && fmdb.pending[0][fmdb.tail[0]]._sn && fmdb.cantransact) {
        // if the write job is on channel 0 and already complete (has _sn set),
        // we execute it in a single transaction without first clearing sn
        fmdb.state = 1;
        fmdb.db.transaction('rw',
            fmdb.tables,
            function(){
                if (d) {
                    fmdb.logger.log("Transaction started");
                }
                fmdb.commit = false;
                fmdb.cantransact = 1;
                dispatchputs();
            }).then(function(){
                // transaction completed: delete written data
                delete fmdb.pending[0][fmdb.tail[0]++];
                fmdb.state = -1;
                if (d) {
                    fmdb.logger.log("Transaction committed");
                }
                fmdb.writepending(ch);
            }).catch(function(e){
                if (fmdb.cantransact < 0) {
                    fmdb.logger.error("Your browser's IndexedDB implementation is bogus, disabling transactions.");
                    fmdb.cantransact = 0;
                    fmdb.writepending(ch);
                }
                else {
                    // FIXME: retry instead? need statistics.
                    fmdb.logger.error("Transaction failed, marking DB as crashed", e);
                    fmdb.state = -1;
                    fmdb.crashed = true;
                }
            });
    }
    else {
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
                // we clear the sn (the new sn will be written as the last action in this write job)
                // unfortunately, the DB will have to be wiped in case anything goes wrong
                fmdb.db._sn.clear().then(function(){
                    fmdb.commit = false;
                    dispatchputs();
                }).catch(function(e){
                    fmdb.logger.error("SN clearing failed, marking DB as crashed", e);
                    fmdb.state = -1;
                    fmdb.crashed = true;
                });

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
                    fmdb.db.close();
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
                fmdb.writepending(ch);
            }

            // if we had a real IndexedDB transaction open, it will commit
            // as soon as the browser main thread goes idle
            return;
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

                if (d) {
                    fmdb.logger.log("DB " + ((t.t & 1) ? 'del' : 'put') + " with " + t[t.t].length
                                    + " element(s) on table " + table + ", channel " + ch);
                }

                // if we are on a non-transactional channel or the _sn is being updated,
                // request a commit after the operation completes.
                if (ch || table[0] == '_') {
                    fmdb.commit = true;
                }

                // record what we are sending...
                fmdb.inflight = t;

                // is this an in-band _sn invalidation, and do we have a callback set? arm it.
                if (fmdb.inval_cb && t.t & 1 && table[0] == '_') fmdb.inval_ready = true;

                // ...and send update off to IndexedDB for writing
                fmdb.db[table][t.t & 1 ? 'bulkDelete' : 'bulkPut'](t[t.t++]).then(function(){
                    if (d) {
                        fmdb.logger.log('DB write successful' + (fmdb.commit ? ' - transaction complete' : ''));
                    }

                    // if we are non-transactional, remove the written data from pending
                    // (we have to keep it for the transactional case because it needs to
                    // be visible to the pending updates search that getbykey() performs)
                    if (!fmdb.state) {
                        delete fmdb.inflight[fmdb.inflight.t-1];
                    }

                    // loop back to write more pending data (or to commit the transaction)
                    fmdb.inflight = false;
                    dispatchputs();
                });

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
        }
    }
};

// encrypt/decrypt UNICODE string s, returns ArrayBuffer
// FIXME: use CBC instead of ECB!
FMDB.prototype.strcrypt = function fmdb_strcrypt(s) {
    var a32 = str_to_a32(to8(s));
    for (var i = (-a32.length) & 3; i--; ) a32.push(0);
    return a32_to_ab(encrypt_key(u_k_aes, a32)).buffer;
};

FMDB.prototype.strdecrypt = function fmdb_strdecrypt(ab) {
    if (!ab.byteLength) return '';
    var a32 = [];
    var dv = new DataView(ab);
    for (var i = ab.byteLength/4; i--; ) a32[i] = dv.getUint32(i*4);
    var s = from8(a32_to_str(decrypt_key(u_k_aes, a32)));
    for (var i = s.length; i--; ) if (s.charCodeAt(i)) return s.substr(0, i+1);
};

// remove fields that are duplicated in or can be inferred from the index to reduce database size
FMDB.prototype.stripnode = Object.freeze({
    f : function(f) {
        var t = { h : f.h, t : f.t, s : f.s };

        delete f.h;
        delete f.t;
        delete f.s;

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

    ua : function(ua, index) {
        delete ua.k;
    },

    chatqueuedmsgs : function(chatqueuedmsgs, index) {
        delete chatqueuedmsgs.k;
    },

    pta: function(pta, index) {
        delete pta.k;
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
        if (index.s < 0) f.t = -index.s;
        else {
            f.t = 0;
            f.s = parseFloat(index.s);
        }
        if (!f.ar && f.k && typeof f.k == 'object') f.ar = {};
    },

    ph : function(ph, index) {
        ph.h = index.h;
    },

    ua : function(ua, index) {
        ua.k = index.k;
    },

    chatqueuedmsgs : function(chatqueuedmsgs, index) {
        chatqueuedmsgs.k = index.k;
    },

    pta: function(pta, index) {
        pta.k = index.k;
    },

    h: function(out, index) {
        out.h = index.h;
        out.hash = index.c;
    },

    mk : function(mk, index) {
        mk.h = index.h;
    }
});

// enqueue IndexedDB puts
// sn must be added last and effectively (mostly actually) "commits" the "transaction"
// the next addition will then start a new "transaction"
// (large writes will not execute as an IndexedDB transaction because IndexedDB can't)
FMDB.prototype.add = function fmdb_add(table, row) {
    if (this.crashed) return;

    if (row.d) {
        if (this.stripnode[table]) {
            // this node type is stripnode-optimised: temporarily remove redundant elements
            // to create a leaner JSON and save IndexedDB space
            var d = row.d;  // this references the live object!
            var t = this.stripnode[table](d);   // remove overhead
            row.d = JSON.stringify(d);          // store lean result
            for (var i in t) d[i] = t[i];       // restore overhead
        }
        else {
            // otherwise, just stringify it all
            row.d = JSON.stringify(row.d);
        }
    }

    // obfuscate index elements as base64-encoded strings, payload as ArrayBuffer
    for (var i in row) {
        if (i == 'd') {
            row.d = this.strcrypt(row.d);
        }
        else {
            row[i] = ab_to_base64(this.strcrypt(row[i]));
        }
    }

    this.enqueue(table, row, 0);
};

// enqueue IndexedDB deletions
FMDB.prototype.del = function fmdb_del(table, index) {
    if (this.crashed) return;

    this.enqueue(table, ab_to_base64(this.strcrypt(index)), 1);
};

// non-transactional read with subsequent deobfuscation, with optional prefix filter
// FIXME: replace cb with Promises without incurring a massive readability/mem/CPU penalty!
// (must NOT be used for dirty reads - use getbykey() instead)
FMDB.prototype.get = function fmdb_get(table, cb, key, prefix) {
    if (!this.up()) {
        return cb([]);
    }

    var promise;
    var fmdb = this;

    if (d) {
        fmdb.logger.log("Fetching entire table " + table + "...");
    }

    if (key) promise = fmdb.db[table].where(key).startsWith(prefix).toArray();
    else promise = fmdb.db[table].toArray();

    promise.then(function(r){
        fmdb.normaliseresult(table, r);
        cb(r);
    });
};

FMDB.prototype.normaliseresult = function fmdb_normaliseresult(table, r) {
    var t;

    for (var i = r.length; i--; ) {
        try {
            t = r[i].d ? JSON.parse(this.strdecrypt(r[i].d)) : {};

            if (this.restorenode[table]) {
                // restore attributes based on the table's indexes
                for (var p in r[i]) {
                    if (p != 'd') {
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
// FIXME: replace cb with Promises without incurring a massive readability/mem/CPU penalty!
// (dirty reads are supported by scanning the pending writes after the IndexedDB read completes)
FMDB.prototype.getbykey = function fmdb_getbykey(table, index, anyof, where, cb) {
    if (!this.up()) {
        return cb([]);
    }

    var fmdb = this;
    var ch = fmdb.channelmap[table] || 0;

    if (d) {
        fmdb.logger.log("Fetching table " + table + (where ? (" by keys " + JSON.stringify(where)) : '') + "...");
    }

    var t = fmdb.db[table];
    var i = 0;

    if (anyof) {
        // encrypt all values in the list
        for (i = anyof[1].length; i--; ) anyof[1][i] = ab_to_base64(this.strcrypt(anyof[1][i]));
        // (this leaves i == -1, which triggers the .where() branch below)
        t = t.where(anyof[0]).anyOf(anyof[1]);
    }

    if (where) {
        for (var k = where.length; k--; ) {
            // encrypt the filter values (logical AND is commutative, so we can reverse the order)
            where[k][1] = ab_to_base64(this.strcrypt(where[k][1]));

            // apply filter criterion
            if (i) t = t.and(where[k][0]);
            else {
                t = t.where(where[k][0]);
                i = 1;
            }

            t = t.equals(where[k][1]);
        }
    }

    // FIXME (critical): support anyof below!
    t.toArray().then(function(r){
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
            if (t && t[t.h] && t[t.h].length) {
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
                                        for (var k = where.length; k--; ) {
                                            if (update[where[k][0]] !== where[k][1]) break;
                                        }

                                        // mismatch detected - record it as a deletion
                                        if (k >= 0) {
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

        fmdb.normaliseresult(table, r);
        cb(r);
    });
};

// simple/fast/non-recursive object cloning
FMDB.prototype.clone = function fmdb_clone(o) {
    var r = {};

    for (var i in o) r[i] = o[i];

    return r;
};

// reliably invalidate the current database (delete the sn)
FMDB.prototype.invalidate = function fmdb_invalidate(cb) {
    if (this.crashed) {
        return cb();
    }

    var channels = Object.keys(this.pending);

    // erase all pending data
    for (var i = channels.length; i--; ) {
        this.head[i] = 0;
        this.tail[i] = 0;
        this.pending[i] = {};
    }

    // enqueue the final _sn deletion that will mark the DB as invalid
    this.del('_sn', 1);

    // prevent further reads or writes
    this.crashed = true;

    // set completion callback
    this.inval_cb = cb;
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
Object.freeze(FMDB.prototype);


function mDBcls() {
    if (fmdb && fmdb.db) {
        fmdb.db.close();
    }
    fmdb = null;
}


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
