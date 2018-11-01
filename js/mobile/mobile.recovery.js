/**
 * Recover Account page functionality
 * Method A (recovery with key) - Step 1 & Method B (recovery by parking) - Step 1 of recovery process
 */
mobile.recovery = {

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the selectors
        var $screen = $('.forgot-password-page');

        // Initialise functionality
        mobile.initBackButton($screen);
        mobile.recovery.initHaveKeyButton($screen);
        mobile.recovery.initNotHaveKeyButton($screen);

        // Show the screen
        $screen.removeClass('hidden');
    },

    /**
     * Initialise the Yes button (they have their Recovery Key)
     * @param {Object} $screen The jQuery selector for the current screen/page
     */
    initHaveKeyButton: function($screen) {

        'use strict';

        // On Yes button tap/click
        $screen.find('.yes-recovey-key').off('tap').on('tap', function() {

            loadSubPage('recoverybykey');
            return false;
        });
    },

    /**
     * Initialise the No button (they do not have their Recovery Key)
     * @param {Object} $screen The jQuery selector for the current screen/page
     */
    initNotHaveKeyButton: function($screen) {

        'use strict';

        // On No button tap/click
        $screen.find('.no-recovery-key').off('tap').on('tap', function() {

            loadSubPage('recoverybypark');
            return false;
        });
    }
};
