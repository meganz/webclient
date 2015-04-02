/**
 * MEGA Data Structures
 * Modern/unified way of handling/monitoring/syncing data changes required for the Webclient to work in a more:
 * 1. easy to use by us (developers)
 * 2. reactive/optimised way
 */

var TRACK_CHANGES_THROTTLING_MS = 150;
var MAX_INDEX_NUMBER = 65000;

var _arrayAliases = [
    'concat',
    'copyWithin',
    'entries',
    'every',
    'fill',
    'filter',
    'find',
    'findIndex',
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

var _createObjectDataMethods = function(kls) {
    var obj = kls.prototype ? kls.prototype : kls;

    obj.forEach = function(cb) {
        var self = this;
        Object.keys(self._data).forEach(function(k) {
            cb(self._data[k], k);
        });
    };

    obj.map = function(cb) {
        var self = this;
        var res = [];
        Object.keys(self._data).forEach(function(k) {
            var intermediateResult = cb(self._data[k], k);
            if(intermediateResult !== null && intermediateResult !== undefined) {
                res.push(intermediateResult);
            }
        });
        return res;
    };

    obj.keys = function() {
        return Object.keys(this._data)
    };

    obj.size = function() {
        return Object.keys(this._data).length
    };

    obj.hasOwnProperty = function() {
        return this._data.hasOwnProperty.call(this._data, arguments);
    };

    obj.propertyIsEnumerable = function() {
        return this._data.propertyIsEnumerable.call(this._data, arguments);
    };

    obj.destroyStructure = function() {
        this.trackDataChange();
        for(var k in this.keys()) {
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
    if(Number.isNaN(a) && Number.isNaN(b)) {
        return true;
    } else {
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
    if(obj.prototype) { // if called on a class...
        obj = obj.prototype;
    }

    implementChangeListener = implementChangeListener || false;

    obj._dataChangeIndex = 0;
    obj._dataChangeTrackedId = _trackedId++;




    obj.trackDataChange = function() {
        var self = this;

        if(self._dataChangeThrottlingTimer) {
            clearTimeout(self._dataChangeThrottlingTimer);
        }


        self._dataChangeThrottlingTimer = setTimeout(function() {
            delete self._dataChangeThrottlingTimer;
            if(self._dataChangeIndex > MAX_INDEX_NUMBER) {
                self._dataChangeIndex = 0;
            } else {
                self._dataChangeIndex++;
            }

            if(implementChangeListener === true) {
                if(window.RENDER_DEBUG) {
                    console.error("changed: ", self);
                }
                mBroadcaster.sendMessage(self._getDataChangeEventName(), [self].concat(arguments.length > 0 ? arguments : []));
            }
        }, TRACK_CHANGES_THROTTLING_MS);


        if(self._parent && self._parent.trackDataChange) {
            self._parent.trackDataChange(); // trigger bubble-like effect, in the order of: child -> parent
        }
    };


    obj._getDataChangeEventName = function() {
        return 'change_' + this._dataChangeTrackedId;
    };

    if(implementChangeListener === true) {
        obj.addChangeListener = function(cb) {
            cb._changeListenerId = mBroadcaster.addListener(this._getDataChangeEventName(), cb.bind(obj));
            return cb._changeListenerId;
        };
        obj.removeChangeListener = function(cb) {
            assert(typeof(cb._changeListenerId) != 'undefined', 'this method/cb was not used as a change listener');

            mBroadcaster.removeListener(cb._changeListenerId);
        };
    }
};

var trackPropertyChanges = function(obj, properties, implementChangeListener) {
    if(obj.prototype) { // if called on a class...
        obj = obj.prototype;
    }

    manualTrackChangesOnStructure(obj, implementChangeListener);

    if(!obj._data) {
        obj._data = {};
    }


    Object.keys(properties).forEach(function(k) {
        var v = properties[k];

        Object.defineProperty(obj, k, {
            get: function () {
                return this.get(k, v);
            },
            set: function (value) {
                this.set(k, value);
            },
            enumerable: true
        });
    });

    obj.set = function(k, v) {
        if(!_properJSCmp(this._data[k], v)) {
            this.trackDataChange();
        }
        this._data[k] = v;
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
            if(methodName == "push") {
                if(
                    arguments.length > 0 &&
                    (arguments[0]._dataChangeIndex) &&
                    !arguments[0]._parent
                ) {
                    arguments[0]._parent = this;
                }
            }
            ret = this._data[methodName].apply(this._data, arguments);
            if(_arrayMethodsThatAltersData.indexOf(methodName) >= 0) {
                this.trackDataChange([this._data, ret]);
            }
            return ret;
        } catch(e) {
            throw e;
        }
    }
});

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


MegaDataMap.prototype.set = function(k, v) {

    if(!k) { debugger; }

    assert(!!k, "missing key");

    var self = this;

    if(typeof(v._dataChangeIndex) != 'undefined' &&  !v._parent) {
        v._parent = this;
    }

    if(_properJSCmp(self._data[k], v) === true) {
        return;
    }

    self._data[k] = v;

    Object.defineProperty(this, k, {
        get: function () {
            return self._data[k];
        },
        set: function (value) {
            if(value !== self._data[k]) {
                self._data[k] = value;

                self.trackDataChange([self._data, k, v]);
            }
        },
        enumerable: true
    });

    self.trackDataChange([self._data, k, v]);
};

MegaDataMap.prototype.remove = function(k) {

    var self = this;

    var v = self._data[k];

    if(v && v._parent && v._parent == this) {
        v._parent = null;
    }

    if(v) {
        delete self._data[k];
        delete this[k];
    }


    self.trackDataChange([self._data, k, v]);
};

_createObjectDataMethods(MegaDataMap);

MegaDataMap.prototype.toJS = _toJS;