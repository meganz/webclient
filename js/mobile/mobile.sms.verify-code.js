/**
 * Functions for the SMS code verification page
 */
mobile.sms.verifyCode = {

    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If they have refreshed the page and lost the previous form details, reload the previous phone entry page
        if (mobile.sms.phoneInput.countryCallCode === null) {
            window.history.back();
        }

        // Cache the page
        this.$page = $('.js-verify-code-page');

        // Init functionality
        this.initResendButton();
        this.initChangeAndKeyupHandler();
        this.initVerifyButton();

        // Display full phone number from previous page
        this.$page.find('.js-user-phone-number').text(
            '(+' + mobile.sms.phoneInput.countryCallCode + ') ' + mobile.sms.phoneInput.phoneNumber
        );

        // Init header and init back button to go back to the phone input page
        mobile.initHeaderMegaIcon();
        mobile.initBackButton(this.$page, 'sms/add-phone-' + (mobile.sms.isSuspended ? 'suspended' : 'achievement'));

        // Initialise the top menu
        topmenuUI();

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the Resend button to take them back to the previous page and the phone will be pre-filled from state
     */
    initResendButton: function() {

        'use strict';

        // On Resend button tap
        this.$page.find('.js-resend-button').off('tap').on('tap', function() {

            // Load the previous page
            window.history.back();

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise keyup handler to the code input so the button gets enabled if everything is completed
     */
    initChangeAndKeyupHandler: function() {

        'use strict';

        var $codeInput = this.$page.find('.js-verification-number-input');
        var $warningMessage = this.$page.find('.js-warning-message');
        var $verifyButton = this.$page.find('.js-verify-button');
        var $scrollContainer = this.$page.find('.fm-scrolling');

        // If not iOS (iOS was tested to work fine without any extra effort)
        if (!is_ios) {

            // On clicking into the text field
            $codeInput.off('focusin').on('focusin', function() {

                // Wait for on-screen keyboard to appear
                setTimeout(function() {

                    // The keyboard has taken up some of the page space so
                    // scroll down to the input so it is visible while typing
                    var scrollHeight = $codeInput.offset().top;
                    $scrollContainer.scrollTop(scrollHeight);

                }, 300);
            });
        }

        // Add keyup handler
        $codeInput.off('keyup.codehandler').on('keyup.codehandler', function() {

            // Clean up the phone number and trim to max 6 chars
            var code = $(this).val();
            var codeCleaned = code.replace(/\D+/g, '');
            var codeCleanedAndTrimmed = codeCleaned.substring(0, 6);

            // Put the cleaned & trimmed number back in the field to prevent symbols etc being entered
            // NB: not using preventDefault here as that doesn't prevent symbols being entered on Chrome mobile
            $codeInput.val(codeCleanedAndTrimmed);

            // If the field has 6 numbers, enable the button
            if (codeCleanedAndTrimmed.length === 6) {
                $verifyButton.addClass('active');
            }
            else {
                // Otherwise disable the button
                $verifyButton.removeClass('active');
            }

            // Clear past errors
            $warningMessage.addClass('hidden').text('');

            // Prevent double events
            return false;
        });
    },

    /**
     * Initialise the Verify button to verify the SMS code received and entered by the user
     */
    initVerifyButton: function() {

        'use strict';

        var $verificationCode = this.$page.find('.js-verification-number-input');
        var $warningMessage = this.$page.find('.js-warning-message');
        var $verifyButton = this.$page.find('.js-verify-button');

        // On Verify button tap
        $verifyButton.off('tap').on('tap', function() {

            // Only process the code if the button is active
            if (!$verifyButton.hasClass('active')) {
                return false;
            }

            var verificationCode = $verificationCode.val();

            // Send code to the API for verification
            api_req({ a: 'smsv', c: verificationCode }, {
                callback: function(result) {

                    // Check for errors
                    if (result === EACCESS) {
                        $warningMessage.removeClass('hidden').text(l[20223]);
                    }
                    else if (result === EEXPIRED) {
                        $warningMessage.removeClass('hidden').text(l[20224]);
                    }
                    else if (result === EFAILED) {
                        $warningMessage.removeClass('hidden').text(l[20225]);
                    }
                    else if (result === EEXIST || result === ENOENT) {
                        $warningMessage.removeClass('hidden').text(l[20226]);
                    }
                    else if (result < 0) {
                        $warningMessage.removeClass('hidden').text(l[47]);  // Oops, something went wrong...
                    }
                    else {
                        // Hide the current page
                        mobile.sms.verifyCode.$page.addClass('hidden');

                        // Load the success page
                        loadSubPage('sms/verify-success');
                    }
                }
            });

            // Prevent double taps
            return false;
        });
    }
};
