(function(window) {
    'use strict';

    const WEEK_SECONDS = 7 * 24 * 60 * 60;
    const FORTNIGHT_SECONDS = 2 * WEEK_SECONDS; // 2 WEEKS
    const MONTH_SECONDS = 2 * FORTNIGHT_SECONDS;

    const TYPE_WEEK = 0;
    const TYPE_FORTNIGHT = 1;
    const TYPE_MONTH = 2;

    const TIMES_WEEK = 5;
    const TIMES_FORTNIGHT = 5;

    function TimeChecker(context) {
        this.type = TYPE_WEEK;
        this.times = 0;
        this.lastTimestamp = this.getCurrentTimestamp();
        this.context = context || null;
        this.requestId = null;
    }

    /**
     * Initialize time checker and hydrate properties
     *
     * @returns {Promise} void
     */
    TimeChecker.prototype.init = async function() {
        await this.fillContext();
    };

    /**
     * Fill properties from context
     *
     * @returns {Promise} void
     */
    TimeChecker.prototype.fillContext = async function() {
        const context = this.getContext();

        if (context) {
            const contextValues = await context.get();

            if (contextValues && contextValues.length) {
                this.lastTimestamp = contextValues[0];
                this.times = contextValues[1];
                this.type = contextValues[2];
            }
        }
    };

    /**
     * Update view count for the add phone banner
     *
     * @returns {void} void
     */
    TimeChecker.prototype.update = function() {
        this.requestId = requesti;
        const times = this.getTimes();
        const type = this.getType();
        const currentTimestamp = this.getCurrentTimestamp();
        const lastTimestamp = this.getLastTimestamp();

        let newTimes = times;
        let newType = type;
        let newTimestamp = lastTimestamp;

        const deltaSeconds = currentTimestamp - lastTimestamp;

        switch (type) {
            case TYPE_WEEK:
                if (deltaSeconds > WEEK_SECONDS) {
                    newType = TYPE_FORTNIGHT;
                    newTimestamp = this.getCurrentTimestamp();
                    newTimes = 0;
                }
                newTimes++;
                break;
            case TYPE_FORTNIGHT:
                if (deltaSeconds > FORTNIGHT_SECONDS) {
                    newType = TYPE_MONTH;
                    newTimestamp = this.getCurrentTimestamp();
                    newTimes = 0;
                }
                newTimes++;
                break;
            case TYPE_MONTH:
                if (deltaSeconds > MONTH_SECONDS) {
                    newTimestamp = this.getCurrentTimestamp();
                    newTimes = 0;
                }
                newTimes++;
                break;
        }

        this.save(newTimestamp, newTimes, newType);
    };

    /**
     * Do a delayed update for banner checking
     *
     * @param {function} callback callback after delay
     *
     * @returns {void} void
     */
    TimeChecker.prototype.delayedUpdate = function(callback) {
        if (typeof callback === 'function') {
            delay(this.getContext().getKey(), () => {
                this.update();
                callback();
            }, this.getContext().getDelay());
        }
    };

    /**
     * Check if the current request count has been updated
     *
     * @returns {boolean} stored request id is same as saved one
     */
    TimeChecker.prototype.hasUpdated = function() {
        return requesti === this.requestId;
    };

    /**
     * Check if the banner is allowed to display
     *
     * @returns {boolean} returns true if able
     */
    TimeChecker.prototype.shouldShow = function() {
        const type = this.getType();
        const currentTimestamp = this.getCurrentTimestamp();
        const lastTimestamp = this.getLastTimestamp();
        const deltaSeconds = currentTimestamp - lastTimestamp;
        const times = this.getTimes();

        switch (type) {
            case TYPE_WEEK:
                if (deltaSeconds > WEEK_SECONDS) {
                    return true;
                }

                if (times < TIMES_WEEK) {
                    return true;
                }

                break;
            case TYPE_FORTNIGHT:
                if (deltaSeconds > FORTNIGHT_SECONDS) {
                    return true;
                }

                if (times < TIMES_FORTNIGHT) {
                    return true;
                }

                break;
            case TYPE_MONTH:
                return deltaSeconds > MONTH_SECONDS;
            default:
        }

        return false;
    };

    /**
     * Save the new record for last time checked
     *
     * @param {number} newTimestamp new timestamp
     * @param {number} newTimes number of times
     * @param {number} newType week, fortnight or month
     *
     * @returns {void} void
     */
    TimeChecker.prototype.save = function(newTimestamp, newTimes, newType) {
        const context = this.getContext();

        if (context && this.isAllowedSave()) {
            this.lastTimestamp = newTimestamp;
            this.times = newTimes;
            this.type = newType;

            context.save(newTimestamp, newTimes, newType);
        }
    };

    /**
     * Get time checker type
     * @returns {number} Time checker type (week, fortnight, month)
     */
    TimeChecker.prototype.getType = function() {
        return this.type;
    };

    /**
     * Get number of times banner was viewed
     * @returns {number} number of times
     */
    TimeChecker.prototype.getTimes = function() {
        return this.times;
    };

    /**
     * Get the last timestamp when type was changed
     * @returns {number} unix timestamp
     */
    TimeChecker.prototype.getLastTimestamp = function() {
        return this.lastTimestamp;
    };

    /**
     * Current date unix timestamp helper
     *
     * @returns {number} current timestamp
     */
    TimeChecker.prototype.getCurrentTimestamp = function() {
        return Date.now();
    };

    TimeChecker.prototype.getContext = function() {
        return this.context;
    };

    TimeChecker.prototype.isAllowedSave = function() {
        if (this.context) {
            return this.context.isAllowedSave();
        }
        return true;
    };

    /**
     * Check if the banner was shown more than 10 times
     *
     * @returns {boolean} true if more than 10 times or month type
     */
    TimeChecker.prototype.isMoreThan10Times = function() {
        return this.type === TYPE_MONTH || this.type === TYPE_FORTNIGHT && this.times >= 5;
    };

    /**
     * Time checker context (storage, checking etc.)
     * @param {string} key storage key
     * @param {function} allowSaveCallback callback to check if allowed to save
     * @param {number} delay saving delay
     *
     * @returns {TimeCheckerContext} instance
     */
    function TimeCheckerContext(key, allowSaveCallback, delay) {
        this.key = 'tc';
        this.allowSaveCallback = null;
        this.delay = delay || 3000;

        if (key) {
            this.key = `${key}${this.key}`;
        }

        if (typeof allowSaveCallback === 'function') {
            this.allowSaveCallback = allowSaveCallback;
        }
    }

    /**
     * Save last time checked
     * @param {number} timestamp Last timestamp
     * @param {number} times number of times
     * @param {number} type type of checking
     * @returns {void|Promise} Promise if persistent otherwise void
     */
    TimeCheckerContext.prototype.save = function(timestamp, times, type) {
        const key = this.getKey();
        const value = [timestamp, times, type];
        const serializedValue =  JSON.stringify(value);

        return window.M.setPersistentData(key, serializedValue).catch(nop);
    };

    /**
     * Get time checker context from storage
     *
     * @returns {Promise|array} If from local storage array, otherwise promise
     */
    TimeCheckerContext.prototype.get = async function(){
        const key = this.getKey();
        let serializedValue = null;

        serializedValue = await Promise.resolve(window.M.getPersistentData(key).catch(nop));

        if (typeof serializedValue === 'string') {
            return JSON.parse(serializedValue);
        }

        return serializedValue;
    };

    /**
     * Get storage key
     *
     * @returns {string} storage key
     */
    TimeCheckerContext.prototype.getKey = function() {
        return this.key;
    };

    /**
     * Check if allowed to save
     * @returns {boolean} allowed to save
     */
    TimeCheckerContext.prototype.isAllowedSave = function() {
        if (this.allowSaveCallback) {
            return this.allowSaveCallback();
        }

        return true;
    };

    /**
     * Set allow save callback
     * @param {function} allowSaveCallback allow save callback
     * @returns {void} void
     */
    TimeCheckerContext.prototype.setAllowSaveCallback = function(allowSaveCallback) {
        this.allowSaveCallback = null;

        if (typeof allowSaveCallback === 'function') {
            this.allowSaveCallback = allowSaveCallback;
        }
    };

    /**
     * Saving delay
     * @returns {number} delay
     */
    TimeCheckerContext.prototype.getDelay = function() {
        return this.delay;
    };

    /**
     * Phone Banner Time Checker Factory
     */
    const PhoneBannerTimeChecker = {
        checker: null
    };

    /**
     * Time checker instance
     *
     * @param {function} allowSaveCallback save callback for context
     * @returns {TimeChecker} Time checker instance
     */
    PhoneBannerTimeChecker.init = async function(allowSaveCallback) {
        if (this.checker) {
            this.checker.getContext().setAllowSaveCallback(allowSaveCallback);
            return this.checker;
        }
        const timeCheckerContext = new TimeCheckerContext('pb');
        const timeChecker = new TimeChecker(timeCheckerContext, allowSaveCallback);

        await timeChecker.init();
        this.checker = timeChecker;
        return timeChecker;
    };

    TimeChecker.Context = TimeCheckerContext;
    TimeChecker.PhoneBanner = PhoneBannerTimeChecker;

    Object.defineProperty(window.mega, 'TimeChecker', {
        value: TimeChecker
    });
})(window);
