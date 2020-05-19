/**
 * Generic functions for SMS verification on mobile
 */
var sms = {

    /**A flag which if set updates the UI if they arrived from the login, suspended account flow */
    isSuspended: false,

    /**
     * Initialise the Close icon/button to close the dialog
     */
    initDialogCloseButton: function($dialog, $background) {

        'use strict';

        var $closeButton = $dialog.find('.js-dialog-close, .js-not-now-button');

        // If they are suspended, don't show the close icon/button so they can't do anything else
        if (this.isSuspended) {
            $closeButton.addClass('hidden');
        }
        else {
            // On Close button tap
            $closeButton.rebind('click', function() {

                $dialog.addClass('hidden');
                $background.addClass('hidden');
            });
        }
    },

    /**
     * Update the language advertisement string 'Get 20 GB storage and 40 GB transfer quota for free when you...' with
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

            // M.maf is cached in its getter, however, repeated gets will cause unnecessary checks.
            var ach = M.maf;
            sms.achievementUsed = ach && ach[9] && ach[9].rwd;

            // Make sure they are on an achievement account and not used, maf will be calculated once.
            if (typeof M.account.maf !== 'undefined' && !sms.achievementUsed) {
                // Convert storage and bandwidth to 'x GB'
                var bonuses = M.account.maf.u;
                var storage = bonuses[9][0];
                var transfer = bonuses[9][1];
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
sms.phoneInput = {

    /** The container dialog with the HTML for all the pages/screens */
    $dialog: null,

    /** The background overlay for the dialog */
    $background: null,

    /** The current page/screen in the flow */
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
     * @param {Boolean|undefined} isSuspended Sets a flag if the user was suspended and is coming from login flow
     */
    init: function(isSuspended) {

        'use strict';

        // Cache the page
        this.$dialog = $('.fm-dialog.verify-phone');
        this.$background = $('.fm-dialog-overlay');
        this.$page = $('.js-phone-input-page');

        // Set suspended flag
        if (isSuspended) {
            sms.isSuspended = true;
        }

        // Init functionality
        this.initDisplay();
        this.buildListOfCountries();
        this.initCountryPicker();
        this.initChangeAndKeyupHandler();
        this.initSendSmsButton();

        // Initialise the close button if applicable
        sms.initDialogCloseButton(this.$dialog, this.$background);

        // Show the page
        this.$dialog.removeClass('hidden');
        this.$background.removeClass('hidden');
        this.$page.removeClass('hidden');
    },

    /**
     * Initalise the text of the page depending on the way they arrived at the page
     */
    initDisplay: function() {

        'use strict';

        var $dialog = this.$dialog;
        var $headerText = $dialog.find('.js-header-text');
        var $allPages = $dialog.find('form');
        var $verifyIcon = $dialog.find('.verify-ph-icon');
        var $verifySuccessIcon = $dialog.find('.verify-ph-success-icon');
        var $bodyText = this.$page.find('.js-body-text');
        var $warningMessage = this.$page.find('.js-warning-message');

        // If coming from the login process where their account was suspended
        if (sms.isSuspended) {

            // Hide buttons using the class and change the text
            $dialog.addClass('suspended');
            $headerText.text(l[20212]);
            $bodyText.text(l[20209]);
        }
        else {
            // Otherwise must be coming from the achievement add phone process
            $headerText.text(l[20211]);

            // Set the xGB storage and xGB transfer quota text
            sms.renderAddPhoneText($bodyText);
        }

        // Hide any previous pages and warnings if returning
        $allPages.addClass('hidden');
        $warningMessage.removeClass('visible');
        $verifyIcon.removeClass('hidden');
        $verifySuccessIcon.addClass('hidden');
    },

    /**
     * Fill the country picker dialog with a list of countries
     */
    buildListOfCountries: function() {

        'use strict';

        var $countryList = $('.js-country-list');
        var $countryItemTemplate = $countryList.find('.js-country-list-item.template');

        var countryOptions = '';

        // Build list of countries
        $.each(M.getCountries(), function(isoCode, countryName) {

            // Clone the template
            var $countryItem = $countryItemTemplate.clone().removeClass('template');

            // Get the country calling code e.g. 64 for NZ
            var countryCallCode = M.getCountryCallCode(isoCode);

            // Default option text is format: New Zealand (+64)
            var optionText = countryName + ' (+' + countryCallCode + ')';

            // If in Arabic it will be: 0064 New Zealand
            if (lang === 'ar') {
                optionText = countryName + ' 00' + countryCallCode;
            }

            // Create the option and set the ISO code and country name
            $countryItem.attr('data-country-iso-code', isoCode);
            $countryItem.attr('data-country-name', countryName);
            $countryItem.attr('data-country-call-code', countryCallCode);
            $countryItem.val(isoCode);
            $countryItem.text(optionText);

            // Append the HTML to the list of options
            countryOptions += $countryItem.prop('outerHTML');
        });

        // Render the countries
        $countryList.append(countryOptions);
    },

    /**
     * Initialise the country picker dialog to open on clicking the text input
     */
    initCountryPicker: function() {

        'use strict';

        var $countrySelect = this.$page.find('.js-country-list');

        // Initialise with jQueryUI selectmenu
        $countrySelect.selectmenu({
            position: {
                my: 'left-5 top+2',
                at: 'left-5 bottom+2',
                collision: 'flip'
            }
        });

        // On select of the country in the picker
        $countrySelect.on('selectmenuselect', function() {

            // Get the country call code and name
            var countryIsoCode = $(this).find(':selected').val();
            var countryCallCode = M.getCountryCallCode(countryIsoCode);
            var countryName = M.getCountryName(countryIsoCode);
            var $selectMenuText = sms.phoneInput.$page.find('.ui-selectmenu-text');
            var $selectMenuTextParent = $(this).parent();

            // Check that they didn't pick the blank option at the top
            if (typeof countryCallCode !== 'undefined') {

                // Put the call code first because of long country names
                $selectMenuText.text('(+' + countryCallCode + ') ' + countryName);
                $selectMenuTextParent.addClass('selected');
            }
            else {
                // Reset back to default state if blank option clicked
                $selectMenuText.text(l[481]);
                $selectMenuTextParent.removeClass('selected');
            }
        });

        // On window resize, make sure the open dropdown list moves to the correct position after resize
        $(window).off('resize.countrylist').on('resize.countrylist', function() {
            $('.js-country-list').each(function() {

                // If open, close and re-open
                if ($(this).next().attr('aria-expanded') === 'true') {
                    $(this).selectmenu('close');
                    $(this).selectmenu('open');
                }
            });
        });
    },

    /**
     * Initialise keyup handler to the select menu and input so the button gets enabled if everything is completed
     */
    initChangeAndKeyupHandler: function() {

        'use strict';

        var $countrySelector = this.$page.find('.js-country-list');
        var $phoneInput = this.$page.find('.js-phone-input');
        var $sendButton = this.$page.find('.js-send-sms-button');
        var $warningMessage = this.$page.find('.js-warning-message');

        // Add handlers
        $countrySelector.add($phoneInput).rebind('keyup.common selectmenuchange.common', function() {

            var $countryCode = $countrySelector.val();

            // If the fields are completed enable the button
            if ($countryCode && $countryCode.length > 1 && $phoneInput.val().length > 1) {
                $sendButton.removeClass('disabled');
            }
            else {
                // Otherwise disable the button
                $sendButton.addClass('disabled');
            }

            // Hide old error message
            $warningMessage.removeClass('visible');
        });

        // Prevent input of invalid chars
        $phoneInput.rebind('keypress.filterkeys', function(event) {

            var inputChar = String.fromCharCode(event.which);

            // If not an integer, prevent input from being entered
            if (!/[0-9]/.test(inputChar)) {
                event.preventDefault();
            }
        });
    },

    /**
     * Initialise the Send button to send a verification SMS to the user's phone
     */
    initSendSmsButton: function() {

        'use strict';

        var $countrySelector = this.$page.find('.js-country-list');
        var $phoneInput = this.$page.find('.js-phone-input');
        var $sendButton = this.$page.find('.js-send-sms-button');
        var $warningMessage = this.$page.find('.js-warning-message');

        // On Send button click
        $sendButton.off('click').on('click', function() {

            // Do not proceed the country code/phone is not selected/entered and the button is not active
            if ($sendButton.hasClass('disabled')) {
                return false;
            }

            // Get the phone number details
            var $selectedOption = $countrySelector.find('option:selected');
            var countryName = $selectedOption.attr('data-country-name');
            var countryCode = $selectedOption.attr('data-country-iso-code');
            var countryCallingCode = $selectedOption.attr('data-country-call-code');
            var phoneNum = $phoneInput.val();

            // Strip hyphens, spaces and format for sending e.g. +642123456789
            var formattedPhoneNumber = '+' + countryCallingCode + phoneNum.replace(/-|\s/g, '');

            // Prepare request
            var apiRequest = { a: 'smss', n: formattedPhoneNumber };

            // Add debug mode to test reset of the phone number so can be re-used (staging API only)
            if (localStorage.smsDebugMode) {
                apiRequest['to'] = 1;
            }

            // Send SMS to the phone
            api_req(apiRequest, {
                callback: function(apiResult) {

                    // Check for errors
                    if (apiResult === EACCESS) {
                        $warningMessage.addClass('visible').text(l[20393]); // Your phone number is already verified
                        $sendButton.addClass('disabled');
                    }
                    else if (apiResult === EEXIST) {
                        $warningMessage.addClass('visible').text(l[20394]); // Phone already in use by other account
                        $sendButton.addClass('disabled');
                    }
                    else if (apiResult === ETEMPUNAVAIL) {
                        $warningMessage.addClass('visible').text(l[20223]); // Too many attempts. Please try in x hours
                        $sendButton.addClass('disabled');
                    }
                    else if (apiResult < 0) {
                        $warningMessage.addClass('visible').text(l[47]); // Oops, something went wrong...
                        $sendButton.addClass('disabled');
                    }
                    else {
                        // Save the call code and phone number details to re-use on the next page if necessary
                        sms.phoneInput.countryName = countryName;
                        sms.phoneInput.countryIsoCode = countryCode;
                        sms.phoneInput.countryCallCode = countryCallingCode;
                        sms.phoneInput.phoneNumber = phoneNum;

                        // Hide the page
                        sms.phoneInput.$page.addClass('hidden');

                        // Load verify code page
                        sms.verifyCode.init();
                    }
                }
            });
        });
    }
};

/**
 * Functions for the SMS code verification page
 */
sms.verifyCode = {

    /** The container dialog with the HTML for all the pages/screens */
    $dialog: null,

    /** The background overlay for the dialog */
    $background: null,

    /** The current page/screen in the flow of the dialog */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the page
        this.$dialog = $('.fm-dialog.verify-phone');
        this.$background = $('.fm-dialog-overlay');
        this.$page = $('.js-verify-code-page');

        // Init functionality
        this.initDisplay();
        this.initResendAndBackButton();
        this.initCodeInputHandlers();
        this.initVerifyButton();

        // Initialise the close button if applicable
        sms.initDialogCloseButton(this.$dialog, this.$background);

        // Show the page
        this.$dialog.removeClass('hidden');
        this.$background.removeClass('hidden');
        this.$page.removeClass('hidden');

        // Put the focus in the code input field after its visible
        this.$page.find('.js-verification-number-input').trigger('focus');
    },

    /**
     * Set/reset the initial display of the dialog if returning to this screen
     */
    initDisplay: function() {

        'use strict';

        var $headerText = this.$dialog.find('.js-header-text');
        var $phoneInput = this.$page.find('.js-user-phone-number');
        var $warningMessage = this.$page.find('.js-warning-message');
        var $codeInput = this.$page.find('.js-verification-number-input');

        // Display full phone number from previous page, hide any previous warnings and clear code entered
        $headerText.text(l[20213]);
        $phoneInput.text('(+' + sms.phoneInput.countryCallCode + ') ' + sms.phoneInput.phoneNumber);
        $warningMessage.removeClass('visible');
        $codeInput.val('');
    },

    /**
     * Initialise the Resend and Back buttons to go back to the previous screen and the phone is pre-filled from state
     */
    initResendAndBackButton: function() {

        'use strict';

        var $resendButton = this.$page.find('.js-resend-button');
        var $backButton = this.$page.find('.js-back-button');

        // On Resend/Close button tap
        $resendButton.add($backButton).rebind('click', function() {

            // Hide the current page
            sms.verifyCode.$page.addClass('hidden');

            // Load the previous page
            sms.phoneInput.init();
        });
    },

    /**
     * Initialise keyup handler to the code input so the button gets enabled if everything is completed
     */
    initCodeInputHandlers: function() {

        'use strict';

        var $codeInput = this.$page.find('.js-verification-number-input');
        var $verifyButton = this.$page.find('.js-verify-button');
        var $warningMessage = this.$page.find('.js-warning-message');

        // Add change and keyup handler for changes to code field
        $codeInput.rebind('change.validate keyup.validate', function() {

            // If the field has 6 numbers, move cursor out of the input and enable the button
            if ($codeInput.val().length === 6) {
                $codeInput.blur();
                $verifyButton.removeClass('disabled');
            }
            else {
                // Otherwise disable the button
                $verifyButton.addClass('disabled');
            }

            // Hide old error message
            $warningMessage.removeClass('visible');
        });

        // Add keypress handler to filter out invalid letters etc to only allow numbers
        $codeInput.rebind('keypress.filterinvalid', function(event) {

            // Get the entered key
            var inputChar = String.fromCharCode(event.which);

            // If not an integer, prevent input from being entered
            if (!/[0-9]/.test(inputChar)) {
                event.preventDefault();
            }
        });

        // Add click handler to clear the input field and disable the button if it is clicked into again
        $codeInput.rebind('click.clearinput', function() {

            $codeInput.val('');
            $verifyButton.addClass('disabled');
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
        $verifyButton.rebind('click', function() {

            // Do not process the click if the code is not entered and the button is not active
            if ($verifyButton.hasClass('disabled')) {
                return false;
            }

            // Get the code, format the phone number for sending and set the success message
            var verificationCode = $verificationCode.val();
            var phoneNumber = '(+' + sms.phoneInput.countryCallCode + ') ' + sms.phoneInput.phoneNumber;
            var successMessage = l[20220].replace('%1', phoneNumber);

            // Send code to the API for verification
            api_req({ a: 'smsv', c: verificationCode }, {
                callback: function(result) {

                    // Check for errors
                    if (result === EACCESS) {
                        $warningMessage.addClass('visible').text(l[20223]);
                        $verifyButton.addClass('disabled');
                    }
                    else if (result === EEXPIRED) {
                        $warningMessage.addClass('visible').text(l[20224]);
                        $verifyButton.addClass('disabled');
                    }
                    else if (result === EFAILED) {
                        $warningMessage.addClass('visible').text(l[20225]);
                        $verifyButton.addClass('disabled');
                    }
                    else if (result === EEXIST || result === ENOENT) {
                        $warningMessage.addClass('visible').text(l[20226]);
                        $verifyButton.addClass('disabled');
                    }
                    else if (result < 0) {
                        $warningMessage.addClass('visible').text(l[47]);  // Oops, something went wrong...
                        $verifyButton.addClass('disabled');
                    }
                    else {
                        // Hide the current page
                        sms.verifyCode.$dialog.addClass('hidden');
                        sms.verifyCode.$background.addClass('hidden');
                        sms.verifyCode.$page.addClass('hidden');

                        // If they were suspended when they started the process
                        if (sms.isSuspended) {

                            // Show a success dialog then load their account after
                            msgDialog('info', l[18280], successMessage, false, function() {

                                // Reset flag
                                sms.isSuspended = false;

                                // Set the message and phone number to show on the login page
                                login_txt = successMessage + ' ' + l[20392];

                                // Log out the partially logged in account and
                                u_logout(true);
                                loadSubPage('login');
                            });
                        }
                        else {
                            // Show achievement success dialog
                            sms.verifySuccess.init();
                        }
                    }
                }
            });
        });
    }
};

/**
 * Functions for the SMS verification success page (only shown for achievement method)
 */
sms.verifySuccess = {

    /** The container dialog with the HTML for all the pages/screens */
    $dialog: null,

    /** The background overlay for the dialog */
    $background: null,

    /** The current page/screen in the flow */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache the page
        this.$dialog = $('.fm-dialog.verify-phone');
        this.$background = $('.fm-dialog-overlay');
        this.$page = $('.js-verify-success-page');

        // Cache the page
        this.$page = $('.js-verify-success-page');

        // Init functionality
        this.initDisplay();
        this.renderAchievementDetails();
        this.initCloseButton();

        // Show the page
        this.$dialog.removeClass('hidden');
        this.$background.removeClass('hidden');
    },

    /**
     * Initialise the display of the dialog
     */
    initDisplay: function() {

        'use strict';

        // Change the dialog's icon to a success icon
        this.$dialog.find('.verify-ph-icon').addClass('hidden');
        this.$dialog.find('.verify-ph-success-icon').removeClass('hidden');
    },

    /**
     * Show the storage, transfer quota and number of days
     */
    renderAchievementDetails: function() {

        'use strict';

        var $page = this.$page;
        var $successMessage = $page.find('.js-body-text');
        var $storageAmount = $page.find('.js-storage-quota');
        var $transferAmount = $page.find('.js-transfer-quota');
        var $validDaysText = $page.find('.js-valid-days');

        // Fetch all account data from the API
        M.accountData(function() {

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            // If this is a non-achievements account
            if (typeof M.account.maf === 'undefined' || sms.achievementUsed) {

                // Set the text to 'Your number (+64) 229876543 has been successfully verified...'
                var phone = '(+' + sms.phoneInput.countryCallCode + ') ' + sms.phoneInput.phoneNumber;
                var successText = l[20220].replace('%1', phone);

                // Show a different success dialog state and text
                $successMessage.text(successText);
                $page.addClass('non-achievement-account');
            }
            else {
                // Otherwise if an achievements account, convert storage and bandwidth to 'x GB'
                var bonuses = M.account.maf.u;
                var storage = bonuses[9][0];
                var transfer = bonuses[9][1];
                var days = bonuses[9][2].replace('d', '');
                var storageQuotaFormatted = bytesToSize(storage, 0);
                var transferQuotaFormatted = bytesToSize(transfer, 0);

                // Update the page text
                $successMessage.text(l[20404]);             // Congratulations! You've just unlocked:
                $storageAmount.text(storageQuotaFormatted);
                $transferAmount.text(transferQuotaFormatted);
                $validDaysText.text(days);
            }
            $page.removeClass('hidden');
        }, true); // Show loading spinner
    },

    /**
     * Initialise the OK button to take them back to their account page
     */
    initCloseButton: function() {

        'use strict';

        var $dialogCloseButton = this.$dialog.find('.js-dialog-close');
        var $pageCloseButton = this.$dialog.find('.js-close-button');

        // On Close button tap
        $dialogCloseButton.add($pageCloseButton).rebind('click', function() {

            loadingDialog.show();

            // Perform User Get request to get the new added phone number
            api_req({ a: 'ug' }, {
                callback: function(res) {

                    loadingDialog.hide();

                    if (typeof res === 'object' && res.smsv) {

                        // Update the SMS Verification (smsv) locally with the user's phone
                        u_attr.smsv = res.smsv;

                        // If not on the account profile page, load it to show the phone number
                        if (page !== 'fm/account') {
                            loadSubPage('fm/account');
                        }
                        else {
                            // Hide the current page
                            sms.verifySuccess.$dialog.addClass('hidden');
                            sms.verifySuccess.$background.addClass('hidden');

                            // Update the UI
                            accountUI.renderAccountPage(M.account);
                            loadingDialog.hide();
                        }
                    }
                }
            });
        });
    }
};
