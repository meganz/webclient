/**
 * Functionality for the Pro page Step 2 where the user has chosen their Pro plan and now they
 * will choose the payment provider, plan duration and whether they want recurring/non-recurring.
 */
pro.propay = {

    /** The selected Pro plan number e.g. 1 - 4 */
    planNum: null,

    /** The selected Pro plan name e.g. Pro I - III & Pro Lite */
    planName: null,

    /** All payment gateways loaded from the API */
    allGateways: [],

    /** The user's account balance */
    proBalance: 0,

    /** The selected Pro package details */
    selectedProPackage: null,

    /** The gateway name of the selected payment method */
    proPaymentMethod: null,

    /** Whether they selected the PRO plan immediately after completing the registration process */
    planChosenAfterRegistration: false,

    /** Darker background modal overlay */
    $backgroundOverlay: null,

    /** Overlays for loading/processing/redirecting */
    $loadingOverlay: null,

    /**
     * Initialises the page and functionality
     */
    init: function() {
        "use strict";
        // if business sub-user is trying to get to Pro page redirect to home.
        if (u_attr && u_attr.b && (!u_attr.b.m || (u_attr.b.m && u_attr.b.s !== -1))) {
            loadSubPage('start');
            return;
        }
        if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
            loadSubPage('repay');
            return;
        }

        var $stepTwo = $('.payment-section', '.fmholder');
        var $selectedPlanName = $('.top-header.plan-title .plan-name', $stepTwo);
        var $purchaseButton = $('.big-green-button.purchase', $stepTwo);

        // Preload loading/transferring/processing animation
        pro.propay.preloadAnimation();

        // If somehow the user reached the Pro Pay page (step 2) and they're not logged in, go back to the Pro Plan
        // selection page (step 1). Also, ephemeral accounts (not registered at all but have a few files in the cloud
        // drive) are *not* allowed to reach the Pro Pay page as we can't track their payment (no email address).
        // Accounts that have registered but have not confirmed their email address yet *are* allowed to reach the Pro
        // Pay page e.g. if they registered on the Pro Plan selection page page first (this gets more conversions).
        if (u_type === false || (u_type === 0 && typeof localStorage.awaitingConfirmationAccount === 'undefined')) {
            loadSubPage('pro');
            return;
        }

        if (typeof page !== 'undefined' && page !== 'chat') {
            megaAnalytics.log('pro', 'proc');
        }

        // If the plan number is not set in the URL e.g. propay_4, go back to Pro page step 1 so they can choose a plan
        if (!pro.propay.setProPlanFromUrl()) {
            loadSubPage('pro');
            return;
        }

        // Update header text with plan
        $selectedPlanName.text(pro.propay.planName);

        // Initialise the main purchase button
        $purchaseButton.rebind('click.purchase', function() {

            pro.propay.startPurchaseProcess();
            return false;
        });

        clickURLs();

        // Show loading spinner because some stuff may not be rendered properly yet
        loadingDialog.show();

        // Initialise some extra stuff just for mobile
        if (is_mobile) {
            mobile.propay.init();
        }

        // Load payment plans
        pro.loadMembershipPlans(function() {

            // Get the user's account balance
            voucherDialog.getLatestBalance(function() {

                // Load payment providers and do the rest of the rendering
                pro.propay.loadPaymentGatewayOptions();
            });
        });
    },

    /**
     * Gets the Pro plan number e.g. 1-4 from the URL e.g. propay_4
     * @returns {Boolean} Returns true if set correctly, otherwise returns false
     */
    setProPlanFromUrl: function() {

        // The URL should be in format /propay_x (1-4)
        var pageParts = page.split('_');

        // Check the URL has propay_1, propay_2, propay_3, propay_4
        if ((typeof pageParts[1] !== 'undefined') && (pageParts[1] >= 1) && (pageParts[1] <= 4)) {

            // Get the Pro number e.g. 1 - 4 then the name e.g. Pro I - III, Pro Lite
            pro.propay.planNum = parseInt(pageParts[1]);
            pro.propay.planName = pro.getProPlanName(pro.propay.planNum);

            return true;
        }

        return false;
    },

    /**
     * Preloads the large loading animation so it displays immediately when shown
     */
    preloadAnimation: function() {

        pro.propay.$backgroundOverlay = $('.fm-dialog-overlay', 'body');
        pro.propay.$loadingOverlay = $('.payment-processing', 'body');

        // Check if using retina display
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';

        // Preload loading animation
        pro.propay.$loadingOverlay.find('.payment-animation').attr('src',
            staticpath + '/images/mega/payment-animation' + retina + '.gif'
        );
    },

    /**
     * Loads the payment gateway options into Payment options section
     */
    loadPaymentGatewayOptions: function() {

        // If testing flag is enabled, enable all the gateways for easier debugging (this only works on Staging API)
        var enableAllPaymentGateways = (localStorage.enableAllPaymentGateways) ? 1 : 0;

        // Do API request (User Forms of Payment Query Full) to get the valid list of currently active
        // payment providers. Returns an array of objects e.g.
        // {
        //   "gatewayid":11,"gatewayname":"astropayB","type":"subgateway","displayname":"Bradesco",
        //   "supportsRecurring":0,"supportsMonthlyPayment":1,"supportsAnnualPayment":1,
        //   "supportsExpensivePlans":1,"extra":{"code":"B","taxIdLabel":"CPF"}
        // }
        api_req({ a: 'ufpqfull', t: 0, d: enableAllPaymentGateways }, {
            callback: function(gatewayOptions) {

                var $stepTwo = $('.payment-section', '.fmholder');
                var $placeholderText = $('.loading-placeholder-text', $stepTwo);
                var $pricingBox = $('.pricing-page.plan', $stepTwo);

                // If an API error (negative number) exit early
                if ((typeof gatewayOptions === 'number') && (gatewayOptions < 0)) {
                    $placeholderText.text('Error while loading, try reloading the page.');
                    return false;
                }

                // clean options we shouldn't show for individual signups
                var tempGatewayOptions = [];
                for (var ix = 0; ix < gatewayOptions.length; ix++) {
                    if (typeof gatewayOptions[ix].supportsIndividualPlans === 'undefined'
                        || gatewayOptions[ix].supportsIndividualPlans) {
                        tempGatewayOptions.push(gatewayOptions[ix]);
                    }
                }
                gatewayOptions = tempGatewayOptions;

                // Make a clone of the array so it can be modified
                pro.propay.allGateways = JSON.parse(JSON.stringify(gatewayOptions));

                // If mobile, filter out all gateways except the supported ones
                if (is_mobile) {
                    pro.propay.allGateways = mobile.propay.filterPaymentProviderOptions(pro.propay.allGateways);
                }

                // Check if the API has some issue and not returning any gateways at all
                if (pro.propay.allGateways.length === 0) {
                    console.error('No valid gateways returned from the API');
                    return false;
                }

                // Separate into two groups, the first group has 6 providers, the second has the rest
                var primaryGatewayOptions = gatewayOptions.splice(0, 6);
                var secondaryGatewayOptions = gatewayOptions;

                // Show payment duration (e.g. month or year) and renewal option radio options
                pro.propay.renderPlanDurationOptions();
                pro.propay.initPlanDurationClickHandler();
                pro.propay.initRenewalOptionClickHandler();

                // Hide/show Argentian warning message depending on ipcc
                if (u_attr.ipcc === 'AR') {
                    $('.argentina-only', $stepTwo).removeClass('hidden');
                }
                else {
                    $('.argentina-only', $stepTwo).addClass('hidden');
                }

                // If mobile, show all supported options at once and they can scroll vertically
                if (is_mobile) {
                    pro.propay.renderPaymentProviderOptions(pro.propay.allGateways, 'primary');
                }
                else {
                    // Otherwise if desktop, render the two groups and a Show More button will show the second group
                    pro.propay.renderPaymentProviderOptions(primaryGatewayOptions, 'primary');
                    pro.propay.renderPaymentProviderOptions(secondaryGatewayOptions, 'secondary');
                }

                // Change radio button states when clicked
                pro.propay.initPaymentMethodRadioButtons();
                pro.propay.preselectPreviousPaymentOption();
                pro.propay.updateDurationOptionsOnProviderChange();
                pro.propay.initShowMoreOptionsButton();

                // Update the pricing and whether is a regular payment or subscription
                pro.propay.updateMainPrice();
                pro.propay.updateTextDependingOnRecurring();

                // Show the pricing box on the right (it is hidden while everything loads)
                $pricingBox.removeClass('loading');

                // Hide the loading dialog
                loadingDialog.hide();
            }
        });
    },

    /**
     * Renders the pro plan prices into the Plan Duration dropdown
     */
    renderPlanDurationOptions: function() {

        // Sort plan durations by lowest number of months first
        pro.propay.sortMembershipPlans();

        // Clear the radio options, in case they revisted the page
        $('.duration-options-list .payment-duration').not('.template').remove();

        // Loop through the available plan durations for the current membership plan
        for (var i = 0, length = pro.membershipPlans.length; i < length; i++) {

            var currentPlan = pro.membershipPlans[i];

            // If match on the membership plan, display that pricing option in the dropdown
            if (currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === parseInt(pro.propay.planNum)) {

                // Get the price and number of months duration
                var price = currentPlan[pro.UTQA_RES_INDEX_PRICE];
                var currencySymbol = ' \u20ac';
                if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                    price = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                    currencySymbol = '';
                }
                var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
                var monthsWording = l[922];     // 1 month

                // Change wording depending on number of months
                if (numOfMonths === 12) {
                    monthsWording = l[923];     // 1 year
                }
                else if (numOfMonths > 1) {
                    monthsWording = l[6803].replace('%1', numOfMonths);     // x months
                }

                // Build select option
                var $durationOption = $('.payment-duration.template').first().clone();

                // Update months and price
                $durationOption.removeClass('template');
                $durationOption.attr('data-plan-index', i);
                $durationOption.attr('data-plan-months', numOfMonths);
                $('.duration', $durationOption).text(monthsWording);
                $('.price', $durationOption).text(price + currencySymbol);

                // Show amount they will save
                if (numOfMonths === 12) {
                    var discount;
                    if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                        discount = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCYSAVE];
                    }
                    else {
                        // Calculate the discount price (the current yearly price is 10 months worth)
                        var priceOneMonth = (price / 10);
                        var priceTenMonths = (priceOneMonth * 10);
                        var priceTwelveMonths = (priceOneMonth * 12);
                        discount = (priceTwelveMonths - priceTenMonths).toFixed(2);
                    }

                    $('.save-money', $durationOption).removeClass('hidden');
                    $('.save-money .amount', $durationOption).text(discount + currencySymbol);
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
            if (!sessionStorage['pro.period'] && $monthOption.length) {
                $('input', $monthOption).prop('checked', true);
                $('.membership-radio', $monthOption).addClass('checked');
                $('.membership-radio-label', $monthOption).addClass('checked');
                return true;
            }
        }

        // Otherwise pre-select the chosen period from previous page
        var selectedPeriod = sessionStorage['pro.period'] ? sessionStorage['pro.period'] : 1;
        var $selectedOption = $('.payment-duration[data-plan-months="'
            + selectedPeriod + '"]', '.duration-options-list');

        // Otherwise pre-select monthly payment
        if (!$selectedOption) {
            $selectedOption = $('.payment-duration:not(.template)', '.duration-options-list').first();
        }

        $('input', $selectedOption).prop('checked', true);
        $('.membership-radio', $selectedOption).addClass('checked');
        $('.membership-radio-label', $selectedOption).addClass('checked');
    },

    /**
     * Sorts plan durations by lowest number of months first
     */
    sortMembershipPlans: function() {

        pro.membershipPlans.sort(function (planA, planB) {

            var numOfMonthsPlanA = planA[pro.UTQA_RES_INDEX_MONTHS];
            var numOfMonthsPlanB = planB[pro.UTQA_RES_INDEX_MONTHS];

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

        var $durationOptions = $('.payment-duration', '.payment-section');

        // Add click handler
        $durationOptions.rebind('click', function() {

            var $this = $(this);
            var planIndex = $this.attr('data-plan-index');

            // Remove checked state on the other buttons
            $('.membership-radio', $durationOptions).removeClass('checked');
            $('.membership-radio-label', $durationOptions).removeClass('checked');
            $('input', $durationOptions).prop('checked', false);

            // Add checked state to just to the clicked one
            $('.membership-radio', $this).addClass('checked');
            $('.membership-radio-label', $this).addClass('checked');
            $('input', $this).prop('checked', true);

            // Update the main price and wording for one-time or recurring
            pro.propay.updateMainPrice(planIndex);
            pro.propay.updateTextDependingOnRecurring();
        });
    },

    /**
     * Updates the main price
     * @param {Number} planIndex The array index of the plan in pro.membershipPlans
     */
    updateMainPrice: function(planIndex) {

        // If not passed in (e.g. inital load), get it from the currently selected duration radio option
        if (typeof planIndex === 'undefined') {
            planIndex = $('.duration-options-list .membership-radio.checked', '.payment-section')
                .parent().attr('data-plan-index');
        }

        // Change the wording to month or year
        var currentPlan = pro.membershipPlans[planIndex];
        var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
        var monthOrYearWording = numOfMonths === 1 ? l[931] : l[932];
        var bandwidthText = numOfMonths === 1 ? l[23808] : l[24065];
        var intl = mega.intl.number;

        // Get the current plan price
        var price = currentPlan[pro.UTQA_RES_INDEX_PRICE].split('.');

        // If less than 12 months is selected, use the monthly base price instead
        //if (numOfMonths !== 12) {
        //    price = currentPlan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE].split('.');
        //}

        var dollars = price[0];
        var cents = price[1];
        var decimal = mega.intl.decimalSeparator;
        // Get the current plan's bandwidth, then convert the number to 'x GBs' or 'x TBs'
        var storageGigabytes = currentPlan[pro.UTQA_RES_INDEX_STORAGE];
        var storageBytes = storageGigabytes * 1024 * 1024 * 1024;
        var storageFormatted = numOfBytes(storageBytes, 0);
        var storageSizeRounded = Math.round(storageFormatted.size);
        var storageValue = storageSizeRounded + ' ' + storageFormatted.unit;

        // Get the current plan's bandwidth, then convert the number to 'x GBs' or 'x TBs'
        var bandwidthGigabytes = currentPlan[pro.UTQA_RES_INDEX_TRANSFER];
        var bandwidthBytes = bandwidthGigabytes * 1024 * 1024 * 1024;
        var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
        var bandwidthSizeRounded = Math.round(bandwidthFormatted.size);
        var bandwidthValue = bandwidthSizeRounded + ' ' + bandwidthFormatted.unit;

        // Set selectors
        var $step2 = $('.payment-section', '.fmholder');
        var $chargeAmount = $('.charge-information .amount', $step2);
        var $pricingBox = $('.pricing-page.plan', $step2);
        var $planName = $('.plan-title', $pricingBox);
        var $priceNum = $('.plan-price .price', $pricingBox);
        var $pricePeriod = $('.plan-period', $pricingBox);
        var $storageAmount = $('.plan-feature.storage', $pricingBox);
        var $storageTip = $('i', $storageAmount);
        var $bandwidthAmount = $('.plan-feature.transfer', $pricingBox);
        var $bandwidthTip = $('i', $bandwidthAmount);
        var $euroPrice = $('.euro-price', $pricingBox);
        var $currncyAbbrev = $('.plan-currency', $pricingBox);

        var euroSign = '\u20ac';
        var localPrice;
        var localD;
        var localC;
        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            $step2.addClass('local-currency');
            $currncyAbbrev.text(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]);
            $euroPrice.text(intl.format(currentPlan[pro.UTQA_RES_INDEX_PRICE]) +
                ' ' + euroSign);
            localPrice = '' + currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
            $('.local-currency-tip', $step2).removeClass('hidden');
        }
        else {
            $step2.removeClass('local-currency');
            $('.local-currency-tip', $step2).addClass('hidden');
        }

        // If mobile, name at the top
        if (is_mobile) {
            var $mobilePlanName = $('.payment-options .plan-name', $step2);

            $mobilePlanName.text(pro.propay.planName);
        }

        // Update the style of the dialog to be Pro I-III or Lite, also change the plan name
        $pricingBox.addClass('pro' + pro.propay.planNum);
        $('.plan-icon', $step2).addClass('pro' + pro.propay.planNum);
        $pricingBox.attr('data-payment', pro.propay.planNum);
        $planName.text(pro.propay.planName);

        // Update the price of the plan and the /month or /year next to the price box
        // work for local currency if present
        if (localPrice) {
            var localParts = localPrice.split('.');
            localD = localParts[0];
            localC = localParts[1] || '00';
            if (localD.length > 9) {
                // localD = localD.substr(0, 5);
                if (localD.length > 11) {
                    localC = '0';
                }
                else {
                    localC = '00';
                }
                localD = Number.parseInt(localD) + 1;
            }
            else {
                if (localC.length > 2) {
                    localC = localC.substr(0, 2);
                    localC = Number.parseInt(localC) + 1;
                    localC = (localC + '0').substr(0, 2);
                }
            }
            $priceNum.text(localPrice);
        }
        else {
            $priceNum.text(dollars + decimal + cents + ' ' + euroSign);    // EUR symbol
        }
        $pricePeriod.text('/' + monthOrYearWording);

        // Update the charge information for question 3
        $chargeAmount.text(dollars + decimal + cents);

        // Update storage
        if ($storageTip && $storageTip.data('simpletip')) {
            $('span', $storageAmount)
                .safeHTML(l[23789].replace('%1', '<span>' + storageValue + '</span>'));
            $storageTip.data('simpletip', l[23807].replace('%1', '[U]' + storageValue + '[/U]'));
        }

        // Update bandwidth
        if ($bandwidthTip && $bandwidthTip.data('simpletip')) {
            $('span', $bandwidthAmount)
                .safeHTML(l[23790].replace('%1', '<span>' + bandwidthValue + '</span>'));
            $bandwidthTip.data('simpletip', bandwidthText.replace('%1', '[U]' + bandwidthValue + '[/U]'));
        }
    },

    /* jshint -W074 */  // Old code, refactor another day

    /**
     * Updates the text on the page depending on the payment option they've selected and
     * the duration/period so it is accurate for a recurring subscription or one off payment.
     */
    updateTextDependingOnRecurring: function() {

        'use strict';

        if (pro.propay.allGateways.length === 0) {
            return false;
        }

        var $step2 = $('.payment-section', '.fmholder');
        var $paymentDialog = $('.payment-dialog', 'body');
        var $paymentAddressDialog = $('.payment-address-dialog', 'body');
        var $numbers;

        // Update whether this selected option is recurring or one-time
        var $selectDurationOption = $('.duration-options-list .membership-radio.checked', $step2);
        var selectedGatewayName = $('.payment-options-list input:checked', $step2).val();
        var selectedProvider = pro.propay.allGateways.filter(function(val) {
            return (val.gatewayName === selectedGatewayName);
        })[0];

        // Set text to subscribe or purchase
        var planIndex = $selectDurationOption.parent().attr('data-plan-index');
        var currentPlan = pro.membershipPlans[planIndex];
        var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
        var price = currentPlan[pro.UTQA_RES_INDEX_PRICE] + ' \u20ac';     // 0.00 EUR symbol
        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            price = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
        }

        // Get the value for whether the user wants the plan to renew automatically
        var recurringEnabled = false;
        var autoRenewCheckedValue = $('.renewal-options-list input:checked', $step2).val();

        // If the provider supports recurring payments and the user wants the plan to renew automatically
        if (selectedProvider.supportsRecurring && (autoRenewCheckedValue === 'yes')) {
            recurringEnabled = true;
        }

        // Set text
        var subscribeOrPurchase = (recurringEnabled) ? l[6172] : l[6190].toLowerCase();
        var subscribeOrPurchaseInstruction = (recurringEnabled) ? l[22074] : l[7996];
        var recurringOrNonRecurring = (recurringEnabled) ? '(' + l[6965] + ')' : l[6941];
        var recurringMonthlyOrAnnuallyMessage = (numOfMonths === 1) ? l[10628] : l[10629];
        var autoRenewMonthOrYearQuestion = (numOfMonths === 1) ? l[10638] : l[10639];
        var chargeInfoDuration = l[10642].replace('%1', price);

        // Find the pricing period in the pricing box and the plan duration options
        var $sidePanelPeriod = $('.pricing-page.plan .period', $step2);

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
            $('.renewal-option', $step2).removeClass('hidden');
        }
        else {
            // Otherwise it's a one off only provider, hide the extra information
            $('.renewal-option', $step2).addClass('hidden');
        }

        $numbers = $('.number:visible', $step2);

        // Reorder options numbering
        for (var i = 0, length = $numbers.length; i < length; i++) {
            $($numbers[i]).text(i + 1);
        }

        // Show recurring info box next to Purchase button and update dialog text for recurring
        if (recurringEnabled) {
            $('.subscription-instructions', $step2).removeClass('hidden');
            $('.subscription-instructions', $step2).rebind('click', function() {
                bottomPageDialog(false, 'terms', l[1712], true);
            });
            $('.payment-note-first.recurring', $paymentAddressDialog).removeClass('hidden');
            $('.payment-note-first.one-time', $paymentAddressDialog).addClass('hidden');
        }
        else {
            // Hide recurring info box next to Purchase button and update dialog text for one-time
            $('.subscription-instructions', $step2).addClass('hidden');
            $('.payment-note-first.recurring', $paymentAddressDialog).addClass('hidden');
            $('.payment-note-first.one-time', $paymentAddressDialog).removeClass('hidden');
        }

        // Update depending on recurring or one off payment
        $('.big-green-button.purchase', $step2).text(subscribeOrPurchase);
        $('.payment-instructions', $step2).safeHTML(subscribeOrPurchaseInstruction);
        $('.choose-renewal .duration-text', $step2).text(autoRenewMonthOrYearQuestion);
        $('.charge-information', $step2).text(chargeInfoDuration);
        $('.payment-buy-now', $paymentDialog).text(subscribeOrPurchase);
        $('.payment-buy-now', $paymentAddressDialog).text(subscribeOrPurchase);
        $('.payment-note-first.recurring .duration', $paymentAddressDialog)
            .text(recurringMonthlyOrAnnuallyMessage);
        $('.payment-plan-txt .recurring', $paymentAddressDialog).text(recurringOrNonRecurring);
    },
    /* jshint +W074 */

    /**
     * Add click handler for the radio buttons which are used for selecting the plan/subscription duration
     */
    initRenewalOptionClickHandler: function() {

        var $renewalOptions = $('.renewal-options-list .renewal-option', 'body');

        // Add click handler
        $renewalOptions.rebind('click', function() {

            var $this = $(this);

            // Remove checked state on the other buttons
            $('.membership-radio', $renewalOptions).removeClass('checked');
            $('.membership-radio-label', $renewalOptions).removeClass('checked');
            $('input', $renewalOptions).prop('checked', false);

            // Add checked state to just to the clicked one
            $('.membership-radio', $this).addClass('checked');
            $('.membership-radio-label', $this).addClass('checked');
            $('input', $this).prop('checked', true);

            // Update the wording for one-time or recurring
            pro.propay.updateTextDependingOnRecurring();
        });
    },

    /**
     * Render the payment providers as radio buttons
     * @param {Object} gatewayOptions The list of gateways from the API
     * @param {String} primaryOrSecondary Which list to render the gateways into i.e. 'primary' or 'secondary'
     */
    renderPaymentProviderOptions: function(gatewayOptions, primaryOrSecondary) {

        // Get their plan price from the currently selected duration radio button
        var selectedPlanIndex = $('.duration-options-list .membership-radio.checked', 'body')
            .parent().attr('data-plan-index');
        var selectedPlan = pro.membershipPlans[selectedPlanIndex];
        var selectedPlanNum = selectedPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
        var selectedPlanPrice = selectedPlan[pro.UTQA_RES_INDEX_PRICE];

        // Convert to float for numeric comparisons
        var planPriceFloat = parseFloat(selectedPlanPrice);
        var balanceFloat = parseFloat(pro.propay.proBalance);
        var gatewayHtml = '';

        // Cache the template selector
        var $template = $('.payment-options-list.primary .payment-method.template', 'body');

        // Remove existing providers and so they are re-rendered
        $('.payment-options-list.' + primaryOrSecondary
          + ' .payment-method:not(.template)', 'body').remove();
        $('.loading-placeholder-text', 'body').addClass('hidden');

        // Loop through gateway providers (change to use list from API soon)
        for (var i = 0, length = gatewayOptions.length; i < length; i++) {

            var $gateway = $template.clone();
            var gatewayOpt = gatewayOptions[i];
            var gatewayId = gatewayOpt.gatewayId;

            // Get the gateway name and display name
            var gatewayInfo = pro.getPaymentGatewayName(gatewayId, gatewayOpt);
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
            $('input', $gateway).attr('name', gatewayName);
            $('input', $gateway).attr('id', gatewayName);
            $('input', $gateway).val(gatewayName);
            $('.provider-icon', $gateway).addClass(gatewayName);
            $('.provider-name', $gateway).text(displayName).prop('title', displayName);

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
        var $paymentOptionsList = $('.payment-options-list', '.fmholder');

        // Add click handler to all payment methods
        $('.payment-method', $paymentOptionsList).rebind('click.changeState', function() {

            var $this = $(this);

            // Don't let the user select this option if it's disabled e.g. it is disabled because
            // they must select a cheaper plan to work with this payment provider e.g. Fortumo
            if ($this.hasClass('disabled')) {
                return false;
            }

            // Remove checked state from all radio inputs
            $('.membership-radio', $paymentOptionsList).removeClass('checked');
            $('.provider-details', $paymentOptionsList).removeClass('checked');
            $('input', $paymentOptionsList).prop('checked', false);

            // Add checked state for this radio button
            $('input', $this).prop('checked', true);
            $('.membership-radio', $this).addClass('checked');
            $('.provider-details', $this).addClass('checked');

            pro.propay.updateTextDependingOnRecurring();
            pro.propay.updateDurationOptionsOnProviderChange();
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
            var gatewayInfo = pro.getPaymentGatewayName(gatewayId);
            var extraData = (typeof lastPayment.gwd !== 'undefined') ? lastPayment.gwd : null;
            var gatewayName = (typeof lastPayment.gwd !== 'undefined') ? extraData.gwname : gatewayInfo.name;

            // Find the gateway
            var $gatewayInput = $('#' + gatewayName);

            // If it is still in the list (e.g. valid provider still)
            if ($gatewayInput.length) {

                // Get the elements which need to be set
                var $membershipRadio = $gatewayInput.parent();
                var $providerDetails = $membershipRadio.next();
                var $secondaryPaymentOptions = $('.payment-options-list.secondary', 'body');
                var $showMoreButton = $('.provider-show-more', '.payment-section');

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
                pro.propay.preselectPaymentOption();
            }
        }
        else {
            // Otherwise select the first available payment option
            pro.propay.preselectPaymentOption();
        }
    },

    /**
     * Preselects the payment option in the list of payment providers. Pro balance should be selected first if
     * they have a balance, otherwise the next payment provider should be selected (which is usually Visa)
     */
    preselectPaymentOption: function() {

        'use strict';

        // Find the primary payment options
        var $payOptions = $('.payment-options-list.primary .payment-method:not(.template)');

        // If they have a Pro balance, select the first option, otherwise select
        // the next payment option (usually API will have it ordered to be Visa)
        var $option = (parseFloat(pro.propay.proBalance) > 0) ? $payOptions.first() : $payOptions.eq(1);

        // Check the radio button option
        $('input', $option).prop('checked', true);
        $('.membership-radio', $option).addClass('checked');
        $('.provider-details', $option).addClass('checked');
    },

    /**
     * Updates the duration/renewal period options if they select a payment method. For example
     * for the wire transfer option we only want to accept one year one-off payments
     */
    updateDurationOptionsOnProviderChange: function() {

        var $durationOptionsList = $('.duration-options-list', 'body');
        var $durationOptions = $('.payment-duration:not(.template)', $durationOptionsList);
        var selectedPlanIndex = $('.membership-radio.checked', $durationOptionsList).parent()
                                    .attr('data-plan-index');
        var selectedGatewayName = $('.payment-options-list input:checked', 'body').val();
        var selectedProvider = pro.propay.allGateways.filter(function(val) {
            return (val.gatewayName === selectedGatewayName);
        })[0];

        // Reset all options, they will be hidden or checked again if necessary below
        $durationOptions.removeClass('hidden');
        $('.membership-radio', $durationOptions).removeClass('checked');
        $('.membership-radio-label', $durationOptions).removeClass('checked');
        $('input', $durationOptions).prop('checked', false);

        // Loop through renewal period options (1 month, 1 year)
        $.each($durationOptions, function(key, durationOption) {

            // Get the plan's number of months
            var planIndex = $(durationOption).attr('data-plan-index');
            var currentPlan = pro.membershipPlans[planIndex];
            var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];

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
        $newDurationOption = $('[data-plan-index=' + selectedPlanIndex + ']', $durationOptionsList);
        if ($newDurationOption.length && !$newDurationOption.hasClass('hidden')) {
            newPlanIndex = selectedPlanIndex;
        }
        else {
            $newDurationOption = $('.payment-duration:not(.template, .hidden)', $durationOptionsList).first();
            newPlanIndex = $newDurationOption.attr('data-plan-index');
        }
        $('.membership-radio', $newDurationOption).addClass('checked');
        $('.membership-radio-label', $newDurationOption).addClass('checked');
        $('input', $newDurationOption).prop('checked', true);

        // Update the text for one-time or recurring
        pro.propay.updateMainPrice(newPlanIndex);
        pro.propay.updateTextDependingOnRecurring();
    },

    /**
     * Initialise the button to show more payment options
     */
    initShowMoreOptionsButton: function() {

        // If there are more than 6 payment options, enable the button to show more
        if (pro.propay.allGateways.length > 6) {

            var $showMoreButton = $('.provider-show-more', '.payment-section');

            // Show the button
            $showMoreButton.removeClass('hidden');

            // On clicking 'Click here to show more payment options'
            $showMoreButton.rebind('click.shoMore', function() {

                // Show the other payment options and then hide the button
                $('.payment-options-list.secondary', 'body').removeClass('hidden');
                $showMoreButton.hide();

                // Trigger resize or you can't scroll to the bottom of the page anymore
                $(window).trigger('resize');
            });
        }
    },

    /**
     * Start the purchase process
     */
    startPurchaseProcess: function() {

        // Get the selected payment duration and gateway
        var $step2 = $('.payment-section',  'body');
        var $selectedPaymentDuration = $('.duration-options-list .membership-radio.checked', $step2);
        var $selectedPaymentGateway = $('.payment-options-list input:checked', $step2);

        // Selected payment method and package
        var selectedPaymentGatewayName = $selectedPaymentGateway.val();
        var selectedProvider = pro.propay.allGateways.filter(function(val) {
            return (val.gatewayName === selectedPaymentGatewayName);
        })[0];

        // Get array index of the Pro package in the list of plans from the API
        var selectedProPackageIndex = $selectedPaymentDuration.parent().attr('data-plan-index');

        // Set the pro package (used in pro.propay.sendPurchaseToApi function)
        pro.propay.selectedProPackage = pro.membershipPlans[selectedProPackageIndex];

        if (u_type === false) {

            u_storage = init_storage(localStorage);
            loadingDialog.show();

            u_checklogin({ checkloginresult: function() {
                pro.propay.sendPurchaseToApi();

            }}, true);
        }
        else {
            // Store the gateway name for later
            pro.propay.proPaymentMethod = selectedPaymentGatewayName;

            // For credit card we show the dialog first, then do the uts/utc calls
            if (pro.propay.proPaymentMethod === 'perfunctio') {
                cardDialog.init();
            }
            else if (pro.propay.proPaymentMethod.indexOf('ecp') === 0) {
                addressDialog.init();
            }
            else if (pro.propay.proPaymentMethod === 'voucher') {
                voucherDialog.init();
            }
            else if (pro.propay.proPaymentMethod === 'wiretransfer') {
                wireTransferDialog.init();
            }
            else if (selectedProvider.gatewayId === astroPayDialog.gatewayId) {
                astroPayDialog.init(selectedProvider);
            }
            else {
                // For other methods we do a uts and utc call to get the provider details first
                pro.propay.sendPurchaseToApi();
            }
        }
    },

    /**
     * Continues the Pro purchase and initiates the
     */
    /* jshint -W074 */  // Old code, refactor another day
    sendPurchaseToApi: function() {

        // Show different loading animation text depending on the payment methods
        switch (pro.propay.proPaymentMethod) {
            case 'bitcoin':
                pro.propay.showLoadingOverlay('loading');
                break;
            case 'pro_prepaid':
            case 'perfunctio':
                pro.propay.showLoadingOverlay('processing');
                break;
            default:
                pro.propay.showLoadingOverlay('transferring');
        }

        // Data for API request
        var apiId = pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_ID];
        var price = pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_PRICE];
        var currency = pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_CURRENCY];

        // Convert from boolean to integer for API
        var fromBandwidthDialog = ((Date.now() - parseInt(localStorage.seenOverQuotaDialog)) < 2 * 3600000) ? 1 : 0;
        var fromPreWarnBandwidthDialog = ((Date.now() - parseInt(localStorage.seenQuotaPreWarn)) < 2 * 36e5) ? 1 : 0;

        // uts = User Transaction Sale
        var utsRequest = {
            a:  'uts',
            it:  0,
            si:  apiId,
            p:   price,
            c:   currency,
            aff: mega.affid,
            m:   m,
            bq:  fromBandwidthDialog,
            pbq: fromPreWarnBandwidthDialog
        };

        if (mega.uaoref) {
            utsRequest.uao = escapeHTML(mega.uaoref);
        }

        // If the plan was chosen immediately after registration, add an 'fr' (from registration) log to the request
        if (pro.propay.planChosenAfterRegistration) {
            utsRequest.fr = 1;
        }

        // Setup the 'uts' API request
        api_req(utsRequest, {
            callback: function (utsResult) {

                // Store the sale ID to check with API later
                var saleId = utsResult;

                // Extra gateway specific details for UTC call
                var extra = {};

                // Show an error
                if ((typeof saleId === 'number') && (saleId < 0)) {

                    // Hide the loading overlay and show an error
                    pro.propay.hideLoadingOverlay();
                    msgDialog('warninga', l[7235], l[200] + ' ' + l[253]);  // Something went wrong. Try again later...
                    return false;
                }

                if (pro.propay.proPaymentMethod === 'voucher' || pro.propay.proPaymentMethod === 'pro_prepaid') {
                    pro.lastPaymentProviderId = 0;
                }
                else if (pro.propay.proPaymentMethod === 'bitcoin') {
                    pro.lastPaymentProviderId = 4;
                }
                else if (pro.propay.proPaymentMethod === 'perfunctio') {
                    pro.lastPaymentProviderId = 8;
                }
                else if (pro.propay.proPaymentMethod === 'dynamicpay') {
                    pro.lastPaymentProviderId = 5;
                }
                else if (pro.propay.proPaymentMethod === 'fortumo') {
                    // pro.lastPaymentProviderId = 6;
                    // Fortumo does not do a utc request, we immediately redirect
                    fortumo.redirectToSite(saleId);
                    return false;
                }
                else if (pro.propay.proPaymentMethod === 'infobip') {
                    // pro.lastPaymentProviderId = 9;
                    // Centili does not do a utc request, we immediately redirect
                    centili.redirectToSite(saleId);
                    return false;
                }
                else if (pro.propay.proPaymentMethod === 'paysafecard') {
                    pro.lastPaymentProviderId = 10;
                }
                else if (pro.propay.proPaymentMethod === 'tpay') {
                    pro.lastPaymentProviderId = tpay.gatewayId; // 14
                }
                else if (pro.propay.proPaymentMethod.indexOf('directreseller') === 0) {
                    pro.lastPaymentProviderId = directReseller.gatewayId; // 15
                }

                // If AstroPay, send extra details
                else if (pro.propay.proPaymentMethod.indexOf('astropay') > -1) {
                    pro.lastPaymentProviderId = astroPayDialog.gatewayId;
                    extra.bank = astroPayDialog.selectedProvider.extra.code;
                    extra.cpf = astroPayDialog.taxNumber;
                    extra.name = astroPayDialog.fullName;
                }

                // If Ecomprocessing, send extra details
                else if (pro.propay.proPaymentMethod.indexOf('ecp') === 0) {
                    pro.lastPaymentProviderId = addressDialog.gatewayId;
                    extra = addressDialog.extraDetails;
                }
                else if (pro.propay.proPaymentMethod.indexOf('sabadell') === 0) {
                    pro.lastPaymentProviderId = sabadell.gatewayId; // 17

                    // Get the value for whether the user wants the plan to renew automatically
                    var autoRenewCheckedValue = $('.renewal-options-list input:checked', '.payment-section').val();

                    // If the provider supports recurring payments and the user wants the plan to renew automatically
                    if (autoRenewCheckedValue === 'yes') {
                        extra.recurring = true;
                    }
                }

                // Complete the transaction
                api_req({
                    a: 'utc',                       // User Transaction Complete
                    s: [saleId],                    // Sale ID
                    m: pro.lastPaymentProviderId,   // Gateway number
                    bq: fromBandwidthDialog,        // Log for bandwidth quota triggered
                    extra: extra                    // Extra information for the specific gateway
                }, {
                    m: pro.lastPaymentProviderId,
                    callback: tryCatch(function(utcResult, ctx) {
                        pro.propay.processUtcResults(utcResult);

                        if (typeof utcResult === 'number' && utcResult < 0) {
                            mBroadcaster.sendMessage('trk:event', 'account', 'upg', 'error', utcResult);
                        }
                        else {
                            if ('trk' in window) {
                                trk({ec_id: saleId, revenue: price}).dump('trk:utc');
                            }

                            mBroadcaster.sendMessage('trk:event', 'account', 'upg', u_attr.b ? 'bus' : 'norm', ctx.m);
                        }
                    })
                });
            }
        });
    },

    /**
     * Process results from the API User Transaction Complete call
     * @param {Object|Number} utcResult The results from the UTC call or a negative number on failure
     */
    processUtcResults: function(utcResult) {

        // Check for insufficient balance error, other errors will fall through
        if ((typeof utcResult === 'number') && (utcResult === EOVERQUOTA) &&
                (pro.lastPaymentProviderId === voucherDialog.gatewayId)) {

            // Hide the loading animation and show an error
            pro.propay.hideLoadingOverlay();
            msgDialog('warninga', l[6804], l[514], '');             // Insufficient balance, try again...
            return false;
        }

        // If other negative number response from the API
        else if ((typeof utcResult === 'number') && (utcResult < 0)) {

            // Hide the loading animation and show an error
            pro.propay.hideLoadingOverlay();
            msgDialog('warninga', l[7235], l[200] + ' ' + l[253]);   // Something went wrong. Try later...
            return false;
        }

        // Handle results for different payment providers
        switch (pro.lastPaymentProviderId) {

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

            // If sabadell, redirect to the site
            case sabadell.gatewayId:
                sabadell.redirectToSite(utcResult);
                break;
        }
    },
    /* jshint +W074 */

    /**
     * Generic function to show the bouncing megacoin icon while loading
     * @param {String} messageType Which message to display e.g. 'processing', 'transferring', 'loading'
     */
    showLoadingOverlay: function(messageType) {

        // Show the loading gif
        pro.propay.$backgroundOverlay.removeClass('hidden')
            .addClass('payment-dialog-overlay');
        pro.propay.$loadingOverlay.removeClass('hidden');

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
        $('.payment-animation-txt', pro.propay.$loadingOverlay).text(message);
    },

    /**
     * Hides the payment processing/transferring/loading overlay
     */
    hideLoadingOverlay: function() {

        pro.propay.$backgroundOverlay.addClass('hidden')
            .removeClass('payment-dialog-overlay');
        pro.propay.$loadingOverlay.addClass('hidden');
    },

    /**
     * Gets the wording for the plan subscription duration in months or years.
     * This is used by a number of the payment provider dialogs.
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
