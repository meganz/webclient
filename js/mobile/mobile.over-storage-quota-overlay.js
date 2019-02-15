/**
 * Controller for the over StorageQuota overlay.
 */
mobile.overStorageQuotaOverlay = {

    /** Cached jQuery selectors */
    $overlay: null,
    $fileManagerBlock: null,

    /**
     * Init the overlay.
     */
    init: function() {
        'use strict';

        var p = new MegaPromise();

        // Store selectors as they are re-used
        this.$overlay = $('#mobile-ui-over-storage-quota-overlay');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        M.accountData(function() {
            // Init input controls.
            mobile.overStorageQuotaOverlay.initControlButtons();
            mobile.overStorageQuotaOverlay.initCloseButtons();
            p.resolve();
        });

        return p;
    },

    /**
     * Show the Overlay
     */
    show: function() {
        'use strict';

        var display = function() {
            mobile.overStorageQuotaOverlay.$fileManagerBlock.addClass('disable-scroll');
            mobile.overStorageQuotaOverlay.$overlay.removeClass('hidden').addClass('overlay');
        };

        // Init the overlay if this is the first time we are opening it.
        if (!this.$overlay) {
            this.init().always(display);
        } else {
            display();
        }
    },

    /**
     * close the overlay.
     */
    close: function () {
        'use strict';
        if (this.$overlay !== null) {
            // Hide overlay with download button options, re-show the file manager and re-enable scrolling
            this.$overlay.addClass('hidden');
            this.$fileManagerBlock.removeClass('hidden disable-scroll');
        }
    },

    /**
     * Init the upgradeAccount and inviteFriends buttons.
     */
    initControlButtons: function() {
        'use strict';

        var $inviteButton = this.$overlay.find(".action-invite-friends");
        var $upgradeButton = this.$overlay.find(".action-upgrade-account");

        if (M.account.maf) {
            $inviteButton.off('tap').on('tap', function() {
                mobile.overStorageQuotaOverlay.close();
                loadSubPage('fm/account/invites');
                return false;
            });
        } else {
            $inviteButton.addClass('hidden');
        }

        $upgradeButton.off('tap').on('tap', function() {
            mobile.overStorageQuotaOverlay.close();
            loadSubPage('pro');
            return false;
        });
    },

    /**
     * Initialises the close buttons on the overlay
     */
    initCloseButtons: function() {
        'use strict';

        var $closeAndCancelButtons = this.$overlay.find('.fm-dialog-close, .cancel');
        // Add click/tap handler
        $closeAndCancelButtons.off('tap').on('tap', function() {
            mobile.overStorageQuotaOverlay.close();
            return false;
        });
    }
};
