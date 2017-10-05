/**
 * Functionality for the mobile My Account section
 */
mobile.account = {

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache selectors
        var $page = $('.mobile.my-account-page');

        // Initialise functionality
        mobile.account.displayAvatarAndNameDetails($page);
        mobile.account.displayProPlanDetails($page);
        mobile.account.fetchAndDisplayStorageUsage($page);
        mobile.account.initUpgradeAccountButton($page);

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        $page.removeClass('hidden');
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

        // Generate the avatar from the user handle
        var avatar = useravatar.contact(u_handle, '', 'div');

        // Show the user's avatar and name
        $avatarNameBlock.removeClass('hidden');
        $avatar.safeHTML(avatar);
        $avatar.find('.avatar').addClass('small-rounded-avatar');
        $userName.text(u_attr.name);
        $userEmail.text(u_attr.email);
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
        $page.find('.icon.pro-mini').addClass(proClassName);
        $page.find('.pro-plan-name').text(proPlanName);
    },

    /**
     * Fetch and display the user's storage usage
     */
    fetchAndDisplayStorageUsage: function() {

        'use strict';

        // Show loading dialog until API request completes
        loadingDialog.show();

        // Make API request to fetch the user's storage usage
        api_req({ a: 'uq', strg: 1 }, {
            callback: function(result) {

                loadingDialog.hide();

                // If response was successful
                if (typeof result === 'object') {

                    // jQuery selectors
                    var $accountUsageBlock = $('.mobile.account-usage-block');
                    var $usedStorage = $accountUsageBlock.find('.used');
                    var $totalStorage = $accountUsageBlock.find('.total');
                    var $percentageUsed = $accountUsageBlock.find('.percentage');

                    // Format percentage used to X.XX%, used space to 'X.X GB' and total space to 'X GB' format
                    var spaceUsed = result.cstrg;
                    var spaceTotal = result.mstrg;
                    var percentageUsed = spaceUsed / spaceTotal * 100;
                    var percentageUsedText = percentageUsed.toFixed(2);
                    var spaceUsedText = bytesToSize(spaceUsed, 1);
                    var spaceTotalText = bytesToSize(spaceTotal, 0);

                    // Display the used and total storage e.g. 0.02% (4.8 GB of 200 GB)
                    $usedStorage.text(spaceUsedText);
                    $totalStorage.text(spaceTotalText);
                    $percentageUsed.text(percentageUsedText);

                    // Colour text red and show a message if over quota, or use orange if close to using all quota
                    if (percentageUsed >= 100) {
                        $accountUsageBlock.addClass('over-quota');
                    }
                    else if (percentageUsed >= 85) {
                        $accountUsageBlock.addClass('warning');
                    }
                }
            }
        });
    },

    /**
     * Initialise the Upgrade Account button
     * @param {String} $page The jQuery selector for the current page
     */
    initUpgradeAccountButton: function($page) {

        'use strict';

        // On clicking/tapping the Upgrade Account row
        $page.find('.account-upgrade-block').off('tap').on('tap', function() {

            // Load the Pro page
            loadSubPage('pro');
            return false;
        });
    }
};
