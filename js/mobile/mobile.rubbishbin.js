/**
 * Functions for mobile rubbishbin functionality.
 */
mobile.rubbishBin = {

    /**
     * Flag to indicate that the current M.moveNode() call is for a restore process in mobile.
     */
    isRestoring: false,
    retryCount: 0,

    /**
     * Move the selected node to the rubbish bin or delete it permanently
     * @param {String} nodeHandle
     * @returns {void}
     */
    async removeItem(nodeHandle) {
        'use strict';

        loadingDialog.show();

        const node = M.getNodeByHandle(nodeHandle);

        // rubbish bin page
        if (M.currentrootid === M.RubbishID) {
            $.selected = [nodeHandle];
            await M.clearRubbish(false).catch(dump);

            mega.ui.sheet.hide();
            mega.ui.toast.show(node.t ? l.deleted_folder_permanently.replace('[X]', node.name) :
                l.deleted_file_permanently.replace('[X]', node.name), 4);
        }
        else {
            // Delete the file
            let res =  await fmremove([nodeHandle]);
            res = res[0][node.t ? 1 : 0];
            res = res && res.status === 'fulfilled' ? res.value.length : 0;

            mobile.rubbishBin.showCompleteMessage(node, res);
        }

        loadingDialog.hide();
    },

    /**
     * Restore the selected node from the rubbish bin
     * @param {String} nodeHandle
     * @returns Returns the restored node
     */
    async restore(nodeHandle) {
        'use strict';

        mobile.rubbishBin.isRestoring = true;

        const node = await M.revertRubbishNodes(nodeHandle).catch(tell);

        mobile.rubbishBin.isRestoring = false;

        return node;
    },

    /**
     * Trigger this function when the user confirms to empty the bin
     * @returns {void}
     */
    emptyRubbishBin() {
        'use strict';

        if (!validateUserAction()) {
            return false;
        }

        loadingDialog.show();
        mega.ui.sheet.hide();

        const count = M.v.length;

        M.clearRubbish(true)
            .then(() => {
                mega.ui.toast.show(mega.icu.format(l.items_deleted, count), 4);
                mobile.rubbishBin.retryCount = 0;
            })
            .catch(() => {
                // only a max of 3 retries allowed
                if (mobile.rubbishBin.retryCount >= 3) {
                    mobile.rubbishBin.retryCount = 0;
                    return;
                }

                mega.ui.alerts.show(function() {
                    this.text = l.failed_to_empty_rubbish_bin;
                    this.closeButton = true;
                    this.actionButtonText = l[1472];
                    this.displayType = 'error';
                    this.icon = 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                    this.on('cta', () => {
                        this.hide();
                        ++mobile.rubbishBin.retryCount;
                        mobile.rubbishBin.emptyRubbishBin();
                    });
                });
            })
            .finally(() => loadingDialog.hide());
    },

    /**
     * Complete the process of moving the folder/file to rubbish bin
     *
     * @param {String} node Removed folder/file node
     * @return {void}
     */
    showCompleteMessage(node, removedCount) {
        'use strict';

        // Store a log for statistics
        eventlog(99638, 'Deleted a node on the mobile webclient');

        mega.ui.sheet.hide();
        loadingDialog.hide();
        if (removedCount) {
            // TODO: this string currently do not cover the case there is file request auto termination, need update.
            mobile.showToast(mega.icu.format(l.link_removed, removedCount), 4);
        }

        mega.ui.toast.show(node.t ? l.moved_folder_to_rubbish_bin.replace('[X]', node.name) :
            l.moved_file_to_rubbish_bin.replace('[X]', node.name), 4);
    }
};
