/**
 * The Cookie Policy page
 */
mobile.cookie = {

    /**
     * Shows the Cookie Policy Policy page
     * @returns {void}
     */
    show: function() {

        'use strict';

        var cookieScreen = '.mobile .bottom-page.scroll-block';

        // variables which declare specific classes needed to init scroll button
        var topBlock = '.cookie-policy-top-block';
        var blockEndScroll = '.bottom-page.content';

        // Show the scroll button
        $('.cookie-page', $(cookieScreen)).removeClass('hidden');

        mobile.initButtonScroll($(cookieScreen), topBlock, blockEndScroll);
    }
};
