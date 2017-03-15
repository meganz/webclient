/**
 * IndexedDB Key/Value Storage
 */

// (the name must exist in the FMDB schema with index 'k')
var IndexedDBKVStorage = function(name) {
    this.name = name;
    this.logger = new MegaLogger("IDBKVStorage[" + name + "]");
    this.destroy();
};

// sets fmdb reference and prefills the memory cache from the DB
// (call this ONCE as soon as the user-specific IndexedDB is open)
// (this is robust against an undefined fmdb reference)
IndexedDBKVStorage.prototype.prefillMemCache = function(fmdb) {
    var self = this;
    this.fmdb = fmdb;

    var promise = new MegaPromise();

    if (fmdb) {
        fmdb.get(this.name, function(r){
            for (var i = r.length; i--; ) {
                self.dbcache[r[i].k] = r[i].v;
            }

            promise.resolve();
        });
    }
    else promise.resolve();

    return promise;
};

// flush new items / deletions to the DB (in channel 0, this should
// be followed by call to setsn())
// will be a no-op if no fmdb set
IndexedDBKVStorage.prototype.flush = function() {
    if (this.fmdb) {
        for (var k in this.delcache) {
            this.fmdb.del(this.name, k);
            delete this.dbcache[k];
        }
        this.delcache = Object.create(null);

        for (var k in this.newcache) {
            this.fmdb.add(this.name, { k : k, d : { v : this.newcache[k] }});
            this.dbcache[k] = this.newcache[k];
        }
        this.newcache = Object.create(null);
    }
};

// set item in DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.setItem = function __IDBKVSetItem(k, v) {
    var promise = new MegaPromise();

    delete this.delcache[k];
    this.newcache[k] = v;

    promise.resolve([k, v]);

    return promise;
};

// get item - if not found, promise will be rejected
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.getItem = function __IDBKVGetItem(k) {
    var promise = new MegaPromise();

    if (!this.delcache[k]) {
        if (typeof(this.newcache[k]) != 'undefined') {
            // record recently (over)written
            promise.resolve(this.newcache[k]);
            return promise;
        }
        else {
            // record available in DB
            if (typeof(this.dbcache[k]) != 'undefined') {
                promise.resolve(this.dbcache[k]);
                return promise;
            }
        }
    }

    // record deleted or unavailable
    promise.reject();
    return promise;
};

// check if item exists
IndexedDBKVStorage.prototype.hasItem = function __IDBKVHasItem(k) {
    var promise = new MegaPromise();

    if (!this.delcache[k] && (typeof(this.newcache[k]) != 'undefined' || typeof(this.dbcache[k]) != 'undefined')) {
        return MegaPromise.resolve();
    }

    return MegaPromise.reject();
};

// remove item from DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.removeItem = function __IDBKVRemoveItem(k) {
    this.delcache[k] = true;
    delete this.newcache[k];

    var promise = new MegaPromise();
    promise.resolve();
    return promise;
};

// iterate over all items, with prefix
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.eachPrefixItem = function __IDBKVEachItem(prefix, cb) {
    for (var k in this.newcache) {
        if (!this.delcache[k]) cb(this.newcache[k], k);
    }

    for (var k in this.dbcache) {
        if (!this.delcache[k] && typeof this.newcache[k] == 'undefined') cb(this.dbcache[k], k);
    }

    return MegaPromise.resolve();
};

// FIXME: check if this gets called for caches other than the ua attribCache
// - if that is the case, also clear the underlying DB table
IndexedDBKVStorage.prototype.destroy = function __IDBKVDestroy() {
    this.dbcache = Object.create(null);     // items that reside in the DB
    this.newcache = Object.create(null);    // new items that are pending flushing to the DB
    this.delcache = Object.create(null);    // delete items that are pending deletion from the DB
};

/**
 * Clear DB contents.
 * @returns {MegaPromise}
 */
IndexedDBKVStorage.prototype.clear = function __IDBKVClear() {
    var self = this;
    var fmdb = this.fmdb;
    var promise = new MegaPromise();

    this.destroy();

    if (fmdb && Object(fmdb.db).hasOwnProperty(this.name)) {

        fmdb.db[this.name].clear().then(function() {
            self.logger.debug("Table cleared.");
        }).catch(function(err) {
            self.logger.error("Unable to clear table!", err);
        }).finally(function() {
            promise.resolve();
        });
    }
    else {
        promise.reject();
    }

    return promise;
};
makeObservable(IndexedDBKVStorage);
