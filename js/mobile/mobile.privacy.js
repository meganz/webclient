/**
 * The Privacy Policy page
 */
mobile.privacy = {

    /**
     * Shows the Privacy Policy page
     * @returns {void}
     */
    show: function() {

        'use strict';

        var privacyScreen = '.mobile .bottom-page.scroll-block';

        // variables which declare specific classes needed to init scroll button
        var topBlock = '.privacy-top-block';
        var blockEndScroll = '.bottom-page.content';

        // Show the scroll button
        $('.privacy-page', $(privacyScreen)).removeClass('hidden');

        mobile.initButtonScroll($(privacyScreen), topBlock, blockEndScroll);
    }
};
