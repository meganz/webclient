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
 */
MegaKVStorage.prototype.setItem = function(k, v) {
    return this.adapter.setItem(this._genBucketName(k), v);
};

/**
 * `Storage.removeItem` implementation
 *
 * @param k
 */
MegaKVStorage.prototype.removeItem = function(k) {
    return this.adapter.removeItem(this._genBucketName(k));
};


/**
 * `Storage.getItem` implementation + default_val, what to return in case that this value is not available
 *
 * @param k
 * @param default_val
 * @returns {*}
 */
MegaKVStorage.prototype.getItem = function(k, default_val) {
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
