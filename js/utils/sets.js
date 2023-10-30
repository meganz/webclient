/** @property mega.sets */
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
        aer: {},
        ass: {}
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

    const setDb = () => {
        lazy(local, 'db', () => new MegaDexie('AESP', 'aesp', '', true, { s: '&id, cts, ts, u' }));
    };

    setDb();

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
     * Send a specific Set or Element command to API (V3)
     * @param {String} a Action to send to API
     * @param {Object<String, String|Number>} options options to pass with the action
     * @returns {function(...[*]): Promise<void>}
     */
    const sendScReq = (a, options) => api.screq({ a, ...options }).then(({ result }) => result);

    /**
     * Send a specific Set or Element command to API (V2)
     * @param {String} a Action to send to API
     * @param {Object<String, String|Number>} options options to pass with the action
     * @returns {function(...[*]): Promise<void>}
     */
    const sendReq = (a, options) => api.req({ a, ...options }).then(({ result }) => result);

    /**
     * @param {String} name Set name to add
     * @param {Number} [ts] Indicates when the album was created
     * @returns {function(...[*]): Promise<void>}
     */
    const add = async(name, ts) => {
        const data = encryptSetAttr({ n: name || '', t: (ts || Date.now()).toString() });
        const res = await sendScReq('asp', data);

        res.k = data.k;
        res.at = data.at;

        return res;
    };

    /**
     * @param {String} id Set id to retrieve
     * @returns {Promise}
     */
    const getSetById = (id) => {
        return local.db.s.get(id);
    };

    /**
     * Decrypting the User's private set attribute
     * @param {String} attr Encrypted set's attribute
     * @param {String} key Decryption key
     * @returns {Object.<String, any>}
     */
    const decryptSetAttr = (attr, key) => tlvstore.decrypt(attr, true, decrypt_key(u_k_aes, base64_to_a32(key)));

    /**
     * Decrypting the public set attribute
     * @param {String} attr Encrypted set's attribute
     * @param {String} key Public key
     * @returns {Object.<String, any>}
     */
    const decryptPublicSetAttr = (attr, key) => tlvstore.decrypt(attr, true, base64_to_a32(key));

    const elements = {
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

            return sendScReq('aep', {
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
         * @param {String} setKey Set key to use for encryption
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

                if (!savingEls[o]) {
                    savingEls[o] = el;
                    e.push(el);
                }
            }

            const res = await sendScReq('aepb', { s: setId, e });

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
        bulkRemove: (ids, s) => sendReq('aerb', { e: ids, s })
    };

    const copySetFromHandles = async(handles, albumName) => {
        if (!Array.isArray(handles) || !handles.length) {
            dump('Cannot create the set on empty nodes...');
            return;
        }
        loadingDialog.show('SetImport');

        await buildTmp();

        const handlesToAdd = [];

        for (let i = 0; i < handles.length; i++) {
            const node = M.d[handles[i]];

            if (!node) {
                dump(`Cannot find node ${handles[i]} to be imported into set...`);
            }
            else if (!node.t) {
                handlesToAdd.push({ h: handles[i], o: (i + 1) * 1000});
            }
        }

        const payload = await add(albumName);
        const { id, k } = payload;
        const elArr = await elements.bulkAdd(handlesToAdd, id, k);

        payload.e = {};

        for (let i = 0; i < elArr.length; i++) {
            const e = elArr[i];
            e.s = id;

            payload.e[e.id] = e;
        }

        local.tmpAesp.s[id] = payload;

        if (isDBAvailable) {
            local.db.s.put(payload);
        }

        loadingDialog.hide('SetImport');

        toaster.main.show({
            icons: ['sprite-fm-mono icon-check-circle text-color-medium'],
            content: l.album_added.replace('%s', albumName)
        });

        return M.openFolder('albums');
    };

    /**
     * Checking files and folders for duplicated names and returns either
     * the same name if unique or hitting the length limit
     * or a unique name with (1) suffix
     * @param {String} name Name to check
     * @param {String} target The handle of the enclosing folder to work with
     * @returns {String}
     */
    const getUniqueFolderName = (name, target) => {
        target = target || M.RootID;

        name = M.getSafeName(name);
        if (fileconflict.getNodeByName(target, name)) {
            name = fileconflict.findNewName(name, target);
        }

        return name;
    };

    /**
     * Processing $.onImportCopyNodes in a Folder link way but for a new set
     * @param {String[]} selectedNodes File or Folder handles to import
     * @param {String} targetHandle The handle of the target folder
     * @returns {void}
     */
    const copyNodesAndSet = async(selectedNodes, targetHandle) => {
        // Clearing out the database connection established in the previous session
        mega.sets.reopenDb();

        const tree = $.onImportCopyNodes;
        const [albumNode] = tree;
        const node = crypto_decryptnode({...albumNode});
        let {name} = node;

        if (name) {
            name = await mega.gallery.albums.getUniqueSetName(node);

            // The user discarded a new name
            if (name === null) {
                return;
            }
            const newName = getUniqueFolderName(name, targetHandle);

            if (node.name !== newName) {
                node.name = newName;
                albumNode.a = ab_to_base64(crypto_makeattr(node));
            }
        }

        if (albumNode.t > 1) {
            // Mimicking its type to be created as a folder
            albumNode.t = 1;
        }

        const handles = await M.copyNodes(selectedNodes, targetHandle, false, tree);

        return copySetFromHandles(handles, name);
    };

    /**
     * Mimicking the response from the API to get-tree (f) call
     * @param {Object.<String, String|Number>} s Set data to convert to folder data
     * @param {Object.<String, String|Number>[]} e Set elements
     * @param {Object.<String, String|Number>[]} n Encrypted nodes associated with the elements
     * @param {*} sn Sequence number to use for the integrity of the folder link procedure
     * @returns {Object.<String, MegaNode[]|String>}
     */
    const getPublicSetTree = (s, e, n, sn) => {
        assert(s && s.id, 'The set is either broken or not found...');

        // pretend to be a normal root node.
        s.t = 2;
        s.h = pfid;
        s.k = pfkey;
        M.addNode(s);
        crypto_setsharekey2(M.RootID, base64_to_a32(pfkey));
        s.name = tlvstore.decrypt(s.at, true, u_sharekeys[M.RootID][0]).n;

        // fake get-tree (f) response.
        const res = { f: [], sn };

        if (Array.isArray(e) && e.length) {
            const psKeyAb = base64_to_ab(pfkey);

            const decrNodeKey = tryCatch(
                k => base64_to_a32(ab_to_base64(asmCrypto.AES_CBC.decrypt(base64_to_ab(k), psKeyAb, false)))
            );

            const tmpE = [];
            const tmpN = {};

            for (let i = 0; i < n.length; i++) {
                tmpN[n[i].h] = n[i];
            }

            for (let i = 0; i < e.length; i++) {
                const { h, k } = e[i];
                const node = tmpN[h];

                if (!node) {
                    console.warn(`The Album element ${h} is not available anymore...`);
                    continue;
                }

                const nodeKey = decrNodeKey(k);

                tmpE.push(e[i]);
                node.t = 0;
                node.k = nodeKey;
                node.a = node.at;
                node.p = M.RootID;
                M.addNode(node);

                res.f.push(node);
            }

            s.e = tmpE;
        }

        return res;
    };

    return {
        getPublicSetTree,
        decryptSetAttr,
        decryptPublicSetAttr,
        buildTmp,
        getSetById,
        copyNodesAndSet,
        add,
        elements,
        /**
         * Sending the request to add share to an album
         * @param {String} id Set id to share
         * @returns {function(...[*]): Promise<void>}
         */
        addShare: (id) => sendScReq('ass', { id }),
        /**
         * Sending the request to remove share from an album
         * @param {String} id Set id to drop the share for
         * @returns {function(...[*]): Promise<void>}
         */
        removeShare: (id) => sendScReq('ass', { id, d: 1 }),
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

            return sendScReq('asp', { id, at: encryptSetAttr(at, k).at });
        },
        /**
         * @param {String} setId Set id to remove
         * @returns {void}
         */
        remove: setId => sendScReq('asr', { id: setId }),
        /**
         * Clearing the existing local aesp database and applying the new data
         * @param {Object.<String, Object[]>} aesp New aesp data from the API
         * @returns {void}
         */
        resetDB: async({ s, e, p }) => {
            const { tmpAesp, db } = local;

            tmpAesp.s = Object.create(null);

            // Array of sets received
            if (s) {
                for (let i = 0; i < s.length; i++) {
                    const set = Object.assign({}, s[i]);
                    set.e = {};
                    tmpAesp.s[set.id] = set;
                }

                tmpAesp.isCached = true;
            }

            // Array of elements received
            if (e) {
                for (let i = 0; i < e.length; i++) {
                    const el = e[i];

                    if (tmpAesp.s[el.s]) {
                        tmpAesp.s[el.s].e[el.id] = el;
                    }
                }
            }

            // Array of shares received
            if (p) {
                for (let i = 0; i < p.length; i++) {
                    const { ph, ts, s: setId } = p[i];

                    if (tmpAesp.s[setId]) {
                        tmpAesp.s[setId].p = { ph, ts };
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
        reopenDb: () => {
            if (local.db && local.db._state.openComplete) {
                local.db.close();
            }

            setDb();
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
            const e = (isExisting) ? tmpAesp.s[id].e : {};
            const p = (isExisting) ? tmpAesp.s[id].p : undefined;

            payload.e = e;
            payload.p = p;

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
        parseAss: async(payload) => {
            const { tmpAesp: { s } } = local;
            const { ph, ts, r, s: setId } = payload;
            const changes = (r === 1) ? undefined : { ph, ts };


            if (s[setId]) {
                s[setId].p = changes;
            }

            runSubscribedMethods('ass', payload);
            queueDbTask('u', setId, { p: changes });
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
        }
    };
});
