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

    // DB Instance.
    this.db = false;

    // DB name suffix, derived from u_handle and u_k
    this.name = false;

    // DB schema - https://github.com/dfahlander/Dexie.js/wiki/TableSchema
    Object.defineProperty(this, 'schema', {value: freeze(schema)});

    // the table names contained in the schema (set at open)
    this.tables = null;

    // if we have non-transactional (write-through) tables, they are mapped
    // to channel numbers > 0 here
    this.channelmap = channelmap || {};

    // pending obfuscated writes [channel][tid][tablename][action_autoincrement] = [payloads]
    this.pending = [[]];

    // current channel tid being written to (via .add()/.del()) by the application code
    this.head = [0];

    // current channel tid being sent to IndexedDB
    this.tail = [0];

    // -1: idle, 0: deleted sn and writing (or write-through), 1: transaction open and writing
    this.state = -1;

    // upper limit when pending data needs to start to get flushed.
    this.limit = FMDB_FLUSH_THRESHOLD;

    // flag indicating whether there is a pending write
    this.writing = false;

    // [tid, tablename, action] of .pending[] hash item currently being written
    this.inflight = false;

    // the write is complete and needs be be committed (either because of _sn or write-through)
    this.commit = false;

    // a DB error occurred, do not touch IndexedDB for the rest of the session
    this.crashed = true;

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
        this.pending[i] = [];
    }

    // protect user identity post-logout
    this.name = ab_to_base64(this.strcrypt((plainname + plainname).substr(0, 16)));

    // console logging
    this.logger = MegaLogger.getLogger('FMDB');
    this.logger.options.printDate = 'rad' in mega;
    this.logger.options.levelColors = {
        'ERROR': '#fe000b',
        'DEBUG': '#005aff',
        'WARN':  '#d66d00',
        'INFO':  '#2c6a4e',
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

/** @property FMDB.perspex -- @private persistence prefix */
lazy(FMDB, 'perspex', () => {
    'use strict';
    return `.${(mega.infinity << 5 | FMDB.iDBv2 << 4 | FMDB.$usePostSerialz | FMDB.version).toString(16)}`;
});

/** @property fmdb.memoize */
lazy(FMDB.prototype, 'memoize', () => {
    'use strict';
    // leave cloud nodes in memory?..
    return parseInt(localStorage.cnize) !== 0;
});

// set up and check fm DB for user u
// calls result(sn) if found and sn present
// wipes DB an calls result(false) otherwise
FMDB.prototype.init = async function(wipe) {
    "use strict";
    assert(!this.db && !this.opening, 'Something went wrong... FMDB is already ongoing...');

    // prefix database name with options/capabilities, plus making it dependent on the current schema.
    const dbpfx = `fm32${FMDB.perspex.substr(1)}${MurmurHash3(JSON.stringify(this.schema), 0x6f01f).toString(16)}`;

    this.crashed = false;
    this.inval_cb = false;
    this.inval_ready = false;

    if (d) {
        this.logger.log('Collecting database names...');
    }
    this.opening = true;

    return Promise.race([tSleep(3, EEXPIRED), Dexie.getDatabaseNames()])
        .then((r) => {
            if (r === EEXPIRED) {
                this.logger.warn('getDatabaseNames() timed out...');
            }
            const dbs = [];

            for (let i = r && r.length; i--;) {
                // drop only fmX related databases and skip slkv's
                if (r[i][0] !== '$' && r[i].substr(0, dbpfx.length) !== dbpfx
                    && r[i].substr(-FMDB.perspex.length) !== FMDB.perspex) {

                    dbs.push(r[i]);
                }
            }

            if (dbs.length) {
                if (d) {
                    this.logger.info(`Deleting obsolete databases: ${dbs.join(', ')}`);
                }

                return Promise.race([tSleep(5), Promise.allSettled(dbs.map(n => Dexie.delete(n)))]);
            }
        })
        .then((res) => res && self.d && this.logger.debug(res))
        .catch((ex) => this.logger.warn(ex && ex.message || ex, [ex]))
        .then(() => {
            this.db = new Dexie(dbpfx + this.name, {chromeTransactionDurability: 'relaxed'});

            this.db.version(1).stores(this.schema);
            this.tables = Object.keys(this.schema);

            return Promise.race([tSleep(15, ETEMPUNAVAIL), this.get('_sn').catch(dump)]);
        })
        .then((res) => {
            if (res === ETEMPUNAVAIL) {
                if (d) {
                    this.logger.warn('Opening the database timed out.');
                }
                throw res;
            }
            const [sn] = res || [];

            if (!wipe && sn && sn.length === 11) {
                if (d) {
                    this.logger.info(`DB sn: ${sn}`);
                }
                return sn;
            }
            if (!mBroadcaster.crossTab.master || this.crashed) {

                throw new Error(`unusable (${this.crashed | 0})`);
            }

            if (d) {
                this.logger.log("No sn found in DB, wiping...");
            }

            // eslint-disable-next-line local-rules/open -- no, this is not a window.open() call.
            return this.db.delete().then(() => this.db.open());
        })
        .catch((ex) => {
            const {db, logger} = this;

            onIdle(() => db.delete().catch(nop));
            logger.warn('Marking DB as crashed.', ex);

            this.db = false;
            this.crashed = 2;
        })
        .finally(() => {
            this.opening = false;
        });
};

// send failure event
FMDB.prototype.evento = function(message) {
    'use strict';
    message = String(message).split('\n')[0].substr(0, 380);
    if (message.includes('not allow mutations')) {
        // Ignore spammy Firefox in PBM.
        return;
    }
    const eid = 99724;
    const once = !eventlog.sent || eventlog.sent[eid] > 0;

    eventlog(eid, message, once);

    queueMicrotask(() => {
        if (eventlog.sent) {
            eventlog.sent[eid] = 1;
        }
    });
};

// drop database
FMDB.prototype.drop = async function fmdb_drop() {
    'use strict';

    if (this.db) {
        await this.invalidate();
        await this.db.delete().catch(dump);
        this.db = null;
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

/** check whether we're busy with too many pending writes */
Object.defineProperty(FMDB.prototype, 'busy', {
    get: function() {
        'use strict';
        const limit = BACKPRESSURE_FMDB_LIMIT;
        const pending = this.pending[0];

        let count = 0;
        let i = pending.length;
        while (i--) {
            const t = pending[i] && pending[i].f;

            for (let {h} = t || !1; h >= 0; h--) {
                if (t[h]) {
                    count += t[h].size || t[h].length || 0;
                    if (count > limit) {
                        if (d) {
                            console.debug('fmdb.busy', count);
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    }
});

// enqueue a table write - type 0 == addition, type 1 == deletion
// IndexedDB activity is triggered once we have a few thousand of pending rows or the sn
// (writing the sn - which is done last - completes the transaction and starts a new one)
FMDB.prototype.enqueue = function fmdb_enqueue(table, row, type) {
    "use strict";

    let c;
    let lProp = 'size';
    const ch = this.channelmap[table] || 0;

    // if needed, create new transaction at index fmdb.head
    if (!(c = this.pending[ch][this.head[ch]])) {
        c = this.pending[ch][this.head[ch]] = Object.create(null);
    }

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

    if (c[c.h]) {
        if (this.useMap[table]) {
            if (type & 1) {
                c[c.h].add(row);
            }
            else {
                c[c.h].set(row.h, row);
            }
        }
        else {
            c[c.h].push(row);
            lProp = 'length';
        }
    }
    else if (this.useMap[table]) {
        if (type & 1) {
            c[c.h] = new Set([row]);
        }
        else {
            c[c.h] = new Map([[row.h, row]]);
        }
    }
    else {
        c[c.h] = [row];
        lProp = 'length';
    }

    // force a flush when a lot of data is pending or the _sn was updated
    // also, force a flush for non-transactional channels (> 0)
    if (ch || table[0] === '_' || c[c.h][lProp] > this.limit) {
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

FMDB.prototype.getError = function(ex) {
    'use strict';
    const error = ex && ex.inner || ex || !1;
    const message = `~${error.name || ''}: ${error.message || ex && ex.message || ex}`;
    return {error, message};
};

FMDB.prototype._transactionErrorHandled = function(ch, ex) {
    'use strict';
    const tag = '$fmdb$fail$state';
    const state = sessionStorage[tag] | 0;
    const {error, message} = this.getError(ex);

    let res = false;
    let eventMsg = `$wptr:${message.substr(0, 99)}`;

    if (this.inflight) {
        if (d) {
            console.assert(this.inflight instanceof Error);
        }
        if (this.inflight instanceof Error) {
            eventMsg += ` >> ${this.inflight}`;
        }
        this.inflight = false;
    }
    this.evento(eventMsg);

    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        if (d) {
            this.logger.info("Transaction %s, retrying...", error.name, ex);

            if (mega.loadReport) {
                this.logger.info('loadReport', JSON.stringify(mega.loadReport));
            }
        }
        const {loading} = mega.is;

        res = true;
        sessionStorage[tag] = 1 + state;

        switch (state) {
            case 0:
            case 1:
            case 2:
                if (mega.loadReport && mega.loadReport.invisibleTime > 0 || !loading) {
                    sessionStorage[tag]--;
                }
                if (!this.crashed) {
                    this.state = -1;
                    this.writing = 0;
                    this.writepending(ch);
                    break;
                }
                if (!loading) {
                    res = false;
                    break;
                }
            /* fallthrough */
            case 3:
                if (!mega.nobp) {
                    localStorage.nobp = 1;
                    fm_fullreload(true);
                    break;
                }
            /* fallthrough */
            case 4:
                fm_fullreload(null, 'DB-crash');
                break;
            default:
                res = false; // let the DB crash.
                break;
        }
    }

    return res;
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
            mLoadingSpinner.show('fmdb', 'Storing account into local database...');
        }
        else if (this.tail[ch] === this.head[ch]) {
            mLoadingSpinner.hide('fmdb', true);
            this.pending[ch] = this.pending[ch].filter(Boolean);
            this.tail[ch] = this.head[ch] = 0;
            this._cache = Object.create(null);
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
        fmdb.db.transaction('rw!', fmdb.tables, () => {
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
        }).then(() => {
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
        }).catch((ex) => {
            if (d) {
                console.timeEnd('fmdb-transaction');
            }

            if (this.inval_cb && ex.name === 'DatabaseClosedError') {

                return this.inval_cb();
            }

            if (fmdb.cantransact < 0) {
                fmdb.logger.error("Your browser's IndexedDB implementation is bogus, disabling transactions.");
                fmdb.cantransact = 0;
                fmdb.writing = 0;
                fmdb.writepending(ch);
            }
            else if (!fmdb._transactionErrorHandled(ch, ex)) {
                // FIXME: retry instead? need statistics.
                fmdb.logger.error("Transaction failed, marking DB as crashed", ex);
                fmdb.state = -1;
                fmdb.invalidate();
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

                        fmdb.evento(`$wpsn:${e}`);
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
                                      t.t & 1 ? 'del' : 'put', t[t.t].size || t[t.t].length, table, ch, fmdb.state);
                }

                // if we are on a non-transactional channel or the _sn is being updated,
                // request a commit after the operation completes.
                if (ch || table[0] == '_') {
                    fmdb.commit = true;
                    fmdb.sn_Set = 1;
                }

                // record what we are sending...
                fmdb.inflight = true;

                // is this an in-band _sn invalidation, and do we have a callback set? arm it.
                if (fmdb.inval_cb && t.t & 1 && table[0] === '_') {
                    fmdb.inval_ready = true;
                }

                // ...and send update off to IndexedDB for writing
                write(table, t[t.t], t.t++ & 1 ? 'bulkDelete' : 'bulkPut');

                // we don't send more than one transaction (looking at you, Microsoft!)
                if (!fmdb.state) {
                    fmdb.inflight = t;
                    return;
                }
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
        if ('size' in data) {
            // chrome90: 5ms per 1m
            data = [...data.values()];
        }
        const limit = window.fminitialized ? fmdb.limit >> 3 : data.length + 1;

        if (FMDB.$usePostSerialz) {
            if (d) {
                console.time('fmdb-serialize');
            }

            if (op === 'bulkPut') {
                if (!data[0].d || fmdb._raw(data[0])) {
                    for (let x = data.length; x--;) {
                        fmdb.serialize(table, data[x]);
                    }
                }
                else if (d) {
                    fmdb.logger.debug('No data serialization was needed, retrying?', data);
                }
            }
            else if (!(data[0] instanceof ArrayBuffer)) {
                for (let j = data.length; j--;) {
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
                    tSleep(3).then(dispatchputs);
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

        if (fmdb.state > 0 && !fmdb.crashed) {
            if (d) {
                fmdb.logger.info('We are transactional, attempting to retry...');
            }
            fmdb.inflight = ex;
            return;
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

        fmdb.evento(ex);
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

// tables storing pending writes as Map() instances.
FMDB.prototype.useMap = Object.assign(Object.create(null), {f: true, tree: true});

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

        if (f.fa) {
            t.fa = f.fa;
            delete f.fa;
        }

        // Remove other garbage
        if ('seen' in f) {
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
        delete usr.h;
        delete usr.p;
        delete usr.t;
        delete usr.m2;
        delete usr.ats;
        delete usr.name;
        delete usr.pubk;
        delete usr.avatar;
        delete usr.nickname;
        delete usr.presence;
        delete usr.lastName;
        delete usr.firstName;
        delete usr.presenceMtime;
    },

    mcf: function(mcf) {
        'use strict';
        // mcf may contain 'undefined' values, which should NOT be set, otherwise they may replace the mcfCache
        var cache = {};
        var keys = ['id', 'cs', 'g', 'u', 'ts', 'ct', 'ck', 'f', 'm', 'mr'];
        for (var idx = keys.length; idx--;) {
            var k = keys[idx];

            if (mcf[k] !== undefined) {
                cache[k] = mcf[k];
            }
        }
        // transient properties, that need to be resetted
        cache.n = mcf.n || undefined;

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
        if (index.fa) {
            f.fa = index.fa;
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

        if (usr.c === 1) {
            usr.t = 1;
            usr.h = usr.u;
            usr.p = 'contacts';
        }
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
FMDB.prototype.get = async function fmdb_get(table, chunked) {
    "use strict";
    if (this.crashed > 1) {
        // a read operation failed previously
        return [];
    }

    if (d) {
        this.logger.log("Fetching entire table %s...", table, chunked ? '(chunked)' : '');
    }

    if (chunked) {
        const limit = 8192;
        const {keyPath} = this.db[table].schema.primKey;

        let res = await this.db[table].orderBy(keyPath).limit(limit).toArray();
        while (res.length) {
            let last = res[res.length - 1][keyPath].slice(0);

            this.normaliseresult(table, res);
            last = chunked(res, last) || last;

            res = res.length >= limit && await this.db[table].where(keyPath).above(last).limit(limit).toArray();
        }
        return;
    }

    const r = await this.db[table].toArray().catch(dump);
    if (r) {
        this.normaliseresult(table, r);
    }
    else {
        if (d && !this.crashed) {
            this.logger.error("Read operation failed, marking DB as read-crashed");
        }
        await this.invalidate(1);
    }

    return r || [];
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
                if (d > 1) {
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
FMDB.prototype.getbykey = async function fmdb_getbykey(table, index, anyof, where, limit) {
    'use strict';
    let bulk = false;
    let options = false;
    if (typeof index !== 'string') {
        options = index;
        index = options.index;
        anyof = anyof || options.anyof;
        where = where || options.where;
        limit = limit || options.limit;
    }

    if (this.crashed > 1 || anyof && !anyof[1].length) {
        return [];
    }

    let p = false;
    const ch = this.channelmap[table] || 0;
    const writing = this.writing || this.head[ch] !== this.tail[ch];
    const debug = d && (x => (m, ...a) => this.logger.warn(`[${x}] ${m}`, ...a))(Math.random().toString(28).slice(-7));

    if (debug) {
        debug(`Fetching table ${table}...${writing ? '\u26a1' : ''}`, options || where || anyof && anyof.flat());
    }

    let i = 0;
    let t = this.db[table];

    if (!index) {
        // No index provided, fallback to primary key
        index = t.schema.primKey.keyPath;
    }

    if (table === 'f' && index === 'h' && mega.infinity) {
        p = [];

        if (anyof && (anyof[0] === 'p' || anyof[0] === 'h')) {
            p.push(...anyof[1]);
        }
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
            else if (options.offset) {
                t = t.where(anyof[0]).anyOf(anyof[1]);
            }
            else {
                let flat = a => a.flat();
                if (limit) {
                    flat = (lmt => a => a.flat().slice(0, lmt))(limit);
                    limit = false;
                }
                t = Promise.all(anyof[1].map(k => t.where(anyof[0]).equals(k).toArray())).then(flat);
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
        for (let k = where.length; k--;) {
            // encrypt the filter values (logical AND is commutative, so we can reverse the order)
            if (typeof where[k][1] === 'string') {
                if (p && where[k][0] === 'p') {
                    p.push(where[k][1]);
                }
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

    // eslint-disable-next-line complexity
    const r = await t.then((r) => {
        // now scan the pending elements to capture and return unwritten updates
        // FIXME: typically, there are very few or no pending elements -
        // determine if we can reduce overall CPU load by replacing the
        // occasional scan with a constantly maintained hash for direct lookups?
        let j, f, k;
        let match = 0;
        const isMap = this.useMap[table];
        const pending = this.pending[ch];
        const matches = Object.create(null);
        const lProp = isMap ? 'size' : 'length';

        if (bulk) {
            for (let i = r.length; i--;) {
                if (!r[i]) {
                    // non-existing bulkGet result.
                    r.splice(i, 1);
                }
            }
        }
        const dbRecords = !!r.length;

        console.time(`dirty-${pending.length}`);

        // iterate transactions in reverse chronological order
        for (let tid = pending.length; tid--;) {
            const t = pending[tid] && pending[tid][table];

            // any updates pending for this table?
            if (t && (t[t.h] && t[t.h][lProp] || t[t.h - 1] && t[t.h - 1][lProp])) {
                // debugger
                // examine update actions in reverse chronological order
                // FIXME: can stop the loop at t.t for non-transactional writes
                for (let a = t.h; a >= 0; a--) {
                    /* eslint-disable max-depth */
                    if (t[a]) {
                        const data = isMap ? [...t[a].values()] : t[a];

                        if (a & 1) {
                            // no need to record a deletion unless we got db entries
                            if (dbRecords) {
                                // deletion - always by bare index
                                for (j = data.length; j--;) {
                                    f = this._value(data[j]);

                                    if (typeof matches[f] == 'undefined') {
                                        // boolean false means "record deleted"
                                        matches[f] = false;
                                        match++;
                                    }
                                }
                            }
                        }
                        else {
                            // addition or update - index field is attribute
                            // iterate updates in reverse chronological order
                            // (updates are not commutative)
                            for (j = data.length; j--;) {
                                const update = data[j];

                                f = this._value(update[index]);
                                if (typeof matches[f] == 'undefined') {
                                    // check if this update matches our criteria, if any
                                    if (where) {
                                        for (k = where.length; k--;) {
                                            if (!this.compare(table, where[k][0], where[k][1], update)) {
                                                break;
                                            }
                                        }

                                        // mismatch detected - record it as a deletion
                                        if (k >= 0) {
                                            // no need to record a deletion unless we got db entries
                                            if (dbRecords) {
                                                match++;
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
                                            match++;
                                            continue;
                                        }
                                    }
                                    else if (anyof) {
                                        // does this update modify a record matched by the anyof inclusion list?
                                        for (k = anyof[1].length; k--;) {
                                            if (this.compare(table, anyof[0], anyof[1][k], update)) {
                                                break;
                                            }
                                        }

                                        // no match detected - record it as a deletion
                                        if (k < 0) {
                                            // no need to record a deletion unless we got db entries
                                            if (dbRecords) {
                                                match++;
                                                matches[f] = false;
                                            }
                                            continue;
                                        }
                                    }

                                    match++;
                                    matches[f] = update;
                                }
                            }
                        }
                    }
                }
            }
        }
        console.timeEnd(`dirty-${pending.length}`);

        // scan the result for updates/deletions/additions arising out of the matches found
        if (match) {
            if (debug) {
                debug('pending matches', match, r.length);
            }

            for (i = r.length; i--;) {
                // if this is a binary key, convert it to string
                f = this._value(r[i][index]);

                if (typeof matches[f] !== 'undefined') {
                    if (matches[f] === false) {
                        // a returned record was deleted or overwritten with
                        // keys that fall outside our where clause
                        r.splice(i, 1);
                    }
                    else {
                        // a returned record was overwritten and still matches
                        // our where clause
                        r[i] = this.clone(matches[f]);
                        matches[f] = undefined;
                    }
                }
            }

            // now add newly written records
            for (t in matches) {
                if (matches[t]) {
                    r.push(this.clone(matches[t]));
                }
            }
        }

        // filter out matching records
        if (where) {
            for (i = r.length; i--;) {
                for (k = where.length; k--;) {
                    if (!this.compare(table, where[k][0], where[k][1], r[i])) {
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

        if (r.length) {
            this.normaliseresult(table, r);
        }
        return r;
    }).catch((ex) => {
        if (debug && !this.crashed) {
            debug("Read operation failed, marking DB as read-crashed", ex);
        }
    });

    if (!r) {
        await this.invalidate(1);
    }
    else if (p.length) {
        const s = new Set();

        // prepare to request missing nodes.
        for (let x, i = r.length; i--;) {
            const n = r[i];

            if ((x = p.indexOf(n.h)) >= 0) {
                s.add(n.p);
                p.splice(x, 1);
            }

            if ((x = p.indexOf(n.p)) >= 0) {
                p.splice(x, 1);
            }
        }

        for (let i = r.length; i--;) {
            if (s.has(r[i].h)) {
                s.delete(r[i].h);
            }
        }
        p.push(...s);

        if (p.length) {
            await api.tree(p);
        }
    }
    return r || [];
};

// invokes getbykey in chunked mode
FMDB.prototype.getchunk = async function(table, options, onchunk) {
    'use strict';
    if (typeof options === 'function') {
        onchunk = options;
        options = Object.create(null);
    }
    options.limit = options.limit || 1e4;

    var mng = options.offset === undefined;
    if (mng) {
        options.offset = -options.limit;
    }

    while (true) {
        if (mng) {
            options.offset += options.limit;
        }
        const {limit} = options;
        const r = await this.getbykey(table, options);

        if (onchunk(r) === false) {
            return EAGAIN;
        }

        if (r.length < limit) {
            break;
        }
    }
};

// simple/fast/non-recursive object cloning
FMDB.prototype.clone = function fmdb_clone(o) {
    'use strict';

    o = {...o};

    if (!o.d || 'byteLength' in o.d) {

        for (const k in o) {

            if (o[k] && o[k].byteLength) {

                o[k] = o[k].slice(0);
            }
        }
    }

    return o;
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
 * @param {ArrayBuffer} a1 first item to compare
 * @param {ArrayBuffer} a2 second item to compere
 * @returns {Boolean} true if both are deep equal
 */
FMDB.prototype.equal = function(a1, a2) {
    'use strict';
    const len = a1.byteLength;

    if (len === a2.byteLength) {
        a1 = new Uint8Array(a1);
        a2 = new Uint8Array(a2);

        let i = 0;
        while (i < len) {
            if (a1[i] !== a2[i]) {
                return false;
            }
            ++i;
        }

        return true;
    }

    return false;
};

/**
 * Check whether two indexedDB-stored values are equal.
 * @param {String} a1 first item to compare
 * @param {String} a2 second item to compere
 * @returns {Boolean} true if both are deep equal
 */
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
    let eq = store[key];

    if (this._raw(store)) {

        if (!this._cache[eq]) {
            this._cache[eq] = this.toStore(eq);
        }
        eq = this._cache[eq];
    }

    return this.equal(value, eq);
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
FMDB.prototype.invalidate = promisify(function(resolve, reject, readop) {
    'use strict';

    if (d) {
        console.group(' *** invalidating fmdb *** ', this.crashed);
        console.trace();
    }

    if (this.crashed) {
        return resolve();
    }

    var channels = Object.keys(this.pending);

    // erase all pending data
    for (var i = channels.length; i--;) {
        this.head[i] = 0;
        this.tail[i] = 0;
        this.pending[i] = [];
    }
    this._cache = Object.create(null);

    // clear the writing flag for the next del() call to pass through
    this.writing = null;

    // enqueue the final _sn deletion that will mark the DB as invalid
    this.del('_sn', 1);

    // prevent further reads or writes
    this.crashed = readop ? 2 : 1;

    // timeout invalidation process if it does not complete in a timely manner...
    let timer;
    (timer = tSleep(9))
        .then(() => {
            this.logger.error('FMDB invalidation timed out, moving on...');
            tryCatch(() => this.inval_cb())();
            return tSleep(2).then(resolve);
        })
        .catch(dump);

    // set completion callback
    this.inval_cb = function() {
        // XXX: Just invalidating the DB may causes a timeout trying to open it on the next page load, since we
        // do attempt to delete it when no sn is found, which would take a while to complete for large accounts.
        // This is currently the 20% of hits we do receive through 99724 so from now on we will hold the current
        // session until the DB has been deleted.
        if (readop || !this.db) {
            onIdle(resolve);
        }
        else {
            this.db.delete().finally(resolve);
        }

        this.pending = [[]];
        mLoadingSpinner.hide('fmdb');

        if (d) {
            console.groupEnd();
        }

        if (timer) {
            timer.abort();
            timer = null;
        }
    };
});


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
class MegaDexie extends Dexie {
    constructor(aUniqueID, ...args) {
        const dbname = MegaDexie.getDBName(...args);
        super(dbname, {chromeTransactionDurability: 'relaxed'});

        this.__dbUniqueID = this.__fromUniqueID(aUniqueID + args[0]);
        this.__rememberDBName(dbname);

        if (args[3]) {
            // Schema given.
            this.version(1).stores(args[3]);
        }

        if (d) {
            this._uname = args[0];
        }

        const b = (this.__dbUniqueID & 0xdf).toString(16);
        this.logger = new MegaLogger(() => `${this[Symbol.toStringTag]}(${this})`, {
            levelColors: {
                ERROR: `#${b}2222`,
                DEBUG: `#4444${b}`,
                WARN: `#${b}${b}33`,
                INFO: `#00${b}00`,
                LOG: '#444'
            }
        });

        this.onerror = null;
        Object.defineProperty(this, '__bulkPutQueue', {value: Object.create(null)});
        Object.defineProperty(this, '__ident_0', {value: `megadexie.${this.__dbUniqueID}-${++mIncID}`});
    }

    get [Symbol.toStringTag]() {
        return 'MegaDexie';
    }

    toString() {
        return String(this._uname || this.name || this.__ident_0);
    }

    put(table, data) {

        if (this.__bulkPutQueue[table]) {

            // @todo deduplicate? benchmark!
            this.__bulkPutQueue[table].push(data);
        }
        else {
            this.__bulkPutQueue[table] = [data];
            Object.defineProperty(this.__bulkPutQueue[table], 'promise', {value: mega.promise});
        }

        delay(this.__ident_0 + table, () => {
            const queue = this.__bulkPutQueue[table];
            delete this.__bulkPutQueue[table];

            if (!(queue && queue.length)) {
                this.logger.assert(false, 'invalid queue state.', queue);
                return;
            }

            if (d) {
                this.logger.debug(`Storing ${queue.length} entries...`);
            }

            const release = (res, error) => {
                queue.length = 0;
                queue.promise[error ? 'reject' : 'resolve'](error || res);
            };

            this.fireOperationPromise(() => this[table].bulkPut(queue).then(release))
                .catch((ex) => {
                    let res = 0;
                    let failure = new MEGAException(ex.inner || ex, this, ex.name);

                    if (this.onerror) {
                        res = this.onerror(ex);
                        if (res) {
                            failure = null;
                        }
                    }

                    this.error = ex;
                    return release(res, failure);
                });
        }, 911);

        return this.__bulkPutQueue[table].promise;
    }

    async fireOperationPromise(aOperationCallback) {

        return aOperationCallback()
            .catch(async(ex) => {
                if (d) {
                    this.logger.error(ex);
                }

                if (ex.name === 'DatabaseClosedError') {
                    // eslint-disable-next-line local-rules/open
                    const res = await this.open().then(aOperationCallback);

                    if (d) {
                        this.logger.info('DB closed unexpectedly and re-opened, resuming operation...', res);
                    }
                    return res;
                }

                throw ex;
            });
    }

    async export() {
        return MegaDexie.export(this);
    }

    async import(blob) {
        return MegaDexie.import(blob, this);
    }

    static async import(aFile, aDBInstance) {
        const buf = aFile.name.endsWith('.gz') ? await M.decompress(aFile) : await M.toArrayBuffer(aFile);
        const len = buf.byteLength;
        assert(len > 0x10000);

        const view = new DataView(buf);
        assert(view.getUint32(0) === 0x13064D44, 'Invalid file.');
        assert(view.getUint8(len - 17) === 0xEF, 'File corrupted(?)');

        let offset = 8;
        const tde = new TextDecoder();
        const readValue = () => {
            const b = view.getUint8(offset);
            const l = b >> 4;
            const t = b & 15;

            const size = view[`getUint${l << 3}`](++offset, true);
            offset += l;

            let data = buf.slice(offset, offset + size);
            if (t > 1) {
                data = tde.decode(data);

                switch (t) {
                    case 2:
                        data = parseInt(data, 36);
                        break;
                    case 4:
                        data = JSON.parse(data);
                        break;
                }
            }

            offset += size;
            return data;
        };
        const settings = readValue();
        assert('schema' in settings);

        const key = [
            view.getInt32(len - 16, true),
            view.getInt32(len - 12, true),
            view.getInt32(len - 8, true),
            view.getInt32(len - 4, true)
        ];
        const {u_k: uk1, u_k_aes: uk2} = window;
        const keyMatch = JSON.stringify(uk1) === JSON.stringify(key);

        if (aDBInstance) {
            // @todo re-encrypt'em(?)
            assert(keyMatch, 'Key mismatch, cannot import.');
        }
        else {
            if (!keyMatch) {
                u_k = key;
                u_k_aes = new sjcl.cipher.aes(u_k);
            }
            const name = `DBImport${Math.random().toString(36)}`;

            if (settings.schema.lru) {
                // eslint-disable-next-line no-use-before-define
                aDBInstance = await LRUMegaDexie.create(name);
            }
            else {
                aDBInstance = new MegaDexie('DBIMPORT', name, 'imp_', true, settings.schema);
            }

            if (!keyMatch) {
                u_k = uk1;
                u_k_aes = uk2;
            }
        }

        offset = 0x10000;
        while (view.getUint8(offset) !== 0xEF) {
            const bulk = [];
            const table = readValue();

            while (view.getUint8(offset) !== 0xFF) {
                const data = {};

                while (view.getUint8(offset) !== 0xFE) {
                    const key = readValue();
                    data[key] = readValue();
                }

                offset++;
                bulk.push(data);
            }

            offset++;
            await aDBInstance[table].bulkPut(bulk);
        }

        return aDBInstance;
    }

    static async export(aDBInstance) {
        let offset = 0;
        let buf = new Uint8Array(0x1000000);
        const tde = new TextEncoder();
        const gbl = (n) => n < 256 ? 1 : n < 65536 ? 2 : 4;
        const rnd = (s, b = 0x100000) => (s + b & -b) >>> 0;
        const types = {buffer: 1, number: 2, string: 3, object: 4};
        const put = (data, offset) => {
            if (typeof data === 'number') {
                data = new window[`Uint${gbl(data) << 3}Array`]([data]);
            }
            if (offset + data.byteLength > buf.byteLength) {
                const tmp = new Uint8Array(rnd(buf.byteLength + data.byteLength));
                tmp.set(buf);
                buf = tmp;
            }
            buf.set(new Uint8Array(data.buffer || data), offset);
            return offset + data.byteLength;
        };
        const add = (data, pos) => {
            let t = data.byteLength >= 0 ? 'buffer' : typeof data;
            if (t !== 'buffer') {
                if (t === 'number') {
                    data = data.toString(36);
                }
                else if (t !== 'string') {
                    t = 'object';
                    data = JSON.stringify(data);
                }
                data = tde.encode(data);
            }

            const j = gbl(data.byteLength);
            const p = put(data, put(data.byteLength, put(j << 4 | types[t], pos || offset)));
            if (!pos) {
                offset = p;
            }
        };

        add('MDBv01');
        offset = 0x10000;

        const {tables} = aDBInstance;
        const schema = Object.create(null);

        assert(aDBInstance instanceof Dexie && tables.length);

        for (let i = 0; i < tables.length; ++i) {
            const s = [];
            const table = tables[i];
            const {db, name, schema: {primKey, indexes = false}} = table;

            if (primKey) {
                s.push(primKey.unique ? `&${primKey.name}` : primKey.src);
            }
            if (indexes.length) {
                s.push(...indexes.map((i) => i.src));
            }

            add(name);
            schema[name] = s.join(', ');

            const res = await db[name].toArray();
            for (let i = res.length; i--;) {
                const e = res[i];

                for (const k in e) {
                    add(k);
                    add(e[k]);
                }

                put(0xfe, offset++);
            }

            put(0xff, offset++);
        }

        add({schema}, 8);
        buf = buf.slice(0, put(new Uint32Array(u_k), put(0xef, offset)));

        const {_uname, name} = aDBInstance;
        const data = await M.compress(buf).catch(nop);
        const filename = `mega-dbexport.${_uname || name || aDBInstance}`;

        return M.saveAs(data || buf, data ? `${filename}.gz` : filename);
    }
}

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
        tSleep(40).then(() => {
            var databases = [];

            if (d) {
                console.debug('Checking stale databases...');
            }

            Promise.resolve(indexedDB.databases())
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
        });
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

/**
 * @name getDatabaseNames
 * @memberOf MegaDexie
 */
lazy(MegaDexie, 'getDatabaseNames', () => {
    'use strict';
    if (typeof Object(window.indexedDB).databases === 'function') {
        return async() => {
            const dbs = await indexedDB.databases();
            return dbs.map(obj => obj.name);
        };
    }
    return async() => {
        const dbs = await MegaDexie.__knownDBNames.toArray();
        return dbs.map(obj => obj.v);
    };
});

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

// --------------------------------------------------------------------------

class LRUMegaDexie extends MegaDexie {
    constructor(name, options = 4e3) {
        options = typeof options === 'number' ? {limit: options} : options;

        super('LRUMMDB', name, options.pfx || 'lru_', true, {
            lru: '&k',
            data: '&h, ts'
        });

        this.options = options;

        if (LRUMegaDexie.wSet) {
            LRUMegaDexie.wSet.add(this);
        }

        LRUMegaDexie.hookErrorHandlers(this);
    }

    get [Symbol.toStringTag]() {
        return 'LRUMegaDexie';
    }

    async setup(options = false, key = null) {

        if (key) {
            const algo = {
                ...key.algorithm,
                tagLength: 32,
                iv: options.iv || new Uint32Array(u_k_aes._key[0].slice(4, 7))
            };
            const view = new DataView(algo.iv.buffer);
            let ctr = Math.random() * 0x1000000 >>> 0;

            Object.defineProperties(this, {
                encrypt: {
                    value: async(data) => {
                        view.setUint32(0, ++ctr, true);
                        const encrypted = new Uint8Array(data.byteLength + 8);
                        const payload = new DataView(encrypted.buffer, 0, 4);
                        payload.setUint32(0, ctr, true);
                        algo.additionalData = payload;
                        encrypted.set(new Uint8Array(await crypto.subtle.encrypt(algo, key, data)), 4);
                        return encrypted.buffer;
                    }
                },
                decrypt: {
                    value: async(data) => {
                        const payload = new DataView(data, 0, 4);
                        const ctr = payload.getUint32(0, true);
                        view.setUint32(0, ctr, true);
                        algo.additionalData = payload;
                        return crypto.subtle.decrypt(algo, key, new DataView(data, 4))
                            .catch((ex) => {
                                const msg = `LRUMegaDexie(${this}) decrypt error: ${ex.message || ex.name}`;
                                throw new MEGAException(msg, ex, ex.name || 'DataCloneError');
                            });
                    }
                }
            });
        }

        return this.update(options);
    }

    async update(options) {
        this.options = Object.assign({}, (await this.lru.get('options') || {}).value, this.options, options);

        delete this.options.iv;
        const promises = [this.lru.put({k: 'options', value: Object.setPrototypeOf(this.options, null)})];

        for (const k in this.options) {
            promises.push(this.lru.put({k, value: this.options[k]}));
        }

        this.drain();
        await Promise.all(promises);
        return this;
    }

    async find(h) {
        return this.data.exists(h);
    }

    async has(h) {
        return !!await this.find(h);
    }

    async get(h) {
        // @todo FIXME improve Collection.modify() to NOT retrieve WHOLE rows
        // const coll = this.data.where('h').equals(h);
        // const {data} = await coll.first() || false;
        // return data && (await Promise.all([coll.modify({ts: Date.now()}), this.decrypt(data)]))[1];

        const {data} = await this.data.get(h) || false;
        if (data) {
            this.put('data', {h, data, ts: Date.now()}).catch(dump);
            return this.decrypt(data);
        }
    }

    async set(h, data) {
        assert(data.byteLength > 16);
        data = await this.encrypt(data);
        delay(this.name, () => this.drain(), 4e3);
        return this.put('data', {h, data, ts: Date.now()});
    }

    async bulkGet(bulk, err = {}) {
        const now = Date.now();
        const res = Object.create(null);

        if (bulk) {
            bulk = await this.fireOperationPromise(() => this.data.bulkGet(bulk));
        }
        else {
            bulk = await this.fireOperationPromise(() => this.data.orderBy('ts').toArray());
        }

        for (let i = bulk.length; i--;) {
            const e = bulk[i];

            if (e) {
                const value = await this.decrypt(e.data)
                    .catch((ex) => {
                        err[e.h] = {ts: new Date(e.ts).toISOString(), bytes: e.data.byteLength, ex};
                    });

                if (value) {
                    e.ts = now;
                    res[e.h] = value;
                    continue;
                }
            }

            bulk.splice(i, 1);
        }


        if (d && $.len(err)) {
            console.group(`LRUMegaDexie.bulkGet(${this}) errors found...`);
            console.table(err);
            console.groupEnd();
        }

        this.data.bulkPut(bulk)
            .catch((ex) => {
                if (d) {
                    console.warn(`${this}: ${ex}`, ex);
                }
                return bulk.map((e) => this.put('data', e));
            });

        return res;
    }

    drain() {
        this.data.count()
            .then(count => count > this.options.limit && this.data.orderBy('ts').limit(count / 10 | 1).primaryKeys())
            .then(keys => keys && this.data.bulkDelete(keys))
            .catch(dump);
    }

    encrypt(data) {
        return data;
    }

    decrypt(data) {
        return data;
    }
}

/** @property LRUMegaDexie.create */
lazy(LRUMegaDexie, 'create', () => {
    'use strict';
    const parity = lazy(Object.create(null), 'key', () => {
        return crypto.subtle.importKey(
            "raw",
            new Uint32Array(u_k_aes._key[0].slice(0, 4)),
            {name: "AES-GCM"},
            false,
            ["encrypt", "decrypt"]
        );
    });

    const extend = (obj) => {
        if (obj instanceof LRUMap) {
            const {get, set} = obj;

            Object.defineProperties(obj, {
                get: {
                    value: async function(...args) {
                        return get.apply(this, args);
                    }
                },
                bulkGet: {
                    value: async function(bulk) {
                        return bulk.reduce((target, e) => {
                            const value = get.call(this, e);
                            if (value) {
                                target[e] = value;
                            }
                            return target;
                        }, Object.create(null));
                    }
                },
                set: {
                    value: async function(...args) {
                        return set.apply(this, args);
                    }
                },
                find: {
                    value: async function(keys) {
                        const res = [];
                        for (let i = keys.length; i--;) {
                            if (this.has(keys[i])) {
                                res.push(keys[i]);
                            }
                        }
                        return res;
                    }
                }
            });
        }

        return obj;
    };

    return async(name, options) => {
        const db = await new LRUMegaDexie(name, options).setup(options, await parity.key).catch(dump);
        if (d && !db) {
            console.warn('LRU cannot be backed by DB, using memory-only instead...', name);
        }
        return extend(db || new LRUMap(Math.max(256, (options && options.limit || options) >> 3)));
    };
});

Object.defineProperties(LRUMegaDexie, {
    wSet: {
        value: self.d > 0 && new IWeakSet()
    },
    errorHandler: {
        value: (ev) => {
            'use strict';
            const dbname = ev.target && ev.target.name || 'unk';
            const message = String(((ev.target || ev).error || ev.inner || ev).message || ev.type || ev);

            if (d) {
                console.warn(`LRUMegaDexie(${dbname}) error:${ev.type || ev.name}`, message, [ev]);
            }

            if (ev.type !== 'close' && !/\s(?:clos[ei]|delet[ei])/.test(message)) {
                eventlog(99748, message.split('\n')[0].substr(0, 300), true);
            }

            // drop all LRU-based databases.
            LRUMegaDexie.drop().catch(dump);
        }
    },
    hookErrorHandlers: {
        value: (lru) => {
            'use strict';
            if (!lru.idbdb) {
                return lru.on('ready', () => LRUMegaDexie.hookErrorHandlers(lru));
            }
            const {onabort, onerror} = lru.idbdb;

            lru.idbdb.onabort = lru.idbdb.onerror = (ev) => {
                LRUMegaDexie.errorHandler(ev);
                return ev.type === 'abort' ? onabort && onabort(ev) : onerror && onerror(ev);
            };

            lru.on('close', lru.onerror = LRUMegaDexie.errorHandler);
        }
    },
    drop: {
        value: async() => {
            'use strict';
            const dbs = await MegaDexie.getDatabaseNames();
            return Promise.all(dbs.filter(n => n.startsWith('lru_')).map(n => Dexie.delete(n)));
        }
    },
    verify: {
        value: async() => {
            'use strict';
            const stats = {};

            for (const db of LRUMegaDexie.wSet) {
                const err = {};
                const res = await db.bulkGet(0, err);
                const nid = `${db.name} (${db._uname})`;
                const ecn = $.len(err);
                const cnt = $.len(res) + ecn;

                let bytes = 0;
                let errors = 0;

                if (ecn) {
                    bytes = Object.values(err)
                        .reduce((n, o) => {
                            n += o.bytes;
                            return n;
                        }, 0);
                    errors = `${ecn} (${parseFloat(ecn * 100 / cnt).toFixed(2)}%, ${bytesToSize(bytes)})`;
                }

                for (const k in res) {
                    bytes += res[k].byteLength;
                }

                if (bytes > 1e6) {
                    bytes = `${bytes} (${bytesToSize(bytes)})`;
                }
                stats[nid] = {bytes, records: cnt, errors};
            }
            console.table(stats);
        }
    },
    size: {
        get() {
            'use strict';
            const {promise} = mega;

            let name;
            const seen = {total: {bytes: 0}};
            const store = (row) => {
                const {byteLength} = row.data;
                seen[name].bytes += byteLength;
                seen.total.bytes += byteLength;
            };

            (async(obj) => {
                for (const db of obj) {
                    name = `${db.name} (${db._uname})`;
                    seen[name] = {bytes: 0};
                    await db.data.each(store);
                }
                console.table(seen);
                promise.resolve(seen.total);
            })(LRUMegaDexie.wSet);

            return promise;
        }
    }
});

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

/**
 * Helper functions to retrieve nodes from indexedDB.
 * @name dbfetch
 * @memberOf window
 */
Object.defineProperty(self, 'dbfetch', (function() {
    'use strict';
    const node_inflight = new Set();
    const tree_inflight = Object.create(null);

    const getNode = (h, cb) => {
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

    const emplace = (r, noc) => {
        for (let i = r.length; i--;) {
            emplacenode(r[i], noc);
        }
    };

    const showLoading = (h) => {
        $.dbOpenHandle = h;
        document.documentElement.classList.add('wait-cursor');
    };
    const hideLoading = (h) => {
        if ($.dbOpenHandle === h) {
            $.dbOpenHandle = false;
            document.documentElement.classList.remove('wait-cursor');
        }
    };

    const dbfetch = Object.assign(Object.create(null), {
        /**
         * Retrieve root nodes only, on-demand node loading mode.
         * or retrieve whole 'f' table in chunked mode.
         * @returns {Promise} fulfilled on completion
         * @memberOf dbfetch
         */
        async init() {

            if (M.RootID || !mBroadcaster.crossTab.master) {
                // fetch the whole cloud on slave tabs..
                return M.RootID || fmdb.get('f', (res) => emplace(res));
            }

            // fetch the three root nodes
            const r = await fmdb.getbykey('f', 'h', ['s', ['-2', '-3', '-4']]);

            emplace(r);
            if (!r.length || !M.RootID) {
                if (sessionStorage.dbcrpt) {
                    delete sessionStorage.dbcrpt;
                    throw new Error('indexedDB corruption!');
                }

                if (d) {
                    console.warn('Force-reloading due to indexedDB corruption...', r);
                }
                sessionStorage.dbcrpt = 1;
                return fm_fullreload(true);
            }

            // fetch all top-level nodes
            emplace(await fmdb.getbykey('f', 'h', ['p', [M.RootID, M.InboxID, M.RubbishID]]));
        },

        /**
         * Check whether a node is currently loading from DB.
         * @param {String} handle The ufs-node handle
         * @returns {Boolean} whether it is.
         */
        isLoading: function(handle) {
            return !!(tree_inflight[handle] || node_inflight.lock || node_inflight.size && node_inflight.has(handle));
        },

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d in streaming mode
         *
         * @param {String} handle Node handle
         * @param {MegaPromise} [waiter] waiting parent
         * @returns {*|MegaPromise}
         * @memberOf dbfetch
         */
        open: promisify((resolve, reject, handle, waiter) => {
            const fail = (ex) => {
                reject(ex);
                hideLoading(handle);
                queueMicrotask(() => {
                    if (tree_inflight[handle] === waiter) {
                        delete tree_inflight[handle];
                    }
                    waiter.reject(ex);
                });
            };
            const done = (res) => {
                if (resolve) {
                    resolve(res);
                }
                hideLoading(handle);
                queueMicrotask(() => {
                    if (tree_inflight[handle] === waiter) {
                        delete tree_inflight[handle];
                    }
                    waiter.resolve(handle);
                });
            };

            // Dear ESLint, this is not a window.open call.
            // eslint-disable-next-line local-rules/open
            let ready = (n) => dbfetch.open(n.p).catch(nop);

            if (typeof handle !== 'string' || handle.length !== 8) {
                return resolve(handle);
            }
            var silent = waiter === undefined;

            if (silent) {
                waiter = mega.promise;
                waiter.catch(nop);
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

            getNode(handle, (n) => {
                if (!n) {
                    return fail(ENOENT);
                }
                if (!n.t || M.c[n.h]) {
                    return ready(n).finally(done);
                }
                if (!silent) {
                    showLoading(handle);
                }

                let promise;
                const opts = {
                    limit: 4,
                    offset: 0,
                    where: [['p', handle]]
                };
                const ack = (res) => {
                    if (ready) {
                        promise = ready(n).finally(resolve);
                        ready = resolve = null;
                    }
                    else if (res) {
                        promise.finally(() => {
                            newnodes = newnodes.concat(res);
                            queueMicrotask(() => {
                                M.updFileManagerUI().dump(`dbf-open-${opts.i || handle}`);
                            });
                        });
                    }
                    return promise;
                };

                if (d) {
                    opts.i = `${makeid(9)}.${handle}`;
                }

                fmdb.getchunk('f', opts, (r) => {
                    if (!opts.offset) {
                        M.c[n.h] = M.c[n.h] || Object.create(null);
                    }

                    opts.offset += opts.limit;
                    if (opts.limit < 4096) {
                        opts.limit <<= 2;
                    }

                    emplace(r);
                    ack(r);

                }).catch(dump).finally(() => (promise || ack()).finally(done));
            });
        }),

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d
         *
         * @param {String} parent  Node handle
         * @returns {Promise} none
         * @memberOf dbfetch
         */
        async get(parent) {

            if (d > 1) {
                console.warn('dbfetch.get(%s)', parent);
            }

            if (typeof parent !== 'string') {
                throw new Error(`Invalid parent, cannot fetch children for ${parent}`);
            }

            // is this a user handle or a non-handle? no fetching needed.
            while (parent.length === 8) {

                // has the parent been fetched yet?
                if (!M.d[parent]) {
                    const r = await fmdb.getbykey('f', 'h', ['h', [parent]]);
                    if (r.length > 1) {
                        console.error(`Unexpected number of result for node ${parent}`, r.length, r);
                    }

                    // providing a 'true' flag so that the node isn't added to M.c,
                    // otherwise crawling back to the parent won't work properly.
                    emplace(r, true);

                    if (!M.d[parent]) {
                        // no parent found?!
                        break;
                    }
                }

                // have the children been fetched yet?
                if (M.d[parent].t && !M.c[parent]) {
                    // no: do so now.
                    await this.tree([parent], 0);

                    if (!M.c[parent]) {
                        if (d) {
                            console.error(`Failed to fill M.c for folder node ${parent}...!`, M.d[parent]);
                        }
                        eventlog(99667);
                        break;
                    }
                }

                // crawl back to root (not necessary until we start purging from memory)
                parent = M.d[parent].p;
            }
        },

        /**
         * Fetch all children; also, fetch path to root; populates M.c and M.d
         * same as fetchchildren/dbfetch.get, but takes an array of handles.
         *
         * @param {Array} handles ufs-node handles
         * @returns {Promise} settle
         * @memberOf dbfetch
         */
        async geta(handles) {
            let bulk = handles.filter(h => !M.d[h]);

            if (bulk.length) {
                if (fmdb.hasPendingWrites('f')) {
                    if (d) {
                        fmdb.logger.warn('Holding data retrieval until there are no pending writes...', bulk);
                    }
                    // @todo we have to do something about the dirty-reads procedure becoming a nefarious bottleneck
                    do {

                        await tSleep(4);
                    }
                    while (fmdb.hasPendingWrites('f'));
                }
                emplace(await fmdb.getbykey('f', 'h', ['h', bulk]), true);
            }

            bulk = handles.filter(h => M.d[h] && M.d[h].t && !M.c[h]);
            if (bulk.length) {
                await this.tree(bulk, 0);
            }

            bulk = new Set();
            for (let i = handles.length; i--;) {
                const n = M.d[handles[i]];
                if (n && n.p) {
                    bulk.add(n.p);
                }
            }
            return bulk.size && this.geta([...bulk]);
        },

        /**
         * Fetch entire subtree.
         *
         * @param {Array} parents  Node handles
         * @param {Number} [level] Recursion level, optional
         * @returns {Promise}
         * @memberOf dbfetch
         */
        async tree(parents, level = -1) {
            if (!fmdb) {
                throw new Error('Invalid operation, FMDB is not available.');
            }
            const inflight = new Set();
            const {promise} = mega;

            // check which parents have already been fetched - no need to fetch those
            // (since we do not purge loaded nodes, the presence of M.c for a node
            // means that all of its children are guaranteed to be in memory.)
            while (parents.length) {
                const p = [];
                for (let i = parents.length; i--;) {
                    const h = parents[i];
                    if (tree_inflight[h]) {
                        inflight.add(tree_inflight[h]);
                    }
                    else if (!M.c[h]) {
                        tree_inflight[h] = promise;
                        p.push(h);
                    }
                }

                if (p.length) {

                    // fetch children of all unfetched parents
                    const r = await fmdb.getbykey('f', 'h', ['p', [...p]]);

                    // store fetched nodes
                    for (let i = p.length; i--;) {
                        delete tree_inflight[p[i]];

                        // M.c should be set when *all direct* children have
                        // been fetched from the DB (even if there are none)
                        M.c[p[i]] = M.c[p[i]] || Object.create(null);
                    }

                    emplace(r);
                    p.length = 0;
                }

                if (level--) {
                    // extract parents from children
                    for (let i = parents.length; i--;) {
                        for (const h in M.c[parents[i]]) {
                            // with file versioning, files can have children, too!
                            if (M.d[h].t || M.d[h].tvf) {
                                p.push(h);
                            }
                        }
                    }
                }

                parents = p;
            }

            promise.resolve();
            return inflight.size ? Promise.allSettled([...inflight, promise]) : promise;
        },

        /**
         * Throttled version of {@link dbfetch.get} to issue a single DB request for a bunch of node retrievals at once.
         * @param {String|Array} h uts-node handle, or an array of them.
         * @returns {Promise<void>} promise
         */
        async acquire(h) {
            if (Array.isArray(h)) {
                h.forEach(node_inflight.add, node_inflight);
            }
            else {
                node_inflight.add(h);
            }

            if (d > 1) {
                console.debug('acquiring node', h);
            }
            let backoff = 32 + Math.random() * 88;

            do {
                if (backoff < 4e3) {
                    backoff *= 1.6;
                }
                await tSleep(backoff / 1e3);
            }
            while (node_inflight.lock);

            if (node_inflight.size) {
                const handles = [...node_inflight];

                node_inflight.clear();
                node_inflight.lock = true;

                if (d) {
                    console.warn('acquiring nodes...', handles);
                }

                await this.geta(handles);
                node_inflight.lock = false;
            }
        },

        /**
         * Retrieve nodes by handle.
         * WARNING: emplacenode() is not used, it's up to the caller if so desired.
         *
         * @param {Array} handles
         * @returns {Promise}
         * @memberOf dbfetch
         */
        async node(handles) {
            const result = [];

            for (let i = handles.length; i--;) {
                if (M.d[handles[i]]) {
                    result.push(M.d[handles[i]]);
                    handles.splice(i, 1);
                }
            }

            if (!handles.length || !fmdb) {
                if (d && handles.length) {
                    console.warn('Unknown nodes: ' + handles);
                }
                return result;
            }

            const r = await fmdb.getbykey('f', 'h', ['h', [...handles]]);
            if (d && handles.length < 2 && r.length > 1) {
                console.error('Unexpected DB reply, more than a single node returned.');
            }

            return result.length ? [...result, ...r] : r;
        },

        /**
         * Retrieve a node by its hash.
         *
         * @param hash
         * @returns {Promise}
         * @memberOf dbfetch
         */
        async hash(hash) {
            if (M.h[hash]) {
                for (const h of M.h[hash]) {
                    if (M.d[h]) {
                        return M.d[h];
                    }
                }
            }

            const [n] = await fmdb.getbykey('f', 'c', false, [['c', hash]], 1);
            if (n) {
                // got the hash and a handle it belong to
                if (!M.h[hash]) {
                    M.h[hash] = new Set();
                }
                M.h[hash].add(n.h);
            }
            return n;
        },

        async media(limit = 2e3, onchunk = null) {
            if (fmdb) {
                if (typeof limit === 'function') {
                    onchunk = limit;
                    limit = 2e3;
                }

                const options = {
                    limit,
                    query(t) {
                        return t.where('fa').notEqual(fmdb.toStore(''));
                    }
                };

                if (onchunk) {
                    return fmdb.getchunk('f', options, onchunk);
                }

                delete options.limit;
                return fmdb.getbykey('f', options);
            }
        },

        /**
         * Fetch all children recursively; also, fetch path to root
         *
         * @param {Array} handles
         * @returns {Promise}
         * @memberOf dbfetch
         */
        async coll(handles) {
            if (!fmdb) {
                return;
            }

            // fetch nodes and their path to root
            await this.acquire(handles);

            const folders = [];
            for (let i = handles.length; i--;) {
                const n = M.d[handles[i]];
                if (n && (n.t || n.tvf)) {
                    folders.push(n.h);
                }
            }

            if (folders.length) {
                await dbfetch.tree(folders);
            }
        }
    });

    return {value: Object.freeze(dbfetch)};
})());
