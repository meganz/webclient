/**
 * Shows a custom message e.g. error or success message in a popup overlay
 */
mobile.messageOverlay = {

    /**
     * Shows the error overlay
     * @param {String} firstMessage The main message to be displayed
     * @param {String} optionalSecondMessage An optional second message to be displayed after the first
     * @param {Function} optionalSuccessCallback An optional success callback to be run after they confirm OK
     * @param {Function} optionalFailureCallback An optional failure callback to be run after they click Close
     */
    show: function(firstMessage, optionalSecondMessage, optionalSuccessCallback, optionalFailureCallback) {

        'use strict';

        // Cache selectors
        var $overlay = $('#mobile-ui-error');
        var $firstMessage = $overlay.find('.first-message');
        var $optionalSecondMessage = $overlay.find('.optional-second-message');
        var $fileManagerHolder = $('.mobile .fmholder');

        // Clear old messages
        $firstMessage.text('');
        $optionalSecondMessage.text('');

        // Set the first message
        $firstMessage.text(firstMessage);

        // If there is a second message, set that
        if (typeof optionalSecondMessage !== 'undefined' && optionalSecondMessage !== '') {
            $optionalSecondMessage.safeHTML(optionalSecondMessage);
        }

        // Initialise the OK/close button
        this.initConfirmOkButton($overlay, $fileManagerHolder, optionalSuccessCallback);
        this.initOverlayCloseButton($overlay, $fileManagerHolder, optionalFailureCallback);

        // Show the error overlay and prevent scrolling behind
        $overlay.removeClass('hidden');
        $fileManagerHolder.addClass('no-scroll');
    },

    /**
     * Initialise the OK button to close the error overlay
     * @param {Object} $overlay A cached selector for the error overlay
     * @param {Object} $fileManagerHolder A cached selector for the file manager/My Account block behind the overlay
     * @param {Function} optionalSuccessCallback An optional success callback to be run after they confirm OK
     */
    initConfirmOkButton: function($overlay, $fileManagerHolder, optionalSuccessCallback) {

        'use strict';

        var $okButton = $overlay.find('.confirm-ok-button');

        // Add click/tap handler
        $okButton.off('tap').on('tap', function() {

            // Hide the error overlay
            $overlay.addClass('hidden');
            $fileManagerHolder.removeClass('no-scroll');

            // Remove the loading spinner if on the Login page and came back from an error
            if (page === 'login') {
                $('.mobile.signin-button').removeClass('loading');
            }

            // Run the success callback if requested
            if (typeof optionalSuccessCallback === 'function') {
                optionalSuccessCallback();
            }

            // Prevent clicking behind
            return false;
        });
    },

    /**
     * Initialises the close button on the generic mobile ui error overlay
     * @param {Object} $overlay A cached selector for the error overlay
     * @param {Object} $fileManagerHolder A cached selector for the file manager/My Account block behind the overlay
     * @param {Function} optionalFailureCallback An optional failure callback to be run after they click Close
     */
    initOverlayCloseButton: function($overlay, $fileManagerHolder, optionalFailureCallback) {

        'use strict';

        var $closeButton = $overlay.find('.fm-dialog-close, .text-button.cancel');

        // If the close button is needed, unhide the button
        if (typeof optionalFailureCallback === 'function') {
            $closeButton.removeClass('hidden');
        }
        else {
            // Otherwise set to dummy function
            optionalFailureCallback = function() {};
        }

        // Add tap handler
        $closeButton.off('tap').on('tap', function() {

            // Hide overlay with download button options
            $overlay.addClass('hidden');
            $fileManagerHolder.removeClass('no-scroll');

            // Run the callback
            optionalFailureCallback();

            return false;
        });
    }
};
