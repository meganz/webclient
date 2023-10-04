/**
 * Code for the promotional discount offer page which is either
 * a direct link e.g. https://mega.nz/#discountpromoM2iPNEWqiTM-yhsuGkOToh
 * or a short URL e.g. https://mega.nz/s/blackfriday
 * This code is shared for desktop and mobile webclient.
 */
class DiscountPromo {

    /**
     * Initialise the page
     */
    constructor() {

        // Cache the current page selector to speed up queries
        this.pageSelector = document.querySelector('.js-discount-promo-page');

        // Show loading spinner
        loadingDialog.show();

        // Load discount code
        this.getDiscountInfo(page, () => {

            // Load Pro membership plans
            pro.loadMembershipPlans(() => {

                // Get the matched plan
                const matchedPlan = this.getMatchedPlan();

                // Render the plan and discount details
                this.renderDiscountDetails(matchedPlan);
                this.initConfirmButton(matchedPlan);

                // Show the page
                this.pageSelector.classList.remove('hidden');

                // Hide loading spinner
                loadingDialog.hide();
            });
        });
    }

    /**
     * Fetch the discount
     * @param {String} page The page e.g. /discountpromoM2iPNEWqiTM-yhsuGkOToh or short sale URL e.g. /s/blackfriday
     * @param {Function} completeCallback The function to run when complete
     * @returns {Boolean}
     */
    getDiscountInfo(page, completeCallback) {

        // Handle short sale URLs e.g. /s/blackfriday
        if (page.substr(0, 2) === 's/') {

            mega.discountCode = null;
            mega.shortUrl = page.substr(2);
        }
        else {
            // Otherwise handle regular discount codes
            mega.discountCode = page.substr(13);
            mega.shortUrl = null;

            if (mega.discountCode.length < 15) {
                delete mega.discountInfo;
                msgDialog('warninga', l[135], l[24676], false, () => {
                    loadSubPage('pro');
                });
                return false;
            }
        }

        loadingDialog.show();
        delete mega.discountInfo;

        api.req({a: 'dci', dc: mega.discountCode, su: mega.shortUrl, extra: true}).then(({result: res}) => {

            loadingDialog.hide();

            if (res && res.al && res.pd) {
                DiscountPromo.storeDiscountInfo(res);
                completeCallback();
                return true;
            }
            msgDialog('warninga', l[135], l[24674], false, () => {
                loadSubPage('pro');
            });
        }).catch((ex) => {
            loadingDialog.hide();
            let errMsg = l[24674];
            if (ex === pro.proplan.discountErrors.expired) {
                errMsg = l[24675];
            }
            else if (ex === pro.proplan.discountErrors.notFound) {
                errMsg = l[24676];
            }
            else if (ex === pro.proplan.discountErrors.diffUser) {
                errMsg = l[24677];
            }
            else if (ex === pro.proplan.discountErrors.isRedeemed) {
                errMsg = l[24678];
            }
            else if (ex === pro.proplan.discountErrors.tempUnavailable) {
                errMsg = l[24764];
            }
            msgDialog('warninga', l[135], errMsg, false, () => {
                loadSubPage('pro');
            });
        });
        return false;
    }

    static storeDiscountInfo(res) {

        mega.discountInfo = res;
        mega.discountCode = mega.discountCode || res.dc;

        // if user move to page other than discount propay page, clear discount info
        const token = mBroadcaster.addListener('beforepagechange', tpage => {

            if (tpage !== 'propay_' + res.al) {

                delete mega.discountCode;
                delete mega.discountInfo;
                mBroadcaster.removeListener(token);
            }
        });
    }

    /**
     * Get the plan that matches the discount promotion
     * @returns {Array} Returns the plan details
     */
    getMatchedPlan() {

        return pro.membershipPlans.find(plan => {
            return plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === mega.discountInfo.al
                && plan[pro.UTQA_RES_INDEX_MONTHS] === 1;
        });
    }

    /**
     * Render the discount information into the page
     * @param {Array} matchedPlan The details of the plan matching the discount
     */
    renderDiscountDetails(matchedPlan) {

        const discountMonths = mega.discountInfo.m;
        const discountPercentage = mega.discountInfo.pd;
        const proPlanName = pro.getProPlanName(mega.discountInfo.al);

        // Get the local price from the plan if it exists
        const perMonthLocalPrice = matchedPlan[pro.UTQA_RES_INDEX_LOCALPRICE];

        // Get the discounted amount, discounted per month price and discounted total price in Euros
        let currency = 'EUR';
        let totalPriceUndiscounted = mega.discountInfo.etp;     // Euro Total Price (undiscounted)
        let discountedAmount = mega.discountInfo.eda;           // Euro Discount Amount (amount saved)
        let discountedOneTimePrice = mega.discountInfo.edtp;    // Euro Discounted Total Price

        // Get the local discounted per month price and discounted total price
        if (perMonthLocalPrice) {
            currency = matchedPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

            // Get the Local Total Price (undiscounted, one-time price)
            totalPriceUndiscounted = mega.discountInfo.ltp;

            // Get the Local Discounted Amount (amount saved)
            discountedAmount = mega.discountInfo.lda;

            // Get the Local Discounted Total Price
            discountedOneTimePrice = mega.discountInfo.ldtp;
        }

        // Get the current plan's storage, then convert the number to 'x GBs' or 'x TBs'
        const storageGigabytes = matchedPlan[pro.UTQA_RES_INDEX_STORAGE];
        const storageBytes = storageGigabytes * 1024 * 1024 * 1024;
        const storageFormatted = numOfBytes(storageBytes, 0);
        const storageSizeRounded = Math.round(storageFormatted.size);
        const storageValue = `${storageSizeRounded} ${storageFormatted.unit}`;

        // Cache selectors
        const titleTextSelector = this.pageSelector.querySelector('.js-title');
        const descriptionSelector = this.pageSelector.querySelectorAll('.js-description');
        const expiresTextSelector = this.pageSelector.querySelector('.js-expiry-block');
        const currencyDisclaimerSelector = this.pageSelector.querySelectorAll('.js-local-currency-disclaimer');
        const footerTitleSelector = this.pageSelector.querySelector('.js-footer-title');
        const priceTagEnglishLangBlock = this.pageSelector.querySelector('.js-lang-en');
        const priceTagEnglishLangPercentage = this.pageSelector.querySelector('.js-lang-en .js-percentage');
        const priceTagEnglishLangOffWord = this.pageSelector.querySelector('.js-lang-en .js-off-word');
        const priceTagOtherLangBlock = this.pageSelector.querySelector('.js-lang-other');
        const priceTagOtherLangPercentage = this.pageSelector.querySelector('.js-lang-other.js-percentage');

        // Format the prices (no decimal places)
        const totalPriceUndiscountedFmt = formatCurrency(totalPriceUndiscounted, currency, 'narrowSymbol', true);
        const discountedAmountFmt = formatCurrency(discountedAmount, currency, 'narrowSymbol', true);
        const discountedOneTimePriceFmt = formatCurrency(discountedOneTimePrice, currency, 'narrowSymbol', true);

        // Update title text
        let titleText = titleTextSelector.textContent;
        titleText = titleText.replace('%1', discountedAmountFmt);
        titleText = titleText.replace('%2', proPlanName);
        titleTextSelector.textContent = titleText;

        // Calculate whether to use month or year text for the promotion e.g. 2 year Pro plan, or 18 month Pro plan.
        const useYearString = discountMonths % 12 === 0;
        let descriptionText = useYearString ?
            l.promotion_discount_description_year : l.promotion_discount_description_month;
        const monthsOrYears = useYearString ? discountMonths / 12 : discountMonths;

        // Update description text (at page bottom as well)
        descriptionText = mega.icu.format(descriptionText, monthsOrYears);
        descriptionText = descriptionText.replace('%1', proPlanName);
        descriptionText = descriptionText.replace('%2', storageValue);
        descriptionText = descriptionText.replace('%3', discountedOneTimePriceFmt);
        descriptionText = descriptionText.replace('%4', totalPriceUndiscountedFmt);
        descriptionText = descriptionText.replace('%5', discountPercentage);
        descriptionSelector.forEach(el => {
            el.textContent = descriptionText;
        });

        // Update x% off label for English (forced onto two distinct lines)
        if (lang === 'en') {
            priceTagEnglishLangBlock.classList.remove('hidden');
            priceTagEnglishLangPercentage.textContent = `${discountPercentage}%`;
            priceTagEnglishLangOffWord.textContent = l[24670].replace('$1', '');
        }
        else {
            // Show other language text i.e. x % off (with distinct space between number and symbol)
            priceTagOtherLangBlock.classList.remove('hidden');
            priceTagOtherLangPercentage.textContent = l[24670].replace('$1', `${discountPercentage} %`);
        }

        // Update slightly different footer title text
        // 2-month/year MEGA special for only EUR59
        let footerTitleText = useYearString ?
            l.promotion_discount_footer_title_year : l.promotion_discount_footer_title_month;
        footerTitleText = mega.icu.format(footerTitleText, monthsOrYears);
        footerTitleText = footerTitleText.replace('%1', discountedOneTimePriceFmt);
        footerTitleSelector.textContent = footerTitleText;

        // If local prices are available, show the disclaimer text
        if (perMonthLocalPrice) {
            currencyDisclaimerSelector.forEach(el => el.classList.remove('hidden'));
        }

        // Update expires text if applicable
        if (mega.discountInfo.ex) {

            // Show the expires text block
            expiresTextSelector.classList.remove('hidden');

            // Set an interval to update the countdown text
            this.initExpiryCountdownTimer();
        }
    }

    /**
     * Initialise the countdown timer until the discount offer expires
     */
    initExpiryCountdownTimer() {

        // Cache selector
        const expiresTextTimeSelector = this.pageSelector.querySelector('.js-expiry-time');

        // Set the countdown date
        const expiryTimetamp = mega.discountInfo.ex;
        const countdownDateTime = new Date(expiryTimetamp * 1000);

        // Update the countdown every second
        this.countdownIntervalId = setInterval(() => {

            // If we have moved away from the discount promo page, stop the timer
            if (!(location.href.includes('/s/') || location.href.includes('discountpromo'))) {
                clearInterval(this.countdownIntervalId);
            }

            // Find the difference between the current date/time and the countdown date/time
            const currentDateTime = Date.now();
            const timeDifference = countdownDateTime - currentDateTime;

            // Calculate the different time values
            let days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            let hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let mins = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            let secs = Math.floor((timeDifference % (1000 * 60)) / 1000);

            // Left pad with 0s
            days = String(days).padStart(2, '0');
            hours = String(hours).padStart(2, '0');
            mins = String(mins).padStart(2, '0');
            secs = String(secs).padStart(2, '0');

            // Display the text
            expiresTextTimeSelector.textContent = `${days} : ${hours} : ${mins} : ${secs}`;

            // When the countdown is complete, clear the interval and show expired text
            if (timeDifference <= 0) {
                clearInterval(this.countdownIntervalId);
                expiresTextTimeSelector.textContent = '00 : 00 : 00 : 00';
            }
        }, 1000);
    }

    /**
     * Make the button take them to the Pro Payment page
     * @param {Array} matchedPlan The details of the plan matching the discount
     */
    initConfirmButton(matchedPlan) {

        const grabDealButtons = this.pageSelector.querySelectorAll('.js-grab-deal-button');

        // Add click handler for both buttons
        grabDealButtons.forEach(el => el.addEventListener('click', () => {

            const accountLevel = matchedPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            const proPayPage = `propay_${accountLevel}`;

            // If not logged in, show the login/register prompt, or if they're ephemeral
            // but awaiting email confirmation, still let them continue to choose a plan and pay
            if (!u_handle || (isEphemeral() && !localStorage.awaitingConfirmationAccount)) {

                // Set the login text "Please log into your account to claim the discount offer"
                login_txt = l[24673];
                login_next = proPayPage;

                // If mobile, set the plan number so when they've completed Registration/Login they can proceed to pay.
                if (is_mobile) {
                    login_next = page;
                    mobile.proSignupPrompt.init();
                    return;
                }

                // Set the plan number to sessionStorage so it will continue to the Pro Payment page after initial
                // registration (without email confirmation). NB: using a different sessionStorage value here because
                // the desktop web flow hides some text block on the register dialog.
                sessionStorage.setItem('discountPromoContinuePlanNum', accountLevel);
                showSignupPromptDialog();
                return false;
            }

            // Otherwise immediately load the Pro page step 2 where they can make payment
            loadSubPage(proPayPage);
        }));
    }
}
