/**
 * Functions for mobile rubbishbin functionality.
 */
mobile.rubbishBin = {

    /**
     * Flag to indicate that the current M.moveNode() call is for a restore process in mobile.
     */
    isRestoring: false,

    restore: function(nodeHandle) {
        'use strict';

        mobile.rubbishBin.isRestoring = true;
        return M.revertRubbishNodes(nodeHandle)
            .catch(tell)
            .finally(() => {
                mobile.rubbishBin.isRestoring = false;
            });
    },

    /**
     * Trigger a render update of the current view.
     */
    renderUpdate: function() {
        'use strict';

        // Refresh the rendering of the current view.
        mobile.cloud.renderUpdate();
        mobile.cloud.actionBar.hideOrShow();
    }
};
