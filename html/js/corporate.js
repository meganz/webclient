/**
 * Bottom pages functionality
 */
var corporate = {

    init: function() {
        "use strict";

        // Cache selectors
        var $page = $('.bottom-page.scroll-block.corporate', 'body');

        this.fetchCMS($page);
        corporate.openSubSection($page);
    },

    fetchCMS: function($page) {
        "use strict";
        var self = this;
        M.xhr({ url: (localStorage.cms || "https://cms2.mega.nz/") + "unsigned/corporate", type: 'json' })
            .then(function(ev, pages) {
                self.renderCorporatePages(pages);
                corporate.openSubSection($page);
            });
    },

    renderCorporatePages: function(pages) {
        'use strict';
        var self = this;
        pages.forEach(function(c) {
            $('.corporate-content', self.$page).safeAppend(
                c.content.replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl())
            );
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
        $('.corporate.main-menu.item.active', $page).removeClass('active');
        $('.corporate.main-menu.item.corporate-' + subsection, $page).addClass('active');
        $('.bottom-page.full-block.active', $page).removeClass('active');
        $('.bottom-page.full-block.corporate-' + subsection, $page).addClass('active');
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @returns {void}
     */
    openSubSection: function($page) {
        "use strict";
        var subsection;

        if (page.substr(10, 17) === 'reviews') {
            subsection = 'reviews';
        }
        else {
            subsection = 'media';
            CMS.dynamicStatsCount($page);
        }

        $('.corporate.main-menu.item', $page).rebind('click.corporate', function() {
            loadSubPage('corporate/' + $(this).data('page'));
        });

        corporate.showSubsectionContent($page, subsection);
    }
};
