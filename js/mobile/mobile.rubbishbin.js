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
     * Restore the selected node from the rubbish bin
     * @param {String} nodeHandle
     * @returns Returns the restored node
     */
    async restore(nodeHandle) {
        'use strict';

        mobile.rubbishBin.isRestoring = true;

        const node = await M.revertRubbishNodes(nodeHandle).catch((ex) => ex !== EBLOCKED && tell(ex));

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
};
