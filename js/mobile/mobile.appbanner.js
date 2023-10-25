/**
 * Functionality for the top app banner, shown when the user is previewing
 * a file in their cloud drive, or viewing a file or folder link
 */
mobile.appBanner = {

    /**
     * Show the top app banner.
     *
     * The banner will re-appear if the user logs out and logs back in, or if
     * the user is on another browser/incognito tab.
     * If closed, the banner won't re-appear within the same session or when refreshing the page.
     *
     * @param {String} nodeHandle the handle of the node being viewed
     * @returns {undefined}
     */
    show: function(nodeHandle) {
        'use strict';

        this.handle = nodeHandle;

        this.banner = mobile.banner.show(
            '', l.mobile_app_banner_blurb, l.open_in_app, 'advertisement', true, true, false
        );

        this.banner
            .on('cta', () => {
                goToMobileApp(this.handle ? MegaMobileViewOverlay.getAppLink(this.handle) : '#1');
            })
            .on('close', () => {
                localStorage.closedMobileAppBanner = true;
            });
    },

    /**
     * Update the banner by either showing it (if not visible), or updating the handle to
     * be used for the CTA link, provided the user hasn't closed it in the current browser
     * session.
     *
     * @param {String} handle the node handle of the currently shown file or folder
     * @returns {undefined}
     */
    updateBanner: function(handle) {
        'use strict';

        if (!localStorage.closedMobileAppBanner) {
            if (this.visible) {
                this.handle = handle;
            }
            else {
                this.show(handle);
            }
        }
    },

    get visible() {
        'use strict';

        if (this.banner) {
            return this.banner.visible;
        }
        return false;
    },

    hide: function() {
        'use strict';

        if (this.visible) {
            this.banner.hide();
        }
    }
};
