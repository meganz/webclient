
/**
 * @typedef {Object} PricingTabInfo - Contains information about a tab, its state, and its more important elements
 * @property {boolean} initialized - Whether the tab has been initialized
 * @property {JQuery|null} $planCards - The plan cards container for the tab
 * @property {function(): boolean} isAvailable - A function to determine if the tab is available
 * @property {function(boolean): void} updateTabVisibility - A function to update the visibility of the tab
 * @property {string} tabID - The ID of the tab element
 * @property {JQuery|null} $tab - The tab element
 * @property {JQuery|null} $planCardsContainer - The plan cards container for the tab
 * @property {JQuery|null} $tabItems - The items to show specifically when the tab is active
 * @property {JQuery|null} $tabItemsInv - The items to hide specifically when the tab is active
 * @property {boolean} requiresUpdate - Whether the tab requires an update
 * @property {string} tabControlName - The class name used to control showing/hiding the tab
 */

/**
 * @typedef {Object} PricingTabs - Contains information about the available tabs on the pro page
 * @property {PricingTabInfo} exc - Information about the exclusive offers tab
 * @property {PricingTabInfo} pro - Information about the pro plans tab
 * @property {PricingTabInfo} bsn - Information about the business plan tab
 * @property {PricingTabInfo} vpn - Information about the VPN plan tab
 */

/**
 * @typedef {Object} PricingPageInformation - Contains information about the pro page, its tabs, and its elements
 * @property {JQuery|null} $featuresBox - The features box container
 * @property {JQuery|null} $featureBoxExcCol - The features column for exclusive offers
 * @property {JQuery|null} $featureBoxBsnCol - The features column for business plans
 * @property {JQuery|null} $featureBoxFlxCol - The features column for flexi plans
 * @property {string|null} currentTab - The ID of the current tab
 * @property {string|null} previousTab - The ID of the previous tab
 * @property {function(?'exc' | 'flx' | 'bsn'): JQuery | false} getFeaturesCol - Get the features column for a tab, or
 * the features box. Returns false if the tab is not found
 */

lazy(pro, 'proplan2', () => {
    'use strict';

    let $page;
    let $planCards;
    let $exclusivePlans;
    let $periodPicker;
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

    // Ensure that this is a boolean, as it will be used for toggleClass
    let showExclusiveOffers = false;

    let ProFlexiFound = false;
    let VpnPlanFound = false;
    let PwmPlanFound = false;

    const allowedPeriods = new Set([1, 12]);

    /**
     * @type {PricingPageInformation}
     */
    let pageInformation = null;

    // TODO: Update this to use bitfields instead of strings for identification
    /**
     * Information about the available tabs on the pro page
     * @type {PricingTabs}
     */
    let tabsInfo = null;

    let tabsFunctions = null;

    tabsInfo = {
        'exc': {
            key: 'exc',
            tabID: 'pr-exc-offer-tab',
            tabControlName: 'tab-ctrl-exc',
            requiresUpdate: true,
            initialized: false,
            $tab: null,
            $tabItems: null,
            $planCardsContainer: null,
            $planCards: null,
            isAvailable: () => showExclusiveOffers,
            updateTabVisibility(hide) {
                tabsFunctions.updateTabVisibility(this, hide);
            },
        },
        'pro': {
            key: 'pro',
            tabID: 'pr-individual-tab',
            tabControlName: 'tab-ctrl-ind',
            requiresUpdate: true,
            initialized: false,
            $tab: null,
            $tabItems: null,
            $planCardsContainer: null,
            $planCards: null,
            isAvailable: () => true, // Pro plans tab is always available
            updateTabVisibility(hide) {
                tabsFunctions.updateTabVisibility(this, hide);
            },
        },
        'bsn': {
            key: 'bsn',
            tabID: 'pr-business-tab',
            tabControlName: 'tab-ctrl-bus',
            requiresUpdate: true,
            initialized: false,
            $tab: null,
            $tabItems: null,
            $planCardsContainer: null,
            $planCards: null,
            isAvailable: () => !!(pro.proplan.businessPlanData && Object.keys(pro.proplan.businessPlanData).length),
            updateTabVisibility(hide) {
                tabsFunctions.updateTabVisibility(this, hide);
            },
        },
        'vpn': {
            key: 'vpn',
            tabID: 'pr-vpn-tab',
            tabControlName: 'tab-ctrl-vpn',
            requiresUpdate: true,
            initialized: false,
            $tab: null,
            $tabItems: null,
            $planCardsContainer: null,
            $planCards: null,
            isAvailable: () => !!VpnPlanFound,
            updateTabVisibility(hide) {
                tabsFunctions.updateTabVisibility(this, hide);
            },
        },
        'pwm': {
            key: 'pwm',
            tabID: 'pr-pwm-tab',
            tabControlName: 'tab-ctrl-pwm',
            requiresUpdate: true,
            initialized: false,
            $tab: null,
            $tabItems: null,
            $planCardsContainer: null,
            $planCards: null,
            isAvailable: () => !!PwmPlanFound,
            updateTabVisibility(hide) {
                tabsFunctions.updateTabVisibility(this, hide);
            },
        }
    };

    for (const tab in tabsInfo) {
        Object.defineProperty(tabsInfo[tab], '$tab', {
            get() {
                return $(document.getElementById(tabsInfo[tab].tabID));
            }
        });
    }

    pageInformation = {
        $featuresBox: null,
        $featureBoxExcCol: null,
        $featureBoxBsnCol: null,
        $featureBoxFlxCol: null,

        currentTab: null,
        previousTab: null,

        getFeaturesCol(tab) {
            if (!pageInformation.$featuresBox) {
                pageInformation.$featuresBox =
                    $('.pricing-pg.pricing-plans-compare-table-container', $page);
            }
            if (!tab) {
                return pageInformation.$featuresBox;
            }

            if (tab === 'exc') {
                if (!pageInformation.$featureBoxExcCol) {
                    const className = '.' + tabsInfo.exc.tabControlName + mega.flags.ab_ads ? '' : ':not(.no-ads)';
                    pageInformation.$featureBoxExcCol = $(className, pageInformation.$featuresBox);
                }
                return pageInformation.$featureBoxExcCol;
            }
            if (tab === 'flx') {
                if (!pageInformation.$featureBoxFlxCol) {
                    pageInformation.$featureBoxFlxCol = $('.pro-flexi', pageInformation.$featuresBox);
                }
                return pageInformation.$featureBoxFlxCol;
            }
            if (tab === 'bsn') {
                if (!pageInformation.$featureBoxBsnCol) {
                    const className = `.pro-business${mega.flags.ab_ads ? '' : ':not(.no-ads)'}`;
                    pageInformation.$featureBoxBsnCol = $(className, pageInformation.$featuresBox);
                }
                return pageInformation.$featureBoxBsnCol;
            }

            console.error('Invalid tab requested for features column:', tab);
            return false;
        },

        clearCache() {
            pageInformation.$featuresBox = null;
            pageInformation.$featureBoxExcCol = null;
            pageInformation.$featureBoxBsnCol = null;
            pageInformation.$featureBoxFlxCol = null;
        },
    };

    tabsFunctions = {
        updateTabVisibility(tab, hide) {
            hide = hide || !tab.isAvailable();

            if (tab.$tab) {
                tab.$tab.toggleClass('hidden', hide);
            }

            if (!tab.$planCardsContainer && tab.$planCards && tab.$planCards.length) {
                tab.$planCardsContainer = $(tab.$planCards[0]).closest('.card-container');
            }

            if (tab.$planCardsContainer) {
                tab.$planCardsContainer.toggleClass('hidden', hide);
            }
        },

        updateTabInformation(tab) {
            if (typeof tab === 'string') {
                tab = tabsInfo[tab];
            }

            tab.$tabItems = $(`.${tab.tabControlName}`, $page);
            tab.$tabItemsInv = $(`.${tab.tabControlName}-inv`, $page);

            tab.requiresUpdate = false;
        },

        updatePage(tab, hide) {
            if (typeof tab === 'string') {
                tab = tabsInfo[tab];
            }

            if (tab.requiresUpdate || !tab.$tabItems) {
                tabsFunctions.updateTabInformation(tab);
            }

            tab.$tabItemsInv.toggleClass('hidden', !hide);
            tab.$tabItems.toggleClass('hidden', !!hide);

            const $excCol = pageInformation.getFeaturesCol('exc');
            const $busFlexCols =
                $([...pageInformation.getFeaturesCol('bsn'), ...pageInformation.getFeaturesCol('flx')]);

            if (tab.tabID === 'pr-exc-offer-tab') {     // Show exc offers col, hide flexi and business
                $busFlexCols.addClass('hidden');
                $excCol.removeClass('hidden');
                pageInformation.getFeaturesCol().addClass('cols-4');
            }
            else {      // Show flexi and business cols, hide exc
                $busFlexCols.removeClass('hidden');
                $excCol.addClass('hidden');
                pageInformation.getFeaturesCol().removeClass('cols-4');
            }


            pageInformation.getFeaturesCol().toggleClass('show-comms', !!mega.flags.ab_ads);

            pageInformation.previousTab = pageInformation.currentTab;
            pageInformation.currentTab = tab;
        },
    };

    const getCurrentTab = () => (tabsInfo[window.mProTab] && tabsInfo[window.mProTab].tabID)
        || sessionStorage['pro.pricingTab']
        || tabsInfo.pro.tabID;


    const tabAvailable = (tab) => {
        return tabsInfo[tab].isAvailable();
    };

    // TODO: Deprecate this currentTab, and use pageInformation.currentTab instead, to align names
    let currentTab = getCurrentTab();

    /**
     * Checks whether account has got a feature enabled
     * @param {?String} featureKey The name of the feature to check. If not provided, returns all features as a set
     * @returns {Array<String|Number>|Boolean|Set<String>}
     */
    const getUserFeature = (featureKey) => {
        if (typeof featureKey === 'number') {
            featureKey = featureKey === pro.ACCOUNT_LEVEL_FEATURE_VPN && 'vpn'
                || featureKey === pro.ACCOUNT_LEVEL_FEATURE_PWM && 'pwm';
        }

        if (featureKey) {
            return !!u_attr
                && Array.isArray(u_attr.features)
                && u_attr.features.find(([, f]) => f === featureKey)
                || false;
        }
        // Return as a set in case there are any duplicates
        return !!u_attr
            && Array.isArray(u_attr.features)
            && new Set(u_attr.features.map(([, f]) => f));
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

    const initTabHandlers = () => {

        const $tableContainer = $('.pricing-pg.pricing-plans-compare-table-container', $page);
        const $tabs = $('.individual-team-tab-container .tabs-module-block', $page);

        const proDivsFree = '.pricing-pg.pricing-banner-container';
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

        for (const tab in tabsInfo) {
            tabsInfo[tab].updateTabVisibility();
        }

        const changeIndividualTeamTab = (target) => {
            $tabs.removeClass('selected');

            // Protection against invalid tab selection (via url setting it, changing of plans in session, ...)
            if (!target || target.classList.contains('hidden')) {
                target = document.getElementById(tabsInfo.pro.tabID);
            }

            target.classList.add('selected');

            // 0 - Indidivual, 1 - Business, 2 - Exclusive Offers, 3 - VPN, 4 - PWM
            let tab = 0;

            $page.removeClass('business individual exc-offer vpn-tab pwm-tab');

            // Hide the content of just the last shown tab
            if (pageInformation.currentTab) {
                tabsFunctions.updatePage(pageInformation.currentTab, true);
            }
            // Otherwise if no tab was previously selected, hide all tab content
            else {
                for (const tab in tabsInfo) {
                    tabsFunctions.updatePage(tabsInfo[tab], true);
                }
            }

            if (target.id === tabsInfo.bsn.tabID) {
                tab = 1; // Bus
            }
            else if (target.id === tabsInfo.exc.tabID) {
                tab = 2; // Exc
            }
            else if (target.id === tabsInfo.vpn.tabID) {
                tab = 3; // VPN
            }
            else if (target.id === tabsInfo.pwm.tabID) {
                tab = 4; // PWM
            }

            if (tab === 1 && tabAvailable('bsn')) {
                tabsFunctions.updatePage('bsn');
            }
            else if (tab === 2 && tabAvailable('exc')) {
                tabsFunctions.updatePage('exc');
            }
            else if (tab === 3 && tabAvailable('vpn')) {
                if (!tabsInfo.vpn.initialized) {
                    tabsInfo.vpn.$planCards = pro.proplan2.vpn.renderPricingPage(VpnPlanFound, $page, (months, al) => {
                        sessionStorage.setItem('pro.period', String(months));
                        moveToBuyStep(al);
                    });
                    tabsInfo.vpn.initialized = true;
                    tabsInfo.vpn.updateTabVisibility();
                    tabsInfo.vpn.requiresUpdate = true;
                }
                tabsFunctions.updatePage('vpn');
            }
            else if (tab === 4 && tabAvailable('pwm')) {
                if (!tabsInfo.pwm.initialized) {
                    tabsInfo.pwm.$planCards = pro.proplan2.pwm.renderPricingPage(PwmPlanFound, $page, (months, al) => {
                        sessionStorage.setItem('pro.period', String(months));
                        moveToBuyStep(al);
                    });
                    tabsInfo.pwm.initialized = true;
                    tabsInfo.pwm.updateTabVisibility();
                    tabsInfo.pwm.requiresUpdate = true;
                }
                tabsFunctions.updatePage('pwm');
            }
            else {
                console.assert(tab === 0, 'Tab not able to show:', tab);
                tabsFunctions.updatePage('pro');
            }

            $('.pricing-pg.pricing-estimation-note-container', $page).toggleClass('business', tab === 1);

            $freeBanner.toggleClass(
                'hidden',
                !!tab || (typeof u_handle !== 'undefined' && !localStorage.keycomplete)
            );

            if (tab === 1) {
                setFooterBannerTxt(l.pr_business_started, l.pr_easily_add, l[24549]);
            }
            else {
                setFooterBannerTxt(l.pr_get_started_now, '', l.pr_try_mega);
            }

            // eslint-disable-next-line no-use-before-define
            fillPlansInfo({
                duration: sessionStorage.getItem('pro.period') | 0,
                tab: pageInformation.currentTab.key || 'pro',
            });
        };

        $tabs.rebind('click.pricing', function() {
            changeIndividualTeamTab(this);

            currentTab = this.id;
            sessionStorage['pro.pricingTab'] = this.id;

            switch (this.id) {
                case 'pr-individual-tab':
                    delay('pricing.plan', eventlog.bind(null, is_mobile ? 99863 : 99862));
                    break;
                case 'pr-business-tab':
                    delay('pricing.business', eventlog.bind(null, is_mobile ? 99865 : 99864));
                    break;
                case 'pr-vpn-tab':
                    delay('pricing.vpn', eventlog.bind(null, is_mobile ? 500160 : 500161));
                    break;
                case 'pr-exc-offer-tab':
                    delay('pricing.exc-offer', eventlog.bind(null, is_mobile ? 500248 : 500247));
                    break;
                default:
                    delay('pricing.default', eventlog.bind(null, is_mobile ? 500256 : 500255));
                    break;
            }

            if (u_handle) {
                delete window.mProTab;
            }
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

        $('.no-ads', $tableContainer).toggleClass('hidden', !(mega.flags.ab_ads));
        changeIndividualTeamTab($(`#${currentTab}`, $page)[0]);

        eventlog(500337, currentTab);

        // Update the savedTab so that it will be set correctly when visited via /pro?tab=XXX
        sessionStorage['pro.pricingTab'] = currentTab;
    };

    const initPlansTabs = () => {
        const $tableContainer = pageInformation.getFeaturesCol();
        const $showBtn = $('.pricing-plans-compare-table-show', $tableContainer);
        const $dataTable = $('.pricing-plans-compare-table', $tableContainer);
        const $arrowIcon = $('i.chevron-down-icon', $showBtn);
        const $showBtnTxt = $('.pricing-plans-compare-table-txt', $showBtn);
        const $buttons = $('.pricing-plans-compare-table-item button', $tableContainer);
        const $buttonsNotFree = $('.pricing-plans-compare-table-item button:not(.free)', $tableContainer);

        $('.pricing-plans-compare-table-item button', $tableContainer).addClass('hidden');

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

        // set N GB text for the storage value in the comparison table.
        $('#table-strg-v', $tableContainer).text(bytesToSize(mega.bstrg, 0));

        // Set 100 for the maximum number of participants in a free tier meeting.
        $('#meet-up-to-participants', $tableContainer).text(l.pr_meet_up_to_participants.replace('%1', 100));

        // Set 1 hour for the maximum duration of a free tier meeting.
        $('#meet-up-to-duration', $tableContainer).text(mega.icu.format(l.pr_meet_up_to_duration, 1));
    };

    const initBuyPlan = ($givenPlans) => {
        const $buyBtn = $('.pricing-plan-btn', $givenPlans || $planCards);
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

                    if (mega.flags.ff_npabm) {
                        eventlog(500591, sessionStorage['pro.period']);
                    }
                    else {
                        eventlog(500590, sessionStorage['pro.period']);
                    }

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

        const getNetOrTotal = (obj, cond, local) => {
            if (!obj) {
                return;
            }
            if (cond === undefined) {
                cond = true;
            }
            if (local) {
                return cond ? (obj.lpn || obj.lp) : obj.lp;
            }
            return cond ? (obj.pn || obj.p) : obj.p;
        };

        if (pro.proplan.businessPlanData.isLocalInfoValid) {
            currency = pro.proplan.businessPlanData.l.lc;
            const totalUsersCost = getNetOrTotal(pro.proplan.businessPlanData.bd.us, pro.taxInfo, 1)
                * users;
            const totalStorageCost = getNetOrTotal(pro.proplan.businessPlanData.bd.sto, pro.taxInfo, 1)
                * extraStorage;
            const totalTransferCost = getNetOrTotal(pro.proplan.businessPlanData.bd.trns, pro.taxInfo, 1)
                * extraTransfer;

            totalPrice = formatCurrency(
                totalUsersCost + totalStorageCost + totalTransferCost,
                currency,
                'narrowSymbol'
            );
        }
        else {
            const totalUsersCost = getNetOrTotal(pro.proplan.businessPlanData.bd.us, pro.taxInfo, 0)
                * users;
            const totalStorageCost = getNetOrTotal(pro.proplan.businessPlanData.bd.sto, pro.taxInfo, 0)
                * extraStorage;
            const totalTransferCost = getNetOrTotal(pro.proplan.businessPlanData.bd.trns, pro.taxInfo, 0)
                * extraTransfer;

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

        const _sliderMovedEventCb = (eventId) => {
            eventlog(eventId, true);
        };

        $usersBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, symmetricRanges, $usersBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
            _sliderMovedEventCb(500335);
        });

        $strgBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $strgBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
            _sliderMovedEventCb(500333);
        });

        $trsBusinessSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $trsBusinessInput);
            estimateBussPrice($usersBusinessInput.val(), $strgBusinessInput.val(), $trsBusinessInput.val());
            _sliderMovedEventCb(500334);
        });

        $flexStorageSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $strgFlexInput);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
            _sliderMovedEventCb(500343);
        });

        $flexTransSlider.rebind('input.pricing', function() {
            sliderEventHandler(this, asymmetricRanges, $transFlexInput);
            estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());
            _sliderMovedEventCb(500344);
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

        $usersBusinessInput.rebind('focus.pricing', () => eventlog(500332));
        $strgBusinessInput.rebind('focus.pricing', () => eventlog(500330));
        $trsBusinessInput.rebind('focus.pricing', () => eventlog(500331));
        $strgFlexInput.rebind('focus.pricing', () => eventlog(500341));
        $transFlexInput.rebind('focus.pricing', () => eventlog(500342));

        estimateFlexiPrice($strgFlexInput.val(), $transFlexInput.val());

    };

    const initFeatureTable = () => {
        const $tableContainer = pageInformation.getFeaturesCol();

        if (tabAvailable('exc')) {

            const $excPlansHeader = $('.plans-table-header.pro-exc-offer', $tableContainer);

            const minExcPlan = pro.filter.excMin;
            const excPlanNum = minExcPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
            const planName = pro.getProPlanName(excPlanNum);

            const excStorage = bytesToSize(minExcPlan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB, 0);
            const excTransfer = bytesToSize(minExcPlan[pro.UTQA_RES_INDEX_TRANSFER] * pro.BYTES_PER_GB, 0);

            // Populate mini plan title, and storage and transfer columns
            $('span', $excPlansHeader).text(l.pr_table_mini_plan.replace('%1', planName));
            $('#table-strg-mini', $tableContainer).text(excStorage);
            $('#table-trans-mini', $tableContainer).text(excTransfer);
            $('#table-days-mini', $tableContainer).text(mega.icu.format(l.pr_up_to_days, 90));

            // Set button link and text for mini plan button
            $('button.pro-exc-offer', $tableContainer)
                .text(l.buy_plan.replace('%1', planName))
                .rebind('click', () => {
                    delay('pricing.pro-exc-offer', eventlog.bind(null, is_mobile ? 500246 : 500244, excPlanNum));

                    loadSubPage(`propay_${excPlanNum}`);
                });
        }
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

        const $faqContainer = $('.pricing-pg.faq-container', $page).removeClass('hidden');
        const $faqItemTemplate = $('.faq-qa.template', $faqContainer);
        const $faqContent = $('.faq-content', $faqContainer);

        const faqQuestions = {
            'faq1': {
                question: l.pricing_page_faq_question_1,
                answer: [l.pricing_page_faq_answer_1],
                eventId: 500345,
            },
            'faq2': {
                question: l.pricing_page_faq_question_2,
                answer: [l.pricing_page_faq_answer_2],
                eventId: 500347,
            },
            'faq3': {
                question: l.pricing_page_faq_question_3,
                answer: [l.pricing_page_faq_answer_3],
                eventId: 500348,
            },
            'faq4': {
                question: l.pricing_page_faq_question_4,
                answer: [l.pricing_page_faq_answer_4, l.pricing_page_faq_answer_4_2],
                eventId: 500350,
            },
            'faq5': {
                question: l.pricing_page_faq_question_5,
                answer: [l.pricing_page_faq_answer_5],
                eventId: 500351,
            },
            'faq6': {
                question: l.pricing_page_faq_question_6,
                answer: [l.pricing_page_faq_answer_6, l.pricing_page_faq_answer_6_2],
                eventId: 500352,
            },
        };

        const $answerPartTemplate = $('.faq-answer-part', $faqItemTemplate).clone();

        for (const faq in faqQuestions) {
            const $faqItem = $faqItemTemplate.clone().removeClass('template hidden').addClass(faq);
            $('.faq-question', $faqItem).text(faqQuestions[faq].question);
            for (let i = 0; i < faqQuestions[faq].answer.length; i++) {
                const $answerPart = $answerPartTemplate.clone().safeHTML(faqQuestions[faq].answer[i]);
                const isFirstFaq = faq === 'faq1';

                $('.faq-item-answer', $faqItem)
                    .safeAppend($answerPart.prop('outerHTML'))
                    .toggleClass('hidden', !isFirstFaq);
                $('.faq-item-title i', $faqItem)
                    .toggleClass('minus-icon', isFirstFaq)
                    .toggleClass('grey-medium-plus small-icon', !isFirstFaq);
            }

            $faqContent.safeAppend($faqItem.prop('outerHTML'));

            const $qaRebind = $(`.${faq}`, $faqContent);
            $('.faq-item-title', $qaRebind).rebind('click.pricing', () => {
                if (window.getSelection()) {
                    window.getSelection().removeAllRanges();
                }
                $('.faq-item-answer', $qaRebind).toggleClass('hidden');
                $('.faq-item-title i', $qaRebind).toggleClass(['minus-icon', 'grey-medium-plus', 'small-icon']);

                const visibility = $('.faq-item-answer', $qaRebind).hasClass('hidden') ? 'hidden' : 'shown';
                eventlog(faqQuestions[faq].eventId, `${faq} ${visibility}`);
            });
        }
    };

    const initCompare = () => {

        $compareBox = $('.pricing-pg.pricing-compare-full-container', $page).removeClass('hidden');

        const $compareMEGABox = $('.pricing-compare-cards.mega', $compareBox);
        const $compareDPBox = $('.pricing-compare-cards.dp', $compareBox);
        const $compareGDBox = $('.pricing-compare-cards.gd', $compareBox);
        const $compareMEGA = $('.pricing-compare-cards-rate .vl', $compareMEGABox);
        const $compareDP = $('.pricing-compare-cards-rate .vl', $compareDPBox);
        const $compareGD = $('.pricing-compare-cards-rate .vl', $compareGDBox);

        $compareMEGA.text(formatCurrency(1.56));
        $compareDP.text(formatCurrency(5.50));
        $compareGD.text(formatCurrency(3.70));
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
            hasLocalPrices = true;
        }
        else {
            flexiPrice = ProFlexiFound[pro.UTQA_RES_INDEX_PRICE];
            flexiCurrency = 'EUR';
        }

        $('.pricing-plan-price span.vl', $proFlexCard).text(formatCurrency(flexiPrice, flexiCurrency, 'narrowSymbol'));
        $('.pricing-plan-price-unit', $proFlexCard).text(`${flexiCurrency} / ${l[931]}`);

        const planTaxInfo = pro.taxInfo && pro.getStandardisedTaxInfo(ProFlexiFound[pro.UTQA_RES_INDEX_EXTRAS].taxInfo);
        const $taxInfo = $('.pricing-plan-tax', $proFlexCard).toggleClass('hidden', !planTaxInfo);

        if (planTaxInfo) {
            if (pro.taxInfo.variant === 1) {
                $('.tax-info', $taxInfo).text(l.t_may_appy.replace('%1', pro.taxInfo.taxName));
            }
            else {
                $('.tax-info', $taxInfo).text(l.before_tax);
                $('.tax-price', $taxInfo).text(l.p_with_tax
                    .replace('%1', formatCurrency((planTaxInfo.taxedPrice), flexiCurrency, 'narrowSymbol')
                            + (flexiCurrency === 'EUR' ? ' ' : '* ') + flexiCurrency))
                    .removeClass('hidden');
            }
        }

        const baseStorage = ProFlexiFound[pro.UTQA_RES_INDEX_STORAGE] / 1024;

        $('.pricing-plan-storage', $proFlexCard)
            .text(l.bsn_base_stg_trs.replace('%1', baseStorage));

        // if we have local price info for extra storage
        if (ProFlexiFound[13] && hasLocalPrices) {
            extraPrice = formatCurrency(ProFlexiFound[13], flexiCurrency, 'narrowSymbol');
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
            eventlog(500340);
        });

    };

    const fillPlansInfo = (period) => {

        let tab = 'pro';
        if (typeof period === 'object') {
            tab = period.tab;
            period = period.duration;
        }

        if (Array.isArray(tab)) {
            for (let i = 0; i < tab.length; i++) {
                fillPlansInfo({tab: tab[i], duration: period});
            }
            return;
        }


        if (!tabAvailable(tab) || tab === 'bsn') {  // bsn tab has its own handling
            return;
        }

        if (!allowedPeriods.has(period)) {
            period = 12; // Default is yearly
        }

        if (!pro.membershipPlans.length) {
            console.error('Plans couldnt be loaded.');
            return;
        }

        let periodText = period === 12 ? l[932] : l[931];

        if (!tabsInfo.pro.initialized) {
            $planCards = $('.pricing-pg.pro-plans-cards-container .pricing-plan-card', $page);
            tabsInfo.pro.$planCards = $planCards;
            tabsInfo.pro.initialized = true;
        }

        const $fillCards = tabsInfo[tab] && tabsInfo[tab].$planCards;

        if (!$fillCards) {
            console.error(`Tab details not found for: ${tab}`);
            return;
        }

        let localPriceInfo = false;
        let periodSwapped = false;
        ProFlexiFound = false;

        let showYearlyPerMonth = mega.flags.ff_npabm && (period === 12);

        for (const currentPlan of pro.membershipPlans) {

            const months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
            const planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];

            // ProFlexiFound is used to see if we should show pro flexi
            if (planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                ProFlexiFound = currentPlan;
                continue;
            }
            if (planNum === pro.ACCOUNT_LEVEL_FEATURE_VPN && currentPlan[pro.UTQA_RES_INDEX_MONTHS] === 1) {
                VpnPlanFound = currentPlan;
                if (!localPriceInfo) {
                    localPriceInfo = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                }
                continue;
            }
            if (planNum === pro.ACCOUNT_LEVEL_FEATURE_PWM && currentPlan[pro.UTQA_RES_INDEX_MONTHS] === 1) {
                PwmPlanFound = currentPlan;
                continue;
            }

            if (tab && !pro.planInFilter(planNum, tab + 'Tab')) {
                continue;
            }

            if (!periodSwapped && pro.singleDurationPlans[planNum]) {
                period = pro.singleDurationPlans[planNum];
                periodText = period === 12 ? l[932] : l[931];
                periodSwapped = true;
                showYearlyPerMonth = showYearlyPerMonth && (period === 12);
            }

            if (months !== period || planNum === pro.ACCOUNT_LEVEL_BUSINESS) {
                continue;
            }

            const planName = pro.getProPlanName(planNum);

            const $planCard = $fillCards.filter(`#pro${planNum}`);
            $planCard.removeClass('hidden');

            let planPrice = currentPlan[pro.UTQA_RES_INDEX_PRICE];
            let priceCurrency = 'EUR';

            if (currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
                planPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                priceCurrency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                if (!localPriceInfo) {
                    localPriceInfo = priceCurrency;
                }
            }

            let billingFrequencyText;
            let priceText;
            if (showYearlyPerMonth) {
                billingFrequencyText = l.curr_per_month_billed_yearly
                    .replace('%1', priceCurrency);
                priceText = formatCurrency(planPrice / 12, priceCurrency, 'narrowSymbol');
            }
            else {
                billingFrequencyText = priceCurrency + ' / ' + periodText;
                priceText = formatCurrency(planPrice, priceCurrency, 'narrowSymbol');
            }

            $('.pricing-plan-price span.vl', $planCard).text(priceText);
            $('.pricing-plan-price-unit', $planCard).text(billingFrequencyText);



            const planTaxInfo = pro.taxInfo
                && pro.getStandardisedTaxInfo(currentPlan[pro.UTQA_RES_INDEX_EXTRAS].taxInfo);
            const $taxInfo = $('.pricing-plan-tax', $planCard).toggleClass('hidden', !planTaxInfo);
            if (planTaxInfo) {
                if (pro.taxInfo.variant === 1) {
                    $('.tax-info', $taxInfo).text(l.t_may_appy.replace('%1', pro.taxInfo.taxName));
                }
                else {
                    $('.tax-info', $taxInfo).text(l.before_tax);
                    $('.tax-price', $taxInfo).text(l.p_with_tax
                        .replace('%1', formatCurrency(
                            planTaxInfo.taxedPrice / ((showYearlyPerMonth && 12) || 1),
                            priceCurrency, 'narrowSymbol') + (priceCurrency === 'EUR' ? ' ' : '* ')
                            + priceCurrency))
                        .removeClass('hidden');
                }
            }

            if (priceText) {
                $planCard.toggleClass('long-currency1', priceText.length >= 9 && priceText.length <= 12);
                $planCard.toggleClass('long-currency2', priceText.length >= 13 && priceText.length <= 16);
                $planCard.toggleClass('long-currency3', priceText.length >= 17);
            }

            // get the storage/bandwidth, then convert it to bytes (it comes in GB) to format.
            // 1073741824 = 1024 * 1024 * 1024
            const storageFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_STORAGE] * 1073741824, 3, 4);
            const storageTxt = l[23789].replace('%1', storageFormatted);

            const bandwidthFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_TRANSFER] * 1073741824, 3, 4);
            const bandwidthTxt = l[23790].replace('%1', bandwidthFormatted);

            $('.pricing-plan-storage', $planCard).text(storageTxt);

            const $storageBox = $('.pricing-plan-storage', $planCard);
            const $transferBox = $('.pricing-plan-trasfer', $planCard);
            const $transferSubBox = $('.pricing-plan-trasfer-val', $transferBox);

            const $featuresBox = $('.pricing-plan-features', $planCard);

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

            if ($featuresBox.length) {
                $('.features-title', $featuresBox).text(l.pr_includes);
                $('.vpn span', $featuresBox).text(l.mega_vpn);
                $('.meeting-limits span', $featuresBox).text(l.pr_no_meet_time_limits);
                $('.meeting-participants span', $featuresBox).text(l.pr_unlimited_participants);
            }
        }

        if (showYearlyPerMonth) {
            eventlog(500588, true);
        }
        else if (period === 12) {
            eventlog(500589, true);
        }

        const $freeBanner = $('.pricing-pg.pricing-banner-container', $page);

        localPriceInfo = localPriceInfo || 'EUR';
        $('.pricing-get-free-banner-price-val', $freeBanner)
            .text(formatCurrency(0, localPriceInfo, 'narrowSymbol', true));
        $('.pricing-get-free-storage-txt', $freeBanner).text(l.pr_free_strg.replace('%s', bytesToSize(mega.bstrg, 0)));

        $('.pricing-get-free-ads', $freeBanner).toggleClass('hidden', !(mega.flags.ab_ads));

        $proflexiBlock = $('.pricing-pg.pricing-flexi-container', $page);

        const showFlexi = ProFlexiFound && mega.flags && mega.flags.pf === 1;
        $('.pricing-plan-more', $fillCards).toggleClass('hidden', !showFlexi);
        $proflexiBlock.toggleClass('hidden', !showFlexi);

        if (showFlexi) {

            $('#try-flexi', $fillCards).rebind('click.pricing', () => {
                // behavior not supported in Safari.
                $proflexiBlock[0].scrollIntoView({ behavior: "smooth" });
                eventlog(500338);
            });

            initProFlexi();
        }

        // hide/show the asterisk and the note depending on local prices availability
        $('.ars', $fillCards).toggleClass('hidden', localPriceInfo === 'EUR');
        // TODO: Add better handling for different price estimation notes
        $('.pricing-pg.pricing-estimation-note-container, .pricing-pg.pricing-estimation-note-container-exc', $page)
            .toggleClass('eu', localPriceInfo === 'EUR');
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
        let hasLocalPrice = false;

        const minStorageValue = pro.proplan.businessPlanData.bd.ba.s / 1024;

        const storageLocalPrice = pro.proplan.businessPlanData.bd.sto.lpn || pro.proplan.businessPlanData.bd.sto.lp;
        let storagePrice = !storageLocalPrice
            && (pro.proplan.businessPlanData.bd.sto.pn || pro.proplan.businessPlanData.bd.sto.p);

        if (pro.proplan.businessPlanData.isLocalInfoValid) {

            priceCurrency = pro.proplan.businessPlanData.l.lc;

            pricePerUser = formatCurrency(pro.proplan.businessPlanData.bd.us.lp * 3, priceCurrency, 'narrowSymbol');
            storagePrice = formatCurrency(storageLocalPrice, priceCurrency, 'narrowSymbol');
            hasLocalPrice = true;
        }
        else {
            priceCurrency = 'EUR';
            pricePerUser = formatCurrency(pricePerUser * 3);
            storagePrice = formatCurrency(storagePrice);
        }

        const businessPlanObj = pro.planObjects.createBusinessPlanObject(pro.proplan.businessPlanData);
        $('.pricing-plan-price .vl', $businessCard).text(businessPlanObj.getFormattedPrice('narrowSymbol'));
        $('.pricing-plan-price-unit', $businessCard).text(`${priceCurrency} / ${l[931]}`);

        const planTaxInfo = businessPlanObj.taxInfo;
        const $taxInfo = $('.pricing-plan-tax', $businessCard).toggleClass('hidden', !planTaxInfo);

        if (planTaxInfo) {
            if (pro.taxInfo.variant === 1) {
                $('.tax-info', $taxInfo).text(l.t_may_appy.replace('%1', pro.taxInfo.taxName));
            }
            else {
                $('.tax-info', $taxInfo).text(l.before_tax);
                $('.tax-price', $taxInfo).text(l.p_with_tax
                    .replace('%1', formatCurrency(
                        planTaxInfo.taxedPrice, priceCurrency, 'narrowSymbol')
                        + (priceCurrency === 'EUR' ? ' ' : '* ') + priceCurrency))
                    .removeClass('hidden');
            }
        }

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

        tabsInfo.bsn.$planCards = $('.pricing-plan-card', $businessPlans);
        tabsInfo.bsn.initialized = true;
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
        });
    };

    const initPeriodPickHandler = () => {
        const $radioOptions = $('.pricing-pg.pick-period-container.individual .pricing-radio-option', $page);
        const $strgFlexInput = $('#esti-storage', $proflexiBlock);
        const $transFlexInput = $('#esti-trans', $proflexiBlock);

        let preSelectedPeriod = (sessionStorage.getItem('pro.period') | 0);

        if (!allowedPeriods.has(preSelectedPeriod)) {
            preSelectedPeriod = 12;
        }

        if (preSelectedPeriod === 12) {
            $radioOptions.removeClass('selected');
            $radioOptions.filter('[data-period="12"]').addClass('selected');
        }

        $radioOptions.rebind('click.pricing', function() {
            const $optionWrapper = $(this).closest('.pick-period-container');

            $('.pricing-radio-option', $optionWrapper).removeClass('selected');

            this.classList.add('selected');

            if (this.dataset.period === '12') {
                delay('pricing.plan', eventlog.bind(null, is_mobile ? 99867 : 99866));
            }
            else {
                delay('pricing.plan', eventlog.bind(null, is_mobile ? 99869 : 99868));
            }

            sessionStorage.setItem('pro.period', this.dataset.period);
            fillPlansInfo({
                duration: this.dataset.period | 0,
                tab: pageInformation.currentTab.key || 'pro',
            });

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
     * Initialize creation of pro cards
     * @param {String} tab - The name of the tab to create cards for
     */
    const createPlanCards = (tab) => {

        if (!tabAvailable(tab)) {
            return;
        }

        const tabSpecificSelectors = {
            'exc': {
                $cardContainer: $('> .plans-cards-container', $exclusivePlans),
                cardClassName: 'exc-plan-card',
            },
        };

        if (!tabSpecificSelectors[tab]) {
            return;
        }

        const {$cardContainer, cardClassName} = tabSpecificSelectors[tab];

        // If children already created, don't recreate them
        if ($(`> .${cardClassName}`, $cardContainer).length) {
            return;
        }

        showExclusiveOffers = !!pro.filter.excMin;

        const usedPlanLevels = [];
        const $template = $('.template', $cardContainer);

        // Number of plans in tab with one duraton
        let singleDurations = 0;

        // Plans checked in tab
        const durationsChecked = new Set();
        const saveOptions = [];

        for (const plan of pro.membershipPlans) {
            const planLevel = plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];

            if (!pro.planInFilter(planLevel, tab + 'Tab')) {
                continue;
            }

            const duration = plan[pro.UTQA_RES_INDEX_MONTHS];

            if (duration === 12) {
                const monthlyPrice = plan[pro.UTQA_RES_INDEX_MONTHLYBASEPRICE] * duration;
                const yearlyPrice = plan[pro.UTQA_RES_INDEX_PRICE];
                saveOptions.push(percentageDiff(monthlyPrice, yearlyPrice, 3));
            }

            if (pro.planInFilter(planLevel, 'singleDurationPlans')) {
                singleDurations += 1;
            }

            if (durationsChecked.has(planLevel)) {
                continue;
            }
            else {
                durationsChecked.add(planLevel);
            }

            if (usedPlanLevels.includes(planLevel)) {
                continue;
            }
            usedPlanLevels.push(planLevel);
            const $planCard = $template.clone()
                .removeClass('template hidden')
                .addClass(cardClassName)
                .attr('id', 'pro' + plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]);

            $cardContainer.safeAppend($planCard.prop('outerHTML'));
        }

        if (tabsInfo[tab]) {
            tabsInfo[tab].$planCards = $(`.${cardClassName}`, $cardContainer);
            initBuyPlan(tabsInfo[tab].$planCards);
            tabsInfo[tab].updateTabVisibility();
            tabsInfo[tab].initialized = true;
        }


        if (singleDurations) {
            // If there is mixed duration plans in the tab, this needs fixing ASAP. This is a bug.
            console.assert(singleDurations === durationsChecked.size, `Mixed durations found in tab: ${tab}`);
            $periodPicker.removeClass(tabsInfo[tab].tabControlName);
        }
        else {
            const maxPercentage = Math.max(...saveOptions);
            const $periodText = $(`.period-note-txt.${tabsInfo[tab].tabControlName}`, $periodPicker);
            if ((maxPercentage > 0) && (maxPercentage < 100)) {
                $periodText.text(l.pr_save_up_to.replace('%1', maxPercentage));
            }
            else {
                // An error has occured, % savings will be wrong. Show no savings amount.
                console.assert(!d, `Error showing save percentage for tab: ${tab}, found ${maxPercentage}`);
                $periodText.text('').addClass('hidden').removeClass(tabsInfo[tab].tabControlName);
                tabsInfo[tab].requiresUpdate = true;
            }

            $(`.period-note-txt.${tabsInfo[tab].tabControlName}`, $periodPicker)
                .text(l.pr_save_up_to.replace('%1', Math.max(...saveOptions)));
            $periodPicker.addClass(tabsInfo[tab].tabControlName);
        }
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
                const $card = $(`#pro${id}`, $page).addClass(cls);
                if (txt) {
                    $('.pricing-plan-recommend', $card).text(txt);
                }
            };

            // to see what to disable  and what to recommend
            // we will check storage.
            if (pro.proplan2.storageData && pro.proplan2.storageData.used) {
                const usedSpaceGB = pro.proplan2.storageData.used / 1073741824;

                // get the plan account levels for lite, pro1, pro2, pro3. and 1 month
                const plans = pro.filter.plans.coreM;

                // strangely no plans found --> set default
                if (!plans.length) {
                    setCardClassTxt(pro.ACCOUNT_LEVEL_PRO_I, 'popular', l.pr_popular);
                    return;
                }

                let minStorage = Number.MAX_SAFE_INTEGER;
                let recomendedPlan = null;
                const planLevel = u_attr.p ? (u_attr.p <= 3 ? u_attr.p : 0) : -1;

                for (const plan of plans) {
                    // create plan objects from the account levels (all 1m, which is defaulted)
                    const planObj = pro.getPlanObj(plan);

                    if (pro.filter.simple.excPlans.has(planObj.level)) {
                        setCardClassTxt(planObj.level, 'exclusive-offer', 'Exclusive Offer');
                    }

                    const currPlanLevel = planObj.isIn('recommend', 'asLevel');

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

        // Create non-static plan cards
        createPlanCards('exc');

        // fill the info in all cards
        fillPlansInfo({
            duration: (sessionStorage.getItem('pro.period') | 0) || 12,
            tab: ['pro', 'exc'],
        });

        updatePriceCards();
        // initialize buy buttons for plans and for the free
        initBuyPlan();
    };

    const resetPricingPageInfo = () => {
        for (const tab in tabsInfo) {
            tabsInfo[tab].requiresUpdate = true;
            tabsInfo[tab].initialized = false;
        }

        pageInformation.currentTab = null;
        pageInformation.clearCache();
    };

    /**
     * Check if the user scrolls down to a certain point on the page and log an event if so
     */
    const initScrollObserver = tryCatch(() => {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 1
        };

        // Check if the user is scrolling down or up
        let previousY = 0;

        const _onObserve = (observable) => {
            const { isIntersecting, boundingClientRect } = observable[0];

            if (isIntersecting && previousY >= boundingClientRect.y) {
                eventlog(500336);
            }
            previousY = boundingClientRect.y;
        };

        const proScrollObserver = new IntersectionObserver(
            (observables) => _onObserve(observables),
            observerOptions
        );
        proScrollObserver.observe($('.pricing-plans-compare-table-show', $page)[0]);
    });

    return new class {

        async initPage() {

            // TODO: Use only one of either window or sessionStorage for accessing a mega.nz/pro tab
            const canAccessProPage = u_attr
                || (window.mProTab === 'exc')       // This will force the user to login, and pre-select the tab
                || (sessionStorage.mScrollTo === 'exc')     // Does the same as above
                || (localStorage.allowLoggedOutPricingPage);        // May be useful for future testing

            if (!canAccessProPage) {
                mega.redirect('mega.io', 'pricing', false, false);
            }

            // validate the request, checking for business + proFlexi
            if (!validatePageRequest()) {
                return false;
            }

            // They're from mega.io with a plan chosen, but they need to register first before going to /propay_x
            if (is_mobile && window.nextPage === '1' && window.pickedPlan){
                return loadSubpage('register');
            }

            loadingDialog.show('pricingReady');

            await fetchPlansData();
            await fetchBusinessPlanInfo();
            parsepage(pages.planpricing);

            // Temporary fix for desktop propay as it does not using new header
            if (is_mobile && mega.ui.header) {
                mega.ui.header.update();
            }
            if (mega.ui.alerts) {
                mega.ui.alerts.hide();
            }

            showExclusiveOffers = !!pro.filter.excMin;

            $page = $('.bottom-page.full-block', '.bottom-page.content.pricing-pg');
            $exclusivePlans = $('.exclusive-plans-container', $page);
            $periodPicker = $('.pick-period-container', $page);

            delay('pricingpage.init', eventlog.bind(null, is_mobile ? 99936 : 99935));

            // Check the user is allowed to see the low tier version of the pro page
            // (i.e. if the lowest plan returned is a mini plan)
            if (window.mProTab === 'exc') {
                if (!u_handle) {
                    // If not logged in, prompt them to do so
                    showSignupPromptDialog();
                }
                else if (!showExclusiveOffers) {
                    // Otherwise if the user isn't eligible, show a dialog telling the user this
                    pro.updateLowTierProPage();
                }
            }

            // Using the back arrow will rebuild the page and the cached items will be incorrect
            resetPricingPageInfo();

            initPlansCards();
            populateBusinessPlanData();

            if (sessionStorage.mScrollTo === 'exc') {
                window.mProTab = 'exc';
                delete sessionStorage.mScrollTo;
            }

            initTabHandlers();
            initPeriodPickHandler();
            initPlansTabs();
            initSocial();
            initFaq();
            initCompare();
            initFeatureTable();
            initScrollObserver();

            loadingDialog.hide('pricingReady');

            if (sessionStorage.mScrollTo === 'flexi' && ProFlexiFound) {
                $proflexiBlock[0].scrollIntoView({behavior: 'smooth'});
                delete sessionStorage.mScrollTo;
            }

            if (tabsInfo[window.mProTab] && tabAvailable(window.mProTab)) {
                tabsInfo[window.mProTab].$tab.click();
            }

            if (window.nextPage === '1' && window.pickedPlan) {

                pro.proplan2.selectedPlan = window.pickedPlan;

                delete window.nextPage;
                delete window.pickedPlan;

                showRegisterDialog();
            }
        }

        getUserFeature(feature) {
            return getUserFeature(feature);
        }

        updateTabs() {
            showExclusiveOffers = !!pro.filter.excMin;
            if (tabAvailable('exc') && !tabsInfo.exc.initialized) {
                initFeatureTable();
                createPlanCards('exc');
                fillPlansInfo({
                    duration: (sessionStorage.getItem('pro.periodExc') | 0) || 12,
                    tab: 'exc',
                });
                tabsInfo.exc.updateTabVisibility();
            }
            if (window.mProTab === 'exc') {
                tabsInfo.exc.$tab.click();
            }
        }
    };
});
