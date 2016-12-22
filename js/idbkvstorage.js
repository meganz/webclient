/**
 * IndexedDB Key/Value Storage
 */

// (the name must exist in the FMDB schema with index 'k')
var IndexedDBKVStorage = function(name) {
    this.name = name;
    this.logger = new MegaLogger("IDBKVStorage[" + name + "]");
    this._memCache = Object.create(null);
};

// sets fmdb reference and prefills the memory cache from the DB
// (call this ONCE as soon as the user-specific IndexedDB is open)
// (this is robust against an undefined fmdb reference)
IndexedDBKVStorage.prototype.prefillMemCache = function(fmdb) {
    var self = this;
    this.fmdb = fmdb;

    var promise = new MegaPromise();

    if (fmdb) {
        this.fmdb.getbykey(this.name, 'k', false, false, function(r){
            for (var i = r.length; i--; ) {
                self._memCache[r[i].k] = r[i].v;
            }

            promise.resolve();
        });
    }
    else promise.resolve();

    return promise;
};

// set item in DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.setItem = function __IDBKVSetItem(k, v) {
    var promise = new MegaPromise();

    if (this._memCache[k] !== v) {
        this._memCache[k] = v;

        if (this.fmdb) {
            this.fmdb.add(this.name, { k : k, d : { v : v }});
        }
    }

    promise.resolve([k, v]);

    return promise;
};

// get item - if not found, promise will be rejected
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.getItem = function __IDBKVGetItem(k) {
    var self = this;

    var promise = new MegaPromise();

    if (typeof(self._memCache[k]) != 'undefined') {
        // record exists
        promise.resolve(self._memCache[k]);
    }
    else {
        // no such record
        promise.reject();
    }

    return promise;
};

// remove item from DB/cache
// (must only be called in response to an API response triggered by an actionpacket)
// FIXME: convert to synchronous operation
IndexedDBKVStorage.prototype.removeItem = function __IDBKVRemoveItem(k) {
    if (typeof(this._memCache[k]) != 'undefined') {
        delete this._memCache[k];
        if (this.fmdb) this.fmdb.del(this.name, k);
    }

    var promise = new MegaPromise();
    promise.resolve();
    return promise;
};

// iterate over all items, with prefix
IndexedDBKVStorage.prototype.eachPrefixItem = function __IDBKVEachItem(prefix, cb) {
    var self = this;

    Object.keys(this._memCache).forEach(function(k) {
        if (k.indexOf(prefix) === 0) {
            cb(self._memCache[k], k);
        }
    });

    // FIXME: also retrieve DB contents? (was not implemented in the original version)

    return MegaPromise.resolve();
};

// FIXME: check if this gets called for caches other than the ua attribCache
// - if that is the case, also clear the underlying DB table
IndexedDBKVStorage.prototype.destroy = function __IDBKVDestroy() {
    this._memCache = Object.create(null);
};
makeObservable(IndexedDBKVStorage);
