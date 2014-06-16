/*
 * Curve 25519-based cryptography collection.
 *
 * EC Diffie-Hellman (ECDH) based on Curve25519 and digital signatures (EdDSA)
 * based on Ed25519.
 * 
 * Copyright (c) 2012 Ron Garret
 * Copyright (c) 2007, 2013, 2014 Michele Bini
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * You should have received a copy of the license along with this program.
 */
// See https://github.com/jrburke/almond#exporting-a-public-api
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // Allow using this built library as an AMD module
        // in another project. That other project will only
        // see this AMD call, not the internal modules in
        // the closure below.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Allow using this built library as a CommonJS module
        module.exports = factory();
    } else {
        // Browser globals case. Just assign the
        // result to a property on the global.
        root.jodid25519 = factory();
    }
}(this, function () {
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

;
define("asmcrypto", (function (global) {
    return function () {
        var ret, fn;
       fn = function () {
                return asmCrypto;
            };
        ret = fn.apply(global, arguments);
        return ret || global.asmcrypto;
    };
}(this)));

/**
 * @fileOverview
 * Core operations on curve 25519 required for the higher level modules.
 */

/*
 * Copyright (c) 2007, 2013, 2014 Michele Bini
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss, Michele Bini
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519/core',[
    "asmcrypto",
], function(asmCrypto) {
    

    /**
     * @exports jodid25519/core
     * Core operations on curve 25519 required for the higher level modules.
     *
     * @description
     * Core operations on curve 25519 required for the higher level modules.
     *
     * <p>
     * This core code is extracted from Michele Bini's curve255.js implementation,
     * which is used as a base for Curve25519 ECDH and Ed25519 EdDSA operations.
     * </p>
     */
    var ns = {};

    function _setbit(n, c, v) {
        var i = c >> 4;
        var a = n[i];
        a = a + (1 << (c & 0xf)) * v;
        n[i] = a;
    }

    function _getbit(n, c) {
        return (n[c >> 4] >> (c & 0xf)) & 1;
    }

    function _ZERO() {
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    function _ONE() {
        return [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    // Basepoint.
    function _BASE() {
        return [9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
 
    // return -1, 0, +1 when a is less than, equal, or greater than b
    function _bigintcmp(a, b) {
        // The following code is a bit tricky to avoid code branching
        var c, abs_r, mask;
        var r = 0;
        for (c = 15; c >= 0; c--) {
            var x = a[c];
            var y = b[c];
            r = r + (x - y) * (1 - r * r);
            // http://graphics.stanford.edu/~seander/bithacks.html#IntegerAbs
            // correct for [-294967295, 294967295]
            mask = r >> 31;
            abs_r = (r + mask) ^ mask;
            // http://stackoverflow.com/questions/596467/how-do-i-convert-a-number-to-an-integer-in-javascript
            // this rounds towards zero
            r = ~~((r << 1) / (abs_r + 1));
        }
        return r;
    }
 
    function _bigintadd(a, b) {
        var r = [];
        var v;
        r[0] = (v = a[0] + b[0]) & 0xffff;
        r[1] = (v = (v >>> 16) + a[1] + b[1]) & 0xffff;
        r[2] = (v = (v >>> 16) + a[2] + b[2]) & 0xffff;
        r[3] = (v = (v >>> 16) + a[3] + b[3]) & 0xffff;
        r[4] = (v = (v >>> 16) + a[4] + b[4]) & 0xffff;
        r[5] = (v = (v >>> 16) + a[5] + b[5]) & 0xffff;
        r[6] = (v = (v >>> 16) + a[6] + b[6]) & 0xffff;
        r[7] = (v = (v >>> 16) + a[7] + b[7]) & 0xffff;
        r[8] = (v = (v >>> 16) + a[8] + b[8]) & 0xffff;
        r[9] = (v = (v >>> 16) + a[9] + b[9]) & 0xffff;
        r[10] = (v = (v >>> 16) + a[10] + b[10]) & 0xffff;
        r[11] = (v = (v >>> 16) + a[11] + b[11]) & 0xffff;
        r[12] = (v = (v >>> 16) + a[12] + b[12]) & 0xffff;
        r[13] = (v = (v >>> 16) + a[13] + b[13]) & 0xffff;
        r[14] = (v = (v >>> 16) + a[14] + b[14]) & 0xffff;
        r[15] = (v >>> 16) + a[15] + b[15];
        return r;
    }
 
    function _bigintsub(a, b) {
        var r = [];
        var v;
        r[0] = (v = 0x80000 + a[0] - b[0]) & 0xffff;
        r[1] = (v = (v >>> 16) + 0x7fff8 + a[1] - b[1]) & 0xffff;
        r[2] = (v = (v >>> 16) + 0x7fff8 + a[2] - b[2]) & 0xffff;
        r[3] = (v = (v >>> 16) + 0x7fff8 + a[3] - b[3]) & 0xffff;
        r[4] = (v = (v >>> 16) + 0x7fff8 + a[4] - b[4]) & 0xffff;
        r[5] = (v = (v >>> 16) + 0x7fff8 + a[5] - b[5]) & 0xffff;
        r[6] = (v = (v >>> 16) + 0x7fff8 + a[6] - b[6]) & 0xffff;
        r[7] = (v = (v >>> 16) + 0x7fff8 + a[7] - b[7]) & 0xffff;
        r[8] = (v = (v >>> 16) + 0x7fff8 + a[8] - b[8]) & 0xffff;
        r[9] = (v = (v >>> 16) + 0x7fff8 + a[9] - b[9]) & 0xffff;
        r[10] = (v = (v >>> 16) + 0x7fff8 + a[10] - b[10]) & 0xffff;
        r[11] = (v = (v >>> 16) + 0x7fff8 + a[11] - b[11]) & 0xffff;
        r[12] = (v = (v >>> 16) + 0x7fff8 + a[12] - b[12]) & 0xffff;
        r[13] = (v = (v >>> 16) + 0x7fff8 + a[13] - b[13]) & 0xffff;
        r[14] = (v = (v >>> 16) + 0x7fff8 + a[14] - b[14]) & 0xffff;
        r[15] = (v >>> 16) - 8 + a[15] - b[15];
        return r;
    }
 
    function _sqr8h(a7, a6, a5, a4, a3, a2, a1, a0) {
        // 'division by 0x10000' can not be replaced by '>> 16' because
        // more than 32 bits of precision are needed similarly
        // 'multiplication by 2' cannot be replaced by '<< 1'
        var r = [];
        var v;
        r[0] = (v = a0 * a0) & 0xffff;
        r[1] = (v = (0 | (v / 0x10000)) + 2 * a0 * a1) & 0xffff;
        r[2] = (v = (0 | (v / 0x10000)) + 2 * a0 * a2 + a1 * a1) & 0xffff;
        r[3] = (v = (0 | (v / 0x10000)) + 2 * a0 * a3 + 2 * a1 * a2) & 0xffff;
        r[4] = (v = (0 | (v / 0x10000)) + 2 * a0 * a4 + 2 * a1 * a3 + a2
                    * a2) & 0xffff;
        r[5] = (v = (0 | (v / 0x10000)) + 2 * a0 * a5 + 2 * a1 * a4 + 2
                    * a2 * a3) & 0xffff;
        r[6] = (v = (0 | (v / 0x10000)) + 2 * a0 * a6 + 2 * a1 * a5 + 2
                    * a2 * a4 + a3 * a3) & 0xffff;
        r[7] = (v = (0 | (v / 0x10000)) + 2 * a0 * a7 + 2 * a1 * a6 + 2
                    * a2 * a5 + 2 * a3 * a4) & 0xffff;
        r[8] = (v = (0 | (v / 0x10000)) + 2 * a1 * a7 + 2 * a2 * a6 + 2
                    * a3 * a5 + a4 * a4) & 0xffff;
        r[9] = (v = (0 | (v / 0x10000)) + 2 * a2 * a7 + 2 * a3 * a6 + 2
                    * a4 * a5) & 0xffff;
        r[10] = (v = (0 | (v / 0x10000)) + 2 * a3 * a7 + 2 * a4 * a6
                     + a5 * a5) & 0xffff;
        r[11] = (v = (0 | (v / 0x10000)) + 2 * a4 * a7 + 2 * a5 * a6) & 0xffff;
        r[12] = (v = (0 | (v / 0x10000)) + 2 * a5 * a7 + a6 * a6) & 0xffff;
        r[13] = (v = (0 | (v / 0x10000)) + 2 * a6 * a7) & 0xffff;
        r[14] = (v = (0 | (v / 0x10000)) + a7 * a7) & 0xffff;
        r[15] = 0 | (v / 0x10000);
        return r;
    }
 
    function _sqrmodp(a) {
        var x = _sqr8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9],
                       a[8]);
        var z = _sqr8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0]);
        var y = _sqr8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12]
                                                                 + a[4],
                       a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8]
                                                                + a[0]);
        var r = [];
        var v;
        r[0] = (v = 0x800000 + z[0] + (y[8] - x[8] - z[8] + x[0] - 0x80)
                    * 38) & 0xffff;
        r[1] = (v = 0x7fff80 + (v >>> 16) + z[1]
                    + (y[9] - x[9] - z[9] + x[1]) * 38) & 0xffff;
        r[2] = (v = 0x7fff80 + (v >>> 16) + z[2]
                    + (y[10] - x[10] - z[10] + x[2]) * 38) & 0xffff;
        r[3] = (v = 0x7fff80 + (v >>> 16) + z[3]
                    + (y[11] - x[11] - z[11] + x[3]) * 38) & 0xffff;
        r[4] = (v = 0x7fff80 + (v >>> 16) + z[4]
                    + (y[12] - x[12] - z[12] + x[4]) * 38) & 0xffff;
        r[5] = (v = 0x7fff80 + (v >>> 16) + z[5]
                    + (y[13] - x[13] - z[13] + x[5]) * 38) & 0xffff;
        r[6] = (v = 0x7fff80 + (v >>> 16) + z[6]
                    + (y[14] - x[14] - z[14] + x[6]) * 38) & 0xffff;
        r[7] = (v = 0x7fff80 + (v >>> 16) + z[7]
                    + (y[15] - x[15] - z[15] + x[7]) * 38) & 0xffff;
        r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] - x[0] - z[0]
                    + x[8] * 38) & 0xffff;
        r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] - x[1] - z[1]
                    + x[9] * 38) & 0xffff;
        r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] - x[2] - z[2]
                     + x[10] * 38) & 0xffff;
        r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] - x[3] - z[3]
                     + x[11] * 38) & 0xffff;
        r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] - x[4] - z[4]
                     + x[12] * 38) & 0xffff;
        r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] - x[5] - z[5]
                     + x[13] * 38) & 0xffff;
        r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] - x[6] - z[6]
                     + x[14] * 38) & 0xffff;
        r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] - x[7] - z[7]
                + x[15] * 38;
        _reduce(r);
        return r;
    }
 
    function _mul8h(a7, a6, a5, a4, a3, a2, a1, a0, b7, b6, b5, b4, b3,
                    b2, b1, b0) {
        // 'division by 0x10000' can not be replaced by '>> 16' because
        // more than 32 bits of precision are needed
        var r = [];
        var v;
        r[0] = (v = a0 * b0) & 0xffff;
        r[1] = (v = (0 | (v / 0x10000)) + a0 * b1 + a1 * b0) & 0xffff;
        r[2] = (v = (0 | (v / 0x10000)) + a0 * b2 + a1 * b1 + a2 * b0) & 0xffff;
        r[3] = (v = (0 | (v / 0x10000)) + a0 * b3 + a1 * b2 + a2 * b1
                    + a3 * b0) & 0xffff;
        r[4] = (v = (0 | (v / 0x10000)) + a0 * b4 + a1 * b3 + a2 * b2
                    + a3 * b1 + a4 * b0) & 0xffff;
        r[5] = (v = (0 | (v / 0x10000)) + a0 * b5 + a1 * b4 + a2 * b3
                    + a3 * b2 + a4 * b1 + a5 * b0) & 0xffff;
        r[6] = (v = (0 | (v / 0x10000)) + a0 * b6 + a1 * b5 + a2 * b4
                    + a3 * b3 + a4 * b2 + a5 * b1 + a6 * b0) & 0xffff;
        r[7] = (v = (0 | (v / 0x10000)) + a0 * b7 + a1 * b6 + a2 * b5
                    + a3 * b4 + a4 * b3 + a5 * b2 + a6 * b1 + a7 * b0) & 0xffff;
        r[8] = (v = (0 | (v / 0x10000)) + a1 * b7 + a2 * b6 + a3 * b5
                    + a4 * b4 + a5 * b3 + a6 * b2 + a7 * b1) & 0xffff;
        r[9] = (v = (0 | (v / 0x10000)) + a2 * b7 + a3 * b6 + a4 * b5
                    + a5 * b4 + a6 * b3 + a7 * b2) & 0xffff;
        r[10] = (v = (0 | (v / 0x10000)) + a3 * b7 + a4 * b6 + a5 * b5
                     + a6 * b4 + a7 * b3) & 0xffff;
        r[11] = (v = (0 | (v / 0x10000)) + a4 * b7 + a5 * b6 + a6 * b5
                     + a7 * b4) & 0xffff;
        r[12] = (v = (0 | (v / 0x10000)) + a5 * b7 + a6 * b6 + a7 * b5) & 0xffff;
        r[13] = (v = (0 | (v / 0x10000)) + a6 * b7 + a7 * b6) & 0xffff;
        r[14] = (v = (0 | (v / 0x10000)) + a7 * b7) & 0xffff;
        r[15] = (0 | (v / 0x10000));
        return r;
    }
 
    function _mulmodp(a, b) {
        // Karatsuba multiplication scheme: x*y = (b^2+b)*x1*y1 -
        // b*(x1-x0)*(y1-y0) + (b+1)*x0*y0
        var x = _mul8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9],
                       a[8], b[15], b[14], b[13], b[12], b[11], b[10],
                       b[9], b[8]);
        var z = _mul8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0],
                       b[7], b[6], b[5], b[4], b[3], b[2], b[1], b[0]);
        var y = _mul8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12]
                                                                 + a[4],
                       a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8]
                                                                + a[0],
                       b[15] + b[7], b[14] + b[6], b[13] + b[5], b[12]
                                                                 + b[4],
                       b[11] + b[3], b[10] + b[2], b[9] + b[1], b[8]
                                                                + b[0]);
        var r = [];
        var v;
        r[0] = (v = 0x800000 + z[0] + (y[8] - x[8] - z[8] + x[0] - 0x80)
                    * 38) & 0xffff;
        r[1] = (v = 0x7fff80 + (v >>> 16) + z[1]
                    + (y[9] - x[9] - z[9] + x[1]) * 38) & 0xffff;
        r[2] = (v = 0x7fff80 + (v >>> 16) + z[2]
                    + (y[10] - x[10] - z[10] + x[2]) * 38) & 0xffff;
        r[3] = (v = 0x7fff80 + (v >>> 16) + z[3]
                    + (y[11] - x[11] - z[11] + x[3]) * 38) & 0xffff;
        r[4] = (v = 0x7fff80 + (v >>> 16) + z[4]
                    + (y[12] - x[12] - z[12] + x[4]) * 38) & 0xffff;
        r[5] = (v = 0x7fff80 + (v >>> 16) + z[5]
                    + (y[13] - x[13] - z[13] + x[5]) * 38) & 0xffff;
        r[6] = (v = 0x7fff80 + (v >>> 16) + z[6]
                    + (y[14] - x[14] - z[14] + x[6]) * 38) & 0xffff;
        r[7] = (v = 0x7fff80 + (v >>> 16) + z[7]
                    + (y[15] - x[15] - z[15] + x[7]) * 38) & 0xffff;
        r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] - x[0] - z[0]
                    + x[8] * 38) & 0xffff;
        r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] - x[1] - z[1]
                    + x[9] * 38) & 0xffff;
        r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] - x[2] - z[2]
                     + x[10] * 38) & 0xffff;
        r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] - x[3] - z[3]
                     + x[11] * 38) & 0xffff;
        r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] - x[4] - z[4]
                     + x[12] * 38) & 0xffff;
        r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] - x[5] - z[5]
                     + x[13] * 38) & 0xffff;
        r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] - x[6] - z[6]
                     + x[14] * 38) & 0xffff;
        r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] - x[7] - z[7]
                + x[15] * 38;
        _reduce(r);
        return r;
    }
    
    function _reduce(arr) {
        var aCopy = arr.slice(0);
        var choice = [arr, aCopy];
        var v = arr[15];
        // Use the dummy copy instead of just returning to be more constant time.
        var a = choice[(v < 0x8000) & 1];
        a[15] = v & 0x7fff;
        // >32-bits of precision are required here so '/ 0x8000' can not be
        // replaced by the arithmetic equivalent '>>> 15'
        v = (0 | (v / 0x8000)) * 19;
        a[0] = (v += a[0]) & 0xffff;
        v = v >>> 16;
        a[1] = (v += a[1]) & 0xffff;
        v = v >>> 16;
        a[2] = (v += a[2]) & 0xffff;
        v = v >>> 16;
        a[3] = (v += a[3]) & 0xffff;
        v = v >>> 16;
        a[4] = (v += a[4]) & 0xffff;
        v = v >>> 16;
        a[5] = (v += a[5]) & 0xffff;
        v = v >>> 16;
        a[6] = (v += a[6]) & 0xffff;
        v = v >>> 16;
        a[7] = (v += a[7]) & 0xffff;
        v = v >>> 16;
        a[8] = (v += a[8]) & 0xffff;
        v = v >>> 16;
        a[9] = (v += a[9]) & 0xffff;
        v = v >>> 16;
        a[10] = (v += a[10]) & 0xffff;
        v = v >>> 16;
        a[11] = (v += a[11]) & 0xffff;
        v = v >>> 16;
        a[12] = (v += a[12]) & 0xffff;
        v = v >>> 16;
        a[13] = (v += a[13]) & 0xffff;
        v = v >>> 16;
        a[14] = (v += a[14]) & 0xffff;
        v = v >>> 16;
        a[15] += v;
    }
 
    function _addmodp(a, b) {
        var r = [];
        var v;
        r[0] = (v = ((0 | (a[15] >>> 15)) + (0 | (b[15] >>> 15))) * 19
                    + a[0] + b[0]) & 0xffff;
        r[1] = (v = (v >>> 16) + a[1] + b[1]) & 0xffff;
        r[2] = (v = (v >>> 16) + a[2] + b[2]) & 0xffff;
        r[3] = (v = (v >>> 16) + a[3] + b[3]) & 0xffff;
        r[4] = (v = (v >>> 16) + a[4] + b[4]) & 0xffff;
        r[5] = (v = (v >>> 16) + a[5] + b[5]) & 0xffff;
        r[6] = (v = (v >>> 16) + a[6] + b[6]) & 0xffff;
        r[7] = (v = (v >>> 16) + a[7] + b[7]) & 0xffff;
        r[8] = (v = (v >>> 16) + a[8] + b[8]) & 0xffff;
        r[9] = (v = (v >>> 16) + a[9] + b[9]) & 0xffff;
        r[10] = (v = (v >>> 16) + a[10] + b[10]) & 0xffff;
        r[11] = (v = (v >>> 16) + a[11] + b[11]) & 0xffff;
        r[12] = (v = (v >>> 16) + a[12] + b[12]) & 0xffff;
        r[13] = (v = (v >>> 16) + a[13] + b[13]) & 0xffff;
        r[14] = (v = (v >>> 16) + a[14] + b[14]) & 0xffff;
        r[15] = (v >>> 16) + (a[15] & 0x7fff) + (b[15] & 0x7fff);
        return r;
    }
 
    function _submodp(a, b) {
        var r = [];
        var v;
        r[0] = (v = 0x80000
                    + ((0 | (a[15] >>> 15)) - (0 | (b[15] >>> 15)) - 1)
                    * 19 + a[0] - b[0]) & 0xffff;
        r[1] = (v = (v >>> 16) + 0x7fff8 + a[1] - b[1]) & 0xffff;
        r[2] = (v = (v >>> 16) + 0x7fff8 + a[2] - b[2]) & 0xffff;
        r[3] = (v = (v >>> 16) + 0x7fff8 + a[3] - b[3]) & 0xffff;
        r[4] = (v = (v >>> 16) + 0x7fff8 + a[4] - b[4]) & 0xffff;
        r[5] = (v = (v >>> 16) + 0x7fff8 + a[5] - b[5]) & 0xffff;
        r[6] = (v = (v >>> 16) + 0x7fff8 + a[6] - b[6]) & 0xffff;
        r[7] = (v = (v >>> 16) + 0x7fff8 + a[7] - b[7]) & 0xffff;
        r[8] = (v = (v >>> 16) + 0x7fff8 + a[8] - b[8]) & 0xffff;
        r[9] = (v = (v >>> 16) + 0x7fff8 + a[9] - b[9]) & 0xffff;
        r[10] = (v = (v >>> 16) + 0x7fff8 + a[10] - b[10]) & 0xffff;
        r[11] = (v = (v >>> 16) + 0x7fff8 + a[11] - b[11]) & 0xffff;
        r[12] = (v = (v >>> 16) + 0x7fff8 + a[12] - b[12]) & 0xffff;
        r[13] = (v = (v >>> 16) + 0x7fff8 + a[13] - b[13]) & 0xffff;
        r[14] = (v = (v >>> 16) + 0x7fff8 + a[14] - b[14]) & 0xffff;
        r[15] = (v >>> 16) + 0x7ff8 + (a[15] & 0x7fff)
                - (b[15] & 0x7fff);
        return r;
    }
 
    function _invmodp(a) {
        var c = a;
        var i = 250;
        while (--i) {
            a = _sqrmodp(a);
            a = _mulmodp(a, c);
        }
        a = _sqrmodp(a);
        a = _sqrmodp(a);
        a = _mulmodp(a, c);
        a = _sqrmodp(a);
        a = _sqrmodp(a);
        a = _mulmodp(a, c);
        a = _sqrmodp(a);
        a = _mulmodp(a, c);
        return a;
    }
 
    function _mulasmall(a) {
        // 'division by 0x10000' can not be replaced by '>> 16' because
        // more than 32 bits of precision are needed
        var m = 121665;
        var r = [];
        var v;
        r[0] = (v = a[0] * m) & 0xffff;
        r[1] = (v = (0 | (v / 0x10000)) + a[1] * m) & 0xffff;
        r[2] = (v = (0 | (v / 0x10000)) + a[2] * m) & 0xffff;
        r[3] = (v = (0 | (v / 0x10000)) + a[3] * m) & 0xffff;
        r[4] = (v = (0 | (v / 0x10000)) + a[4] * m) & 0xffff;
        r[5] = (v = (0 | (v / 0x10000)) + a[5] * m) & 0xffff;
        r[6] = (v = (0 | (v / 0x10000)) + a[6] * m) & 0xffff;
        r[7] = (v = (0 | (v / 0x10000)) + a[7] * m) & 0xffff;
        r[8] = (v = (0 | (v / 0x10000)) + a[8] * m) & 0xffff;
        r[9] = (v = (0 | (v / 0x10000)) + a[9] * m) & 0xffff;
        r[10] = (v = (0 | (v / 0x10000)) + a[10] * m) & 0xffff;
        r[11] = (v = (0 | (v / 0x10000)) + a[11] * m) & 0xffff;
        r[12] = (v = (0 | (v / 0x10000)) + a[12] * m) & 0xffff;
        r[13] = (v = (0 | (v / 0x10000)) + a[13] * m) & 0xffff;
        r[14] = (v = (0 | (v / 0x10000)) + a[14] * m) & 0xffff;
        r[15] = (0 | (v / 0x10000)) + a[15] * m;
        _reduce(r);
        return r;
    }
 
    function _dbl(x, z) {
        var x_2, z_2, m, n, o;
        m = _sqrmodp(_addmodp(x, z));
        n = _sqrmodp(_submodp(x, z));
        o = _submodp(m, n);
        x_2 = _mulmodp(n, m);
        z_2 = _mulmodp(_addmodp(_mulasmall(o), m), o);
        return [x_2, z_2];
    }
 
    function _sum(x, z, x_p, z_p, x_1) {
        var x_3, z_3, p, q;
        p = _mulmodp(_submodp(x, z), _addmodp(x_p, z_p));
        q = _mulmodp(_addmodp(x, z), _submodp(x_p, z_p));
        x_3 = _sqrmodp(_addmodp(p, q));
        z_3 = _mulmodp(_sqrmodp(_submodp(p, q)), x_1);
        return [x_3, z_3];
    }
    
    function _generateKey() {
        var buffer = new Uint8Array(32);
        asmCrypto.getRandomValues(buffer);
        var result = [];
        for (var i = 0; i < buffer.length; i++) {
            result.push(String.fromCharCode(buffer[i]));
        }
        return result.join('');
    }
    
    // Expose some functions to the outside through this name space.
    // Note: This is not part of the public API.
    ns.getbit = _getbit;
    ns.setbit = _setbit;
    ns.invmodp = _invmodp;
    ns.mulmodp = _mulmodp;
    ns.reduce = _reduce;
    ns.dbl = _dbl;
    ns.sum = _sum;
    ns.ZERO = _ZERO;
    ns.ONE = _ONE;
    ns.BASE = _BASE;
    ns.bigintadd = _bigintadd;
    ns.bigintsub = _bigintsub;
    ns.bigintcmp = _bigintcmp;
    ns.mulmodp = _mulmodp;
    ns.sqrmodp = _sqrmodp;
    ns.generateKey = _generateKey;
    
    
    return ns;
});

/**
 * @fileOverview
 * A collection of general utility functions..
 */

/*
 * Copyright (c) 2011, 2012, 2014 Ron Garret
 * Copyright (c) 2007, 2013, 2014 Michele Bini
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss, Michele Bini, Ron Garret
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519/utils',[
    "jodid25519/core",
], function(core) {
    

    /**
     * @exports jodid25519/utils
     * A collection of general utility functions..
     *
     * @description
     * A collection of general utility functions..
     */
    var ns = {};

    var _HEXCHARS = "0123456789abcdef";
    
    function _hexencode(vector) {
        var result = [];
        for (var i = vector.length - 1; i >= 0; i--) {
            var value = vector[i];
            result.push(_HEXCHARS.substr((value >>> 12) & 0x0f, 1));
            result.push(_HEXCHARS.substr((value >>> 8) & 0x0f, 1));
            result.push(_HEXCHARS.substr((value >>> 4) & 0x0f, 1));
            result.push(_HEXCHARS.substr(value & 0x0f, 1));
        }
        return result.join('');
    }
    
    function _hexdecode(vector) {
        var result = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = vector.length - 1, l = 0; i >= 0; i -= 4) {
            result[l] = (_HEXCHARS.indexOf(vector.charAt(i)))
                      | (_HEXCHARS.indexOf(vector.charAt(i - 1)) << 4)
                      | (_HEXCHARS.indexOf(vector.charAt(i - 2)) << 8)
                      | (_HEXCHARS.indexOf(vector.charAt(i - 3)) << 12);
            l++;
        }
        return result;
    }
    
    var _BASE32CHARS = "abcdefghijklmnopqrstuvwxyz234567";
    
    var _BASE32VALUES = (function () {
        var result = {};
        for (var i = 0; i < _BASE32CHARS.length; i++) {
            result[_BASE32CHARS.charAt(i)] = i;
        }
        return result;
    })();
    
    function _base32encode(n) {
        var c;
        var r = "";
        for (c = 0; c < 255; c += 5) {
            r = _BASE32CHARS.substr(core.getbit(n, c)
                                    + (core.getbit(n, c + 1) << 1)
                                    + (core.getbit(n, c + 2) << 2)
                                    + (core.getbit(n, c + 3) << 3)
                                    + (core.getbit(n, c + 4) << 4), 1)
                                    + r;
        }
        return r;
    }
    
    function _base32decode(n) {
        var c = 0;
        var r = core.ZERO();
        var l = n.length;
        for (c = 0; (l > 0) && (c < 255); c += 5) {
            l--;
            var v = _BASE32VALUES[n.substr(l, 1)];
            core.setbit(r, c, v & 1);
            v >>= 1;
            core.setbit(r, c + 1, v & 1);
            v >>= 1;
            core.setbit(r, c + 2, v & 1);
            v >>= 1;
            core.setbit(r, c + 3, v & 1);
            v >>= 1;
            core.setbit(r, c + 4, v & 1);
           }
        return r;
    }
    
    function _map(f, l) {
        var result = new Array(l.length);
        for (var i = 0; i < l.length; i++) {
            result[i] = f(l[i]);
        }
        return result;
    }

    function _chr(n) {
        return String.fromCharCode(n);
    }
    
    function _ord(c) {
        return c.charCodeAt(0);
    }

    function _bytes2string(bytes) {
        return _map(_chr, bytes).join('');
    }

    function _string2bytes(s) {
        return _map(_ord, s);
    }

    
    // Expose some functions to the outside through this name space.
    
    /**
     * Encodes an array of unsigned 8-bit integers to a hex string.
     *
     * @function
     * @param vector {array}
     *     Array containing the byte values.
     * @returns {string}
     *     String containing vector in a hexadecimal representation.
     */
    ns.hexEncode = _hexencode;
    
    
    /**
     * Decodes a hex string to an array of unsigned 8-bit integers.
     *
     * @function
     * @param vector {string}
     *     String containing vector in a hexadecimal representation.
     * @returns {array}
     *     Array containing the byte values.
     */
    ns.hexDecode = _hexdecode;
    
    
    /**
     * Encodes an array of unsigned 8-bit integers using base32 encoding.
     *
     * @function
     * @param vector {array}
     *     Array containing the byte values.
     * @returns {string}
     *     String containing vector in a hexadecimal representation.
     */
    ns.base32encode = _base32encode;
    
    
    /**
     * Decodes a base32 encoded string to an array of unsigned 8-bit integers.
     *
     * @function
     * @param vector {string}
     *     String containing vector in a hexadecimal representation.
     * @returns {array}
     *     Array containing the byte values.
     */
    ns.base32decode = _base32decode;
    
    
    /**
     * Converts an unsigned 8-bit integer array representation to a byte string.
     *
     * @function
     * @param vector {array}
     *     Array containing the byte values.
     * @returns {string}
     *     Byte string representation of vector.
     */
    ns.bytes2string = _bytes2string;
    
    
    /**
     * Converts a byte string representation to an array of unsigned
     * 8-bit integers.
     *
     * @function
     * @param vector {array}
     *     Array containing the byte values.
     * @returns {string}
     *     Byte string representation of vector.
     */
    ns.string2bytes = _string2bytes;
    
    
    return ns;
});

/**
 * @fileOverview
 * Core operations on curve 25519 required for the higher level modules.
 */

/*
 * Copyright (c) 2007, 2013, 2014 Michele Bini
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss, Michele Bini
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519/curve255',[
    "jodid25519/core",
    "jodid25519/utils",
], function(core, utils) {
    

    /**
     * @exports jodid25519/curve255
     * Legacy compatibility module for Michele Bini's previous curve255.js.
     *
     * @description
     * Legacy compatibility module for Michele Bini's previous curve255.js.
     *
     * <p>
     * This code presents an API with all key formats as previously available
     * from Michele Bini's curve255.js implementation.
     * </p>
     */
    var ns = {};

    function curve25519_raw(f, c) {
        var a, x_1, q;

        x_1 = c;
        a = core.dbl(x_1, core.ONE());
        q = [x_1, core.ONE()];

        var n = 255;

        while (core.getbit(f, n) == 0) {
            n--;
            // For correct constant-time operation, bit 255 should always be
            // set to 1 so the following 'while' loop is never entered.
            if (n < 0) {
                return core.ZERO();
            }
        }
        n--;

        var aq = [a, q];

        while (n >= 0) {
            var r, s;
            var b = core.getbit(f, n);
            r = core.sum(aq[0][0], aq[0][1], aq[1][0], aq[1][1], x_1);
            s = core.dbl(aq[1 - b][0], aq[1 - b][1]);
            aq[1 - b] = s;
            aq[b] = r;
            n--;
        }
        q = aq[1];

        q[1] = core.invmodp(q[1]);
        q[0] = core.mulmodp(q[0], q[1]);
        core.reduce(q[0]);
        return q[0];
    }

    function curve25519b32(a, b) {
        return _base32encode(curve25519(_base32decode(a),
                                        _base32decode(b)));
    }

    function curve25519(f, c) {
        if (!c) {
            c = core.BASE();
        }
        f[0] &= 0xFFF8;
        f[15] = (f[15] & 0x7FFF) | 0x4000;
        return curve25519_raw(f, c);
    }

    function _hexEncodeVector(k) {
        var hexKey = utils.hexEncode(k);
        // Pad with '0' at the front.
        hexKey = new Array(64 + 1 - hexKey.length).join('0') + hexKey;
        // Invert bytes.
        return hexKey.split(/(..)/).reverse().join('');
    }
    
    function _hexDecodeVector(v) {
        // assert(length(x) == 64);
        // Invert bytes.
        var hexKey = v.split(/(..)/).reverse().join('');
        return utils.hexDecode(hexKey);
    }
    
    
    // Expose some functions to the outside through this name space.
    
    /**
     * Computes the scalar product of a point on the curve 25519.
     *
     * This function is used for the DH key-exchange protocol.
     *
     * Before multiplication, some bit operations are applied to the
     * private key to ensure it is a valid Curve25519 secret key.
     * It is the user's responsibility to make sure that the private
     * key is a uniformly random, secret value.
     *
     * @function
     * @param f {array}
     *     Private key.
     * @param c {array}
     *     Public point on the curve. If not given, the curve's base point is used.
     * @returns {array}
     *     Key point resulting from scalar product.
     */
    ns.curve25519 = curve25519;

    /**
     * Computes the scalar product of a point on the curve 25519.
     *
     * This variant does not make sure that the private key is valid.
     * The user has the responsibility to ensure the private key is
     * valid or that this results in a safe protocol.  Unless you know
     * exactly what you are doing, you should not use this variant,
     * please use 'curve25519' instead.
     *
     * @function
     * @param f {array}
     *     Private key.
     * @param c {array}
     *     Public point on the curve. If not given, the curve's base point is used.
     * @returns {array}
     *     Key point resulting from scalar product.
     */
    ns.curve25519_raw = curve25519_raw;

    /**
     * Encodes the internal representation of a key to a canonical hex
     * representation.
     *
     * This is the format commonly used in other libraries and for
     * test vectors, and is equivalent to the hex dump of the key in
     * little-endian binary format.
     *
     * @function
     * @param n {array}
     *     Array representation of key.
     * @returns {string}
     *     Hexadecimal string representation of key.
     */
    ns.hexEncodeVector = _hexEncodeVector;
    
    /**
     * Decodes a canonical hex representation of a key
     * to an internally compatible array representation.
     *
     * @function
     * @param n {string}
     *     Hexadecimal string representation of key.
     * @returns {array}
     *     Array representation of key.
     */
    ns.hexDecodeVector = _hexDecodeVector;
    
    /**
     * Encodes the internal representation of a key into a 
     * hexadecimal representation.
     *
     * This is a strict positional notation, most significant digit first.
     *
     * @function
     * @param n {array}
     *     Array representation of key.
     * @returns {string}
     *     Hexadecimal string representation of key.
     */
    ns.hexencode = utils.hexEncode;

    /**
     * Decodes a hex representation of a key to an internally
     * compatible array representation.
     *
     * @function
     * @param n {string}
     *     Hexadecimal string representation of key.
     * @returns {array}
     *     Array representation of key.
     */
    ns.hexdecode = utils.hexDecode;

    /**
     * Encodes the internal representation of a key to a base32
     * representation.
     *
     * @function
     * @param n {array}
     *     Array representation of key.
     * @returns {string}
     *     Base32 string representation of key.
     */
    ns.base32encode = utils.base32encode;

    /**
     * Decodes a base32 representation of a key to an internally
     * compatible array representation.
     *
     * @function
     * @param n {string}
     *     Base32 string representation of key.
     * @returns {array}
     *     Array representation of key.
     */
    ns.base32decode = utils.base32decode;
    

    return ns;
});

/**
 * @fileOverview
 * EC Diffie-Hellman operations on Curve25519.
 */

/*
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519/dh',[
    "jodid25519/core",
    "jodid25519/utils",
    "jodid25519/curve255",
], function(core, utils, curve255) {
    

    /**
     * @exports jodid25519/dh
     * EC Diffie-Hellman operations on Curve25519.
     *
     * @description
     * EC Diffie-Hellman operations on Curve25519.
     */
    var ns = {};

    
    function _toString(vector) {
        var result = [];
        for (var i = 0; i < vector.length; i++) {
            result.push(String.fromCharCode(vector[i] & 0xff));
            result.push(String.fromCharCode(vector[i] >>> 8));
        }
        return result.join('');
    }
    
    function _fromString(vector) {
        var result = new Array(16);
        for (var i = 0, l = 0; i < vector.length; i += 2) {
            result[l] = (vector.charCodeAt(i + 1) << 8) | vector.charCodeAt(i);
            l++;
        }
        return result;
    }

    
    /**
     * Computes a key through scalar multiplication of a point on the curve 25519.
     *
     * This function is used for the DH key-exchange protocol. It computes a
     * key based on a secret key with a public component (opponent's public key
     * or curve base point if not given) by using scalar multiplication.
     *
     * Before multiplication, some bit operations are applied to the
     * private key to ensure it is a valid Curve25519 secret key.
     * It is the user's responsibility to make sure that the private
     * key is a uniformly random, secret value.
     *
     * @function
     * @param privateComponent {string}
     *     Private point as byte string on the curve.
     * @param publicComponent {string}
     *     Public point as byte string on the curve. If not given, the curve's
     *     base point is used.
     * @returns {string}
     *     Key point as byte string resulting from scalar product.
     */
    ns.computeKey = function(privateComponent, publicComponent) {
        if (publicComponent) {
            return _toString(curve255.curve25519(_fromString(privateComponent),
                                                 _fromString(publicComponent)));
        } else {
            return _toString(curve255.curve25519(_fromString(privateComponent)));
        }
    };

    /**
     * Computes the public key to a private key on the curve 25519.
     *
     * Before multiplication, some bit operations are applied to the
     * private key to ensure it is a valid Curve25519 secret key.
     * It is the user's responsibility to make sure that the private
     * key is a uniformly random, secret value.
     *
     * @function
     * @param privateKey {string}
     *     Private point as byte string on the curve.
     * @returns {string}
     *     Public key point as byte string resulting from scalar product.
     */
    ns.publicKey = function(privateKey) {
        return _toString(curve255.curve25519(_fromString(privateKey)));
    };


    /**
     * Generates a new random private key of 32 bytes length (256 bit).
     *
     * @function
     * @returns {string}
     *     Byte string containing a new random private key seed.
     */
    ns.generateKey = core.generateKey;
    

    return ns;
});

;
define("jsbn", (function (global) {
    return function () {
        var ret, fn;
       fn = function (jsbn) {
                // first case is for plain jsbn, second case is for jsbn node module
                return {
                    BigInteger: (typeof BigInteger !== "undefined") ? BigInteger : module.exports,
                };
            };
        ret = fn.apply(global, arguments);
        return ret || global.jsbn;
    };
}(this)));

/**
 * @fileOverview
 * Digital signature scheme based on Curve25519 (Ed25519 or EdDSA).
 */

/*
 * Copyright (c) 2011, 2012, 2014 Ron Garret
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss, Ron Garret
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519/eddsa',[
    "jodid25519/core",
    "jodid25519/curve255",
    "jodid25519/utils",
    "jsbn",
    "asmcrypto",
], function(core, curve255, utils, jsbn, asmCrypto) {
    

    /**
     * @exports jodid25519/eddsa
     * Digital signature scheme based on Curve25519 (Ed25519 or EdDSA).
     *
     * @description
     * Digital signature scheme based on Curve25519 (Ed25519 or EdDSA).
     * 
     * <p>
     * This code is adapted from fast-djbec.js, a faster but more complicated
     * version of the Ed25519 encryption scheme (as compared to djbec.js).
     * It uses two different representations for big integers: The jsbn
     * BigInteger class, which can represent arbitrary-length numbers, and a
     * special fixed-length representation optimised for 256-bit integers.
     * The reason both are needed is that the Ed25519 algorithm requires some
     * 512-bit numbers.</p>
    */
    var ns = {};

    function _bi255(value) {
        if (!(this instanceof _bi255)) {
            return new _bi255(value);
        }
        if (typeof value === 'undefined') {
            return _ZERO;
        }
        var c = value.constructor;
        if ((c === Array) && (value.length === 16)) {
            this.n = value;
        } else if ((c === Array) && (value.length === 32)) {
            this.n = _bytes2bi255(value).n;
        } else if (c === String) {
            this.n = utils.hexDecode(value);
        } else if (c === Number) {
            this.n = [value & 0xffff,
                      value >> 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        } else if (value instanceof _bi255) {
            this.n = value.n.slice(0); // Copy constructor
        } else {
            throw "Bad argument for bignum: " + value;
        }
    }

   _bi255.prototype = {
        'toString' : function() {
            return utils.hexEncode(this.n);
        },
        'toSource' : function() {
            return '_' + utils.hexEncode(this.n);
        },
        'plus' : function(n1) {
            return _bi255(core.bigintadd(this.n, n1.n));
        },
        'minus' : function(n1) {
            return _bi255(core.bigintsub(this.n, n1.n)).modq();
        },
        'times' : function(n1) {
            return _bi255(core.mulmodp(this.n, n1.n));
        },
        'divide' : function(n1) {
            return this.times(n1.inv());
        },
        'sqr' : function() {
            return _bi255(core.sqrmodp(this.n));
        },
        'cmp' : function(n1) {
            return core.bigintcmp(this.n, n1.n);
        },
        'equals' : function(n1) {
            return this.cmp(n1) === 0;
        },
        'isOdd' : function() {
            return (this.n[0] & 1) === 1;
        },
        'shiftLeft' : function(cnt) {
            _shiftL(this.n, cnt);
            return this;
        },
        'shiftRight' : function(cnt) {
            _shiftR(this.n, cnt);
            return this;
        },
        'inv' : function() {
            return _bi255(core.invmodp(this.n));
        },
        'pow' : function(e) {
            return _bi255(_pow(this.n, e.n));
        },
        'modq' : function() {
            return _modq(this);
        },
        'bytes' : function() {
            return _bi255_bytes(this);
        }
    };

    function _shiftL(n, cnt) {
        var lastcarry = 0;
        for (var i = 0; i < 16; i++) {
            var carry = n[i] >> (16 - cnt);
            n[i] = (n[i] << cnt) & 0xffff | lastcarry;
            lastcarry = carry;
        }
        return n;
    }

    function _shiftR(n, cnt) {
        var lastcarry = 0;
        for (var i = 15; i >= 0; i--) {
            var carry = n[i] << (16 - cnt) & 0xffff;
            n[i] = (n[i] >> cnt) | lastcarry;
            lastcarry = carry;
        }
        return n;
    }

    function _bi255_bytes(n) {
        n = _bi255(n); // Make a copy because shiftRight is destructive
        var a = new Array(32);
        for (var i = 31; i >= 0; i--) {
            a[i] = n.n[0] & 0xff;
            n.shiftRight(8);
        }
        return a;
    }

    function _bytes2bi255(a) {
        var n = _ZERO;
        for (var i = 0; i < 32; i++) {
            n.shiftLeft(8);
            n = n.plus(_bi255(a[i]));
        }
        return n;
    }

    function _pow(n, e) {
        var result = core.ONE();
        for (var i = 0; i < 256; i++) {
            if (core.getbit(e, i) === 1) {
                result = core.mulmodp(result, n);
            }
            n = core.sqrmodp(n);
        }
        return result;
    }

    var _ZERO = _bi255(0);
    var _ONE = _bi255(1);
    var _TWO = _bi255(2);
    // This is the core prime.
    var _Q = _bi255([0xffff - 18, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff,
                     0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff,
                     0xffff, 0xffff, 0x7fff]);

    function _modq(n) {
        core.reduce(n.n);
        if (n.cmp(_Q) >= 0) {
            return _modq(n.minus(_Q));
        }
        if (n.cmp(_ZERO) === -1) {
            return _modq(n.plus(_Q));
        } else {
            return n;
        }
    }

    // _RECOVERY_EXPONENT = _Q.plus(_bi255(3)).divide(_bi255(8));
    var _RECOVERY_EXPONENT = _bi255('0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe');
    // _D = _Q.minus(_bi255(121665)).divide(_bi255(121666));
    var _D = _bi255('52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3');
    // _I = _TWO.pow(_Q.minus(_ONE).divide(_bi255(4)));
    var _I = _bi255('2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0');
    // _L = _TWO.pow(_bi255(252)).plus(_bi255('14def9dea2f79cd65812631a5cf5d3ed'));
    var _L = _bi255('1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed');
    var _L_BI = _bi('1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed', 16);


    // ////////////////////////////////////////////////////////////

    function _isoncurve(p) {
        var x = p[0];
        var y = p[1];
        var xsqr = x.sqr();
        var ysqr = y.sqr();
        var v = _D.times(xsqr).times(ysqr);
        return ysqr.minus(xsqr).minus(_ONE).minus(v).modq().equals(_ZERO);
    }

    function _xrecover(y) {
        var ysquared = y.sqr();
        var xx = ysquared.minus(_ONE).divide(_ONE.plus(_D.times(ysquared)));
        var x = xx.pow(_RECOVERY_EXPONENT);
        if (!(x.times(x).minus(xx).equals(_ZERO))) {
            x = x.times(_I);
        }
        if (x.isOdd()) {
            x = _Q.minus(x);
        }
        return x;
    }

    function _x_pt_add(pt1, pt2) {
        var x1 = pt1[0];
        var y1 = pt1[1];
        var z1 = pt1[2];
        var t1 = pt1[3];
        var x2 = pt2[0];
        var y2 = pt2[1];
        var z2 = pt2[2];
        var t2 = pt2[3];
        var A = y1.minus(x1).times(y2.plus(x2));
        var B = y1.plus(x1).times(y2.minus(x2));
        var C = z1.times(_TWO).times(t2);
        var D = t1.times(_TWO).times(z2);
        var E = D.plus(C);
        var F = B.minus(A);
        var G = B.plus(A);
        var H = D.minus(C);
        return [E.times(F), G.times(H), F.times(G), E.times(H)];
    }

    function _xpt_double(pt1) {
        var x1 = pt1[0];
        var y1 = pt1[1];
        var z1 = pt1[2];
        var A = x1.times(x1);
        var B = y1.times(y1);
        var C = _TWO.times(z1).times(z1);
        var D = _Q.minus(A);
        var J = x1.plus(y1);
        var E = J.times(J).minus(A).minus(B);
        var G = D.plus(B);
        var F = G.minus(C);
        var H = D.minus(B);
        return [E.times(F), G.times(H), F.times(G), E.times(H)];
    }

    function _xpt_mult(pt, n) {
        if (n.equals(_ZERO)) {
            return [_ZERO, _ONE, _ONE, _ZERO];
        }
        var odd = n.isOdd();
        n.shiftRight(1);
        var value = _xpt_double(_xpt_mult(pt, n));
        return odd ? _x_pt_add(value, pt) : value;
    }

    function _pt_xform(pt) {
        var x = pt[0];
        var y = pt[1];
        return [x, y, _ONE, x.times(y)];
    }

    function _pt_unxform(pt) {
        var x = pt[0];
        var y = pt[1];
        var z = pt[2];
        var invz = z.inv();
        return [x.times(invz), y.times(invz)];
    }

    function _scalarmult(pt, n) {
        return _pt_unxform(_xpt_mult(_pt_xform(pt), n));
    }

    function _bytesgetbit(bytes, n) {
        return (bytes[bytes.length - (n >>> 3) - 1] >> (n & 7)) & 1;
    }

    function _xpt_mult_bytes(pt, bytes) {
        var r = [_ZERO, _ONE, _ONE, _ZERO];
        for (var i = (bytes.length << 3) - 1; i >= 0; i--) {
            r = _xpt_double(r);
            if (_bytesgetbit(bytes, i) === 1) {
                r = _x_pt_add(r, pt);
            }
        }
        return r;
    }

    function _scalarmultBytes(pt, bytes) {
        return _pt_unxform(_xpt_mult_bytes(_pt_xform(pt), bytes));
    }

    var _by = _bi255(4).divide(_bi255(5));
    var _bx = _xrecover(_by);
    var _bp = [_bx, _by];

    function _encodeint(n) {
        return n.bytes(32).reverse();
    }
    function _decodeint(b) {
        return _bi255(b.slice(0).reverse());
    }

    function _encodepoint(p) {
        var v = _encodeint(p[1]);
        if (p[0].isOdd()) {
            v[31] |= 0x80;
        }
        return v;
    }

    function _decodepoint(v) {
        v = v.slice(0);
        var signbit = v[31] >> 7;
        v[31] &= 127;
        var y = _decodeint(v);
        var x = _xrecover(y);
        if ((x.n[0] & 1) !== signbit) {
            x = _Q.minus(x);
        }
        var p = [x, y];
        if (!_isoncurve(p)) {
            throw ('Point is not on curve');
        }
        return p;
    }

    // //////////////////////////////////////////////////

    /**
     * Factory function to create a suitable BigInteger.
     *
     * @param value
     *     The value for the big integer.
     * @param base {integer}
     *     Base of the conversion of elements in ``value``.
     * @returns
     *     A BigInteger object.
     */
    function _bi(value, base) {
        if (base !== undefined) {
            if (base === 256) {
                return _bi(utils.string2bytes(value));
            }
            return new jsbn.BigInteger(value, base);
        } else if (typeof value === 'string') {
            return new jsbn.BigInteger(value, 10);
        } else if ((value instanceof Array) || (value instanceof Uint8Array)) {
            return new jsbn.BigInteger(value);
        } else if (typeof value === 'number') {
            return new jsbn.BigInteger(value.toString(), 10);
        } else {
            throw "Can't convert " + value + " to BigInteger";
        }
    }

    function _bi2bytes(n, cnt) {
        if (cnt === undefined) {
            cnt = (n.bitLength() + 7) >>> 3;
        }
        var bytes = new Array(cnt);
        for (var i = cnt - 1; i >= 0; i--) {
            bytes[i] = n[0] & 255; // n.and(0xff);
            n = n.shiftRight(8);
        }
        return bytes;
    }

    jsbn.BigInteger.prototype.bytes = function(n) {
        return _bi2bytes(this, n);
    };

    // /////////////////////////////////////////////////////////

    function _bytehash(s) {
        return _bi2bytes(_bi(asmCrypto.SHA512.bytes(s)), 64).reverse();
    }

    function _stringhash(s) {
        return _map(_chr, _bi2bytes(_bi(asmCrypto.SHA512.bytes(s)), 64)).join('');
    }

    function _inthash(s) {
        // Need a leading 0 to prevent sign extension
        return _bi([0].concat(_bytehash(s)));
    }

    function _inthash_lo(s) {
        return _bi255(_bytehash(s).slice(32, 64));
    }

    function _inthash_mod_l(s) {
        return _inthash(s).mod(_L_BI);
    }

    function _get_a(sk) {
        var a = _inthash_lo(sk);
        a.n[0] &= 0xfff8;
        a.n[15] &= 0x3fff;
        a.n[15] |= 0x4000;
        return a;
    }

    function _publickey(sk) {
        return _encodepoint(_scalarmult(_bp, _get_a(sk)));
    }

    function _map(f, l) {
        var result = new Array(l.length);
        for (var i = 0; i < l.length; i++) {
            result[i] = f(l[i]);
        }
        return result;
    }

    function _chr(n) {
        return String.fromCharCode(n);
    }
    
    function _ord(c) {
        return c.charCodeAt(0);
    }

    function _pt_add(p1, p2) {
        return _pt_unxform(_x_pt_add(_pt_xform(p1), _pt_xform(p2)));
    }

    
    // Exports for the API.

    /**
     * Checks whether a point is on the curve.
     *
     * @function
     * @param point {string}
     *     The point to check for in a byte string representation.
     * @returns {boolean}
     *     true if the point is on the curve, false otherwise.
     */
    ns.isOnCurve = function(point) {
        try {
            _isoncurve(_decodepoint(utils.string2bytes(point)));
        } catch(e) {
            if (e === 'Point is not on curve') {
                return false;
            } else {
                throw e;
            }
        }
        return true;
    };

    
    /**
     * Computes the EdDSA public key.
     *
     * <p>Note: Seeds should be a byte string, not a unicode string containing
     * multi-byte characters.</p>
     *
     * @function
     * @param keySeed {string}
     *     Private key seed in the form of a byte string.
     * @returns {string}
     *     Public key as byte string computed from the private key seed
     *     (32 bytes).
     */
    ns.publicKey = function(keySeed) {
        return utils.bytes2string(_publickey(keySeed));
    };

    
    /**
     * Computes an EdDSA signature of a message.
     *
     * <p>Notes:</p>
     *
     * <ul>
     *   <li>Unicode messages need to be converted to a byte representation
     *   (e. g. UTF-8).</li>
     *   <li>If `pk` is given, and it is *not* a point of the curve, the signature
     *   will be faulty, but no error will be thrown.</li>
     * </ul>
     *
     * @function
     * @param message {string}
     *     Message in the form of a byte string.
     * @param keySeed {string}
     *     Private key seed in the form of a byte string.
     * @param publicKey {string}
     *     Public key as byte string (if not present, it will be computed from
     *     the private key seed).
     * @returns {string}
     *     Detached message signature in the form of a byte string (64 bytes).
     */
    ns.sign = function(message, keySeed, publicKey) {
        if (publicKey === undefined) {
            publicKey = _publickey(keySeed);
        } else {
            publicKey = utils.string2bytes(publicKey);
        }
        var a = _bi(_get_a(keySeed).toString(), 16);
        var hs = _stringhash(keySeed);
        var r = _bytehash(hs.slice(32, 64) + message);
        var rp = _scalarmultBytes(_bp, r);
        var erp = _encodepoint(rp);
        r = _bi(r).mod(_bi(1, 10).shiftLeft(512));
        var s = _map(_chr, erp).join('') + _map(_chr, publicKey).join('') + message;
        s = _inthash_mod_l(s).multiply(a).add(r).mod(_L_BI);
        return utils.bytes2string(erp.concat(_encodeint(s)));
    };

        
    /**
     * Verifies an EdDSA signature of a message with the public key.
     *
     * <p>Note: Unicode messages need to be converted to a byte representation
     * (e. g. UTF-8).</p>
     *
     * @function
     * @param signature {string}
     *     Message signature in the form of a byte string. Can be detached
     *     (64 bytes), or attached to be sliced off.
     * @param message {string}
     *     Message in the form of a byte string.
     * @param publicKey {string}
     *     Public key as byte string (if not present, it will be computed from
     *     the private key seed).
     * @returns {boolean}
     *     true, if the signature verifies.
     */
    ns.verify = function(signature, message, publicKey) {
        signature = utils.string2bytes(signature.slice(0, 64));
        publicKey = utils.string2bytes(publicKey);
        var rpe = signature.slice(0, 32);
        var rp = _decodepoint(rpe);
        var a = _decodepoint(publicKey);
        var s = _decodeint(signature.slice(32, 64));
        var h = _inthash(utils.bytes2string(rpe.concat(publicKey)) + message);
        var v1 = _scalarmult(_bp, s);
        var value = _scalarmultBytes(a, _bi2bytes(h));
        var v2 = _pt_add(rp, value);
        return v1[0].equals(v2[0]) && v1[1].equals(v2[1]);
    };


    /**
     * Generates a new random private key seed of 32 bytes length (256 bit).
     *
     * @function
     * @returns {string}
     *     Byte string containing a new random private key seed.
     */
    ns.generateKeySeed = core.generateKey;
    
    
    return ns;
});

/*
 * Copyright (c) 2014 Mega Limited
 * under the MIT License.
 * 
 * Authors: Guy K. Kloss
 * 
 * You should have received a copy of the license along with this program.
 */

define('jodid25519',[
    "jodid25519/dh",
    "jodid25519/eddsa",
    "jodid25519/curve255",
    "jodid25519/utils",
], function(dh, eddsa, curve255, utils) {
    
    
    /**
     * @exports jodid25519
     * Curve 25519-based cryptography collection.
     *
     * @description
     * EC Diffie-Hellman (ECDH) based on Curve25519 and digital signatures
     * (EdDSA) based on Ed25519.
     */
    var ns = {};
    
    /** Module version indicator as string (format: [major.minor.patch]). */
    ns.VERSION = '0.7.0';

    ns.dh = dh;
    ns.eddsa = eddsa;
    ns.curve255 = curve255;
    ns.utils = utils;

    return ns;
});

    // The modules for your project will be inlined above
    // this snippet. Ask almond to synchronously require the
    // module value for 'main' here and return it as the
    // value to use for the public API for the built file.
    return require('jodid25519');
}));
// See https://github.com/jrburke/almond#exporting-a-public-api
