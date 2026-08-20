/** @property T.ui.dashboardLayout */
lazy(T.ui, 'dashboardLayout', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const fmtym = tryCatch((y, m, locale = navigator.language) => {
        const date = new Date(y | 0, (m | 0) - 1);
        return new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(date);
    });
    const ce = (n, t, a) => mCreateElement(n, a, t);
    const ago = tryCatch((ts, locale = navigator.language) => {
        if (self.Intl && Intl.RelativeTimeFormat) {
            const dd = Math.floor(Date.now() / 1e3 - ts);
            const tf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});
            for (let [u, s, i] of Object.entries(ago.iv)) {
                if ((i = Math.floor(dd / s)) > 0) {
                    return tf.format(-i, u);
                }
            }
            return tf.format(0, 'second');
        }
        return new Date(ts * 1e3).toISOString();
    });
    Object.defineProperty(ago, 'iv', {
        value: freeze({
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        })
    });

    const xhnm = Object.create(null);

    const setRecipients = tryCatch((e, xrf) => {
        e.textContent = xrf.length;
        e.parentNode.classList.remove('loading');
        e.parentNode.dataset.simpletip = mega.icu.format(l.transferit_sent_to_x, xrf.length);

        const n = xhnm[e.dataset.xh];
        n.xrf = xrf;
        n.sched = xrf.length > 0;
    });

    let obs = (lst) => {
        for (let i = lst.length; i--;) {
            if (lst[i].isIntersecting) {
                const e = lst[i].target;

                console.assert(e.dataset.xh);
                if (e.dataset.xh) {
                    obs.unobserve(e);

                    T.core.getTransferRecipients(e.dataset.xh)
                        .then((xrf) => setRecipients(e, xrf))
                        .catch(dump);
                }
            }
        }
    };
    obs = new IntersectionObserver(obs, {
        root: document.body,
        threshold: 0.1
    });

    return freeze({
        data: {
            type: 'list',
            sort: {
                dir: 1,
                mode: 'date'
            }
        },
        detailsSection: Object.create(null),
        listSection: Object.create(null),

        get haveCachedData() {
            const {tfs = false, refresh} = this.data;

            this.data.refresh = false;
            return !refresh && tfs.length;
        },

        async init(ref) {
            if (!self.u_sid) {
                T.ui.loadPage('start');
                return false;
            }
            for (const elm of document.querySelectorAll(`.js-transfers-tabs button`)) {
                elm.classList.remove('active');
            }
            if (ref !== true) {
                if (ref && typeof ref === 'string') {
                    const s = tryCatch(() => document.querySelector(`.js-transfers-tabs button[data-page="${ref}"]`))();
                    if (s) {

                        s.classList.add('active');
                    }
                }
                this.data.ref = ref;
                ref = false;
            }

            this.data.cn = T.ui.page.content.querySelector('.js-dashboard-section');

            // Show section
            T.ui.page.showSection(this.data.cn, 'dashboard');

            // @todo re-render individual rows instead of 'refresh'..
            if (ref || !this.haveCachedData) {
                loadingDialog.show();
                this.data.tfs = await T.core.list()
                    .finally(() => loadingDialog.hide());
            }
            this.renderListContent();
        },

        showSubSection(cn) {
            const {menu} = this.listSection;
            if (menu && menu.classList.contains('visible')) {
                menu.classList.remove('visible');
            }

            const sn = this.data.cn.querySelectorAll('.it-box > .body > .content');
            for (const elm of sn) {
                elm.classList.add('hidden');
            }
            cn.classList.remove('hidden');
            this.data.details = this.detailsSection.cn === cn;
        },

        /*
         * Init Transfer list section.
        */
        initListContent() {
            let {cn} = this.data;

            this.listSection.menu = cn.querySelector('.js-dashboard-menu');
            cn = this.listSection.cn = cn.querySelector('.js-list-content');

            // Init tabs
            for (const tab of cn.querySelectorAll('.js-transfers-tabs button')) {
                tab.addEventListener('click', () => {
                    const activeBtn = tab.parentElement.querySelector('button.active');
                    if (activeBtn) {
                        activeBtn.classList.remove('active');
                    }
                    tab.classList.add('active');

                    return this.renderListContent();
                });
            }

            // Init search input
            T.ui.input.init(cn.querySelector('#tfrs-search-input'), (ev) => {
                const {value} = ev.target || !1;
                this.renderListContent(value && value.trim().replace(/\s+/g, ' '));
            });

            // Init sorting dropodown
            T.ui.dropdown.init(cn.querySelector('.js-sorting-select'), (mode) => {
                this.data.sort.mode = mode;
                this.renderListContent();
            });

            // Change sorting order
            cn.querySelector('.js-srt-dir-btn').addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('reverse');
                this.data.sort.dir = -this.data.sort.dir;
                this.renderListContent();
            });

            // Bind context menu
            this.bindActionItemEvts();
        },

        getFilteredTransfers(flt) {
            const res = [];
            const {sort: {dir, mode}, tfs} = this.data;

            flt = tfs.filter((n) => {
                if (n.a) {
                    crypto_procattr(n, base64_to_a32(n.k));
                }
                if (typeof n.t === 'string') {
                    n.name = n.t && tryCatch(() => from8(base64urldecode(n.t)))() || n.name;
                }
                n.t = 1;
                return flt(n);
            });

            if (mode === 'date') {
                flt = flt.reduce((o, n) => {
                    const d = new Date((n.ct || n.ts) * 1e3);
                    const m = `0${d.getMonth() + 1}`;
                    const k = `${d.getFullYear()}${m.slice(-2)}`;

                    (o[k] = o[k] || []).push(n);
                    return o;
                }, Object.create(null));

                const smk = Object.keys(flt).sort((a, b) => dir === 1 ? a - b : b - a);
                for (let i = smk.length; i--;) {
                    const k = smk[i];
                    const v = flt[k];
                    T.ui.sort.doSort(v, mode, dir);
                    res.push([k, v]);
                }
            }
            else if (mode === 'name') {
                res.push(['', flt]);
                T.ui.sort.doSort(flt, mode, dir);
            }

            return res;
        },

        formatSentDate(ts) {
            const date = new Date(ts * 1e3 || 0);
            const today = new Date();
            const diff = Math.floor(today.setHours(0, 0, 0, 0) / 86400000) -
                Math.floor(date.setHours(0, 0, 0, 0) / 86400000);

            if (diff < 2) {
                return mega.icu.format(
                    diff ? l.notif_date_yesterday : l.notif_date_today,
                    date.getHours()
                ).replace('%1', time2date(ts, 21));
            }

            return time2date(ts, 8);
        },

        renderListContent(aSearchBy) {
            if (!this.listSection.cn) {
                this.initListContent();
            }

            this.showSubSection(this.listSection.cn);

            const {sort: {mode: sortMode}} = this.data;
            let cn = this.listSection.cn.querySelector('.js-list-container');
            cn.textContent = '';
            cn.scrollTo({ top: 0 });
            this.data.selected = null;

            // Create list view container (Grid is coming soon)
            cn = ce('div', cn, { class: 'it-grid list-type transfers alternating-bg js-list-container' });

            const {dataset: {filter, page} = false} = this.listSection.cn.querySelector('.it-tab.active') || !1;
            const tfs = this.getFilteredTransfers((n) => {

                if (filter && !((n[filter] | 0) > 0)) {
                    return false;
                }
                if (aSearchBy) {
                    const data = [n.name];

                    if (n.xrf) {
                        data.push(n.xrf.map((o) => o.e).filter(Boolean).join('\t'));
                    }
                    if (!data.join('\v').toLowerCase().includes(aSearchBy.toLowerCase())) {
                        return false;
                    }
                }
                return true;
            });

            let added = 0;
            for (let i = 0; i < tfs.length; ++i) {
                const [ym, l] = tfs[i];

                // Add Month label for each month when sorting by date
                if (sortMode === 'date') {
                    ce('div', cn, {class: 'date-label'}).textContent = fmtym(ym.slice(0, 4), ym.slice(4));
                }

                for (let i = l.length; i--;) {
                    ++added;
                    this.renderListitem(l[i], cn);
                }
            }

            if (!added) {
                // Render an empty section
                this.renderEmptyState(filter);
            }

            if (page) {
                pushHistoryState(`dashboard/${page}`);
            }
            else {
                const s = document.querySelector(`.js-transfers-tabs button.it-tab.default`);
                if (s) {
                    s.classList.add('active');
                    pushHistoryState(`dashboard`);
                }
            }
        },

        renderEmptyState(fl) {
            const cn = this.listSection.cn.querySelector('.js-list-container');
            let icon = 'icon-arrow-up-circle-narrow';
            let txt = l.transferit_empty_transfers;

            if (fl === 'ac') {
                icon = 'icon-eye-narrow';
                txt = l.transferit_empty_accessed;
            }
            else if (fl === 'sched') {
                icon = 'icon-schedule-narrow';
                txt = l.transferit_empty_scheduled;
            }
            else if (fl === 'pw') {
                icon = 'icon-lock-narrow';
                txt = l.transferit_empty_pw_protected;
            }

            let wrap =  ce('div', cn, { class: 'grid-empty-content' });

            // Set icon for each section
            ce('i', wrap, { class: `sprite-it-x32-mono ${icon}` });
            ce('h5', wrap).textContent = txt;
            ce('span', wrap).textContent = l.transferit_empty_transfers_tip;

            // "New transfer" label for "All transfers" and "Go to transfers" for rest
            wrap = ce('button', wrap, { class: 'it-button' });
            ce('span', wrap).textContent = fl ?
                l.transferit_all_transfers : l.transferit_new_transfer;

            wrap.addEventListener('click', () => {
                // Open "All transfers" for filtered
                if (fl) {
                    this.listSection.cn.querySelector('.js-transfers-tabs button.default').click();
                }
                // Open start for "All transfers"
                else {
                    T.ui.loadPage('start');
                }
            });
        },

        renderListitem(n, cn) {
            const {ac, ct, ts, e, xh, xrf, size} = n;
            const [bytes = 0, files = 0] = size || [];
            const date = ct || ts;

            const item = ce('div', cn, {
                id: xh,
                tabindex: 0,
                class: 'it-grid-item'
            });
            let col = ce('div', item, { class: 'col' });

            // Item data wrap
            let wrap = ce('div', col, { class: 'info-body' });

            // Item name
            ce('div', wrap, {class: 'name js-name', title: n.name})
                .textContent = n.name;

            // Itme info
            let node = ce('div', wrap, {class: 'info'});

            ce('span', node).textContent = mega.icu.format(l.album_items_count, files);
            ce('span', node).textContent = bytesToSize(bytes);
            ce('span', node, {title: this.formatSentDate(date)}).textContent =
                l.transferit_sent_x.replace('%1', ago(date));

            // Downloaded of not
            if (ac > 0) {
                node = ce('div', wrap, {class: 'status success'});
                ce('i', node, {class: 'sprite-it-x16-mono icon-eye'});
                ce('span', node).textContent = l.transferit_accessed;
            }
            else {
                ce('div', wrap, {class: 'status'}).textContent = l.transferit_not_accessed;
            }

            /**
            // Total downloads
            col = ce('div', item, { class: 'col' });
            wrap = ce('div', col, {
                class: 'num-label simpletip',
                'data-simpletip': 'Total downloads: %1'.replace('%1', -1),
                'data-simpletipoffset': ``
            });
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-arrow-down-circle' });
            ce('span', wrap).textContent = `-1`;
            /**/

            // Sent to
            col = ce('div', item, { class: 'col' });
            wrap = ce('div', col, {
                class: 'num-label simpletip loading',
                'data-simpletipoffset': '10'
            });
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-user-group' });

            col = ce('span', wrap, {'data-xh': xh});
            if (xrf) {
                setRecipients(col, xrf);
            }
            else {
                xhnm[xh] = n;
                obs.observe(col);
            }

            // Total views
            col = ce('div', item, { class: 'col' });
            wrap = ce('div', col, {
                class: 'num-label simpletip',
                'data-simpletip': l.transferit_total_accesses.replace('%1', ac),
                'data-simpletipoffset': `10`
            });
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-eye' });
            ce('span', wrap).textContent = ac;

            // Expires
            col = ce('div', item, { class: 'col' });
            const now = Date.now() / 1e3;
            const diff = e ? (e - now) / 86400 : 0;
            const isExpired = e && diff < 0;
            const ed = e ? Math.floor(diff) : 0;

            const label = isExpired ? l[8657]
                : ed > 0 ? mega.icu.format(l.transferit_expires_in_x_days, ed)
                    : e ? l.transferit_expires_less_one_day : l.transferit_never_expires;

            ce('div', col, {
                class: `expires-label${isExpired ? ' negative' : ''}`
            }).textContent = label;

            // Contextmenu button
            col = ce('div', item, { class: 'col' });

            node = ce('button', col, { class: 'it-button ghost js-context' });
            ce('i', node, { class: 'sprite-it-x24-mono icon-more-horizontal' });

            // Show context menu, bind evts
            this.bindItemEvents(n, item);
        },

        bindItemEvents(n, item) {
            const btn = item.querySelector('.js-context');

            // Show details
            item.addEventListener('click', (e) => {
                if (btn.contains(e.target)) {
                    return false;
                }

                this.data.selected = n;
                this.renderDetailsContent();
            });

            this.bindMenuEvents({n, btn});
        },

        bindMenuEvents(opts) {
            const { menu } = this.listSection;
            const {
                n,
                btn,
                my = 'right top+2',
                at = 'right+4 bottom+2'
            } = opts;

            const prevZoom = (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                }
            };

            const hide = (e) => {
                // Prevent zoom
                if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) &&
                    (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
                    e.preventDefault();
                    return false;
                }

                // Hide menu
                if (e.key === 'Escape' || e.type !== 'keydown' && !e.target.closest('.js-context')) {
                    menu.classList.remove('visible');
                    document.removeEventListener('click', hide);
                    document.removeEventListener('keydown', hide);
                    document.removeEventListener('wheel', prevZoom);
                }
            };

            btn.addEventListener('click', () => {
                if (n) {
                    this.data.selected = n;
                }
                this.updateActionItems();

                menu.classList.add('visible');
                $(menu).position({
                    of: $(btn),
                    my,
                    at,
                    collision: 'flipfit',
                    within: $('body'),
                });

                btn.blur();
                setTimeout(() => menu.focus(), 100);

                document.addEventListener('click', hide);
                document.addEventListener('keydown', hide);
                document.addEventListener('wheel', prevZoom);
            });
        },

        updateActionItems() {
            const {details, selected} = this.data;
            const {xrf, pw, e} = selected;
            const {menu} = this.listSection;

            const isActive = !(e && e < Date.now() / 1e3);
            const hasSchedule = isActive && xrf && xrf.length;
            const hasPassword = isActive && pw;

            const items = {
                detailsSection: menu.querySelector('.js-tr-details-section'),
                open: menu.querySelector('.js-tr-open'),
                details: menu.querySelector('.js-tr-details'),
                copyLink: menu.querySelector('.js-tr-copy-link'),
                shareQr: menu.querySelector('.js-share-qr'),
                editTitle: menu.querySelector('.js-tr-edit-link-title'),
                password: menu.querySelector('.js-tr-change-password'),
                removePassword: menu.querySelector('.js-tr-remove-password'),
                expDate: menu.querySelector('.js-tr-change-exp-date'),
                schedule: menu.querySelector('.js-tr-change-schedule'),
                delete: menu.querySelector('.js-tr-delete-transfer')
            };

            const visibility = new Map([
                [items.detailsSection, !details],

                [items.open, isActive],
                [items.copyLink, isActive && details],
                [items.shareQr, isActive],
                [items.editTitle, isActive && details],

                [items.password, isActive],
                [items.removePassword, hasPassword],
                [items.expDate, isActive],
                [items.schedule, hasSchedule],

                [items.details, true],
                [items.delete, true]
            ]);

            for (const [item, visible] of visibility) {
                if (item) {
                    item.classList.toggle('hidden', !visible);
                }
            }

            items.expDate.querySelector('span').textContent =
                e ? l.transferit_change_exp_date : l.transferit_add_exp_date;

            items.schedule.querySelector('span').textContent =
                hasSchedule && xrf[0].s
                    ? l.transferit_change_schedule
                    : l.transferit_add_schedule;

            items.password.querySelector('span').textContent =
                hasPassword ? l[23262] : l.transferit_add_pass;
        },

        bindActionItemEvts() {
            const {cn} = this.data;
            const {menu} = this.listSection;

            menu.querySelector('.js-tr-open').addEventListener('click', () => {
                const {xh} = this.data.selected;
                open(`${getBaseUrl()}/t/${xh}`, '_blank', 'noopener,noreferrer');
            });

            menu.querySelector('.js-share-qr').addEventListener('click', () => {
                const {xh, name} = this.data.selected;
                T.ui.qrDialog.show({
                    fileName: name,
                    text: `${getBaseUrl()}/t/${xh}`
                });
            });

            menu.querySelector('.js-tr-change-password').addEventListener('click', () => {
                // todo: get password set
                const {name, xh, pw} = this.data.selected;
                const msg = l.transferit_lock_access_to_x.replace('%1', `<strong>${name}</strong>`);
                const opt = {
                    title: pw ? l[23262] : l.transferit_add_pass,
                    type: 'password',
                    buttons: [l[776], l.msg_dlg_cancel],
                    placeholders: [l[17454], l[909]],
                };
                T.ui.prompt(msg, opt)
                    .then((pw) => {
                        loadingDialog.show();
                        return pw && T.core.setTransferAttributes(xh, {pw});
                    })
                    .then((s) => s === 0 && this.init(true))
                    .catch(tell)
                    .finally(() => loadingDialog.hide());
            });

            menu.querySelector('.js-tr-remove-password').addEventListener('click', () => {
                const {xh} = this.data.selected;
                loadingDialog.show();
                T.core.removePassword(xh)
                    .then((s) => s === 0 && this.init(true))
                    .catch(tell)
                    .finally(() => loadingDialog.hide());
            });

            menu.querySelector('.js-tr-change-exp-date').addEventListener('click', () => {
                const {xh} = this.data.selected;
                const opt = {
                    buttons: [l[776], l.msg_dlg_cancel],
                    title: l.mobile_manage_link_expiry_date,
                    msg: l.transferit_change_availability,
                    submsg: l.transferit_availability_tip,
                    onload(box) {
                        const form = ce('form');
                        box.querySelector('p').after(form);
                        box = T.ui.dropdown.clone('.js-expires-dropdown');
                        form.append(box);
                        const btn = box.querySelector('.js-select-button');
                        const dropdown = box.querySelector('.js-dropdown');

                        btn.classList.add('hidden');
                        btn.querySelector('input').value = '0';
                        dropdown.classList.remove('it-dropdown-body');
                        T.ui.addFilesLayout.resetExpiryDate(dropdown);
                    }
                };
                T.ui.msgDialog.show(opt)
                    .then((e) => e >= 0 && T.core.setTransferAttributes(xh, {e}))
                    .then((s) => s === 0 && this.init(true))
                    .catch(tell);
            });

            menu.querySelector('.js-tr-change-schedule').addEventListener('click', () => {
                const {xh, xrf} = this.data.selected;
                const value = xrf.length ? xrf[0].s : null;
                const opt = {
                    title: value ? l.transferit_change_sched_hdr : l.transferit_add_schedule,
                    msg: value ? l.transferit_change_sched_info : l.transferit_add_sched_info,
                    type: 'calendar',
                    buttons: [l[776], l.msg_dlg_cancel],
                    placeholders: [l.transferit_sending_date],
                    value
                };
                T.ui.prompt(l.transferit_change_sched_info, opt)
                    .then((s) => {
                        if (s > 0) {
                            const p = [];
                            for (let i = xrf.length; i--;) {
                                p.push(T.core.setTransferRecipients(xh, {s}, xrf[i].rh));
                            }
                            return Promise.all(p);
                        }
                    })
                    .then((s) => s && this.init(true))
                    .catch(tell);
            });

            menu.querySelector('.js-tr-details').addEventListener('click', () => this.renderDetailsContent());

            for (const elm of cn.querySelectorAll('.js-tr-copy-link')) {
                elm.addEventListener('click', () => {
                    T.ui.copyLinkToClipboard(this.data.selected.xh);
                });
            }

            for (const elm of cn.querySelectorAll('.js-tr-edit-link-title')) {
                elm.addEventListener('click', () => {
                    const {xh, name} = this.data.selected;
                    const opt = {
                        title: l.transferit_edit_title,
                        buttons: [l[776], l.msg_dlg_cancel],
                        placeholders: [l.transferit_enter_title, l.file_request_title_heading],
                        inputValue: name
                    };
                    T.ui.prompt(l.transferit_enter_new_title, opt)
                        .catch(echo)
                        .then((title) => title && T.core.setTransferAttributes(xh, {title}))
                        .then((s) => s === 0 && this.init(true))
                        .catch(tell);
                });
            }

            for (const elm of cn.querySelectorAll('.js-tr-delete-transfer')) {
                elm.addEventListener('click', () => {
                    const {name, xh} = this.data.selected;
                    const msg = escapeHTML(l.transferit_delete_tr_info).replace('%1', `<strong>${name}</strong>`);

                    T.ui.confirm(msg, {title: 'Delete', buttons: [l[1730], l.msg_dlg_cancel]})
                        .then((yes) => yes && T.core.delete(xh))
                        .then(() => this.init(true))
                        .catch(tell);
                });
            }
        },

        /*
         * Init Transfer details section.
        */
        initDetailsContent() {
            const cn = this.detailsSection.cn = this.data.cn.querySelector('.js-details-content');

            // Back
            cn.querySelector('.js-back').addEventListener('click', () => {
                // @todo FIXME improve FIXUP
                pushHistoryState('dashboard');
                this.showSubSection(this.listSection.cn);
            });

            // New transfer
            cn.querySelector('.js-new-transfer-btn').addEventListener('click', () => {
                T.ui.loadPage('start');
            });

            // Download
            cn.querySelector('.js-download').addEventListener('click', () => {

                T.core.getOpenSesameLink(this.data.selected.xh)
                    .then((url) => {
                        // eslint-disable-next-line local-rules/open -- opening ourselves
                        window.open(url, '_self', 'noopener');
                    })
                    .catch(tell);
            });

            // Bind context menu
            this.bindMenuEvents({
                btn: cn.querySelector('.js-context'),
                my: 'right top-2',
                at: 'right+4 top-2'
            });
        },

        renderDetailsContent() {
            if (!this.detailsSection.cn) {
                this.initDetailsContent();
            }

            let { cn } = this.detailsSection;
            const {xh, name, ac, ct, ts, e, xrf = false, size} = this.data.selected;
            const [bytes = 0, files = 0] = size || [];
            const date = ct || ts;
            const nameWrap = cn.querySelector('.js-name');
            const info = cn.querySelector('.js-transfer-info');
            const buttons = cn.querySelector('.js-details-buttons');
            const delButton = buttons.querySelector('.js-tr-delete-transfer');
            const isActive = !(e && e < Date.now() / 1e3);

            // Update buttons for purged transfers
            for (const button of buttons.querySelectorAll('.it-button')) {
                button.classList.toggle(
                    'hidden',
                    isActive ? button === delButton : button !== delButton
                );
            }

            this.showSubSection(cn);

            nameWrap.textContent = name;
            nameWrap.title = name;
            cn.querySelector('.js-total-views').textContent =
                l.transferit_total_accesses.replace('%1', ac);
            cn.querySelector('.js-recipients-num').textContent =
                l.transferit_total_recipients.replace('%1', xrf.length || 0);

            info.textContent = '';
            ce('span', info).textContent = mega.icu.format(l.album_items_count, files);
            ce('span', info).textContent = bytesToSize(bytes);
            ce('span', info, {title: this.formatSentDate(date)}).textContent =
                l.transferit_sent_x.replace('%1', ago(date));

            // Render recipient items
            cn = cn.querySelector('.js-recipients-container');
            cn.textContent = '';

            for (let i = xrf.length; i--;) {
                this.renderRecipientItem(xrf[i], cn);
            }

            pushHistoryState(`dashboard/${xh}`);
        },

        renderRecipientItem(xrf, cn) {
            const {e, rh, a} = xrf;
            const item = ce('div', cn, {
                id: rh,
                tabindex: 0,
                class: 'it-grid-item'
            });
            let col = ce('div', item, { class: 'col' });

            // @todo: Email. Please use `success` classname if user downloaded
            let wrap = ce('div', col, { class: 'recipient-email' });

            if (a) {
                wrap.classList.add('success');
            }

            // @todo: Please use `icon-mail` is user didn't view
            // @todo: Please use `icon-eye` is user viewed, but didn't download
            // @todo: Please use `icon-arrow-down-circle` is user downloaded
            const icon = ce('i', wrap, {class: `sprite-it-x16-mono icon-mail`});
            ce('span', wrap).textContent = e;

            if (a) {
                icon.classList.add('icon-eye');
                icon.classList.remove('icon-mail');
                ce('i', wrap, { class: 'sprite-it-x24-mono icon-check' });
            }

            col = ce('div', item, { class: 'col' });

            // @todo: Show button only if user didn't view, didn't download
            /**
            if (!a) {
                wrap = ce('button', col, {class: 'it-button ghost sm-size js-resend'});
                ce('i', wrap, {class: 'sprite-it-x16-mono icon-arrow-up-right-square'});
                ce('span', wrap).textContent = l[8744];

                // @todo: Bind resend button
                wrap.addEventListener('click', () => {
                    tell('@todo: API command?');
                });
            }
            /**/
        },
    });
});
