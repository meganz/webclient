/**
 * Functionality for the mobile Get Support page
 */
mobile.support = {

    /** The minimum acceptable message length to prevent short spam messages going to support */
    minimumMessageLength: 30,

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

        // Init functionality
        mobile.support.initMessageKeyup($page);
        mobile.support.initSendMessageButton($page);

        // Show the page
        $page.removeClass('hidden');
    },

    /**
     * Initialise the functionality for when the user is typing into the support enquiry message text area
     * @param {Object} $page jQuery object for the page
     */
    initMessageKeyup: function($page) {

        'use strict';

        // Cache selectors
        var $supportEnquiryMessage = $page.find('.support-text-field');
        var $sendButton = $page.find('.send-support-message-button');

        // On keyup or clicking out of the text area
        $supportEnquiryMessage.off('keyup blur').on('keyup blur', function() {

            // Trim whitespace from the ends of the email entered
            var queryMessage = $supportEnquiryMessage.val();
            var queryMessageTrimmed = $.trim(queryMessage);

            // If the message length is below the minimum, grey out the button so it appears unclickable
            if (queryMessageTrimmed.length < mobile.support.minimumMessageLength) {
                $sendButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $sendButton.addClass('active');
            }
        });
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
        $sendButton.off('tap').on('tap', function() {

            // Get the message and type
            var enquiryMessage = $supportEnquiryMessage.val();
            var enquiryMessageTrimmed = $.trim(enquiryMessage);
            var enquiryType = $supportTypeDropdown.val();
            var enquiryTypeInt = parseInt(enquiryType);

            // If the message length is below the minimum, don't do anything
            if (enquiryMessageTrimmed.length < mobile.support.minimumMessageLength) {
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
                        mobile.messageOverlay.show(l[7882], l[7881], function() {
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
