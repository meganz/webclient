const businessProductPage = {

    /** Business plan data */
    businessPlanData: null,

    /** Google Business plans data */
    googlePlansData: null,

    init: function() {

        "use strict";

        const $page = $('.scroll-block.business-page', '.fmholder');
        const $quotesSection = $('.business-q-wrap', $page);
        const $scrollBlock = $('.business-quotes',  $quotesSection);
        const $slides =  $('.business-quote', $scrollBlock);
        const $businessButton = $('.business-button', $page);

        // Init quotes slider events for mobile
        bottompage.initSliderEvents($quotesSection, $scrollBlock, $slides, true);

        // Set business plan data
        this.setBusinessPlanData();

        // Init Support form
        this.initBusinessSupport();

        if (u_attr && u_attr.b) {

            // Set "Cloud drive" button label
            $businessButton.text(l[164]).attr('href', '/fm');
        }
        else {

            // Set "Create a Business account" button label
            $businessButton.text(l[24516]).attr('href', '/registerb');
        }
    },

    /**
     * Set business plan data (users/storage/stransfer/price)
     * @returns {void}
     */
    setBusinessPlanData: function() {

        'use strict';

        M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
            const business = new BusinessAccount();

            business.getBusinessPlanInfo(false).done(function planInfoReceived(st, info) {

                businessProductPage.businessPlanData = info;

                // If all new API values exist
                businessProductPage.businessPlanData.isValidBillingData = info.bd
                    && info.bd.us && info.bd.us.p
                    && info.bd.sto && info.bd.sto.p
                    && info.bd.sto.s && info.bd.trns && info.bd.trns.p
                    && info.bd.trns.t && info.bd.ba.s && info.bd.ba.t;

                // If local currency values exist
                businessProductPage.businessPlanData.isLocalInfoValid = info.l
                    && info.l.lcs && info.l.lc
                    && info.bd.us.lp && info.bd.sto.lp && info.bd.trns.lp;

                if (d) {
                    console.log(businessProductPage.businessPlanData);
                }

                // Populate business pan data, init events
                businessProductPage.populateBusinessPlanData();

                // Set google plans data, init compare events
                if (businessProductPage.businessPlanData.isValidBillingData) {
                    businessProductPage.initPlanComparison();
                }
            });
        });
    },

    /**
     * Set google plans data (storage/price), init compare events
     * @returns {void}
     */
    initPlanComparison: function() {

        'use strict';

        if (this.googlePlansData) {

            // Init business plan compare sliders
            this.initCompareSliders();
        }
        else {

            // Get Price Comparison Data
            api_req({ a: 'pcd' }, {
                callback: function(res) {
                    if (typeof res === 'object' && Array.isArray(res.g)
                        && res.g.every(e => e.p && e.st)) {

                        businessProductPage.googlePlansData = res;

                        businessProductPage.googlePlansData.isLocalInfoValid = res.l
                            && res.l.s && res.l.n
                            && Array.isArray(res.g_l) && res.g_l.every(e => e.p && e.st);

                        // Init business plan compare sliders
                        businessProductPage.initCompareSliders();
                    }
                    else {
                        console.error(`Bad response: pcd -> ${res}`);
                    }
                }
            });
        }
    },

    /**
     * Populate Business plan card data
     * @returns {void}
     */
    populateBusinessPlanData: function() {

        'use strict';

        const $page = $('.scroll-block.business-page', '.fmholder');

        // If new API values exist, populate new business card values
        if (this.businessPlanData.isValidBillingData) {

            let currency = '';
            let userPrice = 0;
            let minPrice = 0;
            let storagePrice = 0;
            let transferPrice = 0;
            let asterisk = '';
            const minUsers = this.businessPlanData.bd.minu;
            const $businessCard = $('.js-business-card', $page);

            if (this.businessPlanData.isLocalInfoValid) {

                currency = this.businessPlanData.l.lc;
                asterisk = '*';
                userPrice = this.businessPlanData.bd.us.lp;
                minPrice = minUsers * userPrice;
                storagePrice = this.businessPlanData.bd.sto.lp;
                transferPrice = this.businessPlanData.bd.trns.lp;
                $businessCard.addClass('local-currency');
                $('.euro-price', $businessCard).text(formatCurrency(this.businessPlanData.bd.us.p * minUsers));
            }
            else {

                currency = this.businessPlanData.l.c;
                userPrice = this.businessPlanData.bd.us.p;
                minPrice = minUsers * userPrice;
                storagePrice = this.businessPlanData.bd.sto.p;
                transferPrice = this.businessPlanData.bd.trns.p;
                $businessCard.removeClass('local-currency');
                $('.euro-price', $businessCard).text('');
            }



            $('.js-min-price span', $businessCard).addClass('big').text(
                formatCurrency(minPrice, currency) + asterisk
            );
            $('.js-min-users span', $businessCard).text(minUsers);
            $('.js-min-storage span', $businessCard).text(
                `${bytesToSize(this.businessPlanData.bd.ba.s * 1024 * 1024 * 1024, 0)}`
            );
            $('.js-min-transfer span', $businessCard).text(
                `${bytesToSize(this.businessPlanData.bd.ba.t * 1024 * 1024 * 1024, 0)}`
            );
            $('.js-price-per-user strong', $businessCard).text(formatCurrency(userPrice, currency));
            $('.js-price-per-storage strong', $businessCard).text(formatCurrency(storagePrice, currency));
            $('.js-price-per-transfer strong', $businessCard).text(formatCurrency(transferPrice, currency));

            // Show new Business plan content if new API is valid
            $('.business-el-new', $page).removeClass('hidden');
            $('.business-el-old', $page).addClass('hidden');
            // if (this.formHidden) {
                $('.business-el-new.support-form-container', $page).addClass('hidden');
            // }
        }

        // Show old Business plan content, if new API is incorrect.
        // TODO: remove when new API is stable
        else {

            const storageAmount = this.businessPlanData.bd
                && this.businessPlanData.bd.ba && this.businessPlanData.bd.ba.s ?
                this.businessPlanData.bd.ba.s / 1024 : 15;
            const $businessCard = $('.js-business-card-old', $page);

            $('.business-price .big', $businessCard).text(formatCurrency(this.businessPlanData.bd.us.p));
            $('.business-storage-info', $businessCard)
                .text(l[23789].replace('%1', `${storageAmount} ${l[20160]} *`));
            $('.business-price-note', $businessCard)
                .safeHTML(l[23169].replace('**', '<span>*</span>'));

            $('.business-el-new', $page).addClass('hidden');
            $('.business-el-old', $page).removeClass('hidden');
        }
    },

    /**
     * Init business plan compare sliders
     * @returns {void}
     */
    initCompareSliders: function() {

        'use strict';

        const $page = $('.scroll-block.business-page', '.fmholder');
        const $calculator = $('.business-compare', $page);
        const $usersSlider = $('.business-slider.users', $calculator);
        const $storageSlider = $('.business-slider.storage', $calculator);
        const $megaChart = $('.chart.mega', $calculator);
        const $googleChart = $('.chart.google', $calculator);
        const $megaTotal = $('.simpletip-tooltip > span', $megaChart);
        const $googleTotal = $('.simpletip-tooltip > span', $googleChart);
        const minStorageValue = this.businessPlanData.bd.ba.s / 1024;
        let megaUserPrice = 0;
        let megaStoragePrice = 0;
        let maxPrice = 0;
        let currency = '';

        if (this.businessPlanData.isLocalInfoValid && this.googlePlansData.isLocalInfoValid) {

            currency = this.businessPlanData.l.lc || this.googlePlansData.l.n;
            megaUserPrice = this.businessPlanData.bd.us.lp;
            megaStoragePrice = this.businessPlanData.bd.sto.lp;
            $('.business-compare-charts', $calculator).attr('title', l[18770]);
        }
        else {

            currency = this.businessPlanData.l.c;
            megaUserPrice = this.businessPlanData.bd.us.p;
            megaStoragePrice = this.businessPlanData.bd.sto.p;
            $('.business-compare-charts', $calculator).removeAttr('title');
        }

        /**
         * Calculate MEGA Business plan price
         * @param {Number} usersValue Optional. Script will take calculator value if undefined
         * @param {Number} storageValue Optional. Script will take calculator value if undefined
         * @returns {Number} Calculated price value
         */
        const calculateMegaPrice = (usersValue, storageValue) => {

            let totalPrice = 0;

            usersValue = usersValue || $usersSlider.attr('data-value');
            storageValue = storageValue || $storageSlider.attr('data-value');

            totalPrice = megaUserPrice * usersValue
                + megaStoragePrice * (storageValue - minStorageValue);

            return totalPrice.toFixed(2);
        };

        /**
         * Calculate Google Business plan price
         * @param {Number} usersValue Optional. Script will take calculator value if undefined
         * @param {Number} storageValue Optional. Script will take calculator value if undefined
         * @returns {Number} Calculated price value
         */
        const calculateGooglePrice = (usersValue, storageValue) => {

            let usersPrice = 0;
            let storagePrice = 0;
            let planPrice = 0; // Standart plan price per user, EUR
            let plusPrice = 0; // Plus plan price per user, EUR
            let storagePerPlan = this.googlePlansData.g[1].st; // Standart plan storage, Tb
            const storagePerPlus = this.googlePlansData.g[2].st; // Plus plan storage, Tb
            const $planTip = $('.business-google-plan-tip', $calculator);

            if (this.businessPlanData.isLocalInfoValid && this.googlePlansData.isLocalInfoValid) {
                planPrice = this.googlePlansData.g_l[1].p;
                plusPrice = this.googlePlansData.g_l[2].p;
            }
            else {
                planPrice = this.googlePlansData.g[1].p;
                plusPrice = this.googlePlansData.g[2].p;
            }

            usersValue = usersValue || $usersSlider.attr('data-value');
            storageValue = storageValue || $storageSlider.attr('data-value');

            // Change price and storage to Plus plan
            if (storageValue >= 600) {
                planPrice = plusPrice;
                storagePerPlan = storagePerPlus;
                $planTip.text(l.google_plus_plan_tip);
            }
            else {
                $planTip.text(l.google_standart_plan_tip);
            }

            usersPrice = usersValue * planPrice;
            storagePrice = storageValue / storagePerPlan * planPrice;

            return Math.max(usersPrice, storagePrice).toFixed(2);
        };

        /**
         * Set chart height
         * @param {Number} mPrice MEGA Price value
         * @param {Number} gPrice Google Price value
         * @param {Boolean} isNsGooglePlan If TRUE, then google chart height is almost similar to MEGA
         * @returns {void}
         */
        const setChartHeight = (mPrice, gPrice, isNsGooglePlan) => {

            const mPriceHeight = mPrice / gPrice * 100 + mPrice / maxPrice * 100;
            const gPriceHeight = isNsGooglePlan ? mPriceHeight + 15 : 100 + gPrice / maxPrice * 100;

            $megaChart.outerHeight(`${mPriceHeight}%`);
            $googleChart.outerHeight(`${gPriceHeight}%`);
        };

        /**
         * Set caclulated prices
         * @returns {void}
         */
        const setCalculatedPrices = () => {

            let megaPrice = 0;
            let googlePrice = 0;
            const isNsGooglePlan = $storageSlider.attr('data-value') > 1500;

            // Calculate the price and set in total
            megaPrice = calculateMegaPrice();
            googlePrice = calculateGooglePrice();

            $('span', $megaTotal).text(formatCurrency(megaPrice, currency));

            if (isNsGooglePlan) {
                $googleChart.addClass('not-supported');
            }
            else {

                $('span', $googleTotal).text(formatCurrency(googlePrice, currency));
                $googleChart.removeClass('not-supported');
            }

            // Set chart heights
            setChartHeight(megaPrice, googlePrice, isNsGooglePlan);
        };

        /**
         * Set Users slider handle value and calculated price
         * @param {Object} $handle jQ selecter on slider handle
         * @param {Number} value Selected slider value
         * @returns {void}
         */
        const setUsersSliderValue = ($handle, value) => {

            // Set the value in custom created span in the handle
            $('span', $handle).text(value);
            $handle.attr('data-value', value);

            // Calculate the price and set in total
            setCalculatedPrices();
        };

        /**
         * Set Storage slider value and calculated price
         * @param {Object} $handle jQ selecter on slider handle
         * @param {Number} value Selected slider value
         * @returns {void}
         */
        const setStorageSliderValue = ($handle, value) => {

            let result = 0;

            // Small trick which changes slider step if storage value > 1TB
            if (value <= 100) {
                $('span', $handle).text(`${value} ${l[20160]}`);
                result = value;
            }
            else if (value < 150) {
                result = Math.floor((value - 100) / 5) || 1;
                result *= 100;
                $('span', $handle).text(`${result} ${l[20160]}`);
            }
            else if (value === 150) {
                $('span', $handle).text(`1 ${l[23061]}`);
                result = 1000;
            }
            else if (value <= 200) {
                result = Math.floor((value - 150) / 5) || 1;
                $('span', $handle).text(`${result} ${l[23061]}`);
                result *= 1000;
            }

            // Set data attribute for futher calculations
            $handle.attr('data-value', result);

            // Calculate the price and set in total
            setCalculatedPrices();
        };

        // Show compare section
        $calculator.removeClass('hidden');

        // Calculate max price to use it for correct nice heights
        maxPrice = Math.max(calculateMegaPrice(300, 10000), calculateGooglePrice(300, 10000));

        // Init Users slider
        $usersSlider.slider({

            min: this.businessPlanData.bd.minu,
            max: 300,
            range: 'min',
            step: 1,
            change: function(event, ui) {
                setUsersSliderValue($(this), ui.value);
            },
            slide: function(event, ui) {
                setUsersSliderValue($(this), ui.value);
            }
        });

        // Init Storage slider
        $storageSlider.slider({

            min: minStorageValue,
            max: 200,
            range: 'min',
            step: 1,
            change: function(event, ui) {
                setStorageSliderValue($(this), ui.value);
            },
            slide: function(event, ui) {
                setStorageSliderValue($(this), ui.value);
            }
        });

        // Set default values for each slider
        $usersSlider.slider({
            'value': this.businessPlanData.bd.minu
        });
        $storageSlider.slider({
            'value': minStorageValue
        });
    },

    /**
     * Init business support
     * @returns {void}
     */
    initBusinessSupport: function() {

        'use strict';

        return;

        const formTime = localStorage.formTime;
        const $page = $('.scroll-block.business-page', '.fmholder');
        const $formContainer = $('.business-el-new.support-form-container', $page);

        if (Date.now() - (formTime || 0) < 6e5) {
            $formContainer.addClass('hidden');
            this.formHidden = true;
            return;
        }
        else {
            $formContainer.removeClass('hidden');
            this.formHidden = false;
        }

        const $supportBlock = $('.business-support', $page);
        const $inputs = $('input', $supportBlock);
        const $firstName = $inputs.filter('#bp-f-name');
        const $lastName = $inputs.filter('#bp-l-name');
        const $email = $inputs.filter('#bp-email');
        const $job = $inputs.filter('#bp-job');
        const $company = $inputs.filter('#bp-company');
        const $employees = $inputs.filter('#bp-employees');
        const $storageSelect = is_mobile ? $('.default-select.bp-storage-select', $supportBlock) :
            $('.mega-input.bp-storage-select', $supportBlock);
        const $messageWrapper = $('.mega-input.textarea', $supportBlock);
        const $message = $('textarea', $messageWrapper);
        let megaInputs;

        /**
         * Show input error
         * @param {Object} $el jQ selector of input/textarea/select
         * @param {String} message Error message text
         * @returns {void}
         */
        const showError = ($el, message) => {

            const $elWrapper = $el.closest('.js-bp-input-wrap');

            $el.trigger('focus');
            $('.mega-input, .default-input, select', $elWrapper).addClass('error');

            if ($('.error-message', $elWrapper).length === 0 && !$elWrapper.is('.disabledError')) {

                mCreateElement(
                    'div', {'class': 'error-message'}, $elWrapper[0]
                ).textContent = message;
            }
        };

        /**
         * Hide input error
         * @param {Object} $el jQ selector of input/textarea/select
         * @returns {void}
         */
        const hideError = ($el) => {

            const $elWrapper = $el.closest('.js-bp-input-wrap');
            const $error = $('.error-message', $elWrapper);

            $('.mega-input, .default-input, select', $elWrapper).removeClass('error');

            if ($error.length > 0) {
                $error.remove();
            }
        };

        /**
         * Clear filled inputs and set default select value
         * @param {Object} $el jQ selector of input/textarea/select
         * @param {String} messge Error message text
         * @returns {void}
         */
        const setDefaultValues = () => {

            $inputs.val('');
            $message.val('');

            if (is_mobile) {
                $storageSelect.val('default').change();
            }
            else {
                $('.option', $storageSelect).removeAttr('data-state');
                $('> span', $storageSelect).text('');
            }
            $storageSelect.removeClass('error');

            hideError($message.add($inputs).add($storageSelect));
        };

        /**
         * Collect and alidate inputs data
         * @returns {Object} collectedData Should contain 'm' with message and 'e' with email
         */
        const collectInputsData = () => {

            let isValid = true;
            const data = {m: '', e: ''};
            const firstName = $firstName.val().trim();
            const lastName = $lastName.val().trim();
            const email = $email.val().trim();
            const job = $job.val().trim();
            const company = $company.val().trim();
            const employees = $employees.val().trim();
            const storage = is_mobile ? $storageSelect.val() :
                $('.option[data-state="active"]', $storageSelect).attr('data-value');
            const message = $message.val().trim();

            if (firstName) {
                hideError($firstName);
                data.m += `${firstName} `;
            }
            else {
                showError($firstName, l.enter_f_name);
                isValid = false;
            }

            if (lastName) {
                hideError($lastName);
                data.m += `${lastName}.\n`;
            }
            else {
                showError($lastName, 'Please enter your last name.');
                isValid = false;
            }

            if (email && isValidEmail(email)) {
                hideError($email);
                data.e = `${email}`;
                if (u_attr && u_attr.email) {
                    data.m += `MEGA user: ${u_attr.email}.\n`;
                }
            }
            else {
                showError($email, l[141]);
                isValid = false;
            }

            if (job) {
                hideError($job);
                data.m += `${job}.\n`;
            }
            else {
                showError($job, l.enter_job_title);
                isValid = false;
            }

            if (company) {
                hideError($company);
                data.m += `${company}.\n`;
            }
            else {
                showError($company, l.enter_company_name);
                isValid = false;
            }

            if (employees) {
                hideError($employees);
                data.m += `${employees}.\n`;
            }
            else {
                showError($employees, l.enter_valid_number);
                isValid = false;
            }

            if (storage && storage !== 'default') {
                hideError($storageSelect);
                data.m += `${storage}.\n`;
            }
            else {
                showError($storageSelect, l[10633]);
                isValid = false;
            }

            if (message) {
                hideError($messageWrapper);
                data.m += `${message}`;
            }
            else {
                showError($messageWrapper, l.describe_needs);
                isValid = false;
            }

            return isValid ? data : false;
        };

        /**
         * Submit form
         * @param {Object} collectedData Should contain 'm' with message and 'e' with email
         * @returns {void}
         */
        const submitForm = (collectedData) => {

            // If collected data exists
            if (collectedData && collectedData.m && collectedData.e) {

                var opts = {
                    a: 'sseb', // send business support email
                    m: collectedData.m, // message
                    e: collectedData.e, // email
                    t: 0 // type
                };

                api_req(opts, {
                    callback: function(res) {
                        if (res === 0) {
                            return msgDialog(
                                'info',
                                l[7882], // Message sent
                                l[7882],
                                l[7881], // Thank you! One of our support consultants...,
                                () => {

                                    // Reset filled data
                                    setDefaultValues();
                                }
                            );
                        }

                        msgDialog(
                            'error',
                            l[16], // Internal error
                            l[16],
                            l[7883], // There was an error trying to send your message. Please try to resend it.
                            () => {

                                console.error(`There was an error trying to send Business support form. ${res}`);
                            }
                        );

                    }
                });
                localStorage.formTime = Date.now();
            }
        };

        // Init special events for desktop
        if (!is_mobile) {

            // Init megaInputs
            megaInputs = new mega.ui.MegaInputs($('input', $supportBlock));

            // Init dropdown events
            bindDropdownEvents($storageSelect);

            // Init textarea scroll
            initTextareaScrolling($message, 116);
        }

        // Clear filled values
        setDefaultValues();

        // Remove errors on option click
        $storageSelect.rebind('click.removeError', () => {

            hideError($storageSelect);
        });

        // Remove errors if user starts typing
        $message.add($inputs).rebind('keyup.removeError', (e) => {

            if (e.keyCode !== 13) {
                hideError($(e.target));
            }
        });

        // Submit button event
        $('.b-submit', $supportBlock).rebind('click.submitBusinessForm', () => {

            submitForm(collectInputsData());
        });
    }
};
