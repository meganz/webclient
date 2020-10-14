/**
 * Generic functions for SMS verification on mobile
 */
mobile.sms = {

    /** A flag to be set if they arrived at this page because they are on a suspended account */
    isSuspended: false,

    /**
     * Update the lang string 'Get 20 GB storage and 40 GB transfer quota for free when you add your phone...' with
     * the details from the API. If a non-achievement account, a different text will be rendered.
     * @param {Object} $textField The text field to be updated
     */
    renderAddPhoneText: function($textField) {

        'use strict';

        // Fetch all account data from the API
        M.accountData(function() {

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            // Set string for non achievement account
            var langString = l[20411];  // Verifying your mobile will make it easier for your contacts to find you...
            var ach = M.maf;
            mobile.sms.achievementUsed = ach && ach[9] && ach[9].rwd;

            // Make sure they are on an achievement account
            if (typeof M.account.maf !== 'undefined' && !mobile.sms.achievementUsed) {

                // Convert storage and bandwidth to 'x GB'
                var bonuses = M.account.maf.u;
                var storage = bonuses[mobile.achieve.BONUS_CLASS_VERIFY_PHONE][mobile.achieve.AWARD_INDEX_STORAGE];
                var transfer = bonuses[mobile.achieve.BONUS_CLASS_VERIFY_PHONE][mobile.achieve.AWARD_INDEX_TRANSFER];
                var storageQuotaFormatted = bytesToSize(storage, 0, 3);
                var transferQuotaFormatted = bytesToSize(transfer, 0, 3);

                // Update string to 'Get 20 GB storage and 40 GB transfer quota for free when you add your phone...'
                langString = l[20210].replace('%1', storageQuotaFormatted).replace('%2', transferQuotaFormatted);
            }

            // Update the page text
            $textField.text(langString);

        }, true);
    }
};

/**
 * Functions for the SMS phone number input page
 */
mobile.sms.phoneInput = {

    $page: null,

    /** The country name of the phone number */
    countryName: null,

    /** The two letter country code e.g. AU, CA, NZ, UK, US */
    countryIsoCode: null,

    /** The country international calling code from the previous page */
    countryCallCode: null,

    /** The phone number from the previous page */
    phoneNumber: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the page
        this.$page = $('.js-phone-input-page');

        // Init functionality
        this.changePageText();
        this.buildListOfCountries();
        this.initChangeAndKeyupHandler();
        this.initCountryNameClickHandler();
        this.initCountryPickerCancelButton();
        this.initCountryPickerOpenHandler();
        this.initSendSmsButton();
        this.prefillPreviousFormDetails();

        // Init header
        mobile.initHeaderMegaIcon();

        // Initialise the top menu
        topmenuUI();

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initalise the text of the page depending on the way they arrived at the page
     */
    changePageText: function() {

        'use strict';

        var $headerText = this.$page.find('.js-header-text');
        var $bodyText = this.$page.find('.js-body-text');

        // If coming from the login process where their account was suspended
        if (page.indexOf('add-phone-suspended') > -1) {

            // Change the screen text
            $headerText.text(l[20212]);
            $bodyText.text(l[20209]);

            // Set flag for checking at the end of the flow which will show a different message on the login screen
            mobile.sms.isSuspended = true;
        }
        else {
            // Otherwise must be coming from the achievement add phone process
            $headerText.text(l[20211]);

            // Set achievement text with API values
            mobile.sms.renderAddPhoneText($bodyText);
        }
    },

    /**
     * Fill the country picker dialog with a list of countries
     */
    buildListOfCountries: function() {

        'use strict';

        var $countrySelectorDialog = $('.js-country-selector');
        var $countryList = $countrySelectorDialog.find('.js-country-list');
        var $countryItemTemplate = $countrySelectorDialog.find('.js-country-list-item.template');

        var countryOptions = '';

        // Build list of countries
        $.each(M.getCountries(), function(isoCode, countryName) {

            // Clone the template
            var $country = $countryItemTemplate.clone().removeClass('template');
            var countryCallCode = M.getCountryCallCode(isoCode);

            // Create the option and set the ISO code and country name
            $country.attr('data-country-iso-code', isoCode);
            $country.attr('data-country-name', countryName);
            $country.find('.js-country-name').text(countryName);
            $country.find('.js-country-iso-code').text('(+' + countryCallCode + ')');

            // Append the HTML to the list of options
            countryOptions += $country.prop('outerHTML');
        });

        // Render the countries
        $countryList.append(countryOptions);
    },

    /**
     * Initialise the click handler for clicking on a country which adds the country calling code to the form
     */
    initCountryNameClickHandler: function() {

        'use strict';

        var $countryInput = this.$page.find('.js-country-input');
        var $countrySelectorDialog = $('.js-country-selector');
        var $backgroundOverlay = $('.dark-overlay');
        var $countryList = $countrySelectorDialog.find('.js-country-list');

        // On tapping the country name
        $countryList.off('tap').on('tap', '.js-country-list-item', null, function() {

            // Get the country name and international call code
            var countryName = $(this).attr('data-country-name');
            var countryIsoCode = $(this).attr('data-country-iso-code');
            var countryCallCode = M.getCountryCallCode(countryIsoCode);
            var displayText = '(+' + countryCallCode + ') ' + countryName;

            // If Arabic (RTL lang) the code should be shown as 0064 New Zealand or the browser will mess it up
            if (lang === 'ar') {
                displayText = '00' + countryCallCode + ' ' + countryName;
            }

            // Put it in the screen behind
            $countryInput.attr('data-country-name', countryName);
            $countryInput.attr('data-country-iso-code', countryIsoCode);
            $countryInput.attr('data-country-call-code', countryCallCode);
            $countryInput.val(displayText).trigger('change');

            // Hide the background overlay and dialog
            $backgroundOverlay.addClass('hidden');
            $countrySelectorDialog.addClass('hidden');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Intialise the Cancel button on the country picker dialog
     */
    initCountryPickerCancelButton: function() {

        'use strict';

        var $countrySelectorDialog = $('.js-country-selector');
        var $backgroundOverlay = $('.dark-overlay');
        var $cancelButton = $countrySelectorDialog.find('.js-cancel-country-selection');

        // Initialise the Cancel button
        $cancelButton.off('tap').on('tap', function() {

            // Hide the background overlay and dialog
            $backgroundOverlay.addClass('hidden');
            $countrySelectorDialog.addClass('hidden');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the country picker dialog to open on clicking the text input
     */
    initCountryPickerOpenHandler: function() {

        'use strict';

        var $countrySelectorOpenButton = this.$page.find('.js-country-selector-open-button');
        var $countrySelectorDialog = $('.js-country-selector');
        var $backgroundOverlay = $('.dark-overlay');

        // On tapping the country container
        $countrySelectorOpenButton.off('tap').on('tap', function() {

            // Show the background overlay and dialog
            $backgroundOverlay.removeClass('hidden');
            $countrySelectorDialog.removeClass('hidden');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise keyup handler to the inputs so the button gets enabled if everything is completed
     */
    initChangeAndKeyupHandler: function() {

        'use strict';

        var $countryCallCodeInput = this.$page.find('.js-country-input');
        var $phoneInput = this.$page.find('.js-phone-input');
        var $sendButton = this.$page.find('.js-send-sms-button');
        var $scrollContainer = this.$page.find('.fm-scrolling');

        // If not iOS (iOS was tested to work fine without any extra effort)
        if (!is_ios) {

            // On clicking into the text field
            $phoneInput.off('focusin').on('focusin', function() {

                // Wait for on-screen keyboard to appear
                setTimeout(function() {

                    // The keyboard has taken up some of the page space so
                    // scroll down to the input so it is visible while typing
                    var scrollHeight = $phoneInput.offset().top;
                    $scrollContainer.scrollTop(scrollHeight);

                }, 300);
            });
        }

        // Add handler to both inputs
        $countryCallCodeInput.add($phoneInput).off('change keyup').on('change keyup', function() {

            // Clean up the phone number
            var phone = $phoneInput.val();
            var phoneCleaned = phone.replace(/\D+/g, '');

            // Put the cleaned number back in the field to prevent symbols etc being entered
            // NB: not using preventDefault here as that doesn't prevent symbols being entered on Chrome mobile
            $phoneInput.val(phoneCleaned);

            // If the fields are completed enable the button
            if ($countryCallCodeInput.val().length > 1 && phoneCleaned.length > 1) {
                $sendButton.addClass('active');
            }
            else {
                // Otherwise disable the button
                $sendButton.removeClass('active');
            }

            // Prevent double events
            return false;
        });
    },

    /**
     * Initialise the Send button to send a verification SMS to the user's phone
     */
    initSendSmsButton: function() {

        'use strict';

        var $countryCallCodeInput = this.$page.find('.js-country-input');
        var $phoneInput = this.$page.find('.js-phone-input');
        var $sendButton = this.$page.find('.js-send-sms-button');
        var $warningMessage = this.$page.find('.js-warning-message');

        // On Send button click
        $sendButton.off('tap').on('tap', function() {

            // Get the phone number details
            var countryName = $countryCallCodeInput.attr('data-country-name');
            var countryIsoCode = $countryCallCodeInput.attr('data-country-iso-code');
            var countryCallCode = $countryCallCodeInput.attr('data-country-call-code');
            var phoneNumber = $phoneInput.val();

            // Clean number of hyphens and spaces then format the number for sending e.g. +6421123456789
            var formattedPhoneNumber = '+' + countryCallCode + phoneNumber.replace(/-|\s/g, '');

            // Prepare the request
            var request = { a: 'smss', n: formattedPhoneNumber };

            // Add debug mode for testing to reset the phone number API side so you can re-use (only works on staging)
            if (localStorage.smsDebugMode) {
                request['to'] = 1;
            }

            // Trigger SMS to be sent to the phone number
            api_req(request, {
                callback: function(result) {

                    // Check for errors
                    if (result === EACCESS) {
                        $warningMessage.removeClass('hidden').text(l[20393]); // Your phone number is already verified
                    }
                    else if (result === EEXIST) {
                        $warningMessage.removeClass('hidden').text(l[20394]); // Phone already in use by other account
                    }
                    else if (result === ETEMPUNAVAIL) {
                        $warningMessage.removeClass('hidden').text(l[20223]); // Too many attempts. Please try in x hrs
                    }
                    else if (result < 0) {
                        $warningMessage.removeClass('hidden').text(l[47]); // Oops, something went wrong...
                    }
                    else {
                        // Save the call code and phone number details to re-use on the next page if necessary
                        mobile.sms.phoneInput.countryName = countryName;
                        mobile.sms.phoneInput.countryIsoCode = countryIsoCode;
                        mobile.sms.phoneInput.countryCallCode = countryCallCode;
                        mobile.sms.phoneInput.phoneNumber = phoneNumber;

                        // Hide the current page
                        mobile.sms.phoneInput.$page.addClass('hidden');

                        // Load verify code page
                        loadSubPage('sms/verify-code');
                    }
                }
            });

            // Prevent double taps
            return false;
        });
    },

    /**
     * Prefills the previous phone number details if they return to the page
     */
    prefillPreviousFormDetails: function() {

        'use strict';

        // If they have returned to the page
        if (this.countryName !== null && this.countryIsoCode !== null &&
                this.countryCallCode !== null && this.phoneNumber !== null) {

            var $countryCallCodeInput = this.$page.find('.js-country-input');
            var $phoneInput = this.$page.find('.js-phone-input');
            var $sendButton = this.$page.find('.js-send-sms-button');

            // Prefill the form details and make the button ready for sending again
            $countryCallCodeInput.attr('data-country-name', this.countryName);
            $countryCallCodeInput.attr('data-country-iso-code', this.countryIsoCode);
            $countryCallCodeInput.attr('data-country-call-code', this.countryCallCode);
            $countryCallCodeInput.val(this.countryName + ' (+' + this.countryCallCode + ')');
            $phoneInput.val(this.phoneNumber);
            $sendButton.addClass('active');
        }
    }
};
