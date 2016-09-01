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
    var self = this;
    var props = Object.keys(self._data);
    var actualJSObj = {};
    props.forEach(function(k) {
        actualJSObj[k] = self._data[k];
    });
    return actualJSObj;
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
                mBroadcaster.sendMessage(self._getDataChangeEventName(), [self].concat(arguments.length > 0 ? arguments : []));
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

    obj.set = function(k, v, ignoreDataChange, defaultVal) {
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

    obj.get = function(k, defaultVal) {
        return this._data && typeof(this._data[k]) !== 'undefined' ? this._data[k] : defaultVal;
    };
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
                this.trackDataChange([this._data, ret]);
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

                    self.trackDataChange([self._data, k, v]);
                }
            },
            enumerable: true
        });
    }

    if (!ignoreTrackDataChange) {
        self.trackDataChange([self._data, k, v]);
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


    self.trackDataChange([self._data, k, v]);
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

        self.trackDataChange([self._data]);
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


