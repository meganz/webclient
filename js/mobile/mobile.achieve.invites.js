/**
 * Functionality for the mobile Invite Friends page
 */
mobile.achieve.invites = {

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
        this.$page = $('.mobile.achievements-invite-friends-page');

        // Initialise functionality
        this.fetchAndDisplayData();

        // Initialise back button to go back to the Achievements
        mobile.initBackButton(this.$page, 'fm/account/achievements/');

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Add a server log
        api_req({ a: 'log', e: 99674, m: 'Mobile web Invite Friends page accessed' });
    },

    /**
     * Fetch account data from the API and then initialise functionality
     */
    fetchAndDisplayData: function() {

        'use strict';

        // Show a loading dialog while the data is fetched from the API
        loadingDialog.show();

        // Fetch all account data from the API
        M.accountData(function() {

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            // Initialise events and display data
            mobile.achieve.invites.initKeyupFunctionality();
            mobile.achieve.invites.initInviteButton();
            mobile.achieve.invites.initHowItWorksButton();
            mobile.achieve.updateInviteFriendsText(mobile.achieve.invites.$page);
        });
    },

    /**
     * Initialises keyup/blur functionality on the email input field to check the email as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $emailInput = mobile.achieve.invites.$page.find('.email-input');
        var $emailWarning = mobile.achieve.invites.$page.find('.email-warning-block');
        var $successMessageBlock = mobile.achieve.invites.$page.find('.success-message-block');
        var $inviteButton = mobile.achieve.invites.$page.find('.invite-button');

        // On keyup or clicking out of the email text field
        $emailInput.off('keyup blur').on('keyup blur', function() {

            // Trim whitespace from the ends of the email entered
            var email = $emailInput.val();
            var trimmedEmail = $.trim(email);

            // If empty, grey out the button so it appears unclickable
            if (trimmedEmail === '' || checkMail(trimmedEmail)) {
                $inviteButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $inviteButton.addClass('active');
            }

            // If they've sent an email successfully and start typing again, hide the previous error/success messages
            $emailWarning.addClass('hidden');
            $successMessageBlock.addClass('hidden');
        });
    },

    /**
     * Initialises the Invite button to send an invite to the user
     */
    initInviteButton: function() {

        'use strict';

        // Cache selectors
        var $emailInput = mobile.achieve.invites.$page.find('.email-input');
        var $emailWarning = mobile.achieve.invites.$page.find('.email-warning-block');
        var $successMessageBlock = mobile.achieve.invites.$page.find('.success-message-block');
        var $inviteButton = mobile.achieve.invites.$page.find('.invite-button');

        // On clicking/tapping the Invite button
        $inviteButton.off('tap').on('tap', function() {

            // Trim whitespace from the ends of the email entered
            var email = $emailInput.val();
            var trimmedEmail = $.trim(email);

            // If the email is invalid, show the email warning, grey out the button and don't send to the API
            if (trimmedEmail === '' || checkMail(trimmedEmail)) {
                $emailWarning.removeClass('hidden');
                $inviteButton.removeClass('active');
                return false;
            }

            // Hide the button text and show a loading spinner instead
            $inviteButton.addClass('loading');

            // Make an invite API request
            api_req({ a: 'upc', e: u_attr.email, u: trimmedEmail, msg: l[5878], aa: 'a', i: requesti }, {
                callback: function(response) {

                    // Hide the loading spinner
                    $inviteButton.removeClass('loading');

                    // Check for error codes
                    if (response === -12) {

                        // Invite already sent to that user
                        msgDialog('info', '', l[17545]);
                    }
                    else if (response === -10) {

                        // User already sent you an invitation
                        msgDialog('info', '', l[17546]);
                    }
                    else if (response === -2) {

                        // User already exists or owner
                        msgDialog('info', '', l[1783]);
                    }
                    else if (typeof response === 'object' && response.p) {

                        // If successful, show success, hide errors and clear the email
                        $successMessageBlock.removeClass('hidden');
                        $emailWarning.addClass('hidden');
                        $emailInput.val('');
                    }
                }
            });
        });
    },

    /**
     * Initialise the How it Works button to go to an informational page about how the invites work
     */
    initHowItWorksButton: function() {

        'use strict';

        // On button click/tap
        mobile.achieve.invites.$page.find('.how-it-works-block').off('tap').on('tap', function() {

            // Render the How it works page
            loadSubPage('fm/account/invites/how-it-works');
            return false;
        });
    }
};
