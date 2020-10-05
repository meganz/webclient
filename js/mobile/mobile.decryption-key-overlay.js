/**
 * Shows the decryption key overlay, the user enters the decryption key then they can download the file/view the folder
 */
mobile.decryptionKeyOverlay = {

    /**
     * Initialise and show the overlay
     * @param {String} publicHandle The public file/folder handle
     * @param {Boolean} folderLink If this was a folder link
     * @param {Boolean} previousKeyIncorrect If the previous attempt was incorrect
     */
    show: function(publicHandle, folderLink, previousKeyIncorrect) {

        'use strict';

        var $overlay = $('#mobile-decryption-key-overlay');
        var $initialMessage = $('.initial-message');
        var $errorMessage = $('.error-message');

        // Initialise the Decrypt button
        mKeyDialog(publicHandle, folderLink, previousKeyIncorrect);

        // If the previous folder key was incorrect, show an error message for them to try again
        if (previousKeyIncorrect) {
            $initialMessage.addClass('hidden');
            $errorMessage.removeClass('hidden');
        }
        else {
            // Show first message
            $initialMessage.removeClass('hidden');
            $errorMessage.addClass('hidden');
        }

        // Show the overlay
        $overlay.removeClass('hidden');
    }
};
