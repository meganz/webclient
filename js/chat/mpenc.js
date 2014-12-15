/*
 * A multi-party encrypted chat protocol.
 * 
 * Copyright (c) 2013, 2014 Mega Limited
 * under the Simplified (2-clause) BSD License.
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
        root.mpenc = factory();
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

;
define("jodid25519", ["jsbn","asmcrypto"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.jodid25519;
    };
}(this)));

/**
 * @fileOverview
 * Some utilities.
 */

define('mpenc/helper/utils',[
    "asmcrypto",
    "jodid25519",
], function(asmCrypto, jodid25519) {
    

    /**
     * @exports mpenc/helper/utils
     * Some utilities.
     *
     * @description
     * Some utilities.
     */
    var ns = {};

    /*
     * Created: 7 Feb 2014 Guy K. Kloss <gk@mega.co.nz>
     *
     * (c) 2014 by Mega Limited, Wellsford, New Zealand
     *     http://mega.co.nz/
     *     Simplified (2-clause) BSD License.
     *
     * You should have received a copy of the license along with this
     * program.
     *
     * This file is part of the multi-party chat encryption suite.
     *
     * This code is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
     */

    ns._HEX_CHARS = '0123456789abcdef';


    /**
     * Generates a new random key, and converts it into a format that
     * the Ed25519 implementation understands.
     *
     * @param bits
     *     Number of bits of key strength (must be a multiple of 32).
     * @returns
     *     8 bit value array of the key.
     * @private
     */
    ns._newKey08 = function(bits) {
        var buffer = new Uint8Array(Math.floor(bits / 8));
        asmCrypto.getRandomValues(buffer);
        var result = [];
        for (var i = 0; i < buffer.length; i++) {
            result.push(buffer[i]);
        }
        return result;
    };


    /**
     * Dumb array maker/initialiser helper.
     *
     * @param size
     *     Size of new array.
     * @param template
     *     Default value to initialise every element with.
     * @returns
     *     The new array.
     * @private
     */
    ns._arrayMaker = function(size, template) {
        var arr = new Array(size);
        for (var i = 0; i < size; i++) {
            arr[i] = template;
        }
        return arr;
    };


    /**
     * Checks for unique occurrence of all elements within the array.
     *
     * Note: Array members must be directly comparable for equality
     * (g. g. numbers or strings).
     *
     * @param theArray
     *     Array under scrutiny.
     * @returns
     *     True for uniqueness.
     * @private
     */
    ns._arrayIsSet = function(theArray) {
        // Until ES6 is down everywhere to offer the Set() class, we need to work
        // around it.
        var mockSet = {};
        var item;
        for (var i = 0; i < theArray.length; i++) {
            item = theArray[i];
            if (item in mockSet) {
                return false;
            } else {
                mockSet[item] = true;
            }
        }
        return true;
    };


    /**
     * Checks whether one array's elements are a subset of another.
     *
     * Note: Array members must be directly comparable for equality
     * (g. g. numbers or strings).
     *
     * @param subset
     *     Array to be checked for being a subset.
     * @param superset
     *     Array to be checked for being a superset.
     * @returns
     *     True for the first being a subset of the second.
     * @private
     */
    ns._arrayIsSubSet = function(subset, superset) {
        // Until ES6 is down everywhere to offer the Set() class, we need to work
        // around it.
        var mockSet = {};
        var item;
        for (var i = 0; i < superset.length; i++) {
            item = superset[i];
            if (item in mockSet) {
                return false;
            } else {
                mockSet[item] = true;
            }
        }
        for (var i = 0; i < subset.length; i++) {
            if (!(subset[i] in mockSet)) {
                return false;
            }
        }
        return true;
    };


    /**
     * Determines whether the list contains duplicates while excluding removed
     * elements (null).
     *
     * @param aList
     *     The list to check for duplicates.
     * @returns
     *     True for no duplicates in list.
     * @private
     */
    ns._noDuplicatesInList = function(aList) {
        var listCheck = [];
        for (var i = 0; i < aList.length; i++) {
            if (aList[i] !== null) {
                listCheck.push(aList[i]);
            }
        }
        return ns._arrayIsSet(listCheck);
    };


    /**
     * Returns a binary string representation of the SHA-256 hash function.
     *
     * @param data
     *     Data to hash.
     * @returns
     *     Binary string.
     */
    ns.sha256 = function(data) {
        return jodid25519.utils.bytes2string(asmCrypto.SHA256.bytes(data));
    };


    /**
     * Returns a binary string representation of the SHA-1 hash function.
     *
     * @param data
     *     Data to hash.
     * @returns
     *     Binary string.
     */
    ns.sha1 = function(data) {
        return jodid25519.utils.bytes2string(asmCrypto.SHA1.bytes(data));
    };


    /**
     * (Deep) clones a JavaScript object.
     *
     * Note: May not work with some objects.
     *
     * See: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
     *
     * @param obj
     *     The object to be cloned.
     * @returns
     *     A deep copy of the original object.
     */
    ns.clone = function(obj) {
        // Handle the 3 simple types, and null or undefined.
        if (null == obj || "object" != typeof obj) {
            return obj;
        }

        // Handle date.
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle array.
        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = ns.clone(obj[i]);
            }
            return copy;
        }

        // Handle object.
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) {
                    copy[attr] = ns.clone(obj[attr]);
                }
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    };


    /**
     * Constant time string comparison of two strings.
     *
     * @param str1 {string}
     *     The first string to be compared against the second.
     * @param str2 {string}
     *     The second string to be compared against the first.
     * @returns
     *     A true on equality.
     */
    ns.constTimeStringCmp = function(str1, str2) {
        // Compare lengths - can save a lot of time.
        if (str1.length !== str2.length) {
            return false;
        }

        var diff = 0;
        for (var i = 0, l = str1.length; i < l; i++) {
            diff |= (str1[i] ^ str2[i]);
        }
        return !diff;
    };


    /**
     * (Deep) compares two JavaScript arrays.
     *
     * See: http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
     *
     * @param arr1
     *     The first array to be compared against the second.
     * @param arr2
     *     The second array to be compared against the first.
     * @returns
     *     A true on equality.
     */
    ns.arrayEqual = function(arr1, arr2) {
        // If the other array is a falsy value, return.
        if (!arr2) {
            return false;
        }

        // Compare lengths - can save a lot of time.
        if (arr1.length !== arr2.length) {
            return false;
        }

        for (var i = 0, l = arr1.length; i < l; i++) {
            // Check if we have nested arrays.
            if (arr1[i] instanceof Array && arr2[i] instanceof Array) {
                // Recurse into the nested arrays.
                if (!ns.arrayEqual(arr1[i], arr2[i])) {
                    return false;
                }
            } else if (arr1[i] !== arr2[i]) {
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }
        return true;
    };


    /**
     * Check an object's invariants.
     *
     * Visits all ancestor prototypes of an object (including itself) and runs
     * the 1-ary functions listed in prototype.__invariants against the object.
     */
    ns.checkInvariants = function(obj) {
        var parent = obj;
        while (parent !== Object.prototype) {
            if (parent.hasOwnProperty("__invariants")) {
                var invariants = parent.__invariants;
                for (var k in invariants) {
                    invariants[k](obj);
                }
            }
            parent = Object.getPrototypeOf(parent);
        }
    };


    /**
     * (Deep) compares two JavaScript objects.
     *
     * Note: May not work with some objects.
     *
     * See: http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
     *
     * @param obj1
     *     The first object to be compared against the second.
     * @param obj2
     *     The second object to be compared against the first.
     * @returns
     *     A true on equality.
     */
    ns.objectEqual = function(obj1, obj2) {
        // For the first loop, we only check for types
        for (var propName in obj1) {
            // Check for inherited methods and properties - like .equals itself
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
            // Return false if the return value is different.
            if (obj1.hasOwnProperty(propName) !== obj2.hasOwnProperty(propName)) {
                return false;
            }
            // Check instance type.
            else if (typeof obj1[propName] !== typeof obj2[propName]) {
                // Different types => not equal.
                return false;
            }
        }
        // Now a deeper check using other objects property names.
        for(var propName in obj2) {
            // We must check instances anyway, there may be a property that only exists in obj2.
            // I wonder, if remembering the checked values from the first loop would be faster or not .
            if (obj1.hasOwnProperty(propName) !== obj2.hasOwnProperty(propName)) {
                return false;
            } else if (typeof obj1[propName] !== typeof obj2[propName]) {
                return false;
            }

            // If the property is inherited, do not check any more (it must be equal if both objects inherit it).
            if(!obj1.hasOwnProperty(propName)) {
                continue;
            }

            // Now the detail check and recursion.

            // This returns the script back to the array comparing.
            if (obj1[propName] instanceof Array && obj2[propName] instanceof Array) {
                // Recurse into the nested arrays.
                if (!ns.arrayEqual(obj1[propName], obj2[propName])) {
                    return false;
                }
            } else if (obj1[propName] instanceof Object && obj2[propName] instanceof Object) {
                // Recurse into another objects.
                if (!ns.objectEqual(obj1[propName], obj2[propName])) {
                    return false;
                }
            }
            // Normal value comparison for strings and numbers.
            else if(obj1[propName] !== obj2[propName]) {
                return false;
            }
        }
        // If everything passed, let's say YES.
        return true;
    };


    /**
     * Dummy logger to be used until we've got a proper one in place.
     *
     * FIXME: Replace this with a "proper" logger!
     *
     * @param level {string}
     *     Log level. One of "DEBUG", "INFO", "WARN", "ERROR".
     * @param message {string}
     *     Message to be logged.
     */
    ns.dummyLogger = function(level, message) {
        if (!window._dummyLoggerOff) {
            console.log('LOG ' + level + ': ' + message);
        }
    };


    return ns;
});

/**
 * @fileOverview
 * Assertion helper module.
 */

define('mpenc/helper/assert',[
    "mpenc/helper/utils",
], function(utils) {
    

    /**
     * @exports mpenc/helper/assert
     * Assertion helper module.
     *
     * @description
     * <p>Assertion helper module.</p>
     *
     * <p>Example usage:</p>
     *
     * <pre>
     * function lastElement(array) {
     *     _assert(array.length > 0, "empty array in lastElement");
     *     return array[array.length - 1];
     * }
     * </pre>
     */
    var ns = {};

    /**
     * Assertion exception.
     * @param message
     *     Message for exception on failure.
     * @constructor
     */
    ns.AssertionFailed = function(message) {
        this.message = message;
    };
    ns.AssertionFailed.prototype = Object.create(Error.prototype);
    ns.AssertionFailed.prototype.name = 'AssertionFailed';


    /**
     * Assert a given test condition.
     *
     * Throws an `AssertionFailed` exception with the given `message` on failure.
     *
     * @param test
     *     Test statement.
     * @param message
     *     Message for exception on failure.
     */
    ns.assert = function(test, message) {
        if (!test) {
            utils.dummyLogger('ERROR', message);
            throw new ns.AssertionFailed(message);
        }
    };

    return ns;
});

/**
 * @fileOverview Metadata about the mpENC library
 */

/*
 * Created: 11 Feb 2014 Guy K. Kloss <gk@mega.co.nz>
 *
 * (c) 2014 by Mega Limited, Wellsford, New Zealand
 *     http://mega.co.nz/
 *     Simplified (2-clause) BSD License.
 *
 * You should have received a copy of the license along with this
 * program.
 *
 * This file is part of the multi-party chat encryption suite.
 *
 * This code is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

define('mpenc/version',[], function() {
    

    /**
     * @exports mpenc/version
     * @description
     * Meta-data about the mpENC library.
     */
    var ns = {};

    /** Protocol version indicator. */
    ns.PROTOCOL_VERSION = String.fromCharCode(0x01);

    return ns;
});

/**
 * @fileOverview
 * Implementation of a protocol encoder/decoder.
 */

define('mpenc/codec',[
    "mpenc/helper/assert",
    "mpenc/helper/utils",
    "mpenc/version",
    "asmcrypto",
    "jodid25519",
], function(assert, utils, version, asmCrypto, jodid25519) {
    

    /**
     * @exports mpenc/codec
     * Implementation of a protocol encoder/decoder.
     *
     * @description
     * <p>Implementation of a protocol encoder/decoder.</p>
     *
     * <p>
     * The implementation is finally aiming to mock the binary encoding scheme
     * as used by OTR. But initially it will use a somewhat JSON-like
     * intermediate.</p>
     */
    var ns = {};

    var _assert = assert.assert;

    var _ZERO_BYTE = '\u0000';
    var _ONE_BYTE = '\u0001';
    var _PROTOCOL_INDICATOR = 'mpENC';
    var _PROTOCOL_PREFIX = '?' + _PROTOCOL_INDICATOR;

    /*
     * Created: 19 Mar 2014 Guy K. Kloss <gk@mega.co.nz>
     *
     * (c) 2014 by Mega Limited, Wellsford, New Zealand
     *     http://mega.co.nz/
     *     Simplified (2-clause) BSD License.
     *
     * You should have received a copy of the license along with this
     * program.
     *
     * This file is part of the multi-party chat encryption suite.
     *
     * This code is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
     */


    /**
     * Carries message content for the mpENC protocol flow and data messages.
     *
     * @constructor
     * @param source {string}
     *     Message originator (from).
     * @returns {mpenc.codec.ProtocolMessage}
     *
     * @property source {string|object}
     *     Message originator (from) or a {ProtocolMessage} object to copy.
     * @property dest {string}
     *     Message destination (to).
     * @property messageType {string}
     *     mpENC protocol message type, one of {mpenc.codec.MESSAGE_TYPE}.
     * @property members {Array}
     *     List (array) of all participating members.
     * @property intKeys {Array}
     *     List (array) of intermediate keys for group key agreement.
     * @property debugKeys {Array}
     *     List (array) of keying debugging strings.
     * @property nonces {Array}
     *     Nonces of members for ASKE.
     * @property pubKeys {Array}
     *     Ephemeral public signing key of members.
     * @property sessionSignature {string}
     *     Session acknowledgement signature using sender's static key.
     * @property signingKey {string}
     *     Ephemeral private signing key for session (upon quitting participation).
     * @property signature {string}
     *     Binary signature string for the message
     * @property signatureOk {bool}
     *     Indicator whether the message validates. after message decoding.
     *     (Has to be done at time of message decoding as the symmetric block
     *     cipher employs padding.)
     * @property rawMessage {string}
     *     The raw message, after splitting off the signature. Can be used to
     *     re-verify the signature, if needed.
     * @property protocol {string}
     *     Single byte string indicating the protocol version using the binary
     *     version of the character.
     * @property data {string}
     *     Binary string containing the decrypted pay load of the message.
     */
    ns.ProtocolMessage = function(source) {
        if (source === undefined) {
            source = {};
        }
        if (source instanceof Object) {
            this.source = source.source || '';
        } else {
            this.source = source || '';
        }
        this.dest = source.dest || '';
        this.messageType = source.messageType || null;
        this.members = source.members || [];
        this.intKeys = source.intKeys || [];
        this.debugKeys = source.debugKeys || [];
        this.nonces = source.nonces || [];
        this.pubKeys = source.pubKeys || [];
        this.sessionSignature = source.sessionSignature || null;
        this.signingKey = source.signingKey || null;
        this.signature = source.signature || null;
        this.signatureOk = source.signatureOk || false;
        this.rawMessage = source.rawMessage || null;
        this.protocol = source.protocol || null;
        this.data = source.data || null;

        return this;
    };


    /**
     * Returns a numeric representation of the message type.
     *
     * @method
     * @returns {integer}
     *     Message type as numeric value.
     */
    ns.ProtocolMessage.prototype.getMessageTypeNumber = function() {
        return ns._messageTypeToNumber(this.messageType);
    };


    ns._messageTypeToNumber = function(typeString) {
        return (typeString.charCodeAt(0) << 8)
                | typeString.charCodeAt(1);
    };


    ns._messageTypeFromNumber = function(typeNumber) {
        return String.fromCharCode(typeNumber >>> 8)
               + String.fromCharCode(typeNumber & 0xff);
    };


    /**
     * Returns a string representation of the message type.
     *
     * @method
     * @returns {string}
     *     Message type as human readable string.
     */
    ns.ProtocolMessage.prototype.getMessageTypeString = function() {
        return ns.MESSAGE_TYPE_MAPPING[this.messageType];
    };


    /**
     * Sets a bit on the message type to a particular value.
     *
     * @method
     * @param {integer}
     *     Bit number to modify.
     * @param {bool}
     *     Value to set bit to.
     * @param {bool}
     *     If `true`, no checks for legal message transitions are performed
     *     (default: false).
     * @throws {Error}
     *     In case of a resulting illegal/non-existent message type.
     */
    ns.ProtocolMessage.prototype._setBit= function(bit, value, noMessageCheck) {
        var newMessageTypeNum = this.getMessageTypeNumber();
        if (value === true || value === 1) {
            newMessageTypeNum |= 1 << bit;
        } else if (value === 0 || value === false) {
            newMessageTypeNum &= 0xffff - (1 << bit);
        } else {
            throw new Error("Illegal value for set/clear bit operation.");
        }
        var newMessageType = ns._messageTypeFromNumber(newMessageTypeNum);
        if (ns.MESSAGE_TYPE_MAPPING[newMessageType] === undefined) {
            if (noMessageCheck !== true && noMessageCheck !== 1) {
                throw new Error("Illegal message type!");
            } else {
                this.messageType = newMessageType;
                utils.dummyLogger('DEBUG',
                                  'Arrived at an illegal message type, but was told to ignore it: '
                                  + newMessageType);
            }
        } else {
            this.messageType = newMessageType;
        }
    };


    /**
     * Reads a bit on the message type to a particular value.
     *
     * @method
     * @param {integer}
     *     Bit number to read.
     * @return {bool}
     *     Value of bit.
     */
    ns.ProtocolMessage.prototype._readBit= function(bit) {
        return ((this.getMessageTypeNumber() & (1 << bit)) > 0);
    };


    /**
     * Returns whether the message is for an auxiliary protocol flow.
     *
     * @method
     * @returns {bool}
     *     `true` for an auxiliary protocol flow.
     */
    ns.ProtocolMessage.prototype.isAuxiliary = function() {
        return this._readBit(ns._AUX_BIT);
    };


    /**
     * Returns whether the message is for the downflow (broadcast).
     *
     * @method
     * @returns {bool}
     *     `true` for a downflow message.
     */
    ns.ProtocolMessage.prototype.isDownflow = function() {
        return this._readBit(ns._DOWN_BIT);
    };


    /**
     * Sets the downflow bit on the message type.
     *
     * @method
     * @param {bool}
     *     If `true`, no checks for legal message transitions are performed
     *     (default: false).
     * @throws {Error}
     *     In case of a resulting illegal/non-existent message type.
     */
    ns.ProtocolMessage.prototype.setDownflow = function(noMessageCheck) {
        return this._setBit(ns._DOWN_BIT, true, noMessageCheck);
    };


    /**
     * Returns whether the message is for the Group Key Agreement.
     *
     * @method
     * @returns {bool}
     *     `true` for a message containing GKA content.
     */
    ns.ProtocolMessage.prototype.isGKA = function() {
        return this._readBit(ns._GKA_BIT);
    };


    /**
     * Clears the Group Key Agreement bit on the message type.
     *
     * @method
     * @param {bool}
     *     If `true`, no checks for legal message transitions are performed
     *     (default: false).
     * @throws {Error}
     *     In case of a resulting illegal/non-existent message type.
     */
    ns.ProtocolMessage.prototype.clearGKA = function(noMessageCheck) {
        return this._setBit(ns._GKA_BIT, false, noMessageCheck);
    };


    /**
     * Returns whether the message is for the Signature Key Exchange.
     *
     * @method
     * @returns {bool}
     *     `true` for a message containing SKE content.
     */
    ns.ProtocolMessage.prototype.isSKE = function() {
        return this._readBit(ns._SKE_BIT);
    };


    /**
     * Returns whether the message is from the protocol flow initiator.
     *
     * @method
     * @returns {bool}
     *     `true` for a message from the protocol flow initiator.
     */
    ns.ProtocolMessage.prototype.isInitiator = function() {
        return this._readBit(ns._INIT_BIT);
    };


    /**
     * Clears the initiator bit on the message type.
     *
     * @method
     * @param {bool}
     *     If `true`, no checks for legal message transitions are performed
     *     (default: false).
     * @throws {Error}
     *     In case of a resulting illegal/non-existent message type.
     */
    ns.ProtocolMessage.prototype.clearInitiator = function(noMessageCheck) {
        return this._setBit(ns._INIT_BIT, false, noMessageCheck);
    };


    /**
     * Returns whether the message is for a recovery protocol flow.
     *
     * @method
     * @returns {bool}
     *     `true` for a message for a recovery flow.
     */
    ns.ProtocolMessage.prototype.isRecover = function() {
        return this._readBit(ns._RECOVER_BIT);
    }


    /**
     * Returns the protocol operation of the message.
     *
     * @method
     * @returns {string}
     *     A clear text expression of the type of protocol operation.
     *     One of "DATA", "START", "JOIN", "EXCLUDE", "REFRESH" or "QUIT".
     */
    ns.ProtocolMessage.prototype.getOperation = function() {
        return _OPERATION_MAPPING[(this.getMessageTypeNumber() & ns._OPERATION_MASK)
                                  >>> ns._OP_BITS];
    }


    /**
     * Carries information extracted from a received mpENC protocol message for
     * the greet protocol (key exchange and agreement).
     *
     * @constructor
     * @returns {mpenc.codec.ProtocolMessageInfo}
     *
     * @property protocolVersion {integer}
     *     mpENC protocol version number.
     * @property messageType {integer}
     *     mpENC protocol message type, one of {mpenc.codec.MESSAGE_TYPE}.
     * @property messageTypeString {string}
     *     Corresponding mpENC protocol message type indicator as a string.
     * @property from {string}
     *     Message originator's participant ID.
     * @property to {string}
     *     Message destination's participant ID.
     * @property operation {string}
     *     A clear text expression of the type of protocol operation.
     *     One of "DATA", "START", "JOIN", "EXCLUDE", "REFRESH" or "QUIT".
     * @property origin {string}
     *     Indicates whether the message originated from the "initiator" of a
     *     protocol operation or from a "participant". If the originator is
     *     not a member, the value will be "outsider". The value will be "???"
     *     if no members list is part of the message (participation has to be
     *     determined using the members in the handler).
     * @property agreement {string}
     *     "initial" or "auxiliary" key agreement.
     * @property recover {bool}
     *     Indicates whether the message is part of a recovery (true) or normal
     *     protocol flow (false).
     * @property flow {string}
     *     "up" (directed message) or "down" (broadcast).
     * @property members {Array}
     *     List of group members' IDs enclosed.
     * @property numNonces {integer}
     *     Number of nonces enclosed.
     * @property numPubKeys {integer}
     *     Number of public signing keys enclosed.
     * @property numIntKeys {integer}
     *     Number of intermediate GDH keys enclosed.
     */
    ns.ProtocolMessageInfo = function() {
        this.protocolVersion = null;
        this.messageType = null;
        this.messageTypeString = null;
        this.from = null;
        this.to = null;
        this.origin = null;
        this.operation = null;
        this.agreement = null;
        this.recover = false;
        this.members = [];
        this.numNonces = 0;
        this.numPubKeys = 0;
        this.numIntKeys = 0;

        return this;
    };



    /**
     * Returns whether the message is from the protocol flow initiator.
     *
     * @method
     * @returns {bool}
     *     `true` for a message from the protocol flow initiator.
     */
    ns.ProtocolMessageInfo.prototype.isInitiator = function() {
        return (this.messageType & (1 << ns._INIT_BIT) > 0);
    }

    /**
     * "Enumeration" protocol message category types.
     *
     * @property PLAIN {integer}
     *     Plain text message (not using mpENC).
     * @property MPENC_QUERY {integer}
     *     Query to initiate an mpENC session.
     * @property MPENC_GREET_MESSAGE {integer}
     *     mpENC greet message.
     * @property MPENC_DATA_MESSAGE {integer}
     *     mpENC data message.
     * @property MPENC_ERROR {integer}
     *     Message for error in mpENC protocol.
     */
    ns.MESSAGE_CATEGORY = {
        PLAIN:               0x00,
        MPENC_QUERY:         0x01,
        MPENC_GREET_MESSAGE: 0x02,
        MPENC_DATA_MESSAGE:  0x03,
        MPENC_ERROR:         0x04,
    };


    // Add reverse mapping to string representation.
    var _MESSAGE_CATEGORY_MAPPING = {};
    for (var propName in ns.MESSAGE_CATEGORY) {
        _MESSAGE_CATEGORY_MAPPING[ns.MESSAGE_CATEGORY[propName]] = propName;
    }


    /**
     * "Enumeration" for TLV record types.
     *
     * @property PADDING {integer}
     *     Can be used for arbitrary length of padding byte sequences.
     * @property PROTOCOL_VERSION {integer}
     *     Indicates the protocol version to be used as a 16-bit unsigned integer.
     * @property DATA_MESSAGE {string}
     *     Data payload (chat message) content of the message.
     * @property MESSAGE_SIGNATURE {string}
     *     Signature of the entire message sent (must be the first TLV sent,
     *     and sign *all* remaining binary content).
     * @property MESSAGE_IV {string}
     *     Random initialisation vector for encrypted message payload.
     * @property MESSAGE_TYPE {integer}
     *     mpENC protocol message type. See `MESSAGE_TYPE`.
     * @property SOURCE {integer}
     *     Message originator ("from", must be only one).
     * @property DEST {integer}
     *     Message destination ("to", should be only one, broadcast if not
     *     present or empty).
     * @property MEMBER {integer}
     *     A participating member's ID.
     * @property INT_KEY {integer}
     *     An intermediate key for the group key agreement (max. occurrence is
     *     the number of members present).
     * @property NONCE {integer}
     *     A nonce of a member for ASKE (max. occurrence is the number of
     *     members present).
     * @property PUB_KEY {integer}
     *     Ephemeral public signing key of a member (max. occurrence is the
     *     number of members present).
     * @property SESSION_SIGNATURE {integer}
     *     Session acknowledgement signature using sender's static key.
     * @property SIGNING_KEY {integer}
     *     Session's ephemeral (private) signing key, published upon departing
     *     from a chat.
     */
    ns.TLV_TYPE = {
        PADDING:           0x0000,
        PROTOCOL_VERSION:  0x0001,
        DATA_MESSAGE:      0x0002,
        MESSAGE_SIGNATURE: 0x0003,
        MESSAGE_IV:        0x0004,
        MESSAGE_TYPE:      0x0005,
        SOURCE:            0x0100, // 256
        DEST:              0x0101, // 257
        MEMBER:            0x0102, // 258
        INT_KEY:           0x0103, // 259
        NONCE:             0x0104, // 260
        PUB_KEY:           0x0105, // 261
        SESSION_SIGNATURE: 0x0106, // 262
        SIGNING_KEY:       0x0107, // 263
    };


    // Message type bit mapping
    ns._AUX_BIT = 0;
    ns._DOWN_BIT = 1;
    ns._GKA_BIT = 2;
    ns._SKE_BIT = 3;
    ns._OP_BITS = 4;
    ns._INIT_BIT = 7;
    ns._RECOVER_BIT = 8;
    ns._OPERATION = { DATA: 0x00,
                      START: 0x01,
                      JOIN: 0x02,
                      EXCLUDE: 0x03,
                      REFRESH: 0x04,
                      QUIT: 0x05 };
    ns._OPERATION_MASK = 0x07 << ns._OP_BITS;
    // Add reverse mapping to string representation.
    var _OPERATION_MAPPING = {};
    for (var propName in ns._OPERATION) {
        _OPERATION_MAPPING[ns._OPERATION[propName]] = propName;
    }

    /**
     * "Enumeration" message types.
     *
     * @property PARTICIPANT_DATA {string}
     *     Data message.
     * @property INIT_INITIATOR_UP {string}
     *     Initiator initial upflow.
     * @property INIT_PARTICIPANT_UP {string}
     *     Participant initial upflow message.
     * @property INIT_PARTICIPANT_DOWN {string}
     *     Participant initial downflow.
     * @property INIT_PARTICIPANT_CONFIRM_DOWN {string}
     *     Participant initial subsequent downflow.
     * @property RECOVER_INIT_INITIATOR_UP {string}
     *     Initiator initial upflow for recovery.
     * @property RECOVER_INIT_PARTICIPANT_UP {string}
     *     Participant initial upflow message for recovery.
     * @property RECOVER_INIT_PARTICIPANT_DOWN {string}
     *     Participant initial downflow for recovery.
     * @property RECOVER_INIT_PARTICIPANT_CONFIRM_DOWN {string}
     *     Participant initial subsequent downflow for recovery.
     * @property JOIN_AUX_INITIATOR_UP {string}
     *     Initiator aux join upflow.
     * @property JOIN_AUX_PARTICIPANT_UP {string}
     *     Participant aux join upflow.
     * @property JOIN_AUX_PARTICIPANT_DOWN {string}
     *     Participant aux join downflow.
     * @property JOIN_AUX_PARTICIPANT_CONFIRM_DOWN {string}
     *     Participant aux join subsequent downflow.
     * @property EXCLUDE_AUX_INITIATOR_DOWN {string}
     *     Initiator aux exclude downflow.
     * @property EXCLUDE_AUX_PARTICIPANT_CONFIRM_DOWN {string}
     *     Participant aux exclude subsequent.
     * @property RECOVER_EXCLUDE_AUX_INITIATOR_DOWN {string}
     *     Initiator aux exclude downflow for recovery.
     * @property RECOVER_EXCLUDE_AUX_PARTICIPANT_CONFIRM_DOWN {string}
     *     Participant aux exclude subsequent for recovery.
     * @property REFRESH_AUX_INITIATOR_DOWN {string}
     *     Initiator aux refresh downflow.
     * @property REFRESH_AUX_PARTICIPANT_DOWN {string}
     *     Participant aux refresh downflow.
     * @property RECOVER_REFRESH_AUX_INITIATOR_DOWN {string}
     *     Initiator aux refresh downflow. for recovery
     * @property RECOVER_REFRESH_AUX_PARTICIPANT_DOWN {string}
     *     Participant aux refresh downflow for recovery.
     * @property QUIT_DOWN {string}
     *     Indicating departure. (Must be followed by an exclude sequence.)
     */
    ns.MESSAGE_TYPE = {
        // Data message.
        PARTICIPANT_DATA:                      '\u0000\u0000', // 0b00000000
        // Initial start sequence.
        INIT_INITIATOR_UP:                     '\u0000\u009c', // 0b10011100
        INIT_PARTICIPANT_UP:                   '\u0000\u001c', // 0b00011100
        INIT_PARTICIPANT_DOWN:                 '\u0000\u001e', // 0b00011110
        INIT_PARTICIPANT_CONFIRM_DOWN:         '\u0000\u001a', // 0b00011010
        RECOVER_INIT_INITIATOR_UP:             '\u0001\u009c', // 0b10011100
        RECOVER_INIT_PARTICIPANT_UP:           '\u0001\u001c', // 0b00011100
        RECOVER_INIT_PARTICIPANT_DOWN:         '\u0001\u001e', // 0b00011110
        RECOVER_INIT_PARTICIPANT_CONFIRM_DOWN: '\u0001\u001a', // 0b00011010
        // Join sequence.
        JOIN_AUX_INITIATOR_UP:                 '\u0000\u00ad', // 0b10101101
        JOIN_AUX_PARTICIPANT_UP:               '\u0000\u002d', // 0b00101101
        JOIN_AUX_PARTICIPANT_DOWN:             '\u0000\u002f', // 0b00101111
        JOIN_AUX_PARTICIPANT_CONFIRM_DOWN:     '\u0000\u002b', // 0b00101011
        // Exclude sequence.
        EXCLUDE_AUX_INITIATOR_DOWN:            '\u0000\u00bf', // 0b10111111
        EXCLUDE_AUX_PARTICIPANT_CONFIRM_DOWN:  '\u0000\u003b', // 0b00111011
        RECOVER_EXCLUDE_AUX_INITIATOR_DOWN:    '\u0001\u00bf', // 0b10111111
        RECOVER_EXCLUDE_AUX_PARTICIPANT_CONFIRM_DOWN: '\u0001\u003b', // 0b00111011
        // Refresh sequence.
        REFRESH_AUX_INITIATOR_DOWN:            '\u0000\u00c7', // 0b11000111
        REFRESH_AUX_PARTICIPANT_DOWN:          '\u0000\u0047', // 0b01000111
        RECOVER_REFRESH_AUX_INITIATOR_DOWN:    '\u0001\u00c7', // 0b11000111
        RECOVER_REFRESH_AUX_PARTICIPANT_DOWN:  '\u0001\u0047', // 0b01000111
        // Quit indication.
        QUIT_DOWN:                             '\u0000\u00d3'  // 0b11010011
    };


    /** Mapping of message type to string representation. */
    ns.MESSAGE_TYPE_MAPPING = {};
    for (var propName in ns.MESSAGE_TYPE) {
        ns.MESSAGE_TYPE_MAPPING[ns.MESSAGE_TYPE[propName]] = propName;
    }


    /**
     * Decodes a given binary TVL string to a type and value.
     *
     * @param tlv {string}
     *     A binary TLV string.
     * @returns {Object}
     *     An object containing the type of string (in `type`, 16-bit unsigned
     *     integer) and the value (in `value`, binary string of the pay load).
     *     left over bytes from the input are returned in `rest`.
     */
    ns.decodeTLV = function(tlv) {
        var type = ns._bin2short(tlv.substring(0, 2));
        var length = ns._bin2short(tlv.substring(2, 4));
        var value = tlv.substring(4, 4 + length);
        _assert(length === value.length,
                'TLV payload length does not match indicated length.');
        if (length === 0) {
            value = '';
        }
        return {
            type: type,
            value: value,
            rest: tlv.substring(length + 4)
        };
    };


    /**
     * Decodes a given TLV encoded protocol message content into an object.
     *
     * @param message {string}
     *     A binary message representation.
     * @param groupKey {string}
     *     Symmetric group encryption key to encrypt message.
     * @param pubKey {string}
     *     Sender's (ephemeral) public signing key.
     * @returns {mpenc.handler.ProtocolMessage}
     *     Message as JavaScript object.
     */
    ns.decodeMessageContent = function(message, groupKey, pubKey) {
        if (!message) {
            return null;
        }
        var out = new ns.ProtocolMessage();
        var debugOutput = [];

        while (message.length > 0) {
            var tlv = ns.decodeTLV(message);
            switch (tlv.type) {
                case ns.TLV_TYPE.PADDING:
                    // Completely ignore this.
                    debugOutput.push('padding: ' + tlv.value.length);
                    break;
                case ns.TLV_TYPE.PROTOCOL_VERSION:
                    out.protocol = tlv.value;
                    debugOutput.push('protocol: ' + tlv.value.charCodeAt(0));
                    break;
                case ns.TLV_TYPE.SOURCE:
                    out.source = tlv.value;
                    debugOutput.push('from: ' + tlv.value);
                    break;
                case ns.TLV_TYPE.DEST:
                    out.dest = tlv.value;
                    debugOutput.push('to: ' + tlv.value);
                    break;
                case ns.TLV_TYPE.MESSAGE_TYPE:
                    out.messageType = tlv.value;
                    debugOutput.push('messageType: 0x'
                                     + out.getMessageTypeNumber().toString(16)
                                     + ' (' + out.getMessageTypeString() + ')');
                    break;
                case ns.TLV_TYPE.MEMBER:
                    out.members.push(tlv.value);
                    debugOutput.push('member: ' + tlv.value);
                    break;
                case ns.TLV_TYPE.INT_KEY:
                    out.intKeys.push(tlv.value);
                    debugOutput.push('intKey: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.NONCE:
                    out.nonces.push(tlv.value);
                    debugOutput.push('nonce: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.PUB_KEY:
                    out.pubKeys.push(tlv.value);
                    debugOutput.push('pubKey: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.SESSION_SIGNATURE:
                    out.sessionSignature = tlv.value;
                    debugOutput.push('sessionSignature: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.SIGNING_KEY:
                    out.signingKey = tlv.value;
                    debugOutput.push('signingKey: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.MESSAGE_SIGNATURE:
                    out.signature = tlv.value;
                    out.rawMessage = tlv.rest;
                    debugOutput.push('messageSignature: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.MESSAGE_IV:
                    out.iv = tlv.value;
                    debugOutput.push('messageIV: ' + btoa(tlv.value));
                    break;
                case ns.TLV_TYPE.DATA_MESSAGE:
                    out.data = tlv.value;
                    debugOutput.push('rawDataMessage: ' + btoa(out.data));
                    break;
                default:
                    _assert(false, 'Received unknown TLV type: ' + tlv.type);
                    break;
            }

            message = tlv.rest;
        }

        // Some specifics depending on the type of mpENC message.
        if (out.data) {
            // Some further crypto processing on data messages.
            out.data = ns.decryptDataMessage(out.data, groupKey, out.iv);
            debugOutput.push('decryptDataMessage: ' + out.data);
        } else {
            // Some sanity checks for keying messages.
            _assert(out.intKeys.length <= out.members.length,
                    'Number of intermediate keys cannot exceed number of members.');
            _assert(out.nonces.length <= out.members.length,
                    'Number of nonces cannot exceed number of members.');
            _assert(out.pubKeys.length <= out.members.length,
                    'Number of public keys cannot exceed number of members.');
        }

        // Debugging output.
        utils.dummyLogger('DEBUG', 'mpENC decoded message debug: ', debugOutput);

        // Check signature, if present.
        if (out.signature) {
            if (!pubKey) {
                var index = out.members.indexOf(out.source);
                pubKey = out.pubKeys[index];
            }
            try {
                out.signatureOk = ns.verifyDataMessage(out.rawMessage,
                                                       out.signature,
                                                       pubKey);
                _assert(out.signatureOk,
                        'Signature of message does not verify!');
            } catch (e) {
                out.signatureOk = false;
                _assert(out.signatureOk,
                        'Signature of message does not verify: ' + e + '!');
            }
        }

        _assert(out.protocol === version.PROTOCOL_VERSION,
                'Received wrong protocol version: ' + out.protocol.charCodeAt(0) + '.');

        return out;
    };


    /**
     * Inspects a given TLV encoded protocol message to extract information
     * on the message type.
     *
     * @param message {string}
     *     A binary message representation.
     * @returns {object}
     *     Message meta-data.
     */
    ns.inspectMessageContent = function(message) {
        if (!message) {
            return null;
        }
        var out = new ns.ProtocolMessageInfo();

        while (message.length > 0) {
            var tlv = ns.decodeTLV(message);
            switch (tlv.type) {
                case ns.TLV_TYPE.PROTOCOL_VERSION:
                    out.protocolVersion = tlv.value.charCodeAt(0);
                    break;
                case ns.TLV_TYPE.SOURCE:
                    out.from = tlv.value;
                    break;
                case ns.TLV_TYPE.DEST:
                    out.to = tlv.value || '';
                    break;
                case ns.TLV_TYPE.MESSAGE_TYPE:
                    out.messageType = (tlv.value.charCodeAt(0) << 8)
                                      | tlv.value.charCodeAt(1);
                    out.messageTypeString = ns.MESSAGE_TYPE_MAPPING[tlv.value];;
                    break;
                case ns.TLV_TYPE.MEMBER:
                    out.members.push(tlv.value);
                    break;
                case ns.TLV_TYPE.NONCE:
                    out.numNonces++;
                    break;
                case ns.TLV_TYPE.INT_KEY:
                    out.numIntKeys++;
                    break;
                case ns.TLV_TYPE.PUB_KEY:
                    out.numPubKeys++;
                    break;
                default:
                    // Ignoring all others.
                    break;
            }

            message = tlv.rest;
        }

        // Complete some details of the message.
        if (out.messageType !== null) {
            // Auxiliary vs. initial agreement.
            if (out.messageType & (1 << ns._AUX_BIT)) {
                out.agreement = 'auxiliary';
            } else {
                out.agreement = 'initial';
            }

            // Upflow or downflow.
            if (out.messageType & (1 << ns._DOWN_BIT)) {
                out.flow = 'down';
            } else {
                out.flow = 'up';
            }

            // Group Key Agreement.
            if (out.messageType & (1 << ns._GKA_BIT)) {
                out.agreement += ', GKE';
            }

            // Signature Key Exchange.
            if (out.messageType & (1 << ns._SKE_BIT)) {
                out.agreement += ', SKE';
            }

            // Operation.
            out.operation = _OPERATION_MAPPING[(out.messageType & ns._OPERATION_MASK)
                                               >>> ns._OP_BITS];

            // Initiator or participant.
            if (out.messageType & (1 << ns._INIT_BIT)) {
                out.origin = 'initiator';
            } else {
                out.origin = 'participant';
            }
            if (out.members.length === 0) {
                out.origin = '???';
            } else if (out.members.indexOf(out.source) >= 0) {
                out.origin = 'outsider';
            }

            // Recovery.
            if (out.messageType & (1 << ns._RECOVER_BIT)) {
                out.recover = true;
            }
        }
        return out;
    };


    /**
     * Determines of a messages message type.
     *
     * @param message {string}
     *     A wire protocol message representation.
     * @returns {string}
     *     The two byte message type string.
     */
    ns.getMessageType = function(message) {
        if (!message) {
            return undefined;
        }

        while (message.length > 0) {
            var tlv = ns.decodeTLV(message);
            if (tlv.type === ns.TLV_TYPE.MESSAGE_TYPE) {
                return tlv.value;
            }
            message = tlv.rest;
        }
        return undefined;
    };


    /**
     * Detects the category of a given message.
     *
     * @param message {string}
     *     A wire protocol message representation.
     * @returns {mpenc.codec.MESSAGE_CATEGORY}
     *     Object indicating message `category` and extracted message `content`.
     */
    ns.categoriseMessage = function(message) {
        if (!message) {
            return null;
        }

        // Check for plain text or "other".
        if (message.substring(0, _PROTOCOL_PREFIX.length) !== _PROTOCOL_PREFIX) {
            return { category: ns.MESSAGE_CATEGORY.PLAIN,
                     content: message };
        }
        message = message.substring(_PROTOCOL_PREFIX.length);

        // Check for error.
        var _ERROR_PREFIX = ' Error:';
        if (message.substring(0, _ERROR_PREFIX.length) === _ERROR_PREFIX) {
            return { category: ns.MESSAGE_CATEGORY.MPENC_ERROR,
                     content: message.substring(_PROTOCOL_PREFIX.length + 1) };
        }

        // Check for mpENC message.
        if ((message[0] === ':') && (message[message.length - 1] === '.')) {
            message = atob(message.substring(1, message.length - 1));
            if (ns.getMessageType(message) === ns.MESSAGE_TYPE.PARTICIPANT_DATA) {
                return { category: ns.MESSAGE_CATEGORY.MPENC_DATA_MESSAGE,
                         content: message };
            } else {
                return { category: ns.MESSAGE_CATEGORY.MPENC_GREET_MESSAGE,
                         content: message };
            }
        }

        // Check for query.
        var ver = /v(\d+)\?/.exec(message);
        if (ver && (ver[1] === '' + version.PROTOCOL_VERSION.charCodeAt(0))) {
            return { category: ns.MESSAGE_CATEGORY.MPENC_QUERY,
                     content: String.fromCharCode(ver[1]) };
        }

        _assert(false, 'Unknown mpENC message.');
    };


    /**
     * Encodes a given value to a binary TLV string of a given type.
     *
     * @param tlvType {integer}
     *     Type of string to use (16-bit unsigned integer).
     * @param value {string}
     *     A binary string of the pay load to carry. If omitted, no value
     *     (null) is used.
     * @returns {string}
     *     A binary TLV string.
     */
    ns.encodeTLV = function(tlvType, value) {
        if ((value === null) || (value === undefined)) {
            value = '';
        }
        value += '';
        var out = ns._short2bin(tlvType);
        out += ns._short2bin(value.length);
        return out + value;
    };


    /**
     * Encodes an array of values to a binary TLV string of a given type.
     *
     * @param tlvType {integer}
     *     Type of string to use (16-bit unsigned integer).
     * @param valueArray {Array}
     *     The array of values.
     * @returns {string}
     *     A binary TLV string.
     */
    ns._encodeTlvArray = function(tlvType, valueArray) {
        _assert((valueArray instanceof Array) || (valueArray === null),
                'Value passed neither an array or null.');

        // Trivial case, quick exit.
        if ((valueArray === null) || (valueArray.length === 0)) {
            return '';
        }

        var out = '';
        for (var i = 0; i < valueArray.length; i++) {
            out += ns.encodeTLV(tlvType, valueArray[i]);
        }
        return out;
    };


    /**
     * Encodes a given protocol message content into a binary string message
     * consisting of a sequence of TLV binary strings.
     *
     * @param message {mpenc.handler.ProtocolMessage}
     *     Message as JavaScript object.
     * @param groupKey {string}
     *     Symmetric group encryption key to encrypt message.
     * @param privKey {string}
     *     Sender's (ephemeral) private signing key.
     * @param pubKey {string}
     *     Sender's (ephemeral) public signing key.
     * @param paddingSize {integer}
     *     Number of bytes to pad the cipher text to come out as (default: 0
     *     to turn off padding). If the clear text will result in a larger
     *     cipher text than paddingSize, power of two exponential padding sizes
     *     will be used.
     * @returns {string}
     *     A binary message representation.
     */
    ns.encodeMessageContent = function(message, groupKey, privKey, pubKey, paddingSize) {
        var out = ns.encodeTLV(ns.TLV_TYPE.PROTOCOL_VERSION, version.PROTOCOL_VERSION);
        if (typeof(message) === 'string' || message instanceof String) {
            // We're dealing with a message containing user content.
            out += ns.encodeTLV(ns.TLV_TYPE.MESSAGE_TYPE,
                                ns.MESSAGE_TYPE.PARTICIPANT_DATA);
            var encrypted = ns.encryptDataMessage(message, groupKey, paddingSize);

            // We want message attributes in this order:
            // signature, protocol version, iv, message data
            out += ns.encodeTLV(ns.TLV_TYPE.MESSAGE_IV, encrypted.iv);
            out += ns.encodeTLV(ns.TLV_TYPE.DATA_MESSAGE, encrypted.data);
            // Sign `out` and prepend signature.
            var signature = ns.signDataMessage(out, privKey, pubKey);
            out = ns.encodeTLV(ns.TLV_TYPE.MESSAGE_SIGNATURE, signature) + out;
        } else {
            // Process message attributes in this order:
            // messageType, source, dest, members, intKeys, nonces, pubKeys,
            // sessionSignature, signingKey

            out += ns.encodeTLV(ns.TLV_TYPE.MESSAGE_TYPE, message.messageType);
            out += ns.encodeTLV(ns.TLV_TYPE.SOURCE, message.source);
            out += ns.encodeTLV(ns.TLV_TYPE.DEST, message.dest);
            if (message.members) {
                out += ns._encodeTlvArray(ns.TLV_TYPE.MEMBER, message.members);
            }
            if (message.intKeys) {
                out += ns._encodeTlvArray(ns.TLV_TYPE.INT_KEY, message.intKeys);
            }
            if (message.nonces) {
                out += ns._encodeTlvArray(ns.TLV_TYPE.NONCE, message.nonces);
            }
            if (message.pubKeys) {
                out += ns._encodeTlvArray(ns.TLV_TYPE.PUB_KEY, message.pubKeys);
            }
            if (message.sessionSignature) {
                out += ns.encodeTLV(ns.TLV_TYPE.SESSION_SIGNATURE, message.sessionSignature);
            }
            if (message.signingKey) {
                out += ns.encodeTLV(ns.TLV_TYPE.SIGNING_KEY, message.signingKey);
            }
            // Sign `out` and prepend signature.
            var signature = ns.signDataMessage(out, privKey, pubKey);
            out = ns.encodeTLV(ns.TLV_TYPE.MESSAGE_SIGNATURE, signature) + out;
        }

        return out;
    };


    /**
     * Encodes a given protocol message ready to be put onto the wire, using
     * base64 encoding for the binary message pay load.
     *
     * @param message {mpenc.handler.ProtocolMessage}
     *     Message as JavaScript object.
     * @param groupKey {string}
     *     Symmetric group encryption key to encrypt message.
     * @param privKey {string}
     *     Sender's (ephemeral) private signing key.
     * @param pubKey {string}
     *     Sender's (ephemeral) public signing key.
     * @param paddingSize {integer}
     *     Number of bytes to pad the cipher text to come out as (default: 0
     *     to turn off padding). If the clear text will result in a larger
     *     cipher text than paddingSize, power of two exponential padding sizes
     *     will be used.
     * @returns {string}
     *     A wire ready message representation.
     */
    ns.encodeMessage = function(message, groupKey, privKey, pubKey, paddingSize) {
        if (message === null || message === undefined) {
            return null;
        }
        paddingSize = paddingSize | 0;
        var content = ns.encodeMessageContent(message, groupKey, privKey,
                                              pubKey, paddingSize);
        return _PROTOCOL_PREFIX + ':' + btoa(content) + '.';
    };


    /**
     * Converts an unsigned short integer to a binary string.
     *
     * @param value {integer}
     *     A 16-bit unsigned integer.
     * @returns {string}
     *     A two character binary string.
     */
    ns._short2bin = function(value) {
        return String.fromCharCode(value >> 8) + String.fromCharCode(value & 0xff);
    };


    /**
     * Converts a binary string to an unsigned short integer.
     *
     * @param value {string}
     *     A two character binary string.
     * @returns {integer}
     *     A 16-bit unsigned integer.
     */
    ns._bin2short= function(value) {
        return (value.charCodeAt(0) << 8) | value.charCodeAt(1);
    };


    /**
     * Encrypts a given data message.
     *
     * The data message is encrypted using AES-128-CBC, and a new random IV is
     * generated and returned. The current encryption scheme works for messages
     * up to 2^16 bytes (64 KiB) in size.
     *
     * @param data {string}
     *     Binary string data message.
     * @param key {string}
     *     Binary string representation of 128-bit encryption key.
     * @param paddingSize {integer}
     *     Number of bytes to pad the cipher text to come out as (default: 0
     *     to turn off padding). If the clear text will result in a larger
     *     cipher text than paddingSize, power of two exponential padding sizes
     *     will be used.
     * @returns {Object}
     *     An object containing the message (in `data`, binary string) and
     *     the IV used (in `iv`, binary string).
     */
    ns.encryptDataMessage = function(data, key, paddingSize) {
        if (data === null || data === undefined) {
            return null;
        }
        paddingSize = paddingSize | 0;
        var keyBytes = new Uint8Array(jodid25519.utils.string2bytes(key));
        var ivBytes = new Uint8Array(utils._newKey08(128));
        // Protect multi-byte characters.
        var dataBytes = unescape(encodeURIComponent(data));
        // Prepend length in bytes to message.
        _assert(dataBytes.length < 0xffff,
                'Message size too large for encryption scheme.');
        dataBytes = ns._short2bin(dataBytes.length) + dataBytes;
        if (paddingSize) {
            // Compute exponential padding size, leaving one extra byte for
            // AES-CBC PKCS#5 padding.
            var exponentialPaddingSize = paddingSize
                                       * (1 << Math.ceil(Math.log(Math.ceil((dataBytes.length + 1) / paddingSize))
                                                         / Math.log(2)));
            var numPaddingBytes = exponentialPaddingSize - dataBytes.length;
            dataBytes += (new Array(numPaddingBytes)).join('\u0000');
        }
        var cipherBytes = asmCrypto.AES_CBC.encrypt(dataBytes, keyBytes, true, ivBytes);
        return { data: jodid25519.utils.bytes2string(cipherBytes),
                 iv: jodid25519.utils.bytes2string(ivBytes) };
    };


    /**
     * Decrypts a given data message.
     *
     * The data message is decrypted using AES-128-CBC.
     *
     * @param data {string}
     *     Binary string data message.
     * @param key {string}
     *     Binary string representation of 128-bit encryption key.
     * @param iv {string}
     *     Binary string representation of 128-bit IV (initialisation vector).
     * @returns {string}
     *     The clear text message as a binary string.
     */
    ns.decryptDataMessage = function(data, key, iv) {
        if (data === null || data === undefined) {
            return null;
        }
        var keyBytes = new Uint8Array(jodid25519.utils.string2bytes(key));
        var ivBytes = new Uint8Array(jodid25519.utils.string2bytes(iv));
        var clearBytes = asmCrypto.AES_CBC.decrypt(data, keyBytes, true, ivBytes);
        // Strip off message size and zero padding.
        var clearString = jodid25519.utils.bytes2string(clearBytes);
        var messageSize = ns._bin2short(clearString.slice(0, 2));
        clearString = clearString.slice(2, messageSize + 2);
        // Undo protection for multi-byte characters.
        return decodeURIComponent(escape(clearString));
    };


    /**
     * Signs a given data message with the ephemeral private key.
     *
     * This implementation is using the Edwards25519 for an ECDSA signature
     * mechanism to complement the Curve25519-based group key agreement.
     *
     * @param data {string}
     *     Binary string data message.
     * @param privKey {string}
     *     Binary string representation of the ephemeral private key.
     * @param pubKey {string}
     *     Binary string representation of the ephemeral public key.
     * @returns {string}
     *     Binary string representation of the signature.
     */
    ns.signDataMessage = function(data, privKey, pubKey) {
        if (data === null || data === undefined) {
            return null;
        }
        return jodid25519.eddsa.sign(data, privKey, pubKey);
    };


    /**
     * Checks the signature of a given data message with the ephemeral public key.
     *
     * This implementation is using the Edwards25519 for an ECDSA signature
     * mechanism to complement the Curve25519-based group key agreement.
     *
     * @param data {string}
     *     Binary string data message.
     * @param signature {string}
     *     Binary string representation of the signature.
     * @param pubKey {string}
     *     Binary string representation of the ephemeral public key.
     * @returns {bool}
     *     True if the signature verifies, false otherwise.
     */
    ns.verifyDataMessage = function(data, signature, pubKey) {
        if (data === null || data === undefined) {
            return null;
        }
        return jodid25519.eddsa.verify(signature, data, pubKey);
    };


    /**
     * Returns an mpENC protocol query message ready to be put onto the wire,
     * including.the given message.
     *
     * @param text {string}
     *     Text message to accompany the mpENC protocol query message.
     * @returns {string}
     *     A wire ready message representation.
     */
    ns.getQueryMessage = function(text) {
        return _PROTOCOL_PREFIX + 'v' + version.PROTOCOL_VERSION.charCodeAt(0) + '?' + text;
    };


    /**
     * Returns an mpENC protocol query message ready to be put onto the wire,
     * including.the given message.
     *
     * @param text {string}
     *     Text message to accompany the mpENC protocol error message.
     * @returns {string}
     *     A wire ready message representation.
     */
    ns.getErrorMessage = function(text) {
        return _PROTOCOL_PREFIX + ' Error:' + text + '.';
    };

    return ns;
});

/**
 * @fileOverview
 * Implementation of group key agreement based on CLIQUES.
 */

define('mpenc/greet/cliques',[
    "mpenc/helper/assert",
    "mpenc/helper/utils",
    "jodid25519"
], function(assert, utils, jodid25519) {
    

    /**
     * @exports mpenc/greet/cliques
     * Implementation of group key agreement based on CLIQUES.
     *
     * @description
     * <p>Implementation of group key agreement based on CLIQUES.</p>
     *
     * <p>
     * Michael Steiner, Gene Tsudik, and Michael Waidner. 2000.<br/>
     * "Key Agreement in Dynamic Peer Groups."<br/>
     * IEEE Trans. Parallel Distrib. Syst. 11, 8 (August 2000), 769-780.<br/>
     * DOI=10.1109/71.877936</p>
     *
     * <p>This implementation is using the Curve25519 for ECDH mechanisms as a base
     * extended for group key agreement.</p>
     */
    var ns = {};

    var _assert = assert.assert;

    /*
     * Created: 20 Jan 2014 Guy K. Kloss <gk@mega.co.nz>
     *
     * (c) 2014 by Mega Limited, Wellsford, New Zealand
     *     http://mega.co.nz/
     *     Simplified (2-clause) BSD License.
     *
     * You should have received a copy of the license along with this
     * program.
     *
     * This file is part of the multi-party chat encryption suite.
     *
     * This code is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
     */

    /**
     * Carries message content for the CLIQUES protocol.
     *
     * @param source
     *     Message originator (from).
     * @param dest
     *     Message destination (to).
     * @param agreement
     *     Type of key agreement. "ika" or "aka".
     * @param flow
     *     Direction of message flow. "up" or "down".
     * @param members
     *     List (array) of all participating members.
     * @param intKeys
     *     List (array) of intermediate keys to transmit.
     * @param debugKeys
     *     List (array) of keying debugging strings.
     * @returns {CliquesMessage}
     * @constructor
     *
     * @property source
     *     Message originator (from).
     * @property dest
     *     Message destination (to).
     * @property agreement
     *     Type of key agreement. "ika" or "aka".
     * @property flow
     *     Direction of message flow. "up" or "down".
     * @property members
     *     List (array) of all participating members.
     * @property intKeys
     *     List (array) of intermediate keys to transmit.
     * @property debugKeys
     *     List (array) of keying debugging strings.
     */
    ns.CliquesMessage = function(source, dest, agreement, flow, members,
                                 intKeys, debugKeys) {
        this.source = source || '';
        this.dest = dest || '';
        this.agreement = agreement || '';
        this.flow = flow || '';
        this.members = members || [];
        this.intKeys = intKeys || [];
        this.debugKeys = debugKeys || [];
        return this;
    };


    /**
     * Implementation of group key agreement based on CLIQUES.
     *
     * This implementation is using the Curve25519 for ECDH mechanisms as a base
     * extended for group key agreement.
     *
     * @constructor
     * @param id {string}
     *     Member's identifier string.
     * @returns {CliquesMember}
     *
     * @property id {string}
     *     Member's identifier string.
     * @property members
     *     List of all participants.
     * @property intKeys
     *     List (array) of intermediate keys for all participants. The key for
     *     each participant contains all others' contributions but the
     *     participant's one.
     * @property privKey
     *     This participant's private key.
     * @property privKeyId
     *     The ID of the private key (incrementing integer, starting from 0).
     * @property keyTimestamp
     *     Time stamp indicator when `privKey` was created/refreshed.
     *     Some monotonously increasing counter.
     * @property groupKey
     *     Shared secret, the group key.
     */
    ns.CliquesMember = function(id) {
        this.id = id;
        this.members = [];
        this.intKeys = null;
        this.privKey = null;
        this.privKeyId = 0;
        this.keyTimestamp = null;
        this.groupKey = null;
        // For debugging: Chain of all scalar multiplication keys.
        this._debugIntKeys = null;
        this._debugGroupKey = null;

        return this;
    };


    /**
     * Start the IKA (Initial Key Agreement) procedure for the given members.
     *
     * @method
     * @param otherMembers
     *     Iterable of other members for the group (excluding self).
     * @returns {CliquesMessage}
     */
    ns.CliquesMember.prototype.ika = function(otherMembers) {
        _assert(otherMembers && otherMembers.length !== 0, 'No members to add.');
        this.intKeys = null;
        this._debugIntKeys = null;
        this.privKey = null;
        this._debugPrivKey = null;
        var startMessage = new ns.CliquesMessage(this.id);
        startMessage.members = [this.id].concat(otherMembers);
        startMessage.agreement = 'ika';
        startMessage.flow = 'up';
        return this.upflow(startMessage);
    };


    /**
     * Start the IKA (Initial Key Agreement) for a full/complete refresh of
     * all keys.
     *
     * @returns {CliquesMessage}
     * @method
     */
    ns.CliquesMember.prototype.ikaFullRefresh = function() {
        // Start with the other members.
        var otherMembers = utils.clone(this.members);
        var myPos = otherMembers.indexOf(this.id);
        otherMembers.splice(myPos, 1);
        return this.ika(otherMembers);
    };


    /**
     * Start the AKA (Auxiliary Key Agreement) for joining new members.
     *
     * @method
     * @param newMembers
     *     Iterable of new members to join the group.
     * @returns {CliquesMessage}
     */
    ns.CliquesMember.prototype.akaJoin = function(newMembers) {
        _assert(newMembers && newMembers.length !== 0, 'No members to add.');
        var allMembers = this.members.concat(newMembers);
        _assert(utils._noDuplicatesInList(allMembers),
                'Duplicates in member list detected!');

        // Replace members list.
        this.members = allMembers;

        // Renew all keys.
        var retValue = this._renewPrivKey();

        // Start of AKA upflow, so we can't be the last member in the chain.
        // Add the new cardinal key.
        this.intKeys.push(retValue.cardinalKey);
        this._debugIntKeys.push(retValue.cardinalDebugKey);

        // Pass a message on to the first new member to join.
        var startMessage = new ns.CliquesMessage(this.id);
        startMessage.members = allMembers;
        startMessage.dest = newMembers[0];
        startMessage.agreement = 'aka';
        startMessage.flow = 'up';
        startMessage.intKeys = this.intKeys;
        startMessage.debugKeys = this._debugIntKeys;

        return startMessage;
    };


    /**
     * Start the AKA (Auxiliary Key Agreement) for excluding members.
     *
     * @method
     * @param excludeMembers
     *     Iterable of members to exclude from the group.
     * @returns {CliquesMessage}
     */
    ns.CliquesMember.prototype.akaExclude = function(excludeMembers) {
        _assert(excludeMembers && excludeMembers.length !== 0, 'No members to exclude.');
        _assert(utils._arrayIsSubSet(excludeMembers, this.members),
                'Members list to exclude is not a sub-set of previous members!');
        _assert(excludeMembers.indexOf(this.id) < 0,
                'Cannot exclude mysefl.');

        // Kick 'em.
        for (var i = 0; i < excludeMembers.length; i++) {
            var index = this.members.indexOf(excludeMembers[i]);
            this.members.splice(index, 1);
            this.intKeys.splice(index, 1);
            this._debugIntKeys.splice(index, 1);
        }

        // Renew all keys.
        var retValue = this._renewPrivKey();

        // Discard old and make new group key.
        this.groupKey = utils.sha256(retValue.cardinalKey);
        this._debugGroupKey = retValue.cardinalDebugKey;

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.CliquesMessage(this.id);
        broadcastMessage.members = this.members;
        broadcastMessage.agreement = 'aka';
        broadcastMessage.flow = 'down';
        broadcastMessage.intKeys = this.intKeys;
        broadcastMessage.debugKeys = this._debugIntKeys;

        return broadcastMessage;
    };


    /**
     * AKA (Auxiliary Key Agreement) for excluding members.
     *
     * For CLIQUES, there is no message flow involved.
     *
     * @method
     */
    ns.CliquesMember.prototype.akaQuit = function() {
        _assert(this.privKey !== null, 'Not participating.');

        // Kick myself out.
        var myPos = this.members.indexOf(this.id);
        if (myPos >= 0) {
            this.members.splice(myPos, 1);
            this.intKeys = [];
            this._debugIntKeys = [];
            this.privKey = null;
        }
    };


    /**
     * Start the AKA (Auxiliary Key Agreement) for refreshing the own private key.
     *
     * @returns {CliquesMessage}
     * @method
     */
    ns.CliquesMember.prototype.akaRefresh = function() {
        // Renew all keys.
        var retValue = this._renewPrivKey();

        // Discard old and make new group key.
        this.groupKey = null;
        this.groupKey = utils.sha256(retValue.cardinalKey);
        this._debugGroupKey = retValue.cardinalDebugKey;

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.CliquesMessage(this.id);
        broadcastMessage.members = this.members;
        broadcastMessage.agreement = 'aka';
        broadcastMessage.flow = 'down';
        broadcastMessage.intKeys = this.intKeys;
        broadcastMessage.debugKeys = this._debugIntKeys;

        return broadcastMessage;
    };


    /**
     * IKA/AKA upflow phase message processing.
     *
     * @method
     * @param message
     *     Received upflow message. See {@link CliquesMessage}.
     * @returns {CliquesMessage}
     */
    ns.CliquesMember.prototype.upflow = function(message) {
        _assert(utils._noDuplicatesInList(message.members),
                'Duplicates in member list detected!');
        _assert(message.intKeys.length <= message.members.length,
                'Too many intermediate keys on CLIQUES upflow!');

        this.members = message.members;
        this.intKeys = message.intKeys;
        this._debugIntKeys = message.debugKeys;
        if (this.intKeys.length === 0) {
            // We're the first, so let's initialise it.
            this.intKeys = [null];
            this._debugIntKeys = [null];
        }

        // To not confuse _renewPrivKey() in full refresh situation.
        if (message.agreement === 'ika') {
            this.privKey = null;
            this._debugPrivKey = null;
        }

        // Renew all keys.
        var result = this._renewPrivKey();
        var myPos = this.members.indexOf(this.id);

        // Clone message.
        message = utils.clone(message);
        if (myPos === this.members.length - 1) {
            // I'm the last in the chain:
            // Cardinal is secret key.
            this.groupKey = utils.sha256(result.cardinalKey);
            this._debugGroupKey = result.cardinalDebugKey;
            this._setKeys(this.intKeys, this._debugIntKeys);
            // Broadcast all intermediate keys.
            message.source = this.id;
            message.dest = '';
            message.flow = 'down';
        } else {
            // Add the new cardinal key.
            this.intKeys.push(result.cardinalKey);
            this._debugIntKeys.push(result.cardinalDebugKey);
            // Pass a message on to the next in line.
            message.source = this.id;
            message.dest = this.members[myPos + 1];
        }
        message.intKeys = this.intKeys;
        message.debugKeys = this._debugIntKeys;
        return message;
    };


    /**
     * Renew the private key, update the set of intermediate keys and return
     * the new cardinal key.
     *
     * @returns
     *     Cardinal key and cardinal debug key in an object.
     * @method
     * @private
     */
    ns.CliquesMember.prototype._renewPrivKey = function() {
        var myPos = this.members.indexOf(this.id);
        if (this.privKey) {
            // Patch our old private key into intermediate keys.
            this.intKeys[myPos] = jodid25519.dh.computeKey(this.privKey,
                                                           this.intKeys[myPos]);
            this._debugIntKeys[myPos] = ns._computeKeyDebug(this._debugPrivKey,
                                                            this._debugIntKeys[myPos]);
            this.privKey = null;
        }

        // Make a new private key.
        this.privKey = jodid25519.dh.generateKey();
        this.privKeyId++;
        this.keyTimestamp = Math.round(Date.now() / 1000);
        if (this._debugPrivKey) {
            this._debugPrivKey = this._debugPrivKey + "'";
        } else {
            this._debugPrivKey = this.id;
        }

        // Update intermediate keys.
        for (var i = 0; i < this.intKeys.length; i++) {
            if (i !== myPos) {
                this.intKeys[i] = jodid25519.dh.computeKey(this.privKey,
                                                           this.intKeys[i]);
                this._debugIntKeys[i] = ns._computeKeyDebug(this._debugPrivKey,
                                                            this._debugIntKeys[i]);
            }
        }

        // New cardinal is "own" intermediate scalar multiplied with our private.
        var cardinalKey = jodid25519.dh.computeKey(this.privKey,
                                                   this.intKeys[myPos]);
        return {
            cardinalKey: '' + cardinalKey,
            cardinalDebugKey: ns._computeKeyDebug(this._debugPrivKey,
                                                  this._debugIntKeys[myPos])
        };
    };

    /**
     * IKA downflow phase broadcast message receive.
     *
     * @method
     * @param message
     *     Received downflow broadcast message.
     */
    ns.CliquesMember.prototype.downflow = function(message) {
        _assert(utils._noDuplicatesInList(message.members),
                'Duplicates in member list detected!');
        if (message.agreement === 'ika') {
            _assert(utils.arrayEqual(this.members, message.members),
                    'Member list mis-match in CLIQUES protocol');
        }
        _assert(message.members.indexOf(this.id) >= 0,
                'Not in members list, must be excluded.');
        _assert(message.members.length === message.intKeys.length,
                'Mis-match intermediate key number for CLIQUES downflow.');
        this.members = message.members;
        this._setKeys(message.intKeys, message.debugKeys);
    };


    /**
     * Updates local state for group and intermediate keys.
     *
     * @method
     * @param intKeys
     *     Intermediate keys.
     * @param debugKeys
     *     Debug "key" sequences.
     * @private
     */
    ns.CliquesMember.prototype._setKeys = function(intKeys, debugKeys) {
        this.groupKey = null;
        this._debugGroupKey = null;

        // New objects for intermediate keys.
        var myPos = this.members.indexOf(this.id);
        this.intKeys = intKeys;
        this._debugIntKeys = debugKeys;
        this.groupKey = utils.sha256(jodid25519.dh.computeKey(this.privKey,
                                                              this.intKeys[myPos]));
        this._debugGroupKey = ns._computeKeyDebug(this._debugPrivKey,
                                                  this._debugIntKeys[myPos]);
    };


    /**
     * Debug version of `jodid25519.dh.computeKey()`.
     *
     * In case intKey is undefined, privKey will be multiplied with the curve's
     * base point.
     *
     * @param privKey
     *     Private key.
     * @param intKey
     *     Intermediate key.
     * @returns
     *     Scalar product of keys.
     * @private
     */
    ns._computeKeyDebug = function(privKey, intKey) {
        if (intKey) {
            return privKey + '*' + intKey;
        } else {
            return privKey + '*G';
        }
    };

    return ns;
});

/**
 * @fileOverview
 * Implementation of an authenticated Signature Key Exchange scheme.
 */

define('mpenc/greet/ske',[
    "mpenc/helper/assert",
    "mpenc/helper/utils",
    "jodid25519",
], function(assert, utils, jodid25519) {
    

    /**
     * @exports mpenc/greet/ske
     * Implementation of an authenticated Signature Key Exchange scheme.
     *
     * @description
     * <p>Implementation of an authenticated Signature Key Exchange scheme.</p>
     *
     * <p>
     * This scheme is trying to prevent replay attacks by the use of a nonce-based
     * session ID as described in </p>
     *
     * <p>
     * Jens-Matthias Bohli and Rainer Steinwandt. 2006.<br/>
     * "Deniable Group Key Agreement."<br/>
     * VIETCRYPT 2006, LNCS 4341, pp. 298-311.</p>
     *
     * <p>
     * This implementation is using the Edwards25519 for an ECDSA signature
     * mechanism to complement the Curve25519-based group key agreement.</p>
     */
    var ns = {};

    var _assert = assert.assert;

    /*
     * Created: 5 Feb 2014 Guy K. Kloss <gk@mega.co.nz>
     *
     * (c) 2014 by Mega Limited, Wellsford, New Zealand
     *     http://mega.co.nz/
     *     Simplified (2-clause) BSD License.
     *
     * You should have received a copy of the license along with this
     * program.
     *
     * This file is part of the multi-party chat encryption suite.
     *
     * This code is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
     */

    var MAGIC_NUMBER = 'acksig';

    /**
     * Carries message content for the authenticated signature key exchange.
     *
     * @constructor
     * @param source
     *     Message originator (from).
     * @param dest
     *     Message destination (to).
     * @param flow
     *     Message type.
     * @param members
     *     List (array) of all participating members.
     * @param nonces
     *     List (array) of all participants' nonces.
     * @param pubKeys
     *     List (array) of all participants' ephemeral public keys.
     * @param sessionSignature
     *     Signature to acknowledge the session.
     * @returns {SignatureKeyExchangeMessage}
     *
     * @property source {string}
     *     Sender participant ID of message.
     * @property dest {string}
     *     Destination participatn ID of message (empty for broadcast).
     * @property flow {string}
     *     Flow direction of message ('up' or 'down').
     * @property members {Array}
     *     Participant IDs of members.
     * @property nonces {Array}
     *     Nonces of members.
     * @property pubKeys {Array}
     *     Ephemeral public signing key of members.
     * @property sessionSignature {string}
     *     Session acknowledgement signature using sender's static key.
     * @property signingKey {string}
     *     Ephemeral private signing key for session (upon quitting participation).
     */
    ns.SignatureKeyExchangeMessage = function(source, dest, flow, members,
                                              nonces, pubKeys, sessionSignature) {
        this.source = source || '';
        this.dest = dest || '';
        this.flow = flow || '';
        this.members = members || [];
        this.nonces = nonces || [];
        this.pubKeys = pubKeys || [];
        this.sessionSignature = sessionSignature || null;
        this.signingKey = null;

        return this;
    };


    /**
     * Implementation of the authenticated signature key exchange.
     *
     * This implementation is using Edwards25519 ECDSA signatures.
     *
     * @constructor
     * @param id {string}
     *     Member's identifier string.
     * @returns {SignatureKeyExchangeMember}
     *
     * @property id {string}
     *     Member's identifier string.
     * @property members
     *     List of all participants.
     * @property authenticatedMembers
     *     List of boolean authentication values for members.
     * @property ephemeralPrivKey
     *     Own ephemeral private signing key.
     * @property ephemeralPubKey
     *     Own ephemeral public signing key.
     * @property nonce
     *     Own nonce value for this session.
     * @property nonces
     *     Nonce values of members for this session.
     * @property ephemeralPubKeys
     *     Ephemeral signing keys for members.
     * @property sessionId
     *     Session ID of this session.
     * @property staticPrivKey
     *     Own static (long term) signing key.
     * @property staticPubKeyDir
     *     "Directory" of static public keys, using the participant ID as key.
     * @property oldEphemeralKeys
     *     "Directory" of previous participants' ephemeral keys, using the
     *     participant ID as key. The entries contain an object with one or more of
     *     the members `priv`, `pub` and `authenticated` (if the key was
     *     successfully authenticated).
     */
    ns.SignatureKeyExchangeMember = function(id) {
        this.id = id;
        this.members = [];
        this.authenticatedMembers = null;
        this.ephemeralPrivKey = null;
        this.ephemeralPubKey = null;
        this.nonce = null;
        this.nonces = null;
        this.ephemeralPubKeys = null;
        this.sessionId = null;
        this.staticPrivKey = null;
        this.staticPubKeyDir = null;
        this.oldEphemeralKeys = {};
        return this;
    };


    /**
     * Start the upflow for the the commit (nonce values and ephemeral public keys).
     *
     * @param otherMembers
     *     Iterable of other members for the group (excluding self).
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.commit = function(otherMembers) {
        _assert(otherMembers && otherMembers.length !== 0, 'No members to add.');
        this.ephemeralPubKeys = null;
        var startMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'up');
        startMessage.members = [this.id].concat(otherMembers);
        this.nonce = null;
        this.nonces = [];
        this.ephemeralPubKeys = [];
        return this.upflow(startMessage);
    };


    /**
     * SKE upflow phase message processing.
     *
     * @param message
     *     Received upflow message. See {@link SignatureKeyExchangeMessage}.
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.upflow = function(message) {
        _assert(utils._noDuplicatesInList(message.members),
                'Duplicates in member list detected!');
        _assert(message.nonces.length <= message.members.length,
                'Too many nonces on ASKE upflow!');
        _assert(message.pubKeys.length <= message.members.length,
                'Too many pub keys on ASKE upflow!');
        var myPos = message.members.indexOf(this.id);
        _assert(myPos >= 0, 'Not member of this key exchange!');

        this.members = utils.clone(message.members);
        this.nonces = utils.clone(message.nonces);
        this.ephemeralPubKeys = utils.clone(message.pubKeys);

        // Make new nonce and ephemeral signing key pair.
        this.nonce = jodid25519.eddsa.generateKeySeed();
        this.nonces.push(this.nonce);
        if (!this.ephemeralPrivKey) {
            // Only generate a new key if we don't have one.
            // We might want to recover and just re-run the protocol.
            this.ephemeralPrivKey = jodid25519.eddsa.generateKeySeed();
        }
        this.ephemeralPubKey = jodid25519.eddsa.publicKey(this.ephemeralPrivKey);
        this.ephemeralPubKeys.push(this.ephemeralPubKey);

        // Clone message.
        message = utils.clone(message);

        // Pass on a message.
        if (myPos === this.members.length - 1) {
            // Compute my session ID.
            this.sessionId = ns._computeSid(this.members, this.nonces);
            // I'm the last in the chain:
            // Broadcast own session authentication.
            message.source = this.id;
            message.dest = '';
            message.flow = 'down';
            this.discardAuthentications();
            message.sessionSignature = this._computeSessionSig();
        } else {
            // Pass a message on to the next in line.
            message.source = this.id;
            message.dest = this.members[myPos + 1];
        }
        message.nonces = utils.clone(this.nonces);
        message.pubKeys = utils.clone(this.ephemeralPubKeys);
        return message;
    };


    /**
     * Computes a session acknowledgement signature sigma(m) of a message
     * m = (pid_i, E_i, k_i, sid) using the static private key.
     *
     * @returns
     *     Session signature.
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype._computeSessionSig = function() {
        _assert(this.sessionId, 'Session ID not available.');
        _assert(this.ephemeralPubKey, 'No ephemeral key pair available.');
        var sessionAck = MAGIC_NUMBER + this.id + this.ephemeralPubKey
                       + this.nonce + this.sessionId;
        var hashValue = utils.sha256(sessionAck);
        return jodid25519.eddsa.sign(hashValue, this.staticPrivKey,
                                     this.staticPubKeyDir.get(this.id));
    };


    /**
     * Verifies a session acknowledgement signature sigma(m) of a message
     * m = (pid_i, E_i, k_i, sid) using the static public key.
     *
     * @param memberId
     *     Participant ID of the member to verify the signature against.
     * @param signature
     *     Session acknowledgement signature.
     * @returns
     *     Whether the signature verifies against the member's static public key.
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype._verifySessionSig = function(memberId, signature) {
        _assert(this.sessionId, 'Session ID not available.');
        var memberPos = this.members.indexOf(memberId);
        _assert(memberPos >= 0, 'Member not in participants list.');
        _assert(this.ephemeralPubKeys[memberPos],
                "Member's ephemeral pub key missing.");
        _assert(this.staticPubKeyDir.get(memberId),
                "Member's static pub key missing.");
        var sessionAck = MAGIC_NUMBER + memberId + this.ephemeralPubKeys[memberPos]
                       + this.nonces[memberPos] + this.sessionId;
        var hashValue = utils.sha256(sessionAck);
        return jodid25519.eddsa.verify(signature, hashValue,
                                       this.staticPubKeyDir.get(memberId));
    };


    /**
     * SKE downflow phase message processing.
     *
     * Returns null for the case that it has sent a downflow message already.
     *
     * @param message
     *     Received downflow message. See {@link SignatureKeyExchangeMessage}.
     * @returns {SignatureKeyExchangeMessage} or null.
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.downflow = function(message) {
        _assert(utils._noDuplicatesInList(message.members),
                'Duplicates in member list detected!');
        var myPos = message.members.indexOf(this.id);

        // Generate session ID for received information.
        var sid = ns._computeSid(message.members, message.nonces);

        // Is this a broadcast for a new session?
        var existingSession = (this.sessionId === sid);
        if (!existingSession) {
            this.members = utils.clone(message.members);
            this.nonces = utils.clone(message.nonces);
            this.ephemeralPubKeys = utils.clone(message.pubKeys);
            this.sessionId = sid;
            this.discardAuthentications();
        }

        // Verify the session authentication from sender.
        var isValid = this._verifySessionSig(message.source,
                                             message.sessionSignature);
        _assert(isValid, 'Authentication of member failed: ' + message.source);
        var senderPos = message.members.indexOf(message.source);
        this.authenticatedMembers[senderPos] = true;

        if (existingSession) {
            // We've acknowledged already, so no more broadcasts from us.
            return null;
        }

        // Clone message.
        message = utils.clone(message);
        // We haven't acknowledged, yet, so pass on the message.
        message.source = this.id;
        message.sessionSignature = this._computeSessionSig();

        return message;
    };


    /**
     * Returns true if the authenticated signature key exchange is fully
     * acknowledged.
     *
     * @returns {bool}
     *     True on a valid session.
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.isSessionAcknowledged = function() {
        if (this.authenticatedMembers && (this.authenticatedMembers.length > 0)) {
            return this.authenticatedMembers.every(function(item) { return item; });
        } else {
            return false;
        }
    };


    /**
     * Returns the ephemeral public signing key of a participant.
     *
     * @param participantId
     *     Participant ID of the member to query for.
     * @returns {string}
     *     The binary string of the key or `undefined` if unknown.
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.getMemberEphemeralPubKey = function(participantId) {
        var index = this.members.indexOf(participantId);
        if (index >= 0) {
            return this.ephemeralPubKeys[index];
        } else {
            var record = this.oldEphemeralKeys[participantId];
            if (record) {
                return record.pub;
            }
        }
    };


    /**
     * Discard all authentications, and set only self to authenticated.
     *
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.discardAuthentications = function() {
        var myPos = this.members.indexOf(this.id);
        this.authenticatedMembers = utils._arrayMaker(this.members.length, false);
        this.authenticatedMembers[myPos] = true;
    }


    /**
     * Start a new upflow for joining new members.
     *
     * @param newMembers
     *     Iterable of new members to join the group.
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.join = function(newMembers) {
        _assert(newMembers && newMembers.length !== 0, 'No members to add.');
        var allMembers = this.members.concat(newMembers);
        _assert(utils._noDuplicatesInList(allMembers),
                'Duplicates in member list detected!');
        this.members = allMembers;
        this.discardAuthentications();

        // Pass a message on to the first new member to join.
        var startMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'up');
        startMessage.dest = newMembers[0];
        startMessage.members = utils.clone(allMembers);
        startMessage.nonces = utils.clone(this.nonces);
        startMessage.pubKeys = utils.clone(this.ephemeralPubKeys);

        return startMessage;
    };


    /**
     * Start a new downflow for excluding members.
     *
     * @param excludeMembers
     *     Iterable of members to exclude from the group.
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.exclude = function(excludeMembers) {
        _assert(excludeMembers && excludeMembers.length !== 0, 'No members to exclude.');
        _assert(utils._arrayIsSubSet(excludeMembers, this.members),
                'Members list to exclude is not a sub-set of previous members!');
        _assert(excludeMembers.indexOf(this.id) < 0,
                'Cannot exclude mysefl.');

        // Kick 'em.
        for (var i = 0; i < excludeMembers.length; i++) {
            var index = this.members.indexOf(excludeMembers[i]);
            this.oldEphemeralKeys[excludeMembers[i]] = {
                pub: this.ephemeralPubKeys[index] || null,
                authenticated: this.authenticatedMembers[index] || false,
            };
            this.members.splice(index, 1);
            this.nonces.splice(index, 1);
            this.ephemeralPubKeys.splice(index, 1);
        }

        // Compute my session ID.
        this.sessionId = ns._computeSid(this.members, this.nonces);

        this.discardAuthentications();

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'down');
        broadcastMessage.members = utils.clone(this.members);
        broadcastMessage.nonces = utils.clone(this.nonces);
        broadcastMessage.pubKeys = utils.clone(this.ephemeralPubKeys);
        broadcastMessage.sessionSignature = this._computeSessionSig();

        return broadcastMessage;
    };


    /**
     * Quit own participation and publish the ephemeral signing key.
     *
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.quit = function() {
        _assert(this.ephemeralPrivKey !== null, 'Not participating.');

        // Kick myself out.
        var myPos = this.members.indexOf(this.id);
        this.oldEphemeralKeys[this.id] = {
            pub: this.ephemeralPubKey,
            priv: this.ephemeralPrivKey,
            authenticated: false
        };
        if (this.authenticatedMembers) {
            this.oldEphemeralKeys[this.id].authenticated = this.authenticatedMembers[myPos];
            this.authenticatedMembers.splice(myPos, 1);
        }
//        this.ephemeralPubKey = null;
//        this.ephemeralPrivKey = null;
        if (this.members) {
            this.members.splice(myPos, 1);
        }
        if (this.nonces) {
            this.nonces.splice(myPos, 1);
        }
        if (this.ephemeralPubKeys) {
            this.ephemeralPubKeys.splice(myPos, 1);
        }

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'down');
        broadcastMessage.signingKey = this.oldEphemeralKeys[this.id].priv;

        return broadcastMessage;
    };


    /**
     * Fully re-run whole key agreements, but retain the ephemeral signing key.
     *
     * @returns {SignatureKeyExchangeMessage}
     * @method
     */
    ns.SignatureKeyExchangeMember.prototype.fullRefresh = function() {
        // Store away old ephemeral keys of members.
        for (var i = 0; i < this.members.length; i++) {
            if (this.ephemeralPubKeys && (i < this.ephemeralPubKeys.length)) {
                this.oldEphemeralKeys[this.members[i]] = {
                    pub: this.ephemeralPubKeys[i],
                    priv: null,
                };
                if (this.ephemeralPubKeys && (i < this.authenticatedMembers.length)) {
                    this.oldEphemeralKeys[this.members[i]].authenticated = this.authenticatedMembers[i];
                } else {
                    this.oldEphemeralKeys[this.members[i]].authenticated = false;
                }
            }
        }
        this.oldEphemeralKeys[this.id].priv = this.ephemeralPrivKey;

        // Force complete new exchange of session info.
        this.sessionId = null;

        // Start with the other members.
        var otherMembers = utils.clone(this.members);
        var myPos = otherMembers.indexOf(this.id);
        otherMembers.splice(myPos, 1);
        return this.commit(otherMembers);
    };


    /**
     * Computes the session ID.
     *
     * @param members
     *     Members participating in protocol.
     * @param nonces
     *     Nonces of the members in matching order.
     * @returns
     *     Session ID as binary string.
     */
    ns._computeSid = function(members, nonces) {
        // Create a mapping to access sorted/paired items later.
        var mapping = {};
        for (var i = 0; i < members.length; i++) {
            mapping[members[i]] = nonces[i];
        }
        var sortedMembers = members.concat();
        sortedMembers.sort();

        // Compose the item chain.
        var pidItems = '';
        var nonceItems = '';
        for (var i = 0; i < sortedMembers.length; i++) {
            var pid = sortedMembers[i];
            if (pid) {
                pidItems += pid;
                nonceItems += mapping[pid];
            }
        }
        return utils.sha256(pidItems + nonceItems);
    };

    return ns;
});

/**
 * @fileOverview
 * Implementation of a protocol handler with its state machine.
 */

define('mpenc/handler',[
    "mpenc/helper/assert",
    "mpenc/helper/utils",
    "mpenc/greet/cliques",
    "mpenc/greet/ske",
    "mpenc/codec",
], function(assert, utils, cliques, ske, codec) {
    

    /**
     * @exports mpenc/handler
     * Implementation of a protocol handler with its state machine.
     *
     * @description
     * <p>Implementation of a protocol handler with its state machine.</p>
     *
     * <p>
     * This protocol handler manages the message flow for user authentication,
     * authenticated signature key exchange, and group key agreement.</p>
     *
     * <p>
     * This implementation is using the an authenticated signature key exchange that
     * also provides participant authentication as well as a CLIQUES-based group
     * key agreement.</p>
     */
    var ns = {};

    var _assert = assert.assert;

    /*
     * Created: 27 Feb 2014 Guy K. Kloss <gk@mega.co.nz>
     *
     * (c) 2014 by Mega Limited, Wellsford, New Zealand
     *     http://mega.co.nz/
     *     Simplified (2-clause) BSD License.
     *
     * You should have received a copy of the license along with this
     * program.
     *
     * This file is part of the multi-party chat encryption suite.
     *
     * This code is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
     */


    /**
     * "Enumeration" defining the different stable and intermediate states of
     * the mpENC module.
     *
     * @property NULL {integer}
     *     Uninitialised (default) state.
     * @property INIT_UPFLOW {integer}
     *     During process of initial protocol upflow.
     * @property INIT_DOWNFLOW {integer}
     *     During process of initial protocol downflow.
     * @property READY {integer}
     *     Default state during general usage of mpENC. No protocol/key
     *     negotiation going on, and a valid group key is available.
     * @property AUX_UPFLOW {integer}
     *     During process of auxiliary protocol upflow.
     * @property AUX_DOWNFLOW {integer}
     *     During process of auxiliary protocol downflow.
     * @property QUIT {integer}
     *     After quitting participation.
     */
    ns.STATE = {
        NULL:          0x00,
        INIT_UPFLOW:   0x01,
        INIT_DOWNFLOW: 0x02,
        READY:   0x03,
        AUX_UPFLOW:    0x04,
        AUX_DOWNFLOW:  0x05,
        QUIT:          0x06,
    };

    // Add reverse mapping to string representation.
    var _STATE_MAPPING = {};
    for (var propName in ns.STATE) {
        _STATE_MAPPING[ns.STATE[propName]] = propName;
    }


    /** Default size in bytes for the exponential padding to pad to. */
    ns.DEFAULT_EXPONENTIAL_PADDING = 128;

    /**
     * Implementation of a protocol handler with its state machine.
     *
     * @constructor
     * @param id {string}
     *     Member's identifier string.
     * @param privKey {string}
     *     This participant's static/long term private key.
     * @param pubKey {string}
     *     This participant's static/long term public key.
     * @param staticPubKeyDir {object}
     *     An object with a `get(key)` method, returning the static public key of
     *     indicated by member ID `ky`.
     * @param queueUpdatedCallback {Function}
     *      A callback function, that will be called every time something was
     *      added to `protocolOutQueue`, `messageOutQueue` or `uiQueue`.
     * @param stateUpdatedCallback {Function}
     *      A callback function, that will be called every time the `state` is
     *      changed.
     * @param exponentialPadding {integer}
     *     Number of bytes to pad the cipher text to come out as (0 to turn off
     *     padding). If the clear text will result in a larger cipher text than
     *     exponentialPadding, power of two exponential padding sizes will be
     *     used.
     * @returns {ProtocolHandler}
     *
     * @property id {string}
     *     Member's identifier string.
     * @property privKey {string}
     *     This participant's static/long term private key.
     * @property pubKey {string}
     *     This participant's static/long term public key.
     * @property staticPubKeyDir {object}
     *     An object with a `get(key)` method, returning the static public key of
     *     indicated by member ID `ky`.
     * @property protocolOutQueue {Array}
     *     Queue for outgoing protocol related (non-user) messages, prioritised
     *     in processing over user messages.
     * @property messageOutQueue {Array}
     *     Queue for outgoing user content messages.
     * @property uiQueue {Array}
     *     Queue for messages to display in the UI. Contains objects with
     *     attributes `type` (can be strings 'message', 'info', 'warn' and
     *     'error') and `message`.
     * @property askeMember {SignatureKeyExchangeMember}
     *      Reference to signature key exchange protocol handler with the same
     *      participant ID.
     * @property cliquesMember {CliquesMember}
     *     Reference to CLIQUES protocol handler with the same participant ID.
     * @property state {integer}
     *     Current state of the mpENC protocol handler according to {STATE}.
     * @property recovering {bool}
     *     `true` if in recovery mode state, usually `false`.
     * @property exponentialPadding {integer}
     *     Number of bytes to pad the cipher text to come out as (0 to turn off
     *     padding). If the clear text will result in a larger cipher text than
     *     exponentialPadding, power of two exponential padding sizes will be
     *     used.
     */
    ns.ProtocolHandler = function(id, privKey, pubKey, staticPubKeyDir,
                                  queueUpdatedCallback, stateUpdatedCallback,
                                  exponentialPadding) {
        this.id = id;
        this.privKey = privKey;
        this.pubKey = pubKey;
        this.staticPubKeyDir = staticPubKeyDir;
        this.protocolOutQueue = [];
        this.messageOutQueue = [];
        this.uiQueue = [];
        this.queueUpdatedCallback = queueUpdatedCallback || function() {};
        this.stateUpdatedCallback = stateUpdatedCallback || function() {};
        this.state = ns.STATE.NULL;
        this.recovering = false;
        this.exponentialPadding = exponentialPadding || ns.DEFAULT_EXPONENTIAL_PADDING;

        // Sanity check.
        _assert(this.id && this.privKey && this.pubKey && this.staticPubKeyDir,
                'Constructor call missing required parameters.');

        // Make protocol handlers for sub tasks.
        this.cliquesMember = new cliques.CliquesMember(this.id);
        this.askeMember = new ske.SignatureKeyExchangeMember(this.id);
        this.askeMember.staticPrivKey = privKey;
        this.askeMember.staticPubKeyDir = staticPubKeyDir;

        return this;
    };


    /**
     * Mechanism to start the protocol negotiation with the group participants.
     *
     * @method
     * @param otherMembers {Array}
     *     Iterable of other members for the group (excluding self).
     * @returns {mpenc.codec.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._start = function(otherMembers) {
        _assert(otherMembers && otherMembers.length !== 0, 'No members to add.');

        var cliquesMessage = this.cliquesMember.ika(otherMembers);
        var askeMessage = this.askeMember.commit(otherMembers);

        var protocolMessage = this._mergeMessages(cliquesMessage, askeMessage);
        if (this.recovering) {
            protocolMessage.messageType = codec.MESSAGE_TYPE.RECOVER_INIT_INITIATOR_UP;
        } else {
            protocolMessage.messageType = codec.MESSAGE_TYPE.INIT_INITIATOR_UP;
        }
        return protocolMessage;
    };


    /**
     * Start the protocol negotiation with the group participants.
     *
     * @method
     * @param otherMembers {Array}
     *     Iterable of other members for the group (excluding self).
     */
    ns.ProtocolHandler.prototype.start = function(otherMembers) {
        _assert(this.state === ns.STATE.NULL,
                'start() can only be called from an uninitialised state.');
        utils.dummyLogger('DEBUG', 'Invoking initial START flow operation.');
        this.state = ns.STATE.INIT_UPFLOW;
        this.stateUpdatedCallback(this);

        var outContent = this._start(otherMembers);
        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }
    };


    /**
     * Mechanism to start a new upflow for joining new members.
     *
     * @method
     * @param newMembers {Array}
     *     Iterable of new members to join the group.
     * @returns {mpenc.codec.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._join = function(newMembers) {
        _assert(newMembers && newMembers.length !== 0, 'No members to add.');

        var cliquesMessage = this.cliquesMember.akaJoin(newMembers);
        var askeMessage = this.askeMember.join(newMembers);

        var protocolMessage = this._mergeMessages(cliquesMessage, askeMessage);
        protocolMessage.messageType = codec.MESSAGE_TYPE.JOIN_AUX_INITIATOR_UP;
        return protocolMessage;
    };


    /**
     * Start a new upflow for joining new members.
     *
     * @method
     * @param newMembers {Array}
     *     Iterable of new members to join the group.
     */
    ns.ProtocolHandler.prototype.join = function(newMembers) {
        _assert(this.state === ns.STATE.READY,
                'join() can only be called from a ready state.');
        utils.dummyLogger('DEBUG', 'Invoking JOIN flow operation.');
        this.state = ns.STATE.AUX_UPFLOW;
        this.stateUpdatedCallback(this);

        var outContent = this._join(newMembers);
        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }
    };


    /**
     * Mechanism to start a new downflow for excluding members.
     *
     * @method
     * @param excludeMembers {Array}
     *     Iterable of members to exclude from the group.
     * @returns {mpenc.codec.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._exclude = function(excludeMembers) {
        _assert(excludeMembers && excludeMembers.length !== 0, 'No members to exclude.');
        _assert(excludeMembers.indexOf(this.id) < 0,
                'Cannot exclude mysefl.');

        var cliquesMessage = this.cliquesMember.akaExclude(excludeMembers);
        var askeMessage = this.askeMember.exclude(excludeMembers);

        var protocolMessage = this._mergeMessages(cliquesMessage, askeMessage);
        if (this.recovering) {
            protocolMessage.messageType = codec.MESSAGE_TYPE.RECOVER_EXCLUDE_AUX_INITIATOR_DOWN;
        } else {
            protocolMessage.messageType = codec.MESSAGE_TYPE.EXCLUDE_AUX_INITIATOR_DOWN;
        }

        return protocolMessage;
    };


    /**
     * Start a new downflow for excluding members.
     *
     * @method
     * @param excludeMembers {Array}
     *     Iterable of members to exclude from the group.
     */
    ns.ProtocolHandler.prototype.exclude = function(excludeMembers) {
        if (this.recovering) {
            _assert((this.state === ns.STATE.INIT_DOWNFLOW)
                    || (this.state === ns.STATE.AUX_DOWNFLOW),
                    'exclude() for recovery can only be called from a ready or downflow state.');
        } else {
            _assert(this.state === ns.STATE.READY,
                    'exclude() can only be called from a ready state.');
        }
        utils.dummyLogger('DEBUG', 'Invoking EXCLUDE flow operation.');
        this.state = ns.STATE.AUX_DOWNFLOW;
        this.stateUpdatedCallback(this);

        var outContent = this._exclude(excludeMembers);
        if (outContent.members.length === 1) {
            // Last-man-standing case,
            // as we won't be able to complete the protocol flow.
            this.quit();
            return;
        }

        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }

        if (this.askeMember.isSessionAcknowledged()) {
            this.state = ns.STATE.READY;
            this.recovering = false;
            this.stateUpdatedCallback(this);
        }
    };


    /**
     * Mechanism to start the downflow for quitting participation.
     *
     * @returns {mpenc.codec.ProtocolMessage}
     *     Un-encoded message content.
     * @method
     */
    ns.ProtocolHandler.prototype._quit = function() {
        this.cliquesMember.akaQuit();
        var askeMessage = this.askeMember.quit();

        var protocolMessage = this._mergeMessages(null, askeMessage);
        protocolMessage.messageType = codec.MESSAGE_TYPE.QUIT_DOWN;
        return protocolMessage;
    };


    /**
     * Start the downflow for quitting participation.
     *
     * @method
     */
    ns.ProtocolHandler.prototype.quit = function() {
        if (this.state === ns.STATE.QUIT) {
            // Nothing do do here.
            return;
        }
        _assert(this.askeMember.ephemeralPrivKey !== null,
                'Not participating.');
        utils.dummyLogger('DEBUG',
                          'Invoking QUIT request containing private signing key.');
        this.state = ns.STATE.QUIT;
        this.stateUpdatedCallback(this);

        var outContent = this._quit();
        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }
    };


    /**
     * Mechanism to refresh group key.
     *
     * @returns {mpenc.codec.ProtocolMessage}
     *     Un-encoded message content.
     * @method
     */
    ns.ProtocolHandler.prototype._refresh = function() {
        var cliquesMessage = this.cliquesMember.akaRefresh();

        var protocolMessage = this._mergeMessages(cliquesMessage, null);
        if (this.recovering) {
            protocolMessage.messageType = codec.MESSAGE_TYPE.RECOVER_REFRESH_AUX_INITIATOR_DOWN;
        } else {
            protocolMessage.messageType = codec.MESSAGE_TYPE.REFRESH_AUX_INITIATOR_DOWN;
        }
        return protocolMessage;
    };


    /**
     * Refresh group key.
     *
     * @method
     */
    ns.ProtocolHandler.prototype.refresh = function() {
        _assert((this.state === ns.STATE.READY)
                || (this.state === ns.STATE.INIT_DOWNFLOW)
                || (this.state === ns.STATE.AUX_DOWNFLOW),
                'refresh() can only be called from a ready or downflow states.');
        utils.dummyLogger('DEBUG', 'Invoking REFRESH flow operation.');
        this.state = ns.STATE.READY;
        this.refreshing = false;
        this.stateUpdatedCallback(this);

        var outContent = this._refresh();
        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }
    };


    /**
     * Fully re-run whole key agreements, but retain the ephemeral signing key.
     *
     * @param keepMembers {Array}
     *     Iterable of members to keep in the group (exclude others). This list
     *     should include the one self. (Optional parameter.)
     * @method
     */
    ns.ProtocolHandler.prototype.fullRefresh = function(keepMembers) {
        this.state = ns.STATE.INIT_UPFLOW;
        this.stateUpdatedCallback(this);

        // Remove ourselves from members list to keep (if we're in there).
        var otherMembers = utils.clone(this.cliquesMember.members);
        if (keepMembers) {
            otherMembers = utils.clone(keepMembers);
        }
        var myPos = otherMembers.indexOf(this.id);
        if (myPos >= 0) {
            otherMembers.splice(myPos, 1);
        }

        // Now start a normal upflow for an initial agreement.
        var outContent = this._start(otherMembers);
        if (outContent.members.length === 1) {
            // Last-man-standing case,
            // as we won't be able to complete the protocol flow.
            this.quit();
            return;
        }

        if (outContent) {
            var outMessage = {
                from: this.id,
                to: outContent.dest,
                message: codec.encodeMessage(outContent, null,
                                             this.askeMember.ephemeralPrivKey,
                                             this.askeMember.ephemeralPubKey),
            };
            this.protocolOutQueue.push(outMessage);
            this.queueUpdatedCallback(this);
        }
    };


    /**
     * Recover from protocol failure.
     *
     * An attempt is made to do so with as little protocol overhead as possible.
     *
     * @param keepMembers {Array}
     *     Iterable of members to keep in the group (exclude others). This list
     *     should include the one self. (Optional parameter.)
     * @method
     */
    ns.ProtocolHandler.prototype.recover = function(keepMembers) {
        utils.dummyLogger('DEBUG', 'Invoking RECOVER flow operation.');
        var toKeep = [];
        var toExclude = [];

        if (keepMembers && (keepMembers.length > 0)) {
            // Sort through keepMembers (they may be in "odd" order).
            for (var i = 0; i < this.askeMember.members.length; i++) {
                var index = keepMembers.indexOf(this.askeMember.members[i]);
                if (index < 0) {
                    toExclude.push(this.askeMember.members[i]);
                } else {
                    toKeep.push(this.askeMember.members[i]);
                }
            }
            _assert(toKeep.length === keepMembers.length,
                    'Mismatch between members to keep and current members.');
        }

        this.recovering = true;
        if ((this.state === ns.STATE.READY)
                || (this.state === ns.STATE.INIT_DOWNFLOW)
                || (this.state === ns.STATE.AUX_DOWNFLOW)) {
            if (toExclude.length > 0) {
                this.askeMember.discardAuthentications();
                this.exclude(toExclude);
            } else {
                // TODO: Check, whether this would only work for isSessionAcknowledged(),
                //       or whether we need a fourth case to re-ack all participants.
                this.refresh();
            }
        } else {
            this.askeMember.discardAuthentications();
            this.fullRefresh((toKeep.length > 0) ? toKeep : undefined);
        }
    };


    /**
     * Handles mpENC protocol message processing.
     *
     * @method
     * @param wireMessage {object}
     *     Received message (wire encoded). The message contains an attribute
     *     `message` carrying either an {@link mpenc.codec.ProtocolMessage}
     *     or {@link mpenc.codec.DataMessage} payload.
     */
    ns.ProtocolHandler.prototype.processMessage = function(wireMessage) {
        var classify = codec.categoriseMessage(wireMessage.message);

        if (!classify) {
            return;
        }

        switch (classify.category) {
            case codec.MESSAGE_CATEGORY.MPENC_ERROR:
                this.uiQueue.push({
                    type: 'error',
                    message: 'Error in mpENC protocol: ' + classify.content
                });
                this.queueUpdatedCallback(this);
                break;
            case codec.MESSAGE_CATEGORY.PLAIN:
                var outMessage = {
                    from: this.id,
                    to: wireMessage.from,
                    message: codec.getQueryMessage(
                        "We're not dealing with plaintext messages. Let's negotiate mpENC communication."),
                };
                this.protocolOutQueue.push(outMessage);;
                wireMessage.type = 'info';
                wireMessage.message = 'Received unencrypted message, requesting encryption.';
                this.uiQueue.push(wireMessage);
                this.queueUpdatedCallback(this);
                break;
            case codec.MESSAGE_CATEGORY.MPENC_QUERY:
                // Initiate keying protocol flow.
                this.start(wireMessage.from);
                break;
            case codec.MESSAGE_CATEGORY.MPENC_GREET_MESSAGE:
                var decodedMessage = null;
                if (this.cliquesMember.groupKey) {
                    // In case of a key refresh (groupKey existent),
                    // the signing pubKeys won't be part of the message.
                    var signingPubKey = this.askeMember.getMemberEphemeralPubKey(wireMessage.from);
                    if ((wireMessage.from === this.id) && (!signingPubKey)) {
                        utils.dummyLogger('DEBUG',
                                          'Using own ephemeral signing pub key, not taken from list.');
                        signingPubKey = this.askeMember.ephemeralPubKey;
                    }
                    decodedMessage = codec.decodeMessageContent(classify.content,
                                                                this.cliquesMember.groupKey.substring(0, 16),
                                                                signingPubKey);
                } else {
                    decodedMessage = codec.decodeMessageContent(classify.content);
                }

                // This is an mpenc.greet message.
                var oldState = this.state;
                var keyingMessageResult = this._processKeyingMessage(decodedMessage);
                if (keyingMessageResult === null) {
                    return;
                }
                var outContent = keyingMessageResult.decodedMessage;

                if (outContent) {
                    var outMessage = {
                        from: this.id,
                        to: outContent.dest,
                        message: codec.encodeMessage(outContent, null,
                                                     this.askeMember.ephemeralPrivKey,
                                                     this.askeMember.ephemeralPubKey),
                    };
                    this.protocolOutQueue.push(outMessage);
                    this.queueUpdatedCallback(this);
                } else {
                    // Nothing to do, we're done here.
                }
                if(keyingMessageResult.newState &&
                        (keyingMessageResult.newState !== oldState)) {
                    // Update the state if required.
                    utils.dummyLogger('DEBUG',
                                      'Reached new state: '
                                      + _STATE_MAPPING[keyingMessageResult.newState]);
                    this.state = keyingMessageResult.newState;
                    this.stateUpdatedCallback(this);
                }
                break;
            case codec.MESSAGE_CATEGORY.MPENC_DATA_MESSAGE:
                var decodedMessage = null;
                _assert(this.state === ns.STATE.READY,
                        'Data messages can only be decrypted from a ready state.');

                // Let's crack this baby open.
                var signingPubKey = this.askeMember.getMemberEphemeralPubKey(wireMessage.from);
                decodedMessage = codec.decodeMessageContent(classify.content,
                                                            this.cliquesMember.groupKey.substring(0, 16),
                                                            signingPubKey);

                if (decodedMessage.signatureOk === false) {
                    // Signature failed, abort!
                    wireMessage.type = 'error';
                    wireMessage.message = 'Signature of received message invalid.';
                    this.uiQueue.push(wireMessage);
                } else {
                    wireMessage.type = 'message';
                    wireMessage.message = decodedMessage.data;
                    this.uiQueue.push(wireMessage);
                }
                this.queueUpdatedCallback(this);
                break;
            default:
                _assert(false, 'Received unknown message category: ' + classify.category);
                break;
        }
    };


    /**
     * Inspects a message for its type and some meta-data.
     *
     * This is a "cheap" operation, that is not performing any cryptographic
     * operations, but only looks at the components of the message payload.
     *
     * @method
     * @param wireMessage {object}
     *     Received message (wire encoded). The message contains an attribute
     *     `message` carrying either an {@link mpenc.codec.ProtocolMessage}
     *     or {@link mpenc.codec.DataMessage} payload.
     * @returns {object}
     *     Message meta-data.
     */
    ns.ProtocolHandler.prototype.inspectMessage = function(wireMessage) {
        var classify = codec.categoriseMessage(wireMessage.message);
        var result = {};

        switch (classify.category) {
            case codec.MESSAGE_CATEGORY.PLAIN:
                result.type = 'plain';
                break;
            case codec.MESSAGE_CATEGORY.MPENC_QUERY:
                result.type = 'mpENC query';
                break;
            case codec.MESSAGE_CATEGORY.MPENC_GREET_MESSAGE:
                result = codec.inspectMessageContent(classify.content);

                // Complete the origin attribute with further knowledge.
                if (result.origin === '???') {
                    if (this.askeMember.members.indexOf(result.from) >= 0) {
                        if (result.isInitiator()) {
                            result.origin = 'initiator';
                        } else {
                            result.origin = 'participant';
                        }
                    } else {
                        result.origin = 'outsider';
                    }
                }
                if (result.from === this.id) {
                    result.origin += ' (self)';
                }

                break;
            case codec.MESSAGE_CATEGORY.MPENC_DATA_MESSAGE:
                result.type = 'mpENC data message';
                break;
            case codec.MESSAGE_CATEGORY.MPENC_ERROR:
                result.type = 'mpENC error';
                break;
            default:
                // Ignoring all others.
                break;
        }

        return result;
    };


    /**
     * Sends a message confidentially to the current group.
     *
     * @method
     * @param messageContent {string}
     *     Unencrypted message content to be sent (plain text or HTML).
     * @param metadata {*}
     *     Use this argument to pass additional meta-data to be used later in
     *     plain text (unencrypted) in the implementation.
     */
    ns.ProtocolHandler.prototype.send = function(messageContent, metadata) {
        _assert(this.state === ns.STATE.READY,
                'Messages can only be sent in ready state.');
        var outMessage = {
            from: this.id,
            to: '',
            metadata: metadata,
            message: codec.encodeMessage(messageContent,
                                         this.cliquesMember.groupKey.substring(0, 16),
                                         this.askeMember.ephemeralPrivKey,
                                         this.askeMember.ephemeralPubKey,
                                         this.exponentialPadding),
        };
        this.messageOutQueue.push(outMessage);
        this.queueUpdatedCallback(this);
    };


    /**
     * Sends a message confidentially to an individual participant.
     *
     * *Warning:*
     *
     * A directed message is sent to one recipient only *to avoid network
     * traffic.* For the current implementation, from a protection point of
     * view the message has to be considered public in a group communication
     * context. This means, that this mechanism is unsuitable for exchanging
     * conversation transcripts with group participants in the presence of
     * participants who are not entitled to *all* messages within the
     * transcript!
     *
     * @method
     * @param messageContent {string}
     *     Unencrypted message content to be sent (plain text or HTML).
     * @param to {string}
     *     Recipient of a directed message (optional, default is to send to
     *     entire group). *Note:* See warning on confidentiality above!
     * @param metadata {*}
     *     Use this argument to pass additional meta-data to be used later in
     *     plain text (unencrypted) in the implementation.
     */
    ns.ProtocolHandler.prototype.sendTo = function(messageContent, to, metadata) {
        _assert(this.state === ns.STATE.READY,
                'Messages can only be sent in initialised state.');
        _assert(to && (to.length > 0),
                'A recipient has to be given.');
        var outMessage = {
            from: this.id,
            to: to,
            metadata: metadata,
            message: codec.encodeMessage(messageContent,
                                         this.cliquesMember.groupKey.substring(0, 16),
                                         this.askeMember.ephemeralPrivKey,
                                         this.askeMember.ephemeralPubKey,
                                         this.exponentialPadding),
        };
        this.messageOutQueue.push(outMessage);
        this.queueUpdatedCallback(this);
    };


    /**
     * Sends an mpENC protocol error message to the current group.
     *
     * @method
     * @param messageContent {string}
     *     Error message content to be sent.
     */
    ns.ProtocolHandler.prototype.sendError = function(messageContent) {
        var outMessage = {
            from: this.id,
            to: '',
            message: codec.getErrorMessage(messageContent),
        };
        this.protocolOutQueue.push(outMessage);
        this.queueUpdatedCallback(this);
    };


    /**
     * Handles keying protocol execution with all participants.
     *
     * @method
     * @param message {mpenc.codec.ProtocolMessage}
     *     Received message (decoded). See {@link mpenc.codec.ProtocolMessage}.
     * @returns {object}
     *     Object containing the decoded message content as
     *     {mpenc.codec.ProtocolMessage} in attribute `decodedMessage` and
     *     optional (null if not used) the new the ProtocolHandler state in
     *     attribute `newState`.
     */
    ns.ProtocolHandler.prototype._processKeyingMessage = function(message) {
        utils.dummyLogger('DEBUG',
                          'Processing message of type '
                          + message.getMessageTypeString());
        if (this.state === ns.STATE.QUIT) {
            // We're not par of this session, get out of here.
            utils.dummyLogger('DEBUG', "Ignoring message as we're in state QUIT.");
            return null;
        }

        // If I'm not part of it any more, go and quit.
        if (message.members && (message.members.length > 0)
                && (message.members.indexOf(this.id) === -1)) {
            this.quit();
            return null;
        }

        // Ignore the message if it is not for me.
        if ((message.dest !== '') && (message.dest !== this.id)) {
            return null;
        }

        // Ignore the message if it is from me.
        if (message.source === this.id) {
            return null;
        }

        // State transitions.
        if (message.isRecover()) {
            // We're getting this message as part of a recovery flow.
            this.recovering = true;
            // In case of an upflow, we must also discard session authentications.
            if (!message.isDownflow()) {
                this.askeMember.discardAuthentications();
            }
        }

        var inCliquesMessage = this._getCliquesMessage(message);
        var inAskeMessage = this._getAskeMessage(message);
        var outCliquesMessage = null;
        var outAskeMessage = null;
        var outMessage = null;
        var newState = null;

        // Three cases: QUIT, upflow or downflow message.
        if (message.messageType === codec.MESSAGE_TYPE.QUIT_DOWN) {
            // QUIT message.
            _assert(message.signingKey,
                    'Inconsistent message content with message type (signingKey).');
            // Sender is quitting participation.
            this.askeMember.oldEphemeralKeys[message.source] = {
                    priv: message.signingKey,
                    pub:  this.askeMember.ephemeralPubKeys[message.source]
            };
        } else if (message.isDownflow()) {
            // Downflow message.
            if (message.isGKA()) {
                this.cliquesMember.downflow(inCliquesMessage);
            }
            if (message.isSKE()) {
                outAskeMessage = this.askeMember.downflow(inAskeMessage);
            }
            outMessage = this._mergeMessages(null, outAskeMessage);
            if (outMessage) {
                outMessage.messageType = message.messageType;
                // In case we're receiving it from an initiator.
                outMessage.clearInitiator(true);
                // Confirmations (subsequent) downflow messages don't have a GKA.
                outMessage.clearGKA();
                // Handle state transitions.
                if (message.isAuxiliary()) {
                    newState = ns.STATE.AUX_DOWNFLOW;
                } else {
                    newState = ns.STATE.INIT_DOWNFLOW;
                }
            }
        } else {
            // Upflow message.
            outCliquesMessage = this.cliquesMember.upflow(inCliquesMessage);
            outAskeMessage = this.askeMember.upflow(inAskeMessage);
            outMessage = this._mergeMessages(outCliquesMessage, outAskeMessage);
            outMessage.messageType = message.messageType;
            // In case we're receiving it from an initiator.
            outMessage.clearInitiator();
            // Handle state transitions.
            if (outMessage.dest === '') {
                outMessage.setDownflow();
                if (message.isAuxiliary()) {
                    newState = ns.STATE.AUX_DOWNFLOW;
                } else {
                    newState = ns.STATE.INIT_DOWNFLOW;
                }
            } else {
                if (message.isAuxiliary()) {
                    newState = ns.STATE.AUX_UPFLOW;
                } else {
                    newState = ns.STATE.INIT_UPFLOW;
                }
            }
        }

        if (this.askeMember.isSessionAcknowledged()) {
            // We have seen and verified all broadcasts from others.
            newState = ns.STATE.READY;
            utils.dummyLogger('DEBUG', 'Reached READY state.');
            this.recovering = false;
        }

        if (outMessage) {
            utils.dummyLogger('DEBUG',
                              'Sending message of type '
                              + outMessage.getMessageTypeString());
        } else {
            utils.dummyLogger('DEBUG', 'No message to send.');
        }
        return { decodedMessage: outMessage,
                 newState: newState };
    };


    /**
     * Merges the contents of the messages for ASKE and CLIQUES into one message.
     *
     * @method
     * @param cliquesMessage {mpenc.greet.cliques.CliquesMessage}
     *     Message from CLIQUES protocol workflow.
     * @param askeMessage {mpenc.greet.ske.SignatureKeyExchangeMessage}
     *     Message from ASKE protocol workflow.
     * @returns {mpenc.codec.ProtocolMessage}
     *     Joined message (not wire encoded).
     */
    ns.ProtocolHandler.prototype._mergeMessages = function(cliquesMessage,
                                                           askeMessage) {
        // Are we done already?
        if (!cliquesMessage && !askeMessage) {
            return null;
        }

        var newMessage = new codec.ProtocolMessage(this.id);

        if (cliquesMessage && askeMessage) {
            _assert(cliquesMessage.source === askeMessage.source,
                    "Message source mismatch, this shouldn't happen.");
            _assert(cliquesMessage.dest === askeMessage.dest,
                    "Message destination mismatch, this shouldn't happen.");
        }

        // Empty objects to simplify further logic.
        cliquesMessage = cliquesMessage || {};
        askeMessage = askeMessage || {};

        newMessage.dest = cliquesMessage.dest || askeMessage.dest || '';
        newMessage.members = cliquesMessage.members || askeMessage.members;
        newMessage.intKeys = cliquesMessage.intKeys || null;
        newMessage.debugKeys = cliquesMessage.debugKeys || null;
        newMessage.nonces = askeMessage.nonces || null;
        newMessage.pubKeys = askeMessage.pubKeys || null;
        newMessage.sessionSignature = askeMessage.sessionSignature || null;
        newMessage.signingKey = askeMessage.signingKey || null;

        return newMessage;
    };


    /**
     * Extracts a CLIQUES message out of the received protocol handler message.
     *
     * @method
     * @param message {mpenc.codec.ProtocolMessage}
     *     Message from protocol handler.
     * @returns {mpenc.greet.cliques.CliquesMessage}
     *     Extracted message.
     */
    ns.ProtocolHandler.prototype._getCliquesMessage = function(message) {
        var newMessage = cliques.CliquesMessage(this.id);
        newMessage.source = message.source;
        newMessage.dest = message.dest;
        newMessage.members = message.members;
        newMessage.intKeys = message.intKeys;
        newMessage.debugKeys = message.debugKeys;

        // Upflow or downflow.
        if (message.isDownflow()) {
            newMessage.flow = 'down';
        } else {
            newMessage.flow = 'up';
        }

        // IKA or AKA.
        if (message.getOperation() === 'START') {
            newMessage.agreement = 'ika';
        } else {
            newMessage.agreement = 'aka';
        }

        return newMessage;
    };


    /**
     * Extracts a ASKE message out of the received protocol handler message.
     *
     * @method
     * @param message {mpenc.greet.codec.ProtocolMessage}
     *     Message from protocol handler.
     * @returns {mpenc.greet.ske.SignatureKeyExchangeMessage}
     *     Extracted message.
     */
    ns.ProtocolHandler.prototype._getAskeMessage = function(message) {
        var newMessage = ske.SignatureKeyExchangeMessage(this.id);
        newMessage.source = message.source;
        newMessage.dest = message.dest;
        newMessage.members = message.members;
        newMessage.nonces = message.nonces;
        newMessage.pubKeys = message.pubKeys;
        newMessage.sessionSignature = message.sessionSignature;
        newMessage.signingKey = message.signingKey;

        // Upflow or downflow.
        if (message.isDownflow()) {
            newMessage.flow = 'down';
        } else {
            newMessage.flow = 'up';
        }

        return newMessage;
    };


    return ns;
});

/**
 * @fileOverview JavaScript mpENC implementation.
 */

/*
 * Created: 11 Feb 2014 Guy K. Kloss <gk@mega.co.nz>
 *
 * (c) 2014 by Mega Limited, Wellsford, New Zealand
 *     http://mega.co.nz/
 *     Simplified (2-clause) BSD License.
 *
 * You should have received a copy of the license along with this
 * program.
 *
 * This file is part of the multi-party chat encryption suite.
 *
 * This code is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

define('mpenc',[
    "mpenc/codec",
    "mpenc/handler",
    "mpenc/version"
], function(codec, handler, version) {
    

    /**
     * @exports mpenc
     * The multi-party encrypted chat protocol, public API.
     *
     * @description
     * This is eventually to be extended towards the mpOTR standard, currently
     * under development.
     *
     * @property version {string}
     *     Member's identifier string.
     */
    var mpenc = {};

    mpenc.codec = codec;
    mpenc.handler = handler;
    mpenc.version = version;

    return mpenc;
});

    // The modules for your project will be inlined above
    // this snippet. Ask almond to synchronously require the
    // module value for 'main' here and return it as the
    // value to use for the public API for the built file.
    return require('mpenc');
}));
// See https://github.com/jrburke/almond#exporting-a-public-api
