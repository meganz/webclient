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

function init_pro()
{
    if (localStorage.keycomplete) {
        $('body').addClass('key');
        sessionStorage.proref = 'accountcompletion';
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
    if (document.location.hash.indexOf('#pro/') > -1)
    {
        localStorage.affid = document.location.hash.replace('#pro/','');
        localStorage.affts = new Date().getTime();
    }

    if (document.location.hash.indexOf('#pro#') > -1) sessionStorage.proref = document.location.hash.replace('#pro#','');

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
            
            // Clear to prevent extra clicks showing multiple
            $stageTwoSelectedPlan.html($selectedPlan.clone());
            
            var proPlanName = $selectedPlan.find('.reg-st3-bott-title.title').html();
            $('.membership-step2 .pro span').html(proPlanName);
            
            // Update header text with plan
            var $selectedPlanHeader = $('.membership-step2 .main-italic-header.pro');
            var selectedPlanText = $selectedPlanHeader.html().replace('%1', proPlanName);
            $selectedPlanHeader.html(selectedPlanText);
            
            pro_next_step();
            return false;
        });
        
        // Show loading spinner because some stuff may not be rendered properly yet, or
        // it may quickly switch to the pro_payment_method page if they have preselected a plan
        loadingDialog.show();
        
        // Get the membership plans. This call will return an array of arrays. Each array contains this data:
        // [api_id, account_level, storage, transfer, months, price, currency, description, ios_id, google_id]
        // More data can be retrieved with 'f : 1'
        api_req({ a : 'utqa' }, {
            callback: function (result)
            {
                // Store globally
                membershipPlans = result;

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
            $(this).clone().appendTo( '.membership-selected-block');
            
            var proPlanName = $(this).find('.reg-st3-bott-title.title').html();
            $('.membership-step2 .pro span').html(proPlanName);
            
            // Update header text with plan
            var $selectedPlanHeader = $('.membership-step2 .main-italic-header.pro');
            var selectedPlanText = $selectedPlanHeader.html().replace('%1', proPlanName);
            $selectedPlanHeader.html(selectedPlanText);

            pro_next_step();
        });

        $('.membership-free-button').unbind('click');
        $('.membership-free-button').bind('click',function(e) {
            if (page == 'fm') document.location.hash = '#start';
            else document.location.hash = '#fm';
            return false;
        });

        $('.pro-bottom-button').unbind('click');
        $('.pro-bottom-button').bind('click',function(e)
        {
            document.location.hash = 'contact';
        });
    }
}


// Step2
function pro_next_step() {

    // Add history so the back button works to go back to choosing their plan
    history.pushState('', 'MEGA - Choose plan', '#propay');

    // Preload loading/transferring/processing animation
    proPage.preloadAnimation();

    if (!u_handle) {
        megaAnalytics.log("pro", "loginreq");
        showSignupPromptDialog();
        return;
    }
    else if(isEphemeral()) {
        showRegisterDialog();
        return;
    }

    megaAnalytics.log('pro', 'proc');

    var currentDate = new Date(),
        monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        mon = monthName[currentDate.getMonth()],
        day = currentDate.getDate(),
        price = [];

    // Add hyperlink to mobile payment providers at top of #pro page step 2
    var $otherPaymentProviders = $('.membership-step2 .other-payment-providers');
    var html = $otherPaymentProviders.html().replace('[A]', '<a href="#mobile">').replace('[/A]', '</a>');
    $otherPaymentProviders.html(html);

    // Load payment methods and plan durations
    proPage.loadPaymentGatewayOptions();
    proPage.renderPlanDurationDropDown();

    $('.membership-step1').addClass('hidden');
    $('.membership-step2').removeClass('hidden');
    mainScroll();
    
    $('.membership-date .month').text(mon);
    $('.membership-date .day').text(day);

    $('.membership-dropdown-item').each(function() {
        $(this).find('strong').html(price[$(this).attr('data-months')]);
    });

    $('.membership-st2-select span').rebind('click', function ()
    {
        if ($('.membership-st2-select').attr('class').indexOf('active') == -1) {
            $('.membership-st2-select').addClass('active');
        }
        else {
            $('.membership-st2-select').removeClass('active');
        }
    });

    $('.membership-dropdown-item').rebind('click', function ()
    {
        var price = $(this).find('strong').html();
        $('.membership-dropdown-item').removeClass('selected');
        $(this).addClass('selected');
        $('.membership-st2-select').removeClass('active');
        $('.membership-st2-select span').html($(this).html());

        if (price) {
            $('.membership-bott-price strong').html(price.split('.')[0] + '<span>.' + price.split('.')[1] + ' &euro;</span>');
        }
        
        proPage.updateTextDependingOnRecurring();
    });
    
    $('.membership-bott-button').rebind('click',function(e)
    {
        pro_continue(e);
        return false;
    });
}

function pro_continue(e)
{
    // Selected payment method and package
    var selectedPaymentMethod = $('.membership-radio input:checked').val();
    var selectedProPackageIndex = $('.membership-dropdown-item.selected').attr('data-plan-index');

    // Set the pro package (used in pro_pay function)
    selectedProPackage = membershipPlans[selectedProPackageIndex];

    // Get the months and price
    var selectedPlanMonths = selectedProPackage[4];

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
        if (pro_paymentmethod === 'credit-card') {
            cardDialog.init();
        }
        else if (pro_paymentmethod === 'prepaid-balance') {
            voucherDialog.init();
        }
        else if (pro_paymentmethod === 'wire-transfer') {
            wireTransferDialog.init();
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

    // Only show old loading dialog if needing to setup bitcoin invoice
    if (pro_paymentmethod === 'bitcoin') {
        showLoadingDialog();
    }
    
    // If using pre-paid credit show loading dialog
    else if (pro_paymentmethod === 'pro_prepaid') {
        loadingDialog.show();
    }
    
    // Otherwise if credit card payment, show bouncing coin while loading
    else if (pro_paymentmethod === 'credit-card') {
        cardDialog.closeDialogAndShowProcessing();
    }
    
    // Otherwise if Union Pay payment, show bouncing coin while loading
    else if (pro_paymentmethod === 'union-pay') {
        proPage.showLoadingOverlay('transferring');
    }
    
    // Data for API request
    var apiId = selectedProPackage[0];
    var price = selectedProPackage[5];
    var currency = selectedProPackage[6];
    
    // Convert from boolean to integer for API
    var fromBandwidthDialog = (localStorage.seenBandwidthDialog) ? 1 : 0;

    // uts = User Transaction Sale
    api_req({ a: 'uts', it: 0, si: apiId, p: price, c: currency, aff: aff, 'm': m, bq: fromBandwidthDialog }, {   
        callback: function (utsResult) {
            
            // Store the sale ID to check with API later
            saleId = utsResult;
            
            if (typeof saleId == 'number' && saleId < 0)
            {
                loadingDialog.hide();
                alert(l[200]);
            }
            else
            {
                if (pro_paymentmethod === 'pro_voucher' || pro_paymentmethod === 'pro_prepaid') {
                    pro_m = 0;
                }
                else if (pro_paymentmethod === 'bitcoin') {
                    pro_m = 4;
                }
                else if (pro_paymentmethod === 'credit-card') {
                    pro_m = 8;
                }
                else if (pro_paymentmethod === 'union-pay') {
                    pro_m = 5;
                }
                else if (pro_paymentmethod === 'fortumo') {
                    // pro_m = 6;
                    // Fortumo does not do a utc request, we immediately redirect
                    fortumo.redirectToSite(saleId);
                    return false;
                }
                
                // Update the last payment provider ID for the 'psts' action packet. If the provider e.g. bitcoin 
                // needs a redirect after confirmation action packet it will redirect to the account page.
                proPage.lastPaymentProviderId = pro_m;

                var proref = '';
                if (sessionStorage.proref) {
                    proref = sessionStorage.proref;
                }
                
                // utc = User Transaction Complete
                // s = sale ID
                // m = pro number
                // bq = bandwidth quota triggered
                api_req({ a : 'utc', s: [saleId], m: pro_m, r: proref, bq: fromBandwidthDialog },
                {
                    callback : function (utcResult)
                    {
                        // If using prepaid balance
                        if (pro_m === 0) {
                            
                            // Hide the loading dialog
                            loadingDialog.hide();
                            
                            // If an error code
                            if (typeof utcResult == 'number' && utcResult < 0) {
                                if (utcResult == EOVERQUOTA) {
                                    alert(l[514]);
                                }
                                else {
                                    alert(l[200]);
                                }
                            }
                            else {
                                // Show success dialog
                                voucherDialog.showSuccessfulPayment();
                            }
                        }
                        else {
                            // If Dynamic/Union Pay provider then redirect to their site
                            if ((pro_m === 5) && utcResult && utcResult.EUR) {
                                unionPay.redirectToSite(utcResult);
                            }
                            
                            // If Bitcoin provider then show the Bitcoin invoice dialog
                            else if ((pro_m === 4) && utcResult && utcResult.EUR) {
                                bitcoinDialog.showInvoice(utcResult.EUR);
                            }
                            
                            // If bitcoin failure
                            else if ((pro_m === 4) && (!utcResult || !utcResult.EUR)) {
                                bitcoinDialog.showBitcoinProviderFailureDialog();
                            }
                            
                            // Pay for credit card
                            else if ((pro_m === 8) && utcResult && (utcResult.EUR.res === 'S')) {
                                cardDialog.showSuccessfulPayment(utcResult);
                            }
                            
                            // Show credit card failure
                            else if ((pro_m === 8) && (!utcResult || (utcResult.EUR.res === 'FP') || (utcResult.EUR.res === 'FI'))) {
                                cardDialog.showFailureOverlay(utcResult);
                            }
                        }
                    }
                });
            }
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
    * Update the state when a payment has been received to show their new Pro Level
    * @param {Object} actionPacket The action packet {'a':'psts', 'p':<prolevel>, 'r':<s for success or f for failure>}
    */
    processPaymentReceived: function (actionPacket) {

        // Check success or failure
        var success = (actionPacket.r === 's') ? true : false;
        
        // Add a notification in the top bar
        addNotification(actionPacket);
        
        // If their payment was successful, redirect to account page to show new Pro Plan
        if (success) {

            // Make sure it fetches new account data on reload
            if (M.account) {
                M.account.lastupdate = 0;
            }

            // If last payment was Bitcoin, we need to redirect to the account page
            if (this.lastPaymentProviderId === 4) {
                window.location.hash = 'fm/account';
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
            var accountLevel = parseInt(membershipPlans[i][1]);
            var planStorageGigabytes = parseInt(membershipPlans[i][2]);
            var months = parseInt(membershipPlans[i][4]);            

            // If their current storage usage is more than the plan's grey it out
            if ((months === 1) && (currentStorageGigabytes > planStorageGigabytes)) {
                
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
            var newLinkText = $linkText.html().replace('[A]', '<a href="#contact">').replace('[/A]', '</a>');
            $linkText.html(newLinkText);
            
            // Redirect to #contact
            $noPlansSuitable.find('.btn-request-plan').rebind('click', function() {
                document.location.hash = 'contact';
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
                        
            // Add history so the back button goes back to #pro page
            history.pushState('', 'MEGA - Choose plan', '#pro');
            
            // Continue to step 2
            pro_next_step();
        }
    },
    
    /**
     * Gets a parameter from the URL e.g. https://mega.nz/#pro&planNum=4
     * @param {String} paramToGet Name of the parameter to get e.g. 'planNum'
     * @returns {String|undefined} Returns the string '4' if it exists, or undefined if not
     */
    getUrlParam: function(paramToGet) {
        
        var hash = location.hash.substr(1);
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
        
        // All payment gateways for the webclient with options
        var gatewayOptions = [            
        {
            apiGatewayId: 0,
            displayName: l[487],            // Voucher code
            supportsRecurring: false,
            supportsMonthlyPayment: true,
            supportsAnnualPayment: true,
            supportsExpensivePlans: true,
            cssClass: 'prepaid-balance'
        },
        {
            apiGatewayId: 8,
            displayName: l[6952],           // Credit card
            supportsRecurring: true,        // If subscriptions are possible
            supportsMonthlyPayment: true,   // If you can pay for 1 month at a time
            supportsAnnualPayment: true,    // Can pay for an annual amount
            supportsExpensivePlans: true,   // The provider can be used to buy plans other than LITE
            cssClass: 'credit-card'
        },
        {
            apiGatewayId: 4,
            displayName: l[6802],           // Bitcoin
            supportsRecurring: false,
            supportsMonthlyPayment: true,
            supportsAnnualPayment: true,
            supportsExpensivePlans: true,
            cssClass: 'bitcoin'
        },
        {
            apiGatewayId: 5,
            displayName: l[7109],           // UnionPay
            supportsRecurring: false,
            supportsMonthlyPayment: true,
            supportsAnnualPayment: true,
            supportsExpensivePlans: true,
            cssClass: 'union-pay'
        },
        {
            apiGatewayId: 6,
            displayName: l[7161],           // Mobile carrier billing
            supportsRecurring: false,
            supportsMonthlyPayment: true,
            supportsAnnualPayment: false,
            supportsExpensivePlans: false,  // Provider has a max of EUR 3.00 per payment
            cssClass: 'fortumo'
        },
        {
            apiGatewayId: null,
            displayName: l[6198],           // Wire transfer
            supportsRecurring: false,
            supportsMonthlyPayment: false,  // Accept 1 year, one-time payment only (wire transfer fees are expensive)
            supportsAnnualPayment: true,
            supportsExpensivePlans: true,
            cssClass: 'wire-transfer'
        }];
    
        // Do API request (User Forms of Payment Query) to get the valid list of currently active 
        // payment providers. Returns an array of active payment providers e.g. [0,2,3,4,5,8].
        api_req({ a: 'ufpq' }, {
            callback: function (validGatewayIds) {
                
                // If an API error (negative number) exit early
                if ((typeof validGatewayIds === 'number') && (validGatewayIds < 0)) {
                    return false;
                }
                
                // Get their currently selected plan
                var selectedPlan = $('.membership-step2 .reg-st3-membership-bl.selected').attr('data-payment');
                var selectedPlanPrice = $('.membership-dropdown-item.selected strong').html();
                var planPriceFloat = parseFloat(selectedPlanPrice);
                var balanceFloat = parseFloat(pro_balance);
                var html = '';

                // Loop through gateway providers (change to use list from API soon)
                for (var i = 0, length = gatewayOptions.length; i < length; i++) {

                    var gatewayOption = gatewayOptions[i];
                    var optionChecked = '';
                    var classChecked = '';

                    // Pre-select the first option in the list
                    if (!html) {
                        optionChecked = 'checked="checked" ';
                        classChecked = ' checked';
                    }
                    
                    // If it's not the wire transfer option and not in the list of enabled gateways skip it
                    if ((gatewayOption.apiGatewayId !== null) && (validGatewayIds.indexOf(gatewayOption.apiGatewayId) === -1)) {
                        continue;
                    }
                    
                    var disabledClass = '';
                    var disabledTitleText = '';
                    
                    // Add disabled class if this payment method is not supported for this plan
                    if ((gatewayOption.supportsExpensivePlans === false) && (selectedPlan != 4)) {
                        disabledClass = ' disabled';
                        disabledTitleText = ' title="' + l[7162] + '"';
                    }
                    
                    // If their prepay balance is less than 0 they can buy a voucher
                    if ((gatewayOption.apiGatewayId === 0) && (balanceFloat <= 0)) {
                        gatewayOption.displayName = l[487];     // Voucher code
                    }
                    
                    // Otherwise if they have account balance, then they can use that
                    else if ((gatewayOption.apiGatewayId === 0) && (balanceFloat >= planPriceFloat)) {
                        gatewayOption.displayName = l[7108] + ' (' + balanceFloat.toFixed(2) + ' &euro;)';  // Balance (x.xx)
                    }

                    // Create a radio button with icon for each payment gateway
                    html += '<div class="payment-method' + disabledClass + '"' + disabledTitleText + '>'
                         +      '<div class="membership-radio' + classChecked + '">'
                         +          '<input type="radio" name="' + gatewayOption.cssClass + '" id="' + gatewayOption.cssClass + '" ' + optionChecked + ' value="' + gatewayOption.cssClass + '" data-recurring="' + gatewayOption.supportsRecurring + '"  data-supports-monthly-payment="' + gatewayOption.supportsMonthlyPayment + '" data-supports-annual-payment="' + gatewayOption.supportsAnnualPayment + '" data-supports-expensive-plans="' + gatewayOption.supportsExpensivePlans + '" />'
                         +          '<div></div>'
                         +      '</div>'
                         +      '<div class="membership-radio-label ' + gatewayOption.cssClass + '">'
                         +          gatewayOption.displayName
                         +      '</div>'
                         +  '</div>';
                }

                // Change radio button states when clicked
                proPage.initPaymentMethodRadioOptions(html);                
            }
        });
    },
    
    /**
     * Renders the pro plan prices into the Plan Duration dropdown
     */
    renderPlanDurationDropDown: function() {

        // Sort plan durations by lowest number of months first
        membershipPlans.sort(function (planA, planB) {

            var numOfMonthsPlanA = planA[4];
            var numOfMonthsPlanB = planB[4];

            if (numOfMonthsPlanA < numOfMonthsPlanB) {
                return -1;
            }
            if (numOfMonthsPlanA > numOfMonthsPlanB) {
                return 1;
            }

            return 0;
        });

        var html = '';

        // Loop through the available plan durations for the current membership plan
        for (var i = 0, length = membershipPlans.length; i < length; i++) {

            var currentPlan = membershipPlans[i];

            // If match on the membership plan, display that pricing option in the dropdown
            if (currentPlan[1] == account_type_num) {

                // Get the price and number of months duration
                var price = currentPlan[5];
                var numOfMonths = currentPlan[4];
                var monthsWording = l[922];     // 1 month

                // Change wording depending on number of months
                if (numOfMonths === 12) {
                    monthsWording = l[923];     // 1 year
                }
                else if (numOfMonths > 1) {
                    monthsWording = l[6803].replace('%1', numOfMonths);     // x months
                }

                // Build select option
                html += '<div class="membership-dropdown-item" data-plan-index="' + i + '">'
                     +       monthsWording + ' (<strong>' + price + '</strong> &euro;)'
                     +  '</div>';
            }
        }

        // Update drop down HTML
        $('.membership-st2-dropdown').html(html);

        // Select first option
        var $durationSelect = $('.membership-st2-select');
        var $firstOption = $durationSelect.find('.membership-dropdown-item:first-child');
        $durationSelect.find('span').html($firstOption.html());
        $firstOption.addClass('selected');

        // Get current plan price
        var planIndex = $firstOption.attr('data-plan-index');

        proPage.updateMainPrice(planIndex);
        proPage.updateTextDependingOnRecurring();
    },
    
    /**
     * Updates the main price at the bottom of the page
     * @param {Number} planIndex The array index of the plan in membershipPlans
     */
    updateMainPrice: function(planIndex) {

        // Get the current plan price
        var currentPlan = membershipPlans[planIndex];
        var price = currentPlan[5].split('.');
        var dollars = price[0];
        var cents = price[1];

        // Update main price at the bottom
        var $mainPrice = $('.main-mid-pad .membership-bott-price');
        $mainPrice.find('strong').html(dollars + '<span>.' + cents + ' &euro;</span>');
    },
    
    /**
     * Updates the text on the page depending on the payment option they've selected and 
     * the duration/period so it is accurate for a recurring subscription or one off payment.
     */
    updateTextDependingOnRecurring: function() {

        // Update whether this selected option is recurring or one-time
        var $durationSelect = $('.membership-st2-select');
        var $durationOption = $durationSelect.find('.membership-dropdown-item.selected');
        var $mainPrice = $('.membership-bott-price');
        var recurring = ($('.payment-options-list input:checked').attr('data-recurring') === 'true') ? true : false;
        var planIndex = $durationOption.attr('data-plan-index');
        var currentPlan = membershipPlans[planIndex];
        var numOfMonths = currentPlan[4];
        var subscribeOrPurchase = (recurring) ? l[6172] : l[6190].toLowerCase();
        var durationOrRenewal = (recurring) ? l[6977] : l[6817];
        var getTwoMonthsFree = (recurring) ? l[6978] : l[1148];

        // Set to /month, /year or /one time next to the price
        if (recurring && (numOfMonths === 1)) {
            $mainPrice.find('.period').text('/' + l[913]);
        }
        else if (recurring && (numOfMonths > 1)) {
            $mainPrice.find('.period').text('/' + l[932]);
        }
        else {
            $mainPrice.find('.period').text('/' + l[6809]);
        }

        // Update depending on recurring or one off payment
        $('.membership-st2-head.choose-duration').html(durationOrRenewal);
        $('.membership-bott-button').html(subscribeOrPurchase);
        $('.membership-bott-descr').html(getTwoMonthsFree);
        $('.payment-dialog .payment-buy-now').html(subscribeOrPurchase);
    },
    
    /**
     * Updates the duration/renewal period options if they select a payment method. For example 
     * for the wire transfer option we only want to accept one year one-off payments
     */
    updatePeriodOptionsOnPaymentMethodChange: function() {

        var $durationSelect = $('.membership-st2-select');
        var $durationOptions = $durationSelect.find('.membership-dropdown-item');
        var supportsMonthlyPayment = ($('.payment-options-list input:checked').attr('data-supports-monthly-payment') === 'true') ? true : false;
        var supportsAnnualPayment = ($('.payment-options-list input:checked').attr('data-supports-annual-payment') === 'true') ? true : false;

        $durationOptions.removeClass('hidden');

        // Loop through renewal period options (1 month, 1 year)
        $.each($durationOptions, function(key, dropdownOption) {

            // Get the plan's number of months
            var planIndex = $(dropdownOption).attr('data-plan-index');
            var currentPlan = membershipPlans[planIndex];
            var numOfMonths = currentPlan[4];

            // If the currently selected payment option e.g. Wire transfer doesn't support a 1 month payment
            if (((supportsMonthlyPayment === false) && (numOfMonths === 1)) || ((supportsAnnualPayment === false) && (numOfMonths === 12))) {

                // Hide the option
                $(dropdownOption).addClass('hidden').removeClass('selected');

                // Select the first remaining option that is not hidden
                var $firstOption = $durationSelect.find('.membership-dropdown-item').not('.hidden').first();
                var newPlanIndex = $firstOption.attr('data-plan-index');
                $durationSelect.find('span').html($firstOption.html());
                $firstOption.addClass('selected');

                // Update the text for one-time or recurring
                proPage.updateMainPrice(newPlanIndex);
                proPage.updateTextDependingOnRecurring();
            }
            else {
                // Show the option otherwise
                $(dropdownOption).removeClass('hidden');
            }
        });
    },
    
    /**
     * Populate the monthly plans across the main #pro page
     */
    populateMembershipPlans: function() {

        var fromPriceSet = false;

        for (var i = 0, length = membershipPlans.length; i < length; i++) {

            // Get plan details
            var accountLevel = membershipPlans[i][1];
            var months = membershipPlans[i][4];
            var price = membershipPlans[i][5];
            var priceParts = price.split('.');
            var dollars = priceParts[0];
            var cents = priceParts[1];

            // Show only monthly prices in the boxes
            if (months === 1) {
                $('.reg-st3-membership-bl.pro' + accountLevel + ' .price .num').html(
                    dollars + '<span class="small">.' + cents + ' &euro;</span>'
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
     * Change payment method radio button states when clicked
     * @param {String} html The radio button html
     */
    initPaymentMethodRadioOptions: function(html) {

        var paymentOptionsList = $('.payment-options-list');
        paymentOptionsList.html(html);
        paymentOptionsList.find('.payment-method').rebind('click', function(event) {

            var $this = $(this);
            var $bitcoinInstructions = $('.membership-center p');

            // Don't let the user select this option if it's disabled e.g. disabled because 
            // they must select a cheaper plan to work with this payment provider e.g. Fortumo
            if ($this.hasClass('disabled')) {
                return false;
            }

            // Remove checked state from all radio inputs
            paymentOptionsList.find('.membership-radio').removeClass('checked');
            paymentOptionsList.find('input').prop('checked', false);

            // Add checked state for this radio button
            $this.find('input').prop('checked', true);        
            $this.find('.membership-radio').addClass('checked');

            // Hide instructions below the purchase button if other option is selected
            if ($this.find('.membership-radio-label').hasClass('bitcoin')) {
                $bitcoinInstructions.removeClass('hidden');
            }
            else {
                $bitcoinInstructions.addClass('hidden');
            }

            proPage.updateTextDependingOnRecurring();
            proPage.updatePeriodOptionsOnPaymentMethodChange();
        });
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
    }
};

/**
 * Code for the voucher dialog
 */
var voucherDialog = {
    
    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,
    
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
        this.$dialog.find('.voucher-account-balance .balance').text(balance);
        this.$dialog.find('#voucher-code-input input').val('');
        this.changeColourIfSufficientBalance();
        
        // Translate text
        var html = this.$dialog.find('.voucher-information-help').html();
            html = html.replace('[A]', '<a href="#resellers" class="voucher-reseller-link">');
            html = html.replace('[/A]', '</a>');
        this.$dialog.find('.voucher-information-help').html(html);
        
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
        }
        else {
            // Otherwise leave it as red
            this.$dialog.find('.voucher-account-balance').removeClass('sufficient-funds');
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
                        msgDialog('warninga', l[135], l[714], '', function() {
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
                    voucherDialog.$dialog.find('.voucher-account-balance .balance').text(balanceString);
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
            var selectedProPackageIndex = $('.membership-dropdown-item.selected').attr('data-plan-index');

            // Set the pro package (used in pro_pay function)
            selectedProPackage = membershipPlans[selectedProPackageIndex];

            // Get the plan price
            var selectedPlanPrice = selectedProPackage[5];
    
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
            window.location.hash = 'fm/account';
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
    init: function() {
        
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
        });
               
        // If logged in, pre-populate email address into wire transfer details
        if (typeof u_attr !== 'undefined') {
            wireTransferDialog.$dialog.find('.email-address').text(u_attr.email);
        }
        
        // Update plan price in the dialog
        var proPrice = selectedProPackage[5];
        this.$dialog.find('.amount').text(proPrice);
    }
};

/**
 * Code for Dynamic/Union Pay
 */
var unionPay = {
    
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
 * Code for Dynamic/Union Pay
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
 * Credit card payment dialog
 */
var cardDialog = {
    
    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,
    $failureOverlay: null,
    $loadingOverlay: null,
    
    // Flag to prevent accidental double payments
    paymentInProcess: false,
    
    // The RSA public key to encrypt data to be stored on the Secure Processing Unit (SPU)
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
        this.$dialog.find('.payment-plan-title').html(proPlan);
        this.$dialog.find('.payment-plan-price').html(proPrice + '&euro;');
        this.$dialog.find('.payment-plan-txt').html(monthsWording + ' ' + l[6965] + ' ');
        
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
        
        this.$dialog.find('.expiry-date-month')[0].selectedIndex = 0;
        this.$dialog.find('.expiry-date-month').parent().find('.account-select-txt').text(l[913]);
        
        this.$dialog.find('.expiry-date-year')[0].selectedIndex = 0;
        this.$dialog.find('.expiry-date-year').parent().find('.account-select-txt').text(l[932]);
        
        this.$dialog.find('.countries')[0].selectedIndex = 0;
        this.$dialog.find('.countries').parent().find('.account-select-txt').text(l[481]);
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
      
        var countryOptions = '<option value=""></option>';
        var $countriesDropDown = this.$dialog.find('.countries');
        
        // Build options
        $.each(isocountries, function(isoCode, countryName) {            
            countryOptions += '<option value="' + isoCode + '">' + countryName + '</option>';
        });
        
        // Render the countries and update the text when a country is selected
        $countriesDropDown.html(countryOptions);
		$countriesDropDown.rebind('change', function(event)
        {
            var $this = $(this);
            var countryName = $this.find(':selected').text();            
            $this.parent().find('.account-select-txt').text(countryName);
        });
    },
    
    /**
     * Creates the expiry month dropdown
     */
    initExpiryMonthDropDown: function() {
        
        var twoDigitMonth = '';
        var monthOptions = '<option value=""></option>';
        var $expiryMonthDropDown = this.$dialog.find('.expiry-date-month');
        
        // Build options
        for (var month = 1; month <= 12; month++) {            
            twoDigitMonth = (month < 10) ? '0' + month : month;
            monthOptions += '<option value="' + twoDigitMonth + '">' + twoDigitMonth + '</option>';
        }
        
        // Render the months and update the text when a country is selected
        $expiryMonthDropDown.html(monthOptions);
        $expiryMonthDropDown.rebind('change', function(event)
        {
            var $this = $(this);
            var monthNum = $this.find(':selected').text();            
            $this.parent().find('.account-select-txt').text(monthNum);
        });
    },
    
    /**
     * Creates the expiry year dropdown
     */
    initExpiryYearDropDown: function() {
        
        var yearOptions = '<option value=""></option>';
        var currentYear = new Date().getFullYear();
        var endYear = currentYear + 20;                                     // http://stackoverflow.com/q/2500588
        var $expiryYearDropDown = this.$dialog.find('.expiry-date-year');
        
        // Build options
        for (var year = currentYear; year <= endYear; year++) {
            yearOptions += '<option value="' + year + '">' + year + '</option>';
        }
        
        // Render the months and update the text when a country is selected
        $expiryYearDropDown.html(yearOptions);
        $expiryYearDropDown.rebind('change', function(event)
        {
            var $this = $(this);
            var yearText = $this.find(':selected').text();            
            $this.parent().find('.account-select-txt').text(yearText);
        });
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
        var billingData =	{
            first_name: this.$dialog.find('.first-name').val(),
            last_name: this.$dialog.find('.last-name').val(),
            card_number: this.$dialog.find('.credit-card-number').val(),
            expiry_date_month: this.$dialog.find('.expiry-date-month').val(),
            expiry_date_year: this.$dialog.find('.expiry-date-year').val(),
            cv2: this.$dialog.find('.cvv-code').val(),
            address1: this.$dialog.find('.address1').val(),
            address2: this.$dialog.find('.address2').val(),
            city: this.$dialog.find('.city').val(),
            province: this.$dialog.find('.state-province').val(),
            postal_code: this.$dialog.find('.post-code').val(),
            country_code: this.$dialog.find('.countries').val(),
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
     * Close the card dialog and show the loading overlay
     */
    closeDialogAndShowProcessing: function() {        
        
        cardDialog.$dialog.removeClass('active').addClass('hidden');
        proPage.showLoadingOverlay('processing');
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
            window.location.hash = 'fm/account';
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
    
    // Web socket for chain.com connection to monitor bitcoin payment
    chainWebSocketConn: null,
    
    // Timer for counting down the time till when the price expires
    countdownIntervalId: 0,
    
    /**
     * Step 3 in plan purchase with Bitcoin
     * @param {Object} apiResponse API result
     */
    showInvoice: function(apiResponse) {

        /* Testing data to watch the invoice expire in 5 secs
        apiResponse = {
            "invoice_id": 'sIk',
            "address": '12ouE2tWLuR3q5ZyQzQL6DR25iBLVjhwXd',
            "amount": 1.35715354,
            "created": Math.round(Date.now() / 1000),
            "expiry": Math.round(Date.now() / 1000) + 5
        };//*/

        // Set details
        var bitcoinAddress = apiResponse.address;
        var bitcoinUrl = 'bitcoin:' + apiResponse.address + '?amount=' + apiResponse.amount;
        var invoiceDateTime = new Date(apiResponse.created * 1000);
        var proPlanNum = selectedProPackage[1];
        var planName = getProPlan(proPlanNum);
        var planMonths = l[6806].replace('%1', selectedProPackage[4]);  // x month purchase
        var priceEuros = selectedProPackage[5] + '<span>&euro;</span>';
        var priceBitcoins = apiResponse.amount;
        var expiryTime = new Date(apiResponse.expiry);

        // Cache original HTML of dialog to reset after close
        var dialogOverlay = $('.fm-dialog-overlay');
        var dialog = $('.fm-dialog.pro-register-paypal-dialog');
        var dialogOriginalHtml = dialog.html();

        // Add styles for the dialog
        dialogOverlay.addClass('bitcoin-invoice-dialog');
        dialog.addClass('bitcoin-invoice-dialog');

        // Clone template and show Bitcoin invoice
        var bitcoinInvoiceHtml = $('.bitcoin-invoice').html();
        dialog.html(bitcoinInvoiceHtml);

        // Render QR code
        bitcoinDialog.generateBitcoinQrCode(dialog, bitcoinAddress, priceBitcoins);

        // Update details inside dialog
        dialog.find('.btn-open-wallet').attr('href', bitcoinUrl);
        dialog.find('.bitcoin-address').html(bitcoinAddress);
        dialog.find('.invoice-date-time').html(invoiceDateTime);
        dialog.find('.plan-icon').addClass('pro' + proPlanNum);
        dialog.find('.plan-name').html(planName);
        dialog.find('.plan-duration').html(planMonths);
        dialog.find('.plan-price-euros').html(priceEuros);
        dialog.find('.plan-price-bitcoins').html(priceBitcoins);

        // Set countdown to price expiry
        bitcoinDialog.setCoundownTimer(dialog, expiryTime);

        // Close dialog and reset to original dialog
        dialog.find('.btn-close-dialog').rebind('click', function() {
            
            dialogOverlay.removeClass('bitcoin-invoice-dialog').addClass('hidden');
            dialog.removeClass('bitcoin-invoice-dialog').addClass('hidden').html(dialogOriginalHtml);

            // Close Web Socket if open
            if (bitcoinDialog.chainWebSocketConn !== null) {
                bitcoinDialog.chainWebSocketConn.close();
            }

            // End countdown timer
            clearInterval(bitcoinDialog.countdownIntervalId);
        });

        // Update the dialog if a transaction is seen in the blockchain
        bitcoinDialog.checkTransactionInBlockchain(dialog, bitcoinAddress, planName);
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
        dialog.find('.bitcoin-qr-code').html('').qrcode(options);
    },
    
    /**
     * Open WebSocket to chain.com API to monitor block chain for transactions on that receive address.
     * This will receive a faster confirmation than the action packet which waits for an IPN from the provider.
     * @param {Object} dialog The jQuery object for the dialog
     * @param {String} bitcoinAddress The bitcoin address
     * @param {String} planName The Pro plan name
     */
    checkTransactionInBlockchain: function(dialog, bitcoinAddress, planName) {

        // Open socket
        bitcoinDialog.chainWebSocketConn = new WebSocket('wss://ws.chain.com/v2/notifications');

        // Listen for events on this bitcoin address
        bitcoinDialog.chainWebSocketConn.onopen = function (event) {
            var req = { type: 'address', address: bitcoinAddress, block_chain: 'bitcoin' };
            bitcoinDialog.chainWebSocketConn.send(JSON.stringify(req));
        };

        // After receiving a response from the chain.com server
        bitcoinDialog.chainWebSocketConn.onmessage = function (event) {

            // Get data from WebSocket response
            var notification = JSON.parse(event.data);
            var type = notification.payload.type;
            var address = notification.payload.address;

            // Check only 'address' packets as the system also sends heartbeat packets
            if ((type === 'address') && (address === bitcoinAddress)) {

                // Update price left to pay
                var currentPriceBitcoins = parseFloat(dialog.find('.plan-price-bitcoins').html());
                var currentPriceSatoshis = toSatoshi(currentPriceBitcoins);
                var satoshisReceived = notification.payload.received;
                var priceRemainingSatoshis = currentPriceSatoshis - satoshisReceived;
                var priceRemainingBitcoins = toBitcoinString(priceRemainingSatoshis);

                // If correct amount was received
                if (satoshisReceived === currentPriceSatoshis) {

                    // Show success
                    dialog.find('.left-side').css('visibility', 'hidden');
                    dialog.find('.payment-confirmation').show();
                    dialog.find('.payment-confirmation .reg-success-icon').addClass('success');
                    dialog.find('.payment-confirmation .description').html(planName + ' plan has been paid!');
                    dialog.find('.payment-confirmation .instruction').html('Please await account upgrade by MEGA...');
                    dialog.find('.expiry-instruction').html('Paid!');

                    // End countdown timer and close connection
                    clearInterval(bitcoinDialog.countdownIntervalId);
                    bitcoinDialog.chainWebSocketConn.close();

                    // Inform API that we have full payment and await action packet confirmation.
                    // a = action, vpay = verify payment, saleId = the id from the 'uts' call - this is 
                    // an array because one day we may support multiple sales e.g. buy Pro 1 and 2 at the 
                    // same time, add = the bitcoin address, t = payment gateway id for bitcoin provider (4)
                    api_req({ a: 'vpay', saleid: [saleId], add: bitcoinAddress, t: 4 });
                }

                // If partial payment was made
                else if (satoshisReceived < currentPriceSatoshis) {

                    // Update price to pay
                    dialog.find('.plan-price-bitcoins').html(priceRemainingBitcoins);
                    dialog.find('.btn-open-wallet').attr('href', 'bitcoin:' + bitcoinAddress + '?amount=' + priceRemainingBitcoins);

                    // Re-render QR code with updated price
                    bitcoinDialog.generateBitcoinQrCode(dialog, bitcoinAddress, priceRemainingBitcoins);
                }
            }
        };
    },
    
    /**
     * Sets a countdown timer on the bitcoin invoice dialog to count down from 15~ minutes
     * until the bitcoin price expires and they need to restart the process
     * @param {Object} dialog The bitcoin invoice dialog
     * @param {Date} expiryTime The date/time the invoice will expire
     * @returns {Number} Returns the interval id
     */
    setCoundownTimer: function(dialog, expiryTime)
    {
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
                dialog.find('.time-to-expire').html(minutesPadded + ':' + secondsPadded);
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
                dialog.find('.expiry-instruction').html('This purchase has expired.').css('opacity', '1');
                dialog.find('.time-to-expire').html('00:00').css('opacity', '1');
                dialog.find('.price-expired-instruction').show();

                // End countdown timer
                clearInterval(bitcoinDialog.countdownIntervalId);
            }
        }, 1000);
    },
    
    /**
     * Show a failure dialog if the provider can't be contacted
     */
    showBitcoinProviderFailureDialog: function() {

        // Add styles for the dialog
        var dialogOverlay = $('.fm-dialog-overlay');
        var dialog = $('.fm-dialog.pro-register-paypal-dialog');
        var dialogOriginalHtml = dialog.html();

        // Add styles for the dialog
        dialogOverlay.addClass('bitcoin-provider-failure-dialog');
        dialog.addClass('bitcoin-provider-failure-dialog');

        // End countdown timer
        clearInterval(bitcoinDialog.countdownIntervalId);

        // Clone template and show failure
        var bitcoinProviderFailureHtml = $('.bitcoin-provider-failure').html();
        dialog.html(bitcoinProviderFailureHtml);
        
        // Close dialog and reset to original dialog
        dialog.find('.btn-close-dialog').rebind('click', function() {
            dialogOverlay.removeClass('bitcoin-provider-failure-dialog').addClass('hidden');
            dialog.removeClass('bitcoin-provider-failure-dialog').addClass('hidden').html(dialogOriginalHtml);
        });
    }
};


function showLoginDialog() {
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
        .data('placeholder', l[195])
        .val(l[195]);

    $('.input-password', $dialog)
        .data('placeholder', l[909])
        .val(l[909]);

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
        document.location.hash = 'recovery';
    });

    $('.top-dialog-login-button', $dialog).unbind('click');
    $('.top-dialog-login-button', $dialog).bind('click',function(e) {
        doProLogin($dialog);
    });
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

            if (r == EBLOCKED)
            {
                alert(l[730]);
            }
            else if (r)
            {
                $('#login-password', $dialog).val('');
                $('#login-email', $dialog).val('');
                u_type = r;
                init_page();
                if(pro_package) {
                    var cls = pro_package
                        .replace("_month", "")
                        .replace("_year", "");

                    $('.reg-st3-membership-bl').removeClass('selected')
                    $('.reg-st3-membership-bl.' + cls).addClass('selected');
                }
            }
            else
            {
                $('#login-password', $dialog).val('');
                alert(l[201]);
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
    $.dialog = 'pro-register-dialog';

    var $dialog = $('.pro-register-dialog');
    $dialog
        .removeClass('hidden')
        .addClass('active');

    $('.fm-dialog-overlay').removeClass("hidden");

    var reposition = function() {
        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });
    };

    reposition();

    $('*', $dialog).removeClass('incorrect'); // <- how bad idea is that "*" there?


    // controls
    $('.fm-dialog-close', $dialog)
        .unbind('click.proDialog')
        .bind('click.proDialog', function() {
            closeDialog();
        });

    $('#register-email', $dialog)
        .data('placeholder', l[95])
        .val(l[95]);

    $('#register-firstname', $dialog)
        .data('placeholder', l[1096])
        .val(l[1096]);

    $('#register-lastname', $dialog)
        .data('placeholder', l[1097])
        .val(l[1097]);

    $('#register-password', $dialog)
        .addClass('input-password')
        .data('placeholder', l[909])
        .val(l[909]);

    $('#register-password2', $dialog)
        .addClass('input-password')
        .data('placeholder', l[1114])
        .val(l[1114]);

    uiPlaceholders($dialog);
    uiCheckboxes($dialog);

    var registerpwcheck = function()
    {
        $('.login-register-input.password', $dialog).removeClass('weak-password strong-password');
        $('.new-registration', $dialog).removeClass('good1 good2 good3 good4 good5');
        if (typeof zxcvbn == 'undefined' || $('#register-password', $dialog).attr('type') == 'text' || $('#register-password', $dialog).val() == '') return false;
        var pw = zxcvbn($('#register-password', $dialog).val());
        if (pw.score > 3 && pw.entropy > 75)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good5');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1128]);
            $('.new-reg-status-description', $dialog).text(l[1123]);
        }
        else if (pw.score > 2 && pw.entropy > 50)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good4');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1127]);
            $('.new-reg-status-description', $dialog).text(l[1122]);
        }
        else if (pw.score > 1 && pw.entropy > 40)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good3');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1126]);
            $('.new-reg-status-description', $dialog).text(l[1121]);
        }
        else if (pw.score > 0 && pw.entropy > 15)
        {
            $('.new-registration', $dialog).addClass('good2');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1125]);
            $('.new-reg-status-description', $dialog).text(l[1120]);
        }
        else
        {
            $('.login-register-input.password', $dialog).addClass('weak-password');
            $('.new-registration', $dialog).addClass('good1');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong> ' + l[1124]);
            $('.new-reg-status-description', $dialog).text(l[1119]);
        }
        $('.password-status-warning', $dialog).html('<span class="password-warning-txt">' + l[34] + '</span> ' + l[1129] + '<div class="password-tooltip-arrow"></div>');
        $('.password-status-warning', $dialog).css('margin-left',($('.password-status-warning', $dialog).width()/2*-1)-13);
        reposition();
    };

    if (typeof zxcvbn == 'undefined' && !silent_loading)
    {
        $('.login-register-input.password', $dialog).addClass('loading');
        silent_loading=function()
        {
            $('.login-register-input.password', $dialog).removeClass('loading');
            registerpwcheck();
        };
        jsl.push(jsl2['zxcvbn_js']);
        jsl_start();
    }
    $('#register-password', $dialog).unbind('keyup.proRegister');
    $('#register-password', $dialog).bind('keyup.proRegister',function(e)
    {
        registerpwcheck();
    });
    $('.password-status-icon', $dialog).unbind('mouseover.proRegister');
    $('.password-status-icon', $dialog).bind('mouseover.proRegister',function(e)
    {
        if ($(this).parents('.strong-password').length == 0)
        {
            $('.password-status-warning', $dialog).removeClass('hidden');
        }

    });
    $('.password-status-icon', $dialog).unbind('mouseout.proRegister');
    $('.password-status-icon', $dialog).bind('mouseout.proRegister',function(e)
    {
        if ($(this).parents('.strong-password').length == 0)
        {
            $('.password-status-warning', $dialog).addClass('hidden');
        }
    });

    $('input', $dialog).unbind('keydown.proRegister');
    $('input', $dialog).bind('keydown.proRegister',function(e)  {
        if (e.keyCode == 13) {
            doProRegister($dialog);
        }
    });


    $('.register-st2-button', $dialog).unbind('click');
    $('.register-st2-button', $dialog).bind('click',function(e) {
        doProRegister($dialog);
        return false;
    });

    $('.new-registration-checkbox a', $dialog)
        .unbind('click.proRegisterDialog')
        .bind('click.proRegisterDialog',function(e) {
            $.termsAgree = function()
            {
                $('.register-check').removeClass('checkboxOff');
                $('.register-check').addClass('checkboxOn');
            };
            termsDialog();
            return false;
        });
};

var doProRegister = function($dialog) {
    megaAnalytics.log("pro", "doRegister");
    loadingDialog.show();

    if (u_type > 0)
    {
        msgDialog('warninga',l[135],l[5843]);
        loadingDialog.show();
        return false;
    }


    var registeraccount = function()
    {
        var ctx =
        {
            callback : function(res)
            {
                loadingDialog.hide();
                if (res == 0)
                {
                    var ops = {a:'up'};

                    ops.terms = 'Mq';
                    ops.firstname = base64urlencode(to8($('#register-firstname', $dialog).val()));
                    ops.lastname = base64urlencode(to8($('#register-lastname', $dialog).val()));
                    ops.name2 = base64urlencode(to8($('#register-firstname', $dialog) + ' ' + $('#register-lastname', $dialog).val()));
                    u_attr.terms=1;

                    api_req(ops);
                    //proceedToPaypal();
                    $('.pro-register-dialog').addClass('hidden');
                    $('.fm-dialog.registration-page-success').removeClass('hidden');
                    $('.fm-dialog-overlay').removeClass('hidden');
                    $('body').addClass('overlayed');
                    $('.fm-dialog.registration-page-success').unbind('click');
                }
                else
                {
                    if (res == EACCESS) alert(l[218]);
                    else if (res == EEXIST)
                    {
                        if (m) alert(l[219]);
                        else
                        {
                            $('.login-register-input.email .top-loginp-tooltip-txt', $dialog).html(l[1297] + '<div class="white-txt">' + l[1298] + '</div>');
                            $('.login-register-input.email', $dialog).addClass('incorrect');
                            msgDialog('warninga','Error',l[219]);

                            loadingDialog.hide();
                        }
                    }
                }
            }
        };

        var rv={};

        rv.name = $('#register-firstname', $dialog).val() + ' ' + $('#register-lastname', $dialog).val();
        rv.email = $('#register-email', $dialog).val();
        rv.password = $('#register-password', $dialog).val();

        var sendsignuplink = function(name,email,password,ctx)
        {
            var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
            var req = { a : 'uc', c : base64urlencode(a32_to_str(encrypt_key(pw_aes,u_k))+a32_to_str(encrypt_key(pw_aes,[rand(0x100000000),0,0,rand(0x100000000)]))), n : base64urlencode(to8(name)), m : base64urlencode(email) };

            api_req(req,ctx);
        };

        sendsignuplink(rv.name,rv.email,rv.password,ctx);
    };



    var err=false;

    if ($('#register-firstname', $dialog).val() == '' || $('#register-firstname', $dialog).val() == l[1096] || $('#register-lastname', $dialog).val() == '' || $('#register-lastname', $dialog).val() == l[1097])
    {
        $('.login-register-input.name', $dialog).addClass('incorrect');
        err=1;
    }
    if ($('#register-email', $dialog).val() == '' || $('#register-email', $dialog).val() == l[1096] || checkMail($('#register-email', $dialog).val()))
    {
        $('.login-register-input.email', $dialog).addClass('incorrect');
        err=1;
    }

    if ($('#register-email', $dialog).val() == '' || $('#register-email', $dialog).val() == l[1096] || checkMail($('#register-email', $dialog).val()))
    {
        $('.login-register-input.email', $dialog).addClass('incorrect');
        err=1;
    }

    var pw = zxcvbn($('#register-password', $dialog).val());
    if ($('#register-password', $dialog).attr('type') == 'text')
    {
        $('.login-register-input.password.first', $dialog).addClass('incorrect');
        $('.white-txt.password', $dialog).text(l[213]);
        err=1;
    }
    else if (pw.score == 0 || pw.entropy < 16)
    {
        $('.login-register-input.password.first', $dialog).addClass('incorrect');
        $('.white-txt.password', $dialog).text(l[1104]);
        err=1;
    }

    if ($('#register-password', $dialog).val() !== $('#register-password2', $dialog).val())
    {
        $('#register-password', $dialog)[0].type = 'password';
        $('#register-password2', $dialog)[0].type = 'password';
        $('#register-password', $dialog).val('');
        $('#register-password2', $dialog).val('');
        $('.login-register-input.password.confirm', $dialog).addClass('incorrect');
        err=1;
    }

    if (!err && typeof zxcvbn == 'undefined')
    {
        msgDialog('warninga',l[135],l[1115] + '<br>' + l[1116]);
        loadingDialog.hide();
        return false;
    }
    else if (!err)
    {
        if ($('.register-check', $dialog).attr('class').indexOf('checkboxOff') > -1)
        {
            msgDialog('warninga',l[1117],l[1118]);
            loadingDialog.hide();
        }
        else
        {
            if (localStorage.signupcode)
            {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                var ctx =
                {
                    checkloginresult: function(u_ctx,r)
                    {
                        if (typeof r[0] == 'number' && r[0] < 0) msgDialog('warningb',l[135],l[200]);
                        else
                        {
                            loadingDialog.hide();
                            u_type = r;
                            document.location.hash = 'fm'; //TODO: fixme
                        }
                    }
                }
                var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#register-password', $dialog).val()));
                var uh = stringhash($('#register-email', $dialog).val().toLowerCase(),passwordaes);
                u_checklogin(ctx,true,prepare_key_pw($('#register-password', $dialog).val()),localStorage.signupcode,$('#register-firstname', $dialog).val() + ' ' + $('#register-lastname', $dialog).val(),uh);
                delete localStorage.signupcode;
            }
            else if (u_type === false)
            {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                u_checklogin(
                    {
                        checkloginresult: function(u_ctx,r)
                        {
                            u_type = r;
                            registeraccount();
                        }
                    },true);
            }
            else if (u_type == 0) registeraccount();
        }
    }
    if(err) {
        loadingDialog.hide();
    }
};

var paypalTimeout = null;
function showLoadingDialog(url) {

    clearTimeout(paypalTimeout);

    $('.pro-register-dialog')
        .removeClass('active')
        .addClass('hidden');

    $('.fm-dialog-overlay').removeClass('hidden');

    var $dialog = $('.fm-dialog.pro-register-paypal-dialog');

    var reposition = function() {
        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });
    };
    reposition();


    var fadeOutInLoop = function($elm) {
        $elm
            .animate({
                'opacity': 0.2
            }, 600)
            .animate({'opacity': 1}, 1000, function() {
                fadeOutInLoop($elm);
            });
    };

    fadeOutInLoop($('.pro-register-paypal-dialog .reg-success-icon'));

    $dialog
        .addClass('active')
        .removeClass('hidden');

    if(url) {
        megaAnalytics.log("pro", "proceedingToPaypal");

        paypalTimeout = setTimeout(function () {
            document.location = url;
        }, 3000);
    }

}
function redirectToPaypalHide() {
    $('.fm-dialog.pro-register-paypal-dialog')
        .removeClass('active')
        .addClass('hidden');

    $('.fm-dialog-overlay').addClass('hidden');
}

var proceedToPaypal = function() {

    if(pro_package) {
        var cls = pro_package
            .replace("_month", "")
            .replace("_year", "");

        $('.reg-st3-membership-bl').removeClass('selected')
        $('.reg-st3-membership-bl.' + cls).addClass('selected');

        u_type=1;
    }

    pro_continue();
};


var signupPromptDialog = null;
var showSignupPromptDialog = function() {
    if(!signupPromptDialog) {
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
                .html('<p>' + l[5842] + '</p>');

            $('.fm-dialog-button.pro-login', this.$dialog)
                .unbind('click.loginrequired')
                .bind('click.loginrequired', function() {
                    signupPromptDialog.hide();
                    showLoginDialog();
                    return false;
                });

            $('.fm-dialog-button.pro-register', this.$dialog)
                .unbind('click.loginrequired')
                .bind('click.loginrequired', function() {
                    signupPromptDialog.hide();
                    showRegisterDialog();
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
}
