/**
 * This file contains all the logic for different payment providers, some use dialogs to collect
 * extra information before sending to the API, others redirect directly to the payment provider.
 * Some of the code in this page is also used by the first step of the Pro page to handle return
 * URLS from the payment provider.
 */

/**
 * Code for the AstroPay dialog on the second step of the Pro page
 */
var astroPayDialog = {

    $dialog: null,
    $backgroundOverlay: null,
    $pendingOverlay: null,
    $propayPage: null,

    // Constant for the AstroPay gateway ID
    gatewayId: 11,

    // The provider details
    selectedProvider: null,

    /**
     * Initialise
     * @param {Object} selectedProvider
     */
    init: function (selectedProvider) {

        /* Testing stub for different AstroPay tax validation
        selectedProvider = {
            displayName: 'AstroPay Visa',
            gatewayId: 11,
            gatewayName: 'astropayVI',
            supportsAnnualPayment: 1,
            supportsExpensivePlans: 1,
            supportsMonthlyPayment: 1,
            supportsRecurring: 1,
            type: "subgateway",
            extra: {
                taxIdLabel: 'CPF'
            }
        };
        //*/

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.astropay-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$pendingOverlay = $('.payment-result.pending.original');
        this.$propayPage = $('.payment-section', 'body');

        // Store the provider details
        this.selectedProvider = selectedProvider;

        // Initalise the rest of the dialog
        this.initCloseButton();
        this.initConfirmButton();
        this.updateDialogDetails();
        this.showDialog();
    },

    /**
     * Update the dialog details
     */
    updateDialogDetails: function () {

        // Get the gateway name
        var gatewayName = this.selectedProvider.gatewayName;

        // Change icon and payment provider name
        this.$dialog.find('.provider-icon').removeClass().addClass('provider-icon ' + gatewayName);
        this.$dialog.find('.provider-name').text(this.selectedProvider.displayName);

        // Localise the tax label to their country e.g. GST, CPF
        var taxLabel = l[7989].replace('%1', this.selectedProvider.extra.taxIdLabel);
        var taxPlaceholder = l[7990].replace('%1', this.selectedProvider.extra.taxIdLabel);

        // If on mobile, the input placeholder text is just 'CPF Number'
        if (is_mobile) {
            taxPlaceholder = taxLabel;
        }

        // If they have previously paid before with Astropay
        if (!is_mobile && (alarm.planExpired.lastPayment) && (alarm.planExpired.lastPayment.gwd)) {

            // Get the extra data from the gateway details
            var firstLastName = alarm.planExpired.lastPayment.gwd.name;
            var taxNum = alarm.planExpired.lastPayment.gwd.cpf;

            // Prefill the user's name and tax details
            this.$dialog.find('.astropay-name-field').val(firstLastName);
            this.$dialog.find('.astropay-tax-field').val(taxNum);
        }

        // Change the tax labels
        this.$dialog.find('.astropay-label.tax').text(taxLabel);
        this.$dialog.find('.astropay-tax-field').attr('placeholder', taxPlaceholder);
    },

    /**
     * Display the dialog
     */
    showDialog: function () {

        this.$dialog.removeClass('hidden');
        this.showBackgroundOverlay();

        // Hide the Propage page
        if (is_mobile) {
            this.$propayPage.addClass('hidden');
        }
    },

    /**
     * Hide the overlay and dialog
     */
    hideDialog: function () {

        this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        this.$dialog.addClass('hidden');

        // Show the Propage page
        if (is_mobile) {
            this.$propayPage.removeClass('hidden');
        }
    },

    /**
     * Shows the background overlay
     */
    showBackgroundOverlay: function () {

        // Show the background overlay only for desktop
        if (!is_mobile) {
            this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        }
    },

    /**
     * Functionality for the close button
     */
    initCloseButton: function () {
        "use strict";
        // Initialise the close and cancel buttons
        this.$dialog.find('.fm-dialog-close, .cancel').rebind('click', function () {

            // Hide the overlay and dialog
            astroPayDialog.hideDialog();
        });

        // Prevent close of dialog from clicking outside the dialog
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function (event) {
            event.stopPropagation();
        });
    },

    /**
     * Get the details entered by the user and redirect to AstroPay
     */
    initConfirmButton: function () {
        "use strict";
        this.$dialog.find('.accept').rebind('click', function () {

            // Store the full name and tax number entered
            astroPayDialog.fullName = $.trim(astroPayDialog.$dialog.find('#astropay-name-field').val());
            astroPayDialog.taxNumber = $.trim(astroPayDialog.$dialog.find('#astropay-tax-field').val());

            // Make sure they entered something
            if ((astroPayDialog.fullName === '') || (astroPayDialog.fullName === '')) {

                // Show error dialog with Missing payment details
                msgDialog('warninga', l[6958], l[6959], '', function () {
                    astroPayDialog.showBackgroundOverlay();
                });

                return false;
            }

            // If the tax number is invalid, show an error dialog
            if (!astroPayDialog.taxNumberIsValid()) {

                msgDialog('warninga', l[6958], l[17789], '', function () {
                    astroPayDialog.showBackgroundOverlay();
                });

                return false;
            }

            // Try redirecting to payment provider
            astroPayDialog.hideDialog();
            pro.propay.sendPurchaseToApi();
        });
    },

    /**
     * Checks if the tax number provided is valid for that tax label
     * @returns {Boolean} Returns true if valid, false if not
     */
    taxNumberIsValid: function () {

        'use strict';

        // Use the tax label from the API and the tax number entered by the user
        var taxLabel = astroPayDialog.selectedProvider.extra.taxIdLabel;
        var taxNum = astroPayDialog.taxNumber;

        // Remove special characters and check the length
        var taxNumCleaned = taxNum.replace(/([~!@#$%^&*()_+=`{}\[\]\-|\\:;'<>,.\/? ])+/g, '');
        var taxNumLength = taxNumCleaned.length;

        // Check for Peru (between 8 and 9) and Argentina (between 7 and 9 or 11)
        if (taxLabel === 'DNI' && taxNumLength >= 7 && taxNumLength <= 11) {
            return true;
        }

        // Check for Mexico (between 10 and 18)
        else if (taxLabel === 'CURP / RFC / IFE' && taxNumLength >= 10 && taxNumLength <= 18) {
            return true;
        }

        // Check for Colombia (between 6 and 10)
        else if (taxLabel === 'NUIP / CC / RUT' && taxNumLength >= 6 && taxNumLength <= 10) {
            return true;
        }

        // Check for Uruguay (between 6 and 8)
        else if (taxLabel === 'CI' && taxNumLength >= 6 && taxNumLength <= 8) {
            return true;
        }

        // Check for Chile (between 8 and 9)
        else if (taxLabel === 'RUT' && taxNumLength >= 8 && taxNumLength <= 9) {
            return true;
        }

        // Check for Brazil (CPF and CPNJ)
        else if (taxLabel === 'CPF' &&
            (astroPayDialog.cpfIsValid(taxNumCleaned) || astroPayDialog.cpnjIsValid(taxNumCleaned))) {
            return true;
        }
        else {
            return false;
        }
    },

    /**
     * Validate the Brazillian CPF number (Cadastrado de Pessoas Fisicas) is the equivalent of a personal Brazilian tax
     * registration number. CPF numbers have 11 digits in total: 9 numbers followed by 2 check numbers that are being
     * used for validation. Validation code from:
     * http://nadikun.com/how-to-validate-cpf-number-using-custom-method-in-jquery-validate-plugin/
     *
     * @param {String} taxNum The tax number entered by the user (which contains only numbers, no hyphens etc)
     * @returns {Boolean} Returns true if the CPF is valid
     */
    cpfIsValid: function (taxNum) {

        'use strict';

        // Checking value to have 11 digits only
        if (taxNum.length !== 11) {
            return false;
        }

        var firstCheckNum = parseInt(taxNum.substring(9, 10), 10);
        var secondCheckNum = parseInt(taxNum.substring(10, 11), 10);

        var checkResult = function (sum, checkNum) {
            var result = (sum * 10) % 11;
            if ((result === 10) || (result === 11)) {
                result = 0;
            }
            return (result === checkNum);
        };

        // Checking for dump data
        if (taxNum === '' ||
            taxNum === '00000000000' ||
            taxNum === '11111111111' ||
            taxNum === '22222222222' ||
            taxNum === '33333333333' ||
            taxNum === '44444444444' ||
            taxNum === '55555555555' ||
            taxNum === '66666666666' ||
            taxNum === '77777777777' ||
            taxNum === '88888888888' ||
            taxNum === '99999999999'
        ) {

            return false;
        }

        var sum = 0;

        // Step 1 - using first Check Number:
        for (var i = 1; i <= 9; i++) {
            sum = sum + parseInt(taxNum.substring(i - 1, i), 10) * (11 - i);
        }

        // If first Check Number is valid, move to Step 2 - using second Check Number:
        if (checkResult(sum, firstCheckNum)) {
            sum = 0;
            for (var j = 1; j <= 10; j++) {
                sum = sum + parseInt(taxNum.substring(j - 1, j), 10) * (12 - j);
            }
            return checkResult(sum, secondCheckNum);
        }

        return false;
    },

    /**
     * Validate the Brazillian CPNJ number (Cadastro Nacional da Pessoa Juridica) is the equivalent of a
     * company/organisation/non-personal Brazilian tax registration number. The CNPJ consists of a 14-digit number
     * formatted as 00.000.000/0001-00 - The first eight digits identify the company, the four digits after the slash
     * identify the branch or subsidiary ("0001" defaults to the headquarters), and the last two are check digits.
     * Validation code from:
     * https://github.com/fnando/cpf_cnpj.js/blob/master/lib/cnpj.js
     *
     * @param {String} taxNum The tax number entered by the user (which contains only numbers, no hyphens etc)
     * @returns {Boolean} Returns true if the CPNJ is valid
     */
    cpnjIsValid: function (taxNum) {

        'use strict';

        // Blacklist common values
        var BLACKLIST = [
            '00000000000000',
            '11111111111111',
            '22222222222222',
            '33333333333333',
            '44444444444444',
            '55555555555555',
            '66666666666666',
            '77777777777777',
            '88888888888888',
            '99999999999999'
        ];

        var STRICT_STRIP_REGEX = /[-\/.]/g;
        var LOOSE_STRIP_REGEX = /[^\d]/g;

        var verifierDigit = function (numbers) {

            var index = 2;
            var reverse = numbers.split("").reduce(function (buffer, number) {
                return [parseInt(number, 10)].concat(buffer);
            }, []);

            var sum = reverse.reduce(function (buffer, number) {
                buffer += number * index;
                index = (index === 9 ? 2 : index + 1);
                return buffer;
            }, 0);

            var mod = sum % 11;

            return (mod < 2 ? 0 : 11 - mod);
        };

        var strip = function (number, strict) {

            var regex = strict ? STRICT_STRIP_REGEX : LOOSE_STRIP_REGEX;

            return (number || "").toString().replace(regex, "");
        };

        var isValid = function (number, strict) {

            var stripped = strip(number, strict);

            // CNPJ must be defined
            if (!stripped) {
                return false;
            }

            // CNPJ must have 14 chars
            if (stripped.length !== 14) {
                return false;
            }

            // CNPJ can't be blacklisted
            if (BLACKLIST.indexOf(stripped) >= 0) {
                return false;
            }

            var numbers = stripped.substr(0, 12);
            numbers += verifierDigit(numbers);
            numbers += verifierDigit(numbers);

            return numbers.substr(-2) === stripped.substr(-2);
        };

        return isValid(taxNum);
    },

    /**
     * Redirect to the site
     * @param {String} utcResult containing the url to redirect to
     */
    redirectToSite: function (utcResult) {

        var url = utcResult.EUR['url'];
        window.location = url;
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function (utcResult) {

        // If successful AstroPay result, redirect
        if (utcResult.EUR.url) {
            astroPayDialog.redirectToSite(utcResult);
        }
        else {
            // Hide the loading animation and show an error
            pro.propay.hideLoadingOverlay();
            astroPayDialog.showError(utcResult);
        }
    },

    /**
     * Something has gone wrong just talking to AstroPay
     * @param {Object} utcResult The result from the UTC API call with error codes
     */
    showError: function (utcResult) {

        // Generic error: Oops, something went wrong...
        var message = l[47];

        // Transaction could not be initiated due to connection problems...
        if (utcResult.EUR.error === -1) {
            message = l[7233];
        }

        // Possibly invalid tax number etc
        else if (utcResult.EUR.error === -2) {
            message = l[6959];
        }

        // Too many payments within 12 hours
        else if (utcResult.EUR.error === -18) {
            message = l[7982];
        }

        // Show error dialog
        msgDialog('warninga', l[7235], message, '', function () {
            astroPayDialog.showBackgroundOverlay();
            astroPayDialog.showDialog();
        });
    },

    /**
     * Shows a modal dialog that their payment is pending
     */
    showPendingPayment: function () {

        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$pendingOverlay = $('.payment-result.pending.original');

        // Show the success
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        this.$pendingOverlay.removeClass('hidden');

        insertEmailToPayResult(this.$pendingOverlay);

        if (!u_type || u_type !== 3) {
            this.$pendingOverlay.find('.payment-result-button, .payment-close').addClass('hidden');
        }
        else {
            this.$pendingOverlay.find('.payment-result-button, .payment-close').removeClass('hidden');

            // Add click handlers for 'Go to my account' and Close buttons
            this.$pendingOverlay.find('.payment-result-button, .payment-close').rebind('click', function () {

                // Hide the overlay
                astroPayDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                astroPayDialog.$pendingOverlay.addClass('hidden');

                pro.redirectToSite();
            });
        }
    }
};

/**
 * Code for the voucher dialog on the second step of the Pro page
 * This code is shared for desktop and mobile webclient.
 */
var voucherDialog = {

    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,

    /** The gateway ID for using prepaid balance */
    gatewayId: 0,

    /**
     * Initialisation of the dialog
     */
    init: function() {

        'use strict';

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.voucher-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$successOverlay = $('.payment-result.success');

        // Initialise functionality
        this.initCloseButton();
        this.setDialogDetails();
        this.initPurchaseButton();
        this.initRedeemVoucherButton();
        this.initRedeemVoucherNow();
        this.showVoucherDialog();
    },

    /**
     * Display the dialog
     */
    showVoucherDialog: function() {
        'use strict';
        var self = this;

        // Add the styling for the overlay
        M.safeShowDialog('voucher-dialog', function() {
            self.showBackgroundOverlay();
            return self.$dialog;
        });
    },

    /**
     * Set voucher dialog details on load
     */
    setDialogDetails: function() {

        // Get the selected Pro plan details
        var proNum = pro.propay.selectedProPackage[1];
        var proPlan = pro.getProPlanName(proNum);
        var proPrice = pro.propay.selectedProPackage[5];
        var numOfMonths = pro.propay.selectedProPackage[4];
        var monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);
        var balance = parseFloat(pro.propay.proBalance).toFixed(2);
        var newBalance = parseFloat(balance - proPrice).toFixed(2);
        var oldPlan = pro.membershipPlans.filter(function(item) {
            return item[1] === M.account.type;
        })[0];
        var oldStorage = oldPlan ? (oldPlan[2] * Math.pow(1024, 3)) : 0;
        var newStorage = Math.max(pro.propay.selectedProPackage[2] * Math.pow(1024, 3), oldStorage);
        var newTransfer = pro.propay.selectedProPackage[3] * Math.pow(1024, 3);
        var intl = mega.intl.number;

        // Update template
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4').addClass('pro' + proNum);
        this.$dialog.find('.voucher-plan-title').text(proPlan);
        this.$dialog.find('.voucher-plan-txt .duration').text(monthsWording);
        this.$dialog.find('.voucher-plan-price .price').text(intl.format(proPrice));
        this.$dialog.find('#voucher-code-input input').val('');
        this.changeColourIfSufficientBalance();

        var $voucherAccountBalance = this.$dialog.find('.voucher-account-balance');
        var $balanceAmount = $voucherAccountBalance.find('.balance-amount');
        $balanceAmount.text(intl.format(balance));

        // Mobile specific dialog enhancements
        if (is_mobile) {
            var $newBalanceAmount = $voucherAccountBalance.find('.new-balance-amount');
            var $storageAmount = $voucherAccountBalance.find('.storage-amount');
            var $newStorageAmount = $voucherAccountBalance.find('.new-storage-amount');
            var $transferAmount = $voucherAccountBalance.find('.transfer-amount');
            var $newTransferAmount = $voucherAccountBalance.find('.new-transfer-amount');

            $newBalanceAmount.text(newBalance);

            if (newBalance < 0) {
                $newBalanceAmount.addClass('red');
            }

            $storageAmount.text(bytesToSize(M.account.space));
            $newStorageAmount.text(bytesToSize(M.account.space - oldStorage + newStorage));

            if (M.account.type) {
                $transferAmount.text(bytesToSize(M.account.tfsq.max));
                $newTransferAmount.text(bytesToSize(M.account.tfsq.max + newTransfer));
            }
            else {
                $transferAmount.text('Limited');
                $newTransferAmount.text(bytesToSize(newTransfer));
            }
        }

        clickURLs();

        // Reset state to hide voucher input
        voucherDialog.$dialog.find('.voucher-input-container').fadeOut('fast', function() {
            voucherDialog.$dialog.find('.voucher-redeem-container, .purchase-now-container').fadeIn('fast');
        });
    },

    /**
     * Show green price if they have sufficient funds, or red if they need to top up
     */
    changeColourIfSufficientBalance: function() {

        var price = pro.propay.selectedProPackage[5];

        // If they have enough balance to purchase the plan, make it green
        if (parseFloat(pro.propay.proBalance) >= parseFloat(price)) {
            this.$dialog.find('.voucher-account-balance').addClass('sufficient-funds');
            this.$dialog.find('.voucher-buy-now').addClass('sufficient-funds');
            this.$dialog.find('.voucher-information-help').hide();
            this.$dialog.find('.voucher-redeem').hide();
        }
        else {
            // Otherwise leave it as red
            this.$dialog.find('.voucher-account-balance').removeClass('sufficient-funds');
            this.$dialog.find('.voucher-buy-now').removeClass('sufficient-funds');
            this.$dialog.find('.voucher-information-help').show();
            this.$dialog.find('.voucher-redeem').show();
        }
    },

    /**
     * Functionality for the close button
     */
    initCloseButton: function() {

        // Initialise the close button
        this.$dialog.find('.btn-close-dialog').rebind('click', function() {

            // Hide the overlay and dialog
            voucherDialog.hideDialog();
        });

        // Prevent close of dialog from clicking outside the dialog
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function(event) {
            event.stopPropagation();
        });
    },

    /**
     * Shows the background overlay
     */
    showBackgroundOverlay: function() {

        voucherDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
    },

    /**
     * Hide the overlay and dialog
     */
    hideDialog: function() {
        'use strict';

        closeDialog();
        voucherDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
    },

    /**
     * Functionality for the initial redeem voucher button which shows
     * a text box to enter the voucher code and another Redeem Voucher button
     */
    initRedeemVoucherButton: function() {

        var $this = this;

        // On redeem button click
        $this.$dialog.find('.voucher-redeem').rebind('click', function() {

            // Show voucher input
            $this.$dialog.find('.voucher-redeem-container, .purchase-now-container').fadeOut('fast', function() {
                $this.$dialog.find('.voucher-input-container').fadeIn();
            });
        });
    },

    /**
     * Redeems the voucher
     */
    initRedeemVoucherNow: function() {

        // On redeem button click
        this.$dialog.find('.voucher-redeem-now').rebind('click', function() {

            // Get the voucher code from the input
            var voucherCode = voucherDialog.$dialog.find('#voucher-code-input input').val();

            // If empty voucher show message Error - Please enter your voucher code
            if (voucherCode === '') {
                msgDialog('warninga', l[135], l[1015], '', function() {
                    voucherDialog.showBackgroundOverlay();
                });
            }
            else {
                // Clear text box
                voucherDialog.$dialog.find('#voucher-code-input input').val('');

                // Remove link information to get just the code
                voucherCode = voucherCode.replace('https://mega.nz/#voucher', '');

                // Add the voucher
                voucherDialog.addVoucher(voucherCode);
            }
        });
    },

    /**
     * Redeems the voucher code
     * @param {String} voucherCode The voucher code
     */
    addVoucher: function(voucherCode) {
        'use strict';

        loadingDialog.show();

        M.require('redeem_js')
            .then(function() {
                return redeem.redeemVoucher(voucherCode);
            })
            .then(function(data, res) {
                loadingDialog.hide();

                if (d) {
                    console.debug('voucherDialog.addVoucher', res, data);
                }

                if (data.promotional) {
                    voucherDialog.hideDialog();
                    pro.propay.selectedProPackage = [0, data.proNum];
                    voucherDialog.showSuccessfulPayment();
                    return;
                }

                // Get the latest account balance and update the price in the dialog
                voucherDialog.getLatestBalance(function() {

                    // Format to 2dp
                    var proPrice = pro.propay.selectedProPackage[5];
                    var balance = pro.propay.proBalance.toFixed(2);
                    var newBalance = parseFloat(balance - proPrice).toFixed(2);

                    // Update dialog details
                    voucherDialog.$dialog.find('.voucher-account-balance .balance-amount').text(balance);
                    voucherDialog.$dialog.find('.voucher-account-balance .new-balance-amount').text(newBalance);
                    voucherDialog.changeColourIfSufficientBalance();

                    // Hide voucher input
                    voucherDialog.$dialog.find('.voucher-redeem-container').show();
                    voucherDialog.$dialog.find('.purchase-now-container').show();
                    voucherDialog.$dialog.find('.voucher-input-container').hide();
                });
            })
            .catch(function(ex) {
                loadingDialog.hide();

                if (ex) {
                    msgDialog('warninga', l[135], l[47], ex, function() {
                        voucherDialog.showBackgroundOverlay();
                    });
                }
            });
    },

    /**
     * Gets the latest Pro balance from the API
     * @param {Function} callbackFunction A callback that can be used to continue on or update the UI once up to date
     */
    getLatestBalance: function(callbackFunction) {

        // Flag 'pro: 1' includes the Pro balance in the response
        api_req({ a: 'uq', pro: 1 }, {
            callback : function(result) {

                // If successful result
                if ((typeof result === 'object') && result.balance && result.balance[0]) {

                    // Convert to a float
                    var balance = parseFloat(result.balance[0][0]);

                    // Cache for various uses later on
                    pro.propay.proBalance = balance;
                }

                // Run the callback
                callbackFunction();
            }
        });
    },

    /**
     * Purchase using account balance when the button is clicked inside the Voucher dialog
     */
    initPurchaseButton: function() {

        var $voucherPurchaseButton = this.$dialog.find('.voucher-buy-now');
        var $selectedDurationOption = $('.duration-options-list .membership-radio.checked');

        // On Purchase button click run the purchase process
        $voucherPurchaseButton.rebind('click', function() {

            // Get which plan is selected
            pro.propay.selectedProPackageIndex = $selectedDurationOption.parent().attr('data-plan-index');

            // Set the pro package (used in pro.propay.sendPurchaseToApi function)
            pro.propay.selectedProPackage = pro.membershipPlans[pro.propay.selectedProPackageIndex];

            // Get the plan price
            var selectedPlanPrice = pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_PRICE];

            // Warn them about insufficient funds
            if ((parseFloat(pro.propay.proBalance) < parseFloat(selectedPlanPrice))) {

                // Show warning and re-apply the background because the msgDialog function removes it on close
                msgDialog('warninga', l[6804], l[6805], '', function() {
                    voucherDialog.showBackgroundOverlay();
                });
            }
            else {
                // Hide the overlay and dialog
                voucherDialog.hideDialog();

                // Proceed with payment via account balance
                pro.propay.proPaymentMethod = 'pro_prepaid';
                pro.propay.sendPurchaseToApi();
            }
        });
    },

    /**
     * Shows a successful payment modal dialog
     */
    showSuccessfulPayment: function() {

        // Get the selected Pro plan details
        var proNum = pro.propay.selectedProPackage[1];
        var proPlanName = pro.getProPlanName(proNum);

        // Hide the loading animation
        pro.propay.hideLoadingOverlay();

        // Show the success
        voucherDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        voucherDialog.$successOverlay.removeClass('hidden');
        voucherDialog.$successOverlay.find('.payment-result-txt .plan-name').text(proPlanName);

        insertEmailToPayResult(voucherDialog.$successOverlay);

        // Add click handlers for 'Go to my account' and Close buttons
        voucherDialog.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            voucherDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            voucherDialog.$successOverlay.addClass('hidden');

            pro.redirectToSite();
        });
    }
};

/**
 * Display the wire transfer dialog
 */
var wireTransferDialog = {

    $dialog: null,
    $backgroundOverlay: null,

    /**
     * Open and setup the dialog
     */
    init: function(onCloseCallback) {

        // Close the pro register dialog if it's already open
        $('.pro-register-dialog').removeClass('active').addClass('hidden');

        // Cache DOM reference for faster lookup
        this.$dialog = $('.fm-dialog.wire-transfer-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');

        // Add the styling for the overlay
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Position the dialog and open it
        this.$dialog.css({
            'margin-left': -1 * (this.$dialog.outerWidth() / 2),
            'margin-top': -1 * (this.$dialog.outerHeight() / 2)
        });
        this.$dialog.addClass('active').removeClass('hidden');

        // Initialise the close button
        this.$dialog.find('.btn-close-dialog').rebind('click', function() {
            wireTransferDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            wireTransferDialog.$dialog.removeClass('active').addClass('hidden');

            if (onCloseCallback) {
                onCloseCallback();
            }
            return false;
        });

        // If logged in, pre-populate email address into wire transfer details
        if (typeof u_attr !== 'undefined' && u_attr.email) {

            // Replace the @ with -at- so the bank will accept it on the form
            var email = String(u_attr.email).replace('@', '-at-');

            wireTransferDialog.$dialog.find('.email-address').text(email);
        }

        // Check a Pro plan is selected (it might not be if /wiretransfer page is visited directly)
        if (pro.propay.selectedProPackage !== null) {

            // Get the price of the package
            var proPrice = pro.propay.selectedProPackage[5];

            // Update plan price in the dialog
            if (proPrice) {
                this.$dialog.find('.amount').text(mega.intl.number.format(proPrice)).closest('tr')
                    .removeClass('hidden');
            }
            else {
                this.$dialog.find('.amount').closest('tr').addClass('hidden');
            }
        }
    }
};

/**
 * Code for Dynamic/Union Pay
 */
var unionPay = {

    /** The gateway ID for using Union Pay */
    gatewayId: 5,

    /**
     * Redirect to the site
     * @param {Object} utcResult
     */
    redirectToSite: function(utcResult) {

        // DynamicPay
        // We need to redirect to their site via a post, so we are building a form :\
        var form = $("<form name='pay_form' action='" + utcResult.EUR['url'] + "' method='post'></form>");

        for (var key in utcResult.EUR['postdata']) {
            if (utcResult.EUR['postdata'].hasOwnProperty(key)) {

                var input = $("<input type='hidden' name='" + key + "' value='"
                          + utcResult.EUR['postdata'][key] + "' />");

                form.append(input);
            }
        }
        $('body').append(form);
        form.submit();
    }
};

/**
 * Code for Sabadell Spanish Bank
 */
var sabadell = {

    gatewayId: 17,

    /**
     * Redirect to the site
     * @param {Object} utcResult
     */
    redirectToSite: function(utcResult) {

        // We need to redirect to their site via a post, so we are building a form
        var url = utcResult.EUR['url'];
        var form = $("<form id='pay_form' name='pay_form' action='" + url + "' method='post'></form>");

        for (var key in utcResult.EUR['postdata']) {
            if (utcResult.EUR['postdata'].hasOwnProperty(key)) {

                var input = $("<input type='hidden' name='" + key + "' value='"
                          + utcResult.EUR['postdata'][key] + "' />");

                form.append(input);
            }
        }
        $('body').append(form);
        form.submit();
    },

    /**
     * Show the payment result of success or failure after coming back from the Sabadell site
     * @param {String} verifyUrlParam The URL parameter e.g. 'success' or 'failure'
     */
    showPaymentResult: function(verifyUrlParam) {
        'use strict';
        return pro.showPaymentResult(verifyUrlParam);
    }
};

/**
 * Code for Fortumo mobile payments
 */
var fortumo = {

    /**
     * Redirect to the site
     * @param {String} utsResult (a saleid)
     */
    redirectToSite: function(utsResult) {

        window.location = 'https://megapay.nz/?saleid=' + utsResult;
    }
};

/**
 * Code for tpay mobile payments
 */
var tpay = {

    gatewayId: 14,

    /**
     * Redirect to the site
     * @param {String} utcResult (a saleid)
     */
    redirectToSite: function(utcResult) {

        window.location = 'https://megapay.nz/gwtp.html?provider=tpay&saleid=' + utcResult['EUR']['saleids']
                        + '&params=' + utcResult['EUR']['params'];
    }
};

/* jshint -W003 */  // Warning not relevant

/**
 * Code for directReseller payments such as Gary's 6media
 */
var directReseller = {

    gatewayId: 15,

    /**
     * Redirect to the site
     * @param {String} utcResult A sale ID
     */
    redirectToSite: function(utcResult) {
        var provider = utcResult['EUR']['provider'];
        var params = utcResult['EUR']['params'];
        params = atob(params);

        var baseurls = [
            '',
            'https://mega.6media.tw/', // 6media
            'https://mega.bwm-mediasoft.com/mega.php5?', // BWM Mediasoft
            'https://my.hosting.co.uk/' // Hosting.co.uk
        ];

        if (provider >= 1 && provider <= 3)
        {
            var baseurl = baseurls[provider];
            var urlmod = utcResult['EUR']['urlmod'];

            // If the urlmod is not defined then we use the fully hardcoded url above,
            // otherwise the API is adjusting the end of it.
            if (typeof urlmod !== 'undefined') {
                baseurl += urlmod;
            }
            window.location =  baseurl + params;
        }
    }
};

/**
 * Code for paysafecard
 */
var paysafecard = {

    /** The gateway ID for using paysafecard */
    gatewayId: 10,

    /**
     * Redirect to the site
     * @param {String} utcResult containing the url to redirect to
     */
    redirectToSite: function(utcResult) {
        var url = utcResult.EUR['url'];
        window.location = url;
    },

    /**
     * Something has gone wrong just talking to paysafecard
     */
    showConnectionError: function() {
        msgDialog('warninga', l[7235], l[7233], '', function() {
            pro.propay.hideLoadingOverlay();
            loadSubPage('pro'); // redirect to remove any query parameters from the url
        });
    },

    /**
     * Something has gone wrong with the card association or debiting of the card
     */
    showPaymentError: function() {
        msgDialog('warninga', l[7235], l[7234], '', function() {
            loadSubPage('pro'); // redirect to remove any query parameters from the url
        });
    },

    /**
     * We have been redirected back to mega with the 'okUrl'. We need to ask the API to verify the payment
     * succeeded as per paysafecard's requirements, which they enforce with integration tests we must pass.
     * @param {String} saleIdString A string containing the sale ID e.g. saleid32849023423
     */
    verify: function(saleIdString) {

        // Remove the saleid string to just get the ID to check
        var saleId = saleIdString.replace('saleid', '');

        // Make the vpay API request to follow up on this sale
        var requestData = {
            'a': 'vpay',                      // Credit Card Store
            't': this.gatewayId,              // The paysafecard gateway
            'saleidstring': saleId            // Required by the API to know what to investigate
        };

        api_req(requestData, {
            callback: function (result) {

                // If negative API number
                if ((typeof result === 'number') && (result < 0)) {

                    // Something went wrong with the payment, either card association or actually debitting it
                    paysafecard.showPaymentError();
                }
                else {
                    // Continue to account screen
                    loadSubPage('account');
                }
            }
        });
    }
};

/**
 * Code for Centili mobile payments
 */
var centili = {

    /**
     * Redirect to the site
     * @param {String} utsResult (a saleid)
     */
    redirectToSite: function(utsResult) {

        window.location = 'http://api.centili.com/payment/widget?apikey=9e8eee856f4c048821954052a8d734ac&reference=' + utsResult;
    }
};

/**
 * A dialog to capture the billing name and address before redirecting off-site
 */
var addressDialog = {

    /** Cached jQuery selectors */
    $dialog: null,
    $backgroundOverlay: null,
    $pendingOverlay: null,

    /** The gateway ID for Ecomprocessing */
    gatewayId: 16,

    /** Extra details for the API 'utc' call */
    extraDetails: {},

    /**
     * Open and setup the dialog
     */
    init: function (plan, userInfo, businessRegisterPage) {
        "use strict";
        var self = this;

        if (plan) {
            this.businessPlan = plan;
            this.userInfo = userInfo;
            this.businessRegPage = businessRegisterPage;
        }
        else {
            delete this.businessPlan;
            delete this.userInfo;
            delete this.businessRegPage;
        }

        loadingDialog.show();

        this.fetchBillingInfo().always(function (billingInfo) {
            billingInfo = billingInfo || {};
            var selectedState = ((billingInfo.country === 'US' || billingInfo.country === 'CA')
                && billingInfo.hasOwnProperty('state')) ? billingInfo.state : false;

            self.showDialog();
            self.prefillInfo(billingInfo);
            self.initStateDropDown(selectedState, billingInfo.country);
            self.initCountryDropDown(billingInfo.country);
            loadingDialog.hide();
            self.initCountryDropdownChangeHandler();
            self.initBuyNowButton();
            self.initCloseButton();
            self.initRememberDetailsCheckbox();
        });
    },

    /**
     * Display the dialog
     */
    showDialog: function() {

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.payment-address-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');

        var selectedPlanIndex;
        var selectedPackage;
        var proNum;
        var proPlan;
        var proPrice;
        var numOfMonths;
        var monthsWording;

        // in case we are coming from normal users sign ups (PRO)
        if (!this.businessPlan || !this.userInfo) {
            // Get the selected package
            selectedPlanIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');
            selectedPackage = pro.membershipPlans[selectedPlanIndex];

            // Get the selected Pro plan details
            proNum = selectedPackage[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            proPlan = pro.getProPlanName(proNum);
            proPrice = selectedPackage[pro.UTQA_RES_INDEX_PRICE];
            numOfMonths = selectedPackage[pro.UTQA_RES_INDEX_MONTHS];
            proNum = 'pro' + proNum;
        }
        else {
            // here it means we are coming from business account register page
            proNum = 'business'; // business account Plan icon
            proPlan = l[19510];
            proPrice = (this.userInfo.nbOfUsers * this.businessPlan.p).toFixed(2);
            if (this.businessPlan.pastInvoice && this.businessPlan.currInvoice) {
                // since API returned values types cant be guarnteed,
                // sometimes they are strings, and sometimes they are numbers!
                proPrice = Number(this.businessPlan.currInvoice.t);
                proPrice = proPrice.toFixed(2);
            }
            this.businessPlan.totalPrice = proPrice;
            this.businessPlan.totalUsers = this.userInfo.nbOfUsers;
            numOfMonths = this.businessPlan.m;

            // auto renew is mandatory in business
            this.$dialog.find('.payment-buy-now').text(l[6172]);
        }
        monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);

        // Update template
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4 business')
            .addClass(proNum);
        this.$dialog.find('.payment-plan-title').text(proPlan);
        this.$dialog.find('.payment-plan-txt .duration').text(monthsWording);
        this.$dialog.find('.payment-plan-price .price').text(mega.intl.number.format(proPrice));

        // Show the black background overlay and the dialog
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        this.$dialog.removeClass('hidden');
    },

    /**
     * Creates a list of state names with the ISO 3166-1-alpha-2 code as the option value
     */
    initStateDropDown: function(preselected, country) {

        var stateOptions = '';
        var $statesSelect = this.$dialog.find('.states');

        // Remove all states (leave the first option because its actually placeholder).
        $statesSelect.children(':not(:first-child)').remove();

        // Build options
        $.each(M.getStates(), function(isoCode, stateName) {

            var countryCode = isoCode.substr(0, 2);

            // Create the option and set the ISO code and state name
            var $stateOption = $('<option>').val(isoCode).text(stateName).prop('disabled', countryCode !== country);

            if (preselected && isoCode === preselected) {
                $stateOption.attr('selected', true);
            }

            // Append the HTML to the list of options
            stateOptions += $stateOption.prop('outerHTML');
        });

        // Render the states and update the text when a state is selected
        $statesSelect.append(stateOptions);

        // Initialise the jQueryUI selectmenu
        $statesSelect.selectmenu({
            position: {
                my: "left top-18",
                at: "left bottom-18",
                collision: "flip"  // default is ""
            }
        });

        $statesSelect.selectmenu('refresh');
        $statesSelect.selectmenu(preselected || country === 'US' || country === 'CA' ? 'enable' : 'disable');

    },

    /**
     * Creates a list of country names with the ISO 3166-1-alpha-2 code as the option value
     */
    initCountryDropDown: function(preselected) {

        var countryOptions = '';
        var $countriesSelect = this.$dialog.find('.countries');

        // Remove all countries (leave the first option because its actually placeholder).
        $countriesSelect.children(':not(:first-child)').remove();

        // Build options
        $.each(M.getCountries(), function(isoCode, countryName) {

            // Create the option and set the ISO code and country name
            var $countryOption = $('<option>').val(isoCode).text(countryName);

            if (preselected && isoCode === preselected) {
                $countryOption.attr('selected', true);
            }

            // Append the HTML to the list of options
            countryOptions += $countryOption.prop('outerHTML');
        });

        // Render the countries and update the text when a country is selected
        $countriesSelect.append(countryOptions);

        // Initialise the jQueryUI selectmenu
        $countriesSelect.selectmenu({
            position: {
                my: "left top-18",
                at: "left bottom-18",
                collision: "flip"  // default is ""
            }
        });

        $countriesSelect.selectmenu('refresh');
        $countriesSelect.selectmenu('enable');
    },

    /**
     * Initialises a change handler for the country dropdown. When the country changes to US or
     * Canada it should enable the State dropdown. Otherwise it should disable the dropdown.
     * Only states from the selected country should be shown.
     */
    initCountryDropdownChangeHandler: function() {

        var $countriesSelect = this.$dialog.find('.countries');
        var $statesSelect = this.$dialog.find('.states');
        var $stateSelectmenuButton = this.$dialog.find('#address-dialog-states-button');
        var $postcodeInput = this.$dialog.find(".postcode");
        var $taxcode = $('input.taxcode', this.$dialog).attr('placeholder', 'VAT ' + l[7347]);

        // On dropdown option change
        $countriesSelect.selectmenu({
            change: function(event, ui) {

                // Get the selected country ISO code e.g. CA
                var selectedCountryCode = ui.item.value;

                // If postcode translations not set, then decalre them.
                if (addressDialog.localePostalCodeName === undefined || addressDialog.localePostalCodeName === null) {
                    addressDialog.localePostalCodeName = {
                        "US": "ZIP Code",
                        "CA": "Postal Code",
                        "PH": "ZIP Code",
                        "DE": "PLZ",
                        "AT": "PLZ",
                        "IN": "Pincode",
                        "IE": "Eircode",
                        "BR": "CEP",
                        "IT": "CAP"
                    };
                }

                // If selecting a country whereby the postcode is named differently, update the placeholder value.
                if (addressDialog.localePostalCodeName.hasOwnProperty(selectedCountryCode)) {
                    $postcodeInput.attr("placeholder", addressDialog.localePostalCodeName[selectedCountryCode]);
                } else {
                    $postcodeInput.attr("placeholder", l[10659]);
                }

                // Reset states dropdown to default and select first option
                $statesSelect.find('option:first-child').prop('disabled', false).prop('selected', true);

                // If Canada or United States is selected
                if ((selectedCountryCode === 'CA') || (selectedCountryCode === 'US')) {

                    // Loop through all the states
                    $statesSelect.find('option').each(function() {

                        // Get just the country code from the state code e.g. CA-QC
                        var $stateOption = $(this);
                        var stateCode = $stateOption.val();
                        var countryCode = stateCode.substr(0, 2);

                        // If it's a match, show it
                        if (countryCode === selectedCountryCode) {
                            $stateOption.prop('disabled', false);
                        }
                        else {
                            // Otherwise hide it
                            $stateOption.prop('disabled', true);
                        }
                    });

                    $statesSelect.selectmenu('enable');
                } else {
                    $statesSelect.selectmenu('disable');
                }
                var taxName = getTaxName(selectedCountryCode);
                $taxcode.attr('placeholder', taxName + ' ' + l[7347]);

                // Refresh the selectmenu to show/hide disabled options
                $statesSelect.selectmenu('refresh');

                // Remove any previous validation error
                $stateSelectmenuButton.removeClass('error');
            }
        });
    },

    /**
     * Initialise the button for buy now
     */
    initBuyNowButton: function() {

        // Add the click handler to redirect off site
        this.$dialog.find('.payment-buy-now').rebind('click', function() {

            addressDialog.validateAndPay();
        });
    },

    /**
     * Attempt to prefill the info based on the user_attr information.
     */
    prefillInfo: function(billingInfo) {
        'use strict';
        var $firstName = this.$dialog.find('input.first-name');
        if (billingInfo && billingInfo.hasOwnProperty('firstname')) {
            $firstName.val(billingInfo.firstname);
        } else if (this.businessPlan && this.userInfo && this.userInfo.hasOwnProperty("fname")) {
            $firstName.val(this.userInfo.fname);
        } else if (u_attr && u_attr.hasOwnProperty('firstname')) {
            $firstName.val(u_attr.firstname);
        } else {
            $firstName.val('');
        }

        var $lastName = this.$dialog.find('input.last-name');
        if (billingInfo && billingInfo.hasOwnProperty('lastname')) {
            $lastName.val(billingInfo.lastname);
        } else if (this.businessPlan && this.userInfo && this.userInfo.hasOwnProperty("lname")) {
            $lastName.val(this.userInfo.lname);
        } else if (u_attr && u_attr.hasOwnProperty('lastname')) {
            $lastName.val(u_attr.lastname);
        } else {
            $lastName.val('');
        }

        if (billingInfo) {
            if (billingInfo.hasOwnProperty('address1')) {
                this.$dialog.find(".address1").val(billingInfo.address1);
            }

            if (billingInfo.hasOwnProperty('address2')) {
                this.$dialog.find(".address2").val(billingInfo.address2);
            }

            if (billingInfo.hasOwnProperty('city')) {
                this.$dialog.find(".city").val(billingInfo.city);
            }

            if (billingInfo.hasOwnProperty('postcode')) {
                this.$dialog.find(".postcode").val(billingInfo.postcode);
            }

            if (billingInfo.hasOwnProperty('taxCode')) {
                $('.taxcode', this.$dialog).val(billingInfo.taxCode);
            }
        }
    },

    /**
     * Generate a list of billing info values either saved previously or guessed where applicable.
     * @returns {MegaPromise}
     */
    fetchBillingInfo: function() {
        'use strict';
        var self = this;
        var promise = new MegaPromise();
        mega.attr.get(u_attr.u, 'billinginfo', false, true).always(function(billingInfo) {
            if (typeof billingInfo !== "object") {
                billingInfo = {};
            }

            var finished = function() {
                if (!billingInfo.hasOwnProperty('country') || !billingInfo.country) {
                    billingInfo.country = u_attr.country ? u_attr.country : u_attr.ipcc;
                }
                promise.resolve(billingInfo);
            };

            if (self.businessPlan && u_attr.b) {
                self.fetchBusinessInfo().always(function(businessInfo) {
                    businessInfo = businessInfo || {};
                    var attributes = ["address1","address2","city","state","country","postcode"];
                    for (var i = 0; i < attributes.length; i++) {
                        var attr = attributes[i];
                        var battr = attr === "postcode" ? '%zip' : '%' + attr;
                        if (!billingInfo.hasOwnProperty(attr) || !billingInfo[attr]) {
                            if (businessInfo.hasOwnProperty(battr) && businessInfo[battr]) {
                                billingInfo[attr] = businessInfo[battr];
                            }
                        }
                    }
                    finished();
                });
            } else {
                finished();
            }
        });
        return promise;
    },

    /**
     * Load required business account attributes for payment dialog.
     * @param requiredAttributes
     * @returns {MegaPromise}
     */
    fetchBusinessInfo: function(requiredAttributes) {
        'use strict';

        var promise = new MegaPromise();
        requiredAttributes = requiredAttributes || [
            '%name', '%address1', '%address2', '%city', '%state', '%country', '%zip'
        ];
        var done = 0;
        var businessInfo = {};
        var timeout = null;

        var loaded = function(res, ctx) {
            if (typeof res !== 'number') {
                businessInfo[ctx.ua] = from8(base64urldecode(res));
            }

            if (++done === requiredAttributes.length) {
                clearTimeout(timeout);
                promise.resolve(businessInfo);
            }
        };

        for (var i = 0; i < requiredAttributes.length; i++) {
            var attr = requiredAttributes[i];
            mega.attr.get(u_attr.b.bu, attr, -1, undefined, loaded);
        }

        // If it takes too long just return what we have so far.
        timeout = setTimeout(function() {
            promise.resolve(businessInfo);
        }, 3000);

        return promise;
    },

    /**
     * Initialize the remember billing information checkbox.
     */
    initRememberDetailsCheckbox: function() {
        'use strict';
        var self = this;
        this.$rememberDetailsCheckbox = $(".remember-billing-info-wrapper").find(".checkbox");
        $(".remember-billing-info, .radio-txt", this.$dialog).rebind('click.commonevent', function() {
            if (self.$rememberDetailsCheckbox.hasClass('checkboxOn')) {
                self.$rememberDetailsCheckbox.addClass('checkboxOff').removeClass('checkboxOn');
            }
            else {
                self.$rememberDetailsCheckbox.addClass('checkboxOn').removeClass('checkboxOff');
            }
            return false;
        });
    },

    /**
     * Initialise the X (close) button in the top right corner of the dialog
     */
    initCloseButton: function() {

        'use strict';

        // Change the class depending on mobile/desktop
        var closeButtonClass = (is_mobile) ? 'close-payment-dialog' : 'btn-close-dialog';

        var mySelf = this;

        // Add the click handler to hide the dialog and the black overlay
        this.$dialog.find('.' + closeButtonClass).rebind('click', function() {

            addressDialog.closeDialog();
            // if we are coming from business plan, we need to reset registration
            if (mySelf.businessPlan && mySelf.userInfo) {
                if (page === 'registerb') {
                    page = '';
                    loadSubPage('registerb');
                }
                else if (page === 'repay') {
                    page = '';
                    loadSubPage('repay');
                }
            }
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        this.$dialog.removeClass('active').addClass('hidden');
    },

    /**
     * Collects the form details and validates the form
     */
    validateAndPay: function() {

        // Selectors for form text fields
        var fields = ['first-name', 'last-name', 'address1', 'address2', 'city', 'postcode'];
        var fieldValues = {};

        // Get the values from the inputs
        for (var i = 0; i < fields.length; i++) {

            // Get the form field value
            var fieldName = fields[i];
            var fieldValue = this.$dialog.find('.' + fieldName).val();

            // Trim the text
            fieldValues[fieldName] = $.trim(fieldValue);
        }

        // Get the values from the dropdowns
        var $stateSelect = this.$dialog.find('.states');
        var $countrySelect = this.$dialog.find('.countries');
        var $stateSelectmenuButton = this.$dialog.find('#address-dialog-states-button');
        var $countrySelectmenuButton = this.$dialog.find('#address-dialog-countries-button');
        var state = $stateSelect.val();
        var country = $countrySelect.val();
        var taxCode = $('input.taxcode', this.$dialog).val();

        // Selectors for error handling
        var $errorMessage = this.$dialog.find('.error-message');
        var $allInputs = this.$dialog.find('.fm-account-input, .ui-selectmenu-button');

        // Reset state of past error messages
        var stateNotSet = false;
        $errorMessage.addClass('hidden');
        $allInputs.removeClass('error');

        // Add red border around the missing fields
        $.each(fieldValues, function(fieldName, value) {

            // Make sure the value is set, if not add the class (ignoring address2 field which is not compulsory)
            if ((!value) && (fieldName !== 'address2')) {
                addressDialog.$dialog.find('.' + fieldName).parent().addClass('error');
            }
        });

        // Add red border around the missing country selectmenu
        if (!country) {
            $countrySelectmenuButton.addClass('error');
        }

        // If the country is US or Canada then the State is also required field
        if (((country === 'US') || (country === 'CA')) && !state) {
            $stateSelectmenuButton.addClass('error');
            stateNotSet = true;
        }

        // Check all required fields
        if (!fieldValues['first-name'] || !fieldValues['last-name'] || !fieldValues['address1'] ||
                !fieldValues['city'] || !fieldValues['postcode'] || !country || stateNotSet) {

            // Show a general error and exit early if they are not complete
            $errorMessage.removeClass('hidden');
            return false;
        }

        // If remember billing address, save as user attribute for future usage.
        if (this.$rememberDetailsCheckbox.hasClass("checkboxOn")) {
            var saveAttribute = function(name, value) {
                if (value) {
                    mega.attr.setArrayAttribute('billinginfo', name, value, false, true);
                }
            };
            saveAttribute('firstname', fieldValues['first-name']);
            saveAttribute('lastname', fieldValues['last-name']);
            saveAttribute('address1', fieldValues['address1']);
            saveAttribute('address2', fieldValues['address2']);
            saveAttribute('postcode', fieldValues['postcode']);
            saveAttribute('city', fieldValues['city']);
            saveAttribute('country', country);
            saveAttribute('state', state);
            saveAttribute('taxCode', taxCode);
        } else {
            // Forget Attribute.
            mega.attr.remove('billinginfo', false, true);
        }


        // Send to the API
        this.proceedToPay(fieldValues, state, country, taxCode);
    },

    /**
     * Setup the payment details to send to the API
     * @param {Object} fieldValues The form field names and their values
     * @param {type} state The value of the state dropdown
     * @param {type} country The value of the country dropdown
     */
    proceedToPay: function(fieldValues, state, country, taxCode) {
        'use strict';
        // Set details for the UTC call
        this.extraDetails.first_name = fieldValues['first-name'];
        this.extraDetails.last_name = fieldValues['last-name'];
        this.extraDetails.address1 = fieldValues['address1'];
        this.extraDetails.address2 = fieldValues['address2'];
        this.extraDetails.city = fieldValues['city'];
        this.extraDetails.zip_code = fieldValues['postcode'];
        this.extraDetails.country = country;
        this.extraDetails.recurring = false;
        this.extraDetails.taxCode = taxCode;

        // If the country is US or Canada, add the state by stripping the country code off e.g. to get QC from CA-QC
        if ((country === 'US') || (country === 'CA')) {
            this.extraDetails.state = state.substr(3);
        }

        // check if we are coming from business account register
        if (!this.businessPlan || !this.userInfo) {
            // Get the value for whether the user wants the plan to renew automatically
            var autoRenewCheckedValue = $('.renewal-options-list input:checked', '.payment-section').val();

            // If the provider supports recurring payments and the user wants the plan to renew automatically
            if (autoRenewCheckedValue === 'yes') {
                this.extraDetails.recurring = true;
            }
        }
        else {
            // in business accounts recurring is mandatory
            this.extraDetails.recurring = true;
        }

        // Hide the dialog so the loading one will show, then proceed to pay
        this.$dialog.addClass('hidden');

        if (!this.businessPlan || !this.userInfo || !this.businessRegPage) {
            pro.propay.sendPurchaseToApi();
        }
        else {
            this.businessRegPage.processPayment(this.extraDetails, this.businessPlan);
        }
    },

    /**
     * Redirect to the site
     * @param {String} utcResult containing the url to redirect to
     */
    redirectToSite: function(utcResult) {

        var url = utcResult.EUR['url'];
        window.location = url + '?lang=' + lang;
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function(utcResult) {
        if (utcResult.EUR.url) {
            this.redirectToSite(utcResult);
        }
        else {
            // Hide the loading animation and show the error
            pro.propay.hideLoadingOverlay();
            this.showError(utcResult);
        }
    },

    /**
     * Something has gone wrong with the API and Ecomprocessing setup
     * @param {Object} utcResult The result from the UTC API call with error codes
     */
    showError: function(utcResult) {

        // Generic error: Oops, something went wrong. Please try again later.
        var message = l[200] + ' ' + l[253];

        // Transaction could not be initiated due to connection problems...
        if (utcResult.EUR.error === EINTERNAL) {
            message = l[7233];
        }

        // Please complete the payment details correctly.
        else if (utcResult.EUR.error === EARGS) {
            message = l[6959];
        }

        // You have too many incomplete payments in the last 12 hours...
        else if (utcResult.EUR.error === ETEMPUNAVAIL) {
            message = l[7982];
        }

        // Show error dialog
        msgDialog('warninga', l[7235], message, '', function() {
            addressDialog.showDialog();
        });
    },

    /**
     * Show the payment result of success or failure after coming back from Ecomprocessing
     * @param {String} verifyUrlParam The URL parameter e.g. 'success' or 'failure'
     */
    showPaymentResult: function(verifyUrlParam) {
        'use strict';
        return pro.showPaymentResult(verifyUrlParam);
    }
};

/**
 * Credit card payment dialog
 */
var cardDialog = {

    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,
    $failureOverlay: null,
    $loadingOverlay: null,

    /** Flag to prevent accidental double payments */
    paymentInProcess: false,

    /** The RSA public key to encrypt data to be stored on the Secure Processing Unit (SPU) */
    publicKey: [
        atob(
            "wfvbeFkjArOsHvAjXAJqve/2z/nl2vaZ+0sBj8V6U7knIow6y3/6KJ" +
            "3gkJ50QQ7xDDakyt1C49UN27e+e0kCg2dLJ428JVNvw/q5AQW41" +
            "grPkutUdFZYPACOauqIsx9KY6Q3joabL9g1JbwmuB44Mv20aV/L" +
            "/Xyb2yiNm09xlyVhO7bvJ5Sh4M/EOzRN2HI+V7lHwlhoDrzxgQv" +
            "vKjzsoPfFZaMud742tpgY8OMnKHcfmRQrfIvG/WfCqJ4ETETpr6" +
            "AeI2PIHsptZgOYkkrDK6Bi8qb/T7njk32ZRt1E6Q/N7+hd8PLhh" +
            "2PaYRWfpNiWwnf/rPu4MnwRE6T77s/qGQ=="
        ),
        "\u0001\u0000\u0001",   // Exponent 65537
        2048                    // Key size in bits
    ],

    /** The gateway ID for using Credit cards */
    gatewayId: 8,

    /**
     * Open and setup the dialog
     */
    init: function() {
        this.showCreditCardDialog();
        this.initCountryDropDown();
        this.initExpiryMonthDropDown();
        this.initExpiryYearDropDown();
        this.initInputsFocus();
        this.initPurchaseButton();
    },

    /**
     * Display the dialog
     */
    showCreditCardDialog: function() {

        // Close the pro register dialog if it's already open
        $('.pro-register-dialog').removeClass('active').addClass('hidden');

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.fm-dialog.payment-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$successOverlay = $('.payment-result.success');
        this.$failureOverlay = $('.payment-result.failed');
        this.$loadingOverlay = $('.payment-processing');

        // Add the styling for the overlay
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Position the dialog and open it
        this.$dialog.css({
            'margin-left': -1 * (this.$dialog.outerWidth() / 2),
            'margin-top': -1 * (this.$dialog.outerHeight() / 2)
        });
        this.$dialog.addClass('active').removeClass('hidden');

        // Get the selected Pro plan details
        var proNum = pro.propay.selectedProPackage[1];
        var proPlan = pro.getProPlanName(proNum);
        var proPrice = pro.propay.selectedProPackage[5];
        var numOfMonths = pro.propay.selectedProPackage[4];
        var monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);

        // Update the Pro plan details
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4').addClass('pro' + proNum);
        this.$dialog.find('.payment-plan-title').text(proPlan);
        this.$dialog.find('.payment-plan-price').text(proPrice + '\u20AC');
        this.$dialog.find('.payment-plan-txt').text(monthsWording + ' ' + l[6965] + ' ');

        // Remove rogue colon in translation text
        var statePlaceholder = this.$dialog.find('.state-province').attr('placeholder').replace(':', '');
        this.$dialog.find('.state-province').attr('placeholder', statePlaceholder);

        // Reset form if they made a previous payment
        this.clearPreviouslyEnteredCardData();

        // Initialise the close button
        this.$dialog.find('.btn-close-dialog').rebind('click', function() {
            cardDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            cardDialog.$dialog.removeClass('active').addClass('hidden');

            // Reset flag so they can try paying again
            cardDialog.paymentInProcess = false;
        });

        // Check if using retina display and preload loading animation
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';
        $('.payment-animation').attr('src', staticpath + '/images/mega/payment-animation' + retina + '.gif');
    },

    /**
     * Clears card data and billing details previously entered
     */
    clearPreviouslyEnteredCardData: function() {

        this.$dialog.find('.first-name').val('');
        this.$dialog.find('.last-name').val('');
        this.$dialog.find('.credit-card-number').val('');
        this.$dialog.find('.cvv-code').val('');
        this.$dialog.find('.address1').val('');
        this.$dialog.find('.address2').val('');
        this.$dialog.find('.city').val('');
        this.$dialog.find('.state-province').val('');
        this.$dialog.find('.post-code').val('');
        this.$dialog.find('.expiry-date-month span').text(l[913]);
        this.$dialog.find('.expiry-date-year span').text(l[932]);
        this.$dialog.find('.countries span').text(l[481]);
    },

    /**
     * Initialise functionality for the purchase button
     */
    initPurchaseButton: function() {

        this.$dialog.find('.payment-buy-now').rebind('click', function() {

            // Prevent accidental double click if they've already initiated a payment
            if (cardDialog.paymentInProcess === false) {

                // Set flag to prevent double click getting here too
                cardDialog.paymentInProcess = true;

                // Validate the form and normalise the billing details
                var billingDetails = cardDialog.getBillingDetails();

                // If no errors, proceed with payment
                if (billingDetails !== false) {
                    cardDialog.encryptBillingData(billingDetails);
                }
                else {
                    // Reset flag so they can try paying again
                    cardDialog.paymentInProcess = false;
                }
            }
        });
    },

    /**
     * Creates a list of country names with the ISO 3166-1-alpha-2 code as the option value
     */
    initCountryDropDown: function() {

        var countryOptions = '';
        var $countriesSelect = this.$dialog.find('.default-select.countries');
        var $countriesDropDown = $countriesSelect.find('.default-select-scroll');

        // Build options
        $.each(M.getCountries(), function(isoCode, countryName) {
            countryOptions += '<div class="default-dropdown-item " data-value="' + isoCode + '">'
                            +     countryName
                            + '</div>';
        });

        // Render the countries and update the text when a country is selected
        $countriesDropDown.html(countryOptions);

        // Bind custom dropdowns events
        bindDropdownEvents($countriesSelect);
    },

    /**
     * Creates the expiry month dropdown
     */
    initExpiryMonthDropDown: function() {

        var twoDigitMonth = '';
        var monthOptions = '';
        var $expiryMonthSelect = this.$dialog.find('.default-select.expiry-date-month');
        var $expiryMonthDropDown = $expiryMonthSelect.find('.default-select-scroll');

        // Build options
        for (var month = 1; month <= 12; month++) {
            twoDigitMonth = (month < 10) ? '0' + month : month;
            monthOptions += '<div class="default-dropdown-item " data-value="' + twoDigitMonth + '">'
                          +     twoDigitMonth
                          + '</div>';
        }

        // Render the months and update the text when a country is selected
        $expiryMonthDropDown.html(monthOptions);

        // Bind custom dropdowns events
        bindDropdownEvents($expiryMonthSelect);
    },

    /**
     * Creates the expiry year dropdown
     */
    initExpiryYearDropDown: function() {

        var yearOptions = '';
        var currentYear = new Date().getFullYear();
        var endYear = currentYear + 20;                                     // http://stackoverflow.com/q/2500588
        var $expiryYearSelect = this.$dialog.find('.default-select.expiry-date-year');
        var $expiryYearDropDown = $expiryYearSelect.find('.default-select-scroll');

        // Build options
        for (var year = currentYear; year <= endYear; year++) {
            yearOptions += '<div class="default-dropdown-item " data-value="' + year + '">' + year + '</div>';
        }

        // Render the months and update the text when a country is selected
        $expiryYearDropDown.html(yearOptions);

        // Bind custom dropdowns events
        bindDropdownEvents($expiryYearSelect);
    },

    /**
     * Inputs focused states
     */
    initInputsFocus: function() {
        'use strict';

        this.$dialog.find('.fm-account-input input').rebind('focus', function() {
            $(this).parent().addClass('focused');
        });

        this.$dialog.find('.fm-account-input input').rebind('blur', function() {
            $(this).parent().removeClass('focused');
        });
    },

    /* jshint -W074 */  // Old code, refactor another day

    /**
     * Checks if the billing details are valid before proceeding
     * Also normalise the data to remove inconsistencies
     * @returns {Boolean}
     */
    getBillingDetails: function() {

        // All payment data
        var billingData =    {
            first_name: this.$dialog.find('.first-name').val(),
            last_name: this.$dialog.find('.last-name').val(),
            card_number: this.$dialog.find('.credit-card-number').val(),
            expiry_date_month: this.$dialog.find('.expiry-date-month .active').attr('data-value'),
            expiry_date_year: this.$dialog.find('.expiry-date-year .active').attr('data-value'),
            cv2: this.$dialog.find('.cvv-code').val(),
            address1: this.$dialog.find('.address1').val(),
            address2: this.$dialog.find('.address2').val(),
            city: this.$dialog.find('.city').val(),
            province: this.$dialog.find('.state-province').val(),
            postal_code: this.$dialog.find('.post-code').val(),
            country_code: this.$dialog.find('.countries .active').attr('data-value'),
            email_address: u_attr.email
        };

        // Trim whitespace from beginning and end of all form fields
        $.each(billingData, function(key, value) {
            billingData[key] = $.trim(value);
        });

        // Remove all spaces and hyphens from credit card number
        billingData.card_number = billingData.card_number.replace(/-|\s/g, '');

        // Check the credit card number
        if (!cardDialog.isValidCreditCard(billingData.card_number)) {

            // Show error popup and on close re-add the overlay
            msgDialog('warninga', l[6954], l[6955], '', function() {
                cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            });
            return false;
        }

        // Check the required billing details are completed
        if (!billingData.address1 || !billingData.city || !billingData.province || !billingData.country_code ||
            !billingData.postal_code) {

            // Show error popup and on close re-add the overlay
            msgDialog('warninga', l[6956], l[6957], '', function() {
                cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            });
            return false;
        }

        // Check all the card details are completed
        else if (!billingData.first_name || !billingData.last_name || !billingData.card_number ||
                 !billingData.expiry_date_month || !billingData.expiry_date_year || !billingData.cv2) {

            msgDialog('warninga', l[6958], l[6959], '', function() {
                cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            });
            return false;
        }

        return billingData;
    },
    /* jshint +W074 */

    /**
     * Encrypts the billing data before sending to the API server
     * @param {Object} billingData The data to be encrypted and sent
     */
    encryptBillingData: function(billingData) {

        // Get last 4 digits of card number
        var cardNumberLength = billingData.card_number.length;
        var lastFourCardDigits = billingData.card_number.substr(cardNumberLength - 4);

        // Hash the card data so users can identify their cards later in our system if they
        // get locked out or something. It must be unique and able to be derived again.
        var cardData = JSON.stringify({
            'card_number': billingData.card_number,
            'expiry_date_month': billingData.expiry_date_month,
            'expiry_date_year': billingData.expiry_date_year,
            'cv2': billingData.cv2
        });
        var htmlEncodedCardData = cardDialog.htmlEncodeString(cardData);
        var cardDataHash = sjcl.hash.sha256.hash(htmlEncodedCardData);
        var cardDataHashHex = sjcl.codec.hex.fromBits(cardDataHash);

        // Comes back as byte string, so encode first.
        var jsonEncodedBillingData = JSON.stringify(billingData);
        var htmlAndJsonEncodedBillingData = cardDialog.htmlEncodeString(jsonEncodedBillingData);
        var encryptedBillingData = btoa(paycrypt.hybridEncrypt(htmlAndJsonEncodedBillingData, this.publicKey));

        // Add credit card, the most recently added card is used by default
        var requestData = {
            'a': 'ccs',                          // Credit Card Store
            'cc': encryptedBillingData,
            'last4': lastFourCardDigits,
            'expm': billingData.expiry_date_month,
            'expy': billingData.expiry_date_year,
            'hash': cardDataHashHex
        };

        // Close the dialog
        cardDialog.$dialog.removeClass('active').addClass('hidden');

        // Proceed with payment
        api_req(requestData, {
            callback: function (result) {

                // If negative API number
                if ((typeof result === 'number') && (result < 0)) {
                    cardDialog.showFailureOverlay();
                }
                else {
                    // Otherwise continue to charge card
                    pro.propay.sendPurchaseToApi();
                }
            }
        });
    },

    /**
     * Encode Unicode characters in the string so people with strange addresses can still pay
     * @param {String} input The string to encode
     * @returns {String} Returns the encoded string
     */
    htmlEncodeString: function(input) {

        return input.replace(/[\u00A0-\uFFFF<>\&]/gim, function(i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function(utcResult) {

        // Hide the loading animation
        pro.propay.hideLoadingOverlay();

        // Show credit card success
        if (utcResult.EUR.res === 'S') {
            cardDialog.showSuccessfulPayment(utcResult);
        }

        // Show credit card failure
        else if ((utcResult.EUR.res === 'FP') || (utcResult.EUR.res === 'FI')) {
            cardDialog.showFailureOverlay(utcResult);
        }
    },

    /**
     * Shows a successful payment modal dialog
     */
    showSuccessfulPayment: function() {

        // Close the card dialog and loading overlay
        cardDialog.$failureOverlay.addClass('hidden');
        cardDialog.$loadingOverlay.addClass('hidden');
        cardDialog.$dialog.removeClass('active').addClass('hidden');

        // Get the selected Pro plan details
        var proNum = pro.propay.selectedProPackage[1];
        var proPlanName = pro.getProPlanName(proNum);

        // Show the success
        cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        cardDialog.$successOverlay.removeClass('hidden');
        cardDialog.$successOverlay.find('.payment-result-txt .plan-name').text(proPlanName);

        insertEmailToPayResult(cardDialog.$successOverlay);


        // Add click handlers for 'Go to my account' and Close buttons
        cardDialog.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            cardDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            cardDialog.$successOverlay.addClass('hidden');

            // Remove credit card details from the form
            cardDialog.clearPreviouslyEnteredCardData();

            // Reset flag so they can try paying again
            cardDialog.paymentInProcess = false;

            pro.redirectToSite();
        });
    },

    /**
     * Shows the failure overlay
     * @param {Object} utcResult
     */
    showFailureOverlay: function(utcResult) {

        // Show the failure overlay
        cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        cardDialog.$failureOverlay.removeClass('hidden');
        cardDialog.$loadingOverlay.addClass('hidden');
        cardDialog.$successOverlay.addClass('hidden');

        // If error is 'Fail Provider', get the exact error or show a default 'Something went wrong' type message
        var errorMessage = ((typeof utcResult !== 'undefined') && (utcResult.EUR.res === 'FP'))
                         ? this.getProviderError(utcResult.EUR.code)
                         : l[6950];
        cardDialog.$failureOverlay.find('.payment-result-txt').html(errorMessage);

        // On click of the 'Try again' or Close buttons, hide the overlay and the user can fix their payment details
        cardDialog.$failureOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Reset flag so they can try paying again
            cardDialog.paymentInProcess = false;

            // Hide failure and re-open the dialog
            cardDialog.$failureOverlay.addClass('hidden');

            // Re-open the card dialog
            cardDialog.$dialog.addClass('active').removeClass('hidden');

            loadSubPage('pro');
        });
    },

    /**
     * Gets an error message based on the error code from the payment provider
     * @param {Number} errorCode The error code
     * @returns {String} The error message
     */
    getProviderError: function(errorCode) {

        switch (errorCode) {
            case -1:
                // There is an error with your credit card details.
                return l[6966];
            case -2:
                // There is an error with your billing details.
                return l[6967];
            case -3:
                // Your transaction was detected as being fraudulent.
                return l[6968];
            case -4:
                // You have tried to pay too many times with this credit card recently.
                return l[6969];
            case -5:
                // You have insufficient funds to make this payment.
                return l[6970];
            default:
                // An unknown error occurred. Please try again later.
                return l[7140];
        }
    },

    /**
     * Validates the credit card number is the correct format
     * Written by Jorn Zaefferer
     * From http://jqueryvalidation.org/creditcard-method/ (MIT Licence)
     * Based on http://en.wikipedia.org/wiki/Luhn_algorithm
     * @param {String} cardNum The credit card number
     * @returns {Boolean}
     */
    isValidCreditCard: function(cardNum) {

        // Accept only spaces, digits and dashes
        if (/[^0-9 \-]+/.test(cardNum)) {
            return false;
        }
        var numCheck = 0;
        var numDigit = 0;
        var even = false;
        var num = null;
        var charDigit = null;

        cardNum = cardNum.replace(/\D/g, '');

        // Basing min and max length on
        // http://developer.ean.com/general_info/Valid_Credit_Card_Types
        if (cardNum.length < 13 || cardNum.length > 19) {
            return false;
        }

        for (num = cardNum.length - 1; num >= 0; num--) {
            charDigit = cardNum.charAt(num);
            numDigit = parseInt(charDigit, 10);

            if (even) {
                if ((numDigit *= 2) > 9) {
                    numDigit -= 9;
                }
            }
            numCheck += numDigit;
            even = !even;
        }

        return (numCheck % 10) === 0;
    }
};

/**
 * Bitcoin invoice dialog
 */
var bitcoinDialog = {

    /** Timer for counting down the time till when the price expires */
    countdownIntervalId: 0,

    /** Original HTML of the Bitcoin dialog before modifications */
    dialogOriginalHtml: '',

    /** The gateway ID for using Bitcoin */
    gatewayId: 4,

    /**
     * Step 3 in plan purchase with Bitcoin
     * @param {Object} apiResponse API result
     */
    showInvoice: function(apiResponse) {

        /* Testing data to watch the invoice expire in 5 secs
        apiResponse['expiry'] = Math.round(Date.now() / 1000) + 5;
        //*/

        // Set details
        var bitcoinAddress = apiResponse.address;
        var bitcoinUrl = 'bitcoin:' + apiResponse.address + '?amount=' + apiResponse.amount;
        var invoiceDateTime = new Date(apiResponse.created * 1000);
        var proPlanNum = pro.propay.selectedProPackage[1];
        var planName = pro.getProPlanName(proPlanNum);
        var planMonths = l[6806].replace('%1', pro.propay.selectedProPackage[4]);  // x month purchase
        var priceEuros = pro.propay.selectedProPackage[5];
        var priceBitcoins = apiResponse.amount;
        var expiryTime = new Date(apiResponse.expiry);

        // Cache selectors
        var $dialogBackgroundOverlay = $('.fm-dialog-overlay');
        var $bitcoinDialog = $('.bitcoin-invoice-dialog');

        // If this is the first open
        if (bitcoinDialog.dialogOriginalHtml === '') {

            // Clone the HTML for the original dialog so it can be reset upon re-opening
            bitcoinDialog.dialogOriginalHtml = $bitcoinDialog.html();
        }
        else {
            // Replace the modified HTML with the original HTML
            $bitcoinDialog.safeHTML(bitcoinDialog.dialogOriginalHtml);
        }

        // Render QR code
        bitcoinDialog.generateBitcoinQrCode($bitcoinDialog, bitcoinAddress, priceBitcoins);

        // Update details inside dialog
        $bitcoinDialog.find('.btn-open-wallet').attr('href', bitcoinUrl);
        $bitcoinDialog.find('.bitcoin-address').text(bitcoinAddress);
        $bitcoinDialog.find('.invoice-date-time').text(invoiceDateTime);
        $bitcoinDialog.find('.plan-icon').addClass('pro' + proPlanNum);
        $bitcoinDialog.find('.plan-name').text(planName);
        $bitcoinDialog.find('.plan-duration').text(planMonths);
        $('.plan-price-euros .value', $bitcoinDialog).text(mega.intl.number.format(priceEuros));
        $bitcoinDialog.find('.plan-price-bitcoins').text(priceBitcoins);

        // Set countdown to price expiry
        bitcoinDialog.setCoundownTimer($bitcoinDialog, expiryTime);

        // Close dialog and reset to original dialog
        $bitcoinDialog.find('.btn-close-dialog').rebind('click.bitcoin-dialog-close', function() {

            $dialogBackgroundOverlay.removeClass('bitcoin-invoice-dialog-overlay').addClass('hidden');
            $bitcoinDialog.addClass('hidden');

            // End countdown timer
            clearInterval(bitcoinDialog.countdownIntervalId);
        });

        // Make background overlay darker and show the dialog
        $dialogBackgroundOverlay.addClass('bitcoin-invoice-dialog-overlay').removeClass('hidden');
        $bitcoinDialog.removeClass('hidden');
    },

    /**
     * Renders the bitcoin QR code with highest error correction so that MEGA logo can be overlayed
     * http://www.qrstuff.com/blog/2011/12/14/qr-code-error-correction
     * @param {Object} dialog jQuery object of the dialog
     * @param {String} bitcoinAddress The bitcoin address
     * @param {String|Number} priceInBitcoins The price in bitcoins
     */
    generateBitcoinQrCode: function(dialog, bitcoinAddress, priceInBitcoins) {

        var options = {
            width: 256,
            height: 256,
            correctLevel: QRErrorCorrectLevel.H,    // High
            background: '#ffffff',
            foreground: '#000',
            text: 'bitcoin:' + bitcoinAddress + '?amount=' + priceInBitcoins
        };

        // Render the QR code
        dialog.find('.bitcoin-qr-code').text('').qrcode(options);
    },

    /**
     * Sets a countdown timer on the bitcoin invoice dialog to count down from 15~ minutes
     * until the bitcoin price expires and they need to restart the process
     * @param {Object} dialog The bitcoin invoice dialog
     * @param {Date} expiryTime The date/time the invoice will expire
     */
    setCoundownTimer: function(dialog, expiryTime) {

        // Clear old countdown timer if they have re-opened the page
        clearInterval(bitcoinDialog.countdownIntervalId);

        // Count down the time to price expiration
        bitcoinDialog.countdownIntervalId = setInterval(function() {

            // Show number of minutes and seconds counting down
            var currentTimestamp = Math.round(Date.now() / 1000);
            var difference = expiryTime - currentTimestamp;
            var minutes = Math.floor(difference / 60);
            var minutesPadded = (minutes < 10) ? '0' + minutes : minutes;
            var seconds = difference - (minutes * 60);
            var secondsPadded = (seconds < 10) ? '0' + seconds : seconds;

            // If there is still time remaining
            if (difference > 0) {

                // Show full opacity when 1 minute countdown mark hit
                if (difference <= 60) {
                    dialog.find('.clock-icon').css('opacity', 1);
                    dialog.find('.expiry-instruction').css('opacity', 1);
                    dialog.find('.time-to-expire').css('opacity', 1);
                }

                // Show time remaining
                dialog.find('.time-to-expire').text(minutesPadded + ':' + secondsPadded);
            }
            else {
                // Grey out and hide details as the price has expired
                dialog.find('.scan-code-instruction').css('opacity', '0.25');
                dialog.find('.btn-open-wallet').css('visibility', 'hidden');
                dialog.find('.bitcoin-address').css('visibility', 'hidden');
                dialog.find('.bitcoin-qr-code').css('opacity', '0.15');
                dialog.find('.qr-code-mega-icon').hide();
                dialog.find('.plan-icon').css('opacity', '0.25');
                dialog.find('.plan-name').css('opacity', '0.25');
                dialog.find('.plan-duration').css('opacity', '0.25');
                dialog.find('.plan-price-euros').css('opacity', '0.25');
                dialog.find('.plan-price-bitcoins').css('opacity', '0.25');
                dialog.find('.plan-price-bitcoins-btc').css('opacity', '0.25');
                dialog.find('.expiry-instruction').text(l[8845]).css('opacity', '1');
                dialog.find('.time-to-expire').text('00:00').css('opacity', '1');
                dialog.find('.price-expired-instruction').show();

                // End countdown timer
                clearInterval(bitcoinDialog.countdownIntervalId);
            }
        }, 1000);
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function(utcResult) {

        // Hide the loading animation
        pro.propay.hideLoadingOverlay();

        // Show the Bitcoin invoice dialog
        if (typeof utcResult.EUR === 'object') {
            bitcoinDialog.showInvoice(utcResult.EUR);
        }
        else {
            bitcoinDialog.showBitcoinProviderFailureDialog();
        }
    },

    /**
     * Show a failure dialog if the provider can't be contacted
     */
    showBitcoinProviderFailureDialog: function() {

        var $dialogBackgroundOverlay = $('.fm-dialog-overlay');
        var $bitcoinFailureDialog = $('.bitcoin-provider-failure-dialog');

        // Add styles for the dialog
        $bitcoinFailureDialog.removeClass('hidden');
        $dialogBackgroundOverlay.addClass('bitcoin-invoice-dialog-overlay').removeClass('hidden');

        // End countdown timer
        clearInterval(bitcoinDialog.countdownIntervalId);

        // Close dialog and reset to original dialog
        $bitcoinFailureDialog.find('.btn-close-dialog').rebind('click', function() {
            $dialogBackgroundOverlay.removeClass('bitcoin-invoice-dialog-overlay').addClass('hidden');
            $bitcoinFailureDialog.addClass('hidden');
        });
    }
};

if (is_chrome_firefox) {
    mBroadcaster.once('startMega', function() {
        "use strict";

        unionPay.redirectToSite =
        sabadell.redirectToSite =
            tryCatch(function(res) {
                mozSendPOSTRequest(res.EUR.url, res.EUR.postdata);
            }, function(error) {
                msgDialog('warninga', l[135], l[47], error, function() {
                    pro.propay.hideLoadingOverlay();
                });
            });
    });
}

var insertEmailToPayResult = function($overlay) {
    "use strict";

    if (u_attr && u_attr.email) {
        $overlay.find('.payment-result-txt .user-email').text(u_attr.email);
    } else if (localStorage.awaitingConfirmationAccount) {
        var acc = JSON.parse(localStorage.awaitingConfirmationAccount);
        $overlay.find('.payment-result-txt .user-email').text(acc.email);
    }
};
