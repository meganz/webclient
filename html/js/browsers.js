/**
 * Functionality for the Browsers extension page (#browsers)
 */
var browserspage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        browserspage.getServerBuildVersion();
        browserspage.initChromeManualDownloadButton();
        browserspage.initChromeWebstoreDownloadButton();
    },

    /**
     * Get what firefox build version is currently available from the live site
     */
    getServerBuildVersion: function() {

        // Use update.rdf URL if in Firefox, or use the static path. Also use a timestamp query param
        // to break browser cache. Otherwise subsequent visits to the page don't show a new update.
        var updateURL = (is_chrome_firefox) ?
            mozMEGAExtensionUpdateURL + '&time=' + unixtime() :
            mega.updateURL + '?time=' + unixtime();

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
    },

    /**
     * Change button text when clicked to show the different versions available
     */
    initChromeManualDownloadButton: function() {

        var $downloadButton = $('.default-56px-button.extension, .browsers.icon.cloud');

        // On manual download button click, hide the button text and show the mega.co.nz and mega.nz links
        $('.chrome-download-button').rebind('click', function() {

            // Log that they downloaded via the manual link
            api_req({ a: 'log', e: 99605, m: 'Downloaded Chrome ext via manual link' });
        });

    }

};