/**
 * Functionality for rendering the mobile file manager
 */
var mobilefm = {

    /** A flag to store whether the initial folder view has been displayed by the user or not */
    initialFolderOverlayShown: false,

    /** A dictionary of folder handles and the total number of files within that folder */
    folderAndFileCounts: null,

    /**
     * Initial rendering
     */
    renderLayout: function() {

        // If the initial folder overlay has not been shown yet
        if (this.initialFolderOverlayShown === false) {

            // Show the initial folder overlay, the button for viewing in the browser
            // will trigger this function again to render the file manager view.
            this.renderInitialFolderOverlay();

            // Hide the loading progress
            loadingDialog.hide();
            loadingInitDialog.hide();

            // Don't render anything else for now
            return false;
        }

        // Count the number of files in the folders
        this.countFoldersAndFilesInFolders();

        // Render the file manager header, folders, files and footer
        this.renderHeader();
        this.renderFoldersAndFiles();
        this.renderFooter();

        // Init folder and file row handlers
        this.initFileOptionsToggle();
        this.initFolderOptionsToggle();

        // Hide the loading progress
        loadingDialog.hide();
        loadingInitDialog.hide();

        // Show the file manager after everything is ready
        $('.mobile.fm-block').removeClass('hidden');

        // Render thumbnails afterwards which can take longer
        fm_thumbnails();
    },

    /**
     * Renders the initital folder link overlay asking whether they want to open in the browser or app
     */
    renderInitialFolderOverlay: function() {

        var $initialFolderView = $('.mobile.inital-folder-view');
        var $folderSize = $initialFolderView.find('.filesize');
        var $folderName = $initialFolderView.find('.filename');
        var $openInBrowserButton = $initialFolderView.find('.red-button.first');
        var $openInAppButton = $initialFolderView.find('.red-button.second');

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

            // Prevent default redirect to / path
            event.preventDefault();

            // Hide the overlay and render the layout
            $initialFolderView.addClass('hidden');
            mobilefm.renderLayout();
        });

        // If they choose to Open in MEGA App
        $openInAppButton.off('tap').on('tap', function() {

            // Open the folder in the app
            mega.utils.redirectToApp($(this));
            return false;
        });
    },

    /**
     * Renders the header of the file manager
     */
    renderHeader: function() {

        // Get selectors
        var $fileManagerHeader = $('.mobile.fm-block .fm-header');
        var $backButton = $fileManagerHeader.find('.fm-icon.back');
        var $folderIcon = $fileManagerHeader.find('.fm-icon.folder');
        var $folderName = $fileManagerHeader.find('.fm-header-txt span');
        var $folderSize = $fileManagerHeader.find('.fm-folder-size');

        // If this is the root folder link, hide the back button, show a folder icon and the folder size
        if (M.RootID === M.currentdirid) {

            // Get the full size of the folder including sub directories
            var fileSizesTotal = this.getFullSizeOfFolder();

            // Show a folder icon, the folder name and total size
            $fileManagerHeader.addClass('folder-link');
            $backButton.addClass('hidden');
            $folderIcon.removeClass('hidden');
            $folderSize.removeClass('hidden');
            $folderSize.text(fileSizesTotal);
        }
        else {
            // Otherwise for sub folders, just show the opened folder state with the folder name and back button
            $fileManagerHeader.removeClass('folder-link');
            $backButton.removeClass('hidden');
            $folderIcon.addClass('hidden');
            $folderSize.addClass('hidden');

            // On click of the back arrow icon, open the previous folder
            $backButton.off('tap').on('tap', function() {
                window.history.back();
            });
        }

        // Find the current folder
        var currentFolder = M.d[M.currentdirid];

        // Update the header with the current folder name
        $folderName.text(currentFolder.name);
    },

    /**
     * Sums up all the file sizes (including sub directories) in the folder link
     * @returns {String} Returns the size as a human readable string e.g. 3 KB or 3 MB
     */
    getFullSizeOfFolder: function() {

        var fileSizesTotal = 0;

        // Loop through all known nodes
        for (var nodeHandle in M.d) {
            if (M.d.hasOwnProperty(nodeHandle)) {

                var node = M.d[nodeHandle];
                var nodeType = node.t;
                var nodeSize = node.s;

                // If node is a file type, update the total
                if (nodeType === 0) {
                    fileSizesTotal += nodeSize;
                }
            }
        }

        // Format the text e.g. 3 KB or 3 MB
        var fileSizesTotalFormatted = numOfBytes(fileSizesTotal);
        var fileSizesTotalFormattedText = fileSizesTotalFormatted.size + ' ' + fileSizesTotalFormatted.unit;

        return fileSizesTotalFormattedText;
    },

    /**
     * Renders the files and folders in the mobile folder view
     */
    renderFoldersAndFiles: function() {

        // jQuery selectors
        var $fileManager = $('.mobile.fm-block');
        var $fileManagerRows = $fileManager.find('.fm-row .fm-scrolling');
        var $folderTemplateSelector = $fileManagerRows.find('.folder.template');
        var $fileTemplateSelector = $fileManagerRows.find('.file.template');

        var output = '';

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
                // Otherwise render a file
                $nodeTemplate = this.updateFileTemplate($fileTemplateSelector, node);
            }

            // Render common items
            $nodeTemplate.find('.fm-item-name').text(nodeName);
            $nodeTemplate.attr('data-handle', nodeHandle);
            $nodeTemplate.attr('id', nodeHandle);

            // Update the current output
            output += $nodeTemplate.prop('outerHTML');
        }

        // Remove files and folders but not the templates so that it can be re-rendered
        $fileManager.find('.fm-item').not('.template').remove();

        // Render the output all at once and show the file manager
        $fileManagerRows.append(output);
    },

    /**
     * Updates the footer with the count of folders and files inside this folder
     */
    renderFooter: function() {

        var $bottomInfoBar = $('.mobile.fm-block .fm-bottom');
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
        var folderWording = (numOfFolders === 1) ? l[834] : l[832].replace('[X]', numOfFolders);
        var fileWording = (numOfFiles === 1) ? l[835] : l[833].replace('[X]', numOfFiles);

        // Update the footer with the count of folders and files inside
        $bottomInfoBar.text(folderWording + ', ' + fileWording);
    },

    /**
     * Populate the template row for a folder
     * @param {Object} $templateSelector The jQuery selector for the template
     * @param {Object} node The node object with values
     * @returns {Object} A populated template jQuery object
     */
    updateFolderTemplate: function($templateSelector, node) {

        var nodeHandle = node.h;
        var numOfFolders = 0;
        var numOfFiles = 0;

        // Check it is defined for this node, then get the number of folders and files directly inside the folder
        if (typeof this.folderAndFileCounts[nodeHandle] !== 'undefined') {
            numOfFolders = this.folderAndFileCounts[nodeHandle].folders;
            numOfFiles = this.folderAndFileCounts[nodeHandle].files;
        }

        // Translate the text for 1 file/folder or x files/folders
        var foldersWording = (numOfFolders === 1) ? l[834] : l[832].replace('[X]', numOfFolders);
        var filesWording = (numOfFiles === 1) ? l[835] : l[833].replace('[X]', numOfFiles);

        // Clone the template
        var $template = $templateSelector.clone().removeClass('template');

        // Show the number of files in that folder
        $template.find('.num-files').text(foldersWording + ', ' + filesWording);

        return $template;
    },

    /**
     * Create a dictionary with the keys of the parent folder handles
     * and the number of folders and files directly inside that folder
     */
    countFoldersAndFilesInFolders: function() {

        // Don't re-count the folders and files every render
        if (this.folderAndFileCounts !== null) {
            return false;
        }

        var folderAndFileCounts = {};

        // Loop all known nodes
        for (var nodeHandle in M.d) {
            if (M.d.hasOwnProperty(nodeHandle)) {

                var node = M.d[nodeHandle];
                var parentHandle = node.p;
                var nodeType = node.t;

                // If the key is not set
                if (typeof folderAndFileCounts[parentHandle] === 'undefined') {

                    // Set the key to the parent handle and us an object to hold the number of folders and files
                    folderAndFileCounts[parentHandle] = {
                        folders: 0,
                        files: 0
                    };
                }

                // Increment the total for a folder found with this parent
                if (nodeType) {
                    folderAndFileCounts[parentHandle].folders += 1;
                }
                else {
                    // Otherwise increment the total for a file found with this parent
                    folderAndFileCounts[parentHandle].files += 1;
                }
            }
        }

        // Store for use later
        this.folderAndFileCounts = folderAndFileCounts;
    },

    /**
     * Populate the template row for a file
     * @param {Object} $templateSelector The jQuery selector for the template
     * @param {Object} node The node object with values
     * @returns {Object} A populated template jQuery object
     */
    updateFileTemplate: function($templateSelector, node) {

        // Format file size
        var sizeBytes = node.s;
        var sizeFormatted = numOfBytes(sizeBytes);

        // Use the modified timestamp if available, or the MEGA created timestamp, then format date as 12 January 2016
        var modifiedTimestamp = node.mtime || node.ts;
        var fileDate = humandate(modifiedTimestamp);

        // Map the file extension back to the image icon
        var iconName = fileIcon(node);
        var iconPath = staticpath + 'images/mobile/extensions/' + iconName + '.png';

        // Update seen property so thumbnails will render
        node.seen = true;

        // Clone the template
        var $template = $templateSelector.clone().removeClass('template');

        // Update template
        $template.find('.file-size').text(sizeFormatted.size + ' ' + sizeFormatted.unit);
        $template.find('.date').text(fileDate);
        $template.removeClass('file-template');
        $template.find('.fm-item-img img').attr('src', iconPath);

        return $template;
    },

    /**
     * Functionality for tapping on a file row which expands or hide the file options (Download / Link / Delete)
     */
    initFileOptionsToggle: function() {

        var $folderAndFileRows = $('.mobile.fm-item');
        var $fileRows = $folderAndFileRows.filter('.file');
        var $fileOptions = $('.fm-item.file.template .fm-item-link').not('.hidden');

        // If a file row is tapped
        $fileRows.off('tap').on('tap', function() {

            // Get the node handle
            var $currentFileRow = $(this);
            var nodeHandle = $currentFileRow.data('handle');

            // If only one option is available (e.g. Download for folder links), show the download overlay immediately
            if ($fileOptions.length === 1) {
                mobileDownload.showOverlay(nodeHandle);
            }
            else {
                // Otherwise inititalise tap handler on the Download button
                mobilefm.initFileOptionsDownloadButton($currentFileRow, nodeHandle);

                // Hide all expanded rows, then just toggle the state of the current row
                $folderAndFileRows.not($currentFileRow).removeClass('expanded');
                $currentFileRow.toggleClass('expanded');
            }

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for downloading a file
     * @param {Object} $currentFileRow A jQuery object for the current file item
     * @param {String} nodeHandle The node handle for this file
     */
    initFileOptionsDownloadButton: function($currentFileRow, nodeHandle) {

        // If the Download button is tapped
        $currentFileRow.find('.fm-item-link.download').off('tap').on('tap', function(event) {

            // Prevent the options toggle from hiding
            event.stopPropagation();

            // Show the file download overlay
            mobileDownload.showOverlay(nodeHandle);

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for tapping a folder row which expands the row and shows an Open button
     */
    initFolderOptionsToggle: function() {

        var $folderAndFileRows = $('.mobile.fm-item');
        var $folderRows = $folderAndFileRows.filter('.folder');
        var $folderOptions = $('.fm-item.folder.template .fm-item-link').not('.hidden');

        // If a folder row is tapped
        $folderRows.off('tap').on('tap', function() {

            // Get the node handle
            var $currentFolderRow = $(this);
            var nodeHandle = $currentFolderRow.data('handle');

            // If only one option is available (e.g. Open for folder links), open the folder immediately
            if ($folderOptions.length === 1) {
                M.openFolder(nodeHandle);
            }
            else {
                // Inititalise tap handler
                mobilefm.initFolderOpenButtonHandler($currentFolderRow, nodeHandle);

                // Hide all expanded rows, then just toggle the state of the current row
                $folderAndFileRows.not($currentFolderRow).removeClass('expanded');
                $currentFolderRow.toggleClass('expanded');
            }

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for opening a folder and displaying the contents
     * @param {Object} $currentFileRow A jQuery object for the current folder item
     * @param {String} nodeHandle The node handle for this folder
     */
    initFolderOpenButtonHandler: function($currentFileRow, nodeHandle) {

        // If the Download button is tapped
        $currentFileRow.find('.fm-item-link.open-folder').off('tap').on('tap', function() {

            // Open the folder and render the contents
            M.openFolder(nodeHandle);

            // Prevent click passing through
            return false;
        });
    }
};
