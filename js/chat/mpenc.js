// See https://github.com/jrburke/almond#exporting-a-public-api
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        //Allow using this built library as a CommonJS module
        module.exports = factory();
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
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

define(".././node_modules/almond/almond", function(){});

/**
 * @fileOverview
 * Assertion helper module.
 */

define('mpenc/helper/assert',[], function() {
    

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
            throw new ns.AssertionFailed(message);
        }
    };

    return ns;
});

/**
 * @fileOverview
 * Container object definition for message types.
 */

define('mpenc/messages',[
    "mpenc/helper/assert",
], function(assert) {
    

    /**
     * @exports mpenc/messages
     * Container object definition for message types.
     *
     * @description
     * <p>Container object definition for message types.</p>
     */
    var ns = {};

    /*
     * Created: 1 Apr 2014 Guy K. Kloss <gk@mega.co.nz>
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
     * Carries message content for the mpEnc protocol flow and data messages.
     *
     * @constructor
     * @param source {string}
     *     Message originator (from).
     * @returns {ProtocolMessage}
     *
     * @property source {string}
     *     Message originator (from).
     * @property dest {string}
     *     Message destination (to).
     * @property agreement {string}
     *     Type of key agreement. "initial" or "auxilliary".
     * @property flow {string}
     *     Direction of message flow. "upflow" or "downflow".
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
        this.source = source || '';
        this.dest = '';
        this.agreement = null;
        this.flow = null;
        this.members = [];
        this.intKeys = [];
        this.debugKeys = [];
        this.nonces = [];
        this.pubKeys = [];
        this.sessionSignature = null;
        this.signingKey = null;
        this.signature = null;
        this.signatureOk = false;
        this.rawMessage = null;
        this.protocol = null;
        this.data = null;

        return this;
    };


    return ns;
});

// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+this.DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);

define("jsbn", function(){});

// Copyright (c) 2005-2009  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix

// (public)
function bnClone() { var r = nbi(); this.copyTo(r); return r; }

// (public) return value as integer
function bnIntValue() {
  if(this.s < 0) {
    if(this.t == 1) return this[0]-this.DV;
    else if(this.t == 0) return -1;
  }
  else if(this.t == 1) return this[0];
  else if(this.t == 0) return 0;
  // assumes 16 < DB < 32
  return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
}

// (public) return value as byte
function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

// (public) return value as short (assumes DB>=16)
function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

// (protected) return x s.t. r^x < DV
function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

// (public) 0 if this == 0, 1 if this > 0
function bnSigNum() {
  if(this.s < 0) return -1;
  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
  else return 1;
}

// (protected) convert to radix string
function bnpToRadix(b) {
  if(b == null) b = 10;
  if(this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b,cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d,y,z);
  while(y.signum() > 0) {
    r = (a+z.intValue()).toString(b).substr(1) + r;
    y.divRemTo(d,y,z);
  }
  return z.intValue().toString(b) + r;
}

// (protected) convert from radix string
function bnpFromRadix(s,b) {
  this.fromInt(0);
  if(b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
  for(var i = 0; i < s.length; ++i) {
    var x = intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
      continue;
    }
    w = b*w+x;
    if(++j >= cs) {
      this.dMultiply(d);
      this.dAddOffset(w,0);
      j = 0;
      w = 0;
    }
  }
  if(j > 0) {
    this.dMultiply(Math.pow(b,j));
    this.dAddOffset(w,0);
  }
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) alternate constructor
function bnpFromNumber(a,b,c) {
  if("number" == typeof b) {
    // new BigInteger(int,int,RNG)
    if(a < 2) this.fromInt(1);
    else {
      this.fromNumber(a,c);
      if(!this.testBit(a-1))	// force MSB set
        this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
      if(this.isEven()) this.dAddOffset(1,0); // force odd
      while(!this.isProbablePrime(b)) {
        this.dAddOffset(2,0);
        if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
      }
    }
  }
  else {
    // new BigInteger(int,RNG)
    var x = new Array(), t = a&7;
    x.length = (a>>3)+1;
    b.nextBytes(x);
    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
    this.fromString(x,256);
  }
}

// (public) convert to bigendian byte array
function bnToByteArray() {
  var i = this.t, r = new Array();
  r[0] = this.s;
  var p = this.DB-(i*this.DB)%8, d, k = 0;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
      r[k++] = d|(this.s<<(this.DB-p));
    while(i >= 0) {
      if(p < 8) {
        d = (this[i]&((1<<p)-1))<<(8-p);
        d |= this[--i]>>(p+=this.DB-8);
      }
      else {
        d = (this[i]>>(p-=8))&0xff;
        if(p <= 0) { p += this.DB; --i; }
      }
      if((d&0x80) != 0) d |= -256;
      if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
      if(k > 0 || d != this.s) r[k++] = d;
    }
  }
  return r;
}

function bnEquals(a) { return(this.compareTo(a)==0); }
function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

// (protected) r = this op a (bitwise)
function bnpBitwiseTo(a,op,r) {
  var i, f, m = Math.min(a.t,this.t);
  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
  if(a.t < this.t) {
    f = a.s&this.DM;
    for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
    r.t = this.t;
  }
  else {
    f = this.s&this.DM;
    for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
    r.t = a.t;
  }
  r.s = op(this.s,a.s);
  r.clamp();
}

// (public) this & a
function op_and(x,y) { return x&y; }
function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

// (public) this | a
function op_or(x,y) { return x|y; }
function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

// (public) this ^ a
function op_xor(x,y) { return x^y; }
function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

// (public) this & ~a
function op_andnot(x,y) { return x&~y; }
function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

// (public) ~this
function bnNot() {
  var r = nbi();
  for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
  r.t = this.t;
  r.s = ~this.s;
  return r;
}

// (public) this << n
function bnShiftLeft(n) {
  var r = nbi();
  if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
  return r;
}

// (public) this >> n
function bnShiftRight(n) {
  var r = nbi();
  if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
  return r;
}

// return index of lowest 1-bit in x, x < 2^31
function lbit(x) {
  if(x == 0) return -1;
  var r = 0;
  if((x&0xffff) == 0) { x >>= 16; r += 16; }
  if((x&0xff) == 0) { x >>= 8; r += 8; }
  if((x&0xf) == 0) { x >>= 4; r += 4; }
  if((x&3) == 0) { x >>= 2; r += 2; }
  if((x&1) == 0) ++r;
  return r;
}

// (public) returns index of lowest 1-bit (or -1 if none)
function bnGetLowestSetBit() {
  for(var i = 0; i < this.t; ++i)
    if(this[i] != 0) return i*this.DB+lbit(this[i]);
  if(this.s < 0) return this.t*this.DB;
  return -1;
}

// return number of 1 bits in x
function cbit(x) {
  var r = 0;
  while(x != 0) { x &= x-1; ++r; }
  return r;
}

// (public) return number of set bits
function bnBitCount() {
  var r = 0, x = this.s&this.DM;
  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
  return r;
}

// (public) true iff nth bit is set
function bnTestBit(n) {
  var j = Math.floor(n/this.DB);
  if(j >= this.t) return(this.s!=0);
  return((this[j]&(1<<(n%this.DB)))!=0);
}

// (protected) this op (1<<n)
function bnpChangeBit(n,op) {
  var r = BigInteger.ONE.shiftLeft(n);
  this.bitwiseTo(r,op,r);
  return r;
}

// (public) this | (1<<n)
function bnSetBit(n) { return this.changeBit(n,op_or); }

// (public) this & ~(1<<n)
function bnClearBit(n) { return this.changeBit(n,op_andnot); }

// (public) this ^ (1<<n)
function bnFlipBit(n) { return this.changeBit(n,op_xor); }

// (protected) r = this + a
function bnpAddTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]+a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c += a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c += a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += a.s;
  }
  r.s = (c<0)?-1:0;
  if(c > 0) r[i++] = c;
  else if(c < -1) r[i++] = this.DV+c;
  r.t = i;
  r.clamp();
}

// (public) this + a
function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

// (public) this - a
function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

// (public) this * a
function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

// (public) this^2
function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

// (public) this / a
function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

// (public) this % a
function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

// (public) [this/a,this%a]
function bnDivideAndRemainder(a) {
  var q = nbi(), r = nbi();
  this.divRemTo(a,q,r);
  return new Array(q,r);
}

// (protected) this *= n, this >= 0, 1 < n < DV
function bnpDMultiply(n) {
  this[this.t] = this.am(0,n-1,this,0,0,this.t);
  ++this.t;
  this.clamp();
}

// (protected) this += n << w words, this >= 0
function bnpDAddOffset(n,w) {
  if(n == 0) return;
  while(this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while(this[w] >= this.DV) {
    this[w] -= this.DV;
    if(++w >= this.t) this[this.t++] = 0;
    ++this[w];
  }
}

// A "null" reducer
function NullExp() {}
function nNop(x) { return x; }
function nMulTo(x,y,r) { x.multiplyTo(y,r); }
function nSqrTo(x,r) { x.squareTo(r); }

NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
function bnPow(e) { return this.exp(e,new NullExp()); }

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
function bnpMultiplyLowerTo(a,n,r) {
  var i = Math.min(this.t+a.t,n);
  r.s = 0; // assumes a,this >= 0
  r.t = i;
  while(i > 0) r[--i] = 0;
  var j;
  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
  r.clamp();
}

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
function bnpMultiplyUpperTo(a,n,r) {
  --n;
  var i = r.t = this.t+a.t-n;
  r.s = 0; // assumes a,this >= 0
  while(--i >= 0) r[i] = 0;
  for(i = Math.max(n-this.t,0); i < a.t; ++i)
    r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
  r.clamp();
  r.drShiftTo(1,r);
}

// Barrett modular reduction
function Barrett(m) {
  // setup Barrett
  this.r2 = nbi();
  this.q3 = nbi();
  BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
  this.mu = this.r2.divide(m);
  this.m = m;
}

function barrettConvert(x) {
  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
  else if(x.compareTo(this.m) < 0) return x;
  else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
}

function barrettRevert(x) { return x; }

// x = x mod m (HAC 14.42)
function barrettReduce(x) {
  x.drShiftTo(this.m.t-1,this.r2);
  if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
  this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
  this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
  while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
  x.subTo(this.r2,x);
  while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = x^2 mod m; x != r
function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = x*y mod m; x,y != r
function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
function bnModPow(e,m) {
  var i = e.bitLength(), k, r = nbv(1), z;
  if(i <= 0) return r;
  else if(i < 18) k = 1;
  else if(i < 48) k = 3;
  else if(i < 144) k = 4;
  else if(i < 768) k = 5;
  else k = 6;
  if(i < 8)
    z = new Classic(m);
  else if(m.isEven())
    z = new Barrett(m);
  else
    z = new Montgomery(m);

  // precomputation
  var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
  g[1] = z.convert(this);
  if(k > 1) {
    var g2 = nbi();
    z.sqrTo(g[1],g2);
    while(n <= km) {
      g[n] = nbi();
      z.mulTo(g2,g[n-2],g[n]);
      n += 2;
    }
  }

  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
  i = nbits(e[j])-1;
  while(j >= 0) {
    if(i >= k1) w = (e[j]>>(i-k1))&km;
    else {
      w = (e[j]&((1<<(i+1))-1))<<(k1-i);
      if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
    }

    n = k;
    while((w&1) == 0) { w >>= 1; --n; }
    if((i -= n) < 0) { i += this.DB; --j; }
    if(is1) {	// ret == 1, don't bother squaring or multiplying it
      g[w].copyTo(r);
      is1 = false;
    }
    else {
      while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
      if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
      z.mulTo(r2,g[w],r);
    }

    while(j >= 0 && (e[j]&(1<<i)) == 0) {
      z.sqrTo(r,r2); t = r; r = r2; r2 = t;
      if(--i < 0) { i = this.DB-1; --j; }
    }
  }
  return z.revert(r);
}

// (public) gcd(this,a) (HAC 14.54)
function bnGCD(a) {
  var x = (this.s<0)?this.negate():this.clone();
  var y = (a.s<0)?a.negate():a.clone();
  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
  if(g < 0) return x;
  if(i < g) g = i;
  if(g > 0) {
    x.rShiftTo(g,x);
    y.rShiftTo(g,y);
  }
  while(x.signum() > 0) {
    if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
    if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
    if(x.compareTo(y) >= 0) {
      x.subTo(y,x);
      x.rShiftTo(1,x);
    }
    else {
      y.subTo(x,y);
      y.rShiftTo(1,y);
    }
  }
  if(g > 0) y.lShiftTo(g,y);
  return y;
}

// (protected) this % n, n < 2^26
function bnpModInt(n) {
  if(n <= 0) return 0;
  var d = this.DV%n, r = (this.s<0)?n-1:0;
  if(this.t > 0)
    if(d == 0) r = this[0]%n;
    else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
  return r;
}

// (public) 1/this % m (HAC 14.61)
function bnModInverse(m) {
  var ac = m.isEven();
  if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
  var u = m.clone(), v = this.clone();
  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
  while(u.signum() != 0) {
    while(u.isEven()) {
      u.rShiftTo(1,u);
      if(ac) {
        if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
        a.rShiftTo(1,a);
      }
      else if(!b.isEven()) b.subTo(m,b);
      b.rShiftTo(1,b);
    }
    while(v.isEven()) {
      v.rShiftTo(1,v);
      if(ac) {
        if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
        c.rShiftTo(1,c);
      }
      else if(!d.isEven()) d.subTo(m,d);
      d.rShiftTo(1,d);
    }
    if(u.compareTo(v) >= 0) {
      u.subTo(v,u);
      if(ac) a.subTo(c,a);
      b.subTo(d,b);
    }
    else {
      v.subTo(u,v);
      if(ac) c.subTo(a,c);
      d.subTo(b,d);
    }
  }
  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
  if(d.compareTo(m) >= 0) return d.subtract(m);
  if(d.signum() < 0) d.addTo(m,d); else return d;
  if(d.signum() < 0) return d.add(m); else return d;
}

var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
var lplim = (1<<26)/lowprimes[lowprimes.length-1];

// (public) test primality with certainty >= 1-.5^t
function bnIsProbablePrime(t) {
  var i, x = this.abs();
  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
    for(i = 0; i < lowprimes.length; ++i)
      if(x[0] == lowprimes[i]) return true;
    return false;
  }
  if(x.isEven()) return false;
  i = 1;
  while(i < lowprimes.length) {
    var m = lowprimes[i], j = i+1;
    while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
    m = x.modInt(m);
    while(i < j) if(m%lowprimes[i++] == 0) return false;
  }
  return x.millerRabin(t);
}

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
function bnpMillerRabin(t) {
  var n1 = this.subtract(BigInteger.ONE);
  var k = n1.getLowestSetBit();
  if(k <= 0) return false;
  var r = n1.shiftRight(k);
  t = (t+1)>>1;
  if(t > lowprimes.length) t = lowprimes.length;
  var a = nbi();
  for(var i = 0; i < t; ++i) {
    //Pick bases at random, instead of starting at 2
    a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
    var y = a.modPow(r,this);
    if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
      var j = 1;
      while(j++ < k && y.compareTo(n1) != 0) {
        y = y.modPowInt(2,this);
        if(y.compareTo(BigInteger.ONE) == 0) return false;
      }
      if(y.compareTo(n1) != 0) return false;
    }
  }
  return true;
}

// protected
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

// JSBN-specific extension
BigInteger.prototype.square = bnSquare;

// BigInteger interfaces not implemented in jsbn:

// BigInteger(int signum, byte[] magnitude)
// double doubleValue()
// float floatValue()
// int hashCode()
// long longValue()
// static BigInteger valueOf(long val)
;
define("jsbn2", function(){});

// Copyright (c) 2007, 2013, 2014 Michele Bini
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished
// to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var c255lbase32chars = "abcdefghijklmnopqrstuvwxyz234567";
var c255lbase32values = {"a":0, "b":1, "c":2, "d":3, "e":4, "f":5, "g":6, "h":7, "i":8, "j":9, "k":10, "l":11, "m":12, "n":13, "o":14, "p":15, "q":16, "r":17, "s":18, "t":19, "u":20, "v":21, "w":22, "x":23, "y":24, "z":25, "2":26, "3":27, "4":28, "5":29, "6":30, "7":31 };
function c255lbase32encode(n) {
  var c;
  var r = "";
  for (c = 0; c < 255; c+=5) {
    r = c255lbase32chars.substr(c255lgetbit(n, c) + (c255lgetbit(n, c+1) << 1) + (c255lgetbit(n, c+2) << 2) + (c255lgetbit(n, c+3) << 3) + (c255lgetbit(n, c+4) << 4), 1) + r;
  }
  return r;
}
function c255lbase32decode(n) {
  var c = 0;
  var r = c255lzero();
  var l = n.length;
  for (c = 0; (l > 0) && (c < 255); c+=5) {
    l--;
    var v = c255lbase32values[n.substr(l, 1)];
    c255lsetbit(r, c,    v&1); v = v >> 1;
    c255lsetbit(r, c+1,  v&1); v = v >> 1;
    c255lsetbit(r, c+2,  v&1); v = v >> 1;
    c255lsetbit(r, c+3,  v&1); v = v >> 1;
    c255lsetbit(r, c+4,  v&1);
  }
  return r;
}
var c255lhexchars = "0123456789abcdef";
var c255lhexvalues = {"0":0, "1":1, "2":2, "3":3, "4":4, "5":5, "6":6, "7":7,  "8":8, "9":9, "a":10, "b":11, "c":12, "d":13, "e":14, "f":15 };
function c255lhexencode(n) {
  var c;
  var r = "";
  for (c = 0; c < 255; c+=4) {
    r = c255lhexchars.substr(c255lgetbit(n, c) + (c255lgetbit(n, c+1) << 1) + (c255lgetbit(n, c+2) << 2) + (c255lgetbit(n, c+3) << 3), 1) + r;
  }
  return r;
}
function c255lhexdecode(n) {
  var c = 0;
  var r = c255lzero();
  var l = n.length;
  for (c = 0; (l > 0) && (c < 255); c+=4) {
    l--;
    var v = c255lhexvalues[n.substr(l, 1)];
    c255lsetbit(r, c,    v&1); v = v >> 1;
    c255lsetbit(r, c+1,  v&1); v = v >> 1;
    c255lsetbit(r, c+2,  v&1); v = v >> 1;
    c255lsetbit(r, c+3,  v&1);
  }
  return r;
}
var c255lprime = [0xffff-18, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0x7fff];
function c255lsetbit(n, c, v) {
  var i = c >> 4;
  var a = n[i];
  a = a + (1 << (c & 0xf)) * v;
  n[i] = a;
}
function c255lgetbit(n, c) {
  return (n[c >> 4] >> (c & 0xf)) & 1;
}
function c255lzero() {
  return [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
function c255lone() {
  return [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
function c255lbase() { // Basepoint
  return [9,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
// return -1, 0, +1 when a is less than, equal, or greater than b
function c255lbigintcmp(a, b) {
 // The following code is a bit tricky to avoid code branching
  var c, abs_r, mask;
  var r = 0;
  for (c = 15; c >= 0; c--) {
    var x = a[c];
    var y = b[c];
    r = r + (x - y)*(1 - r*r);
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
function c255lbigintadd(a, b) {
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
function c255lbigintsub(a, b) {
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

function c255lsqr8h(a7, a6, a5, a4, a3, a2, a1, a0) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  // similarly 'multiplication by 2' cannot be replaced by '<< 1'
  var r = [];
  var v;
  r[0] = (v = a0*a0) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + 2*a0*a1) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + 2*a0*a2 + a1*a1) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + 2*a0*a3 + 2*a1*a2) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + 2*a0*a4 + 2*a1*a3 + a2*a2) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + 2*a0*a5 + 2*a1*a4 + 2*a2*a3) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + 2*a0*a6 + 2*a1*a5 + 2*a2*a4 + a3*a3) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + 2*a0*a7 + 2*a1*a6 + 2*a2*a5 + 2*a3*a4) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + 2*a1*a7 + 2*a2*a6 + 2*a3*a5 + a4*a4) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + 2*a2*a7 + 2*a3*a6 + 2*a4*a5) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + 2*a3*a7 + 2*a4*a6 + a5*a5) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + 2*a4*a7 + 2*a5*a6) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + 2*a5*a7 + a6*a6) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + 2*a6*a7) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a7*a7) & 0xffff;
  r[15] = 0|(v / 0x10000);
  return r;
}

function c255lsqrmodp(a) {
  var x = c255lsqr8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9], a[8]);
  var z = c255lsqr8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0]);
  var y = c255lsqr8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12] + a[4], a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8] + a[0]);
  var r = [];
  var v;
  r[0] = (v = 0x800000 + z[0] + (y[8] -x[8] -z[8] + x[0] -0x80) * 38) & 0xffff;
  r[1] = (v = 0x7fff80 + (v >>> 16) + z[1] + (y[9] -x[9] -z[9] + x[1]) * 38) & 0xffff;
  r[2] = (v = 0x7fff80 + (v >>> 16) + z[2] + (y[10] -x[10] -z[10] + x[2]) * 38) & 0xffff;
  r[3] = (v = 0x7fff80 + (v >>> 16) + z[3] + (y[11] -x[11] -z[11] + x[3]) * 38) & 0xffff;
  r[4] = (v = 0x7fff80 + (v >>> 16) + z[4] + (y[12] -x[12] -z[12] + x[4]) * 38) & 0xffff;
  r[5] = (v = 0x7fff80 + (v >>> 16) + z[5] + (y[13] -x[13] -z[13] + x[5]) * 38) & 0xffff;
  r[6] = (v = 0x7fff80 + (v >>> 16) + z[6] + (y[14] -x[14] -z[14] + x[6]) * 38) & 0xffff;
  r[7] = (v = 0x7fff80 + (v >>> 16) + z[7] + (y[15] -x[15] -z[15] + x[7]) * 38) & 0xffff;
  r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] -x[0] -z[0] + x[8] * 38) & 0xffff;
  r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] -x[1] -z[1] + x[9] * 38) & 0xffff;
  r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] -x[2] -z[2] + x[10] * 38) & 0xffff;
  r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] -x[3] -z[3] + x[11] * 38) & 0xffff;
  r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] -x[4] -z[4] + x[12] * 38) & 0xffff;
  r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] -x[5] -z[5] + x[13] * 38) & 0xffff;
  r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] -x[6] -z[6] + x[14] * 38) & 0xffff;
  r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] -x[7] -z[7] + x[15] * 38;
  c255lreduce(r);
  return r;
}

function c255lmul8h(a7, a6, a5, a4, a3, a2, a1, a0, b7, b6, b5, b4, b3, b2, b1, b0) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  var r = [];
  var v;
  r[0] = (v = a0*b0) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + a0*b1 + a1*b0) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + a0*b2 + a1*b1 + a2*b0) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + a0*b3 + a1*b2 + a2*b1 + a3*b0) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + a0*b4 + a1*b3 + a2*b2 + a3*b1 + a4*b0) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + a0*b5 + a1*b4 + a2*b3 + a3*b2 + a4*b1 + a5*b0) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + a0*b6 + a1*b5 + a2*b4 + a3*b3 + a4*b2 + a5*b1 + a6*b0) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + a0*b7 + a1*b6 + a2*b5 + a3*b4 + a4*b3 + a5*b2 + a6*b1 + a7*b0) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + a1*b7 + a2*b6 + a3*b5 + a4*b4 + a5*b3 + a6*b2 + a7*b1) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + a2*b7 + a3*b6 + a4*b5 + a5*b4 + a6*b3 + a7*b2) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + a3*b7 + a4*b6 + a5*b5 + a6*b4 + a7*b3) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + a4*b7 + a5*b6 + a6*b5 + a7*b4) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + a5*b7 + a6*b6 + a7*b5) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + a6*b7 + a7*b6) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a7*b7) & 0xffff;
  r[15] = (0|(v / 0x10000));
  return r;
}

function
c255lmulmodp(a, b) {
  // Karatsuba multiplication scheme: x*y = (b^2+b)*x1*y1 - b*(x1-x0)*(y1-y0) + (b+1)*x0*y0
  var x = c255lmul8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9], a[8], b[15], b[14], b[13], b[12], b[11], b[10], b[9], b[8]);
  var z = c255lmul8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0], b[7], b[6], b[5], b[4], b[3], b[2], b[1], b[0]);
  var y = c255lmul8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12] + a[4], a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8] + a[0],
  			b[15] + b[7], b[14] + b[6], b[13] + b[5], b[12] + b[4], b[11] + b[3], b[10] + b[2], b[9] + b[1], b[8] + b[0]);
  var r = [];
  var v;
  r[0] = (v = 0x800000 + z[0] + (y[8] -x[8] -z[8] + x[0] -0x80) * 38) & 0xffff;
  r[1] = (v = 0x7fff80 + (v >>> 16) + z[1] + (y[9] -x[9] -z[9] + x[1]) * 38) & 0xffff;
  r[2] = (v = 0x7fff80 + (v >>> 16) + z[2] + (y[10] -x[10] -z[10] + x[2]) * 38) & 0xffff;
  r[3] = (v = 0x7fff80 + (v >>> 16) + z[3] + (y[11] -x[11] -z[11] + x[3]) * 38) & 0xffff;
  r[4] = (v = 0x7fff80 + (v >>> 16) + z[4] + (y[12] -x[12] -z[12] + x[4]) * 38) & 0xffff;
  r[5] = (v = 0x7fff80 + (v >>> 16) + z[5] + (y[13] -x[13] -z[13] + x[5]) * 38) & 0xffff;
  r[6] = (v = 0x7fff80 + (v >>> 16) + z[6] + (y[14] -x[14] -z[14] + x[6]) * 38) & 0xffff;
  r[7] = (v = 0x7fff80 + (v >>> 16) + z[7] + (y[15] -x[15] -z[15] + x[7]) * 38) & 0xffff;
  r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] -x[0] -z[0] + x[8] * 38) & 0xffff;
  r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] -x[1] -z[1] + x[9] * 38) & 0xffff;
  r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] -x[2] -z[2] + x[10] * 38) & 0xffff;
  r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] -x[3] -z[3] + x[11] * 38) & 0xffff;
  r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] -x[4] -z[4] + x[12] * 38) & 0xffff;
  r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] -x[5] -z[5] + x[13] * 38) & 0xffff;
  r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] -x[6] -z[6] + x[14] * 38) & 0xffff;
  r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] -x[7] -z[7] + x[15] * 38;
  c255lreduce(r);
  return r;
}

function c255lreduce(a) {
  var v = a[15];
  a[15] = v & 0x7fff;
  v = (0|(v / 0x8000)) * 19; // >32-bits of precision are required here so '/ 0x8000' can not be replaced by the arithmetic equivalent '>>> 15'
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

function c255laddmodp(a, b) {
  var r = [];
  var v;
  r[0] = (v = ((0|(a[15] >>> 15)) + (0|(b[15] >>> 15))) * 19 + a[0] + b[0]) & 0xffff;
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

function c255lsubmodp(a, b) {
  var r = [];
  var v;
  r[0] = (v = 0x80000 + ((0|(a[15] >>> 15)) - (0|(b[15] >>> 15)) - 1) * 19 + a[0] - b[0]) & 0xffff;
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
  r[15] = (v >>> 16) + 0x7ff8 + (a[15] & 0x7fff) - (b[15] & 0x7fff);
  return r;
}

function
c255linvmodp(a) {
  var c = a;
  var i = 250;
  while (--i) {
    a = c255lsqrmodp(a);
    //if (i > 240) { tracev("invmodp a", a); }
    a = c255lmulmodp(a, c);
    //if (i > 240) { tracev("invmodp a 2", a); }
  }
  a = c255lsqrmodp(a);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  a = c255lsqrmodp(a);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  return a;
}

function c255lmulasmall(a) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  var m = 121665;
  var r = [];
  var v;
  r[0] = (v = a[0] * m) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + a[1]*m) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + a[2]*m) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + a[3]*m) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + a[4]*m) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + a[5]*m) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + a[6]*m) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + a[7]*m) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + a[8]*m) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + a[9]*m) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + a[10]*m) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + a[11]*m) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + a[12]*m) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + a[13]*m) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a[14]*m) & 0xffff;
  r[15] = (0|(v / 0x10000)) + a[15]*m;
  c255lreduce(r);
  return r;
}

function c255ldbl(x, z) {
  var x_2, z_2, m, n, o;
  ///tracev("dbl x", x);
  ///tracev("dbl z", z);
  m = c255lsqrmodp(c255laddmodp(x, z));
  //tracev("dbl m", c255laddmodp(x, z));
  n = c255lsqrmodp(c255lsubmodp(x, z));
  ///tracev("dbl n", n);
  o = c255lsubmodp(m, n);
  ///tracev("dbl o", o);
  x_2 = c255lmulmodp(n, m);
  //tracev("dbl x_2", x_2);
  z_2 = c255lmulmodp(c255laddmodp(c255lmulasmall(o), m), o);
  //tracev("dbl z_2", z_2);
  return [x_2, z_2];
}

function c255lsum(x, z, x_p, z_p, x_1) {
  var x_3, z_3, k, l, p, q;
  //tracev("sum x", x);
  //tracev("sum z", z);
  p = c255lmulmodp(c255lsubmodp(x, z), c255laddmodp(x_p, z_p));
  q = c255lmulmodp(c255laddmodp(x, z), c255lsubmodp(x_p, z_p));
  //tracev("sum p", p);
  //tracev("sum q", q);
  x_3 = c255lsqrmodp(c255laddmodp(p, q));
  z_3 = c255lmulmodp(c255lsqrmodp(c255lsubmodp(p, q)), x_1);
  return [x_3, z_3];
}


function curve25519_raw(f, c) {
  var a, x_1, q;

  x_1 = c;
  //tracev("c", c);
  //tracev("x_1", x_1);
  a = c255ldbl(x_1, c255lone());
  //tracev("x_a", a[0]);
  //tracev("z_a", a[1]);
  q = [ x_1, c255lone() ];

  var n = 255;

  while (c255lgetbit(f, n) == 0) {
    n--;
    // For correct constant-time operation, bit 255 should always be set to 1 so the following 'while' loop is never entered
    if (n < 0) {
      return c255lzero();
    }
  }
  n--;

  var aq = [ a, q ];
    
  while (n >= 0) {
    var r, s;
    var b = c255lgetbit(f, n);
    r = c255lsum(aq[0][0], aq[0][1], aq[1][0], aq[1][1], x_1);
    s = c255ldbl(aq[1-b][0], aq[1-b][1]);
    aq[1-b]  = s;
    aq[b]    = r;
    n--;
  }
  q = aq[1];

  //tracev("x", q[0]);
  //tracev("z", q[1]);
  q[1] = c255linvmodp(q[1]);
  //tracev("1/z", q[1]);
  q[0] = c255lmulmodp(q[0], q[1]);
  c255lreduce(q[0]);
  return q[0];
}

function curve25519b32(a, b) {
  return c255lbase32encode(curve25519(c255lbase32decode(a), c255lbase32decode(b)));
}

function curve25519(f, c) {
    if (!c) { c = c255lbase(); }
    f[0]   &= 0xFFF8;
    f[15]   = (f[15] & 0x7FFF) | 0x4000;
    return curve25519_raw(f, c);
}
;
define("curve255", (function (global) {
    return function () {
        var ret, fn;
       fn = function () {
                this.curve255 = {
                    c255lhexchars: c255lhexchars,
                    c255lhexvalues: c255lhexvalues,
                    c255lhexdecode: c255lhexdecode,
                    curve25519: curve25519,
                    base32decode: c255lbase32decode,
                    base32encode: c255lbase32encode,
                };
            };
        ret = fn.apply(global, arguments);
        return ret || global.curve255;
    };
}(this)));

/**
 * @fileOverview
 * Public JavaScript API of the digital signature scheme based on Curve25519
 * (EdDSA).
 */

/*
 * Created: 6 May 2014 Guy K. Kloss <gk@mega.co.nz>
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
 * @exports ed25519
 * Public JavaScript API of the digital signature scheme based on Curve25519
 * (EdDSA).
 *
 * @description
 * Public JavaScript API of the digital signature scheme based on Curve25519
 * (EdDSA).
 *
 * <p>
 * This code is a faster but more complicated version of the Ed25519 encryption
 * scheme (as compared to djbec.js).  It uses two different representations for
 * big integers: The jsbn BigInteger class, which can represent
 * arbitrary-length numbers, and a special fixed-length representation
 * optimised for 256-bit integers.  The reason both are needed is that the
 * Ed25519 algorithm requires some 512-bit numbers.</p>
 */
var ed25519 = {};

(function() {
    /** Version of ed25519 API/implementation. */
    ed25519.VERSION = '0.8.0';

    function _bi255(value) {
        if (!(this instanceof _bi255)) {
            return new _bi255(value);
        }
        if (typeof value === 'undefined') {
            return _bi255(0);
        }
        var c = value.constructor;
        if ((c === Array) && (value.length === 16)) {
            this.n = value;
        } else if ((c === Array) && (value.length === 32)) {
            this.n = _bytes2bi255(value).n;
        } else if (c === String) {
            this.n = c255lhexdecode(value);
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
            return c255lhexencode(this.n);
        },
        'toSource' : function() {
            return '_' + c255lhexencode(this.n);
        },
        'plus' : function(n1) {
            return _bi255(c255lbigintadd(this.n, n1.n));
        },
        'minus' : function(n1) {
            return _bi255(c255lbigintsub(this.n, n1.n)).modq();
        },
        'times' : function(n1) {
            return _bi255(c255lmulmodp(this.n, n1.n));
        },
        'divide' : function(n1) {
            return this.times(n1.inv());
        },
        'sqr' : function() {
            return _bi255(c255lsqrmodp(this.n));
        },
        'cmp' : function(n1) {
            return c255lbigintcmp(this.n, n1.n);
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
            return _bi255(c255linvmodp(this.n));
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
        var n = _bi255(0);
        for (var i = 0; i < 32; i++) {
            n.shiftLeft(8);
            n = n.plus(_bi255(a[i]));
        }
        return n;
    }

    function _pow(n, e) {
        var result = c255lone();
        for (var i = 0; i < 256; i++) {
            if (c255lgetbit(e, i) === 1) {
                result = c255lmulmodp(result, n);
            }
            n = c255lsqrmodp(n);
        }
        return result;
    }

    var _ZERO = _bi255(0);
    var _ONE = _bi255(1);
    var _TWO = _bi255(2);
    var _Q = _bi255(c255lprime);

    function _modq(n) {
        _myReduce(n.n);
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


    /**
     * TODO: Check whether we can find a better way to make it constant time.
     *
     * This function has been modified up to be closer to constant time.
     *
     * It is copied from curve255.js c255lreduce(), but it failed if the
     * conditional ``if (v < 0x8000)`` was omitted in this implementation.
     */
    function _myReduce(arr) {
        var aCopy = arr.slice(0)
        var v = arr[15];
        // Use the dummy copy instead of just returning to be more constant time.
        var a = (v < 0x8000) ? aCopy : arr;
        a[15] = v & 0x7fff;
        v = (v >>> 15) * 19;
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

    // ////////////////////////////////////////////////////////////

    /**
     * Checks whether a point is on the curve.
     *
     * @param p {string}
     *     The point to check for in a byte string representation.
     * @returns
     *     true if the point is on the curve, false otherwise.
     */
    ed25519.isoncurve = function(p) {
        try {
            _isoncurve(_decodepoint(_string2bytes(p)));
        } catch(e) {
            if (e === 'Point is not on curve') {
                return false;
            } else {
                throw e;
            }
        }
        return true;
    };

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
                return _bi(_string2bytes(value));
            }
            return new BigInteger(value, base);
        } else if (typeof value === 'string') {
            return new BigInteger(value, 10);
        } else if ((value instanceof Array) || (value instanceof Uint8Array)) {
            return new BigInteger(value);
        } else if (typeof value === 'number') {
            return new BigInteger(value.toString(), 10);
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

    BigInteger.prototype.toSource = function() {
        return this.toString(16);
    };
    BigInteger.prototype.bytes = function(n) {
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

    /**
     * Computes the EdDSA public key.
     *
     * <p>Note: Seeds should be a byte string, not a unicode string containing
     * multi-byte characters.</p>
     *
     * @param sk {string}
     *     Private key seed in the form of a byte string.
     * @returns {string}
     *     Public key as byte string computed from the private key seed
     *     (32 bytes).
     */
    ed25519.publickey = function(sk) {
        return _bytes2string(_publickey(sk));
    };

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

    /**
     * Converts an 8-bit integer array representation to a byte string.
     *
     * @param bytes {array}
     *     Array of 8-bit integers.
     * @returns {string}
     *     Byte string representation (8-bit characters only).
     */
    ed25519.bytes2string = function(bytes) {
        return _bytes2string(bytes);
    };

    function _string2bytes(s) {
        return _map(_ord, s);
    }

    /**
     * Converts a byte string representation to an array of unsigned
     * 8-bit integers.
     *
     * @param text {string}
     *     Byte string representation (8-bit characters only).
     * @returns {array}
     *     Array of 8-bit integers.
     */
    ed25519.string2bytes = function(text) {
        return _string2bytes(text);
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
     * @param message {string}
     *     Message in the form of a byte string.
     * @param sk {string}
     *     Private key seed in the form of a byte string.
     * @param pk {string}
     *     Public key as byte string (if not present, it will be computed from
     *     the private key seed).
     * @returns {string}
     *     Detached message signature in the form of a byte string (64 bytes).
     */
    ed25519.signature = function(message, sk, pk) {
        if (pk === undefined) {
            pk = _publickey(sk);
        } else {
            pk = _string2bytes(pk);
        }
        var a = _bi(_get_a(sk).toString(), 16);
        var hs = _stringhash(sk);
        var r = _bytehash(hs.slice(32, 64) + message);
        var rp = _scalarmultBytes(_bp, r);
        var erp = _encodepoint(rp);
        r = _bi(r).mod(_bi(1, 10).shiftLeft(512));
        var s = _map(_chr, erp).join('') + _map(_chr, pk).join('') + message;
        s = _inthash_mod_l(s).multiply(a).add(r).mod(_L_BI);
        return _bytes2string(erp.concat(_encodeint(s)));
    };

    function _pt_add(p1, p2) {
        return _pt_unxform(_x_pt_add(_pt_xform(p1), _pt_xform(p2)));
    }

    /**
     * Checks an EdDSA signature of a message with the public key.
     *
     * <p>Note: Unicode messages need to be converted to a byte representation
     * (e. g. UTF-8).</p>
     *
     * @param sig {string}
     *     Message signature in the form of a byte string. Can be detached
     *     (64 bytes), or attached to be sliced off.
     * @param message {string}
     *     Message in the form of a byte string.
     * @param pk {string}
     *     Public key as byte string (if not present, it will be computed from
     *     the private key seed).
     * @returns {bool}
     *     true, if the signature verifies.
     */
    ed25519.checksig = function(sig, message, pk) {
        sig = _string2bytes(sig.slice(0, 64));
        pk = _string2bytes(pk);
        var rpe = sig.slice(0, 32);
        var rp = _decodepoint(rpe);
        var a = _decodepoint(pk);
        var s = _decodeint(sig.slice(32, 64));
        var h = _inthash(_bytes2string(rpe.concat(pk)) + message);
        var v1 = _scalarmult(_bp, s);
        var value = _scalarmultBytes(a, _bi2bytes(h));
        var v2 = _pt_add(rp, value);
        return v1[0].equals(v2[0]) && v1[1].equals(v2[1]);
    };


    /**
     * Generates a new random private key seed of 32 bytes length (256 bit).
     *
     * @returns {string}
     *     Byte string containing a new random private key seed.
     */
    ed25519.genkeyseed = function() {
        var buffer = new Uint8Array(32);
        asmCrypto.getRandomValues(buffer);
        var result = '';
        for (var i = 0; i < buffer.length; i++) {
            result += String.fromCharCode(buffer[i]);
        }
        return result;
    };
})();

define("ed25519", ["jsbn","jsbn2","curve255"], (function (global) {
    return function () {
        var ret, fn;
       fn = function (asmCrypto, jsbn, jsbn2) {
                this.ed25519 = ed25519;
            };
        ret = fn.apply(global, arguments);
        return ret || global.ed25519;
    };
}(this)));

/**
 * @fileOverview
 * Some utilities.
 */

define('mpenc/helper/utils',[
    "ed25519",
], function(ed25519) {
    

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
     * Generates a new random key as an array of 32 bit words.
     *
     * @param bits
     *     Number of bits of key strength (must be a multiple of 32).
     * @returns
     *     32 bit word array of the key.
     * @private
     */
    ns._newKey32 = function(bits) {
        var buffer = ns._newKey08(bits);
        var result = [];
        var value = 0;
        for (var i = 0; i < buffer.length; i += 4) {
            value = buffer[i];
            value += buffer[i + 1] << 8;
            value += buffer[i + 2] << 16;
            value += buffer[i + 3] << 24;
            result.push(value);
        }
        return result;
    };


    /**
     * Generates a new random key, and converts it into a format that
     * the Curve25519 implementation understands.
     *
     * @param bits
     *     Number of bits of key strength (must be a multiple of 32).
     * @returns
     *     16 bit word array of the key.
     * @private
     */
    ns._newKey16 = function(bits) {
        var buffer = ns._newKey08(bits);
        var result = [];
        var value = 0;
        for (var i = 0; i < buffer.length; i += 2) {
            value = buffer[i];
            value += buffer[i + 1] << 8;
            result.push(value);
        }
        return result;
    };


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
     * Converts a key representation to an array with 8 bit chunks.
     *
     * @param key
     *     The key as a 32 bit word array.
     * @returns
     *     8 bit value array of the key.
     * @private
     */
    ns._key32to08 = function(key) {
        var keyOut = [];
        for (var i = 0; i < key.length; i++) {
            var value = key[i];
            for (var j = 0; j < 4; j++) {
                keyOut.push(value % 0xff & 0xff);
                value = value >> 8;
            }
        }
        return keyOut;
    };


    /**
     * Converts a key representation to an array with 16 bit chunks.
     *
     * @param key
     *     The key as a 32 bit word array.
     * @returns
     *     16 bit value array of the key.
     * @private
     */
    ns._key32to16 = function(key) {
        var keyOut = [];
        for (var i = 0; i < key.length; i++) {
            var value = key[i];
            for (var j = 0; j < 2; j++) {
                keyOut.push(value % 0xffff & 0xffff);
                value = value >> 16;
            }
        }
        return keyOut;
    };


    /**
     * Converts an 8-bit element (unsigned) array a hex string representation.
     *
     * @param key
     *     The key as an 8 bit (unsigned) integer array.
     * @returns
     *     Hex string representation of key (little endian).
     * @private
     */
    ns._key08toHex = function(key) {
        var out = '';
        for (var i = 0; i < key.length; i++) {
            var value = key[i];
            for (var j = 0; j < 2; j++) {
                out += ns._HEX_CHARS[value % 0x0f];
                value = value >> 4;
            }
        }
        return out;
    };


    /**
     * Clears the memory of a secret key array.
     *
     * @param key
     *     The key to clear.
     * @private
     */
    ns._clearmem = function(key) {
        for (var i = 0; i < key.length; i++) {
            key[i] = 0;
        }
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
     * Converts a hex string to a a byte array (array of Uint8, retains endianness).
     *
     * Note: No sanity or error checks are performed.
     *
     * @param hexstring
     *     Hexadecimal string.
     * @returns
     *     Array of byte values (unsigned integers).
     */
    ns.hex2bytearray = function(hexstring) {
        var result = [];
        var i = 0;
        while (i < hexstring.length) {
            result.push((ns._HEX_CHARS.indexOf(hexstring.charAt(i++)) << 4)
                        + ns._HEX_CHARS.indexOf(hexstring.charAt(i++)));
        }
        return result;
    };


    /**
     * Converts a byte array to a hex string (array of Uint8, retains endianness).
     *
     * Note: No sanity or error checks are performed.
     *
     * @param arr
     *     Array of byte values (unsigned integers).
     * @returns
     *     Hexadecimal string.
     */
    ns.bytearray2hex = function(arr) {
        var result = '';
        for (var i = 0; i < arr.length; i++) {
            result += ns._HEX_CHARS.charAt(arr[i] >> 4)
                    + ns._HEX_CHARS.charAt(arr[i] & 15);
        }
        return result;
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
        return ed25519.bytes2string(asmCrypto.SHA256.bytes(data));
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
                var invariants = parent.__invariants
                for (var k in invariants) {
                    console.log("checking " + k + " on " + obj);
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
     * @param obj1
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

    return ns;
});

/**
 * @fileOverview Metadata about the mpEnc library
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
     * Metadata about the mpEnc library
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
    "mpenc/messages",
    "mpenc/helper/utils",
    "mpenc/version",
    "ed25519",
], function(assert, messages, utils, version, ed25519) {
    

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
     * "Enumeration" protocol message category types.
     *
     * @property PLAIN {integer}
     *     Plain text message (not using mpENC).
     * @property MPENC_QUERY {integer}
     *     Query to initiate an mpENC session.
     * @property MPENC_MESSAGE {integer}
     *     mpENC message.
     * @property MPENC_ERROR {integer}
     *     Message for error in mpENC protocol.
     */
    ns.MESSAGE_CATEGORY = {
        PLAIN:             0x00,
        MPENC_QUERY:       0x01,
        MPENC_MESSAGE:     0x02,
        MPENC_ERROR:       0x03,
    };


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
     * @property SOURCE {integer}
     *     Message originator ("from", must be only one).
     * @property DEST {integer}
     *     Message destination ("to", should be only one, broadcast if not
     *     present or empty).
     * @property AUX_AGREEMENT {integer}
     *     Type of key agreement. Binary 0 for "initial" or 1 for "auxiliary".
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
        SOURCE:            0x0100, // 256
        DEST:              0x0101, // 257
        AUX_AGREEMENT:     0x0102, // 258
        MEMBER:            0x0103, // 259
        INT_KEY:           0x0104, // 260
        NONCE:             0x0105, // 261
        PUB_KEY:           0x0106, // 262
        SESSION_SIGNATURE: 0x0107, // 263
        SIGNING_KEY:       0x0108, // 264
    };


    /**
     * "Enumeration" message types.
     *
     * FIXME: This needs some serious work.
     *
     * @property DATA {integer}
     *     Used to transmit a private message.
     */
    ns.MESSAGE_TYPE = {
        DATA:              0x03,
        KEY_AGREEMENT:     0x0a,
        REVEAL_SIGNATURE:  0x11,
        SIGNATURE:         0x12,
    };


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
        if (value.length === 0) {
            value = null;
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

        var out = new messages.ProtocolMessage();

        while (message.length > 0) {
            var tlv = ns.decodeTLV(message);
            switch (tlv.type) {
                case ns.TLV_TYPE.PADDING:
                    // Completely ignore this.
                    break;
                case ns.TLV_TYPE.PROTOCOL_VERSION:
                    out.protocol = tlv.value;
                    break;
                case ns.TLV_TYPE.SOURCE:
                    out.source = tlv.value;
                    break;
                case ns.TLV_TYPE.DEST:
                    out.dest = tlv.value || '';
                    if (out.dest === '') {
                        out.flow = 'downflow';
                    } else {
                        out.flow = 'upflow';
                    }
                    break;
                case ns.TLV_TYPE.AUX_AGREEMENT:
                    if (tlv.value === _ZERO_BYTE) {
                        out.agreement = 'initial';
                    } else if (tlv.value === _ONE_BYTE) {
                        out.agreement = 'auxilliary';
                    } else {
                        _assert(false,
                                'Unexpected value for agreement TLV: '
                                + tlv.value.charCodeAt(0) + '.');
                    }
                    break;
                case ns.TLV_TYPE.MEMBER:
                    out.members.push(tlv.value);
                    break;
                case ns.TLV_TYPE.INT_KEY:
                    out.intKeys.push(tlv.value);
                    break;
                case ns.TLV_TYPE.NONCE:
                    out.nonces.push(tlv.value);
                    break;
                case ns.TLV_TYPE.PUB_KEY:
                    out.pubKeys.push(tlv.value);
                    break;
                case ns.TLV_TYPE.SESSION_SIGNATURE:
                    out.sessionSignature = tlv.value;
                    break;
                case ns.TLV_TYPE.SIGNING_KEY:
                    out.signingKey = tlv.value;
                    break;
                case ns.TLV_TYPE.MESSAGE_SIGNATURE:
                    out.signature = tlv.value;
                    out.rawMessage = tlv.rest;
                    break;
                case ns.TLV_TYPE.MESSAGE_IV:
                    out.iv = tlv.value;
                    break;
                case ns.TLV_TYPE.DATA_MESSAGE:
                    out.data = tlv.value;
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
        } else {
            // Some sanity checks for keying messages.
            _assert(out.intKeys.length <= out.members.length,
                    'Number of intermediate keys cannot exceed number of members.');
            _assert(out.nonces.length <= out.members.length,
                    'Number of nonces cannot exceed number of members.');
            _assert(out.pubKeys.length <= out.members.length,
                    'Number of public keys cannot exceed number of members.');
        }

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
     * Detects the category of a given message.
     *
     * @param message {string}
     *     A wire protocol message representation.
     * @returns {mpenc.codec.MESSAGE_CATEGORY}
     *     Message category indicator.
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

        // Check for message.
        if ((message[0] === ':') && (message[message.length - 1] === '.')) {
            return { category: ns.MESSAGE_CATEGORY.MPENC_MESSAGE,
                     content: atob(message.substring(1, message.length - 1)) };
        }

        // Check for query.
        var ver = /v(\d+)\?/.exec(message);
        if (ver && (ver[1] === '' + version.PROTOCOL_VERSION.charCodeAt(0))) {
            return { category: ns.MESSAGE_CATEGORY.MPENC_QUERY,
                     content: String.fromCharCode(ver[1]) };
        }

        _assert(false, 'Unknown mpEnc message.');
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
     * @returns {string}
     *     A binary message representation.
     */
    ns.encodeMessageContent = function(message, groupKey, privKey, pubKey) {
        var out = ns.encodeTLV(ns.TLV_TYPE.PROTOCOL_VERSION, version.PROTOCOL_VERSION);
        if (typeof(message) === 'string' || message instanceof String) {
            // We're dealing with a message containing user content.
            var encrypted = ns.encryptDataMessage(message, groupKey);

            // We want message attributes in this order:
            // signature, protocol version, iv, message data
            out += ns.encodeTLV(ns.TLV_TYPE.MESSAGE_IV, encrypted.iv);
            out += ns.encodeTLV(ns.TLV_TYPE.DATA_MESSAGE, encrypted.data);
            // Sign `out` and prepend signature.
            var signature = ns.signDataMessage(out, privKey, pubKey);
            out = ns.encodeTLV(ns.TLV_TYPE.MESSAGE_SIGNATURE, signature) + out;
        } else {
            // Process message attributes in this order:
            // source, dest, agreement, members, intKeys, nonces, pubKeys,
            // sessionSignature, signingKey

            out += ns.encodeTLV(ns.TLV_TYPE.SOURCE, message.source);
            out += ns.encodeTLV(ns.TLV_TYPE.DEST, message.dest);
            if (message.agreement === 'initial') {
                out += ns.encodeTLV(ns.TLV_TYPE.AUX_AGREEMENT, _ZERO_BYTE);
            } else {
                out += ns.encodeTLV(ns.TLV_TYPE.AUX_AGREEMENT, _ONE_BYTE);
            }
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
     * @returns {string}
     *     A wire ready message representation.
     */
    ns.encodeMessage = function(message, groupKey, privKey, pubKey) {
        if (message === null || message === undefined) {
            return null;
        }
        var content = ns.encodeMessageContent(message, groupKey, privKey, pubKey);
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
        return (value.charCodeAt(0) << 8) + value.charCodeAt(1);
    };


    /**
     * Encrypts a given data message.
     *
     * The data message is encrypted using AES-128-CBC, and a new random IV is
     * generated and returned.
     *
     * @param data {string}
     *     Binary string data message.
     * @param key {string}
     *     Binary string representation of 128-bit encryption key.
     * @returns {Object}
     *     An object containing the message (in `data`, binary string) and
     *     the IV used (in `iv`, binary string).
     */
    ns.encryptDataMessage = function(data, key) {
        if (data === null || data === undefined) {
            return null;
        }
        var keyBytes = new Uint8Array(ed25519.string2bytes(key));
        var ivBytes = new Uint8Array(utils._newKey08(128));
        // Protect multi-byte characters.
        var dataBytes = unescape(encodeURIComponent(data));
        var cipherBytes = asmCrypto.AES_CBC.encrypt(dataBytes, keyBytes, true, ivBytes);
        return { data: ed25519.bytes2string(cipherBytes),
                 iv: ed25519.bytes2string(ivBytes) };
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
        var keyBytes = new Uint8Array(ed25519.string2bytes(key));
        var ivBytes = new Uint8Array(ed25519.string2bytes(iv));
        var clearBytes = asmCrypto.AES_CBC.decrypt(data, keyBytes, true, ivBytes);
        // Undo protection for multi-byte characters.
        return decodeURIComponent(escape(ed25519.bytes2string(clearBytes)));
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
        return ed25519.signature(data, privKey, pubKey);
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
        return ed25519.checksig(signature, data, pubKey);
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

    return ns;
});

/**
 * @fileOverview
 * Some patches/enhancements to third party library modules.
 */

define('mpenc/helper/patches',[
    "mpenc/helper/utils",
    "curve255"
], function(utils, curve255) {
    

    /**
     * @exports mpenc/helper/patches
     * Some patches/enhancements to third party library modules.
     *
     * @description
     * <p>Some patches/enhancements to third party library modules.</p>
     */
    var ns = {};

    /*
     * Created: 20 Mar 2014 Guy K. Kloss <gk@mega.co.nz>
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

    // Patches to the curve255.js namespace module.

    /**
     * Converts an 16-bit word element (unsigned) array a hex string representation.
     *
     * @param key
     *     The key as an 8 bit (unsigned) integer array.
     * @returns
     *     Hex string representation of key (big endian).
     * @private
     */
    curve255.toHex = function(key) {
        var out = '';
        for (var i = 0; i < key.length; i++) {
            var value = key[i];
            var remainder = 0;
            for (var j = 0; j < 4; j++) {
                remainder = value % 16;
                out = utils._HEX_CHARS[remainder % 0x0f] + out;
                value = value >> 4;
            }
        }
        return out;
    };


    /**
     * Converts a hex string to a 16-bit word element (unsigned) array representation.
     *
     * @param key
     *     Hex string representation of key (big endian).
     * @returns
     *     The key as an 16-bit word element (unsigned) integer array.
     * @private
     */
    curve255.fromHex = function(key) {
        var out = [];
        var padding = 4 - ((key.length % 4) || 4);
        for (var i = 0; i < padding; i++) {
            key = '0' + key;
        }
        var i = 0;
        while (i < key.length) {
            var value = 0;
            for (var j = 0; j < 4; j++) {
                value = (value << 4) + utils._HEX_CHARS.indexOf(key[i + j]);
            }
            out.unshift(value);
            i += 4;
        }
        return out;
    };


    /**
     * Converts an 16-bit word element (unsigned) array a binary string representation.
     *
     * @param key
     *     The key as an 16-bit word element (unsigned) integer array.
     * @returns
     *     Binary string representation of key (big endian).
     * @private
     */
    curve255.toString = function(key) {
        var out = '';
        for (var i = 0; i < key.length; i++) {
            var value = key[i];
            var remainder = 0;
            for (var j = 0; j < 2; j++) {
                remainder = value % 256;
                out = String.fromCharCode(remainder) + out;
                value = value >> 8;
            }
        }
        return out;
    };


    /**
     * Converts a binary string to a 16-bit word element (unsigned) array representation.
     *
     * @param key
     *     Binary string representation of key (big endian).
     * @returns
     *     The key as an 16-bit word element (unsigned) integer array.
     * @private
     */
    curve255.fromString = function(key) {
        var out = [];
        var i = 0;
        if (key.length % 2) {
            key = '\u0000' + key;
        }
        while (i < key.length) {
            out.unshift(key.charCodeAt(i) * 256 + key.charCodeAt(i + 1));
            i += 2;
        }
        return out;
    };

    return ns;
});

/**
 * @fileOverview
 * Implementation of group key agreement based on CLIQUES.
 */

define('mpenc/greet/cliques',[
    "mpenc/helper/assert",
    "mpenc/helper/patches",
    "mpenc/helper/utils",
    "curve255"
], function(assert, patches, utils, curve255) {
    

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
     *     Direction of message flow. "upflow" or "downflow".
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
     *     Direction of message flow. "upflow" or "downflow".
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
        startMessage.flow = 'upflow';
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
        startMessage.flow = 'upflow';
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
        this.groupKey = retValue.cardinal;
        this._debugGroupKey = retValue.cardinalDebugKey;

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.CliquesMessage(this.id);
        broadcastMessage.members = this.members;
        broadcastMessage.agreement = 'aka';
        broadcastMessage.flow = 'downflow';
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
            this.pubKey = null;
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
        this.groupKey = retValue.cardinalKey;
        this._debugGroupKey = retValue.cardinalDebugKey;

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.CliquesMessage(this.id);
        broadcastMessage.members = this.members;
        broadcastMessage.agreement = 'aka';
        broadcastMessage.flow = 'downflow';
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
            this.groupKey = result.cardinalKey;
            this._debugGroupKey = result.cardinalDebugKey;
            this._setKeys(this.intKeys, this._debugIntKeys);
            // Broadcast all intermediate keys.
            message.source = this.id;
            message.dest = '';
            message.flow = 'downflow';
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
            this.intKeys[myPos] = ns._scalarMultiply(this.privKey,
                                                     this.intKeys[myPos]);
            this._debugIntKeys[myPos] = ns._scalarMultiplyDebug(this._debugPrivKey,
                                                                this._debugIntKeys[myPos]);
            this.privKey = null;
        }

        // Make a new private key.
        this.privKey = curve255.toString(utils._newKey16(256));
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
                this.intKeys[i] = ns._scalarMultiply(this.privKey,
                                                     this.intKeys[i]);
                this._debugIntKeys[i] = ns._scalarMultiplyDebug(this._debugPrivKey,
                                                                this._debugIntKeys[i]);
            }
        }

        // New cardinal is "own" intermediate scalar multiplied with our private.
        var cardinalKey = ns._scalarMultiply(this.privKey, this.intKeys[myPos]);
        return {
            cardinalKey: '' + cardinalKey,
            cardinalDebugKey: ns._scalarMultiplyDebug(this._debugPrivKey,
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
        this.groupKey = ns._scalarMultiply(this.privKey,
                                           this.intKeys[myPos]);
        this._debugGroupKey = ns._scalarMultiplyDebug(this._debugPrivKey,
                                                      this._debugIntKeys[myPos]);
    };


    /**
     * Perform scalar product of a private key with an intermediate key..
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
    ns._scalarMultiply = function(privKey, intKey) {
        var value = null;
        if (intKey) {
            value = curve255.curve25519(curve255.fromString(privKey),
                                        curve255.fromString(intKey));
        } else {
            value = curve255.curve25519(curve255.fromString(privKey));
        }
        return curve255.toString(value);
    };


    /**
     * Debug version of `_scalarMultiply()`.
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
    ns._scalarMultiplyDebug = function(privKey, intKey) {
        if (intKey) {
            return privKey + '*' + intKey;
        } else {
            return privKey + '*G';
        }
    };

    return ns;
});

/* RSA public key encryption/decryption
 * The following functions are (c) 2000 by John M Hanna and are
 * released under the terms of the Gnu Public License.
 * You must freely redistribute them with their source -- see the
 * GPL for details.
 *  -- Latest version found at http://sourceforge.net/projects/shop-js
 *
 * Modifications and GnuPG multi precision integer (mpi) conversion added
 * 2004 by Herbert Hanewinkel, www.haneWIN.de
 */

// --- Arbitrary Precision Math ---
// badd(a,b), bsub(a,b), bsqr(a), bmul(a,b)
// bdiv(a,b), bmod(a,b), bexpmod(g,e,m), bmodexp(g,e,m)

// bs is the shift, bm is the mask
// set single precision bits to 28

var bs = 28;
var bx2 = 1 << bs,
    bm = bx2 - 1,
    bx = bx2 >> 1,
    bd = bs >> 1,
    bdm = (1 << bd) - 1;

var log2 = Math.log(2);

function zeros(n) {
    var r = new Array(n);

    while (n-- > 0)
        r[n] = 0;
    return r;
}

function zclip(r) {
    var n = r.length;
    if (r[n - 1])
        return r;
    while (n > 1 && r[n - 1] == 0)
        n--;
    return r.slice(0, n);
}

// returns bit length of integer x
function nbits(x) {
    var n = 1, t;
    if ((t = x >>> 16) != 0) {
        x = t;
        n += 16;
    }
    if ((t = x >> 8) != 0) {
        x = t;
        n += 8;
    }
    if ((t = x >> 4) != 0) {
        x = t;
        n += 4;
    }
    if ((t = x >> 2) != 0) {
        x = t;
        n += 2;
    }
    if ((t = x >> 1) != 0) {
        x = t;
        n += 1;
    }
    return n;
}

function badd(a, b) {
    var al = a.length;
    var bl = b.length;

    if (al < bl)
        return badd(b, a);

    var r = new Array(al);
    var c = 0, n = 0;

    for (; n < bl; n++) {
        c += a[n] + b[n];
        r[n] = c & bm;
        c >>>= bs;
    }
    for (; n < al; n++) {
        c += a[n];
        r[n] = c & bm;
        c >>>= bs;
    }
    if (c)
        r[n] = c;
    return r;
}

function bsub(a, b) {
    var al = a.length;
    var bl = b.length;

    if (bl > al)
        return [];
    if (bl == al) {
        if (b[bl - 1] > a[bl - 1])
            return [];
        if (bl == 1)
            return [a[0] - b[0]];
    }

    var r = new Array(al);
    var c = 0;

    for (var n = 0; n < bl; n++) {
        c += a[n] - b[n];
        r[n] = c & bm;
        c >>= bs;
    }
    for (; n < al; n++) {
        c += a[n];
        r[n] = c & bm;
        c >>= bs;
    }
    if (c)
        return [];

    return zclip(r);
}

function ip(w, n, x, y, c) {
    var xl = x & bdm;
    var xh = x >> bd;

    var yl = y & bdm;
    var yh = y >> bd;

    var m = xh * yl + yh * xl;
    var l = xl * yl + ((m & bdm) << bd) + w[n] + c;
    w[n] = l & bm;
    c = xh * yh + (m >> bd) + (l >> bs);
    return c;
}

// Multiple-precision squaring, HAC Algorithm 14.16

function bsqr(x) {
    var t = x.length;
    var n = 2 * t;
    var r = zeros(n);
    var c = 0;
    var i, j;

    for (i = 0; i < t; i++) {
        c = ip(r, 2 * i, x[i], x[i], 0);
        for (j = i + 1; j < t; j++) {
            c = ip(r, i + j, 2 * x[j], x[i], c);
        }
        r[i + t] = c;
    }

    return zclip(r);
}

// Multiple-precision multiplication, HAC Algorithm 14.12

function bmul(x, y) {
    var n = x.length;
    var t = y.length;
    var r = zeros(n + t - 1);
    var c, i, j;

    for (i = 0; i < t; i++) {
        c = 0;
        for (j = 0; j < n; j++) {
            c = ip(r, i + j, x[j], y[i], c);
        }
        r[i + n] = c;
    }

    return zclip(r);
}

function toppart(x, start, len) {
    var n = 0;
    while (start >= 0 && len-- > 0)
        n = n * bx2 + x[start--];
    return n;
}

// Multiple-precision division, HAC Algorithm 14.20

function bdiv(a, b) {
    var n = a.length - 1;
    var t = b.length - 1;
    var nmt = n - t;

    // trivial cases; a < b
    if (n < t || n == t
        && (a[n] < b[n] || n > 0 && a[n] == b[n] && a[n - 1] < b[n - 1])) {
        this.q = [0];
        this.mod = a;
        return this;
    }

    // trivial cases; q < 4
    if (n == t && toppart(a, t, 2) / toppart(b, t, 2) < 4) {
        var x = a.concat();
        var qq = 0;
        var xx;
        for (;;) {
            xx = bsub(x, b);
            if (xx.length == 0)
                break;
            x = xx;
            qq++;
        }
        this.q = [qq];
        this.mod = x;
        return this;
    }

    // normalize
    var shift2 = Math.floor(Math.log(b[t]) / log2) + 1;
    var shift = bs - shift2;

    var x = a.concat();
    var y = b.concat();

    if (shift) {
        for (i = t; i > 0; i--)
            y[i] = ((y[i] << shift) & bm) | (y[i - 1] >> shift2);
        y[0] = (y[0] << shift) & bm;
        if (x[n] & ((bm << shift2) & bm)) {
            x[++n] = 0;
            nmt++;
        }
        for (i = n; i > 0; i--)
            x[i] = ((x[i] << shift) & bm) | (x[i - 1] >> shift2);
        x[0] = (x[0] << shift) & bm;
    }

    var i, j, x2;
    var q = zeros(nmt + 1);
    var y2 = zeros(nmt).concat(y);
    for (;;) {
        x2 = bsub(x, y2);
        if (x2.length == 0)
            break;
        q[nmt]++;
        x = x2;
    }

    var yt = y[t], top = toppart(y, t, 2)
    for (i = n; i > t; i--) {
        var m = i - t - 1;
        if (i >= x.length)
            q[m] = 1;
        else if (x[i] == yt)
            q[m] = bm;
        else
            q[m] = Math.floor(toppart(x, i, 2) / yt);

        var topx = toppart(x, i, 3);
        while (q[m] * top > topx)
            q[m]--;

        // x-=q[m]*y*b^m
        y2 = y2.slice(1);
        x2 = bsub(x, bmul([q[m]], y2));
        if (x2.length == 0) {
            q[m]--;
            x2 = bsub(x, bmul([q[m]], y2));
        }
        x = x2;
    }
    // de-normalize
    if (shift) {
        for (i = 0; i < x.length - 1; i++)
            x[i] = (x[i] >> shift) | ((x[i + 1] << shift2) & bm);
        x[x.length - 1] >>= shift;
    }

    this.q = zclip(q);
    this.mod = zclip(x);
    return this;
}

function simplemod(i, m) // returns the mod where m < 2^bd
{
    var c = 0, v;
    for (var n = i.length - 1; n >= 0; n--) {
        v = i[n];
        c = ((v >> bd) + (c << bd)) % m;
        c = ((v & bdm) + (c << bd)) % m;
    }
    return c;
}

function bmod(p, m) {
    if (m.length == 1) {
        if (p.length == 1)
            return [p[0] % m[0]];
        if (m[0] < bdm)
            return [simplemod(p, m[0])];
    }

    var r = bdiv(p, m);
    return r.mod;
}

// Barrett's modular reduction, HAC Algorithm 14.42

function bmod2(x, m, mu) {
    var xl = x.length - (m.length << 1);
    if (xl > 0)
        return bmod2(x.slice(0, xl).concat(bmod2(x.slice(xl), m, mu)), m, mu);

    var ml1 = m.length + 1, ml2 = m.length - 1, rr;
    // var q1=x.slice(ml2)
    // var q2=bmul(q1,mu)
    var q3 = bmul(x.slice(ml2), mu).slice(ml1);
    var r1 = x.slice(0, ml1);
    var r2 = bmul(q3, m).slice(0, ml1);
    var r = bsub(r1, r2);

    if (r.length == 0) {
        r1[ml1] = 1;
        r = bsub(r1, r2);
    }
    for (var n = 0;; n++) {
        rr = bsub(r, m);
        if (rr.length == 0)
            break;
        r = rr;
        if (n >= 3)
            return bmod2(r, m, mu);
    }
    return r;
}

// Modular exponentiation, HAC Algorithm 14.79

function bexpmod(g, e, m) {
    var a = g.concat();
    var l = e.length - 1;
    var n = nbits(e[l]) - 2;

    for (; l >= 0; l--) {
        for (; n >= 0; n -= 1) {
            a = bmod(bsqr(a), m);
            if (e[l] & (1 << n)) {
                a = bmod(bmul(a, g), m);
            }
        }
        n = bs - 1;
    }
    return a;
}

// Modular exponentiation using Barrett reduction

function bmodexp(g, e, m) {
    var a = g.concat();
    var l = e.length - 1;
    var n = m.length * 2;
    var mu = zeros(n + 1);
    mu[n] = 1;
    mu = bdiv(mu, m).q;

    n = nbits(e[l]) - 2;

    for (; l >= 0; l--) {
        for (; n >= 0; n -= 1) {
            a = bmod2(bsqr(a), m, mu);
            if (e[l] & (1 << n)) {
                a = bmod2(bmul(a, g), m, mu);
            }
        }
        n = bs - 1;
    }
    return a;
}

/**
 * Compute s**e mod m for RSA public key operation.
 * 
 * @param s
 *     Message to be encrypted.
 * @param e
 *     The public exponent (for encryption and verification).
 * @param m
 *     The public modulus.
 * @returns
 *     Big integer representation of crypted message.
 */
function RSAencrypt(s, e, m) {
    return bexpmod(s, e, m);
}

/**
 * Compute m**d mod p*q for RSA private key operations.
 * 
 * (The implementation is more efficient by using the Chinese Remainder
 * Theorem, requiring p, q and u, rather than just the modulus n.)
 * 
 * @param m
 *     Message to be decrypted.
 * @param d
 *     The private exponent (for decryption and signing).
 * @param p
 *     The first factor of the public modulus.
 * @param q
 *     The second factor of the public modulus.
 * @param u
 *     The multiplicative inverse of q modulo p.
 * @returns
 *     Big integer representation of crypted message.
 */
function RSAdecrypt(m, d, p, q, u) {
    var xp = bmodexp(bmod(m, p), bmod(d, bsub(p, [1])), p);
    var xq = bmodexp(bmod(m, q), bmod(d, bsub(q, [1])), q);

    var t = bsub(xq, xp);
    if (t.length == 0) {
        t = bsub(xp, xq);
        t = bmod(bmul(t, u), q);
        t = bsub(q, t);
    } else {
        t = bmod(bmul(t, u), q);
    }
    return badd(bmul(t, p), xp);
}

// -----------------------------------------------------------------
// conversion functions: num array <-> multi precision integer (mpi)
// mpi: 2 octets with length in bits + octets in big endian order

function mpi2b(s) {
    var bn = 1, r = [0], rn = 0, sb = 256;
    var c, sn = s.length;
    if (sn < 2)
        return 0;

    var len = (sn - 2) * 8;
    var bits = s.charCodeAt(0) * 256 + s.charCodeAt(1);
    if (bits > len || bits < len - 8)
        return 0;

    for (var n = 0; n < len; n++) {
        if ((sb <<= 1) > 255) {
            sb = 1;
            c = s.charCodeAt(--sn);
        }
        if (bn > bm) {
            bn = 1;
            r[++rn] = 0;
        }
        if (c & sb)
            r[rn] |= bn;
        bn <<= 1;
    }
    return r;
}

function b2mpi(b) {
    var bn = 1, bc = 0, r = [0], rb = 1, rn = 0;
    var bits = b.length * bs;
    var n, rr = '';

    for (n = 0; n < bits; n++) {
        if (b[bc] & bn)
            r[rn] |= rb;
        if ((rb <<= 1) > 255) {
            rb = 1;
            r[++rn] = 0;
        }
        if ((bn <<= 1) > bm) {
            bn = 1;
            bc++;
        }
    }

    while (rn && r[rn] == 0)
        rn--;

    bn = 256;
    for (bits = 8; bits > 0; bits--)
        if (r[rn] & (bn >>= 1))
            break;
    bits += rn * 8;

    rr += String.fromCharCode(bits / 256) + String.fromCharCode(bits % 256);
    if (bits)
        for (n = rn; n >= 0; n--)
            rr += String.fromCharCode(r[n]);
    return rr;
}
;
define("rsa", (function (global) {
    return function () {
        var ret, fn;
       fn = function () {
                return this.rsa = {
                    RSAencrypt: RSAencrypt,
                    RSAdecrypt: RSAdecrypt,
                };
            };
        ret = fn.apply(global, arguments);
        return ret || global.rsa;
    };
}(this)));

/**
 * @fileOverview
 * Implementation of an authenticated Signature Key Exchange scheme.
 */

define('mpenc/greet/ske',[
    "mpenc/helper/assert",
    "mpenc/helper/utils",
    "rsa",
    "ed25519",
], function(assert, utils, rsa, ed25519) {
    

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
     *     Flow direction of message ('upflow' or 'downflow').
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
        var startMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'upflow');
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
        this.nonce = ed25519.genkeyseed();
        this.nonces.push(this.nonce);
        if (!this.ephemeralPrivKey) {
            // Only generate a new key if we don't have one.
            // We might want to recover and just re-run the protocol.
            this.ephemeralPrivKey = ed25519.genkeyseed();
        }
        this.ephemeralPubKey = ed25519.publickey(this.ephemeralPrivKey);
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
            message.flow = 'downflow';
            this.authenticatedMembers = utils._arrayMaker(this.members.length, false);
            this.authenticatedMembers[myPos] = true;
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
        return ns._smallrsasign(hashValue, this.staticPrivKey);
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
        var decrypted = ns._smallrsaverify(signature,
                                           this.staticPubKeyDir.get(memberId));
        var sessionAck = MAGIC_NUMBER + memberId + this.ephemeralPubKeys[memberPos]
                       + this.nonces[memberPos] + this.sessionId;
        var hashValue = utils.sha256(sessionAck);
        return utils.constTimeStringCmp(decrypted, hashValue);
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

            // New authentication list, and authenticate myself.
            this.authenticatedMembers = utils._arrayMaker(this.members.length, false);
            this.authenticatedMembers[myPos] = true;
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

        // Discard authentications.
        var myPos = this.members.indexOf(this.id);
        this.authenticatedMembers = utils._arrayMaker(this.members.length, false);
        this.authenticatedMembers[myPos] = true;

        // Pass a message on to the first new member to join.
        var startMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'upflow');
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

        // Discard authentications.
        var myPos = this.members.indexOf(this.id);
        this.authenticatedMembers = utils._arrayMaker(this.members.length, false);
        this.authenticatedMembers[myPos] = true;

        // Pass broadcast message on to all members.
        var broadcastMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'downflow');
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
        this.ephemeralPubKey = null;
        this.ephemeralPrivKey = null;
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
        var broadcastMessage = new ns.SignatureKeyExchangeMessage(this.id, '', 'downflow');
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
     * Converts a (binary) string to a multi-precision integer (MPI).
     *
     * @param binstring
     *     Binary string representation of data.
     * @returns
     *     MPI representation.
     */
    ns._binstring2mpi = function(binstring) {
        var contentLength = binstring.length * 8;
        var data = String.fromCharCode(contentLength >> 8)
                 + String.fromCharCode(contentLength & 255) + binstring;
        return mpi2b(data);
    };


    /**
     * Converts a multi-precision integer (MPI) to a (binary) string.
     *
     * @param mpi
     *     MPI representation.
     * @returns
     *     Binary string representation of data.
     */
    ns._mpi2binstring = function(mpi) {
        return b2mpi(mpi).slice(2);
    };

    /**
     * Encodes the message according to the EME-PKCS1-V1_5 encoding scheme in
     * RFC 2437, section 9.1.2.
     *
     * see: http://tools.ietf.org/html/rfc2437#section-9.1.2
     *
     * @param message
     *     Message to encode.
     * @param length
     *     Destination length of the encoded message in bytes.
     * @returns
     *     Encoded message as binary string.
     */
    ns._pkcs1v15_encode = function(message, length) {
        _assert(message.length < length - 10,
                'message too long for encoding scheme');

        // Padding string.
        var paddingString = '';
        var paddingLength = length - message.length - 2;
        var paddingByte = new Uint8Array(1);
        asmCrypto.getRandomValues(paddingByte);
        for (var i = 0; i < paddingLength; i++) {
            while (paddingByte[0] === 0) {
                asmCrypto.getRandomValues(paddingByte);
            }
            paddingString += String.fromCharCode(paddingByte[0]);
        }

        return String.fromCharCode(2) + paddingString + String.fromCharCode(0) + message;
    };


    /**
     * Decodes the message according to the EME-PKCS1-V1_5 encoding scheme in
     * RFC 2437, section 9.1.2.
     *
     * see: http://tools.ietf.org/html/rfc2437#section-9.1.2
     *
     * @param message
     *     Message to decode.
     * @returns
     *     Decoded message as binary string.
     */
    ns._pkcs1v15_decode = function(message) {
        _assert(message.length > 10, 'message decoding error');
        return message.slice(message.indexOf(String.fromCharCode(0)) + 1);
    };


    /**
     * Encrypts a binary string using an RSA public key. The data to be encrypted
     * must be encryptable <em>directly</em> using the key.
     *
     * For secure random padding, the max. size of message = key size in bytes - 10.
     *
     * @param cleartext
     *     Cleartext to encrypt.
     * @param pubkey
     *     Public RSA key.
     * @returns
     *     Ciphertext encoded as binary string.
     */
    ns._smallrsaencrypt = function(cleartext, pubkey) {
        // pubkey[2] is length of key in bits.
        var keyLength = pubkey[2] >> 3;

        // Convert to MPI format and return cipher as binary string.
        var data = ns._binstring2mpi(ns._pkcs1v15_encode(cleartext, keyLength));
        return ns._mpi2binstring(rsa.RSAencrypt(data, pubkey[1], pubkey[0]));
    };


    /**
     * Decrypts a binary string using an RSA private key. The data to be decrypted
     * must be decryptable <em>directly</em> using the key.
     *
     * @param ciphertext
     *     Ciphertext to decrypt.
     * @param privkey
     *     Private RSA key.
     * @returns
     *     Cleartext encoded as binary string.
     */
    ns._smallrsadecrypt = function(ciphertext, privkey) {
        var cleartext = rsa.RSAdecrypt(ns._binstring2mpi(ciphertext),
                                       privkey[2], privkey[0], privkey[1], privkey[3]);
        var data = ns._mpi2binstring(cleartext);
        return ns._pkcs1v15_decode(data);
    };


    /**
     * Encrypts a binary string using an RSA private key for the purpose of signing
     * (authenticating). The data to be encrypted must be decryptable
     * <em>directly</em> using the key.
     *
     * For secure random padding, the max. size of message = key size in bytes - 10.
     *
     * @param cleartext
     *     Message to encrypt.
     * @param privkey
     *     Private RSA key.
     * @returns
     *     Encrypted message encoded as binary string.
     */
    ns._smallrsasign = function(cleartext, privkey) {
        var keyLength = (privkey[2].length * 28 - 1) >> 5 << 2;

        // Convert to MPI format and return cipher as binary string.
        var data = ns._pkcs1v15_encode(cleartext, keyLength);
        // Decrypt ciphertext.
        var cipher = rsa.RSAdecrypt(ns._binstring2mpi(data),
                                    privkey[2], privkey[0], privkey[1], privkey[3]);
        return ns._mpi2binstring(cipher);
    };


    /**
     * Encrypts a binary string using an RSA public key. The data to be encrypted
     * must be encryptable <em>directly</em> using the key.
     *
     * @param ciphertext
     *     Ciphertext to encrypt.
     * @param pubkey
     *     Public RSA key.
     * @returns
     *     Cleartext encoded as binary string.
     */
    ns._smallrsaverify = function(ciphertext, pubkey) {
        // Convert to MPI format and return cleartext as binary string.
        var data = ns._binstring2mpi(ciphertext);
        var cleartext = ns._mpi2binstring(rsa.RSAencrypt(data, pubkey[1], pubkey[0]));
        return ns._pkcs1v15_decode(cleartext);
    };


    /**
     * Encrypts a binary string using an RSA public key. The data to be encrypted
     * must be encryptable <em>directly</em> using the key.
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
    "mpenc/messages",
], function(assert, utils, cliques, ske, codec, messages) {
    

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
     * the mpEnc module.
     *
     * @property NULL {integer}
     *     Uninitialised (default) state.
     * @property INIT_UPFLOW {integer}
     *     During process of initial protocol upflow.
     * @property INIT_DOWNFLOW {integer}
     *     During process of initial protocol downflow.
     * @property INITIALISED {integer}
     *     Default state during general usage of mpEnc. No protocol/key
     *     negotiation going on, and a valid group key is available.
     * @property AUX_UPFLOW {integer}
     *     During process of auxiliary protocol upflow.
     * @property AUX_DOWNFLOW {integer}
     *     During process of auxiliary protocol downflow.
     */
    ns.STATE = {
        NULL:          0x00,
        INIT_UPFLOW:   0x01,
        INIT_DOWNFLOW: 0x02,
        INITIALISED:   0x03,
        AUX_UPFLOW:    0x04,
        AUX_DOWNFLOW:  0x05,
    };


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
     *     Current state of the mpEnc protocol handler according to {STATE}.
     */
    ns.ProtocolHandler = function(id, privKey, pubKey, staticPubKeyDir,
                                  queueUpdatedCallback, stateUpdatedCallback) {
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
     * Mechanism to start the protocol negotiation with the group participants..
     *
     * @method
     * @param otherMembers {Array}
     *     Iterable of other members for the group (excluding self).
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._start = function(otherMembers) {
        _assert(otherMembers && otherMembers.length !== 0, 'No members to add.');

        var cliquesMessage = this.cliquesMember.ika(otherMembers);
        var askeMessage = this.askeMember.commit(otherMembers);

        return this._mergeMessages(cliquesMessage, askeMessage);
    };


    /**
     * Start the protocol negotiation with the group participants..
     *
     * @method
     * @param otherMembers {Array}
     *     Iterable of other members for the group (excluding self).
     */
    ns.ProtocolHandler.prototype.start = function(otherMembers) {
        _assert(this.state === ns.STATE.NULL,
                'start() can only be called from an uninitialised state.');
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
     * Mechanism to start a new upflow for joining new members..
     *
     * @method
     * @param newMembers {Array}
     *     Iterable of new members to join the group.
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._join = function(newMembers) {
        _assert(newMembers && newMembers.length !== 0, 'No members to add.');

        var cliquesMessage = this.cliquesMember.akaJoin(newMembers);
        var askeMessage = this.askeMember.join(newMembers);

        return this._mergeMessages(cliquesMessage, askeMessage);
    };


    /**
     * Start a new upflow for joining new members..
     *
     * @method
     * @param newMembers {Array}
     *     Iterable of new members to join the group.
     */
    ns.ProtocolHandler.prototype.join = function(newMembers) {
        _assert(this.state === ns.STATE.INITIALISED,
                'join() can only be called from an initialised state.');
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
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._exclude = function(excludeMembers) {
        _assert(excludeMembers && excludeMembers.length !== 0, 'No members to exclude.');
        _assert(excludeMembers.indexOf(this.id) < 0,
                'Cannot exclude mysefl.');

        var cliquesMessage = this.cliquesMember.akaExclude(excludeMembers);
        var askeMessage = this.askeMember.exclude(excludeMembers);

        return this._mergeMessages(cliquesMessage, askeMessage);
    };


    /**
     * Start a new downflow for excluding members.
     *
     * @method
     * @param excludeMembers {Array}
     *     Iterable of members to exclude from the group.
     */
    ns.ProtocolHandler.prototype.exclude = function(excludeMembers) {
        _assert(this.state === ns.STATE.INITIALISED,
                'exclude() can only be called from an initialised state.');
        this.state = ns.STATE.AUX_DOWNFLOW;
        this.stateUpdatedCallback(this);

        var outContent = this._exclude(excludeMembers);
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
            this.state = ns.STATE.INITIALISED;
            this.stateUpdatedCallback(this);
        }
    };


    /**
     * Mechanism to start the downflow for quitting participation.
     *
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     * @method
     */
    ns.ProtocolHandler.prototype._quit = function() {
        _assert(this.askeMember.ephemeralPrivKey !== null,
                'Not participating.');
        this.cliquesMember.akaQuit();
        var askeMessage = this.askeMember.quit();
        return this._mergeMessages(null, askeMessage);
    };


    /**
     * Start the downflow for quitting participation.
     *
     * @method
     */
    ns.ProtocolHandler.prototype.quit = function() {
        _assert(this.state === ns.STATE.INITIALISED,
                'quit() can only be called from an initialised state.');
        this.state = ns.STATE.NULL;
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
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     * @method
     */
    ns.ProtocolHandler.prototype._refresh = function() {
        var cliquesMessage = this.cliquesMember.akaRefresh();
        return this._mergeMessages(cliquesMessage, null);
    };


    /**
     * Refresh group key.
     *
     * @method
     */
    ns.ProtocolHandler.prototype.refresh = function() {
        _assert((this.state === ns.STATE.INITIALISED)
                || (this.state === ns.STATE.INIT_DOWNFLOW)
                || (this.state === ns.STATE.AUX_DOWNFLOW),
                'refresh() can only be called from an initialised or downflow states.');
        this.state = ns.STATE.INITIALISED;
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

        if (toExclude.length > 0) {
            this.state = ns.STATE.AUX_DOWNFLOW;
            this.stateUpdatedCallback(this);

            var outContent = this._exclude(toExclude);
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
        } else {
            if (this.askeMember.isSessionAcknowledged() &&
                    ((this.state === ns.STATE.INITIALISED)
                            || (this.state === ns.STATE.INIT_DOWNFLOW)
                            || (this.state === ns.STATE.AUX_DOWNFLOW))) {
                this.refresh();
            } else {
                this.fullRefresh((toKeep.length > 0) ? toKeep : undefined);
            }
        }
    };


    /**
     * Handles mpEnc protocol message processing.
     *
     * @method
     * @param wireMessage {object}
     *     Received message (wire encoded). The message contains an attribute
     *     `message` carrying either an {@link mpenc.messages.ProtocolMessage}
     *     or {@link mpenc.messages.DataMessage} payload.
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
                    message: 'Error in mpEnc protocol: ' + classify.content
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
            case codec.MESSAGE_CATEGORY.MPENC_MESSAGE:
                var decodedMessage = null;
                if (this.state === ns.STATE.INITIALISED) {
                    // We've been through a key agreement, so we've got keys.
                    var signingPubKey = this.askeMember.getMemberEphemeralPubKey(wireMessage.from);
                    decodedMessage = codec.decodeMessageContent(classify.content,
                                                                this.cliquesMember.groupKey.substring(0, 16),
                                                                signingPubKey);
                } else {
                    // We're still running the key agreement.
                    decodedMessage = codec.decodeMessageContent(classify.content);
                }

                if (decodedMessage.data) {
                    // This is a normal communication/data message.
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
                } else {
                    // This is an mpenc.greet message.
                    var outContent = this._processKeyingMessage(decodedMessage);
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
                }
                break;
            default:
                _assert(false, 'Received unknown message category: ' + classify.category);
                break;
        }
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
        _assert(this.state === ns.STATE.INITIALISED,
                'Messages can only be sent in initialised state.');
        var outMessage = {
            from: this.id,
            to: '',
            metadata: metadata,
            message: codec.encodeMessage(messageContent,
                                         this.cliquesMember.groupKey.substring(0, 16),
                                         this.askeMember.ephemeralPrivKey,
                                         this.askeMember.ephemeralPubKey),
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
        _assert(this.state === ns.STATE.INITIALISED,
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
                                         this.askeMember.ephemeralPubKey),
        };
        this.messageOutQueue.push(outMessage);
        this.queueUpdatedCallback(this);
    };


    /**
     * Handles keying protocol execution with all participants.
     *
     * @method
     * @param message {mpenc.messages.ProtocolMessage}
     *     Received message (decoded). See {@link mpenc.messages.ProtocolMessage}.
     * @returns {mpenc.messages.ProtocolMessage}
     *     Un-encoded message content.
     */
    ns.ProtocolHandler.prototype._processKeyingMessage = function(message) {
        var inCliquesMessage = this._getCliquesMessage(utils.clone(message));
        var inAskeMessage = this._getAskeMessage(utils.clone(message));
        var outCliquesMessage = null;
        var outAskeMessage = null;
        var outMessage = null;

        if (message.dest === null || message.dest === '') {
            // Dealing with a broadcast downflow message.
            // Check for legal state transitions.
            if (message.agreement === 'initial') {
                _assert((this.state === ns.STATE.INIT_UPFLOW)
                        || (this.state === ns.STATE.INIT_DOWNFLOW)
                        || (this.state === ns.STATE.INITIALISED),
                        'Initial downflow can only follow an initial upflow (or own downflow).');
            } else {
                _assert((this.state === ns.STATE.INITIALISED)
                        || (this.state === ns.STATE.AUX_UPFLOW)
                        || (this.state === ns.STATE.AUX_DOWNFLOW),
                        'Auxiliary downflow can only follow an initialised state or auxiliary upflow (or own downflow).');
            }
            if (message.signingKey) {
                // Sender is quitting participation.
                // TODO: quit() stuff here: CLIQUES will need to refresh keys, but avoid a race condition if all do it.
                _assert(false, 'Key refresh for quitting is not implemented, yet!');
            } else {
                // Content for the CLIQUES protocol.
                if (message.intKeys && (message.intKeys.length === message.members.length)) {
                    this.cliquesMember.downflow(inCliquesMessage);
                }
                // Content for the signature key exchange protocol.
                if (message.nonces && (message.nonces.length === message.members.length)) {
                    outAskeMessage = this.askeMember.downflow(inAskeMessage);
                }
            }
            outMessage = this._mergeMessages(null, outAskeMessage);
            if (outMessage && message.agreement === 'initial') {
                // Can't be inferred from ASKE message alone.
                outMessage.agreement = 'initial';
            }
            // Handle state transitions.
            if (outMessage) {
                if (outMessage.agreement === 'initial') {
                    this.state = ns.STATE.INIT_DOWNFLOW;
                } else {
                    this.state = ns.STATE.AUX_DOWNFLOW;
                }
                this.stateUpdatedCallback(this);
            }
            if (this.askeMember.isSessionAcknowledged()) {
                // We have seen and verified all broadcasts from others.
                this.state = ns.STATE.INITIALISED;
                this.stateUpdatedCallback(this);
            }
        } else {
            // Dealing with a directed upflow message.
            // Check for legal state transitions.
            _assert((this.state === ns.STATE.INITIALISED)
                    || (this.state === ns.STATE.NULL),
                    'Auxiliary upflow can only follow an uninitialised or initialised state.');
            outCliquesMessage = this.cliquesMember.upflow(inCliquesMessage);
            outAskeMessage = this.askeMember.upflow(inAskeMessage);
            outMessage = this._mergeMessages(outCliquesMessage, outAskeMessage);
            // Handle state transitions.
            if (message.agreement === 'initial') {
                if (outMessage.dest === '') {
                    this.state = ns.STATE.INIT_DOWNFLOW;
                } else {
                    this.state = ns.STATE.INIT_UPFLOW;
                }
                this.stateUpdatedCallback(this);
            } else {
                if (outMessage.dest === '') {
                    this.state = ns.STATE.AUX_DOWNFLOW;
                } else {
                    this.state = ns.STATE.AUX_UPFLOW;
                }
                this.stateUpdatedCallback(this);
            }
        }
        return outMessage;
    };


    /**
     * Merges the contents of the messages for ASKE and CLIQUES into one message..
     *
     * @method
     * @param cliquesMessage {mpenc.greet.cliques.CliquesMessage}
     *     Message from CLIQUES protocol workflow.
     * @param askeMessage {mpenc.greet.ske.SignatureKeyExchangeMessage}
     *     Message from ASKE protocol workflow.
     * @returns {mpenc.messages.ProtocolMessage}
     *     Joined message (not wire encoded).
     */
    ns.ProtocolHandler.prototype._mergeMessages = function(cliquesMessage,
                                                           askeMessage) {
        // Are we done already?
        if (!cliquesMessage && !askeMessage) {
            return null;
        }

        var newMessage = new messages.ProtocolMessage(this.id);

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
        newMessage.flow = cliquesMessage.flow || askeMessage.flow;
        newMessage.members = cliquesMessage.members || askeMessage.members;
        newMessage.intKeys = cliquesMessage.intKeys || null;
        newMessage.debugKeys = cliquesMessage.debugKeys || null;
        newMessage.nonces = askeMessage.nonces || null;
        newMessage.pubKeys = askeMessage.pubKeys || null;
        newMessage.sessionSignature = askeMessage.sessionSignature || null;
        newMessage.signingKey = askeMessage.signingKey || null;
        if (cliquesMessage.agreement === 'ika') {
            newMessage.agreement = 'initial';
        } else {
            newMessage.agreement = 'auxilliary';
        }

        return newMessage;
    };


    /**
     * Extracts a CLIQUES message out of the received protocol handler message.
     *
     * @method
     * @param message {mpenc.messages.ProtocolMessage}
     *     Message from protocol handler.
     * @returns {mpenc.greet.cliques.CliquesMessage}
     *     Extracted message.
     */
    ns.ProtocolHandler.prototype._getCliquesMessage = function(message) {
        var newMessage = cliques.CliquesMessage(this.id);
        newMessage.source = message.source;
        newMessage.dest = message.dest;
        newMessage.flow = message.flow;
        newMessage.members = message.members;
        newMessage.intKeys = message.intKeys;
        newMessage.debugKeys = message.debugKeys;
        if (message.agreement === 'initial') {
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
     * @param message {mpenc.greet.messages.ProtocolMessage}
     *     Message from protocol handler.
     * @returns {mpenc.greet.ske.SignatureKeyExchangeMessage}
     *     Extracted message.
     */
    ns.ProtocolHandler.prototype._getAskeMessage = function(message) {
        var newMessage = ske.SignatureKeyExchangeMessage(this.id);
        newMessage.source = message.source;
        newMessage.dest = message.dest;
        newMessage.flow = message.flow;
        newMessage.members = message.members;
        newMessage.nonces = message.nonces;
        newMessage.pubKeys = message.pubKeys;
        newMessage.sessionSignature = message.sessionSignature;
        newMessage.signingKey = message.signingKey;

        return newMessage;
    };


    return ns;
});

/**
 * @fileOverview JavaScript mpEnc implementation.
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
    "mpenc/messages",
    "mpenc/version",
], function(codec, handler, messages, version) {
    

    /**
     * @exports mpenc
     * The multi-party encrypted chat protocol, public API.
     *
     * @description
     * This is eventually to be extended towards the mpOTR standard, currently
     * under development.
     */
    var mpenc = {};

    mpenc.version = version;

    mpenc.handler = handler;

    return mpenc;
});

    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    return require('mpenc');
}));
// See https://github.com/jrburke/almond#exporting-a-public-api
