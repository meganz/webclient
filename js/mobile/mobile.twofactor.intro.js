/**
 * Functionality for the Two-Factor Authentication Introduction page
 */
mobile.twofactor.intro = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        mobile.twofactor.intro.$page = $('.mobile.two-factor-page.intro-page');

        // Initialise functionality
        mobile.twofactor.intro.initSetupButton();
        mobile.twofactor.intro.initCloseAndCancelButtons();

        // Show the account page content
        mobile.twofactor.intro.$page.removeClass('hidden');
    },

    /**
     * Initialise the Setup button to go to the Setup Two-Factor Authentication page
     */
    initSetupButton: function() {

        'use strict';

        // On Back button click/tap
        mobile.twofactor.intro.$page.find('.setup-two-factor-button').off('tap').on('tap', function() {

            // Render the Setup page
            loadSubPage('twofactor/setup');
            return false;
        });
    },

    /**
     * Initialise the close and cancel buttons to go back to the main My Account page
     */
    initCloseAndCancelButtons: function() {

        'use strict';

        // On Close icon/Cancel button click/tap
        mobile.twofactor.intro.$page.find('.mobile.cancel, .mobile.fm-dialog-close').off('tap').on('tap', function() {

            // Render the Account page again
            loadSubPage('fm/account/');
            return false;
        });
    }
};
