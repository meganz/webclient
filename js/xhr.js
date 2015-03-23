var mXHRTimeoutMS = localStorage.xhrtimeout || 2 * 60 * 1000;

(function(w) {

    var _xhr_queue = [],
        total = 0

    function newXhr() {
        var xhr = getxhr();
        xhr.__id = ++total
        xhr.__timeout = null;
        xhr.__timeout_ms = mXHRTimeoutMS;
        xhr.clear_timeout = function() {
            if (this.__timeout) {
                clearTimeout(this.__timeout);
                delete this.__timeout;
            }
        };
        xhr.setup_timeout = function() {
            this.clear_timeout();
            this.__timeout = setTimeout(this.mOnTimeout, this.__timeout_ms);
        };

        xhr._abort = xhr.abort;
        xhr._send = xhr.send

        xhr.send = function() {
            this.setup_timeout();
            if (arguments.length == 0) {
                // download
                xhr.started = Date.now()
                return xhr._send();
            }

            // upload
            return xhr._send.apply(this, arguments)
        }

        xhr.abort = function() {
            DEBUG('Socket: aborting', this.__id);
            this.clear_timeout();
            this.listener = null; /* we're done here, release this slot */
            this._abort();
        }

        xhr.nolistener = function() {
            this.clear_timeout();
            if (!this.__failed) {
                if (d) {
                    console.error('Socket: no listener for socket', this.__id);
                }
                this.__failed = true;
                this._abort();
            }
        }

        xhr.onreadystatechange = function() {
            if (!this.listener) {
                return this.nolistener();
            }
            this.setup_timeout();
            switch (this.readyState) {
                case this.HEADERS_RECEIVED:
                    if ((Date.now() - this.started) > 10000) {
                        srvlog(hostname(this.responseURL || this._murl) + ' took +10s');
                    }
                    break;
                case 4:
                    if (this.listener.on_ready) {
                        this.clear_timeout();
                        if (0xDEAD === this.listener.on_ready(arguments, this)) {
                            this.onerror();
                        }
                        else {
                            this.listener = null; /* we're done here, release this slot */
                        }
                    }
                    break;
                    // case 2:
                    // force progress update in case of a previous error with the chunk
                    // this.onprogress({zSaaDc:1});
            }
        }

        xhr.upload.onprogress = function() {
            if (!xhr.listener) {
                return xhr.nolistener();
            } /* no one is listening */
            xhr.setup_timeout();
            /**
             *  Update the start time, so we meassure the response time
             *  not the upload time
             */
            xhr.started = Date.now()

            if (xhr.listener.on_upload_progress) {
                xhr.listener.on_upload_progress(arguments, xhr);
            }
        }

        xhr.xhr_cleanup = function(e) {
            if (!this.listener) {
                return this.nolistener();
            }
            this.clear_timeout();
            if (this.listener.on_error && !this.__failed) {
                var l = this.listener;
                this.listener = null; /* release */
                this.__failed = true;
                if (e !== 0x9ffe) {
                    var r = e && e.type || 'error';
                    if (d) {
                        console.error('Socket: on' + r, this.__id, this);
                    }
                    l.on_error(arguments, this, r);
                }
                this._abort();
                for (var i = 0; i < _xhr_queue.length; i++) {
                    if (_xhr_queue[i].__id == this.__id) {
                        _xhr_queue.splice(i, 1);
                        break;
                    }
                }
            }
        };
        xhr.onerror = xhr.xhr_cleanup;
        xhr.mOnTimeout = xhr.xhr_cleanup.bind(xhr, {
            type: 'mtimeout'
        });

        xhr.onprogress = function() {
            if (!this.listener) {
                return this.nolistener();
            }
            this.setup_timeout();
            if (this.listener.on_progress) {
                this.listener.on_progress(arguments, this)
            }
        }

        return xhr;
    }

    w.killallXhr = function() {
        for (var i = 0; i < _xhr_queue.length; i++) {
            _xhr_queue[i].abort();
        }
    }

    w.clearXhr = function() {
        _xhr_queue = $.grep(_xhr_queue, function(val) {
            return val.listener !== null;
        });
    };

    w.getXhr = function(object) {
        var zclass = (object.constructor || {}).name || "no-class";
        for (var i = 0; i < _xhr_queue.length; i++) {
            if (!_xhr_queue[i].listener && _xhr_queue[i].type == zclass) {
                _xhr_queue[i].listener = object;
                _xhr_queue[i].lname = '' + object;
                _xhr_queue[i].__failed = false;
                return _xhr_queue[i];
            }
        }

        /* create a new xhr object */
        var xhr = newXhr();
        xhr.listener = object;
        xhr.lname = '' + object;
        xhr.type = zclass;

        /* add it to the queue so we can recicle it */
        _xhr_queue.push(xhr);

        return xhr;
    }

})(this);
