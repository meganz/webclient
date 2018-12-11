/**
 * This file handles the Public Service Announcements. One announcement will
 * appear at the bottom of the page in an overlay at a time. The announcements
 * come from a hard coded list initially. Once a user has seen an announcement
 * they will mark it as read on the API server. If a user is not logged in
 * then it will mark that announcement as seen in localStorage.
 */
var psa = {

    /** The id number of the last announcement that the user has seen */
    lastSeenPsaId: 0,

    /**
     * The current announcement object from the API e.g.
     * {
     *      id: integer psa id
     *      t: string psa title, already translated into user's known language if available
     *      d: string psa body/description, already translated if available
     *      img: string url to image on one of our static servers
     *      l: string link url for the positive flow button (this can be empty if not provided)
     *      b: string button label for positive flow button, can be empty if not provided
     * }
     */
    currentPsa: null,

    /** Whether the PSA has already been fetched this session */
    fetchedPsa: false,

    /** If the PSA is currently being shown */
    visible: false,

    /**
     * Show the dialog if they have not seen the announcement yet
     */
    init: function() {

        'use strict';

        // Get the last announcement number they have seen from localStorage
        if (localStorage.getItem('lastSeenPsaId') !== null) {
            psa.lastSeenPsaId = parseInt(localStorage.getItem('lastSeenPsaId'));
        }

        // Request current PSA number from API
        psa.requestCurrentPsaAndShowAnnouncement();
    },

    /**
     * Get the PSA number manually from the API. This is a public API call so it's available for not logged in users.
     */
    requestCurrentPsaAndShowAnnouncement: function() {

        'use strict';

        // If we already know the current announce number in local state
        if (psa.currentPsa !== null) {

            // Show the announcement and return early so the API request is not repeated for each page view
            psa.configureAndShowAnnouncement();
            return false;
        }

        // Already tried fetching the announcement this session
        if (psa.fetchedPsa) {
            return false;
        }

        // Make Get PSA (gpsa) API request
        api_req({ a: 'gpsa', n: psa.lastSeenPsaId }, {
            callback: function(result) {

                // If there is no current announcement, set a flag so we don't repeat API requests this session
                if (result === -9) {
                    psa.fetchedPsa = true;
                }

                // If there is an announcement to be shown
                else if (typeof result === 'object') {

                    // Set a flag so we don't repeat API requests
                    psa.fetchedPsa = true;

                    // Cache the current announcement
                    psa.currentPsa = result;

                    // Show the announcement
                    psa.configureAndShowAnnouncement();
                }
            }
        });
    },

    /**
     * Wrapper function to configure the announcement details and show it
     */
    configureAndShowAnnouncement: function() {

        'use strict';

        // Only show the announcement if they have not seen the current announcement.
        // The localStorage.alwaysShowPsa is a test variable to force show the PSA
        if ((psa.lastSeenPsaId < psa.currentPsa.id) || (localStorage.alwaysShowPsa === '1')) {

            psa.prefillAnnouncementDetails();
            psa.addCloseButtonHandler();
            psa.addMoreInfoButtonHandler();
            psa.showAnnouncement();
        }
        else {
            // If they viewed the site while not logged in, then logged in with
            // an account that had already seen this PSA then this hides it
            psa.hideAnnouncement();
        }
    },

    /**
     * Update the details of the announcement depending on the current one
     */
    prefillAnnouncementDetails: function() {

        'use strict';

        // Determine image path
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';
        var imagePath = staticpath + 'images/mega/psa/' + psa.currentPsa.img + retina + '.png';

        // Decode the text from Base64 (there were some issues with some languages)
        var title = from8(base64urldecode(psa.currentPsa.t));
        var description = from8(base64urldecode(psa.currentPsa.d));
        var buttonLabel = from8(base64urldecode(psa.currentPsa.b));

        // Populate the details
        var $psa = $('.public-service-anouncement');
        $psa.find('.title').text(title);
        $psa.find('.messageA').text(description);
        $psa.find('.view-more-info').attr('data-continue-link', psa.currentPsa.l);
        $psa.find('.view-more-info .text').text(buttonLabel);
        $psa.find('.display-icon').attr('src', imagePath).on('error', function() {

            // If the icon doesn't exist for new PSAs which is likely while in local development, use the one
            // on the default static path as they are added directly to the static servers now for each new PSA
            $(this).attr('src', psa.currentPsa.dsp + psa.currentPsa.img + retina + '.png');
        });
    },

    /**
     * Adds the close button functionality
     */
    addCloseButtonHandler: function() {

        'use strict';

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .fm-dialog-close');
        $('body').on('click', '.public-service-anouncement .fm-dialog-close', function() {

            // Hide the banner and store that they have seen this PSA
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();
        });
    },

    /**
     * Adds the functionality for the view more info button
     */
    addMoreInfoButtonHandler: function() {

        'use strict';

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .button.view-more-info');
        $('body').on('click', '.public-service-anouncement .button.view-more-info', function() {

            // Get the page link for this announcement
            var pageLink = $(this).attr('data-continue-link');

            // Hide the banner and save the PSA as seen
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();

            // Open a new tab (and hopefully don't trigger popup blocker)
            window.open(pageLink, '_blank');
        });
    },

    /**
     * Shows the announcement
     */
    showAnnouncement: function() {

        'use strict';

        // Show the PSA
        $('body').addClass('notification');

        // Move the file manager up
        psa.resizeFileManagerHeight();

        // Add a handler to fix the layout if the window is resized
        $(window).rebind('resize.bottomNotification', function() {
            psa.resizeFileManagerHeight();
            psa.repositionAccountLoadingBar();
        });

        // Currently being shown
        psa.visible = true;
    },

    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {

        'use strict';

        // If already hidden, don't do anything (specially a window.trigger('resize')).
        if (!this.visible) {
            return false;
        }

        // Move the progress bar back to the 0 position
        $('.loader-progressbar').css('bottom', 0);

        // Hide the announcement
        $('body').removeClass('notification');

        // Reset file manager height
        $('.fmholder').css('height', '');
        $(window).off('resize.bottomNotification');

        // Trigger resize so that full content in the file manager is visible after closing
        $(window).trigger('resize');

        // Save last seen announcement number for page changes
        psa.lastSeenPsaId = psa.currentPsa.id;

        // Set to no longer visible
        psa.visible = false;
    },

    /**
     * Saves the current announcement number they have seen to a user attribute if logged in, otherwise to localStorage
     */
    saveLastPsaSeen: function() {

        'use strict';

        // Always store that they have seen it in localStorage. This is useful if they
        // then log out, then the PSA should still stay hidden and not re-show itself
        localStorage.lastSeenPsaId = String(psa.currentPsa.id);

        // If logged in and completed registration
        if (u_type === 3) {

            // Store that they have seen it on the API side
            // (should be stored as ^!lastPsa for a private non encrypted, non historic attribute)
            mega.attr.set('lastPsa', String(psa.currentPsa.id), -2, true);
        }
    },

    /**
     * When the user logs in, this updates the API with the last PSA they saw when they were logged out
     * @param {String|undefined} apiLastPsaSeen The last PSA that the user has seen that the API knows about
     */
    updateApiWithLastPsaSeen: function(apiLastPsaSeen) {

        'use strict';

        // Make sure they have seen a PSA and that the API seen PSA is older than the one in localStorage
        if (localStorage.getItem('lastSeenPsaId') !== null && apiLastPsaSeen < localStorage.getItem('lastSeenPsaId')) {

            // Store that they have seen it on the API side
            // (should be stored as ^!lastPsa for a private non encrypted, non historic attribute)
            mega.attr.set('lastPsa', localStorage.lastSeenPsaId, -2, true);
        }
    },

    /**
     * Resize the fmholder and startholder container heights
     * because they depend on the bottom notification height
     */
    resizeFileManagerHeight: function() {

        'use strict';

        // If the PSA announcement is currently shown
        if (!is_mobile && $('body').hasClass('notification')) {

            var notificationSize = $('.bottom-info.body').outerHeight();
            var bodyHeight = $('body').outerHeight();

            if (notificationSize > 120) {
                $('.fmholder').height(bodyHeight - notificationSize);
            }
        }
    },

    /**
     * Repositions the account loading bar so it is above the PSA if it is being shown
     */
    repositionAccountLoadingBar: function() {

        'use strict';

        // If the PSA is visible
        if (psa.visible) {

            // Move the progress bar up above the PSA otherwise it's not visible
            var psaHeight = $('.public-service-anouncement').outerHeight();
            $('.loader-progressbar').css('bottom', psaHeight);
        }
        else {
            // Reset to the bottom
            $('.loader-progressbar').css('bottom', 0);
        }
    }
};
