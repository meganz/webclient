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
        
        $.ajax({
            dataType: 'json',
            jsonp: false,
            url: 'https://mega.nz/current_ver.txt'
        })
        .done(function(result) {
            firefoxpage.compareLocalToServerBuildVersion(result);
        });
    },
    
    /**
     * Compare the current build version in memory to the one on the server
     * @param {Object} serverBuildVersion Object with keys: 'website', 'chrome', 'firefox', 'commit', 
     *                                    'timestamp', 'dateTime'
     */
    compareLocalToServerBuildVersion: function(serverBuildVersion) {
        
        // Default message shown if the Firefox extension is not installed
        var message = 'Download the extension (v' + serverBuildVersion.firefox + ') below.';
                
        // If current build information is available (not in development) and currently using the Firefox extension
        if ((buildVersion.firefox !== '') && (is_extension) && (ua.indexOf('firefox') > -1)) {
            
            // If the currently loaded version is older than the server build
            if (versionCompare(buildVersion.firefox, serverBuildVersion.firefox) === -1) {
                message = 'Looks like your current extension (v' + buildVersion.firefox + ') is out of date. Download the latest (v' + serverBuildVersion.firefox + ') below.';
            }
            else {
                // Congrats, you're using the current version
                message = 'Your extension (v' + serverBuildVersion.firefox + ') is up to date.';
            }
        }
        
        // Display on the page
        $('.firefox-version-info').text(message);
    }
};