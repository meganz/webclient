lazy(mega, 'sets', () => {
    'use strict';

    /**
     * This value is for caching isUsingLocalDB's result
     * @type {Boolean}
     */
    let isDBAvailable = false;

    /**
     * Storing all handlers from all subscribed sections
     * To use it in other places, subscribe as per example:
     * const unsubscribe = `mega.sets.subscribe('asp', () => {})`
     */
    const subscribers = {
        asp: {},
        asr: {},
        aep: {},
        aer: {}
    };

    /**
     * @type {Object[]}
     */
    let dbQueue = [];

    const allowedAttrKeys = {
        n: true,
        c: true
    };

    const local = {
        tmpAesp: {
            isCached: false,
            s: Object.create(null)
        }
    };

    lazy(local, 'db', () => new MegaDexie('AESP', 'aesp', '', true, { s: '&id, cts, ts, u' }));

    /**
     * Runs the DB tasks in the transaction ensuring the consistency
     * @param {String} command Command to call (a - add, ba - bulkAdd, u - update, d - delete)
     * @param {String} id Document id to reference
     * @param {Object} data Data to add/update
     * @returns {void}
     */
    const queueDbTask = (command, id, data) => {
        if (!isDBAvailable) {
            return;
        }

        dbQueue.push({ command, id, data });

        delay(`sets:db_queue`, () => {
            if (!dbQueue.length) {
                return;
            }

            const { db: { s } } = local;
            const commands = dbQueue;
            dbQueue = [];

            const bulks = {
                a: [], // Array of additions
                d: [], // Array of removals
                u: {} // Changes per set
            };

            for (let i = 0; i < commands.length; i++) {
                const { command, id, data } = commands[i];

                switch (command) {
                    case 'a': bulks.a.push(data); break;
                    case 'ba': bulks.a.push(...data); break;
                    case 'u': bulks.u[id] = (bulks.u[id]) ? { ...bulks.u[id], ...data } : data ; break;
                    case 'd': bulks.d.push(id); break;
                    default: break;
                }
            }

            if (bulks.a.length) {
                s.bulkPut(bulks.a).catch(dump);
            }

            const keys = Object.keys(bulks.u);

            if (keys.length) {
                for (let i = 0; i < keys.length; i++) {
                    s.update(keys[i], bulks.u[keys[i]]).catch(dump);
                }
            }

            if (bulks.d.length) {
                s.bulkDelete(bulks.d).catch(dump);
            }
        }, 500);
    };

    let isDBChecking = new Promise((resolve) => {
        local.db.s.limit(1).toArray()
            .then(() => {
                isDBAvailable = true;
                resolve();
            })
            .catch(() => {
                isDBAvailable = false;
                resolve();
            })
            .finally(() => {
                isDBChecking = null;
                resolve();
            });
    });

    /**
     * Grouping the array by the unique id
     * @param {Object[]} array Array to convert
     * @returns {Object.<String, Object.<String, any>>}
     */
    const groupById = array => array.reduce(
        (obj, v) => Object.assign(obj, { [v.id]: v }),
        {}
    );

    /**
     * Triggers all predefined callbacks
     * @param {String} key Key of the subscribers array
     * @param {any} payload Data to pass as arguments
     * @returns {void}
     */
    const runSubscribedMethods = (key, payload) => {
        if (subscribers[key]) {
            const callbacks = Object.values(subscribers[key]);

            if (callbacks.length) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i](payload);
                }
            }
        }
    };

    /**
     * @param {Object.<String, any>} attrData Set attribute data to encrypt
     * @param {String} [key] The already generated key in Base64 format, used when re-encryption is needed
     * @returns {Object.<String, String>}
     */
    const encryptSetAttr = (attrData, key = undefined) => {
        const keyArr = (typeof key === 'string')
            ? decrypt_key(u_k_aes, base64_to_a32(key))
            : [...crypto.getRandomValues(new Uint32Array(4))];

        return {
            at: tlvstore.encrypt(attrData, true, keyArr),
            k: key || a32_to_base64(encrypt_key(u_k_aes, keyArr))
        };
    };

    /**
     * Decrypting the User's private set attribute
     * @param {String} attr Encrypted set's attribute
     * @param {String} key Decryption key
     * @returns {Object.<String, any>}
     */
    const decryptSetAttr = (attr, key) => tlvstore.decrypt(attr, true, decrypt_key(u_k_aes, base64_to_a32(key)));

    /**
     * Getting all sets from the database and storing them into the memory for the future use
     * @returns {Object[]}
     */
    const buildTmp = async() => {
        const { tmpAesp, db } = local;

        if (tmpAesp.isCached) {
            return tmpAesp.s;
        }

        if (isDBChecking) {
            await isDBChecking;
        }

        if (isDBAvailable) {
            tmpAesp.s = groupById(await db.s.toArray());
            tmpAesp.isCached = true;
        }

        return tmpAesp.s;
    };

    /**
     * Send a specific Set or Element command to API
     * @param {String} a Action to send to API
     * @param {Object<String, String|Number>} options options to pass with the action
     * @returns {function(...[*]): Promise<void>}
     */
    const sendReq = (a, options) => api.req({a, ...options}).then(({result}) => result);

    return {
        decryptSetAttr,
        buildTmp,
        getElementsByIds: () => {
            return [];
        },
        /**
         * Getting the list of elements for the specific set
         * @param {String} id Set id to get the tree for
         * @returns {function(...[*]): Promise<void>}
         */
        getTree: id => sendReq('aft', { id }),
        /**
         * @param {String} name Set name to add
         * @param {Number} [ts] Indicates when the album was created
         * @returns {function(...[*]): Promise<void>}
         */
        add: (name, ts) => sendReq('asp', encryptSetAttr({ n: name || '', t: (ts || Date.now()).toString() })),
        /**
         * @param {String} set Set to update
         * @param {String} key Key for the set attribute
         * @param {String|Number} value Value for the set attribute
         * @returns {function(...[*]): Promise<void>}
         */
        updateAttrValue: ({ at, k, id }, key, value) => {
            if (!allowedAttrKeys[key]) {
                console.warn('Trying to edit the non-existent key...');
                return;
            }

            at[key] = value;

            return sendReq('asp', { id, at: encryptSetAttr(at, k).at });
        },
        /**
         * @param {String} setId Set id to remove
         * @returns {void}
         */
        remove: setId => sendReq('asr', { id: setId }),
        /**
         * Clearing the existing local aesp database and applying the new data
         * @param {Object.<String, Object[]>} aesp New aesp data from the API
         * @returns {void}
         */
        resetDB: async({ s, e }) => {
            const { tmpAesp, db } = local;

            tmpAesp.s = Object.create(null);

            if (s) {
                for (let i = 0; i < s.length; i++) {
                    const set = Object.assign({}, s[i]);
                    set.e = {};
                    tmpAesp.s[set.id] = set;
                }

                tmpAesp.isCached = true;
            }

            if (e) {
                for (let i = 0; i < e.length; i++) {
                    const el = e[i];

                    if (tmpAesp.s[el.s]) {
                        tmpAesp.s[el.s].e[el.id] = el;
                    }
                }
            }

            if (isDBChecking) {
                await isDBChecking;
            }

            if (isDBAvailable) {
                await db.s.clear();
                queueDbTask('ba', '', Object.values(tmpAesp.s));
            }
        },
        subscribe: (key, id, handler) => {
            if (!subscribers[key][id]) {
                subscribers[key][id] = handler;
            }

            return () => {
                delete subscribers[key][id];
            };
        },
        parseAsp: async(payload) => {
            delete payload.a;

            const { tmpAesp } = local;
            const { id, at, ts } = payload;
            const isExisting = tmpAesp.s[id];
            const e = (tmpAesp.s[id] || {}).e || {};
            payload.e = e;

            tmpAesp.s[id] = payload;

            runSubscribedMethods('asp', payload);

            if (isExisting) { // The album is already stored, hence needs an update only
                queueDbTask('u', id, { at, ts });
            }
            else {
                queueDbTask('a', id, payload);
            }
        },
        parseAsr: async(payload) => {
            const { tmpAesp: { s } } = local;
            const { id } = payload;

            if (s[id]) {
                delete s[id];
            }

            runSubscribedMethods('asr', payload);
            queueDbTask('d', id);
        },
        parseAep: async(payload) => {
            const { tmpAesp: { s } } = local;
            const { id, s: setId } = payload;
            delete payload.a;

            if (s[setId]) {
                s[setId].e[id] = payload;
            }

            runSubscribedMethods('aep', payload);
            queueDbTask('u', setId, { [`e.${id}`]: payload });
        },
        parseAer: async(payload) => {
            const { tmpAesp: { s } } = local;
            const { id, s: setId } = payload;

            if (s[setId] && s[setId].e[id]) {
                delete s[setId].e[id];
            }

            runSubscribedMethods('aer', payload);
            queueDbTask('u', setId, { [`e.${id}`]: undefined });
        },
        elements: {
            /**
             * @param {String} h Node handle to assosiate with the set
             * @param {String} setId Set id to add the element to
             * @param {String} setKey Set key to use for encryption
             * @returns {function(...[*]): Promise<void>}
             */
            add: (h, setId, setKey) => {
                const n = M.d[h];

                if (!n) {
                    throw new Error('Cannot find the node to add to the set...');
                }

                return sendReq('aep', {
                    h,
                    s: setId,
                    k: ab_to_base64(
                        asmCrypto.AES_CBC.encrypt(
                            a32_to_ab(n.k),
                            a32_to_ab(decrypt_key(u_k_aes, base64_to_a32(setKey))),
                            false
                        )
                    )
                });
            },
            /**
             * @param {String[]} handles Node handles to assosiate with the set
             * @param {String} setId Set id to add elements to
             * @param {String} setKey Set key (encrypted) to use for element key encryption
             * @returns {function(...[*]): Promise<void>}
             */
            bulkAdd: async(handles, setId, setKey) => {
                const setPubKey = a32_to_ab(decrypt_key(u_k_aes, base64_to_a32(setKey)));
                const e = [];
                const savingEls = {};

                for (let i = 0; i < handles.length; i++) {
                    const { h, o } = handles[i];
                    const n = M.d[h];

                    if (!n) {
                        dump(`Node ${h} cannot be added to the set...`);
                        continue;
                    }

                    const el = {
                        h,
                        o,
                        k: ab_to_base64(
                            asmCrypto.AES_CBC.encrypt(
                                a32_to_ab(n.k),
                                setPubKey,
                                false
                            )
                        )
                    };

                    savingEls[o] = el;
                    e.push(el);
                }

                const res = await sendReq('aepb', { s: setId, e });

                for (let i = 0; i < res.length; i++) {
                    if (!res[i] || !res[i].id) {
                        continue;
                    }

                    const { id, o } = res[i];

                    if (savingEls[o]) {
                        savingEls[o].id = id;
                    }
                }

                return Object.values(savingEls);
            },
            /**
             * @param {String} id Element id to remove
             * @param {String} s Set id to remove from
             * @returns {function(...[*]): Promise<void>}
             */
            remove: (id, s) => sendReq('aer', { id, s }),
            /**
             * @param {String[]} ids Element ids to remove
             * @param {String} s Set id to remove from
             * @returns {function(...[*]): Promise<void>}
             */
            bulkRemove: (ids, s) => sendReq(
                'aerb',
                {
                    e: ids,
                    s
                }
            )
        }
    };
});
