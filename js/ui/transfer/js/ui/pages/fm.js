/** @property T.ui.viewFilesLayout */
lazy(T.ui, 'viewFilesLayout', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const thumb = tryCatch((n, uri) => {
        let img = document.getElementById(n.h);
        if (img && (img = img.querySelector('img')) && img.onload === null) {
            img.onload = () => img.parentNode.classList.add('thumb');
            img.src = uri;
        }
    });

    const thumbnailer = tryCatch((list) => {
        const thumbs = Object.create(null);

        for (let i = list.length; i--;) {
            const n = list[i];
            if (n.fa) {
                if (thumbnails.has(n.fa)) {
                    thumb(n, thumbnails.get(n.fa));
                }
                else if (thumbnails.queued(n, 0)) {
                    thumbs[n.fa] = n;
                }
            }
        }

        if ($.len(thumbs)) {
            return api_getfileattr(thumbs, 1, (_, fa, data) => {
                if (data.byteLength) {
                    const uri = mObjectURL([data.buffer], 'image/jpeg');
                    thumbnails.add(fa, uri, (n) => thumb(n, uri));
                }
            });
        }
    });

    return freeze({
        data: {
            type: 'list',
            sort: {
                dir: 1,
                mode: 'name'
            }
        },
        viewContent: Object.create(null),
        readyToDownload: Object.create(null),
        zipDownloadQueue: freeze({
            onclick(ev) {
                stop(ev);
                if (!ev.target.classList.contains('disabled')) {

                    T.core.zipDownload(self.xhid).catch(tell);
                }
            },
            dom: new IWeakSet()
        }),

        async init(xh, folder) {
            const first = !this.readyToDownload.cn;
            if (first) {
                await this.renderReadyToDownload(xh);

                // if a pwd is set, no preloading
                if (!this.data.preload) {
                    return;
                }
            }
            if (!M.RootID) {
                if (!first) {
                    loadingDialog.show();
                }
                await this.preload(xh)
                    .finally(() => first || loadingDialog.hide());
            }
            await M.openFolder(folder || M.RootID);

            if (!this.data.customView) {
                const list = [...M.v].filter(n => !n.t);
                list.sort((a, b) => a.s < b.s ? 1 : -1);

                let media = 0;
                const length = list.length >> 3 || list.length;
                for (let i = length; i--;) {
                    const n = list[i];

                    if (this.isMediaFile(n)) {

                        media++;
                    }
                }

                // If there is a majority of media files in the folder
                if (media * 100 / length > 51) {
                    this.data.type = 'grid';
                }
            }

            if (this.viewContent.cn) {
                this.renderViewContent(xh);
            }
            thumbnailer(M.v);
        },

        isMediaFile(n) {
            if (!crypto_keyok(n)) {
                return null;
            }
            if (is_video(n) || MediaInfoLib.isFileSupported(n)) {
                return 2;
            }
            return String(n.fa).includes(':0*') || is_image2(n) ? 1 : false;
        },

        async preload(xh) {
            if (!this.data.preload && !M.RootID) {
                this.data.preload = T.core.fetch(xh);
            }
            return this.data.preload;
        },

        /*
         * Init Ready to download section.
        */
        async initReadyToDownload(xh) {
            const cn = this.readyToDownload.cn = T.ui.page.content.querySelector(
                '.it-box-holder.js-ready-to-dl-section'
            );
            loadingDialog.show();
            this.data.xi = await T.core.getTransferInfo(xh)
                .finally(() => loadingDialog.hide());

            // Init view content button
            cn.querySelector('.js-view-content').addEventListener('click', () => {
                if (!cn.classList.contains('view-content-clicked')) {
                    cn.classList.add('view-content-clicked');

                    this.preload(xh)
                        .then(() => this.initViewContent(xh))
                        .then(() => this.init(xh))
                        .catch((ex) => {
                            this.data.preload = null;
                            return Number(ex) !== self.EROLLEDBACK && tell(ex);
                        })
                        .finally(() => cn.classList.remove('view-content-clicked'));
                }
            });

            // Init download all button
            const dlb = cn.querySelector('.js-download');
            if (dlb) {
                this.pollZipDownload(xh, dlb).catch(dump);
            }

            if (!this.data.xi.pw) {
                this.preload(xh).catch(dump);
            }
        },

        async pollZipDownload(xh, elm) {
            const {z, zp, size: [, files]} = this.data.xi;

            if (!z && files > 1) {
                elm.classList.add('disabled');
                this.zipDownloadQueue.dom.add(elm);

                if (zp) {
                    const each = (cb, data) => {
                        for (const elm of this.zipDownloadQueue.dom) {
                            cb(elm, data);
                        }
                    };
                    const star = (elm) => elm.classList.add('progress');
                    const cmpl = (elm) => elm.classList.remove('progress', 'disabled');
                    const prog = (elm, v) => {
                        const pb = elm.querySelector('.progress-bar');
                        if (pb) {
                            pb.style.width = `${v / 65536 * 100}%`;
                        }
                    };
                    each(star);
                    each(prog, zp);

                    if (this.zipDownloadQueue.dom.size === 1) {

                        do {
                            await tSleep(2.1);
                            const res = await T.core.getTransferInfo(xh).catch(dump);
                            if (!res) {
                                break;
                            }
                            if (res.z) {
                                this.data.xi = res;

                                each(cmpl);
                                break;
                            }
                            each(prog, res.zp);
                        }
                        while (this.zipDownloadQueue.dom.size);
                    }
                }
            }
            elm.addEventListener('click', this.zipDownloadQueue.onclick);
        },

        /*
         * Render Ready to download section.
        */
        async renderReadyToDownload(xh) {
            if (!this.readyToDownload.cn) {
                MediaInfoLib.getMediaCodecsList().catch(dump);
                await this.initReadyToDownload(xh);
            }
            const { cn } = this.readyToDownload;
            const m = from8(base64urldecode(this.data.xi.m || '')).trim();
            const t = from8(base64urldecode(this.data.xi.t || ''));
            const msgCn = cn.querySelector('.msg-area');
            const titleCn = cn.querySelector('.link-info .title');

            msgCn.classList.add('hidden');
            titleCn.classList.add('hidden');

            // Show message
            if (m) {
                msgCn.classList.remove('hidden');
                msgCn.querySelector('span').textContent = m;
            }

            // Show title
            if (t) {
                titleCn.classList.remove('hidden');
                titleCn.textContent = t;
            }

            // Items num and size
            this.updateItemsInfo(cn);

            // Show section
            T.ui.page.showSection(cn);
        },

        /*
         * Init View content (FM) section.
        */
        initViewContent(xh) {
            this.viewContent.cn = T.ui.page.content.querySelector('.it-box-holder.js-fm-section');

            // Init View type buttons
            this.initViewModeBtns();

            // Init sorting dropdown
            this.initSortingDropdown();

            for (const elm of document.querySelectorAll('.js-download-all')) {

                this.pollZipDownload(xh, elm).catch(dump);
            }
        },

        /*
         * Render View content (FM) section.
        */
        renderViewContent(xh) {
            if (!this.viewContent.cn) {
                this.initViewContent(xh);
            }
            const { cn } = this.viewContent;

            cn.querySelector('.it-grid-info').classList.add('hidden');
            cn.querySelector('.breadcrumbs-wrap').classList.add('hidden');

            // Link name
            cn.querySelector('.link-name').textContent = M.d[M.RootID].name;
            // ^ @todo get 't'itle and use it instead!

            // Items num and size or breadcrumbs
            if (M.RootID === M.currentdirid) {
                this.updateItemsInfo(cn);
            }
            else {
                this.initBreadCrumbs();
            }

            // Udate View mode buttons state
            this.updateViewModeBtns();

            // Show section
            T.ui.page.showSection(cn);

            // Render items
            this.renderContent();
        },

        initBreadCrumbs() {
            const wrap = this.viewContent.cn.querySelector('.breadcrumbs-wrap');

            wrap.classList.remove('hidden');
            T.ui.breadcrumbs.init(M.currentdirid, wrap);
        },

        updateItemsInfo(cn) {
            const info = cn.querySelector('.it-grid-info');
            // const { tb, td, tf } = M.d[M.currentdirid];
            const [tb, tf, td] = this.data.xi.size;

            info.classList.remove('hidden');
            info.querySelector('.size').textContent = bytesToSize(tb);

            info.querySelector('.num').textContent =
                `${td - 1 ? mega.icu.format(l.folder_count, td - 1) + ', ' : ''}${mega.icu.format(l.file_count, tf)}`;
        },

        initViewModeBtns() {
            const { cn } = this.viewContent;
            const viewBtns = cn.querySelectorAll('.file-manager-box .view-btns .it-button');

            for (var i = 0; i < viewBtns.length; i++) {
                viewBtns[i].addEventListener('click', (e) => {
                    if (e.currentTarget.classList.contains('active')) {
                        return false;
                    }

                    this.updateViewModeBtns(e.currentTarget);

                    this.data.type = e.currentTarget.dataset.type || 'list';
                    this.data.customView = true;
                    this.renderContent();
                });
            }
        },

        updateViewModeBtns(btn) {
            const { cn } = this.viewContent;
            const bntsBox = cn.querySelector('.file-manager-box .view-btns');
            const viewBtns = bntsBox.querySelectorAll('.it-button');
            let icon = null;

            for (var i = 0; i < viewBtns.length; i++) {
                const bn = viewBtns[i];
                icon = bn.querySelector('i');
                bn.classList.remove('active');
                bn.querySelector('i').className = `sprite-it-x24-mono ${icon.dataset.icon}`;
            }

            btn = btn || bntsBox.querySelector(`.it-button[data-type="${this.data.type}"]`);
            icon = btn.querySelector('i');
            icon.className = `sprite-it-x24-mono ${icon.dataset.icon}-filled`;
            btn.classList.add('active');
        },

        initSortingDropdown() {
            const dropdown = this.viewContent.cn.querySelector('.js-sorting-select');
            const options = dropdown.querySelectorAll('.js-option');

            // Init dropdown component
            T.ui.dropdown.init(dropdown);

            // Bind change sorting evt
            for (var i = 0; i < options.length; i++) {
                options[i].addEventListener('click', (e) => {
                    const radio = e.currentTarget.querySelector('input');

                    if (this.data.sort.mode === radio.value) {
                        this.data.sort.dir *= -1;
                    }
                    else {
                        this.data.sort.mode = radio.value;
                        this.data.sort.dir = 1;
                    }

                    this.renderContent();

                    e.preventDefault();
                });
            }
        },

        updateSortingUI() {
            const { cn } = this.viewContent;
            const listHeader = cn.querySelector('.it-grid-header');
            const sel = cn.querySelector(
                `.js-sorting-select input[value="${this.data.sort.mode}"]`
            );

            if (sel) {
                sel.checked = true;
                sel.dispatchEvent(new Event('change'));
            }

            if (!listHeader) {
                return;
            }

            const sortingBtns = listHeader.querySelectorAll('.label.clickable');
            const activeBtn = listHeader
                .querySelector(`.label[data-mode="${this.data.sort.mode}"]`);

            for (var i = 0; i < sortingBtns.length; i++) {
                sortingBtns[i].classList.remove('selected');
            }

            activeBtn.classList.add('selected');
            activeBtn.querySelector('i').className = ' sprite-it-x16-mono ' +
                `${this.data.sort.dir === 1 ? 'icon-chevron-up' : 'icon-chevron-down' }`;
        },

        renderContent() {
            const cn = this.viewContent.cn.querySelector('.items-wrap .content-body > .content');
            const { mode, dir } = this.data.sort;

            cn.textContent = '';
            cn.scrollTo({ top: 0 });

            // Show empty folder
            if (!M.v.length) {
                const wrap =  ce('div', cn, { class: 'grid-empty-content' });
                ce('h5', wrap).textContent = l[782];
                return;
            }

            // Sort M.v
            T.ui.sort.doSort(M.v, mode, dir);

            // Render list or grid view
            if (this.data.type === 'list') {
                this.renderListView(cn);
            }
            else {
                this.renderGridView(cn);
            }

            // Update sorting UI
            this.updateSortingUI();
        },

        renderListView(cn) {
            cn = ce('div', cn, { class: 'it-grid list-type alternating-bg' });

            this.renderListiHeader(cn);

            for (let i = 0; i < M.v.length; i++) {
                this.renderListitem(M.v[i], cn);
            }

            this.initSortBtns(cn);
        },

        renderListiHeader(cn) {
            const item = ce('div', cn, { class: 'it-grid-header' });
            let col = ce('div', item, { class: 'col' });
            let wrap = ce('div', col, { class: 'label clickable', 'data-mode': 'name' });

            ce('span', wrap).textContent = l.transferit_name_low;
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-chevron-up' });

            col = ce('div', item, { class: 'col' });
            wrap = ce('div', col, { class: 'label clickable', 'data-mode': 'type' });

            ce('span', wrap).textContent = l.transferit_type_low;
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-chevron-up' });

            col = ce('div', item, { class: 'col' });
            wrap = ce('div', col, { class: 'label clickable', 'data-mode': 'size' });

            ce('span', wrap).textContent =  l.transferit_size_low;
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-chevron-up' });

            ce('div', item, { class: 'col' });
        },

        renderListitem(n, cn) {
            const item = ce('div', cn, {
                class: 'it-grid-item',
                id: n.h,
                tabindex: 0
            });
            let col = ce('div', item, { class: 'col' });

            // Item type icon
            let wrap = ce('div', col, { class: `it-thumb-base ${fileIcon(n)}` });
            ce('i', wrap, { class: `sprite-it-mime ${fileIcon(n)}` });

            // Item name
            ce('span', col, { class: `md-font-size pr-color` }).textContent = n.name;

            // Item type
            col = ce('div', item, { class: 'col' });
            ce('span', col).textContent = n.t ? l[1049] : filetype(n);

            // Item size
            col = ce('div', item, { class: 'col' });
            ce('span', col).textContent = bytesToSize(n.s || n.tb || 0);

            // Download button
            col = ce('div', item, { class: 'col' });
            wrap = ce('button', col, {id: n.h, class: 'it-button sm-size ghost js-download'});

            ce('i', wrap, { class: 'sprite-it-x16-mono icon-arrow-big-down' });
            ce('span', wrap).textContent = l[58];

            // Bind evts
            this.bindItemEvts(n, item);
        },

        bindItemEvts(n, item) {
            const dlBtn = item.querySelector('.js-download');
            const download = () => {
                window.open(T.core.getDownloadLink(n), '_blank', 'noopener,noreferrer');
            };

            const openItem = (ev) => {
                stop(ev);

                if (dlBtn.contains(ev.target)) {
                    return false;
                }

                if (n.t) {
                    this.init(n.xh, n.h).catch(tell);
                }
                else {
                    const media = this.isMediaFile(n);

                    if (media) {
                        if (media > 1) {
                            $.autoplay = n.h;
                        }

                        slideshow(n);
                    }
                    else {
                        download();
                    }
                }
            };

            item.addEventListener('focus', (ev) => {
                ev.target.classList.add('active', 'ui-selected');
            });
            item.addEventListener('blur', (ev) => {
                ev.target.classList.remove('active', 'ui-selected');
            });

            if ($.autoSelectNode === n.h) {
                tryCatch(() => item.focus())();
            }

            // Initialize double click/dblclick events
            item.addEventListener(is_touchable ? 'click' : 'dblclick', (ev) => openItem(ev));

            // Initialize download btn
            if (n.t) {
                dlBtn.classList.add('hidden');
            }
            else {
                dlBtn.addEventListener('click', (ev) => {
                    stop(ev);
                    download();
                });
            }
        },

        initSortBtns(cn) {
            const listHeader = cn.querySelector('.it-grid-header');
            const sortingBtns = listHeader.querySelectorAll('.label.clickable');

            for (var i = 0; i < sortingBtns.length; i++) {

                sortingBtns[i].addEventListener('click', (e) => {
                    if (e.currentTarget.classList.contains('selected')) {
                        this.data.sort.dir *= -1;
                    }
                    else {
                        this.data.sort.dir = 1;
                        this.data.sort.mode = e.currentTarget.dataset.mode || 'name';
                    }

                    this.renderContent();
                });
            }
        },

        renderGridView(cn) {
            const { mode } = this.data.sort;
            const groups = [
                { name: l.transferit_folders_type, type: 'folder' }
            ];
            let wrap = null;

            if (mode === 'type') {
                groups.push(
                    { name: l.transferit_images_type, type: 'image' },
                    { name: l.transferit_video_type, type: 'video' },
                    { name: l.transferit_audio_type, type: 'audio' },
                    { name: l.transferit_docs_type, type: ['openoffice', 'pages', 'pdf', 'word'] },
                    { name: l.transferit_other_type, type: 'file' }
                );
            }
            else {
                groups.push(
                    { name: l.transferit_files_type, type: 'file' }
                );
            }

            cn = ce('div', cn, { class: 'it-grid grid-type' });

            // Create groups of items
            for (let i = 0; i < M.v.length; i++) {
                const n = M.v[i];
                const ft = filetype(n, true);
                const type = mode === 'type' && Array.isArray(ft) ? ft[0] : n.t ? 'folder' : 'file';
                const index = groups.findIndex((obj) => obj.type.includes(type));
                const group = groups[index > -1 ? index : groups.length - 1];

                if (group) {
                    if (group.n) {
                        group.n.push(n);
                        continue;
                    }
                    group.n = [n];
                }
            }

            for (let i = 0; i < groups.length; i++) {
                const g = groups[i];
                if (!g.n) {
                    continue;
                }

                // Show large thumbs only for Images/Video when sorting by type
                // Or for all files when sorting by name or size
                const cl = mode === 'type' && (g.type === 'image' || g.type === 'video')
                    || mode !== 'type' && g.type === 'file' ? ' lg-size' : '';

                // Create a group with special name
                wrap = ce('div', cn, { class: `items-group${cl}` });
                ce('div', wrap, { class: 'items-group-header' }).textContent = g.name;

                wrap = ce('div', wrap, { class: 'items-group-body' });

                // Render items in the group
                for (let j = 0; j < g.n.length; j++) {
                    this.renderGirditem(g.n[j], wrap);
                }
            }

            thumbnailer(M.v);
        },

        renderGirditem(n, cn) {
            const item = ce('div', cn, {
                class: 'it-grid-item',
                id: n.h,
                tabindex: 0
            });
            const { sort: { mode: sortmode } } = this.data;
            const mType = is_video(n);
            const prop = mType && MediaAttribute(n, n.k);
            const playtime = prop && prop.data && prop.data.playtime;
            let dn = null;

            // Add "thumb" class to show thumbnail
            let wrap = ce('div', item, { class: `it-thumb-base lg-size ${fileIcon(n)}` });

            // Item type icon
            ce('i', wrap, { class: `sprite-it-mime-lg ${fileIcon(n)}` });

            // Thumbnail
            ce('img', wrap, { src: '' });

            // If Previewable video, show play icon
            if (mType === 1) {
                dn = ce('div', wrap, { class: 'play-icon' });
                ce('i', dn, { class: 'sprite-fm-mono icon-play-small-regular-solid' });
            }

            // Show paytime tag in thumbnail node,
            // If Video file or Audio file when sorting by type
            if (playtime && (sortmode !== 'type' || mType === 1)) {

                // If Video, audio, animated images, show tag
                dn = ce('div', wrap, { class: 'tag' });

                // Use "icon-video" class for video,
                // "icon-play" for audio,
                // "icon-animation" for animated images
                ce('i', dn, {
                    class: `sprite-it-x16-mono ${mType === 2 ? 'icon-play' : 'icon-video'}`
                });

                // Set audio/video duration or anumated image ext, i.e. GIF
                ce('span', dn, { class: 'num' }).textContent = secondsToTimeShort(playtime);
            }

            // Wrappers
            wrap = ce('div', item, { class: 'item-data-body' });
            dn = ce('div', wrap, { class: 'item-data' });

            // Item name
            ce('div', dn, { class: 'item-name' }).textContent = n.name;

            // Item type or children data, item size.
            const info = ce('div', dn, {class: 'it-grid-info'});

            // File type or number of folder child items
            ce('div', info, { class: 'num' }).textContent = n.t ?
                `${mega.icu.format(l.folder_count, n.td)}, ${mega.icu.format(l.file_count, n.tf)}` : filetype(n);

            // Size
            ce('div', info, {class: 'size'}).textContent = bytesToSize(n.s || n.tb || 0);

            // Show audio playtime tag in file info when sorting by type
            if (playtime && mType === 2 && sortmode === 'type') {
                ce('div', dn, {
                    class: 'item-tag'
                }).textContent = secondsToTimeShort(playtime);
            }

            // Download button
            wrap = ce('button', wrap, {
                'alria-label': l[58],
                id: n.h,
                class: 'it-button sm-size ghost js-download'
            });
            ce('i', wrap, { class: 'sprite-it-x16-mono icon-arrow-big-down' });

            // Bind evts
            this.bindItemEvts(n, item);
        }
    });
});
