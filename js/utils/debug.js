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

function tryCatch(func, onerror) {
    'use strict';
    const sml = Symbol('__tryCatcher__');

    func[sml] = function __tryCatcher() {
        // eslint-disable-next-line local-rules/hints
        try {
            return func.apply(this, arguments);
        }
        catch (ex) {
            if (onerror !== false) {
                console.error(ex);
            }

            if (typeof onerror === 'function') {
                onIdle(onerror.bind(null, ex));
            }
        }
    };
    func[sml][Symbol('__function__')] = func;
    return func[sml];
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
                '1:setUserAvatar', '1:previewimg', '1:onload', '2:onload', '3:procfa', '3:addScript',
                '1:MediaElementWrapper', '2:chatImageParser', '2:initall', '3:initall', '2:MEGAWorkerController'
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

mBroadcaster.once('boot_done', function radSetup() {
    'use strict';

    const exclude = is_mobile || is_karma || is_litesite || is_iframed || localStorage.norad || !is_livesite;
    if (exclude && !sessionStorage.rad) {
        return;
    }

    if (typeof mega.flags !== 'object') {
        mBroadcaster.once('global-mega-flags', radSetup);
        return;
    }

    const rad = parseInt(mega.flags.rad || sessionStorage.rad);

    if (!rad) {
        if (mega.flags.rad === 0) {
            delete localStorage.d;
            delete localStorage.minLogLevel;
        }
        if (!window.u_sid) {
            mBroadcaster.once('login2', radSetup);
        }
        return;
    }

    localStorage.d = d |= 1;
    localStorage.minLogLevel |= 0;

    let idb, pfx;
    let indent = 0;
    const buffer = new Set();
    const jsonp = tryCatch((...o) => JSON.stringify(...o), false);

    const toString = (v) => (v = Object(v)) && Reflect.has(v, 'toString') && v.toString() || 'Object';
    const toStringTag = (v) => v && (v[Symbol.toStringTag] || v.name);
    const toPropertyName = (v) => toStringTag(v) || v && toStringTag(v.constructor) || toString(v);
    const toPropertyValue = (name, v) => {
        if (name === 'Event') {
            return `{${v.type},${toPropertyName(v.target)}}`;
        }
        const num = Number('byteLength' in v ? v.byteLength : 'length' in v ? v.length : 'size' in v ? v.size : NaN);
        return num >= 0 ? num : toString(v);
    };
    const serialize = tryCatch((value, name) => {
        name = String(name || toPropertyName(value));
        if (name) {
            value = String(toPropertyValue(name, value));
            if (value[0] === '[') {
                value = value.replace(/^\[object\s*|]$/g, '');
            }
            return name === value ? name : `${name}(${value})`;
        }
    }, false);

    const stringify = tryCatch((value) => {
        const type = typeof value;

        if (type !== 'string') {
            if (value && type === 'object') {
                const name = toPropertyName(value);

                if (name === 'Array') {
                    if (value.length > 8) {
                        value = [...value];
                        value.splice(8, Infinity, '\u2026');
                    }
                    value = `Array[${value.map(stringify).join(';')}]`;
                }
                else if (name === 'Object') {
                    let max = 7;
                    const srz = [];
                    for (const p in value) {
                        if (!--max) {
                            srz.push('\u2026');
                            break;
                        }
                        const v = value[p];
                        const t = typeof v;
                        srz.push(`${p}:${t === 'object' && serialize(v) || (t === 'function' ? v.name : v)}`);
                    }
                    value = `Object{${srz.join(';')}}`;
                }
                else {
                    value = serialize(value, name) || '\u2753';
                }
            }
            else if (type === 'function') {
                value = `${type}(${value.name})`;
            }
            else {
                value = value === undefined ? 'undefined' : `${type}(${value})`;
            }
        }

        return value;
    }, false);

    const argp = (args = [], name = null) => {
        args = [...args];
        const type = typeof args[0];

        if (type === 'string') {
            args.unshift(
                args.shift().replace(/%[Ocdfios]/g, (m) => {
                    if (m === '%s') {
                        return String(args.shift());
                    }
                    else if (m === '%o' || m === '%O') {
                        return jsonp(args.shift());
                    }
                    else if (m === '%f') {
                        return parseFloat(args.shift()).toFixed(6);
                    }
                    else if (m === '%c') {
                        args.shift();
                        return '';
                    }

                    return parseInt(args.shift());
                })
            );
        }
        else if (type === 'object') {
            args[0] = jsonp(args[0]) || args[0];
        }

        for (let i = args.length; i--;) {
            args[i] = stringify(args[i]);
        }

        if (name) {
            name = name.toUpperCase();
            if (indent) {
                args.unshift(name);
                if (pfx) {
                    args.unshift(`[${pfx}]`);
                }
            }
            else {
                if (pfx) {
                    args.unshift(`[${pfx}]`);
                }
                args.unshift(name.padStart(9));
            }
        }
        else if (pfx) {
            args.unshift(`[${pfx}]`);
        }
        args = args.join(' ');

        if (indent > 0) {
            const ps = Array(indent + 1).join('\u00B7');
            args = args.split('\n').map(ln => `${ps.padStart(9)} ${ln}`).join('\n');
        }

        return args.replace(/[\w-]{31,}/g, "\u2026");
    };

    const flush = async() => {
        const db = idb || (idb = await flush.db);
        if (buffer.size) {
            const bump = [...buffer];
            buffer.clear();
            await db.set(`${Date.now().toString(36)}.${bump.length}`, flush.tx.encode(`${bump.join('\n')}\n`));
        }
        return db;
    };
    lazy(flush, 'tx', () => new TextEncoder());
    lazy(flush, 'db', () => LRUMegaDexie.create('rad.log', {limit: 9e3, pfx: '$rad'}));

    const log = (name, args) => {
        if (typeof args === 'string') {
            args = [args];
        }
        buffer.add(argp(args, name));

        if (buffer.size > 400) {
            flush().catch(dump);
        }
    };

    const handlers = {
        table(name, args) {
            log(name, [jsonp(args[0], null, 4)]);
        },
        group(name, args) {
            ++indent;
            log(name, args);
        },
        groupEnd() {
            --indent;
        },
        assert(name, args) {
            if (!args[0]) {
                if (args.length < 2) {
                    args = [0, `${new Error('Failed assertion.').stack}`];
                }
                log(name, args.slice(1));
            }
        }
    };

    'debug,error,info,log,warn,table,group,groupEnd,assert'
        .split(',')
        .map(tryCatch((fn) => {
            const gConsoleMethod = console[fn];
            const mConsoleWrapper = handlers[fn] || log;

            console[fn] = tryCatch((...args) => {
                mConsoleWrapper(fn, args);
                return gConsoleMethod.apply(console, args);
            }, false);
        }));

    log('----');
    log('MEGA', `Starting RAD Session, ${new Date().toISOString()}`);

    mBroadcaster.once('crossTab:setup', (master) => {
        if (!master) {
            const {ctID} = mBroadcaster.crossTab;
            pfx = (ctID >>> 0).toString(36);

            const buf = [...buffer];
            buffer.clear();

            for (let i = 0; i < buf.length; ++i) {
                const p = buf[i].split(/^(\s+\w+)/);
                p.splice(2, 0, ` [${pfx}]`);
                buffer.add(p.join(''));
            }
        }
    });

    mBroadcaster.addListener('crossTab:master', () => {
        if (pfx) {
            const pid = pfx;
            const {master, slaves} = mBroadcaster.crossTab;
            pfx = null;
            log('CROSSTAB', `Ownership (was '${pid}'), ${master}<>${slaves.map(s => (s >>> 0).toString(36))}`);
            flush().catch(dump);
        }
    });

    mBroadcaster.addListener('crossTab:slave', (id) => {
        const {master, slaves} = mBroadcaster.crossTab;
        id = (id >>> 0).toString(36);
        log('CROSSTAB', `New tab with id:${id}, ${master}<>${slaves.map(s => (s >>> 0).toString(36))}`);
        flush().catch(dump);
    });

    document.addEventListener('visibilitychange', () => {
        log('VSBY', `${new Date().toISOString()} ${document.visibilityState}`);
        flush().catch(dump);
    });

    window.addEventListener('error', (ev) => {
        let error = ev.error || ev.message || !1;

        if (error.stack) {
            error = `${error}${String(error.stack).replace(ev.message, '')}`;
        }

        log('UNCAUGHT', `Exception, ${error}`);
        flush().catch(dump);
    });

    window.addEventListener("unhandledrejection", (ev) => {
        log('UNCAUGHT', `Promise Rejection, ${ev.reason}`);
        flush().catch(dump);
    });

    setTimeout(function setup() {
        M.onFileManagerReady(flush);
        console.info('%cretroactive-logging enabled.', 'font: 18px LatoWebBold');

        const exporter = async(ev) => {
            const cn = 'block-loading-spinner';
            const cl = ev.target.classList;
            if (!cl.contains(cn)) {
                cl.add(cn, 'sprite-fm-theme');
                await mega.rad.export().catch(dump);
                cl.remove(cn, 'sprite-fm-theme');
            }
        };

        for (const elm of document.querySelectorAll('.top-mega-version')) {
            if (!elm.nextElementSibling || elm.nextElementSibling.nodeName === 'BUTTON') {
                elm.after(parseHTML('<div class="block-null-spinner icon-loading-spinner">\u33D2&#127917;</div>'));
                elm.nextElementSibling.addEventListener('click', exporter);
            }
        }

        if (!window.u_sid) {
            mBroadcaster.once('login2', () => M.onFileManagerReady(setup));
        }

    }, 7e3);

    /** @property mega.rad */
    lazy(mega, 'rad', () => {
        const rad = Object.getOwnPropertyDescriptors({
            log,
            flush,
            drop: async() => {
                const db = await flush();
                return db.delete();
            },
            export: async(save = true, compress = true) => {
                const chunks = [];
                const filename = `rad-${new Date().toISOString().replace(/\D/g, '')}.log`;
                console.info(`RAD Export to "${filename}"`);

                const db = await flush();
                if (db instanceof LRUMegaDexie) {
                    await db.data.orderBy('ts').each(({data}) => chunks.push(data));

                    for (let i = chunks.length; i--;) {
                        chunks[i] = await db.decrypt(chunks[i]);
                    }
                }
                else {
                    chunks.push(...[...db.values()]);
                }

                const blob = new Blob(chunks);
                const data = compress && await M.compress(blob).catch(nop);

                const args = [data || blob, data ? `${filename}.gz` : filename];
                return save ? M.saveAs(...args) : args;
            }
        });

        return Object.freeze(Object.setPrototypeOf(Object.defineProperties(rad, rad), null));
    });
});
