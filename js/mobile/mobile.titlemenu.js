/**
 * The TitleMenu, shown when clicking the page title or dropdown handle on selected pages.
 */
mobile.titleMenu = {

    /**
     * Map of page -> menu item selector for automatically hiding menu items for the current page.
     */
    pageMenuItemMap: {
        "fm": ".open-cloud-drive",
        "fm/account": ".open-my-account",
        "fm/rubbish": ".open-rubbish-bin",
        "fm/refer": ".open-affiliate"
    },

    /**
     * Timeout for adding hidden to the title menu rather than just invisible.
     */
    removeDisplayTimeout: null,

    /**
     * Init DropDown for top menu
     */
    init: function() {
        'use strict';

        var $openHandle = $('.open-title-menu');
        var $menuHeader =  $('.fm-header-txt');
        var $closeHandle = $('.mobile.title-menu-container .close-button');
        var $accountLink = $('.mobile.title-menu-container .open-my-account');
        var $cloudDriveLink = $('.mobile.title-menu-container .open-cloud-drive');
        var $rubbishBinLink = $('.mobile.title-menu-container .open-rubbish-bin');
        var $affiliateLink = $('.mobile.title-menu-container .open-affiliate');

        $menuHeader.rebind('tap', function() {
            mobile.titleMenu.open();
            return false;
        });
        $openHandle.off('tap').on('tap', function() {
            mobile.titleMenu.open();
            return false;
        });
        $closeHandle.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            return false;
        });

        $accountLink.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            loadSubPage("fm/account");
            return false;
        });

        $cloudDriveLink.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            loadSubPage("fm");
            return false;
        });

        $rubbishBinLink.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            loadSubPage("fm/rubbish");
            return false;
        });

        $affiliateLink.rebind('tap', function() {
            mobile.titleMenu.close();
            loadSubPage("fm/refer");
            return false;
        });
    },

    /**
     * Handle tap on top menu dropdown icon
     */
    open: function() {
        'use strict';

        var $overlay = $(".titlemenu-overlay");
        var $titleMenuOpenHandle = $(".dropdown-handle");
        var $titleMenuContainer = $(".mobile.title-menu-container");

        mobile.titleMenu.showHideMenuItems($titleMenuContainer);

        $overlay.removeClass("hidden");
        $titleMenuOpenHandle.addClass("open");
        $titleMenuContainer.removeClass("hidden closed");
        

        $titleMenuOpenHandle.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            return false;
        });

        // Register tap on overlay to close title meny.
        $overlay.off('tap').on('tap', function() {
            mobile.titleMenu.close();
            return false;
        });

        if (this.removeDisplayTimeout !== null) {
            clearTimeout(this.removeDisplayTimeout);
            this.removeDisplayTimeout = null;
        }


    },

    /**
     * Automatically hide menu items based on the current view.
     */
    showHideMenuItems: function($titleMenuContainer) {

        'use strict';

        $titleMenuContainer.find(".title-menu-item").removeClass("hidden");

        if (!u_attr.flags.refpr) {
            $(".title-menu-item.open-affiliate", $titleMenuContainer).addClass('hidden');
        }

        if (mobile.titleMenu.pageMenuItemMap.hasOwnProperty(page)) {
            $titleMenuContainer.find(mobile.titleMenu.pageMenuItemMap[page]).addClass("hidden");
        } else if (is_fm()) {
            if (M.getNodeRoot(M.currentdirid) === M.RubbishID) {
                $titleMenuContainer.find(mobile.titleMenu.pageMenuItemMap["fm/rubbish"]).addClass("hidden");
            } else {
                $titleMenuContainer.find(mobile.titleMenu.pageMenuItemMap["fm"]).addClass("hidden");
            }
        }
    },

    /**
     * Handle close and cleanup of title drop down menu.
     */
    close: function() {
        'use strict';

        var $overlay = $(".titlemenu-overlay");
        var $titleMenuOpenHandle = $(".dropdown-handle");
        var $titleMenuContainer = $(".mobile.title-menu-container");

        $overlay.addClass("hidden");
        $titleMenuOpenHandle.removeClass("open");
        $titleMenuContainer.addClass("closed");
        $overlay.off('tap');

        $titleMenuOpenHandle.off('tap').on('tap', function() {
            mobile.titleMenu.open();
            return false;
        });

        this.removeDisplayTimeout = setTimeout(function() {
            $(".mobile.title-menu-container").addClass('hidden');
        }, 200);
    }
};
