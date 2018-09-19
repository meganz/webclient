(function(scope) {
    "use strict";

    /**
     * Number of ms that the internal timer would be set to to wait before marking as 'not active'.
     * (Should be > APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING)
     * @type {Number}
     */
    var APPACTIVITYHANDLER_ACTIVITY_TIMEOUT = 30000;


    /**
     * To reduce CPU usage, we add throttling to the MOUSEMOVE handling. So if the mouse was last moved Xms ago, then
     * there would be no extra checks done. Which means, that in case of mouse move and then no activity, there may be
     * 1s (if set to 1000) extra time needed for the activity to be marked as "not active"
     *
     * (Should be < APPACTIVITYHANDLER_ACTIVITY_TIMEOUT)
     * @type {Number}
     */
    var APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING = APPACTIVITYHANDLER_ACTIVITY_TIMEOUT / 3;

    /**
     * Blur and focus throttling
     *
     * @type {Number}
     */
    var APPACTIVITYHANDLER_BLUR_FOCUS_THROTTLING = 300;

    /**
     * AppActivityHandler's main goal is to provide a single, reusable and performance optimised handler for notifying
     * our internal implementation stuff when the user is active and when not.
     *
     * This is (or will be) used for notifications and auto away in chats.
     *
     * @constructor
     */
    var AppActivityHandler = function() {
        assert(
            APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING < APPACTIVITYHANDLER_ACTIVITY_TIMEOUT,
            'APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING should be < then APPACTIVITYHANDLER_ACTIVITY_TIMEOUT!'
        );

        this.subscribers = {};
        this.debugMode = typeof localStorage.AppActivityHandlerDebug !== 'undefined';
        var loggerOpts = {};

        if (this.debugMode) {
            loggerOpts['isEnabled'] = true;
            loggerOpts['minLogLevel'] = function () {
                return MegaLogger.LEVELS.DEBUG;
            };
            loggerOpts['transport'] = function (level, args) {
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
                args.push("[" + fn + "]");
                console.warn.apply(console, args);
            };
        }
        else {
            loggerOpts['isEnabled'] = true;
            loggerOpts['minLogLevel'] = function () {
                return MegaLogger.LEVELS.WARN;
            };
        }

        this.logger = new MegaLogger("AppActivityHandler", loggerOpts);

        var self = this;

        var _isActive = true;

        self._windowIsActive = _isActive = document.hasFocus && document.hasFocus() ? true : false;

        Object.defineProperty(this, "isActive", {
            get: function() { return _isActive; },
            set: function(newValue) {
                if (_isActive !== newValue) {
                    if (self.debugMode) {
                        self.logger.warn(
                            "isActive change to: ", newValue
                        );
                    }

                    _isActive = newValue;
                    Object.keys(self.subscribers).forEach(function(k) {
                        self.subscribers[k](newValue);
                    });
                }
            },
            enumerable: true,
            configurable: true
        });

        // by default, on initialisation, activity is internally marked as "active"
        // in case the site gets reloaded, the only side effect of this, would be that an extra isActive = false call,
        // may be triggered to subscribers
        self._lastMouseMove = Date.now();
    };


    /**
     * Get all currently registered subscribers
     *
     * @return {Object}
     */
    AppActivityHandler.prototype.getSubscribers = function () {
        return this.subscribers;
    };

    /**
     * Add new subscriber.
     *
     * @param id {String} Index/unique ID of the subscriber
     * @param val {Object} The actual subscriber
     * @return {Object} the newly added subscriber
     */
    AppActivityHandler.prototype.addSubscriber = function (id, val) {
        this.subscribers[id] = val;
        if (typeof this.onSubscriberAdded !== 'undefined') {
            this.onSubscriberAdded(id, val);
        }
        return this.subscribers[id];
    };

    /**
     * Remove a subscriber.
     *
     * @param idx {String} The Index/unique ID of the subscriber to remove
     */
    AppActivityHandler.prototype.removeSubscriber = function (idx) {
        if (this.hasSubscriber(idx)) {
            var tmp = this.subscribers[idx];
            delete this.subscribers[idx];
            if (typeof this.onSubscriberRemoved !== 'undefined') {
                this.onSubscriberRemoved(idx, tmp);
            }
        }
    };

    /**
     * Check if subscriber with id `idx` exists
     *
     * @param idx {String} Index/unique ID of the subscriber
     * @return {Boolean}
     */
    AppActivityHandler.prototype.hasSubscriber = function (idx) {
        return typeof this.subscribers[idx] !== 'undefined';
    };

    /**
     * Called when a subscriber is added
     */
    AppActivityHandler.prototype.onSubscriberAdded = function() {
        this._handleSubscribersChange();
    };

    /**
     * Called when a subscriber is removed
     */
    AppActivityHandler.prototype.onSubscriberRemoved = function() {
        this._handleSubscribersChange();
    };

    /**
     * On subscribers change, this function would be called, so that it would separately handle any cleanup/enabling
     * or disabling of activity handling if such is needed anymore
     *
     * @private
     */
    AppActivityHandler.prototype._handleSubscribersChange = function() {
        if (Object.keys(this.subscribers).length > 0) {
            this._activityHandlingEnable();
        }
        else {
            this._activityHandlingDisable();
        }
    };

    /**
     * Enable activity handling
     * g and the required events/timers
     * @private
     */
    AppActivityHandler.prototype._activityHandlingEnable = function() {
        var self = this;

        // just in case this was not properly disabled
        self._activityHandlingDisable();

        $(window).rebind('mousemove.appActivityHandler keypress.appActivityHandler', function() {
            if (self._lastMouseMove + APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING < Date.now()) {
                if (self.debugMode) {
                    self.logger.debug(
                        "mouse move triggered after time > throttling value, changing to isActive = true"
                    );
                }

                self.isActive = true;
                self._lastMouseMove = Date.now();
                if (self._timer) {
                    clearTimeout(self._timer);
                }
                self._timer = setTimeout(function() {
                    if (self.debugMode) {
                        self.logger.debug("activity timeout, changing to isActive = false");
                    }
                    self.isActive = false;
                }, APPACTIVITYHANDLER_ACTIVITY_TIMEOUT);
            }
        });
        $(window).rebind('focus.appActivityHandler', function() {
            self._windowIsActive = true;
            self._throttledWindowIsActiveChanged();
        });
        $(window).rebind('blur.appActivityHandler', function() {
            self._windowIsActive = false;
            self._throttledWindowIsActiveChanged();
        });

        self._timer = setTimeout(function() {
            if (self.debugMode) {
                self.logger.debug("activity timeout, changing to isActive = false");
            }
            self.isActive = false;
        }, APPACTIVITYHANDLER_ACTIVITY_TIMEOUT);
    };

    /**
     * Disable the activity handling and remove events and timers
     *
     * @private
     */
    AppActivityHandler.prototype._activityHandlingDisable = function() {
        var self = this;

        if (self._timer) {
            clearTimeout(self._timer);
            self._timer = false;
        }

        $(window).off('mousemove.appActivityHandler');
        $(window).off('keypress.appActivityHandler');
    };

    /**
     * Throttled function (by SoonFc) that should notify subscribers on active change.
     * @private
     */
    AppActivityHandler.prototype._throttledWindowIsActiveChanged = SoonFc(function() {
        var self = this;
        if (self._windowIsActive !== self.isActive) {
            self.isActive = self._windowIsActive;
        }
    }, 300);

    /**
     * Method that would cleanup any internal data and started timers.
     * Mainly used in unit tests.
     */
    AppActivityHandler.prototype.destroy = function() {
        this.subscribers = [];
        this._lastMouseMove = 0;
        this._activityHandlingDisable();
    };


    /**
     * Aliases for reusing/on-demand singleton initialisation of the AppActivityHandler
     */

    var globalAppActivityHandler;
    ['addSubscriber', 'removeSubscriber', 'hasSubscriber'].forEach(function (method) {
        AppActivityHandler[method] = function () {
            if (!globalAppActivityHandler) {
                globalAppActivityHandler = new AppActivityHandler();
            }
            return globalAppActivityHandler[method].apply(globalAppActivityHandler, arguments);
        };
    });

    /**
     * Helper method for accessing the internally stored/on-demand created AppActivityHandler instance
     * @returns {AppActivityHandler}
     */
    AppActivityHandler.getGlobalAppActivityHandler = function() {
        if (!globalAppActivityHandler) {
            globalAppActivityHandler = new AppActivityHandler();
        }
        return globalAppActivityHandler;
    };

    AppActivityHandler.APPACTIVITYHANDLER_ACTIVITY_TIMEOUT = APPACTIVITYHANDLER_ACTIVITY_TIMEOUT;
    AppActivityHandler.APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING = APPACTIVITYHANDLER_MOUSEMOVE_THROTTLING;
    AppActivityHandler.APPACTIVITYHANDLER_BLUR_FOCUS_THROTTLING = APPACTIVITYHANDLER_BLUR_FOCUS_THROTTLING;
    scope.AppActivityHandler = AppActivityHandler;
})(window);
