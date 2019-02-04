/*
 * Functionality for the General Data Protection Regulation (GDPR) data download functionality
 * Used on the /gdpr page and the /fm/account/security page
 */
var gdprDownload = {

    /** Cached data from the API request */
    cachedData: null,

    /**
     * Initialise the Download button to fetch the user's account data from the API as a zip file
     * @param {String} containerClass The class name of the current page/container where the download button is
     */
    initDownloadDataButton: function(containerClass) {

        'use strict';

        // Cache selectors
        var $container = $('.' + containerClass);
        var $downloadButton = $container.find('.download-button');
        var $errorMessage = $container.find('.error-message');

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
            if (gdprDownload.cachedData !== null) {

                // Re-download the data without making an additional API request
                gdprDownload.startDownload(gdprDownload.cachedData);
                return false;
            }

            // Show the loading spinner
            $downloadButton.addClass('loading');

            // Fetch the account data from the API as a Base64 string
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
                    gdprDownload.cachedData = result;

                    // Trigger the download
                    gdprDownload.startDownload(result);
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

        // Convert from Base64 to chars
        var byteChars = atob(base64data);
        var byteNums = [];

        // Convert chars to an array of byte numbers
        for (var i = 0; i < byteChars.length; i++) {
            byteNums[i] = byteChars.charCodeAt(i);
        }

        // Convert to a typed array
        var byteArray = new Uint8Array(byteNums);

        // Prompt the save file dialog
        M.saveAs(byteArray, 'gdpr-data.zip');
    }
};
