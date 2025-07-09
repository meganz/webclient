/**
 * Common functionality for both the Pro pages (Step 1 and Step 2). Some functions e.g.
 * getProPlanName() and getPaymentGatewayName() may be used from other places not just the Pro pages.
 */
var pro = {

    /** An array of the possible membership plans from the API */
    membershipPlans: [],
    conversionRate: 0,

    lastLoginStatus: -99, // a var to store the user login status when prices feteched

    /** The last payment provider ID used */
    lastPaymentProviderId: null,

    /* Constants for the array indexes of the membership plans (these are from the API 'utqa' response) */
    UTQA_RES_INDEX_ID: 0,
    UTQA_RES_INDEX_ACCOUNTLEVEL: 1,
    UTQA_RES_INDEX_STORAGE: 2,
    UTQA_RES_INDEX_TRANSFER: 3,
    UTQA_RES_INDEX_MONTHS: 4,
    UTQA_RES_INDEX_PRICE: 5,
    UTQA_RES_INDEX_CURRENCY: 6,
    UTQA_RES_INDEX_MONTHLYBASEPRICE: 7,
    UTQA_RES_INDEX_LOCALPRICE: 8,
    UTQA_RES_INDEX_LOCALPRICECURRENCY: 9,
    UTQA_RES_INDEX_LOCALPRICECURRENCYSAVE: 10,
    UTQA_RES_INDEX_ITEMNUM: 11,
    //
    //
    // These slots are used by flexi, documentation needed for correct naming
    //
    //
    UTQA_RES_INDEX_EXTRAS: 16,

    /* Constants for special Pro levels */
    ACCOUNT_LEVEL_STARTER: 11,
    ACCOUNT_LEVEL_BASIC: 12,
    ACCOUNT_LEVEL_ESSENTIAL: 13,
    ACCOUNT_LEVEL_PRO_LITE: 4,
    ACCOUNT_LEVEL_PRO_I: 1,
    ACCOUNT_LEVEL_PRO_II: 2,
    ACCOUNT_LEVEL_PRO_III: 3,
    ACCOUNT_LEVEL_PRO_FLEXI: 101,
    ACCOUNT_LEVEL_BUSINESS: 100,

    /* Account levels for features. If new combinations are added, please make the order in the name alphabetical */
    ACCOUNT_LEVEL_FEATURE: 99999,
    ACCOUNT_LEVEL_FEATURE_VPN: 100000,  // VPN
    ACCOUNT_LEVEL_FEATURE_PWM: 100001,  // Password Manager
    ACCOUNT_LEVEL_FEATURE_P_V: 100002,  // Combination of VPN and Password Manager

    /* Account statuses for Business and Pro Flexi accounts */
    ACCOUNT_STATUS_EXPIRED: -1,
    ACCOUNT_STATUS_ENABLED: 1,
    ACCOUNT_STATUS_GRACE_PERIOD: 2,

    /* Number of bytes for conversion, as we recieve GB for plans, and use bytes for sizing */
    BYTES_PER_GB: 1024 * 1024 * 1024,
    BYTES_PER_TB: 1024 * 1024 * 1024 * 1024,

    // Plans that have a single duration. {key: planAccountLevel, value: durationAvailable}
    singleDurationPlans: null,

    bfStandalone: null,

    blockPlans: null,

    taxInfo: null,

    /**
     * Determines if a Business or Pro Flexi account is expired or in grace period
     * @param {Number} accountStatus The account status e.g. from u_attr.b.s (Business) or u_attr.pf.s (Pro Flexi)
     * @returns {Boolean} Returns true if the account is expired or in grace period
     */
    isExpiredOrInGracePeriod: function(accountStatus) {
        'use strict';

        return [this.ACCOUNT_STATUS_EXPIRED, this.ACCOUNT_STATUS_GRACE_PERIOD].includes(accountStatus);
    },

    applyDevSettings() {

        'use strict';

        // Avoid checking localStorage repeatedly if dev options are not enabled
        const allowLocal = localStorage.blockLocal !== '1';
        const blockFreeTrial = localStorage.blockFreeTrial
            && new Set(localStorage.blockFreeTrial.split(',').map(n => +n));

        pro.membershipPlans = pro.membershipPlans.map((plan) => {
            if (!allowLocal) {
                plan[pro.UTQA_RES_INDEX_LOCALPRICE] = null;
                plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] = null;
                plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCYSAVE] = null;
            }

            if (pro.blockPlans && pro.blockPlans.has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])) {
                return null;
            }

            if (blockFreeTrial && blockFreeTrial.has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])) {
                plan[pro.UTQA_RES_INDEX_EXTRAS].trial = false;
            }

            return plan;

        }).filter(p => p);
    },

    resetCaching() {
        'use strict';
        pro.singleDurationPlans = Object.create(null);
        pro.planSearch.reset();
    },

    divideAllBy100(obj, excl) {
        'use strict';

        excl = excl || [];

        for (const key of Object.keys(obj)) {
            if (!excl.includes(key)) {
                obj[key] /= 100;
            }
        }

        return obj;
    },

    /**
     * Load pricing plan information from the API. The data will be loaded into 'pro.membershipPlans'.
     * @param {Function} loadedCallback The function to call when the data is loaded
     */
    loadMembershipPlans: async function(loadedCallback) {
        "use strict";

        // Set default
        loadedCallback = loadedCallback || function() { };

        // If this data has already been fetched, re-use it and run the callback function
        if (pro.membershipPlans.length > 0 && !(!pro.lastLoginStatus && u_type > 0)) {
            loadedCallback();
        }
        else {
            // Get the membership plans.
            const payload = {a: 'utqa', nf: +mega.utqav, p: 1, ft: 1};

            await api.req({a: 'uq', pro: 1, gc: 1})
                .then(({result: {balance}}) => {
                    if (balance) {
                        balance = balance.length && parseFloat(balance[0][0]);

                        if (balance >= 4.99 && balance <= 9.98) {
                            payload.r = 1;
                        }
                    }
                })
                .catch(dump);

            return api.req(payload)
                .then(({result: results}) => {
                    pro.resetCaching();

                    // The rest of the webclient expects this data in an array format
                    // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
                    var plans = [];
                    var maxPlan = null;
                    var minPlan = null;
                    var lmbps = {};
                    const durationsChecked = new Set();

                    pro.blockPlans = d && localStorage.blockPlans && new Set(localStorage.blockPlans.split(','));

                    const {txn, tx, txva, l, txe} = results[0];

                    const conversionRate = l.lc === "EUR" ? 1 : l.exch;

                    const taxInfo = !!(txn && (tx !== undefined)) && (txva !== undefined) && !txe && {
                        taxName: txn,
                        taxPercent: tx / 100,
                        variant: txva,
                    };

                    pro.taxInfo = taxInfo;

                    for (var i = 1; i < results.length; i++) {

                        let discount = 0;

                        if (results[i].m === 1) {
                            lmbps[results[i].mbp] = results[i].lp;
                        }
                        else {
                            discount = lmbps[results[i].mbp] * results[i].m - results[i].lp;
                        }

                        results[i].f = results[i].f || false;
                        results[i].trial = results[i].trial || false;

                        if (results[i].al === pro.ACCOUNT_LEVEL_FEATURE) {
                            if (!results[i].f) {
                                console.error('Feature level plan without features given from API', results[i]);
                                continue;
                            }
                            results[i].al += pro.getStandaloneBits(results[i].f);
                        }

                        // Check if the plan only has a single duration
                        const planDuration = results[i].m;
                        const planLevel = results[i].al;
                        if (durationsChecked.has(planLevel)) {
                            delete pro.singleDurationPlans[planLevel];
                        }
                        else {
                            pro.singleDurationPlans[planLevel] = planDuration;
                            durationsChecked.add(planLevel);
                        }

                        const trialStrings = this.featureInfo[results[i].al + '-trial'];
                        const featureStrings = this.featureInfo[results[i].al];

                        results[i].featureStrings = featureStrings || false;
                        results[i].trialStrings = trialStrings || false;


                        // If this is Pro Flexi, the data is structured similarly to business, so set that manually
                        if (results[i].al === pro.ACCOUNT_LEVEL_PRO_FLEXI) {

                            const {sto, trns, ba} = results[i].bd;
                            const {p, pn, lp, lpn} = (ba || Object.create(null));

                            let localStoragePrice;
                            let euroStoragePrice;
                            let localTransferPrice;
                            let euroTransferPrice;

                            // localPrice may be undefined, this is expected, and can cause bugs if changed
                            const localPrice = (taxInfo && lpn) ? lpn : lp;
                            const price = (taxInfo && pn) ? pn : p;

                            if (sto) {
                                const {p, pn, lp, lpn} = sto;
                                localStoragePrice = (taxInfo && lpn) ? lpn : lp;
                                euroStoragePrice = (taxInfo && pn) ? pn : p;
                            }
                            if (trns) {
                                const {p, pn, lp, lpn} = trns;
                                localTransferPrice = (taxInfo && lpn) ? lpn : lp;
                                euroTransferPrice = (taxInfo && pn) ? pn : p;
                            }

                            plans.push([
                                results[i].id,              // id
                                results[i].al,              // account level
                                results[i].bd.ba.s,         // base storage
                                results[i].bd.ba.t,         // base transfer
                                results[i].m,               // months
                                price  / 100,  // base price
                                results[0].l.c,             // currency
                                price  / 100,  // monthly base price
                                localPrice / 100,  // local base price
                                results[0].l.lc,            // local price currency
                                0,                          // local price save
                                results[i].it,              // item (will be 1 for business / Pro Flexi)
                                euroStoragePrice / 100,  // extra storage rate
                                localStoragePrice / 100, // extra storage local rate
                                euroTransferPrice / 100,  // extra transfer rate
                                localTransferPrice / 100,    // extra transfer local rate
                                {                       // Extra information about the plan from API, such as features
                                    f: results[i].f,    // Features object, or false if none
                                    trial: results[i].trial,
                                    trialStrings: results[i].trialStrings,
                                    featureStrings: results[i].featureStrings,
                                    taxInfo: !!(taxInfo && p && pn)
                                        && {p, pn, lp, lpn},
                                },
                            ]);
                        }
                        else {
                            // Otherwise for PRO I - III and PRO Lite set as so
                            const {pn, lpn, p, lp, mbp, mbpn} = results[i];
                            const price = (taxInfo && pn) ? pn : p;
                            // localPrice may be undefined, this is expected, and can cause bugs if changed
                            const localPrice = (taxInfo && lpn) ? lpn : lp;
                            plans.push([
                                results[i].id,          // id
                                results[i].al,          // account level
                                results[i].s,           // storage
                                results[i].t,           // transfer
                                results[i].m,           // months
                                price / 100,            // price
                                results[0].l.c,         // currency
                                results[i].mbp / 100,   // monthly base price
                                localPrice / 100,       // local price
                                results[0].l.lc,        // local price currency
                                discount / 100,         // local price save
                                results[i].it,          // item (will be 0 for user)
                                undefined,              // Slot used by flexi only
                                undefined,              // Slot used by flexi only
                                undefined,              // Slot used by flexi only
                                undefined,              // Slot used by flexi only
                                {                       // Extra information about the plan from API, such as features
                                    f: results[i].f,    // Features object, or false if none
                                    trial: results[i].trial,
                                    trialStrings: results[i].trialStrings,
                                    featureStrings: results[i].featureStrings,
                                    taxInfo: !!(taxInfo && p && pn && mbp && mbpn)
                                            && {p, pn, mbp, mbpn, lp, lpn},
                                },
                            ]);
                        }
                        if (!pro.blockPlans || !pro.blockPlans.has(results[i].al)) {
                            pro.planObjects.createPlanObject(plans[plans.length - 1], results[i]);
                            pro.planSearch.addPlanToSearch(plans[plans.length - 1]);
                            if (results[i].m === 1 && results[i].it !== 1) {
                                if (!maxPlan || maxPlan[2] < results[i].s) {
                                    maxPlan = plans[plans.length - 1];
                                }
                                if (!minPlan || minPlan[2] > results[i].s) {
                                    minPlan = plans[plans.length - 1];
                                }
                            }
                        }
                    }

                    // Store globally
                    pro.membershipPlans = plans;
                    if (d && localStorage.useDevOptions) {
                        pro.applyDevSettings();
                    }

                    if (localStorage.ignoreTrial) {
                        for (let i = 0; i < pro.membershipPlans.length; i++) {
                            pro.membershipPlans[i][pro.UTQA_RES_INDEX_EXTRAS].trial = false;
                        }

                        pro.propay.ignoreTrial = true;
                        delete localStorage.ignoreTrial;
                    }

                    pro.lastLoginStatus = u_type;
                    pro.maxPlan = maxPlan;
                    pro.minPlan = minPlan;
                    pro.conversionRate = conversionRate;
                    pro.filter.dynamic.singleDurationPlans = new Set(
                        // Sets are made from numbers, so convert the keys back to numbers
                        Object.keys(pro.singleDurationPlans).map(level => level | 0));

                    // Initialize the filtered plans
                    pro.initFilteredPlans();
                    // Run the callback function
                    loadedCallback();
                });
        }
    },

    /**
     * Redirect to the site.
     * @param {String} topage Redirect to this page of our site.
     */
    redirectToSite: function(topage) {
        'use strict';

        // On mobile just load the main account page as there is no payment history yet
        topage = topage || (is_mobile ? 'fm/account' : 'fm/account/plan');

        // Make sure it fetches new account data on reload
        // and redirect to account page to show purchase
        if (M.account) {
            M.account.lastupdate = 0;

            // If pro page is opened from account/plan update M.currentdirid to force call openfolder
            M.currentdirid = String(M.currentdirid).substr(0, 7) === 'account' ? false : M.currentdirid;
        }

        loadSubPage(topage);
    },

    /**
     * Show the payment result of success or failure after coming back from a provider
     * @param {String} verifyUrlParam The URL parameter e.g. 'success' or 'failure'
     */
    showPaymentResult: function(verifyUrlParam) {
        'use strict';

        var $backgroundOverlay = $('.fm-dialog-overlay');
        var $pendingOverlay = $('.payment-result.pending.alternate');
        var $failureOverlay = $('.payment-result.failed');

        // Show the overlay
        $backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // On successful payment
        if (verifyUrlParam === 'success') {

            // Show the success
            $pendingOverlay.removeClass('hidden');

            insertEmailToPayResult($pendingOverlay);

            if (!u_type || u_type !== 3) {
                $pendingOverlay.find('.payment-result-button, .payment-close').addClass('hidden');
            }
            else {
                $pendingOverlay.find('.payment-result-button, .payment-close').removeClass('hidden');

                // Add click handlers for 'Go to my account' and Close buttons
                $pendingOverlay.find('.payment-result-button, .payment-close').rebind('click', function () {

                    // Hide the overlay
                    $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                    $pendingOverlay.addClass('hidden');

                    pro.redirectToSite();
                });
            }
        }
        else {
            // Show the failure overlay
            $failureOverlay.removeClass('hidden');

            // On click of the 'Try again' or Close buttons, hide the overlay
            $failureOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

                // Hide the overlay
                $backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
                $failureOverlay.addClass('hidden');
                if (u_attr && u_attr.b) {
                    loadSubPage('registerb');
                }
                else {
                    loadSubPage('pro');
                }
            });
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
            if (pro.lastPaymentProviderId === bitcoinDialog.gatewayId) {
                loadSubPage('fm/account/plan');
            }
        }
    },

    /**
     * Get a string for the payment plan number
     * @param {Number} planNum The plan number e.g. 1, 2, 3, 4, 100, 101, undefined
     * @returns {String} The plan name i.e. Pro I, Pro II, Pro III, Pro Lite, Business, Pro Flexi, Free (default)
     */
    getProPlanName: function(planNum) {

        switch (planNum) {
            case 1:
                return l[5819];                                 // Pro I
            case 2:
                return l[6125];                                 // Pro II
            case 3:
                return l[6126];                                 // Pro III
            case 4:
                return l[8413];                                 // Pro Lite
            case 11:
                return l.plan_name_starter;                     // Starter
            case 12:
                return l.plan_name_basic;                       // Basic
            case 13:
                return l.plan_name_essential;                   // Essential
            case 100:
                return l[19530];                                // Business
            case 101:
                return l.pro_flexi_name;        // Pro Flexi
            case pro.ACCOUNT_LEVEL_FEATURE_VPN: // 100000
                return l.mega_vpn;              // VPN
            case pro.ACCOUNT_LEVEL_FEATURE_PWM: // 100001
                return l.mega_pwm;              // Password Manager
            default:
                return l[1150];                 // Free
        }
    },

    /**
     * Returns the name of the gateway / payment provider and display name. The API will only
     * return the gateway ID which is unique on the API and will not change.
     *
     * @param {Number} gatewayId The number of the gateway/provider from the API
     * @returns {Object} Returns an object with two keys, the 'name' which is a unique string
     *                   for the provider which can be used for displaying icons etc, and the
     *                   'displayName' which is the translated name for that provider (however
     *                   company names are not translated).
     */
    getPaymentGatewayName(givenId, gatewayOpt) {
        'use strict';
        let walletType;
        let gatewayId;

        if (Array.isArray(givenId)) {
            gatewayId = givenId[0];
            walletType = givenId[1];
        }
        else {
            gatewayId = givenId;
        }


        var gateways = {
            0: {
                name: 'voucher',
                displayName: l[487]     // Voucher code
            },
            1: {
                name: 'paypal',
                displayName: l[1233]    // PayPal
            },
            2: {
                name: 'apple',
                displayName: 'Apple'
            },
            3: {
                name: 'google',
                displayName: 'Google'
            },
            4: {
                name: 'bitcoin',
                displayName: l[6802]    // Bitcoin
            },
            5: {
                name: 'dynamicpay',
                displayName: l[7109]    // UnionPay
            },
            6: {
                name: 'fortumo',
                displayName: l[7219] + ' (' + l[7110] + ')'    // Mobile (Fortumo)
            },
            7: {
                name: 'stripe',
                displayName: l[7111]    // Credit Card
            },
            8: {
                name: 'perfunctio',
                displayName: l[7111]    // Credit Card
            },
            9: {
                name: 'infobip',
                displayName: l[7219] + ' (Centilli)'    // Mobile (Centilli)
            },
            10: {
                name: 'paysafecard',
                displayName: 'paysafecard'
            },
            11: {
                name: 'astropay',
                displayName: 'AstroPay'
            },
            12: {
                name: 'reserved',
                displayName: 'reserved' // TBD
            },
            13: {
                name: 'windowsphone',
                displayName: l[8660]    // Windows Phone
            },
            14: {
                name: 'tpay',
                displayName: l[7219] + ' (T-Pay)'       // Mobile (T-Pay)
            },
            15: {
                name: 'directreseller',
                displayName: l[6952]    // Credit card
            },
            16: {
                name: 'ecp',                    // E-Comprocessing
                displayName: l[6952] + ' (ECP)' // Credit card (ECP)
            },
            17: {
                name: 'sabadell',
                displayName: 'Sabadell'
            },
            19: {
                name: 'Stripe2',
                displayName: l[6952] + ' (Stripe)' // Credit card (Stripe)
            },
            999: {
                name: 'wiretransfer',
                displayName: l[6198]    // Wire transfer
            }
        };

        const wallets = {
            'google_pay': {
                name: 'google',
                displayName: 'Google Pay',
            },
            'apple_pay': {
                name: 'apple',
                displayName: 'Apple Pay',
            },
            'ideal': {
                name: 'ideal',
                displayName: 'iDEAL',
            },
        };

        if (wallets[walletType]) {
            return wallets[walletType];
        }

        // If the gateway option information was provided we can improve the default naming in some cases
        if (typeof gatewayOpt !== 'undefined') {
            if (typeof gateways[gatewayId] !== 'undefined') {
                // Subgateways should always take their subgateway name from the API if provided
                gateways[gatewayId].name =
                    (gatewayOpt.type === 'subgateway') ? gatewayOpt.gatewayName : gateways[gatewayId].name;

                // Direct reseller still requires the translation from above to be in its name
                if (gatewayId === 15 && gatewayOpt.type !== 'subgateway') {
                    gateways[gatewayId].displayName = gateways[gatewayId].displayName + " " + gatewayOpt.displayName;
                }
                else {
                    gateways[gatewayId].displayName =
                        (gatewayOpt.type === 'subgateway') ? gatewayOpt.displayName : gateways[gatewayId].displayName;
                }

                // If in development and on staging, add some extra info for seeing which provider E.g. ECP/Sabadell/AP
                // mega.flags.bid can be passed from API to ask us to turn on "extra info" showing for providers.
                if (d && (apipath === 'https://staging.api.mega.co.nz/' || mega.flags.bid)) {
                    gateways[gatewayId].displayName += ' (via ' + gateways[gatewayId].name + ')';
                }
            }
        }

        // If the gateway exists, return it
        if (typeof gateways[gatewayId] !== 'undefined') {
            return gateways[gatewayId];
        }

        // Otherwise return a placeholder for currently unknown ones
        return {
            name: 'unknown',
            displayName: 'Unknown'
        };
    },

    /**
     * Returns the event ID for the payment method.
     *
     * @param {String} gatewayCode The code of the gateway/provider from the API
     * @returns {Number} the event ID to log clicks against.
     */
    getPaymentEventId: (gatewayCode) => {
        'use strict';

        switch (gatewayCode) {
            case 'ecpVI': // Visa - ECP
            case 'stripeVI': // Visa - Stripe
                return 500359;
            case 'ecpMC': // Mastercard - ECP
            case 'stripeMC': // Mastercard - Stripe
                return 500360;
            case 'stripeAE': // American Express - Stripe
                return 500361;
            case 'stripeJC': // JCB - Stripe
                return 500362;
            case 'stripeUP': // China UnionPay - Stripe
                return 500363;
            case 'Stripe': // Stripe
                return 500364;
            case 'bitcoin': // Bitcoin
                return 500365;
            case 'voucher': // Voucher code
                return 500366;
            default: // return 500374 if a particular gateway isn't tied to an event ID
                return 500374;
        }
    },

    /**
     * Update the pro page depending on if the user can see the "exclusive offer" tab
     * (mini plans) or not.
     *
     * If they can, fill in the empty low tier plan feature table cells (plan title and
     * storage and transfer quotas).
     *
     * Otherwise, delete the low tier plans flag, hide the "exclusive offer" tab and
     * show the user a dialog/sheet.
     *
     * @param {Boolean} canSeeMiniPlans
     * @returns {void}
     */
    updateLowTierProPage(canSeeMiniPlans) {
        'use strict';

        if (canSeeMiniPlans) {
            pro.proplan2.updateTabs();
        }
        else {
            const showProPlansTab = () => {
                delete window.mProTab;

                $('.tabs-module-block#pr-exc-offer-tab', '.individual-team-tab-container').addClass('hidden');
                $('.tabs-module-block#pr-individual-tab', '.individual-team-tab-container').trigger('click');
            };

            if (is_mobile) {
                mega.ui.sheet.show({
                    name: 'cannot-view-offer',
                    type: 'modal',
                    showClose: false,
                    preventBgClosing: true,
                    contents: l.cannot_view_offer,
                    actions: [
                        {
                            type: 'normal',
                            text: l[81], // OK
                            onClick: () => {
                                mega.ui.sheet.hide();
                                showProPlansTab();
                            }
                        }
                    ]
                });
            }
            else {
                const cannotViewOfferDialog = new mega.ui.Dialog({
                    'className': 'cannotviewoffer-dialog',
                    'closable': false,
                    'closableByOverlay': false,
                    'focusable': false,
                    'expandable': false,
                    'requiresOverlay': true,
                    'buttons': []
                });
                cannotViewOfferDialog.rebind('onBeforeShow', function() {
                    $('header p', this.$dialog).text(l.cannot_view_offer);

                    $('button.ok-close', this.$dialog).rebind('click.closeDialog', () => {
                        cannotViewOfferDialog.hide();
                        showProPlansTab();
                    });
                });

                cannotViewOfferDialog.show();
            }
        }
    },

    // These are indented to this level to keep the pro object cleaner, and they should not be directly accessed outside
    // of functions in pro. pro.getPlanObj should be used to retreive them instead.
    planObjects: {
        planKeys: Object.create(null),
        planTypes: Object.create(null),

        createPlanObject(plan, planFromApi) {
            'use strict';
            const key = plan[pro.UTQA_RES_INDEX_ID] + plan[pro.UTQA_RES_INDEX_ITEMNUM];

            const taxInfo = (pro.taxInfo || plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === pro.ACCOUNT_LEVEL_BUSINESS)
                && plan[pro.UTQA_RES_INDEX_EXTRAS].taxInfo;

            delete pro.planObjects.planKeys[key];

            let type1info = (plan[pro.UTQA_RES_INDEX_ITEMNUM] === 1) && !!planFromApi;

            if (type1info) {
                const {bd} = planFromApi || false;
                const {ba, sto, trns, us} = bd || false;

                type1info = {
                    trns: pro.divideAllBy100(trns),
                    ba: pro.divideAllBy100(ba),
                    us: pro.divideAllBy100(us),
                    sto: pro.divideAllBy100(sto),
                };
            }

            lazy(pro.planObjects.planKeys, key, () => {

                const thisPlan = {
                    key,                    // Plan key
                    _saveUpTo: null,        // Stores the saveUpTo percentage of the plan, in case given by another plan
                    _correlatedPlan: null,  // Stores the correlated plan, in case given by another plan
                    _durationOptions: null,     // Stores the duration options available in the plan
                    _maxCorrPriceEur: null,
                    planArray: plan,
                    features: plan[pro.UTQA_RES_INDEX_EXTRAS].f,
                    trial: plan[pro.UTQA_RES_INDEX_EXTRAS].trial,
                    featureStrings: pro.featureInfo[plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]],
                    baseTransfer: plan[pro.UTQA_RES_INDEX_TRANSFER]
                        && ((plan[pro.UTQA_RES_INDEX_TRANSFER] / plan[pro.UTQA_RES_INDEX_MONTHS])
                            * pro.BYTES_PER_GB),
                    transferCost: type1info
                        && ((pro.taxInfo && (type1info.trns.lpn || type1info.trns.pn))
                            || (type1info.trns.lp || type1info.trns.p))
                };

                lazy(thisPlan, 'id', () => plan[pro.UTQA_RES_INDEX_ID]);
                lazy(thisPlan, 'itemNum', () => plan[pro.UTQA_RES_INDEX_ITEMNUM]);
                lazy(thisPlan, 'level', () => plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]);
                lazy(thisPlan, 'name', () => pro.getProPlanName(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]));
                lazy(thisPlan, 'storage', () => plan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB);
                lazy(thisPlan, 'transfer', () => plan[pro.UTQA_RES_INDEX_TRANSFER] * pro.BYTES_PER_GB);
                lazy(thisPlan, 'months', () => plan[pro.UTQA_RES_INDEX_MONTHS]);
                lazy(thisPlan, 'price', () => plan[pro.UTQA_RES_INDEX_LOCALPRICE] || plan[pro.UTQA_RES_INDEX_PRICE]);
                lazy(thisPlan, 'currency', () => {
                    return plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] || plan[pro.UTQA_RES_INDEX_CURRENCY];
                });
                lazy(thisPlan, 'priceEuro', () => plan[pro.UTQA_RES_INDEX_PRICE]);
                lazy(thisPlan, 'currencyEuro', () => plan[pro.UTQA_RES_INDEX_CURRENCY]);
                lazy(thisPlan, 'save', () => plan[pro.UTQA_RES_INDEX_LOCALPRICESAVE] || false);
                lazy(thisPlan, 'monthlyBasePrice', () => plan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE] || false);
                lazy(thisPlan, 'hasLocal', () => !!plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]);
                lazy(thisPlan, 'trialStrings', () => thisPlan.trial && pro.featureInfo[thisPlan.level + '-trial']);
                lazy(thisPlan, 'featureBits', () => thisPlan.features && pro.getStandaloneBits(thisPlan.features));
                lazy(thisPlan, 'taxInfo', () => {
                    return pro.getStandardisedTaxInfo(taxInfo, thisPlan.level === pro.ACCOUNT_LEVEL_BUSINESS);
                });

                lazy(thisPlan, 'correlatedPlan', () => {
                    if (thisPlan._correlatedPlan === null) {
                        let correlatedPlan = false;
                        const arrCorrPlan = pro.membershipPlans.find((searchPlan) => {
                            return ((searchPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === thisPlan.level)
                                && (searchPlan[pro.UTQA_RES_INDEX_MONTHS] !== thisPlan.months));
                        });
                        if (arrCorrPlan) {
                            const planObj = pro.getPlanObj(arrCorrPlan);
                            planObj._correlatedPlan = thisPlan;
                            correlatedPlan = planObj;
                        }
                        thisPlan._correlatedPlan = correlatedPlan;
                    }
                    return thisPlan._correlatedPlan;
                });

                lazy(thisPlan, 'durationOptions', () => {
                    if (thisPlan._durationOptions === null) {
                        const { membershipPlans: plans, UTQA_RES_INDEX_ACCOUNTLEVEL } = pro;
                        thisPlan._durationOptions = [];
                        let i = plans.length;

                        while (--i >= 0) {
                            if (plans[i][UTQA_RES_INDEX_ACCOUNTLEVEL] === thisPlan.level) {
                                thisPlan._durationOptions.push(plans[i]);
                            }
                        }

                        // Sorting by UTQA_RES_INDEX_MONTHS
                        thisPlan._durationOptions.sort(([,,,,a], [,,,,b]) => a - b);
                    }

                    return thisPlan._durationOptions;
                });

                lazy(thisPlan, 'saveUpTo', () => {
                    if (thisPlan._saveUpTo === null) {
                        let saveUpTo = false;
                        if (thisPlan.correlatedPlan) {
                            const thisMonthlyPrice = thisPlan.price / thisPlan.months;
                            const corrMonthlyPrice = thisPlan.correlatedPlan.price / thisPlan.correlatedPlan.months;
                            saveUpTo = percentageDiff(thisMonthlyPrice, corrMonthlyPrice, 3);
                            thisPlan.correlatedPlan._saveUpTo = saveUpTo;
                        }
                        thisPlan._saveUpTo = saveUpTo;
                    }
                    return thisPlan._saveUpTo;
                });

                lazy(thisPlan, 'maxCorrPriceEuro', () => {
                    if (thisPlan._maxCorrPriceEur === null) {
                        // map by UTQA_RES_INDEX_PRICE
                        thisPlan._maxCorrPriceEur = Math.max(...thisPlan.durationOptions.map(([,,,,,p]) => p));

                        if (thisPlan.correlatedPlan) {
                            thisPlan.correlatedPlan._maxCorrPriceEur = thisPlan._maxCorrPriceEur;
                        }
                    }

                    return thisPlan._maxCorrPriceEur;
                });

                lazy(thisPlan, 'yearlyDiscount', () => {
                    if (thisPlan.save) {
                        return thisPlan.save;
                    }
                    if ((thisPlan.months === 1) || !thisPlan.correlatedPlan) {
                        return false;
                    }
                    const baseYearly = thisPlan.correlatedPlan.price * 12;

                    // Multiply by 100 and then divide by 100 to avoid floating point issues as JS hates decimals
                    return (baseYearly * 100 - thisPlan.price * 100) / 100;
                });


                /**
                 * Checks if the plan is in a filter, returns boolean or level of the plan in the filter.
                 * @param {string} filter - The name of the filter to check
                 * @param {?string} returnType - Desired return type. Will return boolean if not specified.
                 * @returns {number | boolean} - Returns if the plan is in the filter,
                 * as the level of the plan if specified, or as a boolean if not.
                 */
                thisPlan.isIn = (filter, returnType) => {
                    if (returnType === 'asLevel') {
                        return pro.filter.simple[filter].has(thisPlan.level) ? thisPlan.level : 0;
                    }
                    return pro.filter.simple[filter].has(thisPlan.level);
                };

                thisPlan.getFormattedPrice = pro.getFormattedPrice.bind(null, thisPlan);

                return thisPlan;
            });
        },

        createBusinessPlanObject(plan) {
            'use strict';

            const {id, al, bd, m, l, it} = plan;

            const key = id + it;
            const planObj = pro.getPlanObj(false, false, key);
            if (planObj) {
                return planObj;
            }

            const {ba, sto, trns, us, minu} = (bd || Object.create(null));

            const {p, pn, lp, lpn} = us;

            const taxInfo = (p && pn) && {
                p: p * minu,
                pn: pn * minu,
                lp: (lp || p) * minu,
                lpn: (lpn || pn) * minu
            };

            const price = (taxInfo ? pn : p) * minu;
            const localPrice = ((taxInfo && lpn) ? lpn : lp) * minu;

            const bussinessPlanArray = [
                id, al,
                ba.s, ba.t, m, price, l.c, price, localPrice, l.lc, 0, it,
                sto.p, sto.lp, trns.p, trns.lp,
            ];

            bussinessPlanArray[pro.UTQA_RES_INDEX_EXTRAS] = {
                taxInfo,
                trial: false,
                trialStrings: false,
                featureStrings: false,
            };

            this.createPlanObject(bussinessPlanArray);

            return pro.getPlanObj(false, false, key);
        },
    },

    /**
     * Returns the price of the plan formatted as a string
     * @param {string} display - The display type of the price
     * @param {Boolean} returnEuro - If the price should be returned in Euro
     * @param {boolean} noDecimals - If the price should be returned without decimals
     * @param {number} months - The number of months to return the price for
     * @param {object} options - Extra options to format what price is shown and how
     * @returns {string} - The formatted price
     */
    getFormattedPrice: (plan, display, returnEuro, noDecimals, months, options) => {
        'use strict';

        options = options || Object.create(null);

        const monthMultiplier = +(months || plan.months) / plan.months;

        let localPrice = returnEuro ? plan.priceEuro : plan.price;

        if (options.includeTax && plan.taxInfo) {
            const {taxedPriceEuro, taxedPrice} = plan.taxInfo;
            localPrice = (plan.taxInfo && (returnEuro ? taxedPriceEuro : taxedPrice))
                || localPrice;
        }
        else if (options.useTaxAmount) {
            const {taxAmount, taxAmountEuro} = plan.taxInfo;
            localPrice = plan.taxInfo && (returnEuro ? taxAmountEuro : taxAmount);
            if (typeof localPrice !== 'number') {
                localPrice = returnEuro ? plan.priceEuro : plan.price;
            }
        }

        return formatCurrency(
            localPrice * monthMultiplier,
            returnEuro ? plan.currencyEuro : plan.currency,
            display,
            noDecimals
        );
    },

    initFilteredPlans() {
        'use strict';
        const pf = pro.filter;
        const superFilterKeys = Object.keys(pf.superSet);

        for (let i = 0; i < superFilterKeys.length; i++) {
            const key = superFilterKeys[i];
            const subsets = pf.superSet[key];
            let allItems = [];

            for (let j = 0; j < subsets.length; j++) {
                allItems = ([...allItems, ...pf.simple[subsets[j]]]);
            }

            pf.simple[superFilterKeys[i]] = new Set(allItems);
        }

        const simpleFilterKeys = Object.keys(pf.simple);
        const invertedFilterKeys = Object.keys(pf.inverted);
        const dynamicFilterKeys = Object.keys(pf.dynamic);

        // If a non-simple filter has already been used, it will also already be in simple filters
        const setUp = new Set();

        // For monthly (1), yearly (12), and combined (23)
        for (let i = 1; i < 24; i += 11) {
            const months = i < 13 ? i : false;
            const monthsTag = months
                ? months === 1 ? 'M' : 'Y'
                : '';


            for (let j = 0; j < simpleFilterKeys.length; j++) {
                setUp.add(simpleFilterKeys[j] + monthsTag);

                // Set up basic plan sub-arrays (is in account level group, and right num months)
                lazy(pf.plans, simpleFilterKeys[j] + monthsTag, () => pro.membershipPlans.filter((plan) => {
                    if (months) {
                        return pro.filter.simple[simpleFilterKeys[j]].has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])
                            && plan[pro.UTQA_RES_INDEX_MONTHS] === months;
                    }
                    return pro.filter.simple[simpleFilterKeys[j]].has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]);
                }));
            }

            for (let j = 0; j < invertedFilterKeys.length; j++) {
                if (setUp.has(invertedFilterKeys[j] + monthsTag)) {
                    continue;
                }
                setUp.add(invertedFilterKeys[j] + monthsTag);

                // Set up inverted plan sub-arrays (is in all minus specified, correct num months(via allX))
                lazy(pf.plans, invertedFilterKeys[j] + monthsTag, () =>
                    pro.filter.plans[`all${monthsTag}`].filter((plan) =>
                        pro.filter.simple[invertedFilterKeys[j]].has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])
                    )
                );
            }

            // TODO: Create all filters in a loop as they work the same. Will have large testing scope.
            for (let j = 0; j < dynamicFilterKeys.length; j++) {
                if (setUp.has(dynamicFilterKeys[j] + monthsTag)) {
                    continue;
                }
                setUp.add(dynamicFilterKeys[j] + monthsTag);

                lazy(pf.plans, dynamicFilterKeys[j] + monthsTag, () =>
                    pro.filter.simple[`all${monthsTag}`].filter((plan) =>
                        pro.filter.dynamic[dynamicFilterKeys[j]](plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])
                    )
                );
            }
        }

        const getMinStoragePlan = (plans) => {
            if (!plans || !plans.length) {
                return false;
            }
            let currentMin = plans[0];
            for (let i = 1; i < plans.length; i++) {
                if (plans[i][pro.UTQA_RES_INDEX_STORAGE] < currentMin[pro.UTQA_RES_INDEX_STORAGE]) {
                    currentMin = plans[i];
                }
            }
            return currentMin;
        };

        // TODO: Update Min lazys to use getMinStoragePlan, when it will not require extra QA to do so
        lazy(pro.filter, 'miniMin', () => {
            const plans = pro.filter.plans.miniPlans;
            if (!plans.length) {
                return false;
            }
            let currentMin = plans[0];
            for (let i = 1; i < plans.length; i++) {
                if (plans[i][pro.UTQA_RES_INDEX_STORAGE] < currentMin[pro.UTQA_RES_INDEX_STORAGE]) {
                    currentMin = plans[i];
                }
            }
            return currentMin;
        });

        lazy(pro.filter, 'excMin', () => {
            const plans = pro.filter.plans.excTab;
            return getMinStoragePlan(plans);
        });
    },

    /**
     * Given a plan array, a plan key (id + itemnum), or the account level/number of months, returns objectified plan
     * @param {Array | number} plan - takes in the full plan array, or the account level
     * @param {number | string} [months = 1] - the number of months of the plan if account level is given
     * @returns {Object | boolean} - returns the same plan but as an object, or false if none found
     */
    getPlanObj(plan, months, key) {
        'use strict';

        if (key) {
            return pro.planObjects.planKeys[key] || false;
        }

        if (!pro.membershipPlans.length) {
            console.assert(!d, 'getPlanObj called before membershipPlans were loaded.');
            return;
        }
        const {planTypes} = pro.planObjects;
        months = (months |= 0) || 1;
        let type;
        if (typeof plan === 'number' || typeof plan === 'string') {
            plan |= 0;
            type = plan + '_' + months;
            if (planTypes[type]) {
                return planTypes[type];
            }
            plan = pro.membershipPlans.find((searchPlan) => {
                return ((searchPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === plan)
                    && (searchPlan[pro.UTQA_RES_INDEX_MONTHS] === months));
            });
        }

        if (typeof plan === 'object') {
            key = plan[pro.UTQA_RES_INDEX_ID] + plan[pro.UTQA_RES_INDEX_ITEMNUM];
        }
        // If plan level and duration given, cache it as may be used again
        if (type) {
            planTypes[type] = pro.planObjects.planKeys[key];
        }
        return pro.planObjects.planKeys[key] || false;
    },

    getStandardisedTaxInfo(planTaxInfo, type) {
        'use strict';

        type = type |= 0;

        if ((pro.taxInfo === false) || (typeof planTaxInfo !== 'object')) {
            return false;
        }
        if (planTaxInfo.taxInfoObj !== undefined) {
            return planTaxInfo.taxInfoObj;
        }

        if (Array.isArray(planTaxInfo)) {
            planTaxInfo = planTaxInfo[pro.UTQA_RES_INDEX_EXTRAS].taxInfo;
            if (typeof planTaxInfo !== 'object') {
                return false;
            }
        }

        let taxInfoObj = false;

        if (planTaxInfo.taxAmount && planTaxInfo.taxedPrice) {
            planTaxInfo.taxInfoObj = planTaxInfo;
        }

        // {"p": 574, "pn": 499, "mbp": 574, "mbpn": 499, "lp": 1088, "lpn": 946};
        else {
            const {p, pn, lp, lpn} = planTaxInfo;

            if (pn && p) {

                const taxedPriceEuro = p;
                const taxAmountEuro = taxedPriceEuro - pn;
                const taxedPrice = lp || taxedPriceEuro;
                const taxAmount = (lp - lpn) || taxAmountEuro;

                if (type === 0) {
                    taxInfoObj = pro.divideAllBy100({
                        taxAmount,
                        taxedPrice,
                        taxAmountEuro,
                        taxedPriceEuro,
                    });
                }
                else {
                    taxInfoObj = {
                        taxAmount,
                        taxedPrice,
                        taxAmountEuro,
                        taxedPriceEuro,
                    };
                }
            }
        }

        planTaxInfo.taxInfoObj = taxInfoObj;
        return taxInfoObj;
    },

    /**
     * When it is unknown what type we will receive for a plan, this function will always return the plan level as num
     * @param {Array | Object | string | number} plan - The plan or plan level to return the plan level of
     * @returns {number} - the plan level number
     */
    getPlanLevel(plan) {
        'use strict';
        if (typeof plan === 'number') {
            return plan;
        }
        else if (Array.isArray(plan)) {
            plan = plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
        }
        else if (typeof plan === 'object') {
            plan = plan.level;
        }
        return plan | 0;
    },

    /**
     * Checks if the given plan/plan level is in the given filter
     * @param {Array | Object | string | number} plan
     * @param {string} [filter = 'all'] filter - the filter to check the plan against
     * @returns {boolean} - If the plan is in the filter
     */
    planInFilter(plan, filter) {
        'use strict';
        const filterSet = pro.filter.simple[filter || 'all'];
        if (!filterSet) {
            if (d) {
                console.error('Invalid filter: ' + filter);
            }
            return false;
        }
        return filterSet.has(pro.getPlanLevel(plan));
    },

    /**
     * Takes an object and returns the number representation of the bitfield of the features. Unique per feature set
     * @param {Object} features - The object containing the features
     * @returns {number} - The standalone bits
     */
    getStandaloneBits(features) {
        'use strict';
        if (features === false) {
            return 0;
        }
        if (!features || typeof features !== 'object') {
            console.assert(!d, `Invalid features object given to getStandaloneBits: ${features}`);
            return 0;
        }
        const featureNames = Object.keys(features);
        return featureNames.reduce((featureBits, feature) => {
            return featureBits | pro.bfStandalone[feature.toUpperCase()];
        }, 0);
    },

    /**
     *
     * @param {string} type - The name of the plan set to retrive
     * @param {?number} duration - The duration of the plan set to retrieve
     * @returns {Array} - The array of plans in the set
     */
    plansInSet(type, duration) {
        'use strict';
        const durationString = duration ? (duration === 1 ? 'M' : 'Y') : '';
        return pro.filter.plans[type + durationString];
    },

    planSearch: {
        searchedPlans: Object.create(null),
        addPlanToSearch(plan) {
            'use strict';
            const planLevel = plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            const planDuration = plan[pro.UTQA_RES_INDEX_MONTHS];
            const planKey = planLevel + (planDuration ? '_' + planDuration : '');
            if (!pro.planSearch.searchedPlans[planLevel]) {
                pro.planSearch.searchedPlans[planLevel] = plan;
            }
            pro.planSearch.searchedPlans[planKey] = plan;
        },
        reset() {
            'use strict';
            pro.planSearch.searchedPlans = Object.create(null);
        }
    },
    getPlan(planLevel, months) {
        'use strict';
        planLevel |= 0;
        const searchKey = planLevel + (months ? '_' + months : '');

        return pro.planSearch.searchedPlans[searchKey] || false;
    },
};

/**
 * Contains the filtering functions, filter types, and plans
 * @property pro.filter
 */
lazy(pro, 'filter', () => {
    'use strict';
    const pf = {

        // contains the filtered plan arrays
        plans: Object.create(null),

        // These are intended to be used in a similar way to transifex strings
        // If 2 arrays are the same but have a different context, please keep them separate.
        // This is to make future updating as straightforward as possible.
        simple: {

            // validPurchases: 11, 12, 13, 4, 1, 2, 3, 101 - plans that are valid to purchase via propay_X
            // Excludes any plans that are not directly purchasable at the url /propay_X. e.g., Business
            validPurchases:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI
                ]),

            validFeatures: new Set([
                pro.ACCOUNT_LEVEL_FEATURE_VPN, pro.ACCOUNT_LEVEL_FEATURE_PWM,
            ]),

            // all: 11, 12, 13, 4, 1, 2, 3, 101, 100 - all currently available plans
            // Excludes any plans that the webclient is not yet ready to support.
            all:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI, pro.ACCOUNT_LEVEL_BUSINESS
                ]),

            // storageTransferDialogs: 11, 12, 13, 4, 1, 2, 3, 101 - plans that should be shown in the storage
            // and transfer upsell dialogs
            storageTransferDialogs:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI
                ]),

            // lowStorageQuotaPlans: 11, 12, 13, 4 - plans that should have their monthly price shown
            // in the storage upsell dialogs
            lowStorageQuotaPlans:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE
                ]),

            // miniPlans: 11, 12, 13 - mini plans available to targeted users
            miniPlans:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL
                ]),

            // ninetyDayRewind: 11, 12, 13, 4 - plans that have up to 90 days rewind instead of up to 180 days
            ninetyDayRewind:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE
                ]),

            // proPlans: 4, 1, 2, 3, 101 - plans that are in the group "pro"
            proPlans:
                new Set([
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI
                ]),

            // core 4, 1, 2, 3 - plans with a set amount of storage and transfer and are available to most or all users
            core:
                new Set([
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III
                ]),

            // recommend: 1, 2, 3 - plans that are able to be recommended to users
            recommend:
                new Set([
                    pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II, pro.ACCOUNT_LEVEL_PRO_III
                ]),

            // TODO: Make this dynamic instead of hardcoding the values. Cannot guarantee no changes in the future.
            // yearlyMiniPlans: 12, 13 - mini plans available to targeted users which allow yearly subscriptions
            yearlyMiniPlans:
                new Set([
                    pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL
                ]),

            // Plans that can show on the pricing page that come under the exclusive offers tab
            excTab: new Set([
                pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
            ]),
            // Plans that can show on the pricing page that come under the exclusive offers tab
            proTab: new Set([
                pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                pro.ACCOUNT_LEVEL_PRO_III,
            ]),
            // Plans that can show on the pricing page that come under the MEGA VPN tab
            vpnTab: new Set([
                pro.ACCOUNT_LEVEL_FEATURE_VPN,
            ]),
            // Plans that can show on the pricing page that come under the MEGA PWM tab
            pwmTab: new Set([
                pro.ACCOUNT_LEVEL_FEATURE_PWM,
            ]),

            // generalStringPlans: 11, 12, 13, 4, 1, 2, 3 - plans that use the general strings for plan information
            generalStringPlans:
                new Set([
                    pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL, pro.ACCOUNT_LEVEL_STARTER,
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI
                ]),

            // showFeatureInfo: 4, 1, 2, 3 - plans that should show feature info on propay page
            showFeatureInfo:
                new Set([
                    pro.ACCOUNT_LEVEL_PRO_LITE, pro.ACCOUNT_LEVEL_PRO_I, pro.ACCOUNT_LEVEL_PRO_II,
                    pro.ACCOUNT_LEVEL_PRO_III, pro.ACCOUNT_LEVEL_PRO_FLEXI,
                ]),
        },

        // Sets of plans to invert (all plans minus specified plans), will then
        // be added to pro.filter.simple, and plan arrays added to pro.filter.plans
        inverted: {
            // Plans that do not see the cancel benefits dialog
            canSeeCancelBenefits:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_FLEXI, pro.ACCOUNT_LEVEL_BUSINESS
                ]),

            // Plans that do not have an icon to show
            hasIcon:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL
                ]),

            supportsExpensive:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_LITE
                ]),

            supportsGooglePlay:
                new Set([
                    pro.ACCOUNT_LEVEL_STARTER, pro.ACCOUNT_LEVEL_BASIC, pro.ACCOUNT_LEVEL_ESSENTIAL,
                    pro.ACCOUNT_LEVEL_PRO_FLEXI
                ]),

            // Plans that do not need to be checked for their storage quota for access to propay page
            checkStorage:
                new Set([
                    pro.ACCOUNT_LEVEL_FEATURE_VPN, pro.ACCOUNT_LEVEL_PRO_FLEXI,
                ]),

            // Plans that do not see the cancel subscription survey
            canSeeCancelSubsSurvey:
                new Set([
                    pro.ACCOUNT_LEVEL_BUSINESS
                ]),
        },

        superSet: {
            // Plans that are exlusive offiers
            excPlans: ['miniPlans'],

            // Plans that have regular transfer and storage quota
            regular: ['miniPlans', 'core'],
        },

        // Plan sets that will be created dynamically given result of UTQA
        dynamic: {
            // Plans that only have one duration
            singleDurationPlans: new Set(),
        },

        /**
         * Finds the lowest monthly plan that can store the users data, excluding their current plan
         * @param {number} userStorage - The users current storage in bytes
         * @param {string} secondaryFilter - The subset of plans to choose lowest plan from
         * @param {?boolean} ignoreUserLevel - Allow a plan of the users current level to be returned
         * @returns {Array|false} - An array item of the specific plan, or false if no plans found
         */
        lowestRequired(userStorage, secondaryFilter, ignoreUserLevel) {
            secondaryFilter = secondaryFilter || 'all';
            const plans = pro.filter.plans[secondaryFilter + 'M'];
            if (!plans) {
                console.assert(pro.membershipPlans.length, 'Plans not loaded');
                return;
            }
            return plans.find((plan) =>
                (ignoreUserLevel
                    || (plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] !== u_attr.p))
                && ((plan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB) > userStorage)
                || (plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === pro.ACCOUNT_LEVEL_PRO_FLEXI));
        }

    };

    const invertedFilterKeys = Object.keys(pf.inverted);
    const dynamicFilterKeys = Object.keys(pf.dynamic);

    for (let j = 0; j < invertedFilterKeys.length; j++) {

        lazy(pf.simple, invertedFilterKeys[j], () => {

            return new Set([...pro.filter.simple.all].filter((id) =>
                !pro.filter.inverted[invertedFilterKeys[j]].has(id)
            ));
        });
    }

    // Add the dynamic filters to the simple filter. Lazy as they are not ready on init.
    for (let j = 0; j < dynamicFilterKeys.length; j++) {
        lazy(pf.simple, dynamicFilterKeys[j], () => pf.dynamic[dynamicFilterKeys[j]]);
    }

    return Object.setPrototypeOf(pf, null);
});

lazy(pro, 'featureInfo', () => {

    'use strict';

    const general = [
        {
            icon: 'sprite-fm-mono icon-shield-thin-outline',
            text: l.mega_vpn
        },
        {
            icon: 'sprite-fm-mono icon-lock-thin-outline',
            text: l.mega_pwm
        },
        {
            icon: 'sprite-fm-mono icon-users-thin-outline',
            text: l.pr_unlimited_participants
        }
    ];

    const strings = {
        '100000-trial': [
            {
                icon: 'sprite-fm-mono icon-lock',
                text: l.unlock_secure_browsing
            },
            {
                icon: 'sprite-fm-mono icon-notification',
                text: l.email_before_trial_end
            },
            {
                icon: 'sprite-fm-mono icon-star',
                text: l.sub_start_d_can_cancel,
                getText(planInfo) {
                    return this.text.replace('%1', time2date((Date.now() / 1000) + planInfo.days * 24 * 60 * 60, 2));
                }
            },
        ],
        '100000': [
            {
                text: l.privacy_on_the_go
            },
            {
                text: l.lightning_fast_speeds
            },
            {
                text: l.servers_around_globe
            },
        ],
        '100001-trial': [
            {
                icon: 'sprite-fm-mono icon-lock',
                text: l.free_trial_today_desc
            },
            {
                icon: 'sprite-fm-mono icon-notification',
                text: l.email_before_trial_end
            },
            {
                icon: 'sprite-fm-mono icon-star',
                text: l.free_trial_end_desc,
                getText(planInfo) {
                    return this.text.replace('%1', time2date((Date.now() / 1000) + planInfo.days * 24 * 60 * 60, 2));
                }
            },
        ],
        '100001': [
            {
                icon: 'icon-password-input',
                text: l.pwm_cancel_subfeature1
            },
            {
                icon: 'icon-file-edit-lined',
                text: l.pwm_cancel_subfeature2
            },
            {
                icon: 'icon-sync-large',
                text: l.sync_log_across_devices
            },
        ],
    };

    for (const plan of pro.filter.simple.generalStringPlans) {
        strings[plan] = general;
    }

    return strings;
});

/** @property pro.bfStandalone */
lazy(pro, 'bfStandalone', () => {
    'use strict';
    // do not change the order, add new entries at the tail.
    return freeze(makeEnum(['VPN', 'PWM']));
});
