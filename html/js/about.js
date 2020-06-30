/**
 * Bottom pages functionality
 */
var aboutus = {

    init: function() {
        "use strict";

        // Cache selectors
        var $page = $('.bottom-page.scroll-block.about', 'body');

        this.fetchCMS($page);

        aboutus.openSubSection($page);
        if (page === 'about/main') {
            this.dynamicCount($page);
        }
    },

    fetchCMS: function() {
        "use strict";
        M.xhr({url: (localStorage.cms || "https://cms2.mega.nz/") + "unsigned/team_" + lang, type: 'json'})
            .then(function(ev, members) {
                members.sort(function() {
                    return 0.5 - Math.random();
                });
                var aboutContent = '';
                for (var i = members.length; i--;) {
                    aboutContent +=
                        '<div class="bottom-page inline-block col-6 fadein">' +
                            '<img class="shadow" src="' + escapeHTML(members[i].photo)
                                + '" alt="' + escapeHTML(members[i].name) + '">' +
                            '<span class="bold">' + escapeHTML(members[i].name) + '</span>' +
                            '<span>' + escapeHTML(members[i].role) + '</span>' +
                        '</div>';
                }
                aboutContent = aboutContent.replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl());
                $('.members', '.bottom-page').safeHTML(aboutContent);
            });
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @param {String} subsection Subsection name to show
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

    dynamicCount: function($page) {

        "use strict";

        loadingDialog.show();

        api_req({a: "dailystats"}, {
            callback: function(res) {

                loadingDialog.hide();

                var muser = 175;
                var dactive = 10;
                var bfiles = 75;
                var mcountries = 200;

                if (typeof res === 'object') {
                    muser = res.confirmedusers.total / 1000000 | 0;
                    bfiles = res.files.total / 1000000000 | 0;
                }

                // Locale of million and biliion will comes
                $('.about-register-count .num span', $page).text(muser);
                $('.about-daily-active .num span', $page).text(dactive);
                $('.about-files-count .num span', $page).text(bfiles);
                $('.about-mega-countries .num span', $page).text(mcountries);
            }
        });
    }
};
