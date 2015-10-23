var IndexedDBKVStorage = function(name) {
    var self = this;
    this.dbInitialised = false;
    this.name = name;
    this.db = null;
    this.dbName = null;
};

IndexedDBKVStorage._requiresDbConn = function(fn) {
    return function() {
        var self = this;
        var args = arguments;
        var promise = new MegaPromise();

        if (!u_handle) {
            promise.reject();
            return promise;
        }
        if (self.dbName != self.name + "_" + u_handle) {
            if (self.db && self.db.dbState === MegaDB.DB_STATE.INITIALIZED) {
                self.db.close();
            }
            self.db = new MegaDB(
                self.name,
                u_handle,
                {
                    kv: { key: { keyPath: "k"   }}
                },
                {
                    plugins: MegaDB.DB_PLUGIN.ENCRYPTION
                }
            );
            self.dbName = self.name + "_" + u_handle;

            self.db.one('onDbStateReady', function() {
                promise.linkDoneAndFailTo(
                    fn.apply(self, args)
                );
                promise.fail(function() {
                    console.error("Failed to init IndexedDBKVStorage", arguments);
                });
            });
        } else {
            promise.linkDoneAndFailTo(
                fn.apply(self, args)
            );
        }

        return promise;
    }
};

IndexedDBKVStorage.prototype.setItem = IndexedDBKVStorage._requiresDbConn(function(k, v) {
    var promise = new MegaPromise();

    console.error("setItem", k, v);

    this.db.addOrUpdate(
        'kv',
        {
            'k': k,
            'v': v
        }
    )
        .done(function() {
            promise.resolve([k, v]);
        })
        .fail(function() {
            promise.reject([k, v]);
        });

    return promise;
});
IndexedDBKVStorage.prototype.getItem = IndexedDBKVStorage._requiresDbConn(function(k) {
    var promise = new MegaPromise();

    this.db.get(
        'kv',
        k
    )
        .done(function(r) {
            if(typeof(r) === 'undefined' || r.length === 0) {
                promise.reject();
            } else {
                promise.resolve(r.v);
            }
        })
        .fail(function() {
            promise.reject();
        });

    return promise;
});
IndexedDBKVStorage.prototype.removeItem = IndexedDBKVStorage._requiresDbConn(function(k) {
    return this.db.remove(
        'kv',
        k
    );
});
IndexedDBKVStorage.prototype.clear = IndexedDBKVStorage._requiresDbConn(function() {
    return this.db.clear(
        'kv'
    );
});
IndexedDBKVStorage.prototype.hasItem = IndexedDBKVStorage._requiresDbConn(function(k) {
    var promise = new MegaPromise();
    this.db.get(
        'kv',
        k
    )
        .done(function(r) {
            if(typeof(r) === 'undefined' || r.length === 0) {
                promise.reject();
            } else {
                promise.resolve();
            }
        })
        .fail(function() {
            promise.reject();
        });

    return promise;
});
