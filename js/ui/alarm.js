/**
 * Various warning triangle popups from the top header. This covers
 * cases for over quota, ephemeral session, non activated accounts
 * after purchase, PRO plan expired warnings and site updates.
 */
var alarm = {

    /**
     * A flag for whether the popup has been seen or not so it won't keep auto showing on new pages
     * 0 = dialog and icon not hidden (they are visible)
     * 1 = dialog hidden but icon still visible (so it can be re-opened)
     * 2 = dialog and icon permanently hidden
     */
    hidden: 0,

    /**
     * Shows the warning popup
     * @param {Object} $button Button which allows to open dialog
     * @param {Object} $dialog The dialog
     */
    showWarningPopup: function($button, $dialog) {

        // If permanently hidden, make sure it stays hidden
        if (alarm.hidden === 2) {
            $button.addClass('hidden').removeClass('active');
            $dialog.addClass('hidden');
        }

        // If they have seen it already, we still want to let them open the dialog
        // So just show the warning icon and they can click to re-show the dialog if they want
        else if (alarm.hidden === 1) {
            $button.removeClass('hidden active');
            $dialog.addClass('hidden');
        }

        // Otherwise auto show the dialog and warning icon
        else {
            $button.removeClass('hidden').addClass('active');
            $dialog.removeClass('hidden');
            topPopupAlign($button, $dialog, 40);
        }
    },

    /**
     * Hides other warning dialogs if they are currently visible so there is no double up
     */
    hideAllWarningPopups: function(leaveButton) {

        'use strict';

        if (!leaveButton) {
            var $buttons = $('.top-icon.warning');
            $buttons.addClass('hidden').removeClass('active');
        }

        var $dialogs = $('.top-warning-popup');
        $dialogs.addClass('hidden');
    },

    /**
     * Adds a click event on the warning icon to hide and show the dialog
     * @param {Object} $button Button which allows to open dialog
     * @param {Object} $dialog The dialog
     */
    initWarningIconButton: function($button, $dialog) {

        // On warning icon click
        $button.rebind('click', function() {

            // If the popup is currently visible
            if (!$dialog.hasClass('hidden')) {

                // Hide the popup
                $dialog.addClass('hidden');
                $button.removeClass('active');

                // Set flag so it doesn't auto show each time
                alarm.hidden = 1;
            }
            else {
                // Otherwise show the popup
                $dialog.removeClass('hidden');
                $button.addClass('active');
                topPopupAlign($button, $dialog, 40);
            }
        });
    },


    /**
     * Shows when the user is over quota
     */
    overQuota: {

        /**
         * Show the popup
         */
        render: function() {

            // Cache lookups
            var $button = $('.top-icon.warning.over-quota');
            var $dialog = $('.top-warning-popup.over-quota');

            // Add button click handler
            this.initUpgradeButton($dialog);

            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($button, $dialog);
            alarm.showWarningPopup($button, $dialog);
        },

        /**
         * Initialises the click handler for the Upgrade Account button
         * @param {Object} $dialog The dialog
         */
        initUpgradeButton: function($dialog) {

            // Redirect to Pro signup page on button click
            $dialog.find('.warning-button').click(function() {

                // Set a flag so it doesn't show each time
                alarm.hidden = 1;

                // Go to the Pro page
                loadSubPage('pro');
            });
        }
    },


    /**
     * Shows when a user has uploaded a file to an ephemeral session
     */
    ephemeralSession: {

        /**
         * Show the popup
         */
        render: function() {

            // Cache lookups
            var $button = $('.top-icon.warning.ephemeral-session');
            var $dialog = $('.top-warning-popup.ephemeral-session');

            // Add button click handler
            this.initRegisterButton($button, $dialog);

            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($button, $dialog);
            alarm.showWarningPopup($button, $dialog);
        },

        /**
         * Initialises the click handler for the Choose button
         * @param {Object} $dialog The dialog
         */
        initRegisterButton: function($button, $dialog) {

            // Redirect to register signup page on button click
            $dialog.find('.warning-button').click(function() {

                // If already registered, but email not confirmed, do nothing
                if (isNonActivatedAccount()) {
                    return false;
                }

                // Set a flag so it doesn't show each time
                alarm.hidden = 1;

                // Hide the dialog and go to register page
                $dialog.addClass('hidden');
                $button.removeClass('active');
                loadSubPage('register');
            });
        }
    },


    /**
     * Shows after creating an ephemeral session, then trying to purchase a Pro plan,
     * then it asks you to register, then continue purchasing the Pro plan, then the
     * popup will show because they still haven't confirmed their email yet
     */
    nonActivatedAccount: {

        /**
         * Show the popup
         * @param {Boolean} recentPurchase Flag to immediately show the popup and log the event
         */
        render: function(recentPurchase) {

            // Cache lookups
            var $button = $('.top-icon.warning.non-activated-account');
            var $dialog = $('.top-warning-popup.non-activated-account');

            // If they just purchased it, log specific event
            if (recentPurchase) {
                megaAnalytics.log('pro', 'showNonActivatedAccountDialog');
            }

            // If the user has previously seen an ephemeral dialog and they closed it,
            // then they purchased a plan then this forces the dialog to popup. This means
            // this dialog always shows so it is an incentive to confirm their email.
            alarm.hidden = 0;

            // Hide other dialogs that may be open
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($button, $dialog);
            alarm.showWarningPopup($button, $dialog);
        }
    },


    /**
     * A helpful PRO plan renewal popup which is shown when their PRO plan has expired
     */
    planExpired: {

        /** All the user's last payment information from the API */
        lastPayment: null,

        /**
         * Show the popup
         */
        render: function() {

            // Cache lookups
            var $button = $('.top-icon.warning.astropay-payment-reminder');
            var $dialog = $('.top-warning-popup.astropay-payment-reminder');

            // If their last payment info is not set by the API, then their plan is not currently expired.
            if (this.lastPayment === null) {
                this.hideRepayWarn($button, $dialog);
                return false;
            }

            // Don't show this dialog if they have already said they don't want to see it again
            if ((typeof this.lastPayment.dontShow !== 'undefined') && (this.lastPayment.dontShow === 1)) {
                this.hideRepayWarn($button, $dialog);
                return false;
            }

            // If they recently upgraded to Pro in this session, don't render the icon & dialog
            if (typeof u_attr !== 'undefined' && u_attr.p > 0) {
                this.hideRepayWarn($button, $dialog);
                return false;
            }

            // Ignored payment provider IDs (not applicable or no longer in use)
            var gatewayIgnoreList = [1, 2, 3, 7, 8, 13];
            var gatewayId = this.lastPayment.gw;

            // Don't display the popup for Apple or Google as they are recurring subscriptions. If the lastPayment is
            // set then it means they have purposefully cancelled their account and would not want to see any warnings.
            if (gatewayIgnoreList.indexOf(gatewayId) > -1) {
                return false;
            }

            // Get PRO plan name e.g. PRO III
            var proNum = this.lastPayment.p;
            var proPlanName = pro.getProPlanName(proNum);

            // Convert the timestamps to yyyy-mm-dd format
            var purchasedDate = this.formatTimestampToDate(this.lastPayment.ts);
            var expiryDate = this.formatTimestampToDate(this.lastPayment.exts);

            // Work out the number of months their previous plan was for e.g. 1 month or 3 months
            var planMonths = this.lastPayment.m;
            var planMonthsPluralisation = (planMonths > 1) ? l[6788] : l[913];

            // Get the display name, if it's an Astropay subgateway, then it will have it's own display name
            var gatewayInfo = pro.getPaymentGatewayName(gatewayId);
            var extraData = (typeof this.lastPayment.gwd !== 'undefined') ? this.lastPayment.gwd : null;
            var gatewayName = (extraData) ? extraData.gwname : gatewayInfo.name;
            var gatewayDisplayName = (extraData) ? extraData.label : gatewayInfo.displayName;

            // Display
            $dialog.find('.header-pro-plan').text(proPlanName);
            $dialog.find('.purchased-date').text(purchasedDate);
            $dialog.find('.expired-date').text(expiryDate);
            $dialog.find('.pro-plan').text(proPlanName);
            $dialog.find('.plan-duration').text(planMonths + ' ' + planMonthsPluralisation);
            $dialog.find('.provider-icon').addClass(gatewayName);
            $dialog.find('.gateway-name').text(gatewayDisplayName);

            // Add button click handlers
            this.initChooseButton($button, $dialog);
            this.initRenewButton($button, $dialog, proNum);
            this.initDontShowAgainButton($dialog);
            this.initFeedbackMessageKeyup($dialog);
            this.initSendAndCloseButton($button, $dialog);

            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($button, $dialog);
            alarm.showWarningPopup($button, $dialog);
        },

        /**
         * Hiding the repay top popup and the button in the banner
         * @param {Object} $button      Top menu icon button
         * @param {Object} $dialog      Top menu popup dialog
         */
        hideRepayWarn: function($button, $dialog) {
            'use strict';
            $button.addClass('hidden').removeClass('active');
            $dialog.addClass('hidden');
        },

        /**
         * Initialises the click handler for the Choose button
         * @param {Object} $dialog The dialog
         */
        initChooseButton: function($button, $dialog) {

            // On the Choose button click
            $dialog.find('.warning-button.choose').rebind('click', function() {

                // Hide the dialog and go to pro page
                $dialog.addClass('hidden');
                $button.removeClass('active');

                // Set a flag so it doesn't show each time
                alarm.hidden = 1;

                // Add a log
                api_req({ a: 'log', e: 99608, m: 'User chose a new plan from the plan expiry dialog' });

                // Go to the first step of the Pro page so they can choose a new plan
                loadSubPage('pro');
            });
        },

        /**
         * Initialises the click handler for the Renew button
         * @param {Object} $dialog The dialog
         * @param {Number} proNum The Pro plan number e.g. 1, 2, 3, 4
         */
        initRenewButton: function($button, $dialog, proNum) {

            // On the Renew button click
            $dialog.find('.warning-button.renew').rebind('click', function() {

                // Hide the dialog
                $dialog.addClass('hidden');
                $button.removeClass('active');

                // Set a flag so it doesn't show each time
                alarm.hidden = 1;

                // Add a log
                api_req({ a: 'log', e: 99609, m: 'User chose to renew existing plan from the plan expiry dialog' });

                // Go to the second step of the Pro page which will pre-populate the details
                loadSubPage('propay_' + proNum);
            });
        },

        /**
         * Initialise the 'Do not show again' button. When clicked it will show a text area and
         * a button for the user to send some feedback about why they don't want to renew their plan.
         * @param {Object} $dialog The dialog
         */
        initDontShowAgainButton: function($dialog) {

            // Add click handler for the checkbox and its label
            $dialog.find('.plan-expired-checkbox, .plan-expired-checkbox-label').rebind('click', function() {

                var $checkbox = $dialog.find('.plan-expired-checkbox');

                // If checked
                if ($checkbox.hasClass('checkboxOn')) {

                    // Uncheck the box
                    $checkbox.removeClass('checkboxOn').addClass('checkboxOff');

                    // Hide the feedback text area and button, show the payment messages/buttons
                    $dialog.find('.first-message, .second-message').removeClass('hidden');
                    $dialog.find('.warning-button.choose, .warning-button.renew').removeClass('hidden');
                    $dialog.find('.confirm-reason, .warning-button.close').addClass('hidden');
                }
                else {
                    // Otherwise check the box
                    $checkbox.removeClass('checkboxOff').addClass('checkboxOn');

                    // Hide the payment messages/buttons, show the feedback text area and button
                    $dialog.find('.first-message, .second-message').addClass('hidden');
                    $dialog.find('.warning-button.choose, .warning-button.renew').addClass('hidden');
                    $dialog.find('.confirm-reason, .warning-button.close').removeClass('hidden');
                }
            });
        },

        /**
         * Enable or disable the Send and close button depending on if they've entered enough characters
         * @param {Object} $dialog The dialog
         */
        initFeedbackMessageKeyup: function($dialog) {

            // On entry into the text area
            $dialog.find('.confirm-reason-message').rebind('keyup', function() {

                // If the message is less than 10 characters, keep the button disabled
                if ($(this).val().length < 10) {
                    $dialog.find('.warning-button.close').addClass('disabled');
                }
                else {
                    // Otherwise enable it
                    $dialog.find('.warning-button.close').removeClass('disabled');
                }
            });
        },

        /**
         * Initialises the button to send the user's feedback
         * @param {Object} $button Button which allows to open dialog
         * @param {Object} $dialog The dialog
         */
        initSendAndCloseButton: function($button, $dialog) {

            // On the Send and close button
            $dialog.find('.warning-button.close').rebind('click', function() {

                // Set the feedback message for the response
                var feedback = $dialog.find('.confirm-reason-message').val();
                var email = u_attr.email;
                var jsonData = JSON.stringify({ feedback: feedback, email: email });

                // Do nothing if less than 10 characters
                if (feedback.length < 10) {
                    return false;
                }

                // Send the feedback
                api_req({
                    a: 'clog',
                    t: 'doNotWantToRenewPlanFeedback',
                    d: jsonData
                });

                // Set a flag so the icon and dialog never re-appears
                alarm.hidden = 2;

                // Never show the dialog again for this account
                mega.attr.set(
                    'hideProExpired',
                    '1',                    // Simple flag
                    false,                  // Set to private attribute
                    true                    // Set to non-historic, this won't retain previous values on the API server
                );

                // Hide the warning icon and the dialog
                $button.addClass('hidden');
                $dialog.addClass('hidden');
            });
        },

        /**
         * Converts a timestamp to a localised yyyy-mm-dd format e.g. 2016-04-17
         * @param {Number} timestamp The UNIX timestamp
         * @returns {String} Returns the date in yyyy-mm-dd format
         */
        formatTimestampToDate: function(timestamp) {

            var date = new Date(timestamp * 1000);
            var year = date.getFullYear();
            var month = (date.getMonth() + 1);
            var monthPadded = (month < 10) ? '0' + month : month;
            var day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();

            return year + '-' + monthPadded + '-' + day;
        }
    },


    /**
     * A popup to let the user know there is a MEGA website update available.
     * This is useful if they have not refreshed or reloaded in 24 hours since a release.
     * To test this, load the site and set: localStorage.setItem('testSiteUpdate', '1');
     * then reload the page. The popup should appear after 5 seconds.
     */
    siteUpdate: {

        /** Checks for after 1 day (milliseconds) */
        checkInterval: 60 * 60 * 24 * 1000,

        /** The URL to check for updates, uses the static server to reduce load on the root servers */
        updateUrl: mega.updateURL,

        /** The timer ID */
        timeoutId: null,

        /** Cache of the server build information if they have already seen the popup */
        cachedServerBuildVersion: null,

        /**
         * Initialise the update check mechanism
         */
        init: function() {

            // If they previously fetched the server information then re-render the popup on subsequent page loads
            if (this.cachedServerBuildVersion !== null) {
                Soon(function() {
                    alarm.siteUpdate.render(alarm.siteUpdate.cachedServerBuildVersion, true);
                });
            }

            // Otherwise start timer only if using the legacy extension or website because web extensions have
            // their own auto-update mechanism. Also don't start a new timer if there is one already started.
            else if (is_chrome_web_ext === false && is_firefox_web_ext === false && this.timeoutId === null) {
                this.startUpdateCheckTimer();
            }
        },

        /**
         * Start a timer to check the live site to see if there is an update available
         */
        startUpdateCheckTimer: function() {

            // If localStorage testing variable exists
            if (localStorage.getItem('testSiteUpdate')) {

                // Check for update in 3 seconds using the test update file
                this.checkInterval = 3 * 1000;
                this.updateUrl = defaultStaticPath + 'current_ver_test.txt';
            }

            // Only run the update check if using legacy Firefox ext, or on mega.nz, or the testSiteUpdate flag is set
            if (is_chrome_firefox || window.location.hostname === 'mega.nz' ||
                    localStorage.getItem('testSiteUpdate')) {

                // Clear old timer
                window.clearTimeout(this.timeoutId);

                // Set timeout to check if there is an update available
                this.timeoutId = setTimeout(function() {

                    // Reset the timer id after completion
                    alarm.siteUpdate.timeoutId = null;

                    // Get the server version
                    alarm.siteUpdate.getServerBuildVersion();

                }, this.checkInterval);
            }
        },

        /**
         * Get what build version is currently available from the live site
         */
        getServerBuildVersion: function() {

            // Add timestamp to end to break cache
            var updateUrl = this.updateUrl + '?time=' + unixtime();

            // Fetch the latest current_ver.txt
            M.xhr(updateUrl).done(function(event, data) {

                // Try parse version info
                try {
                    var serverBuildVersion = JSON.parse(data);

                    // Display information if data was returned
                    if (serverBuildVersion) {
                        alarm.siteUpdate.render(serverBuildVersion);
                    }
                }
                catch (exception) {

                    // Failed to fetch, try again in another 24 hours
                    alarm.siteUpdate.startUpdateCheckTimer();
                }
            });
        },

        /**
         * Render the popup if applicable
         * @param {Object} serverBuildVersion The deployment information in current_ver.txt
         * @param {Boolean} reRender If this is a repeat rendering of the popup
         */
        render: function(serverBuildVersion, reRender) {

            // Cache lookups
            var $button = $('.top-icon.warning.site-update-available');
            var $dialog = $('.top-warning-popup.site-update-available');

            // Convert versions to integers for easier comparison
            var localVersion = M.vtol(buildVersion.website);
            var serverVersion = M.vtol(serverBuildVersion.website);

            // Calculate the time when the update should be notified to the user (24 hours later)
            var currentTimestamp = unixtime();
            var updateTimestamp = serverBuildVersion.timestamp + (60 * 60 * 24);

            // If the server version is newer and the build has been released for at least 24 hours
            if ((localVersion < serverVersion) && (currentTimestamp > updateTimestamp)) {

                // If this is the first time the popup has appeared, send a log
                if (!reRender) {
                    api_req({ a: 'log', e: 99610, m: 'Site update dialog triggered after 24 hours' });
                }

                // Set the release version and date
                $dialog.find('.release-version').text(serverBuildVersion.website);
                $dialog.find('.release-date-time').text(time2date(serverBuildVersion.timestamp));

                // Change the text for the Legacy Extension
                if (is_chrome_firefox) {
                    $dialog.find('.description').addClass('hidden');
                    $dialog.find('.description-legacy-extension').removeClass('hidden');
                }

                // Cache server update details so the popup can be immediately re-rendered if they switch page
                this.cachedServerBuildVersion = serverBuildVersion;

                // Initialise popup buttons
                this.initDontUpdateButton($button, $dialog);
                this.initUpdateButton($button, $dialog);

                // Hide any other popups that may be open, make the icon clickable and show the popup
                alarm.hideAllWarningPopups();
                alarm.initWarningIconButton($button, $dialog);
                alarm.showWarningPopup($button, $dialog);
            }
            else {
                // Using current version, try again in another 24 hours
                alarm.siteUpdate.startUpdateCheckTimer();
            }
        },

        /**
         * If the Don't Update button is clicked, hide the dialog and don't show it again
         * @param {Object} $button Button which allows to open dialog
         * @param {Object} $dialog The dialog
         */
        initDontUpdateButton: function($button, $dialog) {

            $dialog.find('.warning-button.dont-update').rebind('click', function() {

                // Set a flag so the icon and dialog never re-appears
                alarm.hidden = 2;

                // Add a log
                api_req({ a: 'log', e: 99611, m: 'User chose not to update from site update dialog' });

                // Hide the warning icon and the dialog
                $button.addClass('hidden');
                $dialog.addClass('hidden');
            });
        },

        /**
         * If the Update button is clicked, hard refresh the page to break cache
         * @param {Object} $dialog The dialog
         */
        initUpdateButton: function($button, $dialog) {

            $dialog.find('.warning-button.update').rebind('click', function() {

                // Hide it so only the icon is visible and they can re-open the popup after their transfers are done
                alarm.hidden = 1;

                // Hide the warning dialog
                $dialog.addClass('hidden');
                $button.removeClass('active');

                // Check for pending transfers and if there are, prompt user to see if they want to continue
                M.abortTransfers().then(function() {

                    // Add a log
                    api_req({ a: 'log', e: 99612, m: 'User chose to update from site update dialog' });

                    // If Firefox Legacy extension go the URL
                    if (is_chrome_firefox) {
                        window.location = 'https://mega.nz/meganz-legacy.xpi';
                    }
                    else {
                        // If on the mega.nz site, hard refresh the page
                        document.location.reload(true);
                    }
                });
            });
        }
    }
};
