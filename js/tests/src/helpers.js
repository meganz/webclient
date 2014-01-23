function expect() {
    return chai.expect.apply(this, toArray(arguments))
};

function fail(msg) {
    console.error(msg + " " + (Array.prototype.splice.call(arguments, 1)).join(" "));
    expect(true).toBeFalsy();
}

function expectToBeResolved($promise, msg) {
    $promise
        .fail(function() {
            debugger;
            expect(true).to.equal(false, msg + ", fail arguments: " + toArray(arguments).join(", "));
        });

    return $promise;
}


function EventMocker(object) {
    var self = this;


    self.object = object;

    if(object.on && object.bind && object.trigger) {
        self.observableObject = object;
    } else {
        self.observableObject = $(object);
    }

    self.mocks = {};

    self._uniqueIdx = 0;

    return self;
}

EventMocker.prototype.mock = function(event_type, timeout) {
    var self = this;

    timeout = timeout || 1000;

    var mock = {
        'event_type': event_type,
        'timeout': timeout,
        'timeouts': 0,
        'triggeredArgs': [],
        'triggeredCount': 0
    };



    var idx = self._uniqueIdx++;

    if(self.mocks[event_type]) {
        throw new Error("Already mocking: " + event_type);
    }
    self.mocks[event_type] = mock;


    var start_timeout_timer = function() {
        if(mock.timeout_timer) {
            clearTimeout(mock.timeout_timer);
        }

        mock.timeout_timer = setTimeout(function() {
            console.error("EventMock timed out waiting on: ", event_type);

            mock.timeout_timer = false;
            mock.timeouts+=1;

            $(self).trigger("eventTimedOut_" + event_type);
        }, timeout);
    };

    self.observableObject.on(event_type + ".em" + idx, function() {
        mock.triggeredArgs.push(
            toArray(arguments)
        );
        mock.triggeredCount+=1;

        if(mock.timeout_timer) {
            clearInterval(mock.timeout_timer);
        }
    });

    start_timeout_timer();
};

EventMocker.prototype.mockAndWait = function(event_type, timeout) {
    var self = this;
    var $promise = new $.Deferred();

    var idx = self._uniqueIdx++;

    self.mock(event_type, timeout);

    var cleanup = function() {
        self.observableObject.unbind(event_type + ".emw" + idx);
        $(self).unbind("eventTimedOut_" + event_type + ".emw" + idx);
    };

    self.observableObject.on(event_type + ".emw" + idx, function() {
        $promise.resolve(toArray(arguments));
    });

    $(self).on("eventTimedOut_" + event_type + ".emw" + idx, function() {
        cleanup();
        $promise.reject();
    });


    return $promise;
};


var StropheMocker = function(strophe_instance) {
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
            strophe_instance.muc.rooms[arguments[0]] = {
                'roster': []
            }
        },
        'directInvite': _call_logger('muc.directInvite'),
        'saveConfiguration': _call_logger('muc.saveConfiguration'),
        'kick': _call_logger('muc.kick'),
        'leave': _call_logger('muc.leave')
    };


    var mockStrophe = function(strophe_instance) {
        $.each(STROPHE_METHODS_TO_BE_MOCKED, function(k, v) {
            sinon.stub(strophe_instance, k, v);
        });
        $.each(STROPHE_MUC_METHODS_TO_BE_MOCKED, function(k, v) {
            sinon.stub(strophe_instance.muc, k, v);
        });

        strophe_instance.karere.fakeConnect = function(jid, password) {
            var call_idx = self.calls['connect'].length;
            this.connect(jid, password);

            // send new state = CONNECTED
            self.calls['connect'][call_idx][2](
                Karere.CONNECTION_STATE.CONNECTED
            );
        };
    };

    var unmockStrophe = function(strophe_instance) {
        $.each(STROPHE_METHODS_TO_BE_MOCKED, function(k, v) {
            strophe_instance[k].restore();
        });
        $.each(STROPHE_MUC_METHODS_TO_BE_MOCKED, function(k, v) {
            strophe_instance.muc[k].restore();
        });
    };

    mockStrophe(strophe_instance);

    this.restore = function() {
        unmockStrophe(strophe_instance);
    };


};


var stringToXml = function(str) {
    // helper method for unit tests which will be mocking XML stanzas
    // main assumption is that Strophe is loaded
    return Strophe.xmlHtmlNode(str).children[0];
};