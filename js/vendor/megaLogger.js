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
    'use strict';

    /**
     * Static, global log registry
     *
     * @private
     * @static
     */
    const _logRegistry = new Map();

    /**
     * Internal/private dict to store the session/localStorage values, so that we can improve the performance of
     * .log (.debug, .error, .info, .log, etc) calls without the need of always hitting the local/sessionStorage
     *
     * @private
     * @type {{}}
     */
    const storageCache = Object.create(null);

    /**
     * Lazy loader of local/sessionStorage values that will be cached in memory so that no more local/sessionStorage
     * queries will be done in the next calls.
     *
     * @param k
     * @returns {*}
     */
    var getStorageCacheValue = function(k) {
        if (!(k in storageCache)) {
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
                catch (ex) {
                }
            }

            storageCache[k] = value;
        }
        return storageCache[k];
    };

    const getYIQThreshold = function(bg) {
        bg = parseInt(bg.slice(1), 16);
        const R = bg >> 16;
        const G = bg >> 8 & 0xff;
        const B = bg & 0xff;
        return R * 0.299 + G * 0.587 + B * 0.114;
    };

    /**
     * Mega Logger
     *
     * @param name {string|function}
     *     Name of the database (a-zA-Z0-9_-).
     * @param [options] {Object}
     *     See {MegaLogger.DEFAULT_OPTIONS}.
     * @param [parentLogger] {string|object}
     *     Name of or reference to a parent logger.
     * @returns {MegaLogger}
     * @constructor
     */
    function MegaLogger(name, options, parentLogger) {
        Object.defineProperty(this, 'options', {
            value: Object.assign(Object.create(null), MegaLogger.DEFAULT_OPTIONS, options)
        });
        Object.defineProperty(this, 'parent', {value: parentLogger && new WeakRef(parentLogger)});
        Object.defineProperty(this, 'name', typeof name === 'function' ? {get: name} : {value: name});
    }

    if (typeof lazy === 'undefined') {
        self.lazy = (t, p, s) => Object.defineProperty(t, p, {value: s.call(t)});
        self.MEGAException = DOMException;
        self.srvlog = console.error;
    }

    /** @property MegaLogger.rootLogger */
    lazy(MegaLogger, 'rootLogger', () => {
        return new MegaLogger("", {
            throwOnAssertFail: true,
            onCritical: function(msg, pkg) {
                msg = String(msg).split(':').pop().split(/[^\w\s]/)[0].trim().substr(0, 96);

                if (typeof pkg === 'string') {
                    pkg = pkg.split('[').shift();

                    if (pkg) {
                        msg = '[' + pkg + '] ' + msg;
                    }
                }

                if (msg.length > 7) {

                    srvlog(msg, 0, 1);
                }
            }
        });
    });

    /**
     * Static, log levels
     *
     * @public
     * @enum {number}
     * @static
     */
    MegaLogger.LEVELS = freeze({
        'CRITICAL': 50,
        'ERROR': 40,
        'WARN': 30,
        'INFO': 20,
        'LOG': 10,
        'DEBUG': 0
    });

    /**
     * Static, converts enum to text/label
     *
     * @private
     * @static
     */
    const _intToLevel = freeze({
        '50': 'CRITICAL',
        '40': 'ERROR',
        '30': 'WARN',
        '20': 'INFO',
        '10': 'LOG',
        '0': 'DEBUG'
    });

    /**
     * Static level to Console API function name.
     *
     * @private
     */
    const _intLevelToCall = freeze({
        '50': 'error',
        '40': 'error',
        '30': 'warn',
        '20': 'info',
        '10': 'log',
        '0': 'debug'
    });

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
            console[_intLevelToCall[level] || 'log'](...args);
        },
        'isEnabled': function() {
            return (self.d || getStorageCacheValue('d')) > 0;
        },
        'minLogLevel': function() {
            var cached = getStorageCacheValue("minLogLevel");
            if (cached !== undefined) {
                return cached;
            }
            return MegaLogger.LEVELS.INFO;
        },
        'adaptiveTextColor': false,
        'throwOnAssertFail': false,
        'captureLastLogLine': false,
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
        let logger = _logRegistry.has(name) && _logRegistry.get(name).deref();
        if (!logger || parentLogger && !logger.parent) {
            const _ref = typeof parentLogger === 'string' && ((name) => ({
                get name() {
                    return MegaLogger.getLogger(name, null, false).name;
                }
            }))(parentLogger);

            logger = new MegaLogger(name, options, _ref || parentLogger);
            if (_ref) {
                Object.defineProperty(logger, '$_weakRef_', {value: _ref});
            }
            _logRegistry.set(name, new WeakRef(logger));
        }

        return logger;
    };


    /**
     * Formats a breadcrumb/path for a logger (e.g. pkg:subpkg:subsubpkg)
     * @returns {string}
     */
    MegaLogger.prototype.getLoggerPath = function() {
        let path = this.name, parent = this.parent;

        while (parent) {
            const ref = parent.deref();
            if (!ref) {
                path = `\u2620\u276F${path}`;
                break;
            }
            const name = ref.name || '';

            if (name.length > 0) {
                path = `${name}\u276F${path}`;
            }
            parent = parent.parent;
        }
        return path === this.name ? path : `\u2e28${path}\u2e29`;
    };

    /**
     * Send the passed `arguments` to the specific `level` logger
     *
     * @param level {number}
     * @param args {*}
     * @private
     */
    MegaLogger.prototype._log = function(...args) {
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
            var logSeparator = ' \u00B7 ';
            var logPath = this.getLoggerPath();
            var levelName = _intToLevel[level] || "unknown";

            if (options.printDate !== false) {
                logDate = options.dateFormatter(new Date());
                if (logDate && logPath) {
                    logDate += logSeparator;
                }
            }

            logLine = (logDate || '') + logPath + logSeparator + levelName;

            // Append the first argument as long it's a string to support substitutions
            if (typeof args[0] === 'string') {
                logLine += ' ' + args.shift();
            }

            if (options.colorsEnabled) {
                const bg = options.levelColors[levelName];
                const tc = options.adaptiveTextColor && getYIQThreshold(bg) > 127 ? '000' : 'fff';
                logStyle = `color:#${tc}; background-color: ${bg}; padding-left: 1px; padding-right: 1px;`;
                logLine = `%c${logLine}`;
            }

            args = [logLine, logStyle, ...args];
            if (options.dereferenceObjects) {
                args = JSON.parse(JSON.stringify(args));
            }
            if (options.captureLastLogLine) {
                this.lastLogLine = [logLine, logStyle];
            }

            options.transport(level, args);

            if (level === MegaLogger.LEVELS.CRITICAL && typeof(mocha) === "undefined") {
                let text;
                // convert back to plain text before sending to the server
                if (options.colorsEnabled) {
                    args[0] = args[0].substr(2);
                    args.splice(1, 1);
                }

                // remove everything up to the level (inc. and trailing space)
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

                const {rootLogger} = MegaLogger;
                const callbackName = `on${levelName[0]}${levelName.substr(1).toLowerCase()}`;

                if (this.options[callbackName]) {
                    this.options[callbackName].call(this, text, logPath);
                }

                if (this !== rootLogger && rootLogger.options[callbackName]) {
                    rootLogger.options[callbackName].call(this, text, logPath);
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
     * Assert a condition with a log level CRITICAL
     *
     * @param {...*}
     * @public
     */
    MegaLogger.prototype.assert = function(expr, ...args) {
        if (!expr) {
            this._level = MegaLogger.LEVELS.CRITICAL;
            if (!args.length) {
                args = ['Failed Assertion.'];
            }
            this._log.apply(this, args);

            if (this.options.throwOnAssertFail) {
                let ctx;
                const message = args.map((value) => {
                    if (typeof value !== 'string') {
                        ctx = ctx || value;
                        value = String(tryCatch(String, false)(value) || '');
                    }
                    return value[0] === '[' ? '' : value;
                });

                throw new MEGAException(message.join(' '), ctx || this, 'ValidationError');
            }
        }
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
