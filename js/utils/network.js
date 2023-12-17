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

        if (!once || !eventlog.sent[id]) {
            eventlog.sent[id] = [Date.now(), M.getStack()];
            return api.req(req).catch((ex) => dump(id, ex));
        }
    }
    else {
        console.error('Invalid event log.', arguments);
    }
}

eventlog.sent = Object.create(null);
