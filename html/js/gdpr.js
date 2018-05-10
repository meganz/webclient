/*
 * Functionality for the General Data Protection Regulation (GDPR) Disclosure page
 */
var gdpr = {

    /** Cached data from the API request */
    cachedData: null,

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
            gdpr.initDownloadDataButton($page);
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
    },

    /**
     * Initialise the Download button to fetch the user's account data from the API as a zip file
     */
    initDownloadDataButton: function() {

        'use strict';

        // Cache selectors
        var $page = $('.data-protection');
        var $downloadButton = $page.find('.download-button');
        var $errorMessage = $page.find('.error-message');

        // On Download button click
        $downloadButton.off().on('click', function() {

            // Show an error message for iOS users because the download will not work for them
            if (is_ios) {
                $errorMessage.removeClass('hidden').text(l[18496]);
                return false;
            }

            // Show an error for IE or Edge users that the download will not work in this browser
            if (is_microsoft) {
                $errorMessage.removeClass('hidden').text(l[9065]);
                return false;
            }

            // Prevent double clicks/taps from firing multiple requests
            if ($downloadButton.hasClass('loading')) {
                return false;
            }

            // If the results are already fetched
            if (gdpr.cachedData !== null) {

                // Re-download the data without making an additional API request
                gdpr.startDownload(gdpr.cachedData);
                return false;
            }

            // Show the loading spinner
            $downloadButton.addClass('loading');

            // Fetch the account data from the API
            api_req({ a: 'gdpr' }, {
                callback: function(result) {

                    // Hide the loading spinner
                    $downloadButton.removeClass('loading');

                    // Check for error because they fetched too many times
                    if (typeof result === 'number' && result === ETEMPUNAVAIL) {
                        $errorMessage.removeClass('hidden').text(l[253]);
                        return false;
                    }

                    // Check for generic error
                    else if (typeof result === 'number' && result < 0) {
                        $errorMessage.removeClass('hidden').text(l[47] + ' ' + l[135] + ': ' + result);
                        return false;
                    }

                    // Cache the results to prevent the API repeating the intensive collection work
                    gdpr.cachedData = result;

                    // Trigger the download
                    gdpr.startDownload(result);
                }
            });
        });
    },

    /**
     * Starts the file download for the user
     * @param {String} base64data The data from the API as a Base64 string
     */
    startDownload: function(base64data) {

        'use strict';

        // Cache selectors
        var $page = $('.data-protection');
        var $hiddenDownloadLink = $page.find('.download-link');

        // Update the hidden <a> tag with the Base64 data from the API then trigger the native JS click
        $hiddenDownloadLink
            .attr('download', 'gdpr-data.zip')
            .attr('href', 'data:application/zip;charset=utf-8;base64,' + base64data)
            .get(0).click();
    }
};
