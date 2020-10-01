/**
 * MEGA Data Structures
 * Modern/unified way of handling/monitoring/syncing data changes required for the Webclient to work in a more:
 * 1. easy to use by us (developers)
 * 2. reactive/optimised way
 */

(function _dataStruct(global) {
'use strict';

var dsIncID = 0;

var VALUE_DESCRIPTOR = {configurable: true, value: null};
function _defineValue(target, prop, value) {
    VALUE_DESCRIPTOR.value = value;
    Object.defineProperty(target, prop, VALUE_DESCRIPTOR);
    VALUE_DESCRIPTOR.value = null;
}

var VNE_DESCRIPTOR = {configurable: true, writable: true, value: null};
function _defineNonEnum(target, prop, value) {
    VNE_DESCRIPTOR.value = value;
    Object.defineProperty(target, prop, VNE_DESCRIPTOR);
    VNE_DESCRIPTOR.value = null;
}

function _cmp(a, b) {
    return a === b || a === null && b === undefined || b === null && a === undefined;
}

function _timing(proto, min, max) {
    min = min || 10;
    max = max || 70;
    var wrap = function(f, m) {
        return function() {
            var t = performance.now();
            var r = m.apply(this, arguments);
            if ((t = performance.now() - t) > min) {
                var fn = t > max ? 'error' : 'warn';
                console[fn]('[timing] %s.%s: %fms', this, f, t, [this], toArray.apply(null, arguments));
            }
            return r;
        };
    };
    proto = proto.prototype || proto;
    var keys = Object.keys(proto);

    console.warn('timing %s...', Object(proto.constructor).name || '', keys);

    for (var i = keys.length; i--;) {
        if (typeof proto[keys[i]] === 'function') {
            proto[keys[i]] = wrap(keys[i], proto[keys[i]]);
        }
    }
}

var _warnOnce = SoonFc(400, function _warnOnce(where) {
    var args = toArray.apply(null, arguments).slice(1);
    var prop = '__warn_once_' + MurmurHash3(args[0], -0x7ff);

    if (!where[prop]) {
        _defineNonEnum(where, prop, 1);
        console.warn.apply(console, args);
    }
});

function returnFalse() {
    return false;
}
function returnTrue() {
    return true;
}

function MegaDataEvent(src, target) {
    if (typeof src === 'object') {
        this.originalEvent = src;

        if (src.defaultPrevented || src.defaultPrevented === undefined
            && src.returnValue === false || src.isDefaultPrevented && src.isDefaultPrevented()) {

            this.isDefaultPrevented = returnTrue;
        }
    }
    else {
        src = {type: src};
    }

    this.type = src.type;
    this.target = src.target || target;
}

inherits(MegaDataEvent, null);

MegaDataEvent.prototype.isDefaultPrevented = returnFalse;
MegaDataEvent.prototype.isPropagationStopped = returnFalse;

MegaDataEvent.prototype.preventDefault = function() {
    this.isDefaultPrevented = returnTrue;
    if (this.originalEvent) {
        this.originalEvent.preventDefault();
    }
};

MegaDataEvent.prototype.stopPropagation = function() {
    this.isPropagationStopped = returnTrue;
    if (this.originalEvent) {
        this.originalEvent.stopPropagation();
    }
};

// Very simple replacement for jQuery.event
function MegaDataEmitter() {
    /* dummy */
}

inherits(MegaDataEmitter, null);

_defineValue(MegaDataEmitter, 'seen', Object.create(null));
_defineValue(MegaDataEmitter, 'expando', '__event_emitter_' + (Math.random() * Math.pow(2, 56) - 1));

/** @function MegaDataEmitter.getEmitter */
_defineValue(MegaDataEmitter, 'getEmitter', function(event, target) {
    var emitter = target[MegaDataEmitter.expando];
    if (!emitter) {
        emitter = Object.create(null);
        _defineValue(target, MegaDataEmitter.expando, emitter);
    }
    var pos;
    var src = event.type && event;
    var types = String(event.type || event).split(/\s+/).filter(String);
    var namespaces = Array(types.length);

    for (var i = types.length; i--;) {
        namespaces[i] = '';
        if ((pos = types[i].indexOf('.')) >= 0) {
            namespaces[i] = types[i].substr(pos + 1).split('.').sort().join('.');
            types[i] = types[i].substr(0, pos);
        }
    }
    return {types: types, namespaces: namespaces, event: src || types[0], events: emitter};
});

/** @function MegaDataEmitter.wrapOne */
_defineValue(MegaDataEmitter, 'wrapOne', function(handler) {
    return function _one(event) {
        this.off(event, _one);
        return handler.apply(this, arguments);
    };
});

MegaDataEmitter.prototype.off = function(event, handler) {
    if (event instanceof MegaDataEvent) {
        event.currentTarget.off(event.type + (event.namespace ? '.' + event.namespace : ''), handler);
        return this;
    }

    var emitter = MegaDataEmitter.getEmitter(event, this);
    for (var j = emitter.types.length; j--;) {
        var type = emitter.types[j];
        var namespace = emitter.namespaces[j];
        var handlers = emitter.events[type] || [];

        for (var i = handlers.length; i--;) {
            var tmp = handlers[i];

            if (type === tmp.type
                && (!handler || handler.pid === tmp.pid)
                && (!namespace || namespace === tmp.namespace)) {

                handlers.splice(i, 1);
            }
        }

        if (!handlers.length) {
            delete emitter.events[type];
        }
    }

    return this;
};

MegaDataEmitter.prototype.one = function(event, handler, data) {
    return this.on(event, handler, data, true);
};

MegaDataEmitter.prototype.on = function(event, handler, data, one) {
    var emitter = MegaDataEmitter.getEmitter(event, this);
    var events = emitter.events;

    handler = one ? MegaDataEmitter.wrapOne(handler) : handler;
    if (!handler.pid) {
        handler.pid = ++dsIncID;
    }

    for (var i = emitter.types.length; i--;) {
        var type = emitter.types[i];
        var namespace = emitter.namespaces[i];

        if (!events[type]) {
            events[type] = [];
        }

        events[type].push({
            type: type,
            data: data,
            pid: handler.pid,
            handler: handler,
            namespace: namespace
        });

        if (d) {
            MegaDataEmitter.seen[type] = 1;
        }
    }
    return this;
};

// eslint-disable-next-line complexity
MegaDataEmitter.prototype.trigger = function(event, data) {
    var emitter = MegaDataEmitter.getEmitter(event, this);

    event = new MegaDataEvent(emitter.event, this);
    event.data = data;

    // @todo require all trigger() calls to provide an array to prevent checking for isArray()
    data = data ? Array.isArray(data) ? data : [data] : [];

    var idx = data.length;
    var tmp = new Array(idx + 1);
    while (idx) {
        tmp[idx--] = data[idx];
    }
    tmp[0] = event;
    data = tmp;

    var res;
    var type = emitter.types[0];
    var namespace = emitter.namespaces[0];
    var handlers = [].concat(emitter.events[type] || []);
    while ((tmp = handlers[idx++]) && !event.isPropagationStopped()) {
        event.currentTarget = this;
        event.namespace = namespace;

        if ((!namespace || namespace === tmp.namespace)
            && (res = tmp.handler.apply(this, data)) !== undefined) {

            event.result = res;
            if (res === false) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    if (!event.isDefaultPrevented()) {
        tmp = this['on' + type];

        if (typeof tmp === 'function') {
            event.result = tmp.apply(this, data);
            if (event.result === false) {
                event.preventDefault();
            }
        }
    }

    if (event.originalEvent && event.result !== undefined) {
        event.originalEvent.returnValue = event.result;
    }

    return event.result;
};

MegaDataEmitter.prototype.rebind = function(event, handler) {
    return this.off(event).on(event, handler);
};
MegaDataEmitter.prototype.bind = MegaDataEmitter.prototype.on;
MegaDataEmitter.prototype.unbind = MegaDataEmitter.prototype.off;

Object.freeze(MegaDataEmitter);

/**
 * Simple map-like implementation that tracks changes
 *
 * @param [parent]
 * @param [defaultData]
 * @constructor
 */
function MegaDataMap(parent, defaultData) {
    // MegaDataEmitter.call(this);

    /** @property MegaDataMap._parent */
    _defineNonEnum(this, '_parent', parent || false);

    /** @property MegaDataMap._dataChangeIndex */
    _defineNonEnum(this, '_dataChangeIndex', 0);
    /** @property MegaDataMap._dataChangeListeners */
    _defineNonEnum(this, '_dataChangeListeners', []);
    /** @property MegaDataMap._dataChangeTrackedId */
    _defineNonEnum(this, '_dataChangeTrackedId', ++dsIncID);

    /** @property MegaDataMap._data */
    _defineNonEnum(this, '_data', defaultData || {});
    Object.setPrototypeOf(this._data, null);

    if (d > 1) {
        if (!MegaDataMap.__instancesOf) {
            MegaDataMap.__instancesOf = new WeakMap();
        }
        MegaDataMap.__instancesOf.set(this, Object.getPrototypeOf(this));
    }
}

inherits(MegaDataMap, MegaDataEmitter);

/** @property MegaDataMap.__ident_0 */
lazy(MegaDataMap.prototype, '__ident_0', function() {
    return this.constructor.name + '.' + ++dsIncID;
});

/** @function MegaDataMap.prototype._schedule */
lazy(MegaDataMap.prototype, '_schedule', function() {
    var task = null;
    var self = this;
    var callTask = function _callTask() {
        if (task) {
            queueMicrotask(task);
            task = null;
        }
    };
    return function _scheduler(callback) {
        if (!task) {
            queueMicrotask(callTask);
        }
        task = function _task() {
            callback.call(self);
        };
    };
});

Object.defineProperty(MegaDataMap.prototype, 'length', {
    get: function() {
        return Object.keys(this._data).length;
    },
    configurable: true
});

_defineValue(MegaDataMap.prototype, 'valueOf', function() {
    return this.__ident_0;
});

MegaDataMap.prototype.trackDataChange = function() {
    var idx = arguments.length;
    var args = new Array(idx);
    while (idx--) {
        args[idx] = arguments[idx];
    }

    var self = this;
    this._schedule(function _trackDataChange() {
        var that = self;

        do {
            args.unshift(that);
            that._dataChangeIndex++;
            that._dispatchChangeListeners(args);

        } while ((that = that._parent) instanceof MegaDataMap);
    });
};

MegaDataMap.prototype.addChangeListener = function(cb) {
    if (d) {
        var h = this._dataChangeListeners;
        if (d > 1 && h.length > 200) {
            _warnOnce(this, '%s: Too many handlers added(%d)! race?', this, h.length, [this]);
        }
        console.assert(h.indexOf(cb) < 0, 'handler exists');

        if (typeof cb === 'function') {
            console.assert(!cb.__mdmChangeListenerID, 'reusing handler');
        }
        else {
            console.assert(typeof cb.handleChangeEvent === 'function', 'invalid instance');
        }
    }

    if (typeof cb === 'function') {
        /** @property Function.__mdmChangeListenerID */
        _defineValue(cb, '__mdmChangeListenerID', dsIncID + 1);
    }

    this._dataChangeListeners.push(cb);
    return ++dsIncID;
};

MegaDataMap.prototype.removeEventHandler = function(handler) {
    var result = false;
    var listeners = this._dataChangeListeners;

    if (d) {
        console.assert(handler && typeof handler.handleChangeEvent === 'function');
    }

    for (var i = listeners.length; i--;) {
        if (listeners[i] === handler) {
            listeners.splice(i, 1);
            ++result;
        }
    }

    return result;
};

MegaDataMap.prototype.removeChangeListener = function(cb) {
    var cId = cb && cb.__mdmChangeListenerID || cb;

    if (d) {
        console.assert(cId > 0, 'invalid listener id');
    }

    if (cId > 0) {
        var listeners = this._dataChangeListeners;

        for (var i = listeners.length; i--;) {
            if (listeners[i].__mdmChangeListenerID === cId) {
                _defineValue(listeners[i], '__mdmChangeListenerID', 'nop');
                listeners.splice(i, 1);

                if (d > 1) {
                    while (--i > 0) {
                        console.assert(listeners[i].__mdmChangeListenerID !== cId);
                    }
                }

                return true;
            }
        }
    }

    return false;
};

MegaDataMap.prototype._dispatchChangeListeners = function(args) {
    var listeners = this._dataChangeListeners;

    if (d > 1) {
        console.debug('%s: dispatching %s awaiting listeners', this, listeners.length, [this]);
    }

    for (var i = listeners.length; i--;) {
        var result;
        var listener = listeners[i];

        if (typeof listener === 'function') {
            result = listener.apply(this, args);
        }
        else if (listener) {
            result = listener.handleChangeEvent.apply(listener, args);
        }

        if (result === 0xDEAD) {
            this.removeChangeListener(listener);
        }
    }
};

// eslint-disable-next-line local-rules/misc-warnings
MegaDataMap.prototype.forEach = function(cb) {
    // this._data is a dict, so no guard-for-in needed
    // eslint-disable-next-line guard-for-in
    for (var k in this._data) {
        if (cb(this._data[k], k) === false) {
            break;
        }
    }
};
MegaDataMap.prototype.every = function(cb) {
    var self = this;
    return self.keys().every(function(k) {
        return cb(self._data[k], k);
    });
};
MegaDataMap.prototype.some = function(cb) {
    var self = this;
    return self.keys().some(function(k) {
        return cb(self._data[k], k);
    });
};

MegaDataMap.prototype.map = function(cb) {
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

MegaDataMap.prototype.keys = function() {
    return Object.keys(this._data);
};

MegaDataMap.prototype.size = function() {
    return this.keys().length;
};

MegaDataMap.prototype.destroy = tryCatch(function() {
    var self = this;
    Object.keys(self).map(function(k) {
        return self._removeDefinedProperty(k);
    });
    Object.freeze(this);
});

MegaDataMap.prototype.setObservable = function(k, defaultValue) {
    Object.defineProperty(this, k, {
        get: function() {
            return this.get(k, defaultValue);
        },
        set: function(value) {
            this.set(k, value, false, defaultValue);
        },
        enumerable: true
    });
};

MegaDataMap.prototype.exists = function(keyValue) {
    return keyValue in this._data;
};

MegaDataMap.prototype.set = function(k, v, ignoreTrackDataChange) {
    if (d) {
        console.assert(k !== undefined && k !== false, "missing key");
    }

    if (v instanceof MegaDataMap && !v._parent) {
        _defineNonEnum(v, '_parent', this);
    }

    if (_cmp(this._data[k], v) === true) {
        return;
    }

    this._data[k] = v;

    if (k in this) {
        this[k] = v;
    }
    else {
        Object.defineProperty(this, k, {
            get: function() {
                return this._data[k];
            },
            set: function(value) {
                if (value !== this._data[k]) {
                    this._data[k] = value;
                    this.trackDataChange(this._data, k, v);
                }
            },
            enumerable: true,
            configurable: true
        });
    }

    if (!ignoreTrackDataChange) {
        this.trackDataChange(this._data, k, v);
    }
};

MegaDataMap.prototype.remove = function(k) {
    var v = this._data[k];

    if (v instanceof MegaDataMap && v._parent === this) {
        _defineNonEnum(v, '_parent', null);
    }

    this._removeDefinedProperty(k);
    this.trackDataChange(this._data, k, v);
};

/** @function MegaDataMap.prototype._removeDefinedProperty */
_defineValue(MegaDataMap.prototype, '_removeDefinedProperty', function(k) {
    if (k in this) {
        Object.defineProperty(this, k, {
            writable: true,
            value: undefined,
            configurable: true
        });
        delete this[k];
    }
    if (k in this._data) {
        delete this._data[k];
    }
});

/** @function MegaDataMap.prototype.toJS */
_defineValue(MegaDataMap.prototype, 'toJS', function() {
    return this._data;
});

_defineValue(MegaDataMap.prototype, 'hasOwnProperty', function(prop) {
    return prop in this._data;
});

_defineValue(MegaDataMap.prototype, 'propertyIsEnumerable', function(prop) {
    return this.hasOwnProperty(prop);
});



/**
 * Plain Object-like container for storing data, with the following features:
 * - track changes ONLY on predefined list of properties
 *
 * @param {Object} [trackProperties] properties to observe for changes
 * @param {Object} [defaultData] default/initial data
 * @constructor
 */
function MegaDataObject(trackProperties, defaultData) {
    MegaDataMap.call(this, null, defaultData);

    if (trackProperties) {
        for (var k in trackProperties) {
            if (Object.hasOwnProperty.call(trackProperties, k)) {
                this.setObservable(k, trackProperties[k]);
            }
        }
    }

    /*
    if (d && typeof Proxy === 'function') {
        var slave = Object.create(Object.getPrototypeOf(this));
        Object.setPrototypeOf(this, new Proxy(slave, {
            defineProperty: function(target, property, descriptor) {
                if (String(property).startsWith('jQuery')) {
                    debugger
                    console.assert(false);
                }
                Object.defineProperty(target, property, descriptor);
                return true;
            }
        }));
    }*/
}

inherits(MegaDataObject, MegaDataMap);

MegaDataObject.prototype.set = function(k, v, ignoreDataChange, defaultVal) {
    var notSet = !(k in this._data);

    if (notSet || _cmp(this._data[k], v) !== true) {
        if (notSet && _cmp(defaultVal, v) === true) {
            // this._data[...] is empty and defaultVal == newVal, DON'T track updates.
            return false;
        }

        if (!ignoreDataChange) {
            this.trackDataChange(this._data, k, v);
        }
        this._data[k] = v;
    }
};

MegaDataObject.prototype.get = function(k, defaultVal) {
    return this._data && k in this._data ? this._data[k] : defaultVal;
};


/**
 * MegaDataSortedMap
 * @param keyField
 * @param sortField
 * @param parent
 * @constructor
 */
function MegaDataSortedMap(keyField, sortField, parent) {
    MegaDataMap.call(this, parent);

    /** @property MegaDataSortedMap._parent */
    _defineNonEnum(this, '_parent', parent || false);
    /** @property MegaDataSortedMap._sortedVals */
    _defineNonEnum(this, '_sortedVals', []);
    /** @property MegaDataSortedMap._keyField */
    _defineNonEnum(this, '_keyField', keyField);
    /** @property MegaDataSortedMap._sortField */
    _defineNonEnum(this, '_sortField', sortField);
}

inherits(MegaDataSortedMap, MegaDataMap);

Object.defineProperty(MegaDataSortedMap.prototype, 'length', {
    get: function() {
        return this._sortedVals.length;
    },
    configurable: true
});

// eslint-disable-next-line local-rules/misc-warnings
MegaDataSortedMap.prototype.forEach = function(cb) {
    for (var i = 0; i < this._sortedVals.length; ++i) {
        var k = this._sortedVals[i];
        cb(this._data[k], k);
    }
};

MegaDataSortedMap.prototype.replace = function(k, newValue) {
    if (this._data[k] === newValue) {
        // already the same, save some CPU and do nothing.
        return true;
    }

    if (k in this._data) {
        // cleanup
        if (newValue[this._keyField] !== k) {
            this.removeByKey(k);
        }
        this.push(newValue);
        return true;
    }

    return false;
};

/** @property MegaDataSortedMap._comparator */
lazy(MegaDataSortedMap.prototype, '_comparator', function() {
    var self = this;

    if (this._sortField === undefined) {
        return indexedDB.cmp.bind(indexedDB);
    }

    if (typeof self._sortField === "function") {
        return function(a, b) {
            return self._sortField(self._data[a], self._data[b]);
        };
    }

    return function(a, b) {
        var sortFields = self._sortField.split(",");

        for (var i = 0; i < sortFields.length; i++) {
            var sortField = sortFields[i];
            var ascOrDesc = 1;
            if (sortField[0] === '-') {
                ascOrDesc = -1;
                sortField = sortField.substr(1);
            }

            var _a = self._data[a][sortField];
            var _b = self._data[b][sortField];

            if (_a !== undefined && _b !== undefined) {
                if (_a < _b) {
                    return -1 * ascOrDesc;
                }
                if (_a > _b) {
                    return ascOrDesc;
                }
                return 0;
            }
        }
        return 0;
    };
});

MegaDataSortedMap.prototype.push = function(v) {
    var self = this;

    var keyVal = v[self._keyField];

    if (keyVal in self._data) {
        self.removeByKey(keyVal);
    }

    self.set(keyVal, v, true);

    var minIndex = 0;
    var maxIndex = this._sortedVals.length - 1;
    var currentIndex;
    var currentElement;
    var cmp = self._comparator;

    var result = false;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this._sortedVals[currentIndex];

        var cmpResult = cmp(currentElement, keyVal);
        if (cmpResult === -1) {
            minIndex = currentIndex + 1;
        }
        else if (cmpResult === 1) {
            maxIndex = currentIndex - 1;
        }
        else {
            result = true;
            break;
        }
    }

    if (!result) {
        if (currentElement === undefined) {
            // first
            self._sortedVals.push(keyVal);
        }
        else {
            self._sortedVals.splice(cmp(currentElement, keyVal) === -1 ? currentIndex + 1 : currentIndex, 0, keyVal);
        }

        self.trackDataChange();
    }
    else {
        // found another item in the list, with the same order value, insert after
        self._sortedVals.splice(currentIndex, 0, keyVal);
    }
    return self._sortedVals.length;
};

MegaDataSortedMap.prototype.removeByKey = MegaDataSortedMap.prototype.remove = function(keyValue) {
    if (keyValue in this._data) {
        array.remove(this._sortedVals, keyValue);
        this._removeDefinedProperty(keyValue);
        this.trackDataChange();
        return true;
    }
    return false;
};

MegaDataSortedMap.prototype.exists = function(keyValue) {
    return keyValue in this._data;
};

MegaDataSortedMap.prototype.keys = function() {
    return this._sortedVals;
};

MegaDataSortedMap.prototype.values = function() {
    var res = [];
    // eslint-disable-next-line local-rules/misc-warnings
    this.forEach(function(v) {
        res.push(v);
    });

    return res;
};

MegaDataSortedMap.prototype.getItem = function(num) {
    return this._data[this._sortedVals[num]];
};

MegaDataSortedMap.prototype.indexOfKey = function(value) {
    return this._sortedVals.indexOf(value);
};

MegaDataSortedMap.prototype.clear = function() {
    _defineNonEnum(this, '_sortedVals', []);
    _defineNonEnum(this, '_data', Object.create(null));
    if (this.trackDataChange) {
        this.trackDataChange();
    }
};

/**
 * Simplified version of `Array.prototype.splice`, only supports 2 args (no adding/replacement of items) for now.
 *
 * @param {Number} start first index to start from
 * @param {Number} deleteCount number of items to delete
 * @returns {Array} array of deleted item ids
 */
MegaDataSortedMap.prototype.splice = function(start, deleteCount) {
    var deletedItemIds = this._sortedVals.splice(start, deleteCount);

    for (var i = deletedItemIds.length; i--;) {
        this._removeDefinedProperty(deletedItemIds[i]);
    }

    this.trackDataChange();

    return deletedItemIds;
};

/**
 * Returns a regular array (not a sorted map!) of values sliced as with `Array.prototype.slice`
 *
 * @param {Number} begin first index to start from
 * @param {Number} end last index where to end the "slice"
 * @returns {Array} array of removed IDs
 */
MegaDataSortedMap.prototype.slice = function(begin, end) {
    var results = this._sortedVals.slice(begin, end);
    for (var i = results.length; i--;) {
        results[i] = this._data[results[i]];
    }
    return results;
};

var testMegaDataSortedMap = function() {
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
function MegaDataBitMapManager() {
    this._bitmaps = Object.create(null);
}

inherits(MegaDataBitMapManager, null);

/**
 * Register a MegaDataBitMap
 * @param {String} name
 * @param {MegaDataBitMap} megaDataBitMap
 */
MegaDataBitMapManager.prototype.register = function(name, megaDataBitMap) {
    if (this._bitmaps[name] !== undefined) {
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
 * @constructor
 */
function MegaDataBitMap(name, isPub, keys) {
    var self = this;
    MegaDataObject.call(self, array.to.object(keys, 0));

    self.name = name;
    self._keys = keys;
    self._isPub = isPub;
    self._data = new Uint8Array(keys.length);
    self._updatedMask = new Uint8Array(keys.length);
    self._version = null;
    self._readyPromise = new MegaPromise();

    attribCache.bitMapsManager.register(name, self);

    mega.attr.get(u_handle, name, self.isPublic() ? true : -2, true)
        .then(function(r) {
            if (typeof r !== 'string') {
                throw r;
            }
            self.mergeFrom(r, false);
        })
        .catch(function(ex) {
            if (ex !== -9) {
                // -9 is ok, means the attribute does not exists on the server
                console.error("mega.attr.get failed:", ex);
            }
        })
        .always(SoonFc(function() {
            self._readyPromise.resolve();
        }));
}

inherits(MegaDataBitMap, MegaDataObject);

Object.defineProperty(MegaDataBitMap.prototype, 'length', {
    get: function() {
        return this._data.length;
    },
    enumerable: false,
    configurable: true
});

/**
 * Returns a list of keys that are currently registered with this MegaDataBitMap instance.
 *
 * @returns {Array}
 */
MegaDataBitMap.prototype.keys = function() {
    return this._keys;
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
                _cmp(defaultVal, v) === true
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
 * Merge the current MegaDataBitMap value with a {String} `str`.
 * Merging is done the following way:
 * - IF a value of a key, passed by `str` differs from the one in the current instance:
 *  a) if was marked as 'dirty' (not commited, via the update mask) it would not be merged (its assumed that any data,
 *  stored in 'dirty' state and not commited is the most up to date one)
 *  b) the local value for that key would be updated, following a change event
 *
 * @param {String} str String, containing 0 and 1 chars to be parsed as Uint8Array with 0 and 1s
 * @param {Boolean} requiresCommit Pass true, to mark all changes in the update mask (e.g. they would be schedulled for
 * sending to the server on the next .commit() call)
 */
MegaDataBitMap.prototype.mergeFrom = function(str, requiresCommit) {
    var self = this;

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
_defineValue(MegaDataBitMap.prototype, 'toString', function() {
    return base64urlencode(String.fromCharCode.apply(null, this._data));
});

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
    return this._version = ver;
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
MegaDataBitMap.prototype.commit = function() {
    var self = this;
    var masterPromise = new MegaPromise();
    if (self._commitTimer) {
        clearTimeout(self._commitTimer);
    }
    self._commitTimer = setTimeout(function() {
        if (self._commitPromise) {
            // commit is already in progress, create a proxy promise that would execute after the current commit op and
            // return it
            self._commitPromise.always(function () {
                masterPromise.linkDoneAndFailTo(self.commit());
            });
            return;
        }

        self._commitPromise = new MegaPromise();
        masterPromise.linkDoneAndFailTo(self._commitPromise);

        self._commitPromise.always(function () {
            delete self._commitPromise;
        });

        // check if we really need to commit anything (e.g. mask is not full of zeroes)
        var foundOnes = false;
        for (var i = 0; i < self._updatedMask.length; i++) {
            if (self._updatedMask[i] === 1) {
                foundOnes = true;
                break;
            }
        }

        // no need to commit anything.
        if (foundOnes === false) {
            var commitPromise = self._commitPromise;
            self._commitPromise.resolve(false);
            return;
        }
        var attributeFullName = (self.isPublic() ? "+!" : "^!") + self.name;

        var cacheKey = u_handle + "_" + attributeFullName;
        attribCache.setItem(cacheKey, JSON.stringify([self.toString(), 0]));

        api_req(
            {
                "a": "usma",
                "n": attributeFullName,
                "ua": self.toString(),
                "m": self.maskToString()
            },
            {
                callback: function megaDataBitMapCommitCalback(response) {
                    if (typeof(response) === 'number') {
                        self._commitPromise.reject(response);
                    }
                    else {
                        if (response.ua && response.ua !== self.toString()) {
                            self.mergeFrom(base64urldecode(response.ua));
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
    }, 100);

    return masterPromise;
};

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
var testMegaDataBitMap = function() {
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

/**
 * Bitmap based on an integer.
 * @param attribute {String}
 *     Name of the attribute.
 * @param map An array of keys to use for identifying each bit.
 * @param pub {Boolean|Number}
 *     True for public attributes (default: true).
 *     -1 for "system" attributes (e.g. without prefix)
 *     -2 for "private non encrypted attributes"
 *     False for private encrypted attributes
 * @param nonHistoric {Boolean}
 *     True for non-historic attributes (default: false).  Non-historic attributes will overwrite the value, and
 *     not retain previous values on the API server.
 * @param autoSaveTimeout {int} Autosave after x millisecond.
 * @constructor
 */
function MegaIntBitMap(attribute, map, pub, nonHistoric, autoSaveTimeout) {
    this.value = undefined;
    this.attribute = attribute;
    this.map = map;
    this.pub = pub;
    this.nonHistoric = nonHistoric;
    this.isReadyPromise = null;
    this.autoSaveTimeout = autoSaveTimeout;
    this.autoSaveTimer = null;
}

/**
 * Get a bit based on its key.
 * @param key The bit key.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.get = function(key) {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        self.isReady().then(function() {
            var mask;
            if (Array.isArray(key)) {
                var bitKey;
                var result = {};
                for (var i = 0; i < key.length; i++) {
                    bitKey = key[i];
                    mask = self.getMask(bitKey);
                    if (!mask) {
                        reject("Invalid Key");
                        return false;
                    }
                    result[bitKey] = self.value & mask ? true : false;
                }
                resolve(result);
            } else {
                mask = self.getMask(key);
                if (!mask) {
                    reject("Invalid Key");
                    return false;
                }
                resolve(self.value & mask ? true : false);
            }

        }, reject);
    });
};

/**
 * Set a bit/bits based on a key/keys.
 * @param key object|string The bit key or map of bit keys -> newState
 * @param newValue {bool|void} The new state if previous parameter is a bit key.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.set = function(key, newValue) {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        self.isReady().then(function() {
            var mask;
            // jscs:disable disallowImplicitTypeConversion
            if (typeof key === 'object') {
                var bitKey;
                var updatedValue = self.value;
                var keys = Object.keys(key);
                for (var i = 0; i < keys.length; i++) {
                    bitKey = keys[i];
                    mask = self.getMask(bitKey);
                    if (!mask) {
                        reject("Invalid Key");
                        return false;
                    }
                    updatedValue = key[bitKey] ? (updatedValue | mask) : (updatedValue & (~mask));
                }
                self.value = updatedValue;
            } else {
                mask = self.getMask(key);
                if (!mask) {
                    reject("Invalid Key");
                    return false;
                }
                self.value = newValue ? (self.value | mask) : (self.value & (~mask));
            }
            // jscs:enable disallowImplicitTypeConversion
            self.valueChanged();
            resolve(self.value);
        }, reject);
    });
};

/**
 * Get all bits.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.getAll = function() {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        self.isReady().then(function() {
            var all = {};
            for (var i = 0; i < self.map.length; i++) {
                all[self.map[i]] = self.value & (1 << i) ? true : false;
            }
            resolve(all);
        }, reject);
    });
};

/**
 * Set all bits that we know about.
 * @param newValue The new state for all known bits.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.setAll = function(newValue) {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        self.isReady().then(function() {
            // jscs:disable disallowImplicitTypeConversion
            var mask = ~(0xFFFFFF << self.map.length);
            self.value = newValue ? self.value | mask : self.value & (~mask);
            // jscs:enable disallowImplicitTypeConversion
            self.valueChanged();
            resolve(self.value);
        }, reject);
    });
};

/**
 * Get a mask from a key.
 * @param key The bit key.
 */
MegaIntBitMap.prototype.getMask = function(key) {
    var idx = this.map.indexOf(key);
    if (idx >= 0) {
        return 1 << idx;
    }
    return false;
};

/**
 * Load attribute.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.load = function() {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        mega.attr.get(u_attr.u, self.attribute, self.pub, self.nonHistoric).then(function(value) {
            self.value = parseInt(value);
            resolve();
        }, function(value) {
            if (value === ENOENT) {
                self.value = 0;
                resolve();
            } else {
                reject.apply(null, arguments);
            }
        });
    });
};

/**
 * Save Attribute.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.save = function() {
    return mega.attr.set(
        this.attribute,
        this.value,
        this.pub,
        this.nonHistoric
    );
};

/**
 * Wait till ready.
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.isReady = function() {
    if (this.isReadyPromise === null) {
        var self = this;
        this.isReadyPromise = new MegaPromise(function(resolve, reject) {
            self.load().then(resolve, reject);
        });
    }
    return this.isReadyPromise;
};

/**
 * Directly set all the bits by providing an int.
 * @param newValue {int} The new value
 * @returns {MegaPromise}
 */
MegaIntBitMap.prototype.setValue = function(newValue) {
    var self = this;
    return new MegaPromise(function(resolve, reject) {
        self.isReady().then(function() {
            self.value = newValue;
            self.valueChanged();
            resolve(self.value);
        }, reject);
    });
};

/**
 * Track value changed.
 * Note: Call this whenever the value is changed.
 */
MegaIntBitMap.prototype.valueChanged = function() {
    if (this.autoSaveTimeout) {
        var self = this;
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(function() {
            clearTimeout(self.autoSaveTimer);
            self.save();
        }, self.autoSaveTimeout);
    }
};

/**
 * Triggered when the attribute is updated, thus updating our internal value.
 * @return {MegaPromise}
 */
MegaIntBitMap.prototype.handleAttributeUpdate = function() {
    this.isReadyPromise = null;
    return this.isReady();
};

// ----------------------------------------------------------------------------------------

Object.defineProperty(global, 'MegaDataMap', {value: MegaDataMap});
Object.defineProperty(global, 'MegaDataObject', {value: MegaDataObject});
Object.defineProperty(global, 'MegaDataSortedMap', {value: MegaDataSortedMap});

/** @constructor MegaDataEvent */
Object.defineProperty(global, 'MegaDataEvent', {value: MegaDataEvent});
/** @constructor MegaDataEmitter */
Object.defineProperty(global, 'MegaDataEmitter', {value: MegaDataEmitter});

Object.defineProperty(global, 'MegaIntBitMap', {value: MegaIntBitMap});
Object.defineProperty(global, 'MegaDataBitMap', {value: MegaDataBitMap});
Object.defineProperty(global, 'MegaDataBitMapManager', {value: MegaDataBitMapManager});

if (d) {
    if (d > 1) {
        _timing(MegaDataMap);
        _timing(MegaDataObject);
        _timing(MegaDataEmitter);
        _timing(MegaDataSortedMap);
    }
    global._timing = _timing;
    global.testMegaDataBitMap = testMegaDataBitMap;
    global.testMegaDataSortedMap = testMegaDataSortedMap;
}

})(self);
