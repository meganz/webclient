var pro_package,
    pro_balance = 0,
    pro_paymentmethod = '',
    pro_m,
    account_type_num,
    pro_usebalance = false,
    membershipPlans = [],
    selectedProPackage = [],
    saleId = null,
    pro_do_next = null;

var UTQA_RESPONSE_INDEX_ID = 0;
var UTQA_RESPONSE_INDEX_ACCOUNTLEVEL = 1;
var UTQA_RESPONSE_INDEX_STORAGE = 2;
var UTQA_RESPONSE_INDEX_TRANSFER = 3;
var UTQA_RESPONSE_INDEX_MONTHS = 4;
var UTQA_RESPONSE_INDEX_PRICE = 5;
var UTQA_RESPONSE_INDEX_CURRENCY = 6;
var UTQA_RESPONSE_INDEX_MONTHLYBASEPRICE = 7;


/**
 * Code for the AstroPay dialog on the second step of the Pro page
 */
var astroPayDialog = {

    $dialog: null,
    $backgroundOverlay: null,
    $pendingOverlay: null,

    // Constant for the AstroPay gateway ID
    gatewayId: 11,

    // The provider details
    selectedProvider: null,

    /**
     * Initialise
     * @param {Object} selectedProvider
     */
    init: function(selectedProvider) {

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.fm-dialog.astropay-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$pendingOverlay = $('.payment-result.pending.original');

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
    updateDialogDetails: function() {

        // Get the gateway name
        var gatewayName = this.selectedProvider.gatewayName;

        // Change icon and payment provider name
        this.$dialog.find('.provider-icon').removeClass().addClass('provider-icon ' + gatewayName);
        this.$dialog.find('.provider-name').text(this.selectedProvider.displayName);

        // Localise the tax label to their country e.g. GST, CPF
        var taxLabel = l[7989].replace('%1', this.selectedProvider.extra.taxIdLabel);
        var taxPlaceholder = l[7990].replace('%1', this.selectedProvider.extra.taxIdLabel);

        // If they have previously paid before with Astropay
        if ((alarm.planExpired.lastPayment) && (alarm.planExpired.lastPayment.gwd)) {

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
    showDialog: function() {

        this.$dialog.removeClass('hidden');
        this.showBackgroundOverlay();
    },

    /**
     * Hide the overlay and dialog
     */
    hideDialog: function() {

        this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        this.$dialog.addClass('hidden');
    },

    /**
     * Shows the background overlay
     */
    showBackgroundOverlay: function() {

        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
    },

    /**
     * Functionality for the close button
     */
    initCloseButton: function() {

        // Initialise the close and cancel buttons
        this.$dialog.find('.fm-dialog-close, .cancel').rebind('click', function() {

            // Hide the overlay and dialog
            astroPayDialog.hideDialog();
        });

        // Prevent close of dialog from clicking outside the dialog
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function(event) {
            event.stopPropagation();
        });
    },

    /**
     * Get the details entered by the user and redirect to AstroPay
     */
    initConfirmButton: function() {

        this.$dialog.find('.accept').rebind('click', function() {

            // Store the full name and tax number entered
            astroPayDialog.fullName = $.trim(astroPayDialog.$dialog.find('#astropay-name-field').val());
            astroPayDialog.taxNumber = $.trim(astroPayDialog.$dialog.find('#astropay-tax-field').val());

            // Make sure they entered something
            if ((astroPayDialog.fullName === '') || (astroPayDialog.fullName === '')) {

                // Show error dialog with Missing payment details
                msgDialog('warninga', l[6958], l[6959], '', function() {
                    astroPayDialog.showBackgroundOverlay();
                });

                return false;
            }

            // Try redirecting to payment provider
            astroPayDialog.hideDialog();
            pro_pay();
        });
    },

    /**
     * Redirect to the site
     * @param {String} utcResult containing the url to redirect to
     */
    redirectToSite: function(utcResult) {

        var url = utcResult.EUR['url'];
        window.location = url;
    },

    /**
     * Process the result from the API User Transaction Complete call
     * @param {Object} utcResult The results from the UTC call
     */
    processUtcResult: function(utcResult) {

        // If successful AstroPay result, redirect
        if (utcResult.EUR.url) {
            astroPayDialog.redirectToSite(utcResult);
        }
        else {
            // Hide the loading animation and show an error
            proPage.hideLoadingOverlay();
            astroPayDialog.showError(utcResult);
        }
    },

    /**
     * Something has gone wrong just talking to AstroPay
     * @param {Object} utcResult The result from the UTC API call with error codes
     */
    showError: function(utcResult) {

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
        msgDialog('warninga', l[7235], message, '', function() {
            astroPayDialog.showBackgroundOverlay();
            astroPayDialog.showDialog();
        });
    },

    /**
     * Shows a modal dialog that their payment is pending
     */
    showPendingPayment: function() {

        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$pendingOverlay = $('.payment-result.pending.original');

        // Show the success
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        this.$pendingOverlay.removeClass('hidden');

        // Add click handlers for 'Go to my account' and Close buttons
        this.$pendingOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            astroPayDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            astroPayDialog.$pendingOverlay.addClass('hidden');

            // Make sure it fetches new account data on reload
            if (M.account) {
                M.account.lastupdate = 0;
            }
            loadSubPage('fm/account/history');
        });
    }
};


function init_pro()
{
    if (localStorage.keycomplete) {
        $('body').addClass('key');
        localStorage.removeItem('keycomplete');
    }
    else {
        $('body').addClass('pro');
    }

    if (u_type == 3) {

        // Flag 'pro: 1' includes pro balance in the response
        // Flag 'strg: 1' includes current account storage in the response
        api_req({ a: 'uq', strg: 1, pro: 1 }, {
            callback : function (result) {

                // Store current account storage usage for checking later
                proPage.currentStorageBytes = result.cstrg;

                // Get account balance
                if (typeof result == 'object' && result.balance && result.balance[0]) {
                    pro_balance = result.balance[0][0];
                }
            }
        });
    }
    if (getSitePath().indexOf('pro/') > -1)
    {
        localStorage.affid = getSitePath().replace('pro/','');
        localStorage.affts = new Date().getTime();
    }

    if (lang !== 'en') $('.reg-st3-save-txt').addClass(lang);
    if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});

    if (!m)
    {
        $('.membership-step1 .membership-button').rebind('click', function() {

            var $planBlocks = $('.reg-st3-membership-bl');
            var $selectedPlan = $(this).closest('.reg-st3-membership-bl');
            var $stageTwoSelectedPlan = $('.membership-selected-block');

            $planBlocks.removeClass('selected');
            $selectedPlan.addClass('selected');

            account_type_num = $selectedPlan.attr('data-payment');

            if (account_type_num === '0') {
                if (page === 'fm') {
                    loadSubPage('start');
                } else {
                    loadSubPage('fm');
                }
                return false;
            }

            // Clear to prevent extra clicks showing multiple
            $stageTwoSelectedPlan.html($selectedPlan.clone());

            var proPlanName = $selectedPlan.find('.reg-st3-bott-title.title').html();
            $('.membership-step2 .pro span').html(proPlanName);

            // Update header text with plan
            var $selectedPlanHeader = $('.membership-step2 .main-italic-header.pro');
            var selectedPlanText = $selectedPlanHeader.html().replace('%1', proPlanName);
            $selectedPlanHeader.html(selectedPlanText);

            pro_next_step(proPlanName);
            return false;
        });

        // Show loading spinner because some stuff may not be rendered properly yet, or
        // it may quickly switch to the pro_payment_method page if they have preselected a plan
        loadingDialog.show();

        // Get the membership plans.
        api_req({ a : 'utqa', nf: 1 }, {
            callback: function (result)
            {
                // The rest of the webclient expects this data in an array format
                // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
                var results = [];
                for (var i = 0; i < result.length; i++)
                {
                    results.push([
                        result[i]["id"],
                        result[i]["al"], // account level
                        result[i]["s"], // storage
                        result[i]["t"], // transfer
                        result[i]["m"], // months
                        result[i]["p"], // price
                        result[i]["c"], // currency
                        result[i]["mbp"] // monthly base price
                    ]);
                }

                // Store globally
                membershipPlans = results;

                // Render the plan details
                proPage.populateMembershipPlans();

                // Check which plans are applicable or grey them out if not
                proPage.checkApplicablePlans();

                // Check if they have preselected the plan (e.g. from bandwidth dialog) and go straight to the next step
                proPage.checkForPreselectedPlan();

                if (pro_do_next) {
                    pro_do_next();
                }

                // Close loading spinner
                loadingDialog.hide();
            }
        });

        if (lang !== 'en') $('.reg-st3-save-txt').addClass(lang);
        if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});

        $('.membership-step1 .reg-st3-membership-bl').unbind('click');
        $('.membership-step1 .reg-st3-membership-bl').bind('click',function(e)
        {
            $('.reg-st3-membership-bl').removeClass('selected');
            $(this).addClass('selected');
        });

        $('.membership-step1 .reg-st3-membership-bl').unbind('dblclick');
        $('.membership-step1 .reg-st3-membership-bl').bind('dblclick',function(e)
        {
            $('.reg-st3-membership-bl').removeClass('selected');
            $(this).addClass('selected');

            account_type_num = $(this).attr('data-payment');

            if (account_type_num === '0') {
                if (page === 'fm') {
                    loadSubPage('start');
                } else {
                    loadSubPage('fm');
                }
                return false;
            }

            $(this).clone().appendTo( '.membership-selected-block');

            var proPlanName = $(this).find('.reg-st3-bott-title.title').html();
            $('.membership-step2 .pro span').html(proPlanName);

            // Update header text with plan
            var $selectedPlanHeader = $('.membership-step2 .main-italic-header.pro');
            var selectedPlanText = $selectedPlanHeader.html().replace('%1', proPlanName);
            $selectedPlanHeader.html(selectedPlanText);

            pro_next_step(proPlanName);
        });

        $('.pro-bottom-button').unbind('click');
        $('.pro-bottom-button').bind('click',function(e)
        {
            loadSubPage('contact');
        });
    }

    if (page.substr(0, 4) === 'pro_') {
        var plan = page.substr(4);
        window.selectedProPlan = plan === 'lite' ? 4 : plan;
    }

    if (typeof window.selectedProPlan !== "undefined") {
        $('.reg-st3-membership-bl[data-payment=' + window.selectedProPlan + ']')
            .find('.membership-button').trigger('click');
        delete window.selectedProPlan;
    }
}


// Step2
function pro_next_step(proPlanName) {

    // Preload loading/transferring/processing animation
    proPage.preloadAnimation();

    if (proPlanName === undefined) {
        // this came from skipConfirmationStep
        var plan = $('.reg-st3-membership-bl.selected').data('payment');
        proPlanName = (plan === 4 ? 'lite' : Array(++plan).join('i'));
    }
    else if (!u_handle) {
        megaAnalytics.log("pro", "loginreq");
        showSignupPromptDialog();
        return;
    }
    else if (isEphemeral()) {
        showRegisterDialog();
        return;
    }

    megaAnalytics.log('pro', 'proc');

    proPlanName = String(proPlanName).replace(/pro/i, '').trim().toLowerCase();
    if (proPlanName !== 'lite') {
        proPlanName = proPlanName.length;
    }
    if (getSitePath().split('_').pop() != proPlanName) {
        if (hashLogic) {
            window.skipHashChange = true;
            location.hash = 'pro_' + proPlanName;
        }
        else {
            history.pushState({ subpage: 'pro_' + proPlanName }, "", 'pro_' + proPlanName);
        }
    }

    var currentDate = new Date(),
        monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        mon = monthName[currentDate.getMonth()],
        day = currentDate.getDate(),
        price = [];

    // Add hyperlink to mobile payment providers at top of #pro page step 2
    var $otherPaymentProviders = $('.membership-step2 .other-payment-providers');
    var linkHtml = $otherPaymentProviders.html().replace('[A]', '<a href="/mobile" class="clickurl">');
    linkHtml = linkHtml.replace('[/A]', '</a>');
    linkHtml = linkHtml.replace('Android', '');
    $otherPaymentProviders.safeHTML(linkHtml);

    clickURLs();

    // Stylise the "PURCHASE" text in the 3rd instruction
    var $paymentInstructions = $('.membership-step2 .payment-instructions');
    var paymentTextHtml = $paymentInstructions.html();
    paymentTextHtml = paymentTextHtml.replace('[S]', '<span class="purchase">');
    paymentTextHtml = paymentTextHtml.replace('[/S]', '</span>');
    $paymentInstructions.safeHTML(paymentTextHtml);

    // Load payment methods and plan durations
    proPage.loadPaymentGatewayOptions();

    $('.membership-step1').addClass('hidden');
    $('.membership-step2').removeClass('hidden');
    mainScroll();

    $('.membership-date .month').text(mon);
    $('.membership-date .day').text(day);

    $('.membership-dropdown-item').each(function() {
        $(this).find('strong').html(price[$(this).attr('data-months')]);
    });

    $('.membership-st2-select span').rebind('click', function() {
        if ($('.membership-st2-select').hasClass('active') === false) {
            $('.membership-st2-select').addClass('active');
        }
        else {
            $('.membership-st2-select').removeClass('active');
        }
    });

    $('.membership-bott-button').rebind('click', function() {
        pro_continue();
        return false;
    });
}

function pro_continue()
{
    // Selected payment method and package
    var selectedPaymentMethod = $('.payment-options-list input:checked').val();
    var selectedProvider = proPage.allGateways.filter(function(val) {
        return (val.gatewayName === selectedPaymentMethod);
    })[0];
    var selectedProPackageIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');

    // Set the pro package (used in pro_pay function)
    selectedProPackage = membershipPlans[selectedProPackageIndex];

    // Get the months and price
    var selectedPlanMonths = selectedProPackage[UTQA_RESPONSE_INDEX_MONTHS];

    if (selectedPlanMonths < 12) {
        pro_package = 'pro' + account_type_num + '_month';
    }
    else {
        pro_package = 'pro' + account_type_num + '_year';
    }

    if (u_type === false)
    {
        u_storage = init_storage(localStorage);
        loadingDialog.show();

        u_checklogin({ checkloginresult: function(u_ctx,r)
        {
            pro_pay();

        }}, true);
    }
    else {
        pro_paymentmethod = selectedPaymentMethod;

        // For credit card we show the dialog first, then do the uts/utc calls
        if (pro_paymentmethod === 'perfunctio') {
            cardDialog.init();
        }
        else if (pro_paymentmethod.indexOf('ecp') === 0) {
            addressDialog.init();
        }
        else if (pro_paymentmethod === 'voucher') {
            voucherDialog.init();
        }
        else if (pro_paymentmethod === 'wiretransfer') {
            wireTransferDialog.init();
        }
        else if (selectedProvider.gatewayId === astroPayDialog.gatewayId) {
            astroPayDialog.init(selectedProvider);
        }
        else {
            // For other methods we do a uts and utc call to get the provider details first
            pro_pay();
        }
    }
}

function pro_pay() {

    var aff = 0;
    if (localStorage.affid && localStorage.affts > new Date().getTime() - 86400000) {
        aff = localStorage.affid;
    }

    // Show different loading animation text depending on the payment methods
    switch (pro_paymentmethod) {
        case 'bitcoin':
            proPage.showLoadingOverlay('loading');
            break;
        case 'pro_prepaid':
        case 'perfunctio':
            proPage.showLoadingOverlay('processing');
            break;
        default:
            proPage.showLoadingOverlay('transferring');
    }

    // Data for API request
    var apiId = selectedProPackage[UTQA_RESPONSE_INDEX_ID];
    var price = selectedProPackage[UTQA_RESPONSE_INDEX_PRICE];
    var currency = selectedProPackage[UTQA_RESPONSE_INDEX_CURRENCY];

    // Convert from boolean to integer for API
    var fromBandwidthDialog = ((Date.now() - parseInt(localStorage.seenOverQuotaDialog)) < 2 * 36e5) ? 1 : 0;

    // uts = User Transaction Sale
    var utsRequest = {
        a:  'uts',
        it:  0,
        si:  apiId,
        p:   price,
        c:   currency,
        aff: aff,
        m:   m,
        bq:  fromBandwidthDialog
    };
    if (mega.uaoref) {
        utsRequest.uao = escapeHTML(mega.uaoref);
    }

    // Setup the transaction
    api_req(utsRequest, {
        callback: function (utsResult) {

            // Store the sale ID to check with API later
            saleId = utsResult;

            // Extra gateway specific details for UTC call
            var extra = {};

            // Show an error
            if ((typeof saleId === 'number') && (saleId < 0)) {

                // Hide the loading overlay and show an error
                proPage.hideLoadingOverlay();
                msgDialog('warninga', l[7235], l[200] + ' ' + l[253]);   // Something went wrong. Try again later...
                return false;
            }

            if (pro_paymentmethod === 'voucher' || pro_paymentmethod === 'pro_prepaid') {
                pro_m = 0;
            }
            else if (pro_paymentmethod === 'bitcoin') {
                pro_m = 4;
            }
            else if (pro_paymentmethod === 'perfunctio') {
                pro_m = 8;
            }
            else if (pro_paymentmethod === 'dynamicpay') {
                pro_m = 5;
            }
            else if (pro_paymentmethod === 'fortumo') {
                // pro_m = 6;
                // Fortumo does not do a utc request, we immediately redirect
                fortumo.redirectToSite(saleId);
                return false;
            }
            else if (pro_paymentmethod === 'infobip') {
                // pro_m = 9;
                // Centili does not do a utc request, we immediately redirect
                centili.redirectToSite(saleId);
                return false;
            }
            else if (pro_paymentmethod === 'paysafecard') {
                pro_m = 10;
            }
            else if (pro_paymentmethod === 'tpay') {
                pro_m = tpay.gatewayId; // 14
            }
            else if (pro_paymentmethod.indexOf('directreseller') === 0) {
                pro_m = directReseller.gatewayId; // 15
            }

            // If AstroPay, send extra details
            else if (pro_paymentmethod.indexOf('astropay') > -1) {
                pro_m = astroPayDialog.gatewayId;
                extra.bank = astroPayDialog.selectedProvider.extra.code;
                extra.cpf = astroPayDialog.taxNumber;
                extra.name = astroPayDialog.fullName;
            }

            // If Ecomprocessing, send extra details
            else if (pro_paymentmethod.indexOf('ecp') === 0) {
                pro_m = addressDialog.gatewayId;
                extra = addressDialog.extraDetails;
            }
            else if (pro_paymentmethod.indexOf('sabadell') === 0) {
                pro_m = sabadell.gatewayId; // 17

                // Get the value for whether the user wants the plan to renew automatically
                var autoRenewCheckedValue = $('.membership-step2 .renewal-options-list input:checked').val();

                // If the provider supports recurring payments and the user wants the plan to renew automatically
                if (autoRenewCheckedValue === 'yes') {
                    extra.recurring = true;
                }
            }

            // Update the last payment provider ID for the 'psts' action packet. If the provider e.g. bitcoin
            // needs a redirect after confirmation action packet it will redirect to the account page.
            proPage.lastPaymentProviderId = pro_m;

            // Complete the transaction
            api_req({
                a: 'utc',                   // User Transaction Complete
                s: [saleId],                // Sale ID
                m: pro_m,                   // Gateway number
                bq: fromBandwidthDialog,    // Log for bandwidth quota triggered
                extra: extra                // Extra information for the specific gateway
            }, {
                callback: function(utcResult) {
                    proPage.processUtcResults(utcResult);
                }
            });
        }
    });
}

/**
 * Functions for the pro page in general
 * More code to be refactored into here over time
 */
var proPage = {

    // From bandwidth quota dialog
    fromBandwidthDialog: false,

    // The last payment provider ID used
    lastPaymentProviderId: null,

    // The user's current storage in bytes
    currentStorageBytes: 0,

    // Overlay for loading/processing/redirecting
    $backgroundOverlay: null,
    $loadingOverlay: null,

    /**
     * Processes a return URL from the payment provider in form of /payment-{providername}-{status} e.g.
     * /payment-ecp-success
     * /payment-ecp-failure
     * /payment-astropay-pending
     * /payment-paysafecard-saleidXXX
     * @param {String} page The requested page from index.js e.g. payment-ecp-success etc
     */
    processReturnUrlFromProvider: function(page) {

        // Get the provider we are returning from and the status
        var pageParts = page.split('-');
        var provider = pageParts[1];
        var status = pageParts[2];

        // If returning from an paysafecard payment, do a verification on the sale ID
        if (provider === 'paysafecard') {
            paysafecard.verify(status);
        }

        // If returning from an AstroPay payment, show a pending payment dialog
        else if (provider === 'astropay') {
            astroPayDialog.showPendingPayment();
        }

        // If returning from an Ecomprocessing payment, show a success or failure dialog
        else if (provider === 'ecp') {
            addressDialog.showPaymentResult(status);
        }

        // Sabadell needs to also show success or failure
        else if (provider === 'sabadell') {
            sabadell.showPaymentResult(status);
        }
    },

    /**
    * Update the state when a payment has been received to show their new Pro Level
    * @param {Object} actionPacket The action packet {'a':'psts', 'p':<prolevel>, 'r':<s for success or f for failure>}
    */
    processPaymentReceived: function (actionPacket) {

        // Check success or failure
        var success = (actionPacket.r === 's') ? true : false;

        // Add a notification in the top bar
        notify.notifyFromActionPacket(actionPacket);

        // If their payment was successful, redirect to account page to show new Pro Plan
        if (success) {

            // Make sure it fetches new account data on reload
            if (M.account) {
                M.account.lastupdate = 0;
            }

            // Don't show the plan expiry dialog anymore for this session
            alarm.planExpired.lastPayment = null;

            // If last payment was Bitcoin, we need to redirect to the account page
            if (this.lastPaymentProviderId === 4) {
                loadSubPage('fm/account/history');
            }
        }
    },

    /**
     * Check applicable plans for the user based on their current storage usage
     */
    checkApplicablePlans: function() {

        // If their account storage is not available (e.g. not logged in) all plan options will be shown
        if (this.currentStorageBytes === 0) {
            return false;
        }

        var totalNumOfPlans = 4;
        var numOfPlansNotApplicable = 0;
        var currentStorageGigabytes = this.currentStorageBytes / 1024 / 1024 / 1024;
        var $membershipStepOne = $('.membership-step1');

        // Loop through membership plans
        for (var i = 0, length = membershipPlans.length; i < length; i++) {

            // Get plan details
            var accountLevel = parseInt(membershipPlans[i][UTQA_RESPONSE_INDEX_ACCOUNTLEVEL]);
            var planStorageGigabytes = parseInt(membershipPlans[i][UTQA_RESPONSE_INDEX_STORAGE]);
            var months = parseInt(membershipPlans[i][UTQA_RESPONSE_INDEX_MONTHS]);

            // If their current storage usage is more than the plan's grey it out
            if ((months !== 12) && (currentStorageGigabytes > planStorageGigabytes)) {

                // Grey out the plan
                $membershipStepOne.find('.reg-st3-membership-bl.pro' + accountLevel).addClass('sub-optimal-plan');

                // Add count of plans that aren't applicable
                numOfPlansNotApplicable++;
            }
        }

        // Show message to contact support
        if (numOfPlansNotApplicable === totalNumOfPlans) {

            // Get current usage in TB and round to 3 decimal places
            var currentStorageTerabytes = currentStorageGigabytes / 1024;
                currentStorageTerabytes = Math.round(currentStorageTerabytes * 1000) / 1000;
                currentStorageTerabytes = l[5816].replace('[X]', currentStorageTerabytes);

            // Show current storage usage and message
            var $noPlansSuitable = $('.membership-step1 .no-plans-suitable');
            $noPlansSuitable.removeClass('hidden');
            $noPlansSuitable.find('.current-storage .terabytes').text(currentStorageTerabytes);

            // Capitalize first letter
            var currentStorageText = $noPlansSuitable.find('.current-storage .text').text();
                currentStorageText = currentStorageText.charAt(0).toUpperCase() + currentStorageText.slice(1);
            $noPlansSuitable.find('.current-storage .text').text(currentStorageText);

            // Replace text with proper link
            var $linkText = $noPlansSuitable.find('.no-plans-suitable-text');
            var newLinkText = $linkText.html()
                .replace('[A]', '<a href="/contact" class="clickurl">')
                .replace('[/A]', '</a>');
            $linkText.safeHTML(newLinkText);

            clickURLs();

            // Redirect to #contact
            $noPlansSuitable.find('.btn-request-plan').rebind('click', function() {
                loadSubPage('contact');
            });
        }
    },

    /**
     * Checks if a plan has already been selected e.g. they came from the bandwidth quota dialog
     * If they are from there, then preselect that plan and go to step two.
     */
    checkForPreselectedPlan: function() {

        var planNum = this.getUrlParam('planNum');

        // If the plan number is preselected
        if (planNum) {

            // Set the selected plan
            var $selectedPlan = $('.membership-step1 .reg-st3-membership-bl.pro' + planNum);
            var $stageTwoSelectedPlan = $('.membership-step2 .membership-selected-block');

            account_type_num = $selectedPlan.attr('data-payment');

            // Clear to prevent extra clicks showing multiple
            $stageTwoSelectedPlan.html($selectedPlan.clone());

            var proPlanName = $selectedPlan.find('.reg-st3-bott-title.title').html();
            $('.membership-step2 .pro span').html(proPlanName);

            // Update header text with plan
            var $selectedPlanHeader = $('.membership-step2 .main-italic-header.pro');
            var selectedPlanText = $selectedPlanHeader.html().replace('%1', proPlanName);
            $selectedPlanHeader.html(selectedPlanText);

            // Continue to step 2
            pro_next_step(proPlanName);
        }
    },

    /**
     * Gets a parameter from the URL e.g. https://mega.nz/#pro&planNum=4
     * @param {String} paramToGet Name of the parameter to get e.g. 'planNum'
     * @returns {String|undefined} Returns the string '4' if it exists, or undefined if not
     */
    getUrlParam: function(paramToGet) {

        var hash = getSitePath().substr(1) + locSearch;
        var index = hash.indexOf(paramToGet + '=');
        var param = hash.substr(index).split('&')[0].split('=')[1];

        return param;
    },

    /**
     * Preloads the large loading animation so it displays immediately when shown
     */
    preloadAnimation: function() {

        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$loadingOverlay = $('.payment-processing');

        // Check if using retina display and preload loading animation
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';
        this.$loadingOverlay.find('.payment-animation').attr('src', staticpath + '/images/mega/payment-animation' + retina + '.gif');
    },

    /**
     * Generic function to show the bouncing megacoin icon while loading
     * @param {String} messageType Which message to display e.g. 'processing', 'transferring', 'loading'
     */
    showLoadingOverlay: function(messageType) {

        // Show the loading gif
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        this.$loadingOverlay.removeClass('hidden');

        // Prevent clicking on the background overlay while it's loading, which makes
        // the background disappear and error triangle appear on white background
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function(event) {
            event.stopPropagation();
        });

        var message = '';

        // Choose which message to display underneath the animation
        if (messageType === 'processing') {
            message = l[6960];                  // Processing your payment...
        }
        else if (messageType === 'transferring') {
            message = l[7203];                  // Transferring to payment provider...
        }
        else if (messageType === 'loading') {
            message = l[7006];                  // Loading...
        }

        // Display message
        this.$loadingOverlay.find('.payment-animation-txt').html(message);
    },

    /**
     * Hides the payment processing/transferring/loading overlay
     */
    hideLoadingOverlay: function() {

        this.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        this.$loadingOverlay.addClass('hidden');
    },

    /**
     * Loads the payment gateway options into Payment options section
     */
    loadPaymentGatewayOptions: function() {

        // Do API request (User Forms of Payment Query Full) to get the valid list of currently active
        // payment providers. Returns an array of objects e.g.
        // {
        //   "gatewayid":11,"gatewayname":"astropayB","type":"subgateway","displayname":"Bradesco",
        //   "supportsRecurring":0,"supportsMonthlyPayment":1,"supportsAnnualPayment":1,
        //   "supportsExpensivePlans":1,"extra":{"code":"B","taxIdLabel":"CPF"}
        // }
        api_req({ a: 'ufpqfull', t: 0 }, {
            callback: function (gatewayOptions) {

                // If an API error (negative number) exit early
                if ((typeof gatewayOptions === 'number') && (gatewayOptions < 0)) {
                    $('.loading-placeholder-text').text('Error while loading, try reloading the page.');
                    return false;
                }

                // Make a clone of the array so it can be modified
                proPage.allGateways = JSON.parse(JSON.stringify(gatewayOptions));

                // Separate into two groups, the first group has 6 providers, the second has the rest
                var primaryGatewayOptions = gatewayOptions.splice(0, 6);
                var secondaryGatewayOptions = gatewayOptions;

                // Show payment duration (e.g. month or year) and renewal option radio options
                proPage.renderPlanDurationOptions();
                proPage.initPlanDurationClickHandler();
                proPage.initRenewalOptionClickHandler();

                // Render the two groups
                proPage.renderPaymentProviderOptions(primaryGatewayOptions, 'primary');
                proPage.renderPaymentProviderOptions(secondaryGatewayOptions, 'secondary');

                // Change radio button states when clicked
                proPage.initPaymentMethodRadioButtons();
                proPage.preselectPreviousPaymentOption();
                proPage.updateDurationOptionsOnProviderChange();
                proPage.initShowMoreOptionsButton();

                // Update the pricing and whether is a regular payment or subscription
                proPage.updateMainPrice();
                proPage.updateTextDependingOnRecurring();
            }
        });
    },

    /**
     * Initialise the button to show more payment options
     */
    initShowMoreOptionsButton: function() {

        // If there are more than 6 payment options, enable the button to show more
        if (proPage.allGateways.length > 6) {

            var $showMoreButton = $('.membership-step2 .provider-show-more');

            // Show the button
            $showMoreButton.removeClass('hidden');

            // On clicking 'Click here to show more payment options'
            $showMoreButton.click(function() {

                // Show the other payment options and then hide the button
                $('.payment-options-list.secondary').removeClass('hidden');
                $showMoreButton.hide();

                // Trigger resize or you can't scroll to the bottom of the page anymore
                $(window).trigger('resize');
            });
        }
    },

    /**
     * Render the payment providers as radio buttons
     * @param {Object} gatewayOptions The list of gateways from the API
     * @param {String} primaryOrSecondary Which list to render the gateways into i.e. 'primary' or 'secondary'
     */
    renderPaymentProviderOptions: function(gatewayOptions, primaryOrSecondary) {

        // Get their plan price from the currently selected duration radio button
        var selectedPlanIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');
        var selectedPlan = membershipPlans[selectedPlanIndex];
        var selectedPlanNum = selectedPlan[UTQA_RESPONSE_INDEX_ACCOUNTLEVEL];
        var selectedPlanPrice = selectedPlan[UTQA_RESPONSE_INDEX_PRICE];

        // Convert to float for numeric comparisons
        var planPriceFloat = parseFloat(selectedPlanPrice);
        var balanceFloat = parseFloat(pro_balance);
        var gatewayHtml = '';

        // Cache the template selector
        var $template = $('.payment-options-list.primary .payment-method.template');

        // Remove existing providers and so they are re-rendered
        $('.payment-options-list.' + primaryOrSecondary + ' .payment-method:not(.template)').remove();
        $('.loading-placeholder-text').hide();

        // Loop through gateway providers (change to use list from API soon)
        for (var i = 0, length = gatewayOptions.length; i < length; i++) {

            var $gateway = $template.clone();
            var gatewayOpt = gatewayOptions[i];
            var gatewayId = gatewayOpt.gatewayId;

            // Get the gateway name and display name
            var gatewayInfo = getGatewayName(gatewayId, gatewayOpt);
            var gatewayName = gatewayInfo.name;
            var displayName = gatewayInfo.displayName;

            // If it couldn't find the name (e.g. new provider, use the name from the API)
            if (gatewayInfo.name === 'unknown') {
                continue;
            }

            // Add disabled class if this payment method is not supported for this plan
            if ((gatewayOpt.supportsExpensivePlans === 0) && (selectedPlanNum !== 4)) {
                $gateway.addClass('disabled');
                $gateway.attr('title', l[7162]);
            }

            // If the voucher/balance option
            if ((gatewayId === 0) && (balanceFloat >= planPriceFloat)) {

                // Show "Balance (x.xx)" if they have enough to purchase this plan
                displayName = l[7108] + ' (' + balanceFloat.toFixed(2) + ' \u20ac)';
            }

            // Create a radio button with icon for each payment gateway
            $gateway.removeClass('template');
            $gateway.find('input').attr('name', gatewayName);
            $gateway.find('input').attr('id', gatewayName);
            $gateway.find('input').val(gatewayName);
            $gateway.find('.provider-icon').addClass(gatewayName);
            $gateway.find('.provider-name').text(displayName).prop('title', displayName);

            // Build the html
            gatewayHtml += $gateway.prop('outerHTML');
        }

        // Update the page
        $(gatewayHtml).appendTo($('.payment-options-list.' + primaryOrSecondary));
    },

    /**
     * Change payment method radio button states when clicked
     */
    initPaymentMethodRadioButtons: function() {

        // Cache selector
        var $paymentOptionsList = $('.payment-options-list');

        // Add click handler to all payment methods
        $paymentOptionsList.find('.payment-method').rebind('click', function() {

            var $this = $(this);

            // Don't let the user select this option if it's disabled e.g. it is disabled because
            // they must select a cheaper plan to work with this payment provider e.g. Fortumo
            if ($this.hasClass('disabled')) {
                return false;
            }

            // Remove checked state from all radio inputs
            $paymentOptionsList.find('.membership-radio').removeClass('checked');
            $paymentOptionsList.find('.provider-details').removeClass('checked');
            $paymentOptionsList.find('input').prop('checked', false);

            // Add checked state for this radio button
            $this.find('input').prop('checked', true);
            $this.find('.membership-radio').addClass('checked');
            $this.find('.provider-details').addClass('checked');

            proPage.updateTextDependingOnRecurring();
            proPage.updateDurationOptionsOnProviderChange();
        });
    },

    /**
     * Preselect an option they previously paid with if applicable
     */
    preselectPreviousPaymentOption: function() {

        // If they have paid before and their plan has expired, then re-select their last payment method
        if (alarm.planExpired.lastPayment) {

            // Get the last gateway they paid with
            var lastPayment = alarm.planExpired.lastPayment;
            var gatewayId = lastPayment.gw;

            // Get the gateway name, if it's a subgateway, then it will have it's own name
            var gatewayInfo = getGatewayName(gatewayId);
            var extraData = (typeof lastPayment.gwd !== 'undefined') ? lastPayment.gwd : null;
            var gatewayName = (typeof lastPayment.gwd !== 'undefined') ? extraData.gwname : gatewayInfo.name;

            // Find the gateway
            var $gatewayInput = $('#' + gatewayName);

            // If it is still in the list (e.g. valid provider still)
            if ($gatewayInput.length) {

                // Get the elements which need to be set
                var $membershipRadio = $gatewayInput.parent();
                var $providerDetails = $membershipRadio.next();
                var $secondaryPaymentOptions = $('.payment-options-list.secondary');
                var $showMoreButton = $('.membership-step2 .provider-show-more');

                // Set to checked
                $gatewayInput.prop('checked', true);
                $membershipRadio.addClass('checked');
                $providerDetails.addClass('checked');

                // If the gateway is in the secondary list, then show the secondary list and hide the button
                if ($secondaryPaymentOptions.find('#' + gatewayName).prop('checked')) {
                    $secondaryPaymentOptions.removeClass('hidden');
                    $showMoreButton.hide();
                }
            }
            else {
                // Otherwise select the first available payment option because this provider is no longer available
                proPage.preselectFirstPaymentOption();
            }
        }
        else {
            // Otherwise select the first available payment option
            proPage.preselectFirstPaymentOption();
        }
    },

    /**
     * Preselects the first payment option in the list of payment providers
     */
    preselectFirstPaymentOption: function() {

        // Find and select the first payment option
        var $paymentOption = $('.payment-options-list.primary .payment-method:not(.template)').first();
        $paymentOption.find('input').attr('checked', 'checked');
        $paymentOption.find('.membership-radio').addClass('checked');
        $paymentOption.find('.provider-details').addClass('checked');
    },

    /**
     * Updates the text on the page depending on the payment option they've selected and
     * the duration/period so it is accurate for a recurring subscription or one off payment.
     */
    updateTextDependingOnRecurring: function() {

        var $step2 = $('.membership-step2');
        var $paymentDialog = $('.payment-dialog');
        var $paymentAddressDialog = $('.payment-address-dialog');

        // Update whether this selected option is recurring or one-time
        var $selectDurationOption = $step2.find('.duration-options-list .membership-radio.checked');
        var selectedGatewayName = $step2.find('.payment-options-list input:checked').val();
        var selectedProvider = proPage.allGateways.filter(function(val) {
            return (val.gatewayName === selectedGatewayName);
        })[0];

        // Set text to subscribe or purchase
        var planIndex = $selectDurationOption.parent().attr('data-plan-index');
        var currentPlan = membershipPlans[planIndex];
        var numOfMonths = currentPlan[UTQA_RESPONSE_INDEX_MONTHS];
        var price = currentPlan[UTQA_RESPONSE_INDEX_PRICE] + ' \u20ac';     // 0.00 EUR symbol

        // Get the value for whether the user wants the plan to renew automatically
        var recurringEnabled = false;
        var autoRenewCheckedValue = $step2.find('.renewal-options-list input:checked').val();

        // If the provider supports recurring payments and the user wants the plan to renew automatically
        if (selectedProvider.supportsRecurring && (autoRenewCheckedValue === 'yes')) {
            recurringEnabled = true;
        }

        // Set text
        var subscribeOrPurchase = (recurringEnabled) ? l[6172] : l[6190].toLowerCase();
        var recurringOrNonRecurring = (recurringEnabled) ? '(' + l[6965] + ')' : l[6941];
        var recurringMonthlyOrAnnuallyMessage = (numOfMonths === 1) ? l[10628] : l[10629];
        var autoRenewMonthOrYearQuestion = (numOfMonths === 1) ? l[10638] : l[10639];
        var chargeInfoDuration = l[10642].replace('%1', price);

        // Find the pricing period in the pricing box and the plan duration options
        var $sidePanelPeriod = $step2.find('.reg-st3-bott-title.price .period');

        // Change the charge information below the recurring yes/no question
        if ((recurringEnabled) && (numOfMonths === 1)) {
            chargeInfoDuration = l[10640].replace('%1', price);     // You will be charged 0.00 monthly.
        }
        else if ((recurringEnabled) && (numOfMonths === 12)) {
            chargeInfoDuration = l[10641].replace('%1', price);     // You will be charged 0.00 annually.
        }

        // Set to monthly or annually in the pricing box on the right
        if (recurringEnabled) {
            if (numOfMonths === 1) {
                $sidePanelPeriod.text('/' + l[918]);  // monthly
            }
            else {
                $sidePanelPeriod.text('/' + l[919]);  // annually
            }
        }
        else {
            if (numOfMonths === 1) {
                $sidePanelPeriod.text('/' + l[913]);  // month
            }
            else {
                $sidePanelPeriod.text('/' + l[932]);  // year
            }
        }

        // Always show the extra Question 3 recurring option section if the provider supports recurring.
        // The user can then toggle whether they want a recurring plan or not with the radio buttons.
        if (selectedProvider.supportsRecurring) {
            $step2.find('.renewal-option').removeClass('hidden');
        }
        else {
            // Otherwise it's a one off only provider, hide the extra information
            $step2.find('.renewal-option').addClass('hidden');
        }

        // Show recurring info box next to Purchase button and update dialog text for recurring
        if (recurringEnabled) {
            $step2.find('.subscription-instructions').removeClass('hidden');
            $step2.find('.subscription-instructions').rebind('click', function() {
                bottomPageDialog(false, 'general', l[1712]);
            });
            $paymentAddressDialog.find('.payment-note-first.recurring').removeClass('hidden');
            $paymentAddressDialog.find('.payment-note-first.one-time').addClass('hidden');
        }
        else {
            // Hide recurring info box next to Purchase button and update dialog text for one-time
            $step2.find('.subscription-instructions').addClass('hidden');
            $paymentAddressDialog.find('.payment-note-first.recurring').addClass('hidden');
            $paymentAddressDialog.find('.payment-note-first.one-time').removeClass('hidden');
        }

        // Update depending on recurring or one off payment
        $step2.find('.membership-bott-button').text(subscribeOrPurchase);
        $step2.find('.payment-instructions .purchase').text(subscribeOrPurchase);
        $step2.find('.choose-renewal .duration-text').text(autoRenewMonthOrYearQuestion);
        $step2.find('.charge-information').text(chargeInfoDuration);
        $paymentDialog.find('.payment-buy-now').text(subscribeOrPurchase);
        $paymentAddressDialog.find('.payment-buy-now').text(subscribeOrPurchase);
        $paymentAddressDialog.find('.payment-note-first.recurring .duration').text(recurringMonthlyOrAnnuallyMessage);
        $paymentAddressDialog.find('.payment-plan-txt .recurring').text(recurringOrNonRecurring);

        // Re-initialise the main page scrolling as extra content could have changed the height
        mainScroll();
    },

    /**
     * Renders the pro plan prices into the Plan Duration dropdown
     */
    renderPlanDurationOptions: function() {

        // Sort plan durations by lowest number of months first
        this.sortMembershipPlans();

        // Clear the radio options, in case they revisted the page
        $('.duration-options-list .payment-duration:not(.template)').remove();

        // Loop through the available plan durations for the current membership plan
        for (var i = 0, length = membershipPlans.length; i < length; i++) {

            var currentPlan = membershipPlans[i];

            // If match on the membership plan, display that pricing option in the dropdown
            if (currentPlan[UTQA_RESPONSE_INDEX_ACCOUNTLEVEL] === parseInt(account_type_num)) {

                // Get the price and number of months duration
                var price = currentPlan[UTQA_RESPONSE_INDEX_PRICE];
                var numOfMonths = currentPlan[UTQA_RESPONSE_INDEX_MONTHS];
                var monthsWording = l[922];     // 1 month

                // Change wording depending on number of months
                if (numOfMonths === 12) {
                    monthsWording = l[923];     // 1 year
                }
                else if (numOfMonths > 1) {
                    monthsWording = l[6803].replace('%1', numOfMonths);     // x months
                }

                // Build select option
                var $durationOption = $('.payment-duration.template').clone();

                // Update months and price
                $durationOption.removeClass('template');
                $durationOption.attr('data-plan-index', i);
                $durationOption.attr('data-plan-months', numOfMonths);
                $durationOption.find('.duration').text(monthsWording);
                $durationOption.find('.price').text(price);

                // Show amount they will save
                if (numOfMonths === 12) {

                    // Calculate the discount price (the current yearly price is 10 months worth)
                    var priceOneMonth = (price / 10);
                    var priceTenMonths = (priceOneMonth * 10);
                    var priceTwelveMonths = (priceOneMonth * 12);
                    var discount = (priceTwelveMonths - priceTenMonths).toFixed(2);

                    $durationOption.find('.save-money').removeClass('hidden');
                    $durationOption.find('.save-money .amount').text(discount);
                }

                // Update the list of duration options
                $durationOption.appendTo('.duration-options-list');
            }
        }

        // If there is data about any previous plan they purchased
        if (alarm.planExpired.lastPayment) {

            // Get the number of months for the plan they last paid for
            var lastPaymentMonths = alarm.planExpired.lastPayment.m;

            // Find the radio option with the same number of months
            var $monthOption = $(".payment-duration[data-plan-months='" + lastPaymentMonths + "']");

            // If it can find it then select the radio option. Note: In some
            // cases this may not be available (e.g. with upcoming A/B testing
            if ($monthOption.length) {
                $monthOption.find('input').prop('checked', true);
                $monthOption.find('.membership-radio').addClass('checked');
                $monthOption.find('.membership-radio-label').addClass('checked');
                return true;
            }
        }

        // Otherwise pre-select the first option available
        var $firstOption = $('.duration-options-list .payment-duration:not(.template)').first();
        $firstOption.find('input').prop('checked', true);
        $firstOption.find('.membership-radio').addClass('checked');
        $firstOption.find('.membership-radio-label').addClass('checked');
    },

    /**
     * Sorts plan durations by lowest number of months first
     */
    sortMembershipPlans: function() {

        membershipPlans.sort(function (planA, planB) {

            var numOfMonthsPlanA = planA[UTQA_RESPONSE_INDEX_MONTHS];
            var numOfMonthsPlanB = planB[UTQA_RESPONSE_INDEX_MONTHS];

            if (numOfMonthsPlanA < numOfMonthsPlanB) {
                return -1;
            }
            if (numOfMonthsPlanA > numOfMonthsPlanB) {
                return 1;
            }

            return 0;
        });
    },

    /**
     * Add click handler for the radio buttons which are used for selecting the plan/subscription duration
     */
    initPlanDurationClickHandler: function() {

        var $durationOptions = $('.duration-options-list .payment-duration');

        // Add click handler
        $durationOptions.rebind('click', function() {

            var $this = $(this);
            var planIndex = $this.attr('data-plan-index');

            // Remove checked state on the other buttons
            $durationOptions.find('.membership-radio').removeClass('checked');
            $durationOptions.find('.membership-radio-label').removeClass('checked');
            $durationOptions.find('input').removeAttr('checked');

            // Add checked state to just to the clicked one
            $this.find('.membership-radio').addClass('checked');
            $this.find('.membership-radio-label').addClass('checked');
            $this.find('input').attr('checked', 'checked');

            // Update the main price and wording for one-time or recurring
            proPage.updateMainPrice(planIndex);
            proPage.updateTextDependingOnRecurring();
        });
    },

    /**
     * Add click handler for the radio buttons which are used for selecting the plan/subscription duration
     */
    initRenewalOptionClickHandler: function() {

        var $renewalOptions = $('.renewal-options-list .renewal-option');

        // Add click handler
        $renewalOptions.rebind('click', function() {

            var $this = $(this);

            // Remove checked state on the other buttons
            $renewalOptions.find('.membership-radio').removeClass('checked');
            $renewalOptions.find('.membership-radio-label').removeClass('checked');
            $renewalOptions.find('input').prop('checked', false);

            // Add checked state to just to the clicked one
            $this.find('.membership-radio').addClass('checked');
            $this.find('.membership-radio-label').addClass('checked');
            $this.find('input').prop('checked', true);

            // Update the wording for one-time or recurring
            proPage.updateTextDependingOnRecurring();
        });
    },

    /**
     * Updates the main price
     * @param {Number} planIndex The array index of the plan in membershipPlans
     */
    updateMainPrice: function(planIndex) {

        // If not passed in (e.g. inital load), get it from the currently selected option
        if (typeof planIndex === 'undefined') {
            planIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');
        }

        // Change the wording to month or year
        var currentPlan = membershipPlans[planIndex];
        var numOfMonths = currentPlan[UTQA_RESPONSE_INDEX_MONTHS];
        var monthOrYearWording = (numOfMonths !== 12) ? l[931] : l[932];

        // Get the current plan price
        var price = currentPlan[UTQA_RESPONSE_INDEX_PRICE].split('.');

        // If less than 12 months is selected, use the monthly base price instead
        if (numOfMonths !== 12) {
            price = currentPlan[UTQA_RESPONSE_INDEX_MONTHLYBASEPRICE].split('.');
        }
        var dollars = price[0];
        var cents = price[1];

        // Get the current plan's bandwidth, then convert the number to 'x GBs' or 'x TBs'
        var bandwidthGigabytes = currentPlan[UTQA_RESPONSE_INDEX_TRANSFER];
        var bandwidthBytes = bandwidthGigabytes * 1024 * 1024 * 1024;
        var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
        var bandwidthSizeRounded = Math.round(bandwidthFormatted.size);

        // Set selectors
        var $step2 = $('.membership-step2');
        var $pricingBox = $step2.find('.membership-pad-bl');
        var $priceNum = $pricingBox.find('.reg-st3-bott-title.price .num');
        var $pricePeriod = $pricingBox.find('.reg-st3-bott-title.price .period');
        var $bandwidthAmount = $pricingBox.find('.bandwidth-amount');
        var $bandwidthUnit = $pricingBox.find('.bandwidth-unit');

        // Update the charge information for question 3
        $step2.find('.charge-information .amount').text(dollars + '.' + cents);

        // Update the price of the plan and the /month or /year next to the price box
        $priceNum.safeHTML(dollars + '<span class="small">.' + cents + ' &euro;</span>');
        $pricePeriod.text('/' + monthOrYearWording);

        // Update bandwidth
        $bandwidthAmount.text(bandwidthSizeRounded);
        $bandwidthUnit.text(bandwidthFormatted.unit);
    },

    /**
     * Updates the duration/renewal period options if they select a payment method. For example
     * for the wire transfer option we only want to accept one year one-off payments
     */
    updateDurationOptionsOnProviderChange: function() {

        var $durationOptionsList = $('.duration-options-list');
        var $durationOptions = $durationOptionsList.find('.payment-duration:not(.template)');
        var selectedPlanIndex = $durationOptionsList.find('.membership-radio.checked').parent().attr('data-plan-index');
        var selectedGatewayName = $('.payment-options-list input:checked').val();
        var selectedProvider = proPage.allGateways.filter(function(val) {
            return (val.gatewayName === selectedGatewayName);
        })[0];

        // Reset all options, they will be hidden or checked again if necessary below
        $durationOptions.removeClass('hidden');
        $durationOptions.find('.membership-radio').removeClass('checked');
        $durationOptions.find('.membership-radio-label').removeClass('checked');
        $durationOptions.find('input').removeAttr('checked', 'checked');

        // Loop through renewal period options (1 month, 1 year)
        $.each($durationOptions, function(key, durationOption) {

            // Get the plan's number of months
            var planIndex = $(durationOption).attr('data-plan-index');
            var currentPlan = membershipPlans[planIndex];
            var numOfMonths = currentPlan[UTQA_RESPONSE_INDEX_MONTHS];

            // If the currently selected payment option e.g. Wire transfer
            // doesn't support a 1 month payment hide the option
            if (((!selectedProvider.supportsMonthlyPayment) && (numOfMonths === 1)) ||
                    ((!selectedProvider.supportsAnnualPayment) && (numOfMonths === 12))) {
                $(durationOption).addClass('hidden');
            }
            else {
                // Show the option otherwise
                $(durationOption).removeClass('hidden');
            }
        });

        // Select the first remaining option or previously selected (if its not hidden)
        var $newDurationOption;
        var newPlanIndex;
        $newDurationOption = $durationOptionsList.find('[data-plan-index=' + selectedPlanIndex + ']');
        if ($newDurationOption.length && !$newDurationOption.hasClass('hidden')) {
            newPlanIndex = selectedPlanIndex;
        }
        else {
            $newDurationOption = $durationOptionsList.find('.payment-duration:not(.template, .hidden)').first();
            newPlanIndex = $newDurationOption.attr('data-plan-index');
        }
        $newDurationOption.find('.membership-radio').addClass('checked');
        $newDurationOption.find('.membership-radio-label').addClass('checked');
        $newDurationOption.find('input').attr('checked', 'checked');

        // Update the text for one-time or recurring
        proPage.updateMainPrice(newPlanIndex);
        proPage.updateTextDependingOnRecurring();
    },

    /**
     * Populate the monthly plans across the main #pro page
     */
    populateMembershipPlans: function() {

        var fromPriceSet = false;

        for (var i = 0, length = membershipPlans.length; i < length; i++) {

            // Get plan details
            var accountLevel = membershipPlans[i][UTQA_RESPONSE_INDEX_ACCOUNTLEVEL];
            var months = membershipPlans[i][UTQA_RESPONSE_INDEX_MONTHS];
            var price = membershipPlans[i][UTQA_RESPONSE_INDEX_PRICE];
            var priceParts = price.split('.');
            var dollars = priceParts[0];
            var cents = priceParts[1];

            var monthlyBasePrice = membershipPlans[i][UTQA_RESPONSE_INDEX_MONTHLYBASEPRICE];
            var monthlyBasePriceParts = monthlyBasePrice.split('.');
            var monthlyBasePriceDollars = monthlyBasePriceParts[0];
            var monthlyBasePriceCents = monthlyBasePriceParts[1];

            // Show only monthly prices in the boxes
            if (months !== 12) {
                $('.reg-st3-membership-bl.pro' + accountLevel + ' .price .num').html(
                    monthlyBasePriceDollars + '<span class="small">.' + monthlyBasePriceCents + ' &euro;</span>'
                );
            }

            // Get the first plan with yearly price
            if ((months === 12) && (fromPriceSet === false)) {

                // Divide the yearly price by 12 to get the lowest from price
                var fromPrice = (price / 12).toFixed(2);
                var fromPriceParts = fromPrice.split('.');
                var fromPriceDollars = fromPriceParts[0];
                var fromPriceCents = fromPriceParts[1];

                // Update the price inside the red star
                var $redStar = $('.pro-icons-block.star .pro-price-txt');
                $redStar.find('.dollars').text(fromPriceDollars);
                $redStar.find('.cents').text(fromPriceCents);

                // Don't set it for other plans with 12 months
                fromPriceSet = true;
            }
        }
    },

    /**
     * Gets the wording for the plan subscription duration in months or years
     * @param {Number} numOfMonths The number of months
     * @returns {String} Returns the number of months e.g. '1 month', '1 year'
     */
    getNumOfMonthsWording: function(numOfMonths) {

        var monthsWording = l[922];     // 1 month

        // Change wording depending on number of months
        if (numOfMonths === 12) {
            monthsWording = l[923];     // 1 year
        }
        else if (numOfMonths > 1) {
            monthsWording = l[6803].replace('%1', numOfMonths);     // x months
        }

        return monthsWording;
    },

    /**
     * Process results from the API User Transaction Complete call
     * @param {Object|Number} utcResult The results from the UTC call or a negative number on failure
     */
    processUtcResults: function(utcResult) {

        // Check for insufficient balance error, other errors will fall through
        if ((typeof utcResult === 'number') && (utcResult === EOVERQUOTA) && (pro_m === voucherDialog.gatewayId)) {

            // Hide the loading animation and show an error
            proPage.hideLoadingOverlay();
            msgDialog('warninga', l[6804], l[514], '');             // Insufficient balance, try again...
            return false;
        }

        // If other negative number response from the API
        else if ((typeof utcResult === 'number') && (utcResult < 0)) {

            // Hide the loading animation and show an error
            proPage.hideLoadingOverlay();
            msgDialog('warninga', l[7235], l[200] + ' ' + l[253]);   // Something went wrong. Try later...
            return false;
        }

        // Handle results for different payment providers
        switch (pro_m) {

            // If using prepaid balance
            case voucherDialog.gatewayId:
                voucherDialog.showSuccessfulPayment();
                break;

            // If Bitcoin provider then show the Bitcoin invoice dialog
            case bitcoinDialog.gatewayId:
                bitcoinDialog.processUtcResult(utcResult);
                break;

            // If Dynamic/Union Pay provider then redirect to their site
            case unionPay.gatewayId:
                unionPay.redirectToSite(utcResult);
                break;

            // If credit card provider
            case cardDialog.gatewayId:
                cardDialog.processUtcResult(utcResult);
                break;

            // If paysafecard provider then redirect to their site
            case paysafecard.gatewayId:
                paysafecard.redirectToSite(utcResult);
                break;

            // If AstroPay result, redirect
            case astroPayDialog.gatewayId:
                astroPayDialog.processUtcResult(utcResult);
                break;

            // If Ecomprocessing result, redirect
            case addressDialog.gatewayId:
                addressDialog.processUtcResult(utcResult);
                break;

            // If tpay, redirect over there
            case tpay.gatewayId:
                tpay.redirectToSite(utcResult);
                break;

            // If 6media, redirect to the site
            case directReseller.gatewayId:
                directReseller.redirectToSite(utcResult);
                break;

            case sabadell.gatewayId:
                sabadell.redirectToSite(utcResult);
                break;
        }
    }
};


/**
 * Code for the voucher dialog on the second step of the Pro page
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
        this.showVoucherDialog();
        this.initCloseButton();
        this.setDialogDetails();
        this.initPurchaseButton();
        this.initRedeemVoucherButton();
        this.initRedeemVoucherNow();
    },

    /**
     * Display the dialog
     */
    showVoucherDialog: function() {

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.fm-dialog.voucher-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$successOverlay = $('.payment-result.success');

        // Add the styling for the overlay
        this.$dialog.removeClass('hidden');
        this.showBackgroundOverlay();
    },

    /**
     * Set voucher dialog details on load
     */
    setDialogDetails: function() {

        // Get the selected Pro plan details
        var proNum = selectedProPackage[1];
        var proPlan = getProPlan(proNum);
        var proPrice = selectedProPackage[5];
        var numOfMonths = selectedProPackage[4];
        var monthsWording = proPage.getNumOfMonthsWording(numOfMonths);
        var balance = parseFloat(pro_balance).toFixed(2);

        // Update template
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4').addClass('pro' + proNum);
        this.$dialog.find('.voucher-plan-title').text(proPlan);
        this.$dialog.find('.voucher-plan-txt .duration').text(monthsWording);
        this.$dialog.find('.voucher-plan-price .price').text(proPrice);
        this.$dialog.find('.voucher-account-balance .balance-amount').text(balance);
        this.$dialog.find('#voucher-code-input input').val('');
        this.changeColourIfSufficientBalance();

        // Translate text
        var html = this.$dialog.find('.voucher-information-help').html();
            html = html.replace('[A]', '<a href="/resellers" class="voucher-reseller-link clickurl">');
            html = html.replace('[/A]', '</a>');
        this.$dialog.find('.voucher-information-help').html(html);

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

        var price = selectedProPackage[5];

        // If they have enough balance to purchase the plan, make it green
        if (parseFloat(pro_balance) >= parseFloat(price)) {
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

        voucherDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        voucherDialog.$dialog.addClass('hidden');
    },

    /**
     * Functionality for the initial redeem voucher button which shows
     * a text box to enter the voucher code and another Redeem Voucher button
     */
    initRedeemVoucherButton: function() {

        // On redeem button click
        this.$dialog.find('.voucher-redeem').rebind('click', function() {

            // Show voucher input
            voucherDialog.$dialog.find('.voucher-redeem-container, .purchase-now-container').fadeOut('fast', function() {
                voucherDialog.$dialog.find('.voucher-input-container').fadeIn();
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
            if (voucherCode == '') {
                msgDialog('warninga', l[135], l[1015], '', function() {
                    voucherDialog.showBackgroundOverlay();
                });
            }
            else {
                // Clear text box
                voucherDialog.$dialog.find('#voucher-code-input input').val('');

                // Add the voucher
                loadingDialog.show();
                voucherDialog.addVoucher(voucherCode);
            }
        });
    },

    /**
     * Redeems the voucher code
     * @param {String} voucherCode The voucher code
     */
    addVoucher: function(voucherCode) {

        // Make API call to add voucher
        api_req({ a: 'uavr', v: voucherCode },
        {
            callback: function(result, ctx)
            {
                if (typeof result === 'number')
                {
                    // This voucher has already been redeemed
                    if (result == -11) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[714], '', function() {
                            voucherDialog.showBackgroundOverlay();
                        });
                    }

                    // Not a valid voucher code
                    else if (result < 0) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[473], '', function() {
                            voucherDialog.showBackgroundOverlay();
                        });
                    }
                    else {
                        // Get the latest account balance and update the price in the dialog
                        voucherDialog.getLatestBalance();
                    }
                }
            }
        });
    },

    /**
     * Gets the latest Pro balance from the API
     */
    getLatestBalance: function() {

        // Flag 'pro: 1' includes pro balance in the response
        api_req({ a: 'uq', pro: 1 }, {
            callback : function (result) {

                // Hide loading dialog
                loadingDialog.hide();

                // If successful result
                if (typeof result == 'object' && result.balance && result.balance[0]) {

                    // Update the balance
                    var balance = parseFloat(result.balance[0][0]);
                    var balanceString = balance.toFixed(2);

                    // Update for pro_pay
                    pro_balance = balance;

                    // Update dialog details
                    voucherDialog.$dialog.find('.voucher-account-balance .balance-amount').text(balanceString);
                    voucherDialog.changeColourIfSufficientBalance();

                    // Hide voucher input
                    voucherDialog.$dialog.find('.voucher-redeem-container').show();
                    voucherDialog.$dialog.find('.purchase-now-container').show();
                    voucherDialog.$dialog.find('.voucher-input-container').hide();
                }
            }
        });
    },

    /**
     * Purchase using account balance when the button is clicked inside the Voucher dialog
     */
    initPurchaseButton: function() {

        // On Purchase button click run the purchase process
        this.$dialog.find('.voucher-buy-now').rebind('click', function() {

            // Get which plan is selected
            var selectedProPackageIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');

            // Set the pro package (used in pro_pay function)
            selectedProPackage = membershipPlans[selectedProPackageIndex];

            // Get the plan price
            var selectedPlanPrice = selectedProPackage[UTQA_RESPONSE_INDEX_PRICE];

            // Warn them about insufficient funds
            if ((parseFloat(pro_balance) < parseFloat(selectedPlanPrice))) {

                // Show warning and re-apply the background because the msgDialog function removes it on close
                msgDialog('warninga', l[6804], l[6805], '', function() {
                    voucherDialog.showBackgroundOverlay();
                });
            }
            else {
                // Hide the overlay and dialog
                voucherDialog.hideDialog();

                // Proceed with payment via account balance
                pro_paymentmethod = 'pro_prepaid';
                pro_pay();
            }
        });
    },

    /**
     * Shows a successful payment modal dialog
     */
    showSuccessfulPayment: function() {

        // Get the selected Pro plan details
        var proNum = selectedProPackage[1];
        var proPlan = getProPlan(proNum);
        var successMessage = l[6962].replace('%1', '<span>' + proPlan + '</span>');

        // Hide the loading animation
        proPage.hideLoadingOverlay();

        // Show the success
        voucherDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        voucherDialog.$successOverlay.removeClass('hidden');
        voucherDialog.$successOverlay.find('.payment-result-txt').html(successMessage);

        // Add click handlers for 'Go to my account' and Close buttons
        voucherDialog.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            voucherDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            voucherDialog.$successOverlay.addClass('hidden');

            // Make sure it fetches new account data on reload
            // and redirect to account page to show purchase
            if (M.account) {
                M.account.lastupdate = 0;
            }
            loadSubPage('fm/account/history');
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

        // Update plan price in the dialog
        var proPrice = selectedProPackage[5];
        if (proPrice) {
            this.$dialog.find('.amount').text(proPrice).closest('tr').removeClass('hidden');
        }
        else {
            this.$dialog.find('.amount').closest('tr').addClass('hidden');
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
        var form = $("<form id='pay_form' name='pay_form' action='" + utcResult.EUR['url'] + "' method='post'></form>");

        for (var key in utcResult.EUR['postdata'])
        {
            var input = $("<input type='hidden' name='" + key + "' value='" + utcResult.EUR['postdata'][key] + "' />");
            form.append(input);
            $('body').append(form);
            form.submit();
        }
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
            var input = $("<input type='hidden' name='" + key + "' value='" + utcResult.EUR['postdata'][key] + "' />");
            form.append(input);
            $('body').append(form);
            form.submit();
        }
    },

    /**
     * Show the payment result of success or failure after coming back from the Sabadell site
     * @param {String} verifyUrlParam The URL parameter e.g. 'sabadell-success' or 'sabadell-failure'
     */
    showPaymentResult: function(verifyUrlParam) {

        var $backgroundOverlay = $('.fm-dialog-overlay');
        var $pendingOverlay = $('.payment-result.pending.alternate');
        var $failureOverlay = $('.payment-result.failed');

        // Show the overlay
        $backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // On successful payment
        if (verifyUrlParam === 'success') {

            // Show the success
            $pendingOverlay.removeClass('hidden');

            // Add click handlers for 'Go to my account' and Close buttons
            $pendingOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

                // Hide the overlay
                $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                $pendingOverlay.addClass('hidden');

                // Make sure it fetches new account data on reload
                if (M.account) {
                    M.account.lastupdate = 0;
                }
                loadSubPage('fm/account/history');
            });
        }
        else {
            // Show the failure overlay
            $failureOverlay.removeClass('hidden');

            // On click of the 'Try again' or Close buttons, hide the overlay
            $failureOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

                // Hide the overlay
                $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                $failureOverlay.addClass('hidden');
            });
        }
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

        window.location = 'https://megapay.nz/gwtp.html?provider=tpay&saleid=' + utcResult['EUR']['saleids'] + "&params=" + utcResult['EUR']['params'];
    }
};

/**
 * Code for directReseller payments such as Gary's 6media
 */
/* jshint -W003 */
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
            'https://mega.and1.tw/', // 6media
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
            proPage.hideLoadingOverlay();
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

        window.location = 'https://megapay.nz/?saleid=' + utsResult + '&provider=centili';
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
    init: function() {
        this.showDialog();
        this.initStateDropDown();
        this.initCountryDropDown();
        this.initCountryDropdownChangeHandler();
        this.initBuyNowButton();
        this.initCloseButton();
    },

    /**
     * Display the dialog
     */
    showDialog: function() {

        // Cache DOM reference for lookup in other functions
        this.$dialog = $('.fm-dialog.payment-address-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');

        // Get the selected package
        var selectedPlanIndex = $('.duration-options-list .membership-radio.checked').parent().attr('data-plan-index');
        var selectedPackage = membershipPlans[selectedPlanIndex];

        // Get the selected Pro plan details
        var proNum = selectedPackage[UTQA_RESPONSE_INDEX_ACCOUNTLEVEL];
        var proPlan = getProPlan(proNum);
        var proPrice = selectedPackage[UTQA_RESPONSE_INDEX_PRICE];
        var numOfMonths = selectedPackage[UTQA_RESPONSE_INDEX_MONTHS];
        var monthsWording = proPage.getNumOfMonthsWording(numOfMonths);

        // Update template
        this.$dialog.find('.plan-icon').removeClass('pro1 pro2 pro3 pro4').addClass('pro' + proNum);
        this.$dialog.find('.payment-plan-title').text(proPlan);
        this.$dialog.find('.payment-plan-txt .duration').text(monthsWording);
        this.$dialog.find('.payment-plan-price .price').text(proPrice);

        // Show the black background overlay and the dialog
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        this.$dialog.removeClass('hidden');
    },

    /**
     * Creates a list of state names with the ISO 3166-1-alpha-2 code as the option value
     */
    initStateDropDown: function() {

        var stateOptions = '';
        var $statesSelect = this.$dialog.find('.states');

        // Build options
        $.each(isoStates, function(isoCode, stateName) {

            // Create the option and set the ISO code and state name
            var $stateOption = $('<option>').val(isoCode).text(stateName);

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
    },

    /**
     * Creates a list of country names with the ISO 3166-1-alpha-2 code as the option value
     */
    initCountryDropDown: function() {

        var countryOptions = '';
        var $countriesSelect = this.$dialog.find('.countries');

        // Build options
        $.each(isoCountries, function(isoCode, countryName) {

            // Create the option and set the ISO code and country name
            var $countryOption = $('<option>').val(isoCode).text(countryName);

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

        // On dropdown option change
        $countriesSelect.selectmenu({
            change: function(event, ui) {

                // Get the selected country ISO code e.g. CA
                var selectedCountryCode = ui.item.value;

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

                    // Refresh the selectmenu to show/hide disabled options and enable the dropdown so it works
                    $statesSelect.selectmenu('refresh');
                    $statesSelect.selectmenu('enable');
                }
                else {
                    // Refresh the selectmenu to show the selected first option (State) then disable the dropdown
                    $statesSelect.selectmenu('refresh');
                    $statesSelect.selectmenu('disable');
                }

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
     * Initialise the X (close) button in the top right corner of the dialog
     */
    initCloseButton: function() {

        // Add the click handler to hide the dialog and the black overlay
        this.$dialog.find('.btn-close-dialog').rebind('click', function() {

            addressDialog.closeDialog();
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

        // Send to the API
        this.proceedToPay(fieldValues, state, country);
    },

    /**
     * Setup the payment details to send to the API
     * @param {Object} fieldValues The form field names and their values
     * @param {type} state The value of the state dropdown
     * @param {type} country The value of the country dropdown
     */
    proceedToPay: function(fieldValues, state, country) {

        // Set details for the UTC call
        this.extraDetails.first_name = fieldValues['first-name'];
        this.extraDetails.last_name = fieldValues['last-name'];
        this.extraDetails.address1 = fieldValues['address1'];
        this.extraDetails.address2 = fieldValues['address2'];
        this.extraDetails.city = fieldValues['city'];
        this.extraDetails.zip_code = fieldValues['postcode'];
        this.extraDetails.country = country;
        this.extraDetails.recurring = false;

        // If the country is US or Canada, add the state by stripping the country code off e.g. to get QC from CA-QC
        if ((country === 'US') || (country === 'CA')) {
            this.extraDetails.state = state.substr(3);
        }

        // Get the value for whether the user wants the plan to renew automatically
        var autoRenewCheckedValue = $('.membership-step2 .renewal-options-list input:checked').val();

        // If the provider supports recurring payments and the user wants the plan to renew automatically
        if (autoRenewCheckedValue === 'yes') {
            this.extraDetails.recurring = true;
        }

        // Hide the dialog so the loading one will show, then proceed to pay
        this.$dialog.addClass('hidden');
        pro_pay();
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
            proPage.hideLoadingOverlay();
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
     * @param {String} verifyUrlParam The URL parameter e.g. 'ecp-success' or 'ecp-failure'
     */
    showPaymentResult: function(verifyUrlParam) {

        var $backgroundOverlay = $('.fm-dialog-overlay');
        var $pendingOverlay = $('.payment-result.pending.alternate');
        var $failureOverlay = $('.payment-result.failed');

        // Show the overlay
        $backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // On successful payment
        if (verifyUrlParam === 'success') {

            // Show the success
            $pendingOverlay.removeClass('hidden');

            // Add click handlers for 'Go to my account' and Close buttons
            $pendingOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

                // Hide the overlay
                $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                $pendingOverlay.addClass('hidden');

                // Make sure it fetches new account data on reload
                if (M.account) {
                    M.account.lastupdate = 0;
                }
                loadSubPage('fm/account/history');
            });
        }
        else {
            // Show the failure overlay
            $failureOverlay.removeClass('hidden');

            // On click of the 'Try again' or Close buttons, hide the overlay
            $failureOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

                // Hide the overlay
                $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                $failureOverlay.addClass('hidden');
            });
        }
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
        var proNum = selectedProPackage[1];
        var proPlan = getProPlan(proNum);
        var proPrice = selectedProPackage[5];
        var numOfMonths = selectedProPackage[4];
        var monthsWording = proPage.getNumOfMonthsWording(numOfMonths);

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
        $.each(isoCountries, function(isoCode, countryName) {
            countryOptions += '<div class="default-dropdown-item " data-value="' + isoCode + '">' + countryName + '</div>';
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
            monthOptions += '<div class="default-dropdown-item " data-value="' + twoDigitMonth + '">' + twoDigitMonth + '</div>';
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

        this.$dialog.find('.fm-account-input input').bind('focus', function() {
            $(this).parent().addClass('focused');
        });

        this.$dialog.find('.fm-account-input input').bind('blur', function() {
            $(this).parent().removeClass('focused');
        });
    },

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
        if (!billingData.address1 || !billingData.city || !billingData.province || !billingData.country_code || !billingData.postal_code) {

            // Show error popup and on close re-add the overlay
            msgDialog('warninga', l[6956], l[6957], '', function() {
                cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            });
            return false;
        }

        // Check all the card details are completed
        else if (!billingData.first_name || !billingData.last_name || !billingData.card_number || !billingData.expiry_date_month || !billingData.expiry_date_year || !billingData.cv2) {

            msgDialog('warninga', l[6958], l[6959], '', function() {
                cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
            });
            return false;
        }

        return billingData;
    },

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
                    pro_pay();
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
        proPage.hideLoadingOverlay();

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
        var proNum = selectedProPackage[1];
        var proPlan = getProPlan(proNum);
        var successMessage = l[6962].replace('%1', '<span>' + proPlan + '</span>');

        // Show the success
        cardDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
        cardDialog.$successOverlay.removeClass('hidden');
        cardDialog.$successOverlay.find('.payment-result-txt').html(successMessage);

        // Add click handlers for 'Go to my account' and Close buttons
        cardDialog.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            cardDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            cardDialog.$successOverlay.addClass('hidden');

            // Remove credit card details from the form
            cardDialog.clearPreviouslyEnteredCardData();

            // Reset flag so they can try paying again
            cardDialog.paymentInProcess = false;

            // Make sure it fetches new account data on reload
            if (M.account) {
                M.account.lastupdate = 0;
            }
            loadSubPage('fm/account/history');
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
        var errorMessage = ((typeof utcResult !== 'undefined') && (utcResult.EUR.res === 'FP')) ? this.getProviderError(utcResult.EUR.code) : l[6950];
        cardDialog.$failureOverlay.find('.payment-result-txt').html(errorMessage);

        // On click of the 'Try again' or Close buttons, hide the overlay and the user can fix their payment details
        cardDialog.$failureOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Reset flag so they can try paying again
            cardDialog.paymentInProcess = false;

            // Hide failure and re-open the dialog
            cardDialog.$failureOverlay.addClass('hidden');

            // Re-open the card dialog
            cardDialog.$dialog.addClass('active').removeClass('hidden');
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
        var numCheck = 0,
            numDigit = 0,
            even = false,
            num,
            charDigit;

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
        var proPlanNum = selectedProPackage[1];
        var planName = getProPlan(proPlanNum);
        var planMonths = l[6806].replace('%1', selectedProPackage[4]);  // x month purchase
        var priceEuros = selectedProPackage[5];
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
        $bitcoinDialog.find('.plan-price-euros .value').text(priceEuros);
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
     * @returns {Number} Returns the interval id
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
        proPage.hideLoadingOverlay();

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


function showLoginDialog(email) {
    megaAnalytics.log("pro", "loginDialog");
    $.dialog = 'pro-login-dialog';

    var $dialog = $('.pro-login-dialog');
    $dialog
        .removeClass('hidden')
        .addClass('active');

    $('.fm-dialog-overlay').removeClass("hidden");

    $dialog.css({
        'margin-left': -1 * ($dialog.outerWidth()/2),
        'margin-top': -1 * ($dialog.outerHeight()/2)
    });

    $('.top-login-input-block').removeClass('incorrect');


    // controls
    $('.fm-dialog-close', $dialog)
        .unbind('click.proDialog')
        .bind('click.proDialog', function() {
            closeDialog();
        });

    $('.input-email', $dialog)
        .val(email || '');

    $('.input-password', $dialog)
        .val('');

    uiPlaceholders($dialog);
    uiCheckboxes($dialog);


    $('#login-password, #login-name', $dialog).unbind('keydown');
    $('#login-password, #login-name', $dialog).bind('keydown',function(e)
    {
        $('.top-login-pad', $dialog).removeClass('both-incorrect-inputs');
        $('.top-login-input-tooltip.both-incorrect', $dialog).removeClass('active');
        $('.top-login-input-block.password', $dialog).removeClass('incorrect');
        $('.top-login-input-block.e-mail', $dialog).removeClass('incorrect');
        if (e.keyCode == 13) doProLogin($dialog);
    });


    $('.top-login-forgot-pass', $dialog).unbind('click');
    $('.top-login-forgot-pass', $dialog).bind('click',function(e)
    {
        loadSubPage('recovery');
    });

    $('.top-dialog-login-button', $dialog).unbind('click');
    $('.top-dialog-login-button', $dialog).bind('click',function(e) {
        doProLogin($dialog);
    });

    clickURLs();
};

var doProLogin = function($dialog) {
    megaAnalytics.log("pro", "doLogin");

    loadingDialog.show();

    var button = $('.selected .membership-button').parents('.reg-st3-membership-bl').attr('class').match(/pro\d/)[0]
    pro_do_next = function() {
        $('.' + button + ' .membership-button').trigger('click');
        pro_do_next = null;
    };

    var ctx =
    {
        checkloginresult: function(ctx,r)
        {
            loadingDialog.hide();
            var e = $('#login-name', $dialog).val();
            if (e === '' || checkMail(e)) {
                $('.top-login-input-block.e-mail', $dialog).addClass('incorrect');
                $('#login-name', $dialog).val('');
                $('#login-name', $dialog).focus();
            }
            else if ($('#login-password', $dialog).val() === '') {
                $('.top-login-input-block.password', $dialog).addClass('incorrect');
            }
            else if (r === EBLOCKED)
            {
                alert(l[730]);
            }
            else if (r)
            {
                $('#login-password', $dialog).val('');
                $('#login-email', $dialog).val('');
                u_type = r;
                init_page();
                if (pro_package) {
                    var cls = pro_package
                        .replace("_month", "")
                        .replace("_year", "");

                    $('.reg-st3-membership-bl').removeClass('selected')
                    $('.reg-st3-membership-bl.' + cls).addClass('selected');
                }
            }
            else
            {
                $('.top-login-pad', $dialog).addClass('both-incorrect-inputs');
                $('.top-login-input-tooltip.both-incorrect', $dialog).addClass('active');
                $('#login-password', $dialog).select();
            }
        }
    };


    var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#login-password', $dialog).val()));
    var uh = stringhash($('#login-name', $dialog).val().toLowerCase(),passwordaes);
    u_login(
        ctx,
        $('#login-name', $dialog).val(),
        $('#login-password', $dialog).val(),
        uh,
        $('#login-checkbox').is('.checkboxOn')
    );
};

function showRegisterDialog() {
    megaAnalytics.log("pro", "regDialog");

    mega.ui.showRegisterDialog({
        title: l[5840],

        onCreatingAccount: function() {
            megaAnalytics.log("pro", "doRegister");
        },

        onLoginAttemptFailed: function(registerData) {
            msgDialog('warninga:' + l[171], l[1578], l[218], null, function(e) {
                if (e) {
                    $('.pro-register-dialog').addClass('hidden');
                    if (signupPromptDialog) {
                        signupPromptDialog.hide();
                    }
                    showLoginDialog(registerData.email);
                }
            });
        },

        onAccountCreated: function(gotLoggedIn, registerData) {
            // If true this means they do not need to confirm their email before continuing to step 2
            var skipConfirmationStep = true;

            if (skipConfirmationStep) {
                closeDialog();
                if (!gotLoggedIn) {
                    localStorage.awaitingConfirmationAccount = JSON.stringify(registerData);
                }
                pro_next_step();
            }
            else {
                $('.fm-dialog.registration-page-success').removeClass('hidden');
                fm_showoverlay();
            }
        }
    });
};

var signupPromptDialog = null;
var showSignupPromptDialog = function() {
    if (!signupPromptDialog) {
        signupPromptDialog = new mega.ui.Dialog({
            'className': 'loginrequired-dialog',
            'closable': true,
            'focusable': false,
            'expandable': false,
            'requiresOverlay': true,
            'title': l[5841],
            'buttons': []
        });
        signupPromptDialog.bind('onBeforeShow', function() {
            $('.fm-dialog-title',this.$dialog)
                .text(
                    this.options.title
                );

            // custom buttons, because of the styling
            $('.fm-notification-info',this.$dialog)
                .safeHTML('<p>@@</p>', l[5842]);

            $('.pro-login', this.$dialog)
                .rebind('click.loginrequired', function() {
                    signupPromptDialog.hide();
                    showLoginDialog();
                    return false;
                });

            $('.pro-register', this.$dialog)
                .rebind('click.loginrequired', function() {
                    signupPromptDialog.hide();

                    if (!u_wasloggedin()) {
                        showRegisterDialog();
                    }
                    else {
                        var msg = l[8743];
                        msgDialog('confirmation', l[1193], msg, null, function(res) {
                            if (res) {
                                showRegisterDialog();
                            }
                            else {
                                showLoginDialog();
                            }
                        });
                    }
                    return false;
                }).find('span').text(l[1076]);
        });
    }

    signupPromptDialog.show();

    var $selectedPlan = $('.reg-st3-membership-bl.selected');
    var plan = 1;

    if ($selectedPlan.is(".lite")) { plan = 1; }
    else if ($selectedPlan.is(".pro1")) { plan = 2; }
    else if ($selectedPlan.is(".pro2")) { plan = 3; }
    else if ($selectedPlan.is(".pro3")) { plan = 4; }

    $('.loginrequired-dialog .fm-notification-icon')
        .removeClass('plan1')
        .removeClass('plan2')
        .removeClass('plan3')
        .removeClass('plan4')
        .addClass('plan' + plan);
};
