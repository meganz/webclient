var MegaAttribStorageAdapter = function() {
    this._kvCache = {};
};

MegaAttribStorageAdapter.prototype.setItem = function(k, v) {
    var isDone = false;
    var $promise = createTimeoutPromise(
        function() {
            return isDone === true
        },
        500,
        10000
    );

    setUserAttribute(
        k,
        {'': v}, // TODO: @Guy should find a way to fix this.. its ugly workaround.
        false,
        true,
        function() {
            isDone = true;
            $promise.verify();
        }
    );

    return $promise;
};
MegaAttribStorageAdapter.prototype.getItem = function(k) {
    assert(u_handle, "missing u_handle, can't proceed");

    var isDone = false;
    var $promise = createTimeoutPromise(
        function() {
            return isDone === true
        },
        500,
        10000
    );

    getUserAttribute(
        u_handle,
        k,
        false,
        true,
        function(res, ctx) {
            if (typeof res !== 'number') {
                if(res && typeof(res['']) !== 'undefined') {
                    $promise.resolve(res['']);
                    isDone = true;
                } else {
                    $promise.reject(res);
                    isDone = true;
                }
            } else {
                $promise.reject(res);
                isDone = true;
            }

        }
    );

    return $promise;
};
MegaAttribStorageAdapter.prototype.removeItem = function(k) {
    //TODO: We don't have a removeUserAttribute??
    return this.setItem(k, null);
};


MegaAttribStorageAdapterInstance = new MegaAttribStorageAdapter();
MegaUserKvStorage = new MegaKVStorage("usr", MegaAttribStorageAdapterInstance);