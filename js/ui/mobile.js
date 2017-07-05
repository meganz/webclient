/**
 * Root namespace for the mobile web site, contains common variables and functions
 */
var mobile = {

    /** The base path for images */
    imagePath: staticpath + 'images/mobile/extensions/',

    /**
     * Show a simple toast message and hide it after 3 seconds
     * @param {String} message The message to show
     * @param {String} position Optional flag to show the position at the top, by default it shows at the bottom
     */
    showToast: function(message, position) {

        var $toastNotification = $('.mobile.toast-notification');

        // Set the message and show the notification
        $toastNotification.text(message).removeClass('hidden').addClass('active');

        // Show the toast notification at the top of the page (useful if the keyboard is open and blocking the bottom)
        if (position === 'top') {
            $toastNotification.addClass('top');
        }

        // After 3 seconds, hide the notification
        setTimeout(function() {
            $toastNotification.addClass('hidden').removeClass('active top');
        }, 3000);
    },

    /**
     * Shows and initialises the back button on click/tap event handler
     * @param {Object} $backButton jQuery selector for the back button
     */
    showAndInitBackButton: function($backButton) {

        // Show the back button
        $backButton.removeClass('hidden');

        // On click of the back button
        $backButton.off('tap').on('tap', function() {

            // Open the previous folder/page
            window.history.back();
            return false;
        });
    },

    /**
     * Initialises the Login and Register tab buttons
     * @param {String} showTab The tab to show immediately i.e. 'login' or 'register'
     */
    initTabs: function(showTab) {

        // Cache selectors
        var $screen = $('.mobile.signin-register-block');
        var $loginTab = $screen.find('.top-link.sign-in');
        var $registerTab = $screen.find('.top-link.register');
        var $loginContent = $screen.find('.tab-block.sign-in');
        var $registerContent = $screen.find('.tab-block.register');

        // Show the signin content and light up the signin tab
        if (showTab === 'login') {
            $loginContent.removeClass('hidden');
            $loginTab.addClass('active');
        }
        else {
            // Otherwise show the register content and light up the register tab
            $registerContent.removeClass('hidden');
            $registerTab.addClass('active');
        }

        // If the login tab is clicked, load the login page
        $loginTab.off('tap').on('tap', function() {

            loadSubPage('login');
            return false;
        });

        // If the register tab is clicked, load the register page
        $registerTab.off('tap').on('tap', function() {

            loadSubPage('register');
            return false;
        });
    },

    /**
     * Initialise checkbox on click/tap functionality which has special styling and requires extra code
     * @param {String} className The container class name which contains the checkbox input and label
     */
    initCheckbox: function(className) {

        var $container = $('.mobile.' + className);
        var $checkboxWrapper = $container.find('.square');
        var $checkboxInput = $checkboxWrapper.find('.checkbox');

        // On clicking the checkbox or label
        $container.off('tap').on('tap', function() {

            // If checked already, uncheck it
            if ($checkboxInput.is(':checked')) {

                $checkboxWrapper.addClass('checkboxOff').removeClass('checkboxOn');
                $checkboxInput.prop('checked', false);
            }
            else {
                // Otherwise check it
                $checkboxWrapper.removeClass('checkboxOff').addClass('checkboxOn');
                $checkboxInput.prop('checked', true);
            }

            // Prevent double clicks
            return false;
        });
    },

    /**
     * Initialise the MEGA icon on various pages to go back to the homepage or cloud drive
     */
    initHeaderMegaIcon: function() {

        // On Mega icon click
        $('.fm-icon.mega').off('tap').on('tap', function() {

            // If logged in
            if (typeof u_attr !== 'undefined') {

                // Store the current page
                var currentPage = page;

                // Open the root cloud folder
                loadSubPage('fm');

                // If they were on the TOS page then the cloud doesn't reload for some reason so refresh
                if (currentPage === 'terms') {
                    window.location.reload();
                }
            }
            else {
                // Otherwise if not logged in, load the home page
                loadSubPage('start');
            }

            return false;
        });
    },

    /**
     * Changes the app store badge depending on what device they have
     */
    initMobileAppButton: function() {

        var $appStoreButton = $('.download-app, .startpage .mobile-apps-button');

        // Set the link
        $appStoreButton.attr('href', mobile.downloadOverlay.getStoreLink());

        // If iOS, Windows or Android show the relevant app store badge
        switch (ua.details.os) {

            case 'iPad':
            case 'iPhone':
                $appStoreButton.removeClass('hidden').addClass('ios');
                break;

            case 'Windows Phone':
                $appStoreButton.removeClass('hidden').addClass('wp');
                break;

            default:
                // Android and others
                $appStoreButton.removeClass('hidden').addClass('android');
                break;
        }
    }
};


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

        // If a public folder link and the initial folder overlay has not been shown yet
        if (pfid && (this.initialFolderOverlayShown === false)) {

            // Show the initial folder overlay, the button for viewing in the browser
            // will trigger this function again to render the file manager view.
            this.renderInitialFolderOverlay();

            // Hide the loading progress
            loadingDialog.hide();
            loadingInitDialog.hide();

            // Don't render anything else for now
            return false;
        }

        // Render the file manager header, folders, files and footer
        this.renderHeader();
        this.renderFoldersAndFiles();
        this.renderFooter();
        this.showEmptyCloudIfEmpty();

        // Init folder and file row handlers
        this.initFileOptionsToggle();
        this.initFolderOptionsToggle();

        // Hide the loading progress
        loadingDialog.hide();
        loadingInitDialog.hide();

        // Show the file manager after everything is ready
        $('.mobile.file-manager-block').removeClass('hidden');

        // Set viewmode to show thumbnails and render thumbnails after everything else because it can take longer
        M.viewmode = 1;
        fm_thumbnails();
    },

    /**
     * Renders updates to the cloud drive without doing a full render, e.g. new
     * files being added by action packets or files being moved out of the folder
     */
    renderUpdate: function() {

        // jQuery selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerRows = $fileManager.find('.fm-row .fm-scrolling');
        var $folderTemplateSelector = $fileManagerRows.find('.folder.template');
        var $fileTemplateSelector = $fileManagerRows.find('.file.template');

        var newNodesOutput = '';

        // Loop through new nodes
        for (var i = 0; i < newnodes.length; i++) {

            var node = newnodes[i];
            var nodeHandle = node.h;
            var nodeName = node.name;
            var nodeType = node.t;
            var nodeParentHandle = node.p;

            // If the new node does not have a parent handle that is the same as the current
            // view's node handle, then it's for a subfolder or something else so skip it
            if (M.currentdirid !== nodeParentHandle) {
                continue;
            }

            var $nodeTemplate = null;
            var $existingNode = $('#' + nodeHandle);

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

            // If the node is already rendered and this is an update of it
            if ($existingNode.length > 0) {

                // Insert the updated node before the existing one, then remove the existing node
                $nodeTemplate.insertBefore($existingNode);
                $existingNode.remove();
            }
            else {
                // Otherwise append to the current output
                newNodesOutput += $nodeTemplate.prop('outerHTML');
            }
        }

        // Render the new nodes at the end of the existing ones
        $fileManagerRows.append(newNodesOutput);

        // Render the footer to update number of files/folders in the current folder, if empty show an icon and message
        this.showEmptyCloudIfEmpty();
        this.countAndUpdateSubFolderTotals();
        this.renderFooter();

        // Re-initialise click handlers
        this.initFileOptionsToggle();
        this.initFolderOptionsToggle();

        // Set viewmode to show thumbnails and render thumbnails after everything else because it can take longer
        M.viewmode = 1;
        fm_thumbnails();
    },

    /**
     * After an action packet update to the cloud drive, this function
     * updates the folder and file count for each folder in the current view
     */
    countAndUpdateSubFolderTotals: function() {

        // Loop through current view
        for (var i = 0; i < M.v.length; i++) {

            var node = M.v[i];
            var nodeHandle = node.h;
            var nodeType = node.t;

            // If folder type
            if (nodeType === 1) {

                var numOfFolders = node.td;
                var numOfFiles = node.tf;

                // Translate the text for 1 file/folder or x files/folders
                var foldersWording = (numOfFolders === 1) ? l[834] : l[832].replace('[X]', numOfFolders);
                var filesWording = (numOfFiles === 1) ? l[835] : l[833].replace('[X]', numOfFiles);

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

        // Remove the node if in the current view
        $('#' + nodeHandle).remove();

        // Update the file/folder count in the footer and show an Empty message and icon if no files
        mobile.cloud.showEmptyCloudIfEmpty();
        mobile.cloud.countAndUpdateSubFolderTotals();
        mobile.cloud.renderFooter();

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

        // Find the current node row in the file manager
        var $nodeRow = $('#' + nodeHandle);

        // If the node exists in the current view, update it
        if ($nodeRow.length > 0) {
            var $icon = $nodeRow.find('.fm-icon.link');

            // If it is a public link
            if ((typeof M.d[nodeHandle].shares !== 'undefined') && typeof M.d[nodeHandle].shares.EXP !== 'undefined') {

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
            mobile.cloud.renderLayout();
            return false;
        });

        // If they choose to Open in MEGA App
        $openInAppButton.off('tap').on('tap', function() {

            // Open the folder in the app
            mobile.downloadOverlay.redirectToApp($(this));
            return false;
        });
    },

    /**
     * Renders the header of the mobile file manager or public folder link
     */
    renderHeader: function() {

        // Get selectors
        var $fileManagerHeader = $('.mobile.file-manager-block .fm-header');
        var $backButton = $fileManagerHeader.find('.fm-icon.back');
        var $cloudIcon = $fileManagerHeader.find('.fm-icon.cloud');
        var $uploadIcon = $fileManagerHeader.find('.fm-icon.upload');
        var $menuIcon = $fileManagerHeader.find('.fm-icon.menu');
        var $folderIcon = $fileManagerHeader.find('.fm-icon.folder');
        var $folderName = $fileManagerHeader.find('.fm-header-txt span');
        var $folderSize = $fileManagerHeader.find('.fm-folder-size');

        // Reset header to blank slate so only buttons/items are enabled as needed
        $backButton.addClass('hidden');
        $cloudIcon.addClass('hidden');
        $uploadIcon.addClass('hidden');
        $menuIcon.addClass('hidden');
        $fileManagerHeader.removeClass('folder-link');
        $folderIcon.addClass('hidden');
        $folderName.text('');
        $folderSize.addClass('hidden');

        // Get the current folder
        var currentFolder = M.d[M.currentdirid];

        // If the user is currently in a public folder link
        if (pfid) {

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
                // Otherwise show the back button
                mobile.showAndInitBackButton($backButton);
            }

            // Update the header with the current folder name
            $folderName.text(currentFolder.name);
        }
        else {
            // Otherwise if this is the root folder of the regular cloud drive, show the cloud icon and text
            if (M.currentdirid === M.RootID) {
                $cloudIcon.removeClass('hidden');
                // $uploadIcon.removeClass('hidden');    // ToDo: re-enable when finished
                $folderName.text(l[164]);               // Cloud Drive
            }
            else {
                // Otherwise if a subfolder of the cloud drive, show the back button and the folder name
                mobile.showAndInitBackButton($backButton);
                $folderName.text(currentFolder.name);
            }

            // Show the hamburger menu and initialise the upload button
            mobile.menu.showAndInit('cloud-drive');
            // mobile.upload.initUploadButton();         // ToDo: re-enable when finished
        }
    },

    /**
     * Sums up all the file sizes (including sub directories) in the folder link
     * @returns {String} Returns the size as a human readable string e.g. 3 KB or 3 MB
     */
    getFullSizeOfFolder: function() {

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

        // jQuery selectors
        var $fileManager = $('.mobile.file-manager-block');
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

            // If this is an undecryptable node
            if (typeof missingkeys[nodeHandle] !== 'undefined') {
                nodeName = (nodeType === 1) ? l[8686] : l[8687];    // undecrypted folder/file
                $nodeTemplate.addClass('undecrypted');
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

        // Render the output all at once
        $fileManagerRows.append(output);
    },

    /**
     * If the cloud drive or folder is empty this shows an icon and message in the current view
     */
    showEmptyCloudIfEmpty: function() {

        // jQuery selectors
        var $fileManager = $('.mobile.file-manager-block');
        var $fileManagerRows = $fileManager.find('.fm-row .fm-scrolling');

        // Reset
        $fileManagerRows.removeClass('empty-cloud empty-folder');

        // If there are no items in the current view
        if (M.v.length === 0) {

            // If the root of the cloud add text "No files in your Cloud Drive"
            if (M.currentdirid === M.RootID) {
                $fileManagerRows.addClass('empty-cloud');
            }
            else {
                // Otherwise add text "Empty folder"
                $fileManagerRows.addClass('empty-folder');
            }
        }
    },

    /**
     * Updates the footer with the count of folders and files inside this folder
     */
    renderFooter: function() {

        var $bottomInfoBar = $('.mobile.file-manager-block .fm-bottom');
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
        var numOfFolders = node.td;
        var numOfFiles = node.tf;

        // Translate the text for 1 file/folder or x files/folders
        var foldersWording = (numOfFolders === 1) ? l[834] : l[832].replace('[X]', numOfFolders);
        var filesWording = (numOfFiles === 1) ? l[835] : l[833].replace('[X]', numOfFiles);

        // Clone the template
        var $template = $templateSelector.clone().removeClass('template');

        // Show the number of files in that folder
        $template.find('.num-files').text(foldersWording + ', ' + filesWording);

        // If in regular cloud drive (not a public folder link)
        if (!pfid) {

            // Enable the open, link and delete options
            $template.find('.fm-item-link.open-folder').removeClass('hidden');
            $template.find('.fm-item-link.link').removeClass('hidden');
            $template.find('.fm-item-link.delete').removeClass('hidden');

            // Show the link icon if it already has a public link
            if ((typeof node.shares !== 'undefined') && (typeof node.shares.EXP !== 'undefined')) {
                $template.find('.fm-icon.link').removeClass('hidden');
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

        // If in regular cloud drive (not a public folder link)
        if (!pfid) {

            // Enable the link and delete options
            $template.find('.fm-item-link.link').removeClass('hidden');
            $template.find('.fm-item-link.delete').removeClass('hidden');

            // Show the link icon if it already has a public link
            if ((typeof node.shares !== 'undefined') && (typeof node.shares.EXP !== 'undefined')) {
                $template.find('.fm-icon.link').removeClass('hidden');
            }
        }

        return $template;
    },

    /**
     * Functionality for tapping on a file row which expands or hide the file options (Download / Link / Delete)
     */
    initFileOptionsToggle: function() {

        var $scrollBlock = $('.mobile.file-manager-block .fm-scrolling');
        var $folderAndFileRows = $scrollBlock.find('.fm-item');
        var $fileRows = $folderAndFileRows.filter('.file');

        // Get the last file row and see how many options it has enabled
        var $fileOptions = $('.fm-item.file:last-child .fm-item-link').not('.hidden');

        // If a file row is tapped
        $fileRows.off('tap').on('tap', function() {

            // Get the node handle
            var $currentFileRow = $(this);
            var nodeHandle = $currentFileRow.data('handle');

            // If only one option is available (e.g. Download for folder links), show the download overlay immediately
            if ($fileOptions.length === 1) {
                mobile.downloadOverlay.showOverlay(nodeHandle);
            }
            else {
                // Otherwise inititalise tap handler on the buttons
                mobile.cloud.initFileOptionsDownloadButton($currentFileRow, nodeHandle);
                mobile.cloud.initDeleteButton($currentFileRow, nodeHandle);
                mobile.cloud.initLinkButton($currentFileRow, nodeHandle);

                // Hide all expanded rows, then just toggle the state of the current row
                $folderAndFileRows.not($currentFileRow).removeClass('expanded');
                $currentFileRow.toggleClass('expanded');
            }

            // If the last item was clicked/tapped this may appear below the bottom status bar so scroll down more
            if ($currentFileRow.is(':last-child')) {
                $scrollBlock.scrollTop($scrollBlock.prop('scrollHeight'));
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
            mobile.downloadOverlay.showOverlay(nodeHandle);

            // Prevent pre clicking one of the Open in Browser/App buttons
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {Object} $currentFileRow A jQuery object for the current file item
     * @param {String} nodeHandle The node handle for this file
     */
    initDeleteButton: function($currentFileRow, nodeHandle) {

        // If the Delete button is tapped
        $currentFileRow.find('.fm-item-link.delete').off('tap').on('tap', function(event) {

            // Prevent the options toggle from hiding
            event.stopPropagation();

            // Show the file delete overlay
            mobile.deleteOverlay.show(nodeHandle);

            // Prevent pre clicking one of the buttons
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user create and copy a file/folder link
     * @param {Object} $currentFileRow A jQuery object for the current file item
     * @param {String} nodeHandle The node handle for this file
     */
    initLinkButton: function($currentFileRow, nodeHandle) {

        // If the Link button is tapped
        $currentFileRow.find('.fm-item-link.link').off('tap').on('tap', function(event) {

            // Prevent the options toggle from hiding
            event.stopPropagation();

            // Show the file link overlay
            mobile.linkOverlay.show(nodeHandle);

            // Prevent pre clicking one of the buttons
            return false;
        });
    },

    /**
     * Functionality for tapping a folder row which expands the row and shows an Open button
     */
    initFolderOptionsToggle: function() {

        var $scrollBlock = $('.mobile.file-manager-block .fm-scrolling');
        var $folderAndFileRows = $scrollBlock.find('.fm-item');
        var $folderRows = $folderAndFileRows.filter('.folder');

        // Get the last folder row and see how many options it has enabled
        var $folderOptions = $('.fm-item.folder').last().find('.fm-item-link').not('.hidden');

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
                // Otherwise inititalise tap handler on the buttons
                mobile.cloud.initFolderOpenButtonHandler($currentFolderRow, nodeHandle);
                mobile.cloud.initDeleteButton($currentFolderRow, nodeHandle);
                mobile.cloud.initLinkButton($currentFolderRow, nodeHandle);

                // Hide all expanded rows, then just toggle the state of the current row
                $folderAndFileRows.not($currentFolderRow).removeClass('expanded');
                $currentFolderRow.toggleClass('expanded');
            }

            // If the last item was clicked/tapped this may appear below the bottom status bar so scroll down more
            if ($currentFolderRow.is(':last-child')) {
                $scrollBlock.scrollTop($scrollBlock.prop('scrollHeight'));
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
    },

    /**
     * Shows or hides the link icon in the file manager indicating if this file/folder has a public link
     * @param {String} nodeHandle The internal node handle
     */
    updateLinkIcon: function(nodeHandle) {

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
    }
};


/**
 * Code to show the file not found overlay for when the link was taken down
 */
mobile.notFoundOverlay = {

    /**
     * Initialise the overlay
     */
    show: function() {

        // Store the selector
        var $overlay = $('#mobile-ui-notFound');
        var $errorText = $overlay.find('.na-file-txt');
        var $image = $overlay.find('.filetype-img');

        // If a folder link show 'The folder you are trying to view is no longer available.'
        if (pfid) {
            $errorText.text(l[16346]);
            $image.attr('src', mobile.imagePath + 'folder.png');
        }
        else {
            // Otherwise show "The file you are trying to download is no longer available."
            $errorText.text(l[243]);
            $image.attr('src', mobile.imagePath + 'na.png');
        }

        // Show the overlay
        $overlay.removeClass('hidden').addClass('overlay');
    }
};


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
     */
    show: function(nodeHandle) {

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
        this.initDeleteButton(nodeHandle);
        this.initCancelAndCloseButtons();

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari and show the overlay
        this.$fileManagerBlock.addClass('disable-scroll');
        this.$overlay.removeClass('hidden').addClass('overlay');
    },

    /**
     * Initialise the Delete button on the file download overlay
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initDeleteButton: function(nodeHandle) {

        this.$overlay.find('.first.delete').off('tap').on('tap', function() {

            // Delete the file
            $.selected = [nodeHandle];
            fmremove();

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * A callback for the deletion process to close the dialog
     * @param {String} nodeHandle The node handle for this folder/file
     */
    completeDeletionProcess: function(nodeHandle) {

        // Remove the node if in the current view
        $('#' + nodeHandle).remove();

        // Store a log for statistics
        api_req({ a: 'log', e: 99638, m: 'Deleted a node on the mobile webclient' });

        // Update the file/folder count in the footer and show an Empty message and icon if no files
        mobile.cloud.showEmptyCloudIfEmpty();
        mobile.cloud.countAndUpdateSubFolderTotals();
        mobile.cloud.renderFooter();

        // Re-show the file manager and re-enable scrolling, hide overlay with download button options and show a toast
        mobile.deleteOverlay.$fileManagerBlock.removeClass('hidden disable-scroll');
        mobile.deleteOverlay.$overlay.addClass('hidden');
        mobile.showToast(l[16347]);                           // File deleted
    },

    /**
     * Initialises the close button on the overlay with download button options and also the download progress overlay
     */
    initCancelAndCloseButtons: function() {

        var $closeAndCancelButtons = this.$overlay.find('.fm-dialog-close, .second.cancel');

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


/**
 * Code to trigger the mobile file manager's export/copy and remove link overlay and related behaviour
 */
mobile.linkOverlay = {

    /** jQuery selector for the overlay */
    $overlay: null,

    /**
     * Initialise the overlay
     * @param {String} nodeHandle A public or regular node handle
     */
    show: function(nodeHandle) {

        // Store the selector as it is re-used
        this.$overlay = $('#mobile-ui-copy-link');

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

        // By default hide the public link and remove button also show the copy button as disabled
        this.$overlay.find('.public-link').addClass('hidden');
        this.$overlay.find('.copy').addClass('disabled');
        this.$overlay.find('.remove').addClass('disabled');

        // If a link already exists for this, show the link and copy/remove buttons
        if (node.ph) {
            this.showPublicLinkAndEnableButtons(nodeHandle);
        }
        else {
            // Otherwise create the link
            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': false,
                'updateUI': false,
                'nodesToProcess': [nodeHandle]
            });
            exportLink.getExportLink();
        }

        // Initialise the buttons
        this.initCopyButton(nodeHandle);
        this.initRemoveButton(nodeHandle);
        this.initCloseButton();

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari
        $('.mobile.file-manager-block').addClass('disable-scroll');

        // Show the overlay
        this.$overlay.removeClass('hidden').addClass('overlay');
    },

    /**
     * Initialise the Copy link button on the overlay
     * @param {String} nodeHandle The node handle for this file
     */
    initCopyButton: function(nodeHandle) {

        this.$overlay.find('.copy').off('tap').on('tap', function() {

            // If the link is created (has a public handle), copy the public link to the clipboard
            if (M.d[nodeHandle].ph) {
                mobile.linkOverlay.copyPublicLink(nodeHandle);
            }

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Copy the public link to the user's clipboard
     */
    copyPublicLink: function() {

        try {
            // Select / highlight the text
            document.getElementById('mobile-public-link').select();

            // Copy it to the clipboard
            var success = document.execCommand('copy');

            // If it succeeded, show a toast message at the top of the page (because of the onscreen keyboard)
            if (success) {
                mobile.showToast(l[7677]);    // Link copied
            }
            else {
                // Otherwise tell them to copy manually
                mobile.showToast(l[16348]);
            }
        }
        catch (exception) {

            // If not supported, tell them to copy manually
            mobile.showToast(l[16348]);
        }
    },

    /**
     * Shows the public link in a text area, also enables the copy and remove buttons
     * @param {String} nodeHandle The internal node handle
     */
    showPublicLinkAndEnableButtons: function(nodeHandle) {

        // Format the public link with key
        var publicUrl = this.formatLink(nodeHandle);

        // Cache some selectors
        var $overlay = mobile.linkOverlay.$overlay;
        var $publicLinkTextField = $overlay.find('.public-link');
        var $copyLinkButton = $overlay.find('.copy');
        var $removeLinkButton = $overlay.find('.remove');

        // Set the URL into the text field
        $publicLinkTextField.removeClass('hidden').val(publicUrl);
        $copyLinkButton.removeClass('disabled');
        $removeLinkButton.removeClass('disabled');

        // Update the link icon in the file manager view
        mobile.cloud.updateLinkIcon(nodeHandle);
    },

    /**
     * Formats the public link with key
     * @param {String} nodeHandle The internal node handle
     * @returns {String} Returns the URL in format:
     *                   https://mega.nz/#!X4NiADjR!BRqpTTSy-4UvHLz_6sHlpnGS-dS0E_RIVCpGAtjFmZQ
     */
    formatLink: function(nodeHandle) {

        var node = M.d[nodeHandle];
        var key = null;
        var type = '';

        // If folder
        if (node.t) {
            type = 'F';
            key = u_sharekeys[node.h] && u_sharekeys[node.h][0];
        }
        else {
            // Otherwise for file
            key = node.k;
        }

        // Create the URL
        var nodeUrlWithPublicHandle = getBaseUrl() + '/#' + type + '!' + (node.ph);
        var nodeDecryptionKey = key ? '!' + a32_to_base64(key) : '';
        var publicUrl = nodeUrlWithPublicHandle + nodeDecryptionKey;

        return publicUrl;
    },

    /**
     * Initialise the Remove link button
     * @param {String} nodeHandle The node handle for this file
     */
    initRemoveButton: function(nodeHandle) {

        this.$overlay.find('.remove').off('tap').on('tap', function() {

            // Remove the link
            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': false,
                'updateUI': false,
                'nodesToProcess': [nodeHandle]
            });
            exportLink.removeExportLink();

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Completes removal of the link by showing a toast message and hiding the Link/Export overlay
     * @param {String} nodeHandle The internal node handle
     */
    completeLinkRemovalProcess: function(nodeHandle) {

        // Show a toast message, hide the overlay and update the link icon
        mobile.showToast(l[8759]);                                        // Link removed
        mobile.linkOverlay.$overlay.addClass('hidden');
        mobile.cloud.updateLinkIcon(nodeHandle);

        // Re-show the file manager and re-enable scrolling
        $('.mobile.file-manager-block').removeClass('hidden disable-scroll');
    },

    /**
     * Initialises the close button on the overlay
     */
    initCloseButton: function() {

        var $closeButton = this.$overlay.find('.fm-dialog-close');

        // Add tap handler
        $closeButton.off('tap').on('tap', function() {

            // Hide overlay
            mobile.linkOverlay.$overlay.addClass('hidden');

            // Re-show the file manager and re-enable scrolling
            $('.mobile.file-manager-block').removeClass('hidden disable-scroll');

            // Prevent clicking the menu button behind
            return false;
        });
    }
};


/**
 * Code to trigger the mobile file manager download overlay and related behaviour
 */
mobile.downloadOverlay = {

    /** Supported max file size of 100 MB */
    maxFileSize: 100 * (1024 * 1024),

    /** Supported file types for download on mobile */
    supportedFileTypes: {
        docx: 'word',
        jpeg: 'image',
        jpg: 'image',
        mp3: 'audio',
        mp4: 'video',
        pdf: 'pdf',
        png: 'image',
        xlsx: 'word'
    },

    /** Download start time in milliseconds */
    startTime: null,

    /** jQuery selector for the download overlay */
    $overlay: null,

    /**
     * Initialise the overlay
     * @param {String} nodeHandle A public or regular node handle
     */
    showOverlay: function(nodeHandle) {

        // Store the selector as it is re-used
        this.$overlay = $('#mobile-ui-main');

        // Get initial overlay details
        var node = M.d[nodeHandle];
        var fileName = node.name;
        var fileSizeBytes = node.s;
        var fileSize = numOfBytes(fileSizeBytes);
        var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
        var fileIconName = fileIcon(node);
        var fileIconPath = mobile.imagePath + fileIconName + '.png';

        // Set file name, size and image
        this.$overlay.find('.filename').text(fileName);
        this.$overlay.find('.filesize').text(fileSizeFormatted);
        this.$overlay.find('.filetype-img').attr('src', fileIconPath);

        // Initialise the download buttons
        this.initBrowserFileDownloadButton(nodeHandle);
        this.initAppFileDownloadButton(nodeHandle);
        this.initOverlayCloseButton();

        // Change depending on platform and file size/type
        this.setMobileAppInfo();
        this.adjustMaxFileSize();
        this.checkSupportedFile(node);

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari
        $('.mobile.file-manager-block').addClass('disable-scroll');

        // Show the overlay
        this.$overlay.removeClass('hidden').addClass('overlay');
    },

    /**
     * Initialise the Open in Browser button on the file download overlay
     * @param {String} nodeHandle The node handle for this file
     */
    initBrowserFileDownloadButton: function(nodeHandle) {

        this.$overlay.find('.first.dl-browser').off('tap').on('tap', function() {

            // Start the download
            mobile.downloadOverlay.startFileDownload(nodeHandle);

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Initialise the Open in Mega App button on the file download overlay
     * @param {String} nodeHandle The node handle for this file
     */
    initAppFileDownloadButton: function(nodeHandle) {

        var $downloadButton = this.$overlay.find('.second.dl-megaapp');

        // If the user is logged in, i.e. in the cloud drive, then hide the Open in Mega App button
        // ToDo: remove this block when the app support is available for opening/downloading internal nodes
        if ((typeof u_attr !== 'undefined') && (localStorage.getItem('testOpenInApp') !== null)) {
            $downloadButton.removeClass('hidden');
        }
        else if (pfid) {
            // Show the button for public links still as they work
            $downloadButton.removeClass('hidden');
        }

        // On click/tap
        $downloadButton.off('tap').on('tap', function() {

            // Start the download
            mobile.downloadOverlay.redirectToApp($(this), nodeHandle);

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Redirects to the mobile app
     * @param {Object} $selector The jQuery selector for the button
     * @param {String} nodeHandle The internal node handle (optional)
     */
    redirectToApp: function($selector, nodeHandle) {

        var redirectLink = this.getAppLink(nodeHandle);

        // If iOS (iPhone, iPad, iPod), use method based off https://github.com/prabeengiri/DeepLinkingToNativeApp/
        if ((is_ios) || (localStorage.testOpenInApp === 'ios')) {

            var ns = '.ios ';
            var appLink = 'mega://' + redirectLink;
            var events = ['pagehide', 'blur', 'beforeunload'];
            var timeout = null;

            var preventDialog = function(e) {
                clearTimeout(timeout);
                timeout = null;
                $(window).unbind(events.join(ns) + ns);
            };

            var redirectToStore = function() {
                window.top.location = getStoreLink();
            };

            var redirect = function() {
                var ms = 500;

                preventDialog();
                $(window).bind(events.join(ns) + ns, preventDialog);

                window.location = appLink;

                // Starting with iOS 9.x, there will be a confirmation dialog asking whether we want to
                // open the app, which turns the setTimeout trick useless because no page unloading is
                // notified and users redirected to the app-store regardless if the app is installed.
                // Hence, as a mean to not remove the redirection we'll increase the timeout value, so
                // that users with the app installed will have a higher chance of confirming the dialog.
                // If past that time they didn't, we'll redirect them anyhow which isn't ideal but
                // otherwise users will the app NOT installed might don't know where the app is,
                // at least if they disabled the smart-app-banner...
                // NB: Chrome (CriOS) is not affected.
                if (is_ios > 8 && ua.details.brand !== 'CriOS') {
                    ms = 4100;
                }

                timeout = setTimeout(redirectToStore, ms);
            };

            Soon(function() {
                // If user navigates back to browser and clicks the button,
                // try redirecting again.
                $selector.rebind('click', function(e) {
                    e.preventDefault();
                    redirect();
                    return false;
                });
            });
            redirect();
        }

        // Otherwise if Windows Phone
        else if ((ua.details.os === 'Windows Phone') || (localStorage.testOpenInApp === 'winphone')) {
            window.location = 'mega://' + redirectLink;
        }

        // Otherwise if Android
        else if ((ua.indexOf('android') > -1) || (localStorage.testOpenInApp === 'android')) {
            var intent = 'intent://' + redirectLink + '/#Intent;scheme=mega;package=mega.privacy.android.app;end';
            document.location = intent;
        }
        else {
            // Otherwise show an error saying the device is unsupported
            alert('This device is unsupported.');
        }

        return false;
    },

    /**
     * Gets the relevant link for the app depending on if a public file link, public folder link or in the cloud drive
     *
     * @param {String} nodeHandle The internal node handle of the folder or file
     * @returns {String} Returns an app link in the following format:
     *
     * 1) #!<public-file-handle>!<key> Generic public file link, downloads the file. This scenario is handled by
     * the direct download page logic not here.
     * 2) #F!<public-folder-handle>!<key> Generic public folder link, opens the folder for viewing.
     * 3) #F!<public-folder-handle>!<key>!<internal-node-handle> Public folder link that will open the sub folder
     * for viewing if the internal node handle is a folder, or will start downloading the file if the internal node
     * handle is a file.
     * 4) #<internal-node-handle> If the internal node handle is a folder and they are logged into the same
     * account, it opens the folder for viewing in the app. If it is a file and they are logged into the same account,
     * then it starts downloading the file. If the internal node handle is not recognised in that account, the app will
     * throw an error dialog saying they need to log into that account.
     */
    getAppLink: function(nodeHandle) {

        // If a public file link, add the base file handle and key
        if ((typeof dlpage_ph !== 'undefined') && (typeof dlpage_key !== 'undefined')) {
            return '#!' + dlpage_ph + '!' + dlpage_key;
        }

        // Otherwise if a public folder
        else if (pfid && pfkey) {

            // If subfolder or file is specified, add it to the base folder handle and key
            if (typeof nodeHandle !== 'undefined') {
                return '#F!' + pfid + '!' + pfkey + '!' + nodeHandle;
            }
            else {
                // Otherwise return the base folder handle and key
                return '#F!' + pfid + '!' + pfkey;
            }
        }
        else {
            // Otherwise if in regular cloud drive, return just the node handle
            return '#' + nodeHandle;
        }
    },

    /**
     * Initialises the close button on the overlay with download button options and also the download progress overlay
     */
    initOverlayCloseButton: function() {

        var $closeButton = this.$overlay.find('.fm-dialog-close');

        // Show close button for folder links
        $closeButton.removeClass('hidden');

        // Add tap handler
        $closeButton.off('tap').on('tap', function() {

            // Hide overlay with download button options
            mobile.downloadOverlay.$overlay.addClass('hidden');

            // Hide downloading progress overlay
            $('body').removeClass('downloading');

            // Re-show the file manager and re-enable scrolling
            $('.mobile.file-manager-block').removeClass('hidden disable-scroll');

            return false;
        });
    },

    /**
     * Start the file download
     * @param {String} nodeHandle The node handle for this file
     */
    startFileDownload: function(nodeHandle) {

        // Show downloading overlay
        $('body').addClass('downloading');

        // Reset state from past downloads
        this.$overlay.find('.download-progress').removeClass('complete');
        this.$overlay.find('.download-percents').text('');
        this.$overlay.find('.download-speed').text('');
        this.$overlay.find('.download-progress span').text(l[1624] + '...');  // Downloading...
        this.$overlay.find('.download-progress .bar').width('0%');

        // Change message to 'Did you know that you can download the entire folder at once...'
        this.$overlay.find('.file-manager-download-message').removeClass('hidden');

        // Set the start time
        this.startTime = new Date().getTime();

        // Start download and show progress
        M.gfsfetch(nodeHandle, 0, -1, this.showDownloadProgress).always(function(data) {

            mobile.downloadOverlay.showDownloadComplete(data, nodeHandle);
        });
    },

    /**
     * Download progress handler
     * @param {Number} percentComplete The number representing the percentage complete e.g. 49.23, 51.5 etc
     * @param {Number} bytesLoaded The number of bytes loaded so far
     * @param {Number} bytesTotal The total number of bytes in the file
     */
    showDownloadProgress: function(percentComplete, bytesLoaded, bytesTotal) {

        var $overlay = mobile.downloadOverlay.$overlay;
        var $downloadButtonText = $overlay.find('.download-progress span');
        var $downloadProgressBar = $overlay.find('.download-progress .bar');
        var $downloadPercent = $overlay.find('.download-percents');
        var $downloadSpeed = $overlay.find('.download-speed');

        // Calculate the download speed
        var percentCompleteRounded = Math.round(percentComplete);
        var currentTime = new Date().getTime();
        var secondsElapsed = (currentTime - mobile.downloadOverlay.startTime) / 1000;
        var bytesPerSecond = (secondsElapsed) ? (bytesLoaded / secondsElapsed) : 0;
        var speed = numOfBytes(bytesPerSecond);
        var speedSizeRounded = Math.round(speed.size);
        var speedText = speedSizeRounded + speed.unit + '/s';

        // Display the download progress and speed
        $downloadPercent.text(percentCompleteRounded + '%');
        $downloadProgressBar.width(percentComplete + '%');
        $downloadSpeed.text(speedText);

        // If the download is complete e.g. 99/100%, change button text to Decrypting... which can take some time
        if (percentComplete >= 99) {
            $downloadButtonText.text(l[8579] + '...');
        }
    },

    /**
     * Download complete handler, activate the Open File button and let the user download the file
     * @param {Object} data The download data
     * @param {String} nodeHandle The node handle for this file
     */
    showDownloadComplete: function(data, nodeHandle) {

        var $downloadButton = this.$overlay.find('.download-progress');
        var $downloadButtonText = this.$overlay.find('.download-progress span');
        var $downloadPercent = this.$overlay.find('.download-percents');
        var $downloadSpeed = this.$overlay.find('.download-speed');

        // Change button text to full white and hide the download percentage and speed
        $downloadButton.addClass('complete');
        $downloadPercent.text('');
        $downloadSpeed.text('');
        $downloadButtonText.text(l[8949]);  // Open File

        // Make download button clickable
        $downloadButton.off('tap').on('tap', function() {

            // Get the file's mime type
            var node = M.d[nodeHandle];
            var fileName = node.name;
            var mimeType = filemime(fileName);

            // Store a log for statistics
            api_req({ a: 'log', e: 99637, m: 'Downloaded and opened file on mobile webclient' });

            // Create object URL to download the file to the client
            location.href = mObjectURL([data.buffer], mimeType);

            return false;
        });
    },

    /**
     * Change the max file size supported for various platforms based on device testing
     */
    adjustMaxFileSize: function() {

        // If Chrome or Firefox on iOS, reduce the size to 1.3 MB
        if ((navigator.userAgent.match(/CriOS/i)) || (navigator.userAgent.match(/FxiOS/i))) {
            this.maxFileSize = 1.3 * (1024 * 1024);
        }
    },

    /**
     * Checks if the file download can be performed in the browser or shows an error overlay
     * @param {Object} node The file node information
     */
    checkSupportedFile: function(node) {

        var $openInBrowserButton = this.$overlay.find('.first.dl-browser');
        var $fileTypeUnsupportedMessage = this.$overlay.find('.file-unsupported');
        var $fileSizeUnsupportedMessage = this.$overlay.find('.file-too-large');

        // Reset state back to default if re-opening the dialog from a previously disabled state
        $openInBrowserButton.removeClass('disabled');
        $fileTypeUnsupportedMessage.addClass('hidden');
        $fileSizeUnsupportedMessage.addClass('hidden');
        $body.removeClass('wrong-file');

        // Get the name, size, extension and whether supported
        var fileName = node.name;
        var fileSize = node.s;
        var fileExtension = fileext(fileName);
        var fileExtensionIsSupported = this.supportedFileTypes[fileExtension];

        // Check if the download is supported
        if ((fileSize > this.maxFileSize) || !fileExtensionIsSupported) {

            // Show an error overlay, remove the tap/click handler and show as greyed out
            $body.addClass('wrong-file');
            $openInBrowserButton.off('tap').addClass('disabled');

            // Change error message
            if (!fileExtensionIsSupported) {
                $fileTypeUnsupportedMessage.removeClass('hidden');
            }
            else {
                $fileSizeUnsupportedMessage.removeClass('hidden');
            }
        }
    },

    /**
     * Gets the app store link based on the user agent
     * @returns {String} Returns the link to the relevant app store for the user's platform
     */
    getStoreLink: function() {

        switch (ua.details.os) {
            case 'iPad':
            case 'iPhone':
                return 'https://itunes.apple.com/app/mega/id706857885';

            case 'Windows Phone':
                return 'zune://navigate/?phoneappID=1b70a4ef-8b9c-4058-adca-3b9ac8cc194a';

            default:
                // Android and others
                return 'https://play.google.com/store/apps/details?id=mega.privacy.android.app' +
                       '&referrer=meganzindexandroid';
        }
    },

    /**
     * Changes the footer image and text depending on what platform they are on
     */
    setMobileAppInfo: function() {

        var $downloadOnAppStoreButton = $('.mobile.download-app');
        var $appInfoBlock = $('.app-info-block');
        var $openInBrowserButton = $('.mobile.dl-browser');

        // Change the link
        $downloadOnAppStoreButton.attr('href', this.getStoreLink());

        switch (ua.details.os) {
            case 'iPad':
            case 'iPhone':
                $appInfoBlock.addClass('ios');
                break;

            case 'Windows Phone':
                $appInfoBlock.addClass('wp');
                $openInBrowserButton.off('tap').addClass('disabled');
                break;

            case 'Android':
                $appInfoBlock.addClass('android');
                break;
        }
    }
};


/**
 * Shows the decryption key overlay, the user enters the decryption key then they can download the file/view the folder
 */
mobile.decryptionKeyOverlay = {

    /**
     * Initialise and show the overlay
     * @param {String} publicHandle The public file/folder handle
     * @param {Boolean} folderLink If this was a folder link
     * @param {Boolean} previousKeyIncorrect If the previous attempt was incorrect
     */
    show: function(publicHandle, folderLink, previousKeyIncorrect) {

        var $overlay = $('#mobile-decryption-key-overlay');
        var $initialMessage = $('.initial-message');
        var $errorMessage = $('.error-message');

        // Initialise the Decrypt button
        this.initDecryptButton($overlay, publicHandle, folderLink);

        // If the previous folder key was incorrect, show an error message for them to try again
        if (previousKeyIncorrect) {
            $initialMessage.addClass('hidden');
            $errorMessage.removeClass('hidden');
        }
        else {
            // Show first message
            $initialMessage.removeClass('hidden');
            $errorMessage.addClass('hidden');
        }

        // Show the overlay
        $overlay.removeClass('hidden');
    },

    /**
     * Initialise the Decrypt button to get the entered key and redirect to the full link with key
     * @param {Object} $overlay The jQuery selector for the overlay
     * @param {String} publicHandle The public file/folder handle
     * @param {Boolean} folderLink If this was a folder link
     */
    initDecryptButton: function($overlay, publicHandle, folderLink) {

        var $decryptionKeyField = $overlay.find('.decryption-key');
        var $decryptButton = $overlay.find('.decrypt-button');

        // Add click/tap handler
        $decryptButton.off('tap').on('tap', function() {

            // Trim the input from the user for whitespace, newlines etc on either end
            var decryptionKey = $.trim($decryptionKeyField.val());

            // If they entered something
            if (decryptionKey) {

                // Remove the ! from the key which is exported from the export dialog
                decryptionKey = decryptionKey.replace('!', '');

                // Reconstruct the URL
                var urlStart = (folderLink) ? 'F!' : '!';
                var newHash = urlStart + publicHandle + '!' + decryptionKey;

                // Redirect to the hash URL (loadSubPage does not work here)
                document.location.hash = '#' + newHash;
            }

            // Prevent clicking behind
            return false;
        });
    }
};


/**
 * An overlay to let the user enter a password to decrypt the real folder/file link and access the contents
 */
mobile.decryptionPasswordOverlay = {

    $overlay: null,

    /**
     * Initialise and show the overlay
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1...
     */
    show: function(page) {

        // Cache some selectors which are re-used later
        this.$overlay = $('#mobile-password-decryption-overlay');

        // Initialise the Decrypt button
        this.initDecryptButton(page);

        // Show the overlay
        this.$overlay.removeClass('hidden');
    },

    /**
     * Initialise the Decrypt button
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1...
     */
    initDecryptButton: function(page) {

        // Add click/tap handler
        this.$overlay.find('.decrypt-button').off('tap').on('tap', function() {

            // Decrypt the link
            mobile.decryptionPasswordOverlay.decryptLink(page);
            return false;
        });
    },

    /**
     * Decrypts the link into a regular folder/file link and redirects to that if successful
     * @param {String} page The public file/folder handle e.g. P!AQG4iTLFFJuL1...
     */
    decryptLink: function(page) {

        var $decryptButton = this.$overlay.find('.decrypt-button');
        var $password = this.$overlay.find('.decryption-password');
        var $errorMessage = this.$overlay.find('.error-message');

        // Show encryption loading animation and change text to 'Decrypting'
        $decryptButton.addClass('decrypting');

        // Add an extra class for iOS to just change to 'Decrypting...' text because it likely doesn't support the
        // native crypto API functions for PBKDF2 and needs to use asmCrypto which performs slower, blocking the UI
        if (is_ios) {
            $decryptButton.addClass('ios').text(l[8579] + '...');   // Decrypting
        }

        // Get the password and the encoded information in the URL
        var password = $password.val();
        var urlEncodedInfo = page.replace('P!', '');
        var decodedBytes = null;

        // If no password given show an error message
        if (!password) {
            $errorMessage.addClass('bold').text(l[970]);  // Please enter a valid password...
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Decode the request
        try {
            decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
        }
        catch (exception) {

            // Show error and abort
            $errorMessage.addClass('bold').text(l[9068]);  // The link could not be decoded...
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Get the algorithm used
        var algorithm = decodedBytes[0];

        // Check if valid array index or will throw an exception
        if (typeof exportPassword.algorithms[algorithm] === 'undefined') {

            // Show error and abort
            $errorMessage.addClass('bold').text(l[9069]);  // The algorithm ... is not supported
            $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
            return false;
        }

        // Get the salt bytes, start offset at 8 (1 byte for alg + 1 byte for file/folder + 6 for handle)
        var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
        var saltStartOffset = 8;
        var saltEndOffset = saltStartOffset + saltLength;
        var saltBytes = decodedBytes.subarray(saltStartOffset, saltEndOffset);

        // Compute the PBKDF
        exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {

            // Get the MAC from the decoded bytes
            var macLength = exportPassword.algorithms[algorithm].macLength / 8;
            var macStartOffset = decodedBytes.length - macLength;
            var macEndOffset = decodedBytes.length;
            var macToVerifyBytes = decodedBytes.subarray(macStartOffset, macEndOffset);

            // Get the data to verify
            var dataToVerify = decodedBytes.subarray(0, macStartOffset);

            // Get the MAC key
            var macKeyLength = exportPassword.algorithms[algorithm].macKeyLength / 8;
            var macKeyStartOffset = derivedKeyBytes.length - macKeyLength;
            var macKeyEndOffset = derivedKeyBytes.length;
            var macKeyBytes = derivedKeyBytes.subarray(macKeyStartOffset, macKeyEndOffset);

            // Compute the MAC over the data to verify
            var dataToVerifyBytes = decodedBytes.subarray(0, macStartOffset);
            var macAlgorithm = exportPassword.algorithms[algorithm].macName;
            var macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToVerifyBytes);

            // Convert the string to hex for simple string comparison
            var macString = asmCrypto.bytes_to_hex(macBytes);
            var macToVerifyString = asmCrypto.bytes_to_hex(macToVerifyBytes);

            // Compare the MAC in the URL to the computed MAC
            if (macString !== macToVerifyString) {

                // Show error and abort
                $errorMessage.addClass('bold').text(l[9076]);  // The link could not be decrypted...
                $decryptButton.removeClass('decrypting ios').text(l[1027]);   // Decrypt
                return false;
            }

            // Get the link type char code and set the default key length to 32 bytes
            var linkTypeByte = decodedBytes[1];
            var linkType = linkTypeByte;
            var keyLength = 32;

            // If folder link, set the key length to 16 bytes
            if (linkType === exportPassword.LINK_TYPE_FOLDER) {
                keyLength = 16;
            }

            // Get the encryption key from the derived key
            var encKeyBytes = derivedKeyBytes.subarray(0, keyLength);

            // Get the encrypted key, start is (2 bytes for alg and type + 6 bytes for handle + salt)
            var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
            var startOffset = 2 + 6 + saltLength;
            var endOffset = startOffset + keyLength;
            var encryptedKeyBytes = dataToVerify.subarray(startOffset, endOffset);

            // Decrypt the file/folder link key
            var decryptedKey = exportPassword.xorByteArrays(encKeyBytes, encryptedKeyBytes);

            // Recreate the original file/folder link
            var handleBytes = dataToVerify.subarray(2, 8);
            var handleUrlEncoded = exportPassword.base64UrlEncode(handleBytes);
            var decryptedKeyUrlEncoded = exportPassword.base64UrlEncode(decryptedKey);
            var folderIdentifier = (linkType === exportPassword.LINK_TYPE_FOLDER) ? 'F' : '';
            var url = folderIdentifier + '!' + handleUrlEncoded + '!' + decryptedKeyUrlEncoded;

            // Show completed briefly before redirecting
            $decryptButton.removeClass('decrypting ios').text(l[9077]); // Decrypted

            // Clear password field
            $password.val('');

            // Add a log to see if the feature is used often
            api_req({ a: 'log', e: 99633, m: 'Successfully decrypted password protected link on mobile web' });

            // On success, redirect to actual file/folder link
            loadSubPage(url);
        });
    }
};


/**
 * Shows a custom message e.g. error or success message in a popup overlay
 */
mobile.messageOverlay = {

    /**
     * Shows the error overlay
     * @param {String} firstMessage The main message to be displayed
     * @param {String} optionalSecondMessage An optional second message to be displayed after the first
     */
    show: function(firstMessage, optionalSecondMessage) {

        // Cache selectors
        var $overlay = $('#mobile-ui-error');
        var $firstMessage = $overlay.find('.first-message');
        var $optionalSecondMessage = $overlay.find('.optional-second-message');

        // Set the first message
        $firstMessage.text(firstMessage);

        // If there is a second message, set that
        if (typeof optionalSecondMessage !== 'undefined') {
            $optionalSecondMessage.text(optionalSecondMessage);
        }

        // Initialise the OK/close button
        this.initConfirmOkButton($overlay);

        // Show the error overlay
        $overlay.removeClass('hidden');
    },

    /**
     * Initialise the OK button to close the error overlay
     * @param {Object} $overlay A cached selector for the error overlay
     */
    initConfirmOkButton: function($overlay) {

        var $okButton = $overlay.find('.confirm-ok-button');

        // Add click/tap handler
        $okButton.off('tap').on('tap', function() {

            // Hide the error overlay
            $overlay.addClass('hidden');

            // Remove the loading spinner if on the Login page and came back from an error
            if (page === 'login') {
                $('.mobile.signin-button').removeClass('loading');
            }

            // Prevent clicking behind
            return false;
        });
    }
};


/**
 * Login functionality
 */
mobile.signin = {

    /** jQuery selector for the login/register screen */
    $screen: null,

    /**
     * Render the signin screen
     */
    show: function() {

        // Cache the selector
        this.$screen = $('.mobile.signin-register-block');

        // Show the login/register screen
        this.$screen.removeClass('hidden');

        // Show the login tab and hide the register tab until they manually open it
        this.$screen.find('.tab-block.sign-in').removeClass('hidden');
        this.$screen.find('.tab-block.register').addClass('hidden');

        // Init events
        this.initLoginButton();
        this.initEmailPasswordKeyupEvents();
        
        // Initialise the Remember Me checkbox, top button tabs
        mobile.initTabs('login');
        mobile.initCheckbox('remember-me');
        mobile.initHeaderMegaIcon();
        mobile.initMobileAppButton();
    },

    /**
     * Enable the login button if email and password is complete
     */
    initEmailPasswordKeyupEvents: function() {

        var $emailField = this.$screen.find('.signin-input.login input');
        var $passwordField = this.$screen.find('.signin-input.password input');
        var $bothFields = $emailField.add($passwordField);
        var $signInButton = this.$screen.find('.signin-button');

        // Add keyup event to the email and password fields
        $bothFields.rebind('keyup', function(event) {

            // Change the button to red to enable it if they have entered something in the two fields
            if (($emailField.val().length > 0) && ($passwordField.val().length > 0)) {
                $signInButton.addClass('active');

                // If the Enter key is pressed try logging them in
                if (event.which === 13) {
                    $signInButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $signInButton.removeClass('active');
            }
        });
    },

    /**
     * Initialise the login button to log the user into the site
     */
    initLoginButton: function() {

        var $emailField = this.$screen.find('.signin-input.login input');
        var $passwordField = this.$screen.find('.signin-input.password input');
        var $signInButton = this.$screen.find('.signin-button');
        var $rememberMeCheckbox = this.$screen.find('.remember-me .checkbox');

        // Add click/tap handler to login button
        $signInButton.off('tap').on('tap', function() {

            // Get the current text field values
            var email = $emailField.val();
            var password = $passwordField.val();
            var rememberMe = $rememberMeCheckbox.is(':checked');

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if ((email.length < 1) || (password.length < 1)) {
                return false;
            }

            // Pass the details to the login flow
            mobile.signin.startLogin($signInButton, email, password, rememberMe);

            return false;
        });
    },

    /**
     * Starts the login proceedure
     * @param {Object} $signInButton The jQuery selector for the signin button
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
     */
    startLogin: function($signInButton, email, password, rememberMe) {

        // Hide the text and show a loading spinner
        $signInButton.addClass('loading');

        // If email confirm code is ok
        if (confirmok) {
            doConfirm(email, password, function() {
                postLogin(email, password, rememberMe, function(result) {

                    // Hide the loading spinner
                    $signInButton.removeClass('loading');

                    if (result === EBLOCKED) {
                        mobile.messageOverlay.show(l[730]);
                    }
                    else if (result) {
                        u_type = result;
                        loadSubPage('key');
                    }
                });
            });
        }
        else {
            // Run the regular login process
            postLogin(email, password, rememberMe, function (result) {

                // Hide the loading spinner
                $signInButton.removeClass('loading');

                // Check they are not locked out
                if (result === EBLOCKED) {
                    mobile.messageOverlay.show(l[730]);
                }

                // Otherwise if successful
                else if (result) {

                    // Set the u_type e.g. 3 is fully registered user
                    u_type = result;

                    // Logging to see how many people are signing into the mobile site
                    api_req({ a: 'log', e: 99629, m: 'Completed login on mobile webclient' });

                    // Load the file manager
                    loadSubPage('fm');
                }
                else {
                    // Otherwise they used an incorrect email or password so show an error
                    mobile.messageOverlay.show(l[16349], l[16350]);
                }
            });
        }
    }
};


/**
 * Register functionality
 */
mobile.register = {

    /** jQuery selector for the signin/register screen */
    $screen: null,

    /** jQuery selector for just the registration elements */
    $registerScreen: null,

    /**
     * Render the signin screen
     */
    show: function() {

        // Cache the selector
        this.$screen = $('.mobile.signin-register-block');
        this.$registerScreen = this.$screen.find('.tab-block.register');

        // Show the login/register screen
        this.$screen.removeClass('hidden');

        // Show the register tab and hide the login tab until they manually open it
        this.$screen.find('.tab-block.register').removeClass('hidden');
        this.$screen.find('.tab-block.sign-in').addClass('hidden');

        // Initialise the login/register tabs and the Agree to Terms of Service checkbox
        mobile.initTabs('register');
        mobile.initCheckbox('confirm-terms');
        mobile.initHeaderMegaIcon();
        mobile.initMobileAppButton();

        // Activate register button when fields are complete
        this.initKeyupEvents();
        this.initRegisterButton();

        // Load password strength estimator
        this.loadPasswordEstimatorLibrary();
        this.initPasswordStrengthCheck();
    },

    /**
     * Enable the register button if the fields are complete and correct
     */
    initKeyupEvents: function() {

        var $firstNameField = this.$registerScreen.find('.first-name input');
        var $lastNameField = this.$registerScreen.find('.last-name input');
        var $emailField = this.$registerScreen.find('.email-address input');
        var $passwordField = this.$registerScreen.find('.password input');
        var $confirmPasswordField = this.$registerScreen.find('.password-confirm input');
        var $registerButton = this.$registerScreen.find('.register-button');
        var $allFields = $firstNameField.add($lastNameField).add($emailField)
                            .add($passwordField).add($confirmPasswordField);

        // Add keyup event to the input fields
        $allFields.rebind('keyup', function(event) {

            var firstName = $firstNameField.val();
            var lastName = $lastNameField.val();
            var email = $emailField.val();
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // Change the button to red to enable it if they have entered something in all the fields
            if ((firstName.length > 0) && (lastName.length > 0) && (email.length > 0) &&
                    (password.length > 0) && (confirmPassword.length > 0)) {

                // Activate the register button
                $registerButton.addClass('active');

                // If the Enter key is pressed try registering
                if (event.which === 13) {
                    $registerButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $registerButton.removeClass('active');
            }
        });
    },

    /**
     * Load the ZXCVBN password strength estimator library
     */
    loadPasswordEstimatorLibrary: function() {

        // Make sure the library is loaded
        if (typeof zxcvbn === 'undefined') {

            // Show loading spinner
            var $loader = this.$registerScreen.find('.estimator-loading-icon').addClass('loading');

            // On completion of loading, hide the loading spinner
            M.require('zxcvbn_js')
                .done(function() {
                    $loader.removeClass('loading');
                });
        }
    },

    /**
     * Show what strength the currently entered password is on key up
     */
    initPasswordStrengthCheck: function() {

        var $passwordStrengthBar = this.$registerScreen.find('.password-strength');
        var $passwordInput = this.$registerScreen.find('.signin-input.password input');

        // Add keyup event to the password text field
        $passwordInput.rebind('keyup', function() {

            // Make sure the ZXCVBN password strength estimator library is loaded first
            if (typeof zxcvbn !== 'undefined') {

                // Estimate the password strength
                var password = $passwordInput.val();
                var passwordStrength = zxcvbn(password);

                // Remove previous strength classes that were added
                $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

                // Add colour coding
                if (passwordStrength.score > 3 && passwordStrength.entropy > 75) {
                    $passwordStrengthBar.addClass('good5');    // Strong
                }
                else if (passwordStrength.score > 2 && passwordStrength.entropy > 50) {
                    $passwordStrengthBar.addClass('good4');    // Good
                }
                else if (passwordStrength.score > 1 && passwordStrength.entropy > 40) {
                    $passwordStrengthBar.addClass('good3');    // Medium
                }
                else if (passwordStrength.score > 0 && passwordStrength.entropy > 15) {
                    $passwordStrengthBar.addClass('good2');    // Weak
                }
                else if (password.length !== 0) {
                    $passwordStrengthBar.addClass('good1');    // Very Weak
                }
            }
        });
    },

    /**
     * Initialise the register button
     */
    initRegisterButton: function() {

        var $firstNameField = this.$registerScreen.find('.first-name input');
        var $lastNameField = this.$registerScreen.find('.last-name input');
        var $emailField = this.$registerScreen.find('.email-address input');
        var $passwordField = this.$registerScreen.find('.password input');
        var $confirmPasswordField = this.$registerScreen.find('.password-confirm input');
        var $passwordStrengthBar = this.$registerScreen.find('.password-strength');
        var $confirmTermsCheckbox = this.$registerScreen.find('.confirm-terms input');
        var $registerButton = this.$registerScreen.find('.register-button');
        var $containerFields = $emailField.parent().add($passwordField.parent()).add($confirmPasswordField.parent());

        // Add click/tap handler to login button
        $registerButton.off('tap').on('tap', function() {

            // Get the current text field values
            var firstName = $.trim($firstNameField.val());
            var lastName = $.trim($lastNameField.val());
            var email = $.trim($emailField.val());
            var password = $.trim($passwordField.val());
            var confirmPassword = $.trim($confirmPasswordField.val());

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if ((firstName.length < 1) || (lastName.length < 1) || (email.length < 1) ||
                    (password.length < 1) || (confirmPassword.length < 1)) {

                return false;
            }

            // Clear old errors from past form submissions
            $containerFields.removeClass('incorrect');

            // If they have not confirmed the Terms of Service then show an error and don't proceed
            if (!$confirmTermsCheckbox.is(':checked')) {
                mobile.messageOverlay.show(l[7241]);        // You must agree with our Terms of Service
                return false;
            }

            // If the email is invalid
            if (checkMail(email)) {

                // Add red border, red text and show warning icon
                $emailField.parent().addClass('incorrect');

                // Show an error and don't proceed
                mobile.messageOverlay.show(l[198]);         // Please enter a valid e-mail address.
                return false;
            }

            // If the passwords are not the same
            if (password !== confirmPassword) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show an error and don't proceed
                mobile.messageOverlay.show(l[9066]);        // The passwords are not the same...
                return false;
            }

            // If the password has the 'Very weak' class i.e. it's not strong enough
            if ($passwordStrengthBar.hasClass('good1')) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');

                // Then show an error and don't proceed
                mobile.messageOverlay.show(l[1104]);        // Please strengthen your password.
                return false;
            }

            // Pass the details to the registration flow
            mobile.register.doRegister(firstName, lastName, email, password);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Start the registration process
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     */
    doRegister: function(firstName, lastName, email, password) {

        // Show loading dialog
        loadingDialog.show();

        // Set a flag to check at the end of the registration process
        localStorage.signUpStartedInMobileWeb = '1';

        u_storage = init_storage(localStorage);

        var userContext = {
            checkloginresult: function(context, result) {

                // Set the user type
                u_type = result;

                // Register the account
                mobile.register.registerAccount(firstName, lastName, email, password);
            }
        };

        // Create anonymous account
        u_checklogin(userContext, true);
    },

    /**
     * Send the signup link via email
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     */
    registerAccount: function(firstName, lastName, email, password) {

        var registrationVars = {
            password: password,
            first: firstName,
            last: lastName,
            email: email,
            name: firstName + ' ' + lastName
        };
        var context = {
            callback: function(result) {

                loadingDialog.hide();

                if (result === 0) {
                    var ops = {
                        a: 'up',
                        terms: 'Mq',
                        firstname: base64urlencode(to8(registrationVars.first)),
                        lastname: base64urlencode(to8(registrationVars.last)),
                        name2: base64urlencode(to8(registrationVars.name))
                    };

                    u_attr.terms = 1;
                    localStorage.awaitingConfirmationAccount = JSON.stringify(registrationVars);

                    api_req(ops);

                    // Show signup link dialog
                    mobile.register.showConfirmEmailScreen(registrationVars);
                }

                // Show an error if the email is already in use
                else if (result === EEXIST) {
                    mobile.messageOverlay.show(l[9000], result);       // Error. This email address is already in use.
                }
                else {
                    // Show an error
                    mobile.messageOverlay.show(l[47], result);       // Oops, something went wrong.
                }
            }
        };

        // Send the confirmation email
        sendsignuplink(registrationVars.name, registrationVars.email, registrationVars.password, context);
    },

    /**
     * Shows the email confirmation screen
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    showConfirmEmailScreen: function(registrationVars) {

        var $confirmScreen = $('.registration-confirm-email');
        var $registerScreen = $('.mobile.signin-register-block');
        var $changeEmailInput = $confirmScreen.find('.change-email input');
        var $resendButton = $confirmScreen.find('.resend-button');

        // Hide the current register screen and show the confirmation one
        $registerScreen.addClass('hidden');
        $confirmScreen.removeClass('hidden');

        // Set the email into the text field
        $changeEmailInput.val(registrationVars.email);

        // Init email input keyup and Resend button
        mobile.register.initConfirmEmailScreenKeyup($changeEmailInput, $resendButton);
        mobile.register.initConfirmEmailScreenResendButton($changeEmailInput, $resendButton, registrationVars);
    },

    /**
     * Initialise the email input keyup which will enable the Resend button
     * @param {Object} $changeEmailInput jQuery selector for the email input
     * @param {Object} $resendButton jQuery selector for the Resend button
     */
    initConfirmEmailScreenKeyup: function($changeEmailInput, $resendButton) {

        // Enable the resend button on keyup
        $changeEmailInput.rebind('keyup', function(event) {

            var email = $(this).val();

            // Change the button to red if the email is valid
            if (!checkMail(email)) {

                // Activate the resend button
                $resendButton.addClass('active');

                // If the Enter key is pressed try resending
                if (event.which === 13) {
                    $resendButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $resendButton.removeClass('active');
            }
        });
    },

    /**
     * Initialises the Resend button on the email confirmation screen to send the confirmation link again
     * @param {Object} $changeEmailInput jQuery selector for the email input
     * @param {Object} $resendButton jQuery selector for the Resend button
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    initConfirmEmailScreenResendButton: function($changeEmailInput, $resendButton, registrationVars) {

        // Add click/tap handler to resend button
        $resendButton.off('tap').on('tap', function() {

            // Make sure the button is enabled
            if (!$resendButton.hasClass('active')) {
                return false;
            }

            // Update the email to the new email address
            registrationVars.email = $.trim($changeEmailInput.val());

            // Show the loading dialog
            loadingDialog.show();

            // Setup subsequent API request
            var context = {
                callback: function(result) {

                    loadingDialog.hide();

                    if (result === 0) {
                        var ops = {
                            a: 'up',
                            terms: 'Mq',
                            firstname: base64urlencode(to8(registrationVars.first)),
                            lastname: base64urlencode(to8(registrationVars.last)),
                            name2: base64urlencode(to8(registrationVars.name))
                        };

                        u_attr.terms = 1;
                        localStorage.awaitingConfirmationAccount = JSON.stringify(registrationVars);

                        api_req(ops);

                        // Show a dialog success
                        mobile.messageOverlay.show(l[16351]);     // The email was sent successfully.
                    }
                    else {
                        // Show an error
                        mobile.messageOverlay.show(l[47]);     // Oops, something went wrong. Sorry about that!
                    }
                }
            };

            // Send the confirmation email
            sendsignuplink(registrationVars.name, registrationVars.email, registrationVars.password, context);

            // Only let them send once (until they change email again)
            $resendButton.removeClass('active');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Shows the login screen with a few things changed so they know they are
     * confirming their account and about to proceed to the key creation step
     * @param {String} email The user's email address from the confirm code
     */
    showConfirmAccountScreen: function(email) {

        // Show the general login screen
        mobile.signin.show();

        // Change the header text, hide the registration and preinput the email
        var $loginScreen = $('.signin-register-block');
        $loginScreen.find('.top-link.sign-in').text(l[812]);            // Confirm Account
        $loginScreen.find('.top-link.register').addClass('hidden');
        $loginScreen.find('.signin-input.login input').val(email);
    },

    /**
     * Show an account confirmation failure
     * @param {Number} apiResult An error code from the API
     */
    showConfirmAccountFailure: function(apiResult) {

        // Show the general login screen
        mobile.signin.show();

        // Check for various error codes and show error messages
        if (apiResult === EINCOMPLETE) {
            mobile.messageOverlay.show(l[703]);   // Your sign-up link is not valid...
        }
        else if (apiResult === ENOENT) {
            mobile.messageOverlay.show(l[704]);   // Your account has already been activated. Please log in.
        }
        else {
            mobile.messageOverlay.show(l[705] + ' ' + apiResult);     // Please sign up again. Error code: xx
        }
    },

    /**
     * Shows the screen with a spinning image while the RSA keys are being generated
     */
    showGeneratingKeysScreen: function() {

        $('.mobile.registration-generating-keys').removeClass('hidden');
    }
};


/**
 * The main menu (hamburger icon in top right) which lets the user do various tasks
 */
mobile.menu = {

    /**
     * Shows the menu icon and initialises the menu and its related options
     * @param {String} currentScreen The screen the user is on e.g. 'home', 'login' etc which matches the class name of
     *                               the menu button. This will have a red bar style applied to it on the left of the
     *                               menu item to indicate this is the current page.
     */
    showAndInit: function(currentScreen) {

        // Cache selectors
        var $body = $('body');
        var $html = $('html');
        var $menuIcon = $('.mobile.fm-header .menu');
        var $darkOverlay = $('.mobile.dark-overlay');
        var $mainMenu = $('.mobile.main-menu');
        var $closeIcon = $mainMenu.find('.fm-icon.close');

        var $avatarNameBlock = $mainMenu.find('.avatar-name-block');
        var $avatar = $avatarNameBlock.find('.main-avatar');
        var $userName = $avatarNameBlock.find('.user-name');

        var $menuButtons = $mainMenu.find('.menu-buttons');
        var $loginMenuItem = $mainMenu.find('.menu-button.login');
        var $registerMenuItem = $mainMenu.find('.menu-button.register');
        var $cloudMenuItem = $mainMenu.find('.menu-button.cloud-drive');
        var $homeMenuItem = $mainMenu.find('.menu-button.home');
        var $termsMenuItem = $mainMenu.find('.menu-button.terms-of-service');
        var $logoutMenuItem = $mainMenu.find('.menu-button.logout');

        // Show the menu / hamburger icon
        $menuIcon.removeClass('hidden');

        // If they are logged in
        if (typeof u_attr !== 'undefined') {

            // Generate the avatar from the user handle
            var avatar = useravatar.contact(u_handle, '', 'div');

            // Show the user's avatar and name
            $avatarNameBlock.removeClass('hidden');
            $avatar.safeHTML(avatar);
            $avatar.find('.avatar').addClass('small-rounded-avatar');
            $userName.text(u_attr.name);

            // Show buttons
            $cloudMenuItem.removeClass('hidden');
            $termsMenuItem.removeClass('hidden');
            $logoutMenuItem.removeClass('hidden');
        }
        else {
            // Otherwise show other buttons for not logged in user
            $menuButtons.addClass('logged-out');
            $loginMenuItem.removeClass('hidden');
            $registerMenuItem.removeClass('hidden');
            $homeMenuItem.removeClass('hidden');
            $termsMenuItem.removeClass('hidden');
        }

        // Add a red bar style to the left of the menu item to indicate this is the current page
        $menuButtons.removeClass('current');

        // If in the cloud drive, add a red bar next to that button
        if (currentScreen.indexOf('fm') > -1) {
            $mainMenu.find('.menu-button.cloud-drive').addClass('current');
        }
        else {
            // Otherwise if it exists, add a red bar to the button matching the current page
            try {
                $mainMenu.find('.menu-button.' + currentScreen).addClass('current');
            }
            catch (exception) { }
        }

        // On menu button click, show the menu
        $menuIcon.off('tap').on('tap', function() {

            $html.addClass('overlayed');
            $mainMenu.addClass('active');
            $darkOverlay.removeClass('hidden').addClass('active');

            return false;
        });

        // On tapping/clicking the dark overlay or menu's close button, close the menu
        $darkOverlay.add($closeIcon).off('tap').on('tap', function() {

            $html.removeClass('overlayed');
            $mainMenu.removeClass('active');
            $darkOverlay.addClass('hidden').removeClass('active');

            return false;
        });

        // On the menu's Cloud Drive button, go to the root of the cloud drive
        $cloudMenuItem.off('tap').on('tap', function() {

            // Close the menu
            $html.removeClass('overlayed');
            $mainMenu.removeClass('active');
            $darkOverlay.addClass('hidden').removeClass('active');

            // Store the current page
            var currentPage = page;

            // Open the root cloud folder
            loadSubPage('fm');

            // If they were on the TOS page then the cloud doesn't reload for some reason so refresh
            if (currentPage === 'terms') {
                window.location.reload();
            }

            return false;
        });

        // On the menu's Logout button
        $logoutMenuItem.off('tap').on('tap', function() {

            // Close the menu
            $html.removeClass('overlayed');
            $mainMenu.removeClass('active');
            $darkOverlay.addClass('hidden').removeClass('active');

            // Log the user out and go back to the login page
            M.logout();
            loadSubPage('login');

            // Show a toast notification
            mobile.showToast('Logout successful');

            return false;
        });

        // On a Login button tap/click go to the login page
        $loginMenuItem.off('tap').on('tap', function() {

            loadSubPage('login');
            return false;
        });

        // On a Create Account button tap/click go to the register page
        $registerMenuItem.off('tap').on('tap', function() {

            loadSubPage('register');
            return false;
        });

        // On a Terms of Service button tap/click go to the TOS page
        $termsMenuItem.off('tap').on('tap', function() {

            loadSubPage('terms');
            return false;
        });

        // On the Home button tap/click go to the home page
        $homeMenuItem.off('tap').on('tap', function() {

            // Close the menu
            $html.removeClass('overlayed');
            $mainMenu.removeClass('active');
            $darkOverlay.addClass('hidden').removeClass('active');

            // Load the home/start page (if logged in this may just go back to cloud drive)
            loadSubPage('start');
            return false;
        });
    }
};


/**
 * The Terms of Service page
 */
mobile.terms = {

    /**
     * Shows the Terms of Service page
     */
    show: function() {

        var $termsScreen = $('.mobile.terms-of-service');

        // Show the TOS page
        $termsScreen.removeClass('hidden');

        // Log if they visited the TOS page
        api_req({ a: 'log', e: 99636, m: 'Visited Terms of Service page on mobile webclient' });

        // Init Mega (M) icon
        mobile.initHeaderMegaIcon();
    }
};


/**
 * File upload functionality
 */
mobile.upload = {

    /**
     * Initialise the upload button
     */
    initUploadButton: function() {

        var $fileInput = $('#select-file');
        var $uploadIcon = $('.mobile.fm-icon.upload');
        var $overlay = $('#mobile-upload');

        // On the upload icon click/tap
        $uploadIcon.off('tap').on('tap', function() {

            // Open the file picker
            $fileInput.trigger('click');
            return false;
        });

        // When the file is selected, start the upload
        $fileInput.off('change').on('change', function(event) {

            // Pop up upload dialog
            $overlay.removeClass('hidden').addClass('overlay');

            // Get file information
            var file = this.files[0];
            var fileSize = numOfBytes(file.size);
            var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
            var fileName = file.name;

            // Get file icon
            var fileExt = fileext(fileName);
            var fileIconName = (ext[fileExt]) ? ext[fileExt][0] : 'generic';
            var fileIconPath = mobile.imagePath + fileIconName + '.png';

            // Display in overlay
            $overlay.find('.filesize').text(fileSizeFormatted);
            $overlay.find('.filename').text(fileName);
            $overlay.find('.filetype-img').attr('src', fileIconPath);

            // ToDo: initialise upload button

            // Prevent double taps
            return false;
        });
    }
};


/**
 * Some stubs to prevent exceptions in action packet processing because not all files are loaded for mobile
 */

mega.ui.tpp = {
    reset: function() {},
    setTotalProgress: function() {}
};

var notify = {
    init: function() {},
    notifyFromActionPacket: function() {},
    countAndShowNewNotifications: function() {}
};

function msgDialog(type, title, msg, submsg, callback, checkbox) {

    // Call the mobile version
    mobile.messageOverlay.show(msg, submsg);
}

function removeUInode(nodeHandle, parentHandle) {

    // Call the mobile version
    mobile.cloud.renderDelete(nodeHandle, parentHandle);
}

// Not required for mobile
function fmtopUI() {}
function topmenuUI() {}
function sharedUInode() {}
function addToMultiInputDropDownList() {}
function removeFromMultiInputDDL() {}
