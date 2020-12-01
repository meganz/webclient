/**
 * The bottom action bar (shown at the bottom of the cloud drive) which allows for adding folders, uploading files and
 * scrolling to the top of the Cloud Drive.
 */
mobile.cloud.actionBar = {

    /**
     * Initialise the bottom action bar
     */
    init: function() {

        'use strict';

        // Initialise functionality
        mobile.cloud.actionBar.hideOrShow();
        mobile.cloud.actionBar.initScrollToTopButton();
        mobile.cloud.actionBar.initShowCreateFolderOverlayButton();
        mobile.cloud.actionBar.initShowFilePickerButton();
        mobile.cloud.actionBar.initRubbishBinControls();
    },

    /**
     * Hide or show various buttons depending on whether a public folder link or in the cloud drive
     */
    hideOrShow: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $actionBar = $fileManager.find('.bottom-action-bar-container');
        var $createFolderIcon = $fileManager.find('.fm-icon.mobile-create-new-folder');
        var $uploadFileIcon = $fileManager.find('.fm-icon.upload-file');
        var $rubbishBinIcon = $fileManager.find('.fm-icon.rubbish-bin-highlight');

        // If a public folder link, hide the action bar by default (because this is only shown if the scroll-to-top
        // button is enabled & visible). Also hide the Create Folder and Upload File button as they are not applicable.
        if (pfid) {
            $actionBar.addClass('hidden');
            $createFolderIcon.addClass('hidden');
            $uploadFileIcon.addClass('hidden');
            $rubbishBinIcon.addClass('hidden');
        }
        else {
            $actionBar.removeClass('hidden');
            if (M.getNodeRoot(M.currentdirid) === M.RubbishID) {
                // IF RubbishBin, then show clear all button only.
                $createFolderIcon.addClass('hidden');
                $uploadFileIcon.addClass('hidden');
                if ((M.currentdirid === M.RubbishID && M.v.length === 0)) {
                    $rubbishBinIcon.addClass('hidden');
                } else {
                    $rubbishBinIcon.removeClass('hidden');
                }
            } else {
                // Otherwise show the action bar and enable the Create Folder and Upload File buttons
                $createFolderIcon.removeClass('hidden');
                $uploadFileIcon.removeClass('hidden');
                $rubbishBinIcon.addClass('hidden');
            }

        }
    },

    /**
     * Init RubbishBin related controls and Dialogs.
     */
    initRubbishBinControls: function() {
        'use strict';
        $(".empty-rubbish-bin").off('tap').on('tap', function() {
            mobile.rubbishBinEmptyOverlay.show();
        });
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

        // If the current view is scrolled, enable the scroll button
        mobile.cloud.actionBar.enableAndShowScrollButtonIfScrolled();

        // On scrolling the files/folders in the cloud drive
        $fileManagerScrollingBlock.off('scroll').on('scroll', function() {

            // Enable the scroll button if applicable
            mobile.cloud.actionBar.enableAndShowScrollButtonIfScrolled();
        });

        // On clicking the Scroll to Top button
        $scrollToTopIcon.off('tap').on('tap', function() {

            // Find the top of the block which says 'x files, x folders' which is the top of the scrollable cloud drive
            var topOfScrollableCloudDrive = $filesFoldersText.position().top;

            // Scroll to the top of the cloud drive
            $fileManagerScrollingBlock.addClass("stop-inertia");
            $fileManagerScrollingBlock.scrollTop(topOfScrollableCloudDrive);
            $fileManagerScrollingBlock.removeClass("stop-inertia");

            // Prevent double taps
            return false;
        });
    },

    /**
     * If the current view is scrolled, enable the scroll button
     */
    enableAndShowScrollButtonIfScrolled: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerScrollingBlock = $fileManager.find('.fm-scrolling');
        var $scrollToTopIcon = $fileManager.find('.fm-icon.scroll-to-top');
        var $actionBar = $fileManager.find('.bottom-action-bar-container');

        // Hide the scroll-to-top icon by default (i.e. if opening a new folder and there's not many files)
        $scrollToTopIcon.addClass('hidden');

        // If they have scrolled (scrolling is not possible if there is only a couple of files)
        if ($fileManagerScrollingBlock.prop('scrollTop') > 0) {

            // Show the scroll-to-top icon
            $scrollToTopIcon.removeClass('hidden');

            // If a public folder link, show the action bar as well (it's
            // hidden by default because no other buttons are active)
            if (pfid) {
                $actionBar.removeClass('hidden');
            }
        }
        else {
            // Hide the scroll-to-top icon if they are at the top of the cloud drive
            $scrollToTopIcon.addClass('hidden');

            // If a public folder link, hide the action bar as well (because no other buttons are active)
            if (pfid) {
                $actionBar.addClass('hidden');
            }
        }
    },

    /**
     * Initialise the create folder button to show the create folder overlay
     */
    initShowCreateFolderOverlayButton: function() {

        'use strict';

        // Cache selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $createFolderIcon = $fileManager.find('.fm-icon.mobile-create-new-folder');

        // On clicking the Create Folder icon
        $createFolderIcon.off('tap').on('tap', function() {

            if (!validateUserAction()) {
                return false;
            }

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

            if (!validateUserAction()) {
                return false;
            }

            if (ulmanager.ulOverStorageQuota) {
                ulmanager.ulShowOverStorageQuotaDialog();
                return false;
            }

            if (ulmanager.isUploading) {
                msgDialog('warninga', l[135], l[47], l[1155]);
                return false;
            }

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
