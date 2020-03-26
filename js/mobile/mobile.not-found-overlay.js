/**
 * Code to show the file not found overlay for when the link was taken down
 */
mobile.notFoundOverlay = {

    /**
     * Initialise the overlay
     */
    show: function(e) {

        'use strict';
        var message = typeof e === 'string' && e;

        // Store the selector
        var $overlay = $('#mobile-ui-notFound');
        var $errorText = $overlay.find('.na-file-txt');
        var $image = $overlay.find('.filetype-img');

        if (parseInt(e) === EARGS) {
            $errorText.text(l[20199]);
            $image.attr('src', mobile.imagePath + 'na.png');
        }
        // If a folder link show 'The folder you are trying to view is no longer available.'
        else if (pfid) {
            $errorText.safeHTML(message || l[16346]);
            $image.attr('src', mobile.imagePath + 'folder.png');
            folderlink = 1; // Trigger FM load home.
        }
        else {
            // Otherwise show "The file you are trying to download is no longer available."
            $errorText.safeHTML(message || l[243]);
            $image.attr('src', mobile.imagePath + 'na.png');
        }

        // Show the overlay
        $overlay.removeClass('hidden').addClass('overlay');
    }
};
