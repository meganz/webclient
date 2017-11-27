/**
 * Functionality for the mobile Invite Friends page
 */
mobile.achieve.howItWorks = {

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
        mobile.achieve.howItWorks.$page = $('.mobile.achievements-how-it-works-page');

        // Initialise functionality
        mobile.achieve.howItWorks.initBackButton();

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        mobile.achieve.howItWorks.$page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99675, m: 'Mobile web Invites How it Works page accessed' });
    },

    /**
     * Initialise the back arrow icon in the header to go back to the main Achievements page
     */
    initBackButton: function() {

        'use strict';

        // On Back button click/tap
        mobile.achieve.howItWorks.$page.find('.fm-icon.back').off('tap').on('tap', function() {

            // Render the Invites page again
            loadSubPage('fm/account/invites');
            return false;
        });
    }
};
