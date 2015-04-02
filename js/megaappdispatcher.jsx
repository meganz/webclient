var MegaDispatcher = require('./megadispatcher.jsx');
var assign = require('object-assign');

var MegaAppDispatcher = assign({}, MegaDispatcher.prototype, {

    /**
     * A bridge function between the views and the dispatcher, marking the action
     * as a view action.  Another variant here could be handleServerAction.
     * @param  {object} action The data coming from the view.
     */
    handleUIAction: function(action, args) {
        this.dispatch(assign({
            source: 'UI_ACTION',
            args: args
        }, action));
    }
});

module.exports = MegaAppDispatcher;