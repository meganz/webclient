/**
 * Root namespace for the mobile web site, contains common variables and functions
 */
var mobile = {

    /** The base path for images */
    imagePath: staticpath + 'images/mobile/extensions/',

    /**
     * Toast timer, reset if new toast comes in.
     */
    toastTimer: null,

    /**
     * Show a simple toast message and hide it after 3 seconds
     * @param {String} message The message to show
     * @param {String} position Optional flag to show the position at the top, by default it shows at the bottom
     * @param {int} timeout Optional, optional timeout in miliseconds
     */
    showToast: function(message, position, timeout) {
        'use strict';
        mobile.renderToast($('.mobile.toast-notification.info'), message, position, timeout);
    },

    /**
     * Show a green success toast.
     * @param message
     * @param position
     * @param timeout Optional, optional timeout in miliseconds
     */
    showSuccessToast: function(message, position, timeout, clickCallback) {
        'use strict';

        var $toast = $('.mobile.toast-notification.alert');
        $toast.removeClass("error").addClass("success");
        mobile.renderToast($toast, message, position, timeout, clickCallback);
    },

    /**
     * Show red error toast.
     * @param message
     * @param position
     * @param {int} timeout Optional, optional timeout in miliseconds
     */
    showErrorToast: function(message, position, timeout, clickCallback) {
        'use strict';

        var $toast = $('.mobile.toast-notification.alert');
        $toast.removeClass("success").addClass("error");
        mobile.renderToast($toast, message, position, timeout, clickCallback);
    },

    /**
     * Render a specific toast notification.
     * @param $toastNotification
     * @param message
     * @param position
     * @param timeout int 0 = never close.
     */
    renderToast: function($toastNotification, message, position, timeout, clickCallback) {
        'use strict';

        // Set the message and show the notification
        $toastNotification.find(".message-body").text(message);
        $toastNotification.removeClass('hidden').addClass('active');

        // Show the toast notification at the top of the page (useful if the keyboard is open and blocking the bottom)
        if (position === 'top') {
            $toastNotification.addClass('top');
        }

        if (mobile.toastTimer !== null) {
            clearTimeout(mobile.toastTimer);
            mobile.toastTimer = null;
        }

        if (timeout === undefined || timeout === null || timeout < 0) {
            timeout = 3000;
        }

        if (timeout > 0) {
            // After 3 seconds, hide the notification
            mobile.toastTimer = setTimeout(function () {
                mobile.closeToast($toastNotification);
            }, timeout);
        }

        $toastNotification.off('tap');
        if (clickCallback instanceof Function) {
            $toastNotification.on('tap', clickCallback);
        }
    },

    /**
     * Close a toast notification.
     * @param $toastNotification (optional, if ommited will close all toasts).
     */
    closeToast: function($toastNotification) {
        'use strict';

        if ($toastNotification === undefined) {
            $toastNotification = $(".mobile.toast-notification");
        }

        $toastNotification.addClass('hidden').removeClass('active top');
    },

    /**
     * Initialise the back arrow icon in the header to go back to a specific page
     * @param {Object} $page The jQuery selector for the current page
     * @param {String} targetPage Optional strung to specify the previous page to go back to, otherwise it will go back
     *                            one page in the browser history
     */
    initBackButton: function($page, targetPage) {

        'use strict';

        // Unhide back button, then add on click/tap handler
        $page.find('.fm-icon.back').removeClass('hidden').off('tap').on('tap', function() {

            // If page to go back to is specified, render that
            if (typeof targetPage !== 'undefined') {
                loadSubPage(targetPage);
            }
            else {
                // Otherwise open the previous folder/page
                window.history.back();
            }

            // Prevent double taps
            return false;
        });
    },

    /**
     * Shows and initialises the up button on click/tap event handler
     * @param {Object} $upButton jQuery selector for the up button
     */
    showAndInitUpButton: function($upButton) {

        'use strict';

        // Show the button
        $upButton.removeClass('hidden');

        // On click of the up button
        $upButton.off('tap').on('tap', function() {
            // Go up a directory.
            if (M.currentdirid !== M.RootID && M.currentdirid !== M.RubbishID) {
                M.openFolder(M.getNodeParent(M.currentdirid));
            }
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
    },

    /**
     * Enable the Password Change/Update button if the fields are complete and correct
     * @param {Object} $page The jQuery selector for the current page
     */
    initPasswordFieldsKeyupEvent: function($page) {

        'use strict';

        var $passwordField = $page.find('.password-input');
        var $confirmPasswordField = $page.find('.password-confirm-input');
        var $button = $page.find('.update-password-button');
        var $allFields = $passwordField.add($confirmPasswordField);

        // Add keyup event to the input fields
        $allFields.rebind('keyup.buttonenable', function(event) {

            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // Change the button to red to enable it if they have entered something in all the fields
            if (password.length > 0 && confirmPassword.length > 0) {

                // Activate the button
                $button.addClass('active');

                // If the Enter key is pressed try updating
                if (event.which === 13) {
                    $button.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $button.removeClass('active');
            }
        });
    },

    /**
     * Load the ZXCVBN password strength estimator library
     * @param {Object} $page The jQuery selector for the current page
     */
    initPasswordEstimatorLibrary: function($page) {

        'use strict';

        // Make sure the library is loaded
        if (typeof zxcvbn === 'undefined') {

            // Show loading spinner
            var $loader = $page.find('.estimator-loading-icon').addClass('loading');

            // On completion of loading, hide the loading spinner
            M.require('zxcvbn_js')
                .done(function() {
                    $loader.removeClass('loading');
                });
        }
    },

    /**
     * Show what strength the currently entered password is on keyup
     * @param {Object} $page The jQuery selector for the current page
     */
    initPasswordStrengthCheck: function($page) {

        'use strict';

        var $passwordStrengthBar = $page.find('.password-strength');
        var $passwordInput = $page.find('.estimator-password-input');

        // Add keyup event to the password text field
        $passwordInput.rebind('keyup.passwordstrengthcheck', function() {

            // Make sure the ZXCVBN password strength estimator library is loaded first
            if (typeof zxcvbn !== 'undefined') {

                // Estimate the password strength
                var password = $.trim($passwordInput.val());
                var passwordScore = zxcvbn(password).score;
                var passwordLength = password.length;

                // Remove previous strength classes that were added
                $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

                // Add colour coding
                if (passwordLength === 0) {
                    return false;
                }
                else if (passwordLength < security.minPasswordLength) {
                    $passwordStrengthBar.addClass('good1');    // Too short
                }
                else if (passwordScore === 4) {
                    $passwordStrengthBar.addClass('good5');    // Strong
                }
                else if (passwordScore === 3) {
                    $passwordStrengthBar.addClass('good4');    // Good
                }
                else if (passwordScore === 2) {
                    $passwordStrengthBar.addClass('good3');    // Medium
                }
                else if (passwordScore === 1) {
                    $passwordStrengthBar.addClass('good2');    // Weak
                }
                else {
                    $passwordStrengthBar.addClass('good1');    // Very Weak
                }
            }
        });
    },

    /**
     * Make back button works as closing overlay.
     * @param {Object} $overlay target overlay
     */
    initOverlayPopstateHandler: function($overlay) {

        'use strict';

        history.pushState({ subpage: page }, "", "/" + page);

        var $closeBtn = $overlay.find('.close-button, .cancel, .fm-dialog-close');

        $(window).rebind('popstate.mega-mobile', function() {
            
            $closeBtn.trigger('tap');
            $(this).off('popstate.mega-mobile');
        });
    },

    /**
     *  Make maxlength work on input with type number.
     */
    initNumberMaxlength: function($page) {

        'use strict';

        $('input[type="number"][maxlength]', $page).rebind('keydown.applyMaxlength', function(e) {

            if (this.value.length === parseInt($(this).attr('maxlength'))
                && ((e.keyCode >= 48 && e.keyCode <= 57)
                || (e.keyCode >= 96 && e.keyCode <= 105))
                || e.keyCode === 69) {
                e.preventDefault();
            }
        });
    }
};


mBroadcaster.once('startMega:mobile', function() {
    'use strict';

    var getOrientation = function() {
        return !window.orientation || window.orientation === 180 ? 'portrait' : 'landscape';
    };

    $(window).on('orientationchange.moboc', function(ev) {
        mobile.orientation = ev.orientation || getOrientation();

        if (dlmanager.isOverQuota) {
            onIdle(function() {
                var $dialog = $('.fm-dialog.limited-bandwidth-dialog');

                if (mobile.orientation === 'landscape') {
                    $('.speedometer.full', $dialog).removeClass('big-104px-icon');
                }
                else {
                    $('.speedometer.full', $dialog).addClass('big-104px-icon');
                }
            });
        }
        mBroadcaster.sendMessage('orientationchange', mobile.orientation);
    });

    mobile.orientation = getOrientation();
});

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
    preMoveCheck: function(handles, target) {
        var sel = Array.isArray(handles) ? handles : [handles];
        var p = new MegaPromise();
        p.resolve(sel, target);
        return p;
    },
    isDropExist: function (sel) { return mobile.megadrop.isDropExist(sel); }
};

var notify = {
    init: function() {},
    notifyFromActionPacket: function() {},
    countAndShowNewNotifications: function() {},
    closePopup: function() {},
    markAllNotificationsAsSeen: function() {}
};

var alarm = {
    overQuota: {
        render: function() {}
    },
    ephemeralSession: {
        render: function() {}
    },
    nonActivatedAccount: {
        render: function() {}
    },
    planExpired: {
        lastPayment: null,
        render: function() {}
    },
    siteUpdate: {
        init: function() {}
    }
};

/* jshint strict: true */

function accountUI() {
    'use strict';
    loadSubPage('fm/account');
}

accountUI.session = {
    update: function() {

        'use strict';

        mobile.account.history.fetchSessionHistory();
    }
};

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    'use strict';

    // Call the mobile version
    mobile.messageOverlay.show(msg, submsg, callback);
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

/** slimmed down version adapted from fm.js's (desktop) closeDialog() */
function closeDialog() {
    'use strict';

    if (d) {
        MegaLogger.getLogger('closeDialog').debug($.dialog);
    }

    fm_hideoverlay();
    $('.fm-dialog').trigger('dialog-closed').addClass('hidden');
    $('.fm-dialog, .overlay.arrange-to-back').removeClass('arrange-to-back');

    delete $.dialog;
    mBroadcaster.sendMessage('closedialog');
}

mega.ui.showRegisterDialog = function() {};

/**
 * Shim for sendSignupLinkDialog, likely called from showOverQuotaRegisterDialog
 * @param {Object} accountData The registration vars in localStorage.awaitingConfirmationAccount
 */
mega.ui.sendSignupLinkDialog = function(accountData) {

    'use strict';

    parsepage(pages['mobile']);
    mobile.register.showConfirmEmailScreen(accountData);
    topmenuUI();
};

mega.loadReport = {};
var previews = {};
var preqs = Object.create(null); // FIXME: mobile needs to use preqs[] to prevent dupe requests sent to API!

function removeUInode(nodeHandle, parentHandle) {

    'use strict';

    // Call the mobile version
    mobile.cloud.renderDelete(nodeHandle, parentHandle);
}

function showToast(type, msg) {
    'use strict';
    mobile.showToast(msg);
}

// Not required for mobile
function fmtopUI() {}
function sharedUInode() {}
function addToMultiInputDropDownList() {}
function removeFromMultiInputDDL() {}
function slideshow_handle() {}
function dashboardUI() {}
accountUI.account = {
    renderBirthYear: function() {},
    renderBirthMonth: function() {},
    renderBirthDay: function() {},
    renderCountry: function() {},
    renderRubsched: function() {},
};
/* jshint +W098 */
/* jshint +W007 */
