/**
 * Code for the direct voucher redeem dialog when users come from
 * a direct link e.g. https://mega.nz/#voucher8RNU1PYPYDQWBE04J67F
 */
var redeem = {

    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,

    voucherCode: '',
    accountBalance: 0,
    voucherAmount: 0,
    bestPlan: null,

    /**
     * Initialisation of the dialog
     */
    init: function() {

        // Cache DOM reference for lookup in other functions
        redeem.$dialog = $('.voucher-redeem-dialog');
        redeem.$backgroundOverlay = $('.fm-dialog-overlay');
        redeem.$successOverlay = $('.payment-result.success');

        // Init functions
        redeem.addVoucher();
    },

    /**
     * Redeems the voucher code
     */
    addVoucher: function() {

        // Get the voucher code
        redeem.voucherCode = localStorage.getItem('voucher');

        // No longer needed in localStorage
        localStorage.removeItem('voucher');

        // Make API call to redeem voucher
        api_req({ a: 'uavr', v: redeem.voucherCode }, {
            callback: function(result) {

                if (typeof result === 'number') {

                    // This voucher has already been redeemed
                    if (result === -11) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[714], '', function() {
                            redeem.hideBackgroundOverlay();
                            loadSubPage('contact');
                        });
                    }

                    // Not a valid voucher code
                    else if (result < 0) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[473], '', function() {
                            redeem.hideBackgroundOverlay();
                            loadSubPage('contact');
                        });
                    }

                    else {
                        // Get the latest account balance and update the dialog
                        redeem.getVoucherValue();
                    }
                }
            }
        });
    },

    /**
     * Gets the amount of the voucher e.g. 4.99 EUR
     */
    getVoucherValue: function() {

        api_req({ a: 'uavq', v: redeem.voucherCode }, {
            callback: function(result) {

                if (typeof result !== 'number') {

                    // Remember voucher amount for later
                    redeem.voucherAmount = result[1];

                    // Get the latest balance
                    redeem.getLatestBalance();
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

                // If successful result
                if (typeof result === 'object' && result.balance && result.balance[0]) {

                    // Update the balance
                    redeem.accountBalance = parseFloat(result.balance[0][0]);

                    // Get all the available pro plans
                    redeem.getProPlans();
                }
            }
        });
    },

    /**
     * Get the Pro membership plans
     */
    getProPlans: function() {

        // This call will return an array of arrays. Each array contains this data:
        // [api_id, account_level, storage, transfer, months, price, currency, description, ios_id, google_id]

        api_req({ a : 'utqa', nf: 1 }, {
            callback: function (result) {

                // The rest of the webclient expects this data in an array format
                // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
                var results = [];
                for (var i = 0; i < result.length; i++)
                {
                    results.push([
                        result[i]['id'],
                        result[i]['al'], // account level
                        result[i]['s'],  // storage
                        result[i]['t'],  // transfer
                        result[i]['m'],  // months
                        result[i]['p'],  // price
                        result[i]['c'],  // currency
                        result[i]['mbp'] // monthly base price
                    ]);
                }

                // Update the list of plans
                redeem.membershipPlans = results;

                // Get all the available pro plans
                redeem.calculateBestProPlan();
            }
        });
    },

    /**
     * Calculates the best plan for
     */
    calculateBestProPlan: function() {

        // Sort plans by lowest price first
        redeem.membershipPlans.sort(function(planA, planB) {

            // Convert from string for proper comparison
            var pricePlanA = parseFloat(planA[5]);
            var pricePlanB = parseFloat(planB[5]);

            if (pricePlanA < pricePlanB) {
                return -1;
            }
            if (pricePlanA > pricePlanB) {
                return 1;
            }

            return 0;
        });

        var selectedPlanIndex = 0;

        // Find the most expensive plan that they can purchase with their current account balance
        for (var i = 0; i < redeem.membershipPlans.length; i++) {

            // Convert string price to float for correct comparison
            var planPrice = redeem.membershipPlans[i][5];
                planPrice = parseFloat(planPrice);

            // If their account balance is equal or more than the plan price, update
            if (planPrice <= redeem.accountBalance) {
                selectedPlanIndex = i;
            }
            else {
                // Exit out, the other plans are too expensive
                break;
            }
        }

        // Set the best plan for the user
        redeem.bestPlan = redeem.membershipPlans[selectedPlanIndex];

        // Display the dialog
        redeem.displayDialog();
    },

    /**
     * Displays the details on the dialog
     */
    displayDialog: function() {

        var balance2dp = redeem.accountBalance.toFixed(2);
        var planId = redeem.bestPlan[0];
        var proNum = redeem.bestPlan[1];
        var storage = redeem.bestPlan[2];
        var bandwidth = redeem.bestPlan[3];
        var numOfMonths = redeem.bestPlan[4];
        var planPrice = redeem.bestPlan[5].split('.');
        var proName = getProPlan(proNum);

        // Get dollars and cents
        var planPriceDollars = planPrice[0];
        var planPriceCents = planPrice[1];

        // Get 'month' or 'year' text
        var monthOrYearText = (numOfMonths < 12) ? l[931] : l[932];

        // Convert larger storage sizes over 1024 GB to TB wording
        var storageAmount = (storage < 1024) ? storage : (storage / 1024);
        var bandwidthAmount = (bandwidth < 1024) ? bandwidth : (bandwidth / 1024);
        var storageUnit = (storage < 1024) ? 'GB' : 'TB';
        var bandwidthUnit = (bandwidth < 1024) ? 'GB' : 'TB';

        // "Your MEGA voucher for 4.99 &euro; was redeemed successfully"
        var titleText = redeem.$dialog.find('.title-text').html();
            titleText = titleText.replace('%1', redeem.voucherAmount);

        // "Your balance is now 18.00 &euro;."
        var balanceText = redeem.$dialog.find('.balance-text').html();
            balanceText = balanceText.replace('%1', balance2dp);

        // "We suggest the PRO Lite plan based on your account balance."
        // "Click COMPLETE UPGRADE and enjoy your new PRO Lite plan."
        var upgradeText = redeem.$dialog.find('.complete-upgrade-text').html();
            upgradeText = upgradeText.replace(/%1/g, proName);
            upgradeText = upgradeText.replace('[S]', '<span class="complete-text">').replace('[/S]', '</span>');

        // Update information
        redeem.$dialog.find('.reg-st3-membership-bl').removeClass('pro1 pro2 pro3 pro4');
        redeem.$dialog.find('.reg-st3-membership-bl').addClass('pro' + proNum);
        redeem.$dialog.find('.plan-name').html(proName);
        redeem.$dialog.find('.price .dollars').text(planPriceDollars);
        redeem.$dialog.find('.price .cents').text('.' + planPriceCents);
        redeem.$dialog.find('.price .period').text('/' + monthOrYearText);
        redeem.$dialog.find('.reg-st3-storage .quota-amount').text(storageAmount);
        redeem.$dialog.find('.reg-st3-storage .quota-unit').text(storageUnit);
        redeem.$dialog.find('.reg-st3-bandwidth .quota-amount').text(bandwidthAmount);
        redeem.$dialog.find('.reg-st3-bandwidth .quota-unit').text(bandwidthUnit);
        redeem.$dialog.find('.title-text').html(titleText);
        redeem.$dialog.find('.balance-text').html(balanceText);
        redeem.$dialog.find('.complete-upgrade-text').html(upgradeText);
        redeem.$dialog.find('.pro-plan').text(proName);
        redeem.$dialog.find('.complete-upgrade-button').attr('data-plan-id', planId);

        // Button functionality
        redeem.initCloseButton();
        redeem.initUpgradeButton();

        // Show the dialog
        loadingDialog.hide();
        redeem.showBackgroundOverlay();
        redeem.$dialog.removeClass('hidden');
    },

    /**
     * Closes the dialog and goes to the pro page
     */
    initCloseButton: function() {

        redeem.$dialog.find('.payment-close-icon, .choose-plan-button').rebind('click', function() {
            // Hide the dialog
            redeem.hideBackgroundOverlay();
            redeem.$dialog.addClass('hidden');
            loadSubPage('pro');
        });

        // Prevent close of dialog from clicking outside the dialog
        $('.fm-dialog-overlay.payment-dialog-overlay').rebind('click', function(event) {
            event.stopPropagation();
        });
    },

    /**
     * Upgrades their account to the relevant plan
     */
    initUpgradeButton: function() {

        redeem.$dialog.find('.complete-upgrade-button').rebind('click', function() {

            redeem.$dialog.addClass('hidden');
            redeem.processProPurchaseWithBalance();
        });
    },

    /**
     * Complete the Pro purchase using their balance and the relevant plan
     */
    processProPurchaseWithBalance: function() {

        // Data for API request
        var apiId = redeem.bestPlan[0];
        var price = redeem.bestPlan[5];
        var currency = redeem.bestPlan[6];
        var gatewayId = 0;                                  // Prepay / account balance

        // Start loading spinner
        loadingDialog.show();

        // User Transaction Sale API call
        api_req({ a: 'uts', it: 0, si: apiId, p: price, c: currency }, {
            callback: function (utsResult) {

                // Store the sale ID to check with API later
                var saleId = utsResult;

                // If an error
                if (typeof saleId == 'number' && saleId < 0) {

                    loadingDialog.hide();
                    alert(l[200]);

                    return false;
                }

                // User Transaction Complete API call
                api_req({ a: 'utc', s: [saleId], m: gatewayId }, {
                    callback: function(utcResult) {

                        // Hide the loading dialog
                        loadingDialog.hide();

                        // If an error code
                        if (typeof utcResult == 'number' && utcResult < 0) {

                            // Insufficient balance, please try again
                            if (utcResult == EOVERQUOTA) {
                                alert(l[514]);
                            }
                            else {
                                // Oops, something went wrong
                                alert(l[200]);
                            }
                        }
                        else {
                            // Show success dialog
                            redeem.showSuccessfulPayment();
                        }
                    }
                });
            }
        });
    },

    /**
     * Shows a successful payment modal dialog
     */
    showSuccessfulPayment: function() {

        // Get the selected Pro plan details
        var proNum = redeem.bestPlan[1];
        var proPlan = getProPlan(proNum);

        // "You successfully upgraded your account to PRO Lite."
        var successMessage = l[6962].replace('%1', '<span>' + proPlan + '</span>');

        // Show the success
        redeem.showBackgroundOverlay();
        redeem.$successOverlay.removeClass('hidden');
        redeem.$successOverlay.find('.payment-result-txt').html(successMessage);

        // Add click handlers for 'Go to my account' and Close buttons
        redeem.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {

            // Hide the overlay
            redeem.hideBackgroundOverlay();
            redeem.$successOverlay.addClass('hidden');

            // Make sure it fetches new account data on reload
            // and redirect to account page to show purchase
            if (M.account) {
                M.account.lastupdate = 0;
            }
            loadSubPage('fm/account/history');
            return false;
        });
    },

    /**
     * Shows the background overlay
     */
    showBackgroundOverlay: function() {

        redeem.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
    },

    /**
     * Hides the background overlay
     */
    hideBackgroundOverlay: function() {

        redeem.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
    }
};