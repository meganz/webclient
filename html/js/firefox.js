/**
 * Functionality for the Firefox extension page (#firefox)
 */
var firefoxpage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        firefoxpage.getServerBuildVersion();
    },

    /**
     * Change style of Firefox Extension page on download button rollover
     */
    addHoverToDownloadButton: function() {

        var $downloadButton = $('.ff-bott-button');
        var $firefoxIcon = $('.ff-icon');

        $downloadButton.rebind('mouseover', function () {
            $firefoxIcon.addClass('hovered');
        });

        $downloadButton.rebind('mouseout', function () {
            $firefoxIcon.removeClass('hovered');
        });
    },

    /**
     * Get what build version is currently available from mega.nz live site
     */
    getServerBuildVersion: function() {

        var updateURL = is_chrome_firefox
            ? mozMEGAExtensionUpdateURL
            : mega.updateURL;

        // Fetch the latest current_ver.txt
        mega.utils.xhr(updateURL)
            .done(function(ev, data) {
                var serverBuildVersion;

                // Parse version info
                if (is_chrome_firefox) {
                    var version = String(data).match(/NS1:version="([\d.]+)"/);

                    if (version) {
                        serverBuildVersion = { firefox: version.pop() };
                    }
                }
                else {
                    try {
                        serverBuildVersion = JSON.parse(data);
                    }
                    catch (ex) {}
                }

                if (serverBuildVersion) {
                    // Display information
                    firefoxpage.compareLocalToServerBuildVersion(serverBuildVersion);
                }
            });
    },

    /**
     * Compare the current build version in memory to the one on the server
     * @param {Object} serverBuildVersion Object with keys: 'website', 'chrome', 'firefox', 'commit',
     *                                    'timestamp', 'dateTime'
     */
    compareLocalToServerBuildVersion: function(serverBuildVersion) {

        // Default message shown if the Firefox extension is not installed
        var message = l[7873].replace('%1', serverBuildVersion.firefox);

        // If current build information is available (not in development) and currently using the Firefox extension
        if (is_chrome_firefox) {

            // If the currently loaded version is older than the server build
            if (Services.vc.compare(mozMEGAExtensionVersion, serverBuildVersion.firefox) < 0) {
                message = l[7874].replace('%1', mozMEGAExtensionVersion).replace('%2', serverBuildVersion.firefox);
            }
            else {
                // They're using the current version
                message = l[7875].replace('%1', mozMEGAExtensionVersion);
            }
        }

        // Display on the page
        $('.firefox-version-info').text(message);
    }
};
