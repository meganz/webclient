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
     * @returns {ChatGlobalEventManager} ChatGlobalEventManager instance
     */
    var ChatGlobalEventManager = function() {
        /* dummy */
    };


    /**
     * Called internally to actually do the resize binding when needed.
     *
     * @private
     * @returns {undefined}
     * @name listeners
     * @memberOf ChatGlobalEventManager.prototype
     */
    lazy(ChatGlobalEventManager.prototype, 'listeners', function() {
        window.addEventListener('hashchange', ev => this.triggered(ev));
        $(window).rebind('resize.chatGlobalEventManager', ev => this.triggered(ev));

        var listeners = Object.create(null);
        listeners.resize = Object.create(null);
        listeners.hashchange = Object.create(null);
        return listeners;
    });

    /**
     * Add an `cb` event listener for `eventName` with namespace `namespace`
     *
     * @param {String} eventName eventType/Name
     * @param {String} namespace the namespace to use for this listener
     * @param {Function} cb callback to be called for this listener
     *
     * @returns {undefined}
     */
    ChatGlobalEventManager.prototype.addEventListener = function(eventName, namespace, cb) {
        this.listeners[eventName][namespace] = this.listeners[namespace] || cb;
    };

    /**
     * Remove listener with namespace `namespace`
     *
     * @param {String} eventName eventType/Name
     * @param {String} namespace the namespace to use for this listener
     * @returns {undefined}
     */
    ChatGlobalEventManager.prototype.removeEventListener = function(eventName, namespace) {
        delete this.listeners[eventName][namespace];
    };

    /**
     * Called by the onResize/hashchange
     *
     * @param {String} eventName the eventType/name
     * @param {Event} e the actual Event object
     *
     * @returns {undefined}
     */
    ChatGlobalEventManager.prototype.triggered = SoonFc(140, function _chatEVDispatcher(ev) {
        if (M.chat) {
            var listeners = this.listeners[ev.type];

            // eslint-disable-next-line guard-for-in
            for (var k in listeners) {
                listeners[k](ev);
            }
        }
    });

    // init globally. will be initialized only when first .addEventListener is called
    window.chatGlobalEventManager = new ChatGlobalEventManager();
})();
