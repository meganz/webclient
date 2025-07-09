/**
 * This file contains all the logic for different payment providers, some use dialogs to collect
 * extra information before sending to the API, others redirect directly to the payment provider.
 * Some of the code in this page is also used by the first step of the Pro page to handle return
 * URLS from the payment provider.
 */

var closeButtonJS = 'button.js-close';

var closeStripeDialog = (blockPaymentRefresh) => {
    'use strict';
    if (pro.propay.onPropayPage() && !blockPaymentRefresh) {
        pro.propay.updatePayment();
    }

    pro.propay.hideLoadingOverlay();
    closeDialog();
    $('.fm-dialog-overlay').off('click.stripeDialog');
    $(document).off('keydown.stripeDialog');
};

var resizeDlgScrollBar = function($targetDialog) {
    'use strict';

    const $contentSection = $('section.content', $targetDialog);
    if ($contentSection.is('.ps')) {
        Ps.update($contentSection[0]);
    }
    else {
        Ps.initialize($contentSection[0]);
    }
};

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

    // Cached details to be sent on submit
    fullName: '',
    address: '',
    city: '',
    taxNumber: '',

    confirmationIsShowing: false,

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
        this.$dialog = pro.propay.onPropayPage()
            ? $('.astropay-dialog.propay-inline-dialog')
            : $('.astropay-dialog:not(.propay-inline-dialog)');

        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$pendingOverlay = $('.payment-result.pending.original');
        this.$propayPage = $('.payment-section', 'body');

        // Store the provider details
        this.selectedProvider = selectedProvider;

        // Initalise the rest of the dialog
        this.initCloseButton();
        // this.initConfirmButton();
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
        this.$dialog.find('.astropay-label.tax').text(taxLabel + ':');
        this.$dialog.find('.astropay-tax-field').attr('placeholder', taxPlaceholder);

        // If the provider doesn't support extra address information, hide it.
        // Currently only India needs Address and City, but others may need them in future.
        if (!this.selectedProvider.supportsExtraAddressInfo) {
            this.$dialog.find('.astropay-label.address').addClass('hidden');
            this.$dialog.find('.astropay-address-field').parent().addClass('hidden');
            this.$dialog.find('.astropay-label.city').addClass('hidden');
            this.$dialog.find('.astropay-city-field').parent().addClass('hidden');
        }
    },

    /**
     * Display the dialog
     */
    showDialog: function () {

        this.$dialog.removeClass('hidden');

        // Hide the Propage page
        if (is_mobile) {
            this.$propayPage.addClass('hidden');
        }

        if (!is_mobile) {
            // Keep the ps scrollbar block code after remove the hidden class from the dialog
            // so that it shows the scrollbar initially
            resizeDlgScrollBar(this.$dialog);

            $(window).rebind('resize.billAddressDlg', resizeDlgScrollBar.bind(null, this.$dialog));
        }
    },

    /**
     * Hide the overlay and dialog
     */
    hideDialog: function(force) {
        'use strict';

        if (!this.$dialog) {
            return;
        }

        this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');

        if (!pro.propay.onPropayPage() || force) {
            this.$dialog.addClass('hidden');
        }

        // Show the Propage page
        if (is_mobile) {
            this.$propayPage.removeClass('hidden');
        }
        else {
            $(window).unbind('resize.billAddressDlg');
        }
    },

    /**
     * Shows the background overlay
     */
    showBackgroundOverlay() {
        'use strict';

        if (pro.propay.onPropayPage()) {
            return;
        }

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
        this.$dialog.find('button.js-close, .cancel').rebind('click', function() {

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
    submit() {
        "use strict";
        // Store the full name and tax number entered
        const propayIndicator = pro.propay.onPropayPage() ? 'propay-' : '';
        astroPayDialog.fullName = $.trim(astroPayDialog.$dialog.find(`#${propayIndicator}astropay-name-field`).val());
        astroPayDialog.address = $.trim(astroPayDialog.$dialog.find(`#${propayIndicator}astropay-address-field`).val());
        astroPayDialog.city = $.trim(astroPayDialog.$dialog.find(`#${propayIndicator}astropay-city-field`).val());
        astroPayDialog.taxNumber = $.trim(astroPayDialog.$dialog.find(`#${propayIndicator}astropay-tax-field`).val());


        // Make sure they entered something
        if ((astroPayDialog.fullName === '')) {

            pro.propay.hideLoadingOverlay();
            // Show error dialog with Missing payment details
            msgDialog('warninga', l[6958], l[6959], '', () => {
                astroPayDialog.hideDialog();
            });

            return false;
        }

        // If the tax number is invalid, show an error dialog
        if (!astroPayDialog.taxNumberIsValid()) {

            pro.propay.hideLoadingOverlay();
            msgDialog('warninga', l[6958], l[17789], '', () => {
                if (pro.propay.onPropayPage()) {
                    astroPayDialog.hideDialog();
                }
                else {
                    astroPayDialog.showBackgroundOverlay();
                }
            });


            return false;
        }

        // Try redirecting to payment provider
        astroPayDialog.hideDialog();
        pro.propay.sendPurchaseToApi(11);
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

        // Check for India
        else if (taxLabel === 'PAN' && taxNumLength === 10) {
            return true;
        }

        // Check for Indonesia and Vietnam (no tax requirement), just collect anyway if they do enter something
        else if (taxLabel === 'NPWP' || taxLabel === 'TIN') {
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
        if (pro.propay.onPropayPage()) {
            this.$dialog = $('.voucher-dialog.propay-inline-dialog');
        }
        else {
            this.$dialog = $('.voucher-dialog:not(.propay-inline-dialog)');
        }

        if (!this.$dialog.length) {
            this.$dialog = $('.voucher-dialog');
        }

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

        if (pro.propay.onPropayPage() && pro.propay.usingBalance) {
            return false;
        }

        this.$dialog.removeClass('hidden');
    },

    /**
     * Set voucher dialog details on load
     */
    setDialogDetails: function() {

        const selectedProPackage = pro.propay.getPlan(true);

        // Get the selected Pro plan details
        var proNum = selectedProPackage[1];
        var proPlan = pro.getProPlanName(proNum);
        var proPrice = selectedProPackage[5];
        var numOfMonths = selectedProPackage[4];
        var monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);
        var balance = parseFloat(pro.propay.proBalance).toFixed(2);
        var newBalance = parseFloat(balance - proPrice).toFixed(2);
        var oldPlan = pro.membershipPlans.filter(function(item) {
            return item[1] === M.account.type;
        })[0];
        var oldStorage = oldPlan ? (oldPlan[2] * Math.pow(1024, 3)) : 0;
        var newStorage = Math.max(selectedProPackage[2] * Math.pow(1024, 3), oldStorage);
        var newTransfer = selectedProPackage[3] * Math.pow(1024, 3);

        // Update template
        const $planIcon = this.$dialog.find('.plan-icon');
        $planIcon.removeClass('pro1 pro2 pro3 pro4 feature').addClass('pro' + proNum);

        if (proNum === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
            $planIcon.addClass('feature');
            $('i.feature', $planIcon).attr('class', 'feature sprite-fm-uni icon-crest-vpn');
        }

        this.$dialog.find('.voucher-plan-title').text(proPlan);
        this.$dialog.find('.voucher-plan-txt .duration').text(monthsWording);
        this.$dialog.find('.voucher-plan-price .price').text(formatCurrency(proPrice));
        const hasSufficientBalance = this.changeColourIfSufficientBalance();

        var $voucherAccountBalance = this.$dialog.find('.voucher-account-balance');
        const $balanceAmount = pro.propay.onPropayPage()
            ? $('footer .balance .balance-amount', pro.propay.$page)
            : $('.balance-amount', $voucherAccountBalance);

        $balanceAmount.text(l.account_balance.replace('%1', formatCurrency(balance)));


        // Mobile specific dialog enhancements
        if (is_mobile) {
            var $newBalanceAmount = $voucherAccountBalance.find('.new-balance-amount');
            var $storageAmount = $voucherAccountBalance.find('.storage-amount');
            var $newStorageAmount = $voucherAccountBalance.find('.new-storage-amount');
            var $currentAchievementsAmount = $('.current-achievements-amount', $voucherAccountBalance);
            var $transferAmount = $voucherAccountBalance.find('.transfer-amount');
            var $newTransferAmount = $voucherAccountBalance.find('.new-transfer-amount');

            $newBalanceAmount.text(formatCurrency(newBalance));

            if (newBalance < 0) {
                $newBalanceAmount.addClass('red');
            }

            $storageAmount.text(bytesToSize(M.account.space, 0));
            $newStorageAmount.text(bytesToSize(newStorage, 0));
            if (M.maf.storage && M.maf.storage.current) {
                $currentAchievementsAmount.text(`+ ${bytesToSize(M.maf.storage.current, 0)}`);
                $currentAchievementsAmount.removeClass('hidden');
            }

            if (M.account.type) {
                $transferAmount.text(bytesToSize(M.account.tfsq.max, 0));
                $newTransferAmount.text(bytesToSize(M.account.tfsq.max + newTransfer, 0));
            }
            else {
                $transferAmount.text('Limited');
                $newTransferAmount.text(bytesToSize(newTransfer, 0));
            }
        }

        clickURLs();

        // Reset state to hide voucher input
        $('.voucher-input-container', voucherDialog.$dialog).addClass('hidden');

        if (hasSufficientBalance) {
            $('.voucher-buy-now', voucherDialog.$dialog).removeClass('hidden');
            $('.voucher-redeem', voucherDialog.$dialog).addClass('hidden');
        }
        else {
            $('.voucher-redeem, .voucher-buy-now', voucherDialog.$dialog).removeClass('hidden');
        }
    },

    hasSufficientBalance() {
        'use strict';

        const price = pro.propay.getPlan(true)[5];
        return parseFloat(pro.propay.proBalance) >= parseFloat(price);
        // $('.voucher-information-help', this.$dialog).toggleClass('hidden', hasSufficientBalance);
    },

    /**
     * Show green price if they have sufficient funds, or red if they need to top up
     */
    changeColourIfSufficientBalance: function() {

        const hasSufficientBalance = this.hasSufficientBalance();

        // If they have enough balance to purchase the plan, make it green
        if (hasSufficientBalance) {
            $('.voucher-account-balance', this.$dialog).addClass('sufficient-funds');
            $('.voucher-buy-now', this.$dialog).addClass('sufficient-funds');
        }
        else {
            // Otherwise leave it as red
            $('.voucher-account-balance', this.$dialog).removeClass('sufficient-funds');
            $('.voucher-buy-now', this.$dialog).removeClass('sufficient-funds');
        }

        return hasSufficientBalance;
    },

    /**
     * Functionality for the close button
     */
    initCloseButton: function() {

        // Initialise the close button
        this.$dialog.find('button.js-close, .btn-close-dialog').rebind('click', function() {

            // Hide the overlay and dialog
            voucherDialog.hideDialog();
        });

        // Prevent close of dialog from clicking outside the dialog
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function(event) {
            event.stopPropagation();
        });
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
            $('.voucher-redeem, .voucher-buy-now', $this.$dialog).addClass('hidden');
            $('.voucher-input-container', $this.$dialog).removeClass('hidden');
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
                msgDialog('warninga', l[135], l[1015], '');
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

    setPropayWarning(redeemed) {
        'use strict';

        if (!pro.propay.onPropayPage()
            || !(pro.propay.$page && pro.propay.$page.length)) {
            return;
        }
        pro.propay.updateBalanceDropdownOption();

        if (!(pro.propay.currentGateway && (pro.propay.currentGateway.gatewayId === 0))) {
            return;
        }
        const $voucher = $('.voucher-block', pro.propay.$page);

        const $insufficientBalance = $('.insufficient-balance', $voucher).addClass('hidden');
        const $insufficientBalanceRedeemed = $('.insufficient-balance-redeemed', $voucher).addClass('hidden');
        const $redeemed = $('.redeemed', $voucher).addClass('hidden');

        let state = 0;

        if (!this.hasSufficientBalance() && pro.propay.usingBalance) {
            state |= 1;
        }
        if (redeemed) {
            state |= 2;
        }

        if (!state) {
            return 0;
        }
        else if (state === 3) {
            $('span', $insufficientBalanceRedeemed)
                .text(l.voucher_redeemed_enter_another
                    .replace('%1', formatCurrency(pro.propay.proBalance))
                    .replace('%2', pro.propay.getNumOfMonthsWording(pro.propay.getPlan(true)[4])));

            $insufficientBalanceRedeemed.removeClass('hidden');
        }
        else if (state === 2) {
            $('span', $redeemed)
                .text(l.voucher_redeemed_balance_now
                    .replace('%1', formatCurrency(pro.propay.proBalance)));

            $redeemed.removeClass('hidden');

        }
        else if (state === 1) {
            $('span', $insufficientBalance)
                .text(l.voucher_warn_duration
                    .replace('%1', pro.propay.getNumOfMonthsWording(pro.propay.getPlan(true)[4])));

            $insufficientBalance.removeClass('hidden');
        }

        $voucher.toggleClass('error', !!state);

        return state;
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
            .then(({data, res}) => {
                if (!pro.propay.onPropayPage()) {
                    loadingDialog.hide();
                }

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

                    if (pro.propay.onPropayPage()) {
                        $('span.balance-amount', pro.propay.$page)
                            .text(l.account_balance.replace('%1', formatCurrency(balance)));
                    }
                    else {
                        ('.voucher-account-balance .balance-amount', voucherDialog.$dialog)
                            .text(formatCurrency(balance));
                    }

                    voucherDialog.$dialog.find('.voucher-account-balance .new-balance-amount')
                        .text(formatCurrency(newBalance));
                    const sufficientBalance = voucherDialog.changeColourIfSufficientBalance();

                    $('.redeemed-note span')
                        .text(l.voucher_redeemed_balance_now.replace('%1', formatCurrency(newBalance)));

                    if (!sufficientBalance) {
                        voucherDialog.$dialog.find('.voucher-redeem').removeClass('hidden');
                    }
                    voucherDialog.$dialog.find('.voucher-buy-now').removeClass('hidden');
                    // Hide voucher input
                    $('.voucher-input-container', voucherDialog.$dialog).addClass('hidden');
                    voucherDialog.setPropayWarning(true);
                    voucherDialog.showVoucherDialog();
                    loadingDialog.hide();
                });
            })
            .catch(function(ex) {
                loadingDialog.hide();

                if (ex) {
                    if (ex === ETOOMANY) {
                        ex = l.redeem_etoomany;
                    }
                    msgDialog('warninga', l[135], l[47], ex);
                }
            });
    },

    /**
     * Gets the latest Pro balance from the API
     * @param {Function} callbackFunction A callback that can be used to continue on or update the UI once up to date
     */
    getLatestBalance: function(callbackFunction) {

        // Flag 'pro: 1' includes the Pro balance in the response
        return api_req({ a: 'uq', pro: 1 }, {
            callback(result) {
                // If successful result
                if (typeof result === 'object') {
                    if (result.balance && result.balance[0]) {
                        // Convert to a float
                        var balance = parseFloat(result.balance[0][0]);

                        // Cache for various uses later on

                        pro.propay.proBalance = balance;
                    }

                    // Fetch the user's subscription payment gateway id if has any
                    pro.propay.userSubsGatewayId = result.sgwids && result.sgwids.length > 0 ? result.sgwids[0] : null;
                }

                // Run the callback
                if (typeof callbackFunction === 'function') {
                    callbackFunction();
                }
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
                msgDialog('warningb', l[6804], l[6805], '');
            }
            else {
                // Hide the overlay and dialog
                voucherDialog.hideDialog();

                // Proceed with payment via account balance
                pro.propay.proPaymentMethod = 'pro_prepaid';
                pro.propay.sendPurchaseToApi(0);
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

        // Send some data to mega.io that we updated the Pro plan
        initMegaIoIframe(true, proNum);

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
        var dialogClass = is_mobile ? '.mobile.wire-transfer-dialog' : '.mega-dialog.wire-transfer-dialog';
        this.$dialog = $(dialogClass);
        this.$backgroundOverlay = $('.fm-dialog-overlay');

        // Add the styling for the overlay
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Open the dialog
        this.$dialog.addClass('active').removeClass('hidden');

        // Change the class depending on mobile/desktop
        var closeButtonClass = is_mobile ? '.fm-dialog-close' : closeButtonJS;

        // Initialise the close button
        this.$dialog.find(closeButtonClass).rebind('click', () => {
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
                const discountInfo = pro.propay.getDiscount();
                if (discountInfo &&
                    ((numOfMonths === 1 && discountInfo.emp) || (numOfMonths === 12 && discountInfo.eyp))) {
                    proPrice = numOfMonths === 1 ? mega.intl.number.format(discountInfo.emp)
                        : mega.intl.number.format(discountInfo.eyp);
                }
                this.$dialog.find('.amount').text(formatCurrency(proPrice)).closest('tr').removeClass('hidden');
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

        window.location = `https://megapay.nz/?saleid=${utsResult}&l=${getTransifexLangCode()}`;
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

        window.location = `https://megapay.nz/gwtp.html?provider=tpay&saleid=${utcResult.EUR.saleids}
                           &params=${utcResult.EUR.params}&l=${getTransifexLangCode()}`;
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
            'https://my.cloudbasedbackup.com/'
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
    $propayPage: null,

    /** The gateway ID for Ecomprocessing */
    gatewayId: 16,
    gatewayId_stripe: 19,

    /** Extra details for the API 'utc' call */
    extraDetails: {},
    /** The success cloak and listener if a cloak has been created */
    successCloakInfo: {
        cloak: null,
        listener: null
    },

    validInputs: null,
    billingInfoFilled: null,

    /**
     * Open and setup the dialog
     */
    init(plan, userInfo, businessRegisterPage, blockDialog) {
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
            billingInfo = billingInfo || Object.create(null);

            const selectedState =
                (billingInfo.country === 'US' || billingInfo.country === 'CA') && billingInfo.state || false;

            self.showDialog(blockDialog);
            self.prefillInfo(billingInfo);
            self.initStateDropDown(selectedState, billingInfo.country);
            self.initCountryDropDown(billingInfo.country);

            loadingDialog.hide();
            self.initCountryDropdownChangeHandler();
            self.initBuyNowButton();
            self.initCloseButton();
            self.initRememberDetailsCheckbox();

            onIdle(() => eventlog(500516));
        });
    },

    /**
     * Display the dialog
     */
    showDialog(blockShow) {
        'use strict';

        // Cache DOM reference for lookup in other functions
        // const dialogParent = is_mobile ? '#startholder' : 'section.mega-dialog-container';
        // TODO: Improve for business

        const dialogParent = is_mobile ? '#startholder' : 'section.mega-dialog-container';

        if (pro.propay.onPropayPage()) {
            this.$dialog = $('#propay .payment-address-dialog.propay-dialog');
        }
        else {
            this.$dialog = $('.payment-address-dialog:not(.propay-dialog)', dialogParent);
        }

        if (!this.$dialog.length) {
            this.$dialog = $('.payment-address-dialog');
        }

        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$propayPage = $('.payment-section', '.fmholder');

        const $proPlanDetails = $('.pro-plan-details.paid-only', this.$dialog);
        const $trialDetails = $('.pro-plan-details.free-trial', this.$dialog);

        var selectedPlanIndex;
        var selectedPackage;
        var proNum;
        var proPlan;
        var proPrice;
        var numOfMonths;
        var monthsWording;
        let trial;

        if (!is_mobile) {
            // Hide the warning message when the registerb dialog gets open each time.
            $('.error-message', this.$dialog).addClass('hidden');

            const $paymentIcons = $('.payment-icons', this.$dialog);
            const specialLogos = {
                'stripeAE': 'icon-amex',
                'stripeJC': 'icon-jcb',
                'stripeUP': 'icon-union-pay',
                'stripeDD': 'icon-discover'
            };
            const gate = this.businessPlan && this.businessPlan.usedGateName || pro.propay.proPaymentMethod;
            if (specialLogos[gate]) {

                $('i', $paymentIcons).addClass('hidden');
                $('.payment-provider-icon', $paymentIcons)
                    .removeClass('hidden icon-amex icon-jcb icon-union-pay icon-discover')
                    .addClass(specialLogos[gate]);
            }
            else {
                $('i', $paymentIcons).removeClass('hidden');
                $('.payment-provider-icon', $paymentIcons).addClass('hidden')
                    .removeClass('stripeAE stripeJC stripeUP stripeDD');
            }
        }

        // Get discount information if available
        const discountInfo = pro.propay.getDiscount();

        // in case we are coming from normal users sign ups (PRO)
        if (!this.businessPlan || !this.userInfo) {
            // Get the selected package
            const selectedPackage = pro.propay.getPlan(true);

            // Get the selected Pro plan details
            proNum = selectedPackage[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            proPlan = pro.getProPlanName(proNum);
            proPrice = selectedPackage[pro.UTQA_RES_INDEX_PRICE];
            numOfMonths = selectedPackage[pro.UTQA_RES_INDEX_MONTHS];
            this.proNum = proNum;
            this.numOfMonths = numOfMonths;
            proNum = 'pro' + proNum;

            trial = (!pro.propay.freeTrialCardController || (pro.propay.freeTrialCardController.getVal() !== 'error'))
                ? selectedPackage[pro.UTQA_RES_INDEX_EXTRAS].trial
                : false;

            const $freeTrial = $('.free-trial', this.$dialog).toggleClass('hidden', !trial);
            $('.main-title.paid-only', this.$dialog).toggleClass('hidden', !!trial);
            $('.payment-plan-price', this.$dialog).toggleClass('hidden', !!trial);

            if (trial) {
                $freeTrial.filter('.free-trial-info').text(l.after_trial_card_charged_m);
            }


            if (discountInfo &&
                ((numOfMonths === 1 && discountInfo.emp) || (numOfMonths === 12 && discountInfo.eyp))) {
                proPrice = numOfMonths === 1 ? mega.intl.number.format(discountInfo.emp)
                    : mega.intl.number.format(discountInfo.eyp);
            }
        }
        else {
            // Here it means we are coming from business account register (or Business / Pro Flexi) Repay page
            // Set plan icon
            proNum = this.businessPlan.al === pro.ACCOUNT_LEVEL_PRO_FLEXI ? `pro${this.businessPlan.al}` : 'business';

            // Get the plan number e.g. 100/101 and the plan name e.g. Business/Pro Flexi
            this.proNum = this.businessPlan.al;
            proPlan = pro.getProPlanName(this.proNum);

            if (this.businessPlan.pastInvoice && this.businessPlan.currInvoice) {
                // since API returned values types cant be guarnteed,
                // sometimes they are strings, and sometimes they are numbers!
                proPrice = Number(this.businessPlan.currInvoice.t);
                proPrice = proPrice.toFixed(2);
            }
            else {
                proPrice = (this.userInfo.nbOfUsers * this.businessPlan.userFare
                    + (this.userInfo.quota ? this.userInfo.quota * this.businessPlan.quotaFare : 0)).toFixed(2);
            }
            this.businessPlan.totalPrice = proPrice;
            this.businessPlan.totalUsers = this.userInfo.nbOfUsers;
            this.businessPlan.quota = this.userInfo.quota;
            numOfMonths = this.businessPlan.m;
            this.numOfMonths = numOfMonths;

            // recurring is mandatory in business
            this.$dialog.find('.payment-plan-txt .recurring').text(`(${l[6965]})`);
        }
        monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);

        // If using new multi discount system
        if (discountInfo && discountInfo.pd && discountInfo.md) {

            const $promotionTextSelector = $('.js-multi-discount-recurring .js-discount-text', this.$dialog);
            const $selectedDuration = $('.duration-options-list .membership-radio.checked', this.$propayPage);
            const selectedPlanIndex = $selectedDuration.parent().attr('data-plan-index');

            // Show the Euro Total Discount Price
            proPrice = discountInfo.edtp;
            numOfMonths = discountInfo.m;

            // For text to show months or years when applicable
            let monthsOrYears = numOfMonths;

            // Default to monthly recurring subscription wording
            let discountRecurringText = l.promotion_recurring_info_text_monthly;

            // If the number of months is cleanly divisible by 12 the subscription will recur yearly after the promo
            if (numOfMonths % 12 === 0) {
                monthsOrYears = numOfMonths / 12;
                discountRecurringText = l.promotion_recurring_info_text_yearly;
            }

            // Set the date to current date e.g. 3 May 2022 (will be converted to local language wording/format)
            const date = new Date();
            date.setMonth(date.getMonth() + numOfMonths);

            // Get the selected Pro plan name
            const proPlanName = pro.getProPlanName(discountInfo.al);

            // Get the selected package
            // const selectedPackage = pro.membershipPlans[selectedPlanIndex];
            const selectedPackage = pro.propay.selectedProPackage;
            const regularMonthlyPrice = selectedPackage[pro.UTQA_RES_INDEX_PRICE];

            // Update text for "When the #-month/year promotion ends on 26 April, 2024 you will start a
            // recurring monthly/yearly subscription for Pro I of EUR9.99 and your card will be billed monthly/yearly."
            discountRecurringText = mega.icu.format(discountRecurringText, monthsOrYears);
            discountRecurringText = discountRecurringText.replace('%1', time2date(date.getTime() / 1000, 2));
            discountRecurringText = discountRecurringText.replace('%2', proPlanName);
            discountRecurringText = discountRecurringText.replace('%3', formatCurrency(regularMonthlyPrice));

            // Update the text (if the recurring option is selected, it
            // will be shown in the payment address dialog when opened)
            $promotionTextSelector.text(discountRecurringText);
        }

        $('.mobile.separator-line.paid-only', this.$dialog).toggleClass('hidden', !!trial);

        if (trial) {
            if (is_mobile) {
                $proPlanDetails.addClass('hidden');
                $trialDetails.removeClass('hidden');
                $('.trial-title', $trialDetails).text(proPlan);
            }
            else {
                $('.payment-plan-title', this.$dialog).text(proPlan);
            }

        }
        else {
            $proPlanDetails.removeClass('hidden');
            $trialDetails.addClass('hidden');

            this.$dialog.find('.payment-plan-title').text(proPlan);
            this.$dialog.find('.payment-plan-txt .duration').text(monthsWording);
            this.proPrice = formatCurrency(proPrice);
            this.$dialog.find('.payment-plan-price .price').text(this.proPrice);
        }
        if (this.businessPlan) {
            $('.duration', $('.payment-note-first.recurring', this.$dialog).removeClass('hidden')).text(l[10628]);
        }

        if (!blockShow) {
            // Show the black background overlay and the dialog
            this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            this.$dialog.removeClass('hidden');
        }


        this.firstNameMegaInput = new mega.ui.MegaInputs($('.first-name', this.$dialog));
        this.lastNameMegaInput = new mega.ui.MegaInputs($('.last-name', this.$dialog));
        this.addressMegaInput = new mega.ui.MegaInputs($('.address1', this.$dialog));
        this.address2MegaInput = new mega.ui.MegaInputs($('.address2', this.$dialog));
        this.cityMegaInput = new mega.ui.MegaInputs($('.city', this.$dialog));
        this.postCodeMegaInput = new mega.ui.MegaInputs($('.postcode', this.$dialog));
        this.taxCodeMegaInput = new mega.ui.MegaInputs($('.taxcode', this.$dialog));

        this.firstNameMegaInput.$input.rebind('focus.logFnEvent', () => eventlog(500450));
        this.lastNameMegaInput.$input.rebind('focus.logLnEvent', () => eventlog(500451));
        this.addressMegaInput.$input.rebind('focus.logAddEvent', () => eventlog(500452));
        this.address2MegaInput.$input.rebind('focus.logAdd2Event', () => eventlog(500453));
        this.cityMegaInput.$input.rebind('focus.logCityEvent', () => eventlog(500454));
        this.postCodeMegaInput.$input.rebind('focus.logPcEvent', () => eventlog(500455));
        this.taxCodeMegaInput.$input.rebind('focus.logTaxEvent', () => eventlog(500456));

        if (!is_mobile) {
            // Keep the ps scrollbar block code after remove the hidden class from the dialog
            // so that it shows the scrollbar initially
            resizeDlgScrollBar(this.$dialog);

            $(window).rebind('resize.billAddressDlg', resizeDlgScrollBar.bind(null, this.$dialog));
        }
    },

    /**
     * Binds Select events for mobile, Dropdown component events for desktop
     * @param {Object} $select jQuery object of the Select menu or dropdown
     */
    bindPaymentSelectEvents: function($select) {
        "use strict";

        if (is_mobile) {
            $select.rebind('change.defaultSelectChange', function() {
                var $this = $(this);

                $('option', $this).attr('data-state', '');
                $(':selected', $this).attr('data-state', 'active');
            });
        }
        else {
            bindDropdownEvents($select, undefined, !is_mobile && this.$dialog);
        }
    },

    /**
     * Creates a list of state names with the ISO 3166-1-alpha-2 code as the option value
     * @param {String} preselected ISO code of preselected country
     * @param {String} country ISO code of country
     */
    initStateDropDown: function(preselected, country) {

        let $statesSelect;
        if (pro.propay.onPropayPage()) {
            $statesSelect = $('.states' + (is_mobile ? '.mobile' : '.desktop') + '-device', this.$dialog)
                .removeClass('hidden');
            $('.states' + (is_mobile ? '.desktop' : '.mobile') + '-device', this.$dialog).addClass('hidden');
        }
        else {
            $statesSelect = $('.states', this.$dialog);
        }

        var $selectScroll = $('.dropdown-scroll', $statesSelect);
        var $optionsContainer = is_mobile ? $statesSelect : $selectScroll;
        var option = is_mobile ? 'option' : 'div';

        // Remove all states (leave the first option because its actually placeholder).
        $selectScroll.empty();

        // Build options
        $.each(M.getStates(), function(isoCode, stateName) {

            var countryCode = isoCode.substr(0, 2);
            var itemNode;

            // Create the option and set the ISO code and state name
            itemNode = mCreateElement(option, {
                'class': 'option' + (countryCode !== country ? ' hidden' : ''),
                'data-value': isoCode,
                'data-state': preselected && isoCode === preselected ? 'active' : ''
            }, $optionsContainer[0]);
            mCreateElement('span', undefined, itemNode).textContent = stateName;

            if (preselected && isoCode === preselected) {
                $('> span', $statesSelect).text(stateName);

                // Set value to default Select menu for mobile
                if (is_mobile) {
                    $statesSelect.val(stateName);
                }
            }
        });

        // Initialise the selectmenu
        this.bindPaymentSelectEvents($statesSelect);

        if (preselected || country === 'US' || country === 'CA') {
            $statesSelect.removeClass('disabled').removeAttr('disabled');
        }
        else {
            $statesSelect.addClass('disabled').attr('disabled', 'disabled');
        }
    },

    /**
     * Creates a list of country names with the ISO 3166-1-alpha-2 code as the option value
     */
    initCountryDropDown: function(preselected) {

        let $countriesSelect;
        if (pro.propay.onPropayPage()) {
            $countriesSelect = $('.countries' + (is_mobile ? '.mobile' : '.desktop') + '-device', this.$dialog)
                .removeClass('hidden');
            $('.countries' + (is_mobile ? '.desktop' : '.mobile') + '-device', this.$dialog).addClass('hidden');
        }
        else {
            $countriesSelect = $('.countries', this.$dialog);
        }

        // var $countriesSelect = $('.countries', this.$dialog);
        var $selectScroll = $('.dropdown-scroll', $countriesSelect);
        var $optionsContainer = is_mobile ? $countriesSelect : $selectScroll;
        var option = is_mobile ? 'option' : 'div';

        // Remove all countries (leave the first option because its actually placeholder).
        $selectScroll.empty();

        if (pro.propay.onPropayPage()) {
            $('*:not(.default)', $optionsContainer).remove();
        }

        // Build options
        $.each(M.getCountries(), function(isoCode, countryName) {

            var itemNode;

            // Create the option and set the ISO code and country name
            itemNode = mCreateElement(option, {
                'class': 'option',
                'data-value': isoCode,
                'data-state': preselected && isoCode === preselected ? 'active' : ''
            }, $optionsContainer[0]);
            mCreateElement('span', undefined, itemNode).textContent = countryName;

            if (preselected && isoCode === preselected) {
                $('> span', $countriesSelect).text(countryName);

                // Set value to default Select menu for mobile
                if (is_mobile) {
                    $countriesSelect.val(countryName);
                }
            }
        });

        // Initialise the selectmenu
        this.bindPaymentSelectEvents($countriesSelect);

        $countriesSelect
            .rebind('click.logEvent', () => eventlog(500449))
            .removeClass('disabled').removeAttr('disabled');
    },

    /**
     * Initialises a change handler for the country dropdown. When the country changes to US or
     * Canada it should enable the State dropdown. Otherwise it should disable the dropdown.
     * Only states from the selected country should be shown.
     */
    initCountryDropdownChangeHandler: function() {

        var inputSelector = function(input) {
            return Array.isArray(input) ? input[1] : input;
        };

        var $countriesSelect = $('.countries', this.$dialog);
        const $statesSelect = pro.propay.onPropayPage()
            ? $('.states' + (is_mobile ? '.mobile' : '.desktop') + '-device', this.$dialog)
            : $('.states', this.$dialog);
        var $postcodeInput = inputSelector(this.postCodeMegaInput);
        var $taxcodeMegaInput = inputSelector(this.taxCodeMegaInput);
        const $titleElemTaxCode = $('.mega-input-title', $taxcodeMegaInput.$input.parent());
        const $titleElemPostCode = $('.mega-input-title', $postcodeInput.$input.parent());
        const $propayTaxTitle = $('.taxcode-title', this.$dialog);

        const countryCode = $('.option[data-state="active"]', $countriesSelect).attr('data-value');
        const taxName = getTaxName(countryCode);
        const fullTaxName = `${taxName} ${l[7347]}`;

        if ($titleElemTaxCode.length) {
            $taxcodeMegaInput.updateTitle(fullTaxName);
        }
        else {
            $taxcodeMegaInput.$input.attr('placeholder', fullTaxName);
        }

        if (pro.propay.onPropayPage() && $propayTaxTitle.length) {
            $propayTaxTitle.text(taxName);
        }

        // Change the States depending on the selected country
        var changeStates = function(selectedCountryCode) {
            if ($titleElemPostCode.length) {
                $postcodeInput.updateTitle(l[10659]);
            }
            else {
                $postcodeInput.$input.attr('placeholder',l[10659]);
            }

            // If Canada or United States is selected
            if (selectedCountryCode === 'CA' || selectedCountryCode === 'US') {

                var $options = $('.option', $statesSelect);

                // Loop through all the states
                for (var i = 0; i < $options.length; i++) {
                    var $stateOption = $($options[i]);
                    var stateCode = $stateOption.attr('data-value');
                    var countryCode = stateCode.substr(0, 2);

                    // If it's a match, show it
                    if (countryCode === selectedCountryCode) {
                        $stateOption.removeClass('hidden');
                    }
                    else {
                        // Otherwise hide it
                        $stateOption.addClass('hidden');
                    }
                }

                $statesSelect.removeClass('disabled').removeAttr('disabled');
                $statesSelect.attr('tabindex', '7');
                $statesSelect.rebind('keydown.propay', function(e) {
                    if (this === document.activeElement) {
                        if (e.shiftKey && e.keyCode === 9) {
                            $('.city', this.$dialog).focus();
                        }
                        else if (e.keyCode === 9) {
                            $('.postcode', this.$dialog).focus();
                        }
                    }
                });
            }
            else {
                $statesSelect.addClass('disabled').attr('disabled', 'disabled');
                $statesSelect.attr('tabindex', '-1');
                $statesSelect.off('keydown.propay');
                $('span', $statesSelect).first().text(l[7192]);
                $('.option', $statesSelect).removeAttr('data-state').removeClass('active');
            }

            var taxName = getTaxName(selectedCountryCode);
            if ($titleElemTaxCode.length) {
                $taxcodeMegaInput.updateTitle(taxName + ' ' + l[7347]);
            }
            else {
                $taxcodeMegaInput.$input.attr('placeholder',taxName + ' ' + l[7347]);
            }

            // Remove any previous validation error
            $statesSelect.removeClass('error');
        };

        // Get the selected country ISO code e.g. CA and change States
        if (is_mobile) {

            $countriesSelect.rebind('change.selectCountry', function() {
                changeStates($(':selected', $(this)).attr('data-value'));
            });
        }
        else {

            $('.option', $countriesSelect).rebind('click.selectCountry', function() {
                changeStates($(this).attr('data-value'));
            });
        }
    },

    /**
     * Initialise the button for buy now
     */
    initBuyNowButton: function() {

        // Add the click handler to redirect off site
        this.$dialog.find('.payment-buy-now').rebind('click', function() {
            addressDialog.validateAndPay((info) => {
                if (pro.propay.onPropayPage()) {
                    pro.propay.initBillingInfo(info).then(() => {
                        pro.propay.updatePayment.bind(pro.propay)();
                        addressDialog.closeDialog();
                    });
                }
            }, false, false, pro.propay.onPropayPage());
            eventlog(500458);
        });
    },

    /**
     * Attempt to prefill the info based on the user_attr information.
     */
    prefillInfo: function(billingInfo) {
        'use strict';

        if (this.billingInfoFilled) {
            return;
        }

        const prefillMultipleInputs = (inputs, value) => {
            if (Array.isArray(inputs)) {
                inputs.forEach(($megaInput) => {
                    $megaInput.setValue(value);
                });
            }
            else {
                inputs.setValue(value);
            }
        };


        const getBillingProp = (propName, encoded) => {
            if (!billingInfo[propName] || !encoded) {
                return billingInfo[propName];
            }
            const val = tryCatch(() => from8(billingInfo[propName]), () => {
                console.error(`Invalid utf-8 encoded key value ${propName} -> ${billingInfo[propName]}`);
            })();
            return val || billingInfo[propName];
        };

        const fillInputFromAttr = ($input, businessAttrName, Atrrname) => {
            if (this.businessPlan && this.userInfo && this.userInfo.hasOwnProperty(businessAttrName)) {
                prefillMultipleInputs($input, this.userInfo[businessAttrName]);
            }
            else if (window.u_attr && u_attr[Atrrname]) {
                prefillMultipleInputs($input, u_attr[Atrrname]);
            }
            else {
                prefillMultipleInputs($input, '');
            }
        };

        let noFname = true;
        let noLname = true;

        if (billingInfo) {
            const encodedVer = !!billingInfo.version;

            if (billingInfo.firstname) {
                prefillMultipleInputs(this.firstNameMegaInput, getBillingProp('firstname', encodedVer));
                noFname = false;
            }

            if (billingInfo.lastname) {
                prefillMultipleInputs(this.lastNameMegaInput, getBillingProp('lastname', encodedVer));
                noLname = false;
            }

            if (billingInfo.address1) {
                prefillMultipleInputs(this.addressMegaInput, getBillingProp('address1', encodedVer));
            }

            if (billingInfo.address2) {
                prefillMultipleInputs(this.address2MegaInput, getBillingProp('address2', encodedVer));
            }

            if (billingInfo.city) {
                prefillMultipleInputs(this.cityMegaInput, getBillingProp('city', encodedVer));
            }

            if (billingInfo.postcode) {
                prefillMultipleInputs(this.postCodeMegaInput, getBillingProp('postcode', encodedVer));
            }

            if (billingInfo.taxCode) {
                prefillMultipleInputs(this.taxCodeMegaInput, getBillingProp('taxCode', encodedVer));
            }
        }
        if (noFname) {
            fillInputFromAttr(this.firstNameMegaInput, 'fname', 'firstname');
        }
        if (noLname) {
            fillInputFromAttr(this.lastNameMegaInput, 'lname', 'lastname');
        }

        this.billingInfoFilled = true;
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
                if (!billingInfo.country) {
                    billingInfo.country = u_attr.country ? u_attr.country : u_attr.ipcc;
                }
                promise.resolve(billingInfo);
            };

            if (self.businessPlan && u_attr.b) {
                self.fetchBusinessInfo().always(function(businessInfo) {
                    const attributes = ["address1", "address2", "city", "state", "country", "postcode"];

                    businessInfo = businessInfo || Object.create(null);
                    for (var i = 0; i < attributes.length; i++) {
                        var attr = attributes[i];
                        var battr = attr === "postcode" ? '%zip' : '%' + attr;

                        if (!billingInfo[attr] && businessInfo[battr]) {
                            billingInfo[attr] = businessInfo[battr];
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
        var timeout = null;
        const businessInfo = Object.create(null);

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

        // If the user has not checked the remember checkbox, clear the billing info fields
        // We won't save the billing info, but may appear to the user that we do in this case if we don't clear it
        if (!this.$rememberDetailsCheckbox.hasClass("checkboxOn")) {
            const $billingInfoInputs = $('.content-block.address-block .mega-input', this.$dialog);
            $('.address1, .address2, .city, .state, .postcode, .country, .taxcode', $billingInfoInputs)
                .val('')
                .parent().removeClass('valued');
        }

        $(".remember-billing-info, .radio-txt", this.$dialog).rebind('click.commonevent', function() {
            if (self.$rememberDetailsCheckbox.hasClass('checkboxOn')) {
                self.$rememberDetailsCheckbox.addClass('checkboxOff').removeClass('checkboxOn');
            }
            else {
                self.$rememberDetailsCheckbox.addClass('checkboxOn').removeClass('checkboxOff');
            }

            eventlog(500457);

            return false;
        });
    },

    /**
     * Initialise the X (close) button in the top right corner of the dialog
     */
    initCloseButton: function() {

        'use strict';

        // Change the class depending on mobile/desktop
        var closeButtonClass = is_mobile ? '.close-payment-dialog' : closeButtonJS;

        var mySelf = this;

        // Add the click handler to hide the dialog and the black overlay
        this.$dialog.find(closeButtonClass).rebind('click', function() {

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
            else if (addressDialog.mostRecentValidInput) {
                pro.propay.fillBillingInfo(addressDialog.mostRecentValidInput);
                delete addressDialog.mostRecentValidInput;
            }
            else {
                addressDialog.billingInfoFilled = false;
            }

            eventlog(500459);
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog(callback) {
        'use strict';

        if (this.$backgroundOverlay) {
            this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            this.$dialog.removeClass('active').addClass('hidden');
        }
        if (typeof callback === 'function') {
            callback();
        }
    },

    /**
     * Collects the form details and validates the form
     */
    validateAndPay(callback, validateOnly, allowEcpFlow, blockPayment) {
        'use strict';

        const inputSelector = function(input) {
            return Array.isArray(input) ? input[1] : input;
        };
        // Selectors for form text fields
        const fields = ['first-name', 'last-name', 'address1', 'address2', 'city', 'postcode'];
        const fieldValues = Object.create(null);

        // Get the values from the inputs
        for (let i = 0; i < fields.length; i++) {

            // Get the form field value
            const fieldName = fields[i];
            const fieldValue = $(`.${fieldName}`, this.$dialog).val();

            // Trim the text
            fieldValues[fieldName] = $.trim(fieldValue);
        }

        // Get the values from the dropdowns
        const $stateSelect = $('.states', this.$dialog);
        const $countrySelect = $('.countries', this.$dialog);
        const state = $('.option[data-state="active"]', $stateSelect).attr('data-value');
        const country = $('.option[data-state="active"]', $countrySelect).attr('data-value');
        const taxCode = inputSelector(this.taxCodeMegaInput).$input.val();

        // Selectors for error handling
        const $errorMessage = $('.error-message', this.$dialog);
        const $errorMessageContainers = $('.message-container', this.$dialog);
        const $allInputs = $('.mega-input', this.$dialog);

        // Reset state of past error messages
        let stateNotSet = false;
        $errorMessage.addClass(is_mobile ? 'v-hidden' : 'hidden');
        $errorMessageContainers.addClass('hidden');
        $allInputs.removeClass('error');
        $stateSelect.removeClass('error');
        $countrySelect.removeClass('error');

        // Add red border around the missing fields
        $.each(fieldValues, function(fieldName, value) {

            // Make sure the value is set, if not add the class (ignoring address2 field which is not compulsory)
            if ((!value) && (fieldName !== 'address2')) {
                addressDialog.$dialog.find('.' + fieldName).parent().addClass('error');
            }
        });

        // Add red border around the missing country selectmenu
        if (!country) {
            $countrySelect.addClass('error');
        }

        // If the country is US or Canada then the State is also required field
        if (((country === 'US') || (country === 'CA')) && !state) {
            $stateSelect.addClass('error');
            stateNotSet = true;
        }

        // Check all required fields
        if (!fieldValues['first-name']
            || !fieldValues['last-name']
            || !fieldValues.address1
            || !fieldValues.city
            || !fieldValues.postcode
            || !country
            || stateNotSet) {

            console.warn('validateAndPay: Incomplete form fields', fieldValues, country, state, taxCode);

            // Show a general error and exit early if they are not complete
            $errorMessage.removeClass(is_mobile ? 'v-hidden' : 'hidden');

            // Scroll down to the error message automatically if on large scaled displays
            const $contentSection = $('section.content.ps', this.$dialog);
            if ($contentSection.length > 0) {
                const scrollBottom = $contentSection.get(0).scrollHeight - $contentSection.get(0).clientHeight;
                if (scrollBottom > 0) {
                    $contentSection.scrollTop(scrollBottom);
                }
            }

            addressDialog.validInputs = addressDialog.validInputs || false;

            onIdle(() => eventlog(500517));

            return false;
        }
        addressDialog.validInputs = true;

        addressDialog.mostRecentValidInput = {
            ...fieldValues,
            firstname: fieldValues['first-name'],
            lastname: fieldValues['last-name'],
            country,
            state,
            taxCode
        };

        if (validateOnly) {
            return;
        }

        // If remember billing address, save as user attribute for future usage.
        if (this.$rememberDetailsCheckbox.hasClass("checkboxOn")) {
            const saveAttribute = function(name, value) {
                if (value) {
                    return mega.attr.setArrayAttribute('billinginfo', name, value, false, true);
                }
            };
            saveAttribute('firstname', to8(fieldValues['first-name']));
            saveAttribute('lastname', to8(fieldValues['last-name']));
            saveAttribute('address1', to8(fieldValues.address1));
            saveAttribute('address2', to8(fieldValues.address2));
            saveAttribute('postcode', to8(fieldValues.postcode));
            saveAttribute('city', to8(fieldValues.city));
            saveAttribute('country', country);
            saveAttribute('state', state);
            saveAttribute('taxCode', to8(taxCode));
            saveAttribute('version', '2');
        } else {
            // Forget Attribute.
            const removeAttribute = function(name) {
                mega.attr.setArrayAttribute('billinginfo', name, '', false, true);
            };
            removeAttribute('firstname');
            removeAttribute('lastname');
            removeAttribute('address1');
            removeAttribute('address2');
            removeAttribute('postcode');
            removeAttribute('city');
            removeAttribute('country');
            removeAttribute('state');
            removeAttribute('taxCode');
            removeAttribute('version');
        }

        // log the click on the 'subscribe' button
        delay('addressDlg.click', eventlog.bind(null, 99789));


        if (typeof callback === 'function') {
            callback(addressDialog.mostRecentValidInput);
            delete addressDialog.mostRecentValidInput;
        }
        if (pro.propay.onPropayPage()) {
            addressDialog.closeDialog();
        }

        // Send to the API
        if (!blockPayment) {
            this.proceedToPay(fieldValues, state, country, taxCode, allowEcpFlow);
        }
    },

    /**
     * Setup the payment details to send to the API
     * @param {Object} fieldValues The form field names and their values
     * @param {type} state The value of the state dropdown
     * @param {type} country The value of the country dropdown
     */
    proceedToPay(fieldValues, state, country, taxCode, allowEcpFlow) {
        'use strict';
        // Set details for the UTC call
        this.extraDetails.first_name = fieldValues['first-name'];
        this.extraDetails.last_name = fieldValues['last-name'];
        this.extraDetails.address1 = fieldValues['address1'];
        this.extraDetails.address2 = fieldValues['address2'];
        this.extraDetails.city = fieldValues['city'];
        this.extraDetails.zip_code = fieldValues['postcode'];
        this.extraDetails.country = country;
        this.extraDetails.recurring = true;
        this.extraDetails.taxCode = taxCode;

        // If the country is US or Canada, add the state by stripping the country code off e.g. to get QC from CA-QC
        if ((country === 'US') || (country === 'CA')) {
            this.extraDetails.state = state.substr(3);
        }

        // Hide the dialog so the loading one will show, then proceed to pay
        this.$dialog.addClass('hidden');

        const propayGatewayId = pro.propay.currentGateway && pro.propay.currentGateway.gatewayId;

        if (!this.businessPlan || !this.userInfo || !this.businessRegPage) {
            if (!this.businessPlan && !this.businessRegPage && pro.propay.trial && pro.propay.shouldShowTrial()) {
                pro.propay.redeemFreeTrial();
            }
            else if ((propayGatewayId !== 16) || allowEcpFlow) {
                pro.propay.sendPurchaseToApi(propayGatewayId);
            }
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
     * Showing the infinite cloak after the payment has been made
     * @param {String} titleTxt Success title
     * @param {String} msgTxt Success text
     * @param {String} btnTxt Success button text
     * @param {Function} callback Success callback
     * @param {Boolean | string} isEur If the success message should show localCurrency, or the currency
     * @returns {void}
     */
    showSuccessCloak(titleTxt, msgTxt, btnTxt, callback, showDisclaimer) {
        'use strict';

        if (this.successCloakInfo.cloak) {
            this.successCloakInfo.cloak.remove();
        }

        if (!Array.isArray(msgTxt)) {
            msgTxt = [msgTxt];
        }
        if (typeof showDisclaimer === 'string') {
            showDisclaimer = showDisclaimer !== 'EUR';
        }

        const lastLineClassName = 'mb-10 mt-0';
        const msgLen = msgTxt.length;

        const textItems = msgTxt.reduce((wrapper, msg, i) => {
            const text = document.createElement(is_mobile
                ? 'span'
                : 'p');
            const isLast = i === (msgLen - 1);
            text.className = isLast ? lastLineClassName : 'mb-0 mt-0';
            text.textContent = msg + (isLast ? '' : ' ');
            wrapper.appendChild(text);
            return wrapper;
        }, document.createElement('div'));

        textItems.className = 'text-wrapper';

        const div = document.createElement('div');
        const icon = document.createElement('i');
        const title = document.createElement('p');

        const spacerDiv = document.createElement('div');
        const estimatedPriceDiv = document.createElement('div');
        const mainContentDiv = document.createElement('div');

        title.className = 'font-h3-bold my-4 title';
        div.className = 'payment-success-cloak flex flex-column justify-between items-center gap-4'
            + (is_mobile ? ' mobile' : '');
        mainContentDiv.className = 'payment-success-content-wrapper flex flex-column justify-center items-center'
            + (pro.propay.shouldShowTrial() ? ' trial' : '');
        icon.className = 'sprite-fm-mono icon-check-circle-thin-outline';
        estimatedPriceDiv.className = 'font-h3-bold mb-8';

        estimatedPriceDiv.textContent = showDisclaimer ? `*${l[18770]}` : '';
        title.textContent = titleTxt;

        mainContentDiv.appendChild(icon);
        mainContentDiv.appendChild(title);

        mainContentDiv.appendChild(textItems);

        const button = document.createElement('button');
        button.textContent = btnTxt;
        button.className = 'mega-button large positive';
        button.addEventListener('click', callback);

        mainContentDiv.appendChild(button);
        div.appendChild(spacerDiv);
        div.appendChild(mainContentDiv);
        div.appendChild(estimatedPriceDiv);
        document.body.appendChild(div);

        this.successCloakInfo.cloak = div;
        this.successCloakInfo.listener = mBroadcaster.once('beforepagechange', () => {
            div.remove();
        });
    },

    getStripeDialog() {
        'use strict';

        if (!pro.propay.onPropayPage()) {
            return $('.payment-stripe-dialog.business');
        }

        if (!pro.propay.paymentButton) {
            return $('.payment-stripe-dialog:not(.stripe-button):not(.business)');
        }

        return $(`footer.${$('body').innerWidth() >= 1080 ? 'desktop' : 'mobile'} .stripe-button`, pro.propay.$page);
    },

    showPaymentSuccess() {
        'use strict';
        const $stripeDialog = this.getStripeDialog();
        const $stripeIframe = $('iframe#stripe-widget', $stripeDialog);

        if (parseInt(pro.propay.planNum) === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
            this.showSuccessCloak(
                l[6961],
                l.vpn_purchase_success_txt.replace('%1', u_attr.email || ''),
                l.goto_mega_vpn,
                () => {
                    mega.redirect('mega.io', 'vpn#downloadapps', false, false);
                }
            );

            pro.propay.hideLoadingOverlay();
        }
        else if (parseInt(pro.propay.planNum) === pro.ACCOUNT_LEVEL_FEATURE_PWM) {
            this.showSuccessCloak(
                l[6961],
                l.pwm_purchase_success_txt.replace('%1', u_attr.email || ''),
                l.goto_mega_pass,
                () => {
                    mega.redirect('mega.io', 'pass#downloadapps', false, false);
                }
            );

            pro.propay.hideLoadingOverlay();
        }
        else if (pro.propay.onPropayPage() && pro.propay.paymentButton) {
            this.showSuccessCloak(
                l['6961'],
                l.upgraded_account
                    .replace('%1', u_attr.email || '')
                    .replace('%2', pro.getProPlanName(pro.propay.planNum)),
                l['6826'],
                () => {
                    if (pro.propay.planObj && (pro.propay.planObj.level === pro.ACCOUNT_LEVEL_PRO_FLEXI)) {
                        delete addressDialog.paymentInProcess;
                        fm_fullreload(null, 'upf-proflexi').catch(dump);
                    }
                    else {
                        pro.redirectToSite();
                    }
                });

            pro.propay.hideLoadingOverlay();
        }
        else {
            const $stripeSuccessDialog = $('.payment-stripe-success-dialog'
                + ((pro.propay.onPropayPage() && is_mobile) ? '.mobile' : ''));

            // If this is newly created business account, it then requires verification
            if (addressDialog.userInfo && !addressDialog.userInfo.isUpgrade) {
                $('.success-desc', $stripeSuccessDialog).safeHTML(l[25081]);
                $('button.js-close, .btn-close-dialog', $stripeSuccessDialog).addClass('hidden');
            }
            else {
                $('button.js-close, .btn-close-dialog', $stripeSuccessDialog)
                    .removeClass('hidden')
                    .rebind('click.stripeDlg', closeDialog);

                delay('reload:stripe', pro.redirectToSite, 4000);
            }

            pro.propay.hideLoadingOverlay();

            M.safeShowDialog('stripe-pay-success', $stripeSuccessDialog);
        }

        $stripeIframe.remove();
        $stripeDialog.addClass('hidden');
    },

    stripePaymentChecker: function(saleId) {
        'use strict';
        addressDialog.stripeCheckerCounter++;
        if (addressDialog.stripeCheckerCounter > 20) {
            return;
        }

        const shift = 500;
        const base = 3000; // 3sec
        const nextTick = addressDialog.stripeCheckerCounter * shift + base;

        this.paymentInProcess = true;

        if (pro.propay.shouldShowTrial()) {
            api.screq({a: 'cft', id: saleId}).then(({result}) => {

                if (+result === 1) {
                    pro.propay.paymentStatusChecker =
                        setTimeout(addressDialog.stripePaymentChecker.bind(addressDialog, saleId), nextTick);
                    return;
                }

                if (+result === 0) {
                    const $stripeDialog = this.getStripeDialog();
                    const $stripeIframe = $('iframe#stripe-widget', $stripeDialog);

                    // Assume all trials are monthly plans at the moment
                    const plan = pro.getPlan(pro.propay.planNum, 1);
                    const planPrice = plan[pro.UTQA_RES_INDEX_LOCALPRICE] || plan[pro.UTQA_RES_INDEX_PRICE];
                    const planCurrency = plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] || 'EUR';
                    const planNumber = parseInt(pro.propay.planNum);
                    const planTaxInfo = pro.getStandardisedTaxInfo(pro.getPlan(pro.propay.planNum, 1));

                    const baseString = planTaxInfo
                        ? l.m_sub_will_start_tma.replace('%3', pro.taxInfo.taxName)
                        : l.m_sub_will_start;

                    const startDateTxt = baseString
                        .replace('%1', formatCurrency(planPrice, planCurrency, 'narrowSymbol')
                            + (planCurrency === 'EUR' ? '' : '*'))
                        .replace('%2', time2date((Date.now() / 1000) + pro.propay.trial.days * 86400, 2));

                    if (planNumber === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                        onIdle(() => eventlog(500525));

                        this.showSuccessCloak(
                            l.trial_started,
                            [startDateTxt, l.cancel_to_avoid_charge],
                            l.goto_mega_vpn,
                            () => {
                                onIdle(() => eventlog(500526));
                                mega.redirect('mega.io', 'vpn#downloadapps', false, false);
                            },
                            planCurrency
                        );

                        // pro.propay.hideLoadingOverlay();
                    }
                    else if (planNumber === pro.ACCOUNT_LEVEL_FEATURE_PWM) {
                        onIdle(() => eventlog(500563));

                        this.showSuccessCloak(
                            l.trial_started,
                            [startDateTxt, l.cancel_to_avoid_charge],
                            l.goto_mega_pass,
                            () => {
                                onIdle(() => eventlog(500564));
                                mega.redirect('mega.io', 'pass#downloadapps', false, false);
                            },
                            planCurrency
                        );
                    }

                    $stripeIframe.remove();
                    $stripeDialog.addClass('hidden');

                    closeStripeDialog(true);
                    delete addressDialog.paymentInProcess;
                }

            }).catch((ex) => {
                closeStripeDialog();
                delete addressDialog.paymentInProcess;
                if (ex === EEXIST) {
                    const planNumber = parseInt(pro.propay.planNum);
                    const warningTitle = planNumber === pro.ACCOUNT_LEVEL_FEATURE_VPN
                        ? l.vpn_free_trial_used_h
                        : l.pwm_free_trial_used_h;

                    msgDialog(
                        `confirmationa:!^${l.subscribe_btn}!${l[82]}`,
                        '',
                        warningTitle,
                        l.vpn_free_trial_used_b,
                        (yes) => {
                            if (yes) {
                                localStorage.ignoreTrial = '1';
                                window.location.reload();
                            }
                        }
                    );

                    onIdle(() => eventlog(500522));
                }
                else {
                    tell(ex);
                }
            });
            return;
        }

        // If saleId is already an array of sale IDs use that, otherwise add to an array
        const saleIdArray = Array.isArray(saleId) ? saleId : [saleId];

        api.screq({a: 'utd', s: saleIdArray})
            .then(({result}) => {
                assert(typeof result === 'string');

                if (typeof result === 'string') {
                    // success
                    this.showPaymentSuccess();
                    if (pro.propay.planObj && (pro.propay.planObj.level !== pro.ACCOUNT_LEVEL_PRO_FLEXI)) {
                        delete addressDialog.paymentInProcess;
                    }
                }

            })
            .catch((ex) => {
                if (ex === ENOENT) {
                    pro.propay.paymentStatusChecker =
                        setTimeout(addressDialog.stripePaymentChecker.bind(addressDialog, saleId), nextTick);
                }
                else {
                    tell(ex);
                    delete addressDialog.paymentInProcess;
                }
            });
    },

    stripeFrameHandler: function(event) {
        'use strict';
        if (d) {
            console.log(event);
        }

        clearTimeout(pro.propay.paymentStatusChecker);
        clearTimeout(pro.propay.listenRemover);

        const failHandle = (error) => {
            const $stripeDialog = addressDialog.getStripeDialog();
            const $stripeFailureDialog = $('.payment-stripe-failure-dialog');
            const $stripeIframe = $('iframe#stripe-widget', $stripeDialog);

            $('button.js-close, .btn-close-dialog', $stripeFailureDialog).rebind('click.stripeDlg', () => {

                closeDialog();
                // if we are coming from business plan, we need to reset registration
                if (addressDialog.businessPlan && addressDialog.userInfo) {
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

            $('.stripe-error', $stripeFailureDialog).safeHTML(error || '');

            if (addressDialog.stripeSaleId === 'EDIT') {
                $((is_mobile ? '.fail-head' : '.payment-stripe-failure-dialog-title'), $stripeFailureDialog)
                    .text(l.payment_gw_update_fail);
            }

            $stripeIframe.remove();
            closeStripeDialog();
            M.safeShowDialog('stripe-pay-failure', $stripeFailureDialog);
        };

        const getErrorText = (failData) => {
            // failData[2] = error code from megapay
            // failData[3] = decline code (if it exists) from megapay
            if (typeof failData === 'object') {
                if (failData[3] === 'insufficient_funds') { // Insufficient funds
                    return l.stripe_insufficient_funds_error;
                }
                if (failData[3] === 'generic_decline') { // Generic error
                    return l.stripe_generic_decline_error;
                }
                if (failData[2] === 'incorrect_cvc') { // Incorrect security code
                    return l.stripe_incorrect_cvc_error;
                }
                if (failData[2] === 'card_declined') { // Declined
                    return l.stripe_card_declined_error;
                }

                // Return result.error.message from megapay if the above checks fail
                return failData[1];
            }

            // Return the card declined error if failData isn't an object or is empty
            return l.stripe_card_declined_error;
        };

        if (event && event.origin === addressDialog.gatewayOrigin && event.data) {
            if (typeof event.data !== 'string') {
                tryCatch(() => {
                    api_req({a: 'log', e: 99741, m: JSON.stringify(event.data)});
                });
                failHandle(l[1679]);
                return;
            }
            if (event.data.startsWith('json^')) {
                const eventData = JSON.parse(event.data.split('^')[1]);
                if (eventData && (eventData.type === 'resize')) {
                    // Resize the stripe iframe
                    const $stripeDialog = addressDialog.getStripeDialog();
                    const $stripeIframe = $('.iframe-container', $stripeDialog);
                    if ($stripeIframe) {
                        $stripeIframe.css('height', eventData.height + 'px');
                    }
                }
                window.addEventListener('message', addressDialog.stripeFrameHandler, {once: true});
                return;
            }
            if (event.data.startsWith('eventlog^')) {
                // Log events that come from the stripe iframe dialog
                onIdle(() => eventlog(event.data.split('^')[1]));
                return;
            }
            if (event.data === 'closeme') {
                closeStripeDialog();

                onIdle(() => eventlog(500519));

                // Load the proper page UI after close the stripe payment dialog
                if (page === 'registerb') {
                    page = '';
                    loadSubPage('registerb');
                }
                else if (page === 'repay') {
                    page = '';
                    loadSubPage('repay');
                }
                return;
            }


            // TODO: add a prefix to express checkout messages
            if ((event.data === 'hideButtonLoading')
                || (event.data === 'showLoading')
                || (event.data === 'invalidInput')
                || (event.data === 'paymentCancelled')
                || (event.data === 'validInput')) {

                if (event.data === 'showLoading') {
                    pro.propay.showLoadingOverlay('processing');
                }
                else if (event.data === 'invalidInput') {
                    pro.propay.hideLoadingOverlay();
                }
                else if (event.data === 'paymentCancelled') {
                    pro.propay.hideLoadingOverlay();
                    pro.propay.updatePayment();
                }
                else if (event.data === 'validInput') {
                    pro.propay.showLoadingOverlay('transferring');
                }
                else {
                    $('.stripe-button .loader').addClass('hidden');
                }

                window.addEventListener('message', addressDialog.stripeFrameHandler, {once: true});
                pro.propay.listenRemover = setTimeout(() => {
                    window.removeEventListener('message', addressDialog.stripeFrameHandler, {once: true});
                }, 7e5);
                return;
            }

            if (event.data.startsWith('payfail^')) {
                failHandle(getErrorText(event.data.split('^')));
            }
            else if (event.data === 'paysuccess') {

                if (addressDialog.stripeSaleId === 'EDIT') {
                    closeStripeDialog();

                    if (is_mobile) {
                        if (page === 'fm/account/paymentcard') {
                            mega.ui.toast.show(l.payment_card_update_desc, 6);
                            loadSubPage('fm/account');
                        }
                    }
                    else {
                        msgDialog('info', '', l.payment_card_update, l.payment_card_update_desc, () => {
                            if (page.startsWith('fm/account/plan')) {
                                accountUI.plan.init(M.account);
                            }
                        });
                    }
                }
                else {
                    addressDialog.stripeCheckerCounter = 0;

                    pro.propay.paymentStatusChecker =
                        setTimeout(addressDialog.stripePaymentChecker
                            .bind(addressDialog, addressDialog.stripeSaleId), 500);
                }
            }
            else if (event.data.startsWith('action^')) {
                const destURL = event.data.split('^')[1] || '';
                if (!destURL) {
                    failHandle(getErrorText());
                }
                else {
                    window.location = destURL;
                }
            }
        }
        else {
            window.addEventListener('message', addressDialog.stripeFrameHandler, { once: true });
            pro.propay.listenRemover = setTimeout(() => {
                window.removeEventListener('message', addressDialog.stripeFrameHandler, { once: true });
            }, 7e5);
        }
    },

    stripeLocal: function() {
        'use strict';
        switch (lang) {
            case 'br': return 'pt';
            case 'cn': return 'zh';
            case 'ct': return 'zh-HK';
            case 'jp': return 'ja';
            case 'kr':
            case 'vi': return 'en'; // no support for Korean and Vietnamese
            default: return lang;
        }
    },

    stripeCheckerCounter: 0,
    stripeSaleId: null,

    /**
     * Process the result from the API User Transaction Complete call
     *
     * @param {Object} utcResult The results from the UTC call
     * @param {Boolean} isStripe A flag if 'Stripe' gateway is used
     * @param {String} saleId Saleid to check
     */
    processUtcResult: function(utcResult, isStripe, saleId) {
        'use strict';

        this.gatewayOrigin = null;

        if (utcResult.EUR === 0) {

            this.showPaymentSuccess();
            return;
        }

        if (!utcResult.EUR) {
            console.error('unexpected result...', utcResult);
            utcResult.EUR = false;
        }

        if (isStripe && !((typeof utcResult.EUR === 'object') && utcResult.EUR.error)) {
            this.stripeSaleId = null;
            if (utcResult.EUR) {
                const $stripeDialog = this.getStripeDialog().toggleClass('edit', !!utcResult.edit);
                const $iframeContainer = pro.propay.paymentButton
                    ? $('.iframe-container', $stripeDialog)
                    : $('.mobile.payment-stripe-dialog .iframe-container,' +
                          ' .payment-stripe-dialog .iframe-container');
                let $stripeIframe = $('iframe#stripe-widget');
                $stripeIframe.remove();
                const sandBoxCSP = 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation';

                $stripeIframe = mCreateElement(
                    'iframe',
                    {
                        width: '100%',
                        height: '100%',
                        sandbox: sandBoxCSP,
                        frameBorder: '0',
                        allow: 'payment',
                    },
                    $iframeContainer[0]
                );
                let iframeSrc = utcResult.EUR;

                const payInfo = tryCatch(() => {
                    return new URL(utcResult.EUR);
                })();

                this.gatewayOrigin = payInfo.origin;

                // if a testing gateway is set.
                if (localStorage.megaPay) {
                    const testSrc = tryCatch(() => {
                        return new URL(localStorage.megaPay);
                    })();

                    if (testSrc && payInfo) {
                        this.gatewayOrigin = testSrc.origin;
                        const secret = payInfo.searchParams.get('s');
                        const env = payInfo.searchParams.get('e');
                        const editType = payInfo.searchParams.get('t');
                        const planprice = payInfo.searchParams.get('pp');
                        if (secret) {
                            testSrc.searchParams.append('s', secret);
                        }
                        if (env) {
                            testSrc.searchParams.append('e', env);
                        }
                        if (editType) {
                            testSrc.searchParams.append('t', editType);
                        }
                        if (editType) {
                            testSrc.searchParams.append('pp', planprice);
                        }
                        iframeSrc = testSrc.toString();
                    }
                }

                this.stripeSaleId = 'EDIT';

                if (pro.propay.onPropayPage()) {
                    iframeSrc += `&v=2`;
                }

                if (pro.propay.paymentButton) {
                    iframeSrc += `&pt=${pro.propay.paymentButton}`;
                }
                else if (pro.propay.currentGateway && pro.propay.currentGateway.gatewayName) {
                    iframeSrc += `&pt=${pro.propay.currentGateway.gatewayName}`;
                }

                if (!utcResult.edit) {

                    iframeSrc += `&p=${this.proNum}`;
                    if (this.extraDetails.recurring &&
                        (pro.propay.currentGateway && pro.propay.currentGateway.supportsRecurring)) {
                        iframeSrc += '&r=1';
                    }

                    // If new multi-discount promotion, add the discount number of months & turn the promo flag on
                    if (mega.discountInfo && mega.discountInfo.md) {
                        iframeSrc += `&m=${mega.discountInfo.m}`;
                        iframeSrc += `&promo=1`;
                    }
                    else {
                        // Otherwise use the selected number of months and turn the promo flag off
                        iframeSrc += `&m=${this.numOfMonths}`;
                    }

                    this.stripeSaleId = saleId;

                    const gate = this.businessPlan && this.businessPlan.usedGateName || pro.propay.proPaymentMethod;

                    if (gate) {
                        iframeSrc += `&g=${b64encode(gate)}`;
                    }
                }

                const locale = addressDialog.stripeLocal();
                if (locale) {
                    iframeSrc += '&l=' + locale;
                }

                if (is_mobile) {
                    iframeSrc += '&mobile=1';
                }

                if (pro.propay.shouldShowTrial()
                    && pro.propay.selectedProPackage
                    && pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_EXTRAS].trial) {
                    iframeSrc += `&trial=${pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_EXTRAS].trial.days}`;
                    iframeSrc += `&tprice=${pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_PRICE]}`;
                    iframeSrc += `&locales=${getCountryAndLocales().locales}`;
                }

                $stripeIframe.src = iframeSrc;
                $stripeIframe.id = 'stripe-widget';

                pro.propay.hideLoadingOverlay();
                loadingDialog.hide();

                // $('.content', $stripeDialog).toggleClass('hidden', pro.propay.useSavedCard);

                $stripeDialog.removeClass('hidden');

                onIdle(() => eventlog(500518));

                window.addEventListener('message', addressDialog.stripeFrameHandler, { once: true });
                pro.propay.listenRemover = setTimeout(() => {
                    window.removeEventListener('message', addressDialog.stripeFrameHandler, { once: true });
                }, 6e5); // 10 minutes

                // Keeping keys binding consistent with iframe events

                $('.fm-dialog-overlay').rebind('click.stripeDialog', () => {
                    this.discardCreditCardUpdate();
                    return false;
                });
            }
            else {
                this.showError(utcResult);
            }
        }
        else {
            if (utcResult.EUR.url) {
                return this.redirectToSite(utcResult);
            }
            // Hide the loading animation and show the error
            pro.propay.hideLoadingOverlay();
            this.showError(utcResult);
        }
    },

    /**
     * Triggers a confirmation dialog when a credit card iframe is being discarded (only with overlay for now)
     * @returns {void}
     */
    discardCreditCardUpdate: function() {
        'use strict';

        if (this.confirmationIsShowing === true) {
            return;
        }

        this.confirmationIsShowing = true;

        msgDialog(
            'confirmation',
            '',
            l.close_credit_card_dialog,
            l.close_credit_card_dialog_confirmation,
            (status) => {
                if (status) {
                    closeStripeDialog();
                }

                this.confirmationIsShowing = false;
            }
        );
    },

    /**
     * Something has gone wrong with the API and Ecomprocessing setup
     * @param {Object} utcResult The result from the UTC API call with error codes
     */
    showError: function(utcResult) {

        let callbackFn;

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
            callbackFn = addressDialog.closeDialog.bind(addressDialog);
        }

        // Show error dialog
        msgDialog('warninga', l[7235], message, '', callbackFn || addressDialog.showDialog.bind(addressDialog));
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
        this.initPurchaseButton();
    },

    /**
     * Display the dialog
     */
    showCreditCardDialog: function() {

        // Close the pro register dialog if it's already open
        $('.pro-register-dialog').removeClass('active').addClass('hidden');

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.mega-dialog.payment-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$successOverlay = $('.payment-result.success');
        this.$failureOverlay = $('.payment-result.failed');
        this.$loadingOverlay = $('.payment-processing');

        // Add the styling for the overlay
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Position the dialog and open it
        this.$dialog.addClass('active').removeClass('hidden');

        const selectedProPackage = pro.propay.getPlan(true);

        // Get the selected Pro plan details
        var proNum = selectedProPackage[1];
        var proPlan = pro.getProPlanName(proNum);
        var proPrice = selectedProPackage[5];
        var numOfMonths = selectedProPackage[4];
        var monthsWording = pro.propay.getNumOfMonthsWording(numOfMonths);

        const discountInfo = pro.propay.getDiscount();
        if (discountInfo && ((numOfMonths === 1 && discountInfo.emp) || (numOfMonths === 12 && discountInfo.eyp))) {
            proPrice = numOfMonths === 1 ? mega.intl.number.format(discountInfo.emp)
                : mega.intl.number.format(discountInfo.eyp);
        }

        // Update the Pro plan details
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4').addClass('pro' + proNum);
        this.$dialog.find('.payment-plan-title').text(proPlan);
        this.$dialog.find('.payment-plan-price').text(formatCurrency(proPrice));
        this.$dialog.find('.payment-plan-txt').text(monthsWording + ' ' + l[6965] + ' ');

        // Remove rogue colon in translation text
        var statePlaceholder = this.$dialog.find('.state-province').attr('placeholder').replace(':', '');
        this.$dialog.find('.state-province').attr('placeholder', statePlaceholder);

        // Reset form if they made a previous payment
        this.clearPreviouslyEnteredCardData();

        // Initialise the close button
        this.$dialog.find(closeButtonJS).rebind('click', () => {
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

        $('.first-name', this.$dialog).val('');
        $('.last-name', this.$dialog).val('');
        $('.credit-card-number', this.$dialog).val('');
        $('.cvv-code', this.$dialog).val('');
        $('.address1', this.$dialog).val('');
        $('.address2', this.$dialog).val('');
        $('.city', this.$dialog).val('');
        $('.state-province', this.$dialog).val('');
        $('.post-code', this.$dialog).val('');
        $('.expiry-date-month > span', this.$dialog).text(l[913]);
        $('.expiry-date-year > span', this.$dialog).text(l[932]);
        $('.countries > span', this.$dialog).text(l[481]);
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

        var $countriesSelect = $('.dropdown-input.countries', this.$dialog);
        var $selectScroll = $('.dropdown-scroll', $countriesSelect);

        // Build options
        $.each(M.getCountries(), function(isoCode, countryName) {

            var itemNode;

            // Create the option and set the ISO code and country name
            itemNode = mCreateElement('div', {
                'class': 'option',
                'data-value': isoCode,
            }, $selectScroll[0]);
            mCreateElement('span', undefined, itemNode).textContent = countryName;
        });

        // Bind custom dropdowns events
        bindDropdownEvents($countriesSelect);
    },

    /**
     * Creates the expiry month dropdown
     */
    initExpiryMonthDropDown: function() {

        var $expiryMonthSelect = $('.dropdown-input.expiry-date-month',  this.$dialog);
        var $selectScroll = $('.dropdown-scroll', $expiryMonthSelect);

        // Build options
        for (var month = 1; month <= 12; month++) {

            var itemNode;
            var twoDigitMonth;

            twoDigitMonth = (month < 10) ? '0' + month : month;

            // Create the option and set month values
            itemNode = mCreateElement('div', {
                'class': 'option',
                'data-value': twoDigitMonth,
            }, $selectScroll[0]);
            mCreateElement('span', undefined, itemNode).textContent = twoDigitMonth;
        }

        // Bind custom dropdowns events
        bindDropdownEvents($expiryMonthSelect);
    },

    /**
     * Creates the expiry year dropdown
     */
    initExpiryYearDropDown: function() {

        var currentYear = new Date().getFullYear();
        var endYear = currentYear + 20;                                     // http://stackoverflow.com/q/2500588
        var $expiryYearSelect = $('.dropdown-input.expiry-date-year', this.$dialog);
        var $selectScroll = $('.dropdown-scroll', $expiryYearSelect);

        // Build options
        for (var year = currentYear; year <= endYear; year++) {

            var itemNode;

            // Create the option and set year values
            itemNode = mCreateElement('div', {
                'class': 'option',
                'data-value': year,
            }, $selectScroll[0]);
            mCreateElement('span', undefined, itemNode).textContent = year;
        }

        // Bind custom dropdowns events
        bindDropdownEvents($expiryYearSelect);
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
            first_name: $('.first-name', this.$dialog).val(),
            last_name: $('.last-name', this.$dialog).val(),
            card_number: $('.credit-card-number', this.$dialog).val(),
            expiry_date_month: $('.expiry-date-month .option[data-state="active"]', this.$dialog).attr('data-value'),
            expiry_date_year: $('.expiry-date-year .option[data-state="active"]', this.$dialog).attr('data-value'),
            cv2: $('.cvv-code', this.$dialog).val(),
            address1: $('.address1', this.$dialog).val(),
            address2: $('.address2', this.$dialog).val(),
            city: $('.city', this.$dialog).val(),
            province: $('.state-province', this.$dialog).val(),
            postal_code: $('.post-code', this.$dialog).val(),
            country_code: $('.countries .option[data-state="active"]', this.$dialog).attr('data-value'),
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
                    pro.propay.sendPurchaseToApi(cardDialog.gatewayId);
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

        // Send some data to mega.io that we updated the Pro plan
        initMegaIoIframe(true, proNum);

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
        var invoiceDateTime = time2date(apiResponse.created, 7);
        invoiceDateTime = invoiceDateTime[0].toUpperCase() + invoiceDateTime.substring(1);
        var proPlanNum = pro.propay.selectedProPackage[1];
        var planName = pro.getProPlanName(proPlanNum);
        const planMonths = (pro.propay.selectedProPackage[4] === 1 ? l.bcoin_plan_month_one : l.bcoin_plan_month_mul)
            .replace('%1', pro.propay.selectedProPackage[4]);  // %1-month purchase
        var priceEuros = pro.propay.selectedProPackage[5];
        var priceBitcoins = apiResponse.amount;
        var expiryTime = new Date(apiResponse.expiry);

        const discountInfo = pro.propay.getDiscount();
        if (discountInfo && ((numOfMonths === 1 && discountInfo.emp) || (numOfMonths === 12 && discountInfo.eyp))) {
            priceEuros = numOfMonths === 1 ? mega.intl.number.format(discountInfo.emp)
                : mega.intl.number.format(discountInfo.eyp);
        }

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
        $bitcoinDialog.find('.bitcoin-address').text(bitcoinAddress);
        $bitcoinDialog.find('.invoice-date-time').text(invoiceDateTime);
        $bitcoinDialog.find('.plan-icon').addClass('pro' + proPlanNum);
        $bitcoinDialog.find('.plan-name').text(planName);
        $bitcoinDialog.find('.plan-duration').text(planMonths);
        $('.plan-price-euros .value', $bitcoinDialog).text(formatCurrency(priceEuros));
        $('.plan-price-bitcoins', $bitcoinDialog).text(mega.intl.bitcoin.format(priceBitcoins));

        // Set countdown to price expiry
        bitcoinDialog.setCoundownTimer($bitcoinDialog, expiryTime);

        // Close dialog and reset to original dialog
        $('button.js-close', $bitcoinDialog).rebind('click.bitcoin-dialog-close', function() {

            $dialogBackgroundOverlay.removeClass('bitcoin-invoice-dialog-overlay').addClass('hidden');
            $bitcoinDialog.addClass('hidden');

            // End countdown timer
            clearInterval(bitcoinDialog.countdownIntervalId);
        });

        // Make background overlay darker and show the dialog
        // $dialogBackgroundOverlay.addClass('bitcoin-invoice-dialog-overlay').removeClass('hidden');
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
            width: 80,
            height: 80,
            correctLevel: QRErrorCorrectLevel.H,    // High
            background: '#f2f2f2',
            foreground: '#151412',
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
                dialog.find('.time-to-expire').text(l['6814'] + ' ' + minutesPadded + ':' + secondsPadded);
            }
            else {
                dialog.find('.time-to-expire').text('00:00').css('opacity', '1');
                dialog.find('.price-expired-instruction').show();

                // End countdown timer
                clearInterval(bitcoinDialog.countdownIntervalId);
                pro.propay.updatePayment();
            }
        }, 1000);
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function(utcResult) {

        // Hide the loading animation
        // pro.propay.hideLoadingOverlay();

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
        $('button.js-close', $bitcoinFailureDialog).rebind('click', function() {
            $dialogBackgroundOverlay.removeClass('bitcoin-invoice-dialog-overlay').addClass('hidden');
            $bitcoinFailureDialog.addClass('hidden');
        });
    }
};
var insertEmailToPayResult = function($overlay) {
    "use strict";

    if (u_attr && u_attr.email) {
        $overlay.find('.payment-result-txt .user-email').text(u_attr.email);
    } else if (localStorage.awaitingConfirmationAccount) {
        var acc = JSON.parse(localStorage.awaitingConfirmationAccount);
        $overlay.find('.payment-result-txt .user-email').text(acc.email);
    }
};

