class MegaMobileViewOverlay extends MegaMobileComponent {

    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('custom-alpha', 'overlay-wrap');

        const overlay = document.createElement('div');
        overlay.className = `${options.wrapperClassname} custom-alpha`;
        this.domNode.appendChild(overlay);

        // Build container
        overlay.append(document.getElementById('view-file-template').content.cloneNode(true));

        // Build header
        const backLink = new MegaMobileLink({
            parentNode: overlay.querySelector('.media-viewer-menu'),
            type: 'icon',
            componentClassname: 'text-icon back',
            icon: 'sprite-mobile-fm-mono icon-arrow-left-thin-outline',
            iconSize: 24
        });
        backLink.on('tap.back', () => {
            if (this.nodeComponent.previewable) {
                history.back();
            }
            this.hide();
        });

        const contextMenuButton = new MegaMobileButton({
            type: 'icon',
            parentNode: overlay.querySelector('.media-viewer-menu'),
            icon: 'sprite-mobile-fm-mono icon-more-horizontal-thin-outline',
            iconSize: 28,
            componentClassname: 'context-btn open-context-menu text-icon'
        });
        contextMenuButton.on('tap', () => {
            if (!mega.ui.contextMenu) {
                mega.ui.contextMenu = new MegaMobileContextMenu();
            }

            this.trigger('pauseStreamer');

            mega.ui.contextMenu.show(this.nodeComponent.handle);
            return false;
        });

        // Stop native zoom in
        this.domNode.addEventListener('touchmove', event => {

            if (event.touches.length > 1) {
                event.preventDefault();
            }
        });
    }

    get visible() {
        return this.domNode.classList.contains('active');
    }

    /**
     * Show the layout when it fails to load the first time (e.g. for deactivated accounts visiting a file link)
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    async showLayout(nodeHandle) {
        this.setNode(nodeHandle);

        const isPreviewable = this.nodeComponent.previewable;
        const isLink = this.nodeComponent.node.link;
        const downloadSupport = await MegaMobileViewOverlay.checkSupport(this.nodeComponent.node);

        this.bottomBar = new MegaMobileBottomBar({
            parentNode: this.domNode.querySelector('.media-viewer-container footer .image-controls'),
            actions: this.getActionsArray(downloadSupport, isLink, isPreviewable),
            adWrapper: 'adFile'
        });

        if (isPreviewable) {
            this.domNode.querySelector('.media-viewer-container .content').classList.remove('hidden');
            this.domNode.querySelector('.media-viewer-container .content-info').classList.add('hidden');
        }
        else {
            this.domNode.querySelector('.media-viewer-container .content').classList.add('hidden');
            this.domNode.querySelector('.media-viewer-container .content-info').classList.remove('hidden');
        }

        if (!is_video(this.nodeComponent.node)) {
            this.domNode.querySelector('.video-block').classList.add('hidden');
        }

        this.domNode.querySelector('.media-viewer-container').classList.remove('hidden');
        this.domNode.querySelector('.img-wrap').classList.add('hidden');
        this.domNode.querySelector('.gallery-btn.previous').classList.add('hidden');
        this.domNode.querySelector('.gallery-btn.next').classList.add('hidden');
        this.domNode.querySelector('.viewer-pending').classList.add('hidden');

        this.domNode.classList.add('active');
        this.domNode.parentNode.classList.remove('hidden');

        mainlayout.classList.add('fm-overlay-link');

        mobile.appBanner.updateBanner(nodeHandle);
    }

    /**
     * Show the overlay
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    async show(nodeHandle) {
        this.setNode(nodeHandle);

        if (this.visible) {
            return;
        }

        const isPreviewable = this.nodeComponent.previewable;
        const isLink = this.nodeComponent.node.link;
        const downloadSupport = await MegaMobileViewOverlay.checkSupport(this.nodeComponent.node);

        // Build bottom bar
        if (this.bottomBar) {
            this.bottomBar.destroy();
        }

        if (!M.currentrootid || M.currentrootid !== M.RubbishID) {

            this.bottomBar = new MegaMobileBottomBar({
                parentNode: this.domNode.querySelector('.media-viewer-container footer .image-controls'),
                actions: this.getActionsArray(downloadSupport, isLink, isPreviewable),
                adWrapper: 'adFile'

            });

            if (mobile.cloud.bottomBar) {
                mobile.cloud.bottomBar.hide();
            }
        }

        if (isPreviewable) {
            this.domNode.querySelector('.media-viewer-container .content').classList.remove('hidden');
            this.domNode.querySelector('.media-viewer-container .content-info').classList.add('hidden');
        }
        else {
            // If user taps the browser's back button, push fake states of history/hash so they
            // only go back one page rather than two (ref: imagesViewer.js 935 - 956)
            pushHistoryState();
            pushHistoryState(true);

            this.domNode.querySelector('.media-viewer-container .content').classList.add('hidden');
            this.domNode.querySelector('.media-viewer-container .content-info').classList.remove('hidden');

            // Set file name and image
            this.domNode.querySelector('.media-viewer-container').classList.remove('hidden');
            this.domNode.querySelector('.media-viewer-container .file-name').textContent = this.nodeComponent.name;
            this.domNode.querySelector('.media-viewer-container .filetype-img i').className =
                this.nodeComponent.icon;

            if (downloadSupport) {
                if (this.inlineAlert) {
                    this.inlineAlert.hide();
                }
            }
            else if (this.inlineAlert) {
                this.inlineAlert.show();
            }
            else {
                this.inlineAlert = mobile.inline.alert.create({
                    parentNode: this.domNode.querySelector('.media-viewer-container .content-info'),
                    text: l.view_file_too_large,
                    icon: 'sprite-mobile-fm-mono icon-info-thin-outline',
                    iconSize: '24',
                    closeButton: false,
                    componentClassname: 'warning',
                });
            }
        }

        this.domNode.parentNode.classList.remove('hidden');

        // Show view file overlay
        this.domNode.classList.add('active');
        const fmlist = document.getElementById('file-manager-list-container');

        if (fmlist) {
            fmlist.classList.add('hidden');
        }

        if (isLink) {
            mainlayout.classList.add('fm-overlay-link');
        }
        else {
            mainlayout.classList.add('fm-overlay-view');
        }

        mobile.appBanner.updateBanner(nodeHandle);

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        }
    }

    /**
     * Hide the overlay
     * @returns {void}
     */
    hide() {
        this.domNode.classList.remove('active');

        const fmlist = M.v.length > 0 && document.getElementById('file-manager-list-container');

        if (fmlist) {

            fmlist.classList.remove('hidden');

            // make sure resize is triggered after hidden is gone for render megalist correctly
            $(window).trigger('resize');
        }

        mainlayout.classList.remove('fm-overlay-view', 'fm-overlay-link');

        if (mobile.cloud.bottomBar) {
            mobile.cloud.bottomBar.show();
        }

        if (folderlink) {
            const bannerHandle = M.currentdirid === M.currentrootid ? pfid : M.currentdirid;
            mobile.appBanner.updateBanner(bannerHandle);
        }
        else {
            mobile.appBanner.hide();
        }

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        }
    }

    /**
     * Set current node
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    setNode(nodeHandle) {
        this.nodeComponent = MegaMobileNode.getNodeComponentByHandle(nodeHandle) ||
            new MegaMobileNode({parentNode: document.createElement('div'), nodeHandle: nodeHandle});

        this.domNode.querySelector('.media-viewer-container .file-name').textContent = this.nodeComponent.name;

        if (is_video(this.nodeComponent.node)) {

            this.rebind('pauseStreamer', () => {

                const video = mega.ui.viewerOverlay.domNode.querySelector('#mobile-video');

                if (video && !video.paused && !video.ended) {
                    video.pause();
                }
            });
        }
        else {
            this.off('pauseStreamer');
        }
    }

    /**
     * Get actions depending of file parameters
     * @param {Boolean} downloadSupport File downloadable
     * @param {Boolean} isLink File Link
     * @param {Boolean} isPreviewable File Previewable
     * @returns {Array} Array with applicable actions
     */
    getActionsArray(downloadSupport, isLink, isPreviewable) {

        if (!downloadSupport) {
            return [
                [
                    ['openapp-button', l.view_file_open_in_app, () => {

                        eventlog(99912);

                        this.trigger('pauseStreamer');
                        goToMobileApp(MegaMobileViewOverlay.getAppLink(this.nodeComponent.handle));
                    }]
                ]
            ];
        }
        if (isLink) {
            return [
                [
                    ['openapp-button', l.view_file_open_in_app, () => {

                        eventlog(99912);

                        this.trigger('pauseStreamer');
                        goToMobileApp(MegaMobileViewOverlay.getAppLink(this.nodeComponent.handle));
                    }]
                ],
                [
                    ['download-button', 'icon-download-thin', () => {
                        if (!validateUserAction()) {
                            return false;
                        }

                        eventlog(99913);

                        this.trigger('pauseStreamer');
                        mobile.downloadOverlay.startDownload(this.nodeComponent.handle);
                        return false;
                    }]
                ]
            ];
        }
        if (isPreviewable) {
            return [
                [
                    ['sharelink-button', l[5622], () => {
                        if (!validateUserAction()) {
                            return false;
                        }
                        this.trigger('pauseStreamer');
                        mobile.linkManagement.showOverlay(this.nodeComponent.handle);
                        return false;
                    }]
                ],
                [
                    ['download-button', 'icon-download-thin', () => {
                        if (!validateUserAction()) {
                            return false;
                        }

                        eventlog(99913);

                        this.trigger('pauseStreamer');
                        mobile.downloadOverlay.startDownload(this.nodeComponent.handle);
                        return false;
                    }],
                    ['slideshow-button', 'icon-play-square-thin-outline', function() {
                        $('.media-viewer-container footer .v-btn.slideshow').trigger('click');
                    }]
                ]
            ];
        }
        return [
            [
                ['sharelink-button', l[5622], () => {
                    if (!validateUserAction()) {
                        return false;
                    }
                    this.trigger('pauseStreamer');
                    mobile.linkManagement.showOverlay(this.nodeComponent.handle);
                    return false;
                }]
            ],
            [
                ['download-button', 'icon-download-thin', () => {
                    if (!validateUserAction()) {
                        return false;
                    }

                    eventlog(99913);

                    this.trigger('pauseStreamer');
                    mobile.downloadOverlay.startDownload(this.nodeComponent.handle);
                    return false;
                }]
            ]
        ];
    }

    /**
     * Gets the relevant link for the app depending on if a public file link, public folder link or in the cloud drive
     *
     * @param {String} nodeHandle The internal node handle of the folder or file
     * @returns {String} Returns an app link in the following format:
     *
     * 1) #!<public-file-handle>!<key> Generic public file link, downloads the file. This scenario is handled by
     * the direct download page logic not here.
     * 2) #F!<public-folder-handle>!<key> Generic public folder link, opens the folder for viewing.
     * 3) #F!<public-folder-handle>!<key>!<internal-node-handle> Public folder link that will open the sub folder
     * for viewing if the internal node handle is a folder, or will start downloading the file if the internal node
     * handle is a file.
     * 4) #<internal-node-handle> If the internal node handle is a folder and they are logged into the same
     * account, it opens the folder for viewing in the app. If it is a file and they are logged into the same account,
     * then it starts downloading the file. If the internal node handle is not recognised in that account, the app will
     * throw an error dialog saying they need to log into that account.
     */
    static getAppLink(nodeHandle) {

        // If a public file link, add the base file handle and key
        if (typeof dlpage_ph !== 'undefined' && typeof dlpage_key !== 'undefined') {
            return `#!${  dlpage_ph  }!${  dlpage_key}`;
        }

        // Otherwise if a public folder
        else if (pfid && pfkey) {

            // If it is a public collection/set
            if (pfcol) {
                return `collection/${pfid}#${pfkey}`;
            }
            // If subfolder or file is specified, add it to the base folder handle and key
            else if (nodeHandle === undefined || pfid === nodeHandle) {
                // Otherwise return the base folder handle and key
                return `#F!${  pfid  }!${  pfkey}`;
            }

            return `#F!${  pfid  }!${  pfkey  }!${  nodeHandle}`;
        }

        // Otherwise if in regular cloud drive, return just the node handle
        return `#${  nodeHandle}`;
    }

    /**
     * Check if the download is supported for current mobile browser & OS
     *
     * @param {Object} node Node
     * @returns {Promise}
     */
    static async checkSupport(node) {

        let supported = true;

        if (is_uc_browser || node.type === 1 && is_ios || ua.details.brand === 'Edgios') {
            supported = false;
        }
        else {
            const maxFileSize =  await dlmanager.getMaximumDownloadSize();

            if ((node.t === 1 ? node.tb : node.s) > maxFileSize || !dlmanager.canSaveToDisk(node)) {
                supported = false;
            }
        }

        return supported;
    }

    static init() {

        // Create and handle a specific overlay for file view
        // Note that this will be displayed inside the file-manager-block
        mega.ui.viewerOverlay = new MegaMobileViewOverlay({
            parentNode: document.querySelector('.file-manager-block'),
            componentClassname: 'mega-overlay mega-overlay-view',
            wrapperClassname: 'overlay'
        });

        const _hide = () => {
            if (mega.ui.viewerOverlay.visible) {
                mega.ui.viewerOverlay.hide();
            }
        };

        mobile.appBanner.hide();

        window.removeEventListener('popstate', _hide);
        window.addEventListener('popstate', _hide);
        mBroadcaster.addListener('beforepagechange', _hide);
    }
}
