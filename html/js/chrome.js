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
            
            // Change button state to show different versions
            $downloadButton.css('cursor', 'default');
            $downloadButton.find('.initial-state').hide();
            $downloadButton.find('.actual-links').show();
            
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
     * Get what build version is currently available from mega.nz live site
     */
    getServerBuildVersion: function() {
        
        var xhr = getxhr();
        
        // Fetch the latest current_ver.txt
        xhr.open('GET', 'https://mega.nz/current_ver.txt?time=' + unixtime());
        xhr.onreadystatechange = function() {
            
            // If done
            if (this.readyState === 4) {
                
                // Parse from JSON
                var serverBuildVersion = JSON.parse(xhr.responseText);
                
                // Display information
                chromepage.compareLocalToServerBuildVersion(serverBuildVersion);
            }
        };        
        xhr.send();
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
        if ((buildVersion.chrome !== '') && (is_extension) && (ua.indexOf('chrome') > -1)) {
            
            // If the currently loaded version is older than the server build
            if (versionCompare(buildVersion.chrome, serverBuildVersion.chrome) === -1) {
                message = l[7874].replace('%1', buildVersion.chrome).replace('%2', serverBuildVersion.chrome);
            }
            else {
                // They're using the current version
                message = l[7875].replace('%1', serverBuildVersion.chrome);
            }
        }
        
        // Display on the page
        $('.chrome-version-info').text(message);
    }
};