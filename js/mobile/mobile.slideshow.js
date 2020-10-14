/**
 * Code for the image previews slideshow
 */
mobile.slideshow = {

    /** Store of previously fetched preview images */
    previews: {},

    /** Array of node handles for images that are in the current view */
    imagesInCurrentViewArray: [],

    /** Associative array of node handles for images that are in the current view and the corresponding image number */
    imagesInCurrentViewMap: {},

    /** The node handle of the current image being displayed */
    currentImageHandle: null,

    /** Cached jQuery object for the overlay */
    $overlay: null,

    /** The flag for mobile landscape */
    isLandscape: null,

    /** The flag for hiding header and footer buttons */
    hideHFFlag: false,

    /**
     * Initialise the preview slideshow
     * @param {String} nodeHandle The handle of the image to load first
     */
    init: function(nodeHandle) {

        'use strict';

        // Cache selector
        mobile.slideshow.$overlay = $('.mobile.slideshow-image-previewer');

        // Initialise the rest of the functionality
        mobile.slideshow.initLandscapeView(nodeHandle);
        mobile.slideshow.buildListOfImagesInDirectory();
        mobile.slideshow.hideOrShowNavigationButtons();
        mobile.slideshow.initPreviousImageFunctionality();
        mobile.slideshow.initNextImageFunctionality();
        mobile.slideshow.initCloseButton();
        mobile.slideshow.initHideShowToggleForHeaderAndButtons(nodeHandle);
        mobile.slideshow.fetchImageFromApi(nodeHandle, mobile.slideshow.displayImage, 'mid', true);

        mobile.initOverlayPopstateHandler(mobile.slideshow.$overlay);
    },

    /**
     * Init the landscape mode and bind the related event listener
     */
    initLandscapeView: function(nodeHandle) {

        'use strict';

        mobile.slideshow.isLandscape = window.matchMedia("(orientation: landscape)").matches;
        if (mobile.slideshow.isLandscape) {
            mobile.slideshow.hideHFFlag = true;
            mobile.slideshow.toggleForHeaderAndButtons();
        }

        $(window).rebind('orientationchange.slideshow', function() {
            mobile.slideshow.isLandscape = !mobile.slideshow.isLandscape;
            if (is_video(M.d[nodeHandle])) {
                if (mobile.slideshow.isLandscape
                    && $('.viewer-button.fs .icons-img', mobile.slideshow.$overlay).hasClass('fullscreen')
                    && !mobile.slideshow.hideHFFlag) {
                    mobile.slideshow.hideHFFlag = true;
                }
                else if (!mobile.slideshow.isLandscape
                    && $('.viewer-button.fs .icons-img', mobile.slideshow.$overlay).hasClass('fullscreen')
                    && mobile.slideshow.hideHFFlag) {
                    mobile.slideshow.hideHFFlag = false;
                }
            }
            else {
                mobile.slideshow.hideHFFlag = mobile.slideshow.isLandscape;
            }
            mobile.slideshow.toggleForHeaderAndButtons();
        });
    },

    /**
     * Show the loading animation for switching between slides
     * @returns {void}
     */
    showLoadingAnimation: function() {

        'use strict';

        // Show the loading animation
        mobile.slideshow.$overlay.find('.viewer-pending').removeClass('hidden');
    },

    /**
     * Hide the loading animation
     */
    hideLoadingAnimation: function() {

        'use strict';

        // Hide the loading animation
        mobile.slideshow.$overlay.find('.viewer-pending').addClass('hidden');
    },

    /**
     * Toggle hiding and showing the header and footer buttons when the black background or image is clicked
     * @param {String} nodeHandle The node handle/id for the image to be fetched
     */
    initHideShowToggleForHeaderAndButtons: function(nodeHandle) {

        'use strict';

        // Cache selectors
        var $slideShowBackground = mobile.slideshow.$overlay.find('.slideshow-wrapper');

        // On clicking the image or black background of the slideshow
        $slideShowBackground.off().on('tap', SoonFc(function() {
            if (!is_video(M.d[nodeHandle])) {
                mobile.slideshow.hideHFFlag = !mobile.slideshow.hideHFFlag;
                mobile.slideshow.toggleForHeaderAndButtons();
            }
        }));
    },

    /**
     * Action to toggle hiding and showing the header and footer buttons
     */
    toggleForHeaderAndButtons: function() {

        'use strict';

        var $slideShowHeader = mobile.slideshow.$overlay.find('.slideshow-header');
        var $slideShowFooterButtons = mobile.slideshow.$overlay.find('.slideshow-buttons');
        var $slideShowNavButtons = mobile.slideshow.$overlay.find('.slideshow-back-arrow, .slideshow-forward-arrow');

        if (mobile.slideshow.hideHFFlag) { // Hide them
            $slideShowHeader.addClass('hidden');
            $slideShowFooterButtons.addClass('hidden');
            $slideShowNavButtons.addClass('hidden');
        }
        else { // Show them
            $slideShowHeader.removeClass('hidden');
            $slideShowFooterButtons.removeClass('hidden');
            $slideShowNavButtons.removeClass('hidden');
        }
    },

    /**
     * Fetch the image data from the API, populate the 'previews' object, then run the callback provided
     * @param {String} nodeHandle The node handle/id for the image to be fetched
     * @param {Function} callbackFunction The callback function to be run after fetching the image data
     * @param {String} slideClass The slide to show e.g. left, mid, or right
     * @param {Boolean} initialLoad Optional flag for if this is the initial load of the previewer
     */
    fetchImageFromApi: function(nodeHandle, callbackFunction, slideClass, initialLoad) {

        'use strict';

        // If this is the first load, show a regular loading dialog until the whole previewer has loaded
        if (typeof initialLoad !== 'undefined') {
            loadingDialog.show();
        }
        else {
            // Otherwise show a regular smaller loading animation for switching between slides
            mobile.slideshow.showLoadingAnimation();
        }

        // If this image has already been fetched, then it is already cached
        if (typeof mobile.slideshow.previews[nodeHandle] !== 'undefined') {

            // Hide any loading dialogs/animations if visible
            mobile.slideshow.hideLoadingAnimation();
            loadingDialog.hide();

            // Call the callback function e.g. to display the image
            callbackFunction(nodeHandle, slideClass);
            return;
        }

        var node = M.getNodeByHandle(nodeHandle);
        var done = function(uri) {
            // Update global object with the image so it's ready for display
            mobile.slideshow.previews[nodeHandle] = {src: uri};

            // Hide any loading dialogs/animations if visible
            mobile.slideshow.hideLoadingAnimation();
            loadingDialog.hide();

            // Call the callback function e.g. to display the image
            callbackFunction(nodeHandle, slideClass);
        };

        getImage(node, 1).then(done).catch(function(ex) {
            if (d) {
                console.warn('Preview image retrieval failed.', nodeHandle, ex);
            }
            done(window.noThumbURI);
        });
    },

    /**
     * Display the preview image
     * @param {String} nodeHandle The node handle/id for the image to be displayed
     * @param {String} slideClass The slide to show e.g. left, mid, or right
     */
    displayImage: function(nodeHandle, slideClass) {

        'use strict';

        mobile.slideshow.cleanupCurrentlyViewedInstance();

        // Cache selectors
        var $fileName = mobile.slideshow.$overlay.find('.slideshow-file-name');
        var $currentFileNumAndTotal = mobile.slideshow.$overlay.find('.slideshow-file-number-and-total');
        var $image = mobile.slideshow.$overlay.find('.mobile.slides.' + slideClass + ' img');
        var $videoDiv = mobile.slideshow.$overlay.find('.mobile.slides.' + slideClass + ' .download.video-block');

        // Get the node and image data
        var node = M.getNodeByHandle(nodeHandle);
        var imageSource = mobile.slideshow.previews[nodeHandle].src;

        // Get the current slide number and how many images total in this folder e.g. '5 of 30'
        var currentSlideNum = mobile.slideshow.imagesInCurrentViewMap[nodeHandle];
        var numberOfImagesInView = mobile.slideshow.imagesInCurrentViewArray.length;
        var currentFileNumAndTotalText = l[1607].replace('%1', currentSlideNum).replace('%2', numberOfImagesInView);

        // Set as the current slideshow image
        mobile.slideshow.currentImageHandle = nodeHandle;

        // Set file name and image src
        $fileName.text(node.name);
        $currentFileNumAndTotal.text(currentFileNumAndTotalText);
        $image.attr('src', imageSource);

        // Change slide
        mobile.slideshow.changeSlide(slideClass);

        // Initialise buttons
        mobile.slideshow.initActionBarButtons(nodeHandle);

        // Show the dialog
        mobile.slideshow.$overlay.removeClass('hidden');

        // Update preview state.
        sessionStorage.setItem('previewNode', nodeHandle);

        if (is_video(node)) {
            var videoHtmlTemplate = $('.mobile-video-template');
            var videoHtmlDiv = videoHtmlTemplate.html();

            $image.addClass('hidden');
            mobile.slideshow.$overlay.find('.slides.mid').html(videoHtmlDiv);
            $videoDiv.removeClass('hidden');
            mobile.slideshow.$overlay.addClass('video');

            M.require('videostream').tryCatch(function() {
                iniVideoStreamLayout(node, mobile.slideshow.$overlay).then(function(ok) {
                    if (ok) {
                        mobile.slideshow.$overlay.find('.scroll-block').addClass('video');
                        $('.video-block, .video-controls', mobile.slideshow.$overlay).removeClass('hidden');
                        $('.viewer-button.fs', mobile.slideshow.$overlay).rebind('tap.toggleHeader', function (e) {
                            e.stopPropagation();
                            if (!mobile.slideshow.isLandscape) {
                                mobile.slideshow.hideHFFlag = !mobile.slideshow.hideHFFlag;
                                mobile.slideshow.toggleForHeaderAndButtons();
                            }
                            $(this).click();
                            return false;
                        });

                        // Autoplay the video / audio file
                        if ($.autoplay === nodeHandle) {
                            onIdle(function() {
                                $('.play-video-button', mobile.slideshow.$overlay).trigger('click');
                            });
                            delete $.autoplay;
                        }
                    }
                });
            });
        }
        else {
            $image.removeClass('hidden');
            $videoDiv.addClass('hidden');
            return false;
        }
    },

    /**
     * Build an array of all the node handles in the current view which are images
     */
    buildListOfImagesInDirectory: function() {

        'use strict';

        // Reset array and associative array
        mobile.slideshow.imagesInCurrentViewArray = [];
        mobile.slideshow.imagesInCurrentViewMap = {};

        // Loop through folder & file nodes in the current directory
        for (var i = 0, imageNumber = 1; i < M.v.length; i++) {

            var node = M.v[i];
            var nodeHandle = node.h;

            // If the node is an image or a video, add it to the array and map
            if (is_image3(node) || is_video(node)) {

                mobile.slideshow.imagesInCurrentViewArray.push(nodeHandle);
                mobile.slideshow.imagesInCurrentViewMap[nodeHandle] = imageNumber;

                // Update the number of the image which is displayed later
                imageNumber += 1;
            }
        }
    },

    /**
     * Hide the navigation buttons if there is only one image to be shown, otherwise show them
     */
    hideOrShowNavigationButtons: function() {

        'use strict';

        var $navButtons = mobile.slideshow.$overlay.find('.slide-show-navigation');

        // If there is more than one image, show the back and forward arrows
        if (mobile.slideshow.imagesInCurrentViewArray.length > 1) {
            $navButtons.removeClass('hidden');
        }
        else {
            // Otherwise hide them
            $navButtons.addClass('hidden');
        }
    },

    /**
     * Initialise the right arrow icon to show the next slideshow image
     */
    initNextImageFunctionality: function() {

        'use strict';

        // On next arrow click/tap
        mobile.slideshow.$overlay.find('.slideshow-forward-arrow').off().on('tap', function() {

            // Get the next image to be displayed
            var nextImageHandle = mobile.slideshow.findNextImage();

            // Fetch the image and then display it
            mobile.slideshow.fetchImageFromApi(nextImageHandle, mobile.slideshow.displayImage, 'right');

            // Rebind the hide/show toggle event for header and buttons
            mobile.slideshow.initHideShowToggleForHeaderAndButtons(nextImageHandle);

            // Prevent double taps
            return false;
        });

        // On swipe left
        mobile.slideshow.$overlay.find('.content-row').off('swipeleft').on('swipeleft', function() {

            // Get the next image to be displayed
            var nextImageHandle = mobile.slideshow.findNextImage();

            // Fetch the image and then display it
            mobile.slideshow.fetchImageFromApi(nextImageHandle, mobile.slideshow.displayImage, 'right');

            // Rebind the hide/show toggle event for header and buttons
            mobile.slideshow.initHideShowToggleForHeaderAndButtons(nextImageHandle);

            // Prevent double swipe
            return false;
        });
    },

    /**
     * What the function name says :-P
     */
    cleanupCurrentlyViewedInstance: function() {
        'use strict';

        // Destroy any streaming instance
        $(window).trigger('video-destroy');
    },

    /**
     * Find the next image handle to be displayed
     * @returns {String} Returns the node handle of the next image to be displayed
     */
    findNextImage: function() {

        'use strict';

        var currentImageIndex = 0;
        var numOfImages = mobile.slideshow.imagesInCurrentViewArray.length;

        // Loop through the images in the current view
        for (var i = 0; i < numOfImages; i++) {

            var nodeHandle = mobile.slideshow.imagesInCurrentViewArray[i];

            // If the current image is found, mark that index
            if (nodeHandle === mobile.slideshow.currentImageHandle) {
                currentImageIndex = i;
                break;
            }
        }

        // Add 1 to get the next index of the array
        var nextImageIndex = currentImageIndex + 1;

        // If the array end is exceeded start from the beginning
        if (nextImageIndex >= numOfImages) {
            nextImageIndex = 0;
        }

        // Return the handle of the next image to be displayed
        return mobile.slideshow.imagesInCurrentViewArray[nextImageIndex];
    },

    /**
     * Initialise the left arrow icon to show the previous slideshow image
     */
    initPreviousImageFunctionality: function() {

        'use strict';

        // On next arrow click/tap
        mobile.slideshow.$overlay.find('.slideshow-back-arrow').off().on('tap', function() {

            // Get the next image to be displayed
            var nextImageHandle = mobile.slideshow.findPreviousImage();

            // Fetch the image and then display it
            mobile.slideshow.fetchImageFromApi(nextImageHandle, mobile.slideshow.displayImage, 'left');

            // Rebind the hide/show toggle event for header and buttons
            mobile.slideshow.initHideShowToggleForHeaderAndButtons(nextImageHandle);

            // Prevent double taps
            return false;
        });

        // On swipe right
        mobile.slideshow.$overlay.find('.content-row').off('swiperight').on('swiperight', function() {

            // Get the next image to be displayed
            var nextImageHandle = mobile.slideshow.findPreviousImage();

            // Fetch the image and then display it
            mobile.slideshow.fetchImageFromApi(nextImageHandle, mobile.slideshow.displayImage, 'left');

            // Rebind the hide/show toggle event for header and buttons
            mobile.slideshow.initHideShowToggleForHeaderAndButtons(nextImageHandle);

            // Prevent double swipe
            return false;
        });
    },

    /**
     * Find the previous image handle to be displayed
     * @returns {String} Returns the node handle of the previous image to be displayed
     */
    findPreviousImage: function() {

        'use strict';

        var currentImageIndex = 0;
        var numOfImages = mobile.slideshow.imagesInCurrentViewArray.length;

        // Loop through the images in the current view
        for (var i = 0; i < numOfImages; i++) {

            var nodeHandle = mobile.slideshow.imagesInCurrentViewArray[i];

            // If the current image is found, mark that index
            if (nodeHandle === mobile.slideshow.currentImageHandle) {
                currentImageIndex = i;
                break;
            }
        }

        // Subtract 1 to get the previous index of the array
        var nextImageIndex = currentImageIndex - 1;

        // If the start of the array is exceeded start from the end of the array
        if (nextImageIndex < 0) {
            nextImageIndex = numOfImages - 1;
        }

        // Return the handle of the next image to be displayed
        return mobile.slideshow.imagesInCurrentViewArray[nextImageIndex];
    },

    /**
     * Changes the slide position
     * @param {String} slideClass The slide to show e.g. left, mid, or right
     */
    changeSlide: function(slideClass) {

        'use strict';

        mobile.slideshow.$overlay.removeClass('video-theatre-mode');

        if (slideClass === 'right') {
            mobile.slideshow.$overlay.find('.slides.mid .download.video-block').remove();
            mobile.slideshow.$overlay.find('.slides.left').remove();
            mobile.slideshow.$overlay.find('.slides.mid')
                .removeClass('mid').addClass('left');
            mobile.slideshow.$overlay.find('.slides.right')
                .removeClass('right').addClass('mid');
            mobile.slideshow.$overlay.find('.slides-bl')
                .append('<div class="mobile slides right"><img alt="" /></div>');
        }
        else if (slideClass === 'left') {
            mobile.slideshow.$overlay.find('.slides.mid .download.video-block').remove();
            mobile.slideshow.$overlay.find('.slides.right').remove();
            mobile.slideshow.$overlay.find('.slides.mid')
                .removeClass('mid').addClass('right');
            mobile.slideshow.$overlay.find('.slides.left')
                .removeClass('left').addClass('mid');
            mobile.slideshow.$overlay.find('.slides-bl')
                .prepend('<div class="mobile slides left"><img alt="" /></div>');
        }
    },

    /**
     * Close the overlay
     */
    close: function() {
        'use strict';

        if (!mobile.slideshow.$overlay) {
            // was not opened
            return;
        }

        // Hide the dialog
        mobile.slideshow.$overlay.addClass('hidden');

        // Cleanup curr....
        mobile.slideshow.cleanupCurrentlyViewedInstance();
        mobile.slideshow.$overlay.find('.slides.mid img').remove();
        mobile.slideshow.$overlay.find('.slides.mid').prepend('<img alt="" /></div>');
        sessionStorage.removeItem('previewNode');
        sessionStorage.removeItem('previewTime');
    },

    /**
     * Initialise the close button
     */
    initCloseButton: function() {

        'use strict';

        // On close button click/tap
        mobile.slideshow.$overlay.find('.fm-dialog-close').off().on('tap', function(e) {
            mobile.slideshow.close();
            // Prevent double taps
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
            // Show the file preview overlay
            mobile.slideshow.init(nodeHandle);
            return false;

        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {String} nodeHandle The node handle for this file
     */
    initDeleteButton: function(nodeHandle) {

        'use strict';

        var $deleteButton = mobile.slideshow.$overlay.find('.delete-button');

        // If a public folder, hide the delete button
        if (pfid) {
            $deleteButton.addClass('hidden');
        }
        else {
            $deleteButton.removeClass('hidden');
        }

        // If the Delete button is tapped
        $deleteButton.off('tap').on('tap', function() {

            // Show the folder/file delete overlay
            mobile.deleteOverlay.show(nodeHandle, function() {

                // After successful delete, hide the preview slideshow
                mobile.slideshow.$overlay.addClass('hidden');
            });

            // Prevent double tap
            return false;
        });
    },

    /**
     * Init Button to handle delete if node in rubbish bin.
     * @param nodeHandle
     */
    initRubbishBinDeleteButton: function(nodeHandle) {
        'use strict';
        mobile.slideshow.$overlay.find(".rubbishbin-delete-button").off('tap').on('tap', function() {
            $.selected = [nodeHandle];
            M.clearRubbish(false)
                .then(function() {
                    mobile.slideshow.close();
                    mobile.showSuccessToast(l[19635]);
                })
                .catch(function() {
                    mobile.showErrorToast(l[5963]);
                });
            return false;
        });
    },

    /**
     * Functionality for downloading a file
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initDownloadButton: function(nodeHandle) {

        'use strict';

        // If the Download button is tapped
        mobile.slideshow.$overlay.find('.download-button').off('tap').on('tap', function() {

            // Show the file download overlay
            mobile.downloadOverlay.showOverlay(nodeHandle);
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user create and copy a file/folder link
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initLinkButton: function(nodeHandle) {

        'use strict';

        var $linkButton = mobile.slideshow.$overlay.find('.manage-link-button');

        // If a public folder, hide the link button
        if (pfid) {
            $linkButton.addClass('hidden');
        }
        else {
            $linkButton.removeClass('hidden');
        }

        // If the Link button is tapped
        $linkButton.off('tap').on('tap', function() {

            // Show the file link overlay
            mobile.linkOverlay.show(nodeHandle);
            return false;
        });
    },

    /**
     * Init actionbar buttons
     */
    initActionBarButtons: function(nodeHandle) {
        'use strict';

        if (M.getNodeRoot(nodeHandle) !== M.RubbishID) {
            // Only show link and delete button if the image is not in the rubbish bin.
            mobile.slideshow.$overlay.find(".manage-link-button, .delete-button").removeClass('hidden');
            mobile.slideshow.$overlay.find(".rubbishbin-delete-button").addClass("hidden");
            mobile.slideshow.initDeleteButton(nodeHandle);
            mobile.slideshow.initLinkButton(nodeHandle);
        } else {
            mobile.slideshow.$overlay.find(".manage-link-button, .delete-button").addClass('hidden');
            mobile.slideshow.$overlay.find(".rubbishbin-delete-button").removeClass("hidden");
            mobile.slideshow.initRubbishBinDeleteButton(nodeHandle);
        }
        mobile.slideshow.initDownloadButton(nodeHandle);

    }
};
