/**
 * Functionality for the mobile My Account section
 */
mobile.account = {

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selectors
        var $page = $('.mobile.my-account-page');

        // Initialise functionality
        mobile.account.fetchAccountInformation($page);
        mobile.account.initUpgradeAccountButton($page);
        mobile.account.initAchievementsButton($page);
        mobile.account.initRecoveryKeyButton($page);
        mobile.account.initCancelAccountButton($page);
        mobile.account.initAddPhoneNumberButton($page);
        mobile.account.initSessionHistoryButton($page);
        mobile.account.fetchAndDisplayTwoFactorAuthStatus($page);
        mobile.account.initChangePasswordButton($page);
        mobile.account.initNotificationButton($page);

        // Init the titleMenu for this page.
        mobile.titleMenu.init();

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        $page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99672, m: 'Mobile web My Account page accessed' });
    },

    /**
     * Initialise the Upgrade Account button
     * @param {String} $page The jQuery selector for the current page
     */
    initUpgradeAccountButton: function($page) {

        'use strict';

        // if this is business dont show
        if (u_attr && u_attr.b && u_attr.b.s !== -1) {
            $page.find('.account-upgrade-block').addClass('hidden');
        }
        else {
            var upgradeBtn = $page.find('.account-upgrade-block').removeClass('hidden');
            // On clicking/tapping the Upgrade Account button
            upgradeBtn.off('tap').on('tap', function() {

                // Load the Pro page
                loadSubPage('pro');
                return false;
            });
        }
    },

    /**
     * Initialise the Achievements button to see the main Achievements page
     * @param {String} $page The jQuery selector for the current page
     */
    initAchievementsButton: function($page) {

        'use strict';

        var $achievementsButton = $page.find('.account-achievements-block');

        // If achievements are enabled, show the button
        if (typeof u_attr.flags.ach !== 'undefined' && u_attr.flags.ach) {
            $achievementsButton.removeClass('hidden');
        }

        // On clicking/tapping the Achievements button
        $achievementsButton.off('tap').on('tap', function() {

            // Hide the account page
            $page.addClass('hidden');

            // Render the achievements information
            loadSubPage('fm/account/achievements');
            return false;
        });
    },

    /**
     * Displays the Pro, storage and subscription info
     * @param {String} $page The jQuery selector for the current page
     */
    fetchAccountInformation: function($page) {

        'use strict';

        // if this is business no limit for storage and no percentage
        var $accountUsageBlockExternal = $('.mobile.account-usage-block');
        if (u_attr && u_attr.b) {
            $accountUsageBlockExternal.find('.mobile.storage-usage').addClass('hidden');
            $accountUsageBlockExternal.find('.mobile.storage-usage.business').removeClass('hidden');
        }
        else {
            $accountUsageBlockExternal.find('.mobile.storage-usage').removeClass('hidden');
            $accountUsageBlockExternal.find('.mobile.storage-usage.business').addClass('hidden');
        }
        // Fetch all account data from the API
        M.accountData(
            function() {

                // Hide the loading dialog after request completes
                loadingDialog.hide();

                // Display Pro account, plan & subscription details
                mobile.account.displayAvatarAndNameDetails($page);
                mobile.account.displayProPlanDetails($page);
                mobile.account.displayStorageUsage($page);
                mobile.account.renderCancelSubscriptionButton($page);
            },
            true,   // Show loading spinner
            true    // Force clear cache
        );
    },


    /**
     * Displays the user's avatar, name and email
     * @param {String} $page The jQuery selector for the current page
     */
    displayAvatarAndNameDetails: function($page) {

        'use strict';

        // Cache selectors
        var $avatarNameBlock = $page.find('.avatar-name-block');
        var $avatar = $avatarNameBlock.find('.main-avatar');
        var $userName = $avatarNameBlock.find('.user-name');
        var $userEmail = $avatarNameBlock.find('.user-email');
        var $userPhoneContainer = $avatarNameBlock.find('.user-phone');
        var $userPhoneNum = $avatarNameBlock.find('.user-phone-number');

        // Generate the avatar from the user handle
        var avatar = useravatar.contact(u_handle, '', 'div');

        // Show the user's avatar and name
        $avatarNameBlock.removeClass('hidden');
        $avatar.safeHTML(avatar);
        $avatar.find('.avatar').addClass('small-rounded-avatar');
        $userName.text(u_attr.name);
        $userEmail.text(u_attr.email);

        // Set the user's phone if they have verified it
        if (typeof u_attr.smsv !== 'undefined') {
            $userPhoneContainer.removeClass('hidden');
            $userPhoneNum.text(u_attr.smsv);
        }
    },

    /**
     * Display the Pro plan details
     * @param {String} $page The jQuery selector for the current page
     */
    displayProPlanDetails: function($page) {

        'use strict';

        // Get the Pro name and icon class
        var proNum = u_attr.p;
        var proClassName = proNum >= 1 ? 'pro' + proNum : 'free';
        var proPlanName = pro.getProPlanName(proNum);

        // Show the Pro name and icon class
        $('.plan-icon', $page).addClass(proClassName);
        $('.pro-plan-name', $page).text(proPlanName);
    },

    /**
     * Fetch and display the user's storage usage
     */
    displayStorageUsage: function() {

        'use strict';

        // jQuery selectors
        var $accountUsageBlock = $('.mobile.account-usage-block');
        var $usedStorage = $accountUsageBlock.find('.used');
        var $totalStorage = $accountUsageBlock.find('.total');
        var $percentageUsed = $accountUsageBlock.find('.percentage');
        var $message = $('.over-quota-message', $accountUsageBlock).text(l[16136]).removeClass('odq-red-alert');

        // Format percentage used to X.XX%, used space to 'X.X GB' and total space to 'X GB' format
        var spaceUsed = M.account.cstrg;
        var spaceTotal = M.account.mstrg;
        var percentageUsed = spaceUsed / spaceTotal * 100;
        var percentageUsedText = Math.round(percentageUsed);
        var spaceUsedText = bytesToSize(spaceUsed, 2);
        var spaceTotalText = bytesToSize(spaceTotal, 0);

        // Display the used and total storage e.g. 0.02% (4.8 GB of 200 GB)
        $usedStorage.text(spaceUsedText);
        $totalStorage.text(spaceTotalText);
        $percentageUsed.text(percentageUsedText);

        // Colour text red and show a message if over quota, or use orange if close to using all quota
        if (percentageUsed >= 100) {
            $accountUsageBlock.addClass('over-quota');
            if (u_attr.uspw) {
                $message.safeHTML(
                    odqPaywallDialogTexts(u_attr, M.account).fmBannerText)
                    .addClass('odq-red-alert');
            }
        }
        else if (percentageUsed >= 85) {
            $accountUsageBlock.addClass('warning');
        }
    },

    /**
     * Initialise the Cancel Subscription button and only show it if they have a subscription
     * @param {String} $page The jQuery selector for the current page
     */
    renderCancelSubscriptionButton: function($page) {

        'use strict';

        // Cache selector
        var $cancelSubscriptionBlock = $page.find('.account-cancel-subscription-block');

        /*/ Mock data for testing
        u_attr.p = 3;                       // Pro level
        M.account.stype = 'S';              // Subscription
        M.account.srenew = [1639480953];    // Expiry timestamp
        M.account.sgw = ['Credit Card'];    // Payment type
        M.account.sgwids = [16];            // Gateway
        //*/

        // If they have Pro and if they have a recurring Credit Card subscription
        if (u_attr.p && M.account.stype === 'S') {

            // Get the date their subscription will renew, the payment type and gateway
            var timestamp = M.account.srenew.length > 0 ? M.account.srenew[0] : 0;    // Timestamp e.g. 1493337569
            var gatewayId = M.account.sgwids.length > 0 ? M.account.sgwids[0] : null; // Gateway ID e.g. 15, 16 etc

            // Display the date their subscription will renew if known
            if (timestamp > 0) {

                // Convert timestamp to date format yyyy-mm-dd
                var dateString = time2date(timestamp, 1);

                // Set text on the button to: Renews yyyy-mm-dd
                $cancelSubscriptionBlock.find('.subscription-text').text(l[6971] + ' ' + dateString);
            }

            // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
            if (gatewayId === 2 || gatewayId === 3) {

                // Show the button, which when clicked will tell them they need to cancel their plan off-site
                mobile.account.initShowSubscriptionInfoOverlay($page);
            }

            // Otherwise if ECP or Sabadell
            else if (gatewayId === 16 || gatewayId === 17) {

                // Show a loading dialog while the data is fetched from the API
                loadingDialog.show();

                // Check if there are any active subscriptions
                // ccqns = Credit Card Query Number of Subscriptions
                api_req({ a: 'ccqns' }, {
                    callback: function(numOfSubscriptions) {

                        /*/ Mock data for testing
                        numOfSubscriptions = 1;
                        //*/

                        // Hide the loading dialog after request completes
                        loadingDialog.hide();

                        // If there is an active subscription
                        if (numOfSubscriptions > 0) {

                            // Show and initialise the Cancel Subscription confirmation overlay
                            mobile.account.initShowCancelSubscriptionConfirmOverlay($page);
                        }
                    }
                });
            }
        }
    },

    /**
     * Show an info dialog for Google/Apple subscription users on how they can cancel their subscription off-site
     * @param {String} $page The jQuery selector for the current page
     */
    initShowSubscriptionInfoOverlay: function($page) {

        'use strict';

        // Cache selectors
        var $cancelSubscriptionBlock = $page.find('.account-cancel-subscription-block');
        var $cancelSubscriptionInfoOverlay = $('.mobile.cancel-subscription-information-overlay');
        var $confirmButton = $cancelSubscriptionInfoOverlay.find('.confirm-ok-button');

        // Show the Cancel Subscription button
        $cancelSubscriptionBlock.removeClass('hidden');

        // On click/tap of the Cancel Subscription button
        $cancelSubscriptionBlock.off('tap').on('tap', function() {

            // Show message in an overlay
            $cancelSubscriptionInfoOverlay.removeClass('hidden');
            return false;
        });

        // Add click/tap handler
        $confirmButton.off('tap').on('tap', function() {

            // Hide the error overlay
            $cancelSubscriptionInfoOverlay.addClass('hidden');
            return false;
        });
    },

    /**
     * Show an overlay asking the user if they are sure they want to cancel their subscription
     * @param {String} $page The jQuery selector for the current page
     */
    initShowCancelSubscriptionConfirmOverlay: function($page) {

        'use strict';

        // Cache selectors
        var $cancelSubscriptionButton = $page.find('.account-cancel-subscription-block');
        var $cancelSubscriptionOverlay = $('.mobile.cancel-subscription-overlay');
        var $confirmButton = $cancelSubscriptionOverlay.find('.confirm-ok-button');
        var $closeButton = $cancelSubscriptionOverlay.find('.close-button');

        // On clicking/tapping the Cancel Subscription button
        $cancelSubscriptionButton.off('tap').on('tap', function() {

            // Show Cancel Subscription overlay
            $cancelSubscriptionOverlay.removeClass('hidden');
            return false;
        });

        // Add click/tap handler for the Confirm button to cancel their subscription
        $confirmButton.off('tap').on('tap', function() {

            // Show a loading dialog while the data is fetched from the API
            loadingDialog.show();

            // Cancel the user's subscription/s (cccs = Credit Card Cancel Subscriptions, r = reason)
            api_req({ a: 'cccs', r: 'No reason (automated mobile web cancel subscription)' }, {
                callback: function() {

                    // Hide the loading dialog after request completes
                    loadingDialog.hide();

                    // Hide the Cancel Subscription button and overlay
                    $cancelSubscriptionButton.addClass('hidden');
                    $cancelSubscriptionOverlay.addClass('hidden');
                }
            });

            // Prevent double taps
            return false;
        });

        // On clicking/tapping the Close button
        $closeButton.off('tap').on('tap', function() {

            // Hide the overlay
            $cancelSubscriptionOverlay.addClass('hidden');
            return false;
        });

        // Show the Cancel Subscription button
        $cancelSubscriptionButton.removeClass('hidden');
    },

    /**
     * Initialise the Recovery Key button so the user can view, copy and save their Recovery Key
     * @param {String} $page The jQuery selector for the current page
     */
    initRecoveryKeyButton: function($page) {

        'use strict';

        // On clicking/tapping the Upgrade Account button
        $page.find('.account-recovery-key-block').off('tap').on('tap', function() {

            // Load the Backup page
            loadSubPage('backup');
            return false;
        });
    },

    /**
     * Displays the current Two-Factor Authentication status (enabled/disabled)
     * @param {String} $page The jQuery selector for the current page
     */
    fetchAndDisplayTwoFactorAuthStatus: function($page) {

        'use strict';

        var $twoFactorBlock = $page.find('.account-twofactor-block');

        // Check if 2FA is actually enabled on the API for everyone
        if (twofactor.isEnabledGlobally()) {

            // Show the 2FA section
            $twoFactorBlock.removeClass('hidden');

            // Check if 2FA is enabled on the account
            mobile.twofactor.isEnabledForAccount(function(result) {

                // If enabled, show green icon and text to Disable 2FA
                if (result) {
                    $twoFactorBlock.addClass('enabled');
                }
                else {
                    // Otherwise it's disabled, show red icon and text to Enable 2FA
                    $twoFactorBlock.removeClass('enabled');
                }

                // Init the click handler now for the button now that the enabled/disabled status has been retrieved
                mobile.account.initTwoFactorAuthenticationButton($page);
            });
        }
    },

    /**
     * Initialise the Two Factor Authentication button so the user can enable/disable the feature
     * @param {String} $page The jQuery selector for the current page
     */
    initTwoFactorAuthenticationButton: function($page) {

        'use strict';

        var $twoFactorBlock = $page.find('.account-twofactor-block');

        // On clicking/tapping the Two-Factor Authentication button
        $twoFactorBlock.off('tap').on('tap', function() {

            // If 2FA is currently enabled
            if ($twoFactorBlock.hasClass('enabled')) {

                // Load the Disable page to disable the 2FA
                loadSubPage('twofactor/verify-disable');
            }
            else {
                // Load the Intro page to setup the 2FA
                loadSubPage('twofactor/intro');
            }

            return false;
        });
    },

    /**
     * Initialise the Add Phone Number button
     * @param {String} $page The jQuery selector for the current page
     */
    initAddPhoneNumberButton: function($page) {

        'use strict';

        // If the SMS Verification Enabled API flag is set and they have not added a phone number yet
        if (u_attr.flags.smsve === 2 && typeof u_attr.smsv === 'undefined') {

            // Unhide the button and on clicking/tapping the button, load the Add Phone page
            $page.find('.account-add-phone-block').removeClass('hidden').off('tap').on('tap', function() {

                loadSubPage('sms/add-phone-achievements');
                return false;
            });
        }
    },

    /**
     * Initialise the Session History button
     * @param {String} $page The jQuery selector for the current page
     */
    initSessionHistoryButton: function($page) {

        'use strict';

        var $buttonBlock = $page.find('.account-session-history-block');

        // On clicking/tapping the button
        $buttonBlock.off('tap').on('tap', function() {

            // Load the Session History page
            loadSubPage('fm/account/history');
            return false;
        });
    },

    /**
     * Initialise the button to change the user's password
     * @param {String} $page The jQuery selector for the current page
     */
    initChangePasswordButton: function($page) {

        'use strict';

        var $buttonBlock = $page.find('.account-change-password-block');

        // On clicking/tapping the button
        $buttonBlock.off('tap').on('tap', function() {

            // Load the Session History page
            loadSubPage('fm/account/email-and-pass');
            return false;
        });
    },

    /**
     * Initialise the notification settings button to navigate the user to the notification settings page.
     * @param $page
     */
    initNotificationButton: function($page) {
        'use strict';

        $page.find('.account-notifications-block').off('tap').on('tap', function() {
            loadSubPage('fm/account/notifications');
            return false;
        });
    },

    /**
     * Initialise the Cancel Account button to send the user an account cancellation confirmation email
     * @param {String} $page The jQuery selector for the current page
     */
    initCancelAccountButton: function($page) {

        'use strict';

        // if this is business sub-user hide
        if (u_attr && u_attr.b && !u_attr.b.m) {
            $page.find('.acount-cancellation-block').addClass('hidden');
        }
        else {
            var cancelBlock = $page.find('.acount-cancellation-block').removeClass('hidden');
            // On clicking/tapping the Upgrade Account button
            cancelBlock.off('tap').on('tap', function() {

                // Please confirm that all your data will be deleted
                var confirmMessage = l[1974];
                var $cancelAccountOverlay = $('#mobile-ui-error');

                // Search through their Pro plan purchase history
                $(account.purchases).each(function(index, purchaseTransaction) {

                    // Get payment method name
                    var paymentMethodId = purchaseTransaction[4];
                    var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).name;

                    // If they have paid with iTunes or Google Play in the past
                    if ((paymentMethod === 'apple') || (paymentMethod === 'google')) {

                        // Update confirmation message to remind them to cancel iTunes or Google Play
                        confirmMessage += ' ' + l[8854];
                        return false;
                    }
                });

                // Show a confirm dialog
                mobile.account.showAccountCancelConfirmDialog($page, confirmMessage);

                // Show close button
                $cancelAccountOverlay.find('.text-button').removeClass('hidden');

                // Prevent double tap
                return false;
            });
        }
    },

    /**
     * Show dialog asking for confirmation and send an email to the user to finish the process if they agree
     * @param {String} $page The jQuery selector for the current page
     * @param {String} confirmMessage The message to be displayed in the confirmation dialog
     */
    showAccountCancelConfirmDialog: function($page, confirmMessage) {

        'use strict';

        // Hide the current page as there is some scrolling issue / problem with
        // the native browser header which shows buttons below the overlay
        $page.addClass('hidden');

        // Show dialog asking for confirmation and continue if they agree
        mobile.messageOverlay.show(l[6181], confirmMessage, function() {

            loadingDialog.show();

            // Check if 2FA is enabled on their account
            mobile.twofactor.isEnabledForAccount(function(result) {

                loadingDialog.hide();

                // If 2FA is enabled
                if (result) {

                    // Show the verify 2FA page to collect the user's PIN
                    mobile.twofactor.verifyAction.init(function(twoFactorPin) {

                        // Complete the cancellation process
                        mobile.account.continueAccountCancelProcess($page, twoFactorPin);
                    });
                }
                else {
                    // Complete the cancellation process
                    mobile.account.continueAccountCancelProcess($page, null);
                }
            });
        },
        // Close button callback to re-show the My Account page
        function() {
            $page.removeClass('hidden');
        });
    },

    /**
     * Finalise the account cancellation process
     * @param {String} $page The jQuery selector for the current page
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    continueAccountCancelProcess: function($page, twoFactorPin) {

        'use strict';

        // Cache selector
        var $verifyActionPage = $('.mobile.two-factor-page.verify-action-page');

        // Prepare the request
        var request = { a: 'erm', m: u_attr.email, t: 21 };

        // If 2FA PIN is set, add it to the request
        if (twoFactorPin !== null) {
            request.mfa = twoFactorPin;
        }

        loadingDialog.show();

        // Make account cancellation request
        api_req(request, {
            callback: function(result) {

                loadingDialog.hide();

                // If something went wrong with the 2FA PIN
                if (result === EFAILED || result === EEXPIRED) {
                    mobile.twofactor.verifyAction.showVerificationError();
                }

                // Check for incorrect email
                else if (result === ENOENT) {
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.messageOverlay.show(l[1513], l[1946]);
                }

                // If successful, show a dialog saying they need to check their email
                else if (result === 0) {
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.showEmailConfirmOverlay();
                    $('#startholder').addClass('no-scroll');
                }
                else {
                    // Oops, something went wrong
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.messageOverlay.show(l[135], l[200]);
                }
            }
        });
    }
};
