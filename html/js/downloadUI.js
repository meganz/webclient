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
            let node = ce('div', header, {class: 'fileinfo'});
            let subNode = ce('div', node, {class: 'filename'});
            ce('div', subNode, {class: 'name'}).textContent = filename.slice(0, extPos);
            ce('span', subNode, {class: 'ext'}).textContent = filename.slice(extPos);
            ce('span', node, {class: 'size'}).textContent = bytesToSize(dl_node.s);

            node = ce('div', header, {class: 'actions'});

            // Report Abuse button
            subNode = new MegaButton({
                parentNode: node,
                type: 'icon',
                componentClassname: 'text-icon secondary',
                icon: 'sprite-fm-mono icon-message-alert',
                iconSize: 24,
                simpletip: l.btn_reportabuse,
                simpletipPos: 'bottom',
                onClick: () => {
                    M.require('reportabuse_js').done(() => {
                        window.disableVideoKeyboardHandler = true;
                        mega.ui.ReportAbuse = new ReportAbuse(); // @todo: revamp dialog
                    });
                },
                eventLog: 501059
            });

            // Download/Save/Resume button
            this.dlButton = new MegaButton({
                parentNode: node,
                type: 'icon',
                componentClassname: 'text-icon secondary',
                icon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                iconSize: 24,
                loaderIcon: 'icon-loader-throbber-dark-outline-after',
                simpletip: l[58],
                simpletipPos: 'bottom',
                onClick: () => {
                    mega.ui.dlPage.startDownload();
                },
                eventLog: 501056
            });

            // Share link button
            subNode = new MegaButton({
                parentNode: node,
                type: 'icon',
                componentClassname: 'text-icon secondary',
                icon: 'sprite-fm-mono icon-link-thin-outline',
                iconSize: 24,
                simpletip: l[1394],
                simpletipPos: 'bottom',
                onClick: () => {
                    // @todo get rid of this '$.itemExport' ...
                    $.itemExport = [dlpage_ph];

                    mega.Share.ExportLink.pullShareLink($.itemExport, {showExportLinkDialog: true})
                        .catch(tell)
                        .finally(() => {
                            $(this).removeClass('disabled');
                        });
                },
                eventLog: 501057
            });

            // Save to MEGA button
            subNode = new MegaButton({
                parentNode: node,
                text: l.btn_imptomega,
                icon: 'sprite-fm-mono icon-cloud-upload-thin-outline icon-size-24',
                onClick: () => start_import(),
                eventLog: 501058
            });

            // Resize handler to change the order of wrapped buttons
            const handleResize = () => {
                if (page !== 'download') {
                    window.removeEventListener('resize', handleResize);
                    return false;
                }
                if (header.clientHeight > 100) {
                    header.classList.add('wrapped');
                }
                else {
                    header.classList.remove('wrapped');
                }
            };

            window.addEventListener('resize', handleResize);
            handleResize();
        }

        get loader() {
            return this.dlButton.loading;
        }

        set loader(value) {
            this.dlButton.loading = !!value;
        }

        set downloadTip(value) {
            if (value) {
                this.dlButton.simpletip = value;
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

        init(res = {}) {
            const hcn = startNode.querySelector('.dl-header-container');
            const wcn = startNode.querySelector('.dl-widget-container');

            startNode.querySelector('.download-page').classList.remove('hidden');
            hcn.textContent = '';
            wcn.textContent = '';

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

        startDownload() {
            // Start download with MEGAsync
            if (this.appDl) {
                loadingDialog.show();
                megasync.isInstalled((err, is) => {
                    loadingDialog.hide();

                    // If 'msd' (MegaSync download) flag is turned on and application is installed
                    if (this.data.msd !== 0 && (!err || is)) {
                        $('.megasync-overlay', 'body').removeClass('downloading'); // @todo: revamp

                        megasync.download(dlpage_ph, a32_to_base64(base64_to_a32(dlkey).slice(0, 8)), (err) => {
                            if (err) {
                                this.appDl = false;
                                this.startDownload();
                            }
                        }, true);
                        eventlog(501031);
                        dlPageStartDownload(true);
                    }
                    else {
                        dlmanager.showMEGASyncOverlay(fdl_filesize > maxDownloadSize);
                    }
                });
            }
            // Show Download MEGAsync app dialog
            else if (fdl_filesize > maxDownloadSize) {
                this.appDl = true;
                dlmanager.showMEGASyncOverlay(true);
            }
            // Save downloaded file
            else if (Object(previews[dlpage_ph]).full) {
                dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);
                this.showCompleteUI();
                eventlog(501033);
                M.saveAs(previews[dlpage_ph].buffer, dl_node.name);
            }
            // Complete downloading
            else if (dlResumeInfo && dlResumeInfo.byteLength === fdl_filesize) {
                eventlog(501030);
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
                                        onDownloadReady();
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
            this.updateAppDlFlag();

            if (hide) {
                this.closeWidgets();
            }

            if (mega.tpw) {
                mega.tpw.removeRow(dlpage_ph);
            }
        },

        updateAppDlFlag() {
            if (fdl_filesize > maxDownloadSize) {
                this.appDl = true;
            }
            else if (dlResumeInfo) {
                this.appDl = false;
            }
            else {
                megasync.isInstalled((err, is) => {
                    this.appDl = !!(!err && is);
                });
            }
        },

        updateDlOptions(byteLength, appDl) {
            const {header} = this.data;
            let tip = l[58]; // Download

            // Update application download if needed
            if (appDl !== undefined) {
                this.appDl = appDl;
            }

            // this.closeWidgets();
            header.loader = false;

            byteLength = byteLength || dlResumeInfo.byteLength;
            if (dlResumeInfo) {
                if (byteLength === fdl_filesize) {
                    tip = l[776]; // Save
                }
                // Resume
                else if (byteLength === dlResumeInfo.byteOffset) {
                    tip = l[1649]; // Resume
                }
            }
            header.downloadTip = tip;
        },

        showInitUI() {
            const {header, progressWg, appWg} = this.data;
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

            header.loader = true;
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
                this.progressValue = perc;
            }
            statusCn.textContent = this.dlStatus;
            statusCn.classList.remove('complete', 'error');

            if (this.isInitialized) {
                if (perc === 100) {
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
            const {header, progressWg} = this.data;
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
            header.loader = false;
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
            const {appWg, adsWg, header, progressWg} = this.data;

            this.isInitialized = false;
            this.progressValue = 0;
            header.loader = false;
            progressWg.hide();
            appWg.hide();
            adsWg.hide();
        },
    });
});
