/*
  2022-05-23

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This is a JS Worker file for the main sqlite3 api. It loads
  sqlite3.js, initializes the module, and postMessage()'s a message
  after the module is initialized:

  {type: 'sqlite3-api', result: 'worker1-ready'}

  This seemingly superfluous level of indirection is necessary when
  loading sqlite3.js via a Worker. Instantiating a worker with new
  Worker("sqlite.js") will not (cannot) call sqlite3InitModule() to
  initialize the module due to a timing/order-of-operations conflict
  (and that symbol is not exported in a way that a Worker loading it
  that way can see it).  Thus JS code wanting to load the sqlite3
  Worker-specific API needs to pass _this_ file (or equivalent) to the
  Worker constructor and then listen for an event in the form shown
  above in order to know when the module has completed initialization.
*/
"use strict";
importScripts('sqlite3.js');
sqlite3InitModule().then(sqlite3 => sqlite3.installOpfsSAHPoolVfs({
    vfsName: 'opfs-sahpool',
    initialCapacity: 6,
    clearOnInit: false,
    directory: 'sqlite-sahpool-dir'
  }).then(poolutil => {

    postMessage({type: 'worker-init-success'});

    sqlite3.initWorker1API(
      
      function apiExt({wMsgHandler, getMsgDb}) {

        const ext = Object.create(null);
        const origOpen = wMsgHandler.open;
        const origClose = wMsgHandler.close;
        let db;

        if (poolutil) {
          wMsgHandler.open = function(ev) {
            const fn = poolutil.getFileNames();
            for (let i = fn.length; i--;) {
              if (fn[i] !== ev.args.filename.replace('file:', '/')) {
                poolutil.unlink(fn[i]);
              }
            }
            db = origOpen(ev);
            return db;
          };
        }

        wMsgHandler.close = function(ev) {

          if (db && db.pointer) {
            sqlite3.capi.sqlite3_interrupt(db.pointer);
          }

          return origClose(ev);
        };

        self.addEventListener('close', wMsgHandler.close);

        let dbConfig = null;
        let isReadonly = false;
        let sessionPragmas = '';
        let releaser = null;
        let activeDbId = null;
        let eHold = false;
        let inFlight = 0;

        const origExec = wMsgHandler.exec;

        if (poolutil) {
          wMsgHandler.pauseVfs = function(ev) {
            const args = ev && ev.args || {};
            if (args.config) {
              dbConfig = {filename: args.config.filename, vfs: args.config.vfs};
            }
            if (typeof args.pragmas === 'string') {
              sessionPragmas = args.pragmas;
            }
            isReadonly = !!args.readonly;
            poolutil.pauseVfs();
            return {paused: true};
          };
        }

        wMsgHandler.setRole = async function(ev) {
          isReadonly = !!(ev.args && ev.args.readonly);
          if (activeDbId) {
            await origExec({dbId: activeDbId, args: {sql: `PRAGMA query_only=${isReadonly ? 'ON' : 'OFF'}`}});
          }
          return {readonly: isReadonly};
        };

        const acquireWebLock = () => new Promise((resolve, reject) => {
          navigator.locks.request('fmdb-sqlite-active', {mode: 'exclusive'}, () => new Promise(release => {
            releaser = release;
            resolve();
          })).catch(reject);
        });

        const openDatabase = async () => {
          if (!dbConfig) {
            throw new Error('fmdb-sqlite worker: dbConfig not initialized');
          }
          await poolutil.unpauseVfs();
          const openRes = await wMsgHandler.open({args: {filename: dbConfig.filename, vfs: dbConfig.vfs}});
          activeDbId = openRes.dbId || openRes.result && openRes.result.dbId;
          if (sessionPragmas) {
            await origExec({dbId: activeDbId, args: {sql: sessionPragmas}});
          }
          if (isReadonly) {
            await origExec({dbId: activeDbId, args: {sql: 'PRAGMA query_only=ON'}});
          }
        };

        let acquireChain = Promise.resolve();
        const acquire = () => {
          const next = acquireChain.then(async () => {
            if (!releaser) {
              await acquireWebLock();
            }
            if (!activeDbId) {
              await openDatabase();
            }
          });
          acquireChain = next.catch(() => {});
          return next;
        };

        const release = () => {
          if (eHold || inFlight > 0 || !releaser) {
            return;
          }
          if (activeDbId) {
            wMsgHandler.close({dbId: activeDbId, args: {dbId: activeDbId}});
            activeDbId = null;
          }
          poolutil.pauseVfs();
          const r = releaser;
          releaser = null;
          r();
        };

        wMsgHandler.exec = async function(ev) {
          ev.args = ev.args || {};
          const sql = ev.args.sql || '';
          inFlight++;
          try {
            await acquire();
            ev.dbId = activeDbId;
            ev.args.dbId = activeDbId;
            const res = await origExec(ev);
            if (/^\s*(BEGIN|SAVEPOINT)\b/i.test(sql)) {
              eHold = true;
            }
            return res;
          }
          finally {
            inFlight--;
            if (/^\s*(COMMIT|END|ROLLBACK|RELEASE)\b/i.test(sql)) {
              eHold = false;
            }
            release();
          }
        };

        const escapeId = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');
        const maxVariables = 30000;
        const _runBulkStatement = (db, skipTx, total, chunkSize, getSql, bindChunk) => {
          let stmt;
          let stmtSize = 0;

          if (!skipTx) {
            db.exec('BEGIN IMMEDIATE');
          }

          for (let offset = 0; offset < total; offset += chunkSize) {

            const size = Math.min(chunkSize, total - offset);

            if (!stmt || stmtSize !== size) {

              if (stmt) {
                stmt.finalize();
              }

              stmt = db.prepare(getSql(size));
              stmtSize = size;
            }

            bindChunk(stmt, offset, size);
            stmt.step();
            stmt.reset(true);
          }

          if (stmt) {
            stmt.finalize();
          }

          if (!skipTx) {
            db.exec('COMMIT');
          }
        };

        wMsgHandler.bulkput = async function(ev) {

          const args = ev.args || Object.create(null);
          const table = args.table;
          const columns = Array.isArray(args.columns) ? args.columns : [];
          const binds = Array.isArray(args.binds) ? args.binds : [];
          const skipTx = args.skipTx !== false;

          if (!table || !columns.length) {
            throw new Error("bulkput requires table and columns");
          }
          if (!binds.length) {
            return {ok: true, execCount: 0};
          }

          const perRowBind = columns.length;
          if (binds.length % perRowBind !== 0) {
            throw new Error('bulkput binds length mismatch');
          }

          const tableName = escapeId(table);
          const colSql = columns.map(c => escapeId(c)).join(',');
          const rowPlace = '(' + new Array(perRowBind).fill('?').join(',') + ')';
          const totalRows = Math.floor(binds.length / perRowBind);
          const maxRowsPerStmt = Math.max(1, Math.floor(maxVariables / perRowBind));
          const acquired = !activeDbId;

          if (acquired) {
            inFlight++;
          }
          try {
            if (acquired) {
              await acquire();
            }
            ev.dbId = activeDbId;
            ev.args.dbId = activeDbId;
            const db = getMsgDb(ev);

            _runBulkStatement(
              db,
              skipTx,
              totalRows,
              maxRowsPerStmt,
              rowsInStmt => {
                const valuesSql = new Array(rowsInStmt).fill(rowPlace).join(',');
                return `INSERT OR REPLACE INTO ${tableName} (${colSql}) VALUES ${valuesSql}`;
              },
              (stmt, rowIdx, rowsInStmt) => {
                const start = rowIdx * perRowBind;
                const bindCount = rowsInStmt * perRowBind;

                for (let i = 0; i < bindCount; i++) {
                  stmt.bind(i + 1, binds[start + i]);
                }
              }
            );
          }
          finally {
            if (acquired) {
              inFlight--;
              release();
            }
          }

          return {ok: true, execCount: totalRows};
        };

        wMsgHandler.bulkdelete = async function(ev) {

          const args = ev.args || Object.create(null);
          const table = args.table;
          const pk = args.pk;
          const keys = Array.isArray(args.keys) ? args.keys : [];
          const skipTx = args.skipTx !== false;

          if (!table || !pk) {
            throw new Error("bulkdelete requires table and pk");
          }
          if (!keys.length) {
            return {ok: true, execCount: 0};
          }

          const tableName = escapeId(table);
          const pkName = escapeId(pk);
          const acquired = !activeDbId;

          if (acquired) {
            inFlight++;
          }
          try {
            if (acquired) {
              await acquire();
            }
            ev.dbId = activeDbId;
            ev.args.dbId = activeDbId;
            const db = getMsgDb(ev);

            _runBulkStatement(
              db,
              skipTx,
              keys.length,
              maxVariables,
              keysInStmt => {
                const placeholders = new Array(keysInStmt).fill('?').join(',');
                return `DELETE FROM ${tableName} WHERE ${pkName} IN (${placeholders})`;
              },
              (stmt, offset, keysInStmt) => {
                for (let i = 0; i < keysInStmt; i++) {
                  stmt.bind(i + 1, keys[offset + i]);
                }
              }
            );
          }
          finally {
            if (acquired) {
              inFlight--;
              release();
            }
          }

          return {ok: true, execCount: keys.length};
        };
        return ext;
      });
  })).catch(ex => {
    postMessage({type: 'worker-init-failed', error: ex && ex.message || String(ex)});
  }
);
