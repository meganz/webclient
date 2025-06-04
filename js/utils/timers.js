function later(callback) {
    'use strict';
    return tSleep(1).then(callback);
}

/**
 * @param {Function} callback function
 * @returns {void}
 * @deprecated we shall use onIdle() or delay()
 */
function Soon(callback) {
    'use strict';
    if (typeof callback === 'function') {
        queueMicrotask(callback);
    }
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
    let q = delay.queue[aProcID];
    const t = Math.max(aTimeout | 0 || 200, 40);

    if (d > 2) {
        console.warn(`delaying <<${aProcID}>> for ${aTimeout}ms...`, q);
    }

    if (!q) {
        q = delay.queue[aProcID] = Object.create(null);

        q.pun = aProcID;
        q.tid = setTimeout(() => {
            const rem = q.tde - (performance.now() - q.tik);
            const rdy = rem < 50 || rem * 100 / q.tde < 2;

            if (d > 2) {
                console.warn('dispatching delayed function...', aProcID, q.tde, rem, rdy);
            }
            delete delay.queue[q.pun];

            if (rdy) {
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
    const RFP_THRESHOLD = 20;
    const MIN_THRESHOLD = 100;
    const MAX_THRESHOLD = 4e7;

    const pending = new Set();
    const symbol = Symbol('^^tSleep::scheduler~~');

    let pid = 0;
    let tid = null;
    let threshold = MAX_THRESHOLD;

    const dequeue = () => {
        const tick = performance.now();

        tid = null;
        threshold = MAX_THRESHOLD;

        for (const resolve of pending) {
            const {ts, now, data} = resolve;
            const elapsed = tick - now;

            if (elapsed + RFP_THRESHOLD > ts) {
                if (ts !== -1) {
                    resolve(data);
                }
                pending.delete(resolve);
            }
            else {
                threshold = Math.max(MIN_THRESHOLD, Math.min(ts - elapsed, threshold));
            }
        }

        if (pending.size) {
            if (self.d > 2) {
                console.warn(`tSleep rescheduled for ${threshold | 0}ms`, pending);
            }
            if (document.hidden && self.tSleep !== self.sleep) {
                tid = -1;
                const xid = ++pid;
                return sleep(threshold / 1e3).always(() => xid === pid && dequeue());
            }
            tid = gSetTimeout(dequeue, threshold);
        }
    };

    const dispatcher = () => {
        if (tid) {
            gClearTimeout(tid);
        }
        dequeue();
    };

    const schedule = (resolve, ts, data) => {
        ts = Math.min(MAX_THRESHOLD - 1, Math.max(MIN_THRESHOLD, ts | 0));

        resolve.ts = ts;
        resolve.data = data;
        resolve.id = ++mIncID;
        resolve.now = performance.now();
        pending.add(resolve);

        if (ts + (RFP_THRESHOLD >> 1) < threshold || !tid) {

            dispatcher();
        }

        return mIncID;
    };

    const lookup = (pid) => {
        for (const obj of pending) {
            if (obj.id === pid) {
                return obj;
            }
        }
    };

    const restart = (promise) => {
        const timer = lookup(promise.pid);
        if (timer) {
            const tick = performance.now();
            const elapsed = tick - timer.now;

            if (self.d > 2) {
                const {id, ts} = timer;
                console.warn(`tSleep(${id}) restarted after ${elapsed | 0}/${ts}ms elapsed...`, promise);
            }

            timer.now = tick;
            return elapsed;
        }

        console.error('Unknown timer...', promise);
    };

    const abort = (promise, state = 'aborted', data = null) => {
        let res = false;

        if (!Object.isFrozen(promise)) {
            const {pid} = promise;
            const timer = lookup(pid);

            if (timer) {
                res = timer.data || -pid;

                if (state === 'aborted') {
                    timer.ts = -1;
                    timer.data = null;
                }
                else {
                    queueMicrotask(dispatcher);

                    timer.ts = 0;
                    timer.data = data || timer.data;
                }
                Object.defineProperty(promise, state, {value: -pid | 1});
            }

            freeze(promise);
        }

        return res;
    };

    /**
     * Promise-based setTimeout() replacement.
     * @param {Number} ts time to wait in seconds.
     * @param {*} [data] arbitrary data to pass through.
     * @returns {Promise<*>} promise
     * @name tSleep
     * @memberOf window
     */
    const tSleep = (ts, data) => {
        let pid;
        const promise = new Promise((resolve) => {
            pid = schedule(resolve, ts * 1e3, data);
        });
        return Object.defineProperties(promise, {
            'pid': {
                value: pid
            },
            'abort': {
                value() {
                    return abort(this);
                }
            },
            'expedite': {
                value(data) {
                    return this.signal('expedited', data);
                }
            },
            'restart': {
                value() {
                    return restart(this);
                }
            },
            'signal': {
                value(state, data) {
                    return abort(this, state, data);
                }
            }
        });
    };

    /**
     * Helper around Promise.race()
     * @param {Number} timeout in seconds, per {@link tSleep}
     * @param {Promise<[*]>} args promises to race against.
     * @returns {Promise} eventual state of the first promise in the iterable to settle.
     * @memberOf tSleep
     */
    tSleep.race = (timeout, ...args) => {
        return Promise.race([tSleep(timeout), ...args]);
    };

    /**
     * Scheduler helper. This is similar to delay(), but without adding new setTimeout()s per call.
     * @param {Number} timeout in seconds (9s min recommended, to prevent unnecessary abort()s)
     * @param {Object|*} instance holder to attach private timer properties
     * @param {Function} [callback] function notifier
     * @memberOf tSleep
     * @returns {*} timer
     */
    tSleep.schedule = (timeout, instance, callback) => {
        const obj = instance[symbol] = instance[symbol] || {timer: null, tick: Date.now() / 1e3, timeout};

        if (obj.timer) {
            const now = Date.now() / 1e3;

            if (obj.timer.aborted) {
                obj.tick = now;
                obj.timer = null;
            }
            else if (timeout < obj.timeout) {
                obj.tick = now;
                obj.timer.abort();
                obj.timer = null;
            }
            else if (now - obj.tick > timeout >> 3) {
                obj.tick = now;
                obj.timer.restart();
            }
        }

        if (!obj.timer) {
            if (callback === undefined) {
                assert(typeof instance === 'function');
                callback = instance;
            }
            (obj.timer = tSleep(obj.timeout = timeout))
                .then(() => {
                    if (obj === instance[symbol]) {
                        instance[symbol] = null;

                        if (!obj.timer.aborted) {
                            queueMicrotask(callback);
                            obj.timer.aborted = -1;
                        }
                    }
                    else if (d) {
                        console.warn('tSleep() instance hot-swapped', obj, instance);
                    }
                })
                .catch(nop);
        }

        return obj.timer;
    };

    return freeze(tSleep);
});

/**
 * Sleep for a given number of seconds.
 * @param {Number} ts Number of seconds.
 * @param {*} [data] Any data to pass through.
 * @returns {Promise} fulfilled on timeout.
 * @function window.sleep
 * @description This is a low-level high performance non-throttled helper whose use takes careful thought.
 */
Object.defineProperty(self, 'sleep', {
    get() {
        'use strict';
        return tSleep;
    },
    configurable: true
});

self.mCreateHighPrecisionSleep = (ctx) => {
    'use strict';

    const MIN_THRESHOLD = 100;
    const MAX_THRESHOLD = 4e6;

    const pending = new Set();
    let threshold = MAX_THRESHOLD;

    let worklet = class extends AudioWorkletNode {
        constructor(ctx) {
            super(ctx, 'mega-worklet-messenger');
            this.port.onmessage = (ev) => this.handleMessage(ev);
            this._connected = false;
        }

        async attach() {
            if (!this._connected) {
                this.connect(this.context.destination);
                this._connected = true;
            }
            this.port.postMessage({threshold, message: 'schedule'});
        }

        async detach() {
            if (this._connected) {
                this._connected = false;
                this.port.postMessage({message: 'sleep'});
                return this.disconnect(this.context.destination);
            }
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
                queueMicrotask(() => this.attach().catch(dump));
            }
            else {
                queueMicrotask(() => this.detach().catch(dump));
            }
        }
    };

    // override as the only class instance.
    worklet = new worklet(ctx);

    assert(ctx.state === 'running', `Invalid audio-context state, ${ctx.state}`);
    ctx = null;

    Object.defineProperty(self, 'sleep', {
        value: (ts, data) => new Promise(resolve => {
            ts = ts * 1e3 | 0;

            resolve.ts = ts;
            resolve.data = data;
            resolve.now = performance.now();
            pending.add(resolve);

            // resist-fingerprint-aware..
            threshold = Math.max(MIN_THRESHOLD, Math.min(ts, threshold));

            queueMicrotask(() => worklet.attach().catch(dump));
        })
    });

    delete self.mCreateHighPrecisionSleep;
};

(() => {
    'use strict';

    if (!self.AudioWorkletNode || typeof Worklet === 'undefined' || !Worklet.prototype.addModule) {
        if (self.d) {
            console.warn('Weak sleep() implementation, using throttled-setTimeout()');
        }
        return;
    }

    let done;
    const sleep = async(v) => {
        const now = performance.now();

        do {
            if (done) {
                break;
            }
            await fetch(`${self.apipath}to?${v >> 1}`).catch(nop);
        }
        while (performance.now() - now < v * 1e3);
    };
    const setupAudioWorklet = async(ctx) => {
        if (ctx.state !== 'running') {
            if (self.d) {
                console.warn('[AudioWorklet] context state is %s...', ctx.state);
            }
            await Promise.race([sleep(4), ctx.resume()]).catch(dump);
            done = 1;

            if (ctx.state !== 'running') {
                throw new SecurityError(`The AudioContext was not allowed to start (${ctx.state})`);
            }
        }
        return ctx.audioWorklet.addModule(`${is_extension ? '' : '/'}worklet.js?v=1`);
    };

    const onClick = tryCatch((ev) => {
        window.removeEventListener('click', onClick, true);

        const ctx = new AudioContext();
        setupAudioWorklet(ctx)
            .then((res) => {
                if (self.d) {
                    console.warn('[AudioWorklet] module created...', res);
                }
                return self.mCreateHighPrecisionSleep(ctx);
            })
            .catch(dump);

        return ev.defaultPrevented;
    });
    window.addEventListener('click', onClick, true);
})();

tryCatch(() => {
    'use strict';
    window.setInterval = () => {

        throw new TypeError(`Invalid setInterval() invocation at runtime.`);
    };
})();

mBroadcaster.once('boot_done', tryCatch(() => {
    'use strict';
    let lax = 0;
    let pid = Math.random() * Date.now() >>> 9;

    const running = Object.create(null);
    const logger = new MegaLogger(`GTR:${pid.toString(16)}`);
    const dump = (ex) => logger.error(ex, reportError(ex));

    const IDLE_TIMEOUT = freeze({delay: 100});
    const IDLE_PIPELINE = {ts: 0, pid: 0, tasks: []};
    const IDLE_THRESHOLD = IDLE_TIMEOUT.delay << 2;

    const idleCallbackTaskSorter = (a, b) => b.ms - a.ms || b.pri - a.pri;

    const idleCallbackTaskDispatcher = (pid, ms, f, args) => {

        if (ms < 30) {
            if (self.d > 2) {
                logger.warn('Expediting ICTask...', ms, pid);
            }
            delete running[pid];
            queueMicrotask(() => f(...args));
        }
        else {

            (running[pid] = tSleep(ms / 1e3))
                .then(() => {
                    if (running[pid]) {
                        running[pid] = 'dispatching';
                        return f(...args);
                    }
                })
                .catch(dump)
                .finally(() => {
                    delete running[pid];
                });
        }
    };

    const idleCallbackHandler = (res) => {
        const {ts, tasks} = IDLE_PIPELINE;
        const elapsed = performance.now() - ts;

        // Sort tasks so that there can only be ONE tSleep()'s dispatcher invocation.
        tasks.sort(idleCallbackTaskSorter);

        for (let i = tasks.length; i--;) {
            const {ms, f, args, pid} = tasks[i];

            if (running[pid] === 'starting') {

                idleCallbackTaskDispatcher(pid, ms - elapsed, f, args);
            }
        }

        if (self.d > 2) {
            const rem = res instanceof IdleDeadline && (res.didTimeout ? -1 : res.timeRemaining());

            // Print out a warning if there are less than 5ms left until the next re-paint.
            logger[rem < 0 ? 'debug' : rem < 5 ? 'warn' : 'info'](`${tasks.length} ICTask(s) handled...`, elapsed, rem);
        }

        if (elapsed > IDLE_THRESHOLD) {
            logger.warn('Caught unreliable idleCallback() dispatcher...', lax, elapsed, document.hidden);

            if (!document.hidden && ++lax < 2 && self.buildOlderThan10Days === false) {

                eventlog(99641, true);
            }
        }

        IDLE_PIPELINE.pid = null;
        IDLE_PIPELINE.tasks = [];
    };

    const scheduleIdleCallback = (task) => {
        IDLE_PIPELINE.tasks.push(task);

        if (!IDLE_PIPELINE.pid) {
            if (document.hidden) {
                IDLE_PIPELINE.pid = sleep(IDLE_TIMEOUT.delay / 1e3).always(idleCallbackHandler);
            }
            else if (lax > 1) {
                IDLE_PIPELINE.pid = requestAnimationFrame(idleCallbackHandler);
            }
            else {
                IDLE_PIPELINE.pid = scheduler.postTask(idleCallbackHandler, IDLE_TIMEOUT);
            }
            IDLE_PIPELINE.ts = performance.now();
        }
    };

    const dspInterval = async(pid, ms, callback) => {
        running[pid] = 1;

        do {
            await tSleep(ms);

            if (running[pid]) {

                // logger.warn('tick', pid);
                callback();
            }
        }
        while (running[pid]);
    };

    window.setInterval = function(f, ms, ...args) {
        dspInterval(++pid, Math.max(ms | 0, 1e3) / 1e3, tryCatch(() => f(...args))).catch(dump);

        // logger.warn('setInterval', pid, ms);
        return pid;
    };

    window.clearInterval = function(pid) {

        // logger.warn('clearInterval', pid, running[pid]);
        delete running[pid];
    };

    window.setTimeout = function(f, ms, ...args) {

        if (typeof f !== 'function') {
            console.error('Invalid call...', f, ms, args);
            return 0;
        }

        if ((ms |= 0) < 30) {
            // logger.warn(`Short timeout (${ms}ms), dispatching micro-task...`);
            queueMicrotask(() => f(...args));
            return 0;
        }
        const pid = makeUUID();

        running[pid] = 'starting';
        scheduleIdleCallback({ms, f, args, pid, pri: ++mIncID});

        // logger.warn('setTimeout', pid, ms);
        return pid;
    };

    window.clearTimeout = function(pid) {
        // logger.warn('clearTimeout', pid, running[pid]);

        if (pid) {
            if (typeof pid === 'string') {

                if (running[pid]) {

                    if (running[pid] instanceof Promise) {

                        running[pid].abort();
                    }
                    delete running[pid];
                }
            }
            else {
                gClearTimeout(pid);
            }
        }
    };
}));
