/**
 * Helper too to create simple/dummy event listeners on a specific object and log triggers.
 *
 * @param object should be object which is Observable (to have .on, .bind, .trigger and .unbind)
 * @returns {EventMocker}
 * @constructor
 */
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

/**
 * Create new event mocker/logger.
 * All of the activity is logged into EventMocker.mocks[eventName] and it contains:
 *  - triggeredArgs - array, which contains all arguments passed to the .trigger for this event
 *  - triggeredCount - integer, number of times that the event was triggered
 *
 * Note: You can only mock a specific event only once.
 *
 * @param eventName string event name
 * @param timeout timeout in milliseconds before logging and error.
 */
EventMocker.prototype.mock = function(eventName, timeout) {
    var self = this;

    timeout = timeout || 1000;

    var mock = {
        'eventName': eventName,
        'timeout': timeout,
        'timeouts': 0,
        'triggeredArgs': [],
        'triggeredCount': 0
    };



    var idx = self._uniqueIdx++;

    if(self.mocks[eventName]) {
        throw new Error("Already mocking: " + eventName);
    }
    self.mocks[eventName] = mock;

    if(localStorage.d) {
        console.debug(
            (new Date()),
            "Starting to wait for event:", eventName
        );
    }

    var start_timeout_timer = function() {
        if(mock.timeout_timer) {
            clearTimeout(mock.timeout_timer);
        }

        mock.timeout_timer = setTimeout(function() {
            console.error("EventMock timed out waiting on: ", eventName, (new Date()));

            mock.timeout_timer = false;
            mock.timeouts+=1;

            $(self).trigger("eventTimedOut_" + eventName);
        }, timeout);
    };

    self.observableObject.on(eventName + ".em" + idx, function() {
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

/**
 * Same as .mock, but will return an promise, which will be resolved when the event is triggered OR fail if it times
 * out.
 *
 * @param eventName
 * @param timeout
 * @returns {Deferred}
 */
EventMocker.prototype.mockAndWait = function(eventName, timeout) {
    var self = this;
    var $promise = new $.Deferred();

    var idx = self._uniqueIdx++;

    self.mock(eventName, timeout);

    var cleanup = function() {
        self.observableObject.unbind(eventName + ".emw" + idx);
        $(self).unbind("eventTimedOut_" + eventName + ".emw" + idx);
    };

    self.observableObject.on(eventName + ".emw" + idx, function() {
        $promise.resolve(toArray(arguments));
    });

    $(self).on("eventTimedOut_" + eventName + ".emw" + idx, function() {
        cleanup();
        $promise.reject();
    });


    return $promise;
};