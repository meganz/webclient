/**
 * Functionality for the mobile My Account section
 */
mobile.achieve = {

    /**
     * Bonus classes of achievements for the API objects maf.a (awarded classes) and maf.u (available award classes)
     */
    BONUS_CLASS_REGISTRATION: 1,
    BONUS_CLASS_REFERRAL: 3,
    BONUS_CLASS_MEGA_SYNC: 4,
    BONUS_CLASS_MOBILE_APP: 5,
    BONUS_CLASS_VERIFY_PHONE: 9,

    /**
     * Array indexes for the API objects maf.r (reward details) and maf.u (available award classes)
     */
    AWARD_INDEX_STORAGE: 0,
    AWARD_INDEX_TRANSFER: 1,
    AWARD_INDEX_TIME: 2,

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the main Achievements page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        this.$page = $('.mobile.achievements-page');

        // Initialise functionality
        this.fetchAndDisplayBonusInformation();
        this.initInviteFriendsButton();
        this.initReferralBonusesButton();
        this.initMobileAppButton();
        this.initMegaSyncButton();
        this.initVerifyPhoneButton();

        // Initialise back button to go back to the My Account page
        mobile.initBackButton(this.$page, 'fm/account/');

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99673, m: 'Mobile web main Achievements page accessed' });
    },

    /**
     * Displays the bonus information and achievement status
     */
    fetchAndDisplayBonusInformation: function() {

        'use strict';

        // Show a loading dialog while the data is fetched from the API
        loadingDialog.show();

        // Fetch all account data from the API
        M.accountData(function() {

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            // Cache selectors
            var $bonusBlocks = mobile.achieve.$page.find('.bonus-information-block');
            var $registrationBonus = $bonusBlocks.filter('.registration');
            var $referralBonus = $bonusBlocks.filter('.referral');
            var $megaSyncBonus = $bonusBlocks.filter('.install-mega-sync');
            var $mobileAppBonus = $bonusBlocks.filter('.install-mobile-app');
            var $verifyPhoneBonus = $bonusBlocks.filter('.verify-phone-number');

            // Display the available bonuses and whether they are achieved or not
            mobile.achieve.displayBonusItemInfo($registrationBonus, mobile.achieve.BONUS_CLASS_REGISTRATION);
            mobile.achieve.displayBonusItemInfo($referralBonus, mobile.achieve.BONUS_CLASS_REFERRAL);
            mobile.achieve.displayBonusItemInfo($megaSyncBonus, mobile.achieve.BONUS_CLASS_MEGA_SYNC);
            mobile.achieve.displayBonusItemInfo($mobileAppBonus, mobile.achieve.BONUS_CLASS_MOBILE_APP);
            mobile.achieve.displayBonusItemInfo($verifyPhoneBonus, mobile.achieve.BONUS_CLASS_VERIFY_PHONE);

            // Display calculation of overall total storage and transfer bonus
            mobile.achieve.calculateAndDisplayTotalsUnlocked();
            mobile.achieve.updateInviteFriendsText(mobile.achieve.$page);
        });
    },

    /**
     * Displays the individual bonus information
     * @param {Object} $containerElement The jQuery container element to be updated
     * @param {Number} classNumber The bonus class number from the API
     */
    displayBonusItemInfo: function($containerElement, classNumber) {

        'use strict';

        // Get achievement bonus information
        var actualBonusesReceivedInfo = M.account.maf.r;
        var bonusRewardedInfo = mobile.achieve.getInfoAboutAwardedBonus(classNumber);

        // Check the bonus information is available
        if (bonusRewardedInfo !== null) {

            // Get the award ID
            var awardId = bonusRewardedInfo.r;

            // If they have actually received a bonus the object will exist
            if (typeof actualBonusesReceivedInfo[awardId] !== 'undefined') {

                // Calculate if award is expired
                var currentTimestamp = unixtime();
                var expiryTimestamp = bonusRewardedInfo.e;
                var timeDifference = expiryTimestamp - currentTimestamp;

                // Set text to 'Expired' by default
                var daysRemainingWording = l[1664];
                var storageCssClass = 'greyed-out';
                var transferCssClass = 'greyed-out';
                var daysRemainingClass = '';

                // If not expired
                if (timeDifference > 0) {

                    // Set text to 'x days left'
                    var daysRemaining = Math.round(timeDifference / 86400);
                    daysRemainingWording = l[16284].replace('%1', daysRemaining);

                    // Remove the greyed out CSS class
                    storageCssClass = '';
                    transferCssClass = '';

                    // If less than 2 weeks remain show as red text
                    if (daysRemaining <= 14) {
                        daysRemainingClass = 'expiring-soon';
                    }

                    // If there is a valid referral unhide the arrow icon to show they can go to the Referral page
                    if (classNumber === mobile.achieve.BONUS_CLASS_REFERRAL) {
                        $containerElement.removeClass('disabled');
                    }

                    // Remove the inactive styling so the boxes have a filled in blue/green colour
                    $containerElement.removeClass('inactive');
                }

                // Update the text and CSS classes
                $containerElement.find('.time-remaining').addClass(daysRemainingClass).text(daysRemainingWording);
                $containerElement.find('.storage-bonus').addClass(storageCssClass);
                $containerElement.find('.transfer-bonus').addClass(transferCssClass);
            }
        }

        // Display per bonus storage and transfer
        mobile.achieve.displayStorageAndTransfer($containerElement, classNumber);
    },

    /**
     * Display possible awards of storage and transfer per bonus
     * @param {Object} $containerElement The jQuery container element to be updated
     * @param {Number} classNum The bonus class number from the API
     */
    displayStorageAndTransfer: function($containerElement, classNum) {

        'use strict';

        // Convert storage and bandwidth to 'x GB'
        var allPossibleBonuses = M.account.maf.u;
        var storageAmount = allPossibleBonuses[classNum][mobile.achieve.AWARD_INDEX_STORAGE];
        var transferAmount = allPossibleBonuses[classNum][mobile.achieve.AWARD_INDEX_TRANSFER];
        var storageAmountFormatted = bytesToSize(storageAmount, 0);
        var transferAmountFormatted = bytesToSize(transferAmount, 0);

        // Update the storage and bandwidth bonus information
        $containerElement.find('.storage-bonus').text(storageAmountFormatted);
        $containerElement.find('.transfer-bonus').text(transferAmountFormatted);
    },

    /**
     * Updates the placeholders in the string 17466 with the storage and bandwidth amount
     * @param {Object} $page The jQuery object for the current page
     */
    updateInviteFriendsText: function($page) {

        'use strict';

        if (!M.account.maf) {
            // If account doesn't have achievements this text is pointless.
            return;
        }

        // Convert storage and bandwidth to 'x GB'
        var allPossibleBonuses = M.account.maf.u;
        var storage = allPossibleBonuses[mobile.achieve.BONUS_CLASS_REFERRAL][mobile.achieve.AWARD_INDEX_STORAGE];
        var transfer = allPossibleBonuses[mobile.achieve.BONUS_CLASS_REFERRAL][mobile.achieve.AWARD_INDEX_TRANSFER];
        var storageAmountFormatted = bytesToSize(storage, 0);
        var transferAmountFormatted = bytesToSize(transfer, 0);

        // Update text in the Invite Friends text to 'Get x GB of storage and x GB of transfers for each referral
        var langString = l[17466].replace('%1$s', storageAmountFormatted).replace('%2$s', transferAmountFormatted);

        // Update the page text
        $page.find('.invite-friends-text').text(langString);
    },

    /**
     * Get information about the earned reward e.g. expiry time for an achievement class
     * @param {Number} classNum The class number to find
     * @returns {Object|null} Returns the award object from M.account.maf.a or null if the award was not achieved
     */
    getInfoAboutAwardedBonus: function(classNum) {

        'use strict';

        // Get the list of awarded bonuses
        var awardedBonuses = M.account.maf.a;

        // Search through the array looking for the bonus class number
        for (var i = 0; i < awardedBonuses.length; i++) {

            // If the award id is the same return it
            if (awardedBonuses[i].a === classNum) {
                return awardedBonuses[i];
            }
        }

        // Award not achieved yet
        return null;
    },

    /**
     * Calculates and displays the overall bonus totals for storage and transfer that were unlocked
     */
    calculateAndDisplayTotalsUnlocked: function() {

        'use strict';

        // Get bonus information
        var rewardedBonuses = M.account.maf.a;
        var bonusesReceivedInfo = M.account.maf.r;

        // Set variables to accumulate totals
        var totalStorage = 0;
        var totalTransfer = 0;

        // Loop through all awarded bonuses
        for (var i = 0; i < rewardedBonuses.length; i++) {

            // Calculate if award is expired
            var rewardedBonus = rewardedBonuses[i];
            var awardId = rewardedBonus.r;
            var expiryTimestamp = rewardedBonus.e;
            var currentTimestamp = unixtime();
            var difference = expiryTimestamp - currentTimestamp;

            // If expired don't add
            if (difference <= 0) {
                continue;
            }

            // Accumulate storage and transfer bytes to overall total
            totalStorage += bonusesReceivedInfo[awardId][mobile.achieve.AWARD_INDEX_STORAGE];
            totalTransfer += bonusesReceivedInfo[awardId][mobile.achieve.AWARD_INDEX_TRANSFER];
        }

        // Format storage and transfer bytes to 'x GB'
        var totalStorageFormatted = numOfBytes(totalStorage, 0);
        var totalTransferFormatted = numOfBytes(totalTransfer, 0);

        // Display the total storage and transfer
        var $unlockedRewards = mobile.achieve.$page.find('.unlocked-rewards-block');
        $unlockedRewards.find('.storage-amount').text(totalStorageFormatted.size);
        $unlockedRewards.find('.storage-unit').text(totalStorageFormatted.unit);
        $unlockedRewards.find('.transfer-amount').text(totalTransferFormatted.size);
        $unlockedRewards.find('.transfer-unit').text(totalTransferFormatted.unit);
    },

    /**
     * Initialise the button to take them to the Invite Friends page
     */
    initInviteFriendsButton: function() {

        'use strict';

        // On clicking/tapping the Referral Bonuses button
        mobile.achieve.$page.find('.invite-friends-block').off('tap').on('tap', function() {

            // Load the page
            loadSubPage('fm/account/invites');
            return false;
        });
    },

    /**
     * Initialise the button to take them to the Referral Bonuses page
     */
    initReferralBonusesButton: function() {

        'use strict';

        // On clicking/tapping the Referral Bonuses button
        mobile.achieve.$page.find('.referral').off('tap').on('tap', function() {

            // Don't go to the Referral Bonuses page if they don't have any referral bonuses
            if ($(this).hasClass('disabled')) {
                return false;
            }

            // Load the page
            loadSubPage('fm/account/referrals');
            return false;
        });
    },

    /**
     * Initialise the button to take them to the relevant app page
     */
    initMobileAppButton: function() {

        'use strict';

        // On clicking/tapping the Install a mobile app button
        mobile.achieve.$page.find('.install-mobile-app').off('tap').on('tap', function() {

            var pageToLoad = '';

            // Choose the page to load based on what OS they're currently running
            switch (ua.details.os) {
                case 'iPad':
                case 'iPhone':
                    pageToLoad = 'ios';
                    break;

                case 'Windows Phone':
                    pageToLoad = 'wp';
                    break;

                case 'Android':
                    pageToLoad = 'android';
                    break;

                default:
                    pageToLoad = 'android';
                    break;
            }

            // Load the page
            loadSubPage(pageToLoad);
            return false;
        });
    },

    /**
     * Initialise the button to take them to the MEGAsync page
     */
    initMegaSyncButton: function() {

        'use strict';

        // On clicking/tapping the Install MEGAsync button
        mobile.achieve.$page.find('.install-mega-sync').off('tap').on('tap', function() {

            // Load the page
            loadSubPage('sync');
            return false;
        });
    },

    /**
     * Initialise the button to take them Add Phone Number introduction screen
     */
    initVerifyPhoneButton: function() {

        'use strict';

        // If SMS verification enable is not on level 2 (Opt-in and unblock SMS allowed) then do nothing
        if (u_attr.flags.smsve !== 2) {
            return false;
        }

        var $verifyPhoneButton = mobile.achieve.$page.find('.verify-phone-number');

        // Unhide the button because the SMS verification is enabled
        $verifyPhoneButton.removeClass('hidden');

        // On clicking/tapping the Verify phone number button
        $verifyPhoneButton.off('tap').on('tap', function() {

            // If they already have already added a phone number don't let them add again
            if (typeof u_attr.smsv !== 'undefined') {
                return false;
            }

            // Load the page
            loadSubPage('sms/phone-achievement-intro');

            // Prevent double taps
            return false;
        });
    }
};
