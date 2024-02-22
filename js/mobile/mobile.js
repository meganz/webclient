/* eslint-disable strict, no-empty-function, no-useless-concat */

/**
 * Root namespace for the mobile web site, contains common variables and functions
 */
var mobile = {

    /** The base path for images */
    imagePath: staticpath + 'images/mobile/extensions/',

    shim(ctx) {

        'use strict';

        const value = () => MegaPromise.resolve();

        Object.defineProperty(ctx, 'search' + 'Path', {value});
        Object.defineProperty(ctx, 'abort' + 'Transfers', {value});
        Object.defineProperty(ctx, 'init' + 'UIKeyEvents', {value});

        Object.defineProperty(ctx, 'initFile' + 'ManagerUI', {
            value: function() {

                MegaMobileHeader.init();
                MegaMobileFooter.init();
                MegaMobileEmptyState.init();
                MegaMobileViewOverlay.init();

                if (typeof window.InitFileDrag === 'function') {
                    window.InitFileDrag();
                    delete window.InitFileDrag;
                }
            }
        });
        mobile.uploadOverlay.shim(ctx);

        Object.defineProperty(ctx, 'addWeb' + 'Download', {
            value: function(nodes) {
                // @see filesystem.js/abortAndStartOver
                if (d) {
                    console.assert(Array.isArray(nodes) && nodes.length === 1 && arguments.length === 1, 'bogus usage');
                }
                M.resetUploadDownload();
                later(() => {
                    mobile.downloadOverlay.startDownload(nodes[0]);
                });
            }
        });

        Object.defineProperty(ctx, 'show' + 'OverStorageQuota', {
            async value(data, options) {
                // only one call in M.checkGoingOverStorageQuota is expecting a promise
                if (options) {
                    // cannot complete the action
                    delay('cannot-complete-action', () => {
                        mega.ui.sheet.show({
                            name: 'going-over-storage',
                            type: 'modal',
                            showClose: true,
                            icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                            title: l.cannot_complete_action,
                            contents: [l.cannot_complete_action_msg],
                            actions: [
                                {
                                    type: 'normal',
                                    text: l[433],
                                    className: 'primary',
                                    onClick: () => {
                                        mega.ui.sheet.hide();
                                        loadSubPage('pro');
                                    }
                                }
                            ]
                        });
                    }, 50);

                    return Promise.reject();
                }

                if (data && (data === EPAYWALL || (data.isFull && Object(u_attr).uspw))) {
                    data = Object.create(null);
                    data.isFull = data.isAlmostFull = data.EPAYWALL = true;
                }

                if (data.isAlmostFull) {
                    ulmanager.ulOverStorageQuota = true;

                    var action = function() {
                        if (data.EPAYWALL) {
                            if (!M.account) {
                                M.accountData(() => {
                                    action();
                                });

                                return;
                            }

                            var overlayTexts = odqPaywallDialogTexts(u_attr || {}, M.account);
                            const bannerMsg = overlayTexts.fmBannerText
                                .replace('<a href="/pro" class="clickurl">', '<strong>').replace('</a>', '</strong>')
                                .replace('<span>', '').replace('</span>', '');

                            const banner = mobile.banner.show('', parseHTML(bannerMsg), '', 'error',
                                                              false, undefined, true);
                            banner.on('cta', () => loadSubPage('pro'));

                            mega.ui.sheet.hide();

                            const inlineAd = mobile.inline.alert.create({
                                parentNode: mega.ui.sheet.contentNode,
                                componentClassname : 'error',
                                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                                text: parseHTML(overlayTexts.dlgFooterText.replaceAll('span', 'strong')),
                                closeButton: false
                            });

                            mega.ui.sheet.show({
                                name: 'full-storage-data-risk',
                                type: 'modal',
                                showClose: true,
                                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline error',
                                title: l[16360],
                                contents: [overlayTexts.dialogText, inlineAd.domNode],
                                actions: [
                                    {
                                        type: 'normal',
                                        text: l.upgrade_now,
                                        className: '',
                                        onClick: () => {
                                            mega.ui.sheet.hide();
                                            loadSubPage('pro');
                                        }
                                    }
                                ]
                            });
                        }
                        else if (mega.ui.sheet.name !== 'resume-download') { // don't proceed if resume dialog is open
                            if (data.isFull) {
                                mobile.overStorageQuota.show();
                            }
                            else {
                                ulmanager.ulOverStorageQuota = false;
                                const banner = mobile.banner.show(
                                    l.storage_almost_full, l.storage_almost_full_msg, l.upgrade_now, 'warning', true);
                                banner.on('cta', () => {
                                    mega.ui.sheet.hide();
                                    loadSubPage('pro');
                                });

                                mega.ui.sheet.show({
                                    name: 'almost-full-storage',
                                    type: 'modal',
                                    showClose: true,
                                    icon: 'sprite-mobile-fm-mono icon-alert-circle-thin-outline icon warning',
                                    title: l.storage_almost_full,
                                    contents: [l.storage_full_sheet_msg],
                                    actions: [
                                        {
                                            type: 'normal',
                                            text: l.earn_storage,
                                            className: 'secondary',
                                            onClick: () => {
                                                mega.ui.sheet.hide();
                                                loadSubPage('fm/account/achievements');
                                            }
                                        },
                                        {
                                            type: 'normal',
                                            text: l.upgrade_now,
                                            className: 'primary',
                                            onClick: () => {
                                                mega.ui.sheet.hide();
                                                loadSubPage('pro');
                                            }
                                        }
                                    ]
                                });
                            }
                        }
                    };

                    if (!pro.membershipPlans || !pro.membershipPlans.length) {
                        pro.loadMembershipPlans(action);
                    }
                    else {
                        action();
                    }
                }
            }
        });

        Object.defineProperty(ctx, 'render' + 'Main', {
            value: function(aUpdate) {

                if (d) {
                    console.time('renderMain');
                }

                if (!aUpdate) {
                    if (this.megaRender) {
                        this.megaRender.destroy();
                    }

                    // Clear startholder - temp. fix until startholder pages are revamped
                    document.getElementById('startholder').textContent = '';

                    const render = mobile.nodeSelector.active ? MobileSelectionRender : MobileMegaRender;

                    this.megaRender = new render();
                }
                else if (!this.megaRender) {

                    console.timeEnd('renderMain');
                    return;
                }

                if (aUpdate) {
                    mobile.cloud.renderUpdate();
                }
                else {
                    mobile.cloud.renderLayout();
                }

                if (M.v.length) {
                    fm_thumbnails();
                }

                if (d) {
                    console.timeEnd('renderMain');
                }

                return true;
            }
        });

        Object.defineProperty(ctx, 'updFile' + 'ManagerUI', {value: mobile.updFileManagerUI});
        Object.defineProperty(ctx, 'onFolderSize' + 'ChangeUIUpdate', {value: mobile.onFolderSizeChangeUIUpdate});

        Object.defineProperty(ctx, 'favourite' + 'DomUpdate', {
            value: function(node) {

                const component = MegaMobileNode.getNodeComponentByHandle(node.h);

                if (component) {
                    component.update('fav');
                }

                const {n} = M.sortmode || {};

                if (node.p === M.currentdirid && n === 'fav') {

                    const domNode = M.megaRender && M.megaRender.nodeMap[node.h] || document.getElementById(node.h);

                    this.updateDomNodePosition(node, domNode);
                }
            }
        });

        Object.defineProperty(ctx, 'labelDo' + 'mUpdate', {
            value: function(h) {

                const component = MegaMobileNode.getNodeComponentByHandle(h);
                const node = M.d[h] || false;

                if (component) {
                    component.update('lbl');
                }

                const {n} = M.sortmode || {};

                if (node.p === M.currentdirid && n === 'label') {

                    const domNode = M.megaRender && M.megaRender.nodeMap[h] || document.getElementById(h);

                    this.updateDomNodePosition(node, domNode);
                }
            }
        });

        Object.defineProperty(ctx, 'onRename' + 'UIUpdate', {
            value: function(h) {

                const component = MegaMobileNode.getNodeComponentByHandle(h);
                const node = M.d[h] || false;

                if (component) {
                    component.update('name');
                }

                const {n} = M.sortmode || {};

                if (node.p === M.currentdirid && n === 'name') {

                    const domNode = M.megaRender && M.megaRender.nodeMap[h] || document.getElementById(h);

                    this.updateDomNodePosition(node, domNode);
                }
            }
        });

        // Trimmed version of doSort that only save sorting
        Object.defineProperty(ctx, 'doS' + 'ort', {
            value: function(n, d) {

                this.sortmode = {n: n, d: d};

                if (typeof this.sortRules[n] === 'function') {
                    this.sortRules[n](d);

                    if (this.fmsorting) {
                        mega.config.set('sorting', this.sortmode);
                    }
                    else {
                        fmsortmode(this.currentdirid, n, d);
                    }
                }
                else if (d) {
                    console.warn("Cannot sort by " + n);
                }
            }
        });
        Object.defineProperty(ctx, 'show' + 'PaymentCardBanner', {
            value: function(status) {

                if (!status) {
                    return;
                }

                let bannerTitle;
                let bannerDialog = u_attr && u_attr.b ? l.payment_card_update_details_b : l.payment_card_update_details;

                // Expires next month (only show after the 15th of the current month)
                if (status === 'expNextM') {
                    bannerTitle = l.payment_card_exp_nxt_mnth;
                }
                // Expires this month
                else if (status === 'expThisM') {
                    bannerTitle = l.payment_card_almost_exp;
                }
                // Expired
                else if (status === 'exp') {
                    bannerTitle = l.payment_card_exp_title;
                    bannerDialog = u_attr && u_attr.b ? l.payment_card_at_risk_b : l.payment_card_at_risk;
                }

                const banner = mobile.banner.show(
                    bannerTitle,
                    bannerDialog,
                    l.update_card,
                    status === 'exp' ? 'error' : 'warning',
                    false);
                banner.on('cta', () => loadSubPage('fm/account/paymentcard'));
            }
        });

        Object.defineProperty(ctx, 'checkLe' + 'ftStorageBlock', {value: nop});

        const tf = [
            "renderTree", "buildtree", "initTreePanelSorting",
            "treePanelType", "addTreeUI", "addTreeUIDelayed", "onTreeUIExpand", "onTreeUIOpen",
            "treeSortUI", "treeFilterUI"
        ];

        for (let i = tf.length; i--;) {
            Object.defineProperty(ctx, tf[i], {value});
        }
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
                mega.redirect('mega.io', '/terms', false, false, false);
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

        var $otherPages = $('#fmholder > div:not(.top-menu-popup)');
        var $excludes = $('.mobile.file-manager-block, .mobile.top-menu-popup, .mega-header, .mega-top-menu, '
            + '.mobile-rack' , '#mainlayout');

        // If logged in
        if (typeof u_attr !== 'undefined') {

            // Hide other pages that may be showing and show the cloud drive and necessary pages
            $otherPages.addClass('hidden');
            $excludes.removeClass('hidden');

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
        $appStoreButton.attr('href', getMobileStoreLink());

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
     * Load the ZXCVBN password strength estimator library
     * @param {Object} $page The jQuery selector for the current page
     */
    initPasswordEstimatorLibrary: function($page) {

        'use strict';

        // Make sure the library is loaded
        if (typeof zxcvbn === 'undefined') {

            // Show loading spinner (for mobile web)
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

    initPasswordVisibleToggle: $page => {

        'use strict';

        const $parent = $('input[type="password"]', $page).parent();

        if ($('i.pass-visible', $parent).length === 0) {

            $('input[type="password"]', $page).parent()
                .safeAppend('<i class="sprite-fm-mono icon-eye-reveal pass-visible"></i>');
        }

        $('.pass-visible', $page).rebind('click.togglePassV', function() {

            if (this.classList.contains('icon-eye-reveal')) {

                $('input[type="password"]', this.parentNode).attr('type', 'text');
                if ($('input', this.parentNode).attr('style')) {
                    $('input', this.parentNode).attr('style', '-webkit-text-security: none;');
                }
                this.classList.remove('icon-eye-reveal');
                this.classList.add('icon-eye-hidden');
            }
            else {
                $('input[type="text"]', this.parentNode).attr('type', 'password');
                if ($('input', this.parentNode).attr('style')) {
                    $('input', this.parentNode).attr('style', '-webkit-text-security: disc;');
                }
                this.classList.add('icon-eye-reveal');
                this.classList.remove('icon-eye-hidden');
            }
        });
    },

    /**
     * Make back button works as closing overlay.
     * @param {Object} $overlay target overlay
     */
    initOverlayPopstateHandler: function($overlay) {

        'use strict';

        pushHistoryState();

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

        for (var i = newnodes.length; i--;) {

            var newNode = newnodes[i];

            if (newNode.p === this.currentdirid
                || newNode.h === this.currentdirid
                || newNode.su && this.currentdirid === 'shares'
                || newNode.p === this.currentCustomView.nodeID
                || newNode.h === this.currentCustomView.nodeID
            ) {
                UImain = M.v.length || !ulmanager.isUploading;
            }
        }

        var masterPromise = new MegaPromise();

        if (d) {
            console.log('rendernew, dir=%s, root=%s, mode=%d', this.currentdirid, this.currentrootid, this.viewmode);
            console.log('rendernew.stat', UImain);
        }

        var renderPromise = MegaPromise.resolve();

        if (UImain) {
            if (M.v.length) {
                var emptyBeforeUpd = M.v.length === 0;
                M.filterByParent(this.currentCustomView.nodeID || M.currentdirid);
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
    },

    onFolderSizeChangeUIUpdate(node) {
        'use strict';

        var p = this.viewmode === 0 && this.currentdirid || false;
        if (p && String(p).slice(-8) === node.p || M.currentCustomView) {
            mobile.cloud.countAndUpdateSubFolderTotals(node);
        }
    }
};

mBroadcaster.once('startMega:mobile', function() {
    'use strict';

    var getOrientation = function() {
        return !window.orientation || window.orientation === 180 ? 'portrait' : 'landscape';
    };

    // Add mobile class for adaptive features
    document.body.classList.add('mobile');

    var setBodyClass = function() {

        if (mobile.orientation === 'landscape') {
            document.body.classList.add('landscape');
        }
        else {
            document.body.classList.remove('landscape');
        }
    };

    $(window).on('orientationchange.moboc', function(ev) {
        mobile.orientation = ev.orientation || getOrientation();

        if (d) {
            console.debug('Device orientation changed to "%s"', mobile.orientation);
        }
        setBodyClass();

        mBroadcaster.sendMessage('orientationchange', mobile.orientation);
    });

    mobile.orientation = getOrientation();

    if (d) {
        console.debug('Device orientation is "%s"', mobile.orientation);
    }
    onIdle(setBodyClass);

    if (is_android) {

        document.documentElement.style.height = window.innerHeight + 'px';

        $(window).rebind('resize.htmlheight', function() {
            document.documentElement.style.height = window.innerHeight + 'px';
        });
    }
});

/**
 * Some stubs to prevent exceptions in action packet processing because not all files are loaded for mobile
 */

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

var notify = {
    init: function() {},
    async notifyFromActionPacket() {
    },
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

    if (!fminitialized || !u_type || !page.startsWith('fm/account')) {
        return loadSubPage('start');
    }

    const fmBlock = document.querySelector('#fmholder .file-manager-block');
    if (fmBlock) {
        fmBlock.classList.add('hidden');
    }
    mega.ui.emptyState.hide();

    if (mobile.settingsHelper && mobile.settingsHelper.currentPage) {
        mobile.settingsHelper.currentPage.hide();
    }

    // Subpath to reduce processing
    const subpath = page.substr(11);

    mega.ui.toast.rack.removeClass('above-fab', 'above-btn', 'above-actions');

    if (page === 'fm/account/settings') {
        mobile.settings.init();
    }
    else if (page === 'fm/account') {
        mobile.settings.account.init();
    }
    else if (subpath === 'invites/how-it-works') {
        loadSubPage('fm/account/invite-friends', 'override');
    }
    else if (subpath === 'invites') {
        mobile.achieve.inviteBonuses.init();
    }
    else if (subpath === 'invite-friends') {
        mobile.achieve.invites.init();
    }
    else if (page === 'fm/refer') {
        mobile.achieve.referrals.init();
    }
    else if (subpath === 'achievements') {
        mobile.achieve.init();
    }
    else if (subpath === 'history') {
        loadSubPage('fm/account/security/session-history', 'override');
    }
    else if (subpath === 'security/session-history') {
        mobile.settings.history.init();
        mega.ui.toast.rack.addClass('above-btn');
    }
    else if (subpath === 'paymentcard') {
        mobile.settings.account.paymentCard.init();
    }
    else if (subpath === 'security/change-password' || subpath === 'email-and-pass') {
        mobile.settings.account.changePassword.init();
    }
    else if (subpath === 'security/change-email') {
        mobile.settings.account.changeEmail.init();
    }
    else if (subpath.startsWith('security/verify')) {
        mobile.settings.account.verifyEmail.init();
    }
    else if (subpath === 'delete') {
        mobile.settings.account.deleteAccount.init();
    }
    else if (subpath.startsWith('delete/verify')) {
        mobile.settings.account.verifyDelete.init();
    }
    else if (subpath === 'notifications') {
        mobile.settings.notifications.init();
    }
    else if (subpath.startsWith('notifications')) {
        loadSubPage('fm/account/notifications', 'override');
    }
    else if (subpath === 'file-management') {
        mobile.settings.fileManagement.init();
    }
    else if (subpath === 'support') {
        mobile.settings.support.init();
    }
    else if (subpath === 'about') {
        mobile.settings.about.init();
    }
    else if (subpath === 'security') {
        mobile.settings.privacyAndSecurity.init();
    }
    else if (subpath === 'security/backup-key') {
        mobile.settings.backupRecovery.init();
    }
    else if (subpath === 'security/lost-auth-device') {
        mobile.settings.account.lostAuthDevice.init();
    }
    else if (subpath === 'security/two-factor-authentication') {
        mobile.settings.account.twofactorSettings.init();
    }
    else if (subpath.startsWith('sms')) {

        if (subpath.includes('add-phone-suspended')) {
            mobile.sms.phoneInput.init();
        }
        else if (subpath.includes('verify-code')) {
            mobile.sms.verifyCode.init();
        }
        else if (subpath.includes('verify-success')) {
            mobile.sms.verifySuccess.init();
        }
        else if (subpath.includes('phone-achievement-intro')) {
            mobile.sms.achievement.init();
        }
        else {
            mobile.sms.phoneInput.init();
        }
    }
    else if (subpath.includes('terms-policies')) {
        mobile.terms.init();
    }
    else if (page === 'fm/account/plan') {
        loadSubPage('fm/account');
    }
    else if (page === 'fm/account/cancel') {
        mobile.settings.account.cancelSubscription.checkSubStatus();
    }
    else {
        loadSubPage('fm/account/settings');
    }
}

function affiliateUI() {

    'use strict';

    if (!fminitialized || !u_type || !page.startsWith('fm/refer')) {
        return loadSubPage('start');
    }

    document.getElementsByClassName('file-manager-block')[0].classList.add('hidden');
    if (mobile.settingsHelper && mobile.settingsHelper.currentPage) {
        mobile.settingsHelper.currentPage.hide();
    }

    if (page === 'fm/refer') {
        mobile.affiliate.initMainPage();
    }
    else if (page === 'fm/refer/redeem') {
        mobile.affiliate.initRedeemPage();
    }
    else if (page === 'fm/refer/guide') {
        mobile.affiliate.initGuidePage();
    }
    else if (page === 'fm/refer/history') {
        mobile.affiliate.initHistoryPage();
    }
    else if (page === 'fm/refer/distribution') {
        mobile.affiliate.initDistributionPage();
    }
    else {
        loadSubPage('fm/refer');
    }
}

accountUI.session = {
    update: function() {

        'use strict';

        mobile.settings.history.updateCallback();
        mobile.settings.account.updateCallback();
    }
};

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
    $('.mega-dialog, .fm-dialog-mobile, .fm-dialog').trigger('dialog-closed').addClass('hidden');
    $('.mega-dialog, .overlay.arrange-to-back, .fm-dialog-mobile, .fm-dialog').removeClass('arrange-to-back');

    delete $.dialog;
    mBroadcaster.sendMessage('closedialog');
}

/** slimmed down version adapted from fm.js's (desktop) closeMsg() */
function closeMsg() {
    'use strict';

    delete $.msgDialog;
    mBroadcaster.sendMessage('msgdialog-closed');
}

window['selectFolder' + 'Dialog'] = () => Promise.resolve(M.RootID);

mega.ui['showReg' + 'isterDialog'] = nop;

/**
 * Shim for sendSignupLinkDialog, likely called from showOverQuotaRegisterDialog
 * @param {Object} accountData The registration vars in localStorage.awaitingConfirmationAccount
 */
mega.ui.sendSignupLinkDialog = function(accountData) {

    'use strict';

    parsepage(pages['mobile']);
    mobile.register.showConfirmEmailScreen(accountData);
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

function sharedUInode(nodeHandle) {
    // t === 1, folder
    if (M.d[nodeHandle] && M.d[nodeHandle].t && M.megaRender) {
        const node = MegaMobileNode.getNodeComponentByHandle(nodeHandle);

        if (node) {
            node.update('icon');
        }
    }
}

/* eslint-disable strict, no-empty-function */

// Not required for mobile
function fmtopUI() {}
function fmLeftMenuUI() {}
function addToMultiInputDropDownList() {}
function removeFromMultiInputDDL() {}
function slideshow_handle() {}
function dashboardUI() {}
function galleryUI() {}
function fm_resize_handler() {}
function fm_tfsupdate() {}
function fingerprintDialog() {}
accountUI.account = {
    renderBirthYear: function() {},
    renderBirthMonth: function() {},
    renderBirthDay: function() {},
    renderCountry: function() {},
    renderRubsched: function() {},
};
contextMenu = {
    create: nop,
    open: nop,
    close: nop
};

function bindDropdownEvents() {}

mega.gallery = {
    sections: {},
    secKeys: {},
    showEmpty: nop,
    updateButtonsStates: nop,
    removeDbActionCache: nop,
    emptyBlock: null,
    albumsRendered: false,
    publicSet: Object.create(null),
    albums: {
        grid: null,
        store: {},
        tree: null,
        disposeAll: nop,
        initPublicAlbum: (parentNode) => {
            const {at, e} = M.d[M.RootID];
            const setAttr = tryCatch(() => tlvstore.decrypt(at, true, base64_to_a32(pfkey)))();

            if (!setAttr) {
                if (d) {
                    console.error('Could not fetch public set data...', e, at);
                }

                loadSubPage('login');
                return;
            }

            const setNodes = [];
            const isCoverSpecified = !!setAttr.c;
            let coverNode = null;

            if (Array.isArray(e)) {
                for (let i = 0; i < e.length; i++) {
                    const {id, h} = e[i];
                    const n = M.d[h];

                    if (n) {
                        setNodes.push(n);

                        if (isCoverSpecified && !coverNode && id === setAttr.c) {
                            coverNode = n;
                        }
                    }
                }
            }

            const elCount = setNodes.length;

            if (!coverNode && elCount) {
                const sort = M.sortByModTimeFn3();
                setNodes.sort((a, b) => sort(a, b, -1));
                coverNode = setNodes[0];
            }

            const coverContainer = document.createElement('div');
            coverContainer.className = 'pcol-cover-container';

            const coverImg = document.createElement('i');

            if (elCount) {
                coverImg.className = 'loading-album-img sprite-mobile-fm-uni mime-image-solid';

                api_getfileattr(
                    { [coverNode.h]: coverNode },
                    0,
                    async(ctx, key, ab) => {
                        if (ab === 0xDEAD || !ab.byteLength) {
                            dump('Cannot generate the cover...');
                            return;
                        }

                        // const blob = await webgl.getDynamicThumbnail(ab, { ats: 1 }).catch(dump);
                        const url = tryCatch(() => mObjectURL([ab], ab.type || 'image/jpeg'))();

                        if (!url) {
                            dump('Cannot generate the cover image...');
                            return;
                        }

                        coverImg.classList.remove('shimmer');
                        coverImg.style.backgroundImage = `url(${url})`;
                    }
                );
            }
            else {
                coverImg.className = 'empty-album-img';
            }

            const countTxt = document.createElement('p');
            countTxt.className = 'album-count-txt';
            countTxt.textContent = mega.icu.format(l.album_items_count, elCount);

            coverContainer.appendChild(coverImg);
            coverContainer.appendChild(countTxt);

            parentNode.append(coverContainer);
        }
    }
};

/** Global function to be used in mobile mode, checking if the action can be taken by the user.
 * It checks the user validity (Expired business, or ODQ Paywall)
 * @returns {Boolean} True if the caller can proceed. False if not
 */
function validateUserAction() {
    if (mega.paywall) {
        if (u_attr.b && u_attr.b.s === -1) {
            if (u_attr.b.m) {
                mega.ui.sheet.show({
                    name: 'bmaster-user-expired',
                    type: 'modal',
                    showClose: true,
                    icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                    title: l[20401],
                    contents: [parseHTML(l[20402])],
                    actions: [
                        {
                            type: 'normal',
                            text: l[20403],
                            className: 'primary',
                            onClick: () => {
                                mega.ui.sheet.hide();
                                loadSubPage('repay');
                            }
                        }
                    ]
                });
            }
            else {
                mega.ui.sheet.show({
                    name: 'bsub-user-expired',
                    type: 'modal',
                    showClose: true,
                    icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                    title: l.bsub_user_account_exp_title,
                    contents: [l.bsub_user_account_exp_msg],
                    actions: [
                        {
                            type: 'normal',
                            text: l[81],
                            className: 'primary',
                            onClick: () => mega.ui.sheet.hide()
                        }
                    ]
                });
            }
            return false;
        }
        else if (u_attr && u_attr.pf && u_attr.pf.s === -1) {
            mega.ui.sheet.show({
                name: 'pro-flexi-suspended',
                type: 'modal',
                showClose: true,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                title: l.pro_flexi_account_suspended_title,
                contents: [parseHTML(l.pro_flexi_account_suspended_description)],
                actions: [
                    {
                        type: 'normal',
                        text: l.pay_and_reactivate,
                        className: 'primary',
                        onClick: () => {
                            mega.ui.sheet.hide();
                            loadSubPage('repay');
                        }
                    }
                ]
            });
            return false;
        }
        else if (u_attr.uspw) {
            M.showOverStorageQuota(EPAYWALL).catch(dump);
            return false;
        }
    }
    return true;
}
