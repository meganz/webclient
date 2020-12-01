/**
 * Abstract Exponential Connection Retry logic wrapped into a single class.
 * For more info, check the options + the public API
 *
 * @param opts
 * @param parentLogger
 * @returns {ConnectionRetryManager}
 * @constructor
 */
var ConnectionRetryManager = function(opts, parentLogger) {
    var self = this;
    self._$connectingPromise = null;
    self._lastConnectionRetryTime = 0;
    self._connectionRetryInProgress = null;
    self._connectionRetries = 0;
    self._is_paused = false;
    self._debug = false;

    if (localStorage.connectionRetryManagerDebug) {
        var _connectionState = ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED;
        Object.defineProperty(self, "_connectionState", {
            get: function() { return _connectionState; },
            set: function(newValue) {
                if (_connectionState !== newValue) {
                    self.logger.warn(
                        "_connectionState = " + constStateToText(ConnectionRetryManager.CONNECTION_STATE, newValue)
                    );

                    _connectionState = newValue;
                }
            },
            enumerable: true,
            configurable: true
        });
        self._debug = true;
    }
    else {
        self._connectionState = ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED;
    }

    var loggerName = "connectionRetryManager";
    if (parentLogger) {
        loggerName = (parentLogger.name ? parentLogger.name : parentLogger) + ":" + loggerName;
    }

    self.logger = new MegaLogger(loggerName, {});

    self.options = $.extend({}, ConnectionRetryManager.DEFAULT_OPTS, opts);

    self._instanceIdx = ConnectionRetryManager._instanceIdx++;

    self._isOffline = false;

    return self;
};

/**
 * Used for creating unique event namespaces for the onmousemove event
 *
 * @type {number}
 * @private
 */
ConnectionRetryManager._instanceIdx = 0;

ConnectionRetryManager.DEFAULT_OPTS = {
    /**
     * If set to ``true`` will trigger a forced connection retry (see ``connectionRetryFloorVal``) on mouse move
     */
    connectionForceRetryViaUIEnabled: true,

    /**
     * Timeout when connecting
     */
    connectTimeout: 15000,


    /**
     * Connection retry delay in ms (reconnection will be triggered with a timeout calculated as:
     * self._connectionRetries * this value)
     */
    reconnectDelay: 2000,

    /**
     * Multipliers used in a rand(retryFuzzinesFactors[0], retryFuzzinesFactors[1])
     * to add randomness to the connection retry timers.
     */
    retryFuzzinesFactors: [0.95, 1.05],

    /**
     * 15 seconds timeout after the maxConnectionRetries is reached.
     */
    restartConnectionRetryTimeout: (60 * 10 * 1000),

    /**
     * Minimum milliseconds after which a mousemove will trigger a connection retry.
     */
    connectionRetryFloorVal: 5000,


    /**
     * Maximum connection retry in case of error OR timeout (application setup timeout, not tcp timeout!)
     */
    maxConnectionRetries: 10 * 60 / 2,

    /**
     * The minimum conncetion retry timeout, even if immediate = true
     */
    minConnectionRetryTimeout: 1000,

    functions: {
        /**
         * A Callback that will trigger the 'connect' procedure for this type of connection (Karere/Chatd/etc)
         * @param connectionRetryManager {ConnectionRetryManager}
         */
        reconnect: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        },
        /**
         * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection (Karere/Chatd/etc)
         * @param connectionRetryManager {ConnectionRetryManager}
         */
        forceDisconnect: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        },
        /**
         * Should return true or false depending on the current state of this connection, e.g. (connected || connecting)
         * @param connectionRetryManager {ConnectionRetryManager}
         * @returns {bool}
         */
        isConnectedOrConnecting: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        },
        /**
         * Should return true/false if the current state === CONNECTED
         * @param connectionRetryManager {ConnectionRetryManager}
         * @returns {bool}
         */
        isConnected: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        },
        /**
         * Should return true/false if the current state === DISCONNECTED
         * @param connectionRetryManager {ConnectionRetryManager}
         * @returns {bool}
         */
        isDisconnected: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        },
        /**
         * Should return true IF the user had forced the connection to go offline
         * @param connectionRetryManager {ConnectionRetryManager}
         * @returns {bool}
         */
        isUserForcedDisconnect: function(connectionRetryManager) {
            throw new Error("To be implemented.");
        }
    }
};


ConnectionRetryManager.CONNECTION_STATE = {
    'CONNECTED': 1,
    'CONNECTING': 2,
    'DISCONNECTED': 0,
};

/**
 * Should be triggered when the connection closed
 */
ConnectionRetryManager.prototype.gotDisconnected = function(){
    var self = this;

    if (self._debug) {
        self.logger.warn("gotDisconnected");
    }
    if (self._$connectingPromise) {
        if (self._debug) {
            self.logger.warn("rejecting previous connectingPromise");
        }
        self._$connectingPromise.reject();
        self._$connectingPromise = null;
    }

    if (
        self.options.functions.isDisconnected() === true &&
        self.options.functions.isUserForcedDisconnect() === false
    ) {
        self._connectionState = ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED;

        //console.error(self._instanceIdx, "bind mouse move");
        $(document).rebind("mousemove.megaChatRetry" + self._instanceIdx, function() {
            self._connectionRetryUI();
        });

        $(window).off("offline.megaChatRetry" + self._instanceIdx);
        $(window).rebind("online.megaChatRetry" + self._instanceIdx, function() {
            self._isOffline = false;
            if (
                !self.options.functions.isUserForcedDisconnect() &&
                !self.options.functions.isConnected()
            ) {
                // delay the retry a bit, so that the OS can properly reconnect (e.g. on wifi networks)
                setTimeout(function() {
                    self.doConnectionRetry(true);
                }, 3000);
            }

            $(window).off("online.megaChatRetry" + self._instanceIdx);
        });

        if (!self._connectionRetryInProgress) {
            self.doConnectionRetry();
        }
    }
    else {
        self._connectionState = ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED;
    }

    $(self).trigger('onDisconnected');
};

/**
 * Should be triggered when the connection was established
 */
ConnectionRetryManager.prototype.gotConnected = function(){
    var self = this;

    if (self._debug) {
        self.logger.warn("got connected", self.logger.name + "#" + self._connectionRetries);
    }

    self._connectionState = ConnectionRetryManager.CONNECTION_STATE.CONNECTED;

    self._connectionRetries = 0; // reset connection retries

    // stop any timer which is running to try to reconnect (which should not happen, but since Karere is async...
    // race condition may trigger a .reconnect() by a timer)
    if (self._connectionRetryInProgress) {
        clearTimeout(self._connectionRetryInProgress);
        self._connectionRetryInProgress = null;
    }
    //console.error(self._instanceIdx, "unbind mouse move");
    $(document).off("mousemove.megaChatRetry" + self._instanceIdx);

    $(window).off("online.megaChatRetry" + self._instanceIdx);
    $(window).rebind("offline.megaChatRetry" + self._instanceIdx, function() {
        if (self._debug) {
            self.logger.warn("OS notified we are offline.");
        }
        self._isOffline = true;
        if (!self.options.functions.isUserForcedDisconnect()) {
            if (self._debug) {
                self.logger.warn("is user forced disconnect");
            }
            self.options.functions.forceDisconnect(self);
            self._connectionState = ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED;
            self.gotDisconnected();
        }
        $(window).off("offline.megaChatRetry" + self._instanceIdx);
    });

    if (self._$connectingPromise) {
        if (self._debug) {
            self.logger.error("got connected, triggering verify:", self.logger.name);
        }

        self._$connectingPromise.verify();
    }
    $(self).trigger('onConnected');
};

/**
 * Should be called from the integration code when a connection had started connecting.
 *
 * @param waitForPromise
 * @param [delayed] {Number}
 * @param [name] {String} optional name for the debugging output of createTimeoutPromise
 * @returns {MegaPromise|*}
 */
ConnectionRetryManager.prototype.startedConnecting = function(waitForPromise, delayed, name) {
    var self = this;

    if (self._is_paused) {
        return MegaPromise.reject();
    }

    if (self._$connectingPromise) {
        if (self._debug) {
            self.logger.warn("rejecting previous connectingPromise, stuck?", self._$connectingPromise);
        }
        self._$connectingPromise.reject(EAGAIN);
    }

    self._$connectingPromise = createTimeoutPromise(
        function() {
            return self.options.functions.isConnected();
        },
        500,
        self.options.connectTimeout + (delayed ? delayed : 0),
        undefined,
        waitForPromise,
        name
    )
        .always(function() {
            self._$connectingPromise = null;
        })
        .done(function() {
            if (self._debug) {
                self.logger.warn("startedConnecting succeeded.", self.logger.name + "#" + self._connectionRetries);
            }
        })
        .fail(function(ex) {
            if (ex === EAGAIN) {
                return;
            }
            if (self._debug) {
                self.logger.warn(
                    "startedConnecting failed, retrying.",
                    self.logger.name + "#" + self._connectionRetries,
                    ex
                );
            }
            self.doConnectionRetry();
        });
    return self._$connectingPromise;
};

ConnectionRetryManager.prototype.pause = function() {
    this._is_paused = true;
    if (this._$connectingPromise) {
        this._$connectingPromise.stopTimers();
    }
};

ConnectionRetryManager.prototype.unpause = function() {
    this._is_paused = false;
    // @todo resume timers?
};

/**
 * Force a connection retry
 */
ConnectionRetryManager.prototype.doConnectionRetry = function(immediately) {
    var self = this;

    if (self._isOffline) {
        // in case the OS/browser had reported that we are online, it does not make sense to proceed trying to
        // reconnect.
        return MegaPromise.reject();
    }
    if (self._$connectingPromise) {
        if (self._connectionRetries >= self.options.maxConnectionRetries) {
            self._$connectingPromise.reject(ETEMPUNAVAIL);
            self._$connectingPromise = null;
        }
        else if (!immediately) {
            if (self._debug) {
                self.logger.warn("recycling previous ._$connectingPromise.");
            }
            return self._$connectingPromise;
        }
    }


    if (self.options.functions.isUserForcedDisconnect()) {
        return MegaPromise.reject();
    }
    self._connectionRetries++;


    if (self.logger && !immediately) {
        self.logger.error(
            "request error, passed arguments: ", arguments, ", number of errors: ", self._connectionRetries
        );
    }

    if (immediately !== true && self._connectionRetries > self.options.maxConnectionRetries) {
        self._connectionRetries = 0;

        self._connectionRetryInProgress = setTimeout(function() {
            if (
                !self.options.functions.isConnectedOrConnecting()
            ) {
                self.options.functions.reconnect(self);
                self._connectionState = ConnectionRetryManager.CONNECTION_STATE.CONNECTING;
            }
            self._connectionRetryInProgress = null;
        }, self.options.restartConnectionRetryTimeout);

        self.logger.error(
            "Reached max connection retries. Resetting counters and doing a bigger delay: ",
            self.options.restartConnectionRetryTimeout
        );

        self._lastConnectionRetryTime = unixtime();
        return self.startedConnecting(
            undefined,
            self.options.restartConnectionRetryTimeout,
            self.logger.name + "#" + self._connectionRetries
        );
    }
    else {
        if (immediately === true) {
            // start imidiately
            self._connectionRetries = 0;
        }

        var connectionRetryTimeout = Math.pow(
            self._connectionRetries,
            self.options.reconnectDelay / 1000
        ) * 1000;

        // add some randomness
        connectionRetryTimeout = (
            connectionRetryTimeout * rand_range(
                self.options.retryFuzzinesFactors[0], self.options.retryFuzzinesFactors[1]
            )
        );

        if (self._connectionRetryInProgress) {
            clearTimeout(
                self._connectionRetryInProgress
            );
            self._connectionRetryInProgress = null;
        }

        connectionRetryTimeout = Math.max(self.options.minConnectionRetryTimeout, connectionRetryTimeout);

        self._connectionRetryInProgress = setTimeout(function() {
            if (!self.options.functions.isConnected()) {
                self.options.functions.reconnect(self);
                self._connectionState = ConnectionRetryManager.CONNECTION_STATE.CONNECTING;
            }
        }, connectionRetryTimeout);

        self._lastConnectionRetryTime = unixtime();

        if (self._debug) {
            self.logger.warn(
                "calling startedConnecting: ",
                connectionRetryTimeout, self.logger.name + "#" + self._connectionRetries
            );
        }
        return self.startedConnecting(
            undefined,
            connectionRetryTimeout,
            self.logger.name + "#" + self._connectionRetries
        );
    }
};
/**
 * Internal, used to be called by the onmousemove code to force a connection retry
 * @returns {boolean}
 * @private
 */
ConnectionRetryManager.prototype._connectionRetryUI = function() {
    var self = this;

    if (
        !self.options.functions.isConnectedOrConnecting() &&
        (unixtime() - self._lastConnectionRetryTime) > (self.options.connectionRetryFloorVal / 1000)
    ) {
        self.doConnectionRetry(true);
        return true;
    }
    else {
        return false;
    }
};

/**
 * Reset the conn. retry counters and internals.
 */
ConnectionRetryManager.prototype.resetConnectionRetries = function() {
    var self = this;

    self._connectionRetries = 0;
    clearTimeout(self._connectionRetryInProgress);
    if (self._$connectingPromise) {
        self._$connectingPromise.reject();
        self._$connectingPromise = null;
    }
};


ConnectionRetryManager.prototype.getConnectionState = function() {
    return this._connectionState;
};

/**
 * Can be used to run code that requires a conncetion (or forces a connect).
 *
 * @returns {MegaPromise|*}
 */
ConnectionRetryManager.prototype.requiresConnection = function() {
    var self = this;

    if (!self.options.functions.isConnectedOrConnecting()) {
        var connectedPromise = new MegaPromise();
        $(self).one('onConnected', function() {
            connectedPromise.resolve();
        });

        if (self.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.DISCONNECTED) {
            self.doConnectionRetry(true);
        }

        return connectedPromise;
    }
    else {
        return MegaPromise.resolve();
    }
};
