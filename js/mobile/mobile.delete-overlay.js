/**
 * Code to trigger the mobile file manager's delete file/folder overlay and related behaviour
 */
mobile.deleteOverlay = {

    /** Cached jQuery selectors */
    $overlay: null,
    $fileManagerBlock: null,

    /**
     * Initialise the overlay
     * @param {String} nodeHandle A public or regular node handle
     * @param {Function} successCallback A callback function to be run if the item is deleted
     */
    show: function(nodeHandle, successCallback) {

        'use strict';

        // Store selectors as they are re-used
        this.$overlay = $('#mobile-ui-delete');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        // Get initial overlay details
        var node = M.d[nodeHandle];
        var fileName = node.name;
        var fileSizeBytes = node.s || node.tb;
        var fileSize = numOfBytes(fileSizeBytes);
        var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
        var fileIconName = fileIcon(node);
        var fileIconPath = mobile.imagePath + fileIconName + '.png';

        // Set file name, size and image
        this.$overlay.find('.filename').text(fileName);
        this.$overlay.find('.filesize').text(fileSizeFormatted);
        this.$overlay.find('.filetype-img').attr('src', fileIconPath);

        // Set the name, size. icon and initialise the download buttons
        this.initDeleteButton(nodeHandle, successCallback);
        this.initCancelAndCloseButtons();

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari and show the overlay
        this.$fileManagerBlock.addClass('disable-scroll');
        this.$overlay.removeClass('hidden').addClass('overlay');

        mobile.initOverlayPopstateHandler(this.$overlay);
    },

    /**
     * Initialise the Delete button on the overlay
     * @param {String} nodeHandle The node handle for this folder/file
     * @param {Function} successCallback A callback function to be run if the item is deleted
     */
    initDeleteButton: function(nodeHandle, successCallback) {

        'use strict';

        // On delete button click/tap
        this.$overlay.find('.first.delete').off('tap').on('tap', function() {

            // Delete the file
            fmremove([nodeHandle]);

            // Run the callback function on successful deletion
            if (typeof successCallback !== 'undefined') {
                successCallback();
            }

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * A callback for the deletion process to close the dialog
     * @param {String} nodeHandle The node handle for this folder/file
     */
    completeDeletionProcess: function(nodeHandle) {

        'use strict';

        // Remove the node if in the current view
        $('#' + nodeHandle).remove();

        // Store a log for statistics
        api_req({ a: 'log', e: 99638, m: 'Deleted a node on the mobile webclient' });

        // Update the file/folder count in the footer and show an Empty message and icon if no files
        mobile.cloud.updateView();
        mobile.cloud.showEmptyCloudIfEmpty();
        mobile.cloud.countAndUpdateSubFolderTotals();
        mobile.cloud.renderFoldersAndFilesSubHeader();

        // Re-show the file manager and re-enable scrolling, hide overlay with download button options
        mobile.deleteOverlay.$fileManagerBlock.removeClass('hidden disable-scroll');
        mobile.deleteOverlay.$overlay.addClass('hidden');

        // If type folder, show toast message '1 folder moved to the Rubbish Bin'
        if (M.d[nodeHandle].t === 1) {
            mobile.showToast(l[7613]);
        }
        else {
            // Otherwise if a file, show toast message '1 file moved to the Rubbish Bin'
            mobile.showToast(l[7611]);
        }
    },

    /**
     * Initialises the close button on the overlay with download button options and also the download progress overlay
     */
    initCancelAndCloseButtons: function() {

        'use strict';

        var $closeAndCancelButtons = this.$overlay.find('.fm-dialog-close, .text-button');

        // Add click/tap handler
        $closeAndCancelButtons.off('tap').on('tap', function() {

            // Hide overlay with download button options, re-show the file manager and re-enable scrolling
            mobile.deleteOverlay.$overlay.addClass('hidden');
            mobile.deleteOverlay.$fileManagerBlock.removeClass('hidden disable-scroll');

            // Prevent clicking menu behind
            return false;
        });
    }
};
