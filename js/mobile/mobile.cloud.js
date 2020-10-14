/**
 * Functionality for rendering the mobile file manager (cloud drive view) and public folder links
 */
mobile.cloud = {

    /** A boolean flag to store whether the initial folder view has been displayed by the user or not */
    initialFolderOverlayShown: false,

    /** A dictionary of folder handles and the total number of files within that folder */
    folderAndFileCounts: null,

    /**
     * Initial rendering
     */
    renderLayout: function() {

        'use strict';

        // If a public folder link and the initial folder overlay has not been shown yet
        if (pfid && this.initialFolderOverlayShown === false) {

            // Show the initial folder overlay, the button for viewing in the browser
            // will trigger this function again to render the file manager view.
            this.renderInitialFolderOverlay();

            // Hide the loading progress
            loadingDialog.hide();
            loadingInitDialog.hide();

            // Don't render anything else for now
            return false;
        }

        // jQuery selectors
        var $otherPages = $('#fmholder > div:not(.hidden)');
        var $fileManager = $('.mobile.file-manager-block');


        // Render the file manager header, folders, files and footer
        this.initTitleMenu();
        this.renderHeader();
        this.initGridViewToggleHandler();
        this.initDownloadZipHandler();
        this.renderFoldersAndFiles();
        this.renderFoldersAndFilesSubHeader();
        this.showEmptyCloudIfEmpty();
        this.initSelectedUI();

        // Init folder and file row handlers
        this.initFileRowClickHandler();
        this.initFolderRowClickHandler();

        // Initialise context menu on each row
        mobile.cloud.contextMenu.init();

        // Initialise the bottom action bar for Scroll-to-Top, Add Folder, Upload File functionality etc
        mobile.cloud.actionBar.init();

        // Hide the loading progress
        loadingDialog.hide();
        loadingInitDialog.hide();

        // Hide other pages that may be showing and show the Cloud Drive
        $otherPages.addClass('hidden');

        // Show the file manager after everything is ready
        $fileManager.removeClass('hidden');

        // Set viewmode to show thumbnails and render thumbnails after everything else because it can take longer
        M.viewmode = 1;
        fm_thumbnails();
    },

    /**
     * Renders updates to the cloud drive without doing a full render, e.g. new
     * files being added by action packets or files being moved out of the folder
     */
    renderUpdate: function() {

        'use strict';

        // Render the file manager header, folders, files and footer
        this.renderHeader();
        this.renderFoldersAndFiles();
        this.renderFoldersAndFilesSubHeader();
        this.showEmptyCloudIfEmpty();

        // Init folder and file row handlers
        this.initFileRowClickHandler();
        this.initFolderRowClickHandler();

        // Toggle visibility of download as zip
        this.initDownloadZipHandler();

        // Initialise context menu on each row
        mobile.cloud.contextMenu.init();

        // Initialise the bottom action bar for Scroll-to-Top, Add Folder, Upload File functionality etc
        mobile.cloud.actionBar.init();

        // Set viewmode to show thumbnails and render thumbnails after everything else because it can take longer
        M.viewmode = 1;
        fm_thumbnails();
    },

    /**
     * After an action packet update to the cloud drive, this function
     * updates the folder and file count for each folder in the current view
     * @param {String} [nodes] Optional, list of the nodes to be updated
     */
    countAndUpdateSubFolderTotals: function(nodes) {

        'use strict';

        var list = nodes || M.v;

        // Loop through current view
        for (var i = 0; i < list.length; i++) {

            var node = list[i];
            var nodeHandle = node.h;
            var nodeType = node.t;

            // If folder type
            if (nodeType === 1) {

                var numOfFolders = node.td;
                var numOfFiles = node.tf;

                // Translate the text for 1 file/folder or x files/folders
                var foldersWording = numOfFolders === 1 ? l[834] : l[832].replace('[X]', numOfFolders);
                var filesWording = numOfFiles === 1 ? l[835] : l[833].replace('[X]', numOfFiles);

                // Find the existing node and update the number of folders and files
                $('#' + nodeHandle + ' .num-files').text(foldersWording + ', ' + filesWording);
            }
        }
    },

    /**
     * Removes a node from the current view if applicable, updates the footer with the new
     * file/folder count and also shows an empty cloud drive/folder message if applicable
     * @param {String} nodeHandle The handle of the node to be removed
     * @param {String} parentHandle The parent handle of the node to be removed
     */
    renderDelete: function(nodeHandle, parentHandle) {

        'use strict';

        // Remove the node if in the current view
        $('#' + nodeHandle).remove();

        // Update the file/folder count in the footer and show an Empty message and icon if no files
        mobile.cloud.showEmptyCloudIfEmpty();
        mobile.cloud.countAndUpdateSubFolderTotals();
        mobile.cloud.renderFoldersAndFilesSubHeader();

        // If in the current folder and this got removed, then we need to go back up and open the parent folder
        if (M.currentdirid === nodeHandle || M.isCircular(nodeHandle, M.currentdirid) === true) {
            parentHandle = parentHandle || Object(M.getNodeByHandle(nodeHandle)).p || M.getNodeRoot(nodeHandle);
            M.openFolder(parentHandle);
        }
    },

    /**
     * Updates a node in the file manager to show if it has a public link or not
     * @param {String} nodeHandle The node handle of the item to be updated
     */
    updateLinkStatus: function(nodeHandle) {

        'use strict';

        // Find the current node row in the file manager
        var $nodeRow = $('#' + nodeHandle);

        // If the node exists in the current view, update it
        if ($nodeRow.length > 0) {
            var $icon = $nodeRow.find('.fm-icon.link');

            // If it is a public link
            if (typeof M.d[nodeHandle].shares !== 'undefined' && typeof M.d[nodeHandle].shares.EXP !== 'undefined') {

                // Show the link icon
                $icon.removeClass('hidden');
            }
            else {
                // Otherwise hide the link icon
                $icon.addClass('hidden');
            }
        }
    },

    /**
     * Renders the initital folder link overlay asking whether they want to open in the browser or app
     */
    renderInitialFolderOverlay: function() {

        'use strict';

        var $initialFolderView = $('.mobile.inital-folder-view');
        var $folderSize = $initialFolderView.find('.filesize');
        var $folderName = $initialFolderView.find('.filename');
        var $openInBrowserButton = $initialFolderView.find('.red-button.second');
        var $openInAppButton = $initialFolderView.find('.red-button.first');

        // Set the flag so it won't show again
        this.initialFolderOverlayShown = true;

        // Get the current folder name and size
        var currentFolder = M.d[M.currentdirid];
        var currentFolderSize = this.getFullSizeOfFolder();
        var currentFolderName = currentFolder.name;

        // Show the overlay
        $initialFolderView.removeClass('hidden');
        $folderSize.text(currentFolderSize);
        $folderName.text(currentFolderName);

        // If they choose to Open in Browser, then show the file manager
        $openInBrowserButton.off('tap').on('tap', function(event) {
            var preSelected = $.selected;

            // Prevent default redirect to / path
            event.preventDefault();

            // Hide the overlay and render the layout
            $initialFolderView.addClass('hidden');
            mobile.cloud.renderLayout();

            // If there were selected items, restore them and init selected UI.
            if (Array.isArray(preSelected) && preSelected.length > 0) {
                $.selected = preSelected;
                reselect(1);
            }
            return false;
        });

        // If they choose to Open in MEGA App
        $openInAppButton.off('tap').on('tap', function() {

            // Open the folder in the app
            mobile.downloadOverlay.redirectToApp($(this), M.currentdirid);
            return false;
        });
    },

    /**
     * Renders the header of the mobile file manager or public folder link
     */
    renderHeader: function() {

        'use strict';

        // Get selectors
        var $fileManagerHeader = $('.mobile.file-manager-block .fm-header');
        var $backButton = $fileManagerHeader.find('.fm-icon.back');
        var $upButton = $fileManagerHeader.find('.fm-icon.up');
        var $cloudIcon = $fileManagerHeader.find('.fm-icon.cloud');
        var $binIcon = $fileManagerHeader.find(".fm-icon.rubbish-bin");
        var $folderIcon = $fileManagerHeader.find('.fm-icon.folder');
        var $headerTitle = $fileManagerHeader.find(".fm-header-txt");
        var $folderName = $fileManagerHeader.find('.fm-header-txt span');
        var $folderSize = $fileManagerHeader.find('.fm-folder-size');

        // Reset header to blank slate so only buttons/items are enabled as needed
        $backButton.addClass('hidden');
        $upButton.addClass('hidden');
        $cloudIcon.addClass('hidden');
        $binIcon.addClass('hidden');
        $fileManagerHeader.removeClass('folder-link');
        $folderIcon.addClass('hidden');
        $folderName.text('');
        $folderSize.addClass('hidden');

        // Get the current folder
        var currentFolder = M.d[M.currentdirid] || {};

        // If the user is currently in a public folder link
        if (pfid) {

            // Make changes to accommodate folder icon in header layout.
            $fileManagerHeader.addClass('pfid-style');
            $headerTitle.off('tap');

            // If this is the root folder link
            if (M.currentdirid === M.RootID) {

                // Get the full size of the folder including sub directories
                var fileSizesTotal = this.getFullSizeOfFolder();

                // Show a folder icon, the folder name and total size in the center
                $fileManagerHeader.addClass('folder-link');
                $folderIcon.removeClass('hidden');
                $folderSize.text(fileSizesTotal).removeClass('hidden');
            }
            else {
                // If a subfolder of the cloud drive, show the up button
                mobile.showAndInitUpButton($upButton);
            }

            // Update the header with the current folder name
            $folderName.text(currentFolder.name);
        }
        else {
            // Revert PFID header changes.
            $fileManagerHeader.removeClass('pfid-style');
            $headerTitle.off('tap');

            // Otherwise if this is the root folder of the regular cloud drive, show the cloud icon and text
            if (M.currentdirid === M.RootID) {
                $cloudIcon.removeClass('hidden');
                $folderName.text(l[164]);               // Cloud Drive
                $headerTitle.on('tap', function() {
                    mobile.titleMenu.open();
                    return false;
                });
            }
            else if (M.currentdirid === M.RubbishID) {
                $cloudIcon.addClass('hidden');
                $binIcon.removeClass('hidden');
                $folderName.text(l[167]);
                $headerTitle.on('tap', function() {
                    mobile.titleMenu.open();
                    return false;
                });
            }
            else {
                // If a subfolder of the cloud drive, show the up button
                mobile.showAndInitUpButton($upButton);

                // Show the folder name
                $folderName.text(currentFolder.name);
            }
        }
    },

    /**
     * Sums up all the file sizes (including sub directories) in the folder link
     * @returns {String} Returns the size as a human readable string e.g. 3 KB or 3 MB
     */
    getFullSizeOfFolder: function() {

        'use strict';

        var fileSizesTotal = Object(M.d[M.RootID]).tb;

        // Format the text e.g. 3 KB or 3 MB
        var fileSizesTotalFormatted = numOfBytes(fileSizesTotal);
        var fileSizesTotalFormattedText = fileSizesTotalFormatted.size + ' ' + fileSizesTotalFormatted.unit;

        return fileSizesTotalFormattedText;
    },

    /**
     * Renders the files and folders in the mobile folder view
     */
    renderFoldersAndFiles: function() {

        'use strict';

        // jQuery selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerRows = $fileManager.find('.fm-row .fm-scrolling');
        var $folderTemplateSelector = $fileManagerRows.find('.folder.template');
        var $fileTemplateSelector = $fileManagerRows.find('.file.template');
        var $clearFixTemplateSelector = $fileManagerRows.find('.clear.template');

        var output = '';
        var firstFileRendered = false;

        // Loop through top level nodes in the current view (M.v)
        for (var i = 0; i < M.v.length; i++) {

            var node = M.v[i];
            var nodeHandle = node.h;
            var nodeName = node.name;
            var nodeType = node.t;

            var $nodeTemplate = null;

            // If folder type, render a folder
            if (nodeType === 1) {
                $nodeTemplate = this.updateFolderTemplate($folderTemplateSelector, node);
            }
            else {
                // If the first file hasn't been rendered yet (i.e. all the folders have finished rendering) then add a
                // clearfix Cloud Drive item which in grid-view mode clears the floating folders thus rendering the
                // files below them and giving a better appearance.
                if (!firstFileRendered) {
                    output += $clearFixTemplateSelector.clone().removeClass('template').prop('outerHTML');
                    firstFileRendered = true;
                }

                // Render a file
                $nodeTemplate = this.updateFileTemplate($fileTemplateSelector, node);

                if (node.tvf) {
                    $nodeTemplate.addClass('versions');
                }
            }

            // If this is an undecryptable node
            if (typeof missingkeys[nodeHandle] !== 'undefined') {
                nodeName = nodeType === 1 ? l[8686] : l[8687];    // undecrypted folder/file
                $nodeTemplate.addClass('undecrypted');
            }

            // Render common items
            $nodeTemplate.find('.fm-item-name').text(nodeName);
            $nodeTemplate.attr('data-handle', nodeHandle);
            $nodeTemplate.attr('id', nodeHandle);

            // Add `taken-down` class to nodes that are taken down.
            var share = M.getNodeShare(node);
            if (share && share.down) {
                $nodeTemplate.addClass('taken-down');
            }

            // Update the current output
            output += $nodeTemplate.prop('outerHTML');
        }

        // Remove files and folders but not the templates so that it can be re-rendered
        $fileManager.find('.fm-item, .clear').not('.template').remove();

        // Render the output all at once
        $fileManagerRows.append(output);
    },

    /**
     * If the cloud drive or folder is empty this shows an icon and message in the current view
     */
    showEmptyCloudIfEmpty: function() {

        'use strict';

        // jQuery selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerRows = $fileManager.find('.fm-row .fm-scrolling');

        // Reset
        $fileManagerRows.removeClass('empty-cloud empty-folder empty-rubbishbin');

        // If there are no items in the current view
        if (M.v.length === 0) {

            // If the root of the cloud add text "No files in your Cloud Drive"
            if (M.currentdirid === M.RootID) {
                $fileManagerRows.addClass('empty-cloud');
            }
            else if (M.currentdirid === M.RubbishID) {
                $fileManagerRows.addClass('empty-rubbishbin');
            }
            else {
                // Otherwise add text "Empty folder"
                $fileManagerRows.addClass('empty-folder');
            }
        }
    },

    /**
     * Updates the text below the header with the count of folders and files inside this folder
     */
    renderFoldersAndFilesSubHeader: function() {

        'use strict';

        var $infoBar = $('.mobile.file-manager-block .folders-files-text');
        var numOfFolders = 0;
        var numOfFiles = 0;

        // Loop through top level nodes in the current view (M.v)
        for (var i = 0; i < M.v.length; i++) {

            var node = M.v[i];
            var nodeType = node.t;

            // Increment the total of folders
            if (nodeType === 1) {
                numOfFolders++;
            }
            else {
                // Increment the total of files
                numOfFiles++;
            }
        }

        // Change pluralisation e.g. 1 folder or x folders and 1 file or x files
        var folderWording = numOfFolders === 1 ? l[834] : l[832].replace('[X]', numOfFolders);
        var fileWording = numOfFiles === 1 ? l[835] : l[833].replace('[X]', numOfFiles);

        // Update with the count of folders and files inside
        $infoBar.text(folderWording + ', ' + fileWording);
    },

    /**
     * Populate the template row for a folder
     * @param {Object} $templateSelector The jQuery selector for the template
     * @param {Object} node The node object with values
     * @returns {Object} A populated template jQuery object
     */
    updateFolderTemplate: function($templateSelector, node) {

        'use strict';

        var numOfFolders = node.td;
        var numOfFiles = node.tf;

        // Translate the text for 1 file/folder or x files/folders
        var foldersWording = numOfFolders === 1 ? l[834] : l[832].replace('[X]', numOfFolders);
        var filesWording = numOfFiles === 1 ? l[835] : l[833].replace('[X]', numOfFiles);

        // Clone the template
        var $template = $templateSelector.clone().removeClass('template');

        // Shared folder variable
        var share = new mega.Share();

        // Show the number of files in that folder
        $template.find('.num-files').text(foldersWording + ', ' + filesWording);

        // Show the context-menu opener
        $template.find('.fm-icon.open-context-menu').removeClass('hidden');

        // If in regular cloud drive (not a public folder link)
        if (!pfid) {

            // Enable the open folder, link and delete options and open context menu icon
            $template.find('.fm-item-link.open-folder').removeClass('hidden');
            $template.find('.fm-item-link.link').removeClass('hidden');
            $template.find('.fm-item-link.delete').removeClass('hidden');

            // Show the link icon if it already has a public link
            if (typeof node.shares !== 'undefined' && typeof node.shares.EXP !== 'undefined') {
                $template.find('.fm-icon.link').removeClass('hidden');
            }

            if (share.isShareExist([node.h], true, true, false)) {
                $('.shared-folder', $template).removeClass('hidden');
                $('.regular-folder', $template).addClass('hidden');
            }

            if (mega.megadrop.pufs[node.h]) {
                $('.megadrop-folder', $template).removeClass('hidden');
                $('.regular-folder', $template).addClass('hidden');
            }
        }

        return $template;
    },

    /**
     * Populate the template row for a file
     * @param {Object} $templateSelector The jQuery selector for the template
     * @param {Object} node The node object with values
     * @returns {Object} A populated template jQuery object
     */
    updateFileTemplate: function($templateSelector, node) {

        'use strict';

        // Format file size
        var sizeBytes = node.s;
        var sizeFormatted = numOfBytes(sizeBytes);

        // Use the modified timestamp if available, or the MEGA created timestamp, then format date as 12 January 2016
        var modifiedTimestamp = node.mtime || node.ts;
        var fileDate = time2date(modifiedTimestamp, 2);

        // Map the file extension back to the image icon
        var iconName = fileIcon(node);
        var iconPath = mobile.imagePath + iconName + '.png';

        // Update seen property so thumbnails will render
        node.seen = true;

        // Clone the template
        var $template = $templateSelector.clone().removeClass('template');

        // Update template
        $template.find('.file-size').text(sizeFormatted.size + ' ' + sizeFormatted.unit);
        $template.find('.date').text(fileDate);
        $template.removeClass('file-template');
        $template.find('.fm-item-img img').attr('src', iconPath);
        $template.find('.fm-icon.open-context-menu').removeClass('hidden');

        // If in regular cloud drive (not a public folder link)
        if (!pfid) {

            // Enable the open context menu, link and delete options
            $template.find('.fm-item-link.link').removeClass('hidden');
            $template.find('.fm-item-link.delete').removeClass('hidden');

            // Show the link icon if it already has a public link
            if (typeof node.shares !== 'undefined' && typeof node.shares.EXP !== 'undefined') {
                $template.find('.fm-icon.link').removeClass('hidden');
            }
        }

        return $template;
    },

    /**
     * Init TitleMenu
     */
    initTitleMenu: function() {
        'use strict';

        // Init the title Menu controller.
        mobile.titleMenu.init();

        var $titleHeaderTextContainer = $(".fm-header-txt");
        var $titleMenuHandle = $(".mobile.open-title-menu");

        // Attach event handlers local to this page controller.
        if (M.currentdirid === M.RootID || M.currentdirid === M.RubbishID) {
            $titleHeaderTextContainer.off('tap').on('tap', function() {
                mobile.titleMenu.open();
                return false;
            });
            $titleMenuHandle.removeClass('hidden');
        } else {
            $titleHeaderTextContainer.off('tap');
            $titleMenuHandle.addClass('hidden');
        }

    },

    /**
     * Functionality for tapping on a file row which expands or hide the file options (Download / Link / Delete)
     */
    initFileRowClickHandler: function() {

        'use strict';

        var $fileManagerBlock = $('.mobile.file-manager-block');
        var $scrollBlock = $fileManagerBlock.find('.fm-scrolling');
        var $folderAndFileRows = $scrollBlock.find('.fm-item');
        var $fileRows = $folderAndFileRows.filter('.file');

        // If a file row is tapped
        $fileRows.off('tap').on('tap', function() {

            if (!validateUserAction()) {
                return false;
            }

            // Get the node handle and node
            var $currentFileRow = $(this);
            var nodeHandle = $currentFileRow.data('handle');
            var node = M.d[nodeHandle];
            var fileName = node.name;

            // Clear selection
            mobile.cloud.deselect();

            // If this is an image, load the preview slideshow
            if (is_image(node) && fileext(fileName) !== 'pdf' || is_video(node)) {
                mobile.slideshow.init(nodeHandle);
            }
            else {
                // Otherwise show the download overlay immediately
                mobile.downloadOverlay.showOverlay(nodeHandle);

                var $overlay = $('.mobile.bottom-page.scroll-block.download');
                $('.mobile.filetype-img').removeClass('hidden');
                $('.video-block, .video-controls', $overlay).addClass('hidden');

            }

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for tapping a folder row which expands the row and shows an Open button
     */
    initFolderRowClickHandler: function() {

        'use strict';

        var $scrollBlock = $('.mobile.file-manager-block .fm-scrolling');
        var $folderAndFileRows = $scrollBlock.find('.fm-item');
        var $folderRows = $folderAndFileRows.filter('.folder');

        // If a folder row is tapped
        $folderRows.off('tap').on('tap', function() {

            // Get the node handle
            var $currentFolderRow = $(this);
            var nodeHandle = $currentFolderRow.data('handle');

            // Clear Selection
            mobile.cloud.deselect();

            // Open the folder immediately
            M.openFolder(nodeHandle);

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for download as ZIP button in page header.
     */
    initDownloadZipHandler: function() {
        'use strict';
        var $button = $('.mobile.file-manager-block .mobile.fm-icon.download-zip').off('tap');
        if (pfid) {
            $button.removeClass('hidden');
            $button.on('tap', function() {
                mobile.downloadOverlay.showOverlay(M.currentdirid);
                return false;
            });
        } else {
            $button.addClass('hidden');
        }
    },

    /**
     * Initialise the button to toggle the list-view / grid-view in the cloud drive
     */
    initGridViewToggleHandler: function() {

        // Cache selectors
        var $changeViewButton = $('.mobile.file-manager-block .mobile.fm-icon.view-options');
        var $fileManagerBlock = $('.mobile.file-manager-block');

        // If they have previously set the grid mode to be enabled and just done a refresh/reload then enable it again
        if (localStorage.getItem('mobileGridViewModeEnabled') === '1') {
            mobile.cloud.enableGridView($fileManagerBlock, $changeViewButton);
        }
        else {
            // Otherwise enable the list view
            mobile.cloud.enableListView($fileManagerBlock, $changeViewButton);
        }

        // If the Grid/list view icon is tapped
        $changeViewButton.off('tap').on('tap', function() {

            // Toggle the display
            mobile.cloud.toggleGridView($fileManagerBlock, $changeViewButton);
        });
    },

    /**
     * Toggles between list view and grid view
     * @param {Object} $fileManagerBlock The cached jQuery selector for the file manager
     * @param {Object} $changeViewButton The cached jQuery selector for the Change View icon
     */
    toggleGridView: function($fileManagerBlock, $changeViewButton) {

        // If grid view is set already, enable list view
        if ($fileManagerBlock.hasClass('grid-view')) {
            mobile.cloud.enableListView($fileManagerBlock, $changeViewButton);
        }
        else {
            // Otherwise if list view is set already, enable grid view
            mobile.cloud.enableGridView($fileManagerBlock, $changeViewButton);
        }
    },

    /**
     * Enables the grid view
     * @param {Object} $fileManagerBlock The cached jQuery selector for the file manager
     * @param {Object} $changeViewButton The cached jQuery selector for the Change View icon
     */
    enableGridView: function($fileManagerBlock, $changeViewButton) {

        $fileManagerBlock.addClass('grid-view');
        $changeViewButton.removeClass('grid-icon');
        $changeViewButton.addClass('list-icon');

        // Save current grid view state for page refreshes/reloads
        localStorage.setItem('mobileGridViewModeEnabled', '1');
    },

    /**
     * Enables the list view
     * @param {Object} $fileManagerBlock The cached jQuery selector for the file manager
     * @param {Object} $changeViewButton The cached jQuery selector for the Change View icon
     */
    enableListView: function($fileManagerBlock, $changeViewButton) {

        $fileManagerBlock.removeClass('grid-view');
        $changeViewButton.removeClass('list-icon');
        $changeViewButton.addClass('grid-icon');

        // Save current list view state for page refreshes/reloads
        localStorage.setItem('mobileGridViewModeEnabled', '0');
    },

    /**
     * Shows or hides the link icon in the file manager indicating if this file/folder has a public link
     * @param {String} nodeHandle The internal node handle
     */
    updateLinkIcon: function(nodeHandle) {

        'use strict';

        var node = M.d[nodeHandle];
        var $icon = $('#' + nodeHandle).find('.fm-icon.link');

        // If this has a public link, show the link icon
        if (node.ph) {
            $icon.removeClass('hidden');
        }
        else {
            // Otherwise hide it
            $icon.addClass('hidden');
        }
    },

    /**
     * Update M.v from M.c
     */
    updateView: function () {
        'use strict';

        M.filterByParent(M.currentdirid);
        M.doSort('name', 1);
    },

    /**
     * Filter nodes from current view if they are no longer in M.c
     */
    removeNodesFromViewIfRemoved: function() {
        'use strict';

        if (M.c[M.currentdirid]) {
            var curDirContents = Object.keys(M.c[M.currentdirid]);
            M.v = M.v.filter(function(n) {
                return curDirContents.indexOf(n.h) >= 0;
            });
        } else {
            M.v = [];
        }

    },

    /**
     * Checks if a given node is in the view.
     * @return boolean
     */
    nodeInView: function(nodeHandle) {
        'use strict';

        for (var i = 0; i < M.v.length; i++) {
            var n = M.v[i];
            if (n.h === nodeHandle) {
                return true;
            }
        }
        return false;
    },


    /**
     * Hook for nodes.js to call when finished moving a node.
     * @param nodeHandle
     */
    moveFinishedCallback: function(nodeHandle) {
        'use strict';
        if (!mobile.rubbishBin.isRestoring) {
            mobile.deleteOverlay.completeDeletionProcess(nodeHandle);
        }
    },

    /**
     * Deselect all selected nodes.
     */
    deselect: function() {
        'use strict';
        $('.ui-selected').removeClass('ui-selected');
        $.selected = [];
    },

    /**
     * Initialises the Selected UI on folder open.
     */
    initSelectedUI: function() {
        'use strict';

        // Cleanup any previous selections.
        mobile.cloud.deselect();

        // Attach listener on background to deselect elements.
        $('.mobile.file-manager-block .mobile.fm-scrolling').off('tap').on('tap', function() {
            mobile.cloud.deselect();
        });
    },

    /**
     * Scroll the FM to a certain file row.
     * @param handle The file handle
     * @param animationTime Animation time offset (default 500ms).
     */
    scrollToFile: function(handle, animationTime) {
        'use strict';
        var elm = document.getElementById(handle);

        animationTime = animationTime === 0 ? 0 : (animationTime || 500);
        $('.mobile.fm-scrolling').animate({scrollTop: elm && elm.offsetTop || 0}, animationTime);
    }
};
