lazy(mega, 'rewindStorage', () => {
    'use strict';
    // Database version
    const VERSION = 1;

    const STATE_SN_START = '1';
    const STATE_SN_END = '2';
    const DB_DONT_ENCRYPT = {
        'a': {
            'ts': true,
            'order': true
        }
    };

    /**
     * This database provider only encrypts the data column
     */
    class RewindMegaDexie extends MegaDexie {
        get [Symbol.toStringTag]() {
            return 'RewindMegaDexie';
        }

        async get(table, key) {
            key = this.processKey(table, key);

            const rows = await this.table(table).where(key).toArray() || false;
            if (rows) {
                this.normaliseRows(table, rows);
                return rows;
            }
        }

        normaliseRows(table, rows) {
            if (fmdb.restorenode[table]) {
                fmdb.normaliseresult(table, rows);
            }
            else {
                for (let i = rows.length; i--;) {
                    for (const property in rows[i]) {
                        const plainText = DB_DONT_ENCRYPT[table] && DB_DONT_ENCRYPT[table][property];
                        rows[i][property] = plainText ? rows[i][property] : fmdb.fromStore(rows[i][property]);
                        if (property === 'd') {
                            rows[i][property] = JSON.parse(rows[i][property]);
                        }
                    }
                }
            }
        }

        processKey(table, key) {
            if (typeof key === 'string') {
                const tableObject = this.encryptedDb[table];
                const index = tableObject.schema.primKey.keyPath;
                const value = key;

                key = Object.create(null);
                key[index] = value;
            }

            for (const property in key) {
                const plainText = DB_DONT_ENCRYPT[table] && DB_DONT_ENCRYPT[table][property];
                key[property] = plainText ? key[property] : fmdb.toStore(key[property]);
            }

            return key;
        }

        async getChunk(table, key, options) {
            const results = [];
            let whereInstance = null;
            if (key instanceof this.WhereClause || key instanceof this.Collection) {
                whereInstance = key;
            }
            else {
                key = this.processKey(table, key);
                whereInstance = this.table(table).where(key);
            }

            const totalRecords = await whereInstance.count();
            const limit = options && options.limit || 1e4;
            const callback = options && options.callback || null;

            const processRecords = async(limit, offset) => {
                const rows = await whereInstance.clone().offset(offset).limit(limit).toArray() || false;
                if (rows) {
                    this.normaliseRows(table, rows);
                    return rows;
                }
                return [];
            };

            let offset = 0;
            while (true) {
                const rows = await processRecords(limit, offset);
                if (!rows.length) {
                    if (callback) {
                        const resultCount = results.length;
                        const progress = resultCount ? (results.length / totalRecords) : 1;
                        callback(progress * 100, true);
                    }
                    break;
                }

                results.push(...rows);
                const resultLength = results.length;

                if (callback) {
                    callback((resultLength / totalRecords) * 100);
                }

                offset += limit;
            }

            return results;
        }

        async set(table, row) {
            const plainRow = Object.create(null);
            if (DB_DONT_ENCRYPT[table]) {
                for (const column in DB_DONT_ENCRYPT[table]) {
                    plainRow[column] = row[column];
                    delete row[column];
                }
            }

            const serializedRow = fmdb.serialize(table, row);
            if (!this.onerror) {
                this.onerror = (ex) => {
                    console.error('set exception', ex);
                };
            }
            const newRow = {...serializedRow, ...plainRow};
            return this.put(table, newRow);
        }

        encrypt(data) {
            return data;
        }

        decrypt(data) {
            return data;
        }
    }

    /** @property RewindMegaDexie.create */
    lazy(RewindMegaDexie, 'create', () => {
        return async function() {
            const args = toArray.apply(null, arguments);
            return new RewindMegaDexie(...args);
        };
    });


    return new class RewindStorage {
        constructor() {
            this.db = null;
            this.dbVersion = VERSION;
            this.STATE_SN_START = STATE_SN_START;
            this.STATE_SN_END = STATE_SN_END;
        }

        async getChangeLogByYearMonth(handle, selectedDate) {
            const month = selectedDate.getUTCMonth();
            const year = selectedDate.getUTCMonth();
            const key = `rewind:cl:${handle}:${year}:${month}`;

            await this.getDB();
            return Promise.resolve(this.db.kv.get({k: key})).catch(nop);
        }

        async saveChangeLogByYearMonth(handle, selectedDate, changeLog) {
            const month = selectedDate.getUTCMonth();
            const year = selectedDate.getUTCMonth();
            const key = `rewind:cl:${handle}:${year}:${month}`;

            await this.getDB();

            return Promise.resolve(this.db.kv.put({k: key, d: changeLog})).catch(nop);
        }

        async removeChangeLog(handle, selectedDate) {
            const year = selectedDate.getFullYear();
            const key = `rewind:cl:${handle}:${year}`;

            await this.getDB();

            return Promise.resolve(this.db.kv.delete(key)).catch(nop);
        }

        async getTreeCacheList() {
            const key = `rewind:tch`;
            await this.getDB();
            return Promise.resolve(this.db.kv.get({k: key})).catch(nop);
        }

        async removeTreeCacheList() {
            const key = `rewind:tch`;
            await this.getDB();

            return Promise.resolve(this.db.kv.delete(key)).catch(nop);
        }

        async saveTreeCacheList(treeCacheList) {
            const key = `rewind:tch`;
            await this.getDB();
            return Promise.resolve(this.db.kv.put({k: key, d: treeCacheList})).catch(nop);
        }

        async getTreeCacheHistory(timestamp, handle) {
            const key = `rewind:tch:history:${timestamp}:${handle}`; // Change to sequence number
            await this.getDB();
            return Promise.resolve(this.db.kv.get({k: key})).catch(nop);
        }

        async saveTreeCacheHistory(timestamp, handle, treeCacheHistory) {
            const key = `rewind:tch:history:${timestamp}:${handle}`;
            await this.getDB();
            return Promise.resolve(this.db.kv.put({k: key, d: treeCacheHistory})).catch(nop);
        }

        async removeTreeCacheHistory(timestamp, handle) {
            const key = `rewind:tch:history:${timestamp}:${handle}`; // Change to sequence number
            await this.getDB();
            return Promise.resolve(this.db.kv.delete(key)).catch(nop);
        }

        async getActionPacketDiff(date) {
            const key = `rewind:tch:action:${date}`; // Change to sequence number
            await this.getDB();
            return Promise.resolve(this.db.kv.get({k: key})).catch(nop);
        }

        async saveActionPacketDiff(date, changeData) {
            const key = `rewind:tch:action:${date}`; // Change to sequence number
            await this.getDB();
            return Promise.resolve(this.db.kv.put({k: key, d: changeData})).catch(nop);
        }

        async getDB() {
            if (!this.db) {
                // eslint-disable-next-line local-rules/open
                this.db = await Promise.resolve(MegaDexie.create(`rewind`).db.open()).catch(nop);
            }
            return this.db;
        }

        async createDB() {
            if (!this.encryptedDb) {
                this.encryptedDb = await RewindMegaDexie.create('RWD', `rewind_${this.dbVersion}`, '', true, {
                    'f': "[sn+h], [sn+p]", // For files
                    'a': "[sn+order], [sn+ts]", // for packets
                    'sn': "sn" // For sequence state
                });
            }
            return this.encryptedDb;
        }

        async saveTreeCacheSNStateStart(sequenceNumber, snState) {
            await this.createDB();
            snState.s = STATE_SN_START;

            return this.encryptedDb.set('sn', {
                sn: sequenceNumber,
                ...snState
            });
        }

        async saveTreeCacheSNStateEnd(sequenceNumber, snState) {
            await this.createDB();
            snState.s = STATE_SN_END;

            return this.encryptedDb.set('sn', {
                sn: sequenceNumber,
                ...snState
            });
        }

        async saveTreeCacheSNState(sequenceNumber, snState) {
            await this.createDB();
            return this.encryptedDb.set('sn', {
                sn: sequenceNumber,
                ...snState
            });
        }

        async getTreeCacheSNState(sequenceNumber) {
            await this.createDB();
            const results = await this.encryptedDb.get('sn', {
                sn: sequenceNumber
            });

            if (results.length) {
                return results[0];
            }

            return Object.create(null);
        }

        async clearTreeCacheSNState(sequenceNumber) {
            await this.createDB();
            const table = 'sn';
            const key = this.encryptedDb.processKey(table, {
                sn: sequenceNumber
            });

            return this.encryptedDb.table(table).where(key).delete();
        }

        async saveTreeCacheHistoryNode(sequenceNumber, node) {
            await this.createDB();
            return this.encryptedDb.set('f', {
                sn: sequenceNumber,
                h: node.h,
                p: node.p,
                s : node.s >= 0 ? node.s : -node.t,
                t : node.t ? 1262304e3 - node.ts : node.ts,
                c : node.hash || '',
                fa: node.fa || '',
                d: {...node}
            });
        }

        async getTreeCacheHistoryNodes(sequenceNumber, progressCallback) {
            await this.createDB();
            const table = 'f';
            return this.encryptedDb.getChunk(table, {
                sn: sequenceNumber
            }, {
                limit: 10000,
                callback: progressCallback
            });
        }

        async getTreeCacheNodeCount(sequenceNumber) {
            await this.createDB();
            const table = 'f';
            const key = this.encryptedDb.processKey(table, {
                sn: sequenceNumber
            });
            return this.encryptedDb.f.where(key).count();
        }

        async clearTreeCache(sequenceNumber) {
            await this.createDB();
            const table = 'f';
            const key = this.encryptedDb.processKey(table, {
                sn: sequenceNumber
            });

            return this.encryptedDb.table('f').where(key).delete();
        }

        async saveActionPackets(sequenceNumber, packetInfo) {
            await this.createDB();
            return this.encryptedDb.set('a', {
                sn: sequenceNumber,
                ...packetInfo
            });
        }

        async getActionPackets(sequenceNumber, endTimestamp, progressCallback) {
            await this.createDB();
            const table = 'a';
            const key = this.encryptedDb.processKey(table, {
                sn: sequenceNumber,
                ts: endTimestamp
            });

            const options = {
                callback: progressCallback,
                limit: 10000
            };

            const whereClause = this.encryptedDb.table(table).where("[sn+ts]")
                .belowOrEqual([key.sn, key.ts]);

            return this.encryptedDb.getChunk(table, whereClause, options);
        }

        async clearActionPackets(sequenceNumber) {
            await this.createDB();
            const table = 'a';
            const key = this.encryptedDb.processKey(table, {
                sn: sequenceNumber
            });

            return this.encryptedDb.table(table).where(key).delete();
        }

        async saveTreeCacheHistoryChunk(sequenceNumber, page, treeCacheChunk) {
            const key = `rewind:tch:history:${sequenceNumber}:page:${page}`;
            await this.getDB();
            return Promise.resolve(this.db.kv.put({k: key, d: treeCacheChunk})).catch(nop);
        }

        async saveTreeCacheHistoryInfo(sequenceNumber, info) {
            const key = `rewind:tch:history:${sequenceNumber}`;
            await this.getDB();
            return Promise.resolve(this.db.kv.put({k: key, d: info})).catch(nop);
        }
    };
});
