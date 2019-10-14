/**
 * File upload functionality (currently incomplete)
 */
mobile.resumeTransfersOverlay = {
    $overlay: null,
    onCancel: null,
    onContinue: null,

    /**
     * Initialise the upload screen functionality
     */
    init: function() {
        'use strict';

        // Cache selectors
        this.$overlay = $('.mobile.resume-transfer-overlay');

        mobile.initOverlayPopstateHandler(this.$overlay);
        this.initCloseButton();
        this.initContinueButton();
    },

    /**
     * Show the resume transfers overlay
     * @param onContinue {function} Do continue transfers callback.
     * @param onCancel {function} Do cancel transfers callback.
     */
    show: function(onContinue, onCancel) {
        'use strict';

        if (!this.$overlay) {
            this.init();
        }

        // Update callbacks.
        this.onClose = onCancel || null;
        this.onContinue = onContinue || null;

        this.visible(true);
    },

    /**
     * Init close button.
     */
    initCloseButton: function() {
        'use strict';

        var self = this;
        this.$overlay.find('.fm-dialog-close, .close-button').off('tap').on('tap', function() {
            if (typeof self.onClose === 'function') {
                self.onClose();
            }
            self.visible(false);
            return false;
        });
    },

    /**
     * Init continue button.
     */
    initContinueButton: function() {
        'use strict';

        var self = this;
        this.$overlay.find('.continue-button').off('tap').on('tap', function() {
            if (typeof self.onContinue === 'function') {
                self.onContinue();
            }
            self.visible(false);
            return false;
        });
    },

    /**
     * Check || set visible state of overlay.
     * @param newState
     * @return {bool|this}
     */
    visible: function(newState) {
        'use strict';

        if (newState !== undefined) {
            if (newState) {
                this.$overlay.removeClass('hidden').addClass('overlay');
            } else {
                this.$overlay.addClass('hidden').removeClass('overlay');
            }
            return this;
        }
        return this.$overlay.hasClass('hidden');
    }

};
