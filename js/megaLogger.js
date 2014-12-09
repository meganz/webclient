/**
 * MegaLogger
 */

/**
 * Mega Logger
 *
 * @param name {string} name of the database (a-zA-Z0-9_-)
 * @returns {MegaLogger}
 * @constructor
 */
function MegaLogger(name, options, parentLogger) {
    this.name = name;
    if(typeof(MegaLogger.rootLogger) == "undefined" && parentLogger !== false) {
        MegaLogger.rootLogger = new MegaLogger("", {
            isEnabled: true
        }, false);
    }
    this.parentLogger = parentLogger ? parentLogger : MegaLogger.rootLogger;
    this.options = $.extend({}, clone(MegaLogger.DEFAULT_OPTIONS), options);

    return this;
};

makeObservable(MegaLogger);

/**
 * Static, log levels
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
 */
MegaLogger._logRegistry = {};

/**
 * Static, default options
 */
MegaLogger.DEFAULT_OPTIONS = {
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
        if(sessionStorage.muteList) {
            return JSON.parse(sessionStorage.muteList);
        } else if(localStorage.muteList) {
            return JSON.parse(localStorage.muteList)
        } else {
            return [];
        }
    },
    'minLogLevel': function() {
        if(sessionStorage.minLogLevel) {
            return JSON.parse(sessionStorage.minLogLevel);
        } else if(localStorage.minLogLevel) {
            return JSON.parse(localStorage.minLogLevel)
        } else {
            return MegaLogger.LEVELS.DEBUG;
        }
    },
    /**
     * warning: this will use tons of CPU because of the trick of JSON.serialize/.stringify we are using for dereferencing
     */
    'dereferenceObjects': false
};

MegaLogger.getLogger = function(name, options, parentLogger) {
    if(typeof(MegaLogger._logRegistry[name]) == "undefined") {
        MegaLogger._logRegistry[name] = new MegaLogger(name, options, parentLogger);
    }
    return MegaLogger._logRegistry[name];
};


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

MegaLogger.prototype._getLoggerPath = function() {
    var path = this.name;

    var p = this.parentLogger;
    while(p) {
        if(p.name && p.name.length > 0) {
            path = p.name + ":" + path;
        }
        p = p.parentLogger;
    }
    return path;
};

MegaLogger.prototype._log = function(level, arguments) {
    var self = this;

    var levelName = MegaLogger._intToLevel(level);
    var clr = this.options.levelColors[levelName];
    var logStyle = "color: " + "white" + "; background-color: " +  clr + "; padding-left: 1px; padding-right: 1px;";

    var args = [
        "%c" + this.options.dateFormatter(new Date()) + " - " + this._getLoggerPath() + " - " + levelName,
        logStyle
    ];

    args = args.concat(arguments);
    if(this.options.dereferenceObjects) {
        try {
            args = JSON.parse(JSON.stringify(args));
        } catch(e) {
            // typeerror ?
        }
    }

    if(this.options.isEnabled === true || ($.isFunction(this.options.isEnabled) && this.options.isEnabled())) {
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

        self.options.transport.apply(this.options.transport, [level].concat(args));

        if(level == MegaLogger.LEVELS.ERROR && srvlog && typeof(mocha) == "undefined") {
            var text;
            //var noColorMsg = clone(args); // convert back to plain text before sending to the server
            var noColorMsg = $.extend(true, {}, {'r': args})['r']; // convert back to plain text before sending to the server
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

            srvlog(text, undefined, true);
        }
    }

};

MegaLogger.prototype.isEnabled = function() {
    var isEnabled = this.options.isEnabled;
    if($.isFunction(isEnabled)) {
        return isEnabled();
    } else {
        return isEnabled;
    }
};


Object.keys(MegaLogger.LEVELS).forEach(function(k) {
    var v = MegaLogger.LEVELS[k];

    MegaLogger.prototype[k.toLowerCase()] = function() {
        this._log(v, toArray(arguments));
    };
});

$(window).bind('onMegaLoaded', function() {
    MegaLogger.rootLogger = new MegaLogger(
        "", {
            isEnabled: function() {
                return !!window.d;
            }
        },
        MegaLogger.rootLogger ? MegaLogger.rootLogger : false
    );
});
