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
        
        var request = new XMLHttpRequest();

        request.onload = function() {

            // Parse from JSON
            var serverBuildVersion = JSON.parse(request.response);
            
            // Display information
            firefoxpage.compareLocalToServerBuildVersion(serverBuildVersion);
        };
        request.open('GET', 'https://mega.nz/current_ver.txt');
        request.send();
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
        if ((buildVersion.firefox !== '') && (is_extension) && (ua.indexOf('firefox') > -1)) {
            
            // If the currently loaded version is older than the server build
            if (versionCompare(buildVersion.firefox, serverBuildVersion.firefox) === -1) {
                message = l[7874].replace('%1', buildVersion.firefox).replace('%2', serverBuildVersion.firefox);;
            }
            else {
                // They're using the current version
                message = l[7875].replace('%1', serverBuildVersion.firefox);
            }
        }
        
        // Display on the page
        $('.firefox-version-info').text(message);
    }
};