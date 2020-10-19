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


/** getOwnPropertyDescriptors polyfill */
if (!Object.hasOwnProperty('getOwnPropertyDescriptors')) {
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
        value: function getOwnPropertyDescriptors(obj) {
            'use strict';

            var result = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    result[key] = Object.getOwnPropertyDescriptor(obj, key);
                }
            }

            return result;
        }
    });
}

/** setPrototypeOf (weak) polyfill */
if (Object.setPrototypeOf === undefined) {
    Object.setPrototypeOf = function(target, proto) {
        'use strict';
        target.__proto__ = proto;
        return target;
    };
}

if (!String.prototype.startsWith) {
    // determines whether a string begins with the characters of a specified string
    String.prototype.startsWith = function(searchString, position) {
        'use strict';
        return this.substr(position || 0, searchString.length) === searchString;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchStr, pos) {
        'use strict';

        // This works much better than >= because it compensates for NaN:
        if (!(pos < this.length)) {
            pos = this.length;
        }
        return this.substr((pos | 0) - searchStr.length, searchStr.length) === searchStr;
    };
}

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

mBroadcaster.once('boot_done', function() {
    'use strict';

    if (typeof window.queueMicrotask !== "function") {
        var tbsp = Promise.resolve();

        window.queueMicrotask = function(callback) {
            tbsp.then(callback);
        };
    }
});

mBroadcaster.once('boot_done', function() {
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
});

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

// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        "use strict";
        // truncate if number, or convert non-number to 0;
        targetLength >>= 0;
        padString = String(typeof padString === 'undefined' ? ' ' : padString);
        if (this.length >= targetLength) {
            return String(this);
        }
        targetLength -= this.length;
        if (targetLength > padString.length) {
            // append to original to ensure we are longer than needed
            padString += padString.repeat(targetLength / padString.length);
        }
        return padString.slice(0, targetLength) + String(this);
    };
}
if (!String.prototype.padEnd) {
    String.prototype.padEnd = function padEnd(targetLength, padString) {
        "use strict";
        // floor if number or convert non-number to 0;
        targetLength >>= 0;
        padString = String(typeof padString === 'undefined' ? ' ' : padString);
        if (this.length > targetLength) {
            return String(this);
        }
        targetLength -= this.length;
        if (targetLength > padString.length) {
            // append to original to ensure we are longer than needed
            padString += padString.repeat(targetLength / padString.length);
        }
        return String(this) + padString.slice(0, targetLength);
    };
}



// XXX: The following are not polyfills obviously, but given this file is included always let's place them here for now

// @private
var nop = function() {
    'use strict';
};

// @private
var echo = function(a) {
    'use strict';
    return a;
};

// @private
var dump = console.warn.bind(console, '[dump]');
