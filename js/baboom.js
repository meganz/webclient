(function() {
/**
 * @license almond 0.2.8 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
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
        aps = [].slice;

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
            jsSuffixRegExp = /\.js$/,
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
                if (config.pkgs && hasProp(config.pkgs, baseParts[0]) &&
                    jsSuffixRegExp.test(name[lastIndex])) {
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
        var i, pkgs;
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
            pkgs = config.packages;
            if (config.packages) {
                config.pkgs = {};
                for (i = 0; i < pkgs.length; i++) {
                    config.pkgs[pkgs[i].name || pkgs[i]] = true;
                }
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

define("bower_components/almond/almond", function(){});

define('has',{});
/**
 * MixableEventsEmitter.
 * This is an abstract class because it is meant to be mixed in and not used as a standalone class.
 * This was necessary because the fireEvent had to be declared protected.
 */
define('events-emitter/MixableEventsEmitter',[],function () {

    

    var hasOwn = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice,
        parseEventResult = {},
        name,
        ns;

    function MixableEventsEmitter() {}

    /**
     * Adds a new event listener.
     * If the listener is already attached, it won't get duplicated.
     *
     * @param {String}   event     The event name
     * @param {Function} fn        The listener
     * @param {Object}   [context] The context in which the function will be executed, defaults to the instance
     *
     * @return {MixableEventsEmitter} The instance itself to allow chaining
     */
    MixableEventsEmitter.prototype.on = function (event, fn, context) {
        parseEvent(event);

        registerListener.call(this, {
            name: name,
            ns: ns,
            fn: fn,
            callable: fn,
            context: context
        });

        return this;
    };

    /**
     * Adds a new event listener that is removed automatically afterwards.
     * If the listener is already attached, it won't get duplicated.
     *
     * @param {String}   event     The event name
     * @param {Function} fn        The listener
     * @param {Object}   [context] The context in which the function will be executed, defaults to the instance
     *
     * @return {MixableEventsEmitter} The instance itself to allow chaining
     */
    MixableEventsEmitter.prototype.once = function (event, fn, context) {
        var callable,
            meta,
            that = this;

        callable = function () {
            fn.apply(this, arguments);
            unregisterListener.call(that, meta);
        };

        parseEvent(event);

        meta = {
            name: name,
            ns: ns,
            fn: fn,
            callable: callable,
            context: context
        };

        registerListener.call(this, meta);

        return this;
    };

    // Alias to once()
    MixableEventsEmitter.prototype.one = MixableEventsEmitter.prototype.once;

    /**
     * Removes an existent event listener.
     * If no fn and context is passed, removes all event listeners of a given name.
     * If no event is specified, removes all events of all names.
     *
     * @param {String}   [event]   The event name
     * @param {Function} [fn]      The listener
     * @param {Object}   [context] The context passed to the on() function
     *
     * @return {MixableEventsEmitter} The instance itself to allow chaining
     */
    MixableEventsEmitter.prototype.off = function (event, fn, context) {
        var listeners,
            index,
            curr,
            x;

        // off()
        if (!event) {
            cleanListeners.call(this);
            return this;
        }

        parseEvent(event);

        // Get the listeners array based on the name / namespace
        this._listeners = this._listeners || {};
        this._namespaces = this._namespaces || {};

        listeners = name ? this._listeners[name] : this._namespaces[ns];

        if (!listeners) {
            return this;
        }

        // If a specific fn was passed, remove just that
        // .off(name, fn)
        // .off(name, fn, ctx)
        // .off(name.namespace, fn)
        // .off(name.namespace, fn, ctx)
        if (fn) {
            index = getListenerIndex(listeners, fn, context);
            if (index !== -1) {
                unregisterListener.call(this, listeners[index]);
            }

            return this;
        }

        // Remove all listeners of the given name / namespace
        // Unroll the loop for performance reasons
        // .off(name)
        // .off(name.namespace)
        if (!ns) {
            for (x = listeners.length - 1; x >= 0; x -= 1) {
                unregisterListener.call(this, listeners[x]);
            }
        } else {
            for (x = listeners.length - 1; x >= 0; x -= 1) {
                curr = listeners[x];

                if (curr.ns === ns) {
                    unregisterListener.call(this, listeners[x]);
                }
            }
        }

        return this;
    };

    /////////////////////////////////////////////////////////////////////////////////////

    /**
     * Emits an event.
     *
     * @param {String}   event  The event name
     * @param {...mixed} [args] The arguments to pass along with the event
     *
     * @return {MixableEventsEmitter} The instance itself to allow chaining
     */
    MixableEventsEmitter.prototype._emit = function (event) {
        var listeners,
            params,
            x,
            curr,
            wasFiring;

        this._listeners = this._listeners || {};
        listeners = this._listeners[event];

        if (listeners) {
            params = slice.call(arguments, 1);
            wasFiring = this._firing;
            this._firing = true;

            for (x = 0; x < listeners.length; x += 1) {
                curr = listeners[x];

                // Check if the listener has been deleted meanwhile
                if (hasOwn.call(curr, 'fn')) {
                    curr.callable.apply(curr.context || this, params);
                } else {
                    listeners.splice(x, 1);
                    x -= 1;
                }
            }

            if (listeners.length === 0) {
                delete this._listeners[event];
            }

            this._firing = wasFiring;
        }

        return this;
    };

    // Alias to _emit()
    MixableEventsEmitter.prototype._trigger = MixableEventsEmitter.prototype._emit;

    /////////////////////////////////////////////////////////////////////////////////////

    /**
     * Gets a listener index.
     *
     * @param {String}   listeners The listeners array
     * @param {Function} fn        The function
     * @param {Object}   [context] The context passed to the on() function
     *
     * @return {Number} The index of the listener if found or -1 if not found
     */
    function getListenerIndex(listeners, fn, context) {
        var x,
            curr;

        for (x = listeners.length - 1; x >= 0; x -= 1) {
            curr = listeners[x];
            if (curr.fn === fn && curr.context === context) {
                return x;
            }
        }

        return -1;
    }

    /**
     * Registers a listener.
     *
     * @param {Object} The listener metadata
     */
    function registerListener(meta) {
        /*jshint validthis:true*/
        var listeners,
            name = meta.name,
            ns = meta.ns;

        this._listeners = this._listeners || {};
        listeners = this._listeners[name] = this._listeners[name] || [];

        if (getListenerIndex(listeners, meta.fn, meta.context) === -1) {
            listeners.push(meta);

            // Add also to namespace
            if (ns) {
                this._namespaces = this._namespaces || {};
                listeners = this._namespaces[ns] = this._namespaces[ns] || [];
                listeners.push(meta);
            }
        }
    }

    /**
     * Unregisters a listener.
     *
     * @param {Object} The listener metadata
     */
    function unregisterListener(meta) {
        /*jshint validthis:true*/
        var index,
            listeners,
            name = meta.name,
            ns = meta.ns;

        // Remove from the listeners array
        listeners = this._listeners[name];
        index = getListenerIndex(listeners, meta.fn, meta.context);
        if (index !== -1) {
            if (!this._firing) {
                listeners.splice(index, 1);
                if (!listeners.length) {
                    delete listeners[name];
                }
            } else {
                listeners[index] = {};
            }
        }

        // Remove also from the namespace array
        listeners = this._namespaces && this._namespaces[ns];
        if (!listeners) {
            return;
        }

        index = getListenerIndex(listeners, meta.fn, meta.context);
        if (index !== -1) {
            listeners.splice(index, 1);
            if (!listeners.length) {
                delete listeners[ns];
            }
        }
    }

    /**
     * Cleans all the listeners.
     */
    function cleanListeners() {
        /*jshint validthis:true*/
        var key;

        this._namespaces = {};

        if (!this._firing) {
            this._listeners = {};
        } else {
            for (key in this._listeners) {
                this._listeners[key].length = 0;
            }
        }
    }

    /**
     * Parses an event, extracting its name and namespace.
     * They will be available in the "name" and "ns" namespace.
     * If you want an object returned, pass "ret" as true.
     *
     * @param {String}  event The event name
     * @param {Boolean} [ret] True to return an object
     */
    function parseEvent(event, ret) {
        var split = event.split('.');

        name = split[0] || '';
        ns = split[1];

        if (ret) {
            parseEventResult.name = name;
            parseEventResult.ns = ns;

            return parseEventResult;
        }
    }

    // Export some control functions that are used internally
    // They could be useful to be used by others
    MixableEventsEmitter.getListenerIndex = getListenerIndex;
    MixableEventsEmitter.parseEvent = parseEvent;
    MixableEventsEmitter.parseEventResult = parseEventResult;

    return MixableEventsEmitter;
});

define('audio/util/createError',[],function () {

    

    function createError(message, code) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    return createError;
});

define('jquery',['jquery'], function () { return $; });
/*jshint bitwise:false*/

define('audio/sounds/Sound',[
    'has',
    'events-emitter/MixableEventsEmitter',
    '../util/createError',
    'jquery'
], function (has, MixableEventsEmitter, createError, $) {

    

    // Load States:
    //   0 - not loaded
    //   1 - loading
    //   2 - loaded

    // Play states:
    //   0 - not playing
    //   1 - waiting
    //   2 - playing
    //   3 - paused

    // Events
    //   - playstart (should be emitted by implementors)
    //   - playwaiting (should be emitted by implementors only when buffering is needed in the middle of playback)
    //   - playprogress (should be emitted by implementors)
    //   - playfinish (should be emitted by implementors)
    //   - playerror (should be emitted by implementors only if something went wrong while playing/decoding audio frames)
    //   - seeked (should be emitted by implementors when a seek point was found)
    //   - loadstart
    //   - loadprogress (should be emitted by implementors)
    //   - loadfinish (should be emitted by implementors)
    //   - loaderror (should be emitted by implementors)

    function Sound(options) {
        var that = this;

        // Parse options
        this._options = $.extend({
            initTimeout: 20000
        }, options || {});

        this._volume = 1;
        this._inited = false;

        this.on('loadfinish', this._onSelfLoadFinish, this);
        this.on('loaderror', this._onSelfLoadError, this);
        this.on('playwaiting', this._onSelfPlayWaiting, this);
        this.on('playprogress', this._onSelfPlayProgress, this);
        this.on('playfinish', this.stop, this);
        this.on('playerror', this.stop, this);

        // Init delay logic
        if (this._options.initTimeout) {
            this._initTimer = setTimeout(function () {
                that._initTimer = null;
                that._onSelfInitError(createError('Init timedout', 'ETIMEDOUT'));
            }, this._options.initTimeout);
        }
    }

    // Inherit from EventsEmitter
    Sound.prototype = Object.create(MixableEventsEmitter.prototype);
    Sound.prototype.constructor = Sound;

    // ----------------

    Sound.prototype.destroy = function () {
        this.off();
        this.stop();
        this.abort();
        this._destroy();

        this._playState = null;
        this._loadState = null;
        this._options = null;
        this._initHandler = null;

        this._cancelInitTimeout();
    };


    Sound.prototype.isInitialized = function () {
        return this._inited;
    };

    Sound.prototype.init = function (handler, ctx) {
        if (this._inited) {
            handler.call(ctx);
        } else if (this._initError) {
            handler.call(this, this._initError);
        } else {
            this._initHandler = ctx ? handler.bind(ctx) : handler;
        }

        return this;
    };

    Sound.prototype.load = function () {
        this._assertInit();

        if (!this._loadState) {
            this._loadState = 1;
            this._emit('loadstart');
            this._load();
        }

        return this;
    };

    Sound.prototype.abort = function () {
        if (this._loadState === 1) {
            this.stop();

            this._loadState = 0;
            this._abort();
        }

        return this;
    };

    Sound.prototype.play = function () {
        this._assertInit();

        // If stopped, play
        if (!this._playState) {
            this.load();

            this._emit('playwaiting');
            this._play();
            this._setVolume(this._volume);
        // Otherwise attempt to resume
        } else {
            this.resume();
        }

        return this;
    };

    Sound.prototype.stop = function () {
        if (this._playState) {
            this._playState = 0;
            this._stop();
        }
    };

    Sound.prototype.pause = function () {
        if (this._playState && this._playState !== 3) {
            this._playState = 3;
            this._pause();
        }

        return this;
    };

    Sound.prototype.resume = function () {
        if (this._playState === 3) {
            this._emit('playwaiting');
            this._resume();
        }

        return this;
    };

    Sound.prototype.toggle = function () {
        return this._playState === 3 ? this.resume() : this.pause();
    };

    Sound.prototype.getMaxSeekPosition = function () {
        this._assertInit();
        return this._getDuration();
    };

    Sound.prototype.seekTo = function (position) {
        var duration,
            loadProgressInSeconds = this.getMaxSeekPosition();

        // Skip if not playing
        if (!this._playState) {
            return this;
        }

        duration = this._getDuration();

        // Skip if out of range
        if (!duration || position < 0 || position > duration) {
            return this;
        }

        // If position is higher than getMaxSeekPosition()
        if (position > loadProgressInSeconds) {
            position = loadProgressInSeconds;
        }

        // Change play state to waiting only if not paused
        if (this._playState !== 3) {
            this._emit('playwaiting');
        }

        // Seek
        this._seekTo(position);

        return this;
    };

    Sound.prototype.getPosition = function () {
        if (!this._loadState && !this._playState) {
            return 0;
        }

        return this._getPosition() || 0;
    };

    Sound.prototype.getDuration = function () {
        if (!this._loadState && !this._playState) {
            return 0;
        }

        return this._getDuration() || 0;
    };

    Sound.prototype.getVolume = function (volume) {
        return this._volume;
    };

    Sound.prototype.setVolume = function (volume) {
        this._volume = volume;

        if (this._playState) {
            this._setVolume(volume);
        }

        return this;
    };

    Sound.prototype.getPlayState = function () {
        return this._playState;
    };

    Sound.prototype.getLoadState = function () {
        return this._loadState;
    };

    // -----------------------

    Sound.prototype._assertInit = function () {
        if (!this._inited) {
            throw createError('Sound is not yet inited', 'ENOTINITED');
        }
    };

    Sound.prototype._cancelInitTimeout = function () {
        if (this._initTimer) {
            clearTimeout(this._initTimer);
            this._initTimer = null;
        }
    };

    Sound.prototype._onSelfInit = function () {
        if (this._initError || this._inited) {
            return;
        }

        this._cancelInitTimeout();
        this._inited = true;

        if (this._initHandler) {
            this._initHandler();
            this._initHandler = null;
        }
    };

    Sound.prototype._onSelfInitError = function (err) {
        if (this._initError || this._inited) {
            return;
        }

        this._cancelInitTimeout();
        this._initError = err;

        if (this._initHandler) {
            this._initHandler(err);
            this._initHandler = null;
        }
    };

    // -----------------------

    Sound.prototype._onSelfPlayWaiting = function () {
        this._playState = 1;

        // If the playwaiting is emitted and the source is not loading
        // anymore (e.g. an loaderror was emitted), emit a playerror
        if (!this._loadState) {
            this.once('playwaiting', function () {
                this._emit('playerror', createError('Source failed to give data', 'ESRC'));
            }, this);
        }
    };

    Sound.prototype._onSelfPlayProgress = function () {
        this._playState = 2;
    };

    // -----------------------

    Sound.prototype._onSelfLoadFinish = function () {
        this._loadState = 2;
    };

    Sound.prototype._onSelfLoadError = function (err) {
        this._loadState = 0;

        // If we are waiting for data and the source failed,
        // die with a playerror
        if (this._playState === 1) {
            this.once('loaderror', function () {
                this._emit('playerror', createError('Source failed to give data', 'ESRC'));
            }, this);
        }
    };

    // Abstract functions
    if (false) {
        Sound.prototype._load = function () { throw new Error('Not implemented'); };
        Sound.prototype._abort = function () { throw new Error('Not implemented'); };
        Sound.prototype._destroy = function () { throw new Error('Not implemented'); };
        Sound.prototype._play = function () { throw new Error('Not implemented'); };
        Sound.prototype._stop = function () { throw new Error('Not implemented'); };
        Sound.prototype._pause = function () { throw new Error('Not implemented'); };
        Sound.prototype._resume = function () { throw new Error('Not implemented'); };
        Sound.prototype._seekTo = function (pos) { throw new Error('Not implemented'); };
        Sound.prototype._setVolume = function (vol) { throw new Error('Not implemented'); };
        Sound.prototype._getDuration = function (vol) { throw new Error('Not implemented'); };

        Sound.isCompatible = function () { throw new Error('Not implemented'); };
        Sound.canPlayType = function () { throw new Error('Not implemented'); };
    }

    // Functions that can be overriden
    Sound.prototype._destroy = function () {};

    return Sound;
});

/*jshint bitwise:false*/

define('audio/sounds/Html5Sound',[
    './Sound',
    '../util/createError'
], function (Sound, createError) {

    var isCompatible;

    if (typeof Audio === 'undefined') {
        isCompatible = false;
    } else {
        // Check if the buffered property is supported since
        // it got added in the middle of the draft
        isCompatible = !!(new Audio()).buffered;
    }

    function Html5Sound(url) {
        Sound.call(this);

        this._url = url;

        // Callbacks
        this._onAudioTimeUpdate = this._onAudioTimeUpdate.bind(this);
        this._onAudioWaiting = this._onAudioWaiting.bind(this);
        this._onAudioSeeked = this._onAudioSeeked.bind(this);
        this._onAudioEnded = this._onAudioEnded.bind(this);
        this._onAudioError = this._onAudioError.bind(this);
        this._onAudioProgress = this._onAudioProgress.bind(this);
        this._checkLoaded = this._checkLoaded.bind(this);

        // Init
        this._onSelfInit();
    }

    // Inherit from Sound
    Html5Sound.prototype = Object.create(Sound.prototype);
    Html5Sound.prototype.constructor = Html5Sound;

    // ----------------

    Html5Sound.isCompatible = function () {
        return isCompatible;
    };

    Html5Sound.canPlayType = function (type) {
        if (!this.isCompatible()) {
            return false;
        }

        if (type.indexOf('/') === -1) {
            type = 'audio/' + type;
        }

        if (!this.isCompatible()) {
            return false;
        }

        return !!(new Audio()).canPlayType(type);
    };

    // ----------------

    Html5Sound.prototype._load = function () {
        // Create audio object
        this._audio = this._createAudio(this._url);

        // Add load listeners
        this._addLoadListeners();

        // Load
        this._audio.load();
    };

    Html5Sound.prototype._abort = function () {
        // Remove load listeners
        this._removeLoadListeners();

        // Abort loading
        this._audio.pause();
        this._audio.removeAttribute('src');
    };

    Html5Sound.prototype._destroy = function () {
        this._audio = null;
    };

    Html5Sound.prototype._play = function () {
        // Add play listeners
        this._addPlayListeners();

        // Play audio
        this._audio.play();
    };

    Html5Sound.prototype._stop = function () {
        this._played = false;

        // Remove play listeners
        this._removePlayListeners();

        // Stop audio
        this._audio.pause();

        // If readyState is 0, we can't set position to 0
        if (this._audio.readyState) {
            this._audio.currentTime = 0;
        }
    };

    Html5Sound.prototype._pause = function () {
        this._audio.pause();
    };

    Html5Sound.prototype._resume = function () {
        this._audio.play();
    };

    Html5Sound.prototype._seekTo = function (position) {
        // If readyState is 0, we can't seek yet
        if (this._audio.readyState) {
            this._audio.currentTime = position;
        }
    };

    Html5Sound.prototype._setVolume = function (volume) {
        this._audio.volume = volume;
    };

    Html5Sound.prototype._getPosition = function () {
        return this._audio.currentTime;
    };

    // --------------

    Html5Sound.prototype._createAudio = function (url) {
        var audio = new Audio();

        audio.controls = false;
        audio.autoplay = false;
        audio.preload = 'none';
        audio.autobuffer = false;  // Opera uses a non-standard property

        audio.setAttribute('src', url);

        return audio;
    };

    Html5Sound.prototype._getDuration = function () {
        var duration = this._audio.duration;

        return duration && duration !== Infinity ? duration : null;
    };

    Html5Sound.prototype._addLoadListeners = function () {
        // Attach listeners
        this._audio.addEventListener('error', this._onAudioError);
        this._audio.addEventListener('progress', this._onAudioProgress);

        // Start a timer to check if the load as finished
        // There's no other reliable way to do that because sometimes
        // progress event is not even emitted
        this._checkLoadedTimer = setInterval(this._checkLoaded, 500);
    };

    Html5Sound.prototype._removeLoadListeners = function () {
        // Detach listeners
        this._audio.removeEventListener('error', this._onAudioError);
        this._audio.removeEventListener('progress', this._onAudioProgress);

        // Cancel check load interval
        clearInterval(this._checkLoadedTimer);
        this._checkLoadedTimer = null;
    };

    Html5Sound.prototype._addPlayListeners = function () {
        this._audio.addEventListener('timeupdate', this._onAudioTimeUpdate);
        this._audio.addEventListener('seeked', this._onAudioSeeked);
        this._audio.addEventListener('ended', this._onAudioEnded);
    };

    Html5Sound.prototype._removePlayListeners = function () {
        this._audio.removeEventListener('timeupdate', this._onAudioTimeUpdate);
        this._audio.removeEventListener('waiting', this._onAudioWaiting);
        this._audio.removeEventListener('seeked', this._onAudioSeeked);
        this._audio.removeEventListener('ended', this._onAudioEnded);
    };

    // -----------------

    Html5Sound.prototype._onAudioTimeUpdate = function () {
        var duration,
            position;

        // Ignore if paused because this still gets called one or two times
        // after paused
        if (this._playState === 3) {
            return;
        }

        // If this is the first play progress, report play start
        if (!this._played) {
            this._played = true;
            this._audio.addEventListener('waiting', this._onAudioWaiting);
            this._emit('playstart');
        }

        duration = this._getDuration();
        if (duration) {
            position = this._audio.currentTime;
            !this._reportedLoad && this._onAudioProgress();
            this._emit('playprogress', position, duration);
        }
    };

    Html5Sound.prototype._onAudioWaiting = function () {
        this._emit('playwaiting');
    };

    Html5Sound.prototype._onAudioEnded = function () {
        this._emit('playfinish');
    };

    Html5Sound.prototype._onAudioError = function (error) {
        // Remove load listeners
        this._removeLoadListeners();

        // Clear source
        this._audio.removeAttribute('src');

        this._emit('loaderror', createError('Unable to load sound', 'ELOAD'));
    };

    Html5Sound.prototype._onAudioSeeked = function () {
        var duration = this._getDuration(),
            position = this._audio.currentTime;

        this._emit('seeked', position, duration);
    };

    Html5Sound.prototype._checkLoaded = function () {
        var duration = this._getDuration(),
            buffered = this._audio.buffered;

        if (buffered.length && duration) {
            // Floor to 2 decimal houses
            // We use ~~because it's faster
            buffered = ~~(buffered.end(0) * 100) / 100;
            duration = ~~(duration * 100) / 100;

            if (buffered === duration) {
                // Remove all load listeners, including canceling the timer
                this._removeLoadListeners();

                // Emit!
                this._emit('loadfinish');
            }
        }
    };

    Html5Sound.prototype._onAudioProgress = function (event) {
        var currentTime = this._audio.currentTime,
            timeRanges = this._audio.buffered,
            timeRangeIndex = -1,
            timeRangesLength,
            x,
            duration = this._getDuration();

        // Find the timeRange in which the current position is
        if (timeRanges && duration) {
            timeRangesLength = timeRanges.length;
            for (x = 0; x < timeRangesLength; x += 1) {
                if (timeRanges.start(x) <= currentTime && timeRanges.end(x) >= currentTime) {
                    timeRangeIndex = x;
                    break;
                }
            }

            if (timeRangeIndex !== -1) {
                if (event) {
                    this._reportedLoad = true;
                }
                this._emit('loadprogress', timeRanges.start(x) / duration, timeRanges.end(x) / duration);
            }
        }
    };

    return Html5Sound;
});

define('js/track',[],function () {

    

    var buffer = [];

    function ready(readyCallback) {
        var mixpanelLoadPoll;

        // Poll mixpanel global until ready
        mixpanelLoadPoll = setInterval(function () {
            // If not yet loaded, return
            if (typeof mixpanel === 'undefined') {
                return;
            }

            clearInterval(mixpanelLoadPoll);
            readyCallback();
        }, 300);
    }

    function track(action, props) {
        if (window.mixpanel) {
            mixpanel.track(action, props);
            return;
        }

        buffer.push({
            action: action,
            props: props
        });
    }

    ready(function () {
        var x,
            entry,
            length = buffer.length;

        for (x = 0; x < length; x += 1) {
            entry = buffer[x];
            mixpanel.track(entry.action, entry.props);
        }

        buffer = [];
    });

    return track;
});
define('js/ads',[
    'audio/sounds/Html5Sound',
    'jquery',
    'js/track'
], function (Html5Sound, $, track) {

    

    function baboomAds(files, onError) {
        $(document).ready(function () {
            var index = 0,
                sound,
                audioPlayerEl = $('.audio-player'),
                titleEl = $('.music-title'),
                previousBtn = $('.btn-control.prev'),
                nextBtn = $('.btn-control.next'),
                playPauseBtn = $('.btn-control.play-pause'),
                leftBlockEl = $('.good-times-left-block'),
                rightBlockEl = $('.good-times-right-block');

            function setTitle(index) {
                var duration = titleEl.html().length ? 200 : 0;

                titleEl.fadeOut(duration, function () {
                    titleEl.html(files[index].title);
                    titleEl.css('font-size', files[index].fontSize || '');
                    titleEl.css('top', files[index].top || '');

                    titleEl.fadeIn(duration);
                });
            }

            function play(index) {
                var entry = files[index];

                audioPlayerEl.removeClass('paused').addClass('playing');

                sound && sound.destroy();
                sound = new Html5Sound(entry.url);
                sound.init(function (err) {
                    if (err) {
                        onError && onError(err);
                        return;
                    }

                    sound.play();
                })
                .on('playfinish', function () {
                    index += 1;
                    if (index > files.length - 1) {
                        stop();
                    } else {
                        setTitle(index);
                        play(index);
                    }
                })
                .on('playprogress', onPlayProgress)
                .on('loaderror', function (err) {
                    audioPlayerEl.removeClass('playing paused');
                    onError && onError(err);
                })
                .on('playerror', function (err) {
                    audioPlayerEl.removeClass('playing paused');
                    onError && onError(err);
                });
            }

            function onPlayProgress(pos) {
                if (pos >= 5) {
                    track('play', {
                        nr: index + 1,
                        title: files[index].title,
                        nrBlocks: getNrBlocks()
                    });

                    sound.off('playprogress', onPlayProgress);
                }
            }

            function stop() {
				if (typeof sound == 'undefined') return;
                index = 0;
                sound.stop();
                setTitle(index);
                audioPlayerEl.removeClass('paused playing');
            }
			
			window.stopBaboom = stop;
			

            function getNrBlocks() {
                var nrBlocks = 0;

                if (leftBlockEl.is(':visible')) {
                    nrBlocks += 1;
                }
                if (rightBlockEl.is(':visible')) {
                    nrBlocks += 1;
                }

                return nrBlocks;
            }

            // Controls
            previousBtn.on('click', function () {
                index -= 1;
                if (index < 0) {
                    index = files.length - 1;
                }

                setTitle(index);
                play(index);
            });

            nextBtn.on('click', function () {
                index += 1;
                if (index > files.length - 1) {
                    index = 0;
                }

                setTitle(index);
                play(index);
            });

            playPauseBtn.on('click', function () {
                if (!sound || !sound.getPlayState()) {
                    play(index);
                } else {
                    if (sound.getPlayState() === 3) {
                        audioPlayerEl.removeClass('paused').addClass('playing');
                        sound.resume();
                    } else {
                        audioPlayerEl.addClass('paused').removeClass('playing');
                        sound.pause();
                    }
                }
            });

            // Click ads tracking
            leftBlockEl.on('click', function () {
                track('click', {
                    origin: 'left-block',
                    nrBlocks: getNrBlocks()
                });
            });
            rightBlockEl.on('click', 'a', function () {
                track('click', {
                    origin: 'right-block',
                    nrBlocks: getNrBlocks()
                });
            });

            // Set first music title
            files.length && setTitle(0);
        });
    }
	
	//console.log(sound);
	
    window.baboomAds = baboomAds;

    return baboomAds;
});
require(['js/ads'], function () {}, null, true);
}());