/**
 * IndexedDB Key/Value Storage
 */

// (the name must exist in the FMDB schema with index 'k')
function IndexedDBKVStorage(name) {
    'use strict';

    this.name = name;
    this.dbcache = Object.create(null);     // items that reside in the DB
    this.newcache = Object.create(null);    // new items that are pending flushing to the DB
    this.delcache = Object.create(null);    // delete items that are pending deletion from the DB
}

IndexedDBKVStorage.prototype = Object.create(null);

// sets fmdb reference and prefills the memory cache from the DB
// (call this ONCE as soon as the user-specific IndexedDB is open)
// (this is robust against an undefined fmdb reference)
IndexedDBKVStorage.prototype.load = function() {
    'use strict';
    var self = this;
    return new MegaPromise(function(resolve) {
        if (!window.fmdb) {
            return resolve();
        }
        fmdb.get(self.name)
            .always(function(r) {
                for (var i = r.length; i--;) {
                    self.dbcache[r[i].k] = r[i].v;
                }
                resolve();
            });
    });
};

// flush new items / deletions to the DB (in channel 0, this should
// be followed by call to setsn())
// will be a no-op if no fmdb set
IndexedDBKVStorage.prototype.flush = function() {
    'use strict';
    var k;
    var fmdb = window.fmdb || false;

    for (k in this.delcache) {
        if (fmdb) {
            fmdb.del(this.name, k);
        }
        delete this.dbcache[k];
    }

    for (k in this.newcache) {
        if (fmdb) {
            fmdb.add(this.name, {k: k, d: {v: this.newcache[k]}});
        }
        this.dbcache[k] = this.newcache[k];
    }

    this.delcache = Object.create(null);
    this.newcache = Object.create(null);
};

// set item in DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
IndexedDBKVStorage.prototype.setItem = function __IDBKVSetItem(k, v) {
    'use strict';
    var self = this;
    console.assert(v !== undefined);
    return new MegaPromise(function(resolve) {
        delete self.delcache[k];
        self.newcache[k] = v;
        self.saveState();
        resolve([k, v]);
    });
};

// get item - if not found, promise will be rejected
IndexedDBKVStorage.prototype.getItem = function __IDBKVGetItem(k) {
    'use strict';
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        if (!self.delcache[k]) {

            if (self.newcache[k] !== undefined) {
                // record recently (over)written
                return resolve(self.newcache[k]);
            }

            // record available in DB
            if (self.dbcache[k] !== undefined) {
                return resolve(self.dbcache[k]);
            }
        }

        // record deleted or unavailable
        reject();
    });
};

// remove item from DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
IndexedDBKVStorage.prototype.removeItem = function __IDBKVRemoveItem(k) {
    'use strict';

    this.delcache[k] = true;
    delete this.newcache[k];
    this.saveState();

    return MegaPromise.resolve();
};

// enqueue explicit flush
IndexedDBKVStorage.prototype.saveState = function() {
    'use strict';
    var self = this;

    delay('attribcache:savestate', function() {
        if (d) {
            console.debug('attribcache:savestate(%s)...', currsn, fminitialized);
        }

        if (fminitialized && currsn) {
            if (window.fmdb) {
                setsn(currsn);
            }
            else {
                self.flush();
            }
        }
    }, 2600);
};

// Clear DB Table and in-memory contents.
IndexedDBKVStorage.prototype.clear = promisify(function __IDBKVClear(resolve, reject) {
    'use strict';

    console.error("This function should not be used under normal conditions...");
    IndexedDBKVStorage.call(this, this.name);

    if (window.fmdb && Object(fmdb.db).hasOwnProperty(this.name)) {
        return fmdb.db[this.name].clear().then(resolve).catch(reject);
    }

    reject();
});

if (!is_karma) {
    Object.freeze(IndexedDBKVStorage.prototype);
}
Object.freeze(IndexedDBKVStorage);

var attribCache = false;
mBroadcaster.once('boot_done', function() {
    'use strict';
    attribCache = new IndexedDBKVStorage('ua');
    attribCache.bitMapsManager = new MegaDataBitMapManager();

    // We no longer need this for anything else.
    window.IndexedDBKVStorage = null;
});
