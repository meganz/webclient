/**
 * The context menu (shown when clicking the icon with 3 vertical dots) next to a folder or file row allows extra
 * options to be performed for that file or folder such as downloading, creating/editing a public link or deleting.
 */
mobile.cloud.contextMenu = {

    /**
     * Initialise the context menu for each context menu icon click in each cloud row
     */
    init: function() {

        'use strict';

        var $fileManagerBlock = $('.mobile.file-manager-block');
        var $openContextMenuButtons = $fileManagerBlock.find('.open-context-menu');

        // If a folder/file row context menu icon is tapped
        $openContextMenuButtons.off('tap').on('tap', function() {

            var $selectedRow = $(this).parents('.fm-item');
            var $itemImage = $selectedRow.find('.fm-item-img');
            var $itemInfo = $selectedRow.find('.fm-item-info');
            var $contextMenuItemInfo = $('.context-menu-container .item-info');

            // Get the node handle for this row
            var nodeHandle = $selectedRow.data('handle');

            // Show the file info inside the context menu
            $contextMenuItemInfo.empty()
                .append($itemImage.clone())
                .append($itemInfo.clone());

            // Show the relevant context menu
            mobile.cloud.contextMenu.show(nodeHandle);

            // Prevent bubbling up to clicking the row behind the icon
            return false;
        });
    },

    /**
     * Show the folder or file context menu
     * @param {String} nodeHandle The internal node handle of the folder/file to show the context menu for
     */
    show: function(nodeHandle) {

        'use strict';

        var $folderContextMenu = $('.context-menu-container.folder');
        var $fileContextMenu = $('.mobile.context-menu-container.file');
        var $previewButton = $fileContextMenu.find('.preview-file-button');
        var $overlay = $('.dark-overlay');

        // Get the node type
        var node = M.d[nodeHandle];
        var nodeType = node.t;

        // Show overlay
        $overlay.removeClass('hidden');

        // If folder type
        if (nodeType === 1) {

            // Otherwise inititalise tap handler on the buttons
            mobile.cloud.contextMenu.initFolderOpenButtonHandler($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initLinkButton($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDeleteButton($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initCloseButton($folderContextMenu);
            mobile.cloud.contextMenu.initOverlayTap($folderContextMenu);

            // Hide the file context menu if open and show the folder context menu
            $fileContextMenu.addClass('hidden');
            $folderContextMenu.removeClass('hidden');
        }
        else {
            // If the file is previewable, show the preview button
            if (is_image3(node) || is_video(node)) {
                $previewButton.removeClass('hidden');
            }
            else {
                // Otherwise hide it
                $previewButton.addClass('hidden');
            }

            // Initialise buttons
            mobile.cloud.contextMenu.initPreviewButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDownloadButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initLinkButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDeleteButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initCloseButton($fileContextMenu);
            mobile.cloud.contextMenu.initOverlayTap($folderContextMenu);

            // Hide the folder context menu if open and show the file context menu
            $folderContextMenu.addClass('hidden');
            $fileContextMenu.removeClass('hidden');
        }
    },

    /**
     * Hide the context menu
     */
    hide: function() {

        'use strict';

        var $folderContextMenu = $('.context-menu-container.folder');
        var $fileContextMenu = $('.mobile.context-menu-container.file');
        var $overlay = $('.dark-overlay');

        // Hide overlay
        $overlay.addClass('hidden');

        // Hide the file context menu if open and show the folder context menu
        $fileContextMenu.addClass('hidden');
        $folderContextMenu.addClass('hidden');
    },

    /**
     * Functionality for opening a folder and displaying the contents
     * @param {Object} $contextMenu A jQuery object for the folder context menu container
     * @param {String} nodeHandle The node handle for this folder
     */
    initFolderOpenButtonHandler: function($contextMenu, nodeHandle) {

        'use strict';

        // If the Download button is tapped
        $contextMenu.find('.open-folder').off('tap').on('tap', function() {

            // Open the folder, render the contents and hide the context menu
            M.openFolder(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for previewing a file
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initPreviewButton: function($contextMenu, nodeHandle) {

        'use strict';

        // If the Preview button is tapped
        $contextMenu.find('.preview-file-button').off('tap').on('tap', function() {

            // Show the file preview overlay and hide the context menu
            mobile.slideshow.init(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for downloading a file
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initDownloadButton: function($contextMenu, nodeHandle) {

        'use strict';

        // When the Download button is tapped
        $contextMenu.find('.download-file-button').off('tap').on('tap', function() {

            // Show the file download overlay and hide the context menu
            mobile.downloadOverlay.showOverlay(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user create and copy a file/folder link
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initLinkButton: function($contextMenu, nodeHandle) {

        'use strict';

        var $linkButton = $contextMenu.find('.link-button');
        var $linkButtonText = $linkButton.find('.text');
        var node = M.d[nodeHandle];

        // Show the Manage link text if it already has a public link
        if (typeof node.shares !== 'undefined' && typeof node.shares.EXP !== 'undefined') {
            $linkButtonText.text(l[6909]);
        }
        else {
            // Otherwise show Get link
            $linkButtonText.text(l[59]);
        }

        // When the Link button is tapped
        $linkButton.off('tap').on('tap', function() {

            // Show the Get/Manage link overlay and close the context menu
            mobile.linkOverlay.show(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this file
     */
    initDeleteButton: function($contextMenu, nodeHandle) {

        'use strict';

        // When the Delete button is tapped
        $contextMenu.find('.delete-button').off('tap').on('tap', function() {

            // Show the folder/file delete overlay and hide the context menu
            mobile.deleteOverlay.show(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     */
    initCloseButton: function($contextMenu) {

        'use strict';

        // When the Close button is tapped
        $contextMenu.find('.close-button').off('tap').on('tap', function() {

            // Hide the context menu
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for hidding contextmenu if overlay is tapped
     */
    initOverlayTap: function() {

        'use strict';

        var $overlay = $('.dark-overlay');

        // When the Overlay is tapped
        $overlay.off('tap').on('tap', function() {

            // Hide the context menu
            mobile.cloud.contextMenu.hide();
            return false;
        });
    }
};
