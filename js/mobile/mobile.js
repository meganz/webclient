/**
 * Root namespace for the mobile web site, contains common variables and functions
 */
var mobile = {

    /** The base path for images */
    imagePath: staticpath + 'images/mobile/extensions/',

    /**
     * Show a simple toast message and hide it after 3 seconds
     * @param {String} message The message to show
     * @param {String} position Optional flag to show the position at the top, by default it shows at the bottom
     */
    showToast: function(message, position) {

        'use strict';

        var $toastNotification = $('.mobile.toast-notification');

        // Set the message and show the notification
        $toastNotification.text(message).removeClass('hidden').addClass('active');

        // Show the toast notification at the top of the page (useful if the keyboard is open and blocking the bottom)
        if (position === 'top') {
            $toastNotification.addClass('top');
        }

        // After 3 seconds, hide the notification
        setTimeout(function() {
            $toastNotification.addClass('hidden').removeClass('active top');
        }, 3000);
    },

    /**
     * Shows and initialises the back button on click/tap event handler
     * @param {Object} $backButton jQuery selector for the back button
     */
    showAndInitBackButton: function($backButton) {

        'use strict';

        // Show the back button
        $backButton.removeClass('hidden');

        // On click of the back button
        $backButton.off('tap').on('tap', function() {

            // Open the previous folder/page
            window.history.back();
            return false;
        });
    },

    /**
     * Initialises the Login and Register tab buttons
     * @param {String} showTab The tab to show immediately i.e. 'login' or 'register'
     */
    initTabs: function(showTab) {

        'use strict';

        // Cache selectors
        var $screen = $('.mobile.signin-register-block');
        var $loginTab = $screen.find('.top-link.sign-in');
        var $loginNavHead = $screen.find('.fm-header-txt.sign-in');
        var $registerTab = $screen.find('.top-link.register');
        var $registerNavHead = $screen.find('.fm-header-txt.register');
        var $loginContent = $screen.find('.tab-block.sign-in');
        var $registerContent = $screen.find('.tab-block.register');

        // Show the signin content and light up the signin tab
        if (showTab === 'login') {
            $loginContent.removeClass('hidden');
            $loginTab.addClass('hidden');
            $registerNavHead.addClass('hidden');
            $loginNavHead.removeClass('hidden');
        }
        else {
            // Otherwise show the register content and light up the register tab
            $registerContent.removeClass('hidden');
            $registerTab.addClass('hidden');
            $loginNavHead.addClass('hidden');
            $registerNavHead.removeClass('hidden');
        }

        // If the login tab is clicked, load the login page
        $loginTab.off('tap').on('tap', function() {

            loadSubPage('login');
            return false;
        });

        // If the register tab is clicked, load the register page
        $registerTab.off('tap').on('tap', function() {

            loadSubPage('register');
            return false;
        });
    },

    /**
     * Initialise checkbox on click/tap functionality which has special styling and requires extra code
     * @param {String} className The container class name which contains the checkbox input and label
     */
    initCheckbox: function(className) {

        'use strict';

        var $container = $('.mobile.' + className);
        var $checkboxWrapper = $container.find('.square');
        var $checkboxInput = $checkboxWrapper.find('.checkbox');

        // On clicking the checkbox or label
        $container.off('tap').on('tap', function(e) {

            // If user taps on link, open Terms page
            if (!$(e.target).is('a')) {

                // If checked already, uncheck it
                if ($checkboxInput.is(':checked')) {
                    $checkboxWrapper.addClass('checkboxOff').removeClass('checkboxOn');
                    $checkboxInput.prop('checked', false);
                }
                else {
                    // Otherwise check it
                    $checkboxWrapper.removeClass('checkboxOff').addClass('checkboxOn');
                    $checkboxInput.prop('checked', true);
                }
            }
            else {
                loadSubPage('terms');
            }

            // Prevent double clicks
            return false;
        });
    },

    /**
     * Initialise the MEGA icon on various pages to go back to the homepage or cloud drive
     */
    initHeaderMegaIcon: function() {

        'use strict';

        var $megaIcon = $('.mobile.fm-icon.mega');

        // On Mega icon click
        $megaIcon.off('tap').on('tap', function() {
            if ($(this).hasClass('non-responsive')) {
                return;
            }
            // Load the cloud drive or start page, if not logged in
            mobile.loadCloudDrivePage();
            return false;
        });
    },

    /**
     * Loads the cloud drive if the user is logged in otherwise loads the start page
     */
    loadCloudDrivePage: function() {

        'use strict';

        var $otherPages = $('#fmholder > div');
        var $cloudDrive = $('.mobile.file-manager-block');

        // If logged in
        if (typeof u_attr !== 'undefined') {

            // Hide other pages that may be showing and show the Cloud Drive
            $otherPages.addClass('hidden');
            $cloudDrive.removeClass('hidden');

            // Open the root cloud folder
            loadSubPage('fm');
        }
        else {
            // Otherwise if not logged in, load the home page
            loadSubPage('start');
        }
    },

    /**
     * Changes the app store badge depending on what device they have
     */
    initMobileAppButton: function() {

        'use strict';

        var $appStoreButton = $('.download-app, .startpage .mobile-apps-button');

        // Set the link
        $appStoreButton.attr('href', mobile.downloadOverlay.getStoreLink());

        // If iOS, Windows or Android show the relevant app store badge
        switch (ua.details.os) {

            case 'iPad':
            case 'iPhone':
                $appStoreButton.removeClass('hidden').addClass('ios');
                break;

            case 'Windows Phone':
                $appStoreButton.removeClass('hidden').addClass('wp');
                break;

            default:
                // Android and others
                $appStoreButton.removeClass('hidden').addClass('android');
                break;
        }
    },

    /**
     * Show a dialog asking the user to check their email
     */
    showEmailConfirmOverlay: function() {

        'use strict';

        // Show white background overlay behind the dialog
        $('.light-overlay').removeClass('hidden');
        $('.mobile.common-check-email-dialog').removeClass('hidden');
    }
};


/**
 * Some stubs to prevent exceptions in action packet processing because not all files are loaded for mobile
 */
/* jshint -W098 */
/* jshint -W007 */
/* jshint strict: false */

mega.ui.tpp = {
    reset: function() {},
    setTotalProgress: function() {},
    pause: function() {},
    resume: function() {},
    getTime: function() {},
    start: function() {},
    setIndex: function() {},
    isCached: function() {
        'use strict';
        return false;
    },
    statusPaused: function() {},
    hide: function() {}
};

mega.megadrop = {
    pufs: function() { return mobile.megadrop.pufs; },
    isInit: function() { return false; },
    pufProcessDb: function(data) { mobile.megadrop.pufProcessDb(data); },
    onRename: function() { return false; },
    pupProcessPUP: function(ap) {  mobile.megadrop.processPUP(ap); },
    pufProcessPUH:  function(ap) { mobile.megadrop.processPUH(ap); },
    pufRemove: function(ids) { return mobile.megadrop.pufRemove(ids); },
    processUPHAP: function (ap) { mobile.megadrop.processUPH(ap); },
    isDropExist: function (sel) { return mobile.megadrop.isDropExist(sel); }
};

var notify = {
    init: function() {},
    notifyFromActionPacket: function() {},
    countAndShowNewNotifications: function() {},
    closePopup: function() {}
};

var alarm = {
    siteUpdate: {
        init: function() {}
    },
    planExpired: {
        lastPayment: null,
        render: function() {}
    }
};
/* jshint strict: true */

function msgDialog(type, title, msg, submsg, callback, checkbox) {

    'use strict';

    // Call the mobile version
    mobile.messageOverlay.show(msg, submsg);
}

function fm_showoverlay() {

    'use strict';

    $('.fm-dialog-overlay').removeClass('hidden');
    $('html').addClass('overlayed');
}

function fm_hideoverlay() {

    'use strict';

    $('.fm-dialog-overlay').addClass('hidden');
    $('html').removeClass('overlayed');
}

mega.ui.showRegisterDialog = function() {};

mega.loadReport = {};
var previews = {};
var preqs = Object.create(null); // FIXME: mobile needs to use preqs[] to prevent dupe requests sent to API!

function removeUInode(nodeHandle, parentHandle) {

    'use strict';

    // Call the mobile version
    mobile.cloud.renderDelete(nodeHandle, parentHandle);
}

// Not required for mobile
function fmtopUI() {}
function sharedUInode() {}
function addToMultiInputDropDownList() {}
function removeFromMultiInputDDL() {}
function closeDialog() {}
function slideshow_handle() {}
/* jshint +W098 */
/* jshint +W007 */
