/**
 * Retrieve data from storage servers.
 * @param {String|Object} aData           ufs-node's handle or public link
 * @param {Number}        [aStartOffset]  offset to start retrieveing data from
 * @param {Number}        [aEndOffset]    retrieve data until this offset
 * @param {Function}      [aProgress]     callback function which is called with the percent complete
 * @returns {MegaPromise}
 */
function megaUtilsGFSFetch(aData, aStartOffset, aEndOffset, aProgress) {
    'use strict';

    var promise = new MegaPromise();

    var fetcher = function(data) {

        aEndOffset = parseInt(aEndOffset);
        aStartOffset = parseInt(aStartOffset);

        if (aEndOffset === -1 || aEndOffset > data.s) {
            aEndOffset = data.s;
        }

        if ((!aStartOffset && aStartOffset !== 0)
            || aStartOffset > data.s || !aEndOffset
            || aEndOffset < aStartOffset) {

            return promise.reject(ERANGE, data);
        }
        var byteOffset = aStartOffset % 16;

        if (byteOffset) {
            aStartOffset -= byteOffset;
        }

        var request = {
            method: 'POST',
            type: 'arraybuffer',
            url: data.g + '/' + aStartOffset + '-' + (aEndOffset - 1)
        };

        if (typeof aProgress === 'function') {
            request.prepare = function(xhr) {
                xhr.addEventListener('progress', function(ev) {
                    if (ev.lengthComputable) {

                        // Calculate percentage downloaded e.g. 49.23
                        var percentComplete = ((ev.loaded / ev.total) * 100);
                        var bytesLoaded = ev.loaded;
                        var bytesTotal = ev.total;

                        // Pass the percent complete to the callback function
                        aProgress(percentComplete, bytesLoaded, bytesTotal);
                    }
                }, false);
            };
        }

        M.xhr(request).done(function(ev, response) {

            data.macs = {};
            data.writer = [];

            if (!data.nonce) {
                var key = data.key;

                data.nonce = JSON.stringify([
                    key[0] ^ key[4],
                    key[1] ^ key[5],
                    key[2] ^ key[6],
                    key[3] ^ key[7],
                    key[4], key[5]
                ]);
            }

            Decrypter.unshift([
                [data, aStartOffset],
                data.nonce,
                aStartOffset / 16,
                new Uint8Array(response || ev.target.response)
            ], function resolver() {
                try {
                    var buffer = data.writer.shift().data.buffer;

                    if (byteOffset) {
                        buffer = buffer.slice(byteOffset);
                    }

                    data.buffer = buffer;
                    promise.resolve(data);
                }
                catch (ex) {
                    promise.reject(ex);
                }
            });

        }).fail(function() {
            promise.reject.apply(promise, arguments);
        });
    };

    if (typeof aData !== 'object') {
        var key;
        var handle;
        var error = EARGS;

        // If a ufs-node's handle provided
        if (String(aData).length === 8) {
            handle = aData;
        }
        else {
            // if a public-link provided, eg #!<handle>!<key>
            aData = String(aData).replace(/^.*?#!/, '').split('!');

            if (aData.length === 2 && aData[0].length === 8) {
                handle = aData[0];
                key = base64_to_a32(aData[1]).slice(0, 8);
            }
        }

        if (handle) {
            var callback = function(res) {
                if (typeof res === 'object' && res.g) {
                    res.key = key;
                    res.handle = handle;
                    if (res.efq) {
                        dlmanager.efq = true;
                    }
                    else {
                        delete dlmanager.efq;
                    }
                    fetcher(res);
                }
                else {
                    promise.reject(res);
                }
            };
            var req = {a: 'g', g: 1, ssl: use_ssl};

            if (!key) {
                req.n = handle;
                key = M.getNodeByHandle(handle).k;
            }
            else {
                req.p = handle;
            }

            if (!Array.isArray(key) || key.length !== 8) {
                error = EKEY;
            }
            else {
                error = 0;
                api_req(req, {callback: callback}, pfid ? 1 : 0);
            }
        }

        if (error) {
            onIdle(function() {
                promise.reject(error);
            });
        }
    }
    else {
        onIdle(fetcher.bind(null, aData));
    }

    aData = undefined;

    return promise;
}

/**
 * Promise-based XHR request
 * @param {Object|String} aURLOrOptions   URL or options
 * @param {Object|String} [aData]         Data to send, optional
 * @returns {MegaPromise}
 */
function megaUtilsXHR(aURLOrOptions, aData) {
    'use strict';

    /* jshint -W074 */
    var xhr;
    var url;
    var method;
    var options;
    var json = false;
    var promise = new MegaPromise();

    if (typeof aURLOrOptions === 'object') {
        options = aURLOrOptions;
        url = options.url;
    }
    else {
        options = {};
        url = aURLOrOptions;
    }
    aURLOrOptions = undefined;

    aData = options.data || aData;
    method = options.method || (aData && 'POST') || 'GET';

    xhr = getxhr();

    if (typeof options.prepare === 'function') {
        options.prepare(xhr);
    }

    if (options.timeout) {
        xhr.timeout = options.timeout;
    }

    xhr.onloadend = function(ev) {
        var error = false;

        if (this.status === 200) {
            try {
                return promise.resolve(ev, json ? JSON.parse(this.response) : this.response);
            }
            catch (ex) {
                error = ex;
            }
        }

        promise.reject(ev, error);
    };

    try {
        if (d) {
            MegaLogger.getLogger('muXHR').info(method + 'ing', url, options, aData);
        }
        xhr.open(method, url);

        if (options.type) {
            xhr.responseType = options.type;
            if (xhr.responseType !== options.type) {
                if (options.type === 'json') {
                    xhr.responseType = 'text';
                    json = true;
                }
                else {
                    xhr.abort();
                    throw new Error('Unsupported responseType');
                }
            }
        }

        if (typeof options.beforeSend === 'function') {
            options.beforeSend(xhr);
        }

        if (is_chrome_firefox) {
            xhr.setRequestHeader('Origin', getBaseUrl(), false);
        }

        xhr.send(aData);
    }
    catch (ex) {
        onIdle(function() {
            promise.reject(ex);
        });
    }

    xhr = options = undefined;

    return promise;
}

function hostname(url) {
    'use strict';

    if (d && !String(url).startsWith('http')) {
        console.warn('Invalid URL passed to hostname()', url);
    }

    url = String(url).match(/https?:\/\/([^.]+)/);
    return url && url[1];
}


// fire an event log
function eventlog(id, msg, once) {
    'use strict';

    if ((id = parseInt(id)) >= 99600) {
        var req = {a: 'log', e: id};

        if (msg === true) {
            once = true;
            msg = 0;
        }

        if (msg) {
            req.m = String(msg);
        }

        if (!once || !eventlog.sent[id]) {
            eventlog.sent[id] = [Date.now(), M.getStack()];
            api_req(req);
        }
    }
    else {
        console.error('Invalid event log.', arguments);
    }
}

eventlog.sent = Object.create(null);
