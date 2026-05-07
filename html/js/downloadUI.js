/** @property mega.ui.dlPage */
lazy(mega.ui, 'dlPage', () => {
    'use strict';

    if (is_mobile) {
        return false;
    }

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const startNode = document.getElementById('startholder');
    const maxSizeBytes = 10 * 1024 * 1024;

    // Download page header
    class DlHeader extends MegaComponent {

        constructor(options) {

            super(options);

            const header = this.domNode;
            const filename = dl_node.name || 'unknown.bin';
            const extPos = filename.lastIndexOf('.') || filename.length;

            header.classList.add('dl-header');

            const fileInfo = ce('div', header, {class: 'fileinfo'});
            const fileName = ce('div', fileInfo, {class: 'filename'});

            ce('div', fileName, {class: 'name'}).textContent = filename.slice(0, extPos);
            ce('span', fileName, {class: 'ext'}).textContent = filename.slice(extPos);
            ce('span', fileInfo, {class: 'size'}).textContent = bytesToSize(dl_node.s);

            const actions = ce('div', header, {class: 'actions'});

            this.dlButton = false;

            this.renderActions = (isCompact) => {
                actions.textContent = '';

                const submenu = ce('div');
                const section = ce('div', submenu, {class: 'context-section'});

                const createBtn = ({
                    parentNode = section,
                    type = 'fullwidth',
                    componentClassname = 'context-button text-icon',
                    ...opts
                }) => MegaButton.factory({
                    parentNode,
                    type,
                    componentClassname,
                    ...opts
                });

                // Copy link
                createBtn({
                    icon: 'sprite-fm-mono icon-link-thin-outline',
                    text: l[1394],
                    onClick: () => {
                        $.itemExport = [dlpage_ph];
                        mega.Share.ExportLink
                            .pullShareLink($.itemExport, {showExportLinkDialog: true})
                            .catch(tell)
                            .finally(() => $(this).removeClass('disabled'));
                    },
                    eventLog: 501057
                });

                // Report abuse
                createBtn({
                    icon: 'sprite-fm-mono icon-message-alert',
                    text: l.report_label,
                    onClick: () => mega.ui.reportAbuse.show(),
                    eventLog: 501059
                });

                // More menu
                createBtn({
                    parentNode: actions,
                    type: 'icon',
                    componentClassname: 'text-icon secondary visible-active',
                    icon: 'sprite-fm-mono icon-more-vertical-thin-outline',
                    iconSize: 24,
                    simpletip: l.more_actions,
                    simpletipPos: 'bottom',
                    onClick: (ev) => this.openMenu(ev, submenu)
                });

                const targetNode = isCompact ? actions : section;
                const type = isCompact ? 'icon' : 'fullwidth';
                const baseClass = isCompact ? 'text-icon secondary' : 'context-button text-icon';

                // Download
                this.dlButton = createBtn({
                    parentNode: targetNode,
                    type,
                    text: isCompact ? null : l[58],
                    componentClassname:
                        `${baseClass} icon-loading ${isCompact ? 'icon-replace' : 'visible-txt'}`,
                    icon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                    iconSize: 24,
                    loaderIcon: 'icon-loader-throbber-dark-outline-after',
                    simpletip: isCompact ? l[58] : null,
                    simpletipPos: 'bottom',
                    onClick: () => mega.ui.dlPage.startDownload(),
                    eventLog: 501056
                });

                // Save to MEGA
                createBtn({
                    parentNode: targetNode,
                    type: isCompact ? null : 'fullwidth',
                    text: self.u_attr ? l.btn_imptomega : l.save_to_mega_acc,
                    componentClassname: isCompact ? null : baseClass,
                    icon: 'sprite-fm-mono icon-cloud-upload-thin-outline',
                    iconSize: 24,
                    onClick: start_import,
                    eventLog: 501058
                });
            };

            const handleResize = () => {
                if (page !== 'download') {
                    window.removeEventListener('resize', handleResize);
                    return;
                }
                header.classList.toggle('wrapped', header.clientHeight > 100);
            };

            window.addEventListener('resize', handleResize);
            handleResize();
        }

        openMenu(ev, submenu) {
            const target = ev.currentTarget.domNode;
            const {menu} = mega.ui;

            const close = (e) => {
                if (e.type !== 'click' || !target.contains(e.target)) {
                    menu.hide();
                    mega.ui.menu.trigger('close');
                }
            };

            const preventDefault = e => {
                e.preventDefault();
            };

            const onKeyDown = e => {
                if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
                    e.preventDefault();
                }
                if (e.key === 'Escape') {
                    close(e);
                }
            };

            menu.show({
                name: 'file-link-items',
                event: ev,
                eventTarget: target,
                contents: [submenu],
                pos: 'bottomRight',
                posOffset: {left: -11, top: 8},
                resizeHandler: true,
                onClose: () => {
                    document.removeEventListener('click', close);
                    window.removeEventListener('popstate', close);
                    window.removeEventListener('keydown', onKeyDown, false);
                    window.removeEventListener('wheel', preventDefault, {passive: false});
                    window.removeEventListener('touchmove', preventDefault, {passive: false});
                    target.classList.remove('active');
                },
                onShow: () => {
                    document.addEventListener('click', close);
                    window.addEventListener('popstate', close);
                    window.addEventListener('keydown', onKeyDown, false);
                    window.addEventListener('wheel', preventDefault, {passive: false});
                    window.addEventListener('touchmove', preventDefault, {passive: false});
                    target.classList.add('active');
                }
            });
        }

        set viewable(value) {
            this.renderActions(value);
        }

        set loading(value) {
            if (this.dlButton) {
                this.dlButton.loading = !!value;
            }
        }

        set downloadLabel(value) {
            const btn = this.dlButton;
            if (btn && value) {
                btn[btn.simpletip ? 'simpletip' : 'text'] = value;
            }
        }
    }

    // Download widgets
    class DlWidget extends MegaComponent {

        constructor(options) {

            super(options);

            this.type = options.type || 'progress';

            const {type, domNode} = this;
            const n = options.node;
            let node = null;
            let subNode = null;

            domNode.classList.add('dl-widget', 'theme-dark-forced', options.type);

            // Progress widget header
            if (type === 'progress') {
                node = ce('div', domNode, {class: 'header'});

                this.nameCn = ce('div', node, {class: 'name-cn'});
                ce('div', this.nameCn, {class: 'name'}).textContent = l.dl_widget_header;

                // Buttons wrapper
                this.headActionsCn = ce('div', node, {class: 'actions'});

                // Expand/collapse button
                this.expandBtn = new MegaButton({
                    parentNode: this.headActionsCn,
                    type: 'icon',
                    componentClassname: 'text-icon secondary coll-btn',
                    icon: 'sprite-fm-mono icon-chevron-down-thin-outline',
                    iconSize: 24,
                    simpletip: l.minimize,
                    simpletipPos: 'top',
                    onClick: (ev) => {
                        const btn = ev.currentTarget;
                        const {
                            infoCn, headActionsCn, nameCn, statusCn, prActions, subActionsCn
                        } = this;

                        eventlog(501064, btn.active ? 1 : 0);

                        // Maximize
                        if (btn.active) {
                            btn.active = false;
                            btn.simpletip = l.minimize;
                            options.parentNode.classList.remove('collapsed');
                            prActions.prepend(subActionsCn);
                            infoCn.append(statusCn);
                        }
                        // Minimize
                        else {
                            btn.active = true;
                            btn.simpletip = l[20172];
                            options.parentNode.classList.add('collapsed');
                            headActionsCn.prepend(subActionsCn);
                            nameCn.prepend(statusCn);
                        }

                        for (const elm of subActionsCn.querySelectorAll('.simpletip')) {
                            elm.dataset.simpletipposition = btn.active ? 'top' : 'left';
                        }
                    },
                });

                // Close widget button
                this.closeBtn = new MegaButton({
                    parentNode: this.headActionsCn,
                    type: 'icon',
                    componentClassname: 'text-icon secondary hidden',
                    icon: 'sprite-fm-mono icon-dialog-close-thin',
                    iconSize: 24,
                    simpletip: l[148],
                    simpletipPos: 'top',
                    onClick: () => mega.ui.dlPage.closeWidgets(),
                    eventLog: 501068
                });
            }

            // Widget content
            node = ce('div', domNode, {class: 'content'});

            // Progress widget content
            if (type === 'progress') {
                const filename = n.name;
                const extPos = filename.lastIndexOf('.') || filename.length;
                const cols = ce('div', node, {class: 'cols'});

                // Container with file name and dl status
                this.infoCn = ce('div', cols, {class: 'info-cn'});
                const nameNode = ce('div', this.infoCn, {class: 'filename'});
                ce('div', nameNode, {class: 'name'}).textContent = filename.slice(0, extPos);
                ce('span', nameNode, {class: 'ext'}).textContent = filename.slice(extPos);

                // Status container for moving to the header in case of widget collapse
                this.statusCn = ce('div', this.infoCn, {class: 'status'});
                this.statusCn.textContent = l.decrypting;

                // Container for all buttons
                this.prActions = ce('div', cols, {class: 'actions'});

                // Container for buttons for moving to the header in case of widget collapse
                this.subActionsCn = ce('div', this.prActions, {class: 'actions'});

                // Toggle pause/resume states
                this.togglePause = (pause) => {
                    const btn = this.pauseBtn;
                    if (pause) {
                        btn.active = false;
                        btn.icon = 'sprite-fm-mono icon-play-thin-outline';
                        btn.simpletip = l[1649];
                    }
                    else {
                        btn.active = true;
                        btn.icon = 'sprite-fm-mono icon-pause-thin-outline';
                        btn.simpletip = l.dl_pause_download;
                    }
                };

                // Pause/Resume button
                this.pauseBtn = new MegaButton({
                    parentNode: this.subActionsCn,
                    type: 'icon',
                    componentClassname: 'text-icon secondary hidden',
                    icon: 'sprite-fm-mono icon-play-thin-outline-after',
                    iconSize: 24,
                    simpletip: l.dl_pause_download,
                    simpletipPos: 'left',
                    onClick: (ev) => {
                        const btn = ev.currentTarget;
                        const {dlStatus, pausedStatus} = mega.ui.dlPage;
                        this.togglePause(btn.active);

                        eventlog(501065, btn.active ? 1 : 0);

                        // Resume
                        if (btn.active) {
                            this.statusCn.textContent = dlStatus;
                            fm_tfsresume(`dl_${fdl_queue_var.ph}`);
                            if (mega.tpw && mega.tpw.initialized) {
                                mega.tpw.resumeDownloadUpload(mega.tpw.DOWNLOAD, { id: fdl_queue_var.ph });
                            }
                        }
                        // Pause
                        else {
                            this.statusCn.textContent = pausedStatus;
                            fm_tfspause(`dl_${fdl_queue_var.ph}`);
                            if (mega.tpw && mega.tpw.initialized) {
                                mega.tpw.pauseDownloadUpload(mega.tpw.DOWNLOAD, { id: fdl_queue_var.ph });
                            }
                        }
                    },
                });

                // Try again button is case of error
                this.tryAgainBtn = new MegaLink({
                    parentNode: this.subActionsCn,
                    text: l[1472],
                    type: 'text',
                    componentClassname: 'slim font-bold hidden',
                    onClick: () => {
                        mega.ui.dlPage.startDownload();
                    },
                    eventLog: 501069
                });

                // Show file location if its downloaded via MEGAsync
                this.locationBtn = new MegaLink({
                    parentNode: this.subActionsCn,
                    text: l.dl_show_location,
                    type: 'text',
                    componentClassname: 'slim font-bold hidden',
                    eventLog: 501070
                });

                // Cancel download button
                this.cancelDlBtn = new MegaButton({
                    parentNode: this.prActions,
                    type: 'icon',
                    componentClassname: 'text-icon secondary hidden',
                    icon: 'sprite-fm-mono icon-dialog-close-thin',
                    iconSize: 24,
                    simpletip: l[1196],
                    simpletipPos: 'right',
                    onClick: () => mega.ui.dlPage.cancelDownload(true),
                    eventLog: 501066
                });

                // Progress bar
                const barNode = ce('div', node, {class: 'progress-bar'});
                this.progressBar = ce('span', barNode, {class: 'bar'});
            }

            // Download MEGAsync app widget
            if (type === 'application') {
                node = ce('div', node, {class: 'cols auto-wrap'});
                subNode = ce('div', node, {class: 'spaced-col'});
                ce('i', subNode, {class: 'sprite-fm-uni icon-mega-logo icon-size-32'});

                // File taking too long to download?
                subNode = ce('div', node, {class: 'spaced-col grow'});
                ce('div', subNode, {class: 'content-text semibold'})
                    .textContent = l.dl_app_wg_header;
                ce('div', subNode, {class: 'content-text secondary small'})
                    .textContent = l.dl_app_wg_info;
                subNode = ce('div', node, {class: 'spaced-col'});

                // Download MEGAsync button
                subNode = new MegaButton({
                    parentNode: subNode,
                    text: l.dl_install_desktop_app,
                    componentClassname: 'secondary',
                    onClick: () => {
                        dlmanager.showMEGASyncOverlay(fdl_filesize > maxDownloadSize);
                    },
                    eventLog: 501067
                });
            }

            // Commericals widget
            if (type === 'ads') {
                ce('div', node, {class: 'content-text'}).textContent = l.dl_ads_wg_header;
                ce('div', node, {class: 'commercial-wrapper', id: 'commercial-wrapper-webfilinkbs'});
                ce('div', node, {class: 'content-text secondary'})
                    .append(parseHTML(l.dl_upgade_to_hide_ads));
            }
        }

        hide() {
            this.domNode.classList.add('vo-hidden');
            this.isVisible = false;
            delay(`dlPage:hide${this.type}Wg`, () => super.hide(), 600);
        }

        show() {
            this.isVisible = true;
            super.show();
            delay(`dlPage:show${this.type}Wg`, () => this.domNode.classList.remove('vo-hidden'));
        }
    }

    return freeze({
        data: Object.create(null),

        get appDl() {
            return this.data.appDl;
        },

        set appDl(value) {
            this.data.appDl = !!value;
        },

        get dlStatus() {
            const perc = this.progressValue ? ` (${this.progressValue}%)` : '';
            return `${this.appDl ? l.dl_downloading_via_app : l.decrypting}${perc}`;
        },

        get pausedStatus() {
            const perc = this.progressValue ? `\u2026 (${this.progressValue}%)` : '';
            return `${this.appDl ? l.dl_paused_in_the_app : l[1651]}${perc}`;
        },

        get isInitialized() {
            return this.data.isInitialized;
        },

        set isInitialized(value) {
            this.data.isInitialized = !!value;
        },

        get progressValue() {
            return this.data.percs;
        },

        set progressValue(value) {
            this.data.percs = value;
            this.data.progressWg.progressBar.style.width = `${value || 0}%`;
        },

        set loading(value) {
            const {header, dlButton} = this.data;
            const text = value ? l[1156] : l[58];

            // Set "Download"/"Downloading" label/tip
            this.downloadLabel = text;

            // Show loader spinner in header
            header.loading = !!value;

            // Show loader spinner in body for non-previewable file
            if (dlButton) {
                dlButton.loading = !!value;
            }
        },

        set downloadLabel(value) {
            const {header, dlButton} = this.data;

            if (value) {
                header.downloadLabel = value;

                if (dlButton) {
                    dlButton.text = value;
                }
            }
        },

        init(res = {}) {
            const hcn = startNode.querySelector('.dl-header-container');
            const wcn = startNode.querySelector('.dl-widget-container');

            hcn.textContent = '';
            wcn.textContent = '';

            this.data.dlPage = startNode.querySelector('.download-page');
            this.data.dlPage.classList.remove('hidden');

            this.data.header = new DlHeader({
                parentNode: hcn
            });

            this.data.adsWg = new DlWidget({
                parentNode: wcn,
                componentClassname: 'hidden vo-hidden',
                type: 'ads'
            });

            this.data.appWg = new DlWidget({
                parentNode: wcn,
                componentClassname: 'hidden vo-hidden',
                type: 'application'
            });

            this.data.progressWg = new DlWidget({
                parentNode: wcn,
                componentClassname: 'hidden vo-hidden',
                type: 'progress',
                node: dl_node
            });

            this.isInitialized = false;
            this.progressValue = 0;
            this.data.msd = res.msd || 0;
        },

        updateUI(viewable, type) {
            const {dlPage, header} = this.data;

            header.viewable = viewable;
            dlPage.classList.remove('video', 'video-theatre-mode');

            if (type === 'image') {
                return this.renderImage();
            }

            if (type === 'video') {
                dlPage.classList.add('video');
                dlPage.querySelector('.download.video-block').classList.remove('hidden');
                return false;
            }

            if (type === 'text') {
                return this.renderText();
            }

            this.renderFile();
        },

        renderImage() {
            const {dlPage} = this.data;
            const preview = dlPage.querySelector('.download.image-block');
            const viewerCn = document.querySelector('.media-viewer-container');

            if (viewerCn) {
                const viewer = viewerCn.querySelector('.media-viewer');
                preview.textContent = '';
                preview.append(viewerCn);
                viewer.removeAttribute('style');
            }

            preview.classList.remove('hidden');
            window.mediaConIsDl = true;
            slideshow(dl_node.h);
        },

        renderText() {
            const {dlPage} = this.data;
            const textCn = dlPage.querySelector('.js-text-viewer');
            const loaderCn = textCn.querySelector('.viewer-pending');
            const icon = dlPage.querySelector('.js-text-viewer-icon');

            const handleLoader = (show) => loaderCn
                && loaderCn.classList[show ? 'remove' : 'add']('hidden');

            textCn.classList.remove('hidden');
            handleLoader(true);

            M.require('codemirror_js', 'codemirrorscroll_js').dump('cm.preload');

            // Handle partial content for big text-files
            const CHUNK_SIZE = 32768;
            const partial = dl_node.s > CHUNK_SIZE;
            const cached = mega.fileTextEditor.getCachedData(dl_node.link);

            const fetchText = (partial) =>
                M.gfsfetch(dl_node.link, 0, partial ? CHUNK_SIZE : -1)
                    .then(r => mega.fileTextEditor.getTextFromBuffer(r.buffer));

            if (cached) {
                mega.textEditorUI.setupEditor(
                    dl_node.name,
                    cached.text,
                    dlpage_ph,
                    true,
                    $(textCn)
                );

                window.textConIsDl = true;
                handleLoader();
                return;
            }

            return fetchText(partial)
                .then(txt => {
                    if (self.dl_node && dl_node.name) {
                        // Save and display text
                        mega.fileTextEditor.cacheData(dl_node.link, txt, partial);

                        handleLoader();
                        window.textConIsDl = true;
                        mega.textEditorUI.setupEditor(dl_node.name, txt, dlpage_ph, true, $(textCn));

                        return partial && mBroadcaster.when('txt.viewer:scroll-bottom');
                    }
                })
                .then((editor) => {
                    if (editor) {
                        handleLoader(true);

                        const ln = editor.lineCount();

                        return fetchText(false)
                            .then(fullTxt => {
                                mega.fileTextEditor.cacheData(dl_node.link, fullTxt, false);
                                editor.setValue(fullTxt);
                                editor.scrollIntoView(ln);
                            });
                    }
                })
                .catch((ex) => {
                    if (icon) {
                        icon.classList.remove('hidden');
                    }
                    if (d) {
                        console.error('Failed to read as text from buffer.', ex);
                    }
                })
                .finally(handleLoader);
        },

        renderFile() {
            const {dlPage} = this.data;
            const filename = dl_node.name || 'unknown.bin';
            const extPos = filename.lastIndexOf('.') || filename.length;

            // Main container
            let wrap = dlPage.querySelector('.download.info-block');

            wrap.textContent = '';
            wrap.classList.remove('hidden');
            wrap = ce('div', wrap, {class: 'nv-container'});
            wrap = ce('div', wrap, {class: 'body'});

            let node = ce('div', wrap, {class: 'content'});

            // Filetype icon
            ce('i', node, {class: `item-type-icon-90 icon-${fileIcon({name: filename})}-90`});

            // File name
            let subNode = ce('div', node, {class: 'info'});
            ce('span', subNode, {class: 'overflow'}).textContent = filename.slice(0, extPos);
            ce('span', subNode).textContent = filename.slice(extPos);

            // File size and type
            subNode = ce('div', node, {class: 'info sm-size'});
            ce('span', subNode).textContent = bytesToSize(dl_node.s);
            ce('span', subNode).textContent = filetype(dl_node);

            // Info banner
            subNode = ce('div', node, {class: 'banner'});
            ce('i', subNode, {class: 'sprite-fm-mono icon-alert-circle-thin-outline'});
            ce('span', subNode).textContent = l.non_previewable_tip;

            // Buttons conatainer
            node = ce('div', wrap, {class: 'footer'});

            // Download
            this.data.dlButton = MegaButton.factory({
                parentNode: node,
                text: l[58],
                componentClassname: 'lg-size secondary icon-loading visible-txt',
                icon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                iconSize: 24,
                loaderIcon: 'icon-loader-throbber-dark-outline-after',
                onClick: () => this.startDownload(),
                eventLog: 501056
            });

            // Save to MEGA
            MegaButton.factory({
                parentNode: node,
                text: self.u_attr ? l.btn_imptomega : l.save_to_mega_acc,
                componentClassname: 'lg-size',
                icon: 'sprite-fm-mono icon-cloud-upload-thin-outline',
                iconSize: 24,
                onClick: start_import,
                eventLog: 501058
            });
        },

        startDownload(forceBrowserDl) {
            if (!forceBrowserDl) {
                loadingDialog.show('dl-msync-check');
                megasync.isInstalled((err, is) => {
                    loadingDialog.hide('dl-msync-check');
                    if (!err && is) {
                        // If 'msd' (MegaSync download) flag is turned on and application is installed
                        if (this.data.msd === 0) {
                            dlmanager.showMEGASyncOverlay(fdl_filesize > maxDownloadSize);
                        }
                        else {
                            $('.megasync-overlay', 'body').removeClass('downloading'); // @todo: revamp

                            megasync.download(dlpage_ph, a32_to_base64(base64_to_a32(dlkey).slice(0, 8)), (err) => {
                                if (err) {
                                    this.startDownload(true);
                                }
                            }, true);
                            eventlog(501031);
                            this.appDl = true;
                            this.showInitUI();
                        }
                    }
                    else {
                        this.startDownload(true);
                    }
                });
            }
            else if (fdl_filesize > maxDownloadSize) {
                this.appDl = true;
                dlmanager.showMEGASyncOverlay(true);
            }
            // Downloaded previewed file (Save)
            else if (Object(previews[dlpage_ph]).full) {
                dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);
                this.showCompleteUI();
                eventlog(501030);
                M.saveAs(previews[dlpage_ph].buffer, dl_node.name);
            }
            // Save downloaded file
            else if (dlResumeInfo && dlResumeInfo.byteLength === fdl_filesize) {
                eventlog(501033);
                dlPageStartDownload();
            }
            // Start downloading
            else {
                watchdog.query('dling')
                    .always((res) => {
                        var proceed = true;

                        if (Array.isArray(res)) {
                            res = Array.prototype.concat.apply([], res);
                            proceed = !res.includes(dlmanager.getGID({ph: dlpage_ph}));
                        }

                        if (proceed) {
                            dlmanager.getFileSizeOnDisk(dlpage_ph, dl_node.name)
                                .always((size) => {
                                    if (size === fdl_filesize) {
                                        // another tab finished the download
                                        dlResumeInfo = Object.assign({}, dlResumeInfo, {byteLength: size});
                                        this.updateDlOptions(fdl_filesize, false);
                                        dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);
                                    }

                                    if (dlResumeInfo && dlResumeInfo.byteLength === dlResumeInfo.byteOffset) {
                                        eventlog(501032); // Resume
                                    }
                                    else {
                                        eventlog(501030); // Stardart dl
                                    }

                                    dlPageStartDownload();
                                });
                        }
                        // another tab is downloading this
                        else {
                            setTransferStatus(0, l[18]); // Too many connections for this download
                        }
                    });
            }

            return false;
        },

        async cancelDownload(hide) {
            if (dlResumeInfo) {
                await M.delPersistentData(dlmanager.getResumeInfoTag({ ph: dlpage_ph })).catch(nop);
                dlResumeInfo = false;
            }

            dlmanager.abort(dlmanager.getGID(fdl_queue_var));
            fdl_queue_var = false;

            this.updateDlOptions();

            if (hide) {
                this.closeWidgets();
            }

            if (mega.tpw) {
                mega.tpw.removeRow(dlpage_ph);
            }
        },

        updateDlOptions(byteLength) {
            let txt = l[58]; // Download

            // this.closeWidgets();
            this.loading = false;

            byteLength = byteLength || dlResumeInfo.byteLength;
            if (dlResumeInfo) {
                if (byteLength === fdl_filesize) {
                    txt = l[776]; // Save
                }
                // Resume
                else if (byteLength === dlResumeInfo.byteOffset) {
                    txt = l[1649]; // Resume
                }
            }
            this.downloadLabel = txt;
        },

        showInitUI() {
            const {progressWg, appWg} = this.data;
            const {
                cancelDlBtn, closeBtn, pauseBtn, locationBtn,
                statusCn, tryAgainBtn, expandBtn
            } = progressWg;

            cancelDlBtn.hide();
            closeBtn.hide();
            pauseBtn.hide();
            locationBtn.hide();
            tryAgainBtn.hide();
            expandBtn.show();

            statusCn.classList.remove('complete', 'error');
            statusCn.textContent = `${l[1042]}\u2026`; // Initializing...

            this.loading = true;
            progressWg.show();

            // Show download via app widget
            appWg[(this.appDl || dl_node.s <= maxSizeBytes) ? 'hide' : 'show']();
        },

        showPausedUI(msg) {
            const {progressWg} = this.data;
            const {cancelDlBtn, pauseBtn, statusCn} = progressWg;

            this.showInitUI();
            this.isInitialized = false;

            progressWg.togglePause(true);
            statusCn.textContent = msg || this.pausedStatus;
            statusCn.classList.remove('complete', 'error');

            if (this.appDl) {
                return;
            }

            cancelDlBtn.show();
            pauseBtn.show();
        },

        async showErrorUI(opts = {}) {
            const {msg, fatalError} = opts;
            const {progressWg} = this.data;
            const {cancelDlBtn, pauseBtn, statusCn, tryAgainBtn} = progressWg;

            if (!progressWg.isVisible) {
                return false;
            }

            this.showInitUI();
            this.isInitialized = false;

            progressWg.togglePause(true); // Show Resume state
            statusCn.classList.add('error');
            statusCn.textContent = '';
            ce('i', statusCn, {class: 'sprite-fm-mono icon-alert-triangle-thin-outline'});
            ce('span', statusCn).textContent =
                msg || (this.appDl ? l.dl_download_failed : l.dl_decryption_failed);

            if (fatalError) {
                await this.cancelDownload().catch(nop);
                tryAgainBtn.show();
                return;
            }

            if (!this.appDl) {
                cancelDlBtn.show();
                pauseBtn.show();
            }

            tryAgainBtn.hide();
        },

        showProgressUI(perc = 0) {
            const {progressWg} = this.data;
            const {cancelDlBtn, pauseBtn, statusCn} = progressWg;

            if (perc) {
                perc = Math.round(perc);
                this.progressValue = perc;
            }
            statusCn.textContent = this.dlStatus;
            statusCn.classList.remove('complete', 'error');

            if (this.isInitialized) {
                if (perc >= 100) {
                    this.showCompleteUI();
                }
                // Do not update UI is DL is in progress
                return;
            }

            // Do not show for Save or Resume states after page refresh
            if (perc === 100 || !dlmanager.isDownloading) {
                return;
            }

            this.isInitialized = true;
            this.showInitUI();

            if (this.appDl) {
                return;
            }
            cancelDlBtn.show();
            pauseBtn.show();
            progressWg.togglePause(); // Show Pause state
        },

        showSaveUI() {
            const {appWg, adsWg, header, progressWg} = this.data;

            header.hideLoader();
            progressWg.hide();
            appWg.hide();
            adsWg.hide();
        },

        showCompleteUI(opts = {}) {
            const {msg, ns} = opts;
            const {progressWg} = this.data;
            const {closeBtn, locationBtn, statusCn, expandBtn} = progressWg;

            this.showInitUI();

            if (msg) {
                statusCn.textContent = msg;
            }
            else {
                statusCn.textContent = '';
                statusCn.classList.add('complete');
                ce('i', statusCn, {class:'sprite-fm-mono icon-check-circle-thin-outline'});
                ce('span', statusCn).textContent = this.appDl ?
                    l.dl_download_complete : l.tfw_header_complete;
            }

            this.isInitialized = false;
            this.progressValue = 100;
            this.loading = false;
            closeBtn.show();
            expandBtn.hide();

            if (ns) {
                locationBtn.on('click.openLocation', () => {
                    ns.megaSyncRequest({a: 'sf', h: dlpage_ph}).dump();
                    return false;
                });
                locationBtn.show();
            }
        },

        closeWidgets() {
            const {appWg, adsWg, progressWg} = this.data;

            this.isInitialized = false;
            this.progressValue = 0;
            this.loading = false;
            progressWg.hide();
            appWg.hide();
            adsWg.hide();
        },
    });
});
