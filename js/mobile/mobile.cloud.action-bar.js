/**
 * The footer component (shown at the bottom of the cloud drive) which allows for adding folders and uploading files.
 */
mobile.cloud.actionBar = {

    /**
     * Initialise the bottom action bar
     */
    init: function() {
        'use strict';

        // Initialise functionality
        mobile.cloud.actionBar.hideOrShow();
    },

    /**
     * Hide or show FAB add button depending on whether a public folder link or in the cloud drive.
     * Also add or remove the 'above-fab' class for the bottom toasts depending on this, which allows
     * the toast to display above the FAB when required.
     */
    hideOrShow: function() {
        'use strict';

        // Cache selectors
        const addButton = document.componentSelector('.mobile.file-manager-block .mega-component.mega-footer');

        if (!addButton) {

            if (d) {
                console.error('Footer FAB add button doesn\'t exist');
            }

            return;
        }

        mega.ui.toast.rack.removeClass('above-btn');

        if (pfid || M.currentdirid === 'shares'
            || M.currentdirid === 'out-shares'
            || M.currentdirid === 'public-links'
            || M.currentrootid === M.RubbishID
            || M.getNodeRights(M.currentdirid) === 0) {
            addButton.hide();
            mega.ui.toast.rack.removeClass('above-fab');
        }
        else {
            addButton.show();
            mega.ui.toast.rack.addClass('above-fab');
        }
        if (mega.flags.ab_ads) {
            mega.commercials.init();
        }
    }
};
