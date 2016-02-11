/**
 * MegaLogger
 */
;(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    }
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    }
    else {
        root.MegaLogger = factory();
    }
}(this, /** @lends MegaLogger */ function () {

    /**
     * Internal/private dict to store the session/localStorage values, so that we can improve the performance of
     * .log (.debug, .error, .info, .log, etc) calls without the need of always hitting the local/sessionStorage
     *
     * @private
     * @type {{}}
     */
    var storageCache = {};

    /**
     * Lazy loader of local/sessionStorage values that will be cached in memory so that no more local/sessionStorage
     * queries will be done in the next calls.
     *
     * @param k
     * @returns {*}
     */
    var getStorageCacheValue = function(k) {
        if (!storageCache.hasOwnProperty(k)) {
            var value;

            if (typeof(sessionStorage) !== 'undefined' && k in sessionStorage) {
                value = sessionStorage[k];
            }
            else if (typeof(localStorage) !== 'undefined' && k in localStorage) {
                value = localStorage[k];
            }

            if (value !== undefined) {
                try {
                    value = JSON.parse(value);
                }
                catch (ex) {}
            }

            storageCache[k] = value;
        }
        return storageCache[k];
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
        if (typeof(parentLogger) === 'object') {
            parentLogger = parentLogger.name;
        }

        if (typeof(MegaLogger.rootLogger) === "undefined" && parentLogger !== false) {
            MegaLogger.rootLogger = new MegaLogger("", {
                isEnabled: getStorageCacheValue('d') == 1
            }, false);
        }
        this.options = options || {};
        this.parentLogger = parentLogger || "";

        for (var key in MegaLogger.DEFAULT_OPTIONS) {
            if (MegaLogger.DEFAULT_OPTIONS.hasOwnProperty(key)
                && !this.options.hasOwnProperty(key)) {
                this.options[key] = MegaLogger.DEFAULT_OPTIONS[key];
            }
        }

        return this;
    }

    /**
     * Static, log levels
     *
     * @public
     * @enum {number}
     * @static
     */
    MegaLogger.LEVELS = {
        'CRITICAL': 50,
        'ERROR': 40,
        'WARN': 30,
        'INFO': 20,
        'LOG': 10,
        'DEBUG': 0
    };

    /**
     * Static, converts enum to text/label
     *
     * @private
     * @static
     */
    var _intToLevel = {
        '50': 'CRITICAL',
        '40': 'ERROR',
        '30': 'WARN',
        '20': 'INFO',
        '10': 'LOG',
        '0': 'DEBUG'
    };

    /**
     * Static, global log registry
     *
     * @private
     * @static
     */
    var _logRegistry = {};

    /**
     * Returns true IF the currently detected environment (browser/phantomjs/nodejs) supports console formatting or
     * false if not
     *
     * @returns {boolean}
     * @private
     */
    function _environmentHaveSupportForColors() {
        var isBrowser = true;
        var isIE = false;

        if (typeof(window) === 'undefined' || /PhantomJS/.test(window.navigator.userAgent)) {
            isBrowser = false;
        }
        else if ("ActiveXObject" in window) {
            isIE = true;
        }

        return (isBrowser === true && isIE === false);
    }

    /**
     * Static, default options
     *
     * @public
     * @static
     */
    MegaLogger.DEFAULT_OPTIONS = {
        'colorsEnabled': _environmentHaveSupportForColors(), /* use this only in browsers */
        'levelColors': {
            'CRITICAL': '#930025',
            'ERROR': '#ff0000',
            'DEBUG': '#0000ff',
            'WARN': '#C25700',
            'INFO': '#00899E',
            'LOG': '#000000'
        },
        'dateFormatter': function(d) {
            return d.toISOString();
        },
        'transport': function(level, args) {
            var fn = "log";

            if (level === MegaLogger.LEVELS.DEBUG) {
                fn = "debug";
            }
            else if (level === MegaLogger.LEVELS.LOG) {
                fn = "log";
            }
            else if (level === MegaLogger.LEVELS.INFO) {
                fn = "info";
            }
            else if (level === MegaLogger.LEVELS.WARN) {
                fn = "warn";
            }
            else if (level === MegaLogger.LEVELS.ERROR) {
                fn = "error";
            }
            else if (level === MegaLogger.LEVELS.CRITICAL) {
                fn = "error";
            }

            console[fn].apply(console, args);
        },
        'isEnabled': function() {
            return MegaLogger.rootLogger.isEnabled(); // alias
        },
        'muteList': function() {
            var cached = getStorageCacheValue("muteList");
            if (cached !== undefined) {
                return cached;
            }
            return [];
        },
        'minLogLevel': function() {
            var cached = getStorageCacheValue("minLogLevel");
            if (cached !== undefined) {
                return cached;
            }
            return MegaLogger.LEVELS.INFO;
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
        if (typeof(parentLogger) === 'object') {
            parentLogger = parentLogger.name;
        }

        if (typeof(_logRegistry[name]) === "undefined") {
            _logRegistry[name] = new MegaLogger(name, options, parentLogger);
        }
        return _logRegistry[name];
    };


    /**
     * Formats a breadcrumb/path for a logger (e.g. pkg:subpkg:subsubpkg)
     * @returns {string}
     * @private
     */
    MegaLogger.prototype._getLoggerPath = function() {
        var path = this.name;

        var parent = _logRegistry[this.parentLogger];
        while (parent) {
            if (parent.name && parent.name.length > 0) {
                path = parent.name + ":" + path;
            }
            parent = _logRegistry[parent.parentLogger];
        }
        return path;
    };

    /**
     * Send the passed `arguments` to the specific `level` logger
     *
     * @param level {number}
     * @param args {*}
     * @private
     */
    MegaLogger.prototype._log = function() {
        var options = this.options;
        var level = this._level;

        // check min log level
        if (level < options.minLogLevel()) {
            return;
        }

        if (this.isEnabled()) {
            var logDate;
            var logLine;
            var logStyle = "";
            var logSeparator = ' - ';
            var logPath = this._getLoggerPath();
            var levelName = _intToLevel[level] || "unknown";

            var len = arguments.length;
            var args = Array(len);
            while (len--) {
                args[len] = arguments[len];
            }

            if (options.printDate !== false) {
                logDate = options.dateFormatter(new Date());
                if (logDate) {
                    logDate += logSeparator;
                }
            }

            logLine = (logDate || '') + logPath + logSeparator + levelName;

            // Append the first argument as long it's a string to support substitutions
            if (typeof args[0] === 'string') {
                logLine += ' ' + args.shift();
            }

            // nodejs 0.12.7 doesn't support string substitutions
            if (typeof window === 'undefined' && typeof process !== 'undefined') {
                logLine = logLine.replace(/%[sfdi]/g, function(m) {
                    if (m === '%s') {
                        return String(args.shift());
                    }
                    else if (m === '%f') {
                        return parseFloat(args.shift()).toFixed(6);
                    }
                    else {
                        return parseInt(args.shift());
                    }
                });
            }

            if (options.colorsEnabled) {
                var clr = options.levelColors[levelName];
                logStyle = "color: white; background-color: " +  clr + "; padding-left: 1px; padding-right: 1px;";
                logLine = "%c" + logLine;
            }

            args = [logLine, logStyle].concat(args);
            if (options.dereferenceObjects) {
                args = JSON.parse(JSON.stringify(args));
            }

            var muteList = options.muteList();
            if (muteList.length) {
                var txtMsg = args.join(" ");
                if (muteList.some(function(v) { return RegExp(v).test(txtMsg); })) {
                    return;
                }
            }

            options.transport.call(this, level, args);

            if (level === MegaLogger.LEVELS.CRITICAL && typeof(mocha) === "undefined") {
                var text;
                // convert back to plain text before sending to the server
                if (options.colorsEnabled) {
                    args[0] = args[0].substr(2);
                    args.splice(1, 1);
                }
                // remove date
                if (logDate) {
                    args[0] = args[0].substr(args[0].indexOf(logSeparator) + logSeparator.length);
                }
                // remove level (and trailing space)
                args[0] = args[0].substr(args[0].indexOf(levelName) + levelName.length + 1);

                // if a single item, send it as-is
                if (args.length === 1) {
                    text = args[0];
                }
                else {
                    try {
                        text = JSON.stringify(args);
                    }
                    catch (e) {
                        text = args.join(' ');
                    }
                }

                var callbackName = "on" +
                                    levelName.substr(0, 1) +
                                    levelName.substr(1).toLowerCase();

                if (this.options[callbackName]) {
                    this.options[callbackName].call(this, text, logPath);
                }

                if (MegaLogger.rootLogger.options[callbackName]) {
                    MegaLogger.rootLogger.options[callbackName].call(this, text, logPath);
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
        if (typeof isEnabled === 'function') {
            return isEnabled();
        }
        return isEnabled;
    };


    /**
     * Logs a message with a log level ERROR
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.error = function() {
        this._level = MegaLogger.LEVELS.ERROR;
        this._log.apply(this, arguments);
    };

    /**
     * Logs a message with a log level CRITICAL
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.critical = function() {
        this._level = MegaLogger.LEVELS.CRITICAL;
        this._log.apply(this, arguments);
    };

    /**
     * Logs a message with a log level WARN
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.warn = function() {
        this._level = MegaLogger.LEVELS.WARN;
        this._log.apply(this, arguments);
    };

    /**
     * Logs a message with a log level INFO
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.info = function() {
        this._level = MegaLogger.LEVELS.INFO;
        this._log.apply(this, arguments);
    };

    /**
     * Logs a message with a log level LOG
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.log = function() {
        this._level = MegaLogger.LEVELS.LOG;
        this._log.apply(this, arguments);
    };

    /**
     * Logs a message with a log level DEBUG
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.debug = function() {
        this._level = MegaLogger.LEVELS.DEBUG;
        this._log.apply(this, arguments);
    };


    /**
     * @function MegaLogger#error
     * @param {*} the message parts to be logged (any number of arguments are allowed, as in the native console.log)
     * @public
     */



    return MegaLogger;
}));
