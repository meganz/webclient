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
     * Load the `mobile.html` page and initialize the main menu.
     */
    initDOM: function() {
        'use strict';
        parsepage(pages['mobile']);
        topmenuUI();
    },

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

            // Hide current page
            $page.addClass('hidden');

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
     * Initialise the back arrow icon in the header to go back to a specific page without URL
     * @param {Object} $page The jQuery selector for the current page
     * @param {Object} $page The jQuery selector for the previuos page
     */
    initStepBackButton: function($page, $targetPage) {

        'use strict';

        // Unhide back button, then add on click/tap handler
        $('.fm-icon.back', $page).removeClass('hidden').rebind('tap', function() {

            // If page to go back to is specified, show that and hide current one
            if (typeof $targetPage === 'object') {

                // Hide current page
                $page.addClass('hidden');

                // Show previous page
                $targetPage.removeClass('hidden');
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
     * @param {String|jQuery} container The container class name which contains the checkbox input and label
     */
    initCheckbox: function(container) {

        'use strict';

        var $container = container instanceof jQuery ? container : $('.mobile.' + container);
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
                window.open('/terms', '_blank');
            }

            // Prevent double clicks
            return false;
        });
    },

    /**
     * Initialize a toggle switch in mobile web.
     * @param $container
     * @param startingValue
     * @param onChange
     */
    initSwitch: function ($container, startingValue, onChange) {
        'use strict';

        var self = this;

        // Set inital state.
        this.setSwitch($container, startingValue);

        // Handle change event.
        $container.off('tap').on('tap', function () {
            var newState = self.toggleSwitch($container);
            if (typeof onChange === 'function') {
                onChange(newState);
            }
            return false;
        });
    },

    /**
     * Toggle a feature toggle switch to the opposite state.
     * @param $container
     */
    toggleSwitch: function($container) {
        'use strict';

        if ($container.hasClass('toggle-on')) {
            $container.removeClass('toggle-on');
            return 0;
        } else {
            $container.addClass('toggle-on');
            return 1;
        }
    },

    /**
     * Set a feature toggle switch to a given state.
     * @param $container
     * @param state
     */
    setSwitch: function($container, state) {
        'use strict';

        if (state) {
            $container.addClass('toggle-on');
        } else {
            $container.removeClass('toggle-on');
        }
    },

    /**
     * Initialise the MEGA icon on various pages to go back to the homepage or cloud drive
     */
    initHeaderMegaIcon: function() {

        'use strict';

        var $megaIcon = $('.mobile.fm-icon.mega');
        var $overlay = $('.nav-overlay', 'body');

        // On Mega icon click
        $megaIcon.off('tap').on('tap', function() {
            $overlay.addClass('hidden');

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

        // Assgn history to make back button working
        pushHistoryState(page);

        $(window).rebind('popstate.mega-mobile', function() {
            $(this).off('popstate.mega-mobile');
            history.back();
            $('.light-overlay').addClass('hidden');
            $('.mobile.common-check-email-dialog').addClass('hidden');
            $('#startholder').removeClass('no-scroll');
        });
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
        // Remove previous strength classes that were added
        $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

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

        pushHistoryState(page);

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
    },

    updFileManagerUI: function() {

        'use strict';

        var UImain = false;

        if (d) {
            console.time('rendernew');
        }

        var countUpdNodes = {};
        var promises = [];
        var seenByCountUpd = {};

        var _setCountUpdNode = promisify(function(resolve, reject, node) {

            var promise = MegaPromise.resolve();

            if (!M.d[node.p]) {
                promise = dbfetch.get(node.p);
            }

            promise.always(function() {

                var parents = M.getPath(node.h);
                var pIndex = parents.indexOf(M.currentdirid);
                var pInCurrentView = parents[--pIndex];

                if (pIndex > -1 && !countUpdNodes[pInCurrentView]) {
                    countUpdNodes[pInCurrentView] = M.d[pInCurrentView];
                }

                resolve(node.h);
            });
        });

        for (var i = newnodes.length; i--;) {

            var newNode = newnodes[i];

            if (newNode.p === this.currentdirid || newNode.h === this.currentdirid) {
                UImain = M.v.length || !mobile.uploadOverlay.uploading;
            }

            if (!seenByCountUpd[newNode.p]) {

                seenByCountUpd[newNode.p] = 1;
                promises.push(_setCountUpdNode(newNode));
            }
        }

        Promise.allSettled(promises).always(function() {

            countUpdNodes = Object.values(countUpdNodes);

            if (countUpdNodes.length) {
                mobile.cloud.countAndUpdateSubFolderTotals(countUpdNodes);
            }
        });

        var masterPromise = new MegaPromise();

        if (d) {
            console.log('rendernew, dir=%s, root=%s, mode=%d', this.currentdirid, this.currentrootid, this.viewmode);
            console.log('rendernew.stat', UImain);
        }

        var renderPromise = MegaPromise.resolve();

        if (UImain) {
            if (M.v.length) {
                var emptyBeforeUpd = M.v.length === 0;
                M.filterByParent(M.currentdirid);
                M.sort();
                M.renderMain(!emptyBeforeUpd);
            }
            else {
                renderPromise = M.openFolder(M.currentdirid, true);
            }
        }

        renderPromise.always(function() {

            if (UImain) {
                mBroadcaster.sendMessage('mediainfo:collect');
                $.tresizer();
            }

            if (d) {
                console.timeEnd('rendernew');
            }

            masterPromise.resolve();
        });

        newnodes = [];
        return masterPromise;
    }
};

mBroadcaster.once('fm:initialized', function () {
    'use strict';

    if (!isMobile) {
        // not neccessary check, but to make sure.
        return;
    }

    var $banner;
    if (u_attr && u_attr.b) {
        if (u_attr.b.m) {
            var msg = '';

            if (u_attr.b.s === -1) { // expired
                if (u_attr.b.m) {
                    msg = l[20400].replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
                        .replace('[A]', '<a href="/registerb" class="clickurl">').replace('[/A]', '</a>');
                }
                else {
                    msg = l[20462];
                }

                $banner = mobile.alertBanner.showError(msg);
                $banner.$alertBanner.addClass('business');
                $banner.$alertBanner.off('tap').on('tap', function() { loadSubPage('registerb'); });
            }
            else if (u_attr.b.s === 2) { // grace
                if (u_attr.b.m) {
                    msg = l[20650].replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
                        .replace('[A]', '<a href="/registerb" class="clickurl">').replace('[/A]', '</a>');
                    $banner = mobile.alertBanner.showWarning(msg);
                    $banner.$alertBanner.addClass('business');
                    $banner.$alertBanner.off('tap').on('tap', function() { loadSubPage('registerb'); });
                }
            }
        }
        else { // not master user
            if (u_attr.b.s === -1) { // expired
                $banner = mobile.alertBanner.showError(l[20462]);
                $banner.$alertBanner.addClass('business');
                $banner.$alertBanner.off('tap').on('tap', function() { loadSubPage('registerb'); });
            }
        }

    }
});

mBroadcaster.once('startMega:mobile', function() {
    'use strict';

    var getOrientation = function() {
        return !window.orientation || window.orientation === 180 ? 'portrait' : 'landscape';
    };

    var setBodyClass = function() {
        if (mobile.orientation === 'landscape') {
            $('body').addClass('landscape');
        }
        else {
            $('body').removeClass('landscape');
        }
    };

    $(window).on('orientationchange.moboc', function(ev) {
        mobile.orientation = ev.orientation || getOrientation();

        if (d) {
            console.debug('Device orientation changed to "%s"', mobile.orientation);
        }
        setBodyClass();

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

    if (d) {
        console.debug('Device orientation is "%s"', mobile.orientation);
    }
    onIdle(setBodyClass);
});

/**
 * Some stubs to prevent exceptions in action packet processing because not all files are loaded for mobile
 */
/* eslint-disable strict */

mega.tpw = {
    addDownloadUpload: function() {},
    updateDownloadUpload: function() {},
    finishDownloadUpload: function() {},
    errorDownloadUpload: function() {},
    pauseDownloadUpload: function() {},
    resumeDownloadUpload: function() {},
    removeRow: function() {},
    showWidget: function() { return false;},
    resetErrorsAndQuotasUI: function() {
        'use strict';
        return false;
    },
    isWidgetVisibile: function() {
        'use strict';
        return false;
    },
    hideWidget: function() {},
    clearRows: function() {}
};

var nicknames = {
    cache: {},
    // eslint-disable-next-line no-empty-function
    getNickname: function() {},
    getNicknameAndName: function() {},
    decryptAndCacheNicknames: function() {},
    updateNicknamesFromActionPacket: function() {}
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
    },
    hideAllWarningPopups: function() {}
};

function accountUI() {
    'use strict';

    if (fminitialized && u_type && page === 'fm/account/notifications') {
        mobile.initDOM();
        mobile.account.notifications.init();
    } else {
        loadSubPage('fm/account');
    }
}

accountUI.session = {
    update: function() {

        'use strict';

        mobile.account.history.fetchSessionHistory();
    }
};

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    'use strict';

    // Some webclient calls require callback to return the selected option as a boolean. Hence two callbacks.
    // Call the mobile version
    mobile.messageOverlay.show(
        msg,
        submsg,
        function() {
            if (typeof callback === 'function') {
                callback(true);
            }
        },
        function() {
            if (typeof callback === 'function') {
                callback(false);
            }
        }
    );
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
    $('.fm-dialog, .fm-dialog-mobile').trigger('dialog-closed').addClass('hidden');
    $('.fm-dialog, .overlay.arrange-to-back, .fm-dialog-mobile').removeClass('arrange-to-back');

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

function fm_tfsupdate() {
    'use strict';
    var overlay = document.querySelector('.mobile.upload-overlay');
    var table = overlay.querySelector('.mobile-transfer-table');

    if (M.pendingTransfers) {
        // Move completed transfers to the bottom
        var domCompleted = table.querySelectorAll('tr.transfer-completed');
        var completedLen = domCompleted.length;
        if (completedLen) {
            var first = domCompleted[0];
            var last = domCompleted[completedLen - 1];

            if (!first.previousElementSibling || last.nextElementSibling) {
                var parent = first.parentNode;
                while (completedLen--) {
                    parent.appendChild(domCompleted[completedLen]);
                }
            }
        }
    }

    M.pendingTransfers = table.querySelectorAll('tr:not(.transfer-completed)').length;

    if (M.pendingTransfers && ul_queue.length > 1) {
        var val = ul_queue.length - M.pendingTransfers + 1;

        overlay.classList.add('see-all');
        overlay.querySelector('.ul-status-header span')
            .textContent = l[1155] + ' ' + String(l[1607]).replace('%1', val).replace('%2', ul_queue.length);
    }

    var speed = 0;
    for (var p in GlobalProgress) {
        if (p[0] === 'u') {
            speed += GlobalProgress[p].speed | 0;
        }
    }

    overlay.querySelector('.folders-files-text')
        .textContent = String(l[23182]).replace('%d', M.pendingTransfers).replace('%s', bytesToSize(speed, 1));
}

function removeUInode(nodeHandle, parentHandle) {

    'use strict';

    // Call the mobile version
    mobile.cloud.renderDelete(nodeHandle, parentHandle);
}

function showToast(type, msg) {
    'use strict';
    mobile.showToast(msg);
}

function bottomPageDialog() {
    'use strict';
    // TODO: mobile version
    loadSubPage('fm');
}

function previewimg() {
    'use strict';
    console.warn('TBD, watch 99665');
}

function openRecents() {
    'use strict';
    loadSubPage('fm');
}

/* eslint-disable strict, no-empty-function */

// Not required for mobile
function fmtopUI() {}
function fmLeftMenuUI() {}
function sharedUInode() {}
function addToMultiInputDropDownList() {}
function removeFromMultiInputDDL() {}
function slideshow_handle() {}
function dashboardUI() {}
function affiliateUI() {}
accountUI.account = {
    renderBirthYear: function() {},
    renderBirthMonth: function() {},
    renderBirthDay: function() {},
    renderCountry: function() {},
    renderRubsched: function() {},
};

/** Global function to be used in mobile mode, checking if the action can be taken by the user.
 * It checks the user validity (Expired business, or ODQ Paywall)
 * @param   {Boolean} hideContext   Hide context menu
 * @returns {Boolean}               True if the caller can proceed. False if not
 */
function validateUserAction(hideContext) {
    if (mega.paywall) {
        if (u_attr.b && u_attr.b.s === -1) {
            if (u_attr.b.m) {
                msgDialog('warningb', '', l[20401], l[20402]);
            }
            else {
                msgDialog('warningb', '', l[20462], l[20463]);
            }
            return false;
        }
        else if (u_attr.uspw) {
            if (hideContext) {
                mobile.cloud.contextMenu.hide();
            }
            M.showOverStorageQuota(EPAYWALL);
            return false;
        }
    }
    return true;
}

// eslint-disable-next-line no-useless-concat
window['slide' + 'show'] = function(h, close) {
    if (close) {
        mobile.slideshow.close();
    }
    else {
        mobile.slideshow.init(h);
    }
};
