(function __fmconfig_handler() {
    "use strict";

    let timer;
    const ns = Object.create(null);
    const privy = Object.create(null);
    const oHasOwn = {}.hasOwnProperty;
    const hasOwn = (o, p) => oHasOwn.call(o, p);
    const oLen = (o) => Object.keys(o || {}).length;
    const parse = tryCatch(v => JSON.parse(v), false);
    const stringify = tryCatch(v => JSON.stringify(v));
    const logger = MegaLogger.getLogger('fmconfig');
    const MMH_SEED = 0x7fee1ef;

    /** @property privy.ht */
    lazy(privy, 'ht', () => {
        return MurmurHash3('ht!' + u_handle + base64urldecode(u_handle), MMH_SEED).toString(16);
    });

    /**
     * Move former/legacy settings stored in localStorage
     * @private
     */
    const moveLegacySettings = function() {
        const prefs = [
            'agreedToCopyrightWarning', 'dl_maxSlots', 'font_size',
            'leftPaneWidth', 'mobileGridViewModeEnabled', 'ul_maxSlots', 'ul_maxSpeed'
        ];
        const replacements = {
            'agreedToCopyrightWarning': 'cws',
            'mobileGridViewModeEnabled': 'mgvm'
        };

        for (let i = prefs.length; i--;) {
            const pref = prefs[i];

            if (localStorage[pref] !== undefined) {
                const p = replacements[pref] || pref;

                if (fmconfig[p] === undefined) {
                    mega.config.set(p, parseInt(localStorage[pref]) | 0);
                }
            }
        }
    };

    // shrink suitable fmconfig settings
    const shrink = (cfg) => {
        if (d) {
            console.time('fmconfig.shrink');
        }

        // eslint-disable-next-line guard-for-in
        for (let slot in shrink.bitdef) {
            let bit = 0;
            let def = shrink.bitdef[slot];

            for (let i = def.length; i--;) {
                const k = def[i];
                const v = 1 << i;

                if (cfg[k] !== undefined) {
                    if (parse(cfg[k]) | 0) {
                        bit |= v;
                    }
                    delete cfg[k];
                }
            }

            cfg[slot] = stringify(bit);
        }

        cfg.xs1 = stringify(
            (cfg.obVer & 0xfff) << 20 | (cfg.font_size & 15) << 12 | cfg.leftPaneWidth & 0xfff
        );
        delete cfg.font_size;
        delete cfg.leftPaneWidth;
        delete cfg.obVer;

        let s = cfg.ul_maxSpeed;
        s = s / 1024 << 1 | (s < 0 ? 1 : 0);
        cfg.xs2 = stringify((s & 0xfffff) << 8 | (cfg.ul_maxSlots & 15) << 4 | cfg.dl_maxSlots & 15);
        delete cfg.ul_maxSpeed;
        delete cfg.ul_maxSlots;
        delete cfg.dl_maxSlots;

        if (cfg.viewercfg) {
            const xs3 = parse(cfg.viewercfg) || {};
            cfg.xs3 = stringify(xs3.speed << 16 | xs3.order << 8 | xs3.repeat << 1 | xs3.sub);
            delete cfg.viewercfg;
        }

        if (cfg.treenodes) {
            cfg.xtn = shrink.tree(cfg.treenodes);
            delete cfg.treenodes;
        }

        if (cfg.viewmodes) {
            cfg.xvm = shrink.views(cfg.viewmodes);
            delete cfg.viewmodes;
        }
        shrink.sorta(cfg);
        shrink.cleanup(cfg);

        if (d) {
            console.timeEnd('fmconfig.shrink');
        }
        return cfg;
    };

    shrink.bitdef = freeze({
        v04: ['rvonbrddl', 'rvonbrdfd', 'rvonbrdas'],
        xb1: [
            // do NOT change the order, add new entries at the tail UP TO 31, and 8 per row.
            'cws', 'ctt', 'viewmode', 'dbDropOnLogout', 'dlThroughMEGAsync', 'sdss', 'tpp', 'ulddd',
            'cbvm', 'mgvm', 'uiviewmode', 'uisorting', 'uidateformat', 'skipsmsbanner', 'skipDelWarning', 'rsv1',
            'nowarnpl', 'zip64n', 'callemptytout', 'callinout', 'showHideChat', 'showRecents', 'nocallsup', 'cslrem',
            'rsv2', 'noSubfolderMd'
        ]
    });
    shrink.zero = new Set([...Object.keys(shrink.bitdef), 'xs1', 'xs2', 'xs3', 'xs4', 'xs5']);

    shrink.cleanup = (cfg) => {

        for (const key in cfg) {
            const value = cfg[key];

            if (!value || value === '0' && shrink.zero.has(key)) {
                if (d) {
                    logger.info('Skipping zero value for "%s"', key);
                }
                delete cfg[key];
            }
        }
    };

    shrink.tree = (nodes) => {
        let v = '';
        const tn = Object.keys(parse(nodes) || {});
        const pfx = freeze({'o': '1', 'p': '2'});

        for (let i = 0; i < tn.length; ++i) {
            const k = tn[i];
            v += (k[2] === '_' && pfx[k[0]] || '0') + base64urldecode(k.substr(-8));
        }
        return v;
    };

    shrink.views = (nodes) => {
        let r = '';
        const v = parse(nodes);
        const s = Object.keys(v || {});

        for (let i = 0; i < s.length; ++i) {
            const h = s[i];
            const n = (h.length === 8 || h.length === 11) | 0;
            const j = n ? base64urldecode(h) : h;

            r += String.fromCharCode(j.length << 2 | (v[h] & 1) << 1 | n) + j;
        }

        return r;
    };

    shrink.sorta = (config) => {
        const tsort = config.sorting && parse(config.sorting);
        const rules = shrink.sorta.rules = shrink.sorta.rules || Object.keys(M.sortRules || {});
        const shift = o => rules.indexOf(o.n) << 1 | (o.d < 0 ? 1 : 0);
        const store = n => String.fromCharCode(n);
        let res = store(tsort ? shift(tsort) : 0);

        if (config.sortmodes) {
            const sm = Object.assign(Object.create(null), parse(config.sortmodes));

            // eslint-disable-next-line guard-for-in
            for (let h in sm) {
                const v = sm[h];
                const n = (h.length === 8 || h.length === 11) | 0;
                const p = n ? base64urldecode(h) : h;

                if (!rules.includes(v.n)) {
                    logger.warn(`Invalid sort-mode for ${h} %o`, v);
                    continue;
                }

                res += store(shift(v)) + store(p.length << 1 | n) + p;
            }
        }

        config.xsm = res;
        delete config.sorting;
        delete config.sortmodes;
    };
    shrink.sorta.rules = null;

    // stretch previously shrunk settings
    const stretch = (config) => {
        if (d) {
            console.time('fmconfig.stretch');
        }

        // eslint-disable-next-line guard-for-in
        for (let slot in shrink.bitdef) {
            let def = shrink.bitdef[slot];

            for (let i = def.length; i--;) {
                const k = def[i];
                const v = 1 << i;

                if (config[slot] & v) {
                    config[k] = 1;
                }
            }
        }

        if (config.xs1) {
            config.font_size = config.xs1 >> 12 & 15;
            config.leftPaneWidth = config.xs1 & 0xfff;
            config.obVer = config.xs1 >> 20;
        }

        if (config.xs2) {
            let s = config.xs2 >> 8;
            config.dl_maxSlots = config.xs2 & 15;
            config.ul_maxSlots = config.xs2 >> 4 & 15;
            config.ul_maxSpeed = s & 1 ? -1 : (s >> 1) * 1024;
        }

        if (config.xs3) {
            config.viewercfg = {};
            config.viewercfg.speed = config.xs3 >> 16 & 0xFF;
            config.viewercfg.order = config.xs3 >> 8 & 0xFF;
            config.viewercfg.repeat = config.xs3 >> 1 & 1;
            config.viewercfg.sub = config.xs3 & 1;
        }

        if (config.xtn) {
            config.treenodes = stretch.tree(config.xtn);
            delete config.xtn;
        }

        if (config.xvm) {
            config.viewmodes = stretch.views(config.xvm);
            delete config.xvm;
        }

        if (config.xsm) {
            stretch.sorta(config);
        }

        if (d) {
            console.timeEnd('fmconfig.stretch');
        }
        return config;
    };

    stretch.tree = (xtn) => {
        const t = Object.create(null);
        const p = freeze({'0': '', '1': 'os_', '2': 'pl_'});

        for (let i = 0; i < xtn.length; i += 7) {
            t[p[xtn[i]] + base64urlencode(xtn.substr(i + 1, 6))] = 1;
        }
        return t;
    };

    stretch.views = (xvm) => {
        const v = Object.create(null);

        for (let i = 0; i < xvm.length;) {
            let b = xvm.charCodeAt(i);
            let l = b >> 2;
            let h = xvm.substr(i + 1, l);

            v[b & 1 ? base64urlencode(h) : h] = b >> 1 & 1;

            i += ++l;
        }
        return v;
    };

    stretch.sorta = (config) => {
        const {xsm} = config;
        const rules = shrink.sorta.rules = shrink.sorta.rules || Object.keys(M.sortRules || {});

        let tmp = xsm.charCodeAt(0);
        config.sorting = {n: rules[tmp >> 1], d: tmp & 1 ? -1 : 1};

        tmp = Object.create(null);
        for (let i = 1; i < xsm.length;) {
            const a = xsm.charCodeAt(i);
            const b = xsm.charCodeAt(i + 1);
            const h = xsm.substr(i + 2, b >> 1);

            tmp[b & 1 ? base64urlencode(h) : h] = {n: rules[a >> 1], d: a & 1 ? -1 : 1};
            i += 2 + (b >> 1);
        }

        delete config.xsm;
        config.sortmodes = tmp;
    };

    // sanitize fmconfig
    const filter = async(fmconfig) => {
        const config = Object.create(null);
        const nodeType = freeze({viewmodes: 1, sortmodes: 1, treenodes: 1});
        const nTreeFilter = await filter.tree(fmconfig, nodeType);

        for (const key in fmconfig) {
            if (hasOwn(fmconfig, key)) {
                let value = fmconfig[key];

                if (!value && value !== 0) {
                    logger.info('Skipping empty value for "%s"', key);
                    continue;
                }

                // Dont save no longer existing nodes
                if (nodeType[key]) {
                    if (typeof value !== 'object') {
                        logger.warn('Unexpected type for ' + key);
                        continue;
                    }
                    value = nTreeFilter(value);
                }

                if (typeof value === 'object' && !oLen(value)) {
                    logger.info('Skipping empty object "%s"', key);
                    continue;
                }

                config[key] = typeof value === 'string' ? value : stringify(value);

                if (!(config[key] && config[key].length > 0 && config[key].length < 65535)) {
                    logger.info('Skipping "%s" with invalid value...', key);
                    delete config[key];
                }
            }
        }

        return shrink(config);
    };

    // get node tree sanitizer.
    filter.tree = async(config, types) => {
        const echo = v => v;
        if (pfid) {
            // @todo LRU cache?
            return echo;
        }

        const handles = array.unique(
            Object.keys(types)
                .reduce((s, v) => Object.keys(config[v] || {})
                    .map(h => M.isCustomView(h).nodeID || h).concat(s), [])
                .filter(s => s.length === 8 && s !== 'contacts')
        );

        if (handles.length < 200) {
            return echo;
        }

        const nodes = await dbfetch.node(handles).catch(nop) || [];
        for (let i = nodes.length; i--;) {
            nodes[nodes[i].h] = true;
        }

        const isValid = (handle) => {
            const cv = M.isCustomView(handle);
            handle = cv.nodeID || handle;
            return handle.length !== 8 || nodes[handle] || handle === 'contacts' || handle === cv.type;
        };

        return (tree) => {
            const result = Object.create(null);

            for (let handle in tree) {
                if (hasOwn(tree, handle)
                    && handle.substr(0, 7) !== 'search/'
                    && isValid(handle)) {

                    result[handle] = tree[handle];
                }
                else {
                    logger.info('Skipping non-existing node "%s"', handle);
                }
            }
            return result;
        };
    };

    // Save fmconfig into WebStorage.
    const saveLocally = async() => {
        let storage = localStorage;

        /**
        if ('csp' in window) {
            await csp.init();

            if (!csp.has('pref')) {
                storage = sessionStorage;
            }
        }
        /**/

        const config = await filter(fmconfig).catch(dump);

        tryCatch(data => {
            data = `\x1f${tlvstore.encode(data, false)}`;
            if (data.length > 262144) {
                logger.warn('fmconfig became larger than 256KB', data.length);
            }
            storage.fmconfig = data;
        }, ex => {
            if (ex.name === 'QuotaExceededError') {
                if (d) {
                    console.warn('WebStorage exhausted!', [fmconfig], stringify(storage).length);
                }

                if (!u_type) {
                    // The user is not logged/registered, let's just expunge it...
                    console.info('Cleaning fmconfig... (%s bytes)', String(storage.fmconfig).length);
                    delete storage.fmconfig;
                }
            }
        })(config);
    };

    /**
     * Pick the global `fmconfig` and sanitize it before
     * sending it to the server, as per TLV requirements.
     * @private
     */
    const store = mutex('fmconfig:store.mutex', async(resolve) => {
        if (!window.u_handle) {
            throw new Error('Unable to store fmconfig in the current context.');
        }

        const exit = (rc, message) => {
            if (d) {
                console.timeEnd('fmconfig.store');
                if (message) {
                    logger.debug(message);
                }
            }
            resolve(rc);
            return rc;
        };

        let str;
        let len;
        const fmconfig = window.fmconfig || {};

        if (d) {
            str = stringify(fmconfig);
            len = str.length;
            console.time('fmconfig.store');
            logger.debug('fmconfig.store:begin (%d bytes)', len, str);
        }

        const config = await filter(fmconfig).catch(dump);
        if (typeof config !== 'object' || !oLen(config)) {
            return exit(ENOENT, 'Not saving fmconfig, invalid...');
        }
        str = stringify(config).replace(/\\u.{4}/g, n => parseInt(n.substr(2), 16));

        if (d) {
            logger.debug('fmconfig.store:end (%d bytes saved)', len - str.length, str);
        }

        len = str.length;

        if (len < 8) {
            return exit(EARGS, 'Not saving fmconfig, data too short...');
        }
        if (len > 12000) {
            return exit(EOVERQUOTA, 'Not saving fmconfig, data exceeds maximum allowed...');
        }

        // generate checksum/hash for the config
        const hash = MurmurHash3(str, MMH_SEED);
        const tag = 'fmc!' + privy.ht;

        // dont store it unless it has changed
        if (hash === localStorage[tag] >>> 0) {
            return exit(EEXIST, 'Not saving fmconfig, unchanged...');
        }

        // fmconfig may changed in our side, but not in server, check it.
        let attr = await Promise.resolve(mega.attr.get(u_handle, 'fmconfig', false, true)).catch(nop);
        if (stringify(attr) === stringify(config)) {
            logger.debug('remote syncing completed.', attr);
        }
        else {
            attr = mega.attr.set2(null, 'fmconfig', config, false, true);
        }

        localStorage[tag] = hash;
        timer = Promise.resolve(attr)
            .catch(dump)
            .then(() => {
                timer = 0;
            });

        return exit(await timer);
    });

    // issue fmconfig persistence upon change.
    const push = () => {
        if (u_type > 2) {
            // through a timer to prevent floods
            timer = delay('fmconfig:store', () => store().catch(dump), 2600);
        }
        else {
            timer = null;
            delay('fmconfig:store', saveLocally, 3401);
        }
    };

    // Real-time update upon fmconfig syncing.
    const refresh = () => {
        if (fminitialized) {
            refresh.ui();
        }

        if (fmconfig.ul_maxSlots) {
            ulQueue.setSize(fmconfig.ul_maxSlots);
        }

        if (fmconfig.dl_maxSlots) {
            dlQueue.setSize(fmconfig.dl_maxSlots);
        }

        if (fmconfig.font_size && !document.body.classList.contains('fontsize' + fmconfig.font_size)) {
            document.body.classList.remove('fontsize1', 'fontsize2');
            document.body.classList.add('fontsize' + fmconfig.font_size);
        }

        if (fmconfig.fmColPrefs) {
            const prefs = getFMColPrefs(fmconfig.fmColPrefs);
            for (let colPref in prefs) {
                if (hasOwn(prefs, colPref)) {
                    M.columnsWidth.cloud[colPref].viewed = prefs[colPref] > 0;
                }
            }

            if (M.currentrootid === M.RubbishID) {
                M.columnsWidth.cloud.fav.disabled = true;
                M.columnsWidth.cloud.fav.viewed = false;
            }
        }
    };

    refresh.ui = () => {
        if (M.recentsRender) {
            M.recentsRender.checkStatusChange();
        }

        if (fmconfig.webtheme !== undefined) {
            mega.ui.setTheme(fmconfig.webtheme);
        }

        if (M.account && page.indexOf('fm/account') > -1) {
            if (!is_mobile) {
                accountUI.renderAccountPage(M.account);
            }
            else if (page === 'fm/account/notifications') {
                mobile.settings.notifications.render();
            }
            else if (page === 'fm/account/file-management') {
                mobile.settings.fileManagement.render();
            }

            return;
        }

        const view = Object(fmconfig.viewmodes)[M.currentdirid];
        const sort = Object(fmconfig.sortmodes)[M.currentdirid];

        if (view !== undefined && M.viewmode !== view
            || sort !== undefined && (sort.n !== M.sortmode.n || sort.d !== M.sortmode.d)) {

            M.openFolder(M.currentdirid, true);
        }

        if (M.currentrootid === M.RootID) {
            const tree = Object(fmconfig.treenodes);

            if (stringify(tree) !== M.treenodes) {

                M.renderTree();
            }
        }
    };

    // @private
    const define = (target, key, value) => {

        if (d) {
            if (value === undefined) {
                logger.debug('Removing "%s"', key);
            }
            else {
                logger.debug('Setting value for key "%s"', key, value);

                if (String(stringify(value)).length > 3072) {
                    logger.warn('Attempting to store more than 3KB for %s...', key);
                }
            }
        }

        if (typeof value === 'boolean') {
            logger.warn(`Invalid boolean value for ${key}`);
            value = +value;
        }
        if (typeof key !== 'string' || !/^[a-z]\w{1,16}$/.test(key)) {
            logger.error(`Invalid config property key: ${key}`);

            if (value !== undefined) {
                return false;
            }
        }

        const rc = value === undefined ? Reflect.deleteProperty(target, key) : Reflect.set(target, key, value);

        if (fminitialized) {
            queueMicrotask(push);
        }
        else if (timer !== -MMH_SEED) {
            timer = -MMH_SEED;
            mBroadcaster.once('fm:initialized', push);
        }

        mBroadcaster.sendMessage('fmconfig:' + key, value);

        return rc;
    };

    // Initialize fmconfig.
    const setup = (config) => {
        if (config) {
            const proto = Object.getPrototypeOf(config);
            if (proto !== null && proto !== Object.prototype) {
                logger.warn('Starting afresh with new config store...', config);
                config = null;
            }
        }
        config = stretch(Object.assign(Object.create(null), config));

        delete window.fmconfig;
        Object.defineProperty(window, 'fmconfig', {
            configurable: true,
            value: new Proxy(config, {
                set(target, prop, value) {
                    return define(target, prop, value);
                },
                deleteProperty(target, prop) {
                    return define(target, prop, undefined);
                }
            })
        });

        moveLegacySettings();

        for (const key in fmconfig) {
            let value = fmconfig[key];

            if (key.includes('firefox')
                || key.startsWith('confirmModal_')) {

                mega.config.remove(key);
                continue;
            }

            if (typeof value === 'string') {
                value = parse(fmconfig[key]);

                if (value === undefined) {
                    value = fmconfig[key];
                }
            }

            mega.config.set(key, value);
        }

        refresh();
    };

    /**
     * Fetch server-side config.
     * @return {Promise}
     */
    ns.fetch = async function _fetchConfig() {
        if (!u_handle) {
            throw new Error('Unable to fetch fmconfig in the current context.');
        }
        setup(await Promise.resolve(mega.attr.get(u_handle, 'fmconfig', false, true)).catch(nop));

        // disable client-side rubbish scheduler
        if (u_attr.flags.ssrs > 0) {
            mega.config.remove('rubsched');
        }

        // Initialize account notifications.
        mega.notif.setup(fmconfig.anf);
    };

    /**
     * Sync settings whenever logging in under a folder-link.
     * @return {Promise<void>}
     */
    ns.sync = async function() {
        const old = freeze({...window.fmconfig});
        await this.fetch();

        this.set('viewmodes', {...fmconfig.viewmodes, ...old.viewmodes});
        this.set('sortmodes', {...fmconfig.sortmodes, ...old.sortmodes});
        this.set('treenodes', {...fmconfig.treenodes, ...old.treenodes});
    };

    /**
     * Flush any pending fmconfig storage
     * @returns {Promise}
     */
    ns.flush = async function() {
        if (timer) {
            delay.cancel('fmconfig:store');
            return timer instanceof Promise ? timer : store();
        }
    };

    /**
     * Retrieve configuration value.
     * (We'll keep using the global `fmconfig` for now)
     *
     * @param {String} key Configuration key
     */
    ns.get = function _getConfigValue(key) {
        return fmconfig[key];
    };

    /**
     * Remove configuration value
     * @param {String} key   Configuration key
     */
    ns.remove = function _removeConfigValue(key) {
        return this.set(key, undefined);
    };

    /**
     * Store configuration value
     * @param {String} key   Configuration key
     * @param      {*} value Configuration value
     */
    ns.set = function _setConfigValue(key, value) {
        fmconfig[key] = value;
    };

    /**
     * Same as .set, but displays a toast notification.
     * @param {String} key          Configuration key
     * @param      {*} value        Configuration value
     * @param {String} [toastText]  Toast notification text
     */
    ns.setn = function _setConfigValueToast(key, value, toastText) {

        delay('fmconfig:setn.' + key, function() {
            let toast = false;

            if (key === 'rubsched' && u_attr.flags.ssrs > 0) {
                value = String(value).split(':').pop() | 0;

                if (M.account.ssrs !== value) {
                    M.account.ssrs = value;
                    mega.attr.set('rubbishtime', String(value), -2, 1);
                    toast = true;
                }
            }
            else if (mega.config.get(key) !== value) {
                mega.config.set(key, value);
                toast = true;
            }

            if (toast) {
                showToast('settings', toastText || l[16168]);
            }
        });
    };

    /**
     * Factory to store boolean-type options as bits to save space.
     * @param {String} name The name for the fmconfig property
     * @param {Array} properties Array of options/preferences
     * @returns {{}}
     */
    ns.factory = function(name, properties) {
        assert(Array.isArray(properties) && properties.length < 32);
        assert(typeof name === 'string' && name.length > 1 && name.length < 9);

        const config = Object.create(null);
        const bitdef = Object.create(null);

        let flags = mega.config.get(name) >>> 0;
        for (let i = properties.length; i--;) {
            const k = properties[i];
            const v = 1 << i;

            if (flags & v) {
                config[k] = true;
            }
            bitdef[k] = v >>> 0;
        }

        const define = (target, prop, value) => {
            let rc = false;

            if (prop in bitdef) {
                const old = flags;

                if (value | 0) {
                    flags |= bitdef[prop];
                    rc = Reflect.set(target, prop, true);
                }
                else {
                    flags &= ~bitdef[prop];
                    rc = Reflect.deleteProperty(target, prop);
                }

                if (rc && old !== flags) {
                    mega.config.set(name, flags || undefined);
                }
            }
            return rc;
        };

        return new Proxy(config, {
            get(target, prop) {
                return prop in bitdef ? !!(flags & bitdef[prop]) : undefined;
            },
            set(target, prop, value) {
                return define(target, prop, value);
            },
            deleteProperty(target, prop) {
                return define(target, prop, null);
            }
        });
    };

    mBroadcaster.once('startMega', () => {
        const cfg = tryCatch(() => {
            const value = sessionStorage.fmconfig || localStorage.fmconfig;
            if (value) {
                switch (value[0]) {
                    case '{':
                        return parse(value);
                    case '\x1F':
                        return tlvstore.decode(value.slice(1), false);
                    default:
                        logger.error('Unsupported local config type...', [value]);
                }
            }
        })();

        setup(cfg);
    });

    if (is_karma) {
        mega.config = ns;
    }
    else {
        Object.defineProperty(mega, 'config', {value: Object.freeze(ns)});
    }
})();

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// --- Account Notifications (preferences) ----------------------------------
// --------------------------------------------------------------------------
(function(map) {
    'use strict';

    let _enum = [];
    const _tag = 'ACCNOTIF_';

    Object.keys(map)
        .forEach(function(k) {
            map[k] = map[k].map(function(m) {
                return k.toUpperCase() + '_' + m.toUpperCase();
            });

            let rsv = 0;
            let memb = clone(map[k]);

            while (memb.length < 10) {
                memb.push(k.toUpperCase() + '_RSV' + (++rsv));
            }

            if (memb.length > 10) {
                throw new Error('Stack overflow..');
            }

            _enum = _enum.concat(memb);
        });

    makeEnum(_enum, _tag, mega);

    Object.defineProperty(mega, 'notif', {
        value: Object.freeze((function(flags) {
            function check(flag, tag) {
                if (typeof flag === 'string') {
                    if (tag !== undefined) {
                        flag = tag + '_' + flag;
                    }
                    flag = String(flag).toUpperCase();
                    flag = mega[flag] || mega[_tag + flag] || 0;
                }
                return flag;
            }

            return {
                get flags() {
                    return flags;
                },

                setup: function setup(oldFlags) {
                    if (oldFlags === undefined) {
                        // Initialize account notifications to defaults (all enabled)
                        assert(!fmconfig.anf, 'Account notification flags already set');

                        Object.keys(map)
                            .forEach(k => {
                                const grp = map[k];
                                let len = grp.length;

                                while (len--) {
                                    this.set(grp[len]);
                                }
                            });
                    }
                    else {
                        flags = oldFlags;
                    }
                },

                has: function has(flag, tag) {
                    return flags & check(flag, tag);
                },

                set: function set(flag, tag) {
                    flags |= check(flag, tag);
                    mega.config.set('anf', flags);
                },

                unset: function unset(flag, tag) {
                    flags &= ~check(flag, tag);
                    mega.config.set('anf', flags);
                }
            };
        })(0))
    });

    _enum = undefined;

})({
    chat: ['ENABLED'],
    cloud: ['ENABLED', 'NEWSHARE', 'DELSHARE', 'NEWFILES'],
    contacts: ['ENABLED', 'FCRIN', 'FCRACPT', 'FCRDEL']
});
