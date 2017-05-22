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
    },

    initTabs: function() {
        $('.bottom-page.tab').rebind('click', function (e) {
            var $this = $(this);
            var tabTitle = $this.attr('data-tab');

            if (!$this.hasClass('active')) {
                $('.bottom-page.tab').removeClass('active');
                $('.bottom-page.tab-content:visible').addClass('hidden');
                $('.bottom-page.tab-content.' + tabTitle).removeClass('hidden');
                $this.addClass('active');
                startscrollIgnore(1000);
                jScrollStart();
            }
        });
    }
};