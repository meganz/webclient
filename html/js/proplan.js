/**
 * Functionality for the Pro page Step 1 where the user chooses their Pro plan.
 * If the user selects a plan but is not logged in, they are prompted to log in.
 */
pro.proplan = {

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
        var $stepOne = $body.find('.membership-step1');
        var $contactUsButton = $stepOne.find('.pro-bottom-button');
        var $achievementsInfo = $stepOne.find('.red-star-img, .reg-st3-txt-achprogram');

        // If selecting a plan after registration
        if (localStorage.keycomplete) {

            // Remove the flag so next page visit (or on refresh) they will go straight to Cloud Drive
            localStorage.removeItem('keycomplete');

            if (typeof u_attr.p === 'undefined') {

                // Show the Free plan
                $body.addClass('key');

                // If achievements are enabled,
                // show a star on the Free plan and some extra information about achievements
                if (!is_mobile) {
                    mega.achievem.enabled().done(function() {
                        $achievementsInfo.removeClass('hidden');
                    });
                }
            }
        }
        else {
            $body.addClass('pro');
        }

        // If user is logged in
        if (u_type === 3) {

            // Get user quota information, the flag 'strg: 1' includes current account storage in the response
            api_req({ a: 'uq', strg: 1, pro: 1 }, {
                callback : function (result) {

                    // Store current account storage usage for checking later
                    pro.proplan.currentStorageBytes = result.cstrg;

                    // Process next and current plan data and display tag on top of the plan
                    pro.proplan.processCurrentAndNextPlan(result);
                }
            });
        }

        // French language fixes: GB -> Go (Gigaoctet) and TB -> To (Teraoctet)
        if (lang === 'fr') {
            $stepOne.find('.reg-st3-big-txt').each(function(e, o) {
                $(o).html($(o).html().replace('GB', 'Go').replace('TB', 'To'));
            });
        }

        // Add click handlers for the pricing boxes
        if (is_mobile) {
            this.initMobilePricingBoxesClickHandlers();
        }
        else {
            this.initDesktopPricingBoxClickHandlers();
        }

        // Load pricing data from the API
        this.loadPricingPlans();

        // Add click handler for the contact button
        $contactUsButton.rebind('click', function() {
            loadSubPage('contact');
        });

        // If Mobile add some specific styling
        if (is_mobile) {
            // Set title just for the Pro page
            $('#startholder .mobile.fm-header-txt').text(l[16111]);

            if ($body.hasClass('key')) {
                $body.find('.pro4 .cta-button').removeClass('secondary').addClass('green');
                $body.find('.pro1 .cta-button').addClass('secondary').removeClass('green');
            }

            this.initMobilePlanDots();

            var prevWindowWidth = $(window).width();
            $(window).rebind('resize.proslider', function(e) {
                // Prevent Iphone url bar resizing trigger reinit.
                var currentWindowWidth = $(window).width();
                if (currentWindowWidth !== prevWindowWidth) {
                    pro.proplan.initMobilePlanDots();
                    prevWindowWidth = currentWindowWidth;
                }
            });
        }
    },

    /**
     * Initialise the click handler for the pricing boxes to add a selected style
     * and initialise the mobile Purchase buttons to continue to step two
     */
    initMobilePricingBoxesClickHandlers: function() {

        'use strict';

        var $planBlocks = $('.membership-step1 .reg-st3-membership-bl');
        var $purchaseButtons = $planBlocks.find('.purchase-plan-button');

        // Initialise click handler for all the pricing plan blocks to select them
        $planBlocks.rebind('click', function() {

            // Add styling to the clicked on block
            $planBlocks.removeClass('selected');
            $(this).addClass('selected');

            return false;
        });

        // Initialise click handler for all the Purchase buttons within the pricing blocks
        $purchaseButtons.rebind('click', function() {

            var $selectedPlan = $(this).closest('.reg-st3-membership-bl');

            // Continue to Step 2
            pro.proplan.continueToStepTwo($selectedPlan);

            return false;
        });
    },

    /**
     * Initialise the click handler for the desktop pricing boxes to continue straight to step two
     */
    initDesktopPricingBoxClickHandlers: function() {

        'use strict';

        var $planBlocks = $('.membership-step1 .reg-st3-membership-bl');

        // Initialise click handler for all the plan blocks
        $planBlocks.rebind('click', function() {

            var $selectedPlan = $(this);

            // Continue to Step 2
            pro.proplan.continueToStepTwo($selectedPlan);
        });
    },

    /**
     * Continues the flow to step two of the Pro payment process
     * @param {Object} $selectedPlan The selected Pro card container which has the data-payment attribute
     */
    continueToStepTwo: function($selectedPlan) {

        'use strict';

        var $planBlocks = $('.membership-step1 .reg-st3-membership-bl');
        var planNum = $selectedPlan.attr('data-payment');
        var signUpStartedInWebclient = localStorage.signUpStartedInWebclient;
        delete localStorage.signUpStartedInWebclient;

        // Select the plan
        $planBlocks.removeClass('selected');
        $selectedPlan.addClass('selected');

        // If coming from the process key step and they click on the Free plan
        if (planNum === '0') {
            loadSubPage(signUpStartedInWebclient ? 'downloadapp' : 'fm');

            if (localStorage.gotOverquotaWithAchievements) {
                onIdle(function() {
                    mega.achievem.achievementsListDialog();
                });
                delete localStorage.gotOverquotaWithAchievements;
            }
            return false;
        }

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

            l[22670] = l[22670].replace('%1', bytesToSize(pro.minPlan[2] * 1024 * 1024 * 1024, 0)).
                replace('%2', bytesToSize(pro.maxPlan[2] * 1024 * 1024 * 1024, 0));

            $('.storage-txt-small').safeHTML(l[22670]);

            // Close loading spinner
            loadingDialog.hide();
        });
    },

    /**
     * Pro page plans side scroll on mobile snap scroll to elements.
     */
    initMobilePlanDots: function() {

        'use strict';

        // The box which gets scroll and contains all the child content.
        var $scrollParent = $('.bottom-page.horizontal-centered-bl.centered-txt.plans.horizontal-plans');
        var $dots = $('.mobile .horizontal-plans.nav-dots-container li');
        var wrapWidth =  $scrollParent.width();
        var blockWidth = $scrollParent.find('.reg-st3-membership-bl:visible').first().outerWidth();
        var lastIndex = 0;

        $scrollParent.scrollLeft(0);
        $dots.removeClass('current');
        $($dots[0]).addClass('current');

        $scrollParent.rebind('scroll', function() {
            var closestIndex;
            var scrollVal = $(this).scrollLeft();

            if (scrollVal > 0) {
                closestIndex = Math.floor((wrapWidth + scrollVal) / blockWidth) - 1;
            }
            else {
                closestIndex = 0;
            }

            if (closestIndex === lastIndex) {
                return false;
            }

            lastIndex = closestIndex;
            $dots.removeClass('current');
            $($dots[closestIndex]).addClass('current');
        });
    },

    /**
     * Update each pricing block with details from the API
     */
    updateEachPriceBlock: function(pageType, $pricingBoxes, $dialog) {
        "use strict";

        var euroSign = '\u20ac';
        var oneLocalPriceFound = false;
        var zeroPrice;
        var classType = 1;
        var intl = mega.intl.number;

        var setPriceFont = function _setPriceFunction(_pageType,
                                                      _monthlyBasePriceDollars,
                                                      _monthlyBasePriceCents,
                                                      _$priceDollars,
                                                      _$priceCents,
                                                      _classType) {
            if (_pageType === "P") {
                if (_monthlyBasePriceDollars.length > 9) {
                    if (_monthlyBasePriceDollars.length > 11) {
                        _$priceDollars.addClass('tooBig2');
                        _$priceCents.addClass('toosmall2');
                        _monthlyBasePriceCents = '0';
                    }
                    else {
                        _$priceDollars.addClass('tooBig');
                        _$priceCents.addClass('toosmall');
                        _monthlyBasePriceCents = '00';
                    }
                    _monthlyBasePriceDollars = Number.parseInt(_monthlyBasePriceDollars) + 1;
                }
                else {
                    if (_monthlyBasePriceCents.length > 2) {
                        _monthlyBasePriceCents = _monthlyBasePriceCents.substr(0, 2);
                        _monthlyBasePriceCents = Number.parseInt(_monthlyBasePriceCents) + 1;
                        _monthlyBasePriceCents = (_monthlyBasePriceCents + '0').substr(0, 2);
                    }
                }
                return [_monthlyBasePriceDollars,_monthlyBasePriceCents];
            }
            else {
                if (_monthlyBasePriceDollars.length > 7) {
                    _classType = 1;
                    _monthlyBasePriceCents = '00';
                    if (_monthlyBasePriceDollars.length > 9) {
                        _classType = 2;
                        _monthlyBasePriceCents = '0';
                    }
                    _monthlyBasePriceDollars = Number.parseInt(_monthlyBasePriceDollars) + 1;
                }
                else {
                    if (_monthlyBasePriceCents.length > 2) {
                        _monthlyBasePriceCents = _monthlyBasePriceCents.substr(0, 2);
                        _monthlyBasePriceCents = Number.parseInt(_monthlyBasePriceCents) + 1;
                        _monthlyBasePriceCents = (_monthlyBasePriceCents + '0').substr(0, 2);
                    }
                }
                return [_monthlyBasePriceDollars,_monthlyBasePriceCents,_classType];
            }
        };

        for (var i = 0, length = pro.membershipPlans.length; i < length; i++) {

            // Get plan details
            var currentPlan = pro.membershipPlans[i];
            var months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
            var planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            var planName = pro.getProPlanName(planNum);

            // Show only monthly prices in the boxes
            if (months !== 12) {
                var $pricingBox = $pricingBoxes.filter('.pro' + planNum);
                var $price = $pricingBox.find('.price');
                var $priceDollars = $price.find('.big');
                var $priceCents = $price.find('.small');
                var $storageAmount = $pricingBox.find('.storage-amount');
                var $storageUnit = $pricingBox.find('.storage-unit');
                var $bandwidthAmount = $pricingBox.find('.bandwidth-amount');
                var $bandwidthUnit = $pricingBox.find('.bandwidth-unit');
                var $euroPrice = $('.euro-price', $price);
                var $currncyAbbrev = $('.local-currency-code', $pricingBoxes);
                var monthlyBasePrice;
                var monthlyBasePriceCurrencySign;
                var $planName;

                if (pageType === "P") {
                    $planName = $pricingBox.find('.title');
                    $priceDollars.removeClass('tooBig tooBig2');
                    $priceCents.removeClass('toosmall toosmall2');
                }
                else {
                    $planName = $pricingBox.find('.title span');
                }

                if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                    $euroPrice.removeClass('hidden');
                    $currncyAbbrev.removeClass('hidden');
                    $currncyAbbrev.text(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]);
                    $euroPrice.text(intl.format(currentPlan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE])  +
                        ' ' + euroSign
                    );
                    // Calculate the monthly base price in local currency
                    monthlyBasePrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE].toString();

                    if (pageType === "P") {
                        zeroPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICEZERO];
                        oneLocalPriceFound = true;
                    }
                    else {
                        $pricingBoxes.addClass('local-currency');
                        $('.reg-st3-txt-localcurrencyprogram', $dialog).removeClass('hidden');
                    }
                }
                else {
                    $euroPrice.addClass('hidden');
                    $currncyAbbrev.addClass('hidden');
                    // Calculate the monthly base price
                    monthlyBasePrice = currentPlan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE].toString();
                    monthlyBasePriceCurrencySign = euroSign;

                    if (pageType === "D") {
                        $pricingBoxes.removeClass('local-currency');
                        $('.reg-st3-txt-localcurrencyprogram', $dialog).addClass('hidden');
                    }
                }

                // Calculate the monthly base price
                var monthlyBasePriceParts = monthlyBasePrice.split('.');
                var monthlyBasePriceDollars = monthlyBasePriceParts[0];
                var monthlyBasePriceCents = monthlyBasePriceParts[1] || '00';

                var setPriceFontResults;

                if (pageType === "P") {
                    setPriceFontResults = setPriceFont(pageType,
                        monthlyBasePriceDollars,
                        monthlyBasePriceCents,
                        $priceDollars,
                        $priceCents);
                }
                else {
                    setPriceFontResults = setPriceFont(pageType,
                        monthlyBasePriceDollars,
                        monthlyBasePriceCents,
                        $priceDollars,
                        $priceCents,
                        classType);
                    classType = setPriceFontResults[2];
                }
                monthlyBasePriceDollars = setPriceFontResults[0];
                monthlyBasePriceCents = setPriceFontResults[1];

                var storageGigabytes = currentPlan[pro.UTQA_RES_INDEX_STORAGE];
                var storageBytes = storageGigabytes * 1024 * 1024 * 1024;
                var storageFormatted = numOfBytes(storageBytes, 0);
                var storageSizeRounded = Math.round(storageFormatted.size);

                var bandwidthGigabytes = currentPlan[pro.UTQA_RES_INDEX_TRANSFER];
                var bandwidthBytes = bandwidthGigabytes * 1024 * 1024 * 1024;
                var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
                var bandwidthSizeRounded = Math.round(bandwidthFormatted.size);

                // Update the plan name and price
                $planName.text(planName);

                if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                    $priceDollars.text(monthlyBasePrice);
                    $priceCents.text('');
                }
                else {
                    $priceDollars.text(monthlyBasePriceDollars);
                    $priceCents.text(mega.intl.decimalSeparator + monthlyBasePriceCents + ' ' +
                        monthlyBasePriceCurrencySign);
                }

                // Update storage
                $storageAmount.text(storageSizeRounded);
                $storageUnit.text(storageFormatted.unit);

                // Update bandwidth
                $bandwidthAmount.text(bandwidthSizeRounded);
                $bandwidthUnit.text(bandwidthFormatted.unit);
            }
        }
        if (pageType === "P") {
            return [oneLocalPriceFound, zeroPrice];
        }
        else {
            return classType;
        }
    },

    /**
     * Populate the monthly plans across the main /pro page
     */
    populateMembershipPlans: function() {
        "use strict";

        var $stepOne = $('.plans-block');
        var $pricingBoxes = $stepOne.find('.reg-st3-membership-bl');
        var euroSign = '\u20ac';

        var updatePriceBlockResults = pro.proplan.updateEachPriceBlock("P", $pricingBoxes);
        var oneLocalPriceFound = updatePriceBlockResults[0];
        var zeroPrice = updatePriceBlockResults[1];

        var $pricingBoxFree = $pricingBoxes.filter('.free');
        var $priceFree = $pricingBoxFree.find('.price');
        var $priceCentsFree = $priceFree.find('.small');
        var $priceDollarsFree = $priceFree.find('.big');

        if (oneLocalPriceFound) {
            $('.reg-st3-txt-localcurrencyprogram').removeClass('hidden');
            $pricingBoxes.addClass('local-currency');
            $priceCentsFree.text('');
            $priceDollarsFree.text(zeroPrice);
        }
        else {
            $('.reg-st3-txt-localcurrencyprogram').addClass('hidden');
            $priceCentsFree.text('.00 ' + euroSign);
            $pricingBoxes.removeClass('local-currency');
            $priceDollarsFree.text('0');
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
        var $stepOne = $('.membership-step1');
        var $pricingBoxes = $stepOne.find('.reg-st3-membership-bl');
        var $noPlansSuitable = $stepOne.find('.no-plans-suitable');
        var $currentStorageTerabytes = $noPlansSuitable.find('.current-storage .terabytes');
        var $requestPlanButton = $noPlansSuitable.find('.btn-request-plan');

        // Calculate storage in gigabytes
        var totalNumOfPlans = 4;
        var numOfPlansNotApplicable = 0;
        var currentStorageGigabytes = pro.proplan.currentStorageBytes / 1024 / 1024 / 1024;

        if (u_attr && u_attr.b) {
            // Hide  the plan
            $pricingBoxes.filter('.pro1,.pro2,.pro3,.pro4').addClass('hidden');
            $stepOne.find('.reg-st3-txt-localcurrencyprogram').addClass('hidden');
        }
        else {
            $pricingBoxes.filter('.pro1,.pro2,.pro3,.pro4').removeClass('hidden');
            if ($pricingBoxes.find('.pro1').hasClass('local-currency')) {
                $stepOne.find('.reg-st3-txt-localcurrencyprogram').removeClass('hidden');
            }

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
     */
    processCurrentAndNextPlan: function(data) {

        'use strict';

        if (!is_mobile) {

            var $plansBlock = $('.plans-block');
            var $currPlan = $('[data-payment="' + data.utype + '"]', $plansBlock).addClass('current');

            // Current plan
            if (data.srenew) { // This is subscription plan

                var renewTimestamp = data.srenew[0];
                if (renewTimestamp === 0) {
                    $currPlan.addClass('renew').addClass('no-pops');
                }
                else {
                    $currPlan.addClass('renew');
                    $('.plan-tag-description.renew b', $currPlan).text(time2date(renewTimestamp, 2));
                }
            }
            else {
                var currentExpireTimestamp = data.nextplan ? data.nextplan.t : data.suntil;
                $currPlan.find('.plan-tag-description.current b').text(time2date(currentExpireTimestamp, 2));
            }

            // Hide popular text on current plan
            $currPlan.find('.pro-popular-txt').addClass('hidden');

            // Next plan
            if (data.nextplan) {

                // Store next plan
                pro.proplan.nextPlan = data.nextplan;

                var $nextPlan = $plansBlock.find('[data-payment="' + pro.proplan.nextPlan.p + '"]');

                $nextPlan.addClass('next').find('.plan-time').text(time2date(pro.proplan.nextPlan.t, 2));
                $nextPlan.find('.plan-name').text(pro.getProPlanName(pro.proplan.nextPlan.p));

                // Hide popular text on next plan
                $nextPlan.find('.pro-popular-txt').addClass('hidden');
            }
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
        var proNum = $('.reg-st3-membership-bl.selected').data('payment');

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
                var proNum = $('.reg-st3-membership-bl.selected').data('payment');

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
    }

    signupPromptDialog.show();

    var $selectedPlan = $('.reg-st3-membership-bl.selected');
    var plan = 1;

    if ($selectedPlan.is(".lite")) { plan = 1; }
    else if ($selectedPlan.is(".pro1")) { plan = 2; }
    else if ($selectedPlan.is(".pro2")) { plan = 3; }
    else if ($selectedPlan.is(".pro3")) { plan = 4; }

    $('.fm-dialog.loginrequired-dialog .fm-notification-icon')
        .removeClass('plan1')
        .removeClass('plan2')
        .removeClass('plan3')
        .removeClass('plan4')
        .addClass('plan' + plan);
};
/* jshint +W003 */
