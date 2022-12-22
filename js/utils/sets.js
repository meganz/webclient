lazy(mega, 'sets', () => {
    'use strict';

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

    const allowedAttrKeys = {
        n: true
    };

    const local = {
        tmpAesp: { // This one is used when the DB is not available
            s: [],
            e: []
        }
    };

    lazy(local, 'db', () => new MegaDexie('AESP', 'aesp', '', true, {
        'e': '++id, at, ts, k',
        's': '++id, e, ts, k, s, h'
    }));

    const isUsingLocalDB = () => !!(local.db && local.db.idbdb);

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
     * @param {Object.<String, any>} attrData Attribute data to encrypt
     * @param {String} [key] - The already generated key in Base64 format, used when re-encryption is needed
     * @returns {Object.<String, String>}
     */
    const encryptAttr = (attrData, key) => {
        const keyArr = (typeof key === 'string')
            ? decrypt_key(u_k_aes, base64_to_a32(key))
            : [rand(0x100000000), rand(0x100000000), rand(0x100000000), rand(0x100000000)];

        return {
            at: tlvstore.encrypt(attrData, true, keyArr),
            k: key || a32_to_base64(encrypt_key(u_k_aes, keyArr))
        };
    };

    /**
     * @param {String} attr Encrypted set's attribute
     * @param {String} key Decryption key
     * @returns {Object.<String, any>}
     */
    const decryptAttr = (attr, key) => tlvstore.decrypt(attr, true, decrypt_key(u_k_aes, base64_to_a32(key)));

    /**
     * Send a specific Set or Element command to API
     * @param {String} a Action to send to API
     * @param {Object<String, String|Number>} options options to pass with the action
     * @returns {function(...[*]): Promise<void>}
     */
    const sendReq = (a, options) => M.req({ a, ...options });

    return {
        local,
        decryptAttr,
        /**
         * Getting all sets from the database
         * @returns {Object[]}
         */
        getAll: async() => {
            const { s, e } = (isUsingLocalDB())
                ? { s: await local.db.s.toArray(), e: await local.db.e.toArray() }
                : local.tmpAesp;

            const setsObj = {};

            if (Array.isArray(s) && s.length) {
                for (let i = 0; i < s.length; i++) {
                    setsObj[s[i].id] = { ...s[i], e: [] };
                }
            }

            if (Array.isArray(e) && e.length) {
                for (let i = 0; i < e.length; i++) {
                    if (setsObj[e[i].s]) {
                        setsObj[e[i].s].e.push(e[i]);
                    }
                }
            }

            return Object.values(setsObj);
        },
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
        add: (name, ts) => sendReq('asp', encryptAttr({ n: name || '', t: (ts || Date.now()).toString() })),
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

            return sendReq('asp', { id, at: encryptAttr(at, k).at });
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
        resetDB: (aesp) => {
            const isDbAvailable = isUsingLocalDB();
            const tables = ['s', 'e'];

            if (isDbAvailable) {
                for (let i = 0; i < tables.length; i++) {
                    const t = tables[i];

                    local.db[t].clear();
                    local.db[t].bulkAdd(aesp[t]);
                }
            }
            else {
                for (let i = 0; i < tables.length; i++) {
                    const t = tables[i];

                    local.tmpAesp[t] = aesp[t];
                }
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
        parseAsp: (payload) => {
            delete payload.a;

            if (isUsingLocalDB()) {
                local.db.put('s', payload).then(() => {
                    runSubscribedMethods('asp', payload);
                });
            }
            else {
                runSubscribedMethods('asp', payload);
            }
        },
        parseAsr: (payload) => {
            if (isUsingLocalDB()) {
                local.db.s.delete(payload.id).then(() => {
                    runSubscribedMethods('asr', payload);
                });
            }
            else {
                runSubscribedMethods('asr', payload);
            }
        },
        parseAep: (payload) => {
            delete payload.a;

            if (isUsingLocalDB()) {
                local.db.put('e', payload).then(() => {
                    runSubscribedMethods('aep', payload);
                });
            }
            else {
                runSubscribedMethods('aep', payload);
            }
        },
        parseAer: (payload) => {
            if (isUsingLocalDB()) {
                local.db.e.delete(payload.id).then(() => {
                    runSubscribedMethods('aer', payload);
                });
            }
            else {
                runSubscribedMethods('aer', payload);
            }
        },
        elements: {
            /**
             * @param {String} h Node id to assosiate with an element
             * @param {String} s Set id to add an element to
             * @returns {function(...[*]): Promise<void>}
             */
            add: (h, s) => sendReq('aep', { h, s, k: encryptAttr('').k }),
            /**
             * @param {String} id Element id to remove
             * @param {String} s Set id to remove
             * @returns {function(...[*]): Promise<void>}
             */
            remove: (id, s) => sendReq('aer', { id, s })
        }
    };
});
