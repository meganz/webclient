/** @property T.core */
lazy(self.T, 'core', () => {
    'use strict';

    let uid = 0x7ff;
    const edx = '\x80';
    const storage = localStorage;
    const xRLock = Object.create(null);
    const xPwStore = Object.create(null);
    const xLinkInfo = Object.create(null);
    const parse = tryCatch((a) => JSON.parse(a));
    const stringify = tryCatch((a) => JSON.stringify(a));
    const getTime = (t, e = 174e10) => t ? parseInt(t, 16) + e : (Date.now() - e).toString(16);

    const encode = tryCatch((obj, raw = false) => {
        let s = `${edx}`;
        const l = Object.getOwnPropertyNames(obj);

        for (let i = l.length; i--;) {
            const k = l[i];
            let v = obj[k];
            let t = 0;

            switch (typeof v) {
                case 'object':
                    if (!Array.isArray(v)) {
                        t = 1;
                        v = encode(v, true);
                        break;
                    }
                /* fallthrough */
                case 'string':
                case 'number':
                    v = stringify(v);
                    break;
                default:
                    v = null;
            }

            if (v && v.length && k.length < 0x1f && v.length < 0x1ff) {
                const u = v.length << 7 | k.length - 1 << 2 | t;
                s += String.fromCharCode(u >> 8, u & 0xff) + k + v;
            }
        }
        return raw ? s.slice(1) : base64urlencode(s);
    });

    const decode = tryCatch((s, raw = false) => {
        const obj = Object.create(null);

        if (!raw && (s = base64urldecode(s || ''))) {
            s = s[0] === edx && s.slice(1) || '';
        }
        for (let i = 0; i < s.length;) {
            const u = s.charCodeAt(i++) << 8 | s.charCodeAt(i++);
            const j = u >> 7;
            const l = (u >> 2 & 0x1f) + 1;
            const k = s.substr(i, l);
            let v = s.substr(i + l, j);

            v = u & 3 ? decode(v, true) : parse(v);
            if (v) {
                obj[k] = v;
            }
            i += l + j;
        }
        return obj;
    });

    const sendAPIRequest = async(payload, options) => {
        const ctx = {
            valueOf: () => 7,
            apipath: T.core.apipath
        };
        if (options) {
            if (typeof options !== 'object') {
                options = false;
            }
            else if (xRLock.bt7) {
                await xRLock.bt7.promise;
            }
            const {result, responses} = await api.req(payload, freeze({...options, ...ctx}));
            return responses || result;
        }

        if (!xRLock.bt7) {
            Object.defineProperties(xRLock.bt7 = [], Object.getOwnPropertyDescriptors(Promise.withResolvers()));

            onIdle(() => {
                const bulk = [...xRLock.bt7];
                const {resolve} = xRLock.bt7;
                delete xRLock.bt7;

                sendAPIRequest(bulk.map(o => o.payload), true)
                    .then((res) => {
                        for (let i = res.length; i--;) {
                            bulk[i].resolve(res[i]);
                        }
                    })
                    .catch((ex) => {
                        for (let i = bulk.length; i--;) {
                            bulk[i].reject(ex);
                        }
                    })
                    .finally(resolve);
            });
        }
        const r = {payload, ...Promise.withResolvers()};
        xRLock.bt7.push(r);

        return r.promise;
    };

    const mkdirp = async(t, name) => {
        const n = {name};
        const a = ab_to_base64(crypto_makeattr(n));
        const k = a32_to_base64(n.k);

        return sendAPIRequest({a: 'xp', t, n: [{h: 'xxxxxxxx', t: 1, a, k}]}).then(({f: [{h}]}) => h);
    };

    const createSession = async() => {
        return self.u_sid || new Promise((resolve, reject) => {
            u_storage = init_storage(localStorage);
            u_checklogin({
                checkloginresult(_, v) {
                    return v === 0 ? resolve(v) : reject(v);
                }
            }, true);
        });
    };

    const createPassword = async(xh, p) => {
        xh = xh.length > 12
            ? base64urldecode(base64urldecode(xh)).slice(-7, -1)
            : base64urldecode(xh).slice(-6);
        const salt = Uint8Array.from(xh.repeat(3), s => s.charCodeAt(0));
        return ab_to_base64(await factory.require('pbkdf2').sha256(p, salt));
    };

    const cast = (v, k) => {
        const [raw, res] = cast.type(k, v);
        if (raw) {
            return res;
        }

        v = res;
        switch (typeof v) {
            case 'string':
                v = base64urlencode(v.trim());
                break;
            case 'boolean':
                v |= 0;
            /* fallthrough */
            case 'number':
                v = (v = parseInt(v)) > 0 && Number.isFinite(v) ? v : null;
                break;
            default:
                dump(`unexpected type, ${k} -> ${typeof v}`);
                v = null;
        }
        return v || undefined;
    };
    cast.type = (k, v) => {
        switch (k) {
            case 't':
            case 'm':
            case 'pw':
            case 'se':
                v = String(v || '');
                if (k === 'se' || k === 'pw') {
                    return [1, v.trim() || undefined];
                }
                else if (k === 't' || k === 'm') {
                    v = to8(v.trim());
                }
                break;
            case 'e':
            case 'mc':
                if ((v = Number(v)) < 1e3 && v > 0) {
                    if (k === 'e') {
                        v = ~~(v * 86400);
                    }
                }
                else if (v === 0) {
                    return [1, v];
                }
        }
        return [0, v];
    };
    freeze(cast);

    return freeze({
        get apipath() {
            return 'https://bt7.api.mega.co.nz/';
        },

        /**
         * create transfer.
         * @param {String} name transfer name
         * @returns {Promise<Array>} ["transferrootnodehandle","transferhandle"]
         * @memberOf T.core
         */
        async create(name) {
            if (!self.u_sid) {
                await createSession();
            }
            const n = {name, mtime: ~~(Date.now() / 1e3)};
            const at = ab_to_base64(crypto_makeattr(n));

            // k - plain AES key, at - attributes (structured and encrypted like node attrs)
            const [c, [xh, h]] = await sendAPIRequest({a: 'xn', at, k: a32_to_base64(n.k)});

            if (c !== 0) {
                throw c;
            }

            assert(typeof h === 'string' && h.length === 8);
            assert(typeof xh === 'string' && xh.length === 12);

            dump(`${getBaseUrl()}/t/${xh}`);

            return [h, xh];
        },

        /**
         * close an open transfer.
         * @param {String} xh transfer handle
         * @returns {Promise<Number>} Numeric error.
         * @memberOf T.core
         */
        async close(xh) {
            return sendAPIRequest({a: 'xc', xh});
        },

        /**
         * delete a transfer.
         * @param {String} xh transfer handle
         * @returns {Promise<Number>} Numeric error.
         * @memberOf T.core
         */
        async delete(xh) {
            return sendAPIRequest({a: 'xd', xh});
        },

        /**
         * list transfers.
         * @memberOf {@link T}
         * @returns {Promise<Array>} array of transfers with the elements
         * - xh (transfer handle)
         * - ct (closing timestamp if closed)
         * - h (handle of the associated root node)
         * - a/k (attributes/key for the root node)
         * - size (footprint as an array of [bytes/files/folders/0/0])
         */
        async list(f) {
            const result = await sendAPIRequest({a: 'xl'});

            if (f) {
                f = (s) => this.fetch(s.xh, 1).then((value) => Object.defineProperty(s, 'f', {value}));

                const p = [];
                for (let i = result.length; i--;) {
                    p.push(f(result[i]));
                }

                await Promise.all(p);
            }

            return result;
        },

        async fetch(xh, close) {
            if (close) {
                await this.close(xh).catch(nop);
            }

            const payload = {a: 'f', c: 1, r: 1};
            const xnc = await this.getExpiryValue(xh).catch(dump);
            if (xnc) {
                payload.xnc = 1;
                xPwStore[xh] = xnc[1];
            }
            const {f} = await this.xreq(payload, xh);

            if (!xnc) {
                this.setExpiryValue(xh, [1, xPwStore[xh]]).catch(dump);
            }
            this.populate(f, xh);
            return freeze(f);
        },

        populate(f, xh) {
            for (let i = f.length; i--;) {
                f[f[i].h] = f[i] = new TransferNode(f[i], xh);
            }
            process_f(f);
        },

        xreq(payload, x) {
            if (x instanceof TransferNode) {
                x = {x: x.xh};
            }
            if (typeof x !== 'object') {
                x = {x};
            }
            if (!('queryString' in x)) {
                x = {queryString: {...x}};
            }
            const k = JSON.stringify(x);

            if (!xRLock[k]) {
                xRLock[k] = [];

                queueMicrotask(() => {
                    const bulk = [...xRLock[k]];
                    delete xRLock[k];

                    if (xPwStore[x.queryString.x]) {
                        x.queryString.pw = xPwStore[x.queryString.x];
                    }

                    const ctx = freeze({
                        ...x,
                        async notifyUpstreamFailure(ex, _, {queryString}) {
                            if (ex === EKEY) {
                                const {x: xh, pw: opw} = queryString;
                                const pw = await T.ui.askPassword({
                                    async validate(value) {
                                        const pw = value && await createPassword(xh, value).catch(dump);
                                        if (!pw || pw === opw) {
                                            return l[17920];
                                        }
                                        xPwStore[xh] = queryString.pw = pw;
                                    }
                                });
                                return pw && self.EEXPIRED || self.EROLLEDBACK;
                            }
                        }
                    });
                    sendAPIRequest(bulk.map(o => o.payload), ctx)
                        .then((res) => {
                            for (let i = res.length; i--;) {
                                bulk[i].resolve(res[i]);
                            }
                        })
                        .catch((ex) => {
                            for (let i = bulk.length; i--;) {
                                bulk[i].reject(ex);
                            }
                        });
                });
            }
            const r = {payload, ...Promise.withResolvers()};
            xRLock[k].push(r);

            return r.promise;
        },

        async askPassword(xh) {
            let res = xPwStore[xh];
            if (!res) {
                const xnc = await this.getExpiryValue(xh).catch(dump);
                res = xnc && xnc[1];
            }
            if (!res) {
                await T.ui.askPassword({
                    async validate(value) {
                        loadingDialog.show();
                        const pw = await createPassword(xh, value)
                            .then((pw) => sendAPIRequest({a: 'xv', xh, pw}).then((res) => res === 1 && pw))
                            .catch(dump)
                            .finally(() => loadingDialog.hide());
                        if (!pw) {
                            return l[17920];
                        }
                        xPwStore[xh] = res = pw;
                    }
                });
            }
            return res;
        },

        async getImportedNodes(sel) {
            return sendAPIRequest({a: 'if', n: [...sel]});
        },

        getDownloadLink(n, direct = true) {
            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }
            const {h, xh, name} = n;
            const setLink = (base) => {
                M.l[h] = `${base}${encodeURIComponent(name)}`;
                if (xPwStore[xh]) {
                    M.l[h] += `${M.l[h].includes('?') ? '&' : '?'}pw=${xPwStore[xh]}`;
                }
            };

            if (direct === true) {
                setLink(`${this.apipath}cs/g?x=${xh}&n=${h}&fn=`);
            }
            if (!M.l[h]) {
                M.l[h] = this.xreq({a: 'g', n: h, pt: 1, g: 1, ssl: 1}, n)
                    .then((res) => {
                        if (res.e || typeof res.g !== 'string' || !res.g.startsWith('http')) {
                            throw res.e || self.EINCOMPLETE;
                        }
                        setLink(`${res.g}/`);
                        return M.l[h];
                    })
                    .catch((ex) => {
                        M.l[h] = "\u200F";
                        throw ex;
                    });
            }
            return M.l[h];
        },

        async getTransferInfo(xh) {
            const result = await sendAPIRequest({a: 'xi', xh});
            xLinkInfo[xh] = result;
            return result;
        },

        async zipDownload(xh) {
            const {z, pw, size: [, files]} = xLinkInfo[xh] || await this.getTransferInfo(xh);
            let n = {h: z, xh, name: `${xh}${z}.zip`};
            if (files === 1) {
                let v = Object.values(M.d).filter(n => !n.t);
                if (!v.length && pw) {
                    await this.fetch(xh);
                    v = Object.values(M.d).filter(n => !n.t);
                }
                console.assert(v.length === 1, 'invalid number of local nodes per xi..?');
                if (v.length === 1) {
                    n = v[0];
                }
            }
            if (!n.h) {
                console.info(`no zip available for ${xh}`);
                return false;
            }
            const url = this.getDownloadLink(n);

            if (pw && !url.includes('pw=')) {
                M.l[z] = null;
                return this.askPassword(xh)
                    .then((pw) => pw && location.assign(`${url}&pw=${pw}`));
            }

            window.open(url, '_blank', 'noopener,noreferrer');
        },

        async upload(file, to, xh) {
            const isBlob = file instanceof Blob;
            const isNode = !isBlob && crypto_keyok(file);
            const files = !isNode && !isBlob && await factory.require('file-list').getFileList(file);

            if (!xh) {
                const def = `Transfer.it ${new Date().toISOString().replace('T', ' ').split('.')[0]}`;
                [to, xh] = await this.create(to || def);
            }
            if (files) {
                const p = [];
                const {mkdir} = factory.require('mkdir');
                const paths = await mkdir(to, files, mkdirp);

                for (let i = files.length; i--;) {
                    p.push(this.upload(files[i], paths[files[i].path] || to, xh));
                }
                return [xh, Promise.allSettled(p).then((a) => a.map((e) => e.reason || e.value))];
            }
            if (isNode) {
                if (!xRLock[to]) {
                    xRLock[to] = mega.promise;
                    xRLock[to].nodes = [];

                    onIdle(() => {
                        const {nodes, resolve, reject} = xRLock[to];

                        xRLock[to] = null;
                        sendAPIRequest({a: 'xp', t: to, n: nodes}).then(resolve).catch(reject);
                    });
                }
                xRLock[to].nodes.push({
                    t: 0,
                    h: file.h,
                    k: a32_to_base64(file.k),
                    a: file.a || ab_to_base64(crypto_makeattr(file))
                });
                return xRLock[to];
            }
            assert(isBlob);
            const {promise} = mega;

            file.xput = xh;
            file.id = ++uid;
            file.target = to;
            // file.ulSilent = -1;
            file.promiseToInvoke = promise;

            ul_queue.push(file);
            assert(ul_queue.length > 0);
            ulmanager.isUploading = true;

            return promise;
        },

        async setTransferAttributes(xh, {t, title, m, message, pw, password, e, expiry, se, sender, en, mc}) {

            t = cast(title || t, 't');
            e = cast(expiry || e, 'e');
            m = cast(message || m, 'm');
            se = cast(sender || se, 'se');

            if ((pw = cast(password || pw, 'pw'))) {

                pw = await createPassword(xh, pw);
            }
            if ((en = cast(e > 0 && en))) {

                en = en > 1 ? en : 3 * 864e3;
            }
            mc = cast(mc, 'mc');

            return sendAPIRequest({a: 'xm', xh, t, e, m, pw, se, en, mc});
        },

        async setTransferRecipients(xh, {e, email, s, schedule, ex, execution}, rh) {

            s = Number(schedule || s || 0);
            ex = Number(execution || ex) || undefined;
            e = String(email || e || '').trim() || undefined;

            return sendAPIRequest({a: 'xr', xh, rh, ex, e, s});
        },

        async setMultiTransferRecipients(xh, bulk) {
            return Promise.all(bulk.map((o) => this.setTransferRecipients(xh, o)));
        },

        async getTransferRecipients(xh) {
            const n = M.getNodeByHandle(xh);

            return sendAPIRequest({a: 'xrf', xh})
                .then((result) => {
                    if (n) {
                        n.xrf = result;
                    }
                    for (let i = result.length; i--;) {
                        const {rh, e} = result[i];

                        M.u[rh] =
                            M.u[e] = {...result[i], email: e, m: e, u: rh};
                    }
                    return result;
                });
        },

        async setPersistentValue(k, v) {
            const store = decode(storage.sit);
            storage.sit = encode({...store, [k]: v});
        },

        async getPersistentValue(k) {
            return decode(storage.sit)[k];
        },

        async setExpiryValue(k, v = 1) {
            const store = await this.getPersistentValue('ev');
            return this.setPersistentValue('ev', {...store, [k]: [v, getTime()]});
        },
        async getExpiryValue(k, e = 864e5) {
            let res = false;
            const now = Date.now();
            const store = await this.getPersistentValue('ev') || {};

            for (const j in store) {
                const [v, time] = store[j];

                if (now - getTime(time) > e) {
                    delete store[j];
                }
                else if (j === k) {
                    res = v;
                }
            }
            this.setPersistentValue('ev', store).catch(dump);
            return res;
        },

        transfer() {
            const target = freeze({
                'https://mega.nz': 'https://transfer.it',
                'https://transfer.it': 'https://mega.nz'
            })[location.origin];

            if (target) {
                let q = '';
                if (self.u_sid) {
                    q = tryCatch(() => `#sitetransfer!${btoa(JSON.stringify([self.u_k, self.u_sid]))}`)() || q;
                }
                window.open(target + q, '_blank', 'noopener,noreferrer');
            }
        },

        async test(i = 20) {
            const {rnd, name} = this;
            const [h, xh, p = []] = await this.create(name.slice(-4));

            self.d = 2;
            while (i--) {
                const wdh = 320 + (rnd[i] & 0x3ff);
                p.push(
                    webgl.createImage('pattern', wdh, wdh / 1.777 | 0)
                        .then((b) => this.upload(new File([b], `${this.name}.${b.type.split('/').pop()}`, b), h, xh))
                );
            }
            await Promise.allSettled(p);

            return this.list(1);
        },

        get name() {
            return String.fromCodePoint.apply(null, [...this.rnd].filter(c => c >> 8 === 40).slice(-9));
        },

        get rnd() {
            return crypto.getRandomValues(new Uint16Array(0x7fff));
        }
    });
});
