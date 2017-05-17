/**
 * Functionality iOS page (#ios)
 */
var megabirdpage = {

    /**
     * Initialise the iOS page
     */
    init: function() {
        $('.pages-nav.nav-button').removeClass('active');
        $('.pages-nav.nav-button.ios').addClass('active');

        initBottompageScroll();
    }
};