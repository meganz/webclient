/* @function window.trk */
lazy(self, 'trk', function() {
    'use strict';
    const queue = [];
    const storage = localStorage;
    const apipath = storage.bap || window.apipath;
    const parse = tryCatch(JSON.parse.bind(JSON));
    const stringify = tryCatch(JSON.stringify.bind(JSON));
    const encode = tryCatch(s => base64urlencode(to8(s)));
    const res = tryCatch(() => screen.width + 'x' + screen.height);
    const ref = tryCatch(() => new URL(document.referrer).host, false);
    const utm = storage.utm && parse(storage.utm) || {};
    let disabled = !storage.trk && (!is_livesite || window.buildOlderThan10Days || !mega.flags.sra);
    let pvId;

    const send = async(data) => {
        // @notice Dear user, don't hesitate to disable sendBeacon in your browser if you feel concerned about this.
        if (typeof navigator.sendBeacon !== 'function') {
            return EACCESS;
        }
        if (d) {
            console.warn('beacon', data);
        }
        return navigator.sendBeacon(apipath + 'cs?id=0&utm=1' + mega.urlParams(), stringify([data]));
    };

    const save = async() => {
        storage.utm = stringify(Object.assign(utm, {lts: unixtime()})) || storage.utm;
        return utm.lts;
    };

    const sra = async() => utm.cid || mega.flags.sra || M.req('sra');

    const dsp = async() => {
        delay.cancel('trk:dsp');
        if (!queue.length) {
            return null;
        }

        const q = [];
        const k = Object.create(null);
        for (let i = queue.length; i--;) {
            let e = queue[i];
            let o = Object.create(null);

            o.ts = e[0];
            o.uri = e[4];
            o.res = res();
            o.pv_id = e[5];
            o.urlref = ref();
            o._viewts = e[3];
            o.action_name = e[1];
            q.push(Object.assign(o, e[2]));

            // eslint-disable-next-line guard-for-in
            for (let x in o) {
                if (typeof o[x] === 'string') {
                    o[x] = encode(o[x]) || o[x];
                }
                x = x + '!' + o[x];
                k[x] = (k[x] | 0) + 1;
            }
        }
        const r = {a: 'ra', q: q, cid: utm.cid, idsite: 1, _idts: utm.fts};

        if (queue.length > 1) {
            // deduplicate
            for (let j in k) {
                if (k[j] === queue.length) {
                    [j] = j.split('!');
                    r[j] = q[0][j];
                    for (let u = q.length; u--;) {
                        delete q[u][j];
                    }
                }
            }
        }

        queue.length = 0;
        if (d) {
            console.table(q);
        }
        return send(r);
    };

    const pf = async() => {
        const res = {};
        const ptm = window.performance && performance.timing || false;
        const add = (k, v) => {
            res[k] = v > 0 ? v : res[k];
        };

        add('pf_net', ptm.connectEnd - ptm.fetchStart);
        add('pf_tfr', ptm.responseEnd - ptm.responseStart);
        add('pf_dm1', ptm.domInteractive - ptm.domLoading);
        add('pf_dm2', ptm.domComplete - ptm.domInteractive);
        add('pf_srv', ptm.responseStart - ptm.requestStart);
        add('pf_onl', window.pageLoadTime || ptm.loadEventEnd - ptm.loadEventStart);

        return res;
    };

    const disable = async(reason) => {
        delete window.trk;
        delete storage.utm; // <- SHOULD? @todo
        window.trk = () => Promise.resolve(EACCESS);
        window.removeEventListener("pagehide", dsp);
        window.removeEventListener("beforeunload", dsp);
        window.removeEventListener('visibilitychange', dsp);
        if (d) {
            console.warn('trk.disabled', reason);
        }
        disabled = true;
        return EACCESS;
    };

    const enqueue = async(action, data) => {
        const ts = unixtime();

        if (!utm.cid) {
            const cid = await sra().catch(echo);
            if (typeof cid !== 'string' || cid.length !== 16) {
                return disable(cid);
            }
            utm.fts = ts;
            utm.cid = cid;
        }

        if (typeof action !== 'string') {
            data = action;
            action = undefined;
        }
        else if (action.startsWith('nav')) {
            if (!pvId) {
                data = Object.assign({}, data, await pf().catch(nop));
            }
            pvId = Math.random().toString(28).slice(-6);
        }

        let uri = page.startsWith('fm') ? 'fm' : page;
        queue.push([ts, action, data, utm.lts, uri.replace(/[^\d/_a-z].*$/, '~'), pvId]);
        delay('trk:dsp', dsp, 2e4);
        return save();
    };

    window.addEventListener("pagehide", dsp);
    window.addEventListener("beforeunload", dsp);
    window.addEventListener('visibilitychange', dsp);

    return async(action, data) => {
        return disabled ? -0xDEADF00D : enqueue(action, data);
    };
});


(function trkEventHandler() {
    'use strict';
    // eslint-disable-next-line one-var
    let b1, b2, lastMetaTags = null;
    const log = console.warn.bind(console, '[trk.debug]');
    const split = (t, s) => String(s).split(t).map(String.trim).filter(String);
    const pubLinkMap = {'!': 'file', 'F!': 'folder', 'P!': 'pp', 'E!': 'embed', 'D!': 'drop'};
    const pubLinkRex = /^(?:chat|file|folder|embed|drop|pp)\b/;

    const isPubLink = (page) => {
        if (!page && window.is_embed) {
            return 'embed';
        }
        page = getCleanSitePath(page).replace(/^[D-FP]?!/, m => pubLinkMap[m] + '/');
        return pubLinkRex.test(page) ? page.split(/\W/)[0] : false;
    };

    const shutdown = (v) => {
        if (v === -0xDEADF00D) {
            mBroadcaster.removeListener(b1);
            mBroadcaster.removeListener(b2);
            if (d) {
                log('shutdown');
            }
        }
    };

    const getCleanPath = (page) => {
        let last;
        let leap = {
            chat: {p: 'private', g: 'group', c: 'public'}
        };
        const path = split('/', page).map(p => {

            if (p === M.RootID) {
                return 'root';
            }
            if (p === M.InboxID) {
                return 'inbox';
            }
            if (p === M.RubbishID) {
                return 'rubbish-bin';
            }
            if (last === 'fm' && p.length === 8 && p !== 'contacts') {
                return M.currentrootid === 'shares' ? 'shared-folder' : 'folder';
            }
            if (p.length === 11) {
                return 'contact';
            }
            if (leap[last]) {
                p = leap[last][p] || p;
            }

            last = p;
            return p;
        });

        if (path[0] === 'fm') {
            path[0] = 'cloud-drive';
        }
        if (path[1] === 'chat' && path.length > 3) {
            // remove room-id
            path.splice(path.length - 1, 1);
        }

        return path.map(String.trim).filter(String);
    };

    const nav = (sections) => {
        if (!sections || !sections.length) {
            let link = isPubLink();

            if (link) {
                sections = ['public-link', link];
            }
            else if (page.startsWith('fm')) {
                sections = getCleanPath(page);
            }
            else if (/^\w+$/.test(page)) {
                sections = [page];
            }
            else {
                log('unhandled page', page);
                return;
            }
        }

        if (d) {
            log('nav', sections);
        }
        trk(['nav'].concat(sections).join(' / ')).then(shutdown).catch(log);
    };

    const onPageMetaData = (meta) => {
        if (isPubLink() || page.startsWith('fm')) {
            lastMetaTags = null;
            return;
        }
        lastMetaTags = meta;

        if (meta.dynamic) {
            return;
        }

        let title =
            split(' - ', String(!meta.excluded && (meta.en_title || meta.mega_title) || '').replace(/MEGA('s)?/g, ''));

        if (title.length) {
            if (meta.section === 'help') {
                title = title.reverse();
                console.assert(title[0].endsWith('Help'));
                title[0] = title[0].replace(/\s*Help/, '');
                title.unshift('Help');
            }
        }
        else {
            let idx = meta.excluded > 1 ? meta.excluded : page.length;
            title = split('_', page.substr(0, idx).replace(/\//g, '_').replace(/\W.*$/, ''));
        }

        title = title.map(s => s.toLowerCase());

        nav(title);
    };

    const pageChangeExclude = {
        'help': 1,
        'chat': 1,
        'fm/chat': 1,
    };

    const onPageChange = (page) => {
        if (window.jsl && jsl.length > 0) {
            mBroadcaster.once('startMega', () => {
                onIdle(() => onPageChange(page));
            });
            return;
        }

        if ((!lastMetaTags || lastMetaTags.page !== page) && !pageChangeExclude[page]) {
            return nav();
        }

        if (d > 1) {
            log('Ignoring page-change event...', page, [lastMetaTags]);
        }
    };

    b1 = mBroadcaster.addListener('pagechange', SoonFc(80, onPageChange));
    b2 = mBroadcaster.addListener('pagemetadata', tryCatch(onPageMetaData));

    mBroadcaster.once('startMega', () => {
        if (!/help|chat/.test(page)) {
            onIdle(() => onPageChange(page));
        }

        (function _() {
            delay('trk.live-loop', () => M.req('sra').then(_).catch(shutdown), 7e6);
        })();
    });
})();
