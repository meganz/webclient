/**
 * Code to trigger the mobile file manager download overlay and related behaviour
 */
mobile.downloadOverlay = {

    /** Supported max file size of 100 MB */
    maxFileSize: 100 * (1024 * 1024),

    /** Supported file types for download on mobile */
    supportedFileTypes: {
        doc: 'word',
        docx: 'word',
        odt: 'word',
        txt: 'word',
        rtf: 'word',
        xls: 'excel',
        xlsx: 'excel',
        ods: 'excel',
        jpeg: 'image',
        jpg: 'image',
        png: 'image',
        gif: 'image',
        mp3: 'audio',
        mp4: 'video',
        pdf: 'pdf'
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

        'use strict';

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

        'use strict';

        // On Open in Browser button click/tap
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

        'use strict';

        var $downloadButton = this.$overlay.find('.second.dl-megaapp');

        // If the user is logged in, i.e. in the cloud drive, then hide the Open in Mega App button
        // ToDo: remove this block when the app support is available for opening/downloading internal nodes
        if (typeof u_attr !== 'undefined' && localStorage.getItem('testOpenInApp') !== null) {
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

        'use strict';

        var redirectLink = this.getAppLink(nodeHandle);

        // If iOS (iPhone, iPad, iPod), use method based off https://github.com/prabeengiri/DeepLinkingToNativeApp/
        if (is_ios || localStorage.testOpenInApp === 'ios') {

            var ns = '.ios ';
            var appLink = 'mega://' + redirectLink;
            var events = ['pagehide', 'blur', 'beforeunload'];
            var timeout = null;

            var preventDialog = function() {
                clearTimeout(timeout);
                timeout = null;
                $(window).unbind(events.join(ns) + ns);
            };

            var redirectToStore = function() {
                window.top.location = mobile.downloadOverlay.getStoreLink();
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
        else if (ua.details.os === 'Windows Phone' || localStorage.testOpenInApp === 'winphone') {
            window.location = 'mega://' + redirectLink;
        }

        // Otherwise if Android
        else if (ua.indexOf('android') > -1 || localStorage.testOpenInApp === 'android') {
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

        'use strict';

        // If a public file link, add the base file handle and key
        if (typeof dlpage_ph !== 'undefined' && typeof dlpage_key !== 'undefined') {
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

        'use strict';

        var $closeButton = this.$overlay.find('.fm-dialog-close');
        var $body = $('body');

        // Show close button for folder links
        $closeButton.removeClass('hidden');

        // Add tap handler
        $closeButton.off('tap').on('tap', function() {

            // Hide overlay with download button options
            mobile.downloadOverlay.$overlay.addClass('hidden');
            $body.removeClass('wrong-file');

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

        'use strict';

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
        M.gfsfetch(nodeHandle, 0, -1, this.showDownloadProgress).done(function(data) {

            // Show the download completed so they can open the file
            mobile.downloadOverlay.showDownloadComplete(data, nodeHandle);
        })
        .fail(function(data) {

            // If over bandwidth quota
            if (data.target.status === 509) {
                dlmanager.showOverQuotaDialog();
            }
            else {
                // Show message 'An error occurred, please try again.'
                mobile.messageOverlay.show(l[8982]);
            }
        });
    },

    /**
     * Download progress handler
     * @param {Number} percentComplete The number representing the percentage complete e.g. 49.23, 51.5 etc
     * @param {Number} bytesLoaded The number of bytes loaded so far
     */
    showDownloadProgress: function(percentComplete, bytesLoaded) {

        'use strict';

        var $overlay = mobile.downloadOverlay.$overlay;
        var $downloadButtonText = $overlay.find('.download-progress span');
        var $downloadProgressBar = $overlay.find('.download-progress .bar');
        var $downloadPercent = $overlay.find('.download-percents');
        var $downloadSpeed = $overlay.find('.download-speed');

        // Calculate the download speed
        var percentCompleteRounded = Math.round(percentComplete);
        var currentTime = new Date().getTime();
        var secondsElapsed = (currentTime - mobile.downloadOverlay.startTime) / 1000;
        var bytesPerSecond = secondsElapsed ? bytesLoaded / secondsElapsed : 0;
        var speed = numOfBytes(bytesPerSecond);
        var speedSizeRounded = Math.round(speed.size);
        var speedText = speedSizeRounded + ' ' + speed.unit + '/s';

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
        'use strict';
        var node = M.d[nodeHandle];
        var isVideo = ua.details.engine !== 'Gecko' && filemime(node).startsWith('video/');

        var $downloadButton = this.$overlay.find('.download-progress');
        var $downloadButtonText = this.$overlay.find('.download-progress span');
        var $downloadPercent = this.$overlay.find('.download-percents');
        var $downloadSpeed = this.$overlay.find('.download-speed');

        // Change button text to full white and hide the download percentage and speed
        $downloadButton.addClass('complete');
        $downloadPercent.text('');
        $downloadSpeed.text('');
        $downloadButtonText.text(isVideo ? String(l[1988]).toUpperCase() : l[8949]);  // Save/Open File

        // Make download button clickable
        $downloadButton.off('tap').on('tap', function() {

            // Get the file's mime type
            var fileName = node.name;
            var mimeType = filemime(fileName);

            // Store a log for statistics
            api_req({ a: 'log', e: 99637, m: 'Downloaded and opened file on mobile webclient' });

            // Create object URL to download the file to the client
            if (isVideo) {
                M.saveAs(data.buffer, fileName).fail(function(ex) {
                    if (d) {
                        console.warn(ex);
                    }
                    location.href = mObjectURL([data.buffer], mimeType);
                });
            }
            else {
                location.href = mObjectURL([data.buffer], mimeType);
            }

            return false;
        });
    },

    /**
     * Change the max file size supported for various platforms based on device testing
     */
    adjustMaxFileSize: function() {

        'use strict';

        // If Chrome or Firefox on iOS, reduce the size to 1.3 MB
        if (navigator.userAgent.match(/CriOS/i) || navigator.userAgent.match(/FxiOS/i)) {
            this.maxFileSize = 1.3 * (1024 * 1024);
        }
    },

    /**
     * Checks if the file download can be performed in the browser or shows an error overlay
     * @param {Object} node The file node information
     */
    checkSupportedFile: function(node) {

        'use strict';

        var $body = $('body');
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
        if (fileSize > this.maxFileSize || !fileExtensionIsSupported) {

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

        'use strict';

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

        'use strict';

        var $downloadOnAppStoreButton = $('.mobile.download-app');
        var $appInfoBlock = $('.app-info-block');
        var $openInBrowserButton = $('.mobile.dl-browser');

        // Change the link
        $downloadOnAppStoreButton.attr('href', mobile.downloadOverlay.getStoreLink());

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
