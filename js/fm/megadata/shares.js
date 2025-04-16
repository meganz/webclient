/**
 * Initializes Shares UI.
 */
MegaData.prototype.sharesUI = function() {
    "use strict";

    $('.shares-tab-lnk').rebind('click', function() {
        var $this = $(this);
        var folder = escapeHTML($this.attr('data-folder'));

        const eid = $this.attr('data-eventid');
        M.openFolder(folder).then(() => eid && eventlog(eid));
    });
};

/**
 * Return tooltip label for undecripted node depending on node type and shared or owned
 * @param {Object} node The current node.
 */
MegaData.prototype.getUndecryptedLabel = function(node) {
    'use strict';

    if (self.nullkeys && self.nullkeys[node.h]) {
        return l.allownullkeys_tooltip;
    }

    const isShared = M.getNodeRoot(node.p) !== M.RootID;

    if (node.t) {
        return isShared ? l[8595] : l.undecryptable_folder_tooltip;
    }
    return isShared ? l[8602] : l.undecryptable_file_tooltip;
};
