/**
 * File upload functionality (currently incomplete)
 */
mobile.uploadOverlay = {

    /** Upload start time in milliseconds */
    startTime: null,

    /** The jQuery selector for the create new folder overlay */
    $overlay: null,

    /** The jQuery selector for the cloud drive / file manager block */
    $fileManagerBlock: null,

    /**
     * Initialise the upload screen functionality
     */
    init: function() {

        'use strict';

        // Cache selectors
        this.$overlay = $('.mobile.upload-overlay');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        // Init functionality
        mobile.uploadOverlay.initFileSelectedHandler();
        mobile.uploadOverlay.initCloseOverlayButton();
    },

    /**
     * Initialise the handler for file selection
     */
    initFileSelectedHandler: function() {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $fileManagerBlock = this.$fileManagerBlock;
        var $fileInput = $fileManagerBlock.find('.upload-select-file');
        var $uploadAnotherFileButton = $overlay.find('.upload-another-file');
        var $uploadProgressBlock = $overlay.find('.upload-progress');
        var $uploadProgressText = $overlay.find('.upload-progress .text');
        var $uploadProgressBar = $overlay.find('.upload-progress .bar');
        var $uploadPercent = $overlay.find('.upload-percents');
        var $uploadSpeed = $overlay.find('.upload-speed');

        // When the file is selected
        $fileInput.off('change').on('change', function(event) {

            // Pop up upload dialog
            $overlay.removeClass('hidden').addClass('overlay');

            // Get file information
            var fileInfo = this.files[0];

            // If they clicked the Cancel button in the dialog, prevent Chrome exception by returning early
            if (typeof fileInfo === 'undefined') {
                return false;
            }

            // Format the file size and get the file name
            var fileSize = numOfBytes(fileInfo.size);
            var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
            var fileName = fileInfo.name;

            // Get file icon
            var fileExt = fileext(fileName);
            var fileIconName = ext[fileExt] ? ext[fileExt][0] : 'generic';
            var fileIconPath = mobile.imagePath + fileIconName + '.png';

            // Display in overlay
            $overlay.find('.filesize').text(fileSizeFormatted);
            $overlay.find('.filename').text(fileName);
            $overlay.find('.filetype-img').attr('src', fileIconPath);

            // Reset state of dialog from past uploads
            $uploadAnotherFileButton.addClass('hidden').off('tap');
            $uploadProgressBlock.removeClass('complete').off('tap');
            $uploadProgressText.removeClass('starting-upload').text(l[6110]);
            $uploadProgressBar.width('0');
            $uploadPercent.text('');
            $uploadSpeed.text('');

            // Start the upload
            mobile.uploadOverlay.prepareAndStartUpload(event);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Prepare the file for upload and start the upload process
     * @param {Object} event The jQuery event object
     */
    prepareAndStartUpload: function(event) {

        'use strict';

        // Cache selectors
        var $pageBody = $('body');
        var $overlay = mobile.uploadOverlay.$overlay;
        var $uploadProgressText = $overlay.find('.upload-progress .text');

        // Prepare upload data
        var file = null;
        var targetId = M.currentdirid;
        var dataTransfer = Object(event.dataTransfer);
        var files = event.target.files || dataTransfer.files;
        var gecko = dataTransfer && ('mozItemCount' in dataTransfer || browserdetails(ua).browser === 'Firefox');

        // Exit early if no file selected
        if (!files || files.length === 0) {
            if (!dataTransfer.mozItemCount) {
                return false;
            }
        }

        // Only one file allowed at a time so the file is the first in the array
        file = files[0];

        // Prepare upload metadata
        if (file.webkitRelativePath) {
            file.path = String(file.webkitRelativePath).replace(RegExp("[\\/]"
                    + String(file.name).replace(/([^\w])/g, '\\$1') + "$"), '');
        }
        if (gecko) {
            file.gecko = true;
        }
        if (file.name !== '.') {
            try {
                file.target = targetId;
                file.flashid = false;
                file.id = '8001';
                file.ownerId = u_attr.u;

                // Start the upload, this happens automatically using the desktop code
                ul_queue.push(file);

                // Set the start time
                mobile.uploadOverlay.startTime = new Date().getTime();

                // Show progress bar
                $pageBody.addClass('uploading');

                // Add a class to make the progress block text grey and show text Starting...
                $uploadProgressText.addClass('starting-upload').text(l[7022] + '...');
            }
            catch (exception) {
                console.error('Upload error: ' + file.name, exception);
                mobile.messageOverlay.show(l[1309]);
                return false;
            }
        }

        // Set flag
        ulmanager.isUploading = Boolean(ul_queue.length);
    },

    /**
     * Shows the upload progress in the overlay
     * @param {Object} uploadData The file metadata
     * @param {Number} percentComplete The percentage of the file uploaded so far
     * @param {Number} bytesLoaded The number of bytes loaded so far
     */
    showUploadProgress: function(uploadData, percentComplete, bytesLoaded) {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $uploadProgressText = $overlay.find('.upload-progress .text');
        var $uploadProgressBar = $overlay.find('.upload-progress .bar');
        var $uploadPercent = $overlay.find('.upload-percents');
        var $uploadSpeed = $overlay.find('.upload-speed');

        // Calculate the upload speed
        var percentCompleteRounded = Math.round(percentComplete);
        var currentTime = new Date().getTime();
        var secondsElapsed = (currentTime - mobile.uploadOverlay.startTime) / 1000;
        var bytesPerSecond = secondsElapsed ? bytesLoaded / secondsElapsed : 0;
        var speed = numOfBytes(bytesPerSecond);
        var speedSizeRounded = Math.round(speed.size);
        var speedText = speedSizeRounded + ' ' + speed.unit + '/s';

        // Display the upload progress and speed
        $uploadPercent.text(percentCompleteRounded + '%');
        $uploadProgressBar.width(percentComplete + '%');
        $uploadSpeed.text(speedText);

        // Remove class to hide the Starting... text now that we have progress bar showing and show text Uploading...
        if (percentComplete >= 1 && percentComplete < 99) {
            $uploadProgressText.removeClass('starting-upload').text(l[6110]);
        }

        // If the upload is nearly complete e.g. 99/100%, change button text to Completing... which can take some time
        else if (percentComplete >= 99) {
            $uploadProgressText.removeClass('starting-upload').text(l[16508]);
        }
    },

    /**
     * Show that the upload has completed and initialise some buttons to view the file or upload another file
     * @param {Object} node The node information
     */
    showUploadComplete: function(node) {

        'use strict';

        // Cache selectors
        var $pageBody = $('body');
        var $overlay = this.$overlay;
        var $viewFileButton = $overlay.find('.upload-progress');
        var $viewFileButtonText = $overlay.find('.upload-progress .text');
        var $uploadProgressBar = $overlay.find('.upload-progress .bar');
        var $uploadPercent = $overlay.find('.upload-percents');
        var $uploadSpeed = $overlay.find('.upload-speed');

        // Change button text to full white, show as Complete hide the upload percentage and speed
        $pageBody.removeClass('uploading');
        $uploadProgressBar.width('100%');
        $viewFileButton.addClass('complete');
        $viewFileButtonText.removeClass('starting-upload').text(l[59]);
        $uploadPercent.text('');
        $uploadSpeed.text('');

        // Initialise buttons
        mobile.uploadOverlay.initGetLinkButton(node);
        mobile.uploadOverlay.initUploadAnotherFileButton();

        // Add a server log
        api_req({ a: 'log', e: 99678, m: 'Mobile web file upload completed' });
    },

    /**
     * Initialise the Get Link button to open the Get Link overlay
     * @param {Object} node The file node
     */
    initGetLinkButton: function(node) {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $getLinkButton = $overlay.find('.upload-progress');

        // Initialise the button to go to the file preview if it an image or file download for other files
        $getLinkButton.off('tap').on('tap', function() {

            // Hide the overlay
            $overlay.addClass('hidden');

            // Get the node handle
            var nodeHandle = node.h;

            // Show the Get Link overlay
            mobile.linkOverlay.show(nodeHandle);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the Upload Another File button to let the user upload another file
     */
    initUploadAnotherFileButton: function() {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $fileManager = this.$fileManagerBlock;
        var $uploadAnotherFileButton = $overlay.find('.upload-another-file');
        var $fileInput = $fileManager.find('.upload-select-file');

        // Show and initialise the Upload Another File button
        $uploadAnotherFileButton.removeClass('hidden').off('tap').on('tap', function() {

            // Open the file picker
            $fileInput.trigger('click');

            // Initialise the behaviour for when the file is selected
            mobile.uploadOverlay.init();

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the close button to close the overlay/dialog
     */
    initCloseOverlayButton: function() {

        'use strict';

        var $overlay = $('.mobile.upload-overlay');
        var $closeIcon = $overlay.find('.fm-dialog-close, .close-button' );

        // On tapping/clicking the Close icon
        $closeIcon.off('tap').on('tap', function() {

            ulmanager.abort(null);

            // Close the upload overlay
            $overlay.addClass('hidden').removeClass('overlay');
            return false;
        });
    }
};
