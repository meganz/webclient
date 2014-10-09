/**
 * Mega Key/Value Storage
 *
 * Simple, fast, easy to use key/value storage that works with localStorage and sessionStorage
 *
 * The main goal of using this, instead of directly using local/sessionStorage is that this class will manage all
 * key/values in with prefix in an optimal/fast way.
 *
 * Key features:
 *  - to be able to clear ANY data stored easily
 *  - to be fast, by NOT using any data serialization (e.g. JSON)
 *
 * Also, in the future, we can extend this to store the data in encrypted way or simply to store data to a more
 * persistent place like IndexedDB
 */

/**
 * Mega Simple Key/Value Storage
 *
 * @param name {string} name of the storage (a-zA-Z0-9, used for prefixing keys when storing the data)
 * @param adapter {Storage} localStorage or sessionStorage
 * @returns {MegaKVStorage}
 * @constructor
 */
function MegaKVStorage(name, adapter) {
    this.name = name;
    this.adapter = adapter;
    return this;
};

/**
 * Generates a key which is prefixed with the `name` of this instance
 *
 * @param k
 * @returns {string}
 * @private
 */
MegaKVStorage.prototype._genBucketName = function(k) {
    return this.name + "." + k;
};

/**
 * `Storage.setItem` implementation
 *
 * @param k
 * @param v
 * @param [expiration] {Number} optional number of seconds to expire this item after
 */
MegaKVStorage.prototype.setItem = function(k, v, expiration) {
    var r = this.adapter.setItem(this._genBucketName(k), v);
    if(expiration) {
        this.adapter.setItem(this._genBucketName(k) + ".exp", unixtime() + expiration);
    }
    return r;
};

/**
 * `Storage.removeItem` implementation
 *
 * @param k
 */
MegaKVStorage.prototype.removeItem = function(k) {
    this.adapter.removeItem(this._genBucketName(k) + ".exp");
    return this.adapter.removeItem(this._genBucketName(k));
};

/**
 * Utility func, used to check if a key had expired (and remove it from the storage)
 *
 * @param k
 * @returns {boolean}
 * @private
 */
MegaKVStorage.prototype._checkAndRemoveIfExpired = function(k) {
    // check if expired first
    var expiredVal = this.adapter.getItem(this._genBucketName(k) + ".exp");
    if(expiredVal && expiredVal < unixtime()) {
        this.removeItem(k);

        return true;
    } else {
        return false;
    }
};

/**
 * `Storage.getItem` implementation + default_val, what to return in case that this value is not available
 *
 * @param k
 * @param default_val
 * @returns {*}
 */
MegaKVStorage.prototype.getItem = function(k, default_val) {
    if(this._checkAndRemoveIfExpired(k) === true) {
        return default_val;
    }
    var val = this.adapter.getItem(this._genBucketName(k));
    return val !== null ? val : default_val;
};

/**
 * Check if a specific item (by key) exists in the currently stored k/v items
 *
 * @param k
 * @returns {boolean}
 */
MegaKVStorage.prototype.hasItem = function(k) {
    if(this._checkAndRemoveIfExpired(k) === true) {
        return false;
    }
    return this.adapter.getItem(this._genBucketName(k)) !== null;
};


/**
 * Clear storage
 */
MegaKVStorage.prototype.clear = function() {
    for(var i = 0; i < this.adapter.length; i++) {
        var k = this.adapter.key(i);
        if(k.indexOf(this._genBucketName("")) === 0) {
            this.adapter.removeItem(k);
        }
    }
};
