/**
 * Code for the direct voucher redeem dialog when users come from 
 * a direct link e.g. https://mega.nz/#voucher8RNU1PYPYDQWBE04J67F
 */
var voucherRedeemDialog = {
    
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
        this.$dialog = $('.voucher-redeem-dialog');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$successOverlay = $('.payment-result.success');
        
        // Init functions
        this.addVoucher();
    },
        
    /**
     * Redeems the voucher code
     */
    addVoucher: function() {

        // Get the voucher code
        voucherRedeemDialog.voucherCode = localStorage.getItem('voucher');
        
        // No longer needed in localStorage
        localStorage.removeItem('voucher');
                
        // Make API call to redeem voucher
        api_req({ a: 'uavr', v: voucherRedeemDialog.voucherCode }, {
            callback: function(result) {
                
                if (typeof result === 'number') {
                    
                    // This voucher has already been redeemed
                    if (result === -11) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[714], '', function() {
                            voucherRedeemDialog.hideBackgroundOverlay();
                            document.location.hash = 'contact';
                        });
                    }

                    // Not a valid voucher code
                    else if (result < 0) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[473], '', function() {
                            voucherRedeemDialog.hideBackgroundOverlay();
                            document.location.hash = 'contact';
                        });
                    }
                    
                    else {
                        // Get the latest account balance and update the dialog
                        voucherRedeemDialog.getVoucherValue();
                    }
                }
            }
        });
    },
    
    /**
     * Gets the amount of the voucher e.g. 4.99 EUR
     */
    getVoucherValue: function() {
        
        api_req({ a: 'uavq', v: voucherRedeemDialog.voucherCode }, {
            callback: function(result) {
                
                if (typeof result !== 'number') {
                
                    // Remember voucher amount for later
                    voucherRedeemDialog.voucherAmount = result[1];

                    // Get the latest balance
                    voucherRedeemDialog.getLatestBalance();
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
                
                // Hide loading dialog
                loadingDialog.hide();
                
                // If successful result
                if (typeof result == 'object' && result.balance && result.balance[0]) {
                    
                    // Update the balance
                    voucherRedeemDialog.accountBalance = parseFloat(result.balance[0][0]);
                    
                    // Get all the available pro plans
                    voucherRedeemDialog.getProPlans();
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
        // More data can be retrieved with 'f : 1'
        api_req({ a : 'utqa' }, {
            callback: function (result) {
                
                // Update the list of plans
                voucherRedeemDialog.membershipPlans = result;
                
                // Get all the available pro plans
                voucherRedeemDialog.calculateBestProPlan();
            }
        });
    },
    
    /**
     * Calculates the best plan for
     */
    calculateBestProPlan: function() {
        
        // Sort plans by lowest price first
        voucherRedeemDialog.membershipPlans.sort(function(planA, planB) {

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
        for (var i = 0; i < voucherRedeemDialog.membershipPlans.length; i++) {
            
            // Convert string price to float for correct comparison
            var planPrice = voucherRedeemDialog.membershipPlans[i][5];
                planPrice = parseFloat(planPrice);
            
            // If their account balance is equal or more than the plan price, update
            if (planPrice <= voucherRedeemDialog.accountBalance) {
                selectedPlanIndex = i;
            }
            else {
                // Exit out, the other plans are too expensive
                break;
            }
        }
        
        // Set the best plan for the user
        voucherRedeemDialog.bestPlan = voucherRedeemDialog.membershipPlans[selectedPlanIndex];
        
        // Display the dialog
        voucherRedeemDialog.displayDialog();
    },
    
    /**
     * Displays the details on the dialog
     */
    displayDialog: function() {
        
        var balance2dp = voucherRedeemDialog.accountBalance.toFixed(2);
        var planId = voucherRedeemDialog.bestPlan[0];
        var proNum = voucherRedeemDialog.bestPlan[1];
        var storage = voucherRedeemDialog.bestPlan[2];
        var bandwidth = voucherRedeemDialog.bestPlan[3];
        var numOfMonths = voucherRedeemDialog.bestPlan[4];
        var planPrice = voucherRedeemDialog.bestPlan[5].split('.');
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
        
        // Translations
        var titleText = voucherRedeemDialog.$dialog.find('.title-text').html();
            titleText = titleText.replace('%1', voucherRedeemDialog.voucherAmount);
        var balanceText = voucherRedeemDialog.$dialog.find('.balance-text').html();
            balanceText = balanceText.replace('%1', balance2dp);
        var upgradeText = voucherRedeemDialog.$dialog.find('.complete-upgrade-text');
            upgradeText = upgradeText.replace('%1', proName);
            upgradeText = upgradeText.replace('[S]', '<span class="complete-text">').replace('[/S]', '</span>');
        
        // Update information
        voucherRedeemDialog.$dialog.find('.reg-st3-membership-bl').removeClass('pro1 pro2 pro3 pro4');
        voucherRedeemDialog.$dialog.find('.reg-st3-membership-bl').addClass('pro' + proNum);
        voucherRedeemDialog.$dialog.find('.plan-name').html(proName);
        voucherRedeemDialog.$dialog.find('.price .dollars').text(planPriceDollars);
        voucherRedeemDialog.$dialog.find('.price .cents').text('.' + planPriceCents);
        voucherRedeemDialog.$dialog.find('.price .period').text('/' + monthOrYearText);
        voucherRedeemDialog.$dialog.find('.reg-st3-storage .quota-amount').text(storageAmount);
        voucherRedeemDialog.$dialog.find('.reg-st3-storage .quota-unit').text(storageUnit);
        voucherRedeemDialog.$dialog.find('.reg-st3-bandwidth .quota-amount').text(bandwidthAmount);
        voucherRedeemDialog.$dialog.find('.reg-st3-bandwidth .quota-unit').text(bandwidthUnit);
        voucherRedeemDialog.$dialog.find('.title-text').html(titleText);
        voucherRedeemDialog.$dialog.find('.balance-text').html(balanceText);
        voucherRedeemDialog.$dialog.find('.complete-upgrade-text').html(upgradeText);
        voucherRedeemDialog.$dialog.find('.pro-plan').text(proName);
        voucherRedeemDialog.$dialog.find('.complete-upgrade-button').attr('data-plan-id', planId);
        
        // Show the dialog
        voucherRedeemDialog.showBackgroundOverlay();
        voucherRedeemDialog.$dialog.removeClass('hidden');
        
        // Button functionality
        voucherRedeemDialog.initCloseButton();
        voucherRedeemDialog.initUpgradeButton();
    },
    
    /**
     * Closes the dialog and goes to the pro page
     */
    initCloseButton: function() {
        
        voucherRedeemDialog.$dialog.find('.payment-close-icon, .choose-plan-button').rebind('click', function() {
            
            // Hide the dialog
            voucherRedeemDialog.hideBackgroundOverlay();
            voucherRedeemDialog.$dialog.addClass('hidden');
            
            // Go to the #pro page
            document.location.hash = 'pro';
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
        
        voucherRedeemDialog.$dialog.find('.complete-upgrade-button').rebind('click', function() {
            
            voucherRedeemDialog.$dialog.addClass('hidden');
            voucherRedeemDialog.processProPurchaseWithBalance();            
        });        
    },
    
    /**
     * Complete the Pro purchase using their balance and the relevant plan
     */
    processProPurchaseWithBalance: function() {
        
        // Data for API request
        var apiId = voucherRedeemDialog.bestPlan[0];
        var price = voucherRedeemDialog.bestPlan[5];
        var currency = voucherRedeemDialog.bestPlan[6];
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
                            voucherRedeemDialog.showSuccessfulPayment();
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
        var proNum = voucherRedeemDialog.bestPlan[1];
        var proPlan = getProPlan(proNum);
        var successMessage = l[6962].replace('%1', '<span>' + proPlan + '</span>');
        
        // Show the success
        voucherRedeemDialog.showBackgroundOverlay();
        voucherRedeemDialog.$successOverlay.removeClass('hidden');
        voucherRedeemDialog.$successOverlay.find('.payment-result-txt').html(successMessage);
        
        // Add click handlers for 'Go to my account' and Close buttons
        voucherRedeemDialog.$successOverlay.find('.payment-result-button, .payment-close').rebind('click', function() {
            
            // Hide the overlay
            voucherRedeemDialog.hideBackgroundOverlay();
            voucherRedeemDialog.$successOverlay.addClass('hidden');
            
            // Make sure it fetches new account data on reload
            // and redirect to account page to show purchase
            if (M.account) {
                M.account.lastupdate = 0;
            }
            
            document.location.hash = 'fm/account/history';
            return false;
        });
    },
    
    /**
     * Shows the background overlay
     */
    showBackgroundOverlay: function() {

        voucherRedeemDialog.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');
    },
    
    /**
     * Hides the background overlay
     */
    hideBackgroundOverlay: function() {

        voucherRedeemDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
    }
};