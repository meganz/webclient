/**
 * Functionality for the Pro page Step 2 where the user has chosen their Pro plan and now they
 * will choose the payment provider and plan duration.
 */
pro.propay = {

    /** The selected Pro plan number e.g. 1 - 4 */
    planNum: null,

    /** The selected Pro plan name e.g. Pro I - III & Pro Lite */
    planName: null,

    /** The selected Pro plan features, if any */
    planFeatures: 0,

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

    $pricingBox: null,
    $planName: null,
    $priceNum: null,
    $pricePeriod: null,
    $storageAmount: null,
    $storageTip: null,
    $bandwidthAmount: null,
    $bandwidthTip: null,
    $euroPrice: null,
    $currncyAbbrev: null,
    $todayText: null,
    $selectedPlanTitle: null,

    paymentStatusChecker: null,

    /** The user's subscription payment gateway id */
    userSubsGatewayId: null,

    /** @var Dialog Log in / register dialog displayed when not signed in */
    accountRequiredDialog: null,

    /** A plan object of the same level as the users chosen plan */
    planObjOfChosenLevel: null,

    selectedPlan: null,

    freeTrialCardController: null,

    purchaseButton: null,

    initialPaymentOptionIsStripe: false,

    stripeSupported: false,     // Does the user have a stripe payment gateway available?

    trial: null,

    currentPlanData: null,

    gatewaysByName: Object.create(null),

    planNumsByName: {
        'vpn': pro.ACCOUNT_LEVEL_FEATURE_VPN,
        'pwm': pro.ACCOUNT_LEVEL_FEATURE_PWM,
    },

    /**
     * @returns {Object} Purchasable feature plans. Each feature plan should include
     * an array of features to show on the features table when the user goes
     * to cancel their subscription
     */
    purchasableFeaturePlans() {
        'use strict';
        return {
            'vpn': {
                'cancelSubFeatures': [
                    l.vpn_cancel_subfeature1,
                    l.vpn_cancel_subfeature2,
                    l.vpn_cancel_subfeature3,
                    l.vpn_cancel_subfeature4,
                ]
            },
            'pwm': {
                'cancelSubFeatures': [
                    l.pwm_cancel_subfeature1,
                    l.pwm_cancel_subfeature2,
                    l.pwm_cancel_subfeature3,
                ]
            },
        };
    },

    shouldShowTrial() {
        'use strict';
        return (!pro.propay.freeTrialCardController || (pro.propay.freeTrialCardController.getVal() !== 'error'))
            && pro.propay.trial;
    },

    userOnPropayPage() {
        'use strict';
        return page.includes('propay');
    },

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
            // Unless they have entered the S4 Object Storage RYI flow, in which case send them to that landing page.
            if (window.s4ac) {
                loadSubPage('activate-s4');
                return;
            }

            loadSubPage('start');
            return;
        }

        // If a previous Pro Flexi user is expired or in grace period, they must use the Repay page to pay again
        if (u_attr && u_attr.pf && pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
            loadSubPage('repay');
            return;
        }

        // Cache current Pro Payment page selector
        this.$page = $('.payment-section', '#startholder');

        pro.propay.purchaseButton = {
            $button: $('button.purchase', this.$page),
            canProceedLoaded: false,
            termsAccepted: true // No special terms by default
        };

        // Preload loading/transferring/processing animation
        pro.propay.preloadAnimation();

        // Ephemeral accounts (accounts not registered at all but have a few files in the cloud
        // drive) are *not* allowed to reach the Pro Pay page as we can't track their payment (no email address).
        // Accounts that have registered but have not confirmed their email address yet *are* allowed to reach the Pro
        // Pay page e.g. if they registered on the Pro Plan selection page first (this gets more conversions).
        if (u_type === 0 && typeof localStorage.awaitingConfirmationAccount === 'undefined') {
            loadSubPage('pro');
            return;
        }

        // If the plan number is not set in the URL e.g. propay_4, go back to Pro page step 1 so they can choose a plan
        if (!pro.propay.setProPlanFromUrl()) {

            // Redirect to Buy Pro Flexi page or back to mega.io if user comes from link propay?ac=<Auth Code>
            if (window.s4ac) {

                ActivateS4.instance.verifyAuthCode(window.s4ac)
                    .then(res => {
                        if (res === 0) {
                            loadSubPage(`propay_${pro.ACCOUNT_LEVEL_PRO_FLEXI}`);
                            return false;
                        }
                        return ActivateS4.instance.handleResponse(res);
                    })
                    .catch(tell);

                return;
            }

            loadSubPage('pro');
            return;
        }

        if (pro.propay.freeTrialCardController) {
            pro.propay.freeTrialCardController = pro.propay.freeTrialCardController.remove();
        }
        if (pro.propay.thirdSectionController) {
            pro.propay.thirdSectionController = pro.propay.thirdSectionController.remove();
        }

        pro.propay.currentPlanData = null;

        let discountInfo = pro.propay.getDiscount();
        if (discountInfo && discountInfo.used) {
            delete mega.discountCode;
            delete mega.discountInfo;
            discountInfo = null;
        }

        // Apply discount info if applicable
        if (discountInfo && discountInfo.pd) {
            const discountTitle = discountInfo.m === 12 ? l[24680]
                : (discountInfo.m === 1 ? l[24849] : l[24850]);
            $('.top-header.plan-title', this.$page).safeHTML(discountTitle
                .replace('%1', escapeHTML(pro.propay.planName))
                .replace('%2', formatPercentage(discountInfo.pd / 100)));
            $('.stores-desc', this.$page).addClass('hidden');
        }

        if (!pro.planInFilter(pro.propay.planNum, 'supportsGooglePlay')) {
            $('.bottom-page .bottom-page.stores-desc', this.$page).addClass('hidden');
        }

        // Show loading spinner because some stuff may not be rendered properly yet
        loadingDialog.show('propayReady');
        pro.propay.loading = true;

        // Initialise some extra stuff just for mobile
        if (is_mobile) {
            mobile.propay.init();
            if ((discountInfo && discountInfo.pd) || !pro.planInFilter(pro.propay.planNum, 'supportsGooglePlay')) {
                $('.mobile.external-payment-options', '.mobile.fm-content').addClass('hidden');
            }
        }

        // If the user is not logged in, show the login / register dialog
        if (u_type === false) {
            loadingDialog.hide('propayReady');
            pro.propay.showAccountRequiredDialog();

            // login / register action while on /propay_x will recall init()
            return;
        }

        if (discountInfo) {
            mega.discountInfo.used = true;
        }

        // If the user does has more stored than the current plan offers, go back to Pro page
        // so they may select a plan that provides more storage space
        const proceed = new Promise((resolve, reject) => {
            M.getStorageQuota().then((storage) => {
                checkPlanStorage(storage.used, pro.propay.planNum).then((res) => {
                    if (res) {
                        pro.propay.purchaseButton.canProceedLoaded = true;
                        resolve();
                    }
                    else {
                        loadSubPage('pro');
                        reject(new Error('Selected plan does not have enough storage space; ' +
                        `Or plan ${pro.getProPlanName(pro.propay.planNum)} (${pro.propay.planNum}) is not available`));
                    }
                });
            });
        });

        // Initialise the main purchase button
        pro.propay.purchaseButton.$button.rebind('click.purchase', () => {
            const canProceed = pro.propay.purchaseButton.canProceedLoaded
                && pro.propay.purchaseButton.termsAccepted;

            if (!canProceed) {
                return false;
            }
            if (is_mobile) {
                pro.propay.userSubsGatewayId =
                    M.account.sgwids && M.account.sgwids.length > 0 ? M.account.sgwids[0] : null;
            }
            pro.propay.startPurchaseProcess();
            return false;
        });

        // Init/hide S4 UI
        if (window.s4ac && pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            $('.plan-feature.subtext',  this.$page).text(l.pro_page_flexi_feature_subtext).removeClass('hidden');
            $('.s4-tos', this.$page).removeClass('hidden');

            pro.propay.initS4TermsCheckbox();
        }
        else {
            $('.plan-feature.subtext',  this.$page).addClass('hidden');
            $('.s4-tos', this.$page).addClass('hidden');
        }

        clickURLs();

        // Load payment plans
        pro.loadMembershipPlans(function() {

            // Get the user's account balance
            voucherDialog.getLatestBalance(function() {

                // Load payment providers and do the rest of the rendering if the selected plan
                // has enough storage. Otherwuse do not proceed with rendering the page.
                proceed.then(async () => {

                    const userHasVpn = pro.proplan2.getUserFeature('vpn');
                    const userHasPwm = pro.proplan2.getUserFeature('pwm');

                    let strings;

                    pro.propay.trial = pro.getPlan(pro.propay.planNum)[pro.UTQA_RES_INDEX_EXTRAS].trial;

                    /** @todo this should be an actual 'plan has-feature' check */
                    if (pro.propay.planNum === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                        strings = await pro.propay.checkFeatureEligibility(
                            userHasVpn, true, pro.propay.planNum);
                    }
                    else if (pro.propay.planNum === pro.ACCOUNT_LEVEL_FEATURE_PWM) {
                        strings = await pro.propay.checkFeatureEligibility(
                            userHasPwm, true, pro.propay.planNum);
                    }
                    else if (userHasVpn) {
                        strings = await pro.propay.checkFeatureEligibility(
                            userHasVpn, true, pro.ACCOUNT_LEVEL_FEATURE_VPN);
                    }
                    else if (userHasPwm) {
                        strings = await pro.propay.checkFeatureEligibility(
                            userHasPwm, true, pro.ACCOUNT_LEVEL_FEATURE_PWM);
                    }

                    if (strings) {
                        const status = await pro.propay.showFeatureWarning(
                            strings.blockerTitle, strings.blockerText, strings.btnLabelCancel, strings.btnLabel);

                        if (status === 2 || !strings.canContinue) {
                            loadSubPage('pro');
                            return;
                        }
                        else if ((status === 1) && pro.propay.loading) {
                            loadingDialog.show('propayReady');
                        }
                        // User left propay page
                        else if (status === -1) {
                            return;
                        }
                    }

                    if (pro.propay.trial) {
                        pro.propay.$selectedPlanTitleTrial = $(`.top-header.plan-title.free-trial`, pro.propay.$page);
                    }
                    pro.propay.$selectedPlanTitle = $(`.top-header.plan-title.paid-only`, pro.propay.$page);

                    await pro.propay.loadPaymentGatewayOptions();

                    pro.propay.updatePurchaseButton();
                    pro.propay.updateMainPageDisplay();
                    loadingDialog.hide('propayReady');
                    pro.propay.loading = false;

                    const propayPageVisitEventId = pro.propay.getPropayPageEventId(pro.propay.planNum);
                    eventlog(propayPageVisitEventId);
                }).catch((ex) => {
                    console.error(ex);
                });
            });
        });
    },

    shouldShowTrialBlocker: (blockerText, blockerTitle) => {
        'use strict';
        return !pro.filter.simple.validPurchases.has(pro.propay.planNum)
            && !pro.propay.trial
            && !blockerText
            && !blockerTitle;
    },

    async checkFeatureEligibility(userHasFeature, planHasFeature, feature) {
        'use strict';

        let blockerTitle;
        let blockerText;
        let btnLabel;
        let btnLabelCancel;
        let canContinue = false;

        const statusIsNotTrial = (sub, plan) => {
            return (sub && !sub.is_trial) || (plan && !plan.is_trial);
        };

        const isProUser = u_attr && u_attr.p && !u_attr.b;
        const warningStrings = pro.propay.warningStrings[feature];

        if (!planHasFeature && !userHasFeature) {
            return;
        }

        if (isProUser && planHasFeature && !pro.filter.simple.validPurchases.has(pro.propay.planNum)) {
            blockerTitle = warningStrings.added_title;
            blockerText = warningStrings.is_attached_text;
        }
        else if (!isProUser && userHasFeature) {
            if (pro.filter.simple.validPurchases.has(pro.propay.planNum)) {
                const status = await pro.propay.checkMultiFeatures(feature);

                if (status === 2) { // The user refused to proceed
                    loadSubPage('pro');
                    return;
                }

                loadingDialog.show('propayReady');
            }
            else if (planHasFeature) {

                const {currentSub, currentPlan} = await pro.propay.checkCurrentFeatureStatus(feature);

                if (statusIsNotTrial(currentSub, currentPlan)) {
                    blockerTitle = warningStrings.added_title;
                    blockerText = warningStrings.added_text;
                }
            }
        }

        if (pro.propay.shouldShowTrialBlocker(blockerText, blockerTitle)) {
            blockerTitle = l.free_trial_unavailable;
            blockerText = l.subs_to_make_online_life_x;
            btnLabel = l.subscribe_btn;
            btnLabelCancel = l[82];
            canContinue = true;
        }

        if (blockerText) {
            return {
                blockerTitle,
                blockerText,
                btnLabel,
                btnLabelCancel,
                canContinue,
            };
        }

        return false;
    },

    /**
     * Init S4 Tos checkbox and change states when clicked
     * @param {Boolean} state True setting initial state On
     * @returns {void} void
     */
    initS4TermsCheckbox: (state) => {
        'use strict';

        const $check = $('.s4-tos .checkbox', this.$page);

        const changeState = (state) => {
            if (state) {
                $check.removeClass('checkboxOff').addClass('checkboxOn');
                pro.propay.purchaseButton.termsAccepted = true;
            }
            else {
                $check.addClass('checkboxOff').removeClass('checkboxOn');
                pro.propay.purchaseButton.termsAccepted = false;
            }
            pro.propay.updatePurchaseButton();
        };

        $check.rebind('click.changeState', () => changeState($check.hasClass('checkboxOff')));
        changeState(state);
    },

    showFeatureWarning(title, text, cancelTxt, proceedText) {
        'use strict';


        return new Promise((resolve) => {

            if (!pro.propay.userOnPropayPage()) {
                resolve(-1);
                return;
            }

            let cancel;
            if (cancelTxt) {
                cancel = {
                    label: cancelTxt,
                };
            }

            const dialog = new MDialog({
                cancel,
                ok: {
                    label: proceedText || l[81],
                    callback: () => {
                        resolve(1);
                    }
                },
                onclose: () => {
                    if (pro.propay.userOnPropayPage()) {
                        resolve(2);
                    }
                },
                titleClasses: 'pt-4',
                setContent() {
                    this.title = title;

                    if (is_mobile) {
                        const mobileTextWrapper = document.createElement('div');
                        mobileTextWrapper.append(parseHTML(text));
                        this.slot = mobileTextWrapper;
                    }
                    else {
                        const slot = document.createElement('p');
                        slot.className = 'px-12 information';
                        $(slot).safeHTML(text);
                        this.slot = slot;
                    }
                }
            });

            loadingDialog.hide('propayReady');
            dialog.show();
        });
    },

    updatePurchaseButton() {
        'use strict';
        // Check membership plans loaded
        pro.propay.purchaseButton.$button.toggleClass(
            'disabled',
            !(pro.propay.purchaseButton.canProceedLoaded && pro.propay.purchaseButton.termsAccepted)
        );
    },

    async getUserPlanInfo() {
        'use strict';

        if (!pro.propay.currentPlanData) {
            pro.propay.currentPlanData = await M.getUserPlanInfo().then(({subs, plans}) => {
                return {subs, plans};
            });
        }
    },

    checkUserFeature(planLevel) {
        'use strict';

        if (!pro.propay.currentPlanData) {
            console.error('Must call getUserPlanInfo before checkUserFeature');
            return;
        }

        const {subs, plans} = pro.propay.currentPlanData;

        let currentSub = false;
        let currentSubMobile = false;
        let currentPlan = false;

        for (let i = 0; i < subs.length; i++) {
            const sub = subs[i];
            if ((sub.al + pro.getStandaloneBits(sub.features)) === planLevel) {
                const gateway = sub.gwid;
                if ((gateway === 2) || (gateway === 3)) {
                    currentSubMobile = sub;
                }
                currentSub = sub;
                break;
            }
        }

        if (!currentSub) {
            currentPlan = plans.find((plan) => {
                return (plan.al + pro.getStandaloneBits(plan.features)) === planLevel;
            }) || false;
        }

        return {
            currentSub,
            currentSubMobile,
            currentPlan,
        };

    },

    async checkCurrentFeatureStatus(planLevel) {
        'use strict';

        await pro.propay.getUserPlanInfo();
        return pro.propay.checkUserFeature(planLevel);
    },

    async handleMultipleFeatures(userFeatures) {
        'use strict';

        // Cache the user plan info to avoid multiple API calls
        await pro.propay.getUserPlanInfo();

        return userFeatures.filter(feature => {
            const {currentSub, currentSubMobile} =
                pro.propay.checkUserFeature(pro.propay.planNumsByName[feature]);

            if (currentSub && currentSub.is_trial) {
                return !!currentSubMobile;
            }
            else if (currentSub) {
                return true;
            }
            return false;
        });
    },

    /**
     * Check the current single feature status, and show the warning dialog if needed
     * @param {number} featureNum - The feature number
     * @param {boolean} shouldShowWarning - Whether to show the warning or not
     * @param {string} title - An override for the warning title
     * @param {string} body - An override for the warning body
     * @param {function} resolve - The resolve function for the parent promise
     */
    checkStatusAndShowDialog(featureNum, shouldShowWarning, title, body, resolve) {
        'use strict';

        pro.propay.checkCurrentFeatureStatus(featureNum)
            .then(({currentSub, currentSubMobile}) => {

                if (!shouldShowWarning) {
                    // If the user has a current subscription, and the current subscription is a trial
                    // show the warning if the subscription was made on a mobile device
                    if (currentSub.is_trial) {
                        shouldShowWarning = !!currentSubMobile;
                    }
                    // Else if the user has a current paid subscription, show the warning
                    else if (currentSub) {
                        shouldShowWarning = true;
                    }
                }

                // If the warning should not be shown, or the user has left the payment page, resolve with 0
                if (!shouldShowWarning || !pro.propay.userOnPropayPage()) {
                    resolve(0);
                    return;
                }

                const dialog = new MDialog({
                    ok: {
                        label: l[507],
                        callback: () => {
                            resolve(1);
                            return true;
                        }
                    },
                    onclose: () => {
                        resolve(2);
                    },
                    cancel: {
                        label: l[82],
                        callback: () => {
                            resolve(2);
                        }
                    },
                    titleClasses: 'pt-4',
                    setContent() {
                        this.title = title || pro.propay.warningStrings[featureNum].added_title;
                        const text = body || pro.propay.warningStrings[featureNum].to_disable_text;

                        if (is_mobile) {
                            const mobileTextWrapper = document.createElement('div');
                            mobileTextWrapper.append(parseHTML(text));
                            this.slot = mobileTextWrapper;
                        }
                        else {
                            const slot = document.createElement('p');
                            slot.className = 'px-12';
                            $(slot).safeHTML(text);
                            this.slot = slot;
                        }
                    }
                });

                loadingDialog.hide('propayReady');
                dialog.show();
            }).catch(() => resolve(0));
    },

    /**
     * Checks whether the user has multiple active features, and proceeds to check features and show the warning dialog
     * if needed
     * @param {string | number} feature - The feature name or number
     * @returns {Promise<0|1|2>} // Returns 0 if the feature is not enabled, 1 if OK clicked and 2 if Cancel clicked
     */
    checkMultiFeatures: (feature) => {
        'use strict';

        return new Promise((resolve) => {

            const userFeatures = Array.from(pro.proplan2.getUserFeature());
            const userFeatureCount = userFeatures.length;


            let shouldShowWarning = false;
            let title;
            let body;
            let featureNum;

            // User has multiple active features
            if (userFeatureCount > 1) {
                // Currently awaiting content and logic for this case
                if (userFeatureCount === 2) {
                    // shouldShowWarning = true;
                    pro.propay.handleMultipleFeatures(userFeatures).then((validFeatures) => {

                        // const validFeatures = await
                        const numValidFeatures = validFeatures.length;
                        if (numValidFeatures === 0) {
                            resolve(0);
                            return;
                        }
                        else if (numValidFeatures === 2) {
                            const planNumsByName = pro.propay.planNumsByName;
                            const feature1Name = pro.getProPlanName(planNumsByName[validFeatures[0]]);
                            const feature2Name = pro.getProPlanName(planNumsByName[validFeatures[1]]);
                            shouldShowWarning = true;
                            title = l.already_have_two_features_h
                                .replace('%1', feature1Name)
                                .replace('%2', feature2Name);
                            body = l.already_have_two_features_b
                                .replace('%1', feature1Name)
                                .replace('%2', feature2Name);
                        }
                        else if (numValidFeatures > 2) {
                            // Currently awaiting content and logic for this case, as we only have 2 features so far
                            console.warn('User somehow has more than 2 active features: ', validFeatures);
                        }
                        else {
                            feature = validFeatures[0];
                            featureNum = pro.propay.planNumsByName[feature];
                        }
                        pro.propay.checkStatusAndShowDialog(featureNum, shouldShowWarning, title, body, resolve);
                    });
                }
            }
            else if (pro.proplan2.getUserFeature(feature)) {
                featureNum = typeof feature === 'string' ? pro.propay.planNumsByName[feature] : feature;
                pro.propay.checkStatusAndShowDialog(featureNum, shouldShowWarning, title, body, resolve);
            }
            else {
                resolve(0);
            }
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

        const proNumInt = pro.propay.planNumsByName[pageParts[1]] || parseInt(pageParts[1]);

        // If the Pro Flexi enabled (pf) flag is not on and they're trying to access the page, don't allow
        if (mega.flags && mega.flags.pf !== 1 && proNumInt === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            return false;
        }

        const validNums = new Set([
            ...pro.filter.simple.validPurchases,
            ...pro.filter.simple.validFeatures
        ]);

        // Check the URL has propay_XXX format
        if (validNums.has(proNumInt)) {

            // Get the Pro number e.g. 2 then the name e.g. Pro I - III, Pro Lite, Pro Flexi etc
            pro.propay.planNum = proNumInt;
            pro.propay.planName = pro.getProPlanName(pro.propay.planNum);

            return true;
        }

        return false;
    },

    /**
     * Get the event ID to log for the propay_x page visit
     * @param {Number} planNum The plan number e.g. 1, 2, 3, 4, 11, 12, 13, 101
     * @returns {Number} The event ID to log the propay_x page visit against
     */
    getPropayPageEventId: (planNum) => {
        'use strict';

        switch (planNum) {
            case 1:     // Pro I
                return 500440;
            case 2:     // Pro II
                return 500441;
            case 3:     // Pro III
                return 500442;
            case 4:     // Pro Lite
                return 500439;
            case 11:    // Starter
                return 500436;
            case 12:    // Basic
                return 500437;
            case 13:    // Essential
                return 500438;
            case 101:   // Pro Flexi
                return 500443;
            case 100000: // VPN
                return 500472;
            default:    // Other plan
                return 500473;
        }
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

        // The propage has been abandoned, no need to proceed
        if (typeof page !== 'string' || !page.startsWith('propay')) {
            return false;
        }

        const $placeholderText = $('.loading-placeholder-text', pro.propay.$page);
        const $pricingBox = $('.pricing-page.plan', pro.propay.$page);

        // If an API error (negative number) exit early
        if ((typeof gatewayOptions === 'number') && (gatewayOptions < 0)) {
            $placeholderText.text('Error while loading, try reloading the page.');
            return false;
        }

        // If the user navigated away from the page during loading, do not attempt to render the gateways
        if (!pro.propay.userOnPropayPage()) {
            return false;
        }

        pro.propay.planObjOfChosenLevel = pro.getPlanObj(pro.propay.planNum);

        const checkGateway = (gate) => {
            // If plan is flexi and the gateway doesn't support business(and flexi)
            if (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                if (gate.supportsBusinessPlans !== 1) {
                    return false;
                }
            }
            // If plan is not flexi and the gateway doesn't support individual plans
            else if (typeof gate.supportsIndividualPlans !== 'undefined' && !gate.supportsIndividualPlans) {
                return false;
            }

            // Exclude voucher from list of VPN gateways (TODO: Request a flag from API instead of using gatewayId)
            if (!gate.gatewayId && pro.filter.simple.validFeatures.has(pro.propay.planNum)) {
                return false;
            }

            // If the gateway has a required price, and it is more than the plans max price
            if (gate.minimumEURAmountSupported > pro.getPlanObj(pro.propay.planNum, 1).maxCorrPriceEuro) {
                return false;
            }

            // Gateway supports the current plan
            return gate;
        };

        const addGatewayToObject = (gate) => {
            pro.propay.gatewaysByName[gate.gatewayName] = gate;
        };

        pro.propay.stripeSupported = false;

        var tempGatewayOptions = gatewayOptions.filter((gate) => {
            addGatewayToObject(gate);
            const validGate = checkGateway(gate);
            pro.propay.stripeSupported = pro.propay.stripeSupported || (validGate && validGate.supportsTrial);
            return validGate;
        });

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

        // Cache the duration options list
        const $durationList = $('.duration-options-list', this.$page);

        // Clear the radio options, in case they revisted the page
        $('.payment-duration', $durationList).not('.template').remove();

        const planIsSingleDuration = pro.planInFilter(pro.propay.planNum, 'singleDurationPlans');

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

                    const discount = discountSaveY || pro.getPlanObj(currentPlan).yearlyDiscount;

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

        // Otherwise pre-select the chosen period (from previous page, or storage / transfer
        // quota dialog if a mini plan is shown there)
        // TODO: Handle different durations from different locations in a tidy way
        let selectedPeriod;

        if (sessionStorage.fromOverquotaPeriod) {
            selectedPeriod = sessionStorage.fromOverquotaPeriod;
            delete sessionStorage.fromOverquotaPeriod;
        }
        else {
            selectedPeriod = (sessionStorage['pro.period'] | 0) || 12;
        }

        let $selectedOption = $(`.payment-duration[data-plan-months=${selectedPeriod}]`, $durationList);

        // Otherwise pre-select yearly payment (or monthly if plan is Pro Flexi)
        if (!$selectedOption.length) {
            $selectedOption = $('.payment-duration:not(.template)', $durationList).last();
        }

        const eventId = parseInt(selectedPeriod) === 1 ? 500367 : 500368;
        eventlog(eventId, pro.propay.planName);

        $('input', $selectedOption).prop('checked', true);
        $('.membership-radio', $selectedOption).addClass('checked');
        $('.membership-radio-label', $selectedOption).addClass('checked');

        $(`${is_mobile ? '.pro-payment-block' : '.payment-page.plan-info'} > .payment-period`, this.$page)
            .toggleClass('hidden', planIsSingleDuration);
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
            const planMonths = $this.attr('data-plan-months');

            const $input = $('input', $this);

            if (!$input.prop('checked')) {
                const eventId = parseInt(planMonths) === 1 ? 500369 : 500370;
                eventlog(eventId, pro.propay.planName);
            }

            // Remove checked state on the other buttons
            $('.membership-radio', $durationOptions).removeClass('checked');
            $('.membership-radio-label', $durationOptions).removeClass('checked');
            $('input', $durationOptions).prop('checked', false);

            // Add checked state to just to the clicked one
            $('.membership-radio', $this).addClass('checked');
            $('.membership-radio-label', $this).addClass('checked');
            $input.prop('checked', true);

            // Update the main price and wording for one-time or recurring
            pro.propay.updateMainPrice(planIndex);
            pro.propay.updateTextDependingOnRecurring();

            pro.propay.currentPlanArr = pro.membershipPlans[planIndex];
        });
    },

    updateFeaturePlanDetails() {
        'use strict';
        let storageTxt = '';
        let bandwidthTxt = '';
        let extraTxt = '';

        if (pro.propay.planNum === pro.ACCOUNT_LEVEL_FEATURE_PWM) {
            const planStrings = pro.propay.selectedPlan[pro.UTQA_RES_INDEX_EXTRAS].featureStrings;
            storageTxt = planStrings[0].text;
            bandwidthTxt = planStrings[1].text;
            extraTxt = planStrings[2].text;
        }
        else if (pro.propay.planNum === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
            storageTxt = l.pr_vpn_text1;
            bandwidthTxt = l.pr_vpn_text2;
        }

        pro.propay.$storageAmount.text(storageTxt);
        pro.propay.$bandwidthAmount.text(bandwidthTxt);

        if (extraTxt) {
            pro.propay.$extraFeature.text(extraTxt).removeClass('hidden');
        }

        if (pro.propay.shouldShowTrial()) {
            pro.propay.updateTrialPlanCard(pro.propay.selectedPlan);
            return false;
        }
        return true;
    },

    updateFreeTrialPlanDetails() {
        'use strict';

        const features = pro.featureInfo[pro.propay.planNum];

        if (!features) {
            console.assert(!d, 'Unknown free trial plan:', pro.propay.planNum);
            return false;
        }

        // Remove all direct children except the template
        const $target = pro.propay.$freeTrialTemplate.parent();
        $('> *:not(.template)', $target).remove();

        for (const f of features) {
            const $feature = pro.propay.$freeTrialTemplate.clone().removeClass('hidden template').text(f.text);
            $target.safeAppend($feature.prop('outerHTML'));
        }
    },

    // TODO: Make updateMainPrice(...) not run twice every load
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

        // Get the current plan's storage, formatted as 'x GBs' or 'x TBs', up to 3 decimal places
        const storageValue = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB, 3, 4);

        // Get the current plan's bandwidth, formatted as 'x GBs' or 'x TBs', up to 3 decimal places
        const bandwidthValue = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_TRANSFER] * pro.BYTES_PER_GB, 3, 4);

        // Set selectors
        pro.propay.$pricingBox = $('.pricing-page.plan', this.$page);
        pro.propay.$planName = $('.plan-title', pro.propay.$pricingBox);
        pro.propay.$priceNum = $('.plan-price .price', pro.propay.$pricingBox);
        pro.propay.$pricePeriod = $('.plan-period', pro.propay.$pricingBox);
        pro.propay.$storageAmount = $('.plan-feature.storage', pro.propay.$pricingBox);
        pro.propay.$storageTip = $('i', pro.propay.$storageAmount);
        pro.propay.$bandwidthAmount = $('.plan-feature.transfer', pro.propay.$pricingBox);
        pro.propay.$bandwidthTip = $('i', pro.propay.$bandwidthAmount);
        pro.propay.$euroPrice = $('.euro-price', pro.propay.$pricingBox);
        pro.propay.$currncyAbbrev = $('.plan-currency', pro.propay.$pricingBox);
        pro.propay.$pricePeriodFree = $('.free-trial-period', pro.propay.$pricingBox);
        pro.propay.$freeTrialTemplate = $('.template.free-trial.plan-feature', pro.propay.$pricingBox);
        pro.propay.$extraFeature = $('.plan-feature.extra', pro.propay.$pricingBox).addClass('hidden');

        const {
            $pricingBox, $planName, $priceNum, $pricePeriod, $storageAmount, $storageTip, $bandwidthAmount,
            $bandwidthTip, $euroPrice, $currncyAbbrev
        } = pro.propay;

        var localPrice;

        const initElementSwitcher = () => {
            if (pro.propay.freeTrialCardController) {
                return;
            }

            let trial;
            const $error = $('.error-box-not-stripe', pro.propay.$page);
            const standaloneBits = pro.getStandaloneBits(currentPlan[pro.UTQA_RES_INDEX_EXTRAS].f);

            let $mobileTrial;

            if (is_mobile) {
                $mobileTrial = mobile.propay.createMobilePaymentCard(
                    $('.payment-options .mobile.pro-plan-card-container', this.$page),
                    'pr-payment-card-mob',
                    currentPlan);
            }

            if (!pro.propay.trial) {
                return;
            }

            if (is_mobile) {
                trial = {
                    $element: $mobileTrial,
                    initialised: true,
                };
            }
            else {
                const options = {
                    id: 'propay-free-trial-card',
                    days: pro.propay.trial.days,
                    type: standaloneBits,
                };

                const price = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE] || currentPlan[pro.UTQA_RES_INDEX_PRICE];
                const currency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] || 'EUR';

                trial = {
                    $element: pro.propay.createFreeTrialCard(
                        formatCurrency(price, currency, 'narrowSymbol'),
                        currency,
                        options
                    ),
                    $target: $('.payment-page.info-block.plan-info .free-trial-card-container', pro.propay.$page)
                        .removeClass('hidden'),
                };
            }

            pro.propay.freeTrialCardController = mega.elementSwitcher({
                trial,
                'error': {
                    $element: $error,
                    initialised: true,
                },
                onElementChange: () => {
                    pro.propay.updateMainPageDisplay();
                    if (is_mobile) {
                        mobile.propay.updateMobilePaymentCard(currentPlan, !pro.propay.shouldShowTrial());
                    }
                },

            }, pro.propay.initialPaymentOptionIsStripe ? 'trial' : 'error', 'free-trial-payment-switcher');
        };

        if (pro.propay.trial || is_mobile) {
            initElementSwitcher();
        }

        if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            this.$page.addClass('local-currency');
            $currncyAbbrev.text(localCurrency);
            $euroPrice.text(euroPrice);
            localPrice = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE], localCurrency, 'narrowSymbol');
            if (!is_mobile) {
                $('.local-currency-tip', this.$page).removeClass('hidden');
            }
        }
        else {
            this.$page.removeClass('local-currency');
            $('.local-currency-tip', this.$page).addClass('hidden');
        }

        // If mobile, name at the top
        if (is_mobile) {
            let planNameText;
            const $proCardContainer = $('.mobile.pro-card-container', this.$page);
            const $mobilePlanName = $('.plan-name', $proCardContainer);

            if (pro.propay.shouldShowTrial()) {
                planNameText = mega.icu
                    .format(l.try_plan_free_for_days, currentPlan[pro.UTQA_RES_INDEX_EXTRAS].trial.days)
                    .replace('%1', pro.propay.planName);
            }
            else {
                planNameText = pro.propay.planName;
            }

            $mobilePlanName.text(planNameText);
        }

        // Update the style of the dialog to be Pro I-III or Lite, also change the plan name
        $pricingBox.addClass('pro' + pro.propay.planNum);
        $pricingBox.attr('data-payment', pro.propay.planNum);
        $planName.text(pro.propay.planName);

        // Default to svg sprite icon format icon-crests-pro-x-details
        let iconClass = 'no-icon';
        let updatePrice = true;

        if (pro.planInFilter(pro.propay.planNum, 'validFeatures')) {
            pro.propay.planObj = pro.getPlanObj(currentPlan);
            updatePrice = pro.propay.updateFeaturePlanDetails();
            if (pro.propay.shouldShowTrial()) {
                pro.propay.updateFreeTrialPlanDetails();
            }

            if (pro.propay.planNum === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                iconClass = 'sprite-fm-uni icon-crest-vpn';
            }
        }
        if (updatePrice) {
            if (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_LITE) {
                iconClass = 'sprite-fm-uni icon-crests-lite-details';
            }
            else if (pro.filter.simple.hasIcon.has(pro.propay.planNum)) {
                iconClass = `sprite-fm-uni icon-crests-pro-${pro.propay.planNum}-details`;
            }
            else if (pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                iconClass = 'sprite-fm-uni icon-crests-pro-flexi-details';
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
        }

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

    initThirdSectionSwitcher() {
        'use strict';

        const elements = {
            'regular': {
                $element: $('.third-section.paid-only, .bottom-page .pro-plan', pro.propay.$page),
                initialised: true,
            },
            'feature': {
                $element: $('.third-section.feature-only', pro.propay.$page),
                initialised: true,
            },
        };
        pro.propay.thirdSectionController = mega.elementSwitcher(
            elements,
            pro.planInFilter(pro.propay.planNum, 'validFeatures') ? 'feature' : 'regular',
            'payment-sect-three',
            true);
    },

    updateMainPageDisplay() {
        'use strict';

        const isTrial = !!pro.propay.shouldShowTrial();
        const isFeaturePlan = pro.planInFilter(pro.propay.planNum, 'validFeatures');

        const $page = pro.propay.$page.toggleClass('free-trial', isTrial);

        // Show the free trial elements, and hide the paid only elements
        $('.free-trial:not(.template, .mobile.pro-card-container)', $page).toggleClass('hidden', !isTrial);
        $('.paid-only', $page).toggleClass('hidden', isTrial);

        // Show the VPN specific elements
        if (!pro.propay.thirdSectionController) {
            pro.propay.initThirdSectionSwitcher();
        }
        $('.feature-only', $page).toggleClass('hidden', !isFeaturePlan);
        pro.propay.thirdSectionController.showElement(isFeaturePlan ? 'feature' : 'regular');


        // Update header text with plan
        if (isTrial && pro.propay.$selectedPlanTitleTrial) {
            pro.propay.$selectedPlanTitleTrial.text(mega.icu.format(l.try_plan_free_for_days, pro.propay.trial.days)
                .replace('%1', pro.propay.planName));
        }
        else if (isFeaturePlan) {
            pro.propay.$selectedPlanTitle.text(pro.propay.planName);
        }
        else {
            pro.propay.$selectedPlanTitle.text(l[6976].replace('%1', pro.propay.planName));
        }

        if (is_mobile) {
            $('.mobile.pro-card-container', pro.propay.$page).toggleClass('free-trial', isTrial);
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

        var $paymentAddressDialog = $('.payment-address-dialog', 'body');
        var $numbers;

        // Update whether this selected option is recurring or one-time
        const $selectDurationOption = $('.duration-options-list .membership-radio.checked', this.$page);
        const selectedGatewayName = $('.payment-options-list input:checked', this.$page).val();
        const selectedProvider = pro.propay.gatewaysByName[selectedGatewayName] || false;

        // Set text to subscribe or purchase
        var planIndex = $selectDurationOption.parent().attr('data-plan-index');
        var currentPlan = pro.membershipPlans[planIndex];
        var numOfMonths = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
        var price = formatCurrency(currentPlan[pro.UTQA_RES_INDEX_PRICE]);
        var localPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];

        if (localPrice) {
            price = formatCurrency(localPrice, currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]) + '*';
        }

        // Set the value for whether the plan should renew automatically
        // based on whether the provider supports doing so
        const recurringEnabled = selectedProvider.supportsRecurring;

        // Set text
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

        const isFlexiPlan = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === pro.ACCOUNT_LEVEL_PRO_FLEXI;

        // Show the extra Question 3 recurring option section if the plan being bought
        // is Pro Flexi (forced recurring)
        $('.renewal-option', this.$page).toggleClass('hidden', !isFlexiPlan);

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
        else if (!pro.propay.shouldShowTrial()) {
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


        // If plan is monthly only trial, and recurring:
        if (pro.propay.trial
            && !pro.getPlan(pro.propay.planNum, 12)
            && (numOfMonths === 1)
            && recurringEnabled
            && pro.propay.shouldShowTrial()) {

            $subscriptionInstructions.removeClass('hidden')
                .safeHTML(mega.icu.format(l.after_days_card_charged_m, pro.propay.trial.days) + ' ' + l['10630']);
        }
        // Elif recurring, always show recurring info box above the Pro pay page Purchase button and init click handler
        else if (recurringEnabled && !is_mobile) {
            $subscriptionInstructions.removeClass('hidden').safeHTML(l['10637'] + ' ' + l['10630']);
        }
        else {
            // Otherwise hide it
            $subscriptionInstructions.addClass('hidden');
        }

        // If discount with compulsory subscription or Pro Flexi, hide the No option so it'll be forced recurring
        if ((discountInfo && discountInfo.cs) || isFlexiPlan) {
            $('.renewal-options-list .renewal-option', this.$page).last().addClass('hidden');
        }

        // Update depending on recurring or one off payment
        $('.choose-renewal .duration-text', this.$page).text(autoRenewMonthOrYearQuestion);
        $('.charge-information', this.$page).text(chargeInfoDuration);
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
     * Render the payment providers as radio buttons
     * @param {Object} gatewayOptions The list of gateways from the API
     * @param {String} primaryOrSecondary Which list to render the gateways into i.e. 'primary' or 'secondary'
     */
    renderPaymentProviderOptions: function(gatewayOptions, primaryOrSecondary) {

        // Get their plan price from the currently selected duration radio button
        var selectedPlanIndex = $('.duration-options-list .membership-radio.checked', 'body')
            .parent().attr('data-plan-index');
        pro.propay.selectedPlan = pro.membershipPlans[selectedPlanIndex];
        var selectedPlanNum = pro.propay.selectedPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
        var selectedPlanPrice = pro.propay.selectedPlan[pro.UTQA_RES_INDEX_PRICE];

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
            if ((gatewayOpt.supportsExpensivePlans === 0) && pro.filter.simple.supportsExpensive.has(selectedPlanNum)) {
                $gateway.addClass('hidden');
                $gateway.attr('title', l[7162]);
            }

            // If the voucher/balance option
            if ((gatewayId === 0) && (balanceFloat >= planPriceFloat)) {

                // Show "Balance (x.xx)" if they have enough to purchase this plan
                displayName = l[7108] + ' (' + balanceFloat.toFixed(2) + ' \u20ac)';
            }

            // Create a radio button with icon for each payment gateway
            $gateway.removeClass('template').attr('eventid', pro.getPaymentEventId(gatewayName));
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

            const $input = $('input', $this);

            if (!$input.prop('checked')) {
                eventlog($this.attr('eventid'), pro.propay.planName);
            }

            // Remove checked state from all radio inputs
            $('.membership-radio', $paymentOptionsList).removeClass('checked');
            $('.provider-details', $paymentOptionsList).removeClass('checked');
            $('input', $paymentOptionsList).prop('checked', false);

            // Add checked state for this radio button
            $input.prop('checked', true);
            $('.membership-radio', $this).addClass('checked');
            $('.provider-details', $this).addClass('checked');

            if (pro.propay.trial && pro.propay.freeTrialCardController) {
                const selectedProvider = pro.propay.gatewaysByName[$input.val()];
                pro.propay.freeTrialCardController.showElement(selectedProvider.supportsTrial
                    ? 'trial'
                    : 'error');
            }

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

        const preSelectedProvider = $('.payment-options-list .membership-radio.checked input', '.fmholder').val();
        pro.propay.initialPaymentOptionIsStripe = pro.propay.gatewaysByName[preSelectedProvider].supportsTrial;
    },

    /**
     * Preselects the payment option in the list of payment providers. Pro balance should be selected first if
     * they have a balance, otherwise the next payment provider should be selected (which is usually Visa)
     */
    preselectPaymentOption: function() {

        'use strict';

        // Find the primary payment options
        var $payOptions = $(
            '.payment-options-list.primary .payment-method:not(.template)',
            '.fmholder:not(.hidden)'
        );

        let $option = null;

        if (pro.propay.trial) {
            let stripePaymentFound = false;
            let counter = 0;
            const numberOfOptions = $payOptions.length;

            while (!stripePaymentFound && (counter++ < numberOfOptions)) {
                const $payOption = $payOptions.eq(counter - 1);
                const gatewayName = $('input', $payOption).val();
                const gateway = pro.propay.gatewaysByName[gatewayName];

                stripePaymentFound = !!gateway.supportsTrial;
                if (stripePaymentFound) {
                    $option = $payOption;
                }
            }
        }

        // If they have a Pro balance, select the first option, otherwise select
        // the next payment option (usually API will have it ordered to be Visa)
        if (!$option) {
            $option = parseFloat(pro.propay.proBalance) > 0
                ? $payOptions.first()
                : $payOptions.length > 1 ? $payOptions.eq(1) : $payOptions.eq(0);
        }

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

    createFreeTrialCard(formattedPrice, curr, information) {
        'use strict';
        information = information || Object.create(null);
        if (!formattedPrice || !curr) {
            return false;
        }

        const steps = {
            1: {    // VPN Feature (bits)
                0: l.unlock_secure_browsing,
                5: l.email_before_trial_end,
                7: l.sub_start_d_can_cancel,
            },
            2: {    // PWM Feature (bits)
                0: l.free_trial_today_desc,
                10: l.email_before_trial_end,
                14: l.free_trial_end_desc,
            }
        };

        // Just in case this is accidentally called multiple times for the same element, or to update an element
        if (information.id) {
            $('#' + information.id).remove();
        }

        information.days = information.days || 7;
        information.id = information.id || makeid(10);
        information.startDate = information.startDate
            || time2date((Date.now() / 1000) + information.days * 24 * 60 * 60, 2);

        const $template = mega.templates.getTemplate('free-trial-card-temp')
            .addClass(information.type + information.classList);

        const priceText = mega.icu.format(l.days_free_then_price_m, information.days)
            .replace('%1', formattedPrice + (curr === 'EUR' ? '' : '*'))
            .replace('%2', curr);

        const strings = steps[information.type] || steps.vpn;
        const stringKeys = Object.keys(strings);
        strings[stringKeys[stringKeys.length - 1]] = strings[stringKeys[stringKeys.length - 1]]
            .replace('%1', information.startDate);

        for (let i = 0; i < stringKeys.length; i++) {
            const $infoBlock = $('.step' + i, $template);
            $('.content', $infoBlock).text(strings[stringKeys[i]]).removeClass('hidden');
            $('.when', $infoBlock).text(i === 0
                ? l[1301]
                : mega.icu.format(l.on_day_n, stringKeys[i]));
        }

        $('.price', $template).text(priceText);

        return $template;
    },

    updateTrialPlanCard(plan) {
        'use strict';
        const price = plan[pro.UTQA_RES_INDEX_LOCALPRICE] || plan[pro.UTQA_RES_INDEX_PRICE];
        const currency = plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] || 'EUR';
        const formattedPrice = formatCurrency(price, currency, 'narrowSymbol');
        pro.propay.$planName.text(l.free_trial_caps);
        pro.propay.$priceNum.text(formatCurrency(0, currency, 'narrowSymbol'));
        pro.propay.$pricePeriodFree.safeHTML(
            mega.icu.format(l.then_price_m_after_n_days, pro.propay.trial.days)
                .replace('%1', formattedPrice)
                .replace('%2', currency)
        );
        $('.asterisk', pro.propay.$pricePeriodFree).toggleClass('hidden', currency === 'EUR');
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

        // Add S4 parameters
        const s4Flexi = window.s4ac && pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI;

        if (window.s4ac && pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            utsRequest.ac = window.s4ac;
            utsRequest.s4 = 1;
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

                // If the provider supports recurring payments set extra.recurring as true
                extra.recurring = true;
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

                // Get S4 error messages
                if (s4Flexi && (errorMessage = ActivateS4.instance.invalidCodeMsg(ex))) {
                    delete window.s4ac;
                }
                // Handle specific discount errors
                else if (ex === EEXPIRED) {
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

    redeemFreeTrial() {

        'use strict';

        pro.propay.showLoadingOverlay();

        if (!(pro.propay.proPaymentMethod.toLowerCase().indexOf('stripe') === 0)) {
            console.error('redeemFreeTrial: Invalid payment method:', pro.propay.proPaymentMethod);
            return;
        }

        pro.lastPaymentProviderId = addressDialog.gatewayId_stripe;

        const rftRequest = {
            a: 'rft',
            it: pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_ITEMNUM],
            id: pro.propay.selectedProPackage[pro.UTQA_RES_INDEX_ID],
            gw: addressDialog.gatewayId_stripe,
            extra: addressDialog.extraDetails,
        };

        return api.screq(rftRequest).then(({result}) => {
            pro.propay.trial.trialId = result.id;
            addressDialog.processUtcResult({'EUR': result.url}, true, result.id);
        }).catch((ex) => {
            reportError(ex);
            pro.propay.hideLoadingOverlay();
            tell(ex < 0 ? api_strerror(ex) : ex);
        });
    },

    /**
     * Process results from the API User Transaction Complete call
     * @param {Object|Number} utcResult The results from the UTC call or a negative number on failure
     * @param {String}        saleId    The saleIds of the purchase.
     */
    async processUtcResults(utcResult, saleId) {
        'use strict';

        const welDlgAttr =
            parseInt(await Promise.resolve(mega.attr.get(u_handle, 'welDlg', -2, true)).catch(nop)) | 0;

        // If the user has purchased a subscription and they haven't seen the welcome dialog before (
        // u_attr[^!welDlg] = 0), set welDlg to 1 which will show it when the psts notification arrives.
        // If the payment fails the welcome dialog will check if the user has a pro plan, and as such should still
        // work as expected.
        if (!welDlgAttr) {
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
    },

    showAccountRequiredDialog() {
        'use strict';

        if (is_mobile) {
            login_next = page;
            mobile.proSignupPrompt.init();
            return;
        }

        if (!pro.propay.accountRequiredDialog) {
            pro.propay.accountRequiredDialog = new mega.ui.Dialog({
                className: 'loginrequired-dialog',
                focusable: false,
                expandable: false,
                requiresOverlay: true,
                title: l[5841],
            });
        }
        else {
            pro.propay.accountRequiredDialog.visible = false; // Allow it to go through the show() motions again
        }

        pro.propay.accountRequiredDialog.bind('onBeforeShow', () => {
            const $dialog = pro.propay.accountRequiredDialog.$dialog;

            $dialog.addClass('with-close-btn');

            let loginProceed = false;
            $('.pro-login', $dialog).rebind('click.loginrequired', () => {
                loginProceed = true;
                pro.propay.accountRequiredDialog.hide();
                showLoginDialog();

                onIdle(() => eventlog(500512));

                return false;
            });

            $('header p', $dialog).text(l[5842]);

            $('button.close.js-close', $dialog).rebind('click.closeDialog', () => {
                delay('login-dlg-x.log', eventlog.bind(null, 500514));
            });

            $('.pro-register', $dialog).rebind('click.loginrequired', () => {
                loginProceed = true;
                pro.propay.accountRequiredDialog.hide();
                if (u_wasloggedin()) {
                    var msg = l[8743];
                    msgDialog('confirmation', l[1193], msg, null, res => {
                        if (res) {
                            showRegisterDialog();
                        }
                        else {
                            showLoginDialog();
                        }
                    });
                }
                else {
                    showRegisterDialog();
                }

                delay('create-acc-btn.log', eventlog.bind(null, 500513));

                return false;
            });

            pro.propay.accountRequiredDialog.rebind('onHide', () => {
                if (!loginProceed) {
                    loadSubPage('pro');
                }
            });
        });

        pro.propay.accountRequiredDialog.show();

        onIdle(() => eventlog(500511));
    },
};
mBroadcaster.once('login2', () => {
    'use strict';
    delay('ShowDiscountOffer', pro.propay.showDiscountOffer, 5000);
});

// Lazy load, as locale.js has not yet run
lazy(pro.propay, 'warningStrings', () => {
    'use strict';
    return {
        [pro.ACCOUNT_LEVEL_FEATURE_VPN]: {
            is_attached_text: l.vpn_is_attached_text,
            added_text: l.vpn_added_text,
            added_title: l.vpn_added_title,
            to_disable_text: l.vpn_to_disable_text,
        },
        [pro.ACCOUNT_LEVEL_FEATURE_PWM]: {
            is_attached_text: l.pwm_is_attached_text,
            added_text: l.pwm_added_text,
            added_title: l.pwm_added_title,
            to_disable_text: l.pwm_to_disable_text,
        },
    };
});
