/**
 * Functionality for the mobile Referral Bonuses page
 */
mobile.achieve.referrals = {

    /**
     * jQuery selector for this page
     */
    $page: null,

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

        // Cache selector
        this.$page = $('.mobile.achievements-referral-bonuses-page');

        // Initialise functionality
        this.fetchAndDisplayInformation();

        // Initialise back button to go back to the Achievements page
        mobile.initBackButton(this.$page, 'fm/account/achievements');

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99676, m: 'Mobile web Referral Bonuses page accessed' });
    },

    /**
     * Displays the bonus information and achievement status
     */
    fetchAndDisplayInformation: function() {

        'use strict';

        // Show a loading dialog while the data is fetched from the API
        loadingDialog.show();

        // Fetch all account data from the API
        M.accountData(function() {

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            // Display the referral bonuses
            mobile.achieve.referrals.displayReferralBonuses();
        });
    },

    /**
     * Display the information on referral bonuses received
     */
    displayReferralBonuses: function() {

        'use strict';

        // Get bonus information
        var rewardedBonuses = M.account.maf.a;
        var bonusesReceivedInfo = M.account.maf.r;

        // Cache selectors
        var $referralBlocksContainer = mobile.achieve.referrals.$page.find('.referral-blocks');
        var $referralBlockTemplate = $referralBlocksContainer.find('.referral-block.template');

        // Set variables to accumulate totals and HTML
        var totalStorage = 0;
        var totalTransfer = 0;
        var referalBonusesHtml = '';

        // Loop through all awarded bonuses
        for (var i = 0; i < rewardedBonuses.length; i++) {

            // Calculate if award is expired
            var rewardedBonus = rewardedBonuses[i];
            var classNum = rewardedBonus.a;
            var awardId = rewardedBonus.r;
            var expiryTimestamp = rewardedBonus.e;
            var currentTimestamp = unixtime();
            var timeDifference = expiryTimestamp - currentTimestamp;

            // If not a referral bonus item or expired, don't add
            if (classNum !== mobile.achieve.BONUS_CLASS_REFERRAL || timeDifference <= 0) {
                continue;
            }

            // If not expired set text to 'x days left', if less than 2 weeks remain show as red text
            var daysRemaining = Math.round(timeDifference / 86400);
            var daysRemainingWording = l[16284].replace('%1', daysRemaining);
            var daysRemainingClass = daysRemaining <= 14 ? 'expiring-soon' : '';

            // Get the email and avatar
            var email = rewardedBonus.m[0];
            var avatar = useravatar.contact(email);

            // Clone the template
            var $referralBlock = $referralBlockTemplate.clone().removeClass('template');

            // Set items on template
            $referralBlock.find('.email').text(email);
            $referralBlock.find('.time-remaining').addClass(daysRemainingClass).text(daysRemainingWording);
            $referralBlock.find('.avatar-container').html('').append(avatar);
            $referralBlock.find('.avatar').addClass('small-rounded-avatar');

            // Append to the HTML
            referalBonusesHtml += $referralBlock.prop('outerHTML');

            // Accumulate storage and transfer bytes to overall total
            totalStorage += bonusesReceivedInfo[awardId][mobile.achieve.AWARD_INDEX_STORAGE];
            totalTransfer += bonusesReceivedInfo[awardId][mobile.achieve.AWARD_INDEX_TRANSFER];
        }

        // Format storage and transfer bytes to 'x GB'
        var totalStorageFormatted = numOfBytes(totalStorage, 0);
        var totalTransferFormatted = numOfBytes(totalTransfer, 0);

        // Display the total storage and transfer
        var $unlockedRewards = mobile.achieve.referrals.$page.find('.total-referral-bonuses-block');
        $unlockedRewards.find('.storage-amount').text(totalStorageFormatted.size);
        $unlockedRewards.find('.storage-unit').text(totalStorageFormatted.unit);
        $unlockedRewards.find('.transfer-amount').text(totalTransferFormatted.size);
        $unlockedRewards.find('.transfer-unit').text(totalTransferFormatted.unit);

        // Clear old HTML and render the referral bonuses
        $referralBlocksContainer.find('.referral-block').not('.template').remove();
        $referralBlocksContainer.append(referalBonusesHtml);
    }
};
