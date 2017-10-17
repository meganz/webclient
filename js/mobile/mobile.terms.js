/**
 * The Terms of Service page
 */
mobile.terms = {

    /**
     * Shows the Terms of Service page
     */
    show: function() {

        'use strict';

        var $termsScreen = $('.mobile.terms-of-service');

        // Show the TOS page
        $termsScreen.removeClass('hidden');

        // Log if they visited the TOS page
        api_req({ a: 'log', e: 99636, m: 'Visited Terms of Service page on mobile webclient' });

        // Init Mega (M) icon
        mobile.initHeaderMegaIcon();
    }
};
