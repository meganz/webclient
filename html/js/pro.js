/**
 * Common functionality for both the Pro pages (Step 1 and Step 2). Some functions e.g.
 * getProPlanName() and getPaymentGatewayName() may be used from other places not just the Pro pages.
 */
var pro = {

    /** An array of the possible membership plans from the API */
    membershipPlans: [],

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
    UTQA_RES_INDEX_LOCALPRICEZERO: 11,

    /**
     * Load pricing plan information from the API. The data will be loaded into 'pro.membershipPlans'.
     * @param {Function} loadedCallback The function to call when the data is loaded
     */
    loadMembershipPlans: function(loadedCallback) {
        "use strict";

        // Set default
        loadedCallback = loadedCallback || function() { };

        // If this data has already been fetched, re-use it and run the callback function
        if (pro.membershipPlans.length > 0 && !(!pro.lastLoginStatus && u_type > 0)) {
            loadedCallback();
        }
        else {
            // Get the membership plans.
            api_req({ a: 'utqa', nf: 1 }, {
                callback: function(results) {

                    // The rest of the webclient expects this data in an array format
                    // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
                    var plans = [];
                    var maxPlan = null;
                    var minPlan = null;
                    for (var i = 0; i < results.length; i++) {
                        plans.push([
                            results[i]['id'],    // id
                            results[i]['al'],    // account level
                            results[i]['s'],     // storage
                            results[i]['t'],     // transfer
                            results[i]['m'],     // months
                            results[i]['p'],     // price
                            results[i]['c'],     // currency
                            results[i]['mbp'],   // monthly base price
                            results[i]['lp'],    // NEW 'local price'
                            results[i]['lpc'],   // NEW 'local price currency'
                            results[i]['lps'],   // NEW 'local price symbol'
                            results[i]['lp0']    // NEW 'local price Zero val'
                        ]);
                        if (results[i]['m'] === 1) {
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

                    // Run the callback function
                    loadedCallback();
                }
            });
        }
    },

    /**
     * Redirect to the site.
     * @param {String} [topage] Redirect to this page of our site.
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

        // if (localStorage.justGotRegistered) {
        //     delete localStorage.justGotRegistered;
        //     sessionStorage.onDesktopOnboardingRedirectTo = topage;
        //     topage = 'downloadapp';
        // }

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
     * @param {Number} planNum The plan number e.g. 1, 2, 3, 4
     * @returns {String} The plan name i.e. PRO I, PRO II, PRO III, LITE
     */
    getProPlanName: function(planNum) {

        switch (planNum) {
            case 1:
                return l[5819];     // PRO I
            case 2:
                return l[6125];     // PRO II
            case 3:
                return l[6126];     // PRO III
            case 4:
                return l[8413];     // PRO LITE
            case 100:
                return 'Business';    // product name should not be translated
            default:
                return l[1150];      // FREE
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
                if (d && (apipath === 'https://staging.api.mega.co.nz/')) {
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
