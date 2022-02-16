/**
 * @file Browser polyfills
 * @desc This is the only file where we're allowed to extend native prototypes, as required for polyfills.
 *//* eslint-disable no-extend-native */

/** document.hasFocus polyfill */
mBroadcaster.once('startMega', function() {
    if (typeof document.hasFocus !== 'function') {
        var hasFocus = true;

        $(window)
            .bind('focus', function() {
                hasFocus = true;
            })
            .bind('blur', function() {
                hasFocus = false;
            });

        document.hasFocus = function() {
            return hasFocus;
        };
    }
});

/** document.exitFullScreen polyfill */
mBroadcaster.once('startMega', function() {
    'use strict';

    if (typeof document.exitFullscreen !== 'function') {
        document.exitFullscreen = document.mozCancelFullScreen
            || document.webkitCancelFullScreen || document.msExitFullscreen || function() {};
    }
});

mBroadcaster.once('startMega', tryCatch(function() {
    'use strict';

    // FIXME: this is a silly polyfill for our exact needs atm..
    if (window.Intl && !Intl.NumberFormat.prototype.formatToParts) {
        Intl.NumberFormat.prototype.formatToParts = function(n) {
            var result;

            tryCatch(function() {
                result = Number(n).toLocaleString(getCountryAndLocales().locales).match(/(\d+)(\D)(\d+)/);
            }, function() {
                result = Number(n).toLocaleString().match(/(\d+)(\D)(\d+)/);
            })();

            if (!result || result.length !== 4) {
                result = [NaN, NaN, '.', NaN];
            }

            return [
                {type: "integer", value: result[1]},
                {type: "decimal", value: result[2]},
                {type: "fraction", value: result[3]}
            ];
        };
    }
}, false));

mBroadcaster.once('startMega', function() {
    "use strict";

    // ArrayBuffer & Uint8Array slice polyfill based on:
    // https://github.com/ttaubert/node-arraybuffer-slice
    // (c) 2014 Tim Taubert <tim[a]timtaubert.de>
    // arraybuffer-slice may be freely distributed under the MIT license.

    function clamp(val, length) {
        val = (val | 0) || 0;

        if (val < 0) {
            return Math.max(val + length, 0);
        }

        return Math.min(val, length);
    }

    if (!ArrayBuffer.prototype.slice) {
        Object.defineProperty(ArrayBuffer.prototype, 'slice', {
            writable: true,
            configurable: true,
            value: function(from, to) {
                var length = this.byteLength;
                var begin = clamp(from, length);
                var end = length;

                if (to !== undefined) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                var num = end - begin;
                var target = new ArrayBuffer(num);
                var targetArray = new Uint8Array(target);

                var sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            }
        });
    }

    if (!Uint8Array.prototype.slice) {
        Object.defineProperty(Uint8Array.prototype, 'slice', {
            writable: true,
            configurable: true,
            value: function(from, to) {
                return new Uint8Array(this.buffer.slice(from, to));
            }
        });
    }

    if (typeof Uint8Array.prototype.copyWithin !== 'function') {
        Uint8Array.prototype.copyWithin = function(target, start, end) {
            return Array.prototype.copyWithin.call(this, target, start,  end);
        };
    }
});

mBroadcaster.once('boot_done', function() {
    'use strict';

    if (typeof window.devicePixelRatio === 'undefined') {
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function() {
                return (screen.deviceXDPI / screen.logicalXDPI) || 1;
            }
        });
    }
});

mBroadcaster.once('boot_done', function() {
    'use strict';

    // Pragmatic Device Memory API Polyfill...
    // https://caniuse.com/#search=deviceMemory
    if (navigator.deviceMemory === undefined) {
        lazy(navigator, 'deviceMemory', function() {
            var value = 0.5;
            var uad = ua.details || false;

            if (uad.engine === 'Gecko') {
                value = 1 + uad.is64bit;

                if (parseInt(uad.version) > 67) {
                    value *= 3;
                }
            }
            else if (uad.is64bit) {
                value = 2;
            }

            return value;
        });
    }
});

if (typeof window.queueMicrotask !== "function") {
    const tbsp = Promise.resolve();

    window.queueMicrotask = (callback) => {
        'use strict';
        tbsp.then(callback);
    };
}

(() => {
    'use strict';
    Promise.prototype.always = function(fc) {
        return this.then(fc).catch(fc);
    };
    Promise.prototype.dump = function(tag) {
        // XXX: No more then/catch after invoking this!
        this.then(console.debug.bind(console, tag || 'OK'))
            .catch(console.warn.bind(console, tag || 'FAIL'));
        return this;
    };

    // @todo remove once Fx60 is upgraded on Jenkins
    if (Promise.prototype.finally === undefined) {
        Promise.prototype.finally = function(cb) {
            return this.then(
                (res) => Promise.resolve(cb()).then(() => res),
                (ex) => Promise.resolve(cb())
                    .then(() => {
                        throw ex;
                    }));
        };
    }

    if (Promise.allSettled === undefined) {
        Promise.allSettled = function(promises) {
            var done = function(result) {
                return {status: 'fulfilled', value: result};
            };
            var fail = function(result) {
                return {status: 'rejected', reason: result};
            };
            var map = function(value) {
                return Promise.resolve(value).then(done).catch(fail);
            };
            return Promise.all(promises.map(map));
        };
    }

    Object.defineProperty(Set.prototype, 'first', {
        get: function first() {
            for (const item of this) {
                return item;
            }
            return false;
        }
    });

    if (!Array.prototype.flat) {
        const reduce = Array.prototype.reduce;
        const concat = Array.prototype.concat.bind([]);
        Object.defineProperty(Array.prototype, 'flat', {
            configurable: !!window.is_karma,
            value: function flat(depth = 1) {
                return depth < 2 ? depth ? concat(...this) : this
                    : reduce.call(this, (a, o) =>
                        (Array.isArray(o) && a.push(...flat.call(o, depth - 1)) || a.push(o)) && a, []);
            }
        });
    }
})();

mBroadcaster.once('boot_done', function() {
    'use strict';
    var mg;

    // Check whether the running browser is ES2019 compliant by testing RegExp's Look-behind Assertions.
    try {
        mg = '<foo one>m1</foo><foo doh>:</foo><foo two>m2</foo>'.match(RegExp('(?<=foo (?:one|two)>)([^<]+)', 'g'));
    }
    catch (ex) {}

    Object.defineProperty(mega, 'es2019', {value: mg && mg.length === 2 && mg[0] === 'm1' && mg[1] === 'm2'});
});


// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// {{{ BEGIN: Helpers, with direct dependency on polyfills or latest ECMAScript

if (typeof WeakRef === 'undefined') {
    const wm = new WeakMap();

    WeakRef = class {
        constructor(ref) {
            wm.set(this, ref);
        }
        deref() {
            return wm.get(this);
        }
    };
}

class IWeakSet extends Set {
    add(obj) {
        if (!this.has(obj)) {
            super.add(new WeakRef(obj));
        }
    }
    has(obj) {
        for (const value of this) {
            if (value === obj) {
                return true;
            }
        }
    }
    delete(obj) {
        for (const ref of super.values()) {
            if (ref.deref() === obj) {
                super.delete(ref);
                return true;
            }
        }
    }
    remove(set) {
        for (const ref of super.values()) {
            if (set.has(ref.deref())) {
                super.delete(ref);
            }
        }
        set.clear();
    }
    get size() {
        const result = [...this].length;
        if (d && super.size !== result) {
            console.warn('IWeakSet: Garbage collection took action (%s/%s)', result, super.size, this);
        }
        return result;
    }
    *[Symbol.iterator]() {
        for (const ref of super.values()) {
            const value = ref.deref();
            if (value) {
                yield value;
            }
        }
    }
    get [Symbol.toStringTag]() {
        return 'IWeakSet';
    }
}

/** Very simple LRU using Map() */
class LRUMap extends Map {
    constructor(capacity = 250, notifier = null) {
        super();
        Object.defineProperty(this, 'capacity', {value: capacity});
        Object.defineProperty(this, 'notifier', {value: notifier || self.d > 0 && dump.bind(null, [this])});
    }
    get(key) {
        if (super.has(key)) {
            const value = super.get(key);
            super.delete(key);
            super.set(key, value);
            return value;
        }
    }
    set(key, value) {
        if (this.notifier && super.has(key)) {
            this.notifier(super.get(key), key, this, true);
        }
        if (super.size === this.capacity) {
            const [[k, v]] = this;
            if (this.notifier) {
                this.notifier(v, k, this, false);
            }
            super.delete(k);
        }
        super.set(key, value);
    }
    get [Symbol.toStringTag]() {
        return 'LRUMap';
    }
}

class MapSet extends LRUMap {
    get [Symbol.toStringTag]() {
        return 'MapSet';
    }

    set(key, value) {
        if (!super.has(key)) {
            super.set(key, new Set());
        }
        const set = super.get(key);

        set.add(value);
        return set.size;
    }

    find(key, callback) {
        if (super.has(key)) {
            const set = super.get(key);

            for (const value of set) {
                if (callback(value)) {
                    return value;
                }
            }
        }
    }

    size(value) {
        return (super.get(value) || !1).size | 0;
    }
}

/**
 * Instantiate a sub-class, similar to our inherits() but with es6 classes.
 * @param {String} name The name of the class
 * @param {Object} sup The instance of inherit from
 * @param {Object} [target] where to define the property
 * @returns {class} the dynamically created class
 */
const mSubClass = (name, sup, target) => {
    'use strict';

    const cl = {
        [name]:
            class extends sup {
                constructor(...args) {
                    super(...args);
                    this.name = name;
                }
            }
    }[name];

    if (target !== null) {
        Object.defineProperty(target || window, name, {value: cl});
    }

    return cl;
};

/**
 * Helper to mimic async functions.
 * @param {Function} fc function method.
 * @returns {function(...[*]): Promise<void>} promise
 * @deprecated Use async/await instead.
 */
function promisify(fc) {
    'use strict';
    const a$yncMethod = function(...args) {
        return new Promise((resolve, reject) => {
            const result = a$yncMethod.__function__.apply(this, [resolve, reject, ...args]);
            if (result instanceof Promise) {
                if (d > 2) {
                    console.assert(a$yncMethod.__function__[Symbol.toStringTag] === "AsyncFunction");
                }
                result.catch(reject);
            }
        });
    };
    a$yncMethod.prototype = undefined;
    Object.defineProperty(fc, '__method__', {value: a$yncMethod});
    Object.defineProperty(a$yncMethod, '__function__', {value: fc});
    return a$yncMethod;
}

/**
 * Mutex impl. for Promises.
 * @param {String} [name] unique lock name
 * @param {Function} handler function dispatcher.
 * @returns {function(...[*]): Promise<void>} promise.
 */
function mutex(name, handler) {
    'use strict';
    if (typeof name === 'function') {
        handler = name;
        name = null;
    }
    const mMutexMethod = function(...args) {
        name = name || this.__mutex_lock_name_$;
        if (!name) {
            name = (this.constructor.name || '$') + makeUUID().slice(-13);
            Object.defineProperty(this, '__mutex_lock_name_$', {value: name});
        }
        return new Promise((resolve, reject) => {
            mutex.lock(name).then((unlock) => {
                const rej = (a0) => unlock().then(() => reject(a0));
                const res = (a0) => unlock().then(() => resolve(a0));
                return mMutexMethod.__function__.apply(this, [res, rej, ...args]);
            }).catch((ex) => {
                console.error(ex);
                mutex.unlock(name).finally(reject.bind(null, ex));
            });
        });
    };
    mMutexMethod.prototype = undefined;
    Object.defineProperty(handler, '__method__', {value: mMutexMethod});
    Object.defineProperty(mMutexMethod, '__name__', {value: name});
    Object.defineProperty(mMutexMethod, '__function__', {value: handler});
    return Object.freeze(mMutexMethod);
}

mutex.queue = Object.create(null);
mutex.lock = promisify((resolve, reject, name) => {
    'use strict';
    resolve = resolve.bind(null, mutex.unlock.bind(mutex, name));

    if (mutex.queue[name]) {
        mutex.queue[name].push(resolve);
    }
    else {
        mutex.queue[name] = [];
        resolve();
    }
});
mutex.unlock = async(name) => {
    'use strict';
    const next = (mutex.queue[name] || []).shift();
    if (next) {
        queueMicrotask(next);
    }
    else {
        delete mutex.queue[name];
    }
};
Object.freeze(mutex);

/** @property mega.promise */
Object.defineProperty(mega, 'promise', {
    get: function() {
        'use strict';
        let rej, res;
        const promise = new Promise((resolve, reject) => {
            rej = reject;
            res = resolve;
        });
        Object.defineProperty(promise, 'reject', {value: rej});
        Object.defineProperty(promise, 'resolve', {value: res});
        return  Object.freeze(promise);
    }
});

/** @property window.SyntaxError */
/** @property window.SecurityError */
tryCatch((mock) => {
    'use strict';
    mock('SyntaxError');
    mock('SecurityError');
})(async(name) => {
    'use strict';
    if (window[name] === undefined || !tryCatch(() => new window[name]('test'), false)()) {
        mSubClass(name, Error);
    }
});

// }}} END: Helpers, with direct dependency on polyfills or latest ECMAScript
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
