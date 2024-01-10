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

    /** Selector for the Pro Pay page (step 2 of the process) */
    $page: null,

    paymentStatusChecker: null,

    /** The user's subscription payment gateway id */
    userSubsGatewayId: null,

    /**
     * Initialises the page and functionality
     */
    init: function() {
        "use strict";

        // If Business sub-user or account is not expired/grace period, don't allow
        // access to this Pro Pay page or they would end up purchasing a new plan
        if (u_attr && u_attr.b && (!u_attr.b.m || !pro.isExpiredOrInGracePeriod(u_attr.b.s))) {
            loadSubPage('start');
            return;
        }

        // If Business master user is expired or in grace period, redirect to repay page
        if (u_attr && u_attr.b && u_attr.b.m && pro.isExpiredOrInGracePeriod(u_attr.b.s)) {
            loadSubPage('repay');
            return;
        }

        // If a current Pro Flexi user (not expired/grace period), don't allow
        // access to this Pro Pay page or they would end up purchasing a new plan
        if (u_attr && u_attr.pf && !pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
            loadSubPage('start');
            return;
        }

        // If a previous Pro Flexi user is expired or in grace period, they must use the Repay page to pay again
        if (u_attr && u_attr.pf && pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
            loadSubPage('repay');
            return;
        }

        // Cache current Pro Payment page selector
        this.$page = $('.payment-section', '.fmholder');

        const $selectedPlanName = $('.top-header.plan-title .plan-name', this.$page);
        const $purchaseButton = $('button.purchase', this.$page);

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

        // If the plan number is not set in the URL e.g. propay_4, go back to Pro page step 1 so they can choose a plan
        if (!pro.propay.setProPlanFromUrl()) {
            loadSubPage('pro');
            return;
        }

        // If the user does has more stored than the current plan offers, go back to Pro page
        // so they may select a plan that provides more storage space
        const proceed = new Promise((resolve, reject) => {
            M.getStorageQuota().then((storage) => {
                checkPlanStorage(storage.used, pro.propay.planNum).then((res) => {
                    if (res) {
                        $purchaseButton.removeClass('disabled');
                        resolve();
                    }
                    else {
                        loadSubPage('pro');
                        reject(new Error('Selected plan does not have enough storage space'));
                    }
                });
            });
        });

        // Update header text with plan
        $selectedPlanName.text(pro.propay.planName);
        let discountInfo = pro.propay.getDiscount();
        if (discountInfo && discountInfo.pd && !discountInfo.used) {
            const discountTitle = discountInfo.m === 12 ? l[24680]
                : (discountInfo.m === 1 ? l[24849] : l[24850]);
            $('.top-header.plan-title', this.$page).safeHTML(discountTitle
                .replace('%1', pro.propay.planName)
                .replace('%2', formatPercentage(discountInfo.pd / 100)));
            $('.stores-desc', this.$page).addClass('hidden');
            discountInfo.used = 1;
        }
        else if (discountInfo && discountInfo.used) {
            delete mega.discountInfo;
            discountInfo = false;
        }
        if (login_next && login_next.indexOf('discount') > -1) {
            login_next = false;
        }
        if (pro.propay.planNum === 101) {
            $('.bottom-page .bottom-page.stores-desc', this.$page).addClass('hidden');
        }

        // Initialise the main purchase button
        $purchaseButton.rebind('click.purchase', () => {
            if (is_mobile) {
                pro.propay.userSubsGatewayId =
                    M.account.sgwids && M.account.sgwids.length > 0 ? M.account.sgwids[0] : null;
            }
            pro.propay.startPurchaseProcess();
            return false;
        });

        clickURLs();

        // Show loading spinner because some stuff may not be rendered properly yet
        loadingDialog.show('propayReady');

        // Initialise some extra stuff just for mobile
        if (is_mobile) {
            mobile.propay.init();
            if ((discountInfo && discountInfo.pd) || (pro.propay.planNum === 101)) {
                $('.mobile.external-payment-options', '.mobile.fm-content').addClass('hidden');
            }
        }

        // Load payment plans
        pro.loadMembershipPlans(function() {

            // Get the user's account balance
            voucherDialog.getLatestBalance(function() {

                // Load payment providers and do the rest of the rendering if the selected plan
                // has enough storage. Otherwuse do not proceed with rendering the page.
                proceed.then(async () => {
                    await pro.propay.loadPaymentGatewayOptions();
                    loadingDialog.hide('propayReady');
                }).catch((ex) => {
                    console.error(ex);
                });
            });
        });
    },

    /**
     * Gets the Pro plan number e.g. 4 from the URL e.g. propay_4
     * @returns {Boolean} Returns true if set correctly, otherwise returns false
     */
    setProPlanFromUrl: function() {

        // The URL should be in format /propay_x (1-4)
        const pageParts = page.split('_');

        if (typeof pageParts[1] === 'undefined') {
            return false;
        }

        const proNumInt = parseInt(pageParts[1]);
        const validProNums = [
            pro.ACCOUNT_LEVEL_PRO_LITE,
            pro.ACCOUNT_LEVEL_PRO_I,
            pro.ACCOUNT_LEVEL_PRO_II,
            pro.ACCOUNT_LEVEL_PRO_III,
            pro.ACCOUNT_LEVEL_PRO_FLEXI
        ];

        // If the Pro Flexi enabled (pf) flag is not on and they're trying to access the page, don't allow
        if (mega.flags && mega.flags.pf !== 1 && proNumInt === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            return false;
        }

        // Check the URL has propay_1 (PRO I) - propay_3 (PRO III), propay_4 (PRO Lite), propay_101 (Pro Flexi)
        if (validProNums.includes(proNumInt)) {

            // Get the Pro number e.g. 2 then the name e.g. Pro I - III, Pro Lite, Pro Flexi etc
            pro.propay.planNum = proNumInt;
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

    getDiscount: function() {
        'use strict';
        if (mega.discountInfo && mega.discountInfo.pd && mega.discountInfo.al === pro.propay.planNum) {
            return mega.discountInfo;
        }
        return false;
    },

    /**
     * Loads the payment gateway options into Payment options section
     */
    loadPaymentGatewayOptions: async function() {

        'use strict';

        // If testing flag is enabled, enable all the gateways for easier debugging (this only works on Staging API)
        var enableAllPaymentGateways = (localStorage.enableAllPaymentGateways) ? 1 : 0;

        // Do API request (User Forms of Payment Query Full) to get the valid list of currently active
        // payment providers. Returns an array of objects e.g.
        // {
        //   "gatewayid":11,"gatewayname":"astropayB","type":"subgateway","displayname":"Bradesco",
        //   "supportsRecurring":0,"supportsMonthlyPayment":1,"supportsAnnualPayment":1,
        //   "supportsExpensivePlans":1,"extra":{"code":"B","taxIdLabel":"CPF"}
        // }
        let {result: gatewayOptions} = await api.req({ a: 'ufpqfull', t: 0, d: enableAllPaymentGateways });

        const $placeholderText = $('.loading-placeholder-text', pro.propay.$page);
        const $pricingBox = $('.pricing-page.plan', pro.propay.$page);

        // If an API error (negative number) exit early
        if ((typeof gatewayOptions === 'number') && (gatewayOptions < 0)) {
            $placeholderText.text('Error while loading, try reloading the page.');
            return false;
        }

        var tempGatewayOptions = gatewayOptions.filter(gate =>
            (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI &&
            gate.supportsBusinessPlans === 1) ||
            (pro.propay.planNum !== pro.ACCOUNT_LEVEL_PRO_FLEXI &&
            (typeof gate.supportsIndividualPlans === 'undefined'
            || gate.supportsIndividualPlans)));

        // if this user has a discount, clear gateways that are not supported.
        const discountInfo = pro.propay.getDiscount();
        const testGateway = localStorage.testGateway;
        if (discountInfo) {
            tempGatewayOptions = tempGatewayOptions.filter(gate => {
                if (gate.supportsMultiDiscountCodes && gate.supportsMultiDiscountCodes === 1) {
                    return true;
                }
                return testGateway;
            });
        }

        gatewayOptions = tempGatewayOptions;

        // Filter out if they don't support expensive plans
        if (parseInt(pro.propay.planNum) !== 4) {
            gatewayOptions = gatewayOptions.filter((opt) => {
                return opt.supportsExpensivePlans !== 0;
            });
        }

        // Make a clone of the array so it can be modified
        pro.propay.allGateways = JSON.parse(JSON.stringify(gatewayOptions));

        // If mobile, filter out all gateways except the supported ones
        if (is_mobile) {
            pro.propay.allGateways = mobile.propay.filterPaymentProviderOptions(pro.propay.allGateways);
        }

        // Check if the API has some issue and not returning any gateways at all
        if (pro.propay.allGateways.length === 0) {
            console.error('No valid gateways returned from the API');
            msgDialog('warningb', '', l.no_payment_providers, '', () => {
                loadSubPage('pro');
            });
            return false;
        }

        // Separate into two groups, the first group has 6 providers, the second has the rest
        var primaryGatewayOptions = gatewayOptions.splice(0, 9);
        var secondaryGatewayOptions = gatewayOptions;

        // Show payment duration (e.g. month or year) and renewal option radio options
        pro.propay.renderPlanDurationOptions(discountInfo);
        pro.propay.initPlanDurationClickHandler();
        pro.propay.initRenewalOptionClickHandler(discountInfo);

        // Hide/show Argentian warning message depending on ipcc
        if (u_attr.ipcc === 'AR') {
            $('.argentina-only', pro.propay.$page).removeClass('hidden');
        }
        else {
            $('.argentina-only', pro.propay.$page).addClass('hidden');
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
        pro.propay.updateMainPrice(undefined, discountInfo);
        pro.propay.updateTextDependingOnRecurring();

        // Show the pricing box on the right (it is hidden while everything loads)
        $pricingBox.removeClass('loading');
    },

    /**
     * Renders the pro plan prices into the Plan Duration dropdown
     * @param {Object}  discountInfo    Discount info object if any
     */
    renderPlanDurationOptions: function(discountInfo) {
        'use strict';

        // Sort plan durations by lowest number of months first
        pro.propay.sortMembershipPlans();

        // Clear the radio options, in case they revisted the page
        $('.duration-options-list .payment-duration', this.$page).not('.template').remove();

        // Loop through the available plan durations for the current membership plan
        for (var i = 0, length = pro.membershipPlans.length; i < length; i++) {

            var currentPlan = pro.membershipPlans[i];

            // If match on the membership plan, display that pricing option in the dropdown
            if (currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === parseInt(pro.propay.planNum)) {

                // If this is a new multi discount code, follow rendering logic for that
                if (discountInfo && discountInfo.md && discountInfo.pd) {

                    // Calculate if the plan renews yearly (will renew yearly if it is a clean multiple of 12 months)
                    // e.g. 12, 24, 36. Mixed months e.g. 18 months, 32 months etc will renew monthly as per the API.
                    const discountMonths = discountInfo.m;
                    const willRenewYearly = discountMonths % 12 === 0;

                    // If the plan will renew yearly, and the current plan's number of months is 12 (yearly), then
                    // render the single option only. Or if the plan will renew monthly, and the current plan's number
                    // of months is 1, then also render. We want the plan index number (i) to be corresponding to the
                    // plan that will be used on renewal so correct renewal text is shown.
                    if (willRenewYearly && currentPlan[pro.UTQA_RES_INDEX_MONTHS] === 12 ||
                        !willRenewYearly && currentPlan[pro.UTQA_RES_INDEX_MONTHS] === 1) {
                        pro.propay.renderNewMutiDiscountRadio(discountInfo, currentPlan, i);
                        break;
                    }

                    // Try find the correct plan in the next loop iteration
                    continue;
                }

                // Get the price and number of months duration
                var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
                var price = currentPlan[pro.UTQA_RES_INDEX_PRICE];
                var currency = 'EUR';
                var discountedPriceY = '';
                var discountedPriceM = '';
                var discountSaveY = '';
                var discountSaveM = '';

                if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                    price = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                    currency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                    if (discountInfo && discountInfo.pd) {
                        const discountPerc = 1 - (discountInfo.pd / 100).toFixed(2);
                        if (numOfMonths === 12) {
                            discountedPriceY = (price * discountPerc).toFixed(2);
                            discountSaveY = (price - discountedPriceY).toFixed(2);
                        }
                        else if (numOfMonths === 1) {
                            discountedPriceM = (price * discountPerc).toFixed(2);
                            discountSaveM = (price - discountedPriceM).toFixed(2);
                        }
                    }
                }
                else if (discountInfo && (discountInfo.emp || discountInfo.eyp)) {
                    discountedPriceY = discountInfo.eyp || '';
                    discountedPriceM = discountInfo.emp || '';
                    discountSaveY = discountedPriceY ? (price - discountedPriceY).toFixed(2) : '';
                    discountSaveM = discountedPriceM ? (price - discountedPriceM).toFixed(2) : '';
                }

                if (discountInfo && discountInfo.m !== 0 && discountInfo.m !== numOfMonths) {
                    continue;
                }

                // Change wording depending on number of months
                var monthsWording = l[922];     // 1 month
                if (numOfMonths === 12) {
                    monthsWording = l[923];     // 1 year
                }
                else {
                    monthsWording = mega.icu.format(l[922], numOfMonths);  // x months
                }

                // Build select option
                const $durationOption = $('.payment-duration.template', this.$page).first().clone();

                // Update months and price
                $durationOption.removeClass('template');
                $durationOption.attr('data-plan-index', i);
                $durationOption.attr('data-plan-months', numOfMonths);
                $('.duration', $durationOption).text(monthsWording);
                $('.price', $durationOption).text(formatCurrency(price, currency));

                // Show amount they will save
                if (numOfMonths === 12) {
                    var discount;
                    if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                        discount = discountSaveY || currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCYSAVE];
                    }
                    else {
                        // Calculate the discount price (the current yearly price is 10 months worth)
                        var priceOneMonth = (price / 10);
                        var priceTenMonths = (priceOneMonth * 10);
                        var priceTwelveMonths = (priceOneMonth * 12);
                        discount = (priceTwelveMonths - priceTenMonths).toFixed(2);
                        if (discountSaveY) {
                            discount = discountSaveY;
                        }
                    }

                    $('.save-money', $durationOption).removeClass('hidden');
                    $('.save-money .amount', $durationOption).text(formatCurrency(discount, currency));
                    if (discountedPriceY) {
                        $('.oldPrice', $durationOption).text($('.price', $durationOption).text())
                            .removeClass('hidden');
                        $('.crossline', $durationOption).removeClass('hidden');
                        $('.price', $durationOption).text(formatCurrency(discountedPriceY, currency));
                        $('.membership-radio-label', $durationOption).addClass('discounted');
                    }
                }
                else if (numOfMonths === 1 && discountedPriceM) {
                    const savedAmount = formatCurrency(discountSaveM, currency);
                    const $saveContainer = $('.save-money', $durationOption).removeClass('hidden');

                    $('.amount', $saveContainer).text(savedAmount);
                    $('.oldPrice', $durationOption).text($('.price', $durationOption).text())
                        .removeClass('hidden');
                    $('.crossline', $durationOption).removeClass('hidden');
                    $('.price', $durationOption).text(formatCurrency(discountedPriceM, currency));
                    $('.membership-radio-label', $durationOption).addClass('discounted');
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

        const selectedPeriod = sessionStorage['pro.period'] || 12;
        let $selectedOption = $('.payment-duration[data-plan-months="'
            + selectedPeriod + '"]', '.duration-options-list');

        // Otherwise pre-select yearly payment
        if (!$selectedOption.length) {
            $selectedOption = $('.payment-duration:not(.template)', '.duration-options-list').last();
        }

        $('input', $selectedOption).prop('checked', true);
        $('.membership-radio', $selectedOption).addClass('checked');
        $('.membership-radio-label', $selectedOption).addClass('checked');
    },

    /**
     * Renders the single option for the new discount scheme which can be redeemed by multiple users
     * @param {Object} discountInfo The discount information cached from the 'dci' API request
     * @param {Array} currentPlan The current plan data
     * @param {Number} dataPlanIndex The array index of the plan in pro.membershipPlans
     */
    renderNewMutiDiscountRadio: function(discountInfo, currentPlan, dataPlanIndex) {

        'use strict';

        // Change wording depending on number of months
        const numOfMonths = discountInfo.m;
        const monthsWording = mega.icu.format(l[922], numOfMonths);

        let currencyCode = 'EUR';
        let discountedTotalPrice = discountInfo.edtp;   // Euro Discounted Total Price
        let discountAmount = discountInfo.eda;          // Euro Discount Amount

        // Get local amounts if applicable
        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            currencyCode = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
            discountedTotalPrice = discountInfo.ldtp;   // Local Discounted Total Price
            discountAmount = discountInfo.lda;          // Local Discount Amount
        }

        // Format for webclient styled currency
        const formattedDiscountAmount = formatCurrency(discountAmount, currencyCode);
        const formattedDiscountedTotalPrice = formatCurrency(discountedTotalPrice, currencyCode);

        // Build select option
        const $durationOption = $('.payment-duration.template', this.$page).first().clone();
        const $saveContainer = $('.save-money', $durationOption).removeClass('hidden');

        // Update months and price
        $durationOption.removeClass('template');
        $durationOption.attr('data-plan-index', dataPlanIndex);
        $durationOption.attr('data-plan-months', numOfMonths);
        $('.amount', $saveContainer).text(formattedDiscountAmount);
        $('.duration', $durationOption).text(monthsWording);
        $('.price', $durationOption).text(formattedDiscountedTotalPrice);

        // Update the list of duration options
        $durationOption.appendTo('.duration-options-list');
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
            if ($this.hasClass('disabled')) {
                return;
            }
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
     * @param {Number} planIndex    The array index of the plan in pro.membershipPlans
     * @param {Object} discountInfo Discount info object if any
     */
    updateMainPrice: function(planIndex, discountInfo) {
        'use strict';
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

        // Get the current plan price
        var localCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
        var euroPrice = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_PRICE]);

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
        const $pricingBox = $('.pricing-page.plan', this.$page);
        const $planName = $('.plan-title', $pricingBox);
        const $priceNum = $('.plan-price .price', $pricingBox);
        const $pricePeriod = $('.plan-period', $pricingBox);
        const $storageAmount = $('.plan-feature.storage', $pricingBox);
        const $storageTip = $('i', $storageAmount);
        const $bandwidthAmount = $('.plan-feature.transfer', $pricingBox);
        const $bandwidthTip = $('i', $bandwidthAmount);
        const $euroPrice = $('.euro-price', $pricingBox);
        const $currncyAbbrev = $('.plan-currency', $pricingBox);

        var localPrice;

        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            this.$page.addClass('local-currency');
            $currncyAbbrev.text(localCurrency);
            $euroPrice.text(euroPrice);
            localPrice = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE], localCurrency, 'narrowSymbol');
            $('.local-currency-tip', this.$page).removeClass('hidden');
        }
        else {
            this.$page.removeClass('local-currency');
            $('.local-currency-tip', this.$page).addClass('hidden');
        }

        // If mobile, name at the top
        if (is_mobile) {
            const $mobilePlanName = $('.payment-options .plan-name', this.$page);

            $mobilePlanName.text(pro.propay.planName);
        }

        // Update the style of the dialog to be Pro I-III or Lite, also change the plan name
        $pricingBox.addClass('pro' + pro.propay.planNum);
        $pricingBox.attr('data-payment', pro.propay.planNum);
        $planName.text(pro.propay.planName);

        // Default to svg sprite icon format icon-crests-pro-x-details
        let iconClass = `sprite-fm-uni icon-crests-pro-${pro.propay.planNum}-details`;

        // Special handling for PRO Lite (account level 4) and Pro Flexi (account level 101)
        if (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_LITE) {
            iconClass = 'icon-crests-lite-details';
        }
        else if (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            iconClass = 'icon-crests-pro-flexi-details';
        }

        // Add svg icon class (for desktop and mobile)
        $('.plan-icon', this.$page).addClass(iconClass);

        // Update the price of the plan and the /month or /year next to the price box
        // work for local currency if present
        if (localPrice) {
            $priceNum.text(localPrice);
        }
        else {
            $priceNum.text(euroPrice);
        }
        $pricePeriod.text('/' + monthOrYearWording);

        // Update storage
        if ($storageTip && $storageTip.attr('data-simpletip')) {
            $('span span', $storageAmount).text(storageValue);
            $storageTip.attr('data-simpletip', l[23807].replace('%1', '[U]' + storageValue + '[/U]'));
        }

        // Update bandwidth
        if ($bandwidthTip && $bandwidthTip.data('simpletip')) {
            $('span span', $bandwidthAmount).text(bandwidthValue);
            $bandwidthTip.attr('data-simpletip', bandwidthText.replace('%1', '[U]' + bandwidthValue + '[/U]'));
        }

        discountInfo = discountInfo || pro.propay.getDiscount();

        // Handle new multi-use discounts
        if (discountInfo && discountInfo.md && discountInfo.pd && discountInfo.al === pro.propay.planNum) {
            const $discountHeader = $('.payment-page.discount-header', this.$page);

            $('.discount-header-text', $discountHeader)
                .text(l[24670].replace('$1', formatPercentage(discountInfo.pd / 100)));
            $discountHeader.removeClass('hidden');

            let currency = 'EUR';
            const euroDiscountedTotalPrice = formatCurrency(discountInfo.edtp); // Euro Discounted Total Price
            let discountedTotalPrice = discountInfo.edtp;       // Euro Discounted Total Price
            let normalTotalPrice = discountInfo.etp;            // Euro Total Price (undiscounted)

            // Get local amounts if applicable
            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                currency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                discountedTotalPrice = discountInfo.ldtp;   // Local Discounted Total Price
                normalTotalPrice = discountInfo.ltp;        // Local Total Price (undiscounted)
            }

            // Format for webclient styled currency
            const formattedDiscountedTotalPrice = formatCurrency(discountedTotalPrice, currency);
            const formattedNormalTotalPrice = formatCurrency(normalTotalPrice, currency);

            // Only show Euro price if there is a local price shown (no point showing Euro price in 2 places)
            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                $('.euro-price', $pricingBox).text(euroDiscountedTotalPrice);
            }

            $('.old-plan-price', $pricingBox).text(formattedNormalTotalPrice).removeClass('hidden');
            $('.cross-line', $pricingBox).removeClass('hidden');
            $('.plan-period', $pricingBox).addClass('hidden');
            $priceNum.parent('.pricing-page.plan-price').addClass('discounted');
            $priceNum.text(formattedDiscountedTotalPrice);
        }

        // Handle old style discounts
        else if (discountInfo && discountInfo.al && discountInfo.pd && discountInfo.al === pro.propay.planNum) {
            const $discountHeader = $('.payment-page.discount-header', this.$page);

            $('.discount-header-text', $discountHeader)
                .text(l[24670].replace('$1', formatPercentage(discountInfo.pd / 100)));
            $discountHeader.removeClass('hidden');

            const oldPriceText = $priceNum.text();
            let newPriceText = oldPriceText;
            const oldEuroText = $euroPrice.text();
            let newEuroText = oldEuroText;
            let localDiscountPrice = '';

            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                const discountPerc = 1 - (discountInfo.pd / 100).toFixed(2);
                localDiscountPrice = (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE] * discountPerc).toFixed(2);
                localDiscountPrice = formatCurrency(localDiscountPrice, localCurrency);
            }

            if (numOfMonths === 1) {
                const euroFormatted = discountInfo.emp ? formatCurrency(discountInfo.emp) : '';
                newPriceText = localDiscountPrice || euroFormatted || oldPriceText;
                newEuroText = euroFormatted || oldEuroText;
            }
            else {
                const euroFormatted = discountInfo.eyp ? formatCurrency(discountInfo.eyp) : '';
                newPriceText = localDiscountPrice || euroFormatted || oldPriceText;
                newEuroText = euroFormatted || oldEuroText;
            }

            $('.old-plan-price', $pricingBox).text(oldPriceText).removeClass('hidden');
            $('.cross-line', $pricingBox).removeClass('hidden');
            $priceNum.text(newPriceText).parent('.pricing-page.plan-price').addClass('discounted');
            $euroPrice.text(newEuroText);
        }
    },

    /**
     * Updates the text on the page depending on the payment option they've selected and
     * the duration/period so it is accurate for a recurring subscription or one off payment.
     */
    updateTextDependingOnRecurring: function() {

        'use strict';

        if (pro.propay.allGateways.length === 0) {
            return false;
        }

        var $paymentDialog = $('.payment-dialog', 'body');
        var $paymentAddressDialog = $('.payment-address-dialog', 'body');
        var $numbers;

        // Update whether this selected option is recurring or one-time
        const $selectDurationOption = $('.duration-options-list .membership-radio.checked', this.$page);
        const selectedGatewayName = $('.payment-options-list input:checked', this.$page).val();
        const selectedProvider = pro.propay.allGateways.filter(val => {
            return (val.gatewayName === selectedGatewayName);
        })[0];

        // Set text to subscribe or purchase
        var planIndex = $selectDurationOption.parent().attr('data-plan-index');
        var currentPlan = pro.membershipPlans[planIndex];
        var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
        var price = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_PRICE]);
        var localPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];

        if (localPrice) {
            price = formatCurrency(localPrice, currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]) + '*';
        }

        // Get the value for whether the user wants the plan to renew automatically
        let recurringEnabled = false;
        const autoRenewCheckedValue = $('.renewal-options-list input:checked', this.$page).val();

        // If the provider supports recurring payments and the user wants the plan to renew automatically
        if (selectedProvider.supportsRecurring && (autoRenewCheckedValue === 'yes')) {
            recurringEnabled = true;
        }

        // Set text
        var subscribeOrPurchase = (recurringEnabled) ? l[23675] : l[6190];
        var subscribeOrPurchaseInstruction = (recurringEnabled) ? l[22074] : l[7996];
        var recurringOrNonRecurring = (recurringEnabled) ? '(' + l[6965] + ')' : l[6941];
        var recurringMonthlyOrAnnuallyMessage = (numOfMonths === 1) ? l[10628] : l[10629];
        var autoRenewMonthOrYearQuestion = (numOfMonths === 1) ? l[10638] : l[10639];
        var chargeInfoDuration = l[10642].replace('%1', price);

        // Find the pricing period in the pricing box and the plan duration options
        const $sidePanelPeriod = $('.pricing-page.plan .period', this.$page);
        const discountInfo = pro.propay.getDiscount();

        // Otherwise if new multi-use discount code
        if (discountInfo && discountInfo.md) {

            // If it's a compulsory subscription after the discount offer ends, show text "You will be
            // charged the normal plan price of 0.00 after the first month when the subscription renews.
            if (discountInfo.cs || recurringEnabled) {
                chargeInfoDuration = pro.propay.getDiscountRecurringWording(currentPlan, discountInfo);
            }
            else {
                let discountedTotalPrice = formatCurrency(mega.discountInfo.edtp);    // Euro Discounted Total Price
                const perMonthLocalPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];

                // Get the local discounted per month price and discounted total price
                if (perMonthLocalPrice) {
                    const localCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

                    // Get the Local Discounted Total Price and add * on the end (links to note about billed in Euros)
                    discountedTotalPrice = mega.discountInfo.ldtp;
                    discountedTotalPrice = formatCurrency(discountedTotalPrice, localCurrency, 'narrowSymbol', false);
                    discountedTotalPrice += '*';
                }

                // Set text "You will be charged x.xx one time."
                chargeInfoDuration = l[10642].replace('%1', discountedTotalPrice);
            }
        }

        // Change the charge information below the recurring yes/no question
        else if ((recurringEnabled) && (numOfMonths === 1)) {
            chargeInfoDuration = l[10640].replace('%1', price);     // You will be charged 0.00 monthly.
            if (discountInfo && (discountInfo.lmp || discountInfo.emp)) {

                // You will be charged the normal plan price of 0.00 after the first month when the subscription renews.
                chargeInfoDuration = l[24699].replace('%1', price);
            }
        }
        else if ((recurringEnabled) && (numOfMonths === 12)) {
            chargeInfoDuration = l[10641].replace('%1', price);     // You will be charged 0.00 annually.
            if (discountInfo && (discountInfo.lyp || discountInfo.eyp)) {

                // You will be charged the full plan price of 0.00 after the first year when the subscription renews.
                chargeInfoDuration = l[24698].replace('%1', price);
            }
        }
        else if (discountInfo && (discountInfo.lmp || discountInfo.emp) && !recurringEnabled && numOfMonths === 1) {

            // You will be charged 0.00 one time.
            chargeInfoDuration = l[10642]
                .replace('%1', (discountInfo.lmp ? discountInfo.lmp + '*' : discountInfo.emp));
        }
        else if (discountInfo && (discountInfo.lyp || discountInfo.eyp) && !recurringEnabled && numOfMonths === 12) {

            // You will be charged 0.00 one time.
            chargeInfoDuration = l[10642]
                .replace('%1', (discountInfo.lyp ? discountInfo.lyp + '*' : discountInfo.eyp));
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
            $('.renewal-option', this.$page).removeClass('hidden');
        }
        else {
            // Otherwise it's a one off only provider, hide the extra information
            $('.renewal-option', this.$page).addClass('hidden');
        }

        $numbers = $('.number:visible', this.$page);

        // Reorder options numbering
        for (var i = 0, length = $numbers.length; i < length; i++) {
            $($numbers[i]).text(i + 1);
        }

        const $planTextStandard = $('.payment-plan-txt.js-plan-txt-normal', $paymentAddressDialog);
        const $planTextRecurringDiscount = $('.payment-plan-txt.js-plan-txt-discount', $paymentAddressDialog);
        const $noteDiscountRecurring = $('.payment-note-first.js-multi-discount-recurring', $paymentAddressDialog);
        const $noteStandardRecurring = $('.payment-note-first.recurring', $paymentAddressDialog);
        const $noteOneTime = $('.payment-note-first.one-time', $paymentAddressDialog);
        const $subscriptionInstructions = $('.subscription-instructions', this.$page);

        // By default, hide all address dialog notes
        $planTextStandard.add($planTextRecurringDiscount).addClass('hidden');
        $noteDiscountRecurring.add($noteStandardRecurring).add($noteOneTime).addClass('hidden');

        // If there is a percent discount and if using the new multi-discount system
        if (mega.discountInfo && mega.discountInfo.pd && mega.discountInfo.md) {

            // If recurring subscription, update dialog text below the
            // Pro plan name, show only the recurring discount text
            if (recurringEnabled) {
                recurringOrNonRecurring = l.promotion_recurring_subscription_monthly;

                // If the number of months is cleanly divisible by 12 then it will renew yearly after the promo
                if (discountInfo.m % 12 === 0) {
                    recurringOrNonRecurring = l.promotion_recurring_subscription_yearly;
                }

                $noteDiscountRecurring.removeClass('hidden');
            }
            else {
                // Otherwise update text below the Pro plan name and show only the standard one-off payment text
                recurringOrNonRecurring = l.promotion_one_off_subscription_text;
                $noteOneTime.removeClass('hidden');
            }

            // Show the discount recurring/non-recurring text block below the Pro plan name
            $planTextRecurringDiscount.removeClass('hidden').text(recurringOrNonRecurring);
        }
        else {
            // If recurring subscription is chosen, show only the standard recurring text in the dialog
            if (recurringEnabled) {
                $noteStandardRecurring.removeClass('hidden');
                $('.duration', $noteStandardRecurring).text(recurringMonthlyOrAnnuallyMessage);
            }
            else {
                // Show only the standard one-off payment text
                $noteOneTime.removeClass('hidden');
            }

            // Show the standard 1 month/year (recurring/non-recurring) text block below the Pro plan name
            $planTextStandard.removeClass('hidden');
            $('.recurring', $planTextStandard).text(recurringOrNonRecurring);
        }

        // If recurring, always show recurring info box above the Pro pay page Purchase button and init click handler
        if (recurringEnabled) {
            $subscriptionInstructions.removeClass('hidden');
        }
        else {
            // Otherwise hide it
            $subscriptionInstructions.addClass('hidden');
        }

        // If discount with compulsory subscription or Pro Flexi, hide the No option so it'll be forced recurring
        if ((discountInfo && discountInfo.cs) ||
            currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            $('.renewal-options-list .renewal-option', this.$page).last().addClass('hidden');
        }

        // Update depending on recurring or one off payment
        $('button.purchase span', this.$page).text(subscribeOrPurchase);
        $(is_mobile ? '.payment-info' : '.payment-instructions', this.$page).safeHTML(subscribeOrPurchaseInstruction);
        $('.choose-renewal .duration-text', this.$page).text(autoRenewMonthOrYearQuestion);
        $('.charge-information', this.$page).text(chargeInfoDuration);
        $('.payment-buy-now span', $paymentDialog).text(subscribeOrPurchase);
        $('.payment-buy-now span', $paymentAddressDialog).text(subscribeOrPurchase);
    },

    /**
     * Gets the recurring wording for the new multi-discount system, used in a few places
     * @param {Array} currentPlan The array from the 'utqa' response with the details of the selected Pro plan
     * @param {Object} discountInfo The discount information from the 'dci' response
     * @returns {String} Returns the wording for when the plan renews and at what monthly/yearly rate
     */
    getDiscountRecurringWording: function(currentPlan, discountInfo) {

        'use strict';

        const numOfMonths = discountInfo.m;

        // Default to monthly recurring subscription wording
        let monthsOrYears = numOfMonths;
        let discountRecurringText = l.promotion_recurring_info_text_monthly;

        // If the number of months is cleanly divisible by 12 the subscription will recur yearly after the promo
        if (numOfMonths % 12 === 0) {
            monthsOrYears = numOfMonths / 12;
            discountRecurringText = l.promotion_recurring_info_text_yearly;
        }

        // Default to Euros
        let price = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_PRICE]);

        // Get the local price if available
        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            const localPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
            const localCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

            // Get the Local Discounted Total Price and add * on the end (links to note about billed in Euros)
            price = formatCurrency(localPrice, localCurrency, 'narrowSymbol', false);
            price += '*';
        }

        // Set the date to current date e.g. 3 May 2022 (will be converted to local language wording/format)
        const date = new Date();
        date.setMonth(date.getMonth() + numOfMonths);

        // Get the selected Pro plan name
        const proPlanName = pro.getProPlanName(discountInfo.al);

        // Update text for "When the #-month/year promotion ends on 26 April, 2024 you will start a
        // recurring monthly/yearly subscription for Pro I of EUR9.99 and your card will be billed monthly/yearly."
        discountRecurringText = mega.icu.format(discountRecurringText, monthsOrYears);
        discountRecurringText = discountRecurringText.replace('%1', time2date(date.getTime() / 1000, 2));
        discountRecurringText = discountRecurringText.replace('%2', proPlanName);
        discountRecurringText = discountRecurringText.replace('%3', price);

        return discountRecurringText;
    },

    /**
     * Add click handler for the radio buttons which are used for selecting the plan/subscription duration
     */
    initRenewalOptionClickHandler: function(discountInfo) {

        'use strict';

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
            pro.propay.updateTextDependingOnRecurring(discountInfo);
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

        const svgicons = {
            visa: 'icon-visa-border',
            mastercard: 'icon-mastercard',
            'unionpay': 'icon-union-pay',
            'american express': 'icon-amex',
            jcb: 'icon-jcb',
        };

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

            // Add hidden class if this payment method is not supported for this plan
            if ((gatewayOpt.supportsExpensivePlans === 0) && (selectedPlanNum !== 4)) {
                $gateway.addClass('hidden');
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

            const iconkeys = Object.keys(svgicons);
            let iconkey;

            for (let i = iconkeys.length; i--;) {
                if (displayName.toLowerCase().includes(iconkeys[i])) {
                    iconkey = iconkeys[i];
                    break;
                }
            }

            if (iconkey) {
                $('.provider-icon', $gateway).addClass('svgicon')
                    .safeHTML(`<i class="sprite-fm-uni ${svgicons[iconkey]}"></i>`);
            }
            else {
                $('.provider-icon', $gateway).addClass(gatewayName);
            }
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
        var $option = (parseFloat(pro.propay.proBalance) > 0) ? $payOptions.first()
            : $payOptions.length > 1 ? $payOptions.eq(1) : $payOptions.eq(0);

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

            var $durOpt = $(durationOption);
            // Get the plan's number of months
            var planIndex = $durOpt.attr('data-plan-index');
            var currentPlan = pro.membershipPlans[planIndex];
            var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];

            $durOpt.removeClass('disabled');

            // If the currently selected payment option e.g. Wire transfer
            // doesn't support a 1 month payment hide the option
            if (((!selectedProvider.supportsMonthlyPayment) && (numOfMonths === 1)) ||
                ((!selectedProvider.supportsAnnualPayment) && (numOfMonths === 12))) {
                $durOpt.addClass('hidden');
            }
            else {
                // Show the option otherwise
                $durOpt.removeClass('hidden');
                if (selectedProvider.minimumEURAmountSupported &&
                    selectedProvider.minimumEURAmountSupported > currentPlan[pro.UTQA_RES_INDEX_PRICE]) {
                    $durOpt.addClass('disabled');
                }
            }
        });

        // Select the first remaining option or previously selected (if its not hidden)
        var $newDurationOption;
        var newPlanIndex;
        $newDurationOption = $('[data-plan-index=' + selectedPlanIndex + ']', $durationOptionsList);
        if ($newDurationOption.length && !$newDurationOption.hasClass('hidden') &&
            !$newDurationOption.hasClass('disabled')) {
            newPlanIndex = selectedPlanIndex;
        }
        else {
            $newDurationOption = $('.payment-duration:not(.template, .hidden, .disabled)', $durationOptionsList)
                .first();
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
        if (pro.propay.allGateways.length > 9) {

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
        const $selectedPaymentDuration = $('.duration-options-list .membership-radio.checked', this.$page);
        const $selectedPaymentGateway = $('.payment-options-list input:checked', this.$page);

        // Selected payment method and package
        var selectedPaymentGatewayName = $selectedPaymentGateway.val();
        var selectedProvider = pro.propay.allGateways.filter(function(val) {
            return (val.gatewayName === selectedPaymentGatewayName);
        })[0];

        // Get array index of the Pro package in the list of plans from the API
        var selectedProPackageIndex = $selectedPaymentDuration.parent().attr('data-plan-index');

        // Set the pro package (used in pro.propay.sendPurchaseToApi function)
        pro.propay.selectedProPackage = pro.membershipPlans[selectedProPackageIndex];

        // log button clicking
        delay('subscribe.plan', eventlog.bind(null, 99788));

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
            console.assert(pro.propay.proPaymentMethod, 'check this...invalid gateway');

            // For credit card we show the dialog first, then do the uts/utc calls
            if (pro.propay.proPaymentMethod === 'perfunctio') {
                cardDialog.init();
            }
            else if (String(pro.propay.proPaymentMethod).indexOf('ecp') === 0
                || String(pro.propay.proPaymentMethod).toLowerCase().indexOf('stripe') === 0) {

                if (pro.propay.userSubsGatewayId === 2 || pro.propay.userSubsGatewayId === 3) {
                    // Detect the user has subscribed to a Pro plan with Google Play or Apple store
                    // pop up the warning dialog but let the user proceed with an upgrade
                    msgDialog('warninga', '', l.warning_has_subs_with_3p, '', () => {
                        addressDialog.init();
                    });
                }
                else {
                    addressDialog.init();
                }
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
        const itemNum = pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_ITEMNUM];

        // Convert from boolean to integer for API
        var fromBandwidthDialog = ((Date.now() - parseInt(localStorage.seenOverQuotaDialog)) < 2 * 3600000) ? 1 : 0;
        var fromPreWarnBandwidthDialog = ((Date.now() - parseInt(localStorage.seenQuotaPreWarn)) < 2 * 36e5) ? 1 : 0;

        // uts = User Transaction Sale
        var utsRequest = {
            a:  'uts',
            it:  itemNum,
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
        if (localStorage.keycomplete) {
            delete localStorage.keycomplete;
        }

        // Add the discount information to the User Transaction Sale request
        if (mega.discountInfo && mega.discountInfo.dc) {
            utsRequest.dc = mega.discountInfo.dc;
        }

        const setValues = (extra, saleId) => {

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
                extra.name = astroPayDialog.fullName;
                extra.address = astroPayDialog.address;
                extra.city = astroPayDialog.city;
                extra.cpf = astroPayDialog.taxNumber;
            }

            // If Ecomprocessing, send extra details
            else if (pro.propay.proPaymentMethod.indexOf('ecp') === 0) {
                pro.lastPaymentProviderId = addressDialog.gatewayId;
                Object.assign(extra, addressDialog.extraDetails);
            }
            else if (pro.propay.proPaymentMethod.indexOf('sabadell') === 0) {
                pro.lastPaymentProviderId = sabadell.gatewayId; // 17

                // Get the value for whether the user wants the plan to renew automatically
                var autoRenewCheckedValue = $('.renewal-options-list input:checked', '.payment-section').val();

                // If the provider supports recurring payments and the user wants the plan to renew automatically
                extra.recurring = autoRenewCheckedValue === 'yes';
            }
            else if (pro.propay.proPaymentMethod.toLowerCase().indexOf('stripe') === 0) {
                Object.assign(extra, addressDialog.extraDetails);
                pro.lastPaymentProviderId = addressDialog.gatewayId_stripe;
            }

            return true;
        };

        // Setup the 'uts' API request
        api.screq(utsRequest)
            .then(({result: saleId}) => {

                // Extra gateway specific details for UTC call
                var extra = {};

                if (!setValues(extra, saleId)) {
                    return false;
                }

                // If saleId is already an array of sale IDs use that, otherwise add to an array
                const saleIdArray = Array.isArray(saleId) ? saleId : [saleId];

                // Complete the transaction
                let utcReqObj = {
                    a: 'utc',                       // User Transaction Complete
                    s: saleIdArray,                 // Array of Sale IDs
                    m: pro.lastPaymentProviderId,   // Gateway number
                    bq: fromBandwidthDialog,        // Log for bandwidth quota triggered
                    extra: extra                    // Extra information for the specific gateway
                };
                const discountInfo = pro.propay.getDiscount();
                if (discountInfo && discountInfo.dc) {
                    utcReqObj.dc = discountInfo.dc;
                }

                return api.screq(utcReqObj).then(({result}) => this.processUtcResults(result, saleId));
            })
            .catch((ex) => {
                // Default error is "Something went wrong. Try again later..."
                let errorMessage;

                // Handle specific discount errors
                if (ex === EEXPIRED) {
                    // The discount code has expired.
                    errorMessage = l[24675];
                }
                else if (ex === EEXIST) {
                    // This discount code has already been redeemed.
                    errorMessage = l[24678];
                }
                else if (ex === EOVERQUOTA && pro.lastPaymentProviderId === voucherDialog.gatewayId) {

                    // Insufficient balance, try again...
                    errorMessage = l[514];
                }
                else {
                    errorMessage = ex < 0 ? api_strerror(ex) : ex;
                }

                // Hide the loading overlay and show an error
                pro.propay.hideLoadingOverlay();

                tell(errorMessage);
            });
    },

    /**
     * Process results from the API User Transaction Complete call
     * @param {Object|Number} utcResult The results from the UTC call or a negative number on failure
     * @param {String}        saleId    The saleIds of the purchase.
     */
    processUtcResults: function(utcResult, saleId) {
        'use strict';

        // If the user is upgrading from free, set a flag to show the welcome dialog when the psts notification
        // arrives. Set this flag if the user is in the experiment, regardless of which variation they are in.
        // If the payment fails the welcome dialog will check if the user has a pro plan, and as such should still
        // work as expected.
        // Only set if user has not seen the welcome dialog before
        if ((u_attr['^!welDlg'] !== '0') && (typeof mega.flags.ab_wdns !== 'undefined')){
            mega.attr.set('welDlg', 1, -2, true);
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

            case addressDialog.gatewayId_stripe:
                addressDialog.processUtcResult(utcResult, true, saleId);
                break;
        }
    },

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
        if (pro.propay.$backgroundOverlay && pro.propay.$loadingOverlay) {
            pro.propay.$backgroundOverlay.addClass('hidden')
                .removeClass('payment-dialog-overlay');
            pro.propay.$loadingOverlay.addClass('hidden');
        }
    },

    /**
     * Gets the wording for the plan subscription duration in months or years.
     * This is used by a number of the payment provider dialogs.
     * @param {Number} numOfMonths The number of months
     * @returns {String} Returns the number of months e.g. '1 month', '1 year'
     */
    getNumOfMonthsWording: function(numOfMonths) {

        let monthsWording;
        // Change wording depending on number of months
        if (numOfMonths === 12) {
            monthsWording = l[923];     // 1 year
        }
        else {
            monthsWording = mega.icu.format(l[922], numOfMonths); // 1 month
        }

        return monthsWording;
    },

    /** This function to show the discount offer dialog if applies */
    showDiscountOffer: function() {
        'use strict';
        if (window.offerPopupTimer) {
            clearTimeout(window.offerPopupTimer);
        }
        if (is_mobile || typeof page !== 'string' || page.includes('propay')) {
            return;
        }

        if (u_attr && u_attr.mkt && Array.isArray(u_attr.mkt.dc) && u_attr.mkt.dc.length) {
            // if we have multiple offers, we have no preferences we will take the first one.
            const offer = u_attr.mkt.dc[0];

            // check if we previewed a popup in the past 20 hours
            let discountOffers = u_attr['^!discountoffers'] ? JSON.parse(u_attr['^!discountoffers']) : null;
            if (discountOffers && discountOffers[offer.dc]) {
                const timeDif = new Date().getTime() - discountOffers[offer.dc];
                if (timeDif < 72e6) {
                    if (timeDif > 0) {
                        window.offerPopupTimer = setTimeout(pro.propay.showDiscountOffer, 72e6 - timeDif + 10);
                    }
                    return;
                }
            }
            discountOffers = discountOffers || Object.create(null);

            if (offer.al && offer.pd && typeof offer.m !== 'undefined') {
                const $discountDlg = $('.mega-dialog.pro-discount', 'body');
                let title = l[24703];
                if (offer.m === 1) {
                    title = l[24702];
                }
                else if (offer.m === 12) {
                    title = l[24701];
                }
                title = title.replace('%1', offer.pd + '%').replace('%2', pro.getProPlanName(offer.al));
                $('.discount-title', $discountDlg).text(title);
                pro.loadMembershipPlans(() => {
                    const matchedPlan = pro.membershipPlans.find(plan => {
                        return plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === offer.al
                            && plan[pro.UTQA_RES_INDEX_MONTHS] === (offer.m || 12);
                    });
                    if (matchedPlan) {
                        const storageFormatted = numOfBytes(matchedPlan[pro.UTQA_RES_INDEX_STORAGE] * 1073741824, 0);
                        const desc = l[24704]
                            .replace('%1', Math.round(storageFormatted.size) + ' ' + storageFormatted.unit);
                        $('.discount-desc', $discountDlg).text(desc);

                        let discountPopupPref = new Date().getTime();
                        let reTrigger = true;

                        const storeViewTime = () => {
                            discountOffers[offer.dc] = discountPopupPref;
                            mega.attr.set('discountoffers', JSON.stringify(discountOffers), -2, true);
                        };

                        // binding events
                        $('button.js-close, .close-btn', $discountDlg).rebind('click.discount', (ev) => {
                            storeViewTime();
                            window.closeDialog();
                            if (reTrigger) {
                                window.offerPopupTimer = setTimeout(pro.propay.showDiscountOffer, 72e6);
                            }
                            mBroadcaster.sendMessage(
                                'trk:event',
                                'discountPopup',
                                'closed',
                                'btnUsed',
                                ev.currentTarget.className.indexOf('close-btn') > -1 ? 1 : 0);
                            mBroadcaster.sendMessage(
                                'trk:event',
                                'discountPopup',
                                'closed',
                                'notShowAgain',
                                reTrigger ? 0 : 1);
                        });

                        $('.get-btn', $discountDlg).rebind('click.discount', () => {
                            storeViewTime();
                            $discountDlg.addClass('hidden');
                            if (reTrigger) {
                                window.offerPopupTimer = setTimeout(pro.propay.showDiscountOffer, 72e6);
                            }
                            loadSubPage('discount' + offer.dc);
                            mBroadcaster.sendMessage(
                                'trk:event',
                                'discountPopup',
                                'requested',
                                'notShowAgain',
                                reTrigger ? 0 : 1);
                        });

                        $('.fm-picker-notagain.checkbox-block', $discountDlg).rebind('click.discount', () => {
                            const $check = $('.fm-picker-notagain.checkbox-block .checkdiv', $discountDlg);
                            if ($check.hasClass('checkboxOff')) {
                                $check.removeClass('checkboxOff').addClass('checkboxOn');
                                discountPopupPref = new Date(9999, 11, 30).getTime();
                                reTrigger = false;
                            }
                            else {
                                $check.addClass('checkboxOff').removeClass('checkboxOn');
                                discountPopupPref = new Date().getTime();
                                reTrigger = true;
                            }
                        });
                        M.safeShowDialog('discount-offer', $discountDlg, true);
                        mBroadcaster.sendMessage('trk:event', 'discountPopup', 'shown');
                    }
                });
            }
        }
    }
};
mBroadcaster.once('login2', () => {
    'use strict';
    delay('ShowDiscountOffer', pro.propay.showDiscountOffer, 5000);
});
