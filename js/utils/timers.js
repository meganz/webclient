function later(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 1000);
}

var Soon = is_chrome_firefox ? mozRunAsync : function(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 20);
};

/**
 *  Delays the execution of a function
 *
 *  Wraps a function to execute at most once
 *  in a 100 ms time period. Useful to wrap
 *  expensive jQuery events (for instance scrolling
 *  events).
 *
 *  All argument and *this* is passed to the callback
 *  after the 100ms (default)
 *
 *  @param {Function} func  Function to wrap
 *  @param {Number}   ms    Timeout
 *  @returns {Function} wrapped function
 */
function SoonFc(func, ms) {
    return function __soonfc() {
        var self = this;
        var args = toArray.apply(null, arguments);

        if (func.__sfc) {
            clearTimeout(func.__sfc);
        }
        func.__sfc = setTimeout(function() {
            delete func.__sfc;
            func.apply(self, args);
        }, ms || 122);
    };
}

/**
 * Delay a function execution, like Soon() does except it accept a parameter to
 * identify the delayed function so that consecutive calls to delay the same
 * function will make it just fire once. Actually, this is the same than
 * SoonFc() does, but it'll work with function expressions as well.
 *
 * @param {String}   aProcID     ID to identify the delayed function
 * @param {Function} [aFunction] The function/callback to invoke
 * @param {Number}   [aTimeout]  The timeout, in ms, to wait.
 */
function delay(aProcID, aFunction, aTimeout) {

    // Let aProcID be optional...
    if (typeof aProcID === 'function') {
        aTimeout = aFunction;
        aFunction = aProcID;
        aProcID = aFunction.name || MurmurHash3(String(aFunction));
    }

    if (d > 2) {
        console.debug("delay'ing", aProcID, delay.queue[aProcID]);
    }
    delay.cancel(aProcID);

    delay.queue[aProcID] =
        setTimeout(function() {
            if (d > 1) {
                console.debug('dispatching delayed function...', aProcID);
            }
            delete delay.queue[aProcID];
            aFunction();
        }, (aTimeout | 0) || 350);

    return aProcID;
}
delay.queue = Object.create(null);
delay.has = function(aProcID) {
    return delay.queue[aProcID] !== undefined;
};
delay.cancel = function(aProcID) {
    if (delay.has(aProcID)) {
        clearTimeout(delay.queue[aProcID]);
        delete delay.queue[aProcID];
        return true;
    }
    return false;
};
function later(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 1000);
}

var Soon = is_chrome_firefox ? mozRunAsync : function(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 20);
};

/**
 *  Delays the execution of a function
 *
 *  Wraps a function to execute at most once
 *  in a 100 ms time period. Useful to wrap
 *  expensive jQuery events (for instance scrolling
 *  events).
 *
 *  All argument and *this* is passed to the callback
 *  after the 100ms (default)
 *
 *  @param {Function} func  Function to wrap
 *  @param {Number}   ms    Timeout
 *  @returns {Function} wrapped function
 */
function SoonFc(func, ms) {
    return function __soonfc() {
        var self = this;
        var args = toArray.apply(null, arguments);

        if (func.__sfc) {
            clearTimeout(func.__sfc);
        }
        func.__sfc = setTimeout(function() {
            delete func.__sfc;
            func.apply(self, args);
        }, ms || 122);
    };
}

/**
 * Delay a function execution, like Soon() does except it accept a parameter to
 * identify the delayed function so that consecutive calls to delay the same
 * function will make it just fire once. Actually, this is the same than
 * SoonFc() does, but it'll work with function expressions as well.
 *
 * @param {String}   aProcID     ID to identify the delayed function
 * @param {Function} [aFunction] The function/callback to invoke
 * @param {Number}   [aTimeout]  The timeout, in ms, to wait.
 */
function delay(aProcID, aFunction, aTimeout) {

    // Let aProcID be optional...
    if (typeof aProcID === 'function') {
        aTimeout = aFunction;
        aFunction = aProcID;
        aProcID = aFunction.name || MurmurHash3(String(aFunction));
    }

    if (d > 2) {
        console.debug("delay'ing", aProcID, delay.queue[aProcID]);
    }
    delay.cancel(aProcID);

    delay.queue[aProcID] =
        setTimeout(function() {
            if (d > 1) {
                console.debug('dispatching delayed function...', aProcID);
            }
            delete delay.queue[aProcID];
            aFunction();
        }, (aTimeout | 0) || 350);

    return aProcID;
}
delay.queue = Object.create(null);
delay.has = function(aProcID) {
    return delay.queue[aProcID] !== undefined;
};
delay.cancel = function(aProcID) {
    if (delay.has(aProcID)) {
        clearTimeout(delay.queue[aProcID]);
        delete delay.queue[aProcID];
        return true;
    }
    return false;
};
