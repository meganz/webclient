/**
 * Code for the direct voucher redeem dialog when users come from a direct link
 * e.g. https://mega.nz/redeem or https://mega.nz/#voucher8RNU1PYPYDQWBE04J67F.
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

    /* Promotional voucher types */
    PROMO_VOUCHER_REGULAR: 1,
    PROMO_VOUCHER_BUSINESS: 2,
    PROMO_VOUCHER_PRO_FLEXI: 3,

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

        this.getVoucherData()
            .then((data) => {

                // If any vouchers are used on a business user, we want to show this error message
                assert(!(u_attr && u_attr.b && !window.bCreatedVoucher && !window.busUpgrade), l[22888]);

                // If any vouchers are attempted to be redeemed for a current Pro Flexi user, show this error message
                assert(!(u_attr && u_attr.pf), l.pro_flexi_cannot_redeem_voucher);

                redeem.voucherData = data;

                // Was the user already logged-in? otherwise if they just signed in/up no confirm needed.
                if (!sessionStorage.signinorup && !window.bCreatedVoucher && !window.busUpgrade) {

                    // Show confirm dialog asking the user if he wants to redeem the voucher for this account.
                    return redeem.showConfirmAccountDialog();
                }
            })
            .then(() => {
                const data = redeem.voucherData;

                // if Business voucher with individual account, stop and collect needed data.
                if (!window.busUpgrade && !window.bCreatedVoucher && data.businessmonths && u_attr && !u_attr.b
                    && redeem.voucherData.proNum !== pro.ACCOUNT_LEVEL_PRO_FLEXI) {

                    window.businessVoucher = 1;
                    window.busUpgrade = 1;
                    loadSubPage('registerb');
                    return false;
                }

                // No longer needed.
                delete window.busUpgrade;
                delete localStorage.voucher;
                delete localStorage[data.code];

                if (window.u_attr && u_attr['^!promocode']) {
                    Promise.resolve(mega.attr.remove('promocode', -2, true)).dump(`promo-code-removal`);
                }

                // Make API call to redeem voucher
                return api.req({a: 'promoter' in data ? 'epcr' : 'uavr', v: data.code, p: data.promoter})
                    .then(() => {

                        if (data.promotional) {

                            // A promotional voucher gets auto-redeemed into quota
                            redeem.$dialog.addClass('hidden');
                            redeem.showSuccessfulPayment(true);
                        }
                        else {
                            // non-promotional voucher, proceed with confirm dialog.
                            data.balance += data.value;
                            redeem.displayDialog();
                        }
                    });
            })
            .catch((ex) => {
                if (!ex) {
                    // cancelled confirm dialog.
                    return redeem.goToCloud();
                }
                console.error('Redemption error.', ex);
                redeem.showErrorDialog(ex);
            });
    },

    /**
     * Show a dialog to confirm whether they have the right account for redeeming the voucher
     */
    showConfirmAccountDialog: function() {
        'use strict';

        return new Promise((resolve, reject) => {

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
     * @param {String} submessage
     * @param {String|Array} [buttons]
     * @param {Boolean} [error]
     * @returns {MegaPromise}
     */
    showDialog: function(title, message, submessage, buttons, error) {
        'use strict';

        if (buttons && !Array.isArray(buttons)) {
            buttons = [buttons /* CANCEL */, l[81] /* OK */];
        }

        return new Promise((resolve, reject) => {
            if (is_mobile) {
                var icon = (error ? 'invalid-' : '') + 'voucher';
                if (submessage) {
                    title = message;
                    message = submessage;
                }

                const promise = mobile.messageOverlay.show(title, message, icon, buttons, false, true);

                if (error) {
                    // For warning dialog it is reversed on desktop
                    promise.then(reject).catch(resolve);
                }
                else {
                    promise.then(resolve).catch(reject);
                }

                return promise;
            }

            var type = error ? 'warninga' : 'confirmation';

            if (buttons) {
                type += ':!^' + buttons[0] + '!' + buttons[1];
            }

            msgDialog(type, title, message, submessage, (yup) => {
                if (yup) {
                    return resolve();
                }
                reject();
            });
        });
    },

    /**
     * Show error dialog.
     * @param {String|number} [message] The message or API error to display
     */
    showErrorDialog: function(message) {
        'use strict';
        if (message < 0) {
            message = message === ETOOMANY ? l.redeem_etoomany : `${api_strerror(message)} (${message})`;
        }
        // Show 'Oops, that does not seem to be a valid voucher code.' if none given
        // With buttons, 'Contact Support' & 'Cloud Drive'
        this.showDialog(l[20416], l[473], String(message || ''), [l[18148], l[19266]], true)
            .then(function() {
                redeem.goToCloud();
            })
            .catch(function() {
                redeem.hideBackgroundOverlay();
                mega.redirect('mega.io', 'contact', false, false, false);
                loadSubPage('fm');
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
                            mega.redirect('mega.io', 'contact', false, false, false);
                        });
                    }

                    // Not a valid voucher code
                    else if (result < 0) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[135], l[473], '', function() {
                            redeem.hideBackgroundOverlay();
                            mega.redirect('mega.io', 'contact', false, false, false);
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
        api_req({ a : 'utqa', nf: 2, p: 1, r: 1 }, {
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

        // Get the currency and currency symbols from the first array element i.e. { a: 'utqa', nf: 2 } structure)
        const localeInfo = result[0].l;
        const currency = localeInfo.c;           // Default is EUR
        const currencySymbol = localeInfo.cs;    // Default is Euro symbol
        const localCurrency = localeInfo.lc || currency;
        const localCurrencySymbol = localeInfo.lcs || currencySymbol;

        // The rest of the webclient expects this data in an array format
        // [api_id, account_level, storage, transfer, months, price, currency, monthlybaseprice]
        var results = [];
        for (var i = 1; i < result.length; i++) {
            results.push([
                result[i].id,
                result[i].al,        // account level
                result[i].s,         // storage
                result[i].t,         // transfer
                result[i].m,         // months
                result[i].p / 100,   // price (convert from cents)
                currency,            // currency (usually EUR)
                result[i].mbp / 100, // monthly base price
                result[i].lp / 100,  // local price
                localCurrency,       // local currency e.g. NZD
                localCurrencySymbol  // local currency symbol e.g. $
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
     * Get the Pro Flexi plan details
     * @param {Array} plans The plans from the utqa response
     * @returns {Array} Returns the single Pro Flexi plan details
     */
    getProFlexiPlan: function(plans) {

        'use strict';

        for (var i = 0; i < plans.length; i++) {

            if (plans[i].al === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                return plans[i];
            }
        }
    },

    /**
     * Get the Business plan details
     * @param {Array} plans The plans from the utqa response
     * @returns {Array} Returns the single Business plan details
     */
    getBusinessPlan: function(plans) {

        'use strict';

        for (var i = 0; i < plans.length; i++) {

            if (plans[i].al === pro.ACCOUNT_LEVEL_BUSINESS) {
                return plans[i];
            }
        }
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
        var planPrice = String(vd.price).split('.');
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
        $('.plan-icon', redeem.$dialog).removeClass('pro1 pro2 pro3 pro4 pro101 business')
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
        api.screq({a: 'uts', it: 0, si: apiId, p: price, c: currency, aff})
            .then(({result: saleId}) => {

                // User Transaction Complete API call
                return api.screq({a: 'utc', s: [saleId], m: gatewayId});
            })
            .then(() => {

                // Show success dialog
                redeem.showSuccessfulPayment();
            })
            .catch((ex) => {

                tell(ex === EOVERQUOTA ? l[514] : ex);
            })
            .finally(() => loadingDialog.hide());
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

        // If the user just signed up or Business account, redirect to the app onboarding
        if (signup || (u_type === 3 && vd.businessmonths && vd.proNum === pro.ACCOUNT_LEVEL_BUSINESS)) {
            sessionStorage.voucherData = JSON.stringify(vd);
            loadSubPage('fm');
            return false;
        }

        var $voucherBlock = $('.promo-voucher-block', redeem.$successOverlay);
        var $voucherIcon = $('.plan-icon', $voucherBlock);
        var proPlanName;

        if (vd.businessmonths && vd.proNum === pro.ACCOUNT_LEVEL_BUSINESS) {

            proPlanName = mega.icu.format(l.month_business_voucher, vd.businessmonths);
            if (vd.businessmonths === 12) {
                proPlanName = l[23491];
            }

            $voucherIcon.removeClass('pro1 pro2 pro3 pro4 pro101').addClass('business');
            $('.promo-voucher-card', $voucherBlock).removeClass('red-block').removeClass('yellow-block')
                .addClass('blue-block');

            $('.payment-result-txt', redeem.$successOverlay).safeHTML(l[19809].replace('{0}', '1'));
            $('.payment-result-header', redeem.$successOverlay).safeHTML(l[23497] + '<br/>' + proPlanName);

            history.replaceState({ subpage: 'fm' }, "", '/fm');

            // Show Business plan details
            $('.storage-amount', $voucherBlock).safeHTML(l[23789].replace('%1', l[5816].replace('[X]', 3) + '+'));
            $('.transfer-amount', $voucherBlock).safeHTML(l[23790].replace('%1', l[5816].replace('[X]', 3) + '+'));

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

            // Show icon on mobile web
            $voucherIcon.removeClass('pro1 pro2 pro3 pro4 pro101 business')
                .addClass('pro' + vd.proNum);

            if (vd.proNum === pro.ACCOUNT_LEVEL_PRO_LITE) {
                $('.promo-voucher-card', $voucherBlock).removeClass('red-block').removeClass('blue-block')
                    .addClass('yellow-block');
            }
            else {
                $('.promo-voucher-card', $voucherBlock).removeClass('yellow-block').removeClass('blue-block')
                    .addClass('red-block');
            }
            $('.payment-result-txt .plan-name', redeem.$successOverlay).text(proPlanName);
            insertEmailToPayResult(redeem.$successOverlay);

            $('.payment-result-header', redeem.$successOverlay).text(promo ? l[20430] : l[6961]);

            // Show PRO plan details
            $('.storage-amount', $voucherBlock)
                .safeHTML(l[23789].replace('%1', bytesToSize(vd.storage * 0x40000000, 0)));
            $('.transfer-amount', $voucherBlock)
                .safeHTML(l[23790].replace('%1', bytesToSize(vd.bandwidth * 0x40000000, 0)));
        }

        $voucherBlock.removeClass('hidden');

        // Show the success
        redeem.showBackgroundOverlay();
        redeem.$successOverlay.removeClass('hidden');

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
            var descText = l[22120];
            var $greenBtn = $('.voucher-info-create', $dlg);
            var $greenBtnSpan = $('span', $greenBtn);
            var $whiteBtn = $('.voucher-info-login', $dlg);
            var $whiteBtnSpan = $('span', $whiteBtn);
            var $dlgTitle = $('h2', $dlg);

            if (is_mobile) {
                $dlgTitle = $('.voucher-head .v-header-text', $dlg);
            }

            $greenBtn.removeClass('disabled');
            $whiteBtn.removeClass('disabled').removeAttr('bFail');
            $dlgTitle.removeClass('red');

            // If Business (NB: Pro Flexi also sets businessmonths property, so we need to be specific)
            if (mega.voucher.businessmonths && mega.voucher.promotional === redeem.PROMO_VOUCHER_BUSINESS) {
                $('.v-storage', $dlg).safeHTML(l[23789].replace('%1', l[5816].replace('[X]', 3) + '+'));
                $('.v-transfer', $dlg).safeHTML(l[23790].replace('%1', l[5816].replace('[X]', 3) + '+'));

                $('.voucher-logo', $dlg).addClass('business-v');
                $('.plan-icon', $dlg).removeClass('pro1 pro2 pro3 pro4 pro101').addClass('business');

                const titleText = mega.voucher.businessmonths === 12 ? l.account_voucher_year : l.account_voucher_month;
                $dlgTitle.text(mega.icu.format(titleText, mega.voucher.businessmonths).replace('%1', l[19530]));
                descText = l.redeem_bus_acc;

                greenBtnText = l[19516];
                if (window.bCreatedVoucher || u_type === 3) {
                    greenBtnText = l[458];
                    whiteBtnText = l[82];
                    descText = l[23496];
                }
            }
            else {
                // Pro I-IV and Lite
                const voucherLength = mega.voucher.months;
                let voucherType = pro.getProPlanName(
                    mega.voucher.hasOwnProperty('item')
                        ? mega.voucher.item.al
                        : mega.voucher.proNum
                );

                // Calculate whether to use month or year text for the voucher e.g. 1 years or 1 months Pro plan
                const useYearString = voucherLength % 12 === 0;
                let titleText = useYearString ? l.account_voucher_year : l.account_voucher_month;
                let monthsOrYears = useYearString ? voucherLength / 12 : voucherLength;

                // Temporary S4 beta voucher
                if (mega.voucher.s4) {
                    voucherType = l.s4_beta_title;
                    titleText = l.account_voucher_month;
                    monthsOrYears = mega.voucher.businessmonths;
                    const $termsCheck = $('.s4-voucher-terms-check', $dlg)
                        .addClass('checkboxOff')
                        .removeClass('hidden checkboxOn');
                    const termsToggle = () => {
                        if ($termsCheck.hasClass('checkboxOff')) {
                            $termsCheck.addClass('checkboxOn').removeClass('checkboxOff');
                            $greenBtn.removeClass('disabled');
                            if (u_type !== 3) {
                                $whiteBtn.removeClass('disabled');
                            }
                        }
                        else {
                            $termsCheck.addClass('checkboxOff').removeClass('checkboxOn');
                            $greenBtn.addClass('disabled');
                            if (u_type !== 3) {
                                $whiteBtn.addClass('disabled');
                            }
                        }
                    };
                    $termsCheck.rebind('click.redeemterms', termsToggle);
                    $('.s4-voucher-terms-label', $dlg).removeClass('hidden').rebind('click.redeemterms', termsToggle);
                    $greenBtn.addClass('disabled');
                    if (u_type !== 3) {
                        $whiteBtn.addClass('disabled');
                    }
                }
                else {
                    $('.s4-voucher-terms-check, .s4-voucher-terms-label', $dlg).addClass('hidden');
                }

                $dlgTitle.text(mega.icu.format(titleText, monthsOrYears).replace('%1', voucherType));

                var storageBytes = mega.voucher.storage * 1024 * 1024 * 1024;
                var storageFormatted = numOfBytes(storageBytes, 0);
                var storageValue = Math.round(storageFormatted.size) + ' ' + storageFormatted.unit;

                $('.v-storage', $dlg).safeHTML(l[23789].replace('%1', storageValue));
                $('.plan-icon', $dlg).removeClass('pro1 pro2 pro3 pro4 pro101 business')
                    .addClass('pro' + mega.voucher.proNum);

                var bandwidthBytes = mega.voucher.bandwidth * 1024 * 1024 * 1024;
                var bandwidthFormatted = numOfBytes(bandwidthBytes, 0);
                var bandwidthValue = Math.round(bandwidthFormatted.size) + ' ' + bandwidthFormatted.unit;

                $('.v-transfer', $dlg).safeHTML(l[23790].replace('%1', bandwidthValue));

                // Mobile web block background colour styling to match crest
                if (mega.voucher.proNum === pro.ACCOUNT_LEVEL_PRO_LITE) {
                    $('.voucher-logo', $dlg).addClass('pro-l');
                }
                else if (mega.voucher.proNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                    $('.voucher-logo', $dlg).addClass('pro-iv');
                }
                else {
                    $('.voucher-logo', $dlg).removeClass('pro-l');
                }

                // pro voucher redemption
                if (u_type === 3) {
                    greenBtnText = l[458];
                    whiteBtnText = l[82];
                    descText = l[23496];
                }

                // Is this PRO voucher being used for a business registration?
                if (window.bCreatedVoucher) {
                    $greenBtn.addClass('disabled');
                    descText = l[23541];
                    $dlgTitle.addClass('red');
                    whiteBtnText = l[82];
                    $whiteBtn.attr('bFail', 1);
                }

            }
            $('.v-description', $dlg).text(descText);

            $greenBtnSpan.text(greenBtnText);
            $whiteBtnSpan.text(whiteBtnText);

            $whiteBtn.rebind(
                'click',
                function() {
                    if (!window.bCreatedVoucher && u_type !== 3) {
                        login_txt = l[7712];
                        loadSubPage('login');
                    }
                    else {
                        $('button.js-close, .close-voucher-redeem', $dlg).eq(0).trigger('click');
                    }
                    return false;
                });

            $greenBtn.rebind(
                'click',
                function() {
                    if ($(this).hasClass('disabled')) {
                        return false;
                    }
                    closeDialog();

                    if (window.busUpgrade || window.bCreatedVoucher ||
                        (mega.voucher.businessmonths && u_attr && u_attr.b)) {

                        loadSubPage('redeem');
                        return false;
                    }

                    // If Business (NB: Pro Flexi also has businessmonths set so check the promotional value too
                    if (mega.voucher.businessmonths && mega.voucher.promotional === redeem.PROMO_VOUCHER_BUSINESS) {
                        window.businessVoucher = 1;
                        window.busUpgrade = 1;
                        loadSubPage('registerb');
                        return false;
                    }

                    register_txt = l[7712];
                    loadSubPage('register');
                    return false;
                });

            $('button.js-close, .close-voucher-redeem', $dlg).rebind(
                'click.redeem',
                function() {
                    const voucher = localStorage.voucher;
                    delete localStorage.voucher;
                    if (is_mobile) {
                        loadSubPage(`redeem${voucher}`);
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
                var $dlg = $('.mega-dialog.voucher-info-redeem');

                return infoFilling($dlg);
            });
        }
        else {
            parsepage(pages['mvoucherinfo']);
            infoFilling();
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

        return new Promise((resolve, reject) => {
            var parse = function(v) {

                var b = v.promotional ? v.value : (v.balance + v.value);
                var validPlanItem = v.item && v.item.al && v.item.s && v.item.t && v.item.m && v.item.p;

                // If Temp S4 beta voucher
                if (v.s4) {
                    // 60TB each.
                    v.storage = 61440;
                    v.bandwidth = 61440;
                    // Fake as pro-flexi level.
                    v.proNum = redeem.getProFlexiPlan(v.plans).al;
                }
                // If Pro Flexi promotional voucher
                else if (v.promotional === redeem.PROMO_VOUCHER_PRO_FLEXI) {

                    const plan = redeem.getProFlexiPlan(v.plans);

                    v.planId = plan.id;
                    v.proNum = plan.al;
                    v.storage = plan.bd.ba.s;
                    v.bandwidth = plan.bd.ba.t;
                    v.months = plan.m;
                    v.price = plan.bd.ba.p;
                }

                // If Business promotional voucher
                else if (v.promotional === redeem.PROMO_VOUCHER_BUSINESS) {

                    const plan = redeem.getBusinessPlan(v.plans);

                    v.planId = plan.id;
                    v.proNum = plan.al;
                    v.storage = plan.bd.ba.s;
                    v.bandwidth = plan.bd.ba.t;
                    v.months = plan.m;
                    v.price = plan.bd.ba.p;
                }

                // If regular promotional voucher
                else if (v.promotional && validPlanItem) {

                    v.planId = v.item.id;
                    v.proNum = v.item.al;
                    v.storage = v.item.s;
                    v.bandwidth = v.item.t;
                    v.months = v.item.m;
                    v.price = v.item.p;
                }
                else {
                    // Regular vouchers, find the best plan
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
                {a: 'utqa', nf: 2, b: 1, p: 1, r: 1}
            ];

            const callback = ({responses: res}) => {
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

                    // If Pro Flexi promotional voucher
                    if (v.promotional === redeem.PROMO_VOUCHER_PRO_FLEXI) {
                        return parse(v);
                    }
                    else if (v.businessmonths) {
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

            api.req(request).then(callback).catch(reject);
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
                        api.req({a: 'uavr', v: code}).then(({result: res}) => resolve({res, data})).catch(reject);
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
                    loadingDialog.hide();
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
                    loadingDialog.hide();
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
