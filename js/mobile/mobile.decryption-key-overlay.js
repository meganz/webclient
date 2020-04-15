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
        this.initDecryptButton($overlay, publicHandle, folderLink);

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
    },

    /**
     * Initialise the Decrypt button to get the entered key and redirect to the full link with key
     * @param {Object} $overlay The jQuery selector for the overlay
     * @param {String} publicHandle The public file/folder handle
     * @param {Boolean} folderLink If this was a folder link
     */
    initDecryptButton: function($overlay, publicHandle, folderLink) {

        'use strict';

        var $decryptionKeyField = $overlay.find('.decryption-key');
        var $decryptButton = $overlay.find('.decrypt-button');

        // Add click/tap handler
        $decryptButton.off('tap').on('tap', function() {

            // Trim the input from the user for whitespace, newlines etc on either end
            var decryptionKey = $.trim($decryptionKeyField.val());

            // If they entered something
            if (decryptionKey) {
                if (mega.flags.nlfe) {
                    decryptionKey = decryptionKey.replace('#', '');
                    var dest = ((folderLink) ? '/folder/' : '/file/') +
                        publicHandle + '#' + decryptionKey;
                    page = '';
                    loadSubPage(dest);
                }
                else {
                    // Remove the ! from the key which is exported from the export dialog
                    decryptionKey = decryptionKey.replace('!', '');

                    // Reconstruct the URL
                    var urlStart = folderLink ? 'F!' : '!';
                    var newHash = urlStart + publicHandle + '!' + decryptionKey;

                    // Redirect to the hash URL (loadSubPage does not work here)
                    document.location.hash = '#' + newHash;
                }
            }

            // Prevent clicking behind
            return false;
        });
    }
};
