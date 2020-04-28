(function() {
    /**
     * Simplified* and minimalistic `$(window).on('resize', ...)` event listener API that is more optimal then
     * $.fn.remove/add.
     *
     * Automatically initialized globally as `chatGlobalEventManager`.
     *
     *  note* - would never support extra Event-like features live bubbling, preventing default, etc, since this is
     *  only meant to be used for 'resize' event, which can't bubble or be "prevented"
     *
     * @constructor
     */
    var ChatGlobalEventManager = function() {
        this.initialized = false;
        this.listeners = {
            'resize': {},
            'hashchange': {}
        };
    };


    /**
     * Called internally to actually do the resize binding when needed.
     *
     * @private
     */
    ChatGlobalEventManager.prototype._lateInit = function() {
        $(window).rebind('resize.chatGlobalEventManager', this.triggered.bind(this, "resize"));
        window.addEventListener('hashchange', this.triggered.bind(this, "hashchange"));

        this.initialized = true;
    };

    /**
     * Add an `cb` event listener for `eventName` with namespace `namespace`
     *
     * @param {String} eventName
     * @param {String} namespace
     * @param {Function} cb
     */
    ChatGlobalEventManager.prototype.addEventListener = function(eventName, namespace, cb) {
        if (this.initialized === false) {
            this._lateInit();
        }
        this.listeners[eventName][namespace] = this.listeners[namespace] || cb;
    };

    /**
     * Remove listener with namespace `namespace`
     *
     * @param {String} eventName
     * @param {String} namespace
     */
    ChatGlobalEventManager.prototype.removeEventListener = function(eventName, namespace) {
        delete this.listeners[eventName][namespace];
    };

    /**
     * Called by the onResize/hashchange
     */
    ChatGlobalEventManager.prototype.triggered = SoonFc(function(eventName, e) {
        for (var k in this.listeners[eventName]) {
            this.listeners[eventName][k](e);
        }
    }, 122);

    // init globally. will be initialized only when first .addEventListener is called
    window.chatGlobalEventManager = new ChatGlobalEventManager();
})();
