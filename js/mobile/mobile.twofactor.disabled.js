/**
 * Functionality for the Two-Factor Authentication Disabled page
 */
mobile.twofactor.disabled = {

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
        mobile.twofactor.disabled.$page = $('.mobile.two-factor-page.disabled-page');

        // Initialise functionality
        mobile.twofactor.disabled.initOkButton();

        // Show the account page content
        mobile.twofactor.disabled.$page.removeClass('hidden');
    },

    /**
     * Initialise the OK button to go back to the My Account page
     */
    initOkButton: function() {

        'use strict';

        // On Back button click/tap
        mobile.twofactor.disabled.$page.find('.ok-button').off('tap').on('tap', function() {

            // Render the My Account page
            loadSubPage('fm/account/');
            return false;
        });
    }
};
