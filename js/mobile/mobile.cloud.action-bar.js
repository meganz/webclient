/**
 * The bottom action bar (shown at the bottom of the cloud drive) which allows for adding folders, uploading files etc.
 */
mobile.cloud.actionBar = {

    /**
     * Initialise the bottom action bar
     */
    init: function() {

        'use strict';

        // Initialise functionality
        mobile.cloud.actionBar.initScrollToTopButton();
        mobile.cloud.actionBar.initShowCreateFolderOverlayButton();
        mobile.cloud.actionBar.initShowFilePickerButton();
    },

    /**
     * Initialise the button to scroll to the top of the cloud drive
     */
    initScrollToTopButton: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerScrollingBlock = $fileManager.find('.fm-scrolling');
        var $scrollToTopIcon = $fileManager.find('.fm-icon.scroll-to-top');
        var $filesFoldersText = $fileManager.find('.folders-files-text');

        // On clicking the Scroll to Top button
        $scrollToTopIcon.off('tap').on('tap', function() {

            // Find the top of the block which says 'x files, x folders' which is the top of the scrollable cloud drive
            var topOfScrollableCloudDrive = $filesFoldersText.position().top;

            // Scroll to the top of the cloud drive
            $fileManagerScrollingBlock.scrollTop(topOfScrollableCloudDrive);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the create folder button to show the create folder overlay
     */
    initShowCreateFolderOverlayButton: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $createFolderIcon = $fileManager.find('.fm-icon.create-new-folder');

        // On clicking the Create Folder icon
        $createFolderIcon.off('tap').on('tap', function() {

            // Show the create folder overlay
            mobile.createFolderOverlay.init();

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the file upload button to trigger the file picker.
     * Once a file is selected it will show the upload overlay.
     */
    initShowFilePickerButton: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $uploadIcon = $fileManager.find('.fm-icon.upload-file');
        var $fileInput = $fileManager.find('.upload-select-file');

        // On the upload icon click/tap
        $uploadIcon.off('tap').on('tap', function() {

            // Clear file input so change handler works again in Chrome
            $fileInput.val('');

            // Initialise the behaviour for when the file is selected
            mobile.uploadOverlay.init();

            // Open the file picker
            $fileInput.trigger('click');

            // Prevent double taps
            return false;
        });
    }
};
