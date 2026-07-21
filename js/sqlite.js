(() => {
    'use strict';

    const DB_VER = 1;
    const DB_RESET_QUERIES = `
        PRAGMA writable_schema = 1;
        DELETE FROM sqlite_master;
        PRAGMA writable_schema = 0;
        VACUUM;
    `;

    class FMDBSQLiteWhere {

        constructor(table, index) {

            this.table = table;
            this.index = index === ':id' ? table.pk : index;
            this._filters = [];
            this._limit = undefined;
            this._offset = 0;
            this._reverse = false;
            this._conds = [];
            this._sel = '*';
            this._defer = false;
        }

        // create immutable clone
        _clone(cond) {

            const w = new FMDBSQLiteWhere(this.table, this.index);

            w._filters = [...this._filters];
            w._limit = this._limit;
            w._offset = this._offset;
            w._reverse = this._reverse;
            w._orderby = this._orderby;
            w._conds = [...this._conds];
            w._sel = this._sel;
            w._until = this._until;
            w._defer = this._defer;

            if (typeof cond === 'function') {
                cond(w);
            }

            return w;
        }

        _canSql() {

            // This is where block but no condition is set
            if (!this._conds.length && !this._limit && !this._offset) {
                return false;
            }

            const allowedCols = new Set([this.table.pk, ...this.table.columns, 'rowid']);
            const allowedOps = new Set(['eq', 'in', 'notIn', 'neq', 'gt', 'gte', 'lt', 'lte']);

            for (const c of this._conds) {
                if (!allowedCols.has(c.col) || !allowedOps.has(c.op)) {
                    return false;
                }
            }
            return true;
        }

        _getOperator(cop) {

            switch (cop) {

                case 'eq':
                    return '=';
                case 'neq':
                    return '!=';
                case 'gt':
                    return '>';
                case 'gte':
                    return '>=';
                case 'lt':
                    return '<';
                case 'lte':
                    return '<=';
            }
        }

        _buildSql() {

            const orderCol = this._orderby;
            const whereParts = [];
            const binds = [];

            for (const c of this._conds) {

                const {col, op, values} = c;

                if (!values || !values.length) {

                    if (op === 'in' || op === 'eq') {
                        whereParts.push('1=0');
                    }

                    continue;
                }

                if (op === 'in' || op === 'notIn') {

                    const operator = op === 'in' ? 'IN' : 'NOT IN';
                    const q = values.map(() => '?').join(',');

                    whereParts.push(`${col} ${operator} (${q})`);

                    binds.push(...values);
                }
                else if (op) {

                    whereParts.push(`${col}${this._getOperator(op)}?`);
                    binds.push(values[0]);
                }
            }

            let sql = `SELECT ${this._sel}, rowid FROM ${this.table.name}`;

            if (whereParts.length) {
                sql += ` WHERE ${whereParts.join(' AND ')}`;
            }

            sql += ` ORDER BY ${orderCol || 'rowid'} ${this._reverse ? 'DESC' : 'ASC'}`;

            if (!this._defer && this._limit) {

                sql += ' LIMIT ?';
                binds.push(this._limit | 0);

                if (this._offset) {

                    sql += ' OFFSET ?';
                    binds.push(this._offset | 0);
                }
            }
            else if (!this._defer && this._offset) {

                sql += ' LIMIT -1 OFFSET ?';
                binds.push(this._offset | 0);
            }

            return {sql, binds};
        }

        // Some query optimization to not fetch full list and then filter in JS
        _sqlSelect() {

            // If until/filter will run in JS, defer offset/limit until after post-processing.
            this._defer = (this._filters.length || typeof this._until === 'function')
                && (this._limit !== undefined || this._offset);

            const {sql, binds} = this._buildSql();

            return this.table.exec(sql, binds);
        }

        anyOf(list) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'in', values: Array.isArray(list) ? [...list] : [list]});
            });
        }

        noneOf(list) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'notIn', values: Array.isArray(list) ? [...list] : [list]});
            });
        }

        equals(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'eq', values: [v]});
            });
        }

        above(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'gt', values: [v]});
            });
        }

        aboveOrEqual(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'gte', values: [v]});
            });
        }

        below(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'lt', values: [v]});
            });
        }

        belowOrEqual(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'lte', values: [v]});
            });
        }

        between(lower, upper, includeLower = true, includeUpper = true) {

            const w = this._clone();
            const ops = [];

            ops.push(
                {col: w.index, op: includeLower ? 'gte' : 'gt', values: [lower]},
                {col: w.index, op: includeUpper ? 'lte' : 'lt', values: [upper]}
            );

            w._conds.push(...ops);

            return w;
        }

        notEqual(v) {
            return this._clone(w => {
                w._conds.push({col: w.index, op: 'neq', values: [v]});
            });
        }

        and(fnOrField) {

            if (typeof fnOrField === 'function') {
                return this._clone(w => w._filters.push(fnOrField));
            }

            return this._clone(w => {
                w.index = fnOrField === ':id' ? this.table.pk : fnOrField;
            });
        }

        limit(n) {
            return this._clone(w => {
                w._limit = n;
            });
        }

        offset(n) {
            return this._clone(w => {
                w._offset = n;
            });
        }

        reverse() {
            return this._clone(w => {
                w._reverse = !w._reverse;
            });
        }

        filter(fn) {
            return this._clone(w => w._filters.push(fn));
        }

        until(fn) {
            return this._clone(w => {
                w._until = fn;
            });
        }

        async modify(fn) {

            const rows = await this.toArray();
            const updates = [];

            for (const r of rows) {
                if (fn(r) !== false) {
                    updates.push(r);
                }
            }

            if (updates.length) {
                await this.table.bulkPut(updates);
            }
        }

        async each(fn) {

            const arr = await this.toArray();

            for (const r of arr) {

                if (fn(r) === false) {
                    break;
                }
            }
        }

        async first() {
            return (await this.limit(1).toArray())[0];
        }

        async last() {
            const arr = await this.toArray();
            return arr[arr.length - 1];
        }

        async count() {

            // For count after filter is not able to executed as it is not return result but just count
            if (this._filters.length || typeof this._until === 'function' || !this._canSql()) {
                return (await this.toArray()).length;
            }

            this._sel = 'COUNT(*) AS c';

            return (await this.toArray())[0].c;
        }

        sortBy(keyPath) {
            return this.orderBy(keyPath).toArray();
        }

        orderBy(keyPath) {
            return this._clone(w => {
                w._orderby = keyPath || this.index;
            });
        }

        keys() {
            return this._clone(w => {
                w._sel = this.index;
            }).toArray().then(rows => rows.map(r => r[this.index]));
        }

        primaryKeys() {
            return this._clone(w => {
                w.index = this.table.pk;
            }).keys();
        }

        _afterRes(res) {

            if (typeof this._until === 'function') {

                const i = res.findIndex(this._until);
                res = i === -1 ? res : res.slice(0, i);
            }

            // Filters... cannot be optimized
            for (const f of this._filters) {
                res = res.filter(f);
            }

            return res;
        }

        async toArray() {

            if (this._canSql()) {

                const res = await this._sqlSelect();
                let rows = this._afterRes(res);

                if (this._defer) {
                    if (this._offset) {
                        rows = rows.slice(this._offset);
                    }

                    if (this._limit !== undefined) {
                        rows = rows.slice(0, this._limit);
                    }
                }

                return rows;
            }

            let res = await this.table.toArray();

            res.sort((a, b) => a[this.index] > b[this.index] ? 1 : a[this.index] < b[this.index] ? -1 : 0);

            if (this._reverse) {
                res.reverse();
            }

            res = this._afterRes(res);

            if (this._offset) {
                res = res.slice(this._offset);
            }

            if (this._limit !== undefined) {
                res = res.slice(0, this._limit);
            }

            if (this._sel !== '*') {

                const sel = this._sel.split(',').map(s => s.trim());
                res = res.map(r => Object.fromEntries(sel.map(s => [s, r[s]])));
            }

            return res;
        }
    }

    class FMDBSQLiteTable {

        constructor(db, name, pk, indexes, columns) {

            this._db = db;
            this.name = name;
            this.pk = pk;
            this.indexes = indexes;
            this.schema = {primKey: {keyPath: pk}};
            this.columns = columns;
        }

        exec(sql, bind = []) {
            return this._db.exec(sql, bind);
        }

        async bulkPut(rows, skipTx) {

            const total = rows.length;

            if (!total) {
                return;
            }
            if (skipTx === undefined) {
                skipTx = !!this._db._transactionCtrl;
            }

            const cols = [this.pk, ...this.columns];
            const binds = [];
            const xfer = [];

            for (let i = 0; i < total; i++) {

                const row = rows[i];

                binds.push(row[this.pk]);

                for (const c of this.columns) {
                    binds.push(row[c]);
                }

                if (row.d instanceof ArrayBuffer) {
                    xfer.push(row.d);
                }
            }

            if (!this._db._initializing) {
                await this._db._ready;
            }

            let ts = performance.now();

            const res = await this._db._promiser({
                type: 'bulkput', args: {
                    table: this.name,
                    columns: cols,
                    binds,
                    skipTx,
                    xfer
                }
            });

            ts = performance.now() - ts;

            if (d) {

                const sqltime = `${(res.workerRespondTime - res.workerReceivedTime).toFixed(3)}ms`;
                const queryCount = binds.length / cols.length;
                const fulltime = `${ts.toFixed(3)}ms`;
                res.result.args = {
                    table: this.name,
                    columns: cols,
                    binds
                };

                fmdb.db.logger.log(`bulkPut to ${this.name}`, queryCount, res.result, sqltime, fulltime);
            }
        }

        async put(row) {

            const origPk = row && row[this.pk];

            await this.bulkPut([row]);

            return origPk;
        }

        async add(row) {
            return this.put(row);
        }

        async bulkAdd(rows) {

            await this.bulkPut(rows);

            return rows.length;
        }

        async get(key) {

            const r = await this.exec(`SELECT * FROM ${this.name} WHERE ${this.pk}=? LIMIT 1`, [key]);

            return r && r[0];
        }

        async delete(key) {
            await this.bulkDelete([key]);
        }

        async clear() {
            await this.exec(`DELETE FROM ${this.name}`).catch(dump);
        }

        async count() {

            const r = await this.exec(`SELECT COUNT(*) AS c FROM ${this.name}`);

            return r && r[0] && r[0].c | 0;
        }

        async bulkDelete(keys, skipTx) {

            if (!keys.length) {
                return;
            }
            if (skipTx === undefined) {
                skipTx = !!this._db._transactionCtrl;
            }

            if (!this._db._initializing) {
                await this._db._ready;
            }

            let ts = performance.now();

            const res = await this._db._promiser({
                type: 'bulkdelete', args: {
                    table: this.name,
                    pk: this.pk,
                    keys,
                    skipTx
                }
            });

            ts = performance.now() - ts;

            if (d) {

                const sqltime = `${(res.workerRespondTime - res.workerReceivedTime).toFixed(3)}ms`;
                const fulltime = `${ts.toFixed(3)}ms`;
                res.result.args = {
                    table: this.name,
                    pk: this.pk,
                    keys,
                    skipTx
                };

                fmdb.db.logger.log(`bulkDelete from ${this.name}`, keys.length, res.result, sqltime, fulltime);
            }
        }

        toArray() {
            return this.exec(`SELECT * FROM ${this.name}`);
        }

        limit(n) {
            return this.where(this.index || this.pk).limit(n);
        }

        offset(n) {
            return this.where(this.index || this.pk).offset(n);
        }

        filter(fn) {
            return this.where(this.index || this.pk).filter(fn);
        }

        reverse() {
            return this.where(this.index || this.pk).reverse();
        }

        orderBy(keyPath) {
            return this.where(keyPath).orderBy(keyPath);
        }

        where(index) {
            return new FMDBSQLiteWhere(this, index);
        }

        async bulkGet(keys) {

            if (!Array.isArray(keys) || !keys.length) {
                return [];
            }

            const indexMap = new Map();
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                let arr = indexMap.get(k);
                if (!arr) {
                    arr = [];
                    indexMap.set(k, arr);
                }
                arr.push(i);
            }

            const CHUNK = 3e4;
            const pkCol = this.pk;
            const tableName = this.name;
            const resultObjs = new Array(keys.length);

            for (let offset = 0; offset < keys.length; offset += CHUNK) {
                const slice = keys.slice(offset, offset + CHUNK);
                const placeholders = slice.map(() => '?').join(',');
                const sql = `SELECT * FROM ${tableName} WHERE ${pkCol} IN (${placeholders})`;
                const rows = await this.exec(sql, slice);

                for (const row of rows) {
                    if (!row || row[pkCol] === null) {
                        continue;
                    }

                    const idxs = indexMap.get(row[pkCol]);
                    if (idxs && idxs.length) {
                        for (const pos of idxs) {
                            if (resultObjs[pos] === undefined) {
                                resultObjs[pos] = row;
                            }
                        }
                    }
                }
            }

            return resultObjs;
        }
    }

    class FMDBSQLiteAdapter {

        constructor(parent) {

            this.name = parent.name;
            this._isMaster = !!(self.mBroadcaster && mBroadcaster.crossTab && mBroadcaster.crossTab.owner);
            let retry = 3;

            this.logger = new MegaLogger('SQLite', {}, parent.logger);

            this._initWorker = (resolve, reject) => {

                const path = `${window.is_extension || window.is_karma ? '' : '/'}sqlite3-worker1.js`;
                const worker = new Worker(path);

                worker.addEventListener('error', ev => {
                    worker.terminate();
                    reject(ev.message || 'SQLite Worker init error');
                });

                worker.addEventListener('message', ev => {

                    if (ev.data) {

                        if (ev.data.type === 'worker-init-failed') {

                            worker.terminate();

                            if (retry-- > 0) {
                                setTimeout(() => {
                                    this._initWorker(resolve, reject);
                                }, 1000);
                            }
                            else {
                                reject(ev.data.error);
                            }
                        }
                        else if (ev.data.type === 'worker-init-success') {

                            this._ready = sqlite3Worker1Promiser.v2({worker}).then(p => {
                                this._promiser = p;
                                resolve(p);
                            }).catch((ex) => {
                                this.logger.error('Promiser init failed:', ex);
                                reject(ex);
                            });
                        }
                    }
                });
            };

            this._ready = new Promise((resolve, reject) => {

                navigator.locks.request('fmdb-sqlite-active', {mode: 'exclusive'}, async() => {
                    await new Promise(this._initWorker);
                    await this._promiser({
                        type: 'pauseVfs',
                        args: {
                            config: {filename: `file:${this.name}.db`, vfs: 'opfs-sahpool'},
                            readonly: !this._isMaster,
                            pragmas: 'PRAGMA locking_mode=NORMAL; PRAGMA synchronous=NORMAL; ' +
                                'PRAGMA temp_store=FILE; PRAGMA cache_size=-131072; PRAGMA cache_spill=ON;'
                        }
                    });
                    resolve();
                }).catch(reject);
            });

            mBroadcaster.addListener('crossTab:owner', () => {
                if (this._isMaster) {
                    return;
                }
                this._isMaster = true;
                if (this._promiser) {
                    this._promiser({type: 'setRole', args: {readonly: false}}).catch(dump);
                }
            });

            this._initializing = false;
            this._transactionCtrl = null;
            this._schemaDef = parent.schema;
            this._tables = Object.create(null);

            window.addEventListener('pagehide', this.close.bind(this));
        }

        async setup() {

            await this._ready;
            this._initializing = true;

            if (!this._isMaster) {
                await this._promiser({type: 'setRole', args: {readonly: false}});
            }

            const version = await this.exec('PRAGMA user_version;');

            if (!version[0] || version[0].user_version !== DB_VER) {
                await this.exec(DB_RESET_QUERIES);
            }

            await this.exec(
                'PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=1000; PRAGMA locking_mode=NORMAL; ' +
                'PRAGMA synchronous=NORMAL; PRAGMA temp_store=FILE; PRAGMA cache_size=-131072; ' +
                `PRAGMA cache_spill=ON; PRAGMA optimize; PRAGMA user_version=${DB_VER};`
            );

            let quickCheckRes = await this.exec('PRAGMA quick_check;');

            if (quickCheckRes.length && quickCheckRes[0].quick_check !== 'ok') {

                await this.exec(DB_RESET_QUERIES);
                quickCheckRes = await this.exec('PRAGMA integrity_check;');

                if (quickCheckRes.length && quickCheckRes[0] && quickCheckRes[0].integrity_check !== 'ok') {
                    throw new Error('Database is corrupted and not able to recover');
                }
            }

            this.vfs = 'opfs-sahpool';

            await this._ready;
            await this._initSchema();
        }

        async _initSchema() {
            const typeMap = freeze({
                s: 'INTEGER',
                t: 'INTEGER',
                ts: 'INTEGER'
            });
            assert(this._schemaDef);

            for (const [t, def] of Object.entries(this._schemaDef)) {

                const parts = def.split(',').map(s => s.trim()).filter(Boolean);

                if (!parts.length) {
                    continue;
                }

                const idxCols = [];
                let pk;

                for (const token of parts) {

                    if (!token) {
                        continue;
                    }

                    if (token.startsWith('&')) {
                        pk = token.slice(1);
                    }
                    else {
                        idxCols.push(token);
                    }
                }

                const cols = [`${pk} TEXT PRIMARY KEY`];

                for (const c of idxCols) {
                    cols.push(`${c} ${typeMap[c] || 'TEXT'}`);
                }
                cols.push('d TEXT');

                let sql = `CREATE TABLE IF NOT EXISTS ${t} (${cols.join(',')});`;
                for (let i = 0; i < idxCols.length; i++) {
                    sql += `CREATE INDEX IF NOT EXISTS idx_${idxCols[i]} ON ${t} (${idxCols[i]});`;
                }

                await this.exec(sql);

                this[t] = this._tables[t] = new FMDBSQLiteTable(this, t, pk, idxCols, [...idxCols, 'd']);
            }

            // Restore readonly for non-master roles now that schema setup is done.
            if (!this._isMaster) {
                await this._promiser({type: 'setRole', args: {readonly: true}});
            }

            this._initializing = false;
        }

        _rowsFromColumnar(columnar) {

            if (!columnar || !Array.isArray(columnar.columns) || !Array.isArray(columnar.columnNames)) {
                return [];
            }

            const {columnNames: names, columns: cols} = columnar;
            const rowCount = cols.reduce((max, col) => {
                const data = col && col.data;
                return Math.max(max, data && data.length || 0);
            }, 0);
            const rows = Array.from({length: rowCount}, () => Object.create(null));

            for (let c = 0; c < cols.length; c++) {

                const col = cols[c];
                const colName = names[c];
                const data = col.data || [];
                const nullMap = col.nullBitmap;
                const isTyped = ArrayBuffer.isView(data);
                const _getRow = r => isTyped ? data[r] : data[r] === undefined ? null : data[r];

                if (nullMap) {
                    for (let r = 0; r < rowCount; r++) {
                        rows[r][colName] = nullMap[r] === 1 ? null : _getRow(r);
                    }
                }
                else {
                    for (let r = 0; r < rowCount; r++) {
                        rows[r][colName] = _getRow(r);
                    }
                }
            }

            return rows;
        }

        async exec(sql, bind = [], rowMode = 'auto') {

            if (!this._initializing) {
                await this._ready;
            }

            const args = {sql, bind, rowMode};

            let ts = self.d && performance.now();
            let res = await this._promiser({type: 'exec', args});

            if (self.d > 1) {
                ts = performance.now() - ts;
                this.logger[res && res.type === 'error' ? 'error' : 'debug'](
                    'exec', sql, bind, res.result,
                    `${(res.workerRespondTime - res.workerReceivedTime).toFixed(3)}ms`, `${ts.toFixed(3)}ms`
                );
            }

            if (res && typeof res.result === 'object') {
                let {columnar, resultRows} = res.result;

                if (columnar) {
                    resultRows = this._rowsFromColumnar(columnar);
                }
                res = resultRows;
            }
            return Array.isArray(res) && res || [];
        }

        async listTables() {
            return (await this.exec("SELECT name FROM sqlite_master WHERE type='table'")).map(o => o.name);
        }

        close() {

            if (d) {
                this.logger.log('Closing database', this.name);
            }
        }

        commit() {

            const tx = this._transactionCtrl;

            if (!tx || tx.settled) {
                return;
            }

            tx.settled = true;
            tx.resolve();
        }

        rollback(ex) {

            const tx = this._transactionCtrl;

            if (!tx || tx.settled) {
                return;
            }

            tx.settled = true;
            tx.reject(ex);
        }

        async transaction(mode, tables, scope) {

            const tx = {settled: false};

            tx.promise = new Promise((resolve, reject) => {
                tx.resolve = resolve;
                tx.reject = reject;
            });

            this._transactionCtrl = tx;

            // Await BEGIN so worker bulkput/bulkdelete messages join this
            // transaction instead of opening their own implicit one.
            await this.exec('BEGIN IMMEDIATE');

            const result = scope();
            await tx.promise.then(
                () => this.exec('COMMIT'),
                async(ex) => {
                    await this.exec('ROLLBACK').catch(dump);

                    if (ex) {
                        throw ex;
                    }
                }
            );

            this._transactionCtrl = null;

            return result;
        }

        async delete(empty) {

            if (!this._isMaster) {
                return;
            }

            if (this._transactionCtrl) {
                this.rollback();
            }

            for (const t of Object.keys(this._tables)) {
                await this.exec(`DROP TABLE IF EXISTS ${t}`).catch(() => {
                    this.logger.error('delete error', t);
                    this.crashed = true;
                });

                delete this[t];
            }

            if (this.crashed) {
                await this.exec(DB_RESET_QUERIES);
            }

            if (empty) {
                await this.vacuum();
                await this._initSchema();
            }
        }

        async vacuum() {
            await this.exec('VACUUM');
        }

        async destroy() {
            await this.exec(DB_RESET_QUERIES);
        }
    }

    class FMDBSQLite extends FMDB {

        constructor(...args) {
            super(...args);

            this.limit = 1e5;
            this.chunkSize = 5e4;
            this.bulkWrite = true;
            this.growLimit = 65536;
        }

        async init(wipe) {
            return this.setup(wipe)
                .catch((ex) => {
                    this.logger.error('SQLite adapter failed, disabling SQLite and reloading...', ex);
                    M.sqliteCheck.lock7days();

                    loadingDialog.show('sqlite', l[1141]);
                    return mega.halt('sqlite')
                        .then(() => location.reload());
                });
        }

        async setup(wipe) {
            let sn;

            this.crashed = false;
            await mBroadcaster.setup();

            const db = new FMDBSQLiteAdapter(this);

            await db.setup();

            Object.defineProperty(this, 'db', {value: db});

            if (!wipe) {
                sn = await this.get('_sn').catch(nop);

                if (sn && sn[0] && sn[0].length === 11) {
                    sn = sn[0];
                    if (self.d) {
                        db.logger.info(`DB sn: ${sn}`);
                    }
                }
                else {
                    sn = false;
                    wipe = true;
                }
            }

            if (wipe) {

                if (!db._isMaster || this.crashed) {
                    this.crashed = 2;
                    return false;
                }

                await db.delete(true);
            }
            assert(this.crashed === false);

            return sn;
        }

        serialize(table, row) {

            row = super.serialize(table, row);
            row.d = JSON.stringify(row.d);

            return row;
        }

        strdecrypt(buffer) {
            console.error('is this used? for what?');

            if (buffer instanceof Uint8Array) {
                buffer = buffer.buffer;
            }

            return super.strdecrypt(buffer);
        }

        getKeyPath() {
            return 'rowid';
        }

        normaliseresult(table, r) {

            let t;
            for (let i = r.length; i--;) {
                if (r[i]) {
                    t = typeof r[i].d === 'string' ? JSON.parse(r[i].d) : r[i].d || {};

                    if (this.restorenode[table]) {
                        this.restorenode[table](t, r[i]);
                    }

                    r[i] = t;
                }
                else {
                    r.splice(i, 1);
                }
            }
        }

        finalise() {
            return this.db.commit();
        }

        rollback(ex) {
            return this.db.rollback(ex);
        }

        async search(term, filters) {

            let where = 'LOWER(name) LIKE ? ESCAPE \'/\'';
            const bind = [
                `%${String(term).toLowerCase().replace(/\s+/g, '*').replace(/[%/_]/g, '/$&').replace(/\*/g, '%')}%`
            ];

            if (M.BackupsId) {

                where += ' AND h != ? AND p != ?';
                bind.push(M.BackupsId, M.BackupsId);
            }
            const {tree, withName, byNode} = filters;

            if (tree && tree.length < 3e4) {

                where += ` AND p IN (${'?,'.repeat(tree.length).slice(0, -1)})`;
                bind.push(...tree);
            }

            const result = await this.getbykey('f', {
                query(t) {
                    return t._db.exec(`SELECT * FROM f WHERE ${where} ORDER BY rowid`, bind);
                },
                include: withName
            });

            return {result: result.filter(byNode)};
        }

        async suggest(term, max, path, filter) {
            const where = ['LOWER(name) LIKE ? ESCAPE \'/\'', 'p != ?'];
            const bind = [`%${String(term).toLowerCase()
                .replace(/\s+/g, '*').replace(/[%/_]/g, '/$&').replace(/\*/g, '%')}%`, M.RubbishID];

            if (M.BackupsId) {
                where.push('h != ?', 'p != ?');
                bind.push(M.BackupsId, M.BackupsId);
            }
            let sql = `SELECT * FROM f WHERE ${where.join(' AND ')}`;

            const tree = path && M.getNodeByHandle(path) && M.getTreeHandles(path);
            if (tree && tree.length < 3e4) {
                sql += ` AND p IN (${'?,'.repeat(tree.length).slice(0, -1)})`;
                bind.push(...tree);
            }

            bind.push(max << 6);

            const nodes = await this.getbykey('f', {
                query(t) {
                    return t._db.exec(`${sql} ORDER BY name ASC LIMIT ?`, bind);
                },
                include: update => update.p !== M.RubbishID && filter(update)
            });

            return nodes.filter(filter).slice(0, max);
        }

        async recent(limit, until, filter, options) {

            return super.recent(limit, until, filter, {
                query(db) {
                    let t = db.where('t').aboveOrEqual(until);

                    if (filter.tree && filter.tree.length < 3e4) {
                        t = t.and('p').noneOf(filter.tree);
                    }
                    return t.orderBy('t').reverse();
                },
                ...options
            });
        }

        media() {

            return this.getbykey('f', {
                query(t) {
                    return t._db.exec('SELECT f.* FROM f JOIN fa USING(h) WHERE f.s > 0');
                },
                include: n => !!n.fa && n.s > 0
            });
        }
    }

    const sup = Object.getOwnPropertyDescriptors(FMDB);
    delete sup.prototype;

    Object.defineProperties(FMDBSQLite, sup);
    Object.defineProperty(self, 'FMDB', {value: FMDBSQLite});

    assert(++FMDBSQLite.version > 1);

    // Helper to list or clear OPFS files
    FMDB.listOpfs = async function(clear) {

        // eslint-disable-next-line compat/compat
        const root = await navigator.storage.getDirectory();
        const results = [];

        for await (const [name, handle] of root.entries()) {

            if (handle.kind === "file") {

                if (clear) {
                    await root.removeEntry(name);
                }
                else {
                    results.push(name);
                }
            }
            else if (handle.kind === "directory") {

                if (clear) {
                    await root.removeEntry(name, {recursive: true});
                }
                else {
                    results.push(name);
                }
            }
        }

        return results;
    };
})();
