/**
 * Functionality Android page (#android)
 */
var androidpage = {

    /**
     * Initialise the Android page
     */
    init: function() {
        $('.pages-nav.nav-button').removeClass('active');
        $('.pages-nav.nav-button.android').addClass('active');

        initBottompageScroll();
    }
};