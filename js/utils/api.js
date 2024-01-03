/* global MEGAException, MegaLogger, JSONSplitter, freeze, sleep, api_reqfailed, requesti, scqhead, scqtail */

/**
 * Deferred callback invocation controller
 */
class MEGADeferredController extends Promise {
    /**
     * Constructs a new instance.
     * @param {String|Function} [callback] the function to invoke deferred.
     * @param {*} [ctx] context/scope to invoke the function with.
     * @param {*} data data to pass through the callback
     * @param {String} [method] fire on idle, or timer based
     */
    constructor(callback, ctx, data, method = 'idle') {
        let _reject, _resolve;
        super((resolve, reject) => {
            _reject = reject;
            _resolve = resolve;
        });

        if (typeof callback === 'string') {
            method = callback;
            callback = nop;
        }

        this.id = null;
        this.timeout = false;
        this.callback = () => {
            Promise.resolve(callback.call(ctx, data)).then(_resolve).catch(_reject);

            if (this.id !== 0) {
                this.id = false;
                this.callback = nop;
            }
        };

        Object.defineProperty(this, 'method', {value: method});
        Object.defineProperty(this, 'reject', {value: _reject});
        Object.defineProperty(this, 'resolve', {value: _resolve});

        Object.defineProperty(this, 'name', {value: ctx ? `${this}:${ctx}:${(ctx.logger || ctx).name}` : method});
    }

    get [Symbol.toStringTag]() {
        return 'MEGADeferredController';
    }

    /**
     * Fire the deferred invocation.
     * @param {Number} timeout value in milliseconds.
     * @returns {MEGADeferredController} oneself
     */
    fire(timeout = 350) {
        const cb = this.callback;

        this.timeout = timeout;
        if (this.method === 'idle') {
            this.id = requestIdleCallback(cb, {timeout});
        }
        else {
            (this.id = tSleep(timeout / 1e3)).then(cb);
        }
        return this;
    }

    /**
     * Deferring cancellation.
     * @param {Boolean} [resolve] Whether the promise shall be fulfilled.
     * @returns {void}
     */
    cancel(resolve) {
        if (this.id) {
            if (this.method === 'idle') {
                cancelIdleCallback(this.id);
            }
            else {
                this.id.abort();
            }

            if (!resolve) {
                this.callback = this.reject.bind(null, new MEGAException(`${this.name} aborted.`, null, 'AbortError'));
            }
            queueMicrotask(this.callback);

            this.id = 0;
            this.catch(nop);
            this.callback = nop;
            freeze(this);
        }
    }
}

/**
 * Auto Renew Time-Offset
 */
class AutoRenewTimeOffset {
    constructor(offset = 168) {
        const time = Date.now();
        if (time < 169e10) {
            tryCatch(() => {
                if (!sessionStorage.ivComTmo) {
                    sessionStorage.ivComTmo = 1;
                    onIdle(() => {
                        eventlog(99893, JSON.stringify([1, time]));
                    });
                    console.error('Invalid computer time.', time, new Date(time));
                }
            }, false)();
        }

        while (time + 864e5 - ++offset * 1e10 > 0) {
            /* noop */
        }
        Object.defineProperty(this, 'value', {value: (time - --offset * 1e10) / 1e3 >>> 0});
    }

    get [Symbol.toStringTag]() {
        return 'AutoRenewTimeOffset';
    }

    valueOf() {
        return this.value;
    }
}

/** @property AutoRenewTimeOffset.value */
Object.defineProperty(AutoRenewTimeOffset, 'value', {
    get() {
        'use strict';
        return new AutoRenewTimeOffset().value;
    }
});

/**
 * Unique Lexicographically Sortable Identifier
 */
class MEGALexWord {
    constructor(value, mode = 'relaxed') {
        const rnd = new Uint16Array(3);
        crypto.getRandomValues(rnd);

        Object.defineProperty(this, 'timed', {
            value: this.generate(mode === 'strict' ? (Date.now() - 1671e9) / 1e3 : AutoRenewTimeOffset.value)
        });
        this.value = ((rnd[0] | rnd[2]) & 0x3f) * (value >>> 7 | rnd[2] << 3 | rnd[0] << 1 | rnd[1]);
    }

    get [Symbol.toStringTag]() {
        return 'MEGALexWord';
    }

    generate(value, range = MEGALexWord.range) {
        let res = '';

        do {
            res = range[value % range.length | 0] + res;
            value /= range.length;
        }
        while (value > 1);

        return res;
    }

    toString() {
        return this.timed + this.generate(++this.value);
    }

    toJSON() {
        return String(this);
    }

    valueOf() {
        return this.value;
    }
}

Object.defineProperty(MEGALexWord, 'range', {
    value: "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~"
});

/**
 * API Request Interface
 */
class MEGAPIRequest {
    constructor(channel, service, split = null, sid = false) {

        // channel identifier.
        Object.defineProperty(this, 'channel', {value: channel});

        // base URI component
        Object.defineProperty(this, 'service', {value: service});

        // associated JSON splitter rules; presence triggers progressive/chunked mode
        Object.defineProperty(this, 'split', {value: split});

        // queued executing commands + contexts
        Object.defineProperty(this, 'queue', {value: new Set()});

        // Unique Identifier(s)
        Object.defineProperty(this, '__ident_0', {
            value: `api${this.channel}.${this.service}${makeUUID().slice(-13)}`
        });
        this.__ident_1 = Math.random().toString(31).slice(-7);

        // sid URI component (optional)
        this.sid = sid || '';

        // Unique request start ID
        this.seqNo = -Math.log(Math.random()) * 0x10000000 >>> 0;

        /**
         * Unique Lexicographically Sortable Identifier
         * @property MEGAPIRequest.lex
         */
        lazy(this, 'lex', () => new MEGALexWord(this.seqNo));

        this.clear();

        const b = Math.min(172, 0x3f + (Math.random() * (this.channel << 4) | 0)).toString(16);
        this.logger = new MegaLogger(() => `[${this.__ident_0}.${this.__ident_1}]`, {
            // adaptiveTextColor: true,
            throwOnAssertFail: true,
            printDate: 'rad' in mega,
            levelColors: {
                ERROR: `#${b}0000`,
                DEBUG: `#0000${b}`,
                WARN: `#${b}${b}00`,
                INFO: `#00${b}00`,
                LOG: '#444'
            }
        });

        if (this.split) {
            this.fetch = this.chunkedFetch;
            this.parser = this.chunkedParser;
        }
    }

    get [Symbol.toStringTag]() {
        return 'MEGAPIRequest';
    }

    get idle() {
        return !this.flushing;
    }

    get sid() {
        return this['__@>'];
    }

    set sid(value) {
        delete this['__@<'];
        Object.defineProperty(this, '__@>', {value, configurable: true});
    }

    get queryString() {
        let value = this['__@<'];
        const wsc = this.service === 'wsc';

        if (value === undefined) {
            value = api.getURLSearchParams(`v=${api.version}${this.split ? '&ec' : ''}&${this.sid}`, +wsc);

            Object.defineProperty(this, '__@<', {value, configurable: true});
        }
        return wsc ? value : `id=${++this.seqNo}&${value}`;
    }

    clear() {
        this.queue.clear();

        if (this.flushing instanceof MEGADeferredController) {
            this.flushing.cancel();
        }
        if (this.timer instanceof MEGADeferredController) {
            this.timer.cancel();
        }
        if (this.controller) {
            tryCatch(() => this.controller.abort(), false)();
        }

        this.backoff = 0;
        this.cancelled = false;
        this.controller = null;
        this.flushing = false;
        this.inflight = false;
        this.rawreq = false;
        this.received = 0;
        this.residual = false;
        this.response = null;
        this.status = 0;
        this.timer = false;
        this.totalBytes = -1;
        this.url = null;
    }

    abort() {
        const queue = [...this.queue, ...this.inflight || []];

        if (d) {
            this.logger.warn('Aborting %s API channel...', this.idle ? 'idle' : 'busy', [this]);
        }
        Object.defineProperty(this, '__ident_1', {value: 'ABORTED'});

        this.clear();
        this.cancelled = true;
        Object.freeze(this);

        for (let i = queue.length; i--;) {
            const {reject, payload} = queue[i];
            if (d) {
                this.logger.warn('Rejecting API Request', payload);
            }
            reject(new APIRequestError(EROLLEDBACK, queue[i]));
        }
    }

    async enqueue(data) {
        MEGAException.assert(!this.cancelled);
        let flush = false;

        if (data.type === 'string' || data.type === 'array' || data.custom) {
            await this.flush();
            flush = true;
        }

        if (d) {
            const req = JSON.stringify(data.payload)
                .replace(/[\w-]{15,}/g, '\u2026')
                .replace(mega.chrome && /%/g, '%%');

            this.logger.debug(`Enqueue API request: ${req}`, [data]);
        }

        this.queue.add(data);

        if (flush) {
            return this.flush();
        }
        if (!this.flushing) {
            this.flushing = new MEGADeferredController(this.flush, this).fire(350);
        }
    }

    async dequeue(responses) {
        const queue = this.inflight;

        this.logger.assert(!this.cancelled, 'dequeue: this channel is aborted.');
        this.logger.assert(this.validateRequestResponse(responses, queue), 'dequeue: unexpected response(s)');

        for (let i = 0; i < queue.length; ++i) {
            const data = queue[i];
            const {resolve, reject, payload, type} = data;
            const result = this.getRequestResponse(responses, i, payload, type);

            if (result === EPAYWALL) {
                // @todo check whether we need to handle this more gracefully.
                return result;
            }

            if (this.isRequestError(result)) {

                reject(result);
            }
            else {
                delete data.reject;
                delete data.resolve;

                if (type === 'array') {
                    assert(queue.length === 1);
                    data.responses = responses;
                }

                data.result = result;
                resolve(data);
            }
        }
    }

    isRequestError(value) {
        return typeof value === 'number' && value < 0 || value instanceof APIRequestError;
    }

    validateRequestResponse(responses, queue) {

        if (responses.length !== queue.length) {

            return queue.length === 1 && queue[0].type === 'array'
                && (
                    queue[0].payload.length === responses.length || responses[0] === EROLLEDBACK
                );
        }

        return true;
    }

    getRequestResponse(responses, index, payload, type) {
        let result = responses[index];

        if (result && result.err < 0) {
            if (self.d) {
                this.logger.info('APIv2 Custom Error Detail', result, payload);
            }
            result = new APIRequestError(result.err, result);
        }

        if (type === 'array') {
            let rolledBack;

            for (index = responses.length; index--;) {
                result = this.getRequestResponse(responses, index, payload);

                if (this.isRequestError(result)) {

                    rolledBack = true;

                    if (Number(result) !== EROLLEDBACK) {
                        break;
                    }
                }
            }

            if (rolledBack) {

                result = new APIRequestError(EROLLEDBACK, {index, result});
            }
        }

        return result;
    }

    async flush() {
        this.logger.assert(!this.cancelled);

        if (!this.queue.size || this.inflight) {
            if (!this.inflight) {
                this.clear();
            }
            return this.flushing;
        }
        const queue = [...this.queue];
        this.clear();

        if (this.rawreq === false) {
            this.createRequestURL(queue);
        }
        this.inflight = queue;
        const flushing = this.flushing = mega.promise;

        let res;
        do {
            if (d) {
                const url = String(this.url).replace(/sid=[\w-]+/, 'sid=\u2026');
                const req = String(this.rawreq || queue[0].payload).replace(mega.chrome && /%/g, '%%');

                this.logger.info('Sending API request %s to %s', req, url);
            }

            res = await this.fetch(this.url, this.rawreq)
                .then((res) => this.finish(res))
                .catch(ex => {
                    if (self.d) {
                        this.logger.error(' --- fetch error --- ', [ex]);
                    }
                    return this.cancelled ? ex
                        : this.errorHandler(ex.name === 'InvalidCharacterError' && ex.data || self.ERATELIMIT);
                });
        }
        while (!this.cancelled && res === EAGAIN);

        if (this.cancelled) {
            if (self.d) {
                this.logger.warn('Inflight request aborted.', tryCatch(() => JSON.stringify(res))() || res);
                this.logger.assert(Object.isFrozen(this));
            }
            res = EROLLEDBACK;
        }
        else {
            this.inflight = null;
            this.__ident_1 = Math.random().toString(31).slice(-7);
            queueMicrotask(() => this.flush().catch((ex) => self.d && this.logger.warn(ex)));
        }

        flushing.resolve(res);
        return flushing;
    }

    createRequestURL(queue) {
        let raw = false;
        let {apipath} = window;
        let {queryString, service} = this;

        if (queue.length === 1) {
            const {custom, options, type} = queue[0];

            if (custom) {
                let {queryString: qs} = options;

                if (qs) {
                    if (typeof qs === 'object') {
                        qs = new URLSearchParams(qs);
                    }
                    queryString += `&${qs}`;
                }
                apipath = options.apipath || apipath;
            }

            raw = type === 'string' || type === 'array';
        }

        this.url = `${apipath + service}?${queryString}`;

        if (raw) {
            if (queue[0].type === 'string') {
                this.url += `&${queue[0].payload}`;
                delete this.rawreq;
            }
            else {
                this.url += '&bc=1';
                this.rawreq = JSON.stringify(queue[0].payload);
            }
        }
        else {
            this.rawreq = JSON.stringify(queue.map(e => e.payload));
        }
    }

    async errorHandler(res) {
        if (typeof res === 'object' && res.err < 0) {
            res = res.err | 0;
        }

        if (typeof res === 'number') {
            if (self.d) {
                this.logger.warn(`API Request Error ${res}`);
            }

            if (!this.cancelled) {

                if (res === ERATELIMIT) {
                    if (!this.backoff) {
                        this.backoff = 900 + -Math.log(Math.random()) * 4e3 | 0;
                    }
                    res = EAGAIN;
                }

                if (res !== EAGAIN) {
                    // @todo modularize.
                    res = await api_reqfailed.call(this, this.channel, res);
                }

                if (res === EAGAIN) {
                    // request failed - retry with exponential backoff

                    if (!this.backoff) {
                        this.backoff = 192 + -Math.log(Math.random()) * 256;
                    }
                    this.backoff = Math.max(63, Math.min(3e5, this.backoff << 1));

                    if (navigator.onLine === false) {
                        // api.retry() will be invoked whenever getting back online.
                        this.backoff = 8888888;
                    }
                    this.timer = new MEGADeferredController('timer').fire(this.backoff);

                    if (self.d && this.backoff > 4e3) {
                        this.logger.info('Retrying in %sms...', this.backoff);
                    }

                    await this.timer;
                    this.timer = null;
                }
            }
        }
        return res;
    }

    getAbortSignal() {
        if (!this.controller || this.controller.signal.aborted) {
            this.controller = new AbortController();
        }
        return this.controller.signal;
    }

    async fetch(uri, body) {
        const signal = this.getAbortSignal();
        const response = await fetch(uri, {method: body ? 'POST' : 'GET', body, signal});

        this.response = response;
        this.status = response.status;
    }

    async parser() {
        const res = await this.response.json();
        if (d) {
            this.logger.info('API response:', JSON.stringify(res).replace(/[\w-]{48,}/g, '\u2026'));
        }
        return typeof res === 'number' ? res : Array.isArray(res) ? res : [res];
    }

    async chunkedFetch(uri, body) {
        const signal = this.getAbortSignal();
        const response = await fetch(uri, {method: body ? 'POST' : 'GET', body, signal});
        const splitter = new JSONSplitter(this.split, this, true);

        this.residual = [];
        this.response = response;
        this.status = response.status;
        this.totalBytes = response.headers.get('Original-Content-Length') | 0;

        if (typeof WritableStream !== 'undefined' && mega.shouldApplyNetworkBackPressure(this.totalBytes)) {
            const queueingStrategy =
                typeof ByteLengthQueuingStrategy !== 'undefined'
                && 'highWaterMark' in ByteLengthQueuingStrategy.prototype
                && new ByteLengthQueuingStrategy({highWaterMark: BACKPRESSURE_HIGHWATERMARK});

            const stream = new WritableStream({
                write: async(chunk) => {
                    if (self.d) {
                        this.logger.debug('fetch/write', chunk.byteLength);
                    }

                    await this.progress(splitter, chunk);

                    while (decWorkerPool.busy || fmdb && fmdb.busy) {
                        if (d) {
                            this.logger.debug('fetch/backpressure (%d%%)', this.received * 100 / this.totalBytes);
                        }
                        // apply backpressure
                        await sleep(BACKPRESSURE_WAIT_TIME);
                    }
                },
                close: () => {
                    if (self.d) {
                        this.logger.debug('fetch/close');
                    }
                },
                abort: (ex) => {
                    if (self.d) {
                        this.logger.error('fetch/abort', ex);
                    }
                }
            }, queueingStrategy);

            await response.body.pipeTo(stream, {signal});
        }
        else {
            const reader = response.body.getReader();

            while (true) {
                const {value, done} = await reader.read();

                if (done) {
                    break;
                }

                // feed received chunk to JSONSplitter via .onprogress()
                await this.progress(splitter, value);
            }
        }

        return splitter;
    }

    async chunkedParser(splitter) {
        const {response, received, totalBytes, residual, service} = this;
        MEGAException.assert(totalBytes >= 0);

        // is this residual data that hasn't gone to the splitter yet?
        // we process the full response if additional bytes were received
        // in moz-chunked transfers, if we can contain chars beyond
        // the last onprogress(), send .substr(this.received) instead!
        // otherwise, we send false to indicate no further input
        // in all cases, set the input-complete flag to catch incomplete API responses

        let chunk = false;
        if (response && response.byteLength > received) {
            if (received === 0) {
                chunk = new Uint8Array(response);
            }
            else if (response instanceof ArrayBuffer) {
                chunk = new Uint8Array(response, received);
            }
            else {
                chunk = response.subarray(received);
            }
        }

        if (d && response instanceof Response) {
            const data = tryCatch(() => ab_to_str(this.last.buffer.slice(-280)).replace(/[\w-]{15,}/g, '\u2026'))();
            this.logger.info('API response: %s, \u2026\u2702\u2026\u2026%s', response.statusText, data);
        }

        const rc = splitter.chunkproc(chunk, true);
        if (rc) {
            const val = rc >> 1;

            if (val < 1 || service !== 'cs') {
                return [val];
            }

            await residual[0];
            return residual.slice(1);
        }

        return fm_fullreload(this, 'onload JSON Syntax Error');
    }

    async deliver(chunk) {
        if (!this.idle) {
            await this.flush();
        }
        this.logger.assert(!this.cancelled && this.received === 0, 'invalid state to deliver');

        if (d) {
            this.logger.info('deliver', tryCatch(() => JSON.parse(ab_to_str(chunk)))() || chunk);
        }

        this.response = chunk;
        this.totalBytes = chunk.byteLength;
        return this.parser(new JSONSplitter(this.split, this, true))
            .then((res) => {
                const val = res | 0;
                if (val < 0) {
                    throw val;
                }
            })
            .catch((ex) => {
                if (d) {
                    this.logger.warn('Caught delivery error...', ex);
                }

                if (this.isRequestError(ex)) {

                    return this.errorHandler(ex | 0);
                }

                throw ex;
            });
    }

    async progress(splitter, chunk) {
        this.logger.assert(!this.cancelled);

        /**
         if (this.channel == 5) {
            this.totalBytes = 2;
            chunk = Uint8Array.from([45, 54]);
            // debugger;
        }
         /**/

        chunk = new Uint8Array(chunk);
        this.received += chunk.byteLength;

        if (this.inflight) {
            const [{options: ctx}] = this.inflight;

            if (ctx && ctx.progress && this.totalBytes > 2) {
                ctx.progress(this.received / this.totalBytes * 100);
            }
        }

        if (self.d) {
            this.last = chunk;
        }

        // send incoming live data to splitter
        // for maximum flexibility, the splitter ctx will be this
        const rc = splitter.chunkproc(chunk, chunk.length === this.totalBytes);
        if (!rc) {
            // a JSON syntax error occurred: hard reload
            await fm_fullreload(this, 'onerror JSON Syntax Error');
        }

        if (rc !== -1 && rc >> 1 < 1) {
            throw new MEGAException(`\u26a0 [${rc >> 1}]`, rc >> 1, 'InvalidCharacterError');
        }
    }

    async finish(split) {
        let t = ERATELIMIT;
        const {status, response} = this;

        if (status === 200) {
            const result = await this.parser(split).catch(dump);

            if (result === undefined) {
                if (d) {
                    this.logger.error('Bad JSON data in response', response);
                }
                t = EAGAIN;
            }
            else {
                t = result;
                this.status = true;

                if (t === EARGS) {
                    if (d) {
                        this.logger.warn('Request-level error for command? probably wrongly invoked request..');
                    }
                    t = [t];
                }
            }
        }
        else if (d) {
            this.logger.warn(`API server connection failed (error ${status})`);
        }

        if (typeof t === 'object') {
            t = await this.dequeue(t) || t;
        }

        return this.errorHandler(t);
    }
}

mWebLockWrap(MEGAPIRequest.prototype, 'enqueue');

Object.defineProperty(MEGADeferredController, Symbol.species, {
    get() {
        'use strict';
        return Promise;
    }
});

/**
 * Fetch API helper that does keep a connection alive as long it is not aborted.
 * @param {RequestInfo|URL} [url] The resource that you wish to fetch
 * @param {RequestInit} [options] An object containing any custom settings that you want to apply to the request.
 * @param {Object} handlers Dynamic fetch handlers
 * @constructor
 * @see {@link window.fetch}
 */
class MEGAKeepAliveStream {
    constructor(url, options, handlers) {
        if (!handlers) {
            if (!(handlers = options)) {
                handlers = url;
                url = false;
            }
            options = false;
        }
        if (typeof handlers === 'function') {
            handlers = {onload: handlers};
        }

        const value = Math.max(self.d | 0, 'rad' in mega && 3);
        Object.defineProperty(this, 'debug', {value, writable: true});
        Object.defineProperty(this, 'options', {value: {...options}, writable: true});
        Object.defineProperty(this, 'verbose', {value: this.debug > 2, writable: true});

        const pid = this.ident;
        Object.defineProperty(this, 'logger', {
            configurable: true,
            value: new MegaLogger(() => `${this.__ident_0}-${this.__ident_1}-${pid}`, {
                throwOnAssertFail: true,
                captureLastLogLine: true,
                levelColors: {
                    ERROR: `#de1234`, DEBUG: `#1234bc`, WARN: `#646523`, INFO: `#147852`, LOG: '#2d3e4f'
                }
            })
        });

        this.reset();
        this.reader = null;
        this.controller = null;
        this.backoff = 1e3 + Math.random() * 4e3;

        if (handlers) {
            const descriptor = Object.getOwnPropertyDescriptors(handlers);
            const ownKeys = Reflect.ownKeys(descriptor);

            for (let i = ownKeys.length; i--;) {
                const h = ownKeys[i];
                this.logger.assert(h.startsWith('on'), h);
                if (descriptor[h].value) {
                    descriptor[h].value = freeze(descriptor[h].value.bind(this));
                }
            }
            Object.defineProperties(this, descriptor);
        }

        if (url) {
            this.connect(url);
        }

        window.addEventListener('online', this);
        window.addEventListener('offline', this);
    }

    get [Symbol.toStringTag]() {
        return 'MEGAKeepAliveStream';
    }

    get signal() {
        const {controller} = this;

        if (!controller || controller.signal.aborted) {
            this.controller = new AbortController();
        }
        return this.controller.signal;
    }

    get ident() {
        return Math.random().toString(36).slice(-4).toUpperCase();
    }

    handleEvent(ev) {
        const {verbose, logger} = this;

        if (verbose) {
            logger.debug('event', ev.type, [ev]);
        }

        if (ev.type === 'online') {
            this.backoff = 1e3 + Math.random() * 7e3;
            this.restart(ev.type);
        }
        else if (ev.type === 'offline') {
            this.backoff = 1e6;
            this.abort(ev.type);
        }
    }

    destroy(reason) {
        if (!this.destroyed) {

            this.abort(reason);
            this.options = null;

            window.removeEventListener('online', this);
            window.removeEventListener('offline', this);

            const keys = Reflect.ownKeys(this);
            for (let i = keys.length; i--;) {
                tryCatch(() => Reflect.deleteProperty(this, keys[i]))();
            }

            Object.defineProperty(this, 'destroyed', {value: true});
            freeze(this);
        }
    }

    abort(reason) {
        const {reader, controller, verbose, logger} = this;

        if (verbose) {
            logger.info(reason || 'connection aborted', reader, controller);
        }

        if (controller) {
            tryCatch(() => {
                controller.abort(reason);
            }, false)();
            this.controller = null;
        }

        if (reader) {
            tryCatch(() => {
                reader.cancel(reason)
                    .then(() => reader.releaseLock())
                    .catch((ex) => {
                        if (verbose) {
                            logger.warn('release-lock', ex);
                        }
                    });
            })();
            this.reader = null;
        }

        return this.reset();
    }

    reset() {
        const {timer, ident} = this;

        if (timer && !timer.aborted) {
            timer.abort();
        }

        this.timer = 0;
        this.begin = 0;
        this.status = 0;
        this.__ident_1 = ident;

        return this;
    }

    restart(reason) {
        this.abort(`Restarting connection due to ${reason || 'user request'}.`);

        queueMicrotask(() => {
            if (this.controller) {
                if (this.debug) {
                    this.logger.warn('Unexpected ongoing connection!', this);
                }
                this.abort('restart-safety');
            }

            if (!this.destroyed) {
                this.connect();
            }
        });

        return this;
    }

    setURL(url) {
        if (url !== this.url) {
            Object.defineProperty(this, 'url', {value: url, configurable: true});

            url = String(url).split('?')[0].split(/^.*\/\/[^/]+\/|\/[^/]+$/)[1];
            Object.defineProperty(this, '__ident_0', {
                configurable: true,
                value: `api.kas:${url}-${this.ident}${this.ident}`
            });
        }

        return this;
    }

    connect(url, options = false) {
        let tmp;
        const {signal, onload, onclose, debug, verbose, logger} = this;

        if (url) {
            this.setURL(url);
        }
        this.reset();

        if (!this.url) {
            if (verbose) {
                logger.warn('No URL set.', this);
            }
            return this;
        }

        if (verbose) {
            logger.debug('connecting', String(this.url).replace(/[\w-]{15,}/g, '\u2026'));
            tmp = logger.lastLogLine;
        }
        const begin = this.begin = Date.now();

        this.fetch({...this.options, ...options, signal})
            .then((stream) => {
                if (verbose) {
                    logger.log({stream});
                }
                return onload && stream.arrayBuffer() || this.reader.closed;
            })
            .then((buf) => {
                if (verbose) {
                    logger.log('response', buf && ab_to_str(buf));
                }
                return onload && onload(buf);
            })
            .catch((ex) => {
                if (verbose || debug && ex && ex.name !== 'AbortError') {
                    logger.warn(ex);
                }
                if (!signal.aborted) {
                    this.abort(ex.message);
                }
            })
            .finally(() => {

                if (!this.destroyed) {
                    if (onclose) {
                        queueMicrotask(onclose);
                    }
                    this.schedule();
                }

                if (verbose) {
                    tmp[0] = tmp[0].replace(/^\S+/, `%c${new Date().toISOString()}`)
                        .replace('connecting', 'connection closed, duration=%sms, status=%d, backoff=%f');

                    console.debug(...tmp, Date.now() - begin, this.status | 0, this.backoff);
                }
            });

        return this;
    }

    schedule(backoff) {
        if (navigator.onLine === false) {
            return;
        }

        if (!backoff) {
            if (this.status === 200) {
                // Increase backoff if we do keep receiving packets is rapid succession, so that we maintain
                // smaller number of connections to process more data at once - backoff up to 4 seconds.
                this.backoff = Date.now() - this.begin < 1482 ? Math.min(4e3, this.backoff << 1) : Math.random() * 4e3;
            }
            else {
                this.backoff = Math.min(40e3, this.backoff << 1);
            }

            backoff = this.backoff / 1e3;
        }

        this.timer = tSleep.schedule(backoff, this, () => !this.destroyed && this.restart('scheduler'));
    }

    async fetch(options) {
        this.schedule(36);
        const {body, ok, status, statusText} = await fetch(this.url, options);

        this.status = status;
        if (!(ok && status === 200)) {
            const ex = new MEGAException(`Server error ${status} (${statusText})`, this, 'NetworkError');

            if (this.onerror) {
                this.onerror(ex);
            }
            throw ex;
        }

        this.reader = body.getReader();
        return new ReadableStream(this);
    }

    async start(controller) {
        const {onchunk, onload, onstart, reader, verbose, logger} = this;

        if (onstart) {
            await onstart(controller);
        }

        while (true) {
            this.schedule(32);
            const {value, done} = await reader.read();

            if (done) {
                controller.close();
                break;
            }

            if (verbose) {
                logger.log(`Got ${value.byteLength} bytes chunk...`);
            }

            if (onchunk) {
                await onchunk(value);
            }

            if (onload) {
                controller.enqueue(value);
            }
        }
    }

    cancel(reason) {
        const {oncancel, debug, logger} = this;

        if (debug) {
            logger.info('cancel', reason);
        }

        if (oncancel) {
            oncancel(reason);
        }
    }

    static test(url = 'https://192.168.2.3:444/zero?t=1') {
        let size = 0;
        const handlers = {
            onload(data) {
                size += data.byteLength;
                console.info('data received', size, data);
            }
        };
        const kas = new MEGAKeepAliveStream(url, handlers);

        tSleep(7)
            .then(() => kas.restart('test-stage1'))
            .then(() => tSleep(Math.random() * 10))
            .then(() => {
                return kas.destroy('test-stage2');
            })
            .then(() => tSleep(4))
            .then(() => {
                size = 0;
                return new MEGAKeepAliveStream({
                    ...handlers,
                    onerror(ex) {
                        if (size > 1e4) {
                            this.destroy(ex);
                        }
                        throw new Error(`trap <${ex}>`);
                    },
                    onclose() {
                        if (size > 7e4) {
                            this.destroy('test-stage3');
                        }
                    }
                });
            })
            .then((kas) => {
                console.info('new instance', kas);
                return kas.connect(url);
            })
            .catch(dump);

        return kas;
    }
}

/**
 * API Communication Layer
 * @name api
 * @memberOf window
 */
lazy(self, 'api', () => {
    'use strict';
    const chunkedSplitHandler = freeze({
        cs: freeze({
            '[': tree_residue,     // tree residue
            '[{[f{': tree_node,    // tree node
            '[{[f2{': tree_node,   // tree node (versioned)
            '[{[ok0{': tree_ok0    // tree share owner key
        }),
        sc: freeze({
            '{': sc_residue,       // SC residue
            '{[a{': sc_packet,     // SC command
            '{[a{{t[f{': sc_node,  // SC node
            '{[a{{t[f2{': sc_node  // SC node (versioned)
        })
    });
    const channels = [
        // user account API interface
        [0, 'cs'],

        // folder link API interface
        [1, 'cs'],

        // active view's SC interface (chunked mode)
        [2, 'sc', chunkedSplitHandler.sc],

        // user account event notifications
        [3, 'sc'],

        // active view's initial tree fetch (chunked mode)
        [4, 'cs', chunkedSplitHandler.cs],

        // WSC interface (chunked mode)
        [5, 'wsc', chunkedSplitHandler.sc],

        // off band attribute requests (keys) for chat
        [6, 'cs']
    ];
    const apixs = [];
    const inflight = new Map();
    const observers = new MapSet();
    const seenTreeFetch = new Set();
    const pendingTreeFetch = new Set();
    const logger = new MegaLogger(`api.xs${makeUUID().substr(-18)}`);
    const clone = ((clone) => (value) => clone(value))(window.Dexie && Dexie.deepClone || window.clone || echo);
    const cache = new LRULapse(12, 36, self.d > 0 && ((...args) => logger.debug('reply.cache flush', ...args)));
    const defaults = freeze({
        dedup: true,
        cache: false,
        scack: false
    });
    let gSearchParams, currst, lastst;
    const uSearchParams = Object.create(null);

    // cache entries lifetime rules.
    cache.commands = Object.assign(Object.create(null), {
        clc: -1,
        g(req) {

            if (req.g) {
                // cache for four seconds.
                return -4;
            }

            // cache for the session lifetime
            return true;
        }
    });

    // check whether the global SC connection is running.
    const isScRunning = () => {
        const {waitsc = false} = window;
        return !!waitsc.running;
    };

    // Set globally-accessed current sequence-tag
    const mSetSt = (st) => {
        if (isScRunning()) {
            currst = st || null;
        }
        else if (d) {
            logger[st === '.' ? 'info' : 'warn']('SC connection is not ready, per st=%s', st || null);
        }
    };

    // split API response into sequence-tag + result
    const mStParser = (res) => {

        if (!Array.isArray(res) || !mStParser.prim[typeof res[0]]) {

            res = typeof res === 'string' ? [res, 0] : [null, res];
        }

        return res;
    };
    mStParser.prim = freeze({'string': 1, 'number': 1});

    // Pack API response and action-packets into a single object.
    const mScPack = (pid, q) => {
        let packet, handle, sn, st;
        const sts = new Set([pid, q.st]);
        const {type, pkt, responses, log} = q;
        const gh = (n) => n && (n[0] && n[0].h || n[0]);

        for (let i = 0; i < pkt.length; ++i) {
            const p = pkt[i];

            st = p.st || st;
            sn = p.usn || p.sn || sn;
            handle = gh(p.scnodes) || handle;

            pkt[p.a] = packet = p;
        }

        if (type === 'array') {
            const batch = [];
            for (let i = 0; i < responses.length; ++i) {
                const packets = [];
                const payload = q.payload[i];
                const [st, result] = responses[i];
                assert(typeof st !== 'number' || st >= 0, `Unexpected sequence tag ${st}`);

                for (let j = 0; j < pkt.length; ++j) {
                    const p = pkt[j];
                    if (p.st === st) {
                        packets.push(p);
                    }
                }

                sts.add(st);
                batch.push({result, payload, packets, st, sn});
            }
            q.batch = batch;
        }

        if (log) {
            log('scack(%s) completed.', pid, currst, lastst, q);

            if (pkt.length) {
                const pst = pkt[0].st || st;
                logger.assert(pst === q.st, `Unmatched sequence tag "${pst}" != "${q.st}"`);
            }
            delete q.tid;
            delete q.log;
        }

        delete q.type;
        delete q.reject;
        delete q.resolve;
        delete q.responses;

        q.sn = sn;
        q.st = st || q.st;
        q.handle = handle;
        q.packet = packet;

        inflight.remove(...sts);
        return freeze(q);
    };

    // API-command handler for st-conveyed requests.
    const mStCommandHandler = (instance, pid) => {
        const mStRef = (res) => {
            const [st] = res = mStParser(res);

            if (typeof st === 'string') {
                inflight.set(st, pid);
            }
            return res;
        };
        return (resolve, reject, ctx) => {
            let {result: res, responses, type} = ctx;

            if (type === 'array') {
                for (let i = responses.length; i--;) {
                    res = responses[i] = mStRef(responses[i]);
                }
            }
            else {
                res = mStRef(res);
            }
            let [st, result] = res;

            if (typeof st === 'number') {
                if (st < 0) {
                    return reject(st);
                }
                st = false;
            }

            if (window.scinflight) {
                queueMicrotask(execsc);
            }
            mSetSt(st);

            ctx.st = st;
            ctx.result = result;
            ctx.reject = reject;
            ctx.resolve = resolve;

            api.ack(instance, pid, ctx);
        };
    };

    /**
     * @param {MEGAPIRequest} instance
     * @param {Object|String|Array} payload
     * @param {String} type
     * @param {Object} options
     * @returns {Object}
     */
    const getRequestTrial = (instance, payload, type, options) => {
        const trial = Object.create(null);

        if (instance.service === 'cs') {
            trial.dedup = options.dedup && type === 'object' && (!payload.i || payload.i !== window.requesti);

            if (trial.dedup) {
                getRequestTrial.sink.setDupRef(trial, instance, payload, type, options);
            }

            if (options.scack) {
                getRequestTrial.sink.setSCAckRef(trial, instance, payload, type);
            }
        }

        return trial;
    };

    Object.defineProperty(getRequestTrial, 'sink', {
        value: freeze({
            setDupRef(target, instance, payload, type, options) {
                const key = JSON.stringify(payload);

                if (inflight.has(key)) {
                    target.inflight = inflight.get(key);
                    return;
                }
                target.dedup = key;
                target.cache = options.cache;

                switch (cache.has(key)) {
                    case true:
                        target.cachedResponse = clone(cache.get(key));
                        break;
                    case false:
                        // did exist, but expired.
                        if (!target.cache) {
                            target.cache = -cache.lapse;
                        }
                }
            },

            setSCAckRef(target, instance, payload, type) {
                const tmp = type === 'array' ? payload : [payload];

                for (let z = 0; z < tmp.length; ++z) {
                    tmp[z].i = tmp[z].i !== window.requesti && tmp[z].i || (z > 0 ? tmp[0].i : `${instance.lex}`);
                }
                const pid = tmp[tmp.length - 1].i;
                const obj = Object.create(null);
                const {logger} = instance;

                if (self.d) {
                    obj.tid = `sc$ack:pkt(${pid})`;
                    obj.log = logger.info.bind(logger);
                }
                obj.pkt = [];

                logger.assert(!inflight.has(pid), `pid(${pid}) exists.`);
                inflight.set(pid, obj);

                target.scack = pid;
            }
        })
    });

    Object.defineProperty(inflight, 'remove', {
        value: function(...args) {
            for (let i = args.length; i--;) {
                this.delete(args[i]);
            }
            delay('api!sc<resume>', () => {
                console.assert(this.size || !window.scinflight, 'Invalid SC-inflight state, API gave no ST?');
                return !this.size && window.scinflight && queueMicrotask(execsc);
            });
        }
    });

    const lock = (id = 'main', callback = nop) => {
        // eslint-disable-next-line compat/compat -- we've a polyfill
        return navigator.locks.request(`${logger.name}.${id}`, callback);
    };

    // -----------------------------------------------------------------------------------\
    // -----------------------------------------------------------------------------------/
    // Public API.
    return freeze({
        /**
         * Enqueue API Request
         * @param {Object|String|Array} payload Request payload to send
         * @param {Number|Object} channel Channel number (v2), or options object (v3)
         * @returns {Promise<*>} fulfilled on API request completion.
         * @memberOf api
         */
        async req(payload, channel = 0) {
            const options = Object.assign({channel: channel | 0}, defaults, channel);

            await lock(options.channel);
            const instance = apixs[options.channel];

            let type = typeof payload;
            type = type === 'object' && Array.isArray(payload) ? 'array' : type;

            const trial = getRequestTrial(instance, payload, type, options);

            if (trial.inflight) {
                if (self.d) {
                    instance.logger.debug('Reusing API Request...', payload);
                }
                return trial.inflight;
            }

            if ('cachedResponse' in trial) {
                if (self.d) {
                    instance.logger.info('Returning Cached API Request Response...', payload, trial.cachedResponse);
                }
                return trial.cachedResponse;
            }

            let promise = new Promise((resolve, reject) => {
                if (trial.scack) {
                    const pid = trial.scack;

                    reject = ((rej) => (ex) => rej(ex, inflight.remove(pid)))(reject);

                    resolve = Promise.lock({
                        reject,
                        resolve,
                        name: 'api.sc-inflight.lock',
                        handler: mStCommandHandler(instance, pid)
                    });
                }
                const custom = Boolean(options.apipath || options.queryString);

                instance.enqueue({type, payload, custom, options, resolve, reject}).catch(reject);
            });

            if (trial.dedup) {
                const {dedup: key} = trial;
                inflight.set(key, promise);

                if (trial.cache) {
                    let rule = trial.cache;

                    promise = promise.then((res) => {
                        rule = cache.commands[res.payload.a] || rule;

                        if (typeof rule === 'function') {
                            rule = rule(res.payload);
                        }

                        cache.set(key, clone(res), rule < 0 ? -rule : Infinity);
                        return res;
                    });
                }
                promise = promise.finally(() => inflight.remove(key));
            }

            return promise;
        },

        /**
         * Wrapper around {@link api.req} that does take st/response combos into account.
         * Meant for commands that did reply a string with v2, and an array as per v3.
         * If an action-packet is expected to be received, {@link api.screq} MUST be used.
         * @param {Object|String|Array} payload Request payload to send
         * @param {Number|Object} channel Channel number (v2), or options object (v3)
         * @returns {Promise<*>} fulfilled on API request and server completion.
         * @memberOf api
         */
        async send(payload, channel = 0) {
            const options = Object.assign({cache: -20, channel: channel | 0}, channel);

            if (typeof payload === 'string') {
                payload = {a: payload};
            }
            const {result} = await this.req(payload, options);
            const [st, value] = mStParser(result);

            if (self.d > 1 && st !== 0) {
                // The caller probably wanted to use api.req(), we'll make him happy...
                logger.info(`Unexpected response for ${payload.a} with st=${st}`, result);
            }

            return st === 0 ? value : result;
        },

        /**
         * Wrapper around {@link api.req} that does await for server-side acknowledge through action-packets.
         * @param {Object|String|Array} payload Request payload to send
         * @param {Number|Object} channel Channel number (v2), or options object (v3)
         * @returns {Promise<*>} fulfilled on API request and server completion.
         * @memberOf api
         */
        async screq(payload, channel = 0) {
            const options = Object.assign({channel: channel | 0}, channel, {scack: true});

            if (typeof payload === 'string') {
                payload = {a: payload};
            }

            if (!currst) {
                mSetSt('.');
            }

            return this.req(payload, options);
        },

        /**
         * Retrieve tree nodes on-demand (aka, server-side paging)
         * @param {Array|String} handles Tree node-handles to fetch.
         * @return {Promise<*>} void
         * @memberOf api
         */
        async tree(handles) {

            if (Array.isArray(handles)) {

                handles.forEach(pendingTreeFetch.add, pendingTreeFetch);
            }
            else {
                pendingTreeFetch.add(handles);
            }

            return lock('tree-fetch.lock', async() => {
                const pending = [...pendingTreeFetch];
                pendingTreeFetch.clear();

                // @todo ensure we won't store into "seen" a node we may need again (e.g. deleted/restored)

                const payload = [];
                for (let i = pending.length; i--;) {
                    const n = pending[i];

                    if (!seenTreeFetch.has(n) && (!M.d[n] || M.d[n].t && !M.c[n])) {

                        seenTreeFetch.add(n);
                        payload.push({a: 'f', r: 1, inc: 1, n});
                    }
                }

                while (payload.length) {
                    const res = await this.req(payload, 4).catch(echo);
                    const val = Number(res);

                    if (val === EROLLEDBACK) {
                        if (self.d) {
                            logger.warn('Rolling back command#%d/%d', res.index, payload.length, res.result);
                        }
                        payload.splice(res.index, 1);
                    }
                    else {
                        if (val < 0) {
                            throw val;
                        }
                        return res;
                    }
                }
            });
        },

        /**
         * Acknowledge packet/api-response processor
         * @param {Object|MEGAPIRequest} pr who triggers it.
         * @param {String} pid seq-tag or req-id
         * @param {*} [hold] arguments
         * @returns {Number|void} Status code
         */
        ack(pr, pid, hold) {
            if (!inflight.has(pid)) {
                if (!inflight.size) {
                    return 3;
                }

                // logger.warn('ack(%s)=%s/%s', pid, pr.st > currst, inflight.has(pr.st), currst, lastst, hold, [pr]);

                pid = inflight.get(pr.st);
                if (!pid) {
                    return pr.st > currst ? 7 : 2;
                }
            }

            let rc = 0;
            const q = inflight.get(pid);

            if (d) {
                logger.warn('api.ack(%s)', pid, currst, lastst, hold, [pr]);
            }

            if (pr instanceof MEGAPIRequest) {

                Object.assign(q, hold);
                hold = !q.pkt.length && q.st && isScRunning();
            }
            else if (q.resolve) {

                if (pr.st === currst) {
                    lastst = currst;
                }

                q.pkt.push(pr);
            }
            else {
                rc = 7;
                hold = true;
            }

            if (hold) {
                if (q.tid) {
                    delay(q.tid, () => q.log('scack(%s) not yet fulfilled...', pid));
                }
            }
            else {
                if (q.tid) {
                    delay.cancel(q.tid);
                }

                queueMicrotask(tryCatch(() => {
                    const {resolve} = q;

                    if (resolve) {
                        resolve(mScPack(pid, q));
                        mSetSt('.');
                    }
                    else if (d) {
                        logger.debug('st/idtag-less packet accumulated.', q);
                    }
                }, q.reject));
            }

            return rc;
        },

        /**
         * Abort all API channel.
         * @returns {void}
         * @memberOf api
         */
        stop() {

            if (inflight.size) {
                if (d) {
                    logger.warn('Cleaning in-flight API Requests...', [...inflight.keys()]);
                }
                inflight.clear();
            }

            for (let i = apixs.length; i--;) {
                this.cancel(i);
            }
        },

        /**
         * Abort API channel
         * @param {Number} channel API channel
         * @returns {void|string} sid
         * @memberOf api
         */
        cancel(channel) {
            const req = apixs[channel];

            if (req instanceof MEGAPIRequest) {
                let tick = 0;

                if (req.service === 'cs') {
                    const dk = [...inflight.keys()].filter(a => a[0] === '{');

                    if (dk.length) {
                        if (d) {
                            logger.warn('Expunging de-dup records...', dk);
                        }

                        inflight.remove(...dk);
                    }
                }
                api.webLockSummary();

                lock(req.channel, async() => {
                    if (!req.idle && req.service === 'cs') {
                        if (d) {
                            req.logger.warn('Flushing and aborting channel...', [req]);
                        }
                        tick++;
                        await Promise.race([
                            req.flush(),
                            tSleep(7).then(() => {
                                if (tick < 2 && d) {
                                    req.logger.warn('Flush-attempt timed out.');
                                }
                            })
                        ]);
                    }
                    tick++;
                    return req.abort();
                }).catch((ex) => {
                    if (self.d) {
                        req.logger.warn('cancel failed', tick, ex);
                    }
                });

                apixs[channel] = null;
                return req.sid;
            }
        },

        /**
         * Initialize API channel
         * @param {Number} channel API channel
         * @param {String} service URI component.
         * @param {Object} split chunked-method splitter rules.
         * @returns {void}
         * @memberOf api
         */
        init(channel, service, split) {
            const sid = this.cancel(channel);
            apixs[channel] = new MEGAPIRequest(channel, service, split, sid);
        },

        /**
         * Re-initialize API channel(s)
         * @param {Number} [channel] channel, or all if omitted.
         * @returns {void}
         * @memberOf api
         */
        reset(channel) {
            if (channel >= 0 && channel < channels.length) {

                if (channels[channel]) {

                    this.init(...channels[channel]);
                }
            }
            else if (channel === undefined) {

                for (let i = channels.length; i--;) {

                    this.reset(i);
                }
            }
        },

        /**
         * Awake all API request that may be retrying, e.g. on offline network.
         * @returns {void}
         * @memberOf api
         */
        retry() {
            const cap = 3000;

            if (navigator.onLine === false) {
                if (self.d > 1) {
                    logger.warn('will not retry, network is offline...');
                }
                return;
            }

            for (let i = apixs.length; i--;) {
                const req = apixs[i];

                if (req && req.timer && req.backoff > cap) {
                    req.backoff = cap + -Math.log(Math.random()) * cap;
                    req.timer.cancel(true);
                }
            }
        },

        /**
         * Deliver data through specific API channel.
         * @param {Number} channel API channel
         * @param {ArrayBuffer} chunk data
         * @returns {Promise<*>}
         * @memberOf api
         */
        async deliver(channel, chunk) {
            const req = apixs[channel];

            if (req instanceof MEGAPIRequest) {
                return req.deliver(chunk);
            }
        },

        /**
         * Add new API channel to issue requests through.
         * @param {Number} idx Channel number.
         * @param {*} args additional arguments (i.e. service type, splitter)
         * @memberOf api
         */
        addChannel(idx, ...args) {
            if (idx < 0) {
                idx = channels.length << -idx;
            }
            if (idx > 10) {
                channels[idx] = [idx, ...args];
                this.reset(idx);

                if (apixs[2] instanceof MEGAPIRequest) {
                    apixs[idx].sid = apixs[2].sid;
                }

                return idx;
            }
        },

        /**
         * Remove previously created API custom channel.
         * @param {Number} idx Channel number.
         * @memberOf api
         */
        removeChannel(idx) {
            if (idx > 10) {
                this.cancel(idx);

                const layers = [channels, apixs];
                for (let i = layers.length; i--;) {
                    const layer = layers[i];

                    let pos = idx;
                    if (!layer[pos + 1]) {
                        while (!layer[pos - 1]) {
                            --pos;
                        }
                    }
                    layer.splice(pos, 1 + idx - pos);
                }
            }
        },

        /**
         * Retrieve URL search-params to append to API Requests.
         * @param {*} [options] Additional parameters to append
         * @param {*} [mode] operation mode for options
         * @returns {String} Query string for use in a URL.
         * @memberOf api
         */
        getURLSearchParams(options, mode) {

            if (!gSearchParams) {
                const obj = {...uSearchParams, v: this.version, lang: window.lang};

                // If using an extension, the version is passed through to the API for the helpdesk tool
                if (is_extension) {
                    obj.domain = 'meganz';
                    obj.ext = is_chrome_web_ext ? buildVersion.chrome : buildVersion.firefox;
                }
                else {
                    obj.domain = location.host.split('.').slice(-3).join('');
                }

                const b = mega.getBrowserBrandID();
                if (b) {
                    obj.bb = b | 0;
                }

                gSearchParams = new URLSearchParams(obj).toString();
            }

            if (options) {
                if (typeof options === 'string') {
                    // remove dupes and cleanup
                    options = options.split('&')
                        .reduce((obj, e) => {
                            const [k, v] = e.split('=');
                            if (k) {
                                obj[k] = v && decodeURIComponent(v) || '';
                            }
                            return obj;
                        }, Object.create(null));
                }
                const src = new URLSearchParams(options);
                if (mode === 1) {
                    return src.toString();
                }
                const dst = new URLSearchParams(gSearchParams);

                for (const [k, v] of src) {
                    if (mode === 2) {
                        dst.append(k, v);
                    }
                    else {
                        dst.set(k, v);
                    }
                }
                return dst.toString();
            }

            return gSearchParams;
        },

        /**
         * Define URL search-params to append to API Requests.
         * @param {Object|String} options key/value pairs
         * @returns {void}
         * @memberOf api
         */
        setURLSearchParams(options) {
            const {u_sid, pfid, n_h} = window;

            if (self.d > 1) {
                logger.warn('Establishing URL Search Params...', options);
            }

            Object.assign(uSearchParams, Object.fromEntries(new URLSearchParams(options).entries()));

            // re-set sid to expunge cached QS.
            this.setSID(u_sid);
            if (pfid) {
                this.setFolderSID(n_h, u_sid);
            }

            gSearchParams = null;
        },

        /**
         * Remove and optionally re-apply URL search-params used to append to API Requests.
         * @param {String|Array|Set} keys the key name(s) to remove.
         * @param {Object} [options] optionally set these key/value pairs
         * @returns {*} value
         * @memberOf api
         */
        recycleURLSearchParams(keys, options) {
            let changed = false;

            if (typeof keys === 'string') {
                keys = keys.split(',');
            }
            options = options && clone(options) || false;

            if (self.d > 1) {
                logger.warn('Recycling URL Search Params...', keys, options);
            }

            keys = [...keys];
            for (let i = keys.length; i--;) {
                const k = keys[i];

                if (k in uSearchParams) {

                    if (options[k] === uSearchParams[k]) {
                        delete options[k];
                        if (!Object.keys(options).length) {
                            options = false;
                        }
                    }
                    else {
                        changed = true;
                        delete uSearchParams[k];
                    }
                }
            }

            return (changed || options) && this.setURLSearchParams({...options});
        },

        /**
         * Set new cache entries lifetime rules.
         * @param {Object} ruleset see {@link cache.commands}
         * @memberOf api
         */
        setCommandCacheRule(ruleset) {
            Object.assign(cache.commands, ...ruleset);
        },

        /**
         * Set new session identifier
         * @param {String} sid The new session to establish
         * @returns {void}
         * @memberOf api
         */
        setSID(sid) {
            if (sid) {
                this.notify('setsid', sid);
                sid = `sid=${sid}`;
            }
            else {
                sid = '';
            }

            for (let i = channels.length; i--;) {
                if (i !== 1 && apixs[i]) {
                    apixs[i].sid = sid;
                }
            }
        },

        /**
         * Set new session identifier for folder-links
         * @param {String} h Folder-link handle
         * @param {String} sid The new session to establish
         * @returns {void}
         * @memberOf api
         */
        setFolderSID(h, sid) {
            h = `${self.pfcol ? 's' : 'n'}=${h}`;

            if (sid) {
                this.notify('setsid', sid);
                h += `&sid=${sid}`;
            }
            const exclude = new Set([0, 3, 6]);

            for (let i = channels.length; i--;) {
                if (apixs[i] && !exclude.has(i)) {
                    apixs[i].sid = h;
                }
            }
        },

        setAPIPath(aDomain, aSave) {
            if (aDomain === 'debug') {
                aDomain = `${location.host}:444`;
            }
            apipath = `https://${aDomain}/`;

            if (aSave) {
                localStorage.apipath = apipath;
            }

            return apipath;
        },

        staging(aSave) {
            return this.setAPIPath('staging.api.mega.co.nz', aSave);
        },

        prod(aSave) {
            return this.setAPIPath('g.api.mega.co.nz', aSave);
        },

        /**
         * Observer API event.
         * @param {String} what to listen for.
         * @param {Function} callback to invoke
         * @returns {void}
         * @memberOf api
         */
        observe(what, callback) {
            observers.set(what, callback);
        },

        /**
         * Notify API event.
         * @param {String} what to listen for.
         * @param {*} [data] data to send with the event
         * @returns {void}
         * @memberOf api
         * @private
         */
        notify(what, data) {
            delay(`api:event-notify.${what}`, () => {
                observers.find(what, (callback) => {
                    queueMicrotask(callback.bind(null, data));
                });
            });
        },

        /**
         * Check for and release any held locks due to a faulty w/sc connection.
         * @returns {Promise<void>}
         * @memberOf api
         */
        async poke() {

            if (!(await navigator.locks.query()).held.map(o => o.name).join('|').includes('sc-inflight.lock')) {
                logger.info('cannot poke, sc-inflight is not being held...');
                return;
            }

            if (isScRunning()) {
                logger.warn('cannot poke, w/sc is running...');
                return;
            }

            for (const [k, {st, options = false, payload: {a, i} = false}] of inflight) {

                if (st && options.scack === true) {
                    const pid = inflight.get(st);

                    logger.assert(pid === k && pid === i, `Invalid state ${pid}~~${k}~~${i}`);

                    if (pid === i) {
                        logger.warn(`dispatching held command ... ${a}~~${i}~~${st} ...`);

                        this.ack({st, a: 'd00m3d'}, pid);
                    }
                }
            }
        },

        /**
         * Catch up (await) sequence-tag.
         * @param {String|Object} pkt to expect
         * @returns {Promise<Object>|*} packet
         */
        catchup(pkt) {
            let store = inflight.get('catchup');
            let fire = (f, v) => f(v);

            if (d) {
                const st = pkt.st || pkt;

                fire = (f, v) => {
                    logger.info('Catchup completed, %s -> %s', st, v);
                    f(v);
                };

                if (store || !pkt.st) {
                    logger.warn('Catching up st=%s', st);
                }
            }

            if (typeof pkt !== 'string') {

                if (store) {
                    for (const pending of store) {
                        const {st, resolve} = pending;

                        if (pkt.st >= st) {
                            fire(resolve, pkt.st);
                            store.delete(pending);

                            if (!store.size) {
                                inflight.remove('catchup');
                            }
                            break;
                        }
                    }
                }
                return;
            }

            return new Promise((resolve) => {
                if (pkt >= currst) {
                    return fire(resolve, pkt);
                }
                if (!store) {
                    inflight.set('catchup', store = new Set());
                }
                store.add({st: pkt, resolve});
            });
        },

        /**
         * Get description for an API error code.
         * @param {Number} code API error code
         * @param {*} [fallback] fall back value if unknown error passed
         * @returns {String} error description
         */
        strerror(code, fallback) {
            assert(code !== 0 || fallback, 'Not an error code.');
            return code < 0 && api_strerror(code) || fallback || `${code}`;
        },

        /**
         * Set node attributes.
         * @param {String|MegaNode} n The ufs-node, or a handle
         * @param {Object} attrs attributes to define
         * @param {Function} [ack] function to acknowledge invocation.
         * @param {Function} [hook] hook a promise chain behind the web-lock.
         * @returns {Promise<*>} API sc-req result.
         */
        setNodeAttributes(n, attrs = false, ack = echo, hook = echo) {
            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }

            return lock(`sna.${n.h}`, () => api_setattr(ack({...n, ...attrs})).then(hook));
        },

        webLockSummary() {
            delay('api:deadlock:dump', () => {
                // eslint-disable-next-line compat/compat -- we've a polyfill
                navigator.locks.query()
                    .then((res) => {
                        const out = Object.create(null);

                        const k = ['pending', 'held'];
                        for (let i = k.length; i--;) {
                            const t = res[k[i]];

                            for (let j = t.length; j--;) {
                                const e = t[j];

                                out[`${k[i]}@${j} ${e.name}`] = `${e.mode}, ${e.clientId}`;
                            }
                        }

                        console.group('WebLock(s) Summary');
                        if ($.len(out)) {
                            console.table(out);
                        }
                        else {
                            console.info('None.');
                        }
                        console.groupEnd();
                    })
                    .catch(dump);
            });
        },

        /**
         * Internal logger
         * @memberOf api
         * @type {MegaLogger}
         * @public
         */
        get logger() {
            return logger;
        },

        /**
         * Current Sequence-Tag
         * @memberOf api
         * @type {String}
         * @public
         */
        get currst() {
            return currst;
        },

        /**
         * Last Sequence-Tag
         * @memberOf api
         * @type {String}
         * @public
         */
        get lastst() {
            return lastst;
        },

        /**
         * Highest API Version Supported.
         * @returns {Number} API version number.
         * @memberOf api
         * @public
         */
        get version() {
            return 3;
        },

        [Symbol('__private__')]: self.d && freeze({apixs, observers, inflight, cache})
    });
});

mBroadcaster.once('boot_done', () => {
    'use strict';

    if (window.is_karma) {
        return;
    }

    mBroadcaster.once('startMega', SoonFc(300, () =>
        !mega.flags && api.req({a: 'gmf'})
            .then(({result}) => {
                mega.apiMiscFlags = result;
                mBroadcaster.sendMessage('global-mega-flags');
            })
            .catch((ex) => {
                console.error('Failed to retrieve API flags...', ex);
            })
    ));

    api.reset();
});
