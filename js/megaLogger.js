(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * MegaLogger
 */
;(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        if(typeof(window) !== 'undefined') {
            window.MegaLogger = module.exports;
        }
    } else {
        root.MegaLogger = factory();
        if(typeof(window) !== 'undefined') {
            window.MegaLogger = root.MegaLogger;
        }
    }
}(this, /** @lends MegaLogger */ function () {
    var extend = require("extend");
    var isfunction = require("isfunction");
    var clone = require("clone");



    /**
     * Simple .toArray method to be used to convert `arguments` to a normal JavaScript Array
     *
     * @private
     * @param val {Arguments}
     * @returns {Array}
     */
    function toArray(val) {
        return Array.prototype.slice.call(val, val);
    };


    /**
     * Mega Logger
     *
     * @param name {string}
     *     Name of the database (a-zA-Z0-9_-).
     * @param options {Object}
     *     See {MegaLogger.DEFAULT_OPTIONS}.
     * @param parentLogger {string|object}
     *     Name of or reference to a parent logger.
     * @returns {MegaLogger}
     * @constructor
     */
    function MegaLogger(name, options, parentLogger) {
        this.name = name;
        if(typeof(parentLogger) === 'object') {
            parentLogger = parentLogger.name;
        }
        if(typeof(MegaLogger.rootLogger) == "undefined" && parentLogger !== false) {
            MegaLogger.rootLogger = new MegaLogger("", {
                isEnabled: true
            }, false);
        }
        this.parentLogger = parentLogger ? parentLogger : "";
        this.options = extend({}, clone(MegaLogger.DEFAULT_OPTIONS), options);

        return this;
    };

    //makeObservable(MegaLogger);

    /**
     * Static, log levels
     *
     * @public
     * @enum {number}
     * @static
     */
    MegaLogger.LEVELS = {
        'ERROR': 40,
        'WARN': 30,
        'INFO': 20,
        'LOG': 10,
        'DEBUG': 0
    };

    /**
     * Static, global log registry
     *
     * @private
     * @static
     */
    MegaLogger._logRegistry = {};

    /**
     * Returns true IF the currently detected environment (browser/phantomjs/nodejs) supports console formatting or
     * false if not
     *
     * @returns {boolean}
     * @private
     */
    MegaLogger._environmentHaveSupportForColors = function() {
        var isBrowser = true;
        var isIE = false;

        if (typeof(window) === 'undefined') {
            isBrowser = false;
        }
        else if (typeof(window) !== 'undefined' && /PhantomJS/.test(window.navigator.userAgent)) {
            isBrowser = false;
        } else if (
            typeof(window) !== 'undefined' && (
            /MSIE/.test(window.navigator.userAgent) ||
            /Trident/.test(window.navigator.userAgent) ||
            /Edge/.test(window.navigator.userAgent)
            )
        ) {
            isIE = true;
        }

        return (isBrowser === true && isIE === false);
    };

    /**
     * Static, default options
     *
     * @public
     * @static
     */
    MegaLogger.DEFAULT_OPTIONS = {
        'colorsEnabled': MegaLogger._environmentHaveSupportForColors(), /* use this only in browsers */
        'levelColors': {
            'ERROR': '#ff0000',
            'DEBUG': '#0000ff',
            'WARN': '#C25700',
            'INFO': '#00899E',
            'LOG': '#000000'
        },
        'dateFormatter': function(d) {
            return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "." + d.getMilliseconds();
        },
        'transport': function() {
            var level = Array.prototype.slice.call(arguments, 0);
            var args = level.splice(1);
            var fn = "log";

            if(level == MegaLogger.LEVELS.DEBUG) {
                fn = "debug"
            } else if(level == MegaLogger.LEVELS.LOG) {
                fn = "log"
            } else if(level == MegaLogger.LEVELS.INFO) {
                fn = "info"
            } else if(level == MegaLogger.LEVELS.WARN) {
                fn = "warn"
            } else if(level == MegaLogger.LEVELS.ERROR) {
                fn = "error"
            }

            console[fn].apply(console, args);
        },
        'isEnabled': function() {
            return MegaLogger.rootLogger.isEnabled(); // alias
        },
        'muteList': function() {
            if(typeof(sessionStorage) !== 'undefined' && sessionStorage.muteList) {
                return JSON.parse(sessionStorage.muteList);
            } else if(typeof(localStorage) !== 'undefined' && localStorage.muteList) {
                return JSON.parse(localStorage.muteList)
            } else {
                return [];
            }
        },
        'minLogLevel': function() {
            if(typeof(sessionStorage) !== 'undefined' && sessionStorage.minLogLevel) {
                return JSON.parse(sessionStorage.minLogLevel);
            } else if(typeof(sessionStorage) !== 'undefined' && localStorage.minLogLevel) {
                return JSON.parse(localStorage.minLogLevel)
            } else {
                return MegaLogger.LEVELS.INFO;
            }
        },
        /**
         * Warning: This will use tons of CPU because of the trick of
         * JSON.serialize/.stringify we are using for dereferencing
         */
        'dereferenceObjects': false
    };




    /**
     * Factory function to return a {@link MegaLogger} instance.
     *
     * @param name {string}
     *     Name of the database (a-zA-Z0-9_-).
     * @param options {Object}
     *     See {@link MegaLogger.DEFAULT_OPTIONS}.
     * @param parentLogger {string|object}
     *     Name of or reference to a parent logger.
     * @returns {MegaLogger}
     * @static
     */
    MegaLogger.getLogger = function(name, options, parentLogger) {
        if(typeof(parentLogger) === 'object') {
            parentLogger = parentLogger.name;
        }

        if(typeof(MegaLogger._logRegistry[name]) == "undefined") {
            MegaLogger._logRegistry[name] = new MegaLogger(name, options, parentLogger);
        }
        return MegaLogger._logRegistry[name];
    };


    /**
     * Converts enum to text/label
     *
     * @param intVal {number} enum to text converter helper
     * @returns {string} the text representation of the `intVal`
     * @private
     * @static
     */
    MegaLogger._intToLevel = function(intVal) {
        var levelName = "unknown";

        Object.keys(MegaLogger.LEVELS).forEach(function(k) {
            var v = MegaLogger.LEVELS[k];
            if(intVal === v) {
                levelName = k;
                return false;
            }
        });

        return levelName;
    };

    /**
     * Formats a breadcrumb/path for a logger (e.g. pkg:subpkg:subsubpkg)
     * @returns {string}
     * @private
     */
    MegaLogger.prototype._getLoggerPath = function() {
        var path = this.name;

        var parent = MegaLogger._logRegistry[this.parentLogger];
        while(parent) {
            if(parent.name && parent.name.length > 0) {
                path = parent.name + ":" + path;
            }
            parent = MegaLogger._logRegistry[parent.parentLogger];
        }
        return path;
    };

    /**
     * Send the passed `arguments` to the specific `level` logger
     *
     * @param level {number}
     * @param arguments {*}
     * @private
     */
    MegaLogger.prototype._log = function(level, arguments) {
        var self = this;

        var levelName = MegaLogger._intToLevel(level);
        var clr = self.options.levelColors[levelName];
        var logStyle = "color: " + "white" + "; background-color: " +  clr + "; padding-left: 1px; padding-right: 1px;";


        var args = [
            (self.options.colorsEnabled ? "%c" : "") + self.options.dateFormatter(new Date()) + " - " + self._getLoggerPath() + " - " + levelName,
            (self.options.colorsEnabled ? logStyle : "")
        ];

        args = args.concat(arguments);
        if(self.options.dereferenceObjects) {
            args = JSON.parse(JSON.stringify(args));
        }

        if(self.options.isEnabled === true || (isfunction(self.options.isEnabled) && self.options.isEnabled())) {


            var txtMsg = args.join(" ");
            var muted = false;
            self.options.muteList().forEach(function(v) {
                var r = new RegExp(v);
                if(r.test(txtMsg)) {
                    muted = true;
                    return false; // break;
                }
            });

            if(muted) {
                return;
            }

            if(level < self.options.minLogLevel()) { // check min log level
                return;
            }

            self.options.transport.apply(this, [level].concat(args));

            if(level == MegaLogger.LEVELS.ERROR && typeof(mocha) == "undefined") {
                var text;
                //var noColorMsg = clone(args); // convert back to plain text before sending to the server
                var noColorMsg = extend(true, {}, {'r': args})['r']; // convert back to plain text before sending to the server
                if(noColorMsg[0].substr(0, 2) == "%c") {
                    noColorMsg[0] = noColorMsg[0].replace("%c", "");
                    delete noColorMsg[1];
                    noColorMsg.splice(1, 1);
                }
                // remove date
                noColorMsg[0] = noColorMsg[0].split(":")[2];
                noColorMsg[0] = noColorMsg[0].substr(noColorMsg[0].indexOf(" - ") + 3, noColorMsg[0].length);

                try {
                    text = JSON.stringify(noColorMsg);
                } catch(e) {
                    text = noColorMsg.join(' ');
                }

                var fn = "log";
                if(level == MegaLogger.LEVELS.DEBUG) {
                    fn = "debug"
                } else if(level == MegaLogger.LEVELS.LOG) {
                    fn = "log"
                } else if(level == MegaLogger.LEVELS.INFO) {
                    fn = "info"
                } else if(level == MegaLogger.LEVELS.WARN) {
                    fn = "warn"
                } else if(level == MegaLogger.LEVELS.ERROR) {
                    fn = "error"
                }

                var callbackName = "on" + fn.substr(0, 1).toUpperCase() + fn.substr(1);
                if(this.options[callbackName]) {
                    this.options[callbackName].apply(this, [text]);
                }

                if(MegaLogger.rootLogger.options[callbackName]) {
                    MegaLogger.rootLogger.options[callbackName].apply(this, [text]);
                }
            }
        }

    };

    /**
     * Returns `.options.isEnabled` and converts it to a boolean (if it is a dynamic function)
     *
     * @public
     * @returns {boolean}
     */
    MegaLogger.prototype.isEnabled = function() {
        var isEnabled = this.options.isEnabled;
        if(isfunction(isEnabled)) {
            return isEnabled();
        } else {
            return isEnabled;
        }
    };


    /**
     * Logs a message with a log level ERROR
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.error = function() {
        this._log(MegaLogger.LEVELS.ERROR, toArray(arguments));
    };

    /**
     * Logs a message with a log level WARN
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.warn = function() {
        this._log(MegaLogger.LEVELS.WARN, toArray(arguments));
    };

    /**
     * Logs a message with a log level INFO
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.info = function() {
        this._log(MegaLogger.LEVELS.INFO, toArray(arguments));
    };

    /**
     * Logs a message with a log level LOG
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.log = function() {
        this._log(MegaLogger.LEVELS.LOG, toArray(arguments));
    };

    /**
     * Logs a message with a log level DEBUG
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.debug = function() {
        this._log(MegaLogger.LEVELS.DEBUG, toArray(arguments));
    };


    /**
     * @function MegaLogger#error
     * @param {*} the message parts to be logged (any number of arguments are allowed, as in the native console.log)
     * @public
     */



    return MegaLogger;
}));

},{"clone":2,"extend":3,"isfunction":4}],2:[function(require,module,exports){
'use strict';

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

// shim for Node's 'util' package
// DO NOT REMOVE THIS! It is required for compatibility with EnderJS (http://enderjs.com/).
var util = {
  isArray: function (ar) {
    return Array.isArray(ar) || (typeof ar === 'object' && objectToString(ar) === '[object Array]');
  },
  isDate: function (d) {
    return typeof d === 'object' && objectToString(d) === '[object Date]';
  },
  isRegExp: function (re) {
    return typeof re === 'object' && objectToString(re) === '[object RegExp]';
  },
  getRegExpFlags: function (re) {
    var flags = '';
    re.global && (flags += 'g');
    re.ignoreCase && (flags += 'i');
    re.multiline && (flags += 'm');
    return flags;
  }
};


if (typeof module === 'object')
  module.exports = clone;

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/

function clone(parent, circular, depth, prototype) {
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (util.isArray(parent)) {
      child = [];
    } else if (util.isRegExp(parent)) {
      child = new RegExp(parent.source, util.getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (util.isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }
      
      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

},{}],3:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],4:[function(require,module,exports){
// if (typeof require !== 'undefined') {}

var isFunction = function (functionToCheck) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = isFunction;
}
},{}]},{},[1]);
