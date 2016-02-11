/**
 * This file handles the Public Service Announcements. One announcement will 
 * appear at the bottom of the page in an overlay at a time. The announcements 
 * come from a hard coded list initially. Once a user has seen an announcement 
 * they will mark it as read on the API server.
 */
var psa = {
    
    $psaContainer: null,
    currentAnnouncementNum: 0,
    psaClass: '',
    privateAttr: 0,
    
    init: function() {
             
        this.$psaContainer = $('.public-service-anouncement');
        
        var myLastSeenAnnouncementNum = this.privateAttr !== 0 ? this.decryptAttr(this.privateAttr) : 0;
          myLastSeenAnnouncementNum = 0;
        
        if (myLastSeenAnnouncementNum < this.currentAnnouncementNum) {
            
            this.showAnnouncement();
            this.addCloseButtonHandler();
        }
    },
    
    setInitialValues: function(currentAnnouncementNum, privateAttr) {
        this.currentAnnouncementNum = currentAnnouncementNum; 
        this.privateAttr = privateAttr;
    },
    
    /**
     * Shows the announcement
     */
    showAnnouncement: function() {
            
        this.psaClass = 'notification';
        
        // Show the PSA
        $('body').addClass('notification');
        
        // Move the file manager up
        psa.resizeFileManagerHeight();
        
        // If the window is resized, change the height again
        $(window).rebind('resize.bottomNotification', function() {
            psa.resizeFileManagerHeight();
        });        
    },
    
    decryptAttr: function(attr) {
        var clearContainer = tlvstore.blockDecrypt(base64urldecode(attr), u_k);
        attr = tlvstore.tlvRecordsToContainer(clearContainer, true);
        
        return parseInt(attr.num);
    },
    
    addCloseButtonHandler: function() {
        console.log("andre say hi");
        psa.$psaContainer.find('.bottom-info.button.close').rebind('click', function() {            
            
            console.log('hi there');
            psa.hideAnnouncement();
            
            // Store on API side
            mega.attr.set('lastPsaSeen', { "num": ""+psa.currentAnnouncementNum }, false, true);        
        });
    },
    
    addMoreInfoButtonHandler: function() {
        
        psa.$psaContainer.find('.bottom-info.button.red').rebind('click', function() {            
            psa.hideAnnouncement();
            
            // Store on API side
            mega.attr.set('lastPsaSeen', { "num": ""+psa.currentAnnouncementNum }, false, true);
            
            // Redirect to page
            location.href = '#blog_36';
        });
    },
    
    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {
        
        $('body').removeClass('notification');
        $('.fmholder').css('height', '');
        $(window).unbind('resize.bottomNotification');
    },
    
    /*
    // Bottom notification init
    notificationInit: function() {
        if (!localStorage.hidenotification) {
            $('body').addClass('notification');
            psa.resizeContainerHeights();
            $(window).rebind('resize.bottomNotification', function () {
                psa.resizeContainerHeights();
            });
            $('.bottom-info.button').rebind('click', function () {
                $('body').removeClass('notification');
                $('.fmholder').css('height', '');
                localStorage.hidenotification = 1;
                $(window).trigger('resize');

                if ($(this).hasClass('terms')) {
                    document.location.hash = 'terms';
                }
            });
        }
    },*/
    
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