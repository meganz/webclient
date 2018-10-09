/*
 * Functionality for the General Data Protection Regulation (GDPR) Disclosure page
 */
var gdpr = {

    /** A flag to see if we've already visited the page this session */
    pageVistedBefore: false,

    /**
     * Initialise the functionality
     */
    init: function() {

        'use strict';

        // Cache selectors
        var $page = $('.data-protection');
        var $buttonContainer = $page.find('.download-container');
        var $infoForNotLoggedInUsers = $page.find('.not-logged-in');
        var $infoForLoggedInUsers = $page.find('.logged-in');

        // If the user is logged in and fully registered
        if (typeof u_type !== 'undefined' && u_type > 2) {

            // Show the download section and the paragraph/s specific for logged in users
            $buttonContainer.removeClass('hidden');
            $infoForLoggedInUsers.removeClass('hidden');

            // Initialise the Download button
            gdprDownload.initDownloadDataButton('data-protection');
        }
        else {
            // Hide the download section and show the paragraph/s specific for not logged in users
            $buttonContainer.addClass('hidden');
            $infoForNotLoggedInUsers.removeClass('hidden');
        }

        // If the page hasn't been visited before this session
        if (!gdpr.pageVistedBefore) {

            // Log to the stats server
            api_req({ a: 'log', e: 99691, m: 'GDPR page visited' });

            // Set the flag
            gdpr.pageVistedBefore = true;
        }
    }
};
