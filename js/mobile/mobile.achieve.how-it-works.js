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
        this.$page = $('.mobile.achievements-how-it-works-page');

        // Initialise back button to go back to the Invites page
        mobile.initBackButton(this.$page, 'fm/account/invites');

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99675, m: 'Mobile web Invites How it Works page accessed' });
    }
};
