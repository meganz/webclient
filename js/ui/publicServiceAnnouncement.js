/**
 * This file handles the Public Service Announcements. One announcement will 
 * appear at the bottom of the page in an overlay at a time. The announcements 
 * come from a hard coded list initially. Once a user has seen an announcement 
 * they will mark it as read on the API server.
 */
var psa = {
    
    lastSeenAnnouncementNum: 0,
    currentAnnouncementNum: 0,
    
    /**
     * Show the dialog if they have not seen the announcement yet
     */
    init: function() {
        
        // Only show the announcement if they have not seen the current announcement
        if (this.lastSeenAnnouncementNum < this.currentAnnouncementNum) {
            
            console.log('zzzz showing dialog');
            
            this.prefillAnnouncementDetails();
            this.showAnnouncement();
            this.addCloseButtonHandler();
            this.addMoreInfoButtonHandler();
        }
    },
    
    /**
     * Sets the current announcement number and last seen announcement number
     * @param {Number} currentAnnouncementNum A number sent by the API
     * @param {type} lastSeenAttr A private attribute to be decrypted which contains a number
     */
    setInitialValues: function(currentAnnouncementNum, lastSeenAttr) {
        
        console.log('zzzz currentAnnouncementNum', currentAnnouncementNum);
        console.log('zzzz lastSeenAttr', lastSeenAttr);
        
        // If they have a stored value on the API that contains which 
        // announcement they have seen then decrypt it and set it
        if (lastSeenAttr !== 0) {
            this.lastSeenAnnouncementNum = this.decryptAttribute(lastSeenAttr);
        }
        
        console.log('zzzz currentAnnouncementNum from API', currentAnnouncementNum);
        
        // testing code
        this.lastSeenAnnouncementNum = 0;
        currentAnnouncementNum = 1;
        
        console.log('zzzz currentAnnouncementNum', currentAnnouncementNum);
        console.log('zzzz lastSeenAnnouncementNum', this.lastSeenAnnouncementNum);
        
        // Set the current announcement number
        this.currentAnnouncementNum = currentAnnouncementNum;
    },
    
    /**
     * Shows the announcement
     */
    showAnnouncement: function() {
        
        // Show the PSA
        $('body').addClass('notification');
        
        // Move the file manager up
        psa.resizeFileManagerHeight();
        
        // If the window is resized, change the height again
        $(window).rebind('resize.bottomNotification', function() {
            psa.resizeFileManagerHeight();
        });        
    },
    
    /**
     * Update the details of the announcement depending on the current one
     */
    prefillAnnouncementDetails: function() {
        
        // Current announcement - to be fetched from the CMS in future
        var announcement = {
            title: l[8537],         // Important notice:
            messageA: l[8535],      // Mega will be changing its terms...
            messageB: l[8536],      // Thank you for using MEGA
            buttonText: l[8538],    // View Blog Post
            buttonLink: 'blog_36'   // Blog 36 has more details about the TOS changes
        };
        
        // Replace bold text
        announcement.messageA = announcement.messageA.replace('[B]', '<b>').replace('[/B]', '</b>');
        
        // Populate the details
        var $psa = $('.public-service-anouncement');
        $psa.find('.title').safeHTML(announcement.title);
        $psa.find('.messageA').safeHTML(announcement.messageA);
        $psa.find('.messageB').safeHTML(announcement.messageB);
        $psa.find('.view-more-info').safeHTML(announcement.buttonText);
        $psa.find('.view-more-info').attr('data-continue-link', announcement.buttonLink);
    },
    
    /**
     * Decrypt the private user attribute
     * @param {String} attr A Base64 encoded private attribute as a string
     * @returns {Number} Returns an integer containing the last announcement number they have seen
     */
    decryptAttribute: function(attr) {
        
        // Decode, decrypt, convert from TLV into a JS object, then get the number
        var clearContainer = tlvstore.blockDecrypt(base64urldecode(attr), u_k);
        var decryptedAttr = tlvstore.tlvRecordsToContainer(clearContainer, true);
        var lastSeenAnnouncementNum = parseInt(decryptedAttr.num);
        
        return lastSeenAnnouncementNum;
    },
    
    /**
     * Adds the close button functionality
     */
    addCloseButtonHandler: function() {
          
        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .button.close');
        $('body').on('click', '.public-service-anouncement .button.close', function() {
            
            // Hide the banner
            psa.hideAnnouncement();
            
            // Store that they have seen it on the API side
            mega.attr.set('lastPsaSeen', { num: String(psa.currentAnnouncementNum) }, false, true);        
        });
    },
    
    /**
     * Adds the functionality for the view more info button
     */
    addMoreInfoButtonHandler: function() {
        
        // Use delegated event in case the HTML elements are not loaded yet
        $('body').off('click', '.public-service-anouncement .button.view-more-info');
        $('body').on('click', '.public-service-anouncement .button.view-more-info', function() {
            
            // Hide the banner
            psa.hideAnnouncement();
            
            // Get the page link for this announcement
            var pageLink = $(this).attr('data-continue-link');
            
            // Store that they have seen it on the API side
            var savePromise = mega.attr.set('lastPsaSeen', { num: String(psa.currentAnnouncementNum) }, false, true);
            
            // Redirect to page after save
            savePromise.done(function(result) {
                
                console.log('zzzz promise done result', result);
                
                document.location.hash = pageLink;
            });
        });
    },
    
    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {
        
        // Hide the announcement
        $('body').removeClass('notification');
        $('.fmholder').css('height', '');
        $(window).unbind('resize.bottomNotification');
        
        // Save last seen announcement number for page changes 
        this.lastSeenAnnouncementNum = this.currentAnnouncementNum;
    },
    
    /**
     * Resize the fmholder and startholder container heights 
     * because they depend on the bottom notification height
     */
    resizeFileManagerHeight: function() {
        
        // If the PSA announcement is currently shown
        if ($('body').hasClass('notification')) {
            
            var notificationSize = $('.bottom-info.body').outerHeight();
            var bodyHeight = $('body').outerHeight();
            
            if (notificationSize > 120) {
                $('.fmholder').height(bodyHeight - notificationSize);
            }
        } 
    }
};