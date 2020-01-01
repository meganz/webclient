/**
 * Functionality for the mobile Backup Recovery Key page
 */
mobile.backup = {

    /**
     * Initialise functionality
     */
    init: function() {

        'use strict';

        var $page = $('.mobile.recovery-key-page');

        // Init functionality
        mobile.initBackButton($page);
        mobile.backup.showKey($page);
        mobile.backup.initCopyKeyButton($page);
        mobile.backup.initDownloadKeyButton($page);

        // Show the page
        $page.removeClass('hidden');
    },

    /**
     * Shows the master key in the page
     * @param {Object} $page jQuery object for the page
     */
    showKey: function($page) {

        'use strict';

        // Convert the Master/Recovery Key to Base64
        var recoveryKeyBase64 = a32_to_base64(u_k);

        // Put the key in the text field
        $page.find('.recovery-key-string').val(recoveryKeyBase64);
    },

    /**
     * Initialise the button to copy the Recovery Key to the clipboard
     * @param {Object} $page jQuery object for the page
     */
    initCopyKeyButton: function($page) {

        'use strict';

        // Cache the selectors
        var $iosCopyText = $page.find('.recovery-key-body-text');
        var $copyToClipboardButton = $page.find('.recovery-key-copy-btn');

        // If on iOS the copy button won't work (for now) so show some text explaining how to copy it manually
        if (is_ios) {
            $iosCopyText.removeClass('hidden');
        }
        else {
            // For Android/Win Phone etc, show the button
            $copyToClipboardButton.removeClass('hidden');

            // Add click/tap handler to the button
            $copyToClipboardButton.off('tap').on('tap', function() {

                try {
                    // Select / highlight the text
                    document.getElementById('mobile-backup-recovery-key-string').select();

                    // Copy it to the clipboard
                    var success = document.execCommand('copy');

                    // If it succeeded, show a toast message
                    if (success) {
                        mobile.showToast(l[8836]);    // Recovery Key copied to clipboard
                        mBroadcaster.sendMessage('keyexported');
                    }
                    else {
                        // Otherwise tell them to copy manually
                        mobile.showToast(l[16348]);
                    }
                }
                catch (exception) {

                    // If not supported, tell them to copy manually
                    mobile.showToast(l[16348]);
                }

                // Prevent duplicate taps
                return false;
            });
        }
    },

    /**
     * Initialise the Download Recovery Key button
     * @param {Object} $page jQuery object for the page
     */
    initDownloadKeyButton: function($page) {

        'use strict';

        // If on iOS exit early as it does not allow file download for now
        if (is_ios) {
            return false;
        }

        // Cache selector
        var $downloadToFileButton = $page.find('.recovery-key-download-btn');

        // For Android/Win Phone etc, show the button
        $downloadToFileButton.removeClass('hidden');

        // Add click/tap handler to the button
        $downloadToFileButton.rebind('tap', u_savekey);
    }
};
