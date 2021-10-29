/**
 * The context menu (shown when clicking the icon with 3 vertical dots) next to a folder or file row allows extra
 * options to be performed for that file or folder such as downloading, creating/editing a public link or deleting.
 */
mobile.cloud.sort = {
    /**
     * Initialise the context menu for each context menu icon click in each cloud row
     */
    init: function() {

        'use strict';

        // If a folder/file row context menu icon is tapped
        $('.mobile.sort-grid-item-main').rebind('tap', () => {
            // Clear any selections.
            mobile.cloud.deselect();
            mobile.cloud.sort.show();

            // Prevent bubbling up to clicking the row behind the icon
            return false;
        });

        $('.context-menu-item').rebind('tap', (e) => {
            var $contextMItem = $(e.target.closest('.context-menu-item'));
            mobile.cloud.sort.sort(
                $contextMItem.attr('data-sortby'),
                $contextMItem.attr('data-sortdir')
            );
        });
    },

    /**
     * Show the sorting menu
     */
    show: function() {

        'use strict';

        $('.dark-overlay').removeClass('hidden').rebind('tap', () => {
            mobile.cloud.sort.hide();
        });

        $('.context-menu-container.sort').removeClass('o-hidden');
    },

    /**
     * Hide the sorting menu
     */
    hide: function() {

        'use strict';

        var $overlay = $('.dark-overlay');

        // Hide overlay
        $overlay.addClass('hidden');
        $('.context-menu-container.sort').addClass('o-hidden');
    },

    /**
     * Do the sorting
     */
    sort: function(action, dir) {

        'use strict';

        M.doSort(action, dir);
        M.renderMain();

        mobile.cloud.sort.hide();
    }
};
