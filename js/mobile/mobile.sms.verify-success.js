/**
 * Functions for the SMS verification success page.
 * This is shown for both achievement flow and suspended flow.
 */
mobile.sms.verifySuccess = {

    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If they have refreshed the page and lost the previous form details, just load the My Account section
        if (mobile.sms.phoneInput.countryCallCode === null) {
            loadSubPage('fm/account');
            return false;
        }

        // Cache the page
        this.$page = $('.js-verify-success-page');

        // Init functionality
        this.initOkButton();

        // Display full phone number from previous page
        this.$page.find('.js-user-phone-number').text(
            '(+' + mobile.sms.phoneInput.countryCallCode + ') ' + mobile.sms.phoneInput.phoneNumber
        );

        // Init header
        mobile.initHeaderMegaIcon();

        // Initialise the top menu
        topmenuUI();

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the OK button to take them back to their account page
     */
    initOkButton: function() {

        'use strict';

        // On Resend button tap
        this.$page.find('.js-ok-button').off('tap').on('tap', function() {

            // If they were suspended when they started the process
            if (mobile.sms.isSuspended) {

                // Set the phone number to show on the login page
                login_txt = '+' + mobile.sms.phoneInput.countryCallCode + mobile.sms.phoneInput.phoneNumber;

                // Hide the current page
                mobile.sms.verifySuccess.$page.addClass('hidden');

                // Reset flag
                mobile.sms.isSuspended = false;

                // Log out the partially logged in account and take them to the login page
                u_logout(true);
                loadSubPage('login');
            }
            else {
                loadingDialog.show();

                // Perform User Get request to get the new added phone number
                api_req({ a: 'ug' }, {
                    callback: function(res) {

                        loadingDialog.hide();

                        if (typeof res === 'object' && res.smsv) {

                            // Update the SMS Verification (smsv) locally with the user's phone
                            u_attr.smsv = res.smsv;

                            // Hide the current page
                            mobile.sms.verifySuccess.$page.addClass('hidden');

                            // Load the My Account page to show the added phone
                            loadSubPage('fm/account');
                        }
                    }
                });
            }

            // Prevent double taps
            return false;
        });
    }
};
