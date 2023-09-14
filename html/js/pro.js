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

    /* Constants for special Pro levels */
    ACCOUNT_LEVEL_PRO_LITE: 4,
    ACCOUNT_LEVEL_PRO_I: 1,
    ACCOUNT_LEVEL_PRO_II: 2,
    ACCOUNT_LEVEL_PRO_III: 3,
    ACCOUNT_LEVEL_PRO_FLEXI: 101,
    ACCOUNT_LEVEL_BUSINESS: 100,

    /* Account statuses for Business and Pro Flexi accounts */
    ACCOUNT_STATUS_EXPIRED: -1,
    ACCOUNT_STATUS_ENABLED: 1,
    ACCOUNT_STATUS_GRACE_PERIOD: 2,

    /**
     * Determines if a Business or Pro Flexi account is expired or in grace period
     * @param {Number} accountStatus The account status e.g. from u_attr.b.s (Business) or u_attr.pf.s (Pro Flexi)
     * @returns {Boolean} Returns true if the account is expired or in grace period
     */
    isExpiredOrInGracePeriod: function(accountStatus) {
        'use strict';

        return [this.ACCOUNT_STATUS_EXPIRED, this.ACCOUNT_STATUS_GRACE_PERIOD].includes(accountStatus);
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
            const payload = {a: 'utqa', nf: 2, p: 1};

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

            api.req(payload)
                .then(({result: results}) => {

                    // The rest of the webclient expects this data in an array format
                    // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
                    var plans = [];
                    var maxPlan = null;
                    var minPlan = null;
                    var lmbps = {};

                    const conversionRate = results[0].l.lc === "EUR" ? 1 : results[0].l.exch;

                    for (var i = 1; i < results.length; i++) {

                        let discount = 0;

                        if (results[i].m === 1) {
                            lmbps[results[i].mbp] = results[i].lp;
                        }
                        else {
                            discount = lmbps[results[i].mbp] * results[i].m - results[i].lp;
                        }

                        // If this is Pro Flexi, the data is structured similarly to business, so set that manually
                        if (results[i].al === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                            plans.push([
                                results[i].id,              // id
                                results[i].al,              // account level
                                results[i].bd.ba.s,         // base storage
                                results[i].bd.ba.t,         // base transfer
                                results[i].m,               // months
                                results[i].bd.ba.p  / 100,  // base price
                                results[0].l.c,             // currency
                                results[i].bd.ba.p  / 100,  // monthly base price
                                results[i].bd.ba.lp / 100,  // local base price
                                results[0].l.lc,            // local price currency
                                0,                          // local price save
                                results[i].it,              // item (will be 1 for business / Pro Flexi)
                                results[i].bd.sto.p / 100,  // extra storage rate
                                results[i].bd.sto.lp / 100, // extra storage local rate
                                results[i].bd.trns.p / 100,  // extra transfer rate
                                results[i].bd.trns.lp / 100  // extra transfer local rate
                            ]);
                        }
                        else {
                            // Otherwise for PRO I - III and PRO Lite set as so
                            plans.push([
                                results[i].id,          // id
                                results[i].al,          // account level
                                results[i].s,           // storage
                                results[i].t,           // transfer
                                results[i].m,           // months
                                results[i].p / 100,     // price
                                results[0].l.c,         // currency
                                results[i].mbp / 100,   // monthly base price
                                results[i].lp / 100,    // local price
                                results[0].l.lc,        // local price currency
                                discount / 100,         // local price save
                                results[i].it           // item (will be 0 for user)
                            ]);
                        }
                        if (results[i].m === 1 && results[i].it !== 1) {
                            if (!maxPlan || maxPlan[2] < results[i]['s']) {
                                maxPlan = plans[plans.length - 1];
                            }
                            if (!minPlan || minPlan[2] > results[i]['s']) {
                                minPlan = plans[plans.length - 1];
                            }
                        }
                    }

                    // Store globally
                    pro.membershipPlans = plans;
                    pro.lastLoginStatus = u_type;
                    pro.maxPlan = maxPlan;
                    pro.minPlan = minPlan;
                    pro.conversionRate = conversionRate;
                })
                .finally(() => {
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
                return l[5819];          // Pro I
            case 2:
                return l[6125];          // Pro II
            case 3:
                return l[6126];          // Pro III
            case 4:
                return l[8413];          // Pro Lite
            case 100:
                return l[19530];         // Business
            case 101:
                return l.pro_flexi_name; // Pro Flexi
            default:
                return l[1150];          // Free
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
    getPaymentGatewayName: function(gatewayId, gatewayOpt) {

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
    }
};
