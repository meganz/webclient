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
    self._lastConnectionRetryTime = 0;
    self._connectionRetryInProgress = null;
    self._connectionRetries = 0;
    self.logger = new MegaLogger("connectionRetryManager", {}, parentLogger);

    self.options = $.extend({}, ConnectionRetryManager.DEFAULT_OPTS, opts);

    self._instanceIdx = ConnectionRetryManager._instanceIdx++;

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


    // TODO: CONNECTION RETRY REFACTORING
    /**
     * Connection retry delay in ms (reconnection will be triggered with a timeout calculated as:
     * self._connectionRetries * this value)
     */
    reconnectDelay: 750,

    // TODO: CONNECTION RETRY REFACTORING
    /**
     * Multipliers used in a rand(retryFuzzinesFactors[0], retryFuzzinesFactors[1])
     * to add randomness to the connection retry timers.
     */
    retryFuzzinesFactors: [0.7, 1.3],

    // TODO: CONNECTION RETRY REFACTORING
    /**
     * 10 mins timeout after the maxConnectionRetries is reached.
     */
    restartConnectionRetryTimeout: (10 * 1000 * 60),

    // TODO: CONNECTION RETRY REFACTORING
    /**
     * Minimum milliseconds after which a mousemove will trigger a connection retry.
     */
    connectionRetryFloorVal: 5000,


    // TODO: CONNECTION RETRY REFACTORING
    /**
     * Maximum connection retry in case of error OR timeout
     */
    maxConnectionRetries: 50,

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

/**
 * Should be triggered when the connection closed
 */
ConnectionRetryManager.prototype.gotDisconnected = function(){
    var self = this;

    if (self._$connectingPromise && self._$connectingPromise.state() === 'pending') {
        self._$connectingPromise.reject();
    }

    if (
        self.options.functions.isDisconnected() === true &&
        self.options.functions.isUserForcedDisconnect() === false
    ) {

        //console.error(self._instanceIdx, "bind mouse move");
        $(document).rebind("mousemove.megaChatRetry" + self._instanceIdx, function() {
            self._connectionRetryUI();
        });
        $(window).unbind("offline.megaChatRetry" + self._instanceIdx);
        $(window).rebind("online.megaChatRetry" + self._instanceIdx, function() {
            if (
                !self.options.functions.isUserForcedDisconnect() &&
                !self.options.functions.isConnected()
            ) {
                self.doConnectionRetry(true);
            }
        });
        if (!self._connectionRetryInProgress) {
            self.doConnectionRetry();
        }
    }
};

/**
 * Should be triggered when the connection was established
 */
ConnectionRetryManager.prototype.gotConnected = function(){
    var self = this;
    self._connectionRetries = 0; // reset connection retries

    // stop any timer which is running to try to reconnect (which should not happen, but since Karere is async...
    // race condition may trigger a .reconnect() by a timer)
    if (self._connectionRetryInProgress) {
        clearTimeout(self._connectionRetryInProgress);
        self._connectionRetryInProgress = null;
    }
    //console.error(self._instanceIdx, "unbind mouse move");
    $(document).unbind("mousemove.megaChatRetry" + self._instanceIdx);
    $(window).unbind("online.megaChatRetry" + self._instanceIdx);
    $(window).rebind("offline.megaChatRetry" + self._instanceIdx, function() {
        if (!self.options.functions.isUserForcedDisconnect()) {
            self.options.functions.forceDisconnect(self);
        }
    });
};

/**
 * Should be called from the integration code when a connection had started connecting.
 *
 * @param waitForPromise
 * @returns {MegaPromise|*}
 */
ConnectionRetryManager.prototype.startedConnecting = function(waitForPromise){
    var self = this;

    self._$connectingPromise = createTimeoutPromise(function() {
        return self.options.functions.isConnected();
    }, 100, self.options.connectTimeout, undefined, waitForPromise)
        .always(function() {
            delete self._$connectingPromise;
        })
        .fail(function() {
            self.doConnectionRetry();
        });
    return self._$connectingPromise;
};

/**
 * Force a connection retry
 */
ConnectionRetryManager.prototype.doConnectionRetry = function(immediately){
    var self = this;


    if (self._$connectingPromise && self._connectionRetries >= self.options.maxConnectionRetries) {
        self._$connectingPromise.reject(arguments);
    }

    if (self.options.functions.isUserForcedDisconnect()) {
        return MegaPromise.reject();
    }
    self._connectionRetries++;


    if (self.logger) {
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
            }
            self._connectionRetryInProgress = null;
        }, self.options.restartConnectionRetryTimeout);

        self.logger.error(
            "Reached max connection retries. Resetting counters and doing a bigger delay: ",
            self.options.restartConnectionRetryTimeout
        );


        self._lastConnectionRetryTime = unixtime();

    }
    else {
        var connectionRetryTimeout = (
            self._connectionRetries * self.options.reconnectDelay
        );
        if (self._connectionRetries === 0 || immediately === true) {
            // start imidiately
            connectionRetryTimeout = 0;
        }

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

        self._connectionRetryInProgress = setTimeout(function() {
            if (!self.options.functions.isConnected()) {
                self.options.functions.reconnect(self);
            } else {
            }
        }, connectionRetryTimeout);


        self._lastConnectionRetryTime = unixtime();

    }
};
/**
 * Internal, used to be called by the onmousemove code to force a connection retry
 * @returns {boolean}
 * @private
 */
ConnectionRetryManager.prototype._connectionRetryUI = function(){
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
    }
};
