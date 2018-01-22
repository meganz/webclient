/**
 * Functionality for the mobile My Account section
 */
mobile.megadrop = {

    /**
     * Initialise the page
     */
    show: function() {

        'use strict';

        var $megadrop = $('.mobile.megadrop');

        // Show the MEGAdrop page
        $megadrop.removeClass('hidden');

        // Log if they visited the TOS page
        api_req({ a: 'log', e: 99636, m: 'Visited MEGAdrop link page on mobile webclient' });

        // Init Mega (M) icon
        mobile.initHeaderMegaIcon();
    }
};
