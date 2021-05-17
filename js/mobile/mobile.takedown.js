/**
 * The Takedown Guidance Policy page
 */
mobile.takedown = {

    /**
     * Shows the Takedown Guidance Policy page
     * @returns {void}
     */
    show: function() {

        'use strict';

        var takedownScreen = '.mobile .bottom-page.scroll-block';

        // variables which declare specific classes needed to init scroll button
        var topBlock = '.takedown-guidance-top-block';
        var blockEndScroll = '.bottom-page.content';

        // Show the scroll button
        $('.takedown-page', $(takedownScreen)).removeClass('hidden');

        mobile.initButtonScroll($(takedownScreen), topBlock, blockEndScroll);
    }
};
