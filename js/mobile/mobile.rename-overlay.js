/**
 * Code to trigger the mobile file manager's export/copy and remove link overlay and related behaviour
 */
mobile.renameOverlay = {

    /** jQuery selector for the overlay */
    $overlay: null,

    /** The jQuery selector for the cloud drive / file manager block */
    $fileManagerBlock: null,

    /**
     * Initialise the overlay
     * @param {String} nodeHandle A public or regular node handle
     * @returns {Boolean} Returns true if successful
     */
    init: function(nodeHandle) {

        'use strict';

        // Store the selector as it is re-used
        this.$overlay = $('.mobile.mobile-rename-overlay');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        // Get initial overlay details
        const node = M.d[nodeHandle];
        const nodeName = node.name;
        const nodeType = node.t;// file: 0, folder: 1
        const nodeSizeFormatted = bytesToSize(node.s || node.tb);
        const nodeIconName = fileIcon(node);
        const nodeIconPath = `${mobile.imagePath}${nodeIconName}.png`;
        const $input = $('.rename-input', this.$overlay);

        // Set file name, size and image
        $input.val(nodeName);
        $('.filesize',this.$overlay).text(nodeSizeFormatted);
        $('.filetype-img',this.$overlay).attr('src', nodeIconPath);

        // Initialise buttons
        this.initCloseButton();
        this.initRenameButton(node, nodeType);

        this.$fileManagerBlock.addClass('disable-scroll');
        this.$overlay.removeClass('hidden').addClass('overlay');

        mobile.initOverlayPopstateHandler(this.$overlay);

        $input.rebind('focus', function() {
            $input.addClass('input::selection');
            const nodeName = $(this).val();
            let selEnd =  nodeName.length;
            let tempIX;
            if (!nodeType && (tempIX = nodeName.lastIndexOf('.')) > -1){
                selEnd = tempIX ;
            }
            this.selectionStart = 0;
            this.selectionEnd = selEnd;
        });
        $input.focus();
    },

    /**
     * Initialises the close button on the overlay
     * @returns {Boolean} Returns true if successful
     */
    initCloseButton: function() {

        'use strict';

        $('.fm-dialog-close, .text-button', this.$overlay).rebind('tap', mobile.renameOverlay.closeRenameOverlay);
    },

    /**
     * Initialises the rename button on the overlay
     * @param {Object} node The node handle
     * @param {Number} nodeType The node type
     * @returns {Boolean} Returns true if successful
     */
    initRenameButton: function(node, nodeType) {

        'use strict';

        const $renameButton = $('.green-button.first', this.$overlay);
        const $renameInput = $('.rename-input', this.$overlay);
        const $renameWarningBlock = $('.folder-name-warning-block', this.$overlay);
        const $renameWarningText = $('.warning-text', this.$overlay);

        // Hide warning message
        $renameWarningBlock.addClass('hidden');

        // Add tap handler
        $renameButton.rebind('tap', () => {

            // Get rename input value
            const renameInputValue = $renameInput.val();
            const trimmedRenameInputValue = nodeType ? $.trim(renameInputValue) :
                `${$.trim(renameInputValue.substring(0, renameInputValue.lastIndexOf('.')))}` +
                `${renameInputValue.substring(renameInputValue.lastIndexOf('.'), renameInputValue.length)}`;
            const nameExists = mobile.renameOverlay.checkIfNameAlreadyExists(trimmedRenameInputValue, node.p);

            let errMsg = '';
            if (!renameInputValue) {
                errMsg = nodeType ? l.EmptyName : l[5744];
            }
            else if (nameExists) {
                errMsg = l[23219];
            }
            else if (!trimmedRenameInputValue ||
                (nodeType === 0 && !$.trim(renameInputValue.substring(0, renameInputValue.lastIndexOf('.'))))) {
                errMsg = nodeType ? l.EmptyName : l[5744];
            }
            else if (trimmedRenameInputValue.length > 250) {
                errMsg = nodeType ? l.LongName : l.LongName1;
            }
            else if (M.isSafeName(trimmedRenameInputValue) === false) {
                errMsg = l[24708];
            }
            else {
                M.rename(node.h, trimmedRenameInputValue);
                this.$fileManagerBlock.removeClass('hidden disable-scroll');
                $renameInput.trigger("blur");
            }
            if (errMsg) {
                $renameWarningBlock.removeClass('hidden');
                $renameWarningText.text(errMsg);
            }
        });
    },
    /**
     * Check if the name already exists in the current view
     * @param {String} newName The new name of the item that the user typed
     * @param {String} target Parent folder of the item
     * @returns {Boolean} Returns true if the name already exists, false if not
     */
    checkIfNameAlreadyExists: function(newName, target) {

        'use strict';

        if (target) {
            if (M.c[target]) {
                // Check if a folder/file with the same name already exists.
                for (const handle in M.c[target]) {
                    if (M.d[handle] && M.d[handle].name === newName) {
                        return true;
                    }
                }
            }
            return false;
        }
        const items = M.v.filter((item) => {
            return item.name === newName;
        });

        return items.length !== 0;
    },
    /**
     * close overlay
     * @returns {Boolean} Returns true if successful
     */
    closeRenameOverlay: function() {
        'use strict';

        $('.rename-input', this.$overlay).trigger("blur");

        // Hide overlay
        mobile.renameOverlay.$overlay.addClass('hidden');

        // Re-show the file manager and re-enable scrolling
        mobile.renameOverlay.$fileManagerBlock.removeClass('hidden disable-scroll');

        // Prevent clicking the menu button behind
        return false;
    }
};
