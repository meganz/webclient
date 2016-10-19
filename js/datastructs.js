/**
 * MEGA Data Structures
 * Modern/unified way of handling/monitoring/syncing data changes required for the Webclient to work in a more:
 * 1. easy to use by us (developers)
 * 2. reactive/optimised way
 */

var TRACK_CHANGES_THROTTLING_MS = 75;
var MAX_INDEX_NUMBER = 65000;

var _arrayAliases = [
    'concat',
    'copyWithin',
    'entries',
    'every',
    'fill',
    'filter',
    'forEach',
    'includes',
    'indexOf',
    'join',
    'keys',
    'lastIndexOf',
    'map',
    'pop',
    'push',
    'reduce',
    'reduceRight',
    'reverse',
    'shift',
    'slice',
    'some',
    'sort',
    'splice',
    'toLocaleString',
    'toSource',
    'toString',
    'unshift',
    'values'
];



/**
 * Helper Exception to be used for "break"-ing .forEach calls
 */
if (typeof StopIteration == "undefined") {
    StopIteration = new Error("StopIteration");
}

function breakableForEach(arr, cb) {
    try {
        return Array.prototype.forEach.call(arr, cb);
    }
    catch(e) {
        if (e !== StopIteration) {
            throw e;
        }
    }
};

var _createObjectDataMethods = function(kls) {
    var obj = kls.prototype ? kls.prototype : kls;

    obj.forEach = function(cb) {
        var self = this;
        self.keys().forEach(function(k) {
            cb(self._data[k], k);
        });
    };
    obj.breakableForEach = function(cb) {
        var self = this;
        breakableForEach(self.keys(), function(k) {
            cb(self._data[k], k);
        });
    };
    obj.every = function(cb) {
        var self = this;
        return self.keys().every(function(k) {
            return cb(self._data[k], k);
        });
    };
    obj.some = function(cb) {
        var self = this;
        return self.keys().some(function(k) {
            return cb(self._data[k], k);
        });
    };

    obj.map = function(cb) {
        var self = this;
        var res = [];
        self.forEach(function(v, k) {
            var intermediateResult = cb(v, k);
            if (intermediateResult !== null && intermediateResult !== undefined) {
                res.push(intermediateResult);
            }
        });
        return res;
    };

    obj.keys = function() {
        return Object.keys(this._data)
    };

    obj.size = function() {
        return this.keys().length
    };

    obj.hasOwnProperty = function(prop) {
        return this._data.hasOwnProperty(prop);
    };

    obj.propertyIsEnumerable = function(prop) {
        return this._data.propertyIsEnumerable(prop);
    };

    obj.destroyStructure = function() {
        this.trackDataChange();
        for (var k in this.keys()) {
            delete this[k];
        }
        delete this._data;
        delete this;
        Object.freeze(this); // TODO: is this needed?
    };
};

var _arrayMethodsThatAltersData = [
    'push',
    'pop',
    'remove',
    'unshift',
    'sort',
    'fill',
    'splice',
    'reverse',
    'shift'
];

var _trackedId = 0;


var _properJSCmp = function(a, b) {
    if (Number.isNaN(a) && Number.isNaN(b)) {
        return true;
    }
    else if (typeof(a) == 'boolean' || typeof(b) == 'boolean') {
        return a === b;
    }
    else {
        return a == b;
    }
};

var _fromJSDecorator = function(kls) {
    return function(obj, implementChangeListener) {
        var props = Object.keys(obj);
        var actualPropsMap = {};
        props.forEach(function(k) {
            actualPropsMap[k] = undefined;
        });
        return new kls(actualPropsMap, implementChangeListener, obj);
    };
};

var _toJS = function() {
    return this._data;
};

var manualTrackChangesOnStructure = function(obj, implementChangeListener) {
    if (obj.prototype) { // if called on a class...
        obj = obj.prototype;
    }

    implementChangeListener = implementChangeListener || false;

    obj._dataChangeIndex = 0;
    obj._dataChangeTrackedId = _trackedId++;




    obj.trackDataChange = function() {
        var self = this;

        if (self._dataChangeThrottlingTimer) {
            clearTimeout(self._dataChangeThrottlingTimer);
        }

        var args = toArray.apply(null, arguments);

        self._dataChangeThrottlingTimer = setTimeout(function() {
            delete self._dataChangeThrottlingTimer;
            if (self._dataChangeIndex > MAX_INDEX_NUMBER) {
                self._dataChangeIndex = 0;
            }
            else {
                self._dataChangeIndex++;
            }

            if (implementChangeListener === true) {
                if (window.RENDER_DEBUG) {
                    console.error("changed: ", self);
                }
                mBroadcaster.sendMessage.apply(
                    mBroadcaster,
                    [
                        self._getDataChangeEventName(),
                        self
                    ].concat(args.length > 0 ? args : [])
                );
            }
        }, TRACK_CHANGES_THROTTLING_MS);


        if (self._parent && self._parent.trackDataChange) {
            self._parent.trackDataChange(); // trigger bubble-like effect, in the order of: child -> parent
        }
    };


    obj._getDataChangeEventName = function() {
        return 'change_' + this._dataChangeTrackedId;
    };

    if (implementChangeListener === true) {
        obj.addChangeListener = function(cb) {
            cb._changeListenerId = mBroadcaster.addListener(this._getDataChangeEventName(), cb.bind(obj));
            return cb._changeListenerId;
        };
        obj.removeChangeListener = function(cb) {
            assert(
                typeof cb === 'string' || typeof cb._changeListenerId != 'undefined',
                'this method/cb was not used as a change listener'
            );

            if (typeof cb === 'string') {
                mBroadcaster.removeListener(cb);
            }
            else {
                mBroadcaster.removeListener(cb._changeListenerId);
            }
        };
    }
};

var trackPropertyChanges = function(obj, properties, implementChangeListener) {
    if (obj.prototype) { // if called on a class...
        obj = obj.prototype;
    }

    manualTrackChangesOnStructure(obj, implementChangeListener);

    if (!obj._data) {
        obj._data = {};
    }


    Object.keys(properties).forEach(function(k) {
        var v = properties[k];

        Object.defineProperty(obj, k, {
            get: function () {
                return obj.get(k, v);
            },
            set: function (value) {
                obj.set(k, value, false, v);
            },
            enumerable: true
        });
    });

    if (!obj.set) {
        obj.set = function (k, v, ignoreDataChange, defaultVal) {
            if (typeof(this._data[k]) === 'undefined' || _properJSCmp(this._data[k], v) !== true) {
                if (
                    typeof(this._data[k]) === 'undefined' &&
                    typeof(defaultVal) !== 'undefined' &&
                    _properJSCmp(defaultVal, v) === true
                ) {
                    // this._data[...] is empty and defaultVal == newVal, DON'T track updates.
                    return false;
                }

                if (!ignoreDataChange) {
                    this.trackDataChange();
                }
                this._data[k] = v;
            }
        };
    }

    if (!obj.get) {
        obj.get = function (k, defaultVal) {
            return this._data && typeof(this._data[k]) !== 'undefined' ? this._data[k] : defaultVal;
        };
    }
};

/**
 * Simple array-like implementation that tracks changes
 *
 * @param [parent]
 * @constructor
 */
var MegaDataArray = function(parent) {
    var self = this;
    self._data = [];
    self._parent = parent || undefined;

    manualTrackChangesOnStructure(self, true);

    Object.defineProperty(self, 'length', {
        get: function() { return self._data.length; },
        enumerable: false,
        configurable: true
    });
};

_arrayAliases.forEach(function(methodName) {
    MegaDataArray.prototype[methodName] = function() {
        var ret;
        try {
            if (methodName == "push") {
                if (
                    arguments.length > 0 &&
                    (typeof(arguments[0]._dataChangeIndex) !== 'undefined') &&
                    !arguments[0]._parent
                ) {
                    arguments[0]._parent = this;
                }
            }
            if (methodName == "breakableForEach") {
                return breakableForEach(this._data, arguments[0]);
            }
            else {
                ret = this._data[methodName].apply(this._data, arguments);
            }

            if (_arrayMethodsThatAltersData.indexOf(methodName) >= 0) {
                this.trackDataChange(this._data, ret);
            }
            return ret;
        } catch(e) {
            throw e;
        }
    }
});


MegaDataArray.prototype.getItem = function(idx) {
    return this._data[idx];
};

MegaDataArray.prototype.keys = function() {
    return Object.keys(this._data);
};

/**
 * Plain Object-like container for storing data, with the following features:
 * - track changes ONLY on predefined list of properties
 *
 * @param properties {Object}
 * @param [implementChangeListener]
 * @param [defaultData] {Object} default/initial data
 * @constructor
 */
var MegaDataObject = function(properties, implementChangeListener, defaultData) {
    var self = this;
    self._data = clone(defaultData !== undefined ? defaultData : {});

    trackPropertyChanges(self, properties, implementChangeListener)
};

_createObjectDataMethods(MegaDataObject);
MegaDataObject.fromJS = _fromJSDecorator(MegaDataObject);
MegaDataObject.prototype.toJS = _toJS;
MegaDataObject.attachToExistingJSObject = function(obj, properties, implementChangeListener, defaultData) {
    MegaDataObject.apply(obj, [properties, implementChangeListener, defaultData]);

    _createObjectDataMethods(obj);
    obj.toJS = _toJS;
};

/**
 * Simple map-like implementation that tracks changes
 *
 * @param [parent]
 * @constructor
 */
var MegaDataMap = function(parent) {
    var self = this;
    self._data = {};
    self._parent = parent || undefined;

    manualTrackChangesOnStructure(self, true);

    Object.defineProperty(self, 'length', {
        get: function() { return Object.keys(self._data).length; },
        enumerable: false,
        configurable: true
    });
};

MegaDataMap.prototype.exists = function(keyValue) {
    var self = this;
    if (typeof(self._data[keyValue]) !== 'undefined') {
        return true;
    }
    else {
        return false;
    }
};

MegaDataMap.prototype.set = function(k, v, ignoreTrackDataChange) {

    if (!k) { debugger; }

    assert(!!k, "missing key");

    var self = this;

    if (typeof v._dataChangeIndex != 'undefined' &&  !v._parent) {
        v._parent = this;
    }

    if (_properJSCmp(self._data[k], v) === true) {
        return;
    }

    self._data[k] = v;

    if (typeof(this[k]) !== 'undefined') {
        self[k] = v;
    }
    else {
        Object.defineProperty(this, k, {
            get: function () {
                return self._data[k];
            },
            set: function (value) {
                if (value !== self._data[k]) {
                    self._data[k] = value;

                    self.trackDataChange(self._data, k, v);
                }
            },
            enumerable: true
        });
    }

    if (!ignoreTrackDataChange) {
        self.trackDataChange(self._data, k, v);
    }
};

MegaDataMap.prototype.remove = function(k) {

    var self = this;

    var v = self._data[k];

    if (v && v._parent && v._parent == this) {
        v._parent = null;
    }

    if (v) {
        delete self._data[k];
        delete this[k];
    }


    self.trackDataChange(self._data, k, v);
};

_createObjectDataMethods(MegaDataMap);

MegaDataMap.prototype.toJS = _toJS;


/**
 * MegaDataSortedMap
 */

var MegaDataSortedMap = function(keyField, sortField, parent) {
    MegaDataMap.call(this, parent);

    this._keyField = keyField;
    this._sortField = sortField;

    this._sortedVals = [];
};

Object.keys(MegaDataMap.prototype).forEach(function(k) {
    MegaDataSortedMap.prototype[k] = MegaDataMap.prototype[k];
});

MegaDataSortedMap.prototype.replace = function(k, newValue) {
    var self = this;
    if (self._data[k]) {
        // cleanup
        var old = self._data[k];
        self._data[k] = newValue;
        if (typeof(self._sortField) === "function") {
            // if order had changed...do call .reorder()
            if (self._sortField(old, newValue) !== 0) {
                self.reorder();
            }
        }
        else {
            // maybe we should do parsing of the ._sortField if its a string and manually compare the old and new
            // value's order property if it had changed
            self.reorder();
        }
        return true;
    }
    else {
        return false;
    }
};

MegaDataSortedMap.prototype.push = function(v) {
    var self = this;

    var keyVal = v[self._keyField];

    // if already exist, remove previously stored value (e.g. overwrite...)
    if (self._data[keyVal]) {
        removeValue(self._sortedVals, keyVal, false);

        // clean up the defineProperty
        delete self._data[keyVal];
        delete self[keyVal];
    }

    self.set(keyVal, v, true);

    self._sortedVals.push(
        keyVal
    );

    self.reorder();

    return self._sortedVals.length;
};

MegaDataSortedMap.prototype.reorder = function(forced) {
    var self = this;

    if (self._reorderThrottlingTimer) {
        clearTimeout(self._reorderThrottlingTimer);
        delete self._reorderThrottlingTimer;
    }

    self._reorderThrottlingTimer = setTimeout(function() {
        if (self._sortField) {
            if (typeof(self._sortField) === "function") {
                self._sortedVals.sort(function (a, b) {
                    return self._sortField(self._data[a], self._data[b]);
                });
            }
            else {
                var sortFields = self._sortField.split(",");

                self._sortedVals.sort(function (a, b) {
                    for (var i = 0; i < sortFields.length; i++) {
                        var sortField = sortFields[i];
                        var ascOrDesc = 1;
                        if (sortField.substr(0, 1) === "-") {
                            ascOrDesc = -1;
                            sortField = sortField.substr(1);
                        }

                        if (self._data[a][sortField] && self._data[b][sortField]) {
                            if (self._data[a][sortField] < self._data[b][sortField]) {
                                return -1 * ascOrDesc;
                            }
                            else if (self._data[a][sortField] > self._data[b][sortField]) {
                                return 1 * ascOrDesc;
                            }
                            else {
                                return 0;
                            }
                        }
                    }
                    return 0;
                });
            }
        }

        self.trackDataChange(self._data);
    }, forced ? 0 : 75);
};


MegaDataSortedMap.prototype.removeByKey = function(keyValue) {
    var self = this;
    if (self._data[keyValue]) {
        removeValue(self._sortedVals, keyValue);
        delete self._data[keyValue];
        delete self[keyValue];
        self.reorder();
        return true;
    }
    else {
        return false;
    }
};

MegaDataSortedMap.prototype.replace = function(k, newValue) {
    var self = this;
    if (self._data[k]) {
        // cleanup
        var old = self._data[k];
        self._data[k] = newValue;
        if (typeof(self._sortField) === "function") {
            // if order had changed...do call .reorder()
            if (self._sortField(old, newValue) !== 0) {
                self.reorder();
            }
        }
        else {
            // maybe we should do parsing of the ._sortField if its a string and manually compare the old and new
            // value's order property if it had changed
            self.reorder();
        }
        return true;
    }
    else {
        return false;
    }
};
MegaDataSortedMap.prototype.exists = function(keyValue) {
    var self = this;
    if (self._data[keyValue]) {
        return true;
    }
    else {
        return false;
    }
};

MegaDataSortedMap.prototype.keys = function() {
    var self = this;
    return clone(self._sortedVals);
};

MegaDataSortedMap.prototype.values = function() {
    var self = this;
    var res = [];
    self.forEach(function(v) {
        res.push(v);
    });

    return res;
};

MegaDataSortedMap.prototype.getItem = function(num) {
    var self = this;

    var foundKeyVal = self._sortedVals[num];
    if (foundKeyVal) {
        return self._data[foundKeyVal];
    }
    else {
        return undefined;
    }
};


MegaDataSortedMap.prototype.indexOfKey = function(value) {
    var self = this;
    return self._sortedVals.indexOf(value);
};


/**
 * Alias of .removeByKey
 *
 * @param k
 */
MegaDataSortedMap.prototype.remove = function(k) {
    return this.removeByKey(k);
};

MegaDataSortedMap.prototype.clear = function() {
    this._data = {};
    this._sortedVals = [];
};

testMegaDataSortedMap = function() {
    var arr1 = new MegaDataSortedMap("id", "orderValue,ts");
    arr1.push({
        'id': 1,
        'ts': 1,
        'orderValue': 1
    });

    arr1.push({
        'id': 2,
        'ts': 3,
        'orderValue': 2
    });
    arr1.push({
        'id': 3,
        'ts': 2
    });

    arr1.forEach(function(v, k) {
        console.error(v, k);
    });
    return arr1;
};


/**
 * Generic "MegaDataBitMap" manager that manages a list of all registered (by unique name) MegaDataBitMaps
 *
 * @constructor
 */
var MegaDataBitMapManager = function() {
    this._bitmaps = {};
};

/**
 * Register a MegaDataBitMap
 * @param {String} name
 * @param {MegaDataBitMap} megaDataBitMap
 */
MegaDataBitMapManager.prototype.register = function(name, megaDataBitMap) {
    if (typeof(this._bitmaps[name]) !== 'undefined') {
        console.error("Tried to register a MegaDataBitMap that already exists (at least with that name).");
        return;
    }
    this._bitmaps[name] = megaDataBitMap;
};

/**
 * Check if an MegaDataBitMap with a specific `name` exists.
 *
 * @param {String} name
 * @returns {Boolean}
 */
MegaDataBitMapManager.prototype.exists = function(name) {
    return typeof(this._bitmaps[name]) !== 'undefined';
};

/**
 * Get the instance of a specific by `name` MegaDataBitMap
 *
 * @param {String} name
 * @returns {*}
 */
MegaDataBitMapManager.prototype.get = function(name) {
    return this._bitmaps[name];
};

/**
 * MegaDataBitMaps are array, that are stored as attributes (on the MEGA API side), which hold 0s and 1s for a specific
 * (predefined, ordered set of) keys.
 * Once the data is .commit()'ed adding new keys should always be done at the end of the array.
 * No keys should be removed, because that would mess up the values stored in the user attribute, since all keys are
 * only available on the client side, the data is mapped via the key index (e.g. key1 = 0, key2 = 1, keyN = N - 1).
 *
 * @param {String} name Should be unique.
 * @param {Boolean} isPub should the attribute be public or private?
 * @param {Array} keys Array of keys
 * @param {*} [parent] not used yet.
 * @constructor
 */
var MegaDataBitMap = function(name, isPub, keys, parent) {
    var self = this;
    self.name = name;
    self._keys = keys;
    self._isPub = isPub;
    self._data = new Uint8Array(keys.length);
    self._updatedMask = new Uint8Array(keys.length);
    self._version = null;
    self._readyPromise = new MegaPromise();


    Object.defineProperty(self, 'length', {
        get: function() { return self._data.length; },
        enumerable: false,
        configurable: true
    });

    var properties = {};
    keys.forEach(function(k) {
        properties[k] = 0;
    });

    trackPropertyChanges(self, properties, true);

    if (typeof(attribCache) === 'undefined' || typeof(attribCache.bitMapsManager) === 'undefined') {
        console.error('Tried to initialise a MegaDataBitMap, before the bitMapsManager/attribCache is ready.');
        return;
    }

    attribCache.bitMapsManager.register(name, self);

    mega.attr.get(
            u_handle,
            name,
            self.isPublic() ? true : -2,
            true
        )
            .done(function(r) {
                if (typeof(r) === 'string') {
                    self.mergeFrom(r, false);
                }
                else if (r === -9) {
                    // its ok, -9 means the attribute does not exists on the server
                }
                else {
                    console.error("mega.attr.get failed:", arguments);
                }
            })
            .fail(function(r) {
                if (r === -9) {
                    // its ok, -9 means the attribute does not exists on the server
                    return;
                }
                else {
                    console.error("mega.attr.get failed:", arguments);
                }
            })
            .always(function() {
                self._readyPromise.resolve();
            });
};


/**
 * Returns a list of keys that are currently registered with this MegaDataBitMap instance.
 *
 * @returns {Array}
 */
MegaDataBitMap.prototype.keys = function() {
    return clone(this._keys);
};


/**
 * Flip the value of `key` from 0 -> 1 or from 1 -> 0
 * Calling this function would trigger a change event.
 * Calling this function would NOT persist the data on the server, until the .commit() method is called.
 *
 * @param {String} key
 * @returns {Boolean}
 */
MegaDataBitMap.prototype.toggle = function(key) {
    var keyIdx = this._keys.indexOf(key);
    if (keyIdx === -1) {
        return false;
    }

    this.set(key, !this._data[keyIdx] ? 1 : 0);
};

/**
 * Reset the internal "updated mask" to mark all keys as commited.
 * Mainly used internally by `MegaDataBitMap.prototype.commit()`
 */
MegaDataBitMap.prototype.commited = function() {
    this._updatedMask = new Uint8Array(this._keys.length);
};

/**
 * Change the value of `key` to `v` (can be either 0 or 1, integer).
 * Calling this function would trigger a change event.
 * Calling this function would NOT persist the data on the server, until the .commit() method is called.
 *
 * @param {String} key
 * @param {Number} v Can be either 0 or 1
 * @param {Boolean} ignoreDataChange If true, would not trigger a change event
 * @param {Number} defaultVal By default, the default value is supposed to be 0, but any other value can be passed here
 */
MegaDataBitMap.prototype.set = function(key, v, ignoreDataChange, defaultVal) {
    if (typeof(v) !== 'number' && v !== 1 && v !== 0) {
        console.error("MegaDataBitMap...set was called with non-zero/one value as 2nd argument.");
        return;
    }

    var self = this;
    self._readyPromise.done(function() {
        defaultVal = defaultVal ? defaultVal : 0;
        var keyIdx = self._keys.indexOf(key);
        if (keyIdx === -1) {
            return false;
        }

        if (
            (
                typeof(self._data[keyIdx]) === 'undefined' &&
                typeof(defaultVal) !== 'undefined' &&
                _properJSCmp(defaultVal, v) === true
            ) || (
                self._data[keyIdx] === v /* already the same value... */
            )
        ) {
            // self._data[...] is empty and defaultVal == newVal, DON'T track updates.
            return false;
        }

        self._data[keyIdx] = v;
        self._updatedMask[keyIdx] = 1;

        if (!ignoreDataChange) {
            self.trackDataChange(self._data, key, v);
        }
    });
};

/**
 * Optionally check if the MegaDataBitMap is ready to be used, e.g. the data is retrieved from the server.
 * .set and .get are automatically going to wait for the data to be loaded from the API, so this is not needed to be
 * called before .get/.set, but in all other use cases this can be used.
 *
 * @returns {Boolean}
 */
MegaDataBitMap.prototype.isReady = function() {
    return this._readyPromise.state() !== 'pending';
};

MegaDataBitMap.prototype.get = function(key, defaultVal) {
    var self = this;
    var resPromise = new MegaPromise();
    self._readyPromise
        .done(function() {
            defaultVal = defaultVal ? defaultVal : false;
            var keyIdx = self._keys.indexOf(key);
            if (keyIdx === -1) {
                resPromise.reject(key);
                return undefined;
            }

            resPromise.resolve(
                self._data && typeof(self._data[keyIdx]) !== 'undefined' ? self._data[keyIdx] : defaultVal
            );
        })
        .fail(function() {
            resPromise.reject(arguments);
        });
    return resPromise;
};

/**
 * Merge the current MegaDataBitMap value with a {String} `base64str`.
 * Merging is done the following way:
 * - IF a value of a key, passed by `base64str` differs from the one in the current instance:
 *  a) if was marked as 'dirty' (not commited, via the update mask) it would not be merged (its assumed that any data,
 *  stored in 'dirty' state and not commited is the most up to date one)
 *  b) the local value for that key would be updated, following a change event
 *
 * @param {String} base64str String, similar to 'AAAA', containing the data that you want to merge with the current
 * MegaDataBitMap instance
 * @param {Boolean} requiresCommit Pass true, to mark all changes in the update mask (e.g. they would be schedulled for
 * sending to the server on the next .commit() call)
 */
MegaDataBitMap.prototype.mergeFrom = function(base64str, requiresCommit) {
    var self = this;

    var str = base64urldecode(base64str);
    var targetLength = str.length;
    if (self._keys.length > str.length) {
        targetLength = self._keys.length;
    }
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        var newVal = str.charCodeAt(i);
        if (self._data[i] !== newVal) {
            if (self._updatedMask[i] && self._updatedMask[i] === 1) {
                // found uncommited change, would leave (and not merge), since in that case, we would assume that
                // since changes are commited (almost) immediately after the .set()/.toggle() is done, then this
                // was just changed and its newer/up to date then the one from the server.
            }
            else {
                self._data[i] = newVal;
                self.trackDataChange(
                    self._data,
                    self._keys[i],
                    newVal
                );
                if (requiresCommit) {
                    self._updatedMask[i] = 1;
                }
            }
        }
    }

    // resize if needed.
    if (self._keys.length > targetLength) {
        self._data.fill(false, self._keys.length, targetLength - self._keys.length);
    }
};

/**
 * Convert to a base64urlencoded string
 *
 * @returns {String}
 */
MegaDataBitMap.prototype.toString = function() {
    return base64urlencode(
        String.fromCharCode.apply(null, this._data)
    );
};

/**
 * Convert the mask to a base64urlencoded string
 *
 * @returns {String}
 */
MegaDataBitMap.prototype.maskToString = function() {
    return base64urlencode(
        String.fromCharCode.apply(null, this._updatedMask)
    );
};

/**
 * Convert to a 0 and 1 string (separated by ",")
 *
 * @returns {String}
 */
MegaDataBitMap.prototype.toDebugString = function() {
    return this._data.toString();
};

/**
 * Set the current version of the attribute (received and controlled by the API)
 *
 * @param ver
 * @returns {String}
 */
MegaDataBitMap.prototype.setVersion = function(ver) {
    /*jshint -W093 */
    return this._version = ver;
    /*jshint +W093 */
};

/**
 * Get the current version of the attribute (received and controlled by the API)
 *
 * @returns {String|undefined}
 */
MegaDataBitMap.prototype.getVersion = function() {
    return this._version;
};

/**
 * Was this attribute marked as public?
 *
 * @returns {Boolean}
 */
MegaDataBitMap.prototype.isPublic = function() {
    return this._isPub;
};

/**
 * Commits all changes which were marked as changed.
 * All changed keys/bits would be overwritten on the server
 * All non-changed keys/bits, may be altered in case another commit (by another client) had changed them. In that case,
 * a change event would be triggered.
 *
 * @returns {MegaPromise}
 */
MegaDataBitMap.prototype.commit = SoonFc(function() {
    var self = this;
    if (this._commitPromise) {
        // commit is already in progress, create a proxy promise that would execute after the current commit op and
        // return it
        var tmpPromise = new MegaPromise();
        this._commitPromise.always(function() {
            tmpPromise.linkDoneAndFailTo(self.commit());
        });
        return tmpPromise;
    }

    this._commitPromise = new MegaPromise();

    this._commitPromise.always(function() {
        delete self._commitPromise;
    });

    // check if we really need to commit anything (e.g. mask is not full of zeroes)
    var foundOnes = false;
    for (var i = 0; i < this._updatedMask.length; i++) {
        if (this._updatedMask[i] === 1) {
            foundOnes = true;
            break;
        }
    }

    // no need to commit anything.
    if (foundOnes === false) {
        var commitPromise = this._commitPromise;
        this._commitPromise.resolve(false);
        return commitPromise;
    }
    var attributeFullName = (this.isPublic() ? "+!" : "^!") + this.name;

    var cacheKey = u_handle + "_" + attributeFullName;
    attribCache.setItem(cacheKey, JSON.stringify([self.toString(), 0]));

    api_req(
        {
            "a": "usma",
            "n": attributeFullName,
            "ua": this.toString(),
            "m": this.maskToString()
        },
        {
            callback: function megaDataBitMapCommitCalback(response) {
                if (typeof(response) === 'number') {
                    self._commitPromise.reject(response);
                }
                else {
                    if (response.ua && response.ua !== self.toString()) {
                        self.mergeFrom(response.ua);
                        attribCache.setItem(cacheKey, JSON.stringify([self.toString(), 0]));
                    }
                    if (response.v) {
                        self.setVersion(response.v);
                    }
                    self.commited();
                    self._commitPromise.resolve(response);
                }
            }
        }
    );
    return this._commitPromise;
}, 100);

/**
 * Initialise a new MegaDataBitMap from string
 * Only used for testing some stuff.
 *
 * @param {String} name
 * @param {Boolean} isPub
 * @param {Array} keys
 * @param {String} base64str
 * @param {*} [parent]
 * @returns {MegaDataBitMap}
 */
MegaDataBitMap.fromString = function(name, isPub, keys, base64str, parent) {
    var str = base64urldecode(base64str);
    var targetLength = str.length;
    if (keys.length > str.length) {
        targetLength = keys.length;
    }
    var buf = new ArrayBuffer(targetLength); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    var mdbm = new MegaDataBitMap(name, isPub, keys, parent);
    mdbm._data = new Uint8Array(buf, 0, buf.byteLength);
    if (keys.length > buf.length) {
        mdbm._data.fill(false, keys.length, buf.length - keys.length);
    }
    return mdbm;
};


/**
 * Mark all bits/keys as 0s (would not commit the changes).
 */
MegaDataBitMap.prototype.reset = function() {
    var self = this;
    self.keys().forEach(function(k) {
        self.set(k, 0);
    });
};

/**
 * Experiments, tests and examples
 *
 * @returns {MegaDataBitMap}
 */
testMegaDataBitMap = function() {
    var keys = [
        'key1',
        'key2',
        'key3',
    ];
    var arr1 = new MegaDataBitMap("arr1", false, keys);

    arr1.toggle('key2');

    arr1.commited();

    var arr2 = MegaDataBitMap.fromString("arr2", false, keys, arr1.toString());
    assert(arr2.toString() === arr1.toString());

    console.error(arr2._updatedMask.toString());
    arr2.toggle('key1');
    console.error(arr2._updatedMask.toString());
    arr1.mergeFrom(arr2.toString());
    return arr1;
};
