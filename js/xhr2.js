(function _xhrTransfersLogic(global) {
    "use strict";

    var xhrTimeout = parseInt(localStorage.xhrTimeout) || (2 * 60 * 1000);
    var logger = MegaLogger.getLogger('xhr2');
    var debug = global.d && parseInt(localStorage.xhr2debug);
    var xhrStack = [];

    /**
     * Get a new reusable XMLHttpRequest
     */
    var getXMLHttpRequest = function _xhr2() {
        var idx = xhrStack.length;
        while (idx--) {
            var state = xhrStack[idx].readyState;
            if (state === 4 || state === 0) {
                break;
            }
        }

        if (idx < 0) {
            idx = xhrStack.push(new XMLHttpRequest) - 1;
        }
        return xhrStack[idx];
    };

    /**
     * Creates a new XMLHttpRequest for a transfer.
     *
     * @param {Object} listener
     *     The instance creating the request, either Download or Upload
     */
    var getTransferXHR = function getTransferXHR(listener) {
        if (!(this instanceof getTransferXHR)) {
            return new getTransferXHR(listener);
        }
        if (debug) {
            logger.debug('Creating new XHR for "%s"', listener);
        }

        var self = this;
        var xhr = getXMLHttpRequest();

        xhr.onerror = function(ev) {
            self.abort(ev);
        };

        xhr.onreadystatechange = function(ev) {
            var readyState = this.readyState;
            var _logger = self.logger || logger;

            self.setTimeout();
            if (debug > 1) {
                _logger.debug('readystatechange:%d', readyState);
            }

            if (readyState === XMLHttpRequest.DONE) {
                if (!use_ssl) {
                    dlmanager.checkHSTS(this);
                }

                if (Object(self.listener).onXHRready) {
                    var result = self.listener.onXHRready(ev);

                    if (debug) {
                        _logger.debug('onXHRready', result);
                    }

                    // We have finished with this request, cleanup
                    self.abort(result);
                }
            }
        };

        var progress = function(ev) {
            if (debug > 1) {
                var _logger = self.logger || logger;
                _logger.debug('progress %d/%d', ev.loaded, ev.total);
            }

            self.setTimeout();

            self.total = ev.total;
            self.loaded = ev.loaded;

            if (Object(self.listener).onXHRprogress) {
                self.listener.onXHRprogress(ev);
            }
        };

        if (listener instanceof ChunkUpload) {
            xhr.upload.onprogress = progress;
        }
        else {
            xhr.onprogress = progress;
        }
        progress = undefined;

        this.xhr = xhr;
        this.timeout = null;
        this.listener = listener;
        this.owner = String(listener);

        if (debug) {
            this.logger = new MegaLogger(this.owner, {}, logger);
        }

        xhr = undefined;
    };

    getTransferXHR.prototype = Object.freeze({
        // Mimic XMLHttpRequest properties
        get status() {
            return Object(this.xhr).status;
        },
        get statusText() {
            return Object(this.xhr).statusText;
        },
        get readyState() {
            return Object(this.xhr).readyState;
        },
        get responseType() {
            return Object(this.xhr).responseType;
        },
        set responseType(type) {
            Object(this.xhr).responseType = type;
        },
        get response() {
            return Object(this.xhr).response;
        },

        // Mimic XMLHttpRequest methods
        open: function _open() {
            this.openTime = Date.now();
            XMLHttpRequest.prototype.open.apply(this.xhr, arguments);
        },
        send: function _send() {
            this.sendTime = Date.now();
            XMLHttpRequest.prototype.send.apply(this.xhr, arguments);
        },

        /**
         * Abort/cleanup this XMLHttpRequest
         * @param {Object|Number} ev XHR event or one of ABORT_*
         */
        abort: function _abort(ev) {
            var xhr = this.xhr;
            if (debug) {
                var _logger = this.logger || logger;
                _logger.debug('_abort(%s)', ev, this);
            }

            if (xhr) {
                var type = ev && ev.type || 'error';

                if (!use_ssl) {
                    dlmanager.checkHSTS(xhr);
                }

                if (this.listener) {
                    var listener = this.listener;
                    this.listener = null;

                    // Notify the listener if there was an error
                    if (ev === this.ABORT_EINTERNAL
                            || ev === this.ABORT_TIMEOUT) {

                        if (listener.onXHRerror) {
                            listener.onXHRerror(ev, xhr, type);
                        }
                    }
                }

                xhr.onerror = null;
                xhr.onprogress = null;
                xhr.upload.onprogress = null;
                xhr.onreadystatechange = null;

                this.xhr = null;
                XMLHttpRequest.prototype.abort.call(xhr);
            }

            this.abortTime = Date.now();
            this.clearTimeout();
        },

        // Wrapper for window's set/clear timeout
        setTimeout: function() {
            this.clearTimeout();

            this.timeout = setTimeout(function() {
                this.abort(this.ABORT_TIMEOUT);
            }.bind(this), xhrTimeout);

            // Keep a last activity record for this request
            this.xhrLastActivity = Date.now();
        },
        clearTimeout: function() {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        },

        toString: function() {
            return '[object getTransferXHR(' + this.owner + ')]';
        },

        ABORT_CLEANUP: -0x80,
        ABORT_TIMEOUT: -0x81,
        ABORT_EINTERNAL: -0x82
    });

    /**
     * Cleanup XMLHttpRequest instances.
     * This is usually invoked when transfers have finished.
     */
    var clearTransferXHRs = function() {
        var idx = xhrStack.length;

        logger.debug('clearTransferXHRs', idx);

        while (idx--) {
            var state = xhrStack[idx].readyState;
            if (state !== 4 && state !== 0) {
                logger.warn('Aborting XHR at #%d', idx);

                xhrStack[idx].abort();
            }
        }
        // xhrStack = [];
    };

    // Export globals
    global.getTransferXHR = getTransferXHR;
    global.clearTransferXHRs = clearTransferXHRs;
    if (debug) {
        global.xhrStack = xhrStack;
    }

})(this);
