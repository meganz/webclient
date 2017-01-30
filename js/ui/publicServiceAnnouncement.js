/**
 * This file handles the Public Service Announcements. One announcement will
 * appear at the bottom of the page in an overlay at a time. The announcements
 * come from a hard coded list initially. Once a user has seen an announcement
 * they will mark it as read on the API server. If a user is not logged in
 * then it will mark that announcement as seen in localStorage.
 */
var psa = {

    /** The private attribute (Base64 string) storing which announcement the user has seen (not decrypted yet) */
    lastSeenAttr: null,

    /** The last announcement that the user has seen */
    lastSeenAnnounceNum: 0,

    /** The current announcement number from the API */
    currentAnnounceNum: 0,

    /** If the PSA is currently being shown */
    visible: false,

    /** If the Get Misc Flags request has already been performed for non logged in users */
    fetchedFlags: false,

    /**
     * If logged in, the User Get ('ug') API response sets the current and last seen announcement numbers
     * @param {Number} currentAnnounceNum A number sent by the API
     * @param {String} lastSeenAttr A private attribute encoded as Base64 to be decrypted which contains a number
     */
    setInitialValues: function(currentAnnounceNum, lastSeenAttr) {

        // If they have a stored value on the API that contains which
        // announcement they have seen then decrypt it and set it
        psa.lastSeenAttr = lastSeenAttr;

        // Set the current announcement number
        psa.currentAnnounceNum = currentAnnounceNum;
    },

    /**
     * Show the dialog if they have not seen the announcement yet
     */
    init: function() {

        // Get the last announcement number they have seen from localStorage
        if (localStorage.getItem('lastSeenAnnounceNum') !== null) {
            psa.lastSeenAnnounceNum = localStorage.getItem('lastSeenAnnounceNum');
        }

        // If logged in and completed registration fully
        if (u_type === 3) {

            // Decrypt the attribute which stores which announcement they have seen
            psa.decryptPrivateAttribute();

            // Show the announcement if they have not seen the current announcement
            psa.configAndShowAnnouncement();
        }

        // Otherwise not logged in, request current PSA number from API
        else {
            psa.requestCurrentPsaAndShowAnnouncement();
        }
    },

    /**
     * Decrypt the private user attribute
     * @returns {Number} Returns an integer containing the last announcement number they have seen
     */
    decryptPrivateAttribute: function() {

        // If the private attribute has been set on the API
        if (psa.lastSeenAttr) {

            try {
                // Try decode, decrypt, convert from TLV into a JS object, then get the number
                var decodedAttr = base64urldecode(psa.lastSeenAttr);
                var clearContainer = tlvstore.blockDecrypt(decodedAttr, u_k);
                var decryptedAttr = tlvstore.tlvRecordsToContainer(clearContainer, true);

                // Convert the last seen number to an integer and get the last seen number from localStorage
                var lastSeenNumFromApi = parseInt(decryptedAttr.num);
                var lastSeenNumFromLocalStore = localStorage.getItem('lastSeenAnnounceNum');

                // If the user account has seen the PSA at some point while they were logged in
                if (lastSeenNumFromApi > lastSeenNumFromLocalStore) {

                    // Update localStorage, then it won't re-appear on log out
                    localStorage.setItem('lastSeenAnnounceNum', lastSeenNumFromApi);

                    // Set the announcement number
                    psa.lastSeenAnnounceNum = lastSeenNumFromApi;
                }

                // Otherwise if localStorage is more up-to-date
                else if (lastSeenNumFromLocalStore > lastSeenNumFromApi) {

                    // Store that they have seen it on the API side
                    mega.attr.set('lastPsaSeen', { num: String(lastSeenNumFromLocalStore) }, false, true);

                    // Set the announcement number
                    psa.lastSeenAnnounceNum = lastSeenNumFromLocalStore;
                }
            }
            catch (exception) {

                // Set the last seen to the current one so the announcement won't show
                psa.lastSeenAnnounceNum = psa.currentAnnounceNum;
            }
        }
    },

    /**
     * Wrapper function to configure the announcement details and show it
     */
    configAndShowAnnouncement: function() {

        // Get the relevant announcement
        var announcement = psa.getAnouncementDetails();

        // Only show the announcement if they have not seen the current announcement.
        // The localStorage.alwaysShowPsa is a test variable to force show the PSA
        if ((psa.lastSeenAnnounceNum < psa.currentAnnounceNum) || (localStorage.alwaysShowPsa === '1')) {
            psa.prefillAnnouncementDetails(announcement);
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
     * Gets the current announcement details
     * @returns {Object} Returns an object with the current announcement details
     */
    getAnouncementDetails: function() {

        // Current announcements - to be fetched from the CMS in future
        var announcements = {
            1: {
                title: l[8537],         // Important notice:
                messageA: l[8535],      // Mega will be changing its terms...
                messageB: l[8536],      // Thank you for using MEGA
                buttonText: l[8538],    // View Blog Post
                buttonLink: 'blog_36',  // Blog 36 has more details about the TOS changes
                cssClass: ''            // Default CSS class
            },
            2: {
                title: l[8737],         // 25 May - International Missing Children...
                messageA: l[8738],      // In support of missing and exploited children...
                messageB: ' ',
                buttonText: l[8742],    // Learn more
                buttonLink: 'blog_41',
                cssClass: 'blue'
            }
        };

        // Return the relevant object
        if (typeof announcements[psa.currentAnnounceNum] !== 'undefined') {
            return announcements[psa.currentAnnounceNum];
        }

        // Undefined announcement number, reset to 0, so it will not show
        psa.currentAnnounceNum = 0;
        return false;
    },

    /**
     * Update the details of the announcement depending on the current one
     * @param {Object} announcement The announcement details as an object
     */
    prefillAnnouncementDetails: function(announcement) {

        // Populate the details
        var $psa = $('.public-service-anouncement');
        $psa.addClass(announcement.cssClass);
        $psa.find('.title').safeHTML(announcement.title);          // The messages could have HTML e.g. bold text
        $psa.find('.messageA').safeHTML(announcement.messageA);
        $psa.find('.messageB').safeHTML(announcement.messageB);
        $psa.find('.view-more-info').attr('data-continue-link', announcement.buttonLink);
        $psa.find('.view-more-info .text').text(announcement.buttonText);
    },

    /**
     * Adds the close button functionality
     */
    addCloseButtonHandler: function() {

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .button.close');
        $('body').on('click', '.public-service-anouncement .button.close', function() {

            // Hide the banner and store that they have seen this PSA
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();
        });
    },

    /**
     * Adds the functionality for the view more info button
     */
    addMoreInfoButtonHandler: function() {

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .button.view-more-info');
        $('body').on('click', '.public-service-anouncement .button.view-more-info', function() {

            // Get the page link for this announcement
            var pageLink = $(this).attr('data-continue-link');

            // Hide the banner and save the PSA as seen
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();

            // If they are still loading their account (the loading animation is visible)
            if ($('.dark-overlay').is(':visible') || $('.light-overlay').is(':visible')) {

                // Get current URL and remove the hash so it works in development as well
                var baseUrl = getAppBaseUrl();

                // Open a new tab (and hopefully don't trigger popup blocker)
                window.open(baseUrl + '#' + pageLink, '_blank');
            }
            else {
                // Otherwise redirect normally
                loadSubPage(pageLink);
            }
        });
    },

    /**
     * Shows the announcement
     */
    showAnnouncement: function() {

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
     * Get the PSA number manually from the API. This is a public API call so it's available for not logged in users.
     */
    requestCurrentPsaAndShowAnnouncement: function() {

        // If we already know the current announce number in local state
        if (psa.fetchedFlags) {

            // Show the announcement and return early so the API request is not repeated for each page view
            psa.configAndShowAnnouncement();
            return false;
        }

        // Make Get Miscellaneous Flags (gmf) API request
        api_req({ a: 'gmf' }, {
            callback: function(result) {

                // If successful result
                if (result) {

                    // Set a flag so we don't repeat API requests
                    psa.fetchedFlags = true;

                    // If a PSA is enabled
                    if (typeof result.psa !== 'undefined') {

                        // Set the number indicating which PSA we want to show
                        psa.currentAnnounceNum = result.psa;

                        // Show the announcement
                        psa.configAndShowAnnouncement();
                    }
                }
            }
        });
    },

    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {
        // if already hidden, don't do anything (specially a window.trigger('resize')).
        if (!this.visible) {
            return false;
        }

        // Move the progress bar back to the 0 position
        $('.loader-progressbar').css('bottom', 0);

        // Hide the announcement
        $('body').removeClass('notification');

        // Reset file manager height
        $('.fmholder').css('height', '');
        $(window).unbind('resize.bottomNotification');

        // Trigger resize so that full content in the file manager is visible after closing
        $(window).trigger('resize');

        // Save last seen announcement number for page changes
        psa.lastSeenAnnounceNum = psa.currentAnnounceNum;

        // Set to no longer visible
        psa.visible = false;
    },

    /**
     * Saves the current announcement number they have seen to a user attribute if logged in, otherwise to localStorage
     */
    saveLastPsaSeen: function() {

        // Always store that they have seen it in localStorage. This is useful if they
        // then log out, then the PSA should still stay hidden and not re-show itself
        localStorage.setItem('lastSeenAnnounceNum', psa.currentAnnounceNum);

        // If logged in and completed registration
        if (u_type === 3) {

            // Convert to string because method expects a string
            var currentAnnounceNumStr = String(psa.currentAnnounceNum);

            // Store that they have seen it on the API side
            mega.attr.set('lastPsaSeen', { num: currentAnnounceNumStr }, false, true);
        }
    },

    /**
     * Resize the fmholder and startholder container heights
     * because they depend on the bottom notification height
     */
    resizeFileManagerHeight: function() {

        // If the PSA announcement is currently shown
        if ($('body').hasClass('notification')) {

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
