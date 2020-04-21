(function() {
    /**
     * Simplified* and minimalistic `$(window).on('resize', ...)` event listener API that is more optimal then
     * $.fn.remove/add.
     *
     * Automatically initialized globally as `chatWinResizeManager`.
     *
     *  note* - would never support extra Event-like features live bubbling, preventing default, etc, since this is
     *  only meant to be used for 'resize' event, which can't bubble or be "prevented"
     *
     * @constructor
     */
    var ChatWinResizeManager = function() {
        this.initialized = false;
        this.listeners = {};
    };


    /**
     * Called internally to actually do the resize binding when needed.
     *
     * @private
     */
    ChatWinResizeManager.prototype._lateInit = function() {
        $(window).rebind('resize.chatWinResizeManager', this.triggered.bind(this));

        this.initialized = true;
    };

    /**
     * Add an `cb` event listener for window.onresize with namespace `namespace`
     *
     * @param {String} namespace
     * @param {Function} cb
     */
    ChatWinResizeManager.prototype.addEventListener = function(namespace, cb) {
        if (this.initialized === false) {
            this._lateInit();
        }
        this.listeners[namespace] = this.listeners[namespace] || cb;
    };

    /**
     * Remove listener with namespace `namespace`
     * @param {String} namespace
     */
    ChatWinResizeManager.prototype.removeEventListener = function(namespace) {
        delete this.listeners[namespace];
    };

    /**
     * Called by the onResize
     */
    ChatWinResizeManager.prototype.triggered = function(e) {
        for (var k in this.listeners) {
            if (Object.prototype.hasOwnProperty.call(this.listeners, k)) {
                this.listeners[k](e);
            }
        }
    }

    // init globally. will be initialized only when first .addEventListener is called
    window.chatWinResizeManager = new ChatWinResizeManager();
})();
