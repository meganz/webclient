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
    const expando = `__delay_call_wrap_${Math.random() * Math.pow(2, 56)}`;

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

    const sfc = function __soonfc(...args) {
        let idx = expando;

        if (global === false) {
            if (!(expando in this)) {
                Object.defineProperty(this, expando, {value: makeUUID()});
            }

            idx += this[expando];
        }

        delay(idx, () => callback.apply(this, args), ms);
    };
    if (d > 1) {
        Object.defineProperty(sfc, Symbol(callback.name || 'callback'), {value: callback});
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
        q.tid = setTimeout(() => {
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
        }, t);
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
delay.abort = () => {
    'use strict';

    if (d) {
        console.warn('Aborting all pending scheduled timers...', Object.keys(delay.queue));
    }
    Object.keys(delay.queue).forEach((t) => delay.cancel(t));
};

/**
 * @function window.tSleep
 * @see {@link window.sleep}
 */
lazy(self, 'tSleep', function tSleep() {
    'use strict';
    return (ts, data) => new Promise(resolve => setTimeout(resolve, ts * 1e3, data));
});

/**
 * Sleep for a given number of seconds.
 * @param {Number} ts Number of seconds.
 * @param {*} [data] Any data to pass through.
 * @returns {Promise} fulfilled on timeout.
 * @function window.sleep
 * @description This is a low-level high performance non-throttled helper whose use takes careful thought.
 */
lazy(self, 'sleep', function sleep() {
    'use strict';

    if (!window.isSecureContext || typeof Worklet === 'undefined' || !Worklet.prototype.addModule) {
        if (d) {
            console.warn('Weak sleep() implementation, using throttled-setTimeout()');
        }
        return tSleep;
    }

    const MIN_THRESHOLD = 100;
    const MAX_THRESHOLD = 4e6;

    const pending = new Set();
    let threshold = MAX_THRESHOLD;

    let worklet = class extends AudioWorkletNode {
        constructor(ctx) {
            super(ctx, 'mega-worklet-messenger');
            this.port.onmessage = (ev) => this.handleMessage(ev);
            this._connected = false;
            this.dispatch();
        }

        get ready() {
            return true;
        }

        attach() {
            if (!this._connected) {
                this._connected = true;
                this.connect(this.context.destination);
            }
        }

        detach() {
            if (this._connected) {
                this.port.postMessage({message: 'sleep'});
                this.disconnect(this.context.destination);
                this._connected = false;
            }
        }

        dispatch() {
            this.attach();
            this.port.postMessage({threshold, message: 'schedule'});
        }

        handleMessage(ev) {
            // console.debug('worklet-message', ev.data);

            if (ev.data.message !== 'dispatch') {
                return;
            }
            const tick = performance.now();

            threshold = MAX_THRESHOLD;
            for (const res of pending) {
                const {ts, now, data} = res;
                const elapsed = tick - now;

                if (elapsed + 21 > ts) {
                    res(data);
                    pending.delete(res);
                }
                else {
                    threshold = Math.max(MIN_THRESHOLD, Math.min(ts - elapsed, threshold));
                }
            }

            if (pending.size) {
                // re-schedule as per new threshold
                queueMicrotask(() => this.dispatch());
            }
            else {
                queueMicrotask(() => this.detach());
            }
        }
    };

    mega.worklet.then((ctx) => {
        // override as the only class instance.
        worklet = new worklet(ctx);
    }).catch(ex => {
        if (d) {
            console.warn('The audio worklet failed to start, falling back to low-precision sleep()...', ex);
        }

        delete window.sleep;
        window[`sl${'e'}ep`] = tSleep;

        for (const res of pending) {
            tSleep(res.ts / 1e3, res.data).then(res);
        }
        pending.clear();
    });

    return (ts, data) => new Promise(resolve => {
        ts = ts * 1e3 | 0;

        resolve.ts = ts;
        resolve.data = data;
        resolve.now = performance.now();
        pending.add(resolve);

        // resist-fingerprint-aware..
        threshold = Math.max(MIN_THRESHOLD, Math.min(ts, threshold));

        if (worklet.ready) {
            queueMicrotask(() => worklet.dispatch());
        }
    });
});

/** @property mega.worklet */
lazy(mega, 'worklet', function worklet() {
    'use strict';
    return Promise.resolve((async() => {
        const ctx = new AudioContext();
        if (ctx.state !== 'running') {
            throw new SecurityError('The AudioContext was not allowed to start?');
        }
        await ctx.audioWorklet.addModule(`${is_extension ? '' : '/'}worklet.js?v=1`);
        return ctx;
    })());
});
