lazy(pro, 'proplan2', () => {
    'use strict';

    let $page;
    let $planCards;
    let $businessPlans;
    let $usersBusinessSlider;
    let $usersBusinessInput;
    let $strgBusinessSlider;
    let $strgBusinessInput;
    let $trsBusinessSlider;
    let $trsBusinessInput;
    let $totalPriceVal;
    let $totalPriceCurr;
    let $proflexiBlock;
    let $compareBox;
    let $totalFlexPriceVal;
    let $totalFlexPriceCurr;

    let ProFlexiFound = false;

    const initTabHandlers = () => {

        const $tableContainer = $('.pricing-pg.pricing-plans-compare-table-container', $page);
        const $tabs = $('.individual-team-tab-container .tabs-module-block', $page);

        const proDivsSelector = '.pricing-pg.pick-period-container, .pricing-pg.pro-plans-cards-container, ' +
            '.pricing-pg.pricing-estimation-note-container';
        const proDivsFree = '.pricing-pg.pricing-banner-container';
        const $proPlans = $(proDivsSelector, $page);
        const $freeBanner = $(proDivsFree, $page);

        const $footerBanner = $('.pricing-pg.pricing-get-started-container', $page);
        const $footerTitle = $('.pricing-get-started-txt', $footerBanner);
        const $footerSubTitle = $('.pricing-get-started-subtxt', $footerBanner);
        const $footerBtn = $('#tryMega', $footerBanner);

        const setFooterBannerTxt = (title, subTitle, btnTxt) => {
            $footerTitle.text(title);
            $footerSubTitle.toggleClass('hidden', subTitle.length < 1).text(subTitle);
            $footerBtn.text(btnTxt);
        };


        const changeIndividualTeamTab = (target) => {
            $tabs.removeClass('selected');
            target.classList.add('selected');

            const visibilityState = target.id === 'pr-individual-tab';

            if ($businessPlans) {
                $businessPlans.toggleClass('hidden', visibilityState);
            }
            $proPlans.toggleClass('hidden', !visibilityState);

            $freeBanner.toggleClass(
                'hidden',
                !visibilityState || (typeof u_handle !== 'undefined' && !localStorage.keycomplete)
            );

            if (visibilityState) {
                setFooterBannerTxt(l.pr_get_started_now, '', l.pr_try_mega);
            }
            else {
                setFooterBannerTxt(l.pr_business_started, l.pr_easily_add, l[24549]);
            }
        };

        $tabs.rebind('click.pricing', function() {
            if (this.id === 'pr-individual-tab') {
                delay('pricing.plan', eventlog.bind(null, is_mobile ? 99863 : 99862));
            }
            else {
                delay('pricing.business', eventlog.bind(null, is_mobile ? 99865 : 99864));
            }
            changeIndividualTeamTab(this);
        });

        const idShift = is_mobile ? 0 : 1;

        $('button.free', $tableContainer).rebind('click', () => {
            loadSubPage('register');
            delay('pricing.free' + 99880, eventlog.bind(null, 99880 + idShift));
        });
        $('button.pro', $tableContainer).rebind('click', () => {
            changeIndividualTeamTab($('.individual-team-tab-container #pr-individual-tab', $page)[0]);
            $('.pricing-pg.pro-plans-cards-container', $page)[0].scrollIntoView({behavior: 'smooth'});
            delay('pricing.pro' + 99882, eventlog.bind(null, 99882 + idShift));
        });
        $('button.pro-flexi', $tableContainer).rebind('click', () => {
            $('.pricing-pg.pricing-flexi-container', $page)[0].scrollIntoView({behavior: 'smooth'});
            delay('pricing.pro-flexi' + 99884, eventlog.bind(null, 99884 + idShift));
        });
        $('button.pro-business', $tableContainer).rebind('click', () => {
            changeIndividualTeamTab($('.individual-team-tab-container #pr-business-tab', $page)[0]);
            $('.pricing-pg.pricing-business-plan-container', $page)[0].scrollIntoView({behavior: 'smooth'});
            delay('pricing.pro-business' + 99886, eventlog.bind(null, is_mobile ? 99886 : 99904));
        });
    };

    const initPlansTabs = () => {
        const $tableContainer = $('.pricing-pg.pricing-plans-compare-table-container', $page);
        const $showBtn = $('.pricing-plans-compare-table-show', $tableContainer);
        const $dataTable = $('.pricing-plans-compare-table', $tableContainer);
        const $arrowIcon = $('i.chevron-down-icon', $showBtn);
        const $showBtnTxt = $('.pricing-plans-compare-table-txt', $showBtn);
        const $buttons = $('.pricing-plans-compare-table-item button', $tableContainer);
        const $buttonsNotFree = $('.pricing-plans-compare-table-item button:not(.free)', $tableContainer);

        $('.pricing-plans-compare-table-item button', $tableContainer).addClass('hidden');

        // If user is logged in and has the flag ab_flag, add them to the experiment.
        if (u_attr) {
        }

        if (u_attr && !is_mobile) {
            $buttonsNotFree.removeClass('hidden');
        }
        else if (!is_mobile) {
            $buttons.removeClass('hidden');
        }

        $showBtn.rebind('click.pricing', () => {
            eventlog(is_mobile ? 99888 : 99887);
            $dataTable.toggleClass('hidden');
            $arrowIcon.toggleClass('inv');

            let btnTxt = l.pr_show_plan;
            if ($arrowIcon.hasClass('inv')) {
                btnTxt = l.pr_hide_plan;
            }

            $showBtnTxt.text(btnTxt);

            return false;
        });
        $('.no-ads', $tableContainer).toggleClass('hidden', !(mega.flags.ab_adse === 1));

        // set 20GB text for the storage value in the comparison table.
        $('#table-strg-v', $tableContainer).text(bytesToSize(20 * 1073741824, 0));
    };

    const moveToBuyStep = (planId) => {
        pro.proplan2.selectedPlan = planId;

        if (!u_handle) {
            showSignupPromptDialog();
            return false;
        }
        // If they're ephemeral but awaiting email confirmation,
        // let them continue to choose a plan and pay
        else if (isEphemeral() && !localStorage.awaitingConfirmationAccount) {
            showRegisterDialog();
            return false;
        }

        // If they clicked the plan immediately after completing registration,
        // set the flag so it can be logged
        if (localStorage.keycomplete) {
            pro.propay.planChosenAfterRegistration = true;
        }

        loadSubPage('propay_' + planId);
    };

    const initBuyPlan = () => {
        const $buyBtn = $('.pricing-plan-btn', $planCards);
        const $freeBtns = $('#freeStart, #tryMega', $page);

        $buyBtn.rebind('click.pricing', function() {

            const selectedCard = this.closest('.pricing-plan-card');
            if (!selectedCard || selectedCard.classList.contains('disabled')) {
                return false;
            }

            const selectedID = selectedCard.id;

            if (selectedID) {

                const planId = selectedID.replace('pro', '') | 0;

                if (planId) {
                    if (is_mobile) {
                        delay('pricing.plan-mobile', eventlog.bind(null, 99869 + planId));
                    }
                    delay('pricing.plan', eventlog.bind(null, 99779 + planId));

                    moveToBuyStep(planId);
                }

            }
            return false;
        });

        $freeBtns.rebind('click.pricing', function() {
            const logId = this.id === 'tryMega' ? 99785 : 99784;

            localStorage.removeItem('keycomplete');

            delay('pricing.plan', eventlog.bind(null, logId));

            if (!window.u_handle) {

                const destination = this.id === 'tryMega' && this.textContent === l[24549]
                    ? 'registerb' : 'register';

                loadSubPage(destination);

                return false;
            }

            loadSubPage('fm');

            if (localStorage.gotOverquotaWithAchievements) {
                onIdle(() => {
                    mega.achievem.achievementsListDialog();
                });
                delete localStorage.gotOverquotaWithAchievements;
            }

            return false;

        });
    };

    const estimateBussPrice = (users = 3, storage = 3, transfer = 3) => {
        const minUser = 3;
        const minStroage = 3; // 3 TB
        const minTransfer = 3; // 3 TB

        users = Math.max(minUser, users);
        storage = Math.max(minStroage, storage);
        transfer = Math.max(minTransfer, transfer);

        const extraStorage = storage - minStroage;
        let extraTransfer = transfer - minTransfer;

        if (extraTransfer > extraStorage) {
            extraTransfer -= extraStorage;
        }
        else {
            extraTransfer = 0;
        }

        let totalPrice;
        let currency = 'EUR';

        if (pro.proplan.businessPlanData.isLocalInfoValid) {
            currency = pro.proplan.businessPlanData.l.lc;
            const totalUsersCost = pro.proplan.businessPlanData.bd.us.lp * users;
            const totalStorageCost = pro.proplan.businessPlanData.bd.sto.lp * extraStorage;
            const totalTransferCost = pro.proplan.businessPlanData.bd.trns.lp * extraTransfer;

            totalPrice = formatCurrency(
                totalUsersCost + totalStorageCost + totalTransferCost,
                currency,
                'narrowSymbol'
            );
        }
        else {
            const totalUsersCost = pro.proplan.businessPlanData.bd.us.p * users;
            const totalStorageCost = pro.proplan.businessPlanData.bd.sto.p * extraStorage;
            const totalTransferCost = pro.proplan.businessPlanData.bd.trns.p * extraTransfer;

            totalPrice = formatCurrency(totalUsersCost + totalStorageCost + totalTransferCost);
        }

        $totalPriceVal.text(totalPrice);
        $totalPriceCurr.text(`${currency} / ${l[931]}`);
    };

    const estimateFlexiPrice = (storage = 3, transfer = 3) => {

        if (!ProFlexiFound) {
            $proflexiBlock.addClass('hidden');
            return;
        }

        const minStroage = 3; // 3 TB
        const minTransfer = 3; // 3 TB

        storage = Math.max(minStroage, storage);
        transfer = Math.max(minTransfer, transfer);

        const extraStorage = storage - minStroage;
        let extraTransfer = transfer - minTransfer;

        // Extra transfer is not charged if it's lower than extra storage.
        if (extraTransfer <= extraStorage) {
            extraTransfer = 0;
        }
        else {
            extraTransfer -= extraStorage;
        }

        let totalPrice;
        let currency = 'EUR';
        // if we have local price info for extra storage/transfer and currency
        if (ProFlexiFound[13] && ProFlexiFound[15] && ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]
            && ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            currency = ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

            const totalStorageCost = ProFlexiFound[13] * extraStorage;
            const totalTransferCost = ProFlexiFound[15] * extraTransfer;

            totalPrice = formatCurrency(
                totalStorageCost + totalTransferCost + ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICE],
                currency,
                'narrowSymbol'
            );
        }
        else {
            const totalStorageCost = ProFlexiFound[12] * extraStorage;
            const totalTransferCost = ProFlexiFound[14] * extraTransfer;

            totalPrice = formatCurrency(
                totalStorageCost
                + totalTransferCost
                + ProFlexiFound[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE]
            );
        }

        $totalFlexPriceVal.text(totalPrice);
        $totalFlexPriceCurr.text(`${currency} / ${l[931]}`);

    };

    /**
     * Handler to init all sliders : Business, Flexi, Competitors
     * */
    const initSlidersEvents = () => {
        const $compareMEGABox = $('.pricing-compare-cards.mega', $compareBox);
        const $compareDPBox = $('.pricing-compare-cards.dp', $compareBox);
        const $compareGDBox = $('.pricing-compare-cards.gd', $compareBox);
        const $compareMEGA = $('.pricing-compare-cards-rate .vl', $compareMEGABox);
        const $compareDP = $('.pricing-compare-cards-rate .vl', $compareDPBox);
        const $compareGD = $('.pricing-compare-cards-rate .vl', $compareGDBox);

        const $flexStorageSlider = $('#storage-flex-slider', $proflexiBlock);
        const $flexTransSlider = $('#trans-flex-slider', $proflexiBlock);
        const $strgFlexInput = $('#esti-storage', $proflexiBlock);
        const $transFlexInput = $('#esti-trans', $proflexiBlock);

        // ordered array for ranges: [range-start,range-end,min,max]
        const symmetricRanges = [
            [0, 32, 3, 75],
            [33, 66, 76, 150],
            [67, 100, 151, 300]
        ];
        const asymmetricRanges = [
            [0, 50, 3, 100],
            [51, 75, 101, 1000],
            [76, 100, 1001, 10000]
        ];

        $compareMEGA.text(formatCurrency(1.56));
        $compareDP.text(formatCurrency(5.50));
        $compareGD.text(formatCurrency(3.70));

        const sliderEventHandler = (slider, ranges, $inputTxt) => {
            let val = slider.value;

            if (slider.max && slider.max !== 100) {
                val = (val / slider.max) * 100;
            }

            let direction = 'to right';

            if ($('body').hasClass('rtl')) {
                direction = 'to left';
            }

            const styleVal = `linear-gradient(${direction}, var(--color-secondary-cobalt-900) ${val}%,`
                + `var(--color-grey-150) ${val}% 100%)`;

            slider.style.background = styleVal;

            if ($inputTxt) {
                // get val range. maintain the order is important to minimize complexity
                for (const range of ranges) {
                    if (val <= range[1]) {
                        const area = range[1] - range[0];
                        const top = range[3] - range[2];
                        const pointer = val - range[0];
                        // area  top
                        // val   x ==> x = top*val/area
                        const newVal = ((top * pointer) / area) + range[2];
                        $inputTxt.val(Math.round(newVal));
                        break;
                    }
                }
            }

        };

        sliderEventHandler($usersBusinessSlider[0]);
        sliderEventHandler($strgBusinessSlider[0]);
        sliderEventHandler($trsBusinessSlider[0]);
        sliderEventHandler($flexStorageSlider[0]);
        sliderEventHandler($flexTransSlider[0]);


        $usersBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, symmetricRanges, $usersBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $strgBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $strgBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $trsBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $trsBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $flexStorageSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $strgFlexInput);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
        });

        $flexTransSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $transFlexInput);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
        });

        const fromValueToRange = (ranges, val) => {
            for (const range of ranges) {
                if (val <= range[3]) {
                    const area = range[1] - range[0];
                    const top = range[3] - range[2];
                    const pointer = val - range[2];

                    return ((area * pointer) / top) + range[0];
                }
            }
        };

        $usersBusinessInput.rebind('change.pricing', function() {
            const min = this.getAttribute('min') | 0;
            this.value = Math.max(Math.min(Math.round(this.value), 300), min);

            const newRange = fromValueToRange(symmetricRanges, this.value);

            $usersBusinessSlider.val(newRange);
            sliderEventHandler($usersBusinessSlider[0]);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $strgBusinessInput.rebind('change.pricing', function() {
            const min = this.getAttribute('min') | 0;
            this.value = Math.max(Math.min(Math.round(this.value), 10000), min);

            const newRange = fromValueToRange(asymmetricRanges, this.value);

            $strgBusinessSlider.val(newRange);
            sliderEventHandler($strgBusinessSlider[0]);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $trsBusinessInput.rebind('change.pricing', function() {
            const min = this.getAttribute('min') | 0;
            this.value = Math.max(Math.min(Math.round(this.value), 10000), min);

            const newRange = fromValueToRange(asymmetricRanges, this.value);

            $trsBusinessSlider.val(newRange);
            sliderEventHandler($trsBusinessSlider[0]);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
        });

        $strgFlexInput.rebind('change.pricing', function() {
            const min = this.getAttribute('min') | 0;
            this.value = Math.max(Math.min(Math.round(this.value), 10000), min);

            const newRange = fromValueToRange(asymmetricRanges, this.value);

            $flexStorageSlider.val(newRange);
            sliderEventHandler($flexStorageSlider[0]);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
        });

        $transFlexInput.rebind('change.pricing', function() {
            const min = this.getAttribute('min') | 0;
            this.value = Math.max(Math.min(Math.round(this.value), 10000), min);

            const newRange = fromValueToRange(asymmetricRanges, this.value);

            $flexTransSlider.val(newRange);
            sliderEventHandler($flexTransSlider[0]);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
        });

        estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());

    };

    const initSocial = () => {
        const quotes = {
            'advisor': [l.bsn_feedback_quote3, 'TECH ADVISOR'],
            'radar': [l.bsn_feedback_quote4, 'techradar'],
            'cloudwards': [l.bsn_feedback_quote1, 'Cloudwards'],
            'privacy': [l.bsn_feedback_quote2, 'ProPrivacy'],
            'toms': [l.bsn_feedback_quote5, 'tom\'s guide']
        };

        const $socialContainer = $('.pricing-pg.pricing-social-container', $page);
        const $socialIconsContainer = $('.pricing-social-refs-container', $socialContainer);
        const $socialIcons = $('i.q-logo', $socialIconsContainer);
        const $socialText = $('.pricing-social-quote', $socialContainer);
        const $socialName = $('.pricing-social-quote-name', $socialContainer);

        let rotatingTimer;

        const rotatingQuotes = () => {
            if (page !== 'pro') {
                clearInterval(rotatingTimer);
                return;
            }

            for (let i = 0; i < $socialIcons.length; i++) {

                if ($socialIcons[i].classList.contains('active')) {

                    const nextIcon = i + 1 >= $socialIcons.length ? 0 : i + 1;

                    $($socialIcons[nextIcon]).trigger('click.pricing');
                    return;
                }
            }
        };

        $socialIcons.rebind('click.pricing', function() {

            clearInterval(rotatingTimer);

            $socialIcons.removeClass('active');
            this.classList.add('active');
            $socialText.text(quotes[this.dataset.quoter][0]);
            $socialName.text(quotes[this.dataset.quoter][1]);

            if ($socialIconsContainer[0].scrollWidth > $socialIconsContainer[0].clientWidth) {
                $socialIconsContainer[0].scroll(this.offsetLeft - $socialIconsContainer[0].offsetLeft, 0);
            }

            rotatingTimer = setInterval(rotatingQuotes, 9000);
        });

        rotatingTimer = setInterval(rotatingQuotes, 9000);

    };

    const initFaq = () => {

        const $faqContainer = $('.pricing-pg.faq-container', $page);
        const $faqItemTemplate = $('.faq-qa.template', $faqContainer);
        const $faqContent = $('.faq-content', $faqContainer);

        const faqQuestions = {
            'faq1': {
                question: l.pricing_page_faq_question_1,
                answer: [l.pricing_page_faq_answer_1]
            },
            'faq2': {
                question: l.pricing_page_faq_question_2,
                answer: [l.pricing_page_faq_answer_2]
            },
            'faq3': {
                question: l.pricing_page_faq_question_3,
                answer: [l.pricing_page_faq_answer_3]
            },
            'faq4': {
                question: l.pricing_page_faq_question_4,
                answer: [l.pricing_page_faq_answer_4, l.pricing_page_faq_answer_4_2]
            },
            'faq5': {
                question: l.pricing_page_faq_question_5,
                answer: [l.pricing_page_faq_answer_5]
            },
            'faq6': {
                question: l.pricing_page_faq_question_6,
                answer: [l.pricing_page_faq_answer_6, l.pricing_page_faq_answer_6_2]
            },
        };

        const $answerPartTemplate = $('.faq-answer-part', $faqItemTemplate).clone();

        for (const faq in faqQuestions) {
            const $faqItem = $faqItemTemplate.clone().removeClass('template hidden').addClass(faq);
            $('.faq-question', $faqItem).text(faqQuestions[faq].question);
            for (let i = 0; i < faqQuestions[faq].answer.length; i++) {
                const $answerPart = $answerPartTemplate.clone().safeHTML(faqQuestions[faq].answer[i]);
                $('.faq-item-answer', $faqItem).safeAppend($answerPart.prop('outerHTML'));
            }

            $faqContent.safeAppend($faqItem.prop('outerHTML'));

            const $qaRebind = $(`.${faq}`, $faqContent);
            $('.faq-item-title', $qaRebind).rebind('click.pricing', () => {
                if (window.getSelection()) {
                    window.getSelection().removeAllRanges();
                }
                $('.faq-item-answer', $qaRebind).toggleClass('hidden');
                $('.faq-item-title i', $qaRebind).toggleClass(['minus-icon', 'grey-medium-plus', 'small-icon']);
            });
        }
        $('.faq1 .faq-question', $faqContent).click();
    };

    const initProFlexi = () => {

        if (!ProFlexiFound) {
            $proflexiBlock.addClass('hidden');
            return;
        }

        const $proFlexCard = $('.pricing-plan-card', $proflexiBlock);

        $totalFlexPriceVal = $('.pricing-flexi-block-estimator-total-nb .vl', $proflexiBlock);
        $totalFlexPriceCurr = $('.pricing-flexi-block-estimator-total-unit', $proflexiBlock);

        const planNum = ProFlexiFound[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
        const planName = pro.getProPlanName(planNum);


        $('.pricing-plan-title', $proFlexCard).text(planName);

        let flexiPrice;
        let flexiCurrency;
        let extraPrice;
        let hasLocalPrices = false;

        // if we have local prices info provided
        if (ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] && ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            flexiPrice = ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICE];
            flexiCurrency = ProFlexiFound[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
        }
        else {
            flexiPrice = ProFlexiFound[pro.UTQA_RES_INDEX_PRICE];
            flexiCurrency = 'EUR';
        }

        $('.pricing-plan-price span.vl', $proFlexCard).text(formatCurrency(flexiPrice, flexiCurrency, 'narrowSymbol'));
        $('.pricing-plan-price-unit', $proFlexCard).text(`${flexiCurrency} / ${l[931]}`);

        const baseStorage = ProFlexiFound[pro.UTQA_RES_INDEX_STORAGE] / 1024;

        $('.pricing-plan-storage', $proFlexCard)
            .text(l.bsn_base_stg_trs.replace('%1', baseStorage));

        // if we have local price info for extra storage
        if (ProFlexiFound[13]) {
            extraPrice = formatCurrency(ProFlexiFound[13], flexiCurrency, 'narrowSymbol');
            hasLocalPrices = true;
        }
        else {
            extraPrice = formatCurrency(ProFlexiFound[12]);
        }

        if (flexiCurrency === 'EUR') {
            $('.pricing-plan-trasfer .ex-desc', $proFlexCard)
                .text(l.pr_flexi_extra.replace('%1', extraPrice));
        }
        else {
            $('.pricing-plan-trasfer .ex-desc', $proFlexCard)
                .text(l.bsn_add_base_stg_trs.replace('%1', extraPrice));
        }

        const $buyBtn = $('.pricing-plan-btn', $proFlexCard)
            .text(l.buy_plan.replace('%1', planName));

        // hide/show the asterisk and the note depending on local prices availability
        $('.ars', $proflexiBlock).toggleClass('hidden', !hasLocalPrices);
        $('.pricing-flexi-block-card-note, .pricing-flexi-block-card-note-s', $proflexiBlock)
            .toggleClass('hidden', !hasLocalPrices);

        $buyBtn.rebind('click.pricing', () => {
            moveToBuyStep(planNum);
        });

    };

    const fillPlansInfo = (period) => {

        period = period || 12;

        const ab_test_flag = mega.flags.ab_apmap;

        // If user has ab_apmap flag, attach them to the experiment
        if (typeof ab_test_flag !== 'undefined') {
            api.req({a: 'abta', c: 'ab_apmap'});
        }

        if (!pro.membershipPlans.length) {
            console.error('Plans couldnt be loaded.');
            return;
        }

        const periodText = period === 12 ? l[932] : l[931];

        $planCards = $('.pricing-pg.pro-plans-cards-container .pricing-plan-card', $page);

        let localPriceInfo = false;
        ProFlexiFound = false;

        for (const currentPlan of pro.membershipPlans) {

            const months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
            const planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];


            if (planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                ProFlexiFound = currentPlan;
                continue;
            }

            if (months !== period || planNum === pro.ACCOUNT_LEVEL_BUSINESS) {
                continue;
            }

            const planName = pro.getProPlanName(planNum);
            // const priceIndex = period === 12 ? pro.UTQA_RES_INDEX_PRICE : pro.UTQA_RES_INDEX_MONTHLYBASEPRICE;

            const $planCard = $planCards.filter(`#pro${planNum}`);
            $planCard.removeClass('hidden');

            let planPrice = currentPlan[pro.UTQA_RES_INDEX_PRICE];
            const includeNoDiscount = (period === 12 && ab_test_flag);

            const planPriceNoDiscount = includeNoDiscount
                ? 12 * currentPlan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE] * pro.conversionRate
                : null;

            let priceCurrency = 'EUR';

            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                planPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                priceCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                if (!localPriceInfo) {
                    localPriceInfo = priceCurrency;
                }
            }

            const priceText = formatCurrency(planPrice, priceCurrency, 'narrowSymbol');
            const noDiscountText = planPriceNoDiscount
                ? formatCurrency(planPriceNoDiscount, priceCurrency, 'narrowSymbol')
                : false;

            const monthlyPriceText = includeNoDiscount
                ? formatCurrency(planPrice / 12, priceCurrency, 'narrowSymbol')
                : false;

            $('.pricing-plan-price span.vl', $planCard).text(priceText);

            const $planPriceUnit = $('.pricing-plan-price-unit', $planCard);
            if (includeNoDiscount) {
                $planPriceUnit.text(priceCurrency + ' ' + l.pr_billed_yearly).addClass('billed-yearly');
            }
            else {
                $planPriceUnit.text(priceCurrency + ' / ' +  periodText).removeClass('billed-yearly');
            }

            if (priceText) {
                $planCard.toggleClass('long-currency1', priceText.length >= 9 && priceText.length <= 12);
                $planCard.toggleClass('long-currency2', priceText.length >= 13 && priceText.length <= 16);
                $planCard.toggleClass('long-currency3', priceText.length >= 17);
            }
            if (includeNoDiscount) {
                const perMonthText = monthlyPriceText + '*';
                $('.pricing-plan-only', $planCard).text(noDiscountText)
                    .removeClass('hidden').addClass('strikethrough');
                $('.pricing-plan-monthly ', $planCard).removeClass('hidden');
                $('.pricing-plan-monthly span', $planCard).text(perMonthText).removeClass('hidden');

            }
            else {
                $('.pricing-plan-monthly', $planCard).addClass('hidden');
                $('.pricing-plan-only', $planCard).text(l.pr_only).removeClass('strikethrough');
            }

            // get the storage/bandwidth, then convert it to bytes (it comes in GB) to format.
            // 1073741824 = 1024 * 1024 * 1024
            const storageFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_STORAGE] * 1073741824, 0);
            const storageTxt = l[23789].replace('%1', storageFormatted);

            const bandwidthFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_TRANSFER] * 1073741824, 0);
            const bandwidthTxt = l[23790].replace('%1', bandwidthFormatted);

            $('.pricing-plan-storage', $planCard).text(storageTxt);

            const $storageBox = $('.pricing-plan-storage', $planCard);
            const $transferBox = $('.pricing-plan-trasfer', $planCard);
            const $transferSubBox = $('.pricing-plan-trasfer-val', $transferBox);

            if (storageTxt) {
                $storageBox.toggleClass('long-text', storageTxt.length >= 27 || bandwidthTxt.length >= 27);
                $transferBox.toggleClass('long-text', storageTxt.length >= 27 || bandwidthTxt.length >= 27);
            }

            if ($transferSubBox.length) {
                $transferSubBox.text(bandwidthTxt);
            }
            else {
                $transferBox.text(bandwidthTxt);
            }

            $('.pricing-plan-title', $planCard).text(planName);
            $('.pricing-plan-btn', $planCard).text(l.buy_plan.replace('%1', planName));

            if (ab_test_flag) {
                $('.pricing-pg.pick-period-container .period-note-txt span').addClass('bold');
            }
            else {
                $('.pricing-pg.pick-period-container .period-note-txt span').removeClass('bold');
            }
        }

        const $freeBanner = $('.pricing-pg.pricing-banner-container', $page);

        localPriceInfo = localPriceInfo || 'EUR';
        $('.pricing-get-free-banner-price-val', $freeBanner)
            .text(formatCurrency(0, localPriceInfo, 'narrowSymbol', true));

        $('.pricing-get-free-ads', $freeBanner).toggleClass('hidden', !(mega.flags.ab_adse === 1));

        $proflexiBlock = $('.pricing-pg.pricing-flexi-container', $page);

        const showFlexi = ProFlexiFound && mega.flags && mega.flags.pf === 1;
        $('.pricing-plan-more', $planCards).toggleClass('hidden', !showFlexi);
        $proflexiBlock.toggleClass('hidden', !showFlexi);

        if (showFlexi) {

            $('#try-flexi', $planCards).rebind('click.pricing', () => {
                // behavior not supported in Safari.
                $proflexiBlock[0].scrollIntoView({ behavior: "smooth" });
            });

            initProFlexi();
        }

        $compareBox = $('.pricing-pg.pricing-compare-full-container', $page);

        // hide/show the asterisk and the note depending on local prices availability
        $('.ars', $planCards).toggleClass('hidden', localPriceInfo === 'EUR');
        $('.pricing-pg.pricing-estimation-note-container', $page).toggleClass('hidden eu', localPriceInfo === 'EUR');

    };

    const populateBusinessPlanData = () => {

        $businessPlans = $('.pricing-pg.pricing-business-plan-container', $page);

        const $businessCard = $('.pricing-plan-card', $businessPlans);

        $totalPriceVal = $('.pricing-flexi-block-estimator-total-nb .vl', $businessPlans);
        $totalPriceCurr = $('.pricing-flexi-block-estimator-total-unit', $businessPlans);

        $usersBusinessSlider = $('input#users-slider', $businessPlans);
        $usersBusinessInput = $('input#esti-user', $businessPlans);

        $strgBusinessSlider = $('input#storage-flex-slider-b', $businessPlans);
        $strgBusinessInput = $('input#esti-storage-b', $businessPlans);

        $trsBusinessSlider = $('input#trans-flex-slider-b', $businessPlans);
        $trsBusinessInput = $('input#esti-trans-b', $businessPlans);

        let pricePerUser = pro.proplan.businessPlanData.bd && pro.proplan.businessPlanData.bd.us
            && pro.proplan.businessPlanData.bd.us.p;
        let priceCurrency;
        let storagePrice;
        let hasLocalPrice = false;

        const minStorageValue = pro.proplan.businessPlanData.bd.ba.s / 1024;

        if (pro.proplan.businessPlanData.isLocalInfoValid) {

            priceCurrency = pro.proplan.businessPlanData.l.lc;

            pricePerUser = formatCurrency(pro.proplan.businessPlanData.bd.us.lp * 3, priceCurrency, 'narrowSymbol');
            storagePrice = formatCurrency(pro.proplan.businessPlanData.bd.sto.lp, priceCurrency, 'narrowSymbol');
            hasLocalPrice = true;
        }
        else {
            priceCurrency = 'EUR';
            pricePerUser = formatCurrency(pricePerUser * 3);
            storagePrice = formatCurrency(pro.proplan.businessPlanData.bd.sto.p);
        }

        $('.pricing-plan-price .vl', $businessCard).text(pricePerUser);
        $('.pricing-plan-price-unit', $businessCard).text(`${priceCurrency} / ${l[931]}`);
        $('.pricing-plan-storage .business-base', $businessCard)
            .text(l.bsn_base_stg_trs.replace('%1', minStorageValue));
        $('.pricing-plan-trasfer', $businessCard)
            .text(l.bsn_add_base_stg_trs.replace('%1', storagePrice)
                .replace('*', (hasLocalPrice ? '*' : '')));

        initSlidersEvents();
        estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());

        // hide/show the asterisk and the note depending on local prices availability
        $('.ars', $businessPlans).toggleClass('hidden', !hasLocalPrice);
        $('.pricing-flexi-block-card-note, .pricing-flexi-block-card-note-s', $businessPlans)
            .toggleClass('hidden', !hasLocalPrice);

        // init buy-business button event handler
        $('#buyBusiness', $businessPlans).rebind('click.pricing', () => {

            // log the click event
            delay('pricing.plan', eventlog.bind(null, 99786));

            loadSubPage('registerb');

            return false;
        });

    };

    const fetchBusinessPlanInfo = async() => {

        if (pro.proplan.businessPlanData && pro.proplan.businessPlanData.length) {
            return populateBusinessPlanData();
        }

        await M.require('businessAcc_js');

        const business = new BusinessAccount();

        // eslint-disable-next-line complexity
        return business.getBusinessPlanInfo(false).then((info) => {

            pro.proplan.businessPlanData = info;

            // If all new API values exist
            pro.proplan.businessPlanData.isValidBillingData = info.bd && info.bd.us
                && (info.bd.us.p || info.bd.us.lp)
                && info.bd.sto && (info.bd.sto.p || info.bd.sto.lp)
                && info.bd.sto.s && info.bd.trns && (info.bd.trns.p || info.bd.trns.lp)
                && info.bd.trns.t && info.bd.ba.s && info.bd.ba.t;

            // If local currency values exist
            pro.proplan.businessPlanData.isLocalInfoValid = info.l && info.l.lcs && info.l.lc
                && info.bd.us.lp && info.bd.sto.lp && info.bd.trns.lp;

            populateBusinessPlanData();
        });
    };

    const initPeriodPickHandler = () => {
        const $radioOptions = $('.pricing-pg.pick-period-container .pricing-radio-option', $page);
        const $strgFlexInput = $('#esti-storage', $proflexiBlock);
        const $transFlexInput = $('#esti-trans', $proflexiBlock);

        const preSelectedPeriod = (sessionStorage.getItem('pro.period') | 0) || 12;

        if (preSelectedPeriod === 12) {
            $radioOptions.removeClass('selected');
            $radioOptions.filter('[data-period="12"]').addClass('selected');
        }

        $radioOptions.rebind('click.pricing', function() {
            $radioOptions.removeClass('selected');

            this.classList.add('selected');
            sessionStorage.setItem('pro.period', this.dataset.period);

            if (this.dataset.period === '12') {
                delay('pricing.plan', eventlog.bind(null, is_mobile ? 99867 : 99866));
            }
            else {
                delay('pricing.plan', eventlog.bind(null, is_mobile ? 99869 : 99868));
            }
            fillPlansInfo(this.dataset.period | 0);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());

            return false;
        });
    };

    const fetchPlansData = () => {
        return new Promise(resolve => {
            pro.loadMembershipPlans(() => {
                if (u_attr) {

                    M.getStorageQuota().then(storage => {
                        pro.proplan2.storageData = storage;
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            });
        });
    };

    /**
     * This method see how we should display each plan card for a logged-in user
     * */
    const updatePriceCards = () => {

        // we consider confirmed users [u_type = 3]
        // and non confirmed ones [=2] because they might have bought a plan
        if (u_type > 1 && u_attr) {

            // if this is user is Business or Pro-flexi
            // note: they cant reach this function, however this check
            // is for future changes protection
            if (u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS || u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                $planCards.addClass('disabled');
                return;
            }

            // reset cards status
            $planCards.removeClass('disabled popular');

            // hide free banners

            if (localStorage.keycomplete) {
                pro.propay.planChosenAfterRegistration = true;
            }
            else {
                $('.pricing-pg.pricing-banner-container, .pricing-pg.pricing-get-started-container', $page)
                    .addClass('hidden');
            }
            // function to set card class, and txt for the header
            const setCardClassTxt = (id, cls, txt) => {
                const $card = $planCards.filter(`#pro${id}`).addClass(cls);
                if (txt) {
                    $('.pricing-plan-recommend', $card).text(txt);
                }
            };

            // to see what to disable  and what to recommend
            // we will check storage.
            if (pro.proplan2.storageData && pro.proplan2.storageData.used) {
                const usedSpaceGB = pro.proplan2.storageData.used / 1073741824;

                // get the plans for lite, pro1, pro2, pro3. and 1 month
                const plans = pro.membershipPlans.filter(p => p[1] > 0 && p[1] < 5 && p[4] === 1);

                // strangely no plans found --> set default
                if (!plans.length) {
                    setCardClassTxt(pro.ACCOUNT_LEVEL_PRO_I, 'popular', l.pr_popular);
                    return;
                }

                let minStorage = Number.MAX_SAFE_INTEGER;
                let recomendedPlan = null;
                const planLevel = u_attr.p ? (u_attr.p <= 3 ? u_attr.p : 0) : -1;

                for (const plan of plans) {

                    const currPlanLevel = plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] <= 3
                        ? plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] : 0;

                    // if the plan offers less space than used OR same user's plan --> disable
                    if (plan[pro.UTQA_RES_INDEX_STORAGE] < usedSpaceGB) {

                        $planCards.filter(`#pro${plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]}`).addClass('disabled');
                    }

                    // if the plan is suitable, let's see the smallest plan to recommend to the user
                    // that is bigger than their current purchased plan.
                    else if (currPlanLevel > planLevel && plan[pro.UTQA_RES_INDEX_STORAGE] < minStorage) {
                        minStorage = plan[pro.UTQA_RES_INDEX_STORAGE];
                        recomendedPlan = plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
                    }
                }

                // if we found recommendation, let's recommend
                if (recomendedPlan) {
                    setCardClassTxt(recomendedPlan, 'popular', l[23948]);
                }

            }
            // we couldn't get the info.
            // if it's not a free user
            // we will reset to default
            else if (u_attr.p) {
                setCardClassTxt(pro.ACCOUNT_LEVEL_PRO_I, 'popular', l.pr_popular);
            }
            // it's a free user
            else {
                setCardClassTxt(pro.ACCOUNT_LEVEL_PRO_LITE, 'popular', l[23948]);
            }

        }
    };

    /**
     * Check id the current request to view the page is valid
     * @returns {boolean}   true if it's valid
     * */
    const validatePageRequest = () => {

        // if there's a logged in user (attributes)
        if (u_attr) {
            // if it's a business account --> not valid
            // just check the proper destination.
            if (u_attr.b) {
                let destination = 'fm';

                if (u_attr.b.m && pro.isExpiredOrInGracePeriod(u_attr.b.s)) {
                    destination = 'repay';
                }

                loadSubPage(destination);
                return false;
            }
            // if it's a Pro-Flexi account --> not valid
            // just check the proper destination.
            else if (u_attr.pf) {
                let destination = 'fm';

                if (pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
                    destination = 'repay';
                }

                loadSubPage(destination);
                return false;
            }

        }

        return true;
    };

    /**
     * This method initialize Plans' Prices cards.
     * It calls some other private method to display the cards correctly
     * */
    const initPlansCards = () => {


        // fill the info in all cards
        fillPlansInfo(sessionStorage.getItem('pro.period') | 0);
        updatePriceCards();
        // initialize but buttons for plans and for the free
        initBuyPlan();
    };


    return new class {

        async initPage() {

            // validate the request, checking for business + proFlexi

            if (!validatePageRequest()) {
                return false;
            }

            // They're from mega.io with a plan chosen, but they need to register first before going to /propay_x
            if (is_mobile && window.nextPage === '1' && window.pickedPlan){
                return loadSubpage('register');
            }

            loadingDialog.show();

            await fetchPlansData();
            parsepage(pages.planpricing);

            if (mega.ui.header) {
                mega.ui.header.update();
            }
            if (mega.ui.alerts) {
                mega.ui.alerts.hide();
            }

            $page = $('.bottom-page.full-block', '.bottom-page.content.pricing-pg');

            delay('pricingpage.init', eventlog.bind(null, is_mobile ? 99936 : 99935));

            initPlansCards();
            fetchBusinessPlanInfo();

            initTabHandlers();
            initPeriodPickHandler();
            initPlansTabs();
            initSocial();
            initFaq();

            loadingDialog.hide();

            if (window.nextPage === '1' && window.pickedPlan) {

                pro.proplan2.selectedPlan = window.pickedPlan;

                delete window.nextPage;
                delete window.pickedPlan;

                showRegisterDialog();
            }
        }
    };
});
