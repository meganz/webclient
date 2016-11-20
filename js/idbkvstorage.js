/**
 * IndexedDB Key/Value Storage
 */

// (the name must exist in the FMDB schema with index 'k')
var IndexedDBKVStorage = function(name, dbOpts, syncMemcache) {
    this.name = name;
    this.logger = new MegaLogger("IDBKVStorage[" + name + "]");
    this._memCache = {};
    this.syncMemcache = syncMemcache;
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
    
    if (self.syncMemcache) {
        self._mListener = mBroadcaster.addListener('idbchange:' + self.name + "_" + u_handle, function (data) {
            var k = data[0];
            var v = data[1];
            if (typeof(v) === 'undefined') {
                delete self._memCache[k];
            }
            else {
                self._memCache[k] = v;
            }

            self.trigger('onChange', [k, v]);
        });
    }
    return promise;
};

// set item (synchronously, can do without promise)
IndexedDBKVStorage.prototype.setItem = function __IDBKVSetItem(k, v) {
    var promise = new MegaPromise();

    if (this._memCache[k] !== v) {
        this._memCache[k] = v;

        if (this.fmdb) {
            this.fmdb.add(this.name, { k : k, d : { v : v }});
        }
        
        // FIXME: check if this is ok..
        var self = this;
        Soon(function() {
            if (self.syncMemcache) {
                watchdog.notify('idbchange', {
                    name: self.name + "_" + u_handle,
                    key: k,
                    value: v
                });
            }
        });
    }

    promise.resolve([k, v]);
           
    return promise;
};

// get item - if not found, promise will be rejected
IndexedDBKVStorage.prototype.getItem = function __IDBKVGetItem(k) {
    var self = this;

    var promise = new MegaPromise();

    if (typeof(self._memCache[k]) != 'undefined') {
        promise.resolve(self._memCache[k]);
        return promise;
    }

    if (this.fmdb) {
        this.fmdb.getbykey(this.name, 'k', false, [['k', k]], function(r){
            if (r.length) {
                self._memCache[r[0].k] = r[0].v;
                promise.resolve(r[0].v);
            }
            else {
                promise.reject();
            }
        });
    }
    else {
        // no DB available
        promise.reject();
    }

    return promise;
};

// remove item
IndexedDBKVStorage.prototype.removeItem = function __IDBKVRemoveItem(k) {
    if (typeof(this._memCache[k]) !== 'undefined') {
        delete this._memCache[k];
    }

    if (this.syncMemcache) {
        watchdog.notify('idbchange', {
            name: this.name + "_" + u_handle,
            key: k,
            value: undefined
        });
    }

    var promise = new MegaPromise();

    if (this.fmdb) this.fmdb.del(this.name, k);

    promise.resolve();

    return promise;
};

// clear all items
IndexedDBKVStorage.prototype.clear = function __IDBKVClear() {
    this._memCache = {};

    var promise = new MegaPromise();

    // FIXME: add .clear() to mDB.js
    if (this.fmdb) this.fmdb.clear(this.name);

    promise.resolve();

    return promise;
};

// FIXME: obsolete, remove
IndexedDBKVStorage.prototype.destroy = function __IDBKVDestroy() {
    var self = this;
    self._memCache = {};

    var promise = new MegaPromise();

    return MegaPromise.resolve();
};

// check if item exists
IndexedDBKVStorage.prototype.hasItem = function __IDBKVHasItem(k) {
    var promise = new MegaPromise();

    if (typeof(this._memCache[k]) != 'undefined') {
        return MegaPromise.resolve();
    }

    if (this.fmdb) {
        this.fmdb.getbykey(this.name, 'k', false, [['k', k]], function(r){
            if (r.length) {
                promise.resolve();
            }
            else {
                promise.reject();
            }
        });
    }
    else {
        // no DB available
        promise.reject();
    }

    return promise;
};

// iterate over all items
IndexedDBKVStorage.prototype.eachItem = function __IDBKVEachItem(cb) {
    var self = this;

    Object.keys(this._memCache).forEach(function(k) {
        cb(self._memCache[k], k);
    });

    // FIXME: also retrieve DB contents? (was not implemented in the original version)

    return MegaPromise.resolve();
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
makeObservable(IndexedDBKVStorage);