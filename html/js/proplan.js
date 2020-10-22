/**
 * Functionality for the Pro page Step 1 where the user chooses their Pro plan.
 * If the user selects a plan but is not logged in, they are prompted to log in.
 */
pro.proplan = {

    /** The user's current plan data */
    planData: null,

    /** The user's current storage in bytes */
    currentStorageBytes: 0,

    /** If the user had come from the home page, or wasn't logged in and the got booted back to Pro step 1 */
    previouslySelectedPlan: null,

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

        // Cache selectors
        var $body = $('body');
        var $stepOne = $('.pricing-section', $body);

        // If selecting a plan after registration
        if (localStorage.keycomplete) {

            // Remove the flag so next page visit (or on refresh) they will go straight to Cloud Drive
            localStorage.removeItem('keycomplete');

            if (typeof u_attr.p === 'undefined') {

                // Show the Free plan
                $body.addClass('key');

                // Set "Get started for FREE" plans and bottom buttons label
                $('.green-button.account.individual-el, .free-button.individual-el', $stepOne)
                    .text(l[23960]).attr('href', '/fm');
            }
        }
        else if (typeof u_attr === 'undefined') {

            // Set "Get started for FREE" plans button label
            $('.free-button.individual-el', $stepOne)
                .text(l[23960]).attr('href', '/register');

            // Set "Get started Now" bottom button label
            $('.green-button.account.individual-el', $stepOne)
                .text(l[24054]).attr('href', '/register');
        }
        else {

            $body.addClass('pro');

            // Set "Cloud drive" plans and bottom buttons label
            $('.green-button.account.individual-el, .free-button.individual-el', $stepOne)
                .text(l[164]).attr('href', '/fm');
        }

        // Add click handlers for the pricing boxes
        this.initPricingBoxClickHandlers();

        // Add mouseover handlers for the pricing boxes
        this.initPlanHoverHandlers();

        // Load pricing data from the API
        this.loadPricingPlans();

        // Init plan slider controls
        this.initPlanSliderControls();

        // Init plan period raadio buttons
        this.initPlanPeriodControls();

        // Init individual/business plans switcher
        this.initPlanControls();

        // Init compare slider
        this.initCompareSlider();

        // Init Get started for free button
        this.initGetFreeButton();

        var prevWindowWidth = $(window).width();
        $(window).rebind('resize.proslider', function() {
            // Prevent Iphone url bar resizing trigger reinit.
            var currentWindowWidth = $(window).width();
            if (currentWindowWidth !== prevWindowWidth) {
                pro.proplan.initPlanSliderControls();
                prevWindowWidth = currentWindowWidth;
            }
        });
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

            var $selectedPlan = $(this).closest('.plan');

            $('.plan', $planBlocks).removeClass('selected');
            $selectedPlan.addClass('selected');

            // Continue to Step 2
            pro.proplan.continueToStepTwo($(this).closest('.plan'));
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

                // Reposition the Tag
                $planTag.css('width', $this.outerWidth()).addClass('visible').position({
                    of: $this,
                    my: 'center bottom',
                    at: 'center top-10'
                });

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
            if (typeof page !== 'undefined' && page !== 'chat') {
                megaAnalytics.log('pro', 'loginreq');
            }
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
        var $pricingPage =  $('.pricing-section', 'body');
        var $scrollParent = $('.plans-wrap', $pricingPage);
        var $scrollContent = $('.plans-block', $pricingPage);
        var $controls = $('.default-controls', $pricingPage);
        var $dots = $('.nav', $controls);
        var $row = $('.pricing-page.plans-row', $scrollParent).first();
        var $plans =  $('.plan:visible', $row);
        var isRunningAnimation = false;
        var scrollToPlan;

        // Scroll to first block
        $scrollParent.scrollLeft(0);
        $dots.removeClass('active');
        $($dots[0]).addClass('active');

        // Scroll to necessary plan block
        scrollToPlan = function(slideNum) {
            var $previousPlan;
            var planPosition;

            // Prevent scroll event
            isRunningAnimation = true;

            // Get plan position related to previous plan to include border-spacing
            $previousPlan = $($plans[slideNum]).prev(':visible');
            planPosition = $previousPlan.length ? $previousPlan.position().left + $previousPlan.outerWidth() : 0;

            // Set controls dot active state
            $dots.removeClass('active');
            $($dots[slideNum]).addClass('active');

            // Scroll to plan block
            $scrollParent.stop().animate({
                scrollLeft: planPosition
            }, 600, 'swing', function() {

                // Enable on scroll event after auto scrolling
                isRunningAnimation = false;
            });
        };

        // Init scroll event
        $scrollParent.rebind('scroll.scrollToPlan', function() {
            var closestIndex;
            var scrollVal = $(this).scrollLeft();

            // Prevent on scroll event during auto scrolling
            if (isRunningAnimation) {
                return false;
            }

            // If block is scrolled
            if (scrollVal > 0) {
                closestIndex = Math.floor(scrollVal /
                    ($scrollContent.outerWidth() - $scrollParent.outerWidth()) * $plans.length);
            }

            // Hide simple tip
            $('.pricing-sprite.i-icon', $scrollContent).trigger('simpletipClose');

            // Hide plans tag
            $('.plan.main', $scrollContent).trigger('mouseleave');

            // Get closest plan index
            closestIndex = closestIndex ? closestIndex : 1;

            // Set controls dot active state
            $dots.removeClass('active');
            $dots.filter('.sl' + closestIndex).addClass('active');
        });

        // Init controls dot click
        $dots.rebind('click.scrollToPlan', function() {
            var $this = $(this);
            var slideNum;

            // Scroll to selected plan
            slideNum = $this.data('slide') - 1;
            scrollToPlan(slideNum);
        });

        // Init Previous/Next controls click
        $('.nav-button', $controls).rebind('click', function() {
            var $this = $(this);
            var slideNum;

            // Get current plan index
            slideNum = $('.nav.active', $controls).data('slide') - 1;

            // Get prev/next plan index
            if ($this.is('.prev')) {
                slideNum = slideNum - 1 > 0 ? slideNum - 1 : 0;
            }
            else if (slideNum !== $plans.length - 1) {
                slideNum += 1;
            }

            // Scroll to selected plan
            scrollToPlan(slideNum);
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

        if (page === 'pro' && $savePercs.length && $saveArrow.length) {

            // Set text to "save" block
            $savePercs.safeHTML(l[16649]);
            $('span', $savePercs).text('16%');

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
        var separator = mega.intl.decimalSeparator;
        var compareDetails = [];

        // Set current exchange tip value in USD
        $resultTip.text(l[24078].replace('%1', '1.17'));

        // Set compare slider labels
        $dots.get().forEach(function(e) {

            var $this = $(e);
            var $label = $('.label', $this);
            var storageValue = $label.data('storage');

            // Set storage value labels
            if (storageValue) {

                $label.safeHTML(l[23789].replace('%1', '<span>' + storageValue + '</span>'));
            }
            // Set Free Storage label
            else {

                $label.safeHTML(l[24099]);
            }
        });

        // Set compare MEGA/GoogleDrive/Dropbox data for FREE/2TB/8TB/16TB plans.
        compareDetails = [
            [
                ['50 ' + l[17696], '50 ' + l[17696], '', l[16362]],
                ['50 ' + l[17696], '2 ' + l[17696], '' , l[24075]],
                ['50 ' + l[17696], '15 ' + l[17696], '', l[24076]]
            ],
            [
                ['2 ' + l[20160], '9' + separator + '99', '&euro;', l[23818].replace('%1', l[5819])],
                ['2 ' + l[20160], '10' + separator + '27', '&euro;', l[23947]],
                ['2 ' + l[20160], '9' + separator + '99', '&euro;', l[23818].replace('%1', '2 ' + l[20160])]
            ],
            [
                ['8 ' + l[20160], '19' + separator + '99', '&euro;', l[23818].replace('%1', l[6125])],
                ['8 ' + l[20160], '', '', ''],
                ['8 ' + l[20160], '', '', '']
            ],
            [
                ['16 ' + l[20160], '29' + separator + '99', '&euro;', l[23818].replace('%1', l[6126])],
                ['16 ' + l[20160], '', '', ''],
                ['16 ' + l[20160], '', '', '']
            ]
        ];

        // Init compare slider
        $slider.slider({

            min: 1, max: 4, range: 'min',
            change: function(e, ui) {

                var value = ui.value;

                // Set  selected slide data
                $resultWarpper.attr('class', 'pricing-page compare-block slide' + value);

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
                    $('.price', $resultBlock).text(planInfo[1]);
                    $('.currency', $resultBlock).safeHTML(planInfo[2] ? planInfo[2] : ' ');

                    // Change plan tip
                    if (planInfo[3]) {
                        $planInfoBlock.text('*' + planInfo[3]);
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

        var $stepOne = $('.pricing-section', 'body');
        var $getFreeButton = $('.free-button', $stepOne);
        var signUpStartedInWebclient = localStorage.signUpStartedInWebclient;

        delete localStorage.signUpStartedInWebclient;

        // Init button click
        $getFreeButton.rebind('click', function() {

            if (typeof u_attr === 'undefined') {
                loadSubPage('register');

                return false;
            }

            // If coming from the process key step and they click on the Free button
            loadSubPage(signUpStartedInWebclient ? 'downloadapp' : 'fm');

            if (localStorage.gotOverquotaWithAchievements) {
                onIdle(function() {
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
            var basePriceCurrencySign;

            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                $currncyAbbrev.text(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]);
                $euroPrice.text(intl.format(currentPlan[priceIndex]) + ' ' + euroSign);

                // Calculate the base price in local currency
                basePrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE].toString();

                if (pageType === "P") {
                    zeroPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICEZERO];
                    oneLocalPriceFound = true;
                }

                // Set localCurrency indicator
                if ($dialog) {
                    $dialog.addClass('local-currency');
                }
            }
            else {
                // Calculate the base price
                basePrice = currentPlan[pro.UTQA_RES_INDEX_PRICE].toString();
                basePriceCurrencySign = euroSign;
            }

            // Calculate the monthly base price
            var basePriceParts = basePrice.split('.');
            var basePriceDollars = basePriceParts[0];
            var basePriceCents = basePriceParts[1] || '00';

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

            $price.text(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE] ? basePrice :
                basePriceDollars + mega.intl.decimalSeparator + basePriceCents + ' ' + basePriceCurrencySign);

            // Get storage
            storageValue = storageSizeRounded + ' ' + storageFormatted.unit;

            // Get bandwidth
            bandwidthValue = bandwidthSizeRounded + ' ' + bandwidthFormatted.unit;

            // Update storage and bandwidth data
            pro.proplan.updatePlanData($pricingBox, storageValue, bandwidthValue, period);
        }

        return pageType === "P" ? [oneLocalPriceFound, zeroPrice] : classType;
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

    /**
     * Populate the monthly plans across the main /pro page
     */
    populateMembershipPlans: function() {

        "use strict";

        var $stepOne = $('.pricing-section', 'body');
        var $pricingBoxes = $('.pricing-page.plan', $stepOne);
        var $businessPrice = $('.plan-price', $pricingBoxes.filter('.business'));
        var euroSign = '\u20ac';

        var updateResults = pro.proplan.updateEachPriceBlock("P", $pricingBoxes, undefined, 1);
        var oneLocalPriceFound = updateResults[0];

        if (oneLocalPriceFound) {
            $stepOne.addClass('local-currency');
        }
        else {
            $stepOne.removeClass('local-currency');
        }

        $businessPrice.text(
            $businessPrice.text().replace('.', mega.intl.decimalSeparator)
        );
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
    var $inputs = $dialog.find('input');
    var $button = $dialog.find('.big-red-button');

    var closeLoginDialog = function() {
        $('.fm-dialog-overlay').unbind('click.proDialog');
        $('.fm-dialog-close', $dialog).unbind('click.proDialog');
        closeDialog();
        return false;
    };

    M.safeShowDialog('pro-login-dialog', function() {

        // Init inputs events
        accountinputs.init($dialog);

        // controls
        $('.fm-dialog-close', $dialog).rebind('click.proDialog', closeLoginDialog);
        $('.fm-dialog-overlay').rebind('click.proDialog', closeLoginDialog);

        $('.input-email', $dialog).val(email || '');
        $('.input-password', $dialog).val(password || '');

        $('.top-login-forgot-pass', $dialog).rebind('click.forgetPass', function() {

            var email = document.getElementById('login-name').value;

            if (isValidEmail(email)) {
                $.prefillEmail = email;
            }

            loadSubPage('recovery');
        });


        $inputs.rebind('keydown.initdialog', function(e) {
            if (e.keyCode === 13) {
                doProLogin($dialog);
            }
        });

        $button.rebind('click.initdialog', function() {
            doProLogin($dialog);
        });

        $button.rebind('keydown.initdialog', function(e) {
            if (e.keyCode === 13) {
                doProLogin($dialog);
            }
        });

        onIdle(clickURLs);
        return $dialog;
    });
}

var doProLogin = function($dialog) {

    if (typeof page !== 'undefined' && page !== 'chat') {
        megaAnalytics.log('pro', 'doLogin');
    }

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

    postLogin(email, password, pinCode, rememberMe, completeProLogin);
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

    loadingDialog.hide();

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

        // Find the plan they clicked on before the login/register prompt popped up
        var proNum = $('.pricing-page.plan.selected').data('payment');

        if (page === "chat") {
            var chatHash = getSitePath().replace("/chat/", "").split("#")[0];
            megaChat.loginOrRegisterBeforeJoining(chatHash);
        }
        else {
            // Load the Pro payment page (step 2)
            loadSubPage('propay_' + proNum);
        }
    }
    else {
        // Close the 2FA dialog for a generic error
        twofactor.loginDialog.closeDialog();
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

function showRegisterDialog() {

    if (typeof page !== 'undefined' && page !== 'chat') {
        megaAnalytics.log("pro", "regDialog");
    }

    mega.ui.showRegisterDialog({
        title: l[5840],

        onCreatingAccount: function() {
            if (typeof page !== 'undefined' && page !== 'chat') {
                megaAnalytics.log("pro", "doRegister");
            }
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
                    security.register.cacheRegistrationData(registerData);
                }

                // Find the plan they clicked on before the login/register prompt popped up
                var proNum = $('.pricing-page.plan.selected').data('payment');

                // Load the Pro payment page (step 2)
                loadSubPage('propay_' + proNum);
            }
            else {
                $('.fm-dialog.registration-page-success').removeClass('hidden');
                fm_showoverlay();
            }
        }
    });
}

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
            $('.fm-dialog-title', this.$dialog).text(this.options.title);

            // custom buttons, because of the styling
            $('.fm-notification-info', this.$dialog)
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

        signupPromptDialog.rebind('onHide', function() {

            // Set default icon
            $('.icon', this.$dialog).attr('class', 'icon fm-notification-icon');
        });
    }

    signupPromptDialog.show();

    var $selectedPlan = $('.pricing-page.plan.selected', 'body');

    $('.fm-dialog.loginrequired-dialog .icon')
        .attr('class', 'icon pricing-sprite plan-icon pro' + $selectedPlan.data('payment'));
};
/* jshint +W003 */
