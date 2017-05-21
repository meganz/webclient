/**
 * Functionality mobile applications page (#ios, #android, #wp)
 */
var mobileappspage = {

    /**
     * Initialise the page
     */
    init: function() {
        $('.pages-nav.nav-button').removeClass('active');
        if (page) {
            $('.pages-nav.nav-button.'+page).addClass('active');
        }

        initBottompageScroll();
    }
};