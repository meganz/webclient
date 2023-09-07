class KeepAlive {
    /**
     * KeepAlive utility class.
     *
     * Since our code base, now use plenty of keep alive mechanisms to ensure proper websocket connections, I decided
     * to writedown this helper (which includes unit tests!) to reduce the repeatable (and hard to test) code in our
     * codebase
     *
     * @param {Number} interval The interval in ms
     * @param {Function} cb The actual function that would be called after the end of each interval
     * @constructor
     */
    constructor(interval, cb) {
        assert(interval >= 1000, 'Intervals < 1000ms are not allowed, most likely this is a typo!');
        assert(typeof cb === 'function', 'Invalid callback.');

        Object.defineProperty(this, 'interval', {value: interval / 1e3});

        this.timer = null;
        this.callback = ((callback) => () => callback(this.restart()))(tryCatch(cb));

        this.restart();
    }

    /**
     * Call this when you want to restart the KeepAlive interval.
     */
    restart() {
        this.timer = tSleep.schedule(this.interval, this, this.callback);
        return this;
    }

    /**
     * Call this when you want to stop the KeepAlive interval.
     */
    stop() {
        if (this.timer) {
            this.timer.abort();
            this.timer = null;
        }
    }

    /**
     * Only used for unit tests
     */
    destroy() {
        this.stop();
        delete this.callback;
        freeze(this);
    }
}
