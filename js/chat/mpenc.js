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

!function(a,b){function c(a){var b,c=a.length,d=new Uint8Array(c);for(b=0;c>b;b+=1)d[b]=a.charCodeAt(b);return d}function d(a){var b,c=[],d=a.length;for(1&d&&(a="0"+a,d++),b=0;d>b;b+=2)c.push(parseInt(a.substr(b,2),16));return new Uint8Array(c)}function e(a){return c(atob(a))}function f(a){for(var b="",c=0;c<a.length;c++)b+=String.fromCharCode(a[c]);return b}function g(a){for(var b=(a.byteLength||a.length)/a.length,c="",d=0;d<a.length;d++){var e=a[d].toString(16);e.length<2*b&&(c+="00000000000000".substr(0,2*b-e.length)),c+=e}return c}function h(a){return btoa(f(a))}function i(a){return a-=1,a|=a>>>1,a|=a>>>2,a|=a>>>4,a|=a>>>8,a|=a>>>16,a+=1}function j(a){return"number"==typeof a}function k(a){return"string"==typeof a}function l(a){return a instanceof ArrayBuffer}function m(a){return a instanceof Uint8Array}function n(a){return a instanceof Int8Array||a instanceof Uint8Array||a instanceof Int16Array||a instanceof Uint16Array||a instanceof Int32Array||a instanceof Uint32Array||a instanceof Float32Array||a instanceof Float64Array}function o(){Error.apply(this,arguments)}function p(){Error.apply(this,arguments)}function q(){Error.apply(this,arguments)}function r(a,b,c){"use asm";var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0;var u=0;var v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,$=0,_=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,$b=0,_b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,$c=0,_c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0,Md=0,Nd=0,Od=0,Pd=0,Qd=0,Rd=0,Sd=0,Td=0,Ud=0,Vd=0,Wd=0,Xd=0,Yd=0,Zd=0,$d=0,_d=0,ae=0,be=0,ce=0,de=0,ee=0,fe=0,ge=0,he=0,ie=0,je=0,ke=0,le=0,me=0,ne=0,oe=0,pe=0,qe=0,re=0,se=0,te=0,ue=0,ve=0,we=0,xe=0,ye=0,ze=0,Ae=0,Be=0,Ce=0,De=0,Ee=0,Fe=0,Ge=0,He=0,Ie=0,Je=0,Ke=0,Le=0,Me=0,Ne=0,Oe=0,Pe=0,Qe=0,Re=0,Se=0;var Te=new a.Uint8Array(c);function Ue(){var hf=0;L=v^Te[hf|I]^1;M=w^Te[hf|J];N=x^Te[hf|K];O=y^Te[hf|H];P=z^L;Q=A^M;R=B^N;S=C^O;T=D^P;U=E^Q;V=F^R;W=G^S;X=H^T;Y=I^U;Z=J^V;$=K^W;_=L^Te[hf|Y]^2;ab=M^Te[hf|Z];bb=N^Te[hf|$];cb=O^Te[hf|X];db=P^_;eb=Q^ab;fb=R^bb;gb=S^cb;hb=T^db;ib=U^eb;jb=V^fb;kb=W^gb;lb=X^hb;mb=Y^ib;nb=Z^jb;ob=$^kb;pb=_^Te[hf|mb]^4;qb=ab^Te[hf|nb];rb=bb^Te[hf|ob];sb=cb^Te[hf|lb];tb=db^pb;ub=eb^qb;vb=fb^rb;wb=gb^sb;xb=hb^tb;yb=ib^ub;zb=jb^vb;Ab=kb^wb;Bb=lb^xb;Cb=mb^yb;Db=nb^zb;Eb=ob^Ab;Fb=pb^Te[hf|Cb]^8;Gb=qb^Te[hf|Db];Hb=rb^Te[hf|Eb];Ib=sb^Te[hf|Bb];Jb=tb^Fb;Kb=ub^Gb;Lb=vb^Hb;Mb=wb^Ib;Nb=xb^Jb;Ob=yb^Kb;Pb=zb^Lb;Qb=Ab^Mb;Rb=Bb^Nb;Sb=Cb^Ob;Tb=Db^Pb;Ub=Eb^Qb;Vb=Fb^Te[hf|Sb]^16;Wb=Gb^Te[hf|Tb];Xb=Hb^Te[hf|Ub];Yb=Ib^Te[hf|Rb];Zb=Jb^Vb;$b=Kb^Wb;_b=Lb^Xb;ac=Mb^Yb;bc=Nb^Zb;cc=Ob^$b;dc=Pb^_b;ec=Qb^ac;fc=Rb^bc;gc=Sb^cc;hc=Tb^dc;ic=Ub^ec;jc=Vb^Te[hf|gc]^32;kc=Wb^Te[hf|hc];lc=Xb^Te[hf|ic];mc=Yb^Te[hf|fc];nc=Zb^jc;oc=$b^kc;pc=_b^lc;qc=ac^mc;rc=bc^nc;sc=cc^oc;tc=dc^pc;uc=ec^qc;vc=fc^rc;wc=gc^sc;xc=hc^tc;yc=ic^uc;zc=jc^Te[hf|wc]^64;Ac=kc^Te[hf|xc];Bc=lc^Te[hf|yc];Cc=mc^Te[hf|vc];Dc=nc^zc;Ec=oc^Ac;Fc=pc^Bc;Gc=qc^Cc;Hc=rc^Dc;Ic=sc^Ec;Jc=tc^Fc;Kc=uc^Gc;Lc=vc^Hc;Mc=wc^Ic;Nc=xc^Jc;Oc=yc^Kc;Pc=zc^Te[hf|Mc]^128;Qc=Ac^Te[hf|Nc];Rc=Bc^Te[hf|Oc];Sc=Cc^Te[hf|Lc];Tc=Dc^Pc;Uc=Ec^Qc;Vc=Fc^Rc;Wc=Gc^Sc;Xc=Hc^Tc;Yc=Ic^Uc;Zc=Jc^Vc;$c=Kc^Wc;_c=Lc^Xc;ad=Mc^Yc;bd=Nc^Zc;cd=Oc^$c;dd=Pc^Te[hf|ad]^27;ed=Qc^Te[hf|bd];fd=Rc^Te[hf|cd];gd=Sc^Te[hf|_c];hd=Tc^dd;id=Uc^ed;jd=Vc^fd;kd=Wc^gd;ld=Xc^hd;md=Yc^id;nd=Zc^jd;od=$c^kd;pd=_c^ld;qd=ad^md;rd=bd^nd;sd=cd^od;td=dd^Te[hf|qd]^54;ud=ed^Te[hf|rd];vd=fd^Te[hf|sd];wd=gd^Te[hf|pd];xd=hd^td;yd=id^ud;zd=jd^vd;Ad=kd^wd;Bd=ld^xd;Cd=md^yd;Dd=nd^zd;Ed=od^Ad;Fd=pd^Bd;Gd=qd^Cd;Hd=rd^Dd;Id=sd^Ed}function Ve(){var hf=0;_=v^Te[hf|Y]^1;ab=w^Te[hf|Z];bb=x^Te[hf|$];cb=y^Te[hf|X];db=z^_;eb=A^ab;fb=B^bb;gb=C^cb;hb=D^db;ib=E^eb;jb=F^fb;kb=G^gb;lb=H^hb;mb=I^ib;nb=J^jb;ob=K^kb;pb=L^Te[hf|lb];qb=M^Te[hf|mb];rb=N^Te[hf|nb];sb=O^Te[hf|ob];tb=P^pb;ub=Q^qb;vb=R^rb;wb=S^sb;xb=T^tb;yb=U^ub;zb=V^vb;Ab=W^wb;Bb=X^xb;Cb=Y^yb;Db=Z^zb;Eb=$^Ab;Fb=_^Te[hf|Cb]^2;Gb=ab^Te[hf|Db];Hb=bb^Te[hf|Eb];Ib=cb^Te[hf|Bb];Jb=db^Fb;Kb=eb^Gb;Lb=fb^Hb;Mb=gb^Ib;Nb=hb^Jb;Ob=ib^Kb;Pb=jb^Lb;Qb=kb^Mb;Rb=lb^Nb;Sb=mb^Ob;Tb=nb^Pb;Ub=ob^Qb;Vb=pb^Te[hf|Rb];Wb=qb^Te[hf|Sb];Xb=rb^Te[hf|Tb];Yb=sb^Te[hf|Ub];Zb=tb^Vb;$b=ub^Wb;_b=vb^Xb;ac=wb^Yb;bc=xb^Zb;cc=yb^$b;dc=zb^_b;ec=Ab^ac;fc=Bb^bc;gc=Cb^cc;hc=Db^dc;ic=Eb^ec;jc=Fb^Te[hf|gc]^4;kc=Gb^Te[hf|hc];lc=Hb^Te[hf|ic];mc=Ib^Te[hf|fc];nc=Jb^jc;oc=Kb^kc;pc=Lb^lc;qc=Mb^mc;rc=Nb^nc;sc=Ob^oc;tc=Pb^pc;uc=Qb^qc;vc=Rb^rc;wc=Sb^sc;xc=Tb^tc;yc=Ub^uc;zc=Vb^Te[hf|vc];Ac=Wb^Te[hf|wc];Bc=Xb^Te[hf|xc];Cc=Yb^Te[hf|yc];Dc=Zb^zc;Ec=$b^Ac;Fc=_b^Bc;Gc=ac^Cc;Hc=bc^Dc;Ic=cc^Ec;Jc=dc^Fc;Kc=ec^Gc;Lc=fc^Hc;Mc=gc^Ic;Nc=hc^Jc;Oc=ic^Kc;Pc=jc^Te[hf|Mc]^8;Qc=kc^Te[hf|Nc];Rc=lc^Te[hf|Oc];Sc=mc^Te[hf|Lc];Tc=nc^Pc;Uc=oc^Qc;Vc=pc^Rc;Wc=qc^Sc;Xc=rc^Tc;Yc=sc^Uc;Zc=tc^Vc;$c=uc^Wc;_c=vc^Xc;ad=wc^Yc;bd=xc^Zc;cd=yc^$c;dd=zc^Te[hf|_c];ed=Ac^Te[hf|ad];fd=Bc^Te[hf|bd];gd=Cc^Te[hf|cd];hd=Dc^dd;id=Ec^ed;jd=Fc^fd;kd=Gc^gd;ld=Hc^hd;md=Ic^id;nd=Jc^jd;od=Kc^kd;pd=Lc^ld;qd=Mc^md;rd=Nc^nd;sd=Oc^od;td=Pc^Te[hf|qd]^16;ud=Qc^Te[hf|rd];vd=Rc^Te[hf|sd];wd=Sc^Te[hf|pd];xd=Tc^td;yd=Uc^ud;zd=Vc^vd;Ad=Wc^wd;Bd=Xc^xd;Cd=Yc^yd;Dd=Zc^zd;Ed=$c^Ad;Fd=_c^Bd;Gd=ad^Cd;Hd=bd^Dd;Id=cd^Ed;Jd=dd^Te[hf|Fd];Kd=ed^Te[hf|Gd];Ld=fd^Te[hf|Hd];Md=gd^Te[hf|Id];Nd=hd^Jd;Od=id^Kd;Pd=jd^Ld;Qd=kd^Md;Rd=ld^Nd;Sd=md^Od;Td=nd^Pd;Ud=od^Qd;Vd=pd^Rd;Wd=qd^Sd;Xd=rd^Td;Yd=sd^Ud;Zd=td^Te[hf|Wd]^32;$d=ud^Te[hf|Xd];_d=vd^Te[hf|Yd];ae=wd^Te[hf|Vd];be=xd^Zd;ce=yd^$d;de=zd^_d;ee=Ad^ae;fe=Bd^be;ge=Cd^ce;he=Dd^de;ie=Ed^ee;je=Fd^fe;ke=Gd^ge;le=Hd^he;me=Id^ie;ne=Jd^Te[hf|je];oe=Kd^Te[hf|ke];pe=Ld^Te[hf|le];qe=Md^Te[hf|me];re=Nd^ne;se=Od^oe;te=Pd^pe;ue=Qd^qe;ve=Rd^re;we=Sd^se;xe=Td^te;ye=Ud^ue;ze=Vd^ve;Ae=Wd^we;Be=Xd^xe;Ce=Yd^ye;De=Zd^Te[hf|Ae]^64;Ee=$d^Te[hf|Be];Fe=_d^Te[hf|Ce];Ge=ae^Te[hf|ze];He=be^De;Ie=ce^Ee;Je=de^Fe;Ke=ee^Ge;Le=fe^He;Me=ge^Ie;Ne=he^Je;Oe=ie^Ke;Pe=je^Le;Qe=ke^Me;Re=le^Ne;Se=me^Oe}function We(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;var yf=0,zf=0,Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=512,Qf=768;hf=hf^v;jf=jf^w;kf=kf^x;lf=lf^y;mf=mf^z;nf=nf^A;of=of^B;pf=pf^C;qf=qf^D;rf=rf^E;sf=sf^F;tf=tf^G;uf=uf^H;vf=vf^I;wf=wf^J;xf=xf^K;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^L;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^M;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^N;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^O;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^P;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^Q;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^R;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^S;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^T;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^U;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^V;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^W;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^X;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^Y;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^Z;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^$;hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^_;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^ab;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^bb;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^cb;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^db;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^eb;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^fb;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^gb;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^hb;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^ib;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^jb;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^kb;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^lb;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^mb;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^nb;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^ob;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^pb;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^qb;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^rb;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^sb;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^tb;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^ub;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^vb;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^wb;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^xb;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^yb;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^zb;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^Ab;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^Bb;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^Cb;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^Db;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^Eb;hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^Fb;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^Gb;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^Hb;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^Ib;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^Jb;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^Kb;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^Lb;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^Mb;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^Nb;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^Ob;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^Pb;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^Qb;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^Rb;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^Sb;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^Tb;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^Ub;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^Vb;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^Wb;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^Xb;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^Yb;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^Zb;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^$b;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^_b;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^ac;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^bc;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^cc;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^dc;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^ec;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^fc;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^gc;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^hc;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^ic;hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^jc;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^kc;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^lc;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^mc;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^nc;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^oc;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^pc;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^qc;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^rc;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^sc;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^tc;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^uc;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^vc;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^wc;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^xc;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^yc;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^zc;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^Ac;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^Bc;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^Cc;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^Dc;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^Ec;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^Fc;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^Gc;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^Hc;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^Ic;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^Jc;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^Kc;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^Lc;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^Mc;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^Nc;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^Oc;hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^Pc;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^Qc;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^Rc;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^Sc;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^Tc;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^Uc;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^Vc;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^Wc;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^Xc;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^Yc;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^Zc;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^$c;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^_c;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^ad;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^bd;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^cd;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^dd;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^ed;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^fd;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^gd;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^hd;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^id;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^jd;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^kd;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^ld;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^md;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^nd;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^od;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^pd;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^qd;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^rd;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^sd;if((u|0)==16){d=Te[Of|yf]^td;e=Te[Of|Df]^ud;f=Te[Of|If]^vd;g=Te[Of|Nf]^wd;h=Te[Of|Cf]^xd;i=Te[Of|Hf]^yd;j=Te[Of|Mf]^zd;k=Te[Of|Bf]^Ad;l=Te[Of|Gf]^Bd;m=Te[Of|Lf]^Cd;n=Te[Of|Af]^Dd;o=Te[Of|Ff]^Ed;p=Te[Of|Kf]^Fd;q=Te[Of|zf]^Gd;s=Te[Of|Ef]^Hd;t=Te[Of|Jf]^Id;return}hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^td;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^ud;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^vd;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^wd;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^xd;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^yd;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^zd;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^Ad;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^Bd;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^Cd;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^Dd;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^Ed;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^Fd;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^Gd;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^Hd;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^Id;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^Jd;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^Kd;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^Ld;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^Md;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^Nd;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^Od;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^Pd;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^Qd;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^Rd;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^Sd;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^Td;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^Ud;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^Vd;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^Wd;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^Xd;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^Yd;hf=Te[Pf|yf]^Te[Qf|Df]^Te[Of|If]^Te[Of|Nf]^Zd;jf=Te[Of|yf]^Te[Pf|Df]^Te[Qf|If]^Te[Of|Nf]^$d;kf=Te[Of|yf]^Te[Of|Df]^Te[Pf|If]^Te[Qf|Nf]^_d;lf=Te[Qf|yf]^Te[Of|Df]^Te[Of|If]^Te[Pf|Nf]^ae;mf=Te[Pf|Cf]^Te[Qf|Hf]^Te[Of|Mf]^Te[Of|Bf]^be;nf=Te[Of|Cf]^Te[Pf|Hf]^Te[Qf|Mf]^Te[Of|Bf]^ce;of=Te[Of|Cf]^Te[Of|Hf]^Te[Pf|Mf]^Te[Qf|Bf]^de;pf=Te[Qf|Cf]^Te[Of|Hf]^Te[Of|Mf]^Te[Pf|Bf]^ee;qf=Te[Pf|Gf]^Te[Qf|Lf]^Te[Of|Af]^Te[Of|Ff]^fe;rf=Te[Of|Gf]^Te[Pf|Lf]^Te[Qf|Af]^Te[Of|Ff]^ge;sf=Te[Of|Gf]^Te[Of|Lf]^Te[Pf|Af]^Te[Qf|Ff]^he;tf=Te[Qf|Gf]^Te[Of|Lf]^Te[Of|Af]^Te[Pf|Ff]^ie;uf=Te[Pf|Kf]^Te[Qf|zf]^Te[Of|Ef]^Te[Of|Jf]^je;vf=Te[Of|Kf]^Te[Pf|zf]^Te[Qf|Ef]^Te[Of|Jf]^ke;wf=Te[Of|Kf]^Te[Of|zf]^Te[Pf|Ef]^Te[Qf|Jf]^le;xf=Te[Qf|Kf]^Te[Of|zf]^Te[Of|Ef]^Te[Pf|Jf]^me;yf=Te[Pf|hf]^Te[Qf|nf]^Te[Of|sf]^Te[Of|xf]^ne;zf=Te[Of|hf]^Te[Pf|nf]^Te[Qf|sf]^Te[Of|xf]^oe;Af=Te[Of|hf]^Te[Of|nf]^Te[Pf|sf]^Te[Qf|xf]^pe;Bf=Te[Qf|hf]^Te[Of|nf]^Te[Of|sf]^Te[Pf|xf]^qe;Cf=Te[Pf|mf]^Te[Qf|rf]^Te[Of|wf]^Te[Of|lf]^re;Df=Te[Of|mf]^Te[Pf|rf]^Te[Qf|wf]^Te[Of|lf]^se;Ef=Te[Of|mf]^Te[Of|rf]^Te[Pf|wf]^Te[Qf|lf]^te;Ff=Te[Qf|mf]^Te[Of|rf]^Te[Of|wf]^Te[Pf|lf]^ue;Gf=Te[Pf|qf]^Te[Qf|vf]^Te[Of|kf]^Te[Of|pf]^ve;Hf=Te[Of|qf]^Te[Pf|vf]^Te[Qf|kf]^Te[Of|pf]^we;If=Te[Of|qf]^Te[Of|vf]^Te[Pf|kf]^Te[Qf|pf]^xe;Jf=Te[Qf|qf]^Te[Of|vf]^Te[Of|kf]^Te[Pf|pf]^ye;Kf=Te[Pf|uf]^Te[Qf|jf]^Te[Of|of]^Te[Of|tf]^ze;Lf=Te[Of|uf]^Te[Pf|jf]^Te[Qf|of]^Te[Of|tf]^Ae;Mf=Te[Of|uf]^Te[Of|jf]^Te[Pf|of]^Te[Qf|tf]^Be;Nf=Te[Qf|uf]^Te[Of|jf]^Te[Of|of]^Te[Pf|tf]^Ce;d=Te[Of|yf]^De;e=Te[Of|Df]^Ee;f=Te[Of|If]^Fe;g=Te[Of|Nf]^Ge;h=Te[Of|Cf]^He;i=Te[Of|Hf]^Ie;j=Te[Of|Mf]^Je;k=Te[Of|Bf]^Ke;l=Te[Of|Gf]^Le;m=Te[Of|Lf]^Me;n=Te[Of|Af]^Ne;o=Te[Of|Ff]^Oe;p=Te[Of|Kf]^Pe;q=Te[Of|zf]^Qe;s=Te[Of|Ef]^Re;t=Te[Of|Jf]^Se}function Xe(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;var yf=0,zf=0,Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=256,Pf=1024,Qf=1280,Rf=1536,Sf=1792;if((u|0)==32){yf=Te[Of|hf^De]^ne;zf=Te[Of|vf^Qe]^oe;Af=Te[Of|sf^Ne]^pe;Bf=Te[Of|pf^Ke]^qe;Cf=Te[Of|mf^He]^re;Df=Te[Of|jf^Ee]^se;Ef=Te[Of|wf^Re]^te;Ff=Te[Of|tf^Oe]^ue;Gf=Te[Of|qf^Le]^ve;Hf=Te[Of|nf^Ie]^we;If=Te[Of|kf^Fe]^xe;Jf=Te[Of|xf^Se]^ye;Kf=Te[Of|uf^Pe]^ze;Lf=Te[Of|rf^Me]^Ae;Mf=Te[Of|of^Je]^Be;Nf=Te[Of|lf^Ge]^Ce;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^Zd;zf=Te[Of|jf]^$d;Af=Te[Of|kf]^_d;Bf=Te[Of|lf]^ae;Cf=Te[Of|mf]^be;Df=Te[Of|nf]^ce;Ef=Te[Of|of]^de;Ff=Te[Of|pf]^ee;Gf=Te[Of|qf]^fe;Hf=Te[Of|rf]^ge;If=Te[Of|sf]^he;Jf=Te[Of|tf]^ie;Kf=Te[Of|uf]^je;Lf=Te[Of|vf]^ke;Mf=Te[Of|wf]^le;Nf=Te[Of|xf]^me;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^Jd;zf=Te[Of|jf]^Kd;Af=Te[Of|kf]^Ld;Bf=Te[Of|lf]^Md;Cf=Te[Of|mf]^Nd;Df=Te[Of|nf]^Od;Ef=Te[Of|of]^Pd;Ff=Te[Of|pf]^Qd;Gf=Te[Of|qf]^Rd;Hf=Te[Of|rf]^Sd;If=Te[Of|sf]^Td;Jf=Te[Of|tf]^Ud;Kf=Te[Of|uf]^Vd;Lf=Te[Of|vf]^Wd;Mf=Te[Of|wf]^Xd;Nf=Te[Of|xf]^Yd;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^td;zf=Te[Of|jf]^ud;Af=Te[Of|kf]^vd;Bf=Te[Of|lf]^wd;Cf=Te[Of|mf]^xd;Df=Te[Of|nf]^yd;Ef=Te[Of|of]^zd;Ff=Te[Of|pf]^Ad;Gf=Te[Of|qf]^Bd;Hf=Te[Of|rf]^Cd;If=Te[Of|sf]^Dd;Jf=Te[Of|tf]^Ed;Kf=Te[Of|uf]^Fd;Lf=Te[Of|vf]^Gd;Mf=Te[Of|wf]^Hd;Nf=Te[Of|xf]^Id;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^dd;zf=Te[Of|jf]^ed;Af=Te[Of|kf]^fd;Bf=Te[Of|lf]^gd;Cf=Te[Of|mf]^hd;Df=Te[Of|nf]^id;Ef=Te[Of|of]^jd;Ff=Te[Of|pf]^kd;Gf=Te[Of|qf]^ld;Hf=Te[Of|rf]^md;If=Te[Of|sf]^nd;Jf=Te[Of|tf]^od;Kf=Te[Of|uf]^pd;Lf=Te[Of|vf]^qd;Mf=Te[Of|wf]^rd;Nf=Te[Of|xf]^sd}else{yf=Te[Of|hf^td]^dd;zf=Te[Of|vf^Gd]^ed;Af=Te[Of|sf^Dd]^fd;Bf=Te[Of|pf^Ad]^gd;Cf=Te[Of|mf^xd]^hd;Df=Te[Of|jf^ud]^id;Ef=Te[Of|wf^Hd]^jd;Ff=Te[Of|tf^Ed]^kd;Gf=Te[Of|qf^Bd]^ld;Hf=Te[Of|nf^yd]^md;If=Te[Of|kf^vd]^nd;Jf=Te[Of|xf^Id]^od;Kf=Te[Of|uf^Fd]^pd;Lf=Te[Of|rf^Cd]^qd;Mf=Te[Of|of^zd]^rd;Nf=Te[Of|lf^wd]^sd}hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^Pc;zf=Te[Of|jf]^Qc;Af=Te[Of|kf]^Rc;Bf=Te[Of|lf]^Sc;Cf=Te[Of|mf]^Tc;Df=Te[Of|nf]^Uc;Ef=Te[Of|of]^Vc;Ff=Te[Of|pf]^Wc;Gf=Te[Of|qf]^Xc;Hf=Te[Of|rf]^Yc;If=Te[Of|sf]^Zc;Jf=Te[Of|tf]^$c;Kf=Te[Of|uf]^_c;Lf=Te[Of|vf]^ad;Mf=Te[Of|wf]^bd;Nf=Te[Of|xf]^cd;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^zc;zf=Te[Of|jf]^Ac;Af=Te[Of|kf]^Bc;Bf=Te[Of|lf]^Cc;Cf=Te[Of|mf]^Dc;Df=Te[Of|nf]^Ec;Ef=Te[Of|of]^Fc;Ff=Te[Of|pf]^Gc;Gf=Te[Of|qf]^Hc;Hf=Te[Of|rf]^Ic;If=Te[Of|sf]^Jc;Jf=Te[Of|tf]^Kc;Kf=Te[Of|uf]^Lc;Lf=Te[Of|vf]^Mc;Mf=Te[Of|wf]^Nc;Nf=Te[Of|xf]^Oc;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^jc;zf=Te[Of|jf]^kc;Af=Te[Of|kf]^lc;Bf=Te[Of|lf]^mc;Cf=Te[Of|mf]^nc;Df=Te[Of|nf]^oc;Ef=Te[Of|of]^pc;Ff=Te[Of|pf]^qc;Gf=Te[Of|qf]^rc;Hf=Te[Of|rf]^sc;If=Te[Of|sf]^tc;Jf=Te[Of|tf]^uc;Kf=Te[Of|uf]^vc;Lf=Te[Of|vf]^wc;Mf=Te[Of|wf]^xc;Nf=Te[Of|xf]^yc;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^Vb;zf=Te[Of|jf]^Wb;Af=Te[Of|kf]^Xb;Bf=Te[Of|lf]^Yb;Cf=Te[Of|mf]^Zb;Df=Te[Of|nf]^$b;Ef=Te[Of|of]^_b;Ff=Te[Of|pf]^ac;Gf=Te[Of|qf]^bc;Hf=Te[Of|rf]^cc;If=Te[Of|sf]^dc;Jf=Te[Of|tf]^ec;Kf=Te[Of|uf]^fc;Lf=Te[Of|vf]^gc;Mf=Te[Of|wf]^hc;Nf=Te[Of|xf]^ic;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^Fb;zf=Te[Of|jf]^Gb;Af=Te[Of|kf]^Hb;Bf=Te[Of|lf]^Ib;Cf=Te[Of|mf]^Jb;Df=Te[Of|nf]^Kb;Ef=Te[Of|of]^Lb;Ff=Te[Of|pf]^Mb;Gf=Te[Of|qf]^Nb;Hf=Te[Of|rf]^Ob;If=Te[Of|sf]^Pb;Jf=Te[Of|tf]^Qb;Kf=Te[Of|uf]^Rb;Lf=Te[Of|vf]^Sb;Mf=Te[Of|wf]^Tb;Nf=Te[Of|xf]^Ub;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^pb;zf=Te[Of|jf]^qb;Af=Te[Of|kf]^rb;Bf=Te[Of|lf]^sb;Cf=Te[Of|mf]^tb;Df=Te[Of|nf]^ub;Ef=Te[Of|of]^vb;Ff=Te[Of|pf]^wb;Gf=Te[Of|qf]^xb;Hf=Te[Of|rf]^yb;If=Te[Of|sf]^zb;Jf=Te[Of|tf]^Ab;Kf=Te[Of|uf]^Bb;Lf=Te[Of|vf]^Cb;Mf=Te[Of|wf]^Db;Nf=Te[Of|xf]^Eb;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^_;zf=Te[Of|jf]^ab;Af=Te[Of|kf]^bb;Bf=Te[Of|lf]^cb;Cf=Te[Of|mf]^db;Df=Te[Of|nf]^eb;Ef=Te[Of|of]^fb;Ff=Te[Of|pf]^gb;Gf=Te[Of|qf]^hb;Hf=Te[Of|rf]^ib;If=Te[Of|sf]^jb;Jf=Te[Of|tf]^kb;Kf=Te[Of|uf]^lb;Lf=Te[Of|vf]^mb;Mf=Te[Of|wf]^nb;Nf=Te[Of|xf]^ob;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];yf=Te[Of|hf]^L;zf=Te[Of|jf]^M;Af=Te[Of|kf]^N;Bf=Te[Of|lf]^O;Cf=Te[Of|mf]^P;Df=Te[Of|nf]^Q;Ef=Te[Of|of]^R;Ff=Te[Of|pf]^S;Gf=Te[Of|qf]^T;Hf=Te[Of|rf]^U;If=Te[Of|sf]^V;Jf=Te[Of|tf]^W;Kf=Te[Of|uf]^X;Lf=Te[Of|vf]^Y;Mf=Te[Of|wf]^Z;Nf=Te[Of|xf]^$;hf=Te[Sf|yf]^Te[Qf|zf]^Te[Rf|Af]^Te[Pf|Bf];jf=Te[Pf|Kf]^Te[Sf|Lf]^Te[Qf|Mf]^Te[Rf|Nf];kf=Te[Rf|Gf]^Te[Pf|Hf]^Te[Sf|If]^Te[Qf|Jf];lf=Te[Qf|Cf]^Te[Rf|Df]^Te[Pf|Ef]^Te[Sf|Ff];mf=Te[Sf|Cf]^Te[Qf|Df]^Te[Rf|Ef]^Te[Pf|Ff];nf=Te[Pf|yf]^Te[Sf|zf]^Te[Qf|Af]^Te[Rf|Bf];of=Te[Rf|Kf]^Te[Pf|Lf]^Te[Sf|Mf]^Te[Qf|Nf];pf=Te[Qf|Gf]^Te[Rf|Hf]^Te[Pf|If]^Te[Sf|Jf];qf=Te[Sf|Gf]^Te[Qf|Hf]^Te[Rf|If]^Te[Pf|Jf];rf=Te[Pf|Cf]^Te[Sf|Df]^Te[Qf|Ef]^Te[Rf|Ff];sf=Te[Rf|yf]^Te[Pf|zf]^Te[Sf|Af]^Te[Qf|Bf];tf=Te[Qf|Kf]^Te[Rf|Lf]^Te[Pf|Mf]^Te[Sf|Nf];uf=Te[Sf|Kf]^Te[Qf|Lf]^Te[Rf|Mf]^Te[Pf|Nf];vf=Te[Pf|Gf]^Te[Sf|Hf]^Te[Qf|If]^Te[Rf|Jf];wf=Te[Rf|Cf]^Te[Pf|Df]^Te[Sf|Ef]^Te[Qf|Ff];xf=Te[Qf|yf]^Te[Rf|zf]^Te[Pf|Af]^Te[Sf|Bf];d=Te[Of|hf]^v;e=Te[Of|jf]^w;f=Te[Of|kf]^x;g=Te[Of|lf]^y;h=Te[Of|mf]^z;i=Te[Of|nf]^A;j=Te[Of|of]^B;k=Te[Of|pf]^C;l=Te[Of|qf]^D;m=Te[Of|rf]^E;n=Te[Of|sf]^F;o=Te[Of|tf]^G;p=Te[Of|uf]^H;q=Te[Of|vf]^I;s=Te[Of|wf]^J;t=Te[Of|xf]^K}function Ye(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;d=hf;e=jf;f=kf;g=lf;h=mf;i=nf;j=of;k=pf;l=qf;m=rf;n=sf;o=tf;p=uf;q=vf;s=wf;t=xf}function Ze(hf){hf=hf|0;Te[hf]=d;Te[hf|1]=e;Te[hf|2]=f;Te[hf|3]=g;Te[hf|4]=h;Te[hf|5]=i;Te[hf|6]=j;Te[hf|7]=k;Te[hf|8]=l;Te[hf|9]=m;Te[hf|10]=n;Te[hf|11]=o;Te[hf|12]=p;Te[hf|13]=q;Te[hf|14]=s;Te[hf|15]=t}function $e(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;v=hf;w=jf;x=kf;y=lf;z=mf;A=nf;B=of;C=pf;D=qf;E=rf;F=sf;G=tf;H=uf;I=vf;J=wf;K=xf;u=16;Ue()}function _e(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf,yf,zf,Af,Bf,Cf,Df,Ef,Ff,Gf,Hf,If,Jf,Kf,Lf,Mf,Nf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;yf=yf|0;zf=zf|0;Af=Af|0;Bf=Bf|0;Cf=Cf|0;Df=Df|0;Ef=Ef|0;Ff=Ff|0;Gf=Gf|0;Hf=Hf|0;If=If|0;Jf=Jf|0;Kf=Kf|0;Lf=Lf|0;Mf=Mf|0;Nf=Nf|0;v=hf;w=jf;x=kf;y=lf;z=mf;A=nf;B=of;C=pf;D=qf;E=rf;F=sf;G=tf;H=uf;I=vf;J=wf;K=xf;L=yf;M=zf;N=Af;O=Bf;P=Cf;Q=Df;R=Ef;S=Ff;T=Gf;U=Hf;V=If;W=Jf;X=Kf;Y=Lf;Z=Mf;$=Nf;u=32;Ve()}function af(hf,jf){hf=hf|0;jf=jf|0;var kf=0;if(hf&15)return-1;while((jf|0)>=16){We(d^Te[hf],e^Te[hf|1],f^Te[hf|2],g^Te[hf|3],h^Te[hf|4],i^Te[hf|5],j^Te[hf|6],k^Te[hf|7],l^Te[hf|8],m^Te[hf|9],n^Te[hf|10],o^Te[hf|11],p^Te[hf|12],q^Te[hf|13],s^Te[hf|14],t^Te[hf|15]);Te[hf]=d;Te[hf|1]=e;Te[hf|2]=f;Te[hf|3]=g;Te[hf|4]=h;Te[hf|5]=i;Te[hf|6]=j;Te[hf|7]=k;Te[hf|8]=l;Te[hf|9]=m;Te[hf|10]=n;Te[hf|11]=o;Te[hf|12]=p;Te[hf|13]=q;Te[hf|14]=s;Te[hf|15]=t;hf=hf+16|0;jf=jf-16|0;kf=kf+16|0}return kf|0}function bf(hf,jf){hf=hf|0;jf=jf|0;var kf=0,lf=0,mf=0,nf=0,of=0,pf=0,qf=0,rf=0,sf=0,tf=0,uf=0,vf=0,wf=0,xf=0,yf=0,zf=0,Af=0;if(hf&15)return-1;kf=d;lf=e;mf=f;nf=g;of=h;pf=i;qf=j;
rf=k;sf=l;tf=m;uf=n;vf=o;wf=p;xf=q;yf=s;zf=t;while((jf|0)>=16){Xe(Te[hf]|0,Te[hf|1]|0,Te[hf|2]|0,Te[hf|3]|0,Te[hf|4]|0,Te[hf|5]|0,Te[hf|6]|0,Te[hf|7]|0,Te[hf|8]|0,Te[hf|9]|0,Te[hf|10]|0,Te[hf|11]|0,Te[hf|12]|0,Te[hf|13]|0,Te[hf|14]|0,Te[hf|15]|0);d=d^kf;kf=Te[hf]|0;e=e^lf;lf=Te[hf|1]|0;f=f^mf;mf=Te[hf|2]|0;g=g^nf;nf=Te[hf|3]|0;h=h^of;of=Te[hf|4]|0;i=i^pf;pf=Te[hf|5]|0;j=j^qf;qf=Te[hf|6]|0;k=k^rf;rf=Te[hf|7]|0;l=l^sf;sf=Te[hf|8]|0;m=m^tf;tf=Te[hf|9]|0;n=n^uf;uf=Te[hf|10]|0;o=o^vf;vf=Te[hf|11]|0;p=p^wf;wf=Te[hf|12]|0;q=q^xf;xf=Te[hf|13]|0;s=s^yf;yf=Te[hf|14]|0;t=t^zf;zf=Te[hf|15]|0;Te[hf]=d;Te[hf|1]=e;Te[hf|2]=f;Te[hf|3]=g;Te[hf|4]=h;Te[hf|5]=i;Te[hf|6]=j;Te[hf|7]=k;Te[hf|8]=l;Te[hf|9]=m;Te[hf|10]=n;Te[hf|11]=o;Te[hf|12]=p;Te[hf|13]=q;Te[hf|14]=s;Te[hf|15]=t;hf=hf+16|0;jf=jf-16|0;Af=Af+16|0}d=kf;e=lf;f=mf;g=nf;h=of;i=pf;j=qf;k=rf;l=sf;m=tf;n=uf;o=vf;p=wf;q=xf;s=yf;t=zf;return Af|0}function cf(hf,jf,kf){hf=hf|0;jf=jf|0;kf=kf|0;if(hf&15)return-1;if(~kf)if(kf&31)return-1;while((jf|0)>=16){We(d^Te[hf],e^Te[hf|1],f^Te[hf|2],g^Te[hf|3],h^Te[hf|4],i^Te[hf|5],j^Te[hf|6],k^Te[hf|7],l^Te[hf|8],m^Te[hf|9],n^Te[hf|10],o^Te[hf|11],p^Te[hf|12],q^Te[hf|13],s^Te[hf|14],t^Te[hf|15]);hf=hf+16|0;jf=jf-16|0}if((jf|0)>0){d=d^Te[hf];if((jf|0)>1)e=e^Te[hf|1];if((jf|0)>2)f=f^Te[hf|2];if((jf|0)>3)g=g^Te[hf|3];if((jf|0)>4)h=h^Te[hf|4];if((jf|0)>5)i=i^Te[hf|5];if((jf|0)>6)j=j^Te[hf|6];if((jf|0)>7)k=k^Te[hf|7];if((jf|0)>8)l=l^Te[hf|8];if((jf|0)>9)m=m^Te[hf|9];if((jf|0)>10)n=n^Te[hf|10];if((jf|0)>11)o=o^Te[hf|11];if((jf|0)>12)p=p^Te[hf|12];if((jf|0)>13)q=q^Te[hf|13];if((jf|0)>14)s=s^Te[hf|14];We(d,e,f,g,h,i,j,k,l,m,n,o,p,q,s,t);hf=hf+jf|0;jf=0}if(~kf){Te[kf|0]=d;Te[kf|1]=e;Te[kf|2]=f;Te[kf|3]=g;Te[kf|4]=h;Te[kf|5]=i;Te[kf|6]=j;Te[kf|7]=k;Te[kf|8]=l;Te[kf|9]=m;Te[kf|10]=n;Te[kf|11]=o;Te[kf|12]=p;Te[kf|13]=q;Te[kf|14]=s;Te[kf|15]=t}return 0}function df(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf,yf,zf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;yf=yf|0;zf=zf|0;var Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=0,Qf=0,Rf=0,Sf=0,Tf=0,Uf=0,Vf=0,Wf=0,Xf=0,Yf=0,Zf=0,$f=0,_f=0,ag=0,bg=0,cg=0,dg=0,eg=0;if(hf&15)return-1;Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;while((jf|0)>=16){Qf=Te[hf]|0;Rf=Te[hf|1]|0;Sf=Te[hf|2]|0;Tf=Te[hf|3]|0;Uf=Te[hf|4]|0;Vf=Te[hf|5]|0;Wf=Te[hf|6]|0;Xf=Te[hf|7]|0;Yf=Te[hf|8]|0;Zf=Te[hf|9]|0;$f=Te[hf|10]|0;_f=Te[hf|11]|0;ag=Te[hf|12]|0;bg=Te[hf|13]|0;cg=Te[hf|14]|0;dg=Te[hf|15]|0;We(kf,lf,mf,nf,of,pf,qf,rf,sf^yf>>>24,tf^yf>>>16&255,uf^yf>>>8&255,vf^yf&255,wf^zf>>>24,xf^zf>>>16&255,zf>>>8&255,zf&255);Te[hf]=Qf^d;Te[hf|1]=Rf^e;Te[hf|2]=Sf^f;Te[hf|3]=Tf^g;Te[hf|4]=Uf^h;Te[hf|5]=Vf^i;Te[hf|6]=Wf^j;Te[hf|7]=Xf^k;Te[hf|8]=Yf^l;Te[hf|9]=Zf^m;Te[hf|10]=$f^n;Te[hf|11]=_f^o;Te[hf|12]=ag^p;Te[hf|13]=bg^q;Te[hf|14]=cg^s;Te[hf|15]=dg^t;We(Qf^Af,Rf^Bf,Sf^Cf,Tf^Df,Uf^Ef,Vf^Ff,Wf^Gf,Xf^Hf,Yf^If,Zf^Jf,$f^Kf,_f^Lf,ag^Mf,bg^Nf,cg^Of,dg^Pf);Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;eg=eg+16|0;hf=hf+16|0;jf=jf-16|0;zf=zf+1|0;if((zf|0)==0)yf=yf+1|0}if((jf|0)>0){Qf=Te[hf]|0;Rf=(jf|0)>1?Te[hf|1]|0:0;Sf=(jf|0)>2?Te[hf|2]|0:0;Tf=(jf|0)>3?Te[hf|3]|0:0;Uf=(jf|0)>4?Te[hf|4]|0:0;Vf=(jf|0)>5?Te[hf|5]|0:0;Wf=(jf|0)>6?Te[hf|6]|0:0;Xf=(jf|0)>7?Te[hf|7]|0:0;Yf=(jf|0)>8?Te[hf|8]|0:0;Zf=(jf|0)>9?Te[hf|9]|0:0;$f=(jf|0)>10?Te[hf|10]|0:0;_f=(jf|0)>11?Te[hf|11]|0:0;ag=(jf|0)>12?Te[hf|12]|0:0;bg=(jf|0)>13?Te[hf|13]|0:0;cg=(jf|0)>14?Te[hf|14]|0:0;We(kf,lf,mf,nf,of,pf,qf,rf,sf^yf>>>24,tf^yf>>>16&255,uf^yf>>>8&255,vf^yf&255,wf^zf>>>24,xf^zf>>>16&255,zf>>>8&255,zf&255);Te[hf]=Qf^d;if((jf|0)>1)Te[hf|1]=Rf^e;if((jf|0)>2)Te[hf|2]=Sf^f;if((jf|0)>3)Te[hf|3]=Tf^g;if((jf|0)>4)Te[hf|4]=Uf^h;if((jf|0)>5)Te[hf|5]=Vf^i;if((jf|0)>6)Te[hf|6]=Wf^j;if((jf|0)>7)Te[hf|7]=Xf^k;if((jf|0)>8)Te[hf|8]=Yf^l;if((jf|0)>9)Te[hf|9]=Zf^m;if((jf|0)>10)Te[hf|10]=$f^n;if((jf|0)>11)Te[hf|11]=_f^o;if((jf|0)>12)Te[hf|12]=ag^p;if((jf|0)>13)Te[hf|13]=bg^q;if((jf|0)>14)Te[hf|14]=cg^s;We(Qf^Af,Rf^Bf,Sf^Cf,Tf^Df,Uf^Ef,Vf^Ff,Wf^Gf,Xf^Hf,Yf^If,Zf^Jf,$f^Kf,_f^Lf,ag^Mf,bg^Nf,cg^Of,Pf);Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;eg=eg+jf|0;hf=hf+jf|0;jf=0;zf=zf+1|0;if((zf|0)==0)yf=yf+1|0}return eg|0}function ef(hf,jf,kf,lf,mf,nf,of,pf,qf,rf,sf,tf,uf,vf,wf,xf,yf,zf){hf=hf|0;jf=jf|0;kf=kf|0;lf=lf|0;mf=mf|0;nf=nf|0;of=of|0;pf=pf|0;qf=qf|0;rf=rf|0;sf=sf|0;tf=tf|0;uf=uf|0;vf=vf|0;wf=wf|0;xf=xf|0;yf=yf|0;zf=zf|0;var Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=0,Qf=0,Rf=0,Sf=0,Tf=0,Uf=0,Vf=0,Wf=0,Xf=0,Yf=0,Zf=0,$f=0,_f=0,ag=0,bg=0,cg=0,dg=0,eg=0;if(hf&15)return-1;Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;while((jf|0)>=16){We(kf,lf,mf,nf,of,pf,qf,rf,sf^yf>>>24,tf^yf>>>16&255,uf^yf>>>8&255,vf^yf&255,wf^zf>>>24,xf^zf>>>16&255,zf>>>8&255,zf&255);Te[hf]=Qf=Te[hf]^d;Te[hf|1]=Rf=Te[hf|1]^e;Te[hf|2]=Sf=Te[hf|2]^f;Te[hf|3]=Tf=Te[hf|3]^g;Te[hf|4]=Uf=Te[hf|4]^h;Te[hf|5]=Vf=Te[hf|5]^i;Te[hf|6]=Wf=Te[hf|6]^j;Te[hf|7]=Xf=Te[hf|7]^k;Te[hf|8]=Yf=Te[hf|8]^l;Te[hf|9]=Zf=Te[hf|9]^m;Te[hf|10]=$f=Te[hf|10]^n;Te[hf|11]=_f=Te[hf|11]^o;Te[hf|12]=ag=Te[hf|12]^p;Te[hf|13]=bg=Te[hf|13]^q;Te[hf|14]=cg=Te[hf|14]^s;Te[hf|15]=dg=Te[hf|15]^t;We(Qf^Af,Rf^Bf,Sf^Cf,Tf^Df,Uf^Ef,Vf^Ff,Wf^Gf,Xf^Hf,Yf^If,Zf^Jf,$f^Kf,_f^Lf,ag^Mf,bg^Nf,cg^Of,dg^Pf);Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;eg=eg+16|0;hf=hf+16|0;jf=jf-16|0;zf=zf+1|0;if((zf|0)==0)yf=yf+1|0}if((jf|0)>0){We(kf,lf,mf,nf,of,pf,qf,rf,sf^yf>>>24,tf^yf>>>16&255,uf^yf>>>8&255,vf^yf&255,wf^zf>>>24,xf^zf>>>16&255,zf>>>8&255,zf&255);Qf=Te[hf]^d;Rf=(jf|0)>1?Te[hf|1]^e:0;Sf=(jf|0)>2?Te[hf|2]^f:0;Tf=(jf|0)>3?Te[hf|3]^g:0;Uf=(jf|0)>4?Te[hf|4]^h:0;Vf=(jf|0)>5?Te[hf|5]^i:0;Wf=(jf|0)>6?Te[hf|6]^j:0;Xf=(jf|0)>7?Te[hf|7]^k:0;Yf=(jf|0)>8?Te[hf|8]^l:0;Zf=(jf|0)>9?Te[hf|9]^m:0;$f=(jf|0)>10?Te[hf|10]^n:0;_f=(jf|0)>11?Te[hf|11]^o:0;ag=(jf|0)>12?Te[hf|12]^p:0;bg=(jf|0)>13?Te[hf|13]^q:0;cg=(jf|0)>14?Te[hf|14]^s:0;dg=(jf|0)>15?Te[hf|15]^t:0;Te[hf]=Qf;if((jf|0)>1)Te[hf|1]=Rf;if((jf|0)>2)Te[hf|2]=Sf;if((jf|0)>3)Te[hf|3]=Tf;if((jf|0)>4)Te[hf|4]=Uf;if((jf|0)>5)Te[hf|5]=Vf;if((jf|0)>6)Te[hf|6]=Wf;if((jf|0)>7)Te[hf|7]=Xf;if((jf|0)>8)Te[hf|8]=Yf;if((jf|0)>9)Te[hf|9]=Zf;if((jf|0)>10)Te[hf|10]=$f;if((jf|0)>11)Te[hf|11]=_f;if((jf|0)>12)Te[hf|12]=ag;if((jf|0)>13)Te[hf|13]=bg;if((jf|0)>14)Te[hf|14]=cg;We(Qf^Af,Rf^Bf,Sf^Cf,Tf^Df,Uf^Ef,Vf^Ff,Wf^Gf,Xf^Hf,Yf^If,Zf^Jf,$f^Kf,_f^Lf,ag^Mf,bg^Nf,cg^Of,dg^Pf);Af=d,Bf=e,Cf=f,Df=g,Ef=h,Ff=i,Gf=j,Hf=k,If=l,Jf=m,Kf=n,Lf=o,Mf=p,Nf=q,Of=s,Pf=t;eg=eg+jf|0;hf=hf+jf|0;jf=0;zf=zf+1|0;if((zf|0)==0)yf=yf+1|0}return eg|0}function ff(hf,jf){hf=hf|0;jf=jf|0;var kf=0;if(hf&15)return-1;while((jf|0)>=16){We(d,e,f,g,h,i,j,k,l,m,n,o,p,q,s,t);d=d^Te[hf];e=e^Te[hf|1];f=f^Te[hf|2];g=g^Te[hf|3];h=h^Te[hf|4];i=i^Te[hf|5];j=j^Te[hf|6];k=k^Te[hf|7];l=l^Te[hf|8];m=m^Te[hf|9];n=n^Te[hf|10];o=o^Te[hf|11];p=p^Te[hf|12];q=q^Te[hf|13];s=s^Te[hf|14];t=t^Te[hf|15];Te[hf]=d;Te[hf|1]=e;Te[hf|2]=f;Te[hf|3]=g;Te[hf|4]=h;Te[hf|5]=i;Te[hf|6]=j;Te[hf|7]=k;Te[hf|8]=l;Te[hf|9]=m;Te[hf|10]=n;Te[hf|11]=o;Te[hf|12]=p;Te[hf|13]=q;Te[hf|14]=s;Te[hf|15]=t;hf=hf+16|0;jf=jf-16|0;kf=kf+16|0}if((jf|0)>0){We(d,e,f,g,h,i,j,k,l,m,n,o,p,q,s,t);Te[hf]=Te[hf]^d;if((jf|0)>1)Te[hf|1]=Te[hf|1]^e;if((jf|0)>2)Te[hf|2]=Te[hf|2]^f;if((jf|0)>3)Te[hf|3]=Te[hf|3]^g;if((jf|0)>4)Te[hf|4]=Te[hf|4]^h;if((jf|0)>5)Te[hf|5]=Te[hf|5]^i;if((jf|0)>6)Te[hf|6]=Te[hf|6]^j;if((jf|0)>7)Te[hf|7]=Te[hf|7]^k;if((jf|0)>8)Te[hf|8]=Te[hf|8]^l;if((jf|0)>9)Te[hf|9]=Te[hf|9]^m;if((jf|0)>10)Te[hf|10]=Te[hf|10]^n;if((jf|0)>11)Te[hf|11]=Te[hf|11]^o;if((jf|0)>12)Te[hf|12]=Te[hf|12]^p;if((jf|0)>13)Te[hf|13]=Te[hf|13]^q;if((jf|0)>14)Te[hf|14]=Te[hf|14]^s;kf=kf+jf|0;hf=hf+jf|0;jf=0}return kf|0}function gf(hf,jf){hf=hf|0;jf=jf|0;var kf=0,lf=0,mf=0,nf=0,of=0,pf=0,qf=0,rf=0,sf=0,tf=0,uf=0,vf=0,wf=0,xf=0,yf=0,zf=0,Af=0;if(hf&15)return-1;while((jf|0)>=16){We(d,e,f,g,h,i,j,k,l,m,n,o,p,q,s,t);kf=Te[hf]|0;lf=Te[hf|1]|0;mf=Te[hf|2]|0;nf=Te[hf|3]|0;of=Te[hf|4]|0;pf=Te[hf|5]|0;qf=Te[hf|6]|0;rf=Te[hf|7]|0;sf=Te[hf|8]|0;tf=Te[hf|9]|0;uf=Te[hf|10]|0;vf=Te[hf|11]|0;wf=Te[hf|12]|0;xf=Te[hf|13]|0;yf=Te[hf|14]|0;zf=Te[hf|15]|0;Te[hf]=d^kf;Te[hf|1]=e^lf;Te[hf|2]=f^mf;Te[hf|3]=g^nf;Te[hf|4]=h^of;Te[hf|5]=i^pf;Te[hf|6]=j^qf;Te[hf|7]=k^rf;Te[hf|8]=l^sf;Te[hf|9]=m^tf;Te[hf|10]=n^uf;Te[hf|11]=o^vf;Te[hf|12]=p^wf;Te[hf|13]=q^xf;Te[hf|14]=s^yf;Te[hf|15]=t^zf;d=kf;e=lf;f=mf;g=nf;h=of;i=pf;j=qf;k=rf;l=sf;m=tf;n=uf;o=vf;p=wf;q=xf;s=yf;t=zf;hf=hf+16|0;jf=jf-16|0;Af=Af+16|0}if((jf|0)>0){We(d,e,f,g,h,i,j,k,l,m,n,o,p,q,s,t);Te[hf]=Te[hf]^d;if((jf|0)>1)Te[hf|1]=Te[hf|1]^e;if((jf|0)>2)Te[hf|2]=Te[hf|2]^f;if((jf|0)>3)Te[hf|3]=Te[hf|3]^g;if((jf|0)>4)Te[hf|4]=Te[hf|4]^h;if((jf|0)>5)Te[hf|5]=Te[hf|5]^i;if((jf|0)>6)Te[hf|6]=Te[hf|6]^j;if((jf|0)>7)Te[hf|7]=Te[hf|7]^k;if((jf|0)>8)Te[hf|8]=Te[hf|8]^l;if((jf|0)>9)Te[hf|9]=Te[hf|9]^m;if((jf|0)>10)Te[hf|10]=Te[hf|10]^n;if((jf|0)>11)Te[hf|11]=Te[hf|11]^o;if((jf|0)>12)Te[hf|12]=Te[hf|12]^p;if((jf|0)>13)Te[hf|13]=Te[hf|13]^q;if((jf|0)>14)Te[hf|14]=Te[hf|14]^s;Af=Af+jf|0;hf=hf+jf|0;jf=0}return Af|0}return{init_state:Ye,save_state:Ze,init_key_128:$e,init_key_256:_e,cbc_encrypt:af,cbc_decrypt:bf,cbc_mac:cf,ccm_encrypt:df,ccm_decrypt:ef,cfb_encrypt:ff,cfb_decrypt:gf}}function s(a,b,c){var d=new Uint8Array(c);return d.set(Vc),r(a,b,c)}function t(a){if(a=a||{},a.heapSize=a.heapSize||4096,a.heapSize<=0||a.heapSize%4096)throw new p("heapSize must be a positive number and multiple of 4096");this.BLOCK_SIZE=Xc,this.heap=a.heap||new Uint8Array(a.heapSize),this.asm=a.asm||s(b,null,this.heap.buffer),this.pos=Wc,this.len=0,this.key=null,this.result=null,this.reset(a)}function u(a){a=a||{},this.result=null,this.pos=Wc,this.len=0;var b=this.asm,c=a.key;if(void 0!==c){if(l(c)||m(c))c=new Uint8Array(c);else{if(!k(c))throw new TypeError("unexpected key type");var d=c;c=new Uint8Array(d.length);for(var e=0;e<d.length;++e)c[e]=d.charCodeAt(e)}if(16===c.length)this.key=c,b.init_key_128.call(b,c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],c[9],c[10],c[11],c[12],c[13],c[14],c[15]);else{if(24===c.length)throw new p("illegal key size");if(32!==c.length)throw new p("illegal key size");this.key=c,b.init_key_256.call(b,c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],c[9],c[10],c[11],c[12],c[13],c[14],c[15],c[16],c[17],c[18],c[19],c[20],c[21],c[22],c[23],c[24],c[25],c[26],c[27],c[28],c[29],c[30],c[31])}}return this}function v(a){var b=this.asm;if(void 0!==a){if(l(a)||m(a))a=new Uint8Array(a);else{if(!k(a))throw new TypeError("unexpected iv type");var c=a;a=new Uint8Array(c.length);for(var d=0;d<c.length;++d)a[d]=c.charCodeAt(d)}if(a.length!==Xc)throw new p("illegal iv size");this.iv=a,b.init_state.call(b,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12],a[13],a[14],a[15])}else this.iv=null,b.init_state.call(b,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)}function w(a,b,c,d,e){var f=a.byteLength-b,g=e>f?f:e;if(l(c)||m(c))a.set(new Uint8Array(c.buffer||c,d,g),b);else{if(!k(c))throw new TypeError("unexpected data type");for(var h=0;g>h;++h)a[b+h]=c.charCodeAt(d+h)}return g}function x(a){this.padding=!0,this.mode="cbc",this.iv=null,t.call(this,a)}function y(a){x.call(this,a)}function z(a){x.call(this,a)}function A(a){a=a||{},u.call(this,a);var b=a.padding;return this.padding=void 0!==b?!!b:!0,v.call(this,a.iv),this}function B(a){if(!this.key)throw new o("no key is associated with the instance");for(var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.pos,g=this.len,h=0,i=Xc*Math.floor((g+c)/Xc),j=0,k=new Uint8Array(i);c>0;)j=w(e,f+g,a,b,c),g+=j,b+=j,c-=j,j=d.cbc_encrypt(f,g),k.set(e.subarray(f,f+j),h),h+=j,g>j?(f+=j,g-=j):(f=Wc,g=0);return this.result=k,this.pos=f,this.len=g,this}function C(){if(!this.key)throw new o("no key is associated with the instance");var a=this.asm,b=this.heap,c=this.padding,d=this.pos,e=this.len,f=Xc*Math.ceil(e/Xc);if(e%Xc===0)c&&(f+=Xc);else if(!c)throw new p("data length must be a multiple of "+Xc);var g=new Uint8Array(f);if(f>e){for(var h=Xc-e%Xc,i=0;h>i;++i)b[d+e+i]=h;e+=h}return a.cbc_encrypt(d,e),g.set(b.subarray(d,d+e)),this.result=g,this.pos=Wc,this.len=0,this}function D(a){var b,c=B.call(this,a).result,d=C.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function E(a){if(!this.key)throw new o("no key is associated with the instance");for(var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.padding,g=this.pos,h=this.len,i=0,j=Xc*Math.floor((h+c)/Xc),k=0,l=new Uint8Array(j);c>0;)k=w(e,g+h,a,b,c),h+=k,b+=k,c-=k,k=d.cbc_decrypt(g,h-(f&&0===c&&h%Xc===0?Xc:0)),l.set(e.subarray(g,g+k),i),i+=k,h>k?(g+=k,h-=k):(g=Wc,h=0);return this.result=l.subarray(0,i),this.pos=g,this.len=h,this}function F(){if(!this.key)throw new o("no key is associated with the instance");var a=this.asm,b=this.heap,c=this.padding,d=this.pos,e=this.len;if(0===e){if(c)throw new o("padding not found");return this.result=new Uint8Array(0),this.pos=Wc,this.len=0,this}if(e%Xc!==0)throw new p("data length must be a multiple of "+Xc);var f=new Uint8Array(e);if(a.cbc_decrypt(d,e),f.set(b.subarray(d,d+e)),c){var g=f[e-1];f=f.subarray(0,e-g)}return this.result=f,this.pos=Wc,this.len=0,this}function G(a){var b,c=E.call(this,a).result,d=F.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function H(a){for(var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=0;c>0;)d=w(this.heap,Wc,a,b,c),this.asm.cbc_mac(Wc,d,-1),b+=d,c-=d}function I(a){this.padding=!1,this.mode="ccm",this.tagSize=Xc,this.lengthSize=4,this.nonce=null,this.adata=null,this.iv=null,this.dataLength=-1,this.dataLeft=-1,this.counter=1,t.call(this,a)}function J(a){I.call(this,a)}function K(a){I.call(this,a)}function L(){var a=this.nonce,b=this.adata,c=this.tagSize,d=this.lengthSize,e=this.dataLength,f=new Uint8Array(Xc+(b?2+b.byteLength:0));f[0]=(b?64:0)|c-2<<2|d-1,f.set(a,1),d>4&&(f[11]=(e-(e>>>0))/4294967296&15),d>3&&(f[12]=e>>>24),d>2&&(f[13]=e>>>16&255),f[14]=e>>>8&255,f[15]=255&e,b&&(f[16]=b.byteLength>>>8&255,f[17]=255&b.byteLength,f.set(b,18)),H.call(this,f),this.asm.save_state(Wc),this.iv=new Uint8Array(this.heap.subarray(Wc,Wc+Xc))}function M(a){a=a||{},u.call(this,a),v.call(this,a.iv);var b=a.tagSize;if(void 0!==b){if(!j(b))throw new TypeError("tagSize must be a number");if(4>b||b>16||1&b)throw new p("illegal tagSize value");this.tagSize=b}else this.tagSize=Xc;var c=a.lengthSize,d=a.nonce;if(void 0!==d){if(l(d)||m(d))d=new Uint8Array(d);else{if(!k(d))throw new TypeError("unexpected nonce type");var e=d;d=new Uint8Array(e.length);for(var f=0;f<e.length;++f)d[f]=e.charCodeAt(f)}if(d.length<10||d.length>13)throw new p("illegal nonce length");c=c||15-d.length,this.nonce=d}else this.nonce=null;if(void 0!==c){if(!j(c))throw new TypeError("lengthSize must be a number");if(2>c||c>5||d.length+c!==15)throw new p("illegal lengthSize value");this.lengthSize=c}else this.lengthSize=c=4;var g=this.iv,h=a.counter;if(void 0!==h){if(null===g)throw new o("iv is also required");if(!j(h))throw new TypeError("counter must be a number");this.counter=h}else this.counter=1;var i=a.dataLength;if(void 0!==i){if(!j(i))throw new TypeError("dataLength must be a number");if(0>i||i>ad||i>Math.pow(2,8*c)-1)throw new p("illegal dataLength value");this.dataLength=i;var n=a.dataLeft||i;if(!j(n))throw new TypeError("dataLeft must be a number");if(0>n||n>i)throw new p("illegal dataLeft value");this.dataLeft=n}else this.dataLength=i=-1,this.dataLeft=i;var q=a.adata;if(void 0!==q){if(null!==g)throw new o("you must specify either adata or iv, not both");if(l(q)||m(q))q=new Uint8Array(q);else{if(!k(q))throw new TypeError("unexpected adata type");var e=q;q=new Uint8Array(e.length);for(var f=0;f<e.length;++f)q[f]=e.charCodeAt(f)}if(0===q.byteLength||q.byteLength>_c)throw new p("illegal adata length");this.adata=q,this.counter=1}else this.adata=q=null;return-1!==i&&L.call(this),this}function N(a){if(!this.key)throw new o("no key is associated with the instance");var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.nonce,g=this.counter,h=this.pos,i=this.len,j=0,k=Xc*Math.floor((i+c)/Xc),l=0;if((g-1<<4)+i+c>ad)throw new RangeError("counter overflow");for(var m=new Uint8Array(k),n=[0,0,this.lengthSize-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p=0;p<f.length;p++)n[3+p]=f[p];for(;c>0;)l=w(e,h+i,a,b,c),i+=l,b+=l,c-=l,n[0]=h,n[1]=-16&i,n[16]=g/4294967296>>>0,n[17]=g>>>0,l=d.ccm_encrypt.apply(d,n),m.set(e.subarray(h,h+l),j),g+=l>>>4,j+=l,i>l?(h+=l,i-=l):(h=Wc,i=0);return this.result=m,this.counter=g,this.pos=h,this.len=i,this}function O(){if(!this.key)throw new o("no key is associated with the instance");for(var a=this.asm,b=this.heap,c=this.nonce,d=this.counter,e=this.tagSize,f=this.pos,g=this.len,h=0,i=new Uint8Array(g+e),j=[0,0,this.lengthSize-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],k=0;k<c.length;k++)j[3+k]=c[k];return j[0]=f,j[1]=g,j[16]=d/4294967296>>>0,j[17]=d>>>0,h=a.ccm_encrypt.apply(a,j),i.set(b.subarray(f,f+h)),d=1,f=Wc,g=0,a.save_state(Wc),j[0]=Wc,j[1]=Xc,j[16]=0,j[17]=0,a.ccm_encrypt.apply(a,j),i.set(b.subarray(Wc,Wc+e),h),this.result=i,this.counter=d,this.pos=f,this.len=g,this}function P(a){this.dataLength=this.dataLeft=a.byteLength||a.length||0;var b,c=N.call(this,a).result,d=O.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function Q(a){if(!this.key)throw new o("no key is associated with the instance");var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.nonce,g=this.counter,h=this.tagSize,i=this.pos,j=this.len,k=0,l=Xc*Math.floor((j+c)/Xc),m=0;if((g-1<<4)+j+c>ad)throw new RangeError("counter overflow");for(var n=new Uint8Array(l),p=[0,0,this.lengthSize-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],q=0;q<f.length;q++)p[3+q]=f[q];for(;c>0;)m=w(e,i+j,a,b,c),j+=m,b+=m,c-=m,p[0]=i,p[1]=j+c-h>=Xc?c>=h?-16&j:j+c-h&-16:0,p[16]=g/4294967296>>>0,p[17]=g>>>0,m=d.ccm_decrypt.apply(d,p),n.set(e.subarray(i,i+m),k),g+=m>>>4,k+=m,j>m?(i+=m,j-=m):(i=Wc,j=0);return this.result=n.subarray(0,k),this.counter=g,this.pos=i,this.len=j,this}function R(){if(!this.key)throw new o("no key is associated with the instance");var a=this.asm,b=this.heap,c=this.nonce,d=this.counter,e=this.tagSize,f=this.pos,g=this.len,h=g-e,i=0;if(e>g)throw new o("authentication tag not found");for(var j=new Uint8Array(h),k=new Uint8Array(b.subarray(f+h,f+g)),l=[0,0,this.lengthSize-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],m=0;m<c.length;m++)l[3+m]=c[m];l[0]=f,l[1]=h,l[16]=d/4294967296>>>0,l[17]=d>>>0,i=a.ccm_decrypt.apply(a,l),j.set(b.subarray(f,f+i)),d=1,f=Wc,g=0,a.save_state(Wc),l[0]=Wc,l[1]=Xc,l[16]=0,l[17]=0,a.ccm_encrypt.apply(a,l);for(var n=0,m=0;e>m;++m)n|=k[m]^b[Wc+m];if(n)throw new q("data integrity check failed");return this.result=j,this.counter=d,this.pos=f,this.len=g,this}function S(a){this.dataLength=this.dataLeft=a.byteLength||a.length||0;var b,c=Q.call(this,a).result,d=R.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function T(a){this.padding=!1,this.mode="cfb",this.iv=null,t.call(this,a)}function U(a){T.call(this,a)}function V(a){T.call(this,a)}function W(a){return a=a||{},u.call(this,a),v.call(this,a.iv),this}function X(a){if(!this.key)throw new o("no key is associated with the instance");for(var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.pos,g=this.len,h=0,i=Xc*Math.floor((g+c)/Xc),j=0,k=new Uint8Array(i);c>0;)j=w(e,f+g,a,b,c),g+=j,b+=j,c-=j,j=d.cfb_encrypt(f,Xc*Math.floor(g/Xc)),k.set(e.subarray(f,f+j),h),h+=j,g>j?(f+=j,g-=j):(f=Wc,g=0);return this.result=k,this.pos=f,this.len=g,this}function Y(){if(!this.key)throw new o("no key is associated with the instance");var a=this.asm,b=this.heap,c=this.pos,d=this.len,e=new Uint8Array(d);return a.cfb_encrypt(c,d),e.set(b.subarray(c,c+d)),this.result=e,this.pos=Wc,this.len=0,this}function Z(a){var b,c=X.call(this,a).result,d=Y.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function $(a){if(!this.key)throw new o("no key is associated with the instance");for(var b=a.byteOffset||0,c=a.byteLength||a.length||0,d=this.asm,e=this.heap,f=this.pos,g=this.len,h=0,i=Xc*Math.floor((g+c)/Xc),j=0,k=new Uint8Array(i);c>0;)j=w(e,f+g,a,b,c),g+=j,b+=j,c-=j,j=d.cfb_decrypt(f,Xc*Math.floor(g/Xc)),k.set(e.subarray(f,f+j),h),h+=j,g>j?(f+=j,g-=j):(f=Wc,g=0);return this.result=k.subarray(0,h),this.pos=f,this.len=g,this}function _(){if(!this.key)throw new o("no key is associated with the instance");var a=this.asm,b=this.heap,c=this.pos,d=this.len;if(0===d)return this.result=new Uint8Array(0),this.pos=Wc,this.len=0,this;var e=new Uint8Array(d);return a.cfb_decrypt(c,d),e.set(b.subarray(c,c+d)),this.result=e,this.pos=Wc,this.len=0,this}function ab(a){var b,c=$.call(this,a).result,d=_.call(this).result;return b=new Uint8Array(c.length+d.length),b.set(c),b.set(d,c.length),this.result=b,this}function bb(a,b,c){"use asm";var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;var C=new a.Uint8Array(c);function D(P,Q,R,S,T,U,V,W,X,Y,Z,$,_,ab,bb,cb){P=P|0;Q=Q|0;R=R|0;S=S|0;T=T|0;U=U|0;V=V|0;W=W|0;X=X|0;Y=Y|0;Z=Z|0;$=$|0;_=_|0;ab=ab|0;bb=bb|0;cb=cb|0;var db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0;db=d;eb=e;fb=f;gb=g;hb=h;ib=i;jb=j;kb=k;lb=P+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1116352408|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=Q+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1899447441|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=R+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3049323471|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=S+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3921009573|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=T+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+961987163|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=U+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1508970993|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=V+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2453635748|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=W+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2870763221|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=X+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3624381080|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=Y+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+310598401|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=Z+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+607225278|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=$+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1426881987|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=_+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1925078388|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=ab+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2162078206|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=bb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2614888103|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;lb=cb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3248222580|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;P=lb=(Q>>>7^Q>>>18^Q>>>3^Q<<25^Q<<14)+(bb>>>17^bb>>>19^bb>>>10^bb<<15^bb<<13)+P+Y|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3835390401|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Q=lb=(R>>>7^R>>>18^R>>>3^R<<25^R<<14)+(cb>>>17^cb>>>19^cb>>>10^cb<<15^cb<<13)+Q+Z|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+4022224774|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;R=lb=(S>>>7^S>>>18^S>>>3^S<<25^S<<14)+(P>>>17^P>>>19^P>>>10^P<<15^P<<13)+R+$|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+264347078|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;S=lb=(T>>>7^T>>>18^T>>>3^T<<25^T<<14)+(Q>>>17^Q>>>19^Q>>>10^Q<<15^Q<<13)+S+_|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+604807628|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;T=lb=(U>>>7^U>>>18^U>>>3^U<<25^U<<14)+(R>>>17^R>>>19^R>>>10^R<<15^R<<13)+T+ab|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+770255983|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;U=lb=(V>>>7^V>>>18^V>>>3^V<<25^V<<14)+(S>>>17^S>>>19^S>>>10^S<<15^S<<13)+U+bb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1249150122|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;V=lb=(W>>>7^W>>>18^W>>>3^W<<25^W<<14)+(T>>>17^T>>>19^T>>>10^T<<15^T<<13)+V+cb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1555081692|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;W=lb=(X>>>7^X>>>18^X>>>3^X<<25^X<<14)+(U>>>17^U>>>19^U>>>10^U<<15^U<<13)+W+P|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1996064986|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;X=lb=(Y>>>7^Y>>>18^Y>>>3^Y<<25^Y<<14)+(V>>>17^V>>>19^V>>>10^V<<15^V<<13)+X+Q|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2554220882|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Y=lb=(Z>>>7^Z>>>18^Z>>>3^Z<<25^Z<<14)+(W>>>17^W>>>19^W>>>10^W<<15^W<<13)+Y+R|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2821834349|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Z=lb=($>>>7^$>>>18^$>>>3^$<<25^$<<14)+(X>>>17^X>>>19^X>>>10^X<<15^X<<13)+Z+S|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2952996808|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;$=lb=(_>>>7^_>>>18^_>>>3^_<<25^_<<14)+(Y>>>17^Y>>>19^Y>>>10^Y<<15^Y<<13)+$+T|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3210313671|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;_=lb=(ab>>>7^ab>>>18^ab>>>3^ab<<25^ab<<14)+(Z>>>17^Z>>>19^Z>>>10^Z<<15^Z<<13)+_+U|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3336571891|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;ab=lb=(bb>>>7^bb>>>18^bb>>>3^bb<<25^bb<<14)+($>>>17^$>>>19^$>>>10^$<<15^$<<13)+ab+V|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3584528711|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;bb=lb=(cb>>>7^cb>>>18^cb>>>3^cb<<25^cb<<14)+(_>>>17^_>>>19^_>>>10^_<<15^_<<13)+bb+W|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+113926993|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;cb=lb=(P>>>7^P>>>18^P>>>3^P<<25^P<<14)+(ab>>>17^ab>>>19^ab>>>10^ab<<15^ab<<13)+cb+X|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+338241895|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;P=lb=(Q>>>7^Q>>>18^Q>>>3^Q<<25^Q<<14)+(bb>>>17^bb>>>19^bb>>>10^bb<<15^bb<<13)+P+Y|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+666307205|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Q=lb=(R>>>7^R>>>18^R>>>3^R<<25^R<<14)+(cb>>>17^cb>>>19^cb>>>10^cb<<15^cb<<13)+Q+Z|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+773529912|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;R=lb=(S>>>7^S>>>18^S>>>3^S<<25^S<<14)+(P>>>17^P>>>19^P>>>10^P<<15^P<<13)+R+$|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1294757372|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;S=lb=(T>>>7^T>>>18^T>>>3^T<<25^T<<14)+(Q>>>17^Q>>>19^Q>>>10^Q<<15^Q<<13)+S+_|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1396182291|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;T=lb=(U>>>7^U>>>18^U>>>3^U<<25^U<<14)+(R>>>17^R>>>19^R>>>10^R<<15^R<<13)+T+ab|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1695183700|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;U=lb=(V>>>7^V>>>18^V>>>3^V<<25^V<<14)+(S>>>17^S>>>19^S>>>10^S<<15^S<<13)+U+bb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1986661051|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;V=lb=(W>>>7^W>>>18^W>>>3^W<<25^W<<14)+(T>>>17^T>>>19^T>>>10^T<<15^T<<13)+V+cb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2177026350|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;W=lb=(X>>>7^X>>>18^X>>>3^X<<25^X<<14)+(U>>>17^U>>>19^U>>>10^U<<15^U<<13)+W+P|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2456956037|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;X=lb=(Y>>>7^Y>>>18^Y>>>3^Y<<25^Y<<14)+(V>>>17^V>>>19^V>>>10^V<<15^V<<13)+X+Q|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2730485921|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Y=lb=(Z>>>7^Z>>>18^Z>>>3^Z<<25^Z<<14)+(W>>>17^W>>>19^W>>>10^W<<15^W<<13)+Y+R|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2820302411|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;
Z=lb=($>>>7^$>>>18^$>>>3^$<<25^$<<14)+(X>>>17^X>>>19^X>>>10^X<<15^X<<13)+Z+S|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3259730800|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;$=lb=(_>>>7^_>>>18^_>>>3^_<<25^_<<14)+(Y>>>17^Y>>>19^Y>>>10^Y<<15^Y<<13)+$+T|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3345764771|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;_=lb=(ab>>>7^ab>>>18^ab>>>3^ab<<25^ab<<14)+(Z>>>17^Z>>>19^Z>>>10^Z<<15^Z<<13)+_+U|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3516065817|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;ab=lb=(bb>>>7^bb>>>18^bb>>>3^bb<<25^bb<<14)+($>>>17^$>>>19^$>>>10^$<<15^$<<13)+ab+V|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3600352804|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;bb=lb=(cb>>>7^cb>>>18^cb>>>3^cb<<25^cb<<14)+(_>>>17^_>>>19^_>>>10^_<<15^_<<13)+bb+W|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+4094571909|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;cb=lb=(P>>>7^P>>>18^P>>>3^P<<25^P<<14)+(ab>>>17^ab>>>19^ab>>>10^ab<<15^ab<<13)+cb+X|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+275423344|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;P=lb=(Q>>>7^Q>>>18^Q>>>3^Q<<25^Q<<14)+(bb>>>17^bb>>>19^bb>>>10^bb<<15^bb<<13)+P+Y|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+430227734|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Q=lb=(R>>>7^R>>>18^R>>>3^R<<25^R<<14)+(cb>>>17^cb>>>19^cb>>>10^cb<<15^cb<<13)+Q+Z|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+506948616|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;R=lb=(S>>>7^S>>>18^S>>>3^S<<25^S<<14)+(P>>>17^P>>>19^P>>>10^P<<15^P<<13)+R+$|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+659060556|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;S=lb=(T>>>7^T>>>18^T>>>3^T<<25^T<<14)+(Q>>>17^Q>>>19^Q>>>10^Q<<15^Q<<13)+S+_|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+883997877|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;T=lb=(U>>>7^U>>>18^U>>>3^U<<25^U<<14)+(R>>>17^R>>>19^R>>>10^R<<15^R<<13)+T+ab|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+958139571|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;U=lb=(V>>>7^V>>>18^V>>>3^V<<25^V<<14)+(S>>>17^S>>>19^S>>>10^S<<15^S<<13)+U+bb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1322822218|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;V=lb=(W>>>7^W>>>18^W>>>3^W<<25^W<<14)+(T>>>17^T>>>19^T>>>10^T<<15^T<<13)+V+cb|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1537002063|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;W=lb=(X>>>7^X>>>18^X>>>3^X<<25^X<<14)+(U>>>17^U>>>19^U>>>10^U<<15^U<<13)+W+P|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1747873779|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;X=lb=(Y>>>7^Y>>>18^Y>>>3^Y<<25^Y<<14)+(V>>>17^V>>>19^V>>>10^V<<15^V<<13)+X+Q|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+1955562222|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Y=lb=(Z>>>7^Z>>>18^Z>>>3^Z<<25^Z<<14)+(W>>>17^W>>>19^W>>>10^W<<15^W<<13)+Y+R|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2024104815|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;Z=lb=($>>>7^$>>>18^$>>>3^$<<25^$<<14)+(X>>>17^X>>>19^X>>>10^X<<15^X<<13)+Z+S|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2227730452|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;$=lb=(_>>>7^_>>>18^_>>>3^_<<25^_<<14)+(Y>>>17^Y>>>19^Y>>>10^Y<<15^Y<<13)+$+T|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2361852424|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;_=lb=(ab>>>7^ab>>>18^ab>>>3^ab<<25^ab<<14)+(Z>>>17^Z>>>19^Z>>>10^Z<<15^Z<<13)+_+U|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2428436474|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;ab=lb=(bb>>>7^bb>>>18^bb>>>3^bb<<25^bb<<14)+($>>>17^$>>>19^$>>>10^$<<15^$<<13)+ab+V|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+2756734187|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;bb=lb=(cb>>>7^cb>>>18^cb>>>3^cb<<25^cb<<14)+(_>>>17^_>>>19^_>>>10^_<<15^_<<13)+bb+W|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3204031479|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;cb=lb=(P>>>7^P>>>18^P>>>3^P<<25^P<<14)+(ab>>>17^ab>>>19^ab>>>10^ab<<15^ab<<13)+cb+X|0;lb=lb+kb+(hb>>>6^hb>>>11^hb>>>25^hb<<26^hb<<21^hb<<7)+(jb^hb&(ib^jb))+3329325298|0;kb=jb;jb=ib;ib=hb;hb=gb+lb|0;gb=fb;fb=eb;eb=db;db=lb+(eb&fb^gb&(eb^fb))+(eb>>>2^eb>>>13^eb>>>22^eb<<30^eb<<19^eb<<10)|0;d=d+db|0;e=e+eb|0;f=f+fb|0;g=g+gb|0;h=h+hb|0;i=i+ib|0;j=j+jb|0;k=k+kb|0}function E(P){P=P|0;D(C[P|0]<<24|C[P|1]<<16|C[P|2]<<8|C[P|3],C[P|4]<<24|C[P|5]<<16|C[P|6]<<8|C[P|7],C[P|8]<<24|C[P|9]<<16|C[P|10]<<8|C[P|11],C[P|12]<<24|C[P|13]<<16|C[P|14]<<8|C[P|15],C[P|16]<<24|C[P|17]<<16|C[P|18]<<8|C[P|19],C[P|20]<<24|C[P|21]<<16|C[P|22]<<8|C[P|23],C[P|24]<<24|C[P|25]<<16|C[P|26]<<8|C[P|27],C[P|28]<<24|C[P|29]<<16|C[P|30]<<8|C[P|31],C[P|32]<<24|C[P|33]<<16|C[P|34]<<8|C[P|35],C[P|36]<<24|C[P|37]<<16|C[P|38]<<8|C[P|39],C[P|40]<<24|C[P|41]<<16|C[P|42]<<8|C[P|43],C[P|44]<<24|C[P|45]<<16|C[P|46]<<8|C[P|47],C[P|48]<<24|C[P|49]<<16|C[P|50]<<8|C[P|51],C[P|52]<<24|C[P|53]<<16|C[P|54]<<8|C[P|55],C[P|56]<<24|C[P|57]<<16|C[P|58]<<8|C[P|59],C[P|60]<<24|C[P|61]<<16|C[P|62]<<8|C[P|63])}function F(P){P=P|0;C[P|0]=d>>>24;C[P|1]=d>>>16&255;C[P|2]=d>>>8&255;C[P|3]=d&255;C[P|4]=e>>>24;C[P|5]=e>>>16&255;C[P|6]=e>>>8&255;C[P|7]=e&255;C[P|8]=f>>>24;C[P|9]=f>>>16&255;C[P|10]=f>>>8&255;C[P|11]=f&255;C[P|12]=g>>>24;C[P|13]=g>>>16&255;C[P|14]=g>>>8&255;C[P|15]=g&255;C[P|16]=h>>>24;C[P|17]=h>>>16&255;C[P|18]=h>>>8&255;C[P|19]=h&255;C[P|20]=i>>>24;C[P|21]=i>>>16&255;C[P|22]=i>>>8&255;C[P|23]=i&255;C[P|24]=j>>>24;C[P|25]=j>>>16&255;C[P|26]=j>>>8&255;C[P|27]=j&255;C[P|28]=k>>>24;C[P|29]=k>>>16&255;C[P|30]=k>>>8&255;C[P|31]=k&255}function G(){d=1779033703;e=3144134277;f=1013904242;g=2773480762;h=1359893119;i=2600822924;j=528734635;k=1541459225;l=0}function H(P,Q,R,S,T,U,V,W,X){P=P|0;Q=Q|0;R=R|0;S=S|0;T=T|0;U=U|0;V=V|0;W=W|0;X=X|0;d=P;e=Q;f=R;g=S;h=T;i=U;j=V;k=W;l=X}function I(P,Q){P=P|0;Q=Q|0;var R=0;if(P&63)return-1;while((Q|0)>=64){E(P);P=P+64|0;Q=Q-64|0;R=R+64|0}l=l+R|0;return R|0}function J(P,Q,R){P=P|0;Q=Q|0;R=R|0;var S=0,T=0;if(P&63)return-1;if(~R)if(R&31)return-1;if((Q|0)>=64){S=I(P,Q)|0;if((S|0)==-1)return-1;P=P+S|0;Q=Q-S|0}S=S+Q|0;l=l+Q|0;C[P|Q]=128;if((Q|0)>=56){for(T=Q+1|0;(T|0)<64;T=T+1|0)C[P|T]=0;E(P);Q=0;C[P|0]=0}for(T=Q+1|0;(T|0)<59;T=T+1|0)C[P|T]=0;C[P|59]=l>>>29;C[P|60]=l>>>21&255;C[P|61]=l>>>13&255;C[P|62]=l>>>5&255;C[P|63]=l<<3&255;E(P);if(~R)F(R);return S|0}function K(){d=m;e=n;f=o;g=p;h=q;i=r;j=s;k=t;l=64}function L(){d=u;e=v;f=w;g=x;h=y;i=z;j=A;k=B;l=64}function M(P,Q,R,S,T,U,V,W,X,Y,Z,$,_,ab,bb,cb){P=P|0;Q=Q|0;R=R|0;S=S|0;T=T|0;U=U|0;V=V|0;W=W|0;X=X|0;Y=Y|0;Z=Z|0;$=$|0;_=_|0;ab=ab|0;bb=bb|0;cb=cb|0;G();D(P^1549556828,Q^1549556828,R^1549556828,S^1549556828,T^1549556828,U^1549556828,V^1549556828,W^1549556828,X^1549556828,Y^1549556828,Z^1549556828,$^1549556828,_^1549556828,ab^1549556828,bb^1549556828,cb^1549556828);u=d;v=e;w=f;x=g;y=h;z=i;A=j;B=k;G();D(P^909522486,Q^909522486,R^909522486,S^909522486,T^909522486,U^909522486,V^909522486,W^909522486,X^909522486,Y^909522486,Z^909522486,$^909522486,_^909522486,ab^909522486,bb^909522486,cb^909522486);m=d;n=e;o=f;p=g;q=h;r=i;s=j;t=k;l=64}function N(P,Q,R){P=P|0;Q=Q|0;R=R|0;var S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,$=0;if(P&63)return-1;if(~R)if(R&31)return-1;$=J(P,Q,-1)|0;S=d,T=e,U=f,V=g,W=h,X=i,Y=j,Z=k;L();D(S,T,U,V,W,X,Y,Z,2147483648,0,0,0,0,0,0,768);if(~R)F(R);return $|0}function O(P,Q,R,S,T){P=P|0;Q=Q|0;R=R|0;S=S|0;T=T|0;var U=0,V=0,W=0,X=0,Y=0,Z=0,$=0,_=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0;if(P&63)return-1;if(~T)if(T&31)return-1;C[P+Q|0]=R>>>24;C[P+Q+1|0]=R>>>16&255;C[P+Q+2|0]=R>>>8&255;C[P+Q+3|0]=R&255;N(P,Q+4|0,-1)|0;U=ab=d,V=bb=e,W=cb=f,X=db=g,Y=eb=h,Z=fb=i,$=gb=j,_=hb=k;S=S-1|0;while((S|0)>0){K();D(ab,bb,cb,db,eb,fb,gb,hb,2147483648,0,0,0,0,0,0,768);ab=d,bb=e,cb=f,db=g,eb=h,fb=i,gb=j,hb=k;L();D(ab,bb,cb,db,eb,fb,gb,hb,2147483648,0,0,0,0,0,0,768);ab=d,bb=e,cb=f,db=g,eb=h,fb=i,gb=j,hb=k;U=U^d;V=V^e;W=W^f;X=X^g;Y=Y^h;Z=Z^i;$=$^j;_=_^k;S=S-1|0}d=U;e=V;f=W;g=X;h=Y;i=Z;j=$;k=_;if(~T)F(T);return 0}return{reset:G,init:H,process:I,finish:J,hmac_reset:K,hmac_init:M,hmac_finish:N,pbkdf2_generate_block:O}}function cb(a){if(a=a||{},a.heapSize=a.heapSize||4096,a.heapSize<=0||a.heapSize%4096)throw new p("heapSize must be a positive number and multiple of 4096");this.heap=a.heap||new Uint8Array(a.heapSize),this.asm=a.asm||bb(b,null,this.heap.buffer),this.BLOCK_SIZE=hd,this.HASH_SIZE=id,this.reset()}function db(){return this.result=null,this.pos=0,this.len=0,this.asm.reset(),this}function eb(a){if(null!==this.result)throw new o("state must be reset before processing new data");var b=0,c=0,d=0;if(l(a)||m(a))b=a.byteOffset||0,c=a.byteLength;else{if(!k(a))throw new TypeError("data isn't of expected type");c=a.length}for(;c>0;){if(d=this.heap.byteLength-this.pos-this.len,d=c>d?d:c,l(a)||m(a))this.heap.set(new Uint8Array(a.buffer||a,b,d),this.pos+this.len);else for(var e=0;d>e;e++)this.heap[this.pos+this.len+e]=a.charCodeAt(b+e);this.len+=d,b+=d,c-=d,d=this.asm.process(this.pos,this.len),d<this.len?(this.pos+=d,this.len-=d):(this.pos=0,this.len=0)}return this}function fb(){if(null!==this.result)throw new o("state must be reset before processing new data");return this.asm.finish(this.pos,this.len,0),this.result=new Uint8Array(id),this.result.set(this.heap.subarray(0,id)),this.pos=0,this.len=0,this}function gb(a,b,c){"use asm";var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;var u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0;var $=new a.Uint8Array(c);function _(mb,nb,ob,pb,qb,rb,sb,tb,ub,vb,wb,xb,yb,zb,Ab,Bb,Cb,Db,Eb,Fb,Gb,Hb,Ib,Jb,Kb,Lb,Mb,Nb,Ob,Pb,Qb,Rb){mb=mb|0;nb=nb|0;ob=ob|0;pb=pb|0;qb=qb|0;rb=rb|0;sb=sb|0;tb=tb|0;ub=ub|0;vb=vb|0;wb=wb|0;xb=xb|0;yb=yb|0;zb=zb|0;Ab=Ab|0;Bb=Bb|0;Cb=Cb|0;Db=Db|0;Eb=Eb|0;Fb=Fb|0;Gb=Gb|0;Hb=Hb|0;Ib=Ib|0;Jb=Jb|0;Kb=Kb|0;Lb=Lb|0;Mb=Mb|0;Nb=Nb|0;Ob=Ob|0;Pb=Pb|0;Qb=Qb|0;Rb=Rb|0;var Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,$b=0,_b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0;Sb=d;Tb=e;Ub=f;Vb=g;Wb=h;Xb=i;Yb=j;Zb=k;$b=l;_b=m;ac=n;bc=o;cc=p;dc=q;ec=r;fc=s;hc=3609767458+nb|0;gc=1116352408+mb+(hc>>>0<nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=602891725+pb|0;gc=1899447441+ob+(hc>>>0<pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=3964484399+rb|0;gc=3049323471+qb+(hc>>>0<rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=2173295548+tb|0;gc=3921009573+sb+(hc>>>0<tb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=4081628472+vb|0;gc=961987163+ub+(hc>>>0<vb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=3053834265+xb|0;gc=1508970993+wb+(hc>>>0<xb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=2937671579+zb|0;gc=2453635748+yb+(hc>>>0<zb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=3664609560+Bb|0;gc=2870763221+Ab+(hc>>>0<Bb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=2734883394+Db|0;gc=3624381080+Cb+(hc>>>0<Db>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=1164996542+Fb|0;gc=310598401+Eb+(hc>>>0<Fb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=1323610764+Hb|0;gc=607225278+Gb+(hc>>>0<Hb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=3590304994+Jb|0;gc=1426881987+Ib+(hc>>>0<Jb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=4068182383+Lb|0;gc=1925078388+Kb+(hc>>>0<Lb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=991336113+Nb|0;gc=2162078206+Mb+(hc>>>0<Nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=633803317+Pb|0;gc=2614888103+Ob+(hc>>>0<Pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;hc=3479774868+Rb|0;gc=3248222580+Qb+(hc>>>0<Rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;nb=nb+Fb|0;mb=mb+Eb+(nb>>>0<Fb>>>0?1:0)|0;ic=(pb>>>1|ob<<31)^(pb>>>8|ob<<24)^(pb>>>7|ob<<25)|0;nb=nb+ic|0;mb=mb+((ob>>>1|pb<<31)^(ob>>>8|pb<<24)^ob>>>7)+(nb>>>0<ic>>>0?1:0)|0;ic=(Pb>>>19|Ob<<13)^(Pb<<3|Ob>>>29)^(Pb>>>6|Ob<<26)|0;nb=nb+ic|0;mb=mb+((Ob>>>19|Pb<<13)^(Ob<<3|Pb>>>29)^Ob>>>6)+(nb>>>0<ic>>>0?1:0)|0;hc=2666613458+nb|0;gc=3835390401+mb+(hc>>>0<nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;pb=pb+Hb|0;ob=ob+Gb+(pb>>>0<Hb>>>0?1:0)|0;ic=(rb>>>1|qb<<31)^(rb>>>8|qb<<24)^(rb>>>7|qb<<25)|0;pb=pb+ic|0;ob=ob+((qb>>>1|rb<<31)^(qb>>>8|rb<<24)^qb>>>7)+(pb>>>0<ic>>>0?1:0)|0;ic=(Rb>>>19|Qb<<13)^(Rb<<3|Qb>>>29)^(Rb>>>6|Qb<<26)|0;pb=pb+ic|0;ob=ob+((Qb>>>19|Rb<<13)^(Qb<<3|Rb>>>29)^Qb>>>6)+(pb>>>0<ic>>>0?1:0)|0;hc=944711139+pb|0;gc=4022224774+ob+(hc>>>0<pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;rb=rb+Jb|0;qb=qb+Ib+(rb>>>0<Jb>>>0?1:0)|0;ic=(tb>>>1|sb<<31)^(tb>>>8|sb<<24)^(tb>>>7|sb<<25)|0;rb=rb+ic|0;qb=qb+((sb>>>1|tb<<31)^(sb>>>8|tb<<24)^sb>>>7)+(rb>>>0<ic>>>0?1:0)|0;ic=(nb>>>19|mb<<13)^(nb<<3|mb>>>29)^(nb>>>6|mb<<26)|0;rb=rb+ic|0;qb=qb+((mb>>>19|nb<<13)^(mb<<3|nb>>>29)^mb>>>6)+(rb>>>0<ic>>>0?1:0)|0;hc=2341262773+rb|0;gc=264347078+qb+(hc>>>0<rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;tb=tb+Lb|0;sb=sb+Kb+(tb>>>0<Lb>>>0?1:0)|0;ic=(vb>>>1|ub<<31)^(vb>>>8|ub<<24)^(vb>>>7|ub<<25)|0;tb=tb+ic|0;sb=sb+((ub>>>1|vb<<31)^(ub>>>8|vb<<24)^ub>>>7)+(tb>>>0<ic>>>0?1:0)|0;ic=(pb>>>19|ob<<13)^(pb<<3|ob>>>29)^(pb>>>6|ob<<26)|0;tb=tb+ic|0;sb=sb+((ob>>>19|pb<<13)^(ob<<3|pb>>>29)^ob>>>6)+(tb>>>0<ic>>>0?1:0)|0;hc=2007800933+tb|0;gc=604807628+sb+(hc>>>0<tb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;vb=vb+Nb|0;ub=ub+Mb+(vb>>>0<Nb>>>0?1:0)|0;ic=(xb>>>1|wb<<31)^(xb>>>8|wb<<24)^(xb>>>7|wb<<25)|0;vb=vb+ic|0;ub=ub+((wb>>>1|xb<<31)^(wb>>>8|xb<<24)^wb>>>7)+(vb>>>0<ic>>>0?1:0)|0;ic=(rb>>>19|qb<<13)^(rb<<3|qb>>>29)^(rb>>>6|qb<<26)|0;vb=vb+ic|0;ub=ub+((qb>>>19|rb<<13)^(qb<<3|rb>>>29)^qb>>>6)+(vb>>>0<ic>>>0?1:0)|0;hc=1495990901+vb|0;gc=770255983+ub+(hc>>>0<vb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;xb=xb+Pb|0;wb=wb+Ob+(xb>>>0<Pb>>>0?1:0)|0;ic=(zb>>>1|yb<<31)^(zb>>>8|yb<<24)^(zb>>>7|yb<<25)|0;xb=xb+ic|0;wb=wb+((yb>>>1|zb<<31)^(yb>>>8|zb<<24)^yb>>>7)+(xb>>>0<ic>>>0?1:0)|0;ic=(tb>>>19|sb<<13)^(tb<<3|sb>>>29)^(tb>>>6|sb<<26)|0;xb=xb+ic|0;wb=wb+((sb>>>19|tb<<13)^(sb<<3|tb>>>29)^sb>>>6)+(xb>>>0<ic>>>0?1:0)|0;hc=1856431235+xb|0;gc=1249150122+wb+(hc>>>0<xb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;zb=zb+Rb|0;yb=yb+Qb+(zb>>>0<Rb>>>0?1:0)|0;ic=(Bb>>>1|Ab<<31)^(Bb>>>8|Ab<<24)^(Bb>>>7|Ab<<25)|0;zb=zb+ic|0;yb=yb+((Ab>>>1|Bb<<31)^(Ab>>>8|Bb<<24)^Ab>>>7)+(zb>>>0<ic>>>0?1:0)|0;ic=(vb>>>19|ub<<13)^(vb<<3|ub>>>29)^(vb>>>6|ub<<26)|0;zb=zb+ic|0;yb=yb+((ub>>>19|vb<<13)^(ub<<3|vb>>>29)^ub>>>6)+(zb>>>0<ic>>>0?1:0)|0;hc=3175218132+zb|0;gc=1555081692+yb+(hc>>>0<zb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Bb=Bb+nb|0;Ab=Ab+mb+(Bb>>>0<nb>>>0?1:0)|0;ic=(Db>>>1|Cb<<31)^(Db>>>8|Cb<<24)^(Db>>>7|Cb<<25)|0;Bb=Bb+ic|0;Ab=Ab+((Cb>>>1|Db<<31)^(Cb>>>8|Db<<24)^Cb>>>7)+(Bb>>>0<ic>>>0?1:0)|0;ic=(xb>>>19|wb<<13)^(xb<<3|wb>>>29)^(xb>>>6|wb<<26)|0;Bb=Bb+ic|0;Ab=Ab+((wb>>>19|xb<<13)^(wb<<3|xb>>>29)^wb>>>6)+(Bb>>>0<ic>>>0?1:0)|0;hc=2198950837+Bb|0;gc=1996064986+Ab+(hc>>>0<Bb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Db=Db+pb|0;Cb=Cb+ob+(Db>>>0<pb>>>0?1:0)|0;ic=(Fb>>>1|Eb<<31)^(Fb>>>8|Eb<<24)^(Fb>>>7|Eb<<25)|0;Db=Db+ic|0;Cb=Cb+((Eb>>>1|Fb<<31)^(Eb>>>8|Fb<<24)^Eb>>>7)+(Db>>>0<ic>>>0?1:0)|0;ic=(zb>>>19|yb<<13)^(zb<<3|yb>>>29)^(zb>>>6|yb<<26)|0;Db=Db+ic|0;Cb=Cb+((yb>>>19|zb<<13)^(yb<<3|zb>>>29)^yb>>>6)+(Db>>>0<ic>>>0?1:0)|0;hc=3999719339+Db|0;gc=2554220882+Cb+(hc>>>0<Db>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Fb=Fb+rb|0;Eb=Eb+qb+(Fb>>>0<rb>>>0?1:0)|0;ic=(Hb>>>1|Gb<<31)^(Hb>>>8|Gb<<24)^(Hb>>>7|Gb<<25)|0;Fb=Fb+ic|0;Eb=Eb+((Gb>>>1|Hb<<31)^(Gb>>>8|Hb<<24)^Gb>>>7)+(Fb>>>0<ic>>>0?1:0)|0;ic=(Bb>>>19|Ab<<13)^(Bb<<3|Ab>>>29)^(Bb>>>6|Ab<<26)|0;Fb=Fb+ic|0;Eb=Eb+((Ab>>>19|Bb<<13)^(Ab<<3|Bb>>>29)^Ab>>>6)+(Fb>>>0<ic>>>0?1:0)|0;hc=766784016+Fb|0;gc=2821834349+Eb+(hc>>>0<Fb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;
Hb=Hb+tb|0;Gb=Gb+sb+(Hb>>>0<tb>>>0?1:0)|0;ic=(Jb>>>1|Ib<<31)^(Jb>>>8|Ib<<24)^(Jb>>>7|Ib<<25)|0;Hb=Hb+ic|0;Gb=Gb+((Ib>>>1|Jb<<31)^(Ib>>>8|Jb<<24)^Ib>>>7)+(Hb>>>0<ic>>>0?1:0)|0;ic=(Db>>>19|Cb<<13)^(Db<<3|Cb>>>29)^(Db>>>6|Cb<<26)|0;Hb=Hb+ic|0;Gb=Gb+((Cb>>>19|Db<<13)^(Cb<<3|Db>>>29)^Cb>>>6)+(Hb>>>0<ic>>>0?1:0)|0;hc=2566594879+Hb|0;gc=2952996808+Gb+(hc>>>0<Hb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Jb=Jb+vb|0;Ib=Ib+ub+(Jb>>>0<vb>>>0?1:0)|0;ic=(Lb>>>1|Kb<<31)^(Lb>>>8|Kb<<24)^(Lb>>>7|Kb<<25)|0;Jb=Jb+ic|0;Ib=Ib+((Kb>>>1|Lb<<31)^(Kb>>>8|Lb<<24)^Kb>>>7)+(Jb>>>0<ic>>>0?1:0)|0;ic=(Fb>>>19|Eb<<13)^(Fb<<3|Eb>>>29)^(Fb>>>6|Eb<<26)|0;Jb=Jb+ic|0;Ib=Ib+((Eb>>>19|Fb<<13)^(Eb<<3|Fb>>>29)^Eb>>>6)+(Jb>>>0<ic>>>0?1:0)|0;hc=3203337956+Jb|0;gc=3210313671+Ib+(hc>>>0<Jb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Lb=Lb+xb|0;Kb=Kb+wb+(Lb>>>0<xb>>>0?1:0)|0;ic=(Nb>>>1|Mb<<31)^(Nb>>>8|Mb<<24)^(Nb>>>7|Mb<<25)|0;Lb=Lb+ic|0;Kb=Kb+((Mb>>>1|Nb<<31)^(Mb>>>8|Nb<<24)^Mb>>>7)+(Lb>>>0<ic>>>0?1:0)|0;ic=(Hb>>>19|Gb<<13)^(Hb<<3|Gb>>>29)^(Hb>>>6|Gb<<26)|0;Lb=Lb+ic|0;Kb=Kb+((Gb>>>19|Hb<<13)^(Gb<<3|Hb>>>29)^Gb>>>6)+(Lb>>>0<ic>>>0?1:0)|0;hc=1034457026+Lb|0;gc=3336571891+Kb+(hc>>>0<Lb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Nb=Nb+zb|0;Mb=Mb+yb+(Nb>>>0<zb>>>0?1:0)|0;ic=(Pb>>>1|Ob<<31)^(Pb>>>8|Ob<<24)^(Pb>>>7|Ob<<25)|0;Nb=Nb+ic|0;Mb=Mb+((Ob>>>1|Pb<<31)^(Ob>>>8|Pb<<24)^Ob>>>7)+(Nb>>>0<ic>>>0?1:0)|0;ic=(Jb>>>19|Ib<<13)^(Jb<<3|Ib>>>29)^(Jb>>>6|Ib<<26)|0;Nb=Nb+ic|0;Mb=Mb+((Ib>>>19|Jb<<13)^(Ib<<3|Jb>>>29)^Ib>>>6)+(Nb>>>0<ic>>>0?1:0)|0;hc=2466948901+Nb|0;gc=3584528711+Mb+(hc>>>0<Nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Pb=Pb+Bb|0;Ob=Ob+Ab+(Pb>>>0<Bb>>>0?1:0)|0;ic=(Rb>>>1|Qb<<31)^(Rb>>>8|Qb<<24)^(Rb>>>7|Qb<<25)|0;Pb=Pb+ic|0;Ob=Ob+((Qb>>>1|Rb<<31)^(Qb>>>8|Rb<<24)^Qb>>>7)+(Pb>>>0<ic>>>0?1:0)|0;ic=(Lb>>>19|Kb<<13)^(Lb<<3|Kb>>>29)^(Lb>>>6|Kb<<26)|0;Pb=Pb+ic|0;Ob=Ob+((Kb>>>19|Lb<<13)^(Kb<<3|Lb>>>29)^Kb>>>6)+(Pb>>>0<ic>>>0?1:0)|0;hc=3758326383+Pb|0;gc=113926993+Ob+(hc>>>0<Pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Rb=Rb+Db|0;Qb=Qb+Cb+(Rb>>>0<Db>>>0?1:0)|0;ic=(nb>>>1|mb<<31)^(nb>>>8|mb<<24)^(nb>>>7|mb<<25)|0;Rb=Rb+ic|0;Qb=Qb+((mb>>>1|nb<<31)^(mb>>>8|nb<<24)^mb>>>7)+(Rb>>>0<ic>>>0?1:0)|0;ic=(Nb>>>19|Mb<<13)^(Nb<<3|Mb>>>29)^(Nb>>>6|Mb<<26)|0;Rb=Rb+ic|0;Qb=Qb+((Mb>>>19|Nb<<13)^(Mb<<3|Nb>>>29)^Mb>>>6)+(Rb>>>0<ic>>>0?1:0)|0;hc=168717936+Rb|0;gc=338241895+Qb+(hc>>>0<Rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;nb=nb+Fb|0;mb=mb+Eb+(nb>>>0<Fb>>>0?1:0)|0;ic=(pb>>>1|ob<<31)^(pb>>>8|ob<<24)^(pb>>>7|ob<<25)|0;nb=nb+ic|0;mb=mb+((ob>>>1|pb<<31)^(ob>>>8|pb<<24)^ob>>>7)+(nb>>>0<ic>>>0?1:0)|0;ic=(Pb>>>19|Ob<<13)^(Pb<<3|Ob>>>29)^(Pb>>>6|Ob<<26)|0;nb=nb+ic|0;mb=mb+((Ob>>>19|Pb<<13)^(Ob<<3|Pb>>>29)^Ob>>>6)+(nb>>>0<ic>>>0?1:0)|0;hc=1188179964+nb|0;gc=666307205+mb+(hc>>>0<nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;pb=pb+Hb|0;ob=ob+Gb+(pb>>>0<Hb>>>0?1:0)|0;ic=(rb>>>1|qb<<31)^(rb>>>8|qb<<24)^(rb>>>7|qb<<25)|0;pb=pb+ic|0;ob=ob+((qb>>>1|rb<<31)^(qb>>>8|rb<<24)^qb>>>7)+(pb>>>0<ic>>>0?1:0)|0;ic=(Rb>>>19|Qb<<13)^(Rb<<3|Qb>>>29)^(Rb>>>6|Qb<<26)|0;pb=pb+ic|0;ob=ob+((Qb>>>19|Rb<<13)^(Qb<<3|Rb>>>29)^Qb>>>6)+(pb>>>0<ic>>>0?1:0)|0;hc=1546045734+pb|0;gc=773529912+ob+(hc>>>0<pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;rb=rb+Jb|0;qb=qb+Ib+(rb>>>0<Jb>>>0?1:0)|0;ic=(tb>>>1|sb<<31)^(tb>>>8|sb<<24)^(tb>>>7|sb<<25)|0;rb=rb+ic|0;qb=qb+((sb>>>1|tb<<31)^(sb>>>8|tb<<24)^sb>>>7)+(rb>>>0<ic>>>0?1:0)|0;ic=(nb>>>19|mb<<13)^(nb<<3|mb>>>29)^(nb>>>6|mb<<26)|0;rb=rb+ic|0;qb=qb+((mb>>>19|nb<<13)^(mb<<3|nb>>>29)^mb>>>6)+(rb>>>0<ic>>>0?1:0)|0;hc=1522805485+rb|0;gc=1294757372+qb+(hc>>>0<rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;tb=tb+Lb|0;sb=sb+Kb+(tb>>>0<Lb>>>0?1:0)|0;ic=(vb>>>1|ub<<31)^(vb>>>8|ub<<24)^(vb>>>7|ub<<25)|0;tb=tb+ic|0;sb=sb+((ub>>>1|vb<<31)^(ub>>>8|vb<<24)^ub>>>7)+(tb>>>0<ic>>>0?1:0)|0;ic=(pb>>>19|ob<<13)^(pb<<3|ob>>>29)^(pb>>>6|ob<<26)|0;tb=tb+ic|0;sb=sb+((ob>>>19|pb<<13)^(ob<<3|pb>>>29)^ob>>>6)+(tb>>>0<ic>>>0?1:0)|0;hc=2643833823+tb|0;gc=1396182291+sb+(hc>>>0<tb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;vb=vb+Nb|0;ub=ub+Mb+(vb>>>0<Nb>>>0?1:0)|0;ic=(xb>>>1|wb<<31)^(xb>>>8|wb<<24)^(xb>>>7|wb<<25)|0;vb=vb+ic|0;ub=ub+((wb>>>1|xb<<31)^(wb>>>8|xb<<24)^wb>>>7)+(vb>>>0<ic>>>0?1:0)|0;ic=(rb>>>19|qb<<13)^(rb<<3|qb>>>29)^(rb>>>6|qb<<26)|0;vb=vb+ic|0;ub=ub+((qb>>>19|rb<<13)^(qb<<3|rb>>>29)^qb>>>6)+(vb>>>0<ic>>>0?1:0)|0;hc=2343527390+vb|0;gc=1695183700+ub+(hc>>>0<vb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;xb=xb+Pb|0;wb=wb+Ob+(xb>>>0<Pb>>>0?1:0)|0;ic=(zb>>>1|yb<<31)^(zb>>>8|yb<<24)^(zb>>>7|yb<<25)|0;xb=xb+ic|0;wb=wb+((yb>>>1|zb<<31)^(yb>>>8|zb<<24)^yb>>>7)+(xb>>>0<ic>>>0?1:0)|0;ic=(tb>>>19|sb<<13)^(tb<<3|sb>>>29)^(tb>>>6|sb<<26)|0;xb=xb+ic|0;wb=wb+((sb>>>19|tb<<13)^(sb<<3|tb>>>29)^sb>>>6)+(xb>>>0<ic>>>0?1:0)|0;hc=1014477480+xb|0;gc=1986661051+wb+(hc>>>0<xb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;zb=zb+Rb|0;yb=yb+Qb+(zb>>>0<Rb>>>0?1:0)|0;ic=(Bb>>>1|Ab<<31)^(Bb>>>8|Ab<<24)^(Bb>>>7|Ab<<25)|0;zb=zb+ic|0;yb=yb+((Ab>>>1|Bb<<31)^(Ab>>>8|Bb<<24)^Ab>>>7)+(zb>>>0<ic>>>0?1:0)|0;ic=(vb>>>19|ub<<13)^(vb<<3|ub>>>29)^(vb>>>6|ub<<26)|0;zb=zb+ic|0;yb=yb+((ub>>>19|vb<<13)^(ub<<3|vb>>>29)^ub>>>6)+(zb>>>0<ic>>>0?1:0)|0;hc=1206759142+zb|0;gc=2177026350+yb+(hc>>>0<zb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Bb=Bb+nb|0;Ab=Ab+mb+(Bb>>>0<nb>>>0?1:0)|0;ic=(Db>>>1|Cb<<31)^(Db>>>8|Cb<<24)^(Db>>>7|Cb<<25)|0;Bb=Bb+ic|0;Ab=Ab+((Cb>>>1|Db<<31)^(Cb>>>8|Db<<24)^Cb>>>7)+(Bb>>>0<ic>>>0?1:0)|0;ic=(xb>>>19|wb<<13)^(xb<<3|wb>>>29)^(xb>>>6|wb<<26)|0;Bb=Bb+ic|0;Ab=Ab+((wb>>>19|xb<<13)^(wb<<3|xb>>>29)^wb>>>6)+(Bb>>>0<ic>>>0?1:0)|0;hc=344077627+Bb|0;gc=2456956037+Ab+(hc>>>0<Bb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Db=Db+pb|0;Cb=Cb+ob+(Db>>>0<pb>>>0?1:0)|0;ic=(Fb>>>1|Eb<<31)^(Fb>>>8|Eb<<24)^(Fb>>>7|Eb<<25)|0;Db=Db+ic|0;Cb=Cb+((Eb>>>1|Fb<<31)^(Eb>>>8|Fb<<24)^Eb>>>7)+(Db>>>0<ic>>>0?1:0)|0;ic=(zb>>>19|yb<<13)^(zb<<3|yb>>>29)^(zb>>>6|yb<<26)|0;Db=Db+ic|0;Cb=Cb+((yb>>>19|zb<<13)^(yb<<3|zb>>>29)^yb>>>6)+(Db>>>0<ic>>>0?1:0)|0;hc=1290863460+Db|0;gc=2730485921+Cb+(hc>>>0<Db>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Fb=Fb+rb|0;Eb=Eb+qb+(Fb>>>0<rb>>>0?1:0)|0;ic=(Hb>>>1|Gb<<31)^(Hb>>>8|Gb<<24)^(Hb>>>7|Gb<<25)|0;Fb=Fb+ic|0;Eb=Eb+((Gb>>>1|Hb<<31)^(Gb>>>8|Hb<<24)^Gb>>>7)+(Fb>>>0<ic>>>0?1:0)|0;ic=(Bb>>>19|Ab<<13)^(Bb<<3|Ab>>>29)^(Bb>>>6|Ab<<26)|0;Fb=Fb+ic|0;Eb=Eb+((Ab>>>19|Bb<<13)^(Ab<<3|Bb>>>29)^Ab>>>6)+(Fb>>>0<ic>>>0?1:0)|0;hc=3158454273+Fb|0;gc=2820302411+Eb+(hc>>>0<Fb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Hb=Hb+tb|0;Gb=Gb+sb+(Hb>>>0<tb>>>0?1:0)|0;ic=(Jb>>>1|Ib<<31)^(Jb>>>8|Ib<<24)^(Jb>>>7|Ib<<25)|0;Hb=Hb+ic|0;Gb=Gb+((Ib>>>1|Jb<<31)^(Ib>>>8|Jb<<24)^Ib>>>7)+(Hb>>>0<ic>>>0?1:0)|0;ic=(Db>>>19|Cb<<13)^(Db<<3|Cb>>>29)^(Db>>>6|Cb<<26)|0;Hb=Hb+ic|0;Gb=Gb+((Cb>>>19|Db<<13)^(Cb<<3|Db>>>29)^Cb>>>6)+(Hb>>>0<ic>>>0?1:0)|0;hc=3505952657+Hb|0;gc=3259730800+Gb+(hc>>>0<Hb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Jb=Jb+vb|0;Ib=Ib+ub+(Jb>>>0<vb>>>0?1:0)|0;ic=(Lb>>>1|Kb<<31)^(Lb>>>8|Kb<<24)^(Lb>>>7|Kb<<25)|0;Jb=Jb+ic|0;Ib=Ib+((Kb>>>1|Lb<<31)^(Kb>>>8|Lb<<24)^Kb>>>7)+(Jb>>>0<ic>>>0?1:0)|0;ic=(Fb>>>19|Eb<<13)^(Fb<<3|Eb>>>29)^(Fb>>>6|Eb<<26)|0;Jb=Jb+ic|0;Ib=Ib+((Eb>>>19|Fb<<13)^(Eb<<3|Fb>>>29)^Eb>>>6)+(Jb>>>0<ic>>>0?1:0)|0;hc=106217008+Jb|0;gc=3345764771+Ib+(hc>>>0<Jb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Lb=Lb+xb|0;Kb=Kb+wb+(Lb>>>0<xb>>>0?1:0)|0;ic=(Nb>>>1|Mb<<31)^(Nb>>>8|Mb<<24)^(Nb>>>7|Mb<<25)|0;Lb=Lb+ic|0;Kb=Kb+((Mb>>>1|Nb<<31)^(Mb>>>8|Nb<<24)^Mb>>>7)+(Lb>>>0<ic>>>0?1:0)|0;ic=(Hb>>>19|Gb<<13)^(Hb<<3|Gb>>>29)^(Hb>>>6|Gb<<26)|0;Lb=Lb+ic|0;Kb=Kb+((Gb>>>19|Hb<<13)^(Gb<<3|Hb>>>29)^Gb>>>6)+(Lb>>>0<ic>>>0?1:0)|0;hc=3606008344+Lb|0;gc=3516065817+Kb+(hc>>>0<Lb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Nb=Nb+zb|0;Mb=Mb+yb+(Nb>>>0<zb>>>0?1:0)|0;ic=(Pb>>>1|Ob<<31)^(Pb>>>8|Ob<<24)^(Pb>>>7|Ob<<25)|0;Nb=Nb+ic|0;Mb=Mb+((Ob>>>1|Pb<<31)^(Ob>>>8|Pb<<24)^Ob>>>7)+(Nb>>>0<ic>>>0?1:0)|0;ic=(Jb>>>19|Ib<<13)^(Jb<<3|Ib>>>29)^(Jb>>>6|Ib<<26)|0;Nb=Nb+ic|0;Mb=Mb+((Ib>>>19|Jb<<13)^(Ib<<3|Jb>>>29)^Ib>>>6)+(Nb>>>0<ic>>>0?1:0)|0;hc=1432725776+Nb|0;gc=3600352804+Mb+(hc>>>0<Nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Pb=Pb+Bb|0;Ob=Ob+Ab+(Pb>>>0<Bb>>>0?1:0)|0;ic=(Rb>>>1|Qb<<31)^(Rb>>>8|Qb<<24)^(Rb>>>7|Qb<<25)|0;Pb=Pb+ic|0;Ob=Ob+((Qb>>>1|Rb<<31)^(Qb>>>8|Rb<<24)^Qb>>>7)+(Pb>>>0<ic>>>0?1:0)|0;ic=(Lb>>>19|Kb<<13)^(Lb<<3|Kb>>>29)^(Lb>>>6|Kb<<26)|0;Pb=Pb+ic|0;Ob=Ob+((Kb>>>19|Lb<<13)^(Kb<<3|Lb>>>29)^Kb>>>6)+(Pb>>>0<ic>>>0?1:0)|0;hc=1467031594+Pb|0;gc=4094571909+Ob+(hc>>>0<Pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Rb=Rb+Db|0;Qb=Qb+Cb+(Rb>>>0<Db>>>0?1:0)|0;ic=(nb>>>1|mb<<31)^(nb>>>8|mb<<24)^(nb>>>7|mb<<25)|0;Rb=Rb+ic|0;Qb=Qb+((mb>>>1|nb<<31)^(mb>>>8|nb<<24)^mb>>>7)+(Rb>>>0<ic>>>0?1:0)|0;ic=(Nb>>>19|Mb<<13)^(Nb<<3|Mb>>>29)^(Nb>>>6|Mb<<26)|0;Rb=Rb+ic|0;Qb=Qb+((Mb>>>19|Nb<<13)^(Mb<<3|Nb>>>29)^Mb>>>6)+(Rb>>>0<ic>>>0?1:0)|0;hc=851169720+Rb|0;gc=275423344+Qb+(hc>>>0<Rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;nb=nb+Fb|0;mb=mb+Eb+(nb>>>0<Fb>>>0?1:0)|0;ic=(pb>>>1|ob<<31)^(pb>>>8|ob<<24)^(pb>>>7|ob<<25)|0;nb=nb+ic|0;mb=mb+((ob>>>1|pb<<31)^(ob>>>8|pb<<24)^ob>>>7)+(nb>>>0<ic>>>0?1:0)|0;ic=(Pb>>>19|Ob<<13)^(Pb<<3|Ob>>>29)^(Pb>>>6|Ob<<26)|0;nb=nb+ic|0;mb=mb+((Ob>>>19|Pb<<13)^(Ob<<3|Pb>>>29)^Ob>>>6)+(nb>>>0<ic>>>0?1:0)|0;hc=3100823752+nb|0;gc=430227734+mb+(hc>>>0<nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;pb=pb+Hb|0;ob=ob+Gb+(pb>>>0<Hb>>>0?1:0)|0;ic=(rb>>>1|qb<<31)^(rb>>>8|qb<<24)^(rb>>>7|qb<<25)|0;pb=pb+ic|0;ob=ob+((qb>>>1|rb<<31)^(qb>>>8|rb<<24)^qb>>>7)+(pb>>>0<ic>>>0?1:0)|0;ic=(Rb>>>19|Qb<<13)^(Rb<<3|Qb>>>29)^(Rb>>>6|Qb<<26)|0;pb=pb+ic|0;ob=ob+((Qb>>>19|Rb<<13)^(Qb<<3|Rb>>>29)^Qb>>>6)+(pb>>>0<ic>>>0?1:0)|0;hc=1363258195+pb|0;gc=506948616+ob+(hc>>>0<pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;rb=rb+Jb|0;qb=qb+Ib+(rb>>>0<Jb>>>0?1:0)|0;ic=(tb>>>1|sb<<31)^(tb>>>8|sb<<24)^(tb>>>7|sb<<25)|0;rb=rb+ic|0;qb=qb+((sb>>>1|tb<<31)^(sb>>>8|tb<<24)^sb>>>7)+(rb>>>0<ic>>>0?1:0)|0;ic=(nb>>>19|mb<<13)^(nb<<3|mb>>>29)^(nb>>>6|mb<<26)|0;rb=rb+ic|0;qb=qb+((mb>>>19|nb<<13)^(mb<<3|nb>>>29)^mb>>>6)+(rb>>>0<ic>>>0?1:0)|0;hc=3750685593+rb|0;gc=659060556+qb+(hc>>>0<rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;tb=tb+Lb|0;sb=sb+Kb+(tb>>>0<Lb>>>0?1:0)|0;ic=(vb>>>1|ub<<31)^(vb>>>8|ub<<24)^(vb>>>7|ub<<25)|0;tb=tb+ic|0;sb=sb+((ub>>>1|vb<<31)^(ub>>>8|vb<<24)^ub>>>7)+(tb>>>0<ic>>>0?1:0)|0;ic=(pb>>>19|ob<<13)^(pb<<3|ob>>>29)^(pb>>>6|ob<<26)|0;tb=tb+ic|0;sb=sb+((ob>>>19|pb<<13)^(ob<<3|pb>>>29)^ob>>>6)+(tb>>>0<ic>>>0?1:0)|0;hc=3785050280+tb|0;gc=883997877+sb+(hc>>>0<tb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;vb=vb+Nb|0;ub=ub+Mb+(vb>>>0<Nb>>>0?1:0)|0;ic=(xb>>>1|wb<<31)^(xb>>>8|wb<<24)^(xb>>>7|wb<<25)|0;vb=vb+ic|0;ub=ub+((wb>>>1|xb<<31)^(wb>>>8|xb<<24)^wb>>>7)+(vb>>>0<ic>>>0?1:0)|0;ic=(rb>>>19|qb<<13)^(rb<<3|qb>>>29)^(rb>>>6|qb<<26)|0;vb=vb+ic|0;ub=ub+((qb>>>19|rb<<13)^(qb<<3|rb>>>29)^qb>>>6)+(vb>>>0<ic>>>0?1:0)|0;hc=3318307427+vb|0;gc=958139571+ub+(hc>>>0<vb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;xb=xb+Pb|0;wb=wb+Ob+(xb>>>0<Pb>>>0?1:0)|0;ic=(zb>>>1|yb<<31)^(zb>>>8|yb<<24)^(zb>>>7|yb<<25)|0;xb=xb+ic|0;wb=wb+((yb>>>1|zb<<31)^(yb>>>8|zb<<24)^yb>>>7)+(xb>>>0<ic>>>0?1:0)|0;ic=(tb>>>19|sb<<13)^(tb<<3|sb>>>29)^(tb>>>6|sb<<26)|0;xb=xb+ic|0;wb=wb+((sb>>>19|tb<<13)^(sb<<3|tb>>>29)^sb>>>6)+(xb>>>0<ic>>>0?1:0)|0;hc=3812723403+xb|0;gc=1322822218+wb+(hc>>>0<xb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;zb=zb+Rb|0;yb=yb+Qb+(zb>>>0<Rb>>>0?1:0)|0;ic=(Bb>>>1|Ab<<31)^(Bb>>>8|Ab<<24)^(Bb>>>7|Ab<<25)|0;zb=zb+ic|0;yb=yb+((Ab>>>1|Bb<<31)^(Ab>>>8|Bb<<24)^Ab>>>7)+(zb>>>0<ic>>>0?1:0)|0;ic=(vb>>>19|ub<<13)^(vb<<3|ub>>>29)^(vb>>>6|ub<<26)|0;zb=zb+ic|0;yb=yb+((ub>>>19|vb<<13)^(ub<<3|vb>>>29)^ub>>>6)+(zb>>>0<ic>>>0?1:0)|0;hc=2003034995+zb|0;gc=1537002063+yb+(hc>>>0<zb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Bb=Bb+nb|0;Ab=Ab+mb+(Bb>>>0<nb>>>0?1:0)|0;ic=(Db>>>1|Cb<<31)^(Db>>>8|Cb<<24)^(Db>>>7|Cb<<25)|0;Bb=Bb+ic|0;Ab=Ab+((Cb>>>1|Db<<31)^(Cb>>>8|Db<<24)^Cb>>>7)+(Bb>>>0<ic>>>0?1:0)|0;ic=(xb>>>19|wb<<13)^(xb<<3|wb>>>29)^(xb>>>6|wb<<26)|0;Bb=Bb+ic|0;Ab=Ab+((wb>>>19|xb<<13)^(wb<<3|xb>>>29)^wb>>>6)+(Bb>>>0<ic>>>0?1:0)|0;hc=3602036899+Bb|0;gc=1747873779+Ab+(hc>>>0<Bb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Db=Db+pb|0;Cb=Cb+ob+(Db>>>0<pb>>>0?1:0)|0;ic=(Fb>>>1|Eb<<31)^(Fb>>>8|Eb<<24)^(Fb>>>7|Eb<<25)|0;Db=Db+ic|0;Cb=Cb+((Eb>>>1|Fb<<31)^(Eb>>>8|Fb<<24)^Eb>>>7)+(Db>>>0<ic>>>0?1:0)|0;ic=(zb>>>19|yb<<13)^(zb<<3|yb>>>29)^(zb>>>6|yb<<26)|0;Db=Db+ic|0;Cb=Cb+((yb>>>19|zb<<13)^(yb<<3|zb>>>29)^yb>>>6)+(Db>>>0<ic>>>0?1:0)|0;hc=1575990012+Db|0;gc=1955562222+Cb+(hc>>>0<Db>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Fb=Fb+rb|0;Eb=Eb+qb+(Fb>>>0<rb>>>0?1:0)|0;ic=(Hb>>>1|Gb<<31)^(Hb>>>8|Gb<<24)^(Hb>>>7|Gb<<25)|0;Fb=Fb+ic|0;Eb=Eb+((Gb>>>1|Hb<<31)^(Gb>>>8|Hb<<24)^Gb>>>7)+(Fb>>>0<ic>>>0?1:0)|0;ic=(Bb>>>19|Ab<<13)^(Bb<<3|Ab>>>29)^(Bb>>>6|Ab<<26)|0;Fb=Fb+ic|0;Eb=Eb+((Ab>>>19|Bb<<13)^(Ab<<3|Bb>>>29)^Ab>>>6)+(Fb>>>0<ic>>>0?1:0)|0;hc=1125592928+Fb|0;gc=2024104815+Eb+(hc>>>0<Fb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Hb=Hb+tb|0;Gb=Gb+sb+(Hb>>>0<tb>>>0?1:0)|0;ic=(Jb>>>1|Ib<<31)^(Jb>>>8|Ib<<24)^(Jb>>>7|Ib<<25)|0;Hb=Hb+ic|0;Gb=Gb+((Ib>>>1|Jb<<31)^(Ib>>>8|Jb<<24)^Ib>>>7)+(Hb>>>0<ic>>>0?1:0)|0;ic=(Db>>>19|Cb<<13)^(Db<<3|Cb>>>29)^(Db>>>6|Cb<<26)|0;Hb=Hb+ic|0;Gb=Gb+((Cb>>>19|Db<<13)^(Cb<<3|Db>>>29)^Cb>>>6)+(Hb>>>0<ic>>>0?1:0)|0;hc=2716904306+Hb|0;gc=2227730452+Gb+(hc>>>0<Hb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Jb=Jb+vb|0;Ib=Ib+ub+(Jb>>>0<vb>>>0?1:0)|0;ic=(Lb>>>1|Kb<<31)^(Lb>>>8|Kb<<24)^(Lb>>>7|Kb<<25)|0;Jb=Jb+ic|0;Ib=Ib+((Kb>>>1|Lb<<31)^(Kb>>>8|Lb<<24)^Kb>>>7)+(Jb>>>0<ic>>>0?1:0)|0;ic=(Fb>>>19|Eb<<13)^(Fb<<3|Eb>>>29)^(Fb>>>6|Eb<<26)|0;Jb=Jb+ic|0;Ib=Ib+((Eb>>>19|Fb<<13)^(Eb<<3|Fb>>>29)^Eb>>>6)+(Jb>>>0<ic>>>0?1:0)|0;hc=442776044+Jb|0;gc=2361852424+Ib+(hc>>>0<Jb>>>0?1:0)|0;
hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Lb=Lb+xb|0;Kb=Kb+wb+(Lb>>>0<xb>>>0?1:0)|0;ic=(Nb>>>1|Mb<<31)^(Nb>>>8|Mb<<24)^(Nb>>>7|Mb<<25)|0;Lb=Lb+ic|0;Kb=Kb+((Mb>>>1|Nb<<31)^(Mb>>>8|Nb<<24)^Mb>>>7)+(Lb>>>0<ic>>>0?1:0)|0;ic=(Hb>>>19|Gb<<13)^(Hb<<3|Gb>>>29)^(Hb>>>6|Gb<<26)|0;Lb=Lb+ic|0;Kb=Kb+((Gb>>>19|Hb<<13)^(Gb<<3|Hb>>>29)^Gb>>>6)+(Lb>>>0<ic>>>0?1:0)|0;hc=593698344+Lb|0;gc=2428436474+Kb+(hc>>>0<Lb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Nb=Nb+zb|0;Mb=Mb+yb+(Nb>>>0<zb>>>0?1:0)|0;ic=(Pb>>>1|Ob<<31)^(Pb>>>8|Ob<<24)^(Pb>>>7|Ob<<25)|0;Nb=Nb+ic|0;Mb=Mb+((Ob>>>1|Pb<<31)^(Ob>>>8|Pb<<24)^Ob>>>7)+(Nb>>>0<ic>>>0?1:0)|0;ic=(Jb>>>19|Ib<<13)^(Jb<<3|Ib>>>29)^(Jb>>>6|Ib<<26)|0;Nb=Nb+ic|0;Mb=Mb+((Ib>>>19|Jb<<13)^(Ib<<3|Jb>>>29)^Ib>>>6)+(Nb>>>0<ic>>>0?1:0)|0;hc=3733110249+Nb|0;gc=2756734187+Mb+(hc>>>0<Nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Pb=Pb+Bb|0;Ob=Ob+Ab+(Pb>>>0<Bb>>>0?1:0)|0;ic=(Rb>>>1|Qb<<31)^(Rb>>>8|Qb<<24)^(Rb>>>7|Qb<<25)|0;Pb=Pb+ic|0;Ob=Ob+((Qb>>>1|Rb<<31)^(Qb>>>8|Rb<<24)^Qb>>>7)+(Pb>>>0<ic>>>0?1:0)|0;ic=(Lb>>>19|Kb<<13)^(Lb<<3|Kb>>>29)^(Lb>>>6|Kb<<26)|0;Pb=Pb+ic|0;Ob=Ob+((Kb>>>19|Lb<<13)^(Kb<<3|Lb>>>29)^Kb>>>6)+(Pb>>>0<ic>>>0?1:0)|0;hc=2999351573+Pb|0;gc=3204031479+Ob+(hc>>>0<Pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Rb=Rb+Db|0;Qb=Qb+Cb+(Rb>>>0<Db>>>0?1:0)|0;ic=(nb>>>1|mb<<31)^(nb>>>8|mb<<24)^(nb>>>7|mb<<25)|0;Rb=Rb+ic|0;Qb=Qb+((mb>>>1|nb<<31)^(mb>>>8|nb<<24)^mb>>>7)+(Rb>>>0<ic>>>0?1:0)|0;ic=(Nb>>>19|Mb<<13)^(Nb<<3|Mb>>>29)^(Nb>>>6|Mb<<26)|0;Rb=Rb+ic|0;Qb=Qb+((Mb>>>19|Nb<<13)^(Mb<<3|Nb>>>29)^Mb>>>6)+(Rb>>>0<ic>>>0?1:0)|0;hc=3815920427+Rb|0;gc=3329325298+Qb+(hc>>>0<Rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;nb=nb+Fb|0;mb=mb+Eb+(nb>>>0<Fb>>>0?1:0)|0;ic=(pb>>>1|ob<<31)^(pb>>>8|ob<<24)^(pb>>>7|ob<<25)|0;nb=nb+ic|0;mb=mb+((ob>>>1|pb<<31)^(ob>>>8|pb<<24)^ob>>>7)+(nb>>>0<ic>>>0?1:0)|0;ic=(Pb>>>19|Ob<<13)^(Pb<<3|Ob>>>29)^(Pb>>>6|Ob<<26)|0;nb=nb+ic|0;mb=mb+((Ob>>>19|Pb<<13)^(Ob<<3|Pb>>>29)^Ob>>>6)+(nb>>>0<ic>>>0?1:0)|0;hc=3928383900+nb|0;gc=3391569614+mb+(hc>>>0<nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;pb=pb+Hb|0;ob=ob+Gb+(pb>>>0<Hb>>>0?1:0)|0;ic=(rb>>>1|qb<<31)^(rb>>>8|qb<<24)^(rb>>>7|qb<<25)|0;pb=pb+ic|0;ob=ob+((qb>>>1|rb<<31)^(qb>>>8|rb<<24)^qb>>>7)+(pb>>>0<ic>>>0?1:0)|0;ic=(Rb>>>19|Qb<<13)^(Rb<<3|Qb>>>29)^(Rb>>>6|Qb<<26)|0;pb=pb+ic|0;ob=ob+((Qb>>>19|Rb<<13)^(Qb<<3|Rb>>>29)^Qb>>>6)+(pb>>>0<ic>>>0?1:0)|0;hc=566280711+pb|0;gc=3515267271+ob+(hc>>>0<pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;rb=rb+Jb|0;qb=qb+Ib+(rb>>>0<Jb>>>0?1:0)|0;ic=(tb>>>1|sb<<31)^(tb>>>8|sb<<24)^(tb>>>7|sb<<25)|0;rb=rb+ic|0;qb=qb+((sb>>>1|tb<<31)^(sb>>>8|tb<<24)^sb>>>7)+(rb>>>0<ic>>>0?1:0)|0;ic=(nb>>>19|mb<<13)^(nb<<3|mb>>>29)^(nb>>>6|mb<<26)|0;rb=rb+ic|0;qb=qb+((mb>>>19|nb<<13)^(mb<<3|nb>>>29)^mb>>>6)+(rb>>>0<ic>>>0?1:0)|0;hc=3454069534+rb|0;gc=3940187606+qb+(hc>>>0<rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;tb=tb+Lb|0;sb=sb+Kb+(tb>>>0<Lb>>>0?1:0)|0;ic=(vb>>>1|ub<<31)^(vb>>>8|ub<<24)^(vb>>>7|ub<<25)|0;tb=tb+ic|0;sb=sb+((ub>>>1|vb<<31)^(ub>>>8|vb<<24)^ub>>>7)+(tb>>>0<ic>>>0?1:0)|0;ic=(pb>>>19|ob<<13)^(pb<<3|ob>>>29)^(pb>>>6|ob<<26)|0;tb=tb+ic|0;sb=sb+((ob>>>19|pb<<13)^(ob<<3|pb>>>29)^ob>>>6)+(tb>>>0<ic>>>0?1:0)|0;hc=4000239992+tb|0;gc=4118630271+sb+(hc>>>0<tb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;vb=vb+Nb|0;ub=ub+Mb+(vb>>>0<Nb>>>0?1:0)|0;ic=(xb>>>1|wb<<31)^(xb>>>8|wb<<24)^(xb>>>7|wb<<25)|0;vb=vb+ic|0;ub=ub+((wb>>>1|xb<<31)^(wb>>>8|xb<<24)^wb>>>7)+(vb>>>0<ic>>>0?1:0)|0;ic=(rb>>>19|qb<<13)^(rb<<3|qb>>>29)^(rb>>>6|qb<<26)|0;vb=vb+ic|0;ub=ub+((qb>>>19|rb<<13)^(qb<<3|rb>>>29)^qb>>>6)+(vb>>>0<ic>>>0?1:0)|0;hc=1914138554+vb|0;gc=116418474+ub+(hc>>>0<vb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;xb=xb+Pb|0;wb=wb+Ob+(xb>>>0<Pb>>>0?1:0)|0;ic=(zb>>>1|yb<<31)^(zb>>>8|yb<<24)^(zb>>>7|yb<<25)|0;xb=xb+ic|0;wb=wb+((yb>>>1|zb<<31)^(yb>>>8|zb<<24)^yb>>>7)+(xb>>>0<ic>>>0?1:0)|0;ic=(tb>>>19|sb<<13)^(tb<<3|sb>>>29)^(tb>>>6|sb<<26)|0;xb=xb+ic|0;wb=wb+((sb>>>19|tb<<13)^(sb<<3|tb>>>29)^sb>>>6)+(xb>>>0<ic>>>0?1:0)|0;hc=2731055270+xb|0;gc=174292421+wb+(hc>>>0<xb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;zb=zb+Rb|0;yb=yb+Qb+(zb>>>0<Rb>>>0?1:0)|0;ic=(Bb>>>1|Ab<<31)^(Bb>>>8|Ab<<24)^(Bb>>>7|Ab<<25)|0;zb=zb+ic|0;yb=yb+((Ab>>>1|Bb<<31)^(Ab>>>8|Bb<<24)^Ab>>>7)+(zb>>>0<ic>>>0?1:0)|0;ic=(vb>>>19|ub<<13)^(vb<<3|ub>>>29)^(vb>>>6|ub<<26)|0;zb=zb+ic|0;yb=yb+((ub>>>19|vb<<13)^(ub<<3|vb>>>29)^ub>>>6)+(zb>>>0<ic>>>0?1:0)|0;hc=3203993006+zb|0;gc=289380356+yb+(hc>>>0<zb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Bb=Bb+nb|0;Ab=Ab+mb+(Bb>>>0<nb>>>0?1:0)|0;ic=(Db>>>1|Cb<<31)^(Db>>>8|Cb<<24)^(Db>>>7|Cb<<25)|0;Bb=Bb+ic|0;Ab=Ab+((Cb>>>1|Db<<31)^(Cb>>>8|Db<<24)^Cb>>>7)+(Bb>>>0<ic>>>0?1:0)|0;ic=(xb>>>19|wb<<13)^(xb<<3|wb>>>29)^(xb>>>6|wb<<26)|0;Bb=Bb+ic|0;Ab=Ab+((wb>>>19|xb<<13)^(wb<<3|xb>>>29)^wb>>>6)+(Bb>>>0<ic>>>0?1:0)|0;hc=320620315+Bb|0;gc=460393269+Ab+(hc>>>0<Bb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Db=Db+pb|0;Cb=Cb+ob+(Db>>>0<pb>>>0?1:0)|0;ic=(Fb>>>1|Eb<<31)^(Fb>>>8|Eb<<24)^(Fb>>>7|Eb<<25)|0;Db=Db+ic|0;Cb=Cb+((Eb>>>1|Fb<<31)^(Eb>>>8|Fb<<24)^Eb>>>7)+(Db>>>0<ic>>>0?1:0)|0;ic=(zb>>>19|yb<<13)^(zb<<3|yb>>>29)^(zb>>>6|yb<<26)|0;Db=Db+ic|0;Cb=Cb+((yb>>>19|zb<<13)^(yb<<3|zb>>>29)^yb>>>6)+(Db>>>0<ic>>>0?1:0)|0;hc=587496836+Db|0;gc=685471733+Cb+(hc>>>0<Db>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Fb=Fb+rb|0;Eb=Eb+qb+(Fb>>>0<rb>>>0?1:0)|0;ic=(Hb>>>1|Gb<<31)^(Hb>>>8|Gb<<24)^(Hb>>>7|Gb<<25)|0;Fb=Fb+ic|0;Eb=Eb+((Gb>>>1|Hb<<31)^(Gb>>>8|Hb<<24)^Gb>>>7)+(Fb>>>0<ic>>>0?1:0)|0;ic=(Bb>>>19|Ab<<13)^(Bb<<3|Ab>>>29)^(Bb>>>6|Ab<<26)|0;Fb=Fb+ic|0;Eb=Eb+((Ab>>>19|Bb<<13)^(Ab<<3|Bb>>>29)^Ab>>>6)+(Fb>>>0<ic>>>0?1:0)|0;hc=1086792851+Fb|0;gc=852142971+Eb+(hc>>>0<Fb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Hb=Hb+tb|0;Gb=Gb+sb+(Hb>>>0<tb>>>0?1:0)|0;ic=(Jb>>>1|Ib<<31)^(Jb>>>8|Ib<<24)^(Jb>>>7|Ib<<25)|0;Hb=Hb+ic|0;Gb=Gb+((Ib>>>1|Jb<<31)^(Ib>>>8|Jb<<24)^Ib>>>7)+(Hb>>>0<ic>>>0?1:0)|0;ic=(Db>>>19|Cb<<13)^(Db<<3|Cb>>>29)^(Db>>>6|Cb<<26)|0;Hb=Hb+ic|0;Gb=Gb+((Cb>>>19|Db<<13)^(Cb<<3|Db>>>29)^Cb>>>6)+(Hb>>>0<ic>>>0?1:0)|0;hc=365543100+Hb|0;gc=1017036298+Gb+(hc>>>0<Hb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Jb=Jb+vb|0;Ib=Ib+ub+(Jb>>>0<vb>>>0?1:0)|0;ic=(Lb>>>1|Kb<<31)^(Lb>>>8|Kb<<24)^(Lb>>>7|Kb<<25)|0;Jb=Jb+ic|0;Ib=Ib+((Kb>>>1|Lb<<31)^(Kb>>>8|Lb<<24)^Kb>>>7)+(Jb>>>0<ic>>>0?1:0)|0;ic=(Fb>>>19|Eb<<13)^(Fb<<3|Eb>>>29)^(Fb>>>6|Eb<<26)|0;Jb=Jb+ic|0;Ib=Ib+((Eb>>>19|Fb<<13)^(Eb<<3|Fb>>>29)^Eb>>>6)+(Jb>>>0<ic>>>0?1:0)|0;hc=2618297676+Jb|0;gc=1126000580+Ib+(hc>>>0<Jb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Lb=Lb+xb|0;Kb=Kb+wb+(Lb>>>0<xb>>>0?1:0)|0;ic=(Nb>>>1|Mb<<31)^(Nb>>>8|Mb<<24)^(Nb>>>7|Mb<<25)|0;Lb=Lb+ic|0;Kb=Kb+((Mb>>>1|Nb<<31)^(Mb>>>8|Nb<<24)^Mb>>>7)+(Lb>>>0<ic>>>0?1:0)|0;ic=(Hb>>>19|Gb<<13)^(Hb<<3|Gb>>>29)^(Hb>>>6|Gb<<26)|0;Lb=Lb+ic|0;Kb=Kb+((Gb>>>19|Hb<<13)^(Gb<<3|Hb>>>29)^Gb>>>6)+(Lb>>>0<ic>>>0?1:0)|0;hc=3409855158+Lb|0;gc=1288033470+Kb+(hc>>>0<Lb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Nb=Nb+zb|0;Mb=Mb+yb+(Nb>>>0<zb>>>0?1:0)|0;ic=(Pb>>>1|Ob<<31)^(Pb>>>8|Ob<<24)^(Pb>>>7|Ob<<25)|0;Nb=Nb+ic|0;Mb=Mb+((Ob>>>1|Pb<<31)^(Ob>>>8|Pb<<24)^Ob>>>7)+(Nb>>>0<ic>>>0?1:0)|0;ic=(Jb>>>19|Ib<<13)^(Jb<<3|Ib>>>29)^(Jb>>>6|Ib<<26)|0;Nb=Nb+ic|0;Mb=Mb+((Ib>>>19|Jb<<13)^(Ib<<3|Jb>>>29)^Ib>>>6)+(Nb>>>0<ic>>>0?1:0)|0;hc=4234509866+Nb|0;gc=1501505948+Mb+(hc>>>0<Nb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Pb=Pb+Bb|0;Ob=Ob+Ab+(Pb>>>0<Bb>>>0?1:0)|0;ic=(Rb>>>1|Qb<<31)^(Rb>>>8|Qb<<24)^(Rb>>>7|Qb<<25)|0;Pb=Pb+ic|0;Ob=Ob+((Qb>>>1|Rb<<31)^(Qb>>>8|Rb<<24)^Qb>>>7)+(Pb>>>0<ic>>>0?1:0)|0;ic=(Lb>>>19|Kb<<13)^(Lb<<3|Kb>>>29)^(Lb>>>6|Kb<<26)|0;Pb=Pb+ic|0;Ob=Ob+((Kb>>>19|Lb<<13)^(Kb<<3|Lb>>>29)^Kb>>>6)+(Pb>>>0<ic>>>0?1:0)|0;hc=987167468+Pb|0;gc=1607167915+Ob+(hc>>>0<Pb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;Rb=Rb+Db|0;Qb=Qb+Cb+(Rb>>>0<Db>>>0?1:0)|0;ic=(nb>>>1|mb<<31)^(nb>>>8|mb<<24)^(nb>>>7|mb<<25)|0;Rb=Rb+ic|0;Qb=Qb+((mb>>>1|nb<<31)^(mb>>>8|nb<<24)^mb>>>7)+(Rb>>>0<ic>>>0?1:0)|0;ic=(Nb>>>19|Mb<<13)^(Nb<<3|Mb>>>29)^(Nb>>>6|Mb<<26)|0;Rb=Rb+ic|0;Qb=Qb+((Mb>>>19|Nb<<13)^(Mb<<3|Nb>>>29)^Mb>>>6)+(Rb>>>0<ic>>>0?1:0)|0;hc=1246189591+Rb|0;gc=1816402316+Qb+(hc>>>0<Rb>>>0?1:0)|0;hc=hc+fc|0;gc=gc+ec+(hc>>>0<fc>>>0?1:0)|0;ic=(_b>>>14|$b<<18)^(_b>>>18|$b<<14)^(_b<<23|$b>>>9)|0;hc=hc+ic|0;gc=gc+(($b>>>14|_b<<18)^($b>>>18|_b<<14)^($b<<23|_b>>>9))+(hc>>>0<ic>>>0?1:0)|0;ic=dc^_b&(bc^dc)|0;hc=hc+ic|0;gc=gc+(cc^$b&(ac^cc))+(hc>>>0<ic>>>0?1:0)|0;fc=dc;ec=cc;dc=bc;cc=ac;bc=_b;ac=$b;_b=Zb+hc|0;$b=Yb+gc+(_b>>>0<Zb>>>0?1:0)|0;Zb=Xb;Yb=Wb;Xb=Vb;Wb=Ub;Vb=Tb;Ub=Sb;Tb=hc+(Vb&Xb^Zb&(Vb^Xb))|0;Sb=gc+(Ub&Wb^Yb&(Ub^Wb))+(Tb>>>0<hc>>>0?1:0)|0;ic=(Vb>>>28|Ub<<4)^(Vb<<30|Ub>>>2)^(Vb<<25|Ub>>>7)|0;Tb=Tb+ic|0;Sb=Sb+((Ub>>>28|Vb<<4)^(Ub<<30|Vb>>>2)^(Ub<<25|Vb>>>7))+(Tb>>>0<ic>>>0?1:0)|0;e=e+Tb|0;d=d+Sb+(e>>>0<Tb>>>0?1:0)|0;g=g+Vb|0;f=f+Ub+(g>>>0<Vb>>>0?1:0)|0;i=i+Xb|0;h=h+Wb+(i>>>0<Xb>>>0?1:0)|0;k=k+Zb|0;j=j+Yb+(k>>>0<Zb>>>0?1:0)|0;m=m+_b|0;l=l+$b+(m>>>0<_b>>>0?1:0)|0;o=o+bc|0;n=n+ac+(o>>>0<bc>>>0?1:0)|0;q=q+dc|0;p=p+cc+(q>>>0<dc>>>0?1:0)|0;s=s+fc|0;r=r+ec+(s>>>0<fc>>>0?1:0)|0}function ab(mb){mb=mb|0;_($[mb|0]<<24|$[mb|1]<<16|$[mb|2]<<8|$[mb|3],$[mb|4]<<24|$[mb|5]<<16|$[mb|6]<<8|$[mb|7],$[mb|8]<<24|$[mb|9]<<16|$[mb|10]<<8|$[mb|11],$[mb|12]<<24|$[mb|13]<<16|$[mb|14]<<8|$[mb|15],$[mb|16]<<24|$[mb|17]<<16|$[mb|18]<<8|$[mb|19],$[mb|20]<<24|$[mb|21]<<16|$[mb|22]<<8|$[mb|23],$[mb|24]<<24|$[mb|25]<<16|$[mb|26]<<8|$[mb|27],$[mb|28]<<24|$[mb|29]<<16|$[mb|30]<<8|$[mb|31],$[mb|32]<<24|$[mb|33]<<16|$[mb|34]<<8|$[mb|35],$[mb|36]<<24|$[mb|37]<<16|$[mb|38]<<8|$[mb|39],$[mb|40]<<24|$[mb|41]<<16|$[mb|42]<<8|$[mb|43],$[mb|44]<<24|$[mb|45]<<16|$[mb|46]<<8|$[mb|47],$[mb|48]<<24|$[mb|49]<<16|$[mb|50]<<8|$[mb|51],$[mb|52]<<24|$[mb|53]<<16|$[mb|54]<<8|$[mb|55],$[mb|56]<<24|$[mb|57]<<16|$[mb|58]<<8|$[mb|59],$[mb|60]<<24|$[mb|61]<<16|$[mb|62]<<8|$[mb|63],$[mb|64]<<24|$[mb|65]<<16|$[mb|66]<<8|$[mb|67],$[mb|68]<<24|$[mb|69]<<16|$[mb|70]<<8|$[mb|71],$[mb|72]<<24|$[mb|73]<<16|$[mb|74]<<8|$[mb|75],$[mb|76]<<24|$[mb|77]<<16|$[mb|78]<<8|$[mb|79],$[mb|80]<<24|$[mb|81]<<16|$[mb|82]<<8|$[mb|83],$[mb|84]<<24|$[mb|85]<<16|$[mb|86]<<8|$[mb|87],$[mb|88]<<24|$[mb|89]<<16|$[mb|90]<<8|$[mb|91],$[mb|92]<<24|$[mb|93]<<16|$[mb|94]<<8|$[mb|95],$[mb|96]<<24|$[mb|97]<<16|$[mb|98]<<8|$[mb|99],$[mb|100]<<24|$[mb|101]<<16|$[mb|102]<<8|$[mb|103],$[mb|104]<<24|$[mb|105]<<16|$[mb|106]<<8|$[mb|107],$[mb|108]<<24|$[mb|109]<<16|$[mb|110]<<8|$[mb|111],$[mb|112]<<24|$[mb|113]<<16|$[mb|114]<<8|$[mb|115],$[mb|116]<<24|$[mb|117]<<16|$[mb|118]<<8|$[mb|119],$[mb|120]<<24|$[mb|121]<<16|$[mb|122]<<8|$[mb|123],$[mb|124]<<24|$[mb|125]<<16|$[mb|126]<<8|$[mb|127])}function bb(mb){mb=mb|0;$[mb|0]=d>>>24;$[mb|1]=d>>>16&255;$[mb|2]=d>>>8&255;$[mb|3]=d&255;$[mb|4]=e>>>24;$[mb|5]=e>>>16&255;$[mb|6]=e>>>8&255;$[mb|7]=e&255;$[mb|8]=f>>>24;$[mb|9]=f>>>16&255;$[mb|10]=f>>>8&255;$[mb|11]=f&255;$[mb|12]=g>>>24;$[mb|13]=g>>>16&255;$[mb|14]=g>>>8&255;$[mb|15]=g&255;$[mb|16]=h>>>24;$[mb|17]=h>>>16&255;$[mb|18]=h>>>8&255;$[mb|19]=h&255;$[mb|20]=i>>>24;$[mb|21]=i>>>16&255;$[mb|22]=i>>>8&255;$[mb|23]=i&255;$[mb|24]=j>>>24;$[mb|25]=j>>>16&255;$[mb|26]=j>>>8&255;$[mb|27]=j&255;$[mb|28]=k>>>24;$[mb|29]=k>>>16&255;$[mb|30]=k>>>8&255;$[mb|31]=k&255;$[mb|32]=l>>>24;$[mb|33]=l>>>16&255;$[mb|34]=l>>>8&255;$[mb|35]=l&255;$[mb|36]=m>>>24;$[mb|37]=m>>>16&255;$[mb|38]=m>>>8&255;$[mb|39]=m&255;$[mb|40]=n>>>24;$[mb|41]=n>>>16&255;$[mb|42]=n>>>8&255;$[mb|43]=n&255;$[mb|44]=o>>>24;$[mb|45]=o>>>16&255;$[mb|46]=o>>>8&255;$[mb|47]=o&255;$[mb|48]=p>>>24;$[mb|49]=p>>>16&255;$[mb|50]=p>>>8&255;$[mb|51]=p&255;$[mb|52]=q>>>24;$[mb|53]=q>>>16&255;$[mb|54]=q>>>8&255;$[mb|55]=q&255;$[mb|56]=r>>>24;$[mb|57]=r>>>16&255;$[mb|58]=r>>>8&255;$[mb|59]=r&255;$[mb|60]=s>>>24;$[mb|61]=s>>>16&255;$[mb|62]=s>>>8&255;$[mb|63]=s&255}function cb(){d=1779033703;e=4089235720;f=3144134277;g=2227873595;h=1013904242;i=4271175723;j=2773480762;k=1595750129;l=1359893119;m=2917565137;n=2600822924;o=725511199;p=528734635;q=4215389547;r=1541459225;s=327033209;t=0}function db(mb,nb,ob,pb,qb,rb,sb,tb,ub,vb,wb,xb,yb,zb,Ab,Bb,Cb){mb=mb|0;nb=nb|0;ob=ob|0;pb=pb|0;qb=qb|0;rb=rb|0;sb=sb|0;tb=tb|0;ub=ub|0;vb=vb|0;wb=wb|0;xb=xb|0;yb=yb|0;zb=zb|0;Ab=Ab|0;Bb=Bb|0;Cb=Cb|0;d=mb;e=nb;f=ob;g=pb;h=qb;i=rb;j=sb;k=tb;l=ub;m=vb;n=wb;o=xb;p=yb;q=zb;r=Ab;s=Bb;t=Cb}function eb(mb,nb){mb=mb|0;nb=nb|0;var ob=0;if(mb&127)return-1;while((nb|0)>=128){ab(mb);mb=mb+128|0;nb=nb-128|0;ob=ob+128|0}t=t+ob|0;return ob|0}function fb(mb,nb,ob){mb=mb|0;nb=nb|0;ob=ob|0;var pb=0,qb=0;if(mb&127)return-1;if(~ob)if(ob&63)return-1;if((nb|0)>=128){pb=eb(mb,nb)|0;if((pb|0)==-1)return-1;mb=mb+pb|0;nb=nb-pb|0}pb=pb+nb|0;t=t+nb|0;$[mb|nb]=128;if((nb|0)>=112){for(qb=nb+1|0;(qb|0)<128;qb=qb+1|0)$[mb|qb]=0;ab(mb);nb=0;$[mb|0]=0}for(qb=nb+1|0;(qb|0)<123;qb=qb+1|0)$[mb|qb]=0;$[mb|123]=t>>>29;$[mb|124]=t>>>21&255;$[mb|125]=t>>>13&255;$[mb|126]=t>>>5&255;$[mb|127]=t<<3&255;ab(mb);if(~ob)bb(ob);return pb|0}function hb(){d=u;e=v;f=w;g=x;h=y;i=z;j=A;k=B;l=C;m=D;n=E;o=F;p=G;q=H;r=I;s=J;t=128}function ib(){d=K;e=L;f=M;g=N;h=O;i=P;j=Q;k=R;l=S;m=T;n=U;o=V;p=W;q=X;r=Y;s=Z;t=128}function jb(mb,nb,ob,pb,qb,rb,sb,tb,ub,vb,wb,xb,yb,zb,Ab,Bb,Cb,Db,Eb,Fb,Gb,Hb,Ib,Jb,Kb,Lb,Mb,Nb,Ob,Pb,Qb,Rb){mb=mb|0;nb=nb|0;ob=ob|0;pb=pb|0;qb=qb|0;rb=rb|0;sb=sb|0;tb=tb|0;ub=ub|0;vb=vb|0;wb=wb|0;xb=xb|0;yb=yb|0;zb=zb|0;Ab=Ab|0;Bb=Bb|0;Cb=Cb|0;Db=Db|0;Eb=Eb|0;Fb=Fb|0;Gb=Gb|0;Hb=Hb|0;Ib=Ib|0;Jb=Jb|0;Kb=Kb|0;Lb=Lb|0;Mb=Mb|0;Nb=Nb|0;Ob=Ob|0;Pb=Pb|0;Qb=Qb|0;Rb=Rb|0;cb();_(mb^1549556828,nb^1549556828,ob^1549556828,pb^1549556828,qb^1549556828,rb^1549556828,sb^1549556828,tb^1549556828,ub^1549556828,vb^1549556828,wb^1549556828,xb^1549556828,yb^1549556828,zb^1549556828,Ab^1549556828,Bb^1549556828,Cb^1549556828,Db^1549556828,Eb^1549556828,Fb^1549556828,Gb^1549556828,Hb^1549556828,Ib^1549556828,Jb^1549556828,Kb^1549556828,Lb^1549556828,Mb^1549556828,Nb^1549556828,Ob^1549556828,Pb^1549556828,Qb^1549556828,Rb^1549556828);K=d;L=e;M=f;N=g;O=h;P=i;Q=j;R=k;S=l;T=m;U=n;V=o;W=p;X=q;Y=r;Z=s;cb();_(mb^909522486,nb^909522486,ob^909522486,pb^909522486,qb^909522486,rb^909522486,sb^909522486,tb^909522486,ub^909522486,vb^909522486,wb^909522486,xb^909522486,yb^909522486,zb^909522486,Ab^909522486,Bb^909522486,Cb^909522486,Db^909522486,Eb^909522486,Fb^909522486,Gb^909522486,Hb^909522486,Ib^909522486,Jb^909522486,Kb^909522486,Lb^909522486,Mb^909522486,Nb^909522486,Ob^909522486,Pb^909522486,Qb^909522486,Rb^909522486);u=d;v=e;w=f;x=g;y=h;z=i;A=j;B=k;C=l;D=m;E=n;F=o;G=p;H=q;I=r;J=s;t=128}function kb(mb,nb,ob){mb=mb|0;nb=nb|0;ob=ob|0;var pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0;if(mb&127)return-1;if(~ob)if(ob&63)return-1;Fb=fb(mb,nb,-1)|0;pb=d;qb=e;rb=f;sb=g;tb=h;ub=i;vb=j;wb=k;xb=l;yb=m;zb=n;Ab=o;Bb=p;Cb=q;Db=r;Eb=s;ib();_(pb,qb,rb,sb,tb,ub,vb,wb,xb,yb,zb,Ab,Bb,Cb,Db,Eb,2147483648,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1536);if(~ob)bb(ob);return Fb|0}function lb(mb,nb,ob,pb,qb){mb=mb|0;nb=nb|0;ob=ob|0;pb=pb|0;qb=qb|0;var rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0;if(mb&127)return-1;if(~qb)if(qb&63)return-1;$[mb+nb|0]=ob>>>24;$[mb+nb+1|0]=ob>>>16&255;$[mb+nb+2|0]=ob>>>8&255;$[mb+nb+3|0]=ob&255;kb(mb,nb+4|0,-1)|0;rb=Hb=d;sb=Ib=e;tb=Jb=f;ub=Kb=g;vb=Lb=h;wb=Mb=i;xb=Nb=j;yb=Ob=k;zb=Pb=l;Ab=Qb=m;Bb=Rb=n;Cb=Sb=o;Db=Tb=p;Eb=Ub=q;Fb=Vb=r;Gb=Wb=s;pb=pb-1|0;while((pb|0)>0){hb();_(Hb,Ib,Jb,Kb,Lb,Mb,Nb,Ob,Pb,Qb,Rb,Sb,Tb,Ub,Vb,Wb,2147483648,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1536);Hb=d;Ib=e;Jb=f;Kb=g;Lb=h;Mb=i;Nb=j;Ob=k;Pb=l;Qb=m;Rb=n;Sb=o;Tb=p;Ub=q;Vb=r;Wb=s;ib();_(Hb,Ib,Jb,Kb,Lb,Mb,Nb,Ob,Pb,Qb,Rb,Sb,Tb,Ub,Vb,Wb,2147483648,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1536);Hb=d;Ib=e;Jb=f;Kb=g;Lb=h;Mb=i;Nb=j;Ob=k;Pb=l;Qb=m;Rb=n;Sb=o;Tb=p;Ub=q;Vb=r;Wb=s;rb=rb^d;sb=sb^e;tb=tb^f;ub=ub^g;vb=vb^h;wb=wb^i;xb=xb^j;yb=yb^k;zb=zb^l;Ab=Ab^m;Bb=Bb^n;Cb=Cb^o;Db=Db^p;Eb=Eb^q;Fb=Fb^r;Gb=Gb^s;pb=pb-1|0}d=rb;e=sb;f=tb;g=ub;h=vb;i=wb;j=xb;k=yb;l=zb;m=Ab;n=Bb;o=Cb;p=Db;q=Eb;r=Fb;s=Gb;if(~qb)bb(qb);return 0}return{reset:cb,init:db,process:eb,finish:fb,hmac_reset:hb,hmac_init:jb,hmac_finish:kb,pbkdf2_generate_block:lb}}function hb(a){if(a=a||{},a.heapSize=a.heapSize||4096,a.heapSize<=0||a.heapSize%4096)throw new p("heapSize must be a positive number and multiple of 4096");this.heap=a.heap||new Uint8Array(a.heapSize),this.asm=a.asm||gb(b,null,this.heap.buffer),this.BLOCK_SIZE=kd,this.HASH_SIZE=ld,this.reset()}function ib(){return this.result=null,this.pos=0,this.len=0,this.asm.reset(),this}function jb(a){if(null!==this.result)throw new o("state must be reset before processing new data");var b=0,c=0,d=0;if(l(a)||m(a))b=a.byteOffset||0,c=a.byteLength;else{if(!k(a))throw new TypeError("data isn't of expected type");c=a.length}for(;c>0;){if(d=this.heap.byteLength-this.pos-this.len,d=c>d?d:c,l(a)||m(a))this.heap.set(new Uint8Array(a.buffer||a,b,d),this.pos+this.len);else for(var e=0;d>e;e++)this.heap[this.pos+this.len+e]=a.charCodeAt(b+e);this.len+=d,b+=d,c-=d,d=this.asm.process(this.pos,this.len),d<this.len?(this.pos+=d,this.len-=d):(this.pos=0,this.len=0)}return this}function kb(){if(null!==this.result)throw new o("state must be reset before processing new data");return this.asm.finish(this.pos,this.len,0),this.result=new Uint8Array(ld),this.result.set(this.heap.subarray(0,ld)),this.pos=0,this.len=0,this}function lb(a){if(a=a||{},!a.hash)throw new SyntaxError("option 'hash' is required");if(!a.hash.HASH_SIZE)throw new SyntaxError("option 'hash' supplied doesn't seem to be a valid hash function");return this.hash=a.hash,this.BLOCK_SIZE=this.hash.BLOCK_SIZE,this.HMAC_SIZE=this.hash.HASH_SIZE,this.key=null,this.verify=null,this.result=null,(void 0!==a.password||void 0!==a.verify)&&this.reset(a),this}function mb(a){return a=a||{},a.hash instanceof cb||(a.hash=new cb(a)),lb.call(this,a),this}function nb(a){return a=a||{},a.hash instanceof hb||(a.hash=new hb(a)),lb.call(this,a),this}function ob(a,b){var c;if(l(b)||m(b))c=new Uint8Array(a.BLOCK_SIZE),c.set(b.byteLength>a.BLOCK_SIZE?new Uint8Array(a.reset().process(b).finish().result):l(b)?new Uint8Array(b):b);else{if(!k(b))throw new TypeError("password isn't of expected type");if(c=new Uint8Array(a.BLOCK_SIZE),b.length>a.BLOCK_SIZE)c.set(new Uint8Array(a.reset().process(b).finish().result));else for(var d=0;d<b.length;++d)c[d]=b.charCodeAt(d)}return c}function pb(a){if(l(a)||m(a))a=new Uint8Array(a);else{if(!k(a))throw new TypeError("verify tag isn't of expected type");a=c(a)}if(a.length!==this.HMAC_SIZE)throw new p("illegal verification tag size");this.verify=a}function qb(a){a=a||{};var b=a.password;if(null===this.key&&!k(b)&&!b)throw new o("no key is associated with the instance");this.result=null,this.hash.reset(),(b||k(b))&&(this.key=ob(this.hash,b));for(var c=new Uint8Array(this.key),d=0;d<c.length;++d)c[d]^=54;this.hash.process(c);var e=a.verify;return void 0!==e?pb.call(this,e):this.verify=null,this}function rb(a){a=a||{};var b=a.password;if(null===this.key&&!k(b)&&!b)throw new o("no key is associated with the instance");this.result=null,this.hash.reset(),b||k(b)?(this.key=ob(this.hash,b),this.hash.reset().asm.hmac_init(this.key[0]<<24|this.key[1]<<16|this.key[2]<<8|this.key[3],this.key[4]<<24|this.key[5]<<16|this.key[6]<<8|this.key[7],this.key[8]<<24|this.key[9]<<16|this.key[10]<<8|this.key[11],this.key[12]<<24|this.key[13]<<16|this.key[14]<<8|this.key[15],this.key[16]<<24|this.key[17]<<16|this.key[18]<<8|this.key[19],this.key[20]<<24|this.key[21]<<16|this.key[22]<<8|this.key[23],this.key[24]<<24|this.key[25]<<16|this.key[26]<<8|this.key[27],this.key[28]<<24|this.key[29]<<16|this.key[30]<<8|this.key[31],this.key[32]<<24|this.key[33]<<16|this.key[34]<<8|this.key[35],this.key[36]<<24|this.key[37]<<16|this.key[38]<<8|this.key[39],this.key[40]<<24|this.key[41]<<16|this.key[42]<<8|this.key[43],this.key[44]<<24|this.key[45]<<16|this.key[46]<<8|this.key[47],this.key[48]<<24|this.key[49]<<16|this.key[50]<<8|this.key[51],this.key[52]<<24|this.key[53]<<16|this.key[54]<<8|this.key[55],this.key[56]<<24|this.key[57]<<16|this.key[58]<<8|this.key[59],this.key[60]<<24|this.key[61]<<16|this.key[62]<<8|this.key[63])):this.hash.asm.hmac_reset();var c=a.verify;return void 0!==c?pb.call(this,c):this.verify=null,this}function sb(a){a=a||{};var b=a.password;if(null===this.key&&!k(b)&&!b)throw new o("no key is associated with the instance");this.result=null,this.hash.reset(),b||k(b)?(this.key=ob(this.hash,b),this.hash.reset().asm.hmac_init(this.key[0]<<24|this.key[1]<<16|this.key[2]<<8|this.key[3],this.key[4]<<24|this.key[5]<<16|this.key[6]<<8|this.key[7],this.key[8]<<24|this.key[9]<<16|this.key[10]<<8|this.key[11],this.key[12]<<24|this.key[13]<<16|this.key[14]<<8|this.key[15],this.key[16]<<24|this.key[17]<<16|this.key[18]<<8|this.key[19],this.key[20]<<24|this.key[21]<<16|this.key[22]<<8|this.key[23],this.key[24]<<24|this.key[25]<<16|this.key[26]<<8|this.key[27],this.key[28]<<24|this.key[29]<<16|this.key[30]<<8|this.key[31],this.key[32]<<24|this.key[33]<<16|this.key[34]<<8|this.key[35],this.key[36]<<24|this.key[37]<<16|this.key[38]<<8|this.key[39],this.key[40]<<24|this.key[41]<<16|this.key[42]<<8|this.key[43],this.key[44]<<24|this.key[45]<<16|this.key[46]<<8|this.key[47],this.key[48]<<24|this.key[49]<<16|this.key[50]<<8|this.key[51],this.key[52]<<24|this.key[53]<<16|this.key[54]<<8|this.key[55],this.key[56]<<24|this.key[57]<<16|this.key[58]<<8|this.key[59],this.key[60]<<24|this.key[61]<<16|this.key[62]<<8|this.key[63],this.key[64]<<24|this.key[65]<<16|this.key[66]<<8|this.key[67],this.key[68]<<24|this.key[69]<<16|this.key[70]<<8|this.key[71],this.key[72]<<24|this.key[73]<<16|this.key[74]<<8|this.key[75],this.key[76]<<24|this.key[77]<<16|this.key[78]<<8|this.key[79],this.key[80]<<24|this.key[81]<<16|this.key[82]<<8|this.key[83],this.key[84]<<24|this.key[85]<<16|this.key[86]<<8|this.key[87],this.key[88]<<24|this.key[89]<<16|this.key[90]<<8|this.key[91],this.key[92]<<24|this.key[93]<<16|this.key[94]<<8|this.key[95],this.key[96]<<24|this.key[97]<<16|this.key[98]<<8|this.key[99],this.key[100]<<24|this.key[101]<<16|this.key[102]<<8|this.key[103],this.key[104]<<24|this.key[105]<<16|this.key[106]<<8|this.key[107],this.key[108]<<24|this.key[109]<<16|this.key[110]<<8|this.key[111],this.key[112]<<24|this.key[113]<<16|this.key[114]<<8|this.key[115],this.key[116]<<24|this.key[117]<<16|this.key[118]<<8|this.key[119],this.key[120]<<24|this.key[121]<<16|this.key[122]<<8|this.key[123],this.key[124]<<24|this.key[125]<<16|this.key[126]<<8|this.key[127])):this.hash.asm.hmac_reset();
var c=a.verify;return void 0!==c?pb.call(this,c):this.verify=null,this}function tb(a){if(null===this.key)throw new o("no key is associated with the instance");if(null!==this.result)throw new o("state must be reset before processing new data");return this.hash.process(a),this}function ub(){if(null===this.key)throw new o("no key is associated with the instance");if(null!==this.result)throw new o("state must be reset before processing new data");for(var a=this.hash.finish().result,b=new Uint8Array(this.key),c=0;c<b.length;++c)b[c]^=92;var d=this.verify,e=this.hash.reset().process(b).process(a).finish().result;if(d)if(d.length===e.length){for(var f=0,c=0;c<d.length;c++)f|=d[c]^e[c];this.result=!f}else this.result=!1;else this.result=e;return this}function vb(){if(null===this.key)throw new o("no key is associated with the instance");if(null!==this.result)throw new o("state must be reset before processing new data");var a=this.hash,b=this.hash.asm,c=this.hash.heap;b.hmac_finish(a.pos,a.len,0);var d=this.verify,e=new Uint8Array(id);if(e.set(c.subarray(0,id)),d)if(d.length===e.length){for(var f=0,g=0;g<d.length;g++)f|=d[g]^e[g];this.result=!f}else this.result=!1;else this.result=e;return this}function wb(){if(null===this.key)throw new o("no key is associated with the instance");if(null!==this.result)throw new o("state must be reset before processing new data");var a=this.hash,b=this.hash.asm,c=this.hash.heap;b.hmac_finish(a.pos,a.len,0);var d=this.verify,e=new Uint8Array(ld);if(e.set(c.subarray(0,ld)),d)if(d.length===e.length){for(var f=0,g=0;g<d.length;g++)f|=d[g]^e[g];this.result=!f}else this.result=!1;else this.result=e;return this}function xb(a){if(a=a||{},!a.hmac)throw new SyntaxError("option 'hmac' is required");if(!a.hmac.HMAC_SIZE)throw new SyntaxError("option 'hmac' supplied doesn't seem to be a valid HMAC function");this.hmac=a.hmac,this.count=a.count||4096,this.length=a.length||this.hmac.HMAC_SIZE,this.result=null;var b=a.password;return(b||k(b))&&this.reset(a),this}function yb(a){return a=a||{},a.hmac instanceof mb||(a.hmac=new mb(a)),xb.call(this,a),this}function zb(a){return a=a||{},a.hmac instanceof nb||(a.hmac=new nb(a)),xb.call(this,a),this}function Ab(a){return this.result=null,this.hmac.reset(a),this}function Bb(a,b,c){if(null!==this.result)throw new o("state must be reset before processing new data");if(!a&&!k(a))throw new p("bad 'salt' value");b=b||this.count,c=c||this.length,this.result=new Uint8Array(c);for(var d=Math.ceil(c/this.hmac.HMAC_SIZE),e=1;d>=e;++e){var f=(e-1)*this.hmac.HMAC_SIZE,g=(d>e?0:c%this.hmac.HMAC_SIZE)||this.hmac.HMAC_SIZE,h=new Uint8Array(this.hmac.reset().process(a).process(new Uint8Array([e>>>24&255,e>>>16&255,e>>>8&255,255&e])).finish().result);this.result.set(h.subarray(0,g),f);for(var i=1;b>i;++i){h=new Uint8Array(this.hmac.reset().process(h).finish().result);for(var j=0;g>j;++j)this.result[f+j]^=h[j]}}return this}function Cb(a,b,c){if(null!==this.result)throw new o("state must be reset before processing new data");if(!a&&!k(a))throw new p("bad 'salt' value");b=b||this.count,c=c||this.length,this.result=new Uint8Array(c);for(var d=Math.ceil(c/this.hmac.HMAC_SIZE),e=1;d>=e;++e){var f=(e-1)*this.hmac.HMAC_SIZE,g=(d>e?0:c%this.hmac.HMAC_SIZE)||this.hmac.HMAC_SIZE;this.hmac.reset().process(a),this.hmac.hash.asm.pbkdf2_generate_block(this.hmac.hash.pos,this.hmac.hash.len,e,b,0),this.result.set(this.hmac.hash.heap.subarray(0,g),f)}return this}function Db(a,b,c){if(null!==this.result)throw new o("state must be reset before processing new data");if(!a&&!k(a))throw new p("bad 'salt' value");b=b||this.count,c=c||this.length,this.result=new Uint8Array(c);for(var d=Math.ceil(c/this.hmac.HMAC_SIZE),e=1;d>=e;++e){var f=(e-1)*this.hmac.HMAC_SIZE,g=(d>e?0:c%this.hmac.HMAC_SIZE)||this.hmac.HMAC_SIZE;this.hmac.reset().process(a),this.hmac.hash.asm.pbkdf2_generate_block(this.hmac.hash.pos,this.hmac.hash.len,e,b,0),this.result.set(this.hmac.hash.heap.subarray(0,g),f)}return this}function Eb(a){if(void 0===a)throw new SyntaxError("data required");return td.reset().process(a).finish().result}function Fb(a){var b=Eb(a);return g(b)}function Gb(a){var b=Eb(a);return h(b)}function Hb(a){if(void 0===a)throw new SyntaxError("data required");return ud.reset().process(a).finish().result}function Ib(a){var b=Hb(a);return g(b)}function Jb(a){var b=Hb(a);return h(b)}function Kb(a,b){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("password required");return vd.reset({password:b}).process(a).finish().result}function Lb(a,b){var c=Kb(a,b);return g(c)}function Mb(a,b){var c=Kb(a,b);return h(c)}function Nb(a,b){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("password required");return wd.reset({password:b}).process(a).finish().result}function Ob(a,b){var c=Nb(a,b);return g(c)}function Pb(a,b){var c=Nb(a,b);return h(c)}function Qb(a,b,c,d){if(void 0===a)throw new SyntaxError("password required");if(void 0===b)throw new SyntaxError("salt required");return xd.reset({password:a}).generate(b,c,d).result}function Rb(a,b,c,d){var e=Qb(a,b,c,d);return g(e)}function Sb(a,b,c,d){var e=Qb(a,b,c,d);return h(e)}function Tb(a,b,c,d){if(void 0===a)throw new SyntaxError("password required");if(void 0===b)throw new SyntaxError("salt required");return yd.reset({password:a}).generate(b,c,d).result}function Ub(a,b,c,d){var e=Tb(a,b,c,d);return g(e)}function Vb(a,b,c,d){var e=Tb(a,b,c,d);return h(e)}function Wb(a,b,c,d){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return zd.reset({key:b,padding:c,iv:d}).encrypt(a).result}function Xb(a,b,c,d){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return zd.reset({key:b,padding:c,iv:d}).decrypt(a).result}function Yb(a,b,c,d,e){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");if(void 0===c)throw new SyntaxError("nonce required");var f=a.byteLength||a.length||0;return Ad.reset({key:b,nonce:c,adata:d,tagSize:e,dataLength:f}).encrypt(a).result}function Zb(a,b,c,d,e){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");if(void 0===c)throw new SyntaxError("nonce required");var f=a.byteLength||a.length||0;return e=e||Xc,Ad.reset({key:b,nonce:c,adata:d,tagSize:e,dataLength:f-e}).decrypt(a).result}function $b(a,b,c,d){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return Bd.reset({key:b,padding:c,iv:d}).encrypt(a).result}function _b(a,b,c,d){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return Bd.reset({key:b,padding:c,iv:d}).decrypt(a).result}function ac(a){if(!l(a)&&!n(a))throw new TypeError("unexpected buffer type");var b,c,d=a.byteLength||a.length,e=new Uint8Array(a.buffer||a,a.byteOffset||0,d);if(Dd)Dd.getRandomValues(e);else for(b=0;d>b;b++)3&b||(c=4294967296*Ed()|0),e[b]=c,c>>>=8;for(b=0;d>b;b++)3&b||(c=Fd()),e[b]^=c,c>>>=8}function bc(a,b,c){"use asm";var d=0;var e=new a.Uint32Array(c);var f=a.Math.imul;function g(u){u=u|0;d=u=u+31&-32;return u|0}function h(u){u=u|0;var v=0;v=d;d=v+(u+31&-32)|0;return v|0}function i(u){u=u|0;d=d-(u+31&-32)|0}function j(u,v,w){u=u|0;v=v|0;w=w|0;var x=0;if((v|0)>(w|0)){for(;(x|0)<(u|0);x=x+4|0){e[w+x>>2]=e[v+x>>2]}}else{for(x=u-4|0;(x|0)>=0;x=x-4|0){e[w+x>>2]=e[v+x>>2]}}}function k(u,v,w){u=u|0;v=v|0;w=w|0;var x=0;for(;(x|0)<(u|0);x=x+4|0){e[w+x>>2]=v}}function l(u,v,w,x){u=u|0;v=v|0;w=w|0;x=x|0;var y=0,z=0,A=0,B=0,C=0;if((x|0)<=0)x=v;if((x|0)<(v|0))v=x;z=1;for(;(C|0)<(v|0);C=C+4|0){y=~e[u+C>>2];A=(y&65535)+z|0;B=(y>>>16)+(A>>>16)|0;e[w+C>>2]=B<<16|A&65535;z=B>>>16}for(;(C|0)<(x|0);C=C+4|0){e[w+C>>2]=z-1|0}return z|0}function m(u,v,w,x){u=u|0;v=v|0;w=w|0;x=x|0;var y=0,z=0,A=0;if((v|0)>(x|0)){for(A=v-4|0;(A|0)>=(x|0);A=A-4|0){if(e[u+A>>2]|0)return 1}}else{for(A=x-4|0;(A|0)>=(v|0);A=A-4|0){if(e[w+A>>2]|0)return-1}}for(;(A|0)>=0;A=A-4|0){y=e[u+A>>2]|0,z=e[w+A>>2]|0;if(y>>>0<z>>>0)return-1;if(y>>>0>z>>>0)return 1}return 0}function n(u,v){u=u|0;v=v|0;var w=0;for(w=v-4|0;(w|0)>=0;w=w-4|0){if(e[u+w>>2]|0)return w+4|0}return 0}function o(u,v,w,x,y,z){u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;z=z|0;var A=0,B=0,C=0,D=0,E=0,F=0;if((v|0)<(x|0)){D=u,u=w,w=D;D=v,v=x,x=D}if((z|0)<=0)z=v+4|0;if((z|0)<(x|0))v=x=z;for(;(F|0)<(x|0);F=F+4|0){A=e[u+F>>2]|0;B=e[w+F>>2]|0;D=((A&65535)+(B&65535)|0)+C|0;E=((A>>>16)+(B>>>16)|0)+(D>>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>>16}for(;(F|0)<(v|0);F=F+4|0){A=e[u+F>>2]|0;D=(A&65535)+C|0;E=(A>>>16)+(D>>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>>16}for(;(F|0)<(z|0);F=F+4|0){e[y+F>>2]=C|0;C=0}return C|0}function p(u,v,w,x,y,z){u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;z=z|0;var A=0,B=0,C=0,D=0,E=0,F=0;if((z|0)<=0)z=(v|0)>(x|0)?v+4|0:x+4|0;if((z|0)<(v|0))v=z;if((z|0)<(x|0))x=z;if((v|0)<(x|0)){for(;(F|0)<(v|0);F=F+4|0){A=e[u+F>>2]|0;B=e[w+F>>2]|0;D=((A&65535)-(B&65535)|0)+C|0;E=((A>>>16)-(B>>>16)|0)+(D>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>16}for(;(F|0)<(x|0);F=F+4|0){B=e[w+F>>2]|0;D=C-(B&65535)|0;E=(D>>16)-(B>>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>16}}else{for(;(F|0)<(x|0);F=F+4|0){A=e[u+F>>2]|0;B=e[w+F>>2]|0;D=((A&65535)-(B&65535)|0)+C|0;E=((A>>>16)-(B>>>16)|0)+(D>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>16}for(;(F|0)<(v|0);F=F+4|0){A=e[u+F>>2]|0;D=(A&65535)+C|0;E=(A>>>16)+(D>>16)|0;e[y+F>>2]=D&65535|E<<16;C=E>>16}}for(;(F|0)<(z|0);F=F+4|0){e[y+F>>2]=C|0}return C|0}function q(u,v,w,x,y,z){u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;z=z|0;var A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,$=0,_=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0;if((v|0)>(x|0)){ub=u,vb=v;u=w,v=x;w=ub,x=vb}xb=v+x|0;if((z|0)>(xb|0)|(z|0)<=0)z=xb;if((z|0)<(v|0))v=z;if((z|0)<(x|0))x=z;for(;(yb|0)<(v|0);yb=yb+32|0){zb=u+yb|0;I=e[(zb|0)>>2]|0,J=e[(zb|4)>>2]|0,K=e[(zb|8)>>2]|0,L=e[(zb|12)>>2]|0,M=e[(zb|16)>>2]|0,N=e[(zb|20)>>2]|0,O=e[(zb|24)>>2]|0,P=e[(zb|28)>>2]|0,A=I&65535,B=J&65535,C=K&65535,D=L&65535,E=M&65535,F=N&65535,G=O&65535,H=P&65535,I=I>>>16,J=J>>>16,K=K>>>16,L=L>>>16,M=M>>>16,N=N>>>16,O=O>>>16,P=P>>>16;mb=nb=ob=pb=qb=rb=sb=tb=0;for(Ab=0;(Ab|0)<(x|0);Ab=Ab+32|0){Bb=w+Ab|0;Cb=y+(yb+Ab|0)|0;Y=e[(Bb|0)>>2]|0,Z=e[(Bb|4)>>2]|0,$=e[(Bb|8)>>2]|0,_=e[(Bb|12)>>2]|0,ab=e[(Bb|16)>>2]|0,bb=e[(Bb|20)>>2]|0,cb=e[(Bb|24)>>2]|0,db=e[(Bb|28)>>2]|0,Q=Y&65535,R=Z&65535,S=$&65535,T=_&65535,U=ab&65535,V=bb&65535,W=cb&65535,X=db&65535,Y=Y>>>16,Z=Z>>>16,$=$>>>16,_=_>>>16,ab=ab>>>16,bb=bb>>>16,cb=cb>>>16,db=db>>>16;eb=e[(Cb|0)>>2]|0,fb=e[(Cb|4)>>2]|0,gb=e[(Cb|8)>>2]|0,hb=e[(Cb|12)>>2]|0,ib=e[(Cb|16)>>2]|0,jb=e[(Cb|20)>>2]|0,kb=e[(Cb|24)>>2]|0,lb=e[(Cb|28)>>2]|0;ub=((f(A,Q)|0)+(mb&65535)|0)+(eb&65535)|0;vb=((f(I,Q)|0)+(mb>>>16)|0)+(eb>>>16)|0;wb=((f(A,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;eb=wb<<16|ub&65535;ub=((f(A,R)|0)+(xb&65535)|0)+(fb&65535)|0;vb=((f(I,R)|0)+(xb>>>16)|0)+(fb>>>16)|0;wb=((f(A,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;fb=wb<<16|ub&65535;ub=((f(A,S)|0)+(xb&65535)|0)+(gb&65535)|0;vb=((f(I,S)|0)+(xb>>>16)|0)+(gb>>>16)|0;wb=((f(A,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;gb=wb<<16|ub&65535;ub=((f(A,T)|0)+(xb&65535)|0)+(hb&65535)|0;vb=((f(I,T)|0)+(xb>>>16)|0)+(hb>>>16)|0;wb=((f(A,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;hb=wb<<16|ub&65535;ub=((f(A,U)|0)+(xb&65535)|0)+(ib&65535)|0;vb=((f(I,U)|0)+(xb>>>16)|0)+(ib>>>16)|0;wb=((f(A,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;ib=wb<<16|ub&65535;ub=((f(A,V)|0)+(xb&65535)|0)+(jb&65535)|0;vb=((f(I,V)|0)+(xb>>>16)|0)+(jb>>>16)|0;wb=((f(A,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(A,W)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(I,W)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(A,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(A,X)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(I,X)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(A,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(I,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;mb=xb;ub=((f(B,Q)|0)+(nb&65535)|0)+(fb&65535)|0;vb=((f(J,Q)|0)+(nb>>>16)|0)+(fb>>>16)|0;wb=((f(B,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;fb=wb<<16|ub&65535;ub=((f(B,R)|0)+(xb&65535)|0)+(gb&65535)|0;vb=((f(J,R)|0)+(xb>>>16)|0)+(gb>>>16)|0;wb=((f(B,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;gb=wb<<16|ub&65535;ub=((f(B,S)|0)+(xb&65535)|0)+(hb&65535)|0;vb=((f(J,S)|0)+(xb>>>16)|0)+(hb>>>16)|0;wb=((f(B,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;hb=wb<<16|ub&65535;ub=((f(B,T)|0)+(xb&65535)|0)+(ib&65535)|0;vb=((f(J,T)|0)+(xb>>>16)|0)+(ib>>>16)|0;wb=((f(B,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;ib=wb<<16|ub&65535;ub=((f(B,U)|0)+(xb&65535)|0)+(jb&65535)|0;vb=((f(J,U)|0)+(xb>>>16)|0)+(jb>>>16)|0;wb=((f(B,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(B,V)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(J,V)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(B,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(B,W)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(J,W)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(B,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(B,X)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(J,X)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(B,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(J,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;nb=xb;ub=((f(C,Q)|0)+(ob&65535)|0)+(gb&65535)|0;vb=((f(K,Q)|0)+(ob>>>16)|0)+(gb>>>16)|0;wb=((f(C,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;gb=wb<<16|ub&65535;ub=((f(C,R)|0)+(xb&65535)|0)+(hb&65535)|0;vb=((f(K,R)|0)+(xb>>>16)|0)+(hb>>>16)|0;wb=((f(C,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;hb=wb<<16|ub&65535;ub=((f(C,S)|0)+(xb&65535)|0)+(ib&65535)|0;vb=((f(K,S)|0)+(xb>>>16)|0)+(ib>>>16)|0;wb=((f(C,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;ib=wb<<16|ub&65535;ub=((f(C,T)|0)+(xb&65535)|0)+(jb&65535)|0;vb=((f(K,T)|0)+(xb>>>16)|0)+(jb>>>16)|0;wb=((f(C,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(C,U)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(K,U)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(C,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(C,V)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(K,V)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(C,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(C,W)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(K,W)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(C,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(C,X)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(K,X)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(C,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(K,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ob=xb;ub=((f(D,Q)|0)+(pb&65535)|0)+(hb&65535)|0;vb=((f(L,Q)|0)+(pb>>>16)|0)+(hb>>>16)|0;wb=((f(D,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;hb=wb<<16|ub&65535;ub=((f(D,R)|0)+(xb&65535)|0)+(ib&65535)|0;vb=((f(L,R)|0)+(xb>>>16)|0)+(ib>>>16)|0;wb=((f(D,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;ib=wb<<16|ub&65535;ub=((f(D,S)|0)+(xb&65535)|0)+(jb&65535)|0;vb=((f(L,S)|0)+(xb>>>16)|0)+(jb>>>16)|0;wb=((f(D,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(D,T)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(L,T)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(D,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(D,U)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(L,U)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(D,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(D,V)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(L,V)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(D,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(D,W)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(L,W)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(D,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ub=((f(D,X)|0)+(xb&65535)|0)+(ob&65535)|0;vb=((f(L,X)|0)+(xb>>>16)|0)+(ob>>>16)|0;wb=((f(D,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(L,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;ob=wb<<16|ub&65535;pb=xb;ub=((f(E,Q)|0)+(qb&65535)|0)+(ib&65535)|0;vb=((f(M,Q)|0)+(qb>>>16)|0)+(ib>>>16)|0;wb=((f(E,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;ib=wb<<16|ub&65535;ub=((f(E,R)|0)+(xb&65535)|0)+(jb&65535)|0;vb=((f(M,R)|0)+(xb>>>16)|0)+(jb>>>16)|0;wb=((f(E,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(E,S)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(M,S)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(E,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(E,T)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(M,T)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(E,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(E,U)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(M,U)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(E,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(E,V)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(M,V)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(E,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ub=((f(E,W)|0)+(xb&65535)|0)+(ob&65535)|0;vb=((f(M,W)|0)+(xb>>>16)|0)+(ob>>>16)|0;wb=((f(E,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;ob=wb<<16|ub&65535;ub=((f(E,X)|0)+(xb&65535)|0)+(pb&65535)|0;vb=((f(M,X)|0)+(xb>>>16)|0)+(pb>>>16)|0;wb=((f(E,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(M,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;pb=wb<<16|ub&65535;qb=xb;ub=((f(F,Q)|0)+(rb&65535)|0)+(jb&65535)|0;vb=((f(N,Q)|0)+(rb>>>16)|0)+(jb>>>16)|0;wb=((f(F,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;jb=wb<<16|ub&65535;ub=((f(F,R)|0)+(xb&65535)|0)+(kb&65535)|0;vb=((f(N,R)|0)+(xb>>>16)|0)+(kb>>>16)|0;wb=((f(F,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(F,S)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(N,S)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(F,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(F,T)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(N,T)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(F,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(F,U)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(N,U)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(F,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ub=((f(F,V)|0)+(xb&65535)|0)+(ob&65535)|0;vb=((f(N,V)|0)+(xb>>>16)|0)+(ob>>>16)|0;wb=((f(F,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;ob=wb<<16|ub&65535;ub=((f(F,W)|0)+(xb&65535)|0)+(pb&65535)|0;vb=((f(N,W)|0)+(xb>>>16)|0)+(pb>>>16)|0;wb=((f(F,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;pb=wb<<16|ub&65535;ub=((f(F,X)|0)+(xb&65535)|0)+(qb&65535)|0;vb=((f(N,X)|0)+(xb>>>16)|0)+(qb>>>16)|0;wb=((f(F,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(N,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;qb=wb<<16|ub&65535;rb=xb;ub=((f(G,Q)|0)+(sb&65535)|0)+(kb&65535)|0;vb=((f(O,Q)|0)+(sb>>>16)|0)+(kb>>>16)|0;wb=((f(G,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;kb=wb<<16|ub&65535;ub=((f(G,R)|0)+(xb&65535)|0)+(lb&65535)|0;vb=((f(O,R)|0)+(xb>>>16)|0)+(lb>>>16)|0;wb=((f(G,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(G,S)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(O,S)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(G,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(G,T)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(O,T)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(G,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ub=((f(G,U)|0)+(xb&65535)|0)+(ob&65535)|0;vb=((f(O,U)|0)+(xb>>>16)|0)+(ob>>>16)|0;wb=((f(G,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;ob=wb<<16|ub&65535;ub=((f(G,V)|0)+(xb&65535)|0)+(pb&65535)|0;vb=((f(O,V)|0)+(xb>>>16)|0)+(pb>>>16)|0;wb=((f(G,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;pb=wb<<16|ub&65535;ub=((f(G,W)|0)+(xb&65535)|0)+(qb&65535)|0;vb=((f(O,W)|0)+(xb>>>16)|0)+(qb>>>16)|0;wb=((f(G,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;qb=wb<<16|ub&65535;ub=((f(G,X)|0)+(xb&65535)|0)+(rb&65535)|0;vb=((f(O,X)|0)+(xb>>>16)|0)+(rb>>>16)|0;wb=((f(G,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(O,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;rb=wb<<16|ub&65535;sb=xb;ub=((f(H,Q)|0)+(tb&65535)|0)+(lb&65535)|0;vb=((f(P,Q)|0)+(tb>>>16)|0)+(lb>>>16)|0;wb=((f(H,Y)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,Y)|0)+(vb>>>16)|0)+(wb>>>16)|0;lb=wb<<16|ub&65535;ub=((f(H,R)|0)+(xb&65535)|0)+(mb&65535)|0;vb=((f(P,R)|0)+(xb>>>16)|0)+(mb>>>16)|0;wb=((f(H,Z)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,Z)|0)+(vb>>>16)|0)+(wb>>>16)|0;mb=wb<<16|ub&65535;ub=((f(H,S)|0)+(xb&65535)|0)+(nb&65535)|0;vb=((f(P,S)|0)+(xb>>>16)|0)+(nb>>>16)|0;wb=((f(H,$)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,$)|0)+(vb>>>16)|0)+(wb>>>16)|0;nb=wb<<16|ub&65535;ub=((f(H,T)|0)+(xb&65535)|0)+(ob&65535)|0;vb=((f(P,T)|0)+(xb>>>16)|0)+(ob>>>16)|0;wb=((f(H,_)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,_)|0)+(vb>>>16)|0)+(wb>>>16)|0;ob=wb<<16|ub&65535;ub=((f(H,U)|0)+(xb&65535)|0)+(pb&65535)|0;vb=((f(P,U)|0)+(xb>>>16)|0)+(pb>>>16)|0;wb=((f(H,ab)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,ab)|0)+(vb>>>16)|0)+(wb>>>16)|0;pb=wb<<16|ub&65535;ub=((f(H,V)|0)+(xb&65535)|0)+(qb&65535)|0;vb=((f(P,V)|0)+(xb>>>16)|0)+(qb>>>16)|0;wb=((f(H,bb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,bb)|0)+(vb>>>16)|0)+(wb>>>16)|0;qb=wb<<16|ub&65535;ub=((f(H,W)|0)+(xb&65535)|0)+(rb&65535)|0;vb=((f(P,W)|0)+(xb>>>16)|0)+(rb>>>16)|0;wb=((f(H,cb)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,cb)|0)+(vb>>>16)|0)+(wb>>>16)|0;rb=wb<<16|ub&65535;ub=((f(H,X)|0)+(xb&65535)|0)+(sb&65535)|0;vb=((f(P,X)|0)+(xb>>>16)|0)+(sb>>>16)|0;wb=((f(H,db)|0)+(vb&65535)|0)+(ub>>>16)|0;xb=((f(P,db)|0)+(vb>>>16)|0)+(wb>>>16)|0;sb=wb<<16|ub&65535;tb=xb;e[(Cb|0)>>2]=eb,e[(Cb|4)>>2]=fb,e[(Cb|8)>>2]=gb,e[(Cb|12)>>2]=hb,e[(Cb|16)>>2]=ib,e[(Cb|20)>>2]=jb,e[(Cb|24)>>2]=kb,e[(Cb|28)>>2]=lb}Cb=y+(yb+Ab|0)|0;e[(Cb|0)>>2]=mb,e[(Cb|4)>>2]=nb,e[(Cb|8)>>2]=ob,e[(Cb|12)>>2]=pb,e[(Cb|16)>>2]=qb,e[(Cb|20)>>2]=rb,e[(Cb|24)>>2]=sb,e[(Cb|28)>>2]=tb}}function r(u,v,w){u=u|0;v=v|0;w=w|0;var x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,$=0,_=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0;for(;(Bb|0)<(v|0);Bb=Bb+4|0){Gb=w+(Bb<<1)|0;F=e[u+Bb>>2]|0,x=F&65535,F=F>>>16;rb=f(x,x)|0;sb=(f(x,F)|0)+(rb>>>17)|0;tb=(f(F,F)|0)+(sb>>>15)|0;e[Gb>>2]=sb<<17|rb&131071;e[(Gb|4)>>2]=tb}for(Ab=0;(Ab|0)<(v|0);Ab=Ab+8|0){Eb=u+Ab|0,Gb=w+(Ab<<1)|0;F=e[Eb>>2]|0,x=F&65535,F=F>>>16;V=e[(Eb|4)>>2]|0,N=V&65535,V=V>>>16;rb=f(x,N)|0;sb=(f(x,V)|0)+(rb>>>16)|0;tb=(f(F,N)|0)+(sb&65535)|0;wb=((f(F,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;xb=e[(Gb|4)>>2]|0;rb=(xb&65535)+((rb&65535)<<1)|0;tb=((xb>>>16)+((tb&65535)<<1)|0)+(rb>>>16)|0;e[(Gb|4)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|8)>>2]|0;rb=((xb&65535)+((wb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(wb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|8)>>2]=tb<<16|rb&65535;ub=tb>>>16;if(ub){xb=e[(Gb|12)>>2]|0;rb=(xb&65535)+ub|0;tb=(xb>>>16)+(rb>>>16)|0;e[(Gb|12)>>2]=tb<<16|rb&65535}}for(Ab=0;(Ab|0)<(v|0);Ab=Ab+16|0){Eb=u+Ab|0,Gb=w+(Ab<<1)|0;F=e[Eb>>2]|0,x=F&65535,F=F>>>16,G=e[(Eb|4)>>2]|0,y=G&65535,G=G>>>16;V=e[(Eb|8)>>2]|0,N=V&65535,V=V>>>16,W=e[(Eb|12)>>2]|0,O=W&65535,W=W>>>16;rb=f(x,N)|0;sb=f(F,N)|0;tb=((f(x,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;bb=tb<<16|rb&65535;rb=(f(x,O)|0)+(wb&65535)|0;sb=(f(F,O)|0)+(wb>>>16)|0;tb=((f(x,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;db=wb;rb=(f(y,N)|0)+(cb&65535)|0;sb=(f(G,N)|0)+(cb>>>16)|0;tb=((f(y,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;rb=((f(y,O)|0)+(db&65535)|0)+(wb&65535)|0;sb=((f(G,O)|0)+(db>>>16)|0)+(wb>>>16)|0;tb=((f(y,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;eb=wb;xb=e[(Gb|8)>>2]|0;rb=(xb&65535)+((bb&65535)<<1)|0;tb=((xb>>>16)+(bb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|8)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|12)>>2]|0;rb=((xb&65535)+((cb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(cb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|12)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|16)>>2]|0;rb=((xb&65535)+((db&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(db>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|16)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|20)>>2]|0;rb=((xb&65535)+((eb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(eb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|20)>>2]=tb<<16|rb&65535;ub=tb>>>16;for(Db=24;!!ub&(Db|0)<32;Db=Db+4|0){xb=e[(Gb|Db)>>2]|0;rb=(xb&65535)+ub|0;tb=(xb>>>16)+(rb>>>16)|0;e[(Gb|Db)>>2]=tb<<16|rb&65535;ub=tb>>>16}}for(Ab=0;(Ab|0)<(v|0);Ab=Ab+32|0){Eb=u+Ab|0,Gb=w+(Ab<<1)|0;F=e[Eb>>2]|0,x=F&65535,F=F>>>16,G=e[(Eb|4)>>2]|0,y=G&65535,G=G>>>16,H=e[(Eb|8)>>2]|0,z=H&65535,H=H>>>16,I=e[(Eb|12)>>2]|0,A=I&65535,I=I>>>16;V=e[(Eb|16)>>2]|0,N=V&65535,V=V>>>16,W=e[(Eb|20)>>2]|0,O=W&65535,W=W>>>16,X=e[(Eb|24)>>2]|0,P=X&65535,X=X>>>16,Y=e[(Eb|28)>>2]|0,Q=Y&65535,Y=Y>>>16;rb=f(x,N)|0;sb=f(F,N)|0;tb=((f(x,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;bb=tb<<16|rb&65535;rb=(f(x,O)|0)+(wb&65535)|0;sb=(f(F,O)|0)+(wb>>>16)|0;tb=((f(x,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;rb=(f(x,P)|0)+(wb&65535)|0;sb=(f(F,P)|0)+(wb>>>16)|0;tb=((f(x,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=(f(x,Q)|0)+(wb&65535)|0;sb=(f(F,Q)|0)+(wb>>>16)|0;tb=((f(x,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;fb=wb;rb=(f(y,N)|0)+(cb&65535)|0;sb=(f(G,N)|0)+(cb>>>16)|0;tb=((f(y,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;rb=((f(y,O)|0)+(db&65535)|0)+(wb&65535)|0;sb=((f(G,O)|0)+(db>>>16)|0)+(wb>>>16)|0;tb=((f(y,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=((f(y,P)|0)+(eb&65535)|0)+(wb&65535)|0;sb=((f(G,P)|0)+(eb>>>16)|0)+(wb>>>16)|0;tb=((f(y,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(y,Q)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(G,Q)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(y,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;gb=wb;rb=(f(z,N)|0)+(db&65535)|0;sb=(f(H,N)|0)+(db>>>16)|0;tb=((f(z,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=((f(z,O)|0)+(eb&65535)|0)+(wb&65535)|0;sb=((f(H,O)|0)+(eb>>>16)|0)+(wb>>>16)|0;tb=((f(z,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(z,P)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(H,P)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(z,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(z,Q)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(H,Q)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(z,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;hb=wb;rb=(f(A,N)|0)+(eb&65535)|0;sb=(f(I,N)|0)+(eb>>>16)|0;tb=((f(A,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(A,O)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(I,O)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(A,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(A,P)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(I,P)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(A,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(A,Q)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(I,Q)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(A,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;ib=wb;xb=e[(Gb|16)>>2]|0;rb=(xb&65535)+((bb&65535)<<1)|0;tb=((xb>>>16)+(bb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|16)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|20)>>2]|0;rb=((xb&65535)+((cb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(cb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|20)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|24)>>2]|0;rb=((xb&65535)+((db&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(db>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|24)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[(Gb|28)>>2]|0;rb=((xb&65535)+((eb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(eb>>>16<<1)|0)+(rb>>>16)|0;e[(Gb|28)>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[Gb+32>>2]|0;rb=((xb&65535)+((fb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(fb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+32>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[Gb+36>>2]|0;rb=((xb&65535)+((gb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(gb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+36>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[Gb+40>>2]|0;rb=((xb&65535)+((hb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(hb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+40>>2]=tb<<16|rb&65535;ub=tb>>>16;xb=e[Gb+44>>2]|0;rb=((xb&65535)+((ib&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(ib>>>16<<1)|0)+(rb>>>16)|0;e[Gb+44>>2]=tb<<16|rb&65535;ub=tb>>>16;for(Db=48;!!ub&(Db|0)<64;Db=Db+4|0){xb=e[Gb+Db>>2]|0;rb=(xb&65535)+ub|0;tb=(xb>>>16)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16}}for(yb=32;(yb|0)<(v|0);yb=yb<<1){zb=yb<<1;for(Ab=0;(Ab|0)<(v|0);Ab=Ab+zb|0){Gb=w+(Ab<<1)|0;vb=0;for(Bb=0;(Bb|0)<(yb|0);Bb=Bb+32|0){Eb=(u+Ab|0)+Bb|0;F=e[Eb>>2]|0,x=F&65535,F=F>>>16,G=e[(Eb|4)>>2]|0,y=G&65535,G=G>>>16,H=e[(Eb|8)>>2]|0,z=H&65535,H=H>>>16,I=e[(Eb|12)>>2]|0,A=I&65535,I=I>>>16,J=e[(Eb|16)>>2]|0,B=J&65535,J=J>>>16,K=e[(Eb|20)>>2]|0,C=K&65535,K=K>>>16,L=e[(Eb|24)>>2]|0,D=L&65535,L=L>>>16,M=e[(Eb|28)>>2]|0,E=M&65535,M=M>>>16;jb=kb=lb=mb=nb=ob=pb=qb=ub=0;for(Cb=0;(Cb|0)<(yb|0);Cb=Cb+32|0){Fb=((u+Ab|0)+yb|0)+Cb|0;V=e[Fb>>2]|0,N=V&65535,V=V>>>16,W=e[(Fb|4)>>2]|0,O=W&65535,W=W>>>16,X=e[(Fb|8)>>2]|0,P=X&65535,X=X>>>16,Y=e[(Fb|12)>>2]|0,Q=Y&65535,Y=Y>>>16,Z=e[(Fb|16)>>2]|0,R=Z&65535,Z=Z>>>16,$=e[(Fb|20)>>2]|0,S=$&65535,$=$>>>16,_=e[(Fb|24)>>2]|0,T=_&65535,_=_>>>16,ab=e[(Fb|28)>>2]|0,U=ab&65535,ab=ab>>>16;bb=cb=db=eb=fb=gb=hb=ib=0;rb=((f(x,N)|0)+(bb&65535)|0)+(jb&65535)|0;sb=((f(F,N)|0)+(bb>>>16)|0)+(jb>>>16)|0;tb=((f(x,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;bb=tb<<16|rb&65535;rb=((f(x,O)|0)+(cb&65535)|0)+(wb&65535)|0;sb=((f(F,O)|0)+(cb>>>16)|0)+(wb>>>16)|0;tb=((f(x,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;rb=((f(x,P)|0)+(db&65535)|0)+(wb&65535)|0;sb=((f(F,P)|0)+(db>>>16)|0)+(wb>>>16)|0;tb=((f(x,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=((f(x,Q)|0)+(eb&65535)|0)+(wb&65535)|0;sb=((f(F,Q)|0)+(eb>>>16)|0)+(wb>>>16)|0;tb=((f(x,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(x,R)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(F,R)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(x,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(x,S)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(F,S)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(x,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(x,T)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(F,T)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(x,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(F,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(x,U)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(F,U)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(x,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;
wb=((f(F,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;jb=wb;rb=((f(y,N)|0)+(cb&65535)|0)+(kb&65535)|0;sb=((f(G,N)|0)+(cb>>>16)|0)+(kb>>>16)|0;tb=((f(y,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;cb=tb<<16|rb&65535;rb=((f(y,O)|0)+(db&65535)|0)+(wb&65535)|0;sb=((f(G,O)|0)+(db>>>16)|0)+(wb>>>16)|0;tb=((f(y,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=((f(y,P)|0)+(eb&65535)|0)+(wb&65535)|0;sb=((f(G,P)|0)+(eb>>>16)|0)+(wb>>>16)|0;tb=((f(y,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(y,Q)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(G,Q)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(y,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(y,R)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(G,R)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(y,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(y,S)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(G,S)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(y,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(y,T)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(G,T)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(y,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(y,U)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(G,U)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(y,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(G,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;kb=wb;rb=((f(z,N)|0)+(db&65535)|0)+(lb&65535)|0;sb=((f(H,N)|0)+(db>>>16)|0)+(lb>>>16)|0;tb=((f(z,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;db=tb<<16|rb&65535;rb=((f(z,O)|0)+(eb&65535)|0)+(wb&65535)|0;sb=((f(H,O)|0)+(eb>>>16)|0)+(wb>>>16)|0;tb=((f(z,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(z,P)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(H,P)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(z,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(z,Q)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(H,Q)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(z,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(z,R)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(H,R)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(z,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(z,S)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(H,S)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(z,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(z,T)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(H,T)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(z,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(z,U)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(H,U)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(z,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(H,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;lb=wb;rb=((f(A,N)|0)+(eb&65535)|0)+(mb&65535)|0;sb=((f(I,N)|0)+(eb>>>16)|0)+(mb>>>16)|0;tb=((f(A,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;eb=tb<<16|rb&65535;rb=((f(A,O)|0)+(fb&65535)|0)+(wb&65535)|0;sb=((f(I,O)|0)+(fb>>>16)|0)+(wb>>>16)|0;tb=((f(A,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(A,P)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(I,P)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(A,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(A,Q)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(I,Q)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(A,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(A,R)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(I,R)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(A,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(A,S)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(I,S)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(A,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(A,T)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(I,T)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(A,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;rb=((f(A,U)|0)+(lb&65535)|0)+(wb&65535)|0;sb=((f(I,U)|0)+(lb>>>16)|0)+(wb>>>16)|0;tb=((f(A,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(I,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;lb=tb<<16|rb&65535;mb=wb;rb=((f(B,N)|0)+(fb&65535)|0)+(nb&65535)|0;sb=((f(J,N)|0)+(fb>>>16)|0)+(nb>>>16)|0;tb=((f(B,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;fb=tb<<16|rb&65535;rb=((f(B,O)|0)+(gb&65535)|0)+(wb&65535)|0;sb=((f(J,O)|0)+(gb>>>16)|0)+(wb>>>16)|0;tb=((f(B,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(B,P)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(J,P)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(B,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(B,Q)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(J,Q)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(B,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(B,R)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(J,R)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(B,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(B,S)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(J,S)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(B,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;rb=((f(B,T)|0)+(lb&65535)|0)+(wb&65535)|0;sb=((f(J,T)|0)+(lb>>>16)|0)+(wb>>>16)|0;tb=((f(B,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;lb=tb<<16|rb&65535;rb=((f(B,U)|0)+(mb&65535)|0)+(wb&65535)|0;sb=((f(J,U)|0)+(mb>>>16)|0)+(wb>>>16)|0;tb=((f(B,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(J,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;mb=tb<<16|rb&65535;nb=wb;rb=((f(C,N)|0)+(gb&65535)|0)+(ob&65535)|0;sb=((f(K,N)|0)+(gb>>>16)|0)+(ob>>>16)|0;tb=((f(C,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;gb=tb<<16|rb&65535;rb=((f(C,O)|0)+(hb&65535)|0)+(wb&65535)|0;sb=((f(K,O)|0)+(hb>>>16)|0)+(wb>>>16)|0;tb=((f(C,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(C,P)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(K,P)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(C,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(C,Q)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(K,Q)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(C,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(C,R)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(K,R)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(C,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;rb=((f(C,S)|0)+(lb&65535)|0)+(wb&65535)|0;sb=((f(K,S)|0)+(lb>>>16)|0)+(wb>>>16)|0;tb=((f(C,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;lb=tb<<16|rb&65535;rb=((f(C,T)|0)+(mb&65535)|0)+(wb&65535)|0;sb=((f(K,T)|0)+(mb>>>16)|0)+(wb>>>16)|0;tb=((f(C,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;mb=tb<<16|rb&65535;rb=((f(C,U)|0)+(nb&65535)|0)+(wb&65535)|0;sb=((f(K,U)|0)+(nb>>>16)|0)+(wb>>>16)|0;tb=((f(C,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(K,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;nb=tb<<16|rb&65535;ob=wb;rb=((f(D,N)|0)+(hb&65535)|0)+(pb&65535)|0;sb=((f(L,N)|0)+(hb>>>16)|0)+(pb>>>16)|0;tb=((f(D,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;hb=tb<<16|rb&65535;rb=((f(D,O)|0)+(ib&65535)|0)+(wb&65535)|0;sb=((f(L,O)|0)+(ib>>>16)|0)+(wb>>>16)|0;tb=((f(D,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(D,P)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(L,P)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(D,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(D,Q)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(L,Q)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(D,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;rb=((f(D,R)|0)+(lb&65535)|0)+(wb&65535)|0;sb=((f(L,R)|0)+(lb>>>16)|0)+(wb>>>16)|0;tb=((f(D,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;lb=tb<<16|rb&65535;rb=((f(D,S)|0)+(mb&65535)|0)+(wb&65535)|0;sb=((f(L,S)|0)+(mb>>>16)|0)+(wb>>>16)|0;tb=((f(D,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;mb=tb<<16|rb&65535;rb=((f(D,T)|0)+(nb&65535)|0)+(wb&65535)|0;sb=((f(L,T)|0)+(nb>>>16)|0)+(wb>>>16)|0;tb=((f(D,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;nb=tb<<16|rb&65535;rb=((f(D,U)|0)+(ob&65535)|0)+(wb&65535)|0;sb=((f(L,U)|0)+(ob>>>16)|0)+(wb>>>16)|0;tb=((f(D,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(L,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;ob=tb<<16|rb&65535;pb=wb;rb=((f(E,N)|0)+(ib&65535)|0)+(qb&65535)|0;sb=((f(M,N)|0)+(ib>>>16)|0)+(qb>>>16)|0;tb=((f(E,V)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,V)|0)+(sb>>>16)|0)+(tb>>>16)|0;ib=tb<<16|rb&65535;rb=((f(E,O)|0)+(jb&65535)|0)+(wb&65535)|0;sb=((f(M,O)|0)+(jb>>>16)|0)+(wb>>>16)|0;tb=((f(E,W)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,W)|0)+(sb>>>16)|0)+(tb>>>16)|0;jb=tb<<16|rb&65535;rb=((f(E,P)|0)+(kb&65535)|0)+(wb&65535)|0;sb=((f(M,P)|0)+(kb>>>16)|0)+(wb>>>16)|0;tb=((f(E,X)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,X)|0)+(sb>>>16)|0)+(tb>>>16)|0;kb=tb<<16|rb&65535;rb=((f(E,Q)|0)+(lb&65535)|0)+(wb&65535)|0;sb=((f(M,Q)|0)+(lb>>>16)|0)+(wb>>>16)|0;tb=((f(E,Y)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,Y)|0)+(sb>>>16)|0)+(tb>>>16)|0;lb=tb<<16|rb&65535;rb=((f(E,R)|0)+(mb&65535)|0)+(wb&65535)|0;sb=((f(M,R)|0)+(mb>>>16)|0)+(wb>>>16)|0;tb=((f(E,Z)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,Z)|0)+(sb>>>16)|0)+(tb>>>16)|0;mb=tb<<16|rb&65535;rb=((f(E,S)|0)+(nb&65535)|0)+(wb&65535)|0;sb=((f(M,S)|0)+(nb>>>16)|0)+(wb>>>16)|0;tb=((f(E,$)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,$)|0)+(sb>>>16)|0)+(tb>>>16)|0;nb=tb<<16|rb&65535;rb=((f(E,T)|0)+(ob&65535)|0)+(wb&65535)|0;sb=((f(M,T)|0)+(ob>>>16)|0)+(wb>>>16)|0;tb=((f(E,_)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,_)|0)+(sb>>>16)|0)+(tb>>>16)|0;ob=tb<<16|rb&65535;rb=((f(E,U)|0)+(pb&65535)|0)+(wb&65535)|0;sb=((f(M,U)|0)+(pb>>>16)|0)+(wb>>>16)|0;tb=((f(E,ab)|0)+(sb&65535)|0)+(rb>>>16)|0;wb=((f(M,ab)|0)+(sb>>>16)|0)+(tb>>>16)|0;pb=tb<<16|rb&65535;qb=wb;Db=yb+(Bb+Cb|0)|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((bb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(bb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((cb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(cb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((db&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(db>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((eb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(eb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((fb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(fb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((gb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(gb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((hb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(hb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((ib&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(ib>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16}Db=yb+(Bb+Cb|0)|0;xb=e[Gb+Db>>2]|0;rb=(((xb&65535)+((jb&65535)<<1)|0)+ub|0)+vb|0;tb=((xb>>>16)+(jb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((kb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(kb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((lb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(lb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((mb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(mb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((nb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(nb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((ob&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(ob>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((pb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(pb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;ub=tb>>>16;Db=Db+4|0;xb=e[Gb+Db>>2]|0;rb=((xb&65535)+((qb&65535)<<1)|0)+ub|0;tb=((xb>>>16)+(qb>>>16<<1)|0)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;vb=tb>>>16}for(Db=Db+4|0;!!vb&(Db|0)<zb<<1;Db=Db+4|0){xb=e[Gb+Db>>2]|0;rb=(xb&65535)+vb|0;tb=(xb>>>16)+(rb>>>16)|0;e[Gb+Db>>2]=tb<<16|rb&65535;vb=tb>>>16}}}}function s(u,v,w,x,y,z){u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;z=z|0;var A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;j(v,u,y);for(Q=v-1&-4;(Q|0)>=0;Q=Q-4|0){A=e[u+Q>>2]|0;if(A){v=Q;break}}for(Q=x-1&-4;(Q|0)>=0;Q=Q-4|0){B=e[w+Q>>2]|0;if(B){x=Q;break}}while((B&2147483648)==0){B=B<<1;C=C+1|0}E=e[u+v>>2]|0;if(C)D=E>>>(32-C|0);for(Q=v-4|0;(Q|0)>=0;Q=Q-4|0){A=e[u+Q>>2]|0;e[y+Q+4>>2]=E<<C|(C?A>>>(32-C|0):0);E=A}e[y>>2]=E<<C;if(C){F=e[w+x>>2]|0;for(Q=x-4|0;(Q|0)>=0;Q=Q-4|0){B=e[w+Q>>2]|0;e[w+Q+4>>2]=F<<C|B>>>(32-C|0);F=B}e[w>>2]=F<<C}F=e[w+x>>2]|0;G=F>>>16,H=F&65535;for(Q=v;(Q|0)>=(x|0);Q=Q-4|0){R=Q-x|0;E=e[y+Q>>2]|0;I=(D>>>0)/(G>>>0)|0,K=(D>>>0)%(G>>>0)|0,M=f(I,H)|0;while((I|0)==65536|M>>>0>(K<<16|E>>>16)>>>0){I=I-1|0,K=K+G|0,M=M-H|0;if((K|0)>=65536)break}O=0,P=0;for(S=0;(S|0)<=(x|0);S=S+4|0){B=e[w+S>>2]|0;M=(f(I,B&65535)|0)+(O>>>16)|0;N=(f(I,B>>>16)|0)+(M>>>16)|0;B=O&65535|M<<16;O=N;A=e[y+R+S>>2]|0;M=((A&65535)-(B&65535)|0)+P|0;N=((A>>>16)-(B>>>16)|0)+(M>>16)|0;e[y+R+S>>2]=N<<16|M&65535;P=N>>16}M=((D&65535)-(O&65535)|0)+P|0;N=((D>>>16)-(O>>>16)|0)+(M>>16)|0;e[y+R+S>>2]=D=N<<16|M&65535;P=N>>16;if(P){I=I+1|0,K=K-G|0;P=0;for(S=0;(S|0)<=(x|0);S=S+4|0){B=e[w+S>>2]|0;A=e[y+R+S>>2]|0;M=((A&65535)+(B&65535)|0)+P|0;N=((A>>>16)+(B>>>16)|0)+(M>>>16)|0;e[y+R+S>>2]=N<<16|M&65535;P=N>>>16}e[y+R+S>>2]=D=D+P|0}E=e[y+Q>>2]|0;A=D<<16|E>>>16;J=(A>>>0)/(G>>>0)|0,L=(A>>>0)%(G>>>0)|0,M=f(J,H)|0;while((J|0)==65536|M>>>0>(L<<16|E&65535)>>>0){J=J-1|0,L=L+G|0,M=M-H|0;if((L|0)>=65536)break}O=0,P=0;for(S=0;(S|0)<=(x|0);S=S+4|0){B=e[w+S>>2]|0;M=(f(J,B&65535)|0)+(O&65535)|0;N=((f(J,B>>>16)|0)+(M>>>16)|0)+(O>>>16)|0;B=M&65535|N<<16;O=N>>>16;A=e[y+R+S>>2]|0;M=((A&65535)-(B&65535)|0)+P|0;N=((A>>>16)-(B>>>16)|0)+(M>>16)|0;P=N>>16;e[y+R+S>>2]=N<<16|M&65535}M=((D&65535)-(O&65535)|0)+P|0;N=((D>>>16)-(O>>>16)|0)+(M>>16)|0;e[y+R+S>>2]=D=N<<16|M&65535;P=N>>16;if(P){J=J+1|0,L=L+G|0;P=0;for(S=0;(S|0)<=(x|0);S=S+4|0){B=e[w+S>>2]|0;A=e[y+R+S>>2]|0;M=((A&65535)+(B&65535)|0)+P|0;N=((A>>>16)+(B>>>16)|0)+(M>>>16)|0;P=N>>>16;e[y+R+S>>2]=M&65535|N<<16}e[y+R+S>>2]=D+P|0}e[z+R>>2]=I<<16|J;D=e[y+Q>>2]|0}if(C){E=e[y>>2]|0;for(Q=4;(Q|0)<=(x|0);Q=Q+4|0){A=e[y+Q>>2]|0;e[y+Q-4>>2]=A<<(32-C|0)|E>>>C;E=A}e[y+x>>2]=E>>>C}}function t(u,v,w,x,y,z){u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;z=z|0;var A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;A=h(x<<1)|0;k(x<<1,0,A);j(v,u,A);for(M=0;(M|0)<(x|0);M=M+4|0){B=e[A+M>>2]|0;D=f(B,y)|0,E=D&65535,D=D>>>16;L=0;for(N=0;(N|0)<(x|0);N=N+4|0){O=M+N|0;G=e[w+N>>2]|0,F=G&65535,G=G>>>16;K=e[A+O>>2]|0;H=((f(E,F)|0)+(L&65535)|0)+(K&65535)|0;I=((f(E,G)|0)+(L>>>16)|0)+(K>>>16)|0;J=((f(D,F)|0)+(I&65535)|0)+(H>>>16)|0;L=((f(D,G)|0)+(J>>>16)|0)+(I>>>16)|0;K=J<<16|H&65535;e[A+O>>2]=K}O=M+N|0;K=e[A+O>>2]|0;H=((K&65535)+(L&65535)|0)+C|0;I=((K>>>16)+(L>>>16)|0)+(H>>>16)|0;e[A+O>>2]=I<<16|H&65535;C=I>>>16}j(x,A+x|0,z);i(x<<1);if(C|(m(w,x,z,x)|0)<=0){p(z,x,w,x,z,x)|0}}return{sreset:g,salloc:h,sfree:i,z:k,tst:n,neg:l,cmp:m,add:o,sub:p,mul:q,sqr:r,div:s,mredc:t}}function cc(a){return a instanceof dc}function dc(a){var b=Id,d=0,e=0;if(k(a)&&(a=c(a)),l(a)&&(a=new Uint8Array(a)),void 0===a);else if(j(a)){var f=Math.abs(a);f>4294967295?(b=new Uint32Array(2),b[0]=0|f,b[1]=f/4294967296|0,d=52):f>0?(b=new Uint32Array(1),b[0]=f,d=32):(b=Id,d=0),e=0>a?-1:1}else if(m(a)){if(d=8*a.length,!d)return Kd;b=new Uint32Array(d+31>>5);for(var g=a.length-4;g>=0;g-=4)b[a.length-4-g>>2]=a[g]<<24|a[g+1]<<16|a[g+2]<<8|a[g+3];-3===g?b[b.length-1]=a[0]:-2===g?b[b.length-1]=a[0]<<8|a[1]:-1===g&&(b[b.length-1]=a[0]<<16|a[1]<<8|a[2]),e=1}else{if("object"!=typeof a||null===a)throw new TypeError("number is of unexpected type");b=new Uint32Array(a.limbs),d=a.bitLength,e=a.sign}this.limbs=b,this.bitLength=d,this.sign=e}function ec(a){a=a||16;var b=this.limbs,c=this.bitLength,d="";if(16!==a)throw new p("bad radix");for(var e=(c+31>>5)-1;e>=0;e--){var f=b[e].toString(16);d+="00000000".substr(f.length),d+=f}return d=d.replace(/^0+/,""),d.length||(d="0"),this.sign<0&&(d="-"+d),d}function fc(){var a=this.bitLength,b=this.limbs;if(0===a)return new Uint8Array(0);for(var c=a+7>>3,d=new Uint8Array(c),e=0;c>e;e++){var f=c-e-1;d[e]=b[f>>2]>>((3&f)<<3)}return d}function gc(){var a=this.limbs,b=this.bitLength,c=this.sign;if(!c)return 0;if(32>=b)return c*(a[0]>>>0);if(52>=b)return c*(4294967296*(a[1]>>>0)+(a[0]>>>0));var d,e,f=0;for(d=a.length-1;d>=0;d--)if(0!==(e=a[d])){for(;0===(e<<f&2147483648);)f++;break}return 0===d?c*(a[0]>>>0):c*(1048576*((a[d]<<f|(f?a[d-1]>>>32-f:0))>>>0)+((a[d-1]<<f|(f&&d>1?a[d-2]>>>32-f:0))>>>12))*Math.pow(2,32*d-f-52)}function hc(a){var b=this.limbs,c=this.bitLength;if(a>=c)return this;var d=new dc,e=a+31>>5,f=a%32;return d.limbs=new Uint32Array(b.subarray(0,e)),d.bitLength=a,d.sign=this.sign,f&&(d.limbs[e-1]&=-1>>>32-f),d}function ic(a,b){if(!j(a))throw new TypeError("TODO");if(void 0!==b&&!j(b))throw new TypeError("TODO");var c=this.limbs,d=this.bitLength;if(0>a)throw new RangeError("TODO");if(a>=d)return Kd;(void 0===b||b>d-a)&&(b=d-a);var e,f=new dc,g=a>>5,h=a+b+31>>5,i=b+31>>5,k=a%32,l=b%32;if(e=new Uint32Array(i),k){for(var m=0;h-g-1>m;m++)e[m]=c[g+m]>>>k|c[g+m+1]<<32-k;e[m]=c[g+m]>>>k}else e.set(c.subarray(g,h));return l&&(e[i-1]&=-1>>>32-l),f.limbs=e,f.bitLength=b,f.sign=this.sign,f}function jc(){var a=new dc;return a.limbs=this.limbs,a.bitLength=this.bitLength,a.sign=-1*this.sign,a}function kc(a){cc(a)||(a=new dc(a));var b=this.limbs,c=b.length,d=a.limbs,e=d.length,f=0;return this.sign<a.sign?-1:this.sign>a.sign?1:(Gd.set(b,0),Gd.set(d,c),f=Hd.cmp(0,c<<2,c<<2,e<<2),f*this.sign)}function lc(a){if(cc(a)||(a=new dc(a)),!this.sign)return a;if(!a.sign)return this;var b,c,d,e,f=this.bitLength,g=this.limbs,h=g.length,i=this.sign,j=a.bitLength,k=a.limbs,l=k.length,m=a.sign,n=new dc;b=(f>j?f:j)+1,c=b+31>>5,Hd.sreset();var o=Hd.salloc(h<<2),p=Hd.salloc(l<<2),q=Hd.salloc(c<<2);return Hd.z(q-o+(c<<2),0,o),Gd.set(g,o>>2),Gd.set(k,p>>2),i*m>0?(Hd.add(o,h<<2,p,l<<2,q,c<<2),d=i):i>m?(e=Hd.sub(o,h<<2,p,l<<2,q,c<<2),d=e?m:i):(e=Hd.sub(p,l<<2,o,h<<2,q,c<<2),d=e?i:m),e&&Hd.neg(q,c<<2,q,c<<2),0===Hd.tst(q,c<<2)?Kd:(n.limbs=new Uint32Array(Gd.subarray(q>>2,(q>>2)+c)),n.bitLength=b,n.sign=d,n)}function mc(a){return cc(a)||(a=new dc(a)),this.add(a.negate())}function nc(a){if(cc(a)||(a=new dc(a)),!this.sign||!a.sign)return Kd;var b,c,d=this.bitLength,e=this.limbs,f=e.length,g=a.bitLength,h=a.limbs,i=h.length,j=new dc;b=d+g,c=b+31>>5,Hd.sreset();var k=Hd.salloc(f<<2),l=Hd.salloc(i<<2),m=Hd.salloc(c<<2);return Hd.z(m-k+(c<<2),0,k),Gd.set(e,k>>2),Gd.set(h,l>>2),Hd.mul(k,f<<2,l,i<<2,m,c<<2),j.limbs=new Uint32Array(Gd.subarray(m>>2,(m>>2)+c)),j.sign=this.sign*a.sign,j.bitLength=b,j}function oc(){if(!this.sign)return Kd;var a,b,c=this.bitLength,d=this.limbs,e=d.length,f=new dc;a=c<<1,b=a+31>>5,Hd.sreset();var g=Hd.salloc(e<<2),h=Hd.salloc(b<<2);return Hd.z(h-g+(b<<2),0,g),Gd.set(d,g>>2),Hd.sqr(g,e<<2,h),f.limbs=new Uint32Array(Gd.subarray(h>>2,(h>>2)+b)),f.bitLength=a,f.sign=1,f}function pc(a){cc(a)||(a=new dc(a));var b,c,d=this.bitLength,e=this.limbs,f=e.length,g=a.bitLength,h=a.limbs,i=h.length,j=Kd,k=Kd;Hd.sreset();var l=Hd.salloc(f<<2),m=Hd.salloc(i<<2),n=Hd.salloc(i<<2),o=Hd.salloc(f<<2);return Hd.z(o-l+(f<<2),0,l),Gd.set(e,l>>2),Gd.set(h,m>>2),Hd.div(l,f<<2,m,i<<2,n,o),b=Hd.tst(o,f<<2)>>2,b&&(j=new dc,j.limbs=new Uint32Array(Gd.subarray(o>>2,(o>>2)+b)),j.bitLength=b<<5>d?d:b<<5,j.sign=this.sign*a.sign),c=Hd.tst(n,i<<2)>>2,c&&(k=new dc,k.limbs=new Uint32Array(Gd.subarray(n>>2,(n>>2)+c)),k.bitLength=c<<5>g?g:c<<5,k.sign=this.sign),{quotient:j,remainder:k}}function qc(a,b){var c,d,e,f,g=0>a?-1:1,h=0>b?-1:1,i=1,j=0,k=0,l=1;for(a*=g,b*=h,f=b>a,f&&(e=a,a=b,b=e,e=g,g=h,h=e),d=Math.floor(a/b),c=a-d*b;c;)e=i-d*j,i=j,j=e,e=k-d*l,k=l,l=e,a=b,b=c,d=Math.floor(a/b),c=a-d*b;return j*=g,l*=h,f&&(e=j,j=l,l=e),{gcd:b,x:j,y:l}}function rc(a,b){cc(a)||(a=new dc(a)),cc(b)||(b=new dc(b));var c=a.sign,d=b.sign;0>c&&(a=a.negate()),0>d&&(b=b.negate());var e=a.compare(b);if(0>e){var f=a;a=b,b=f,f=c,c=d,d=f}var g,h,i,j=Ld,k=Kd,l=b.bitLength,m=Kd,n=Ld,o=a.bitLength;for(g=a.divide(b);(h=g.remainder)!==Kd;)i=g.quotient,g=j.subtract(i.multiply(k).clamp(l)).clamp(l),j=k,k=g,g=m.subtract(i.multiply(n).clamp(o)).clamp(o),m=n,n=g,a=b,b=h,g=a.divide(b);if(0>c&&(k=k.negate()),0>d&&(n=n.negate()),0>e){var f=k;k=n,n=f}return{gcd:b,x:k,y:n}}function sc(){if(dc.apply(this,arguments),this.valueOf()<1)throw new RangeError;if(!(this.bitLength<=32)){var a;if(1&this.limbs[0]){var b=(this.bitLength+31&-32)+1,c=new Uint32Array(b+31>>5);c[c.length-1]=1,a=new dc,a.sign=1,a.bitLength=b,a.limbs=c;var d=qc(4294967296,this.limbs[0]).y;this.coefficient=0>d?-d:4294967296-d,this.comodulus=a,this.comodulusRemainder=a.divide(this).remainder,this.comodulusRemainderSquare=a.square().divide(this).remainder}}}function tc(a){return cc(a)||(a=new dc(a)),a.bitLength<=32&&this.bitLength<=32?new dc(a.valueOf()%this.valueOf()):a.bitLength<this.bitLength?a:a.bitLength===this.bitLength?a.compare(this)<0?a:a.subtract(this).clamp(this.bitLength):a.divide(this).remainder}function uc(a){a=this.reduce(a);var b=rc(this,a).y;return b.sign<0&&(b=b.add(this).clamp(this.bitLength)),b}function vc(a,b){cc(a)||(a=new dc(a)),cc(b)||(b=new dc(b));for(var c=0,d=0;d<b.limbs.length;d++)for(var e=b.limbs[d];e;)1&e&&c++,e>>>=1;var f=8;b.bitLength<=4536&&(f=7),b.bitLength<=1736&&(f=6),b.bitLength<=630&&(f=5),b.bitLength<=210&&(f=4),b.bitLength<=60&&(f=3),b.bitLength<=12&&(f=2),1<<f-1>=c&&(f=1),a=wc(this.reduce(a).multiply(this.comodulusRemainderSquare),this);var g=wc(a.square(),this),h=new Array(1<<f-1);h[0]=a,h[1]=wc(a.multiply(g),this);for(var d=2;1<<f-1>d;d++)h[d]=wc(h[d-1].multiply(g),this);for(var i=Ld,d=b.limbs.length-1;d>=0;d--)for(var e=b.limbs[d],j=32;j>0;)if(2147483648&e){for(var k=e>>>32-f,l=f;0===(1&k);)k>>>=1,l--;for(var m=h[k>>>1];k;)k>>>=1,i=i!==Ld?wc(i.square(),this):i;i=i!==Ld?wc(i.multiply(m),this):m,e<<=l,j-=l}else i=i!==Ld?wc(i.square(),this):i,e<<=1,j--;return i=wc(i,this)}function wc(a,b){var c=a.limbs,d=c.length,e=b.limbs,f=e.length,g=b.coefficient;Hd.sreset();var h=Hd.salloc(d<<2),i=Hd.salloc(f<<2),j=Hd.salloc(f<<2);Hd.z(j-h+(f<<2),0,h),Gd.set(c,h>>2),Gd.set(e,i>>2),Hd.mredc(h,d<<2,i,f<<2,g,j);var k=new dc;return k.limbs=new Uint32Array(Gd.subarray(j>>2,(j>>2)+f)),k.bitLength=b.bitLength,k.sign=1,k}function xc(a){a=a||100;var b=this.limbs,c=0;if(0===(1&b[0]))return!1;if(1>=a)return!0;var d=0,e=0,f=0;for(c=0;c<b.length;c++){for(var g=b[c];g;)d+=3&g,g>>>=2;for(var h=b[c];h;)e+=3&h,h>>>=2,e-=3&h,h>>>=2;for(var i=b[c];i;)f+=15&i,i>>>=4,f-=15&i,i>>>=4}if(!(d%3&&e%5&&f%17))return!1;if(2>=a)return!0;var j=new dc(this),k=0;for(j.limbs[0]-=1;0===j.limbs[k>>5];)k+=32;for(;0===(j.limbs[k>>5]>>(31&k)&1);)k++;j=j.splice(k);for(var l=new sc(this),m=this.subtract(Ld),n=new dc(this),o=this.limbs.length-1;0===n.limbs[o];)o--;for(a>>>=1;--a>=0;){for(ac(n.limbs),n.limbs[0]<2&&(n.limbs[0]+=2);n.compare(m)>=0;)n.limbs[o]>>>=1;var p=l.power(n,j);if(0!==p.compare(Ld)&&0!==p.compare(m)){for(var q=k;--q>0;){if(p=p.square().divide(l).remainder,0===p.compare(Ld))return!1;if(0===p.compare(m))break}if(0===q)return!1}}return!0}function yc(a){a=a||{},this.key=null,this.result=null,this.reset(a)}function zc(a){a=a||{},this.result=null;var b=a.key;if(void 0!==b){if(!(b instanceof Array))throw new TypeError("unexpected key type");var c=b.length;if(2!==c&&3!==c&&8!==c)throw new SyntaxError("unexpected key type");var d=[];d[0]=new sc(b[0]),d[1]=new dc(b[1]),c>2&&(d[2]=new dc(b[2])),c>3&&(d[3]=new sc(b[3]),d[4]=new sc(b[4]),d[5]=new dc(b[5]),d[6]=new dc(b[6]),d[7]=new dc(b[7])),this.key=d}return this}function Ac(a){if(!this.key)throw new o("no key is associated with the instance");k(a)&&(a=c(a)),l(a)&&(a=new Uint8Array(a));var b;if(m(a))b=new dc(a);else{if(!cc(a))throw new TypeError("unexpected data type");b=a}if(this.key[0].compare(b)<=0)throw new RangeError("data too large");return this.result=this.key[0].power(b,this.key[1]).toBytes(),this}function Bc(a){if(!this.key)throw new o("no key is associated with the instance");if(this.key.length<3)throw new o("key isn't suitable for decription");k(a)&&(a=c(a)),l(a)&&(a=new Uint8Array(a));var b;if(m(a))b=new dc(a);else{if(!cc(a))throw new TypeError("unexpected data type");b=a}if(this.key[0].compare(b)<=0)throw new RangeError("data too large");if(this.key.length>3){for(var d=this.key[0],e=this.key[2],f=this.key[3],g=this.key[4],h=this.key[5],i=this.key[6],j=this.key[7],n=f.power(b,h),p=g.power(b,i),q=n.subtract(p);q.sign<0;)q=q.add(f);var r=f.reduce(j.multiply(q));this.result=r.multiply(g).add(p).clamp(d.bitLength).toBytes()}else{var d=this.key[0],e=this.key[2];this.result=d.power(b,e).toBytes()}return this}function Cc(a,b){if(a=a||2048,b=b||65537,512>a)throw new p("bit length is too small");var c,b,d,e,f,g,h,j,k,l,m,n,o=a>>1,q=o+31>>5,r=a-o,s=r+31>>5;for(e=new dc({sign:1,bitLength:o,limbs:q}),m=e.limbs;;)if(ac(m),m[0]|=1,m[q-1]|=1<<(o-1&31),31&o&&(m[q-1]&=i(31&o)-1),e.isProbablePrime(100))break;for(f=new dc({sign:1,bitLength:r,limbs:s}),n=f.limbs;;)if(ac(n),n[0]|=1,n[s-1]|=1<<(r-1&31),31&r&&(qplimbs[s-1]&=i(31&r)-1),f.isProbablePrime(2)&&(c=new sc(e.multiply(f)),c.splice(a-1).valueOf()&&f.isProbablePrime(98)))break;var g=new dc(e);g.limbs[0]^=1;var h=new dc(f);h.limbs[0]^=1;var d=new sc(g.multiply(h)).inverse(b),j=d.divide(g).remainder,k=d.divide(h).remainder;e=new sc(e),f=new sc(f);var l=e.inverse(f);return[c,b,d,e,f,j,k,l]}function Dc(a){if(a=a||{},!a.hash)throw new SyntaxError("option 'hash' is required");if(!a.hash.HASH_SIZE)throw new SyntaxError("option 'hash' supplied doesn't seem to be a valid hash function");this.hash=a.hash,this.label=null,this.reset(a)}function Ec(a){a=a||{};var b=a.label;if(void 0!==b){if(l(b)||m(b))b=new Uint8Array(b);else{if(!k(b))throw new TypeError("unexpected label type");var c=b;b=new Uint8Array(c.length);for(var d=0;d<c.length;d++)b[d]=c.charCodeAt(d)}this.label=b.length>0?b:null}else this.label=null;zc.call(this,a)}function Fc(a){if(!this.key)throw new o("no key is associated with the instance");var b=Math.ceil(this.key[0].bitLength/8),c=this.hash.HASH_SIZE,d=a.byteLength||a.length||0,e=b-d-2*c-2;if(d>b-2*this.hash.HASH_SIZE-2)throw new p("data too large");var f=new Uint8Array(b),g=f.subarray(1,c+1),h=f.subarray(c+1);if(m(a))h.set(a,c+e+1);else if(l(a))h.set(new Uint8Array(a),c+e+1);else{if(!k(a))throw new TypeError("unexpected data type");for(var i=0;i<a.length;i++)h[b+e+1+i]=a.charCodeAt(i)}h.set(this.hash.reset().process(this.label||"").finish().result,0),h[c+e]=1,ac(g);for(var j=Hc.call(this,g,h.length),i=0;i<h.length;i++)h[i]^=j[i];for(var n=Hc.call(this,h,g.length),i=0;i<g.length;i++)g[i]^=n[i];return Ac.call(this,f),this}function Gc(a){if(!this.key)throw new o("no key is associated with the instance");var b=Math.ceil(this.key[0].bitLength/8),c=this.hash.HASH_SIZE,d=a.byteLength||a.length||0;if(d!==b)throw new p("bad data");Bc.call(this,a);var e=this.result[0],f=this.result.subarray(1,c+1),g=this.result.subarray(c+1);if(0!==e)throw new q("decryption failed");for(var h=Hc.call(this,g,f.length),i=0;i<f.length;i++)f[i]^=h[i];for(var j=Hc.call(this,f,g.length),i=0;i<g.length;i++)g[i]^=j[i];for(var k=this.hash.reset().process(this.label||"").finish().result,i=0;c>i;i++)if(k[i]!==g[i])throw new q("decryption failed");for(var l=c;l<g.length;l++){var m=g[l];if(1===m)break;if(0!==m)throw new q("decryption failed")}if(l===g.length)throw new q("decryption failed");return this.result=g.subarray(l+1),this}function Hc(a,b){a=a||"",b=b||0;for(var c=this.hash.HASH_SIZE,d=new Uint8Array(b),e=new Uint8Array(4),f=Math.ceil(b/c),g=0;f>g;g++){e[0]=g>>>24,e[1]=g>>>16&255,e[2]=g>>>8&255,e[3]=255&g;var h=d.subarray(g*c),i=this.hash.reset().process(a).process(e).finish().result;i.length>h.length&&(i=i.subarray(0,h.length)),h.set(i)}return d}function Ic(a){if(a=a||{},!a.hash)throw new SyntaxError("option 'hash' is required");if(!a.hash.HASH_SIZE)throw new SyntaxError("option 'hash' supplied doesn't seem to be a valid hash function");this.hash=a.hash,this.saltLength=4,this.reset(a)}function Jc(a){a=a||{},zc.call(this,a);var b=a.saltLength;if(void 0!==b){if(!j(b)||0>b)throw new TypeError("saltLength should be a non-negative number");if(null!==this.key&&Math.ceil((this.key[0].bitLength-1)/8)<this.hash.HASH_SIZE+b+2)throw new SyntaxError("saltLength is too large");this.saltLength=b}else this.saltLength=4}function Kc(a){if(!this.key)throw new o("no key is associated with the instance");var b=this.key[0].bitLength,c=this.hash.HASH_SIZE,d=Math.ceil((b-1)/8),e=this.saltLength,f=d-e-c-2,g=new Uint8Array(d),h=g.subarray(d-c-1,d-1),i=g.subarray(0,d-c-1),j=i.subarray(f+1),k=new Uint8Array(8+c+e),l=k.subarray(8,8+c),m=k.subarray(8+c);l.set(this.hash.reset().process(a).finish().result),e>0&&ac(m),i[f]=1,j.set(m),h.set(this.hash.reset().process(k).finish().result);for(var n=Hc.call(this,h,i.length),p=0;p<i.length;p++)i[p]^=n[p];g[d-1]=188;var q=8*d-b+1;return q%8&&(g[0]&=255>>>q),Bc.call(this,g),this}function Lc(a,b){if(!this.key)throw new o("no key is associated with the instance");var c=this.key[0].bitLength,d=this.hash.HASH_SIZE,e=Math.ceil((c-1)/8),f=this.saltLength,g=e-f-d-2;Ac.call(this,a);var h=this.result;if(188!==h[e-1])throw new q("bad signature");var i=h.subarray(e-d-1,e-1),j=h.subarray(0,e-d-1),k=j.subarray(g+1),l=8*e-c+1;if(l%8&&h[0]>>>8-l)throw new q("bad signature");for(var m=Hc.call(this,i,j.length),n=0;n<j.length;n++)j[n]^=m[n];l%8&&(h[0]&=255>>>l);for(var n=0;g>n;n++)if(0!==j[n])throw new q("bad signature");if(1!==j[g])throw new q("bad signature");var p=new Uint8Array(8+d+f),r=p.subarray(8,8+d),s=p.subarray(8+d);r.set(this.hash.reset().process(b).finish().result),s.set(k);for(var t=this.hash.reset().process(p).finish().result,n=0;d>n;n++)if(i[n]!==t[n])throw new q("bad signature");return this}function Mc(a,b){if(void 0===a)throw new SyntaxError("bitlen required");if(void 0===b)throw new SyntaxError("e required");for(var c=Cc(a,b),d=0;d<c.length;d++)cc(c[d])&&(c[d]=c[d].toBytes());return c}function Nc(a,b,c){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return new Dc({hash:td,key:b,label:c}).encrypt(a).result}function Oc(a,b,c){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return new Dc({hash:td,key:b,label:c}).decrypt(a).result}function Pc(a,b,c){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return new Dc({hash:ud,key:b,label:c}).encrypt(a).result}function Qc(a,b,c){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return new Dc({hash:ud,key:b,label:c}).decrypt(a).result}function Rc(a,b,c){if(void 0===a)throw new SyntaxError("data required");if(void 0===b)throw new SyntaxError("key required");return new Ic({hash:td,key:b,saltLength:c}).sign(a).result}function Sc(a,b,c,d){if(void 0===a)throw new SyntaxError("signature required");if(void 0===b)throw new SyntaxError("data required");if(void 0===c)throw new SyntaxError("key required");try{return new Ic({hash:td,key:c,saltLength:d}).verify(a,b),!0}catch(e){if(!(e instanceof q))throw e}return!1}function Tc(a,b,c){if(void 0===a)throw new SyntaxError("data required");
if(void 0===b)throw new SyntaxError("key required");return new Ic({hash:ud,key:b,saltLength:c}).sign(a).result}function Uc(a,b,c,d){if(void 0===a)throw new SyntaxError("signature required");if(void 0===b)throw new SyntaxError("data required");if(void 0===c)throw new SyntaxError("key required");try{return new Ic({hash:ud,key:c,saltLength:d}).verify(a,b),!0}catch(e){if(!(e instanceof q))throw e}return!1}b.asmCrypto=a,o.prototype=new Error,p.prototype=new Error,p.prototype=new Error;var Vc=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22,82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125,198,248,238,246,255,214,222,145,96,2,206,86,231,181,77,236,143,31,137,250,239,178,142,251,65,179,95,69,35,83,228,155,117,225,61,76,108,126,245,131,104,81,209,249,226,171,98,42,8,149,70,157,48,55,10,47,14,36,27,223,205,78,127,234,18,29,88,52,54,220,180,91,164,118,183,125,82,221,94,19,166,185,0,193,64,227,121,182,212,141,103,114,148,152,176,133,187,197,79,237,134,154,102,17,138,233,4,254,160,120,37,75,162,93,128,5,63,33,112,241,99,119,175,66,32,229,253,191,129,24,38,195,190,53,136,46,147,85,252,122,200,186,50,230,192,25,158,163,68,84,59,11,140,199,107,40,167,188,22,173,219,100,116,20,146,12,72,184,159,189,67,196,57,49,211,242,213,139,110,218,1,177,156,73,216,172,243,207,202,244,71,16,111,240,74,92,56,87,115,151,203,161,232,62,150,97,13,15,224,124,113,204,144,6,247,28,194,106,174,105,23,153,58,39,217,235,43,34,210,169,7,51,45,60,21,201,135,170,80,165,3,89,9,26,101,215,132,208,130,41,90,30,123,168,109,44,165,132,153,141,13,189,177,84,80,3,169,125,25,98,230,154,69,157,64,135,21,235,201,11,236,103,253,234,191,247,150,91,194,28,174,106,90,65,2,79,92,244,52,8,147,115,83,63,12,82,101,94,40,161,15,181,9,54,155,61,38,105,205,159,27,158,116,46,45,178,238,251,246,77,97,206,123,62,113,151,245,104,0,44,96,31,200,237,190,70,217,75,222,212,232,74,107,42,229,22,197,215,85,148,207,16,6,129,240,68,186,227,243,254,192,138,173,188,72,4,223,193,117,99,48,26,14,109,76,20,53,47,225,162,204,57,87,242,130,71,172,231,43,149,160,152,209,127,102,126,171,131,202,41,211,60,121,226,29,118,59,86,78,30,219,10,108,228,93,110,239,166,168,164,55,139,50,67,89,183,140,100,210,224,180,250,7,37,175,142,233,24,213,136,111,114,36,241,199,81,35,124,156,33,221,220,134,133,144,66,196,170,216,5,1,18,163,95,249,208,145,88,39,185,56,19,179,51,187,112,137,167,182,34,146,32,73,255,120,122,143,248,128,23,218,49,198,184,195,176,119,17,203,252,214,58,0,9,18,27,36,45,54,63,72,65,90,83,108,101,126,119,144,153,130,139,180,189,166,175,216,209,202,195,252,245,238,231,59,50,41,32,31,22,13,4,115,122,97,104,87,94,69,76,171,162,185,176,143,134,157,148,227,234,241,248,199,206,213,220,118,127,100,109,82,91,64,73,62,55,44,37,26,19,8,1,230,239,244,253,194,203,208,217,174,167,188,181,138,131,152,145,77,68,95,86,105,96,123,114,5,12,23,30,33,40,51,58,221,212,207,198,249,240,235,226,149,156,135,142,177,184,163,170,236,229,254,247,200,193,218,211,164,173,182,191,128,137,146,155,124,117,110,103,88,81,74,67,52,61,38,47,16,25,2,11,215,222,197,204,243,250,225,232,159,150,141,132,187,178,169,160,71,78,85,92,99,106,113,120,15,6,29,20,43,34,57,48,154,147,136,129,190,183,172,165,210,219,192,201,246,255,228,237,10,3,24,17,46,39,60,53,66,75,80,89,102,111,116,125,161,168,179,186,133,140,151,158,233,224,251,242,205,196,223,214,49,56,35,42,21,28,7,14,121,112,107,98,93,84,79,70,0,11,22,29,44,39,58,49,88,83,78,69,116,127,98,105,176,187,166,173,156,151,138,129,232,227,254,245,196,207,210,217,123,112,109,102,87,92,65,74,35,40,53,62,15,4,25,18,203,192,221,214,231,236,241,250,147,152,133,142,191,180,169,162,246,253,224,235,218,209,204,199,174,165,184,179,130,137,148,159,70,77,80,91,106,97,124,119,30,21,8,3,50,57,36,47,141,134,155,144,161,170,183,188,213,222,195,200,249,242,239,228,61,54,43,32,17,26,7,12,101,110,115,120,73,66,95,84,247,252,225,234,219,208,205,198,175,164,185,178,131,136,149,158,71,76,81,90,107,96,125,118,31,20,9,2,51,56,37,46,140,135,154,145,160,171,182,189,212,223,194,201,248,243,238,229,60,55,42,33,16,27,6,13,100,111,114,121,72,67,94,85,1,10,23,28,45,38,59,48,89,82,79,68,117,126,99,104,177,186,167,172,157,150,139,128,233,226,255,244,197,206,211,216,122,113,108,103,86,93,64,75,34,41,52,63,14,5,24,19,202,193,220,215,230,237,240,251,146,153,132,143,190,181,168,163,0,13,26,23,52,57,46,35,104,101,114,127,92,81,70,75,208,221,202,199,228,233,254,243,184,181,162,175,140,129,150,155,187,182,161,172,143,130,149,152,211,222,201,196,231,234,253,240,107,102,113,124,95,82,69,72,3,14,25,20,55,58,45,32,109,96,119,122,89,84,67,78,5,8,31,18,49,60,43,38,189,176,167,170,137,132,147,158,213,216,207,194,225,236,251,246,214,219,204,193,226,239,248,245,190,179,164,169,138,135,144,157,6,11,28,17,50,63,40,37,110,99,116,121,90,87,64,77,218,215,192,205,238,227,244,249,178,191,168,165,134,139,156,145,10,7,16,29,62,51,36,41,98,111,120,117,86,91,76,65,97,108,123,118,85,88,79,66,9,4,19,30,61,48,39,42,177,188,171,166,133,136,159,146,217,212,195,206,237,224,247,250,183,186,173,160,131,142,153,148,223,210,197,200,235,230,241,252,103,106,125,112,83,94,73,68,15,2,21,24,59,54,33,44,12,1,22,27,56,53,34,47,100,105,126,115,80,93,74,71,220,209,198,203,232,229,242,255,180,185,174,163,128,141,154,151,0,14,28,18,56,54,36,42,112,126,108,98,72,70,84,90,224,238,252,242,216,214,196,202,144,158,140,130,168,166,180,186,219,213,199,201,227,237,255,241,171,165,183,185,147,157,143,129,59,53,39,41,3,13,31,17,75,69,87,89,115,125,111,97,173,163,177,191,149,155,137,135,221,211,193,207,229,235,249,247,77,67,81,95,117,123,105,103,61,51,33,47,5,11,25,23,118,120,106,100,78,64,82,92,6,8,26,20,62,48,34,44,150,152,138,132,174,160,178,188,230,232,250,244,222,208,194,204,65,79,93,83,121,119,101,107,49,63,45,35,9,7,21,27,161,175,189,179,153,151,133,139,209,223,205,195,233,231,245,251,154,148,134,136,162,172,190,176,234,228,246,248,210,220,206,192,122,116,102,104,66,76,94,80,10,4,22,24,50,60,46,32,236,226,240,254,212,218,200,198,156,146,128,142,164,170,184,182,12,2,16,30,52,58,40,38,124,114,96,110,68,74,88,86,55,57,43,37,15,1,19,29,71,73,91,85,127,113,99,109,215,217,203,197,239,225,243,253,167,169,187,181,159,145,131,141],Wc=2048,Xc=16,Yc=y.prototype;Yc.reset=A,Yc.process=B,Yc.finish=C;var Zc=z.prototype;Zc.reset=A,Zc.process=E,Zc.finish=F;var $c=x.prototype;$c.reset=A,$c.encrypt=D,$c.decrypt=G;var _c=65279,ad=68719476720,bd=I.prototype;bd.reset=M,bd.encrypt=P,bd.decrypt=S;var cd=J.prototype;cd.reset=M,cd.process=N,cd.finish=O;var dd=K.prototype;dd.reset=M,dd.process=Q,dd.finish=R;var ed=U.prototype;ed.reset=W,ed.process=X,ed.finish=Y;var fd=V.prototype;fd.reset=W,fd.process=$,fd.finish=_;var gd=T.prototype;gd.reset=W,gd.encrypt=Z,gd.decrypt=ab;var hd=64,id=32;cb.BLOCK_SIZE=hd,cb.HASH_SIZE=id;var jd=cb.prototype;jd.reset=db,jd.process=eb,jd.finish=fb;var kd=128,ld=64;hb.BLOCK_SIZE=kd,hb.HASH_SIZE=ld;var md=hb.prototype;md.reset=ib,md.process=jb,md.finish=kb;var nd=lb.prototype;nd.reset=qb,nd.process=tb,nd.finish=ub,mb.BLOCK_SIZE=cb.BLOCK_SIZE,mb.HMAC_SIZE=cb.HASH_SIZE;var od=mb.prototype;od.reset=rb,od.process=tb,od.finish=vb,nb.BLOCK_SIZE=hb.BLOCK_SIZE,nb.HMAC_SIZE=hb.HASH_SIZE;var pd=nb.prototype;pd.reset=sb,pd.process=tb,pd.finish=wb;var qd=xb.prototype;qd.reset=Ab,qd.generate=Bb;var rd=yb.prototype;rd.reset=Ab,rd.generate=Cb;var sd=zb.prototype;sd.reset=Ab,sd.generate=Db,b.IllegalStateError=o,b.IllegalArgumentError=p,b.SecurityError=q,a.string_to_bytes=c,a.hex_to_bytes=d,a.base64_to_bytes=e,a.bytes_to_string=f,a.bytes_to_hex=g,a.bytes_to_base64=h;var td=new cb({heapSize:1048576});a.SHA256={bytes:Eb,hex:Fb,base64:Gb};var ud=new hb({heapSize:1048576});a.SHA512={bytes:Hb,hex:Ib,base64:Jb};var vd=new mb({hash:td});a.HMAC=a.HMAC_SHA256={bytes:Kb,hex:Lb,base64:Mb};var wd=new nb({hash:ud});a.HMAC_SHA512={bytes:Nb,hex:Ob,base64:Pb};var xd=new yb({hmac:vd});a.PBKDF2=a.PBKDF2_HMAC_SHA256={bytes:Qb,hex:Rb,base64:Sb};var yd=new zb({hmac:wd});a.PBKDF2_HMAC_SHA512={bytes:Tb,hex:Ub,base64:Vb};var zd=new x({heapSize:1048576});a.AES=a.AES_CBC={encrypt:Wb,decrypt:Xb};var Ad=new I({heap:zd.heap,asm:zd.asm});a.AES_CCM={encrypt:Yb,decrypt:Zb};var Bd=new T({heap:zd.heap,asm:zd.asm});a.AES_CFB={encrypt:$b,decrypt:_b};var Cd=function(){function a(){h=i=m=o=0;for(var a=0;256>a;++a)f[a]=g[a]=0}function b(b){var e,h,i,m,p,q,r,s,t;if(e=h=i=m=p=q=r=s=2654435769,!n(b))if(j(b))b=new Uint32Array(2),b[0]=b/4294967296|0,b[1]=0|b;else if(k(b))b=c(b);else{if(!(l(b)||b instanceof Array))throw new TypeError("bad seed type");b=new Uint8Array(b)}for(a(),t=0;t<b.length;t++)g[255&t]+=b[t];for(t=0;4>t;t++)e^=h<<11,m=m+e|0,h=h+i|0,h^=i>>>2,p=p+h|0,i=i+m|0,i^=m<<8,q=q+i|0,m=m+p|0,m^=p>>>16,r=r+m|0,p=p+q|0,p^=q<<10,s=s+p|0,q=q+r|0,q^=r>>>4,e=e+q|0,r=r+s|0,r^=s<<8,h=h+r|0,s=s+e|0,s^=e>>>9,i=i+s|0,e=e+h|0;for(t=0;256>t;t+=8)e=e+g[0|t]|0,h=h+g[1|t]|0,i=i+g[2|t]|0,m=m+g[3|t]|0,p=p+g[4|t]|0,q=q+g[5|t]|0,r=r+g[6|t]|0,s=s+g[7|t]|0,e^=h<<11,m=m+e|0,h=h+i|0,h^=i>>>2,p=p+h|0,i=i+m|0,i^=m<<8,q=q+i|0,m=m+p|0,m^=p>>>16,r=r+m|0,p=p+q|0,p^=q<<10,s=s+p|0,q=q+r|0,q^=r>>>4,e=e+q|0,r=r+s|0,r^=s<<8,h=h+r|0,s=s+e|0,s^=e>>>9,i=i+s|0,e=e+h|0,f[0|t]=e,f[1|t]=h,f[2|t]=i,f[3|t]=m,f[4|t]=p,f[5|t]=q,f[6|t]=r,f[7|t]=s;for(t=0;256>t;t+=8)e=e+f[0|t]|0,h=h+f[1|t]|0,i=i+f[2|t]|0,m=m+f[3|t]|0,p=p+f[4|t]|0,q=q+f[5|t]|0,r=r+f[6|t]|0,s=s+f[7|t]|0,e^=h<<11,m=m+e|0,h=h+i|0,h^=i>>>2,p=p+h|0,i=i+m|0,i^=m<<8,q=q+i|0,m=m+p|0,m^=p>>>16,r=r+m|0,p=p+q|0,p^=q<<10,s=s+p|0,q=q+r|0,q^=r>>>4,e=e+q|0,r=r+s|0,r^=s<<8,h=h+r|0,s=s+e|0,s^=e>>>9,i=i+s|0,e=e+h|0,f[0|t]=e,f[1|t]=h,f[2|t]=i,f[3|t]=m,f[4|t]=p,f[5|t]=q,f[6|t]=r,f[7|t]=s;d(1),o=256}function d(a){a=a||1;for(var b,c,d;a--;)for(m=m+1|0,i=i+m|0,b=0;256>b;b+=4)h^=h<<13,h=f[b+128&255]+h|0,c=f[0|b],f[0|b]=d=f[c>>>2&255]+(h+i|0)|0,g[0|b]=i=f[d>>>10&255]+c|0,h^=h>>>6,h=f[b+129&255]+h|0,c=f[1|b],f[1|b]=d=f[c>>>2&255]+(h+i|0)|0,g[1|b]=i=f[d>>>10&255]+c|0,h^=h<<2,h=f[b+130&255]+h|0,c=f[2|b],f[2|b]=d=f[c>>>2&255]+(h+i|0)|0,g[2|b]=i=f[d>>>10&255]+c|0,h^=h>>>16,h=f[b+131&255]+h|0,c=f[3|b],f[3|b]=d=f[c>>>2&255]+(h+i|0)|0,g[3|b]=i=f[d>>>10&255]+c|0}function e(){return o--||(d(1),o=255),g[o]}for(var f=new Uint32Array(256),g=new Uint32Array(256),h=0,i=0,m=0,o=0,p=new Uint32Array(256),q=0;q<p.length;q++)p[q]=4294967296*Math.random();return b(p),{reset:a,seed:b,prng:d,rand:e}}(),Dd=b.crypto,Ed=b.Math.random,Fd=Cd.rand;a.ISAAC=Cd,a.getRandomValues=ac,void 0===b.Math.imul&&(b.Math.imul=function(a,b){var c=a>>>16,d=65535&a,e=b>>>16,f=65535&b;return a=d*f|0,b=(d*e&65535)+(c*f&65535)+(a>>>16)|0,65535&a|b<<16});var Gd=new Uint32Array(1048576),Hd=bc(b,null,Gd.buffer),Id=new Uint32Array(0),Jd=dc.prototype=new Number;Jd.toString=ec,Jd.toBytes=fc,Jd.valueOf=gc,Jd.clamp=hc,Jd.splice=ic,Jd.negate=jc,Jd.compare=kc,Jd.add=lc,Jd.subtract=mc,Jd.multiply=nc,Jd.square=oc,Jd.divide=pc;var Kd=new dc(0),Ld=new dc(1);Object.freeze(Kd),Object.freeze(Ld);var Md=sc.prototype=new dc;Md.reduce=tc,Md.inverse=uc,Md.power=vc,Jd.isProbablePrime=xc,dc.ZERO=Kd,dc.ONE=Ld,dc.extGCD=rc,a.BigNumber=dc,a.Modulus=sc;var Nd=yc.prototype;Nd.reset=zc,Nd.encrypt=Ac,Nd.decrypt=Bc,yc.generateKey=Cc;var Od=Dc.prototype;Od.reset=Ec,Od.encrypt=Fc,Od.decrypt=Gc;var Pd=Ic.prototype;Pd.reset=Jc,Pd.sign=Kc,Pd.verify=Lc,a.RSA={generateKey:Mc},a.RSA_OAEP_SHA256={encrypt:Nc,decrypt:Oc},a.RSA_OAEP_SHA512={encrypt:Pc,decrypt:Qc},a.RSA_PSS_SHA256={sign:Rc,verify:Sc},a.RSA_PSS_SHA512={sign:Tc,verify:Uc}}({},function(){return this}());
//# sourceMappingURL=asmcrypto.js.map;
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

define("jsbn1", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.jsbn1;
    };
}(this)));

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
define("jsbn", ["jsbn1"], (function (global) {
    return function () {
        var ret, fn;
       fn = function (jsbn1) {
                return {
                    BigInteger: BigInteger,
                };
            };
        ret = fn.apply(global, arguments);
        return ret || global.jsbn;
    };
}(this)));

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
        define('jodid25519',[], factory);
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
    // No requirements here.
], function() {
    

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
 
    function _reduce(a) {
        var v = a[15];
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
    // No requirements here.
], function() {
    

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
     * @param secretKey {string}
     *     Private point as byte string on the curve.
     * @param publicComponent {string}
     *     Public point as byte string on the curve. If not given, the curve's
     *     base point is used.
     * @returns {string}
     *     Key point as byte string resulting from scalar product.
     */
    ns.computeKey = function(secretKey, publicComponent) {
        if (publicComponent) {
            return _toString(curve255.curve25519(_fromString(secretKey),
                                                 _fromString(publicComponent)));
        } else {
            return _toString(curve255.curve25519(_fromString(secretKey)));
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
    

    return ns;
});

;
define("jsbn1", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.jsbn1;
    };
}(this)));

;
define("jsbn", ["jsbn1"], (function (global) {
    return function () {
        var ret, fn;
       fn = function (jsbn1) {
                return {
                    BigInteger: BigInteger,
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
], function(core, curve255, utils, jsbn) {
    

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
     * TODO: Check whether we can find a better way to stay closer to the curve255 version.
     *
     * This function has been modified up to be closer to constant time.
     *
     * It is copied from curve255.js core.reduce(), but it failed if the
     * conditional ``if (v < 0x8000)`` was omitted in this implementation.
     */
    function _myReduce(arr) {
        var aCopy = arr.slice(0);
        var choice = [arr, aCopy];
        var v = arr[15];
        // Use the dummy copy instead of just returning to be more constant time.
        var a = choice[(v >>> 15) & 1];
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

//    jsbn.BigInteger.prototype.toSource = function() {
//        return this.toString(16);
//    };
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
     * @param p {string}
     *     The point to check for in a byte string representation.
     * @returns
     *     true if the point is on the curve, false otherwise.
     */
    ns.isOnCurve = function(p) {
        try {
            _isoncurve(_decodepoint(utils.string2bytes(p)));
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
     * @param sk {string}
     *     Private key seed in the form of a byte string.
     * @returns {string}
     *     Public key as byte string computed from the private key seed
     *     (32 bytes).
     */
    ns.publicKey = function(sk) {
        return utils.bytes2string(_publickey(sk));
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
     * @param sk {string}
     *     Private key seed in the form of a byte string.
     * @param pk {string}
     *     Public key as byte string (if not present, it will be computed from
     *     the private key seed).
     * @returns {string}
     *     Detached message signature in the form of a byte string (64 bytes).
     */
    ns.signature = function(message, sk, pk) {
        if (pk === undefined) {
            pk = _publickey(sk);
        } else {
            pk = utils.string2bytes(pk);
        }
        var a = _bi(_get_a(sk).toString(), 16);
        var hs = _stringhash(sk);
        var r = _bytehash(hs.slice(32, 64) + message);
        var rp = _scalarmultBytes(_bp, r);
        var erp = _encodepoint(rp);
        r = _bi(r).mod(_bi(1, 10).shiftLeft(512));
        var s = _map(_chr, erp).join('') + _map(_chr, pk).join('') + message;
        s = _inthash_mod_l(s).multiply(a).add(r).mod(_L_BI);
        return utils.bytes2string(erp.concat(_encodeint(s)));
    };

        
    /**
     * Checks an EdDSA signature of a message with the public key.
     *
     * <p>Note: Unicode messages need to be converted to a byte representation
     * (e. g. UTF-8).</p>
     *
     * @function
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
    ns.checkSig = function(sig, message, pk) {
        sig = utils.string2bytes(sig.slice(0, 64));
        pk = utils.string2bytes(pk);
        var rpe = sig.slice(0, 32);
        var rp = _decodepoint(rpe);
        var a = _decodepoint(pk);
        var s = _decodeint(sig.slice(32, 64));
        var h = _inthash(utils.bytes2string(rpe.concat(pk)) + message);
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
    ns.genKeySeed = function() {
        var buffer = new Uint8Array(32);
        asmCrypto.getRandomValues(buffer);
        var result = [];
        for (var i = 0; i < buffer.length; i++) {
            result.push(String.fromCharCode(buffer[i]));
        }
        return result.join('');
    };
    
    
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
;
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
    "asmcrypto",
    "jodid25519",
], function(assert, messages, utils, version, asmCrypto, jodid25519) {
    

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
     * Determines whether a message content is of an mpENC data message.
     *
     * If `false`, it is usually an mpENC greet message.
     *
     * @param message {string}
     *     A wire protocol message representation.
     * @returns {bool}
     *     True if it is a data message.
     */
    ns.isDataContent = function(message) {
        if (!message) {
            return false;
        }

        // Data messages contain this TLV sequence at the start:
        var dataMessageSequence = [ns.TLV_TYPE.MESSAGE_SIGNATURE,
                                   ns.TLV_TYPE.PROTOCOL_VERSION,
                                   ns.TLV_TYPE.MESSAGE_IV,
                                   ns.TLV_TYPE.DATA_MESSAGE];
        var result = true;
        for (var i = 0; (i < dataMessageSequence.length) && (message.length > 0); i++) {
            var tlv = ns.decodeTLV(message);
            if (tlv.type !== dataMessageSequence[i]) {
                result = false;
            }
            message = tlv.rest;
        }
        return result;
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

        // Check for mpENC message.
        if ((message[0] === ':') && (message[message.length - 1] === '.')) {
            message = atob(message.substring(1, message.length - 1));
            if (ns.isDataContent(message)) {
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
        return (value.charCodeAt(0) << 8) | value.charCodeAt(1);
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
        var keyBytes = new Uint8Array(jodid25519.utils.string2bytes(key));
        var ivBytes = new Uint8Array(utils._newKey08(128));
        // Protect multi-byte characters.
        var dataBytes = unescape(encodeURIComponent(data));
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
        // Undo protection for multi-byte characters.
        return decodeURIComponent(escape(jodid25519.utils.bytes2string(clearBytes)));
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
        return jodid25519.eddsa.signature(data, privKey, pubKey);
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
        return jodid25519.eddsa.checkSig(signature, data, pubKey);
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
            this.intKeys[myPos] = jodid25519.dh.computeKey(this.privKey,
                                                           this.intKeys[myPos]);
            this._debugIntKeys[myPos] = ns._computeKeyDebug(this._debugPrivKey,
                                                            this._debugIntKeys[myPos]);
            this.privKey = null;
        }

        // Make a new private key.
        this.privKey = jodid25519.utils.bytes2string(utils._newKey08(256));
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
        this.groupKey = jodid25519.dh.computeKey(this.privKey,
                                                 this.intKeys[myPos]);
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
        this.nonce = jodid25519.eddsa.genKeySeed();
        this.nonces.push(this.nonce);
        if (!this.ephemeralPrivKey) {
            // Only generate a new key if we don't have one.
            // We might want to recover and just re-run the protocol.
            this.ephemeralPrivKey = jodid25519.eddsa.genKeySeed();
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
        return jodid25519.eddsa.signature(hashValue, this.staticPrivKey,
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
        return jodid25519.eddsa.checkSig(signature, hashValue,
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
     * Computes the session ID..
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
            case codec.MESSAGE_CATEGORY.MPENC_GREET_MESSAGE:
                var decodedMessage = null;
                if (this.cliquesMember.groupKey) {
                    // In case of a key refresh (groupKey existent),
                    // the signing pubKeys won't be part of the message.
                    var signingPubKey = this.askeMember.getMemberEphemeralPubKey(wireMessage.from);
                    decodedMessage = codec.decodeMessageContent(classify.content,
                                                                this.cliquesMember.groupKey.substring(0, 16),
                                                                signingPubKey);
                } else {
                    decodedMessage = codec.decodeMessageContent(classify.content);
                }

                // This is an mpenc.greet message.
                var keyingMessageResult = this._processKeyingMessage(decodedMessage);
                var outContent = keyingMessageResult[0];

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
                if(keyingMessageResult[1]) {
                    // update of the state is required.
                    this.state = keyingMessageResult[1];
                    this.stateUpdatedCallback(this);
                }
                break;
            case codec.MESSAGE_CATEGORY.MPENC_DATA_MESSAGE:
                var decodedMessage = null;
                _assert(this.state === ns.STATE.INITIALISED,
                        'Data messages can only be decrypted from an initialised state.');

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
     * @returns [{mpenc.messages.ProtocolMessage}, newState]
     *     Array containing the Un-encoded message content and optional (null if not used) the new the ProtocolHandler
     */
    ns.ProtocolHandler.prototype._processKeyingMessage = function(message) {
        var inCliquesMessage = this._getCliquesMessage(utils.clone(message));
        var inAskeMessage = this._getAskeMessage(utils.clone(message));
        var outCliquesMessage = null;
        var outAskeMessage = null;
        var outMessage = null;
        var newState = null;

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
                    newState = ns.STATE.INIT_DOWNFLOW;
                } else {
                    newState = ns.STATE.AUX_DOWNFLOW;
                }
            }
            if (this.askeMember.isSessionAcknowledged()) {
                // We have seen and verified all broadcasts from others.
                newState = ns.STATE.INITIALISED;
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
                    newState = ns.STATE.INIT_DOWNFLOW;
                } else {
                    newState = ns.STATE.INIT_UPFLOW;
                }
            } else {
                if (outMessage.dest === '') {
                    newState = ns.STATE.AUX_DOWNFLOW;
                } else {
                    newState = ns.STATE.AUX_UPFLOW;
                }
            }
        }
        return [outMessage, newState];
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

    // The modules for your project will be inlined above
    // this snippet. Ask almond to synchronously require the
    // module value for 'main' here and return it as the
    // value to use for the public API for the built file.
    return require('mpenc');
}));
// See https://github.com/jrburke/almond#exporting-a-public-api
