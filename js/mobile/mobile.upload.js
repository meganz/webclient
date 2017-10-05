/**
 * File upload functionality (currently incomplete)
 */
mobile.upload = {

    /**
     * Initialise the upload button
     */
    initUploadButton: function() {

        'use strict';

        var $fileInput = $('#select-file');
        var $uploadIcon = $('.mobile.fm-icon.upload');
        var $overlay = $('#mobile-upload');

        // On the upload icon click/tap
        $uploadIcon.off('tap').on('tap', function() {

            // Open the file picker
            $fileInput.trigger('click');
            return false;
        });

        // When the file is selected, start the upload
        $fileInput.off('change').on('change', function() {

            // Pop up upload dialog
            $overlay.removeClass('hidden').addClass('overlay');

            // Get file information
            var file = this.files[0];
            var fileSize = numOfBytes(file.size);
            var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
            var fileName = file.name;

            // Get file icon
            var fileExt = fileext(fileName);
            var fileIconName = ext[fileExt] ? ext[fileExt][0] : 'generic';
            var fileIconPath = mobile.imagePath + fileIconName + '.png';

            // Display in overlay
            $overlay.find('.filesize').text(fileSizeFormatted);
            $overlay.find('.filename').text(fileName);
            $overlay.find('.filetype-img').attr('src', fileIconPath);

            // ToDo: initialise upload button

            // Prevent double taps
            return false;
        });
    }
};
