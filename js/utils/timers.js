function later(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 1000);
}

/**
 * @param {Function} callback function
 * @returns {void}
 * @deprecated we shall use onIdle() or delay()
 */
function Soon(callback) {
    'use strict';
    queueMicrotask(callback);
}

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
 *  @param {Number} [ms] Timeout in milliseconds, 160 by default
 *  @param {Boolean} [global] Set to false to attach to instantiated class.
 *  @param {Function} callback  Function to wrap
 *  @returns {Function} wrapped function
 */
function SoonFc(ms, global, callback) {
    'use strict';
    var expando = '__delay_call_wrap_' + Math.random() * Math.pow(2, 56);

    // Handle arguments optionality
    ms = global = callback = null;
    for (var i = arguments.length; i--;) {
        var value = arguments[i];
        var type = typeof value;

        if (type === 'number' || type === 'string') {
            ms = value | 0;
        }
        else if (type === 'boolean') {
            global = value;
        }
        else {
            callback = value;
        }
    }
    ms = ms || 160;

    var sfc = function __soonfc() {
        var self = this;
        var idx = arguments.length;
        var args = new Array(idx);
        while (idx--) {
            args[idx] = arguments[idx];
        }

        idx = expando;

        if (global === false) {
            if (!(expando in this)) {
                Object.defineProperty(this, expando, {value: makeUUID()});
            }

            idx += this[expando];
        }

        delay(idx, function() {
            callback.apply(self, args);
        }, ms);
    };
    if (d > 1) {
        Object.defineProperty(sfc, smbl(callback.name || 'callback'), {value: callback});
    }
    return sfc;
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
    'use strict';

    // Let aProcID be optional...
    if (typeof aProcID === 'function') {
        aTimeout = aFunction;
        aFunction = aProcID;
        aProcID = aFunction.name || MurmurHash3(String(aFunction));
    }

    if (d > 2) {
        console.debug("delay'ing", aProcID, delay.queue[aProcID]);
    }

    var t = aTimeout | 0 || 350;
    var q = delay.queue[aProcID];
    if (!q) {
        q = delay.queue[aProcID] = Object.create(null);

        q.pun = aProcID;
        q.tid = setTimeout(function(q) {
            if (d > 2) {
                console.debug('dispatching delayed function...', aProcID);
            }
            delete delay.queue[q.pun];

            var rem = q.tde - (performance.now() - q.tik);
            if (rem < 20) {
                queueMicrotask(q.tsk);
            }
            else {
                delay(q.pun, q.tsk, rem);
            }
        }, t, q);
    }
    q.tde = t;
    q.tsk = aFunction;
    q.tik = performance.now();

    return aProcID;
}
delay.queue = Object.create(null);
delay.has = function(aProcID) {
    'use strict';
    return delay.queue[aProcID] !== undefined;
};
delay.cancel = function(aProcID) {
    'use strict';

    if (delay.has(aProcID)) {
        clearTimeout(delay.queue[aProcID].tid);
        delete delay.queue[aProcID];
        return true;
    }
    return false;
};
