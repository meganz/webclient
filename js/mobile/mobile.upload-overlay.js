/**
 * Code for the file upload overlay
 */
mobile.uploadOverlay = {

    container: null,
    actions: null,

    uploadTransfers: [],
    completedTransfers: [],
    erroredTransfers: [],

    /**
     * Add upload file transfer to upload container overlay
     * @param {Object} ul Upload transfer
     * @returns {void}
     */
    add: function(ul) {
        'use strict';

        if (ul && ul.id) {
            if (!this.container) {
                this.container = mCreateElement('div', {'class': 'upload-file-container'});
            }
            if (!this.actions) {
                this.actions = [
                    {
                        type: 'normal',
                        text: l[6993],
                        className: 'secondary pauseAll',
                        onClick: this.pauseAll.bind(this, true)
                    },
                    {
                        type: 'normal',
                        text: l.transfers_resume_all,
                        className: 'secondary resumeAll hidden',
                        onClick: this.resumeAll.bind(this, true)
                    }
                ];
            }

            const id = `ul_${ul.id}`;
            this.uploadTransfers[id] = new MegaMobileTransferBlock({
                parentNode: this.container,
                transfer: ul,
                id: id,
                callbacks: {
                    cancel: this.cancel.bind(this)
                }
            });

            this.bindEvents(id);
        }

    },

    /**
     * Bind events
     * @param {String} id Upload transfer id
     * @returns {void}
     */
    bindEvents: function(id) {
        'use strict';

        this.uploadTransfers[id].pauseButton.on('tap.pauseTransfers', () => {
            this.updateGeneralActions();
        });

        this.uploadTransfers[id].resumeButton.on('tap.resumeTransfers', () => {
            this.updateGeneralActions();
        });
    },

    /**
     * Show upload container overlay
     * @returns {void}
     */
    show: function() {
        'use strict';

        mega.ui.sheet.hide();

        mega.ui.overlay.show({
            name: 'upload-overlay',
            showClose: true,
            title: l[1155],
            subtitle: this.getProgress(),
            contents: [this.container],
            actions: this.actions,
            actionOnBottom: true
        });
        mega.ui.overlay.titleNode.classList.add('centered');

        const closeButton = mega.ui.overlay.domNode.querySelector('.close').component;
        closeButton.rebind('tap.closeOverlay', () => {
            this.confirmClose();
        });
    },

    /**
     * Init upload file transfer in upload container overlay
     * @param {Object} ul Upload transfer
     * @returns {void}
     */
    init: function(ul) {
        'use strict';

        const uploadTransferComponent = this.uploadTransfers[`ul_${ul.id}`];

        if (uploadTransferComponent) {
            // Init the upload transfer progress
            uploadTransferComponent.updateTransfer(0);
        }
    },

    /**
     * Update upload file transfer in upload container overlay
     * @param {Object} ul Upload transfer
     * @param {Number} percentComplete Percent complete
     * @returns {void}
     */
    update: function(ul, percentComplete) {
        'use strict';

        const uploadTransferComponent = this.uploadTransfers[`ul_${ul.id}`];

        if (uploadTransferComponent) {
            // Update the upload transfer progress
            uploadTransferComponent.updateTransfer(percentComplete);
        }
        else {
            this.reupdate(ul, percentComplete);
        }
    },

    /**
     * Re-Update upload file transfer in upload container overlay after solve an error
     * @param {Object} ul Upload transfer
     * @param {Number} percentComplete Percent complete
     * @returns {void}
     */
    reupdate: function(ul, percentComplete) {
        'use strict';

        const erroredTransferComponent = this.erroredTransfers[`ul_${ul.id}`];
        if (erroredTransferComponent) {
            this.move(this.erroredTransfers, this.uploadTransfers, `ul_${ul.id}`, erroredTransferComponent);

            this.updateHeaderAndButtons(true);

            erroredTransferComponent.resetTransfer();

            this.update(ul, percentComplete);
        }
    },

    /**
     * Finish upload file transfer in upload container overlay
     * @param {Object} ul Upload transfer
     * @returns {void}
     */
    finish: function(ul) {
        'use strict';

        eventlog(99678);

        const uploadTransferComponent = this.uploadTransfers[`ul_${ul.id}`];

        if (uploadTransferComponent) {
            // Finish the upload transfer
            uploadTransferComponent.finishTransfer(ul.skipfile, true);

            this.move(this.uploadTransfers, this.completedTransfers, `ul_${ul.id}`, uploadTransferComponent);

            // Update subtitle with new progress
            mega.ui.overlay.addSubTitle(this.getProgress());

            this.updateGeneralActions();

            this.updateHeaderAndButtons();
        }
    },

    /**
    * Update the header and buttons in upload container overlay based on the status of uploads
    * @param {Boolean} init Initialize
    * @returns {void}
    */
    updateHeaderAndButtons: function(init) {
        'use strict';

        if (Object.keys(this.uploadTransfers).length === 0) {
            mega.ui.overlay.addTitle(l.upload_status_complete);
            mega.ui.overlay.titleNode.classList.add('centered');

            mega.ui.overlay.clearActions();
            const uploadMoreButton = new MegaMobileButton({
                parentNode: mega.ui.overlay.actionsNode,
                componentClassname: 'secondary',
                type: 'normal',
                text: l.upload_more
            });
            uploadMoreButton.on('tap.moreUpload', () => {
                this.moreFiles();
            });
        }
        else if (init) {
            mega.ui.overlay.addTitle(l[1155]);

            mega.ui.overlay.clearActions();
            if (this.actions) {
                for (let i = this.actions.length; i--;) {
                    const {
                        type: type,
                        text: text,
                        className: className,
                        onClick: onClick
                    } = this.actions[i];

                    const button = new MegaMobileButton({
                        parentNode: mega.ui.overlay.actionsNode,
                        type: type || 'normal',
                        componentClassname: className || '',
                        text: text
                    });

                    if (typeof onClick === 'function') {
                        button.on('tap.overlayAction', onClick);
                    }
                }
            }
        }
    },

    /**
    * Let the user upload another file(s)
    * @returns {void}
    */
    moreFiles: function() {
        'use strict';

        // Abort ulmanager
        ulmanager.abort(null);

        // Undo previous pause mode
        uldl_hold = false;

        const fileInput = document.getElementById('fileselect1');

        // Clear file input so change handler works again in Chrome
        fileInput.value = '';

        // Open the file picker
        fileInput.click();
    },

    /**
     * Handle error upload file transfer in upload container overlay
     * @param {Object} ul Upload transfer
     * @param {String} errorstr Error message
     * @returns {void}
     */
    error: function(ul, errorstr) {
        'use strict';

        const uploadTransferComponent = this.uploadTransfers[`ul_${ul.id}`];

        if (uploadTransferComponent) {
            // Update the upload tranfer - ERROR
            uploadTransferComponent.errorTransfer(errorstr);

            this.move(this.uploadTransfers, this.erroredTransfers, `ul_${ul.id}`, uploadTransferComponent);

            this.updateHeaderAndButtons();
        }
    },

    /**
     * Cancel upload file transfer in upload container overlay
     * @param {Object} ul Upload transfer
     * @returns {void}
     */
    cancel: function(ul) {
        'use strict';

        const uploadTransferComponent = this.uploadTransfers[`ul_${ul.id}`];

        if (uploadTransferComponent) {
            ulmanager.abort(ul.id);

            if (M.tfsdomqueue[ul.id]) {
                delete M.tfsdomqueue[ul.id];
            }

            // Remove upload file transfer
            this.remove(this.uploadTransfers, `ul_${ul.id}`);

            // Update subtitle with new progress
            mega.ui.overlay.addSubTitle(this.getProgress());

            this.updateHeaderAndButtons();
        }
    },

    /**
     * Destroy upload file transfer object and array position
     * @param {Array} transferArray Array of transfers
     * @param {String} id Upload transfer id
     * @returns {void}
     */
    remove: function(transferArray, id) {
        'use strict';

        transferArray[id].destroy();
        delete transferArray[id];
    },

    /**
     * Move upload file transfer object to another array
     * @param {Array} originArray Origin array
     * @param {Array} targetArray Target array
     * @param {String} id Upload transfer id
     * @param {Object} uploadTransferComponent Upload transfer component
     * @returns {void}
     */
    move: function(originArray, targetArray, id, uploadTransferComponent) {
        'use strict';

        targetArray[id] = uploadTransferComponent;
        delete originArray[id];
    },

    /**
    * Pause all upload file transfers in upload container overlay
    * @param {Boolean} manual Manual action
    * @returns {void}
    */
    pauseAll: function(manual) {
        'use strict';

        for (const id in this.uploadTransfers) {
            if (this.uploadTransfers.hasOwnProperty(id)) {
                const uploadTransferComponent = this.uploadTransfers[id];
                if (manual === true) {
                    uploadTransferComponent.manualPause = true;
                }
                uploadTransferComponent.pauseTransfer();
            }
        }

        uldl_hold = true;

        // Show/hide general action buttons
        if (manual === true) {
            mega.ui.overlay.actionsNode.querySelector('.pauseAll').component.hide();
            mega.ui.overlay.actionsNode.querySelector('.resumeAll').component.show();
        }
    },

    /**
    * Resume all upload file transfers in upload container overlay
    * @param {Boolean} manual Manual action
    * @returns {void}
    */
    resumeAll: function(manual) {
        'use strict';

        uldl_hold = false;

        for (const id in this.uploadTransfers) {
            if (this.uploadTransfers.hasOwnProperty(id)) {
                const uploadTransferComponent = this.uploadTransfers[id];
                if (manual === true || !uploadTransferComponent.manualPause) {
                    uploadTransferComponent.manualPause = false;
                    this.uploadTransfers[id].resumeTransfer();
                }
            }
        }

        // Show/hide general action buttons
        if (manual === true) {
            mega.ui.overlay.actionsNode.querySelector('.pauseAll').component.show();
            mega.ui.overlay.actionsNode.querySelector('.resumeAll').component.hide();
        }
    },

    /**
    * Update general actions depending of individual states
    * @returns {void}
    */
    updateGeneralActions: function() {
        'use strict';

        let pauseCont = 0;
        let resumeCont = 0;
        for (const id in this.uploadTransfers) {
            if (this.uploadTransfers.hasOwnProperty(id)) {
                const uploadTransferComponent = this.uploadTransfers[id];
                if (uploadTransferComponent.pauseButton.visible === true) {
                    pauseCont++;
                }
                else if (uploadTransferComponent.resumeButton.visible === true) {
                    resumeCont++;
                }
            }
        }

        if (pauseCont === 0) {
            mega.ui.overlay.actionsNode.querySelector('.pauseAll').component.hide();
            mega.ui.overlay.actionsNode.querySelector('.resumeAll').component.show();
        }
        else if (resumeCont === 0) {
            mega.ui.overlay.actionsNode.querySelector('.pauseAll').component.show();
            mega.ui.overlay.actionsNode.querySelector('.resumeAll').component.hide();
        }
    },

    /**
     * Show sheet to confirm close upload overlay
     * @return {void}
     */
    confirmClose: function() {
        'use strict';

        // Close if the upload is complete
        if (Object.keys(this.uploadTransfers).length === 0) {
            this.close();
            return;
        }

        // Pause all upload file transfers
        this.pauseAll();

        // Show confirm close sheet
        mega.ui.sheet.show({
            name: 'mobile-upload-file-close',
            type: 'modal',
            showClose: true,
            title: l[1585],
            contents: l[7225],
            actions: [
                {
                    type: 'normal',
                    text: l.transfers_cancel_all_confirm,
                    className: 'primary',
                    onClick: this.close.bind(this)
                }
            ],
            onClose: this.cancelClose.bind(this)
        });
    },

    /**
     * Cancel close upload overlay
     * @return {void}
     */
    cancelClose: function() {
        'use strict';

        // Hide confirm close sheet
        mega.ui.sheet.hide();

        // Resume all upload file transfers
        this.resumeAll();
    },

    /**
     * Close upload overlay
     * @return {void}
     */
    close: function() {
        'use strict';

        // Hide confirm close sheet
        mega.ui.sheet.hide();

        // Abort ulmanager
        ulmanager.abort(null);

        // Undo previous pause mode
        uldl_hold = false;

        // Remove all upload file transfers
        for (const id in this.uploadTransfers) {
            if (this.uploadTransfers.hasOwnProperty(id)) {
                this.remove(this.uploadTransfers, id);
            }
        }
        for (const id in this.completedTransfers) {
            if (this.completedTransfers.hasOwnProperty(id)) {
                this.remove(this.completedTransfers, id);
            }
        }
        for (const id in this.erroredTransfers) {
            if (this.erroredTransfers.hasOwnProperty(id)) {
                this.remove(this.erroredTransfers, id);
            }
        }

        // Re-render current folder
        M.openFolder(M.currentdirid, true);

        // Hide upload file overlay
        mega.ui.overlay.hide();
    },

    /**
     * Get progress
     * @return {String} Uploaded transfers of total message
     */
    getProgress: function() {
        'use strict';

        const total = Object.keys(this.uploadTransfers).length
                            + Object.keys(this.completedTransfers).length
                            + Object.keys(this.erroredTransfers).length;

        const completed = Object.keys(this.completedTransfers).length;

        if (completed === 0) {
            return;
        }

        return total === 1 ?
            l.upload_one :
            mega.icu.format(l.upload_total, completed)
                .replace('%1', total);
    },

    /**
     * Mobile shims
     * @param {MegaData} ctx MegaData instance
     * @return {void}
     */
    shim: function(ctx) {
        'use strict';
        /* eslint-disable no-useless-concat */

        if (is_megadrop) {
            Object.defineProperty(ctx, 'addToTran' + 'sferTable', {value: nop});

            // We ignore other shims, we just use the normal process
            return;
        }

        const _ulProgress = ctx.ulprogress;
        Object.defineProperty(ctx, 'ul' + 'progress', {
            value: function(ul, perc) {
                const res = _ulProgress.apply(this, arguments);
                mobile.uploadOverlay.update(ul, perc);
                return res;
            }
        });

        const _ulStart = ctx.ulstart;
        Object.defineProperty(ctx, 'ul' + 'start', {
            value: function(ul) {
                const res = _ulStart.apply(this, arguments);
                mobile.uploadOverlay.init(ul);
                return res;
            }
        });

        const _ulFinalize = ctx.ulfinalize;
        Object.defineProperty(ctx, 'ul' + 'finalize', {
            value: function(ul) {
                const res = _ulFinalize.apply(this, arguments);
                mobile.uploadOverlay.finish(ul);
                return res;
            }
        });

        Object.defineProperty(ctx, 'openTrans' + 'fersPanel', {
            value: function() {
                onIdle(() => {
                    if (ulmanager.isUploading) {
                        mobile.uploadOverlay.show();
                    }
                });
            }
        });

        Object.defineProperty(ctx, 'addToTran' + 'sferTable', {
            value: function(gid, f) {
                mobile.uploadOverlay.add(f);
            }
        });
    }
};

window.addEventListener('popstate', () => {

    'use strict';

    if (mega.ui.overlay.name === 'upload-overlay' && mega.ui.overlay.visible) {
        mobile.uploadOverlay.close();
    }
});
