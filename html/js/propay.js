pro.propay = {

    DEFAULT_DURATION: 12,

    BITCOIN_GATE_ID: 4,

    $page: null,

    planNum: null,
    selectedPeriod: null,
    planObj: null,
    proBalance: 0,
    selectedProPackage: null,

    paymentGateways: {
        primary: null,
        secondary: null,
    },

    gateSupportsTrial: false,

    pageInfo: {
        'initialized': false,
    },

    gatewaysByName: Object.create(null),

    currentGatewayName: null,
    currentGateway: null,

    proPaymentMethod: null,

    loadingPage: false,

    cachedGateways: Object.create(null),

    switchers: Object.create(null),

    savedCard: false,

    paymentButtons: new Set(['stripeGP', 'stripeAP']),

    paymentButton: false,

    useSavedCard: null,
    savedCardInitiated: false,
    sca: false,

    trial: 1,

    usingBalance: false,    // User has not entered into voucher flow, only sees balance
    balanceStringForDropdown: false,    // Dropdown filled out with the string balance instead of voucher

    paymentType: null,

    browser: null,
    googlePayBrowsers: new Set(['Chrome', 'Edgium', 'Opera', 'Safari']),
    applePayBrowsers: new Set(['Safari']),


    isVoucherBalance() {
        'use strict';
        return this.currentGateway && this.currentGateway.gatewayId === 0;
    },


    // TODO: This value should be dynamic once fully implemented in API
    requiresBillingAddress: {
        19: true,
        16: true,
    },

    /**
     * Checks if the current gateway and selections support a trial
     * @returns {boolean|object} - Returns false if a trial should not be shown, or the trial object if it should
     */
    shouldShowTrial() {
        return (this.gateSupportsTrial || !this.currentGateway)
            && this.onPropayPage()
            && (this.planObj && this.planObj.trial);
    },

    onPropayPage() {
        'use strict';
        return page.includes('propay');
    },

    initSwitchers() {
        'use strict';

        const recurringElements = {
            'recurring': {
                $element: $('.recurring', this.$page),
                initialised: true,
            },
            'one-time': {
                $element: $('.one-time', this.$page),
                initialised: true,
            },
            'trial': {
                $element: $('.trial', this.$page),
                initialised: true,
            },
        };

        if (this.switchers.recurring) {
            this.switchers.recurring.remove();
        }

        const defaultState = this.shouldShowTrial()
            ? 'trial'
            : 'recurring';

        this.switchers.recurring = mega.elementSwitcher(
            recurringElements,      // elements
            defaultState,        // default
            'propay-recurring-switcher',        // switcherName
            true);      // hide all elements on initialization

    },

    showErrors(reasons) {
        'use strict';

        reasons = reasons || this.blockFlow();
        $('.error', this.$page).removeClass('error');

        if (reasons === true) {
            this.errors = false;
            return false;
        }

        if (!reasons) {
            this.errors = false;
            return false;
        }

        if (reasons.gatewayNeeded) {
            this.errors = true;
            $('.dropdown-wrapper-primary', this.$page).addClass('error');
            $('.dropdown-wrapper-primary .mega-input', this.$page).addClass('error');
        }

        if (reasons.addressNeeded || reasons.addressInvalid) {
            this.errors = true;
            $('.billing-address .billing-info', this.$page).addClass('error');
        }

        if (reasons.s4TosNeeded) {
            this.errors = true;
            $('.s4-tos', this.$page).addClass('error');
        }

        if (this.errors) {
            $('.error', this.$page)[0].scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
        }
    },

    blockFlow() {
        'use strict';

        const reasons = Object.create(null);

        if (!this.currentGateway) {
            reasons.gatewayNeeded = 1;
        }

        if (this.requiresBilling()) {
            if (!addressDialog.validInputs) {
                addressDialog.validateAndPay(false, true);
            }
            if (addressDialog.validInputs === null) {
                reasons.addressNeeded = 1;
            }
            else if (addressDialog.validInputs === false) {
                reasons.addressInvalid = 1;
            }
        }

        if (window.s4ac && this.s4Active && !this.s4TosAccepted) {
            reasons.s4TosNeeded = 1;
        }

        return Object.keys(reasons).length && reasons;
    },

    getTempGate() {
        'use strict';

        const key = this.planObj.id + '_' + this.currentGatewayName;
        const gateways = localStorage.cachedGateways
            ? JSON.parse(localStorage.cachedGateways)
            : {};

        if (gateways[key]) {
            return gateways[key];
        }
        return false;
    },

    setTempGate(data) {
        'use strict';

        if (this.getTempGate()) {
            return this.getTempGate();
        }


        const key = this.planObj.id + '_' + this.currentGatewayName;
        const gateways = localStorage.cachedGateways
            ? JSON.parse(localStorage.cachedGateways)
            : {};

        gateways[key] = data;
        localStorage.cachedGateways = JSON.stringify(gateways);
        return gateways[key];
    },

    getPageType() {
        'use strict';

        if (this.gateSupportsTrial && this.planObj.trial) {
            return 'trial';
        }
        return 'regular';
    },

    async getSavedCard() {
        'use strict';

        this.savedCard = await api.req({a: 'cci', v: 2}).then(res => {
            return typeof res.result === 'object'
                ? !!res.result.reuse && res.result
                : false;
        }).catch(() => false);
        return this.savedCard;
    },

    planNumsByName: {
        'vpn': pro.ACCOUNT_LEVEL_FEATURE_VPN,
        'pwm': pro.ACCOUNT_LEVEL_FEATURE_PWM,
    },

    getPreSelectedDuration() {
        'use strict';
        let selectedPeriod;

        if (sessionStorage.fromOverquotaPeriod) {
            selectedPeriod = sessionStorage.fromOverquotaPeriod;
            delete sessionStorage.fromOverquotaPeriod;
        }
        else {
            selectedPeriod = sessionStorage['pro.period'];
        }

        selectedPeriod = parseInt(selectedPeriod) || this.DEFAULT_DURATION;

        const eventId = selectedPeriod === 1 ? 500367 : 500368;
        eventlog(eventId, pro.getProPlanName(this.planNum));


        return selectedPeriod;
    },

    requiresBilling() {
        'use strict';

        if (!this.currentGateway) {
            return false;
        }
        if (!this.requiresBillingAddress[this.currentGateway.gatewayId]) {
            return false;
        }

        return this.currentGateway.requireBilling !== false;
    },

    updatePageInfo() {
        'use strict';

        const recurringAllowed = !this.currentGateway || this.currentGateway.supportsRecurring;

        const gatewayId = this.currentGateway && this.currentGateway.gatewayId;

        this.paymentButton = this.currentGateway
            && this.paymentButtons.has(this.currentGateway.gatewayName)
            && this.currentGateway.gatewayName;


        const state = this.shouldShowTrial()
            ? 'trial'
            : recurringAllowed ? 'recurring' : 'one-time';

        this.switchers.recurring.showElement(state);

        const $oneTimeInfo = $('footer div.one-time', this.$page);
        const $recurringInfo = $('footer div.recurring', this.$page);
        const $trialInfo = $('footer div.trial', this.$page);

        $('.billing-address', this.$page).toggleClass('hidden', !this.requiresBilling());

        if (state === 'trial') {
            $('span.trial-duration', $trialInfo)
                .text(mega.icu.format(l.days_chat_history_plural, this.planObj.trial.days));
            $('span.plan-price', $trialInfo)
                .text(this.planObj.getFormattedPrice('narrowSymbol')
                    + (((this.planObj.currency === 'EUR') || this.isVoucherBalance()) ? '' : '*')
                    + ' '
                    + this.planObj.currency);
            $('span.plan-months', $trialInfo).text(this.getRecurringDurationWording(this.planObj.months));
            $('span.plan-name', $trialInfo).text(this.planObj.name);
        }
        else {
            $('span.plan-name', $oneTimeInfo).text(this.planObj.name);
            $('span.plan-duration', $oneTimeInfo)
                .text(this.getNumOfMonthsWording((this.discountInfo && this.discountInfo.m) || this.planObj.months));
        }

        if (state === 'recurring') {
            let selector = 'span.recurring';
            const planLevel = this.planObj.level;
            $('span', $recurringInfo).addClass('hidden');
            if (pro.getPlanObj(planLevel, 1)) {
                selector += '-monthly';
            }
            if (pro.getPlanObj(planLevel, 12)) {
                selector += '-yearly';
            }
            $(selector, $recurringInfo).removeClass('hidden');
        }

        if (gatewayId === 0) {
            voucherDialog.setPropayWarning();
        }

        if (this.trial !== this.shouldShowTrial()) {
            this.renderPlanInfo();
            this.trial = this.shouldShowTrial();
        }

        this.updateS4Continue();

        $('.free-trial-unsupported', this.$page)
            .toggleClass('hidden', (!!this.shouldShowTrial() === !!this.planObj.trial));
        this.renderLocaleInfo(this.isVoucherBalance());
    },

    /**
    * Process results from the API User Transaction Complete call
    * @param {Object|Number} utcResult The results from the UTC call or a negative number on failure
    * @param {String} saleId The sale ID
    */
    async processUtcResults(utcResult, saleId) {
        'use strict';

        this.sca = utcResult.sca ? {utcResult, saleId} : false;

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

            // If tpay, redirect to the site
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
                if (!this.sca) {
                    addressDialog.processUtcResult(utcResult, true, saleId);
                }
                break;
        }
    },

    isUtcCached() {
        'use strict';

        return false;

        const key = this.planObj.id + '_' + this.currentGatewayName;
        const gateways = localStorage.cachedUtc
            ? JSON.parse(localStorage.cachedUtc)
            : {};

        if (gateways[key]) {
            return gateways[key];
        }
        return false;
    },

    getCachedUtcRequest() {
        'use strict';

        if (this.isUtcCached()) {
            return this.isUtcCached();
        }
    },

    setCachedUtcRequest(data) {
        'use strict';

        const key = this.planObj.id + '_' + this.currentGatewayName;

        if (this.currentGatewayName.toLowerCase() === 'bitcoin') {
            setTimeout(() => {
                delete localStorage.cachedUtc[key];
            }, 1000 * 60 * 10);
        }

        const gateways = localStorage.cachedUtc
            ? JSON.parse(localStorage.cachedUtc)
            : {};

        gateways[key] = data;
        localStorage.cachedUtc = JSON.stringify(gateways);
        return gateways[key];
    },

    sendPurchaseToApi(paymentTypeId) {
        'use strict';

        if (paymentTypeId === undefined) {
            console.error('No payment type ID provided for purchase');
            return;
        }

        if (!this.proPaymentMethod || !this.currentGateway || (this.currentGateway.gatewayId !== paymentTypeId)) {
            return;
        }

        // TODO: Show inline loading dialog for stripe and bitcoin

        const apiId = this.planObj.id;
        const price = (this.planObj.taxInfo || Object.create(null)).taxedPriceEuro || this.planObj.priceEuro;
        const currency = 'EUR';
        const itemNum = this.planObj.itemNum;

        // Convert from boolean to integer for API
        const fromBandwidthDialog = ((Date.now() - parseInt(localStorage.seenOverQuotaDialog)) < 2 * 3600000) ? 1 : 0;
        const fromPreWarnBandwidthDialog = ((Date.now() - parseInt(localStorage.seenQuotaPreWarn)) < 2 * 36e5) ? 1 : 0;

        // uts = User Transaction Sale
        const utsRequest = {
            m,
            a: 'uts',
            it: itemNum,
            si: apiId,
            p: price,
            c: currency,
            bq: fromBandwidthDialog,
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

        const discountInfo = pro.propay.getDiscount();
        if (discountInfo && discountInfo.dc) {
            utsRequest.dc = discountInfo.dc;
        }

        // Add S4 parameters
        const s4Flexi = this.s4Active && window.s4ac && pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI;

        if (s4Flexi) {
            utsRequest.s4 = 1;
        }

        const setValues = (extra, saleId) => {

            if (this.proPaymentMethod === 'voucher' || this.proPaymentMethod === 'pro_prepaid') {
                pro.lastPaymentProviderId = 0;
            }
            else if (this.proPaymentMethod === 'bitcoin') {
                pro.lastPaymentProviderId = 4;
            }
            else if (this.proPaymentMethod === 'perfunctio') {
                pro.lastPaymentProviderId = 8;
            }
            else if (this.proPaymentMethod === 'dynamicpay') {
                pro.lastPaymentProviderId = 5;
            }
            else if (this.proPaymentMethod === 'fortumo') {
                // pro.lastPaymentProviderId = 6;
                // Fortumo does not do a utc request, we immediately redirect
                fortumo.redirectToSite(saleId);
                return false;
            }
            else if (this.proPaymentMethod === 'infobip') {
                // pro.lastPaymentProviderId = 9;
                // Centili does not do a utc request, we immediately redirect
                centili.redirectToSite(saleId);
                return false;
            }
            else if (this.proPaymentMethod === 'paysafecard') {
                pro.lastPaymentProviderId = 10;
            }
            else if (this.proPaymentMethod === 'tpay') {
                pro.lastPaymentProviderId = tpay.gatewayId; // 14
            }
            else if (this.proPaymentMethod.indexOf('directreseller') === 0) {
                pro.lastPaymentProviderId = directReseller.gatewayId; // 15
            }

            // If AstroPay, send extra details
            else if (this.proPaymentMethod.indexOf('astropay') > -1) {
                pro.lastPaymentProviderId = astroPayDialog.gatewayId;
                extra.bank = astroPayDialog.selectedProvider.extra.code;
                extra.name = astroPayDialog.fullName;
                extra.address = astroPayDialog.address;
                extra.city = astroPayDialog.city;
                extra.cpf = astroPayDialog.taxNumber;
            }

            // If Ecomprocessing, send extra details
            else if (this.proPaymentMethod.indexOf('ecp') === 0) {
                pro.lastPaymentProviderId = addressDialog.gatewayId;
                Object.assign(extra, addressDialog.extraDetails);
            }
            else if (this.proPaymentMethod.indexOf('sabadell') === 0) {
                pro.lastPaymentProviderId = sabadell.gatewayId; // 17

                // If the provider supports recurring payments set extra.recurring as true
                extra.recurring = true;
            }
            else if (this.proPaymentMethod.toLowerCase().indexOf('stripe') === 0) {
                Object.assign(extra, addressDialog.extraDetails);
                pro.lastPaymentProviderId = addressDialog.gatewayId_stripe;

                // Do not set pmid if user is not using a saved card
                if (this.useSavedCard && this.savedCard.id && !this.paymentButton) {
                    extra.pmid = this.savedCard.id;
                }
                if (!this.currentGateway.supportsRecurring) {
                    extra.recurring = false;
                }
                extra.pm = this.currentGateway.gatewayName;
            }

            return true;
        };

        const temp = this.getTempGate();

        if (this.getCachedUtcRequest() && temp) {
            console.error('Cached UTC request found.');
            setValues({}, temp.result);
            this.processUtcResults(this.getCachedUtcRequest(), temp.result);
            return;
        }

        // Setup the 'uts' API request
        (temp
            ? Promise.resolve({result: temp})
            : api.screq(utsRequest)
        )
            .then(({result: saleId}) => {

                if (!this.currentGateway || (this.currentGateway.gatewayId !== paymentTypeId)) {
                    if (d) {
                        console.warn('Gateway was changed during loading, do not proceed');
                    }
                    return;
                }

                // this.setTempGate({result: saleId});
                if (saleId.result) {
                    saleId = saleId.result;
                }

                // Extra gateway specific details for UTC call
                var extra = {};

                if (!setValues(extra, saleId)) {
                    return false;
                }

                // If saleId is already an array of sale IDs use that, otherwise add to an array
                const saleIdArray = Array.isArray(saleId) ? saleId : [saleId];

                // Complete the transaction
                const utcReqObj = {
                    a: 'utc',                       // User Transaction Complete
                    s: saleIdArray,                 // Array of Sale IDs
                    m: pro.lastPaymentProviderId,   // Gateway number
                    bq: fromBandwidthDialog,        // Log for bandwidth quota triggered
                    extra                           // Extra information for the specific gateway
                };

                const discountInfo = pro.propay.getDiscount();
                if (discountInfo && discountInfo.dc) {
                    utcReqObj.dc = discountInfo.dc;
                }

                return api.screq(utcReqObj).then(({result}) => {
                    if (!this.currentGateway || (this.currentGateway.gatewayId !== paymentTypeId)) {
                        if (d) {
                            console.warn('Gateway was changed during loading, do not proceed');
                        }
                        return;
                    }
                    this.setCachedUtcRequest(result);
                    this.processUtcResults(result, saleId);
                });
            })
            .catch((ex) => {

                console.error(ex);
                // Default error is "Something went wrong. Try again later..."
                let errorMessage;

                // Get S4 error messages
                if (s4Flexi && (errorMessage = ActivateS4.instance.getErrorMsg(ex))) {
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

                eventlog(500717, String(ex));

                tell(errorMessage);
            });
    },

    setPlanFromUrl() {
        'use strict';

        const pageParts = page.split('_');

        if (pageParts[1] === undefined) {
            return false;
        }

        if (parseInt(pageParts[2])) {
            sessionStorage.fromOverquotaPeriod = pageParts[2];
        }

        const proNum = this.planNumsByName[pageParts[1]] || parseInt(pageParts[1]);

        if ((mega.flags
            && (mega.flags.pf !== 1))
            && (proNum === pro.ACCOUNT_LEVEL_PRO_FLEXI)) {
            return false;
        }

        const validNums = new Set([
            ...pro.filter.simple.validPurchases,
            ...pro.filter.simple.validFeatures
        ]);

        // Check the URL has propay_XXX format
        if (validNums.has(proNum)) {

            // Get the Pro number e.g. 2 then the name e.g. Pro I - III, Pro Lite, Pro Flexi etc
            pro.propay.planNum = proNum;

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
            case 100001: // Pass
                return 500792;
            default:    // Other plan
                return 500473;
        }
    },

    shouldShowTrialBlocker: (blockerText, blockerTitle) => {
        'use strict';

        return !pro.propay.ignoreTrial
            && !pro.filter.simple.validPurchases.has(pro.propay.planNum)
            && !pro.propay.trial
            && !blockerText
            && !blockerTitle;
    },

    showFeatureWarning(title, text, cancelTxt, proceedText) {
        'use strict';


        return new Promise((resolve) => {

            if (!pro.propay.onPropayPage()) {
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
                    if (pro.propay.onPropayPage()) {
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
                if (!shouldShowWarning || !pro.propay.onPropayPage()) {
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

    async getUserPlanInfo() {
        'use strict';

        if (!pro.propay.currentPlanData) {
            pro.propay.currentPlanData = await M.getUserPlanInfo().then(({subs, plans}) => {
                return {subs, plans};
            });
        }
    },

    async checkCurrentFeatureStatus(planLevel) {
        'use strict';

        await pro.propay.getUserPlanInfo();
        return pro.propay.checkUserFeature(planLevel);
    },

    async checkUserFeatures() {
        'use strict';

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
            else if ((status === 1)) {
                loadingDialog.show('propayReady');
            }
            // User left propay page
            else if (status === -1) {
                return;
            }
        }

        pro.propay.loading = false;

        const propayPageVisitEventId = pro.propay.getPropayPageEventId(pro.propay.planNum);
        eventlog(propayPageVisitEventId);
    },

    async loadPlansAndCheckStorage() {
        'use strict';

        // TODO: replace with trycatch
        try {
            // Fetch storage quota and membership plans in parallel
            const [storage] = await Promise.all([
                M.getStorageQuota(),
                voucherDialog.getLatestBalance(),
                pro.loadMembershipPlans(),
            ]);

            this.planObj = pro.getPlanObj(this.planNum, this.getPreSelectedDuration());

            // If no plan of selected duration found, see if there are any plans of the same level
            if (!this.planObj) {
                this.planObj = pro.getPlanObj(this.planNum);

                // If no plan found for the selected level, exit early
                if (!this.planObj) {
                    console.error('No plan found for selected level');
                    return false;
                }
            }

            this.selectedPeriod = this.planObj.months;
            this.selectedProPackage = this.planObj.planArray;

            await this.checkUserFeatures();

            // Check storage against the plan and handle the result
            const enoughStorage = checkPlanStorage(storage.used, this.planNum);
            if (!enoughStorage) {
                console.error('Selected plan does not have enough storage space');
            }
            return enoughStorage;

        }
        catch (ex) {
            console.error("Error loading plans or checking storage:", ex);
            return false;
        }
    },

    checkGateway(gate) {
        'use strict';

        const {
            level,
            maxCorrPriceEuro,
            trial,
            months,
            durationOptions
        } = this.planObj;

        // If plan is flexi and the gateway doesn't support business(and flexi)
        if (level === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            if (gate.supportsBusinessPlans !== 1) {
                return false;
            }
        }
        // If plan is not flexi and the gateway doesn't support individual plans
        else if ((gate.supportsIndividualPlans !== undefined) && !gate.supportsIndividualPlans) {
            return false;
        }

        // Exclude voucher from list of VPN gateways (TODO: Request a flag from API instead of using gatewayId)
        if (!gate.gatewayId && this.planObj.isIn('validFeatures')) {
            return false;
        }

        // If the gateway has a required price, and it is more than the plans max price
        if (gate.minimumEURAmountSupported > maxCorrPriceEuro) {
            return false;
        }

        // If the gateway does not support features, and the plan is a feature
        if (!gate.supportsFeaturePlans && this.planObj.isIn('validFeatures')) {
            return false;
        }

        if (gate.gatewayId === 19) {

            if (gate.gatewayName === 'stripeAP') {
                if (trial) {
                    return false;
                }
                delete gate.supportsTrial;
                delete gate.supportsDiscountCodes;
                delete gate.supportsMultiDiscountCodes;
            }

            const isApplePayAndBlocked = (gate.gatewayName === 'stripeAP')
                && !is_ios
                && !this.applePayBrowsers.has(this.browser);

            const isGooglePayAndBlocked = (gate.gatewayName === 'stripeGP')
                && !this.googlePayBrowsers.has(this.browser);

            if (isApplePayAndBlocked || isGooglePayAndBlocked) {
                return false;
            }
        }

        if (
            (months === 1 && !gate.supportsMonthlyPayment && !durationOptions.some(([,,,,m]) => m >= 12))
            || (months >= 12 && !gate.supportsAnnualPayment && !durationOptions.some(([,,,,m]) => m === 1))
        ) {
            return false;
        }

        // Gateway supports the current plan
        return gate;
    },

    getPageElements() {
        'use strict';

        if (this.pageInfo.initialized) {
            return this.pageInfo;
        }

        this.$page = $('#propay');

        if (!this.$page.length) {
            return false;
        }

        this.pageInfo = Object.create(null);

        this.pageInfo.$templates = $('#propay-page-templates');

        this.pageInfo.$leftBlock = $('.left-block', this.$page);
        this.pageInfo.$rightBlock = $('.right-block-card-wrapper', this.$page);

        this.pageInfo.$durationOptionsWrapper = $('.duration .options-wrapper', this.pageInfo.$leftBlock);

        this.pageInfo.$dropdownWrapper = $('.dropdown-wrapper', this.pageInfo.$leftBlock);

        this.pageInfo.initialized = true;

        return this.pageInfo;
    },

    renderPlanInfo() {
        'use strict';

        const isEuro = (this.planObj.currency === 'EUR') || this.isVoucherBalance();

        const planCardInitialized = this.pageInfo.$planCard && this.pageInfo.$planCard.length;
        const isFlexi = this.planObj.level === pro.ACCOUNT_LEVEL_PRO_FLEXI;

        let $trialSection;

        this.pageInfo.$planCard = (planCardInitialized && this.pageInfo.$planCard)
            || mega.templates.getTemplate('propay-page-plan-card-tmplt', false, this.pageInfo.$templates);

        this.pageInfo.$planCard.toggleClass('flexi', isFlexi);

        if (isFlexi) {
            $('.additional-content', this.pageInfo.$planCard)
                .text(l.pr_flexi_extra_charge_note
                    .replace('%1', bytesToSize(this.planObj.storage, 3, 4))
                    .replace('%2', formatCurrency(
                        this.planObj.transferCost, this.planObj.currency) + (isEuro ? '' : '*')));
        }

        if (this.shouldShowTrial()) {

            const information = {
                type: this.planObj.featureBits,
                days: this.planObj.trial.days
            };

            $trialSection = this
                .createFreeTrialSection(
                    this.planObj.getFormattedPrice('narrowSymbol'),
                    this.isVoucherBalance() ? 'EUR' : this.planObj.currency,
                    information
                ).removeClass('hidden');

            $('.how-it-works', this.pageInfo.$planCard)
                .removeClass('hidden')
                .empty()
                .safeAppend($trialSection.prop('outerHTML'));
            $('.pricing', this.pageInfo.$planCard).addClass('hidden');
        }
        else {
            $('.how-it-works', this.pageInfo.$planCard).addClass('hidden');
            $('.pricing', this.pageInfo.$planCard).removeClass('hidden');
        }

        $('.plan-name span', this.$page).text(this.planObj.name);

        const {$planCard} = this.pageInfo;


        let planNameTitleString;
        let planNameCardString;

        if (this.planObj.isIn('validFeatures')) {
            let titleStringKey;
            if (this.planObj.level === pro.ACCOUNT_LEVEL_FEATURE_PWM) {
                titleStringKey = 'you_have_selected_pass';
                if (this.shouldShowTrial()) {
                    titleStringKey += '_trial';
                    planNameCardString = l.pass_free_trial;
                }
            }
            else if (this.planObj.level === pro.ACCOUNT_LEVEL_FEATURE_VPN) {
                titleStringKey = 'you_have_selected_vpn';
                if (this.shouldShowTrial()) {
                    titleStringKey += '_trial';
                    planNameCardString = l.vpn_free_trial;
                }
            }

            planNameTitleString = l[titleStringKey];
        }
        else {
            planNameTitleString = l.you_have_selected_pro_plan.replace('%1', `<span>${this.planObj.name}</span>`);
        }

        planNameCardString = planNameCardString || this.planObj.name;

        $('.left-block .plan-name.title', this.$page).safeHTML(planNameTitleString);


        $('.plan-name', $planCard).text(planNameCardString);

        if (this.planObj.storage && this.planObj.transfer) {
            const $planInfo = $('.plan-info', $planCard).removeClass('hidden');
            $('.storage', $planInfo).text(bytesToSize(this.planObj.storage, 3, 4) + ' storage');
            $('.transfer', $planInfo).text(bytesToSize(this.planObj.transfer, 3, 4) + ' transfer');
        }

        const $includesContent = $('.includes-content', $planCard);

        $includesContent.empty();
        if (this.planObj.isIn('showFeatureInfo')) {
            for (const feature of this.planObj.featureStrings) {
                let HTMLString = '<div>';
                if (feature.icon) {
                    HTMLString += `<i class="sprite-fm-mono ${feature.icon}"></i>`;
                }
                HTMLString += feature.text;
                HTMLString += '</div>';

                $includesContent.safeAppend(HTMLString);
            }

            if ((this.planObj.level === pro.ACCOUNT_LEVEL_PRO_FLEXI) && window.s4ac) {
                $includesContent
                    .safeAppend(
                        `<div class="plan-card-s4">
                            <i class="sprite-fm-mono icon-bucket-triangle-thin-outline"></i>
                            ${l.ri_s4_tab}
                        </div>`
                    );
            }

            $('.includes', $planCard).removeClass('hidden');
            $includesContent.removeClass('hidden');
        }
        else {
            $includesContent.addClass('hidden');
        }

        const priceText = this.planObj
            .getFormattedPrice('narrowSymbol', isEuro, false, false, {includeTax: true})
                + `<span class="local">${isEuro ? '' : '*'}</span>
                <span class="currency"> ${isEuro ? 'EUR' : this.planObj.currency}</span>`;


        const isRecurring = !this.currentGateway || !!this.currentGateway.supportsRecurring;

        $('.pricing-element .duration-type', $planCard)
            .text(this.getNumOfMonthsWording(this.planObj.months, true));

        $('.pricing-element .price', $planCard).safeHTML(priceText);

        const $taxInfo = $('.tax-info', $planCard);

        if (this.planObj.taxInfo) {
            const forceEuro = this.isVoucherBalance();

            const getCurrencyText = (curr, ast) => {
                curr = curr || 'EUR';
                if (curr === 'EUR') {
                    return ` EUR`;
                }
                return `${ast ? '*' : ''} ${curr}`;
            };

            let localNet;
            let localTotal;
            let localTaxAmount;

            if (this.discountInfo) {
                const {ltpn, etpn, ltp, etp} = this.discountInfo;
                localNet = (!forceEuro && ltpn) || etpn;
                localTotal = (!forceEuro && ltp) || etp;
                localTaxAmount = localTotal - localNet;
            }

            const preTaxPriceText = localNet
                ? formatCurrency(localNet, forceEuro ? 'EUR' : this.planObj.currency, 'narrowSymbol')
                : this.planObj.getFormattedPrice('narrowSymbol', forceEuro);

            const taxAmountText = localTaxAmount
                ? formatCurrency(localTaxAmount, forceEuro ? 'EUR' : this.planObj.currency, 'narrowSymbol')
                : this.planObj.getFormattedPrice('narrowSymbol', forceEuro, false, false, {useTaxAmount: 1});

            $('.pre-tax-value', $taxInfo).text(preTaxPriceText + getCurrencyText(!forceEuro && this.planObj.currency));

            $('.tax-amount-descr', $taxInfo)
                .text(l.tax_name_percentage
                    .replace('%1', pro.taxInfo.taxName)
                    .replace('%2', formatPercentage(pro.taxInfo.taxPercent)));

            $('.tax-amount-value', $taxInfo).text(taxAmountText + getCurrencyText(!forceEuro && this.planObj.currency));

            $taxInfo.removeClass('hidden');
        }


        const discountInfo = this.getDiscount();
        const discountDuration = discountInfo
            && (discountInfo.m || discountInfo.md || this.planObj.months);

        if (discountInfo) {
            $('.pricing-element .duration-type', $planCard)
                .text(this.getNumOfMonthsWording(discountDuration, true));

            $('.plan-info .transfer', $planCard)
                .text(bytesToSize(this.planObj.baseTransfer * discountInfo.m, 3, 4) + ' transfer');
        }

        // TODO: Clean this up
        if (discountInfo && discountInfo.md && discountInfo.pd && discountInfo.al === pro.propay.planNum) {

            let oldPrice;

            const createPriceHTML = (price, noAsterisk) => {
                return `${price}
                <span class="local">${(isEuro || noAsterisk) ? '' : '*'}<span>
                <span class="currency"> ${this.planObj.currency}</span>`;
            };

            $('.pricing-element .price', $planCard).safeHTML(priceText);

            const {txva, tx, txn, edtpn, etpn, etp, edtp} = discountInfo;
            let {ltpn, ltp, ldtp, ldtpn} = discountInfo;

            ltp = (!isEuro && ltp) || etp;
            ldtp = (!isEuro && ldtp) || edtp;
            ldtpn = (!isEuro && ldtpn) || edtpn;
            ltpn = (!isEuro && ltpn) || etpn;

            const showTaxInfo = (txva !== undefined) && tx && txn && ltpn && ldtpn && ltp;

            if (!showTaxInfo) {
                ldtpn = ldtp;
                ltpn = ltp;
            }

            const price = ltp;

            if (price) {
                oldPrice = createPriceHTML(
                    formatCurrency(price, this.planObj.currency, 'narrowSymbol'),
                    true
                );
            }
            else {
                oldPrice = createPriceHTML(this.planObj
                    .getFormattedPrice('narrowSymbol', this.isVoucherBalance(), false, discountDuration), true);
            }

            const newPrice = createPriceHTML(formatCurrency(ldtp, this.planObj.currency, 'narrowSymbol'));

            const $discountHeader = $('.discount-header', $planCard);
            $discountHeader.text(l.special_deal_perc_off
                .replace('%1', formatPercentage(discountInfo.pd / 100))
                + ` (${this.getNumOfMonthsWording(discountDuration, true)})`
            ).removeClass('hidden');

            $('.price', $planCard).safeHTML(newPrice);
            $('.pre-discount-price', $planCard).safeHTML(oldPrice);
            $('.discount', $planCard).removeClass('hidden');
        }
        else if (discountInfo && discountInfo.al && discountInfo.pd && discountInfo.al === pro.propay.planNum) {

            const duration = this.planObj.months;
            const oldPrice = this.planObj.getFormattedPrice('narrowSymbol', this.isVoucherBalance());
            const newPrice = duration === 1
                ? discountInfo.lmp
                : discountInfo.lyp;


            const $discountHeader = $('.discount-header', $planCard);
            $discountHeader.text(l.special_deal_perc_off
                .replace('%1', formatPercentage(discountInfo.pd / 100))
            ).removeClass('hidden');

            $('.price', $planCard).text(newPrice + (isEuro ? '' : '*'));
            $('.pre-discount-price', $planCard).text(oldPrice + (isEuro ? '' : '*'));
            $('.discount', $planCard).removeClass('hidden');
        }
        else {
            $('.discount', $planCard).addClass('hidden');
        }

        if (!planCardInitialized) {
            $('.plan-card', this.pageInfo.$rightBlock).remove(); // In case there is a card present from another session
            this.pageInfo.$rightBlock.safeAppend($planCard.prop('outerHTML'));
            this.pageInfo.$planCard = $('.plan-card', this.pageInfo.$rightBlock);
        }

    },

    /**
     *
     * @param {Object} plan Plan to get the text string for
     * @param {1 | 12} months Number of months to get the string for
     * @param {String} givenString Predefined string to work with
     * @returns {string} The formatted string
     */
    getTxtString(plan, months, givenString) {
        givenString = givenString || mega.icu.format(l.charged_per_months, months);

        const isBalance = this.isVoucherBalance();

        return givenString
            .replace('%1', plan.getFormattedPrice('narrowSymbol', isBalance, false, months)
                + (plan.currency === 'EUR' || isBalance
                    ? '' : '*')
                + (isBalance ? '' : ' ' + plan.currency));
    },

    renderDurations() {
        'use strict';

        const $containedRadioTemplate = mega.templates
            .getTemplate('propay-contained-radio', false, this.pageInfo.$templates);

        const isRecurring = !this.currentGateway || !!this.currentGateway.supportsRecurring;

        this.pageInfo.$durationOptionsWrapper.empty();

        let discountMonths;
        let discountRenewalDuration;

        delete this.blockedByMinAmount;
        delete this.blockedByYearlyOnly;
        delete this.blockedByMonthlyOnly;

        let warning;

        const $promoEndsInfo = $('.promo-ends-info', this.pageInfo.$leftBlock);
        if (this.discountInfo && this.discountInfo.md && this.discountInfo.pd) {
            discountMonths = this.discountInfo.m;
            discountRenewalDuration = discountMonths % 12 === 0 ? 12 : 1;

            const date = new Date();
            date.setMonth(date.getMonth() + discountMonths);

            const planTaxInfo = this.planObj.taxInfo;
            const stringSelectorAddition = planTaxInfo ? '_tma' : '';

            const text = (discountRenewalDuration === 12
                ? l['discounted_price_years' + stringSelectorAddition]
                : l['discounted_price_months' + stringSelectorAddition])
                .replace('%1', date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }))
                .replace('%2', pro.getPlanObj(this.discountInfo.al, discountRenewalDuration)
                    .getFormattedPrice('narrowSymbol', this.isVoucherBalance(), false))
                .replace('%3', (pro.taxInfo || Object.create(null)).taxName);

            $('.promo-info-txt', $promoEndsInfo).text(text);
        }

        /**
         * Indicating the best option to save money on
         */
        const biggestSaveOption = [0, 0];
        const { durationOptions } = this.planObj;

        const appendDurationOption = ([,al,,,months]) => {
            if (discountMonths === months) {
                return; // No need to render, it's taken care of in Discount section
            }

            const perMonth = months === 1;
            const plan = pro.getPlanObj(al, months);

            const $radio = $containedRadioTemplate.clone()
                .removeClass('hidden template')
                .addClass('duration-option')
                .attr('duration', months);

            $('.duration-head .duration-type', $radio)
                .text(isRecurring
                    ? this.getRecurringDurationWording(months)
                    : this.getNumOfMonthsWording(months));

            if (!perMonth && isRecurring) {
                $('.monthly-price', $radio).text(pro.propay.getTxtString(plan, 1, l.per_month)).removeClass('hidden');
            }

            if (discountRenewalDuration) {
                $radio.addClass('disabled');
            }
            else if (months === this.selectedPeriod) {
                $('.radio-item', $radio).removeClass('radioOff').addClass('radioOn');
                $radio.addClass('selected');
            }

            if (!perMonth && !this.blockedByMonthlyOnly) {
                const getSavings = () => {
                    let amount;
                    let label;

                    if (isRecurring) {
                        if (plan.saveUpTo > 0) {
                            amount = plan.saveUpTo;
                            label = l.yearly_plan_saving.replace('%1', amount);
                        }
                    }
                    else if (this.isVoucherBalance()) {
                        amount = pro.getPlanObj(plan.level, 1).priceEuro * months - plan.priceEuro;
                        label = l[16649]
                            .replace('10.00', formatCurrency(amount, 'EUR'));
                    }
                    else {
                        amount = pro.getPlanObj(plan.level, 1).price * months - plan.price;
                        label = l[16649]
                            .replace('10.00', formatCurrency(amount, plan.currency));
                    }

                    if (amount > biggestSaveOption[0]) {
                        biggestSaveOption[0] = amount;
                        biggestSaveOption[1] = months;
                    }

                    return label;
                }

                const savingsAmount = getSavings();

                if (savingsAmount) {
                    $('.duration-head .duration-savings', $radio)
                        .safeAppend(savingsAmount)
                        .removeClass('hidden');
                }
            }

            $('.yearly-price', $radio)
                .text(pro.propay.getTxtString(plan, months, isRecurring ? false : '%1'))
                .removeClass('hidden');

            if (this.currentGateway) {
                let newDuration;

                const runDurationChecks = () => {
                    if (this.currentGateway.minimumEURAmountSupported > plan.priceEuro) {
                        $radio.addClass('disabled');
                        this.blockedByMinAmount = true;

                        if (!this.newDuration) {
                            newDuration = durationOptions.find(
                                ([,,,,,euroPrice]) => euroPrice >= this.currentGateway.minimumEURAmountSupported
                            )[pro.UTQA_RES_INDEX_MONTHS];
                        }
                    }
                    else if (perMonth && !this.currentGateway.supportsMonthlyPayment) {
                        this.blockedByYearlyOnly = true;
                        $radio.addClass('disabled');

                        if (!this.newDuration) {
                            newDuration = durationOptions.find(([,,,,m]) => m >= 12)[pro.UTQA_RES_INDEX_MONTHS];
                        }
                    }
                    else if (!perMonth && !this.currentGateway.supportsAnnualPayment) {
                        this.blockedByMonthlyOnly = true;
                        $radio.addClass('disabled');

                        if (!this.newDuration) {
                            newDuration = 1;
                        }
                    }
                };

                runDurationChecks();

                if (newDuration) {
                    this.planObj = pro.getPlanObj(al, newDuration);
                    this.selectedPeriod = this.newDuration = newDuration;

                    this.renderPlanInfo();
                    this.updatePayment();
                    return false;
                }
            }

            this.pageInfo.$durationOptionsWrapper.safeAppend($radio.prop('outerHTML'));
            return true;
        };

        $promoEndsInfo.toggleClass('hidden', !discountMonths || !isRecurring);

        if (durationOptions.length > 1 && !discountRenewalDuration) {
            let i = -1;

            while (++i < durationOptions.length) {
                if (!appendDurationOption(durationOptions[i])) {
                    return; // No need to render further, it's going to be re-rendered with new conditions
                }
            }

            delete this.newDuration;

            if (biggestSaveOption[0] > 0) {
                $(`[duration="${biggestSaveOption[1]}"] .duration-head .duration-savings`,
                  this.pageInfo.$durationOptionsWrapper).addClass('popular');
            }

            if (this.currentGateway) {
                if (this.currentGateway.gatewayId === 0) {
                    warning = this.usingBalance ? this.warningStrings.balance : this.warningStrings.voucher;
                }
                else if (this.currentGateway.gatewayId === 11) {
                    warning = this.warningStrings.astropayOneOff.replace('%1', this.currentGateway.displayName);
                }
                else if (this.blockedByYearlyOnly) {
                    warning = this.warningStrings.yearlyOnly;
                }
                else if (this.blockedByMonthlyOnly) {
                    warning = this.warningStrings.monthlyOnly;
                }
                else if (this.blockedByMinAmount) {
                    warning = this.warningStrings.minAmount;
                }
            }

            $('.duration', this.pageInfo.$leftBlock).removeClass('hidden');
        }
        else {
            $('.duration', this.pageInfo.$leftBlock).addClass('hidden');
        }

        const $warning = $('.one-off-payment-info', this.pageInfo.$leftBlock).toggleClass('hidden', !warning);
        if (warning) {
            $('.warning-txt', $warning).text(warning);
        }

        if (!discountRenewalDuration) {
            $('.duration-option', this.pageInfo.$durationOptionsWrapper).rebind('click.durationOption', (e) => {
                const $this = $(e.currentTarget);
                const duration = +$this.attr('duration');

                if ((this.selectedPeriod === duration) || $this.hasClass('disabled')) {
                    return;
                }

                this.selectedPeriod = duration;
                sessionStorage['pro.period'] = this.selectedPeriod;
                this.planObj = pro.getPlanObj(this.planNum, this.selectedPeriod);

                if (this.currentGateway && this.currentGateway.gatewayId === 0) {
                    this.usingBalance = this.usingBalance && pro.propay.useBalance();
                }

                this.renderPlanInfo();
                this.updatePayment();
            });
        }
    },

    getPaymentType(gateway) {
        'use strict';

        gateway = gateway || this.currentGateway;

        if (typeof gateway === 'string') {
            gateway = this.gatewaysByName[gateway];
        }
        if (!gateway) {
            return;
        }

        const gatewayId = gateway.gatewayId;
        const gatewayName = String(pro.getPaymentGatewayName(gatewayId, gateway).name);

        if ((gatewayName.indexOf('ecp') === 0)
            || gatewayName.toLowerCase().indexOf('stripe') === 0) {
            return 'creditcard';
        }
        else if (gatewayId === astroPayDialog.gatewayId) {
            return 'astropay';
        }
        else if ((gatewayName === 'voucher') || (gatewayName === 'wiretransfer')) {
            return gatewayName;
        }
        else {
            return 'other';
        }
    },

    renderSavedCard() {
        'use strict';

        if (this.savedCardInitiated) {
            return;
        }
        this.savedCardInitiated = true;
        const $savedCard = $('.saved-card', this.$page);

        if (!this.savedCard || !(this.savedCard.gw === this.currentGateway.gatewayId)) {
            $('.saved-card', this.$page).addClass('hidden');
            return;
        }


        const htmlString = `<span class="card-brand">${this.savedCard.brand}</span>
            <span class="dots"> \u2022\u2022\u2022\u2022 </span>
            <span class="last-4">${this.savedCard.last4}</span>`;

        $savedCard.removeClass('hidden').empty().safeAppend(htmlString);

        const items = [
            {
                html: htmlString,
                icon: 'sprite-fm-mono icon-payment',
                value: 'saved',
                selected: true,
            },
            {
                text: 'Add credit or debit card',
                icon: 'sprite-fm-mono icon-add',
                value: 'new',
            }
        ];

        $savedCard.empty();

        const $radioItemTemplate = mega.templates.getTemplate('radio-with-icon-label-tmplt');

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const $radioItem = $radioItemTemplate.clone()
                .removeClass('hidden template')
                .addClass('option payment')
                .attr('data-value', item.value);
            if (item.html) {
                $('.radio-txt', $radioItem).safeAppend(item.html);
            }
            else {
                $('.radio-txt', $radioItem).text(item.text);
            }

            if (item.selected) {
                $('.radio', $radioItem).removeClass('radioOff').addClass('radioOn');
            }

            $savedCard.safeAppend($radioItem.prop('outerHTML'));
        }

        this.useSavedCard = this.useSavedCard === null ? true : this.useSavedCard;
        let currentlySelected = 'saved';
        $('.option', $savedCard).rebind('click.propay', (e) => {

            const $this = $(e.currentTarget);
            const selected = $this.attr('data-value');

            if (selected === currentlySelected) {
                return;
            }

            currentlySelected = selected;

            $('.radio', $savedCard).removeClass('radioOn').addClass('radioOff');
            $('.radio', $this).removeClass('radioOff').addClass('radioOn');

            this.useSavedCard = selected === 'saved';

            this.updatePayment();
        });

    },

    updatePayment() {
        'use strict';

        if (page === 'registerb') {
            return;
        }

        this.currentGateway = this.gatewaysByName[this.currentGatewayName];
        this.gateSupportsTrial = this.currentGateway && this.currentGateway.supportsTrial;

        this.renderDurations();
        this.updatePageInfo();
        this.setContinuebuttonText();

        addressDialog.closeDialog();
        astroPayDialog.hideDialog(true);

        if (!this.currentGateway) {
            $('.specific-payment-info', this.$page).addClass('hidden');
            return;
        }


        $('.payment-loading-spinner', this.$page).removeClass('hidden');

        const $iframeContainer = $('.iframe-container', addressDialog.getStripeDialog());

        $iframeContainer.css('height', 306 + 'px');
        $('iframe#stripe-widget', $iframeContainer).addClass('hidden');

        const gatewayId = this.currentGateway.gatewayId;

        if (this.requiresBillingAddress[gatewayId]
            && (!addressDialog.billingInfoFilled || (addressDialog.validInputs === false))) {
            $('.specific-payment-info', this.$page).addClass('hidden');
            return;
        }

        const usingBalanceOnVoucher = this.usingBalance && (gatewayId === 0);
        const isAstropay = this.currentGateway.gatewayId === astroPayDialog.gatewayId;

        let shouldBlockFlow = false;
        const blockFlowReasons = this.blockFlow();

        // If s4Tos needed but not accepted, still load payment option
        if (blockFlowReasons) {
            delete blockFlowReasons.s4TosNeeded;
            shouldBlockFlow = Object.keys(blockFlowReasons).length;
        }

        const showPaymentSection = !this.paymentButton
            && !(this.currentGateway.gatewayId === 16)      // ecp
            && !isAstropay
            && !usingBalanceOnVoucher
            && !shouldBlockFlow;

        const showPaymentButton = this.paymentButton && !this.blockFlow();

        $('.specific-payment-info', this.$page).toggleClass('hidden', !showPaymentSection);

        const $stripeButton = $('.stripe-button', this.$page).toggleClass('hidden', !showPaymentButton);
        $('.loader', $stripeButton).toggleClass('hidden', !showPaymentButton);

        $('.iframe-container', $stripeButton).empty();

        const paymentType = this.getPaymentType(this.currentGateway);

        this.proPaymentMethod = this.currentGateway.gatewayName;

        $('.propay-inline-dialog', this.$page).addClass('hidden');

        // check all required fields are filled

        $('.balance:not(.option)', this.$page).addClass('hidden');

        this.updateRightBlock();

        // TODO: Refactor the below options to be more readable and make more sense. Temp fix to reduce risk of breaking
        if (paymentType === 'voucher') {
            voucherDialog.init();
            $('.balance', this.$page).removeClass('hidden');
        }

        if (!showPaymentSection && !showPaymentButton && !isAstropay) {
            return;
        }

        if (paymentType === 'astropay') {
            astroPayDialog.init(this.currentGateway);
        }
        else if (paymentType === 'creditcard') {
            // Reset the stripe payment card details
            this.renderSavedCard();

            $('.specific-payment-info .payment-stripe-dialog', this.$page).removeClass('hidden');

            if (this.useSavedCard
                && this.savedCard
                && (this.savedCard.gw === this.currentGateway.gatewayId)
                && !showPaymentButton) {

                $('.specific-payment-info .payment-stripe-dialog .content', this.$page).addClass('hidden');
                $('.payment-loading-spinner', this.$page).addClass('hidden');

            }
            else {
                $('.specific-payment-info .payment-stripe-dialog .content', this.$page).removeClass('hidden');
                addressDialog.showDialog(true);
                if (this.currentGateway.gatewayId === 19) {
                    addressDialog.validateAndPay(pro.propay.initBillingInfo);
                }
            }
        }
        else if ((paymentType === 'other')
            && (this.currentGateway.gatewayName === 'bitcoin')) {
            this.sendPurchaseToApi(this.currentGateway.gatewayId);
        }
    },

    createDropdownItem(option) {
        'use strict';

        const tickIcon = document.createElement('i');
        tickIcon.className = 'sprite-fm-mono icon-check-thin-outline tick';

        const optionContainer = document.createElement('div');
        optionContainer.className = option.className;

        const textContainer = document.createElement('span');
        textContainer.className = 'text';
        textContainer.textContent = option.text;

        optionContainer.appendChild(textContainer);

        if (option.svg) {
            const svg = document.createElement('i');
            svg.className = `sprite-fm-mono ${option.svg}`;
            optionContainer.prepend(svg);
        }
        else if (option.icon) {
            const icon = document.createElement('div');
            icon.className = `provider-icon ${option.icon}`;
            optionContainer.prepend(icon);
        }

        if (option.tooltip) {
            const tooltip = document.createElement('i');
            tooltip.className = 'pricing-i-icon simpletip';
            tooltip.dataset.simpletip = option.tooltip;
            tooltip.dataset.simpletipposition = 'bottom';
            tooltip.dataset.simpletipoffset = '3';
            tooltip.dataset.simpletipwrapper = '.content';
            tooltip.setAttribute('data-simpletip-class', 'pricing-tip transformed propay');
            optionContainer.appendChild(tooltip);
        }

        optionContainer.appendChild(tickIcon.cloneNode(true));

        return optionContainer;
    },

    /**
     *
     * @param {JQuery} $container - The container to append the dropdown to
     * @param {Object} options - The options for the dropdown
     * @param {String} options.placeholder - The placeholder text for the dropdown
     * @param {Array} options.items - The items to display in the dropdown
     * @param {String} options.items.className - The class name for the item
     * @param {String} options.items.text - The text for the item
     * @param {String | Number} options.items.value - The value for the item
     * @param {String} options.selected - The selected item
     * @returns {void}
     */
    createDropdown($container, options) {
        'use strict';
        $container.empty();

        const optionsWrapper = document.createElement('div');
        optionsWrapper.className = 'mega-input-dropdown dropdown-scroll hidden';
        let $optionsWrapper = $(optionsWrapper);

        const text = options.selected || options.placeholder;

        $container.safeAppend('<span>');
        $container.safeAppend('<i class="sprite-fm-mono icon-dropdown">');

        const $span = $('span', $container);

        $span.text(text);

        for (let i = 0; i < options.items.length; i++) {
            const option = options.items[i];
            const optionContainer = this.createDropdownItem(option);


            $optionsWrapper.safeAppend($(optionContainer).attr('data-value', i).prop('outerHTML'));
        }

        $container.safeAppend($optionsWrapper.prop('outerHTML'));

        let isOpen = false;

        const handleIsOpen = (close) => {
            if (close) {
                isOpen = false;
                $container.removeClass('active');
                $optionsWrapper.addClass('hidden');
            }
            else {
                isOpen = !isOpen;

                if (isOpen) {
                    eventlog(500783);    // Dropdown opened
                }

                $container.toggleClass('active', isOpen);
                $optionsWrapper.toggleClass('hidden', !isOpen);
            }
        };

        $optionsWrapper = $('.mega-input-dropdown', $container);
        $container.rebind('click', () => {
            handleIsOpen();
        });
        $('.option', $optionsWrapper).rebind('click', (e) => {
            $span.text($(e.currentTarget).text());
            if (typeof options.click === 'function') {
                options.click(e);
            }
        });

        $('i.simpletip', $optionsWrapper).rebind('click', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {
            if (!$container.has(e.target).length) {
                $optionsWrapper.addClass('hidden');
                handleIsOpen(true);
            }
        });
    },

    useBalance(gateway) {
        'use strict';
        gateway = gateway || this.currentGateway;
        return (gateway && (gateway.gatewayId === 0))
            && (pro.propay.proBalance >= pro.propay.planObj.priceEuro);
    },

    updateBalanceDropdownOption() {
        'use strict';

        const $dropdown = $('#propay-payment-dropdown-pri');
        const text = `${l[7108]}: ${formatCurrency(pro.propay.proBalance)}`;

        $('.balance.option span', $dropdown).text(text);

        if (this.balanceStringForDropdown
            && this.currentGateway
            && (this.currentGateway.gatewayId === 0)) {
            $('> span', $dropdown).text(text);
        }
    },

    renderGateways() {
        'use strict';

        const $primaryOptionsContainer = $('#propay-payment-dropdown-pri');
        const $secondaryOptionsContainer = $('.payment-options-secondary');
        const $tertiaryOptionsContainer = $('#propay-payment-dropdown-ter');

        const optionArrays = {
            'primary': this.paymentGateways.primary.map(
                gateway => gateway.displayName),
            'secondary': this.paymentGateways.secondary.length && this.paymentGateways.secondary.map(
                gateway => gateway.displayName),
            'tertiary': this.paymentGateways.tertiary.length && this.paymentGateways.tertiary.map(
                gateway => gateway.displayName),
        };

        if (optionArrays.secondary) {
            optionArrays.primary.push(l.more_options_eli);
        }

        const providerEventIds = {
            'stripe': 500784,
            'ecp': 500785,
            'bitcoin': 500786,
            'stripeGP': 500787,
            'stripeAP': 500788,
            'astropayGeneric': 500789,
            'voucher': 500790,
            'unknown': 500791,
        };

        const logProviderClick = (gateway) => {
            let eventId;
            const gatewayName = gateway.gatewayName;
            if (providerEventIds[gatewayName]) {
                eventId = providerEventIds[gatewayName];
            }
            else if (gatewayName.includes('astropay')) {
                eventId = providerEventIds.astropayGeneric;
            }
            else {
                eventId = providerEventIds.unknown;
            }

            eventlog(eventId, gatewayName || JSON.stringify(gateway));
        };

        const handleProviderClick = (e, type) => {

            const $target = $(e.currentTarget);

            if ($target.is('i.tooltip')) {
                return;
            }

            const optionIndex = +$target.attr('data-value');

            const options = optionArrays[type];

            $('.payment-method .selected').removeClass('selected');

            if (type === 'primary') {

                $target.addClass('selected');

                // If 'More options' clicked, show more options and do not change the current gateway
                if (optionArrays.secondary && (optionIndex === options.length - 1)) {
                    $secondaryOptionsContainer.removeClass('hidden');
                    if (optionArrays.tertiary) {
                        $tertiaryOptionsContainer.removeClass('hidden');
                    }
                    this.currentGatewayName = null;
                    this.renderPlanInfo();
                    this.updatePayment();

                    return;
                }
                $('.radio', $secondaryOptionsContainer).removeClass('radioOn').addClass('radioOff');

                $secondaryOptionsContainer.addClass('hidden');
                $tertiaryOptionsContainer.addClass('hidden');
            }


            this.currentGatewayName = options[optionIndex];
            logProviderClick(this.gatewaysByName[this.currentGatewayName]);

            this.updatePayment();
            this.renderPlanInfo();

        };

        const renderSecondaryOptions = () => {
            const $secondaryOptionTemplate = mega.templates.getTemplate('radio-with-icon-label-tmplt');
            const $seeAllBtn = optionArrays.tertiary
                && mega.templates.getTemplate('down-arrow-text-after-tmplt')
                    .addClass('see-all-btn')
                    .removeClass('hidden template');

            $secondaryOptionsContainer.empty();

            for (let i = 0; i < optionArrays.secondary.length; i++) {
                const $secondaryOption = $secondaryOptionTemplate.clone()
                    .removeClass('hidden template')
                    .addClass('option secondary')
                    .attr('data-value', i);

                $('.radio-txt', $secondaryOption).text(optionArrays.secondary[i]);
                const gateway = pro.propay.gatewaysByName[optionArrays.secondary[i]];
                if (gateway) {
                    $('.radio-icon', $secondaryOption)
                        .addClass('provider-icon mr-2 ' + gateway.gatewayName)
                        .removeClass('hidden');
                }

                $secondaryOptionsContainer.safeAppend($secondaryOption.prop('outerHTML'));
            }

            if (optionArrays.tertiary) {

                for (let i = 0; i < optionArrays.tertiary.length; i++) {
                    const $tertiaryOption = $secondaryOptionTemplate.clone()
                        .removeClass('template')
                        .addClass('option tertiary hidden')
                        .attr('data-value', i);

                    $('.radio-txt', $tertiaryOption).text(optionArrays.tertiary[i]);
                    const gateway = pro.propay.gatewaysByName[optionArrays.tertiary[i]];
                    if (gateway) {
                        $('.radio-icon', $tertiaryOption)
                            .addClass('provider-icon mr-2 ' + gateway.gatewayName)
                            .removeClass('hidden');
                    }

                    $secondaryOptionsContainer.safeAppend($tertiaryOption.prop('outerHTML'));
                }

                $('.txt', $seeAllBtn).text('See all');
                $secondaryOptionsContainer.safeAppend($seeAllBtn.prop('outerHTML'));

                let showingAll = false;

                $('.see-all-btn', $secondaryOptionsContainer).rebind('click.propay', () => {
                    showingAll = !showingAll;
                    $('.option.tertiary', $secondaryOptionsContainer).toggleClass('hidden', !showingAll);
                    $('.see-all-btn', $secondaryOptionsContainer).toggleClass('see-less', showingAll);
                    $('.see-all-btn .txt', $secondaryOptionsContainer).text(l[showingAll ? 'see_less' : 'see_all']);
                });

            }

            $('.option', $secondaryOptionsContainer).rebind('click.propay', (e) => {

                const $this = $(e.currentTarget);
                const optionType = $this.is('.option.secondary') ? 'secondary' : 'tertiary';
                const index = +$this.attr('data-value');
                const options = optionArrays[optionType];

                if (options[index] === this.currentGatewayName) {
                    return;
                }

                $('.radio', $secondaryOptionsContainer).removeClass('radioOn').addClass('radioOff');

                $('.radio', $this).removeClass('radioOff').addClass('radioOn');

                handleProviderClick(e, optionType);
            });
        };

        pro.propay.handleProviderClick = handleProviderClick;


        const renderPrimaryDropdown = () => {

            this.usingBalance = false;
            this.balanceStringForDropdown = false;

            pro.propay.createDropdown($primaryOptionsContainer, {

                placeholder: l['1523'],
                items: optionArrays.primary.reduce((acc, item) => {
                    const gateway = this.gatewaysByName[item];

                    let text = item;
                    let tooltip;
                    let svg;
                    let extraClasses = '';

                    if (gateway) {
                        if (gateway.gatewayId === 0) {
                            if (pro.propay.useBalance(gateway)) {
                                extraClasses += ' balance';
                                this.usingBalance = true;
                                this.balanceStringForDropdown = true;
                                text = `${l[7108]}: ${formatCurrency(pro.propay.proBalance)}`;
                                tooltip = l.balance_limited_one_off;
                                svg = 'icon-mega-thin-solid';
                            }
                            else {
                                tooltip = l.voucher_limited_one_off;
                                svg = 'icon-ticket';
                            }
                        }
                        else if (gateway.gatewayName === 'stripe') {
                            svg = 'icon-credit-card';
                        }
                        else if (gateway.gatewayName === 'stripeGP') {
                            svg = ' sprite-fm-uni icon-google';
                        }
                        else if (gateway.gatewayName === 'stripeAP') {
                            svg = ' icon-apple';
                        }
                        else if (gateway.gatewayName === 'stripeID') {
                            svg = ' sprite-fm-uni icon-ideal';
                        }
                    }


                    acc.push({
                        text,
                        svg,
                        tooltip,
                        className: 'option' + extraClasses,
                        value: item,
                        icon: gateway && gateway.gatewayName,
                    });
                    return acc;
                }, []),
            });


            $('.option', $primaryOptionsContainer).rebind('click.propay', (e) => handleProviderClick(e, 'primary'));
        };

        renderPrimaryDropdown();
        if (optionArrays.secondary) {
            renderSecondaryOptions();
        }
    },

    initContinueButton() {
        'use strict';
        const $continueButton = $('.continue', this.$page);
        $continueButton.rebind('click.propay', () => {

            const reasons = this.blockFlow();
            const paymentType = this.getPaymentType(this.currentGateway);
            const gatewayId = this.currentGateway && this.currentGateway.gatewayId;
            pro.propay.paymentType = gatewayId;

            const proceedPayment = () => {
                let showLoading = false;
                if (paymentType === 'creditcard') {
                    showLoading = true;
                }

                // Show different loading animation text depending on the payment methods
                switch (showLoading && this.proPaymentMethod) {
                    case 'stripe':
                        break;
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

                if (gatewayId === 0) {
                    pro.propay.sendPurchaseToApi(gatewayId);
                }
                else if (gatewayId === 19) {
                    if (this.sca) {
                        addressDialog.processUtcResult(this.sca.utcResult, this.sca.saleId);
                    }
                    else if (this.useSavedCard) {
                        addressDialog.validateAndPay(pro.propay.initBillingInfo, false, true);

                    }
                    const iframe = document.getElementById('stripe-widget');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage('submit', '*');
                    }
                }
                else if (gatewayId === 16) {
                    addressDialog.validateAndPay(pro.propay.initBillingInfo, false, true);
                }
                else if (gatewayId === astroPayDialog.gatewayId) {
                    astroPayDialog.submit();
                }
            };

            this.showErrors(reasons);
            if (reasons) {
                return;
            }

            this.userSubsGatewayId =
                M.account.sgwids && M.account.sgwids.length > 0 ? M.account.sgwids[0] : null;

            delay('subscribe.plan', eventlog.bind(null, 99788));

            if (u_type === false) {

                u_storage = init_storage(localStorage);
                loadingDialog.show();

                u_checklogin({
                    checkloginresult() {
                        pro.propay.proceedPayment();

                    }
                }, true);
            }
            else {
                // Store the gateway name for later
                console.assert(pro.propay.proPaymentMethod, 'check this...invalid gateway');

                if (String(pro.propay.proPaymentMethod).indexOf('ecp') === 0
                    || String(pro.propay.proPaymentMethod).toLowerCase().indexOf('stripe') === 0) {

                    if (pro.propay.userSubsGatewayId === 2 || pro.propay.userSubsGatewayId === 3) {
                        // Detect the user has subscribed to a Pro plan with Google Play or Apple store
                        // pop up the warning dialog but let the user proceed with an upgrade
                        msgDialog('warninga', '', l.warning_has_subs_with_3p, '', () => {
                            proceedPayment();
                        });
                    }
                    else {
                        proceedPayment();
                    }
                }
                else {
                    // For other methods we do a uts and utc call to get the provider details first
                    proceedPayment();
                }
            }
        });

        this.setContinuebuttonText();
    },

    setContinuebuttonText() {
        'use strict';
        const recurringEnabled = this.currentGateway && this.currentGateway.supportsRecurring;
        const gatewayId = this.currentGateway && this.currentGateway.gatewayId;
        const $continueButton = $('.continue', this.$page)
            .toggleClass('hidden', !!this.paymentButton || (gatewayId === this.BITCOIN_GATE_ID));

        if (this.errors) {
            this.showErrors();
        }

        if (this.paymentButton) {
            return;
        }

        if (this.shouldShowTrial()) {
            $continueButton.text(l.start_free_trial);
        }
        else if (gatewayId === 16) {
            $continueButton.text(l.continue_to_payment);
        }
        else if (gatewayId === 0) {
            $continueButton.text(l['6190']);
        }
        else if ((!gatewayId && (gatewayId !== 0)) || recurringEnabled) {
            $continueButton.text(l.subscribe_btn);
        }
        else {
            $continueButton.text(l.continue_to_payment);
        }
    },

    fillBillingInfo(info) {
        'use strict';
        const $billingInfoTemplate = mega.templates
            .getTemplate('billing-info-tmplt', false, pro.propay.pageInfo.$templates)
            .removeClass('hidden template');

        if (!info || !info.firstname || !info.lastname || !info.address1 || !info.city || !info.country) {
            $billingInfoTemplate.addClass('empty');
        }
        else {
            $('.name', $billingInfoTemplate).text(info.firstname + ' ' + info.lastname);
            $('.address-1', $billingInfoTemplate).text(info.address1);
            if (info.address2) {
                $('.address-2', $billingInfoTemplate).text(info.address2);
            }
            else {
                $('.address-2', $billingInfoTemplate).addClass('hidden');
            }
            $('.city', $billingInfoTemplate).text(info.city);
            $('.country', $billingInfoTemplate).text(info.country + ', ' + info.postcode);
        }
        $('.billing-address .wrapper', this.$page).empty();
        $('.billing-address .wrapper', this.$page).safeAppend($billingInfoTemplate.prop('outerHTML'));
        $('.billing-address .wrapper .action', this.$page).rebind('click.propay', () => {
            addressDialog.init();
        });
    },


    async initBillingInfo(info) {
        'use strict';


        try {
            info = info || await mega.attr.get(u_attr.u, 'billinginfo', false, true).catch(dump);
        }
        catch (ex) {
            if (ex !== ENOENT) {
                eventlog(500718, String(ex));
                console.error(ex);
            }
        }


        const getBillingProp = (propName, encoded) => {
            if (!info[propName] || !encoded) {
                return info[propName];
            }
            const val = tryCatch(() => from8(info[propName]), () => {
                console.error(`Invalid utf-8 encoded key value ${propName} -> ${info[propName]}`);
            })();

            return val || info[propName];
        };

        let decodedInfo = false;

        if (info) {
            const isEncoded = !!info.version;

            decodedInfo = Object.keys(info).reduce((acc, value) => {
                acc[value] = getBillingProp(value, isEncoded);
                return acc;
            }, Object.create(null));
        }

        pro.propay.fillBillingInfo(decodedInfo);
    },

    renderLocaleInfo(forceEuro) {
        'use strict';

        const isEuro = forceEuro || (this.planObj.currency === 'EUR');

        $('.euro', this.$page).toggleClass('hidden', isEuro);
    },

    clearPage() {
        'use strict';
        this.currentGateway = null;
        this.currentGatewayName = null;
        this.savedCardInitiated = false;
        this.paymentButton = null;

        this.showErrors(true);
        $('.continue', this.$page).removeClass('hidden');
        $('#voucher-code-input input').val('');


        addressDialog.billingInfoFilled = false;
    },

    renderPropayPage() {
        'use strict';

        this.clearPage();
        this.getPageElements();

        addressDialog.init(false, false, false, true);

        this.renderGateways();
        this.renderDurations();
        this.initBillingInfo();
        this.renderPlanInfo();
        this.initContinueButton();
        this.renderLocaleInfo();
        this.updatePageInfo();

        return true;
    },

    async loadPaymentGatewayOptions() {
        'use strict';
        const enableAllPaymentGateways = (localStorage.enableAllPaymentGateways) ? 1 : 0;

        const {result: gatewayOptions} = await api.req({a: 'ufpqfull', t: 0, d: enableAllPaymentGateways, v: 5});

        // TODO: Check if still on propay page

        // If an API error (negative number) exit early
        if ((typeof gatewayOptions === 'number') && (gatewayOptions < 0)) {
            $placeholderText.text('Error while loading, try reloading the page.');
            return false;
        }

        this.trialSupported = false;

        this.browser = String((ua.details || false).browser || '');

        let tempGatewayOptions = gatewayOptions.filter((gate) => {
            const validGate = this.checkGateway(gate);
            if (validGate) {
                this.trialSupported |= validGate.supportsTrial;
                const info = pro.getPaymentGatewayName(validGate.gatewayId, validGate);
                validGate.displayName = info.displayName;
                this.gatewaysByName[validGate.displayName] = validGate;
            }
            return validGate;
        });

        if (is_mobile) {
            tempGatewayOptions = mobile.propay.filterPaymentProviderOptions(tempGatewayOptions);
        }

        const discountInfo = pro.propay.getDiscount();
        const testGateway = localStorage.testGateway;
        if (discountInfo) {
            const discountPriceEuro = discountInfo.edtp;

            tempGatewayOptions = tempGatewayOptions.filter(gate => {
                if (gate.minimumEURAmountSupported > discountPriceEuro) {
                    return false;
                }
                if ((discountInfo.m < 12) && !gate.supportsMonthlyPayment
                    || (!(discountInfo.m % 12) && !gate.supportsAnnualPayment)) {
                    return false;
                }
                if (gate.supportsMultiDiscountCodes && gate.supportsMultiDiscountCodes === 1) {
                    return true;
                }
                return testGateway ;
            });
        }

        // TODO: If discout, filter out gateways that don't support discount

        // TODO: filter out plans that dont support expensive plans

        // TODO: handle mobile

        if (tempGatewayOptions.length === 0) {
            console.error('No valid gateways returned from the API');
            msgDialog('warningb', '', l.no_payment_providers, '', () => {
                loadSubPage('pro');
            });
            return false;
        }

        const primaryOptions = [];
        const remainingOptions = [];

        let astropayCount = 0;

        const sortValues = {
            'stripe': 1,
            'ecp': 1.1,     // Stripe and ecp are mutually exclusive
            'stripeID': 2,
            'stripeAP': 3,
            'stripeGP': 4,
            'astropay': 5,
            'voucher': 8,
            'bitcoin': 9,
        };

        // TODO: Add VALUE for each gateway id
        const primaryGatewayIds = new Set([0, 4, 11, 16, 19]);
        const primaryStripe = new Set(['stripe', 'stripeAP', 'stripeGP', 'stripeID',]);

        for (let i = 0; i < tempGatewayOptions.length; i++) {
            const gateway = tempGatewayOptions[i];
            if (primaryGatewayIds.has(gateway.gatewayId)) {
                if (gateway.gatewayId === 11) {
                    if (astropayCount++ < 3) {
                        primaryOptions.push(gateway);
                    }
                    else {
                        remainingOptions.push(gateway);
                    }
                }
                else if (gateway.gatewayId === 19) {
                    if (primaryStripe.has(gateway.gatewayName)) {
                        primaryOptions.push(gateway);
                    }
                    else {
                        remainingOptions.push(gateway);
                    }
                }
                else {
                    primaryOptions.push(gateway);
                }
            }
            else {
                remainingOptions.push(gateway);
            }
        }

        const getSortVal = (gateway) => {
            return gateway.gatewayId === 11 ? 'astropay' : gateway.gatewayName;
        };

        primaryOptions.sort((a, b) => {
            const sortValA = getSortVal(a);
            const sortValB = getSortVal(b);
            if (!sortValues[sortValA] || !sortValues[sortValB]) {
                if (sortValues[sortValA]) {
                    return -1;
                }
                else if (sortValues[sortValB]) {
                    return 1;
                }
                return 0;
            }
            return sortValues[getSortVal(a)] - sortValues[getSortVal(b)];
        });



        this.paymentGateways.primary = primaryOptions;
        this.paymentGateways.secondary = remainingOptions.splice(0, 5);
        this.paymentGateways.tertiary = remainingOptions;

        return this.paymentGateways;
    },

    handleS4() {
        'use strict';

        const $s4 = $('.s4-wrapper', this.$page);

        this.s4Active = !!window.s4ac;
        this.s4TosAccepted = false;

        const $button = $('button', $s4);
        const $s4Checkbox = $('.s4-tos', this.$page).removeClass('hidden');
        const $checkboxParts = $('.checkbox-item', $s4Checkbox);

        $button.rebind('click', () => {

            this.s4Active = !this.s4Active;

            $('.plan-card-s4', this.pageInfo.$planCard).toggleClass('hidden', !this.s4Active);

            $button.toggleClass('active', this.s4Active);
            $s4Checkbox.toggleClass('hidden', !this.s4Active);
        });

        $('div.tos', $s4Checkbox).rebind('click', () => {
            this.s4TosAccepted = !this.s4TosAccepted;

            $checkboxParts.removeClass('checkboxOn checkboxOff');
            $checkboxParts.addClass(this.s4TosAccepted ? 'checkboxOn' : 'checkboxOff');

            const currentGatewayName = pro.propay.currentGateway && pro.propay.currentGateway.gatewayName;

            if ((currentGatewayName === 'stripeGP') || (currentGatewayName === 'stripeAP')) {
                pro.propay.updatePayment();
            }
            else {
                pro.propay.updatePageInfo();
            }
        });
    },

    updateS4Continue() {
        'use strict';
        $('.continue', this.$page).toggleClass('disabled', !!(window.s4ac && this.blockFlow()));
    },


    init() {
        'use strict';

        const userBusInfo = u_attr && u_attr.b;
        const userIsBusMasterAcc = userBusInfo && u_attr.b.m;
        const userFlexiInfo = u_attr && u_attr.pf;
        const userExpOrGrace = pro.isExpiredOrInGracePeriod((userBusInfo || userFlexiInfo || Object.create(null)).s);

        if (userBusInfo) {
            // If Business sub-user or account is not expired/grace period, don't allow access to propay
            if (!userIsBusMasterAcc || !userExpOrGrace) {
                loadSubPage('start');
                return;
            }
            // If Business master account and expired/grace period, redirect to repay page
            if (userIsBusMasterAcc && userExpOrGrace) {
                loadSubPage('repay');
                return;
            }
        }

        if (userFlexiInfo) {
            // If Pro Flexi account is not expired/grace period, don't allow access to propay
            if (!userExpOrGrace) {
                // Unless they have entered the S4 Object Storage RYI flow, in which case send them to that page.
                if (window.s4ac) {
                    loadSubPage('activate-s4');
                    return;
                }
                loadSubPage('start');
                return;
            }
            // If Pro Flexi account and expired/grace period, redirect to repay page
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

        // Ephemeral accounts (accounts not registered at all but have a few files in the cloud
        // drive) are *not* allowed to reach the Pro Pay page as we can't track their payment (no email address).
        // Accounts that have registered but have not confirmed their email address yet *are* allowed to reach the Pro
        // Pay page e.g. if they registered on the Pro Plan selection page first (this gets more conversions).
        if ((u_type === 0) && (localStorage.awaitingConfirmationAccount === undefined)) {
            loadSubPage('pro');
            return;
        }

        if (!this.setPlanFromUrl()) {
            loadSubPage('pro');
            return;
        }

        this.preloadAnimation();

        let discountInfo = pro.propay.getDiscount();
        if (discountInfo && discountInfo.used) {
            delete mega.discountCode;
            delete mega.discountInfo;
            discountInfo = null;
        }
        this.discountInfo = discountInfo;


        loadingDialog.show('propayReady');
        this.loadingPage = true;

        // If the user is not logged in, show the login / register dialog
        if (u_type === false) {
            loadingDialog.hide('propayReady');
            pro.propay.showAccountRequiredDialog();

            // login / register action while on /propay_x will recall init()
            return;
        }

        if (pro.propay.pageChangeHandler) {
            mBroadcaster.removeListener(pro.propay.pageChangeHandler);
            delete pro.propay.pageChangeHandler;
        }

        pro.propay.pageChangeHandler = mBroadcaster.addListener('pagechange', () => {
            if (!pro.propay.onPropayPage()) {
                pro.propay.hideLoadingOverlay();
                delete window.s4ac;
                mBroadcaster.removeListener(pro.propay.pageChangeHandler);
                delete pro.propay.pageChangeHandler;
            }
        });

        this.loadPlansAndCheckStorage().then((canProceed) => {

            if (!canProceed || !this.onPropayPage()) {
                loadSubPage('pro');
                return false;
            }

            if (discountInfo) {
                mega.discountInfo.used = true;
                pro.propay.discountInfo = discountInfo;
            }

            if (is_mobile) {
                mobile.propay.init();
            }

            const isFlexi = this.planObj.level === pro.ACCOUNT_LEVEL_PRO_FLEXI;

            this.$page = $('#propay')
                .toggleClass('discount', !!discountInfo)
                .toggleClass('euro', this.planObj.currency === 'EUR')
                .toggleClass('flexi', isFlexi)
                .toggleClass('mobile-device', !!is_mobile)
                .toggleClass('ar', mega.ipcc === 'AR')
                .toggleClass('s4', !!(window.s4ac && isFlexi));

            this.trial = this.planObj.trial;

            clickURLs();

            Promise.all([this.loadPaymentGatewayOptions(), this.getSavedCard()]).then(() => {

                if (!pro.propay.onPropayPage()) {
                    return;
                }

                this.pageInfo.initialized = false;

                this.initSwitchers();

                this.renderPropayPage();

                this.updateRightBlock = this.initScrollHandler();
                this.updateRightBlock();

                this.initResizeHandler();

                if (window.s4ac && isFlexi) {
                    this.handleS4();
                }

                // updateOnClicks();

                loadingDialog.hide('propayReady');

                const propayPageVisitEventId = pro.propay.getPropayPageEventId(pro.propay.planNum);
                eventlog(propayPageVisitEventId);
            });
        }).catch((ex) => {
            eventlog(500719, String(ex));
            console.error(ex);
        });

    },

    initResizeHandler() {
        'use strict';

        const breakpoint = 1080;

        let previousWidth = $(window).width();
        let newWidth;

        $(window).rebind('resize.propay-page', () => {
            if (page.slice(0, 7) !== 'propay_') {
                $(window).off('resize.propay-page');
                return;
            }

            this.updateRightBlock();

            if (!this.paymentButton) {
                return;
            }

            newWidth = $(window).width();
            if ((previousWidth < breakpoint) && (newWidth >= breakpoint)
            || (previousWidth >= breakpoint) && (newWidth < breakpoint)) {
                previousWidth = newWidth;
                this.updatePayment();
            }
        });
    },

    initScrollHandler() {
        'use strict';

        const $fmHolder = $('.fmholder', 'body.bottom-pages');

        const topPadding = 14;

        const child = document.querySelector('.plan-card:not(#propay-page-plan-card-tmplt)');

        const updateRightBlock = () => {

            if (!pro.propay.onPropayPage()) {
                $fmHolder.off('scroll.propay-page');
                return;
            }

            const parentHeight = $('#propay > div.right-block').outerHeight();
            const childHeight = child.offsetHeight;

            const distanceScrolled = $fmHolder.scrollTop();

            if ((distanceScrolled + childHeight) < parentHeight - topPadding) {
                child.classList.add('fixed');
                child.classList.remove('relative');
            }
            else {
                child.classList.remove('fixed');
                child.classList.add('relative');
            }
        };

        $fmHolder.rebind('scroll.propay-page', updateRightBlock);

        // updateRightBlock();

        return updateRightBlock;

    },

    getDiscount() {
        'use strict';

        if (mega.discountInfo) {
            if (d && localStorage.discountDuration) {
                mega.discountInfo.m = parseInt(localStorage.discountDuration);
            }
            if (d && localStorage.discount) {
                mega.discountInfo = JSON.parse(localStorage.discount);
            }
        }
        if (mega.discountInfo && mega.discountInfo.pd && mega.discountInfo.al === pro.propay.planNum) {
            return mega.discountInfo;
        }
        return false;
    },

    redeemFreeTrial() {

        'use strict';

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
            if (this.currentGateway.gatewayId !== addressDialog.gatewayId_stripe) {
                console.warn('Payment type changed during loading');
                return;
            }
            pro.propay.trial.trialId = result.id;
            addressDialog.processUtcResult({'EUR': result.url}, true, result.id);
        }).catch((ex) => {
            eventlog(500720, String(ex));
            reportError(ex);
            tell(ex < 0 ? api_strerror(ex) : ex);
        });
    },


    /**
     * Gets the wording for the plan subscription duration in months or years.
     * This is used by a number of the payment provider dialogs.
     * @param {Number} numOfMonths The number of months
     * @returns {String} Returns the number of months e.g. '1 month', '1 year'
     */
    getNumOfMonthsWording(numOfMonths, forceMonths) {
        'use strict';

        if (!forceMonths && numOfMonths === 12) {
            return l[923];     // 1 year
        }

        return mega.icu.format(l[922], numOfMonths); // xx month(s)
    },

    /**
     * Renders the string for recurring plan based on number of months available
     * @param {Number} months The number of months
     * @returns {String}
     */
    getRecurringDurationWording(months) {
        'use strict';

        switch (months) {
            case 12: return l.recurring_yearly;
            case 24: return l.recurring_2_yearly;
            default: return l.recurring_monthly;
        }
    },

    getPlan(returnArr) {
        'use strict';
        return returnArr ? this.planObj.planArray : this.planObj;
    },

    /**
     * Hides the payment processing/transferring/loading overlay
     */
    hideLoadingOverlay() {
        'use strict';
        if (pro.propay.$backgroundOverlay && pro.propay.$loadingOverlay) {
            pro.propay.$backgroundOverlay.addClass('hidden')
                .removeClass('payment-dialog-overlay');
            pro.propay.$loadingOverlay.addClass('hidden');
        }
    },

    createFreeTrialSection(formattedPrice, curr, information) {
        'use strict';
        information = information || Object.create(null);
        if (!formattedPrice || !curr) {
            return false;
        }

        const steps = {
            1: {    // VPN Feature (bits)
                0: l.unlock_secure_browsing,
                5: l.email_before_trial_end,
                7: l.sub_start_day,
            },
            2: {    // PWM Feature (bits)
                0: l.fast_login_secure_passwords,
                10: l.email_before_trial_end,
                14: l.sub_start_day,
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

        const { months: m } = this.planObj;
        const durationText = m === 12 && l.days_free_then_price_y
            || m === 24 && l.days_free_then_price_2y
            || l.days_free_then_price_m;
        const priceText = mega.icu.format(durationText, information.days)
            .replace('%1', formattedPrice + (curr === 'EUR' ? '' : '*'))
            .replace('%2', curr);

        const strings = steps[information.type] || steps['1'];
        const stringKeys = Object.keys(strings);
        strings[stringKeys[stringKeys.length - 1]] = strings[stringKeys[stringKeys.length - 1]]
            .replace('%1', information.startDate);

        for (let i = 0; i < stringKeys.length; i++) {
            $(`.step${i}.content`, $template).text(strings[stringKeys[i]]).removeClass('hidden');
            $(`.step${i}.when`, $template).text(i === 0
                ? l[1301]
                : mega.icu.format(l.on_day_n, stringKeys[i]));
        }

        $('.price', $template).text(priceText);
        const $taxInfo = $('.tax-info', $template);
        if (this.planObj.taxInfo) {
            $taxInfo.text(l.t_may_appy.replace('%1', pro.taxInfo.taxName)).removeClass('hidden');
        }
        else {
            $taxInfo.addClass('hidden');
        }

        return $template;
    },

    /**
     * Preloads the large loading animation so it displays immediately when shown
     */
    preloadAnimation() {
        'use strict';

        pro.propay.$backgroundOverlay = $('.fm-dialog-overlay', 'body');
        pro.propay.$loadingOverlay = is_mobile
            ? $('.payment-processing-mobile', 'body')
            : $('.payment-processing', 'body');

        // Check if using retina display
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';

        // Preload loading animation
        pro.propay.$loadingOverlay.find('.payment-animation')
            .attr('src',staticpath + '/images/mega/payment-animation' + retina + '.gif');
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

    /** This function to show the discount offer dialog if applies */
    showDiscountOffer() {
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
                const timeDif = Date.now() - discountOffers[offer.dc];
                if (timeDif < 72e6) {
                    if (timeDif > 0) {
                        window.offerPopupTimer = setTimeout(pro.propay.showDiscountOffer, 72e6 - timeDif + 10);
                    }
                    return;
                }
            }
            discountOffers = discountOffers || Object.create(null);

            if (offer.al && offer.pd && (offer.m !== undefined)) {
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

                        let discountPopupPref = Date.now();
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
                                discountPopupPref = Date.now();
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
};

// mBroadcaster.once('login2', () => {
//     'use strict';
//     delay('ShowDiscountOffer', pro.propay.showDiscountOffer, 5000);
// });

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
        balance: l.balance_only_one_off,
        discountMonthly: l.only_available_monthly,
        minAmount: l.min_amount_restriction,
        voucher: l.voucher_only_one_off,
        monthlyOnly: l.payment_monthly_only,
        yearlyOnly: l.payment_yearly_only,
        astropayOneOff: l.astropay_one_off,
    };
});
