/**
 * Bottom pages functionality
 */
var aboutus = {

    init: function() {
        "use strict";

        // Cache selectors
        var $page = $('.bottom-page.scroll-block.about', 'body');

        aboutus.openSubSection($page);
        this.randomMemberOrderMix($page);
        if (page === 'about/main') {
            this.dynamicCount($page);
        }
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @param {Scring} subsection Subsection name to show
     * @returns {void}
     */
    showSubsectionContent: function($page, subsection) {
        "use strict";

        loadSubPage('/about/' + subsection);

        $('.about.main-menu.item.active', $page).removeClass('active');
        $('.about.main-menu.item.about-' + subsection, $page).addClass('active');
        $('.bottom-page.full-block.active', $page).removeClass('active');
        $('.bottom-page.full-block.about-' + subsection, $page).addClass('active');
        bottompage.initAnimations($page);
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @returns {void}
     */
    openSubSection: function($page) {
        "use strict";

        var subsection;

        if (page.substr(6, 10) === 'jobs') {
            subsection = 'jobs';
        }
        else if (page.substr(6, 17) === 'reliability') {
            subsection = 'reliability';
        }
        else if (page.substr(6, 13) === 'privacy') {
            subsection = 'privacy';
        }
        else {
            subsection = 'main';
        }

        aboutus.showSubsectionContent($page, subsection);

        // Init main menu click
        $('.about.main-menu.item', $page).rebind('click.about', function() {
            aboutus.showSubsectionContent($page, $(this).data('page'));
        });
    },

    /**
     * Lets mix order of memebers list
     * @param {Object} $page The jQuery selector for the current page
     * @returns {void}
     */
    randomMemberOrderMix: function($page) {

        "use strict";

        var $aboutMember = $('.about.members', $page);
        var $randomed = $aboutMember.children().sort(function() {
            return 0.5 - Math.random();
        });

        for (var i = 0; i < $randomed.length; i++) {
            $aboutMember[0].appendChild($randomed[i]);
        }
    },

    dynamicCount: function($page) {

        "use strict";

        loadingDialog.show();

        api_req({a: "dailystats"}, {
            callback: function(res) {

                loadingDialog.hide();

                var muser = 175;
                var bfiles = 75;

                if (typeof res === 'object') {
                    var muser = res.confirmedusers.total / 1000000 | 0;
                    var bfiles = res.files.total / 1000000000 | 0;
                }

                // Locale of million and biliion will comes
                $('#about-register-count', $page).text(muser + 'M+');
                $('#about-files-count', $page).text(bfiles + 'B+');
            }
        });
    }
};
