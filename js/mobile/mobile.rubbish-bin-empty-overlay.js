/**
 * Code to trigger the mobile rubbish bin empty confirmation overlay
 */
mobile.rubbishBinEmptyOverlay = {

    /** Cached jQuery selectors */
    $overlay: null,
    $fileManagerBlock: null,

    /**
     * Initialise the overlay
     */
    show: function() {

        'use strict';


        // Store selectors as they are re-used
        this.$overlay = $('#mobile-ui-empty-rubbish-bin');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        // Set the name, size. icon and initialise the download buttons
        this.initEmptyButton();
        this.initCancelAndCloseButtons();

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari and show the overlay
        this.$fileManagerBlock.addClass('disable-scroll');
        this.$overlay.removeClass('hidden').addClass('overlay');
        
        mobile.initOverlayPopstateHandler(this.$overlay);
    },

    /**
     * close the overlay.
     */
    close: function () {
        'use strict';
        // Hide overlay with download button options, re-show the file manager and re-enable scrolling
        mobile.rubbishBinEmptyOverlay.$overlay.addClass('hidden');
        mobile.rubbishBinEmptyOverlay.$fileManagerBlock.removeClass('hidden disable-scroll');
    },

    /**
     * Initialise the Empty button on the overlay
     */
    initEmptyButton: function() {
        'use strict';

        // On delete button click/tap
        this.$overlay.find('.first.empty').off('tap').on('tap', function() {
            M.clearRubbish(true)
                .then(function() {
                    mobile.showSuccessToast(l[16990]);
                    M.v = [];
                    mobile.rubbishBin.renderUpdate();
                })
                .catch(function() {
                    mobile.showErrorToast(l[16991]);
                });
            mobile.rubbishBinEmptyOverlay.close();
            return false;
        });
    },

    /**
     * Initialises the close button on the overlay
     */
    initCancelAndCloseButtons: function() {

        'use strict';

        var $closeAndCancelButtons = this.$overlay.find('.fm-dialog-close, .text-button');

        // Add click/tap handler
        $closeAndCancelButtons.off('tap').on('tap', function() {

            // Hide overlay with download button options, re-show the file manager and re-enable scrolling
            mobile.rubbishBinEmptyOverlay.close();

            // Prevent clicking menu behind
            return false;
        });
    }
};
