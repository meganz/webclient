var Promise = require('es6-promise').Promise;
var assign = require('object-assign');

var _stores = {};
var _callbacks = [];
var _promises = [];

var MegaDispatcher = function() {};
MegaDispatcher.prototype = assign({}, MegaDispatcher.prototype, {

    /**
     * Register a Store's callback so that it may be invoked by an action.
     * @param {function} callback The callback to be registered.
     * @return {number} The index of the callback within the _callbacks array.
     */
    register: function(k, store) {
        _stores[k] = store;
    },

    /**
     * dispatch
     * @param  {object} payload The data from the action.
     */
    dispatch: function(payload, args) {
        // First create array of promises for callbacks to reference.
        var resolves = [];
        var rejects = [];
        var result = [];
        _promises = Object.keys(_stores).map(function(name) {
            var store = _stores[store];
            return new Promise(function(resolve, reject) {
                resolves[name] = resolve;
                rejects[name] = reject;
            });
        });
        // Dispatch to callbacks and resolve/reject promises.
        Object.keys(_stores).forEach(function(name) {
            var store = _stores[name];
            console.error("ha: ", name, payload);

            if(!payload.action) {
                debugger;
            }
            if(name == payload.action.split(":")[0]) {
                result.push(
                    Promise.resolve(store.dispatch(payload, args)).then(function () {
                        resolves[name](payload);
                    }, function () {
                        rejects[name](new Error('Dispatcher callback unsuccessful'));
                    })
                );
            }
        });
        _promises = [];
        return result;
    }
});

module.exports = MegaDispatcher;