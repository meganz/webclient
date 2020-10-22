/**
 * Code for the direct voucher redeem dialog when users come from
 * a direct link e.g. https://mega.nz/#voucher8RNU1PYPYDQWBE04J67F.
 * This code is shared for desktop and mobile webclient.
 */
var redeem = {

    $dialog: null,
    $backgroundOverlay: null,
    $successOverlay: null,

    voucherCode: '',
    voucherData: false,
    accountBalance: 0,
    voucherAmount: 0,
    bestPlan: null,

    /**
     * Initialisation of the dialog
     */
    init: function() {
        'use strict';

        // Cache DOM reference for lookup in other functions
        redeem.$dialog = $('.voucher-redeem-dialog');
        redeem.$backgroundOverlay = $('.fm-dialog-overlay');
        redeem.$successOverlay = $('.payment-result.success');

        // If we are dealing with business voucher in signup process, things are different.
        // so dont do following checks.
        if (!window.bCreatedVoucher) {
            if (!u_type || u_type < 3) {
                return redeem.goToCloud();
            }

            // Init functionality
            if (localStorage.oldRedeemFlow) {
                return this.showConfirmAccountDialog()
                    .then(this.addVoucher.bind(this)).catch(this.goToCloud.bind(this));
            }
        }

        this.getVoucherData().then(function(data) {
            var promise;

            if (!data.businessmonths && u_attr && u_attr.b) {
                // business user

                msgDialog(
                    'warninga',
                    l[1578],
                    l[22888],
                    '',
                    function() {
                        redeem.goToCloud();
                    }
                );
                return;
            }

            redeem.voucherData = data;

            // Was the user already logged-in?
            if (!sessionStorage.signinorup && !window.bCreatedVoucher) {
                // Show confirm dialog asking the user if he wants to redeem the voucher for this account.
                promise = redeem.showConfirmAccountDialog();
            }
            else {
                // The user just signed in/up, no confirm needed.
                promise = MegaPromise.resolve();
            }

            var addVoucher = function() {
                // Make API call to redeem voucher
                // MegaPromise.resolve()
                M.req({a: 'promoter' in data ? 'epcr' : 'uavr', v: data.code, p: data.promoter})
                    .then(function() {
                        if (data.promotional) {
                            // A promotional voucher gets auto-redeem into quota
                            redeem.$dialog.addClass('hidden');
                            redeem.showSuccessfulPayment(true);
                        }
                        else {
                            // non-promotional voucher, proceed with confirm dialog.
                            data.balance += data.value;
                            redeem.displayDialog();
                        }
                    })
                    .catch(function(ex) {
                        console.error('uavr failed...', ex);
                        redeem.showErrorDialog();
                    });

                // No longer needed.
                delete localStorage.voucher;
                delete localStorage[data.code];
                if (u_attr['^!promocode']) {
                    mega.attr.remove('promocode', -2, true).dump();
                }

            };

            promise.then(addVoucher).catch(redeem.goToCloud.bind(redeem));

        }).catch(function(ex) {
            console.error('Redemption error.', ex);
            redeem.showErrorDialog();
        });
    },

    /**
     * Show a dialog to confirm whether they have the right account for redeeming the voucher
     */
    showConfirmAccountDialog: function() {
        'use strict';

        return new MegaPromise(function(resolve, reject) {
            // Are you sure you want to redeem this voucher for the email@domain.com account?
            var message = String(l[19328]).replace('%1', window.u_attr && u_attr.email || '');

            // Confirm with the user, that this is right account to redeem the code
            redeem.showDialog(l[7160], message).then(resolve).catch(reject);

            if (is_mobile) {
                var $overlay = $('#mobile-ui-error .white-block');
                $('.third', $overlay).removeClass('hidden');
                $('.third span', $overlay).text(l[20131]);
                $('.first', $overlay).addClass('green-button');
            }
        });
    },

    /**
     * Redirect the user to the fm, for whatever reason.
     */
    goToCloud: function() {
        'use strict';
        delete localStorage.voucher;
        redeem.hideBackgroundOverlay();
        loadSubPage('fm');
    },

    /**
     * Show dialog to the user to confirm something...
     * @param {String} title
     * @param {String} message
     * @param {String|Array} [buttons]
     * @param {Boolean} [error]
     * @returns {MegaPromise}
     */
    showDialog: function(title, message, buttons, error) {
        'use strict';

        if (buttons && !Array.isArray(buttons)) {
            buttons = [buttons /* CANCEL */, l[81] /* OK */];
        }

        return new MegaPromise(function(resolve, reject) {
            if (is_mobile) {
                var icon = (error ? 'invalid-' : '') + 'voucher';
                return mobile.messageOverlay.show(title, message, icon, buttons).then(resolve).catch(reject);
            }

            var type = error ? 'warninga' : 'confirmation';

            if (buttons) {
                type += ':!^' + buttons[0] + '!' + buttons[1];
            }

            msgDialog(type, title, message, false, function(yup) {
                if (yup) {
                    return resolve();
                }
                reject();
            });
        });
    },

    /**
     * Show error dialog.
     * @param {String} [message]
     */
    showErrorDialog: function(message) {
        'use strict';

        // Show 'Oops, that does not seem to be a valid voucher code.' if none given
        message = message || l[473];

        // With buttons, 'Contact Support' & 'Cloud Drive'
        this.showDialog(l[20416], message, [l[18148], l[19266]], true)
            .then(function() {
                redeem.goToCloud();
            })
            .catch(function() {
                redeem.hideBackgroundOverlay();
                loadSubPage('contact');
            });
    },

    /**
     * Redeems the voucher code
     */
    addVoucher: function() {

        // Get the voucher code
        redeem.voucherCode = localStorage.getItem('voucher');

        /* TESTING CODE to prevent actually redeeming a voucher
        redeem.getVoucherValue();
        return false;
        //*/

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
        'use strict';

        // This call will return an array of arrays. Each array contains this data:
        // [api_id, account_level, storage, transfer, months, price, currency, description, ios_id, google_id]
        api_req({ a : 'utqa', nf: 1 }, {
            callback: function (result) {
                // Update the list of plans
                redeem.membershipPlans = redeem.parseProPlans(result);

                // Get all the available pro plans
                var bestPlan = redeem.calculateBestProPlan(redeem.membershipPlans, redeem.accountBalance);

                // Set the best plan for the user
                redeem.bestPlan = bestPlan;

                // Display the dialog
                redeem.displayDialog();
            }
        });
    },

    /**
     * Get the Pro membership plans
     */
    parseProPlans: function(result) {
        'use strict';

        // The rest of the webclient expects this data in an array format
        // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
        var results = [];
        for (var i = 0; i < result.length; i++) {
            results.push([
                result[i]['id'],
                result[i]['al'],  // account level
                result[i]['s'],   // storage
                result[i]['t'],   // transfer
                result[i]['m'],   // months
                result[i]['p'],   // price
                result[i]['c'],   // currency
                result[i]['mbp'], // monthly base price
                result[i]['lp'],  // NEW 'local price'
                result[i]['lpc'], // NEW 'local price currency'
                result[i]['lps'], // NEW 'local price symbol'
                result[i]['lp0']
            ]);
        }

        return results;
    },

    /**
     * Calculates the best plan for
     */
    calculateBestProPlan: function(plans, balance) {
        'use strict';

        // Sort plans by lowest price first
        plans.sort(function(planA, planB) {

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
        for (var i = 0; i < plans.length; i++) {

            // Convert string price to float for correct comparison
            var planPrice = parseFloat(plans[i][5]);

            // If their account balance is equal or more than the plan price, update
            if (planPrice <= balance) {
                selectedPlanIndex = i;
            }
            else {
                // Exit out, the other plans are too expensive
                break;
            }
        }

        // Set the best plan for the user
        return plans[selectedPlanIndex];
    },

    /**
     * Displays the details on the dialog
     */
    displayDialog: function() {
        'use strict';

        var vd = this.voucherData;
        var balance2dp = vd.balance.toFixed(2);
        var planId = vd.planId;
        var proNum = vd.proNum;
        var storage = vd.storage;
        var bandwidth = vd.bandwidth;
        var numOfMonths = vd.months;
        var intl = mega.intl.decimal;
        var decimalSeparator = mega.intl.decimalSeparator;
        var planPrice = vd.price.split('.');
        var proName = pro.getProPlanName(proNum);
        var euroSign = ' \u20ac';

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
        titleText = titleText.replace('%1', intl.format(vd.value));

        // "Your balance is now 18.00 &euro;."
        var balanceText = redeem.$dialog.find('.balance-text').html();
        balanceText = balanceText.replace('%1', intl.format(balance2dp));

        // "We suggest the PRO Lite plan based on your account balance."
        // "Click COMPLETE UPGRADE and enjoy your new PRO Lite plan."
        var upgradeText = redeem.$dialog.find('.complete-upgrade-text').html();
        upgradeText = upgradeText.replace(/%1/g, proName);
        upgradeText = upgradeText.replace('[S]', '<span class="complete-text">').replace('[/S]', '</span>');

        // Update information
        $('.plan-icon', redeem.$dialog).removeClass('pro1 pro2 pro3 pro4 business')
            .addClass('pro' + proNum);
        $('.plan-title', redeem.$dialog).safeHTML(proName);
        $('.price', redeem.$dialog).text(intl.format(planPriceDollars)
            + decimalSeparator + intl.format(planPriceCents) + euroSign);
        $('.plan-period', redeem.$dialog).text('/' + monthOrYearText);
        $('.title-text', redeem.$dialog).safeHTML(titleText);
        $('.storage span', redeem.$dialog).safeHTML(intl.format(storageAmount) + ' ' + storageUnit);
        $('.transfer span', redeem.$dialog).safeHTML(intl.format(bandwidthAmount) + ' ' + bandwidthUnit);
        $('.balance-text', redeem.$dialog).safeHTML(balanceText);
        $('.complete-upgrade-text', redeem.$dialog).safeHTML(upgradeText);
        $('.pro-plan', redeem.$dialog).text(proName);
        $('.complete-upgrade-button', redeem.$dialog).attr('data-plan-id', planId);
        $('.choose-plan-button', redeem.$dialog).addClass('hidden');

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

        'use strict';

        redeem.$dialog.find('.payment-close-icon, .choose-plan-button, .fm-dialog-close').rebind('click', function() {

            // Hide the dialog and load the Pro page step 1
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
        'use strict';

        // Data for API request
        var vd = this.voucherData;
        var apiId = vd.planId;
        var price = vd.price;
        var currency = vd.currency;
        var gatewayId = 0;                                  // Prepay / account balance
        var aff = mega.affid;

        // Start loading spinner
        loadingDialog.show();

        // User Transaction Sale API call
        api_req({ a: 'uts', it: 0, si: apiId, p: price, c: currency, aff: aff }, {
            callback: function (utsResult) {

                // Store the sale ID to check with API later
                var saleId = utsResult;

                // If an error
                if (typeof saleId === 'number' && saleId < 0) {

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
                        if (typeof utcResult === 'number' && utcResult < 0) {

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
    showSuccessfulPayment: function(promo) {
        'use strict';
        var vd = redeem.voucherData;
        var signup = parseInt(sessionStorage.signinorup) === 2;
        delete sessionStorage.signinorup;

        // we may fired `ug` previously and it hence may does have an outdated PRO plan, let's patch it...
        if (typeof u_attr === 'object') {
            u_attr.p = window.bCreatedVoucher ? 100 : vd.proNum;
        }

        if (signup || (u_type === 3 && vd.businessmonths)) {
            // The user just signed up, redirect to the app onboarding
            sessionStorage.voucherData = JSON.stringify(vd);
            loadSubPage('downloadapp');
            return false;
        }

        var $voucherBlock = $('.promo-voucher-block', redeem.$successOverlay);
        var $voucherIcon = $('.plan-icon', $voucherBlock);
        var proPlanName;
        var sQuota;
        var tQuota;

        if (vd.businessmonths) {
            if (vd.businessmonths === 1) {
                proPlanName = l[23492];
            }
            else if (vd.businessmonths === 12) {
                proPlanName = l[23491];
            }
            else {
                proPlanName = l[23493].replace('%n', vd.businessmonths);
            }
            sQuota = l[24091];
            tQuota = l[7094];

            $voucherIcon.removeClass('pro1 pro2 pro3 pro4').addClass('business');
            $('.promo-voucher-card', $voucherBlock).removeClass('red-block').removeClass('yellow-block')
                .addClass('blue-block');

            $('.payment-result-txt', redeem.$successOverlay).safeHTML(l[19809].replace('{0}', '1'));
            $('.payment-result-header', redeem.$successOverlay).safeHTML(l[23497] + '<br/>' + proPlanName);

            history.replaceState({ subpage: 'fm' }, "", '/fm');

            if (window.bCreatedVoucher) {
                delete window.bCreatedVoucher;
                mega.voucher.redeemSuccess = true;
                $('.payment-result-button, .payment-close', redeem.$successOverlay).addClass('hidden');
            }
        }
        else {
            // Get the selected Pro plan details
            var proNum = vd.proNum;
            proPlanName = pro.getProPlanName(proNum);

            $voucherIcon.removeClass('pro1 pro2 pro3 pro4 business')
                .addClass('pro' + vd.proNum);
            if (vd.proNum === 4) {
                $('.promo-voucher-card', $voucherBlock).removeClass('red-block').removeClass('blue-block')
                    .addClass('yellow-block');
            }
            else {
                $('.promo-voucher-card', $voucherBlock).removeClass('yellow-block').removeClass('blue-block')
                    .addClass('red-block');
            }
            $('.payment-result-txt .plan-name', redeem.$successOverlay).text(proPlanName);
            insertEmailToPayResult(redeem.$successOverlay);

            $('.payment-result-header', redeem.$successOverlay).text((promo ? l[20430] : l[6961]) + '!');
        }

        $voucherBlock.removeClass('hidden');
        // Show the success
        redeem.showBackgroundOverlay();
        redeem.$successOverlay.removeClass('hidden');

        // Show PRO plan details
        $('.storage-amount', $voucherBlock)
            .safeHTML(l[23789].replace('%1', sQuota || bytesToSize(vd.storage * 0x40000000, 0)));
        $('.transfer-amount', $voucherBlock)
            .safeHTML(l[23790].replace('%1', tQuota || bytesToSize(vd.bandwidth * 0x40000000, 0)));

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

            // On mobile just load the main account page as there is no payment history yet
            loadSubPage(is_mobile ? 'fm/account' : 'fm/account/plan');
            return false;
        });
    },

    showVoucherInfoDialog: function() {
        'use strict';

        var infoFilling = function($dlg) {
            var greenBtnText = l[968];
            var whiteBtnText = l[171];
            var titleText = l[22120];
            var $greenBtn = $('.voucher-info-create', $dlg).removeClass('disabled');
            var $whiteBtn = $('.voucher-info-login', $dlg).removeAttr('bFail');
            var $dlgTitle = $('.dialog-title', $dlg).removeClass('red');

            if (mega.voucher.businessmonths) {
                $('.v-storage', $dlg).safeHTML(l[24097]);
                $('.v-transfer', $dlg).safeHTML(l[24098]);

                $('.voucher-logo', $dlg).addClass('business-v');
                $('.plan-icon', $dlg).removeClass('pro1 pro2 pro3 pro4').addClass('business');

                var headerText;
                if (mega.voucher.businessmonths === 1) {
                    headerText = l[23492];
                }
                else if (mega.voucher.businessmonths === 12) {
                    headerText = l[23491];
                }
                else {
                    headerText = l[23493].replace('%n', mega.voucher.businessmonths);
                }
                $('.voucher-head .v-header-text', $dlg).text(headerText);

                greenBtnText = l[19516];
                if (window.bCreatedVoucher || u_type === 3) {
                    greenBtnText = l[458];
                    whiteBtnText = l[82];
                    titleText = l[23496];
                }
            }
            else {
                var storageBytes = mega.voucher.storage * 1024 * 1024 * 1024;
                var storageFormatted = numOfBytes(storageBytes, 0);
                var storageValue = Math.round(storageFormatted.size) + ' ' + storageFormatted.unit;

                $('.v-storage', $dlg).safeHTML(l[23789].replace('%1', '<span>' + storageValue + '</span>'));

                $('.plan-icon', $dlg).removeClass('pro1 pro2 pro3 pro4 business')
                    .addClass('pro' + mega.voucher.proNum);


                var bandwidthBytes = mega.voucher.bandwidth * 1024 * 1024 * 1024;
                var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
                var bandwidthValue = Math.round(bandwidthFormatted.size) + ' ' + bandwidthFormatted.unit;

                $('.v-transfer', $dlg).safeHTML(l[23790].replace('%1', '<span>' + bandwidthValue + '</span>'));

                if (mega.voucher.proNum === 4) {
                    $('.voucher-logo', $dlg).addClass('pro-l');
                }
                else {
                    $('.voucher-logo', $dlg).removeClass('pro-l');
                }
                $('.voucher-head .v-header-text', $dlg).text(l[22114]);

                // Is this PRO voucher being used for a business registration?
                if (window.bCreatedVoucher) {
                    $greenBtn.addClass('disabled');
                    titleText = l[23541];
                    $dlgTitle.addClass('red');
                    whiteBtnText = l[82];
                    $whiteBtn.attr('bFail', 1);
                }

            }
            $dlgTitle.text(titleText);

            $greenBtn.text(greenBtnText);
            $whiteBtn.text(whiteBtnText);

            $whiteBtn.rebind(
                'click',
                function() {
                    closeDialog();
                    if ($(this).attr('bFail')) {
                        loadSubPage('registerb');
                        return false;
                    }
                    login_txt = l[7712];
                    loadSubPage('login');
                    return false;
                });

            $greenBtn.rebind(
                'click',
                function() {
                    if ($(this).hasClass('disabled')) {
                        return false;
                    }
                    closeDialog();
                    if (window.bCreatedVoucher || (mega.voucher.businessmonths && u_type === 3)) {
                        loadSubPage('redeem');
                        return false;
                    }
                    if (mega.voucher.businessmonths) {
                        window.businessVoucher = 1;
                        loadSubPage('registerb');
                        return false;
                    }
                    register_txt = l[7712];
                    loadSubPage('register');
                    return false;
                });

            $('.close-voucher-redeem', $dlg).rebind(
                'click',
                function() {
                    if (is_mobile) {
                        if (mega.voucher.businessmonths) {
                            loadSubPage('registerb');
                        }
                        else {
                            loadSubPage('redeem');
                        }
                    }
                    else {
                        closeDialog();
                    }
                    return false;
                });

            return $dlg;
        };

        if (!is_mobile) {
            M.safeShowDialog('voucher-info-dlg', function() {
                var $dlg = $('.fm-dialog.voucher-info-redeem');

                return infoFilling($dlg);
            });
        }
        else {
            parsepage(pages['mvoucherinfo']);
            infoFilling($);
        }
    },

    /**
     * Function used when accessing '/reddem' without a voucher code in 'localStorage.voucher', or
     * having an existing voucher code but didn't complete login or register before
     */
    setupVoucherInputbox: function(code) {
        'use strict';
        var promoter;
        var path = getSitePath();
        var $overlay = $('.main-pad-block.redeem-promo-page').removeClass('hidden');
        var $button = $('.redeem-voucher', $overlay);
        var $input = $('input', $overlay);
        var megaInput = new mega.ui.MegaInputs($input);

        if (path.indexOf('computerbild') > 0) {
            promoter = 0;

            $('.pre-download', $overlay).text(l[20412]);
            $('.top-description', $overlay).text(l[20417]);
            $input.attr('placeholder', l[20418]);
        }

        $input.rebind('input.vib', function() {
            var value = $(this).val() || false;

            if (value.length > 11) {
                $button.addClass('active').removeClass('disabled');
            }
            else {
                $button.removeClass('active').addClass('disabled');
            }
            return false;
        });

        $button.rebind('click', function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }
            loadingDialog.show();

            redeem.getVoucherData($input.val(), promoter)
                .then(function(data) {
                    mega.voucher = data;
                    page = '';
                    loadSubPage('voucher' + data.code);
                })
                .catch(function() {
                    $input.val('');
                    megaInput.showError(l[20420]);
                    loadingDialog.hide();
                    $button.removeClass('active').addClass('disabled');
                });

            return false;
        });

        // Auto fill the existing voucher code into input box when accessing '/redeem'
        // without completion of login or register
        if (typeof code === 'string' && code.length > 11) {
            $input.val(code).trigger('input').trigger('focus');
        }
    },

    /**
     * Retrieve API data needed for the voucher handling.
     * @param {String} [code] Voucher code
     * @param {Number} [promo] Promoter identifier
     * @returns {MegaPromise}
     */
    getVoucherData: function(code, promo) {
        'use strict';

        return new MegaPromise(function(resolve, reject) {
            var parse = function(v) {
                var b = v.promotional ? v.value : (v.balance + v.value);

                var validPlanItem = v.item && v.item.al && v.item.s && v.item.t && v.item.m && v.item.p;

                if (v.promotional && validPlanItem) {
                    v.planId = v.item.id;
                    v.proNum = v.item.al;
                    v.storage = v.item.s;
                    v.bandwidth = v.item.t;
                    v.months = v.item.m;
                    v.price = v.item.p;
                }
                else {
                    var p = redeem.calculateBestProPlan(redeem.parseProPlans(v.plans), b);
                    v.planId = p[0];
                    v.proNum = p[1];
                    v.storage = p[2];
                    v.bandwidth = p[3];
                    v.months = p[4];
                    v.price = p[5];
                }

                if (v.available && v.proNum) {
                    return resolve(v);
                }
                reject(v);
            };

            code = code || localStorage.voucher;
            if (mega.voucher && mega.voucher.code === code) {
                return parse(mega.voucher);
            }

            var request = [
                {a: 'uavq', f: 1, v: code},
                {a: 'uq', pro: 1, gc: 1},
                {a: 'utqa', nf: 1}
            ];

            var callback = function(meh, ctx, rr, res) {
                if (res && typeof res[0] === 'object') {
                    var v = res[0];
                    v.balance = parseFloat((((res[1] || []).balance || [])[0] || [])[0]) || 0;
                    v.value = parseFloat(v.value);
                    v.plans = res[2];
                    v.code = code;

                    if (promo !== undefined) {
                        v.promotional = 1;
                        v.promoter = promo;
                        v.available = v.valid;
                        localStorage[code] = promo;
                    }

                    if (v.businessmonths) {
                        return resolve(v);
                    }
                    else if (v.value) {
                        return parse(v);
                    }
                }

                reject(ENOENT);
            };

            if (promo === undefined) {
                promo = localStorage[code];
            }

            if (promo !== undefined) {
                request[0].p = promo;
                request[0].a = 'epcq';
            }

            api_req(request, {callback: tryCatch(callback, reject)});
        });
    },

    /**
     * Redeems a voucher code
     * @param {String} code The voucher code
     */
    redeemVoucher: function(code) {
        'use strict';

        var self = this;
        return new Promise(function(resolve, reject) {
            self.getVoucherData(code)
                .then(function(data) {
                    var redeem = function() {
                        M.req({a: 'uavr', v: code}).then(resolve.bind(null, data)).catch(reject);
                    };

                    if (data.promotional) {
                        msgDialog('confirmation', l[761], l[20665], l[6994], function(yes) {
                            if ($.dialog) {
                                fm_showoverlay();
                            }
                            if (yes) {
                                return redeem();
                            }
                            reject(null);
                        });
                    }
                    else {
                        redeem();
                    }
                })
                .catch(function(ex) {
                    if (ex) {
                        console.warn('redeemVoucher', ex);
                    }

                    // Oops, that does not seem to be a valid voucher code.
                    msgDialog('warninga', l[135], l[473], '', function() {
                        if ($.dialog) {
                            fm_showoverlay();
                        }
                        reject(null);
                    });
                });
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
