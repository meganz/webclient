/**
 * Functionality iOS page (#ios)
 */
var wppage = {

    /**
     * Initialise the iOS page
     */
    init: function() {
        $('.pages-nav.nav-button').removeClass('active');
        $('.pages-nav.nav-button.wp').addClass('active');

        initBottompageScroll();
    }
};