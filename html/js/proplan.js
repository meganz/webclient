/**
 * Functionality for the Pro page Step 1 where the user chooses their Pro plan.
 * If the user selects a plan but is not logged in, they are prompted to log in.
 */
pro.proplan = {

    /** The user's current plan data */
    planData: null,

    /** Business plan data */
    businessPlanData: null,

    /** The user's current storage in bytes */
    currentStorageBytes: 0,

    /** If the user had come from the home page, or wasn't logged in and the got booted back to Pro step 1 */
    previouslySelectedPlan: null,

    /** Discount API error codes. */
    discountErrors: {
        expired: -8,
        notFound: -9,
        diffUser: -11,
        isRedeemed: -12,
        tempUnavailable: -18
    },

    /**
     * Initialises the page and functionality
     */
    init: function() {
        "use strict";

        // if business sub-user is trying to get to Pro page redirect to home.
        if (u_attr && u_attr.b && (!u_attr.b.m || (u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_EXPIRED))) {
            loadSubPage('fm');
            return;
        }
        if (u_attr && u_attr.b && u_attr.b.m && pro.isExpiredOrInGracePeriod()) {
            loadSubPage('repay');
            return;
        }

        // Make sure Pro Flexi can't access the Pro page and redirect to the File Manager or Repay page
        if (u_attr && u_attr.pf && !pro.isExpiredOrInGracePeriod()) {
            loadSubPage('fm');
            return;
        }
        if (u_attr && u_attr.pf && pro.isExpiredOrInGracePeriod()) {
            loadSubPage('repay');
            return;
        }

        // Cache selectors
        var $body = $('body');
        var $stepOne = $('.pricing-section', $body);
        const $accountButton = $('.mega-button.account.individual-el', $stepOne);
        const $accountButtonLabel = $('span', $accountButton);
        const $freeButton = $(' .free-button', $stepOne);
        const $freeButtonLabel = $('span', $freeButton);

        // If selecting a plan after registration
        if (localStorage.keycomplete) {

            // Remove the flag so next page visit (or on refresh) they will go straight to Cloud Drive
            localStorage.removeItem('keycomplete');

            if (typeof u_attr.p === 'undefined') {

                // Show the Free plan
                $body.addClass('key');

                // Set "Get started for FREE" plans and bottom buttons label
                $accountButton.attr('href', '/fm');
                $accountButtonLabel.text(l[23960]);
                $freeButton.attr('href', '/fm');
                $freeButtonLabel.text(l[23960]);
            }
        }
        else if (typeof u_attr === 'undefined') {

            // Set "Get started for FREE" plans button label
            $freeButton.attr('href', '/register');
            $freeButtonLabel.text(l[23960]);

            // Set "Get started Now" bottom button label
            $accountButton.attr('href', '/register');
            $accountButtonLabel.text(l[24054]);
        }
        else {

            $body.addClass('pro');

            // Set "Cloud drive" plans and bottom buttons label
            $accountButton.attr('href', '/fm');
            $accountButtonLabel.text(l[164]);
            $freeButton.attr('href', '/fm');
            $freeButtonLabel.text(l[164]);
        }

        // Add click handlers for the pricing boxes
        this.initPricingBoxClickHandlers();

        // Add mouseover handlers for the pricing boxes
        this.initPlanHoverHandlers();

        // Load pricing data from the API
        this.loadPricingPlans();

        // Init plan slider controls
        this.initPlanSliderControls();

        // Init plan period radio buttons
        this.initPlanPeriodControls();

        // Init individual/business plans switcher
        this.initPlanControls();

        // Init compare slider
        this.initCompareSlider();

        // Init Get started for free button
        this.initGetFreeButton();

        // Init business plan tab events
        this.initBusinessPlanTabEvents();

        var prevWindowWidth = $(window).width();
        $(window).rebind('resize.proslider', function() {
            // Prevent Iphone url bar resizing trigger reinit.
            var currentWindowWidth = $(window).width();
            if (currentWindowWidth !== prevWindowWidth) {
                pro.proplan.initPlanSliderControls();
                prevWindowWidth = currentWindowWidth;
            }
        });

        if (window.nextPage === '1' && window.pickedPlan) {
            const $planDiv = $('.pricing-page.plan.main[data-payment=' + window.pickedPlan + ']', 'body');
            if ($planDiv.length) {
                $('.pricing-page.plan.main', 'body').removeClass('selected');
                $planDiv.addClass('selected');
                showRegisterDialog();
                delete window.nextPage;
                delete window.pickedPlan;
            }
        }
    },

    /**
     * Initialise the click handler for the desktop pricing boxes to continue straight to step two
     */
    initPricingBoxClickHandlers: function() {

        'use strict';

        var $planBlocks = $('.pricing-page.plans-block', 'body');
        var $purchaseButtons = $('.plan-button', $planBlocks);

        // Initialise click handler for all the plan blocks
        $purchaseButtons.rebind('click', function() {

            const $selectedPlan = $(this).closest('.plan');

            $('.plan', $planBlocks).removeClass('selected');
            $selectedPlan.addClass('selected');

            const planType = $selectedPlan.data('payment');

            if (typeof planType === 'number' && planType > 0 && planType <= 4) {
                // events log range from 99780 --> 99783
                // Pro1, Pro2, Pro3, Lite
                delay('pricing.plan', eventlog.bind(null, 99779 + planType));

                delay('pricing.plan', eventlog.bind(null, 99775 + planType));
            }

            // Continue to Step 2
            pro.proplan.continueToStepTwo($selectedPlan);
        });
    },

    /**
     * Initialise the click handler for the desktop pricing boxes to continue straight to step two
     */
    initPlanHoverHandlers: function() {

        'use strict';

        var $pricingPage =  $('.pricing-section', '.fmholder');
        var $planBlock = $('.pricing-page.plan.main', $pricingPage);
        var $planTag = $('.plan-tag-description', $pricingPage);

        // Initialise mouseover handler for all the plan blocks
        $planBlock.rebind('mouseenter.showprotag tap.showprotag', function() {

            var $this = $(this);

            if ($this.data('tag')) {

                // Set tag information
                $('span', $planTag).attr('class', 'pro' + $this.data('payment'))
                    .safeHTML($this.data('tag'));

                // pointer + tag has height of 40, when spacing between planblock and top of browser is < 40, causes bug
                if ($planBlock[0].getBoundingClientRect().top < 40) {
                    $planTag.css('width', $this.outerWidth()).addClass('visible').position({
                        of: $this,
                        my: 'center top',
                        at: 'center bottom-40'
                    });
                    $planTag.addClass('noafter');
                }
                else {
                    // Reposition the Tag
                    $planTag.css('width', $this.outerWidth()).addClass('visible').position({
                        of: $this,
                        my: 'center bottom',
                        at: 'center top-10'
                    });
                    $planTag.removeClass('noafter');
                }

                // Hide tag for mobile
                $(window).rebind('resize.hideprotag', function() {

                    $planBlock.trigger('mouseleave');
                });
            }
        });

        // Hide tag on mouseout
        $planBlock.rebind('mouseleave.hideprotag', function() {

            $planTag.removeClass('visible');
            $(window).unbind('resize.hideprotag');
        });
    },

    /**
     * Continues the flow to step two of the Pro payment process
     * @param {Object} $selectedPlan The selected Pro card container which has the data-payment attribute
     */
    continueToStepTwo: function($selectedPlan) {

        'use strict';

        var planNum = $selectedPlan.attr('data-payment');

        // If not logged in, show the login/register prompt
        if (!u_handle) {
            showSignupPromptDialog();
            return false;
        }

        // If they're ephemeral but awaiting email confirmation, still let them continue to choose a plan and pay
        else if (isEphemeral() && !localStorage.awaitingConfirmationAccount) {
            showRegisterDialog();
            return false;
        }

        // If they clicked the plan immediately after completing registration, set the flag so it can be logged
        if ($('body').hasClass('key')) {
            pro.propay.planChosenAfterRegistration = true;
        }

        // Load the Pro page step 2 where they can make payment
        loadSubPage('propay_' + planNum);
    },

    /**
     * Load the pricing plans
     */
    loadPricingPlans: function() {

        'use strict';

        // Show loading spinner because some stuff may not be rendered properly yet
        loadingDialog.show();

        // Hide the payment processing/transferring/loading overlay if click back from the payment page
        pro.propay.preloadAnimation();
        pro.propay.hideLoadingOverlay();

        /*
        * Hide the successful payment modal dialog of cardDialog, voucherDialog and redeem
        * if click back after making the payment successfully
        * */
        $('.payment-result.success', $(document.body)).addClass('hidden');

        // Load the membership plans
        pro.loadMembershipPlans(function() {

            // Render the plan details
            pro.proplan.populateMembershipPlans();

            // Check which plans are applicable or grey them out if not
            pro.proplan.checkApplicablePlans();

            // Close loading spinner
            loadingDialog.hide();
        });
    },

    /**
     * Pro page plans side scroll to elements.
     */
    initPlanSliderControls: function() {

        'use strict';

        // The box which gets scroll and contains all the child content.
        const $plansSection =  $('.plans-section', '.pricing-section');
        const $scrollBlock = $('.plans-wrap', $plansSection);
        const $row = $('.pricing-page.plans-row', $scrollBlock).first();
        const $slides =  $('.plan', $row);

        // Init default slider events for mobile
        bottompage.initSliderEvents($plansSection, $scrollBlock, $slides);

        // Init scroll event
        $scrollBlock.rebind('scroll.plansScrollEvent', () => {

            // Hide simple tip
            $('.pricing-sprite.i-icon', $scrollBlock).trigger('simpletipClose');

            // Hide plans tag
            $('.plan.main', $scrollBlock).trigger('mouseleave');
        });
    },

    /**
     * Pro page individual/business plans switcher
     */
    initPlanControls: function() {

        'use strict';

        var $stepOne = $('.pricing-section', 'body');
        var $switcherButton = $('.plans-switcher .button', $stepOne);
        var selectedSection;

        // Init Individual/Business buttons click
        $switcherButton.rebind('click.selectPlanType', function() {

            var $this = $(this);
            var selectedSection;

            // Set active state
            $switcherButton.removeClass('active');
            $this.addClass('active');

            // Show/hide necessary content blocks
            if ($this.is('.business')) {
                $('.individual-el', $stepOne).addClass('hidden');
                $('.business-el', $stepOne).removeClass('hidden');

                selectedSection = 'business';
            }
            else {
                $('.individual-el', $stepOne).removeClass('hidden');
                $('.business-el', $stepOne).addClass('hidden');

                selectedSection = 'individual';
            }

            sessionStorage.setItem('pro.subsection', selectedSection);
        });

        // Show previously selected plans type
        selectedSection = sessionStorage['pro.subsection'];

        if (selectedSection) {
            $switcherButton.filter('.' + selectedSection).trigger('click');
        }
    },

    /**
     * Pro page Monthly/Yearly price switcher
     */
    initPlanPeriodControls: function($dialog) {

        'use strict';

        var $stepOne = $($dialog ? $dialog : '.scroll-block');
        var $pricingBoxes = $('.plans-block .pricing-page.plan', $stepOne);
        var $pricePeriod = $('.plan-period', $pricingBoxes);
        var $radioButtons = $('.pricing-page.radio-buttons input', $stepOne);
        var $radioLabels = $('.pricing-page.radio-buttons .radio-txt', $stepOne);
        var $savePercs = $('.pricing-page.save-percs:visible', $stepOne);
        var $saveArrow = $('.save-green-arrow:visible', $stepOne);
        var savePercsReposition;

        if ($savePercs.length && $saveArrow.length) {

            // Set text to "save" block
            $savePercs.safeHTML(l[16649]);
            $('span', $savePercs).text(formatPercentage(0.16));

            savePercsReposition = function() {
                $savePercs.position({
                    of: $saveArrow,
                    my: 'left top',
                    at: 'right+1 top-13',
                    collision: 'fit none'
                });
            };

            // Reposition percs block
            savePercsReposition();
            $(window).rebind('resize.propercsreposition', savePercsReposition);
        }

        // Init monthly/yearly radio buttons value change
        $radioLabels.rebind('click', function(){
            $('input', $(this).prev()).trigger('click');
        });

        $radioButtons.rebind('change.changePeriod', function() {

            var value = $(this).val();
            var monthOrYearWording;

            // Set Off states to all buttons
            $radioButtons.removeClass('radioOn').addClass('radioOff');
            $radioButtons.parent().removeClass('radioOn').addClass('radioOff');

            // Set On state for checked  button
            if (this.checked) {
                $(this).removeClass('radioOff').addClass('radioOn');
                $(this).parent().removeClass('radioOff').addClass('radioOn');
            }

            // Set monthly/yearly wording variable
            if (value === '12') {
                monthOrYearWording = l[932];
            }
            else {
                monthOrYearWording = l[931];
            }

            // Updte price and transfer values
            pro.proplan.updateEachPriceBlock('P', $pricingBoxes, $dialog, parseInt(value));

            // Update the plan period text
            $pricePeriod.text('/' + monthOrYearWording);
        });

        // Set monthly prices by default
        $radioButtons.filter('input[value="1"]').trigger('click');
    },

    /**
     * Pro page compare slider
     */
    initCompareSlider: function() {

        'use strict';

        var $stepOne = $('.pricing-section', 'body');
        var $sliderWrap = $('.pricing-page.slider-wrap', $stepOne);
        var $slider = $('.pricing-page.slider', $sliderWrap);
        var $resultWarpper = $('.pricing-page.compare-block', $stepOne);
        var $resultBlocks = $('.compare-cell', $resultWarpper);
        var $resultTip = $('.pricing-page.compare-tip .tip', $stepOne);
        var $dots = $('.slider-dot', $sliderWrap);
        var compareDetails = [];

        // Set current exchange tip value in USD
        $resultTip.text(l[24078].replace('%1', mega.intl.number.format('1.17')));

        // Set compare slider labels
        $dots.get().forEach(function(e) {

            var $this = $(e);
            var $label = $('.label', $this);
            var storageValue = $label.data('storage');

            // Set storage value labels
            if (storageValue) {

                $label.safeHTML(l[23789].replace('%1', '<span>' + bytesToSize(storageValue) + '</span>'));
            }
            // Set Free Storage label
            else {

                $label.safeHTML(l[24099]);
            }
        });

        // Set compare MEGA/GoogleDrive/Dropbox data for FREE/2TB/8TB/16TB plans.

        const gb = 1024 * 1024 * 1024;
        const tb = gb * 1024;

        compareDetails = [
            [
                ['', bytesToSize(20 * gb), '', l[16362]],
                ['', bytesToSize(2 * gb), '' , l[24075]],
                ['', bytesToSize(15 * gb), '', l[24076]]
            ],
            [
                [bytesToSize(2 * tb), '9.99', 'EUR', l[23818].replace('%1', l[5819])],
                [bytesToSize(2 * tb), '10.27', 'EUR', l[23947]],
                [bytesToSize(2 * tb), '9.99', 'EUR', l[23818].replace('%1', bytesToSize(2 * tb))]
            ],
            [
                [bytesToSize(8 * tb), '19.99', 'EUR', l[23818].replace('%1', l[6125])],
                [bytesToSize(8 * tb), '', '', ''],
                [bytesToSize(8 * tb), '', '', '']
            ],
            [
                [bytesToSize(16 * tb), '29.99', 'EUR', l[23818].replace('%1', l[6126])],
                [bytesToSize(16 * tb), '', '', ''],
                [bytesToSize(16 * tb), '', '', '']
            ]
        ];

        // Init compare slider
        $slider.slider({

            min: 1, max: 4, range: 'min',
            change: function(e, ui) {

                var value = ui.value;

                // Set  selected slide data
                $resultWarpper.attr('class', 'pricing-page compare-block slide' + value);

                const $freeBlock = $($resultBlocks[0]);

                if (value === 1) {
                    $freeBlock.addClass('free');
                }
                else {
                    $freeBlock.removeClass('free');
                }

                // Change compare MEGA/GoogleDrive/Dropbox blocks data
                for (var i = 0, length = $resultBlocks.length; i < length; i++) {

                    var $resultBlock = $($resultBlocks[i]);
                    var $planInfoBlock = $('.compare-info', $resultBlock);
                    var planInfo = compareDetails[value - 1][i];

                    // Default block UI
                    $resultBlock.removeClass('not-supported');

                    // Set Storage value
                    $('.compare-storage', $resultBlock).text(planInfo[0]);

                    // Not supported UI if price is not set
                    if (!planInfo[1]) {
                        $resultBlock.addClass('not-supported');

                        continue;
                    }

                    // Set price and currency
                    $('.price', $resultBlock).safeHTML(value === 1 ? planInfo[1] :
                        formatCurrency(planInfo[1], planInfo[2])
                            .replace('\u20ac', '<span class="currency">\u20ac</span>'));

                    // Change plan tip
                    if (planInfo[3]) {
                        $planInfoBlock.text(planInfo[3]);
                    }
                }

                // Change compare MEGA/GoogleDrive/Dropbox blocks data
                $dots.removeClass('active');

                for (var j = 0; j < value; j++) {
                    $($dots[j]).addClass('active');
                }
            },
            slide: function(e, ui) {

                var value = ui.value;

                // Change compare MEGA/GoogleDrive/Dropbox blocks data
                $dots.removeClass('active');

                for (var j = 0; j < value; j++) {
                    $($dots[j]).addClass('active');
                }
            }
        });

        // Set 50GB plan as default
        $slider.slider('value', 3);

        // Init slider dots click
        $dots.rebind('click', function() {
            $('.pricing-page.slider').slider('value', $(this).data('val'));
        });
    },

    /**
     * Pro page Get started for Free button
     */
    initGetFreeButton: function() {

        'use strict';

        const $stepOne = $('.pricing-section', 'body');
        const $getFreeButton = $('.free-button', $stepOne);
        const $getStartedNow = $('#get-started-btn', $stepOne);

        onIdle(() => {
            // ugh, a race with clickURL
            $getStartedNow.rebind('click.log', () => {
                eventlog(99785);
            });
        });

        // Init button click
        $getFreeButton.rebind('click', () => {

            delay('pricing.plan', eventlog.bind(null, 99784));

            if (typeof u_attr === 'undefined') {
                loadSubPage('register');

                return false;
            }

            // If coming from the process key step and they click on the Free button
            loadSubPage('fm');

            if (localStorage.gotOverquotaWithAchievements) {
                onIdle(() => {
                    mega.achievem.achievementsListDialog();
                });
                delete localStorage.gotOverquotaWithAchievements;
            }
        });
    },

    /**
     * Get current and next plan data if user logged in
     * @param {Object} $pricingBoxes Pro cards blocks
     */
    updateCurrentPlanData: function($pricingBoxes) {
        "use strict";

        // If user is logged in get curent/next plan info
        if (u_type === 3) {

            // If account data does not exist then or it was changed
            if (!pro.proplan.planData || pro.proplan.planData.utype !== u_attr.p
                || (pro.proplan.planData.srenew && M.account && M.account.stype !== 'S')) {

                // Get user quota information, the flag 'strg: 1' includes current account storage in the response
                api_req({ a: 'uq', strg: 1, pro: 1 }, {
                    callback : function(result) {

                        // Store current account storage usage for checking later
                        pro.proplan.currentStorageBytes = result.cstrg;

                        // Save plan data
                        pro.proplan.planData = result;

                        // Process next and current plan data and display tag on top of the plan
                        pro.proplan.processCurrentAndNextPlan(result, $pricingBoxes);
                    }
                });
            }
            else {

                // Process next and current plan data and display tag on top of the plan
                pro.proplan.processCurrentAndNextPlan(pro.proplan.planData, $pricingBoxes);
            }
        }
    },

    /**
     * Update each pricing block with details from the API
     */
    updateEachPriceBlock: function(pageType, $pricingBoxes, $dialog, period) {
        "use strict";

        var euroSign = '\u20ac';
        var oneLocalPriceFound = false;
        var zeroPrice;
        var classType = 1;
        var intl = mega.intl.number;

        // If user is logged in get curent/next plan info
        pro.proplan.updateCurrentPlanData($pricingBoxes);

        // Save selected payment period
        sessionStorage.setItem('pro.period', period);

        for (var i = 0, length = pro.membershipPlans.length; i < length; i++) {

            // Get plan details
            var currentPlan = pro.membershipPlans[i];
            var months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
            var planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            var planName = pro.getProPlanName(planNum);
            var priceIndex = pro.UTQA_RES_INDEX_MONTHLYBASEPRICE;

            // Skip if data differs from selected period
            if (months !== period) {
                continue;
            }
            // Set yearly variable index
            else if (months === 12) {
                priceIndex = pro.UTQA_RES_INDEX_PRICE;
            }

            var $pricingBox = $pricingBoxes.filter('.pro' + planNum);
            var $price = $('.plan-price .price', $pricingBox);
            var $euroPrice = $('.pricing-page.euro-price', $pricingBox);
            var $currncyAbbrev = $('.pricing-page.plan-currency', $pricingBoxes);
            var $planName = $('.pricing-page.plan-title', $pricingBox);
            var $planButton = $('.pricing-page.plan-button', $pricingBox);
            var basePrice;
            var baseCurrency;
            $pricingBox.removeClass('hidden');

            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {

                // Calculate the base price in local currency
                basePrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                baseCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

                $currncyAbbrev.text(baseCurrency);
                $euroPrice.text(formatCurrency(currentPlan[priceIndex]));

                if (pageType === "P") {
                    oneLocalPriceFound = true;
                }

                // Set localCurrency indicator
                if ($dialog) {
                    $dialog.addClass('local-currency');
                }
            }
            else {
                // Calculate the base price
                basePrice = currentPlan[pro.UTQA_RES_INDEX_PRICE];
                baseCurrency = 'EUR';
            }

            // Calculate the monthly base price
            var storageGigabytes = currentPlan[pro.UTQA_RES_INDEX_STORAGE];
            var storageBytes = storageGigabytes * 1024 * 1024 * 1024;
            var storageFormatted = numOfBytes(storageBytes, 0);
            var storageSizeRounded = Math.round(storageFormatted.size);
            var storageValue;

            var bandwidthGigabytes = currentPlan[pro.UTQA_RES_INDEX_TRANSFER];
            var bandwidthBytes = bandwidthGigabytes * 1024 * 1024 * 1024;
            var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
            var bandwidthSizeRounded = Math.round(bandwidthFormatted.size);
            var bandwidthValue;

            // Update the plan name
            $planName.text(planName);

            // Update the button label plan name if plan is not a current one
            if (!$pricingBox.first().is('.current')) {
                $planButton.first().text(l[23776].replace('%1', planName));
            }

            $price.text(formatCurrency(basePrice, baseCurrency, 'narrowSymbol'));

            // Get storage
            storageValue = storageSizeRounded + ' ' + storageFormatted.unit;

            // Get bandwidth
            bandwidthValue = bandwidthSizeRounded + ' ' + bandwidthFormatted.unit;

            // Update storage and bandwidth data
            pro.proplan.updatePlanData($pricingBox, storageValue, bandwidthValue, period);
        }

        return pageType === "P" ? [oneLocalPriceFound] : classType;
    },

    /**
     * Update Storage and bandwidth data in plaan card
     */
    updatePlanData: function($pricingBox, storageValue, bandwidthValue, period) {

        "use strict";

        var $storageAmount = $('.plan-feature.storage', $pricingBox);
        var $storageTip = $('i', $storageAmount);
        var $bandwidthAmount = $('.plan-feature.transfer', $pricingBox);
        var $bandwidthTip = $('i', $bandwidthAmount);
        var bandwidthText = period === 1 ? l[23808] : l[24065];

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
    },

    /**
     * Populate the monthly plans across the main /pro page
     */
    populateMembershipPlans: function() {

        "use strict";

        const $stepOne = $('.plans-section', 'body');
        const $pricingBoxes = $('.pricing-page.plan', $stepOne);
        const updateResults = pro.proplan.updateEachPriceBlock("P", $pricingBoxes, undefined, 1);

        if (updateResults[0]) {
            $stepOne.addClass('local-currency');
        }
        else {
            $stepOne.removeClass('local-currency');
        }
    },

    /**
     * Check applicable plans for the user based on their current storage usage
     */
    checkApplicablePlans: function() {

        // If their account storage is not available (e.g. not logged in) all plan options will be shown
        if (pro.proplan.currentStorageBytes === 0) {
            return false;
        }

        // Cache selectors
        var $stepOne = $('.pricing-section', 'body');
        var $pricingBoxes = $('.pricing-page.plan', $stepOne);
        var $noPlansSuitable = $('.no-plans-suitable',  $stepOne);
        var $currentStorageTerabytes = $('.current-storage .terabytes',  $noPlansSuitable);
        var $requestPlanButton = $('.btn-request-plan',  $noPlansSuitable);

        // Calculate storage in gigabytes
        var totalNumOfPlans = 4;
        var numOfPlansNotApplicable = 0;
        var currentStorageGigabytes = pro.proplan.currentStorageBytes / 1024 / 1024 / 1024;

        if (u_attr && u_attr.b) {

            // Show business plan
            $('.plans-switcher .button.business', $stepOne).trigger('click');
        }
        else {

            // Show individual plans
            $('.plans-switcher .button.individual', $stepOne).trigger('click');

            // Loop through membership plans
            for (var i = 0, length = pro.membershipPlans.length; i < length; i++) {

                // Get plan details
                var currentPlan = pro.membershipPlans[i];
                var proNum = parseInt(currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]);
                var planStorageGigabytes = parseInt(currentPlan[pro.UTQA_RES_INDEX_STORAGE]);
                var months = parseInt(currentPlan[pro.UTQA_RES_INDEX_MONTHS]);

                // If their current storage usage is more than the plan's grey it out
                if ((months !== 12) && (currentStorageGigabytes > planStorageGigabytes)) {

                    // Grey out the plan
                    $pricingBoxes.filter('.pro' + proNum).addClass('sub-optimal-plan');

                    // Add count of plans that aren't applicable
                    numOfPlansNotApplicable++;
                }
            }
        }

        // Show message to contact support
        if (numOfPlansNotApplicable === totalNumOfPlans) {

            // Get current usage in TB and round to 3 decimal places
            var currentStorageTerabytes = currentStorageGigabytes / 1024;
            currentStorageTerabytes = Math.round(currentStorageTerabytes * 1000) / 1000;
            currentStorageTerabytes = l[5816].replace('[X]', currentStorageTerabytes);

            // Show current storage usage and message
            $noPlansSuitable.removeClass('hidden');
            $currentStorageTerabytes.text(currentStorageTerabytes);

            clickURLs();

            // Redirect to #contact
            $requestPlanButton.rebind('click', function() {
                loadSubPage('contact');
            });
        }
    },

    /**
     * Processes a return URL from the payment provider in form of /payment-{providername}-{status} e.g.
     * /payment-ecp-success
     * /payment-ecp-failure
     * /payment-sabadell-success
     * /payment-sabadell-failure
     * /payment-astropay-pending
     * /payment-paysafecard-saleidXXX
     * @param {String} page The requested page from index.js e.g. payment-ecp-success etc
     */
    processReturnUrlFromProvider: function(page) {

        // Get the provider we are returning from and the status
        var pageParts = page.split('-');
        var provider = pageParts[1];
        var status = pageParts[2];

        var successPayText = l[19514];
        var $pendingOverlay = $('.payment-result.pending.alternate');


        // manipulate the texts if business account
        if (status === 'success' && pageParts && pageParts[3] === 'b') {
            successPayText = l[19809].replace('{0}', '1');
        }

        $pendingOverlay.find('.payment-result-txt').safeHTML(successPayText);

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
     * Processes current and next plan data from api response, and place tag(s) for it.
     *
     * @param {Object} data Api response data
     * @param {Object} $pricingBoxes Pro cards blocks
     */
    processCurrentAndNextPlan: function(data, $pricingBoxes) {

        'use strict';

        var $currPlan = $pricingBoxes.filter('[data-payment="' + data.utype + '"]').addClass('current');
        var currentExpireTimestamp;

        // Set "Current plan"button label
        $('.pricing-page.plan-button', $currPlan).text(l[20711]);

        // Current plan
        if (data.srenew) { // This is subscription plan

            var renewTimestamp = data.srenew[0];
            if (renewTimestamp === 0) {
                $currPlan.addClass('renew');
            }
            else {
                $currPlan.addClass('renew')
                    .data('tag', l[20759].replace('%1', time2date(renewTimestamp, 2)));
            }
        }
        else {
            currentExpireTimestamp = data.nextplan ? data.nextplan.t : data.suntil;
            $currPlan.data('tag', l[20713].replace('%1', time2date(currentExpireTimestamp, 2)));
        }

        // Next plan
        if (data.nextplan) {

            // Store next plan
            pro.proplan.nextPlan = data.nextplan;

            var $nextPlan = $pricingBoxes.filter('[data-payment="' + pro.proplan.nextPlan.p + '"]');

            $nextPlan.addClass('next');
            $nextPlan.data('tag', l[20714].replace('%1', time2date(pro.proplan.nextPlan.t, 2))
                .replace('%2', pro.getProPlanName(pro.proplan.nextPlan.p)));

            // Hide popular text on next plan
            $('.pro-popular-txt', $nextPlan).addClass('hidden');
        }

    },
    handleDiscount: function(page) {
        'use strict';
        mega.discountCode = page.substr(8);
        if (mega.discountCode.length < 15) {
            // it should be 22 length. but made 10 because i am not sure if len=22 is guaranteed
            delete mega.discountInfo;
            msgDialog('warninga', l[135], l[24676], false, () => {
                loadSubPage('pro');
            });
            return false;
        }
        if (!u_type) {
            login_txt = l[24673];
            login_next = 'discount' + mega.discountCode;
            return loadSubPage('login');
        }
        loadingDialog.show();
        delete mega.discountInfo;
        api.req({a: 'dci', dc: mega.discountCode}).then(({result: res}) => {
            loadingDialog.hide();
            if (res && res.al && res.pd) {
                DiscountPromo.storeDiscountInfo(res);
                return loadSubPage('propay_' + res.al);
            }
            msgDialog('warninga', l[135], l[24674], false, () => {
                loadSubPage('pro');
            });
        }).catch((ex) => {
            loadingDialog.hide();
            let errMsg = l[24674];
            if (ex === pro.proplan.discountErrors.expired) {
                errMsg = l[24675];
            }
            else if (ex === pro.proplan.discountErrors.notFound) {
                errMsg = l[24676];
            }
            else if (ex === pro.proplan.discountErrors.diffUser) {
                errMsg = l[24677];
            }
            else if (ex === pro.proplan.discountErrors.isRedeemed) {
                errMsg = l[24678];
            }
            else if (ex === pro.proplan.discountErrors.tempUnavailable) {
                errMsg = l[24764];
            }
            msgDialog('warninga', l[135], errMsg, false, () => {
                loadSubPage('pro');
            });
        });
        return false;
    },

    /**
     * Init business plan tab events, set plandata
     * @returns {void}
     */
    initBusinessPlanTabEvents: function() {

        'use strict';

        // Set business plan data (users/storage/stransfer/price)
        this.setBusinessPlanData();

        // Init quotes slider in business section.
        this.initQuotesSliderControls();
    },

    /**
     * Set business plan data (users/storage/stransfer/price)
     * @returns {void}
     */
    setBusinessPlanData: function() {

        'use strict';

        M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
            const business = new BusinessAccount();

            // eslint-disable-next-line complexity
            business.getBusinessPlanInfo(false).then((info) => {

                pro.proplan.businessPlanData = info;

                // If all new API values exist
                pro.proplan.businessPlanData.isValidBillingData = info.bd && info.bd.us
                    && (info.bd.us.p || info.bd.us.lp)
                    && info.bd.sto && (info.bd.sto.p || info.bd.sto.lp)
                    && info.bd.sto.s && info.bd.trns && (info.bd.trns.p || info.bd.trns.lp)
                    && info.bd.trns.t && info.bd.ba.s && info.bd.ba.t;

                // If local currency values exist
                pro.proplan.businessPlanData.isLocalInfoValid = info.l && info.l.lcs && info.l.lc
                    && info.bd.us.lp && info.bd.sto.lp && info.bd.trns.lp;

                pro.proplan.populateBusinessPlanData();
            });
        });
    },

    /**
     * Populate Business plan card data
     * @returns {void}
     */
    populateBusinessPlanData: function() {

        'use strict';

        const $stepOne = $('.pricing-section', '.fmholder');
        let $businessCard = $('.js-business-card', $stepOne);
        const pricePerUser = this.businessPlanData.bd && this.businessPlanData.bd.us && this.businessPlanData.bd.us.p;

        const $createBusinessBtn = $('#create-business-btn', $stepOne);
        const $tryBusinessBtn = $('#try-business-btn', $stepOne);

        onIdle(() => {
            // ugh, a race with clickURL
            $createBusinessBtn.rebind('click.log', () => {
                eventlog(99786);
            });
            $tryBusinessBtn.rebind('click.log', () => {
                eventlog(99787);
            });
        });

        // If new API values exist, populate new business card values
        if (this.businessPlanData.isValidBillingData) {

            const $storageInfo = $('.plan-feature.storage', $businessCard);
            const $transferInfo = $('.plan-feature.transfer', $businessCard);
            const minStorageValue = this.businessPlanData.bd.ba.s / 1024;
            const minTransferValue = this.businessPlanData.bd.ba.t / 1024;
            let storagePrice = 0;
            let transferPrice = 0;

            // If local currency values exist
            if (this.businessPlanData.isLocalInfoValid) {
                storagePrice = formatCurrency(this.businessPlanData.bd.sto.lp, this.businessPlanData.l.lc) + '*';
                transferPrice = formatCurrency(this.businessPlanData.bd.trns.lp, this.businessPlanData.l.lc) + '*';
            }
            else {
                storagePrice = formatCurrency(this.businessPlanData.bd.sto.p);
                transferPrice = formatCurrency(this.businessPlanData.bd.trns.p);
            }

            // Set storage and transfer details, simpletip hint
            $('.js-main', $storageInfo).text(
                l.bsn_starting_storage.replace('%1', minStorageValue)
            );
            $('.js-addition', $storageInfo).text(
                l.bsn_additional_storage.replace('%1', storagePrice)
            );
            $('i', $storageInfo).attr(
                'data-simpletip', l.bsn_storage_tip.replace('%1', `${minStorageValue} ${l[20160]}`)
                    .replace('%2', storagePrice)
            );
            $('.js-main', $transferInfo).text(
                l.bsn_starting_transfer.replace('%1', minTransferValue)
            );
            $('.js-addition', $transferInfo).text(
                l.bsn_additional_transfer.replace('%1', transferPrice)
            );
            $('i', $transferInfo).attr(
                'data-simpletip', l.bsn_transfer_tip.replace('%1', `${minTransferValue} ${l[20160]}`)
                    .replace('%2', transferPrice)
            );

            // Init price calculator events, populate necessary plan data
            this.initBusinessPlanCalculator();

            // Show new Business plan card and calculator if new API is valid
            $('.business-el-new', $stepOne).removeClass('hidden');
            $('.business-el-old', $stepOne).addClass('hidden');
        }

        // Show old Business plan card, if new API is incorrect.
        // TODO: remove when new API is stable
        else {

            const storageAmount = this.businessPlanData.bd
                && this.businessPlanData.bd.ba && this.businessPlanData.bd.ba.s ?
                this.businessPlanData.bd.ba.s / 1024 : 15;

            $businessCard = $('.js-business-card-old', $stepOne);
            $('.plan-feature.storage-b span', $businessCard).safeHTML(
                l[23789].replace('%1', `<span>${storageAmount} ${l[20160]}</span>`)
            );

            $('.business-el-new', $stepOne).addClass('hidden');
            $('.business-el-old', $stepOne).removeClass('hidden');
        }

        // Set the plan main prices for both Old and New APIs
        if (this.businessPlanData.isLocalInfoValid) {

            $businessCard.addClass('local-currency');
            $('.plan-price .price', $businessCard).text(
                formatCurrency(this.businessPlanData.bd.us.lp, this.businessPlanData.l.lc, 'narrowSymbol'));
            $('.pricing-page.plan-currency', $businessCard).text(this.businessPlanData.l.lc);
            $('.pricing-page.euro-price', $businessCard).text(formatCurrency(pricePerUser));
        }
        else {

            $businessCard.removeClass('local-currency');
            $('.plan-price .price', $businessCard).text(formatCurrency(pricePerUser));
        }
    },

    /**
     * Init Business plan calculator events
     * @returns {void}
     */
    initBusinessPlanCalculator: function() {

        'use strict';

        const $stepOne = $('.pricing-section', '.fmholder');
        const $calculator = $('.business-calculator', $stepOne);
        const $usersSlider = $('.business-slider.users', $calculator);
        const $storageSlider = $('.business-slider.storage', $calculator);
        const $transferSlider = $('.business-slider.transfer', $calculator);
        const $totalPrice = $('.footer span', $calculator);
        const planInfo = this.businessPlanData;
        const minStorageValue = planInfo.bd.ba.s / 1024;
        const minTransferValue = planInfo.bd.ba.t / 1024;
        let userPrice = 0;
        let storagePrice = 0;
        let transferPrice = 0;
        let astrisk = '';

        // If local currency values exist
        if (planInfo.isLocalInfoValid) {
            userPrice = parseFloat(planInfo.bd.us.lp);
            storagePrice = parseFloat(planInfo.bd.sto.lp);
            transferPrice = parseFloat(planInfo.bd.trns.lp);
            astrisk = '*';
        }
        else {
            userPrice = parseFloat(planInfo.bd.us.p);
            storagePrice = parseFloat(planInfo.bd.sto.p);
            transferPrice = parseFloat(planInfo.bd.trns.p);
        }

        /**
         * Calculate Business plan price
         * @param {Number} usersValue Optional. Script will take calculator value if undefined
         * @param {Number} storageValue Optional. Script will take calculator value if undefined
         * @param{Number} transferValue Optional. Script will take calculator value if undefined
         * @returns {Number} Calculated price value
         */
        const calculatePrice = (usersValue, storageValue, transferValue) => {

            let totalPrice = 0;

            usersValue = usersValue || $usersSlider.attr('data-value');
            storageValue = storageValue || $storageSlider.attr('data-value');
            transferValue = transferValue || $transferSlider.attr('data-value');

            totalPrice = userPrice * usersValue
                + storagePrice * (storageValue - minStorageValue)
                + transferPrice * (transferValue - minTransferValue);

            return this.businessPlanData.isLocalInfoValid ?
                formatCurrency(totalPrice, this.businessPlanData.l.lc) : formatCurrency(totalPrice) + astrisk;
        };

        /**
         * Set users slider value
         * @param {Object} $handle jQ selecter on slider handle
         * @param {Number} value Selected slider value
         * @returns {void}
         */
        const setUsersSliderValue = ($handle, value) => {

            // Set the value in custom created span in the handle
            $('span', $handle).text(value);
            $handle.attr('data-value', value);

            // Calculate the price and set in total
            $totalPrice.text(calculatePrice());
        };

        /**
         * Set storage and transfer slider value
         * @param {Object} $handle jQ selecter on slider handle
         * @param {Number} value Selected slider value
         * @returns {void}
         */
        const setDataSlidersValue = ($handle, value) => {

            let result = 0;

            // Small trick which changes slider step if storage value > 1TB
            if (value <= 100) {
                $('span', $handle).text(`${value} ${l[20160]}`);
                result = value;
            }
            else if (value < 150) {
                result = Math.floor((value - 100) / 5) || 1;
                result *= 100;
                $('span', $handle).text(`${result} ${l[20160]}`);
            }
            else if (value === 150) {
                $('span', $handle).text(`1 ${l[23061]}`);
                result = 1000;
            }
            else if (value <= 200) {
                result = Math.floor((value - 150) / 5) || 1;
                $('span', $handle).text(`${result} ${l[23061]}`);
                result *= 1000;
            }

            // Set data attribute for futher calculations
            $handle.attr('data-value', result);

            // Calculate the price and set in total
            $totalPrice.text(calculatePrice());
        };

        // Init users/storage/transfer sliders at once
        $usersSlider.add($storageSlider).add($transferSlider).slider({
            range: 'min',
            step: 1,
            change: function(event, ui) {
                setUsersSliderValue($(this), ui.value);
            },
            slide: function(event, ui) {
                setUsersSliderValue($(this), ui.value);
            }
        });

        // Init Storage  and transfer sliders
        $storageSlider.add($transferSlider).slider({

            range: 'min',
            step: 1,
            change: function(event, ui) {
                setDataSlidersValue($(this), ui.value);
            },
            slide: function(event, ui) {
                setDataSlidersValue($(this), ui.value);
            }
        });

        // Set custom min/current values for each slider
        $usersSlider.slider({
            'min': planInfo.bd.minu,
            'max': 300,
            'value': planInfo.bd.minu
        });
        $storageSlider.slider({
            'min': minStorageValue,
            'max': 200,
            'value': minStorageValue
        });
        $transferSlider.slider({
            'min': minTransferValue,
            'max': 200,
            'value': minTransferValue
        });

        // Set "Most competitive price" values
        $('.pr1', $calculator).text(
            l.bsn_calc_monthly_price
                .replace('%1', `100 ${l[20160]}`)
                .replace('%2', calculatePrice(3, 97, 0))
        );
        $('.pr2', $calculator).text(
            l.bsn_calc_monthly_price
                .replace('%1', `1 ${l[23061]}`)
                .replace('%2',  calculatePrice(3, 997, 0))
        );

        // Set min values under each slider
        $('.js-min-users', $calculator).safeHTML(
            l.bsn_calc_min_users.replace('%1', planInfo.bd.minu)
        );
        $('.js-min-storage', $calculator).safeHTML(
            l.bsn_calc_min_storage.replace('%1', minStorageValue)
        );
        $('.js-min-transfer', $calculator).safeHTML(
            l.bsn_calc_min_transfer.replace('%1', minTransferValue)
        );
    },

    /**
     * Init quotes slider in business section.
     * @returns {void}
     */
    initQuotesSliderControls: function() {

        'use strict';

        // The box which gets scroll and contains all the child content.
        const $quotesSection = $('.business-q-wrap', '.pricing-section');
        const $scrollBlock = $('.business-quotes',  $quotesSection);
        const $slides =  $('.business-quote', $scrollBlock);

        // Init default slider events for mobile
        bottompage.initSliderEvents($quotesSection, $scrollBlock, $slides, true);
    }
};

/* jshint -W003 */  // Warning is not relevant

/**
 * The old Login / Register dialogs which are used if they are not logged in and try to go to Step 2.
 * @param {String} email An email address to be optionally pre-filled into the dialog
 * @param {String} password A password to be optionally pre-filled into the dialog
 */
function showLoginDialog(email, password) {
    'use strict';
    var $dialog = $('.pro-login-dialog');
    var $inputs = $('input', $dialog);
    var $button = $('.top-dialog-login-button', $dialog);
    $('aside', $dialog).addClass('hidden');

    var closeLoginDialog = function() {
        $('.fm-dialog-overlay').unbind('click.proDialog');
        $('button.js-close', $dialog).unbind('click.proDialog');
        closeDialog();
        return false;
    };

    M.safeShowDialog('pro-login-dialog', function() {

        // Init inputs events
        accountinputs.init($dialog);

        // controls
        $('button.js-close', $dialog).rebind('click.proDialog', closeLoginDialog);
        $('.fm-dialog-overlay').rebind('click.proDialog', closeLoginDialog);

        $('.input-email', $dialog).val(email || '');
        $('.input-password', $dialog).val(password || '');

        $('.top-login-forgot-pass', $dialog).rebind('click.forgetPass', function() {

            var email = document.getElementById('login-name3').value;

            if (isValidEmail(email)) {
                $.prefillEmail = email;
            }

            loadSubPage('recovery');
        });


        $inputs.rebind('keydown.loginreq', function(e) {
            if (e.keyCode === 13) {
                doProLogin($dialog);
            }
        });

        $button.rebind('click.loginreq', function() {
            doProLogin($dialog);
        });

        // eslint-disable-next-line sonarjs/no-identical-functions
        $button.rebind('keydown.loginreq', function(e) {
            if (e.keyCode === 13) {
                doProLogin($dialog);
            }
        });

        onIdle(clickURLs);
        return $dialog;
    });
}

var doProLogin = function($dialog) {

    loadingDialog.show();

    var $formWrapper = $dialog.find('form');
    var $emailInput = $dialog.find('input#login-name3');
    var $passwordInput = $dialog.find('input#login-password3');
    var $rememberMeCheckbox = $dialog.find('.login-check input');

    var email = $emailInput.val().trim();
    var password = $passwordInput.val();
    var rememberMe = $rememberMeCheckbox.is('.checkboxOn');  // ToDo check if correct
    var twoFactorPin = null;

    if (email === '' || !isValidEmail(email)) {
        $emailInput.megaInputsShowError(l[141]);
        $emailInput.val('').focus();
        loadingDialog.hide();

        return false;
    }
    else if (password === '') {
        $passwordInput.megaInputsShowError(l[1791]);
        loadingDialog.hide();

        return false;
    }

    // Checks if they have an old or new registration type, after this the flow will continue to login
    security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe, startOldProLogin, startNewProLogin);
};

/**
 * Starts the old login proceedure
 * @param {String} email The user's email address
 * @param {String} password The user's password as entered
 * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
 * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
 */
function startOldProLogin(email, password, pinCode, rememberMe) {
    'use strict';
    postLogin(email, password, pinCode, rememberMe).then(completeProLogin).catch(tell);
}

/**
 * Start the new login proceedure
 * @param {String} email The user's email addresss
 * @param {String} password The user's password as entered
 * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
 * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
 * @param {String} salt The user's salt as a Base64 URL encoded string
 */
function startNewProLogin(email, password, pinCode, rememberMe, salt) {

    'use strict';

    // Start the login using the new process
    security.login.startLogin(email, password, pinCode, rememberMe, salt, completeProLogin);
}

/**
 * Completes the login process
 * @param {Number} result The result from the API, e.g. a negative error num or the user type e.g. 3 for full user
 */
function completeProLogin(result) {
    'use strict';

    var $formWrapper = $('.pro-login-dialog form');
    var $emailField = $formWrapper.find('input#login-name3');
    var $passwordField = $formWrapper.find('input#login-password3');

    // Check and handle the common login errors
    if (security.login.checkForCommonErrors(result, startOldProLogin, startNewProLogin)) {
        return false;
    }

    // If successful result
    else if (result !== false && result >= 0) {
        passwordManager('#form_login_header');

        $emailField.val('').blur();
        $passwordField.val('').blur();

        u_type = result;

        if (page === "chat") {
            var chatHash = getSitePath().replace("/chat/", "").split("#")[0];
            megaChat.loginOrRegisterBeforeJoining(chatHash);
        }
        else {
            // If no value was set on the discount promo page, find the plan they clicked on
            // before the login/register prompt popped up. Otherwise use the discount plan number.
            const continuePlanNum = sessionStorage.getItem('discountPromoContinuePlanNum');
            const proNum = continuePlanNum === null ? pro.proplan2.selectedPlan ||
                $('.pricing-page.plan.selected').data('payment') : continuePlanNum;


            loadingDialog.show();

            // Load the Pro payment page (step 2) if the plan that the user is attempting
            // to purchase has enough storage quota for their currently stored data.
            M.getStorageQuota().then((storage) => {
                closeDialog();
                checkPlanStorage(storage.used, proNum).then((res) => {
                    loadingDialog.hide();
                    if (res) {
                        loadSubPage(`propay_${proNum}`);
                    }
                    else {
                        msgDialog('warninga', l[135],
                                  l.warn_head_not_enough_storage, l.warn_body_not_enough_storage, () => {
                                      loadSubPage('pro');
                                      pro.proplan2.initPage();
                                  });
                    }
                });
            });
        }
    }
    else {
        fm_showoverlay();
        $emailField.megaInputsShowError();
        $passwordField.megaInputsShowError(l[7431]);

        var $inputs = $emailField.add($passwordField);

        $inputs.rebind('input.hideBothError', function() {

            $emailField.megaInputsHideError();
            $passwordField.megaInputsHideError();

            $inputs.off('input.hideBothError');
        });
    }
}

async function checkPlanStorage(currentStored, planNum) {
    'use strict';

    // If the user is purchasing a Pro Flexi account, they will be able to get extra storage
    if (planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
        return true;
    }
    return pro.loadMembershipPlans().then(() => {
        const plan = pro.membershipPlans.find(plan => {
            return plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === planNum;
        });
        if (!plan) {
            return false;
        }
        return plan[pro.UTQA_RES_INDEX_STORAGE] * 1024 * 1024 * 1024 >= currentStored;
    });
}

function showRegisterDialog(aPromise) {
    'use strict';

    mega.ui.showRegisterDialog({
        title: l[5840],

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
                    security.register.cacheRegistrationData(registerData);
                }

                // If no value was set on the discount promo page, find the plan they clicked on
                // before the login/register prompt popped up. Otherwise use the discount plan number.
                const continuePlanNum = sessionStorage.getItem('discountPromoContinuePlanNum');
                var proNum = continuePlanNum === null ? pro.proplan2.selectedPlan ||
                    $('.pricing-page.plan.selected').data('payment') : continuePlanNum;

                // Load the Pro payment page (step 2) now that the account has been created
                loadSubPage('propay_' + proNum);
            }
            else {
                $('.mega-dialog.registration-page-success').removeClass('hidden');
                fm_showoverlay();
            }
        }
    }, aPromise);
}

// Flag to check if (not logged in) user has clicked Login / Register when selecting a pricing plan
var attemptingLoginOrRegister = false;

var signupPromptDialog = null;
var showSignupPromptDialog = function() {

    // If on mobile, show the mobile version
    if (is_mobile) {
        mobile.proSignupPrompt.init();
        return;
    }

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
        signupPromptDialog.rebind('onBeforeShow', function() {

            this.$dialog.addClass('with-close-btn');
            // custom buttons, because of the styling
            $('header p', this.$dialog)
                .safeHTML('@@', l[5842]);

            $('.pro-login', this.$dialog)
                .rebind('click.loginrequired', function() {
                    delay('logindlg.login', eventlog.bind(null, 99859));
                    attemptingLoginOrRegister = true;
                    signupPromptDialog.hide();
                    showLoginDialog();
                    return false;
                });

            $('.pro-register', this.$dialog)
                .rebind('click.loginrequired', function() {
                    delay('logindlg.register', eventlog.bind(null, 99860));
                    attemptingLoginOrRegister = true;
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

            var $selectedPlan = $('.pricing-page.plan.selected', 'body');

            this.$dialog.addClass(`pro${$selectedPlan.data('payment')}`);
        });

        signupPromptDialog.rebind('onHide', function() {

            // If login/register was pressed, do not trigger a close event
            if (!attemptingLoginOrRegister) {
                delay('logindlg.close', eventlog.bind(null, 99861));
            }

            this.$dialog.removeClass('with-close-btn');

            // Set default icon
            this.$dialog.removeClass('pro1 pro2 pro3 pro4');
        });
    }

    attemptingLoginOrRegister = false;
    signupPromptDialog.show();
};
