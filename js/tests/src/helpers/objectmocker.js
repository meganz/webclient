/**
 * Quick and dirty helper class, for mocking any JavaScript object instance.
 * How to use:
 * 1. Just pass the object instance as first argument and store and store the ObjectMocker instance somewhere
 * 2. When done testing (e.g. in afterEach()), call the ObjectMocker.restore() to remove any stubs which were created
 *
 *
 * Note: requires sinon.js
 *
 * @param objectInstance
 * @param methods
 * @constructor
 */
var ObjectMocker = function(objectInstance, methods) {
    var self = this;


    self.calls = {};

    self.objectInstance = objectInstance;
    self.methods = methods || {};


    self._recurseObject(objectInstance, self.methods, function(obj, k, v) {
        var objType = typeof(obj[k]) != "undefined" ? typeof(obj[k]) : typeof(v);

        if(objType != "function") {
            var oldVal = obj[k];
            obj[k] = v;
            obj[k].oldVal = oldVal;
        } else {
            if(!obj[k]) {
                obj[k] = function() {};
            }
            if(obj[k] && obj[k].name == "proxy") {
                return;
            } else {
                sinon.stub(obj, k, v);
            }
        }
    });


    return this;
};

/**
 * Helper function to do a recursion on a passed list of functions to be mocked (`_map`) on `_objectInstance`
 *
 * @param _objectInstance {Object}
 * @param _map {Object} A hashmap containing keys - function names which should me mocked and values which should be
 * functions that will replace the original ones
 * @param [fn] {Function} Function which should replace the original
 * @private
 */
ObjectMocker.prototype._recurseObject = function(_objectInstance, _map, fn) {
    var self = this;

    $.each(_map, function(k, v) {
        if(!$.isArray(v) && !$.isPlainObject(v)) {
            if(!_objectInstance) {
                _objectInstance = undefined;
            }
            if(!_objectInstance[k]) {
                _objectInstance[k] = undefined;
            }

            fn(_objectInstance, k, $.isFunction(v) ? self.logFunctionCallWrapper(k, v) : v);
        } else {
            if(!_objectInstance) {
                _objectInstance = {};
            }
            if(!_objectInstance[k]) {
                _objectInstance[k] = {};
            }

            self._recurseObject(_objectInstance[k], v, fn);
        }
    });
};
/**
 * Restore the mocked functions
 */
ObjectMocker.prototype.restore = function() {
    var self = this;

    self._recurseObject(self.objectInstance, self.methods, function(obj, k, v) {
        if(typeof(obj[k]) == "function") {
            if(typeof(obj[k].restore) == "function") {
                obj[k].restore();
            } else {
                console.error("Could not find .restore on", obj[k]);
            }
        } else {
            if(obj[k] && obj[k].oldVal) {
                obj[k] = obj[k].oldVal;
            }
        }
    });
};

/**
 * Simple internal logger that will collect all function calls in `self.calls`.
 *
 * @param name
 * @param fn
 * @returns {Function}
 */
ObjectMocker.prototype.logFunctionCallWrapper = function(name, fn) {
    var self = this;
    if(typeof(self.calls[name]) == 'undefined') {
        self.calls[name] = [];
    }
    return function() {
        self.calls[name].push(
            toArray(arguments)
        );
        if(fn) {
            return fn.apply(this, toArray(arguments));
        }
    }
};



/**
 * mock every fn in megaChatObj (recursively)
 *
 * @param obj
 * @returns {{}} returns mock obj that can be used as `methods` arg of {{ObjectMocker}}
 */

ObjectMocker.generateMockArrayFor = function(obj) {
    var reg = []; // private scope

    var _recurs = function(obj) {
        var mockedFns = {};

        $.each(obj, function(k, v) {
            // recursion protection
            if(reg.indexOf(obj[k]) > -1) {
                return; // continue;
            }
            reg.push(obj[k]);

            if($.isFunction(obj[k])) {
                mockedFns[k] = obj[k];
            } else if($.isPlainObject(obj[k]) || (obj[k] instanceof Object && !$.isArray(obj[k]))) {
                mockedFns[k] = _recurs(obj[k]);
            }
        });
        return mockedFns;
    };

    return _recurs(obj);
};
