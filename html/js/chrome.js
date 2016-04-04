/**
 * Functionality for the Chrome extension page (#chrome)
 */
var chromepage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        chromepage.initManualDownloadButton();
        chromepage.initWebstoreDownloadButton();
        chromepage.fixHeightOfBottomBlocks();
        chromepage.getServerBuildVersion();
    },

    /**
     * Add warning rollover and log for Chrome webstore clicks
     */
    initWebstoreDownloadButton: function() {

        var $webstoreButton = $('.chrome-app-button');
        var $warningText = $('.chrome-warning');

        // Show warning in red background
        $webstoreButton.mouseover(function() {
            $warningText.addClass('chrome-warning-hover');
        });

        // Hide warning background
        $webstoreButton.mouseout(function() {
            $warningText.removeClass('chrome-warning-hover');
        });

        // Log that they downloaded via the webstore link
        $webstoreButton.click(function() {
            api_req({ a: 'log', e: 99604, m: 'Downloaded Chrome ext via webstore link' });
        });
    },

    /**
     * Change button text when clicked to show the different versions available
     */
    initManualDownloadButton: function() {

        var $downloadButton = $('.chrome-download-button');

        // On manual download button click, hide the button text and show the mega.co.nz and mega.nz links
        $('.chrome-download-button').rebind('click', function() {

            // Log that they downloaded via the manual link
            api_req({ a: 'log', e: 99605, m: 'Downloaded Chrome ext via manual link' });
        });

        // Fix font size for different languages
        if (lang !== 'en') {
            $downloadButton.find('.actual-links > a').css('font-size', '12px');
        }
    },

    /**
     * Set all the bottom blocks for the manual installation to the same height
     */
    fixHeightOfBottomBlocks: function() {

        var highestBlock = 0;
        var $bottomBlock = $('.chrome-bottom-block');

        // Find the highest block
        $bottomBlock.each(function(index, element) {
            if ($(element).height() > highestBlock) {
                highestBlock = $(element).height();
            }
        });

        // Set all to the same height
        $bottomBlock.height(highestBlock);
    },

    /**
     * Get what build version is currently available from the live site
     */
    getServerBuildVersion: function() {

        // Fetch the latest current_ver.txt
        mega.utils.xhr(mega.updateURL + '?time=' + unixtime())
            .done(function(ev, data) {
                var serverBuildVersion = null;

                // Parse version info
                try {
                    serverBuildVersion = JSON.parse(data);
                }
                catch (ex) {}

                // Display information if data was returned
                if (serverBuildVersion) {
                    chromepage.compareLocalToServerBuildVersion(serverBuildVersion);
                }
            });
    },

    /**
     * Compare the current build version in memory to the one on the server
     * @param {Object} serverBuildVersion Object with keys: 'website', 'chrome', 'firefox', 'commit',
     *                                    'timestamp', 'dateTime'
     */
    compareLocalToServerBuildVersion: function(serverBuildVersion) {

        // Default message shown if the Chrome extension is not installed
        var message = l[7873].replace('%1', serverBuildVersion.chrome);

        // If current build information is available (not in development) and currently using the Chrome extension
        if (buildVersion.chrome && is_extension && window.chrome) {
            var local = mega.utils.vtol(buildVersion.chrome);
            var remote = mega.utils.vtol(serverBuildVersion.chrome);

            // If the currently loaded version is older than the server build
            if (local < remote) {
                message = l[7874].replace('%1', buildVersion.chrome).replace('%2', serverBuildVersion.chrome);
            }
            else {
                // They're using the current version
                message = l[7875].replace('%1', buildVersion.chrome);
            }
        }

        // Display on the page
        $('.chrome-version-info').text(message);
    }
};
