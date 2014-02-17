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
 * @constructor
 */
var ObjectMocker = function(objectInstance, methods) {
    var self = this;


    self.calls = {};

    self.objectInstance = objectInstance;
    self.methods = methods || {};


    self._recurseObject(objectInstance, self.methods, function(obj, k, v) {
        sinon.stub(obj, k, v);
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
            fn(_objectInstance, k, $.isFunction(v) ? self.logFunctionCallWrapper(k, v) : v);
        } else {
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
        obj[k].restore();
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