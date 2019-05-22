/**
 * Functionality for the Browsers extension page (#browsers)
 */
var browserspage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        browserspage.getServerBuildVersion();
        browserspage.initChromeWebstoreDownloadButton();
    },

    /**
     * Get what firefox build version is currently available from the live site
     */
    getServerBuildVersion: function() {

        'use strict';

        // Use a timestamp query param to break cache otherwise subsequent visits to the page don't show a new update
        var updateURL = mega.updateURL + '?time=' + unixtime();

        // Fetch the latest current_ver.txt
        M.xhr(updateURL)
            .done(function(ev, data) {
                var serverBuildVersion = null;
                var chromeFileSize = null;
                var firefoxFileSize = null;

                // Try parsing version info
                try {
                    // Convert from JSON then get the size of the Chrome and Firefox extensions
                    serverBuildVersion = JSON.parse(data);
                    chromeFileSize = numOfBytes(serverBuildVersion.chromeSize, 1);
                    firefoxFileSize = numOfBytes(serverBuildVersion.firefoxSize, 1);
                }
                catch (ex) {}

                // Display information if data was returned
                if (serverBuildVersion) {

                    // Update the Chrome version and file size information
                    $('.browsers.chrome .version').text(serverBuildVersion.chrome);
                    $('.browsers.chrome .size').text(chromeFileSize.size + ' ' + chromeFileSize.unit);

                    // Update the Firefox version and file size information
                    $('.browsers.firefox .version').text(serverBuildVersion.firefox);
                    $('.browsers.firefox .size').text(firefoxFileSize.size + ' ' + firefoxFileSize.unit);
                }
            });
    },

    /**
     * Add warning rollover and log for Chrome webstore clicks
     */
    initChromeWebstoreDownloadButton: function() {

        var $webstoreButton = $('.browsers.download-info.transition.chrome');

        // Log that they downloaded via the webstore link
        $webstoreButton.click(function() {
            api_req({ a: 'log', e: 99604, m: 'Downloaded Chrome ext via webstore link' });
        });
    }
};