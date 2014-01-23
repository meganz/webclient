/**
 * Quick and dirty helper class, for mocking Strophe instances.
 * How to use:
 * 1. Just pass the strophe instance as first argument and store and store the StropheMocker instance somewhere
 * 2. When done testing (e.g. in afterEach()), call the StropheMocker.restore() to remove any stubs which were created
 *
 *
 * Note: requires sinon.js
 *
 * @param stropheInstance
 * @constructor
 */
var StropheMocker = function(stropheInstance) {
    var self = this;


    self.calls = {};


    var _call_logger = function(name) {
        if(typeof(self.calls[name]) == 'undefined') {
            self.calls[name] = [];
        }
        return function() {
            self.calls[name].push(
                toArray(arguments)
            );
        }
    };

    var STROPHE_METHODS_TO_BE_MOCKED = {
        'connect': _call_logger('connect'),
        'send': _call_logger('send'),
        'disconnect': _call_logger('disconnect')
    };

    var STROPHE_MUC_METHODS_TO_BE_MOCKED = {
        'join': function() {
            _call_logger('muc.join').apply(this, toArray(arguments));
            stropheInstance.muc.rooms[arguments[0]] = {
                'roster': []
            }
        },
        'directInvite': _call_logger('muc.directInvite'),
        'saveConfiguration': _call_logger('muc.saveConfiguration'),
        'kick': _call_logger('muc.kick'),
        'leave': _call_logger('muc.leave')
    };


    /**
     * Private method, that will go thru all STROPHE_METHODS_TO_BE_MOCKED and STROPHE_MUC_METHODS_TO_BE_MOCKED and
     * create stubs.
     * Also IF the stropheInstance have a `karere` property, it will create a new method called fakeConnect, that will
     * fake a successful connection to the server.
     *
     * @param stropheInstance
     */
    var mockStrophe = function(stropheInstance) {
        $.each(STROPHE_METHODS_TO_BE_MOCKED, function(k, v) {
            sinon.stub(stropheInstance, k, v);
        });
        $.each(STROPHE_MUC_METHODS_TO_BE_MOCKED, function(k, v) {
            sinon.stub(stropheInstance.muc, k, v);
        });

        if(stropheInstance.karere) {
            stropheInstance.karere.fakeConnect = function(jid, password) {
                var call_idx = self.calls['connect'].length;
                this.connect(jid, password);

                // send new state = CONNECTED
                self.calls['connect'][call_idx][2](
                    Karere.CONNECTION_STATE.CONNECTED
                );
            };
        }
    };

    /**
     * Unmock/restore any stubs created on this stropheInstance
     *
     * @param stropheInstance
     */
    var unmockStrophe = function(stropheInstance) {
        $.each(STROPHE_METHODS_TO_BE_MOCKED, function(k, v) {
            stropheInstance[k].restore();
        });
        $.each(STROPHE_MUC_METHODS_TO_BE_MOCKED, function(k, v) {
            stropheInstance.muc[k].restore();
        });
    };

    mockStrophe(stropheInstance);

    /**
     * Expose the private unmockStrophe function
     */
    this.restore = function() {
        unmockStrophe(stropheInstance);
    };

    return this;
};