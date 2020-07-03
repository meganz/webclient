(function(scope) {
    "use strict";

    /**
     * KeepAlive utility class.
     *
     * Since our code base, now use plenty of keep alive mechanisms to ensure proper websocket connections, I decided
     * to writedown this helper (which includes unit tests!) to reduce the repeatable (and hard to test) code in our
     * codebase
     *
     * @param interval {Number} The interval in ms
     * @param cb {Function} The actual function that would be called after the end of each interval
     * @constructor
     */
    var KeepAlive = function (interval, cb) {
        assert(interval >= 1000, 'Intervals < 1000ms are not allowed, most likely this is a typo!');
        assert(cb, 'Missing cb');

        this.interval = interval;
        this.cb = cb;
        this.pid = '__keepalive_' + String(Math.random()).substr(2);

        this.restart();
    };

    /**
     * Call this when you want to restart the KeepAlive interval.
     */
    KeepAlive.prototype.restart = function () {
        var self = this;
        delay(self.pid, function keepAliveTimerFn() {
            self.restart();
            self.cb();
        }, self.interval);
    };

    /**
     * Call this when you want to stop the KeepAlive interval.
     */
    KeepAlive.prototype.stop = function () {
        delay.cancel(this.pid);
    };

    /**
     * Only used for unit tests
     */
    KeepAlive.prototype.destroy = function () {
        var self = this;
        self.stop();
    };

    scope.KeepAlive = KeepAlive;
})(window);
