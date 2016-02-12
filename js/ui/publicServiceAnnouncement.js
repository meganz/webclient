/**
 * This file handles the Public Service Announcements. One announcement will 
 * appear at the bottom of the page in an overlay at a time. The announcements 
 * come from a hard coded list initially. Once a user has seen an announcement 
 * they will mark it as read on the API server.
 */
var psa = {
    
    /** What the last announcement was that the user has seen */
    lastSeenAnnounceNum: 0,
    
    /** What the current announcement is from the API */
    currentAnnounceNum: 0,
    
    /** If the PSA is currently being shown */
    visible: false,
    
    /**
     * Show the dialog if they have not seen the announcement yet
     */
    init: function() {
                
        // If logged in and completed registration fully, show a Public Service Announcement.
        // Only show the announcement if they have not seen the current announcement
        if ((u_type === 3) && (page.indexOf('pro') === -1) && (this.lastSeenAnnounceNum < this.currentAnnounceNum)) {
            
            // Show the announcement
            this.prefillAnnouncementDetails();
            this.addCloseButtonHandler();
            this.addMoreInfoButtonHandler();
            this.showAnnouncement();
        }
        
        // Otherwise if the PSA is currently visible, then hide it. This prevents bug after seeing an announcement and 
        // immediately visiting the #pro page which would show the raised file manager with whitespace underneath.
        else if (psa.visible) {
            psa.hideAnnouncement();
        }
    },
    
    /**
     * Sets the current announcement number and last seen announcement number
     * @param {Number} currentAnnounceNum A number sent by the API
     * @param {type} lastSeenAttr A private attribute to be decrypted which contains a number
     */
    setInitialValues: function(currentAnnounceNum, lastSeenAttr) {
                
        // If they have a stored value on the API that contains which 
        // announcement they have seen then decrypt it and set it
        if (lastSeenAttr !== 0) {
            this.lastSeenAnnounceNum = this.decryptAttribute(lastSeenAttr);
        }
        
        // Set the current announcement number
        this.currentAnnounceNum = currentAnnounceNum;
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
        
        // Currently being shown
        psa.visible = true;
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
        $psa.find('.view-more-info').attr('data-continue-link', htmlentities(announcement.buttonLink));
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
        var lastSeenAnnounceNum = parseInt(decryptedAttr.num);
        
        return lastSeenAnnounceNum;
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
            mega.attr.set('lastPsaSeen', { num: String(psa.currentAnnounceNum) }, false, true);        
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
            var savePromise = mega.attr.set('lastPsaSeen', { num: String(psa.currentAnnounceNum) }, false, true);
            
            // Redirect to page after save
            savePromise.done(function(result) {
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
        this.lastSeenAnnounceNum = this.currentAnnounceNum;
        
        // No longer visible
        psa.visible = false;
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