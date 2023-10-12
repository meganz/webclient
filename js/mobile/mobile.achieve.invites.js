/**
 * Functionality for the mobile Invite Friends page
 */
mobile.achieve.invites = {

    /**
     * jQuery selector for this page
     */
    $page: null,
    successful: [],
    alreadySent: [],
    alreadyReceived: [],
    existOrOwn: [],

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

        $('.mobile.main-block:not(hidden)').addClass('hidden');

        // Cache selector
        this.$page = $('.mobile.achievements-invite-friends-page');

        // Initialise functionality
        this.fetchAndDisplayData();

        // Show the account page content
        this.$page.removeClass('hidden');

        // Add a server log
        eventlog(99674);
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
        var $emailWarningInvalid = mobile.achieve.invites.$page.find('.email-warning-block.invalid');
        var $emailWarningOwnEmail = mobile.achieve.invites.$page.find('.email-warning-block.own-email');
        var $successMessageBlock = mobile.achieve.invites.$page.find('.success-message-block');
        var $inviteButton = mobile.achieve.invites.$page.find('.invite-button');

        // On keyup or clicking out of the email text field
        $emailInput.off('keyup blur').on('keyup blur', function() {

            var ownEmail = false;
            var invalidEmails = [];
            var emailInputValue = $.trim($emailInput.val());

            $emailWarning.addClass('hidden');
            $successMessageBlock.addClass('hidden');

            if (emailInputValue === '') {
                $inviteButton.removeClass('active');
                return false;
            }

            // Ignore ',' if it is last character.
            if (emailInputValue.slice(-1) === ',') {
                emailInputValue = emailInputValue.slice(0, -1);
            }

            var emails = emailInputValue.split(',');

            $.each(emails, function(index, email) {

                // Trim whitespace from the ends of the email entered
                var trimmedEmail = $.trim(email);

                if (trimmedEmail === '' || !isValidEmail(trimmedEmail)) {
                    invalidEmails.push(email);
                }

                if (u_attr.email.toLowerCase() === trimmedEmail.toLowerCase()) {
                    ownEmail = true;
                }
            });

            $inviteButton.addClass('active');

            if (invalidEmails.length > 0) {
                var $emailWarningInvalidColon = $emailWarningInvalid.find('.multi');
                var $emailWarningInvalidContents = $emailWarningInvalid.find('.warning-contents');

                $emailWarningInvalid.removeClass('hidden');
                $inviteButton.removeClass('active');

                if (emails.length > 1) {
                    $emailWarningInvalidColon.removeClass('hidden');
                    $emailWarningInvalidContents.safeHTML(invalidEmails.join(',<br>'));
                }
                else if (emails.length === 1) {
                    $emailWarningInvalidColon.addClass('hidden');
                    $emailWarningInvalidContents.text('');
                }
            }
            else {
                $emailWarningInvalid.addClass('hidden');
            }

            if (ownEmail) {
                $emailWarningOwnEmail.removeClass('hidden');
                $inviteButton.removeClass('active');
            }
            else {
                $emailWarningOwnEmail.addClass('hidden');
            }
        });
    },

    /**
     * Initialises the Invite button to send an invite to the user
     */
    initInviteButton: function() {

        'use strict';

        // Cache selectors
        var self = this;
        var $emailInput = mobile.achieve.invites.$page.find('.email-input');
        var $emailWarning = mobile.achieve.invites.$page.find('.email-warning-block');
        var $emailWarningSent = mobile.achieve.invites.$page.find('.email-warning-block.already-sent');
        var $emailWarningReceived = mobile.achieve.invites.$page.find('.email-warning-block.already-received');
        var $emailWarningExist = mobile.achieve.invites.$page.find('.email-warning-block.already-exist');
        var $successMessageBlock = mobile.achieve.invites.$page.find('.success-message-block');
        var $inviteButton = mobile.achieve.invites.$page.find('.invite-button');

        // On clicking/tapping the Invite button
        $inviteButton.off('tap').on('tap', function() {

            // Ignore taping on loading.
            if ($(this).hasClass('loading') || !$(this).hasClass('active')) {
                return false;
            }

            // Trim whitespace from the ends of the email entered
            var emails = $emailInput.val().split(',');
            var emailPromises = [];

            $.each(emails, function(index, email) {

                var trimmedEmail = $.trim(email);

                // If the email is invalid, show the email warning, grey out the button and don't send to the API
                if (trimmedEmail === '' || !isValidEmail(trimmedEmail)) {
                    $emailWarning.removeClass('hidden');
                    $inviteButton.removeClass('active');
                    return false;
                }

                // Hide the button text and show a loading spinner instead
                $inviteButton.addClass('loading');

                // Send email request
                emailPromises.push(self.requestSendEmail(trimmedEmail));
            });

            Promise.allSettled(emailPromises).then(() => {

                // Hide the loading spinner
                $inviteButton.removeClass('loading');

                // Invite already sent to that user
                if (self.alreadySent.length > 0) {
                    $emailWarningSent.removeClass('hidden');
                    $emailWarningSent.find('.warning-contents').safeHTML(self.alreadySent.join(',<br>'));
                }

                // User already sent you an invitation
                if (self.alreadyReceived.length > 0) {
                    $emailWarningReceived.removeClass('hidden');
                    $emailWarningReceived.find('.warning-contents').safeHTML(self.alreadyReceived.join(',<br>'));
                }

                // User already exists or owner
                if (self.existOrOwn.length > 0) {
                    $emailWarningExist.removeClass('hidden');
                    $emailWarningExist.find('.warning-contents').safeHTML(self.existOrOwn.join(',<br>'));
                }

                // If successful, show success, and clear the email
                if (self.successful.length > 0) {
                    $successMessageBlock.removeClass('hidden');
                    $emailInput.val('');
                }

                self.successful = [];
                self.alreadySent = [];
                self.alreadyReceived = [];
                self.existOrOwn = [];
            });
        });
    },

    /**
     * Request api to sending invitation email.
     * @param {String} trimmedEmail Trimmed email to send invitation email.
     * @return {MegaPromise}
     */
    requestSendEmail: function(trimmedEmail) {
        'use strict';

        // Make an invite API request
        return api.screq({a: 'upc', e: u_attr.email, u: trimmedEmail, msg: l[5878], aa: 'a'})
            .then(({result}) => {
                assert(result === 0 || typeof result === 'object' && result.p);
                this.successful.push(trimmedEmail);
            })
            .catch((ex) => {

                // Check for error codes
                if (ex === -12) {
                    this.alreadySent.push(trimmedEmail);
                }
                else if (ex === -10) {
                    this.alreadyReceived.push(trimmedEmail);
                }
                else if (ex === -2) {
                    this.existOrOwn.push(trimmedEmail);
                }
                else if (d) {
                    console.error('Unexpected result...', ex);
                }
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
