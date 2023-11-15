/**
 * Functionality for the mobile Get Support page
 */
mobile.support = {

    /**
     * Initialise functionality
     */
    init: function() {

        'use strict';

        // Check the user is logged in or redirect them to Login page
        if (checkUserLogin()) {
            return false;
        }

        var $page = $('.mobile.get-support');
        this.minimumMessageLength = 30;

        // Init functionality
        MegaMobileHeader.init(true);
        mega.ui.topmenu.toggleActive();
        this.initSendMessageButton($page);

        // Show the page
        $page.removeClass('hidden');
    },

    /**
     * Initialise the button to send the support enquiry message
     * @param {Object} $page jQuery object for the page
     */
    initSendMessageButton: function($page) {

        'use strict';

        // Cache selectors
        var $sendButton = $page.find('.send-support-message-button');
        var $supportTypeDropdown = $page.find('.support-type-dropdown');
        var $supportEnquiryMessage = $page.find('.support-text-field');

        // On clicking/tapping the Send button
        $sendButton.rebind('tap', () => {

            // Get the message and type
            var enquiryMessage = $supportEnquiryMessage.val();
            var enquiryMessageTrimmed = $.trim(enquiryMessage);
            var enquiryType = $supportTypeDropdown.val();
            var enquiryTypeInt = parseInt(enquiryType);

            // If the message length is below the minimum, don't do anything
            if (enquiryMessageTrimmed.length < this.minimumMessageLength) {
                msgDialog(
                    'warninga',
                    l[7884], // Message too short
                    l[8650] // Your message needs to be at least %d letters long.
                );
                return false;
            }

            // Prepare API request
            var requestOptions = {
                a: 'sse',                   // Send Support Email API request
                m: enquiryMessageTrimmed,   // The support query message
                t: enquiryTypeInt           // The type of support message (must be an integer)
            };

            // Send the support query message
            api_req(requestOptions, {
                callback: function(response) {

                    // If successful
                    if (response === 0) {

                        // If they click OK on the confirm dialog, load the cloud drive
                        mobile.messageOverlay.show(l[7882], l[7881]).then(() => {
                            loadSubPage('fm');
                        });
                    }
                    else {
                        // Otherwise show an error message in a toast notification
                        mobile.showToast(l[7883]);
                    }
                }
            });
        });
    }
};
