/** @property mega.sets */
lazy(mega, 'sets', () => {
    'use strict';

    /**
     * Storing all handlers from all subscribed sections
     * @type {Object.<String, Object.<String, Function>>}
     */
    const subscribers = {
        asp: {},
        asr: {},
        aep: {},
        aer: {},
        ass: {}
    };
    const allowedAttrKeys = freeze({
        n: true,
        c: true
    });
    const decrypt = tryCatch((a, k) => tlvstore.decrypt(a, true, decrypt_key(u_k_aes, k)));

    const emplaceSet = (d, ignoreDB) => {
        if (typeof d.k === 'string') {
            d.k = base64_to_a32(d.k);

            if (d.at) {
                const o = decrypt(d.at, d.k) || !1;

                if (o.n) {
                    d.name = o.n;
                    delete o.n;
                }
                if (o.c) {
                    d.cover = o.c;
                    delete o.c;
                }

                delete d.at;
                Object.assign(d, o);
            }
        }

        if (self.fmdb && !ignoreDB) {
            fmdb.add('sets', {id: d.id, ts: d.ts, t: d.t, d});
        }

        if (M.sets[d.id]) {
            d.e = M.sets[d.id].e;
            d.ph = M.sets[d.id].ph;
        }
        else {
            d.e = new Map();
        }

        M.sets[d.id] = d;
    };

    const emplaceElement = (d, ignoreDB) => {
        if (typeof d.k === 'string') {
            d.k = base64_to_a32(d.k);

            if (d.at) {
                // tbd - unused..
            }
        }

        if (M.sets[d.s]) {
            M.sets[d.s].e.set(d.id, d);
        }

        if (self.fmdb && !ignoreDB) {
            fmdb.add('sete', {id: d.id, ts: d.ts, s: d.s, h: d.h, d});
        }
    };

    const emplacePH = (d, ignoreDB) => {
        if (M.sets[d.s]) {
            M.sets[d.s].ph = d.ph;
        }
        if (self.fmdb && !ignoreDB) {
            fmdb.add('setp', d);
        }
    };

    const removePH = (d) => {
        if (M.sets[d.s]) {
            delete M.sets[d.s].ph;
        }
        if (self.fmdb) {
            fmdb.del('setp', d.ph);
        }
    };

    const removeElement = (d) => {
        if (M.sets[d.s]) {
            M.sets[d.s].e.delete(d.id);
        }
        if (self.fmdb) {
            fmdb.del('sete', d.id);
        }
    };

    const removeSet = (d) => {
        if (M.sets[d.id]) {
            for (const [, v] of M.sets[d.id].e) {
                removeElement(v);
            }
            delete M.sets[d.id];
        }
        if (self.fmdb) {
            fmdb.del('sets', d.id);
        }
    };

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
        const keyArr = key
            ? decrypt_key(u_k_aes, typeof key === 'string' ? base64_to_a32(key) : key)
            : [...crypto.getRandomValues(new Uint32Array(4))];

        return {
            at: tlvstore.encrypt(attrData, true, keyArr),
            k: key || a32_to_base64(encrypt_key(u_k_aes, keyArr))
        };
    };

    /**
     * Wiping the cached values to re-render, in case something has been changed
     * @returns {void}
     */
    const renderCleanup = () => {
        if (is_mobile || M.albums) {
            return;
        }

        mega.gallery.albumsRendered = false;
        MegaGallery.dbactionPassed = false;
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
     * @returns {function(...[*]): Promise<void>}
     */
    const add = async(name) => {
        const data = encryptSetAttr({ n: name || '' });
        const res = await sendScReq('asp', data);

        res.k = data.k;
        res.at = data.at;

        return res;
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
        add: async(h, setId, setKey) => {
            const n = M.d[h] || (await dbfetch.node([h]).catch(nop) || [])[0];

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
         * @param {String} setKey Set pub key
         * @returns {function(...[*]): Promise<void>}
         */
        bulkAdd: async(handles, setId, setKey) => {
            setKey = typeof setKey === 'string' ? base64_to_a32(setKey) : setKey;
            const setPrKey = a32_to_ab(decrypt_key(u_k_aes, setKey));
            const e = [];
            const savingEls = Object.create(null);
            let nodes = Object.create(null);

            const toSearch = handles.filter(h => !M.d[h]);

            if (toSearch.length) {
                nodes = (await dbfetch.node(handles.map(({ h }) => h)).catch(nop) || []).reduce((accum, n) => {
                    accum[n.h] = n;
                    return accum;
                }, nodes);
            }

            for (let i = 0; i < handles.length; i++) {
                const { h, o } = handles[i];
                const n = M.d[h] || nodes[h];

                if (!n || n.t) {
                    dump(`Node ${h} cannot be added to the set...`);
                    continue;
                }

                const el = {
                    h,
                    o,
                    k: ab_to_base64(
                        asmCrypto.AES_CBC.encrypt(
                            a32_to_ab(n.k),
                            setPrKey,
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

        const handlesToAdd = [];

        for (let i = 0; i < handles.length; i++) {
            handlesToAdd.push({ h: handles[i], o: (i + 1) * 1000});
        }

        // No need in tmp value, can be removed now
        if ($.albumImport) {
            delete mega.gallery.albums.store[$.albumImport.id];
            delete $.albumImport;
        }

        const {id, k} = await add(albumName);
        await elements.bulkAdd(handlesToAdd, id, k);

        loadingDialog.hide('SetImport');

        toaster.main.show({
            icons: ['sprite-fm-mono icon-check-circle text-color-medium'],
            content: l.album_added.replace('%s', albumName)
        });

        return M.openFolder('albums', true);
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
     * @returns {Promise}
     */
    const copyNodesAndSet = async(selectedNodes, targetHandle) => {
        // Temporarily adding the importing album data to the albums list
        if (!mega.gallery.albums[$.albumImport.id]) {
            mega.gallery.albums.store[$.albumImport.id] = $.albumImport;
        }

        const tree = $.onImportCopyNodes;
        const [albumNode] = tree;
        const node = crypto_decryptnode({...albumNode});
        let {name} = node;

        onIdle(() => eventlog(99969));

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

        loadingDialog.show('SetImport');

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

    return freeze({
        getPublicSetTree,
        decryptSetAttr,
        decryptPublicSetAttr,
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
         * @param {String} data Set data to update
         * @param {String} key Key for the set attribute
         * @param {String|Number} value Value for the set attribute
         * @returns {function(...[*]): Promise<void>}
         */
        updateAttrValue: ({ k, id }, key, value) => {
            if (!allowedAttrKeys[key]) {
                console.warn('Trying to edit the non-existent key...');
                return;
            }

            const set = M.sets[id];

            if (!set) {
                console.warn('Trying to edit the non-existent set...');
                return;
            }

            const at = {};

            if (set.name) {
                at.n = set.name;
            }

            if (set.cover) {
                at.c = set.cover;
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
         * Load Sets from either API or DB
         * @param {Array|Object} data origin
         * @param {Boolean} [ignoreDB] optional
         * @returns {Promise<*>}
         */
        async loadSets(data, ignoreDB) {
            if (Array.isArray(data)) {
                // loading out of indexedDB
                console.assert(ignoreDB);
                // @todo only retrieve elements when actually needed..
                const [{value: e}, {value: p}] = await Promise.allSettled([fmdb.get('sete'), fmdb.get('setp')]);
                data = {s: data, e, p};
            }
            const {s, e, p} = data;

            if (s && s.length) {

                for (let i = s.length; i--;) {
                    emplaceSet(s[i], ignoreDB);
                }

                for (let i = e && e.length; i--;) {
                    emplaceElement(e[i], ignoreDB);
                }

                for (let i = p && p.length; i--;) {
                    emplacePH(p[i], ignoreDB);
                }
            }
        },
        /**
         * Usage example: const unsubscribe = `mega.sets.subscribe('asp', 'album_added', () => { ... })`
         * @param {String} ap Action packet name to subscribe to
         * @param {String} id Unique identifier of the subscriber
         * @param {Function} fn Action to perform when the action packet is received
         * @returns {Function} Returns an unsubscribe method to remove the handler
         */
        subscribe: (ap, id, fn) => {
            if (!subscribers[ap][id]) {
                subscribers[ap][id] = fn;
            }

            return () => {
                delete subscribers[ap][id];
            };
        },
        /**
         * parse action packet (mega.js)
         * @param {Object} ap action-packet
         * @returns {void}
         */
        parseActionPacket(ap) {
            const { a, r } = ap;

            delete ap.a;
            delete ap.i;
            delete ap.st;
            delete ap.usn;

            switch (a) {
                case 'asp':
                    emplaceSet(ap);
                    break;
                case 'asr':
                    removeSet(ap);
                    break;
                case 'aep':
                    emplaceElement(ap);
                    break;
                case 'aer':
                    removeElement(ap);
                    break;
                case 'ass':
                    if (r) {
                        removePH(ap);
                    }
                    else {
                        emplacePH(ap);
                    }
                    break;
            }

            renderCleanup();
            runSubscribedMethods(a, ap);
        }
    });
});
