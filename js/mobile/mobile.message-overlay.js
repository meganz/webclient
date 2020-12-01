/**
 * Shows a custom message e.g. error or success message in a popup overlay
 */
mobile.messageOverlay = {

    /**
     * Shows the error overlay
     * @param {String} message The main message to be displayed
     * @param {String} [subMessage] An optional second message to be displayed after the first
     * @param {Function} [onSuccess] An optional success callback to be run after they confirm OK
     * @param {Function} [onFailure] An optional failure callback to be run after they click Close
     * @param {String} [icon] An optional class name to show an icon, empty-icon classes can be found in mobile.css
     * @param {String} [buttons] An optional second button in place of text-link close
     */
    show: function(message, subMessage, onSuccess, onFailure, icon, buttons) {
        'use strict';

        // Cache selectors
        var $overlay = $('#mobile-ui-error');
        var $firstMessage = $overlay.find('.first-message');
        var $optionalSecondMessage = $overlay.find('.optional-second-message');
        var $iconElement = $('.mobile.empty-icon', $overlay).attr('class', 'mobile empty-icon hidden');
        var $buttons = $('.buttons', $overlay).removeClass('inline-buttons');
        var $fileManagerHolder = $('.mobile .fmholder');
        var promise = new MegaPromise();
        var reject = function() {
            // Hide overlay with download button options
            $overlay.addClass('hidden');
            $fileManagerHolder.removeClass('no-scroll');

            // Run the callback
            if (typeof onFailure === 'function') {
                onFailure();
            }

            onIdle(function() {
                promise.reject();
            });
            return false;
        };

        $('input').blur();

        if (typeof onSuccess === 'string') {
            icon = onSuccess;
            onSuccess = null;
        }
        if (!buttons && typeof onFailure !== 'function') {
            buttons = onFailure;
            onFailure = null;
        }

        // Clear old messages
        $firstMessage.empty();
        $optionalSecondMessage.empty();
        $('.third span', $overlay).text(l[148]);

        // If the close button is needed, unhide the button
        var $closeButton = $overlay.find('.fm-dialog-close, .text-button.cancel');
        if (typeof onFailure === 'function') {
            $closeButton.removeClass('hidden');
        }

        // Add tap handler
        $closeButton.rebind('tap', reject);

        // Set the first message
        $firstMessage.safeHTML(message);

        // If there is a second message, set that
        if (typeof subMessage === 'string' && subMessage.length) {
            $optionalSecondMessage.safeHTML(subMessage);
        }

        // set image icon, if any
        if (icon) {
            $iconElement.removeClass('hidden').addClass(icon);
        }

        // set additional button, if any
        if (buttons) {
            var okButton = l[1596];
            var cancelButton = buttons;
            if (Array.isArray(buttons)) {
                okButton = buttons[1];
                cancelButton = buttons[0];
            }
            $('.text-button.cancel', $overlay).addClass('hidden');

            $buttons.addClass('inline-buttons')
                .find('.first').removeClass('red-button').addClass('green-button').text(okButton).end()
                .find('.second').removeClass('hidden').rebind('tap', reject).find('span').text(cancelButton);
        }
        else {
            $buttons.removeClass('inline-buttons')
                .find('.first').addClass('red-button').removeClass('green-button').text(l[1596]).end()
                .find('.second').addClass('hidden');
        }

        // Show the error overlay and prevent scrolling behind
        $overlay.removeClass('hidden');
        $fileManagerHolder.addClass('no-scroll');

        mobile.initOverlayPopstateHandler($overlay);

        // Initialise the OK/close button
        $('.confirm-ok-button', $overlay).rebind('tap.ok', function() {

            // Hide the error overlay
            $overlay.addClass('hidden');
            $fileManagerHolder.removeClass('no-scroll');

            // Remove the loading spinner if on the Login page and came back from an error
            if (page === 'login') {
                $('.mobile.signin-button').removeClass('loading');
            }

            // Run the success callback if requested
            if (typeof onSuccess === 'function') {
                onSuccess();
            }

            onIdle(function() {
                promise.resolve();
            });

            // Prevent clicking behind
            return false;
        });

        return promise;
    }
};
