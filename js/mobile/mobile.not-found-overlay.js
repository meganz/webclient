/**
 * Code to show the file not found overlay for when the link was taken down
 */
mobile.notFoundOverlay = {

    /**
     * Initialise the overlay
     */
    show: function() {

        'use strict';

        // Store the selector
        var $overlay = $('#mobile-ui-notFound');
        var $errorText = $overlay.find('.na-file-txt');
        var $image = $overlay.find('.filetype-img');

        // If a folder link show 'The folder you are trying to view is no longer available.'
        if (pfid) {
            $errorText.text(l[16346]);
            $image.attr('src', mobile.imagePath + 'folder.png');
        }
        else {
            // Otherwise show "The file you are trying to download is no longer available."
            $errorText.text(l[243]);
            $image.attr('src', mobile.imagePath + 'na.png');
        }

        // Show the overlay
        $overlay.removeClass('hidden').addClass('overlay');
    }
};
