/**
 * Code to trigger the mobile file manager download overlay and related behaviour
 */
mobile.downloadOverlay = {

    /** Download start time in milliseconds */
    startTime: null,
    downloadTransfer: null,
    downloadResumedOnPageRefresh: false,

    /** Attributes used by the timer to avoid frozen situations */
    timer: null,
    frozenTimeout: 6e4, // 60 sec

    /** Attributes used by the OBQ dialog (mobile.overBandwidthQuota) */
    node: null,

    /**
     * Download a node by its handle.
     * If:
     *    - File   -> Start File Download
     *    - Folder -> Start Download as ZIP
     */
    startDownload(nodeHandle) {
        'use strict';

        const n = M.d[nodeHandle] || false;

        if (!n) {
            return msgDialog('error', l[1578], l[8982]);
        }

        if (n.t) {
            return this.startDownloadAsZip(nodeHandle);
        }

        if (previews[nodeHandle] && previews[nodeHandle].full) {
            return M.saveAs(previews[nodeHandle].buffer, n.name);
        }

        this.startFileDownload(nodeHandle);
    },

    /**
     * Download files as zip.
     * Fetches nodes from db first.
     * @param {Array|String} nodeHandles Array of node handles or a single node handle
     *
     * @returns {void}
     */
    startDownloadAsZip(nodeHandles) {
        'use strict';

        if (!Array.isArray(nodeHandles)) {
            nodeHandles = [nodeHandles];
        }

        // Collect all the nodes that are to be downloaded & all children of these nodes.
        dbfetch.coll(nodeHandles).always(() => this.startDownloadAsZipSync(nodeHandles));
    },

    /**
     * Download nodes as zip.
     * Warning: Ensure that the nodes are fetched before executing. See this.startDownloadAsZip();
     * @param {Array} nodeHandles Array of node handles
     *
     */
    startDownloadAsZipSync(nodeHandles) {
        'use strict';

        const zipname = M.d[nodeHandles[0]] && M.d[nodeHandles[0]].t && M.d[nodeHandles[0]].name ?
            `${M.getSafeName(M.d[nodeHandles[0]].name)}.zip` :
            `Archive-${Math.random().toString(16).slice(-4)}.zip`;

        const details = this.fetchNodesForZip(nodeHandles);
        const entries = this.fetchDownloadQueueForZip(details, zipname);

        if ($.totalDL > dlmanager.maxDownloadSize) {
            if (d) {
                console.log('Downloads exceed max size', entries.length, entries);
            }
            msgDialog('warninga', 'File Size is too big', l[18213]);
            return false;
        }

        if (!entries.length) {
            if (d) {
                dlmanager.logger.warn('Nothing to download.');
            }
            if (dlmanager.isOverQuota) {
                dlmanager.showOverQuotaDialog();
            }
            else {
                dlmanager.showNothingToDownloadDialog(() => mega.ui.sheet.hide());
            }
            return;
        }

        this.showDownloadOverlay(nodeHandles[0], entries[0].entry);

        for (var e = 0; e < entries.length; e++) {
            const {entry} = entries[e];
            dl_queue.push(entry);
        }

        dlmanager.isDownloading = true;

        eventlog(99802, 'ZipIO Download started on mobile.');
    },

    /**
     * Show overlay with current downloadable item progress
     * @param {Object} node The node object
     */
    showDownloadOverlay(node, dl) {
        'use strict';

        let name, id;

        // zip download folder
        if (dl.zipid && dl.zipname) {
            name = dl.zipname;
            id = `zip_${dl.zipid}`;
        }
        else {
            // download file
            name = node.name;
            id = `dl_${node.h}`;
        }

        const container = mCreateElement('div', {'class': 'download-file-container'});

        this.downloadTransfer = new MegaMobileTransferBlock({
            parentNode: container,
            transfer: {
                name: name
            },
            id: id,
            callbacks: {
                cancel: this.close.bind(this, true)
            }
        });

        this.bindEvents();

        mega.ui.overlay.show({
            name: 'download-overlay',
            showClose: true,
            icon: 'dl-decrypt',
            contents: [container],
            actionOnBottom: true,
            title: l.decrypting,
            onClose: () => {
                this.close();
            }
        });

        this.node = node;

        mega.ui.overlay.titleNode.classList.add('centered');

        const cancelTransfer = new MegaMobileButton({
            parentNode: mega.ui.overlay.actionsNode,
            type: 'normal',
            componentClassname: 'block secondary',
            text: l[82],
        });

        cancelTransfer.on('tap.cancelTransfer', () => this.close());
    },

    /**
     * Start the file download
     * @param {String} nodeHandle The node handle for this file
     */
    startFileDownload(nodeHandle) {

        'use strict';

        const n = M.d[nodeHandle] || false;
        const entry = {
            ...n,
            id: n.h,
            key: n.k,
            size: n.s,
            n: n.name,
            nauth: n.nauth || n_h,
            t: n.mtime || n.ts,
            ph: undefined,
            onDownloadProgress: this.onDownloadProgress.bind(this),
            onDownloadComplete: this.onDownloadComplete.bind(this),
            onBeforeDownloadComplete: this.onBeforeDownloadComplete.bind(this),
            onDownloadError: this.onDownloadError.bind(this),
            onDownloadStart: this.onDownloadStart.bind(this)
        };

        if (window.dlpage_ph) {
            entry.ph = dlpage_ph;
        }

        // Start download and show progress
        dl_queue.push(entry);
        dlmanager.isDownloading = true;

        this.showDownloadOverlay(n, entry);
    },

    /**
     * Close the dialog.
     *
     * @returns {void}
     */
    close() {

        'use strict';

        if (this.downloadTransfer) {
            // Abort the running download.
            dlmanager.abort(null);

            this.downloadTransfer.destroy();
        }

        // Clear the timer if it's running.
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Close the overlay if this function is called from download error
        mega.ui.overlay.hide();
        dlmanager.isDownloading = false;

        // check for storage quota to show the overquota dialog
        // if the download was resumed after page refresh
        if (this.downloadResumedOnPageRefresh) {
            M.checkStorageQuota(1);
            this.downloadResumedOnPageRefresh = false;
        }
    },

    /**
     * Fetch list of all nodes to include in zip.
     * @param nodeHandles
     * @returns {{nodes: Array, paths}}
     */
    fetchNodesForZip(nodeHandles) {
        'use strict';
        var nodes = [];
        var paths = {};
        for (var i in nodeHandles) {
            if (M.d[nodeHandles[i]]) {
                if (M.d[nodeHandles[i]].t) {
                    M.getDownloadFolderNodes(nodeHandles[i], true, nodes, paths);
                }
                else {
                    nodes.push(nodeHandles[i]);
                }
            }
            else if (M.isFileNode(nodeHandles[i])) {
                nodes.push(nodeHandles[i]);
            }
        }

        return {
            nodes: nodes,
            paths: paths
        };
    },

    /**
     * Generate a list of downloads for zip.
     * @param nodeDetails
     * @returns {Array}
     */
    fetchDownloadQueueForZip(nodeDetails, zipname) {
        'use strict';

        const nodes = nodeDetails.nodes || [];
        const paths = nodeDetails.paths || {};
        const zipid = ++dlmanager.dlZipID;
        const entries = [];

        for (var k = 0 ; k < nodes.length; k++) {
            var n = M.d[nodes[k]];
            if (!M.isFileNode(n)) {
                dlmanager.logger.error('** CHECK THIS **', 'Invalid node', k, nodes[k]);
                continue;
            }

            var path = paths[nodes[k]] || '';
            $.totalDL += n.s;

            var entry = {
                ...n,
                size: n.s,
                nauth: n.nauth || n_h,
                id: n.h,
                key: n.k,
                n: n.name,
                t: n.mtime || n.ts,
                zipid: zipid,
                zipname: zipname,
                p: path,
                ph: undefined,
                onDownloadProgress: this.onDownloadProgress.bind(this),
                onDownloadComplete: this.onDownloadComplete.bind(this),
                onBeforeDownloadComplete: this.onBeforeDownloadComplete.bind(this),
                onDownloadError: this.onDownloadError.bind(this),
                onDownloadStart: this.onDownloadStart.bind(this)
            };

            entries.push({node: n, entry: entry});
        }

        return entries;
    },

    /**
     * Helper: On download progression
     * @param {String} h The handle of the file being downloaded
     * @param {Number} p The number representing the percentage complete e.g. 49.23, 51.5 etc
     */
    onDownloadProgress(h, p) {
        'use strict';

        // Clear the timer if it's running and set a new one
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(this.onDownloadError.bind(this), this.frozenTimeout, dl_queue[0], EACCESS);

        // Download progress handler
        this.downloadTransfer.updateTransfer(p);
        megatitle(` ${p}%`);
    },

    /**
     * Helper: When a download has finished.
     * @param dl
     */
    onDownloadComplete(dl) {
        'use strict';

        // Clear the timer if it's running
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Show the download completed so they can open the file
        this.showDownloadComplete(dl);

        if (dl.zipid) {
            eventlog(99803, 'ZipIO Download completed on mobile.'); // Downloaded file on mobile webclient
        }

        if (dlid) {
            fdl_queue_var = false;
        }
        else if (dl.hasResumeSupport) {
            dlmanager.remResumeInfo(dl).dump();
        }

        Soon(M.resetUploadDownload);

        this.downloadTransfer.finishTransfer(false);
    },

    /**
     * Helper: Just before a download finished.
     * @param dl
     */
    onBeforeDownloadComplete(dl) {
        'use strict';
        if (dl.io instanceof MemoryIO) {
            // pretend to be a preview to omit the download attempt
            dl.preview = true;
        }
    },

    /**
     * Helper: When download fails.
     * @param dl
     * @param error
     */
    onDownloadError(dl, error) {
        'use strict';

        if (d) {
            dlmanager.logger.error(error, dl);
        }

        // Clear the timer if it's running
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // If over bandwidth quota
        if (error === EOVERQUOTA) {
            dlmanager.showOverQuotaDialog();
            this.downloadTransfer.errorTransfer(l[17]);
        }
        else if (error !== EAGAIN) {
            this.close();

            // Show message 'An error occurred, please try again.'
            msgDialog('error', l[1578], l[8982]);
        }
    },

    /**
     * Helper: When download starts.
     */
    onDownloadStart() {
        'use strict';
        this.startTime = Date.now();

        // Clear the timer if it's running and set a new one
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(this.onDownloadError.bind(this), this.frozenTimeout, dl_queue[0], EACCESS);
    },

    /**
     * Download complete handler, activate the Open File button and let the user download the file
     * @param {Object} dl The download instance
     */
    showDownloadComplete(dl) {
        'use strict';

        // Store a log for statistics
        eventlog(99637); // Downloaded file on mobile webclient

        mega.ui.overlay.addTitle(l[9077]);
        mega.ui.overlay.titleNode.classList.add('centered');
        mega.ui.overlay.clearActions();

        // There are three (download-button) states for completed downloads in mobile:
        // 1. Download completed - the download is automatically saved to disk since it was handled by the FileSystem
        // 2. Open File - The download was handled by the MemoryIO, and it can be viewed within the browser
        // 3. Save File - The download was handled by the MemoryIO, but due its file type it must be saved to disk.
        if (dl.io instanceof MemoryIO) {
            const openInBrowser = dlmanager.openInBrowser(dl);

            const statusButton = new MegaMobileButton({
                parentNode: mega.ui.overlay.actionsNode,
                type: 'normal',
                componentClassname: 'block',
                text: l[507]
            });

            if (openInBrowser) {
                statusButton.on('tap.triggerDownload', () => {
                    mobile.downloadOverlay.close();
                    dl.io.openInBrowser(dl.n);
                });
            }
            else {
                statusButton.on('tap.triggerDownload', () => {
                    dl.io.completed = false;
                    mobile.downloadOverlay.close();
                    dl.io.download(dl.n);
                });
            }
        }
    },

    /**
     * Bind events
     * @returns {void}
     */
    bindEvents: function() {
        'use strict';

        this.downloadTransfer.pauseButton.on('tap.pauseTransfers', () => {
            // Clear the timer if it's running
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        });

        this.downloadTransfer.resumeButton.on('tap.resumeTransfers', () => {
            // Clear the timer if it's running and set a new one
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(this.onDownloadError.bind(this), this.frozenTimeout, dl_queue[0], EACCESS);
        });
    },

    /**
     * Resume a download
     * @param {String} nodeHandle The node handle
     */
    resumeDownload(nodeHandle) {
        'use strict';
        this.downloadResumedOnPageRefresh = true;

        // redirect to fm if the user is on the account page after successful upgrade
        const _redirectToFM = () => {
            if (page.startsWith('fm/account')) {
                loadSubPage('fm');
            }
        };

        mega.ui.sheet.show({
            name: 'resume-download',
            type: 'modal',
            showClose: true,
            icon: 'sprite-mobile-fm-mono icon-info-thin-outline icon info',
            title: l[9118],
            contents: [parseHTML(l[17085])],
            actions: [
                {
                    type: 'normal',
                    text: l[1649],
                    className: 'primary',
                    onClick: () => {
                        mega.ui.sheet.hide();
                        _redirectToFM();
                        this.startDownload(nodeHandle);
                    }
                }
            ],
            onClose: () => {
                this.downloadResumedOnPageRefresh = false;
                // check for storage quota to show the overquota dialog
                // if the download dialog is closed without resuming on refresh
                M.checkStorageQuota(1);
            }
        });
    },

    /**
     * Handle fatal errors triggered by dlFatalError function
     * @param {Object} dl Download instance
     * @param {String} status Error status
     */
    handleFatalError(dl, status) {
        'use strict';

        if (status === l[16872]) {
            mega.ui.sheet.show({
                name: 'browser-memory-full',
                type: 'modal',
                showClose: true,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                title: l.cannot_download,
                contents: [parseHTML(l.browser_memory_full)],
                actions: [
                    {
                        type: 'normal',
                        text: l.open_in_app,
                        className: 'primary',
                        onClick: () => {
                            mega.ui.sheet.hide();
                            goToMobileApp(MegaMobileViewOverlay.getAppLink(dl.id));
                        }
                    }
                ]
            });
        }
        else {
            mobile.messageOverlay.show(status);
        }
    }
};
