/**
 * Bottom pages functionality
 */
var aboutus = {

    init: function() {
        "use strict";

        // Cache selectors
        var $page = $('.bottom-page.scroll-block.about', 'body');

        this.fetchCMS();

        aboutus.openSubSection($page);
    },

    fetchCMS: function() {
        "use strict";

        if (this.members) {
            this.insMembersInHTML(this.members);
        }
        else {
            var self = this;
            M.xhr({ url: (localStorage.cms || "https://cms2.mega.nz/") + "unsigned/team_en", type: 'json' })
                .then(function(ev, members) {
                    self.members = members;
                    self.insMembersInHTML(members);
                });
        }
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @param {String} subsection Subsection name to show
     * @returns {void}
     */
    showSubsectionContent: function($page, subsection) {
        "use strict";


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
            this.dynamicCount($page);
        }

        aboutus.showSubsectionContent($page, subsection);

        // Init main menu click
        $('.about.main-menu.item', $page).rebind('click.about', function() {
            loadSubPage('/about/' + $(this).data('page'));
        });
    },

    dynamicCount: function($page) {

        "use strict";

        var fillStats = function(muser, dactive, bfiles, mcountries) {
            // Locale of million and biliion will comes
            $('.about-register-count .num span', $page).text(muser);
            $('.about-daily-active .num span', $page).text(dactive);
            $('.about-files-count .num span', $page).text(bfiles);
            $('.about-mega-countries .num span', $page).text(mcountries);
        };
        var self = this;

        if (this.aboutStats && (new Date() - this.aboutStats.aboutStatsTime < 36e5)) {
            fillStats(
                this.aboutStats.muser,
                this.aboutStats.dactive,
                this.aboutStats.bfiles,
                this.aboutStats.mcountries);
        }
        else {
            loadingDialog.show();

            api_req({ a: "dailystats" }, {
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

                    fillStats(muser, dactive, bfiles, mcountries);
                    self.aboutStats = {
                        muser: muser,
                        dactive: dactive,
                        bfiles: bfiles,
                        mcountries: mcountries,
                        aboutStatsTime: new Date()
                    };
                }
            });
        }
    },

    insMembersInHTML: function(members) {
        'use strict';
        members.sort(function() {
            return 0.5 - Math.random();
        });
        var aboutContent = '';
        var memPhoto;
        var cmsUrl = CMS.getUrl();
        for (var i = members.length; i--;) {
            memPhoto = (members[i].photo || '').replace(/(?:{|%7B)cmspath(?:%7D|})/, cmsUrl);
            aboutContent +=
                '<div class="bottom-page inline-block col-6 fadein">' +
                '<img class="shadow" src="' + escapeHTML(memPhoto)
                + '" alt="' + escapeHTML(members[i].name) + '">' +
                '<span class="bold">' + escapeHTML(members[i].name) + '</span>' +
                '<span>' + escapeHTML(members[i].role) + '</span>' +
                '</div>';
        }
        $('.members', '.bottom-page').safeHTML(aboutContent);
    }
};
