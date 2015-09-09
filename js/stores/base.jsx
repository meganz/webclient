var MegaAppDispatcher = require('../megaappdispatcher.jsx');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var utils = require('../utils.jsx');

var CHANGE_EVENT = 'change';


var BaseStore = {};
BaseStore.ACTIONS = utils.prefixedKeyMirror('Base', {
    CREATE: null,
    UPDATE: null,
    REMOVE: null
});

BaseStore = assign(BaseStore, EventEmitter.prototype, {
    emitChange: function() {
        console.error("EMIT CHANGE", this);
        this.emit(CHANGE_EVENT);
    },

    get: function(k) {
        return this.getAll()[k];
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(CHANGE_EVENT, callback);
    },

    dispatch: function(payload, args) {
        if(!payload.action) {
            console.error("Missing action on payload: ", payload, this);
        }

        var actionName = payload.action.split(":")[1];

        if(!this.ACTIONS[actionName]) {
            console.error("Invalid action tried to dispatch on store: ", actionName, this, payload, args);
        } else if(!this.map[payload.action]) {
            console.error("No mapping on how to dispatch action: ", payload.action, this.map, payload, this, args);
        } else {
            var cb = this[this.map[payload.action]];
            cb.call(this, payload, args);
            if(cb.altersData === true) {
                this.emitChange(); // boo! :)
            }
        }
    }
});
module.exports = BaseStore;