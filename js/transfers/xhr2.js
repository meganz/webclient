/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2016 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

(function _xhrTransfersLogic(global) {
    "use strict";

    var xhrTimeout = parseInt(localStorage.xhrTimeout) || 12e4;
    var logger = MegaLogger.getLogger('xhr2');
    var debug = global.d && parseInt(localStorage.xhr2debug);
    var xhrStack = [];

    /**
     * Simulate high speed network.
     * @private
     */
    function HSBHttpRequest() {
        this.status = 0;
        this.upload = this;
        this.statusText = '';
        this.responseType = 'text';
        this.readyState = XMLHttpRequest.UNSENT;
        this.logger = new MegaLogger('HSBHttpRequest', {}, logger);
    };
    HSBHttpRequest.prototype = Object.freeze({
        constructor: HSBHttpRequest,

        open: function(meth, url) {
            this.logger.info(meth, url);
            this.readyState = XMLHttpRequest.OPENED;

            var size = url.split('/').pop().split('-');
            this.dataSize = size[1] - size[0] + 1;
        },
        send: function() {
            this.logger.info('send', arguments);

            var self = this;
            setTimeout(function() {
                (function tick(state) {
                    if (self.readyState === XMLHttpRequest.UNSENT) {
                        self.logger.error('aborted...');
                        return;
                    }
                    var done = (++state === XMLHttpRequest.DONE);

                    if (!done) {
                        setTimeout(function() {
                            tick(state);
                        }, 90 * Math.random());
                    }
                    else {
                        var ev = new $.Event('progress');
                        ev.target = self;
                        ev.loaded = ev.total = self.dataSize;
                        self.onprogress(ev);

                        self.response = new Uint8Array(self.dataSize).buffer;
                    }

                    self.readyStateChange('readystatechange', state, done ? 200 : undefined);

                })(1);
            }, 90 * Math.random());
        },
        abort: function() {
            this.readyStateChange('abort', XMLHttpRequest.DONE);
            this.readyState = XMLHttpRequest.UNSENT;
        },
        readyStateChange: function(name, state, status) {
            var ev = new $.Event(name);
            ev.target = this;

            this.readyState = state;

            if (status !== undefined) {
                this.status = parseInt(status);
            }
            if (this.onreadystatechange) {
                this.onreadystatechange(ev);
            }
        }
    });

    /**
     * Get a new reusable XMLHttpRequest
     * @private
     */
    var getXMLHttpRequest = function _xhr2() {
        if (debug > 6) {
            return new HSBHttpRequest();
        }

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

        if (listener instanceof ClassChunk && Array.isArray(listener.dl.url)) {
            var bytes = listener.url.match(/(\d+)-(\d+)$/).map(Number);
            xhr = new CloudRaidRequest(listener.dl, bytes[1], ++bytes[2]);
        }

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
            else if (readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                self._ttfb = Date.now() - self.sendTime;
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
        get constructor() {
            return Object(this.xhr).constructor;
        },

        // Mimic XMLHttpRequest methods
        open: function _open() {
            this.openTime = Date.now();
            this.xhr.constructor.prototype.open.apply(this.xhr, arguments);
        },
        send: function _send() {
            this.sendTime = Date.now();
            this.xhr.constructor.prototype.send.apply(this.xhr, arguments);
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
                xhr.constructor.prototype.abort.call(xhr);
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
        xhrStack = [];
    };

    // Export globals
    global.getTransferXHR = getTransferXHR;
    global.clearTransferXHRs = clearTransferXHRs;
    if (debug) {
        global.xhrStack = xhrStack;
    }

})(this);
