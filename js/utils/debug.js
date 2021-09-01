/**
 * Simple wrapper function that will log all calls of `fnName`.
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 * @param ctx
 * @param fnName
 * @param loggerFn
 */
function callLoggerWrapper(ctx, fnName, loggerFn, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }

    var origFn = ctx[fnName];
    textPrefix = textPrefix || "missing-prefix";

    var logger = MegaLogger.getLogger(textPrefix + "[" + fnName + "]", {}, parentLogger);
    var logFnName = loggerFn === console.error ? "error" : "debug";

    if (ctx[fnName].haveCallLogger) { // recursion
        return;
    }
    ctx[fnName] = function() {
        // loggerFn.apply(console, [prefix1, prefix2, "Called: ", fnName, arguments]);
        logger[logFnName].apply(logger, ["(calling) arguments: "].concat(toArray.apply(null, arguments)));

        var res = origFn.apply(this, arguments);
        // loggerFn.apply(console, [prefix1, prefix2, "Got result: ", fnName, arguments, res]);
        logger[logFnName].apply(logger, ["(end call) arguments: "].concat(toArray.apply(null, arguments)).concat([
            "returned: ", res
        ]));

        return res;
    };
    ctx[fnName].haveCallLogger = true; // recursion
}

/**
 * Simple Object instance call log helper
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 *
 * WARNING: This function will create tons of references in the window.callLoggerObjects & also may flood your console.
 *
 * @param ctx
 * @param [loggerFn] {Function}
 * @param [recursive] {boolean}
 */
function logAllCallsOnObject(ctx, loggerFn, recursive, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }
    loggerFn = loggerFn || console.debug;

    if (typeof parentLogger === "undefined") {
        var logger = new MegaLogger(textPrefix);
    }
    if (!window.callLoggerObjects) {
        window.callLoggerObjects = [];
    }

    $.each(ctx, function(k, v) {
        if (typeof v === "function") {
            callLoggerWrapper(ctx, k, loggerFn, textPrefix, parentLogger);
        }
        else if (typeof v === "object"
            && !$.isArray(v) && v !== null && recursive && !$.inArray(window.callLoggerObjects)) {
            window.callLoggerObjects.push(v);
            logAllCallsOnObject(v, loggerFn, recursive, textPrefix + ":" + k, parentLogger);
        }
    });
}

/**
 * Trace function call usages
 * @param {Object} ctr The desired object to trace.
 */
function dcTracer(ctr) {
    var name = ctr.name || 'unknown',
        proto = ctr.prototype || ctr;
    for (var fn in proto) {
        if (proto.hasOwnProperty(fn) && typeof proto[fn] === 'function') {
            console.log('Tracing ' + name + '.' + fn);
            proto[fn] = (function(fn, fc) {
                fc.dbg = function() {
                    try {
                        console.log('Entering ' + name + '.' + fn,
                            this, '~####~', Array.prototype.slice.call(arguments));
                        var r = fc.apply(this, arguments);
                        console.log('Leaving ' + name + '.' + fn, r);
                        return r;
                    }
                    catch (e) {
                        console.error(e);
                    }
                };
                return fc.dbg;
            })(fn, proto[fn]);
        }
    }
}

lazy(self, 'runKarmaTests', () => {
    'use strict';
    let currentFile = -1;
    const storage = Object.create(null);
    const assert = (expr, msg) => {
        if (!expr) {
            throw new MEGAException(msg);
        }
    };
    const tag = (v) => v && (v[Symbol.toStringTag] || v.name);
    const name = (v) => tag(v) || v && tag(v.constructor) || v;
    const val = (v) => {
        if (typeof v === 'number' && v > 0x1fff) {
            return `${v} (0x${v.toString(16)})`;
        }
        return v;
    };

    let value;
    const chai = {
        expect: (v) => {
            value = v;
            return chai;
        },
        eql: (v) => assert(value === v, `Expected '${value}' to be equal to '${v}'`),
        instanceOf: (v) =>
            assert(value instanceof v, `Expected '${name(value)}' to be instance of ${name(v)}`),
        lessThan: (v) => assert(value < v, `Expected ${val(value)} to be less than ${val(v)}`),
        greaterThan: (v) => assert(value > v, `Expected ${val(value)} to be greater than ${val(v)}`)
    };
    chai.assert = assert;
    chai.to = chai.be = chai;

    self.chai = chai;
    self.expect = chai.expect;

    self.describe = (name, batch) => {
        storage[currentFile][name] = batch;
    };

    return mutex('karma-runner', async(resolve, reject, file = 'webgl', deps = ['tiffjs']) => {
        currentFile = `test/${file.replace(/\W/g, '')}_test.js`;

        if (!storage[currentFile]) {
            storage[currentFile] = Object.create(null);
            await M.require(currentFile, ...deps);
        }

        const getTestLocation = (name) => {
            let location;
            const {stack} = new Error('M');

            if (stack) {
                const lines = stack.split('\n');

                while (lines.length) {
                    const line = lines.splice(0, 1)[0];
                    if (line.includes('_test.js:')) {
                        location = line.split(/[\s@]/).pop();
                        break;
                    }
                }
            }

            if (self.d > 1) {
                console.debug('Testing it %s...', name, location);
            }

            return location;
        };

        const TestResult = class {
            constructor(name, took, location) {
                this.location = location;
                this.message = `${name} \u2714`;
                this.took = performance.now() - took;
            }
        };

        const TestError = class extends MEGAException {
            constructor(name, took, ex) {
                const partial = ex.name === 'NotSupportedError';
                const details = String(ex.stack).includes(ex.message) ? '' : ` (${ex.message})`;
                const status = partial ? `\uD83C\uDF15 (${ex.message})` : `\u2716${details}`;
                super(`${name}: ${status}`, null, ex.name);
                this.stack = ex.stack || this.stack;
                this.color = partial ? 'fd0' : 'f00';
                this.took = performance.now() - took;
                this.soft = partial;
            }
        };

        const promises = [];
        self.it = (testName, testFunc) => {
            promises.push(new Promise((resolve, reject) => {
                const location = getTestLocation(testName);
                const tn = 6000;
                const ts = performance.now();
                const th = setTimeout(() => {
                    const ex = new MEGAException(`Timeout of ${tn}ms exceeded.`, 'TimeoutError');
                    reject(new TestError(testName, ts, ex));
                }, tn);

                Promise.resolve((async() => testFunc())())
                    .then(() => {
                        resolve(new TestResult(testName, ts, location));
                    })
                    .catch((ex) => {
                        reject(new TestError(testName, ts, ex));
                    })
                    .finally(() => clearTimeout(th));
            }));
        };

        // eslint-disable-next-line guard-for-in
        for (const name in storage[currentFile]) {
            console.group(name);
            console.time(name);

            storage[currentFile][name]();
            const res = await Promise.allSettled(promises);

            for (let i = 0; i < res.length; ++i) {
                const {value, reason} = res[i];
                const result = reason || value;
                const color = result.color || '0f0';
                const took = parseFloat(result.took).toFixed(2);
                const details = `${reason && !reason.soft ? reason.stack || reason : result.location || ''}`;
                console.log('%c%s %c%sms', `color:#${color}`, result.message, 'color:#abc', took, details);
            }
            console.timeEnd(name);
            console.groupEnd();
            promises.length = 0;
        }

        resolve();
        self.it = null;
    });
});

mBroadcaster.once('startMega', async() => {
    'use strict';

    console.group('[DEBUG] ' + new Date().toISOString());
    console.table({apipath, staticpath, bootstaticpath, cmsStaticPath, defaultStaticPath, defaultCMSStaticPath});
    console.table(staticServerLoading);

    if (d && window.chrome) {
        var usages = Object.create(null);
        var createObjectURL = URL.createObjectURL;
        var revokeObjectURL = URL.revokeObjectURL;

        URL.createObjectURL = function() {
            var stackIdx = 2;
            var stack = M.getStack().split('\n');
            var result = createObjectURL.apply(URL, arguments);

            for (var i = stack.length; i--;) {
                if (stack[i].indexOf('createObjectURL') > 0) {
                    stackIdx = i;
                    break;
                }
            }

            usages[result] = {
                r: 0,
                ts: Date.now(),
                id: MurmurHash3(result, -0x7f000e0),
                stack: stack.splice(stackIdx)
            };

            return result;
        };

        URL.revokeObjectURL = function(objectURL) {
            var result = revokeObjectURL.apply(URL, arguments);

            delete usages[objectURL];
            return result;
        };

        var intv = 60000 / +d;
        setInterval(function() {
            var now = Date.now();
            var known = [
                '1:setUserAvatar', '1:previewimg', '1:procfa', '2:procfa', '3:addScript', '1:MediaElementWrapper',
                '2:chatImageParser', '2:initall', '3:initall', '2:MEGAWorkerController'
            ];
            // ^ think twice before whitelisting anything new here...

            for (var uri in usages) {
                var data = usages[uri];

                if ((now - data.ts) > intv) {
                    var warn = true;

                    for (var i = known.length; i--;) {
                        var k = known[i].split(':');

                        if (String(data.stack[k[0]]).indexOf(k[1]) !== -1) {
                            warn = false;
                            break;
                        }
                    }

                    if (warn && !(data.r++ % 10)) {
                        console.warn("[$%s] a call to createObjectURL was not revoked"
                            + " in too long, possible memory leak?", data.id.toString(16), uri, data);
                    }
                }
            }
        }, intv * 1.5);

        window.createObjectURLUsages = usages;
    }

    console.groupEnd();
});
