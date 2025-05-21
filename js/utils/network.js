/**
 * Retrieve data from storage servers.
 * @param {String|Object} aData           ufs-node's handle or public link
 * @param {Number}        [aStartOffset]  offset to start retrieveing data from
 * @param {Number}        [aEndOffset]    retrieve data until this offset
 * @param {Function}      [aProgress]     callback function which is called with the percent complete
 * @returns {Promise} Uint8Array
 */
async function megaUtilsGFSFetch(aData, aStartOffset, aEndOffset, aProgress) {
    'use strict';

    if (typeof aData !== 'object') {
        aData = await megaUtilsGFSFetch.getTicketData(aData);
    }

    if (aStartOffset === undefined) {
        aEndOffset = -1;
        aStartOffset = 0;
    }

    aEndOffset = parseInt(aEndOffset);
    aStartOffset = parseInt(aStartOffset);

    if (aEndOffset === -1 || aEndOffset > aData.s) {
        aEndOffset = aData.s;
    }

    if (!aStartOffset && aStartOffset !== 0
        || aStartOffset > aData.s || !aEndOffset
        || aEndOffset < aStartOffset) {

        return Promise.reject(ERANGE);
    }
    const byteOffset = aStartOffset % 16;

    if (byteOffset) {
        aStartOffset -= byteOffset;
    }

    const request = {
        method: 'POST',
        type: 'arraybuffer',
        url: `${aData.g}/${aStartOffset}-${aEndOffset - 1}`
    };

    if (typeof aProgress === 'function') {
        aProgress = ((cb) => (ev) =>
            ev.lengthComputable && cb(ev.loaded / ev.total * 100, ev.loaded, ev.total))(aProgress);

        request.prepare = function(xhr) {
            xhr.addEventListener('progress', aProgress, false);
        };
    }

    const ev = await(
        Array.isArray(aData.g)
            ? CloudRaidRequest.fetch(aData, aStartOffset, aEndOffset, aProgress)
            : M.xhr(request)
    );
    aData.macs = {};
    aData.writer = [];

    if (!aData.nonce) {
        const {key} = aData;

        aData.nonce = JSON.stringify([
            key[0] ^ key[4], key[1] ^ key[5], key[2] ^ key[6], key[3] ^ key[7], key[4], key[5]
        ]);
    }

    return new Promise((resolve, reject) => {
        const uint8 = new Uint8Array(ev.target.response);
        const method = window.dlmanager && dlmanager.isDownloading ? 'unshift' : 'push';

        Decrypter[method]([[aData, aStartOffset], aData.nonce, aStartOffset / 16, uint8], tryCatch(() => {
            let {data: uint8} = aData.writer.shift();

            if (byteOffset) {
                uint8 = new Uint8Array(uint8.buffer.slice(byteOffset));
            }

            uint8.payload = aData;
            resolve(uint8);
        }, reject));
    });
}

megaUtilsGFSFetch.getTicket = (aData) => {
    'use strict';
    let key, n, handle;
    const payload = {a: 'g', v: 2, g: 1, ssl: use_ssl};
    const options = {
        channel: pfid ? 1 : 0
    };

    // If a ufs-node's handle provided
    if (String(aData).length === 8) {
        handle = aData;
    }
    else if (aData.customRequest) {
        payload.a = aData.customRequest;
        handle = aData.dl_id;
        n = aData;
    }
    else if (typeof aData === 'object') {
        // if a download-instance provided.
        handle = aData.dl_id;
        n = aData.nauth && aData;
        key = aData.ph && aData.key;
    }
    else {
        // if a public-link provided, eg #!<handle>!<key>
        aData = String(aData).replace(/^.*?#!/, '').split('!');

        if (aData.length === 2 && aData[0].length === 8) {
            handle = aData[0];
            key = base64_to_a32(aData[1]).slice(0, 8);
        }
    }

    if (key) {
        payload.p = handle;
    }
    else {
        payload.n = handle;
        key = (n = n || M.getNodeByHandle(handle)).k;
    }

    if (!handle || !Array.isArray(key) || key.length !== 8) {
        return {error: EARGS};
    }

    // IF this is an anonymous chat OR a chat that I'm not a part of
    if (M.chat && megaChatIsReady) {
        megaChat.eventuallyAddDldTicketToReq(payload);
    }

    if (self.d && String(apipath).includes('staging')) {
        const s = sessionStorage;
        if (s.dltfefq || s.dltflimit) {
            payload.f = [s.dltfefq | 0, s.dltflimit | 0];
        }
    }

    if ((n = n || M.getNodeByHandle(handle))) {
        const {foreign: f, nauth: a} = n;

        if (a && (!pfid || f)) {
            // options.queryString = `n=${n.nauth}`;
            payload.enp = a;
        }
        if (f) {
            options.channel = 6;
        }
    }

    return {payload, key, handle, options};
};

megaUtilsGFSFetch.getTicketData = async(aData) => {
    'use strict';

    if (typeof aData === 'object') {
        aData.dlTicketData = false;
    }
    const {payload, options, key, handle, error} = megaUtilsGFSFetch.getTicket(aData);
    const res = error || (await api.req(payload, options)).result;

    if (typeof res === 'object' && res.g) {
        let error = !!res.d;

        res.key = key;
        res.handle = handle;

        if (typeof res.g === 'object') {
            // API may gives a fake array...
            res.g = Object.values(res.g);

            if (res.g[0] < 0) {
                error = res.g[0];
            }
        }
        res.e = res.e || error || !res.g;

        if (!res.e) {
            delete dlmanager.efq;
            if (res.efq) {
                dlmanager.efq = true;
            }
            if (typeof aData === 'object') {
                aData.dlTicketData = res;
            }
            return res;
        }
    }

    throw res && res.e || res || EINTERNAL;
};

megaUtilsGFSFetch.roundOffsetBoundary = (value, min, max) => {
    'use strict';
    return value > max ? max : value <= min ? min : min * Math.floor(value / min);
};

megaUtilsGFSFetch.getOffsets = (length) => {
    'use strict';
    let offset = 0;
    const res = [];
    const KiB = 0x1ffec;
    const MiB = 0x100000;

    for (let i = 1; i < 9 && offset < length - i * KiB; ++i) {
        const end = i * KiB;
        res.push([offset, end]);
        offset += end;
    }
    const size = megaUtilsGFSFetch.roundOffsetBoundary(length >> 4, MiB, MiB << 4);

    while (offset < length) {
        const end = Math.min(size, Math.floor((length - offset) / MiB + 1) * MiB);
        res.push([offset, end]);
        offset += end;
    }

    offset = res[res.length - 1];
    if (length - offset[0] > 0) {
        offset[1] = length - offset[0];
    }

    return res.reverse();
};

/**
 * @param {Blob|MegaNode} file a Blob, File or MegaNode instance.
 * @param {Number} [start] offset to start retrieving data from
 * @param {Number} [end] retrieve data until this offset
 * @returns {Promise<Uint8Array>}
 */
megaUtilsGFSFetch.managed = async(file, start, end) => {
    'use strict';

    if (self.dlmanager && dlmanager.isOverQuota) {
        // @todo check dependants and do this on megaUtilsGFSFetch()
        throw EOVERQUOTA;
    }
    const payload = typeof file.seen === 'object' && file.seen || file.link || file.h || file;

    return megaUtilsGFSFetch(payload, start, start + end)
        .catch((ex) => {
            const {status} = ex && ex.target || false;

            switch (status) {
                case 0:
                    ex = EAGAIN;
                    break;
                case 403:
                    file.seen = -1;
                    return megaUtilsGFSFetch.managed(file, start, end);
                case 509:
                    ex = EOVERQUOTA;
                    break;
            }

            if (ex === EOVERQUOTA && self.dlmanager && !dlmanager.isOverQuota) {
                dlmanager.showOverQuotaDialog();
            }

            throw ex;
        });
};

/**
 * @param {Blob|MegaNode} file a Blob, File or MegaNode instance.
 * @param {*} [options] guess it.
 */
megaUtilsGFSFetch.getReadableStream = (file, options) => {
    'use strict';
    let offsets, size;

    options = options || Object.create(null);

    return new ReadableStream({
        async start(controller) {
            if (!((size = parseInt(file.size || file.s)) > 0)) {
                return controller.close();
            }
            offsets = megaUtilsGFSFetch.getOffsets(size);
            return this.pull(controller);
        },
        async pull(controller) {
            if (!offsets.length) {
                controller.close();
                return;
            }
            const [start, end] = offsets.pop();

            // @todo fire more parallel downloads per stream regardless of queueing strategy(?)
            let chunk = await megaUtilsGFSFetch.managed(file, start, end)
                .catch((ex) => {
                    if (ex === EOVERQUOTA) {
                        controller.error(ex);
                    }
                    return ex;
                });

            if (chunk instanceof Uint8Array && chunk.byteLength > 0) {

                if (options.progress) {
                    options.progress((start + end) / size * 100, file);
                }
                file.seen = chunk.payload;
            }
            else {
                if (options.error) {
                    options.error(chunk, file, controller);
                }
                chunk = new Uint8Array(0);
            }

            controller.enqueue(chunk);
        }
    }, options.queuingStrategy);
};

freeze(megaUtilsGFSFetch);

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

    xhr = new XMLHttpRequest();

    if (typeof options.prepare === 'function') {
        options.prepare(xhr);
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
            console.info(`${method}ing`, url, options, aData);
        }
        xhr.open(method, url);
        if (options.timeout) {
            xhr.timeout = options.timeout;
        }

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
        const req = {a: 'log', e: id};
        const {jid} = mega.flags;

        if (msg === true) {
            once = true;
            msg = 0;
        }

        if (jid) {
            req.v = mega.viewID;
            req.j = localStorage.jid || jid;
            req.ms = Date.now();
        }

        if (msg) {
            req.m = String(msg).replace(/[\t\n\v\f\r\u200E\u200F\u202E]+/g, ' ');

            if (req.m.length > 666) {
                if (d) {
                    console.error('The message provided for %s is too large...', id, [req.m]);
                }
                delete req.m;
            }
        }

        if (id > 99799 && self.buildOlderThan10Days) {
            return self.d && console.info('eventlog(%d)', id, once, [req]);
        }

        if (!once || !eventlog.sent[id]) {
            eventlog.sent[id] = Date.now();
            return api.req(req).catch((ex) => dump(id, ex));
        }
    }
    else {
        console.error('Invalid event log.', arguments);
    }
}

eventlog.sent = Object.create(null);


/**
 * Network connectivity watcher.
 * @description The idea is that classes/functions making use of the Fetch API will
 * register themselves on this interface whenever attempting to stablish a connection.
 * Whenever the catch handler is invoked, they shall register the exception thrown.
 * @name enotconn
 * @global
 */
lazy(self, 'enotconn', () => {
    'use strict';
    let down;
    const wm = new IWeakMap();
    const logger = MegaLogger.getLogger('enotconn');
    const dsp = () => {
        let fail = 0;
        const {size} = wm;
        for (const [, t] of wm) {
            if (t !== 'online') {
                ++fail;
            }
        }

        if (fail > 0) {
            if (self.d) {
                logger.warn('%d of %d connections are failing', fail, size);
            }
            if (size === fail) {
                down = 1;
                mBroadcaster.sendMessage('ENOTCONN', navigator.onLine ? 'maybe-offline' : 'offline');
            }
        }
        else if (size > 0) {
            mBroadcaster.sendMessage('ENOTCONN', down ? 'online' : 'keep-alive');
            down = 0;
        }
        else {
            if (self.d) {
                logger.warn('Ran empty, nothing to watch for.');
            }
            mBroadcaster.sendMessage('ENOTCONN', 'dead-end');
        }
    };

    ((ec) => {
        window.addEventListener('online', ec);
        window.addEventListener('offline', ec);
    })((ev) => {
        for (const [cl] of wm) {
            enotconn.register(cl, ev.type);

            if (typeof cl.handleEvent === 'function') {
                cl.handleEvent(ev);
            }
        }
    });

    return freeze({
        get size() {
            return wm.size;
        },
        unregister(cl) {
            if (self.d) {
                logger.log('unregister', cl);
            }
            wm.delete(cl);
        },
        register(cl, val = 'online') {
            if (self.d > 1) {
                logger.log('register', cl, val);
            }
            wm.set(cl, `${val}`);

            if (mBroadcaster.hasListener('ENOTCONN')) {

                delay(`enotconn<dsp>`, dsp, 4e3 * (!!document.hidden + 1));
            }

            if (!dsp.ack) {
                queueMicrotask(() => {
                    dsp.ack = 0;
                });
                dsp.ack = 1;
                mBroadcaster.sendMessage('enotconn:ack', val);
            }
        }
    });
});
