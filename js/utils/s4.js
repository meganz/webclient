/* global M, api, dump, mega */
/* eslint-disable no-use-before-define */
/** @property s4.kernel */
lazy(s4, 'kernel', () => {
    'use strict';
    const S4PTR = Symbol('~~s4~tag');
    const BASE_DOMAIN = '%n.g.s4.mega.io';
    const EMPTY_OBJ = self.freeze(Object.create(null));

    const logger = new MegaLogger('S4Kernel', {
        throwOnAssertFail: true,
        printDate: 'rad' in mega,
        levelColors: {
            CRITICAL: '#f23b6f',
            ERROR: `#e3351e`,
            DEBUG: `#1e4775`,
            WARN: `#b35c0b`,
            INFO: `#1d8a13`,
            LOG: '#30474d'
        }
    });
    const clone = tryCatch((obj) => Dexie.deepClone(obj));
    const freeze = tryCatch((obj) => deepFreeze(clone(obj)));

    const te = new TextEncoder();
    const time = () => ~~(Date.now() / 1e3);
    const trim = (s) => String(s).replace(/\s+/g, ' ').trim();
    const entries = (o, m = echo) => Object.fromEntries(Object.entries(o).map(m));
    const token = (len = 16, rep = /[^\dA-Za-z]/g) =>
        String.fromCharCode.apply(null, mega.getRandomValues(len << 8)).replace(rep, '').slice(-len);

    const leftPadBase32 = (val, len = 4) => {
        const res = [];

        while (len) {
            res[--len] = leftPadBase32.alphabet[val & 31n];
            val >>= 5n;
        }
        return res.join('');
    };
    leftPadBase32.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    const lock = async(name, handler) => {
        let release = nop;
        return mutex.lock(name)
            .then((unlock) => {
                release = unlock;
                return handler();
            })
            .finally(() => release());
    };
    const moe = new LRULapse(6);
    moe.acquire = async function(name, handler) {
        return lock(name, async() => {
            if (!this.has(name)) {
                this.set(name, await handler());
            }
        });
    };

    const privy = lazy(Object.create(null), 'mp', () => {
        const {u_attr = !1} = window;
        let {emails, email} = u_attr;

        if (!emails) {
            emails = [email];
        }

        for (let i = emails.length; i--;) {

            if (/@mega\.(?:co\.nz|nz|io)$/.test(emails[i])) {

                return true;
            }
        }
    });

    const sign = (() => {
        const hex = Object.create(null);
        const algo = {name: 'HMAC', hash: {name: 'SHA-256'}};

        for (let i = 256; i--;) {
            hex[i] = i.toString(16).padStart(2, '0');
        }

        const sign = async(data, key) => {
            if (typeof data === 'string') {
                data = te.encode(data);
            }
            if (typeof key === 'string') {
                key = te.encode(key);
            }
            key = await crypto.subtle.importKey('raw', key, algo, false, ['sign']);

            return crypto.subtle.sign(algo.name, key, data);
        };

        sign.toHex = (data) => {
            if (typeof data === 'string') {
                data = te.encode(data);
            }
            data = new Uint8Array(data);

            let i = 0;
            const res = [];
            while (i < data.byteLength) {
                res.push(hex[data[i++]]);
            }
            return res.join('');
        };

        sign.digest = async(data) => {
            if (!data || typeof data === 'string') {
                data = te.encode(data || '');
            }
            return sign.toHex(await crypto.subtle.digest(algo.hash.name, data));
        };

        sign.md5digest = (data, type = 'base64') => {
            data = md5sum(data);
            return type === 'hex' ? sign.toHex(data) : btoa(String.fromCharCode.apply(null, data));
        };

        return freeze(sign);
    })();

    const getSignatureKey = async(key, date = '20210809', region = 'g', service = 'iam') => {
        date = await sign(date, key);
        region = await sign(region, date);
        service = await sign(service, region);
        key = await sign('aws4_request', service);

        if (self.d > 3) {
            dump('date', sign.toHex(date));
            dump('region', sign.toHex(region));
            dump('service', sign.toHex(service));
            dump('key', sign.toHex(key));
        }
        return key;
    };

    const createAccessKey = (h) => {
        const rnd = crypto.getRandomValues(new Uint16Array(2));

        const mask = BigInt(rnd[0]);
        const word = BigInt(rnd[1]) & BigInt(0xFFF0);
        const seed = mask << 48n | mask << 32n | mask << 16n | mask;
        const data = (BigInt(mega.hton(h, 0)) << 16n | word | BigInt(!privy.mp) << 3n) ^ seed;

        const hi = leftPadBase32(data >> 4n, 12);
        const lo = leftPadBase32((data & 15n) << 16n | mask, 4);

        return `AKAI${hi}${lo}`;
    };

    const s4nt = freeze({container: 'li', bucket: 'pao', object: 'pa'});
    const s4rt = freeze(entries(s4nt, ([k, v]) => [v, k]));

    const getS4UniqueID = (nh) => ++(nh.s4 ? nh : getS4NodeByHandle(nh)).s4.li;
    const getDefaultBucketS4Attribute = (p) => ({pao: 2, p});

    const isAtContainer = (n) => s4nt.container in (M.d[n.p] && M.d[n.p].s4 || EMPTY_OBJ);

    const isS4ALessBucket = (n) => !n.s4 && isAtContainer(n);

    const eqUGName = (o, n) => String(o.n).toLowerCase() === String(n).toLowerCase();

    const aEqUGName = (n) => (o) => eqUGName(o, n);

    const aEqUserID = (ui) => (o) => parseInt(o.ui) === ui;

    const getStandardUniqueName = (name, store, prop = 'n') => {
        store = Object.values(store).map(o => o[prop] && String(o[prop]).toLowerCase()).filter(Boolean);

        if (store.includes(name.toLowerCase())) {
            const rex = new RegExp(`${name.replace(/\W/g, '\\$&')} - (\\d+)$`, 'i');
            const idx = Math.max(...store.map(n => (n.match(rex) || !1)[1]).filter(Number)) | 0;

            name += ` - ${idx + 1}`;
        }

        return name;
    };

    const haveGoodBucketParent = (n, p) => {
        if (typeof n === 'string') {
            n = M.getNodeByHandle(n);
        }
        if (!p) {
            p = M.getNodeByHandle(n.p);
        }
        const {s4} = n;

        return s4 && s4.p === p.h && p.h === n.p;
    };

    const getS4BucketAttribute = (n) => {
        if (typeof n === 'string') {
            n = M.getNodeByHandle(n);
        }

        if (isAtContainer(n)) {

            if (!haveGoodBucketParent(n)) {
                logger.warn(`Establishing default s4-attr on bucket ${n.h}`, n);
                n.s4 = getDefaultBucketS4Attribute(n.p);
            }

            if (!(s4nt.bucket in n.s4)) {
                logger.warn(`re-establishing lost default s4-attr property '${s4nt.bucket}'...`);
                n.s4[s4nt.bucket] = getDefaultBucketS4Attribute(n.p)[s4nt.bucket];
            }

            return n.s4;
        }

        logger.error(`Provided node (${n.h}) is not a bucket...`);
        return false;
    };

    const getS4BucketForObject = (n) => {

        if (typeof n === 'string') {
            n = M.getNodeByHandle(n);
        }

        do {

            if (n.s4 && s4nt.bucket in n.s4 || isS4ALessBucket(n)) {

                return n;
            }
        }
        while ((n = M.d[n.p]));

        return false;
    };

    const getS4NodeType = (n) => {

        if (typeof n === 'string') {
            n = M.getNodeByHandle(n);
        }

        if (n.s4) {
            for (const k in s4rt) {
                if (k in n.s4) {
                    return s4rt[k];
                }
            }
        }
        else if (isS4ALessBucket(n)) {
            return 'bucket';
        }

        if (getS4BucketForObject(n)) {
            return n.t ? 'bucket-child' : 'object';
        }

        return false;
    };

    const getS4NodeByHandle = (handle, type = 'container', silent = false) => {
        let n, valid;
        let res = n = M.getNodeByHandle(handle);

        if (type === 'object' || type === 'bucket-child') {
            valid = type === getS4NodeType(n);

            if (valid) {
                return res;
            }
        }

        do {
            const k = s4nt[type];

            valid = k && k in (type === 'bucket' && getS4BucketAttribute(n) || n.s4 || EMPTY_OBJ);

            if (!valid || type === 'container') {
                break;
            }
            logger.assert(type === 'bucket' && haveGoodBucketParent(n), 'invalid state.');

            n = M.d[n.p];
            type = 'container';
        }
        while (1);

        if (!valid) {
            res = false;
            logger.assert(silent === true || valid, `Invalid S4 Handle: ${handle} for ${type}`);
        }

        return res;
    };

    const getS4RequestByHandle = (handle, type, options) => {
        const b = getS4NodeByHandle(handle, type);
        const n = type === 'bucket' ? getS4NodeByHandle(b.p) : b;
        const host = BASE_DOMAIN.replace('%n', type === 'bucket' ? `${b.name}.s3` : 'iam');

        let secretKey, accessKey;
        for (const ak in n.s4.k) {
            if (n.s4.k[ak].rs) {
                accessKey = ak;
                secretKey = n.s4.k[ak].sk;
                break;
            }
        }

        return {secretKey, accessKey, host, ...options};
    };

    const getSortedURLSearchParams = (qs) => {

        if (typeof qs === 'string') {
            qs = qs.split('&')
                .reduce((obj, e) => {
                    const [k, v] = e.split('=');
                    obj[k] = v && decodeURIComponent(v) || '';
                    return obj;
                }, Object.create(null));
        }

        const res = Object.keys(qs).sort()
            .reduce((obj, k) => {
                obj[k] = qs[k];
                return obj;
            }, Object.create(null));

        return new URLSearchParams(res).toString();
    };

    const setS4RequestParameters = (aRequest, payload, options) => {
        let {method = 'GET', path = '/', qs = '', host, body, action} = aRequest;

        if (!body && (payload = action || payload)) {
            body = typeof payload === 'string' ? {Action: payload} : payload;
        }

        if (body) {
            method = method !== 'GET' && method || 'POST';

            if (typeof body === 'object') {
                body = getSortedURLSearchParams(body);
            }
            options.headers['content-md5'] = sign.md5digest(body);
            options.headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
            options.headers['content-length'] = body.length;
        }
        qs = qs && getSortedURLSearchParams(qs) || '';

        if (path.includes('?')) {
            path = path.split('?');

            qs = getSortedURLSearchParams(qs ? `${qs}&${path[1]}` : path[1]);
            path = path[0];
        }

        aRequest.qs = qs;
        aRequest.body = body;
        aRequest.method = method;
        aRequest.path = path || '/';
        aRequest.uri = `https://${host}${aRequest.path}`;

        if (qs) {
            aRequest.uri += `?${qs}`;
        }
        options.headers.host = host;

        return aRequest;
    };

    /**
     * Send S4-request.
     * @param {Object|String} aRequest Request details, or S4 node.
     * @param {String|Object} payload S4-request payload.
     * @param {Object} [options] Fetch API options.
     * @returns {Promise<*>} xml-formatted result
     * @private
     */
    const s4HttpRequest = async(aRequest, payload, options = false) => {
        if (typeof aRequest === 'string') {
            aRequest = getS4RequestByHandle(aRequest);
        }
        const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');

        options = {...options};
        options.headers = {
            ...options.headers,
            'x-amz-date': date,
            'x-amz-user-agent': `web/${buildVersion.version || 'dev'}`
        };

        const {method, path, qs, uri, body, secretKey, accessKey}
            = setS4RequestParameters(aRequest, payload, options);

        const canonicalHeaders = Object.keys(options.headers)
            .sort((a, b) => M.compareStrings(a, b, 1))
            .map(k => `${trim(k).toLowerCase()}:${trim(options.headers[k])}`)
            .join('\n');

        const signedHeaders =
            canonicalHeaders.split('\n').map(k => k.split(':')[0]).join(';');

        const canonicalRequest =
            await sign.digest(
                `${method}\n${path}\n${qs}\n${canonicalHeaders}\n\n${signedHeaders}\n${await sign.digest(body)}`
            );

        const scope = `${date.split('T')[0]}/g/iam/aws4_request`;
        const signature = sign.toHex(
            await sign(
                `AWS4-HMAC-SHA256\n${date}\n${scope}\n${canonicalRequest}`,
                await getSignatureKey(`AWS4${secretKey}`, ...scope.split('/'))
            )
        );

        options.headers.authorization =
            `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return xmlParser.fetch(uri, {method, body, ...options});
    };
    s4HttpRequest.lookup = async(str, ...args) => {
        const data = await s4HttpRequest(...args);

        let value;
        if (str[0] === '*') {
            str = str.slice(1);
            value = data && data[Symbol.for('response')];
        }
        str = str.split('/');

        let res = data;
        while (res) {
            const item = str.shift();
            if (!item) {
                break;
            }

            res = res[item];
        }

        if (!res) {
            throw new MEGAException('Lookup failed.', data, 'NotFoundError');
        }

        if (value && data !== res) {
            Object.defineProperty(res, Symbol.for('response'), {value});
        }

        return res;
    };

    const nUpdateQueue = new MapSet(Infinity);
    Object.defineProperty(nUpdateQueue, 'ar', {value: Object.create(null)});

    const updateS4Attribute = async(n, a, hook) => {

        if (!nUpdateQueue.promise) {
            nUpdateQueue.promise = mega.promise;

            onIdle(() => {
                const {resolve, reject} = nUpdateQueue.promise;
                delete nUpdateQueue.promise;

                const queue = [...nUpdateQueue];
                nUpdateQueue.clear();

                const fire = async(h, hooks) => {
                    const attr = nUpdateQueue.ar[h];
                    delete nUpdateQueue.ar[h];

                    hooks = hooks.filter(f => f && f !== nop);
                    return api.setNodeAttributes(h, attr, echo, ({st}) => {

                        if (hooks.length) {
                            return hooks.reduce((p, f) => p.then(f), Promise.resolve(st));
                        }

                        return st;
                    });
                };
                const promises = [];

                for (let i = queue.length; i--;) {
                    const [h, [...hooks]] = queue[i];

                    promises.push(fire(h, hooks));
                }

                Promise.all(promises)
                    .then((res) => resolve(res.pop()))
                    .catch(reject);
            });
        }

        if (n.s4) {
            nUpdateQueue.ar[n.h] = {...nUpdateQueue.ar[n.h], s4: n.s4, ...a};
        }
        else {
            nUpdateQueue.ar[n.h] = {...nUpdateQueue.ar[n.h], s4: undefined, ...a};
        }
        nUpdateQueue.set(n.h, hook);

        return nUpdateQueue.promise;
    };

    const updateS4Node = async(n, action, payload, data, each) => {

        return updateS4Attribute(n, EMPTY_OBJ, async(st) => {

            if (action) {
                data = Array.isArray(data) ? [...data] : [data];
                payload = payload ? {Action: action, ...payload} : action;

                if (typeof each === 'string') {
                    const member = each;
                    each = (payload, value) => ({...payload, [member]: value});
                }
                each = typeof each === 'function' ? each : echo;

                if (self.d && !st) {
                    logger.warn('void sequence-tag, s4-attr not updated(?)', st);
                }

                const promises = [];
                const options = st ? {headers: {'x-mega-s4-st': st}} : false;

                for (let i = 0; i < data.length; ++i) {
                    promises.push(s4HttpRequest(n.h, each(payload, data[i], n), options));
                }

                if (promises.length) {
                    const res = await Promise.all(promises);
                    const {[Symbol.for('response-headers')]: {'x-mega-s4-st': s4st}} = res.pop();

                    if (s4st) {
                        st = await api.catchup(s4st);
                    }
                }
            }

            return st;
        });
    };

    const objRestricted = Uint16Array.from('\\^{}%`[]"<>~#|', ch => ch.codePointAt(0));

    // @private
    const validator = freeze({
        isValidUserName(name) {
            return /^[\w+,.=@-]{1,64}$/.test(name);
        },
        isValidGroupName(name) {
            return /^[\w+,.=@-]{1,128}$/.test(name);
        },
        isValidKeyName(name) {
            return /^[\w +,./:=@-]{1,32}$/.test(name);
        },
        isValidBucketName(name) {
            if (!/^[\da-z][\d.a-z-]{1,61}[\da-z]$/.test(name)) {
                return false;
            }

            if (/\.\.|^xn--|-s\dalias$/.test(name)) {
                return false;
            }

            // @todo improve..
            const ip = name.replace(/[^\d.]/g, '').split('.').map(Number).filter(v => v < 255);

            return ip.length !== 4;
        },
        isValidObjectName(name) {
            let idx = 0;
            let count = 0;
            const {length} = typeof name === 'string' && name || '';

            while (length > idx) {
                const ch = name.codePointAt(idx++);
                const valid = ch > 0x1F && ch < 0x7B && !objRestricted[ch];

                if (!valid || ++count > 0x3ff) {
                    return false;
                }
            }

            return count > 0;
        },
        /** @memberOf validator */
        satisfy: freeze({
            bucketName(name) {
                return validator.isValidBucketName(name) ? name : `bucket${makeUUID().slice(-23)}`;
            },
            objectName(name) {
                return validator.isValidObjectName(name) ? name : `object${makeUUID().slice(-28)}`;
            },
            policyArn(value, tid) {
                // @todo
                if (typeof value === 'string' && value.includes('::')) {
                    return value;
                }
                const arn = [`arn:aws:iam:`];

                if (value instanceof MegaNode) {
                    arn.push(mega.hton(value.h));
                }
                else {
                    arn.push('aws');
                    tid = ['policy', value];
                }

                if (tid) {
                    if (typeof tid === 'string') {
                        tid = tid.split('/');
                    }

                    arn.push(tid.join('/'));
                }

                return arn.join(':').replace(/[\s\u200E\u200F\u202E]/g, '');
            }
        }),
        /** @memberOf validator */
        assert: freeze({
            expr(res, value, msg) {
                if (!res) {
                    logger.assert(false, msg || 'Validation Error.', value);
                }
            },
            groupName(value, msg = 'Invalid Group name (%s)') {
                this.expr(validator.isValidGroupName(value), value, msg.replace('%s', value));
            },
            userName(value, msg = 'Invalid IAM User Name (%s)') {
                this.expr(validator.isValidUserName(value), value, msg.replace('%s', value));
            },
            keyName(value, msg = 'Invalid Key Name (%s)') {
                this.expr(validator.isValidKeyName(value), value, msg.replace('%s', value));
            },
            bucketName(value, msg = 'Invalid Bucket Name (%s)') {
                this.expr(validator.isValidBucketName(value), value, msg.replace('%s', value));
            },
            objectName(value, msg = 'Invalid Bucket Object Name (%s)') {
                this.expr(validator.isValidObjectName(value), value, msg.replace('%s', value));
            }
        })
    });

    // @private
    class TreeLock {
        constructor(target) {
            this.store = Object.create(null);
            this.target = target || M.RootID;
            this.lock();
        }

        lock() {
            this.store.s4 = Object.create(null);
            this.store.byName = Object.create(null);
            const keys = Object.keys(M.c[this.target] || {});

            for (let i = keys.length; i--;) {
                const n = M.d[keys[i]];
                if (n.s4) {
                    this.store.s4[n.h] = n;
                }
                this.store.byName[n.name] = n;
            }

            // It's only safe within the same tick.
            queueMicrotask(() => this.unlock());
        }

        unlock() {
            delete this.store.s4;
            delete this.store.byName;
        }

        filter(space, cb) {
            return this.search('*', space).filter(cb);
        }

        search(prop, space = 'byName') {
            if (!this.store[space]) {
                this.lock();
            }
            return prop === '*' ? Object.values(this.store[space]) : this.store[space][prop];
        }

        validate(name) {
            return typeof name === 'string' && !this.search(name);
        }

        lookup(name) {
            const temp = name = M.getSafeName(name);

            if (!this.validate(temp)) {
                let idx = 0;
                do {
                    name = `${temp} - ${++idx}`;
                } while (!this.validate(name));
            }

            return name;
        }

        create(name, attrs) {
            return M.createFolder(this.target, this.lookup(name), attrs);
        }
    }

    // -------------------------------------------------------------------------.
    // ___ Access Keys collection: map indexed by <access_key>. _______________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.keys */
    const keys = freeze({
        /**
         * Creates a pair of Access Key and User Key for the root account or for a user.
         * The pair of keys can be reserved (to be used by the UI) and may belong to a user or to the root account.
         * @param {String} handle bucket container node-handle
         * @param {String|Number} [user] IAM User ID
         * @param {String} [name] Key name
         * @param {Number|Boolean} [reserved] single reserved root key
         * @returns {Promise<{sk, ak}>}
         * @memberOf s4.kernel.keys
         */
        async create(handle, user, name, reserved) {
            let ak, save;
            const n = getS4NodeByHandle(handle);

            if (!(reserved |= 0)) {
                reserved = undefined;
            }

            if ((user = user || undefined) !== undefined) {
                const cond = parseInt(user) === (user | 0) && user > 0x100 && n.s4.u[user];

                user = `${user}`;
                logger.assert(cond, `Invalid user '${user}' provided.`);
            }

            if (name === S4PTR) {
                name = undefined;
                save = false;

                if (!reserved) {
                    name = `root`;

                    if (user) {
                        const val = n.s4.u[user].n;

                        if (validator.isValidKeyName(`${val} - xxxxx`)) {

                            name = val;
                        }
                    }

                    name = getStandardUniqueName(name, n.s4.k);
                }
            }
            else if (name !== undefined) {
                validator.assert.keyName(name);
            }

            logger.assert(!user || !reserved, 'Invalid operation.');
            logger.assert(!reserved || !await this.retrieve(handle), 'Reserved key exists.');

            const mk = n.s4.k;
            const sk = token(40);

            do {
                ak = createAccessKey(n.ph);
            }
            while (mk[ak]);

            mk[ak] = {sk, en: 1, ct: time(), ui: user, n: name, rs: reserved};

            if (save !== false) {
                await updateS4Attribute(n);
            }
            return {ak, sk};
        },

        /**
         * List existing keys for bucket container.
         * @param {String} handle bucket container node-handle
         * @returns {Promise<Array>}
         * @memberOf s4.kernel.keys
         */
        async list(handle) {
            const res = [];
            const keys = getS4NodeByHandle(handle).s4.k;

            for (const ak in keys) {
                if (!keys[ak].rs) {
                    res.push(freeze({ak, ...keys[ak]}));
                }
            }

            return res;
        },

        /**
         * Removes the pair of Access Key and User Key given Access Key.
         * @param {String} handle bucket container node-handle
         * @param {String} accessKey
         * @returns {Promise<*>}
         * @memberOf s4.kernel.keys
         */
        async remove(handle, accessKey) {
            const n = getS4NodeByHandle(handle);
            const mk = n.s4.k;
            const ak = mk[accessKey];

            logger.assert(ak && !ak.rs);

            delete mk[accessKey];
            return updateS4Attribute(n);
        },

        /**
         * Retrieves the single reserved key for the bucket container.
         * @param {String} handle container
         * @returns {Promise<{sk, ak: string}>}
         * @memberOf s4.kernel.keys
         */
        async retrieve(handle) {
            const keys = getS4NodeByHandle(handle).s4.k;

            for (const ak in keys) {
                const {rs, sk} = keys[ak];
                if (rs) {
                    return {ak, sk};
                }
            }
        },

        /**
         * Enables or disables the supplied key
         * @param {String} handle container
         * @param {String} ak access-key
         * @param {Boolean} [enabled] true/false
         * @returns {Promise<{st}>}
         * @memberOf s4.kernel.keys
         */
        enable(handle, ak, enabled = false) {
            const n = getS4NodeByHandle(handle);

            n.s4.k[ak].en = enabled | 0;
            return updateS4Attribute(n);
        },

        /**
         * Renames the supplied key
         * @param {String} handle container
         * @param {String} ak access-key
         * @param {Boolean} [name] new name
         * @returns {Promise<{st}>}
         * @memberOf s4.kernel.keys
         */
        rename(handle, ak, name) {
            const n = getS4NodeByHandle(handle);

            n.s4.k[ak].n = name;
            return updateS4Attribute(n);
        }
    });

    // -------------------------------------------------------------------------.
    // ___ Bucket Containers: writable folder links in essence. _______________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.container */
    const container = freeze({
        /**
         * Tests if the container name is a valid. A container name is valid if it is a valid
         * node name and there is not another one depth node with the same name in client's cloud.
         * @param {String} name, the
         * @returns {Promise<Boolean>}
         * @memberOf s4.kernel.container
         */
        async validate(name) {
            return new TreeLock().validate(name);
        },

        /**
         * Creates a Container, which can be MEGA or self-managed.
         * @param {String} [name] the container (folder) name
         * @param {Boolean} [managed] If false, there must not exist any one depth node with this name in the cloud. If
         * true, name is set to "Mega Managed Container" If a one depth node with this name exists, the name is
         * suffixed with "- <number>", getting number incremented until finding a unique name.
         * @returns {Promise<string>} The handle of the created node is returned.
         * @memberOf s4.kernel.container
         */
        async create(name, managed = false) {
            const tree = new TreeLock();

            if (name === true) {
                managed = true;
            }
            else {
                logger.assert(tree.validate(name), `Invalid name: ${name}`);
            }

            if (managed) {
                logger.assert(!tree.filter('s4', (n) => !n.s4.sh).length);
                name = 'Mega Managed Container';
            }
            const s4 = {u: {}, g: {}, k: {}, p: {}, sh: 1, li: 0x100};
            const h = await tree.create(name, {s4});

            await api_setshare(h, [{u: 'EXP', r: 0, w: 1}]);
            const n = M.getNodeByHandle(h);

            logger.assert(n.ph);
            if (managed) {
                delete n.s4.sh;
                await keys.create(h, null, S4PTR, true);
            }

            await updateS4Attribute(n);
            return h;
        },

        /**
         * Retrieves the list of Containers.
         * For each container, the handle and a boolean whether it is MEGA managed (vs. Self Managed) is returned.
         * @returns {Promise<Array>}
         * @memberOf s4.kernel.container
         */
        async list() {
            return new TreeLock().search('*', 's4').map(n => ({handle: n.h, name: n.name, managed: !n.s4.sh}));
        },

        /**
         * Fetch container information.
         * If handle corresponds to a MEGA managed node, host is build as <public_handle>.global.mega.io
         * where <public_handle> is the writable folder link ph codified as a 15 decimal numbers string (left
         * padded with 0 if shorter than 15), e.g. 562949953421311. If handle corresponds to a self managed node,
         * ph contains the public handler of the writable folder link, key is build as <share_key>:<writable_secret>
         * @param {String} handle, the
         * @returns {Promise<{[p: string]: *|string, name, key: string}>}
         * @memberOf s4.kernel.container
         */
        async info(handle) {
            const {name, s4: {sh}} = getS4NodeByHandle(handle);
            const {ph, w} = M.getNodeShare(handle);
            logger.assert(w && u_sharekeys[handle]);

            const k = sh ? 'ph' : 'host';
            const v = sh ? ph : BASE_DOMAIN.replace('%n', 'iam');
            return {name, [k]: v, key: `${a32_to_base64(u_sharekeys[handle][0])}:${w}`};
        },

        /**
         * Removes the container node
         * @param {String} handle node handle.
         * @param {String} [type] private
         * @returns {Promise<*>}
         * @memberOf s4.kernel.container
         */
        async remove(handle, type) {
            const n = getS4NodeByHandle(handle, type);
            delete n.s4;
            await updateS4Attribute(n);
            return M.moveToRubbish([n.h]);
        },

        access: freeze({
            async users(handle, enable) {
                const n = getS4NodeByHandle(handle);
                n.s4.eu = !!enable | 0;
                return updateS4Attribute(n);
            },
            async public(handle, enable) {
                const n = getS4NodeByHandle(handle);
                n.s4.ep = !!enable | 0;
                return updateS4Attribute(n);
            }
        })
    });

    // -------------------------------------------------------------------------.
    // ___ Buckets: regular folders within a container. _______________________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.bucket */
    const bucket = freeze({
        /**
         * Tests if the bucket name is a valid.
         * A bucket name is valid if it is a valid node name and there is not another
         * one depth node with the same name in children of container-handle.
         * @param {String|TreeLock} container node handle
         * @param {String} name, the
         * @returns {Promise<Boolean>}
         * @memberOf s4.kernel.bucket
         */
        async validate(container, name) {

            if (!validator.isValidBucketName(name)) {
                return false;
            }

            if (!(container instanceof TreeLock)) {
                container = new TreeLock(getS4NodeByHandle(container).h);
            }
            return container.validate(name);
        },

        /**
         * Creates a bucket with the specified name, within the specified container.
         * @param {String} container node handle
         * @param {String|MegaNode} name Bucket name to create, or existing MegaNode to make it so.
         * @returns {Promise<string>} The handle of the created node for the bucket is returned.
         * @memberOf s4.kernel.bucket
         */
        async create(container, name) {
            let h, n;
            const p = getS4NodeByHandle(container).h;
            const s4 = getDefaultBucketS4Attribute(p);

            if (name instanceof MegaNode) {
                n = name;
                h = n.h;
                name = n.name;
            }
            name = validator.satisfy.bucketName(name);

            if (n) {
                logger.assert(n.t > 0, `Node ${h} is of invalid type...`);

                await updateS4Attribute(n, {name, s4});
            }
            else {
                if (!M.c[p]) {
                    await dbfetch.get(p);
                }
                const tl = new TreeLock(p);

                // @todo review (redundant -idx)
                name = tl.lookup(name);
                validator.assert.bucketName(name);

                h = await tl.create(name, {s4});
            }

            return h;
        },

        /**
         * The ARN string of a bucket is arn:aws:iam::<ContainerNodePublicHandle>:bucket/<bucketName>
         * @param {String} handle bucket's node-handle
         * @returns {Promise<String>}
         * @memberOf s4.kernel.bucket
         */
        async arn(handle) {
            const b = getS4NodeByHandle(handle, 'bucket');
            const c = getS4NodeByHandle(b.p);
            return `arn:aws:iam::${c.s4.sh ? c.ph : mega.hton(c.h)}:bucket/${b.name}`;
        },

        /**
         * Recursively remove the bucket node
         * @param {String} handle bucket's node-handle
         * @returns {Promise<void>}
         * @memberOf s4.kernel.bucket
         */
        async remove(handle) {
            // @todo ensure re-usability
            return container.remove(handle, 'bucket');
        },

        /**
         * Rename the bucket node
         * @param {String} handle bucket's node-handle
         * @param {String} name, the
         * @returns {Promise<void>}
         * @memberOf s4.kernel.bucket
         */
        async rename(handle, name) {
            const n = getS4NodeByHandle(handle, 'bucket');
            const tl = new TreeLock(n.p);

            name = tl.lookup(name);
            validator.assert.expr(await this.validate(tl, name));
            validator.assert.bucketName(name);

            return updateS4Attribute(n, {name});
        },

        /**
         * Update bucket node
         * @param {String} handle bucket's node-handle
         * @param {Boolean} enabled
         * @returns {Promise}
         * @memberOf s4.kernel.bucket
         */
        async update(handle, enabled) {
            const n = getS4NodeByHandle(handle, 'bucket');
            n.s4.e = !!enabled | 0;
            return updateS4Attribute(n);
        },

        /**
         * Get/Set bucket's public URL access
         * @param {String} handle MegaNode's handle
         * @param {Number} [access] set public access
         * @returns {Promise<Number>} access level
         * @memberOf s4.kernel.bucket
         */
        async publicURLAccess(handle, access) {
            const n = getS4NodeByHandle(handle, 'bucket');

            if (access !== undefined) {
                logger.assert(typeof access === 'number' && access >= 0 && access < 3, 'Invalid access.');

                n.s4.pao = access;
                await updateS4Attribute(n);
            }

            return n.s4.pao | 0;
        },

        /**
         * Get bucket Virtual-Hosted domain
         * @param {String|MegaNode} h bucket node/handle
         * @returns {String} host domain
         * @memberOf s4.kernel.bucket
         */
        getHostDomain(h) {
            const n = typeof h === 'string' ? getS4NodeByHandle(h, 'bucket') : h;
            return BASE_DOMAIN.replace('%n', `${n.name}.s3`);
        }
    });

    // -------------------------------------------------------------------------.
    // ___ Object Manipulation. _______________________________________________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.object */
    const object = freeze({
        /**
         * Get/Set object public URL access
         * @param {String} handle MegaNode's handle
         * @param {Boolean} [access] set public access
         * @returns {Promise<Boolean>} access level
         * @memberOf s4.kernel.object
         */
        async publicURLAccess(handle, access) {
            const n = M.getNodeByHandle(handle);

            if (access !== undefined) {
                n.s4 = {...n.s4, pa: access | 0};
                await updateS4Attribute(n);
            }

            return !!(n.s4 && n.s4.pa);
        },
        /**
         * Get object public URL
         * @param {String} handle MegaNode's handle
         * @returns {Promise<String>} public url
         * @memberOf s4.kernel.object
         */
        async getPublicURL(handle) {
            const o = getS4NodeByHandle(handle, 'object');
            const b = getS4BucketForObject(o);
            const c = getS4NodeByHandle(b.p);

            let path = M.getPath(o.h).reverse();

            path = path.slice(path.indexOf(c.h) + 1).filter(Boolean)
                .map(h => encodeURIComponent(M.getNameByHandle(h)));

            return `https://s3.g.s4.mega.io/${mega.hton(c.ph)}/${path.join('/')}`;
        }
    });

    // -------------------------------------------------------------------------.
    // ___ Policies: Managed and custom policy handling per user and group. ___/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.policies */
    const policies = freeze({
        /**
         * Attaches the specified managed policy to the specified user/group.
         * @param {String} handle container
         * @param {String} name The name (friendly name, not ARN) of the IAM user/group to attach the policy to.
         * @param {Array|String} policy The ARN of the IAM policy you want to attach.
         * @param {*} [type] private, do NOT use
         * @returns {Promise<*>}
         * @memberOf s4.kernel.policies
         */
        async attachPolicy(handle, name, policy, type = null) {
            assert(type === 'User' || type === 'Group');
            validator.assert[`${type.toLowerCase()}Name`](name);

            if (Array.isArray(policy)) {

                for (let i = policy.length; i--;) {
                    policy[i] = validator.satisfy.policyArn(policy[i]);
                }
            }
            else {
                policy = [validator.satisfy.policyArn(policy)];
            }

            const n = getS4NodeByHandle(handle);

            // @todo ... the docs for this are obviously wrong.
            /**
            const pol = await this.seek(handle, policy);
            for (let i = pol.length; i--;) {
                const p = pol[i];
                assert(!n.s4.p[p.idx]);

                n.s4.p[p.idx] = {
                    n: p.policyName,
                    vs: {
                        v: 1,
                        d: '',
                        cu: p.upateDate,
                        ct: p.createDate,
                    }
                };
            }
            /**/

            return updateS4Node(n, `Attach${type}Policy`, {[`${type}Name`]: name}, policy, 'PolicyArn');
        },

        /**
         * Removes the specified managed policy from the specified user/group.
         * @param {String} handle container
         * @param {String} name The name (friendly name, not ARN) of the IAM user/group to remove the policy from.
         * @param {String} policy The ARN of the IAM policy you want to attach.
         * @param {String} [type] private, do NOT use
         * @returns {Promise<*>}
         * @memberOf s4.kernel.policies
         */
        async detachPolicy(handle, name, policy, type = null) {
            assert(type === 'User' || type === 'Group');

            validator.assert[`${type.toLowerCase()}Name`](name);
            policy = validator.satisfy.policyArn(policy);

            const n = getS4NodeByHandle(handle);
            return updateS4Node(n, `Detach${type}Policy`, {[`${type}Name`]: name}, policy, 'PolicyArn');
        },

        /**
         * @see {@link attachPolicy}
         * @memberOf s4.kernel.policies
         */
        async attachUserPolicy(handle, name, policy) {
            return this.attachPolicy(handle, name, policy, 'User');
        },
        /*
         * @see {@link detachPolicy}
         * @memberOf s4.kernel.policies
         */
        async detachUserPolicy(handle, name, policy) {
            return this.detachPolicy(handle, name, policy, 'User');
        },
        /**
         * @see {@link attachPolicy}
         * @memberOf s4.kernel.policies
         */
        async attachGroupPolicy(handle, name, policy) {
            return this.attachPolicy(handle, name, policy, 'Group');
        },
        /**
         * @see {@link attachPolicy}
         * @memberOf s4.kernel.policies
         */
        async detachGroupPolicy(handle, name, policy) {
            return this.detachPolicy(handle, name, policy, 'Group');
        },

        /**
         * Returns the policy of a specified bucket.
         * @param {String} handle bucket node handle
         * @returns {Promise<*>}
         * @memberOf s4.kernel.policies
         */
        async getBucketPolicy(handle) {
            const req = getS4RequestByHandle(handle, 'bucket', {
                method: 'GET',
                path: '/?policy',
            });

            return xmlParser.fromJSON((await s4HttpRequest.lookup('*', req))[Symbol.for('response')], true);
        },

        /**
         * Applies a bucket policy to a bucket.
         * @param {String} handle bucket node handle
         * @param {String|Object} policy The policy object, or string in JSON notation
         * @returns {Promise<*>}
         * @memberOf s4.kernel.policies
         */
        async putBucketPolicy(handle, policy = false) {
            const req = getS4RequestByHandle(handle, 'bucket', {
                method: 'PUT',
                path: '/?policy',
                body: typeof policy === 'string' ? policy : JSON.stringify(policy)
            });

            return s4HttpRequest.lookup('/', req);
        },

        /**
         * Delete the policy of a specified bucket.
         * @param {String} handle bucket node handle
         * @returns {Promise<*>}
         * @memberOf s4.kernel.policies
         */
        async deleteBucketPolicy(handle) {
            const req = getS4RequestByHandle(handle, 'bucket', {
                method: 'DELETE',
                path: '/?policy'
            });

            return s4HttpRequest.lookup('/', req);
        },

        /**
         * Lists both custom and S4 managed policies.
         * @param {String} handle container's node-handle
         * @param {*} [idx] private, do NOT use
         * @param {*} [type] private, do NOT use
         * @returns {Promise<Array>}
         * @memberOf s4.kernel.policies
         */
        async list(handle, idx = -1, type = 0) {
            const ck = `pl/${handle}`;

            if (!moe.has(ck)) {
                await moe.acquire(ck, () => {
                    return s4HttpRequest.lookup('listPoliciesResult/policies/member', handle, 'ListPolicies');
                });
            }
            let res = moe.get(ck);

            if (type) {
                const {mpi} = getS4NodeByHandle(handle).s4[type][idx];

                if ((res = mpi.length && mpi.map(i => res[i]).filter(Boolean))) {

                    res = res.length && res.map((p) => {
                        return {name: p.policyName, ...p};
                    });
                }
            }

            return res && clone(res) || false;
        },

        /**
         * Lists all managed policies that are attached to the specified IAM group.
         * @param {String} handle Container's node-handle.
         * @param {Number} gid Group ID on the container.
         * @returns {Promise<Array|void>}
         * @memberOf s4.kernel.policies
         */
        async listGroupPolicies(handle, gid) {
            return this.list(handle, gid, 'g');
        },

        /**
         * Lists all managed policies that are attached to the specified IAM user.
         * @param {String} handle Container's node-handle.
         * @param {Number} uid User ID on the container.
         * @return {Promise<Array|void>}
         * @memberOf s4.kernel.policies
         */
        async listUserPolicies(handle, uid) {
            return this.list(handle, uid, 'u');
        },

        /**
         * Seek and validate policies.
         * @param {String} handle Bucket container node-handle
         * @param {Array} [policies] list of policies to validate.
         * @return {Promise<Array>} policies list
         * @memberOf s4.kernel.policies
         */
        async seek(handle, policies) {
            const res = [];
            const pl = entries(await this.list(handle), ([idx, v]) => [v.arn.toLowerCase(), {...v, idx}]);

            for (let i = policies.length; i--;) {
                const k = policies[i];
                const v = pl[k.toLowerCase()];

                res.push(v);
                assert(v, `Policy '${k}' does not exists...`);
            }

            return res;
        },

        /**
         * Retrieve information for policies attached to a bucket container.
         * @param {String} handle bucket container's node-handle.
         * @return {Promise<Array>}
         * @memberOf s4.kernel.policies
         */
        async info(handle) {
            const n = getS4NodeByHandle(handle);
            const pl = await this.list(handle);
            const res = Object.create(null);

            const a = ['g', 'u'];
            for (let i = a.length; i--;) {
                const s = n.s4[a[i]];

                for (const idx in s) {
                    const {mpi} = s[idx];

                    for (let y = mpi.length; y--;) {
                        const p = pl[mpi[y]];

                        if (!res[p.arn]) {
                            res[p.arn] = {name: p.policyName, arn: p.arn, cnt: 0};
                        }
                        res[p.arn].cnt++;
                    }
                }
            }
            return Object.values(res);
        },

        /**
         * Retrieves information about the specified managed policy, including the policy's default version
         * and the total number of IAM users, groups, and roles to which the policy is attached.
         * @param {String} arn The ARN of the managed policy that you want information about.
         * @param {String} [handle] ufs-node's handle.
         * @returns {Promise<Object>}
         * @memberOf s4.kernel.policies
         */
        async getPolicy(arn, handle) {
            if (!handle) {
                // @todo extract from ARN.
                assert(false, 'TBD.');
            }

            const payload = {Action: 'GetPolicy', PolicyArn: arn};
            return s4HttpRequest.lookup('getPolicyResult/policy', handle, payload);
        },

        /**
         * Retrieves information about the specified version of the
         * specified managed policy, including the policy document.
         * @param {String} arn The ARN of the managed policy that you want information about.
         * @param {String} version Identifies the policy version to retrieve.
         * @param {String} [handle] ufs-node's handle.
         * @returns {Promise<void>}
         * @memberOf s4.kernel.policies
         */
        async getPolicyVersion(arn, version = 'v1', handle = null) {
            if (!handle) {
                // @todo extract from ARN.
                assert(false, 'TBD.');
            }

            const payload = {
                PolicyArn: arn,
                VersionId: version,
                Action: 'GetPolicyVersion'
            };
            const pat = 'getPolicyVersionResult/policyVersion/document';
            const res = await s4HttpRequest.lookup(pat, handle, payload);

            return xmlParser.fromJSON(decodeURIComponent(res), true);
        }
    });

    // -------------------------------------------------------------------------.
    // ___ Groups: collection of groups. ______________________________________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.group */
    const group = freeze({
        /**
         * Test if the group name is valid.
         * @param {String} handle container node-handle
         * @param {String} name group name
         * @returns {Promise<boolean>}
         * @memberOf s4.kernel.group
         */
        async validate(handle, name) {
            validator.assert.groupName(name);
            assert(!Object.values(getS4NodeByHandle(handle).s4.g).some(aEqUGName(name)), `Name "${name}" exists.`);
            return true;
        },

        /**
         * Creates group with the supplied data and returns the new groupId.
         * @param {String} handle container node-handle
         * @param {String} name group name
         * @param {String|Array} policies Policy arn string(s)
         * @returns {Promise<Number>} Group ID
         * @memberOf s4.kernel.group
         */
        async create(handle, name, policies) {
            logger.assert(await this.validate(handle, name));
            // @todo validate policy

            const n = getS4NodeByHandle(handle);
            const gid = getS4UniqueID(n);

            logger.assert(!n.s4.g[gid], `Group '${gid}' exists.`);
            n.s4.g[gid] = {n: name, cpi: [], mpi: [], ct: time()};

            await s4.kernel.policies.attachGroupPolicy(n.h, name, policies);
            return gid;
        },

        /**
         * Fetch group information.
         * @param {String} handle container node handle
         * @param {Number|String} gid Group ID on the container.
         * @returns {Promise<{[name: string]: *|string, arn, keys: string}>}
         * @memberOf s4.kernel.group
         */
        async info(handle, gid) {
            const n = getS4NodeByHandle(handle);
            const {n: name, ct: creation} = n.s4.g[gid];

            return freeze({
                name,
                creation,
                arn: await this.arn(handle, gid),
                users: (await user.list(handle)).filter(u => !!u.groups[gid])
            });
        },

        /**
         * Removes group and all its references from container s4 attribute.
         * @param {String} handle container node-handle
         * @param {Number|String} gid Group ID on the container.
         * @returns {Promise<*>}
         * @memberOf s4.kernel.group
         */
        async remove(handle, gid) {
            const n = getS4NodeByHandle(handle);

            logger.assert(n.s4.g[gid], `Group '${gid}' does not exists.`);

            for (const uid in n.s4.u) {
                array.remove(n.s4.u[uid].g, `${gid | 0}`, true);
            }

            delete n.s4.g[gid];
            return updateS4Attribute(n);
        },

        /**
         * List existing groups at a bucket container.
         * @param {String} handle container node-handle
         * @returns {Promise<*>}
         * @memberOf s4.kernel.group
         */
        async list(handle) {
            const res = [];
            const n = getS4NodeByHandle(handle);

            for (let gid in n.s4.g) {
                gid |= 0;
                res.push(freeze({gid, ...await this.info(handle, gid)}));
            }

            return res;
        },

        /**
         * Rename an existing group.
         * @param {String} handle container node-handle
         * @param {Number|String} gid Group ID on the container.
         * @param {String} name New username
         * @returns {Promise<*>}
         * @memberOf s4.kernel.group
         */
        async rename(handle, gid, name) {
            const n = getS4NodeByHandle(handle);

            logger.assert(n.s4.g[gid], `Group '${gid}' does not exists.`);

            if (String(name).toLowerCase() !== String(n.s4.g[gid].n).toLowerCase()) {

                logger.assert(await this.validate(handle, name));
            }

            n.s4.g[gid].n = name;
            return updateS4Attribute(n);
        },

        /**
         * Assign the listed users to the group.
         * @param {String} handle container node-handle
         * @param {Number|String} gid Group ID on the container.
         * @param {Array|String} users list of users
         * @returns {Promise<*>}
         */
        async addUsers(handle, gid, users) {
            const n = getS4NodeByHandle(handle);

            gid = `${gid | 0}`;
            logger.assert(gid > 0x100 && n.s4.g[gid], `Group '${gid}' does not exists.`);

            if (!Array.isArray(users)) {
                users = [users];
            }

            for (let i = users.length; i--;) {
                const uid = users[i] | 0;

                logger.assert(n.s4.u[uid], `Invalid user "${uid}" to add group "${gid}" to.`);
                logger.assert(!n.s4.u[uid].g.includes(gid), `Group "${gid}" already exists on user "${uid}".`);

                n.s4.u[uid].g.push(gid);
            }

            return updateS4Attribute(n);
        },

        /**
         * Removes users from group.
         * @param {String} handle container node-handle
         * @param {Number|String} gid Group ID on the container.
         * @param {Array|String} users list of users
         * @returns {Promise<*>}
         */
        async removeUsers(handle, gid, users) {
            let changed = 0;
            const n = getS4NodeByHandle(handle);

            if (!Array.isArray(users)) {
                users = [users];
            }

            for (let i = users.length; i--;) {
                const uid = users[i] | 0;

                if (n.s4.u[uid]) {

                    changed |= array.remove(n.s4.u[uid].g, `${gid | 0}`, true);
                }
            }

            if (d && !changed) {
                logger.warn('Unable to remove supplied users...', users);
            }

            return changed && updateS4Attribute(n);
        },

        /**
         * The ARN string of a group is arn:aws:iam:<ContainerNodePublicHandle>:group/<groupName>
         * @param {String} handle container's node-handle
         * @param {Number|String} gid Group ID on the container, or name...
         * @returns {Promise<String>} ARN String
         * @memberOf s4.kernel.group
         */
        async arn(handle, gid) {
            const n = getS4NodeByHandle(handle);
            const g = n.s4.g[gid];
            return validator.satisfy.policyArn(n, ['group', g ? g.n : gid]);
        },
    });

    // -------------------------------------------------------------------------.
    // ___ Users: collection of users (S3 sub-users). _________________________/
    // /.\__________________________________________________________________/-:\
    // \_/------------------------------------------------------------------\__/

    /** @property s4.kernel.user */
    const user = freeze({
        /**
         * Test if the user name is valid.
         * @param {String} handle container node-handle
         * @param {String} name user name
         * @returns {Promise<boolean>}
         * @memberOf s4.kernel.user
         */
        async validate(handle, name) {
            validator.assert.userName(name);
            assert(!Object.values(getS4NodeByHandle(handle).s4.u).some(aEqUGName(name)), `Name "${name}" exists.`);
            return true;
        },

        /**
         * Creates user with the supplied data and returns the new user id.
         * @param {String} handle container node-handle
         * @param {String} name user name
         * @param {Boolean} access programmatic access
         * @param {Array} groups to attach to
         * @param {String|Array} policies arn string(s)
         * @returns {Promise<Number>} user-id created.
         * @memberOf s4.kernel.user
         */
        async create(handle, name, access, groups, policies) {
            // @todo validate policy
            logger.assert(await this.validate(handle, name));

            const n = getS4NodeByHandle(handle);
            for (let i = groups.length; i--;) {
                groups[i] |= 0;
                // @todo ignore/skip instead of fail?
                logger.assert(n.s4.g[groups[i]], `Invalid Group: ${groups[i]}@${i}`);
            }
            const uid = getS4UniqueID(n);

            logger.assert(!n.s4.u[uid], `User '${uid}' exists.`);
            n.s4.u[uid] = {
                n: name, ac: !!access | 0, pw: '', cpi: [], mpi: [], g: groups.map(String), ct: time()
            };

            await keys.create(n.h, uid, S4PTR);
            await s4.kernel.policies.attachUserPolicy(n.h, name, policies);
            return uid;
        },

        /**
         * Fetch user information.
         * @param {String} handle container node handle
         * @param {Number} uid User ID on the container.
         * @returns {Promise<{[name: string]: *|string, arn, keys: string}>}
         * @memberOf s4.kernel.user
         */
        async info(handle, uid) {
            const groups = Object.create(null);
            const n = getS4NodeByHandle(handle);
            const {n: name, g, ct: creation} = n.s4.u[uid];

            for (let i = g.length; i--;) {
                const gid = g[i] | 0;
                logger.assert(gid > 0x100);
                groups[gid] = freeze({gid, ...n.s4.g[gid]});
            }

            return freeze({
                name,
                groups,
                creation,
                arn: await this.arn(handle, uid),
                keys: (await keys.list(handle)).filter(aEqUserID(uid | 0)),
            });
        },

        /**
         * Removes user and all its references from container s4 attribute.
         * @param {String} handle container node-handle
         * @param {Number} uid User ID on the container.
         * @returns {Promise<*>}
         * @memberOf s4.kernel.user
         */
        async remove(handle, uid) {
            logger.assert((uid |= 0) > 0x100, `Invalid user ${uid}...`);

            const n = getS4NodeByHandle(handle);
            const k = (await keys.list(handle)).filter(aEqUserID(uid | 0));

            logger.assert(n.s4.u[uid], `User '${uid}' does not exists.`);

            for (let i = k.length; i--;) {
                delete n.s4.k[k[i].ak];
            }

            delete n.s4.u[uid];
            return updateS4Attribute(n);
        },

        /**
         * List existing users at a bucket container.
         * @param {String} handle container node-handle
         * @returns {Promise<*>}
         * @memberOf s4.kernel.user
         */
        async list(handle) {
            const res = [];
            const n = getS4NodeByHandle(handle);

            for (let uid in n.s4.u) {
                uid |= 0;
                res.push(freeze({uid, ...await this.info(handle, uid)}));
            }

            return res;
        },

        /**
         * Rename an existing user.
         * @param {String} handle container node-handle
         * @param {Number} uid User ID on the container.
         * @param {String} name New username
         * @returns {Promise<*>}
         * @memberOf s4.kernel.user
         */
        async rename(handle, uid, name) {
            const n = getS4NodeByHandle(handle);

            logger.assert(n.s4.u[uid], `User '${uid}' does not exists.`);

            if (String(name).toLowerCase() !== String(n.s4.u[uid].n).toLowerCase()) {

                logger.assert(await this.validate(handle, name));
            }

            n.s4.u[uid].n = name;
            return updateS4Attribute(n);
        },

        /**
         * The ARN string of a user is arn:aws:iam:<ContainerNodePublicHandle>:user/<userName>
         * @param {String} handle container's node-handle
         * @param {Number|String} uid User ID on the container, or name...
         * @returns {Promise<String>} ARN String
         * @memberOf s4.kernel.user
         */
        async arn(handle, uid) {
            const n = getS4NodeByHandle(handle);
            const u = n.s4.u[uid];
            return validator.satisfy.policyArn(n, ['user', u ? u.n : uid]);
        },
    });

    // ------------------------------------------------------------------------

    const foreignValidator = freeze({
        'rename': ({node: n, name}) => {
            const type = getS4NodeType(n.h);

            if (type === 'container') {
                // @todo
                return false;
            }

            if (type === 'bucket') {
                return s4.kernel.bucket.rename(n.h, name);
            }

            return type[0] === 'o' ? validator.satisfy.objectName(name) : name;
        }
    });

    // ------------------------------------------------------------------------

    return freeze({
        keys,
        user,
        group,
        object,
        bucket,
        policies,
        container,
        getS4NodeType,
        getS4NodeByHandle,
        getS4BucketForObject,
        ...validator,
        getPublicAccessLevel(n) {
            let res = 0;
            const type = getS4NodeType(n);

            if (type === 'bucket') {

                res = getS4BucketAttribute(n).pao;
            }
            else if (type === 'object') {

                res = n.s4 && n.s4.pa;
            }

            return res | 0;
        },
        setNodeAttributesByRef(target, n) {
            const type = getS4NodeType(target);

            if (type === 'container') {
                n.s4 = getDefaultBucketS4Attribute(target);
                n.name = validator.satisfy.bucketName(n.name);
            }
        },
        validateForeignAction(action, options) {
            validator.assert.expr(foreignValidator[action], options, `Unknown action "${action}"`);

            const res = foreignValidator[action](options);

            if (!res && !options.silent) {
                throw new SecurityError(`Forbidden action ${action} on foreign S4 node.`);
            }
            return res;
        },
        audit: self.d > 0 && freeze({
            async test(containerHandle) {

                if (!containerHandle) {
                    // Create a MEGA-managed container.
                    containerHandle = await s4.kernel.container.create(true);
                }

                // Create a bucket in that container.
                const bucketHandle = await s4.kernel.bucket.create(containerHandle, 'TestBucket');

                // Set public access
                const access = await s4.kernel.bucket.publicURLAccess(bucketHandle, 1);
                logger.assert(access === 1);

                const pol = await s4.kernel.policies.list(containerHandle);

                console.table(pol);
                const [{arn}] = pol;

                const name = `TestGroup.${Date.now().toString(36).slice(-4)}`;
                const groupId = await s4.kernel.group.create(containerHandle, name, arn);

                const uid = await s4.kernel.user.create(
                    containerHandle,
                    name.replace('Group', 'User'),
                    true,
                    [groupId],
                    arn
                );

                dump(
                    `user-info(${uid}) @ container(${containerHandle})`,
                    JSON.stringify(await s4.kernel.user.info(containerHandle, uid), null, 11)
                );

                const policySample = {
                    Id: 'Test',
                    Version: '2008-10-17',
                    Statement: [
                        {
                            'Sid': makeUUID(),
                            Effect: 'Allow',
                            Principal: {'AWS': '*'},
                            Action: ['s3:*'],
                            Resource: 'arn:aws:s3:::test-bucket-1/*'
                        },
                        {
                            Effect: "Allow",
                            Action: "*",
                            Resource: "*"
                        }
                    ]
                };
                let res = await s4.kernel.policies.putBucketPolicy(bucketHandle, policySample);
                logger.assert(res[Symbol.for('status')] === '200 OK', 'Invalid PutBucketPolicy response.');

                res = await s4.kernel.policies.getBucketPolicy(bucketHandle);
                assert(res.Statement[0].Resource === policySample.Statement[0].Resource, `getBucketPolicy`, res);

                dump(' --- stage2', res);

                // --------------------
                const gcc = 3;
                const ucc = 5;
                const promises = [];

                for (let i = gcc; i--;) {
                    promises.push(s4.kernel.group.create(containerHandle, `grp${i}`, arn));
                }
                const groups = await Promise.all(promises);
                promises.length = 0;

                for (let i = ucc; i--;) {
                    promises.push(
                        s4.kernel.user.create(containerHandle, `usr${i}`, true, [groupId], arn),
                        // re-fire to test auto-renaming, e.g. "usr0" -> "usr0 - 1"
                        s4.kernel.user.create(containerHandle, `usr${i}`, true, [groupId], arn)
                    );
                }
                const users = await Promise.all(promises);
                promises.length = 0;

                console.group(`adding users ${users}, to groups ${groups}...`);

                for (let i = groups.length; i--;) {
                    promises.push(s4.kernel.group.addUsers(containerHandle, groups[i], users));
                }
                dump(`users@groups result...`, await Promise.all(promises));
                dump(JSON.stringify(M.d[containerHandle].s4, null, 11));
                console.groupEnd();

                console.group(`removing users ${users} from groups ${groups}...`);

                for (let i = groups.length; i--;) {
                    promises.push(s4.kernel.group.removeUsers(containerHandle, groups[i], users));
                }
                dump(`users@groups result...`, await Promise.all(promises));
                dump(JSON.stringify(M.d[containerHandle].s4, null, 11));
                console.groupEnd();

                console.group(' --- testing multiple group policy additions and to users.');
                {
                    let pls = new Set();
                    const pSort = (a) => Array.from(a).map(p => p.arn).sort().join('|');

                    for (let i = 5; i--;) {
                        pls.add(pol[Math.random() * pol.length | 0]);
                    }
                    const name = `multi-pol-group${makeUUID().slice(-13)}`;
                    const users = await s4.kernel.user.list(containerHandle);

                    pls = [...pls];
                    const gid = await s4.kernel.group.create(containerHandle, name, pls.map(p => p.arn));
                    const st = await s4.kernel.group.addUsers(containerHandle, gid, users.map(u => u.uid));
                    const list = await s4.kernel.policies.listGroupPolicies(containerHandle, gid);

                    assert(list.length === pls.length, 'Invalid number of policies attached.', list, pls);
                    assert(pSort(list) === pSort(pls), 'Attached policies does not match...', list, pol);
                    assert(st === api.lastst, 'sequence-tag mismatch.', st, api.lastst, api.currst);

                    const info = await s4.kernel.group.info(containerHandle, gid);
                    assert(pSort(info.users) === pSort(users), 'Attached users does not match...', users, info);
                }
                console.groupEnd();

                dump(' --- audit.test() completed.');
                return {uid, containerHandle};
            }
        })
    });
});
