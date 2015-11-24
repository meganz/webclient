/**
 * Functionality for the Chrome extension page (#chrome)
 */
var chromepage = {
    
    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        chromepage.initManualDownloadButton();
        chromepage.fixHeightOfBottomBlocks();
        chromepage.getServerBuildVersion();
    },
    
    /**
     * Change button text when clicked to show the different versions available
     */
    initManualDownloadButton: function() {
        
        var $downloadButton = $('.chrome-download-button');
        
        // On manual download button click, hide the button text and show the mega.co.nz and mega.nz links
        $('.chrome-download-button').rebind('click', function() {            
            $downloadButton.css('cursor', 'default');
            $downloadButton.find('.initial-state').hide();
            $downloadButton.find('.actual-links').show();
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
     * Get what build version is currently available from mega.nz live site
     */
    getServerBuildVersion: function() {
        
        $.ajax({
            dataType: 'json',
            jsonp: false,
            url: 'https://mega.nz/current_ver.txt'
        })
        .done(function(result) {
            chromepage.compareLocalToServerBuildVersion(result);
        });
    },
    
    /**
     * Compare the current build version in memory to the one on the server
     * @param {Object} serverBuildVersion Object with keys: 'website', 'chrome', 'firefox', 'commit', 
     *                                    'timestamp', 'dateTime'
     */
    compareLocalToServerBuildVersion: function(serverBuildVersion) {
        
        // Default message shown if the Chrome extension is not installed
        var message = 'Download the extension (v' + serverBuildVersion.chrome + ') below.';
                
        // If current build information is available (not in development) and currently using the Chrome extension
        if ((buildVersion.chrome !== '') && (is_extension) && (ua.indexOf('chrome') > -1)) {
            
            // If the currently loaded version is older than the server build
            if (versionCompare(buildVersion.chrome, serverBuildVersion.chrome) === -1) {
                message = 'Looks like your current extension (v' + buildVersion.chrome + ') is out of date. Download the latest (v' + serverBuildVersion.chrome + ') below.';
            }
            else {
                // Congrats, you're using the current version
                message = 'Your extension (v' + serverBuildVersion.chrome + ') is up to date.';
            }
        }
        
        // Display on the page
        $('.chrome-version-info').text(message);
    }
};